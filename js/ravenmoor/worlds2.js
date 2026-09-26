/* =====================================================================
   RAVENMOOR — the later places
   Vane Manor (ballroom, portrait hall, study, servants' corridor, and the
   cellar with Mirela and the Mirror Room underneath), the Drowned Chapel
   where the last night ends, and a ford across the River Rook.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { rand, TAU, clamp } = RM;
const M = RM.MAT, { box, cyl, add } = RM.build;

RM.ENVS.manor = Object.assign({}, RM.ENVS.crypt, { fog: 0x140a0e, fogD: 0.018, hs: 0xb08a80, hg: 0x2a1210, hi: 0.75, warm: 1.0, exp: 1.3 });
RM.ENVS.cellar = Object.assign({}, RM.ENVS.crypt, { fog: 0x080608, fogD: 0.045, hs: 0x6a5a7a, hi: 0.5 });
RM.ENVS.chapel = Object.assign({}, RM.ENVS.crypt, { fog: 0x0a1016, fogD: 0.03, hs: 0x5a7a9a, hg: 0x101418, hi: 0.6, warm: 0.3, exp: 1.3 });

const marble = RM.canvasTex(512, 512, (g, w, h) => {
  const t = 128;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const dark = (x + y) % 2; g.fillStyle = dark ? '#161218' : '#e6e0d6'; g.fillRect(x * t, y * t, t, t);
    g.strokeStyle = dark ? 'rgba(120,100,130,0.25)' : 'rgba(120,110,100,0.3)'; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x * t + rand(t), y * t); g.bezierCurveTo(x * t + rand(t), y * t + 40, x * t + rand(t), y * t + 90, x * t + rand(t), y * t + t); g.stroke(); }
  }
}, { repeat: [1, 1] });
const damask = RM.canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4a0c16'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(160,40,50,0.35)';
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 64 + (y % 2) * 32, cy = y * 64 + 32; g.beginPath(); g.ellipse(cx, cy, 14, 24, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx, cy - 26, 5, 8, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx, cy + 26, 5, 8, 0, 0, TAU); g.fill(); }
}, { repeat: [1, 1] });
const gold = M.gold;
const wallM = (rx, ry) => new THREE.MeshStandardMaterial({ map: RM.retex(damask, rx, ry), roughness: 0.9 });

// a framed painting from a canvas
function painting(canvas, x, y, z, ry, w = 1.2, h = 1.5, parent) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; (parent || RM.world.group).add(g);
  const t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding;
  add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.08), gold), g);
  const pic = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })), g); pic.position.z = 0.045;
  return { g, pic, tex: t };
}
RM.build.painting = painting;
function chandelier(x, y, z, parent, light = 2.2) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  add(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 32), gold), g).rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 24), gold), g).rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), gold), g).position.y = 1.5;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; RM.flame(x + Math.cos(a) * 1.2, y + 0.08, z + Math.sin(a) * 1.2, { size: 0.07, light: i === 0 ? light : 0, range: 14, parent }); }
  for (let i = 0; i < 16; i++) { const a = rand(TAU), r = rand(0.3, 1.1); const c = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.8 })), g); c.position.set(Math.cos(a) * r, -rand(0.1, 0.5), Math.sin(a) * r); }
  return g;
}

/* ============================================================ VANE MANOR */
RM.defineWorld('manor', (w) => {
  const G = w.group;
  w.groundAt = () => 0;
  const floorM = new THREE.MeshStandardMaterial({ map: RM.retex(marble, 7, 5), roughness: 0.18, metalness: 0.15 });
  // --- BALLROOM: x -14..14, z -20..0
  const bf = add(new THREE.Mesh(new THREE.PlaneGeometry(28, 20), floorM), G, false, true); bf.rotation.x = -Math.PI / 2; bf.position.set(0, 0, -10);
  box(28, 11, 0.5, wallM(7, 3), 0, 5.5, 0.25, G, true); box(28, 11, 0.5, wallM(7, 3), 0, 5.5, -20.25, G, true);
  box(0.5, 11, 8.6, wallM(2, 3), -14.25, 5.5, -4.3, G, true); box(0.5, 11, 8.6, wallM(2, 3), -14.25, 5.5, -15.7, G, true); box(0.5, 7.6, 2.8, wallM(1, 2), -14.25, 7.2, -10, G);
  box(0.5, 11, 8.6, wallM(2, 3), 14.25, 5.5, -4.3, G, true); box(0.5, 11, 8.6, wallM(2, 3), 14.25, 5.5, -15.7, G, true); box(0.5, 7.6, 2.8, wallM(1, 2), 14.25, 7.2, -10, G);
  const ceil = add(new THREE.Mesh(new THREE.PlaneGeometry(28, 20), new THREE.MeshStandardMaterial({ color: 0x2a1a1c, roughness: 0.9 })), G, false, false); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 11, -10);
  for (let x = -12; x <= 12; x += 4) for (const z of [-0.05, -19.95]) { const p = box(0.5, 11, 0.3, gold, x, 5.5, z, G); void p; }
  for (const x of [-7, 0, 7]) chandelier(x, 7.8, -10, G, 2.4);
  // tall moonlit windows on the north wall
  for (const x of [-10, -3.5, 3.5, 10]) { const wn = add(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5), new THREE.MeshBasicMaterial({ color: 0x2a3a70, fog: false })), G, false, false); wn.position.set(x, 5.5, -19.98); box(2.4, 0.15, 0.2, gold, x, 3, -19.9, G); }
  // a balcony for Vane and the orchestra
  box(10, 0.4, 3, M.darkWood, 0, 4.6, -18.4, G); box(10, 1, 0.12, gold, 0, 5.3, -16.9, G);
  w.data.balcony = { x: 0, y: 4.8, z: -18.4 };
  // tables of food along the sides
  for (const z of [-4, -16]) for (const x of [-11.5, 11.5]) { box(1.6, 0.9, 3.4, new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 }), x, 0.45, z, G, true); for (let i = 0; i < 5; i++) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({ color: RM.pick([0x8a1020, 0xc0a040, 0x4a2a1a]) })), G); c.position.set(x + rand(-0.5, 0.5), 1.0, z + rand(-1.4, 1.4)); } RM.build.candles(x, 0.9, z, 3, 0, G); }
  w.data.ballroom = { x: 0, z: -10 };
  // --- PORTRAIT HALL: x 14..40, z -12..-8
  const hf = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 4), floorM), G, false, true); hf.rotation.x = -Math.PI / 2; hf.position.set(27, 0, -10);
  const runner = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 1.6), new THREE.MeshStandardMaterial({ color: 0x5a0a18, roughness: 1 })), G, false, true); runner.rotation.x = -Math.PI / 2; runner.position.set(27, 0.01, -10);
  box(26, 6, 0.4, wallM(6, 2), 27, 3, -7.8, G, true); box(26, 6, 0.4, wallM(6, 2), 27, 3, -12.2, G, true);
  const hc = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 4), new THREE.MeshStandardMaterial({ color: 0x1a1012 })), G, false, false); hc.rotation.x = Math.PI / 2; hc.position.set(27, 6, -10);
  w.data.portraits = [];
  for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) {
    const x = 17.5 + i * 4, z = sd > 0 ? -8.05 : -11.95;
    const look = RM.randomLook();
    const pt = painting(RM.portraitCanvas(look), x, 2.6, z, sd > 0 ? Math.PI : 0, 1.2, 1.5, G);
    w.data.portraits.push({ ...pt, x, z, sd });
    if (i % 2 === 0) RM.flame(x + 2, 2.2, z + (sd > 0 ? -0.25 : 0.25), { size: 0.07, light: sd > 0 ? 0.9 : 0, parent: G });
  }
  // the newest painting: you (painted on its canvas once the story knows your face)
  const youC = document.createElement('canvas'); youC.width = 160; youC.height = 200;
  const you = painting(youC, 38.6, 2.6, -10, -Math.PI / 2, 1.4, 1.8, G);
  w.data.youPortrait = { ...you, canvas: youC, x: 38.6, z: -10 };
  RM.glow(38.3, 2.6, -10, 0xc02040, 3, 0.3, G);
  // --- STUDY: x 40..52, z -16..-4 (door from the hall at x=40)
  const sf = add(new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ map: RM.retex(RM.TEX.wood, 6, 6), roughness: 0.7 })), G, false, true); sf.rotation.x = -Math.PI / 2; sf.position.set(46, 0, -10);
  box(0.4, 6, 5, wallM(1, 2), 40, 3, -5.5, G, true); box(0.4, 6, 5, wallM(1, 2), 40, 3, -14.5, G, true);
  box(0.4, 6, 12, wallM(3, 2), 52.2, 3, -10, G, true); box(12, 6, 0.4, wallM(3, 2), 46, 3, -3.8, G, true); box(12, 6, 0.4, wallM(3, 2), 46, 3, -16.2, G, true);
  const sc2 = add(new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x1a1210 })), G, false, false); sc2.rotation.x = Math.PI / 2; sc2.position.set(46, 6, -10);
  box(2.6, 0.9, 1.2, M.darkWood, 47, 0.45, -10, G, true);
  for (let i = 0; i < 5; i++) { const b = box(0.35, 2.6, 2, M.darkWood, 51.8, 1.3, -14.5 + i * 2.2, G, true); void b; for (let j = 0; j < 4; j++) box(0.3, 0.35, 1.8, new THREE.MeshStandardMaterial({ color: RM.pick([0x5a1a1a, 0x1a3a2a, 0x2a2a4a, 0x6a4a1a]) }), 51.6, 0.4 + j * 0.62, -14.5 + i * 2.2, G); }
  box(2.4, 1.6, 0.6, M.stone, 46, 0.8, -15.7, G, true); RM.flame(46, 0.3, -15.4, { size: 0.35, light: 2.2, color: 0xff7a30, range: 10, parent: G });
  RM.build.candles(47.8, 0.9, -10.2, 3, 0.8, G);
  w.data.study = { x: 46, z: -10 };
  // --- SERVANTS' CORRIDOR: x -40..-14, z -4..0 (kitchens, back way in)
  const cf = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 6), M.cryptFloor), G, false, true); cf.rotation.x = -Math.PI / 2; cf.position.set(-27, 0, -7);
  box(26, 4, 0.4, M.stone, -27, 2, -3.8, G, true); box(26, 4, 0.4, M.stone, -27, 2, -10.2, G, true); box(0.4, 4, 6, M.stone, -40.2, 2, -7, G, true);
  const ccl = add(new THREE.Mesh(new THREE.PlaneGeometry(26, 6), new THREE.MeshStandardMaterial({ color: 0x1a1612 })), G, false, false); ccl.rotation.x = Math.PI / 2; ccl.position.set(-27, 4, -7);
  for (const [x, z] of [[-34, -5], [-30, -9], [-24, -5], [-20, -9], [-37, -9]]) box(1.2, 1, 1, M.wood, x, 0.5, z, G, true);
  for (const x of [-36, -28, -20]) RM.build.candles(x, 1.0, z0(), 2, 0.8, G);
  function z0() { return -5; }
  w.data.corridor = { start: { x: -38.5, z: -7 }, end: { x: -14.8, z: -10 } };
  // the corridor meets the ballroom's west door (z -8.6 to -10.2)
  RM.addCollider(-14.5, -8.6, -14, -3.8);
  // --- CELLAR (beneath everything; its own area): x -10..10, z 30..60
  const cel = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 30), M.cryptFloor), G, false, true); cel.rotation.x = -Math.PI / 2; cel.position.set(0, 0, 45);
  box(0.5, 5, 30, M.cryptWall, -10.25, 2.5, 45, G, true); box(0.5, 5, 10, M.cryptWall, 10.25, 2.5, 35, G, true); box(0.5, 5, 13, M.cryptWall, 10.25, 2.5, 53.5, G, true);
  box(20.5, 5, 0.5, M.cryptWall, 0, 2.5, 29.75, G, true); box(20.5, 5, 0.5, M.cryptWall, 0, 2.5, 60.25, G, true);
  const clc = add(new THREE.Mesh(new THREE.PlaneGeometry(20, 30), new THREE.MeshStandardMaterial({ map: RM.retex(RM.TEX.cryptStone, 6, 8), roughness: 1 })), G, false, false); clc.rotation.x = Math.PI / 2; clc.position.set(0, 5, 45);
  for (const z of [36, 42, 48]) for (const sd of [-1, 1]) { const rack = box(1, 3, 4, M.darkWood, sd * 8.5, 1.5, z, G, true); void rack; for (let i = 0; i < 12; i++) { const b = cyl(0.07, 0.07, 0.8, new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.2, metalness: 0.3 }), sd * 8.5 + sd * -0.1, 0.4 + (i % 4) * 0.7, z - 1.5 + Math.floor(i / 4), 8, G); b.rotation.z = Math.PI / 2; } }
  for (const [x, z] of [[-4, 33], [4, 38], [-3, 47], [3, 53]]) RM.build.candles(x, 0, z, 3, 0.9, G);
  // Mirela's chains on the far wall
  w.data.mirela = { x: 0, z: 58.6 };
  w.data.mirelaChains = [];
  for (const [ax, ay] of [[-1.3, 2.6], [1.3, 2.6], [0, 0.2]]) { const g = new THREE.Group(); G.add(g); RM.build.chain(ax, ay, 60, ax * 0.3, 1.3 + (ay > 1 ? 0.2 : -0.6), 58.8, g, 0.1); w.data.mirelaChains.push(g); }
  RM.glow(0, 1.5, 58.5, 0x9020a0, 2.5, 0.25, G);
  // the vial of Vane blood on a pedestal
  cyl(0.3, 0.4, 1.1, M.stoneLight, -5, 0.55, 42, 12, G); RM.addCircle(-5, 42, 0.45);
  const vial = new THREE.Group(); vial.position.set(-5, 1.1, 42); G.add(vial);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.05 })), vial).position.y = 0.09;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.13, 10), new THREE.MeshStandardMaterial({ color: 0x8a0010, emissive: 0x5a0008, emissiveIntensity: 1 })), vial).position.y = 0.07;
  RM.glow(-5, 1.2, 42, 0xff1030, 0.9, 0.5, G);
  w.data.vial = vial;
  // the Mirror Room, through a door on the east side: x 10..20, z 40..50
  const mf = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorM), G, false, true); mf.rotation.x = -Math.PI / 2; mf.position.set(15, 0, 45);
  box(10, 5, 0.4, M.cryptWall, 15, 2.5, 39.8, G, true); box(10, 5, 0.4, M.cryptWall, 15, 2.5, 50.2, G, true); box(0.4, 5, 10, M.cryptWall, 20.2, 2.5, 45, G, true);
  const mc = add(new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x0e0c10 })), G, false, false); mc.rotation.x = Math.PI / 2; mc.position.set(15, 5, 45);
  const mirM = new THREE.MeshStandardMaterial({ color: 0x9aa4b8, metalness: 1, roughness: 0.06 });
  w.data.mirrors = [];
  for (const [x, z, ry] of [[19.9, 45, -Math.PI / 2], [15, 49.9, Math.PI], [15, 40.1, 0], [19.9, 42, -Math.PI / 2], [19.9, 48, -Math.PI / 2]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; G.add(g);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.8, 0.08), gold), g).position.y = 1.6;
    const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), mirM), g); glass.position.set(0, 1.6, 0.05);
    w.data.mirrors.push({ g, glass, x, z, ry });
  }
  RM.build.candles(12, 0, 41, 3, 1.0, G); RM.build.candles(12, 0, 49, 3, 0, G);
  w.data.cellarStart = { x: 0, z: 31.2 };
});

