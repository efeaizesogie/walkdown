# Renders the whole film from edl.json at 3840x2160, 30 fps.
#   python render.py extract          -> pull the footage frames the EDL needs
#   python render.py frames A B ...    -> stills of output frames (checks)
#   python render.py video [workers]   -> chunks + mux with work/mix.wav
import sys, json, pathlib, subprocess, asyncio, math, shutil
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).parent.resolve()
ROOT = HERE.parent
WORK = ROOT / 'work'
FPS = 30
XF = 0.4  # crossfade seconds between segments
edl = json.load(open(HERE / 'edl.json'))
segs = edl['segments']
mcp = {'summary': json.load(open(ROOT / 'mcp-glu6.json'))['summary']}
DELOGO = 'delogo=x=1595:y=760:w=245:h=50'

# timeline
starts, t = [], 0.0
for s in segs:
    starts.append(t); s['dur'] = s['vo'][1] - s['vo'][0] + s['hold']; t += s['dur']
TOTAL = t + edl.get('tail', 0)
NF = int(round(TOTAL * FPS))

def clip_dir(si, ci): return WORK / 'frames' / f's{si:02d}c{ci}'

def foot_at(si, lt):
    """Footage clip, source frame path and crop for segment si at local time lt."""
    s = segs[si]; acc = 0.0
    for ci, c in enumerate(s['clips']):
        if lt < acc + c['dur'] or ci == len(s['clips']) - 1:
            u = min(max(lt - acc, 0), c['dur'])
            n = int(round(u * c.get('speed', 1) * FPS)) + 1
            n = min(n, int(c['dur'] * c.get('speed', 1) * FPS) + 1)
            return ci, u, clip_dir(si, ci) / f'{n:05d}.jpg', c
        acc += c['dur']

def spec_for(si, lt):
    s = segs[si]
    if s['kind'] == 'drawn':
        return {'kind': 'drawn', 'scene': s['scene'], 't': lt, 'data': mcp}, None
    ci, u, path, c = foot_at(si, lt)
    hl = []
    for h in c.get('highlights', []):
        a0, a1 = h['at']; a = max(0, min(1, (u - a0) / 0.35)) * (1 - max(0, min(1, (u - a1) / 0.35)))
        if a > 0: hl.append({'box': h['box'], 'label': h.get('label'), 'a': a, 'color': h.get('color', '#0C66E4'), 'side': h.get('side', 'below')})
    from_keys = c['crop']
    return {'kind': 'foot', 'cropKeys': from_keys, 'u': u, 'label': c.get('label'), 'lt': u, 'labelDur': c['dur'], 'highlights': hl}, path

def frame_specs(i):
    """Returns [(spec, footpath, alpha)] layers for output frame i."""
    tt = i / FPS
    si = max(k for k in range(len(segs)) if starts[k] <= tt + 1e-9) if tt < starts[-1] + segs[-1]['dur'] else len(segs) - 1
    lt = tt - starts[si]
    layers = []
    if si > 0 and lt < XF and segs[si].get('xf', True):
        p = segs[si - 1]; layers.append((*spec_for(si - 1, p['dur'] + lt), 1.0))
        layers.append((*spec_for(si, lt), lt / XF))
    else:
        layers.append((*spec_for(si, lt), 1.0))
    return layers

def extract():
    for si, s in enumerate(segs):
        if s['kind'] != 'foot': continue
        for ci, c in enumerate(s['clips']):
            d = clip_dir(si, ci)
            if d.exists() and any(d.iterdir()): continue
            d.mkdir(parents=True, exist_ok=True)
            span = c['dur'] * c.get('speed', 1) + 0.2
            subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(c['from']), '-i', str(ROOT / 'takes4k' / c['take']), '-t', f'{span:.3f}',
                            '-vf', f'fps={FPS}', '-q:v', '3', str(d / '%05d.jpg')], check=True)
            print('extracted', d.name, len(list(d.iterdir())))

