/* =====================================================================
   RAVENMOOR — NIGHT THREE: THE CELLAR
   Two roads to Vane's hill (the fields, where the hounds run if the
   town is frightened enough, or the sewers), then down into his cellar:
   Corvin's secret, a vial of Vane blood, Mirela in chains, and a room
   full of mirrors that shouldn't show you anything at all.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { clamp, lerp, rand, TAU } = RM;
const P = RM.player, AU = RM.AU, M = RM.MAT;
const S = () => RM.S;
const { add } = RM.build;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

Object.assign(RM.LOOKS, {
  mirela: { name: 'Mirela', gender: 'girl', skin: '#fbe4d2', face: 'heart', marks: 'mole', hair: 'long', hairColor: '#6e0f1e', eyes: '#6d4ea0', outfit: 'gown', outfitColor: '#2b2b30', extras: ['necklace', 'earrings'] },
  agnes: { name: 'Agnes', gender: 'girl', skin: '#e6b690', face: 'square', marks: 'scar', hair: 'braids', hairColor: '#35200f', eyes: '#8b939c', outfit: 'coat', outfitColor: '#2a2018', extras: ['hat', 'crossbow'] },
});
const MIRELA_V = { pale: 0.75, fangs: 0.7, humanity: 40, wear: 0.6 };

// a hound, low and black with a lamp-bright eye
function hound(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); RM.actors.add(g);
  const m = new THREE.MeshStandardMaterial({ color: 0x0e0c0c, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), m); body.scale.set(0.8, 0.8, 2); body.position.y = 0.6; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.42), m); head.position.set(0, 0.8, -0.62); g.add(head);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc040 })); e.position.set(sd * 0.08, 0.86, -0.82); g.add(e); const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), m); ear.position.set(sd * 0.09, 0.98, -0.52); g.add(ear); }
  const legs = [];
  for (const [lx, lz] of [[-0.14, -0.4], [0.14, -0.4], [-0.14, 0.4], [0.14, 0.4]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.5, 5), m); l.position.set(lx, 0.25, lz); g.add(l); legs.push(l); }
  return { g, x, z, legs, ph: rand(TAU) };
}

/* ================================================================ SCENES */
const N3 = (RM.N3 = {});

N3.wake = () => RM.play(async (done) => {
  const s = S();
  RM.$('fade').style.opacity = 1; RM.camMode = 'free';
  s.thirst = Math.min(100, s.thirst + 20);
  const where = { coffin: 'your coffin', church: 'behind Imelda\'s altar', sewers: 'the sewers', stairs: 'the cold stairs' }[s.lastSleep] || 'the dark';
  await RM.say('You', `<i>You wake in ${where}. The third night. Your hands are a little paler than yesterday. Your reflection, if you had one, would be a little less you.</i>`);
  if (!s.flags.corvinGone) await RM.say('Corvin', '"Evening. Tonight we stop running around Ravenmoor and go where the answers are: <b>under Vane\'s hill</b>. His cellar. He keeps things down there he doesn\'t want anybody to see."');
  if (s.flags.tobiasDead) { s.dread += 1; await RM.say('Corvin', '"Oh, and: a woman rode into town at sunset with a crossbow the size of a door. Tall. Braids. Scar. <b>Agnes Crook</b>. She\'s put your face on every wall."'); }
  await RM.say('Corvin', '"Two ways to the hill. Across the <b>fields</b>, over the ford: quick, open. Or through the <b>sewers</b>: slow, dark, and they join up with those bone tunnels you know so well."');
  const c = await RM.choose({ q: 'How do you get to Vane\'s hill?', options: [
    { id: 'fields', icon: '🌾', label: 'Cut across the fields', sub: s.dread >= 3 ? 'The town is very frightened of you. Frightened towns keep dogs.' : 'Open moor. Fast.' },
    { id: 'sewers', icon: '🐀', label: 'Take the sewers', sub: 'Slow. Dark. Something breathes down there.' },
  ] });
  s.choices.route3 = c;
  done(c);
});

