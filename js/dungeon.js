'use strict';

// ---------------------------------------------------------------------------
// FIRST-PERSON DUNGEONS — a raycasting renderer (Wolfenstein-style DDA).
// Descending a stairway switches the game from top-down to a claustrophobic
// first-person view: fog, torchlight, billboard monsters, chests, a relic.
// ---------------------------------------------------------------------------

const DG_DEFS = {
  barrow:  { name: 'Barrow of the Pale Count', wall: [82, 96, 132],  fogFloor: '#0a0c14', seed: 411 },
  ossuary: { name: 'The Ossuary',              wall: [128, 112, 84], fogFloor: '#100c08', seed: 902 },
};

const DG_SIZE = 21;
const DG_ENEMY = {
  skeleton: { hp: 45, dmg: 10, speed: 1.15, xp: 20 },
  wraith:   { hp: 40, dmg: 13, speed: 1.55, xp: 28 },
};

let dungeonStates = {}; // persisted per game so cleared halls stay cleared
let dg = null;          // active dungeon state
let dgFloaters = [];    // screen-space loot/xp text in the dungeon

function resetDungeons() { dungeonStates = {}; dg = null; dgFloaters = []; }

function dgAt(g, x, y) {
  if (x < 0 || y < 0 || x >= DG_SIZE || y >= DG_SIZE) return 1;
  return g[y * DG_SIZE + x];
}

function genDungeon(id) {
  const def = DG_DEFS[id];
  const rng = mulberry32(def.seed);
  const grid = new Uint8Array(DG_SIZE * DG_SIZE).fill(1);

  // drunkard-walk carving from the entry, plus a few stamped rooms
  let x = 2, y = 2;
  grid[y * DG_SIZE + x] = 0;
  for (let s = 0; s < 900; s++) {
    const r = rng();
    if (r < 0.25 && x > 1) x--;
    else if (r < 0.5 && x < DG_SIZE - 2) x++;
    else if (r < 0.75 && y > 1) y--;
    else if (y < DG_SIZE - 2) y++;
    grid[y * DG_SIZE + x] = 0;
  }
  for (let room = 0; room < 4; room++) {
    const rx = 2 + Math.floor(rng() * (DG_SIZE - 7));
    const ry = 2 + Math.floor(rng() * (DG_SIZE - 7));
    for (let dx = 0; dx < 3 + Math.floor(rng() * 2); dx++)
      for (let dy = 0; dy < 3; dy++)
        grid[(ry + dy) * DG_SIZE + (rx + dx)] = 0;
  }
  grid[2 * DG_SIZE + 2] = 0;

  // open cells sorted by distance from the entry — loot goes deep
  const open = [];
  for (let ty = 1; ty < DG_SIZE - 1; ty++)
    for (let tx = 1; tx < DG_SIZE - 1; tx++)
      if (dgAt(grid, tx, ty) === 0) open.push({ x: tx + 0.5, y: ty + 0.5, d: Math.hypot(tx - 2, ty - 2) });
  open.sort((a, b) => a.d - b.d);

  const far = (frac) => open[Math.min(open.length - 1, Math.floor(open.length * frac))];

  const sprites = [
    { kind: 'stairs', x: 2.5, y: 2.5 },
    { kind: 'chest', x: far(0.55).x, y: far(0.55).y, loot: 'gold', opened: false },
    { kind: 'chest', x: far(0.75).x, y: far(0.75).y, loot: 'supplies', opened: false },
    { kind: 'chest', x: far(0.999).x, y: far(0.999).y, loot: 'relic', opened: false },
  ];
  for (let b = 0; b < 6; b++) {
    const c = open[Math.floor(rng() * open.length)];
    sprites.push({ kind: 'brazier', x: c.x, y: c.y });
  }

  const enemies = [];
  const mix = id === 'barrow' ? ['skeleton', 'skeleton', 'skeleton', 'skeleton', 'wraith', 'wraith']
                              : ['skeleton', 'skeleton', 'skeleton', 'wraith', 'wraith', 'wraith'];
  for (const type of mix) {
    let c = null, guard = 0;
    do { c = open[Math.floor(rng() * open.length)]; } while (c.d < 5 && guard++ < 60);
    const s = DG_ENEMY[type];
    enemies.push({
      x: c.x, y: c.y, type, hp: s.hp, hpMax: s.hp, dmg: s.dmg,
      speed: s.speed, xp: s.xp, touchCd: 0, hurtT: 0, dead: false,
    });
  }

  return { id, def, grid, sprites, enemies, darts: [] };
}