JS = """async ([layers]) => {
  const c = document.getElementById('c'); const g = c.getContext('2d');
  const tmp = window.TMP || (window.TMP = Object.assign(document.createElement('canvas'), {width: 3840, height: 2160}));
  for (let k = 0; k < layers.length; k++) {
    const [spec, src, a] = layers[k];
    if (src) await loadFoot(src);
    if (spec.kind === 'foot') spec.crop = cropAt(spec.cropKeys, spec.u);
    if (k === 0) { renderFrame(spec); }
    else { const t2 = tmp.getContext('2d'); t2.drawImage(c, 0, 0); renderFrame(spec); const cur = tmp;
           // tmp holds the previous layer; draw it back over with (1 - a)
           g.save(); g.globalAlpha = 1 - a; g.drawImage(cur, 0, 0); g.restore(); }
  }
}"""

async def open_page(p):
    b = await p.chromium.launch(args=['--allow-file-access-from-files'])
    pg = await b.new_page(viewport={'width': 3840, 'height': 2160})
    pg.on('pageerror', lambda e: print('pageerror:', e))
    await pg.goto((HERE / 'page.html').as_uri())
    return b, pg

async def draw(pg, i):
    layers = [[spec, path.as_uri() if path else None, a] for spec, path, a in frame_specs(i)]
    await pg.evaluate(JS, [layers])
    return await pg.screenshot(type='jpeg', quality=94, timeout=0, clip={'x': 0, 'y': 0, 'width': 3840, 'height': 2160})

async def stills(nums):
    out = WORK / 'check'; out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b, pg = await open_page(p)
        for i in nums:
            (out / f'f{i:05d}.jpg').write_bytes(await draw(pg, i)); print(out / f'f{i:05d}.jpg')
        await b.close()

async def worker(p, k, queue, done):
    b, pg = await open_page(p)
    while queue:
        ci, a, z = queue.pop(0)
        path = WORK / 'chunks' / f'c{ci:02d}.mp4'
        tmp = path.with_suffix('.part.mp4')
        enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
                                '-c:v', 'h264_qsv', '-preset', 'veryslow', '-b:v', '45M', '-maxrate', '60M', '-bufsize', '90M', '-pix_fmt', 'nv12', '-f', 'mp4', str(tmp)], stdin=subprocess.PIPE)
        for i in range(a, z):
            enc.stdin.write(await draw(pg, i))
        enc.stdin.close(); enc.wait(); tmp.replace(path)
        done.append(ci); print(f'worker {k}: chunk {ci} done ({len(done)} chunks)', flush=True)
    await b.close()

async def video(nw):
    (WORK / 'chunks').mkdir(parents=True, exist_ok=True)
    CH = 240
    chunks = [(ci, a, min(NF, a + CH)) for ci, a in enumerate(range(0, NF, CH))]
    queue = [c for c in chunks if not (WORK / 'chunks' / f'c{c[0]:02d}.mp4').exists()]
    print(f'{len(queue)} of {len(chunks)} chunks to render', flush=True)
    done = []
    async with async_playwright() as p:
        await asyncio.gather(*[worker(p, k, queue, done) for k in range(nw)])
    paths = [WORK / 'chunks' / f'c{ci:02d}.mp4' for ci, _, _ in chunks]
    lst = WORK / 'chunks' / 'list.txt'; lst.write_text(''.join(f"file '{q.as_posix()}'\n" for q in paths))
    out = ROOT / 'walkdown-demo-4k.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(WORK / 'mix.wav'),
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
                    '-af', 'loudnorm=I=-14:TP=-2:LRA=11', '-ar', '48000', '-shortest', '-movflags', '+faststart', str(out)], check=True)
    print('done', out, flush=True)

if __name__ == '__main__':
    cmd = sys.argv[1]
    print(f'total {TOTAL:.2f}s, {NF} frames')
    if cmd == 'extract': extract()
    elif cmd == 'frames': asyncio.run(stills([int(x) for x in sys.argv[2:]]))
    elif cmd == 'times': asyncio.run(stills([int(float(x) * FPS) for x in sys.argv[2:]]))
    elif cmd == 'video': asyncio.run(video(int(sys.argv[2]) if len(sys.argv) > 2 else 3))