// The fields: the ford, and (if the town is scared enough) the hounds
N3.fields = () => RM.play(async (done) => {
  const w = RM.useWorld('moor'); RM.setEnv('moor'); AU.setWind(0.3);
  // the bridge is gone now
  w.data.bridgeUp = false; w.data.bridgeGap.off = false; for (const c of w.data.banks) c.off = false;
  for (const pl of w.data.planks) if (Math.abs(pl.position.z) < 3.2 || (pl.geometry.parameters.depth || 0) > 5) pl.visible = false;
  RM.placePlayer(0, 58, 0);
  for (const p of w.data.perches) if (Math.random() < 0.6) RM.addRaven(p.x, p.y, p.z);
  RM.control = true; RM.lockPointer();
  const s = S(), hunted = s.dread >= 3;
  RM.setObjective('Cross the river at the <b>ford</b> (stepping stones), then head north to Vane\'s hill');
  RM.setMarker(20, 0);
  let t = 0, dogs = [], stage = 0, memGot = false;
  const mw = RM.wisp(-24, 1.4, 34);
  RM.addInteract({ x: -24, z: 34, r: 1.8, when: () => !memGot, label: 'Touch the light in the stone circle', use: async (o) => { o.off = true; memGot = true; RM.actors.remove(mw); await RM.memoryFlash('THE STONES', ['A summer picnic in the stone circle. Your mother\'s laugh. Your friend with freckles, daring you to touch the tallest stone.', 'Up on the hill, the Manor, with every window lit in the middle of the day.', '<i>"Don\'t look at it,"</i> your mother says, turning your face away. <i>"Never look at it."</i>']); RM.control = true; } });
  RM.sceneTick = async (dt) => {
    t += dt;
    if (stage === 0 && P.z < 4.5 && Math.abs(P.x - 20) < 3) { stage = 1; RM.setMarker(8, -38); RM.setObjective('North to <b>Vane\'s hill</b>'); }
    if (hunted && !dogs.length && t > 6) {
      AU.tone(300, 1.6, 'sawtooth', 0.05, 0, 520, 0.9); RM.after(0.5, () => AU.tone(280, 1.8, 'sawtooth', 0.04, 0, 480, 0.9));
      RM.caption('Howling. Behind you, in the dark. <b>Dogs.</b> Agnes has let the hounds loose. <b>RUN.</b> (Shift)', 4);
      for (let i = 0; i < 3; i++) dogs.push(hound(P.x + rand(-6, 6), Math.min(66, P.z + 16 + i * 2)));
      AU.setHeart(130, 0.8);
    }
    for (const d of dogs) {
      d.ph += dt * 14;
      const dx = P.x - d.x, dz = P.z - d.z, dist = Math.hypot(dx, dz);
      const sp = 5.1 + Math.min(0.9, t * 0.01);
      let nx = d.x + (dx / dist) * sp * dt, nz = d.z + (dz / dist) * sp * dt;
      [nx, nz] = RM.collide(nx, nz, 0.35);
      d.x = nx; d.z = nz;
      d.g.position.set(d.x, w.groundAt(d.x, d.z), d.z); d.g.rotation.y = Math.atan2(-dx, -dz);
      d.legs.forEach((l, i) => { l.rotation.x = Math.sin(d.ph + (i % 2) * Math.PI) * 0.7; });
      if (Math.random() < dt * 0.8) AU.noise(0.2, 0.25, 'lowpass', 500, 2, 0, 0.3);
      if (dist < 1.2 && RM.control) { RM.control = false; AU.sting(1); RM.flash('rgba(120,0,0,0.95)', 2000); RM.shake(0.1, 1); done('hounds'); return; }
    }
    if (P.z < -34 && RM.control) { RM.control = false; done('ok'); }
  };
});

// The sewers: they join the bone tunnels, and one grate opens into Vane's cellar
N3.sewers = () => RM.play(async (done) => {
  const w = RM.useWorld('crypt'); RM.setEnv('crypt'); AU.setWind(0.02);
  w.data.holeHeap.visible = false; w.data.holeCol.off = true;
  const lad = w.data.ladder; RM.placePlayer(lad.x, lad.z + 0.8, Math.PI);
  RM.control = true; RM.lockPointer();
  const exit = RM.TUN.cell(9, 1);
  RM.setObjective('Find the <b>grate</b> that leads up into Vane\'s cellar');
  RM.setMarker(exit.x, exit.z);
  const bc = w.data.bigCoffin; let breathing = 0;
  RM.addInteract({ x: exit.x, z: exit.z, r: 1.6, label: 'Squeeze up through the grate', use: (o) => { o.off = true; AU.clang(0.4); done('ok'); } });
  RM.sceneTick = (dt) => {
    const d = RM.dist(P.x, P.z, bc.x, bc.z);
    breathing = lerp(breathing, d < 11 ? (1 - d / 11) * 0.6 : 0.05, dt * 2);
    AU.breathN.g.gain.value = breathing * (0.55 + Math.sin(RM.t * 1.3) * 0.45);
    w.data.bigLid.position.y = (S().flags.sleeperChain ? 1.72 : 1.6) + Math.max(0, Math.sin(RM.t * 1.3)) * 0.03;
    if (Math.random() < dt * 0.1) RM.caption(RM.pick(['<i>Drip. Drip.</i>', '<i>Something shifts in the dark behind you.</i>', '<i>The breathing is louder than last time.</i>']), 2.5);
  };
});

