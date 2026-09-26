/* =====================================================================
   RAVENMOOR — playable scenes
   Every choice in the story leads into one of these. Each scene sets up
   people and props, gives you control, and resolves with a result when
   you've finished it (or failed it). The story (story.js) decides what
   comes next.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { clamp, lerp, rand, TAU } = RM;
const P = RM.player, AU = RM.AU;
const S = () => RM.S;

/* ------------------------------------------------------ scene lifecycle */
function underActors(o) { while (o) { if (o === RM.actors) return true; o = o.parent; } return false; }
RM.clearScene = () => {
  RM.flickers = RM.flickers.filter((f) => !underActors(f.f));
  RM.clearRavens();
  while (RM.actors.children.length) RM.actors.remove(RM.actors.children[0]);
  RM.sceneColliders.length = 0; RM.sceneCircles.length = 0;
  RM.interacts.length = 0; RM.heartTargets.length = 0; RM.fxHooks.length = 0;
  RM.sceneTick = null; RM.onAttack = null; RM.onStep = null; RM.onDash = null; RM.useKey = null;
  RM.setMarker(null); RM.setObjective('');
  RM.bar('hp', null); RM.bar('burn', null); RM.bar('meter', null);
  RM.canvasFilter(''); RM.fovExtra = 0; P.roll = 0; P.speedMul = 1; RM.canSprint = true;
  RM.hands.anim = null; RM.hands.visible = true;
  if (AU.ctx) { AU.choirLevel = 0; AU.breathN.set(0); AU.sizzleN.set(0); AU.drinkN.set(0); }
  RM.camMode = 'player';
  RM.thirstPaused = false; RM.bloodSightAllowed = S() && S().flags.bloodSight;
};
RM.play = (setup) => new Promise((resolve) => {
  RM.clearScene();
  let over = false;
  const done = (v) => { if (over) return; over = true; RM.control = false; RM.sceneTick = null; RM.onAttack = null; setTimeout(() => resolve(v), 0); };
  setup(done);
});
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));

/* ---------------------------------------------------------------- Corvin */
const corvin = (RM.corvin = { m: RM.makeRaven(1.6), target: null, flying: false });
RM.scene.add(corvin.m); corvin.m.visible = false;
corvin.place = (x, y, z) => { corvin.m.visible = true; corvin.m.position.set(x, y, z); corvin.flying = false; corvin.target = null; };
corvin.fly = (x, y, z) => { corvin.m.visible = true; corvin.target = vec(x, y, z); corvin.flying = true; corvin.from = corvin.m.position.clone(); corvin.t = 0; AU.flap(0.25); };
corvin.hide = () => { corvin.m.visible = false; corvin.flying = false; };
RM.onTick((dt) => {
  const m = corvin.m; if (!m.visible) return;
  const u = m.userData; corvin.ph = (corvin.ph || 0) + dt;
  if (corvin.flying) {
    const d = m.position.distanceTo(corvin.target);
    corvin.t += dt;
    const step = Math.min(d, 7.5 * dt);
    const dir = corvin.target.clone().sub(m.position).normalize();
    m.position.addScaledVector(dir, step);
    m.position.y += Math.sin(Math.min(1, corvin.t) * Math.PI) * dt * 1.5;
    m.rotation.y = Math.atan2(-dir.x, -dir.z);
    const f = Math.sin(corvin.ph * 15) * 0.9; u.wl.rotation.set(0, 0, f); u.wr.rotation.set(0, 0, -f);
    if (d < 0.05) corvin.flying = false;
  } else {
    u.wl.rotation.set(0.15, 1.35, 0); u.wr.rotation.set(0.15, -1.35, 0);
    const want = yawTo(m.position.x, m.position.z, P.x, P.z);
    m.rotation.y += RM.angDiff(m.rotation.y, want) * Math.min(1, dt * 3);
    u.head.rotation.y = Math.sin(corvin.ph * 0.9) * 0.5;
  }
});
// Corvin hops to a spot near you (a little ahead and to the side)
corvin.near = (h = 2.2) => { const f = RM.forward(); corvin.fly(P.x + f.x * 2.2 - f.z * 1.2, h, P.z + f.z * 2.2 + f.x * 1.2); };

/* ------------------------------------------------------------ people */
RM.LOOKS = {
  pip: { name: 'Pip', gender: 'neither', skin: '#e6b690', face: 'round', marks: 'freckles', hair: 'messy', hairColor: '#b0512a', eyes: '#3e7b4b', outfit: 'rags', outfitColor: '#5a4632', extras: ['scarf'] },
  gideon: { name: 'Gideon', gender: 'boy', skin: '#a86f48', face: 'square', marks: 'scar', hair: 'beard', hairColor: '#c8c4bc', eyes: '#5a391c', outfit: 'coat', outfitColor: '#3a2e22', extras: ['shovel'] },
  guard: () => ({ name: 'Guard', gender: RM.pick(['boy', 'girl']), skin: RM.pick(RM.LOOK.skin), face: 'oval', marks: 'none', hair: 'hood', hairColor: '#111', eyes: '#2a1a10', outfit: 'robe', outfitColor: '#2e0a12', extras: ['lantern'] }),
  thief: { name: 'Thief', gender: 'boy', skin: '#d7a073', face: 'oval', marks: 'scar', hair: 'short', hairColor: '#35200f', eyes: '#86692e', outfit: 'coat', outfitColor: '#2b2b30', extras: [] },
  oldwoman: { name: 'Old woman', gender: 'girl', skin: '#e6b690', face: 'round', marks: 'none', hair: 'bun', hairColor: '#ebe7e0', eyes: '#8b939c', outfit: 'nightgown', outfitColor: '#6a5a6a', extras: ['scarf'] },
  watchman: { name: 'Watchman', gender: 'boy', skin: '#c3875b', face: 'square', marks: 'none', hair: 'short', hairColor: '#15110f', eyes: '#5a391c', outfit: 'coat', outfitColor: '#1f2d55', extras: ['lantern'] },
  baker: { name: 'Baker', gender: 'girl', skin: '#8b5838', face: 'round', marks: 'mole', hair: 'bun', hairColor: '#15110f', eyes: '#5a391c', outfit: 'farm', outfitColor: '#d9cfb8', extras: [] },
  mother: { name: 'Mother', gender: 'girl', skin: '#d7a073', face: 'oval', marks: 'none', hair: 'long', hairColor: '#35200f', eyes: '#5a391c', outfit: 'gown', outfitColor: '#2a4a34', extras: ['necklace'] },
};
RM.npc = (look, x, z, yaw = 0, o = {}) => {
  const fig = RM.buildFigure(look, o.vamp || {}, { scale: o.scale, headScale: o.headScale });
  fig.group.position.set(x, 0, z); fig.group.rotation.y = yaw;
  RM.actors.add(fig.group);
  const sc = o.scale || 1;
  const n = { fig, look, x, z, yaw, speed: 0, target: null, alive: true, name: o.name || look.name, sc, run: o.run || 3 };
  n.col = RM.addCircle(x, z, 0.32 * sc, 'npc');
  if (o.heart !== false) RM.heartTargets.push({ pos: () => (n.alive ? vec(n.x, 1.25 * sc, n.z) : null), label: o.heartLabel });
  if (o.lantern) {
    const L = new THREE.PointLight(0xffb060, o.lantern, 9, 1.7); L.position.set(0, -0.1, 0);
    const lg = fig.group.userData.lantern; if (lg) { lg.add(L); RM.glow(0, -0.1, 0, 0xffa050, 1.6, 0.6, lg); }
    n.light = L;
  }
  n.goTo = (tx, tz, speed) => { n.target = { x: tx, z: tz }; n.speed = speed || 1.4; };
  n.face = (tx, tz) => { n.yaw = yawTo(n.x, n.z, tx, tz); };
  n.update = (dt) => {
    let moving = 0;
    if (n.target && n.alive) {
      const dx = n.target.x - n.x, dz = n.target.z - n.z, d = Math.hypot(dx, dz);
      if (d < 0.15) { n.target = null; }
      else {
        const st = Math.min(d, n.speed * dt);
        n.col.off = true;
        let [nx, nz] = RM.collide(n.x + (dx / d) * st, n.z + (dz / d) * st, 0.3 * sc);
        n.col.off = false;
        // don't walk through the player
        const pd = RM.dist(nx, nz, P.x, P.z); if (pd < 0.7 && !n.ghost) { nx = n.x; nz = n.z; }
        moving = Math.hypot(nx - n.x, nz - n.z) / Math.max(dt, 1e-4);
        n.x = nx; n.z = nz;
        n.yaw += RM.angDiff(n.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 8);
      }
    }
    n.fig.group.position.set(n.x, n.fig.group.userData.baseY || 0, n.z);
    n.fig.group.rotation.y = n.yaw;
    n.fig.update(dt, moving);
    n.col.x = n.x; n.col.z = n.z;
  };
  n.remove = () => { n.alive = false; n.col.off = true; RM.actors.remove(n.fig.group); };
  return n;
};
// hunters: see you if you're in their view cone, close enough, with a clear line of sight
function watcher(n, { range = 12, cone = 0.62 } = {}) {
  n.detect = 0; n.range = range; n.cone = cone;
  n.sees = () => {
    if (!n.alive) return 0;
    const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz);
    const f = { x: -Math.sin(n.yaw), z: -Math.cos(n.yaw) };
    const dot = (f.x * dx + f.z * dz) / (d || 1);
    const r = n.range * (P.crouch ? 0.55 : P.sprinting ? 1.25 : 1);
    if (d < 1.6) return 1.5;               // right next to them: they notice
    if (d > r || dot < n.cone) return 0;
    if (!RM.clearLine(n.x, n.z, P.x, P.z)) return 0;
    return (1 - d / r) * 1.6 + 0.35;
  };
  return n;
}
// "?" and "!" over a hunter's head while they're noticing you
function detectHook(list) {
  RM.fxHooks.push((g) => {
    for (const n of list) {
      if (!n.alive || n.detect < 0.03) continue;
      const s = RM.project(n.x, 2.3 * n.sc, n.z); if (!s.on) continue;
      g.font = 'bold 26px Georgia'; g.textAlign = 'center';
      g.fillStyle = n.detect > 0.7 ? '#ff3040' : `rgba(255,210,120,${0.4 + n.detect * 0.6})`;
      g.fillText(n.detect > 0.7 ? '!' : '?', s.x, s.y);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(s.x - 22, s.y + 6, 44, 5);
      g.fillStyle = n.detect > 0.7 ? '#ff3040' : '#ffc860'; g.fillRect(s.x - 22, s.y + 6, 44 * clamp(n.detect, 0, 1), 5);
    }
  });
}

