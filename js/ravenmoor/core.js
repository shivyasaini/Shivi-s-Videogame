/* =====================================================================
   RAVENMOOR — core engine
   Renderer, sky + moon, lighting moods, input, the first-person player,
   your on-screen hands, ravens, glows, the HUD, and procedural audio.
   Everything else (characters, worlds, scenes, the story) builds on this.
   ===================================================================== */
(function () {
'use strict';
const RM = (window.RM = window.RM || {});

/* ------------------------------------------------------------ helpers */
const $ = (RM.$ = (id) => document.getElementById(id));
const clamp = (RM.clamp = (v, a, b) => (v < a ? a : v > b ? b : v));
const lerp = (RM.lerp = (a, b, t) => a + (b - a) * t);
const rand = (RM.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)));
RM.pick = (arr) => arr[(Math.random() * arr.length) | 0];
const TAU = (RM.TAU = Math.PI * 2);
RM.dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
RM.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
RM.store = {
  get(k, d) { try { const v = localStorage.getItem('rm_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rm_' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

/* ----------------------------------------------------------- renderer */
RM.quality = RM.store.get('quality', 'high');
const canvas = $('game');
const renderer = (RM.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = (RM.scene = new THREE.Scene());
const camera = (RM.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 700));
camera.rotation.order = 'YXZ';
scene.add(camera);

// your hands live in their own little scene, drawn on top, so they never poke through walls
const handScene = (RM.handScene = new THREE.Scene());
const handCam = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
handScene.add(handCam);

const fx = $('fx'); // 2D overlay: objective arrow, Blood Sight heartbeats
const fxg = fx.getContext('2d');

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, RM.quality === 'high' ? 1.75 : 1));
  renderer.setSize(w, h, false);
  camera.aspect = handCam.aspect = w / h;
  camera.updateProjectionMatrix(); handCam.updateProjectionMatrix();
  fx.width = w; fx.height = h;
  if (RM.onResize) RM.onResize();
}
addEventListener('resize', resize);

RM.setQuality = (q) => {
  RM.quality = q; RM.store.set('quality', q);
  renderer.shadowMap.enabled = q === 'high';
  scene.traverse((o) => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
  resize();
  RM.toast('Graphics: ' + q.toUpperCase());
};

/* ----------------------------------------------------------- textures */
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  if (!opts.linear) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  return t;
}
RM.canvasTex = canvasTex;
// sprinkle random dots for grit
RM.speckle = (g, w, h, n, colors, size = 2) => {
  for (let i = 0; i < n; i++) { g.fillStyle = RM.pick(colors); g.fillRect(Math.random() * w, Math.random() * h, rand(0.5, size), rand(0.5, size)); }
};
RM.retex = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); return c; };

const TEX = (RM.TEX = {});
TEX.glow = canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  r.addColorStop(0.5, 'rgba(255,255,255,0.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
TEX.flame = canvasTex(64, 128, (g, w, h) => {
  const r = g.createRadialGradient(w / 2, h * 0.68, 2, w / 2, h * 0.6, h * 0.45);
  r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(0.3, 'rgba(255,190,90,0.9)');
  r.addColorStop(0.7, 'rgba(230,90,20,0.35)'); r.addColorStop(1, 'rgba(200,40,0,0)');
  g.fillStyle = r; g.beginPath(); g.moveTo(w / 2, 4);
  g.quadraticCurveTo(w, h * 0.7, w / 2, h - 4); g.quadraticCurveTo(0, h * 0.7, w / 2, 4); g.fill();
});
TEX.moon = canvasTex(256, 256, (g, w) => {
  const c = w / 2;
  const r = g.createRadialGradient(c * 0.85, c * 0.8, 10, c, c, c * 0.92);
  r.addColorStop(0, '#fbfbff'); r.addColorStop(0.7, '#dfe4f2'); r.addColorStop(0.97, '#b9c2dc'); r.addColorStop(1, 'rgba(185,194,220,0)');
  g.fillStyle = r; g.beginPath(); g.arc(c, c, c * 0.92, 0, TAU); g.fill();
  for (let i = 0; i < 26; i++) {
    const a = rand(TAU), d = rand(c * 0.75), x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, s = rand(4, 22);
    g.fillStyle = `rgba(150,160,190,${rand(0.12, 0.35)})`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
});
TEX.fog = canvasTex(256, 256, (g, w) => {
  for (let i = 0; i < 60; i++) {
    const x = rand(w), y = rand(w), s = rand(20, 70);
    const r = g.createRadialGradient(x, y, 0, x, y, s);
    r.addColorStop(0, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    for (const ox of [-w, 0, w]) for (const oy of [-w, 0, w]) { g.save(); g.translate(ox, oy); g.fillRect(x - s, y - s, s * 2, s * 2); g.restore(); }
  }
}, { repeat: [1, 1] });

/* ------------------------------------------------------ sky & moods */
const skyMat = new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, glowDir: { value: new THREE.Vector3(0, 0.3, -1) }, glowCol: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform vec3 top, mid, bot, glowCol, glowDir; varying vec3 vP;',
    'void main(){',
    '  float h = vP.y;',
    '  vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.7)) : mix(mid, bot, clamp(-h * 4.0, 0.0, 1.0));',
    '  float g = max(dot(vP, normalize(glowDir)), 0.0);',
    '  c += glowCol * (pow(g, 6.0) * 0.55 + pow(g, 40.0) * 0.6);',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'].join('\n'),
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
sky.renderOrder = -10; scene.add(sky);

const starGeo = new THREE.BufferGeometry(); {
  const p = [];
  for (let i = 0; i < 1600; i++) {
    const u = Math.random(), v = rand(0.04, 1), a = u * TAU, y = v * v;
    const r = Math.sqrt(1 - y * y);
    p.push(Math.cos(a) * r * 480, y * 480, Math.sin(a) * r * 480);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
}
const starMat = new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 1, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); scene.add(stars);

const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.moon, fog: false, depthWrite: false, transparent: true }));
moon.scale.set(46, 46, 1); scene.add(moon);
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0x7f97ff, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.5 }));
moonHalo.scale.set(210, 210, 1); scene.add(moonHalo);
const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xfff2c0, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
sun.scale.set(160, 160, 1); scene.add(sun);

const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.5); scene.add(hemi);
const dirL = (RM.dirLight = new THREE.DirectionalLight(0xffffff, 1));
dirL.castShadow = true;
dirL.shadow.mapSize.set(2048, 2048);
dirL.shadow.camera.left = dirL.shadow.camera.bottom = -36;
dirL.shadow.camera.right = dirL.shadow.camera.top = 36;
dirL.shadow.camera.near = 1; dirL.shadow.camera.far = 140;
dirL.shadow.bias = -0.0006; dirL.shadow.normalBias = 0.03;
scene.add(dirL); scene.add(dirL.target);
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const handHemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8); handScene.add(handHemi);
const handDir = new THREE.DirectionalLight(0xffffff, 0.6); handDir.position.set(0.5, 1, 0.6); handScene.add(handDir);
const handWarm = new THREE.PointLight(0xffaa66, 0, 3); handWarm.position.set(0.3, 0.2, 0.2); handScene.add(handWarm);

