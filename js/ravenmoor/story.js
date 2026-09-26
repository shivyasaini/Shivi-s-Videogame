/* =====================================================================
   RAVENMOOR — the story
   Your hidden stats, the dialogue box, the choice screen, the Thirst,
   and the order everything happens in. Written as plain async code so
   you can read it top to bottom like a script:
       await RM.say('Corvin', '...')
       const c = await RM.choose({ ... })
       await RM.SCENES.something()
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { $, clamp, lerp } = RM;
const AU = RM.AU, P = RM.player;

/* -------------------------------------------------------------- state */
function fresh(look) {
  return {
    look, night: 0, thirst: 45, humanity: 55, dread: 0, memories: 0, bites: 0, kills: 0, beast: 0,
    bonds: { corvin: 0, pip: 0, gideon: 0 }, flags: {}, choices: {}, path: [], dreaming: false,
  };
}
RM.S = null;
RM.vampState = () => {
  const s = RM.S;
  if (!s) return {};
  return {
    pale: s.dreaming ? 0 : clamp(0.32 + s.night * 0.16 + s.bites * 0.04, 0, 0.9),
    humanity: s.dreaming ? 100 : s.humanity,
    fangs: s.dreaming ? 0 : clamp(0.25 + s.bites * 0.3, 0, 1),
    wear: clamp(0.1 + s.night * 0.25 + (s.flags.fought ? 0.15 : 0), 0, 1),
    burns: !!s.flags.burns,
    blood: s.bites > 0 ? clamp(0.3 + s.bites * 0.2, 0, 1) : 0,
  };
};
// fill in {name}, {they}, {them}, {their}, {They}...
RM.fmt = (t) => {
  const s = RM.S; if (!s) return t;
  const pr = RM.pronouns(s.look), cap = (w) => w[0].toUpperCase() + w.slice(1);
  return t.replace(/\{name\}/g, s.look.name)
    .replace(/\{they\}/g, pr.they).replace(/\{them\}/g, pr.them).replace(/\{their\}/g, pr.their)
    .replace(/\{They\}/g, cap(pr.they)).replace(/\{Their\}/g, cap(pr.their));
};

/* ------------------------------------------------------------ dialogue */
const SPEAKER = { Tobias: '#d8b080', Imelda: '#ece4ff', Corvin: '#9fb4ff', Pip: '#f0a860', Gideon: '#d8c898', You: '#bdb6c8', '???': '#e02040', Thief: '#c89070', 'Old woman': '#c8b0c0', Baker: '#e0c090' };
let dlg = null;
RM.say = (speaker, text) => new Promise((resolve) => {
  const box = $('dialog'), wasC = RM.control;
  RM.control = false;
  $('dlgName').textContent = speaker === 'You' ? RM.S.look.name : speaker;
  $('dlgName').style.color = SPEAKER[speaker] || '#e0d0c0';
  const full = RM.fmt(text);
  box.classList.add('show');
  const body = $('dlgText');
  // typewriter: reveal the characters one at a time (tags appear whole)
  const parts = full.split(/(<[^>]+>)/);
  let shown = 0, total = full.replace(/<[^>]+>/g, '').length, done = false;
  const render = () => {
    let left = shown, out = '';
    for (const p of parts) { if (p.startsWith('<')) out += p; else { out += p.slice(0, Math.max(0, left)); left -= p.length; } }
    body.innerHTML = out;
  };
  const iv = setInterval(() => { shown += 2; if (shown >= total) { shown = total; done = true; clearInterval(iv); } render(); if (speaker === 'Corvin' && shown % 12 === 0) AU.tone(1200 + Math.random() * 300, 0.03, 'triangle', 0.02, 0, 900, 0); }, 22);
  render();
  if (speaker === 'Corvin' && Math.random() < 0.3) AU.caw(0.15);
  dlg = {
    advance() {
      if (!done) { shown = total; done = true; clearInterval(iv); render(); return; }
      box.classList.remove('show'); dlg = null; RM.control = wasC; resolve();
    },
  };
});
document.addEventListener('mousedown', (e) => { RM.mouseHeld = true; if (dlg && !e.target.closest('button')) dlg.advance(); });
document.addEventListener('mouseup', () => { RM.mouseHeld = false; });