// Corvin's confession, in the cellar: trust, cast out, or... eat
N3.corvin = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('cellar'); AU.setWind(0.01);
  const st = w.data.cellarStart; RM.placePlayer(st.x, st.z, Math.PI);
  const corvin = RM.corvin;
  corvin.place(1.2, 1.3, 33.4);
  RM.control = false; RM.fade(0, 1);
  await RM.say('Corvin', '"Here we are. Vane\'s cellar. Wine, rot, and secrets." <i>He hops from foot to foot.</i> "Before we go further, there\'s something you should hear from me and not from Vane."');
  if (S().choices.hangout !== 'corvin') {
    await RM.say('Corvin', '"I wasn\'t always a raven. Forty years ago I was Vane\'s messenger. I carried his letters. I stood in his hall while his painter painted people who didn\'t come out again."');
    await RM.say('Corvin', '"When I tried to warn the town, he had me changed. Feathers. Forever. I\'ve been hanging round your crypt ever since, waiting for you to wake up. Because you\'re the one he was most afraid of."');
  } else await RM.say('Corvin', '"You know I worked for him. What I didn\'t tell you on the tower is that I led you here on purpose. You\'re the one Vane was most afraid of. I want to know why. And I want him to pay."');
  const c = await RM.choose({ q: 'Corvin served Vane. What do you do?', options: [
    { id: 'trust', icon: '💬', label: 'Trust him', sub: 'He\'ll lead you through the cellar.' },
    { id: 'cast', icon: '🚪', label: 'Cast him out', sub: 'No more hints. No more raven.' },
    { id: 'eat', icon: '🍗', label: 'Eat him', sub: 'Yes, really. You\'d get his memories.' },
  ] });
  const s = S(); s.choices.corvin = c;
  RM.control = true; RM.lockPointer();
  if (c === 'trust') {
    s.bonds.corvin += 2; s.flags.corvinTrusted = true;
    await RM.say('Corvin', '"...Right. Good. I\'ll be honest, I had a whole speech ready in case you tried to eat me." <b>Follow me.</b>');
    RM.setObjective('Follow <b>Corvin</b> through the cellar');
    const pts = [[4.5, 36, 2], [4.5, 44, 2.4], [-3, 45, 2], [-4.5, 40.5, 1.8]];
    for (const [x, z, y] of pts) {
      corvin.fly(x, y, z); RM.setMarker(x, z);
      await new Promise((res) => { RM.sceneTick = () => { if (!corvin.flying && RM.dist(P.x, P.z, x, z) < 3) { RM.sceneTick = null; res(); } }; });
      AU.caw(0.15);
    }
    RM.setMarker(null);
    await RM.say('Corvin', '"There. On the pedestal. You feel that? That\'s <b>Vane blood</b>. The family drinks something very old to stay young. That vial is what\'s left over."');
  } else if (c === 'cast') {
    RM.setObjective('Drive him off: <b>click</b> to swipe at him');
    let swipes = 0;
    RM.onAttack = () => { RM.hands.play('claw'); AU.whoosh(0.4); if (RM.dist(P.x, P.z, corvin.m.position.x, corvin.m.position.z) < 3 && RM.facing(corvin.m.position.x, corvin.m.position.z, 0.3)) { swipes++; AU.caw(0.4); AU.flap(0.4); corvin.fly(rand(-6, 6), 2.5, rand(33, 50)); if (swipes === 1) RM.caption('Corvin: <i>"Hey! HEY!"</i>', 2); if (swipes === 2) RM.caption('Corvin: <i>"Fine. FINE. I get it."</i>', 2); } };
    await new Promise((res) => { RM.sceneTick = () => { if (swipes >= 3) { RM.sceneTick = null; res(); } }; });
    RM.onAttack = null; RM.control = false;
    corvin.fly(0, 4.5, 29.9);
    await RM.say('Corvin', '"Forty years I waited for you. Good luck, {name}. You\'re going to need it without me." <i>He\'s gone up the stairwell before you can answer.</i>');
    await RM.sleep(1); corvin.hide();
    s.flags.corvinGone = true; s.bonds.corvin -= 4; s.humanity -= 3;
  } else {
    RM.setObjective('<b>Catch him.</b> Click when he\'s close.');
    RM.caption('Corvin: <i>"You\'re— wait. WAIT. You\'re not serious— "</i>', 3); AU.caw(0.6);
    let caught = false, hop = 0;
    RM.onAttack = () => {
      RM.hands.play('pounce'); AU.whoosh(0.4);
      if (RM.dist(P.x, P.z, corvin.m.position.x, corvin.m.position.z) < 2 && corvin.m.position.y < 2.4) caught = true;
    };
    await new Promise((res) => {
      RM.sceneTick = (dt) => {
        hop -= dt;
        if (!corvin.flying && hop < 0) { hop = rand(1.2, 2.2); corvin.fly(clamp(P.x + rand(-5, 5), -8, 8), rand(0.8, 2.2), clamp(P.z + rand(-5, 5), 32, 58)); if (Math.random() < 0.5) AU.caw(0.3); }
        if (caught) { RM.sceneTick = null; res(); }
      };
    });
    RM.onAttack = null; RM.control = false;
    corvin.hide(); AU.flap(0.6); RM.flash('rgba(20,20,30,0.9)', 800);
    const feathers = [];
    for (let i = 0; i < 40; i++) { const f = RM.glow(P.x + rand(-0.6, 0.6), P.eye + rand(-0.4, 0.4), P.z - 0.8 + rand(-0.6, 0.6), 0x0a0a12, 0.18, 1, RM.actors); f.material.blending = THREE.NormalBlending; feathers.push({ f, vy: rand(-0.3, -0.05), vx: rand(-0.4, 0.4) }); }
    RM.onTick((dt) => { if (!feathers.length || !feathers[0].f.parent) return false; for (const q of feathers) { q.f.position.y = Math.max(0.05, q.f.position.y + q.vy * dt); q.f.position.x += q.vx * dt * Math.sin(RM.t * 3); } });
    AU.gulp(0.7); s.flags.ateCorvin = true; s.flags.corvinGone = true; s.humanity -= 12; s.bites++;
    await RM.say('You', '<i>Feathers. So many feathers. And then, tasting him, you remember things you never saw.</i>');
    await RM.memoryFlash('CORVIN\'S MEMORY', [
      'A young messenger in Vane Manor, forty years ago, carrying a tray down into a room beneath the chapel.',
      'In the room: a coffin, huge, chained. Aldous Vane, young and laughing, drinking from a cup. <b>Drinking from what is in the coffin.</b>',
      '<i>"Grandfather keeps us young,"</i> Vane says. <i>"And he keeps the sun away, so no one sees what we do in the dark. The first vampire of Ravenmoor. Isn\'t he beautiful?"</i>',
    ]);
    s.flags.knowsSleeper = true;
  }
  done(c);
});