/* --------------------------------------------------------- common bits */
function applyLook() {
  const s = S(), look = s.look, v = RM.vampState(), dreaming = s.dreaming;
  const skin = dreaming ? look.skin : RM.paleSkin(look.skin, v.pale);
  const bare = look.outfit === 'nightgown' || look.outfit === 'gown';
  RM.hands.setLook(skin, bare ? skin : look.outfitColor, dreaming ? 0 : v.fangs, dreaming ? 0 : v.blood);
}
RM.applyLook = applyLook;
// a memory: a flash of your old life
RM.memoryFlash = (title, lines) => new Promise((res) => {
  const s = S(); s.memories = Math.min(7, s.memories + 1);
  const ov = RM.$('memory'); RM.$('memTitle').textContent = 'MEMORY ' + s.memories + ' / 7 · ' + title;
  RM.$('memText').innerHTML = lines.map((l) => '<p>' + RM.fmt(l) + '</p>').join('');
  ov.classList.add('show'); AU.chime(0.5); AU.sweep(0.3);
  const wasC = RM.control; RM.control = false;
  const close = () => { ov.classList.remove('show'); RM.control = wasC; document.removeEventListener('keydown', key); ov.removeEventListener('click', close); setTimeout(res, 500); };
  const key = (e) => { if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') close(); };
  setTimeout(() => { document.addEventListener('keydown', key); ov.addEventListener('click', close); }, 900);
});
// a floating glowing wisp you can touch to remember something
function wisp(x, y, z, color = 0xffe0a0) {
  const s = RM.glow(x, y, z, color, 0.9, 0.9, RM.actors);
  const s2 = RM.glow(x, y, z, 0xffffff, 0.3, 1, RM.actors);
  RM.onTick((dt) => { if (!s.parent) return false; const k = 1 + Math.sin(RM.t * 3) * 0.15; s.scale.set(0.9 * k, 0.9 * k, 1); s.position.y = s2.position.y = y + Math.sin(RM.t * 1.4) * 0.12; });
  return s;
}
// the "hold E" meter used for drinking, mesmerising, and similar
function holdMeter(label) { RM.bar('meter', 0, label); return (v) => RM.bar('meter', v * 100); }
// play a "hold E" moment. mode 'fill': hold until full · 'stop': let go inside the window · 'look': hold while looking at a point
function holdAction({ label, secs = 3, mode = 'fill', look, stopAt = [0.05, 0.35], sound = 'drink' }) {
  return new Promise((res) => {
    const m = holdMeter(label); let amt = 0, started = false;
    if (mode === 'look' && look) spiralHook(() => look, () => amt);
    const prev = RM.sceneTick;
    RM.sceneTick = (dt) => {
      if (prev) prev(dt, true);
      const held = RM.keys.KeyE || RM.keys.Space || RM.mouseHeld;
      const ok = mode !== 'look' || (RM.facing(look.x, look.z, 0.85) && RM.dist(P.x, P.z, look.x, look.z) < 7);
      if (held && ok) { started = true; amt += dt / secs; if (sound === 'drink') AU.drinkN.set(0.25, 0.1); else if (Math.random() < dt * 4) AU.whisper(0.2); }
      else { AU.drinkN.set(0, 0.1); if (mode === 'stop' && started) { finish(amt); return; } if (mode === 'look') amt = Math.max(0, amt - dt * 0.6); }
      m(amt); RM.fovExtra = -amt * 8;
      if (amt >= 1) finish(1);
    };
    function finish(v) { RM.sceneTick = prev; AU.drinkN.set(0); RM.bar('meter', null); RM.fovExtra = 0; if (mode === 'look') RM.fxHooks.pop(); res(v); }
  });
}
function spiralHook(getTarget, getAmt) {
  RM.fxHooks.push((g) => {
    const t = getTarget(), a = getAmt(); if (!t || a < 0.02) return;
    const s = RM.project(t.x, t.y, t.z); if (!s.on) return;
    g.save(); g.translate(s.x, s.y); g.rotate(RM.t * 3);
    g.strokeStyle = `rgba(210,40,70,${0.25 + a * 0.6})`; g.lineWidth = 2.5; g.beginPath();
    for (let i = 0; i < 160; i++) { const r = i * 0.55 * (0.4 + a), an = i * 0.25; i ? g.lineTo(Math.cos(an) * r, Math.sin(an) * r) : g.moveTo(0, 0); }
    g.stroke(); g.restore();
  });
}

/* ========================================================= NIGHT ZERO */
// You wake in the dark. Something scratches on the lid.
RM.SCENES = {};
RM.SCENES.wake = () => RM.play(async (done) => {
  const w = RM.useWorld('crypt'); RM.setEnv('crypt'); w.data.setPlate(S().look.name);
  const lid = w.data.coffinLid; lid.rotation.z = 0;
  RM.camMode = 'free'; RM.control = false; RM.hands.visible = false;
  const cam = RM.camera; cam.position.set(0, 0.62, -28); cam.rotation.set(Math.PI / 2 - 0.02, Math.PI, 0);
  P.x = 0; P.z = -28;
  RM.$('fade').style.opacity = 1;
  await RM.sleep(0.6);
  AU.setHeart(34, 0.5);
  await RM.fade(0.93, 2.5);
  RM.caption('...', 2); await RM.sleep(2.2);
  AU.scratch(0.35); RM.caption('<i>scratch... scratch...</i>', 2.6); await RM.sleep(3);
  AU.scratch(0.55); RM.shake(0.01, 0.5); await RM.sleep(1.2);
  RM.caption('Something is on the lid. <b>Push. Press E.</b>', 60);
  RM.fade(0.8, 0.6);
  let pushes = 0;
  await new Promise((res) => {
    const k = (e) => {
      if (e.code !== 'KeyE' && e.code !== 'Space') return;
      pushes++; AU.thud(0.4 + pushes * 0.08); RM.shake(0.02, 0.2);
      lid.rotation.z = -0.05 * pushes;
      RM.$('fade').style.opacity = Math.max(0, 0.8 - pushes * 0.14);
      if (pushes === 3) { AU.scratch(0.7); AU.squeak(); }
      if (pushes >= 5) { removeEventListener('keydown', k); canvasOff(); res(); }
    };
    const click = () => k({ code: 'KeyE' });
    const canvasOff = () => RM.$('game').removeEventListener('mousedown', click);
    addEventListener('keydown', k); RM.$('game').addEventListener('mousedown', click);
  });
  RM.caption('', 0.01);
  // the lid swings up and moonlight falls in; a raven is sitting right there
  AU.thud(0.9); AU.caw(0.45); AU.flap(0.4);
  RM.fade(0, 0.6);
  for (let i = 0; i <= 30; i++) { lid.rotation.z = lerp(-0.25, -2.05, i / 30); await RM.sleep(0.016); }
  corvin.place(0.35, 0.95, -27.25); corvin.m.rotation.y = 0;
  AU.setHeart(44, 0.35);
  await RM.sleep(0.8);
  await RM.say('Corvin', '"Oh good. You\'re awake. I was about to start eating you, and frankly I\'m relieved I don\'t have to."');
  await RM.say('Corvin', '"Don\'t scream. Everybody screams. It echoes terribly down here."');
  await RM.say('You', '<i>You try to breathe. Your lungs don\'t seem interested.</i>');
  await RM.say('Corvin', '"Ah. Yes. About that. You\'re dead, {name}. Mostly. The rest of you is... something else now."');
  await RM.say('Corvin', '"I\'m Corvin. I\'m a raven. I talk. You\'re a vampire. You drink blood. We\'ve both had very strange nights."');
  // sit up and climb out
  RM.fade(1, 0.5); await RM.sleep(0.55);
  RM.placePlayer(1.35, -27.2, Math.PI); P.pitch = -0.1;
  corvin.place(-0.1, 0.95, -27.9);
  RM.camMode = 'player'; RM.hands.visible = true; applyLook();
  RM.fade(0, 0.8);
  await RM.sleep(0.4);
  RM.hands.play('shake');
  await RM.say('Corvin', '"Look at your hands. Go on. Paler than you remember? And those nails... those are new."');
  RM.hands.anim = null;
  done('ok');
});

// Hunting rats in the crypt
function makeRat() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x2a221e, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), m); body.scale.set(0.8, 0.7, 1.6); body.position.y = 0.07; g.add(body);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), m); head.rotation.x = -Math.PI / 2; head.position.set(0, 0.07, -0.18); g.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.28, 5), new THREE.MeshStandardMaterial({ color: 0x8a6a64 })); tail.rotation.x = Math.PI / 2 - 0.2; tail.position.set(0, 0.04, 0.26); g.add(tail);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), new THREE.MeshBasicMaterial({ color: 0xff3020 })); e.position.set(s * 0.02, 0.09, -0.2); g.add(e); }
  body.castShadow = true;
  return g;
}
RM.SCENES.rats = () => RM.play(async (done) => {
  RM.useWorld('crypt'); RM.setEnv('crypt');
  const rats = [];
  for (let i = 0; i < 6; i++) {
    const m = makeRat(), x = rand(-3.5, 3.5), z = rand(-24, -6);
    m.position.set(x, 0, z); RM.actors.add(m);
    rats.push({ m, x, z, dir: rand(TAU), t: rand(2), alive: true, flee: 0 });
    RM.heartTargets.push({ pos: () => (rats[i].alive ? vec(rats[i].x, 0.1, rats[i].z) : null) });
  }
  let caught = 0;
  RM.setObjective('Catch rats to drink: <b>0 / 3</b><br><span class="dim">Crouch (C) to sneak up · click or E to pounce</span>');
  RM.control = true; RM.lockPointer();
  corvin.fly(4.6, 4.8, -18);
  const pounce = () => {
    RM.hands.play('pounce'); AU.whoosh(0.3);
    let best = null, bd = 1.7;
    for (const r of rats) { if (!r.alive) continue; const d = RM.dist(P.x, P.z, r.x, r.z); if (d < bd && RM.facing(r.x, r.z, 0.25)) { best = r; bd = d; } }
    if (!best) return;
    best.alive = false; RM.actors.remove(best.m);
    AU.squeak(); AU.gulp(0.5); RM.flash('rgba(120,0,10,0.35)', 350);
    caught++; S().thirst = Math.max(0, S().thirst - 11); S().flags.bloodOnHands = 1;
    RM.setObjective('Catch rats to drink: <b>' + caught + ' / 3</b><br><span class="dim">Crouch (C) to sneak up · click or E to pounce</span>');
    if (caught === 1) RM.caption('Corvin: <i>"Hah! Graceful. Like a cat that\'s been hit by a cart."</i>', 3.5);
    if (caught >= 3) {
      RM.caption('The warm, awful taste of it. It helps. A little.', 3);
      RM.after(1.2, () => done('ok'));
    }
  };
  RM.onAttack = pounce;
  RM.useKey = pounce;
  RM.sceneTick = (dt) => {
    for (const r of rats) {
      if (!r.alive) continue;
      const d = RM.dist(P.x, P.z, r.x, r.z);
      const fear = P.crouch ? 1.35 : P.sprinting ? 5 : 3.1;
      let spd = 0.6;
      if (d < fear) { r.dir = Math.atan2(r.x - P.x, r.z - P.z) + rand(-0.4, 0.4); spd = 3.4; if (Math.random() < dt * 2) AU.squeak(); }
      else { r.t -= dt; if (r.t < 0) { r.t = rand(0.6, 2); r.dir += rand(-1.5, 1.5); spd = Math.random() < 0.4 ? 0 : 0.8; } }
      let nx = r.x + Math.sin(r.dir) * spd * dt, nz = r.z + Math.cos(r.dir) * spd * dt;
      [nx, nz] = RM.collide(nx, nz, 0.12);
      nx = clamp(nx, -3.8, 3.8); nz = clamp(nz, -26, -3);
      if (Math.abs(nx - r.x) < 1e-4 && Math.abs(nz - r.z) < 1e-4) r.dir += Math.PI * 0.7;
      r.x = nx; r.z = nz;
      r.m.position.set(r.x, 0, r.z); r.m.rotation.y = r.dir + Math.PI;
    }
  };
});

