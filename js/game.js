'use strict';
/* ==========================================================================
   THE HOLLOW HOUSE — a first-person survival horror game
   --------------------------------------------------------------------------
   You are trapped inside the farmhouse of Silas Crane, a serial killer who
   never stops hunting. Find the three emblems that seal his front door,
   stay out of his sight, hide when you must — and escape.
   ========================================================================== */

(function () {

/* ------------------------------------------------------------------ utils */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const angLerp = (a, b, t) => { let d = (b - a + Math.PI * 3) % (Math.PI * 2) - Math.PI; return a + d * t; };

/* ------------------------------------------------------------------- map */
const CELL = 2, WALLH = 3.3, GW = 27, GH = 15;
// '#' wall · '.' floor · '+' doorway · 'F' front door
const MAP = [
  '###########################',
  '#.......#......#..........#',
  '#.......#......#..........#',
  '#.......+......+..........#',
  '#.......#......#..........#',
  '####+######+########+######',
  '#.........................#',
  '#.........................#',
  '###+#####+###++###+####+###',
  '#.....#.....#....#....#...#',
  '#.....#.....#....#....#...#',
  '#.....#.....#....#....#...#',
  '#.....#.....#....#....#...#',
  '#.....#.....#....#....#...#',
  '#############FF############',
];
const cw = (c) => c * CELL + CELL / 2; // cell -> world center

const ROOMS = {
  kitchen: { x0: 1, x1: 7,  z0: 1, z1: 4,  name: 'Kitchen' },
  dining:  { x0: 9, x1: 14, z0: 1, z1: 4,  name: 'Dining Room' },
  living:  { x0: 16, x1: 25, z0: 1, z1: 4, name: 'Living Room' },
  hall:    { x0: 1, x1: 25, z0: 6, z1: 7,  name: 'Hallway' },
  bedroom: { x0: 1, x1: 5,  z0: 9, z1: 13, name: 'Guest Bedroom' },
  bath:    { x0: 7, x1: 11, z0: 9, z1: 13, name: 'Bathroom' },
  foyer:   { x0: 13, x1: 16, z0: 9, z1: 13, name: 'Foyer' },
  study:   { x0: 18, x1: 21, z0: 9, z1: 13, name: 'Study' },
  garage:  { x0: 23, x1: 25, z0: 9, z1: 13, name: 'Workshop' },
};
function roomOf(wx, wz) {
  const x = Math.floor(wx / CELL), z = Math.floor(wz / CELL);
  for (const k in ROOMS) { const r = ROOMS[k]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return k; }
  return null;
}

const doorAt = new Map();      // "x,z" -> door
const blockedCells = new Set(); // furniture-occupied cells (killer pathing)
const colliders = [];           // {x0,x1,z0,z1} furniture AABBs

const cellAt = (x, z) => (x < 0 || z < 0 || x >= GW || z >= GH ? '#' : MAP[z][x]);
function isSolidForMove(x, z) {
  const c = cellAt(x, z);
  if (c === '#') return true;
  const d = doorAt.get(x + ',' + z);
  return !!(d && d.open < 0.45);
}
function isSolidForSight(x, z) {
  const c = cellAt(x, z);
  if (c === '#') return true;
  const d = doorAt.get(x + ',' + z);
  return !!(d && d.open < 0.5);
}
function losClear(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const steps = Math.ceil(Math.hypot(dx, dz) / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidForSight(Math.floor((ax + dx * t) / CELL), Math.floor((az + dz * t) / CELL))) return false;
  }
  return true;
}
function walkableForKiller(x, z) {
  if (x < 1 || z < 1 || x >= GW - 1 || z >= GH - 1) return false;
  const c = cellAt(x, z);
  if (c === '#' || c === 'F') return false;
  if (blockedCells.has(x + ',' + z)) return false;
  const d = doorAt.get(x + ',' + z);
  return !(d && d.locked);
}
function astar(sx, sz, tx, tz) {
  if (!walkableForKiller(tx, tz) || !walkableForKiller(sx, sz)) return null;
  const key = (x, z) => x + z * GW;
  const open = [{ x: sx, z: sz, g: 0, f: 0, p: null }];
  const best = new Map([[key(sx, sz), 0]]);
  const closed = new Set();
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const n = open.splice(bi, 1)[0];
    const k = key(n.x, n.z);
    if (closed.has(k)) continue;
    closed.add(k);
    if (n.x === tx && n.z === tz) {
      const path = []; let c = n;
      while (c) { path.push([c.x, c.z]); c = c.p; }
      return path.reverse();
    }
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = n.x + ox, nz = n.z + oz;
      if (!walkableForKiller(nx, nz)) continue;
      const g = n.g + 1, kk = key(nx, nz);
      if (best.has(kk) && best.get(kk) <= g) continue;
      best.set(kk, g);
      open.push({ x: nx, z: nz, g, f: g + Math.abs(tx - nx) + Math.abs(tz - nz), p: n });
    }
  }
  return null;
}
function nearestWalkable(x, z) {
  if (walkableForKiller(x, z)) return [x, z];
  for (let r = 1; r < 6; r++)
    for (let oz = -r; oz <= r; oz++)
      for (let ox = -r; ox <= r; ox++)
        if (walkableForKiller(x + ox, z + oz)) return [x + ox, z + oz];
  return [x, z];
}

/* ------------------------------------------------------------------ audio */
const AU = {
  ok: false,
  init() {
    if (this.ok) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // rain bed
    const rain = this.ctx.createBufferSource(); rain.buffer = this.noiseBuf; rain.loop = true;
    const rf = this.ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 750;
    const rg = this.ctx.createGain(); rg.gain.value = 0.045;
    rain.connect(rf); rf.connect(rg); rg.connect(this.master); rain.start();
    // dread drone (chase music), silent by default
    this.droneGain = this.ctx.createGain(); this.droneGain.gain.value = 0;
    const dl = this.ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 420;
    for (const f of [54, 55.5, 110.7]) {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(dl); o.start();
    }
    dl.connect(this.droneGain); this.droneGain.connect(this.master);
    this.ok = true;
  },
  now() { return this.ctx.currentTime; },
  env(node, t0, a, peak, dur) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  },
  tone(freq, dur, type = 'sine', vol = 0.2, pan = 0, slideTo = null) {
    if (!this.ok) return;
    const t0 = this.now();
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = this.ctx.createGain(); this.env(g, t0, 0.01, vol, dur);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    o.connect(g);
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  noise(dur, freq, vol, q = 1, type = 'bandpass', pan = 0) {
    if (!this.ok) return;
    const t0 = this.now();
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = rand(0.85, 1.15);
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); this.env(g, t0, 0.005, vol, dur);
    const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    s.connect(f); f.connect(g);
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    s.start(t0); s.stop(t0 + dur + 0.05);
  },
  step(vol, pitch = 1) { this.noise(0.13, 260 * pitch, vol, 1.4); },
  killerStep(vol, pan) {
    this.tone(52, 0.22, 'sine', vol * 0.9, pan);
    this.noise(0.1, 140, vol * 0.5, 1, 'lowpass', pan);
  },
  heartbeat(vol) { this.tone(48, 0.16, 'sine', vol); setTimeout(() => this.tone(44, 0.14, 'sine', vol * 0.75), 170); },
  thunder() {
    this.noise(2.6, 120, 0.5, 0.4, 'lowpass');
    setTimeout(() => this.noise(1.8, 70, 0.35, 0.4, 'lowpass'), 300);
  },
  creak(pan = 0) { this.tone(rand(150, 210), 0.7, 'sawtooth', 0.05, pan, rand(70, 100)); this.noise(0.5, 500, 0.05, 2, 'bandpass', pan); },
  slam(pan = 0) { this.noise(0.3, 90, 0.5, 0.5, 'lowpass', pan); },
  sting() { for (const f of [660, 693, 880, 466]) this.tone(f, 1.3, 'sawtooth', 0.06, rand(-0.4, 0.4), f * 0.5); },
  growl(pan = 0, vol = 0.25) { this.tone(64, 1.1, 'sawtooth', vol, pan, 42); this.noise(0.9, 200, vol * 0.5, 0.8, 'lowpass', pan); },
  whistleNote(f, t) { setTimeout(() => this.tone(f, 0.55, 'triangle', 0.045, rand(-0.5, 0.5)), t); },
  whistle() { const m = [523, 466, 392, 466, 349]; m.forEach((f, i) => this.whistleNote(f, i * 620)); },
  pickup() { this.tone(520, 0.12, 'sine', 0.15); this.tone(780, 0.2, 'sine', 0.12); },
  unlock() { this.noise(0.12, 900, 0.2, 3); this.tone(300, 0.25, 'square', 0.06, 0, 200); },
  locked() { this.noise(0.1, 500, 0.18, 2); this.noise(0.08, 420, 0.12, 2); },
  hurt() { this.noise(0.35, 250, 0.5, 0.8, 'lowpass'); this.tone(110, 0.4, 'sawtooth', 0.25, 0, 55); },
  scream() {
    for (const f of [820, 780, 660, 990]) this.tone(f, 0.8, 'sawtooth', 0.16, rand(-0.3, 0.3), f * 0.28);
    this.noise(0.7, 2400, 0.3, 0.5, 'highpass');
    this.tone(60, 0.9, 'sine', 0.5, 0, 38);
  },
  slash() {
    this.noise(0.22, 3400, 0.4, 0.7, 'highpass');
    this.tone(950, 0.28, 'sawtooth', 0.16, rand(-0.4, 0.4), 180);
    this.noise(0.3, 280, 0.4, 0.8, 'lowpass');
  },
  heal() { this.tone(392, 0.3, 'sine', 0.12); this.tone(523, 0.45, 'sine', 0.1); },
  breath(vol) { this.noise(0.5, 700, vol, 0.6, 'bandpass'); },
  paper() { this.noise(0.25, 2000, 0.1, 0.7); },
};

