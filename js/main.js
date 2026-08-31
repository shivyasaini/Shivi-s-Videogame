'use strict';

// ---------------------------------------------------------------------------
// EMBERFALL — main game: loop, input, combat, AI, rendering, lighting, UI.
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const lightCanvas = document.createElement('canvas');
const lctx = lightCanvas.getContext('2d');

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  lightCanvas.width = innerWidth;
  lightCanvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();
canvas.style.cursor = 'crosshair';

// --- mouse (aim + fire the bow) --------------------------------------------
const mouse = { x: 0, y: 0, down: false };
let mouseClicked = false;
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', () => { mouse.down = true; mouseClicked = true; });
addEventListener('mouseup', () => { mouse.down = false; });

// --- input ------------------------------------------------------------------
const keys = {};     // held keys
const pressed = {};  // keys pressed this frame (cleared after each update)

addEventListener('keydown', (e) => {
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
  const k = e.key.toLowerCase();
  if (!e.repeat) pressed[k] = true;
  keys[k] = true;
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// --- game state -------------------------------------------------------------
let state = 'title'; // title | play | dialogue | dead | victory | journal
let mode = 'overworld'; // overworld | dungeon (first-person)
let player = null;
let enemies = [];
let pickups = [];
let projectiles = []; // arrows and shadow bolts {x,y,vx,vy,ttl,dmg,hostile,kind,ang}
let floaters = [];   // floating damage / xp text {x,y,txt,ttl,color}
let particles = [];  // {x,y,vx,vy,ttl,color,size}
let dust = [];       // ambient drifting motes
let msgs = [];       // announcements {txt,ttl}
let dialogue = null; // {name, lines, idx}
let boss = null;
let gateOpen = false;
let bossDefeated = false;
let victoryT = 0;
let time = 0;
let shake = 0;
const cam = { x: 0, y: 0 };
let interactTarget = null; // {kind, obj, label}
let quests = [];
let stonesRead = [];
let banner = { txt: '', ttl: 0, last: '' };

function newGame() {
  genWorld();
  player = makePlayer(world.playerSpawn.x, world.playerSpawn.y);
  enemies = world.spawns.map((s) => makeEnemy(s.x, s.y, s.type));
  boss = enemies.find((e) => e.boss);
  pickups = world.pickups.map((p) => ({ ...p }));
  floaters = []; particles = []; msgs = []; projectiles = []; dust = [];
  quests = []; stonesRead = [];
  banner = { txt: '', ttl: 0, last: '' };
  mode = 'overworld';
  resetDungeons();
  gateOpen = false; bossDefeated = false; victoryT = 0; shake = 0;
  addQuest('sigils', 'The Three Sigils', 'Find the three sigils sealing the northern castle: west woods, eastern mire, southern graves.');
  msg('The village fire is warm. The north is not.  [J] opens your journal.');
}

// --- quest journal ----------------------------------------------------------
function addQuest(id, name, desc) {
  if (quests.find((q) => q.id === id)) return;
  quests.push({ id, name, desc, done: false, count: 0, goal: 0 });
  msg('New quest — ' + name);
}

function getQuest(id) { return quests.find((q) => q.id === id); }

function completeQuest(id) {
  const q = getQuest(id);
  if (q && !q.done) { q.done = true; msg('Quest complete — ' + q.name); }
}

function msg(txt) { msgs.push({ txt, ttl: 4.5 }); }

function floater(x, y, txt, color) {
  floaters.push({ x, y, txt, ttl: 1.1, color });
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 120;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      ttl: 0.3 + Math.random() * 0.3, color, size: 1 + Math.random() * 2.5,
    });
  }
}

// --- collision --------------------------------------------------------------
function solidAt(pxx, pyy, ghost) {
  const t = getT(Math.floor(pxx / TILE), Math.floor(pyy / TILE));
  if (t === T.TREE) return !ghost;
  if (t === T.WALL || t === T.WATER) return true;
  if (t === T.GATE) return !gateOpen;
  return false;
}

function canStand(x, y, r, ghost) {
  return !solidAt(x - r, y - r, ghost) && !solidAt(x + r, y - r, ghost) &&
         !solidAt(x - r, y + r, ghost) && !solidAt(x + r, y + r, ghost);
}

// Move with axis-separated collision so entities slide along walls.
function moveEntity(e, dx, dy, ghost) {
  if (dx !== 0 && canStand(e.x + dx, e.y, e.r, ghost)) e.x += dx;
  if (dy !== 0 && canStand(e.x, e.y + dy, e.r, ghost)) e.y += dy;
}

// --- update -----------------------------------------------------------------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05);
  lastT = now;
  update(dt);
  draw();
  for (const k in pressed) pressed[k] = false;
  mouseClicked = false;
  requestAnimationFrame(frame);
}