// The vial of Vane blood
N3.vial = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('cellar');
  if (RM.dist(P.x, P.z, -5, 42) > 4) RM.placePlayer(-3, 40.5, Math.PI / 2 + 0.3);
  RM.control = true; RM.lockPointer();
  RM.setMarker(-4.1, 42); RM.setObjective('The <b>vial</b> on the pedestal');
  await new Promise((res) => { RM.sceneTick = () => { if (RM.dist(P.x, P.z, -5, 42) < 2.4) { RM.sceneTick = null; res(); } }; });
  RM.setMarker(null); RM.control = false;
  const c = await RM.choose({ q: 'A vial of Vane family blood. It\'s calling you.', options: [
    { id: 'drink', icon: '🧪', label: 'Drink it', sub: 'Huge power. But you\'d lose every memory you\'ve found.' },
    { id: 'smash', icon: '💔', label: 'Smash it', sub: 'Stay yourself. The last night will be harder.' },
  ] });
  const s = S(); s.choices.vial = c;
  RM.control = true;
  if (c === 'drink') {
    RM.setObjective('Hold <b>E</b> to drink');
    await RM.holdAction({ label: 'DRINK', secs: 2.2 });
    w.data.vial.visible = false; RM.control = false;
    RM.flash('rgba(255,0,40,0.9)', 1600); AU.sting(0.7); RM.shake(0.08, 1.2);
    RM.canvasFilter('saturate(2.5) hue-rotate(-20deg)'); await RM.sleep(1.5); RM.canvasFilter('');
    const lost = s.memories; s.memories = 0; s.flags.vaneBlood = true; s.thirst = 0; s.humanity -= 8;
    await RM.say('You', `<i>Power, like lightning in your veins. You could run up a wall. You could lift a coach. And the memories go out like candles, one by one: ${lost ? 'the blue door, the lullaby, the stones' : 'not that you had many'}. You can't remember your mother's face.</i>`);
    await RM.say('You', '<i>You can\'t remember what you were trying to remember.</i>');
  } else {
    RM.setObjective('<b>Click</b> to knock it off the pedestal');
    await new Promise((res) => { RM.onAttack = () => { RM.hands.play('claw'); AU.whoosh(0.4); if (RM.dist(P.x, P.z, -5, 42) < 2.8) { RM.onAttack = null; res(); } }; });
    w.data.vial.visible = false; AU.noise(0.3, 0.6, 'highpass', 3000, 1, 0, 0.5); AU.tone(2400, 0.3, 'sine', 0.05, 0, 1800, 0.5);
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: 0x5a0010 })); puddle.rotation.x = -Math.PI / 2; puddle.position.set(-4.6, 0.01, 42.2); RM.actors.add(puddle);
    s.humanity += 5; s.flags.vialSmashed = true;
    RM.caption('It smashes. The blood hisses on the stones like it\'s angry with you.', 3.5);
    await RM.sleep(2);
  }
  done(c);
});

