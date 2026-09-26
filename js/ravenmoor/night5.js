/* =====================================================================
   RAVENMOOR — NIGHT FIVE: THE LONGEST NIGHT
   Across the Drowned Chapel on narrow planks (vampires can't swim), to
   the ritual platform where Vane is finishing the curse. Then the last
   choice. Which choices you get, and what they lead to, depends on
   everything you've done.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { clamp, lerp, rand, TAU } = RM;
const P = RM.player, AU = RM.AU;
const S = () => RM.S;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const MIRELA_V = { pale: 0.75, fangs: 0.7, humanity: 40, wear: 0.6 };
const friendsCount = (s) => ['pip', 'gideon', 'tobias', 'imelda', 'corvin', 'mirela', 'rosalind'].filter((k) => (s.bonds[k] || 0) >= 2 && !s.flags[k + 'Dead'] && !(k === 'corvin' && s.flags.corvinGone)).length;

const N5 = (RM.N5 = {});

// The Drowned Chapel: running water holds vampires under. Stay on the planks.
N5.chapel = () => RM.play(async (done) => {
  const w = RM.useWorld('chapel'); RM.setEnv('chapel'); AU.setWind(0.02); RM.fade(0, 1);
  RM.placePlayer(0, 1.5, 0);
  const s = S();
  if (!s.flags.corvinGone) RM.corvin.place(1.5, 2, -1);
  RM.control = true; RM.lockPointer(); RM.canSprint = false;
  RM.setObjective('Cross the <b>Drowned Chapel</b> to the ritual. Stay on the planks.<br><span class="dim">Running water holds vampires under. Walk. Don\'t run.</span>');
  RM.setMarker(0, -58);
  AU.choirLevel = 0.05;
  let offT = 0, last = { x: 0, z: 1.5 }, said = 0;
  RM.sceneTick = async (dt) => {
    // the river pulls at you when you're off the planks, and gives you a moment to step back
    if (w.onWalk(P.x, P.z)) { offT = 0; last = { x: P.x, z: P.z }; RM.fovExtra = 0; }
    else {
      offT += dt; RM.fovExtra = -offT * 12; RM.shake(0.02, 0.1);
      if (offT > 0.05 && offT - dt <= 0.05) RM.caption('<b>The water grabs your ankle!</b> Step back!', 1.5);
      if (offT > 0.65) {
        RM.control = false; RM.sceneTick = null;
        AU.noise(1.2, 0.8, 'lowpass', 500, 1, 0, 0.6); RM.flash('rgba(10,30,50,0.95)', 3000);
        for (let i = 0; i < 30; i++) { P.eye = lerp(P.eye, -1.2, 0.15); await RM.sleep(0.03); }
        done('drowned'); return;
      }
    }
    if (P.z < -30 && said === 0) { said = 1; RM.caption('Something long and dark slides under the planks beneath you.', 3); AU.whisper(0.3); }
    if (P.z < -44 && said === 1) { said = 2; if (!s.flags.corvinGone) RM.caption('Corvin: <i>"Nearly there. Don\'t look down. I looked down. I regret it."</i>', 3); }
    if (P.z < -55.5) { RM.sceneTick = null; RM.control = false; done('ok'); }
  };
});

// The ritual, and the last choice
N5.finale = () => RM.play(async (done) => {
  const w = RM.useWorld('chapel'); RM.setEnv('chapel');
  const s = S(), f = s.flags;
  RM.placePlayer(0, -56.5, Math.PI - 0.05);
  const vane = RM.npc(RM.LOOKS.vane, 0.4, -64.2, 0, { vamp: { humanity: 45, pale: 0.3, wear: 0.6 }, heartLabel: 'Vane' }); vane.face(0, -62); vane.fig.setPose('arms');
  const cast = { vane };
  const add = (key, look, x, z, opts = {}) => { const n = RM.npc(look, x, z, 0, opts); n.face(P.x, P.z); n.ghost = true; cast[key] = n; return n; };
  if (f.rosalindAlly) add('rosalind', RM.LOOKS.rosalind, 4, -56.5);
  if (f.tobiasTurned) add('tobias', { ...RM.LOOKS.tobias, extras: ['hat'] }, -2.2, -56.2, { vamp: { humanity: 10, pale: 0.6 } });
  if (f.mirelaFree) add('mirela', { ...RM.LOOKS.mirela, outfitColor: '#6e0f1e' }, 2.4, -57.6, { vamp: MIRELA_V });
  if (!f.corvinGone) RM.corvin.place(-1.2, 2.2, -57.4);
  AU.choirLevel = 0.12; AU.setHeart(90, 0.5);
  RM.control = false;
  await RM.say('Vane', '"You <i>again</i>." <i>The Magistrate stands in a ring of red light, his arms raised, and above him hangs the curse itself: a heart of red glass, beating.</i>');
  await RM.say('Vane', '"Forty years of night. My grandfather\'s blood, poured into the sky. And tonight I make it <b>forever</b>. Unless, of course, you do something about it."');
  if (f.sleeperChain) { const bl = w.data.bigLid; bl.position.y = 1.45; await RM.say('You', '<i>Behind him, the huge chained coffin from under your crypt. They brought it here. One of its chains is already broken. <b>You</b> broke it. It\'s breathing.</i>'); }

  // some things are decided before you choose anything at all
  const pre = N5.override(s);
  if (pre) { done({ ending: pre.id, pre: true, line: pre.line, who: pre.who }); return; }

  const opts = [
    { id: 'break', icon: '☀️', label: 'Break the curse', sub: 'Smash the heart. The sun rises. And you are a vampire...' },
    { id: 'take', icon: '🩸', label: 'Take the curse into yourself', sub: 'The night, forever. Yours.' },
    { id: 'force', icon: '⛓', label: 'Force the curse back into Vane', sub: 'Let him hold what he made.' },
  ];
  if (f.pipBitten && !f.pipDead) opts.push({ id: 'pip', icon: '🧒', label: 'Give the curse to Pip', sub: 'Pip already has your bite. Pip would never grow old.' });
  opts.push({ id: 'bed', icon: '💤', label: 'Go to bed', sub: 'Lie down in the empty coffin by the water. Let the town decide.' });
  opts.push({ id: 'kill', icon: '🗡', label: 'Kill Vane before he finishes', sub: 'Then the curse has nowhere to go but...' });
  if (f.sleeperChain) opts.push({ id: 'chain', icon: '⛓', label: 'Break the last chain', sub: 'Let the first vampire out.' });
  if (friendsCount(s) >= 5) opts.push({ id: 'friends', icon: '🎉', label: 'Ask your friends what to do', sub: 'They\'re all here. Every one of them.' });
  if ((RM.S.runs || 1) >= 3) opts.push({ id: 'nothing', icon: '🔁', label: 'Choose nothing', sub: 'Corvin says you\'ve done this before.' });
  if (f.mirelaFree && (s.bonds.mirela || 0) >= 3) opts.push({ id: 'mirela', icon: '🦇', label: 'Let Mirela do it for you', sub: 'She knows old magic. She loves you. Doesn\'t she?' });
  if (f.rosalindAlly) opts.push({ id: 'ship', icon: '⛵', label: 'Take Rosalind\'s boat, and go', sub: 'Leave the town to its revolution.' });
  if ((s.bonds.gideon || 0) >= 4 && !f.gideonDead) opts.push({ id: 'gideon', icon: '⚰️', label: 'Fake your death with Gideon', sub: 'He brought a coffin. Of course he did.' });
  if (f.tobiasTurned && (s.bonds.tobias || 0) >= 3) opts.push({ id: 'hunters', icon: '🏹', label: 'Walk away with Tobias', sub: 'There are worse monsters than Vane out there.' });
  if (f.talkedReflection) opts.push({ id: 'mirror', icon: '🪞', label: 'Let your reflection finish it', sub: 'It\'s been following you in every puddle.' });
  opts.push({ id: 'finish', icon: '🔥', label: 'Let the ritual finish', sub: 'Stand back. Watch.' });
  const c = await RM.choose({ q: 'The Longest Night. The curse beats above the water. What do you do?', options: opts });
  s.choices.finale = c;
  done({ choice: c, cast });
});

// things that happen no matter what you choose
N5.override = (s) => {
  const f = s.flags;
  if (s.beast >= 3 || s.humanity <= 5) return { id: 'beast' };
  if (f.vaneBlood) return { id: f.chalice ? 'chains' : 'forgotten' };
  if (f.tobiasDead && s.humanity < 45) return { id: 'sister', who: 'agnes' };
  if (f.tobiasSpared && s.humanity < 30) return { id: 'bolt', who: 'tobias' };
  return null;
};

// play out the choice, then work out which ending it leads to
N5.play = (res) => RM.play(async (done) => {
  const w = RM.useWorld('chapel'); RM.setEnv('chapel');
  const s = S(), f = s.flags;
  RM.placePlayer(0, -56.5, Math.PI);
  const vane = RM.npc(RM.LOOKS.vane, 0.4, -64.2, 0, { vamp: { humanity: 45, pale: 0.3, wear: 0.6 } }); vane.face(0, -62); vane.fig.setPose('arms');
  const heart = w.data.heart;
  RM.control = true; RM.lockPointer();
  const goTo = (x, z, label) => new Promise((r) => { RM.setMarker(x, z); RM.addInteract({ x, z, r: 1.9, label, use: (o) => { o.off = true; RM.setMarker(null); r(); } }); });
  const holdAt = async (x, z, label, text, secs = 2.5) => { RM.setObjective(text); await goTo(x, z, label); await RM.holdAction({ label: label.toUpperCase(), secs, sound: 'none' }); };

  if (res.pre) {
    RM.control = false;
    if (res.ending === 'sister') {
      const ag = RM.npc(RM.LOOKS.agnes, -3, -55, 0); ag.face(P.x, P.z); ag.fig.setPose('raise');
      await RM.say('Agnes', '"Sleeper." <i>A woman on the planks behind you, braids and a crossbow.</i> "You drowned my brother Tobias in a river like a sack of kittens. I\'ve come a long way to say goodbye."');
    } else if (res.ending === 'bolt') {
      const tb = RM.npc(RM.LOOKS.tobias, -3, -55, 0); tb.face(P.x, P.z); tb.fig.setPose('raise');
      await RM.say('Tobias', '"I owed you my life. I know." <i>The crossbow comes up. His hands are shaking.</i> "But look at what you\'ve become. I\'m sorry. I\'m so sorry."');
    } else if (res.ending === 'beast') {
      await RM.say('You', '<i>You step towards the heart, and you don\'t get there. Something else steps instead. Something that uses your legs and doesn\'t remember your name.</i>');
    } else {
      await RM.say('Vane', '"Ah. You drank my family\'s blood." <i>He doesn\'t even look round.</i> "Then you\'re <i>mine</i>, and you have been since the cellar. <b>Kneel</b>."');
    }
    done(res.ending); return;
  }

  const c = res.choice;
  let ending = null;
  if (c === 'break' || c === 'force' || c === 'take') {
    await holdAt(0.8, -61.3, c === 'break' ? 'Smash the heart' : c === 'take' ? 'Take the heart' : 'Drive it into Vane', c === 'break' ? 'Reach the <b>heart</b> and <b>hold E</b> to smash it' : c === 'take' ? 'Reach the <b>heart</b> and <b>hold E</b> to drink it in' : 'Seize the <b>heart</b> and <b>hold E</b> to force it into Vane', 3);
    RM.control = false; AU.sting(0.7); RM.shake(0.1, 2);
    if (c === 'take') {
      heart.visible = false; w.data.heartLight.color.setHex(0x600010); RM.flash('rgba(160,0,20,0.95)', 3000);
      if (f.ateCorvin) ending = 'feathers';
      else if (s.dread >= 6) ending = 'empty';
      else ending = s.humanity >= 50 ? 'ruler' : 'magistrate';
    } else {
      heart.visible = false;
      RM.setEnv(RM.blendEnv('chapel', 'dawn', 0.8)); w.data.rose.material.color.setHex(0xffc080); RM.flash('rgba(255,240,200,1)', 3500); AU.bell(0.8);
      if (c === 'force') await RM.say('Vane', '"No— NO— it\'s <i>mine</i>, it was always— " <i>The curse pours back into him, and the dawn comes in through the broken rose window, and finds him first.</i>');
      if (c === 'break' && s.bites === 0 && s.memories >= 6) ending = 'home';
      else if (c === 'break' && s.memories >= 6 && (s.bonds.imelda || 0) >= 3 && !f.imeldaDead) ending = 'human';
      else ending = 'dawn';
    }
  } else if (c === 'pip') {
    RM.setObjective('Pip is at the edge of the platform. Go to them.');
    const pip = RM.npc(RM.LOOKS.pip, 5.5, -56.4, 0, { scale: 0.72, headScale: 1.18, vamp: { pale: 0.3 } }); pip.face(P.x, P.z);
    await goTo(4.5, -56.8, 'Take Pip\'s hand');
    RM.control = false;
    await RM.say('Pip', '"...Will it hurt?" <i>They\'re trying so hard to be brave.</i> "Will I be like you? Forever? That\'s okay. I don\'t mind forever if it\'s with you."');
    RM.flash('rgba(160,0,20,0.95)', 3000); AU.sting(0.5); heart.visible = false;
    ending = 'little';
  } else if (c === 'bed') {
    const cof = RM.build.box(0.9, 0.5, 2.2, RM.MAT.darkWood, -3.5, 0.6, -58, RM.actors);
    void cof;
    RM.setObjective('Lie down in the <b>empty coffin</b> by the water');
    await goTo(-3.5, -57, 'Lie down');
    RM.control = false; await RM.fade(1, 2.5);
    ending = 'asleep';
  } else if (c === 'kill') {
    RM.setObjective('<b>Kill Vane.</b> Click · Space to dash');
    vane.hp = 4; vane.chase = 3; vane.windT = 0.6;
    for (;;) { const r = await RM.fight([vane], { dmg: 22 }); if (r === 'won') break; RM.placePlayer(0, -56.5, Math.PI); RM.control = true; vane.hp = 4; vane.alive = true; vane.col.off = false; vane.fig.setPose('stand'); }
    RM.control = false;
    await RM.say('You', '<i>Vane falls. The heart above him shudders, and turns, slowly, like a compass needle... towards <b>you</b>. The curse has nowhere else to go.</i>');
    heart.visible = false; RM.flash('rgba(160,0,20,0.95)', 3000);
    ending = f.ateCorvin ? 'feathers' : s.humanity >= 50 ? 'ruler' : 'magistrate';
  } else if (c === 'chain') {
    await holdAt(-4.4, -64.8, 'Break the last chain', 'The chained coffin. <b>Hold E</b> on the last chain.', 2.5);
    RM.control = false; AU.clang(1); AU.boom(1); RM.shake(0.15, 3);
    w.data.bigLid.position.y = 3; w.data.bigLid.rotation.z = 0.8;
    await RM.say('???', '<span class="deep">"...{name}..."</span>');
    ending = 'sleeper';
  } else if (c === 'friends') {
    RM.control = false;
    const who = ['pip', 'gideon', 'tobias', 'imelda', 'mirela', 'rosalind'].filter((k) => (s.bonds[k] || 0) >= 2 && !f[k + 'Dead']);
    const looks = { pip: RM.LOOKS.pip, gideon: RM.LOOKS.gideon, tobias: { ...RM.LOOKS.tobias, extras: ['hat'] }, imelda: RM.LOOKS.imelda, mirela: RM.LOOKS.mirela, rosalind: RM.LOOKS.rosalind };
    who.forEach((k, i) => { const n = RM.npc(looks[k], -4 + i * 1.7, -54.8, 0, { scale: k === 'pip' ? 0.72 : 1, headScale: k === 'pip' ? 1.18 : 1 }); n.goTo(-3 + i * 1.3, -57.5, 1.2); n.ghost = true; });
    await RM.sleep(2.5);
    await RM.say('You', '<i>They came. All of them. Across the planks, one by one, with lanterns.</i>');
    await RM.say(who.includes('pip') ? 'Pip' : 'You', who.includes('pip') ? '"Why would you break the night? It\'s <i>yours</i>. We\'ll just... all stay up late. Forever. Obviously."' : '<i>Nobody says "break the curse". Nobody says "run". They just stand with you.</i>');
    ending = 'festival';
  } else if (c === 'nothing') {
    RM.setObjective('Choose nothing. <b>Don\'t touch anything.</b>');
    let moved = false; const k = (e) => { if (!['KeyP', 'Escape'].includes(e.code)) moved = true; }; addEventListener('keydown', k);
    const mm = () => { moved = true; }; addEventListener('mousedown', mm);
    let t = 12; RM.control = false;
    while (t > 0 && !moved) { RM.setObjective(`Choose nothing. <b>Don't touch anything.</b> ${Math.ceil(t)}`); await RM.sleep(0.1); t -= 0.1; }
    removeEventListener('keydown', k); removeEventListener('mousedown', mm);
    if (moved) { RM.toast('You moved. The night goes on.', 2.5); ending = s.humanity >= 50 ? 'dawn' : 'burn'; }
    else ending = 'loop';
  } else if (c === 'mirela') {
    RM.control = false;
    await RM.say('Mirela', '"Oh, darling. Of course I\'ll do it for you." <i>She kisses your forehead, and puts her cold hand over your eyes.</i> "Just close your eyes. Just for a moment."');
    await RM.fade(1, 2);
    ending = 'mirelaCoffin';
  } else if (c === 'ship') {
    RM.setObjective('Run for Rosalind\'s <b>boat</b>');
    await goTo(w.data.boat.x - 1.2, w.data.boat.z, 'Get in the boat');
    RM.control = false;
    await RM.say('Rosalind', '"Row! The town is already storming the Manor. Father\'s done either way. Let\'s be somewhere else when the sun comes up."');
    ending = 'ship';
  } else if (c === 'gideon') {
    RM.control = false;
    const g = RM.npc(RM.LOOKS.gideon, -3, -55.5, 0); g.face(P.x, P.z);
    await RM.say('Gideon', '"Brought you a coffin. Good oak. Get in, lie still, and let everyone think the Sleeper died down here tonight." <i>He taps his nose.</i> "Nobody looks for a dead thing twice."');
    RM.control = true;
    const cof = RM.build.box(0.9, 0.5, 2.2, RM.MAT.darkWood, -3.5, 0.6, -58, RM.actors); void cof;
    await goTo(-3.5, -57, 'Get in');
    RM.control = false; await RM.fade(1, 2);
    ending = 'gravedigger';
  } else if (c === 'hunters') {
    RM.control = false;
    await RM.say('Tobias', '"Let the town sort out the Magistrate. There are things out there, beyond the moor, that make Vane look like a kitten." <i>He tips his hat.</i> "Coming, partner?"');
    RM.control = true; RM.setObjective('Walk away with Tobias');
    await goTo(0, -52, 'Leave');
    RM.control = false;
    ending = 'hunters';
  } else if (c === 'mirror') {
    RM.control = false;
    const r = RM.npc(s.look, 0.9, -57.8, 0, { vamp: { ...RM.vampState(), humanity: 5, fangs: 1 } }); r.face(P.x, P.z);
    await RM.say('???', '<span class="deep">"Let me," it says, with your mouth. "I\'m so much better at this than you."</span>');
    await RM.fade(1, 2);
    ending = 'mirror';
  } else {
    RM.control = false;
    await RM.say('You', '<i>You step back. You fold your hands. You watch.</i>');
    heart.material.emissiveIntensity = 4; w.data.heartLight.intensity = 10; RM.shake(0.1, 3); AU.boom(1);
    ending = 'burn';
  }
  done(ending);
});

/* ============================================================ THE NIGHT */
RM.nightFive = async function () {
  const s = S(); s.night = 5;
  RM.store.set('ckpt5', JSON.parse(JSON.stringify(s)));
  RM.applyLook();
  await RM.card('NIGHT FIVE', 'THE LONGEST NIGHT');
  const r = await N5.chapel();
  if (r === 'drowned') { await RM.sleep(1.5); await RM.fade(1, 1); RM.fade(0, 1); return RM.showEnding('drowned'); }
  const choice = await N5.finale();
  const ending = await N5.play(choice);
  await RM.sleep(1.5); await RM.fade(1, 1.2); RM.fade(0, 1);
  return RM.showEnding(ending);
};
})();