/* ---------------------------------------------------------------- textures */
function canvasTex(w, h, draw, repX = 1, repY = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}
function grime(g, w, h, n, alpha) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = 'rgba(0,0,0,' + rand(alpha).toFixed(3) + ')';
    const s = rand(2, 16);
    g.fillRect(rand(w), rand(h), s, s * rand(0.4, 2.2));
  }
}
const TEX = {};
function buildTextures() {
  TEX.floor = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#37281a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) {
      g.fillStyle = `rgb(${52 + rand(16) | 0},${37 + rand(12) | 0},${22 + rand(8) | 0})`;
      g.fillRect(0, y, w, 62);
      const off = rand(w);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(off, y, 3, 62); // plank seam
      for (let i = 0; i < 26; i++) { // grain
        g.strokeStyle = 'rgba(20,12,6,' + rand(0.05, 0.28).toFixed(2) + ')';
        g.lineWidth = rand(0.5, 1.6);
        const gy = y + rand(62);
        g.beginPath(); g.moveTo(0, gy); g.bezierCurveTo(w * 0.3, gy + rand(-4, 4), w * 0.7, gy + rand(-4, 4), w, gy); g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y + 62, w, 2);
    }
    grime(g, w, h, 260, 0.14);
  }, GW, GH);
  TEX.wall = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3f382d'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(58,52,40,0.9)'; g.fillRect(x, 0, 14, h); }
    for (let x = 8; x < w; x += 32) for (let y = 10; y < h; y += 34) {
      g.fillStyle = 'rgba(36,31,22,0.8)';
      g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill();
    }
    // grime running down the paper in streaks
    for (let i = 0; i < 22; i++) {
      const x = rand(w), y0 = rand(h * 0.6), len = rand(40, 180);
      const gr = g.createLinearGradient(0, y0, 0, y0 + len);
      gr.addColorStop(0, 'rgba(18,13,8,0.45)'); gr.addColorStop(1, 'rgba(18,13,8,0)');
      g.fillStyle = gr;
      g.fillRect(x, y0, rand(2, 9), len);
    }
    // old smears low on the wall
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(70,10,8,' + rand(0.08, 0.24).toFixed(2) + ')';
      g.beginPath(); g.ellipse(rand(w), h - rand(10, 70), rand(8, 26), rand(20, 60), rand(0.6), 0, 7); g.fill();
    }
    grime(g, w, h, 260, 0.2);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, h - 26, w, 26); // scuffed base
  }, 1, 1);
  TEX.ceil = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3b3a36'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 300, 0.2);
    for (let i = 0; i < 5; i++) { // water stains
      g.fillStyle = 'rgba(35,28,16,' + rand(0.1, 0.3).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h), rand(14, 46), 0, 7); g.fill();
    }
  }, GW, GH);
  TEX.wood = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a3320'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = 'rgba(25,15,7,' + rand(0.1, 0.4).toFixed(2) + ')';
      g.lineWidth = rand(0.6, 2);
      const y = rand(h);
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + rand(-6, 6)); g.stroke();
    }
  });
  TEX.metal = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#585d61'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 160, 0.22);
  });
  TEX.cloth = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#3d3f4c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, w, 1); }
    grime(g, w, h, 60, 0.12);
  });
  TEX.carpet = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b2a28'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,130,90,0.5)'; g.lineWidth = 5;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.strokeRect(24, 24, w - 48, h - 48);
    for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,' + rand(0.08, 0.2).toFixed(2) + ')'; g.fillRect(rand(w), rand(h), rand(2, 7), rand(2, 7)); }
  });
  TEX.blood = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(' + (78 + rand(30) | 0) + ',6,8,' + rand(0.35, 0.85).toFixed(2) + ')';
      const r = rand(3, i < 4 ? 34 : 10);
      g.beginPath(); g.arc(w / 2 + rand(-40, 40), h / 2 + rand(-40, 40), r, 0, 7); g.fill();
    }
  });
  TEX.apron = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#5a5346'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 80, 0.2);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = 'rgba(80,8,10,' + rand(0.3, 0.8).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h * 0.8) + h * 0.2, rand(3, 14), 0, 7); g.fill();
    }
  });
  TEX.painting = canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#151310'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2c2318'; g.fillRect(8, 8, w - 16, h - 16);
    // a smeared, wrong-looking portrait
    g.fillStyle = '#5d4a35'; g.beginPath(); g.ellipse(w / 2, h * 0.42, 22, 30, 0, 0, 7); g.fill();
    g.fillStyle = '#1a130c'; g.fillRect(w / 2 - 26, h * 0.62, 52, 40);
    g.fillStyle = '#0a0705';
    g.beginPath(); g.ellipse(w / 2 - 9, h * 0.38, 4, 6, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(w / 2 + 9, h * 0.38, 4, 6, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, h * 0.46); g.lineTo(w / 2 + rand(-10, 10), h * 0.6); g.stroke();
    grime(g, w, h, 90, 0.25);
    g.strokeStyle = '#6b5327'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
  });
  TEX.mask = canvasTex(128, 128, (g, w, h) => {
    // a stitched burlap hood, grinning too wide
    g.fillStyle = '#c3b18d'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(90,75,50,0.25)'; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 3) { g.fillStyle = 'rgba(90,75,50,0.18)'; g.fillRect(x, 0, 1, h); }
    grime(g, w, h, 70, 0.18);
    g.fillStyle = '#0a0503';
    g.beginPath(); g.ellipse(40, 46, 14, 18, 0.15, 0, 7); g.fill();
    g.beginPath(); g.ellipse(88, 46, 14, 18, -0.15, 0, 7); g.fill();
    g.strokeStyle = '#160a06'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(20, 90); g.quadraticCurveTo(64, 114, 108, 86); g.stroke();
    g.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) {
      const t = i / 8, x = 20 + 88 * t, y = 90 + Math.sin(t * Math.PI) * 17 - 2;
      g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 3, y + 7); g.stroke();
    }
    g.fillStyle = 'rgba(80,12,8,0.55)';
    g.fillRect(36, 60, 5, 26); g.fillRect(86, 60, 5, 30);
  });
  TEX.gore = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#b3a28a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      g.fillStyle = 'rgba(' + (70 + rand(40) | 0) + ',8,8,' + rand(0.25, 0.7).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h), rand(2, 9), 0, 7); g.fill();
    }
  });
  TEX.web = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(210,205,190,0.55)'; g.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(i / 6 * Math.PI / 2) * w * 1.4, Math.sin(i / 6 * Math.PI / 2) * h * 1.4);
      g.stroke();
    }
    for (let r = 14; r < 150; r += 14) {
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = i / 6 * Math.PI / 2, x = Math.cos(a) * r * rand(0.92, 1.05), y = Math.sin(a) * r * rand(0.92, 1.05);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  });
  TEX.window = canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = '#0d1626'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#241d14'; g.lineWidth = 10;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(150,170,200,0.12)'; g.lineWidth = 1; const x = rand(w); g.beginPath(); g.moveTo(x, rand(h)); g.lineTo(x - 3, rand(h)); g.stroke(); }
  });
}

/* ------------------------------------------------------------- three setup */
let renderer, scene, camera, flashlight, flashTarget, lightning, windowMats = [], flickerLights = [];
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let MAT = {};

function buildRenderer() {
  const canvas = $('game');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030407);
  scene.fog = new THREE.FogExp2(0x04050a, 0.062);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 80);
  scene.add(camera);

  flashlight = new THREE.SpotLight(0xfff2d8, 2.6, 26, 0.52, 0.45, 1.8);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.bias = -0.002;
  flashlight.position.set(0.12, -0.12, 0.1);
  flashTarget = new THREE.Object3D(); flashTarget.position.set(0, -0.18, -3);
  camera.add(flashlight); camera.add(flashTarget);
  flashlight.target = flashTarget;

  scene.add(new THREE.HemisphereLight(0x1c2740, 0x0a0806, 0.26));
  const moon = new THREE.DirectionalLight(0x30405e, 0.1);
  moon.position.set(-8, 14, -12); scene.add(moon);

  lightning = new THREE.DirectionalLight(0xcfe0ff, 0);
  lightning.position.set(4, 16, -20);
  scene.add(lightning);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function buildMaterials() {
  MAT.wall = new THREE.MeshStandardMaterial({ map: TEX.wall, roughness: 0.94 });
  MAT.floor = new THREE.MeshStandardMaterial({ map: TEX.floor, roughness: 0.72 });
  MAT.ceil = new THREE.MeshStandardMaterial({ map: TEX.ceil, roughness: 0.96 });
  MAT.wood = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85 });
  MAT.woodDark = new THREE.MeshStandardMaterial({ map: TEX.wood, color: 0x8a6a4a, roughness: 0.85 });
  MAT.metal = new THREE.MeshStandardMaterial({ map: TEX.metal, roughness: 0.5, metalness: 0.65 });
  MAT.cloth = new THREE.MeshStandardMaterial({ map: TEX.cloth, roughness: 1 });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xb9bdb6, roughness: 0.4 });
  MAT.carpet = new THREE.MeshStandardMaterial({ map: TEX.carpet, roughness: 1 });
  MAT.blood = new THREE.MeshStandardMaterial({ map: TEX.blood, transparent: true, roughness: 0.55, depthWrite: false });
  MAT.paper = new THREE.MeshStandardMaterial({ color: 0xcfc39a, roughness: 0.9 });
}

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
function put(mesh, x, y, z, ry = 0, shadow = true) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  scene.add(mesh);
  return mesh;
}
function addCollider(cx, cz, w, d) { colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }); }
function blockCell(x, z) { blockedCells.add(x + ',' + z); }

/* ------------------------------------------------------------ house build */
function buildHouse() {
  // floor & ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), MAT.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(GW * CELL / 2, 0, GH * CELL / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), MAT.ceil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(GW * CELL / 2, WALLH, GH * CELL / 2);
  scene.add(ceil);

  // walls (only cells that touch open space)
  const wallGeo = new THREE.BoxGeometry(CELL, WALLH, CELL);
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (cellAt(x, z) !== '#') continue;
    let visible = false;
    for (let oz = -1; oz <= 1 && !visible; oz++) for (let ox = -1; ox <= 1; ox++)
      if (cellAt(x + ox, z + oz) !== '#') { visible = true; break; }
    if (!visible) continue;
    const m = new THREE.Mesh(wallGeo, MAT.wall);
    m.position.set(cw(x), WALLH / 2, cw(z));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }

  // doors
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    const c = cellAt(x, z);
    if (c === '+') makeDoor(x, z, {});
  }
  makeFrontDoor();

  // room lights (dim, some flickering)
  const lamp = (x, z, color, inten, flicker) => {
    const l = new THREE.PointLight(color, inten, 13, 1.8);
    l.position.set(x, WALLH - 0.55, z);
    scene.add(l);
    const fixture = box(0.22, 0.14, 0.22, MAT.metal);
    put(fixture, x, WALLH - 0.1, z, 0, false);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color }));
    bulb.position.set(x, WALLH - 0.24, z); scene.add(bulb);
    const rec = { light: l, bulb: bulb.material, base: inten, flicker, t: rand(10) };
    flickerLights.push(rec);
    return rec;
  };
  lamp(cw(4), cw(2.5), 0xffd9a0, 0.55, 0.55);   // kitchen
  lamp(cw(11.5), cw(2.5), 0xffd9a0, 0.5, 0.2);  // dining
  lamp(cw(20.5), cw(2.5), 0xffc890, 0.45, 0.35);// living
  lamp(cw(7), cw(6.5), 0xffe0b0, 0.5, 0.8);     // hall west (bad wiring)
  lamp(cw(19), cw(6.5), 0xffe0b0, 0.5, 0.3);    // hall east
  const foyerL = lamp(cw(14.5), cw(11), 0xffd0a0, 0.85, 0.25); // foyer chandelier
  foyerL.light.castShadow = true; foyerL.light.shadow.mapSize.set(512, 512);
  lamp(cw(19.5), cw(11), 0xffe6c0, 0.5, 0.15);  // study
  lamp(cw(24), cw(11), 0xbfd4ff, 0.4, 0.9);     // workshop (cold, dying tube)
  lamp(cw(3), cw(11), 0xffd9a0, 0.45, 0.3);     // bedroom
  lamp(cw(9), cw(11), 0xcfe0d8, 0.35, 0.6);     // bathroom

  // windows (north wall) — glow with lightning, nailed over with planks
  const winPos = [3, 6, 11, 13, 17, 21, 24];
  for (const x of winPos) {
    const m = new THREE.MeshStandardMaterial({ map: TEX.window, emissive: 0x223652, emissiveIntensity: 0.5, emissiveMap: TEX.window, roughness: 0.4 });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.8), m);
    w.position.set(cw(x), 1.85, CELL + 0.02);
    scene.add(w);
    windowMats.push(m);
    for (let p = 0; p < 3; p++) {
      const plank = box(1.75, 0.22, 0.05, MAT.wood);
      plank.position.set(cw(x) + rand(-0.08, 0.08), 1.3 + p * 0.52 + rand(-0.05, 0.05), CELL + 0.09);
      plank.rotation.z = rand(-0.13, 0.13);
      scene.add(plank);
    }
  }

  // paintings in hall + rooms
  const paint = (x, z, ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.2), new THREE.MeshStandardMaterial({ map: TEX.painting, roughness: 0.8 }));
    p.position.set(x, 1.9, z); p.rotation.y = ry;
    p.rotation.z = rand(-0.06, 0.06);
    scene.add(p);
  };
  paint(cw(3), 5 * CELL + CELL + 0.02, 0);
  paint(cw(9), 5 * CELL + CELL + 0.02, 0);
  paint(cw(16), 5 * CELL + CELL + 0.02, 0);
  paint(cw(23), 5 * CELL + CELL + 0.02, 0);
  paint(cw(6), 8 * CELL - 0.02, Math.PI);
  paint(cw(21), 8 * CELL - 0.02, Math.PI);

  // blood decals
  const bloodAt = (x, z, s, ry = rand(7)) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(s, s), MAT.blood);
    b.rotation.x = -Math.PI / 2; b.rotation.z = ry;
    b.position.set(x, 0.012 + rand(0.004), z);
    scene.add(b);
  };
  bloodAt(cw(9), cw(11), 1.8); bloodAt(cw(9.7), cw(12), 1.1);
  bloodAt(cw(24), cw(12.5), 2.0); bloodAt(cw(24.6), cw(11.5), 1.2);
  bloodAt(cw(13), cw(6.5), 1.4); bloodAt(cw(5), cw(7), 0.9);
  bloodAt(cw(2), cw(2), 1.5); bloodAt(cw(11), cw(3), 0.8);
  // smeared drag mark in the hallway
  for (let i = 0; i < 8; i++) bloodAt(cw(13) + i * 0.8, cw(7) + Math.sin(i) * 0.2, 0.7, 0);
  // blood thrown up the walls
  const wallBlood = (x, y, z, ry, s) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(s, s), MAT.blood);
    b.position.set(x, y, z); b.rotation.y = ry; b.rotation.z = rand(7);
    scene.add(b);
  };
  wallBlood(cw(12), 1.1, 8 * CELL - 0.03, Math.PI, 1.7);
  wallBlood(cw(5), 1.3, CELL + 0.04, 0, 1.4);
  wallBlood(51.97, 1.2, cw(11), -Math.PI / 2, 2.0);
  wallBlood(cw(8) - 0.03 - 2, 1.1, cw(11), Math.PI / 2, 1.5);

  // scrawled warnings, written in something dark
  const scrawlTex = (text) => canvasTex(1024, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const bloods = ['#6e0d08', '#7d1009', '#570a06', '#8a1a0c'];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const step = Math.min(72, (w - 120) / Math.max(1, text.length - 1));
    // each letter dragged on by hand — uneven, layered, smeared
    for (let i = 0; i < text.length; i++) {
      const chx = w / 2 + (i - (text.length - 1) / 2) * step;
      const chy = h * 0.4 + rand(-14, 14);
      g.save();
      g.translate(chx, chy);
      g.rotate(rand(-0.16, 0.16));
      g.scale(rand(0.85, 1.2), rand(0.9, 1.35));
      g.font = 'bold 88px Georgia, serif';
      for (let p = 0; p < 4; p++) {
        g.fillStyle = bloods[(i + p) % 4];
        g.globalAlpha = p === 0 ? 0.92 : rand(0.25, 0.5);
        g.fillText(text[i], rand(-3.5, 3.5), rand(-3.5, 3.5));
      }
      g.globalAlpha = 1;
      g.restore();
      // finger-pull smear below some letters
      if (Math.random() < 0.55) {
        const gr = g.createLinearGradient(0, chy, 0, chy + 130);
        gr.addColorStop(0, 'rgba(110,13,8,0.5)'); gr.addColorStop(1, 'rgba(110,13,8,0)');
        g.fillStyle = gr;
        g.fillRect(chx + rand(-18, 10), chy, rand(5, 15), rand(50, 130));
      }
    }
    // heavy runs of blood with pooled ends
    for (let i = 0; i < 16; i++) {
      const x = rand(w * 0.08, w * 0.92), y = h * 0.4 + rand(20, 55);
      const len = rand(35, 160), dw = rand(3, 8);
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, 'rgba(110,12,8,0.85)'); gr.addColorStop(1, 'rgba(80,8,6,0.55)');
      g.fillStyle = gr;
      g.fillRect(x, y, dw, len);
      g.fillStyle = 'rgba(90,10,7,0.8)';
      g.beginPath(); g.arc(x + dw / 2, y + len, dw * 0.85, 0, 7); g.fill();
    }
    // spatter thrown around the words
    for (let i = 0; i < 70; i++) {
      g.fillStyle = 'rgba(' + (90 + rand(40) | 0) + ',12,8,' + rand(0.2, 0.7).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), h * 0.4 + rand(-80, 100), rand(1, 5), 0, 7); g.fill();
    }
  });
  const scrawl = (text, x, y, z, ry, sw = 2.4) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 0.375),
      new THREE.MeshStandardMaterial({ map: scrawlTex(text), transparent: true, roughness: 1, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.y = ry;
    scene.add(m);
  };
  scrawl('NOBODY LEAVES', cw(13.5), 2.1, 5 * CELL + CELL + 0.03, 0, 3.4);
  scrawl('HE HEARS YOU', 4.6, 2.0, 8 * CELL + CELL + 0.03, 0, 2.4);
  scrawl('STAY OUT', cw(24), 2.72, 8 * CELL + CELL + 0.03, 0, 1.9);

  // cobwebs in the high corners
  const webMat = new THREE.MeshBasicMaterial({ map: TEX.web, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const web = (x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), webMat);
    m.position.set(x, WALLH - 0.6, z); m.rotation.y = ry;
    scene.add(m);
  };
  web(2.6, 12.5, Math.PI / 4);
  web(51.4, 12.5, -Math.PI / 4);
  web(2.6, 15.5, Math.PI * 0.75);
  web(29.5, 27.4, Math.PI / 4);

  // rugs
  const rug = (x, z, w, d) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.carpet);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.008, z);
    r.receiveShadow = true; scene.add(r);
  };
  rug(cw(13.5), cw(6.5), 10, 2.6);
  rug(cw(3), cw(11.5), 3.4, 3.4);
  rug(cw(14.5), cw(11), 4.5, 4.5);

  buildFurniture();
}

