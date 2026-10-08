import * as THREE from 'three';
import { CLEAR, COUNTRIES, CITY_DOTS, LAND, GREENLAND } from './data';

/*
 * The 3D world behind the portfolio: one WebGL scene with five dioramas
 * (island takeoff, globe, bar, baggage carousel, arrivals hall) that the
 * camera visits as the page scrolls. createTravelWorld() wires itself to the
 * markup rendered by TravelPortfolio.jsx (matched by element id) and returns a
 * dispose function for React's effect cleanup.
 */

const JOB_BOTTLES = [
  { shape: 'tall', color: '#7A1F2B', cap: '#F5A524', liq: '#B23A48' },
  { shape: 'square', color: '#C9822B', cap: '#1D2733', liq: '#E0A24A' },
  { shape: 'bottle', color: '#3FAE6A', cap: '#E8C23A', liq: '#B9E3A0' },
  { shape: 'beer', color: '#6E3A1E', cap: '#E2B54C', liq: '#E0A24A' },
  { shape: 'bottle', color: '#9ED5DA', cap: '#E8576B', liq: '#CBEAEE' }
];
const BAG_COLORS = [
  ['#E8576B', '#1D2733'], ['#2FA4A9', '#1D2733'], ['#F5A524', '#1D2733'], ['#4E6E92', '#FFF8EC'], ['#A88BDB', '#1D2733'],
  ['#3FAE6A', '#1D2733'], ['#C9822B', '#1D2733'], ['#7A1F2B', '#FFF8EC'], ['#9ED5DA', '#1D2733'], ['#E2B54C', '#1D2733']
];
const shortDates = (d) => {
  const parts = d.split(/\s*[-–—,]\s*/).filter(Boolean);
  const fmt = (p) => (/present/i.test(p) ? 'NOW' : p.replace(/^(\w{3})\w*\s+\d{2}(\d{2})$/, (m, mon, yy) => mon.toUpperCase() + ' ' + yy));
  return fmt(parts[0]) + '–' + fmt(parts[parts.length - 1]);
};
const bagTag = (name) => {
  const words = name.split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join('') : name).toUpperCase().slice(0, 10);
};