// The red chalice on the altar
RM.SCENES.chalice = () => RM.play(async (done) => {
  const w = RM.useWorld('crypt'); RM.setEnv('crypt');
  RM.setMarker(0, -18.6); RM.setObjective('Drink from the <b>red chalice</b> on the altar');
  RM.control = true; RM.lockPointer();
  corvin.fly(1.2, 1.4, -19.6);
  RM.addInteract({ x: 0, z: -18.6, r: 1.8, label: 'Drink from the red chalice', use: async (o) => {
    o.off = true; RM.control = false; RM.setMarker(null);
    RM.hands.play('reach'); await RM.sleep(0.6);
    AU.gulp(0.6); await RM.sleep(0.3); AU.gulp(0.5);
    w.data.chaliceWine.visible = false;
    RM.flash('rgba(255,240,220,0.9)', 1600); AU.sting(0.4);
    S().thirst = Math.max(0, S().thirst - 25); S().flags.chalice = true; S().flags.weak = true;
    await RM.sleep(0.6);
    await RM.memoryFlash('A BLUE DOOR', [
      'Sunlight. Real sunlight, warm on your face.',
      'A blue front door on a crooked street. A woman is laughing somewhere inside, calling <b>"{name}! Supper!"</b>',
      'Then a man in a long black coat with a silver chain of office, smiling at you over the garden gate. <i>"What a lovely face,"</i> he says. <i>"It ought to be painted."</i>',
    ]);
    RM.hands.anim = null;
    await RM.say('Corvin', '"That was not wine. That was Vane\'s <i>binding wine</i>. It\'ll make you weak for a night or so." <i>He tilts his head.</i> "But you remembered something. Didn\'t you?"');
    done('ok');
  } });
});

// Drinking nothing: walk past everything while the thirst screams at you
RM.SCENES.resist = () => RM.play(async (done) => {
  RM.useWorld('crypt'); RM.setEnv('crypt');
  RM.setMarker(0, -2.2); RM.setObjective('Walk to the gate. <b>Don\'t drink.</b>');
  RM.control = true; RM.lockPointer();
  corvin.fly(-4.6, 4.8, -8);
  let w = 0;
  RM.sceneTick = (dt) => {
    // the chalice pulls at you
    const d = RM.dist(P.x, P.z, 0, -19.5);
    if (d < 8) { const want = yawTo(P.x, P.z, 0, -19.5); P.yaw += RM.angDiff(P.yaw, want) * dt * 0.35 * (1 - d / 8); RM.fovExtra = (1 - d / 8) * -8; }
    else RM.fovExtra = 0;
    w -= dt; if (w < 0) { w = rand(3, 5); AU.whisper(0.3); RM.caption(RM.pick(['<i>drink...</i>', '<i>just a sip...</i>', '<i>it\'s right there...</i>', '<i>why suffer?</i>']), 1.8); }
    if (P.z > -2.6 && Math.abs(P.x) < 3) {
      RM.fovExtra = 0; S().humanity += 8; S().thirst = Math.min(100, S().thirst + 14);
      done('ok');
    }
  };
});

// Smash the gate (loud), then fight the watchmen who come running
RM.SCENES.gate = () => RM.play(async (done) => {
  const w = RM.useWorld('crypt'); RM.setEnv('crypt');
  const gate = w.data.gate; gate.rotation.x = 0; w.data.gateCol.off = false; w.data.holeCol.off = false; w.data.holeHeap.visible = true;
  RM.placePlayer(0, -3.2, Math.PI);
  let ghp = 3, hp = 100, fighting = false, gateDown = false;
  RM.setObjective('Smash the gate: <b>click</b> to strike it');
  RM.control = true; RM.lockPointer();
  corvin.place(-4.6, 4.8, -2);
  const foes = [];
  const hitFoes = () => {
    let any = false;
    for (const f of foes) {
      if (!f.alive) continue;
      const d = RM.dist(P.x, P.z, f.x, f.z);
      if (d < 2.4 && RM.facing(f.x, f.z, 0.45)) {
        any = true; f.hp--; f.stagger = 0.45; f.wind = 0; f.fig.setPose('stand');
        const k = 1.2 / (d || 1); f.x += (f.x - P.x) * k * 0.5; f.z += (f.z - P.z) * k * 0.5;
        AU.hit(0.6); RM.shake(0.03, 0.15);
        if (f.hp <= 0) {
          f.alive = false; f.fig.setPose('lie'); f.col.off = true; if (f.light) f.light.intensity = 0;
          AU.thud(0.5); S().thirst = Math.max(0, S().thirst - 8);
        }
      }
    }
    return any;
  };
  let alt = false;
  RM.onAttack = () => {
    if (RM.hands.animT < 0.28 && RM.hands.anim) return;
    alt = !alt; RM.hands.play(alt ? 'claw' : 'claw2'); AU.whoosh(0.4);
    if (!gateDown) {
      if (RM.dist(P.x, P.z, 0, 0.1) < 2.8 && RM.facing(0, 0.1, 0.3)) {
        ghp--; AU.clang(0.8); RM.shake(0.05, 0.25); gate.rotation.x = 0.04 * (3 - ghp);
        if (ghp <= 0) smash();
      }
      return;
    }
    hitFoes();
  };
  RM.onDash = () => RM.dash();
  async function smash() {
    gateDown = true; w.data.gateCol.off = true;
    AU.clang(1); AU.thud(1); RM.shake(0.1, 0.6);
    for (let i = 0; i <= 20; i++) { gate.rotation.x = lerp(0.12, 1.47, (i / 20) ** 2); await RM.sleep(0.02); }
    S().dread += 2;
    RM.caption('The whole crypt rings like a bell. Somewhere above, men are shouting.', 3.5);
    await RM.sleep(2.2);
    RM.setObjective('<b>Watchmen!</b> Click to claw · <b>Space</b> to dash away from their swings');
    for (const [x, z] of [[-0.8, 7.6], [0.8, 8.6]]) {
      const f = RM.npc(RM.LOOKS.watchman, x, z, 0, { lantern: 1.6 });
      Object.assign(f, { hp: S().flags.weak ? 4 : 3, stagger: 0, wind: 0, cd: rand(0.5, 1.4) });
      foes.push(f);
    }
    fighting = true;
    RM.bar('hp', hp, 'YOU');
    AU.setHeart(96, 0.5);
  }
  RM.fxHooks.push((g) => { // warn when a swing is coming
    for (const f of foes) if (f.alive && f.wind > 0) { const s = RM.project(f.x, 2.2, f.z); if (s.on) { g.fillStyle = `rgba(255,${120 - f.wind * 100},40,0.9)`; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.fillText('!', s.x, s.y); } }
  });
  RM.sceneTick = (dt) => {
    for (const f of foes) {
      f.update(dt);
      if (!f.alive) continue;
      const gy = w.groundAt(f.x, f.z); f.fig.group.position.y = gy;
      if (f.stagger > 0) { f.stagger -= dt; continue; }
      const d = RM.dist(P.x, P.z, f.x, f.z);
      f.face(P.x, P.z); f.cd -= dt;
      if (f.wind > 0) {
        f.wind += dt;
        if (f.light) f.light.intensity = 1.6 + f.wind * 5;
        if (f.wind > 0.8) { // the lantern swings
          f.wind = 0; f.cd = rand(1.1, 1.8); f.fig.setPose('stand'); if (f.light) f.light.intensity = 1.6;
          AU.whoosh(0.6);
          if (d < 2.4 && P.iframes <= 0) {
            hp -= S().flags.weak ? 28 : 21; RM.flash('rgba(200,20,20,0.55)', 400); RM.shake(0.06, 0.3); AU.hit(0.8);
            RM.bar('hp', hp, 'YOU');
            if (hp <= 0) { RM.control = false; RM.flash('rgba(0,0,0,1)', 1500); RM.after(0.6, () => done('dead')); return; }
          }
        }
      } else if (d > 1.9) { f.goTo(P.x, P.z, 2.5); }
      else { f.target = null; if (f.cd <= 0) { f.wind = 0.001; f.fig.setPose('raise'); } }
    }
    if (fighting && foes.every((f) => !f.alive)) {
      fighting = false; AU.setHeart(60, 0.3); RM.bar('hp', null);
      RM.setObjective('Up the stairs, out of the crypt');
      RM.setMarker(0, 7.8);
      RM.caption('Corvin: <i>"Well! That was subtle. Everyone in Ravenmoor definitely slept through that."</i>', 4);
    }
    if (gateDown && !fighting && foes.length && P.z > 7.4) done('ok');
  };
});