function enterDungeon(info) {
  if (!dungeonStates[info.id]) dungeonStates[info.id] = genDungeon(info.id);
  dg = dungeonStates[info.id];
  dg.px = 2.5; dg.py = 2.5; dg.ang = Math.PI / 4;
  dg.swingT = 0; dg.walk = 0; dg.returnX = info.x; dg.returnY = info.y + 26;
  dgFloaters = [];
  interactTarget = null;
  mode = 'dungeon';
  banner.txt = dg.def.name; banner.ttl = 3.2; banner.last = '';
  if (!getQuest('relics')) {
    addQuest('relics', 'Bones Below', 'Two relics lie in the deep places of Emberfall — the Barrow and the Ossuary. Claim them both.');
    getQuest('relics').goal = 2;
  }
  msg('A / D turn — W / S walk — click to strike or shoot — E to open and ascend.');
}

function dgSolid(x, y) {
  const r = 0.22;
  return dgAt(dg.grid, Math.floor(x - r), Math.floor(y - r)) ||
         dgAt(dg.grid, Math.floor(x + r), Math.floor(y - r)) ||
         dgAt(dg.grid, Math.floor(x - r), Math.floor(y + r)) ||
         dgAt(dg.grid, Math.floor(x + r), Math.floor(y + r));
}

function dgFloat(txt, color) { dgFloaters.push({ txt, color, ttl: 1.6 }); }