// Mirela, chained in the cellar for forty years
N3.mirela = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('cellar');
  const mz = w.data.mirela;
  for (const c of w.data.mirelaChains) c.visible = true;
  const mir = RM.npc(RM.LOOKS.mirela, mz.x, mz.z, Math.PI, { vamp: MIRELA_V, heart: false }); mir.fig.setPose('arms');
  RM.control = true; RM.lockPointer();
  RM.setMarker(mz.x, mz.z - 1.8); RM.setObjective('Someone is chained at the far end of the cellar');
  AU.whisper(0.3);
  await new Promise((res) => { RM.sceneTick = () => { if (RM.dist(P.x, P.z, mz.x, mz.z) < 4) { RM.sceneTick = null; res(); } }; });
  RM.control = false; RM.setMarker(null); mir.face(P.x, P.z);
  await RM.say('Mirela', '"Oh! Oh, a <i>visitor</i>. Forgive me, I\'d stand up, but I\'m a little tied up." <i>A vampire: pale as paper, hair like spilled wine, laughing.</i> "Forty years of this wall. You wouldn\'t believe how boring it is."');
  await RM.say('Mirela', '"I\'m Mirela. Vane caught me the same way he caught you. Except he didn\'t bother with a coffin. He likes to come down and <i>talk</i> to me."');
  await RM.say('Mirela', '"Set me free, and I\'ll teach you everything I know about being what we are. Please. I\'m so tired of this wall." <i>Her eyes are gold. Not red. Not quite.</i>');
  const c = await RM.choose({ q: 'Mirela, chained to the wall for forty years.', options: [
    { id: 'free', icon: '🔓', label: 'Free her', sub: 'A new friend. Or the best liar you\'ll ever meet.' },
    { id: 'leave', icon: '🔒', label: 'Leave her chained', sub: 'She\'ll remember.' },
    { id: 'end', icon: '🗡', label: 'End her', sub: 'A mercy? A murder?' },
  ] });
  const s = S(); s.choices.mirela = c;
  RM.control = true; RM.lockPointer();
  if (c === 'free') {
    for (let i = 0; i < 3; i++) {
      RM.setObjective(`Break her chains: <b>hold E</b> (${i} / 3)`);
      await RM.holdAction({ label: 'PULL', secs: 1.3, sound: 'none' });
      AU.clang(0.8); RM.shake(0.04, 0.3); w.data.mirelaChains[i].visible = false;
    }
    RM.control = false; mir.fig.setPose('stand');
    await RM.say('Mirela', '"<b>Oh.</b>" <i>She stretches, and every joint in her body cracks like a fire.</i> "Oh, that\'s better. You darling. You absolute darling." <i>She kisses both your cheeks. Her lips are ice.</i>');
    await RM.say('Mirela', '"Lesson one: you can hear heartbeats (you know that). Lesson two: when you run, lean <i>forward</i>, like you\'re falling. You\'ll be faster." <i>She winks.</i> "Lesson three I\'ll save for later."');
    s.flags.mirelaFree = true; s.bonds.mirela = 2; RM.toast('🦇 Mirela: <b>Friend</b>');
  } else if (c === 'leave') {
    RM.setObjective('Walk away'); RM.setMarker(10.5, 45);
    const lines = ['"No— wait. WAIT."', '"{name}! Don\'t you DARE—"', '"I\'ll remember this! I remember EVERYTHING!"', '"...please..."'];
    let li = 0, lt = 0;
    await new Promise((res) => { RM.sceneTick = (dt) => { lt -= dt; if (lt < 0 && li < lines.length) { lt = 2.2; RM.caption('Mirela: <i>' + RM.fmt(lines[li++]) + '</i>', 2.2); AU.clang(0.3); RM.shake(0.02, 0.3); } if (P.x > 9 && Math.abs(P.z - 45) < 3) { RM.sceneTick = null; res(); } }; });
    s.flags.mirelaLeft = true; s.bonds.mirela = -3;
  } else {
    RM.setObjective('Take a stake from the rack. Hold <b>E</b> in front of her.');
    RM.setMarker(mz.x, mz.z - 1.4);
    await new Promise((res) => { RM.sceneTick = () => { if (RM.dist(P.x, P.z, mz.x, mz.z) < 2) { RM.sceneTick = null; res(); } }; });
    RM.control = false;
    await RM.say('Mirela', '"Oh." <i>She sees the stake. She doesn\'t struggle.</i> "Oh, that\'s... actually, all right. Forty years is a long time. Make it quick, darling."');
    RM.control = true;
    await RM.holdAction({ label: 'END IT', secs: 2, sound: 'none' });
    RM.control = false; AU.thud(0.8); RM.flash('rgba(0,0,0,0.9)', 1000);
    mir.fig.setPose('lie'); s.flags.mirelaDead = true; s.kills++; s.humanity -= 6;
    if (s.flags.tobiasTurned) await RM.say('Tobias', '"...Mercy or murder. Some nights they\'re the same thing."');
    else if (!s.flags.corvinGone) await RM.say('Corvin', '<i>Corvin goes very quiet, and stays that way for a long time.</i>');
  }
  RM.setMarker(null);
  done(c);
});

