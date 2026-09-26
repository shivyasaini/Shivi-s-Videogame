/* =====================================================================
   RAVENMOOR — NIGHT TWO: THE WITCH-FINDER
   New places: the moor (a rotten bridge over the River Rook) and the
   inside of St. Corvina's church. New people: Tobias Crook the
   witch-finder, Sister Imelda, and the masked Hollow Choir.
   Every choice here is something you play.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { clamp, lerp, rand, TAU } = RM;
const P = RM.player, AU = RM.AU, M = RM.MAT;
const S = () => RM.S;
const { box, cyl, add } = RM.build;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

RM.ENVS.moor = Object.assign({}, RM.ENVS.night, { fog: 0x1a2240, fogD: 0.017, hi: 0.72, mid: 0x1a2446, glow: 0x4a5a90, di: 1.15 });
RM.ENVS.church = Object.assign({}, RM.ENVS.crypt, { fog: 0x0e0a12, fogD: 0.028, hs: 0x7a6a98, hg: 0x1c1216, hi: 0.7, warm: 0.9, exp: 1.3 });

/* ---------------------------------------------------------- new people */
Object.assign(RM.LOOKS, {
  tobias: { name: 'Tobias', gender: 'boy', skin: '#e6b690', face: 'square', marks: 'scar', hair: 'short', hairColor: '#35200f', eyes: '#8b939c', outfit: 'coat', outfitColor: '#2a2018', extras: ['hat', 'crossbow'] },
  imelda: { name: 'Imelda', gender: 'girl', skin: '#8b5838', face: 'oval', marks: 'none', hair: 'veil', hairColor: '#111', eyes: '#5a391c', outfit: 'robe', outfitColor: '#141418', extras: ['cross'] },
  choir: { name: 'Choir', gender: 'neither', skin: '#e6b690', face: 'oval', marks: 'none', hair: 'hood', hairColor: '#111', eyes: '#111', outfit: 'robe', outfitColor: '#4a0812', extras: ['lantern'] },
});
const choirMember = (x, z, yaw) => RM.npc(RM.LOOKS.choir, x, z, yaw, { lantern: 1.5, vamp: { mask: true }, heartLabel: 'Hollow Choir' });

/* ============================================================ THE MOOR */
// hills, with the River Rook cut across them and a rotten footbridge at x=0
function moorH(x, z) {
  let h = Math.sin(x * 0.045) * Math.cos(z * 0.037) * 2.2 + Math.sin(x * 0.11 + z * 0.083) * 0.7 + Math.cos(z * 0.021 - x * 0.017) * 1.4;
  h *= 1 - 0.75 * Math.exp(-(x * x) / 70);                                 // the path is flatter
  const bank = clamp((Math.abs(z) - 5) / 10, 0, 1); h *= bank * bank * (3 - 2 * bank); // flat banks by the river
  return h;
}
const BED = -2.3;
function moorGround(x, z, bridge) {
  const az = Math.abs(z);
  if (az < 4.2) {
    if (bridge && Math.abs(x) < 1.15) return 0.12;
    return az < 3.2 ? BED : lerp(BED, 0, (az - 3.2) / 1.0);
  }
  return moorH(x, z);
}
RM.defineWorld('moor', (w) => {
  const G = w.group;
  w.data.bridgeUp = true;
  w.groundAt = (x, z) => moorGround(x, z, w.data.bridgeUp);
  // heather texture
  const heath = RM.canvasTex(512, 512, (g, W, H) => {
    g.fillStyle = '#231c22'; g.fillRect(0, 0, W, H);
    RM.speckle(g, W, H, 18000, ['#3a2436', '#2c2a1e', '#4a2c44', '#1c2016', '#35301e', '#50304a'], 3);
  }, { repeat: [60, 60] });
  const geo = new THREE.PlaneGeometry(260, 260, 150, 150); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, moorGround(p.getX(i), p.getZ(i), false));
  geo.computeVertexNormals();
  const ground = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: heath, roughness: 1 })), G, false, true);
  void ground;
  // the path
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 58, 2, 40), new THREE.MeshStandardMaterial({ color: 0x3a3024, roughness: 1 }));
  path.geometry.rotateX(-Math.PI / 2);
  const pp = path.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) + Math.sin(pp.getZ(i) * 0.08) * 1.2, z = pp.getZ(i) + 34; pp.setXYZ(i, x, moorGround(x, z, false) + 0.03, z); }
  add(path, G, false, true);
  // the river
  const water = add(new THREE.Mesh(new THREE.PlaneGeometry(260, 6.6), new THREE.MeshStandardMaterial({ color: 0x0c1826, roughness: 0.12, metalness: 0.65, transparent: true, opacity: 0.88 })), G, false, true);
  water.rotation.x = -Math.PI / 2; water.position.y = BED + 0.4; w.data.water = water;
  RM.mist(0, 0, 200, 10, BED + 0.7, 0.18, 0xaab8e0, G);
  // the rotten bridge
  const br = new THREE.Group(); G.add(br); w.data.bridge = br; w.data.planks = [];
  const rot = new THREE.MeshStandardMaterial({ map: RM.TEX.wood, color: 0x5a5048, roughness: 0.95 });
  for (let z = -4.9; z <= 4.9; z += 0.34) {
    if (Math.random() < 0.08) continue; // missing planks
    const pl = box(2.3, 0.08, 0.28, rot, rand(-0.05, 0.05), 0.08, z, br); pl.rotation.y = rand(-0.06, 0.06); pl.rotation.z = rand(-0.04, 0.04);
    w.data.planks.push(pl);
  }
  for (const sx of [-1.1, 1.1]) {
    const rail = box(0.1, 0.1, 10, rot, sx, 0.95, 0, br); rail.rotation.x = rand(-0.03, 0.03); w.data.planks.push(rail);
    for (const z of [-4.8, -2.4, 0, 2.4, 4.8]) { const post = box(0.12, 1.0 - BED, 0.12, rot, sx, (1.0 + BED) / 2, z, br); w.data.planks.push(post); }
  }
  // riverbanks you can't jump down (except where you're meant to)
  w.data.banks = [RM.addCollider(-130, -4.2, -1.25, 4.2), RM.addCollider(1.25, -4.2, 130, 4.2)];
  w.data.bridgeGap = RM.addCollider(-1.25, -3.6, 1.25, 3.6); w.data.bridgeGap.off = true;
  // heather clumps (instanced so there can be lots)
  const hm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: 0x3e2238, roughness: 1 }), 700);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (let i = 0; i < 700; i++) {
    let x = rand(-70, 70), z = rand(-60, 90); if (Math.abs(z) < 5.5 || (Math.abs(x) < 2.5 && z > 5)) { x += 6; }
    const s0 = rand(0.25, 0.7); sc.set(s0 * rand(1, 1.6), s0 * 0.6, s0 * rand(1, 1.6));
    m4.compose(vec(x, moorGround(x, z, false) + s0 * 0.2, z), q, sc); hm.setMatrixAt(i, m4);
    hm.setColorAt(i, new THREE.Color().setHSL(rand(0.8, 0.92), rand(0.2, 0.4), rand(0.1, 0.2)));
  }
  hm.receiveShadow = true; G.add(hm);
  // rocks, standing stones, dead trees, a gibbet
  const rockM = new THREE.MeshStandardMaterial({ color: 0x5a5a64, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const x = rand(-45, 45), z = rand(-40, 70); if (Math.abs(z) < 6 || Math.abs(x) < 3) continue;
    const r = rand(0.5, 1.6); const m = add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM), G); m.position.set(x, moorGround(x, z, false) + r * 0.3, z); m.rotation.set(rand(TAU), rand(TAU), 0); m.scale.y = rand(0.5, 0.9);
    RM.addCircle(x, z, r * 0.85);
  }
  // cover near the bridge for sneaking
  for (const [x, z, r] of [[-5, 14, 1.4], [4.5, 20, 1.6], [-6.5, 27, 1.3], [5, 32, 1.5], [-3.5, 40, 1.2], [6, 9, 1.1], [-7, 8, 1.3]]) {
    const m = add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM), G); m.position.set(x, moorGround(x, z, false) + r * 0.45, z); m.rotation.set(rand(TAU), rand(TAU), 0);
    RM.addCircle(x, z, r * 0.9);
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU, x = -24 + Math.cos(a) * 7, z = 34 + Math.sin(a) * 7, h = rand(2.4, 3.6);
    const st = box(0.9, h, 0.5, rockM, x, moorGround(x, z, false) + h / 2 - 0.2, z, G); st.rotation.y = a + rand(-0.2, 0.2); st.rotation.z = rand(-0.08, 0.08);
    RM.addCircle(x, z, 0.6);
  }
  w.data.perches = [];
  for (const [x, z] of [[9, 26], [-11, 18], [14, 44], [-16, 52], [18, -14], [-14, -20]]) w.data.perches.push(...RM.build.deadTree(x, z, rand(5, 8), G).map((b) => ({ x: b.x, y: b.y + moorH(x, z), z: b.z })));
  const gib = new THREE.Group(); gib.position.set(7, moorH(7, 21), 21); G.add(gib);
  add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 5, 0.25), M.darkWood), gib).position.y = 2.5;
  add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.2), M.darkWood), gib).position.set(-0.8, 4.9, 0);
  const cage = new THREE.Group(); cage.position.set(-1.5, 3.4, 0); gib.add(cage);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), M.iron), cage).position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35); }
  RM.build.chain(-1.5, 4.9, 0, -1.5, 4.2, 0, gib, 0);
  w.data.cage = cage; RM.addCircle(7, 21, 0.4);
  // a drystone wall and stile where you come out of town
  for (let x = -40; x <= 40; x += 2) { if (Math.abs(x) < 2) continue; box(2.05, rand(1.0, 1.3), 0.7, rockM, x, moorH(x, 62) + 0.5, 62, G); }
  RM.addCollider(-42, 61.6, -1.2, 62.4); RM.addCollider(1.2, 61.6, 42, 62.4);
  // Ravenmoor on the horizon behind you, Vane Manor ahead
  const sil = new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 1 });
  for (let i = 0; i < 26; i++) { const x = rand(-60, 60), h = rand(6, 14); add(new THREE.Mesh(new THREE.BoxGeometry(rand(5, 9), h, 6), sil), G, false, false).position.set(x, h / 2, 130 + rand(0, 20)); }
  const tw = add(new THREE.Mesh(new THREE.BoxGeometry(6, 28, 6), sil), G, false, false); tw.position.set(-20, 14, 128);
  const sp = add(new THREE.Mesh(new THREE.ConeGeometry(4, 12, 4), sil), G, false, false); sp.position.set(-20, 34, 128); sp.rotation.y = Math.PI / 4;
  RM.glow(-20, 25, 125, 0xffa050, 6, 0.4, G);
  const hill = add(new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 1 })), G, false, false); hill.scale.set(1.5, 0.3, 0.7); hill.position.set(0, -4, -190);
  const man = add(new THREE.Mesh(new THREE.BoxGeometry(50, 18, 14), sil), G, false, false); man.position.set(0, 30, -190);
  for (let i = 0; i < 16; i++) { const l = add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({ color: Math.random() < 0.3 ? 0xff3040 : 0xffa860 })), G, false, false); l.position.set(rand(-22, 22), rand(23, 36), -182.9); }
  RM.mist(0, 30, 120, 90, moorH(0, 30) + 0.5, 0.13, 0xaab8e0, G);
  // edges
  RM.addCollider(-46, -45, -45, 70); RM.addCollider(45, -45, 46, 70); RM.addCollider(-46, -46, 46, -45);
});