/* ------------------------------------------------------------------ doors */
const doors = [];
function makeDoor(x, z, opt) {
  const alongX = cellAt(x - 1, z) === '#' && cellAt(x + 1, z) === '#'; // wall runs along X
  const cx = cw(x), cz = cw(z);
  const g = new THREE.Group();
  // frame posts + lintel
  const postW = 0.42;
  const mkPost = (off) => {
    const p = box(alongX ? postW : 0.3, WALLH, alongX ? 0.3 : postW, MAT.woodDark);
    p.position.set(alongX ? off : 0, WALLH / 2, alongX ? 0 : off);
    p.castShadow = true; p.receiveShadow = true;
    g.add(p);
    const half = postW / 2;
    if (alongX) addCollider(cx + off, cz, postW, 0.34);
    else addCollider(cx, cz + off, 0.34, postW);
  };
  mkPost(-(CELL / 2 - postW / 2)); mkPost(CELL / 2 - postW / 2);
  const lin = box(alongX ? CELL : 0.3, WALLH - 2.25, alongX ? 0.3 : CELL, MAT.woodDark);
  lin.position.set(0, 2.25 + (WALLH - 2.25) / 2, 0);
  g.add(lin);
  // hinged panel
  const hinge = new THREE.Group();
  const panelW = CELL - postW * 2 + 0.06;
  const panel = box(alongX ? panelW : 0.09, 2.25, alongX ? 0.09 : panelW, MAT.wood);
  panel.position.set(alongX ? panelW / 2 : 0, 2.25 / 2, alongX ? 0 : panelW / 2);
  panel.castShadow = true;
  hinge.add(panel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), MAT.metal);
  knob.position.set(alongX ? panelW - 0.14 : 0.08, 1.05, alongX ? 0.08 : panelW - 0.14);
  hinge.add(knob);
  hinge.position.set(alongX ? -(CELL / 2 - postW) : 0, 0, alongX ? 0 : -(CELL / 2 - postW));
  g.add(hinge);
  g.position.set(cx, 0, cz);
  scene.add(g);
  const d = {
    x, z, cx, cz, alongX, hinge,
    open: 0, target: 0, locked: !!opt.locked, keyId: opt.keyId || null,
    name: opt.name || 'Door', front: false, creaked: false,
  };
  doorAt.set(x + ',' + z, d);
  doors.push(d);
  return d;
}
let frontDoor = null;
function makeFrontDoor() {
  // double door across cells (13,14) & (14,14)
  const cx = 14 * CELL, cz = cw(14); // between the two cells
  const g = new THREE.Group();
  const mkPanel = (side) => {
    const hinge = new THREE.Group();
    const panel = box(1.78, 2.6, 0.12, MAT.woodDark);
    panel.position.set(-side * 1.78 / 2, 1.3, 0);
    panel.castShadow = true;
    hinge.add(panel);
    hinge.position.set(side * 1.86, 0, 0);
    g.add(hinge);
    return hinge;
  };
  const left = mkPanel(-1), right = mkPanel(1);
  // emblem slots on the right panel
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20),
      new THREE.MeshStandardMaterial({ color: 0x1a1712, emissive: 0x000000, roughness: 0.4, metalness: 0.6 }));
    s.position.set(0.5, 1.7 - i * 0.45, -0.07);
    s.rotation.y = Math.PI;
    right.children[0].add(s);
    slots.push(s.material);
  }
  const lin = box(4.2, WALLH - 2.6, 0.5, MAT.woodDark);
  lin.position.set(0, 2.6 + (WALLH - 2.6) / 2, 0);
  g.add(lin);
  g.position.set(cx, 0, cz);
  scene.add(g);
  // porch glimpse behind the door
  const porch = new THREE.Mesh(new THREE.PlaneGeometry(8, WALLH), new THREE.MeshStandardMaterial({ color: 0x0a1220, emissive: 0x0a1626, emissiveIntensity: 0.8 }));
  porch.position.set(cx, WALLH / 2, cz + 3.4); porch.rotation.y = Math.PI;
  scene.add(porch);
  frontDoor = {
    cx, cz, left, right, slots,
    open: 0, target: 0, locked: true, front: true,
  };
  const fd = { x: 13, z: 14, open: 0, locked: true, front: true, hinge: null };
  // both F cells share solid state via lookups below
  doorAt.set('13,14', frontDoor); doorAt.set('14,14', frontDoor);
}
function updateDoors(dt) {
  for (const d of doors) {
    d.open = lerp(d.open, d.target, clamp(dt * 3.2, 0, 1));
    const ang = d.open * 1.85;
    d.hinge.rotation.y = d.alongX ? -ang : ang;
  }
  if (frontDoor) {
    frontDoor.open = lerp(frontDoor.open, frontDoor.target, clamp(dt * 1.6, 0, 1));
    frontDoor.left.rotation.y = -frontDoor.open * 1.9;
    frontDoor.right.rotation.y = frontDoor.open * 1.9;
  }
}

