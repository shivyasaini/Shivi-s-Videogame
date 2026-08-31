# ⚔️ Emberfall

*A knight errant, a dying land, a crown that would not rust.*

A dark fantasy exploration RPG that runs entirely in your browser — no installs,
no dependencies. You are a wandering knight in the cursed land of Emberfall,
where the sun guttered out the day King Maldrich bargained with the dark.

## ▶️ How to Play

Open `index.html` in any browser. That's it.

(Or serve it locally for a cleaner setup: `python3 -m http.server` in this
folder, then visit http://localhost:8000)

## 🎮 Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Space | Swing sword |
| Shift | Dodge roll (brief invincibility) |
| E | Talk / read stones / buy potions |
| Q | Drink a health potion |

## 🗺️ The Quest

1. Speak with **Elder Rowena** at the village campfire.
2. Find the **three sigils** hidden in ruins — west in the deep woods, east past
   the water, south among the graves. Skeletons guard them.
3. All three sigils open the **castle gate** far to the north.
4. Face **Maldrich, the Fallen King** on his throne. Good luck.

Along the way: wolves and wraiths roam the dark, weathered stones tell the
land's story, slain enemies drop gold and the occasional potion, and Trader
Osric sells potions for 15 gold. Kill things to level up — each level grants
more health and a heavier blade. Stay near firelight; the dark is not empty.

## 🧭 Tips

- Your torch only lights a small circle. Paths lead everywhere important.
- Dodge **through** the boss's charge, not away from it.
- Standing still out of combat slowly regenerates health.
- Dying returns you to the campfire — minus a fifth of your gold.

## 🛠️ Code Tour (for learning)

Plain HTML5 canvas + vanilla JavaScript, no engine, no build step:

```
index.html      — page shell and script loading order
style.css       — fullscreen canvas styling
js/util.js      — seeded RNG, angles, math helpers
js/world.js     — deterministic world generation (map, ruins, castle, spawns)
js/entities.js  — player and enemy stat definitions
js/main.js      — game loop, input, combat, enemy AI, rendering, lighting, UI
```

Good places to start tinkering:
- **Enemy stats** — `ENEMY_TYPES` in `js/entities.js`
- **World layout** — the seed and structure positions in `js/world.js`
- **Combat feel** — swing arc, dodge speed, knockback in `js/main.js`
- **The mood** — darkness level and torch radius in `drawLighting()`
