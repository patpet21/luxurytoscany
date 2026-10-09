import fs from 'node:fs';
import path from 'node:path';
import {adapt,render,normalizePath,imageSrc,paths} from '../src/render.mjs';
const source=JSON.parse(fs.readFileSync('content/source.json','utf8'));
let pages=adapt(source);
const known=new Map(pages.map(p=>[p.path,p]));
function localLinks(html='') {
  return html.replace(/href="https?:\/\/(?:www\.)?supertuscany\.org([^"#]*)(#[^"]*)?"/g,(m,p,h)=>`href="${p||'/'}${h||''}"`)
    .replace(/href="https:\/\/info5442195\.wixsite\.com\/super-tuscany-1\/([^"]+)"/g,'href="/$1"')
    .replace(/target="_blank"/g,'target="_blank" rel="noopener noreferrer"');
}
for(const p of pages){
  p.sections=p.sections.map(s=>({...s,html:localLinks(s.html)}));
  if(p.facts){p.facts.area=p.facts.area||p.facts.livingSpace;p.facts.location=p.facts.location||p.facts.mapLocation?.formatted;}
  if(p.calendar?.includes('/calendar/ical/')){p.calendarFeed=p.calendar;const id=p.calendar.split('/calendar/ical/')[1].split('/')[0];p.calendar=`https://calendar.google.com/calendar/embed?src=${id}&ctz=Europe%2FRome`;}
  if(p.path===paths.videos)p.title='Films of Tuscany';
  if(p.path===paths.gallery)p.title='The Tuscany Photo Journal';
  if(p.path.includes('truffle-tasting'))p.title='Truffle Hunting';
  if(p.path.startsWith('/properties/')){
    p.sections=p.sections.filter(s=>!['Property Type','Bedrooms','Bathrooms','Living Space','Property Location'].includes(s.heading));
    const f=p.facts||{}, coords=f.mapLocation?.location;
    if(f.location)p.sections.push({heading:'Property Location',html:`<p>${f.location}</p>${coords?`<p><a href="https://www.google.com/maps/search/?api=1&query=${coords.latitude}%2C${coords.longitude}" target="_blank" rel="noopener noreferrer">View the villa location on Google Maps ↗</a></p>`:''}${p.calendarFeed?`<p><a href="${p.calendarFeed}">Download the original iCal availability feed</a></p>`:''}`});
  }
  if(p.path==='/about')p.sections=p.sections.map(s=>({...s,html:s.html.replace('a 47-year-old entrepreneur','an entrepreneur')}));
  if(p.path==='/see-tuscany')p.sections.push({heading:'Explore our visual journal',html:'<p><a href="/copy-of-videos">Browse the original photo collection ↗</a></p><p><a href="/videos">Watch our films of Tuscany ↗</a></p>'});
}
function extra(url,title,sections=[],images=[]) {if(!known.has(url)){const p={path:url,title,sections,images,videos:[]};pages.push(p);known.set(url,p);}}
extra('/contact','Contact Super Tuscany');extra('/thank-you','Thank you');extra('/404','Page not found');
const c=pages.find(p=>p.path==='/destinations');extra('/destination-list','Discover Tuscany',[],c?.images||[]);
const faq=pages.find(p=>p.path==='/everything-you-need-to-know-about-villa-rentals');extra('/faq','Frequently Asked Questions',faq?.sections||[],faq?.images||[]);
const policyPages={
  '/privacy-policy':[{heading:'Your information, handled with care',html:'<p>Super Tuscany uses the information you provide through this website to respond to enquiries, discuss villa availability and help arrange your requested services. Contact Christian Ferrara at <a href="mailto:info@supertuscany.org">info@supertuscany.org</a> for questions about how your information is handled.</p>'},{heading:'What the enquiry forms collect',html:'<p>Our forms request your name and email address, an optional phone number and your message. Stay requests also collect a preferred villa, arrival and departure dates and the number of adults and children. General information requests do not require travel dates.</p><p>Please avoid including payment information, identity documents or sensitive personal details in a general enquiry. Discuss any specific accommodation needs directly with our team.</p>'},{heading:'Hosting and enquiry processing',html:'<p>This website is designed to be hosted by Netlify. When deployed there with form detection enabled, Netlify processes enquiry submissions on behalf of Super Tuscany. Hosting providers may process technical information such as IP addresses and request logs to operate and protect the service.</p><p>Enquiry information is used to manage the request and related communications. Contact our team to ask about retention, access, correction or deletion of information, or to exercise applicable data protection rights.</p>'},{heading:'External calendars and videos',html:'<p>Embedded Google calendars and third-party videos load only when you choose to view them. The relevant provider may then receive technical information, including your IP address, and process it under its own privacy policy. Original photos and locally hosted videos are served as part of this website.</p><p>External links lead to independently operated websites.</p>'}],
  '/cookie-policy':[{heading:'How this website uses cookies',html:'<p>This website does not include advertising trackers or analytics scripts in its source code. The navigation, photo gallery and enquiry dialogs work without tracking cookies.</p><p>The hosting provider may use mechanisms needed to operate or protect the service.</p>'},{heading:'You choose when external content loads',html:'<p>Google calendars and externally embedded videos are not loaded automatically. Selecting “View the calendar” or “Load video” connects to that provider, which may use cookies or similar technologies under its own policies.</p><p>You can unload these embeds using “External media preferences” in the footer. You can also control cookies and stored data in your browser.</p>'},{heading:'Questions',html:'<p>Contact <a href="mailto:info@supertuscany.org">info@supertuscany.org</a> for questions about this website.</p>'}],
  '/accessibility-statement':[{heading:'A welcoming experience',html:'<p>Super Tuscany aims to make this website and its services welcoming to everyone. The website uses semantic headings, keyboard-accessible navigation, labelled form fields, image descriptions and reduced-motion support.</p>'},{heading:'Help with the website',html:'<p>If you encounter a barrier while using the website, please describe the page and the assistance you need by emailing <a href="mailto:info@supertuscany.org">info@supertuscany.org</a> or calling <a href="tel:+19177243124">+1 917 724 3124</a>.</p>'},{heading:'Planning an accessible stay',html:'<p>Each villa has different features. Contact our team to discuss your accommodation and accessibility requirements before booking so that we can check the details with the property owner.</p><p>Third-party calendars and videos may have their own accessibility limitations.</p>'}]
};
for(const [p,sections]of Object.entries(policyPages)){if(known.has(p))known.get(p).sections=sections;else extra(p,p.split('/').at(-1).replaceAll('-',' '),sections);}
source.socials=(source.socials||[]).map(s=>({...s}));
if(!source.socials.length){
  const html=fs.existsSync('content/source-html/home.html')?fs.readFileSync('content/source-html/home.html','utf8'):'';
  for(const [provider,label]of [['instagram.com','Instagram'],['facebook.com','Facebook']]){const m=html.match(new RegExp(`href="(https://(?:www\\.)?${provider.replace('.', '\\.')}[^"\\s]+)"`));if(m)source.socials.push({url:m[1].replaceAll('&amp;','&'),label});}
}
const root=path.resolve('dist');
if(root!==path.join(path.resolve('.'),'dist'))throw Error('Unexpected build directory');
if(fs.existsSync(root)){if(fs.realpathSync(root)!==root)throw Error('Build directory must not be a symlink');fs.rmSync(root,{recursive:true,force:true});}
fs.mkdirSync(root,{recursive:true});fs.cpSync('public',root,{recursive:true});
for(const page of pages){
  const p=normalizePath(page.path);
  if(p.includes('..'))throw Error(`Unsafe page path: ${p}`);
  const output=p==='/404'?path.join(root,'404.html'):path.join(root,p==='/'?'':p.slice(1),'index.html');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,render(page,pages,source));
}
const sitemap=pages.filter(p=>!['/404','/thank-you','/faq','/destination-list','/properties','/packages'].includes(p.path)).map(p=>`<url><loc>https://www.supertuscany.org${p.path==='/'?'':p.path.replaceAll('&','&amp;').replaceAll("'",'%27')}</loc></url>`).join('');
fs.writeFileSync(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}</urlset>`);
fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://www.supertuscany.org/sitemap.xml\n');
fs.writeFileSync(path.join(root,'_redirects'),'/photo-gallery /copy-of-videos 301\n/museums /copy-of-a-meal-with-an-italian-family 301\n/truffle-hunting /truffle-tasting 301\n/olive-oil-tasting /olive-oil-testing 301\n/faq /everything-you-need-to-know-about-villa-rentals 301\n/destination-list /destinations 301\n/properties /tuscany-villas-for-rent 301\n/packages /courses 301\n');
fs.writeFileSync('content/build-report.json',JSON.stringify({pages:pages.length,villas:pages.filter(p=>p.path.startsWith('/properties/')).length,builtAt:new Date().toISOString(),forms:['stay-request','information-request'],paths:pages.map(p=>p.path)},null,2));
console.log(`Built ${pages.length} pages and original media into dist/. Netlify forms: stay-request, information-request.`);