function update(dt) {
  time += dt;
  shake = Math.max(0, shake - dt * 30);

  if (state === 'title') {
    if (pressed['enter'] || mouseClicked) { newGame(); state = 'play'; }
    return;
  }
  if (state === 'dead') {
    if (pressed['enter'] || mouseClicked) {
      player.hp = player.maxHp;
      player.gold = Math.floor(player.gold * 0.8);
      player.x = world.playerSpawn.x;
      player.y = world.playerSpawn.y;
      player.inv = 2;
      state = 'play';
      msg('You wake by the fire, lighter of purse.');
    }
    return;
  }
  if (state === 'victory') {
    if (pressed['enter']) { state = 'play'; msg('The land is quiet now. Wander as you will.'); }
    return;
  }
  if (state === 'dialogue') {
    if (pressed['e'] || pressed['enter'] || pressed[' ']) {
      dialogue.idx++;
      if (dialogue.idx >= dialogue.lines.length) { dialogue = null; state = 'play'; }
    }
    return;
  }
  if (state === 'journal') {
    if (pressed['j'] || pressed['escape'] || pressed['e']) state = 'play';
    return;
  }

  // ---- state === 'play' ----
  const p = player;
  if (pressed['j']) { state = 'journal'; return; }
  p.atkCd = Math.max(0, p.atkCd - dt);
  p.bowCd = Math.max(0, p.bowCd - dt);
  p.swing = Math.max(0, p.swing - dt);
  p.dodgeCd = Math.max(0, p.dodgeCd - dt);
  p.dodging = Math.max(0, p.dodging - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.lastHurt += dt;

  // out-of-combat regeneration
  if (p.lastHurt > 5 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 4 * dt);

  // drink potion (works everywhere)
  if (pressed['q']) {
    if (p.potions > 0 && p.hp < p.maxHp) {
      p.potions--;
      p.hp = Math.min(p.maxHp, p.hp + 40);
      floater(p.x, p.y - 20, '+40', '#7dd87d');
    } else if (p.potions <= 0) {
      msg('No potions left. Osric in the village sells them.');
    }
  }

  if (mode === 'dungeon') {
    dungeonUpdate(dt);
  } else {
    overworldUpdate(dt, p);
  }

  // messages tick in both modes
  for (const m of msgs) m.ttl -= dt;
  msgs = msgs.filter((m) => m.ttl > 0);
  banner.ttl = Math.max(0, banner.ttl - dt);

  if (victoryT > 0) {
    victoryT -= dt;
    if (victoryT <= 0) state = 'victory';
  }
  if (p.hp <= 0) {
    state = 'dead';
    mode = 'overworld';
    burst(p.x, p.y, '#c04848', 24);
  }
}

function overworldUpdate(dt, p) {
  // movement
  let mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  let my = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
  if (mx || my) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    p.face = Math.atan2(my, mx);
  }
  if (pressed['shift'] && p.dodgeCd <= 0) {
    p.dodging = 0.18;
    p.dodgeCd = 0.9;
    p.inv = Math.max(p.inv, 0.32);
    p.dodgeDirX = mx || Math.cos(p.face);
    p.dodgeDirY = my || Math.sin(p.face);
    burst(p.x, p.y, '#9aa3b8', 6);
  }
  if (p.dodging > 0) {
    moveEntity(p, p.dodgeDirX * 460 * dt, p.dodgeDirY * 460 * dt, false);
  } else {
    moveEntity(p, mx * p.speed * dt, my * p.speed * dt, false);
  }

  // sword swing
  if (pressed[' '] && p.atkCd <= 0) {
    p.atkCd = 0.42;
    p.swing = 0.16;
    p.swingDir = p.face;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < 46 + e.r && Math.abs(angDiff(p.swingDir, angTo(p.x, p.y, e.x, e.y))) < 1.15) {
        hitEnemy(e, p.dmg, angTo(p.x, p.y, e.x, e.y));
      }
    }
  }

  // loose an arrow toward the cursor (hold to keep firing)
  if (mouse.down && p.bowCd <= 0) {
    if (p.arrows > 0) {
      p.bowCd = 0.34;
      p.arrows--;
      const a = angTo(p.x, p.y, mouse.x + cam.x, mouse.y + cam.y);
      p.face = a;
      projectiles.push({
        x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14,
        vx: Math.cos(a) * 440, vy: Math.sin(a) * 440,
        ttl: 1.5, dmg: Math.max(6, Math.round(p.dmg * 0.75)),
        hostile: false, kind: 'arrow', ang: a,
      });
    } else if (mouseClicked) {
      msg('Out of arrows. Fallen foes and Trader Osric carry more.');
    }
  }

  updateProjectiles(dt, p);
  updateInteract();
  if (pressed['e'] && interactTarget) triggerInteract(interactTarget);
  if (mode !== 'overworld') return; // just descended into a dungeon

  updateEnemies(dt);
  updatePickups();

  // region banner when crossing into a new land
  const rn = regionName(p.x, p.y);
  if (rn !== banner.last) {
    banner.last = rn;
    banner.txt = rn;
    banner.ttl = 3.2;
  }

  // particles / floaters / ambient dust
  for (const f of floaters) { f.ttl -= dt; f.y -= 30 * dt; }
  floaters = floaters.filter((f) => f.ttl > 0);
  for (const q of particles) {
    q.ttl -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
    q.vx *= 0.92; q.vy *= 0.92;
  }
  particles = particles.filter((q) => q.ttl > 0);
  while (dust.length < 45) {
    dust.push({
      x: cam.x + Math.random() * canvas.width,
      y: cam.y + Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 12, vy: -5 - Math.random() * 9,
      ttl: 3 + Math.random() * 4,
    });
  }
  for (const d0 of dust) { d0.ttl -= dt; d0.x += d0.vx * dt; d0.y += d0.vy * dt; }
  dust = dust.filter((d0) => d0.ttl > 0);

  // camera follows the knight
  cam.x = clamp(p.x - canvas.width / 2, 0, MW * TILE - canvas.width);
  cam.y = clamp(p.y - canvas.height / 2, 0, MH * TILE - canvas.height);
}

function updateProjectiles(dt, p) {
  for (const pr of projectiles) {
    pr.ttl -= dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    // shadow bolts drift through trees the way their casters do
    if (solidAt(pr.x, pr.y, pr.hostile)) {
      pr.ttl = 0;
      burst(pr.x, pr.y, pr.hostile ? '#8a7ac8' : '#c8bfa0', 4);
      continue;
    }
    if (pr.hostile) {
      if (dist(pr.x, pr.y, p.x, p.y) < p.r + 5) {
        pr.ttl = 0;
        if (p.inv <= 0) {
          p.hp -= pr.dmg;
          p.inv = 0.6;
          p.lastHurt = 0;
          shake = 5;
          burst(p.x, p.y, '#a88ae8', 10);
          floater(p.x, p.y - 22, '-' + pr.dmg, '#e86060');
        }
      }
      if (Math.random() < dt * 18) {
        particles.push({ x: pr.x, y: pr.y, vx: 0, vy: 0, ttl: 0.25, color: '#6a5aa8', size: 2 });
      }
    } else {
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist(pr.x, pr.y, e.x, e.y) < e.r + 5) {
          pr.ttl = 0;
          hitEnemy(e, pr.dmg, pr.ang);
          break;
        }
      }
    }
  }
  projectiles = projectiles.filter((pr) => pr.ttl > 0);
}

// Which land the knight stands in — used for the banner and terrain moods.
function regionName(x, y) {
  const tx = x / TILE, ty = y / TILE;
  if (tx > 36 && tx < 60 && ty > 6 && ty < 26) return 'Castle Maldrich';
  if (Math.hypot(tx - world.village.tx, ty - world.village.ty) < 11) return 'Emberside Village';
  if (ty < 30) return 'The Ashen Approach';
  if (ty > 74) return 'The Gravehills';
  if (tx < 32) return 'The Weeping Woods';
  if (tx > 64) return 'The Mirefen';
  return 'The Old Road';
}

