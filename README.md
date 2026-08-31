# ⚔️ Emberfall

*A knight errant, a dying land, a crown that would not rust.*

A dark fantasy action-RPG that runs entirely in your browser — no installs, no
dependencies — and plays **entirely in first person**, rendered with a
raycasting engine: starlit forests, a lantern-lit road, and the moon hanging
over the north to guide you. Press **M** any time for a top-down map view.

**The quest is simple:** draw the sword from the stone, walk the scenic North
Road, defeat the Fallen King, and watch the dawn come back.

## ▶️ How to Play

Open `index.html` in any browser. That's it.

(Or serve it locally: `python3 -m http.server` in this folder, then visit
http://localhost:8000)

## 🎮 Controls

| Key | Action |
|---|---|
| W / S | Walk forward / back |
| A / D | Turn |
| Click or Space | Strike with the sword up close, shoot an arrow at range |
| Shift | Dash (brief invincibility) |
| E | Talk · read stones · draw the sword |
| Q | Drink a health potion |
| J | Quest journal |
| M | Toggle the top-down map view |

## 🗺️ The World

Seven regions, each with its own look — **Emberside Village**, the **Weeping
Woods**, the **Mirefen** marshes, the **Gravehills**, the **Old Road**, the
**Ashen Approach**, and **Castle Maldrich**. Region banners announce each land
as you cross into it, and the compass ribbon at the top keeps you pointed north.

## 📜 The Quest

1. **Take Up the Sword** — draw the old blade from the stone east of the
   village fire. The castle gate opens the moment it slides free.
2. **The North Road** — follow the lantern-lit road north under the moon.
   A scenic walk with a lone wraith to keep you honest.
3. **The Fallen King** — Maldrich waits on his throne. Charges, shadow-bolt
   volleys, and a crown that needs breaking.
4. **The End** — the first dawn in a hundred years, and a knight walking home.

Track progress with **J**; the current step also shows in the top bar.

## 🧭 Tips

- The **moon hangs over the north** — walk toward it and you'll find the castle.
- One button fights: enemies in reach get the sword, everything else gets an arrow.
- Standing still out of combat slowly regenerates health.
- Dying returns you to the campfire — minus a fifth of your gold.
- Trader Osric sells a potion + five arrows for 15 gold.

## 🛠️ Code Tour (for learning)

Plain HTML5 canvas + vanilla JavaScript, no engine, no build step:

```
index.html      — page shell and script loading order
style.css       — fullscreen canvas styling
js/util.js      — seeded RNG, angles, math helpers
js/world.js     — deterministic world generation (regions, road, castle, shrine)
js/entities.js  — player and enemy stat definitions
js/fpworld.js   — the first-person view: DDA raycaster over the world map,
                  night sky and moon, billboard sprites, FP combat, viewmodel
js/dungeon.js   — a spare raycast dungeon system (unused by the simple quest)
js/main.js      — game loop, input, quests, enemy AI, ending scene, map view, UI
```

Good places to start tinkering:
- **Enemy stats** — `ENEMY_TYPES` in `js/entities.js`
- **World layout** — structure positions and the lantern road in `js/world.js`
- **Combat feel** — reach, cooldowns, dash speed in `js/fpworld.js`
- **The mood** — fog falloff and sky colors in `fpDraw()`
- **The ending** — every beat of the cinematic lives in `drawEnding()` in `js/main.js`
