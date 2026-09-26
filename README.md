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
- The title screen and pause-menu skip buttons jump chapter to chapter
  (1 → 2 → 3 → 4).

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
  only truly die empty and burning at once. This is where **The Hollow House**
  ends — four chapters, and the road is finally just a road.

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

---

# RAVENMOOR: a second game 🐦‍⬛🩸

**Ravenmoor** is a completely separate game with its own engine code in
`js/ravenmoor/`. Nothing is shared with the Hollow House except Three.js.
Open **`ravenmoor.html`** to play it:

```
python3 -m http.server
# then visit http://localhost:8000/ravenmoor.html
```

**You are the vampire.** You wake up in a coffin under a cursed moor town with
no memory, a terrible thirst, and a sarcastic talking raven called **Corvin**
sitting on your chest. It's a choices game: bite or don't bite, kill or spare,
eat this or drink that, go to bed or keep exploring. **Every choice turns into
something you play.**

- **Make your character first:** name; girl, boy or neither; skin tone; face;
  marks; hair style (12 styles, including braids, locs, curls and an afro) and colour; eye colour; outfit; extras. Your look then
  changes as you play: you get paler, your eyes turn gold and then red as your
  Humanity drops, your fangs grow each time you bite, your clothes wear, and
  burns from the sun stay.
- **Hidden stats:** Thirst (the vial, top right), Humanity, Dread, Memories and
  Bonds decide what happens and which ending you get.
- **Hard choices:** some are timed, and when time runs out *the Thirst picks for
  you*. If you're too thirsty, the Beast scratches the gentle options out.
- **41 endings**, collected in the **Ending Gallery** (locked ones show hints).

### All five nights are playable

| Night | What happens | Some of the choices you play |
|---|---|---|
| **Zero: The Crypt** | Wake in your coffin, meet Corvin | Rats / chalice / nothing · smash the gate / bone tunnels · Gideon: kill, mesmerise, or dig |
| **One: The Town at Twilight** | Pip finds you in an alley | ⏱ Bite / don't bite / bread · the market hunt · the thief · dream or race the sunrise |
| **Two: The Witch-finder** | Tobias hunts you on the moor | Lure him onto the rotten bridge · kill / spare / turn him · the Hollow Choir · hangouts · where to sleep |
| **Three: The Cellar** | Down into Vane's cellar | Fields (hounds!) or sewers · trust / cast out / eat Corvin · the vial · free / leave / end Mirela · the Mirror Room |
| **Four: The Masquerade** | Vane's masked ball | Sneak / mesmerise / fly in as ravens · the portrait of you · Rosalind · join Vane, or fight him |
| **Five: The Longest Night** | The Drowned Chapel and the ritual | Up to 15 final choices, depending on everything you did before |

**All 41 endings can be reached.** Some happen during a night (the Stake, Holy Fire, the Hounds, Garlic Supper, Drowned, Swarm...),
and the big ones come from the last choice on Night Five. The Ending Gallery shows hints for the ones you
haven't found, and **Continue** starts you at the latest night you reached. The full plan is in
[`RAVENMOOR_DESIGN.md`](RAVENMOOR_DESIGN.md).

**Controls:** WASD move · mouse look · Shift run · C crouch · E use / talk ·
click to claw or pounce · Space dash · hold R for Blood Sight (from the market
on) · P pause · M mute · G graphics.

**Code tour** (`js/ravenmoor/`):

```
core.js       renderer, sky and moon, lighting moods, input, player, hands, ravens, HUD, sound
character.js  the 3D person builder, vampire changes, the character creator
worlds.js     the crypt and bone tunnels, the town, graveyard, church and market
scenes.js     Night Zero and Night One: every playable scene
night2.js     Night Two, plus the moor and the church
worlds2.js    Vane Manor (ballroom, portrait hall, study, cellar, Mirror Room) and the Drowned Chapel
night3.js     Night Three, and the rules for where you sleep
night4.js     Night Four: the Masquerade
night5.js     Night Five: the Drowned Chapel and the final choice
endings.js    all 41 endings, the ending screen and the gallery
story.js      stats, dialogue, the choice screen, Thirst, and the order of the nights
```
