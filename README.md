# THE HOLLOW HOUSE 🔪

A first-person 3D survival horror game that runs in your browser. You are
trapped inside the farmhouse of **Silas Crane** — the Butcher of Marrow
County — and he is *always* hunting you. Inspired by classic
stalked-in-a-house survival horror, tuned to be a little more forgiving.

## How to play

Open `index.html` in a modern browser (Chrome, Edge, Firefox). For best
results serve the folder locally:

```
python3 -m http.server
# then visit http://localhost:8000
```

Click **ENTER THE HOUSE**, and the game grabs your mouse.
🎧 Headphones strongly recommended — every sound is procedural and spatial.

## Controls

| Key | Action |
| --- | --- |
| `WASD` / arrows | Move |
| Mouse or `←` `→` | Look / turn |
| `↑` `↓` | Walk |
| `Shift` | Sprint (drains stamina, makes noise!) |
| `C` | Crouch (quiet + harder to spot) |
| `E` | Interact — doors, items, notes, hide in wardrobes |
| `F` | Flashlight (light helps you see, but helps *him* see you) |
| `Q` | Use a first aid kit |
| `Tab` / `X` | Map of the house |
| `P` / `Esc` | Pause |
| `−` / `+` | Volume down / up |
| `M` | Mute |

## The goal

You wake in a guest bedroom. The front door is sealed by three emblems —
**Wolf**, **Owl**, and **Serpent** — scattered through the house. One is
behind a locked bathroom door; the rusty key is on the fireplace mantel.
Slot all three into the front door in the foyer and escape.

## The other tenants

You are not alone in there with him. An old woman rocks at the dining table,
humming to plates of rotten food — she is harmless, as long as you don't
count the way she looks at you. And in a corner of the living room stands a
woman in a nightgown, whispering to the wall. **Do not go near her.**

## The Butcher

- He **patrols** the whole house, and periodically sweeps toward wherever you are.
- He **hears** sprinting, doors, and the emblem mechanism. Crouch-walk to stay quiet.
- He **sees** you if you're in his view cone with a clear line of sight — a
  detection meter gives you a moment to break away before it becomes a chase.
- If he chases you: **run**, break line of sight, and **hide in a wardrobe** —
  but if he watches you climb in, hiding won't save you.
- If he catches you, you don't lose your items — he just puts you back in the
  bedroom. He wants to play.

## Tech

- Pure JavaScript + [Three.js](https://threejs.org) (vendored in `js/lib/`, MIT license).
- Every texture is generated procedurally on canvas — no image assets.
- Every sound (rain, thunder, heartbeat, footsteps, the chase drone, his
  whistling) is synthesized with the Web Audio API — no audio assets.
- Dynamic shadow-casting flashlight, flickering room lights, lightning through
  the windows, film grain, and fear vignettes.
- Grid-based A* pathfinding and a sight/sound/detection AI state machine
  (patrol → investigate → chase → search).
