// Walkdown demo video: every frame is a pure function of (segment, local time).
// Drawn at 3840x2160. Footage frames are handed in by the driver as an <img>.
const W = 3840, H = 2160;
const C = {
  bg: '#F7F8F9', card: '#FFFFFF', ink: '#172B4D', sub: '#44546F', faint: '#8590A2', line: '#DCDFE4',
  slate: '#44546F', red: '#C9372C', redBg: '#FFECEB', green: '#1F845A', greenBg: '#DCFFF1', blue: '#0C66E4', blueBg: '#E9F2FF',
  orange: '#A54800', orangeBg: '#FFF3EB', purple: '#5E4DB2', dark: '#1D2125', term: '#161A1D',
};
const SANS = '"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif';
const MONO = '"Cascadia Mono","Consolas",monospace';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - clamp(x), 3);
const eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let ctx;
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fillRR(x, y, w, h, r, fill, stroke, lw = 4) { rr(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function shadow(blur = 60, y = 18, a = 0.12) { ctx.shadowColor = `rgba(9,30,66,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; }
function noShadow() { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
function text(s, x, y, { size = 64, weight = 400, color = C.ink, align = 'left', font = SANS, alpha = 1, base = 'alphabetic', track = 0 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (track) ctx.letterSpacing = `${track}px`;
  ctx.fillText(s, x, y); ctx.restore();
}
function wrap(s, maxW, size, weight = 400, font = SANS) {
  ctx.font = `${weight} ${size}px ${font}`; const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur); return lines;
}
function para(s, x, y, maxW, o = {}) { const size = o.size || 64; const lh = o.lh || size * 1.32; wrap(s, maxW, size, o.weight || 400, o.font || SANS).forEach((l, i) => text(l, x, y + i * lh, o)); }
function measure(s, size, weight = 400, font = SANS) { ctx.font = `${weight} ${size}px ${font}`; return ctx.measureText(s).width; }
function bg(color = C.bg) { ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }
function kicker(s, a = 1) { text(s.toUpperCase(), 240, 250, { size: 50, weight: 700, color: C.blue, alpha: a, track: 6 }); }
function check(x, y, s, color = '#fff', lw = 12) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.38); ctx.lineTo(x + s * 0.55, y - s * 0.4); ctx.stroke(); ctx.restore(); }
function cross(x, y, s, color = '#fff', lw = 12) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke(); ctx.restore(); }
function chip(s, x, y, { fg = C.ink, bgc = '#EBECF0', size = 52, weight = 700, alpha = 1, padX = 34, h = 92, align = 'left' } = {}) {
  const w = measure(s, size, weight) + padX * 2; const x0 = align === 'center' ? x - w / 2 : x;
  ctx.save(); ctx.globalAlpha *= alpha; fillRR(x0, y, w, h, h / 2 > 24 ? 20 : 12, bgc); text(s, x0 + padX, y + h / 2 + size * 0.36, { size, weight, color: fg }); ctx.restore(); return w;
}

// The Walkdown mark, drawn at its 144-unit design size scaled to `s`.
function logoMark(cx, cy, s, p = 1) {
  ctx.save(); ctx.translate(cx - s / 2, cy - s / 2); ctx.scale(s / 144, s / 144);
  fillRR(4, 4, 136, 136, 28, C.slate);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#B3B9C4'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(30, 72); ctx.lineTo(114, 72); ctx.stroke();
  const run = eio(prog(p, 0.1, 0.7));
  ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(30, 72); ctx.lineTo(lerp(30, 88, run), 72); ctx.stroke();
  const dot = (x, r, a) => { ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, 72, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; };
  dot(30, 11, eo(prog(p, 0, 0.15))); dot(59, 11, eo(prog(p, 0.3, 0.45)));
  const rp = back(prog(p, 0.62, 0.85));
  if (rp > 0) { ctx.save(); ctx.translate(88, 72); ctx.scale(rp, rp); ctx.fillStyle = C.red; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-5.5, -5.5); ctx.lineTo(5.5, 5.5); ctx.moveTo(5.5, -5.5); ctx.lineTo(-5.5, 5.5); ctx.stroke(); ctx.restore(); }
  ctx.globalAlpha = eo(prog(p, 0.8, 1)); ctx.strokeStyle = '#B3B9C4'; ctx.lineWidth = 4; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(114, 72, 8, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

// ---------------------------------------------------------------- drawn scenes
const REQ_TITLE = 'Bolus dose is rounded to the pump increment of 0.05 U';

function sceneHook(t) {
  bg();
  const cols = 40, rows = 19, cw = 70, ch = 46, gx = 86, gy = 74;
  const ox = (W - (cols - 1) * gx) / 2, oy = 470;
  const picks = [[6, 4], [21, 11], [33, 6]];
  const isPick = (c, r) => picks.findIndex(([pc, pr]) => pc === c && pr === r);
  // camera: push in on the first pick and pull a thread out of it
  const z = eio(prog(t, 5.6, 7.6));
  const [fc, fr] = picks[1]; const fx = ox + fc * gx, fy = oy + fr * gy;
  const scale = lerp(1, 2.6, z);
  ctx.save(); ctx.translate(W / 2, H / 2 + 80); ctx.scale(scale, scale); ctx.translate(-lerp(W / 2, fx, z), -lerp(H / 2 + 80, fy, z));
  const dim = eo(prog(t, 2.7, 3.7));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * gx, y = oy + r * gy;
    const d = Math.hypot(c - cols / 2, (r - rows / 2) * 1.6) / 26;
    const a = eo(prog(t, d * 1.4, d * 1.4 + 0.5));
    const pi = isPick(c, r);
    const pk = pi >= 0 ? back(prog(t, 4.25 + pi * 0.22, 4.75 + pi * 0.22)) : 0;
    ctx.save(); ctx.globalAlpha = a * (pi >= 0 ? 1 : lerp(1, 0.45, dim));
    ctx.translate(x, y); const s = 1 + pk * 0.55; ctx.scale(s, s);
    if (pk > 0) shadow(20, 6, 0.25 * pk);
    fillRR(-cw / 2, -ch / 2, cw, ch, 7, '#fff', pk > 0.01 ? C.blue : C.line, pk > 0.01 ? 4 : 2); noShadow();
    ctx.fillStyle = pk > 0.01 ? C.blue : '#C1C7D0'; ctx.fillRect(-cw / 2 + 10, -ch / 2 + 11, 30, 6);
    ctx.fillStyle = '#DFE1E6'; ctx.fillRect(-cw / 2 + 10, -ch / 2 + 24, 48, 5); ctx.fillRect(-cw / 2 + 10, -ch / 2 + 33, 38, 5);
    ctx.restore();
  }
  // thread
  const th = eo(prog(t, 6.0, 7.7));
  if (th > 0) { ctx.strokeStyle = C.blue; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx + cw * 0.8, fy); ctx.bezierCurveTo(fx + 200, fy + 40, fx + 300, fy - 30, fx + lerp(60, 900, th), fy); ctx.stroke(); }
  ctx.restore();
  // words
  const a1 = eo(prog(t, 0.2, 0.9)) * (1 - eo(prog(t, 5.4, 5.9)));
  text('2,000 requirements.', 240, 300, { size: 110, weight: 700, alpha: a1 * (1 - dim * 0.0) });
  text('An auditor reads a few.', 240, 410, { size: 110, weight: 400, color: C.sub, alpha: a1 * eo(prog(t, 3.9, 4.5)) });
}

function sceneChain(t) {
  bg();
  kicker('How an audit works', eo(prog(t, 0, 0.5)));
  // requirement card
  const ca = eo(prog(t, 0, 0.6));
  ctx.save(); ctx.globalAlpha = ca; shadow(); fillRR(240, 760, 760, 400, 28, '#fff', C.line, 3); noShadow();
  chip('GLU-6', 300, 820, { fg: C.blue, bgc: C.blueBg, size: 46, h: 80 });
  chip('Class C', 520, 820, { fg: C.red, bgc: C.redBg, size: 46, h: 80 });
  para(REQ_TITLE, 300, 990, 640, { size: 60, weight: 600, lh: 78 });
  ctx.restore();
  const st = [
    { x: 1360, label: 'Design', q: "Where's the design?", at: 0.0 },
    { x: 1900, label: 'Code', q: 'Show me the code.', at: 1.3 },
    { x: 2440, label: 'Test', q: 'Show me the test that proved it.', at: 2.65 },
    { x: 2980, label: 'Risk control', q: 'What could hurt a patient, and what stops it?', at: 4.5 },
    { x: 3520, label: 'Release', q: 'Which release shipped it?', at: 7.1 },
  ];
  const y = 960; const snap = 8.4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.line; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(1000, y); ctx.lineTo(3520, y); ctx.stroke();
  // walked portion
  let mx = 1000;
  for (let i = 0; i < 4; i++) { const p = eio(prog(t, st[i].at - 0.15, st[i].at + 0.55)); const from = i ? st[i - 1].x : 1000; if (p > 0) mx = lerp(from, st[i].x, p); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(1000, y); ctx.lineTo(mx, y); ctx.stroke();
  st.forEach((s, i) => {
    const a = eo(prog(t, s.at - 0.1, s.at + 0.4));
    const done = i < 3 && t > s.at + 0.6; const broken = i === 3 && t > snap; const unreached = i === 4;
    const r = 62;
    ctx.save();
    if (broken) { const b = back(prog(t, snap, snap + 0.4)); ctx.translate(s.x, y); ctx.scale(b, b); fillRR(-r, -r, 2 * r, 2 * r, r, C.red); cross(0, 0, 24); }
    else if (done) { const b = back(prog(t, s.at + 0.6, s.at + 0.95)); ctx.translate(s.x, y); ctx.scale(lerp(0.6, 1, b), lerp(0.6, 1, b)); fillRR(-r, -r, 2 * r, 2 * r, r, C.green); check(0, 4, 50); }
    else if (unreached) { ctx.setLineDash([14, 14]); fillRR(s.x - r, y - r, 2 * r, 2 * r, r, C.bg, '#B3B9C4', 8); ctx.setLineDash([]); }
    else { const pulse = i === 3 && t > s.at ? 0.5 + 0.5 * Math.sin((t - s.at) * 6) : 0; fillRR(s.x - r, y - r, 2 * r, 2 * r, r, '#fff', i === 3 && t > s.at ? `rgba(201,55,44,${0.4 + 0.5 * pulse})` : '#B3B9C4', 10); }
    ctx.restore();
    text(s.label, s.x, y + 150, { size: 54, weight: 700, align: 'center', color: broken ? C.red : C.ink });
    // question bubble
    const qa = a * (unreached && t > snap ? 0.35 : 1);
    if (qa > 0) { const lines = wrap(s.q, 440, 50, 500); const bh = lines.length * 64 + 60; const by = y - 140 - bh + (1 - a) * 30;
      ctx.save(); ctx.globalAlpha = qa; fillRR(s.x - 250, by, 500, bh, 22, broken ? C.redBg : '#fff', broken ? C.red : C.line, 3);
      lines.forEach((l, k) => text(l, s.x, by + 74 + k * 64, { size: 50, weight: 500, align: 'center', color: broken ? C.red : C.ink })); ctx.restore(); }
  });
  // marker
  const mk = eo(prog(t, 0, 0.4)); fillRR(mx - 26, y - 26, 52, 52, 26, C.blue); ctx.globalAlpha = 1;
  // finding stamp
  const sp = prog(t, snap + 0.6, snap + 1.0);
  if (sp > 0) {
    const s = lerp(1.35, 1, back(sp)); ctx.save(); ctx.globalAlpha = clamp(sp * 2); ctx.translate(2240, 1640); ctx.scale(s, s); ctx.rotate(-0.02);
    shadow(70, 24, 0.16); fillRR(-1000, -260, 2000, 520, 34, '#fff', C.red, 8); noShadow();
    text('MAJOR NONCONFORMITY', -930, -140, { size: 72, weight: 800, color: C.red, track: 4 });
    text('Safety-related requirement with no linked risk control.', -930, -40, { size: 58, weight: 500 });
    text('ISO 14971 §7.1  ·  ISO 14971 §7.2  ·  IEC 62304 §7.3', -930, 50, { size: 48, weight: 600, color: C.sub, font: MONO });
    text('“Which hazard does it relate to, and where is the risk control that covers it?”', -930, 170, { size: 50, weight: 400, color: C.sub });
    ctx.restore();
  }
  // severities
  const sev = [['Major', C.red, C.redBg, 11.04], ['Minor', C.orange, C.orangeBg, 11.55], ['Observation', C.blue, C.blueBg, 12.1]];
  let sx = 1240; sev.forEach(([s, fg, b, at]) => { const a = eo(prog(t, at, at + 0.35)); if (a > 0) sx += chip(s, sx, 1960 + (1 - a) * 20, { fg, bgc: b, size: 54, alpha: a, h: 100 }) + 30; });
  text('Three grades of finding', 240, 2025, { size: 52, weight: 600, color: C.sub, alpha: eo(prog(t, 11.0, 11.5)) });
}

function phone(x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(80, 30, 0.2); fillRR(-260, -520, 520, 1040, 80, C.dark); noShadow();
  fillRR(-236, -496, 472, 992, 60, '#fff');
  fillRR(-60, -480, 120, 30, 15, C.dark);
  text('GlucoLoop', -190, -360, { size: 46, weight: 700 });
  text('Fictional sample app', -190, -310, { size: 30, color: C.faint });
  text('Suggested dose', -190, -180, { size: 36, color: C.sub });
  const d = (4.35 * eo(prog(t, 1.6, 3.0))).toFixed(2);
  text(`${d} U`, -190, -60, { size: 130, weight: 700 });
  fillRR(-190, 20, 380, 4, 2, C.line);
  [['Carbs', '48 g'], ['Glucose', '162 mg/dL'], ['Insulin on board', '0.8 U']].forEach(([k, v], i) => { text(k, -190, 110 + i * 80, { size: 34, color: C.sub }); text(v, 190, 110 + i * 80, { size: 34, weight: 600, align: 'right' }); });
  fillRR(-190, 360, 380, 100, 50, C.blue); text('Deliver', 0, 425, { size: 42, weight: 700, color: '#fff', align: 'center' });
  ctx.restore();
}

function sceneWho(t) {
  bg();
  kicker('Who it is for', eo(prog(t, 0, 0.5)));
  const pa = eo(prog(t, 0.2, 1.0)); ctx.save(); ctx.globalAlpha = pa; phone(900, 1180 + (1 - pa) * 60, 1.45, t); ctx.restore();
  text('Teams building medical software', 1700, 560, { size: 96, weight: 700, alpha: eo(prog(t, 0.0, 0.6)) });
  const badges = ['IEC 62304', 'ISO 14971', 'ISO 13485', '21 CFR 820.30'];
  let bx = 1700; badges.forEach((b, i) => { const a = eo(prog(t, 1.2 + i * 0.25, 1.6 + i * 0.25)); bx += chip(b, bx, 650 + (1 - a) * 20, { fg: C.slate, bgc: '#fff', size: 50, alpha: a, h: 96 }) + 26; });
  // the audit decides whether it ships
  const ga = eo(prog(t, 4.9, 5.5));
  ctx.save(); ctx.globalAlpha = ga; shadow(); fillRR(1700, 900, 1900, 360, 30, '#fff', C.line, 3); noShadow();
  text('Release decision', 1780, 1000, { size: 46, weight: 700, color: C.sub });
  text('The audit decides if it ships.', 1780, 1110, { size: 76, weight: 600 });
  chip('Ship', 1780, 1150, { fg: C.green, bgc: C.greenBg, size: 44, h: 76 }); chip('Hold', 1960, 1150, { fg: C.red, bgc: C.redBg, size: 44, h: 76 });
  ctx.restore();
  // calendar
  const ca = eo(prog(t, 7.6, 8.2));
  ctx.save(); ctx.globalAlpha = ca; ctx.translate(0, (1 - ca) * 40); shadow(); fillRR(1700, 1360, 1900, 520, 30, '#fff', C.line, 3); noShadow();
  fillRR(1700, 1360, 1900, 120, [30, 30, 0, 0], C.red); text('Audit in 3 weeks', 1780, 1442, { size: 60, weight: 700, color: '#fff' });
  for (let i = 0; i < 21; i++) { const cx = 1790 + (i % 7) * 250, cy = 1540 + Math.floor(i / 7) * 110; const past = t > 8.4 + i * 0.05; fillRR(cx, cy, 200, 80, 14, past ? '#EBECF0' : '#F7F8F9'); if (i === 20) { fillRR(cx, cy, 200, 80, 14, C.redBg, C.red, 4); text('Audit', cx + 100, cy + 54, { size: 38, weight: 700, color: C.red, align: 'center' }); } }
  ctx.restore();
  text('Most gaps are found by the auditor.', 1700, 2010, { size: 64, weight: 600, color: C.red, alpha: eo(prog(t, 9.2, 9.8)) });
}

function sourceTile(x, y, w, h, title, sub, color, a, icon) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 30); shadow(50, 14, 0.1); fillRR(x, y, w, h, 28, '#fff', C.line, 3); noShadow();
  fillRR(x + 40, y + 40, 110, 110, 24, color); icon(x + 95, y + 95);
  text(title, x + 190, y + 108, { size: 64, weight: 700 });
  para(sub, x + 40, y + 240, w - 80, { size: 48, color: C.sub, lh: 64 });
  ctx.restore();
}
const icons = {
  jira: (x, y) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.rect(x - 28, y - 28, 56, 56); ctx.stroke(); check(x, y + 2, 30, '#fff', 8); },
  conf: (x, y) => { ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 30, y - 30 + i * 18, i === 3 ? 36 : 60, 9); },
  graph: (x, y) => { ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 7; const p = [[-26, 20], [0, -24], [26, 20]]; ctx.beginPath(); ctx.moveTo(...p[0]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]); ctx.closePath(); ctx.translate(x, y); ctx.stroke(); p.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 12, 0, 7); ctx.fill(); }); ctx.translate(-x, -y); },
};

function sceneTitle(t) {
  bg();
  // logo builds, then slides up as sources arrive
  const up = eio(prog(t, 3.2, 4.2));
  const ly = lerp(900, 560, up); const s = lerp(420, 260, up);
  logoMark(W / 2 - lerp(560, 420, up), ly, s, prog(t, 0.0, 1.6));
  text('Walkdown', W / 2 - lerp(300, 240, up), ly + lerp(70, 44, up), { size: lerp(240, 160, up), weight: 700, alpha: eo(prog(t, 0.6, 1.2)) });
  text('A practice auditor that lives inside Jira.', W / 2, lerp(1300, 860, up), { size: lerp(90, 74, up), weight: 400, color: C.sub, align: 'center', alpha: eo(prog(t, 1.4, 2.0)) });
  const tiles = [
    { t: 'Jira', s: 'Requirements, tests and risks', c: C.blue, at: 5.8, i: icons.jira },
    { t: 'Confluence', s: 'Design pages', c: '#1868DB', at: 8.6, i: icons.conf },
    { t: 'Teamwork Graph', s: 'Code changes from your repository', c: C.purple, at: 10.8, i: icons.graph },
  ];
  tiles.forEach((d, i) => { const a = eo(prog(t, d.at, d.at + 0.5)); if (a > 0) sourceTile(420 + i * 1040, 1180, 960, 480, d.t, d.s, d.c, a, d.i); });
  text('Reads the records your team already keeps', W / 2, 1880, { size: 58, weight: 600, color: C.sub, align: 'center', alpha: eo(prog(t, 3.6, 4.2)) });
}

function sceneMcp(t, data) {
  bg();
  kicker('Any AI tool, through MCP', eo(prog(t, 0, 0.5)));
  const a = eo(prog(t, 0.1, 0.6));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 40);
  shadow(90, 30, 0.25); fillRR(360, 380, 3120, 1600, 30, C.term); noShadow();
  fillRR(360, 380, 3120, 110, [30, 30, 0, 0], '#22272B');
  ['#F87168', '#F5CD47', '#4BCE97'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(440 + i * 70, 435, 18, 0, 7); ctx.fill(); });
  text('MCP client  ·  mcp.atlassian.com', 1920, 452, { size: 44, color: '#9FADBC', align: 'center', font: MONO });
  const req = '→ tools/call  trace-requirement  { "issueKey": "GLU-6" }';
  const n = Math.floor(req.length * prog(t, 0.5, 1.9));
  text(req.slice(0, n), 440, 600, { size: 54, color: '#4BCE97', font: MONO });
  const lines = [
    ['{', '#DEE4EA'],
    ['  "key": "GLU-6",', '#DEE4EA'],
    ['  "summary": "' + data.summary + '",', '#DEE4EA'],
    ['  "safetyClass": "C",  "safetyRelated": true,', '#DEE4EA'],
    ['  "steps": [ design ✓ confluence, implementation ✓ teamwork-graph,', '#9FADBC'],
    ['             verification ✓ jira, riskControl ✗, release · ],', '#9FADBC'],
    ['  "brokenAt": "riskControl",', '#F87168'],
    ['  "finding": {', '#DEE4EA'],
    ['    "severity": "major",', '#F87168'],
    ['    "clauses": [ "ISO 14971 §7.1", "ISO 14971 §7.2", "IEC 62304 §7.3" ],', '#F5CD47'],
    ['    "question": "Which hazard does it relate to, and where is', '#DEE4EA'],
    ['                 the risk control that covers it?"', '#DEE4EA'],
    ['  }', '#DEE4EA'], ['}', '#DEE4EA'],
  ];
  lines.forEach(([l, c], i) => { const la = prog(t, 2.2 + i * 0.12, 2.4 + i * 0.12); if (la > 0) text(l, 440, 720 + i * 82, { size: 50, color: c, font: MONO, alpha: la }); });
  ctx.restore();
  text('Real response from the Walkdown MCP tool', W / 2, 2080, { size: 44, color: C.faint, align: 'center', alpha: eo(prog(t, 3.5, 4)) });
}

function sceneUse(t) {
  bg();
  kicker('Use it on your own project', eo(prog(t, 0, 0.5)));
  text('Four habits. Walkdown does the rest.', 240, 420, { size: 100, weight: 700, alpha: eo(prog(t, 0.1, 0.7)) });
  const items = [
    { at: 1.9, h: 'Label your requirements', d: 'wd-requirement, plus the safety class', chips: [['wd-requirement', C.blue, C.blueBg], ['iec62304-class-c', C.red, C.redBg]] },
    { at: 3.3, h: 'Link each test', d: 'Link type: Verifies', chips: [['is verified by', C.green, C.greenBg]] },
    { at: 4.3, h: 'Link each hazard', d: 'Link type: Risk control', chips: [['mitigates', C.orange, C.orangeBg]] },
    { at: 5.5, h: 'Keep design pages and code linked', d: 'Confluence page links and commits on the ticket', chips: [['Confluence', '#1868DB', C.blueBg], ['Teamwork Graph', C.purple, '#F3F0FF']] },
  ];
  items.forEach((it, i) => {
    const a = eo(prog(t, it.at, it.at + 0.45)); if (a <= 0) return; const y = 620 + i * 330;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - a) * -40, 0);
    shadow(40, 10, 0.08); fillRR(240, y, 3360, 270, 26, '#fff', C.line, 3); noShadow();
    const cp = back(prog(t, it.at + 0.4, it.at + 0.8)); ctx.save(); ctx.translate(380, y + 135); ctx.scale(cp, cp); fillRR(-60, -60, 120, 120, 60, C.green); check(0, 4, 50); ctx.restore();
    text(it.h, 520, y + 120, { size: 68, weight: 700 }); text(it.d, 520, y + 200, { size: 50, color: C.sub });
    let cx = 3540; for (let k = it.chips.length - 1; k >= 0; k--) { const [s, fg, b] = it.chips[k]; const w = measure(s, 48, 700, MONO) + 68; cx -= w; ctx.save(); fillRR(cx, y + 89, w, 92, 16, b); text(s, cx + 34, y + 152, { size: 48, weight: 700, color: fg, font: MONO }); ctx.restore(); cx -= 24; }
    ctx.restore();
  });
}

function sceneHood(t) {
  bg();
  kicker('Under the hood', eo(prog(t, 0, 0.5)));
  const node = (x, y, w, h, title, sub, a, fill = '#fff', fg = C.ink) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; shadow(40, 10, 0.08); fillRR(x, y, w, h, 24, fill, fill === '#fff' ? C.line : null, 3); noShadow(); text(title, x + 44, y + (sub ? 92 : h / 2 + 22), { size: 60, weight: 700, color: fg }); if (sub) text(sub, x + 44, y + 160, { size: 44, color: fg === C.ink ? C.sub : '#C7D1DB' }); ctx.restore(); };
  const srcs = [['Jira', 'Requirements, tests, risks'], ['Confluence', 'Design pages'], ['Teamwork Graph', 'Commits and pull requests']];
  const outs = [['Walkdown page', 'Score, walk, log'], ['Rovo agent', 'Assign it a ticket'], ['MCP tools', 'Any AI client'], ['Release gate', 'Workflow validator']];
  const ea = eo(prog(t, 0.3, 0.9));
  srcs.forEach(([a, b], i) => node(240, 520 + i * 330, 1000, 230, a, b, eo(prog(t, 0.2 + i * 0.2, 0.7 + i * 0.2))));
  outs.forEach(([a, b], i) => node(2600, 400 + i * 300, 1000, 230, a, b, eo(prog(t, 1.4 + i * 0.2, 1.9 + i * 0.2))));
  // wires
  ctx.lineWidth = 6; ctx.strokeStyle = '#B3B9C4';
  const wire = (x1, y1, x2, y2, p) => { if (p <= 0) return; ctx.beginPath(); const N = 40; for (let k = 0; k <= N * p; k++) { const u = k / N; const x = lerp(x1, x2, u); const y = lerp(y1, y2, eio(u)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); };
  srcs.forEach((_, i) => wire(1240, 635 + i * 330, 1520, 1000, eo(prog(t, 0.8, 1.6))));
  outs.forEach((_, i) => wire(2320, 1000, 2600, 515 + i * 300, eo(prog(t, 1.6, 2.4))));
  ctx.save(); ctx.globalAlpha = ea; shadow(80, 24, 0.2); fillRR(1520, 760, 800, 480, 36, C.dark); noShadow();
  logoMark(1640, 880, 130, 1);
  text('Engine', 1740, 905, { size: 72, weight: 700, color: '#fff' });
  text('Fixed rules, no AI', 1600, 1060, { size: 54, weight: 600, color: '#C7D1DB' });
  text('Same records → same result', 1600, 1150, { size: 46, color: '#9FADBC' });
  ctx.restore();
  const badges = [['Rule-based grading', 1.3], ['Runs on Atlassian', 7.2], ['No data leaves your site', 8.8]];
  let bx = 240; badges.forEach(([s, at]) => { const a = eo(prog(t, at, at + 0.4)); if (a > 0) bx += chip(s, bx, 1820 + (1 - a) * 20, { fg: C.green, bgc: C.greenBg, size: 56, alpha: a, h: 110 }) + 30; });
}

function sceneEnd(t) {
  bg();
  logoMark(W / 2 - 560, 860, 420, prog(t, 0.0, 1.4));
  text('Walkdown', W / 2 - 300, 930, { size: 240, weight: 700, alpha: eo(prog(t, 0.3, 0.9)) });
  text('Rehearse your audit before the auditor does.', W / 2, 1300, { size: 96, color: C.sub, align: 'center', alpha: eo(prog(t, 0.9, 1.5)) });
  const a = eo(prog(t, 2.4, 3.0));
  text('github.com/efeaizesogie/walkdown', W / 2, 1640, { size: 62, color: C.blue, align: 'center', font: MONO, alpha: a });
  text('Built on Atlassian Forge  ·  Codegeist 2026', W / 2, 1760, { size: 52, color: C.faint, align: 'center', alpha: a });
}

// ---------------------------------------------------------------- footage scenes
// clip: { file, from, speed, dur, crop: [[t, cx, cy, w]...] } in source pixels (1920x855 frames)
function cropAt(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, ...a] = keys[i - 1]; const [t1, ...b] = keys[i]; const u = eio((t - t0) / (t1 - t0)); return a.map((v, k) => lerp(v, b[k], u)); }
  return keys[keys.length - 1].slice(1);
}
function drawFootage(img, crop) {
  const k = img.naturalWidth / 1920; const [cx, cy, w] = crop; const h = w * 9 / 16;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (cx - w / 2) * k, (cy - h / 2) * k, w * k, h * k, 0, 0, W, H);
}
function caption(label, t, dur) {
  if (!label) return; const a = eo(prog(t, 0.1, 0.5)) * (1 - eo(prog(t, dur - 0.3, dur)));
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 56px ${SANS}`; const w = ctx.measureText(label).width + 100;
  shadow(40, 10, 0.25); fillRR(120, 1880, w, 130, 65, 'rgba(23,43,77,0.94)'); noShadow(); text(label, 170, 1965, { size: 56, weight: 700, color: '#fff' }); ctx.restore();
}
// highlight boxes in source coordinates, mapped through the current crop
function highlight(crop, box, label, a, color = C.blue, side = 'below') {
  if (a <= 0) return; const [cx, cy, w] = crop; const h = w * 9 / 16; const sx = W / w;
  const X = (box[0] - (cx - w / 2)) * sx, Y = (box[1] - (cy - h / 2)) * sx, BW = box[2] * sx, BH = box[3] * sx;
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 10; ctx.strokeStyle = color; rr(X, Y, BW, BH, 24); ctx.stroke();
  if (label) { ctx.font = `700 60px ${SANS}`; const lw = ctx.measureText(label).width + 80; let lx = X, ly = side === 'below' ? Y + BH + 24 : Y - 24 - 120;
    lx = clamp(lx, 40, W - lw - 40); shadow(30, 8, 0.25); fillRR(lx, ly, lw, 120, 24, color); noShadow(); text(label, lx + 40, ly + 82, { size: 60, weight: 700, color: '#fff' }); }
  ctx.restore();
}

const SCENES = { hook: sceneHook, chain: sceneChain, who: sceneWho, title: sceneTitle, mcp: sceneMcp, use: sceneUse, hood: sceneHood, end: sceneEnd };

window.setup = (canvas) => { ctx = canvas.getContext('2d'); };
// spec: { kind:'drawn', scene, t, data } or { kind:'foot', t, crop, label, labelDur, highlights:[{box,label,a,color,side}] } with window.FOOT img loaded
window.renderFrame = (spec) => {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  if (spec.kind === 'drawn') SCENES[spec.scene](spec.t, spec.data || {});
  else {
    bg('#fff'); drawFootage(window.FOOT, spec.crop);
    (spec.highlights || []).forEach((h) => highlight(spec.crop, h.box, h.label, h.a, h.color, h.side));
    caption(spec.label, spec.lt, spec.labelDur);
  }
  // crossfade from previous frame handled by the driver
  ctx.restore();
};
