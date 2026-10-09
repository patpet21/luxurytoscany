(() => {
  'use strict';
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
  const nav=$('#navigation'), toggle=$('.menu-toggle');
  toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);});
  $$('.nav-group').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)$$('.nav-group').filter(x=>x!==d).forEach(x=>x.open=false);}));
  document.addEventListener('click',e=>{if(!e.target.closest('.nav-group'))$$('.nav-group').forEach(x=>x.open=false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$$('.nav-group').forEach(x=>x.open=false);nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}});
  const inquiry=$('#inquiry-dialog');
  let previousFocus;
  function showDialog(dialog){previousFocus=document.activeElement;dialog.showModal();document.body.classList.add('modal-open');}
  function closeDialog(dialog){dialog.close();document.body.classList.remove('modal-open');previousFocus?.focus();}
  function chooseForm(kind) {
    const booking=kind==='booking';
    $('#booking-panel').hidden=!booking;$('#general-panel').hidden=booking;
    $$('#inquiry-dialog [data-form-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.formTab===kind));b.tabIndex=b.dataset.formTab===kind?0:-1;});
    $('#inquiry-title').innerHTML=booking?'Let’s plan your <em>Tuscany.</em>':'Let’s start a <em>conversation.</em>';
    $('#inquiry-subtitle').textContent=booking?'Share your dates. We’ll confirm availability and prepare a personal quote.':'A question about an experience, a villa or anything else? We’re here to help.';
  }
  $$('[data-inquiry]').forEach(b=>b.addEventListener('click',()=>{chooseForm(b.dataset.inquiry);if(b.dataset.property){const select=$('select[name="villa"]',inquiry);select.value=b.dataset.property;$('#general-panel input[name="topic"]').value=b.dataset.property;}if(b.dataset.topic)$('#general-panel input[name="topic"]').value=b.dataset.topic;showDialog(inquiry);nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}));
  document.addEventListener('concierge:inquiry',event=>{
    const detail=event.detail||{},kind=detail.kind==='booking'?'booking':'general';chooseForm(kind);
    const panel=$(kind==='booking'?'#booking-panel':'#general-panel');
    $('textarea[name="message"]',panel).value=String(detail.message||'').slice(0,6000);
    if(kind==='general')$('input[name="topic"]',panel).value=String(detail.topic||'Concierge enquiry').slice(0,200);
    else if(detail.adults){$('input[name="adults"]',panel).value=String(Math.max(1,Math.min(100,Number(detail.adults)||2)));$('input[name="children"]',panel).value=String(Math.max(0,Math.min(100,Number(detail.children)||0)));}
    showDialog(inquiry);
  });
  $$('[data-form-tab]').forEach(b=>{b.addEventListener('click',()=>chooseForm(b.dataset.formTab));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=b.dataset.formTab==='booking'?$('#general-tab'):$('#booking-tab');target.click();target.focus();}});});
  $('[data-close-dialog]')?.addEventListener('click',()=>closeDialog(inquiry));
  $$('dialog').forEach(d=>{d.addEventListener('cancel',()=>document.body.classList.remove('modal-open'));d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);});});
  const today=new Date();const dateISO=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const arrival=$('input[name="arrival"]'),departure=$('input[name="departure"]');
  if(arrival){arrival.min=dateISO;departure.min=dateISO;const validate=()=>{arrival.setCustomValidity(arrival.value&&arrival.value<dateISO?'Please choose today or a future date.':'');departure.setCustomValidity(arrival.value&&departure.value&&departure.value<=arrival.value?'Departure must be after arrival.':'');if(arrival.value){const next=new Date(`${arrival.value}T12:00:00`);next.setDate(next.getDate()+1);departure.min=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;}};arrival.addEventListener('input',validate);departure.addEventListener('input',validate);}
  $$('form[data-netlify]').forEach(form=>{form.elements['source-page'].value=location.pathname;form.addEventListener('submit',e=>{if(location.hostname==='127.0.0.1'||location.hostname==='localhost'){e.preventDefault();$('.form-status',form).textContent='Preview mode: this form will collect enquiries after deployment to Netlify with form detection enabled. Nothing has been sent.';}else if(!form.checkValidity()){e.preventDefault();form.reportValidity();}});});
  const photoDialog=$('#photo-dialog');let gallery=[],current=0;
  try {gallery=JSON.parse($('#gallery-data')?.textContent||'[]');}catch{}
  function displayPhoto(index){if(!gallery.length)return;current=(index+gallery.length)%gallery.length;$('#lightbox-image').src=gallery[current].src;$('#lightbox-image').alt=gallery[current].alt||'';$('#lightbox-caption').textContent=gallery[current].alt||'';$('#lightbox-count').textContent=`${current+1} / ${gallery.length}`;}
  $$('[data-gallery-index]').forEach(b=>b.addEventListener('click',()=>{if(!gallery.length)return;displayPhoto(Number(b.dataset.galleryIndex));showDialog(photoDialog);}));
  $('.photo-close')?.addEventListener('click',()=>closeDialog(photoDialog));$('.photo-prev')?.addEventListener('click',()=>displayPhoto(current-1));$('.photo-next')?.addEventListener('click',()=>displayPhoto(current+1));
  document.addEventListener('keydown',e=>{if(photoDialog?.open){if(e.key==='ArrowLeft')displayPhoto(current-1);if(e.key==='ArrowRight')displayPhoto(current+1);}});
  let startX=0;photoDialog?.addEventListener('touchstart',e=>{startX=e.changedTouches[0].screenX;},{passive:true});photoDialog?.addEventListener('touchend',e=>{const diff=e.changedTouches[0].screenX-startX;if(Math.abs(diff)>50)displayPhoto(current+(diff<0?1:-1));},{passive:true});
  const homeForm=$('#home-search-form');
  if(homeForm){
    const finder=homeForm.closest('.stay-finder');
    const items=JSON.parse($('#home-search-data').textContent),rows=$$('[data-home-result]');
    const results=$('#home-search-results'),city=$('#home-destination'),category=$('#home-category'),interest=$('#home-interest');
    const bedrooms=$('#home-bedrooms'),bathrooms=$('#home-bathrooms'),adults=$('#home-adults'),children=$('#home-children');
    const checkIn=$('#home-arrival'),checkOut=$('#home-departure'),guestPicker=$('#home-guests');
    let matches=[],limit=6,searched=finder.dataset.searchMode!=='home';
    const type=()=>homeForm.elements['search-type'].value;
    const groupSize=()=>Number(adults.value)+Number(children.value);
    const setToday=new Date();const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    checkIn.min=localDate(setToday);checkOut.min=localDate(setToday);
    function validateDates(){
      const active=type()==='villa';checkIn.disabled=!active;checkOut.disabled=!active;
      checkIn.setCustomValidity(active&&checkOut.value&&!checkIn.value?'Choose a check-in date, or clear both dates.':'');
      checkOut.setCustomValidity(active&&checkIn.value&&!checkOut.value?'Choose a check-out date, or clear both dates.':active&&checkIn.value&&checkOut.value<=checkIn.value?'Check-out must be after check-in.':'');
      if(checkIn.value){const next=new Date(`${checkIn.value}T12:00:00`);next.setDate(next.getDate()+1);checkOut.min=localDate(next);}else checkOut.min=checkIn.min;
    }
    function updateGuests(){
      const total=groupSize();$('#home-guests-label').textContent=total?`${total} ${total===1?'guest':'guests'}${Number(children.value)?' · '+children.value+' '+(Number(children.value)===1?'child':'children'):''}`:'Any group size';
      children.setCustomValidity(Number(children.value)>0&&Number(adults.value)===0?'Add at least one adult to your group.':'');
      $$('[data-guest-step]').forEach(b=>{const input=b.dataset.guestKind==='adults'?adults:children;b.disabled=Number(input.value)+(Number(b.dataset.guestStep))<Number(input.min)||Number(input.value)+(Number(b.dataset.guestStep))>Number(input.max);});
    }
    function showResults(){
      rows.forEach(row=>row.hidden=true);matches.slice(0,limit).forEach(i=>{rows[i].hidden=false;$('#home-results-grid').append(rows[i]);});
      const kind=type()==='villa'?(matches.length===1?'villa':'villas'):(matches.length===1?'experience':'experiences');$('#home-result-count').textContent=`${matches.length} ${kind}${type()==='villa'&&groupSize()?' for '+groupSize()+' guests':''}`;
      $('#home-search-empty').hidden=matches.length>0;$('#home-results-more').hidden=matches.length<=limit;
      if(finder.dataset.searchMode==='villa'){
        const visible=matches.slice(0,limit),selected=$$('input[name=amenity]:checked',homeForm).map(c=>c.value);
        const score=item=>(city.value&&item.city===city.value?20:0)+selected.filter(a=>item.amenities.includes(a)).length*4+(item.bedrooms>=Number(bedrooms.value)?2:0)+(item.bathrooms>=Number(bathrooms.value)?2:0);
        const alternatives=items.map((item,i)=>({item,i})).filter(({item,i})=>item.type==='villa'&&!visible.includes(i)&&item.sleeps>=groupSize()).sort((a,b)=>score(b.item)-score(a.item)||(groupSize()?a.item.sleeps-b.item.sleeps:a.i-b.i)).slice(0,3);
        $$('[data-villa-suggestion]').forEach(row=>row.hidden=true);
        alternatives.forEach(({i})=>{const row=$('[data-villa-suggestion="'+i+'"]');row.hidden=false;$('#villa-suggestions-grid').append(row);});
        $('#villa-suggestions').hidden=!alternatives.length;
        finder.villaResults={indices:[...matches],visible};
        finder.dispatchEvent(new CustomEvent('villa:results',{detail:finder.villaResults}));
      }
    }
    function findResults(){
      const selected=$$('input[name=amenity]:checked',homeForm).map(c=>c.value);
      matches=items.flatMap((item,i)=>{
        if(item.type!==type())return [];
        if(type()==='villa'&&((city.value&&item.city!==city.value)||item.sleeps<groupSize()||item.bedrooms<Number(bedrooms.value)||item.bathrooms<Number(bathrooms.value)||!selected.every(a=>item.amenities.includes(a))))return [];
        if(type()==='experience'&&((category.value&&item.category!==category.value)||(interest.value&&item.interest!==interest.value)))return [];
        return [i];
      });
      if(type()==='villa'&&groupSize())matches.sort((a,b)=>items[a].sleeps-items[b].sleeps);
      limit=6;results.hidden=false;$('#home-filter-count').textContent=selected.length+(Number(bedrooms.value)>0?1:0)+(Number(bathrooms.value)>0?1:0)||'';showResults();
    }
    function setType(){
      const villa=type()==='villa';finder.dataset.searchType=type();
      ['#home-destination-field','#home-arrival-field','#home-departure-field','#home-villa-filters'].forEach(id=>$(id).hidden=!villa);
      ['#home-interest-field','#home-category-field'].forEach(id=>$(id).hidden=villa);
      $('#search-heading').innerHTML=villa?'Find your <em>place in Tuscany.</em>':'Make room for <em>discovery.</em>';
      $('#home-submit-label').textContent=villa?'Find villas':'Find experiences';
      $('#home-search-note').textContent=villa?'Search by capacity and amenities. Preferred dates are shared with our team to confirm availability.':'Experiences are arranged personally for your group; participation details are confirmed by our team.';
      $('#home-results-title').innerHTML=villa?'Homes to <em>make your own.</em>':'Days to <em>remember.</em>';
      $('.search-results-heading .eyebrow').textContent=villa?'THE VILLA COLLECTION':'THE EXPERIENCE COLLECTION';
      validateDates();if(searched)findResults();
    }
    category.value=finder.dataset.searchCategory||'';
    homeForm.addEventListener('submit',e=>{e.preventDefault();searched=true;guestPicker.open=false;findResults();results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
    $$('input[name=search-type]',homeForm).forEach(input=>input.addEventListener('change',setType));
    homeForm.addEventListener('change',e=>{validateDates();updateGuests();if(searched&&e.target.name!=='search-type')findResults();});
    [checkIn,checkOut].forEach(input=>input.addEventListener('input',validateDates));
    [adults,children].forEach(input=>input.addEventListener('input',()=>{updateGuests();if(searched)findResults();}));
    $$('[data-guest-step]').forEach(b=>b.addEventListener('click',()=>{const input=b.dataset.guestKind==='adults'?adults:children;input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+Number(b.dataset.guestStep))));updateGuests();if(searched)findResults();}));
    $('.guest-done').addEventListener('click',()=>guestPicker.open=false);
    homeForm.addEventListener('invalid',e=>{if(e.target.closest('#home-guests'))guestPicker.open=true;},true);
    document.addEventListener('click',e=>{if(!e.target.closest('#home-guests'))guestPicker.open=false;});
    guestPicker.addEventListener('keydown',e=>{if(e.key==='Escape'){guestPicker.open=false;$('summary',guestPicker).focus();}});
    $('#home-results-more').addEventListener('click',()=>{limit+=6;showResults();});
    $('#home-search-reset').addEventListener('click',()=>{const current=type();homeForm.reset();homeForm.elements['search-type'].value=current;category.value=finder.dataset.searchCategory||'';guestPicker.open=false;updateGuests();setType();findResults();});
    $$('[data-search-enquiry]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.inquiry==='booking'){
        arrival.value=checkIn.value;departure.value=checkOut.value;
        $('input[name=adults]',inquiry).value=adults.value==='0'?'2':adults.value;
        $('input[name=children]',inquiry).value=children.value;
        arrival.dispatchEvent(new Event('input'));departure.dispatchEvent(new Event('input'));
      }else if(groupSize()){
        $('#general-panel textarea[name=message]').value=`We would like to arrange ${button.dataset.topic} for ${adults.value} adults and ${children.value} children.`;
      }
    }));
    finder.addEventListener('villa:reveal',e=>{
      const index=Number(e.detail?.index),position=matches.indexOf(index);if(position<0)return;
      limit=Math.max(limit,position+1);showResults();
      $$('[data-home-result]').forEach(row=>row.classList.remove('is-map-selected'));
      rows[index].classList.add('is-map-selected');
      rows[index].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      $('a',rows[index])?.focus({preventScroll:true});
    });
    updateGuests();setType();
  }
  const search=$('#villa-search'),destination=$('#villa-destination');
  function filterVillas(){const term=(search?.value||'').toLowerCase().trim();const city=(destination?.value||'').toLowerCase();let count=0;$$('.villa-card').forEach(c=>{const haystack=`${c.dataset.name} ${c.dataset.location}`;const matches=haystack.includes(term)&&(!city||haystack.includes(city)||(city==='firenze'&&haystack.includes('florence')));c.hidden=!matches;if(matches)count++;});$('#result-count').textContent=count;$('#no-results').hidden=count>0;}
  search?.addEventListener('input',filterVillas);destination?.addEventListener('change',filterVillas);
  $$('[data-embed]').forEach(button=>button.addEventListener('click',()=>{const box=button.closest('.embed-placeholder');box.dataset.originalHtml=box.innerHTML;const iframe=document.createElement('iframe');iframe.src=button.dataset.embed;iframe.title=button.dataset.embedTitle||'External content';iframe.loading='lazy';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allow='fullscreen; picture-in-picture';iframe.setAttribute('allowfullscreen','');const reset=document.createElement('button');reset.className='unload-embed';reset.textContent='Unload external content';reset.addEventListener('click',()=>location.reload());box.replaceChildren(iframe,reset);box.classList.add('loaded');}));
  const consent=$('#consent-dialog');$('[data-consent-settings]')?.addEventListener('click',()=>showDialog(consent));$('[data-close-consent]')?.addEventListener('click',()=>closeDialog(consent));$('[data-reset-embeds]')?.addEventListener('click',()=>location.reload());
  // Desktop previews are quiet and temporary; explicit playback keeps normal controls.
  const filmStates=[];
  $$('[data-video-preview]').forEach(card=>{
    const film=$('video',card),action=$('.film-action',card),hint=$('.film-hint',card),watchLabel=action.getAttribute('aria-label');
    const state={film,card,manual:false,preview:false,hover:false};filmStates.push(state);
    function idle(){state.preview=false;card.classList.remove('previewing','playing');action.innerHTML='Watch film <span aria-hidden="true">▶</span>';action.setAttribute('aria-label',watchLabel);}
    function stop(){film.pause();state.manual=false;idle();}
    card.addEventListener('pointerenter',e=>{
      state.hover=true;
      if(e.pointerType==='touch'||!matchMedia('(hover: hover)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches||state.manual||filmStates.some(s=>s.manual&&!s.film.paused))return;
      filmStates.filter(s=>s!==state&&s.preview).forEach(s=>{s.film.pause();s.preview=false;s.card.classList.remove('previewing');});
      state.preview=true;film.muted=true;film.loop=true;
      film.play().then(()=>{if(!state.hover&&!state.manual){film.pause();idle();}else card.classList.add(state.manual?'playing':'previewing');}).catch(()=>{idle();hint.textContent='Choose Watch film to play';});
    });
    card.addEventListener('pointerleave',()=>{state.hover=false;if(state.preview){film.pause();film.currentTime=0;idle();}});
    action.addEventListener('click',()=>{
      if(state.manual&&!film.paused){stop();return;}
      filmStates.filter(s=>s!==state).forEach(s=>{s.film.pause();s.manual=false;s.preview=false;s.card.classList.remove('playing','previewing');$('.film-action',s.card).innerHTML='Watch film <span aria-hidden="true">▶</span>';});
      state.preview=false;state.manual=true;film.loop=false;film.muted=false;
      card.classList.remove('previewing');card.classList.add('playing');action.innerHTML='Pause film <span aria-hidden="true">Ⅱ</span>';action.setAttribute('aria-label','Pause '+film.getAttribute('aria-label'));
      film.play().catch(()=>{state.manual=false;idle();hint.textContent='Video unavailable. Please try again.';});
    });
    film.addEventListener('play',()=>{if(!state.preview&&!state.manual){if(!state.hover){film.pause();return;}state.manual=true;}card.classList.add(state.preview?'previewing':'playing');if(state.manual){action.innerHTML='Pause film <span aria-hidden="true">Ⅱ</span>';action.setAttribute('aria-label','Pause '+film.getAttribute('aria-label'));}});
    film.addEventListener('pause',()=>{state.manual=false;idle();});
    film.addEventListener('ended',()=>{state.manual=false;idle();});
    if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();},{threshold:.1});observer.observe(card);}
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  });
  const video=$('.hero video'),videoToggle=$('[data-video-toggle]');if(video&&videoToggle){videoToggle.addEventListener('click',()=>{if(video.paused){video.play().then(()=>{videoToggle.textContent='Ⅱ';videoToggle.setAttribute('aria-label','Pause background video');}).catch(()=>{});}else{video.pause();videoToggle.textContent='▶';videoToggle.setAttribute('aria-label','Play background video');}});if(matchMedia('(prefers-reduced-motion: reduce)').matches){video.pause();videoToggle.textContent='▶';videoToggle.setAttribute('aria-label','Play background video');}}
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});$$('.section-heading,.card,.editorial-copy,.family-copy,.story-section>div').forEach(el=>{el.classList.add('reveal');observer.observe(el);});}
  if(location.pathname.replace(/\/$/,'')==='/contact'&&new URLSearchParams(location.search).get('type')==='booking'){chooseForm('booking');showDialog(inquiry);}
})();
