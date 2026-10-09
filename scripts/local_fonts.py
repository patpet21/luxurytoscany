from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import re,subprocess,hashlib
root=Path(__file__).resolve().parents[1]
css=(root/'.cache/fonts.css').read_text(encoding='utf-8')
out=root/'public/assets/fonts'
out.mkdir(parents=True,exist_ok=True)
urls=list(dict.fromkeys(re.findall(r'url\((https://[^)]+)\)',css)))
def download(url):
    filename=hashlib.sha256(url.encode()).hexdigest()[:16]+'.ttf'
    subprocess.run(['curl.exe','-L','-s','--fail',url,'-o',str(out/filename)],check=True)
    if not (out/filename).stat().st_size:raise RuntimeError('Empty font')
    return url,filename
with ThreadPoolExecutor(max_workers=4) as executor:
    for url,filename in executor.map(download,urls):css=css.replace(url,'/assets/fonts/'+filename)
(out/'fonts.css').write_text(css,encoding='utf-8')
for family in ['cormorantgaramond','manrope']:
    subprocess.run(['curl.exe','-L','-s','--fail',f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt','-o',str(out/(family+'-OFL.txt'))],check=True)
print(f'{len(urls)} font files and licenses hosted locally.')
