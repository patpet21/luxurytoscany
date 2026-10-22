import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FORMSPREE_ENDPOINT,sendStayRequest,createStaySubmission} from '../public/assets/stay-request.js';
import {adapt,render} from '../src/render.mjs';
import {CATALOGUE,CACHE_MS,normalizeFeed,requestState} from '../public/assets/availability-model.js';

const data={villa:'Palazzo Rosadi',arrival:'2026-10-24',departure:'2026-10-31',adults:'2',children:'1',
  'first-name':'Demo','last-name':'Test',email:'availability-test@example.com',phone:'+1 555 0100',
  message:'Offline test only','privacy-consent':'accepted',_gotcha:''};
const ok=()=>({ok:true,metadata:{'availability-check':'available','source-page':'/properties/palazzo-rosadi'}});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function harness(options={}) {
  const states=[],sent=[];
  let current={...data},epoch='open-1';
  const controller=createStaySubmission({read:()=>({...current}),validate:async()=>ok(),context:()=>epoch,
    render:state=>states.push(state),send:async payload=>{sent.push(payload);return {status:'success'};},store:undefined,...options});
  return {controller,states,sent,edit:value=>{current={...current,...value};},context:value=>{epoch=value;}};
}

test('availability form uses Formspree only; other forms and controlled dates are preserved on all pages',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../content/source.json',import.meta.url))),pages=adapt(source);
  for(const page of pages) {
    const html=render(page,pages,source),stay=html.match(/<form name="stay-request"[\s\S]*?<\/form>/)?.[0];
    assert.ok(stay,page.path);
    assert.ok(stay.includes(`action="${FORMSPREE_ENDPOINT}"`),page.path);
    assert.ok(stay.includes('method="POST"')&&stay.includes('data-stay-formspree'));
    assert.ok(!/data-netlify|netlify-honeypot|name="form-name"|mailto:|_cc|_to|info@supertuscany/.test(stay));
    for(const name of Object.keys(data))assert.ok(stay.includes(`name="${name}"`),name);
    for(const name of ['arrival','departure'])assert.ok(stay.includes(`name="${name}" type="text" readonly`));
    assert.ok(stay.includes('data-stay-submit disabled'));
    assert.ok(stay.includes('data-stay-receipt hidden role="status" tabindex="-1"'));
    assert.ok(stay.includes('not a confirmed reservation'));
    for(const name of ['information-request','concierge-message']) {
      const other=html.match(new RegExp(`<form[^>]*name="${name}"[\\s\\S]*?<\\/form>`))?.[0];
      assert.ok(other?.includes('data-netlify="true"'),name);
    }
  }
});

test('one JSON POST sends every stay/contact field to the fixed endpoint, with no Netlify fallback',async()=>{
  const calls=[];
  const result=await sendStayRequest(data,{fetchImpl:async(url,options)=>{calls.push({url,options});return json({ok:true});}});
  assert.equal(result.status,'success');assert.equal(calls.length,1);
  const {url,options}=calls[0];assert.equal(url,FORMSPREE_ENDPOINT);assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),data);assert.equal(options.headers.Accept,'application/json');
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
});

test('errors, empty/malformed responses, non-acceptance and network failure never show success or auto-retry',async()=>{
  for(const response of [()=>json({errors:[{message:'Invalid'}]},422),()=>json({},429),()=>json({},503),
    ()=>json({ok:false}),()=>json({ok:true,errors:[{message:'Invalid'}]}),()=>new Response(''),()=>new Response('<html>Redirect</html>')]) {
    let calls=0;
    const result=await sendStayRequest(data,{fetchImpl:async()=>{calls++;return response();}});
    assert.notEqual(result.status,'success');assert.equal(calls,1);
  }
  const result=await sendStayRequest(data,{fetchImpl:async()=>{throw Error('Offline');}});
  assert.equal(result.status,'uncertain');assert.match(result.message,/avoid sending it twice/);
});

test('timeout aborts once and warns that delivery is uncertain',async()=>{
  let aborted=false;
  const result=await sendStayRequest(data,{timeout:5,fetchImpl:(url,{signal})=>new Promise((resolve,reject)=>{
    signal.addEventListener('abort',()=>{aborted=true;reject(Error('Aborted'));},{once:true});
  })});
  assert.equal(aborted,true);assert.equal(result.status,'uncertain');
});

