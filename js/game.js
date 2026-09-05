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
const CELL = 2, WALLH = 3.3;
let GW = 27, GH = 15;
// '#' wall · '.' floor · '+' doorway · 'F' front door
let MAP = [
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
const MAP1 = MAP;

let ROOMS = {
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

const ROOMS1 = ROOMS;
let doorAt = new Map();      // "x,z" -> door
let blockedCells = new Set(); // furniture-occupied cells (killer pathing)
let colliders = [];           // {x0,x1,z0,z1} furniture AABBs

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
    this.rainGain = rg;
    // wind through pines
    const wind = this.ctx.createBufferSource(); wind.buffer = this.noiseBuf; wind.loop = true; wind.playbackRate.value = 0.5;
    const wf = this.ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 300;
    this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0;
    wind.connect(wf); wf.connect(this.windGain); this.windGain.connect(this.master); wind.start();
    // running water
    const riv = this.ctx.createBufferSource(); riv.buffer = this.noiseBuf; riv.loop = true; riv.playbackRate.value = 1.4;
    const rvf = this.ctx.createBiquadFilter(); rvf.type = 'bandpass'; rvf.frequency.value = 1100; rvf.Q.value = 0.5;
    this.riverGain = this.ctx.createGain(); this.riverGain.gain.value = 0;
    riv.connect(rvf); rvf.connect(this.riverGain); this.riverGain.connect(this.master); riv.start();
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
  hum(f, pan, vol) { this.tone(f, 0.85, 'sine', vol, pan); this.tone(f * 1.007, 0.85, 'sine', vol * 0.6, pan); },
  whisper(pan = 0) {
    for (let i = 0; i < 3; i++)
      setTimeout(() => this.noise(0.18, 1600, 0.06, 0.5, 'bandpass', clamp(pan + rand(-0.2, 0.2), -1, 1)), i * (120 + rand(140)));
  },
  screech() {
    for (const f of [1150, 1190, 1480]) this.tone(f, 0.7, 'sawtooth', 0.13, rand(-0.3, 0.3), f * 1.8);
    this.noise(0.6, 3000, 0.25, 0.6, 'highpass');
  },
  crack() {
    this.noise(0.06, 1800, 0.5, 2); this.tone(95, 0.18, 'sine', 0.5, 0, 55);
    setTimeout(() => { this.noise(0.05, 1400, 0.4, 2); this.tone(80, 0.15, 'sine', 0.4, 0, 50); }, 140);
  },
  buzz(vol, pan) {
    this.tone(165 + rand(45), 0.6, 'sawtooth', vol, pan, 210 + rand(60));
    this.tone(84, 0.5, 'sawtooth', vol * 0.5, pan);
  },
  phone(pan = 0) {
    const trill = () => { for (let i = 0; i < 14; i++) setTimeout(() => { this.tone(1420, 0.045, 'sine', 0.11, pan); this.tone(1180, 0.045, 'sine', 0.09, pan); }, i * 52); };
    trill(); setTimeout(trill, 900);
  },
  bird(pan = 0) {
    const base = rand(2600, 4200), n = 3 + (rand(3) | 0);
    for (let i = 0; i < n; i++)
      setTimeout(() => this.tone(base * rand(0.9, 1.15), 0.09, 'sine', 0.035, pan, base * rand(0.7, 0.9)), i * (90 + rand(70)));
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
  TEX.rot = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#4a4526'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = ['rgba(90,90,40,0.5)', 'rgba(50,60,25,0.6)', 'rgba(30,25,12,0.6)', 'rgba(120,110,70,0.35)'][i % 4];
      g.beginPath(); g.arc(rand(w), rand(h), rand(2, 8), 0, 7); g.fill();
    }
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(220,215,190,0.7)'; g.fillRect(rand(w), rand(h), 2, 1); }
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
  TEX.hands = canvasTex(128, 128, (g, w, h) => {
    // skin that has been through two very bad nights
    g.fillStyle = '#b98a68'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { // scrapes
      g.fillStyle = 'rgba(140,60,40,' + rand(0.25, 0.5).toFixed(2) + ')';
      g.beginPath(); g.ellipse(rand(w), rand(h), rand(4, 10), rand(3, 6), rand(3), 0, 7); g.fill();
    }
    for (let i = 0; i < 6; i++) { // bruises, blue-purple under the skin
      g.fillStyle = 'rgba(' + (70 + rand(30) | 0) + ',' + (50 + rand(20) | 0) + ',' + (110 + rand(40) | 0) + ',' + rand(0.2, 0.4).toFixed(2) + ')';
      g.beginPath(); g.ellipse(rand(w), rand(h), rand(8, 18), rand(6, 12), rand(3), 0, 7); g.fill();
    }
    for (let i = 0; i < 10; i++) { // cuts with sore edges
      const x = rand(w), y = rand(h), a = rand(7), len = rand(8, 26);
      g.strokeStyle = 'rgba(190,120,100,0.5)'; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      g.strokeStyle = 'rgba(120,20,16,0.9)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    grime(g, w, h, 50, 0.1);
    // one grubby bandage, soaked through in the middle
    g.fillStyle = 'rgba(210,200,180,0.95)'; g.fillRect(10, 88, 44, 13);
    g.strokeStyle = 'rgba(150,140,120,0.8)'; g.strokeRect(10, 88, 44, 13);
    g.fillStyle = 'rgba(140,30,20,0.55)';
    g.beginPath(); g.arc(30, 94, 4.5, 0, 7); g.fill();
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
let renderer, scene, camera, flashlight, flashTarget, lightning, hemiLight, sunLight;
let windowMats = [], flickerLights = [];
let worldRoot = null, curWorld = null;
let W1 = null, WF = null, WH2 = null; // house one, the forest, the widow's house
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

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 120);
  scene.add(camera);

  flashlight = new THREE.SpotLight(0xfff2d8, 2.6, 26, 0.52, 0.45, 1.8);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024, 1024);
  flashlight.shadow.bias = -0.002;
  flashlight.position.set(0.12, -0.12, 0.1);
  flashTarget = new THREE.Object3D(); flashTarget.position.set(0, -0.18, -3);
  camera.add(flashlight); camera.add(flashTarget);
  flashlight.target = flashTarget;

  hemiLight = new THREE.HemisphereLight(0x1c2740, 0x0a0806, 0.26);
  scene.add(hemiLight);
  sunLight = new THREE.DirectionalLight(0x30405e, 0.1);
  sunLight.position.set(-8, 14, -12); scene.add(sunLight);

  lightning = new THREE.DirectionalLight(0xcfe0ff, 0);
  lightning.position.set(4, 16, -20);
  scene.add(lightning);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// A hand-built environment map: every surface picks up faint ambient
// reflections from a dim imaginary room, instead of pure spotlight-on-plastic.
function buildEnvMap() {
  const envScene = new THREE.Scene();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x0c0e12, side: THREE.BackSide }));
  envScene.add(shell);
  const panel = (color, intensity, x, y, z, w, h, rx, ry) => {
    const m = new THREE.MeshBasicMaterial({ color });
    m.color.multiplyScalar(intensity);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, y, z);
    p.rotation.x = rx || 0; p.rotation.y = ry || 0;
    envScene.add(p);
  };
  panel(0x8fb0d8, 1.1, 0, 4.9, 0, 6, 6, Math.PI / 2, 0);   // cold skylight overhead
  panel(0xffb060, 0.75, -4.9, 2, 0, 4, 3, 0, Math.PI / 2); // a warm lamp somewhere
  panel(0x40507a, 0.5, 4.9, 2, 2, 5, 3, 0, -Math.PI / 2);  // moonlit window
  panel(0x2a2018, 0.35, 0, -4.9, 0, 8, 8, -Math.PI / 2, 0);// dim floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.06).texture;
  pmrem.dispose();
}

function buildMaterials() {
  MAT.wall = new THREE.MeshStandardMaterial({ map: TEX.wall, roughness: 0.94, bumpMap: TEX.wall, bumpScale: 0.02 });
  MAT.floor = new THREE.MeshStandardMaterial({ map: TEX.floor, roughness: 0.72, bumpMap: TEX.floor, bumpScale: 0.02, roughnessMap: TEX.floor });
  MAT.ceil = new THREE.MeshStandardMaterial({ map: TEX.ceil, roughness: 0.96 });
  MAT.wood = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85, bumpMap: TEX.wood, bumpScale: 0.015 });
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
  worldRoot.add(mesh);
  return mesh;
}
function addCollider(cx, cz, w, d) { colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }); }
function blockCell(x, z) { blockedCells.add(x + ',' + z); }

/* ------------------------------------------------------ first-person hands */
let handsGrp = null, handLensMat = null;
const handSway = { x: 0, y: 0, prevYaw: 0, prevPitch: 0 };
function buildHands() {
  handsGrp = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ map: TEX.hands, roughness: 0.85 });
  const cuff = new THREE.MeshStandardMaterial({ color: 0x35544f, roughness: 1 });
  const mkHand = (side) => {
    const h = new THREE.Group();
    const fore = box(0.085, 0.085, 0.3, skin); fore.position.z = 0.16; h.add(fore);
    const sleeve = box(0.115, 0.115, 0.13, cuff); sleeve.position.z = 0.29; h.add(sleeve);
    const palm = box(0.095, 0.05, 0.11, skin); palm.position.set(0, 0.005, -0.02); h.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = box(0.019, 0.032, 0.085, skin);
      f.position.set(-0.036 + i * 0.024, 0.012, -0.1);
      f.rotation.x = -0.55;
      h.add(f);
    }
    const thumb = box(0.024, 0.03, 0.07, skin);
    thumb.position.set(side * 0.055, 0.005, -0.03);
    thumb.rotation.y = side * 0.5;
    h.add(thumb);
    return h;
  };
  // one hand only — it stays out of sight until the phone is answered
  const right = mkHand(1);
  // the receiver, gripped in it
  const recv = box(0.26, 0.055, 0.085, new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.4 }));
  recv.position.set(0, 0.05, -0.05);
  recv.rotation.z = 0.1;
  right.add(recv);
  handsGrp.add(right);
  handsGrp.scale.setScalar(0.8);
  handsGrp.visible = false;
  camera.add(handsGrp);
}
let phoneHandT = -1, phoneHandNext = null;
function updateHands(dt) {
  if (!handsGrp) return;
  if (phoneHandT < 0) { handsGrp.visible = false; return; }
  phoneHandT += dt;
  const t = clamp(phoneHandT / 1.25, 0, 1);
  const e = t * t * (3 - 2 * t); // ease: reach out, then lift to the ear
  handsGrp.visible = true;
  handsGrp.position.set(lerp(0.36, 0.11, e), lerp(-0.62, -0.15, e), lerp(-0.58, -0.34, e));
  handsGrp.rotation.set(lerp(0.7, 0.05, e), lerp(-0.35, -0.55, e), lerp(0.15, 0.55, e));
  if (t >= 1 && phoneHandT > 1.55) {
    phoneHandT = -1;
    handsGrp.visible = false;
    const cb = phoneHandNext; phoneHandNext = null;
    if (cb) cb();
  }
}

/* ------------------------------------------------------------ house build */
function buildHouse() {
  // floor & ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), MAT.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(GW * CELL / 2, 0, GH * CELL / 2);
  floor.receiveShadow = true;
  worldRoot.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), MAT.ceil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(GW * CELL / 2, WALLH, GH * CELL / 2);
  worldRoot.add(ceil);

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
    worldRoot.add(m);
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
    worldRoot.add(l);
    const fixture = box(0.22, 0.14, 0.22, MAT.metal);
    put(fixture, x, WALLH - 0.1, z, 0, false);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color }));
    bulb.position.set(x, WALLH - 0.24, z); worldRoot.add(bulb);
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
    worldRoot.add(w);
    windowMats.push(m);
    for (let p = 0; p < 3; p++) {
      const plank = box(1.75, 0.22, 0.05, MAT.wood);
      plank.position.set(cw(x) + rand(-0.08, 0.08), 1.3 + p * 0.52 + rand(-0.05, 0.05), CELL + 0.09);
      plank.rotation.z = rand(-0.13, 0.13);
      worldRoot.add(plank);
    }
  }

  // paintings in hall + rooms
  const paint = (x, z, ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.2), new THREE.MeshStandardMaterial({ map: TEX.painting, roughness: 0.8 }));
    p.position.set(x, 1.9, z); p.rotation.y = ry;
    p.rotation.z = rand(-0.06, 0.06);
    worldRoot.add(p);
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
    worldRoot.add(b);
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
    worldRoot.add(b);
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
    worldRoot.add(m);
  };
  scrawl('NOBODY LEAVES', cw(13.5), 2.1, 5 * CELL + CELL + 0.03, 0, 3.4);
  scrawl('HE HEARS YOU', 4.6, 2.0, 8 * CELL + CELL + 0.03, 0, 2.4);
  scrawl('STAY OUT', cw(24), 2.72, 8 * CELL + CELL + 0.03, 0, 1.9);

  // cobwebs in the high corners
  const webMat = new THREE.MeshBasicMaterial({ map: TEX.web, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const web = (x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), webMat);
    m.position.set(x, WALLH - 0.6, z); m.rotation.y = ry;
    worldRoot.add(m);
  };
  web(2.6, 12.5, Math.PI / 4);
  web(51.4, 12.5, -Math.PI / 4);
  web(2.6, 15.5, Math.PI * 0.75);
  web(29.5, 27.4, Math.PI / 4);

  // rugs
  const rug = (x, z, w, d) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.carpet);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.008, z);
    r.receiveShadow = true; worldRoot.add(r);
  };
  rug(cw(13.5), cw(6.5), 10, 2.6);
  rug(cw(3), cw(11.5), 3.4, 3.4);
  rug(cw(14.5), cw(11), 4.5, 4.5);

  buildFurniture();
}

/* ------------------------------------------------------------------ doors */
let doors = [];
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
  worldRoot.add(g);
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
  worldRoot.add(g);
  // porch glimpse behind the door
  const porch = new THREE.Mesh(new THREE.PlaneGeometry(8, WALLH), new THREE.MeshStandardMaterial({ color: 0x0a1220, emissive: 0x0a1626, emissiveIntensity: 0.8 }));
  porch.position.set(cx, WALLH / 2, cz + 3.4); porch.rotation.y = Math.PI;
  worldRoot.add(porch);
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
let hideSpots = []; // wardrobes/lockers
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
    g.position.set(x, 0, z); g.rotation.y = ry; worldRoot.add(g);
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
    g.position.set(x, 0, z); g.rotation.y = ry; worldRoot.add(g);
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
    g.position.set(x, 0, z); g.rotation.y = ry; worldRoot.add(g);
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
    g.position.set(x, 0, z); g.rotation.y = ry || 0; worldRoot.add(g);
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
  // a stove left mid-meal, weeks ago
  const rotK = new THREE.MeshStandardMaterial({ map: TEX.rot, roughness: 1 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.16, 12), M);
  pot.position.set(cw(4.2), 1.04, CELL + 0.42); pot.castShadow = true; worldRoot.add(pot);
  const goo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), rotK);
  goo.position.set(cw(4.2), 1.12, CELL + 0.42); worldRoot.add(goo);
  for (let i = 0; i < 4; i++) {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 10), W);
    dish.position.set(cw(5.2) + rand(-0.03, 0.03), 0.97 + i * 0.026, CELL + 0.4 + rand(-0.03, 0.03));
    worldRoot.add(dish);
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.2), rotK);
  slab.position.set(cw(2.6), 0.99, CELL + 0.42); slab.castShadow = true; worldRoot.add(slab);

  // --- dining room
  table(cw(11.5), cw(2.5), 3.4, 1.3); blockCell(10, 2); blockCell(11, 2); blockCell(12, 2); blockCell(11, 3);
  chair(cw(10.3), cw(3.5)); chair(cw(11.6), cw(3.5)); chair(cw(12.8), cw(3.5));
  chair(cw(10.3), cw(1.6), Math.PI); chair(cw(12.8), cw(1.6), Math.PI);
  // a feast that rotted where it was served
  const rotM = new THREE.MeshStandardMaterial({ map: TEX.rot, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const px = cw(11.2) + i * 1.1;
    put(box(0.28, 0.03, 0.28, W), px, 0.85, cw(2.5), rand(0.5), false);
    const lump = new THREE.Mesh(new THREE.SphereGeometry(rand(0.07, 0.11), 7, 6), rotM);
    lump.scale.y = 0.55;
    lump.position.set(px + rand(-0.04, 0.04), 0.89, cw(2.5) + rand(-0.05, 0.05));
    lump.castShadow = true; worldRoot.add(lump);
  }
  put(box(0.55, 0.05, 0.34, M), cw(11.5), 0.85, cw(2.5) - 0.1, 0.2, false);
  const roast = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), rotM);
  roast.scale.set(1.4, 0.75, 1);
  roast.position.set(cw(11.5), 0.93, cw(2.5) - 0.1);
  roast.castShadow = true; worldRoot.add(roast);
  for (let i = 0; i < 2; i++) put(box(0.03, 0.03, 0.22, W), cw(11.5) + rand(-0.25, 0.25), 0.89, cw(2.5) + rand(-0.18, 0.05), rand(1.5), false);

  // --- living room
  sofa(cw(18.5), cw(3.4), Math.PI); blockCell(18, 3); blockCell(19, 3);
  table(cw(18.5), cw(2.2), 1.1, 0.6, TD);
  // fireplace on the north wall
  put(box(2.0, 1.7, 0.5, new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 })), cw(21), 0.85, CELL + 0.35);
  put(box(1.2, 1.1, 0.4, new THREE.MeshStandardMaterial({ color: 0x0c0906, roughness: 1 })), cw(21), 0.55, CELL + 0.42);
  put(box(2.2, 0.12, 0.6, TD), cw(21), 1.78, CELL + 0.35);
  addCollider(cw(21), CELL + 0.35, 2.1, 0.8); blockCell(20, 1); blockCell(21, 1);
  const ember = new THREE.PointLight(0xff5a1e, 0.7, 6, 2);
  ember.position.set(cw(21), 0.6, CELL + 0.7); worldRoot.add(ember);
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
  dl.position.set(cw(20.2), 1.1, cw(12.3)); worldRoot.add(dl);
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

