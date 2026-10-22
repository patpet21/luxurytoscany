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
    checked <= now + 5000 && expires > now && expires - checked <= CACHE_MS &&
    Array.isArray(snapshot.intervals) && snapshot.intervals.length > 0 &&
    snapshot.intervals.every(i => civilDate(i.start) && civilDate(i.endExclusive) && i.start < i.endExclusive);
}
export function dayState(snapshot, iso, now = Date.now()) {
  if (!civilDate(iso) || !usableSnapshot(snapshot, now)) return 'unknown';
  return snapshot.intervals.some(i => i.start <= iso && iso < i.endExclusive) ? 'blocked' : 'unverified';
}
export function stayState(snapshot, arrival, departure, now = Date.now()) {
  if (!civilDate(arrival) || !civilDate(departure) || departure <= arrival) return 'invalid';
  if (!usableSnapshot(snapshot, now)) return 'unknown';
  // A stay is [arrival, departure): check-out does not consume a night.
  return snapshot.intervals.some(i => arrival < i.endExclusive && departure > i.start) ? 'blocked' : 'unverified';
}
