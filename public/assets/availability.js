const version=new URL(import.meta.url).searchParams.get('model')||'1';
const {CATALOGUE,nameKey,dayState,requestState,usableSnapshot,freshMonth,italyToday,monthsForStay,selectDate,civilDate}=await import(`./availability-model.js?v=${encodeURIComponent(version)}`);
const submissionVersion=new URL(import.meta.url).searchParams.get('submission')||'1';
const {createStaySubmission,sendStayRequest}=await import(`./stay-request.js?v=${encodeURIComponent(submissionVersion)}`);
const snapshots=new Map(), pending=new Map(), controllers=[];
const endpoint='/.netlify/functions/availability';
const field=(root,selector)=>root.querySelector(selector);
const byTitle=title=>CATALOGUE.find(v=>nameKey(v.title)===nameKey(title));
const label=iso=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
const monthDate=month=>new Date(month+'-01T00:00:00Z');
const shiftMonth=(month,delta)=>{const date=monthDate(month);date.setUTCMonth(date.getUTCMonth()+delta);return date.toISOString().slice(0,7);};
const notify=()=>document.dispatchEvent(new Event('availability:updated'));

async function readSource(villa,months,force=false) {
  if(!villa)return undefined;
  months=[...new Set(months)].sort();
  const cached=snapshots.get(villa.slug);
  if(!force&&usableSnapshot(cached)&&months.every(m=>freshMonth(cached.months?.[m])))return cached;
  const key=villa.slug+':'+months.join(',');
  if(!pending.has(key))pending.set(key,(async()=>{
    try {
      const params=new URLSearchParams({villa:villa.slug,months:months.join(',')});
      const response=await fetch(`${endpoint}?${params}`,{cache:'no-store',signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok||data.id!==villa.id||data.villa!==villa.slug||!usableSnapshot(data))throw Error('Source not verified');
      const previous=snapshots.get(villa.slug);
      data.months={...(previous?.version===data.version?previous.months:{}),...data.months};
      snapshots.set(villa.slug,data);notify();return data;
    } catch {snapshots.delete(villa.slug);notify();return undefined;}
  })().finally(()=>pending.delete(key)));
  return pending.get(key);
}

class Calendar {
  constructor(root,onSelection=()=>{}) {
    this.root=root;this.onSelection=onSelection;this.month=italyToday().slice(0,7);this.selection={arrival:'',departure:''};this.generation=0;this.error='';this.focusDate=italyToday();this.title='Choose a villa';this.capacity=100;
    this.adults=field(root,'[data-calendar-adults]');this.children=field(root,'[data-calendar-children]');
    field(root,'[data-calendar-prev]').addEventListener('click',()=>this.move(-1));
    field(root,'[data-calendar-next]').addEventListener('click',()=>this.move(1));
    field(root,'[data-availability-refresh]').addEventListener('click',()=>this.load(true));
    field(root,'[data-calendar-clear]').addEventListener('click',()=>{this.selection={arrival:'',departure:''};this.error='';this.changed();});
    field(root,'[data-calendar-continue]').addEventListener('click',()=>this.continue());
    [this.adults,this.children].forEach(input=>input.addEventListener('input',()=>this.changed(false)));
    root.addEventListener('click',event=>{
      const button=event.target.closest('[data-date]');if(!button)return;
      this.focusDate=button.dataset.date;
      const result=selectDate(this.snapshot(),this.selection,button.dataset.date);
      this.selection=result.selection;this.error=result.error;this.preview='';this.changed();
      field(root,`[data-date="${this.focusDate}"]`)?.focus({preventScroll:true});
    });
    root.addEventListener('pointerover',event=>{
      const button=event.target.closest('[data-date]');
      this.preview=button&&this.selection.arrival&&!this.selection.departure&&button.dataset.date>this.selection.arrival&&!['blocked','unknown','invalid','past'].includes(requestState(this.snapshot(),this.selection.arrival,button.dataset.date))?button.dataset.date:'';
      this.paintRange();
    });
    root.addEventListener('pointerleave',()=>{this.preview='';this.paintRange();});
    root.addEventListener('keydown',event=>this.key(event));
    controllers.push(this);
  }
  snapshot(){return this.villa&&snapshots.get(this.villa.slug);}
  active(){const dialog=this.root.closest('dialog');return !this.root.hidden&&(!dialog||dialog.open);}
  setVilla(villa,title,capacity=100,initial={}) {
    ++this.generation;clearTimeout(this.timer);this.loading=false;this.continuing=false;
    this.villa=villa;this.title=title||'Choose a villa';this.capacity=Number(capacity)||100;
    this.adults.max=String(this.capacity);this.children.max=String(Math.max(0,this.capacity-1));
    this.selection={arrival:initial.arrival||'',departure:initial.departure||''};
    this.adults.value=String(initial.adults||2);this.children.value=String(initial.children||0);this.error='';
    this.month=civilDate(this.selection.arrival)&&this.selection.arrival>=italyToday()?this.selection.arrival.slice(0,7):italyToday().slice(0,7);
    this.focusDate=this.selection.arrival||italyToday();this.draw();if(villa)this.load();
  }
  async load(force=false) {
    if(!this.villa||this.loading)return;
    const generation=this.generation,requestedMonth=this.month;this.loading=true;this.draw();
    await readSource(this.villa,[this.month,shiftMonth(this.month,1)],force);
    if(generation!==this.generation)return;
    this.loading=false;
    if(requestedMonth!==this.month){this.load();return;}
    if(this.selection.departure && ['blocked','unknown','invalid','past'].includes(requestState(this.snapshot(),this.selection.arrival,this.selection.departure))) {
      this.selection={arrival:'',departure:''};this.error='The source changed or could not be verified. Please choose your dates again.';this.onSelection(this);
    }
    this.draw();clearTimeout(this.timer);
    const snapshot=this.snapshot();
    const expiries=[Date.parse(snapshot?.expiresAt),...Object.values(snapshot?.months||{}).map(m=>Date.parse(m.expiresAt))].filter(t=>Number.isFinite(t)&&t>Date.now());
    this.timer=setTimeout(()=>{this.draw();notify();if(!document.hidden&&this.active())this.load(true);},expiries.length?Math.max(1,Math.min(...expiries)-Date.now()):15000);
  }
  changed(redraw=true){if(redraw)this.draw();else this.summary();this.onSelection(this);}
  move(delta){const target=shiftMonth(this.month,delta),first=italyToday().slice(0,7);this.month=target<first?first:target>shiftMonth(first,35)?shiftMonth(first,35):target;this.draw();this.load();}
  partyValid(){return this.adults.checkValidity()&&this.children.checkValidity()&&Number(this.adults.value)>=1&&Number(this.children.value)>=0&&Number(this.adults.value)+Number(this.children.value)<=this.capacity;}
  summary() {
    const {arrival,departure}=this.selection,state=requestState(this.snapshot(),arrival,departure);
    field(this.root,'[data-calendar-villa]').textContent=this.title;
    const total=Number(this.adults.value)+Number(this.children.value);
    field(this.root,'[data-stay-summary]').textContent=arrival?`${label(arrival)}${departure?' → '+label(departure):' · choose check-out'} · ${total} ${total===1?'guest':'guests'}`:'Choose your check-in, then your check-out.';
    field(this.root,'[data-selection-status]').textContent=this.error || (!this.partyValid()?`Please choose at least one adult and no more than ${this.capacity} guests.`:departure?state==='available'?'Reported available for these nights. Our team must still confirm your stay.':state==='unverified'?'To be confirmed. These dates are not verified as available.':'These dates cannot currently be used. Please choose again.':'');
    field(this.root,'[data-calendar-continue]').disabled=!!this.continuing||!departure||!this.partyValid()||!['available','unverified'].includes(state);
    field(this.root,'[data-calendar-instructions]').textContent=arrival&&!departure?'Now choose check-out. You may depart on the first occupied date, provided no occupied night is included.':'Choose your check-in, then your check-out. Past and occupied nights cannot be selected.';
  }
  paintRange(){
    const {arrival,departure}=this.selection,end=departure||this.preview;
    this.root.querySelectorAll('[data-date]').forEach(button=>{
      const date=button.dataset.date,inRange=!!(arrival&&end&&date>=arrival&&date<end);
      button.classList.toggle('in-range',inRange);button.classList.toggle('range-start',date===arrival);button.classList.toggle('range-end',date===end);
      button.setAttribute('aria-pressed',String(date===arrival||date===departure));
    });
  }
  draw() {
    const root=this.root,snapshot=this.snapshot(),valid=usableSnapshot(snapshot),today=italyToday();
    const focused=root.contains(document.activeElement)?document.activeElement.dataset.date:undefined;
    const months=field(root,'[data-calendar-months]');months.replaceChildren();
    const labels={available:'Reported available',blocked:'Occupied',unverified:'To be confirmed',unknown:'Not verified'};
    for(let offset=0;offset<2;offset++) {
      const month=shiftMonth(this.month,offset),date=monthDate(month),table=document.createElement('table');table.className='availability-month';
      table.createCaption().textContent=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(date);
      const heading=table.createTHead().insertRow();
      for(const day of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']){const th=document.createElement('th');th.scope='col';const abbr=document.createElement('abbr');abbr.title=day;abbr.textContent=day.slice(0,2);th.append(abbr);heading.append(th);}
      const body=table.createTBody(),shift=(date.getUTCDay()+6)%7,count=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();let row;
      for(let position=0;position<Math.ceil((shift+count)/7)*7;position++) {
        if(position%7===0)row=body.insertRow();const cell=row.insertCell(),day=position-shift+1;if(day<1||day>count)continue;
        const iso=`${month}-${String(day).padStart(2,'0')}`,state=dayState(snapshot,iso),result=selectDate(snapshot,this.selection,iso),past=iso<today;
        const button=document.createElement('button');button.type='button';button.dataset.date=iso;button.textContent=String(day);button.className=`calendar-day is-${state}${past?' is-past':''}`;
        const checkout=state==='blocked'&&!result.error;
        button.setAttribute('aria-label',`${label(iso)} · ${past?'Past date':labels[state]}${checkout?' · Check-out only':''}`);
        button.setAttribute('aria-disabled',String(!!result.error));button.tabIndex=iso===this.focusDate?0:-1;
        if(iso===today)button.setAttribute('aria-current','date');cell.append(button);
      }
      months.append(table);
    }
    if(!field(root,'[data-date][tabindex="0"]'))field(root,'[data-date]')?.setAttribute('tabindex','0');
    field(root,'[data-calendar-prev]').disabled=this.month<=today.slice(0,7);
    field(root,'[data-calendar-next]').disabled=this.month>=shiftMonth(today.slice(0,7),35);
    field(root,'[data-availability-refresh]').disabled=this.loading||!this.villa;
    const conflict=[this.month,shiftMonth(this.month,1)].some(key=>freshMonth(snapshot?.months?.[key])&&snapshot.months[key].conflict);
    field(root,'[data-availability-badge]').textContent=!this.villa?'No verified source':this.loading?'Checking dates':valid?conflict?'Source needs confirmation':'Calendar updated':'Availability not verified';
    field(root,'[data-availability-status]').textContent=!this.villa?'No verified availability source. Please ask our team to check this villa manually.':!valid?'Availability is not verified. Refresh the calendar or ask our team.':conflict?'The provider’s calendars disagree. Occupied dates stay blocked; other dates in the affected month are to be confirmed.':`Checked ${new Date(snapshot.checkedAt).toLocaleString('en-GB',{timeZone:'Europe/Rome'})} (Italy). Reported availability is not a reservation.`;
    this.paintRange();this.summary();
    if(focused)field(root,`[data-date="${focused}"]`)?.focus({preventScroll:true});
  }
  key(event) {
    const button=event.target.closest('[data-date]');if(!button)return;
    const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();this.move(event.key==='PageUp'?-1:1);field(this.root,'[data-date]')?.focus();return;}
    let offset=offsets[event.key];const current=new Date(button.dataset.date+'T00:00:00Z');
    if(event.key==='Home')offset=-((current.getUTCDay()+6)%7);if(event.key==='End')offset=6-((current.getUTCDay()+6)%7);
    if(offset===undefined)return;event.preventDefault();current.setUTCDate(current.getUTCDate()+offset);this.focusDate=current.toISOString().slice(0,10);
    if(this.focusDate<italyToday())this.focusDate=italyToday();
    if(this.focusDate.slice(0,7)>shiftMonth(italyToday().slice(0,7),36))return;
    if(this.focusDate.slice(0,7)<this.month||this.focusDate.slice(0,7)>shiftMonth(this.month,1)){this.month=this.focusDate.slice(0,7);this.load();}
    this.draw();field(this.root,`[data-date="${this.focusDate}"]`)?.focus({preventScroll:true});
  }
  async continue() {
    if(this.continuing)return;
    if(!this.partyValid()){this.error=`Please choose at least one adult and no more than ${this.capacity} guests.`;this.summary();return;}
    const selection={...this.selection},villa=this.villa,generation=this.generation,party=[this.adults.value,this.children.value];
    this.continuing=true;this.summary();
    const snapshot=await readSource(villa,monthsForStay(selection.arrival,selection.departure),true);
    if(generation!==this.generation)return;
    this.continuing=false;this.summary();
    if(!this.active()||JSON.stringify(selection)!==JSON.stringify(this.selection)||JSON.stringify(party)!==JSON.stringify([this.adults.value,this.children.value]))return;
    if(!['available','unverified'].includes(requestState(snapshot,selection.arrival,selection.departure))){this.error='Your dates are no longer usable. Please refresh and choose again.';this.draw();return;}
    closePicker(false);
    document.dispatchEvent(new CustomEvent('stay:open',{detail:{villa:this.title,...selection,adults:Number(this.adults.value),children:Number(this.children.value)}}));
    updateForm();
  }
}

const inquiry=field(document,'#inquiry-dialog'),form=field(document,'form[name="stay-request"]');
const picker=field(document,'#stay-calendar-dialog'),pickerSelect=field(picker,'[data-picker-villa]');
const pickerCalendar=new Calendar(field(picker,'[data-availability]'));
let returnFocus;
function closePicker(restore=true){picker.close();document.body.classList.remove('modal-open');if(restore)returnFocus?.focus();}
function pickVilla(initial={}) {
  const option=pickerSelect.selectedOptions[0];
  pickerCalendar.setVilla(byTitle(pickerSelect.value),pickerSelect.value,option?.dataset.capacity,initial);
}
pickerSelect.addEventListener('change',()=>pickVilla());
field(picker,'[data-close-calendar]').addEventListener('click',()=>closePicker());
picker.addEventListener('cancel',()=>{document.body.classList.remove('modal-open');returnFocus?.focus();});
function openPicker(title='',initial={}) {
  returnFocus=document.activeElement;
  if(inquiry.open)inquiry.close();
  pickerSelect.value=title;pickVilla(initial);picker.showModal();document.body.classList.add('modal-open');
}

const pageRoot=field(document,'.villa-body [data-availability]');
const pageCalendar=pageRoot?new Calendar(pageRoot):null;
if(pageCalendar)pageCalendar.setVilla(CATALOGUE.find(v=>v.slug===pageRoot.dataset.availability),pageRoot.dataset.villaTitle,pageRoot.dataset.capacity);

const finder=field(document,'.stay-finder'),villaFilter=field(document,'#home-villa');
let finderCalendar;
if(finder) {
  const root=field(finder,'[data-availability="finder"]'),arrival=field(finder,'#home-arrival'),departure=field(finder,'#home-departure');
  finderCalendar=new Calendar(root,calendar=>{
    arrival.value=calendar.selection.arrival;departure.value=calendar.selection.departure;
    const adults=field(finder,'#home-adults'),children=field(finder,'#home-children');
    adults.value=calendar.adults.value;children.value=calendar.children.value;
    adults.dispatchEvent(new Event('input',{bubbles:true}));
    [arrival,departure].forEach(input=>input.dispatchEvent(new Event('input',{bubbles:true})));
    departure.dispatchEvent(new Event('change',{bubbles:true}));
  });
  function syncFinder(reset=true) {
    const active=finder.dataset.searchType!=='experience',option=villaFilter.selectedOptions[0],specific=!!villaFilter.value;
    root.hidden=!active||!specific;
    for(const input of [arrival,departure]){input.type=specific?'text':'date';input.readOnly=specific;}
    if(reset){arrival.value='';departure.value='';}
    if(active&&specific)finderCalendar.setVilla(CATALOGUE.find(v=>v.path===villaFilter.value),option.dataset.title,option.dataset.capacity,{arrival:arrival.value,departure:departure.value,adults:Number(field(finder,'#home-adults').value)||2,children:Number(field(finder,'#home-children').value)||0});
  }
  villaFilter.addEventListener('change',()=>{syncFinder();departure.dispatchEvent(new Event('change',{bubbles:true}));});
  finder.addEventListener('finder:type',()=>syncFinder(false));
  [arrival,departure].forEach(input=>input.addEventListener('click',()=>{if(villaFilter.value){root.scrollIntoView({block:'center'});field(root,'[data-calendar-instructions]').focus();}}));
  for(const input of [field(finder,'#home-adults'),field(finder,'#home-children')])input.addEventListener('input',()=>{finderCalendar.adults.value=field(finder,'#home-adults').value||'2';finderCalendar.children.value=field(finder,'#home-children').value;finderCalendar.summary();});
  syncFinder();
}

const note=document.createElement('p');note.className='availability-form-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');field(form,'.form-status').before(note);
function updateForm() {
  const selected=byTitle(form.elements.villa.value),state=requestState(snapshots.get(selected?.slug),form.elements.arrival.value,form.elements.departure.value);
  form.elements['availability-check'].value=state;
  note.textContent=state==='available'?'The selected nights are reported available. This is a personal enquiry, not a confirmed reservation.':state==='unverified'?'To be confirmed. The selected dates require a manual availability check.':state==='blocked'?'Your dates include occupied nights. Please change them in the villa calendar.':'Choose your dates in the controlled villa calendar. No availability is confirmed.';
}
field(form,'[data-stay-change-dates]').addEventListener('click',()=>openPicker(form.elements.villa.value,{arrival:form.elements.arrival.value,departure:form.elements.departure.value,adults:form.elements.adults.value,children:form.elements.children.value}));
form.elements.villa.addEventListener('change',()=>{form.elements.arrival.value='';form.elements.departure.value='';updateForm();openPicker(form.elements.villa.value);});
document.addEventListener('availability:updated',()=>{controllers.filter(c=>c.active()).forEach(c=>c.draw());updateForm();});
document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-inquiry="booking"]');if(!trigger)return;
  event.preventDefault();event.stopImmediatePropagation();
  const title=trigger.dataset.property||pageCalendar?.title||'';
  if(pageCalendar&&title===pageCalendar.title){pageCalendar.root.scrollIntoView({block:'center'});field(pageCalendar.root,'[data-calendar-instructions]').focus();}
  else openPicker(title,{arrival:field(document,'#home-arrival')?.value,departure:field(document,'#home-departure')?.value,adults:field(document,'#home-adults')?.value||2,children:field(document,'#home-children')?.value||0});
},true);
const submitButton=field(form,'[data-stay-submit]'),requestFields=field(form,'[data-stay-fields]');
const receiptPanel=field(form,'[data-stay-receipt]'),submissionStatus=field(form,'.form-status');
let submissionEpoch=1;
inquiry.addEventListener('close',()=>submissionEpoch++);
const submitter=createStaySubmission({
  send:payload=>['localhost','127.0.0.1','[::1]'].includes(location.hostname)?Promise.resolve({status:'preview',message:'Preview mode: your selected dates and details were checked. Nothing has been sent.'}):sendStayRequest(payload),
  read:()=>Object.fromEntries(['villa','arrival','departure','adults','children','first-name','last-name','email','phone','message','privacy-consent','_gotcha'].map(key=>[key,key==='privacy-consent'?(form.elements[key].checked?'accepted':''):form.elements[key].value.trim()])),
  context:()=>inquiry.open&&!field(document,'#booking-panel').hidden?String(submissionEpoch):null,
  async validate(data) {
    const selected=byTitle(data.villa),months=monthsForStay(data.arrival,data.departure);
    if(!selected||!months.length)return {ok:false,message:'Choose your villa and dates in the controlled calendar before sending your enquiry.'};
    if(!form.checkValidity()){form.reportValidity();return {ok:false,message:'Please complete the required details and privacy consent.'};}
    if(data._gotcha)return {ok:false,message:'The enquiry could not be sent. Please reload the page and try again.'};
    const snapshot=await readSource(selected,months,true),state=requestState(snapshot,data.arrival,data.departure);updateForm();
    const capacity=Number(form.elements.villa.selectedOptions[0]?.dataset.capacity)||100;
    const adults=Number(data.adults),children=Number(data.children);
    if(!['available','unverified'].includes(state)||!Number.isInteger(adults)||!Number.isInteger(children)||adults<1||children<0||adults+children>capacity)
      return {ok:false,message:'Your dates or group cannot currently be accepted. Please review them in the villa calendar. Nothing has been sent.'};
    return {ok:true,metadata:{'availability-check':state,'source-page':location.pathname,'enquiry-type':'Availability request only — not a confirmed reservation'}};
  },
  render(result) {
    const pending=['checking','sending'].includes(result.status),success=result.status==='success';
    form.setAttribute('aria-busy',String(pending));requestFields.disabled=result.status==='sending';
    requestFields.hidden=success;receiptPanel.hidden=!success;submitButton.hidden=success;note.hidden=success;
    submitButton.disabled=pending;submitButton.textContent=result.status==='checking'?'Checking dates…':result.status==='sending'?'Sending enquiry…':'Request availability ↗';
    submissionStatus.dataset.state=result.status;
    submissionStatus.textContent=result.status==='checking'?'Rechecking your selected nights…':result.status==='sending'?'Sending your availability enquiry securely…':result.message||'';
    if(success) {
      const data=result.data;
      field(form,'[data-stay-receipt-summary]').textContent=`${data.villa} · ${label(data.arrival)} – ${label(data.departure)} · ${data.adults} ${Number(data.adults)===1?'adult':'adults'} · ${data.children} ${Number(data.children)===1?'child':'children'}`;
      field(form,'[data-stay-receipt-id]').textContent=`Enquiry reference: ${result.requestId}`;
      if(inquiry.open)receiptPanel.focus();
    } else if(result.message&&inquiry.open)submissionStatus.focus();
  }
});
function resetSubmissionView() {
  if(submitter.busy)return;
  submissionEpoch++;requestFields.hidden=false;requestFields.disabled=false;receiptPanel.hidden=true;submitButton.hidden=false;submitButton.disabled=false;note.hidden=false;
  submissionStatus.textContent='';delete submissionStatus.dataset.state;
}
document.addEventListener('stay:open',resetSubmissionView);
document.addEventListener('concierge:inquiry',event=>{if(event.detail?.kind==='booking')resetSubmissionView();});
field(form,'[data-stay-new-enquiry]').addEventListener('click',()=>{const title=form.elements.villa.value;form.reset();resetSubmissionView();updateForm();openPicker(title);});
form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();void submitter.submit();},true);
submitButton.disabled=false;

