'use strict';

// ---------------------------------------------------------------------------
// FIRST-PERSON OVERWORLD — the whole of Emberfall through the knight's eyes.
// Raycasts the world map (trees, walls, water, the gate) and billboards
// everything that stands in it. Press M for the old top-down view as a map.
// ---------------------------------------------------------------------------

let fpSwing = 0;
let fpWalk = 0;

// Fixed stars, hung by azimuth so they wheel past as you turn.
const FP_STARS = [];
{
  const srng = mulberry32(77);
  for (let i = 0; i < 70; i++) {
    FP_STARS.push({ az: srng() * Math.PI * 2 - Math.PI, el: 0.08 + srng() * 0.55, tw: srng() * 6 });
  }
}

function fpSolidType(tx, ty) {
  const t = getT(tx, ty);
  if (t === T.TREE || t === T.WALL || t === T.WATER) return t;
  if (t === T.GATE && !gateOpen) return t;
  return 0;
}

function fpUpdate(dt) {
  const p = player;
  fpSwing = Math.max(0, fpSwing - dt);

  // turn and walk
  const turn = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  p.face += turn * 2.7 * dt;
  const fwd = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
  if (pressed['shift'] && p.dodgeCd <= 0) {
    p.dodging = 0.16;
    p.dodgeCd = 0.9;
    p.inv = Math.max(p.inv, 0.32);
    p.dodgeDirX = Math.cos(p.face) * (fwd < 0 ? -1 : 1);
    p.dodgeDirY = Math.sin(p.face) * (fwd < 0 ? -1 : 1);
  }
  if (p.dodging > 0) {
    moveEntity(p, p.dodgeDirX * 460 * dt, p.dodgeDirY * 460 * dt, false);
    fpWalk += dt * 2;
  } else if (fwd) {
    moveEntity(p, Math.cos(p.face) * p.speed * fwd * dt, Math.sin(p.face) * p.speed * fwd * dt, false);
    fpWalk += dt;
  }

  // one button fights: sword up close, bow at range
  if ((mouseClicked || pressed[' ']) && p.atkCd <= 0) {
    let target = null, bd = 74;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < bd + e.r && Math.abs(angDiff(p.face, angTo(p.x, p.y, e.x, e.y))) < 0.8) { target = e; bd = d; }
    }
    if (target && p.hasSword) {
      p.atkCd = 0.45;
      fpSwing = 0.2;
      p.swingDir = p.face;
      hitEnemy(target, p.dmg, angTo(p.x, p.y, target.x, target.y));
    } else if (target && !p.hasSword) {
      p.atkCd = 0.4;
      msg('Your hands are empty. The sword waits in the stone, east of the fire.');
    } else if (p.arrows > 0) {
      p.atkCd = 0.42;
      p.arrows--;
      fpSwing = 0.1;
      projectiles.push({
        x: p.x + Math.cos(p.face) * 14, y: p.y + Math.sin(p.face) * 14,
        vx: Math.cos(p.face) * 440, vy: Math.sin(p.face) * 440,
        ttl: 1.5, dmg: Math.max(6, Math.round(p.dmg * 0.75)),
        hostile: false, kind: 'arrow', ang: p.face,
      });
    } else {
      p.atkCd = 0.42;
      fpSwing = 0.2;
      if (mouseClicked) msg('Out of arrows — and nothing in reach of the blade.');
    }
  }

  overworldSystems(dt, p);

  for (const f of dgFloaters) f.ttl -= dt;
  dgFloaters = dgFloaters.filter((f) => f.ttl > 0);
}