/* ========================================================== THE CHURCH */
RM.defineWorld('church', (w) => {
  const G = w.group, L = 34, WALL = 9, R = 6;
  const light = new THREE.MeshStandardMaterial({ map: RM.retex(RM.TEX.cryptStone, 4, 1.6), roughness: 0.9, color: 0xc0bcc8 });
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(12, L + 4), M.cryptFloor), G, false, true); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -L / 2 + 2);
  const carpet = add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 26), new THREE.MeshStandardMaterial({ color: 0x5a0a18, roughness: 1 })), G, false, true); carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.01, -12);
  box(0.5, WALL, L, light, -6.25, WALL / 2, -L / 2 + 2, G, true); box(0.5, WALL, L, light, 6.25, WALL / 2, -L / 2 + 2, G, true);
  box(13, 16, 0.5, light, 0, 8, -L + 1.75, G, true);
  box(4.6, 16, 0.5, light, -3.7, 8, 2.25, G, true); box(4.6, 16, 0.5, light, 3.7, 8, 2.25, G, true); box(2.8, 12, 0.5, light, 0, 10, 2.25, G);
  const vault = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 40, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ map: RM.retex(RM.TEX.cryptStone, 8, 5), roughness: 0.95, side: THREE.DoubleSide, color: 0xb0aab8 })), G, false, true);
  vault.rotation.x = Math.PI / 2; vault.position.set(0, WALL, -L / 2 + 2);
  const rib = new THREE.TorusGeometry(R - 0.1, 0.2, 8, 36, Math.PI);
  for (let z = -2; z >= -30; z -= 4) {
    add(new THREE.Mesh(rib, M.stoneLight), G, false).position.set(0, WALL, z);
    for (const sx of [-4.4, 4.4]) { cyl(0.38, 0.42, WALL, M.stoneLight, sx, WALL / 2, z, 14, G); RM.addCircle(sx, z, 0.45); }
  }
  // porch outside the door
  const porch = add(new THREE.Mesh(new THREE.PlaneGeometry(4, 3), M.cryptFloor), G, false, true); porch.rotation.x = -Math.PI / 2; porch.position.set(0, 0, 3.8);
  const night = add(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4), new THREE.MeshBasicMaterial({ color: 0x1a2446, fog: false })), G, false, false); night.position.set(0, 2, 5.2); night.rotation.y = Math.PI;
  RM.addCollider(-2, 5.1, 2, 5.6); RM.addCollider(-2.2, 2.5, -1.9, 5.3); RM.addCollider(1.9, 2.5, 2.2, 5.3);
  // pews
  for (let z = -5; z >= -20; z -= 1.7) for (const sd of [-1, 1]) {
    const x = sd * 2.65;
    box(2.6, 0.08, 0.5, M.darkWood, x, 0.46, z, G); box(2.6, 0.55, 0.07, M.darkWood, x, 0.78, z + 0.27, G);
    box(0.08, 0.95, 0.6, M.darkWood, sd * 1.35, 0.47, z + 0.05, G); box(0.08, 0.95, 0.6, M.darkWood, sd * 3.95, 0.47, z + 0.05, G);
    RM.addCollider(x - 1.35, z - 0.3, x + 1.35, z + 0.35);
  }
  // the altar
  box(11, 0.2, 7, light, 0, 0.1, -28.5, G); box(11, 0.2, 6.3, light, 0, 0.3, -28.9, G);
  w.groundAt = (x, z) => (z < -25.3 ? 0.4 : z < -25 ? 0.2 : 0);
  box(2.6, 1.0, 1.1, M.stoneLight, 0, 0.9, -29, G, true);
  const cloth = box(2.7, 0.04, 1.2, new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.9 }), 0, 1.42, -29, G); void cloth;
  const crossM = new THREE.MeshStandardMaterial({ color: 0xd8b060, emissive: 0xb07a20, emissiveIntensity: 1.2, metalness: 0.7, roughness: 0.3 });
  box(0.3, 4, 0.2, crossM, 0, 5, -31.9, G); box(2, 0.3, 0.2, crossM, 0, 6, -31.9, G);
  RM.glow(0, 5.5, -31.5, 0xffc060, 8, 0.4, G);
  for (const x of [-1, -0.4, 0.4, 1]) RM.build.candles(x, 1.44, -29.2, 2, x === -1 ? 1.6 : 0, G);
  for (const sx of [-4.6, 4.6]) for (let i = 0; i < 3; i++) RM.build.candles(sx, 0.4, -26.5 - i * 1.2, 3, i === 1 ? 1.2 : 0, G);
  // stained glass: coloured windows throwing coloured light into the nave
  const glassTex = RM.canvasTex(128, 256, (g, W, H) => {
    const cols = ['#b0142c', '#1c3a9a', '#d8a020', '#2a7a4a', '#6a2a9a', '#e0e0f0'];
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) { g.fillStyle = RM.pick(cols); g.fillRect(x, y, 16, 16); }
    g.strokeStyle = '#111'; g.lineWidth = 3; for (let y = 0; y <= H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let x = 0; x <= W; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, 0); g.lineTo(0, 40); g.fill(); g.beginPath(); g.moveTo(W, 0); g.lineTo(W / 2, 0); g.lineTo(W, 40); g.fill();
  });
  const glassM = new THREE.MeshBasicMaterial({ map: glassTex, fog: false });
  const shaftCols = [0xb0142c, 0x3050c0, 0xd8a020];
  [-6, -12, -18].forEach((z, i) => {
    for (const sd of [-1, 1]) {
      const wnd = add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.8), glassM), G, false, false); wnd.position.set(sd * 5.98, 5.4, z); wnd.rotation.y = -sd * Math.PI / 2;
      if (sd > 0) { const sh = RM.lightShaft(3.2, 2.9, z, 0.5, 1.4, 6.4, shaftCols[i], 0.07, 0, G); sh.rotation.z = -0.62; }
    }
  });
  const rose = add(new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ map: glassTex, fog: false })), G, false, false); rose.position.set(0, 10.5, -31.95);
  // the bell rope, hanging down from the tower over the chancel
  const rope = cyl(0.03, 0.03, 9.5, new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 1 }), -4.6, 5.9, -27.8, 6, G);
  const tassel = cyl(0.08, 0.05, 0.4, new THREE.MeshStandardMaterial({ color: 0x9a1020, roughness: 0.9 }), -4.6, 1.1, -27.8, 8, G);
  w.data.rope = { x: -4.6, z: -27.8, mesh: rope, tassel };
  // holy water at the door
  cyl(0.35, 0.18, 0.9, M.stoneLight, 2.6, 0.45, -1.4, 12, G); RM.addCircle(2.6, -1.4, 0.4);
  RM.glow(2.6, 0.95, -1.4, 0x9fc4ff, 0.8, 0.4, G);
  RM.dust(-5, 0.5, -30, 5, 8, 0, 300, 0xffe8c8, 0.03, G);
  w.data.holyZ = -3;
});

