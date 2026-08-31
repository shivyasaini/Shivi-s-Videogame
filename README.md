# ⚔️ Emberfall

*A knight errant, a dying land, a crown that would not rust.*

A dark fantasy action-RPG that runs entirely in your browser — no installs, no
dependencies. Explore a cursed medieval overworld from above, then descend
into **first-person dungeons** rendered with a raycasting engine, sword in hand.

## ▶️ How to Play

Open `index.html` in any browser. That's it.

(Or serve it locally: `python3 -m http.server` in this folder, then visit
http://localhost:8000)

## 🎮 Controls

| Key | Action |
|---|---|
| WASD / Arrows | Move (turn + walk in dungeons) |
| Mouse | Aim & shoot arrows (overworld) · strike / shoot (dungeons) |
| Space | Swing sword |
| Shift | Dodge roll (brief invincibility) |
| E | Talk · read stones · open chests · descend / ascend stairs |
| Q | Drink a health potion |
| J | Quest journal |

## 🗺️ The World

Seven regions, each with its own look and dangers — **Emberside Village**, the
**Weeping Woods**, the **Mirefen** marshes, the **Gravehills**, the **Old
Road**, the **Ashen Approach**, and **Castle Maldrich** itself. Region banners
announce each land as you cross into it.

Below the surface lie two **first-person dungeons** — the *Barrow of the Pale
Count* and the *Ossuary* — full first-person view, torchlit corridors,
skeletons and wraiths in the dark, and treasure chests holding gold, supplies,
and two ancient relics.

## 📜 Quests

- **The Three Sigils** *(main)* — recover the sigils from three guarded ruins.
- **The Fallen King** *(main)* — open the northern gate and end Maldrich.
- **Wolfsbane** — cull 6 wolves for Trader Osric's bounty.
- **Voices in Stone** — read the three weathered lore stones.
- **Bones Below** — claim the relics from both dungeons (permanent power-ups).

Track everything with **J**.

## ⚔️ Combat

Sword swings, dodge rolls, and a bow aimed with the mouse. Wraiths keep their
distance and hurl shadow bolts; the Fallen King charges and fires volleys.
Arrows drop from slain foes, sit in old quivers around the world, and come
five to a bundle from Trader Osric (15 gold, potion included). Kill things to
level up — more health, heavier blade.

## 🧭 Tips

- Your torch only lights a small circle. Paths lead everywhere important.
- Wraiths are archers now — dodge *through* their bolts, or close the gap.
- The relic chests glow faintly blue in the deepest dungeon rooms.
- Standing still out of combat slowly regenerates health.
- Dying returns you to the campfire — minus a fifth of your gold.

## 🛠️ Code Tour (for learning)

Plain HTML5 canvas + vanilla JavaScript, no engine, no build step:

```
index.html      — page shell and script loading order
style.css       — fullscreen canvas styling
js/util.js      — seeded RNG, angles, math helpers
js/world.js     — deterministic overworld generation (regions, ruins, castle)
js/entities.js  — player and enemy stat definitions
js/dungeon.js   — first-person dungeons: DDA raycaster, billboard sprites,
                  dungeon generation, FP combat, chests and relics
js/main.js      — game loop, input, combat, AI, quests, rendering, lighting, UI
```

Good places to start tinkering:
- **Enemy stats** — `ENEMY_TYPES` in `js/entities.js`, `DG_ENEMY` in `js/dungeon.js`
- **World layout** — the seed and structure positions in `js/world.js`
- **Dungeon shape** — the drunkard-walk carving in `genDungeon()`
- **Combat feel** — swing arc, dodge speed, bow cooldown in `js/main.js`
- **The mood** — darkness level in `drawLighting()`, fog falloff in `dungeonDraw()`
