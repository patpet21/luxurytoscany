import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATALOGUE,CACHE_MS,normalizeFeed,dayState,requestState,selectDate,monthsForStay,italyToday} from '../public/assets/availability-model.js';
import {parsePublicMonth,overviewConfig,createPublicCalendar} from '../server/public-calendar.mjs';
import {createAvailabilityService} from '../server/availability-service.mjs';

const evidence=JSON.parse(fs.readFileSync(new URL('./fixtures/availability-oct-nov-2026.json',import.meta.url)));
const now=Date.parse('2026-10-22T12:00:00Z'), villa=CATALOGUE[0];
const captured=evidence.villas.find(v=>v.id===villa.id);
const fresh={checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+CACHE_MS).toISOString()};
const coverage=(record,month)=>({...fresh,days:Object.fromEntries(record.publicDays.filter(d=>d.date.startsWith(month)).map(d=>[d.date,d.public==='source-available'?'available':d.public])),conflict:false});
const snapshot=(record=captured)=>({state:'synced',...fresh,intervals:normalizeFeed(record.payload,CATALOGUE.find(v=>v.id===record.id)),months:{'2026-10':coverage(record,'2026-10'),'2026-11':coverage(record,'2026-11')}});
function markup(month) {
  // Minimal fixture built from the separately captured official day states.
  const rows=evidence.villas.map(record=>'<div class="wpbs-calendar wpbs-overview-row"><div class="wpbs-overview-row-header-inner">'+record.name.replace('’','&#8217;')+'</div>'+record.publicDays.filter(d=>d.date.startsWith(month)).map(d=>{const [y,m,day]=d.date.split('-');return `<div data-year="${y}" data-month="${Number(m)}" data-day="${Number(day)}"><div class="wpbs-legend-item-icon wpbs-legend-item-icon-${d.public==='blocked'?2:1}"></div></div>`;}).join('')+'</div>').join('');
  const css=[['1','#ddffcc'],['2','#ffc0bd']].map(([id,colour])=>`.wpbs-legend-item-icon-${id} div:first-of-type { background-color: ${colour}; }.wpbs-legend-item-icon-${id} div:nth-of-type(2) { background-color: transparent; }`).join('');
  return `<div class="wpbs-overview-container" data-ids="1,2,3" data-current_year="2026" data-current_month="10">${rows}<style>${css}</style></div>`;
}
const json=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
const html=body=>new Response(body,{headers:{'content-type':'text/html; charset=utf-8'}});