/* ============================================================ helpers */
// a fight against several foes (used by the duel and the Choir). resolves 'won' or 'dead'
function fight(foes, { dmg = 22, allies = [] } = {}) {
  return new Promise((res) => {
    let hp = 100, alt = false, over = false;
    RM.bar('hp', hp, 'YOU'); AU.setHeart(100, 0.5);
    for (const f of foes) Object.assign(f, { stagger: 0, wind: 0, cd: rand(0.6, 1.8) });
    const hitFoe = (f, fx, fz) => {
      f.hp--; f.stagger = 0.45; f.wind = 0; f.fig.setPose(f.basePose || 'stand');
      const d = RM.dist(fx, fz, f.x, f.z) || 1; if (!f.rooted) { f.x += ((f.x - fx) / d) * 0.6; f.z += ((f.z - fz) / d) * 0.6; }
      AU.hit(0.6); RM.shake(0.03, 0.15);
      if (f.hp <= 0) { f.alive = false; f.fig.setPose('lie'); f.col.off = true; if (f.light) f.light.intensity = 0; AU.thud(0.5); S().thirst = Math.max(0, S().thirst - 6); }
    };
    RM.onAttack = () => {
      if (RM.hands.animT < 0.28 && RM.hands.anim) return;
      alt = !alt; RM.hands.play(alt ? 'claw' : 'claw2'); AU.whoosh(0.4);
      for (const f of foes) if (f.alive && RM.dist(P.x, P.z, f.x, f.z) < 2.4 && RM.facing(f.x, f.z, 0.45)) hitFoe(f, P.x, P.z);
    };
    RM.onDash = () => RM.dash();
    const hook = (g) => { for (const f of foes) if (f.alive && f.wind > 0) { const s = RM.project(f.x, 2.2, f.z); if (s.on) { g.fillStyle = `rgba(255,${120 - f.wind * 100},40,0.95)`; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.fillText('!', s.x, s.y); } } };
    RM.fxHooks.push(hook);
    const prev = RM.sceneTick;
    const finish = (v) => { if (over) return; over = true; RM.sceneTick = prev; RM.onAttack = null; RM.onDash = null; RM.bar('hp', null); AU.setHeart(60, 0.3); RM.fxHooks.splice(RM.fxHooks.indexOf(hook), 1); res(v); };
    RM.sceneTick = (dt) => {
      if (prev) prev(dt, true);
      for (const f of foes) {
        f.update(dt); if (!f.alive) continue;
        if (f.stagger > 0) { f.stagger -= dt; continue; }
        const d = RM.dist(P.x, P.z, f.x, f.z); f.face(P.x, P.z); f.cd -= dt;
        if (f.wind > 0) {
          f.wind += dt; if (f.light) f.light.intensity = 1.5 + f.wind * 5;
          if (f.wind > (f.windT || 0.8)) {
            f.wind = 0; f.cd = rand(1.1, 1.9); f.fig.setPose(f.basePose || 'stand'); if (f.light) f.light.intensity = 1.5; AU.whoosh(0.6);
            if (d < 2.5 && P.iframes <= 0) {
              hp -= dmg; RM.flash('rgba(200,20,20,0.55)', 400); RM.shake(0.06, 0.3); AU.hit(0.8); RM.bar('hp', hp, 'YOU');
              if (hp <= 0) { RM.control = false; RM.flash('rgba(0,0,0,1)', 1500); finish('dead'); return; }
            }
          }
        } else if (d > 1.9 && !f.rooted) f.goTo(P.x, P.z, f.chase || 2.5);
        else { f.target = null; if (f.cd <= 0 && d < 3) { f.wind = 0.001; f.fig.setPose('raise'); } }
      }
      for (const a of allies) {
        a.update(dt); a.acd = (a.acd || 0) - dt;
        const tgt = foes.filter((f) => f.alive).sort((u, v) => RM.dist(a.x, a.z, u.x, u.z) - RM.dist(a.x, a.z, v.x, v.z))[0];
        if (!tgt) continue;
        if (RM.dist(a.x, a.z, tgt.x, tgt.z) > 1.6) a.goTo(tgt.x, tgt.z, 3.4); else { a.target = null; a.face(tgt.x, tgt.z); if (a.acd <= 0) { a.acd = 1.4; a.fig.setPose('raise'); RM.after(0.2, () => a.fig.setPose('stand')); hitFoe(tgt, a.x, a.z); } }
      }
      if (foes.every((f) => !f.alive)) finish('won');
    };
  });
}
// holy ground: burns more the less human you are
function holyBurn(rateMul = 1) {
  const h = S().humanity;
  return clamp((75 - h) * 0.25, 1.5, 25) * rateMul;
}
function smokeFromHands(list, dt, on) {
  list.t = (list.t || 0) - dt;
  if (on && list.t < 0) {
    list.t = 0.09; const f = RM.forward();
    const sp = RM.glow(P.x + f.x * 0.5 + rand(-0.3, 0.3), (P.gy || 0) + P.eye - 0.5, P.z + f.z * 0.5 + rand(-0.3, 0.3), 0x999999, 0.4, 0.4, RM.actors);
    sp.material.blending = THREE.NormalBlending; list.push({ sp, life: 0 });
  }
  for (let i = list.length - 1; i >= 0; i--) { const s = list[i]; s.life += dt; s.sp.position.y += dt * 0.8; s.sp.scale.setScalar(0.4 + s.life); s.sp.material.opacity = 0.4 * (1 - s.life / 1.5); if (s.life > 1.5) { RM.actors.remove(s.sp); list.splice(i, 1); } }
}
function scream(v = 0.5) { AU.tone(900, 1.1, 'sawtooth', v * 0.12, 0, 380, 0.8); AU.tone(1180, 0.9, 'sawtooth', v * 0.08, 0.05, 520, 0.8); AU.noise(1, v * 0.2, 'bandpass', 1400, 2, 0, 0.8, 600); }
// who the Choir is after tonight, depending on what you've done
function victim() {
  const f = S().flags;
  if (!f.pipDead) return { id: 'pip', name: 'Pip', look: RM.LOOKS.pip, scale: 0.72, head: 1.18 };
  if (!f.gideonDead) return { id: 'gideon', name: 'Gideon', look: RM.LOOKS.gideon, scale: 1, head: 1 };
  return { id: 'baker', name: 'the baker', look: RM.LOOKS.baker, scale: 1, head: 1 };
}

RM.fight = fight;
/* ================================================================ SCENES */
const N2 = (RM.N2 = {});

// Waking into Night Two
N2.wake = () => RM.play(async (done) => {
  const s = S();
  if (s.choices.dawn === 'explore') {
    RM.$('fade').style.opacity = 1; RM.camMode = 'free';
    await RM.say('You', '<i>You spent the day curled on cold stone stairs behind Vane\'s iron door. All day, far above you: footsteps, a harpsichord, and someone laughing.</i>');
    await RM.say('Corvin', '"Morning. Well, evening. I found you by the smell. Bad news: someone else found your crypt while you were gone. Come and look."');
  }
  const w = RM.useWorld('crypt'); RM.setEnv('crypt'); AU.setWind(0.03);
  w.data.setPlate(s.look.name); w.data.coffinLid.rotation.z = -2.05;
  RM.placePlayer(1.35, -26.4, Math.PI); RM.camMode = 'player'; RM.applyLook();
  RM.corvin.place(-0.1, 0.95, -27.9);
  // a crossbow bolt stuck in your coffin lid
  const bolt = new THREE.Group(); bolt.position.set(-0.6, 1.3, -27.6); bolt.rotation.set(0.4, 0, 0.9); RM.actors.add(bolt);
  bolt.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), M.darkWood));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 6), new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 1, roughness: 0.2 })); tip.position.y = -0.25; tip.rotation.x = Math.PI; bolt.add(tip);
  RM.glow(-0.6, 1.3, -27.6, 0xdfe6ff, 0.5, 0.5, RM.actors);
  const dust = RM.dust(-1, 0.02, -26, 1, 0.1, -20, 90, 0xe0e6ff, 0.02, RM.actors); void dust;
  RM.fade(0, 1);
  s.thirst = Math.min(100, s.thirst + 22);
  await RM.say('Corvin', '"See that? A crossbow bolt. <b>Silver</b>-tipped. In your lid. And silver dust on every step, like someone was sifting it about, hoping you\'d walk through it."');
  await RM.say('Corvin', '"There\'s only one person in Ravenmoor who does that for a living. <b>Tobias Crook</b>. The witch-finder. Vane pays him by the fang."');
  await RM.say('Corvin', '"He\'s out on the moor tonight, tracking you. Here\'s my clever plan: the old footbridge over the River Rook is rotten through. You cross it. He follows you onto it. Splash."');
  await RM.say('Corvin', '"Do try not to get shot on the way. Silver stings. A lot."');
  done('ok');
});