// The Mirror Room
N3.mirror = () => RM.play(async (done) => {
  const w = RM.useWorld('manor'); RM.setEnv('cellar');
  RM.placePlayer(10.8, 45, -Math.PI / 2);
  RM.control = true; RM.lockPointer();
  RM.setObjective('The <b>Mirror Room</b>');
  RM.setMarker(18.2, 45);
  await new Promise((res) => { RM.sceneTick = () => { if (P.x > 16.5) { RM.sceneTick = null; res(); } }; });
  RM.setMarker(null);
  const s = S();
  if (s.humanity >= 45) {
    RM.control = false;
    await RM.say('You', '<i>Five tall mirrors. Candlelight in every one. The room, the candles, the door behind you.</i>');
    await RM.say('You', '<i>But not you. Vampires have no reflection. You stand in front of the glass for a long time, looking at the space where you should be.</i>');
    s.flags.mirrorEmpty = true;
    done('empty'); return;
  }
  // 😱 low humanity: one of the mirrors DOES show you, and it's smiling
  const v = RM.vampState();
  const refl = RM.npc(s.look, 19.35, 45, Math.PI / 2, { vamp: { ...v, humanity: 5, fangs: 1, blood: 1 }, heart: false }); refl.ghost = true;
  RM.control = false; AU.sting(0.6);
  await RM.say('You', '<i>Four mirrors are empty. The fifth has you in it. You, with red eyes. You, smiling. You are not smiling.</i>');
  await RM.say('???', '<span class="deep">"Hello, {name}. I\'ve been waiting for you to get bad enough to see me."</span>');
  const c = await RM.choose({ q: 'Your reflection is smiling at you.', options: [
    { id: 'smash', icon: '🪞', label: 'Smash the mirror', sub: 'Seven years\' bad luck. For a vampire, nothing.' },
    { id: 'talk', icon: '👁', label: 'Talk to your reflection', sub: 'It knows things you don\'t. It wants out.' },
  ] });
  s.choices.mirror = c;
  RM.control = true; RM.lockPointer();
  if (c === 'smash') {
    RM.setObjective('<b>Click</b> to smash the mirror');
    await new Promise((res) => { RM.onAttack = () => { RM.hands.play('claw'); if (P.x > 17.5) { RM.onAttack = null; res(); } }; });
    AU.noise(0.8, 0.8, 'highpass', 2500, 1, 0, 0.6); AU.clang(0.5); RM.flash('rgba(255,255,255,0.8)', 500);
    refl.remove(); w.data.mirrors[0].glass.visible = false;
    RM.caption('Glass everywhere. For one second, in every shard, you are laughing.', 4);
    s.humanity += 4; await RM.sleep(2.5);
  } else {
    RM.control = false;
    await RM.say('You', '"...What are you?"');
    await RM.say('???', '<span class="deep">"I\'m what\'s left when you stop pretending. The part of you that enjoyed the taste. Don\'t pull that face. You know you did."</span>');
    await RM.say('???', '<span class="deep">"Let me out, and I\'ll finish all this for you. Vane, the curse, the little friends. I\'ll be so much better at being you than you are."</span>');
    await RM.say('You', '<i>When you walk out, it doesn\'t stay in the mirror. It\'s in the next one. And the next. It follows you all the way to the door.</i>');
    s.flags.talkedReflection = true; s.humanity -= 4;
  }
  done(c);
});

