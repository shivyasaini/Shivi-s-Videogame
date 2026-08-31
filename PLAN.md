> **Note:** the project has since pivoted to **Emberfall**, a dark fantasy
> knight RPG — see [README.md](README.md). This plan is kept as a reference for
> the earlier Nebula Drift concept; its build-phase structure still applies.

# Nebula Drift — Game Plan

A browser arcade game about a tiny bioluminescent space jellyfish drifting through
a dark nebula. Eating light makes you grow and glow — but your glow is exactly what
the shadow-beasts hunt. **Your light is your score, and your danger.**

Themes: space / sci-fi ✦ spooky & mysterious ✦ nature & alien creatures.

---

## 1. Core Concept

### The one-sentence pitch
Feed on drifting motes of light to grow brighter and score higher, while your own
brightness draws ever-more-aggressive shadow predators out of the dark.

### The core tension (why it's fun)
Every mote of light you eat makes you:
- **score more** (brightness = score multiplier)
- **see more** (your glow radius lights up the nebula around you)
- **risk more** (predators detect you from farther away, and more of them spawn)

The player constantly chooses between greed and safety. That single tension drives
the whole game — no tutorials needed.

### Win/lose
- Endless survival: you play until caught. Score = light collected × survival time.
- Local high score saved in the browser.

## 2. Gameplay Details

### Player: the Jelly
- Drifts with momentum (floaty, underwater-in-space feel) — arrow keys / WASD / touch.
- Has a **glow radius** that grows as light is eaten and slowly decays over time,
  so you must keep feeding to keep your vision and your score multiplier.
- **Flash Burst** (spacebar): vent stored light as a shockwave that stuns nearby
  predators — but it costs a chunk of your glow (score and vision). The panic button
  that always hurts a little to press.

### Collectibles: Light Motes
- Small glowing particles that drift on gentle currents.
- Occasionally a **Radiant Bloom** spawns: a big cluster worth a lot, placed
  somewhere dangerous. Bait for greedy players.

### Enemies: Shadow-Beasts
Three types, introduced in order as brightness rises:
1. **Wisps** — slow, drift toward any light. Harmless alone, deadly in crowds.
2. **Lurkers** — sit still and invisible in the dark; lunge when you drift close.
   Your glow reveals them just barely at the edge of your light. Spooky factor.
3. **Stalkers** — actively hunt the brightest thing in the nebula. Fast, relentless,
   only appear once you're quite bright. The late-game threat.

### Difficulty curve
Driven by the player's own brightness, not a timer — a dim, cautious player faces a
quiet nebula; a blazing one faces a swarm. The game self-balances to how boldly
you play.

## 3. Look & Feel

- **Palette:** near-black deep blues/purples; light sources in warm gold and
  cyan-white; predators as pure-black silhouettes with faint red eye-glints.
- **Everything glows:** radial gradients and additive blending on a `<canvas>` —
  no sprite art needed, the whole aesthetic is drawn with code (great for learning).
- **Darkness is real:** outside your glow radius the world genuinely fades to black.
- **Juice:** particle trails behind the jelly, soft pulse animation on the glow,
  screen shake on flash burst, slow-motion death moment.
- **Audio (stretch):** low ambient drone, soft chimes when eating light, a deep
  rumble when a Stalker locks on.

## 4. Tech Stack

- **Plain HTML + CSS + JavaScript**, single-page, zero dependencies, zero build step.
  Open `index.html` and play. Easy to read, easy to modify, shareable anywhere.
- `<canvas>` 2D rendering with `requestAnimationFrame` game loop.
- `localStorage` for the high score.

### File layout
```
index.html      — page shell, canvas, UI overlays (title / game over / score)
style.css       — page styling and UI
js/main.js      — game loop, state machine (title → playing → game over)
js/player.js    — jelly movement, glow, flash burst
js/motes.js     — light mote spawning and currents
js/enemies.js   — wisp / lurker / stalker behaviors
js/particles.js — visual effects (trails, bursts, ambient dust)
js/util.js      — vectors, collisions, random helpers
```
Small focused files so each system is study-able on its own — matches the
"learn while building" goal.

## 5. Build Phases

### Phase 1 — Playable Core (the skeleton)
- [ ] Canvas + game loop + title/playing/game-over states
- [ ] Jelly movement with drift/momentum
- [ ] Light motes spawn; eating them grows glow + score
- [ ] Glow decays over time
- [ ] One enemy (Wisp) that drifts toward light; touching one ends the run
- [ ] Score display + high score in localStorage

**Milestone: the game is fun in its dumbest form.** If chasing light while dodging
wisps isn't fun here, we fix the feel before adding anything.

### Phase 2 — The Tension (the heart)
- [ ] Brightness-driven spawning (brighter = more/faster enemies)
- [ ] Lurkers (ambush) and Stalkers (hunters)
- [ ] Flash Burst with its light cost
- [ ] Radiant Blooms as risky jackpots
- [ ] Real darkness: fog-of-war outside the glow radius

**Milestone: the greed-vs-safety choice is felt every few seconds.**

### Phase 3 — Juice & Polish (the shine)
- [ ] Particle trails, pulsing glow, screen shake, death slow-mo
- [ ] Title screen with animated nebula background
- [ ] Difficulty tuning pass (spawn rates, speeds, decay rate)
- [ ] Touch controls so it plays on phones

### Phase 4 — Stretch Goals (only if we still want more)
- [ ] Sound (ambient drone + effect chimes)
- [ ] Jelly cosmetic colors unlocked by high scores
- [ ] "Deep Nebula" zones — darker regions with richer light and worse monsters
- [ ] Daily-seed mode for comparing scores with friends

## 6. Design Principles

1. **One mechanic, deep** — everything hangs off brightness. Reject features that
   don't touch the light system.
2. **Readable code over clever code** — this project is for learning too. Comment
   the *why* of game-feel numbers (drag, decay rates, spawn curves).
3. **Fun at every commit** — the game should be playable after every phase, not
   just at the end.

---

*Swapping concepts?* Phases 1–4 keep their shape for any of the brainstormed ideas
(Ghost Ship Salvage, Star Warden, Abyss Runner) — only the entities in Phase 1–2
change. The plan's skeleton is reusable.
