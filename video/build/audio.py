# Builds the soundtrack from edl.json: narration slices with pauses, a synthesized
# music bed, and soft cue sounds. Output: work/mix.wav (48 kHz stereo), then
# normalised to about -14 LUFS by ffmpeg in render.py.
import json, subprocess, pathlib
import numpy as np

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
SR = 48000
edl = json.load(open(HERE / 'edl.json'))

def load_vo():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'vo.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

vo = load_vo()
segs = edl['segments']
total = sum(s['vo'][1] - s['vo'][0] + s['hold'] for s in segs) + edl.get('tail', 0)
N = int(total * SR) + SR
voice = np.zeros(N, np.float32)
starts = []
t = 0.0
for s in segs:
    a, b = s['vo']
    piece = vo[int(a * SR):int(b * SR)].copy()
    f = int(0.012 * SR); piece[:f] *= np.linspace(0, 1, f); piece[-f:] *= np.linspace(1, 0, f)
    i = int(t * SR); voice[i:i + len(piece)] += piece
    starts.append(t)
    t += (b - a) + s['hold']

# ---- music bed: slow chords, soft pad with gentle movement
rng = np.random.default_rng(7)
tt = np.arange(N) / SR
def midi(n): return 440 * 2 ** ((n - 69) / 12)
prog = [[50, 57, 62, 66, 69], [47, 54, 62, 66, 69], [43, 50, 59, 62, 66], [45, 52, 57, 61, 64]]  # Dmaj9-ish, Bm7, Gmaj7, A
bar = 4.0
pad = np.zeros(N, np.float32)
for k in range(int(total / bar) + 2):
    ch = prog[k % 4]; s0 = int(k * bar * SR); L = int((bar + 1.5) * SR)
    seg = np.arange(L) / SR
    env = np.minimum(seg / 1.2, 1) * np.exp(-np.maximum(seg - bar, 0) / 0.6)
    acc = np.zeros(L)
    for j, n in enumerate(ch):
        fr = midi(n)
        det = 1 + 0.0015 * (j - 2)
        acc += (np.sin(2 * np.pi * fr * det * seg) + 0.25 * np.sin(2 * np.pi * 2 * fr * seg) + 0.08 * np.sin(2 * np.pi * 3 * fr * seg)) / (1 + j * 0.25)
    acc *= env
    e = min(N, s0 + L)
    if e > s0: pad[s0:e] += acc[:e - s0]
# sparse pluck arpeggio, a calm pulse
pl = np.zeros(N, np.float32)
notes = [74, 78, 81, 78, 76, 74, 69, 71]
step = 0.5
for k in range(int(total / step)):
    if k % 2 and rng.random() < 0.5: continue
    ch = prog[int(k * step / bar) % 4]
    n = ch[2 + (k % 3)] + 12
    s0 = int(k * step * SR); L = int(1.2 * SR); seg = np.arange(L) / SR
    tone = np.sin(2 * np.pi * midi(n) * seg) * np.exp(-seg / 0.35) * (0.6 + 0.4 * rng.random())
    e = min(N, s0 + L)
    if e > s0: pl[s0:e] += tone[:e - s0]
music = 0.06 * pad / np.max(np.abs(pad)) + 0.035 * pl / np.max(np.abs(pl))
# fade in/out and duck under the voice
K = int(0.25 * SR); cs = np.concatenate([[0], np.cumsum(np.abs(voice), dtype=np.float64)])
env_v = np.zeros(N); lo = np.clip(np.arange(N) - K // 2, 0, N); hi = np.clip(np.arange(N) + K // 2, 0, N); env_v = (cs[hi] - cs[lo]) / K
duck = 1 - 0.45 * np.clip(env_v / 0.04, 0, 1)
music *= duck
fi = int(1.5 * SR); music[:fi] *= np.linspace(0, 1, fi)
fo = int(4 * SR); end = int(total * SR); music[end - fo:end] *= np.linspace(1, 0, fo); music[end:] = 0

# ---- cues: list of [segment index, local time, kind]
cues = np.zeros(N, np.float32)
def thud(i0):
    L = int(0.5 * SR); seg = np.arange(L) / SR
    body = np.sin(2 * np.pi * (70 + 40 * np.exp(-seg / 0.05)) * seg) * np.exp(-seg / 0.12)
    click = rng.standard_normal(L) * np.exp(-seg / 0.006) * 0.15
    x = (body + click) * 0.5; e = min(N, i0 + L); cues[i0:e] += x[:e - i0]
def chime(i0, up=True):
    for j, n in enumerate([74, 78, 81, 86] if up else [81]):
        L = int(1.4 * SR); seg = np.arange(L) / SR; s = i0 + int(j * 0.09 * SR)
        x = np.sin(2 * np.pi * midi(n) * seg) * np.exp(-seg / 0.4) * 0.18
        e = min(N, s + L); cues[s:e] += x[:e - s]
def tick(i0):
    L = int(0.08 * SR); seg = np.arange(L) / SR
    x = np.sin(2 * np.pi * 1800 * seg) * np.exp(-seg / 0.012) * 0.08; e = min(N, i0 + L); cues[i0:e] += x[:e - i0]
for si, lt, kind in edl.get('cues', []):
    i0 = int((starts[si] + lt + 0.017) * SR)
    {'thud': thud, 'chime': chime, 'tick': tick}[kind](i0)

mix = voice + music + cues
st = np.stack([mix, mix], 1)
# slight stereo width on music only
st[:, 0] += 0.01 * np.roll(music, 240); st[:, 1] -= 0.01 * np.roll(music, 240)
st = st[:int((total + 0.2) * SR)]
pk = np.max(np.abs(st)); st *= 0.7 / pk
out = ROOT / 'work' / 'mix.wav'
import wave
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
json.dump({'starts': starts, 'total': total}, open(ROOT / 'work' / 'timing.json', 'w'))
print('total', round(total, 2), 'seconds ->', out)