function dungeonUpdate(dt) {
  const p = player;

  // turning + walking
  const turn = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  dg.ang += turn * 2.6 * dt;
  const fwd = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
  if (fwd) {
    const sp = 2.6 * fwd * dt;
    const nx = dg.px + Math.cos(dg.ang) * sp;
    const ny = dg.py + Math.sin(dg.ang) * sp;
    if (!dgSolid(nx, dg.py)) dg.px = nx;
    if (!dgSolid(dg.px, ny)) dg.py = ny;
    dg.walk += dt * Math.abs(fwd);
  }
  dg.swingT = Math.max(0, dg.swingT - dt);

  // strike (close) or loose an arrow (far)
  if ((mouseClicked || pressed[' ']) && p.atkCd <= 0) {
    let target = null, bd = 1.5;
    for (const e of dg.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - dg.px, e.y - dg.py);
      const a = Math.atan2(e.y - dg.py, e.x - dg.px);
      if (d < bd && Math.abs(angDiff(dg.ang, a)) < 0.75) { target = e; bd = d; }
    }
    if (target) {
      p.atkCd = 0.45;
      dg.swingT = 0.2;
      dgHitEnemy(target, p.dmg);
      const a = Math.atan2(target.y - dg.py, target.x - dg.px);
      const kx = target.x + Math.cos(a) * 0.35, ky = target.y + Math.sin(a) * 0.35;
      if (!dgSolid(kx, ky)) { target.x = kx; target.y = ky; }
    } else if (p.arrows > 0) {
      p.atkCd = 0.42;
      p.arrows--;
      dg.swingT = 0.12;
      dg.darts.push({
        x: dg.px + Math.cos(dg.ang) * 0.35, y: dg.py + Math.sin(dg.ang) * 0.35,
        vx: Math.cos(dg.ang) * 9, vy: Math.sin(dg.ang) * 9, ttl: 1.4,
      });
    } else {
      p.atkCd = 0.42;
      dg.swingT = 0.2;
      if (mouseClicked) msg('Nothing in reach — and no arrows to loose.');
    }
  }

  // arrows in flight
  for (const dart of dg.darts) {
    dart.ttl -= dt;
    dart.x += dart.vx * dt;
    dart.y += dart.vy * dt;
    if (dgAt(dg.grid, Math.floor(dart.x), Math.floor(dart.y))) { dart.ttl = 0; continue; }
    for (const e of dg.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - dart.x, e.y - dart.y) < 0.4) {
        dart.ttl = 0;
        dgHitEnemy(e, Math.max(6, Math.round(p.dmg * 0.75)));
        break;
      }
    }
  }
  dg.darts = dg.darts.filter((d) => d.ttl > 0);

  // the dead things walk
  for (const e of dg.enemies) {
    if (e.dead) continue;
    e.touchCd = Math.max(0, e.touchCd - dt);
    e.hurtT = Math.max(0, e.hurtT - dt);
    const d = Math.hypot(dg.px - e.x, dg.py - e.y);
    if (d < 7 && d > 0.55) {
      const a = Math.atan2(dg.py - e.y, dg.px - e.x);
      const nx = e.x + Math.cos(a) * e.speed * dt;
      const ny = e.y + Math.sin(a) * e.speed * dt;
      if (!dgSolid(nx, e.y)) e.x = nx;
      if (!dgSolid(e.x, ny)) e.y = ny;
    }
    if (d < 0.7 && e.touchCd <= 0 && p.inv <= 0) {
      e.touchCd = 0.9;
      p.hp -= e.dmg;
      p.inv = 0.6;
      p.lastHurt = 0;
      shake = 6;
      dgFloat('-' + e.dmg, '#e86060');
    }
  }

  // interact: chests and the way out
  if (pressed['e']) {
    let used = false;
    for (const s of dg.sprites) {
      const d = Math.hypot(s.x - dg.px, s.y - dg.py);
      if (s.kind === 'chest' && !s.opened && d < 1.1) {
        s.opened = true;
        used = true;
        openChest(s);
        break;
      }
      if (s.kind === 'stairs' && d < 1.1) {
        used = true;
        leaveDungeon();
        break;
      }
    }
    if (!used) { /* nothing near — the dark keeps its secrets */ }
  }

  for (const f of dgFloaters) f.ttl -= dt;
  dgFloaters = dgFloaters.filter((f) => f.ttl > 0);
}

function dgHitEnemy(e, dmg) {
  e.hp -= dmg;
  e.hurtT = 0.15;
  dgFloat(dmg + '', '#f0e6c8');
  if (e.hp <= 0) {
    e.dead = true;
    gainXp(e.xp);
    const g = 2 + Math.floor(Math.random() * 5);
    player.gold += g;
    dgFloat('+' + e.xp + ' xp   +' + g + 'g', '#b48ce8');
  }
}

function openChest(s) {
  if (s.loot === 'relic') {
    player.dmg += 4;
    const q = getQuest('relics');
    q.count++;
    msg('A relic of the old order — your blade drinks its weight. (+4 damage)');
    if (q.count >= q.goal) {
      completeQuest('relics');
      player.maxHp += 20;
      player.hp = player.maxHp;
      msg('Both relics hum in your pack. You feel unbreakable. (+20 max health)');
    }
  } else if (s.loot === 'supplies') {
    player.potions += 2;
    player.arrows += 8;
    msg('Inside: two potions and a bundle of arrows, dry after all these years.');
  } else {
    const g = 15 + Math.floor(Math.random() * 16);
    player.gold += g;
    msg('Old coin, older dust — ' + g + ' gold.');
  }
}

function leaveDungeon() {
  mode = 'overworld';
  player.x = dg.returnX;
  player.y = dg.returnY;
  banner.last = '';
  msg('You climb back into the night air.');
}