/* ------------------------------------------------------------------ flies */
let flySwarms = [];
function buildFlies() {
  const mat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  const spots = [
    [cw(11.5), 1.05, cw(2.5)],        // the rotted feast
    [cw(4.2), 1.25, CELL + 0.45],     // the kitchen pot
    [cw(24), 0.75, cw(13.4)],         // the sheeted mound
    [cw(10.4), 0.85, cw(12.7)],       // the bathtub
  ];
  for (const [x, y, z] of spots) {
    const grp = new THREE.Group();
    const flies = [];
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), mat);
      grp.add(f);
      flies.push({ m: f, p: rand(7), r: rand(0.12, 0.4), h: rand(-0.08, 0.28), s: rand(3, 7), w: rand(2, 5) });
    }
    grp.position.set(x, y, z);
    worldRoot.add(grp);
    flySwarms.push({ x, y, z, flies });
  }
}
function updateFlies(dt) {
  for (const sw of flySwarms) {
    if (dist2(player.x, player.z, sw.x, sw.z) > 14) continue;
    for (const f of sw.flies) {
      f.p += dt * f.s;
      f.m.position.set(
        Math.cos(f.p) * f.r + Math.sin(f.p * f.w) * 0.05,
        f.h + Math.sin(f.p * 1.7) * 0.1,
        Math.sin(f.p * 0.9) * f.r
      );
    }
  }
}

/* ------------------------------------------------------------------ items */
let interactables = [];
const INV = { emblems: 0, owl: false, wolf: false, serpent: false, rustyKey: false, medkits: 0, venin: false, remedy: false };
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
  worldRoot.add(mesh);
  const it = { id, mesh, x, z, y, prompt, spin: true, taken: false,
    action() {
      if (it.taken) return;
      it.taken = true;
      if (mesh.parent) mesh.parent.remove(mesh);
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
  worldRoot.add(n);
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
const WIDOW_TAUNTS = [
  '“Come into the light, little moth.”',
  '“My lantern never lies to me.”',
  '“He sent you. He always sends me the pretty ones.”',
  '“Shhh. It only hurts in the dark.”',
];
const BUTCHER_P = {
  name: 'butcher', patrol: 1.5, invest: 2.3, search: 1.9, chase: 3.4,
  attackCd: 2.6, dmg: 22, sight: 14, flashBonus: 3, lightLover: false,
  taunts: TAUNTS, whistles: true,
  spotText: 'HE SEES YOU. RUN.',
  sweepText: 'Heavy boots on old wood. He is sweeping the house again.',
  fadeText: 'The footsteps fade. He has moved on — for now.',
  deathTitle: 'HE FOUND YOU',
  deathText: 'Everything goes dark… but he isn’t done playing with you yet.',
};
const WIDOW_P = {
  name: 'widow', patrol: 1.1, invest: 1.7, search: 1.4, chase: 2.9,
  attackCd: 2.7, dmg: 20, sight: 8.5, flashBonus: 9.5, lightLover: true,
  taunts: WIDOW_TAUNTS, whistles: false, armBase: -0.95,
  spotText: 'SHE SEES YOUR LIGHT. RUN — AND GO DARK (F).',
  sweepText: 'Lantern-glow slides under the doors, room by room, coming your way.',
  fadeText: 'The lantern light wanders away. She has lost you — for now.',
  deathTitle: 'SHE CAUGHT YOU',
  deathText: 'The last thing you ever see is warm, gentle lantern light.',
};
let butcherRig = null, widowRig = null;
const killer = {
  grp: null, active: true, P: BUTCHER_P, x: cw(17), z: cw(2), yaw: 0,
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
  worldRoot.add(g);
  killer.grp = g;
  butcherRig = { grp: g, lArm: killer.lArm, rArm: killer.rArm, lLeg: killer.lLeg, rLeg: killer.rLeg, headG: killer.headG, homeX: cw(17), homeZ: cw(2) };
}
/* ------------------------------------------------------- the other tenants */
const NPCS = {};
const npcSeen = { granny: false, grannyStare: false, wife: false };
// a slow, wandering little tune with no ending
const HUM = [330, 311, 262, 294, 330, 262, 247, 262, 220, 247, 262, 294];
function buildNpcs() {
  // — the old woman, rocking at the dining table —
  const g = new THREE.Group();
  const dress = new THREE.MeshStandardMaterial({ color: 0x27242e, roughness: 1 });
  const oskin = new THREE.MeshStandardMaterial({ color: 0xbfa48c, roughness: 0.9 });
  const gray = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 1 });
  const lap = box(0.5, 0.36, 0.5, dress); lap.position.set(0, 0.55, 0.12); g.add(lap);
  const torso = box(0.46, 0.55, 0.3, dress); torso.position.set(0, 1.0, -0.05); torso.rotation.x = 0.18; g.add(torso);
  const shawl = box(0.52, 0.2, 0.34, new THREE.MeshStandardMaterial({ color: 0x5c4a33, roughness: 1 }));
  shawl.position.set(0, 1.22, -0.05); g.add(shawl);
  const gHead = new THREE.Group(); gHead.position.set(0, 1.42, 0.02); g.add(gHead);
  const ghead = box(0.24, 0.26, 0.24, oskin); gHead.add(ghead);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), gray); bun.position.set(0, 0.14, -0.12); gHead.add(bun);
  const cap = box(0.26, 0.1, 0.26, gray); cap.position.y = 0.13; gHead.add(cap);
  for (const s of [-1, 1]) {
    const arm = box(0.1, 0.42, 0.1, dress);
    arm.position.set(s * 0.27, 0.86, 0.14); arm.rotation.x = -0.75; g.add(arm);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const gx = cw(10.3), gz = cw(1.6) + 0.15;
  g.position.set(gx, 0, gz);
  worldRoot.add(g);
  addCollider(gx, gz, 0.75, 0.75);
  NPCS.granny = { g, headG: gHead, x: gx, z: gz, humT: 0, humI: 0 };

  // — the woman in the nightgown, facing the corner —
  const w = new THREE.Group();
  const gown = new THREE.MeshStandardMaterial({ color: 0xa89f8e, roughness: 1 });
  const hairD = new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 1 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xcabba6, roughness: 0.9 });
  const column = box(0.46, 1.52, 0.32, gown); column.position.y = 0.76; w.add(column);
  const shoulders = box(0.52, 0.24, 0.34, gown); shoulders.position.y = 1.54; w.add(shoulders);
  const wHead = new THREE.Group(); wHead.position.y = 1.8; w.add(wHead);
  const whead = box(0.24, 0.3, 0.26, pale); wHead.add(whead);
  const hFront = box(0.28, 0.36, 0.06, hairD); hFront.position.set(0, -0.02, 0.14); wHead.add(hFront);
  const hBack = box(0.3, 0.56, 0.1, hairD); hBack.position.set(0, -0.1, -0.13); wHead.add(hBack);
  for (const s of [-1, 1]) { const hs = box(0.06, 0.48, 0.28, hairD); hs.position.set(s * 0.15, -0.08, 0); wHead.add(hs); }
  const hTop = box(0.3, 0.09, 0.3, hairD); hTop.position.y = 0.18; wHead.add(hTop);
  for (const s of [-1, 1]) {
    const arm = box(0.09, 0.6, 0.09, gown); arm.position.set(s * 0.29, 1.06, 0); w.add(arm);
    const fingers = box(0.06, 0.2, 0.05, pale); fingers.position.set(s * 0.29, 0.68, 0.02); w.add(fingers);
  }
  w.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const wx = 48.3, wz = 3.4, wyaw = 1.9; // facing the corner, back to the room
  w.position.set(wx, 0, wz);
  w.rotation.y = wyaw;
  worldRoot.add(w);
  addCollider(wx, wz, 0.6, 0.6);
  NPCS.wife = { g: w, x: wx, z: wz, homeYaw: wyaw, whisT: 0 };
}
function npcUpdate(dt) {
  if (curWorld !== W1) return;
  const G = NPCS.granny;
  const gd = dist2(player.x, player.z, G.x, G.z);
  G.g.position.y = Math.sin(perfT * 1.15) * 0.012; // the chair never stops rocking
  if (gd < 1.9) {
    // she stops humming — and only her head moves
    const ang = Math.atan2(player.x - G.x, player.z - G.z) - G.g.rotation.y;
    G.headG.rotation.y = angLerp(G.headG.rotation.y, ang, clamp(dt * 3, 0, 1));
    G.headG.rotation.z = 0;
    if (!npcSeen.grannyStare) {
      npcSeen.grannyStare = true;
      caption('The humming stops. Without moving anything else, she is looking at you.', 4.5);
    }
  } else {
    G.headG.rotation.y = angLerp(G.headG.rotation.y, 0, clamp(dt * 2, 0, 1));
    G.headG.rotation.z = Math.sin(perfT * 0.8) * 0.07;
    if (gd < 7) {
      if (!npcSeen.granny) {
        npcSeen.granny = true;
        caption('An old woman rocks at the table, humming to plates of rot. She does not look up.', 4.5);
      }
      G.humT -= dt;
      if (G.humT <= 0) {
        G.humT = 0.92;
        AU.hum(HUM[G.humI++ % HUM.length], panTo(G), 0.045 + (1 - clamp(gd / 7, 0, 1)) * 0.045);
      }
    }
  }
  const Wf = NPCS.wife;
  const wd = dist2(player.x, player.z, Wf.x, Wf.z);
  Wf.g.rotation.z = Math.sin(perfT * 0.7) * 0.018;
  if (wd < 4.4) {
    if (!npcSeen.wife) {
      npcSeen.wife = true;
      caption('A woman in a nightgown stands facing the corner, whispering to it. Every nerve says: no closer.', 5);
    }
    Wf.whisT -= dt;
    if (Wf.whisT <= 0) { Wf.whisT = rand(1.8, 3.4); AU.whisper(panTo(Wf)); }
  }
  if (wd < 1.8 && !player.dead) wifeKill();
}

