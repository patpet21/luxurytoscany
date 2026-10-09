import concurrent.futures as cf
import hashlib, html, json, re, subprocess, time
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE='https://www.supertuscany.org'
CONTENT=ROOT/'content'; RAW=CONTENT/'source-html'; ASSETS=ROOT/'public/assets/original'
for p in (CONTENT,RAW,ASSETS): p.mkdir(parents=True,exist_ok=True)
def fetch(url,path):
    if path.exists() and path.stat().st_size>100: return True
    result=subprocess.run(['curl.exe','-L','--fail','--silent','--show-error','--retry','2','--max-time','80',url,'-o',str(path)],capture_output=True)
    return result.returncode==0 and path.exists() and path.stat().st_size>100
def clean(text):
    text=repair(text).replace('\xa0',' ').replace('\u200b','')
    for a,b in {'Accomodations':'Accommodations','Accomodation':'Accommodation','Incuded':'Included','Jewlery':'Jewelry','Staty':'Stay','pricin g':'pricing','hectars':'hectares','everyting':'everything','magnificient':'magnificent','mantained':'maintained'}.items():text=text.replace(a,b)
    return re.sub(r'\s+',' ',text).strip()
def repair(text):
    text=text.replace('m\ufffd','m²').replace('\ufffd 2024','© 2024').replace('Citt\ufffd','Città').replace('Localit\ufffd','Località')
    text=re.sub(r'\ufffd(?=\s*\d)','€',text)
    text=re.sub(r'(?<=\d)\ufffd','€',text)
    return text.replace('\ufffd','’')
def pathof(url): return repair(unquote(urlparse(url).path).rstrip('/') or '/')
def sourcefile(url): return RAW/(hashlib.sha1(url.encode()).hexdigest()[:16]+'.html')
def internal(u): return urlparse(u).netloc in ('www.supertuscany.org','supertuscany.org') and not re.search(r'\.(xml|pdf|jpg|png)$',urlparse(u).path)
def semantic(tag):
    x=BeautifulSoup(str(tag),'html.parser')
    for a in x.find_all():
        for k in list(a.attrs):
            if k not in ('href','src','alt','colspan','rowspan','scope'): del a[k]
        if a.name in ('span','font'):a.unwrap()
    return clean(str(x))
def canonical_image(u):
    u=html.unescape(u)
    if u.startswith('wix:image://v1/'):return 'https://static.wixstatic.com/media/'+u.split('/')[3]
    if 'static.wixstatic.com/media/' in u:return u.split('/v1/')[0].split('?')[0]
    return u if u.startswith('http') and re.search(r'\.(jpg|jpeg|png|webp|gif|svg)(?:[?#]|$)',u,re.I) else None
def asset(u):
    ext=Path(urlparse(u).path).suffix.lower() or '.jpg'
    name=hashlib.sha1(u.encode()).hexdigest()[:18]+ext
    return '/assets/original/'+name
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def category(path):
    if path=='/':return 'home'
    if path.startswith('/properties/'):return 'villa'
    if path.startswith('/destinations/'):return 'city'
    if path.startswith('/courses/'):return 'package'
    if any(x in path for x in ['policy','statement']):return 'legal'
    if path in ['/about','/why-supertuscany','/for-villa-owners','/everything-you-need-to-know-about-villa-rentals']:return 'about'
    if 'videos' in path:return 'gallery'
    if path in ['/properties','/tuscany-villas-for-rent']:return 'villas'
    if path in ['/destinations','/see-tuscany']:return 'destinations'
    if path in ['/courses','/packages']:return 'packages'
    return 'experience'

homepath=sourcefile(BASE+'/')
if not fetch(BASE+'/',homepath):raise RuntimeError('Homepage could not be fetched')
homesoup=BeautifulSoup(homepath.read_text(encoding='utf8'),'html.parser')
nav=[];queue={BASE+'/'}
for a in homesoup.find_all('a',href=True):
    u=urljoin(BASE,a['href']).split('#')[0].split('?')[0]
    if internal(u):
        queue.add(u)
        label=clean(a.get_text(' ',strip=True))
        if label and not any(n['path']==pathof(u) for n in nav):nav.append({'label':label,'path':pathof(u),'url':u})
seen=set();pages=[];errors=[]
def readpage(url):
    p=sourcefile(url)
    if not fetch(url,p):return None
    return BeautifulSoup(p.read_text(encoding='utf8'),'html.parser')