// ---------------------------------------------------------------------------
// RENDERING — DDA raycaster + billboard sprites + a sword in your hands.
// ---------------------------------------------------------------------------
function dungeonDraw() {
  const w = canvas.width, h = canvas.height;
  const colW = 2;
  const dirX = Math.cos(dg.ang), dirY = Math.sin(dg.ang);
  const planeX = -dirY * 0.66, planeY = dirX * 0.66;
  const flicker = 0.92 + Math.sin(time * 9) * 0.05 + Math.sin(time * 23) * 0.03;
  const [wr, wg, wb] = dg.def.wall;

  // ceiling and floor
  let grad = ctx.createLinearGradient(0, 0, 0, h / 2);
  grad.addColorStop(0, '#030308');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h / 2);
  grad = ctx.createLinearGradient(0, h / 2, 0, h);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(1, dg.def.fogFloor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, h / 2, w, h / 2);

  // walls
  const zbuf = new Float32Array(Math.ceil(w / colW));
  for (let c = 0; c < w; c += colW) {
    const cameraX = (2 * c) / w - 1;
    const rx = dirX + planeX * cameraX;
    const ry = dirY + planeY * cameraX;
    let mapX = Math.floor(dg.px), mapY = Math.floor(dg.py);
    const ddx = Math.abs(1 / (rx || 1e-9)), ddy = Math.abs(1 / (ry || 1e-9));
    let stepX, stepY, sideX, sideY;
    if (rx < 0) { stepX = -1; sideX = (dg.px - mapX) * ddx; } else { stepX = 1; sideX = (mapX + 1 - dg.px) * ddx; }
    if (ry < 0) { stepY = -1; sideY = (dg.py - mapY) * ddy; } else { stepY = 1; sideY = (mapY + 1 - dg.py) * ddy; }
    let side = 0, guard = 0;
    while (guard++ < 64) {
      if (sideX < sideY) { sideX += ddx; mapX += stepX; side = 0; }
      else { sideY += ddy; mapY += stepY; side = 1; }
      if (dgAt(dg.grid, mapX, mapY)) break;
    }
    const dist = side === 0 ? sideX - ddx : sideY - ddy;
    zbuf[c / colW] = dist;
    const lineH = Math.min(h * 2.2, h / Math.max(dist, 0.05));
    // where along the wall block this ray landed — gives blocks visible seams
    const wallX = side === 0 ? dg.py + dist * ry : dg.px + dist * rx;
    const frac = wallX - Math.floor(wallX);
    let shade = clamp(1.35 / (1 + dist * 0.5), 0.03, 1) * flicker * (side ? 0.72 : 1);
    if (frac < 0.06 || frac > 0.94) shade *= 0.62;
    ctx.fillStyle = 'rgb(' + Math.round(wr * shade) + ',' + Math.round(wg * shade) + ',' + Math.round(wb * shade) + ')';
    ctx.fillRect(c, (h - lineH) / 2, colW, lineH);
  }

  // sprites, farthest first
  const list = [];
  for (const s of dg.sprites) list.push(s);
  for (const e of dg.enemies) if (!e.dead) list.push(e);
  for (const dart of dg.darts) list.push({ kind: 'dart', x: dart.x, y: dart.y });
  const proj = [];
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  for (const s of list) {
    const sx = s.x - dg.px, sy = s.y - dg.py;
    const tX = invDet * (dirY * sx - dirX * sy);
    const tY = invDet * (-planeY * sx + planeX * sy);
    if (tY <= 0.15) continue;
    proj.push({ s, tX, tY });
  }
  proj.sort((a, b) => b.tY - a.tY);
  for (const pr of proj) {
    const { s, tX, tY } = pr;
    const screenX = (w / 2) * (1 + tX / tY);
    const col = Math.floor(screenX / colW);
    if (col >= 0 && col < zbuf.length && zbuf[col] < tY - 0.15) continue; // behind a wall
    const size = h / tY;
    const floorY = h / 2 + size / 2;
    const shade = clamp(1.4 / (1 + tY * 0.42), 0.1, 1) * flicker;
    drawDgSprite(s, screenX, floorY, size, shade);
  }

  drawDgWeapon(w, h);

  // crosshair
  ctx.strokeStyle = 'rgba(232,223,192,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, h / 2); ctx.lineTo(w / 2 - 2, h / 2);
  ctx.moveTo(w / 2 + 2, h / 2); ctx.lineTo(w / 2 + 6, h / 2);
  ctx.moveTo(w / 2, h / 2 - 6); ctx.lineTo(w / 2, h / 2 - 2);
  ctx.moveTo(w / 2, h / 2 + 2); ctx.lineTo(w / 2, h / 2 + 6);
  ctx.stroke();

  // hurt flash
  if (player.inv > 0.35) {
    ctx.fillStyle = 'rgba(160,20,20,' + (player.inv - 0.35) * 0.8 + ')';
    ctx.fillRect(0, 0, w, h);
  }

  // interact hint
  let hint = '';
  for (const s of dg.sprites) {
    const d = Math.hypot(s.x - dg.px, s.y - dg.py);
    if (s.kind === 'chest' && !s.opened && d < 1.1) hint = '[E]  Open the chest';
    else if (s.kind === 'stairs' && d < 1.1) hint = '[E]  Ascend to the surface';
  }
  if (hint) {
    ctx.textAlign = 'center';
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = '#f0e6c8';
    ctx.fillText(hint, w / 2, h - 96);
  }

  // floating combat text, stacked above the crosshair
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Georgia, serif';
  let fy = h / 2 - 50;
  for (let i = dgFloaters.length - 1; i >= 0; i--) {
    const f = dgFloaters[i];
    ctx.globalAlpha = Math.min(1, f.ttl);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, w / 2, fy - (1.6 - f.ttl) * 24);
    fy -= 20;
  }
  ctx.globalAlpha = 1;

  drawVignette();
}

