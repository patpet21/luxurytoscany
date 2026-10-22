import {CACHE_MS, CATALOGUE, nameKey, civilDate} from '../public/assets/availability-model.js';

const ORIGIN = 'https://www.promozionevilla.it';
const decode = text => text.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&amp;/g,'&').replace(/&rsquo;/g,'’').replace(/&apos;/g,"'");
export async function limitedText(response, max=2_000_000) {
  if (Number(response.headers.get('content-length'))>max) { await response.body?.cancel(); throw Error('Response too large'); }
  const reader=response.body.getReader(), chunks=[]; let bytes=0;
  try {
    while(true) { const {done,value}=await reader.read(); if(done)break; bytes+=value.length; if(bytes>max)throw Error('Response too large'); chunks.push(value); }
  } catch(error) { await reader.cancel(); throw error; }
  return Buffer.concat(chunks).toString('utf8');
}

export function overviewConfig(html) {
  const tag=html.match(/<div class="wpbs-overview-container"[^>]+>/)?.[0];
  const ids=tag?.match(/data-ids="([\d,]+)"/)?.[1];
  if(!ids || ids.length>500)throw Error('Public calendar configuration changed');
  return {ids,show_legend:'1',legend_position:'bottom',show_day_abbreviation:'1',history:'1',show_tooltip:'1',language:'en'};
}

export function parsePublicMonth(html, month) {
  if(!/^\d{4}-\d{2}$/.test(month) || !civilDate(month+'-01'))throw Error('Invalid month');
  const result={};
  const expected=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();
  for(const row of html.split('<div class="wpbs-calendar wpbs-overview-row">').slice(1)) {
    const label=row.match(/wpbs-overview-row-header-inner">(.*?)<\/div>/)?.[1];
    const villa=CATALOGUE.find(v=>nameKey(v.title)===nameKey(decode((label||'').replace(/<[^>]+>/g,''))));
    if(!villa)continue;
    if(result[villa.slug])throw Error('Ambiguous public calendar villa');
    const days={};
    for(const match of row.matchAll(/data-year="(\d+)" data-month="(\d+)" data-day="(\d+)"><div class="wpbs-legend-item-icon wpbs-legend-item-icon-(\d+)"/g)) {
      const [,y,m,d,legend]=match;
      const iso=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      if(!civilDate(iso) || !iso.startsWith(month+'-') || days[iso])throw Error('Unexpected public calendar date');
      const colours=[...html.matchAll(new RegExp('wpbs-legend-item-icon-'+legend+' div:(?:first-of-type|nth-of-type\\(2\\)) \\{ background-color: ([^;]+);','g'))].map(m=>m[1]);
      days[iso]=colours.length===2 && colours[0]==='#ffc0bd' && colours[1]==='transparent' ? 'blocked' : colours.length===2 && colours[0]==='#ddffcc' && colours[1]==='transparent' ? 'available' : 'unknown';
    }
    if(Object.keys(days).length!==expected)throw Error('Incomplete public calendar month');
    result[villa.slug]=days;
  }
  if(Object.keys(result).length!==CATALOGUE.length)throw Error('Missing public calendar villas');
  return result;
}

// A shared month response covers all ten villas; avoid one public scrape per villa.
export function createPublicCalendar({fetchImpl=fetch, now=Date.now, timeoutMs=6000}={}) {
  let setup, setupPending;
  const months=new Map(), pending=new Map();
  async function read(url, options={}) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetchImpl(url,{...options,redirect:'error',signal:controller.signal});
      if(response.status!==200 || !response.headers.get('content-type')?.includes('text/html'))throw Error('Public calendar unavailable');
      return await limitedText(response);
    } finally {clearTimeout(timer);}
  }
  async function config() {
    if(setup?.until>now())return setup.value;
    if(!setupPending)setupPending=(async()=>{
      const html=await read(ORIGIN+'/availability/');
      const value=overviewConfig(html);
      const tag=html.match(/<div class="wpbs-overview-container"[^>]+>/)?.[0];
      const year=tag.match(/data-current_year="(\d+)"/)?.[1], month=tag.match(/data-current_month="(\d+)"/)?.[1];
      if(year&&month) {
        const key=`${year}-${month.padStart(2,'0')}`;
        months.set(key,{days:parsePublicMonth(html,key),checkedAt:now(),until:now()+CACHE_MS});
      }
      setup={value,until:now()+CACHE_MS}; return value;
    })().finally(()=>{setupPending=undefined;});
    return setupPending;
  }
  async function get(month) {
    if(months.get(month)?.until>now())return months.get(month);
    if(!pending.has(month))pending.set(month,(async()=>{
      try {
        const fields=await config();
        if(months.get(month)?.until>now())return months.get(month);
        // This POST is the public month-selector's non-mutating read action.
        const body=new URLSearchParams({...fields,action:'wpbs_refresh_calendar_overview',current_year:month.slice(0,4),current_month:String(Number(month.slice(5)))});
        const html=await read(ORIGIN+'/wp-admin/admin-ajax.php',{method:'POST',body,headers:{'Content-Type':'application/x-www-form-urlencoded'}});
        const entry={days:parsePublicMonth(html,month),checkedAt:now(),until:now()+CACHE_MS};
        months.set(month,entry); return entry;
      } catch {
        const entry={days:null,checkedAt:now(),until:now()+15000}; months.set(month,entry); return entry;
      } finally {
        // Bound memory even as the calendar horizon advances.
        while(months.size>38)months.delete(months.keys().next().value);
      }
    })().finally(()=>pending.delete(month)));
    return pending.get(month);
  }
  return async (villa, requested) => Object.fromEntries(await Promise.all(requested.map(async month=>{
    const entry=await get(month);
    return [month,{days:entry.days?.[villa.slug]||{},checkedAt:new Date(entry.checkedAt).toISOString(),expiresAt:new Date(entry.days?entry.until:entry.checkedAt).toISOString()}];
  })));
}