while queue-seen:
    batch=sorted(queue-seen);seen.update(batch)
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        results=list(pool.map(readpage,batch))
    for url,s in zip(batch,results):
        if s is None:errors.append(url);continue
        main=s.find('main')
        if not main:errors.append(url);continue
        title=clean((main.find('h1') or s.find('title')).get_text(' ',strip=True))
        title=title.split('|')[0].strip()
        if pathof(url)=='/videos':title='Videos'
        if pathof(url)=='/copy-of-videos':title='Photo Gallery'
        links=[]
        for a in main.find_all('a',href=True):
            u=urljoin(url,a['href'])
            links.append({'url':u,'label':clean(a.get_text(' ',strip=True))})
            if internal(u) and '#' not in u:queue.add(u.split('?')[0])
        sections=[];current={'heading':'','html':'','text':''};blocks=[]
        for t in main.find_all(['h1','h2','h3','h4','p','ul','ol','table','blockquote']):
            if t.find_parent(['table','ul','ol','blockquote']):continue
            txt=clean(t.get_text(' ',strip=True))
            if not txt:continue
            if t.name in ('h1','h2','h3','h4'):
                if current['html']:sections.append(current)
                current={'heading':txt,'html':'','text':''}
            else:
                out=semantic(t);current['html']+=out;current['text']+=(('\n' if current['text'] else '')+txt)
            blocks.append(semantic(t))
        if current['html'] or current['heading']:sections.append(current)
        images=[];video=[];facts={};records=[]
        def addimage(u,alt=''):
            u=canonical_image(u)
            if u and not any(i['url']==u for i in images):images.append({'url':u,'local':asset(u),'alt':clean(alt) or title})
        for img in main.find_all('img'):addimage(img.get('src',''),img.get('alt',''))
        for u in re.findall(r'https://static\.wixstatic\.com/media/[^"\s<>]+',str(main)):addimage(u)
        script=s.find('script',id='wix-warmup-data')
        warm={}
        if script:
            try:warm=json.loads(script.string)
            except Exception:pass
        db=warm.get('appsWarmupData',{}).get('dataBinding',{}).get('dataStore',{}).get('recordsByCollectionId',{})
        for coll,items in db.items():
            for record in items.values():
                if clean(str(record.get('title',''))).lower()==title.lower() or (category(pathof(url))=='gallery' and coll=='GalleryPictures') or (category(pathof(url))=='villa' and len(items)==1 and coll=='Properties'):
                    records.append(record)
                    for obj in walk(record):
                        for key in ('src','uri','image'):
                            if isinstance(obj.get(key),str) and (category(pathof(url))!='gallery' or obj[key].split('/')[3] in str(main) if obj[key].startswith('wix:') else True):addimage(obj[key],obj.get('title') or obj.get('alt',''))
                    for key in ('bedrooms','bathrooms','livingSpace','mapLocation','price','propertieType'):
                        if key in record:facts[key]=record[key]
        ids={el.get('id') for el in main.find_all(id=True)}
        scoped={k:v for update in warm.get('platform',{}).get('ssrPropsUpdates',[]) for k,v in update.items() if k in ids}
        for obj in walk([scoped,records]):
            if isinstance(obj.get('uri'),str):addimage(obj['uri'],obj.get('title',''))
        # Video links and embeds are preserved, including Wix-hosted MP4 media.
        video_urls=set(re.findall(r'https?://(?:video\.wixstatic\.com|www\.youtube\.com|youtu\.be|player\.vimeo\.com)[^"\s<>\\]+',str(main)))
        for tag in main.find_all(attrs={'data-video-info':True}):
            info=json.loads(tag['data-video-info'])
            if info.get('videoId'):video_urls.add('https://video.wixstatic.com/video/'+info['videoId']+'/1080p/mp4/file.mp4')
        appmedia={k:v for k,v in warm.get('appsWarmupData',{}).items() if k!='dataBinding'}
        for obj in walk(appmedia):
            if isinstance(obj.get('metaData'),dict):
                meta=obj['metaData'];u=obj.get('mediaUrl','')
                if meta.get('type')=='image':addimage('https://static.wixstatic.com/media/'+u,meta.get('name',''))
                if meta.get('type')=='video' and u:video_urls.add('https://video.wixstatic.com/video/'+u+'/1080p/mp4/file.mp4')
        for obj in walk([scoped,records]):
            for k,v in obj.items():
                if isinstance(v,str) and (v.startswith('https://video.wixstatic.com/') or v.startswith('wix:video://')):
                    if v.startswith('wix:video://'):
                        if category(pathof(url))=='gallery' and v.split('/')[3] not in str(main):continue
                        v='https://video.wixstatic.com/video/'+v.split('/')[3]+'/1080p/mp4/file.mp4'
                    video_urls.add(v)
                if k in ('videoId','videoUrl') and isinstance(v,str) and re.fullmatch('[A-Za-z0-9_-]{11}',v):video_urls.add('https://www.youtube.com/embed/'+v)
        for u in sorted(video_urls):
            u=html.unescape(u).rstrip(';,').replace('/1080p/mp4/','/720p/mp4/')
            typ='mp4' if 'wixstatic' in u or '.mp4' in u else ('youtube' if 'youtu' in u else 'vimeo')
            video.append({'url':u,'local':asset(u) if typ=='mp4' else None,'type':typ,'poster':None})
        calendars=[l['url'] for l in links if 'calendar.google.com' in l['url']]
        tables=[semantic(t) for t in main.find_all('table')]
        for label,key in [('Bedrooms','bedrooms'),('Bathrooms','bathrooms'),('Living Space','area')]:
            heading=next((h for h in main.find_all(['h2','h3']) if clean(h.get_text())==label),None)
            if heading:
                value=heading.find_next('p')
                if value:
                    value=clean(value.get_text())
                    facts[key]=int(value) if value.isdigit() else value
        if isinstance(facts.get('mapLocation'),dict):facts['location']=clean(facts['mapLocation'].get('formatted',''))
        facts=json.loads(repair(json.dumps(facts,ensure_ascii=False)))
        page={'url':url,'path':pathof(url),'title':title,'category':category(pathof(url)),'headings':[clean(h.get_text(' ',strip=True)) for h in main.find_all(['h1','h2','h3'])],'mainHtml':''.join(blocks),'text':clean(main.get_text(' ',strip=True)),'sections':sections,'images':images,'videos':video,'calendar':calendars[0] if calendars else None,'links':links,'facts':facts,'tables':tables}
        if not any(p['path']==page['path'] for p in pages):pages.append(page)
    print('Pages:',len(pages),'pending:',len(queue-seen),flush=True)

