/* =====================================================================
   RAVENMOOR — NIGHT FOUR: THE MASQUERADE
   Magistrate Vane throws a masked ball for forty years of night. You get
   in (sneaking, mesmerising, or as a storm of ravens), meet his daughter
   Rosalind, pass the painting of yourself, and finally face Vane: join
   him, or fight him.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { clamp, lerp, rand, TAU } = RM;
const P = RM.player, AU = RM.AU, M = RM.MAT;
const S = () => RM.S;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

Object.assign(RM.LOOKS, {
  vane: { name: 'Vane', gender: 'boy', skin: '#f2cdb0', face: 'square', marks: 'none', hair: 'short', hairColor: '#aab4c4', eyes: '#8b939c', outfit: 'suit', outfitColor: '#141418', extras: ['necklace'] },
  rosalind: { name: 'Rosalind', gender: 'girl', skin: '#f2cdb0', face: 'heart', marks: 'freckles', hair: 'bun', hairColor: '#d6b067', eyes: '#8b939c', outfit: 'gown', outfitColor: '#1f2d55', extras: ['earrings'] },
  footman: { name: 'Footman', gender: 'boy', skin: '#c3875b', face: 'square', marks: 'none', hair: 'short', hairColor: '#15110f', eyes: '#2a1a10', outfit: 'suit', outfitColor: '#3a0a12', extras: ['lantern'] },
  grandma: { name: 'Grandma', gender: 'girl', skin: '#e6b690', face: 'round', marks: 'mole', hair: 'bun', hairColor: '#ebe7e0', eyes: '#3e7b4b', outfit: 'farm', outfitColor: '#6a3a4a', extras: ['glasses', 'scarf'] },
});
const MIRELA_V = { pale: 0.75, fangs: 0.7, humanity: 40, wear: 0.6 };
const footman = (x, z, yaw) => RM.watcher(RM.npc(RM.LOOKS.footman, x, z, yaw, { lantern: 1.2, vamp: { mask: true }, heartLabel: 'Footman' }), { range: 10, cone: 0.6 });
function guestLook() { const l = RM.randomLook(); l.outfit = RM.pick(['gown', 'suit', 'gown', 'suit', 'coat']); l.extras = RM.pick([[], ['necklace'], ['earrings']]); return l; }
// masked couples waltzing in circles
function dancers(n = 8) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const cx = rand(-9, 9), cz = rand(-16, -4), r = rand(1.2, 2.2), a0 = rand(TAU);
    for (const off of [0, Math.PI]) {
      const g = RM.npc(guestLook(), cx, cz, 0, { vamp: { mask: true }, heart: i < 4, heartLabel: 'Guest' }); g.ghost = true; g.col.off = true;
      list.push({ g, cx, cz, r: r * 0.35, a: a0 + off, orbit: a0, spd: rand(0.6, 0.9), R: r });
    }
  }
  return {
    list,
    tick(dt) {
      for (const d of list) {
        d.orbit += dt * d.spd * 0.35; d.a += dt * 2.4;
        const ox = d.cx + Math.cos(d.orbit) * d.R, oz = d.cz + Math.sin(d.orbit) * d.R;
        d.g.x = ox + Math.cos(d.a) * d.r; d.g.z = oz + Math.sin(d.a) * d.r; d.g.yaw = -d.a;
        d.g.update(0); d.g.fig.update(dt, 1.2);
      }
    },
  };
}

const N4 = (RM.N4 = {});

/* ------------------------------------------------------------- before */
N4.wake = () => RM.play(async (done) => {
  const s = S(); s.thirst = Math.min(100, s.thirst + 20);
  RM.$('fade').style.opacity = 1; RM.camMode = 'free';
  await RM.say('You', '<i>The fourth night. Tonight Magistrate Vane throws a masked ball to celebrate forty years of darkness. Every lamp on the hill is lit. You can hear the music from the crypt.</i>');
  if (!s.flags.corvinGone) await RM.say('Corvin', '"Tonight\'s the night. The whole Manor, open, full of masks. If you were ever going to get close to Vane, it\'s now."');
  done('ok');
});
// your servant (the thief) offers you his neck. He's smiling a bit too much.
N4.servant = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); RM.fade(0, 1);
  RM.placePlayer(0, 24, Math.PI);
  const th = RM.npc(RM.LOOKS.thief, 0.4, 26.4, 0, { heartLabel: 'Your servant' }); th.face(P.x, P.z);
  RM.control = false;
  await RM.say('Thief', '"Master! I\'ve been waiting all day." <i>Your servant, from the market. He pulls down his collar.</i> "You must be <i>so</i> thirsty. Please. Drink. I insist."');
  await RM.say('You', '<i>He\'s smiling. He\'s smiling rather a lot. And there\'s a smell on him, faint and sharp, like old coins.</i>');
  const c = await RM.choose({ q: 'Your servant offers you his neck.', options: [
    { id: 'drink', icon: '🦷', label: 'Drink from your servant', sub: 'You are very thirsty.' },
    { id: 'refuse', icon: '✋', label: 'Refuse', sub: 'Something about that smile.' },
  ] });
  S().choices.servant = c;
  if (c === 'refuse') { await RM.say('Thief', '"...Of course, master." <i>The smile doesn\'t move. He backs away, bowing, and he\'s gone.</i>'); done('ok'); return; }
  RM.control = true; RM.lockPointer(); RM.setObjective('Hold <b>E</b> to drink');
  await RM.holdAction({ label: 'DRINK', secs: 1.4 });
  RM.control = false; AU.sizzleN.set(0.5, 0.05); RM.flash('rgba(230,240,255,1)', 1500); AU.sting(0.9); RM.shake(0.1, 1.5);
  await RM.say('Thief', '"<b>Silver</b>, master. A pinch in my soup every night since you took my mind." <i>He is laughing now.</i> "You never asked if I minded being a servant."');
  AU.sizzleN.set(0, 1);
  done('silver');
});
// Pip's grandma asks you to supper. She's a very good cook.
N4.supper = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); RM.spawnTownRavens(w); RM.fade(0, 1);
  const { box } = RM.build;
  box(1.6, 0.08, 1, M.darkWood, 24.5, 0.8, 0, RM.actors); for (const [x, z] of [[23.9, -0.35], [25.1, -0.35], [23.9, 0.35], [25.1, 0.35]]) box(0.06, 0.8, 0.06, M.darkWood, x, 0.4, z, RM.actors);
  const bowl = RM.build.cyl(0.13, 0.09, 0.08, new THREE.MeshStandardMaterial({ color: 0xe8e0d0 }), 24.1, 0.88, 0, 10, RM.actors);
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), new THREE.MeshStandardMaterial({ color: 0xc8b870 })); soup.rotation.x = -Math.PI / 2; soup.position.set(24.1, 0.925, 0); RM.actors.add(soup);
  RM.build.candles(24.7, 0.84, 0.2, 2, 1, RM.actors);
  for (let i = 0; i < 6; i++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshStandardMaterial({ color: 0xf0ece0 })); g.position.set(24.9 + i * 0.05, 0.86, -0.3); RM.actors.add(g); }
  const gm = RM.npc(RM.LOOKS.grandma, 25.4, 0, Math.PI / 2, { heartLabel: 'Grandma' }); gm.fig.setPose('kneel'); gm.fig.group.userData.baseY = 0.1;
  const pip = RM.npc(RM.LOOKS.pip, 24.5, 0.9, Math.PI, { scale: 0.72, headScale: 1.18 }); pip.fig.setPose('kneel');
  RM.placePlayer(23.4, 0, -Math.PI / 2); RM.camMode = 'free';
  const cam = RM.camera; cam.position.set(23.5, 1.25, 0); cam.lookAt(25.4, 1.1, 0);
  await RM.say('Grandma', '"So <i>you\'re</i> Pip\'s friend." <i>A tiny old woman with enormous glasses, ladling soup.</i> "Pip talks about you constantly. Sit. Eat. You\'re far too pale."');
  await RM.say('Pip', '"Gran makes the best soup in Ravenmoor. It\'s got, like, a secret ingredient."');
  const c = await RM.choose({ q: 'Grandma\'s soup is steaming in front of you.', options: [
    { id: 'eat', icon: '🥣', label: 'Eat, to be polite', sub: 'She went to so much trouble.' },
    { id: 'excuse', icon: '🙏', label: 'Make an excuse', sub: '"I already ate." (Technically true.)' },
  ] });
  S().choices.supper = c;
  if (c === 'excuse') {
    await RM.say('Grandma', '"Already ate, hm?" <i>She peers at you over her glasses for a long, long moment. Then she winks.</i> "Clever child. Pip, clear this away. Your friend doesn\'t like <i>garlic</i>."');
    S().bonds.pip += 1; S().humanity += 2;
    done('ok'); return;
  }
  RM.control = true; RM.camMode = 'free'; RM.hands.visible = false;
  RM.setObjective('Eat: press <b>E</b>');
  let spoons = 0;
  await new Promise((res) => { RM.useKey = () => { spoons++; AU.gulp(0.4); RM.shake(0.01, 0.2); if (spoons === 2) RM.caption('It tastes... hot. Very hot. Your tongue is prickling.', 2.5); if (spoons >= 3) { RM.useKey = null; res(); } }; });
  RM.control = false;
  AU.sizzleN.set(0.4, 0.1); RM.flash('rgba(240,240,200,0.9)', 1200); RM.shake(0.08, 1.2); AU.sting(0.7);
  await RM.say('Grandma', '"Forty cloves." <i>She takes off her glasses and polishes them.</i> "I knew what you were the moment you came through my gate, dear. I\'m eighty-one. I\'ve seen your kind before. Pip, go to your room."');
  AU.sizzleN.set(0, 1);
  done('garlic');
});

