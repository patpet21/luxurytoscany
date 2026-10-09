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
  const search=$('#villa-search'),destination=$('#villa-destination');
  function filterVillas(){const term=(search?.value||'').toLowerCase().trim();const city=(destination?.value||'').toLowerCase();let count=0;$$('.villa-card').forEach(c=>{const haystack=`${c.dataset.name} ${c.dataset.location}`;const matches=haystack.includes(term)&&(!city||haystack.includes(city)||(city==='firenze'&&haystack.includes('florence')));c.hidden=!matches;if(matches)count++;});$('#result-count').textContent=count;$('#no-results').hidden=count>0;}
  search?.addEventListener('input',filterVillas);destination?.addEventListener('change',filterVillas);
  $$('[data-embed]').forEach(button=>button.addEventListener('click',()=>{const box=button.closest('.embed-placeholder');box.dataset.originalHtml=box.innerHTML;const iframe=document.createElement('iframe');iframe.src=button.dataset.embed;iframe.title=button.dataset.embedTitle||'External content';iframe.loading='lazy';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allow='fullscreen; picture-in-picture';iframe.setAttribute('allowfullscreen','');const reset=document.createElement('button');reset.className='unload-embed';reset.textContent='Unload external content';reset.addEventListener('click',()=>location.reload());box.replaceChildren(iframe,reset);box.classList.add('loaded');}));
  const consent=$('#consent-dialog');$('[data-consent-settings]')?.addEventListener('click',()=>showDialog(consent));$('[data-close-consent]')?.addEventListener('click',()=>closeDialog(consent));$('[data-reset-embeds]')?.addEventListener('click',()=>location.reload());
  const video=$('.hero video'),videoToggle=$('[data-video-toggle]');if(video&&videoToggle){videoToggle.addEventListener('click',()=>{if(video.paused){video.play().then(()=>{videoToggle.textContent='Ⅱ';videoToggle.setAttribute('aria-label','Pause background video');}).catch(()=>{});}else{video.pause();videoToggle.textContent='▶';videoToggle.setAttribute('aria-label','Play background video');}});if(matchMedia('(prefers-reduced-motion: reduce)').matches){video.pause();videoToggle.textContent='▶';videoToggle.setAttribute('aria-label','Play background video');}}
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});$$('.section-heading,.card,.editorial-copy,.family-copy,.story-section>div').forEach(el=>{el.classList.add('reveal');observer.observe(el);});}
  if(location.pathname.replace(/\/$/,'')==='/contact'&&new URLSearchParams(location.search).get('type')==='booking'){chooseForm('booking');showDialog(inquiry);}
})();
