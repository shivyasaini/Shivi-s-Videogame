# 🐦‍⬛ Ravenmoor — Redesign Brainstorm

Ravenmoor currently lives on the `claude/keen-bohr-cpbr9r` branch (`ravenmoor.html` + `js/game.js`).
This doc covers why it feels like a copy of **The Hollow House**, and what to change.

> ✅ **Chosen:** Idea A (you are the vampire), turned into a choices game with 20+ endings. See [RAVENMOOR_DESIGN.md](RAVENMOOR_DESIGN.md).

---

## 1. Why it feels like the same game

It isn't only the vibe. Under the hood Ravenmoor mostly *is* the Hollow House with new paint:

| | The Hollow House | Ravenmoor right now |
|---|---|---|
| **Floor plan** | `MAP1` (27×15 farmhouse grid) | **The same `MAP1`**: `buildCastle()` calls `beginWorld(WH5, MAP1, ...)` |
| **Enemy patrol route** | `PATROL_KEYS` | **The same `PATROL_KEYS`** |
| **The enemy** | Butcher hunts you room to room | Countess hunts you room to room (same AI, only the speed numbers changed) |
| **Hiding** | Hide in wardrobes | Hide in coffins (wardrobes with a new model) |
| **Goal** | Find emblems/key → open door → escape | Find key → ring bell → escape |
| **Setup** | You + friends trapped, doors lock behind you | You + two friends trapped, doors bolt behind you |
| **Player** | Helpless, flashlight, first-aid kits, sprint/crouch | Identical |
| **Death** | Caught → respawn | Caught → respawn |
| **Ceiling height** | 3.3 m (a house) | **3.3 m** (so the "castle" feels like a house) |

**Why it's too easy:** there's one key and one bell on a small map you already know from the
Hollow House, with one enemy running the same AI, and nothing to learn or upgrade.

**Why the graphics look bad:** a castle squeezed onto a farmhouse grid with farmhouse-height
walls, built from box walls, never looks grand. It can't, because the level is too small and too flat.

**The fix:** don't reskin it again. Change the **type of game**, not just the monster.

---

## 2. The rule for "VERY different"

Ravenmoor must **not** have:
- ❌ a monster chasing you through rooms while you hide in furniture
- ❌ "you and your friends get trapped and the doors lock"
- ❌ a find-the-key-then-escape goal
- ❌ phone calls, friends named Ash/Mara, or a killer family
- ❌ the flashlight + stamina + first-aid survival kit
- ❌ the rainy brown farmhouse look

---

## 3. Three big ideas (pick one)

### 💡 Idea A: "YOU are the vampire" ⭐ recommended

> *You wake in a stone coffin under Ravenmoor with no memory, a terrible thirst, and a
> raven sitting on your chest that talks.*

**The flip:** in the Hollow House you're the victim. In Ravenmoor **you're the monster**,
and the *humans* are hunting **you**.

- **Plot:** Ravenmoor is a cursed town on a moor where the sun hasn't fully risen in 40 years.
  You were turned into a vampire and locked away by the town's founder, **Magistrate Aldous Vane**,
  who's been using the endless twilight to rule the town through fear. You gradually remember
  who you were, and figure out that the vampire everyone blames for the dark isn't you.
  **The twist:** Vane's family made the curse to stay in power.
- **Gameplay:**
  - **Hunger meter** instead of health. Drink to heal, but every villager you bite makes the town
    more scared and the hunters stronger. You can finish the game without biting anyone (the hard "mercy" ending).
  - **Powers you unlock** (so it gets deeper, not easier): 🐦‍⬛ *Raven Swarm* (burst into ravens
    and fly short distances, which lets levels go **vertical**), 🌫 *Mist Form* (slip under doors),
    👁 *Blood Sight* (see heartbeats through walls), 🗣 *Mesmerize* (make a guard walk away).
  - **Weaknesses that are puzzles:** sunlight patches, running water, garlic-strung doorways,
    church bells that stun you. Every area is a puzzle of routes.
  - **Hunters that fight back:** the Lantern Guard (their lamps burn you), the Witch-finder
    with a crossbow, hounds that smell you. Hunters come in *different types* that need
    different tricks, unlike one stalker.
- **Why it's different:** power fantasy and mystery instead of helpless hiding; outdoor town,
  rooftops, bell towers, and catacombs; the ending depends on your choices.

### 💡 Idea B: "The Last Lamplighter": monster-hunting action

> *Every night the fog rolls off the moor and something comes with it. You're the only one left
> who knows how to fight it.*

- **Plot:** you're **Wren Hollis**, a 17-year-old apprentice lamplighter in the moor town of
  Ravenmoor. The lamps keep the fog creatures out, and someone is snuffing them one by one.
  Your mentor vanishes on night one.
