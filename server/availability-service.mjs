import {createHash} from 'node:crypto';
import {CACHE_MS, CATALOGUE, normalizeFeed, civilDate, stayState} from '../public/assets/availability-model.js';

const SOURCE = 'https://www.promozionevilla.it/wp-json/promovilla/v1/availabilities/';
const MAX_BYTES = 512_000;
const FAILURE_MS = 15_000;

async function limitedJSON(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw Error('Response too large');
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error('Unexpected content type');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw Error('Response too large');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel(); throw error; }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Per-instance cache, bounded by the ten-villa allowlist. No jobs or background writes.
export function createAvailabilityService({fetchImpl = fetch, now = Date.now, timeoutMs = 6000} = {}) {
  const cache = new Map(), pending = new Map();
  async function refresh(villa, previous) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {Accept:'application/json'};
      if (previous?.good?.etag) headers['If-None-Match'] = previous.good.etag;
      if (previous?.good?.lastModified) headers['If-Modified-Since'] = previous.good.lastModified;
      const response = await fetchImpl(SOURCE + villa.id, {method:'GET', headers, signal:controller.signal, redirect:'error'});
      let good;
      if (response.status === 304 && previous?.good) good = previous.good;
      else {
        if (response.status !== 200) throw Error('Source unavailable');
        const intervals = normalizeFeed(await limitedJSON(response), villa);
        const version = createHash('sha256').update(JSON.stringify(intervals)).digest('hex').slice(0, 20);
        good = {intervals, version, etag:response.headers.get('etag'), lastModified:response.headers.get('last-modified'),
          changedAt:previous?.good?.version === version ? previous.good.changedAt : new Date(now()).toISOString()};
      }
      const checked = now();
      const snapshot = {state:'synced', villa:villa.slug, id:villa.id, title:villa.title, source:SOURCE+villa.id,
        semantics:'blocked-nights-inclusive-upstream', coverage:'not-declared', intervals:good.intervals,
        checkedAt:new Date(checked).toISOString(), expiresAt:new Date(checked+CACHE_MS).toISOString(),
        changedAt:good.changedAt, version:good.version,
        sourceWarning:villa.id === 5054 ? 'A discrepancy between the provider’s calendars was observed on 22 October 2026. Occupied dates remain blocked; please ask our team to verify every stay.' : null};
      cache.set(villa.slug, {snapshot, good, until:checked+CACHE_MS});
      return snapshot;
    } catch {
      const snapshot = {state:'unavailable', villa:villa.slug, id:villa.id, intervals:[], checkedAt:new Date(now()).toISOString(),
        expiresAt:null, reason:'Source could not be verified. No availability is confirmed.'};
      // Retain validators privately for a later recheck, never return stale success.
      cache.set(villa.slug, {snapshot, good:previous?.good, until:now()+FAILURE_MS});
      return snapshot;
    } finally { clearTimeout(timeout); }
  }
  async function get(villa) {
    const previous = cache.get(villa.slug);
    if (previous && previous.until > now()) return previous.snapshot;
    if (!pending.has(villa.slug)) pending.set(villa.slug, refresh(villa, previous).finally(() => pending.delete(villa.slug)));
    return pending.get(villa.slug);
  }
  return async request => {
    const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
      'Netlify-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
    const reply = (data, status=200) => new Response(JSON.stringify(data), {status, headers});
    if (request.method !== 'GET') return new Response(JSON.stringify({state:'unavailable'}), {status:405, headers:{...headers, Allow:'GET'}});
    const params = new URL(request.url).searchParams;
    const villa = CATALOGUE.find(v => v.slug === params.get('villa'));
    if (!villa) return reply({state:'unverified', intervals:[], reason:'No verified source for this villa.'}, 404);
    const arrival = params.get('arrival'), departure = params.get('departure');
    if ((arrival !== null || departure !== null) && (!civilDate(arrival) || !civilDate(departure) || departure <= arrival)) return reply({state:'unavailable', reason:'Invalid stay dates.'}, 400);
    const snapshot = await get(villa);
    const data = arrival ? {...snapshot, stay:{arrival, departure, state:stayState(snapshot, arrival, departure, now())}} : snapshot;
    return reply(data, snapshot.state === 'synced' ? 200 : 503);
  };
}