// The bone tunnels: quiet, slow, and something down here is breathing
RM.SCENES.tunnels = () => RM.play(async (done) => {
  const w = RM.useWorld('crypt'); RM.setEnv('crypt');
  w.data.holeHeap.visible = false; w.data.holeCol.off = true; w.data.gateCol.off = false; w.data.gate.rotation.x = 0;
  for (const c of w.data.chains) c.visible = true;
  if (S().flags.sleeperChain) w.data.chains[0].visible = false;
  w.data.bigLid.position.y = 1.6; w.data.bigLid.rotation.z = 0;
  RM.placePlayer(-4.2, -14, Math.PI / 2);
  RM.setMarker(-6.6, -14); RM.setObjective('Crawl through the hole into the <b>bone tunnels</b>');
  RM.control = true; RM.lockPointer();
  corvin.fly(-4.8, 1.2, -12.8);
  let inside = false, sawCoffin = false, askedChains = false, memGot = false, t = 0, breathing = 0;
  const mem = w.data.memory; const mw = wisp(mem.x, 1.2, mem.z);
  RM.addInteract({ x: mem.x, z: mem.z, r: 1.6, label: 'Touch the light', use: async (o) => {
    o.off = true; memGot = true; RM.actors.remove(mw);
    await RM.memoryFlash('A LULLABY', [
      'A kitchen that smells of bread and woodsmoke.',
      'Someone is singing a song about a raven who brought the sun back in its beak.',
      '<i>"Sleep now, {name}. The ravens are watching. Nothing bad comes while the ravens watch."</i>',
    ]);
    RM.control = true;
  } });
  const bc = w.data.bigCoffin, lad = w.data.ladder;
  RM.addInteract({ x: bc.x + 1.9, z: bc.z, r: 2.4, when: () => !askedChains, label: 'Look at the chains', use: async (o) => {
    askedChains = true; o.off = true; RM.control = false;
    await RM.say('Corvin', '"Seven chains. Blessed iron. Somebody wanted whatever\'s in there to stay in there <b>very</b> badly."');
    const c = await RM.choose({ q: 'The chained coffin breathes. What do you do?', options: [
      { id: 'break', icon: '⛓', label: 'Break one chain', sub: 'Just one. Just to see.' },
      { id: 'leave', icon: '🚶', label: 'Walk away', sub: 'Some doors should stay shut.' },
    ] });
    if (c === 'break') {
      RM.control = true;
      RM.setObjective('Grab the chain: <b>hold E</b> and pull');
      let tug = 0; const tugT = setInterval(() => { if (RM.keys.KeyE || RM.mouseHeld) { tug++; AU.clang(0.25); RM.shake(0.015, 0.1); RM.hands.play('reach'); } }, 450);
      await holdAction({ label: 'PULL', secs: 3.2, sound: 'none' });
      clearInterval(tugT); void tug; RM.control = false;
      RM.hands.play('claw'); await RM.sleep(0.25);
      AU.clang(1); w.data.chains[0].visible = false; RM.shake(0.08, 0.8);
      S().flags.sleeperChain = true; S().humanity -= 5;
      await RM.sleep(0.6); AU.boom(0.8); AU.breathN.set(0.4, 0.2);
      w.data.bigLid.position.y = 1.75;
      await RM.say('???', '<span class="deep">"...{name}..."</span>');
      await RM.say('Corvin', '"It knows your name. Why does it know your name?! Ladder. LADDER. NOW."');
    } else {
      S().humanity += 3;
      RM.caption('You back away. The breathing follows you down the tunnel... then stops.', 4);
    }
    RM.setMarker(lad.x, lad.z); RM.setObjective('Climb the <b>ladder</b> out');
    RM.control = true;
  } });
  RM.addInteract({ x: lad.x, z: lad.z, r: 1.6, label: 'Climb the ladder', use: (o) => { o.off = true; done('ok'); } });
  RM.sceneTick = (dt) => {
    t += dt;
    if (!inside && P.x < -6.8) { inside = true; RM.setMarker(null); RM.setObjective('Find a way out of the tunnels'); RM.caption('Corvin: <i>"Skulls. Lovely. Keep to the left. Or the right. I\'ve never actually been down here."</i>', 4); }
    if (inside && t > 70 && !RM.marker && !askedChains) { RM.setMarker(lad.x, lad.z); RM.setObjective('Find a way out of the tunnels (the <b>ladder</b>)'); }
    // the breathing
    const d = RM.dist(P.x, P.z, bc.x, bc.z);
    const want = d < 9 ? (1 - d / 9) * 0.5 : S().flags.sleeperChain ? 0.12 : 0;
    breathing = lerp(breathing, want, dt * 2);
    AU.breathN.g.gain.value = breathing * (0.55 + Math.sin(RM.t * 1.3) * 0.45);
    w.data.bigLid.position.y = (S().flags.sleeperChain ? 1.72 : 1.6) + Math.max(0, Math.sin(RM.t * 1.3)) * 0.02 * (d < 9 ? 1 : 0);
    if (!sawCoffin && d < 5.5) {
      sawCoffin = true; AU.sting(0.5); RM.shake(0.03, 0.6);
      for (const f of RM.flickers) if (RM.dist(f.f.position.x, f.f.position.z, bc.x, bc.z) < 4 && f.L) f.base *= 0.4;
      w.data.bigLid.position.y = 1.66;
      RM.caption('The lid of the huge coffin <b>lifts</b>. Just a crack. Then settles.', 3.5);
      corvin.near(1.6);
      RM.after(1.2, () => RM.caption('Corvin: <i>"No. No no no. Not that one. We do NOT touch that one."</i>', 3.5));
    }
  };
});

// Gideon the gravedigger sees you climb out of the ground
RM.SCENES.graveyard = (from) => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night');
  const Pn = w.data.P;
  if (from === 'tunnels') RM.placePlayer(Pn.tunnelExit.x, Pn.tunnelExit.z, -Math.PI / 2 - 0.3);
  else RM.placePlayer(Pn.mausoleum.x, Pn.mausoleum.z - 0.5, 0);
  spawnTownRavens(w);
  RM.addFlock(Pn.tower.x, 34, Pn.tower.z, 12, 9);
  const gid = RM.npc(RM.LOOKS.gideon, Pn.gideon.x, Pn.gideon.z, Math.PI / 2, { heartLabel: 'Gideon' });
  gid.fig.setPose('dig');
  const post = RM.build.lampPost(Pn.gideon.x + 1.2, Pn.gideon.z + 1.4, 1.8, RM.actors); void post;
  RM.control = true; RM.lockPointer();
  corvin.place(Pn.gideon.x - 6, 1.6, Pn.gideon.z - 5);
  RM.setObjective('Get out of the graveyard');
  RM.setMarker(Pn.gate.x, Pn.gate.z);
  RM.caption('Fresh air. Cold, wet, wonderful. You can smell everything. Someone nearby smells like <b>dinner</b>.', 4.5);
  let met = false, digT = 0;
  RM.sceneTick = async (dt) => {
    gid.update(dt);
    digT += dt; if (!met && digT > 1.6) { digT = 0; AU.dirt(0.25); gid.fig.armL.rotation.x = -0.9 + Math.sin(RM.t * 4) * 0.4; gid.fig.armR.rotation.x = gid.fig.armL.rotation.x; }
    if (!met && RM.dist(P.x, P.z, gid.x, gid.z) < 10) {
      met = true; RM.control = false; RM.setMarker(null);
      gid.fig.setPose('stand'); gid.face(P.x, P.z);
      AU.sting(0.25);
      await RM.say('Gideon', '"Well now." <i>An old man with a shovel and a face like a walnut. He doesn\'t run.</i> "Another one."');
      await RM.say('Gideon', '"Forty years I\'ve dug in this yard, and you\'re only the second I\'ve seen crawl back <b>out</b>."');
      RM.S.thirst = Math.min(100, RM.S.thirst + 8);
      await RM.say('You', '<i>You can hear his heart. Slow and steady. You could reach him in three steps.</i>');
      const c = await RM.choose({ q: 'Gideon has seen you. Nobody can know what you are.', timed: 0, options: [
        { id: 'kill', icon: '🗡', label: 'Kill him', sub: 'Nobody can ever know.' },
        { id: 'forget', icon: '🌀', label: 'Make him forget', sub: 'Costs Thirst. Might not hold.' },
        { id: 'talk', icon: '🙂', label: 'Talk to him', sub: 'He doesn\'t seem scared.' },
      ] });
      S().choices.gideon = c;
      if (c === 'kill') await gideonKill(gid);
      else if (c === 'forget') await gideonForget(gid);
      else await gideonTalk(gid);
      RM.setObjective('Out through the graveyard gate');
      RM.setMarker(Pn.gate.x, Pn.gate.z);
      RM.control = true;
    }
    if (met && RM.control && P.z < 31) done('ok');
  };
});
async function gideonKill(gid) {
  await RM.say('Gideon', '<i>He sees it in your face. The shovel drops.</i> "Ah. That kind." <i>And the old man runs, faster than you\'d think.</i>');
  RM.setObjective('<b>Catch him</b> before he reaches the gate (Shift to sprint · click when close)');
  RM.control = true;
  gid.goTo(2.2, 33, 3.0);
  RM.heartTargets.length = 0; RM.heartTargets.push({ pos: () => (gid.alive ? vec(gid.x, 1.25, gid.z) : null), label: 'Gideon' });
  await new Promise((res) => {
    const prev = RM.sceneTick;
    RM.onAttack = () => {
      RM.hands.play('pounce'); AU.whoosh(0.4);
      if (RM.dist(P.x, P.z, gid.x, gid.z) < 2.0) {
        RM.onAttack = null; RM.sceneTick = prev; RM.control = false;
        gid.target = null; gid.fig.setPose('cower');
        RM.flash('rgba(140,0,10,0.85)', 1200); AU.hit(0.9); AU.gulp(0.7); AU.drinkN.set(0.25);
        RM.after(1.4, () => { AU.drinkN.set(0); gid.fig.setPose('lie'); gid.alive = false; gid.col.off = true; S().thirst = 0; S().humanity -= 22; S().bites++; S().kills++; S().flags.gideonDead = true; res(); });
      }
    };
    let tripped = false;
    RM.sceneTick = (dt) => {
      gid.update(dt);
      // old legs: he stumbles on the path by the gate
      if (!gid.target && !tripped && gid.alive) { tripped = true; gid.fig.setPose('kneel'); RM.caption('He trips on the gate path. He can\'t get up fast enough.', 2.5); }
    };
  });
  await RM.say('You', '<i>It\'s over quickly. It\'s warm. And it is the best thing you have ever tasted, and you hate that.</i>');
  await RM.say('Corvin', '"...Right. Well. Nobody knows. Nobody will ever know." <i>He doesn\'t look at you.</i>');
}
async function gideonForget(gid) {
  RM.setObjective('Hold <b>E</b> and look into his eyes');
  RM.control = true; let amt = 0; const m = holdMeter('MESMERISE');
  spiralHook(() => vec(gid.x, 1.62, gid.z), () => amt);
  await new Promise((res) => {
    RM.sceneTick = (dt) => {
      gid.update(dt); gid.face(P.x, P.z);
      const looking = RM.facing(gid.x, gid.z, 0.9) && RM.dist(P.x, P.z, gid.x, gid.z) < 6;
      if (RM.keys.KeyE && looking) { amt += dt / 3; if (Math.random() < dt * 4) AU.whisper(0.2); } else amt = Math.max(0, amt - dt * 0.6);
      m(amt); RM.fovExtra = -amt * 10;
      if (amt >= 1) { RM.sceneTick = null; RM.bar('meter', null); RM.fovExtra = 0; res(); }
    };
  });
  RM.fxHooks.length = 0;
  AU.sweep(0.4); S().thirst = Math.min(100, S().thirst + 14); S().flags.gideonForgot = true; S().humanity -= 5;
  RM.control = false;
  await RM.say('Gideon', '<i>His eyes go glassy.</i> "...Hm? Must\'ve dozed off. Big hole won\'t dig itself." <i>He turns back to his grave, humming.</i>');
  gid.face(gid.x - 3, gid.z); gid.fig.setPose('dig');
  await RM.say('Corvin', '"Neat trick. Mind you, old men are stubborn. Memories creep back in at night, like damp."');
}
async function gideonTalk(gid) {
  await RM.say('You', '"...Please don\'t scream."');
  await RM.say('Gideon', '"Scream? At my age? Save my breath for the shovel." <i>He leans on it.</i> "You\'re not the first one I\'ve seen, you know."');
  await RM.say('Gideon', '"Forty years back, the night the sun stopped coming up proper, they buried a young one in that crypt. Chains and all. The Magistrate\'s men. Very hush-hush."');
  await RM.say('Gideon', '"Here. Bit of advice from someone who digs holes for a living." <i>He taps his nose.</i> "Sleep in the crypt. And never the same spot twice. Hunters are patient."');
  await RM.say('Gideon', '"Now make yourself useful. Vampires are strong, aren\'t they? Grab that spare shovel and help an old man finish this hole."');
  // play it: dig the grave with him
  RM.setObjective('Help Gideon dig: press <b>E</b> at the grave (<b>0 / 4</b>)');
  RM.setMarker(gid.x - 1.4, gid.z + 1.3);
  gid.face(gid.x - 1.4, gid.z); gid.fig.setPose('dig');
  const lines = ['"Put your back into it! Oh. You don\'t really have one any more, do you."', '"Forty years I\'ve waited for someone to help. And it\'s a corpse. Figures."', '"Vane had me bury a lot of people who weren\'t quite finished being alive. I don\'t sleep much."'];
  let dug = 0;
  await new Promise((res) => {
    RM.control = true;
    RM.addInteract({ x: gid.x - 1.4, z: gid.z + 1.3, r: 2.2, label: 'Dig', use: async () => {
      if (RM.hands.animT < 0.5 && RM.hands.anim === 'pounce') return;
      RM.hands.play('pounce'); AU.dirt(0.6); RM.shake(0.02, 0.2); dug++;
      RM.setObjective('Help Gideon dig: press <b>E</b> at the grave (<b>' + dug + ' / 4</b>)');
      if (lines[dug - 1]) RM.caption('Gideon: <i>' + lines[dug - 1] + '</i>', 4);
      if (dug >= 4) { RM.interacts.length = 0; res(); }
    } });
  });
  RM.setMarker(null); RM.control = false;
  gid.fig.setPose('stand'); gid.face(P.x, P.z);
  await RM.say('Gideon', '"Good hole. You\'ve a talent." <i>He grins, three teeth and all.</i> "Come by any night. I\'ll leave the lantern lit."');
  S().bonds.gideon += 2; S().humanity += 6; S().flags.gideonFriend = true;
  RM.toast('🙂 Gideon: <b>Friend</b>');
  await RM.say('Corvin', '"Well. He\'s either very brave or very stupid. I like him."');
}