function drawDgSprite(s, x, floorY, size, shade) {
  ctx.save();
  ctx.translate(x, floorY);
  ctx.scale(size / 100, size / 100); // painters work in a 100-unit box
  ctx.globalAlpha = shade;

  if (s.kind === 'brazier') {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(-10, -28, 20, 24);
    ctx.fillRect(-14, -32, 28, 6);
    const fl = Math.sin(time * 11 + s.x * 7) * 4;
    ctx.fillStyle = '#e87828';
    ctx.beginPath();
    ctx.moveTo(-10, -32);
    ctx.quadraticCurveTo(0, -62 - fl, 10, -32);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f8c840';
    ctx.beginPath();
    ctx.moveTo(-4, -32);
    ctx.quadraticCurveTo(0, -48 - fl, 4, -32);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = shade * 0.35;
    const g = ctx.createRadialGradient(0, -44, 0, 0, -44, 60);
    g.addColorStop(0, 'rgba(240,150,50,0.8)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-60, -104, 120, 120);
  } else if (s.kind === 'stairs') {
    ctx.fillStyle = '#1a1c26';
    ctx.fillRect(-26, -66, 52, 66);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(150,160,190,' + (0.5 - i * 0.11) + ')';
      ctx.fillRect(-20 + i * 3, -12 - i * 14, 40 - i * 6, 8);
    }
    ctx.fillStyle = 'rgba(190,210,255,0.25)';
    ctx.fillRect(-10, -66, 20, 10);
  } else if (s.kind === 'chest') {
    if (s.opened) {
      ctx.fillStyle = '#3a2c1a';
      ctx.fillRect(-18, -20, 36, 20);
      ctx.fillStyle = '#241a0e';
      ctx.fillRect(-16, -18, 32, 10);
    } else {
      ctx.fillStyle = '#4a3820';
      ctx.fillRect(-18, -28, 36, 28);
      ctx.fillStyle = '#5c4628';
      ctx.fillRect(-18, -28, 36, 10);
      ctx.fillStyle = '#c8a850';
      ctx.fillRect(-18, -17, 36, 3);
      ctx.fillRect(-3, -16, 6, 8);
      if (s.loot === 'relic') {
        ctx.fillStyle = 'rgba(143,214,232,' + (0.4 + Math.sin(time * 4) * 0.2) + ')';
        ctx.fillRect(-4, -40, 8, 8);
      }
    }
  } else if (s.kind === 'dart') {
    ctx.fillStyle = '#f4ecd0';
    ctx.fillRect(-3, -52, 6, 6);
  } else if (s.type === 'skeleton') {
    const flash = s.hurtT > 0;
    const sway = Math.sin(time * 6 + s.x * 5) * 3;
    ctx.fillStyle = flash ? '#ffffff' : '#c8c2b0';
    ctx.fillRect(-4 + sway / 2, -46, 8, 26);       // spine
    ctx.fillRect(-16 + sway / 2, -42, 32, 4);      // ribs
    ctx.fillRect(-14 + sway / 2, -34, 28, 4);
    ctx.fillRect(-12 + sway / 2, -26, 24, 4);
    ctx.fillStyle = flash ? '#ffffff' : '#d8d2c0';
    ctx.beginPath(); ctx.arc(sway / 2, -56, 12, 0, Math.PI * 2); ctx.fill(); // skull
    ctx.fillStyle = '#141418';
    ctx.fillRect(-7 + sway / 2, -60, 5, 6);
    ctx.fillRect(2 + sway / 2, -60, 5, 6);
    ctx.fillRect(-4 + sway / 2, -50, 8, 3);
    ctx.strokeStyle = flash ? '#ffffff' : '#a8a290'; // legs + blade
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(-8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -34); ctx.lineTo(30, -50); ctx.stroke();
    if (s.hp < s.hpMax) dgHpBar(s);
  } else if (s.type === 'wraith') {
    const flash = s.hurtT > 0;
    const bob = Math.sin(time * 3 + s.x * 5) * 5;
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = flash ? '#d8f0f8' : '#26364a';
    ctx.beginPath();
    ctx.moveTo(0, -70 + bob);
    ctx.quadraticCurveTo(-28, -40 + bob, -20, 0);
    ctx.quadraticCurveTo(0, -16 + bob / 2, 20, 0);
    ctx.quadraticCurveTo(28, -40 + bob, 0, -70 + bob);
    ctx.fill();
    ctx.fillStyle = '#8fd6e8';
    ctx.fillRect(-9, -52 + bob, 5, 7);
    ctx.fillRect(4, -52 + bob, 5, 7);
    if (s.hp < s.hpMax) dgHpBar(s);
  }
  ctx.restore();
}

