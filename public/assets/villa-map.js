(() => {
  'use strict';
  const finder=document.querySelector('.stay-finder[data-search-mode="villa"]');
  if(!finder)return;
  const canvas=document.getElementById('villa-map'),status=document.getElementById('villa-map-status');
  const aside=canvas.closest('.villa-map-aside'),buttons=[...finder.querySelectorAll('[data-villa-view]')];
  const items=JSON.parse(document.getElementById('home-search-data').textContent);
  const desktop=matchMedia('(min-width: 1051px)');
  let map,layer,tileFailed=false,markers=new Map();
  let state=finder.villaResults||{indices:items.flatMap((item,i)=>item.type==='villa'?[i]:[])};
  finder.dataset.mapView='list';
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
  function setView(view){
    finder.dataset.mapView=view;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.villaView===view)));
    if(view==='map')requestAnimationFrame(ensureMap);
  }
  buttons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.villaView)));
  function popup(indices){
    const content=node('div',null,'villa-map-popup');
    content.append(node('p','APPROXIMATE AREA · '+(items[indices[0]].city||'Tuscany'),'villa-popup-area'));
    indices.forEach(index=>{
      const item=items[index],entry=node('article',null,'villa-popup-entry');
      const link=node('a',null,'villa-popup-photo');link.href=item.path;
      if(item.image){const image=node('img');image.src=item.image;image.alt=item.title;image.loading='lazy';link.append(image);}
      const copy=node('div'),title=node('a',item.title,'villa-popup-title');title.href=item.path;
      copy.append(title,node('p',`${item.sleeps} guests · ${item.bedrooms} bedrooms`));
      const actions=node('div',null,'villa-popup-actions');
      const reveal=node('button','Show in list');reveal.type='button';
      reveal.addEventListener('click',()=>{setView('list');finder.dispatchEvent(new CustomEvent('villa:reveal',{detail:{index}}));});
      const enquire=node('button','Request this villa');enquire.type='button';
      enquire.addEventListener('click',()=>finder.querySelector(`[data-home-result="${index}"] [data-search-enquiry]`)?.click());
      actions.append(reveal,enquire);copy.append(actions);entry.append(link,copy);content.append(entry);
    });
    content.append(node('p','Availability and rates are confirmed personally by our team.','villa-popup-note'));
    return content;
  }
  function draw(){
    if(!map)return;
    layer.clearLayers();markers=new Map();
    const groups=new Map();
    state.indices.forEach(index=>{
      const item=items[index];if(item.type!=='villa'||!Array.isArray(item.coordinates))return;
      const key=item.coordinates.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);
    });
    const points=[];let located=0;
    groups.forEach(indices=>{
      const item=items[indices[0]],label=indices.length>1?`${indices.length} villas`:`${item.sleeps} guests`;
      located+=indices.length;points.push(item.coordinates);
      const icon=L.divIcon({className:'villa-pin',html:`<span>${label}</span>`,iconSize:[88,36],iconAnchor:[44,18],popupAnchor:[0,-20]});
      const marker=L.marker(item.coordinates,{icon,title:indices.map(i=>items[i].title).join(' · '),alt:`${label}, approximate ${item.city||'Tuscany'} area`,keyboard:true}).bindPopup(popup(indices),{maxWidth:340,minWidth:280,maxHeight:350}).addTo(layer);
      marker.getElement()?.setAttribute('aria-label',`${indices.map(i=>items[i].title).join(', ')}. Approximate ${item.city||'Tuscany'} area. Open villa details.`);
      indices.forEach(index=>markers.set(index,marker));
    });
    if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[55,55],maxZoom:10,animate:false});
    else map.setView([43.45,11.3],8,{animate:false});
    const total=state.indices.length;
    status.textContent=tileFailed?'Map imagery is temporarily unavailable. You can still explore the villa markers or use the list.':total?`${located} of ${total} matching villas mapped${total-located?` · ${total-located} without published coordinates`:''}.`:'No villas match these filters. Try fewer filters to see more locations.';
  }
  function ensureMap(){
    if(!desktop.matches&&finder.dataset.mapView!=='map')return;
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height||rect.top>innerHeight||rect.bottom<0)return;
    if(!window.L){status.textContent='The map could not load. Please use the villa list or open the Tuscany map above.';return;}
    if(map){map.invalidateSize({pan:false});return;}
    map=L.map(canvas,{scrollWheelZoom:false,maxZoom:14}).setView([43.45,11.3],8);
    layer=L.layerGroup().addTo(map);
    const tiles=L.tileLayer(canvas.dataset.tileUrl,{maxZoom:14,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    tiles.on('tileerror',()=>{tileFailed=true;status.textContent='Map imagery is temporarily unavailable. You can still explore the villa markers or use the list.';});
    draw();
  }
  finder.addEventListener('villa:results',event=>{state=event.detail;draw();});
  finder.querySelectorAll('[data-home-result]').forEach(row=>{
    const highlight=active=>markers.get(Number(row.dataset.homeResult))?.getElement()?.classList.toggle('is-highlighted',active);
    row.addEventListener('mouseenter',()=>highlight(true));row.addEventListener('mouseleave',()=>highlight(false));
    row.addEventListener('focusin',()=>highlight(true));row.addEventListener('focusout',()=>highlight(false));
  });
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))ensureMap();},{threshold:0}).observe(aside);
  else window.addEventListener('scroll',ensureMap,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(()=>{if(map)map.invalidateSize({pan:false});else ensureMap();}).observe(canvas);
  desktop.addEventListener('change',ensureMap);
  ensureMap();
})();