export function createTravelWorld({ experiences, projects, sendPostcard, contactEmail, signName }) {
  const CONTACT_EMAIL = contactEmail, SIGN_NAME = signName;
  let alive = true, rafId = 0;
  const disposers = [];
  const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); disposers.push(() => el.removeEventListener(ev, fn, opts)); };
  ['chips', 'rows', 'bag-chips', 'bag-list', 'reasons', 'talk-points', 'c-tabs'].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = ''; });

  const JOBS = experiences.map((x, i) => Object.assign({}, JOB_BOTTLES[i % JOB_BOTTLES.length], {
    num: String(experiences.length - i).padStart(2, '0'),
    years: shortDates(x.date),
    status: /present/i.test(x.date) ? 'NOW' : 'LANDED',
    title: x.title, company: x.company_name, short: x.company_name.split(' — ')[0], date: x.date, points: x.points
  }));
  const PROJECTS = projects.map((p, i) => ({
    num: String(i + 1).padStart(2, '0'), tag: bagTag(p.name), name: p.name, description: p.description,
    image: p.image, link: p.source_code_link, tags: (p.tags || []).map((t) => t.name),
    color: BAG_COLORS[i % BAG_COLORS.length][0], ink: BAG_COLORS[i % BAG_COLORS.length][1]
  }));

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const outBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const D2R = Math.PI / 180;
  const INK = 0x1D2733;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);

  /* ================= renderer & helpers ================= */
  const host = document.querySelector('.travel');
  const canvas = document.createElement('canvas');
  canvas.id = 'world';
  canvas.setAttribute('aria-hidden', 'true');
  host.insertBefore(canvas, host.firstChild);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); }
  catch (e) { canvas.style.background = '#13213A'; return () => { canvas.remove(); }; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2400);

  const grad = new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = THREE.NearestFilter; grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
  const toon = (color, extra) => new THREE.MeshToonMaterial(Object.assign({ color: new THREE.Color(color), gradientMap: grad }, extra || {}));
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

  function outline(mesh, k) {
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const size = new THREE.Vector3(), c = new THREE.Vector3();
    geo.boundingBox.getSize(size); geo.boundingBox.getCenter(c);
    const o = new THREE.Mesh(geo, inkMat);
    const sx = 1 + 2 * k / Math.max(size.x, 1e-3), sy = 1 + 2 * k / Math.max(size.y, 1e-3), sz = 1 + 2 * k / Math.max(size.z, 1e-3);
    o.scale.set(sx, sy, sz);
    o.position.set(c.x * (1 - sx), c.y * (1 - sy), c.z * (1 - sz));
    o.userData.isOutline = true;
    mesh.add(o);
    return mesh;
  }
  function part(geo, color, opts) {
    opts = opts || {};
    const m = new THREE.Mesh(geo, opts.mat || toon(color));
    m.castShadow = opts.cast !== false;
    m.receiveShadow = !!opts.recv;
    if (opts.k !== 0) outline(m, opts.k || 0.06);
    return m;
  }
  function rr(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(w, d, thick, r, bevel) {
    const opts = { depth: thick, bevelEnabled: !!bevel, curveSegments: 10 };
    if (bevel) Object.assign(opts, { bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3 });
    const g = new THREE.ExtrudeGeometry(rr(w, d, r), opts);
    g.rotateX(-Math.PI / 2);
    return g;
  }
  const textFns = [];
  function textTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const redraw = () => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
    redraw(); textFns.push(redraw);
    return t;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => textFns.forEach((f) => f()));
  const FONT_LOADS = [['700 40px "Cinzel"', 'SINGLE MALT'], ['40px "Alfa Slab One"', 'LAGER'], ['italic 700 40px "Cormorant Garamond"', 'Barossa'], ['40px "Special Elite"', 'TODDY'], ['40px "Lilita One"', 'ARAK'], ['40px "Zen Antique"', 'リキュールウイスキービール'], ['40px "Yuji Syuku"', '清酒長野大阪'], ['40px "Ma Shan Zheng"', '高粱酒云南'], ['40px "Black Han Sans"', '소주'], ['700 40px "Gowun Batang"', '고소리술'], ['800 40px "Bricolage Grotesque"', 'Aa'], ['600 40px "JetBrains Mono"', 'Aa']];
  if (document.fonts && document.fonts.load) Promise.all(FONT_LOADS.map((f) => document.fonts.load(f[0], f[1]).catch(() => null))).then(() => { if (!alive) return; textFns.forEach((fn) => fn()); try { renderCard(); } catch (e) {} });

  function limb(r, color) {
    const m = part(new THREE.CylinderGeometry(r, r, 1, 12), color, { k: 0.035 });
    return m;
  }
  function setLimb(m, a, b) {
    const d = b.clone().sub(a);
    const len = Math.max(0.001, d.length());
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  }
  function ik(S, H, L, pole) {
    const d = H.clone().sub(S);
    const dist = Math.min(d.length(), 2 * L - 0.001);
    const along = d.normalize();
    const a = dist / 2, h = Math.sqrt(Math.max(0, L * L - a * a));
    const perp = pole.clone().sub(along.clone().multiplyScalar(pole.dot(along))).normalize();
    return S.clone().add(along.clone().multiplyScalar(a)).add(perp.multiplyScalar(h));
  }
  function track(keys, t) {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const k1 = keys[i], k2 = keys[i + 1], k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const u = clamp((t - k1[0]) / (k2[0] - k1[0]));
    const out = [];
    for (let c = 1; c < k1.length; c++) {
      const p0 = k0[c], p1 = k1[c], p2 = k2[c], p3 = k3[c];
      out.push(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u));
    }
    return out;
  }
  const blinkScale = (now, period, off) => { const ph = (now + off) % period; return ph < 140 ? Math.max(0.12, Math.abs(ph - 70) / 70) : 1; };

  /* ---------- bottles ---------- */
  const PROFILES = {
    bottle: [[0, 0], [0.15, 0], [0.17, 0.025], [0.17, 0.52], [0.163, 0.56], [0.145, 0.605], [0.115, 0.64], [0.083, 0.665], [0.062, 0.7], [0.056, 0.82], [0.066, 0.835], [0.066, 0.86], [0, 0.86]],
    tall: [[0, 0], [0.13, 0], [0.15, 0.025], [0.15, 0.56], [0.142, 0.61], [0.12, 0.66], [0.085, 0.7], [0.06, 0.74], [0.052, 0.95], [0.06, 0.965], [0.06, 0.985], [0, 0.985]],
    beer: [[0, 0], [0.14, 0], [0.16, 0.025], [0.16, 0.4], [0.15, 0.45], [0.12, 0.5], [0.08, 0.56], [0.058, 0.62], [0.05, 0.74], [0.058, 0.752], [0.058, 0.77], [0, 0.77]],
    soju: [[0, 0], [0.13, 0], [0.15, 0.02], [0.15, 0.34], [0.142, 0.39], [0.115, 0.45], [0.08, 0.51], [0.058, 0.57], [0.052, 0.71], [0.058, 0.722], [0.058, 0.74], [0, 0.74]],
    jug: [[0, 0], [0.14, 0], [0.19, 0.04], [0.225, 0.12], [0.24, 0.22], [0.235, 0.32], [0.2, 0.42], [0.13, 0.5], [0.075, 0.55], [0.065, 0.6], [0.08, 0.63], [0.08, 0.66], [0, 0.66]]
  };
  const LABEL = { bottle: { r: 0.17, y: 0.27, h: 0.3, L: 3.5 }, tall: { r: 0.15, y: 0.31, h: 0.36, L: 3.5 }, beer: { r: 0.16, y: 0.215, h: 0.22, L: 3.5 }, soju: { r: 0.15, y: 0.19, h: 0.22, L: 3.5 }, jug: { r: 0.238, y: 0.26, h: 0.24, L: 1.05 } };
  const BOTTLE_H = { bottle: 0.92, tall: 1.03, beer: 0.82, soju: 0.8, jug: 0.78, square: 0.84, mug: 0.64 };
  const NECK_Y = { bottle: 0.75, tall: 0.8, beer: 0.68, soju: 0.64 };
  const FT = {
    disp: '800 #px "Bricolage Grotesque", Arial, sans-serif', mono: '600 #px "JetBrains Mono", ui-monospace, monospace',
    cinzel: '700 #px "Cinzel", Georgia, serif', slab: '400 #px "Alfa Slab One", Georgia, serif', gara: 'italic 700 #px "Cormorant Garamond", Georgia, serif',
    type: '400 #px "Special Elite", "Courier New", monospace', lilita: '400 #px "Lilita One", Arial, sans-serif',
    zen: '400 #px "Zen Antique", serif', yuji: '400 #px "Yuji Syuku", serif', mashan: '400 #px "Ma Shan Zheng", serif', han: '400 #px "Black Han Sans", sans-serif', batang: '700 #px "Gowun Batang", serif'
  };
  const fnt = (k, size) => FT[k].replace('#', size.toFixed(1));
  const rng = (seed) => { let x = seed; return () => (x = (x * 9301 + 49297) % 233280) / 233280; };
  const LA = {
    paper(g, w, h, base, speck, seed) { g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed || 7); g.fillStyle = speck; const n = w * h / 650; for (let i = 0; i < n; i++) { g.globalAlpha = 0.05 + r() * 0.13; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 1.6); } g.globalAlpha = 1; },
    fibers(g, w, h, color, seed) { const r = rng(seed); g.strokeStyle = color; g.lineWidth = 1.3; for (let i = 0; i < w * h / 2200; i++) { g.globalAlpha = 0.12 + r() * 0.18; const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 6 + r() * 20; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 8, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 8, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } g.globalAlpha = 1; },
    text(g, t, x, y, k, size, color, maxW) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.font = fnt(k, size); if (maxW) { const m = g.measureText(t).width; if (m > maxW) { size *= maxW / m; g.font = fnt(k, size); } } g.fillText(t, x, y); return size; },
    spaced(g, t, x, y, k, size, color, track, maxW) {
      g.font = fnt(k, size); const ch = Array.from(t); let ws = ch.map((c) => g.measureText(c).width); let tw = ws.reduce((a, b) => a + b, 0) + track * size * (ch.length - 1);
      if (maxW && tw > maxW) { const f = maxW / tw; size *= f; g.font = fnt(k, size); ws = ch.map((c) => g.measureText(c).width); tw = ws.reduce((a, b) => a + b, 0) + track * size * (ch.length - 1); }
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = color; let cx = x - tw / 2;
      ch.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + track * size; });
    },
    block(g, t, x, y, k, maxW, maxH, maxSize, color, lh) {
      const words = t.split(' '), tries = [[t]]; lh = lh || 1.02;
      for (let i = 1; i < words.length; i++) tries.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
      let best = null;
      tries.forEach((lines) => { g.font = fnt(k, maxSize); const wm = Math.max.apply(null, lines.map((l) => g.measureText(l).width)); const fs = Math.min(maxSize, maxSize * maxW / wm, maxH / (lines.length * lh)); if (!best || fs > best.fs * 1.12) best = { lines: lines, fs: fs }; });
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.font = fnt(k, best.fs);
      best.lines.forEach((l, i) => g.fillText(l, x, y + (i - (best.lines.length - 1) / 2) * best.fs * lh));
      return best;
    },
    vtext(g, t, x, y, k, size, color, gap) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.font = fnt(k, size); Array.from(t).forEach((c, i) => g.fillText(c, x, y + size * 0.5 + i * size * (gap || 1))); },
    rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); },
    frame(g, x, y, w, h, color, lw, gap) { g.strokeStyle = color; g.lineWidth = lw; g.strokeRect(x, y, w, h); if (gap) { g.lineWidth = lw * 0.45; g.strokeRect(x + gap, y + gap, w - gap * 2, h - gap * 2); } },
    sunburst(g, cx, cy, r, n, color) { g.fillStyle = color; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 0.5) / n * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath(); g.fill(); } },
    bolt(g, cx, cy, s, fill, stroke) { const P = [[0.18, -1], [-0.42, 0.12], [-0.04, 0.12], [-0.2, 1], [0.44, -0.16], [0.06, -0.16], [0.28, -1]]; g.beginPath(); P.forEach((p, i) => i ? g.lineTo(cx + p[0] * s, cy + p[1] * s) : g.moveTo(cx + p[0] * s, cy + p[1] * s)); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = s * 0.09; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); },
    peaks(g, x0, x1, base, pts, fill, stroke, lw) { g.beginPath(); g.moveTo(x0, base); pts.forEach((p) => g.lineTo(p[0], base - p[1])); g.lineTo(x1, base); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 3; g.lineJoin = 'round'; g.stroke(); } },
    waves(g, x0, x1, y, amp, len, color, lw, rows, gap) { g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; for (let r = 0; r < rows; r++) { g.beginPath(); for (let x = x0; x <= x1; x += 4) { const yy = y + r * gap + Math.sin((x + r * len * 0.5) / len * Math.PI * 2) * amp; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); } },
    seal(g, cx, cy, s, color, txt, k) {
      g.save(); g.translate(cx, cy); g.rotate(-0.06); LA.rr(g, -s / 2, -s / 2, s, s, s * 0.12); g.fillStyle = color; g.fill();
      g.strokeStyle = '#FFF1E2'; g.lineWidth = s * 0.05; LA.rr(g, -s * 0.39, -s * 0.39, s * 0.78, s * 0.78, s * 0.06); g.stroke();
      g.fillStyle = '#FFF1E2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = fnt(k, s * 0.34);
      const ch = Array.from(txt); if (ch.length === 2) { g.fillText(ch[0], 0, -s * 0.17); g.fillText(ch[1], 0, s * 0.17); } else g.fillText(txt, 0, 0); g.restore();
    },
    leaf(g, x, y, len, ang, fill, stroke) { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = len * 0.06; g.stroke(); g.beginPath(); g.moveTo(len * 0.1, 0); g.lineTo(len * 0.85, 0); g.lineWidth = len * 0.035; g.stroke(); } g.restore(); },
    sprig(g, x, y, len, ang, n, fill, stroke) { const dx = Math.cos(ang), dy = Math.sin(ang); g.strokeStyle = stroke; g.lineWidth = len * 0.03; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * len, y + dy * len); g.stroke(); for (let i = 1; i <= n; i++) { const t = i / (n + 0.6), px = x + dx * len * t, py = y + dy * len * t, sd = i % 2 ? 1 : -1; LA.leaf(g, px, py, len * 0.32, ang + sd * 0.75, fill, stroke); } LA.leaf(g, x + dx * len, y + dy * len, len * 0.3, ang, fill, stroke); },
    palm(g, x, base, s, trunk, frond) { g.strokeStyle = trunk; g.lineWidth = s * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + s * 0.22, base - s * 0.5, x + s * 0.08, base - s * 0.9); g.stroke(); const tx = x + s * 0.08, ty = base - s * 0.9; g.fillStyle = frond; [-2.9, -2.3, -1.7, -1.1, -0.5, 0.05].forEach((a) => { const ex = tx + Math.cos(a) * s * 0.52, ey = ty + Math.sin(a) * s * 0.36 + s * 0.16; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * s * 0.32, ty + Math.sin(a) * s * 0.34 - s * 0.1, ex, ey); g.quadraticCurveTo(tx + Math.cos(a) * s * 0.26, ty + Math.sin(a) * s * 0.18, tx, ty); g.fill(); }); g.fillStyle = trunk; [[-0.05, 0.05], [0.06, 0.07], [0.0, 0.1]].forEach((c) => { g.beginPath(); g.arc(tx + c[0] * s, ty + c[1] * s, s * 0.045, 0, Math.PI * 2); g.fill(); }); },
    flower(g, x, y, r, petal, center, stroke) { for (let i = 0; i < 5; i++) { g.save(); g.translate(x, y); g.rotate(i / 5 * Math.PI * 2 + 0.3); g.beginPath(); g.ellipse(0, -r * 0.55, r * 0.34, r * 0.58, 0.35, 0, Math.PI * 2); g.fillStyle = petal; g.fill(); g.lineWidth = r * 0.07; g.strokeStyle = stroke; g.stroke(); g.restore(); } g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fillStyle = center; g.fill(); },
    meander(g, x0, x1, y, u, color, lw) { g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'miter'; for (let x = x0; x < x1; x += u * 1.1) { g.beginPath(); g.moveTo(x, y + u); g.lineTo(x, y); g.lineTo(x + u, y); g.lineTo(x + u, y + u * 0.72); g.lineTo(x + u * 0.3, y + u * 0.72); g.lineTo(x + u * 0.3, y + u * 0.32); g.lineTo(x + u * 0.66, y + u * 0.32); g.stroke(); } },
    batik(g, w, y, h, base, a, b) { g.fillStyle = base; g.fillRect(0, y, w, h); g.fillStyle = a; for (let x = 0; x < w + h; x += h * 0.9) { g.beginPath(); g.moveTo(x, y + h * 0.15); g.lineTo(x + h * 0.32, y + h * 0.5); g.lineTo(x, y + h * 0.85); g.lineTo(x - h * 0.32, y + h * 0.5); g.closePath(); g.fill(); } g.fillStyle = b; for (let x = h * 0.45; x < w + h; x += h * 0.9) { g.beginPath(); g.arc(x, y + h * 0.5, h * 0.08, 0, Math.PI * 2); g.fill(); } g.fillRect(0, y + h * 0.04, w, h * 0.04); g.fillRect(0, y + h * 0.92, w, h * 0.04); },
    castle(g, cx, base, s, wall, roof, line) {
      g.lineWidth = s * 0.03; g.strokeStyle = line; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(cx - 0.44 * s, base); g.lineTo(cx + 0.44 * s, base); g.lineTo(cx + 0.33 * s, base - 0.18 * s); g.lineTo(cx - 0.33 * s, base - 0.18 * s); g.closePath(); g.fillStyle = wall; g.fill(); g.stroke();
      let y = base - 0.18 * s;
      for (let i = 0; i < 3; i++) {
        const bw = (0.46 - 0.12 * i) * s; g.fillStyle = wall; g.fillRect(cx - bw / 2, y - 0.11 * s, bw, 0.11 * s); g.strokeRect(cx - bw / 2, y - 0.11 * s, bw, 0.11 * s); y -= 0.11 * s;
        const rw = bw * 1.42; g.beginPath(); g.moveTo(cx - rw / 2, y + 0.015 * s); g.quadraticCurveTo(cx - rw * 0.2, y - 0.015 * s, cx, y - 0.1 * s); g.quadraticCurveTo(cx + rw * 0.2, y - 0.015 * s, cx + rw / 2, y + 0.015 * s); g.closePath(); g.fillStyle = roof; g.fill(); g.stroke(); y -= 0.05 * s;
      }
      g.fillStyle = roof; g.beginPath(); g.arc(cx, y - 0.03 * s, 0.025 * s, 0, Math.PI * 2); g.fill();
    },
    skyline(g, x0, x1, base, color, towerX, seed) { const r = rng(seed || 3); g.fillStyle = color; for (let x = x0; x < x1;) { const bw = 14 + r() * 26, bh = 20 + r() * 50; g.fillRect(x, base - bh, bw - 3, bh); x += bw; } g.fillRect(towerX - 4, base - 150, 8, 150); g.beginPath(); g.ellipse(towerX, base - 118, 15, 9, 0, 0, Math.PI * 2); g.fill(); g.fillRect(towerX - 1.5, base - 185, 3, 40); g.beginPath(); g.moveTo(towerX - 24, base); g.lineTo(towerX, base - 60); g.lineTo(towerX + 24, base); g.fill(); },
    eagle(g, cx, cy, s, color) { g.fillStyle = color; [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + sd * s * 0.35, cy - s * 0.42, cx + sd * s * 1.05, cy - s * 0.3); g.lineTo(cx + sd * s * 0.95, cy - s * 0.18); g.lineTo(cx + sd * s * 1.0, cy - s * 0.1); g.lineTo(cx + sd * s * 0.86, cy - s * 0.04); g.lineTo(cx + sd * s * 0.9, cy + s * 0.05); g.quadraticCurveTo(cx + sd * s * 0.45, cy + s * 0.0, cx + sd * s * 0.12, cy + s * 0.22); g.closePath(); g.fill(); }); g.beginPath(); g.moveTo(cx - s * 0.13, cy + s * 0.15); g.lineTo(cx, cy + s * 0.62); g.lineTo(cx + s * 0.13, cy + s * 0.15); g.closePath(); g.fill(); g.beginPath(); g.arc(cx, cy - s * 0.06, s * 0.12, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(cx + s * 0.08, cy - s * 0.08); g.lineTo(cx + s * 0.24, cy - s * 0.02); g.lineTo(cx + s * 0.08, cy + s * 0.01); g.fill(); },
    hills(g, x0, x1, base, top, back, front, rowC, line) {
      const hill = (yT, c, off) => { g.beginPath(); g.moveTo(x0, base); g.lineTo(x0, yT + off); g.bezierCurveTo(x0 + (x1 - x0) * 0.3, yT - off, x0 + (x1 - x0) * 0.6, yT + off * 2, x1, yT); g.lineTo(x1, base); g.closePath(); g.fillStyle = c; g.fill(); g.strokeStyle = line; g.lineWidth = 2.5; g.stroke(); };
      hill(top, back, 30); g.save(); hill(top + (base - top) * 0.35, front, -22); g.clip(); g.strokeStyle = rowC; g.lineWidth = 2; for (let x = x0 - 400; x < x1 + 40; x += 13) { g.beginPath(); g.moveTo(x, base); g.lineTo(x + 260, top); g.stroke(); } g.restore();
    },
    house(g, x, base, s, wall, roof, line) { g.lineWidth = s * 0.05; g.strokeStyle = line; g.fillStyle = wall; g.fillRect(x - s * 0.5, base - s * 0.5, s, s * 0.5); g.strokeRect(x - s * 0.5, base - s * 0.5, s, s * 0.5); g.beginPath(); g.moveTo(x - s * 0.62, base - s * 0.48); g.lineTo(x, base - s * 0.9); g.lineTo(x + s * 0.62, base - s * 0.48); g.closePath(); g.fillStyle = roof; g.fill(); g.stroke(); g.fillStyle = line; g.fillRect(x - s * 0.1, base - s * 0.3, s * 0.2, s * 0.3); g.fillRect(x + s * 0.22, base - s * 0.86, s * 0.1, s * 0.2); },
    arcText(g, t, cx, cy, r, k, size, color, track) { g.font = fnt(k, size); g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; const ch = Array.from(t), ws = ch.map((c) => g.measureText(c).width + size * (track || 0.1)); const tot = ws.reduce((a, b) => a + b, 0); let a = -Math.PI / 2 - tot / (2 * r); ch.forEach((c, i) => { const aw = ws[i] / r, ang = a + aw / 2; g.save(); g.translate(cx + r * Math.cos(ang), cy + r * Math.sin(ang)); g.rotate(ang + Math.PI / 2); g.fillText(c, 0, 0); g.restore(); a += aw; }); },
    diamondPath(g, w, h, k) { const cx = w / 2, cy = h / 2, rx = w * k, ry = h * k; g.beginPath(); g.moveTo(cx, cy - ry); g.lineTo(cx + rx, cy); g.lineTo(cx, cy + ry); g.lineTo(cx - rx, cy); g.closePath(); }
  };
  const INKC = '#1D2733';
  const STYLES = {
    retro(g, w, h, P, s) {
      LA.paper(g, w, h, '#F6EBD3', '#B98A4A', 3);
      g.save(); g.beginPath(); g.rect(0, h * 0.18, w, h * 0.64); g.clip(); LA.sunburst(g, P.cx, h * 0.52, h * 1.1, 40, 'rgba(226,181,76,0.3)'); g.restore();
      g.fillStyle = '#C8323F'; g.fillRect(0, 0, w, h * 0.16); g.fillRect(0, h * 0.84, w, h * 0.16);
      g.fillStyle = '#E2B54C'; g.fillRect(0, h * 0.16, w, h * 0.022); g.fillRect(0, h * 0.818, w, h * 0.022);
      for (let x = 12; x < w; x += 36) [h * 0.08, h * 0.92].forEach((y) => { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.closePath(); g.fill(); });
      LA.text(g, 'リキュール', P.cx, h * 0.27, 'zen', h * 0.07, INKC);
      const pw = P.pw * 0.94, ph = h * 0.3, py = h * 0.36;
      LA.rr(g, P.cx - pw / 2, py, pw, ph, ph * 0.2); g.fillStyle = '#C8323F'; g.fill(); g.lineWidth = h * 0.012; g.strokeStyle = INKC; g.stroke();
      LA.rr(g, P.cx - pw / 2 + 9, py + 9, pw - 18, ph - 18, ph * 0.15); g.lineWidth = h * 0.006; g.strokeStyle = '#E2B54C'; g.stroke();
      LA.block(g, s.drink.toUpperCase(), P.cx, py + ph / 2, 'cinzel', pw * 0.82, ph * 0.72, h * 0.12, '#FFF3D6');
      LA.spaced(g, 'TOKYO · EST. TAISHO ERA', P.cx, h * 0.735, 'mono', h * 0.034, '#7A2E2E', 0.18, P.pw * 0.95);
      [-1, 1].forEach((sd) => LA.bolt(g, P.cx + sd * w * 0.215, h * 0.5, h * 0.11, '#E2B54C', INKC));
    },
    whisky(g, w, h, P, s) {
      LA.paper(g, w, h, '#F3E7CC', '#A88B57', 5);
      LA.frame(g, w * 0.035, h * 0.035, w * 0.93, h * 0.93, '#B8892F', h * 0.018, h * 0.03);
      const ex = w / 2, ey = h * 0.33, er = h * 0.115;
      g.beginPath(); g.arc(ex, ey, er, 0, Math.PI * 2); g.fillStyle = '#EADBB8'; g.fill(); g.lineWidth = h * 0.01; g.strokeStyle = INKC; g.stroke();
      g.save(); g.beginPath(); g.arc(ex, ey, er - 3, 0, Math.PI * 2); g.clip();
      g.beginPath(); g.arc(ex + er * 0.35, ey - er * 0.25, er * 0.22, 0, Math.PI * 2); g.fillStyle = '#C8323F'; g.fill();
      LA.peaks(g, ex - er, ex + er, ey + er * 0.55, [[ex - er * 0.6, er * 0.5], [ex - er * 0.25, er * 0.95], [ex + er * 0.1, er * 0.45], [ex + er * 0.45, er * 0.8], [ex + er * 0.9, er * 0.3]], '#5A7A6A', INKC, 3);
      g.fillStyle = '#6FA3B8'; g.fillRect(ex - er, ey + er * 0.55, er * 2, er);
      g.restore();
      LA.arcText(g, 'SINGLE MALT', ex, ey, er + h * 0.06, 'cinzel', h * 0.05, INKC, 0.12);
      LA.text(g, s.drink.toUpperCase(), w / 2, h * 0.6, 'cinzel', h * 0.12, INKC, w * 0.78);
      g.fillStyle = '#B8892F'; g.fillRect(w * 0.18, h * 0.68, w * 0.64, 3);
      LA.text(g, 'ウイスキー', w / 2, h * 0.735, 'zen', h * 0.05, '#8A5A3C');
      LA.spaced(g, 'DISTILLED IN OSAKA · JAPAN', w / 2, h * 0.82, 'mono', h * 0.03, INKC, 0.15, w * 0.62);
      LA.seal(g, w * 0.84, h * 0.82, h * 0.1, '#C8323F', '大阪', 'yuji');
    },
    sake(g, w, h, P, s) {
      LA.paper(g, w, h, '#F4F0E6', '#9C8F78', 11); LA.fibers(g, w, h, '#B9AE98', 12);
      g.fillStyle = '#2F4A66'; g.fillRect(0, h * 0.03, w, h * 0.012); g.fillRect(0, h * 0.955, w, h * 0.012);
      LA.peaks(g, P.x0 - 60, P.x1 + 60, h * 0.9, [[P.x0 - 20, h * 0.1], [P.x0 + 60, h * 0.24], [P.cx - 30, h * 0.12], [P.cx + 40, h * 0.3], [P.x1 - 50, h * 0.14], [P.x1 + 30, h * 0.2]], '#D3DEE7', null);
      LA.peaks(g, P.x0 - 60, P.x1 + 60, h * 0.9, [[P.x0 + 10, h * 0.06], [P.cx - 70, h * 0.15], [P.cx + 10, h * 0.07], [P.x1 - 10, h * 0.16]], '#BCCDDA', null);
      LA.waves(g, P.x0 - 40, P.x1 + 40, h * 0.9, 5, 46, '#2F4A66', 3, 2, 14);
      LA.vtext(g, '清酒', P.cx, h * 0.1, 'yuji', h * 0.27, INKC, 0.98);
      LA.seal(g, P.cx + P.pw * 0.38, h * 0.16, h * 0.1, '#C8323F', '長野', 'yuji');
      LA.text(g, s.drink.toUpperCase(), P.cx, h * 0.7, 'gara', h * 0.07, '#2F4A66', P.pw * 0.85);
      LA.spaced(g, 'JUNMAI · NAGANO', P.cx, h * 0.76, 'mono', h * 0.026, '#5B4A42', 0.2, P.pw * 0.85);
    },
    beer(g, w, h, P, s) {
      LA.paper(g, w, h, '#F2D27A', '#B8892F', 21);
      g.fillStyle = '#9E2B33'; g.fillRect(0, 0, w, h * 0.12); g.fillRect(0, h * 0.88, w, h * 0.12);
      g.fillStyle = '#F6E7C1'; g.fillRect(0, h * 0.12, w, h * 0.012); g.fillRect(0, h * 0.868, w, h * 0.012);
      const words = s.drink.toUpperCase().split(' '), first = words[0], rest = words.slice(1).join(' ');
      LA.spaced(g, first, P.cx, h * 0.062, 'slab', h * 0.07, '#F6E7C1', 0.2, P.pw);
      LA.spaced(g, 'NAGOYA · JAPAN', P.cx, h * 0.94, 'mono', h * 0.045, '#F6E7C1', 0.25, P.pw);
      [-1, 1].forEach((sd) => LA.sprig(g, P.cx + sd * P.pw * 0.36, h * 0.74, h * 0.42, -Math.PI / 2 - sd * 0.35, 4, '#7FA650', INKC));
      const sw = P.pw * 0.5, sx = P.cx - sw / 2, sy = h * 0.17, sh = h * 0.5;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + sw, sy); g.lineTo(sx + sw, sy + sh * 0.55); g.quadraticCurveTo(sx + sw, sy + sh * 0.9, P.cx, sy + sh); g.quadraticCurveTo(sx, sy + sh * 0.9, sx, sy + sh * 0.55); g.closePath();
      g.fillStyle = '#9E2B33'; g.fill(); g.lineWidth = h * 0.014; g.strokeStyle = INKC; g.stroke();
      LA.castle(g, P.cx, sy + sh * 0.78, sh * 0.7, '#F6E7C1', '#2F5D50', INKC);
      LA.text(g, 'ビール', P.cx, sy + sh * 0.12, 'zen', h * 0.055, '#F6E7C1');
      const by = h * 0.72, bw = P.pw * 0.98, bh = h * 0.13;
      g.fillStyle = '#C9A24A'; [-1, 1].forEach((sd) => { g.beginPath(); g.moveTo(P.cx + sd * bw * 0.42, by - bh * 0.3); g.lineTo(P.cx + sd * bw * 0.56, by - bh * 0.3); g.lineTo(P.cx + sd * bw * 0.5, by + bh * 0.2); g.lineTo(P.cx + sd * bw * 0.56, by + bh * 0.7); g.lineTo(P.cx + sd * bw * 0.42, by + bh * 0.7); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = INKC; g.stroke(); });
      g.fillStyle = '#F6E7C1'; g.fillRect(P.cx - bw * 0.44, by - bh * 0.5, bw * 0.88, bh); g.lineWidth = 3.5; g.strokeStyle = INKC; g.strokeRect(P.cx - bw * 0.44, by - bh * 0.5, bw * 0.88, bh);
      LA.text(g, rest, P.cx, by, 'slab', bh * 0.62, '#9E2B33', bw * 0.8);
    },
    kaoliang(g, w, h, P, s) {
      LA.paper(g, w, h, '#FFF6E8', '#C9A27A', 31);
      g.fillStyle = '#B8232F'; g.fillRect(0, 0, w, h * 0.15); g.fillRect(0, h * 0.85, w, h * 0.15);
      LA.meander(g, 6, w, h * 0.04, h * 0.07, '#E2B54C', 3); LA.meander(g, 6, w, h * 0.89, h * 0.07, '#E2B54C', 3);
      [-1, 1].forEach((sd) => LA.waves(g, P.cx + sd * w * 0.215 - 46, P.cx + sd * w * 0.215 + 46, h * 0.44, 6, 30, '#6FA3B8', 4, 3, 18));
      const cy = h * 0.4, r = h * 0.19;
      g.beginPath(); g.arc(P.cx, cy, r, 0, Math.PI * 2); g.fillStyle = '#B8232F'; g.fill(); g.lineWidth = h * 0.014; g.strokeStyle = INKC; g.stroke();
      g.beginPath(); g.arc(P.cx, cy, r - 10, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#E2B54C'; g.stroke();
      LA.text(g, '高粱', P.cx, cy + 4, 'mashan', r * 0.85, '#F5D27A', r * 1.6);
      LA.text(g, s.drink.toUpperCase(), P.cx, h * 0.68, 'cinzel', h * 0.075, '#B8232F', P.pw * 0.95);
      LA.spaced(g, 'SORGHUM LIQUOR · TAIWAN', P.cx, h * 0.77, 'mono', h * 0.03, INKC, 0.15, P.pw * 0.95);
    },
    soju(g, w, h, P, s) {
      LA.paper(g, w, h, '#EEF6EA', '#9FBF94', 41);
      g.fillStyle = '#2E8B57'; g.fillRect(0, 0, w, h * 0.1); g.fillRect(0, h * 0.9, w, h * 0.1);
      LA.skyline(g, 0, w, h * 0.9, '#B9DDB8', P.cx + P.pw * 0.32, 9);
      LA.text(g, '소주', P.cx, h * 0.4, 'han', h * 0.32, '#1F5E3B', P.pw * 0.9);
      LA.spaced(g, 'SOJU', P.cx, h * 0.65, 'lilita', h * 0.1, '#2E8B57', 0.3, P.pw * 0.7);
      LA.spaced(g, 'SEOUL · KOREA', P.cx, h * 0.95, 'mono', h * 0.045, '#EEF6EA', 0.25, P.pw);
      [-1, 1].forEach((sd) => { g.beginPath(); g.arc(P.cx + sd * w * 0.215, h * 0.42, h * 0.06, 0, Math.PI * 2); g.fillStyle = '#2E8B57'; g.fill(); });
    },
    gosori(g, w, h) {
      g.save(); LA.diamondPath(g, w, h, 0.46); g.clip();
      LA.paper(g, w, h, '#F1E6CC', '#9C8F78', 51); LA.fibers(g, w, h, '#B9AE98', 52);
      LA.peaks(g, w * 0.18, w * 0.82, h * 0.45, [[w * 0.32, h * 0.05], [w * 0.45, h * 0.15], [w * 0.5, h * 0.16], [w * 0.55, h * 0.15], [w * 0.68, h * 0.05]], '#9DB59A', INKC, 3);
      g.beginPath(); g.arc(w * 0.62, h * 0.24, h * 0.04, 0, Math.PI * 2); g.fillStyle = '#F08A24'; g.fill(); g.lineWidth = 3; g.strokeStyle = INKC; g.stroke();
      LA.text(g, '고소리술', w / 2, h * 0.56, 'batang', h * 0.11, INKC, w * 0.56);
      LA.spaced(g, 'GOSORISUL · JEJU', w / 2, h * 0.67, 'mono', h * 0.03, '#5B4A42', 0.15, w * 0.42);
      g.restore();
      LA.diamondPath(g, w, h, 0.46); g.lineWidth = w * 0.02; g.strokeStyle = INKC; g.stroke();
      LA.diamondPath(g, w, h, 0.41); g.lineWidth = w * 0.008; g.strokeStyle = '#8A5A3C'; g.stroke();
    },
    jiugui(g, w, h) {
      g.save(); LA.diamondPath(g, w, h, 0.46); g.clip();
      LA.paper(g, w, h, '#C9404F', '#7A1F2B', 61);
      g.restore();
      LA.diamondPath(g, w, h, 0.46); g.lineWidth = w * 0.02; g.strokeStyle = INKC; g.stroke();
      LA.diamondPath(g, w, h, 0.4); g.lineWidth = w * 0.01; g.strokeStyle = '#F5D27A'; g.stroke();
      LA.text(g, '酒', w / 2, h * 0.47, 'mashan', h * 0.34, '#F5D27A');
      LA.spaced(g, 'JIUGUI', w / 2, h * 0.68, 'cinzel', h * 0.045, '#F5D27A', 0.25, w * 0.3);
    },
    herbal(g, w, h, P, s) {
      LA.paper(g, w, h, '#F5F1E1', '#9DB59A', 71);
      g.fillStyle = '#2F7D57'; g.fillRect(0, 0, w, h * 0.12); g.fillRect(0, h * 0.88, w, h * 0.12);
      for (let x = 20; x < w; x += 60) { LA.leaf(g, x, h * 0.06, 34, -0.2, '#9FD08A', null); LA.leaf(g, x + 30, h * 0.94, 34, 0.2, '#9FD08A', null); }
      const ow = P.pw * 0.86, oh = h * 0.6, oy = h * 0.46;
      g.beginPath(); g.ellipse(P.cx, oy, ow / 2, oh / 2, 0, 0, Math.PI * 2); g.fillStyle = '#FFFBEF'; g.fill(); g.lineWidth = h * 0.012; g.strokeStyle = '#2F7D57'; g.stroke();
      [-1, 1].forEach((sd) => LA.sprig(g, P.cx + sd * w * 0.205, h * 0.8, h * 0.5, -Math.PI / 2 + sd * 0.12, 5, '#5DB063', INKC));
      LA.block(g, s.drink.toUpperCase(), P.cx, oy - h * 0.02, 'gara', ow * 0.7, oh * 0.42, h * 0.11, '#1F5E3B');
      LA.spaced(g, 'HERBAL BAIJIU', P.cx, oy + oh * 0.27, 'mono', h * 0.03, INKC, 0.18, ow * 0.6);
      LA.seal(g, P.cx + ow * 0.4, oy - oh * 0.36, h * 0.12, '#C8323F', '云南', 'mashan');
    },
    toddy(g, w, h, P, s) {
      LA.paper(g, w, h, '#C9A66B', '#6B4A2A', 81); LA.fibers(g, w, h, '#8A6A3F', 82);
      const ink = '#3B2414';
      g.setLineDash([10, 8]); g.strokeStyle = ink; g.lineWidth = 3; [h * 0.08, h * 0.92].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }); g.setLineDash([]);
      [-1, 1].forEach((sd) => LA.palm(g, P.cx + sd * w * 0.2 - h * 0.05, h * 0.84, h * 0.6, ink, '#4F6B3A'));
      LA.spaced(g, s.drink.toUpperCase(), P.cx, h * 0.42, 'type', h * 0.16, ink, 0.08, P.pw * 0.8);
      LA.spaced(g, 'TODI · PALM WINE', P.cx, h * 0.6, 'type', h * 0.055, ink, 0.08, P.pw * 0.85);
      g.save(); g.translate(P.cx + P.pw * 0.34, h * 0.2); g.rotate(-0.25); g.beginPath(); g.arc(0, 0, h * 0.09, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = '#9A3A2C'; g.stroke(); LA.text(g, 'JB', 0, 2, 'type', h * 0.07, '#9A3A2C'); g.restore();
      LA.spaced(g, 'JOHOR · MALAYSIA', P.cx, h * 0.74, 'mono', h * 0.032, ink, 0.2, P.pw * 0.8);
    },
    tuak(g, w, h, P, s) {
      LA.paper(g, w, h, '#DCC292', '#6B4A2A', 91); LA.fibers(g, w, h, '#9A7A4F', 92);
      const ink = '#3B2414';
      g.fillStyle = ink; for (let x = 8; x < w; x += 22) { g.beginPath(); g.arc(x, h * 0.07, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + 11, h * 0.93, 4, 0, Math.PI * 2); g.fill(); }
      LA.eagle(g, P.cx, h * 0.27, h * 0.15, '#9A3A2C');
      LA.spaced(g, s.drink.toUpperCase(), P.cx, h * 0.55, 'type', h * 0.16, ink, 0.12, P.pw * 0.7);
      LA.spaced(g, 'RICE WINE · LANGKAWI', P.cx, h * 0.72, 'type', h * 0.05, ink, 0.06, P.pw * 0.92);
      [-1, 1].forEach((sd) => { g.save(); g.translate(P.cx + sd * w * 0.215, h * 0.5); g.rotate(Math.PI / 4); g.strokeStyle = '#9A3A2C'; g.lineWidth = 4; g.strokeRect(-h * 0.07, -h * 0.07, h * 0.14, h * 0.14); g.strokeRect(-h * 0.035, -h * 0.035, h * 0.07, h * 0.07); g.restore(); });
    },
    batik(g, w, h, P, s) {
      LA.paper(g, w, h, '#FFF1D6', '#C9A27A', 101);
      LA.batik(g, w, 0, h * 0.17, '#24406B', '#D9822B', '#FFF1D6');
      LA.batik(g, w, h * 0.83, h * 0.17, '#24406B', '#D9822B', '#FFF1D6');
      [-1, 1].forEach((sd) => { LA.flower(g, P.cx + sd * w * 0.205, h * 0.46, h * 0.1, '#FFFFFF', '#F5C34A', INKC); LA.flower(g, P.cx + sd * w * 0.24, h * 0.64, h * 0.065, '#FFFFFF', '#F5C34A', INKC); });
      const words = s.drink.toUpperCase().split(' ');
      LA.spaced(g, words[0], P.cx, h * 0.42, 'lilita', h * 0.19, '#24406B', 0.08, P.pw * 0.8);
      LA.spaced(g, words.slice(1).join(' '), P.cx, h * 0.6, 'lilita', h * 0.11, '#D9822B', 0.3, P.pw * 0.6);
      LA.spaced(g, 'INDONESIA', P.cx, h * 0.73, 'mono', h * 0.035, INKC, 0.3, P.pw * 0.6);
    },
    estate(g, w, h, P, s) {
      LA.paper(g, w, h, '#F5EEDC', '#B3A27F', 111);
      g.fillStyle = '#7A1F2B'; g.fillRect(0, h * 0.04, w, h * 0.008); g.fillRect(0, h * 0.95, w, h * 0.008);
      LA.frame(g, P.x0 + 4, h * 0.07, P.x1 - P.x0 - 8, h * 0.86, INKC, 3, 8);
      g.save(); g.beginPath(); g.rect(P.x0 + 14, h * 0.09, P.x1 - P.x0 - 28, h * 0.44); g.clip();
      for (let i = 0; i < 14; i++) { const a = -Math.PI + i / 13 * Math.PI; g.beginPath(); g.moveTo(P.cx, h * 0.36); g.lineTo(P.cx + Math.cos(a) * 400, h * 0.36 + Math.sin(a) * 400); g.strokeStyle = 'rgba(184,137,47,0.28)'; g.lineWidth = 3; g.stroke(); }
      LA.hills(g, P.x0, P.x1, h * 0.53, h * 0.3, '#C9C29A', '#B6AE7E', 'rgba(29,39,51,0.45)', INKC);
      LA.house(g, P.cx + P.pw * 0.18, h * 0.38, h * 0.08, '#F5EEDC', '#7A1F2B', INKC);
      [P.cx - P.pw * 0.3, P.cx - P.pw * 0.22].forEach((x, i) => { g.beginPath(); g.ellipse(x, h * 0.34 - i * 6, 16, 24, 0, 0, Math.PI * 2); g.fillStyle = '#5E7A4A'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INKC; g.stroke(); });
      g.restore();
      g.strokeStyle = INKC; g.lineWidth = 3; g.beginPath(); g.moveTo(P.x0 + 14, h * 0.53); g.lineTo(P.x1 - 14, h * 0.53); g.stroke();
      LA.block(g, s.drink, P.cx, h * 0.66, 'gara', P.pw * 0.8, h * 0.18, h * 0.09, '#7A1F2B');
      LA.spaced(g, 'BAROSSA VALLEY', P.cx, h * 0.79, 'mono', h * 0.027, INKC, 0.3, P.pw * 0.8);
      LA.spaced(g, 'VINTAGE [YEAR] · SOUTH AUSTRALIA', P.cx, h * 0.85, 'mono', h * 0.02, '#5B4A42', 0.15, P.pw * 0.84);
    }
  };
  const labelCache = {};
  function labelTex(s, cw, ch, kind) {
    const key = [s.style || '', s.drink || '', s.color || '', s.cap || '', s.band || '', cw, ch, kind].join('|');
    if (labelCache[key]) return labelCache[key];
    const t = textTex(cw, ch, (g, w, h) => {
      const P = kind === 'wrap' ? { cx: w / 2, pw: w * 0.36, x0: w * 0.32, x1: w * 0.68 } : { cx: w / 2, pw: w * 0.86, x0: w * 0.07, x1: w * 0.93 };
      if (s.style && STYLES[s.style]) { STYLES[s.style](g, w, h, P, s); return; }
      const lab = '#F4EEDF', band = s.band || s.cap || INKC;
      if (kind === 'diamond') { LA.diamondPath(g, w, h, 0.46); g.fillStyle = lab; g.fill(); g.lineWidth = w * 0.02; g.strokeStyle = INKC; g.stroke(); return; }
      g.fillStyle = lab; g.fillRect(0, 0, w, h);
      g.fillStyle = band; g.fillRect(0, h * 0.05, w, h * 0.09); g.fillRect(0, h * 0.86, w, h * 0.09);
      g.fillStyle = INKC; g.fillRect(0, h * 0.165, w, h * 0.012); g.fillRect(0, h * 0.823, w, h * 0.012);
      g.fillStyle = band; g.beginPath(); g.arc(P.cx, h * 0.5, h * 0.17, 0, Math.PI * 2); g.fill(); g.lineWidth = h * 0.02; g.strokeStyle = INKC; g.stroke();
    });
    labelCache[key] = t; return t;
  }
  function coasterTex() {
    return textTex(512, 512, (g, w, h) => {
      const cx = w / 2, cy = h / 2, r = w * 0.48;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = '#F4EEDF'; g.fill();
      g.lineWidth = 16; g.strokeStyle = '#C8323F'; g.stroke();
      g.beginPath(); g.arc(cx, cy, r * 0.7, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = INKC; g.stroke();
      LA.arcText(g, 'SAN FRANCISCO', cx, cy, r * 0.83, 'cinzel', 40, INKC, 0.14);
      const s = 120, x = cx, y = cy + 4;
      g.strokeStyle = INKC; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - r * 0.7, y - s * 0.62); g.lineTo(cx + r * 0.7, y - s * 0.9); g.stroke();
      g.beginPath(); g.moveTo(x, y - s * 0.76); g.lineTo(x, y - s * 0.42); g.stroke();
      LA.rr(g, x - s * 0.62, y - s * 0.42, s * 1.24, s * 0.62, 12); g.fillStyle = '#C8323F'; g.fill(); g.stroke();
      LA.rr(g, x - s * 0.7, y - s * 0.5, s * 1.4, s * 0.12, 6); g.fillStyle = '#E2B54C'; g.fill(); g.stroke();
      for (let i = 0; i < 4; i++) { g.fillStyle = '#9FD3E2'; g.fillRect(x - s * 0.52 + i * s * 0.27, y - s * 0.3, s * 0.2, s * 0.2); g.strokeRect(x - s * 0.52 + i * s * 0.27, y - s * 0.3, s * 0.2, s * 0.2); }
      [-1, 1].forEach((sd) => { g.beginPath(); g.arc(x + sd * s * 0.38, y + s * 0.22, s * 0.08, 0, Math.PI * 2); g.fillStyle = INKC; g.fill(); });
      LA.spaced(g, 'IRISH COFFEE', cx, cy + r * 0.5, 'mono', 26, '#C8323F', 0.2, r);
    });
  }
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  function shine(g, r, y0, y1, th) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.018, r * 1.018, y1 - y0, 4, 1, true, th === undefined ? -1.08 : th, 0.13), shineMat);
    m.position.y = (y0 + y1) / 2; g.add(m);
  }
  function band(g, r, y, h, color) { const m = part(new THREE.CylinderGeometry(r, r, h, 24, 1, true), color, { k: 0.008, cast: false }); m.position.y = y; g.add(m); return m; }
  function tintGeo(geo, offY, fillY, glass, liquid) {
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    const cG = new THREE.Color(glass), cL = new THREE.Color(liquid), cM = cL.clone().lerp(new THREE.Color('#ffffff'), 0.5);
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + offY; const c = !liquid || y > fillY + 0.0002 ? cG : (y > fillY - 0.0158 ? cM : cL); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  }
  function latheGeo(profile, s) {
    const pts = profile.map((q) => q.slice());
    if (s.liquid) {
      const fy = s.fill * profile[profile.length - 1][1];
      [fy - 0.016, fy - 0.0155, fy, fy + 0.0005].forEach((y) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if ((a[1] - y) * (b[1] - y) < 0) { const t = (y - a[1]) / (b[1] - a[1]); pts.splice(i + 1, 0, [a[0] + (b[0] - a[0]) * t, y]); break; } } });
      return tintGeo(new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q[0], q[1])), 30), 0, fy, s.color, s.liquid);
    }
    return new THREE.LatheGeometry(pts.map((q) => new THREE.Vector2(q[0], q[1])), 30);
  }
  const vcol = () => toon('#ffffff', { vertexColors: true });
  function bottleMesh(s) {
    const g = new THREE.Group();
    const dark = '#' + new THREE.Color(s.color).multiplyScalar(0.72).getHexString();
    if (s.shape === 'square') {
      const C4 = (r0, r1, h, seg) => { const geo = new THREE.CylinderGeometry(r0, r1, h, 4, seg || 1); geo.rotateY(Math.PI / 4); return geo; };
      const base = part(C4(0.228, 0.228, 0.05), dark, { k: 0.02 }); base.position.y = 0.025; g.add(base);
      const bodyGeo = s.liquid ? tintGeo(C4(0.22, 0.22, 0.5, 48), 0.3, s.fill, s.color, s.liquid) : C4(0.22, 0.22, 0.5);
      const body = part(bodyGeo, s.color, { k: 0.025, mat: s.liquid ? vcol() : undefined }); body.position.y = 0.3; g.add(body);
      const sh = part(C4(0.1, 0.22, 0.08), s.color, { k: 0.02 }); sh.position.y = 0.59; g.add(sh);
      const neck = part(new THREE.CylinderGeometry(0.056, 0.064, 0.12, 16), s.color, { k: 0.015 }); neck.position.y = 0.69; g.add(neck);
      band(g, 0.07, 0.66, 0.03, s.band || s.cap);
      const cap = part(new THREE.CylinderGeometry(0.078, 0.078, 0.08, 18), s.cap, { k: 0.015 }); cap.position.y = 0.775; g.add(cap);
      const top = part(new THREE.CylinderGeometry(0.096, 0.096, 0.024, 18), s.cap, { k: 0.012 }); top.position.y = 0.827; g.add(top);
      const tex = labelTex(s, 512, 474, 'flat'); s._label = { img: tex.image, kind: 'flat' };
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.25), toon('#ffffff', { map: tex })); lab.position.set(0, 0.3, 0.1575); g.add(lab);
      const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.44), shineMat); hl.position.set(-0.122, 0.3, 0.158); g.add(hl);
      return g;
    }
    if (s.shape === 'mug') {
      const glass = '#CFE6EC';
      const ctex = coasterTex(); s._label = { img: ctex.image, kind: 'round' };
      const cm = [toon('#F4EEDF'), toon('#ffffff', { map: ctex, transparent: true, alphaTest: 0.5 }), toon('#F4EEDF')];
      const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.018, 36), cm); coaster.position.y = 0.009; g.add(coaster);
      const foot = part(new THREE.CylinderGeometry(0.135, 0.15, 0.035, 24), glass, { k: 0.015 }); foot.position.y = 0.036; g.add(foot);
      const stem = part(new THREE.CylinderGeometry(0.032, 0.045, 0.14, 12), glass, { k: 0.012 }); stem.position.y = 0.123; g.add(stem);
      const bowlP = [[0, 0.188], [0.07, 0.188], [0.125, 0.218], [0.158, 0.288], [0.178, 0.398], [0.188, 0.518], [0.19, 0.538], [0, 0.538]].map((q) => new THREE.Vector2(q[0], q[1]));
      g.add(part(new THREE.LatheGeometry(bowlP, 28), s.color, { k: 0.02 }));
      const cream = part(new THREE.CylinderGeometry(0.19, 0.19, 0.07, 28), s.cap, { k: 0.012 }); cream.position.y = 0.573; g.add(cream);
      const dome = part(new THREE.SphereGeometry(0.188, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), s.cap, { k: 0 }); dome.scale.y = 0.28; dome.position.y = 0.608; g.add(dome);
      const rim = part(new THREE.CylinderGeometry(0.195, 0.192, 0.05, 28, 1, true), glass, { k: 0.01 }); rim.position.y = 0.633; g.add(rim);
      const handle = part(new THREE.TorusGeometry(0.1, 0.028, 8, 18, Math.PI * 1.25), glass, { k: 0.012 }); handle.rotation.z = -Math.PI * 0.62; handle.position.set(0.19, 0.398, 0); g.add(handle);
      const sprinkle = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({ color: 0xA0703F })); sprinkle.rotation.x = -Math.PI / 2; sprinkle.position.set(0.03, 0.661, 0.02); g.add(sprinkle);
      shine(g, 0.18, 0.26, 0.52, -0.9);
      return g;
    }
    const prof = PROFILES[s.shape];
    g.add(part(latheGeo(prof, s), s.color, { k: 0.025, mat: s.liquid ? vcol() : undefined }));
    const top = prof[prof.length - 1][1], d = LABEL[s.shape];
    if (s.shape === 'jug') {
      const ch = Math.round(512 * d.h / (d.r * d.L)), tex = labelTex(s, 512, ch, 'diamond'); s._label = { img: tex.image, kind: 'diamond' };
      const lab = new THREE.Mesh(new THREE.CylinderGeometry(d.r * 1.015, d.r * 1.015, d.h, 24, 1, true, -d.L / 2, d.L), toon('#ffffff', { map: tex, transparent: true, alphaTest: 0.5 }));
      lab.position.y = d.y; g.add(lab);
      const cork = part(new THREE.CylinderGeometry(0.065, 0.055, 0.1, 14), '#C9A27A', { k: 0.012 }); cork.position.y = top + 0.03; g.add(cork);
      const twine = part(new THREE.TorusGeometry(0.072, 0.014, 6, 20), s.cloth ? '#E8C23A' : '#C9A27A', { k: 0 }); twine.rotation.x = Math.PI / 2; twine.position.y = 0.6; g.add(twine);
      if (s.cloth) {
        const cl = part(new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), s.cap, { k: 0.015 }); cl.scale.y = 0.85; cl.position.y = 0.6; g.add(cl);
        [-1, 1].forEach((sd) => { const tail = part(new THREE.BoxGeometry(0.03, 0.12, 0.012), '#E8C23A', { k: 0 }); tail.position.set(0.04 * sd, 0.54, 0.075); tail.rotation.z = 0.35 * sd; g.add(tail); });
      } else {
        const tag = part(new THREE.BoxGeometry(0.07, 0.09, 0.008), '#F1E6CC', { k: 0.008 }); tag.position.set(0.09, 0.53, 0.06); tag.rotation.set(0.2, -0.5, 0.25); g.add(tag);
      }
      shine(g, 0.235, 0.1, 0.36, -1.15);
      return g;
    }
    const ch = Math.round(1024 * d.h / (d.r * d.L)), tex = labelTex(s, 1024, ch, 'wrap'); s._label = { img: tex.image, kind: 'wrap' };
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(d.r * 1.012, d.r * 1.012, d.h, 48, 1, true, -d.L / 2, d.L), toon('#ffffff', { map: tex }));
    lab.position.y = d.y; g.add(lab);
    band(g, d.r * 1.01, 0.04, 0.03, dark);
    shine(g, d.r, 0.05, Math.min(d.y + d.h / 2 + 0.1, top * 0.62));
    if (s.foil) {
      const foil = part(new THREE.CylinderGeometry(0.064, 0.066, 0.2, 18), s.cap, { k: 0.012 }); foil.position.y = top - 0.07; g.add(foil);
      const disc = part(new THREE.CylinderGeometry(0.06, 0.064, 0.02, 18), s.cap, { k: 0.008 }); disc.position.y = top + 0.04; g.add(disc);
      band(g, 0.068, top - 0.16, 0.02, '#E2B54C');
      band(g, 0.068, top - 0.05, 0.012, '#E2B54C');
    } else {
      band(g, 0.062, NECK_Y[s.shape], 0.05, s.band || s.cap);
      if (s.shape === 'beer') {
        const crown = part(new THREE.CylinderGeometry(0.064, 0.074, 0.05, 14), s.cap, { k: 0.012 }); crown.position.y = top + 0.02; g.add(crown);
      } else {
        const cap = part(new THREE.CylinderGeometry(0.072, 0.072, 0.09, 20), s.cap, { k: 0.014 }); cap.position.y = top + 0.01; g.add(cap);
        band(g, 0.075, top - 0.045, 0.014, INKC);
      }
    }
    return g;
  }

  /* ---------- people ---------- */
  function person(o) {
    const g = new THREE.Group();
    const torso = part(new THREE.CylinderGeometry(0.44, 0.5, 1.2, 18), o.shirt, { k: 0.05 }); torso.position.y = 0.6; g.add(torso);
    if (o.vest) {
      const front = part(new THREE.BoxGeometry(0.32, 0.5, 0.06), '#F7F3EA', { k: 0.02, cast: false }); front.position.set(0, 0.98, 0.45); front.rotation.x = -0.08; g.add(front);
      const bowGeo = new THREE.ConeGeometry(0.09, 0.16, 10); bowGeo.rotateZ(Math.PI / 2);
      const b1 = part(bowGeo, '#E8576B', { k: 0.02 }); b1.position.set(-0.08, 1.15, 0.47); g.add(b1);
      const b2 = part(bowGeo, '#E8576B', { k: 0.02 }); b2.position.set(0.08, 1.15, 0.47); b2.rotation.z = Math.PI; g.add(b2);
    }
    const neck = part(new THREE.CylinderGeometry(0.14, 0.15, 0.24, 10), o.skinShade, { k: 0.03 }); neck.position.y = 1.3; g.add(neck);
    const head = new THREE.Group(); head.position.y = 1.78; g.add(head);
    head.add(part(new THREE.SphereGeometry(0.42, 24, 18), o.skin, { k: 0.04 }));
    const hairGeo = new THREE.SphereGeometry(0.445, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const hair = part(hairGeo, o.hair, { k: 0.03 }); hair.rotation.x = -0.35; hair.position.y = 0.02; head.add(hair);
    [-1, 1].forEach((s) => { const ear = part(new THREE.SphereGeometry(0.09, 10, 8), o.skin, { k: 0.02 }); ear.position.set(0.42 * s, -0.02, 0); head.add(ear); });
    const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), new THREE.MeshBasicMaterial({ color: INK })); e.position.set(0.15 * s, 0.03, 0.39); head.add(e); return e; });
    [-1, 1].forEach((s) => { const ch = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xF0A08E, transparent: true, opacity: 0.7 })); ch.scale.set(1, 0.6, 0.4); ch.position.set(0.24 * s, -0.11, 0.33); head.add(ch); });
    const nose = part(new THREE.SphereGeometry(0.065, 10, 8), o.skin, { k: 0.02 }); nose.position.set(0, -0.06, 0.42); head.add(nose);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7A2E2E })); mouth.scale.set(1.3, 0.25, 0.5); mouth.position.set(0, -0.2, 0.37); head.add(mouth);
    if (o.mustache) { const m = part(new THREE.SphereGeometry(0.1, 12, 8), o.hair, { k: 0.02 }); m.scale.set(1.5, 0.4, 0.6); m.position.set(0, -0.13, 0.39); head.add(m); }
    return { g: g, head: head, eyes: eyes, mouth: mouth };
  }

  /* ================= lights ================= */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(-10, 24, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
  scene.add(sun); scene.add(sun.target);

  /* ================= 1. island + plane + clouds ================= */
  const island = new THREE.Group(); scene.add(island);
  (function () {
    const top = part(slab(26, 16, 0.7, 3.2), '#9ED07A', { recv: true, k: 0.12 }); top.position.y = -0.7; island.add(top);
    const dirt = part(slab(25.4, 15.4, 1.8, 3), '#B07A52', { k: 0.12 }); dirt.position.y = -2.5; island.add(dirt);
    const rockGeo = new THREE.ConeGeometry(8.6, 7.5, 7); rockGeo.rotateX(Math.PI); rockGeo.scale(1.45, 1, 0.85);
    const rock = part(rockGeo, '#9A6745', { k: 0.14 }); rock.position.y = -6.2; island.add(rock);
    const runway = new THREE.Mesh(new THREE.BoxGeometry(24, 0.06, 3.2), toon('#4C5462')); runway.position.y = 0.03; runway.receiveShadow = true; island.add(runway);
    for (let x = -10; x <= 10; x += 2.2) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.18), toon('#F4F1EA')); d.position.set(x, 0.05, 0); d.receiveShadow = true; island.add(d); }
    [-1.05, -0.55, 0.55, 1.05].forEach((z) => { const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.24), toon('#F4F1EA')); t.position.set(-11.2, 0.05, z); island.add(t); });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFD27A });
    for (let x = -11; x <= 11; x += 2) [-1.75, 1.75].forEach((z) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lightMat); l.position.set(x, 0.1, z); island.add(l); });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 2.4), toon('#5A6270')); apron.position.set(-5.5, 0.02, -2.9); apron.receiveShadow = true; island.add(apron);
    const terminal = new THREE.Group();
    const body = part(new THREE.BoxGeometry(7, 2.2, 3), '#F1E8D8'); body.position.y = 1.1; terminal.add(body);
    const glass = part(new THREE.BoxGeometry(6, 0.8, 0.06), '#7CC4E0', { k: 0.03, cast: false }); glass.position.set(0, 1.3, 1.52); terminal.add(glass);
    const door = part(new THREE.BoxGeometry(0.9, 0.9, 0.06), '#2B3B4E', { k: 0.03, cast: false }); door.position.set(0, 0.45, 1.53); terminal.add(door);
    const roof = part(new THREE.BoxGeometry(7.8, 0.4, 3.8), '#E8704A'); roof.position.y = 2.4; terminal.add(roof);
    terminal.position.set(-6, 0, -5.4); island.add(terminal);
    const tower = new THREE.Group();
    const shaft = part(new THREE.CylinderGeometry(0.5, 0.6, 5, 16), '#F1E8D8'); shaft.position.y = 2.5; tower.add(shaft);
    const cab = part(new THREE.CylinderGeometry(1.25, 1.05, 1.2, 16), '#7CC4E0'); cab.position.y = 5.6; tower.add(cab);
    const cap = part(new THREE.CylinderGeometry(1.5, 1.5, 0.4, 16), '#E8704A'); cap.position.y = 6.4; tower.add(cap);
    const ant = part(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), '#3B4250', { k: 0.03 }); ant.position.y = 7.2; tower.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xE8576B })); tip.position.y = 7.85; tower.add(tip);
    tower.position.set(1.5, 0, -5.6); island.add(tower);
    const hangar = new THREE.Group();
    const hb = part(new THREE.BoxGeometry(6, 2, 3.4), '#C3CBD4'); hb.position.y = 1; hangar.add(hb);
    const archGeo = new THREE.CylinderGeometry(1.7, 1.7, 6, 20, 1, false, 0, Math.PI); archGeo.rotateZ(Math.PI / 2); archGeo.rotateX(Math.PI / 2);
    const arch = part(archGeo, '#97A2AE'); arch.position.y = 2; hangar.add(arch);
    const hd = part(new THREE.BoxGeometry(4.4, 1.7, 0.06), '#5C6672', { k: 0.03, cast: false }); hd.position.set(0, 0.85, 1.72); hangar.add(hd);
    hangar.position.set(8.3, 0, -5.3); island.add(hangar);
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 1, 8), crownGeo = new THREE.IcosahedronGeometry(0.85, 1);
    [[-11.5, -6.5], [-11.8, -3.6], [11.6, -6.6], [11.8, -3.4], [-10.8, 5.8], [-7.6, 6.5], [-3.5, 6.2], [0.4, 6.8], [4.4, 6.1], [8, 6.6], [11.2, 5.6], [-0.5, -7.2], [5, -7.3]].forEach((t, i) => {
      const tree = new THREE.Group();
      const tr = part(trunkGeo, '#8A5A3C', { k: 0.05 }); tr.position.y = 0.5; tree.add(tr);
      const cr = part(crownGeo, i % 3 === 0 ? '#4FA85E' : '#5DB063', { k: 0.07 }); cr.position.y = 1.55; cr.scale.setScalar(0.9 + (i % 4) * 0.1); tree.add(cr);
      tree.position.set(t[0], 0, t[1]); island.add(tree);
    });
  })();

  function buildPlane() {
    const plane = new THREE.Group(), gear = new THREE.Group();
    const fus = part(new THREE.CylinderGeometry(0.46, 0.46, 3.8, 20), '#FFFFFF', { k: 0.05 }); fus.rotation.z = Math.PI / 2; plane.add(fus);
    const nose = part(new THREE.SphereGeometry(0.46, 20, 14), '#FFFFFF', { k: 0.05 }); nose.scale.set(1.7, 1, 1); nose.position.x = 1.9; plane.add(nose);
    const tail = part(new THREE.ConeGeometry(0.46, 1.4, 20), '#FFFFFF', { k: 0.05 }); tail.rotation.z = Math.PI / 2; tail.position.x = -2.6; plane.add(tail);
    const wind = part(new THREE.BoxGeometry(0.5, 0.18, 0.62), '#2B3B4E', { k: 0.02, cast: false }); wind.position.set(2.35, 0.24, 0); wind.rotation.z = -0.5; plane.add(wind);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.96), toon('#E8576B')); belly.position.y = -0.1; plane.add(belly);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x2B3B4E });
    for (let x = -1.4; x <= 1.4; x += 0.32) [0.44, -0.44].forEach((z) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.04), winMat); w.position.set(x, 0.14, z); plane.add(w); });
    [1, -1].forEach((s) => {
      const sh = new THREE.Shape(); sh.moveTo(0.7, 0); sh.lineTo(-0.5, 0); sh.lineTo(-1.35, 3.4 * s); sh.lineTo(-0.75, 3.4 * s); sh.lineTo(0.7, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); g.rotateX(Math.PI / 2);
      const w = part(g, '#E9EDF2', { k: 0.035 }); w.position.y = -0.12; plane.add(w);
      const tipM = part(new THREE.BoxGeometry(0.6, 0.12, 0.14), '#E8576B', { k: 0.03 }); tipM.position.set(-1.05, -0.12, 3.4 * s); plane.add(tipM);
      const eng = part(new THREE.CylinderGeometry(0.26, 0.22, 0.95, 14), '#B3BEC9', { k: 0.035 }); eng.rotation.z = Math.PI / 2; eng.position.set(0.05, -0.42, 1.35 * s); plane.add(eng);
      const stabS = new THREE.Shape(); stabS.moveTo(-2.3, 0); stabS.lineTo(-2.9, 0); stabS.lineTo(-3.2, 1.25 * s); stabS.lineTo(-2.85, 1.25 * s); stabS.lineTo(-2.3, 0);
      const sg = new THREE.ExtrudeGeometry(stabS, { depth: 0.08, bevelEnabled: false }); sg.rotateX(Math.PI / 2);
      const st = part(sg, '#E9EDF2', { k: 0.03 }); st.position.y = 0.25; plane.add(st);
    });
    const finS = new THREE.Shape(); finS.moveTo(-2.1, 0.3); finS.lineTo(-3.0, 0.3); finS.lineTo(-3.35, 1.6); finS.lineTo(-2.85, 1.6); finS.lineTo(-2.1, 0.3);
    const fg = new THREE.ExtrudeGeometry(finS, { depth: 0.1, bevelEnabled: false }); fg.translate(0, 0, -0.05);
    plane.add(part(fg, '#E8576B', { k: 0.035 }));
    const strut = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6);
    const wheel = new THREE.CylinderGeometry(0.17, 0.17, 0.14, 14); wheel.rotateX(Math.PI / 2);
    [[0, 0.5], [0, -0.5], [1.75, 0]].forEach((p) => {
      const s = part(strut, '#97A2AE', { k: 0.02 }); s.position.set(p[0], -0.6, p[1]); gear.add(s);
      const wh = part(wheel, '#2B3B4E', { k: 0.025 }); wh.position.set(p[0], -0.85, p[1]); gear.add(wh);
    });
    plane.add(gear);
    plane.traverse((m) => { if (m.isMesh && !m.userData.isOutline) m.castShadow = true; });
    return { plane: plane, gear: gear };
  }
  const P1 = buildPlane(); const plane = P1.plane, gear = P1.gear; scene.add(plane);

  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  function cloud(parent, x, y, z, s) {
    const g = new THREE.Group();
    [[0, 0, 0, 1.3], [1.4, -0.2, 0.3, 1], [-1.3, -0.25, -0.2, 0.95], [0.4, 0.6, -0.4, 0.9], [-0.4, -0.4, 0.8, 0.8]].forEach((p) => {
      const m = part(cloudGeo, '#FFFFFF', { k: 0.07, cast: false }); m.position.set(p[0], p[1], p[2]); m.scale.setScalar(p[3]); g.add(m);
    });
    g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g); return g;
  }
  const clouds = [cloud(scene, -30, 9, -20, 1.6), cloud(scene, 19, 7, -16, 1.4), cloud(scene, -36, 1, 12, 1.2), cloud(scene, 26, 4, 10, 1.3),
    cloud(scene, 28, 12, -6, 1.6), cloud(scene, 40, 18, 6, 1.8), cloud(scene, 52, 24, -8, 2), cloud(scene, 60, 30, 4, 1.7), cloud(scene, 46, 26, 14, 1.5), cloud(scene, 70, 38, -4, 2.2)];

  /* ================= 2. globe ================= */
  const G = V(150, 120, -10), R = 6, ZS = 1.55;
  const globe = new THREE.Group(); globe.position.copy(G); scene.add(globe);
  const TEXW = renderer.capabilities.maxTextureSize >= 4096 && Math.min(window.innerWidth, window.innerHeight) > 600 ? 4096 : 2048;
  function globeTexture() {
    const W = TEXW, H = TEXW / 2, S = W / 2048, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const X = (lon) => (lon + 180) / 360 * W, Y = (lat) => (90 - lat) / 180 * H;
    g.fillStyle = '#4FA3C7'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2 * S;
    for (let lon = -180; lon <= 180; lon += 30) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), H); g.stroke(); }
    for (let lat = -60; lat <= 60; lat += 30) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); g.stroke(); }
    const path = (pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.closePath(); };
    g.lineJoin = 'round';
    const sand = (fn) => { g.save(); g.clip(); g.fillStyle = '#E2C17C'; fn(); g.restore(); };
    Object.keys(LAND).forEach((k) => {
      path(LAND[k]); g.fillStyle = '#8CCB6E'; g.fill();
      if (k === 'africa') { path(LAND[k]); sand(() => { g.beginPath(); g.ellipse(X(14), Y(23), 260 * S, 70 * S, 0, 0, Math.PI * 2); g.fill(); }); }
      if (k === 'eurasia') { path(LAND[k]); sand(() => { g.beginPath(); g.ellipse(X(47), Y(24), 90 * S, 50 * S, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(X(100), Y(42), 90 * S, 22 * S, 0, 0, Math.PI * 2); g.fill(); }); }
      if (k === 'australia') { path(LAND[k]); sand(() => { g.beginPath(); g.ellipse(X(130), Y(-26), 80 * S, 40 * S, 0, 0, Math.PI * 2); g.fill(); }); }
      path(LAND[k]); g.strokeStyle = '#1D2733'; g.lineWidth = 4 * S; g.stroke();
    });
    path(GREENLAND); g.fillStyle = '#EEF2F5'; g.fill(); g.strokeStyle = '#1D2733'; g.lineWidth = 4 * S; g.stroke();
    g.beginPath(); g.moveTo(0, H); for (let lon = -180; lon <= 180; lon += 10) g.lineTo(X(lon), Y(-68 - 3 * Math.sin(lon * 0.09))); g.lineTo(W, H); g.closePath();
    g.fillStyle = '#EEF2F5'; g.fill(); g.stroke();
    CITY_DOTS.forEach((p) => { g.beginPath(); g.arc(X(p[1]), Y(p[0]), 6 * S, 0, Math.PI * 2); g.fillStyle = '#F5A524'; g.fill(); g.lineWidth = 2.5 * S; g.stroke(); });
    const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  }
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), toon('#ffffff', { map: globeTexture() })));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.022, 48, 32), inkMat));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 48, 32), new THREE.MeshBasicMaterial({ color: 0x5CC8D7, transparent: true, opacity: 0.12, side: THREE.BackSide })));
  const globeLight = new THREE.DirectionalLight(0xffffff, 0);
  globeLight.position.copy(G).add(V(-14, 10, 18)); globeLight.target.position.copy(G);
  scene.add(globeLight); scene.add(globeLight.target);
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 1600; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 420 + Math.random() * 120, q = Math.sqrt(1 - u * u); sp.push(G.x + r * q * Math.cos(a), G.y + r * u, G.z + r * q * Math.sin(a)); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xF4F1EA, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
  scene.add(new THREE.Points(starGeo, starMat));
  const latLon = (lat, lon, r) => { const a = lat * D2R, b = lon * D2R; return V(r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b)); };
  const qX = (a) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a);
  const qY = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);
  const pins = [], globePick = [];
  COUNTRIES.forEach((c, i) => {
    const a = c.lat * D2R, b = c.lon * D2R, n = latLon(c.lat, c.lon, 1);
    const east = V(-Math.sin(b), 0, -Math.cos(b));
    const south = V(Math.sin(a) * Math.cos(b), -Math.cos(a), -Math.sin(a) * Math.sin(b));
    const basis = new THREE.Matrix4().makeBasis(east, n, south);
    const holder = new THREE.Group();
    holder.position.copy(n.clone().multiplyScalar(R * 0.995));
    holder.quaternion.setFromRotationMatrix(basis);
    const pivot = new THREE.Group(); holder.add(pivot);
    const variants = c.stops.map((st, k) => {
      const m = bottleMesh(st); m.visible = k === 0; pivot.add(m);
      m.traverse((o) => { if (o.isMesh) { o.userData.idx = i; o.castShadow = false; globePick.push(o); } });
      return m;
    });
    pivot.scale.setScalar(0.82);
    globe.add(holder);
    pins.push({ pivot: pivot, variants: variants, shown: 0, s: 0.82, pop: -1e9, qAlign: new THREE.Quaternion().setFromRotationMatrix(basis).invert() });
  });

  /* ================= 3. lounge ================= */
  const LO = V(420, 0, 0);
  const lounge = new THREE.Group(); lounge.position.copy(LO); scene.add(lounge);
  const LB = {};
  (function () {
    const floor = part(new THREE.BoxGeometry(16, 0.3, 11), '#4A3027', { k: 0, recv: true, cast: false }); floor.position.set(0, -0.15, 0.5); lounge.add(floor);
    const wall = part(new THREE.BoxGeometry(16, 7, 0.3), '#24444F', { k: 0, cast: false, recv: true }); wall.position.set(0, 3.5, -4.3); lounge.add(wall);
    const mirror = part(new THREE.BoxGeometry(7.2, 2.2, 0.1), '#2C5260', { k: 0.05, cast: false }); mirror.position.set(-0.4, 3.3, -4.1); lounge.add(mirror);
    [[-2.6, 0.5], [0.9, 0.35]].forEach((s) => { const sh = new THREE.Mesh(new THREE.PlaneGeometry(s[1], 2.0), new THREE.MeshBasicMaterial({ color: 0x3A6676 })); sh.position.set(s[0], 3.3, -4.04); sh.rotation.z = -0.5; lounge.add(sh); });
    const cab = part(new THREE.BoxGeometry(7.4, 1.4, 0.8), '#6E4630', { k: 0.06 }); cab.position.set(-0.4, 0.7, -3.7); lounge.add(cab);
    const plank = part(new THREE.BoxGeometry(7.7, 0.12, 1.0), '#B07A4E', { k: 0.05 }); plank.position.set(-0.4, 1.46, -3.7); lounge.add(plank);
    [-2.2, 1.4].forEach((x) => { const d = part(new THREE.BoxGeometry(2.6, 0.9, 0.05), '#5E3B28', { k: 0.03, cast: false }); d.position.set(x, 0.7, -3.28); lounge.add(d); });
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ transparent: true, map: textTex(840, 210, (g, w, h) => {
      g.strokeStyle = '#E8576B'; g.lineWidth = 8; g.shadowColor = '#E8576B'; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(105, 20); g.arcTo(820, 20, 820, 190, 85); g.arcTo(820, 190, 20, 190, 85); g.arcTo(20, 190, 20, 20, 85); g.arcTo(20, 20, 820, 20, 85); g.stroke();
      g.shadowColor = '#F5A524'; g.shadowBlur = 14; g.fillStyle = '#FFD27A'; g.font = '800 82px "Bricolage Grotesque", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LAYOVER LOUNGE', w / 2, h / 2 + 4);
    }) }));
    neon.position.set(-0.4, 5.3, -4.12); lounge.add(neon); LB.neon = neon;
    const counter = part(new THREE.BoxGeometry(10, 1.45, 0.8), '#8A5A3C', { k: 0.07 }); counter.position.set(0, 0.72, 0); lounge.add(counter);
    [-3.4, -1.1, 1.2, 3.5].forEach((x) => { const pnl = part(new THREE.BoxGeometry(2, 0.95, 0.04), '#7A4E33', { k: 0.03, cast: false }); pnl.position.set(x, 0.68, 0.42); lounge.add(pnl); });
    const top = part(new THREE.BoxGeometry(10.4, 0.14, 1.05), '#B07A4E', { k: 0.05, recv: true }); top.position.set(0, 1.52, 0.02); lounge.add(top);
    const rail = new THREE.CylinderGeometry(0.06, 0.06, 10, 10); rail.rotateZ(Math.PI / 2);
    const r = part(rail, '#D9A441', { k: 0.03 }); r.position.set(0, 0.3, 0.62); lounge.add(r);
    const seat = part(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 20), '#E8576B', { k: 0.04 }); seat.position.set(3.0, 0.98, 1.35); lounge.add(seat);
    const post = part(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 8), '#3B4250', { k: 0.03 }); post.position.set(3.0, 0.47, 1.35); lounge.add(post);
    const foot = part(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 18), '#3B4250', { k: 0.03 }); foot.position.set(3.0, 0.03, 1.35); lounge.add(foot);
    const seat2 = seat.clone(); seat2.position.x = 0.6; lounge.add(seat2);
    const post2 = post.clone(); post2.position.x = 0.6; lounge.add(post2);
    const foot2 = foot.clone(); foot2.position.x = 0.6; lounge.add(foot2);
    LB.shelf = JOBS.map((j, i) => { const b = bottleMesh(j); b.scale.setScalar(1.3); b.position.set(-3.4 + i * 0.75, 1.52, -3.6); lounge.add(b); return b; });
    [['#E8C23A', 'beer'], ['#9C7BD1', 'jug'], ['#2FA4A9', 'bottle'], ['#C9822B', 'square']].forEach((d, i) => { const b = bottleMesh({ shape: d[1], color: d[0], cap: '#1D2733' }); b.scale.setScalar(1.15); b.position.set(1.7 + i * 0.6, 1.52, -3.6); lounge.add(b); });
    [[-1.6, 4.2], [2.2, 4.2]].forEach((p) => {
      const cord = part(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), '#1D2733', { k: 0 }); cord.position.set(p[0], 5.9, 0.2); lounge.add(cord);
      const shade = part(new THREE.ConeGeometry(0.42, 0.42, 16, 1, true), '#2F4A66', { k: 0.03 }); shade.position.set(p[0], 4.7, 0.2); lounge.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: 0xFFD27A })); bulb.position.set(p[0], 4.45, 0.2); lounge.add(bulb);
    });
    const bt = person({ shirt: '#2F4A66', skin: '#F2C7A5', skinShade: '#E2B08E', hair: '#3B2A22', vest: true, mustache: true });
    bt.g.position.set(0.6, 1.08, -1.4); bt.g.scale.setScalar(1.15); lounge.add(bt.g); LB.bt = bt;
    const dk = person({ shirt: '#2FA4A9', skin: '#F2C7A5', skinShade: '#E2B08E', hair: '#3B2A22' });
    dk.g.position.set(3.0, 1.05, 1.35); dk.g.rotation.y = -1.35; lounge.add(dk.g); LB.dk = dk;
    LB.btArmR = [limb(0.13, '#F7F3EA'), limb(0.12, '#F7F3EA')]; LB.btArmL = [limb(0.13, '#F7F3EA'), limb(0.12, '#F7F3EA')];
    LB.dkArmL = [limb(0.12, '#2FA4A9'), limb(0.11, '#2FA4A9')]; LB.dkArmR = [limb(0.12, '#2FA4A9'), limb(0.11, '#2FA4A9')];
    LB.dkLegs = [limb(0.14, '#2F4A66'), limb(0.13, '#2F4A66'), limb(0.14, '#2F4A66'), limb(0.13, '#2F4A66')];
    [].concat(LB.btArmR, LB.btArmL, LB.dkArmL, LB.dkArmR, LB.dkLegs).forEach((m) => lounge.add(m));
    LB.hands = [0, 1, 2, 3].map(() => { const h = part(new THREE.SphereGeometry(0.12, 12, 10), '#F2C7A5', { k: 0.025 }); lounge.add(h); return h; });
    LB.shoes = [0, 1].map(() => { const s = part(new THREE.BoxGeometry(0.22, 0.14, 0.38), '#1D2733', { k: 0.02 }); lounge.add(s); return s; });
    const glassG = new THREE.Group(); lounge.add(glassG); LB.glass = glassG;
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.38, 18, 1, true), toon('#D6EDF3', { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    gm.position.y = 0.19; glassG.add(gm);
    const gbase = part(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 18), '#D6EDF3', { k: 0.015 }); gbase.position.y = 0.015; glassG.add(gbase);
    const rimO = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 24), new THREE.MeshBasicMaterial({ color: INK })); rimO.rotation.x = Math.PI / 2; rimO.position.y = 0.38; glassG.add(rimO);
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 1, 18), toon('#E0A24A')); liq.position.y = 0.03; glassG.add(liq); LB.liq = liq;
    LB.held = JOBS.map((j) => { const b = bottleMesh(j); b.scale.setScalar(1.3); b.visible = false; lounge.add(b); return b; });
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1, 8), new THREE.MeshBasicMaterial({ color: 0xE0A24A })); lounge.add(stream); LB.stream = stream;
  })();
  const L = { sel: 0, t0: -1 };

  /* ================= 4. baggage ================= */
  const BO = V(620, 0, 0);
  const bag = new THREE.Group(); bag.position.copy(BO); scene.add(bag);
  const BG = { bags: [], pick: [], dist: 0, v: 1, sel: -1, lifts: PROJECTS.map(() => 0) };
  (function () {
    const floorTex = textTex(512, 512, (g, w, h) => { g.fillStyle = '#C9D2DA'; g.fillRect(0, 0, w, h); g.strokeStyle = '#B4BFC9'; g.lineWidth = 4; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(8, 6);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.3, 22), toon('#ffffff', { map: floorTex })); floor.position.set(0, -0.15, 0); floor.receiveShadow = true; bag.add(floor);
    const wall = part(new THREE.BoxGeometry(34, 8, 0.3), '#CBD5DD', { k: 0, cast: false, recv: true }); wall.position.set(0, 4, -7.5); bag.add(wall);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.2), new THREE.MeshBasicMaterial({ map: textTex(1440, 240, (g, w, h) => {
      g.fillStyle = '#1D2733'; g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, 40) : g.rect(0, 0, w, h); g.fill();
      g.fillStyle = '#F5A524'; g.font = '600 96px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAGGAGE CLAIM · BELT 04', w / 2, h / 2 + 4);
    }) }));
    sign.position.set(0, 5.6, -7.3); bag.add(sign);
    const base = part(slab(12.2, 5.8, 0.55, 2.4), '#97A2AE', { k: 0.08 }); bag.add(base);
    const belt = part(slab(11.8, 5.4, 0.1, 2.2), '#3B4250', { k: 0, recv: true, cast: false }); belt.position.y = 0.55; bag.add(belt);
    for (let i = 0; i < 40; i++) { const a = i / 40; const p = laneAt(a * laneLen()); const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 1.2), new THREE.MeshBasicMaterial({ color: 0x59606E })); slat.position.set(p.x, 0.66, p.z); slat.rotation.y = p.ang; bag.add(slat); BG.slats = BG.slats || []; BG.slats.push({ m: slat, a: a }); }
    const isl = part(slab(8.6, 2.2, 0.5, 1), '#C3CBD4', { k: 0.07 }); isl.position.y = 0.55; bag.add(isl);
    const post = part(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 12), '#5C6672', { k: 0.04 }); post.position.y = 2.2; bag.add(post);
    const boxMat = toon('#F5A524');
    const signMat = new THREE.MeshBasicMaterial({ map: textTex(512, 140, (g, w, h) => { g.fillStyle = '#F5A524'; g.fillRect(0, 0, w, h); g.fillStyle = '#1D2733'; g.font = '600 64px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BELT 04', w / 2, h / 2 + 4); }) });
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.24), [boxMat, boxMat, boxMat, boxMat, signMat, boxMat]); box.position.y = 3.6; outline(box, 0.05); bag.add(box);
    PROJECTS.forEach((pr, i) => {
      const g = new THREE.Group();
      const body = part(slab(0.9, 0.56, 0.62, 0.14, 0.04), pr.color, { k: 0.04 }); g.add(body);
      const strap = part(new THREE.BoxGeometry(0.16, 0.7, 0.62), '#FFF8EC', { k: 0, cast: false }); strap.position.y = 0.36; g.add(strap);
      const handle = part(new THREE.TorusGeometry(0.14, 0.035, 8, 16, Math.PI), '#1D2733', { k: 0 }); handle.position.y = 0.7; g.add(handle);
      const tag = part(new THREE.BoxGeometry(0.16, 0.22, 0.02), '#FFF8EC', { k: 0.015, cast: false }); tag.position.set(0.32, 0.5, 0.31); tag.rotation.z = 0.2; g.add(tag);
      g.traverse((o) => { if (o.isMesh) { o.userData.bag = i; BG.pick.push(o); } });
      bag.add(g); BG.bags.push(g);
    });
  })();
  function laneLen() { return 2 * (9.6 - 2 * 1.6) + 2 * (3.6 - 2 * 1.6) + 2 * Math.PI * 1.6; }
  function laneAt(s) {
    const hx = 4.8, hz = 1.8, r = 1.6, sx = 2 * (hx - r), sz = 2 * (hz - r), arc = Math.PI * r / 2, total = laneLen();
    s = ((s % total) + total) % total;
    const segs = [['l', sx, -hx + r, -hz, 1, 0], ['a', arc, hx - r, -hz + r, -90], ['l', sz, hx, -hz + r, 0, 1], ['a', arc, hx - r, hz - r, 0], ['l', sx, hx - r, hz, -1, 0], ['a', arc, -hx + r, hz - r, 90], ['l', sz, -hx, hz - r, 0, -1], ['a', arc, -hx + r, -hz + r, 180]];
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i];
      if (s <= sg[1] || i === segs.length - 1) {
        if (sg[0] === 'l') return { x: sg[2] + sg[4] * s, z: sg[3] + sg[5] * s, ang: Math.atan2(-sg[5], sg[4]) };
        const a0 = sg[4] * D2R, a = a0 + s / r;
        const x = sg[2] + r * Math.cos(a), z = sg[3] + r * Math.sin(a);
        const tx = -Math.sin(a), tz = Math.cos(a);
        return { x: x, z: z, ang: Math.atan2(-tz, tx) };
      }
      s -= sg[1];
    }
    return { x: 0, z: 0, ang: 0 };
  }

  /* ================= 5. arrivals ================= */
  const AO = V(820, 0, 0);
  const arr = new THREE.Group(); arr.position.copy(AO); scene.add(arr);
  const AR = {};
  (function () {
    const floor = part(new THREE.BoxGeometry(20, 0.3, 12), '#3C4F66', { k: 0, recv: true, cast: false }); floor.position.set(0, -0.15, 1); arr.add(floor);
    for (let x = -9; x <= 9; x += 3) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 12), new THREE.MeshBasicMaterial({ color: 0x34465B })); l.position.set(x, 0.01, 1); arr.add(l); }
    const wall = part(new THREE.BoxGeometry(20, 7, 0.3), '#2F4560', { k: 0, cast: false, recv: true }); wall.position.set(0, 3.5, -3.4); arr.add(wall);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshBasicMaterial({ map: textTex(900, 320, (g, w, h) => {
      g.fillStyle = '#13213A'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(244,241,234,' + (0.3 + Math.random() * 0.6).toFixed(2) + ')'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.8, Math.random() * 1.6 + 0.6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#FFF3C9'; g.strokeStyle = '#1D2733'; g.lineWidth = 4; g.beginPath(); g.arc(w - 110, 70, 32, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#1A2B44'; g.fillRect(0, h - 40, w, 40);
      g.fillStyle = '#FFD27A'; for (let x = 20; x < w; x += 46) { g.beginPath(); g.arc(x, h - 22, 4, 0, Math.PI * 2); g.fill(); }
    }) }));
    sky.position.set(-2.8, 3.9, -3.22); arr.add(sky);
    const frameMat = '#1D2733';
    [[-2.8, 5.55, 9.3, 0.22], [-2.8, 2.25, 9.3, 0.22]].forEach((f) => { const m = part(new THREE.BoxGeometry(f[2], f[3], 0.2), frameMat, { k: 0, cast: false }); m.position.set(f[0], f[1], -3.15); arr.add(m); });
    [-7.35, -4.3, -1.3, 1.75].forEach((x) => { const m = part(new THREE.BoxGeometry(0.22, 3.5, 0.2), frameMat, { k: 0, cast: false }); m.position.set(x, 3.9, -3.15); arr.add(m); });
    const lp = buildPlane(); lp.gear.visible = true; lp.plane.scale.setScalar(0.16); lp.plane.rotation.y = Math.PI; arr.add(lp.plane); AR.lp = lp.plane;
    lp.plane.traverse((o) => { o.castShadow = false; });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.7), new THREE.MeshBasicMaterial({ color: 0xFFE7B0 })); glow.position.set(5.2, 1.35, -3.22); arr.add(glow);
    const dl = part(new THREE.BoxGeometry(1.4, 2.6, 0.06), '#9FD3E2', { mat: toon('#9FD3E2', { transparent: true, opacity: 0.6 }), k: 0.03, cast: false }); dl.position.set(4.5, 1.3, -3.1); arr.add(dl);
    const dr = dl.clone(); dr.position.x = 5.9; arr.add(dr); AR.doors = [dl, dr];
    [[5.2, 2.78, 3.2, 0.2], [3.65, 1.35, 0.2, 2.9], [6.75, 1.35, 0.2, 2.9]].forEach((f) => { const m = part(new THREE.BoxGeometry(f[2], f[3], 0.3), frameMat, { k: 0, cast: false }); m.position.set(f[0], f[1], -3.05); arr.add(m); });
    const signMat = new THREE.MeshBasicMaterial({ map: textTex(640, 128, (g, w, h) => { g.fillStyle = '#1D2733'; g.fillRect(0, 0, w, h); g.fillStyle = '#F5A524'; g.font = '600 64px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ARRIVALS', w / 2, h / 2 + 4); }) });
    const dark = toon('#1D2733');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.64, 0.16), [dark, dark, dark, dark, signMat, dark]); sign.position.set(5.2, 3.45, -3.0); arr.add(sign);
    const gr = person({ shirt: '#2FA4A9', skin: '#F2C7A5', skinShade: '#E2B08E', hair: '#3B2A22' });
    gr.g.position.set(-1.6, 1.0, 0.8); gr.g.rotation.y = 0.25; arr.add(gr.g); AR.gr = gr;
    AR.legs = [limb(0.15, '#2F4A66'), limb(0.15, '#2F4A66')]; AR.legs.forEach((m) => arr.add(m));
    AR.shoes = [0, 1].map(() => { const s = part(new THREE.BoxGeometry(0.24, 0.14, 0.4), '#1D2733', { k: 0.02 }); arr.add(s); return s; });
    AR.arms = [limb(0.12, '#2FA4A9'), limb(0.11, '#2FA4A9'), limb(0.12, '#2FA4A9'), limb(0.11, '#2FA4A9')]; AR.arms.forEach((m) => arr.add(m));
    AR.hands = [0, 1].map(() => { const h = part(new THREE.SphereGeometry(0.12, 12, 10), '#F2C7A5', { k: 0.025 }); arr.add(h); return h; });
    const card = new THREE.Group();
    const cm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.9, 0.05), [toon('#FFF8EC'), toon('#FFF8EC'), toon('#FFF8EC'), toon('#FFF8EC'), new THREE.MeshBasicMaterial({ map: textTex(760, 360, (g, w, h) => {
      g.fillStyle = '#FFF8EC'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1D2733'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
      g.fillStyle = '#1D2733'; g.font = '800 120px "Bricolage Grotesque", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HEY, YOU!', w / 2, h / 2 - 30);
      g.fillStyle = '#E8576B'; g.font = '600 44px "JetBrains Mono", monospace'; g.fillText('— ' + SIGN_NAME, w / 2, h / 2 + 90);
    }) }), toon('#FFF8EC')]);
    outline(cm, 0.03); card.add(cm); arr.add(card); AR.card = card;
    const mb = new THREE.Group();
    const mpost = part(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 10), '#5C6672', { k: 0.03 }); mpost.position.y = 0.55; mb.add(mpost);
    const mbody = part(new THREE.BoxGeometry(0.6, 0.75, 0.75), '#E8576B', { k: 0.05 }); mbody.position.y = 1.45; mb.add(mbody);
    const archG = new THREE.CylinderGeometry(0.375, 0.375, 0.6, 18, 1, false, 0, Math.PI); archG.rotateZ(Math.PI / 2); archG.rotateX(Math.PI / 2);
    const mtop = part(archG, '#E8576B', { k: 0.05 }); mtop.position.y = 1.82; mb.add(mtop);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: INK })); slot.position.set(0, 1.62, 0.385); mb.add(slot);
    const flagPivot = new THREE.Group(); flagPivot.position.set(0.33, 1.45, 0); mb.add(flagPivot);
    const flag = part(new THREE.BoxGeometry(0.05, 0.5, 0.14), '#F5A524', { k: 0.02 }); flag.position.set(0.02, 0.0, 0.0); flagPivot.add(flag);
    const flagTip = part(new THREE.BoxGeometry(0.05, 0.14, 0.24), '#F5A524', { k: 0.02 }); flagTip.position.set(0.02, 0.2, 0.15); flagPivot.add(flagTip);
    flagPivot.rotation.x = Math.PI / 2;
    mb.position.set(1.3, 0, 0.8); arr.add(mb); AR.mb = mb; AR.flag = flagPivot; AR.slot = slot;
  })();

  /* ================= state & scroll ================= */
  const els = {}; ['takeoff', 'destinations', 'lounge', 'baggage', 'arrivals'].forEach((id) => { els[id] = document.getElementById(id); });
  let targetP = 0, p = 0, globeActive = false;
  const enter = { lounge: 0, baggage: 0, arrivals: 0 };
  let active = 'sky', lastActive = '';
  const readScroll = () => {
    const vh = window.innerHeight;
    const total = Math.max(1, els.takeoff.offsetHeight - vh);
    targetP = clamp(-els.takeoff.getBoundingClientRect().top / total);
    const dr = els.destinations.getBoundingClientRect();
    globeActive = dr.top < vh * 0.55 && dr.bottom > vh * 0.3;
    ['lounge', 'baggage', 'arrivals'].forEach((k) => { enter[k] = clamp(1 - els[k].getBoundingClientRect().top / vh); });
    let cur = 'takeoff';
    Object.keys(els).forEach((id) => { if (els[id].getBoundingClientRect().top < vh * 0.5) cur = id; });
    document.querySelectorAll('.nav-links a').forEach((a) => a.setAttribute('aria-current', a.dataset.sec === cur ? 'true' : 'false'));
  };
  on(window, 'scroll', readScroll, { passive: true });
  const resize = () => { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); readScroll(); };
  on(window, 'resize', resize);

  /* ---------- globe interaction ---------- */
  let sel = 0, stop = 0, zoom = 0, zoomT = 0, idleSpin = !reduced;
  const qCur = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, -210 * D2R, 0, 'XYZ'));
  let qTarget = null;
  const vel = { x: 0, y: 0 };
  let dragging = false, moved = false, downX = 0, downY = 0, lastX = 0, lastY = 0, lastT = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickAt = (x, y, list) => { ndc.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.intersectObjects(list, false)[0]; };
  const rotWorld = (ay, ax) => { if (ay) qCur.premultiply(qY(ay)); if (ax) qCur.premultiply(qX(ax)); };
  function setZoom(on, faceFront) {
    zoomT = on ? 1 : 0;
    if (!on) qTarget = faceFront ? qX(62 * D2R).multiply(pins[sel].qAlign.clone()) : null;
    els.destinations.classList.toggle('zoomed', on);
  }
  on(canvas, 'pointerdown', (e) => {
    downX = lastX = e.clientX; downY = lastY = e.clientY; lastT = performance.now(); moved = false;
    if (active === 'sky' && globeActive) {
      dragging = true; vel.x = vel.y = 0; canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });
  on(window, 'pointermove', (e) => {
    if (dragging) {
      const now = performance.now(), dts = Math.max(0.008, (now - lastT) / 1000);
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 5) { moved = true; idleSpin = false; qTarget = null; if (zoomT) setZoom(false, false); }
      if (moved) { const ay = dx * 0.0065, ax = dy * 0.0065; rotWorld(ay, ax); vel.x = vel.x * 0.4 + (ay / dts) * 0.6; vel.y = vel.y * 0.4 + (ax / dts) * 0.6; }
      return;
    }
    if (e.target !== canvas) return;
    let hover = false;
    if (active === 'sky' && globeActive) hover = !!pickAt(e.clientX, e.clientY, globePick);
    else if (active === 'baggage') hover = !!pickAt(e.clientX, e.clientY, BG.pick);
    canvas.style.cursor = hover ? 'pointer' : (active === 'sky' && globeActive ? 'grab' : 'default');
  });
  on(window, 'pointerup', (e) => {
    if (dragging) {
      dragging = false; canvas.style.cursor = 'grab';
      if (!moved) { const h = pickAt(e.clientX, e.clientY, globePick); if (h) selectCountry(h.object.userData.idx); }
      else if (performance.now() - lastT > 90) { vel.x = vel.y = 0; }
      return;
    }
    if (e.target === canvas && active === 'baggage' && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) { const h = pickAt(e.clientX, e.clientY, BG.pick); if (h) openBag(h.object.userData.bag); }
  });
  on(window, 'pointercancel', () => { dragging = false; canvas.style.cursor = 'grab'; });
  on(window, 'keydown', (e) => { if (e.key === 'Escape' && zoomT) setZoom(false, true); });
  function selectCountry(i) {
    sel = (i + COUNTRIES.length) % COUNTRIES.length; stop = 0;
    idleSpin = false; vel.x = vel.y = 0;
    qTarget = pins[sel].qAlign.clone();
    pins[sel].pop = performance.now();
    setZoom(true);
    renderCard();
  }
  const nudge = (v) => { idleSpin = false; qTarget = null; if (zoomT) setZoom(false, false); vel.x += v; };
  on(document.getElementById('rot-l'), 'click', () => nudge(-1.6));
  on(document.getElementById('rot-r'), 'click', () => nudge(1.6));
  on(document.getElementById('c-prev'), 'click', () => selectCountry(sel - 1));
  on(document.getElementById('c-next'), 'click', () => selectCountry(sel + 1));
  on(document.getElementById('c-globe'), 'click', () => setZoom(false, true));
  const chipsEl = document.getElementById('chips');
  COUNTRIES.forEach((c, i) => { const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.textContent = c.name; on(b, 'click', () => selectCountry(i)); chipsEl.appendChild(b); });
  document.getElementById('stat').textContent = COUNTRIES.reduce((n, c) => n + c.stops.length, 0) + ' STOPS · ' + String(COUNTRIES.length).padStart(2, '0') + ' COUNTRIES · ONE GLASS EACH';
  const MINI = { bottle: { cap: [7, 4], neck: [6, 9], body: [15, 22], rad: '3px', label: 7 }, tall: { cap: [6, 5], neck: [6, 13], body: [13, 24], rad: '6px 6px 2px 2px', label: 7 }, beer: { cap: [7, 4], neck: [6, 12], body: [13, 20], rad: '6px 6px 2px 2px', label: 6 }, jug: { cap: [9, 4], neck: [8, 6], body: [20, 20], rad: '42% 42% 28% 28%', label: 0 }, square: { cap: [10, 4], neck: [7, 6], body: [18, 20], rad: '2px', label: 8 }, mug: { cap: [18, 6], neck: [0, 0], body: [18, 20], rad: '2px 2px 6px 6px', label: 0 } };
  function renderCard() {
    const c = COUNTRIES[sel], s = c.stops[stop];
    document.getElementById('c-country').textContent = c.name;
    document.getElementById('c-count').textContent = c.stops.length + (c.stops.length > 1 ? ' STOPS' : ' STOP');
    const tabs = document.getElementById('c-tabs'); tabs.textContent = '';
    c.stops.forEach((st, i) => { const b = document.createElement('button'); b.className = 'tab'; b.type = 'button'; b.textContent = st.city; b.setAttribute('aria-pressed', i === stop ? 'true' : 'false'); on(b, 'click', () => { stop = i; pins[sel].pop = performance.now(); if (!zoomT) { qTarget = pins[sel].qAlign.clone(); setZoom(true); } renderCard(); }); tabs.appendChild(b); });
    document.getElementById('c-drink').textContent = s.drink;
    document.getElementById('c-meta').textContent = (s.city + ' · ' + s.type).toUpperCase();
    document.getElementById('c-note').textContent = s.note;
    const fields = document.getElementById('c-fields');
    fields.hidden = !(s.when || s.verdict);
    document.getElementById('c-when').textContent = s.when || '—';
    document.getElementById('c-verdict').textContent = s.verdict || '—';
    const cv = document.getElementById('c-label'), lb = s._label;
    if (lb && lb.img) {
      const img = lb.img; let sx = 0, sw = img.width;
      if (lb.kind === 'wrap') { sx = Math.round(img.width * 0.29); sw = Math.round(img.width * 0.42); }
      cv.width = sw; cv.height = img.height;
      const cg = cv.getContext('2d'); cg.clearRect(0, 0, sw, img.height); cg.drawImage(img, sx, 0, sw, img.height, 0, 0, sw, img.height);
      cv.classList.toggle('cut', lb.kind === 'diamond' || lb.kind === 'round');
    }
    Array.from(chipsEl.children).forEach((b, i) => b.setAttribute('aria-pressed', i === sel ? 'true' : 'false'));
  }
  renderCard();

  /* ---------- lounge UI ---------- */
  const rowsEl = document.getElementById('rows');
  JOBS.forEach((j, i) => {
    const b = document.createElement('button'); b.className = 'row'; b.type = 'button';
    b.innerHTML = '<span></span><span></span><span class="st"></span>';
    b.children[0].textContent = j.years; b.children[1].textContent = j.company; b.children[2].textContent = j.status;
    if (j.status === 'NOW') b.children[2].classList.add('now');
    on(b, 'click', () => pour(i)); rowsEl.appendChild(b);
  });
  const bubT = document.getElementById('bub-tender'), bubD = document.getElementById('bub-dots'), bubK = document.getElementById('bub-talk');
  const talkPts = document.getElementById('talk-points');
  function pour(i) {
    L.sel = i; L.t0 = performance.now();
    Array.from(rowsEl.children).forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
    const j = JOBS[i];
    bubT.textContent = 'Round ' + j.num + ': one ' + j.short + ', coming right up.';
    document.getElementById('talk-meta').textContent = 'LEG ' + j.num + ' · ' + j.date.toUpperCase();
    document.getElementById('talk-lead').textContent = 'As ' + j.title + ' at ' + j.short + ', I…';
    talkPts.textContent = '';
    j.points.forEach((t) => { const d = document.createElement('div'); d.className = 'pt'; d.innerHTML = '<b>—</b><span></span>'; d.children[1].textContent = t; talkPts.appendChild(d); });
    LB.liq.material.color.set(j.liq); LB.stream.material.color.set(j.liq);
  }
  on(document.getElementById('pour-again'), 'click', () => pour(L.sel));
  on(document.getElementById('next-round'), 'click', () => pour((L.sel + 1) % JOBS.length));
  pour(0); L.t0 = -1;

  /* ---------- baggage UI ---------- */
  const bagChips = document.getElementById('bag-chips'), bagList = document.getElementById('bag-list');
  PROJECTS.forEach((pr, i) => {
    const c = document.createElement('button'); c.className = 'chip'; c.type = 'button';
    c.innerHTML = '<span class="swatch"></span><span></span>'; c.children[0].style.background = pr.color; c.children[1].textContent = pr.name;
    on(c, 'click', () => openBag(i)); bagChips.appendChild(c);
    const r = document.createElement('button'); r.type = 'button';
    r.innerHTML = '<span class="swatch" style="width:20px;height:20px"></span><span class="code"></span><span></span>';
    r.children[0].style.background = pr.color; r.children[1].textContent = pr.tag; r.children[2].textContent = pr.name;
    on(r, 'click', () => openBag(i)); bagList.appendChild(r);
  });
  document.getElementById('bag-count').textContent = String(PROJECTS.length).padStart(2, '0');
  function openBag(i) {
    BG.sel = i;
    const pr = PROJECTS[i];
    document.getElementById('bag-open').hidden = false; document.getElementById('bag-idle').hidden = true;
    document.getElementById('bag-num').textContent = 'BAG ' + pr.num + ' · CLAIM TAG';
    const tg = document.getElementById('bag-tag'); tg.textContent = pr.tag; tg.style.background = pr.color; tg.style.color = pr.ink;
    document.getElementById('bag-name').textContent = pr.name;
    document.getElementById('bag-desc').textContent = pr.description;
    const img = document.getElementById('bag-img'); img.src = pr.image; img.alt = 'Screenshot of ' + pr.name;
    const lk = document.getElementById('bag-link'); lk.href = pr.link; lk.hidden = !pr.link;
    const tg2 = document.getElementById('bag-tags'); tg2.textContent = '';
    pr.tags.forEach((t) => { const sp = document.createElement('span'); sp.className = 'stack'; sp.textContent = t; tg2.appendChild(sp); });
    Array.from(bagChips.children).forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false'));
  }
  on(document.getElementById('bag-close'), 'click', () => {
    BG.sel = -1; document.getElementById('bag-open').hidden = true; document.getElementById('bag-idle').hidden = false;
    Array.from(bagChips.children).forEach((b) => b.setAttribute('aria-pressed', 'false'));
  });

  /* ---------- arrivals UI ---------- */
  const form = document.getElementById('postcard'), done = document.getElementById('delivered'), errEl = document.getElementById('pc-error');
  const reasonsEl = document.getElementById('reasons');
  ['A job', 'A project', 'Just saying hi'].forEach((l, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'reason'; b.textContent = l; b.setAttribute('aria-pressed', i === 2 ? 'true' : 'false'); on(b, 'click', () => Array.from(reasonsEl.children).forEach((x, k) => x.setAttribute('aria-pressed', k === i ? 'true' : 'false'))); reasonsEl.appendChild(b); });
  let sentAt = -1, sending = false;
  const sendBtn = form.querySelector('.send');
  on(form, 'submit', (e) => {
    e.preventDefault();
    if (sending) return;
    const name = document.getElementById('pc-name'), email = document.getElementById('pc-email'), msg = document.getElementById('pc-msg');
    if (!msg.value.trim()) { errEl.textContent = 'Write a few words on the postcard first.'; msg.focus(); return; }
    if (!name.value.trim()) { errEl.textContent = 'Add your name in the From line.'; name.focus(); return; }
    if (!email.checkValidity() || !email.value.trim()) { errEl.textContent = 'Add an email I can reply to.'; email.focus(); return; }
    errEl.textContent = '';
    const pressed = reasonsEl.querySelector('[aria-pressed="true"]');
    sending = true; sendBtn.disabled = true; sendBtn.textContent = 'Posting…';
    Promise.resolve().then(() => sendPostcard({ name: name.value.trim(), email: email.value.trim(), message: msg.value.trim(), reason: pressed ? pressed.textContent : '' }))
      .then(() => { if (!alive) return; sentAt = performance.now(); form.style.pointerEvents = 'none'; })
      .catch(() => { if (!alive) return; errEl.textContent = "That didn't go through. Email me directly at " + CONTACT_EMAIL + '.'; })
      .finally(() => { sending = false; sendBtn.disabled = false; sendBtn.textContent = 'Drop it in the mailbox'; });
  });
  on(document.getElementById('write-again'), 'click', () => {
    sentAt = -1; form.reset(); form.style.transform = ''; form.style.opacity = '1'; form.style.pointerEvents = '';
    done.style.opacity = '0'; done.style.pointerEvents = 'none';
  });

  /* ================= frame ================= */
  const hero = document.getElementById('hero'), cue = document.getElementById('cue'), arrive = document.getElementById('arrive');
  const hud = document.getElementById('hud'), nav = document.getElementById('nav'), fade = document.getElementById('fade');
  const hudAlt = document.getElementById('hud-alt'), hudSpd = document.getElementById('hud-spd'), hudPhase = document.getElementById('hud-phase');
  const daySky = new THREE.Color('#CFE8F0'), duskSky = new THREE.Color('#F2C9A8'), nightSky = new THREE.Color('#13213A');
  const SCENE_BG = { lounge: new THREE.Color('#1F3A44'), baggage: new THREE.Color('#DCE4EA'), arrivals: new THREE.Color('#2B3E55') };
  const sky = new THREE.Color();
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 60, 220);
  const camPos = V(0, 0, 0), camLook = V(0, 0, 0);
  const vA = V(0, 0, 0), vB = V(0, 0, 0), vC = V(0, 0, 0), vD = V(0, 0, 0), lA = V(0, 0, 0), lB = V(0, 0, 0), lC = V(0, 0, 0), lD = V(0, 0, 0);
  const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0), zPos = V(0, 0, 0), zLook = V(0, 0, 0);
  let last = performance.now();
  const project = (v) => { tmp.copy(v).project(camera); return [(tmp.x + 1) / 2 * window.innerWidth, (1 - tmp.y) / 2 * window.innerHeight, tmp.z]; };
  const toLounge = (obj, local) => lounge.worldToLocal(obj.localToWorld(local.clone()));
  const toArr = (obj, local) => arr.worldToLocal(obj.localToWorld(local.clone()));

  function sceneCam(key, narrow) {
    if (key === 'lounge') return narrow ? [V(2.4, 3.8, 15.5), V(1.6, 2.6, 0)] : [V(3.0, 3.6, 12.5), V(0.2, 2.3, 0)];
    if (key === 'baggage') return narrow ? [V(0, 15, 18), V(0, -1.8, 0)] : [V(1.5, 12, 16), V(3.4, -0.6, 0.5)];
    return narrow ? [V(0.5, 4.4, 18), V(0.4, 0.6, 0)] : [V(0.4, 3.8, 15.5), V(2.6, 2.1, 0)];
  }
  const ORIG = { lounge: LO, baggage: BO, arrivals: AO };

  function updateLounge(now) {
    if (L.t0 < 0) { if (active === 'lounge') pour(L.sel); else return; }
    const t = reduced ? 9000 : now - L.t0;
    const seg = (a, b) => clamp((t - a) / (b - a));
    const sm = (a, b) => smooth(a, b, t);
    const J = JOBS[L.sel], bs = 1.3, bh = BOTTLE_H[J.shape] * bs, grip = 0.35 * bs;
    const keys = [[0, 1.0, 1.7, -0.5, 0], [260, 0.95, 1.62, -0.55, 0], [760, 1.3, 3.4, -0.9, 0], [950, 1.3, 3.3, -0.88, 0], [1500, 1.3, 3.36, -0.9, 0], [1900, 1.4, 2.7, -0.25, 60], [2150, 1.45, 2.4, 0.05, 115], [2950, 1.47, 2.38, 0.07, 120], [3250, 1.38, 2.65, -0.3, 40], [3600, 1.25, 2.6, -0.6, -6], [3800, 1.25, 2.6, -0.6, 0], [99999, 1.25, 2.6, -0.6, 0]];
    const k = track(keys, t);
    const H = V(k[0], k[1], k[2]);
    let th = k[3] * D2R;
    const bottle = LB.held[L.sel];
    LB.held.forEach((b, i) => { b.visible = i === L.sel && t >= 260; });
    LB.shelf.forEach((b, i) => { b.visible = !(i === L.sel && t >= 260); });
    let gripPos = H.clone(), spin = 0;
    if (t >= 260 && t < 760) {
      const u = (t - 260) / 500;
      const from = LB.shelf[L.sel].position.clone().add(V(0, grip, 0)), to = V(1.3, 3.4, -0.9);
      gripPos = from.clone().lerp(to, u); gripPos.y += 1.6 * 4 * u * (1 - u);
      spin = Math.PI * 2 * (1 - Math.pow(1 - u, 2)); th = 0;
    }
    const dir = V(Math.sin(th + spin), Math.cos(th + spin), 0);
    bottle.position.copy(gripPos).sub(dir.clone().multiplyScalar(grip));
    bottle.rotation.set(0, 0, -(th + spin));
    const mouth = gripPos.clone().add(dir.clone().multiplyScalar(bh - grip));

    const lean = 0.08 * sm(1500, 2150) - 0.08 * sm(2950, 3500);
    const bt = LB.bt; bt.g.rotation.x = lean;
    bt.g.updateMatrixWorld();
    const handOn = t >= 260 ? H : V(1.0, 1.7, -0.5);
    const SR = toLounge(bt.g, V(0.5, 1.15, 0)), SL = toLounge(bt.g, V(-0.5, 1.15, 0));
    const ER = ik(SR, handOn, 0.8, V(1, -1, -0.4)), EL = ik(SL, V(-0.6, 1.66, -0.45), 0.8, V(-1, -1, 0));
    setLimb(LB.btArmR[0], SR, ER); setLimb(LB.btArmR[1], ER, handOn); setLimb(LB.btArmL[0], SL, EL); setLimb(LB.btArmL[1], EL, V(-0.6, 1.66, -0.45));
    LB.hands[0].position.copy(handOn); LB.hands[1].position.set(-0.6, 1.66, -0.45);
    const btLook = t < 3600 ? (t >= 260 ? gripPos : LB.shelf[L.sel].position) : toLounge(LB.dk.g, V(0, 1.8, 0));
    const lk = bt.g.worldToLocal(lounge.localToWorld(btLook.clone()));
    bt.head.rotation.y = clamp(Math.atan2(lk.x, lk.z), -0.9, 0.9) * 0.8;
    bt.head.rotation.x = clamp(-(lk.y - 1.78) * 0.25, -0.35, 0.35);
    bt.head.position.y = 1.78 + Math.sin(now / 650) * 0.012;
    const bl = blinkScale(now, 3400, 0); bt.eyes.forEach((e) => { e.scale.y = bl; });

    const pourFill = 0.72 * (1 - Math.pow(1 - seg(2200, 3000), 2));
    const sip = sm(3250, 3600) * (1 - sm(3850, 4200));
    const tiltA = 0.55 * sm(3550, 3800) * (1 - sm(3800, 3950));
    const fill = Math.max(0.02, pourFill - 0.2 * sm(3600, 3900));
    const dk = LB.dk; dk.g.updateMatrixWorld();
    const G0 = V(2.15, 1.59, 0.15), mouthD = toLounge(dk.g, V(0, 1.58, 0.62));
    const G1 = mouthD.clone().add(V(0, -0.42, 0));
    const gp = G0.clone().lerp(G1, sip);
    LB.glass.position.copy(gp);
    const toD = toLounge(dk.g, V(0, 1.6, 0)).sub(gp); toD.y = 0; toD.normalize();
    const axis = V(toD.z, 0, -toD.x).normalize();
    LB.glass.quaternion.setFromAxisAngle(axis, tiltA);
    LB.liq.scale.y = 0.34 * fill; LB.liq.position.y = 0.03 + 0.17 * fill;
    const stEnv = sm(2080, 2200) * (1 - sm(2950, 3080));
    LB.stream.visible = stEnv > 0.02;
    if (LB.stream.visible) { const surf = gp.clone().add(V(Math.sin(now / 70) * 0.01, 0.03 + 0.34 * fill, 0)); setLimb(LB.stream, mouth, surf); LB.stream.scale.x = LB.stream.scale.z = stEnv; }
    const up = V(0, 1, 0).applyQuaternion(LB.glass.quaternion);
    const dGrip = gp.clone().add(up.multiplyScalar(0.18)).add(toD.clone().multiplyScalar(0.18));
    const DSL = toLounge(dk.g, V(-0.5, 1.15, 0)), DSR = toLounge(dk.g, V(0.5, 1.15, 0));
    const dE = ik(DSL, dGrip, 0.72, V(0, -1, 0.3));
    setLimb(LB.dkArmL[0], DSL, dE); setLimb(LB.dkArmL[1], dE, dGrip); LB.hands[2].position.copy(dGrip);
    const restR = toLounge(dk.g, V(0.45, 0.45, 0.45)), dER = ik(DSR, restR, 0.72, V(0, -1, 0));
    setLimb(LB.dkArmR[0], DSR, dER); setLimb(LB.dkArmR[1], dER, restR); LB.hands[3].position.copy(restR);
    [[-0.2], [0.2]].forEach((s, i) => {
      const hip = toLounge(dk.g, V(s[0], 0.05, 0.05)), knee = toLounge(dk.g, V(s[0], 0.0, 0.6)), foot = toLounge(dk.g, V(s[0], -0.92, 0.66));
      setLimb(LB.dkLegs[i * 2], hip, knee); setLimb(LB.dkLegs[i * 2 + 1], knee, foot);
      LB.shoes[i].position.copy(foot).add(V(0, -0.02, 0)); LB.shoes[i].rotation.y = dk.g.rotation.y;
    });
    const dlook = t < 3300 ? (t >= 260 ? gripPos : LB.shelf[L.sel].position) : toLounge(bt.g, V(0, 1.8, 0));
    const dl = dk.g.worldToLocal(lounge.localToWorld(dlook.clone()));
    dk.head.rotation.y = clamp(Math.atan2(dl.x, dl.z), -0.8, 0.8) * 0.7;
    dk.head.rotation.x = -0.5 * sip + (t > 4000 && t < 6000 ? Math.sin((t - 4000) / 260) * 0.04 : 0);
    const talking = t > 4100 && t < 5900;
    dk.mouth.scale.y = talking ? 0.25 + 0.6 * Math.abs(Math.sin(now / 95)) : 0.25;
    const bl2 = blinkScale(now, 4100, 1700); dk.eyes.forEach((e) => { e.scale.y = bl2; });
    LB.neon.material.opacity = 0.85 + 0.15 * Math.sin(now / 300) * Math.sin(now / 1700);

    const vis = active === 'lounge' ? 1 : 0;
    const place = (el, anchor, tail, oy) => {
      const s = project(lounge.localToWorld(anchor.clone()));
      const w = el.offsetWidth, h = el.offsetHeight;
      let x = s[0] - w * tail, y = s[1] - h - (oy || 14);
      x = clamp(x, 16, window.innerWidth - w - 16); y = clamp(y, 76, window.innerHeight - h - 16);
      el.style.setProperty('--tail', clamp(s[0] - x, 24, w - 24) + 'px');
      return [x, y];
    };
    const pop = (a, b) => { const x = seg(a, b); return x <= 0 ? 0.6 : 0.6 + 0.4 * outBack(x); };
    let pos = place(bubT, toLounge(bt.g, V(0, 2.35, 0)), 0.85);
    let o = seg(780, 880) * (1 - seg(1700, 1900)) * vis;
    bubT.style.opacity = o; bubT.style.transform = 'translate(' + pos[0] + 'px,' + pos[1] + 'px) scale(' + pop(780, 1080) + ')';
    pos = place(bubD, toLounge(dk.g, V(0, 2.4, 0)), 0.3);
    o = seg(2150, 2250) * (1 - seg(3150, 3300)) * vis;
    bubD.textContent = '.'.repeat(1 + Math.floor(Math.max(0, t - 2200) / 300) % 3);
    bubD.style.opacity = o; bubD.style.transform = 'translate(' + pos[0] + 'px,' + pos[1] + 'px) scale(' + pop(2150, 2400) + ')';
    pos = place(bubK, toLounge(dk.g, V(0, 2.4, 0)), 0.4);
    o = seg(4000, 4150) * vis;
    bubK.style.opacity = o; bubK.style.transform = 'translate(' + pos[0] + 'px,' + pos[1] + 'px) scale(' + pop(4000, 4380) + ')';
    bubK.classList.toggle('live', o > 0.5);
    Array.from(talkPts.children).forEach((el, i) => { const a = 4350 + i * 520, x = sm(a, a + 320); el.style.opacity = x; el.style.transform = 'translateY(' + (8 * (1 - x)) + 'px)'; });
  }

  function updateBaggage(dt, now) {
    const target = BG.sel < 0 && !reduced ? 1 : 0;
    BG.v += (target - BG.v) * (1 - Math.exp(-dt * 2.2));
    BG.dist += BG.v * dt * 1.6;
    const total = laneLen();
    BG.slats.forEach((s) => { const pnt = laneAt(s.a * total + BG.dist); s.m.position.set(pnt.x, 0.66, pnt.z); s.m.rotation.y = pnt.ang; });
    BG.bags.forEach((g, i) => {
      BG.lifts[i] += ((BG.sel === i ? 1 : 0) - BG.lifts[i]) * (1 - Math.exp(-dt * 5));
      const pnt = laneAt(BG.dist + i * total / PROJECTS.length);
      g.position.set(pnt.x, 0.66 + BG.lifts[i] * (1.6 + Math.sin(now / 420) * 0.08), pnt.z);
      g.rotation.set(0, pnt.ang + BG.lifts[i] * Math.sin(now / 900) * 0.4, 0);
    });
  }

  function updateArrivals(now) {
    const t = reduced ? 0 : now;
    const ph = (t % 9000) / 9000, u = smooth(0, 0.8, ph);
    AR.lp.position.set(1.4 - 8 * u, 5.0 - 2.5 * (1 - Math.pow(1 - u, 1.6)), -3.18);
    AR.lp.rotation.z = (-4 + 10 * u) * D2R;
    AR.lp.visible = ph < 0.82;
    const dph = (t % 7000) / 7000, open = smooth(0.55, 0.63, dph) * (1 - smooth(0.85, 0.93, dph));
    AR.doors[0].position.x = 4.5 - 1.1 * open; AR.doors[1].position.x = 5.9 + 1.1 * open;
    const gr = AR.gr; gr.g.position.y = 1.0 + Math.sin(t / 900) * 0.015; gr.g.updateMatrixWorld();
    const bob = Math.sin(t / 520) * 0.04;
    const cardC = toArr(gr.g, V(0, 1.12 + bob, 0.62));
    AR.card.position.copy(cardC); AR.card.rotation.set(-0.05, gr.g.rotation.y, 0);
    [-1, 1].forEach((s, i) => {
      const S = toArr(gr.g, V(0.5 * s, 1.15, 0)), Hh = toArr(gr.g, V(0.9 * s, 1.1 + bob, 0.66));
      const E = ik(S, Hh, 0.6, toArr(gr.g, V(1.5 * s, 0.6, -0.3)).sub(S).normalize());
      setLimb(AR.arms[i * 2], S, E); setLimb(AR.arms[i * 2 + 1], E, Hh); AR.hands[i].position.copy(Hh);
      const hip = toArr(gr.g, V(0.2 * s, 0.05, 0)), foot = toArr(gr.g, V(0.22 * s, -0.92, 0.05));
      setLimb(AR.legs[i], hip, foot); AR.shoes[i].position.copy(foot).add(V(0, -0.02, 0.08)); AR.shoes[i].rotation.y = gr.g.rotation.y;
    });
    const bl = blinkScale(now, 4200, 900); gr.eyes.forEach((e) => { e.scale.y = bl; });
    gr.head.rotation.z = Math.sin(t / 1300) * 0.05;
    if (sentAt > 0) {
      const ts = now - sentAt, fly = reduced ? 1 : smooth(0, 750, ts);
      const r = form.getBoundingClientRect();
      const slot = project(AR.slot.getWorldPosition(tmp2));
      const cx = r.left + r.width / 2 - (parseFloat(form.dataset.tx || 0)), cy = r.top + r.height / 2 - (parseFloat(form.dataset.ty || 0));
      const tx = (slot[0] - cx) * fly, ty = (slot[1] - cy) * fly - 90 * Math.sin(Math.PI * fly);
      form.dataset.tx = tx; form.dataset.ty = ty;
      form.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + (-14 * fly) + 'deg) scale(' + (1 - 0.92 * fly) + ')';
      form.style.opacity = 1 - smooth(650, 780, ts);
      AR.flag.rotation.x = Math.PI / 2 * (1 - smooth(700, 1000, ts));
      const dx = reduced ? 1 : clamp((ts - 850) / 380);
      done.style.opacity = dx; done.style.transform = 'scale(' + (dx > 0 ? 0.7 + 0.3 * outBack(dx) : 0.7) + ')';
      done.style.pointerEvents = dx > 0.5 ? 'auto' : 'none';
    } else { AR.flag.rotation.x = Math.PI / 2; form.dataset.tx = 0; form.dataset.ty = 0; }
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    scene.updateMatrixWorld();
    p = reduced ? targetP : p + (targetP - p) * (1 - Math.exp(-dt * 5));
    if (Math.abs(targetP - p) < 0.0002) p = targetP;
    const narrow = camera.aspect < 0.9;

    active = 'sky';
    ['lounge', 'baggage', 'arrivals'].forEach((k) => { if (enter[k] > 0.5) active = k; });
    let fadeA = 0, fadeColor = null;
    ['lounge', 'baggage', 'arrivals'].forEach((k) => { const f = clamp(1 - Math.abs(enter[k] - 0.5) * 5); if (f > fadeA) { fadeA = f; fadeColor = SCENE_BG[k]; } });
    fade.style.opacity = fadeA.toFixed(3);
    if (fadeColor) fade.style.background = '#' + fadeColor.getHexString();

    const u = clamp(p / 0.4), climb = clamp((p - 0.4) / 0.4), outro = clamp((p - 0.8) / 0.2);
    const px = -4 + 12 * u * u + 30 * climb + 26 * outro;
    const py = 1.05 + 18 * Math.pow(climb, 1.6) + 18 * outro;
    plane.position.set(px, py, 0);
    plane.rotation.set(Math.sin(clamp((p - 0.55) / 0.3) * Math.PI) * 6 * D2R, 0, (13 * smooth(0.31, 0.42, p) - 4 * smooth(0.5, 0.72, p)) * D2R);
    gear.visible = p < 0.5; gear.scale.y = 1 - smooth(0.44, 0.5, p);
    const t = now / 1000;
    clouds.forEach((c, i) => { c.rotation.y = Math.sin(t * 0.1 + i) * 0.1; });

    zoom += (zoomT - zoom) * (1 - Math.exp(-dt * (reduced ? 60 : 3.2)));
    if (!dragging) {
      if (qTarget) qCur.slerp(qTarget, 1 - Math.exp(-dt * (reduced ? 60 : 3.6)));
      else if (Math.abs(vel.x) + Math.abs(vel.y) > 0.002) { rotWorld(vel.x * dt, vel.y * dt); const kd = Math.exp(-dt * 2.6); vel.x *= kd; vel.y *= kd; }
      else if (idleSpin) rotWorld(dt * 0.08, 0);
    }
    globe.quaternion.copy(qCur);
    const ze = zoom * zoom * (3 - 2 * zoom) * smooth(0.94, 1, p) * (active === 'sky' ? 1 : 0);
    pins.forEach((pn, i) => {
      const on = i === sel;
      const want = on ? 1.1 + (ZS - 1.1) * ze : 0.82 - 0.3 * ze;
      pn.s += (want - pn.s) * (1 - Math.exp(-dt * 8));
      const pop = on ? 0.55 + 0.45 * outBack(clamp((now - pn.pop) / 420)) : 1;
      pn.pivot.scale.setScalar(pn.s * pop);
      pn.pivot.position.y = on ? (1 - ze) * (0.12 + Math.sin(t * 3) * 0.06) : 0;
      pn.pivot.rotation.y = on ? Math.sin(t * 0.9) * 0.3 * (1 - 0.6 * ze) : 0;
      const show = on ? stop : 0;
      if (pn.shown !== show) { pn.variants[pn.shown].visible = false; pn.variants[show].visible = true; pn.shown = show; }
    });

    if (active === 'sky') {
      if (narrow) { vA.set(20, 18, 50); lA.set(0, -2, 0); } else { vA.set(24, 16, 32); lA.set(-8, -1.5, 0); }
      vB.set(px + 7, 8, narrow ? 30 : 22); lB.set(px + 2, 0.6, 0);
      vC.set(px - 8, py - 0.5, narrow ? 28 : 20); lC.set(px + 3, py + 1.5, 0);
      vD.set(G.x, G.y, G.z + (narrow ? 46 : 38)); lD.set(G.x + (narrow ? 0 : 6.5), G.y + (narrow ? -4.5 : 2.2), G.z);
      const w1 = smooth(0.06, 0.32, p), w2 = smooth(0.38, 0.58, p), w3 = smooth(0.8, 1, p), w3l = smooth(0.74, 0.9, p);
      camPos.copy(vA).lerp(vB, w1).lerp(vC, w2).lerp(vD, w3);
      camLook.copy(lA).lerp(lB, w1).lerp(lC, w2).lerp(lD, w3l);
      if (ze > 0.001) {
        const h = BOTTLE_H[COUNTRIES[sel].stops[stop].shape] * ZS;
        if (narrow) { zPos.set(G.x, G.y + R + h * 0.55 + 1.6, G.z + 7.5 + h); zLook.set(G.x, G.y + R + h * 0.5 - 0.95, G.z); }
        else { zPos.set(G.x + 0.5, G.y + R + h * 0.55 + 0.9, G.z + 3.4 + h * 0.8); zLook.set(G.x + 0.5, G.y + R + h * 0.5 + 0.12, G.z); }
        camPos.lerp(zPos, ze); camLook.lerp(zLook, ze);
      }
      const dusk = smooth(0.45, 0.75, p), night = smooth(0.72, 0.98, p);
      sky.copy(daySky).lerp(duskSky, dusk * (1 - night)).lerp(nightSky, night);
      scene.fog.near = 60; scene.fog.far = 220 + 600 * night;
      sun.intensity = 0.85 * (1 - 0.6 * night); hemi.intensity = 0.62 - 0.22 * night;
      globeLight.intensity = 0.75 * night; starMat.opacity = night;
      if (lastActive !== 'sky') { sun.position.set(-10, 24, 14); sun.target.position.set(0, 0, 0); }
      nav.classList.toggle('is-light', night > 0.5 || dusk > 0.7);
    } else {
      const cam = sceneCam(active, narrow), o = ORIG[active];
      const k = smooth(0.5, 1, enter[active]);
      camPos.copy(cam[0]).add(o).add(V(0, 0.8 * (1 - k), 2.5 * (1 - k)));
      camLook.copy(cam[1]).add(o);
      sky.copy(SCENE_BG[active]);
      scene.fog.near = 120; scene.fog.far = 400;
      sun.intensity = 0.75; hemi.intensity = 0.62; globeLight.intensity = 0; starMat.opacity = 0;
      if (lastActive !== active) { sun.position.copy(o).add(V(-8, 18, 12)); sun.target.position.copy(o); }
      nav.classList.toggle('is-light', active !== 'baggage');
    }
    scene.fog.color.copy(sky);
    lastActive = active;
    camera.position.copy(camPos); camera.lookAt(camLook);

    if (active === 'lounge' || L.t0 >= 0) updateLounge(now);
    if (active !== 'lounge') { bubT.style.opacity = 0; bubD.style.opacity = 0; bubK.style.opacity = 0; bubK.classList.remove('live'); }
    if (active === 'baggage') updateBaggage(dt, now);
    if (active === 'arrivals' || sentAt > 0) updateArrivals(now);

    const inSky = active === 'sky' ? 1 : 0;
    hero.style.opacity = (1 - smooth(0.02, 0.12, p)).toFixed(3);
    cue.style.opacity = (1 - smooth(0.0, 0.06, p)).toFixed(3);
    arrive.style.opacity = (smooth(0.86, 0.95, p) * (1 - smooth(0.985, 1, targetP))).toFixed(3);
    hud.style.opacity = (inSky * smooth(0.0, 0.03, p) * (1 - smooth(0.8, 0.9, p))).toFixed(3);
    hudAlt.textContent = (Math.round((py - 1.05) / 36 * 12000 / 10) * 10).toLocaleString('en-US');
    hudSpd.textContent = Math.round(p < 0.4 ? 150 * u : 150 + 130 * clamp((p - 0.4) / 0.6));
    hudPhase.textContent = p < 0.01 ? 'GATE' : p < 0.31 ? 'ROLLING' : p < 0.42 ? 'ROTATE' : p < 0.52 ? 'LIFTOFF' : 'CLIMB';

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  resize();
  rafId = requestAnimationFrame(frame);

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    disposers.forEach((d) => d());
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
