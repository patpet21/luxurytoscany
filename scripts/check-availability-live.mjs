// Explicit local smoke test only. Never runs from build, CI or a scheduler.
import assert from 'node:assert/strict';
import {CATALOGUE, usableSnapshot, freshMonth, italyToday} from '../public/assets/availability-model.js';

const base = new URL(process.argv[2] || 'http://127.0.0.1:4173');
assert.ok(base.protocol === 'http:' && ['127.0.0.1','localhost'].includes(base.hostname), 'Only a local demo is allowed');
const first=italyToday().slice(0,7),next=new Date(first+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
const months=[first,next.toISOString().slice(0,7)];
for (const villa of CATALOGUE) {
  const response = await fetch(new URL(`/.netlify/functions/availability?villa=${villa.slug}&months=${months.join(',')}`,base), {signal:AbortSignal.timeout(20000)});
  const body=await response.json();
  assert.equal(response.status,200, `${villa.title}: source is currently not verifiable`);
  assert.equal(body.id,villa.id); assert.equal(body.villa,villa.slug); assert.ok(usableSnapshot(body));
  for(const month of months)assert.ok(freshMonth(body.months?.[month])&&Object.keys(body.months[month].days).length>=28,`${villa.title}: public calendar not verifiable for ${month}`);
  console.log(`${villa.title} (${villa.id}): ${body.state}; ${body.intervals.length} blocks; ${body.sourceWarning?'SOURCE DISAGREEMENT':'no recorded disagreement'}`);
}
const missing = await fetch(new URL('/.netlify/functions/availability?villa=villa-santandrea',base));
assert.equal(missing.status,404); assert.equal((await missing.json()).state,'unverified');
console.log('PASS: ten live local function responses; Sant’Andrea unverified. No forms submitted.');