// Each "mood" is a whole lighting setup. Scenes pick one, or blend two (sunrise, nightmare).
const ENVS = (RM.ENVS = {
  crypt:     { top: 0x000000, mid: 0x000000, bot: 0x000000, glow: 0x000000, stars: 0, moon: 0, sun: 0, fog: 0x06070d, fogD: 0.05, hs: 0x5c6ea8, hg: 0x140c12, hi: 0.55, dc: 0x9fb2ff, di: 0.0, exp: 1.25, warm: 0.6, dir: [0.25, 0.9, -0.3] },
  night:     { top: 0x03040c, mid: 0x131d3c, bot: 0x0b0d18, glow: 0x3a4a80, stars: 1, moon: 1, sun: 0, fog: 0x121b33, fogD: 0.02, hs: 0x5a74b8, hg: 0x1c1418, hi: 0.6, dc: 0xb0c2ff, di: 1.05, exp: 1.25, warm: 0.2, dir: [0.35, 0.42, -1] },
  twilight:  { top: 0x0a0c26, mid: 0x5c2848, bot: 0x1a0c18, glow: 0xb04a50, stars: 0.45, moon: 0.75, sun: 0, fog: 0x2a1a32, fogD: 0.019, hs: 0x8a70b0, hg: 0x2a1818, hi: 0.65, dc: 0xe0a8c8, di: 0.85, exp: 1.25, warm: 0.2, dir: [0.35, 0.42, -1] },
  day:       { top: 0x3f86dc, mid: 0xbfe0ff, bot: 0xe9e0c8, glow: 0xfff0c0, stars: 0, moon: 0, sun: 1, fog: 0xd6e4f2, fogD: 0.0075, hs: 0xdfefff, hg: 0x8a7a5a, hi: 1.0, dc: 0xfff0d0, di: 2.3, exp: 1.0, warm: 0, dir: [0.5, 0.85, 0.35] },
  dawn:      { top: 0x24356a, mid: 0xf28a52, bot: 0x5a3040, glow: 0xffb070, stars: 0.05, moon: 0.25, sun: 0.9, fog: 0x8a6670, fogD: 0.013, hs: 0xffc0a0, hg: 0x3a2a2a, hi: 0.95, dc: 0xffb070, di: 1.9, exp: 1.1, warm: 0, dir: [1, 0.14, -0.25] },
  nightmare: { top: 0x1a0000, mid: 0xa01010, bot: 0x2a0000, glow: 0xff3010, stars: 0, moon: 0, sun: 1, fog: 0x5a0c0c, fogD: 0.02, hs: 0xff6050, hg: 0x300000, hi: 0.8, dc: 0xff3a20, di: 1.6, exp: 1.1, warm: 0, dir: [0.5, 0.5, 0.35], sunCol: 0xff2a00 },
});
const _ca = new THREE.Color(), _cb = new THREE.Color();
const mixHex = (a, b, t) => _ca.setHex(a).lerp(_cb.setHex(b), t).getHex();
RM.blendEnv = (a, b, t) => {
  a = typeof a === 'string' ? ENVS[a] : a; b = typeof b === 'string' ? ENVS[b] : b;
  const o = {};
  for (const k in a) {
    if (k === 'dir') o.dir = a.dir.map((v, i) => lerp(v, b.dir[i], t));
    else if (['top', 'mid', 'bot', 'glow', 'fog', 'hs', 'hg', 'dc', 'sunCol'].includes(k)) o[k] = mixHex(a[k], b[k] !== undefined ? b[k] : a[k], t);
    else o[k] = lerp(a[k], b[k] !== undefined ? b[k] : a[k], t);
  }
  return o;
};
let env = ENVS.night;
const dirVec = new THREE.Vector3();
RM.setEnv = (e) => {
  env = typeof e === 'string' ? ENVS[e] : e;
  skyMat.uniforms.top.value.setHex(env.top); skyMat.uniforms.mid.value.setHex(env.mid); skyMat.uniforms.bot.value.setHex(env.bot);
  skyMat.uniforms.glowCol.value.setHex(env.glow);
  dirVec.set(env.dir[0], env.dir[1], env.dir[2]).normalize();
  skyMat.uniforms.glowDir.value.copy(dirVec);
  starMat.opacity = env.stars; stars.visible = env.stars > 0.01;
  moon.visible = moonHalo.visible = env.moon > 0.01; moon.material.opacity = env.moon; moonHalo.material.opacity = env.moon * 0.5;
  sun.visible = env.sun > 0.01; sun.material.opacity = env.sun; sun.material.color.setHex(env.sunCol || 0xfff2c0);
  sky.visible = env.top !== 0 || env.mid !== 0;
  scene.fog.color.setHex(env.fog); scene.fog.density = env.fogD;
  renderer.setClearColor(env.fog);
  hemi.color.setHex(env.hs); hemi.groundColor.setHex(env.hg); hemi.intensity = env.hi;
  dirL.color.setHex(env.dc); dirL.intensity = env.di; dirL.visible = env.di > 0.01;
  renderer.toneMappingExposure = env.exp;
  handHemi.color.setHex(env.hs); handHemi.groundColor.setHex(env.hg); handHemi.intensity = env.hi * 0.75 + 0.12;
  handDir.color.setHex(env.dc); handDir.intensity = env.di * 0.22 + 0.06;
  handWarm.intensity = env.warm;
  if (RM.onEnv) RM.onEnv(env);
};
RM.getEnv = () => env;

/* -------------------------------------------------------------- input */
const keys = (RM.keys = {});
RM.control = false;
RM.locked = false;
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  RM.AU.init();
  if (RM.onKey) RM.onKey(e);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.addEventListener('pointerlockchange', () => { RM.locked = document.pointerLockElement === canvas; });
RM.lockPointer = () => { if (canvas.requestPointerLock && !RM.locked) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* fine */ } } };
RM.unlockPointer = () => { if (document.exitPointerLock && RM.locked) document.exitPointerLock(); };
canvas.addEventListener('mousedown', (e) => {
  RM.AU.init();
  if (!RM.control) return;
  if (!RM.locked) RM.lockPointer();
  if (e.button === 0 && RM.onAttack) RM.onAttack();
});
addEventListener('mousemove', (e) => {
  if (!RM.locked || !RM.control) return;
  const p = RM.player, s = 0.0022 * RM.store.get('sens', 1);
  p.yaw -= e.movementX * s;
  p.pitch = clamp(p.pitch - e.movementY * s, -1.35, 1.35);
});