/* -------------------------------------------------------- the choices */
let choiceOpen = null;
RM.choose = ({ q, options, timed = 0, def }) => new Promise((resolve) => {
  const s = RM.S, wasC = RM.control;
  RM.control = false; RM.unlockPointer();
  const ov = $('choice'); $('choiceQ').innerHTML = RM.fmt(q);
  const cards = $('choiceCards'); cards.innerHTML = '';
  AU.boom(0.35); AU.setHeart(Math.max(AU.heart.bpm, 70), 0.5);
  // the Beast scratches out the gentlest option when you are too thirsty
  options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'ccard' + (o.lock ? ' locked' : '');
    b.innerHTML = `<div class="ci">${o.icon || ''}</div><div class="cl"><span class="ck">${i + 1}</span>${RM.fmt(o.label)}</div><div class="cs">${o.lock ? '<span class="bad">' + o.lock + '</span>' : RM.fmt(o.sub || '')}</div>`;
    if (!o.lock) b.onclick = () => pick(o.id);
    cards.appendChild(b);
    setTimeout(() => b.classList.add('in'), 90 * i + 60);
  });
  const bar = $('choiceTimer');
  let tLeft = timed, iv = null;
  bar.style.display = timed ? '' : 'none';
  if (timed) {
    $('choiceTimerFill').style.width = '100%';
    iv = setInterval(() => {
      tLeft -= 0.1; $('choiceTimerFill').style.width = (tLeft / timed) * 100 + '%';
      if (Math.floor(tLeft * 10) % 10 === 0) AU.tone(880, 0.05, 'square', 0.03, 0, 880, 0);
      if (tLeft <= 0) { clearInterval(iv); RM.flash('rgba(190,0,20,0.8)', 900); RM.toast('<b>THE THIRST CHOOSES FOR YOU</b>', 2.5); pick(def); }
    }, 100);
  }
  ov.classList.add('show');
  function pick(id) {
    if (!choiceOpen) return;
    choiceOpen = null; if (iv) clearInterval(iv);
    const o = options.find((x) => x.id === id);
    s.path.push({ q: RM.fmt(q), a: RM.fmt(o.label) });
    ov.classList.remove('show');
    AU.hit(0.3);
    RM.control = wasC;
    RM.lockPointer();
    setTimeout(() => resolve(id), 350);
  }
  choiceOpen = { pick, options };
});