test('double submit is locked throughout date revalidation and transport; identical success cannot be resent',async()=>{
  const validation=defer(),delivery=defer();let sends=0;
  const h=harness({validate:()=>validation.promise,send:async()=>{sends++;return delivery.promise;}});
  const first=h.controller.submit();
  assert.equal((await h.controller.submit()).status,'busy');
  validation.resolve(ok());
  while(!sends)await new Promise(r=>setImmediate(r));
  assert.equal((await h.controller.submit()).status,'busy');
  delivery.resolve({status:'success'});
  assert.equal((await first).status,'success');
  assert.equal((await h.controller.submit()).duplicate,true);assert.equal(sends,1);
  assert.deepEqual(h.states.slice(0,3).map(s=>s.status),['checking','sending','success']);
});

test('success receipt survives a page reload in session storage without storing personal or stay details',async()=>{
  const entries=new Map(),store={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};
  const first=harness({store});await first.controller.submit();
  const saved=JSON.stringify([...entries]);assert.equal(entries.size,1);
  for(const value of [data.email,data.villa,data.arrival,data['first-name']])assert.ok(!saved.includes(value));
  const second=harness({store});assert.equal((await second.controller.submit()).duplicate,true);
  assert.equal(second.sent.length,0);
});

test('blocked/unknown/empty/expired source data cannot send; unverified feed coverage stays explicitly unverified',async()=>{
  const now=Date.parse('2026-10-22T12:00:00Z');
  const evidence=JSON.parse(fs.readFileSync(new URL('./fixtures/availability-oct-nov-2026.json',import.meta.url)));
  const villa=CATALOGUE.find(v=>v.title===data.villa),record=evidence.villas.find(v=>v.id===villa.id);
  const fresh={state:'synced',checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+CACHE_MS).toISOString(),intervals:normalizeFeed(record.payload,villa),months:{}};
  for(const source of [undefined,{state:'unavailable',intervals:[]},{...fresh,intervals:[]},{...fresh,expiresAt:new Date(now).toISOString()}]) {
    const h=harness({validate:async value=>({ok:['available','unverified'].includes(requestState(source,value.arrival,value.departure,now)),message:'Dates are not usable.'})});
    assert.equal((await h.controller.submit()).status,'invalid');assert.equal(h.sent.length,0);
  }
  const occupied=harness({validate:async()=>({ok:['available','unverified'].includes(requestState(fresh,'2026-10-23','2026-10-31',now))})});
  await occupied.controller.submit();assert.equal(occupied.sent.length,0);
  const unverified=harness({validate:async()=>({ok:true,metadata:{'availability-check':requestState(fresh,data.arrival,data.departure,now)}})});
  await unverified.controller.submit();assert.equal(unverified.sent[0]['availability-check'],'unverified');
});

test('changing dates, guests, contact details, consent or closing/reopening during revalidation prevents sending',async()=>{
  for(const change of [{arrival:'2026-10-25'},{adults:'3'},{email:'changed@example.com'},{message:'Changed'},{'privacy-consent':''},null]) {
    const gate=defer(),h=harness({validate:()=>gate.promise});
    const request=h.controller.submit();
    while(!h.states.some(s=>s.status==='checking'))await new Promise(r=>setImmediate(r));
    // Hashing is async too; resolve validation only after the form changed.
    if(change)h.edit(change);else h.context('open-2');
    gate.resolve(ok());
    const result=await request;assert.ok(['changed','cancelled'].includes(result.status));assert.equal(h.sent.length,0);
  }
});

test('payload preserves dates and guests; adds trace and manual-enquiry status, never recipients or booking writes',async()=>{
  const h=harness();await h.controller.submit();
  for(const [key,value] of Object.entries(data))assert.equal(h.sent[0][key],value);
  assert.equal(h.sent[0]['availability-check'],'available');assert.ok(h.sent[0]['request-id']);
  assert.match(h.sent[0].subject,/not a reservation/);
  for(const key of ['_cc','_to','to','recipient','form-name'])assert.ok(!(key in h.sent[0]));
});

test('a rejected request retains details and can be retried deliberately, with the same enquiry reference',async()=>{
  const calls=[];let attempts=0;
  const h=harness({send:async payload=>{calls.push(payload);return ++attempts===1?{status:'error',message:'Invalid details'}:{status:'success'};}});
  assert.equal((await h.controller.submit()).status,'error');assert.equal(calls.length,1);
  assert.equal((await h.controller.submit()).status,'success');
  assert.equal(calls[0]['request-id'],calls[1]['request-id']);assert.equal(calls[1].email,data.email);
});