/* -------------------------------------------------------------- furniture */
const hideSpots = []; // wardrobes/lockers
function buildFurniture() {
  const T = MAT.wood, TD = MAT.woodDark, M = MAT.metal, C = MAT.cloth, W = MAT.white;

  const table = (x, z, w, d, mat = T) => {
    put(box(w, 0.08, d, mat), x, 0.78, z);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      put(box(0.09, 0.78, 0.09, mat), x + ox * (w / 2 - 0.1), 0.39, z + oz * (d / 2 - 0.1));
    addCollider(x, z, w, d);
  };
  const chair = (x, z, ry = 0) => {
    const g = new THREE.Group();
    const seat = box(0.44, 0.06, 0.44, T); seat.position.y = 0.45; g.add(seat);
    const back = box(0.44, 0.55, 0.06, T); back.position.set(0, 0.75, -0.2); g.add(back);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box(0.06, 0.45, 0.06, T); leg.position.set(ox * 0.18, 0.22, oz * 0.18); g.add(leg);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    addCollider(x, z, 0.5, 0.5);
  };
  const shelf = (x, z, w, ry = 0) => {
    const g = new THREE.Group();
    const body = box(w, 2.2, 0.4, TD); body.position.y = 1.1; g.add(body);
    for (let i = 0; i < 4; i++) {
      const b = box(w - 0.15, 0.16, 0.3, T);
      b.position.set(0, 0.4 + i * 0.5, 0.06); g.add(b);
      for (let j = 0; j < 5; j++) {
        if (Math.random() < 0.3) continue;
        const bk = box(rand(0.1, 0.16), rand(0.24, 0.34), 0.2,
          new THREE.MeshStandardMaterial({ color: [0x5d2b20, 0x3c4a34, 0x2f3550, 0x6b5327][j % 4], roughness: 0.9 }));
        bk.position.set(-w / 2 + 0.3 + j * (w - 0.5) / 4, 0.62 + i * 0.5, 0.06);
        g.add(bk);
      }
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const cs = Math.abs(Math.sin(ry)) > 0.5 ? [0.4, w] : [w, 0.4];
    addCollider(x, z, cs[0], cs[1]);
  };
  const wardrobe = (x, z, ry, label) => {
    const g = new THREE.Group();
    const body = box(1.3, 2.3, 0.75, TD); body.position.y = 1.15; g.add(body);
    const doorL = box(0.6, 2.1, 0.05, T); doorL.position.set(-0.33, 1.15, 0.4); g.add(doorL);
    const doorR = box(0.6, 2.1, 0.05, T); doorR.position.set(0.33, 1.15, 0.4); g.add(doorR);
    const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), M); k1.position.set(-0.06, 1.15, 0.44); g.add(k1);
    const k2 = k1.clone(); k2.position.x = 0.06; g.add(k2);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const cs = Math.abs(Math.sin(ry)) > 0.5 ? [0.75, 1.3] : [1.3, 0.75];
    addCollider(x, z, cs[0], cs[1]);
    const fx = Math.sin(ry), fz = Math.cos(ry);
    hideSpots.push({ x, z, ry, frontX: x + fx * 0.9, frontZ: z + fz * 0.9, label: label || 'wardrobe' });
  };
  const counter = (x, z, w) => {
    put(box(w, 0.9, 0.62, TD), x, 0.45, z);
    put(box(w, 0.05, 0.68, W), x, 0.93, z);
    addCollider(x, z, w, 0.68);
  };
  const bed = (x, z) => {
    put(box(1.5, 0.42, 2.1, TD), x, 0.21, z);
    put(box(1.42, 0.16, 2.0, C), x, 0.5, z);
    put(box(1.2, 0.1, 0.5, W), x, 0.6, z - 0.7);
    put(box(1.5, 0.9, 0.09, TD), x, 0.45, z - 1.08);
    addCollider(x, z, 1.6, 2.2);
  };
  const sofa = (x, z, ry) => {
    const g = new THREE.Group();
    const base = box(2.1, 0.45, 0.9, C); base.position.y = 0.3; g.add(base);
    const back = box(2.1, 0.6, 0.22, C); back.position.set(0, 0.75, -0.36); g.add(back);
    for (const s of [-1, 1]) { const arm = box(0.22, 0.35, 0.9, C); arm.position.set(s * 0.96, 0.62, 0); g.add(arm); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g);
    addCollider(x, z, Math.abs(Math.sin(ry || 0)) > 0.5 ? 1.0 : 2.2, Math.abs(Math.sin(ry || 0)) > 0.5 ? 2.2 : 1.0);
  };

  // --- bedroom (start room)
  bed(cw(4.4), cw(12.4)); blockCell(4, 12); blockCell(4, 13);
  put(box(0.9, 1.0, 0.5, TD), cw(1) + 0.1, 0.5, cw(9.4)); addCollider(cw(1) + 0.1, cw(9.4), 0.9, 0.5); blockCell(1, 9);
  wardrobe(cw(1.4), cw(13.2), Math.PI / 2, 'wardrobe'); blockCell(1, 13);
  chair(cw(1.6), cw(10.6), Math.PI / 2);

  // --- kitchen
  counter(cw(3), CELL + 0.42, 6); for (let x = 1; x <= 5; x++) blockCell(x, 1);
  put(box(0.85, 1.9, 0.75, M), cw(6.7), 0.95, CELL + 0.5); addCollider(cw(6.7), CELL + 0.5, 0.85, 0.75); blockCell(6, 1); blockCell(7, 1);
  table(cw(3.6), cw(3.2), 1.5, 1.0); blockCell(3, 3);
  chair(cw(3), cw(3.9)); chair(cw(4.2), cw(2.6), Math.PI);
  // knives + hooks on the wall, unsettling
  for (let i = 0; i < 4; i++) {
    const kn = box(0.05, 0.4, 0.02, M); put(kn, cw(2) + i * 0.35, 1.7, CELL + 0.05);
  }

  // --- dining room
  table(cw(11.5), cw(2.5), 3.4, 1.3); blockCell(10, 2); blockCell(11, 2); blockCell(12, 2); blockCell(11, 3);
  chair(cw(10.3), cw(3.5)); chair(cw(11.6), cw(3.5)); chair(cw(12.8), cw(3.5));
  chair(cw(10.3), cw(1.6), Math.PI); chair(cw(12.8), cw(1.6), Math.PI);
  // place settings for guests who never left
  for (let i = 0; i < 3; i++) put(box(0.26, 0.03, 0.26, W), cw(10.3) + i * 1.25, 0.85, cw(2.5), rand(0.5), false);

  // --- living room
  sofa(cw(18.5), cw(3.4), Math.PI); blockCell(18, 3); blockCell(19, 3);
  table(cw(18.5), cw(2.2), 1.1, 0.6, TD);
  // fireplace on the north wall
  put(box(2.0, 1.7, 0.5, new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 })), cw(21), 0.85, CELL + 0.35);
  put(box(1.2, 1.1, 0.4, new THREE.MeshStandardMaterial({ color: 0x0c0906, roughness: 1 })), cw(21), 0.55, CELL + 0.42);
  put(box(2.2, 0.12, 0.6, TD), cw(21), 1.78, CELL + 0.35);
  addCollider(cw(21), CELL + 0.35, 2.1, 0.8); blockCell(20, 1); blockCell(21, 1);
  const ember = new THREE.PointLight(0xff5a1e, 0.7, 6, 2);
  ember.position.set(cw(21), 0.6, CELL + 0.7); scene.add(ember);
  flickerLights.push({ light: ember, base: 0.7, flicker: 0.5, t: rand(10), bulb: null });
  shelf(cw(25) - 0.25, cw(2.5), 2.4, Math.PI / 2); blockCell(25, 2);
  chair(cw(17), cw(2), 0.7);
  put(box(0.5, 0.62, 0.5, TD), cw(16.4), 0.31, cw(3.6)); addCollider(cw(16.4), cw(3.6), 0.5, 0.5);

  // --- hallway clutter
  put(box(0.8, 0.8, 0.34, TD), cw(11), 0.4, 6 * CELL + 0.24); addCollider(cw(11), 6 * CELL + 0.24, 0.8, 0.34);
  put(box(0.8, 0.8, 0.34, TD), cw(17), 0.4, 8 * CELL - 0.24); addCollider(cw(17), 8 * CELL - 0.24, 0.8, 0.34);

  // --- bathroom
  put(box(1.7, 0.6, 0.8, W), cw(10.4), 0.3, cw(12.7)); addCollider(cw(10.4), cw(12.7), 1.7, 0.8); blockCell(10, 12); blockCell(11, 12); blockCell(10, 13); blockCell(11, 13);
  put(box(0.55, 0.85, 0.5, W), cw(7.5), 0.42, cw(12.8)); addCollider(cw(7.5), cw(12.8), 0.55, 0.5); blockCell(7, 12);
  put(box(0.7, 0.95, 0.5, W), cw(7.5), 0.48, cw(9.5)); addCollider(cw(7.5), cw(9.5), 0.7, 0.5); blockCell(7, 9);
  // cracked mirror
  put(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x6a7c86, roughness: 0.15, metalness: 0.9 })), cw(7.5), 1.7, 9 * CELL + 0.03, 0, false);

  // --- foyer
  put(box(0.9, 0.95, 0.4, TD), cw(16.3), 0.47, cw(12.8)); addCollider(cw(16.3), cw(12.8), 0.9, 0.4); blockCell(16, 12);
  put(box(0.16, 1.8, 0.16, TD), cw(13.3), 0.9, cw(12.8)); addCollider(cw(13.3), cw(12.8), 0.3, 0.3);

  // --- study
  table(cw(19.7), cw(12.3), 1.9, 0.95, TD); blockCell(19, 12); blockCell(20, 12);
  chair(cw(19.7), cw(11.4));
  shelf(cw(19.5), 9 * CELL + 0.25, 3); blockCell(19, 9); blockCell(20, 9);
  wardrobe(43.2, 18.55, 0, 'closet'); blockCell(21, 9);
  // desk lamp
  const dl = new THREE.PointLight(0x9fe8b0, 0.5, 5, 2);
  dl.position.set(cw(20.2), 1.1, cw(12.3)); scene.add(dl);
  put(box(0.1, 0.34, 0.1, M), cw(20.2), 0.98, cw(12.3));

  // --- workshop
  counter(cw(24.5), 9 * CELL + 0.42, 2.6); blockCell(24, 9); blockCell(25, 9);
  shelf(cw(23) + 0.25, cw(11.5), 2.2, -Math.PI / 2); blockCell(23, 11);
  wardrobe(cw(25.4), cw(13), -Math.PI / 2, 'metal locker'); blockCell(25, 13);
  for (let i = 0; i < 3; i++) {
    const bx = box(rand(0.5, 0.8), rand(0.4, 0.7), rand(0.5, 0.8), TD);
    put(bx, cw(24.5) + rand(-0.5, 0.5), 0.3, cw(12) + rand(-0.6, 0.6), rand(0.7));
  }
  addCollider(cw(24.5), cw(12), 1.4, 1.4); blockCell(24, 12);
  // hanging chains, and the shapes that hang from them
  for (let i = 0; i < 3; i++) {
    const ch = box(0.03, rand(0.8, 1.4), 0.03, M);
    put(ch, cw(23.6) + i * 0.7, WALLH - ch.geometry.parameters.height / 2, cw(10.5), 0, false);
    const carc = box(0.34, rand(0.7, 1.0), 0.26, new THREE.MeshStandardMaterial({ map: TEX.gore, roughness: 0.9 }));
    put(carc, cw(23.6) + i * 0.7, 1.65, cw(10.5), rand(0.6));
  }
  // something person-sized under a stained sheet
  const mound = box(1.7, 0.5, 0.7, new THREE.MeshStandardMaterial({ map: TEX.apron, roughness: 1 }));
  put(mound, cw(24), 0.25, cw(13.4), 0.3);
  addCollider(cw(24), cw(13.4), 1.8, 1.0);
}

/* ------------------------------------------------------------------ items */
const interactables = [];
const INV = { emblems: 0, owl: false, wolf: false, serpent: false, rustyKey: false, medkits: 0 };
let itemMeshes = [];

function emblemMesh(color) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 22),
    new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.3, emissive: color, emissiveIntensity: 0.12 }));
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  return g;
}
function addItem(id, mesh, x, y, z, prompt, onTake) {
  mesh.position.set(x, y, z);
  mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(mesh);
  const it = { id, mesh, x, z, y, prompt, spin: true, taken: false,
    action() {
      if (it.taken) return;
      it.taken = true;
      scene.remove(mesh);
      AU.pickup();
      onTake();
      const i = interactables.indexOf(it); if (i >= 0) interactables.splice(i, 1);
    } };
  interactables.push(it);
  itemMeshes.push(it);
  return it;
}
function keyMesh() {
  const g = new THREE.Group();
  const shaft = box(0.03, 0.2, 0.03, MAT.metal); g.add(shaft);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 14), MAT.metal); bow.position.y = 0.13; g.add(bow);
  const tooth = box(0.05, 0.03, 0.03, MAT.metal); tooth.position.set(0.03, -0.07, 0); g.add(tooth);
  return g;
}
function medkitMesh() {
  const g = new THREE.Group();
  const b = box(0.34, 0.16, 0.24, MAT.white); b.position.y = 0.08; g.add(b);
  const red = new THREE.MeshStandardMaterial({ color: 0xa02020, roughness: 0.5 });
  const c1 = box(0.16, 0.05, 0.02, red); c1.position.set(0, 0.09, 0.121); g.add(c1);
  const c2 = box(0.05, 0.16, 0.02, red); c2.position.set(0, 0.09, 0.121); g.add(c2);
  return g;
}
function buildItems() {
  addItem('wolf', emblemMesh(0xc8ccd8), cw(2.2), 1.05, CELL + 0.5, 'Take the WOLF emblem', () => { INV.wolf = true; gotEmblem(0, 'Wolf'); });
  addItem('owl', emblemMesh(0xd8b25a), cw(19.2), 0.95, cw(12.3), 'Take the OWL emblem', () => { INV.owl = true; gotEmblem(1, 'Owl'); });
  addItem('serpent', emblemMesh(0x4fa06a), cw(7.5), 1.1, cw(9.5), 'Take the SERPENT emblem', () => {
    INV.serpent = true; gotEmblem(2, 'Serpent');
    const bd = doorAt.get('9,8');
    if (bd && !bd.locked && bd.open > 0.3) { bd.open = 0.12; bd.target = 0; }
    AU.slam(); AU.growl(0, 0.35);
    caption('The bathroom door slams shut behind you.', 3);
  });
  addItem('rusty', keyMesh(), cw(21), 1.98, CELL + 0.5, 'Take the rusty key', () => {
    INV.rustyKey = true; toast('Picked up: Rusty Key');
    caption('A rusty key. It smells of bleach.', 3.5); updateHud();
  });
  const mk = (x, y, z) => addItem('med' + (x | 0), medkitMesh(), x, y, z, 'Take the first aid kit', () => {
    INV.medkits++; toast('First Aid Kit (' + INV.medkits + ') — press Q to heal'); updateHud();
  });
  mk(cw(1) + 0.1, 1.02, cw(9.4));
  mk(cw(11.5) + 0.9, 0.84, cw(2.5));
  mk(cw(24.5), 0.98, 9 * CELL + 0.42);
  mk(cw(16.3), 1.0, cw(12.8));
  // the note that explains the way out
  const n = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), MAT.paper);
  n.rotation.x = -Math.PI / 2; n.rotation.z = rand(7);
  n.position.set(cw(3.6), 0.02, cw(9.4));
  scene.add(n);
  interactables.push({ x: cw(3.6), z: cw(9.4), y: 0.2, prompt: 'Read the note', mesh: n, spin: false, action() { openNote(); } });
  // lock the bathroom (rusty key)
  const bd = doorAt.get('9,8');
  if (bd) { bd.locked = true; bd.keyId = 'rusty'; bd.name = 'Bathroom'; }
}
function gotEmblem(idx, name) {
  INV.emblems++;
  const colors = [0xc8ccd8, 0xd8b25a, 0x4fa06a];
  const m = frontDoor.slots[idx];
  m.color.setHex(colors[idx]); m.emissive.setHex(colors[idx]); m.emissiveIntensity = 0.5;
  toast('Picked up: ' + name + ' Emblem (' + INV.emblems + '/3)');
  updateHud();
  if (INV.emblems >= 3) { setObjective('Unseal the front door in the foyer'); caption('All three emblems. The front door will open now.', 4); }
  else if (noteRead) setObjective('Collect the three emblems (' + INV.emblems + '/3)');
  // the house heard the mechanism click — he is coming to look
  noiseEvent(player.x, player.z, 60, true);
  caption('Somewhere in the house, footsteps stop… then turn toward you.', 4);
}