// ---------------------------------------------------------------------------
function fpDraw() {
  const w = canvas.width, h = canvas.height;
  const horizon = h / 2;
  const p = player;
  const px2 = p.x / TILE, py2 = p.y / TILE;
  const dirX = Math.cos(p.face), dirY = Math.sin(p.face);
  const planeX = -dirY * 0.66, planeY = dirX * 0.66;
  const colW = 2;
  const flicker = 0.94 + Math.sin(time * 9) * 0.04 + Math.sin(time * 21) * 0.02;

  // night sky
  let g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#070a16');
  g.addColorStop(1, '#171d3c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);

  // stars wheel as you turn
  for (const s of FP_STARS) {
    const rel = angDiff(p.face, s.az);
    if (Math.abs(rel) > 0.85) continue;
    const sx = w / 2 + (rel / 0.85) * (w * 0.62);
    const sy = horizon * (1 - s.el);
    ctx.globalAlpha = 0.35 + Math.sin(time * 2 + s.tw) * 0.2;
    ctx.fillStyle = '#cdd6ee';
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  // the moon hangs over the north — follow it to the castle
  const mrel = angDiff(p.face, -Math.PI / 2);
  if (Math.abs(mrel) < 0.95) {
    const mx = w / 2 + (mrel / 0.85) * (w * 0.62);
    const my = horizon * 0.32;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 90);
    mg.addColorStop(0, 'rgba(200,215,245,0.35)');
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - 90, my - 90, 180, 180);
    ctx.fillStyle = '#d8e2f4';
    ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,175,205,0.5)';
    ctx.beginPath(); ctx.arc(mx - 8, my - 5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 7, my + 8, 4, 0, Math.PI * 2); ctx.fill();
  }

  // ground
  g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, '#0a0e0a');
  g.addColorStop(1, '#1e2a1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, w, h - horizon);

  // walls, trees, water — raycast
  const zbuf = new Float32Array(Math.ceil(w / colW));
  for (let c = 0; c < w; c += colW) {
    const cameraX = (2 * c) / w - 1;
    const rx = dirX + planeX * cameraX;
    const ry = dirY + planeY * cameraX;
    let mapX = Math.floor(px2), mapY = Math.floor(py2);
    const ddx = Math.abs(1 / (rx || 1e-9)), ddy = Math.abs(1 / (ry || 1e-9));
    let stepX, stepY, sideX, sideY;
    if (rx < 0) { stepX = -1; sideX = (px2 - mapX) * ddx; } else { stepX = 1; sideX = (mapX + 1 - px2) * ddx; }
    if (ry < 0) { stepY = -1; sideY = (py2 - mapY) * ddy; } else { stepY = 1; sideY = (mapY + 1 - py2) * ddy; }
    let side = 0, hit = 0, guard = 0;
    while (guard++ < 40) {
      if (sideX < sideY) { sideX += ddx; mapX += stepX; side = 0; }
      else { sideY += ddy; mapY += stepY; side = 1; }
      hit = fpSolidType(mapX, mapY);
      if (hit) break;
    }
    const d0 = side === 0 ? sideX - ddx : sideY - ddy;
    zbuf[c / colW] = hit ? d0 : 999;
    if (!hit) continue;
    const lineH = Math.min(h * 2.2, h / Math.max(d0, 0.05));
    let cr, cg, cb;
    if (hit === T.TREE) {
      const ashen = mapY < 30;
      cr = ashen ? 42 : 26; cg = ashen ? 42 : 50; cb = ashen ? 38 : 28;
    } else if (hit === T.WALL) { cr = 60; cg = 60; cb = 74; }
    else if (hit === T.WATER) { cr = 22; cg = 40; cb = 66; }
    else { cr = 96; cg = 76; cb = 42; } // the gate
    let shade = clamp(1.65 / (1 + d0 * 0.26), 0.05, 1) * flicker * (side ? 0.72 : 1);
    const wallX = side === 0 ? py2 + d0 * ry : px2 + d0 * rx;
    const frac = wallX - Math.floor(wallX);
    if (frac < 0.06 || frac > 0.94) shade *= 0.6;
    ctx.fillStyle = 'rgb(' + Math.round(cr * shade) + ',' + Math.round(cg * shade) + ',' + Math.round(cb * shade) + ')';
    ctx.fillRect(c, (h - lineH) / 2, colW, lineH);
  }

  // everything that stands in the world, as billboards
  const list = [];
  const seen = 22; // tiles
  const addS = (kind, x, y, obj) => {
    const dx = x / TILE - px2, dy = y / TILE - py2;
    if (dx * dx + dy * dy < seen * seen) list.push({ kind, x: x / TILE, y: y / TILE, obj });
  };
  for (const d of world.decors) addS(d.kind, d.x, d.y, d);
  for (const s of world.lores) addS('lore', s.x, s.y, s);
  for (const n of world.npcs) addS('npc', n.x, n.y, n);
  for (const k of pickups) addS('pickup', k.x, k.y, k);
  for (const e of enemies) if (!e.dead) addS('enemy', e.x, e.y, e);
  for (const pr of projectiles) addS(pr.hostile ? 'bolt' : 'arrowfly', pr.x, pr.y, pr);

  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const proj = [];
  for (const s of list) {
    const sx = s.x - px2, sy = s.y - py2;
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
    if (col >= 0 && col < zbuf.length && zbuf[col] < tY - 0.2) continue;
    const size = h / tY;
    const floorY = h / 2 + size / 2;
    const shade = clamp(1.6 / (1 + tY * 0.24), 0.14, 1) * flicker;
    fpPaint(s, screenX, floorY, size, shade);
  }

  drawFpWeapon(w, h);

  // crosshair
  ctx.strokeStyle = 'rgba(232,223,192,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, h / 2); ctx.lineTo(w / 2 - 2, h / 2);
  ctx.moveTo(w / 2 + 2, h / 2); ctx.lineTo(w / 2 + 6, h / 2);
  ctx.moveTo(w / 2, h / 2 - 6); ctx.lineTo(w / 2, h / 2 - 2);
  ctx.moveTo(w / 2, h / 2 + 2); ctx.lineTo(w / 2, h / 2 + 6);
  ctx.stroke();

  // compass ribbon
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  for (const [az, label] of [[-Math.PI / 2, 'N'], [0, 'E'], [Math.PI / 2, 'S'], [Math.PI, 'W'], [-Math.PI, 'W']]) {
    const rel = angDiff(p.face, az);
    if (Math.abs(rel) > 1.1) continue;
    const cx2 = w / 2 + (rel / 1.1) * (w * 0.35);
    ctx.globalAlpha = 1 - Math.abs(rel) / 1.1 * 0.7;
    ctx.fillStyle = label === 'N' ? '#e8c860' : '#9a927e';
    ctx.fillText(label, cx2, 26);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(232,223,192,0.5)';
  ctx.fillRect(w / 2 - 1, 32, 2, 6);

  // hurt flash
  if (p.inv > 0.35) {
    ctx.fillStyle = 'rgba(160,20,20,' + (p.inv - 0.35) * 0.8 + ')';
    ctx.fillRect(0, 0, w, h);
  }

  // combat text above the crosshair
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

// Billboard painters, working in a 100-unit box anchored at the ground line.
function fpPaint(s, x, floorY, size, shade) {
  ctx.save();
  ctx.translate(x, floorY);
  ctx.scale(size / 100, size / 100);
  ctx.globalAlpha = shade;
  const o = s.obj;

  if (s.kind === 'campfire') {
    ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(16, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(16, -2); ctx.stroke();
    fpFlame(0, -8, 22, o.x);
  } else if (s.kind === 'brazier') {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(-9, -24, 18, 22);
    ctx.fillRect(-13, -28, 26, 5);
    fpFlame(0, -28, 16, o.x);
  } else if (s.kind === 'lantern') {
    ctx.strokeStyle = '#3a3228'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(16, -56); ctx.stroke();
    const fl = 0.8 + Math.sin(time * 7 + o.x) * 0.2;
    ctx.fillStyle = 'rgba(248,200,64,' + fl + ')';
    ctx.fillRect(10, -56, 12, 15);
    ctx.globalAlpha = Math.min(1, shade * 0.75 + 0.2);
    const g = ctx.createRadialGradient(16, -48, 0, 16, -48, 64);
    g.addColorStop(0, 'rgba(248,200,64,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-48, -112, 128, 128);
  } else if (s.kind === 'shrine') {
    ctx.fillStyle = '#3e424e';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.quadraticCurveTo(-16, -22, 0, -24);
    ctx.quadraticCurveTo(16, -22, 20, 0);
    ctx.closePath(); ctx.fill();
    if (!world.shrine.taken) {
      const shimmer = 0.7 + Math.sin(time * 3) * 0.3;
      ctx.strokeStyle = 'rgba(200,204,216,' + shimmer + ')';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -66); ctx.stroke();
      ctx.strokeStyle = '#c8a850'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-11, -58); ctx.lineTo(11, -58); ctx.stroke();
    }
  } else if (s.kind === 'grave') {
    ctx.fillStyle = '#3c3c46';
    ctx.fillRect(-9, -24, 18, 24);
    ctx.beginPath(); ctx.arc(0, -24, 9, Math.PI, 0); ctx.fill();
  } else if (s.kind === 'stairs') {
    ctx.fillStyle = '#1a1c26';
    ctx.fillRect(-22, -40, 44, 40);
  } else if (s.kind === 'lore') {
    ctx.fillStyle = '#464652';
    ctx.beginPath();
    ctx.moveTo(-11, 0); ctx.lineTo(-8, -42); ctx.lineTo(8, -42); ctx.lineTo(11, 0);
    ctx.closePath(); ctx.fill();
    const glow = 0.4 + Math.sin(time * 2 + o.x) * 0.2;
    ctx.fillStyle = 'rgba(143,214,232,' + glow + ')';
    ctx.fillRect(-3, -34, 6, 6);
    ctx.fillRect(-2, -24, 4, 14);
  } else if (s.kind === 'npc') {
    const robe = o.kind === 'elder' ? '#3a4a3a' : '#5a4428';
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.quadraticCurveTo(-20, -20, -16, 0);
    ctx.lineTo(16, 0);
    ctx.quadraticCurveTo(20, -20, 0, -52);
    ctx.fill();
    ctx.fillStyle = '#c8a888';
    ctx.beginPath(); ctx.arc(0, -38, 8, 0, Math.PI * 2); ctx.fill();
  } else if (s.kind === 'pickup') {
    if (o.type === 'gold') {
      ctx.fillStyle = '#e8c860';
      ctx.beginPath(); ctx.arc(-4, -4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -3, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -9, 5, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 'potion') {
      ctx.fillStyle = '#c04848';
      ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(-3, -20, 6, 7);
    } else if (o.type === 'arrows') {
      ctx.strokeStyle = '#c8bfa0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(8, -16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -16); ctx.lineTo(8, -2); ctx.stroke();
    }
  } else if (s.kind === 'bolt') {
    ctx.fillStyle = '#7a5ac8';
    ctx.beginPath(); ctx.arc(0, -46, 7 + Math.sin(time * 20) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dcd0ff';
    ctx.beginPath(); ctx.arc(0, -46, 3, 0, Math.PI * 2); ctx.fill();
  } else if (s.kind === 'arrowfly') {
    ctx.fillStyle = '#f4ecd0';
    ctx.fillRect(-4, -48, 8, 4);
  } else if (s.kind === 'enemy') {
    fpPaintEnemy(o);
  }
  ctx.restore();
}

function fpFlame(x, y, sc, seed) {
  const fl = Math.sin(time * 11 + seed) * (sc * 0.2);
  ctx.fillStyle = '#e87828';
  ctx.beginPath();
  ctx.moveTo(x - sc * 0.5, y);
  ctx.quadraticCurveTo(x, y - sc * 1.8 - fl, x + sc * 0.5, y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8c840';
  ctx.beginPath();
  ctx.moveTo(x - sc * 0.22, y);
  ctx.quadraticCurveTo(x, y - sc - fl, x + sc * 0.22, y);
  ctx.closePath(); ctx.fill();
}

function fpPaintEnemy(e) {
  const flash = e.hurtT > 0;
  if (e.type === 'wolf') {
    ctx.fillStyle = flash ? '#e8e8e8' : '#4a4a52';
    ctx.beginPath(); ctx.ellipse(0, -14, 22, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? '#e8e8e8' : '#3a3a42';
    ctx.fillRect(10, -36, 5, 7); ctx.fillRect(19, -36, 5, 7);
    ctx.fillStyle = '#d8b830';
    ctx.fillRect(19, -25, 4, 4);
    ctx.strokeStyle = flash ? '#e8e8e8' : '#3a3a42'; ctx.lineWidth = 4;
    for (const lx of [-12, -4, 6, 14]) {
      ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx, 0); ctx.stroke();
    }
  } else if (e.type === 'skeleton') {
    const sway = Math.sin(time * 6 + e.homeX) * 3;
    ctx.fillStyle = flash ? '#ffffff' : '#c8c2b0';
    ctx.fillRect(-4 + sway / 2, -46, 8, 26);
    ctx.fillRect(-16 + sway / 2, -42, 32, 4);
    ctx.fillRect(-14 + sway / 2, -34, 28, 4);
    ctx.fillRect(-12 + sway / 2, -26, 24, 4);
    ctx.fillStyle = flash ? '#ffffff' : '#d8d2c0';
    ctx.beginPath(); ctx.arc(sway / 2, -56, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#141418';
    ctx.fillRect(-7 + sway / 2, -60, 5, 6);
    ctx.fillRect(2 + sway / 2, -60, 5, 6);
    ctx.strokeStyle = flash ? '#ffffff' : '#a8a290'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(-8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -34); ctx.lineTo(30, -50); ctx.stroke();
  } else if (e.type === 'wraith') {
    const bob = Math.sin(time * 3 + e.homeX) * 5;
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
  } else if (e.type === 'boss') {
    // Maldrich: a tall human silhouette in kingly armor, sword point-down
    ctx.scale(1.6, 1.6);
    const body = flash ? '#e8d8d8' : '#16141e';
    // tattered royal cape behind him
    ctx.fillStyle = flash ? '#e8d8d8' : '#3a141c';
    ctx.beginPath();
    ctx.moveTo(-15, -52);
    ctx.quadraticCurveTo(-26, -24, -20, 0);
    ctx.lineTo(20, 0);
    ctx.quadraticCurveTo(26, -24, 15, -52);
    ctx.closePath(); ctx.fill();
    // legs
    ctx.fillStyle = body;
    ctx.fillRect(-10, -26, 8, 26);
    ctx.fillRect(2, -26, 8, 26);
    // armored torso, tapering to the waist
    ctx.beginPath();
    ctx.moveTo(-15, -52); ctx.lineTo(15, -52);
    ctx.lineTo(10, -24); ctx.lineTo(-10, -24);
    ctx.closePath(); ctx.fill();
    // pauldrons and arms
    ctx.fillRect(-21, -55, 10, 9);
    ctx.fillRect(11, -55, 10, 9);
    ctx.fillRect(-19, -48, 6, 22);
    ctx.fillRect(13, -48, 6, 22);
    // faint armor edge-light so he reads as a figure, not a blob
    ctx.strokeStyle = flash ? '#ffffff' : 'rgba(122,110,140,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-15, -52); ctx.lineTo(-10, -24); ctx.moveTo(15, -52); ctx.lineTo(10, -24);
    ctx.moveTo(-13, -44); ctx.lineTo(13, -44);
    ctx.stroke();
    // head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, -61, 8, 0, Math.PI * 2); ctx.fill();
    // the crown that would not rust
    ctx.fillStyle = '#e8c860';
    ctx.beginPath();
    ctx.moveTo(-8, -67); ctx.lineTo(-8, -77); ctx.lineTo(-4, -69);
    ctx.lineTo(0, -79); ctx.lineTo(4, -69); ctx.lineTo(8, -77);
    ctx.lineTo(8, -67); ctx.closePath(); ctx.fill();
    // burning eyes
    ctx.fillStyle = '#e83030';
    ctx.fillRect(-5, -63, 4, 4);
    ctx.fillRect(2, -63, 4, 4);
    // greatsword, point resting at his feet
    ctx.strokeStyle = flash ? '#ffffff' : '#9aa0ae';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(19, -30); ctx.lineTo(19, -2); ctx.stroke();
    ctx.fillStyle = '#c8a850';
    ctx.fillRect(13, -33, 12, 4);
    ctx.fillRect(17, -38, 4, 5);
    if (e.charging > 0) {
      ctx.strokeStyle = 'rgba(232,48,48,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -34, 34 + Math.sin(time * 25) * 4, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (e.hp < e.hpMax) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-16, -80, 32, 4);
    ctx.fillStyle = '#c04848';
    ctx.fillRect(-16, -80, 32 * (e.hp / e.hpMax), 4);
  }
}

// The knight's arms: sword once drawn, an empty gauntlet before.
function drawFpWeapon(w, h) {
  const bob = Math.sin(fpWalk * 7) * 8;
  const prog = fpSwing > 0 ? 1 - fpSwing / 0.2 : 0;
  const swing = prog > 0 ? Math.sin(prog * Math.PI) : 0;
  ctx.save();
  ctx.translate(w * 0.74 - swing * w * 0.22, h + bob - swing * 60);
  ctx.rotate(-0.5 - swing * 0.9);
  if (player.hasSword) {
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
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-2, -308, 3, 250);
    ctx.fillStyle = '#c8a850';
    ctx.fillRect(-30, -62, 60, 10);
    ctx.fillStyle = '#3a2c1a';
    ctx.fillRect(-8, -52, 16, 60);
  } else {
    // an empty steel gauntlet, waiting for a blade
    ctx.fillStyle = '#7d8698';
    ctx.beginPath(); ctx.ellipse(0, -40, 22, 30, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3c4250'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#8a93a6';
    for (const fx of [-12, -2, 8]) ctx.fillRect(fx, -72, 9, 26);
  }
  ctx.restore();
}