function hitEnemy(e, dmg, ang) {
  e.hp -= dmg;
  e.hurtT = 0.15;
  e.kx += Math.cos(ang) * 180;
  e.ky += Math.sin(ang) * 180;
  e.aggroed = true;
  burst(e.x, e.y, e.type === 'wraith' ? '#8fd6e8' : '#d8d0c0', 6);
  floater(e.x, e.y - e.r - 6, String(dmg), '#f0e6c8');
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true;
  burst(e.x, e.y, '#5a5a6a', 14);
  gainXp(e.xp);
  floater(e.x, e.y - 16, '+' + e.xp + ' xp', '#b48ce8');
  const g = 3 + Math.floor(Math.random() * 6);
  pickups.push({ x: e.x, y: e.y, type: 'gold', val: g });
  if (Math.random() < 0.22) {
    pickups.push({ x: e.x + 14, y: e.y + 6, type: 'potion' });
  }
  if (Math.random() < 0.35) {
    pickups.push({ x: e.x - 12, y: e.y - 8, type: 'arrows', val: 3 });
  }
  // side quest: Wolfsbane
  if (e.type === 'wolf') {
    const q = getQuest('wolfsbane');
    if (q && !q.done) {
      q.count++;
      if (q.count >= q.goal) {
        completeQuest('wolfsbane');
        player.gold += 40;
        player.potions++;
        msg('Osric’s bounty: 40 gold and a potion.');
      } else {
        msg('Wolves culled: ' + q.count + ' of ' + q.goal);
      }
    }
  }
  if (e.boss) {
    bossDefeated = true;
    completeQuest('king');
    victoryT = 2;
    msg('The Fallen King is no more.');
    shake = 12;
  }
}

function gainXp(amount) {
  const p = player;
  p.xp += amount;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.floor(40 * Math.pow(p.level, 1.35));
    p.maxHp += 15;
    p.dmg += 3;
    p.hp = p.maxHp;
    msg('Level ' + p.level + ' — your blade grows heavier, your resolve harder.');
    burst(p.x, p.y, '#b48ce8', 20);
  }
}

function updateEnemies(dt) {
  const p = player;
  for (const e of enemies) {
    if (e.dead) continue;
    e.touchCd = Math.max(0, e.touchCd - dt);
    e.hurtT = Math.max(0, e.hurtT - dt);
    const d = dist(e.x, e.y, p.x, p.y);

    // knockback decay
    if (e.kx || e.ky) {
      moveEntity(e, e.kx * dt, e.ky * dt, e.ghost);
      e.kx *= 0.85; e.ky *= 0.85;
      if (Math.abs(e.kx) < 4) e.kx = 0;
      if (Math.abs(e.ky) < 4) e.ky = 0;
    }

    if (!e.aggroed && d < e.aggro) {
      e.aggroed = true;
      if (e.boss) { msg('MALDRICH, THE FALLEN KING, RISES FROM HIS THRONE'); shake = 8; }
    }
    // lose interest if the player runs far away (except the king)
    if (e.aggroed && !e.boss && d > e.aggro * 2.2) e.aggroed = false;

    if (e.boss && e.aggroed) {
      // periodic charge attack
      e.chargeT -= dt;
      if (e.charging > 0) {
        e.charging -= dt;
        moveEntity(e, e.chDirX * e.speed * 3.1 * dt, e.chDirY * e.speed * 3.1 * dt, false);
      } else if (e.chargeT <= 0) {
        e.chargeT = 3.5;
        e.charging = 0.65;
        const a = angTo(e.x, e.y, p.x, p.y);
        e.chDirX = Math.cos(a); e.chDirY = Math.sin(a);
        burst(e.x, e.y, '#c04848', 10);
      } else {
        const a = angTo(e.x, e.y, p.x, p.y);
        moveEntity(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, false);
      }
      if (!e.spawnedAdds && e.hp < e.hpMax / 2) {
        e.spawnedAdds = true;
        msg('"You will kneel, as the others knelt."');
        for (const off of [-40, 40]) {
          const w = makeEnemy(e.x + off, e.y, 'wraith');
          w.aggroed = true;
          enemies.push(w);
        }
      }
      // shadow-bolt volley between charges
      e.volleyT -= dt;
      if (e.volleyT <= 0 && e.charging <= 0) {
        e.volleyT = 4.5;
        const a = angTo(e.x, e.y, p.x, p.y);
        for (let i = -2; i <= 2; i++) fireBolt(e.x, e.y, a + i * 0.22, 230, 14);
        burst(e.x, e.y, '#8a5ac8', 12);
      }
    } else if (e.aggroed) {
      const a = angTo(e.x, e.y, p.x, p.y);
      if (e.type === 'wraith') {
        // wraiths keep their distance and hurl shadow bolts
        let mvx, mvy;
        if (d > 260) { mvx = Math.cos(a); mvy = Math.sin(a); }
        else if (d < 140) { mvx = -Math.cos(a); mvy = -Math.sin(a); }
        else { mvx = Math.cos(a + Math.PI / 2) * 0.55; mvy = Math.sin(a + Math.PI / 2) * 0.55; }
        moveEntity(e, mvx * e.speed * dt, mvy * e.speed * dt, true);
        e.fireT -= dt;
        if (e.fireT <= 0 && d < 380) {
          e.fireT = 2.4;
          fireBolt(e.x, e.y, a, 210, 10);
        }
      } else {
        moveEntity(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt, e.ghost);
      }
    } else {
      // idle wander around home
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        e.wanderT = 1.5 + Math.random() * 2.5;
        if (dist(e.x, e.y, e.homeX, e.homeY) > 120) {
          const a = angTo(e.x, e.y, e.homeX, e.homeY);
          e.wx = Math.cos(a); e.wy = Math.sin(a);
        } else if (Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2;
          e.wx = Math.cos(a); e.wy = Math.sin(a);
        } else {
          e.wx = 0; e.wy = 0;
        }
      }
      moveEntity(e, e.wx * e.speed * 0.3 * dt, e.wy * e.speed * 0.3 * dt, e.ghost);
    }

    // contact damage
    if (d < e.r + p.r + 3 && e.touchCd <= 0 && p.inv <= 0) {
      e.touchCd = 0.8;
      p.hp -= e.dmg;
      p.inv = 0.6;
      p.lastHurt = 0;
      shake = 6;
      burst(p.x, p.y, '#c04848', 10);
      floater(p.x, p.y - 22, '-' + e.dmg, '#e86060');
    }
  }
}

function fireBolt(x, y, a, speed, dmg) {
  projectiles.push({
    x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    ttl: 2.2, dmg, hostile: true, kind: 'bolt', ang: a,
  });
}