/* -------------------------------------------------------------- noise bus */
const noiseEvents = [];
function noiseEvent(x, z, r, urgent) { noiseEvents.push({ x, z, r, urgent: !!urgent }); }

/* ----------------------------------------------------------------- killer */
const TAUNTS = [
  '“You can’t leave. Nobody leaves.”',
  '“I hear your little heart.”',
  '“This house is hungry.”',
  '“Run. I like it when they run.”',
  '“Stay for dinner!”',
];
const killer = {
  grp: null, x: cw(17), z: cw(2), yaw: 0,
  state: 'patrol', path: null, pathI: 1, repathT: 0,
  lastSeen: null, loseT: 0, searchT: 0, investT: 0, detect: 0,
  attackCd: 0, attackT: -1, struck: false, walkPhase: 0, lastPh: 0,
  huntT: 40, tauntT: 6, whistleT: 10,
  bust: null, grace: 0, checkT: 2, lastX: 0, lastZ: 0,
};
function buildKiller() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b7d63, roughness: 0.75 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 1 });
  const apron = new THREE.MeshStandardMaterial({ map: TEX.apron, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.8 });
  const torso = box(0.68, 0.8, 0.38, cloth); torso.position.y = 1.24; torso.rotation.x = 0.16; g.add(torso);
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.98), apron); ap.position.set(0, 1.04, 0.21); g.add(ap);
  // hooded head on its own pivot so it can twitch
  const maskMat = new THREE.MeshStandardMaterial({ map: TEX.mask, roughness: 0.95 });
  const hood = new THREE.MeshStandardMaterial({ color: 0x59492f, roughness: 1 });
  const headG = new THREE.Group(); headG.position.set(0, 1.8, 0.08); g.add(headG);
  const head = box(0.32, 0.38, 0.32, hood); head.position.y = 0.04; headG.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.38), maskMat);
  face.position.set(0, 0.04, 0.165); headG.add(face);
  // frayed rope knotted at the neck
  const rope = box(0.36, 0.06, 0.36, dark); rope.position.y = -0.16; headG.add(rope);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    eye.position.set(s * 0.075, 0.1, 0.17); headG.add(eye);
  }
  const eyeGlow = new THREE.PointLight(0xff1808, 0.55, 3.2, 2);
  eyeGlow.position.set(0, 0.08, 0.3); headG.add(eyeGlow);
  killer.headG = headG;
  const mkLimb = (isArm, side) => {
    const pivot = new THREE.Group();
    const seg = box(isArm ? 0.16 : 0.2, isArm ? 0.68 : 0.95, isArm ? 0.16 : 0.22, cloth);
    seg.position.y = -(isArm ? 0.34 : 0.475);
    pivot.add(seg);
    if (isArm) { const hand = box(0.14, 0.15, 0.14, new THREE.MeshStandardMaterial({ map: TEX.gore, roughness: 0.85 })); hand.position.y = -0.72; pivot.add(hand); }
    else { const boot = box(0.22, 0.14, 0.32, dark); boot.position.set(0, -0.95, 0.05); pivot.add(boot); }
    pivot.position.set(side * (isArm ? 0.42 : 0.17), isArm ? 1.56 : 0.98, 0);
    g.add(pivot);
    return pivot;
  };
  killer.lArm = mkLimb(true, -1); killer.rArm = mkLimb(true, 1);
  killer.lLeg = mkLimb(false, -1); killer.rLeg = mkLimb(false, 1);
  const cl = new THREE.Group();
  const handle = box(0.035, 0.26, 0.035, MAT.wood); handle.position.y = -0.1; cl.add(handle);
  const blade = box(0.02, 0.34, 0.24, MAT.metal); blade.position.set(0, -0.36, 0.1); cl.add(blade);
  cl.position.set(0, -0.72, 0.02);
  killer.rArm.add(cl);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.14);
  g.position.set(killer.x, 0, killer.z);
  scene.add(g);
  killer.grp = g;
}
const PATROL_KEYS = ['kitchen', 'dining', 'living', 'hall', 'foyer', 'study', 'garage', 'bedroom'];
function randomPatrolCell() {
  const r = ROOMS[PATROL_KEYS[Math.floor(rand(PATROL_KEYS.length))]];
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rand(r.x0, r.x1 + 1)), z = Math.floor(rand(r.z0, r.z1 + 1));
    if (walkableForKiller(x, z)) return [x, z];
  }
  return [Math.floor(rand(2, 24)), 6];
}
function setPath(tx, tz) {
  const [sx, sz] = nearestWalkable(Math.floor(killer.x / CELL), Math.floor(killer.z / CELL));
  const [ax, az] = nearestWalkable(tx, tz);
  killer.path = astar(sx, sz, ax, az);
  killer.pathI = 1;
  return !!killer.path;
}
function panTo(o) {
  const ox = o.cx !== undefined ? o.cx : o.x;
  const oz = o.cz !== undefined ? o.cz : o.z;
  const dx = ox - player.x, dz = oz - player.z;
  const d = Math.hypot(dx, dz) || 0.001;
  return clamp((dx * Math.cos(player.yaw) + dz * -Math.sin(player.yaw)) / d, -1, 1);
}
function killerCanSee() {
  if (player.hidden || player.dead) return false;
  const d = dist2(killer.x, killer.z, player.x, player.z);
  let range = 14 + (player.flash ? 3 : 0);
  if (player.crouch) range *= 0.8;
  if (d > range) return false;
  if (d > 2.2) {
    const dx = player.x - killer.x, dz = player.z - killer.z;
    const dot = (dx * Math.sin(killer.yaw) + dz * Math.cos(killer.yaw)) / (d || 0.001);
    if (dot < 0.42) return false;
  }
  return losClear(killer.x, killer.z, player.x, player.z);
}
function killerMove(dt, speed) {
  if (!killer.path || killer.pathI >= killer.path.length) return true;
  const [cx, cz] = killer.path[killer.pathI];
  const tx = cw(cx), tz = cw(cz);
  const dx = tx - killer.x, dz = tz - killer.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.3) { killer.pathI++; return killer.pathI >= killer.path.length; }
  killer.yaw = angLerp(killer.yaw, Math.atan2(dx, dz), clamp(dt * 6, 0, 1));
  killer.x += (dx / d) * speed * dt;
  killer.z += (dz / d) * speed * dt;
  killer.walkPhase += speed * dt * 1.9;
  return false;
}
function startChase() {
  if (killer.state === 'chase') return;
  killer.state = 'chase'; killer.detect = 1; killer.loseT = 0; killer.bust = null;
  killer.lastSeen = { x: player.x, z: player.z };
  AU.sting(); AU.growl(panTo(killer), 0.35);
  caption('HE SEES YOU. RUN.', 2.5);
}
function killerUpdate(dt) {
  const K = killer;
  K.attackCd = Math.max(0, K.attackCd - dt);
  K.grace = Math.max(0, K.grace - dt);
  const d = dist2(K.x, K.z, player.x, player.z);
  const sees = K.grace <= 0 && killerCanSee();

  // detection meter (forgiving: he needs a moment to be sure)
  if (K.state !== 'chase') {
    if (sees) {
      let rate = 0.45 + (1 - clamp(d / 16, 0, 1)) * 1.35;
      if (player.crouch) rate *= 0.55;
      if (!player.moving) rate *= 0.7;
      if (d < 3.2) rate = 4;
      K.detect = clamp(K.detect + rate * dt, 0, 1);
      if (K.detect >= 1) startChase();
    } else {
      K.detect = clamp(K.detect - 0.5 * dt, 0, 1);
    }
  }

  // hearing
  for (const n of noiseEvents) {
    if (dist2(K.x, K.z, n.x, n.z) < n.r) {
      if (K.state === 'chase') K.lastSeen = { x: n.x, z: n.z };
      else if (n.urgent || K.state !== 'investigate' || Math.random() < 0.5) {
        K.state = 'investigate'; K.investT = 10;
        setPath(Math.floor(n.x / CELL), Math.floor(n.z / CELL));
      }
    }
  }
  noiseEvents.length = 0;

  // relentless: he periodically sweeps toward wherever you are
  K.huntT -= dt;
  if (K.huntT <= 0) {
    K.huntT = rand(35, 65);
    if (K.state === 'patrol') {
      K.state = 'investigate'; K.investT = 14;
      setPath(Math.floor(player.x / CELL) + Math.round(rand(-2, 2)), Math.floor(player.z / CELL) + Math.round(rand(-2, 2)));
      caption('Heavy boots on old wood. He is sweeping the house again.', 3.5);
    }
  }

  let speed = 0;
  if (K.state === 'patrol') {
    speed = 1.5;
    if (!K.path || killerMove(dt, speed)) { const [tx, tz] = randomPatrolCell(); setPath(tx, tz); }
    K.whistleT -= dt;
    if (K.whistleT <= 0) { K.whistleT = rand(16, 30); if (d < 26) AU.whistle(); }
  } else if (K.state === 'investigate') {
    speed = 2.3;
    K.investT -= dt;
    const done = !K.path || killerMove(dt, speed);
    if (done || K.investT <= 0) { K.state = 'patrol'; K.path = null; }
  } else if (K.state === 'search') {
    speed = 1.9;
    K.searchT -= dt;
    if (!K.path || killerMove(dt, speed))
      setPath(Math.floor(K.x / CELL) + Math.round(rand(-3, 3)), Math.floor(K.z / CELL) + Math.round(rand(-3, 3)));
    if (K.searchT <= 0) { K.state = 'patrol'; K.path = null; K.detect = 0.3; caption('The footsteps fade. He has moved on — for now.', 3.5); }
  } else if (K.state === 'chase') {
    speed = 3.4;
    if (sees || d < 3) { K.lastSeen = { x: player.x, z: player.z }; K.loseT = 0; } else K.loseT += dt;
    if (K.bust) {
      const bd = dist2(K.x, K.z, K.bust.frontX, K.bust.frontZ);
      if (bd > 1.2) {
        K.repathT -= dt;
        if (!K.path || K.repathT <= 0) { setPath(Math.floor(K.bust.frontX / CELL), Math.floor(K.bust.frontZ / CELL)); K.repathT = 0.6; }
        killerMove(dt, speed);
      } else bustHide();
    } else if (sees && d > 1.2) {
      const dx = player.x - K.x, dz = player.z - K.z;
      const dd = Math.hypot(dx, dz) || 0.001;
      K.yaw = angLerp(K.yaw, Math.atan2(dx, dz), clamp(dt * 7, 0, 1));
      K.x += (dx / dd) * speed * dt;
      K.z += (dz / dd) * speed * dt;
      K.walkPhase += speed * dt * 1.9;
    } else if (K.lastSeen) {
      K.repathT -= dt;
      if (!K.path || K.repathT <= 0) { setPath(Math.floor(K.lastSeen.x / CELL), Math.floor(K.lastSeen.z / CELL)); K.repathT = 0.7; }
      if (killerMove(dt, speed) && !sees) { K.state = 'search'; K.searchT = 7; K.path = null; K.detect = 0.4; }
    }
    if (K.loseT > 5 && d > 8) { K.state = 'search'; K.searchT = 6; K.path = null; K.bust = null; K.detect = 0.4; }
    if (!player.dead && !player.hidden && d < 1.5 && K.attackCd <= 0 && K.attackT < 0) { K.attackT = 0; K.attackCd = 1.7; }
    K.tauntT -= dt;
    if (K.tauntT <= 0) { K.tauntT = rand(5, 9); AU.growl(panTo(K), 0.3); caption(TAUNTS[Math.floor(rand(TAUNTS.length))], 3); }
  }

  // swing attack animation + hit application
  if (K.attackT >= 0) {
    K.attackT += dt;
    const t = K.attackT;
    if (t < 0.22) K.rArm.rotation.x = lerp(0.2, -2.5, t / 0.22);
    else if (t < 0.38) {
      K.rArm.rotation.x = lerp(-2.5, 0.7, (t - 0.22) / 0.16);
      if (!K.struck && t > 0.3) {
        K.struck = true;
        AU.noise(0.2, 900, 0.25, 2);
        if (!player.dead && !player.hidden && dist2(K.x, K.z, player.x, player.z) < 2.1) damagePlayer(22, K);
      }
    } else if (t > 0.8) { K.attackT = -1; K.struck = false; }
  }

  // he shoulders doors open as he passes
  for (const dr of doors) {
    if (dr.locked) continue;
    if (dist2(K.x, K.z, dr.cx, dr.cz) < 1.7 && dr.target < 1) {
      dr.target = 1;
      const vol = clamp(1 - d / 20, 0, 1);
      if (vol > 0.05) AU.creak(panTo(dr));
    }
  }

  // limb animation
  const sw = Math.sin(K.walkPhase) * clamp(speed / 3, 0, 1) * 0.55;
  // the head lolls slowly — and twitches when he's after you
  const jit = K.state === 'chase' ? 1 : 0;
  K.headG.rotation.z = Math.sin(perfT * 0.9) * 0.14 + (jit ? rand(-0.07, 0.07) : 0);
  K.headG.rotation.x = 0.1 + (jit ? rand(-0.05, 0.05) : Math.sin(perfT * 0.53) * 0.06);
  K.lLeg.rotation.x = sw; K.rLeg.rotation.x = -sw;
  K.lArm.rotation.x = -sw * 0.8;
  if (K.attackT < 0) K.rArm.rotation.x = sw * 0.8;
  const ph = Math.floor(K.walkPhase / Math.PI);
  if (ph !== K.lastPh) {
    K.lastPh = ph;
    const vol = clamp(1 - d / 24, 0, 1);
    if (vol > 0.02) AU.killerStep(0.45 * vol + 0.04, panTo(K));
  }

  // keep him out of walls; watchdog un-sticks him
  const kc = collideCircle(K.x, K.z, 0.4, false);
  K.x = kc[0]; K.z = kc[1];
  K.checkT -= dt;
  if (K.checkT <= 0) {
    if (speed > 0.1 && dist2(K.x, K.z, K.lastX, K.lastZ) < 0.2) {
      const [nx, nz] = nearestWalkable(Math.floor(K.x / CELL), Math.floor(K.z / CELL));
      K.x = cw(nx); K.z = cw(nz); K.path = null;
    }
    K.lastX = K.x; K.lastZ = K.z; K.checkT = 2;
  }
  K.grp.position.set(K.x, 0, K.z);
  K.grp.rotation.y = K.yaw;
}

