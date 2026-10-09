import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
if(!fs.existsSync(root))throw Error('Run npm run build first.');
const files=[];function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,d.name);d.isDirectory()?walk(f):files.push(f);}}walk(root);
const errors=[],warnings=[];let links=0,assets=0;
let allRendered='';
for(const f of files.filter(f=>f.endsWith('.html'))){
  const html=fs.readFileSync(f,'utf8');
  allRendered+=html;
  if(html.includes('\ufffd'))warnings.push(`Encoding replacement character in ${path.relative(root,f)}`);
  if(!/<h1[\s>]/.test(html))errors.push(`Missing H1: ${f}`);
  if(!/<title>[^<]+<\/title>/.test(html))errors.push(`Missing title: ${f}`);
  const general=html.match(/<form name="information-request"[\s\S]*?<\/form>/)?.[0];
  if(!general)errors.push(`Missing information form: ${f}`);
  if(general&&/type="date"|name="arrival"|name="departure"/.test(general))errors.push(`General enquiry has travel dates: ${f}`);
  const stay=html.match(/<form name="stay-request"[\s\S]*?<\/form>/)?.[0];
  if(!stay||!stay.includes('name="arrival"')||!stay.includes('name="departure"'))errors.push(`Missing stay dates: ${f}`);
  for(const m of html.matchAll(/(?:src|href|poster)="(\/[^"]+)"/g)){
    const raw=m[1].replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').split(/[?#]/)[0];let pathname;try{pathname=decodeURIComponent(raw);}catch{pathname=raw;}
    const target=path.join(root,pathname.slice(1));
    if(fs.existsSync(target)) {if(pathname.startsWith('/assets/'))assets++;else links++;continue;}
    if(fs.existsSync(path.join(target,'index.html'))){links++;continue;}
    errors.push(`Missing ${raw} referenced by ${path.relative(root,f)}`);
  }
  const gallery=html.match(/<script type="application\/json" id="gallery-data">([\s\S]*?)<\/script>/)?.[1];
  if(gallery)for(const img of JSON.parse(gallery)){assets++;if(!fs.existsSync(path.join(root,img.src.slice(1))))errors.push(`Missing gallery image: ${img.src}`);}
}
const source=JSON.parse(fs.readFileSync('content/source.json','utf8'));
for(const page of source.pages)for(const media of [...page.images,...page.videos]){
  if(/\b(logo|instagram|facebook|icon)\b/i.test(media.alt||''))continue;
  if(!allRendered.includes(media.local))errors.push(`Original media not exposed on any page: ${media.local}`);
}
for(const f of files){if(fs.statSync(f).size>99*1024*1024)errors.push(`File exceeds GitHub upload limit: ${f}`);}
console.log(`${files.filter(f=>f.endsWith('.html')).length} pages checked; ${links} internal links and ${assets} local asset references.`);
console.log([...new Set(warnings)].slice(0,12).join('\n'));
if(errors.length){console.error([...new Set(errors)].slice(0,50).join('\n'));console.error(`${errors.length} total errors`);process.exit(1);}console.log('PASS: links, assets, page titles and separate enquiry forms.');