/* ========================================================== NIGHT ONE */
function spawnTownRavens(w) {
  for (const r of w.data.roofs) if (Math.random() < 0.25) { r.g.updateMatrixWorld(true); const v = r.g.localToWorld(vec(rand(-1, 1), r.H + 0.15, 0)); RM.addRaven(v.x, v.y, v.z); }
  for (const p of w.data.perches) if (Math.random() < 0.6) RM.addRaven(p.x, p.y, p.z);
}
RM.spawnTownRavens = spawnTownRavens;
function posters(w) {
  if (S().dread < 2) return;
  for (const [x, z, ry] of [[-3.98, 16, Math.PI / 2], [3.98, 6, -Math.PI / 2], [-3.98, -6, Math.PI / 2], [3.98, 20, -Math.PI / 2], [-19.9, -34, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.95), RM.MAT.poster); m.position.set(x, 1.7, z); m.rotation.y = ry; RM.actors.add(m);
  }
}
// Walking into town, thirstier with every step, until you collapse in an alley
RM.SCENES.townWalk = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('twilight');
  const Pn = w.data.P;
  RM.placePlayer(Pn.mausoleum.x, Pn.mausoleum.z - 0.5, 0);
  spawnTownRavens(w); RM.addFlock(Pn.tower.x, 34, Pn.tower.z, 14, 9); posters(w);
  if (S().flags.gideonFriend) { const g = RM.npc(RM.LOOKS.gideon, Pn.gideon.x, Pn.gideon.z, Math.PI / 2); g.fig.setPose('dig'); }
  S().thirst = Math.max(S().thirst, 58);
  RM.control = true; RM.lockPointer();
  corvin.place(2.6, 2.6, 30.2);
  RM.setObjective('Find something to drink');
  RM.setMarker(12, 0);
  RM.caption(S().dread >= 2 ? 'New posters on every wall: <b>BEWARE THE SLEEPER</b>. That\'s... you.' : 'Ravenmoor at twilight. The sun never really rises here any more. It just sort of... sulks.', 5);
  AU.choirLevel = 0.03;
  let collapsed = false, sh = 0;
  RM.sceneTick = async (dt) => {
    if (collapsed) return;
    S().thirst = Math.min(100, S().thirst + dt * (P.sprinting ? 1.4 : 0.7));
    sh -= dt; if (S().thirst > 80 && sh < 0) { sh = rand(2, 4); RM.hands.play('shake'); RM.caption(RM.pick(['<i>So thirsty.</i>', '<i>Every heartbeat in town, drumming.</i>', '<i>You could just... take one.</i>']), 2); }
    P.roll = Math.sin(RM.t * 0.9) * 0.02 * (S().thirst / 100);
    if (!collapsed && P.x > 13.5 && Math.abs(P.z) < 2) {
      collapsed = true; RM.control = false; RM.setMarker(null); RM.setObjective('');
      S().thirst = Math.max(S().thirst, 86);
      AU.thud(0.6); RM.flash('rgba(90,0,0,0.7)', 900);
      RM.camMode = 'free';
      const cam = RM.camera;
      for (let i = 0; i <= 30; i++) { const k = i / 30; cam.position.set(P.x, lerp(1.62, 0.35, k * k), P.z); cam.rotation.set(lerp(0, -0.2, k), P.yaw, lerp(0, 0.9, k * k)); await RM.sleep(0.016); }
      AU.setHeart(90, 0.55);
      await RM.fade(0.7, 1);
      RM.caption('Your legs just... stop.', 2.5); await RM.sleep(2.6);
      done('ok');
    }
  };
});

// Pip finds you. A choice (timed), then you play it.
RM.SCENES.pipMeet = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('twilight');
  RM.placePlayer(15.5, 0, -Math.PI / 2);
  RM.camMode = 'free';
  const cam = RM.camera; cam.position.set(15.5, 0.55, 0); cam.rotation.set(-0.05, -Math.PI / 2 + 0.25, 0.6);
  spawnTownRavens(w);
  const pip = RM.npc(RM.LOOKS.pip, 22, 0.4, Math.PI / 2, { scale: 0.72, headScale: 1.18, heartLabel: 'Pip' });
  RM.pip = pip;
  await RM.fade(0, 1.2);
  AU.setHeart(96, 0.6);
  pip.goTo(16.8, 0.3, 1.4);
  await RM.sleep(2.4);
  for (let i = 0; i <= 25; i++) { cam.rotation.z = lerp(0.6, 0.05, i / 25); await RM.sleep(0.02); }
  pip.fig.setPose('kneel');
  await RM.say('???', '"Hey. Hey! Are you all right? You look terrible. Like, <i>dead</i> terrible."');
  await RM.say('Pip', '"I\'m Pip. I live... around. Here, I\'ve got bread. It\'s only a bit stale."');
  pip.fig.setPose('offer');
  await RM.say('You', '<i>A small, warm, thumping heart, right there. So close. So loud.</i>');
  const th = S().thirst;
  const c = await RM.choose({ q: 'Pip is right there...', timed: 10, def: 'bite', options: [
    { id: 'bite', icon: '🦷', label: 'Bite Pip', sub: 'The thirst is screaming.' },
    { id: 'nobite', icon: '🚫', label: 'Don\'t bite', sub: 'Push Pip away. Feed somewhere else.' },
    { id: 'bread', icon: '🍞', label: 'Take the bread', sub: 'Human food. Could it help?', lock: th >= 90 ? 'The Beast won\'t let you. Not bread. Not now.' : null },
  ] });
  S().choices.pip = c;
  done(c);
});

// Biting Pip: hold E to drink, let go before it's too late (if you still can)
RM.SCENES.bitePip = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('twilight'); void w;
  const pip = RM.npc(RM.LOOKS.pip, 16.8, 0.3, Math.PI / 2, { scale: 0.72, headScale: 1.18 });
  pip.fig.setPose('kneel');
  RM.placePlayer(15.6, 0.2, -Math.PI / 2);
  RM.camMode = 'free';
  const cam = RM.camera; cam.position.set(16.35, 1.05, 1.05); cam.lookAt(16.8, 0.8, 0.3);
  const canStop = S().thirst < 92;
  await RM.say('Pip', '"...What\'s wrong with your eyes? Why are they—"');
  AU.sting(0.6); RM.flash('rgba(160,0,0,0.9)', 700);
  RM.setObjective('Hold <b>E</b> to drink. <b>Let go</b> to stop.' + (canStop ? '' : '<br><span class="bad">You don\'t think you CAN stop.</span>'));
  let amt = 0, drinking = false, started = false;
  const m = holdMeter('DRINKING');
  RM.$('meterWrap').classList.add('zones');
  const result = await new Promise((res) => {
    RM.sceneTick = (dt) => {
      const held = RM.keys.KeyE || RM.keys.Space || RM.mouseHeld;
      if (held) { started = true; drinking = true; amt += dt / 5.5; }
      else if (started && canStop) { drinking = false; res(amt); RM.sceneTick = null; return; }
      else if (started && !canStop) { amt += dt / 5.5; RM.caption('<span class="bad">You can\'t stop. You can\'t stop. You can\'t stop.</span>', 1); }
      AU.drinkN.set(drinking || (started && !canStop) ? 0.3 : 0, 0.1);
      cam.position.set(16.35 + amt * 0.2, 1.05 - amt * 0.12, 1.05 - amt * 0.4); cam.lookAt(16.8, 0.8, 0.3); cam.rotation.z += Math.sin(RM.t * 3) * 0.03 * amt;
      RM.canvasFilter(`saturate(${1 + amt}) contrast(${1 + amt * 0.2})`);
      m(amt);
      if (amt >= 1) { res(1); RM.sceneTick = null; }
    };
  });
  AU.drinkN.set(0); RM.bar('meter', null); RM.$('meterWrap').classList.remove('zones'); RM.canvasFilter('');
  const s = S(); s.bites++; s.flags.pipBitten = true;
  if (result >= 0.99) {
    s.flags.pipDead = true; s.humanity -= 32; s.thirst = 0; s.kills++;
    pip.fig.setPose('lie'); RM.flash('rgba(0,0,0,1)', 2500); AU.boom(0.9);
    await RM.sleep(1.2);
    await RM.say('You', '<i>When it\'s over, the alley is very quiet. Pip is very still. The bread is lying in a puddle.</i>');
    await RM.say('Corvin', '<i>For once, the raven has nothing to say at all.</i>');
  } else if (result >= 0.4) {
    s.flags.pipFainted = true; s.humanity -= 8; s.thirst = Math.max(0, s.thirst - 55);
    pip.fig.setPose('lie');
    await RM.say('You', '<i>You tear yourself away. Pip slumps against the wall: pale, breathing, alive. Two small marks on their neck.</i>');
    await RM.say('Corvin', '"They\'ll live. They\'ll wake up with a headache and some very strange questions. Come on, before somebody sees."');
  } else {
    s.flags.pipScared = true; s.humanity -= 3; s.thirst = Math.max(0, s.thirst - 15); s.bonds.pip -= 2;
    pip.fig.setPose('stand'); pip.goTo(4, 0, 4); pip.ghost = true;
    AU.caw(0.3);
    await RM.say('Pip', '"<b>GET OFF!</b>" <i>Pip shoves you and bolts down the alley, crying, hand on their neck.</i>');
    for (let i = 0; i < 40; i++) { pip.update(0.05); await RM.sleep(0.02); }
    await RM.say('Corvin', '"Barely a sip. You\'re still starving, and now there\'s a child running around town telling everyone about the pale thing in the alley. Marvellous."');
    s.dread += 1;
  }
  RM.camMode = 'player';
  done('ok');
});

