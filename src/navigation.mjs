export function navigation(data,{esc,arrow,paths,cities,indoors,outdoors,families,picture}){
  const icons=[
    '<path d="m3 11 9-8 9 8v9H3v-9Zm6 9v-7h6v7"/>',
    '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/>',
    '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    '<path d="M12 21s-9-5.5-9-12a5 5 0 0 1 9-2.8A5 5 0 0 1 21 9c0 6.5-9 12-9 12Z"/>'
  ];
  const navIcon=(i)=>'<svg class="nav-symbol-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">'+icons[i]+'</svg>';
  const link=([name,url])=>`<a class="nav-tile" data-nav-item href="${esc(url)}"><span class="nav-tile-dot" aria-hidden="true"></span><span class="nav-tile-name">${esc(name)}</span><span class="nav-tile-arrow" aria-hidden="true">↗</span></a>`;
  const group=(title,items)=>`<section class="nav-section" data-nav-section><h3>${esc(title)}</h3><div class="nav-link-list">${items.map(link).join('')}</div></section>`;
  const menus=[
    {name:'Villas',hint:'Stay somewhere special',image:data.villas[0],url:paths.villas,title:'A home.<br><em>Entirely yours.</em>',text:'Eleven private villas. One personal way to travel.',cta:'Explore the collection',cols:[['Find your stay',[['All private villas',paths.villas],['By destination',paths.cities],['Ask about availability','/contact?type=booking']]],['The villa collection',data.villas.slice(0,6).map(p=>[p.title,p.path])],['More beautiful homes',data.villas.slice(6).map(p=>[p.title,p.path])]]},
    {name:'Experiences',hint:'Live the local life',image:data.get('/wine-tasting'),url:paths.experiences,title:'Go beyond<br><em>the postcard.</em>',text:'People, traditions and moments you’ll bring home.',cta:'Find your experience',cols:[['At the table',[['All indoor experiences','/indoors'],...indoors]],['Into the landscape',[['All outdoor experiences','/outdoors'],...outdoors]],['A beautifully planned day',[['All experiences',paths.experiences],['Curated packages',paths.packages],...data.packages.map(p=>[p.title,p.path])]]]},
    {name:'Destinations',hint:'Find your corner of Tuscany',image:data.get('/destinations/firenze'),url:paths.cities,title:'Seven cities.<br><em>Countless stories.</em>',text:'From Renaissance streets to the quiet of the hills.',cta:'Discover Tuscany',cols:[['Art & history',cities.slice(0,4).map(n=>[n,`/destinations/${n.toLowerCase()}`])],['Your next discovery',cities.slice(4).map(n=>[n,`/destinations/${n.toLowerCase()}`])],['Through our lens',[['See Tuscany','/see-tuscany'],['The photo journal',paths.gallery],['Films of Tuscany',paths.videos]]]]},
    {name:'Families',hint:'Bring everyone along',image:data.get('/pizza-making-classes'),url:paths.children,title:'Small discoveries.<br><em>Big memories.</em>',text:'Days that make room for every member of your family.',cta:'Explore family days',cols:[['Discover together',[["All family experiences",paths.children],...families.slice(0,5)]],['Play & explore',families.slice(5,10)],['Little tastes of Italy',families.slice(10)]]},
    {name:'Our story',hint:'Meet your local team',image:data.get('/about'),url:paths.about,title:'From Tuscany,<br><em>with love.</em>',text:'Personal service from people who know it by heart.',cta:'Meet Super Tuscany',cols:[['The people behind your stay',[['About Super Tuscany',paths.about],['Our approach','/why-supertuscany']]],['Here to help',[['Frequently asked questions','/faq'],['Contact our team','/contact'],['For villa owners',paths.owners]]]]}
  ];
  const logo=typeof data.logo==='object'?data.logo.local:data.logo;
  return `<a class="skip-link" href="#main">Skip to content</a>
<div class="topbar"><span>PRIVATE HOMES · LOCAL PEOPLE · PERSONAL SERVICE</span><a href="mailto:info@supertuscany.org">info@supertuscany.org ${arrow}</a></div>
<header class="site-header">
<a href="/" class="brand" aria-label="Super Tuscany home"><img src="${esc(logo||'')}" alt="Super Tuscany — Your dream vacation" width="70" height="70"><span>SUPER TUSCANY<small>THE ART OF TRAVELLING WELL</small></span></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-label="Open menu" aria-controls="navigation"><span aria-hidden="true"></span><span aria-hidden="true"></span><span class="sr-only">Open menu</span></button>
<nav id="navigation" aria-label="Main navigation">${menus.map((m,i)=>{
  const total=m.cols.reduce((count,[,items])=>count+items.length,0);
  const searchable=total>=10;
  return `<details class="nav-group" data-nav-group>
    <summary><span class="nav-symbol">${navIcon(i)}</span><span class="nav-label"><span>${esc(m.name)}</span><small>${esc(m.hint)}</small></span><span class="chevron" aria-hidden="true">⌄</span></summary>
    <div class="mega" role="region" aria-label="${esc(m.name)} menu">
      <div class="mega-toolbar"><div class="mega-heading"><span class="eyebrow">EXPLORE SUPER TUSCANY</span><strong>${esc(m.name)}</strong></div><div class="mega-actions"><a class="mega-view-all" href="${esc(m.url)}">View all ${esc(m.name)} <span aria-hidden="true">↗</span></a><button class="mega-close" type="button" data-nav-close aria-label="Close ${esc(m.name)} menu">×</button></div></div>
      <div class="mega-inner"><a class="nav-feature" href="${esc(m.url)}"><div class="nav-feature-image">${picture(m.image)}<span>${arrow}</span></div><h2>${m.title}</h2><p>${esc(m.text)}</p><strong>${esc(m.cta)} ${arrow}</strong></a>
        <div class="nav-directory">
          ${searchable?`<div class="nav-filter"><label class="nav-search-field"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span class="sr-only">Search ${esc(m.name)} links</span><input type="search" data-nav-search autocomplete="off" placeholder="Search ${esc(m.name.toLowerCase())}..." aria-label="Search ${esc(m.name)} links"></label><span class="nav-filter-count" data-nav-count aria-live="polite">${total} options</span></div>`:''}
          <div class="nav-sections">${m.cols.map(([title,items])=>group(title,items)).join('')}</div>
          <p class="nav-no-results" data-nav-empty hidden role="status">No matching links. Try another search.</p>
        </div>
      </div>
      <div class="mega-bottom"><span>YOUR DREAM VACATION, PERSONALLY CURATED</span><a href="/contact">A little help planning? Speak with us ${arrow}</a></div>
    </div>
  </details>`;
}).join('')}<a class="button button-small nav-plan" href="/tuscany-villas-for-rent">Plan your stay ${arrow}</a></nav></header>`;
}