/* ----------------------------------------------------------------- player */
const player = {
  x: cw(2.6), z: cw(11.8), yaw: 0, pitch: 0,
  vx: 0, vz: 0, eye: 1.62, health: 100, stamina: 100,
  crouch: false, flash: true, hidden: false, hideSpot: null,
  moving: false, dead: false, sinceDmg: 99, sinceSprint: 9, stepAcc: 0, bobT: 0,
};
function collideCircle(px, pz, r, furniture = true) {
  const minX = Math.floor((px - r) / CELL), maxX = Math.floor((px + r) / CELL);
  const minZ = Math.floor((pz - r) / CELL), maxZ = Math.floor((pz + r) / CELL);
  for (let cz = minZ; cz <= maxZ; cz++) for (let cx = minX; cx <= maxX; cx++) {
    if (!isSolidForMove(cx, cz)) continue;
    const x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL;
    const nx = clamp(px, x0, x1), nz = clamp(pz, z0, z1);
    const dx = px - nx, dz = pz - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 0.000001) { pz = pz < (z0 + z1) / 2 ? z0 - r : z1 + r; }
      else { const d = Math.sqrt(d2); const push = (r - d) / d; px += dx * push; pz += dz * push; }
    }
  }
  if (furniture) for (const c of colliders) {
    const nx = clamp(px, c.x0, c.x1), nz = clamp(pz, c.z0, c.z1);
    const dx = px - nx, dz = pz - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 0.000001) {
        const dxl = px - c.x0, dxr = c.x1 - px, dzl = pz - c.z0, dzr = c.z1 - pz;
        const m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) px = c.x0 - r; else if (m === dxr) px = c.x1 + r;
        else if (m === dzl) pz = c.z0 - r; else pz = c.z1 + r;
      } else { const d = Math.sqrt(d2); const push = (r - d) / d; px += dx * push; pz += dz * push; }
    }
  }
  return [px, pz];
}
function playerUpdate(dt) {
  if (player.dead) return;
  player.sinceDmg += dt;
  if (player.hidden) {
    camera.position.set(player.x, 1.45 + Math.sin(perfT * 1.7) * 0.008, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch * 0.3;
    camera.rotation.z = 0;
    return;
  }
  const f = [-Math.sin(player.yaw), -Math.cos(player.yaw)];
  const r = [Math.cos(player.yaw), -Math.sin(player.yaw)];
  // keyboard look: arrow keys turn the view (no mouse needed)
  const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
  if (turn) player.yaw += turn * 2.6 * dt;
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyD) ix += 1;
  if (keys.KeyA) ix -= 1;
  const mag = Math.hypot(ix, iz) || 1; ix /= mag; iz /= mag;
  const wantSprint = (keys.ShiftLeft || keys.ShiftRight) && (ix !== 0 || iz !== 0) && player.stamina > 1 && !player.crouch;
  const speed = player.crouch ? 1.5 : wantSprint ? 4.9 : 2.75;
  if (wantSprint) { player.stamina = Math.max(0, player.stamina - 13 * dt); player.sinceSprint = 0; }
  else { player.sinceSprint += dt; if (player.sinceSprint > 0.7) player.stamina = Math.min(100, player.stamina + 13 * dt); }
  const k = clamp(dt * 10, 0, 1);
  player.vx = lerp(player.vx, (f[0] * iz + r[0] * ix) * speed, k);
  player.vz = lerp(player.vz, (f[1] * iz + r[1] * ix) * speed, k);
  const res = collideCircle(player.x + player.vx * dt, player.z + player.vz * dt, 0.33);
  player.x = res[0]; player.z = res[1];
  const spd = Math.hypot(player.vx, player.vz);
  player.moving = spd > 0.4;
  player.stepAcc += spd * dt;
  const stride = wantSprint ? 2.7 : player.crouch ? 1.7 : 2.1;
  if (player.stepAcc > stride && player.moving) {
    player.stepAcc = 0;
    AU.step(player.crouch ? 0.05 : wantSprint ? 0.22 : 0.12, rand(0.9, 1.1));
    noiseEvent(player.x, player.z, player.crouch ? 2.2 : wantSprint ? 11 : 5.5);
  }
  if (player.sinceDmg > 6 && player.health < 60) { player.health = Math.min(60, player.health + 4 * dt); updateHud(); }
  player.bobT += spd * dt * 1.6;
  player.eye = lerp(player.eye, player.crouch ? 1.02 : 1.62, clamp(dt * 8, 0, 1));
  const bobAmp = clamp(spd / 3, 0, 1);
  camera.position.set(player.x, player.eye + Math.sin(player.bobT * 2) * 0.035 * bobAmp, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.rotation.z = Math.sin(player.bobT) * 0.004 * bobAmp;
  camera.fov = lerp(camera.fov, wantSprint && player.moving ? 79 : 72, clamp(dt * 5, 0, 1));
  camera.updateProjectionMatrix();
  if (player.stamina < 20 && Math.random() < dt * 1.2) AU.breath(0.06);
  if (frontDoor.open > 0.5 && player.z > 28.9) winGame();
}

/* ------------------------------------------------------------- hide spots */
function enterHide(spot) {
  const seen = killer.state === 'chase' && dist2(killer.x, killer.z, player.x, player.z) < 9
    && losClear(killer.x, killer.z, player.x, player.z);
  player.hidden = true; player.hideSpot = spot;
  player.x = spot.x; player.z = spot.z;
  player.yaw = spot.ry + Math.PI;
  player.pitch = 0;
  $('hideSlats').style.opacity = 1;
  flashlight.intensity = 0.25;
  AU.creak();
  if (seen) { killer.bust = spot; caption('He watched you climb in.', 2.5); }
  else caption('Hold still. Breathe slow.', 3);
  if (!scares.wardrobe) {
    scares.wardrobe = true;
    setTimeout(() => {
      if (!player.hidden || state !== 'play') return;
      AU.slam(); setTimeout(() => AU.slam(), 280); setTimeout(() => AU.slam(), 560);
      const el = $('hideSlats');
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 800);
      caption('Three slow knocks on the wardrobe door. Then — nothing.', 4);
    }, 1700);
  }
}
function exitHide() {
  const s = player.hideSpot;
  player.hidden = false; player.hideSpot = null;
  if (s) { player.x = s.frontX; player.z = s.frontZ; }
  $('hideSlats').style.opacity = 0;
  flashlight.intensity = player.flash ? 2.6 : 0;
  AU.creak();
  noiseEvent(player.x, player.z, 5);
}
function bustHide() {
  killer.bust = null;
  if (!player.hidden) return;
  AU.slam(); AU.growl(0, 0.4);
  caption('“Found you.”', 2.5);
  exitHide();
  damagePlayer(18, killer);
  killer.lastSeen = { x: player.x, z: player.z };
}

/* ------------------------------------------------------------ damage/death */
function damagePlayer(dmg, from) {
  if (player.dead) return;
  player.health -= dmg;
  player.sinceDmg = 0;
  AU.hurt();
  const df = $('damageFlash');
  df.style.opacity = 0.75;
  setTimeout(() => { df.style.opacity = 0; }, 180);
  const dx = player.x - from.x, dz = player.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  player.vx += (dx / d) * 5; player.vz += (dz / d) * 5;
  updateHud();
  if (player.health <= 0) die();
}
let dieT = 0, dieSl = 0;
function die() {
  player.dead = true; state = 'dying'; deaths++; dieT = 0; dieSl = 0;
  clearKillFx();
  if (mapOpen) toggleMap();
  showScare(0.45);
  AU.sting(); AU.growl(0, 0.5);
  if (document.exitPointerLock) document.exitPointerLock();
}
function respawn() {
  player.dead = false; player.health = 100; player.stamina = 100;
  player.hidden = false; player.hideSpot = null;
  player.x = cw(2.6); player.z = cw(11.8); player.yaw = 0; player.pitch = 0;
  player.vx = player.vz = 0; player.eye = 1.62;
  $('hideSlats').style.opacity = 0;
  flashlight.intensity = player.flash ? 2.6 : 0;
  camera.rotation.z = 0;
  killer.x = cw(17); killer.z = cw(2); killer.state = 'patrol'; killer.path = null;
  killer.detect = 0; killer.grace = 6; killer.bust = null; killer.attackT = -1; killer.struck = false;
  clearKillFx();
  $('damageFlash').style.opacity = 0;
  hideOverlays(); state = 'play'; lockPointer();
  caption('You wake on the bedroom floor again. He carried you back. He wants to play.', 4.5);
  updateHud();
}
function winGame() {
  if (state === 'win') return;
  state = 'win';
  const t = Math.floor((performance.now() - startTime) / 1000);
  $('winStats').textContent = 'Time: ' + Math.floor(t / 60) + 'm ' + (t % 60) + 's · Deaths: ' + deaths;
  showOverlay('winOv');
  if (document.exitPointerLock) document.exitPointerLock();
  AU.thunder();
}

