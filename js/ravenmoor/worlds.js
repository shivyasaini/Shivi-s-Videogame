/* =====================================================================
   RAVENMOOR — the places
   The crypt beneath the town (with its bone tunnels) and the town of
   Ravenmoor itself: the graveyard and church, the main street, the alley,
   and the market square below Vane Manor. Every texture is painted in code.
   Scenes borrow these worlds and add their own people and props.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { rand, TAU, canvasTex, speckle, TEX } = RM;

/* ------------------------------------------------------------ textures */
TEX.cryptStone = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#2c2c34'; g.fillRect(0, 0, w, h);
  const rows = 8, bh = h / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 0.5 : 0, cols = 4, bw = w / cols;
    for (let c = -1; c <= cols; c++) {
      const x = (c + off) * bw, y = r * bh, v = rand(38, 64);
      g.fillStyle = `rgb(${v},${v},${v + rand(4, 12)})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 3, y + bh - 10, bw - 6, 7);
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x + 3, y + 3, bw - 6, 4);
    }
  }
  speckle(g, w, h, 5000, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.05)', 'rgba(40,60,40,0.15)']);
  for (let i = 0; i < 12; i++) { const x = rand(w); const gr = g.createLinearGradient(x, h * 0.6, x, h); gr.addColorStop(0, 'rgba(20,30,20,0)'); gr.addColorStop(1, 'rgba(20,34,22,0.35)'); g.fillStyle = gr; g.fillRect(x - 20, h * 0.6, 40, h * 0.4); }
});
TEX.cryptFloor = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#1e1e24'; g.fillRect(0, 0, w, h);
  const n = 4, s = w / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = rand(44, 70); g.fillStyle = `rgb(${v},${v - 2},${v + 6})`; g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x * s + rand(s), y * s); g.lineTo(x * s + rand(s), y * s + s); g.stroke();
  }
  speckle(g, w, h, 6000, ['rgba(0,0,0,0.3)', 'rgba(255,255,255,0.04)']);
}, { repeat: [1, 1] });
TEX.skulls = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#18140f'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) {
    const x = c * 48 + (r % 2 ? 24 : 0) + rand(-3, 3), y = r * 52 + 26 + rand(-3, 3), v = rand(150, 200);
    g.fillStyle = `rgb(${v},${v - 12},${v - 36})`; g.beginPath(); g.ellipse(x, y, 19, 21, 0, 0, TAU); g.fill();
    g.fillRect(x - 10, y + 12, 20, 12);
    g.fillStyle = '#0c0907'; g.beginPath(); g.ellipse(x - 7, y + 1, 5.5, 6.5, 0, 0, TAU); g.ellipse(x + 7, y + 1, 5.5, 6.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x - 3, y + 13); g.lineTo(x + 3, y + 13); g.fill();
    for (let t = -2; t <= 2; t++) g.fillRect(x + t * 4 - 1, y + 17, 2, 6);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + 6, y + 6, 16, 18, 0, 0, TAU); g.fill();
  }
  for (let i = 0; i < 30; i++) { const v = rand(130, 180); g.strokeStyle = `rgb(${v},${v - 10},${v - 30})`; g.lineWidth = 6; const x = rand(w), y = rand(h), a = rand(TAU); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke(); }
  speckle(g, w, h, 3000, ['rgba(0,0,0,0.3)']);
});
TEX.cobble = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#16161c'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const cx = x * 32 + (y % 2 ? 16 : 0) + rand(-3, 3), cy = y * 32 + rand(-3, 3), v = rand(48, 84);
    g.fillStyle = `rgb(${v},${v},${v + 8})`; g.beginPath(); g.ellipse(cx, cy, rand(12, 15), rand(11, 14), rand(TAU), 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.ellipse(cx - 3, cy - 3, 6, 4, 0, 0, TAU); g.fill();
  }
  speckle(g, w, h, 4000, ['rgba(0,0,0,0.3)', 'rgba(60,80,60,0.12)']);
});
TEX.plaster = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 9000, ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)', 'rgba(90,70,50,0.07)'], 3);
  for (let i = 0; i < 16; i++) { const x = rand(w), y = rand(h), r = rand(20, 80); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(80,70,50,0.18)'); gr.addColorStop(1, 'rgba(80,70,50,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // timber frame beams
  g.fillStyle = '#2a1c14';
  g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22); g.fillRect(0, h / 2 - 10, w, 20);
  for (let x = 0; x <= w; x += 128) g.fillRect(x - 10, 0, 20, h);
  g.strokeStyle = '#2a1c14'; g.lineWidth = 16;
  for (let x = 0; x < w; x += 256) { g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 128, 0); g.stroke(); g.beginPath(); g.moveTo(x + 256, h / 2); g.lineTo(x + 128, 0); g.stroke(); }
  speckle(g, w, h, 2000, ['rgba(0,0,0,0.15)']);
});
TEX.houseStone = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#403c3a'; g.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) { const bh = rand(26, 44); let x = rand(-30, 0); while (x < w) { const bw = rand(40, 90), v = rand(70, 110); g.fillStyle = `rgb(${v},${v - 6},${v - 10})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); x += bw; } y += bh; }
  speckle(g, w, h, 6000, ['rgba(0,0,0,0.25)', 'rgba(255,255,255,0.05)']);
});
TEX.roof = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#1a1c24'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = -1; c < 17; c++) {
    const x = c * 32 + (r % 2 ? 16 : 0), y = r * 32, v = rand(46, 72);
    g.fillStyle = `rgb(${v - 6},${v},${v + 10})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.lineTo(x + 30, y + 24); g.quadraticCurveTo(x + 15, y + 34, x, y + 24); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + 24, 30, 4);
  }
  speckle(g, w, h, 3000, ['rgba(0,0,0,0.3)', 'rgba(90,110,90,0.12)']);
});
TEX.wood = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a2618'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) { g.fillStyle = `rgb(${rand(50, 70)},${rand(32, 42)},${rand(20, 28)})`; g.fillRect(x + 1, 0, 30, h); for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); const xx = x + rand(4, 28); g.moveTo(xx, 0); g.bezierCurveTo(xx + rand(-4, 4), h / 3, xx + rand(-4, 4), h * 0.66, xx, h); g.stroke(); } }
});
TEX.grass = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#1e2418'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 16000, ['#28301e', '#1a2014', '#303824', '#2a2418', '#141a10'], 3);
  for (let i = 0; i < 1500; i++) { g.strokeStyle = RM.pick(['#34402a', '#28321e', '#3c4630']); g.lineWidth = 1; const x = rand(w), y = rand(h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-2, 2), y - rand(3, 7)); g.stroke(); }
});
TEX.window = canvasTex(64, 96, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd48a'); gr.addColorStop(1, '#e08a3a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(80,40,10,0.35)'; g.fillRect(8, 60, 20, 30); g.fillRect(40, 20, 14, 40);
  g.fillStyle = '#1c120c'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h); g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h / 2 - 3, w, 6);
});
TEX.windowDark = canvasTex(64, 96, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a3450'); gr.addColorStop(0.5, '#0c1020'); gr.addColorStop(1, '#1a2238');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#140e0a'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h); g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h / 2 - 3, w, 6);
});
TEX.web = canvasTex(256, 256, (g, w) => {
  g.strokeStyle = 'rgba(220,225,235,0.5)'; g.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * w, Math.sin(a) * w); g.stroke(); }
  for (let r = 20; r < w; r += rand(16, 26)) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2, rr = r * rand(0.92, 1.05); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }
});
TEX.poster = canvasTex(128, 170, (g, w, h) => {
  g.fillStyle = '#d8c8a0'; g.fillRect(0, 0, w, h); speckle(g, w, h, 900, ['rgba(80,60,30,0.25)']);
  g.fillStyle = '#2a1a10'; g.font = 'bold 20px Georgia'; g.textAlign = 'center'; g.fillText('BEWARE', w / 2, 26);
  g.fillStyle = '#1a1010'; g.beginPath(); g.ellipse(w / 2, 82, 30, 38, 0, 0, TAU); g.fill();
  g.fillStyle = '#c01020'; g.beginPath(); g.arc(w / 2 - 11, 76, 4, 0, TAU); g.arc(w / 2 + 11, 76, 4, 0, TAU); g.fill();
  g.fillStyle = '#2a1a10'; g.font = '12px Georgia'; g.fillText('THE SLEEPER', w / 2, 140); g.fillText('WALKS', w / 2, 156);
});

/* ------------------------------------------------------------ materials */
const M = (RM.MAT = {});
M.cryptWall = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptStone, 4, 1.2), bumpMap: RM.retex(TEX.cryptStone, 4, 1.2), bumpScale: 0.04, roughness: 0.92 });
M.cryptFloor = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptFloor, 6, 16), roughness: 0.6, metalness: 0.08 });
M.stone = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptStone, 1, 1), bumpMap: RM.retex(TEX.cryptStone, 1, 1), bumpScale: 0.03, roughness: 0.9, color: 0x9a9aa8 });
M.stoneLight = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptStone, 1, 1), roughness: 0.85, color: 0xb8b8c4 });
M.skulls = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.skulls, 1, 1), bumpMap: RM.retex(TEX.skulls, 1, 1), bumpScale: 0.06, roughness: 0.85 });
M.iron = new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.45, metalness: 0.85 });
M.rust = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.7, metalness: 0.6 });
M.wood = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.8 });
M.darkWood = new THREE.MeshStandardMaterial({ map: TEX.wood, color: 0x6a5a58, roughness: 0.7 });
M.velvet = new THREE.MeshStandardMaterial({ color: 0x6a0a1a, roughness: 0.95 });
M.bone = new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.8 });
M.gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.9 });
M.wax = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 });
M.redWax = new THREE.MeshStandardMaterial({ color: 0x7a0a14, roughness: 0.8 });
M.web = new THREE.MeshBasicMaterial({ map: TEX.web, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.55 });
M.cobble = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cobble, 2, 12), roughness: 0.55, metalness: 0.1 });
M.grass = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.grass, 40, 40), roughness: 1 });
M.roof = new THREE.MeshStandardMaterial({ map: TEX.roof, roughness: 0.6, metalness: 0.15 });
M.litWin = new THREE.MeshStandardMaterial({ map: TEX.window, emissive: 0xffa050, emissiveMap: TEX.window, emissiveIntensity: 1.3, roughness: 0.4 });
M.darkWin = new THREE.MeshStandardMaterial({ map: TEX.windowDark, roughness: 0.15, metalness: 0.5 });
M.houseStone = new THREE.MeshStandardMaterial({ map: TEX.houseStone, roughness: 0.9 });
M.bark = new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 1 });
M.dirt = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 });
M.poster = new THREE.MeshStandardMaterial({ map: TEX.poster, roughness: 0.9, side: THREE.DoubleSide });
const plasterTints = [0xd8cfbb, 0xc8b89a, 0xa9b0b8, 0xc9a9a0, 0xb8b09a, 0x9aa49a];
const plasterMats = plasterTints.map((c) => new THREE.MeshStandardMaterial({ map: TEX.plaster, color: c, roughness: 0.92 }));
// warm windows glow at night and go quiet in daylight
const prevOnEnv = RM.onEnv;
RM.onEnv = (e) => { M.litWin.emissiveIntensity = e.di > 2 ? 0.08 : 1.3; if (prevOnEnv) prevOnEnv(e); };

/* -------------------------------------------------------------- helpers */
const add = (m, parent, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; (parent || RM.world.group).add(m); return m; };
const box = (w, h, d, mat, x, y, z, parent, solid) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent); m.position.set(x, y, z); if (solid) RM.solid(m, 0); return m; };
const cyl = (rt, rb, h, mat, x, y, z, seg = 14, parent) => { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), parent); m.position.set(x, y, z); return m; };
RM.build = { add, box, cyl };

function candleCluster(x, y, z, n = 3, light = 0, parent) {
  for (let i = 0; i < n; i++) {
    const cx = x + rand(-0.14, 0.14), cz = z + rand(-0.14, 0.14), h = rand(0.12, 0.34);
    cyl(0.028, 0.032, h, M.wax, cx, y + h / 2, cz, 8, parent);
    RM.flame(cx, y + h, cz, { size: 0.07, light: i === 0 ? light : 0, range: 7, parent });
  }
}
RM.build.candles = candleCluster;
function bonePile(x, z, n = 10, parent) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), r = rand(0.5);
    if (Math.random() < 0.3) { const s = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M.bone), parent); s.scale.set(1, 1.1, 1.2); s.position.set(x + Math.cos(a) * r, 0.08, z + Math.sin(a) * r); }
    else { const b = cyl(0.02, 0.025, rand(0.25, 0.45), M.bone, x + Math.cos(a) * r, 0.03, z + Math.sin(a) * r, 6, parent); b.rotation.set(Math.PI / 2, 0, rand(TAU)); }
  }
}
RM.build.bones = bonePile;
function chain(ax, ay, az, bx, by, bz, parent, sag = 0.3) {
  const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay, bz - az) / 0.09));
  const geo = new THREE.TorusGeometry(0.035, 0.011, 5, 10);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * sag;
    const l = add(new THREE.Mesh(geo, M.iron), parent, false); l.position.set(x, y, z);
    l.lookAt(bx, by, bz); if (i % 2) l.rotateZ(Math.PI / 2);
  }
}
RM.build.chain = chain;
function deadTree(x, z, h = 6, parent) {
  const g = new THREE.Group(); g.position.set(x, 0, z); (parent || RM.world.group).add(g);
  const trunk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, h, 8), M.bark), g); trunk.position.y = h / 2; trunk.rotation.z = rand(-0.08, 0.08);
  const branches = [];
  for (let i = 0; i < 7; i++) {
    const y = h * rand(0.45, 0.95), len = rand(1, 2.4), a = rand(TAU);
    const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.07, len, 5), M.bark), g, true, false);
    b.position.set(Math.cos(a) * len * 0.35, y + len * 0.25, Math.sin(a) * len * 0.35);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    branches.push({ x: x + Math.cos(a) * len * 0.6, y: y + len * 0.45, z: z + Math.sin(a) * len * 0.6 });
  }
  RM.addCircle(x, z, 0.35);
  return branches;
}
RM.build.deadTree = deadTree;

/* =============================================================== CRYPT */
// the tunnel grid: '#' wall · '.' floor · 'E' way in · 'M' memory · 'C' the chained coffin's chamber · 'L' ladder out
const TUN = [
  '############',
  '#L..#.....##',
  '#.#.#.###.##',
  '#.#...#...##',
  '#.#####.#.##',
  '#...M...#..E',
  '###.#####.##',
  '#CCC..#...##',
  '#CCC#.#.#.##',
  '#CCC#...#..#',
  '############',
];
const TC = 2.4, TOX = -34.8, TOZ = -27.2;
const tcx = (c) => TOX + c * TC + TC / 2, tcz = (r) => TOZ + r * TC + TC / 2;
RM.TUN = { cell: (c, r) => ({ x: tcx(c), z: tcz(r) }) };

RM.defineWorld('crypt', (w) => {
  const G = w.group;
  const L = 32, W = 12, WALL = 4.6, R = 6;
  // floor
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(W, L + 10), M.cryptFloor), G, false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -L / 2 + 5);
  // side walls, with a crumbling hole on the west wall into the bone tunnels
  box(0.5, WALL, 17.2, M.cryptWall, -6.25, WALL / 2, -23.6, G, true);
  box(0.5, WALL, 12.8, M.cryptWall, -6.25, WALL / 2, -6.4, G, true);
  box(0.5, WALL - 2.5, 2.4, M.cryptWall, -6.25, 2.5 + (WALL - 2.5) / 2, -14, G);
  box(0.5, WALL, L, M.cryptWall, 6.25, WALL / 2, -L / 2, G, true);
  box(W + 1, 11, 0.5, M.cryptWall, 0, 5.5, -L - 0.25, G, true);
  // entrance wall with the gate opening
  box(4, 11, 0.5, M.cryptWall, -4, 5.5, 0.25, G, true);
  box(4, 11, 0.5, M.cryptWall, 4, 5.5, 0.25, G, true);
  box(4, 7.4, 0.5, M.cryptWall, 0, 7.3, 0.25, G);
  // the great vault overhead
  const vault = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 40, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptStone, 8, 5), roughness: 0.95, side: THREE.DoubleSide, color: 0x8a8a98 })), G, false, true);
  vault.rotation.x = Math.PI / 2; vault.position.set(0, WALL, -L / 2);
  // ribs across the vault, and pillars down both sides
  const ribGeo = new THREE.TorusGeometry(R - 0.1, 0.22, 8, 36, Math.PI);
  for (let z = -2; z >= -30; z -= 4) {
    const rib = add(new THREE.Mesh(ribGeo, M.stoneLight), G, false); rib.position.set(0, WALL, z);
    for (const s of [-1, 1]) {
      const px = s * 4.6;
      cyl(0.42, 0.48, WALL, M.stone, px, WALL / 2, z, 16, G);
      box(1.1, 0.35, 1.1, M.stoneLight, px, 0.17, z, G);
      box(1.1, 0.3, 1.1, M.stoneLight, px, WALL - 0.1, z, G);
      RM.addCircle(px, z, 0.55);
    }
  }
  // arcades between the pillars
  const arcGeo = new THREE.TorusGeometry(2, 0.2, 6, 20, Math.PI);
  for (let z = -4; z >= -30; z -= 4) for (const s of [-1, 1]) { const a = add(new THREE.Mesh(arcGeo, M.stoneLight), G, false); a.rotation.y = Math.PI / 2; a.position.set(s * 4.6, WALL - 2, z + 2); }
  // sarcophagi of old Ravenmoor dead along the side aisles
  for (const z of [-6, -10, -14, -22, -26]) for (const s of [-1, 1]) {
    if (s < 0 && z === -14) continue; // the hole is here
    const sx = s * 5.4;
    box(0.95, 0.8, 2.1, M.stone, sx, 0.4, z, G, true);
    box(1.05, 0.14, 2.2, M.stoneLight, sx, 0.87, z, G);
    const eff = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 1.6), M.stoneLight), G); eff.position.set(sx, 1.04, z);
    const hd = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), M.stoneLight), G); hd.position.set(sx, 1.1, z - 0.85);
  }
  // cobwebs in the corners of the arches
  for (let i = 0; i < 14; i++) { const wbm = add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), M.web), G, false, false); const s = i % 2 ? 1 : -1; wbm.position.set(s * 5.8, rand(2.6, 4.2), -2 - (i >> 1) * 4.2); wbm.rotation.set(0, s > 0 ? -Math.PI / 2 : Math.PI / 2, rand(TAU)); }
  // bones heaped along the walls
  for (let i = 0; i < 9; i++) bonePile(RM.pick([-5.6, 5.6]), rand(-30, -2), 8, G);
  bonePile(-5.4, -14, 18, G); bonePile(-5.0, -13, 10, G);

  // YOUR coffin, on a dais under the moon-grate
  box(3.4, 0.3, 4.6, M.stoneLight, 0, 0.15, -28, G, true);
  const cof = new THREE.Group(); cof.position.set(0, 0.3, -28); G.add(cof);
  const cb = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 2.2), M.darkWood), cof); cb.position.y = 0.275;
  const lin = add(new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 2.06), M.velvet), cof); lin.position.y = 0.5;
  const lidG = new THREE.Group(); lidG.position.set(0.45, 0.55, 0); cof.add(lidG);
  const lid = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 2.2), M.darkWood), lidG); lid.position.set(-0.45, 0.04, 0);
  const cross = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.8), M.gold), lidG); cross.position.set(-0.45, 0.09, -0.2);
  const crossB = add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.08), M.gold), lidG); crossB.position.set(-0.45, 0.09, -0.35);
  w.data.coffinLid = lidG; // closed at rotation.z = 0; open when swung up
  w.data.coffinCol = RM.addCollider(-0.5, -29.2, 0.5, -26.8);
  // a name plate on the coffin (painted once you've chosen a name)
  const plateC = document.createElement('canvas'); plateC.width = 256; plateC.height = 64;
  const plateT = new THREE.CanvasTexture(plateC); plateT.encoding = THREE.sRGBEncoding;
  const plate = add(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshStandardMaterial({ map: plateT, metalness: 0.7, roughness: 0.35 })), cof, false); plate.position.set(0, 0.3, 1.105);
  w.data.setPlate = (name) => { const g = plateC.getContext('2d'); g.fillStyle = '#9a7a38'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#5a4418'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56); g.fillStyle = '#2a1a08'; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.fillText(name.toUpperCase(), 128, 43); plateT.needsUpdate = true; };
  // moonlight through a grate high in the vault, falling on your coffin
  const moonSpot = new THREE.SpotLight(0x9fb4ff, 3.2, 20, 0.34, 0.6, 1.1);
  moonSpot.position.set(0.6, 10, -27); moonSpot.target.position.set(0, 0, -28); moonSpot.castShadow = true; moonSpot.shadow.mapSize.set(1024, 1024);
  G.add(moonSpot, moonSpot.target);
  RM.lightShaft(0.3, 5.2, -27.5, 0.45, 1.5, 10, 0x9fb4ff, 0.06, 0.05, G);
  const grate = add(new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ color: 0x8fa2d8, fog: false })), G, false, false); grate.position.set(0.6, R + WALL - 0.12, -27); grate.rotation.x = Math.PI / 2;
  RM.dust(-1.4, 0.2, -29.5, 1.6, 8, -25.5, 160, 0xcfd8ff, 0.03, G);
  // the altar with the red chalice
  box(2.2, 1.0, 1.0, M.stoneLight, 0, 0.5, -19.5, G, true);
  box(2.4, 0.1, 1.2, M.stone, 0, 1.03, -19.5, G);
  const cup = new THREE.Group(); cup.position.set(0, 1.08, -19.5); G.add(cup);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.03, 16), M.gold), cup).position.y = 0.015;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8), M.gold), cup).position.y = 0.09;
  const bowl = add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10, 0, TAU, Math.PI / 2, Math.PI / 2), M.gold), cup); bowl.position.y = 0.24; bowl.rotation.x = Math.PI;
  const wine = add(new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshStandardMaterial({ color: 0x5a0010, emissive: 0x3a0008, roughness: 0.1, metalness: 0.3 })), cup, false); wine.rotation.x = -Math.PI / 2; wine.position.y = 0.235;
  w.data.chalice = cup; w.data.chaliceWine = wine;
  RM.glow(0, 1.36, -19.5, 0xa01020, 0.7, 0.35, G);
  candleCluster(-0.85, 1.08, -19.4, 4, 1.4, G); candleCluster(0.85, 1.08, -19.4, 3, 0, G);
  // candles on pillar bases
  for (const [x, z, li] of [[-4.6, -26, 1.2], [4.6, -26, 1.2], [-4.6, -14, 1.0], [4.6, -10, 1.0], [-4.6, -6, 0.8], [4.6, -2, 0.9]]) candleCluster(x + (x < 0 ? 0.55 : -0.55), 0.35, z + 0.6, 3, li, G);
  // iron gate at the entrance (smashable)
  const gate = new THREE.Group(); gate.position.set(0, 0, 0.1); G.add(gate);
  for (let i = 0; i <= 9; i++) { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.5, 6), M.iron), gate); b.position.set(-2 + i * 0.444, 1.75, 0); const sp = add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), M.iron), gate); sp.position.set(-2 + i * 0.444, 3.55, 0); }
  for (const y of [0.4, 1.9, 3.3]) { const r = add(new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.07, 0.07), M.iron), gate); r.position.y = y; }
  const padlock = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.08), M.rust), gate); padlock.position.set(0, 1.6, -0.08);
  w.data.gate = gate; w.data.gateCol = RM.addCollider(-2.2, -0.1, 2.2, 0.35);
  // stairs up to the graveyard beyond the gate
  for (let i = 0; i < 14; i++) box(4, 0.3, 0.55, M.stoneLight, 0, i * 0.3 + 0.15, 0.8 + i * 0.55, G);
  box(0.5, 9, 9, M.cryptWall, -2.25, 4.5, 4.6, G, true); box(0.5, 9, 9, M.cryptWall, 2.25, 4.5, 4.6, G, true);
  box(5, 0.5, 9, M.cryptWall, 0, 8.4, 4.6, G);
  const doorGlow = add(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3), new THREE.MeshBasicMaterial({ color: 0x5a6a9a, fog: false })), G, false, false); doorGlow.position.set(0, 5.4, 8.9); doorGlow.rotation.y = Math.PI;
  RM.addCollider(-2.5, 9.0, 2.5, 9.6);
  w.groundAt = (x, z) => (z > 0.55 && Math.abs(x) < 2.2 ? Math.min(Math.max(0, (z - 0.55) / 0.55) * 0.3, 4.2) : 0);
  // the hole into the tunnels, blocked by a slump of bones until you choose to crawl through
  const heap = new THREE.Group(); G.add(heap);
  for (let i = 0; i < 26; i++) { const s = add(new THREE.Mesh(new THREE.SphereGeometry(rand(0.07, 0.11), 8, 6), M.bone), heap); s.position.set(-6.2 + rand(-0.3, 0.3), rand(0.05, 1.7), -14 + rand(-1.1, 1.1)); }
  w.data.holeHeap = heap; w.data.holeCol = RM.addCollider(-6.6, -15.2, -5.9, -12.8);

  /* ----------------------------------------------------- bone tunnels */
  const TH = 2.7;
  const tunFloor = add(new THREE.Mesh(new THREE.PlaneGeometry(12 * TC, 11 * TC), new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptFloor, 8, 8), roughness: 0.9, color: 0x6a6258 })), G, false, true);
  tunFloor.rotation.x = -Math.PI / 2; tunFloor.position.set(TOX + 6 * TC, 0.001, TOZ + 5.5 * TC);
  const tunCeil = add(new THREE.Mesh(new THREE.PlaneGeometry(12 * TC, 11 * TC), new THREE.MeshStandardMaterial({ map: RM.retex(TEX.cryptStone, 10, 10), roughness: 1, color: 0x55505a })), G, false, false);
  tunCeil.rotation.x = Math.PI / 2; tunCeil.position.set(TOX + 6 * TC, TH, TOZ + 5.5 * TC);
  const wallGeo = new THREE.BoxGeometry(TC, TH, TC);
  for (let r = 0; r < TUN.length; r++) for (let c = 0; c < TUN[r].length; c++) {
    if (TUN[r][c] !== '#') continue;
    let vis = false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const ch = (TUN[r + dr] || '')[c + dc]; if (ch && ch !== '#') vis = true; }
    if (!vis) continue;
    const m = add(new THREE.Mesh(wallGeo, M.skulls), G, false, true); m.position.set(tcx(c), TH / 2, tcz(r));
    RM.addCollider(tcx(c) - TC / 2, tcz(r) - TC / 2, tcx(c) + TC / 2, tcz(r) + TC / 2);
  }
  // the chamber of the chained coffin 😱
  const cx = tcx(2), cz = tcz(8);
  const big = new THREE.Group(); big.position.set(cx, 0, cz); G.add(big);
  box(3.2, 0.35, 5, M.stone, 0, 0.17, 0, big);
  const bigBody = box(1.9, 1.25, 3.8, M.darkWood, 0, 0.97, 0, big);
  for (const z of [-1.4, -0.4, 0.6, 1.5]) box(1.96, 1.3, 0.1, M.rust, 0, 0.97, z, big);
  const bigLid = new THREE.Group(); bigLid.position.set(0, 1.6, 0); big.add(bigLid);
  box(2.0, 0.14, 3.9, M.darkWood, 0, 0.07, 0, bigLid);
  box(0.1, 0.03, 1.8, M.iron, 0, 0.16, -0.4, bigLid); box(0.8, 0.03, 0.1, M.iron, 0, 0.16, -0.9, bigLid);
  w.data.bigLid = bigLid; w.data.bigCoffin = { x: cx, z: cz };
  RM.addCollider(cx - 1.6, cz - 2.5, cx + 1.6, cz + 2.5);
  // seven chains pin it down (you may break one)
  w.data.chains = [];
  const anchors = [[-2.9, 2.2, -2.2], [2.9, 2.2, -2.2], [-2.9, 2.2, 0], [2.9, 2.2, 0], [-2.9, 2.2, 2.2], [2.9, 2.2, 2.2], [0, 2.5, 3.4]];
  for (const [ax, ay, az] of anchors) {
    const grp = new THREE.Group(); big.add(grp);
    chain(ax, ay, az, Math.sign(ax) * 0.85, 1.55, az * 0.6, grp, 0.35);
    w.data.chains.push(grp);
  }
  for (const [x, z] of [[-1.4, -2.2], [1.4, -2.2], [-1.4, 2.2], [1.4, 2.2]]) { cyl(0.05, 0.06, 0.5, M.redWax, cx + x, 0.6, cz + z, 8, G); RM.flame(cx + x, 0.85, cz + z, { size: 0.08, light: x < 0 && z < 0 ? 1.1 : 0, color: 0xff5530, parent: G }); }
  bonePile(cx - 1.8, cz + 3, 14, G);
  // candles along the tunnels, and the ladder with moonlight falling down it
  for (const [c, r] of [[9, 5], [7, 3], [5, 5], [1, 4], [3, 2], [8, 1], [5, 8], [10, 9]]) candleCluster(tcx(c) + rand(-0.5, 0.5), 0, tcz(r) + rand(-0.5, 0.5), 2, (c + r) % 3 === 0 ? 0.9 : 0.5, G);
  const lx = tcx(1), lz = tcz(1);
  for (const s of [-1, 1]) box(0.08, 4.6, 0.08, M.wood, lx + s * 0.3, 2.3, lz - 0.9, G);
  for (let i = 0; i < 11; i++) box(0.6, 0.06, 0.06, M.wood, lx, 0.3 + i * 0.4, lz - 0.9, G);
  RM.lightShaft(lx, 1.6, lz - 0.6, 0.45, 0.9, 3.2, 0x9fb4ff, 0.08, 0, G);
  const hole = new THREE.SpotLight(0x9fb4ff, 2.2, 8, 0.6, 0.6, 1.2); hole.position.set(lx, TH + 2, lz - 0.7); hole.target.position.set(lx, 0, lz - 0.2); G.add(hole, hole.target);
  w.data.ladder = { x: lx, z: lz - 0.3 };
  w.data.memory = { x: tcx(4), z: tcz(5) };
  RM.dust(TOX, 0.2, TOZ, TOX + 12 * TC, TH, TOZ + 11 * TC, 260, 0xd8c8a8, 0.025, G);
});

/* =============================================================== TOWN */
function roofPrism(w, rh, len, over = 0.35) {
  const s = new THREE.Shape(); s.moveTo(-w / 2 - over, 0); s.lineTo(w / 2 + over, 0); s.lineTo(0, rh); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len + over * 2, bevelEnabled: false });
  g.translate(0, 0, -(len + over * 2) / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.25, uv.getY(i) * 0.25);
  return g;
}
// one house: width along the street, depth back from it, front facing local −z
function house(x, z, rotY, W, D, floors, opts = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; RM.world.group.add(g);
  const FH = 3.1, H = floors * FH;
  const pm = RM.pick(plasterMats);
  const stoneBase = Math.random() < 0.5;
  // ground floor (stone or plaster) and jettied upper floors that lean out over the street
  const base = box(W, stoneBase ? FH : H, D, stoneBase ? M.houseStone : pm, 0, (stoneBase ? FH : H) / 2, 0, g);
  if (stoneBase) {
    const tex = RM.retex(TEX.plaster, W / 4, (H - FH) / 3); const um = new THREE.MeshStandardMaterial({ map: tex, color: pm.color, roughness: 0.92 });
    box(W + 0.4, H - FH, D + 0.4, um, 0, FH + (H - FH) / 2, -0.2, g);
  } else base.material = new THREE.MeshStandardMaterial({ map: RM.retex(TEX.plaster, W / 4, H / 3), color: pm.color, roughness: 0.92 });
  // roof: gable to the street or along it
  const rh = rand(2.2, 3.6), gable = opts.gable !== undefined ? opts.gable : Math.random() < 0.6;
  const rm = new THREE.Mesh(roofPrism(gable ? W + 0.4 : D + 0.4, rh, gable ? D + 0.4 : W + 0.4), M.roof);
  rm.position.set(0, H, -0.2); if (!gable) rm.rotation.y = Math.PI / 2; add(rm, g);
  if (gable) { // plaster gable end facing the street
    const s = new THREE.Shape(); s.moveTo(-W / 2 - 0.2, 0); s.lineTo(W / 2 + 0.2, 0); s.lineTo(0, rh - 0.15); s.closePath();
    const gm = add(new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ map: RM.retex(TEX.plaster, 1, 1), color: pm.color, roughness: 0.92 })), g);
    gm.position.set(0, H, -D / 2 - 0.41); gm.rotation.y = Math.PI;
    const aw = add(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), Math.random() < 0.35 ? M.litWin : M.darkWin), g, false); aw.position.set(0, H + rh * 0.35, -D / 2 - 0.43); aw.rotation.y = Math.PI;
  }
  // chimney
  if (Math.random() < 0.7) box(0.7, rh + 1.4, 0.7, M.houseStone, rand(-W / 3, W / 3), H + (rh + 1.4) / 2 - 0.3, rand(-D / 4, D / 4), g);
  // windows + door on the street face
  const fz = -D / 2 - (stoneBase ? 0.42 : 0.02);
  const cols = Math.max(1, Math.floor(W / 2.2));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const wx = -W / 2 + (c + 0.5) * (W / cols);
    if (f === 0 && c === Math.floor(cols / 2)) continue; // leave room for the door
    const lit = Math.random() < (opts.lit || 0.3);
    const win = add(new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.25), lit ? M.litWin : M.darkWin), g, false);
    win.position.set(wx, f * FH + 1.75, (f === 0 ? -D / 2 - 0.02 : fz) - 0.01); win.rotation.y = Math.PI;
    box(1.05, 0.1, 0.18, M.darkWood, wx, f * FH + 1.08, (f === 0 ? -D / 2 : fz) - 0.08, g);
    if (lit && Math.random() < 0.3) RM.glow(0, 0, 0, 0xffa050, 2.2, 0.2, g).position.set(wx, f * FH + 1.75, (f === 0 ? -D / 2 : fz) - 0.3);
  }
  const dx = -W / 2 + (Math.floor(cols / 2) + 0.5) * (W / cols);
  const door = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), M.darkWood), g, false); door.position.set(dx, 1.05, -D / 2 - 0.02); door.rotation.y = Math.PI;
  box(1.35, 0.14, 0.2, M.darkWood, dx, 2.15, -D / 2 - 0.1, g);
  box(1.4, 0.1, 0.5, M.houseStone, dx, 0.05, -D / 2 - 0.25, g);
  if (opts.sign) { const sg = box(0.9, 0.6, 0.06, M.darkWood, dx + 1.1, 2.9, -D / 2 - 0.9, g); sg.rotation.y = Math.PI / 2; box(0.05, 0.05, 1.0, M.iron, dx + 1.1, 3.25, -D / 2 - 0.5, g); }
  g.updateMatrixWorld(true);
  RM.solid(base, 0);
  if (RM.world.data.roofs) RM.world.data.roofs.push({ g, W, D, H: H + rh, ridge: gable ? 'z' : 'x' });
  return { g, H, rh, door: g.localToWorld(new THREE.Vector3(dx, 0, -D / 2 - 0.6)) };
}
RM.build.house = house;
// a row of houses butted together along a line (so there are no gaps to slip through)
function row(x0, z0, dirx, dirz, length, rotY, depth, opts = {}) {
  let t = 0; const out = [];
  while (t < length - 0.1) {
    const W = Math.min(length - t, rand(5.2, 8.5)), floors = RM.pick([2, 2, 3, 3, 4]);
    const cx = x0 + dirx * (t + W / 2), cz = z0 + dirz * (t + W / 2);
    // push the house back from the street by half its depth
    const nx = -Math.sin(rotY + Math.PI), nz = -Math.cos(rotY + Math.PI); // "backwards" from its front
    out.push(house(cx + nx * depth / 2, cz + nz * depth / 2, rotY, W, depth, floors, opts));
    t += W;
  }
  return out;
}
function lampPost(x, z, light, parent) {
  const P = parent || RM.world.group;
  cyl(0.06, 0.09, 3.6, M.iron, x, 1.8, z, 8, P);
  box(0.5, 0.05, 0.05, M.iron, x, 3.5, z, P);
  const lamp = box(0.3, 0.4, 0.3, new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffa040, emissiveIntensity: 1.6, roughness: 0.4 }), x, 3.25, z, P);
  box(0.36, 0.06, 0.36, M.iron, x, 3.48, z, P);
  RM.glow(x, 3.25, z, 0xffa050, 4, 0.55, P);
  let L = null; if (light) { L = new THREE.PointLight(0xffa860, light, 16, 1.6); L.position.set(x, 3.0, z); P.add(L); }
  RM.addCircle(x, z, 0.18, P === RM.actors ? 'prop' : undefined);
  return { lamp, L };
}
RM.build.lampPost = lampPost;

RM.defineWorld('town', (w) => {
  const G = w.group; w.data.roofs = [];
  const P = (w.data.P = {
    mausoleum: { x: 0, z: 51.5 }, tunnelExit: { x: -12, z: 44 }, gideon: { x: 9, z: 41 },
    gate: { x: 0, z: 30 }, alley: { x: 18, z: 0 }, shed: { x: 27.2, z: 0 },
    well: { x: 0, z: -38 }, bakery: { x: -19.2, z: -44 }, thief: { x: 13.5, z: -29 }, secretDoor: { x: 0, z: -53.4 },
    stallA: { x: -10, z: -30 }, stallB: { x: 10, z: -31 }, stallC: { x: -9, z: -45 }, stallD: { x: 11, z: -45 },
    tower: { x: -32, z: 33 },
  });
  // ground
  const gr = add(new THREE.Mesh(new THREE.PlaneGeometry(420, 420), M.grass), G, false, true); gr.rotation.x = -Math.PI / 2;
  const street = (x0, z0, x1, z1, mat = M.cobble) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat.clone()); m.material.map = RM.retex(TEX.cobble, (x1 - x0) / 4, (z1 - z0) / 4);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.01, (z0 + z1) / 2); add(m, G, false, true);
  };
  street(-4, -22, 4, 31); street(-20, -54, 20, -22); street(4, -1.6, 31, 1.6);
  street(-2.2, 31, 2.2, 52);
  // --- main street rows (west faces +x, east faces −x), split for the alley
  row(-4, 28, 0, -1, 42, -Math.PI / 2, 8, { lit: 0.35 });
  row(4, 28, 0, -1, 26.4, Math.PI / 2, 8, { lit: 0.35 });
  row(4, -1.6, 0, -1, 12.4, Math.PI / 2, 8, { lit: 0.3 });
  // alley: tall, close, dark
  row(12, -1.6, 1, 0, 19, Math.PI, 7, { lit: 0.12 });
  row(12, 1.6, 1, 0, 19, 0, 7, { lit: 0.12 });
  box(0.6, 8, 3.4, M.houseStone, 31.3, 4, 0, G, true);
  // market ring
  row(-20, -22, 1, 0, 16, 0, 8, { lit: 0.4 }); row(4, -22, 1, 0, 16, 0, 8, { lit: 0.4 });
  row(-20, -22, 0, -1, 18.2, -Math.PI / 2, 8, { lit: 0.4 });
  const bake = house(-24, -44.2, -Math.PI / 2, 8, 8, 2, { lit: 1, sign: true, gable: true });
  row(-20, -48.2, 0, -1, 5.8, -Math.PI / 2, 8, { lit: 0.4 });
  row(20, -22, 0, -1, 32, Math.PI / 2, 8, { lit: 0.4 });
  RM.glow(-19.6, 1.8, -44, 0xffa050, 5, 0.3, G);
  void bake;
  // north wall under Vane's hill, with the iron door that shouldn't be there
  box(40.5, 6, 1.2, M.houseStone, 0, 3, -54.6, G, true);
  const sd = new THREE.Group(); sd.position.set(0, 0, -53.95); G.add(sd);
  box(2.2, 3.2, 0.2, M.iron, 0, 1.6, 0, sd);
  for (let i = 0; i < 6; i++) box(0.06, 3.1, 0.06, M.rust, -0.9 + i * 0.36, 1.6, 0.12, sd);
  const vr = box(0.5, 0.5, 0.05, M.gold, 0, 2.5, 0.14, sd); vr.rotation.z = Math.PI / 4;
  w.data.secretDoor = sd;
  for (const x of [-14, 14]) { box(0.8, 7.4, 0.8, M.houseStone, x, 3.7, -54, G); lampPost(x, -52.8, 0, G); }
  // stalls, the well, crates
  const stall = (x, z, color) => {
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide });
    box(3, 0.9, 1.4, M.wood, x, 0.45, z, G, true);
    for (const [dx, dz] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.6], [1.4, 0.6]]) box(0.1, 2.6, 0.1, M.darkWood, x + dx, 1.3, z + dz, G);
    const aw = add(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2), cloth), G); aw.position.set(x, 2.55, z); aw.rotation.x = -Math.PI / 2 + 0.25;
    for (let i = 0; i < 5; i++) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: RM.pick([0x8a2a1a, 0x6a7a2a, 0xa08030]), roughness: 0.7 })), G); c.position.set(x + rand(-1.2, 1.2), 0.98, z + rand(-0.5, 0.5)); }
  };
  stall(P.stallA.x, P.stallA.z, 0x7a1a2a); stall(P.stallB.x, P.stallB.z, 0x2a4a6a); stall(P.stallC.x, P.stallC.z, 0x4a5a2a); stall(P.stallD.x, P.stallD.z, 0x6a3a1a);
  cyl(1.3, 1.4, 0.9, M.houseStone, P.well.x, 0.45, P.well.z, 20, G); RM.addCircle(P.well.x, P.well.z, 1.45);
  for (const s of [-1, 1]) box(0.14, 2.2, 0.14, M.darkWood, P.well.x + s * 1.1, 1.3, P.well.z, G);
  box(2.5, 0.14, 0.14, M.darkWood, P.well.x, 2.35, P.well.z, G);
  const bucket = cyl(0.18, 0.14, 0.3, M.wood, P.well.x, 1.5, P.well.z, 10, G); void bucket;
  for (const [x, z] of [[16, -24.5], [16.8, -25.4], [-16, -50], [-15, -51], [17.5, -50], [5, -2.5], [24, 2.6], [26, -2.7], [28.5, 2.4]]) { const c = box(1, 1, 1, M.wood, x, 0.5, z, G, true); c.rotation.y = rand(0.3); }
  // Pip's shed at the end of the alley
  const shed = new THREE.Group(); shed.position.set(P.shed.x + 1.3, 0, 0); G.add(shed);
  box(2.4, 2.4, 3, M.wood, 0, 1.2, 0, shed); const shr = add(new THREE.Mesh(roofPrism(3.2, 0.9, 2.6), M.darkWood), shed); shr.rotation.y = Math.PI / 2; shr.position.y = 2.4;
  const shDoor = box(0.05, 1.9, 1, M.darkWood, -1.23, 0.95, 0, shed); void shDoor;
  RM.addCollider(P.shed.x + 0.1, -1.5, P.shed.x + 2.5, 1.5);
  // lamps
  const lamps = [[3.4, 22, 1.6], [-3.4, 10, 1.6], [3.4, -2.8, 1.3], [-3.4, -14, 1.6], [-16, -26, 1.6], [16, -34, 1.6], [-16, -40, 0], [16, -48, 1.4], [20, 1.2, 0.7], [-2.6, 34, 0], [2.6, 34, 0]];
  w.data.lamps = lamps.map(([x, z, l]) => lampPost(x, z, RM.quality === 'high' || l >= 1.6 ? l : 0, G));

  // --- the graveyard, the church and its bell tower
  const wallM = M.houseStone;
  box(19, 1.2, 0.5, wallM, -12.5, 0.6, 30, G, true); box(19, 1.2, 0.5, wallM, 12.5, 0.6, 30, G, true);
  box(0.5, 1.2, 33, wallM, 22, 0.6, 46.5, G, true); box(0.5, 1.2, 33, wallM, -22, 0.6, 46.5, G, true);
  box(44.5, 1.2, 0.5, wallM, 0, 0.6, 63, G, true);
  for (const x of [-3, 3]) { box(0.7, 2.4, 0.7, M.stoneLight, x, 1.2, 30, G, true); const gh = RM.glow(x, 2.6, 30, 0x9fb4ff, 0.6, 0.2, G); void gh; }
  // the mausoleum (your way up from the crypt)
  const mz = 56;
  box(7, 4.6, 6, M.stoneLight, 0, 2.3, mz, G, true);
  const mr = add(new THREE.Mesh(roofPrism(7.4, 2, 6.2, 0.2), M.stone), G); mr.position.set(0, 4.6, mz);
  for (const x of [-2.6, -1.3, 1.3, 2.6]) { cyl(0.22, 0.25, 4.2, M.stoneLight, x, 2.1, mz - 3.3, 14, G); RM.addCircle(x, mz - 3.3, 0.3); }
  box(7.2, 0.5, 1.6, M.stoneLight, 0, 4.4, mz - 3.3, G);
  const md = add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3), new THREE.MeshStandardMaterial({ color: 0x050508 })), G, false); md.position.set(0, 1.5, mz - 3.01); md.rotation.y = Math.PI;
  const angel = new THREE.Group(); angel.position.set(0, 6.6, mz - 1.5); G.add(angel);
  add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 10), M.stoneLight), angel).position.y = 0.2;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), M.stoneLight), angel).position.y = 1.0;
  for (const s of [-1, 1]) { const wg = add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.06), M.stoneLight), angel); wg.position.set(s * 0.45, 0.6, 0.2); wg.rotation.set(0.2, s * 0.5, s * -0.4); }
  // gravestones
  const graveMat = [M.stone, M.stoneLight];
  const graves = [];
  for (let gx = -19; gx <= 19; gx += 3.2) for (let gz = 33; gz <= 61; gz += 3.6) {
    if (Math.abs(gx) < 3.2) continue; // the path
    if (Math.abs(gx - P.gideon.x) < 3 && Math.abs(gz - P.gideon.z) < 3) continue;
    if (Math.abs(gx - P.tunnelExit.x) < 2.2 && Math.abs(gz - P.tunnelExit.z) < 2.2) continue;
    if (Math.abs(gx) < 5 && gz > 50) continue;
    if (Math.random() < 0.18) continue;
    const x = gx + rand(-0.4, 0.4), z = gz + rand(-0.6, 0.6), t = Math.random();
    const gm = RM.pick(graveMat);
    let s;
    if (t < 0.5) { s = box(0.8, rand(0.8, 1.3), 0.2, gm, x, 0.5, z, G); s.position.y = s.geometry.parameters.height / 2; const top = add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16, 1, false, -Math.PI / 2, Math.PI), gm), G); top.rotation.x = -Math.PI / 2; top.position.set(x, s.geometry.parameters.height, z); }
    else if (t < 0.8) { s = box(0.16, 1.6, 0.16, gm, x, 0.8, z, G); box(0.8, 0.16, 0.16, gm, x, 1.15, z, G); }
    else { s = box(1.0, 0.5, 2.0, gm, x, 0.25, z, G); box(0.9, 0.9, 0.18, gm, x, 0.9, z - 0.95, G); }
    s.rotation.z = rand(-0.12, 0.12); s.rotation.y = rand(-0.15, 0.15);
    RM.addCircle(x, z, 0.5);
    graves.push({ x, z });
  }
  w.data.graves = graves;
  // the tunnel exit: a slab pushed aside over a hole
  const slab = box(1.2, 0.18, 2.2, M.stone, P.tunnelExit.x + 1.1, 0.12, P.tunnelExit.z, G); slab.rotation.y = 0.5;
  const pit = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), new THREE.MeshBasicMaterial({ color: 0x020203 })), G, false, false); pit.rotation.x = -Math.PI / 2; pit.position.set(P.tunnelExit.x, 0.02, P.tunnelExit.z);
  // Gideon's half-dug grave
  const hole = add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshBasicMaterial({ color: 0x050403 })), G, false, false); hole.rotation.x = -Math.PI / 2; hole.position.set(P.gideon.x - 1.4, 0.02, P.gideon.z);
  const mound = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2), M.dirt), G); mound.scale.set(1, 0.45, 1.3); mound.position.set(P.gideon.x - 3.1, 0, P.gideon.z);
  RM.addCircle(P.gideon.x - 3.1, P.gideon.z, 0.9);
  RM.addCollider(P.gideon.x - 1.95, P.gideon.z - 1.1, P.gideon.x - 0.85, P.gideon.z + 1.1);
  // dead trees with ravens' perches
  w.data.perches = [];
  for (const [x, z, h] of [[-16, 36, 7], [15, 58, 8], [-9, 60, 6], [18, 36, 6.5], [-18, 55, 7.5]]) w.data.perches.push(...deadTree(x, z, h, G));
  // the church
  const church = new THREE.Group(); church.position.set(-33, 0, 47); G.add(church);
  box(12, 11, 20, M.houseStone, 0, 5.5, 0, church);
  const cr = add(new THREE.Mesh(roofPrism(12.6, 7, 20.4, 0.2), M.roof), church); cr.position.y = 11;
  for (const z of [-6, 0, 6]) for (const s of [-1, 1]) { const wn = add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4), M.litWin), church, false); wn.position.set(s * 6.03, 5, z); wn.rotation.y = s * Math.PI / 2; }
  const rose = add(new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshStandardMaterial({ color: 0x6a1a30, emissive: 0xa02040, emissiveIntensity: 1.2 })), church, false); rose.position.set(0, 8.5, -10.03); rose.rotation.y = Math.PI;
  RM.glow(-33, 8.5, 36.6, 0xc02040, 7, 0.25, G);
  church.updateMatrixWorld(true); RM.addCollider(-39, 37, -27, 57);
  // bell tower — the tallest thing in Ravenmoor; you can see it from everywhere
  const tw = new THREE.Group(); tw.position.set(P.tower.x, 0, P.tower.z); G.add(tw);
  box(6.5, 26, 6.5, M.houseStone, 0, 13, 0, tw);
  box(7.2, 0.6, 7.2, M.stoneLight, 0, 20, 0, tw); box(7.2, 0.6, 7.2, M.stoneLight, 0, 26.3, 0, tw);
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) box(1.2, 5.4, 1.2, M.houseStone, x, 23.3, z, tw);
  const bell = add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.3, 1.8, 20, 1, true), M.gold), tw); bell.position.y = 23.6; bell.material.side = THREE.DoubleSide;
  RM.glow(P.tower.x, 23.4, P.tower.z, 0xffa050, 8, 0.35, G);
  const bl = new THREE.PointLight(0xffa050, 1.4, 14, 1.8); bl.position.set(0, 22.4, 0); tw.add(bl);
  const spire = add(new THREE.Mesh(new THREE.ConeGeometry(4.2, 12, 4), M.roof), tw); spire.position.y = 32.6; spire.rotation.y = Math.PI / 4;
  box(0.12, 2, 0.12, M.iron, 0, 39.6, 0, tw); box(1, 0.12, 0.12, M.iron, 0, 39.9, 0, tw);
  w.data.bellTop = { x: P.tower.x, y: 30, z: P.tower.z };
  RM.addCollider(P.tower.x - 3.3, P.tower.z - 3.3, P.tower.x + 3.3, P.tower.z + 3.3);

  // --- far skyline so Ravenmoor feels like a whole town, and Vane Manor on its hill
  const skyM = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 1 });
  const skyLit = new THREE.MeshBasicMaterial({ color: 0xffa050 });
  for (let i = 0; i < 70; i++) {
    const a = rand(TAU), d = rand(60, 110), x = Math.cos(a) * d + 4, z = Math.sin(a) * d - 10;
    if (z > 20 && Math.abs(x) < 50) continue; // keep the view past the graveyard open
    const h = rand(6, 16), wd = rand(5, 10);
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(wd, h, wd), skyM), G, false, false); b.position.set(x, h / 2, z); b.rotation.y = rand(TAU);
    const r = add(new THREE.Mesh(roofPrism(wd, rand(2, 5), wd), skyM), G, false, false); r.position.set(x, h, z); r.rotation.y = b.rotation.y;
    if (Math.random() < 0.5) { const l = add(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), skyLit), G, false, false); l.position.set(x, h * rand(0.3, 0.8), z); l.lookAt(0, h * 0.5, 0); l.translateZ(wd * 0.52); }
  }
  // the hill and the manor
  const hill = add(new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x141a18, roughness: 1 })), G, false, false);
  hill.scale.set(1.6, 0.35, 0.8); hill.position.set(0, -2, -150);
  const manor = new THREE.Group(); manor.position.set(0, 24, -150); G.add(manor);
  const mm = new THREE.MeshStandardMaterial({ color: 0x14121a, roughness: 1 });
  add(new THREE.Mesh(new THREE.BoxGeometry(46, 16, 14), mm), manor, false, false).position.y = 8;
  for (const x of [-26, 26]) { add(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 30, 12), mm), manor, false, false).position.set(x, 15, 0); const sp = add(new THREE.Mesh(new THREE.ConeGeometry(5, 12, 12), mm), manor, false, false); sp.position.set(x, 36, 0); }
  add(new THREE.Mesh(new THREE.ConeGeometry(8, 14, 4), mm), manor, false, false).position.set(0, 23, 0);
  for (let i = 0; i < 22; i++) { const l = add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({ color: Math.random() < 0.3 ? 0xff3040 : 0xffa860 })), manor, false, false); l.position.set(rand(-20, 20), rand(3, 14), 7.05); }
  RM.glow(0, 34, -142, 0xa01020, 40, 0.18, G);

  // --- mist in the streets and over the graves
  RM.mist(0, 46, 46, 34, 0.35, 0.2, 0xaab8e0, G); RM.mist(0, 46, 46, 34, 0.9, 0.12, 0xaab8e0, G);
  RM.mist(0, 4, 10, 54, 0.3, 0.12, 0xa0b0d8, G); RM.mist(0, -38, 40, 32, 0.3, 0.12, 0xa0b0d8, G); RM.mist(20, 0, 24, 4, 0.3, 0.15, 0xa0b0d8, G);
  // boundaries you can't wander past
  RM.addCollider(-22.6, 30, -22, 63.5); RM.addCollider(22, 30, 22.6, 63.5);
  RM.addCollider(-40, 27.9, -4, 30); RM.addCollider(4, 27.9, 40, 30);
});
})();
