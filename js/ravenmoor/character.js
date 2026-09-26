/* =====================================================================
   RAVENMOOR — characters
   Builds a 3D person from a "look" (skin, hair, eyes, outfit...) and runs
   the character creator. The same builder makes you, Pip, Gideon and the
   hunters, and it can make you paler, gold- or red-eyed and fanged as the
   story changes you.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { clamp, lerp, rand, TAU, $ } = RM;

/* ------------------------------------------------------------- options */
const OPT = (RM.LOOK = {
  gender: [
    { id: 'girl', label: 'Girl', pr: { they: 'she', them: 'her', their: 'her', theyre: "she's" } },
    { id: 'boy', label: 'Boy', pr: { they: 'he', them: 'him', their: 'his', theyre: "he's" } },
    { id: 'neither', label: 'Neither', pr: { they: 'they', them: 'them', their: 'their', theyre: "they're" } },
  ],
  skin: ['#fbe4d2', '#f2cdb0', '#e6b690', '#d7a073', '#c3875b', '#a86f48', '#8b5838', '#6f452d', '#553322', '#3d2419'],
  face: [{ id: 'oval', label: 'Oval' }, { id: 'round', label: 'Round' }, { id: 'square', label: 'Square' }, { id: 'heart', label: 'Heart' }],
  marks: [{ id: 'none', label: 'None' }, { id: 'freckles', label: 'Freckles' }, { id: 'mole', label: 'Beauty mark' }, { id: 'scar', label: 'Scar' }],
  hair: [
    { id: 'long', label: 'Long' }, { id: 'short', label: 'Short' }, { id: 'curly', label: 'Curly' }, { id: 'braids', label: 'Braids' },
    { id: 'buzz', label: 'Buzz cut' }, { id: 'bun', label: 'Bun' }, { id: 'messy', label: 'Messy' }, { id: 'locs', label: 'Locs' },
    { id: 'ponytail', label: 'Ponytail' }, { id: 'bob', label: 'Bob' }, { id: 'bald', label: 'Bald' },
  ],
  hairColor: [
    { id: 'black', hex: '#15110f' }, { id: 'darkbrown', hex: '#35200f' }, { id: 'brown', hex: '#5c3a20' }, { id: 'blonde', hex: '#d6b067' },
    { id: 'ginger', hex: '#b0512a' }, { id: 'white', hex: '#ebe7e0' }, { id: 'silver', hex: '#a9b3c3' }, { id: 'deepred', hex: '#6e0f1e' },
    { id: 'midnight', hex: '#1b2552' }, { id: 'violet', hex: '#4a2a6a' },
  ],
  eyes: [
    { id: 'brown', hex: '#5a391c' }, { id: 'dark', hex: '#2a1a10' }, { id: 'hazel', hex: '#86692e' }, { id: 'green', hex: '#3e7b4b' },
    { id: 'blue', hex: '#4a7ccc' }, { id: 'grey', hex: '#8b939c' }, { id: 'violet', hex: '#6d4ea0' },
  ],
  outfit: [
    { id: 'coat', label: "Traveller's coat" }, { id: 'nightgown', label: 'Nightgown' }, { id: 'farm', label: 'Farm clothes' },
    { id: 'gown', label: 'Party gown' }, { id: 'suit', label: 'Party suit' }, { id: 'hoodie', label: 'Hoodie & jeans' },
  ],
  outfitColor: ['#7a1424', '#2a4a34', '#1f2d55', '#4d2552', '#2b2b30', '#d9cfb8', '#8a5a2a', '#3a6a8a'],
  extras: [{ id: 'necklace', label: 'Necklace' }, { id: 'earrings', label: 'Earrings' }, { id: 'ribbon', label: 'Hair ribbon' }, { id: 'glasses', label: 'Glasses' }, { id: 'scarf', label: 'Scarf' }],
});
RM.defaultLook = () => ({
  name: 'Wren', gender: 'neither', skin: OPT.skin[3], face: 'oval', marks: 'none', hair: 'long', hairColor: '#15110f',
  eyes: '#5a391c', outfit: 'coat', outfitColor: '#7a1424', extras: ['necklace'],
});
RM.randomLook = () => {
  const P = RM.pick;
  const ex = OPT.extras.filter(() => Math.random() < 0.25).map((e) => e.id);
  return {
    name: P(['Wren', 'Ash', 'Rowan', 'Isla', 'Elias', 'Mira', 'Theo', 'Noor', 'Kai', 'Esme', 'Jonah', 'Sable', 'Juniper', 'Luca']),
    gender: P(OPT.gender).id, skin: P(OPT.skin), face: P(OPT.face).id, marks: P(OPT.marks).id, hair: P(OPT.hair).id,
    hairColor: P(OPT.hairColor).hex, eyes: P(OPT.eyes).hex, outfit: P(OPT.outfit).id, outfitColor: P(OPT.outfitColor), extras: ex,
  };
};
RM.pronouns = (look) => (OPT.gender.find((g) => g.id === look.gender) || OPT.gender[2]).pr;