const PATROL_KEYS = ['kitchen', 'dining', 'living', 'hall', 'foyer', 'study', 'garage', 'bedroom'];
function randomPatrolCell() {
  const keys = (curWorld && curWorld.patrolKeys) || PATROL_KEYS;
  const r = ROOMS[keys[Math.floor(rand(keys.length))]];
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rand(r.x0, r.x1 + 1)), z = Math.floor(rand(r.z0, r.z1 + 1));
    if (walkableForKiller(x, z)) return [x, z];
  }
  return nearestWalkable(Math.floor(GW / 2), Math.floor(GH / 2));
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
  let range = killer.P.sight + (player.flash ? killer.P.flashBonus : 0);
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
  killer.darkT = 0;
  killer.lastSeen = { x: player.x, z: player.z };
  AU.sting(); AU.growl(panTo(killer), 0.35);
  caption(killer.P.spotText, 3);
}
let widowIntro = false;
function killerUpdate(dt) {
  const K = killer;
  if (!K.active) { noiseEvents.length = 0; return; }
  K.attackCd = Math.max(0, K.attackCd - dt);
  K.grace = Math.max(0, K.grace - dt);
  const d = dist2(K.x, K.z, player.x, player.z);
  if (K.P.lightLover && !widowIntro && d < 13 && losClear(K.x, K.z, player.x, player.z)) {
    widowIntro = true;
    caption('Crane’s wife. The Widow. Gray hair to her waist, and the lantern never leaves her fist.', 5);
  }
  const sees = K.grace <= 0 && killerCanSee();

  // detection meter (forgiving: he needs a moment to be sure)
  if (K.state !== 'chase') {
    if (sees) {
      let rate = 0.45 + (1 - clamp(d / 16, 0, 1)) * 1.35;
      if (player.crouch) rate *= 0.55;
      if (!player.moving) rate *= 0.7;
      if (K.P.lightLover) rate *= player.flash ? 1.7 : 0.45;
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
      caption(K.P.sweepText, 3.5);
    }
  }

  // she is drawn to any light she can see
  if (K.P.lightLover && player.flash && !player.hidden && K.state !== 'chase') {
    K.lightT = (K.lightT || 0) - dt;
    if (K.lightT <= 0 && d < 17 && losClear(K.x, K.z, player.x, player.z)) {
      K.lightT = 4;
      K.state = 'investigate'; K.investT = 12;
      setPath(Math.floor(player.x / CELL), Math.floor(player.z / CELL));
      caption('The lantern swings toward your light.', 2.5);
    }
  }

  let speed = 0;
  if (K.state === 'patrol') {
    speed = K.P.patrol;
    if (!K.path || killerMove(dt, speed)) { const [tx, tz] = randomPatrolCell(); setPath(tx, tz); }
    K.whistleT -= dt;
    if (K.whistleT <= 0) {
      K.whistleT = rand(16, 30);
      if (d < 26) { if (K.P.whistles) AU.whistle(); else AU.whisper(panTo(K)); }
    }
  } else if (K.state === 'investigate') {
    speed = K.P.invest;
    K.investT -= dt;
    const done = !K.path || killerMove(dt, speed);
    if (done || K.investT <= 0) { K.state = 'patrol'; K.path = null; }
  } else if (K.state === 'search') {
    speed = K.P.search;
    K.searchT -= dt;
    if (!K.path || killerMove(dt, speed))
      setPath(Math.floor(K.x / CELL) + Math.round(rand(-3, 3)), Math.floor(K.z / CELL) + Math.round(rand(-3, 3)));
    if (K.searchT <= 0) { K.state = 'patrol'; K.path = null; K.detect = 0.3; caption(K.P.fadeText, 3.5); }
  } else if (K.state === 'chase') {
    speed = K.P.chase;
    if (sees || d < 3) { K.lastSeen = { x: player.x, z: player.z }; K.loseT = 0; } else K.loseT += dt;
    // she can't hunt what she can't see: seven dark seconds and she gives up
    if (K.P.lightLover) {
      K.darkT = player.flash ? 0 : (K.darkT || 0) + dt;
      if (K.darkT > 7 && d > 3 && !sees) {
        K.state = 'search'; K.searchT = 5; K.path = null; K.bust = null; K.detect = 0.2; K.darkT = 0;
        caption('Seven long, dark seconds. The lantern swings away — she cannot find you without your light.', 4.5);
      }
    }
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
    if (!player.dead && !player.hidden && d < 1.5 && K.attackCd <= 0 && K.attackT < 0) { K.attackT = 0; K.attackCd = K.P.attackCd; }
    K.tauntT -= dt;
    if (K.tauntT <= 0) { K.tauntT = rand(5, 9); AU.growl(panTo(K), K.P.name === 'widow' ? 0.15 : 0.3); caption(K.P.taunts[Math.floor(rand(K.P.taunts.length))], 3); }
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
        if (!player.dead && !player.hidden && dist2(K.x, K.z, player.x, player.z) < 2.1) damagePlayer(K.P.dmg, K);
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
  K.lArm.rotation.x = (K.P.armBase || 0) - sw * 0.8;
  if (K.attackT < 0) K.rArm.rotation.x = sw * 0.8;
  const ph = Math.floor(K.walkPhase / Math.PI);
  if (ph !== K.lastPh) {
    K.lastPh = ph;
    const vol = clamp(1 - d / 24, 0, 1);
    if (vol > 0.02) AU.killerStep(0.45 * vol + 0.04, panTo(K));
  }
  // her lantern breathes warm light as she walks
  if (K.lantern) {
    K.lantern.intensity = 1.6 * (0.85 + 0.15 * Math.sin(perfT * 6.3) * Math.sin(perfT * 2.1)) + (K.state === 'chase' ? 0.4 : 0);
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
  if (phoneHandT >= 0) { ix = 0; iz = 0; } // hold still — you're answering the phone
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
  if (chapter === 1 && frontDoor.open > 0.5 && player.z > 28.9) startChapter2();
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
let dieT = 0, dieSl = 0, dieMode = 'butcher';
function die() {
  player.dead = true; state = 'dying'; deaths++; dieT = 0; dieSl = 0; dieMode = 'butcher';
  clearKillFx();
  if (mapOpen) toggleMap();
  drawScareFace(killer.P.name === 'widow' ? 'wife' : 'butcher');
  showScare(0.45);
  $('deathTitle').textContent = killer.P.deathTitle;
  $('deathText').textContent = killer.P.deathText;
  AU.sting(); AU.growl(0, 0.5);
  if (document.exitPointerLock) document.exitPointerLock();
}
function wifeKill() {
  if (player.dead || state !== 'play') return;
  player.dead = true; state = 'dying'; deaths++; dieT = 0; dieSl = 0; dieMode = 'wife';
  clearKillFx();
  if (mapOpen) toggleMap();
  drawScareFace('wife');
  showScare(0.5);
  $('deathTitle').textContent = 'SHE TOOK YOU';
  $('deathText').textContent = 'You got too close. The Butcher is not the only thing that lives in this house.';
  NPCS.wife.g.rotation.y = Math.atan2(player.x - NPCS.wife.g.position.x, player.z - NPCS.wife.g.position.z);
  AU.screech();
  if (document.exitPointerLock) document.exitPointerLock();
}
function respawn() {
  player.dead = false; player.health = 100; player.stamina = 100;
  player.hidden = false; player.hideSpot = null;
  player.pitch = 0;
  player.vx = player.vz = 0; player.eye = 1.62;
  $('hideSlats').style.opacity = 0;
  flashlight.intensity = player.flash ? 2.6 : 0;
  camera.rotation.z = 0;
  clearKillFx();
  $('damageFlash').style.opacity = 0;
  if (curWorld === WH2) {
    player.x = cw(11); player.z = cw(15); player.yaw = 0;
    configureStalker(WH2);
    killer.grace = 6;
    caption('You wake on the cold boards by the door. Deeper in, the lantern light sways on.', 4.5);
  } else {
    player.x = cw(2.6); player.z = cw(11.8); player.yaw = 0;
    killer.x = cw(17); killer.z = cw(2); killer.state = 'patrol'; killer.path = null;
    killer.detect = 0; killer.grace = 6; killer.bust = null; killer.attackT = -1; killer.struck = false;
    // she returns to her corner
    NPCS.wife.g.position.set(NPCS.wife.x, 0, NPCS.wife.z);
    NPCS.wife.g.rotation.y = NPCS.wife.homeYaw;
    caption('You wake on the bedroom floor again. He carried you back. He wants to play.', 4.5);
  }
  hideOverlays(); state = 'play'; lockPointer();
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
  if (chapter === 1 && frontDoor.locked)
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
  $('emVenin').style.display = chapter >= 2 ? '' : 'none';
  $('emRemedy').style.display = chapter >= 2 ? '' : 'none';
  $('emVenin').className = 'emblem vialV' + (INV.venin ? ' got' : '');
  $('emRemedy').className = 'emblem vialR' + (INV.remedy ? ' got' : '');
}
const OVERLAYS = ['title', 'pauseOv', 'deathOv', 'winOv', 'noteOv'];
function showOverlay(id) {
  for (const o of OVERLAYS) $(o).classList.toggle('show', o === id);
}
function hideOverlays() { for (const o of OVERLAYS) $(o).classList.remove('show'); }

/* --------------------------------------------------------------- ambience */
let L = 0, lightningT = 5, hbT = 0, ambT = 18, brT = 0, buzzT = 0;
function ambience(dt) {
  if (ENVA.storm) {
    lightningT -= dt;
    if (lightningT <= 0) {
      lightningT = rand(8, 20);
      L = 1;
      setTimeout(() => AU.thunder(), rand(300, 1500));
    }
    L *= Math.exp(-dt * 3.2);
    lightning.intensity = L * 1.2;
    for (const m of windowMats) m.emissiveIntensity = 0.45 + L * 5;
  }
  if (AU.ok) {
    const k2 = clamp(dt * 1.5, 0, 1);
    AU.rainGain.gain.value = lerp(AU.rainGain.gain.value, 0.045 * ENVA.rain, k2);
    AU.windGain.gain.value = lerp(AU.windGain.gain.value, 0.055 * ENVA.wind, k2);
    let rv = 0;
    if (curWorld === WF) rv = 0.13 * clamp(1 - Math.abs(player.x - 63) / 30, 0, 1);
    AU.riverGain.gain.value = lerp(AU.riverGain.gain.value, rv, k2);
  }
  if (ENVA.birds && state === 'play') {
    birdT -= dt;
    if (birdT <= 0) { birdT = rand(3.5, 9); AU.bird(rand(-1, 1)); }
  }
  for (const fl of flickerLights) {
    fl.t += dt;
    if (fl.offT > 0) { fl.offT -= dt; fl.light.intensity = 0.02; continue; }
    if (Math.random() < fl.flicker * dt * 0.9) fl.offT = rand(0.04, 0.3);
    fl.light.intensity = fl.base * (0.82 + 0.18 * Math.sin(fl.t * 9.7) * Math.sin(fl.t * 3.1));
  }
  const d = killer.active ? dist2(killer.x, killer.z, player.x, player.z) : 999;
  const chase = killer.active && killer.state === 'chase';
  const near = killer.active ? clamp(1 - d / 13, 0, 1) : 0;
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
  // the stalker's breathing, when close and you are not yet caught
  if (killer.active && d < 8 && !chase) {
    brT -= dt;
    if (brT <= 0) { brT = 1.7; AU.breath(0.05 + (1 - d / 8) * 0.06); }
  }
  // flies working at whatever is left out
  let bfd = 99, bfs = null;
  for (const sw of flySwarms) {
    const dd = dist2(player.x, player.z, sw.x, sw.z);
    if (dd < bfd) { bfd = dd; bfs = sw; }
  }
  if (bfd < 5 && bfs) {
    buzzT -= dt;
    if (buzzT <= 0) { buzzT = 0.7; AU.buzz(0.02 + (1 - bfd / 5) * 0.05, panTo(bfs)); }
  }
  $('dangerVig').style.opacity = ((chase ? 0.55 : 0.35) * near + (chase ? 0.15 : 0)).toFixed(3);
  hbT -= dt;
  if ((near > 0.12 || chase) && hbT <= 0) {
    hbT = lerp(1.35, 0.42, near);
    AU.heartbeat(0.12 + near * 0.25);
  }
  if (AU.ok) {
    const target = !killer.active ? 0 : chase ? 0.15 : (killer.state === 'investigate' || killer.state === 'search') ? 0.05 : 0;
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
function killClaw() {
  const W = window.innerWidth, H = window.innerHeight;
  const a = rand(-0.5, 0.5) + (Math.random() < 0.5 ? 0.9 : -0.9);
  let dx = Math.cos(a), dy = Math.sin(a) + 0.4;
  const n = Math.hypot(dx, dy); dx /= n; dy /= n;
  const px = -dy, py = dx;
  const cx = W / 2 + rand(-W * 0.12, W * 0.12), cy = H / 2 + rand(-H * 0.1, H * 0.1);
  const len = Math.max(W, H) * 0.65;
  for (let k = 0; k < 4; k++) {
    const off = (k - 1.5) * 30;
    const s = {
      x1: cx - dx * len / 2 + px * off, y1: cy - dy * len / 2 + py * off,
      x2: cx + dx * len / 2 + px * off, y2: cy + dy * len / 2 + py * off,
      born: perfT, thin: true, jags: [],
    };
    for (let i = 0; i <= 14; i++) s.jags.push(rand(-5, 5));
    KFX.slashes.push(s);
    for (let i = 0; i < 4; i++) {
      const t = rand();
      KFX.drips.push({ x: lerp(s.x1, s.x2, t), y: lerp(s.y1, s.y2, t) + rand(10), len: 0, speed: rand(30, 140), w: rand(1, 2.5) });
    }
  }
  AU.slash();
}
function drawKillFx(dt, iris) {
  const c = $('killfx');
  if (c.width !== window.innerWidth || c.height !== window.innerHeight) { c.width = window.innerWidth; c.height = window.innerHeight; }
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  for (const s of KFX.slashes) {
    let wCore = 10 * Math.min(1, (perfT - s.born) * 8) + 2;
    if (s.thin) wCore *= 0.4;
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
  if (iris > 0) {
    // the world closes to a point in her hands
    const maxR = Math.hypot(c.width, c.height) / 2;
    g.fillStyle = '#000';
    g.beginPath();
    g.rect(0, 0, c.width, c.height);
    g.arc(c.width / 2, c.height / 2, Math.max(maxR * (1 - iris), 1), 0, Math.PI * 2, true);
    g.fill();
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
  const S = Math.min(30, Math.floor(920 / GW));
  if (c.width !== GW * S || c.height !== GH * S) { c.width = GW * S; c.height = GH * S; }
  const g = c.getContext('2d');
  const outdoor = curWorld === WF;
  g.fillStyle = '#141008'; g.fillRect(0, 0, c.width, c.height);
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    const ch = cellAt(x, z);
    if (ch === '#') g.fillStyle = outdoor ? '#101408' : '#3d2e1c';
    else if (ch === 'F') g.fillStyle = '#5a1410';
    else if (ch === '+') g.fillStyle = '#33271a';
    else g.fillStyle = outdoor ? '#1b2416' : '#221a10';
    g.fillRect(x * S, z * S, S, S);
  }
  if (curWorld.mapExtra) curWorld.mapExtra(g, S);
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
    } else if (it.id === 'venin' || it.id === 'remedy') {
      g.fillStyle = it.id === 'venin' ? '#c03018' : '#30a050';
      g.beginPath(); g.arc(MX(it.x), MZ(it.z), 5.5, 0, 7); g.fill();
      g.strokeStyle = '#e8dcc0'; g.lineWidth = 1.3; g.stroke();
    } else if (MAPICONS[it.id]) {
      g.font = '19px serif';
      g.fillText(MAPICONS[it.id], MX(it.x), MZ(it.z) + 7);
    }
  }
  if (curWorld === W1) {
    if (!noteRead) { g.font = '16px serif'; g.fillText('📜', MX(cw(3.6)), MZ(cw(9.4)) + 6); }
    // the other tenants
    g.font = '15px serif';
    g.fillText('👵', MX(NPCS.granny.x), MZ(NPCS.granny.z) + 5);
    g.fillStyle = '#e0a020'; g.font = 'bold 17px Georgia';
    g.fillText('⚠', MX(NPCS.wife.x), MZ(NPCS.wife.z) + 6);
  }
  for (const m of (curWorld.marks || [])) {
    g.fillStyle = m.color || '#d8c8a8';
    g.font = m.font || '16px serif';
    g.fillText(m.t, MX(m.x), MZ(m.z) + 6);
  }
  if (curWorld.exitMark) {
    g.fillStyle = '#d84a35'; g.font = "bold 13px 'Special Elite', Georgia, serif";
    g.fillText(curWorld.exitMark.label, MX(curWorld.exitMark.x), MZ(curWorld.exitMark.z));
  }
  // the stalker — only when close enough to hear
  const kd = killer.active ? dist2(killer.x, killer.z, player.x, player.z) : 999;
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
function drawScareFace(kind) {
  const c = $('scareCanvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  if (kind === 'wife') {
    // a curtain of black hair, one pale sliver of face behind it
    g.fillStyle = '#0a0806'; g.fillRect(96, 16, 320, 490);
    const grd2 = g.createLinearGradient(0, 60, 0, 460);
    grd2.addColorStop(0, '#d9cbb4'); grd2.addColorStop(1, '#8a7c66');
    g.fillStyle = grd2;
    g.beginPath(); g.ellipse(256, 252, 62, 182, 0, 0, 7); g.fill();
    for (let i = 0; i < 28; i++) {
      g.strokeStyle = 'rgba(8,6,4,' + rand(0.5, 0.95).toFixed(2) + ')';
      g.lineWidth = rand(2, 7);
      const x = 200 + rand(112);
      g.beginPath(); g.moveTo(x, 26);
      g.bezierCurveTo(x + rand(-30, 30), 200, x + rand(-30, 30), 350, x + rand(-45, 45), 505);
      g.stroke();
    }
    // one eye, wide open, wrong
    g.fillStyle = '#f2ece0'; g.beginPath(); g.ellipse(240, 216, 23, 13, 0.1, 0, 7); g.fill();
    g.fillStyle = '#1a0505'; g.beginPath(); g.arc(244, 215, 6, 0, 7); g.fill();
    g.fillStyle = '#a01208'; g.beginPath(); g.arc(244, 215, 2.5, 0, 7); g.fill();
    // a mouth open too far
    g.fillStyle = '#050202'; g.beginPath(); g.ellipse(258, 352, 16, 36, -0.08, 0, 7); g.fill();
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = 'rgba(0,0,0,' + rand(0.05, 0.35).toFixed(2) + ')';
      g.lineWidth = rand(0.5, 2);
      const x = rand(512);
      g.beginPath(); g.moveTo(x, rand(512)); g.lineTo(x + rand(-25, 25), rand(512)); g.stroke();
    }
    return;
  }
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
  if (curWorld !== W1) return;
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

/* ===================================================================== */
/*  CHAPTER TWO — the estate grounds, the widow's house, the boathouse   */
/* ===================================================================== */
let chapter = 1, ch2phase = 0;
let phoneRinging = false, phoneRingT = 0, birdT = 3;
const ENVA = { rain: 1, wind: 0, storm: true, birds: false };

/* ---------------- world management ---------------- */
function beginWorld(w, map, rooms) {
  worldRoot = w.group;
  scene.add(w.group);
  w.group.visible = false;
  MAP = map; GW = map[0].length; GH = map.length; ROOMS = rooms;
  doorAt = new Map(); doors = []; colliders = []; blockedCells = new Set();
  interactables = []; itemMeshes = []; hideSpots = [];
  windowMats = []; flickerLights = []; flySwarms = [];
}
function sealWorld(w) {
  Object.assign(w, {
    map: MAP, gw: GW, gh: GH, rooms: ROOMS,
    doorAt, doors, colliders, blocked: blockedCells,
    interactables, itemMeshes, hideSpots, windowMats,
    flicker: flickerLights, swarms: flySwarms,
  });
}
function activateWorld(w) {
  for (const o of [W1, WF, WH2]) if (o && o.group) o.group.visible = (o === w);
  curWorld = w;
  worldRoot = w.group;
  MAP = w.map; GW = w.gw; GH = w.gh; ROOMS = w.rooms;
  doorAt = w.doorAt; doors = w.doors; colliders = w.colliders; blockedCells = w.blocked;
  interactables = w.interactables; itemMeshes = w.itemMeshes; hideSpots = w.hideSpots;
  windowMats = w.windowMats; flickerLights = w.flicker; flySwarms = w.swarms;
  applyEnv(w.envCfg);
  configureStalker(w);
}
function applyEnv(c) {
  if (!c) return;
  scene.fog.color.setHex(c.fog); scene.fog.density = c.fogD;
  scene.background.setHex(c.bg);
  hemiLight.color.setHex(c.hemiSky); hemiLight.groundColor.setHex(c.hemiGround); hemiLight.intensity = c.hemiI;
  sunLight.color.setHex(c.sun); sunLight.intensity = c.sunI;
  sunLight.position.set(c.sunPos[0], c.sunPos[1], c.sunPos[2]);
  ENVA.rain = c.rain; ENVA.wind = c.wind; ENVA.storm = c.storm; ENVA.birds = c.birds;
  if (!c.storm) { lightning.intensity = 0; L = 0; }
}
function configureStalker(w) {
  if (w.stalker === 'butcher' && butcherRig) { Object.assign(killer, butcherRig); killer.P = BUTCHER_P; killer.active = true; }
  else if (w.stalker === 'widow' && widowRig) { Object.assign(killer, widowRig); killer.P = WIDOW_P; killer.active = true; }
  else { killer.active = false; killer.state = 'patrol'; killer.bust = null; killer.attackT = -1; return; }
  killer.x = killer.homeX; killer.z = killer.homeZ;
  killer.state = 'patrol'; killer.path = null; killer.detect = 0; killer.bust = null;
  killer.attackT = -1; killer.struck = false; killer.grace = 4; killer.loseT = 0;
  killer.grp.position.set(killer.x, 0, killer.z);
}
function fadeSwap(fn) {
  const f = $('fadeBlack');
  f.classList.add('show');
  setTimeout(() => { fn(); }, 320);
  setTimeout(() => { f.classList.remove('show'); }, 620);
}

/* ---------------- chapter-two textures ---------------- */
function buildTextures2() {
  TEX.grass = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#232e1c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = ['rgba(48,64,36,0.5)', 'rgba(26,34,20,0.6)', 'rgba(58,72,40,0.3)'][i % 3];
      g.beginPath(); g.arc(rand(w), rand(h), rand(6, 26), 0, 7); g.fill();
    }
    for (let i = 0; i < 500; i++) {
      g.strokeStyle = 'rgba(' + (40 + rand(40) | 0) + ',' + (60 + rand(40) | 0) + ',30,' + rand(0.15, 0.5).toFixed(2) + ')';
      g.lineWidth = 1;
      const x = rand(w), y = rand(h);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-2, 2), y - rand(2, 6)); g.stroke();
    }
  }, 25, 20);
  TEX.dirt = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#3c3226'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 120, 0.22);
    for (let i = 0; i < 22; i++) {
      g.fillStyle = 'rgba(120,108,88,' + rand(0.15, 0.4).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h), rand(1.5, 4), 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(20,15,10,0.4)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.32, h); g.stroke();
    g.beginPath(); g.moveTo(w * 0.7, 0); g.lineTo(w * 0.66, h); g.stroke();
  });
  TEX.water = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#22303a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = 'rgba(150,180,200,' + rand(0.04, 0.18).toFixed(2) + ')';
      g.lineWidth = rand(1, 3);
      const y = rand(h);
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rand(-6, 6), w * 0.7, y + rand(-6, 6), w, y); g.stroke();
    }
  }, 2, 8);
  TEX.poster1 = canvasTex(128, 176, (g, w, h) => {
    // a made-up band poster: MOTH & MOON
    g.fillStyle = '#1a2238'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e2c8';
    g.beginPath(); g.arc(64, 66, 34, 0, 7); g.fill();
    g.fillStyle = '#1a2238';
    g.beginPath(); g.arc(76, 58, 30, 0, 7); g.fill();
    // a little moth crossing the moon
    g.fillStyle = '#2c2418';
    g.beginPath(); g.ellipse(52, 70, 4, 9, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(44, 66, 7, 4, -0.4, 0, 7); g.fill();
    g.beginPath(); g.ellipse(59, 66, 7, 4, 0.4, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(230,225,200,' + rand(0.3, 0.9).toFixed(2) + ')'; g.fillRect(rand(w), rand(h), 1.5, 1.5); }
    g.fillStyle = '#e8e2c8'; g.textAlign = 'center';
    g.font = "bold 15px Georgia"; g.fillText('MOTH & MOON', 64, 128);
    g.font = "10px Georgia"; g.fillStyle = '#9aa4c0'; g.fillText('the midnight tour', 64, 146);
    g.strokeStyle = '#3a4460'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
  });
  TEX.poster2 = canvasTex(112, 148, (g, w, h) => {
    // a sleeping cat, because of course
    g.fillStyle = '#efe0d2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d88ca8'; g.fillRect(0, 0, w, 22);
    g.fillStyle = '#4a4440';
    g.beginPath(); g.ellipse(56, 84, 30, 18, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(80, 74, 12, 0, 7); g.fill();
    g.beginPath(); g.moveTo(72, 64); g.lineTo(76, 54); g.lineTo(80, 64); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(82, 64); g.lineTo(86, 54); g.lineTo(90, 64); g.closePath(); g.fill();
    g.strokeStyle = '#4a4440'; g.lineWidth = 5;
    g.beginPath(); g.arc(38, 96, 14, 0.5, 2.6); g.stroke();
    g.fillStyle = '#8a5c6a'; g.textAlign = 'center';
    g.font = "bold 13px Georgia"; g.fillText('stay cozy', 56, 128);
    g.strokeStyle = '#c8b4a0'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  });
  TEX.poster3 = canvasTex(176, 120, (g, w, h) => {
    // mountains under stars
    g.fillStyle = '#141c2c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(220,225,240,' + rand(0.3, 1).toFixed(2) + ')'; g.fillRect(rand(w), rand(h * 0.6), 1.4, 1.4); }
    g.fillStyle = '#2a3a4c';
    g.beginPath(); g.moveTo(0, 92); g.lineTo(50, 42); g.lineTo(96, 92); g.closePath(); g.fill();
    g.fillStyle = '#1e2c3c';
    g.beginPath(); g.moveTo(60, 92); g.lineTo(122, 34); g.lineTo(176, 92); g.closePath(); g.fill();
    g.fillStyle = '#e8e2c8';
    g.beginPath(); g.moveTo(114, 42); g.lineTo(122, 34); g.lineTo(130, 42); g.closePath(); g.fill();
    g.fillStyle = '#c8d0e0'; g.textAlign = 'center';
    g.font = "italic bold 13px Georgia"; g.fillText('keep dreaming', 88, 108);
    g.strokeStyle = '#3a4460'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  });
  TEX.foam = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = 'rgba(215,230,240,' + rand(0.15, 0.55).toFixed(2) + ')';
      g.lineWidth = rand(1, 3.5);
      const y = rand(h), x = rand(w), len = rand(14, 60);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + rand(-5, 5), y + len / 2, x + rand(-8, 8), y + len); g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(220,235,245,' + rand(0.1, 0.4).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h), rand(0.8, 2.4), 0, 7); g.fill();
    }
  }, 2, 10);
  TEX.mist = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(200,210,220,0.55)'); gr.addColorStop(1, 'rgba(200,210,220,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  TEX.floor2 = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#332f26'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) {
      g.fillStyle = `rgb(${44 + rand(14) | 0},${41 + rand(10) | 0},${32 + rand(8) | 0})`;
      g.fillRect(0, y, w, 62);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(rand(w), y, 4, 62);
      for (let i = 0; i < 20; i++) {
        g.strokeStyle = 'rgba(15,12,8,' + rand(0.1, 0.3).toFixed(2) + ')';
        g.lineWidth = rand(0.5, 1.6);
        const gy = y + rand(62);
        g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy + rand(-5, 5)); g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, y + 62, w, 2);
    }
    // rot holes and moss
    for (let i = 0; i < 9; i++) {
      g.fillStyle = 'rgba(8,6,4,' + rand(0.5, 0.9).toFixed(2) + ')';
      g.beginPath(); g.ellipse(rand(w), rand(h), rand(8, 26), rand(5, 14), rand(3), 0, 7); g.fill();
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(42,64,34,' + rand(0.25, 0.55).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h), rand(6, 22), 0, 7); g.fill();
    }
    grime(g, w, h, 300, 0.2);
  }, 23, 17);
  TEX.wall2 = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#33362b'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 26) { g.fillStyle = 'rgba(46,50,38,0.9)'; g.fillRect(x, 0, 12, h); }
    // peeled patches showing the boards beneath
    for (let i = 0; i < 7; i++) {
      g.fillStyle = 'rgba(74,58,38,0.85)';
      g.beginPath();
      const x = rand(w), y = rand(h);
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo(x + rand(-30, 30), y + rand(-24, 24));
      g.closePath(); g.fill();
    }
    // black-green mold blooming from corners
    for (let i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(20,32,18,' + rand(0.3, 0.7).toFixed(2) + ')';
      g.beginPath(); g.arc(rand(w), rand(h), rand(8, 34), 0, 7); g.fill();
    }
    grime(g, w, h, 300, 0.25);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, h - 30, w, 30);
  });
  TEX.maskWidow = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c9bda6'; g.fillRect(0, 0, w, h);
    grime(g, w, h, 50, 0.12);
    // gaunt hollows
    g.fillStyle = 'rgba(70,58,42,0.6)';
    g.beginPath(); g.ellipse(32, 86, 13, 22, 0.3, 0, 7); g.fill();
    g.beginPath(); g.ellipse(96, 86, 13, 22, -0.3, 0, 7); g.fill();
    g.fillStyle = 'rgba(70,58,42,0.35)';
    g.beginPath(); g.ellipse(64, 70, 8, 16, 0, 0, 7); g.fill();
    // deep black sockets, amber pinpoints far back inside
    g.fillStyle = '#0c0703';
    g.beginPath(); g.ellipse(41, 46, 17, 14, 0.05, 0, 7); g.fill();
    g.beginPath(); g.ellipse(87, 46, 17, 14, -0.05, 0, 7); g.fill();
    g.fillStyle = '#ffb040';
    g.beginPath(); g.arc(41, 48, 2.6, 0, 7); g.fill();
    g.beginPath(); g.arc(87, 48, 2.6, 0, 7); g.fill();
    // dark tracks run from the eyes, like she never stopped crying something dark
    g.fillStyle = 'rgba(40,26,18,0.5)';
    g.fillRect(37, 58, 4, 30); g.fillRect(88, 58, 4, 34);
    // a mouth open a little too wide, a little too dark
    g.fillStyle = '#080302';
    g.beginPath(); g.ellipse(64, 106, 13, 10, 0, 0, 7); g.fill();
    g.strokeStyle = '#3d2c1c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(46, 102); g.quadraticCurveTo(64, 96, 82, 102); g.stroke();
    // cracked-porcelain lines
    for (let i = 0; i < 10; i++) {
      g.strokeStyle = 'rgba(60,48,36,' + rand(0.25, 0.5).toFixed(2) + ')';
      g.lineWidth = 1;
      const x = rand(20, 108), y = rand(16, 110);
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + rand(-12, 12), y + rand(6, 20));
      g.lineTo(x + rand(-16, 16), y + rand(16, 34));
      g.stroke();
    }
  });
}