// Mirela asks for a favour: Sister Imelda
N3.imeldaAsk = () => RM.play(async (done) => {
  RM.useWorld('manor'); RM.setEnv('cellar');
  const mir = RM.npc(RM.LOOKS.mirela, P.x + 1.3, P.z - 1, 0, { vamp: MIRELA_V, heart: false }); mir.face(P.x, P.z);
  RM.control = false;
  await RM.say('Mirela', '"Darling. One small favour, between friends." <i>She loops her arm through yours.</i> "The nun. Imelda. She\'s <b>Vane\'s</b>. She was there the night he chained me. She held the lamp."');
  await RM.say('Mirela', '"She\'s luring you into that church to hand you over. Sanctuary! Ha. Deal with her. Tonight. For me?"');
  const s = S();
  const c = await RM.choose({ q: 'Mirela says Imelda works for Vane.', options: [
    { id: 'kill', icon: '🗡', label: 'Kill Imelda', sub: 'Is Mirela telling the truth?' },
    { id: 'refuse', icon: '🙅', label: 'Refuse', sub: 'Mirela won\'t like it.' },
  ] });
  s.choices.imeldaAsk = c;
  if (c === 'refuse') {
    s.flags.mirelaRefused = (s.flags.mirelaRefused || 0) + 1; s.bonds.mirela -= 2; s.humanity += 3;
    await RM.say('Mirela', '"...Of course. Of course you won\'t." <i>Her smile doesn\'t move at all.</i> "I\'ll remember you said that, darling."');
    done('refuse'); return;
  }
  done('kill');
});
// Killing Imelda: up the aisle, on holy ground, to her altar
N3.killImelda = () => RM.play(async (done) => {
  const w = RM.useWorld('church'); RM.setEnv('church'); RM.fade(0, 1);
  RM.placePlayer(0, 2.6, 0);
  const im = RM.npc(RM.LOOKS.imelda, 0, -27.5, 0, { heartLabel: 'Imelda' }); im.face(0, 0);
  RM.control = true; RM.lockPointer();
  RM.setObjective('Up the aisle to <b>Sister Imelda</b>. Holy ground burns.');
  RM.setMarker(0, -25.6);
  let burn = 0;
  RM.bar('burn', 0, 'HOLY GROUND');
  const r = await new Promise((res) => {
    RM.sceneTick = (dt) => {
      im.update(dt); im.face(P.x, P.z);
      const on = P.z < w.data.holyZ; P.speedMul = on ? 0.6 : 1; RM.canSprint = !on;
      if (on) { burn += clamp((75 - S().humanity) * 0.25, 1.5, 25) * dt; AU.sizzleN.set(0.08 + burn / 400, 0.1); } else { burn = Math.max(0, burn - dt * 6); AU.sizzleN.set(0, 0.3); }
      RM.bar('burn', burn, 'HOLY GROUND');
      if (burn >= 100) { RM.sceneTick = null; res('ash'); }
      if (P.z < -24.8) { RM.sceneTick = null; res('ok'); }
    };
  });
  if (r === 'ash') { RM.control = false; AU.sting(0.8); RM.flash('rgba(255,245,220,1)', 3000); done('ash'); return; }
  RM.control = false; AU.sizzleN.set(0, 0.3); RM.setMarker(null);
  await RM.say('Imelda', '"So. Mirela sent you." <i>She doesn\'t move. She doesn\'t pray.</i> "She was never chained for what she <i>was</i>, child. She was chained for what she <i>did</i>. Ask her about the Harrow family. All six of them."');
  await RM.say('Imelda', '"But you came all this way up my aisle, burning. So go on. I\'m old. I\'ve been ready for a long time."');
  RM.control = true;
  RM.setObjective('Hold <b>E</b>');
  await RM.holdAction({ label: 'DO IT', secs: 2.2 });
  RM.control = false; RM.flash('rgba(140,0,10,0.9)', 1500); AU.gulp(0.7);
  im.fig.setPose('lie');
  const s = S(); s.flags.imeldaDead = true; s.kills++; s.bites++; s.humanity -= 25; s.bonds.mirela += 2; s.thirst = 0;
  await RM.say('You', '<i>The candles on the altar all go out at once.</i>');
  done('ok');
});