function updatePickups() {
  const p = player;
  for (const k of pickups) {
    if (k.got) continue;
    if (dist(p.x, p.y, k.x, k.y) < 22) {
      k.got = true;
      if (k.type === 'gold') {
        p.gold += k.val;
        floater(k.x, k.y - 10, '+' + k.val + 'g', '#e8c860');
      } else if (k.type === 'potion') {
        p.potions++;
        floater(k.x, k.y - 10, '+potion', '#e86060');
      } else if (k.type === 'arrows') {
        p.arrows += k.val;
        floater(k.x, k.y - 10, '+' + k.val + ' arrows', '#d8cfa8');
      } else if (k.type === 'sigil') {
        p.sigils++;
        burst(k.x, k.y, '#8fd6e8', 24);
        shake = 4;
        if (p.sigils >= 3) {
          gateOpen = true;
          completeQuest('sigils');
          addQuest('king', 'The Fallen King', 'The castle gate stands open. Face Maldrich on his throne, far to the north.');
          msg('The third sigil hums. Far to the north, iron screams — the castle gate stands open.');
        } else {
          msg('Sigil claimed (' + p.sigils + ' of 3). Its light crawls under your skin.');
        }
      }
    }
  }
  pickups = pickups.filter((k) => !k.got);
}

// --- interaction (NPCs, lore stones) ---------------------------------------
function updateInteract() {
  const p = player;
  interactTarget = null;
  let best = 48;
  for (const n of world.npcs) {
    const d = dist(p.x, p.y, n.x, n.y);
    if (d < best) { best = d; interactTarget = { kind: n.kind, obj: n, label: 'Talk to ' + n.name }; }
  }
  for (const s of world.lores) {
    const d = dist(p.x, p.y, s.x, s.y);
    if (d < best) { best = d; interactTarget = { kind: 'lore', obj: s, label: 'Read the stone' }; }
  }
  for (const dg of world.dungeons) {
    const d = dist(p.x, p.y, dg.x, dg.y);
    if (d < best + 12) { best = d; interactTarget = { kind: 'dungeon', obj: dg, label: 'Descend into ' + dg.name }; }
  }
}

function triggerInteract(t) {
  if (t.kind === 'elder') {
    const lines = player.sigils >= 3 ? [
      'You carry all three sigils. I can feel them from here, like a held breath.',
      'The gate is open. Maldrich waits on his throne, as he has for a hundred years.',
      'End him, knight. Or at least make him remember what fear was.',
    ] : bossDefeated ? [
      'It is done, then. The air tastes different — thinner. Cleaner.',
      'Whatever you go on to be, this land will remember you were here.',
    ] : [
      'Cold roads, traveler. You are the first living soul I have seen in a season.',
      'This land was bright once — before King Maldrich bargained with the dark for a crown that would not rust.',
      'Three ancient sigils seal his castle: west in the deep woods, east past the water, south among the graves.',
      'Bring all three to the northern gate. End him... or join the others who tried.',
    ];
    startDialogue('Elder Rowena', lines);
  } else if (t.kind === 'trader') {
    if (!getQuest('wolfsbane')) {
      addQuest('wolfsbane', 'Wolfsbane', 'Cull 6 wolves for Trader Osric. He pays in gold and potions.');
      getQuest('wolfsbane').goal = 6;
      startDialogue('Trader Osric', [
        'Before we talk wares — the wolves. They took my mule, my cart, and very nearly my legs.',
        'Cull six of them and I will pay you forty gold and a potion. Consider it my whole armed forces budget.',
        'And when you have coin: fifteen gold buys a potion and five arrows. Best supplies in the village. Only supplies in the village.',
      ]);
    } else if (player.gold >= 15) {
      player.gold -= 15;
      player.potions++;
      player.arrows += 5;
      startDialogue('Trader Osric', [
        'Fifteen gold — one red vial and five good arrows. Mostly berries, partly hope.',
        'Press Q when the dark bites too deep. Come back alive; you are my only customer.',
      ]);
    } else {
      startDialogue('Trader Osric', [
        'A potion and five arrows for fifteen gold. You have ' + player.gold + '.',
        'Wolves carry coin, oddly enough. Everything in this land hoards something.',
      ]);
    }
  } else if (t.kind === 'lore') {
    if (!getQuest('stones')) {
      addQuest('stones', 'Voices in Stone', 'Read the three weathered stones scattered across Emberfall.');
      getQuest('stones').goal = 3;
    }
    if (!stonesRead.includes(t.obj.x)) {
      stonesRead.push(t.obj.x);
      const q = getQuest('stones');
      q.count = stonesRead.length;
      if (q.count >= 3 && !q.done) {
        completeQuest('stones');
        gainXp(30);
        msg('The stones fall silent. You feel older, and wiser. (+30 xp)');
      }
    }
    startDialogue('Weathered Stone', [t.obj.text]);
  } else if (t.kind === 'dungeon') {
    enterDungeon(t.obj);
  }
}

function startDialogue(name, lines) {
  dialogue = { name, lines, idx: 0 };
  state = 'dialogue';
}

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'title') { drawTitle(); return; }

  if (mode === 'dungeon') {
    dungeonDraw();
  } else {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(sx, sy);

    drawTiles();
    drawEntities();
    drawProjectiles();
    drawParticles();
    const ls = buildLights();
    drawLighting(ls);
    drawGlow(ls);
    ctx.restore();
    drawVignette();
  }

  drawHud();
  drawBanner();
  if (state === 'journal') drawJournal();
  if (state === 'dialogue') drawDialogue();
  if (state === 'dead') drawOverlay('YOU HAVE FALLEN', 'The fire calls you back.  Press Enter', '#c04848');
  if (state === 'victory') drawOverlay('THE CROWN LIES BROKEN', 'Emberfall breathes again.  Press Enter to wander on', '#e8c860');
}