/* ------------------------------------------------------------ getting in */
N4.approach = () => RM.play(async (done) => {
  RM.$('fade').style.opacity = 1; RM.camMode = 'free';
  await RM.say('You', '<i>Vane Manor, lit up like a wedding cake on its black hill. Carriages at the gates. Masks and velvet and music.</i>');
  const s = S();
  const c = await RM.choose({ q: 'How do you get into the Masquerade?', options: [
    { id: 'sneak', icon: '🤫', label: 'Sneak in', sub: 'Through the servants\' corridors. Footmen with lanterns.' },
    { id: 'mesmer', icon: '🌀', label: 'Mesmerise your way in', sub: 'Control the footmen at the door. Costs Thirst.' },
    { id: 'storm', icon: '🐦‍⬛', label: 'Storm it as ravens', sub: 'Burst into a swarm and fly in. Don\'t stay a swarm too long.' },
  ] });
  s.choices.entry = c;
  done(c);
});
N4.sneak = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor'); RM.fade(0, 1);
  const cs = w.data.corridor.start; RM.placePlayer(cs.x, cs.z, -Math.PI / 2);
  const f = [footman(-31, -6, Math.PI / 2), footman(-24, -8.5, -Math.PI / 2), footman(-18, -6, Math.PI / 2)];
  const routes = [[[-31, -5], [-31, -9]], [[-26, -8.5], [-21, -8.5]], [[-18, -5], [-18, -9]]];
  f.forEach((m, i) => { m.route = routes[i]; m.ri = 1; m.wait = rand(0.5, 2); });
  RM.detectHook(f);
  RM.control = true; RM.lockPointer(); AU.setMusic('title', 0.15);
  RM.setObjective('Slip through the servants\' corridor into the <b>ballroom</b>.<br><span class="dim">Crouch (C) · hide behind the crates · Blood Sight (R)</span>');
  RM.setMarker(-13.4, -9.4);
  let busy = false;
  RM.sceneTick = async (dt) => {
    for (const m of f) { m.update(dt); if (!m.target) { m.wait -= dt; if (m.wait < 0) { const p = m.route[m.ri]; m.goTo(p[0], p[1], 1.1); m.ri = (m.ri + 1) % 2; m.wait = rand(1.2, 2.5); } } }
    if (busy) return;
    let maxD = 0;
    for (const m of f) { const v = m.sees(); m.detect = clamp(m.detect + (v > 0 ? v * dt * 1.2 : -dt * 0.5), 0, 1); maxD = Math.max(maxD, m.detect); }
    RM.bar('meter', maxD > 0.02 ? maxD * 100 : null, 'SEEN');
    if (maxD >= 1) { busy = true; RM.control = false; AU.sting(0.6); RM.toast('<b>SPOTTED!</b>'); await RM.sleep(1.2); done('caught'); return; }
    if (P.x > -14) { busy = true; RM.control = false; done('ok'); }
  };
});
N4.mesmer = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor'); RM.fade(0, 1); void w;
  RM.placePlayer(-20, -9.4, -Math.PI / 2);
  const f = [RM.npc(RM.LOOKS.footman, -15.8, -8.9, Math.PI / 2, { lantern: 1.2, vamp: { mask: true } }), RM.npc(RM.LOOKS.footman, -16.5, -5.5, Math.PI / 2, { lantern: 1, vamp: { mask: true } }), RM.npc(RM.LOOKS.footman, -17, -9.9, Math.PI / 2, { lantern: 1, vamp: { mask: true } })];
  for (const m of f) m.face(P.x, P.z);
  RM.control = true; RM.lockPointer();
  for (let i = 0; i < f.length; i++) {
    const m = f[i];
    RM.setObjective(`Mesmerise the footmen: look at one and <b>hold E</b> (${i} / 3)`);
    RM.setMarker(m.x, m.z);
    await RM.holdAction({ label: 'MESMERISE', secs: 2.2, mode: 'look', look: vec(m.x, 1.6, m.z), sound: 'whisper' });
    AU.sweep(0.3); S().thirst = Math.min(100, S().thirst + 10);
    m.goTo(m.x - 3, m.z + (i - 1) * 2, 1); m.fig.setPose('arms');
    RM.caption(RM.pick(['<i>"Welcome, honoured guest."</i> His eyes are empty.', '<i>"Right this way."</i> He doesn\'t blink.', '<i>"The Magistrate will be delighted."</i> A smile like a puppet\'s.']), 2.5);
  }
  RM.setMarker(null); RM.control = false;
  const s = S();
  if (s.humanity < 30) {
    await RM.say('???', '<span class="deep">"That was easy. Wasn\'t that easy? There are two hundred people in that ballroom. Why stop at three?"</span>');
    const c = await RM.choose({ q: 'The Beast wants more.', options: [
      { id: 'all', icon: '🌀', label: 'Mesmerise EVERYONE', sub: 'Every guest. Every servant. Every mask.' },
      { id: 'stop', icon: '✋', label: 'Stop', sub: 'Three is enough.' },
    ] });
    if (c === 'all') { done('puppet'); return; }
  }
  done('ok');
});
// Storm it as ravens: fly through the ballroom gathering yourself, then land before you scatter for good
N4.storm = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor'); RM.fade(0, 1);
  RM.placePlayer(0, -2, Math.PI); P.speedMul = 0.0001; P.pitch = -0.35; P.yaw = 0;
  RM.camMode = 'free'; RM.hands.visible = false; RM.control = true; RM.lockPointer();
  const pos = vec(0, 9.8, -1.2);
  const rings = [];
  const ringM = new THREE.MeshBasicMaterial({ color: 0xff3048, transparent: true, opacity: 0.85 });
  for (const [x, y, z] of [[-9, 8.5, -5], [-7, 5.5, -14], [4, 9, -16], [10, 5, -8], [2, 3.2, -6]]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), ringM); r.position.set(x, y, z); RM.actors.add(r); RM.glow(x, y, z, 0xff3048, 2.5, 0.4, RM.actors); rings.push({ r, x, y, z, got: false }); }
  const swarm = []; for (let i = 0; i < 18; i++) { const m = RM.makeRaven(0.8); RM.actors.add(m); swarm.push({ m, off: vec(rand(-1.4, 1.4), rand(-0.8, 0.8), rand(-1.2, 1.6)), ph: rand(TAU) }); }
  let left = 40, got = 0, bumpT = 0;
  RM.debugStorm = { pos, rings };
  RM.bar('burn', 100, 'SWARM');
  RM.setObjective('<b>Fly!</b> Mouse to steer, W to fly forward. Gather yourself: fly through the <b>5 red rings</b>, then dive to the dance floor.');
  AU.flap(0.6); AU.caw(0.5);
  const target = vec(0, 0.8, -10);
  RM.sceneTick = (dt) => {
    left -= dt;
    const pitch = P.pitch, yaw = P.yaw;
    const dir = vec(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const sp = (RM.keys.KeyW || RM.keys.ArrowUp) ? 6.5 : (RM.keys.KeyS || RM.keys.ArrowDown) ? 0.5 : 2.2;
    pos.addScaledVector(dir, sp * dt);
    pos.x = clamp(pos.x, -13.2, 13.2); pos.y = clamp(pos.y, 0.6, 10.4); pos.z = clamp(pos.z, -19.4, -0.6);
    for (const cx of [-7, 0, 7]) if (pos.distanceTo(vec(cx, 7.8, -10)) < 1.5 && bumpT <= 0) { bumpT = 1; left -= 4; AU.clang(0.4); RM.shake(0.05, 0.3); RM.caption('You scatter off the chandelier! <b>-4s</b>', 1.5); }
    bumpT -= dt;
    RM.camera.position.copy(pos); RM.camera.rotation.set(pitch, yaw, Math.sin(RM.t * 2) * 0.05);
    for (const r of swarm) { r.ph += dt * 16; const q = r.off.clone().applyEuler(new THREE.Euler(0, yaw, 0)); r.m.position.lerp(pos.clone().add(q).addScaledVector(dir, 1.5), 0.15); r.m.rotation.y = yaw; const f = Math.sin(r.ph) * 0.9; r.m.userData.wl.rotation.set(0, 0, f); r.m.userData.wr.rotation.set(0, 0, -f); }
    for (const g of rings) { g.r.lookAt(pos); if (!g.got && pos.distanceTo(vec(g.x, g.y, g.z)) < 1.2) { g.got = true; got++; g.r.visible = false; AU.chime(0.4); left += 3; } }
    RM.bar('burn', clamp(left / 40 * 100, 0, 100), 'SWARM: pull yourself together');
    if (got >= 5) { RM.setMarker(target.x, target.z); RM.setObjective('<b>Dive!</b> Land on the dance floor (the red beam)'); }
    if (got >= 5 && pos.y < 1.8 && Math.hypot(pos.x - target.x, pos.z - target.z) < 2.5) {
      RM.sceneTick = null; RM.bar('burn', null); RM.control = false;
      for (const r of swarm) RM.actors.remove(r.m);
      RM.placePlayer(pos.x, pos.z, yaw); P.speedMul = 1; RM.camMode = 'player'; RM.hands.visible = true;
      RM.flash('rgba(10,10,20,0.9)', 800); AU.flap(0.8); AU.thud(0.5);
      done('ok'); return;
    }
    if (left <= 0) { RM.sceneTick = null; RM.control = false; RM.bar('burn', null); RM.flash('rgba(0,0,0,0.95)', 3000); done('swarm'); }
  };
});

