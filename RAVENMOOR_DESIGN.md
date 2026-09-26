# 🩸 RAVENMOOR — Game Design

**You are the vampire. Every choice is yours, and you have to play through each one.**

Chosen direction: Idea A from `RAVENMOOR_BRAINSTORM.md`, turned into a **choices game**
with **20+ endings**. Every decision leads into a **playable scene** where you actually do
what you chose.

---

## 1. The big idea

You wake up in a coffin under the cursed moor town of **Ravenmoor**. You don't remember who you
were, you're *so* thirsty, and a sarcastic raven called **Corvin** is sitting on your chest.

The game plays over **5 nights**. On each night you:

1. **Play** a scene (explore, hunt, sneak, fight, fly, dream...)
2. Hit a **choice**, such as *bite / don't bite*, *kill / spare*, *drink this / drink that*,
   *go to bed / go explore*.
3. **Play the choice you made.** Choose "explore" and you play the vampire exploring.
   Choose "go to bed" and you play your dream. Choose "bite" and you play the hunt.
4. That choice quietly changes the rest of the game and pushes you toward one of the endings.

---

## 2. Every choice is a playable scene

These are the scene types. One engine, lots of different ways to play:

| Scene type | You choose something like... | What you actually play |
|---|---|---|
| 🧭 **Explore** | "Explore the town" | Free roam of rooftops, alleys and crypts. Find secrets and memory pieces |
| 🦇 **Hunt** | "Bite someone" | Stalk a target without being seen, then feed. Too slow and they scream |
| ⚔️ **Fight** | "Kill him", "Storm the manor" | Real combat with claws, a dash and vampire powers |
| 🐦‍⬛ **Flight** | "Fly as ravens" | Fly over the town as a swarm, dodging lanterns and bells |
| 💤 **Dream** | "Go to bed" | Play as your **human self years ago**, in **bright daytime** colors (the only daylight in the game) |
| 🗣 **Talk** | "Trust Corvin" | A conversation where what you say matters |
| 🏃 **Escape** | "Run", "Stay out past dawn" | Race the sunrise and stay in the shadows or burn |
| 🤢 **Feast** | "Eat this", "Drink this" | Weird effect scenes: food makes you sick, the chalice gives you visions |

---

## 3. Hidden stats (what your choices secretly change)

You never see these numbers directly. The game *shows* them instead:

| Stat | Goes up when... | How you notice it |
|---|---|---|
| 🩸 **Thirst** | Time passes and you use powers | The screen goes red and your heartbeat gets loud. **At max, the Beast chooses for you** |
| 🤍 **Humanity** | You spare, help or resist | Your reflection fades as it drops, and people react differently |
| 👁 **Dread** | You're seen, you bite, you kill | More hunters, locked doors and posters of your face |
| 🧩 **Memories** (0–7) | You explore and dream | Flashbacks that unlock the **true endings** |
| 💬 **Bonds** | How you treat Corvin, Pip, Imelda and Tobias | Who helps you and who betrays you at the end |

---

## 4. How to make the choices SUPER hard

1. **No "good" button.** Every option gives you something *and* costs you something.
2. **You don't know everything.** The red chalice could be wine or blood or poison. You find out after.
3. **Timed choices.** Some give you 10 seconds. **If you don't choose, your Thirst chooses for you**, and it always picks *bite*.
4. **Delayed consequences.** A choice on Night 1 can come back on Night 4.
5. **Choices change future choices.** Kill Tobias and you never get to turn him. Bite Pip and Pip's scenes change forever.
6. **The Beast.** If your thirst is too high during a choice, one option is **scratched out** and you can't pick it.

---

## 5. The 5 nights (the choice map)

### 🌑 Night 0: The Crypt (tutorial)
You wake in the coffin. Corvin talks.

