// Original View Map links take precedence over Wix's town-centre geocodes.
// This short link resolves to the municipality, not to Villa Sant'Andrea.
const resolvedLinks={
  'https://maps.app.goo.gl/KyCTAKC3mbHLT1717':{
    url:'https://www.google.com/maps/place/50026+San+Casciano+in+Val+di+Pesa+FI/@43.6453464,11.1208579,12z/data=!3m1!4b1!4m6!3m5!1s0x132a4f1c28b9e6c5:0x4082c90e3e59e30!8m2!3d43.6583439!4d11.1884072!16zL20vMGdsY3cw',
    precision:'area'
  }
};

export function coordinatesFromMapLink(url){
  let decoded;try{decoded=decodeURIComponent(url);}catch{return null;}
  // !3d / !4d identify the selected pin; @ can describe a different viewport centre.
  const pin=decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const pair=pin||decoded.match(/\/place\/[NS]?\s*(-?\d+(?:\.\d+)?)\s*,+\s*[EW]?\s*(-?\d+(?:\.\d+)?)(?:[/?#]|$)/i);
  if(!pair)return null;
  let latitude=Number(pair[1]),longitude=Number(pair[2]);
  if(!pin){if(/\/place\/S/i.test(decoded))latitude=-Math.abs(latitude);if(/,+\s*W/i.test(decoded))longitude=-Math.abs(longitude);}
  return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?[latitude,longitude]:null;
}

export function applyVillaMapLinks(pages){
  const listing=pages.find(page=>page.path==='/tuscany-villas-for-rent');
  const villas=new Map(pages.filter(page=>page.path.startsWith('/properties/')).map(page=>[page.path,page]));
  let property;
  for(const link of listing?.links||[]){
    let url;try{url=new URL(link.url);}catch{continue;}
    if(url.hostname==='www.supertuscany.org'||url.hostname==='supertuscany.org'){
      const path=decodeURIComponent(url.pathname).replace(/\/$/,'');
      if(villas.has(path))property=villas.get(path);
      continue;
    }
    if(!property||!['www.google.com','maps.google.com','maps.app.goo.gl'].includes(url.hostname))continue;
    const resolution=resolvedLinks[link.url],coordinates=coordinatesFromMapLink(resolution?.url||link.url);
    if(coordinates)property.mapPoint={coordinates,url:link.url,precision:resolution?.precision||'published-pin',source:'https://www.supertuscany.org/tuscany-villas-for-rent'};
  }
}