/* ---------------------------------------------------------- the ball */
N4.ball = (entry) => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor'); RM.fade(0, 0.8);
  if (entry !== 'storm') RM.placePlayer(-12.5, -9.6, -Math.PI / 2);
  const d = dancers(7);
  AU.setMusic('title', 0.35); AU.choirLevel = 0.03;
  // storming in: the footmen come for you
  if (entry === 'storm') {
    const f = [RM.npc(RM.LOOKS.footman, -4, -14, 0, { lantern: 1.2, vamp: { mask: true } }), RM.npc(RM.LOOKS.footman, 5, -15, 0, { lantern: 1.2, vamp: { mask: true } }), RM.npc(RM.LOOKS.footman, 0, -3, 0, { lantern: 1, vamp: { mask: true } })];
    for (const m of f) m.hp = 2;
    RM.control = true; RM.lockPointer();
    RM.setObjective('Guests scream. Footmen charge. <b>Fight!</b> (click · Space to dash)');
    RM.sceneTick = (dt) => d.tick(dt);
    const allies = [];
    if (S().flags.tobiasTurned) { const t = RM.npc({ ...RM.LOOKS.tobias, extras: ['hat'] }, -3, -8, 0, { vamp: { humanity: 10, pale: 0.6 } }); t.ghost = true; allies.push(t); }
    for (;;) { const r = await RM.fight(f, { dmg: 16, allies }); if (r === 'won') break; RM.placePlayer(0, -10, 0); RM.control = true; for (const m of f) { m.hp = 2; m.alive = true; m.col.off = false; m.fig.setPose('stand'); } }
    S().dread += 1;
  }
  RM.sceneTick = (dt) => d.tick(dt);
  RM.control = true; RM.lockPointer();
  RM.setObjective('The Masquerade. Find <b>Rosalind Vane</b> in the study (east, through the portrait hall).');
  RM.setMarker(14.5, -10);
  if (entry !== 'storm') RM.caption('Masks. Hundreds of masks. Every one of them turns, just slightly, as you pass. The music never stops.', 5);
  await new Promise((res) => { const prev = RM.sceneTick; RM.sceneTick = (dt) => { prev(dt); if (P.x > 13.8) { RM.sceneTick = prev; res(); } }; });
  done('ok');
});
// Mirela turns up at the ball and asks for a taste, to seal your friendship
N4.mirela = () => RM.play(async (done) => {
  RM.useWorld('manor'); RM.setEnv('manor');
  RM.placePlayer(15.5, -10, -Math.PI / 2);
  const mir = RM.npc({ ...RM.LOOKS.mirela, outfitColor: '#6e0f1e' }, 17.5, -9.3, 0, { vamp: { ...MIRELA_V, wear: 0 } }); mir.face(P.x, P.z);
  RM.control = false;
  await RM.say('Mirela', '"Darling! You came!" <i>A new gown, stolen from somewhere, blood-red.</i> "Isn\'t it <i>glorious</i>? Forty years on a wall, and now: a ball."');
  const s = S();
  await RM.say('Mirela', s.flags.mirelaRefused ? '"You said no to me once. I haven\'t forgotten. But let\'s be friends again, properly. Let me drink from you. Just a sip. It\'s how our kind seals a promise."' : '"Let me drink from you. Just a sip. It\'s how our kind seals a friendship. Don\'t be shy."');
  const c = await RM.choose({ q: 'Mirela wants to drink from you.', options: [
    { id: 'allow', icon: '🩸', label: 'Let her', sub: 'It\'ll make you very thirsty.' },
    { id: 'refuse', icon: '🙅', label: 'Refuse', sub: s.flags.mirelaRefused ? 'You\'ve said no to her before.' : 'Something in her eyes.' },
  ] });
  s.choices.mirelaKiss = c;
  if (c === 'allow') {
    RM.control = true; RM.setObjective('Hold still. (Hold <b>E</b>)');
    await RM.holdAction({ label: 'SHE DRINKS', secs: 2 });
    RM.control = false; s.thirst = Math.min(100, s.thirst + 30); s.bonds.mirela += 2;
    await RM.say('Mirela', '"Mmm. There. Now we\'re family." <i>She licks her lips.</i> "Go and find the girl. I\'ll be close."');
    done('ok'); return;
  }
  if (s.flags.mirelaRefused) { done('kiss'); return; }
  s.flags.mirelaRefused = 1; s.bonds.mirela -= 2;
  await RM.say('Mirela', '"...Of course." <i>The smile doesn\'t move at all.</i> "Once, darling. You get to say no to me once."');
  done('ok');
});
N4.kiss = () => RM.play(async (done) => {
  RM.useWorld('manor'); RM.setEnv('manor');
  const mir = RM.npc({ ...RM.LOOKS.mirela, outfitColor: '#6e0f1e' }, 17.5, -9.3, 0, { vamp: { ...MIRELA_V, humanity: 5 } }); mir.face(P.x, P.z);
  RM.control = true; RM.lockPointer(); P.speedMul = 0.05;
  RM.setObjective('<b>RUN.</b>');
  RM.caption('You can\'t move. She\'s holding your eyes the way you held Gideon\'s.', 3);
  mir.goTo(P.x + 0.6, P.z, 1.2);
  await RM.sleep(2.2);
  RM.control = false;
  await RM.say('Mirela', '"I\'m so sorry, darling." <i>She sounds like she means it.</i> "But you said no to me twice. Nobody says no to me twice."');
  RM.flash('rgba(120,0,20,0.95)', 2500); AU.sting(0.8); AU.drinkN.set(0.4); await RM.sleep(2); AU.drinkN.set(0);
  done('kiss');
});
// The portrait hall: one of the paintings is you, and it's talking
N4.portraits = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor');
  const yp = w.data.youPortrait; const g = yp.canvas.getContext('2d'); g.drawImage(RM.portraitCanvas(S().look), 0, 0); yp.tex.needsUpdate = true;
  if (P.x < 14.5) RM.placePlayer(15, -10, -Math.PI / 2);
  RM.control = true; RM.lockPointer();
  RM.setObjective('The <b>portrait hall</b>');
  RM.setMarker(37, -10);
  let whisper = 0;
  await new Promise((res) => { RM.sceneTick = (dt) => { whisper -= dt; if (P.x > 26 && whisper < 0) { whisper = 3; AU.whisper(0.25); } if (P.x > 34) { RM.sceneTick = null; res(); } }; });
  RM.setMarker(null); RM.control = false;
  await RM.say('You', '<i>At the end of the hall, the newest painting. The paint is still wet. It\'s you. Exactly you, the way you looked before: the eyes, the hair, the scarf you chose.</i>');
  await RM.say('???', '<span class="deep">"Come in, {name}. It\'s warm in here. No thirst. No sun. No choices. Just <i>forever</i>."</span>');
  const c = await RM.choose({ q: 'The painting of you is whispering.', options: [
    { id: 'touch', icon: '🖼', label: 'Touch the painting', sub: 'It\'s so warm in there.' },
    { id: 'burn', icon: '🔥', label: 'Burn every portrait', sub: 'Every face Vane ever took.' },
  ] });
  S().choices.portrait = c;
  RM.control = true; RM.lockPointer();
  if (c === 'touch') {
    RM.setObjective('Reach out. (<b>E</b>)'); RM.setMarker(yp.x - 0.6, yp.z);
    await new Promise((res) => { RM.addInteract({ x: yp.x - 0.6, z: yp.z, r: 2, label: 'Touch the painting', use: (o) => { o.off = true; res(); } }); });
    RM.control = false; RM.hands.play('reach'); AU.sweep(0.6); RM.flash('rgba(255,220,180,0.9)', 2500); AU.sting(0.5);
    done('portrait'); return;
  }
  // grab a candle, and burn them
  RM.setObjective('Burn the portraits: <b>click</b> on each one (0 / 8)');
  const targets = w.data.portraits.filter((q, i) => i % 3 !== 2).slice(0, 7).concat([{ ...yp, you: true }]);
  let burnt = 0;
  RM.onAttack = () => {
    RM.hands.play('claw');
    for (const t of targets) {
      if (t.burnt) continue;
      if (RM.dist(P.x, P.z, t.x, t.z) < 3 && RM.facing(t.x, t.z, 0.4)) {
        t.burnt = true; burnt++;
        const fl = RM.flame(t.x, 1.8, t.z + (t.sd > 0 ? -0.2 : t.sd < 0 ? 0.2 : 0), { size: 0.6, light: 1.5, color: 0xff6020, parent: RM.actors }); void fl;
        t.pic.material.color.setHex(0x2a1a10);
        AU.noise(1, 0.4, 'bandpass', 900, 1, 0, 0.5); setTimeout(() => AU.tone(rand(500, 900), 0.8, 'sawtooth', 0.05, 0, 200, 0.8), 200);
        RM.setObjective(`Burn the portraits: <b>click</b> on each one (${burnt} / 8)`);
        if (t.you) RM.caption('Your own painted face screams as it burns. <b>You</b> feel it.', 3);
        break;
      }
    }
  };
  await new Promise((res) => { RM.sceneTick = () => { if (burnt >= 8) { RM.sceneTick = null; res(); } }; });
  RM.onAttack = null; RM.control = false;
  RM.caption('The whole Manor screams. The screaming is coming from the paintings.', 4); AU.sting(0.6); RM.shake(0.05, 2);
  S().flags.burnedPortraits = true; S().humanity += 6; S().dread += 1;
  await RM.sleep(3);
  done('burn');
});
// Rosalind Vane: the Magistrate's daughter
N4.rosalind = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor');
  RM.placePlayer(41, -10, -Math.PI / 2);
  const ros = RM.npc(RM.LOOKS.rosalind, 47.5, -11.2, 0, { heartLabel: 'Rosalind' }); ros.face(P.x, P.z);
  RM.control = false; void w;
  await RM.say('Rosalind', '"Don\'t. Scream? No, I don\'t scream either." <i>A girl in a blue gown, going through her father\'s desk with a letter-opener.</i> "You\'re the Sleeper. Father\'s been having nightmares about you for forty years."');
  await RM.say('Rosalind', '"I\'m Rosalind. I\'m his daughter. I\'m also the only person in this house who wants him gone as much as you do."');
  await RM.say('Rosalind', '"There\'s a ritual tonight, under the chapel. If he finishes it, the sun never comes back. <i>Ever</i>. I can turn the whole town against him, if you help me."');
  const c = await RM.choose({ q: 'Rosalind wants her father gone too.', options: [
    { id: 'team', icon: '🤝', label: 'Team up', sub: 'She can turn the town against him.' },
    { id: 'hostage', icon: '🎭', label: 'Take her hostage', sub: 'Vane will have to listen to you now.' },
    { id: 'kill', icon: '🗡', label: 'Kill her', sub: 'It\'ll hurt him more than any stake.' },
  ] });
  const s = S(); s.choices.rosalind = c;
  RM.control = true; RM.lockPointer();
  if (c === 'team') {
    await RM.say('Rosalind', '"Good. First: his ledger. Every name he ever took. Grab it from the desk, and let\'s give it to the fire."');
    RM.setObjective('Take the <b>ledger</b> from the desk'); RM.setMarker(46.6, -10);
    await new Promise((res) => RM.addInteract({ x: 46.6, z: -10, r: 1.8, label: 'Take the ledger', use: (o) => { o.off = true; AU.whoosh(0.2); res(); } }));
    RM.setObjective('Throw it on the <b>fire</b>'); RM.setMarker(46, -14.6);
    await new Promise((res) => RM.addInteract({ x: 46, z: -14.3, r: 1.8, label: 'Throw the ledger on the fire', use: (o) => { o.off = true; AU.noise(1.2, 0.4, 'bandpass', 700, 1, 0, 0.4); RM.flame(46, 0.9, -15.3, { size: 0.8, light: 2, color: 0xff7030, parent: RM.actors }); res(); } }));
    RM.setMarker(null); RM.control = false;
    await RM.say('Rosalind', '"There. Forty years of names. Gone." <i>She watches the pages curl.</i> "Now the whole town will know what he did. I\'ll make sure of it. Go. Face him. I\'ll bring the town."');
    s.flags.rosalindAlly = true; s.bonds.rosalind = 3; s.humanity += 4; RM.toast('🤝 Rosalind: <b>Ally</b>');
  } else if (c === 'hostage') {
    RM.setObjective('Grab her: <b>hold E</b>'); RM.setMarker(ros.x, ros.z);
    await new Promise((res) => { RM.sceneTick = () => { if (RM.dist(P.x, P.z, ros.x, ros.z) < 1.8) { RM.sceneTick = null; res(); } }; });
    await RM.holdAction({ label: 'GRAB', secs: 1.2, sound: 'none' });
    RM.control = false;
    await RM.say('Rosalind', '"You <i>idiot</i>. I was on your side." <i>She doesn\'t struggle. She just looks at you with enormous contempt.</i>');
    s.flags.rosalindHostage = true; s.bonds.rosalind = -3; s.humanity -= 6; s.dread += 1;
  } else {
    RM.setObjective('Hold <b>E</b>'); RM.setMarker(ros.x, ros.z);
    await new Promise((res) => { RM.sceneTick = () => { if (RM.dist(P.x, P.z, ros.x, ros.z) < 1.8) { RM.sceneTick = null; res(); } }; });
    ros.fig.setPose('cower');
    await RM.holdAction({ label: 'DRINK', secs: 2.4 });
    RM.control = false; ros.fig.setPose('lie'); RM.flash('rgba(140,0,10,0.9)', 1400);
    s.flags.rosalindDead = true; s.kills++; s.bites++; s.humanity -= 22; s.thirst = 0; s.dread += 2;
    await RM.say('You', '<i>Somewhere in the Manor, very faintly, a man starts screaming a name.</i>');
  }
  RM.setMarker(null);
  done(c);
});