test('October and November official evidence: 610 dates, nine matching current/future calendars',()=>{
  assert.equal(evidence.villas.reduce((sum,v)=>sum+v.publicDays.length,0),610);
  for(const record of evidence.villas) {
    const diffs=record.differences.filter(d=>d.date>='2026-10-22');
    if(record.id===5054)assert.ok(diffs.some(d=>d.date==='2026-11-01'));
    else assert.deepEqual(diffs,[],record.name);
  }
});
test('select check-in/check-out, highlight range state, reject past/occupied/intervening nights',()=>{
  const data=snapshot();
  assert.equal(selectDate(data,{},'2026-10-21',now).selection.arrival,undefined);
  assert.match(selectDate(data,{},'2026-10-23',now).error,/occupied/i);
  let selected=selectDate(data,{},'2026-10-24',now).selection;
  assert.deepEqual(selected,{arrival:'2026-10-24',departure:''});
  assert.ok(selectDate(data,selected,'2026-11-08',now).error);
  assert.equal(selectDate(data,selected,'2026-11-08',now).selection,selected);
  // Departure on the first occupied night consumes no occupied night.
  selected=selectDate(data,selected,'2026-10-31',now).selection;
  assert.deepEqual(selected,{arrival:'2026-10-24',departure:'2026-10-31'});
  assert.equal(requestState(data,selected.arrival,selected.departure,now),'available');
  assert.equal(requestState(data,'2026-10-30','2026-11-01',now),'blocked');
  assert.equal(requestState(data,'2026-10-21','2026-10-22',now),'past');
  assert.deepEqual(selectDate(data,selected,'2026-11-07',now).selection,{arrival:'2026-11-07',departure:''});
});
test('month changes preserve selection; check-out is exclusive across months',()=>{
  const record=evidence.villas.find(v=>v.id===5158),data=snapshot(record);
  assert.deepEqual(monthsForStay('2026-11-07','2026-12-02'),['2026-11','2026-12']);
  assert.deepEqual(monthsForStay('2026-10-24','2026-11-01'),['2026-10']);
  assert.deepEqual(monthsForStay('2026-10-24','2028-11-01'),[]);
  const selected=selectDate(data,{},'2026-10-24',now).selection;
  assert.ok(selected.arrival);
  assert.ok(selectDate(data,selected,'2026-11-02',now).error); // 31 October onwards is occupied.
  assert.equal(italyToday(Date.parse('2026-10-22T23:30:00Z')),'2026-10-23');
});
test('no empty/error/stale calendar can create verified search matches or valid selections',()=>{
  for(const data of [undefined,{state:'unavailable',intervals:[]},{...snapshot(),intervals:[]},{...snapshot(),expiresAt:new Date(now).toISOString()}]) {
    assert.notEqual(requestState(data,'2026-10-24','2026-10-25',now),'available');
    assert.ok(selectDate(data,{},'2026-10-24',now).error);
  }
  assert.equal(requestState({...snapshot(),months:{}},'2026-10-24','2026-10-25',now),'unverified');
  const stale=snapshot();stale.months['2026-10'].expiresAt=new Date(now).toISOString();
  assert.equal(requestState(stale,'2026-10-24','2026-10-25',now),'unverified');
  const conflict=snapshot();conflict.months['2026-10'].conflict=true;
  assert.equal(requestState(conflict,'2026-10-24','2026-10-25',now),'unverified');
});
test('public parser verifies dates and identity, treats changed colours as unknown, rejects missing/malformed days',()=>{
  const source=markup('2026-11'),parsed=parsePublicMonth(source,'2026-11');
  assert.equal(Object.keys(parsed).length,10);
  assert.equal(parsed['palazzo-rosadi']['2026-11-07'],'available');
  assert.equal(parsed['palazzo-rosadi']['2026-11-06'],'blocked');
  assert.deepEqual(overviewConfig(source).ids,'1,2,3');
  assert.throws(()=>parsePublicMonth(source.replace('Palazzo Rosadi','Other Villa'),'2026-11'));
  assert.throws(()=>parsePublicMonth(source.replace('data-day="7"','data-day="31"'),'2026-11'));
  assert.equal(parsePublicMonth(source.replaceAll('#ddffcc','#ffffff'),'2026-11')['palazzo-rosadi']['2026-11-07'],'unknown');
});
test('public month reads coalesce across villas, cache, expire, fail closed and recover',async()=>{
  let clock=now,calls=0,fail=false;
  const get=createPublicCalendar({now:()=>clock,fetchImpl:async(url,options)=>{
    calls++;if(fail)throw Error('Offline');
    if(url.endsWith('/availability/'))return html(markup('2026-10'));
    assert.equal(options.method,'POST');assert.equal(options.body.get('action'),'wpbs_refresh_calendar_overview');
    return html(markup('2026-11'));
  }});
  const results=await Promise.all(CATALOGUE.map(v=>get(v,['2026-10','2026-11'])));
  assert.equal(calls,2);assert.equal(results[0]['2026-11'].days['2026-11-07'],'available');
  clock+=CACHE_MS+1;fail=true;
  const failed=await get(villa,['2026-11']);assert.deepEqual(failed['2026-11'].days,{});
  clock+=15001;fail=false;
  assert.equal((await get(villa,['2026-11']))['2026-11'].days['2026-11-07'],'available');
});
test('the server applies one policy to search, calendar and form; API blocks override public green',async()=>{
  const service=createAvailabilityService({now:()=>now,fetchImpl:async url=>json(evidence.villas.find(v=>url.endsWith('/'+v.id)).payload),calendarService:async(v,months)=>{
    const record=evidence.villas.find(r=>r.id===v.id);return Object.fromEntries(months.map(m=>[m,coverage(record,m)]));
  }});
  const request=(slug,arrival,departure)=>service(new Request(`http://localhost/?villa=${slug}&arrival=${arrival}&departure=${departure}`));
  assert.equal((await (await request('palazzo-rosadi','2026-10-24','2026-10-31')).json()).stay.state,'available');
  assert.equal((await (await request('palazzo-rosadi','2026-10-24','2026-11-01')).json()).stay.state,'blocked');
  const conflict=await (await request('villa-casciano','2026-11-07','2026-11-08')).json();
  assert.equal(conflict.months['2026-11'].conflict,true);assert.notEqual(conflict.stay.state,'available');
  assert.equal((await request('villa-santandrea','2026-11-07','2026-11-08')).status,404);
  assert.equal((await service(new Request('http://localhost/?villa=palazzo-rosadi&months=2026-13'))).status,400);
});
