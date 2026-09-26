# 🩸 RAVENMOOR — Game Design

**You are the vampire. Every choice is yours, and you have to play through each one.**

Chosen direction: Idea A from `RAVENMOOR_BRAINSTORM.md`, turned into a **choices game**
with **41 endings** (including 14 ways to die), **friends and rivals**, and **properly scary set pieces**. Every decision leads into a **playable scene** where you actually do
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

## 5. Friends, rivals & relationships 💬

Everyone you meet has a **Bond** with you that moves between four levels:

**💀 Enemy ← 😐 Stranger → 🙂 Friend → 🖤 Bonded (best friend for life, or death)**

- **Friends help you.** They show up in later scenes: Pip distracts guards, Imelda heals you,
  Tobias fights beside you, Mirela teaches you powers, Gideon hides you in graves.
- **Enemies come back.** Anyone you hurt or betray can show up at the worst possible moment.
- **Friends can die** because of your choices, and it stays that way for the rest of the run.
- **Friends can betray you** if your Humanity drops too low. They get scared of what you're turning into.
- **Hangout scenes:** between nights you can visit one friend (only one, so you have to pick!) and play a small scene
  together, like teaching Pip to climb rooftops, playing cards with Gideon on a tombstone, or
  training with Tobias. Each visit raises that Bond.
- **Friends disagree with each other.** Tobias hates Mirela. Imelda doesn't trust Corvin. Helping one can hurt the other.

### The cast

| Character | Who they are | Can become... |
|---|---|---|
| **Corvin** 🐦‍⬛ | The sarcastic talking raven, your guide | Best friend, or dinner |
| **Pip** 🧒 | A brave street kid who isn't scared of you | Little sibling, victim, or a vampire |
| **Sister Imelda** ⛪ | A nun who secretly helps monsters | Protector, or the one who ends you |
| **Tobias Crook** 🏹 | The witch-finder hunting you | Worst enemy, partner, or vampire brother |
| **Mirela** 🦇 *(new)* | Another vampire Vane has locked in his cellar for 40 years. Charming, funny, and maybe lying | Best friend, or the one who takes your place |
| **Gideon** ⚰️ *(new)* | The old gravedigger who has seen *everything* and won't tell | A quiet friend who hides you, or a witness you have to silence |
| **Rosalind Vane** 🎭 *(new)* | Vane's daughter. She hates her father | Ally in a revolution, hostage, or victim |
| **Magistrate Aldous Vane** 👑 | The real villain | Boss, master, or partner |

---

## 6. The super scary bits 😱

It's not all choices and chatting. Some parts are there to properly scare you.
The rhythm goes **calm → creepy → SCARE → relief**:

- **The Lid.** Night 0 starts in total darkness inside the coffin, with only your breathing and
  something scratching on the lid. It's rats. Probably.
- **The Hollow Choir.** Vane's hooded hunters *sing* while they search. You hear the hymn getting
  closer through the walls, and their lanterns burn you. If the singing stops, they've found you.
- **The Mirror Room.** Vampires have no reflection. But if your Humanity is low, one mirror *does*
  show you, and it's smiling when you aren't.
- **The Portrait Hall.** Vane Manor's paintings' eyes follow you. One of them is a painting of you,
  and it's newer than the others.
- **The Drowned Chapel.** Running water freezes vampires, so you have to wade through a flooded
  cathedral while things move under the water.
- **Dream → Nightmare.** The bright, happy dream scenes slowly go *wrong* if your Thirst is high.
  The sun goes red, the people stop having faces, and your mum is calling your name from the wrong room.
- **The Other Sleeper.** Deep under the crypt there's another coffin, much bigger than yours, and it's
  chained. Corvin says *never* go down there. It breathes when you're close.

---

## 7. The 5 nights (the choice map)

### 🌑 Night 0: The Crypt (tutorial)
You wake in the coffin. Corvin talks.

- **Choice: What do you drink?**
  - 🐀 **The rats**: play a catch-the-rats scene. Thirst drops a little. Corvin laughs at you.
  - 🍷 **The red chalice on the altar**: it's Vane's *binding wine*. You're weaker for a night, but you see your first **memory**.
  - ❌ **Nothing**: Humanity goes up, but you start Night 1 *very* thirsty.