logo='https://static.wixstatic.com/media/faa96e_6ca472a257044dee8f54d4a555c78f76~mv2.png'
media={i['url']:i for p in pages for i in p['images']}
media[logo]={'url':logo,'local':asset(logo),'alt':'Super Tuscany'}
for p in pages:
    for v in p['videos']:
        if v['local']:media[v['url']]=v
def download(item):
    u=item['url'];local=ROOT/'public'/item['local'].lstrip('/')
    # Retain original imagery at a web-suitable 1600px, PNG logos unmodified.
    request=u
    if 'static.wixstatic.com/media/' in u and u.lower().endswith(('.jpg','.jpeg')):request=u+'/v1/fit/w_1600,h_1600,q_85/'+u.rsplit('/',1)[-1]
    ok=fetch(request,local)
    return {**item,'downloaded':ok,'bytes':local.stat().st_size if ok else 0,'downloadUrl':request}
footer=homesoup.find('footer')
source={'source':BASE,'capturedAt':'2026-10-09','logo':{'url':logo,'local':asset(logo)},'nav':nav,'footerText':clean(footer.get_text(' ',strip=True)) if footer else '', 'pages':pages}
(CONTENT/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2),encoding='utf8')
print('Downloading',len(media),'assets',flush=True)
with cf.ThreadPoolExecutor(max_workers=12) as pool:manifest=list(pool.map(download,media.values()))
(CONTENT/'media-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
inventory={'pageCount':len(pages),'imageCount':sum(len(p['images']) for p in pages),'uniqueMedia':len(media),'downloadedMedia':sum(m['downloaded'] for m in manifest),'videoCount':sum(len(p['videos']) for p in pages),'errors':errors,'pages':[{'path':p['path'],'title':p['title'],'category':p['category'],'sections':len(p['sections']),'images':len(p['images']),'videos':len(p['videos']),'tables':len(p['tables'])} for p in pages]}
(CONTENT/'inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in inventory.items() if k!='pages'}),flush=True)
