'use strict';

// ---------------------------------------------------------------------------
// The world of Emberfall: a 96x96 tile map generated deterministically.
// Layout: village in the center-south, three sigil ruins (west / east / south),
// and the cursed castle of King Maldrich in the north.
// ---------------------------------------------------------------------------

const TILE = 32;
const MW = 96;
const MH = 96;

const T = { GRASS: 0, TREE: 1, WATER: 2, WALL: 3, FLOOR: 4, PATH: 5, GATE: 6 };

const world = {
  map: new Uint8Array(MW * MH),
  lights: [],     // {x, y, r, warm} static light sources
  decors: [],     // {x, y, kind} campfire / braziers / gravestones
  spawns: [],     // {x, y, type} enemy spawn points
  pickups: [],    // {x, y, type, val}
  npcs: [],       // {x, y, name, kind}
  lores: [],      // {x, y, text} readable standing stones
  gateTiles: [],
  dungeons: [],   // {x, y, id, name} first-person dungeon entrances (unused in the simple quest)
  shrine: { x: 0, y: 0, taken: false }, // the sword in the stone
  playerSpawn: { x: 0, y: 0 },
  bossSpawn: { x: 0, y: 0 },
  village: { tx: 48, ty: 62 },
};

function getT(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return T.WALL;
  return world.map[ty * MW + tx];
}

function setT(tx, ty, t) {
  if (tx >= 0 && ty >= 0 && tx < MW && ty < MH) world.map[ty * MW + tx] = t;
}

function px(tx) { return tx * TILE + TILE / 2; } // tile center in pixels