- **Choice: How do you get out?**
  - 💥 **Smash the gate**: a fight scene. Loud, so Dread goes up.
  - 🦴 **Crawl through the bone tunnels**: an explore scene. Slow, but you find secrets.
- **Choice (only if you took the tunnels): The chained coffin 😱**
  - 🔓 **Break one chain**: you hear it wake up a little. It remembers you now (this leads toward ending #24).
  - 🚶 **Walk away**: the breathing follows you to the exit, then stops.
- **Choice: Gideon the gravedigger sees you climb out of the ground.**
  - 🗡 **Kill him**: nobody can ever know. Dread stays low, but you lose a future friend and Humanity drops a lot.
  - 🌀 **Make him forget**: costs Thirst. He might remember later...
  - 🙂 **Talk to him**: he just hands you a shovel and says *"Not the first one I've seen."* Start of a friendship.

### 🌒 Night 1: The Town at Twilight
Starving, you collapse in an alley. A kid called **Pip** finds you and isn't scared.

- **Choice (timed ⏱): Pip is right there...**
  - 🦷 **Bite Pip**: a hunt scene. If your thirst is too high **you can't stop**. Pip either faints or doesn't wake up. This changes the whole game.
  - 🚫 **Don't bite**: you must feed somewhere else. Hunt through the market and pick a target: a thief, a guard or the baker.
  - 🍞 **Take the bread Pip offers**: a feast scene. Human food makes vampires sick, so you play a dizzy, blurry scene. Pip will do *anything* for you now.
- **Choice (if you hunted in the market): You catch a thief stealing from a sleeping old woman.**
  - 🗡 **Kill him**: a hunt scene. Thirst full. The old woman wakes up and sees everything.
  - 🦷 **Drink a little and let him go**: he tells *everyone*. Dread goes way up.
  - ⛓ **Make him your servant**: he runs errands for you, but servants always talk eventually.
- **Choice: Pip wants to come with you.**
  - 🤝 **Let Pip be your friend**: Pip joins you, and is now in danger in every scene.
  - 🚪 **Send Pip home**: Pip is safe, but sad. Pip might follow you anyway.
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
- **Choice 😱: The Hollow Choir is singing in the next street and Pip is out there.**
  - 🏃 **Save Pip**: an escape scene through the singing hunters. Very hard. If you fail, Pip is taken.
  - 🦇 **Save yourself**: you hide and listen to the singing stop. Pip's Bond drops forever, if Pip comes back at all.
  - 🔥 **Kill the whole Choir**: a big fight. You win, but the town now thinks you're a monster (Dread maxes).
- **Hangout: pick ONE friend to visit before Night 3.**

### 🌔 Night 3: The Bell Tower
You learn that Corvin used to serve Magistrate Vane.

- **Choice: Corvin**
  - 💬 **Trust him**: a talk scene. He tells you the truth about the curse.
  - 🚪 **Cast him out**: you lose your guide, so no more hints.
  - 🍗 **Eat him**: yes, really. You get his memories, and the big twist: *Corvin is the first vampire of Ravenmoor.*
- **Choice: You find a vial of Vane family blood.**
  - 🧪 **Drink it**: you get huge power, but **lose all your memories**.
  - 💔 **Smash it**: you stay yourself, but the finale is much harder.
- **Choice: You find Mirela, the vampire chained in Vane's cellar.** She's funny and kind and asks you to set her free.
  - 🔓 **Free her**: new friend and a teacher of powers. She's either your best friend or the biggest liar in the game.
  - 🔒 **Leave her chained**: she screams your name as you walk away. She'll remember.
  - 🗡 **End her**: a mercy, or a murder? Tobias approves. Corvin goes very quiet.
- **Choice 😱: The Mirror Room** (only if your Humanity is low)
  - 🪞 **Smash the mirror**: seven years' bad luck, which for a vampire is nothing.
  - 👁 **Talk to your reflection**: it knows things you don't, and it wants out (leads toward ending #30).
- **Choice: Mirela says Imelda is working for Vane and asks you to kill her.**
  - 🗡 **Kill Imelda**: was Mirela telling the truth? You find out at the Masquerade.
  - 🙅 **Refuse**: Mirela's Bond drops. Imelda never finds out how close it was.
- **Hangout: pick ONE friend to visit before Night 4.**

### 🌕 Night 4: The Masquerade at Vane Manor
Vane throws a masked ball to celebrate 40 years of night.

- **Choice: How do you get in?**
  - 🤫 **Sneak**: a stealth level through the servants' halls.
  - 🌀 **Mesmerize the guests**: control people to open doors. Uses a lot of Thirst.
  - 🐦‍⬛ **Storm it as ravens**: a flight scene into a fight scene. Chaos.
- **Choice: Vane offers you a deal.**
  - 👑 **Join him**: rule the town together.
  - ✋ **Refuse**: boss fight.
- **Choice: Rosalind, Vane's daughter, catches you in her father's study.** She wants him gone too.
  - 🤝 **Team up**: she can turn the whole town against her father.
  - 🎭 **Take her hostage**: Vane has to listen to you now. So does everyone else.
  - 🗡 **Kill her**: it hurts Vane more than any stake could. Everyone who hears about it turns on you.
- **Choice 😱: The Portrait Hall.** The painting of you whispers *"Come in. It's warm in here."*
  - 🖼 **Touch the painting**: (leads toward ending #28)
  - 🔥 **Burn every portrait**: the whole manor screams. The screaming is coming from the paintings.

### 🌑 Night 5: The Longest Night
The ritual to keep the night forever. The final choice has 5 options, and some only show up
if you did certain things earlier:

- ☀️ **Break the curse** (the sun rises, and you are a vampire...)
- 🩸 **Take the curse into yourself**
- ⛓ **Force the curse back into Vane**
- 🧒 **Give it to Pip** (only if you bit Pip and Pip survived)
- 💤 **Go to bed** and let the town decide without you
- 🗡 **Kill Vane** *before* the ritual (a boss fight, and then the curse has nowhere to go...)
- ⛓ **Break the last chain** on the Other Sleeper's coffin (only if you broke one on Night 0)
- 🎉 **Ask your friends what to do** (only if 5 or more people are your Friends)
- 🔁 **Choose nothing** (only if Corvin has said "We've done this before" three times)

---

## 8. The endings (41 in total)

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

### ✨ 8 brand-new endings, each one completely different

These aren't small variations of the first 23. Each one is its own kind of story:

| # | Ending | Kind of ending | What happens |
|---|---|---|---|
| 24 | **The Other Sleeper** 😱 | Monster horror | You break the last chain. What climbs out is the *first* vampire, huge and ancient and starving. It eats Ravenmoor in one night, and you escape across the moor in its shadow. You were never the monster of this story |
| 25 | **Mirela's Coffin** 😱 | Betrayal twist | You freed Mirela and trusted her completely. On the last night she smiles, and you wake up in the dark inside your coffin, with something scratching on the lid. It's the start of the game again, and she's the one walking around up there now |
| 26 | **The Loop** 🔁 | Mind-bending | Corvin finally admits you've lived these five nights **hundreds** of times, and he's been counting. You choose nothing, and for the first time the night just... stops. White screen. Birdsong |
| 27 | **Rosalind's Ship** ⛵ | Escape / new life | You and Rosalind start a revolution. The town throws Vane out, and you slip away on a night ship to a city where nobody has heard of Ravenmoor. You open a little bookshop with very late opening hours |
| 28 | **The Portrait** 😱 | Trapped forever | You touched the painting. Now you're inside it, in the Portrait Hall, watching guests walk past for hundreds of years. Sometimes a child stops and stares. You try to scream. Your painted mouth doesn't move |
| 29 | **The Gravedigger's Friend** ⚰️ | Quiet and bittersweet | Gideon helps you fake your own death. Vane stops looking. You spend forever looking after the graveyard with the old man. When Gideon finally dies, you dig his grave yourself and plant roses on it |
| 30 | **The Mirror** 😱 | Body swap | Your reflection gets out. It walks out of the mirror room wearing your face, and everyone thinks it's you. It's kinder than you were. From behind the glass, you watch it make all your friends happy |
| 31 | **The Night Festival** 🎉 | Happy friendship ending | Everyone you met is your Friend: Pip, Imelda, Tobias, Mirela, Gideon, Rosalind, and Corvin. Instead of fighting the night, the whole town throws a lantern festival *for* you. You stay a vampire, and you're finally home |

### 💀 Death endings: 10 different ways to die

Being a vampire doesn't mean you can't die. Each death is its own short, scary final scene,
and each one comes from a **choice you made** or a **mistake you made while playing**.
Every one unlocks in the Ending Gallery, so dying is part of the fun.

| # | Death | How it happens |
|---|---|---|
| 32 | **The Stake** 🪵 | Tobias finds your coffin while you're asleep. You wake up just in time to see the hammer come down. Happens if you spared Tobias with low Humanity, or slept in the same place two nights in a row |
| 33 | **Drowned** 🌊 | You fall into running water in the Drowned Chapel. Vampires can't swim. Your body won't move, and you sink while the things under the water come closer |
| 34 | **Holy Fire** ✝️ | You ring a church bell on purpose to stun the Choir, but you're standing too close. The sound sets you alight from the inside |
| 35 | **The Hounds** 🐺 | You chose "crawl through the fields" instead of the rooftops on a high-Dread night. You hear howling in the fog. Then you hear it much closer |
| 36 | **Buried Alive** ⚰️ | Gideon (if he's your Enemy) waits for you to sleep, nails the coffin shut and buries it six feet down. You wake in the dark and start scratching at the lid. The last thing you hear is dirt landing on it. (Callback to how the game starts!) |
| 37 | **Garlic Supper** 🧄 | Pip's grandma invites you for dinner and you choose "eat to be polite." She knew exactly what you were the whole time |
| 38 | **Silver Tongue** 🥈 | You drink from the thief you made your servant, and he's been lining his blood with silver for weeks. Revenge |
| 39 | **Mirela's Kiss** 🦇 | You trusted Mirela, then refused her one time too many. She smiles, says *"I'm so sorry,"* and drains you dry |
| 40 | **Swarm** 🐦‍⬛ | You stay in raven form too long and can't pull yourself back together. You scatter across the sky as a hundred birds, and none of them remember your name |
| 41 | **Vane's Crypt** 👑 | You lose the boss fight against Vane. He doesn't kill you. He seals you back in the coffin you started in, and this time he adds *more chains* |

These join the four early deaths already in the list (Sunburnt, Ash on the Altar, Starved, and The Crowd),
so there are **14 ways to die** in total.

**How death works in play:**
- **Death endings** (the ones above) end the run with their own scene, and you unlock them in the gallery.
- **Normal mistakes** in a level, like getting spotted during a hunt, just send you back to a checkpoint,
  so you don't lose the whole game for one slip.
- **Warnings first.** Before most deaths there's a clue: the howling gets closer, the water ripples,
  Corvin says *"I really wouldn't."* Careful players can survive, while careless ones find a new ending.
- **Every death screen shows a hint** for a different ending, so dying teaches you something.

(More can be added easily. Each ending is just a rule plus a final scene.)

---

## 9. Replay features (so people want to find every ending)

- **Ending Gallery.** All 41 slots, locked ones shown as dark silhouettes with a one-line hint.
- **"Your choices" screen** at the end showing your path through the choice map.
- **Night select** once you've reached a night, so you don't replay from the start every time.
- **New dialogue on replays.** Corvin notices: *"We've done this before, haven't we?"*

---

## 10. Look & feel (NOT the Hollow House)

- **Night:** cold **moonlit silver-blue** + deep **crimson**, with gold lanterns, glowing fog, and ravens everywhere.
- **Dream scenes:** **bright warm daylight**, a big contrast that makes them feel special.
- **Thirst vision:** the screen goes grey with glowing red heartbeats.
- **Big spaces:** rooftops, a bell tower, a cathedral, a ballroom. Tall and multi-level, no more farmhouse grid.
- **Choice screen:** the game freezes, the screen goes dark red, and the options appear as glowing cards with a ticking timer.

---

## 11. How we build it

1. **Choice engine first.** A `story.js` file where every choice, scene and ending is written as
   data, so adding endings later is easy.
2. **Ravenmoor gets its own code** (`ravenmoor.js`), separate from the Hollow House's `game.js`.
3. **First playable slice: Night 0 + Night 1.**
   - 4 choices, about 6 playable scenes (rats, chalice vision, gate fight, bone tunnels, Pip, dream or sunrise race)
   - 3 endings (Sunburnt, Starved, and "to be continued")
   - the new look, the Thirst system, and the choice screen
4. Then add one night at a time until all 5 nights and the endings are in.
