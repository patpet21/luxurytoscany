"""Extract real still frames from the original films; never modify the footage."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess, shutil, json

root = Path(__file__).resolve().parents[1]
ffmpeg = shutil.which('ffmpeg')
if not ffmpeg:
    raise RuntimeError('Install FFmpeg to regenerate video posters.')
out = root / 'public/assets/posters'
out.mkdir(parents=True, exist_ok=True)

def extract(video):
    poster = out / (video.stem + '.jpg')
    if not poster.exists():
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin',
                        '-ss', '2', '-i', str(video), '-frames:v', '1',
                        '-vf', 'scale=960:-2', '-q:v', '3', '-threads', '1',
                        str(poster)], check=True)
    if not poster.exists() or poster.stat().st_size == 0:
        raise RuntimeError(f'Poster missing: {video.name}')
    return {'video': '/assets/original/' + video.name,
            'poster': '/assets/posters/' + poster.name, 'frameAtSeconds': 2}

with ThreadPoolExecutor(max_workers=2) as pool:
    frames = list(pool.map(extract, sorted((root/'public/assets/original').glob('*.mp4'))))
(root/'content/video-posters.json').write_text(json.dumps(frames, indent=2), encoding='utf-8')
print(f'{len(frames)} original video posters ready.')
