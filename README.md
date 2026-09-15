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
| `G` | Graphics quality (HIGH / MEDIUM / LOW — auto-drops if the game lags) |
| Hold a SKIP button 5s | Jump straight to Chapter Two, Three or Four (title screen has all three; the pause menu skips one chapter ahead) |
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
  moonlight off until dawn.
- The pause-menu skip button jumps chapter to chapter (1 → 2 → 3 → 4).

## Chapter Four — Ashes

The beacon saved you. It did not finish anything. The night it burned, the
Widow's lantern went out on its own — and a house like Crane's does not stay
empty. The sea gives back what it is given.

- **Return at dusk.** The fishing boat drops the three of you at the old
  boathouse dock. Mara hid cans of **lamp oil** across the estate years ago:
  the camper, the boathouse, her porch. Find all three before moonrise.
- **The Hollow House stands open.** The front door that was sealed by three
  emblems now hangs wide, like a held breath. Go back in and **soak three
  rooms** — the kitchen, the living room, the workshop.
- **The Drowned Man.** Crane came home along the riverbed. Waterlogged,
  pale-eyed, dripping — and every can you pour makes him **faster and
  angrier**. You can track him by the drip… until the third can, when the
  house kills its own lights, slams every door, and he stops playing:
  a full-dark, no-escape final chase to the front door.
- **Strike the match.** Get out onto the porch and end it. Houses like his
  only truly die empty and burning at once.

## Chapter Five — Ravenmoor

The road home floods in a storm, and the only shelter on the moor is a huge
gothic castle whose doors are already open — and slam shut the moment you're
inside. You're the guests of the **Red Countess**, an ancient blood-drinker
who has been lonely for a very long time.

- **Trapped in the castle.** Ash and Mara bar themselves in the entrance hall;
  it falls to you to find the way out. The great doors are sealed by three
  **blood relics** hidden across the Gallery, the Chapel altar, and the Library.
- **The Red Countess.** Pale, crimson-gowned, red-eyed, fast and silent — she
  drifts room to room on silk and drinks her guests dry. Every relic you take
  **wakes her further** (faster, hungrier), and the third floods the castle red,
  throws every door shut, and sends her straight at you for a final chase to the
  great doors.
- **Gothic and gory:** stone halls, iron chandeliers, stained-glass storms,
  tapestries and grim portraits, a banquet of dust in the Great Hall, a blood
  chapel, and a dungeon of chains and worse. Hide in the **coffins** when she
  closes in. Reach the doors at dawn and the whole nightmare — finally — ends.

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