/* ---------------- the widow (chapter-two stalker rig) ---------------- */
function buildWidow() {
  const g = new THREE.Group();
  const dress = new THREE.MeshStandardMaterial({ color: 0x1d2418, roughness: 1 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xc9bda6, roughness: 0.85 });
  const hairW = new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 1 });
  // a long mourning dress that flares to the floor
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.35, 12), dress);
  skirt.position.y = 0.68; g.add(skirt);
  const waist = box(0.3, 0.32, 0.24, dress); waist.position.y = 1.42; g.add(waist);
  const chest = box(0.4, 0.48, 0.28, dress); chest.position.y = 1.74; chest.rotation.x = 0.1; g.add(chest);
  const collar = box(0.44, 0.1, 0.3, new THREE.MeshStandardMaterial({ color: 0x2e2a20, roughness: 1 }));
  collar.position.y = 1.98; g.add(collar);
  // a locket at her throat — his, once
  const locket = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x9a8352, metalness: 0.8, roughness: 0.3 }));
  locket.position.set(0, 1.86, 0.16); g.add(locket);
  const headG = new THREE.Group(); headG.position.set(0, 2.16, 0.05); g.add(headG);
  const head = box(0.24, 0.3, 0.26, pale); headG.add(head);
  const faceW = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.3),
    new THREE.MeshStandardMaterial({ map: TEX.maskWidow, roughness: 0.95 }));
  faceW.position.set(0, 0, 0.135); headG.add(faceW);
  // gray hair falling all the way to her waist
  const hb = box(0.32, 1.35, 0.09, hairW); hb.position.set(0, -0.5, -0.16); headG.add(hb);
  for (const s of [-1, 1]) {
    const hs = box(0.08, 1.0, 0.2, hairW); hs.position.set(s * 0.15, -0.32, -0.03); headG.add(hs);
    const strand = box(0.045, 0.55, 0.045, hairW); strand.position.set(s * 0.1, -0.12, 0.12); headG.add(strand);
  }
  const ht = box(0.28, 0.1, 0.3, hairW); ht.position.y = 0.17; headG.add(ht);
  const mkL = (isArm, side) => {
    const pivot = new THREE.Group();
    const seg = box(isArm ? 0.12 : 0.14, isArm ? 0.64 : 0.9, isArm ? 0.12 : 0.16, dress);
    seg.position.y = -(isArm ? 0.32 : 0.45);
    pivot.add(seg);
    if (isArm) {
      const hand = box(0.09, 0.2, 0.055, pale); hand.position.y = -0.72; pivot.add(hand); // long, thin fingers
    }
    pivot.position.set(side * (isArm ? 0.34 : 0.14), isArm ? 1.92 : 1.0, 0);
    g.add(pivot);
    return pivot;
  };
  const lArm = mkL(true, -1), rArm = mkL(true, 1);
  const lLeg = mkL(false, -1), rLeg = mkL(false, 1);
  // the lantern — always in her left hand, always burning
  const lan = new THREE.Group();
  const cage = box(0.16, 0.24, 0.16, MAT.metal); lan.add(cage);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc060 }));
  lan.add(glow);
  const lanLight = new THREE.PointLight(0xffa040, 1.6, 15, 1.5);
  lan.add(lanLight);
  const ring = box(0.02, 0.09, 0.02, MAT.metal); ring.position.y = 0.17; lan.add(ring);
  lan.position.set(0, -0.85, 0.12);
  lArm.add(lan);
  // a curved harvest blade in the right hand
  const sk = new THREE.Group();
  const skh = box(0.035, 0.24, 0.035, MAT.wood); sk.add(skh);
  const skb1 = box(0.015, 0.05, 0.3, MAT.metal); skb1.position.set(0, -0.14, 0.14); sk.add(skb1);
  const skb2 = box(0.015, 0.05, 0.18, MAT.metal); skb2.position.set(0, -0.2, 0.3); skb2.rotation.x = 0.7; sk.add(skb2);
  sk.position.set(0, -0.76, 0);
  rArm.add(sk);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(1.02);
  worldRoot.add(g);
  widowRig = { grp: g, lArm, rArm, lLeg, rLeg, headG, lantern: lanLight, homeX: cw(18), homeZ: cw(2) };
}

