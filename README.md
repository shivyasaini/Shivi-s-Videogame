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
| Hold the SKIP button 5s | Jump straight to Chapter Two (title & pause screens) |
| `M` | Mute |

## The goal

You wake in a guest bedroom. The front door is sealed by three emblems —
**Wolf**, **Owl**, and **Serpent** — scattered through the house. One is
behind a locked bathroom door; the rusty key is on the fireplace mantel.
Slot all three into the front door in the foyer and escape.

## Chapter Two — The Estate

Escaping the house is only the beginning. The estate's fence has no gate you
can open — but there is a cozy campervan in a clearing, a telephone that
knows your name, and terrible news: your best friend Ash was caught by Crane
and is turning. The antidote takes two vials — **VENIN** and **REMEDY** —
brewed by Crane's wife in her crooked, rotting house across the river.

- **The Widow** — Crane's wife — hunts her halls like her husband, but slower,
  and she carries a burning lantern everywhere; you can track her by its warm
  glow. She *loves light*: turn your **flashlight OFF (F)** when she's near.
  With your light off she can barely see you — and if she's chasing you, seven
  full seconds in the dark and she loses you completely.
- Her house is worse than his: hoarded junk, collapsing beams, moss, glowing
  fungus, roaches scuttling across the floor.
- The campervan is a real safe room you walk into — string lights, a warm
  stove, posters, a rumpled bed, and the telephone on the desk. A fallen pine
  blocks the river bridge until you've answered the first call.
- Between the houses lies a misty dawn forest — pines, a river with a wooden
  bridge, birdsong, lantern-posts marking the trail. Nothing hunts you out
  here. Breathe.
- Phone-call cutscenes drive the story: answer the phone at the camper,
  choose your path, and deliver the finished serum to the boathouse when the
  blue lamp lights.

## Chapter Three — The Full Moon

The serum is delivered, the boat is on open water, the moon is full, and for
one minute everything is fine. Then a hand closes on the stern rail.

- **The boss fight:** Crane swam after you. Waterlogged and slow, he boards
  the boat — and for the first time in the game you can fight back. Swing the
  boat hook (click / Space), dodge his long windups, and put him down. He
  sinks the boat out of spite on his way into the sea.
- **The island:** shipwrecked under the moon, the only way to call for help
  is the old lighthouse. Climb it floor by floor.
- **Ash turns:** the full moon calls the bite before the serum can finish.
  On the second landing your best friend stops being your best friend — and
  you CANNOT fight them. Run, hide, climb.
- **Mara has your back:** press **T** and she pulls Ash's attention so you
  can slip past. Reaching the lamp room and lighting the beacon holds the
  moonlight off until dawn — and ends the story.
- The pause-menu skip button now jumps chapter to chapter (1 → 2 → 3).

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