/* ------------------------------------------------------------- worlds */
// A "world" is a place (the crypt, the town). A scene borrows a world, adds actors, and plays out.
RM.worlds = {};
RM.worldDefs = {};
RM.defineWorld = (name, build) => { RM.worldDefs[name] = build; };
RM.world = null;
RM.actors = new THREE.Group(); scene.add(RM.actors);
RM.useWorld = (name) => {
  if (RM.world && RM.world.name === name) return RM.world;
  if (RM.world) scene.remove(RM.world.group);
  let w = RM.worlds[name];
  if (!w) {
    w = RM.worlds[name] = { name, group: new THREE.Group(), colliders: [], circles: [], updaters: [], data: {} };
    const prev = RM.world; RM.world = w;
    RM.worldDefs[name](w);
    RM.world = prev;
  }
  scene.add(w.group);
  RM.world = w;
  return w;
};
RM.addCollider = (x0, z0, x1, z1, tag) => {
  const c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), tag: tag || 'world' };
  (tag ? RM.sceneColliders : RM.world.colliders).push(c); return c;
};
RM.addCircle = (x, z, r, tag) => { const c = { x, z, r, tag: tag || 'world' }; (tag ? RM.sceneCircles : RM.world.circles).push(c); return c; };
RM.sceneColliders = []; RM.sceneCircles = [];
const _box = new THREE.Box3();
RM.solid = (obj, pad = 0, tag) => { obj.updateMatrixWorld(true); _box.setFromObject(obj); return RM.addCollider(_box.min.x - pad, _box.min.z - pad, _box.max.x + pad, _box.max.z + pad, tag); };

// sliding circle-vs-box collision
RM.collide = (x, z, r) => {
  const w = RM.world; if (!w) return [x, z];
  for (let pass = 0; pass < 2; pass++) {
    for (const list of [w.colliders, RM.sceneColliders]) for (const c of list) {
      if (c.off) continue;
      const nx = clamp(x, c.x0, c.x1), nz = clamp(z, c.z0, c.z1);
      const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); x = nx + (dx / d) * r; z = nz + (dz / d) * r; }
      else {
        const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z, m = Math.min(l, rr, t, b);
        if (m === l) x = c.x0 - r; else if (m === rr) x = c.x1 + r; else if (m === t) z = c.z0 - r; else z = c.z1 + r;
      }
    }
    for (const list of [w.circles, RM.sceneCircles]) for (const c of list) {
      if (c.off) continue;
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r;
      if (d < m && d > 1e-6) { x = c.x + (dx / d) * m; z = c.z + (dz / d) * m; }
    }
  }
  return [x, z];
};
// can a guard at A see point B? (walls block sight)
RM.clearLine = (ax, az, bx, bz) => {
  const w = RM.world; if (!w) return true;
  const dx = bx - ax, dz = bz - az;
  for (const list of [w.colliders, RM.sceneColliders]) for (const c of list) {
    if (c.off || c.seeThrough) continue;
    let t0 = 0, t1 = 1;
    const test = (p, q) => {
      if (Math.abs(p) < 1e-9) return q >= 0;
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    };
    if (test(-dx, ax - c.x0) && test(dx, c.x1 - ax) && test(-dz, az - c.z0) && test(dz, c.z1 - az) && t0 < t1 && t1 > 0.02 && t0 < 0.98) return false;
  }
  return true;
};

/* ------------------------------------------------------------- player */
const player = (RM.player = { x: 0, z: 0, yaw: 0, pitch: 0, eye: 1.62, crouch: false, speedMul: 1, vx: 0, vz: 0, bob: 0, dashT: 0, dashCd: 0, iframes: 0, moving: 0, sprinting: false, roll: 0, fovKick: 0 });
RM.placePlayer = (x, z, yaw = 0) => { player.x = x; player.z = z; player.yaw = yaw; player.pitch = 0; player.vx = player.vz = 0; };
let stepAcc = 0;
function updatePlayer(dt) {
  const p = player;
  const turn = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
  p.yaw += turn * 2.3 * dt;
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  p.crouch = !!(keys.KeyC || keys.ControlLeft);
  p.sprinting = !!((keys.ShiftLeft || keys.ShiftRight) && !p.crouch && f > 0 && RM.canSprint !== false);
  let spd = (p.crouch ? 1.55 : p.sprinting ? 6.2 : 3.3) * p.speedMul;
  const fx0 = -Math.sin(p.yaw), fz0 = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  let vx = fx0 * f + rx * s, vz = fz0 * f + rz * s;
  const len = Math.hypot(vx, vz); if (len > 1) { vx /= len; vz /= len; }
  const k = 1 - Math.exp(-dt * 12);
  p.vx = lerp(p.vx, vx * spd, k); p.vz = lerp(p.vz, vz * spd, k);
  // dash: a burst of speed with a moment of untouchability
  p.dashCd = Math.max(0, p.dashCd - dt); p.iframes = Math.max(0, p.iframes - dt);
  if (p.dashT > 0) {
    p.dashT -= dt;
    const dx = len > 0.1 ? vx : fx0, dz = len > 0.1 ? vz : fz0;
    p.vx = dx * 13; p.vz = dz * 13;
  }
  let nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
  [nx, nz] = RM.collide(nx, nz, 0.34);
  const moved = Math.hypot(nx - p.x, nz - p.z) / Math.max(dt, 1e-4);
  p.x = nx; p.z = nz;
  p.moving = moved;
  const eyeT = p.crouch ? 1.02 : 1.62;
  p.eye = lerp(p.eye, eyeT, 1 - Math.exp(-dt * 10));
  if (moved > 0.4) {
    p.bob += dt * moved * 2.2;
    stepAcc += moved * dt;
    if (stepAcc > (p.sprinting ? 1.6 : 1.25)) { stepAcc = 0; RM.AU.step(p.crouch ? 0.25 : p.sprinting ? 0.9 : 0.55); if (RM.onStep) RM.onStep(p.sprinting, p.crouch); }
  }
}
RM.dash = () => {
  const p = player;
  if (p.dashCd > 0) return false;
  p.dashT = 0.16; p.dashCd = 0.65; p.iframes = 0.3; p.fovKick = 8;
  RM.AU.whoosh(0.5);
  return true;
};
RM.forward = () => ({ x: -Math.sin(player.yaw), z: -Math.cos(player.yaw) });
// is a point roughly in front of the player?
RM.facing = (x, z, cone = 0.55) => {
  const f = RM.forward(), dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz) || 1;
  return (f.x * dx + f.z * dz) / d > cone;
};

/* -------------------------------------------------------- interaction */
RM.interacts = [];
RM.addInteract = (o) => { o.r = o.r || 1.6; RM.interacts.push(o); return o; };
let curInteract = null;
function updateInteract() {
  curInteract = null;
  if (!RM.control) { RM.prompt(''); return; }
  let best = 1e9;
  for (const o of RM.interacts) {
    if (o.off || (o.when && !o.when())) continue;
    const x = typeof o.x === 'function' ? o.x() : o.x, z = typeof o.z === 'function' ? o.z() : o.z;
    const d = RM.dist(player.x, player.z, x, z);
    if (d > o.r) continue;
    if (d > 0.9 && !RM.facing(x, z, 0.35)) continue;
    if (d < best) { best = d; curInteract = o; }
  }
  RM.prompt(curInteract ? '<b>E</b>  ' + (typeof curInteract.label === 'function' ? curInteract.label() : curInteract.label) : '');
}
RM.tryInteract = () => { if (curInteract && RM.control) { const o = curInteract; o.use(o); return true; } return false; };