/* ---------------- the forest ---------------- */
function buildForest() {
  const rows = [];
  for (let z = 0; z < 40; z++) {
    let r = '';
    for (let x = 0; x < 50; x++) r += (x < 1 || z < 1 || x >= 49 || z >= 39) ? '#' : '.';
    rows.push(r);
  }
  beginWorld(WF, rows, {});
  WF.stalker = null;
  WF.patrolKeys = null;
  WF.envCfg = {
    fog: 0x36414c, fogD: 0.013, bg: 0x2b3642,
    hemiSky: 0x8fa4bd, hemiGround: 0x1a221c, hemiI: 0.62,
    sun: 0xffc890, sunI: 0.42, sunPos: [70, 26, -30],
    storm: false, rain: 0, wind: 1, birds: true,
  };
  WF.marks = [
    { t: '🏠', x: 14, z: 8 }, { t: '🚐', x: 30, z: 46 }, { t: '🏚', x: 84, z: 40 },
    { t: 'THE RIVER', x: 63, z: 16, color: '#5a7f96', font: "11px 'Special Elite', Georgia" },
  ];
  WF.mapExtra = (g, S) => {
    g.fillStyle = 'rgba(58,92,112,0.55)';
    g.fillRect(59.5 / CELL * S, 2 / CELL * S, 7 / CELL * S, 76 / CELL * S);
    g.fillStyle = '#6b4a26';
    g.fillRect(59 / CELL * S, 38.4 / CELL * S, 8.4 / CELL * S, 3.2 / CELL * S); // the bridge
  };

  // ground and paths
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 80),
    new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1, bumpMap: TEX.grass, bumpScale: 0.03, envMapIntensity: 0.5 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(50, 0, 40);
  ground.receiveShadow = true; worldRoot.add(ground);
  // a real dawn sky, not a flat color: gradient dome plus a low sun glow
  const skyTex = canvasTex(16, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0d1524');
    gr.addColorStop(0.42, '#2b3a4c');
    gr.addColorStop(0.58, '#4a5566');
    gr.addColorStop(0.72, '#8a6a4e');
    gr.addColorStop(0.8, '#c08050');
    gr.addColorStop(1, '#3a3430');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(220,225,240,' + rand(0.15, 0.5).toFixed(2) + ')'; g.fillRect(rand(w), rand(h * 0.3), 1, 1); }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(88, 20, 14),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  dome.position.set(50, 0, 40);
  worldRoot.add(dome);
  const glowTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,190,120,0.85)');
    gr.addColorStop(0.5, 'rgba(230,140,70,0.3)');
    gr.addColorStop(1, 'rgba(230,140,70,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(36, 26),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false }));
  sunGlow.position.set(120, 12, 12);
  sunGlow.lookAt(50, 4, 40);
  worldRoot.add(sunGlow);
  const dirtMat = new THREE.MeshStandardMaterial({ map: TEX.dirt, roughness: 1 });
  const pathSegs = [
    [14, 12, 16, 30], [16, 30, 30, 46], [30, 46, 56, 40], [56, 40, 67, 40], [67, 40, 82, 40],
    [30, 46, 42, 58], [42, 58, 58, 65], [58, 65, 62, 66],
  ];
  for (const [x1, z1, x2, z2] of pathSegs) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, len + 2), dirtMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = -Math.atan2(x2 - x1, z2 - z1);
    p.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    p.receiveShadow = true;
    worldRoot.add(p);
  }

  // the river and its bridge
  WF.waterMat = new THREE.MeshStandardMaterial({ map: TEX.water, roughness: 0.25, metalness: 0.25, transparent: true, opacity: 0.94 });
  const river = new THREE.Mesh(new THREE.PlaneGeometry(7, 76), WF.waterMat);
  river.rotation.x = -Math.PI / 2; river.position.set(63, -0.12, 40);
  worldRoot.add(river);
  // a second sheet of foam races over the top — the current is strong
  WF.foamMat = new THREE.MeshBasicMaterial({ map: TEX.foam, transparent: true, opacity: 0.5, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 76), WF.foamMat);
  foam.rotation.x = -Math.PI / 2; foam.position.set(63, -0.07, 40);
  worldRoot.add(foam);
  const bank = new THREE.MeshStandardMaterial({ color: 0x33291d, roughness: 1 });
  for (const bx of [59.3, 66.7]) {
    const b = box(1.2, 0.35, 76, bank); b.position.set(bx, 0.05, 40); b.receiveShadow = true; worldRoot.add(b);
  }
  colliders.push({ x0: 59, x1: 67.4, z0: 2, z1: 37 });
  colliders.push({ x0: 59, x1: 67.4, z0: 43, z1: 62.6 });
  colliders.push({ x0: 59, x1: 67.4, z0: 69.4, z1: 78 });
  const bridge = box(8.8, 0.18, 3.2, MAT.wood);
  bridge.position.set(63, 0.12, 40); bridge.receiveShadow = true; worldRoot.add(bridge);
  // a storm-felled pine blocks the bridge — until you've caught your breath
  const logM = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 4.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }));
  logM.rotation.z = Math.PI / 2; logM.rotation.y = 0.25;
  logM.position.set(57.9, 0.42, 40);
  logM.castShadow = true;
  worldRoot.add(logM);
  WF.bridgeLog = logM;
  WF.logCollider = { x0: 56.4, x1: 59.4, z0: 37.6, z1: 42.4 };
  colliders.push(WF.logCollider);
  WF.logInter = {
    x: 57.9, z: 40, y: 1, prompt: 'a fallen pine blocks the bridge', spin: false,
    action() {
      AU.locked();
      caption('Waterlogged and heavy — you can’t shift it alone yet. And that phone back at the camper is still ringing.', 4.5);
    },
  };
  interactables.push(WF.logInter);
  for (const bz of [38.6, 41.4]) {
    const rail = box(8.8, 0.1, 0.08, MAT.woodDark); rail.position.set(63, 1.0, bz); worldRoot.add(rail);
    for (let i = 0; i < 5; i++) { const p = box(0.09, 1.0, 0.09, MAT.woodDark); p.position.set(59.2 + i * 1.95, 0.5, bz); worldRoot.add(p); }
    colliders.push({ x0: 58.6, x1: 67.4, z0: bz - 0.15, z1: bz + 0.15 });
  }

  // pines (instanced)
  const treePts = [];
  const clearOf = (x, z) => {
    if (x > 57 && x < 69) return false;                     // river
    if (dist2(x, z, 30, 46) < 9) return false;              // camper clearing
    if (dist2(x, z, 14, 10) < 8 || dist2(x, z, 84, 40) < 8) return false; // facades
    if (dist2(x, z, 63, 66) < 8) return false;              // dock
    for (const [x1, z1, x2, z2] of pathSegs) {
      const l2 = (x2 - x1) ** 2 + (z2 - z1) ** 2;
      const t = clamp(((x - x1) * (x2 - x1) + (z - z1) * (z2 - z1)) / l2, 0, 1);
      if (dist2(x, z, x1 + (x2 - x1) * t, z1 + (z2 - z1) * t) < 3.4) return false;
    }
    return true;
  };
  let guard = 0;
  while (treePts.length < 150 && guard++ < 3000) {
    const x = rand(4, 96), z = rand(4, 76);
    if (clearOf(x, z)) treePts.push([x, z, rand(0.8, 1.35), rand(Math.PI * 2)]);
  }
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1, envMapIntensity: 0.35 });
  const needleA = new THREE.MeshStandardMaterial({ color: 0x1e3320, roughness: 1, flatShading: true, envMapIntensity: 0.3 });
  const needleB = new THREE.MeshStandardMaterial({ color: 0x2a4429, roughness: 1, flatShading: true, envMapIntensity: 0.3 });
  // two tones of pine, three tiers of boughs each — a proper stand of trees
  const evens = treePts.filter((p, i) => i % 2 === 0);
  const odds = treePts.filter((p, i) => i % 2 === 1);
  const dummy = new THREE.Object3D();
  const trunkI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.38, 3.6, 7), barkMat, treePts.length);
  treePts.forEach(([x, z, s, ry], i) => {
    dummy.position.set(x, 1.8 * s, z); dummy.scale.setScalar(s); dummy.rotation.y = ry;
    dummy.updateMatrix(); trunkI.setMatrixAt(i, dummy.matrix);
    addCollider(x, z, 0.7 * s, 0.7 * s);
  });
  trunkI.castShadow = true; trunkI.receiveShadow = true; worldRoot.add(trunkI);
  const tier = (pts, mat, radius, height, yOff) => {
    const im = new THREE.InstancedMesh(new THREE.ConeGeometry(radius, height, 8), mat, pts.length);
    pts.forEach(([x, z, s, ry], i) => {
      dummy.position.set(x, yOff * s, z); dummy.scale.setScalar(s); dummy.rotation.y = ry;
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    });
    im.castShadow = true; im.receiveShadow = true; worldRoot.add(im);
  };
  for (const [pts, mat] of [[evens, needleA], [odds, needleB]]) {
    tier(pts, mat, 2.2, 3.4, 3.6);
    tier(pts, mat, 1.7, 3.0, 5.6);
    tier(pts, mat, 1.1, 2.6, 7.5);
  }
  // a few dead, bare trees among the living
  for (let i = 0; i < 16; i++) {
    const [tx, tz] = treePts[(rand(treePts.length) | 0)];
    const dx = tx + rand(-3, 3), dz = tz + rand(-3, 3);
    if (!clearOf(dx, dz)) continue;
    const dg = new THREE.Group();
    const dtr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, rand(4, 6), 6),
      new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 1 }));
    dtr.position.y = 2.4; dg.add(dtr);
    for (let b = 0; b < 3; b++) {
      const br = box(0.05, rand(0.8, 1.6), 0.05, dtr.material);
      br.position.set(rand(-0.2, 0.2), rand(2.2, 4.2), rand(-0.2, 0.2));
      br.rotation.z = rand(0.5, 1.1) * (Math.random() < 0.5 ? 1 : -1);
      dg.add(br);
    }
    dg.rotation.y = rand(7); dg.rotation.z = rand(-0.06, 0.06);
    dg.position.set(dx, 0, dz);
    dg.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    worldRoot.add(dg);
    addCollider(dx, dz, 0.4, 0.4);
  }
  // undergrowth and stones
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x24331f, roughness: 1 });
  for (let i = 0; i < 40; i++) {
    const [x, z] = treePts[(rand(treePts.length) | 0)];
    const b = new THREE.Mesh(new THREE.SphereGeometry(rand(0.4, 0.8), 6, 5), bushMat);
    b.scale.y = 0.55; b.position.set(x + rand(-2, 2), 0.2, z + rand(-2, 2));
    worldRoot.add(b);
  }
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5c5c58, roughness: 0.9 });
  for (let i = 0; i < 12; i++) {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.25, 0.7), 0), rockMat);
    r.position.set(rand(56, 70), 0.15, rand(6, 76));
    r.castShadow = true; worldRoot.add(r);
  }

  // lantern-posts marking the way to the camper — small, warm promises
  for (const [lx, lz] of [[14.8, 15.5], [15.2, 22], [16, 29], [19, 35], [23.5, 40], [28, 44.5]]) {
    const pole = box(0.13, 2.5, 0.13, MAT.woodDark); pole.position.set(lx, 1.25, lz); pole.castShadow = true; worldRoot.add(pole);
    const arm = box(0.4, 0.07, 0.07, MAT.woodDark); arm.position.set(lx + 0.14, 2.5, lz); worldRoot.add(arm);
    const cage = box(0.22, 0.3, 0.22, MAT.metal); cage.position.set(lx + 0.3, 2.32, lz); worldRoot.add(cage);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffcf8a }));
    gl.position.set(lx + 0.3, 2.3, lz); worldRoot.add(gl);
    const li = new THREE.PointLight(0xffa040, 0.95, 13, 1.7); li.position.set(lx + 0.3, 2.25, lz); worldRoot.add(li);
    flickerLights.push({ light: li, base: 0.95, flicker: 0.1, t: rand(10), bulb: null });
    addCollider(lx, lz, 0.32, 0.32);
  }

  // the Hollow House, dark and shut behind you
  const hw = box(14, 4.4, 0.8, MAT.wall); hw.position.set(14, 2.2, 7.6); worldRoot.add(hw);
  const hdoor = box(1.6, 2.5, 0.2, MAT.woodDark); hdoor.position.set(14, 1.25, 8.1); worldRoot.add(hdoor);
  for (let i = 0; i < 3; i++) {
    const pl = box(1.9, 0.2, 0.06, MAT.wood); pl.position.set(14, 0.9 + i * 0.62, 8.22); pl.rotation.z = rand(-0.15, 0.15); worldRoot.add(pl);
  }
  const proof = box(15, 0.5, 2, MAT.woodDark); proof.position.set(14, 4.1, 8.6); worldRoot.add(proof);
  colliders.push({ x0: 7, x1: 21, z0: 6.8, z1: 8.6 });
  interactables.push({ x: 14, z: 8.6, y: 1, prompt: 'the Hollow House — bolted from inside', spin: false, action() { AU.locked(); caption('Bolted. Somewhere in there, heavy boots pace back and forth, back and forth.', 4); } });

  // the camper — the one warm, safe place on the estate
  buildCamper();

  // the widow's house, across the river — tall, crooked, two rotting storeys
  const wwMat = new THREE.MeshStandardMaterial({ map: TEX.wall2, roughness: 1 });
  const ww = box(3.2, 7.2, 18, wwMat);
  ww.position.set(85.8, 3.6, 40); ww.rotation.z = 0.015; ww.castShadow = true; worldRoot.add(ww);
  // a sagging gable roof and a cold chimney
  const gA = box(3.2, 0.4, 10, MAT.woodDark); gA.position.set(85, 7.9, 40); gA.rotation.x = 0; gA.rotation.z = 0.5; worldRoot.add(gA);
  const gB = box(3.2, 0.4, 10, MAT.woodDark); gB.position.set(86.6, 7.9, 40); gB.rotation.z = -0.5; worldRoot.add(gB);
  const gA2 = box(3.2, 0.4, 7, MAT.woodDark); gA2.position.set(85, 7.9, 46.5); gA2.rotation.z = 0.5; worldRoot.add(gA2);
  const gB2 = box(3.2, 0.4, 7, MAT.woodDark); gB2.position.set(86.6, 7.9, 46.5); gB2.rotation.z = -0.5; worldRoot.add(gB2);
  const chim = box(0.8, 2.4, 0.8, new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 1 }));
  chim.position.set(86.4, 8.6, 34.5); chim.rotation.z = -0.04; worldRoot.add(chim);
  // porch, steps, and the door
  const porchRoof = box(2.6, 0.3, 5, MAT.woodDark); porchRoof.position.set(83.2, 3.2, 40); porchRoof.rotation.z = 0.14; worldRoot.add(porchRoof);
  for (const pz of [37.8, 42.2]) { const pp = box(0.14, 3.1, 0.14, MAT.woodDark); pp.position.set(82.4, 1.55, pz); worldRoot.add(pp); }
  const pstep = box(1.6, 0.22, 2.4, MAT.wood); pstep.position.set(83.4, 0.11, 40); worldRoot.add(pstep);
  const wdoor = box(0.2, 2.6, 1.5, MAT.woodDark); wdoor.position.set(84.1, 1.3, 40); worldRoot.add(wdoor);
  // windows on both floors — one of them faintly lit
  for (const [wy, wz, glowy] of [[1.9, 34.5, 0], [1.9, 45.5, 0], [5.2, 36, 0], [5.2, 40, 1], [5.2, 44, 0]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.7),
      new THREE.MeshStandardMaterial({ map: TEX.window, emissive: glowy ? 0x6a4210 : 0x1c1608, emissiveIntensity: glowy ? 1.2 : 0.5, emissiveMap: TEX.window }));
    win.position.set(84.15, wy, wz); win.rotation.y = -Math.PI / 2; worldRoot.add(win);
  }
  colliders.push({ x0: 84, x1: 87.6, z0: 30.8, z1: 49.2 });
  interactables.push({ x: 83.6, z: 40, y: 1, prompt: 'enter the Widow’s house', spin: false, action() { enterWidowHouse(); } });

  // the old boathouse and its dock
  const dockMat = new THREE.MeshStandardMaterial({ map: TEX.wood, color: 0x8a7355, roughness: 1 });
  const dock = box(7, 0.2, 5.6, dockMat); dock.position.set(63, 0.1, 66); dock.receiveShadow = true; worldRoot.add(dock);
  for (const dz of [63.4, 68.6]) { const r2 = box(7, 0.08, 0.08, MAT.woodDark); r2.position.set(63, 0.9, dz); worldRoot.add(r2); }
  const shackW = new THREE.MeshStandardMaterial({ map: TEX.wall2, roughness: 1 });
  const shack = box(3.2, 2.6, 4.4, shackW); shack.position.set(68, 1.3, 66); shack.castShadow = true; worldRoot.add(shack);
  const shroof = box(4, 0.3, 5.2, MAT.woodDark); shroof.position.set(68, 2.8, 66); shroof.rotation.z = 0.12; worldRoot.add(shroof);
  colliders.push({ x0: 66.4, x1: 69.6, z0: 63.8, z1: 68.2 });
  const beaconGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0x203040 }));
  beaconGlow.position.set(66.2, 2.3, 66); worldRoot.add(beaconGlow);
  const beacon = new THREE.PointLight(0x6fd0ff, 0, 14, 1.6);
  beacon.position.set(66.2, 2.2, 66); worldRoot.add(beacon);
  WF.beacon = beacon; WF.beaconGlow = beaconGlow;

  // low mist over the water and the clearing
  WF.mists = [];
  const mistMat = new THREE.MeshBasicMaterial({ map: TEX.mist, transparent: true, opacity: 0.16, depthWrite: false });
  for (const [mx, mz, ms] of [[60, 25, 16], [64, 52, 18], [34, 44, 14], [50, 64, 16]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ms, ms * 0.7), mistMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(mx, 0.55, mz);
    worldRoot.add(m);
    WF.mists.push({ m, x: mx, sp: rand(0.1, 0.3) });
  }
  // birds on the wing
  WF.birds = [];
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x141618 });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    const wl = box(0.55, 0.02, 0.16, wingMat); wl.position.x = -0.28; b.add(wl);
    const wr = box(0.55, 0.02, 0.16, wingMat); wr.position.x = 0.28; b.add(wr);
    worldRoot.add(b);
    WF.birds.push({ g: b, wl, wr, a: rand(7), r: rand(14, 26), cx: rand(25, 55), cz: rand(15, 60), h: rand(10, 16), s: rand(0.1, 0.18) });
  }
  sealWorld(WF);
}
function buildCamper() {
  const cream = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.6 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x3f6f6a, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.8 });
  const honey = new THREE.MeshStandardMaterial({ map: TEX.wood, color: 0xb08a5c, roughness: 0.7 });
  const cx = 30, cz = 49.5;
  // ---- a camper you can actually walk into: hollow shell, door on the west side ----
  const H = 2.2, t = 0.12;
  const wall = (w, d, x, z) => {
    const m = box(w, H, d, cream); m.position.set(x, H / 2, z);
    m.castShadow = true; m.receiveShadow = true; worldRoot.add(m);
    colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    return m;
  };
  wall(t, 6.4, 31.54, 49.5);            // east
  wall(t, 4.7, 28.46, 48.65);           // west, up to the door
  wall(t, 0.6, 28.46, 52.4);            // west, past the door
  wall(3.2, t, 30, 46.36);              // front bulkhead
  wall(3.2, t, 30, 52.64);              // rear bulkhead
  const roofC = box(3.5, 0.2, 6.8, teal); roofC.position.set(30, 2.32, 49.5); roofC.castShadow = true; worldRoot.add(roofC);
  const stripeE = box(0.06, 0.4, 6.44, teal); stripeE.position.set(31.6, 1.1, 49.5); worldRoot.add(stripeE);
  const stripeW = box(0.06, 0.4, 4.7, teal); stripeW.position.set(28.4, 1.1, 48.65); worldRoot.add(stripeW);
  const cab = box(3.2, 1.25, 1.5, cream); cab.position.set(30, 0.85, 53.55); cab.castShadow = true; worldRoot.add(cab);
  const shield = box(3.0, 0.7, 0.08, dark); shield.position.set(30, 1.3, 54.25); worldRoot.add(shield);
  colliders.push({ x0: 28.4, x1: 31.6, z0: 52.76, z1: 54.4 });
  for (const [wx, wz] of [[28.9, 47.6], [31.1, 47.6], [28.9, 53.2], [31.1, 53.2]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), dark);
    wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.42, wz); worldRoot.add(wh);
  }
  // warm windows, glowing from inside
  for (const [wx, wy, wz] of [[31.56, 1.55, 48.2], [31.56, 1.55, 51.0], [28.44, 1.55, 47.5]]) {
    const wm = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb050, emissiveIntensity: 0.9 });
    const win = box(0.06, 0.6, 1.0, wm); win.position.set(wx, wy, wz); worldRoot.add(win);
  }
  const step = box(0.55, 0.16, 0.8, dark); step.position.set(28.1, 0.08, 51.55); worldRoot.add(step);

  // ---- inside: somebody's whole soft little world ----
  const floorC = box(3.2, 0.05, 6.4, honey); floorC.position.set(30, 0.03, 49.5); floorC.receiveShadow = true; worldRoot.add(floorC);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.72, 18),
    new THREE.MeshStandardMaterial({ color: 0xc27a94, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(29.6, 0.07, 50.2); rug.receiveShadow = true; worldRoot.add(rug);
  // the rumpled bed
  const matt = box(1.5, 0.35, 2.1, MAT.white); matt.position.set(30.72, 0.28, 47.5); matt.castShadow = true; worldRoot.add(matt);
  const blanket = box(1.52, 0.1, 1.5, new THREE.MeshStandardMaterial({ color: 0xc06880, roughness: 1 }));
  blanket.position.set(30.72, 0.48, 47.9); blanket.rotation.y = 0.06; worldRoot.add(blanket);
  const crumple = box(0.9, 0.16, 0.7, blanket.material); crumple.position.set(30.5, 0.55, 48.15); crumple.rotation.y = 0.45; worldRoot.add(crumple);
  for (const [px2, pz2, pr] of [[30.45, 46.85, 0.2], [31.1, 46.95, -0.3]]) {
    const pil = box(0.55, 0.13, 0.36, MAT.white); pil.position.set(px2, 0.51, pz2); pil.rotation.y = pr; worldRoot.add(pil);
  }
  colliders.push({ x0: 29.9, x1: 31.5, z0: 46.4, z1: 48.6 });
  // posters taped to the walls
  const posterAt = (tex, x, y, z, ry, w2, h2) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w2, h2),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    p.position.set(x, y, z); p.rotation.y = ry; p.rotation.z = rand(-0.03, 0.03);
    worldRoot.add(p);
  };
  posterAt(TEX.poster1, 31.46, 1.5, 49.55, -Math.PI / 2, 0.62, 0.85);
  posterAt(TEX.poster2, 31.46, 1.42, 50.5, -Math.PI / 2, 0.5, 0.66);
  posterAt(TEX.poster3, 30.5, 1.5, 52.56, Math.PI, 0.8, 0.55);
  // polaroid wall over the bed
  for (let i = 0; i < 8; i++) {
    const pol = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.17), MAT.white);
    pol.position.set(28.54, 1.35 + rand(0.5), 47.1 + rand(1.5));
    pol.rotation.y = Math.PI / 2; pol.rotation.z = rand(-0.3, 0.3);
    worldRoot.add(pol);
    const ph2 = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.1),
      new THREE.MeshStandardMaterial({ color: [0x5a708a, 0x8a6a5a, 0x5a8a6a][i % 3], roughness: 1 }));
    ph2.position.copy(pol.position); ph2.position.x += 0.005; ph2.position.y += 0.015;
    ph2.rotation.copy(pol.rotation);
    worldRoot.add(ph2);
  }
  // a paper pennant garland
  for (let i = 0; i < 6; i++) {
    const pen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: [0xd88ca8, 0x5f8f8a, 0xe0d6b8][i % 3], roughness: 1, side: THREE.DoubleSide }));
    pen.position.set(28.75 + i * 0.5, 1.86 - Math.sin(i / 5 * Math.PI) * 0.1, 46.45);
    pen.rotation.z = Math.PI / 4;
    worldRoot.add(pen);
  }
  // clothes, everywhere, the way a safe room should be
  for (const [gx2, gz2, col] of [[29.4, 48.9, 0xd88ca8], [30.1, 49.8, 0x9a8ac0], [29.0, 50.6, 0x5f8f8a], [30.9, 49.3, 0xe0d6b8], [29.8, 51.4, 0xc06880]]) {
    const cl = box(rand(0.3, 0.5), 0.1, rand(0.25, 0.45),
      new THREE.MeshStandardMaterial({ color: col, roughness: 1 }));
    cl.position.set(gx2, 0.09, gz2); cl.rotation.y = rand(1.5);
    worldRoot.add(cl);
  }
  // little desk with the telephone and a lamp
  const dtop = box(0.9, 0.06, 0.55, honey); dtop.position.set(31.15, 0.78, 50.95); dtop.castShadow = true; worldRoot.add(dtop);
  for (const dz2 of [50.72, 51.18]) { const dl = box(0.06, 0.78, 0.06, honey); dl.position.set(30.76, 0.39, dz2); worldRoot.add(dl); }
  colliders.push({ x0: 30.68, x1: 31.6, z0: 50.6, z1: 51.3 });
  const phoneG = new THREE.Group();
  const pbody = box(0.26, 0.16, 0.22, new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.4 })); pbody.position.y = 0.08; phoneG.add(pbody);
  const phand = box(0.3, 0.07, 0.09, new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.4 })); phand.position.y = 0.2; phoneG.add(phand);
  phoneG.position.set(31.1, 0.81, 50.85);
  worldRoot.add(phoneG);
  WF.phone = { x: 31.1, z: 50.85 };
  const lampB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8), dark);
  lampB.position.set(31.38, 0.95, 51.2); worldRoot.add(lampB);
  const lampS = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8c890, emissive: 0xffb050, emissiveIntensity: 0.7 }));
  lampS.position.set(31.38, 1.14, 51.2); worldRoot.add(lampS);
  const lampLi = new THREE.PointLight(0xffc080, 0.6, 4.5, 1.8);
  lampLi.position.set(31.3, 1.1, 51.1); worldRoot.add(lampLi);
  flickerLights.push({ light: lampLi, base: 0.6, flicker: 0.04, t: rand(10), bulb: null });
  const stoolIn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.45, 10), teal);
  stoolIn.position.set(30.45, 0.22, 50.95); worldRoot.add(stoolIn);
  addCollider(30.45, 50.95, 0.5, 0.5);
  // a tiny wood stove, still warm — the fire inside the safe place
  const stove = box(0.55, 0.75, 0.5, dark); stove.position.set(28.85, 0.4, 49.3); stove.castShadow = true; worldRoot.add(stove);
  const fireWin = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xff8a30 }));
  fireWin.position.set(29.14, 0.45, 49.3); fireWin.rotation.y = Math.PI / 2; worldRoot.add(fireWin);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), dark);
  pipe.position.set(28.85, 1.5, 49.3); worldRoot.add(pipe);
  colliders.push({ x0: 28.55, x1: 29.15, z0: 49.0, z1: 49.6 });
  const stoveLi = new THREE.PointLight(0xff6a20, 0.85, 5.5, 1.8);
  stoveLi.position.set(29.1, 0.65, 49.3); worldRoot.add(stoveLi);
  flickerLights.push({ light: stoveLi, base: 0.85, flicker: 0.35, t: rand(10), bulb: null });
  // a shelf of small books
  const shelfC = box(0.7, 0.05, 0.22, honey); shelfC.position.set(28.66, 1.5, 50.4); worldRoot.add(shelfC);
  for (let i = 0; i < 4; i++) {
    const bk = box(0.06, rand(0.16, 0.24), 0.16,
      new THREE.MeshStandardMaterial({ color: [0x8a4a5c, 0x4a6a8a, 0x8a7a4a, 0x5c8a5c][i], roughness: 1 }));
    bk.position.set(28.45 + i * 0.11, 1.62, 50.4); bk.rotation.z = rand(-0.08, 0.08);
    worldRoot.add(bk);
  }
  // string lights along the ceiling
  for (let i = 0; i < 7; i++) {
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
    gl.position.set(29 + i * 0.36, 2.05 - Math.sin(i / 6 * Math.PI) * 0.09, 48.4 + i * 0.32);
    worldRoot.add(gl);
  }
  const inLi = new THREE.PointLight(0xffc080, 1.05, 7, 1.6);
  inLi.position.set(30, 1.95, 49.5); worldRoot.add(inLi);
  flickerLights.push({ light: inLi, base: 1.05, flicker: 0.05, t: rand(10), bulb: null });

  // ---- outside comforts ----
  const awn = box(2.2, 0.06, 3.4, teal); awn.position.set(27.6, 2.25, 49.3); awn.rotation.z = 0.16; worldRoot.add(awn);
  for (let i = 0; i < 6; i++) {
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
    gl.position.set(26.7, 2.0 - Math.sin(i / 5 * Math.PI) * 0.12, 47.7 + i * 0.65);
    worldRoot.add(gl);
  }
  const stringLi = new THREE.PointLight(0xffc878, 0.9, 11, 1.7);
  stringLi.position.set(27, 2.1, 49.5); worldRoot.add(stringLi);
  flickerLights.push({ light: stringLi, base: 0.9, flicker: 0.06, t: rand(10), bulb: null });
  for (let i = 0; i < 7; i++) {
    const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: 0x5a5a56, roughness: 1 }));
    const a = i / 7 * Math.PI * 2;
    st.position.set(25.4 + Math.cos(a) * 0.55, 0.1, 52.1 + Math.sin(a) * 0.55);
    worldRoot.add(st);
  }
  const emberF = new THREE.PointLight(0xff6a20, 0.6, 6, 2);
  emberF.position.set(25.4, 0.35, 52.1); worldRoot.add(emberF);
  flickerLights.push({ light: emberF, base: 0.6, flicker: 0.4, t: rand(10), bulb: null });
  addCollider(25.4, 52.1, 1.2, 1.2);
  interactables.push({
    x: WF.phone.x, z: WF.phone.z, y: 1,
    get prompt() { return phoneRinging ? 'answer the phone' : 'the phone — silent, for now'; },
    spin: false,
    action() { answerPhone(); },
  });
}