/* ------------------------------------------------------------ interaction */
let currentInteract = null;
function setPrompt(t) {
  const el = $('prompt');
  if (t) { el.textContent = t; el.style.opacity = 1; }
  else el.style.opacity = 0;
}
function scanInteract() {
  if (player.hidden) { setPrompt('E — slip out of the ' + (player.hideSpot ? player.hideSpot.label : 'hiding spot')); return null; }
  let best = null, bestD = 2.35, bestPrompt = '';
  const f = [-Math.sin(player.yaw), -Math.cos(player.yaw)];
  const consider = (x, z, obj, promptText, maxD) => {
    const lim = maxD || 2.35;
    const d = dist2(player.x, player.z, x, z);
    if (d > lim || d > bestD) return;
    if (d > 0.6) {
      const dot = ((x - player.x) * f[0] + (z - player.z) * f[1]) / (d || 0.001);
      if (dot < 0.25) return;
    }
    best = obj; bestD = d; bestPrompt = promptText;
  };
  for (const it of interactables) consider(it.x, it.z, { type: 'item', it }, 'E — ' + it.prompt);
  for (const d of doors) {
    const label = d.locked ? 'E — try the ' + (d.name || 'door') + ' (locked)' : d.open > 0.5 ? 'E — close the door' : 'E — open the door';
    consider(d.cx, d.cz, { type: 'door', d }, label);
  }
  if (frontDoor.locked)
    consider(frontDoor.cx, frontDoor.cz - 0.7, { type: 'front' }, 'E — the sealed front door (' + INV.emblems + '/3 emblems)', 3.2);
  for (const h of hideSpots) consider(h.frontX, h.frontZ, { type: 'hide', h }, 'E — hide in the ' + h.label, 1.9);
  setPrompt(best ? bestPrompt : '');
  return best;
}
function useDoor(d) {
  if (d.locked) {
    if (d.keyId === 'rusty' && INV.rustyKey) {
      d.locked = false; d.target = 1;
      AU.unlock();
      toast('Unlocked the bathroom.');
    } else {
      AU.locked();
      caption('Locked tight. The keyhole is orange with rust — a rusty key might fit.', 3.5);
    }
    return;
  }
  d.target = d.target > 0.5 ? 0 : 1;
  AU.creak(panTo(d));
  noiseEvent(d.cx, d.cz, 6.5);
}
function useFront() {
  if (!frontDoor.locked) return;
  if (INV.emblems >= 3) {
    frontDoor.locked = false; frontDoor.target = 1;
    AU.unlock(); AU.slam();
    setObjective('ESCAPE — through the front door!');
    caption('The seals fall away one by one. The door groans open. GO.', 4);
    noiseEvent(frontDoor.cx, frontDoor.cz, 60, true);
  } else {
    AU.locked();
    caption('Sealed shut. Three empty emblem slots stare back at you. (' + INV.emblems + '/3)', 3.5);
    if (!noteRead) setObjective('Find the three emblems that seal the front door');
  }
}
function openNote() {
  noteRead = true; state = 'note';
  AU.paper();
  showOverlay('noteOv');
  setObjective('Collect the three emblems (' + INV.emblems + '/3)');
}
function closeNote() {
  hideOverlays(); state = 'play'; lockPointer();
}

/* ------------------------------------------------------------- UI helpers */
function setObjective(t) { $('objText').textContent = t; }
let toastT = 0, capT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; toastT = 3; }
function caption(t, dur = 3) { const el = $('caption'); el.textContent = t; el.style.opacity = 1; capT = dur; }
function updateHud() {
  $('healthFill').style.width = clamp(player.health, 0, 100) + '%';
  $('emWolf').className = 'emblem' + (INV.wolf ? ' got' : '');
  $('emOwl').className = 'emblem' + (INV.owl ? ' got' : '');
  $('emSerpent').className = 'emblem' + (INV.serpent ? ' got' : '');
  $('emKey').style.opacity = INV.rustyKey ? 1 : 0.18;
  $('medCount').textContent = '✚ ' + INV.medkits;
  $('medCount').style.opacity = INV.medkits ? 1 : 0.25;
}
const OVERLAYS = ['title', 'pauseOv', 'deathOv', 'winOv', 'noteOv'];
function showOverlay(id) {
  for (const o of OVERLAYS) $(o).classList.toggle('show', o === id);
}
function hideOverlays() { for (const o of OVERLAYS) $(o).classList.remove('show'); }

/* --------------------------------------------------------------- ambience */
let L = 0, lightningT = 5, hbT = 0, ambT = 18, brT = 0;
function ambience(dt) {
  lightningT -= dt;
  if (lightningT <= 0) {
    lightningT = rand(8, 20);
    L = 1;
    setTimeout(() => AU.thunder(), rand(300, 1500));
  }
  L *= Math.exp(-dt * 3.2);
  lightning.intensity = L * 1.2;
  for (const m of windowMats) m.emissiveIntensity = 0.45 + L * 5;
  for (const fl of flickerLights) {
    fl.t += dt;
    if (fl.offT > 0) { fl.offT -= dt; fl.light.intensity = 0.02; continue; }
    if (Math.random() < fl.flicker * dt * 0.9) fl.offT = rand(0.04, 0.3);
    fl.light.intensity = fl.base * (0.82 + 0.18 * Math.sin(fl.t * 9.7) * Math.sin(fl.t * 3.1));
  }
  const d = dist2(killer.x, killer.z, player.x, player.z);
  const chase = killer.state === 'chase';
  const near = clamp(1 - d / 13, 0, 1);
  // the house is never quiet
  ambT -= dt;
  if (ambT <= 0 && state === 'play') {
    ambT = rand(16, 34);
    const roll = Math.random();
    if (roll < 0.4) {
      AU.noise(0.15, 120, 0.22, 1, 'lowpass', rand(-1, 1));
      setTimeout(() => AU.noise(0.15, 95, 0.18, 1, 'lowpass', rand(-1, 1)), rand(300, 700));
    } else if (roll < 0.7) {
      AU.creak(rand(-1, 1));
    } else {
      // somewhere far away, a door drifts open on its own
      const cands = doors.filter((dd) => !dd.locked && dd.open < 0.3 && dist2(player.x, player.z, dd.cx, dd.cz) > 10);
      if (cands.length) { const dd = cands[(Math.random() * cands.length) | 0]; dd.target = 1; AU.creak(panTo(dd)); }
      else AU.creak(rand(-1, 1));
    }
  }
  // his breathing, when he is close and you are not yet caught
  if (d < 8 && !chase) {
    brT -= dt;
    if (brT <= 0) { brT = 1.7; AU.breath(0.05 + (1 - d / 8) * 0.06); }
  }
  $('dangerVig').style.opacity = ((chase ? 0.55 : 0.35) * near + (chase ? 0.15 : 0)).toFixed(3);
  hbT -= dt;
  if ((near > 0.12 || chase) && hbT <= 0) {
    hbT = lerp(1.35, 0.42, near);
    AU.heartbeat(0.12 + near * 0.25);
  }
  if (AU.ok) {
    const target = chase ? 0.15 : (killer.state === 'investigate' || killer.state === 'search') ? 0.05 : 0;
    AU.droneGain.gain.value = lerp(AU.droneGain.gain.value, target, clamp(dt * 2, 0, 1));
  }
  for (const it of itemMeshes) if (!it.taken && it.spin) {
    it.mesh.rotation.y += dt * 1.4;
    it.mesh.position.y = it.y + Math.sin(perfT * 2 + it.x) * 0.03;
  }
}