/* ========================================================= DROWNED CHAPEL */
// walkways over running water: step off one and the river takes you
const WALKS = [
  [-3, -2, 3, 3], [-0.6, -12, 0.6, -2], [-3, -15, 3, -12], [2.2, -24, 3.0, -15], [1, -27, 6, -24], [-5, -26.4, 1, -25.6],
  [-8, -30, -4, -24], [-6.4, -40, -5.6, -30], [-8, -43, -3, -40], [-3, -42.4, 4, -41.6], [3, -46, 7, -40], [4.6, -55, 5.4, -46], [-9, -68, 9, -55],
];
RM.defineWorld('chapel', (w) => {
  const G = w.group;
  w.data.walks = WALKS;
  w.onWalk = (x, z, pad = 0.15) => WALKS.some(([x0, z0, x1, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad);
  w.groundAt = (x, z) => (w.onWalk(x, z, 0.35) ? 0.35 : -1.2);
  const planks = new THREE.MeshStandardMaterial({ map: RM.retex(RM.TEX.wood, 1, 4), color: 0x7a6a5a, roughness: 0.95 });
  for (const [x0, z0, x1, z1] of WALKS) {
    const big = (x1 - x0) > 2.5 && (z1 - z0) > 2.5;
    box(x1 - x0, 0.3, z1 - z0, big ? M.stoneLight : planks, (x0 + x1) / 2, 0.2, (z0 + z1) / 2, G);
    if (big) cyl(0.5, 0.6, 3, M.stone, (x0 + x1) / 2, -1.2, (z0 + z1) / 2, 10, G);
  }
  // the flooded nave, and its drowned pillars
  const water = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 90), new THREE.MeshStandardMaterial({ color: 0x0a1a22, metalness: 0.7, roughness: 0.1, transparent: true, opacity: 0.9 })), G, false, true);
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.15, -30); w.data.water = water;
  const bed = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 90), new THREE.MeshStandardMaterial({ color: 0x0a0c10 })), G, false, false); bed.rotation.x = -Math.PI / 2; bed.position.set(0, -3, -30);
  for (const sd of [-1, 1]) { box(0.6, 18, 90, M.cryptWall, sd * 13, 8, -30, G); for (let z = -2; z >= -60; z -= 6) { cyl(0.7, 0.8, 18, M.stone, sd * 10.5, 7, z, 14, G); } }
  box(28, 18, 0.6, M.cryptWall, 0, 8, 4, G); box(28, 18, 0.6, M.cryptWall, 0, 8, -70, G);
  // fallen columns half under water
  for (const [x, z, r] of [[-5, -8, 0.4], [6, -18, 0.9], [-2, -34, -0.6], [8, -30, 0.2], [-9, -50, 1.2]]) { const c = cyl(0.6, 0.6, 7, M.stone, x, -0.3, z, 12, G); c.rotation.z = Math.PI / 2; c.rotation.y = r; }
  // the ritual platform
  const ring = add(new THREE.Mesh(new THREE.RingGeometry(3.5, 3.8, 48), new THREE.MeshBasicMaterial({ color: 0xc01030, side: THREE.DoubleSide })), G, false, false); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.37, -62);
  const ring2 = add(new THREE.Mesh(new THREE.RingGeometry(1.8, 1.95, 48), new THREE.MeshBasicMaterial({ color: 0xff3040, side: THREE.DoubleSide })), G, false, false); ring2.rotation.x = -Math.PI / 2; ring2.position.set(0, 0.37, -62);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const r = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ color: 0xff2040, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })), G, false, false); r.rotation.x = -Math.PI / 2; r.rotation.z = a; r.position.set(Math.cos(a) * 2.7, 0.38, -62 + Math.sin(a) * 2.7); }
  // the heart of the curse: a floating, beating red heart of glass
  const heart = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshStandardMaterial({ color: 0xa00018, emissive: 0xff1030, emissiveIntensity: 1.4, roughness: 0.1, metalness: 0.3, flatShading: true })), G, false, false);
  heart.position.set(0, 2, -62); w.data.heart = heart;
  const hl = new THREE.PointLight(0xff2040, 3, 18, 1.6); hl.position.set(0, 2, -62); G.add(hl); w.data.heartLight = hl;
  const hg = RM.glow(0, 2, -62, 0xff2040, 5, 0.6, G);
  w.updaters.push(() => { const b = 1 + Math.pow(Math.max(0, Math.sin(RM.t * 3)), 6) * 0.25; heart.scale.setScalar(b); heart.rotation.y += 0.01; hl.intensity = 2 + b * 2; hg.scale.setScalar(5 * b); });
  RM.lightShaft(0, 8, -62, 0.4, 3.8, 16, 0xff2040, 0.05, 0, G);
  // candles all round the edge of the platform
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; RM.build.candles(Math.cos(a) * 6.5, 0.35, -62 + Math.sin(a) * 5, 2, i % 4 === 0 ? 1 : 0, G); }
  // the chained coffin from under the crypt: they brought it here for the ritual
  const cg = new THREE.Group(); cg.position.set(-6, 0.35, -65.5); cg.rotation.y = 0.3; G.add(cg);
  box(1.9, 1.25, 3.8, M.darkWood, 0, 0.62, 0, cg); for (const z of [-1.4, 0, 1.4]) box(1.96, 1.3, 0.1, M.rust, 0, 0.62, z, cg);
  const cl = box(2, 0.14, 3.9, M.darkWood, 0, 1.3, 0, cg); w.data.bigLid = cl;
  RM.build.chain(-1, 0.5, 2.2, -0.6, 1.1, 1.2, cg, 0.2); RM.build.chain(1, 0.5, -2.2, 0.6, 1.1, -1.2, cg, 0.2);
  w.data.bigCoffin = { x: -6, z: -65.5 };
  RM.addCollider(-7.2, -67.6, -4.8, -63.4);
  // a small boat tied at the edge (Rosalind's escape)
  const boat = new THREE.Group(); boat.position.set(7.8, -0.1, -58); G.add(boat);
  box(1.4, 0.5, 3.4, M.darkWood, 0, 0, 0, boat); box(1.2, 0.1, 3.2, M.wood, 0, 0.2, 0, boat);
  w.data.boat = { x: 7.8, z: -58 };
  // things moving under the water 😱
  w.data.eels = [];
  const eelM = new THREE.MeshStandardMaterial({ color: 0x050808, roughness: 0.4, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 9; i++) { const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), eelM), G, false, false); e.scale.set(0.6, 0.3, 4); e.position.set(rand(-9, 9), -0.6, rand(-55, -5)); w.data.eels.push({ m: e, a: rand(TAU), r: rand(3, 7), cx: e.position.x, cz: e.position.z, s: rand(0.3, 0.7) }); }
  w.updaters.push((dt) => { for (const e of w.data.eels) { e.a += e.s * dt; const x = e.cx + Math.cos(e.a) * e.r, z = e.cz + Math.sin(e.a) * e.r; e.m.rotation.y = Math.atan2(x - e.m.position.x, z - e.m.position.z); e.m.position.set(x, -0.5 + Math.sin(e.a * 3) * 0.15, z); } });
  RM.mist(0, -30, 26, 90, 0.2, 0.2, 0x8aa0c0, G);
  RM.dust(-10, 0, -70, 10, 10, 2, 300, 0xcfd8ff, 0.03, G);
  // a broken rose window, with the grey of the coming dawn behind it
  const rw = add(new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: 0x5a3a4a, fog: false })), G, false, false); rw.position.set(0, 10, -69.6); w.data.rose = rw;
  RM.lightShaft(0, 6, -64, 1, 3.5, 12, 0x9fb4ff, 0.04, 0.3, G);
  RM.addCollider(-13, -71, 13, -69); RM.addCollider(-13, 3.5, 13, 5);
});

/* ---------------------------------------- a ford across the River Rook */
// Stepping stones at x=20, so the moor can still be crossed after the bridge falls.
const _prevMoor = RM.worldDefs.moor;
RM.defineWorld('moor', (w) => {
  _prevMoor(w);
  const base = w.groundAt;
  w.groundAt = (x, z) => (Math.abs(z) < 4.2 && Math.abs(x - 20) < 0.9 ? 0.15 : base(x, z));
  // split the right-hand riverbank so there's a gap at the ford
  const right = w.data.banks[1]; right.x1 = 19.1;
  w.data.banks.push(RM.addCollider(20.9, -4.2, 130, 4.2));
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x6a6a74, roughness: 0.9, flatShading: true });
  for (let z = -3.8; z <= 3.8; z += 0.95) { const s = add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.6, 7), stoneM), w.group); s.position.set(20 + rand(-0.15, 0.15), -1.15, z); }
  w.data.ford = { x: 20, z: 0 };
});
})();
