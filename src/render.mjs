import {homeSearch} from './finder.mjs';
import {applyVillaMapLinks} from './locations.mjs';
import {navigation} from './navigation.mjs';
import {aboutContent} from './about.mjs';
import {conciergeWidget} from './concierge.mjs';
import {cinematicHome} from './cinematic-home.mjs';
export const esc = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const arrow = '<span aria-hidden="true">↗</span>';
export const paths = {
  villas:'/tuscany-villas-for-rent', experiences:'/unforgettable-experience', cities:'/destinations',
  packages:'/courses', children:'/tuscany-with-your-children', gallery:'/copy-of-videos', videos:'/videos', about:'/about', owners:'/for-villa-owners'
};
const indoors = [['Cooking classes','/cooking-classes'],['Personal chefs','/personal-chefs'],['Wine experts','/wine-experts'],['An Italian family meal','/a-meal-with-an-italian-family'],['Museums','/copy-of-a-meal-with-an-italian-family'],['Jewelry','/jewelry'],['Personal trainer','/personal-trainer'],['Cigar factories','/cigar-factories']];
const outdoors = [['Wine tasting','/wine-tasting'],['Truffle hunting','/truffle-tasting'],['Hiking','/hiking'],['Bike tours','/bike-tours'],['Olive oil tasting','/olive-oil-testing'],['Bistecca alla Fiorentina','/bistecca-alla-fiorentina'],['Chestnut harvest','/chestnut-harvest'],['Farms','/tuscany-farms'],['Honey tasting','/honey-tasting'],['Culture & museums','/tuscany-culture-and-museums'],['Shopping & crafts','/shopping-and-crafts'],['Festivals & entertainment','/festivals-and-entertainment']];
const families = [['Leaning Tower of Pisa','/leaning-tower-of-pisa'],['Pinocchio Park','/pinocchio-park'],['Boboli Gardens','/boboli-garden'],['Pistoia Zoo','/pistoia-zoo'],['Butterfly House','/collodi-butterfly-house'],['Chianti Sculpture Park','/chianti-sculpture-park'],['Museo Leonardiano','/museo-leonardiano'],['Beach days','/beach-days'],['Adventure parks','/adventure-parks'],['Cycling tours','/cycling-tours'],["Children’s museums",'/children-museum'],['Pizza-making classes','/pizza-making-classes'],['Ice cream days','/ice-cream-days']];
const cities = ['Firenze','Siena','Arezzo','Lucca','Pisa','Grosseto','Pistoia'];
export const normalizePath = p => {try {p=decodeURIComponent(p);}catch{}return p==='/'?'/':p.replace(/\/$/,'');};
export function imageSrc(img) {return typeof img==='string'?img:img?.local || img?.localPath || img?.url || '';}
export function pageImage(p,i=0) {return imageSrc(p?.images?.[i]);}
export function picture(p, cls='', i=0, eager=false) {
  const img=p?.images?.[i]; if(!img) return '';
  return `<img class="${cls}" src="${esc(imageSrc(img))}" alt="${esc(img.alt || p.title || 'Tuscany')}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
}
export function cleanTitle(t='') {return t.replace(/\s*[-|:]\s*(Super\s*Tuscany|Luxur.*|Tuscan.*).*$/i,'').replace(/Accomodations/gi,'Accommodations').replace(/Staty/gi,'Stay').replace(/Tuscany Museums/gi,'Tuscany Museums').replace(/�/g,'’');}
export function adapt(source) {
  const pages=Array.isArray(source)?source:source.pages || [];
  const adapted=pages.map(p=>{const images=(p.images||[]).filter(i=>!/(^instagram$|^facebook$|logo|^icon$)/i.test(i.alt||''));const cover=p.cover;const coverIndex=images.findIndex(i=>imageSrc(i)===cover||i.role==='cover');if(coverIndex>0)images.unshift(images.splice(coverIndex,1)[0]);return {...p,path:normalizePath(p.path || new URL(p.url).pathname),title:cleanTitle(p.title),images,sections:p.sections||[]};});
  // The listing publishes separately labelled capacity, bedrooms and bathrooms.
  // Its explicit labels avoid confusing the original CMS bedroom/bathroom fields.
  const listing=adapted.find(p=>p.path==='/tuscany-villas-for-rent');
  const key=t=>cleanTitle(t).toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
  for(const p of adapted.filter(p=>p.path.startsWith('/properties/'))){
    const summary=listing?.sections.find(s=>key(s.heading)===key(p.title));
    if(summary){
      const text=summary.text||'';p.facts={...p.facts};
      for(const [field,label] of [['sleeps','Sleeps'],['bedrooms','Bedrooms'],['bathrooms','Bath']]){
        const value=text.match(new RegExp('(?:^|\\n)'+label+'\\s+([0-9]+)'))?.[1];
        if(value)p.facts[field]=Number(value);
      }
    }
  }
  applyVillaMapLinks(adapted);
  return adapted;
}
export function collections(pages) {
  const get=path=>pages.find(p=>p.path===normalizePath(path));
  return {get,villas:pages.filter(p=>p.path.startsWith('/properties/')),cityPages:pages.filter(p=>p.path.startsWith('/destinations/')),experiences:[...indoors,...outdoors].map(([name,path])=>get(path)).filter(Boolean),families:families.map(([n,path])=>get(path)).filter(Boolean),packages:pages.filter(p=>p.path.startsWith('/courses/'))};
}
function menuList(items) {return items.map(([name,path])=>`<a href="${esc(path)}">${esc(name)} ${arrow}</a>`).join('');}
function mega(name,cols) {return `<details class="nav-group"><summary>${name}<span class="chevron" aria-hidden="true">⌄</span></summary><div class="mega"><div class="mega-inner">${cols.map(([title,items])=>`<div><span class="eyebrow">${title}</span>${menuList(items)}</div>`).join('')}</div></div></details>`;}
export function header(data) {
  return navigation(data,{esc,arrow,paths,cities,indoors,outdoors,families,picture});
}
function card(p,type='',i=0) {
  const facts=p.facts||{}; const subtitle=type==='villa'?(facts.location||p.location||'Tuscany, Italy'):type==='city'?'DISCOVER THE DESTINATION':'A DIFFERENT SIDE OF TUSCANY';
  return `<article class="card ${type==='villa'?'villa-card':''}" data-name="${esc(p.title.toLowerCase())}" data-location="${esc(String(subtitle).toLowerCase())}" data-bedrooms="${esc(facts.bedrooms||'')}"><a class="card-image" href="${esc(p.path)}">${picture(p,'',0)}<span class="image-arrow">${arrow}</span>${type==='villa'?'<span class="image-label">PRIVATE VILLA</span>':''}</a><div class="card-info"><p class="eyebrow">${esc(subtitle)}</p><h3><a href="${esc(p.path)}">${esc(p.title)}</a></h3>${type==='villa'?`<p class="card-facts">${facts.sleeps?`${esc(facts.sleeps)} guests<span>·</span>`:''}${facts.bedrooms?`${esc(facts.bedrooms)} bedrooms`:''}${facts.bathrooms?`<span>·</span>${esc(facts.bathrooms)} bathrooms`:''}${facts.area&&facts.area!=='x'?`<span>·</span>${esc(facts.area)}`:''}</p>`:''}<a class="text-link" href="${esc(p.path)}">${type==='villa'?'Explore the villa':'Discover more'} ${arrow}</a></div></article>`;
}
function heading(kicker,title,text='',link='') {return `<div class="section-heading"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2>${text?`<p class="section-intro">${text}</p>`:''}</div>${link}</div>`;}
function journeyCTA() {return `<section class="journey"><div class="journey-inner"><p class="eyebrow">A JOURNEY THAT FEELS LIKE YOU</p><h2>Your Tuscany.<br><em>Our personal touch.</em></h2><p>Tell us what you love. We’ll help you find the right villa and the experiences that make your stay unforgettable.</p><div class="button-row"><a class="button" href="/tuscany-villas-for-rent">Plan your stay ${arrow}</a><button class="text-link" data-inquiry="general">Ask us a question ${arrow}</button></div></div><span class="journey-mark" aria-hidden="true">ST</span></section>`;}
function homeContent(page,data) {
  const hero=data.villas.find(p=>p.path.includes('palazzo-rosadi')) || data.villas[0] || page;
  const pool=page?.images?.find(i=>(i.alt||'').toLowerCase().includes('pool'));
  const homeVideo=(page?.videos||[]).find(v=>v.type==='mp4' || /\.mp4/.test(v.local||v.url||''));
  return `<section class="hero hero-home">${homeVideo?`<video class="hero-media" autoplay muted loop playsinline poster="${esc(pageImage(hero))}"><source src="${esc(homeVideo.local||homeVideo.url)}" type="video/mp4"></video><button class="video-control" aria-label="Pause background video" data-video-toggle>Ⅱ</button>`:picture(hero,'hero-media',0,true)}<div class="hero-shade"></div><div class="hero-copy"><p class="eyebrow">PRIVATE VILLAS · AUTHENTIC EXPERIENCES · LOCAL EXPERTISE</p><h1>Tuscany, as it<br>was meant to <em>be.</em></h1><p>Extraordinary homes. Unhurried days.<br>A Tuscany you’ll carry with you.</p><a class="button button-light" href="${paths.villas}">Discover our villas ${arrow}</a></div><div class="hero-foot"><span>YOUR DREAM VACATION</span><a href="#collection">EXPLORE <span aria-hidden="true">↓</span></a><span>43°46′ N · 11°15′ E</span></div></section>${homeSearch(data,{esc,card,arrow})}<div class="discovery-strip"><span>Beautiful places. <em>Meaningful connections.</em></span><a href="${paths.experiences}">Experience the real Tuscany ${arrow}</a></div><section class="section intro-section"><p class="eyebrow">WELCOME TO SUPER TUSCANY</p><h2>A place to slow down.<br>A world to <em>fall in love with.</em></h2><p>Discover a more personal side of Italy with people who call it home. From a private villa in the hills to a meal around a local family’s table, we bring you closer to the places, traditions and people that make Tuscany extraordinary.</p><a class="text-link" href="${paths.about}">Our story ${arrow}</a><span class="intro-stamp">Passion · Honesty<br>Professionalism · Trust</span></section><section class="section" id="collection">${heading('THE VILLA COLLECTION','Exceptional homes.<br><em>Entirely yours.</em>','Private pools, beautiful surroundings and the space to make yourself at home.',`<a class="text-link" href="${paths.villas}">View all ${data.villas.length} villas ${arrow}</a>`)}<div class="card-grid villas-grid">${data.villas.slice(0,3).map(p=>card(p,'villa')).join('')}</div></section><section class="editorial-split" aria-label="Discover authentic Tuscan experiences"><div class="editorial-visual">${picture(data.get('/wine-tasting')||data.experiences[0]||page,'editorial-image')}</div><div class="editorial-copy"><p class="eyebrow">BEYOND THE BEAUTIFUL</p><h2>Don’t just visit.<br><em>Become part of it.</em></h2><p>Cook with a local chef. Follow the scent of truffles through the woods. Taste a wine where it was made. Our trusted Italian guides open the door to the Tuscany they know and love.</p><a class="button" href="${paths.experiences}">Explore the experiences ${arrow}</a><div class="editorial-links"><a href="/indoors">Indoors ${arrow}</a><a href="/outdoors">Outdoors ${arrow}</a><a href="/courses">Curated packages ${arrow}</a></div></div></section><section class="section">${heading('A REGION, MANY WORLDS','Find your corner<br>of <em>Tuscany.</em>','Art-filled cities, medieval villages and countryside that stays with you.',`<a class="text-link" href="${paths.cities}">Explore all destinations ${arrow}</a>`)}<div class="destination-grid">${data.cityPages.slice(0,4).map(p=>`<a class="destination" href="${esc(p.path)}">${picture(p)}<div><span class="eyebrow">TUSCANY, ITALY</span><h3>${esc(p.title)}</h3>${arrow}</div></a>`).join('')}</div></section><section class="family-feature"><div class="family-copy"><p class="eyebrow">TUSCANY, TOGETHER</p><h2>Little discoveries.<br><em>Lifelong memories.</em></h2><p>Pizza-making, butterfly houses, beach days and adventures outdoors. A holiday that makes room for every member of your family.</p><p>We work with villa owners to understand your family’s accessibility and accommodation needs before your stay.</p><a class="text-link" href="${paths.children}">Tuscany with your children ${arrow}</a></div>${picture(data.get('/pizza-making-classes')||data.families[0]||page,'family-image')}</section><section class="section story-section">${picture(data.get('/about')||page,'story-image')}<div><p class="eyebrow">REAL PEOPLE. PERSONAL CARE.</p><h2>From Tuscany,<br><em>with love.</em></h2><p>Founded by Christian Ferrara, Super Tuscany brings together carefully chosen homes and trusted local guides. Our approach is personal: we listen, share our knowledge and help you create your own unforgettable stay.</p><a class="text-link" href="${paths.about}">Meet Super Tuscany ${arrow}</a></div></section><section class="section visual-journal">${heading('A WINDOW INTO OUR WORLD','Let Tuscany <em>inspire you.</em>','A glimpse of the landscapes, homes and everyday moments waiting for you.')}<div class="journal-grid"><a href="${paths.gallery}">${picture(pool?{title:'Tuscany photo gallery',images:[pool]}:page)}<h3>The photo journal ${arrow}</h3></a><a href="${paths.videos}">${picture(page,'',Math.min(2,page.images.length-1))}<h3>Tuscany in motion ${arrow}</h3></a></div></section><div class="section">${gallery(page,true)}${videos(page)}</div>${journeyCTA()}`;
}
function subHero(page,kicker='THE SUPER TUSCANY COLLECTION') {return `<section class="subhero">${picture(page,'hero-media',0,true)}<div class="hero-shade"></div><div class="subhero-copy"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(page.title)}</h1></div></section>`;}

/* Shared villa presentation: lightweight inline SVGs, no icon font or dependency. */
function villaIcon(name) {
  const drawing={
    guests:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    bed:'<path d="M3 18v-7m18 7v-7M3 14h18M5 14V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M3 18v2m18-2v2"/>',
    bath:'<path d="M3 12h18v3a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-3ZM6 12V5a3 3 0 0 1 6 0v1M5 21l2-3m12 3-2-3"/>',
    area:'<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 16 8-8m-6 0h6v6"/>',
    location:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    wifi:'<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0m-10.5 4a5 5 0 0 1 7 0M12 20h.01"/>',
    towel:'<path d="M6 4h12v16H6zM9 4v5m6-5v5M6 11h12"/>',
    linen:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14m4-10h5m-5 4h5"/>',
    baby:'<circle cx="12" cy="11" r="8"/><path d="M9 9h.01M15 9h.01M9 14c2 2 4 2 6 0M12 3V1"/>',
    food:'<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18m8-12c0-3 2-6 5-6v18m-5-12h5"/>',
    tour:'<path d="M3 10 12 3l9 7v10H3V10ZM8 20v-7h8v7M3 10h18"/>',
    wine:'<path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3ZM12 14v7m-4 0h8M8.5 8h7"/>',
    cleaning:'<path d="m4 20 8-8m-2-3 5-5 5 5-5 5-5-5ZM3 10l2 1m13 7 1 2m-8-17 1-2"/>',
    pool:'<path d="M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 21c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M8 13V5a2 2 0 0 1 4 0M8 9h4"/>',
    garden:'<path d="M12 21v-10M12 15C5 15 4 8 4 4c6 0 8 4 8 11Zm0-3c0-6 3-8 8-8 0 5-2 8-8 8Z"/>',
    support:'<path d="M3 13v-1a9 9 0 0 1 18 0v1M3 13h3v7H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 1-2Zm18 0h-3v7h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-1-2Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star:'<path d="m12 2 3 7 7 .5-5.5 4.7 1.8 7-6.3-4-6.3 4 1.8-7L2 9.5 9 9z"/>',
    check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'
  };
  return '<svg class="villa-line-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(drawing[name]||drawing.check)+'</svg>';
}
function villaBenefitIcon(label) {
  const name=String(label).replace(/<[^>]*>/g,' ').toLowerCase();
  if(/wifi|wi-fi|internet/.test(name)) return 'wifi';
  if(/towels?|bathrobe/.test(name)) return 'towel';
  if(/linen|sheets?|bedding/.test(name)) return 'linen';
  if(/crib|cot|highchair|children|baby/.test(name)) return 'baby';
  if(/breakfast|buffet|chef|meal|food/.test(name)) return 'food';
  if(/wine|tasting/.test(name)) return 'wine';
  if(/tour|monastery|museum|excursion/.test(name)) return 'tour';
  if(/clean|maid|housekeep/.test(name)) return 'cleaning';
  if(/pool|swimming/.test(name)) return 'pool';
  if(/garden|maintenance|grounds/.test(name)) return 'garden';
  if(/support|concierge|assistance|24\/7/.test(name)) return 'support';
  if(/hour|midweek|mid-week|daily/.test(name)) return 'clock';
  if(/quality|finest|selected|welcome|guarantee/.test(name)) return 'star';
  return 'check';
}
function villaIncludedSection(title,html,id) {
  let count=0;
  const decorated=html.replace(/<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi,list=>{
    const items=[...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    if(!items.length) return list;
    count+=items.length;
    return '<div class="villa-benefit-grid">'+items.map(match=>{
      const item=match[1].trim();
      return '<div class="villa-benefit-card"><span class="villa-benefit-icon">'+villaIcon(villaBenefitIcon(item))+'</span><div class="villa-benefit-label">'+item+'</div></div>';
    }).join('')+'</div>';
  });
  if(!count) return null;
  return '<section class="content-section villa-included-section" id="section-'+id+'"><p class="eyebrow">YOUR STAY, THOUGHTFULLY PREPARED</p><h2>'+esc(title)+'</h2><div class="villa-benefit-content">'+decorated+'</div></section>';
}
function villaMeta(page) {
  const f=page.facts||{};
  const pill=(icon,text)=>'<span class="villa-meta-pill">'+villaIcon(icon)+'<span>'+text+'</span></span>';
  return '<div class="villa-meta"><span class="villa-badge">PRIVATE VILLA</span>'
    +(f.sleeps?pill('guests','Up to '+esc(f.sleeps)+' guests'):'')
    +(f.bedrooms?pill('bed',esc(f.bedrooms)+' bedrooms'):'')
    +(f.bathrooms?pill('bath',esc(f.bathrooms)+' bathrooms'):'')
    +(f.area&&f.area!=='x'?pill('area',esc(f.area)):'')
    +'<button class="text-link villa-meta-cta" data-inquiry="booking" data-property="'+esc(page.title)+'">Enquire about this villa <span aria-hidden="true">↗</span></button></div>';
}

function sectionBody(page, {villa=false}={}) {
  const sections=page.sections || [];
  const galleryTitles=/^(interior gallery|exterior gallery|photo gallery|gallery)$/i;
  return sections.map((s,i)=>{
    const title=cleanTitle(s.heading||s.title||'');
    if(galleryTitles.test(title)) return '';
    const html=s.html||s.content|| (s.text?`<p>${esc(s.text)}</p>`:'');
    // The imported property summary repeats location, rate and capacity as tall
    // plain-text fields. The redesigned overview owns those facts for every villa.
    const sourceText=(s.text||html.replace(/<[^>]+>/g,' ')).replace(/&nbsp;/gi,' ').replace(/\s+/g,' ');
    if(villa && /\b(?:Bed|Bedrooms)\s*[:\-]?\s*\d+\b/i.test(sourceText) && /\bSleeps\s*[:\-]?\s*\d+\b/i.test(sourceText) && /\bBath\s*[:\-]?\s*\d+\b/i.test(sourceText)) return '';
    if(!html.trim()) return '';
    if(villa && /(?:included\s+in\s+(?:the\s+)?(?:rental\s+)?price|what(?:'|’)?s\s+included)/i.test(title) && !/^not\s+included/i.test(title)) {
      const decorated=villaIncludedSection(title,html,i);
      if(decorated) return decorated;
    }
    if(villa && /pric/i.test(title) && (/<table/i.test(html)|| /202[0-5]/.test(html))) return `<details class="content-section historical-prices"><summary><span>Published rate archive</span><span aria-hidden="true">+</span></summary><p class="notice">These are the rates published on the original site. They may refer to past seasons. Please request a quote for current dates, rates and availability.</p><div class="table-scroll">${html}</div></details>`;
    return `<section class="content-section" id="section-${i}">${title?`<h2>${esc(title)}</h2>`:''}<div class="prose ${/<table/i.test(html)?'table-scroll':''}">${html}</div></section>`;
  }).join('') || `<div class="prose"><p>${esc(page.text||'')}</p></div>`;
}
function gallery(page,compact=false) {
  if(!page.images?.length) return '';
  const images=page.images.filter(i=>!/\b(logo|instagram|facebook|icon)\b/i.test(i.alt||''));
  const show=compact?images.slice(0,6):images;
  return `<section class="photo-section"><div class="section-heading"><div><p class="eyebrow">THE ORIGINAL PHOTO COLLECTION</p><h2>${compact?'A closer <em>look.</em>':'Tuscany through <em>our lens.</em>'}</h2></div><span class="photo-count">${images.length} photographs</span></div><div class="${compact?'detail-gallery':'masonry'}">${show.map((img,i)=>`<button class="gallery-photo" data-gallery-index="${i}" aria-label="View photograph ${i+1} of ${esc(page.title)}"><img src="${esc(imageSrc(img))}" alt="${esc(img.alt||page.title)}" loading="lazy" decoding="async">${compact&&i===show.length-1&&images.length>show.length?`<span class="gallery-more">View all ${images.length} photos ${arrow}</span>`:''}</button>`).join('')}</div><script type="application/json" id="gallery-data">${JSON.stringify(images.map(i=>({src:imageSrc(i),alt:i.alt||page.title}))).replace(/</g,'\\u003c')}</script></section>`;
}
function videos(page) {
  return page.videos?.length?`<section class="photo-section film-section"><div class="section-heading"><div><p class="eyebrow">TUSCANY IN MOTION</p><h2>A feeling. <em>A place. A film.</em></h2><p class="section-intro">Real moments from our original collection. Hover for a quiet preview; choose “Watch film” to listen.</p></div><span class="photo-count">${page.videos.length} films</span></div><div class="video-grid">${page.videos.map((v,i)=>{
    const url=v.local||v.url||v.src;
    const title=v.title||(page.path==='/videos'?`Tuscany — Film ${String(i+1).padStart(2,'0')}`:`${page.path==='/'?'A glimpse of Tuscany':page.title} — Film ${i+1}`);
    if(v.type==='mp4'||/\.mp4(\?|$)/.test(url)) return `<figure class="film-card" data-video-preview><div class="film-stage"><video controls playsinline preload="none" poster="${esc(v.poster||pageImage(page))}" aria-label="${esc(title)}"><source src="${esc(url)}" type="video/mp4"></video><img class="film-poster" src="${esc(v.poster||pageImage(page))}" alt="" loading="lazy" aria-hidden="true"><span class="film-hint" aria-hidden="true">Hover to preview · Sound off</span></div><figcaption><div><span class="eyebrow">${String(i+1).padStart(2,'0')} / ORIGINAL FILM</span><h3>${esc(title)}</h3></div><button type="button" class="film-action" aria-label="Watch ${esc(title)} with sound">Watch film <span aria-hidden="true">▶</span></button></figcaption></figure>`;
    return `<div class="embed-placeholder"><p>${esc(title)}</p><button class="button" data-embed="${esc(url)}" data-embed-title="${esc(title)}">Load video ${arrow}</button><small>This loads content from the video provider.</small></div>`;
  }).join('')}</div></section>`:'';
}

function villaOverview(page){
 const f=page.facts||{};
 const facts=[['guests',f.sleeps,'Guests'],['bed',f.bedrooms,'Bedrooms'],['bath',f.bathrooms,'Bathrooms'],['area',f.area&&f.area!=='x'?f.area:null,'Property size']].filter(x=>x[1]);
 const rosadi=page.path.includes('palazzo-rosadi');
 const imported=(page.sections||[]).map(section=>section.text||section.html?.replace(/<[^>]+>/g,' ')||'').find(t=>/\bSleeps\s*[:\-]?\s*\d+\b/i.test(t)&&/\bBath\s*[:\-]?\s*\d+\b/i.test(t))||'';
 const extracted=imported.replace(/\s+/g,' ').replace(/^.*?\bFrom\s*€?\s*[\d,.]+\s*/i,'').split(/\b(?:Bed|Bedrooms)\s*[:\-]?\s*\d+\b/i)[0].trim();
 const intro=rosadi?'Discover an exclusive retreat between Tuscany and Umbria, near Cortona and Arezzo. Palazzo Rosadi offers generous living spaces, a private swimming pool and an outdoor Jacuzzi in the beauty of the Italian countryside.':extracted.length>55&&extracted.length<900?extracted:'Discover an exceptional private villa in Tuscany. Enjoy the freedom to slow down, explore the countryside and create a stay that feels entirely your own.';
 return '<section class="villa-overview" aria-label="Property highlights"><p class="eyebrow">A PRIVATE TUSCAN RETREAT</p><h2>Stay somewhere <em>extraordinary.</em></h2><p class="villa-overview-location">'+villaIcon('location')+esc(f.location||'Tuscany, Italy')+'</p><div class="villa-fact-grid">'+facts.map(([icon,value,label])=>'<div class="villa-fact"><span class="villa-fact-icon">'+villaIcon(icon)+'</span><div><strong>'+esc(value)+'</strong><small>'+label+'</small></div></div>').join('')+'</div><p class="villa-overview-copy">'+intro+'</p>'+(rosadi?'<div class="villa-feature-pills"><span>≈ &nbsp; Private swimming pool</span><span>✦ &nbsp; Outdoor Jacuzzi</span></div>':'')+'</section>';
}
function discoveryAside(isCity,page){
 const links=isCity?cities.filter(n=>n.toLowerCase()!==page.path.split('/').at(-1)).map(n=>[n,'/destinations/'+n.toLowerCase()]):[['Our villas',paths.villas],['Indoor experiences','/indoors'],['Outdoor experiences','/outdoors'],['Curated packages',paths.packages],['Tuscany with children',paths.children]];
 return '<aside class="explore-aside explore-aside-premium"><div class="explore-title"><span aria-hidden="true">✧</span><div><p class="eyebrow">DISCOVER MORE</p><h3>Explore Tuscany</h3></div></div><a class="explore-main-cta" href="/destinations">Browse destinations <span aria-hidden="true">↗</span></a><nav class="explore-tiles" aria-label="Discover more">'+links.map(([name,path])=>'<a href="'+esc(path)+'"><span aria-hidden="true">⌖</span><span>'+esc(name)+'</span><span aria-hidden="true">↗</span></a>').join('')+'</nav><div class="explore-help"><p class="eyebrow">WE’RE HERE TO HELP</p><h3>Plan your stay</h3><p>Questions? Our local team is here to help.</p><a href="mailto:info@supertuscany.org">✉ &nbsp; Email our team</a><a href="tel:+19177243124">☎ &nbsp; Call us</a></div></aside>';
}

function villaContent(page,data) {
  const f=page.facts||{};
  return `<div class="villa-title section"><a class="breadcrumb" href="${paths.villas}">← THE VILLA COLLECTION</a><p class="eyebrow">${esc(f.location||'TUSCANY, ITALY')}</p><h1>${esc(page.title)}</h1>${villaMeta(page)}</div><div class="villa-cover">${picture(page,'',0,true)}<button class="button button-light" data-gallery-index="0">View all photographs ${arrow}</button></div><div class="section villa-layout"><article class="villa-body">${villaOverview(page)}${sectionBody(page,{villa:true})}${page.calendar?`<section class="content-section"><p class="eyebrow">PLAN YOUR STAY</p><h2>Availability <em>calendar.</em></h2><p>The original Google Calendar is available below. Please contact us to confirm availability before making travel arrangements.</p><div class="embed-placeholder"><button class="button" data-embed="${esc(page.calendar)}" data-embed-title="${esc(page.title)} availability calendar">View the calendar ${arrow}</button><small>Loading the calendar connects to Google.</small></div></section>`:''}</article><aside class="booking-aside"><p class="eyebrow">LET’S MAKE IT YOURS</p><h2>Your stay at<br><em>${esc(page.title)}</em></h2><p>Share your dates and we’ll confirm availability and prepare a personal quote.</p><button class="button" data-inquiry="booking" data-property="${esc(page.title)}">Request availability ${arrow}</button><div class="aside-line"></div><p>Questions before you book?</p><button class="text-link" data-inquiry="general" data-property="${esc(page.title)}">Speak with our team ${arrow}</button><a class="aside-contact" href="tel:+19177243124">+1 917 724 3124</a><small>A request does not confirm a reservation.</small><div class="villa-nearby"><p class="eyebrow">DISCOVER MORE</p><h3>Explore Tuscany</h3><a class="explore-main-cta" href="/destinations">Browse destinations <span aria-hidden="true">↗</span></a><div class="villa-nearby-links"><a href="/destinations/firenze"><span>⌖</span>Firenze <span aria-hidden="true">↗</span></a><a href="/destinations/siena"><span>⌖</span>Siena <span aria-hidden="true">↗</span></a><a href="/destinations/lucca"><span>⌖</span>Lucca <span aria-hidden="true">↗</span></a><a href="/destinations/pisa"><span>⌖</span>Pisa <span aria-hidden="true">↗</span></a><a href="/destinations/grosseto"><span>⌖</span>Grosseto <span aria-hidden="true">↗</span></a><a href="/destinations/pistoia"><span>⌖</span>Pistoia <span aria-hidden="true">↗</span></a></div></div></aside></div><div class="section">${gallery(page,true)}${videos(page)}</div><section class="section related">${heading('MORE PLACES TO CALL HOME','Explore the <em>collection.</em>')}<div class="card-grid">${data.villas.filter(p=>p.path!==page.path).slice(0,3).map(p=>card(p,'villa')).join('')}</div></section>`;
}
function listingContent(page,data,type) {
  if(type==='villa'||type==='experience') return `${subHero(page,type==='villa'?'PRIVATE HOMES. YOUR OWN TUSCANY.':'LOCAL PEOPLE. EXTRAORDINARY DAYS.')}${homeSearch(data,{esc,card,arrow,mode:type==='villa'?'villa':'experience',category:page.path==='/indoors'?'indoors':page.path==='/outdoors'?'outdoors':''})}${type==='villa'?'':`<section class="section original-intro">${sectionBody(page)}</section><div class="section">${gallery(page,true)}${videos(page)}</div>`}${journeyCTA()}`;

  const items=type==='villa'?data.villas:type==='city'?data.cityPages:type==='family'?data.families:type==='package'?data.packages:page.path==='/indoors'?indoors.map(([n,path])=>data.get(path)).filter(Boolean):page.path==='/outdoors'?outdoors.map(([n,path])=>data.get(path)).filter(Boolean):data.experiences;
  return `${subHero(page,type==='villa'?'BEAUTIFUL HOMES. PERSONAL SERVICE.':type==='family'?'FOR EVERY MEMBER OF THE FAMILY':'DISCOVER A MORE PERSONAL TUSCANY')}<section class="section listing-section">${heading(type==='villa'?'THE COMPLETE COLLECTION':'EXPLORE WITH US',type==='villa'?'Your own place<br>in <em>Tuscany.</em>':type==='city'?'Seven cities.<br><em>Endless discoveries.</em>':type==='package'?'Your days,<br><em>beautifully considered.</em>':'Find your next<br><em>unforgettable moment.</em>')}${type==='villa'?`<div class="filters"><label>SEARCH THE COLLECTION<input id="villa-search" type="search" placeholder="Villa name or destination"></label><label>DESTINATION<select id="villa-destination"><option value="">All of Tuscany</option>${cities.map(n=>`<option>${n}</option>`).join('')}</select></label><div class="filter-count" aria-live="polite"><span id="result-count">${items.length}</span> private villas</div></div>`:''}<div class="card-grid ${type==='villa'?'villas-grid':''}" id="collection-grid">${items.map(p=>card(p,type)).join('')}</div><p id="no-results" class="no-results" hidden>No villas match your search. Try another name or destination.</p></section>${type==='villa'?'':`<section class="section original-intro">${sectionBody(page)}</section><div class="section">${gallery(page,true)}${videos(page)}</div>`}${journeyCTA()}`;
}
function generalContent(page,data) {
  const legal=['/privacy-policy','/cookie-policy','/accessibility-statement'].includes(page.path);
  const isGallery=page.path===paths.gallery;
  const isVideo=page.path===paths.videos;
  const isCity=page.path.startsWith('/destinations/');
  return `${legal?`<div class="section legal-title"><p class="eyebrow">SUPER TUSCANY</p><h1>${esc(page.title)}</h1></div>`:subHero(page,isCity?'ART. HISTORY. A SENSE OF PLACE.':page.path===paths.about?'PASSION. HONESTY. PROFESSIONALISM. TRUST.':page.path===paths.owners?'FOR VILLA OWNERS':'THE ART OF EXPERIENCING TUSCANY')}<section class="section general-layout"><article class="general-body">${isVideo?'':sectionBody(page)}${isGallery?'':videos(page)}${legal||isGallery||isVideo?'':`<div class="inline-inquiry"><p class="eyebrow">MAKE IT PERSONAL</p><h2>${page.path===paths.owners?'Let’s talk about <em>your villa.</em>':'Tell us what <em>you have in mind.</em>'}</h2><p>${page.path===paths.owners?'Contact our team to discuss your property.':'Our team will help you find the right experience and answer your questions.'}</p><button class="button" data-inquiry="general" data-topic="${esc(page.title)}">${page.path===paths.owners?'Contact our team':'Ask for information'} ${arrow}</button></div>`}</article>${!legal&&!isGallery&&!isVideo?`${discoveryAside(isCity,page)}`:''}</section>${!legal?`<div class="section">${gallery(page,!isGallery)}</div>`:''}${isCity?`<section class="section">${heading('STAY A LITTLE LONGER','A home in <em>the countryside.</em>')}<div class="card-grid">${data.villas.filter(p=>String(p.facts?.location||'').toLowerCase().includes(page.title.toLowerCase())).map(p=>card(p,'villa')).join('')||data.villas.slice(0,3).map(p=>card(p,'villa')).join('')}</div></section>`:''}${legal?'':journeyCTA()}`;
}
export function footer(data) {
  return `<footer class="footer"><div class="footer-top"><a href="/" class="footer-brand"><img src="${esc(data.logo||'')}" width="100" height="100" alt="Super Tuscany logo"><span>Your dream vacation.<br><em>Our Tuscany.</em></span></a><div class="footer-contact"><p class="eyebrow">LET’S START A CONVERSATION</p><a href="mailto:info@supertuscany.org">info@supertuscany.org ${arrow}</a><a href="tel:+19177243124">+1 917 724 3124</a><span>Christian Ferrara · Super Tuscany</span></div></div><div class="footer-grid"><div><p class="eyebrow">STAY</p>${menuList([['Our villa collection',paths.villas],['Destinations',paths.cities],['Plan your stay',paths.villas],['For villa owners',paths.owners]])}</div><div><p class="eyebrow">EXPERIENCE</p>${menuList([['All experiences',paths.experiences],['Indoors','/indoors'],['Outdoors','/outdoors'],['Curated packages',paths.packages],['Tuscany with children',paths.children]])}</div><div><p class="eyebrow">DISCOVER</p>${menuList([['About Super Tuscany',paths.about],['Why Super Tuscany','/why-supertuscany'],['Photo gallery',paths.gallery],['Videos',paths.videos],['Frequently asked questions','/faq']])}</div><div><p class="eyebrow">KEEP IN TOUCH</p><button class="text-link" data-inquiry="general">Contact our team ${arrow}</button>${(data.socials||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ${arrow}</a>`).join('')}<p class="footer-note">Italian hospitality.<br>Thoughtfully personal.</p></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Super Tuscany</span><div><a href="/privacy-policy">Privacy</a><a href="/cookie-policy">Cookies</a><a href="/accessibility-statement">Accessibility</a><button data-consent-settings>External media preferences</button></div><span>MADE FOR UNFORGETTABLE DAYS</span></div></footer>`;
}
export function forms(data) {
  const villas=data.villas.map(p=>`<option>${esc(p.title)}</option>`).join('');
  function form(type) {
    const booking=type==='booking';
    return `<form name="${booking?'stay-request':'information-request'}" method="POST" action="/thank-you" data-netlify="true" netlify-honeypot="company-website" class="inquiry-form" data-form-kind="${type}"><input type="hidden" name="form-name" value="${booking?'stay-request':'information-request'}"><input type="hidden" name="source-page" value=""><p class="honeypot"><label>Leave this field empty<input name="company-website" tabindex="-1" autocomplete="off"></label></p><div class="form-row"><label>First name <span>*</span><input name="first-name" autocomplete="given-name" required maxlength="100"></label><label>Last name <span>*</span><input name="last-name" autocomplete="family-name" required maxlength="100"></label></div><div class="form-row"><label>Email <span>*</span><input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Phone <span class="optional">optional</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label></div>${booking?`<label>Your preferred villa<select name="villa"><option value="">Help me choose a villa</option>${villas}</select></label><div class="form-row"><label>Arrival <span>*</span><input name="arrival" type="date" required></label><label>Departure <span>*</span><input name="departure" type="date" required></label></div><div class="form-row"><label>Adults <span>*</span><input name="adults" type="number" min="1" max="100" value="2" required></label><label>Children<input name="children" type="number" min="0" max="100" value="0"></label></div>`:`<label>What would you like to know?<input name="topic" placeholder="An experience, a villa, or a general question" maxlength="200"></label>`}<label>${booking?'Tell us about your ideal stay':'Your message'} ${booking?'':'<span>*</span>'}<textarea name="message" rows="4" maxlength="6000" ${booking?'':'required'} placeholder="${booking?'What would make your time in Tuscany special?':'How can we help?'}"></textarea></label><label class="consent"><input name="privacy-consent" type="checkbox" value="accepted" required><span>I have read the <a href="/privacy-policy" target="_blank">privacy notice</a> and agree to the processing of my information to respond to this request.</span></label><p class="form-status" role="status" aria-live="polite"></p><button class="button" type="submit">${booking?'Request availability':'Send your enquiry'} ${arrow}</button><small class="form-note">${booking?'This is an availability request. Your reservation is confirmed only after our team contacts you.':'We use your information to respond to your enquiry.'}</small></form>`;
  }
  return `<dialog id="inquiry-dialog" class="inquiry-dialog" aria-labelledby="inquiry-title" aria-describedby="inquiry-subtitle"><button class="dialog-close" data-close-dialog aria-label="Close enquiry">×</button><div class="inquiry-header"><p class="eyebrow">PERSONAL SERVICE, FROM THE FIRST HELLO</p><h2 id="inquiry-title">Let’s plan your <em>Tuscany.</em></h2><p id="inquiry-subtitle">Tell us your dates. We’ll take care of the details.</p></div><div class="inquiry-tabs" role="tablist" aria-label="Enquiry type"><button role="tab" id="booking-tab" aria-controls="booking-panel" aria-selected="true" data-form-tab="booking">Plan a stay</button><button role="tab" id="general-tab" aria-controls="general-panel" aria-selected="false" data-form-tab="general">Ask a question</button></div><div id="booking-panel" role="tabpanel" aria-labelledby="booking-tab">${form('booking')}</div><div id="general-panel" role="tabpanel" aria-labelledby="general-tab" hidden>${form('general')}</div></dialog><dialog id="photo-dialog" class="photo-dialog" aria-label="Photo gallery"><button class="photo-close" aria-label="Close photo gallery">×</button><button class="photo-prev" aria-label="Previous photograph">←</button><figure><img id="lightbox-image" src="" alt=""><figcaption id="lightbox-caption"></figcaption></figure><button class="photo-next" aria-label="Next photograph">→</button><span id="lightbox-count" aria-live="polite"></span></dialog><dialog id="consent-dialog" class="consent-dialog"><button class="dialog-close" data-close-consent aria-label="Close media preferences">×</button><p class="eyebrow">YOUR PRIVACY</p><h2>External <em>media.</em></h2><p>Google calendars and third-party videos load only when you select “Load” or “View”. This may share your IP address with the provider. Original photos and locally hosted videos do not require external embeds.</p><button class="button" data-reset-embeds>Unload external media</button><a class="text-link" href="/cookie-policy">Read the cookie notice ${arrow}</a></dialog>`;
}
export function render(page,pages,source={}) {
  const data={...collections(pages),logo:source.logo?imageSrc(source.logo):'',socials:source.socials||[]};
  if(!data.logo) {const home=data.get('/'); const logo=home?.images.find(i=>/logo/i.test(i.alt||'')); data.logo=logo?imageSrc(logo):'/assets/original/logo.png';}
  let body;
  if(page.path==='/') body=cinematicHome(page,data,{esc,picture,card,arrow,paths,homeSearch,villaIcon,journeyCTA});
  else if(page.path.startsWith('/properties/')) body=villaContent(page,data);
  else if(page.path===paths.villas) body=listingContent(page,data,'villa');
  else if(page.path===paths.cities) body=listingContent(page,data,'city');
  else if([paths.experiences,'/indoors','/outdoors'].includes(page.path)) body=listingContent(page,data,'experience');
  else if(page.path===paths.children) body=listingContent(page,data,'family');
  else if(page.path===paths.packages) body=listingContent(page,data,'package');
  else if(page.path===paths.about) body=aboutContent(page,{esc,imageSrc,gallery,journeyCTA});
  else if(page.path==='/contact') body=`<section class="section contact-page"><p class="eyebrow">LET’S START WITH A CONVERSATION</p><h1>Your dream vacation<br><em>starts here.</em></h1><p>Find the right home, discover a local experience or ask us a question.</p><div class="button-row"><button class="button" data-inquiry="booking">Plan your stay ${arrow}</button><button class="button button-outline" data-inquiry="general">Ask a question ${arrow}</button></div><a href="mailto:info@supertuscany.org">info@supertuscany.org</a><a href="tel:+19177243124">+1 917 724 3124</a></section>`;
  else if(page.path==='/thank-you') body=`<section class="section thank-you"><p class="eyebrow">THANK YOU FOR GETTING IN TOUCH</p><h1>Your Tuscany<br><em>is one step closer.</em></h1><p>We’ve received your enquiry. Our team will contact you using the details you provided.</p><p>For a stay request, availability and the reservation still need to be confirmed by our team.</p><a class="button" href="/">Back to Super Tuscany ${arrow}</a></section>`;
  else if(page.path==='/404') body=`<section class="section thank-you"><p class="eyebrow">A LITTLE DETOUR</p><h1>Let’s get you<br><em>back to Tuscany.</em></h1><p>This page could not be found.</p><a class="button" href="/">Return home ${arrow}</a></section>`;
  else body=generalContent(page,data);
  const title=page.path==='/'?'Super Tuscany | Private Villas & Authentic Italian Experiences':`${page.title} | Super Tuscany`;
  const desc=page.description || (page.path.startsWith('/properties/')?`Discover ${page.title}, a private villa in Tuscany. Explore original photos, amenities and accommodation details. Contact Super Tuscany for availability.`:`Discover ${page.title} with Super Tuscany. Private villas, authentic local experiences and personal service for your dream vacation in Italy.`);
  const schema={'@context':'https://schema.org','@type':'TravelAgency',name:'Super Tuscany',url:'https://www.supertuscany.org',email:'info@supertuscany.org',telephone:'+1-917-724-3124',founder:{'@type':'Person',name:'Christian Ferrara'}};
  const conciergeHead=`<link rel="stylesheet" href="/assets/fonts/fonts.css?v=${esc(source.assetVersion?.['fonts/fonts.css']||'1')}"><link rel="stylesheet" href="/assets/story-concierge.css?v=${esc(source.assetVersion?.['story-concierge.css']||'1')}"><link rel="stylesheet" href="/assets/luxury.css?v=${esc(source.assetVersion?.['luxury.css']||'1')}"><script type="module" src="/assets/concierge.js?v=${esc(source.assetVersion?.['concierge.js']||'1')}&amp;engine=${esc(source.assetVersion?.['concierge-engine.js']||'1')}&amp;data=${esc(source.assetVersion?.['concierge-data.json']||'1')}"></script>`;
  const mapHead=page.path===paths.villas?`<link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css"><link rel="stylesheet" href="/assets/villa-map.css?v=${esc(source.assetVersion?.['villa-map.css']||'1')}"><script src="/assets/vendor/leaflet/leaflet.js" defer></script><script src="/assets/villa-map.js?v=${esc(source.assetVersion?.['villa-map.js']||'1')}" defer></script>`:'';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#ffffff"><link rel="icon" href="${esc(data.logo)}"><link rel="canonical" href="https://www.supertuscany.org${esc(page.path==='/'?'':page.path)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">${pageImage(page)?`<meta property="og:image" content="${esc(pageImage(page))}">`:''}<link rel="stylesheet" href="/assets/site.css?v=${esc(source.assetVersion?.['site.css']||'1')}"><link rel="stylesheet" href="/assets/experience.css?v=${esc(source.assetVersion?.['experience.css']||'1')}"><script type="application/ld+json">${JSON.stringify(schema)}</script><script src="/assets/app.js?v=${esc(source.assetVersion?.['app.js']||'1')}" defer></script>${conciergeHead}<link rel="stylesheet" href="/assets/cinematic.css?v=${esc(source.assetVersion?.['cinematic.css']||'1')}">${mapHead}</head><body data-page="${esc(page.path)}">${header(data)}<main id="main">${body}</main>${footer(data)}${forms(data)}${conciergeWidget()}<div class="cursor-glow" aria-hidden="true"></div></body></html>`;
}