function genWorld() {
  const rng = mulberry32(20260831);
  world.lights.length = 0;
  world.decors.length = 0;
  world.spawns.length = 0;
  world.pickups.length = 0;
  world.npcs.length = 0;
  world.lores.length = 0;
  world.gateTiles.length = 0;
  world.dungeons.length = 0;
  world.map.fill(T.GRASS);

  // --- mountains ring the edge of the world ---
  for (let i = 0; i < MW; i++) {
    for (let b = 0; b < 3; b++) {
      setT(i, b, T.WALL); setT(i, MH - 1 - b, T.WALL);
      setT(b, i, T.WALL); setT(MW - 1 - b, i, T.WALL);
    }
  }

  // --- lakes: a few blobby random walks ---
  for (let l = 0; l < 4; l++) {
    let lx = 10 + Math.floor(rng() * (MW - 20));
    let ly = 30 + Math.floor(rng() * (MH - 45));
    for (let s = 0; s < 50; s++) {
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          if (getT(lx + dx, ly + dy) === T.GRASS) setT(lx + dx, ly + dy, T.WATER);
      lx += Math.floor(rng() * 3) - 1;
      ly += Math.floor(rng() * 3) - 1;
      lx = clamp(lx, 5, MW - 6); ly = clamp(ly, 5, MH - 6);
    }
  }

  // --- forests: many small tree clusters ---
  for (let c = 0; c < 300; c++) {
    const cx = 4 + Math.floor(rng() * (MW - 8));
    const cy = 4 + Math.floor(rng() * (MH - 8));
    const rad = 1 + Math.floor(rng() * 3);
    for (let dx = -rad; dx <= rad; dx++) {
      for (let dy = -rad; dy <= rad; dy++) {
        if (dx * dx + dy * dy <= rad * rad && rng() < 0.65 &&
            getT(cx + dx, cy + dy) === T.GRASS) {
          setT(cx + dx, cy + dy, T.TREE);
        }
      }
    }
  }

  // --- scattered gravestones for atmosphere (denser in the south) ---
  for (let g = 0; g < 40; g++) {
    const gx = 6 + Math.floor(rng() * (MW - 12));
    const gy = 40 + Math.floor(rng() * (MH - 46));
    if (getT(gx, gy) === T.GRASS) {
      world.decors.push({ x: px(gx), y: px(gy), kind: 'grave' });
    }
  }

  // --- the village: a cleared circle with a campfire ---
  const V = world.village;
  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = -8; dy <= 8; dy++) {
      if (dx * dx + dy * dy <= 64) setT(V.tx + dx, V.ty + dy, T.GRASS);
    }
  }
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -2; dy <= 2; dy++)
      setT(V.tx + dx, V.ty + dy, T.PATH);
  world.decors.push({ x: px(V.tx), y: px(V.ty), kind: 'campfire' });
  world.lights.push({ x: px(V.tx), y: px(V.ty), r: 170, warm: true });
  world.playerSpawn = { x: px(V.tx), y: px(V.ty + 3) };

  world.npcs.push({ x: px(V.tx - 2), y: px(V.ty - 1), name: 'Elder Rowena', kind: 'elder' });
  world.npcs.push({ x: px(V.tx + 2), y: px(V.ty - 1), name: 'Trader Osric', kind: 'trader' });

  // the sword in the stone, on the village's eastern edge
  setT(V.tx + 6, V.ty, T.GRASS);
  world.shrine = { x: px(V.tx + 6), y: px(V.ty), taken: false };
  world.decors.push({ x: px(V.tx + 6), y: px(V.ty), kind: 'shrine' });
  world.lights.push({ x: px(V.tx + 6), y: px(V.ty), r: 110, warm: false });

  // --- three sigil ruins ---
  const ruins = [
    { tx: 16, ty: 48 }, // west woods
    { tx: 80, ty: 48 }, // eastern marsh
    { tx: 48, ty: 84 }, // southern gravehill
  ];
  for (const r of ruins) makeRuin(r.tx, r.ty, rng);

  // --- the castle of the Fallen King ---
  const CX0 = 36, CX1 = 60, CY0 = 6, CY1 = 26;
  for (let tx = CX0; tx <= CX1; tx++) {
    for (let ty = CY0; ty <= CY1; ty++) {
      const edge = tx === CX0 || tx === CX1 || ty === CY0 || ty === CY1;
      setT(tx, ty, edge ? T.WALL : T.FLOOR);
    }
  }
  for (let tx = 47; tx <= 49; tx++) {
    setT(tx, CY1, T.GATE);
    world.gateTiles.push({ tx, ty: CY1 });
  }
  // throne dais
  for (let tx = 46; tx <= 50; tx++)
    for (let ty = CY0 + 2; ty <= CY0 + 5; ty++)
      setT(tx, ty, T.PATH);
  world.bossSpawn = { x: px(48), y: px(CY0 + 4) };
  for (const [lx, ly] of [[38, 8], [58, 8], [38, 24], [58, 24], [44, 8], [52, 8]]) {
    world.decors.push({ x: px(lx), y: px(ly), kind: 'brazier' });
    world.lights.push({ x: px(lx), y: px(ly), r: 130, warm: true });
  }

  // --- paths from the village to every point of interest ---
  carvePath(V.tx, V.ty - 3, 48, CY1 + 1);        // the North Road, to the castle gate
  carvePath(V.tx - 3, V.ty, ruins[0].tx, ruins[0].ty + 5); // west ruin
  carvePath(V.tx + 3, V.ty, ruins[1].tx, ruins[1].ty + 5); // east ruin
  carvePath(V.tx, V.ty + 3, ruins[2].tx, ruins[2].ty + 5); // south ruin

  // --- the scenic North Road: lantern posts light the whole way ---
  for (let ly = 30; ly <= 56; ly += 5) {
    const side = (ly / 5) % 2 === 0 ? 46 : 51;
    setT(side, ly, T.GRASS);
    world.decors.push({ x: px(side), y: px(ly), kind: 'lantern' });
    world.lights.push({ x: px(side), y: px(ly), r: 125, warm: true });
  }

  // --- lore stones (now pure scenery and story) ---
  addLore(34, 56, 'Here fell Ser Adric, who rode north and did not return. "The crown is cursed," they told him. He laughed.');
  addLore(62, 72, 'When the sun guttered out, King Maldrich swore he would buy it back with blood. The blood he spent was ours.');
  addLore(50, 38, 'A traveler’s mark: "From this bend you can see the whole road home. Rest here. The gate will still be there."');

  // --- enemies (a gentle land now — the real fight waits on the throne) ---
  // a few wolves in the far wilds
  let placed = 0, guard = 0;
  while (placed < 8 && guard++ < 4000) {
    const tx = 6 + Math.floor(rng() * (MW - 12));
    const ty = 30 + Math.floor(rng() * (MH - 36));
    const far = Math.hypot(tx - V.tx, ty - V.ty) > 20;
    if (far && getT(tx, ty) === T.GRASS) {
      world.spawns.push({ x: px(tx), y: px(ty), type: 'wolf' });
      placed++;
    }
  }
  // a couple of skeletons dozing at each ruin
  for (const r of ruins) {
    for (const [ox, oy] of [[-7, 0], [0, 7]]) {
      const tx = r.tx + ox, ty = r.ty + oy;
      if (getT(tx, ty) !== T.WALL && getT(tx, ty) !== T.WATER) {
        world.spawns.push({ x: px(tx), y: px(ty), type: 'skeleton' });
      }
    }
  }
  // one lone wraith drifts off the road's edge — a taste of what waits north
  world.spawns.push({ x: px(44), y: px(36), type: 'wraith' });
  // a thin honor guard inside the castle
  for (const [tx, ty] of [[42, 12], [54, 12]]) {
    world.spawns.push({ x: px(tx), y: px(ty), type: 'skeleton' });
  }
  world.spawns.push({ x: world.bossSpawn.x, y: world.bossSpawn.y, type: 'boss' });

  // --- treasure scattered in the wilds ---
  placed = 0; guard = 0;
  while (placed < 12 && guard++ < 4000) {
    const tx = 6 + Math.floor(rng() * (MW - 12));
    const ty = 30 + Math.floor(rng() * (MH - 36));
    if (getT(tx, ty) === T.GRASS && Math.hypot(tx - V.tx, ty - V.ty) > 10) {
      world.pickups.push({ x: px(tx), y: px(ty), type: 'gold', val: 4 + Math.floor(rng() * 6) });
      placed++;
    }
  }
  // quivers of arrows left by less fortunate travelers
  placed = 0; guard = 0;
  while (placed < 8 && guard++ < 4000) {
    const tx = 6 + Math.floor(rng() * (MW - 12));
    const ty = 28 + Math.floor(rng() * (MH - 34));
    if (getT(tx, ty) === T.GRASS && Math.hypot(tx - V.tx, ty - V.ty) > 8) {
      world.pickups.push({ x: px(tx), y: px(ty), type: 'arrows', val: 5 });
      placed++;
    }
  }
}