function dgHpBar(s) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(-16, -80, 32, 4);
  ctx.fillStyle = '#c04848';
  ctx.fillRect(-16, -80, 32 * (s.hp / s.hpMax), 4);
}

// The knight's sword, held low and ready at the bottom of the screen.
function drawDgWeapon(w, h) {
  const bob = Math.sin(dg.walk * 7) * 8;
  const prog = dg.swingT > 0 ? 1 - dg.swingT / 0.2 : 0;
  const swing = prog > 0 ? Math.sin(prog * Math.PI) : 0;
  ctx.save();
  ctx.translate(w * 0.74 - swing * w * 0.22, h + bob - swing * 60);
  ctx.rotate(-0.5 - swing * 0.9);
  // blade
  const g = ctx.createLinearGradient(0, -300, 0, 0);
  g.addColorStop(0, '#dfe4ee');
  g.addColorStop(1, '#8a93a6');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-11, -60);
  ctx.lineTo(-4, -310);
  ctx.lineTo(4, -310);
  ctx.lineTo(11, -60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; // edge highlight
  ctx.fillRect(-2, -308, 3, 250);
  // guard + grip
  ctx.fillStyle = '#c8a850';
  ctx.fillRect(-30, -62, 60, 10);
  ctx.fillStyle = '#3a2c1a';
  ctx.fillRect(-8, -52, 16, 60);
  ctx.restore();
}
