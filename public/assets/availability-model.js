// Civil dates only: upstream MM/DD/YYYY; never parse them in the host timezone.
export const CACHE_MS = 120_000;
export const CATALOGUE = Object.freeze([
  ['palazzo-rosadi', 1081, 'Palazzo Rosadi', '/properties/palazzo-rosadi'],
  ['villa-casciano', 5054, 'Villa Casciano', '/properties/villa-casciano'],
  ['villa-de-michelangioli', 336, 'Villa De’ Michelangioli', '/properties/villa-de’-michelangioli'],
  ['villa-dellangelo', 1811, 'Villa dell’Angelo', '/properties/villa-dell’angelo'],
  ['villa-ginestra', 5359, 'Villa Ginestra', '/properties/villa-ginestra'],
  ['villa-girasole', 5358, 'Villa Girasole', '/properties/villa-girasole'],
  ['villa-guardistallo', 5158, 'Villa Guardistallo', '/properties/villa-guardistallo'],
  ['villa-roncovisi', 1813, 'Villa Roncovisi', '/properties/villa-roncovisi'],
  ['villa-torre-del-cielo', 1335, 'Villa Torre del Cielo', '/properties/villa-torre-del-cielo'],
  ['villa-volterra', 6630, 'Villa Volterra', '/properties/villa-volterra'],
].map(([slug, id, title, path]) => Object.freeze({slug, id, title, path})));

export function civilDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function upstreamDate(value) {
  const match = typeof value === 'string' && value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = match && `${match[3]}-${match[1]}-${match[2]}`;
  if (!iso || !civilDate(iso)) throw Error('Invalid upstream date');
  return iso;
}
export function nextDay(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export const nameKey = value => String(value).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');

export function normalizeFeed(data, villa) {
  if (!Array.isArray(data) || data.length !== 1) throw Error('Missing or ambiguous villa');
  const record = data[0];
  if (record?.id !== villa.id || nameKey(record.title) !== nameKey(villa.title)) throw Error('Villa identity mismatch');
  if (!Array.isArray(record.availabilities) || !record.availabilities.length || record.availabilities.length > 5000) throw Error('Empty or invalid intervals');
  const intervals = record.availabilities.map(item => {
    if (!item || typeof item !== 'object') throw Error('Invalid interval');
    const start = upstreamDate(item.start), lastNight = upstreamDate(item.end);
    if (start > lastNight) throw Error('Reversed interval');
    // CONFIRMED, blank status and sequence flags never make a date available.
    return {start, endExclusive: nextDay(lastNight)};
  }).sort((a,b) => a.start.localeCompare(b.start));
  const merged = [];
  for (const interval of intervals) {
    const last = merged.at(-1);
    if (last && interval.start <= last.endExclusive) last.endExclusive = last.endExclusive > interval.endExclusive ? last.endExclusive : interval.endExclusive;
    else merged.push({...interval});
  }
  return merged;
}

export function usableSnapshot(snapshot, now = Date.now()) {
  const checked = Date.parse(snapshot?.checkedAt), expires = Date.parse(snapshot?.expiresAt);
  return snapshot?.state === 'synced' && Number.isFinite(checked) && Number.isFinite(expires) &&
    checked <= now + 5000 && expires > now && expires > checked && expires - checked <= CACHE_MS &&
    Array.isArray(snapshot.intervals) && snapshot.intervals.length > 0 &&
    snapshot.intervals.every(i => civilDate(i.start) && civilDate(i.endExclusive) && i.start < i.endExclusive);
}
export function dayState(snapshot, iso, now = Date.now()) {
  if (!civilDate(iso) || !usableSnapshot(snapshot, now)) return 'unknown';
  if(snapshot.intervals.some(i => i.start <= iso && iso < i.endExclusive))return 'blocked';
  const month=snapshot.months?.[iso.slice(0,7)];
  if(!month || !freshMonth(month,now))return 'unverified';
  if(month.days[iso]==='blocked')return 'blocked';
  return month.conflict ? 'unverified' : month.days[iso]==='available' ? 'available' : 'unverified';
}
export function stayState(snapshot, arrival, departure, now = Date.now()) {
  if (!civilDate(arrival) || !civilDate(departure) || departure <= arrival) return 'invalid';
  if (!usableSnapshot(snapshot, now)) return 'unknown';
  // A stay is [arrival, departure): check-out does not consume a night.
  if(snapshot.intervals.some(i => arrival < i.endExclusive && departure > i.start))return 'blocked';
  let verified=true, nights=0;
  for(let day=arrival;day<departure;day=nextDay(day)) {
    if(++nights>366)return 'invalid';
    const state=dayState(snapshot,day,now);
    if(state==='blocked')return 'blocked';
    if(state!=='available')verified=false;
  }
  return verified?'available':'unverified';
}

export const italyToday = (now=Date.now()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
export function freshMonth(month,now=Date.now()) {
  const checked=Date.parse(month?.checkedAt), expires=Date.parse(month?.expiresAt);
  return !!month?.days && typeof month.days==='object' && !Array.isArray(month.days) && Number.isFinite(checked) && checked<=now+5000 && expires>now && expires>checked && expires-checked<=CACHE_MS;
}
export function requestState(snapshot,arrival,departure,now=Date.now()) {
  if(civilDate(arrival) && arrival<italyToday(now))return 'past';
  return stayState(snapshot,arrival,departure,now);
}
export function monthsForStay(arrival,departure) {
  if(!civilDate(arrival)||!civilDate(departure)||departure<=arrival || (Date.parse(departure)-Date.parse(arrival))/86400000>366)return [];
  const result=new Set();
  for(let day=arrival;day<departure;day=nextDay(day))result.add(day.slice(0,7));
  return [...result];
}
export function selectDate(snapshot, selection, date, now=Date.now()) {
  const before=selection||{arrival:'',departure:''};
  if(!civilDate(date) || date<italyToday(now))return {selection:before,error:'Please choose today or a future date.'};
  // A blocked arrival day can be the departure boundary of a valid prior stay.
  if(before.arrival && !before.departure && date>before.arrival) {
    const state=requestState(snapshot,before.arrival,date,now);
    if(['blocked','unknown','invalid','past'].includes(state))return {selection:before,error:state==='blocked'?'This stay crosses occupied nights. Choose an earlier check-out.':'These dates cannot currently be verified. Please refresh or ask our team.'};
    return {selection:{arrival:before.arrival,departure:date},error:''};
  }
  const state=dayState(snapshot,date,now);
  if(!['available','unverified'].includes(state))return {selection:before,error:state==='blocked'?'This night is occupied.':'These dates cannot currently be verified.'};
  return {selection:{arrival:date,departure:''},error:''};
}