- **Choice: What do you drink?**
  - 🐀 **The rats**: play a catch-the-rats scene. Thirst drops a little. Corvin laughs at you.
  - 🍷 **The red chalice on the altar**: it's Vane's *binding wine*. You're weaker for a night, but you see your first **memory**.
  - ❌ **Nothing**: Humanity goes up, but you start Night 1 *very* thirsty.
- **Choice: How do you get out?**
  - 💥 **Smash the gate**: a fight scene. Loud, so Dread goes up.
  - 🦴 **Crawl through the bone tunnels**: an explore scene. Slow, but you find secrets.

### 🌒 Night 1: The Town at Twilight
Starving, you collapse in an alley. A kid called **Pip** finds you and isn't scared.

- **Choice (timed ⏱): Pip is right there...**
  - 🦷 **Bite Pip**: a hunt scene. If your thirst is too high **you can't stop**. Pip either faints or doesn't wake up. This changes the whole game.
  - 🚫 **Don't bite**: you must feed somewhere else. Hunt through the market and pick a target: a thief, a guard or the baker.
  - 🍞 **Take the bread Pip offers**: a feast scene. Human food makes vampires sick, so you play a dizzy, blurry scene. Pip will do *anything* for you now.
- **Choice: Dawn is coming.**
  - 💤 **Go to bed**: a dream scene. Play your human self as a kid in sunny Ravenmoor 40 years ago. Find memories.
  - 🧭 **Keep exploring**: an escape scene. Race the sunrise between shadows. You find Vane's secret door, *or you burn*.

### 🌓 Night 2: The Witch-finder
**Tobias Crook** the vampire hunter falls through a rotten bridge and lies hurt at your feet.

- **Choice: Tobias**
  - 🗡 **Kill him**: a fight scene. The hunters lose their leader, but Dread goes way up and his sister comes for you later.
  - 🤝 **Spare him**: he runs. Whether he repays you or betrays you depends on your Humanity.
  - 🦇 **Turn him into a vampire**: he becomes your partner and fights beside you in later scenes.
- **Choice: Sister Imelda offers you sanctuary in the church.**
  - ⛪ **Step onto holy ground**: it hurts. If your Humanity is too low, **you burn** (early ending).
  - 🌫 **Refuse and sleep in the sewers**: safe, but Imelda can't help you later.

### 🌔 Night 3: The Bell Tower
You learn that Corvin used to serve Magistrate Vane.

- **Choice: Corvin**
  - 💬 **Trust him**: a talk scene. He tells you the truth about the curse.
  - 🚪 **Cast him out**: you lose your guide, so no more hints.
  - 🍗 **Eat him**: yes, really. You get his memories, and the big twist: *Corvin is the first vampire of Ravenmoor.*
- **Choice: You find a vial of Vane family blood.**
  - 🧪 **Drink it**: you get huge power, but **lose all your memories**.
  - 💔 **Smash it**: you stay yourself, but the finale is much harder.

### 🌕 Night 4: The Masquerade at Vane Manor
Vane throws a masked ball to celebrate 40 years of night.

- **Choice: How do you get in?**
  - 🤫 **Sneak**: a stealth level through the servants' halls.
  - 🌀 **Mesmerize the guests**: control people to open doors. Uses a lot of Thirst.
  - 🐦‍⬛ **Storm it as ravens**: a flight scene into a fight scene. Chaos.
- **Choice: Vane offers you a deal.**
  - 👑 **Join him**: rule the town together.
  - ✋ **Refuse**: boss fight.

### 🌑 Night 5: The Longest Night
The ritual to keep the night forever. The final choice has 5 options, and some only show up
if you did certain things earlier:

- ☀️ **Break the curse** (the sun rises, and you are a vampire...)
- 🩸 **Take the curse into yourself**
- ⛓ **Force the curse back into Vane**
- 🧒 **Give it to Pip** (only if you bit Pip and Pip survived)
- 💤 **Go to bed** and let the town decide without you

---

## 6. The endings (23 so far)

