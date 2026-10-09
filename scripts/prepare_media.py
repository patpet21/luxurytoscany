"""Keep original footage, optimize delivery, and set aside unreferenced downloads."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess, shutil, json, os

root=Path(__file__).resolve().parents[1]
assets=(root/'public/assets/original').resolve()
manifest=json.loads((root/'content/media-manifest.json').read_text(encoding='utf-8'))
referenced={Path(m['local']).name for m in manifest}
cache=(root/'.cache/unreferenced').resolve()
cache.mkdir(parents=True,exist_ok=True)
for f in assets.iterdir():
    if f.is_file() and f.name not in referenced:
        if f.resolve().parent!=assets: raise RuntimeError('Unexpected source path')
        target=cache/f.name
        if target.resolve().parent!=cache:raise RuntimeError('Unexpected target path')
        f.replace(target)
ffmpeg=shutil.which('ffmpeg')
ffprobe=shutil.which('ffprobe')
report=[]
def optimize(file):
    if file.stat().st_size<6*1024*1024 or not ffmpeg: return {'file':file.name,'optimized':False,'bytes':file.stat().st_size}
    original_size=file.stat().st_size
    temp=assets/(file.stem+'.optimized.mp4')
    command=[ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(file),'-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-threads','2',str(temp)]
    subprocess.run(command,check=True)
    def duration(p):
        return float(subprocess.check_output([ffprobe,'-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True).strip())
    if ffprobe and abs(duration(temp)-duration(file))>0.2: raise RuntimeError('Footage duration changed')
    if temp.stat().st_size<original_size:
        temp.replace(file)
        return {'file':file.name,'optimized':True,'originalBytes':original_size,'bytes':file.stat().st_size,'durationPreserved':True}
    temp.unlink()
    return {'file':file.name,'optimized':False,'bytes':original_size}
with ThreadPoolExecutor(max_workers=2) as executor:
    for item in executor.map(optimize,sorted(assets.glob('*.mp4'))):
        report.append(item)
        print(f"{item['file']}: {item['bytes']/1024/1024:.1f} MB",flush=True)
(root/'content/delivery-media.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(f"Referenced assets: {len(referenced)}. Delivery size: {sum(f.stat().st_size for f in assets.iterdir() if f.is_file())/1024/1024:.1f} MB")