/* ---------------- the widow's house ---------------- */
const MAP2 = [
  '#######################',
  '#.....#.......#.......#',
  '#.....#.......#.......#',
  '#.....#.......#.......#',
  '#.....#.......#.......#',
  '###+######+#######+####',
  '#.....................#',
  '#.....................#',
  '#####+#####+#####+#####',
  '#.........#.#.........#',
  '#.........#.#.........#',
  '#.........#.#.........#',
  '#.........#.#.........#',
  '###########.###########',
  '###########.###########',
  '###########.###########',
  '###########F###########',
];
const ROOMS2 = {
  apoth: { x0: 1, x1: 5, z0: 1, z1: 4, name: 'Apothecary' },
  chamber: { x0: 7, x1: 13, z0: 1, z1: 4, name: 'Bed Chamber' },
  conserv: { x0: 15, x1: 21, z0: 1, z1: 4, name: 'Conservatory' },
  hall2: { x0: 1, x1: 21, z0: 6, z1: 7, name: 'Long Hall' },
  parlor: { x0: 1, x1: 9, z0: 9, z1: 12, name: 'Parlor' },
  hoard: { x0: 13, x1: 21, z0: 9, z1: 12, name: 'Hoard Room' },
  gullet: { x0: 11, x1: 11, z0: 8, z1: 15, name: '' },
};
function buildWidowHouse() {
  beginWorld(WH2, MAP2, ROOMS2);
  WH2.stalker = 'widow';
  WH2.patrolKeys = ['apoth', 'chamber', 'conserv', 'hall2', 'parlor', 'hoard'];
  WH2.envCfg = {
    fog: 0x050704, fogD: 0.072, bg: 0x030503,
    hemiSky: 0x1c2a20, hemiGround: 0x0a0c08, hemiI: 0.22,
    sun: 0x30405e, sunI: 0.05, sunPos: [-8, 14, -12],
    storm: true, rain: 0.7, wind: 0, birds: false,
  };
  WH2.exitMark = { x: cw(11), z: 16 * CELL + 1, label: 'OUT ⇩' };
  const floorMat = new THREE.MeshStandardMaterial({ map: TEX.floor2, roughness: 0.85, bumpMap: TEX.floor2, bumpScale: 0.022 });
  const wallMat = new THREE.MeshStandardMaterial({ map: TEX.wall2, roughness: 0.96, bumpMap: TEX.wall2, bumpScale: 0.02 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(GW * CELL / 2, 0, GH * CELL / 2);
  floor.receiveShadow = true; worldRoot.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), MAT.ceil);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(GW * CELL / 2, WALLH, GH * CELL / 2);
  worldRoot.add(ceil);
  const wallGeo = new THREE.BoxGeometry(CELL, WALLH, CELL);
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
    if (cellAt(x, z) !== '#') continue;
    let vis = false;
    for (let oz = -1; oz <= 1 && !vis; oz++) for (let ox = -1; ox <= 1; ox++)
      if (cellAt(x + ox, z + oz) !== '#') { vis = true; break; }
    if (!vis) continue;
    const m = new THREE.Mesh(wallGeo, wallMat);
    m.position.set(cw(x), WALLH / 2, cw(z));
    m.castShadow = true; m.receiveShadow = true;
    worldRoot.add(m);
  }
  for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++)
    if (cellAt(x, z) === '+') makeDoor(x, z, {});
  // the way out (a heavy door back to the forest)
  doorAt.set('11,16', { open: 0, locked: true });
  const outDoor = box(1.5, 2.5, 0.18, MAT.woodDark);
  outDoor.position.set(cw(11), 1.25, 16 * CELL + 0.1); worldRoot.add(outDoor);
  interactables.push({ x: cw(11), z: 15 * CELL + 1.5, y: 1, prompt: 'leave the house', spin: false, action() { exitWidowHouse(); } });

  // candles, few and guttering
  const candle = (x, z) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 8), MAT.white);
    c.position.set(x, 0.86, z); worldRoot.add(c);
    const base = box(0.5, 0.75, 0.5, MAT.woodDark); base.position.set(x, 0.37, z); base.castShadow = true; worldRoot.add(base);
    addCollider(x, z, 0.55, 0.55);
    const fl = new THREE.PointLight(0xffa040, 0.5, 7, 2);
    fl.position.set(x, 1.05, z); worldRoot.add(fl);
    flickerLights.push({ light: fl, base: 0.5, flicker: 0.5, t: rand(10), bulb: null });
  };
  candle(cw(3), cw(6.5));
  candle(cw(19), cw(6.5));
  candle(cw(11), cw(14));
  candle(cw(3), cw(11));
  candle(cw(17), cw(2));

  // hoarded junk, everywhere
  const junkPile = (x, z, big) => {
    for (let i = 0; i < (big ? 6 : 3); i++) {
      const j = box(rand(0.25, 0.7), rand(0.15, 0.55), rand(0.25, 0.7),
        Math.random() < 0.5 ? MAT.woodDark : MAT.wood);
      j.position.set(x + rand(-0.7, 0.7), 0.2, z + rand(-0.7, 0.7));
      j.rotation.y = rand(1.5); j.castShadow = true;
      worldRoot.add(j);
    }
    if (big) { addCollider(x, z, 1.4, 1.4); blockCell(Math.floor(x / CELL), Math.floor(z / CELL)); }
  };
  junkPile(cw(2), cw(9.6), true); junkPile(cw(7.5), cw(11.5), true); junkPile(cw(5), cw(10.5), false);
  junkPile(cw(14), cw(9.6), true); junkPile(cw(20), cw(11.5), true); junkPile(cw(17), cw(10.2), false);
  junkPile(cw(6), cw(6.3), false); junkPile(cw(15), cw(7.5), false);
  junkPile(cw(9), cw(2), true); junkPile(cw(12), cw(3.5), false);
  // fallen roof beams
  for (const [bx, bz, br] of [[cw(8), cw(6.8), 0.4], [cw(13), cw(10.5), 1.2], [cw(4), cw(3), 0.8]]) {
    const beam = box(0.22, 0.22, rand(2.4, 3.6), MAT.woodDark);
    beam.position.set(bx, 0.14, bz); beam.rotation.y = br; beam.rotation.z = 0.05;
    beam.castShadow = true; worldRoot.add(beam);
  }
  // moss and webs
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x2a4022, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
  for (let i = 0; i < 14; i++) {
    const mp = new THREE.Mesh(new THREE.CircleGeometry(rand(0.4, 1.1), 10), mossMat);
    mp.rotation.x = -Math.PI / 2;
    mp.position.set(rand(4, GW * CELL - 4), 0.015, rand(4, GH * CELL - 8));
    worldRoot.add(mp);
  }
  const webMat2 = new THREE.MeshBasicMaterial({ map: TEX.web, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  for (const [wx2, wz2, wr] of [[3, 3, 0.7], [43, 3, -0.7], [3, 22, 2.2], [43, 22, -2.2], [22, 13, 0.4], [12, 30, 0.9], [30, 6, -1.2], [16, 20, 1.7], [36, 20, -0.5], [8, 14, 1.1]]) {
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), webMat2);
    wb.position.set(wx2, WALLH - 0.6, wz2); wb.rotation.y = wr;
    worldRoot.add(wb);
  }
  // roaches
  WH2.roaches = [];
  const roachMat = new THREE.MeshStandardMaterial({ color: 0x1c1208, roughness: 0.5 });
  for (const [hx, hz] of [[cw(2), cw(10)], [cw(14), cw(10)], [cw(6), cw(6.5)], [cw(16), cw(6.8)], [cw(9), cw(2.5)], [cw(11), cw(12)]]) {
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.12), roachMat);
      r.position.set(hx + rand(-1, 1), 0.02, hz + rand(-1, 1));
      worldRoot.add(r);
      WH2.roaches.push({ m: r, hx, hz, t: rand(1), tx: hx, tz: hz, moving: false });
    }
  }
  // flies too, of course
  buildFlies2([[cw(9), 1, cw(2.5)], [cw(14.5), 0.8, cw(10)], [cw(11), 0.9, cw(13.5)]]);
  // hiding places
  wardrobe2(cw(8), 3.0, 0, 'wardrobe');
  blockCell(8, 1);
  wardrobe2(cw(20.5), cw(12.4), -Math.PI / 2, 'mildewed cabinet');
  blockCell(20, 12);
  // dead planters in the conservatory
  for (let i = 0; i < 4; i++) {
    const px = cw(16 + (i % 2) * 3), pz = cw(2 + Math.floor(i / 2) * 1.6);
    const planter = box(1.0, 0.5, 0.5, MAT.woodDark); planter.position.set(px, 0.25, pz); planter.castShadow = true; worldRoot.add(planter);
    addCollider(px, pz, 1.0, 0.5);
    for (let s = 0; s < 3; s++) {
      const stick = box(0.03, rand(0.4, 0.9), 0.03, MAT.woodDark);
      stick.position.set(px + rand(-0.4, 0.4), 0.6, pz + rand(-0.15, 0.15));
      stick.rotation.z = rand(-0.4, 0.4);
      worldRoot.add(stick);
    }
  }
  blockCell(16, 2); blockCell(19, 2);
  // glowing fungus in the dark corners
  const shroomMat = new THREE.MeshStandardMaterial({ color: 0x3a5c2c, emissive: 0x1c3a14, emissiveIntensity: 0.7, roughness: 1 });
  for (const [sx, sz] of [[cw(1) + 0.3, cw(4)], [cw(21) - 0.3, cw(9.4)], [cw(11), cw(15)], [cw(13) - 0.3, cw(4)]]) {
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(rand(0.04, 0.09), rand(0.1, 0.2), 6), shroomMat);
      sh.position.set(sx + rand(-0.3, 0.3), 0.07, sz + rand(-0.3, 0.3));
      worldRoot.add(sh);
    }
  }
  // apothecary shelving and the two vials
  const shelfA = box(3, 2.2, 0.4, MAT.woodDark); shelfA.position.set(cw(3), 1.1, CELL + 0.3); shelfA.castShadow = true; worldRoot.add(shelfA);
  addCollider(cw(3), CELL + 0.3, 3, 0.5); blockCell(2, 1); blockCell(3, 1); blockCell(4, 1);
  for (let i = 0; i < 9; i++) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, rand(0.12, 0.22), 8),
      new THREE.MeshStandardMaterial({ color: [0x4a5c38, 0x5c4a2a, 0x3a3f52][i % 3], roughness: 0.3 }));
    jar.position.set(cw(3) + rand(-1.3, 1.3), 1.0 + (i % 3) * 0.55, CELL + 0.32);
    worldRoot.add(jar);
  }
  const benchA = box(1.8, 0.85, 0.7, MAT.wood); benchA.position.set(cw(3), 0.42, cw(3.6)); benchA.castShadow = true; worldRoot.add(benchA);
  addCollider(cw(3), cw(3.6), 1.8, 0.7); blockCell(3, 3);
  addItem('venin', vialMesh(0xc03018), cw(3), 1.05, CELL + 0.34, 'Take the VENIN vial', () => {
    INV.venin = true; vialTaken('Venin');
  });
  addItem('remedy', vialMesh(0x30a050), cw(19), 0.64, cw(2), 'Take the REMEDY vial', () => {
    INV.remedy = true; vialTaken('Remedy');
  });
  // supplies for the brave
  const mk2 = (x, y, z) => addItem('med2' + (x | 0), medkitMesh(), x, y, z, 'Take the first aid kit', () => {
    INV.medkits++; toast('First Aid Kit (' + INV.medkits + ') — press Q to heal'); updateHud();
  });
  mk2(cw(2), 0.6, cw(12.4));
  mk2(cw(12.5), 0.9, cw(1.6));
  sealWorld(WH2);
  // and her, at home among it all
  worldRoot = WH2.group;
  buildWidow();
}
function vialMesh(color) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 10),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.2 }));
  glass.position.y = 0.09; g.add(glass);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 }));
  cork.position.y = 0.2; g.add(cork);
  return g;
}
function wardrobe2(x, z, ry, label) {
  const g = new THREE.Group();
  const bodyW = box(1.3, 2.3, 0.75, MAT.woodDark); bodyW.position.y = 1.15; g.add(bodyW);
  const dl = box(0.6, 2.1, 0.05, MAT.wood); dl.position.set(-0.33, 1.15, 0.4); g.add(dl);
  const dr = box(0.6, 2.1, 0.05, MAT.wood); dr.position.set(0.33, 1.15, 0.4); g.add(dr);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z); g.rotation.y = ry;
  worldRoot.add(g);
  const cs = Math.abs(Math.sin(ry)) > 0.5 ? [0.75, 1.3] : [1.3, 0.75];
  addCollider(x, z, cs[0], cs[1]);
  hideSpots.push({ x, z, ry, frontX: x + Math.sin(ry) * 0.9, frontZ: z + Math.cos(ry) * 0.9, label: label || 'wardrobe' });
}
function buildFlies2(spots) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  for (const [x, y, z] of spots) {
    const grp = new THREE.Group();
    const flies = [];
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), mat);
      grp.add(f);
      flies.push({ m: f, p: rand(7), r: rand(0.12, 0.4), h: rand(-0.08, 0.28), s: rand(3, 7), w: rand(2, 5) });
    }
    grp.position.set(x, y, z);
    worldRoot.add(grp);
    flySwarms.push({ x, y, z, flies });
  }
}
function vialTaken(name) {
  toast('Picked up: ' + name + ' vial (' + ((INV.venin ? 1 : 0) + (INV.remedy ? 1 : 0)) + '/2)');
  updateHud();
  noiseEvent(player.x, player.z, 60, true);
  if (INV.venin && INV.remedy) {
    setObjective('Slip out and get back to the camper');
    caption('Both vials. Somewhere in the house, the lantern light stops moving.', 4.5);
  } else {
    setObjective('Find the other vial (1/2)');
    caption('Glass chimes somewhere as you lift it. The lantern is coming.', 4);
  }
}

