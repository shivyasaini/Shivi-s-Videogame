'use strict';

// Deterministic random number generator so the world layout is the same
// every playthrough (change the seed in world.js for a new land).
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

// Smallest signed difference between two angles, in [-PI, PI].
function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// Cheap deterministic per-tile hash for ground color variation.
function tileHash(tx, ty) {
  let h = tx * 374761393 + ty * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 255;
}