/* ---------------------------------------------------- kill animation (fx) */
const KFX = { slashes: [], drips: [] };
function killSlash() {
  const W = window.innerWidth, H = window.innerHeight;
  const a = rand(-0.9, 0.9);
  const cx = W / 2 + rand(-W * 0.15, W * 0.15), cy = H / 2 + rand(-H * 0.12, H * 0.12);
  const len = Math.max(W, H) * 0.8;
  let dx = Math.cos(a), dy = Math.sin(a) + rand(0.45, 0.95);
  const n = Math.hypot(dx, dy); dx /= n; dy /= n;
  const s = { x1: cx - dx * len / 2, y1: cy - dy * len / 2, x2: cx + dx * len / 2, y2: cy + dy * len / 2, born: perfT, jags: [] };
  for (let i = 0; i <= 14; i++) s.jags.push(rand(-9, 9));
  KFX.slashes.push(s);
  for (let i = 0; i < 16; i++) {
    const t = rand();
    KFX.drips.push({ x: lerp(s.x1, s.x2, t) + rand(-14, 14), y: lerp(s.y1, s.y2, t) + rand(12), len: 0, speed: rand(30, 170), w: rand(1.5, 4.5) });
  }
  AU.slash();
}
function drawKillFx(dt) {
  const c = $('killfx');
  if (c.width !== window.innerWidth || c.height !== window.innerHeight) { c.width = window.innerWidth; c.height = window.innerHeight; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  for (const s of KFX.slashes) {
    const wCore = 10 * Math.min(1, (perfT - s.born) * 8) + 2;
    for (const layer of [['#3d0202', wCore + 9], ['#8e0e08', wCore], ['#c2372a', wCore * 0.35]]) {
      g.strokeStyle = layer[0]; g.lineWidth = layer[1]; g.lineCap = 'round';
      g.beginPath();
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const x = lerp(s.x1, s.x2, t) + s.jags[i], y = lerp(s.y1, s.y2, t) + s.jags[i] * 0.6;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.fillStyle = '#7d0b06';
  for (const d of KFX.drips) {
    d.len += d.speed * dt;
    g.fillRect(d.x, d.y, d.w, d.len);
    g.beginPath(); g.arc(d.x + d.w / 2, d.y + d.len, d.w * 0.9, 0, 7); g.fill();
  }
}
function clearKillFx() {
  KFX.slashes.length = 0; KFX.drips.length = 0;
  const c = $('killfx');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

/* -------------------------------------------------------------- house map */
let mapOpen = false;
const MAPICONS = { wolf: '🐺', owl: '🦉', serpent: '🐍', rusty: '🗝️' };
function toggleMap() {
  mapOpen = !mapOpen;
  $('mapOv').classList.toggle('show', mapOpen);
  AU.paper();
}
function drawMap() {
  const c = $('mapCanvas');
  const S = 30;
  if (c.width !== GW * S) { c.width = GW * S; c.height = GH * S; }
  const g = c.getContext('2d');
  g.fillStyle = '#141008'; g.fillRect(0, 0, c.width, c.height);
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    const ch = cellAt(x, z);
    if (ch === '#') g.fillStyle = '#3d2e1c';
    else if (ch === 'F') g.fillStyle = '#5a1410';
    else if (ch === '+') g.fillStyle = '#33271a';
    else g.fillStyle = '#221a10';
    g.fillRect(x * S, z * S, S, S);
  }
  g.textAlign = 'center';
  g.fillStyle = 'rgba(158,64,44,0.8)';
  g.font = "12px 'Special Elite', Georgia, serif";
  for (const k in ROOMS) {
    const r = ROOMS[k];
    g.fillText(r.name.toUpperCase(), (r.x0 + r.x1 + 1) / 2 * S, (r.z0 + r.z1 + 1) / 2 * S - 10);
  }
  const MX = (wx) => wx / CELL * S, MZ = (wz) => wz / CELL * S;
  // hiding places
  for (const h of hideSpots) {
    g.fillStyle = '#6b4a26';
    g.fillRect(MX(h.x) - 8, MZ(h.z) - 8, 16, 16);
    g.strokeStyle = '#c8a76a'; g.lineWidth = 1.5;
    g.strokeRect(MX(h.x) - 8, MZ(h.z) - 8, 16, 16);
    g.fillStyle = '#e8d9b0'; g.font = 'bold 9px Georgia';
    g.fillText('HIDE', MX(h.x), MZ(h.z) + 20);
  }
  // items still out there
  for (const it of itemMeshes) {
    if (it.taken) continue;
    if (it.id && it.id.indexOf('med') === 0) {
      g.fillStyle = '#c04030'; g.font = 'bold 17px Georgia';
      g.fillText('✚', MX(it.x), MZ(it.z) + 6);
    } else if (MAPICONS[it.id]) {
      g.font = '19px serif';
      g.fillText(MAPICONS[it.id], MX(it.x), MZ(it.z) + 7);
    }
  }
  if (!noteRead) { g.font = '16px serif'; g.fillText('📜', MX(cw(3.6)), MZ(cw(9.4)) + 6); }
  // the way out
  g.fillStyle = '#d84a35'; g.font = "bold 13px 'Special Elite', Georgia, serif";
  g.fillText('EXIT ⇩', 14 * S, 14.7 * S);
  // him — only when he is close enough to hear
  const kd = dist2(killer.x, killer.z, player.x, player.z);
  if (kd < 16) {
    const pulse = 4.5 + Math.sin(perfT * 6) * 1.5;
    g.fillStyle = '#e0281a';
    g.beginPath(); g.arc(MX(killer.x), MZ(killer.z), pulse, 0, 7); g.fill();
    g.strokeStyle = 'rgba(224,40,26,0.4)'; g.lineWidth = 2;
    g.beginPath(); g.arc(MX(killer.x), MZ(killer.z), pulse + 5, 0, 7); g.stroke();
  }
  // you
  g.save();
  g.translate(MX(player.x), MZ(player.z));
  g.rotate(-player.yaw);
  g.fillStyle = '#efe6d2'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, -9); g.lineTo(6.5, 7); g.lineTo(-6.5, 7); g.closePath();
  g.fill(); g.stroke();
  g.restore();
}

/* ------------------------------------------------------------- jumpscares */
const scares = { hall: false, mirror: false, wardrobe: false };
function buildScareFace() {
  const c = $('scareCanvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  const grd = g.createRadialGradient(256, 260, 40, 256, 260, 200);
  grd.addColorStop(0, '#d3c6b1'); grd.addColorStop(0.72, '#8f8272'); grd.addColorStop(1, '#000');
  g.fillStyle = grd;
  g.beginPath(); g.ellipse(256, 262, 150, 208, 0, 0, 7); g.fill();
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(200, 212, 36, 52, 0.12, 0, 7); g.fill();
  g.beginPath(); g.ellipse(312, 212, 36, 52, -0.12, 0, 7); g.fill();
  g.fillStyle = '#ff2015';
  g.beginPath(); g.arc(202, 220, 6, 0, 7); g.fill();
  g.beginPath(); g.arc(310, 220, 6, 0, 7); g.fill();
  g.fillStyle = '#050202';
  g.beginPath(); g.ellipse(256, 368, 62, 88, 0, 0, 7); g.fill();
  g.fillStyle = '#b3a284';
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.moveTo(208 + i * 16, 302); g.lineTo(217 + i * 16, 302); g.lineTo(212 + i * 16, 330 + rand(16));
    g.closePath(); g.fill();
  }
  g.fillStyle = 'rgba(88,12,8,0.6)';
  g.fillRect(196, 262, 7, 44); g.fillRect(308, 262, 7, 52);
  for (let i = 0; i < 240; i++) {
    g.strokeStyle = 'rgba(0,0,0,' + rand(0.05, 0.4).toFixed(2) + ')';
    g.lineWidth = rand(0.5, 2.5);
    const x = rand(512);
    g.beginPath(); g.moveTo(x, rand(512)); g.lineTo(x + rand(-30, 30), rand(512)); g.stroke();
  }
}
function showScare(dur = 0.55) {
  const el = $('scare');
  el.style.display = 'flex';
  el.classList.add('shake');
  $('scareCanvas').style.transform = 'scale(' + rand(1.05, 1.3).toFixed(2) + ') rotate(' + rand(-6, 6).toFixed(1) + 'deg)';
  AU.scream();
  setTimeout(() => { el.style.display = 'none'; el.classList.remove('shake'); }, dur * 1000);
}
function hallScare() {
  scares.hall = true;
  for (const fl of flickerLights) fl.offT = 1.6;
  killer.grace = 5; killer.state = 'patrol'; killer.path = null; killer.detect = 0;
  killer.x = player.x < GW * CELL / 2 ? cw(24) : cw(2);
  killer.z = cw(6.5);
  killer.yaw = Math.atan2(player.x - killer.x, player.z - killer.z);
  AU.growl(panTo(killer), 0.4);
  setTimeout(() => { L = 1; AU.thunder(); }, 500);
  setTimeout(() => {
    if (killer.state !== 'chase') { killer.x = cw(20); killer.z = cw(2); killer.path = null; }
    caption('The end of the hallway is empty again. It was not, a second ago.', 4);
  }, 1900);
}
function scareChecks() {
  if (!scares.hall && killer.state !== 'chase' && roomOf(player.x, player.z) === 'hall') hallScare();
  if (!scares.mirror && dist2(player.x, player.z, cw(7.5), 18.6) < 2.1) {
    scares.mirror = true;
    showScare(0.55);
    caption('Something grins back from the cracked mirror — then it is gone.', 3.5);
  }
}

/* ------------------------------------------------------------- film grain */
function grainLoop() {
  const c = $('grain'); c.width = 160; c.height = 96;
  const g = c.getContext('2d');
  setInterval(() => {
    const img = g.createImageData(160, 96);
    const dd = img.data;
    for (let i = 0; i < dd.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      dd[i] = dd[i + 1] = dd[i + 2] = v; dd[i + 3] = 26;
    }
    g.putImageData(img, 0, 0);
  }, 90);
}

/* -------------------------------------------------------------- input/lock */
const keys = {};
let state = 'title', deaths = 0, startTime = 0, noteRead = false;
let fallbackLook = false, mouseDown = false;
function lockPointer() {
  const c = $('game');
  try { if (c.requestPointerLock) c.requestPointerLock(); } catch (e) { /* iframe may deny */ }
  setTimeout(() => { if (!document.pointerLockElement) fallbackLook = true; }, 400);
}
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state === 'play' && !fallbackLook) {
    state = 'pause'; showOverlay('pauseOv');
  }
});
addEventListener('mousemove', (e) => {
  if (state !== 'play') return;
  if (document.pointerLockElement || (fallbackLook && mouseDown)) {
    const s = 0.0023;
    player.yaw -= (e.movementX || 0) * s;
    player.pitch = clamp(player.pitch - (e.movementY || 0) * s, -1.45, 1.45);
  }
});
addEventListener('mousedown', () => { mouseDown = true; });
addEventListener('mouseup', () => { mouseDown = false; });
let volume = 0.85, muted = false;
function applyVolume() {
  if (AU.ok) AU.master.gain.value = muted ? 0 : volume;
  toast(muted ? 'Sound muted (M to unmute)' : 'Volume ' + Math.round(volume * 100) + '%');
}
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Tab') e.preventDefault();
  if (state === 'play' && (e.code === 'Tab' || e.code === 'KeyX')) { toggleMap(); return; }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') { volume = Math.max(0, Math.round((volume - 0.1) * 10) / 10); muted = false; applyVolume(); return; }
  if (e.code === 'Equal' || e.code === 'NumpadAdd') { volume = Math.min(1, Math.round((volume + 0.1) * 10) / 10); muted = false; applyVolume(); return; }
  if (e.code === 'KeyM') { muted = !muted; applyVolume(); return; }
  if (state === 'note' && (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Enter')) { closeNote(); return; }
  if (state !== 'play') return;
  if (e.code === 'KeyE') {
    if (player.hidden) { exitHide(); return; }
    const c = currentInteract;
    if (!c) return;
    if (c.type === 'item') c.it.action();
    else if (c.type === 'door') useDoor(c.d);
    else if (c.type === 'front') useFront();
    else if (c.type === 'hide') enterHide(c.h);
  } else if (e.code === 'KeyF') {
    player.flash = !player.flash;
    if (!player.hidden) flashlight.intensity = player.flash ? 2.6 : 0;
    AU.tone(1200, 0.05, 'square', 0.08);
  } else if (e.code === 'KeyC') {
    player.crouch = !player.crouch;
  } else if (e.code === 'KeyQ' || e.code === 'KeyH') {
    if (INV.medkits > 0 && player.health < 99) {
      INV.medkits--; player.health = Math.min(100, player.health + 75);
      AU.heal(); toast('You patch yourself up.'); updateHud();
    }
  } else if (e.code === 'KeyP') {
    state = 'pause'; showOverlay('pauseOv');
    if (document.exitPointerLock) document.exitPointerLock();
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

/* -------------------------------------------------------------- game flow */
function startGame() {
  AU.init();
  if (AU.ok) AU.master.gain.value = muted ? 0 : volume;
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
  hideOverlays();
  state = 'play';
  startTime = performance.now();
  lockPointer();
  updateHud();
  setObjective('Explore the house. Find a way out.');
  AU.thunder();
  setTimeout(() => caption('Rain. A house that is not yours. And somewhere — slow footsteps.', 5), 800);
  setTimeout(() => { if (state === 'play' && !noteRead) caption('There is a note on the bedroom floor.', 4); }, 6800);
}

/* -------------------------------------------------------------- main loop */
let last = 0, perfT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = clamp((t - last) / 1000, 0.0001, 0.05);
  last = t; perfT = t / 1000;
  if (state === 'play' || state === 'dying') {
    updateDoors(dt);
    if (state === 'play') {
      playerUpdate(dt);
      killerUpdate(dt);
      scareChecks();
      currentInteract = scanInteract();
      if (mapOpen) drawMap();
    } else {
      dieT += dt;
      // he looms in over you, hacking
      const kd = dist2(killer.x, killer.z, player.x, player.z);
      if (kd > 1.0) {
        killer.x += (player.x - killer.x) / kd * 1.7 * dt;
        killer.z += (player.z - killer.z) / kd * 1.7 * dt;
        killer.walkPhase += 3 * dt;
      }
      killer.yaw = Math.atan2(player.x - killer.x, player.z - killer.z);
      killer.grp.position.set(killer.x, 0, killer.z);
      killer.grp.rotation.y = killer.yaw;
      killer.rArm.rotation.x = -1.3 + Math.sin(perfT * 9) * 1.0;
      // the cleaver comes down, again and again
      if (dieT > 0.25 && dieSl < 1) { dieSl = 1; killSlash(); }
      if (dieT > 0.65 && dieSl < 2) { dieSl = 2; killSlash(); }
      if (dieT > 1.05 && dieSl < 3) { dieSl = 3; killSlash(); }
      if (dieT > 1.6) $('damageFlash').style.opacity = Math.min(1, (dieT - 1.6) * 1.3);
      player.eye = lerp(player.eye, 0.4, clamp(dt * 3, 0, 1));
      const dx = killer.x - player.x, dz = killer.z - player.z;
      player.yaw = angLerp(player.yaw, Math.atan2(-dx, -dz), clamp(dt * 4, 0, 1));
      camera.position.set(player.x, player.eye, player.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = player.yaw;
      camera.rotation.x = lerp(camera.rotation.x, 0.15, clamp(dt * 3, 0, 1));
      camera.rotation.z = lerp(camera.rotation.z, 0.55, clamp(dt * 3, 0, 1));
      drawKillFx(dt);
      if (dieT > 2.7) {
        state = 'dead'; showOverlay('deathOv');
        $('damageFlash').style.opacity = 0;
        clearKillFx();
      }
    }
    ambience(dt);
    $('stamFill').style.width = player.stamina + '%';
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    if (capT > 0) { capT -= dt; if (capT <= 0) $('caption').style.opacity = 0; }
  }
  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------- boot */
buildTextures();
buildRenderer();
buildMaterials();
buildHouse();
buildItems();
buildKiller();
buildScareFace();
grainLoop();
updateHud();
camera.position.set(player.x, 1.62, player.z);
camera.rotation.order = 'YXZ';
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', respawn);
$('resumeBtn').addEventListener('click', () => { hideOverlays(); state = 'play'; lockPointer(); });
$('restartBtn').addEventListener('click', () => location.reload());
$('noteClose').addEventListener('click', closeNote);
showOverlay('title');
// debug/testing handle
window.HH = { player, killer, INV, doorAt, frontDoor, getState: () => state };
requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });

})();