// Taking Pip's bread: human food makes vampires horribly sick. Follow Pip to their hideout.
RM.SCENES.bread = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('twilight'); spawnTownRavens(w);
  const Pn = w.data.P;
  RM.placePlayer(15.6, 0.2, -Math.PI / 2);
  const pip = RM.npc(RM.LOOKS.pip, 16.8, 0.3, -Math.PI / 2, { scale: 0.72, headScale: 1.18, heartLabel: 'Pip' });
  RM.camMode = 'player'; applyLook();
  RM.hands.play('reach'); AU.gulp(0.4); await RM.sleep(0.5); AU.gulp(0.4);
  RM.hands.anim = null;
  await RM.say('You', '<i>You chew. You swallow. For a second it tastes like being alive.</i>');
  AU.sweep(0.5); RM.flash('rgba(90,120,40,0.4)', 1200);
  await RM.say('You', '<i>Then your stomach turns completely inside out.</i>');
  await RM.say('Pip', '"Whoa. Whoa! Okay, you\'re going green. Come on, my hideout\'s just here. Follow me!"');
  RM.control = true; RM.lockPointer();
  RM.setObjective('Follow Pip (you feel <b>awful</b>)');
  P.speedMul = 0.7; RM.canSprint = false;
  pip.goTo(Pn.shed.x - 0.8, 0.2, 1.3);
  RM.setMarker(Pn.shed.x - 0.8, 0);
  let drift = 0, heaves = 0;
  RM.sceneTick = async (dt) => {
    pip.update(dt);
    const t = RM.t;
    P.roll = Math.sin(t * 1.3) * 0.12; RM.fovExtra = Math.sin(t * 0.8) * 6;
    RM.canvasFilter(`blur(${1.2 + Math.sin(t * 1.7) * 1}px) hue-rotate(${Math.sin(t * 0.5) * 25}deg) saturate(1.3)`);
    drift += dt; P.yaw += Math.sin(t * 0.7) * dt * 0.25;
    if (drift > 4) { drift = 0; heaves++; AU.gulp(0.6); RM.shake(0.03, 0.4); RM.caption(RM.pick(['<i>Urrgh.</i>', '<i>The street tilts like a ship.</i>', '<i>Never. Eating. Bread. Again.</i>']), 2); }
    if (RM.dist(P.x, P.z, Pn.shed.x - 0.8, 0) < 2.2 && RM.control) {
      RM.control = false; RM.canvasFilter(''); P.roll = 0; RM.fovExtra = 0; RM.setMarker(null);
      pip.face(P.x, P.z);
      await RM.say('Pip', '"Here. Sit. I nicked this from the butcher\'s bin. It\'s <i>pig\'s blood</i>. For black pudding. I dunno, I just thought... you look like you need it more than the pudding does."');
      AU.gulp(0.5); await RM.sleep(0.4); AU.gulp(0.5);
      const s = S(); s.thirst = Math.max(0, s.thirst - 50); s.humanity += 8; s.bonds.pip += 3; s.flags.breadEaten = true;
      RM.toast('🙂 Pip: <b>Friend</b>');
      await RM.say('Pip', '"Everyone\'s scared of the Sleeper. Posters and everything. But you just looked lost." <i>Pip shrugs.</i> "I know what lost looks like."');
      done('ok');
    }
  };
});

// Not biting Pip: hunt in the market instead. Stealth; choose your target.
RM.SCENES.market = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); spawnTownRavens(w); posters(w);
  const Pn = w.data.P;
  RM.placePlayer(0, -18, 0);
  S().flags.bloodSight = true; RM.bloodSightAllowed = true;
  AU.choirLevel = 0.06;
  // the Lantern Guard patrols
  const guards = [];
  const routes = [[[-14, -26], [-14, -50], [14, -50], [14, -26]], [[8, -40], [-6, -40], [-6, -26], [8, -26]]];
  routes.forEach((rt, i) => { const g = watcher(RM.npc(RM.LOOKS.guard(), rt[0][0], rt[0][1], 0, { lantern: 1.5, heartLabel: 'Lantern Guard' }), { range: 12, cone: 0.6 }); g.route = rt; g.ri = 1; g.wait = i * 1.5; guards.push(g); });
  // targets
  const thief = RM.npc(RM.LOOKS.thief, Pn.thief.x, Pn.thief.z, 0, { heartLabel: 'Thief' }); thief.fig.setPose('kneel'); thief.fig.group.userData.baseY = 0.4;
  const old = RM.npc(RM.LOOKS.oldwoman, Pn.thief.x, Pn.thief.z - 1.2, 0, { heartLabel: 'Old woman' }); old.fig.setPose('lie');
  const watch = watcher(RM.npc(RM.LOOKS.watchman, Pn.well.x + 1.9, Pn.well.z - 0.3, 0.2, { lantern: 1.2, heartLabel: 'Watchman' }), { range: 8, cone: 0.7 });
  const baker = RM.npc(RM.LOOKS.baker, Pn.bakery.x + 0.6, Pn.bakery.z + 0.2, -Math.PI / 2, { heartLabel: 'Baker' });
  const allWatch = [...guards, watch];
  detectHook(allWatch);
  RM.control = true; RM.lockPointer();
  corvin.place(-4, 7.4, -22.3);
  RM.setObjective('Feed on someone in the market. <b>Sneak up from behind</b> and press E.<br><span class="dim">Hold <b>R</b> for Blood Sight · <b>C</b> to crouch · walk back south to leave</span>');
  await RM.say('Corvin', '"The market. Plenty of necks. Mind the Lantern Guard: they\'re Vane\'s, and their lamps sting. Hold <b>R</b> and <i>listen</i> for heartbeats."');
  RM.control = true;
  const target = (n, id, label) => RM.addInteract({ x: () => n.x, z: () => n.z, r: 1.7, label, when: () => n.alive && behind(n), use: () => feed(n, id) });
  const behind = (n) => { if (id(n) === 'thief' || id(n) === 'watch') { const f = { x: -Math.sin(n.yaw), z: -Math.cos(n.yaw) }; const dx = P.x - n.x, dz = P.z - n.z; return (f.x * dx + f.z * dz) / (Math.hypot(dx, dz) || 1) < 0.1; } return true; };
  const id = (n) => (n === thief ? 'thief' : n === watch ? 'watch' : 'baker');
  target(thief, 'thief', 'Feed on the thief'); target(watch, 'watch', 'Feed on the watchman'); target(baker, 'baker', 'Feed on the baker');
  let busy = false, asked = false;
  async function feed(n, who) {
    busy = true; RM.control = false;
    RM.hands.play('pounce'); AU.whoosh(0.5); await RM.sleep(0.3);
    n.target = null; n.face(P.x, P.z); n.fig.setPose('cower');
    RM.flash('rgba(140,0,10,0.8)', 1100); AU.hit(0.6); AU.drinkN.set(0.25);
    await RM.sleep(1.6); AU.drinkN.set(0);
    const s = S(); s.bites++; s.thirst = Math.max(0, s.thirst - 60);
    if (who === 'thief') {
      await RM.say('Thief', '"Please! Please, I only took her purse, I swear, I\'ll give it back—"');
      const c = await RM.choose({ q: 'The thief is in your grip.', options: [
        { id: 'kill', icon: '🗡', label: 'Kill him', sub: 'He robs sleeping old women.' },
        { id: 'sip', icon: '🦷', label: 'Drink a little, let him go', sub: 'He\'ll talk. Everyone will hear.' },
        { id: 'servant', icon: '⛓', label: 'Make him your servant', sub: 'Useful. For now.' },
      ] });
      s.choices.thief = c;
      RM.control = true; RM.hands.visible = true;
      if (c === 'kill') { RM.setObjective('Hold <b>E</b>. Don\'t stop.'); await holdAction({ label: 'DRINKING', secs: 3.5 }); }
      else if (c === 'sip') { RM.setObjective('Hold <b>E</b> to drink, and <b>let go early</b>'); RM.$('meterWrap').classList.add('early'); await holdAction({ label: 'JUST A LITTLE', secs: 4, mode: 'stop' }); RM.$('meterWrap').classList.remove('early'); }
      else { RM.setObjective('Hold <b>E</b> and stare into his eyes'); await holdAction({ label: 'ENTHRAL', secs: 3, mode: 'look', look: vec(n.x, 1.3, n.z), sound: 'whisper' }); AU.sweep(0.4); }
      RM.control = false; RM.setObjective('');
      if (c === 'kill') { s.humanity -= 15; s.kills++; s.thirst = 0; n.fig.setPose('lie'); n.alive = false; n.col.off = true; old.fig.setPose('cower'); AU.sting(0.4); await RM.say('Old woman', '<i>The old woman is awake. She saw everything. She doesn\'t make a sound. She just stares at you.</i>'); s.dread += 1; }
      else if (c === 'sip') { s.dread += 2; n.fig.setPose('stand'); n.goTo(0, -10, 5); n.ghost = true; await RM.say('Thief', '"<b>MONSTER! THE SLEEPER! IT\'S IN THE MARKET!</b>"'); }
      else { s.humanity -= 8; s.flags.servant = true; n.fig.setPose('stand'); await RM.say('Thief', '<i>His eyes go dull.</i> "...Yes. Yes, master. Whatever you need." <i>He hands the old woman\'s purse back to her without being asked.</i>'); }
    } else if (who === 'watch') {
      s.humanity -= 8; s.dread += 1; n.fig.setPose('lie'); if (n.light) n.light.intensity = 0.3;
      await RM.say('You', '<i>The watchman slumps against the well, pale and snoring. He\'ll live. He\'ll also be missed at roll call.</i>');
    } else {
      s.humanity -= 12; s.flags.bakerBitten = true; n.fig.setPose('lie');
      await RM.say('Baker', '<i>She only came out to sweep her step. She drops the broom. Flour on her hands, and now, blood.</i>');
      await RM.say('Corvin', '"The <i>baker</i>? Of everyone? She gives the orphans the burnt loaves for free, you know."');
    }
    done('fed:' + who);
  }
  RM.sceneTick = async (dt) => {
    for (const g of guards) {
      g.update(dt);
      if (!g.target) { g.wait -= dt; if (g.wait < 0) { const p = g.route[g.ri]; g.goTo(p[0], p[1], 1.3); g.ri = (g.ri + 1) % g.route.length; g.wait = rand(1, 2.5); } }
    }
    watch.update(dt); watch.yaw = 0.2 + Math.sin(RM.t * 0.3) * 1.2;
    thief.update(dt); old.update(dt); baker.update(dt);
    baker.yaw = -Math.PI / 2 + Math.sin(RM.t * 0.5) * 0.8; // sweeping, looking about
    if (busy) return;
    let maxD = 0;
    for (const g of allWatch) { const v = g.sees(); g.detect = clamp(g.detect + (v > 0 ? v * dt * 1.1 : -dt * 0.5), 0, 1); maxD = Math.max(maxD, g.detect); if (v > 0 && Math.random() < dt) AU.whisper(0.1); }
    RM.bar('meter', maxD > 0.02 ? maxD * 100 : null, 'SEEN');
    if (maxD >= 1) { busy = true; RM.control = false; AU.sting(0.7); RM.flash('rgba(255,200,120,0.6)', 600); RM.toast('<b>SPOTTED!</b>', 2); await RM.sleep(1.2); done('spotted'); return; }
    if (P.z > -13 && !asked) {
      asked = true; RM.control = false;
      const c = await RM.choose({ q: 'Leave the market without feeding?', options: [
        { id: 'stay', icon: '🦇', label: 'Go back', sub: 'You need blood.' },
        { id: 'leave', icon: '🚪', label: 'Leave. Never.', sub: 'You won\'t hurt anyone. Not tonight.' },
      ] });
      if (c === 'leave') { done('refused'); return; }
      P.z = -15; P.yaw = 0; RM.control = true; RM.after(3, () => { asked = false; });
    }
  };
});