let searchTimer;
window.SuperTuscanyAvailability={
  async filter(items,indices,arrival,departure) {
    const months=monthsForStay(arrival,departure);if(!months.length||arrival<italyToday())return [];
    const result=[];
    for(let offset=0;offset<indices.length;offset+=3)await Promise.all(indices.slice(offset,offset+3).map(async index=>{
      const villa=CATALOGUE.find(v=>v.path===items[index].path);const snapshot=await readSource(villa,months);
      if(requestState(snapshot,arrival,departure)==='available')result.push(index);
    }));
    clearTimeout(searchTimer);
    const expires=result.flatMap(index=>{const data=snapshots.get(CATALOGUE.find(v=>v.path===items[index].path)?.slug);return [Date.parse(data.expiresAt),...months.map(m=>Date.parse(data.months[m].expiresAt))];});
    if(expires.length)searchTimer=setTimeout(()=>finder?.dispatchEvent(new Event('availability:expired')),Math.max(1,Math.min(...expires)-Date.now()));
    return indices.filter(i=>result.includes(i));
  }
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){controllers.filter(c=>c.active()&&c.villa).forEach(c=>c.load());finder?.dispatchEvent(new Event('availability:expired'));}});
window.addEventListener('online',()=>controllers.filter(c=>c.villa&&c.active()).forEach(c=>c.load(true)));
window.dispatchEvent(new Event('availability:ready'));updateForm();