/* ---------------- doors between worlds ---------------- */
function enterWidowHouse() {
  if (ch2phase < 2) {
    AU.locked();
    caption('Chained shut. Whoever keeps calling that phone wants to talk to you first.', 4);
    return;
  }
  fadeSwap(() => {
    activateWorld(WH2);
    player.x = cw(11); player.z = cw(15); player.yaw = 0; player.pitch = 0;
    player.vx = player.vz = 0;
    AU.slam();
    if (!WH2.visited) {
      WH2.visited = true;
      caption('Her house — Crane’s WIFE lives here, and she keeps her rot the way he keeps his blood.', 5);
      setTimeout(() => { if (state === 'play') caption('Remember: she loves light. Flashlight OFF (F) when she is near.', 5); }, 5500);
    }
  });
}
function exitWidowHouse() {
  fadeSwap(() => {
    activateWorld(WF);
    player.x = 82.6; player.z = 40; player.yaw = Math.PI / 2; player.pitch = 0;
    player.vx = player.vz = 0;
    AU.slam();
  });
}

/* ---------------- video cutscenes (AI-generated clips) ---------------- */
const CUT_VIDS = {
  intro: [['assets/cutscenes/intro.webm', 'assets/cutscenes/intro.mp4']],
  escape: [['assets/cutscenes/escape.webm', 'assets/cutscenes/escape.mp4']],
  phone1: [['assets/cutscenes/phonecall1.webm', 'assets/cutscenes/phonecall1.mp4']],
};
let vidState = null;
function playVideoCutscene(key, onEnd) {
  const list = (window.HH_VIDEO_URLS && window.HH_VIDEO_URLS[key]) || CUT_VIDS[key];
  if (!list || !list.length) { onEnd(); return; }
  vidState = { list, i: 0, onEnd, done: false, watchdog: null };
  state = 'video';
  if (document.exitPointerLock) document.exitPointerLock();
  $('videoOv').classList.add('show');
  if (AU.ok) AU.master.gain.value = (muted ? 0 : volume) * 0.15;
  videoNext();
}
function videoNext() {
  const vs = vidState;
  if (!vs) return;
  clearTimeout(vs.watchdog);
  if (vs.i >= vs.list.length) { endVideoCutscene(); return; }
  const v = $('cutVideo');
  const sources = vs.list[vs.i++];
  v.innerHTML = '';
  for (const s of (Array.isArray(sources) ? sources : [sources])) {
    const el = document.createElement('source');
    el.src = s;
    v.appendChild(el);
  }
  v.load();
  // if a clip can't start (missing file, unsupported codec), move on
  vs.watchdog = setTimeout(() => { if (vidState === vs && v.readyState < 2) videoNext(); }, 4000);
  const p = v.play();
  if (p && p.catch) p.catch(() => {});
}
function endVideoCutscene() {
  const vs = vidState;
  if (!vs || vs.done) return;
  vs.done = true;
  clearTimeout(vs.watchdog);
  const v = $('cutVideo');
  try { v.pause(); } catch (err) { /* fine */ }
  v.innerHTML = ''; v.load();
  $('videoOv').classList.remove('show');
  if (AU.ok) AU.master.gain.value = muted ? 0 : volume;
  vidState = null;
  vs.onEnd();
}