// Pip shows up after your hunt
RM.SCENES.pipAfter = (fed) => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); void w;
  RM.placePlayer(0, -16, Math.PI);
  const pip = RM.npc(RM.LOOKS.pip, 0, -10, Math.PI, { scale: 0.72, headScale: 1.18 });
  pip.face(P.x, P.z);
  RM.control = false;
  const s = S();
  if (s.choices.thief === 'kill') {
    await RM.say('Pip', '<i>Pip is standing at the end of the street, bread still in hand. They saw. You can tell from their face that they saw everything.</i>');
    await RM.say('Pip', '"...They said you were a monster. I told them they were wrong."');
    pip.goTo(0, 8, 4); pip.ghost = true;
    for (let i = 0; i < 40; i++) { pip.update(0.05); await RM.sleep(0.02); }
    s.bonds.pip -= 3; s.flags.pipFled = true;
    await RM.say('Corvin', '"Well. That\'s one fewer friend than we had this morning."');
    done('fled'); return;
  }
  await RM.say('Pip', '"I followed you. Sorry. I\'m good at following." <i>Pip looks at your mouth, then very carefully doesn\'t.</i>');
  if (fed && fed.startsWith('fed')) await RM.say('Pip', '"You didn\'t kill them. I saw. You <i>could</i> have, but you didn\'t."');
  else await RM.say('Pip', '"You went all that way and didn\'t eat anybody. That\'s either really brave or really stupid."');
  s.bonds.pip += 1;
  done('ok');
});
// Pip wants to come with you
RM.SCENES.pipFriend = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv('night'); spawnTownRavens(w);
  RM.placePlayer(0, 6, Math.PI);
  const pip = RM.npc(RM.LOOKS.pip, 0.8, 7.4, 0, { scale: 0.72, headScale: 1.18 }); pip.face(P.x, P.z);
  await RM.say('Pip', '"Can I come with you? I know every rooftop in Ravenmoor. And I don\'t have anywhere, really. Please?"');
  const c = await RM.choose({ q: 'Pip wants to come with you.', options: [
    { id: 'friend', icon: '🤝', label: 'Let Pip be your friend', sub: 'Pip will be in danger. Always.' },
    { id: 'home', icon: '🚪', label: 'Send Pip home', sub: 'Pip will be safe. And sad.' },
  ] });
  const s = S(); s.choices.pipFriend = c;
  const Pn = RM.worlds.town.data.P;
  RM.control = true; RM.lockPointer();
  if (c === 'friend') {
    s.bonds.pip += 2; s.humanity += 3; s.flags.pipFriend = true; RM.toast('🖤 Pip: <b>Friend</b>');
    await RM.say('Pip', '"YES. Okay. Rules: no biting me. Now come on, I\'ll show you my secret spot. Keep up!"');
    // play it: follow Pip through the streets to the graveyard wall
    RM.setObjective('Follow <b>Pip</b> to their secret spot');
    const route = [[0, 14], [0, 29], [0.5, 32.5], [12, 32.2], [15, 31.4]];
    let ri = 0; pip.goTo(route[0][0], route[0][1], 3); pip.ghost = true;
    await new Promise((res) => {
      RM.sceneTick = (dt) => {
        pip.update(dt);
        const far = RM.dist(P.x, P.z, pip.x, pip.z) > 7;
        if (!pip.target) { if (far) { pip.face(P.x, P.z); if (Math.random() < dt * 0.5) RM.caption('Pip: <i>"Come ON, slowcoach!"</i>', 2); } else if (ri < route.length - 1) { ri++; pip.goTo(route[ri][0], route[ri][1], 3); } else { RM.sceneTick = null; res(); } }
      };
    });
    RM.setMarker(15, 31.4);
    const wv = wisp(15, 1.1, 31.4, 0xfff0c0);
    await new Promise((res) => { RM.addInteract({ x: 15, z: 31.4, r: 2.2, label: 'Look where Pip is pointing', use: (o) => { o.off = true; RM.actors.remove(wv); res(); } }); RM.sceneTick = (dt) => pip.update(dt); });
    RM.setMarker(null); RM.control = false;
    await RM.say('Pip', '"There\'s a name scratched in the wall here. Really old. Someone did it with a nail." <i>Pip squints.</i> "...It\'s <b>your</b> name."');
    await RM.memoryFlash('THE WALL', ['You, small, with a stolen nail, scratching your name into the graveyard wall while your friend kept watch.', '<i>"So the ravens know where to find us,"</i> you told them. <i>"Even if we get lost."</i>', 'You can\'t remember your friend\'s face. Only that they had freckles, like Pip.']);
  } else {
    s.bonds.pip -= 1; s.humanity += 2;
    await RM.say('Pip', '"...Fine." <i>Pip scuffs a shoe on the cobbles.</i> "You\'re not the boss of me, you know. You can at least walk me back. It\'s <i>dark</i>."');
    // play it: walk Pip home safely
    RM.setObjective('Walk <b>Pip</b> home. Stay close.');
    const door = [-3.6, 20];
    pip.goTo(door[0], door[1], 1.6); pip.ghost = true;
    await new Promise((res) => {
      RM.sceneTick = (dt) => {
        const far = RM.dist(P.x, P.z, pip.x, pip.z) > 5;
        if (far && pip.target) { pip.target = null; pip.face(P.x, P.z); RM.caption('Pip: <i>"...Are you still there?"</i>', 2); }
        if (!far && !pip.target && RM.dist(pip.x, pip.z, door[0], door[1]) > 0.5) pip.goTo(door[0], door[1], 1.6);
        pip.update(dt);
        if (RM.dist(pip.x, pip.z, door[0], door[1]) < 0.6) { RM.sceneTick = null; res(); }
      };
    });
    RM.control = false;
    await RM.say('Pip', '"This is it. Well, it\'s the doorstep of it. Nobody minds." <i>Pip curls up in the doorway.</i> "Night, Sleeper."');
    void Pn;
  }
  done(c);
});

// Dawn is coming: go to bed (a dream) or keep exploring (race the sunrise)
RM.SCENES.dawnChoice = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); RM.setEnv(RM.blendEnv('night', 'dawn', 0.12)); void w;
  RM.camMode = 'free'; const cam = RM.camera;
  cam.position.set(6, 12, 8); cam.lookAt(-32, 26, 33);
  await RM.say('Corvin', '"See that grey over the rooftops? That\'s the sun, thinking about it. It never comes up all the way over Ravenmoor. But enough of it does."');
  await RM.say('Corvin', '"Back to the crypt and sleep, and you\'ll dream. Or stay out and poke about. I hear there\'s an iron door under Vane\'s hill that nobody\'s supposed to know about."');
  const c = await RM.choose({ q: 'Dawn is coming.', options: [
    { id: 'bed', icon: '💤', label: 'Go to bed', sub: 'Sleep in your coffin. Dream.' },
    { id: 'explore', icon: '🧭', label: 'Keep exploring', sub: 'Find Vane\'s door. Race the sunrise.' },
  ] });
  S().choices.dawn = c;
  RM.camMode = 'player';
  done(c);
});