function makeRuin(cx, cy, rng) {
  const w = 5, h = 4;
  for (let tx = cx - w; tx <= cx + w; tx++) {
    for (let ty = cy - h; ty <= cy + h; ty++) {
      const edge = tx === cx - w || tx === cx + w || ty === cy - h || ty === cy + h;
      setT(tx, ty, edge && rng() < 0.7 ? T.WALL : T.FLOOR);
    }
  }
  // guaranteed south entrance
  setT(cx, cy + h, T.FLOOR);
  setT(cx + 1, cy + h, T.FLOOR);
  // corner braziers still burning after all these years
  for (const [ox, oy] of [[-w + 1, -h + 1], [w - 1, -h + 1], [-w + 1, h - 1], [w - 1, h - 1]]) {
    world.decors.push({ x: px(cx + ox), y: px(cy + oy), kind: 'brazier' });
    world.lights.push({ x: px(cx + ox), y: px(cy + oy), r: 110, warm: true });
  }
  world.pickups.push({ x: px(cx - 3), y: px(cy - 2), type: 'potion' });
}

// Carve a 2-wide L-shaped dirt path (x leg, then y leg). Only soft terrain
// (grass / trees / water) is overwritten, so walls stay intact.
function carvePath(x0, y0, x1, y1) {
  const soft = (t) => t === T.GRASS || t === T.TREE || t === T.WATER;
  const put = (tx, ty) => {
    for (let dx = 0; dx < 2; dx++)
      for (let dy = 0; dy < 2; dy++)
        if (soft(getT(tx + dx, ty + dy))) setT(tx + dx, ty + dy, T.PATH);
  };
  let x = x0, y = y0;
  while (x !== x1) { put(x, y); x += x < x1 ? 1 : -1; }
  while (y !== y1) { put(x, y); y += y < y1 ? 1 : -1; }
  put(x, y);
}

function addLore(tx, ty, text) {
  setT(tx, ty, T.GRASS);
  world.lores.push({ x: px(tx), y: px(ty), text });
}