// The moor: sneak past Tobias's crossbow and lure him onto the rotten bridge
N2.moor = () => RM.play(async (done) => {
  const w = RM.useWorld('moor'); RM.setEnv('moor'); AU.setWind(0.28);
  w.data.bridgeUp = true; w.data.bridgeGap.off = true; for (const c of w.data.banks) c.off = false;
  for (const pl of w.data.planks) { pl.visible = true; if (pl.userData.home) { pl.position.copy(pl.userData.home); pl.rotation.copy(pl.userData.homeR); } else { pl.userData.home = pl.position.clone(); pl.userData.homeR = pl.rotation.clone(); } }
  RM.placePlayer(0, 60, 0);
  for (const p of w.data.perches) if (Math.random() < 0.7) RM.addRaven(p.x, p.y, p.z);
  RM.addFlock(0, 18, -30, 10, 12);
  RM.control = true; RM.lockPointer();
  RM.corvin.fly(1.5, 3, 56);
  const tob = RM.watcher(RM.npc(RM.LOOKS.tobias, 0, 12, Math.PI, { heartLabel: 'Tobias' }), { range: 17, cone: 0.55 });
  const tl = new THREE.PointLight(0xffc080, 1.6, 10, 1.7); tl.position.set(0.2, 1.1, -0.2); tob.fig.group.add(tl); RM.glow(0.2, 1.1, -0.2, 0xffa050, 1.4, 0.6, tob.fig.group);
  const route = [[0, 12], [-9, 20], [-4, 30], [6, 26], [8, 14], [2, 7]]; let ri = 1, wait = 1;
  RM.detectHook([tob]);
  let hp = 100, aim = 0, reload = 0, triggered = false;
  const bolts = [];
  RM.setObjective('Cross the <b>rotten bridge</b> over the river.<br><span class="dim">Tobias is hunting you with a silver crossbow. Stay out of his sight: crouch (C) in the heather, use the rocks. Hold R for Blood Sight.</span>');
  RM.setMarker(0, -5.5);
  RM.fxHooks.push((g) => { if (aim > 0 && tob.alive) { const s = RM.project(tob.x, 1.5, tob.z); if (s.on) { g.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(RM.t * 30) * 0.4})`; g.beginPath(); g.arc(s.x, s.y, 5 + aim * 10, 0, TAU); g.fill(); } } });
  const shoot = () => {
    AU.noise(0.12, 0.5, 'highpass', 2000, 1, 0, 0.3); AU.whoosh(0.5);
    const from = vec(tob.x, (w.groundAt(tob.x, tob.z)) + 1.5, tob.z), to = vec(P.x + P.vx * 0.25, (P.gy || 0) + P.eye - 0.3, P.z + P.vz * 0.25);
    const dir = to.clone().sub(from).normalize();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), new THREE.MeshStandardMaterial({ color: 0xd8dce4, emissive: 0x8090b0, metalness: 1, roughness: 0.2 }));
    m.position.copy(from); m.quaternion.setFromUnitVectors(vec(0, 1, 0), dir); RM.actors.add(m);
    bolts.push({ m, dir, life: 0 });
  };
  RM.sceneTick = async (dt) => {
    // Tobias patrols, and hunts you if he sees you
    tob.update(dt);
    const v = tob.sees() * (P.crouch ? 0.75 : 1);
    tob.detect = clamp(tob.detect + (v > 0 ? v * dt * 1.2 : -dt * 0.4), 0, 1);
    if (tob.detect < 0.6 && !triggered) {
      aim = 0;
      if (!tob.target) { wait -= dt; if (wait < 0) { const p = route[ri]; tob.goTo(p[0], p[1], 1.4); ri = (ri + 1) % route.length; wait = rand(1, 2.5); } }
    } else if (!triggered) {
      tob.target = null; tob.face(P.x, P.z); reload -= dt;
      if (tob.detect >= 1 && reload <= 0) { aim += dt; if (aim > 0.9) { aim = 0; reload = 2.2; shoot(); } }
      if (tob.detect >= 1 && Math.random() < dt * 0.3) RM.caption(RM.pick(['Tobias: <i>"I see you, Sleeper."</i>', 'Tobias: <i>"Silver doesn\'t miss."</i>', 'Tobias: <i>"Hold still. It\'s kinder."</i>']), 2);
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.life += dt; b.m.position.addScaledVector(b.dir, 30 * dt);
      const d = Math.hypot(b.m.position.x - P.x, b.m.position.z - P.z);
      if (d < 0.55 && P.iframes <= 0 && Math.abs(b.m.position.y - ((P.gy || 0) + P.eye - 0.4)) < 1.1) {
        RM.actors.remove(b.m); bolts.splice(i, 1);
        hp -= 30; RM.flash('rgba(230,240,255,0.8)', 500); AU.hit(0.8); AU.sizzleN.set(0.3, 0.05); RM.after(0.4, () => AU.sizzleN.set(0, 0.3)); RM.shake(0.05, 0.3);
        RM.bar('hp', hp, 'YOU'); RM.caption('Silver! It burns like fire.', 2);
        if (hp <= 0) { RM.control = false; done('dead'); return; }
        continue;
      }
      if (b.life > 2) { RM.actors.remove(b.m); bolts.splice(i, 1); }
    }
    // once you're over the bridge, he comes running after you
    if (!triggered && P.z < -5.2 && Math.abs(P.x) < 4) {
      triggered = true; RM.control = false; RM.setMarker(null); RM.bar('hp', null); RM.setObjective('');
      RM.camMode = 'free'; const cam = RM.camera; cam.position.set(2.5, 1.8, -9); cam.lookAt(0, 0.6, 2);
      tob.x = 0.5; tob.z = 14; tob.detect = 1; tob.goTo(0, -2, 4.6); tob.ghost = true;
      await RM.say('Tobias', '"<b>You can\'t outrun silver, Sleeper!</b>"');
      await new Promise((r) => { const chk = () => { if (tob.z < 1.2) r(); else RM.after(0.05, chk); }; chk(); });
      tob.target = null;
      AU.thud(1); AU.noise(0.6, 0.6, 'lowpass', 900, 1, 0, 0.4); RM.shake(0.05, 0.6);
      RM.caption('<b>CRACK.</b>', 1.5);
      w.data.bridgeUp = false;
      const fall = w.data.planks.filter((pl) => Math.abs(pl.position.z) < 3.2 || pl.geometry.parameters.depth > 5).map((pl) => ({ pl, vy: rand(-1, 0), vr: vec(rand(-2, 2), rand(-1, 1), rand(-2, 2)) }));
      let t = 0;
      await new Promise((r) => {
        const step = () => {
          t += 0.03; for (const f of fall) { f.vy -= 9.8 * 0.03; f.pl.position.y = Math.max(BED + 0.1, f.pl.position.y + f.vy * 0.03); f.pl.rotation.x += f.vr.x * 0.03; f.pl.rotation.z += f.vr.z * 0.03; }
          tob.noGround = true; tob.fig.group.userData.baseY = Math.max(BED, -t * t * 6);
          if (t > 0.9) { tob.noGround = false; tob.fig.group.userData.baseY = 0; tob.fig.setPose('lie'); r(); } else RM.after(0.03, step);
        };
        step();
      });
      AU.noise(1.2, 0.8, 'lowpass', 600, 1, 0, 0.6); AU.thud(0.8);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xcfd8ff, transparent: true, opacity: 0.7 })); ring.rotation.x = Math.PI / 2; ring.position.set(0, BED + 0.42, 0.3); RM.actors.add(ring);
      RM.onTick((dt2) => { if (!ring.parent) return false; ring.scale.multiplyScalar(1 + dt2 * 1.5); ring.material.opacity -= dt2 * 0.5; if (ring.material.opacity <= 0) { RM.actors.remove(ring); return false; } });
      await RM.sleep(1.2);
      await RM.say('Corvin', '"...Well! That worked <i>much</i> better than any of my plans usually do."');
      await RM.say('You', '<i>Down in the river, among the broken planks, the witch-finder is groaning. His leg is bent the wrong way. The water is pulling at him.</i>');
      RM.camMode = 'player';
      done('ok');
    }
  };
});

// Down in the river with the witch-finder: kill, spare, or turn him
N2.tobias = () => RM.play(async (done) => {
  const w = RM.useWorld('moor'); RM.setEnv('moor'); AU.setWind(0.25);
  w.data.bridgeUp = false; for (const c of w.data.banks) c.off = true; w.data.bridgeGap.off = true;
  RM.addCollider(-9, -3.6, 9, -3.3, 'bed'); RM.addCollider(-9, 3.3, 9, 3.6, 'bed'); RM.addCollider(-9.3, -3.6, -9, 3.6, 'bed'); RM.addCollider(9, -3.6, 9.3, 3.6, 'bed');
  RM.placePlayer(1.6, -2.2, Math.PI * 0.85);
  P.speedMul = 0.65; // running water drags at vampires
  const tob = RM.npc({ ...RM.LOOKS.tobias, extras: ['hat'] }, 0.4, 0.6, -0.4, { heartLabel: 'Tobias' });
  tob.fig.setPose('kneel'); tob.basePose = 'kneel';
  for (const pl of w.data.planks) if (!w.data.bridgeUp && pl.position.y < 0) pl.visible = true;
  RM.control = false;
  await RM.say('Tobias', '"Go on, then." <i>He spits river water. His hand is on a silver knife.</i> "Finish it, Sleeper. It\'s what you are."');
  await RM.say('Tobias', '"But know this: <b>I\'m not the last</b>. There\'s always another Crook. My sister Agnes is twice the hunter I am."');
  const c = await RM.choose({ q: 'The witch-finder is hurt, and at your mercy.', options: [
    { id: 'kill', icon: '🗡', label: 'Kill him', sub: 'The hunters lose their leader. But he has a sister.' },
    { id: 'spare', icon: '🤝', label: 'Spare him', sub: 'Pull him out before the river takes him.' },
    { id: 'turn', icon: '🦇', label: 'Turn him into a vampire', sub: 'A hunter who can never hunt you again.' },
  ] });
  const s = S(); s.choices.tobias = c;
  RM.control = true; RM.lockPointer();
  if (c === 'kill') {
    RM.setObjective('<b>Duel!</b> He can\'t stand, but that knife is silver. Click to claw · <b>Space</b> to dash away when he swings');
    for (;;) {
      Object.assign(tob, { hp: 3, rooted: true, windT: 0.7, alive: true }); tob.col.off = false; tob.fig.setPose('kneel');
      const r = await fight([tob], { dmg: 26 });
      if (r === 'won') break;
      await RM.fade(1, 0.5); await RM.say('Corvin', '"Up you get. Silver burns, but you\'re not done. Wait for his swing, <b>dash</b>, then strike."'); RM.fade(0, 0.6);
      RM.placePlayer(1.6, -2.2, Math.PI * 0.85); RM.control = true;
    }
    RM.control = false;
    RM.flash('rgba(140,0,10,0.85)', 1200); AU.gulp(0.7);
    s.flags.tobiasDead = true; s.kills++; s.bites++; s.humanity -= 18; s.thirst = Math.max(0, s.thirst - 45); s.dread += 1;
    await RM.say('You', '<i>The river carries his hat away. You watch it go for a long time.</i>');
    await RM.say('Corvin', '"The hunters will want to know who killed Tobias Crook. So will his sister."');
  } else if (c === 'spare') {
    RM.setObjective('Grab him: <b>hold E</b> next to him');
    RM.setMarker(tob.x, tob.z);
    await new Promise((res) => { const prev = RM.sceneTick; RM.sceneTick = (dt) => { if (prev) prev(dt); if (RM.dist(P.x, P.z, tob.x, tob.z) < 1.8) { RM.sceneTick = prev; res(); } }; });
    await RM.holdAction({ label: 'LIFT HIM', secs: 1.6, sound: 'none' });
    RM.setObjective('Drag him to the bank (the water fights you)');
    RM.setMarker(-2.5, -3.0);
    tob.fig.setPose('lie'); tob.ghost = true; P.speedMul = 0.4;
    await new Promise((res) => {
      RM.sceneTick = (dt) => {
        const f = RM.forward(); tob.x = P.x - f.x * 1.1; tob.z = P.z - f.z * 1.1; tob.update(dt);
        if (Math.random() < dt * 1.5) AU.noise(0.3, 0.2, 'lowpass', 500, 1, 0, 0.2);
        if (P.z < -2.3 && RM.dist(P.x, P.z, -2.5, -3) < 2.8) { RM.sceneTick = null; res(); }
      };
    });
    RM.setMarker(null); RM.control = false; tob.fig.setPose('kneel'); tob.face(P.x, P.z);
    await RM.say('Tobias', '"...Why?" <i>He stares at you like you\'ve grown a second head.</i> "You could have let it take me."');
    await RM.say('Tobias', '"This changes nothing. You\'re still what you are." <i>He looks away.</i> "...Thank you."');
    s.flags.tobiasSpared = true; s.bonds.tobias = (s.bonds.tobias || 0) + 1; s.humanity += 8;
    RM.toast('🤝 Tobias: <b>Spared</b>');
  } else {
    RM.setObjective('Hold <b>E</b> to drink from him');
    RM.setMarker(tob.x, tob.z);
    await new Promise((res) => { const prev = RM.sceneTick; RM.sceneTick = (dt) => { if (prev) prev(dt); if (RM.dist(P.x, P.z, tob.x, tob.z) < 1.8) { RM.sceneTick = prev; res(); } }; });
    tob.fig.setPose('cower');
    await RM.holdAction({ label: 'DRINK', secs: 2.6 });
    RM.flash('rgba(140,0,10,0.6)', 700);
    RM.setObjective('Now <b>give him your blood</b>: hold E');
    RM.hands.play('reach');
    await RM.holdAction({ label: 'GIVE YOUR BLOOD', secs: 3, sound: 'none' });
    RM.control = false; tob.fig.setPose('lie');
    s.thirst = Math.min(100, s.thirst + 25); s.bites++; s.humanity -= 5; s.flags.tobiasTurned = true; s.bonds.tobias = (s.bonds.tobias || 0) + 2;
    AU.sting(0.5); RM.shake(0.04, 1.5);
    for (let i = 0; i < 6; i++) { tob.fig.group.rotation.z = rand(-0.2, 0.2); await RM.sleep(0.2); }
    tob.fig.group.rotation.z = 0;
    const eyes = RM.npc({ ...RM.LOOKS.tobias, extras: ['hat'] }, tob.x, tob.z, tob.yaw, { vamp: { humanity: 10, pale: 0.6, fangs: 0.6 } });
    tob.remove(); eyes.fig.setPose('kneel'); eyes.face(P.x, P.z);
    await RM.say('Tobias', '<i>His eyes open. They are red.</i> "...What did you do to me?"');
    await RM.say('Tobias', '"I can hear your heart. No. I can hear that you <i>haven\'t got one</i>." <i>A long silence.</i> "Then I suppose I hunt beside you now, Sleeper. Heaven help us both."');
    RM.toast('🦇 Tobias: <b>Your vampire partner</b>');
  }
  done(c);
});

// The Hollow Choir is out, singing, and they're after someone you know
N2.choirIntro = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); AU.setWind(0.06);
  RM.spawnTownRavens(w); RM.posters(w);
  RM.placePlayer(0, 6, 0);
  const v = victim();
  RM.camMode = 'free'; const cam = RM.camera; cam.position.set(0.6, 2.4, -14); cam.lookAt(-6, 1, -40);
  const vic = RM.npc(v.look, 8, -30, 0, { scale: v.scale, headScale: v.head }); vic.goTo(-8.5, -46.5, 4.5); vic.ghost = true;
  const ch = [choirMember(-3, -52, Math.PI), choirMember(3, -52, Math.PI), choirMember(-1, -50, Math.PI), choirMember(1, -50, Math.PI)];
  for (const m of ch) m.goTo(m.x, -38, 1.0);
  AU.choirLevel = 0.12;
  RM.onTick(() => { if (!vic.fig.group.parent) return false; vic.update(0.016); for (const m of ch) m.update(0.016); });
  await RM.sleep(1);
  await RM.say('Corvin', '"Hear that singing? That\'s the <b>Hollow Choir</b>. Vane\'s. Masks, lanterns, and hymns. When the singing stops, it means they\'ve found what they\'re looking for."');
  await RM.say('Corvin', `"And that's <b>${v.name}</b> running from them. They'll take ${v.id === 'pip' ? 'Pip' : 'them'} up the hill to the Manor. Nobody comes back from the Manor."`);
  const s = S();
  const c = await RM.choose({ q: `The Choir is hunting ${v.name}.`, options: [
    { id: 'save', icon: '🏃', label: `Save ${v.name}`, sub: 'Sneak in, grab their hand, get out. Very hard.' },
    { id: 'hide', icon: '🫣', label: 'Save yourself', sub: 'Hide. Listen for the singing to stop.' },
    { id: 'kill', icon: '🔥', label: 'Kill the whole Choir', sub: 'Four of them. Lanterns burn. The town will see.' + (s.flags.tobiasTurned ? ' Tobias fights with you.' : '') },
    { id: 'bell', icon: '🔔', label: 'Ring the church bell', sub: 'Bells stun the Choir. Bells also burn vampires.' },
  ] });
  s.choices.choir = c; AU.choirLevel = 0;
  RM.camMode = 'player';
  done(c);
});

// Save them: stealth in the market while the Choir sings
N2.choirSave = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w);
  const v = victim(), Pn = w.data.P;
  RM.placePlayer(0, -16, 0);
  const vic = RM.npc(v.look, Pn.stallC.x + 0.4, Pn.stallC.z - 1.3, Math.PI, { scale: v.scale, headScale: v.head, heartLabel: v.name }); vic.fig.setPose('kneel');
  const routes = [[[-15, -27], [-15, -50], [-4, -50], [-4, -27]], [[14, -50], [14, -27], [5, -27], [5, -50]], [[-6, -34], [6, -34], [6, -42], [-6, -42]], [[0, -52], [-12, -52], [0, -52], [12, -52]]];
  const ch = routes.map((r) => { const m = RM.watcher(choirMember(r[0][0], r[0][1], 0), { range: 11, cone: 0.58 }); m.route = r; m.ri = 1; m.wait = rand(0, 2); return m; });
  RM.detectHook(ch);
  RM.control = true; RM.lockPointer(); RM.bloodSightAllowed = true;
  RM.setObjective(`Reach <b>${v.name}</b> (hiding by the south-west stall), then lead them out of the market.<br><span class="dim">Crouch (C) · hold R for Blood Sight · stay out of the lanterns</span>`);
  let following = false, busy = false, silence = 0;
  RM.setMarker(vic.x, vic.z);
  RM.addInteract({ x: () => vic.x, z: () => vic.z, r: 1.8, when: () => !following, label: `Take ${v.name}'s hand`, use: (o) => {
    o.off = true; following = true; vic.fig.setPose('stand'); vic.ghost = true;
    RM.caption(`${v.name}: <i>"${v.id === 'pip' ? 'I KNEW you\'d come!' : 'Oh thank heaven. Or... whoever.'}"</i> Now get out, south, back up the main street.`, 4);
    RM.setMarker(0, -12);
  } });
  RM.sceneTick = async (dt) => {
    let near = 1e9;
    for (const m of ch) {
      m.update(dt);
      if (!m.target && silence <= 0) { m.wait -= dt; if (m.wait < 0) { const p = m.route[m.ri]; m.goTo(p[0], p[1], 1.2); m.ri = (m.ri + 1) % m.route.length; m.wait = rand(0.8, 2); } }
      near = Math.min(near, RM.dist(P.x, P.z, m.x, m.z));
    }
    if (following) { const f = RM.forward(); const tx = P.x - f.x * 1.2, tz = P.z - f.z * 1.2; if (RM.dist(vic.x, vic.z, tx, tz) > 0.6) vic.goTo(tx, tz, 3.8); }
    vic.update(dt);
    AU.choirLevel = silence > 0 ? 0 : clamp(0.2 - near / 90, 0.03, 0.18);
    if (busy) return;
    let maxD = 0;
    for (const m of ch) { const sv = m.sees(); m.detect = clamp(m.detect + (sv > 0 ? sv * dt * 1.1 : -dt * 0.5), 0, 1); maxD = Math.max(maxD, m.detect); }
    RM.bar('meter', maxD > 0.02 ? maxD * 100 : null, 'SEEN');
    if (maxD >= 1) {
      busy = true; RM.control = false; silence = 3; AU.choirLevel = 0;
      RM.caption('<b>The singing stops.</b>', 3); AU.sting(0.8);
      for (const m of ch) { m.target = null; m.face(P.x, P.z); }
      await RM.sleep(2.2); RM.flash('rgba(255,210,140,0.8)', 800);
      done('caught'); return;
    }
    if (following && P.z > -13.5 && RM.dist(vic.x, vic.z, P.x, P.z) < 5) { busy = true; RM.control = false; done('saved'); }
  };
});

