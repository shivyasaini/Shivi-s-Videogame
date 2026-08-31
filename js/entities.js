'use strict';

function makePlayer(x, y) {
  return {
    x, y, r: 10,
    hp: 120, maxHp: 120,
    dmg: 15, speed: 165,
    face: -Math.PI / 2,        // facing angle (starts looking north)
    hasSword: false,           // the old blade waits in the stone
    level: 1, xp: 0, xpNext: 40,
    gold: 0, potions: 2, sigils: 0,
    arrows: 25, bowCd: 0,
    atkCd: 0, swing: 0, swingDir: 0,
    dodgeCd: 0, dodging: 0, dodgeDirX: 0, dodgeDirY: 0,
    inv: 0,                     // invulnerability time after a hit / dodge
    lastHurt: 99,               // seconds since last damage (drives regen)
  };
}

const ENEMY_TYPES = {
  wolf:     { hp: 20,  dmg: 5,  speed: 120, aggro: 200, xp: 12,  r: 10 },
  skeleton: { hp: 35,  dmg: 8,  speed: 80,  aggro: 190, xp: 22,  r: 11 },
  wraith:   { hp: 30,  dmg: 8,  speed: 100, aggro: 250, xp: 32,  r: 11, ghost: true },
  boss:     { hp: 300, dmg: 16, speed: 110, aggro: 330, xp: 200, r: 18, boss: true },
};

function makeEnemy(x, y, type) {
  const s = ENEMY_TYPES[type];
  return {
    x, y, type,
    r: s.r, hp: s.hp, hpMax: s.hp,
    dmg: s.dmg, speed: s.speed, aggro: s.aggro, xp: s.xp,
    ghost: !!s.ghost, boss: !!s.boss,
    homeX: x, homeY: y,
    wanderT: 0, wx: 0, wy: 0,   // wander timer + direction
    touchCd: 0,                  // cooldown between contact hits
    fireT: 1 + Math.random(),    // wraith shadow-bolt timer
    volleyT: 2,                  // boss volley timer
    kx: 0, ky: 0,                // knockback velocity
    hurtT: 0,                    // hit-flash timer
    aggroed: false,
    chargeT: 3, charging: 0, chDirX: 0, chDirY: 0, // boss charge attack
    spawnedAdds: false,
    dead: false,
  };
}