/* ------------------------------------------------------ game-time timers */
RM.t = 0; RM.paused = false;
const timers = [];
RM.after = (s, fn) => { timers.push({ t: RM.t + s, fn }); };
RM.sleep = (s) => new Promise((r) => RM.after(s, r));
RM.ticks = []; // per-frame hooks: fn(dt) → return false to remove
RM.onTick = (fn) => RM.ticks.push(fn);

/* ------------------------------------------------------------ effects */
RM.flickers = [];
RM.glow = (x, y, z, color = 0xffaa55, scale = 1, opacity = 0.8, parent) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.set(x, y, z); s.scale.set(scale, scale, 1);
  (parent || RM.world.group).add(s);
  return s;
};
// a flame sprite + halo (+ optional real light) that flickers
RM.flame = (x, y, z, { size = 0.14, light = 0, color = 0xff9a4a, range = 7, parent } = {}) => {
  const par = parent || RM.world.group;
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flame, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  f.position.set(x, y + size * 0.7, z); f.scale.set(size, size * 2, 1); par.add(f);
  const halo = RM.glow(x, y + size * 0.6, z, color, size * 9, 0.45, par);
  let L = null;
  if (light > 0) { L = new THREE.PointLight(color, light, range, 1.8); L.position.set(x, y + size, z); par.add(L); }
  const fl = { f, halo, L, base: light, size, ph: rand(10) };
  RM.flickers.push(fl);
  return fl;
};
function updateFlickers(dt) {
  for (const fl of RM.flickers) {
    fl.ph += dt * (7 + Math.sin(fl.ph * 0.37) * 3);
    const n = 0.82 + Math.sin(fl.ph) * 0.08 + Math.sin(fl.ph * 2.7) * 0.06 + (Math.random() < 0.02 ? -0.2 : 0);
    fl.f.scale.set(fl.size * (0.9 + n * 0.1), fl.size * 2 * n, 1);
    fl.halo.material.opacity = 0.35 * n;
    if (fl.L) fl.L.intensity = fl.base * n;
  }
}
// soft drifting ground-mist planes
RM.mists = [];
RM.mist = (cx, cz, w, d, y = 0.4, opacity = 0.16, color = 0xaab8e0, parent) => {
  const t = RM.retex(TEX.fog, w / 14, d / 14);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(cx, y, cz); m.renderOrder = 2;
  (parent || RM.world.group).add(m);
  RM.mists.push({ m, t, sx: rand(-0.012, 0.012), sz: rand(0.004, 0.014) });
  return m;
};
// floating dust motes inside a box
RM.dust = (x0, y0, z0, x1, y1, z1, n = 200, color = 0xcfd6ff, size = 0.035, parent) => {
  const g = new THREE.BufferGeometry(), p = [];
  for (let i = 0; i < n; i++) p.push(rand(x0, x1), rand(y0, y1), rand(z0, z1));
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  (parent || RM.world.group).add(pts);
  (RM.world ? RM.world.updaters : RM.ticks).push((dt) => {
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + dt * 0.05, x = a.getX(i) + Math.sin(RM.t * 0.3 + i) * dt * 0.03;
      if (y > y1) y = y0;
      a.setXY(i, x, y);
    }
    a.needsUpdate = true;
  });
  return pts;
};
// a see-through shaft of light (fake god-rays)
RM.lightShaft = (x, y, z, rTop, rBot, h, color = 0x9fb4ff, opacity = 0.07, tilt = 0, parent) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 24, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.set(x, y, z); m.rotation.z = tilt; (parent || RM.world.group).add(m);
  return m;
};

/* -------------------------------------------------------------- ravens */
const ravenMat = new THREE.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.45, metalness: 0.2 });
const ravenBeak = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
const ravenEye = new THREE.MeshBasicMaterial({ color: 0xd8c060 });
const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(0.34, 0.06); wingShape.lineTo(0.42, -0.02); wingShape.lineTo(0.3, -0.1); wingShape.lineTo(0.05, -0.14); wingShape.lineTo(0, -0.08);
const wingGeo = new THREE.ShapeGeometry(wingShape); wingGeo.rotateX(-Math.PI / 2);
const ravenBodyGeo = new THREE.SphereGeometry(0.1, 10, 8); ravenBodyGeo.scale(0.75, 0.7, 1.6);
const ravenHeadGeo = new THREE.SphereGeometry(0.06, 10, 8);
const ravenBeakGeo = new THREE.ConeGeometry(0.022, 0.09, 6); ravenBeakGeo.rotateX(-Math.PI / 2);
const ravenTailGeo = new THREE.ConeGeometry(0.06, 0.18, 4); ravenTailGeo.rotateX(Math.PI / 2); ravenTailGeo.scale(1.3, 0.3, 1);
RM.makeRaven = (scale = 1) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(ravenBodyGeo, ravenMat); g.add(body);
  const head = new THREE.Mesh(ravenHeadGeo, ravenMat); head.position.set(0, 0.06, -0.15); g.add(head);
  const beak = new THREE.Mesh(ravenBeakGeo, ravenBeak); beak.position.set(0, 0.05, -0.23); g.add(beak);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), ravenEye); e.position.set(sx * 0.035, 0.075, -0.19); g.add(e); }
  const tail = new THREE.Mesh(ravenTailGeo, ravenMat); tail.position.set(0, 0.0, 0.2); g.add(tail);
  const wl = new THREE.Group(), wr = new THREE.Group();
  const ml = new THREE.Mesh(wingGeo, ravenMat); ml.scale.x = -1; wl.add(ml);
  const mr = new THREE.Mesh(wingGeo, ravenMat); wr.add(mr);
  ravenMat.side = THREE.DoubleSide;
  wl.position.set(-0.05, 0.03, -0.05); wr.position.set(0.05, 0.03, -0.05);
  g.add(wl, wr);
  g.userData = { wl, wr, head };
  wl.rotation.set(0.15, 1.35, 0); wr.rotation.set(0.15, -1.35, 0);
  g.scale.setScalar(scale);
  body.castShadow = true;
  return g;
};
RM.ravens = [];
RM.addRaven = (x, y, z, o = {}) => {
  const m = RM.makeRaven(o.scale || rand(0.9, 1.15));
  m.position.set(x, y, z); m.rotation.y = o.yaw !== undefined ? o.yaw : rand(TAU);
  (o.parent || RM.actors).add(m);
  const r = { m, state: o.perched === false ? 'circle' : 'perch', cx: o.cx || x, cy: o.cy || y + 6, cz: o.cz || z, rad: o.rad || rand(6, 14), ang: rand(TAU), spd: rand(0.35, 0.6), ph: rand(10), vy: 0, flee: o.flee !== false, life: 0 };
  RM.ravens.push(r);
  return r;
};
RM.addFlock = (cx, cy, cz, n, rad = 10, parent) => { for (let i = 0; i < n; i++) RM.addRaven(cx, cy + rand(-3, 3), cz, { perched: false, cx, cy: cy + rand(-3, 4), cz, rad: rad * rand(0.5, 1.2), parent }); };
RM.scareRavens = (x, z, radius) => { for (const r of RM.ravens) if (r.state === 'perch' && RM.dist(x, z, r.m.position.x, r.m.position.z) < radius) takeOff(r); };
function takeOff(r) {
  r.state = 'flee'; r.vy = rand(2.5, 4); r.life = 0;
  const a = Math.atan2(r.m.position.x - player.x, r.m.position.z - player.z) + rand(-0.6, 0.6);
  r.fx = Math.sin(a) * rand(4, 7); r.fz = Math.cos(a) * rand(4, 7);
  if (Math.random() < 0.5) RM.AU.caw(0.35);
  RM.AU.flap(0.3);
}
function updateRavens(dt) {
  for (let i = RM.ravens.length - 1; i >= 0; i--) {
    const r = RM.ravens[i], m = r.m, u = m.userData;
    r.ph += dt;
    if (r.state === 'perch') {
      u.wl.rotation.set(0.15, 1.35, 0); u.wr.rotation.set(0.15, -1.35, 0);
      u.head.rotation.y = Math.sin(r.ph * 0.7) > 0.6 ? 0.6 : Math.sin(r.ph * 0.7) < -0.6 ? -0.6 : 0;
      m.position.y += Math.sin(r.ph * 5) * 0.0006;
      if (r.flee && RM.control && RM.dist(player.x, player.z, m.position.x, m.position.z) < (player.sprinting ? 7 : player.crouch ? 2.4 : 4.5)) takeOff(r);
      if (Math.random() < dt * 0.02 && RM.dist(player.x, player.z, m.position.x, m.position.z) < 25) RM.AU.caw(0.12);
    } else {
      const flap = Math.sin(r.ph * 16) * 0.9;
      u.wl.rotation.set(0, 0, flap); u.wr.rotation.set(0, 0, -flap);
      if (r.state === 'flee') {
        r.life += dt;
        m.position.x += r.fx * dt; m.position.z += r.fz * dt; m.position.y += r.vy * dt;
        m.rotation.y = Math.atan2(-r.fx, -r.fz);
        if (r.life > 7) { m.parent && m.parent.remove(m); RM.ravens.splice(i, 1); }
      } else {
        r.ang += r.spd * dt * (8 / r.rad);
        const x = r.cx + Math.cos(r.ang) * r.rad, z = r.cz + Math.sin(r.ang) * r.rad, y = r.cy + Math.sin(r.ang * 2 + r.ph * 0.1) * 1.2;
        m.rotation.y = Math.atan2(-(x - m.position.x), -(z - m.position.z));
        m.position.set(x, y, z);
        u.wl.rotation.z = r.ph % 3 < 1 ? flap : 0.35; u.wr.rotation.z = -u.wl.rotation.z;
      }
    }
  }
}
RM.clearRavens = () => { for (const r of RM.ravens) r.m.parent && r.m.parent.remove(r.m); RM.ravens.length = 0; };