function drawTiles() {
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(MW - 1, x0 + Math.ceil(canvas.width / TILE) + 1);
  const y1 = Math.min(MH - 1, y0 + Math.ceil(canvas.height / TILE) + 1);

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = getT(tx, ty);
      const dx = tx * TILE - cam.x;
      const dy = ty * TILE - cam.y;
      const h = tileHash(tx, ty);

      // each region has its own mood: ashen north, swampy east, grave-gray south
      const north = ty < 30, east = tx > 64, south = ty > 74;

      switch (t) {
        case T.GRASS: {
          const v = h % 3;
          if (north) ctx.fillStyle = v === 0 ? '#20201c' : v === 1 ? '#1d1d19' : '#22221d';
          else if (east) ctx.fillStyle = v === 0 ? '#182417' : v === 1 ? '#162213' : '#1a2a18';
          else if (south) ctx.fillStyle = v === 0 ? '#1c211a' : v === 1 ? '#1a1e18' : '#1e231c';
          else ctx.fillStyle = v === 0 ? '#1a2416' : v === 1 ? '#182114' : '#1c2718';
          ctx.fillRect(dx, dy, TILE, TILE);
          if (h > 235) { // sparse grass tufts
            ctx.fillStyle = north ? '#2c2c26' : '#243020';
            ctx.fillRect(dx + (h % 20), dy + (h % 13), 2, 4);
          } else if (h < 5) { // scattered field stones
            ctx.fillStyle = '#3a3e48';
            ctx.fillRect(dx + (h * 5) % 24, dy + (h * 7) % 24, 3, 2);
          } else if (h > 228 && !north) { // rare dusk flowers
            ctx.fillStyle = east ? '#4a6a5a' : '#6a5a7a';
            ctx.fillRect(dx + (h % 22), dy + (h % 17), 2, 2);
          }
          break;
        }
        case T.TREE: {
          ctx.fillStyle = north ? '#1a1a17' : '#161e12';
          ctx.fillRect(dx, dy, TILE, TILE);
          ctx.fillStyle = north ? '#26221e' : '#2a1e12'; // trunk
          ctx.fillRect(dx + 13, dy + 18, 6, 12);
          const sway = Math.sin(time * 0.8 + h) * 1.5;
          const cr = 13 + (h % 4);
          ctx.fillStyle = north ? (h % 2 ? '#141412' : '#171714')
                                : (h % 2 ? '#0e1810' : '#101c12'); // canopy
          ctx.beginPath();
          ctx.arc(dx + 16 + sway, dy + 12, cr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = north ? 'rgba(70,66,60,0.18)' : 'rgba(52,72,44,0.22)'; // moonlit edge
          ctx.beginPath();
          ctx.arc(dx + 12 + sway, dy + 8, cr * 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case T.WATER: {
          ctx.fillStyle = east ? '#101c1e' : '#0c1626';
          ctx.fillRect(dx, dy, TILE, TILE);
          const w = Math.sin(time * 1.5 + tx * 0.7 + ty * 1.3);
          if (w > 0.55) {
            ctx.fillStyle = 'rgba(80,110,150,0.25)';
            ctx.fillRect(dx + 4, dy + 10 + (h % 12), 14, 2);
          }
          const w2 = Math.sin(time * 1.1 + tx * 1.3 - ty * 0.6 + 2);
          if (w2 > 0.7) {
            ctx.fillStyle = 'rgba(130,170,210,0.13)';
            ctx.fillRect(dx + 12, dy + 4 + (h % 16), 10, 2);
          }
          if (east && h > 215) { // reeds in the Mirefen
            ctx.strokeStyle = '#2a3a26';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dx + (h % 24), dy + 28);
            ctx.lineTo(dx + (h % 24) + Math.sin(time + h) * 2, dy + 16);
            ctx.stroke();
          }
          break;
        }
        case T.WALL: {
          ctx.fillStyle = '#23232c';
          ctx.fillRect(dx, dy, TILE, TILE);
          if (getT(tx, ty - 1) !== T.WALL) {
            ctx.fillStyle = '#33333f';
            ctx.fillRect(dx, dy, TILE, 7);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; // brick seams
          ctx.fillRect(dx, dy + 15, TILE, 2);
          ctx.fillRect(dx + (h % 2 ? 8 : 20), dy + 17, 2, 15);
          break;
        }
        case T.FLOOR: {
          ctx.fillStyle = h % 2 ? '#232028' : '#26222b';
          ctx.fillRect(dx, dy, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.strokeRect(dx + 0.5, dy + 0.5, TILE, TILE);
          break;
        }
        case T.PATH: {
          ctx.fillStyle = h % 2 ? '#3a3226' : '#372f24';
          ctx.fillRect(dx, dy, TILE, TILE);
          break;
        }
        case T.GATE: {
          if (gateOpen) {
            ctx.fillStyle = '#232028';
            ctx.fillRect(dx, dy, TILE, TILE);
          } else {
            ctx.fillStyle = '#2c2117';
            ctx.fillRect(dx, dy, TILE, TILE);
            ctx.fillStyle = '#4a3a22';
            for (let b = 3; b < TILE; b += 8) ctx.fillRect(dx + b, dy, 4, TILE);
            ctx.fillStyle = '#5a5a66';
            ctx.fillRect(dx, dy + 13, TILE, 4);
          }
          break;
        }
      }
    }
  }
}

// Build a y-sorted list of everything that stands in the world, then draw.
function drawEntities() {
  const list = [];
  for (const d of world.decors) list.push({ y: d.y, f: () => drawDecor(d) });
  for (const s of world.lores) list.push({ y: s.y, f: () => drawLoreStone(s) });
  for (const k of pickups) list.push({ y: k.y, f: () => drawPickup(k) });
  for (const n of world.npcs) list.push({ y: n.y, f: () => drawNpc(n) });
  for (const e of enemies) if (!e.dead) list.push({ y: e.y, f: () => drawEnemy(e) });
  list.push({ y: player.y, f: () => drawPlayer(player) });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.f();
}

function onScreen(x, y, m) {
  return x > cam.x - m && x < cam.x + canvas.width + m &&
         y > cam.y - m && y < cam.y + canvas.height + m;
}

function drawShadow(x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - cam.x, y - cam.y + r * 0.9, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(p) {
  const x = p.x - cam.x, y = p.y - cam.y;
  drawShadow(p.x, p.y, 11);

  // hit / dodge flicker
  if (p.inv > 0 && Math.floor(time * 20) % 2 === 0) ctx.globalAlpha = 0.5;

  // cape
  ctx.fillStyle = '#5a1e28';
  ctx.beginPath();
  ctx.ellipse(x - Math.cos(p.face) * 5, y - Math.sin(p.face) * 5 + 2, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // armored body
  ctx.fillStyle = '#7d8698';
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3c4250'; ctx.lineWidth = 2; ctx.stroke();
  // helmet with a visor slit toward facing
  ctx.fillStyle = '#98a2b4';
  ctx.beginPath(); ctx.arc(x, y - 5, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3c4250'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = '#1a1d24'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(p.face) * 2 - 3, y - 5);
  ctx.lineTo(x + Math.cos(p.face) * 2 + 3, y - 5);
  ctx.stroke();
  // plume
  ctx.fillStyle = '#5a1e28';
  ctx.fillRect(x - 1, y - 14, 2, 5);

  // sword: swings through an arc while attacking, else rests at the side
  const prog = p.swing > 0 ? 1 - p.swing / 0.16 : 0;
  const ang = p.swing > 0 ? p.swingDir - 1.2 + prog * 2.4 : p.face + 2.4;
  ctx.strokeStyle = '#c8ccd8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6);
  ctx.lineTo(x + Math.cos(ang) * 24, y + Math.sin(ang) * 24);
  ctx.stroke();
  if (p.swing > 0) { // swipe trail
    ctx.strokeStyle = 'rgba(220,225,240,' + (0.5 * (1 - prog)) + ')';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, 26, p.swingDir - 1.2, p.swingDir - 1.2 + prog * 2.4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawEnemy(e) {
  if (!onScreen(e.x, e.y, 60)) return;
  const x = e.x - cam.x, y = e.y - cam.y;
  if (e.type !== 'wraith') drawShadow(e.x, e.y, e.r);
  const flash = e.hurtT > 0;

  if (e.type === 'wolf') {
    ctx.fillStyle = flash ? '#e8e8e8' : '#4a4a52';
    ctx.beginPath(); ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); // head
    ctx.arc(x + 9, y - 3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? '#e8e8e8' : '#3a3a42'; // ears
    ctx.fillRect(x + 6, y - 11, 3, 4); ctx.fillRect(x + 11, y - 11, 3, 4);
    ctx.fillStyle = '#d8b830'; // eyes
    ctx.fillRect(x + 11, y - 5, 2, 2);
  } else if (e.type === 'skeleton') {
    ctx.fillStyle = flash ? '#ffffff' : '#c8c2b0';
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); // ribcage
    ctx.fillStyle = flash ? '#ffffff' : '#d8d2c0';
    ctx.beginPath(); ctx.arc(x, y - 9, 6, 0, Math.PI * 2); ctx.fill(); // skull
    ctx.fillStyle = '#141418';
    ctx.fillRect(x - 4, y - 11, 3, 3); ctx.fillRect(x + 1, y - 11, 3, 3); // sockets
    ctx.strokeStyle = flash ? '#ffffff' : '#a8a290'; // rusted blade
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 18, y - 8); ctx.stroke();
  } else if (e.type === 'wraith') {
    const bob = Math.sin(time * 3 + e.homeX) * 3;
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = flash ? '#d8f0f8' : '#2a3a4a';
    ctx.beginPath(); // hooded, trailing shape
    ctx.moveTo(x, y - 14 + bob);
    ctx.quadraticCurveTo(x - 11, y - 4 + bob, x - 8, y + 10 + bob);
    ctx.quadraticCurveTo(x, y + 4 + bob, x + 8, y + 10 + bob);
    ctx.quadraticCurveTo(x + 11, y - 4 + bob, x, y - 14 + bob);
    ctx.fill();
    ctx.fillStyle = '#8fd6e8'; // cold eyes
    ctx.fillRect(x - 4, y - 6 + bob, 2, 3); ctx.fillRect(x + 2, y - 6 + bob, 2, 3);
    ctx.globalAlpha = 1;
  } else if (e.type === 'boss') {
    ctx.fillStyle = flash ? '#e8d8d8' : '#1e1a24'; // massive armored bulk
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a3a52'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = flash ? '#e8d8d8' : '#2a2432';
    ctx.beginPath(); ctx.arc(x, y - 10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c860'; // the crown that would not rust
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 16); ctx.lineTo(x - 8, y - 24); ctx.lineTo(x - 4, y - 18);
    ctx.lineTo(x, y - 26); ctx.lineTo(x + 4, y - 18); ctx.lineTo(x + 8, y - 24);
    ctx.lineTo(x + 8, y - 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e83030'; // burning eyes
    ctx.fillRect(x - 5, y - 12, 3, 4); ctx.fillRect(x + 2, y - 12, 3, 4);
    ctx.strokeStyle = '#8a8a96'; // greatsword
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 14, y + 4); ctx.lineTo(x + 32, y - 16); ctx.stroke();
    if (e.charging > 0) { // red wind-up glow
      ctx.strokeStyle = 'rgba(232,48,48,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 24 + Math.sin(time * 25) * 3, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // health bar once damaged
  if (e.hp < e.hpMax && !e.boss) {
    const w = 26;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2, y - e.r - 14, w, 4);
    ctx.fillStyle = '#c04848';
    ctx.fillRect(x - w / 2, y - e.r - 14, w * (e.hp / e.hpMax), 4);
  }
}

function drawNpc(n) {
  if (!onScreen(n.x, n.y, 40)) return;
  const x = n.x - cam.x, y = n.y - cam.y;
  drawShadow(n.x, n.y, 9);
  const robe = n.kind === 'elder' ? '#3a4a3a' : '#5a4428';
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.quadraticCurveTo(x - 10, y, x - 8, y + 10);
  ctx.lineTo(x + 8, y + 10);
  ctx.quadraticCurveTo(x + 10, y, x, y - 12);
  ctx.fill();
  ctx.fillStyle = '#c8a888'; // face under the hood
  ctx.beginPath(); ctx.arc(x, y - 6, 4, 0, Math.PI * 2); ctx.fill();
}

function drawDecor(d) {
  if (!onScreen(d.x, d.y, 40)) return;
  const x = d.x - cam.x, y = d.y - cam.y;
  if (d.kind === 'campfire' || d.kind === 'brazier') {
    if (d.kind === 'campfire') {
      ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 8, y + 4); ctx.lineTo(x + 8, y - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 8, y - 2); ctx.lineTo(x + 8, y + 4); ctx.stroke();
    } else {
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(x - 5, y - 2, 10, 8);
      ctx.fillRect(x - 7, y - 4, 14, 3);
    }
    // flickering flame
    const fl = Math.sin(time * 11 + d.x) * 2;
    ctx.fillStyle = '#e87828';
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 2);
    ctx.quadraticCurveTo(x, y - 16 - fl, x + 5, y - 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8c840';
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.quadraticCurveTo(x, y - 9 - fl, x + 2, y - 2);
    ctx.closePath(); ctx.fill();
  } else if (d.kind === 'stairs') {
    // a sunken stairway breathing cold air
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(x - 13, y - 9, 26, 20);
    ctx.strokeStyle = '#4a4a56';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 13, y - 9, 26, 20);
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = 'rgba(90,90,110,' + (0.5 - s * 0.15) + ')';
      ctx.fillRect(x - 10 + s * 2, y - 6 + s * 5, 20 - s * 4, 3);
    }
    const mist = 0.2 + Math.sin(time * 2 + d.x) * 0.1;
    ctx.fillStyle = 'rgba(140,160,200,' + mist + ')';
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.kind === 'grave') {
    ctx.fillStyle = '#3c3c46';
    ctx.fillRect(x - 5, y - 8, 10, 12);
    ctx.beginPath(); ctx.arc(x, y - 8, 5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 3, y - 6, 6, 1);
    ctx.fillRect(x - 3, y - 3, 6, 1);
  }
}

function drawLoreStone(s) {
  if (!onScreen(s.x, s.y, 40)) return;
  const x = s.x - cam.x, y = s.y - cam.y;
  drawShadow(s.x, s.y, 8);
  ctx.fillStyle = '#464652';
  ctx.beginPath();
  ctx.moveTo(x - 7, y + 10); ctx.lineTo(x - 5, y - 14);
  ctx.lineTo(x + 5, y - 14); ctx.lineTo(x + 7, y + 10);
  ctx.closePath(); ctx.fill();
  const glow = 0.4 + Math.sin(time * 2 + s.x) * 0.2;
  ctx.fillStyle = 'rgba(143,214,232,' + glow + ')';
  ctx.fillRect(x - 2, y - 10, 4, 4);
  ctx.fillRect(x - 1, y - 4, 2, 8);
}

function drawPickup(k) {
  if (!onScreen(k.x, k.y, 40)) return;
  const x = k.x - cam.x, y = k.y - cam.y;
  const bob = Math.sin(time * 3 + k.x) * 2;
  if (k.type === 'gold') {
    ctx.fillStyle = '#e8c860';
    ctx.beginPath(); ctx.arc(x - 3, y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, y + 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1, y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (k.type === 'potion') {
    ctx.fillStyle = '#c04848';
    ctx.beginPath(); ctx.arc(x, y + bob, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x - 2, y - 9 + bob, 4, 5);
  } else if (k.type === 'arrows') {
    ctx.strokeStyle = '#c8bfa0';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 6, y + 6); ctx.lineTo(x + 6, y - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.stroke();
    ctx.fillStyle = '#f4ecd0';
    ctx.fillRect(x + 4, y - 8, 3, 3); ctx.fillRect(x - 7, y - 8, 3, 3);
  } else if (k.type === 'sigil') {
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(time);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#8fd6e8';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#d8f4fc';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const pr of projectiles) {
    const x = pr.x - cam.x, y = pr.y - cam.y;
    if (x < -20 || y < -20 || x > canvas.width + 20 || y > canvas.height + 20) continue;
    if (pr.kind === 'arrow') {
      ctx.strokeStyle = '#e0d6b0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(pr.ang) * 8, y - Math.sin(pr.ang) * 8);
      ctx.lineTo(x + Math.cos(pr.ang) * 8, y + Math.sin(pr.ang) * 8);
      ctx.stroke();
      ctx.fillStyle = '#f4ecd0';
      ctx.fillRect(x + Math.cos(pr.ang) * 8 - 1, y + Math.sin(pr.ang) * 8 - 1, 3, 3);
    } else {
      const pulse = 4 + Math.sin(time * 20 + pr.x) * 1.2;
      ctx.fillStyle = '#7a5ac8';
      ctx.beginPath(); ctx.arc(x, y, pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dcd0ff';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawParticles() {
  ctx.fillStyle = '#aab4d0';
  for (const d0 of dust) {
    ctx.globalAlpha = 0.10 * Math.min(1, d0.ttl);
    ctx.fillRect(d0.x - cam.x, d0.y - cam.y, 2, 2);
  }
  ctx.globalAlpha = 1;
  for (const q of particles) {
    ctx.globalAlpha = Math.min(1, q.ttl * 3);
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x - cam.x, q.y - cam.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.ttl * 2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x - cam.x, f.y - cam.y);
  }
  ctx.globalAlpha = 1;
}

// Every light source in view: cuts a hole in the darkness and (optionally)
// casts a colored glow on top of it.
function buildLights() {
  const ls = [{ x: player.x, y: player.y, r: 195, a: 0.98, glow: 'rgba(232,150,60,0.05)' }];
  for (const L of world.lights) {
    const flick = 1 + Math.sin(time * 9 + L.x * 0.13) * 0.07;
    ls.push({ x: L.x, y: L.y, r: L.r * flick, a: 0.92, glow: 'rgba(240,140,40,0.14)' });
  }
  for (const k of pickups) {
    if (k.type === 'sigil') ls.push({ x: k.x, y: k.y, r: 100, a: 0.8, glow: 'rgba(143,214,232,0.13)' });
  }
  for (const pr of projectiles) {
    if (pr.hostile) ls.push({ x: pr.x, y: pr.y, r: 70, a: 0.5, glow: 'rgba(150,110,232,0.16)' });
    else ls.push({ x: pr.x, y: pr.y, r: 40, a: 0.4, glow: null });
  }
  return ls;
}

// Darkness with holes cut out around light sources — the heart of the mood.
function drawLighting(lights) {
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.fillStyle = 'rgba(4,5,14,0.90)';
  lctx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
  lctx.globalCompositeOperation = 'destination-out';

  for (const L of lights) {
    const x = L.x - cam.x, y = L.y - cam.y;
    if (x < -L.r || y < -L.r || x > canvas.width + L.r || y > canvas.height + L.r) continue;
    const g = lctx.createRadialGradient(x, y, 0, x, y, L.r);
    g.addColorStop(0, 'rgba(255,255,255,' + L.a + ')');
    g.addColorStop(0.6, 'rgba(255,255,255,' + L.a * 0.5 + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.beginPath(); lctx.arc(x, y, L.r, 0, Math.PI * 2); lctx.fill();
  }
  ctx.drawImage(lightCanvas, 0, 0);

  // faint cold moonlight tint over everything
  ctx.fillStyle = 'rgba(40,55,110,0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Warm additive halos around fires and magic — the "a little better" pass.
function drawGlow(lights) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    if (!L.glow) continue;
    const x = L.x - cam.x, y = L.y - cam.y;
    const r = L.r * 0.9;
    if (x < -r || y < -r || x > canvas.width + r || y > canvas.height + r) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, L.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawVignette() {
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const g = ctx.createRadialGradient(cx, cy, Math.min(cx, cy) * 0.55, cx, cy, Math.max(cx, cy) * 1.15);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBanner() {
  if (banner.ttl <= 0 || state !== 'play') return;
  ctx.globalAlpha = Math.min(1, banner.ttl, (3.2 - banner.ttl) * 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8dfc0';
  ctx.font = 'italic 30px Georgia, serif';
  ctx.fillText(banner.txt, canvas.width / 2, 120);
  ctx.strokeStyle = 'rgba(232,223,192,0.4)';
  ctx.lineWidth = 1;
  const w = ctx.measureText(banner.txt).width;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - w / 2 - 30, 132);
  ctx.lineTo(canvas.width / 2 + w / 2 + 30, 132);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawJournal() {
  ctx.fillStyle = 'rgba(6,6,12,0.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const w = Math.min(560, canvas.width - 60);
  const x = canvas.width / 2 - w / 2;
  let y = 90;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c860';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('J O U R N A L', canvas.width / 2, y);
  y += 16;
  ctx.strokeStyle = '#6a5a3a';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  y += 36;
  ctx.textAlign = 'left';
  for (const q of quests) {
    ctx.fillStyle = q.done ? '#7a8a6a' : '#e8dfc8';
    ctx.font = 'bold 17px Georgia, serif';
    const mark = q.done ? '✓  ' : '◆  ';
    let title = mark + q.name;
    if (!q.done && q.goal > 0) title += '   (' + q.count + ' / ' + q.goal + ')';
    ctx.fillText(title, x, y);
    y += 22;
    ctx.fillStyle = q.done ? '#5a6452' : '#a89e88';
    ctx.font = '14px Georgia, serif';
    y = wrapTextAt(q.desc, x + 24, y, w - 40, 19);
    y += 18;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a8272';
  ctx.font = 'italic 13px Georgia, serif';
  ctx.fillText('[J] close', canvas.width / 2, y + 10);
}

// like wrapText but returns the y position after the last line
function wrapTextAt(text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
  return y + lineH;
}

// --- UI ---------------------------------------------------------------------
function drawHud() {
  const p = player;
  ctx.textAlign = 'left';

  // health
  bar(16, 16, 190, 16, p.hp / p.maxHp, '#c04848', Math.ceil(p.hp) + ' / ' + p.maxHp);
  // xp
  bar(16, 38, 190, 8, p.xp / p.xpNext, '#8a5ac8', '');
  ctx.fillStyle = '#cfc8b8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('Lv ' + p.level, 212, 30);

  // gold / potions / arrows / sigils
  ctx.fillStyle = '#e8c860';
  ctx.fillText('● ' + p.gold + ' gold', 16, 66);
  ctx.fillStyle = '#e86060';
  ctx.fillText('▲ ' + p.potions + ' potions (Q)', 100, 66);
  ctx.fillStyle = '#d8cfa8';
  ctx.fillText('➳ ' + p.arrows + ' arrows', 235, 66);
  ctx.fillStyle = '#8fd6e8';
  ctx.fillText('◆ ' + p.sigils + ' / 3 sigils', 340, 66);
  ctx.fillStyle = '#8a8272';
  ctx.fillText('[J] journal', 16, 88);

  // interaction hint
  if (interactTarget && state === 'play' && mode === 'overworld') {
    ctx.textAlign = 'center';
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = '#f0e6c8';
    ctx.fillText('[E]  ' + interactTarget.label, canvas.width / 2, canvas.height - 96);
  }

  // announcements
  ctx.textAlign = 'center';
  ctx.font = 'italic 16px Georgia, serif';
  let my = canvas.height - 40;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    ctx.globalAlpha = Math.min(1, m.ttl);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const w = ctx.measureText(m.txt).width + 24;
    ctx.fillRect(canvas.width / 2 - w / 2, my - 17, w, 24);
    ctx.fillStyle = '#e8dfc8';
    ctx.fillText(m.txt, canvas.width / 2, my);
    my -= 30;
  }
  ctx.globalAlpha = 1;

  // boss health bar
  if (boss && boss.aggroed && !boss.dead) {
    const w = Math.min(460, canvas.width - 80);
    const x = canvas.width / 2 - w / 2;
    ctx.textAlign = 'center';
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#d8c8c8';
    ctx.fillText('M A L D R I C H,  T H E  F A L L E N  K I N G', canvas.width / 2, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, 38, w, 10);
    ctx.fillStyle = '#8a1e2e';
    ctx.fillRect(x, 38, w * (boss.hp / boss.hpMax), 10);
    ctx.strokeStyle = '#5a4a52';
    ctx.strokeRect(x + 0.5, 38.5, w, 10);
  }
}

function bar(x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = '#4a4438';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  if (label) {
    ctx.fillStyle = '#f0e6d0';
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h - 4);
    ctx.textAlign = 'left';
  }
}

function drawDialogue() {
  const d = dialogue;
  const w = Math.min(620, canvas.width - 60);
  const h = 110;
  const x = canvas.width / 2 - w / 2;
  const y = canvas.height - h - 34;
  ctx.fillStyle = 'rgba(8,8,14,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#6a5a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#e8c860';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(d.name, x + 18, y + 26);
  ctx.fillStyle = '#e8dfc8';
  ctx.font = '15px Georgia, serif';
  wrapText(d.lines[d.idx], x + 18, y + 50, w - 36, 20);
  ctx.fillStyle = '#8a8272';
  ctx.font = 'italic 12px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('[E] ' + (d.idx < d.lines.length - 1 ? 'continue' : 'close'), x + w - 14, y + h - 12);
}

function wrapText(text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function drawOverlay(title, sub, color) {
  ctx.fillStyle = 'rgba(4,4,10,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 16);
  ctx.fillStyle = '#cfc8b8';
  ctx.font = 'italic 17px Georgia, serif';
  ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 26);
}

function drawTitle() {
  const cx = canvas.width / 2;
  // drifting embers
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 40; i++) {
    const ex = ((i * 97 + time * (12 + (i % 5) * 6)) % (canvas.width + 40)) - 20;
    const ey = canvas.height - ((i * 61 + time * (18 + (i % 7) * 5)) % (canvas.height + 40));
    ctx.globalAlpha = 0.25 + (i % 4) * 0.12;
    ctx.fillStyle = i % 3 ? '#e87828' : '#f8c840';
    ctx.fillRect(ex, ey, 2, 2);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c860';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('E M B E R F A L L', cx, canvas.height * 0.32);
  ctx.fillStyle = '#8a8272';
  ctx.font = 'italic 19px Georgia, serif';
  ctx.fillText('A knight errant, a dying land, a crown that would not rust.', cx, canvas.height * 0.32 + 40);

  ctx.fillStyle = '#cfc8b8';
  ctx.font = '16px Georgia, serif';
  const lines = [
    'WASD / Arrows — move        Space — sword        Mouse — shoot arrows        Shift — dodge',
    'E — talk / read / descend        Q — potion        J — quest journal',
    '',
    'Find the three sigils.  Brave the dungeons below.  Face the Fallen King.',
  ];
  let ly = canvas.height * 0.55;
  for (const l of lines) { ctx.fillText(l, cx, ly); ly += 28; }

  const blink = Math.sin(time * 3) > -0.3;
  if (blink) {
    ctx.fillStyle = '#e8dfc8';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('— Press Enter —', cx, canvas.height * 0.78);
  }
}

requestAnimationFrame(frame);