/* ------------------------------------------------ where to sleep (any night) */
// The more nights you sleep in the same place, the easier you are to find.
RM.huntedTonight = () => {
  const s = S(), f = s.flags;
  if (f.tobiasDead && s.night >= 3) return 'agnes';
  if (!f.tobiasDead && !f.tobiasTurned && !(f.tobiasSpared && s.humanity >= 45)) return 'tobias';
  return null;
};
RM.sleepFor = async () => {
  const s = S(), prev = s.lastSleep;
  const c = await RM.choose({ q: 'The sky is going grey. Where do you sleep today?', options: [
    { id: 'coffin', icon: '⚰️', label: 'Your coffin in the crypt', sub: prev === 'coffin' ? 'Same as last time. It\'s comfy. It\'s yours.' : 'Home, such as it is.' },
    { id: 'church', icon: '⛪', label: 'Imelda\'s sanctuary', sub: 'Walk up the aisle to her altar. Holy ground burns.', lock: s.flags.imeldaDead ? 'The church is dark. Imelda is gone.' : null },
    { id: 'sewers', icon: '🐀', label: 'The sewers', sub: prev === 'sewers' ? 'Same as last time. The rats know you now.' : 'Filthy. Nobody will ever look there.' },
  ] });
  s.choices['sleep' + s.night] = c;
  const same = c === prev;
  const hunter = RM.huntedTonight();
  if (c === 'church') {
    const r = await RM.N2.sleepChurch(); if (r === 'ash') return 'altar';
  } else if (c === 'coffin') {
    const r = await RM.N2.sleepCoffinRule(same && !!hunter, hunter); s.lastSleep = c; if (r !== 'ok') return r;
  } else {
    if (same && hunter) { const r = await RM.N2.sleepCoffinRule(true, hunter, 'sewers'); s.lastSleep = c; return r; }
    await RM.N2.sleepSewers();
  }
  s.lastSleep = c;
  return 'ok';
};

/* ============================================================ THE NIGHT */
RM.nightThree = async function () {
  const s = S(); s.night = 3;
  RM.store.set('ckpt3', JSON.parse(JSON.stringify(s)));
  RM.applyLook();
  await RM.card('NIGHT THREE', 'THE CELLAR');
  const route = await N3.wake();
  if (route === 'fields') {
    const r = await N3.fields();
    if (r === 'hounds') { await RM.sleep(2); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('hounds'); }
  } else await N3.sewers();
  await RM.fade(1, 0.8);
  await N3.corvin();
  await N3.vial();
  await N3.mirela();
  await N3.mirror();
  if (s.flags.mirelaFree) {
    const a = await N3.imeldaAsk();
    if (a === 'kill') {
      await RM.fade(1, 0.8);
      const r = await N3.killImelda();
      if (r === 'ash') { await RM.sleep(2); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('altar'); }
    }
  }
  await RM.fade(1, 0.8); RM.fade(0, 0.8);
  const sl = await RM.sleepFor();
  if (sl === 'stake' || sl === 'sister' || sl === 'altar') { RM.fade(0, 1); return RM.showEnding(sl); }
  await RM.fade(1, 1);
  return 'next';
};
})();
