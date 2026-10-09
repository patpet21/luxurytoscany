from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'content/source.json').read_text(encoding='utf-8'))
refs=set()
def walk(value):
    if isinstance(value,dict):
        for v in value.values():walk(v)
    elif isinstance(value,list):
        for v in value:walk(v)
    elif isinstance(value,str) and value.startswith('/assets/original/'):
        refs.add(Path(value).name)
walk(source)
assets=(root/'public/assets/original').resolve()
cache=(root/'.cache/unreferenced').resolve()
cache.mkdir(parents=True,exist_ok=True)
for file in assets.iterdir():
    if file.is_file() and file.name not in refs:
        target=cache/file.name
        if file.resolve().parent!=assets or target.resolve().parent!=cache:raise RuntimeError('Unexpected file path')
        file.replace(target)
manifest_path=root/'content/media-manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
manifest=[m for m in manifest if Path(m['local']).name in refs]
missing=[]
for m in manifest:
    file=assets/Path(m['local']).name
    if not file.exists():missing.append(str(file))
    else:m['deliveryBytes']=file.stat().st_size
if missing:raise RuntimeError('Missing original media: '+str(missing))
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
delivery_path=root/'content/delivery-media.json'
report=json.loads(delivery_path.read_text(encoding='utf-8'))
report=[m for m in report if m['file'] in refs]
delivery_path.write_text(json.dumps(report,indent=2),encoding='utf-8')
inventory_path=root/'content/inventory.json'
inventory=json.loads(inventory_path.read_text(encoding='utf-8'))
inventory['delivery']={'files':len(refs),'bytes':sum((assets/f).stat().st_size for f in refs),'videos':len(report),'originalFootagePreserved':True}
inventory_path.write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(inventory['delivery']))