/* ---------------------------------------------------------------- keys */
let paused = false, inGame = false;
RM.onKey = (e) => {
  if (dlg && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { dlg.advance(); return; }
  if (choiceOpen) { const n = parseInt(e.key, 10); const o = choiceOpen.options[n - 1]; if (o && !o.lock) choiceOpen.pick(o.id); return; }
  if ((e.code === 'KeyP' || e.code === 'Escape') && inGame && !$('endingOv').classList.contains('show')) { togglePause(); return; }
  if (e.code === 'KeyM') AU.toggleMute();
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') AU.setVolume(AU.vol - 0.1);
  if (e.code === 'Equal' || e.code === 'NumpadAdd') AU.setVolume(AU.vol + 0.1);
  if (e.code === 'KeyG') RM.setQuality(RM.quality === 'high' ? 'low' : 'high');
  if (!RM.control || paused) return;
  if (e.code === 'KeyE' && !e.repeat) { if (!RM.tryInteract() && RM.useKey) RM.useKey(); }
  if (e.code === 'Space' && RM.onDash) RM.onDash();
};
function togglePause(force) {
  paused = force !== undefined ? force : !paused;
  RM.paused = paused;
  $('pause').classList.toggle('show', paused);
  if (paused) { RM.unlockPointer(); $('pauseStats').innerHTML = RM.S ? `<div><span>🩸 Thirst</span><b>${Math.round(RM.S.thirst)}%</b></div><div><span>🤍 Humanity</span><b>${RM.S.humanity >= 50 ? 'Holding on' : RM.S.humanity >= 30 ? 'Slipping' : 'Fading'}</b></div><div><span>🧩 Memories</span><b>${RM.S.memories} / 7</b></div>` : ''; }
  else if (RM.control) RM.lockPointer();
}
RM.togglePause = togglePause;

/* ------------------------------------------------------------- Thirst */
let beastCd = 0, bs = 0;
RM.onTick((dt) => {
  const s = RM.S; if (!s || !inGame) return;
  const vial = $('thirstFill');
  if (s.dreaming) { $('thirstWrap').classList.remove('show'); AU.setHeart(0, 0); $('thirstVig').style.opacity = 0; RM.bloodSight = 0; return; }
  $('thirstWrap').classList.add('show');
  // Blood Sight (hold R): see heartbeats through walls. It makes you thirstier.
  const want = RM.control && RM.bloodSightAllowed && RM.keys.KeyR ? 1 : 0;
  bs = lerp(bs, want, 1 - Math.exp(-dt * 8)); RM.bloodSight = bs;
  $('bloodVig').style.opacity = bs;
  if (want && !RM._bsOn) { RM._bsOn = true; RM._prevFilter = RM.$('game').style.filter; RM.canvasFilter('grayscale(0.9) brightness(0.75) contrast(1.25)'); AU.sweep(0.2); }
  if (!want && RM._bsOn) { RM._bsOn = false; RM.canvasFilter(RM._prevFilter || ''); }
  if (RM.control && !RM.thirstPaused) {
    s.thirst += dt * (0.12 + (P.sprinting ? 0.45 : 0) + bs * 3);
  }
  s.thirst = clamp(s.thirst, 0, 100);
  vial.style.height = s.thirst + '%';
  $('thirstWrap').classList.toggle('high', s.thirst > 75);
  const th = s.thirst;
  $('thirstVig').style.opacity = th > 55 ? ((th - 55) / 45) * (0.55 + Math.sin(RM.t * 6) * 0.15) : 0;
  if (RM.control || RM.camMode === 'free') AU.setHeart(th > 50 ? 50 + th * 0.55 : 0, th > 50 ? (th - 50) / 60 : 0);
  // at 100, the Beast stirs
  beastCd -= dt;
  if (th >= 100 && beastCd <= 0 && RM.control) {
    beastCd = 14; s.beast++; s.humanity -= 2;
    RM.flash('rgba(200,0,0,0.9)', 1200); AU.sting(0.6); RM.shake(0.05, 0.6);
    RM.toast('<b>THE BEAST STIRS</b>', 2.5);
  }
});

/* ---------------------------------------------------------- checkpoints */
const snap = (s) => JSON.parse(JSON.stringify(s));
function saveCheckpoint(n) { RM.store.set('ckpt' + n, snap(RM.S)); }

/* ============================================================ THE STORY */
async function nightZero() {
  const s = RM.S; s.night = 0;
  await RM.card('NIGHT ZERO', 'THE CRYPT');
  await RM.SCENES.wake();
  await RM.say('Corvin', '"Now. You\'re thirsty. I can hear your stomach from here, and you haven\'t even got a working one."');
  await RM.say('Corvin', '"Options: there are <b>rats</b>, and there\'s that <b>red cup</b> on the altar that I would personally not trust. Or you can be noble and drink nothing, and see how that goes."');
  const d = await RM.choose({ q: 'You are so thirsty. What do you drink?', options: [
    { id: 'rats', icon: '🐀', label: 'The rats', sub: 'Disgusting. Warm. Available.' },
    { id: 'chalice', icon: '🍷', label: 'The red chalice', sub: 'Wine? Blood? Something worse?' },
    { id: 'nothing', icon: '❌', label: 'Nothing', sub: 'You are NOT drinking rats.' },
  ] });
  s.choices.drink = d;
  if (d === 'rats') await RM.SCENES.rats();
  else if (d === 'chalice') await RM.SCENES.chalice();
  else { s.flags.drankNothing = true; await RM.say('Corvin', '"Noble. Stupid, but noble. Walk to the gate, then. Try not to listen to the cup."'); await RM.SCENES.resist(); }
  RM.corvin.fly(1.6, 3.5, -1.2);
  await RM.say('Corvin', '"Two ways out. The <b>gate</b>: locked, but it\'s old iron and you\'re new and strong. Very loud, though. Or the <b>bone tunnels</b> through that hole in the wall. Quiet. Slow. Things down there."');
  const x = await RM.choose({ q: 'How do you get out?', options: [
    { id: 'gate', icon: '💥', label: 'Smash the gate', sub: 'A fight. Loud. The town will hear.' },
    { id: 'tunnels', icon: '🦴', label: 'Crawl through the bone tunnels', sub: 'Slow. Quiet. Secrets.' },
  ] });
  s.choices.exit = x;
  if (x === 'gate') {
    s.flags.fought = true;
    for (;;) {
      const r = await RM.SCENES.gate();
      if (r !== 'dead') break;
      await RM.fade(1, 0.6);
      await RM.say('Corvin', '"...And you\'re back in the coffin. Vampires are very hard to kill, you know. Luckily for you. Try again: <b>Space</b> dashes out of the way when they wind up."');
      RM.fade(0, 0.8);
    }
  } else await RM.SCENES.tunnels();
  await RM.fade(1, 0.8);
  RM.fade(0, 1.2);
  await RM.SCENES.graveyard(x === 'gate' ? 'mausoleum' : 'tunnels');
  await RM.fade(1, 1);
}

async function nightOne() {
  const s = RM.S; s.night = 1;
  RM.applyLook();
  RM.fade(0, 1);
  await RM.card('NIGHT ONE', 'THE TOWN AT TWILIGHT');
  await RM.SCENES.townWalk();
  const c = await RM.SCENES.pipMeet();
  let pipOk = false;
  if (c === 'bite') {
    await RM.SCENES.bitePip();
  } else if (c === 'bread') {
    await RM.SCENES.bread(); pipOk = true;
  } else {
    await RM.say('You', '"Get... away from me. <b>Run</b>."');
    await RM.say('Pip', '"...Okay. Okay! Geez." <i>Pip backs off, but doesn\'t go far.</i>');
    s.humanity += 6;
    await RM.fade(1, 0.8); RM.fade(0, 0.8);
    let fed;
    for (;;) {
      fed = await RM.SCENES.market();
      if (fed !== 'spotted') break;
      s.dread += 1;
      if (s.dread >= 4) { await RM.fade(1, 0.8); RM.fade(0, 1); return RM.showEnding('crowd'); }
      await RM.fade(1, 0.6);
      await RM.say('Corvin', s.dread >= 3
        ? '"You got away. <b>Just.</b> The whole town is out with lanterns now. If they catch you again, they won\'t just chase you off. Crouch. Use Blood Sight. <i>Please</i>."'
        : '"You got away, but they saw you. The Lantern Guard will talk. Crouch (C) and come at people from <b>behind</b>."');
      RM.fade(0, 0.8);
    }
    if (fed === 'refused') {
      if (s.flags.drankNothing) { await RM.fade(1, 1.2); RM.fade(0, 1); return RM.showEnding('starved'); }
      s.thirst = 96; s.humanity += 6;
      await RM.say('Corvin', '"You\'re going to regret that. Your stomach already does."');
    }
    const r = await RM.SCENES.pipAfter(fed);
    pipOk = r !== 'fled';
  }
  if (pipOk && !s.flags.pipDead) await RM.SCENES.pipFriend();
  const d = await RM.SCENES.dawnChoice();
  if (d === 'bed') {
    await RM.fade(1, 1);
    if (s.flags.gideonForgot) { RM.fade(0, 0.1); await RM.SCENES.buried(); return RM.showEnding('buried', { pose: 'lie' }); }
    RM.fade(0, 1.5);
    const r = await RM.SCENES.dream();
    RM.applyLook();
    await RM.fade(1, 0.5);
    if (r === 'nightmare') { RM.$('fade').style.opacity = 1; await RM.sleep(0.5); }
    return 'next';
  }
  const r = await RM.SCENES.sunrise();
  if (r === 'burned') { await RM.sleep(2.5); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('sunburnt', { pose: 'lie' }); }
  await RM.fade(1, 1); RM.fade(0, 1);
  return 'next';
}

/* --------------------------------------------------------------- title */
function showTitle() {
  inGame = false;
  const w = RM.useWorld('town'); RM.setEnv('night');
  RM.clearScene(); RM.spawnTownRavens(w); RM.addFlock(-32, 34, 33, 16, 10);
  RM.corvin.hide();
  RM.camMode = 'free'; RM.control = false;
  let a = 0;
  RM.sceneTick = (dt) => { a += dt * 0.03; RM.camera.position.set(Math.sin(a) * 26, 14 + Math.sin(a * 2) * 2, 34 + Math.cos(a) * 18); RM.camera.lookAt(-10, 12, 10); P.x = RM.camera.position.x; P.z = RM.camera.position.z; };
  $('title').classList.add('show');
  const c = RM.store.get('ckpt2', null) || RM.store.get('ckpt1', null);
  $('contBtn').style.display = c ? '' : 'none';
  $('contBtn').textContent = RM.store.get('ckpt2', null) ? 'CONTINUE FROM NIGHT TWO' : 'CONTINUE FROM NIGHT ONE';
  $('titleCount').textContent = `${RM.foundEndings().length} / ${RM.ENDINGS.length} endings found`;
  AU.setMusic('title', 0.5);
}
async function begin(fromCkpt) {
  AU.init();
  $('title').classList.remove('show');
  inGame = true;
  await RM.fade(1, 0.8);
  if (fromCkpt) {
    RM.S = snap(fromCkpt);
    RM.clearScene(); RM.hands.visible = true;
    RM.fade(0, 1);
    if (RM.S.night < 2) await nightOne();
    await RM.nightTwo();
    return;
  }
  AU.setMusic('title', 0.25);
  RM.clearScene(); RM.sceneTick = null;
  RM.$('fade').style.opacity = 0;
  const look = await RM.openCreator();
  AU.setMusic(null);
  RM.$('fade').style.opacity = 1;
  RM.S = fresh(look);
  const runs = RM.store.get('runs', 0) + 1; RM.store.set('runs', runs); RM.S.runs = runs;
  RM.worlds.crypt && RM.worlds.crypt.data.chaliceWine && (RM.worlds.crypt.data.chaliceWine.visible = true);
  await nightZero();
  saveCheckpoint(1);
  await nightOne();
  await RM.nightTwo();
}

/* ---------------------------------------------------------------- boot */
function wire() {
  $('startBtn').onclick = () => begin(null);
  $('contBtn').onclick = () => begin(RM.store.get('ckpt2', null) || RM.store.get('ckpt1', null));
  $('galBtn').onclick = () => RM.openGallery();
  $('galClose').onclick = () => $('gallery').classList.remove('show');
  $('resumeBtn').onclick = () => togglePause(false);
  $('quitBtn').onclick = () => location.reload();
  $('endAgain').onclick = () => location.reload();
  $('endRetry').onclick = () => { const c = RM.store.get('ckpt' + Math.max(1, Math.min(2, RM.S.night)), null) || RM.store.get('ckpt1', null); $('endingOv').classList.remove('show'); RM.fade(1, 0.01); begin(c); };
  $('endGallery').onclick = () => RM.openGallery();
  $('volSlider').value = AU.vol; $('volSlider').oninput = (e) => AU.setVolume(parseFloat(e.target.value));
  $('sensSlider').value = RM.store.get('sens', 1); $('sensSlider').oninput = (e) => RM.store.set('sens', parseFloat(e.target.value));
  $('qualBtn').onclick = () => { RM.setQuality(RM.quality === 'high' ? 'low' : 'high'); $('qualBtn').textContent = 'GRAPHICS: ' + RM.quality.toUpperCase(); };
  $('qualBtn').textContent = 'GRAPHICS: ' + RM.quality.toUpperCase();
  document.addEventListener('pointerlockchange', () => { if (!RM.locked && RM.control && inGame && !paused && !choiceOpen && !dlg) $('clickHint').classList.add('show'); else $('clickHint').classList.remove('show'); });
  $('clickHint').onclick = () => { $('clickHint').classList.remove('show'); RM.lockPointer(); };
  addEventListener('pointerdown', () => AU.init(), { once: true });
}
RM.boot = () => {
  RM.start();
  wire();
  showTitle();
  $('loading').classList.add('gone');
};
})();