// Save yourself: hide, and don't move, while the Choir walks past
N2.choirHide = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w);
  RM.placePlayer(0, -18, 0);
  const v = victim();
  const spot = { x: 3.35, z: -9.2 };
  for (const [x, z] of [[3.5, -8.2], [3.55, -10.3]]) { const b = RM.build.cyl(0.35, 0.35, 1, RM.MAT.wood, x, 0.5, z, 12, RM.actors); void b; RM.addCircle(x, z, 0.36, 'prop'); }
  const ch = [choirMember(-1, -30, 0), choirMember(1, -30, 0), choirMember(-1, -32, 0), choirMember(1, -32, 0)];
  let t = 10, hidden = false, phase = 0, moved = false;
  RM.control = true; RM.lockPointer();
  RM.setMarker(spot.x, spot.z);
  AU.choirLevel = 0.16;
  RM.addInteract({ x: spot.x, z: spot.z, r: 1.6, label: 'Hide behind the barrels', use: async (o) => {
    o.off = true; hidden = true; RM.control = false; RM.setMarker(null);
    RM.camMode = 'free'; const cam = RM.camera; cam.position.set(3.45, 0.8, -9.2); cam.lookAt(0, 1.4, -12);
    RM.$('hideSlats').classList.add('show');
    RM.setObjective('<b>Don\'t move.</b> Don\'t touch the keys. Don\'t even breathe.');
    for (const m of ch) m.goTo(m.x, 12, 1.1);
  } });
  const onKey = (e) => { if (hidden && phase < 3 && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyC', 'ShiftLeft'].includes(e.code)) moved = true; };
  addEventListener('keydown', onKey);
  RM.sceneTick = async (dt) => {
    for (const m of ch) m.update(dt);
    if (!hidden) {
      t -= dt; RM.setObjective(`<b>HIDE!</b> Get behind the barrels before they turn the corner: <b>${Math.max(0, Math.ceil(t))}</b>`);
      for (const m of ch) if (!m.target) m.goTo(m.x, -16, 1.2);
      if (t <= 0) { phase = 9; RM.control = false; AU.choirLevel = 0; RM.caption('<b>The singing stops.</b> They\'ve seen you.', 3); AU.sting(0.8); await RM.sleep(2); removeEventListener('keydown', onKey); done('caught'); return; }
      return;
    }
    const lead = ch[0];
    if (phase === 0 && lead.z > -11) { phase = 1; for (const m of ch) m.target = null; AU.choirLevel = 0; lead.face(3.4, -9.2); RM.caption('<b>The singing stops.</b>', 4); AU.whisper(0.3); RM.after(4, () => { phase = 2; }); }
    if (phase === 1) AU.setHeart(120, 0.8);
    if (phase === 2) { phase = 3; AU.choirLevel = 0.16; for (const m of ch) m.goTo(m.x, 14, 1.1); RM.caption('...and starts again. They walk on.', 3); AU.setHeart(70, 0.4); RM.after(5, async () => { AU.choirLevel = 0.04; scream(0.6); RM.caption(`Far off, down in the market: a scream. <b>${v.name}</b>.`, 4); await RM.sleep(4); phase = 4; }); }
    if (moved && phase < 3) {
      phase = 9; removeEventListener('keydown', onKey); RM.$('hideSlats').classList.remove('show');
      AU.sting(0.9); RM.flash('rgba(255,200,120,0.8)', 600); RM.caption('A barrel scrapes. Every mask turns towards you.', 3);
      await RM.sleep(2); RM.camMode = 'player'; done('caught'); return;
    }
    if (phase === 4) { phase = 5; removeEventListener('keydown', onKey); RM.$('hideSlats').classList.remove('show'); RM.camMode = 'player'; done('hid'); }
  };
});

// Kill the whole Choir
N2.choirKill = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w);
  const v = victim(), Pn = w.data.P;
  RM.placePlayer(0, -24, 0);
  const vic = RM.npc(v.look, Pn.stallC.x + 0.4, Pn.stallC.z - 1.3, Math.PI, { scale: v.scale, headScale: v.head }); vic.fig.setPose('kneel');
  const ch = [choirMember(-3, -36, 0), choirMember(3, -36, 0), choirMember(-5, -40, 0), choirMember(5, -40, 0)];
  for (const m of ch) m.hp = 3;
  const allies = [];
  if (S().flags.tobiasTurned) { const t = RM.npc({ ...RM.LOOKS.tobias, extras: ['hat'] }, 2, -21, 0, { vamp: { humanity: 10, pale: 0.6 } }); t.ghost = true; allies.push(t); }
  AU.choirLevel = 0.18;
  RM.control = true; RM.lockPointer();
  RM.setObjective('<b>Kill the Hollow Choir.</b> Click to claw · <b>Space</b> to dash from their swinging lanterns' + (allies.length ? '<br><span class="dim">Tobias fights beside you</span>' : ''));
  if (allies.length) RM.caption('Tobias: <i>"Four masks. I\'ll take the left. Try to keep up, Sleeper."</i>', 3.5);
  RM.sceneTick = (dt) => { vic.update(dt); AU.choirLevel = 0.04 * ch.filter((m) => m.alive).length; };
  const r = await fight(ch, { dmg: 20, allies });
  AU.choirLevel = 0;
  done(r);
});