| # | Ending | How you get it (roughly) |
|---|---|---|
| 1 | **Dawn Breaks** | Break the curse with high Humanity. You burn in the sunrise, but the town is free and Pip remembers you |
| 2 | **Human Again** ⭐ secret best | Break the curse + all 7 memories + Imelda's trust. Her rite makes you human in the sunrise |
| 3 | **Home** ⭐ secret | All 7 memories + never bit anyone. You find your family's old house and walk into the morning with Pip |
| 4 | **Queen of the Night** | Take the curse, high Humanity. You rule an endless night but protect everyone |
| 5 | **The New Magistrate** | Take the curse, low Humanity. You're the new Vane |
| 6 | **Vane's Heir** | Join Vane and keep Corvin |
| 7 | **Betrayed** | Join Vane but cast out Corvin. Vane stakes you at dawn |
| 8 | **Two Hunters** | Turned Tobias + high Bond. You leave together to hunt the *real* monsters |
| 9 | **The Bolt** | Spared Tobias, low Humanity. He shoots you at the last second |
| 10 | **The Sister** | Killed Tobias. His sister ends it at the finale |
| 11 | **The Beast** | Thirst hit max too many times. You forget you were ever a person |
| 12 | **Empty Town** | Dread maxed. Everyone flees, and you rule nothing |
| 13 | **The Little Vampire** | Gave the curse to Pip |
| 14 | **Feathers** | Ate Corvin + took the curse. You become the new raven, whispering to the next sleeper |
| 15 | **Forgotten** | Drank the Vane vial. You serve the manor forever and don't know why |
| 16 | **Puppet Town** | Mesmerized the whole ball, low Humanity. The masquerade never ends |
| 17 | **Chains** | Drank the chalice + the vial. Vane owns you completely |
| 18 | **Let It Burn** | Let the ritual finish. The moor swallows Ravenmoor |
| 19 | **Asleep** | Go to bed at the finale. You wake 100 years later and the town is gone |
| 20 | **Sunburnt** 💀 early | Stayed out past dawn and didn't make the shadows |
| 21 | **Ash on the Altar** 💀 early | Stepped into the church with low Humanity |
| 22 | **Starved** 💀 early | Refused to drink every single time |
| 23 | **The Crowd** 💀 early | Got caught by a mob on a high-Dread night |

(More can be added easily. Each ending is just a rule plus a final scene.)

---

## 7. Replay features (so people want to find every ending)

- **Ending Gallery.** All 23 slots, locked ones shown as dark silhouettes with a one-line hint.
- **"Your choices" screen** at the end showing your path through the choice map.
- **Night select** once you've reached a night, so you don't replay from the start every time.
- **New dialogue on replays.** Corvin notices: *"We've done this before, haven't we?"*

---

## 8. Look & feel (NOT the Hollow House)

- **Night:** cold **moonlit silver-blue** + deep **crimson**, with gold lanterns, glowing fog, and ravens everywhere.
- **Dream scenes:** **bright warm daylight**, a big contrast that makes them feel special.
- **Thirst vision:** the screen goes grey with glowing red heartbeats.
- **Big spaces:** rooftops, a bell tower, a cathedral, a ballroom. Tall and multi-level, no more farmhouse grid.
- **Choice screen:** the game freezes, the screen goes dark red, and the options appear as glowing cards with a ticking timer.

---

## 9. How we build it

1. **Choice engine first.** A `story.js` file where every choice, scene and ending is written as
   data, so adding endings later is easy.
2. **Ravenmoor gets its own code** (`ravenmoor.js`), separate from the Hollow House's `game.js`.
3. **First playable slice: Night 0 + Night 1.**
   - 4 choices, about 6 playable scenes (rats, chalice vision, gate fight, bone tunnels, Pip, dream or sunrise race)
   - 3 endings (Sunburnt, Starved, and "to be continued")
   - the new look, the Thirst system, and the choice screen
4. Then add one night at a time until all 5 nights and the endings are in.