/* ------------------------------------------------ vampire transformation */
// vamp = { pale 0..1, humanity 0..100, fangs 0..1, wear 0..1, burns bool, blood 0..1, faceless bool }
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
RM.paleSkin = (hex, pale) => {
  _c1.set(hex); const hsl = {}; _c1.getHSL(hsl);
  // keeps your skin tone, but drains the warmth and life out of it
  _c2.setHSL(lerp(hsl.h, 0.62, pale * 0.35), hsl.s * (1 - pale * 0.75), clamp(hsl.l + pale * (0.8 - hsl.l) * 0.35, 0, 0.92));
  return '#' + _c2.getHexString();
};
RM.eyeColor = (look, humanity) => (humanity >= 60 ? look.eyes : humanity >= 30 ? '#d8a01e' : '#e0141e');

/* --------------------------------------------------------- face texture */
function drawFace(look, vamp, skinHex) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = skinHex; g.fillRect(0, 0, 512, 256);
  const cx = 128; // the front of a three.js sphere sits a quarter of the way across its texture
  // soft shading so it isn't a flat ball
  const sh = g.createRadialGradient(cx, 130, 10, cx, 130, 150);
  sh.addColorStop(0, 'rgba(255,255,255,0.06)'); sh.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = sh; g.fillRect(0, 0, 512, 256);
  if (vamp.faceless) return c;
  const pale = vamp.pale || 0;
  // under-eye shadows deepen as you turn
  if (pale > 0.2) { g.fillStyle = `rgba(60,20,50,${pale * 0.25})`; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 17, 128, 11, 5, 0, 0, TAU); g.fill(); } }
  // blush fades away as you turn
  g.fillStyle = `rgba(220,90,90,${0.14 * (1 - pale)})`;
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 22, 142, 10, 6, 0, 0, TAU); g.fill(); }
  // eyes
  const eye = RM.eyeColor(look, vamp.humanity === undefined ? 100 : vamp.humanity);
  for (const s of [-1, 1]) {
    const ex = cx + s * 16, ey = 118;
    g.fillStyle = '#f4efe8'; g.beginPath(); g.ellipse(ex, ey, 7.5, 4.6, 0, 0, TAU); g.fill();
    g.fillStyle = eye; g.beginPath(); g.arc(ex, ey, 3.9, 0, TAU); g.fill();
    if (eye === '#e0141e' || eye === '#d8a01e') { g.fillStyle = eye === '#e0141e' ? 'rgba(255,40,40,0.35)' : 'rgba(255,200,60,0.3)'; g.beginPath(); g.arc(ex, ey, 7, 0, TAU); g.fill(); }
    g.fillStyle = '#0a0606'; g.beginPath(); g.arc(ex, ey, 1.8, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(ex + 1, ey - 2.4, 1.4, 1.4);
    g.strokeStyle = 'rgba(30,15,10,0.8)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(ex, ey, 7.5, 4.6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // brows
    g.strokeStyle = look.hair === 'bald' ? 'rgba(60,40,30,0.6)' : look.hairColor; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex - s * 7, ey - 9); g.quadraticCurveTo(ex, ey - 12.5, ex + s * 8, ey - 9.5); g.stroke();
  }
  // nose
  g.strokeStyle = 'rgba(80,40,30,0.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, 124); g.lineTo(cx - 3, 139); g.lineTo(cx + 2, 141); g.stroke();
  // mouth
  const lip = pale > 0.5 ? '#6a3a44' : '#a2525a';
  g.fillStyle = lip; g.beginPath(); g.moveTo(cx - 9, 153); g.quadraticCurveTo(cx, 158, cx + 9, 153); g.quadraticCurveTo(cx, 155.5, cx - 9, 153); g.fill();
  g.strokeStyle = 'rgba(60,20,20,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - 9, 153); g.quadraticCurveTo(cx, 155.5, cx + 9, 153); g.stroke();
  if ((vamp.fangs || 0) > 0) {
    const L = 3 + vamp.fangs * 4;
    g.fillStyle = '#fbf8f2';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 5, 154); g.lineTo(cx + s * 3, 154); g.lineTo(cx + s * 4.2, 154 + L); g.fill(); }
  }
  if ((vamp.blood || 0) > 0.3) { g.fillStyle = 'rgba(120,0,10,0.75)'; g.fillRect(cx - 2, 156, 2.5, 8 + vamp.blood * 8); g.beginPath(); g.arc(cx - 0.8, 165 + vamp.blood * 8, 2, 0, TAU); g.fill(); }
  // marks
  if (look.marks === 'freckles') { g.fillStyle = 'rgba(120,60,30,0.55)'; for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1; g.beginPath(); g.arc(cx + s * rand(10, 30), rand(128, 146), rand(0.8, 1.6), 0, TAU); g.fill(); } }
  if (look.marks === 'mole') { g.fillStyle = '#3a1a10'; g.beginPath(); g.arc(cx + 14, 149, 1.8, 0, TAU); g.fill(); }
  if (look.marks === 'scar') { g.strokeStyle = 'rgba(150,80,80,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 26, 104); g.lineTo(cx - 12, 140); g.stroke(); g.lineWidth = 1; for (let i = 0; i < 5; i++) { const t = i / 4, x = lerp(cx - 26, cx - 12, t), y = lerp(104, 140, t); g.beginPath(); g.moveTo(x - 3, y + 1); g.lineTo(x + 3, y - 1); g.stroke(); } }
  if (vamp.burns) { g.fillStyle = 'rgba(110,20,10,0.45)'; g.beginPath(); g.ellipse(cx + 22, 112, 14, 20, 0.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(40,10,10,0.35)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(cx + rand(12, 34), rand(96, 130), rand(1, 3), 0, TAU); g.fill(); } }
  return c;
}

