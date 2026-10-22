// Availability enquiries only. No booking transaction or fallback transport.
export const FORMSPREE_ENDPOINT='https://formspree.io/f/mojboraw';
const receiptTTL=30*60*1000;
const uncertain='We could not confirm delivery. Your details are still here. Check whether your enquiry arrived before trying again, to avoid sending it twice.';

export async function sendStayRequest(payload,{fetchImpl=fetch,timeout=20000}={}) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try {
    const response=await fetchImpl(FORMSPREE_ENDPOINT,{
      method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify(payload),credentials:'omit',redirect:'error',signal:controller.signal
    });
    let body;try{body=await response.json();}catch{return {status:'uncertain',message:uncertain};}
    if(response.ok&&body?.ok===true&&!body.errors?.length)return {status:'success'};
    if(response.status>=500||response.ok)return {status:'uncertain',message:uncertain};
    return {status:'error',message:response.status===429?
      'Too many requests. Please wait a few minutes before trying again. Your details have been kept.':
      response.status===400||response.status===422?
      'The enquiry service could not accept this request. Please check your email and details, then try again. If the problem continues, try later.':
      'The enquiry service is unavailable. Your details have been kept. Please try again later.'};
  } catch {return {status:'uncertain',message:uncertain};}
  finally {clearTimeout(timer);}
}

async function digest(value) {
  if(!globalThis.crypto?.subtle)return null;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function defaultStore(){try{return globalThis.sessionStorage;}catch{return undefined;}}

// Dependencies keep every test offline: the only production send is above.
export function createStaySubmission({read,validate,context,render,send=sendStayRequest,
  store=defaultStore(),now=Date.now,hash=digest,id=()=>crypto.randomUUID()}) {
  let busy=false;
  const accepted=new Map(),ids=new Map();
  function receipt(key) {
    let saved=accepted.get(key);
    if(!saved&&store){try{saved=JSON.parse(store.getItem('st-stay-receipt:'+key));}catch{}}
    return saved?.expiresAt>now()?saved:null;
  }
  const present=(status,extra={})=>{const state={status,...extra};render(state);return state;};
  return {
    get busy(){return busy;},
    async submit() {
      if(busy)return {status:'busy'};
      busy=true;let sending=false;
      try {
        const data=read(),serialized=JSON.stringify(data),initialContext=context();
        present('checking');
        const fingerprint=await hash(serialized),key=fingerprint||serialized;
        const current=()=>initialContext&&context()===initialContext&&JSON.stringify(read())===serialized;
        if(!current())return present('cancelled');
        const saved=receipt(key);
        if(saved)return present('success',{data,requestId:saved.requestId,duplicate:true});
        const check=await validate(data);
        if(!current())return present('changed',{message:'Your enquiry changed while dates were checked. Review your details and submit again.'});
        if(!check.ok)return present('invalid',{message:check.message});
        const requestId=ids.get(key)||id();ids.set(key,requestId);
        sending=true;present('sending');
        const result=await send({...data,...check.metadata,'request-id':requestId,
          subject:'Super Tuscany — availability enquiry (not a reservation)'});
        if(result.status==='success') {
          const saved={requestId,expiresAt:now()+receiptTTL};accepted.set(key,saved);
          // Persist only a hash and receipt metadata, never contact/stay details.
          if(fingerprint&&store){try{store.setItem('st-stay-receipt:'+fingerprint,JSON.stringify(saved));}catch{}}
          return present('success',{data,requestId});
        }
        return present(result.status,{message:result.message});
      } catch {return present(sending?'uncertain':'error',{message:sending?uncertain:'We could not verify your enquiry. Nothing was sent. Please refresh the calendar and try again.'});}
      finally {busy=false;}
    }
  };
}
