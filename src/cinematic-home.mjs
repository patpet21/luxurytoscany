import {villaShowcase} from './villa-showcase.mjs';
export function cinematicHome(page,data,ui) {
  const {esc,picture,card,arrow,paths,homeSearch,villaIcon,journeyCTA}=ui;
  const lead=data.villas.find(v=>/palazzo rosadi/i.test(v.title))||data.villas[0]||page;
  const homeVideo=(page.videos||[]).find(v=>v.type==='mp4'||/\.mp4(\?|$)/.test(v.local||v.url||''));
  const country=data.villas.find(v=>v.path!==lead.path && v.images?.length>1)||data.villas[1]||lead;
  const experience=data.get('/wine-tasting')||data.get('/cooking-classes')||data.experiences[0]||page;
  const about=data.get('/about')||page;
  const destinations=data.cityPages.filter(p=>p.images?.length).slice(0,3);
  const backdrop=page.images?.length?page:country;
  const highlights=[
    {icon:'pool',title:'Exceptional Villas',text:'Private homes, personally selected for memorable stays.'},
    {icon:'star',title:'Tailor-made Experiences',text:'Cuisine, wine, culture and days designed around you.'},
    {icon:'support',title:'Personal Service',text:'Local knowledge and thoughtful guidance at every step.'}
  ];
  return `
  <section class="hero hero-home cinema-hero cinema-hero--video" aria-label="Discover private villas in Tuscany">
    ${homeVideo?`<video id="home-hero-video" class="hero-media" muted loop playsinline preload="metadata"${homeVideo.poster?` poster="${esc(homeVideo.poster)}"`:''} aria-hidden="true"><source src="${esc(homeVideo.local||homeVideo.url)}" type="video/mp4"></video><button class="video-control" type="button" aria-label="Play background video" aria-controls="home-hero-video" data-video-toggle hidden>▶</button>`:picture(lead,'hero-media',0,true)}
    <div class="hero-shade"></div>
    <div class="hero-copy">
      <p class="eyebrow">PRIVATE VILLAS IN TUSCANY</p>
      <h1>Live the<br><em>Extraordinary.</em></h1>
      <p>Exclusive villas. Bespoke experiences.<br>Tuscany, entirely yours.</p>
      <a class="cinema-hero-cta" href="${esc(paths.villas)}"><span class="circle" aria-hidden="true">→</span> Explore our villas</a>
    </div>
    <div class="cinema-hero-side" aria-hidden="true">01<span></span>ST</div>
    <div class="hero-foot"><span>THE ART OF STAYING SOMEWHERE SPECIAL</span><a href="#cinema-discover">SCROLL TO DISCOVER ↓</a><span>SUPER TUSCANY · ITALY</span></div>
  </section>
  <section class="cinema-search cinema-search--intro" aria-labelledby="search-heading">
    ${homeSearch(data,{esc,card,arrow})}
  </section>
  <section class="cinema-promises" id="cinema-discover" aria-label="The Super Tuscany difference">
    ${highlights.map(item=>`<article class="cinema-promise">${villaIcon(item.icon)}<h2>${esc(item.title)}</h2><p>${esc(item.text)}</p></article>`).join('')}
  </section>
  <section class="cinema-editorial" aria-labelledby="cinema-editorial-title">
    <div class="cinema-editorial-photo">${picture(country,'',0)}</div>
    <div class="cinema-editorial-copy"><p class="eyebrow">AUTHENTIC TUSCANY</p>
      <h2 id="cinema-editorial-title">An Italy worth<br>slowing down for.</h2>
      <p>Quiet hills. Remarkable homes. Traditions passed between generations. Discover Tuscany through the people who know it best, with a stay shaped around what matters to you.</p>
      <a class="text-link" href="${esc(paths.about)}">Our story ${arrow}</a>
    </div>
  </section>
  ${villaShowcase(data.villas,{esc,picture,paths})}
  <section class="cinema-experience" aria-labelledby="cinema-experience-title">
    <div class="cinema-experience-copy"><p class="eyebrow">EXPERIENCES</p>
      <h2 id="cinema-experience-title">Taste. Explore.<br>Live Tuscany.</h2>
      <p>From a table set among the vines to a local cooking lesson, discover genuine experiences thoughtfully arranged for your stay.</p>
      <a class="text-link" href="${esc(paths.experiences)}">Discover experiences ${arrow}</a>
    </div>
    <div class="cinema-experience-photo">${picture(experience,'',0)}</div>
  </section>
  ${destinations.length?`<section class="cinema-destinations" aria-labelledby="cinema-destinations-title">
    <div><div><p class="eyebrow">DISCOVER THE REGION</p><h2 id="cinema-destinations-title">A sense of place.</h2></div>
      <a class="text-link" href="${esc(paths.cities)}">All destinations ${arrow}</a></div>
    <div class="cinema-destination-grid">${destinations.map(p=>`<a class="cinema-destination" href="${esc(p.path)}">${picture(p)}<span>TUSCANY, ITALY</span><h3>${esc(p.title)}</h3></a>`).join('')}</div>
  </section>`:''}
  <section class="cinema-about" aria-labelledby="cinema-about-title">
    <div class="cinema-about-copy"><p class="eyebrow">THE SUPER TUSCANY WAY</p>
      <h2 id="cinema-about-title">Local hearts.<br>Extraordinary stays.</h2>
      <p>Super Tuscany was founded by Christian Ferrara to share authentic Italian hospitality, carefully chosen properties and the kind of guidance that makes every journey personal.</p>
      <a class="text-link" href="${esc(paths.about)}">Meet Super Tuscany ${arrow}</a>
    </div>
    <div class="cinema-about-photo">${picture(about,'',0)}</div>
  </section>
  <section class="cinema-last-word" aria-labelledby="cinema-final-title">
    ${picture(backdrop,'',0)}
    <p class="eyebrow">YOUR PRIVATE TUSCANY</p>
    <h2 id="cinema-final-title">A place to slow down.<br>A world to explore.</h2>
    <button class="button" type="button" data-inquiry="general">Begin your journey ${arrow}</button>
  </section>
  ${journeyCTA()}`;
}
