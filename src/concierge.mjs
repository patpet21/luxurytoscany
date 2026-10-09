import {searchItems} from './finder.mjs';
const plain=html=>String(html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function conciergeKnowledge(data){
  const items=searchItems(data).map(({page,...item})=>({...item,title:page.title,path:page.path,image:page.images?.[0]?.local||'',description:plain((page.sections||[]).filter(s=>/description|amenities/i.test(s.heading)).map(s=>s.html||s.text).join(' ')||page.sections?.[0]?.html).slice(0,1200)}));
  const faq=data.get('/everything-you-need-to-know-about-villa-rentals');
  return {items,faq:plain(faq?.sections?.map(s=>s.html||s.text).join(' ')).slice(0,10000),contact:{email:'info@supertuscany.org',phone:'+1 917 724 3124'},liveAvailability:false};
}
export function conciergeWidget(){
  return `<button class="concierge-launch" id="concierge-launch" aria-haspopup="dialog" aria-controls="concierge-dialog"><span class="concierge-symbol" aria-hidden="true">✦</span><span>Your Tuscany concierge<small>A little local guidance</small></span></button>
  <dialog id="concierge-dialog" class="concierge-dialog" aria-labelledby="concierge-title"><header class="concierge-header"><span class="concierge-symbol" aria-hidden="true">✦</span><div><p class="eyebrow">SUPER TUSCANY</p><h2 id="concierge-title">Your personal <em>concierge.</em></h2><span id="concierge-mode">Website guide · not live support</span></div><button type="button" id="concierge-close" aria-label="Close concierge">×</button></header>
  <div class="concierge-messages" id="concierge-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Concierge conversation"></div>
  <div class="concierge-prompts" id="concierge-prompts"><button type="button" data-concierge-prompt="Help me choose a villa">Find my villa</button><button type="button" data-concierge-prompt="Help me choose an experience">Discover experiences</button><button type="button" data-concierge-prompt="How do I book?">Booking questions</button></div>
  <form id="concierge-form" class="concierge-composer"><label class="sr-only" for="concierge-input">Your question</label><textarea id="concierge-input" rows="2" maxlength="1200" required placeholder="A villa for 8 guests with a pool near Lucca…"></textarea><button type="submit" id="concierge-send" aria-label="Send your question">↑</button></form>
  <div class="concierge-bottom"><label id="concierge-ai-option" hidden><input type="checkbox" id="concierge-ai"> Use AI replies (messages shared with OpenAI)</label><p>Rates and availability are confirmed by our team. <a href="/privacy-policy">Privacy</a></p><div><button type="button" id="concierge-handoff">Send a request to our team ↗</button><button type="button" id="concierge-reset">Start again</button></div></div></dialog>`;
}