/* ---------------- cutscenes ---------------- */
let cut = null;
const CS1 = [
  { who: '', text: 'You lift the receiver. Static — then a woman’s voice, calm and very tired.' },
  { who: 'THE WOMAN', text: '“You made it out of his house. Good. Now listen, because he is already looking for you.”' },
  { who: 'THE WOMAN', text: '“Your best friend Ash came to the estate three nights ago, searching for you. Crane caught them.”' },
  { who: 'THE WOMAN', text: '“What he does to the ones he keeps isn’t death. It’s worse. Ash is changing. The bite is in their blood.”' },
  { who: 'THE WOMAN', text: '“There is an antidote — two vials, the VENIN and the REMEDY. His wife brews both, in the crooked house across the river.”' },
  { who: 'THE WOMAN', text: '“She walks her halls with a lantern, and she loves light more than anything. Carry yours near her and she WILL find you. Walk dark.”' },
  { who: '', text: 'The road out of the estate is behind you. The crooked house is ahead.', choice: [
    { label: 'LEAVE THE ESTATE', say: 'You stare down the dark road for a long moment. …No. Ash came here because of you. You turn back toward the river.' },
    { label: 'FIND THE SERUM', say: 'You grip the receiver tighter. “Tell me exactly where the vials are.”' },
  ] },
  { who: '', text: 'The line clicks dead. Across the river, in a crooked window, a small warm light begins to move.' },
];
const CS2 = [
  { who: '', text: 'The phone is already ringing as you reach the clearing. You snatch it up.' },
  { who: 'CRANE', text: '“THOSE. ARE. MINE. Bring them back to my porch, little rabbit, and I will make it quick.”' },
  { who: '', text: 'A scuffle. A door slams somewhere on the line. The woman’s voice returns, breathless.' },
  { who: 'THE WOMAN', text: '“Ignore him — he can’t leave the house tonight. You have both vials? Truly?”' },
  { who: 'THE WOMAN', text: '“Then bring them to the old boathouse, south along the river. I’ll light the blue lamp. Come alone — Ash doesn’t have long.”' },
];
const CS3 = [
  { who: '', text: 'A hooded figure waits at the end of the dock, hands empty, no lantern anywhere near her.' },
  { who: 'THE WOMAN', text: '“You actually did it. Give them here — and hold your light steady for me.”' },
  { who: '', text: 'Venin into remedy, three drops, a slow swirl. The serum turns the colour of dawn.' },
  { who: 'THE WOMAN', text: '“Ash will live. I’ll take you to them now — the boat is faster than any road.”' },
  { who: 'THE WOMAN', text: '“But understand something, before you rest. Crane knows your face now.”' },
  { who: 'THE WOMAN', text: '“And he never stops hunting.”' },
];
function playCutscene(steps, onEnd) {
  cut = { steps, i: -1, onEnd, waitChoice: false, choiceDone: false };
  state = 'cutscene';
  if (document.exitPointerLock) document.exitPointerLock();
  $('cutOv').classList.add('show');
  cutNext();
}
function cutNext() {
  if (!cut) return;
  cut.i++;
  if (cut.i >= cut.steps.length) {
    $('cutOv').classList.remove('show');
    const cb = cut.onEnd; cut = null;
    state = 'play'; lockPointer();
    if (cb) cb();
    return;
  }
  const s = cut.steps[cut.i];
  $('cutSpeaker').textContent = s.who || '';
  $('cutLine').textContent = s.text;
  const cb = $('cutChoices');
  cb.innerHTML = '';
  cut.waitChoice = !!s.choice;
  cut.choiceDone = false;
  if (s.choice) {
    for (const c of s.choice) {
      const b = document.createElement('button');
      b.textContent = c.label;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        $('cutSpeaker').textContent = '';
        $('cutLine').textContent = c.say;
        cb.innerHTML = '';
        cut.choiceDone = true;
      });
      cb.appendChild(b);
    }
  }
  AU.noise(0.18, 1800, 0.05, 0.6);
}
function cutAdvance() {
  if (!cut) return;
  if (cut.waitChoice && !cut.choiceDone) return;
  cut.waitChoice = false;
  cutNext();
}

/* ---------------- chapter flow ---------------- */
function startChapter2() {
  if (chapter !== 1) return;
  chapter = 2; ch2phase = 1;
  killer.active = false;
  hideOverlays();
  if (document.exitPointerLock) document.exitPointerLock();
  playVideoCutscene('escape', chapter2Card);
}
function chapter2Card() {
  state = 'chapter';
  $('chapterTitle').textContent = 'CHAPTER TWO';
  $('chapterSub').textContent = 'THE ESTATE';
  $('chapterCard').classList.add('show');
  if (document.exitPointerLock) document.exitPointerLock();
  AU.thunder();
  setTimeout(() => {
    if (!WF) { WF = { group: new THREE.Group() }; WH2 = { group: new THREE.Group() }; buildTextures2(); buildForest(); buildWidowHouse(); }
    activateWorld(WF);
    player.x = 14; player.z = 12; player.yaw = Math.PI; player.pitch = 0;
    player.vx = player.vz = 0;
    player.health = Math.max(player.health, 70);
    setObjective('Follow the lantern-posts to the camper by the river');
    updateHud();
  }, 1000);
  setTimeout(() => {
    $('chapterCard').classList.remove('show');
    state = 'play'; lockPointer();
    caption('The rain has stopped. Dawn is close. Behind you, the Hollow House goes very quiet.', 5);
    setTimeout(() => { if (state === 'play') caption('Birdsong — and a warm little light waiting between the pines.', 4.5); }, 5600);
  }, 3600);
}
function startRinging() {
  phoneRinging = true; phoneRingT = 0;
  caption('Somewhere ahead, an old telephone begins to ring.', 3.5);
}
function answerPhone() {
  if (phoneHandT >= 0) return;
  if (!phoneRinging) { caption('The phone sits silent. Cozy out here, almost. Almost.', 3); return; }
  phoneRinging = false;
  // your bruised hand reaches out and lifts the receiver
  phoneHandT = 0;
  AU.noise(0.06, 1200, 0.12, 2);
  const phase = ch2phase;
  phoneHandNext = () => {
    if (phase === 1) {
      // what she tells you about Ash, shown before the words
      playVideoCutscene('phone1', () => playCutscene(CS1, () => {
        ch2phase = 2;
        setObjective('Cross the river — find the VENIN and REMEDY vials in the Widow’s house');
        openBridge();
        updateHud();
      }));
    } else if (phase === 2) {
      playCutscene(CS2, () => {
        ch2phase = 3;
        setObjective('Bring the serum to the boathouse, south along the river');
        if (WF.beacon) { WF.beacon.intensity = 1.4; WF.beaconGlow.material.color.setHex(0x6fd0ff); }
        WF.marks.push({ t: '⛵', x: 63, z: 66 });
        caption('Far down the riverbank, a cold blue lamp flickers on.', 4);
      });
    }
  };
}
function openBridge() {
  if (!WF || !WF.bridgeLog) return;
  const ci = WF.colliders.indexOf(WF.logCollider);
  if (ci >= 0) WF.colliders.splice(ci, 1);
  const ii = WF.interactables.indexOf(WF.logInter);
  if (ii >= 0) WF.interactables.splice(ii, 1);
  WF.bridgeLog.position.set(56.2, 0.32, 44.6);
  WF.bridgeLog.rotation.y = 1.1;
  caption('On the way to the bridge you wedge a shoulder under the fallen pine and heave it aside.', 4.5);
}
function endChapter2() {
  state = 'win';
  const t = Math.floor((performance.now() - startTime) / 1000);
  $('winTitle').textContent = 'CHAPTER TWO COMPLETE';
  $('winText').textContent = 'The serum glows the colour of dawn as the boat pulls away from the dock. Ash will live. Behind the pines, a door slams — Crane knows your face now, and he never stops hunting.';
  $('winStats').textContent = 'Time: ' + Math.floor(t / 60) + 'm ' + (t % 60) + 's · Deaths: ' + deaths + ' · To be continued…';
  showOverlay('winOv');
  if (document.exitPointerLock) document.exitPointerLock();
  AU.thunder();
}

/* ---------------- per-frame chapter-two updates ---------------- */
function forestUpdate(dt) {
  if (curWorld !== WF || state !== 'play') return;
  // water drifts, mist breathes, birds wheel
  if (WF.waterMat) {
    WF.waterMat.map.offset.y -= dt * 0.55;
    WF.waterMat.map.offset.x = Math.sin(perfT * 0.6) * 0.02;
  }
  if (WF.foamMat) {
    WF.foamMat.map.offset.y -= dt * 0.95;
    WF.foamMat.map.offset.x = Math.sin(perfT * 0.9 + 2) * 0.03;
  }
  for (const m of WF.mists) {
    m.m.position.x = m.x + Math.sin(perfT * m.sp) * 2.2;
    m.m.material.opacity = 0.13 + Math.sin(perfT * m.sp * 1.7) * 0.04;
  }
  for (const b of WF.birds) {
    b.a += dt * b.s;
    b.g.position.set(b.cx + Math.cos(b.a) * b.r, b.h + Math.sin(b.a * 2.3) * 1.2, b.cz + Math.sin(b.a) * b.r);
    b.g.rotation.y = -b.a;
    const flap = Math.sin(perfT * 9 + b.r) * 0.6;
    b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
  }
  // phone logic
  if (ch2phase === 1 && !phoneRinging && dist2(player.x, player.z, WF.phone.x, WF.phone.z) < 26) startRinging();
  if (ch2phase === 2 && INV.venin && INV.remedy && !phoneRinging && dist2(player.x, player.z, WF.phone.x, WF.phone.z) < 14) startRinging();
  if (phoneRinging) {
    phoneRingT -= dt;
    if (phoneRingT <= 0) { phoneRingT = 3.4; AU.phone(panTo(WF.phone)); }
  }
  // the meeting
  if (ch2phase === 3 && dist2(player.x, player.z, 63, 66) < 3.4) {
    ch2phase = 4;
    playCutscene(CS3, endChapter2);
  }
}
function roachUpdate(dt) {
  const list = curWorld && curWorld.roaches;
  if (!list) return;
  for (const r of list) {
    r.t -= dt;
    if (r.t <= 0) {
      r.t = rand(0.4, 2.2);
      r.tx = r.hx + rand(-1.4, 1.4); r.tz = r.hz + rand(-1.4, 1.4);
      r.moving = Math.random() < 0.75;
    }
    if (r.moving) {
      const dx = r.tx - r.m.position.x, dz = r.tz - r.m.position.z;
      const dd = Math.hypot(dx, dz);
      if (dd > 0.05) {
        r.m.position.x += dx / dd * 1.3 * dt;
        r.m.position.z += dz / dd * 1.3 * dt;
        r.m.rotation.y = Math.atan2(dx, dz);
      } else r.moving = false;
    }
  }
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
    $('skipHold2').style.display = chapter === 1 ? '' : 'none';
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
  if (state === 'video' && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) { e.preventDefault(); videoNext(); return; }
  if (state === 'cutscene' && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); cutAdvance(); return; }
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
    if (handLensMat) handLensMat.color.setHex(player.flash ? 0xfff2d8 : 0x2a2a2a);
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
    $('skipHold2').style.display = chapter === 1 ? '' : 'none';
    if (document.exitPointerLock) document.exitPointerLock();
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

/* -------------------------------------------------------------- game flow */
function bindHold(btnId, fillId, seconds, cb) {
  const btn = $(btnId), fill = $(fillId);
  let t0 = null, raf = null, lastSec = -1;
  const cancel = () => {
    t0 = null; lastSec = -1;
    if (raf) cancelAnimationFrame(raf);
    fill.style.width = '0%';
  };
  const step = () => {
    if (t0 === null) return;
    const p = Math.min(1, (performance.now() - t0) / (seconds * 1000));
    fill.style.width = (p * 100) + '%';
    const sec = Math.floor(p * seconds);
    if (sec !== lastSec) { lastSec = sec; if (AU.ok) AU.tone(500 + sec * 120, 0.06, 'square', 0.06); }
    if (p >= 1) { cancel(); cb(); return; }
    raf = requestAnimationFrame(step);
  };
  const start = (e) => {
    e.preventDefault(); e.stopPropagation();
    AU.init();
    t0 = performance.now();
    step();
  };
  btn.addEventListener('mousedown', start);
  btn.addEventListener('touchstart', start);
  for (const ev of ['mouseup', 'mouseleave', 'touchend', 'touchcancel']) btn.addEventListener(ev, cancel);
}
function skipToChapter2() {
  if (chapter !== 1) return;
  AU.init();
  if (AU.ok) AU.master.gain.value = muted ? 0 : volume;
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
  hideOverlays();
  if (!startTime) startTime = performance.now();
  // chapter one is behind you — take its spoils with you
  INV.wolf = INV.owl = INV.serpent = true; INV.emblems = 3;
  INV.rustyKey = true; noteRead = true;
  INV.medkits = Math.max(INV.medkits, 2);
  player.health = 100; player.stamina = 100;
  player.dead = false;
  if (player.hidden) { player.hidden = false; player.hideSpot = null; $('hideSlats').style.opacity = 0; }
  flashlight.intensity = player.flash ? 2.6 : 0;
  updateHud();
  state = 'play';
  startChapter2();
}
function startGame() {
  AU.init();
  if (AU.ok) AU.master.gain.value = muted ? 0 : volume;
  if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
  hideOverlays();
  playVideoCutscene('intro', beginPlay);
}
function beginPlay() {
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
      updateHands(dt);
      killerUpdate(dt);
      npcUpdate(dt);
      updateFlies(dt);
      roachUpdate(dt);
      forestUpdate(dt);
      scareChecks();
      currentInteract = scanInteract();
      if (mapOpen) drawMap();
    } else {
      dieT += dt;
      if (handsGrp) handsGrp.visible = false;
      let iris = 0;
      if (dieMode === 'wife') {
        // she has you — lifted, clawed, and the world closes in
        const wg = NPCS.wife.g;
        const wdd = dist2(wg.position.x, wg.position.z, player.x, player.z);
        if (wdd > 0.55) {
          wg.position.x += (player.x - wg.position.x) / wdd * 6 * dt;
          wg.position.z += (player.z - wg.position.z) / wdd * 6 * dt;
        }
        wg.rotation.y = Math.atan2(player.x - wg.position.x, player.z - wg.position.z);
        if (dieT > 0.25 && dieSl < 1) { dieSl = 1; killClaw(); }
        if (dieT > 0.6 && dieSl < 2) { dieSl = 2; killClaw(); }
        if (dieT > 0.95 && dieSl < 3) { dieSl = 3; killClaw(); }
        if (dieT > 1.3 && dieSl < 4) { dieSl = 4; AU.crack(); }
        iris = clamp((dieT - 1.5) / 1.0, 0, 1);
        player.eye = lerp(player.eye, 1.5, clamp(dt * 4, 0, 1)); // held off the floor
        const dxw = wg.position.x - player.x, dzw = wg.position.z - player.z;
        player.yaw = angLerp(player.yaw, Math.atan2(-dxw, -dzw), clamp(dt * 8, 0, 1));
        camera.rotation.x = lerp(camera.rotation.x, -0.02, clamp(dt * 4, 0, 1));
        camera.rotation.z = lerp(camera.rotation.z, 0.12, clamp(dt * 4, 0, 1));
      } else {
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
        camera.rotation.x = lerp(camera.rotation.x, 0.15, clamp(dt * 3, 0, 1));
        camera.rotation.z = lerp(camera.rotation.z, 0.55, clamp(dt * 3, 0, 1));
      }
      camera.position.set(player.x, player.eye, player.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = player.yaw;
      drawKillFx(dt, iris);
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
buildEnvMap();
buildMaterials();
buildHands();
W1 = { group: new THREE.Group() };
beginWorld(W1, MAP1, ROOMS1);
W1.stalker = 'butcher';
W1.patrolKeys = PATROL_KEYS;
W1.envCfg = {
  fog: 0x04050a, fogD: 0.062, bg: 0x030407,
  hemiSky: 0x1c2740, hemiGround: 0x0a0806, hemiI: 0.26,
  sun: 0x30405e, sunI: 0.1, sunPos: [-8, 14, -12],
  storm: true, rain: 1, wind: 0, birds: false,
};
W1.exitMark = { x: 28, z: 29.4, label: 'EXIT ⇩' };
buildHouse();
buildItems();
buildKiller();
buildNpcs();
buildFlies();
sealWorld(W1);
activateWorld(W1);
drawScareFace('butcher');
grainLoop();
updateHud();
camera.position.set(player.x, 1.62, player.z);
camera.rotation.order = 'YXZ';
$('startBtn').addEventListener('click', startGame);
$('retryBtn').addEventListener('click', respawn);
$('resumeBtn').addEventListener('click', () => { hideOverlays(); state = 'play'; lockPointer(); });
$('restartBtn').addEventListener('click', () => location.reload());
$('noteClose').addEventListener('click', closeNote);
$('cutOv').addEventListener('click', cutAdvance);
$('cutVideo').addEventListener('ended', () => videoNext());
$('cutVideo').addEventListener('error', () => videoNext());
$('videoOv').addEventListener('click', () => videoNext());
bindHold('skipHold1', 'skipFill1', 5, skipToChapter2);
bindHold('skipHold2', 'skipFill2', 5, skipToChapter2);
showOverlay('title');
// debug/testing handle
window.HH = {
  player, killer, INV, frontDoor,
  getState: () => state,
  getChapter: () => chapter,
  getPhase: () => ch2phase,
  getWorld: () => (curWorld === W1 ? 'house1' : curWorld === WF ? 'forest' : 'widow'),
  startChapter2, enterWidowHouse2: () => { ch2phase = Math.max(ch2phase, 2); enterWidowHouse(); },
  answerPhone, cutAdvance,
  isRinging: () => phoneRinging,
  getLog: () => (WF && WF.bridgeLog ? { blocked: WF.colliders.indexOf(WF.logCollider) >= 0, x: +WF.bridgeLog.position.x.toFixed(1) } : null),
};
requestAnimationFrame((t) => { last = t; requestAnimationFrame(loop); });

})();