/* ------------------------------------------------------------ the deal */
N4.vane = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('manor');
  RM.placePlayer(-2, -4, Math.PI - 0.1); RM.fade(0, 0.8);
  const d = dancers(4);
  for (const q of d.list) { q.cx = q.cx < 0 ? -10 : 10; }
  const vane = RM.npc(RM.LOOKS.vane, 0, -13, 0, { vamp: { humanity: 45, pale: 0.25 }, heartLabel: 'Vane' }); vane.face(P.x, P.z);
  let ros = null;
  const s = S();
  if (s.flags.rosalindHostage) { ros = RM.npc(RM.LOOKS.rosalind, -1.2, -4.6, 0); ros.face(0, -13); }
  RM.sceneTick = (dt) => d.tick(dt);
  AU.setMusic(null); AU.choirLevel = 0;
  RM.control = false;
  await RM.say('Vane', '"<b>Stop the music.</b>" <i>It stops. Two hundred masks turn.</i> "{name}. There you are. Forty years, and you haven\'t aged a day. Neither have I. Isn\'t that marvellous?"');
  await RM.say('Vane', '"I remember you, you know. Such a <i>lovely</i> face. I had to have it painted. And then I had to have <i>you</i>. And then you bit my grandfather\'s keeper and ran, and I had to chain you in a crypt for forty years. <i>Tiresome</i>."');
  if (s.flags.rosalindDead) await RM.say('Vane', '<i>His voice cracks.</i> "And now you\'ve taken my Rosalind. So there will be no mercy. But there may still be a <i>bargain</i>."');
  else if (s.flags.rosalindHostage) await RM.say('Vane', '"Let my daughter go, and we will talk like civilised monsters."');
  await RM.say('Vane', '"Here is my offer. Stand beside me. Rule Ravenmoor with me, in the dark, forever. Nobody will ever chase you again. Nobody will ever <i>dare</i>."');
  const c = await RM.choose({ q: 'Magistrate Vane offers you a deal.', options: [
    { id: 'join', icon: '👑', label: 'Join him', sub: 'Rule the town together. Forever.' },
    { id: 'refuse', icon: '✋', label: 'Refuse', sub: 'He won\'t take it well.' },
  ] });
  s.choices.vane = c;
  if (c === 'join') {
    RM.control = true; RM.lockPointer();
    RM.setObjective('Kneel before him and kiss his ring. (Walk to him, <b>E</b>)'); RM.setMarker(vane.x, vane.z + 1.2);
    await new Promise((res) => RM.addInteract({ x: vane.x, z: vane.z + 1.2, r: 1.6, label: 'Kiss the Magistrate\'s ring', use: (o) => { o.off = true; res(); } }));
    RM.control = false; RM.setMarker(null);
    if (s.flags.corvinTrusted && !s.flags.corvinGone) {
      RM.corvin.place(vane.x + 1.4, 2.4, vane.z - 0.4);
      await RM.say('Corvin', '<i>A raven lands on the chandelier above you, and says, very quietly, only for you:</i> "He\'ll stake you at dawn. He always does. Bite first."');
      done('heir'); return;
    }
    done('betrayed'); return;
  }
  await RM.say('Vane', '"<i>No?</i>" <i>He smiles, and takes a silver-headed cane from a footman.</i> "Then you can go back in your box."');
  done('fight');
});
N4.boss = () => RM.play(async (done) => {
  RM.useWorld('manor'); RM.setEnv('manor');
  const s = S();
  RM.placePlayer(0, -4, Math.PI);
  const vane = RM.npc(RM.LOOKS.vane, 0, -12, 0, { vamp: { humanity: 45, pale: 0.25 }, heartLabel: 'Vane' });
  const foes = [vane, RM.npc(RM.LOOKS.footman, -4, -12, 0, { lantern: 1, vamp: { mask: true }, heartLabel: 'Footman' }), RM.npc(RM.LOOKS.footman, 4, -12, 0, { lantern: 1, vamp: { mask: true }, heartLabel: 'Footman' })];
  vane.hp = s.flags.vaneBlood ? 5 : 7; vane.chase = 3.3; vane.windT = 0.6; foes[1].hp = foes[2].hp = 2;
  const allies = [];
  if (s.flags.tobiasTurned) { const t = RM.npc({ ...RM.LOOKS.tobias, extras: ['hat'] }, -3, -3, 0, { vamp: { humanity: 10, pale: 0.6 } }); t.ghost = true; allies.push(t); }
  if (s.flags.mirelaFree && s.bonds.mirela >= 2) { const m = RM.npc({ ...RM.LOOKS.mirela, outfitColor: '#6e0f1e' }, 3, -3, 0, { vamp: MIRELA_V }); m.ghost = true; allies.push(m); }
  RM.control = true; RM.lockPointer();
  RM.setObjective('<b>Magistrate Vane.</b> Click to claw · <b>Space</b> to dash from his cane' + (allies.length ? '<br><span class="dim">Your friends fight beside you</span>' : ''));
  RM.bar('burn', 100, 'VANE');
  RM.onTick(() => { if (!vane.fig.group.parent) { RM.bar('burn', null); return false; } RM.bar('burn', Math.max(0, vane.hp) / (s.flags.vaneBlood ? 5 : 7) * 100, 'MAGISTRATE VANE'); });
  const r = await RM.fight(foes, { dmg: 24, allies });
  RM.bar('burn', null);
  done(r);
});