// The dream: bright, warm, 40 years ago. You're human. (Unless the thirst turns it into a nightmare.)
RM.SCENES.dream = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); const s = S();
  s.dreaming = true; applyLook();
  RM.setEnv('day');
  const Pn = w.data.P;
  RM.placePlayer(-1.8, 17, -Math.PI / 2);
  AU.setHeart(0, 0); AU.setMusic('dream', 0.35);
  // the town, alive in the daytime
  const folk = [];
  for (let i = 0; i < 9; i++) {
    const look = RM.randomLook(); look.outfit = RM.pick(['coat', 'farm', 'gown', 'suit']); look.extras = [];
    const z = rand(-40, 26), x = z < -22 ? rand(-15, 15) : rand(-2.5, 2.5);
    const n = RM.npc(look, x, z, rand(TAU), { heart: false }); n.wander = true; folk.push(n);
  }
  const mother = RM.npc(RM.LOOKS.mother, 3.2, 12.8, Math.PI / 2, { heart: false });
  const painter = RM.npc({ ...RM.LOOKS.thief, name: 'Painter', outfit: 'suit', outfitColor: '#2b2b30', hair: 'short', hairColor: '#aab4c4' }, Pn.stallA.x + 2.2, Pn.stallA.z - 1.5, 0, { heart: false });
  const easel = new THREE.Group(); easel.position.set(Pn.stallA.x + 2.2, 0, Pn.stallA.z - 2.4); RM.actors.add(easel);
  for (const s2 of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.8, 0.05), RM.MAT.wood); l.position.set(s2 * 0.3, 0.9, 0); l.rotation.z = s2 * 0.12; easel.add(l); }
  const canvasM = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(portraitCanvas(s.look)) })); canvasM.position.set(0, 1.35, -0.04); canvasM.rotation.y = Math.PI; easel.add(canvasM);
  RM.control = true; RM.lockPointer();
  RM.setObjective('Explore your memories: <b>0 / 3</b>');
  RM.caption('Sunlight. You\'d forgotten what it feels like. You are yourself again, 40 years ago.', 5);
  let got = 0, night = s.thirst >= 55, nightT = 0, jump = false;
  const wisps = [];
  const memo = (x, z, title, lines, after) => {
    const wv = wisp(x, 1.3, z, 0xfff0c0); wisps.push(wv);
    RM.addInteract({ x, z, r: 1.8, label: 'Remember', use: async (o) => {
      o.off = true; RM.actors.remove(wv); RM.control = false;
      await RM.memoryFlash(title, lines);
      got++; RM.setObjective('Explore your memories: <b>' + got + ' / 3</b>');
      if (after) await after();
      RM.control = true;
      if (got >= 3) finish();
    } });
  };
  memo(3.4, 12.8, 'MOTHER', ['Your mother, flour to her elbows, pretending to be cross about muddy boots.', '<i>"{name}, if you\'re going to be out past dark, you take your scarf. The ravens can\'t keep you warm."</i>', 'She\'s wearing a raven pendant. You made it for her.'],
    async () => { if (night && !nightT) nightT = 0.001; });
  memo(Pn.well.x + 1.5, Pn.well.z + 1.5, 'THE WELL', ['A ribbon tied to the well rope: the one you\'d lost.', 'Beside it, a notice nailed to the post: <b>BY ORDER OF MAGISTRATE VANE: ALL PORTRAITS TO BE TAKEN AT THE MANOR.</b>', 'Nobody who went up the hill to be painted ever came back down.']);
  memo(Pn.stallA.x + 2.2, Pn.stallA.z - 3.2, 'THE PAINTER', ['The Magistrate\'s painter, at his easel. He\'s been painting you from memory.', 'It\'s good. It\'s <i>exactly</i> you.', '<i>"The Magistrate collects faces,"</i> he whispers. <i>"He keeps them. Run, child. Run and don\'t come back."</i>']);
  function finish() {
    RM.control = false;
    RM.after(1.5, async () => { await RM.fade(1, 1.5); s.dreaming = false; AU.setMusic(null); RM.canvasFilter(''); done('ok'); });
  }
  RM.sceneTick = async (dt) => {
    for (const n of folk) {
      if (nightT > 0.3) { n.target = null; n.face(P.x, P.z); n.update(dt); continue; }
      if (!n.target) { const z = rand(-40, 26), x = z < -22 ? rand(-15, 15) : rand(-2.8, 2.8); n.goTo(x, z, rand(0.9, 1.4)); }
      n.update(dt);
    }
    mother.update(dt); painter.update(dt);
    // 😱 the dream goes wrong if you went to sleep too thirsty
    if (nightT > 0) {
      nightT += dt;
      const k = clamp(nightT / 18, 0, 1);
      RM.setEnv(RM.blendEnv('day', 'nightmare', k));
      RM.canvasFilter(`contrast(${1 + k * 0.3}) saturate(${1 + k * 0.5})`);
      if (nightT > 4 && !folk.faceless) { folk.faceless = true; for (const n of folk) { const v = RM.buildFigure(n.look, { faceless: true }); RM.actors.remove(n.fig.group); n.fig = v; RM.actors.add(v.group); } RM.caption('Everyone stops. Everyone turns to look at you. Nobody has a face any more.', 4); AU.sting(0.4); AU.setMusic(null); }
      if (nightT > 9 && nightT < 9.1) { AU.whisper(0.5); RM.caption('<i>"{name}... supper..."</i> Your mother\'s voice. From the <b>wrong</b> direction.'.replace('{name}', s.look.name), 4); mother.remove(); }
      if (nightT > 15 && !jump) {
        jump = true; RM.control = false;
        const f = RM.forward();
        const face = RM.npc(RM.LOOKS.mother, P.x + f.x * 0.9, P.z + f.z * 0.9, 0, { heart: false, vamp: { faceless: true } }); face.face(P.x, P.z); face.ghost = true;
        AU.sting(1); RM.shake(0.08, 0.6); RM.flash('rgba(255,0,0,0.5)', 300);
        await RM.sleep(0.9);
        RM.$('fade').style.transition = 'none'; RM.$('fade').style.opacity = 1;
        AU.thud(1);
        await RM.sleep(1.2);
        s.dreaming = false; s.flags.nightmare = true; AU.setMusic(null); RM.canvasFilter('');
        done('nightmare');
      }
    }
  };
});
function portraitCanvas(look) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 200; const g = c.getContext('2d');
  g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 160, 200); g.fillStyle = '#6a5030'; g.fillRect(8, 8, 144, 184);
  g.fillStyle = look.outfitColor; g.beginPath(); g.ellipse(80, 190, 60, 50, 0, 0, TAU); g.fill();
  g.fillStyle = look.skin; g.beginPath(); g.ellipse(80, 90, 34, 42, 0, 0, TAU); g.fill();
  g.fillStyle = look.hairColor; g.beginPath(); g.ellipse(80, 64, 38, 26, 0, Math.PI, TAU); g.fill();
  if (['long', 'braids', 'locs', 'curly'].includes(look.hair)) { g.fillRect(44, 64, 12, 70); g.fillRect(104, 64, 12, 70); }
  g.fillStyle = look.eyes; g.beginPath(); g.arc(68, 90, 4, 0, TAU); g.arc(92, 90, 4, 0, TAU); g.fill();
  g.strokeStyle = '#7a3a3a'; g.lineWidth = 2; g.beginPath(); g.arc(80, 108, 9, 0.2, Math.PI - 0.2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; void t;
  return c;
}
RM.portraitCanvas = portraitCanvas;

// Racing the sunrise to Vane's iron door. Stay in the shadows.
RM.SCENES.sunrise = () => RM.play(async (done) => {
  const w = RM.useWorld('town'); spawnTownRavens(w);
  const Pn = w.data.P;
  RM.placePlayer(5.5, 0, Math.PI / 2);
  RM.setEnv(RM.blendEnv('night', 'dawn', 0.2));
  RM.control = true; RM.lockPointer();
  RM.setObjective('Reach the <b>iron door</b> under Vane\'s hill before the sun does.<br><span class="dim">Stay in the shadows. Sunlight burns.</span>');
  RM.setMarker(Pn.secretDoor.x, Pn.secretDoor.z + 0.8);
  corvin.near(3);
  let t = 0, burn = 0, peak = 0, smokeT = 0;
  const smoke = [];
  const sunDir = new THREE.Vector3();
  RM.bar('burn', 0, 'SUNLIGHT');
  const inSun = (x, z, elev) => {
    // shadows are longer when the sun is low; houses are about 7m tall
    const len = Math.min(60, 7 / Math.max(0.05, elev));
    const dx = sunDir.x, dz = sunDir.z, l = Math.hypot(dx, dz);
    return RM.clearLine(x, z, x + (dx / l) * len, z + (dz / l) * len);
  };
  RM.addInteract({ x: Pn.secretDoor.x, z: Pn.secretDoor.z + 0.8, r: 2, label: 'Slip through the iron door', use: (o) => { o.off = true; S().flags.secretDoor = true; if (peak > 45) S().flags.burns = true; done('door'); } });
  RM.sceneTick = (dt) => {
    t += dt;
    const k = clamp(0.2 + t / 95, 0, 1);
    const e = RM.blendEnv('night', 'dawn', k);
    const elev = lerp(0.1, 0.62, clamp((t - 8) / 90, 0, 1));
    e.dir = [0.35, elev, -1]; RM.setEnv(e);
    sunDir.set(0.35, elev, -1);
    const strength = clamp((t - 10) / 20, 0, 1);
    // once the day is fully up, even the shade isn't safe for long
    const lit = strength > 0 && (inSun(P.x, P.z, elev) || t > 110);
    if (t > 60 && t < 60.1) RM.caption('Corvin: <i>"Faster! The shadows are shrinking!"</i>', 3);
    if (t > 110 && t < 110.1) RM.caption('<b>The whole sky is white now.</b> Nowhere is safe. RUN.', 4);
    if (lit) { burn += dt * (t > 110 && !inSun(P.x, P.z, elev) ? 9 : (22 + elev * 45) * strength); if (AU.ctx) AU.sizzleN.set(0.12 + burn / 400, 0.1); RM.hands.play('shake'); }
    else { burn = Math.max(0, burn - dt * 12); if (AU.ctx) AU.sizzleN.set(0, 0.2); if (RM.hands.anim === 'shake') RM.hands.anim = null; }
    peak = Math.max(peak, burn);
    RM.bar('burn', burn, lit ? 'SUNLIGHT! GET TO THE SHADE' : 'SUNLIGHT');
    RM.canvasFilter(lit ? `brightness(${1 + burn / 250}) sepia(${burn / 250})` : '');
    smokeT -= dt;
    if (lit && smokeT < 0) {
      smokeT = 0.08;
      const f = RM.forward(); const sp = RM.glow(P.x + f.x * 0.5 + rand(-0.3, 0.3), P.eye - 0.5, P.z + f.z * 0.5 + rand(-0.3, 0.3), 0x999999, 0.4, 0.4, RM.actors);
      sp.material.blending = THREE.NormalBlending; smoke.push({ sp, life: 0 });
    }
    for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.life += dt; s.sp.position.y += dt * 0.8; s.sp.scale.setScalar(0.4 + s.life); s.sp.material.opacity = 0.4 * (1 - s.life / 1.5); if (s.life > 1.5) { RM.actors.remove(s.sp); smoke.splice(i, 1); } }
    if (t > 12 && t < 12.1) RM.caption('Corvin: <i>"The light\'s coming down the streets. Hug the walls: the shadows are your friends!"</i>', 4);
    if (burn >= 100) { S().flags.burns = true; RM.control = false; AU.sizzleN.set(0.5, 0.05); AU.sting(0.8); RM.flash('rgba(255,240,200,1)', 3000); done('burned'); }
  };
});

/* ---------------------------------------------------------- ENDINGS */
// Buried Alive: Gideon remembered.
RM.SCENES.buried = () => RM.play(async (done) => {
  RM.useWorld('crypt'); RM.setEnv('crypt');
  RM.camMode = 'free'; RM.hands.visible = false;
  const cam = RM.camera; cam.position.set(0, 0.62, -28); cam.rotation.set(Math.PI / 2 - 0.02, Math.PI, 0);
  RM.worlds.crypt.data.coffinLid.rotation.z = 0;
  RM.$('fade').style.opacity = 0.9;
  await RM.say('You', '<i>You climb into your coffin as the grey light comes. The lid closes. Sleep takes you like water.</i>');
  await RM.sleep(1);
  AU.thud(0.6); await RM.sleep(0.6); AU.thud(0.6);
  RM.caption('<i>Tap. Tap. Tap.</i> Hammering.', 3); await RM.sleep(1.8); AU.thud(0.8); RM.shake(0.02, 0.4);
  await RM.say('Gideon', '"Thought you could scramble an old man\'s head and walk away, did you? My memory comes back at night. Like damp."');
  await RM.say('Gideon', '"Blessed iron nails. Six feet of Ravenmoor clay. Sleep well, Sleeper."');
  RM.caption('You scratch at the lid. <b>Scratch. Scratch.</b> It was you, all along, on the lid.', 5);
  for (let i = 0; i < 6; i++) { AU.scratch(0.6); await RM.sleep(0.9); }
  AU.dirt(0.8); await RM.sleep(0.8); AU.dirt(1); await RM.sleep(0.8); AU.dirt(1);
  await RM.fade(1, 2);
  done('ok');
});
})();