// Ring the church bell: stun the Choir, then get out before it tolls
N2.bell = () => RM.play(async (done) => {
  const w = RM.useWorld('church'); RM.setEnv('church'); AU.setWind(0.02);
  RM.placePlayer(0, 3.2, 0);
  const rope = w.data.rope;
  RM.control = true; RM.lockPointer();
  RM.setObjective('Run to the <b>bell rope</b> by the altar. Holy ground burns you.');
  RM.setMarker(rope.x + 0.6, rope.z);
  let burn = 0, rung = false, tollT = 0, out = false;
  const smoke = [];
  RM.bar('burn', 0, 'HOLY GROUND');
  RM.addInteract({ x: rope.x + 0.6, z: rope.z, r: 1.8, when: () => !rung, label: 'Pull the bell rope', use: async (o) => {
    o.off = true;
    await RM.holdAction({ label: 'PULL', secs: 1.4, sound: 'none' });
    rung = true; tollT = 6; AU.clang(0.4);
    RM.setObjective('<b>GET OUT OF THE CHURCH!</b> The bell is swinging up...');
    RM.setMarker(0, 3.4);
    RM.caption('The rope jerks out of your hands and goes <b>up</b>. Far above, the great bell is swinging. <b>RUN.</b>', 3);
  } });
  RM.sceneTick = async (dt) => {
    const onHoly = P.z < w.data.holyZ;
    if (onHoly && !out) { burn += holyBurn(0.55) * dt; AU.sizzleN.set(0.1 + burn / 500, 0.1); } else { burn = Math.max(0, burn - dt * 8); AU.sizzleN.set(0, 0.3); }
    smokeFromHands(smoke, dt, onHoly);
    RM.bar('burn', burn, 'HOLY GROUND');
    rope.tassel.position.y = 1.1 + (rung ? Math.min(6, (6 - tollT) * 2) : 0);
    if (burn >= 100) { RM.control = false; done('ash'); return; }
    if (rung && !out) {
      tollT -= dt;
      RM.setObjective(`<b>GET OUT OF THE CHURCH!</b> ${Math.max(0, tollT).toFixed(1)}`);
      if (P.z > 2.2) { out = true; RM.setObjective(''); }
      if (tollT <= 0) { RM.control = false; AU.bell(1); RM.flash('rgba(255,250,230,1)', 2500); RM.shake(0.1, 1.5); done('holyfire'); return; }
    }
    if (out && tollT > -10) {
      tollT -= dt;
      if (tollT <= 0 && tollT > -1) {
        tollT = -10; RM.control = false; AU.bell(1); RM.after(1.5, () => AU.bell(0.9)); RM.after(3, () => AU.bell(0.8)); RM.shake(0.03, 3);
        RM.caption('<b>BONG.</b> The whole town shakes. Even out here on the porch, your teeth ache.', 4);
        await RM.sleep(4.5); done('rung');
      }
    }
  };
});

// Sister Imelda finds you
N2.imelda = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); void w;
  RM.placePlayer(0, 26.5, Math.PI);
  const im = RM.npc(RM.LOOKS.imelda, -5, 36, 0, { heartLabel: 'Imelda' }); im.goTo(0, 31.2, 1.3);
  const lamp = new THREE.PointLight(0xffc080, 1.2, 8, 1.8); lamp.position.set(0, 1.4, -0.3); im.fig.group.add(lamp);
  RM.control = false;
  await RM.sleep(3);
  im.face(P.x, P.z);
  const s = S(), c = s.choices.choir, v = victim();
  await RM.say('Imelda', '"Don\'t run, child. I\'m far too old to chase you." <i>A nun, with a lamp and a very straight back.</i> "Sister Imelda. St. Corvina\'s is my church."');
  if (c === 'save') await RM.say('Imelda', `"I watched you walk into the Choir for ${v.name}. I have been waiting forty years for someone to do that."`);
  else if (c === 'hide') await RM.say('Imelda', `"They took ${v.name}. I heard. I heard you hiding, too." <i>She doesn't sound angry. Just tired.</i> "We are all frightened. What matters is what we do tomorrow."`);
  else if (c === 'kill') await RM.say('Imelda', '"Four of them. In the market, in front of everyone." <i>Her hand is on her cross.</i> "Those masks had people under them, Sleeper. Vane\'s people, but people."');
  else if (c === 'bell') await RM.say('Imelda', '"You rang <b>my</b> bell." <i>A pause.</i> "...Nobody has rung it since the sun stopped rising. It was beautiful. Don\'t do it again."');
  await RM.say('Imelda', '"Hear me. St. Corvina\'s is <b>sanctuary</b>. Even for you. Holy ground will hurt you, how much depends on how much of you is still you. But no hunter can touch you inside."');
  await RM.say('Imelda', '"Come to the altar at dawn, if you dare. My door is open." <i>She walks away, humming the raven lullaby. The one from your memory.</i>');
  s.flags.imeldaMet = true; s.bonds.imelda = (s.bonds.imelda || 0) + (c === 'save' || c === 'bell' ? 2 : c === 'kill' ? -1 : 0);
  im.goTo(-8, 38, 1.3);
  done('ok');
});

