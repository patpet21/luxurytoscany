const versions=new URL(import.meta.url).searchParams;
const {guideReply}=await import('./concierge-engine.js?v='+(versions.get('engine')||'1'));
const $=s=>document.querySelector(s),dialog=$('#concierge-dialog'),log=$('#concierge-messages'),input=$('#concierge-input'),form=$('#concierge-form'),launch=$('#concierge-launch'),ai=$('#concierge-ai');
let knowledge,state={},history=[],busy=false,aiAvailable=false,generation=0;
const label=(en,it)=>state.lang==='it'?it:en;
const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
function openRequest(kind='general',topic=''){
  dialog.close();
  const transcript=history.map(m=>`${m.role==='user'?'Guest':'Concierge'}: ${m.content}`).join('\n\n').slice(-5500);
  document.dispatchEvent(new CustomEvent('concierge:inquiry',{detail:{kind,topic,message:transcript,adults:state.adults||0,children:state.children||0}}));
}
function message(role,text,response={}){
  const bubble=element('article','concierge-message '+role);bubble.append(element('span','concierge-speaker',role==='user'?label('You','Tu'):'Super Tuscany'),element('p','',text));
  for(const item of response.items||[]){
    // All card data and URLs come from the local catalogue, never AI HTML.
    const link=element('a','concierge-card');link.href=item.path;
    if(item.image){const img=document.createElement('img');img.src=item.image;img.alt='';img.loading='lazy';link.append(img);}
    const copy=element('span','');copy.append(element('strong','',item.title),element('small','',item.type==='villa'?`${item.sleeps} ${label('guests','ospiti')} · ${item.bedrooms} ${label('bedrooms','camere')} · ${item.city||'Tuscany'}`:label('Explore this experience ↗','Scopri questa esperienza ↗')));link.append(copy);bubble.append(link);
  }
  for(const link of response.links||[]){const a=element('a','concierge-source',link.title+' ↗');a.href=link.path;bubble.append(a);}
  if(response.inquiry){const button=element('button','concierge-request',label(response.inquiry==='booking'?'Request a stay ↗':'Ask our team ↗',response.inquiry==='booking'?'Richiedi un soggiorno ↗':'Chiedi al team ↗'));button.type='button';button.addEventListener('click',()=>openRequest(response.inquiry,response.topic||''));bubble.append(button);}
  log.append(bubble);log.scrollTop=log.scrollHeight;return bubble;
}
async function load(){
  if(knowledge)return;
  const response=await fetch('/assets/concierge-data.json?v='+(versions.get('data')||'1'));if(!response.ok)throw Error('Catalogue unavailable');knowledge=await response.json();
  message('assistant',guideReply(knowledge,'Hello').text);
  fetch('/.netlify/functions/concierge').then(r=>r.ok?r.json():null).then(config=>{aiAvailable=config?.aiAvailable===true;$('#concierge-ai-option').hidden=!aiAvailable;}).catch(()=>{});
}
function mode(){ $('#concierge-mode').textContent=aiAvailable&&ai.checked?label('AI concierge · not live support','Concierge AI · non è assistenza in diretta'):label('Website guide · not live support','Guida del sito · non è assistenza in diretta'); }
async function send(text){
  if(busy||!text.trim())return;
  const turn=generation;busy=true;form.setAttribute('aria-busy','true');$('#concierge-send').disabled=true;
  message('user',text);history.push({role:'user',content:text});input.value='';
  const pending=message('assistant',label('Let me help you…','Ti aiuto a scegliere…'));
  try{
    let response=guideReply(knowledge,text,state);
    if(aiAvailable&&ai.checked){
      try{
        const remote=await fetch('/.netlify/functions/concierge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-10),state,page:location.pathname,allowAI:true}),signal:AbortSignal.timeout(30000)});
        if(!remote.ok)throw Error('AI unavailable');const result=await remote.json();if(typeof result.text!=='string')throw Error('Invalid response');
        // Resolve server selections against our known catalogue before rendering.
        response={...result,items:(result.paths||[]).map(path=>knowledge.items.find(i=>i.path===path)).filter(Boolean)};
      }catch{response.text=label('AI replies are temporarily unavailable. Here is what the website guide can suggest:\n\n','Le risposte AI non sono disponibili al momento. Ecco cosa suggerisce la guida del sito:\n\n')+response.text;}
    }
    if(turn!==generation)return;
    pending.remove();state=response.state||state;mode();message('assistant',response.text,response);history.push({role:'assistant',content:response.text});history=history.slice(-20);
  }finally{if(turn===generation){busy=false;form.removeAttribute('aria-busy');$('#concierge-send').disabled=false;input.focus();}}
}
launch.addEventListener('click',async()=>{dialog.showModal();try{await load();}catch{log.replaceChildren();message('assistant','The guide is unavailable right now. You can still send a request to our team.',{inquiry:'general'});}input.focus();});
$('#concierge-close').addEventListener('click',()=>{dialog.close();launch.focus();});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
form.addEventListener('submit',e=>{e.preventDefault();if(knowledge)send(input.value.trim());});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
document.querySelectorAll('[data-concierge-prompt]').forEach(button=>button.addEventListener('click',()=>{if(knowledge)send(button.dataset.conciergePrompt);}));
ai.addEventListener('change',mode);
$('#concierge-handoff').addEventListener('click',()=>openRequest(state.intent==='villa'?'booking':'general'));
$('#concierge-reset').addEventListener('click',()=>{generation++;state={};history=[];busy=false;form.removeAttribute('aria-busy');$('#concierge-send').disabled=false;log.replaceChildren();input.value='';if(knowledge)message('assistant',guideReply(knowledge,'Hello').text);mode();input.focus();});