/* ============================================================ THE NIGHT */
RM.nightFour = async function () {
  const s = S(); s.night = 4;
  RM.store.set('ckpt4', JSON.parse(JSON.stringify(s)));
  RM.applyLook();
  await RM.card('NIGHT FOUR', 'THE MASQUERADE');
  await N4.wake();
  const end = async (id) => { await RM.sleep(1.5); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding(id); };
  if (s.flags.servant) { const r = await N4.servant(); if (r === 'silver') return end('silver'); await RM.fade(1, 0.6); }
  if (!s.flags.pipDead && !s.flags.pipTaken && s.bonds.pip >= 2) { const r = await N4.supper(); if (r === 'garlic') return end('garlic'); await RM.fade(1, 0.6); }
  const entry = await N4.approach();
  if (entry === 'sneak') {
    for (;;) {
      const r = await N4.sneak(); if (r === 'ok') break;
      s.dread += 1; await RM.fade(1, 0.5); await RM.say('Corvin', '"The footmen threw you out the kitchen door. Try again. Crouch behind the crates, and wait for their backs."'); RM.fade(0, 0.6);
    }
  } else if (entry === 'mesmer') {
    const r = await N4.mesmer(); if (r === 'puppet') return end('puppet');
  } else {
    const r = await N4.storm(); if (r === 'swarm') return end('swarm');
  }
  await N4.ball(entry);
  if (s.flags.mirelaFree) { const r = await N4.mirela(); if (r === 'kiss') { await N4.kiss(); return end('mirelaKiss'); } }
  const p = await N4.portraits(); if (p === 'portrait') return end('portrait');
  await RM.fade(1, 0.5);
  await N4.rosalind();
  await RM.fade(1, 0.8);
  const v = await N4.vane();
  if (v === 'heir' || v === 'betrayed') return end(v);
  let losses = 0;
  for (;;) {
    const r = await N4.boss();
    if (r === 'won') break;
    losses++;
    if (losses >= 2) { await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('vaneCrypt'); }
    await RM.fade(1, 0.6); await RM.say('Vane', '"Get up. I\'m not finished with you." <i>(One more chance: watch for the <b>!</b> and dash.)</i>'); RM.fade(0, 0.6);
  }
  RM.control = false;
  await RM.say('Vane', '"<b>Enough!</b>" <i>Bleeding, he smashes his cane on the floor. A trapdoor opens under the dance floor, and he drops through it into the dark.</i> "The ritual! If I can\'t have the night, <i>nobody</i> gets the morning!"');
  if (s.flags.rosalindAlly) await RM.say('Rosalind', '"The Drowned Chapel. It\'s under the whole hill. Go! I\'ll bring the town!"');
  await RM.fade(1, 1);
  return 'next';
};
})();