/* --------------------------------------------------------------- hangouts */
N2.hangout = () => RM.play(async (done) => {
  const s = S(), f = s.flags;
  const opts = [];
  if (!f.pipDead && !f.pipTaken && s.bonds.pip >= 1) opts.push({ id: 'pip', icon: '🧒', label: 'Pip: race to the well', sub: 'Pip swears no vampire is faster.' });
  if (f.gideonFriend && !f.gideonDead) opts.push({ id: 'gideon', icon: '🃏', label: 'Gideon: cards on a tombstone', sub: 'Higher or lower. He cheats.' });
  if (f.tobiasTurned) opts.push({ id: 'tobias', icon: '🏹', label: 'Tobias: train in the graveyard', sub: 'Hunter\'s drills, vampire speed.' });
  else if (f.tobiasSpared) opts.push({ id: 'tobias', icon: '🩹', label: 'Tobias: set his broken leg', sub: 'He won\'t ask. He needs it.' });
  opts.push({ id: 'corvin', icon: '🐦‍⬛', label: 'Corvin: the top of the bell tower', sub: 'He has something to tell you.' });
  if (opts.length < 4 && f.imeldaMet) opts.push({ id: 'imelda', icon: '🕯', label: 'Imelda: light the church candles', sub: 'Holy ground. It\'ll sting.' });
  const c = await RM.choose({ q: 'The night isn\'t over. Who do you spend the last of it with?', options: opts.slice(0, 4) });
  s.choices.hangout = c;
  await RM.fade(1, 0.6);
  await N2['hang_' + c]();
  done(c);
});
N2.hang_pip = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); RM.fade(0, 0.8);
  RM.placePlayer(6.2, 0.9, Math.PI / 2);
  const pip = RM.npc(RM.LOOKS.pip, 6.2, -0.8, Math.PI / 2, { scale: 0.72, headScale: 1.18 }); pip.ghost = true;
  const route = [[2.6, -1.5], [1.2, -12], [0, -24], [1.6, -35.6]]; let ri = 0;
  RM.setMarker(1.6, -35.6);
  await RM.say('Pip', '"First to the well wins. Winner gets bragging rights FOREVER. Ready?"');
  RM.control = true; RM.lockPointer(); RM.canSprint = false;
  for (const n of ['3', '2', '1']) { RM.toast('<b>' + n + '</b>', 0.8); AU.tone(660, 0.12, 'square', 0.05); await RM.sleep(0.9); }
  RM.toast('<b>GO!</b>', 1); AU.tone(990, 0.3, 'square', 0.06); RM.canSprint = true;
  pip.goTo(route[0][0], route[0][1], 5.6);
  let won = null;
  RM.sceneTick = async (dt) => {
    pip.update(dt);
    if (!pip.target && ri < route.length - 1) { ri++; pip.goTo(route[ri][0], route[ri][1], 5.6); }
    if (won === null && RM.dist(P.x, P.z, 1.6, -35.6) < 2) won = true;
    if (won === null && !pip.target && ri === route.length - 1) won = false;
    if (won !== null) {
      RM.sceneTick = null; RM.control = false; RM.setMarker(null); pip.face(P.x, P.z);
      if (won) await RM.say('Pip', '"CHEATER! Vampire legs! That doesn\'t count!" <i>Pip is grinning so hard it must hurt.</i> "...Best two out of three?"');
      else await RM.say('Pip', '"HA! Beat a <i>vampire</i>! I\'m going to tell EVERYONE. Well. Nobody. But I\'ll know."');
      await RM.say('Pip', '"...Hey. Thanks for not being scary. To me, I mean. You\'re very scary to everyone else."');
      S().bonds.pip += 2; S().humanity += 3; RM.toast('🖤 Pip: <b>Best friend</b>');
      done('ok');
    }
  };
});
N2.hang_gideon = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); RM.fade(0, 0.8);
  const Pn = w.data.P;
  RM.placePlayer(Pn.gideon.x - 3, Pn.gideon.z + 3.5, Math.PI * 0.8);
  const g = RM.npc(RM.LOOKS.gideon, Pn.gideon.x - 1.6, Pn.gideon.z + 4.6, 0); g.fig.setPose('kneel'); g.face(P.x, P.z);
  RM.build.lampPost(Pn.gideon.x - 0.6, Pn.gideon.z + 5.5, 1.5, RM.actors);
  RM.camMode = 'free'; RM.camera.position.set(Pn.gideon.x - 3, 1.3, Pn.gideon.z + 3); RM.camera.lookAt(Pn.gideon.x - 1.6, 0.9, Pn.gideon.z + 4.6);
  await RM.say('Gideon', '"Sit, sit. Higher or lower. Three rounds. Loser digs the next grave." <i>He shuffles a deck so old the cards are soft as cloth.</i>');
  const names = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Knave', 'Queen', 'King'], suits = ['Ravens', 'Bones', 'Candles', 'Crowns'];
  let card = 1 + ((Math.random() * 13) | 0), score = 0;
  for (let r = 0; r < 3; r++) {
    const c = await RM.choose({ q: `Gideon turns over the <b>${names[card - 1]} of ${RM.pick(suits)}</b>. Is the next card higher or lower?`, options: [{ id: 'hi', icon: '⬆️', label: 'Higher' }, { id: 'lo', icon: '⬇️', label: 'Lower' }] });
    let next = 1 + ((Math.random() * 13) | 0); if (next === card) next = card === 13 ? 12 : card + 1;
    const right = (c === 'hi') === (next > card);
    if (right) score++;
    AU.tone(right ? 880 : 220, 0.25, 'triangle', 0.08);
    await RM.say('Gideon', right ? `"${names[next - 1]}. Hmph. Lucky." ` : `"${names[next - 1]}! Ha! The dead have no luck at all."`);
    card = next;
  }
  await RM.say('Gideon', score >= 2 ? '"You win, blast you. I\'ll dig. I was going to anyway." <i>He laughs until he coughs.</i>' : '"Grave\'s yours to dig, then. Don\'t worry. I\'ll supervise." <i>He hands you the shovel, delighted.</i>');
  await RM.say('Gideon', '"You know what I like about you, Sleeper? You\'re the only one in this town who ever <i>asks</i> me things."');
  S().bonds.gideon += 2; S().humanity += 3; RM.toast('🙂 Gideon: <b>Good friend</b>');
  RM.camMode = 'player';
  done('ok');
});
N2.hang_tobias = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); RM.fade(0, 0.8);
  const s = S(), turned = s.flags.tobiasTurned;
  RM.placePlayer(-6, 40, Math.PI);
  const t = RM.npc({ ...RM.LOOKS.tobias, extras: ['hat'] }, -7.5, 37.5, 0, { vamp: turned ? { humanity: 10, pale: 0.6 } : {} }); t.face(P.x, P.z);
  if (!turned) {
    t.fig.setPose('kneel');
    await RM.say('Tobias', '"You again." <i>He\'s sitting on a gravestone, leg splinted with a broken plank. Badly.</i> "That\'s not going to heal straight, is it."');
    RM.control = true; RM.lockPointer();
    RM.setObjective('Set his leg: stand by him and <b>hold E</b>'); RM.setMarker(t.x, t.z);
    await new Promise((res) => { RM.sceneTick = () => { if (RM.dist(P.x, P.z, t.x, t.z) < 1.8) { RM.sceneTick = null; res(); } }; });
    await RM.holdAction({ label: 'STEADY...', secs: 2.5, sound: 'none' });
    AU.hit(0.6); RM.shake(0.03, 0.3); RM.control = false; RM.setMarker(null);
    await RM.say('Tobias', '"<b>AARGH</b>— ...oh. Oh, that\'s better." <i>He glares at you.</i> "I am not going to thank you twice in one night."');
    await RM.say('Tobias', '"...My sister Agnes arrives in two nights. If she finds you, she won\'t stop to talk. I thought you should know." <i>He won\'t look at you.</i>');
    s.bonds.tobias = (s.bonds.tobias || 0) + 1; s.humanity += 4; s.flags.warnedAgnes = true;
    done('ok'); return;
  }
  await RM.say('Tobias', '"You\'re too slow. Too loud. You bite like a dog." <i>He sets up straw dummies between the graves.</i> "Hunter\'s drill. Six targets. Twenty seconds. Claws only."');
  const dummies = [];
  for (let i = 0; i < 6; i++) {
    const x = -14 + (i % 3) * 5 + rand(-1, 1), z = 42 + Math.floor(i / 3) * 6 + rand(-1, 1);
    const g = new THREE.Group(); g.position.set(x, 0, z); RM.actors.add(g);
    const straw = new THREE.MeshStandardMaterial({ color: 0xb09050, roughness: 1 });
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 8), straw), g).position.y = 0.9;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), straw), g).position.y = 1.62;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), M.darkWood), g).position.y = 0.3;
    dummies.push({ g, x, z, up: true });
  }
  RM.control = true; RM.lockPointer();
  let left = 20, hits = 0;
  RM.onAttack = () => {
    if (RM.hands.animT < 0.25 && RM.hands.anim) return;
    RM.hands.play(Math.random() < 0.5 ? 'claw' : 'claw2'); AU.whoosh(0.4);
    for (const d of dummies) if (d.up && RM.dist(P.x, P.z, d.x, d.z) < 2.2 && RM.facing(d.x, d.z, 0.4)) { d.up = false; hits++; AU.hit(0.5); d.g.rotation.x = -1.3; }
  };
  RM.onDash = () => RM.dash();
  await new Promise((res) => {
    RM.sceneTick = (dt) => {
      left -= dt; RM.setObjective(`Claw all six dummies: <b>${hits} / 6</b> · <b>${Math.max(0, left).toFixed(1)}</b>s<br><span class="dim">Space to dash between them</span>`);
      if (hits >= 6 || left <= 0) { RM.sceneTick = null; res(); }
    };
  });
  RM.control = false; RM.onAttack = null; RM.setObjective('');
  await RM.say('Tobias', hits >= 6 ? `"${(20 - left).toFixed(1)} seconds." <i>A long pause.</i> "...Not bad. For a corpse."` : `"${hits} out of six. Agnes would have had your head off by the third." <i>But he's almost smiling.</i>`);
  await RM.say('Tobias', '"Strange. I used to hunt things like us. Now there\'s an <i>us</i>." <i>He looks up the hill at the Manor.</i> "Vane paid me by the fang. I\'d like to pay him back."');
  s.bonds.tobias = (s.bonds.tobias || 0) + 2; RM.toast('🦇 Tobias: <b>Brother in arms</b>');
  done('ok');
});
N2.hang_corvin = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); RM.addFlock(-32, 34, 33, 12, 12);
  const tp = w.data.P.tower;
  RM.camMode = 'free'; const cam = RM.camera; cam.position.set(tp.x + 1.5, 27.5, tp.z - 2.5); cam.lookAt(10, 8, -30);
  RM.corvin.place(tp.x + 2.4, 26.7, tp.z - 3.2);
  RM.fade(0, 1);
  await RM.say('Corvin', '"Best view in Ravenmoor. You can see the whole town from up here. And the Manor. Always the Manor."');
  await RM.say('Corvin', '"I want to tell you something, and I\'d like you not to laugh." <i>He fluffs his feathers.</i> "I wasn\'t always a raven."');
  await RM.say('Corvin', '"Forty years ago, I worked for Aldous Vane. I carried his letters. I stood in his hall while his painter painted people. I stood there while they... didn\'t come out again."');
  await RM.say('Corvin', '"When I tried to tell the town, he had me <i>changed</i>. Feathers. Beak. Forever. The only one who could still understand me was the thing in that crypt. And now, you."');
  const c = await RM.choose({ q: 'Corvin has told you his secret.', options: [
    { id: 'thank', icon: '🖤', label: 'Thank him for trusting you', sub: 'He looks like he needs it.' },
    { id: 'angry', icon: '😠', label: '"You worked for VANE?"', sub: 'He watched people vanish and said nothing.' },
  ] });
  if (c === 'thank') { S().bonds.corvin += 2; await RM.say('Corvin', '"...Hm. Well. Don\'t get sentimental. It doesn\'t suit either of us." <i>But he leans against your shoulder until the sky goes grey.</i>'); }
  else { S().bonds.corvin -= 1; await RM.say('Corvin', '"Yes. I did. And I\'ve had forty years to be sorry about it." <i>He doesn\'t look at you for a long time.</i>'); }
  await RM.memoryFlash('THE BELL TOWER', ['You\'ve been up here before. Small, climbing, with a friend with freckles.', 'A young man in a messenger\'s cap chased you both down. <i>"Out! The Magistrate doesn\'t like children in his tower."</i>', 'He had a kind face. He gave you a sweet on the way out. <i>Corvin.</i>']);
  RM.camMode = 'player';
  done('ok');
});
N2.hang_imelda = () => RM.play(async (done) => {
  const w = RM.useWorld('church'); RM.setEnv('church'); RM.fade(0, 0.8);
  RM.placePlayer(0, 1.5, 0);
  const im = RM.npc(RM.LOOKS.imelda, 1.2, -24, Math.PI);
  const stands = [];
  for (const [x, z] of [[-4.8, -8], [4.8, -8], [-4.8, -15], [4.8, -15], [-4.8, -22]]) {
    RM.build.cyl(0.05, 0.12, 1.2, RM.MAT.iron, x, 0.6, z, 8, RM.actors); RM.build.cyl(0.035, 0.035, 0.3, RM.MAT.wax, x, 1.35, z, 8, RM.actors);
    const st = { x, z, lit: false }; stands.push(st);
    RM.addInteract({ x: x * 0.8, z, r: 1.8, when: () => !st.lit, label: 'Light the candle', use: () => { st.lit = true; RM.flame(x, 1.5, z, { size: 0.08, light: 0.9, parent: RM.actors }); AU.chime(0.2); } });
  }
  void w;
  await RM.say('Imelda', '"Candles. One for every soul the Manor took this year. Light them with me. It will sting. That\'s rather the point."');
  RM.control = true; RM.lockPointer();
  let burn = 0; const smoke = [];
  RM.bar('burn', 0, 'HOLY GROUND');
  await new Promise((res) => {
    RM.sceneTick = (dt) => {
      const next = stands.find((q) => !q.lit); if (next && (!RM.marker || RM.marker.x !== next.x * 0.8 || RM.marker.z !== next.z)) RM.setMarker(next.x * 0.8, next.z);
      const onHoly = P.z < -3;
      if (onHoly) burn = Math.min(92, burn + holyBurn(0.3) * dt); else burn = Math.max(0, burn - dt * 8);
      smokeFromHands(smoke, dt, onHoly);
      RM.bar('burn', burn, 'HOLY GROUND');
      const n = stands.filter((s) => s.lit).length;
      RM.setObjective(`Light the candles: <b>${n} / 5</b>`);
      if (n >= 5) { RM.sceneTick = null; res(); }
    };
  });
  RM.control = false; RM.bar('burn', null);
  im.face(P.x, P.z);
  await RM.say('Imelda', '"Thank you." <i>She takes out a parish register, thick as a gravestone, and opens it to a page marked with a ribbon.</i>');
  await RM.memoryFlash('THE REGISTER', ['A line in faded ink: <b>{name}. Taken to the Manor to sit for a portrait, by order of the Magistrate.</b>', 'Beside it, in different ink: <i>Never returned.</i>', 'Beside that, in Imelda\'s hand, much newer: <i>Still hoping.</i>']);
  S().bonds.imelda = (S().bonds.imelda || 0) + 2; S().humanity += 3; RM.toast('🕯 Imelda: <b>Friend</b>');
  done('ok');
});