/* ------------------------------------------------------------ materials */
// colours are picked as normal screen colours, so convert them for the renderer's linear lighting
const mat = (hex, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(hex).convertSRGBToLinear(), roughness: rough }, extra));
const cyl = (rt, rb, h, m, seg = 12, open = false, ts, tl) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl), m);
const sph = (r, m, ws = 14, hs = 10, ps, pl, ts, tl) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs, ps, pl, ts, tl), m);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const shade = (hex, k) => { _c1.set(hex); _c1.multiplyScalar(k); return '#' + _c1.getHexString(); };

/* ----------------------------------------------------------- the builder */
// Returns { group, head, armL, armR, legL, legR, update(dt, speed), setPose(name) }
RM.buildFigure = (look, vamp = {}, opts = {}) => {
  const G = new THREE.Group();
  const girlish = look.gender === 'girl', boyish = look.gender === 'boy';
  const skinHex = RM.paleSkin(look.skin, vamp.pale || 0);
  const wear = vamp.wear || 0;
  const skinM = mat(skinHex, 0.62);
  const main = shade(look.outfitColor, 1 - wear * 0.35);
  const mainM = mat(main, 0.85), darkM = mat(shade(main, 0.55), 0.9);
  const hairM = mat(look.hairColor, 0.62, { metalness: 0.05 });
  const shoeM = mat('#1a1414', 0.5);
  const goldM = mat('#c9a24a', 0.3, { metalness: 0.85 });
  const whiteM = mat(shade('#e8e0d0', 1 - wear * 0.3), 0.8);
  const all = [];
  const add = (m, parent = G) => { m.castShadow = true; m.receiveShadow = true; parent.add(m); all.push(m); return m; };

  // legs (pivot at the hip so they can swing)
  const legM = { coat: mat('#2a2426'), nightgown: skinM, farm: mat('#3a4e6a', 0.9), gown: skinM, suit: mat('#141418', 0.6), hoodie: mat('#39527a', 0.9), robe: mat('#120a0e') }[look.outfit] || darkM;
  const legs = [];
  for (const s of [-1, 1]) {
    const L = new THREE.Group(); L.position.set(s * 0.095, 0.86, 0); G.add(L);
    add(cyl(0.075, 0.06, 0.8, legM), L).position.y = -0.42;
    const shoe = add(box(0.11, 0.08, 0.22, look.outfit === 'hoodie' ? mat('#e8e8e4', 0.6) : look.outfit === 'nightgown' ? skinM : shoeM), L);
    shoe.position.set(0, -0.82, -0.04);
    legs.push(L);
  }
  // hips + torso
  const torsoTop = boyish ? 0.205 : girlish ? 0.175 : 0.19, waist = girlish ? 0.135 : 0.155;
  add(box(boyish ? 0.3 : 0.32, 0.16, 0.2, look.outfit === 'nightgown' || look.outfit === 'gown' ? mainM : legM)).position.y = 0.9;
  const torsoM = look.outfit === 'suit' ? mainM : look.outfit === 'farm' ? mat(shade(main, 1.1), 0.9) : mainM;
  const torso = add(cyl(torsoTop, waist, 0.56, torsoM, 16)); torso.position.y = 1.2; torso.scale.set(1.12, 1, 0.72);
  if (girlish) { const chest = add(sph(0.16, torsoM, 14, 10)); chest.scale.set(1.05, 0.55, 0.5); chest.position.set(0, 1.3, -0.03); }
  add(cyl(0.05, 0.055, 0.1, skinM)).position.y = 1.5;

  // outfit pieces
  const o = look.outfit;
  if (o === 'coat') {
    const coat = add(cyl(0.2, 0.31, 0.95, mainM, 18, true)); coat.position.y = 0.95; coat.scale.z = 0.8; coat.material.side = THREE.DoubleSide;
    const col = add(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 20), darkM)); col.rotation.x = Math.PI / 2; col.position.y = 1.47;
    for (let i = 0; i < 4; i++) add(sph(0.014, goldM, 6, 4)).position.set(0.04, 1.36 - i * 0.12, -0.155);
  } else if (o === 'nightgown') {
    const d = add(cyl(0.17, 0.34, 1.15, mainM, 18, true)); d.position.y = 0.72; d.material.side = THREE.DoubleSide;
  } else if (o === 'farm') {
    const bib = add(box(0.24, 0.26, 0.03, mat('#3a4e6a', 0.9))); bib.position.set(0, 1.16, -0.15);
    for (const s of [-1, 1]) { const st = add(box(0.035, 0.34, 0.02, mat('#3a4e6a', 0.9))); st.position.set(s * 0.09, 1.3, -0.14); st.rotation.z = s * 0.1; }
  } else if (o === 'gown') {
    const d = add(cyl(0.15, 0.46, 0.95, mainM, 24, true)); d.position.y = 0.5; d.material.side = THREE.DoubleSide;
    const trim = add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 24), goldM)); trim.rotation.x = Math.PI / 2; trim.position.y = 0.97; trim.scale.y = 0.72;
    const hem = add(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 6, 32), goldM)); hem.rotation.x = Math.PI / 2; hem.position.y = 0.04;
  } else if (o === 'suit') {
    const shirt = add(box(0.1, 0.3, 0.02, whiteM)); shirt.position.set(0, 1.28, -0.145);
    const tie = add(box(0.05, 0.03, 0.02, mat('#101010'))); tie.position.set(0, 1.42, -0.16);
    const tails = add(box(0.3, 0.42, 0.04, mainM)); tails.position.set(0, 0.78, 0.1);
    for (let i = 0; i < 3; i++) add(sph(0.013, goldM, 6, 4)).position.set(0.07, 1.3 - i * 0.09, -0.15);
  } else if (o === 'hoodie') {
    const hood = add(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.06, 8, 16, Math.PI * 1.3), mainM)); hood.position.set(0, 1.5, 0.05); hood.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI * 0.85);
    const pk = add(box(0.24, 0.1, 0.03, darkM)); pk.position.set(0, 1.03, -0.14);
    for (const s of [-1, 1]) { const dr = add(cyl(0.005, 0.005, 0.14, whiteM, 4)); dr.position.set(s * 0.04, 1.36, -0.15); }
  } else if (o === 'robe') {
    const r = add(cyl(0.2, 0.42, 1.45, mainM, 18, true)); r.position.y = 0.73; r.material.side = THREE.DoubleSide;
  } else if (o === 'rags') {
    const r = add(cyl(0.19, 0.27, 0.7, mainM, 10, true)); r.position.y = 0.95; r.material.side = THREE.DoubleSide;
  }

  // arms (pivot at the shoulder)
  const sleeveM = o === 'nightgown' || o === 'gown' ? skinM : o === 'farm' ? torsoM : mainM;
  const arms = [];
  for (const s of [-1, 1]) {
    const A = new THREE.Group(); A.position.set(s * (torsoTop + 0.06), 1.44, 0); G.add(A);
    add(cyl(0.055, 0.045, 0.56, sleeveM), A).position.y = -0.28;
    add(sph(0.05, skinM, 10, 8), A).position.y = -0.6;
    A.rotation.z = s * 0.08;
    arms.push(A);
  }

  // head
  const head = new THREE.Group(); head.position.y = 1.66; G.add(head);
  const faceTex = new THREE.CanvasTexture(drawFace(look, vamp, skinHex)); faceTex.encoding = THREE.sRGBEncoding;
  const skull = add(sph(0.125, new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6 }), 32, 20), head);
  const fs = { oval: [0.93, 1.08, 0.97], round: [1.02, 1, 1], square: [1.04, 1, 0.98], heart: [0.97, 1.05, 0.96] }[look.face] || [1, 1, 1];
  skull.scale.set(fs[0], fs[1], fs[2]);
  skull.rotation.y = Math.PI; // turn the drawn face to look forward (−z)
  if (look.face === 'square') { const jaw = add(box(0.17, 0.07, 0.15, skinM), head); jaw.position.set(0, -0.07, -0.01); }
  for (const s of [-1, 1]) add(sph(0.026, skinM, 8, 6), head).position.set(s * 0.122, 0, 0.005);

  // hair
  const hs = look.hair;
  const cap = (r = 0.133, tl = 0.56, tilt = 0.32) => { const m = add(sph(r, hairM, 24, 12, 0, TAU, 0, Math.PI * tl), head); m.rotation.x = tilt; m.position.set(0, 0.012, 0.01); return m; };
  const backShell = (h, r0, r1, y) => { const m = add(cyl(r0, r1, h, hairM, 20, true, 1.0, TAU - 2.0), head); m.material.side = THREE.DoubleSide; m.position.y = y; m.rotation.y = Math.PI; return m; };
  if (hs === 'buzz') { const m = cap(0.128, 0.55, 0.3); m.material = mat(look.hairColor, 0.95); m.material.transparent = true; m.material.opacity = 0.9; }
  else if (hs === 'short') { cap(0.136, 0.58, 0.3); const fr = add(box(0.16, 0.035, 0.05, hairM), head); fr.position.set(0, 0.085, -0.1); fr.rotation.x = 0.4; }
  else if (hs === 'bob') { cap(0.138, 0.6, 0.28); backShell(0.16, 0.14, 0.15, -0.02); }
  else if (hs === 'long') { cap(0.138, 0.6, 0.28); backShell(0.5, 0.145, 0.17, -0.18); }
  else if (hs === 'curly') { cap(0.14, 0.62, 0.25); for (let i = 0; i < 40; i++) { const a = rand(-0.8, 0.8) * Math.PI, y = rand(-0.1, 0.14), r = 0.14 + rand(0.012); if (Math.cos(a) < -0.2 && y < 0.07) continue; add(sph(rand(0.035, 0.05), hairM, 8, 6), head).position.set(Math.sin(a) * r, y, Math.cos(a) * r); } }
  else if (hs === 'braids') { cap(0.137, 0.6, 0.28); for (const s of [-1, 1]) for (let i = 0; i < 7; i++) add(sph(0.032 - i * 0.002, hairM, 8, 6), head).position.set(s * (0.12 - i * 0.004), -0.05 - i * 0.055, -0.02 + i * 0.012); }
  else if (hs === 'bun') { cap(0.136, 0.58, 0.28); add(sph(0.068, hairM, 12, 10), head).position.set(0, 0.12, 0.08); }
  else if (hs === 'messy') { cap(0.14, 0.6, 0.3); for (let i = 0; i < 14; i++) { const t = add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), hairM), head); const a = rand(TAU); t.position.set(Math.cos(a) * 0.1, 0.08 + rand(0.05), Math.sin(a) * 0.1 + 0.02); t.rotation.set(rand(-0.9, 0.9), 0, rand(-0.9, 0.9)); } }
  else if (hs === 'locs') { cap(0.138, 0.6, 0.28); for (let i = 0; i < 16; i++) { const a = (i / 15 - 0.5) * Math.PI * 1.35; const m = add(cyl(0.015, 0.013, 0.42, hairM, 6), head); m.position.set(Math.sin(a) * 0.14, -0.15, Math.max(-0.05, Math.cos(a) * 0.14)); } }
  else if (hs === 'ponytail') { cap(0.137, 0.6, 0.28); add(sph(0.03, hairM, 8, 6), head).position.set(0, 0.03, 0.14); const t = add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.36, 10), hairM), head); t.position.set(0, -0.14, 0.17); t.rotation.x = Math.PI + 0.2; }
  else if (hs === 'hood') { const hd = add(sph(0.16, mainM, 20, 12, 0, TAU, 0, Math.PI * 0.7), head); hd.rotation.x = 0.55; hd.position.set(0, 0.01, 0.02); hd.material.side = THREE.DoubleSide; }
  else if (hs === 'beard') { cap(0.134, 0.5, 0.45); const b = add(sph(0.12, hairM, 14, 10, Math.PI, Math.PI, Math.PI * 0.45, Math.PI * 0.5), head); b.position.set(0, -0.02, -0.01); }

  // extras
  const ex = look.extras || [];
  if (ex.includes('necklace')) { const n = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 6, 20), goldM)); n.rotation.x = Math.PI / 2 + 0.35; n.position.set(0, 1.47, -0.03); add(sph(0.018, mat('#a0101c', 0.2, { metalness: 0.3 }))).position.set(0, 1.42, -0.1); }
  if (ex.includes('earrings')) for (const s of [-1, 1]) add(sph(0.012, goldM, 6, 4), head).position.set(s * 0.126, -0.04, 0);
  if (ex.includes('ribbon')) { const rm = mat('#b0142a', 0.5); for (const s of [-1, 1]) { const b = add(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), rm), head); b.position.set(0.08 + s * 0.035, 0.1, 0.04); b.rotation.z = s * Math.PI / 2; } }
  if (ex.includes('glasses')) { const gm = mat('#1a1410', 0.3, { metalness: 0.6 }); for (const s of [-1, 1]) { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 6, 16), gm), head); r.position.set(s * 0.042, 0.012, -0.125); } const br = add(box(0.03, 0.004, 0.004, gm), head); br.position.set(0, 0.016, -0.126); }
  if (ex.includes('scarf')) { const sm = mat('#6a1a24', 0.95); const s = add(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.035, 8, 18), sm)); s.rotation.x = Math.PI / 2; s.position.y = 1.5; const tail = add(box(0.07, 0.3, 0.03, sm)); tail.position.set(0.06, 1.33, -0.14); }
  if (ex.includes('lantern')) {
    const lg = new THREE.Group(); lg.position.set(0, -0.62, -0.04); arms[1].add(lg);
    add(box(0.12, 0.16, 0.12, mat('#2a2218', 0.5, { metalness: 0.6 })), lg).position.y = -0.1;
    const glass = add(box(0.1, 0.12, 0.1, new THREE.MeshBasicMaterial({ color: 0xffc070 })), lg); glass.position.y = -0.1;
    G.userData.lantern = lg;
  }
  if (ex.includes('shovel')) { const sg = new THREE.Group(); sg.position.set(0, -0.6, 0); arms[0].add(sg); add(cyl(0.015, 0.015, 1.1, mat('#5a3a20')), sg).position.y = -0.1; const bl = add(box(0.16, 0.2, 0.02, mat('#6a6a70', 0.4, { metalness: 0.7 })), sg); bl.position.y = -0.7; }

  if (opts.scale) G.scale.setScalar(opts.scale);
  if (opts.headScale) head.scale.setScalar(opts.headScale);

  const fig = { group: G, head, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1], walk: 0, pose: 'stand', meshes: all };
  fig.update = (dt, speed = 0) => {
    fig.walk += dt * speed * 3.2;
    const k = clamp(speed / 2, 0, 1);
    const sw = Math.sin(fig.walk) * 0.6 * k;
    if (fig.pose === 'stand') {
      fig.legL.rotation.x = sw; fig.legR.rotation.x = -sw;
      fig.armL.rotation.x = -sw * 0.8; fig.armR.rotation.x = sw * 0.8;
      head.position.y = 1.66 + Math.sin(RM.t * 1.6) * 0.004;
    }
  };
  fig.setPose = (p) => {
    fig.pose = p;
    for (const L of [fig.legL, fig.legR, fig.armL, fig.armR]) L.rotation.set(0, 0, 0);
    fig.armL.rotation.z = -0.08; fig.armR.rotation.z = 0.08; G.rotation.x = 0; G.position.y = G.userData.baseY || 0; head.rotation.set(0, 0, 0);
    if (p === 'dig') { fig.armL.rotation.x = -0.9; fig.armR.rotation.x = -0.9; head.rotation.x = 0.4; }
    if (p === 'kneel') { fig.legL.rotation.x = -1.4; fig.legR.rotation.x = 0.2; G.position.y = (G.userData.baseY || 0) - 0.4; }
    if (p === 'lie') { G.rotation.x = -Math.PI / 2; G.position.y = (G.userData.baseY || 0) + 0.15; }
    if (p === 'offer') { fig.armR.rotation.x = -1.2; }
    if (p === 'arms') { fig.armL.rotation.x = -0.4; fig.armR.rotation.x = -0.4; fig.armL.rotation.z = -0.6; fig.armR.rotation.z = 0.6; }
    if (p === 'cower') { fig.armL.rotation.x = -2.2; fig.armR.rotation.x = -2.2; head.rotation.x = 0.5; }
    if (p === 'raise') { fig.armR.rotation.x = -2.4; }
  };
  fig.dispose = () => { G.traverse((m) => { if (m.geometry) m.geometry.dispose(); if (m.material && m.material.map) m.material.map.dispose(); }); };
  return fig;
};