/* --------------------------------------------------------------- hands */
const hands = (RM.hands = { group: new THREE.Group(), anim: null, animT: 0, visible: true, reach: 0 });
handCam.add(hands.group); hands.group.scale.setScalar(0.78);
{
  const skin = (hands.skin = new THREE.MeshStandardMaterial({ color: 0xe0b090, roughness: 0.6 }));
  const sleeve = (hands.sleeve = new THREE.MeshStandardMaterial({ color: 0x3a2a30, roughness: 0.9 }));
  const nail = (hands.nail = new THREE.MeshStandardMaterial({ color: 0x3a2a2a, roughness: 0.3, metalness: 0.2 }));
  const cuff = (hands.cuff = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.8 }));
  const mk = (side) => {
    const arm = new THREE.Group(), claws = [];
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.066, 0.46, 12), sleeve); fore.rotation.x = Math.PI / 2; fore.position.z = 0.2; arm.add(fore);
    const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 12), cuff); cf.rotation.x = Math.PI / 2; cf.position.z = -0.02; arm.add(cf);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.1, 10), skin); wrist.rotation.x = Math.PI / 2; wrist.position.z = -0.07; arm.add(wrist);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.032, 0.1), skin); palm.position.z = -0.155; arm.add(palm);
    for (let i = 0; i < 4; i++) {
      const fg = new THREE.Group(); fg.position.set(-0.03 + i * 0.02, 0, -0.2); fg.rotation.x = -0.35 - i * 0.04;
      const len = [0.07, 0.08, 0.076, 0.062][i];
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.018, len), skin); f.position.z = -len / 2; fg.add(f);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 5), nail); c.rotation.x = -Math.PI / 2; c.position.z = -len - 0.01; fg.add(c); claws.push(c);
      arm.add(fg);
    }
    const th = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.06), skin); th.position.set(side * -0.05, 0.005, -0.15); th.rotation.y = side * 0.7; arm.add(th);
    arm.userData = { claws, baseX: side * 0.22, side };
    arm.scale.x = side < 0 ? -1 : 1;
    hands.group.add(arm);
    return arm;
  };
  hands.L = mk(-1); hands.R = mk(1);
}
// look = character look; vamp = { pale, fang, blood } from the story
hands.setLook = (skinHex, sleeveHex, clawLen = 0, bloody = 0) => {
  hands.skin.color.set(skinHex).convertSRGBToLinear();
  hands.sleeve.color.set(sleeveHex).convertSRGBToLinear();
  for (const a of [hands.L, hands.R]) for (const c of a.userData.claws) c.scale.set(1, 0.6 + clawLen * 1.3, 1);
  hands.nail.color.setHex(bloody > 0.5 ? 0x5a0a0a : 0x2a2224);
};
hands.play = (name) => { hands.anim = name; hands.animT = 0; };
function updateHands(dt) {
  const g = hands.group;
  g.visible = hands.visible && RM.control;
  hands.animT += dt;
  const p = player, bob = Math.sin(p.bob * 2) * 0.012 * clamp(p.moving / 3, 0, 1.5), sway = Math.sin(RM.t * 1.3) * 0.004;
  const t = hands.animT;
  for (const arm of [hands.L, hands.R]) {
    const s = arm.userData.side;
    let x = s * 0.25, y = -0.3 + bob * (s > 0 ? 1 : -1) + sway, z = -0.5, rx = 0.2, ry = s * -0.22, rz = 0;
    if (hands.anim === 'claw' && s > 0 && t < 0.35) { const k = Math.sin((t / 0.35) * Math.PI); x -= 0.18 * k; y += 0.08 * k; z -= 0.22 * k; ry += 0.8 * k; rz -= 0.5 * k; }
    if (hands.anim === 'claw2' && s < 0 && t < 0.35) { const k = Math.sin((t / 0.35) * Math.PI); x += 0.18 * k; y += 0.08 * k; z -= 0.22 * k; ry -= 0.8 * k; rz += 0.5 * k; }
    if (hands.anim === 'reach') { const k = Math.min(1, t * 3); x *= 1 - 0.45 * k; y += 0.1 * k; z -= 0.12 * k; rx += 0.2 * k; }
    if (hands.anim === 'pounce' && t < 0.4) { const k = Math.sin((t / 0.4) * Math.PI); y += 0.05 * k; z -= 0.3 * k; x *= 1 - 0.3 * k; rx -= 0.3 * k; }
    if (hands.anim === 'shake') { x += Math.sin(t * 40 + s) * 0.006; y += Math.cos(t * 37) * 0.006; }
    if (hands.anim === 'hide' ) { const k = Math.min(1, t * 3); y -= 0.3 * k; }
    arm.position.set(lerp(arm.position.x, x, 0.5), lerp(arm.position.y, y, 0.5), lerp(arm.position.z, z, 0.5));
    arm.rotation.set(rx, ry, rz);
  }
}