/* ------------------------------------------------------ where to sleep */
N2.sleep = () => RM.play(async (done) => {
  const s = S();
  const c = await RM.choose({ q: 'The sky is going grey. Where do you sleep today?', options: [
    { id: 'coffin', icon: '⚰️', label: 'Your coffin in the crypt', sub: s.choices.dawn === 'bed' ? 'Same as last time. It\'s comfy. It\'s yours.' : 'Home, such as it is.' },
    { id: 'church', icon: '⛪', label: 'Imelda\'s sanctuary', sub: 'Walk up the aisle to her altar. Holy ground burns.' },
    { id: 'sewers', icon: '🐀', label: 'The sewers', sub: 'Filthy. Nobody will ever look there.' },
  ] });
  s.choices.sleep2 = c;
  done(c);
});
N2.sleepChurch = () => RM.play(async (done) => {
  const w = RM.useWorld('church'); RM.setEnv('church'); RM.fade(0, 1);
  RM.placePlayer(0, 2.6, 0);
  const im = RM.npc(RM.LOOKS.imelda, 0.9, -28, 0); im.face(0, -26);
  RM.control = true; RM.lockPointer();
  RM.setObjective('Walk up the aisle to <b>Sister Imelda</b> at the altar.<br><span class="dim">The less human you are, the more it burns. Don\'t stop.</span>');
  RM.setMarker(0, -25.8);
  let burn = 0; const smoke = [];
  RM.bar('burn', 0, 'HOLY GROUND');
  RM.sceneTick = async (dt) => {
    im.update(dt); im.face(P.x, P.z);
    const onHoly = P.z < w.data.holyZ;
    P.speedMul = onHoly ? 0.6 : 1; RM.canSprint = !onHoly;
    if (onHoly) { burn += holyBurn() * dt; AU.sizzleN.set(0.08 + burn / 400, 0.1); if (Math.random() < dt * 0.5) RM.caption(RM.pick(['<i>Every step is like walking into the sun.</i>', '<i>The saints in the windows are watching you.</i>', '<i>Keep going. Keep going.</i>']), 2); }
    else { burn = Math.max(0, burn - dt * 6); AU.sizzleN.set(0, 0.3); }
    smokeFromHands(smoke, dt, onHoly);
    RM.bar('burn', burn, 'HOLY GROUND');
    RM.canvasFilter(onHoly ? `brightness(${1 + burn / 300}) sepia(${burn / 300})` : '');
    if (burn >= 100) { RM.control = false; AU.sizzleN.set(0.5, 0.05); AU.sting(0.8); RM.flash('rgba(255,245,220,1)', 3000); done('ash'); return; }
    if (P.z < -24.8 && RM.control) {
      RM.control = false; AU.sizzleN.set(0, 0.5); RM.canvasFilter(''); RM.setMarker(null);
      await RM.say('Imelda', burn > 55 ? '"You made it." <i>She is crying, a little.</i> "Oh, child. There is more of you left than you think."' : '"You made it. And barely a blister." <i>She looks almost proud.</i> "There is a great deal of you left in there."');
      await RM.say('Imelda', '"Sleep behind the altar. No hunter crosses this floor. Not Vane\'s, not Crook\'s. Not while I\'m breathing."');
      S().bonds.imelda = (S().bonds.imelda || 0) + 2; S().flags.sanctuary = true;
      done('ok');
    }
  };
});
// Sleeping somewhere a hunter can find you. place: 'coffin' or 'sewers'. hunter: 'tobias' or 'agnes'
N2.sleepCoffinRule = (hunted, hunter, place = 'coffin') => RM.play(async (done) => {
  const s = S();
  const w = RM.useWorld('crypt'); RM.setEnv('crypt');
  RM.camMode = 'free'; RM.hands.visible = false;
  const cam = RM.camera; cam.position.set(0, 0.62, -28); cam.rotation.set(Math.PI / 2 - 0.02, Math.PI, 0);
  w.data.coffinLid.rotation.z = 0;
  RM.$('fade').style.opacity = 0.92;
  if (place === 'sewers') { RM.$('fade').style.opacity = 1; await RM.say('You', '<i>The same dry ledge in the sewers as last time. The same rats. It\'s nice to have something that stays the same.</i>'); }
  else await RM.say('You', '<i>You climb into your coffin. The same coffin, the same place, the same pillow of red velvet. It\'s nice to have something that stays the same.</i>');
  if (!hunted) { await RM.sleep(1); await RM.fade(1, 1.5); done('ok'); return; }
  await RM.sleep(1.5); AU.scratch(0.3); await RM.sleep(1);
  if (place === 'sewers') {
    RM.caption('Footsteps in the water. A lantern, coming closer.', 3); await RM.sleep(2.5);
  } else {
    RM.caption('The lid is moving. It\'s not you moving it.', 3);
    for (let i = 0; i <= 25; i++) { w.data.coffinLid.rotation.z = lerp(0, -0.9, i / 25); RM.$('fade').style.opacity = 0.92 - i * 0.03; await RM.sleep(0.04); }
  }
  const look = hunter === 'agnes' ? RM.LOOKS.agnes : RM.LOOKS.tobias;
  const t = RM.npc({ ...look, extras: ['hat', 'stake'] }, 0.9, -28.1, Math.PI / 2); t.face(0, -28); t.fig.setPose('raise');
  cam.rotation.set(Math.PI / 2 - 0.35, Math.PI, 0.35); RM.$('fade').style.opacity = 0.2;
  if (hunter === 'agnes') await RM.say('Agnes', '"You killed my brother in a river." <i>The stake comes up.</i> "Same place twice, Sleeper. Tobias always said they get lazy in the end."');
  else await RM.say('Tobias', s.flags.tobiasSpared ? '"You spared me. I know. I lay awake all day hating that." <i>The stake comes up.</i> "But you slept in the same place twice, Sleeper. Hunters are patient."' : '"Same place twice, Sleeper. Didn\'t anyone ever tell you?" <i>The stake comes up.</i> "Hunters are patient."');
  AU.sting(1); RM.shake(0.1, 0.4); RM.$('fade').style.transition = 'none'; RM.$('fade').style.opacity = 1; AU.thud(1);
  await RM.sleep(1.5);
  done(hunter === 'agnes' ? 'sister' : 'stake');
});
N2.sleepCoffin = () => N2.sleepCoffinRule(false, null);
N2.sleepSewers = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv(RM.blendEnv('night', 'dawn', 0.15)); RM.spawnTownRavens(w); RM.fade(0, 0.8);
  RM.placePlayer(15, 0, -Math.PI / 2);
  const grate = new THREE.Group(); grate.position.set(22, 0.02, 0.9); RM.actors.add(grate);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 1), RM.MAT.iron); b.position.x = -0.45 + i * 0.15; grate.add(b); }
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.rotation.x = -Math.PI / 2; hole.position.y = -0.005; grate.add(hole);
  RM.control = true; RM.lockPointer();
  RM.setObjective('Find the <b>sewer grate</b> in the alley'); RM.setMarker(22, 0.9);
  RM.addInteract({ x: 22, z: 0.9, r: 1.6, label: 'Climb down into the sewers', use: async (o) => {
    o.off = true; RM.control = false; AU.clang(0.4); await RM.fade(1, 1);
    await RM.say('You', '<i>It stinks. It drips. Rats squeak in the dark (you are, you realise, getting quite fond of rats). Nobody will ever look for you down here.</i>');
    S().flags.sewers = true;
    done('ok');
  } });
});

/* ============================================================ THE NIGHT */
RM.nightTwo = async function () {
  const s = S(); s.night = 2;
  if (!s.lastSleep) s.lastSleep = s.choices.dawn === 'bed' ? 'coffin' : 'stairs';
  RM.store.set('ckpt2', JSON.parse(JSON.stringify(s)));
  RM.applyLook();
  await RM.card('NIGHT TWO', 'THE WITCH-FINDER');
  await N2.wake();
  await RM.fade(1, 0.8); RM.fade(0, 1);
  for (;;) {
    const r = await N2.moor();
    if (r !== 'dead') break;
    await RM.fade(1, 0.6);
    await RM.say('Corvin', '"Ow. That\'s silver for you. Up you get. Crouch in the heather, keep rocks between you and him, and watch for the <b>glint</b>: that means he\'s aiming."');
    RM.fade(0, 0.8);
  }
  await N2.tobias();
  await RM.fade(1, 1); RM.fade(0, 1);
  const c = await N2.choirIntro();
  const v = victim();
  if (c === 'save') {
    for (;;) {
      const r = await N2.choirSave();
      if (r === 'saved') { s.bonds[v.id] = (s.bonds[v.id] || 0) + 3; s.humanity += 6; RM.toast(`🖤 ${v.name}: <b>Saved</b>`); break; }
      s.dread += 1;
      if (s.dread >= 5) { await RM.fade(1, 0.8); RM.fade(0, 1); return RM.showEnding('crowd'); }
      await RM.fade(1, 0.6);
      await RM.say('Corvin', s.dread >= 4 ? '"They let you go. They won\'t again. <b>Crouch. Watch their lanterns. Use Blood Sight.</b>"' : '"You slipped away when the singing stopped. Again, and slower this time."');
      RM.fade(0, 0.8);
    }
  } else if (c === 'hide') {
    for (;;) {
      const r = await N2.choirHide();
      if (r === 'hid') break;
      s.dread += 1;
      if (s.dread >= 5) { await RM.fade(1, 0.8); RM.fade(0, 1); return RM.showEnding('crowd'); }
      await RM.fade(1, 0.6); await RM.say('Corvin', '"Barely got out of that. Try again: get behind the barrels <b>fast</b>, and then don\'t touch ANYTHING."'); RM.fade(0, 0.8);
    }
    s.flags[v.id + 'Taken'] = true; s.bonds[v.id] = (s.bonds[v.id] || 0) - 3; s.humanity -= 6;
    await RM.say('Corvin', `"...They've got ${v.name}. Up the hill, to the Manor." <i>He's quiet for a moment.</i> "We'll get them back. Won't we?"`);
  } else if (c === 'kill') {
    for (;;) {
      const r = await N2.choirKill();
      if (r === 'won') break;
      await RM.fade(1, 0.6); await RM.say('Corvin', '"Those lanterns hit hard. Watch for the <b>!</b>, then dash."'); RM.fade(0, 0.8);
    }
    s.kills += 4; s.humanity -= 16; s.dread += 2; s.bonds[v.id] = (s.bonds[v.id] || 0) - 1; s.flags.choirDead = true;
    await RM.say(v.id === 'pip' ? 'Pip' : 'You', v.id === 'pip' ? '"You... they were... you ripped them..." <i>Pip is shaking.</i> "Thank you. I think. I don\'t know."' : `<i>${v.name} stares at you, at the masks on the cobbles, and backs slowly away.</i>`);
  } else {
    const r = await N2.bell();
    if (r === 'holyfire') { await RM.sleep(2.5); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('holyfire'); }
    if (r === 'ash') { await RM.sleep(2); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('altar'); }
    s.bonds[v.id] = (s.bonds[v.id] || 0) + 2; s.dread += 1; s.flags.rangBell = true;
    await RM.say('Corvin', `"The whole Choir dropped like sacks of flour. ${v.name} ran for it. And YOU'RE not on fire. Honestly, I'm impressed."`);
  }
  await RM.fade(1, 0.8); RM.fade(0, 1);
  await N2.imelda();
  await N2.hangout();
  await RM.fade(1, 0.8); RM.fade(0, 1);
  const sl = await RM.sleepFor();
  if (sl === 'stake' || sl === 'sister' || sl === 'altar') { RM.fade(0, 1); return RM.showEnding(sl); }
  await RM.fade(1, 1);
  return 'next';
};
})();
