import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATALOGUE, CACHE_MS, civilDate, upstreamDate, normalizeFeed, dayState, stayState, usableSnapshot} from '../public/assets/availability-model.js';
import {createAvailabilityService} from '../server/availability-service.mjs';

const evidence = JSON.parse(fs.readFileSync(new URL('./fixtures/availability-source.json', import.meta.url)));
const villa = CATALOGUE[0];
const sample = (intervals = [{start:'10/17/2026',end:'10/23/2026',status:'CONFIRMED',sequence:false}]) => [{id:villa.id,title:villa.title,availabilities:intervals}];
const json = (payload, headers={}) => new Response(JSON.stringify(payload), {headers:{'Content-Type':'application/json',...headers}});
const req = (query='villa=palazzo-rosadi', method='GET') => new Request(`http://localhost/.netlify/functions/availability?${query}`, {method});
const epoch = Date.parse('2026-10-22T12:00:00Z');
const snapshot = intervals => ({state:'synced', checkedAt:new Date(epoch).toISOString(), expiresAt:new Date(epoch+CACHE_MS).toISOString(), intervals});

test('strict civil dates and explicit US format, including leap days', () => {
  assert.equal(upstreamDate('03/04/2028'), '2028-03-04');
  assert.equal(upstreamDate('02/29/2028'), '2028-02-29');
  for (const value of ['02/29/2027','04/31/2027','13/01/2027','2027-01-02','1/2/2027',null]) assert.throws(() => upstreamDate(value));
  assert.equal(civilDate('2027-02-29'), false);
});

test('inclusive upstream last night and exclusive stay check-out', () => {
  const intervals = normalizeFeed(sample(), villa);
  assert.deepEqual(intervals, [{start:'2026-10-17',endExclusive:'2026-10-24'}]);
  const data = snapshot(intervals);
  assert.equal(dayState(data,'2026-10-23',epoch), 'blocked');
  assert.equal(dayState(data,'2026-10-24',epoch), 'unverified');
  assert.equal(stayState(data,'2026-10-16','2026-10-17',epoch), 'unverified');
  assert.equal(stayState(data,'2026-10-23','2026-10-24',epoch), 'blocked');
  assert.equal(stayState(data,'2026-10-24','2026-10-25',epoch), 'unverified');
  assert.equal(stayState(data,'2026-10-16','2026-10-25',epoch), 'blocked');
  assert.equal(stayState(data,'2026-10-23','2026-10-23',epoch), 'invalid');
});

test('merges overlapping and adjacent blocks across year boundaries; flags never free nights', () => {
  const intervals = normalizeFeed(sample([
    {start:'01/01/2027',end:'01/02/2027',status:'',sequence:true},
    {start:'12/30/2026',end:'12/31/2026',status:'CANCELLED',sequence:false},
    {start:'01/02/2027',end:'01/04/2027'},
  ]), villa);
  assert.deepEqual(intervals,[{start:'2026-12-30',endExclusive:'2027-01-05'}]);
});

test('identity, empty data, malformed and reversed intervals fail closed', () => {
  for (const data of [[],{},null,[{id:999,title:villa.title,availabilities:sample()[0].availabilities}],
    [{...sample()[0],title:'Different villa'}],sample([]),sample([{start:'10/23/2026',end:'10/17/2026'}]),sample([{start:'02/30/2027',end:'03/01/2027'}]),sample([null])]) {
    assert.throws(() => normalizeFeed(data,villa));
  }
});

test('unknown, expired, future-dated and empty snapshots cannot imply availability', () => {
  const valid = snapshot(normalizeFeed(sample(),villa));
  for (const data of [undefined,{...valid,state:'unavailable'},{...valid,intervals:[]}, {...valid,checkedAt:'bad'}, {...valid,expiresAt:new Date(epoch).toISOString()}, {...valid,checkedAt:new Date(epoch+20_000).toISOString()}, {...valid,expiresAt:new Date(epoch+3*CACHE_MS).toISOString()}]) {
    assert.equal(usableSnapshot(data,epoch),false);
    assert.equal(dayState(data,'2026-10-24',epoch),'unknown');
    assert.equal(stayState(data,'2026-10-24','2026-10-25',epoch),'unknown');
  }
});

test('ten recorded live API identities normalize; Sant’Andrea has no mapping', () => {
  assert.equal(evidence.villas.length,10);
  assert.equal(CATALOGUE.length,10);
  assert.ok(!CATALOGUE.some(v=>/andrea/i.test(v.title)));
  for (const record of evidence.villas) {
    const entry = CATALOGUE.find(v=>v.id===record.id);
    assert.ok(normalizeFeed(record.payload,entry).length>0,record.name);
  }
});

test('public calendar evidence: matching future nights for nine villas; Casciano discrepancy is explicit', () => {
  const today = evidence.capturedAt.slice(0,10);
  for (const record of evidence.villas) {
    const futureDifferences = record.differences.filter(d=>d.date>=today);
    if(record.id===5054) {
      assert.ok(futureDifferences.length>0);
      assert.ok(futureDifferences.every(d=>d.apiBlocked && d.public==='source-available'));
    } else assert.deepEqual(futureDifferences,[],record.name);
  }
  const de = evidence.villas.find(v=>v.id===336);
  for (const date of ['2026-10-26','2026-10-27','2026-10-28']) assert.equal(de.publicDays.find(d=>d.date===date).public,'blocked');
  assert.equal(de.publicDays.find(d=>d.date==='2026-10-29').public,'source-available');
});