- **Gameplay:** **day/night loop.** By day, explore the town, talk to people, find clues, buy and
  craft gear (silver bolts, oil bombs, a lantern upgrade). By night, relight the lamps and **fight**
  with a crossbow, a lantern that burns fog-things, and a dodge. Each night is harder, and each
  week ends in a boss (the Scarecrow King, the Drowned Choir, the Raven Mother).
- **Why it's different:** you fight instead of hide, it's open-world instead of one building, it has
  a shop, upgrades, and bosses, and there's a real cast of townspeople.

### 💡 Idea C: "The Masquerade": murder mystery at a vampire ball

> *Six guests. One masked ball. One of them is a vampire, and by midnight someone will be dead.*

- **Plot:** you're a young detective invited to Lady Ravenmoor's centennial masquerade. Guests
  start vanishing on the hour, every hour.
- **Gameplay:** talk, snoop, pick locks, read diaries, collect clues, and **accuse** at the end.
  Each guest has a secret. Wrong accusation = bad ending. The killer changes on replays.
- **Why it's different:** hardly any chasing at all. It's a thinking game, warm and glamorous
  instead of grimy.

---

## 4. New characters (for Idea A)

| Character | Who they are | Vibe |
|---|---|---|
| **You: "The Sleeper" (real name: Elowen Marsh)** | Woke up as a vampire, no memory | Quiet, clever, scary when you need to be |
| **Corvin** | A sarcastic talking raven who knows more than he says; your guide | Funny and a little shady |
| **Magistrate Aldous Vane** | Runs the town, preaches that the vampire is why it's dark | Calm, polite, the real villain |
| **Sister Imelda** | A nun who runs the bell tower and secretly helps "monsters" | Kind but tough |
| **Tobias Crook** | The Witch-finder: crossbow, long coat, hunts you across the whole game | Rival and mini-boss who can switch sides |
| **Pip** | A kid who isn't scared of you and leaves you notes | Heart of the story |
| **The Hollow Choir** | Vane's hooded enforcers with lantern-staves | The regular enemies |

## 5. Rough story in acts (Idea A)

1. **The Crypt:** wake up, learn to move and feed, escape the catacombs. Corvin shows up.
2. **The Town at Twilight:** sneak through rooftops and alleys, meet Pip and Sister Imelda,
   unlock *Raven Swarm*. First fight with Tobias.
3. **The Bell Tower:** the bells hurt you, so climb the tower from the outside. Learn the town's secret.
4. **Vane Manor:** break in and find out the Vane family made the curse. Unlock *Mesmerize*.
5. **The Longest Night:** Vane tries to finish the ritual. Boss fight in the flooded cathedral.
   **Ending choice:** break the curse (the sun rises and you burn) *or* take the curse
   yourself and rule Ravenmoor. Mercy run bonus: Tobias saves you.

---

## 6. Making it harder and deeper

- More than one goal: **5 areas**, each with its own puzzle and enemy mix.
- **Enemy variety** (3–5 types with different senses and counters) instead of one stalker.
- **Abilities that open new routes**, so the map changes as you grow.
- **Boss fights** with phases.
- **Difficulty modes:** Story / Normal / Nightmare (Nightmare = hunters share info and
  lock down areas they've seen you in).
- **Optional challenges:** mercy run (bite no one), secrets and collectibles (Pip's notes, Vane's
  diary pages), and a speedrun timer.

## 7. Making it look WAY better

The engine is already Three.js, so these are all doable:

1. **Brand-new maps.** No more `MAP1`. Build big, multi-level spaces (town streets, rooftops,
   a tower, catacombs).
2. **Real scale.** Ceilings 8–15 m in the cathedral and manor, towers you look *up* at, stairs, balconies.
3. **A totally different color palette.** Hollow House = brown, rain, grime.
   Ravenmoor = **cold moonlit silver-blue + deep crimson**, with gold candlelight accents.
4. **Better lighting:** a big low moon, **god-rays through windows**, glowing fog in the streets,
   **bloom** on lanterns and candles, and a real moon shadow over everything.
5. **Less boxy models:** arches, pillars, rounded roofs, gargoyles, and hundreds of **flying
   raven particles**, all built from Three.js shapes instead of cubes.
6. **Blood Sight mode:** the screen goes grey and red with glowing heartbeats. It looks cool
   and nothing like the Hollow House flashlight.
7. **Own audio:** organ drones, choir, church bells, wingbeats (all still procedural).
8. **Consider splitting the code.** Ravenmoor should get its own `ravenmoor.js` instead of
   living as "chapter 5" inside the Hollow House's `game.js`, so the two games stop sharing
   everything by accident.

---

## 8. Suggested first steps

1. Pick **A, B or C** (or mix them).
2. Lock the characters and act outline.
3. Build **Act 1 (The Crypt)** as a small, *polished* slice with the new look, new movement,
   hunger meter, and one enemy type. Make it fun before making it big.
4. Then add areas one at a time.