/* ---------------------------------------------------- the creator screen */
// A second little renderer just for the creator preview and ending portraits.
let pv = null;
function previewInit() {
  if (pv) return pv;
  const cv = $('preview');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, preserveDrawingBuffer: true });
  r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x07060c); sc.fog = new THREE.FogExp2(0x07060c, 0.12);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  sc.add(new THREE.HemisphereLight(0x5a6aa8, 0x160c12, 0.8));
  const moonL = new THREE.SpotLight(0xb8c8ff, 1.5, 16, 0.5, 0.7, 1.2); moonL.position.set(1.2, 6, 1.5); moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024); sc.add(moonL); sc.add(moonL.target);
  const candle = new THREE.PointLight(0xff9a4a, 1.6, 5, 1.8); candle.position.set(-1.1, 0.9, 0.6); sc.add(candle);
  const rim = new THREE.PointLight(0xc01830, 1.2, 5, 1.5); rim.position.set(0.6, 1.8, -1.6); sc.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshStandardMaterial({ map: RM.TEX.cryptFloor || null, color: 0x5a5a66, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  // the open coffin behind you, with Corvin perched on the lid
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1812, roughness: 0.7 });
  const coffin = new THREE.Group(); coffin.position.set(0.1, 0, 1.4); coffin.rotation.y = 0.25; sc.add(coffin);
  const cb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2), wood); cb.position.y = 0.25; cb.castShadow = cb.receiveShadow = true; coffin.add(cb);
  const lining = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 1.86), new THREE.MeshStandardMaterial({ color: 0x6a0a18, roughness: 0.9 })); lining.position.y = 0.48; coffin.add(lining);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 2), wood); lid.position.set(-0.75, 0.2, 0); lid.rotation.z = 1.25; lid.castShadow = true; coffin.add(lid);
  const raven = RM.makeRaven(1.25); raven.position.set(-0.2, 0.62, 1.0); raven.rotation.y = 2.4; sc.add(raven);
  const cfl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 })); cfl.position.set(-1.1, 0.15, 0.6); sc.add(cfl);
  const fs = new THREE.Sprite(new THREE.SpriteMaterial({ map: RM.TEX.flame, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); fs.scale.set(0.08, 0.16, 1); fs.position.set(-1.1, 0.36, 0.6); sc.add(fs);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x8fa6ff, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(0.6, 3.2, 0.8); beam.rotation.z = -0.15; sc.add(beam);
  pv = { r, sc, cam, cv, fig: null, spin: 0.35, drag: null, raven, candle, lookAt: new THREE.Vector3(0, 1.0, 0), dist: 4.3, camY: 1.35 };
  const resize = () => { const w = cv.clientWidth || 400, h = cv.clientHeight || 500; r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  pv.resize = resize; addEventListener('resize', resize);
  cv.addEventListener('pointerdown', (e) => { pv.drag = e.clientX; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (pv.drag !== null) { pv.spin += (e.clientX - pv.drag) * 0.012; pv.drag = e.clientX; } });
  cv.addEventListener('pointerup', () => { pv.drag = null; });
  cv.addEventListener('wheel', (e) => { pv.dist = clamp(pv.dist + e.deltaY * 0.003, 2.2, 6); e.preventDefault(); }, { passive: false });
  return pv;
}
function previewSet(look, vamp) {
  const p = previewInit();
  if (p.fig) { p.sc.remove(p.fig.group); p.fig.dispose(); }
  p.fig = RM.buildFigure(look, vamp || {});
  p.sc.add(p.fig.group);
}
let pvRunning = false;
function previewLoop() {
  if (!pvRunning) return;
  requestAnimationFrame(previewLoop);
  const p = pv; if (!p || !p.fig) return;
  if (p.cv.clientWidth && (Math.abs(p.cv.clientWidth * Math.min(devicePixelRatio || 1, 2) - p.cv.width) > 2)) p.resize();
  if (p.drag === null) p.spin += 0.004;
  p.fig.group.rotation.y = p.spin; p.fig.update(0.016, 0);
  p.raven.userData.head.rotation.y = Math.sin(performance.now() * 0.0012) * 0.7;
  p.candle.intensity = 1.5 + Math.sin(performance.now() * 0.013) * 0.15 + Math.random() * 0.1;
  p.cam.position.set(0, p.camY + (p.dist - 4.3) * 0.08, -p.dist); p.cam.lookAt(p.lookAt);
  p.r.render(p.sc, p.cam);
}
// A still picture of your character (as the story has changed you) for the ending screen.
RM.portrait = (look, vamp, pose) => {
  const p = previewInit(); previewSet(look, vamp);
  if (pose) p.fig.setPose(pose);
  p.fig.group.rotation.y = 0.45;
  const w = 480, h = 600; p.r.setSize(w, h, false); p.cam.aspect = w / h; p.cam.updateProjectionMatrix();
  p.cam.position.set(0.25, 1.55, -2.6); p.cam.lookAt(0, 1.3, 0);
  p.r.render(p.sc, p.cam);
  const url = p.cv.toDataURL('image/png');
  p.resize && p.resize();
  return url;
};

const QUIPS = {
  name: ['"{n}? Hm. It will look lovely carved on a coffin."', '"{n}. I shall try to remember it. No promises."', '"{n}! A name for the history books. Or the obituaries."'],
  gender: ['"Noted. The villagers will scream the right words at you."', '"Very good. Now, the important part: the hair."'],
  skin: ['"Lovely. Enjoy the colour while you have it."', '"Excellent. Moonlight will do the rest."'],
  face: ['"A face to haunt a portrait gallery."', '"Striking. Mostly in the dark."'],
  marks: ['"Character! The hunters will describe you perfectly."', '"Distinguished. Very tragic-hero."'],
  hair: ['"Bold hair choice for someone about to be dead."', '"Ooh. Very dramatic. Very windswept-on-a-cliff."', '"Practical. Blood washes out of that nicely."'],
  hairColor: ['"Striking. Vampires have been wearing that for centuries."', '"A classic. Goes with everything, especially night."'],
  eyes: ['"Enjoy that colour. It won\'t last."', '"Beautiful. They\'ll glow, later. Trust me."'],
  outfit: ['"Is THAT what you wore the night you were bitten? Tragic."', '"Very... period-appropriate."', '"What IS that?"'],
  outfitColor: ['"Red hides the stains. Just saying."', '"A fine colour to be buried in."'],
  extras: ['"Accessorising for the afterlife. I respect it."', '"Shiny. I like shiny."'],
};
function quip(cat, look) {
  const b = $('corvinSays'); if (!b) return;
  b.textContent = RM.pick(QUIPS[cat] || QUIPS.hair).replace('{n}', look.name || 'Nobody');
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  if (Math.random() < 0.5) RM.AU.caw(0.18);
}

// Opens the creator; resolves with the finished look.
RM.openCreator = () => new Promise((resolve) => {
  let look = Object.assign(RM.defaultLook(), RM.store.get('look', {}));
  const ov = $('creator'); ov.classList.add('show');
  const panel = $('creatorOptions'); panel.innerHTML = '';
  const refresh = (cat) => { previewSet(look, {}); if (cat) quip(cat, look); render(); };
  const section = (title, body) => { const s = document.createElement('div'); s.className = 'opt'; s.innerHTML = `<div class="optT">${title}</div>`; s.appendChild(body); panel.appendChild(s); };
  function render() {
    panel.innerHTML = '';
    // name
    const nm = document.createElement('input'); nm.type = 'text'; nm.maxLength = 16; nm.value = look.name; nm.id = 'nameInput'; nm.placeholder = 'Your name';
    nm.addEventListener('input', () => { look.name = nm.value.replace(/[<>]/g, '').slice(0, 16); });
    nm.addEventListener('change', () => quip('name', look));
    section('NAME', nm);
    const chips = (cat, list, isMulti) => {
      const row = document.createElement('div'); row.className = 'chips';
      for (const it of list) {
        const b = document.createElement('button'); b.textContent = it.label || it.id;
        const on = isMulti ? look[cat].includes(it.id) : look[cat] === it.id;
        if (on) b.classList.add('on');
        b.onclick = () => {
          if (isMulti) { const i = look[cat].indexOf(it.id); if (i >= 0) look[cat].splice(i, 1); else look[cat].push(it.id); }
          else look[cat] = it.id;
          refresh(cat);
        };
        row.appendChild(b);
      }
      return row;
    };
    const swatches = (cat, list) => {
      const row = document.createElement('div'); row.className = 'swatches';
      for (const it of list) {
        const hex = typeof it === 'string' ? it : it.hex;
        const b = document.createElement('button'); b.style.background = hex; b.title = it.id || hex;
        if (look[cat] === hex) b.classList.add('on');
        b.onclick = () => { look[cat] = hex; refresh(cat); };
        row.appendChild(b);
      }
      return row;
    };
    section('YOU ARE A...', chips('gender', OPT.gender));
    section('SKIN TONE', swatches('skin', OPT.skin));
    section('FACE', chips('face', OPT.face));
    section('MARKS', chips('marks', OPT.marks));
    section('HAIR STYLE', chips('hair', OPT.hair));
    section('HAIR COLOUR', swatches('hairColor', OPT.hairColor));
    section('EYE COLOUR <span class="dim">(for now)</span>', swatches('eyes', OPT.eyes));
    section('WHAT YOU WORE THAT NIGHT', chips('outfit', OPT.outfit));
    section('OUTFIT COLOUR', swatches('outfitColor', OPT.outfitColor));
    section('EXTRAS', chips('extras', OPT.extras, true));
  }
  $('rndBtn').onclick = () => { look = RM.randomLook(); refresh('hair'); };
  $('riseBtn').onclick = () => {
    look.name = (look.name || '').trim() || 'Wren';
    RM.store.set('look', look);
    pvRunning = false; ov.classList.remove('show');
    resolve(look);
  };
  previewInit(); setTimeout(() => { pv.resize(); }, 30);
  refresh(); pvRunning = true; previewLoop();
  $('corvinSays').textContent = '"Ah, you\'re awake. Well, almost. Before you get up, tell me who you WERE. I\'ll wait."';
});
})();