test('cache coalesces concurrent requests, rechecks after TTL, and retains unchanged version', async () => {
  let clock=epoch, calls=0;
  const service = createAvailabilityService({now:()=>clock,fetchImpl:async()=>{calls++;return json(sample());}});
  const responses=await Promise.all(Array.from({length:8},()=>service(req()).then(r=>r.json())));
  assert.equal(calls,1);
  assert.ok(responses.every(r=>r.state==='synced'));
  clock+=CACHE_MS-1; await service(req()); assert.equal(calls,1);
  clock+=2; const next=await (await service(req())).json(); assert.equal(calls,2);
  assert.equal(next.version,responses[0].version);
  assert.equal(next.changedAt,responses[0].changedAt);
  assert.notEqual(next.checkedAt,responses[0].checkedAt);
});

test('conditional 304 revalidates source without changing data version', async () => {
  let clock=epoch, calls=0, sent;
  const service=createAvailabilityService({now:()=>clock,fetchImpl:async(url,options)=>{
    sent=options; calls++;
    return calls===1?json(sample(),{ETag:'"v1"','Last-Modified':'Wed, 21 Oct 2026 12:00:00 GMT'}):new Response(null,{status:304});
  }});
  const first=await (await service(req())).json(); clock+=CACHE_MS+1;
  const second=await (await service(req())).json();
  assert.equal(sent.headers['If-None-Match'],'"v1"'); assert.ok(sent.headers['If-Modified-Since']);
  assert.equal(sent.method,'GET'); assert.equal(sent.redirect,'error');
  assert.equal(first.version,second.version); assert.notEqual(first.checkedAt,second.checkedAt);
});

test('source changes replace removed blocks and update content version', async () => {
  let clock=epoch, calls=0;
  const service=createAvailabilityService({now:()=>clock,fetchImpl:async()=>json(calls++?sample([{start:'11/01/2026',end:'11/02/2026'}]):sample())});
  const first=await (await service(req())).json(); clock+=CACHE_MS+1;
  const second=await (await service(req())).json();
  assert.notEqual(first.version,second.version); assert.notEqual(first.changedAt,second.changedAt);
  assert.equal(second.intervals[0].start,'2026-11-01');
});

test('outage after success never returns expired intervals; recovers after failure cache', async () => {
  let clock=epoch, failing=false, calls=0;
  const service=createAvailabilityService({now:()=>clock,fetchImpl:async()=>{calls++; if(failing)throw Error('Offline'); return json(sample());}});
  await service(req()); clock+=CACHE_MS+1; failing=true;
  const response=await service(req()); assert.equal(response.status,503);
  const data=await response.json(); assert.equal(data.state,'unavailable'); assert.deepEqual(data.intervals,[]);
  assert.equal(usableSnapshot(data,clock),false);
  await service(req()); assert.equal(calls,2);
  clock+=15_001; failing=false; assert.equal((await (await service(req())).json()).state,'synced');
});

test('empty response, errors, redirects, malformed JSON, excessive bodies all fail closed', async () => {
  for (const make of [()=>json([]),()=>json(sample([])),()=>new Response('bad',{status:429}),()=>new Response('bad',{status:500}),()=>new Response(null,{status:302}),()=>new Response('not json',{headers:{'content-type':'application/json'}}),()=>new Response('html',{headers:{'content-type':'text/html'}}),()=>json(sample(),{'content-length':'600000'}),()=>new Response('x'.repeat(512001),{headers:{'content-type':'application/json'}})]) {
    const service=createAvailabilityService({now:()=>epoch,fetchImpl:async()=>make()});
    const response=await service(req()); assert.equal(response.status,503); assert.deepEqual((await response.json()).intervals,[]);
  }
});

test('upstream timeout aborts and returns unavailable', async () => {
  const service=createAvailabilityService({timeoutMs:10,now:()=>epoch,fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted'))))});
  assert.equal((await service(req())).status,503);
});

test('allowlist prevents arbitrary upstream requests; GET only; date validation', async () => {
  let calls=0;
  const service=createAvailabilityService({now:()=>epoch,fetchImpl:async()=>{calls++;return json(sample());}});
  for (const query of ['villa=villa-santandrea','villa=9776','villa=https://example.com','villa=../../etc','']) assert.equal((await service(req(query))).status,404);
  assert.equal((await service(req('villa=palazzo-rosadi','POST'))).status,405);
  for (const dates of ['arrival=2026-10-23','arrival=2026-10-23&departure=2026-10-22','arrival=2027-02-29&departure=2027-03-01']) assert.equal((await service(req(`villa=palazzo-rosadi&${dates}`))).status,400);
  assert.equal(calls,0);
  const blocked=await service(req('villa=palazzo-rosadi&arrival=2026-10-23&departure=2026-10-24'));
  assert.equal(blocked.headers.get('cache-control'),'no-store');
  assert.equal((await blocked.json()).stay.state,'blocked');
  assert.equal((await (await service(req('villa=palazzo-rosadi&arrival=2026-10-24&departure=2026-10-25'))).json()).stay.state,'unverified');
});

test('Casciano API keeps conservative blocks and exposes source disagreement', async () => {
  const record=evidence.villas.find(v=>v.id===5054);
  const service=createAvailabilityService({now:()=>epoch,fetchImpl:async()=>json(record.payload),calendarService:async()=>({'2026-10':{days:{'2026-10-22':'available'}}})});
  const data=await (await service(req('villa=villa-casciano&months=2026-10'))).json();
  assert.match(data.sourceWarning,/discrepancy/);
  assert.equal(dayState(data,'2026-10-22',epoch),'blocked');
});