/* ----------------------------------------------------------------- HUD */
let capT = 0, toastT = 0;
RM.setObjective = (t) => { const o = $('objective'); o.innerHTML = t || ''; o.classList.toggle('show', !!t); };
RM.prompt = (t) => { const p = $('prompt'); if (p._t !== t) { p._t = t; p.innerHTML = t; p.classList.toggle('show', !!t); } };
RM.caption = (t, secs = 4) => { const c = $('caption'); c.innerHTML = t; c.classList.add('show'); capT = secs; };
RM.toast = (t, secs = 2.2) => { const c = $('toast'); c.innerHTML = t; c.classList.add('show'); toastT = secs; };
RM.bar = (id, v, label) => {
  const w = $(id + 'Wrap'); if (!w) return;
  if (v === null || v === undefined) { w.classList.remove('show'); return; }
  w.classList.add('show'); $(id + 'Fill').style.width = clamp(v, 0, 100) + '%';
  if (label) $(id + 'Label').textContent = label;
};
RM.flash = (color = 'rgba(160,0,0,0.6)', ms = 450) => {
  const f = $('flash'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = 1;
  requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms ease-out`; f.style.opacity = 0; });
};
let shakeAmt = 0, shakeT = 0;
RM.shake = (amt = 0.05, secs = 0.3) => { shakeAmt = Math.max(shakeAmt, amt); shakeT = Math.max(shakeT, secs); };
RM.fade = (to, secs = 1) => new Promise((res) => {
  const f = $('fade'); f.style.transition = `opacity ${secs}s ease`; f.style.opacity = to;
  setTimeout(res, secs * 1000 + 30);
});
RM.card = (title, sub, secs = 3.2) => new Promise((res) => {
  const c = $('card'); $('cardTitle').textContent = title; $('cardSub').textContent = sub || '';
  c.classList.add('show'); RM.AU.boom();
  setTimeout(() => { c.classList.remove('show'); setTimeout(res, 900); }, secs * 1000);
});
RM.canvasFilter = (f) => { canvas.style.filter = f || ''; };

/* -------------------------------------------------- screen-space overlays */
const _v = new THREE.Vector3();
RM.project = (x, y, z) => {
  _v.set(x, y, z).project(camera);
  const behind = _v.z > 1;
  return { x: (_v.x * 0.5 + 0.5) * fx.width, y: (-_v.y * 0.5 + 0.5) * fx.height, on: !behind && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1, behind };
};
RM.marker = null;
RM.setMarker = (x, z, label) => {
  RM.marker = x === null || x === undefined ? null : { x, z, label: label || '' };
  if (!beacon.parent) scene.add(beacon);
  beacon.visible = !!RM.marker;
  if (RM.marker) beacon.position.set(x, 0, z);
};
const beacon = new THREE.Group();
{
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xc41a30, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  col.position.y = 4.5; beacon.add(col);
  const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xff3048, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  b.scale.set(1.6, 1.6, 1); b.position.y = 0.4; beacon.add(b);
  beacon.visible = false;
}
RM.fxHooks = [];
RM.heartTargets = []; // objects {pos: Vector3|fn, strong} shown by Blood Sight
RM.bloodSight = 0;
function drawFx() {
  const w = fx.width, h = fx.height;
  fxg.clearRect(0, 0, w, h);
  // Blood Sight: glowing heartbeats through walls
  if (RM.bloodSight > 0.02) {
    const beat = Math.pow(Math.max(0, Math.sin(RM.t * 7.5)), 8);
    for (const t of RM.heartTargets) {
      const p = typeof t.pos === 'function' ? t.pos() : t.pos; if (!p) continue;
      const s = RM.project(p.x, p.y, p.z); if (!s.on) continue;
      const d = RM.dist(player.x, player.z, p.x, p.z), a = RM.bloodSight * clamp(1.4 - d / 40, 0.15, 1);
      const r = (14 + beat * 10) * clamp(12 / d, 0.4, 2);
      const gr = fxg.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.4);
      gr.addColorStop(0, `rgba(255,40,50,${a})`); gr.addColorStop(0.35, `rgba(200,0,20,${a * 0.55})`); gr.addColorStop(1, 'rgba(120,0,0,0)');
      fxg.fillStyle = gr; fxg.beginPath(); fxg.arc(s.x, s.y, r * 2.4, 0, TAU); fxg.fill();
      if (t.label) { fxg.fillStyle = `rgba(255,190,190,${a})`; fxg.font = '13px Georgia'; fxg.textAlign = 'center'; fxg.fillText(t.label, s.x, s.y - r * 2.4 - 4); }
    }
  }
  // objective arrow when the marker is off screen
  if (RM.marker && RM.control) {
    const s = RM.project(RM.marker.x, 1.2, RM.marker.z);
    if (!s.on) {
      const cx = w / 2, cy = h / 2;
      const f = RM.forward(), dx = RM.marker.x - player.x, dz = RM.marker.z - player.z;
      const ang = Math.atan2(f.x * dz - f.z * dx, f.x * dx + f.z * dz); // + = to the right
      const ax = cx + Math.sin(ang) * Math.min(w, h) * 0.38, ay = cy - Math.cos(ang) * Math.min(w, h) * 0.38;
      fxg.save(); fxg.translate(ax, ay); fxg.rotate(ang);
      fxg.fillStyle = 'rgba(230,50,70,0.75)'; fxg.beginPath(); fxg.moveTo(0, -14); fxg.lineTo(10, 8); fxg.lineTo(0, 3); fxg.lineTo(-10, 8); fxg.closePath(); fxg.fill();
      fxg.restore();
    }
  }
  for (const f of RM.fxHooks) f(fxg, w, h);
}

/* ----------------------------------------------------------------- audio */
const AU = (RM.AU = { ctx: null, vol: RM.store.get('vol', 0.8), muted: false });
// silent stand-ins until the browser lets us start audio (after your first click or key)
const quiet = () => ({ set() {}, chord() {}, g: { gain: { value: 0 } }, f: { frequency: {} } });
AU.wind = quiet(); AU.sizzleN = quiet(); AU.breathN = quiet(); AU.drinkN = quiet(); AU.choir = quiet(); AU.organ = quiet();
AU.init = () => {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const ctx = (AU.ctx = new C());
  AU.master = ctx.createGain(); AU.master.gain.value = AU.vol;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  AU.master.connect(comp); comp.connect(ctx.destination);
  // one shared reverb for that big-stone-room echo
  const len = ctx.sampleRate * 3, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  AU.verb = ctx.createConvolver(); AU.verb.buffer = ir;
  AU.wet = ctx.createGain(); AU.wet.gain.value = 0.5; AU.verb.connect(AU.wet); AU.wet.connect(AU.master);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  AU.noiseBuf = nb;
  // wind bed
  AU.wind = loopNoise('lowpass', 420, 0.7, 0);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 220; lfo.connect(lg); lg.connect(AU.wind.f.frequency); lfo.start();
  AU.sizzleN = loopNoise('highpass', 3200, 0.6, 0);
  AU.breathN = loopNoise('bandpass', 380, 1.6, 0);
  AU.drinkN = loopNoise('lowpass', 520, 1, 0);
  AU.choir = makePad('sawtooth', [[700, 7], [1150, 9], [2500, 12]], 0);
  AU.organ = makePad('triangle', [[1600, 0.5]], 0);
  AU.setMusic(AU._music || null);
  AU.wind.set(AU._wind || 0.05, 1);
  if (AU.onReady) AU.onReady();
};
function out(node, reverb = 0.25) {
  node.connect(AU.master);
  if (reverb > 0) { const s = AU.ctx.createGain(); s.gain.value = reverb; node.connect(s); s.connect(AU.verb); }
}
function loopNoise(type, freq, q, vol) {
  const ctx = AU.ctx, src = ctx.createBufferSource(); src.buffer = AU.noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); out(g, 0.2); src.start();
  return { src, f, g, set(v, t = 0.3) { g.gain.setTargetAtTime(v, ctx.currentTime, t); } };
}
// a sustained chord voice: formant filters for the choir, a soft organ for the title
function makePad(type, formants, vol) {
  const ctx = AU.ctx, g = ctx.createGain(); g.gain.value = vol;
  const bus = ctx.createGain(); bus.gain.value = 0.18;
  for (const [f, q] of formants) {
    const bp = ctx.createBiquadFilter(); bp.type = formants.length > 1 ? 'bandpass' : 'lowpass'; bp.frequency.value = f; bp.Q.value = q;
    bus.connect(bp); bp.connect(g);
  }
  out(g, 0.9);
  const voices = [];
  for (let i = 0; i < 4; i++) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = 220;
    const o2 = ctx.createOscillator(); o2.type = type; o2.frequency.value = 220; o2.detune.value = 9;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 4.6 + i * 0.3; vg.gain.value = 3; vib.connect(vg); vg.connect(o.detune);
    o.connect(bus); o2.connect(bus); o.start(); o2.start(); vib.start();
    voices.push([o, o2]);
  }
  return {
    g, voices,
    chord(freqs, glide = 0.8) { voices.forEach(([o, o2], i) => { const f = freqs[i % freqs.length]; o.frequency.setTargetAtTime(f, ctx.currentTime, glide * 0.3); o2.frequency.setTargetAtTime(f, ctx.currentTime, glide * 0.3); }); },
    set(v, t = 0.8) { g.gain.setTargetAtTime(v, ctx.currentTime, t); },
  };
}
AU.tone = (freq, dur, type = 'sine', vol = 0.3, delay = 0, endFreq, reverb = 0.25) => {
  if (!AU.ctx) return;
  const ctx = AU.ctx, t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); out(g, reverb); o.start(t); o.stop(t + dur + 0.05);
};
AU.noise = (dur, vol = 0.3, type = 'bandpass', freq = 1000, q = 1, delay = 0, reverb = 0.25, endFreq) => {
  if (!AU.ctx) return;
  const ctx = AU.ctx, t = ctx.currentTime + delay, s = ctx.createBufferSource(); s.buffer = AU.noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); out(g, reverb); s.start(t, Math.random()); s.stop(t + dur + 0.05);
};
AU.step = (v) => AU.noise(0.08, 0.06 * v, 'lowpass', rand(300, 600), 1, 0, 0.15);
AU.caw = (v = 0.3) => { for (let i = 0; i < (Math.random() < 0.5 ? 2 : 3); i++) { const d = i * 0.28; AU.tone(rand(470, 540), 0.2, 'sawtooth', v * 0.25, d, 330, 0.5); AU.noise(0.18, v * 0.2, 'bandpass', 1300, 3, d, 0.5); } };
AU.flap = (v = 0.3) => { for (let i = 0; i < 6; i++) AU.noise(0.07, v * 0.3, 'lowpass', 700, 1, i * 0.09, 0.1); };
AU.squeak = () => { AU.tone(rand(2600, 3200), 0.08, 'sine', 0.12, 0, 3800, 0.2); AU.tone(rand(2800, 3300), 0.07, 'sine', 0.1, 0.11, 3600, 0.2); };
AU.scratch = (v = 0.4) => { for (let i = 0; i < 7; i++) AU.noise(rand(0.05, 0.14), v * rand(0.4, 1), 'bandpass', rand(1800, 3800), 4, i * rand(0.07, 0.16), 0.3); };
AU.thud = (v = 0.6) => { AU.tone(70, 0.5, 'sine', v, 0, 40, 0.4); AU.noise(0.25, v * 0.5, 'lowpass', 400, 1, 0, 0.4); };
AU.clang = (v = 0.5) => { for (const f of [311, 467, 733, 1123]) AU.tone(f * rand(0.98, 1.02), 1.4, 'square', v * 0.05, 0, f * 0.97, 0.6); AU.noise(0.12, v * 0.6, 'highpass', 1800, 1, 0, 0.5); };
AU.whoosh = (v = 0.4) => AU.noise(0.28, v * 0.4, 'bandpass', 600, 1.4, 0, 0.1, 2400);
AU.hit = (v = 0.5) => { AU.noise(0.12, v * 0.7, 'lowpass', 1200, 1, 0, 0.2); AU.tone(140, 0.18, 'triangle', v * 0.3, 0, 60, 0.2); };
AU.bell = (v = 0.5) => { for (const [m, a] of [[1, 1], [2.0, 0.6], [2.4, 0.5], [3.0, 0.35], [4.16, 0.25], [5.43, 0.15]]) AU.tone(196 * m, 5, 'sine', v * 0.15 * a, 0, 196 * m * 0.999, 0.9); };
AU.sting = (v = 0.7) => { for (const f of [92, 97.5, 138, 146, 196, 207]) AU.tone(f, 1.8, 'sawtooth', v * 0.07, 0, f * 0.9, 0.8); AU.noise(1.2, v * 0.4, 'bandpass', 900, 0.8, 0, 0.8, 200); };
AU.boom = (v = 0.5) => { AU.tone(55, 2.6, 'sine', v * 0.7, 0, 32, 0.8); AU.noise(1.5, v * 0.25, 'lowpass', 300, 1, 0, 0.9); };
AU.whisper = (v = 0.3) => { for (let i = 0; i < 5; i++) AU.noise(rand(0.1, 0.25), v * 0.3, 'bandpass', rand(2500, 5000), 6, i * rand(0.1, 0.25), 0.9); };
AU.chime = (v = 0.4) => { AU.tone(880, 1.4, 'sine', v * 0.2, 0, 880, 0.7); AU.tone(1318, 1.6, 'sine', v * 0.15, 0.12, 1318, 0.7); AU.tone(1760, 1.8, 'sine', v * 0.1, 0.24, 1760, 0.7); };
AU.gulp = (v = 0.4) => { AU.tone(180, 0.18, 'sine', v * 0.4, 0, 90, 0.1); AU.noise(0.15, v * 0.25, 'lowpass', 500, 2, 0.05, 0.1); };
AU.sweep = (v = 0.3) => AU.noise(0.9, v * 0.3, 'bandpass', 200, 2, 0, 0.6, 3000);
AU.dirt = (v = 0.5) => { for (let i = 0; i < 10; i++) AU.noise(rand(0.08, 0.2), v * rand(0.3, 0.8), 'lowpass', rand(300, 900), 1, i * rand(0.03, 0.08), 0.2); };
AU.heart = { acc: 0, bpm: 0, vol: 0 };
AU.setHeart = (bpm, vol) => { AU.heart.bpm = bpm; AU.heart.vol = vol; };
function updateHeart(dt) {
  const h = AU.heart; if (!AU.ctx || h.vol < 0.01 || h.bpm <= 0) return;
  h.acc += dt;
  if (h.acc > 60 / h.bpm) { h.acc = 0; AU.tone(58, 0.16, 'sine', h.vol * 0.5, 0, 38, 0.05); AU.tone(52, 0.2, 'sine', h.vol * 0.35, 0.17, 34, 0.05); }
}
// background music "moods": sequences of chords played by the pads
const CHORDS = {
  title: [[110, 164.8, 220, 261.6], [87.3, 130.8, 174.6, 220], [98, 146.8, 196, 246.9], [82.4, 123.5, 164.8, 207.7]],
  choir: [[220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [196, 246.9, 293.7, 392], [164.8, 207.7, 246.9, 329.6]],
  dream: [[261.6, 329.6, 392, 523.3], [220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [196, 246.9, 293.7, 392]],
};
let musicT = 0, musicI = 0;
AU.setMusic = (name, organVol = 0.5) => {
  AU._music = name; AU._organVol = organVol;
  if (!AU.ctx) return;
  AU.organ.set(name ? organVol : 0, 1.5);
  musicT = 999;
};
AU.choirLevel = 0;
function updateMusic(dt) {
  if (!AU.ctx) return;
  musicT += dt;
  if (musicT > 4.5) {
    musicT = 0; musicI++;
    const seq = CHORDS[AU._music || 'title'];
    AU.organ.chord(seq[musicI % seq.length].map((f) => (AU._music === 'dream' ? f : f * 0.5)), 2);
    const cs = CHORDS.choir; AU.choir.chord(cs[musicI % cs.length], 1.2);
  }
  AU.choir.set(AU.choirLevel, 0.4);
}
AU.setWind = (v) => { AU._wind = v; AU.wind.set(v, 1.5); };
AU.setVolume = (v) => { AU.vol = clamp(v, 0, 1); RM.store.set('vol', AU.vol); if (AU.master) AU.master.gain.value = AU.muted ? 0 : AU.vol; RM.toast('Volume ' + Math.round(AU.vol * 100) + '%'); };
AU.toggleMute = () => { AU.muted = !AU.muted; if (AU.master) AU.master.gain.value = AU.muted ? 0 : AU.vol; RM.toast(AU.muted ? 'Muted' : 'Sound on'); };

/* ----------------------------------------------------------- main loop */
let last = performance.now(), fpsAcc = 0, fpsN = 0, lowFor = 0;
// ?fast lets game time keep up on very slow machines (used for automated testing)
RM.maxDt = /[?&]fast/.test(location.search) ? 0.35 : 0.05;
RM.camMode = 'player'; // 'player' = first person · 'free' = a scene is steering the camera
function frame(now) {
  requestAnimationFrame(frame);
  let rdt = Math.min(RM.maxDt, (now - last) / 1000); last = now;
  const dt = RM.paused ? 0 : rdt;
  RM.t += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= RM.t) { const fn = timers[i].fn; timers.splice(i, 1); fn(); }
  if (!RM.paused) {
    if (RM.control) updatePlayer(dt);
    for (let i = RM.ticks.length - 1; i >= 0; i--) if (RM.ticks[i](dt) === false) RM.ticks.splice(i, 1);
    if (RM.world) for (const u of RM.world.updaters) u(dt);
    if (RM.sceneTick) RM.sceneTick(dt);
    updateRavens(dt);
    updateFlickers(dt);
    for (const m of RM.mists) { m.t.offset.x += m.sx * dt; m.t.offset.y += m.sz * dt; }
    updateHands(dt);
    updateInteract();
  }
  if (RM.camMode === 'player') {
    const p = player;
    shakeT = Math.max(0, shakeT - dt); if (shakeT <= 0) shakeAmt = 0;
    const sh = shakeAmt * (shakeT > 0 ? 1 : 0);
    // stairs and slopes: a world can say how high the ground is anywhere
    const gy = RM.world && RM.world.groundAt ? RM.world.groundAt(p.x, p.z) : 0;
    p.gy = lerp(p.gy || 0, gy, 1 - Math.exp(-rdt * 14));
    camera.position.set(p.x + rand(-sh, sh), p.gy + p.eye + Math.sin(p.bob * 2) * 0.035 * clamp(p.moving / 3, 0, 1.4) + rand(-sh, sh), p.z);
    camera.rotation.set(p.pitch, p.yaw, p.roll);
    p.fovKick = lerp(p.fovKick, 0, 1 - Math.exp(-rdt * 5));
    const fov = 72 + (p.sprinting ? 5 : 0) + p.fovKick + (RM.fovExtra || 0);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 0.15); camera.updateProjectionMatrix(); }
  }
  // sky things ride along with the camera so they always look infinitely far
  sky.position.copy(camera.position); stars.position.copy(camera.position);
  moon.position.set(camera.position.x + dirVec.x * 420, camera.position.y + dirVec.y * 420, camera.position.z + dirVec.z * 420);
  moonHalo.position.copy(moon.position);
  sun.position.copy(moon.position);
  dirL.position.set(Math.round(player.x) + dirVec.x * 60, dirVec.y * 60 + 2, Math.round(player.z) + dirVec.z * 60);
  dirL.target.position.set(Math.round(player.x), 0, Math.round(player.z));
  if (capT > 0) { capT -= rdt; if (capT <= 0) $('caption').classList.remove('show'); }
  if (toastT > 0) { toastT -= rdt; if (toastT <= 0) $('toast').classList.remove('show'); }
  updateHeart(dt); updateMusic(rdt);
  drawFx();
  renderer.clear();
  renderer.render(scene, camera);
  if (hands.group.visible) { renderer.clearDepth(); renderer.render(handScene, handCam); }
  // if the game is struggling, quietly step the graphics down
  fpsAcc += rdt; fpsN++;
  if (fpsAcc > 2) {
    const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
    if (fps < 28 && RM.quality === 'high' && RM.control) { if (++lowFor >= 2) { RM.setQuality('low'); lowFor = 0; } } else lowFor = 0;
  }
}
RM.start = () => { resize(); if (RM.quality !== 'high') renderer.shadowMap.enabled = false; RM.setEnv('night'); requestAnimationFrame(frame); };
})();
