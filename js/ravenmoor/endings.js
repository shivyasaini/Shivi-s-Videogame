/* =====================================================================
   RAVENMOOR — endings
   All 41 endings live here, for the Ending Gallery. The ones you can
   already reach have their final text; the rest show as dark silhouettes
   with a hint, waiting for Nights 2–5.
   ===================================================================== */
(function () {
'use strict';
const RM = window.RM, { $ } = RM;

// kind: good · bad · strange · death
RM.ENDINGS = [
  { id: 'dawn', t: 'Dawn Breaks', k: 'good', hint: 'Break the curse with a good heart.' },
  { id: 'human', t: 'Human Again', k: 'good', hint: 'Secret. Every memory, and a nun\'s trust.' },
  { id: 'home', t: 'Home', k: 'good', hint: 'Secret. Remember everything. Bite no one. Ever.' },
  { id: 'ruler', t: 'Ruler of the Night', k: 'strange', hint: 'Take the curse, and keep your heart.' },
  { id: 'magistrate', t: 'The New Magistrate', k: 'bad', hint: 'Take the curse, and lose your heart.' },
  { id: 'heir', t: 'Vane\'s Heir', k: 'bad', hint: 'Accept the Magistrate\'s offer.' },
  { id: 'betrayed', t: 'Betrayed', k: 'death', hint: 'Join Vane without a friend to warn you.' },
  { id: 'hunters', t: 'Two Hunters', k: 'good', hint: 'Turn the hunter, and become his friend.' },
  { id: 'bolt', t: 'The Bolt', k: 'death', hint: 'Spare the hunter, then become the monster.' },
  { id: 'sister', t: 'The Sister', k: 'death', hint: 'Kill the hunter. Someone loved him.' },
  { id: 'beast', t: 'The Beast', k: 'bad', hint: 'Let the thirst win, again and again.' },
  { id: 'empty', t: 'Empty Town', k: 'bad', hint: 'Frighten everyone away.' },
  { id: 'little', t: 'The Little Vampire', k: 'strange', hint: 'Give the curse to someone small.' },
  { id: 'feathers', t: 'Feathers', k: 'strange', hint: 'Eat the raven. Then take the curse.' },
  { id: 'forgotten', t: 'Forgotten', k: 'bad', hint: 'Drink the Vane family\'s blood.' },
  { id: 'puppet', t: 'Puppet Town', k: 'bad', hint: 'Mesmerise the whole masquerade.' },
  { id: 'chains', t: 'Chains', k: 'bad', hint: 'Drink Vane\'s wine and Vane\'s blood.' },
  { id: 'burn', t: 'Let It Burn', k: 'strange', hint: 'Let the ritual finish.' },
  { id: 'asleep', t: 'Asleep', k: 'strange', hint: 'Go to bed when it matters most.' },
  { id: 'sunburnt', t: 'Sunburnt', k: 'death', hint: 'Stay out when the sun comes up.' },
  { id: 'altar', t: 'Ash on the Altar', k: 'death', hint: 'Step onto holy ground with a dark heart.' },
  { id: 'starved', t: 'Starved', k: 'death', hint: 'Refuse to drink. Every single time.' },
  { id: 'crowd', t: 'The Crowd', k: 'death', hint: 'Get caught once too often in a frightened town.' },
  { id: 'sleeper', t: 'The Other Sleeper', k: 'strange', hint: 'Break the last chain.' },
  { id: 'mirelaCoffin', t: 'Mirela\'s Coffin', k: 'strange', hint: 'Trust Mirela completely.' },
  { id: 'loop', t: 'The Loop', k: 'strange', hint: 'Choose nothing, once you know.' },
  { id: 'ship', t: 'Rosalind\'s Ship', k: 'good', hint: 'Start a revolution with Vane\'s daughter.' },
  { id: 'portrait', t: 'The Portrait', k: 'death', hint: 'Touch the painting of yourself.' },
  { id: 'gravedigger', t: 'The Gravedigger\'s Friend', k: 'good', hint: 'Make a friend of the old man with the shovel.' },
  { id: 'mirror', t: 'The Mirror', k: 'strange', hint: 'Talk to your reflection.' },
  { id: 'festival', t: 'The Night Festival', k: 'good', hint: 'Make friends of everyone.' },
  { id: 'stake', t: 'The Stake', k: 'death', hint: 'Sleep in the same place twice.' },
  { id: 'drowned', t: 'Drowned', k: 'death', hint: 'Vampires cannot swim.' },
  { id: 'holyfire', t: 'Holy Fire', k: 'death', hint: 'Ring a church bell, too close.' },
  { id: 'hounds', t: 'The Hounds', k: 'death', hint: 'Cross the fields on a frightened night.' },
  { id: 'buried', t: 'Buried Alive', k: 'death', hint: 'Scramble an old man\'s memory, then sleep.' },
  { id: 'garlic', t: 'Garlic Supper', k: 'death', hint: 'Be polite at Grandma\'s table.' },
  { id: 'silver', t: 'Silver Tongue', k: 'death', hint: 'Drink from a servant who hates you.' },
  { id: 'mirelaKiss', t: 'Mirela\'s Kiss', k: 'death', hint: 'Say no to Mirela, one time too many.' },
  { id: 'swarm', t: 'Swarm', k: 'death', hint: 'Stay a flock of ravens for too long.' },
  { id: 'vaneCrypt', t: 'Vane\'s Crypt', k: 'death', hint: 'Lose to the Magistrate.' },
];
RM.ENDINGS.forEach((e, i) => { e.n = i + 1; });
RM.ending = (id) => RM.ENDINGS.find((e) => e.id === id);

// the final words for each ending you can reach so far
const TEXT = {
  dawn: [
    'The heart breaks like a window, and through the real window, for the first time in forty years, comes the sun.',
    'It fills the chapel. It fills the town. It finds you, too, of course: you were always going to burn in it. You don\'t run. You turn your face up to it like you used to, when you were small.',
    'Ravenmoor wakes up in the morning, the actual morning, blinking. On the chapel floor there is a little grey ash, and a raven sitting beside it, and a child who comes down every morning after that to say good morning to both.',
  ],
  human: [
    'The heart breaks. The sun comes in. And Sister Imelda is there, on the planks, with her hand on your head, praying so hard she\'s shaking.',
    'The light hits you, and it hurts, and then it doesn\'t. Your heart does something it hasn\'t done in forty years. It <b>beats</b>.',
    'You are human again. Forty years late, with a nun holding one hand and your memories holding the other. You are very, very hungry. For <i>breakfast</i>.',
  ],
  home: [
    'You broke the curse without ever once biting anyone. The sun comes up and, somehow, it doesn\'t want you. It just wants to say good morning.',
    'You walk out of the chapel and down the hill and along a crooked street to a blue front door you remember from every dream.',
    'It\'s someone else\'s house now. They let you sit on the step anyway. Pip sits beside you, and you watch Ravenmoor wake up in the light, and it is the best day of your whole long life.',
  ],
  ruler: [
    'The curse pours into you like a river of midnight, and the night over Ravenmoor becomes <b>yours</b>.',
    'You could do anything with it. You choose to be kind. Lanterns on every corner. Nobody taken. Nobody painted. The town learns to live at night, and then, strangely, to like it.',
    'They call you the Keeper of Ravenmoor. Children leave you notes on the crypt steps. It is not a happy ending, exactly. But it is a gentle one, and it lasts forever.',
  ],
  magistrate: [
    'The curse pours into you, and you drink it all, and you feel <i>wonderful</i>.',
    'By the next night you have Vane\'s house, Vane\'s chain of office, and Vane\'s painter. You find you like having your face painted. You like having <i>everyone\'s</i> face painted.',
    'Ravenmoor has a new Magistrate. Nobody can quite remember when the change happened. It\'s just as dark as it always was.',
  ],
  heir: [
    'You kiss the ring. Corvin\'s warning rings in your ears. At dawn, when Vane comes for you with a stake, you are awake and waiting.',
    'In the morning there is one master of Vane Manor, and it is you. The footmen bow. The painter paints. The Hollow Choir sings your name.',
    'Corvin sits on your shoulder at every masquerade after that. He never says "I told you so." He doesn\'t have to.',
  ],
  betrayed: [
    'You kiss the ring. Vane smiles, and pats your head, and gives you the best guest room in the Manor.',
    'At dawn, while you sleep, he comes in with a silver stake and a very apologetic expression. "I\'m afraid," he says, "that I don\'t share."',
    'If only someone had warned you. Someone with feathers, perhaps. Someone you sent away.',
  ],
  hunters: [
    'You leave the town to its sunrise, and you and Tobias walk out across the moor together, two vampires with one crossbow and a lot to make up for.',
    'There are worse things than Vane in the world. Things in other towns, under other hills. You hunt them. You\'re very good at it.',
    'Somewhere far away, a village hangs a poster: two pale shapes, one in a wide hat. Under it someone has written, in chalk: <i>THANK YOU</i>.',
  ],
  bolt: [
    'You spared his life once. He remembered. He just couldn\'t forget what you became afterwards.',
    'The bolt is silver and it doesn\'t miss.',
    'Tobias Crook sits on the planks until morning with his crossbow in his lap, and he doesn\'t collect his fee, and he never hunts again.',
  ],
  sister: [
    'Agnes Crook was twice the hunter her brother was. Tobias said so himself, the night you left him in the river.',
    'She doesn\'t make speeches. She had one ready, but when it comes to it, she just aims.',
    'She buries Tobias\'s hat next to what\'s left of you, on the hill above the moor, and rides out of Ravenmoor before the sun comes up.',
  ],
  beast: [
    'The thirst won. Not all at once; a little every night, until there was no "you" left to lose.',
    'Something with your face walks out of the Drowned Chapel on the fifth night, and it is very hungry, and it doesn\'t remember a raven, or a child with bread, or a blue door.',
    'Ravenmoor has a monster again. The stories were right about you, in the end.',
  ],
  empty: [
    'The curse is yours. The night is yours. The town is... empty.',
    'You frightened them too well. Every family packed a cart and left, one by one, down the moor road, and didn\'t look back.',
    'You rule Ravenmoor forever: every empty house, every cold chimney, every quiet street. Only the ravens stayed. Ravens will stay anywhere.',
  ],
  little: [
    'The curse goes into Pip gently, like a secret passed in a whisper.',
    'Pip will never grow up now. Never grow old. Never have to be scared of the dark again, because Pip <i>is</i> the dark, a little.',
    'The two of you run Ravenmoor\'s rooftops every night after that, racing to the bell tower. Pip always wins. You let them. You always will.',
  ],
  feathers: [
    'You ate the raven, and now you take the curse, and the curse remembers him.',
    'It starts with an itch between your shoulders. By dawn you have wings. By the next night, a beak. You can still talk, which is something.',
    'Years later, in a crypt under Ravenmoor, a new Sleeper opens their eyes, and there is a raven sitting on their chest. <i>"Oh good,"</i> you say. <i>"You\'re awake."</i>',
  ],
  forgotten: [
    'You drank the Vane family\'s blood. It took every memory you had, and it left something in their place: a leash.',
    'When Vane says "kneel", you kneel. When he says "fetch", you fetch. You don\'t know why. You don\'t know anything.',
    'There is a very pale servant in Vane Manor who never speaks and never sleeps and sometimes, for no reason, stops in front of a blue door in the town and stands there for hours.',
  ],
  puppet: [
    'Three was easy. Two hundred was easier.',
    'Every guest, every footman, every masked face in the Manor turns to you at once and smiles the same smile. You make them dance. You make them bow. You make them sing.',
    'The Masquerade never ends. It goes on for years. From the outside, the Manor looks like the best party in the world.',
  ],
  chains: [
    'Vane\'s wine on the first night. Vane\'s blood on the third. You belonged to him before you even knew his name.',
    'He puts you on a silver chain next to his chair, like a pet, and shows you to his guests. "My Sleeper," he says. "Isn\'t it beautiful?"',
    'You would bite him, if you could remember how to want to.',
  ],
  burn: [
    'You let it finish.',
    'The heart splits open, and the curse doesn\'t go into the sky. It goes into the ground: into the hill, into the moor, into every stone in Ravenmoor. The river boils. The Manor slides down the hill like a sandcastle.',
    'By morning (there is no morning) there\'s a black lake where the town used to be. Ravens circle it forever.',
  ],
  asleep: [
    'You lie down in the coffin by the black water, and you close the lid, and you let the town decide without you.',
    'You sleep for a very long time. When you wake up, the lid is heavy with moss, and the chapel roof has fallen in, and there is sunlight coming through it, and the sunlight doesn\'t hurt.',
    'A hundred years have gone. Ravenmoor is a name on an old map. You never find out what they decided. You walk out into the morning anyway.',
  ],
  sleeper: [
    'You break the last chain.',
    'What climbs out of the coffin is huge and ancient and so, so hungry. It is the first vampire of Ravenmoor. It is Vane\'s grandfather. It eats Vane first. Then the Choir. Then the town.',
    'You run across the moor in its shadow, with the whole valley burning red behind you. You were never the monster in this story. You just let it out.',
  ],
  mirelaCoffin: [
    'You close your eyes, like she asked. It\'s so dark.',
    'You wake up with your nails already scratching at a lid. The coffin smells of velvet and dust. Something is sitting on the lid. <i>Scratch... scratch...</i>',
    'Far above you, Mirela walks the streets of Ravenmoor in your coat, with your face, and she is <i>so</i> happy. It starts again. It always starts again.',
  ],
  loop: [
    'You choose nothing. You don\'t move. You don\'t breathe.',
    'Corvin lands on your shoulder. <i>"Four hundred and twelve,"</i> he whispers. <i>"That\'s how many times we\'ve done this. I\'ve been counting."</i> And for the first time in four hundred and twelve nights, the night just... stops.',
    'White. Silence. Somewhere, very far away, birdsong.',
  ],
  ship: [
    'The boat slides out of the chapel on the black water, and out through a drain under the hill, and into the River Rook, and away.',
    'Behind you, torches: the whole town climbing the hill, with Rosalind\'s letters in their hands, to throw the Magistrate out.',
    'You and Rosalind sail to a city where nobody has ever heard of Ravenmoor. You open a little bookshop. It keeps <i>very</i> late opening hours.',
  ],
  portrait: [
    'You touch the painting. It\'s warm. It\'s so warm.',
    'Now you\'re inside it, in the portrait hall, in a gold frame, watching guests walk past for hundreds of years. Sometimes a child stops and stares.',
    'You try to scream. Your painted mouth doesn\'t move.',
  ],
  gravedigger: [
    'Everybody thinks the Sleeper died in the Drowned Chapel. Gideon makes sure of it: a big funeral, a big grave, and a very small hole in the lid.',
    'After that you live in his cottage by the graveyard. He digs the graves, and you keep him company. You play cards every night. He cheats. So do you.',
    'When Gideon finally dies, a long time later, you dig his grave yourself, and it\'s the best one in the yard, and you plant roses on it.',
  ],
  mirror: [
    'You let your reflection finish it. It steps out of the water, wearing your face, and it is <i>so</i> good at being you.',
    'It breaks the curse. It saves the town. It makes Pip laugh. Everyone says how much you\'ve changed.',
    'From behind the glass of every window and puddle in Ravenmoor, you watch it live your life, kinder than you ever were. Nobody can hear you knocking.',
  ],
  festival: [
    'They\'re all here: every friend you made in five nights. And nobody says "break the curse".',
    'Instead, the whole town comes down the hill with lanterns. Hundreds of them. Pip organised it. The Night Festival of Ravenmoor: every year, on the Longest Night, forever.',
    'You stay a vampire. You stay in Ravenmoor. You finally, finally, have a home.',
  ],
  drowned: [
    'The planks were so narrow.',
    'Running water holds vampires down, and the River Rook runs right through the chapel. Your body won\'t move. You sink, slowly, with your eyes open.',
    'The last thing you see is the things under the water, coming closer. They\'re not eels. They were never eels.',
  ],
  hounds: [
    'You hear the howling in the fog. Then you hear it much closer.',
    'Agnes Crook\'s hounds were trained for exactly one thing, and they are very, very good at it.',
    'In the morning, a woman in a wide-brimmed hat walks the fields with her dogs, and whistles, and the dogs come back wagging.',
  ],
  garlic: [
    'Forty cloves. You ate every spoonful to be polite.',
    'Pip\'s grandma sits with you while it happens, and holds your hand, and hums the raven lullaby, and isn\'t cruel about it at all.',
    '<i>"I\'m sorry, dear,"</i> she says. <i>"But I\'ve got a grandchild to look after."</i>',
  ],
  silver: [
    'He had been putting silver in his soup every night since you took his mind.',
    'You drank from him like he was yours. He never was. He just smiled and waited.',
    'Your servant sells your coat, your boots, and the story, in that order, and does very well out of all three.',
  ],
  mirelaKiss: [
    'You said no to Mirela twice. Nobody says no to Mirela twice.',
    'She holds you very gently while she does it, and says she\'s sorry, and means it, and doesn\'t stop.',
    'She wears your coat to the Masquerade. It suits her.',
  ],
  swarm: [
    'You stayed a swarm too long.',
    'A hundred ravens, and none of them can remember whose they are. You scatter across the Manor\'s painted ceiling, out of its windows, over the moor.',
    'Every raven in Ravenmoor is a little bit you now. They never quite remember your name.',
  ],
  vaneCrypt: [
    'You lose.',
    'Vane doesn\'t kill you. He has you carried back down to your crypt, to your old coffin, and sealed in with <i>more</i> chains this time.',
    'Forty years of night go by. Then forty more. Somewhere up there, a new Sleeper wakes, and a raven sits on their chest, and says: <i>"Oh good. You\'re awake."</i>',
  ],

  sunburnt: [
    'The light finds you in the middle of the street.',
    'It doesn\'t hurt the way you thought it would. It\'s warm. For one second it feels like a memory: a blue door, a woman laughing, summer. Then your hands start to smoke.',
    'Ravenmoor wakes to a pile of grey ash in the road, and a raven sitting beside it who will not leave, not even when the baker shoos him with her broom.',
  ],
  starved: [
    'You would not drink. Not the rats, not the thief, not anyone.',
    'You walk back to the crypt and lie down in your coffin, and the thirst gets louder and louder until it is the only thing in the world, and then, very quietly, it stops.',
    'Corvin sits on your coffin for three nights. <i>"Noble,"</i> he says at last. <i>"Stupid. But noble."</i> Somewhere in town a child is still leaving bread on the crypt steps.',
  ],
  crowd: [
    'The first one sees you. Then everyone does.',
    'They come out of every door on the street with torches, pitchforks, lanterns, and one very determined baker with a rolling pin. The Lantern Guard is singing that terrible hymn.',
    'You are fast. There are more of them. By dawn Ravenmoor has a bonfire in the market square, and a new song about the night they got the Sleeper.',
  ],
  stake: [
    'You slept in the same place twice.',
    'The lid opened slowly, and the last thing you saw was a wide-brimmed hat against the candlelight, and the point of a wooden stake coming down.',
    'Tobias Crook collects his fee from the Magistrate the next morning. He doesn\'t spend it. He keeps the coins in a box, and some nights he takes them out and looks at them, and doesn\'t know why.',
  ],
  altar: [
    'Halfway up the aisle, you understand: there isn\'t enough of you left.',
    'The holy ground doesn\'t hate you. It just knows exactly what you are. The fire starts in your hands and walks up your arms, quiet and bright as candlelight.',
    'Sister Imelda sweeps the grey ash from her altar steps with her own hands, and says a prayer over it, and writes one more line in the parish register: <i>Came home, at the end.</i>',
  ],
  holyfire: [
    'You were still inside when the bell spoke.',
    'The sound doesn\'t come through your ears. It comes through your bones, holy bronze ringing through every part of you that the curse touched, and it turns out that is every part of you.',
    'The Hollow Choir wakes up in the market with no memory of why they are lying in the street. Across the town, the bell is still humming. It hums for a whole day.',
  ],
  buried: [
    'You wake in the dark with your nails already scratching at the lid.',
    'Six blessed iron nails. Six feet of cold Ravenmoor clay. Gideon remembered, the way old men remember things: slowly, and then all at once.',
    'Up above, he pats the fresh earth flat with his shovel and plants a single rose. <i>"Nothing personal,"</i> he says. It is the last thing you ever hear.',
  ],
};

RM.foundEndings = () => RM.store.get('endings', []);
function unlock(id) { const f = RM.foundEndings(); if (!f.includes(id)) { f.push(id); RM.store.set('endings', f); return true; } return false; }

// Show an ending screen. Never resolves: the run is over.
RM.showEnding = (id, opts = {}) => new Promise(() => {
  const s = RM.S;
  RM.control = false; RM.unlockPointer(); RM.clearScene(); RM.hands.visible = false;
  RM.AU.setHeart(0, 0); RM.AU.setMusic('title', 0.3);
  const e = id === 'tbc' ? null : RM.ending(id);
  const isNew = e ? unlock(id) : false;
  const ov = $('endingOv'); ov.className = 'overlay show ' + (e ? 'k-' + e.k : 'k-tbc');
  RM.fade(0, 1.2);
  $('endNum').textContent = e ? `ENDING ${e.n} / ${RM.ENDINGS.length}` + (isNew ? ' · NEW' : '') : 'TO BE CONTINUED';
  $('endTitle').textContent = e ? e.t : 'End of Night ' + ['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][s.night];
  const lines = e ? TEXT[id] : tbcText(s);
  $('endText').innerHTML = lines.map((l) => '<p>' + RM.fmt(l) + '</p>').join('');
  try { $('endPortrait').src = RM.portrait(s.look, RM.vampState(), 'stand'); } catch (err) { $('endPortrait').removeAttribute('src'); }
  $('endName').textContent = s.look.name;
  // your path through the story
  $('endPath').innerHTML = s.path.map((p) => `<li><span>${p.q}</span><b>${p.a}</b></li>`).join('');
  $('endStats').innerHTML = statsHTML(s);
  const found = RM.foundEndings();
  const locked = RM.ENDINGS.filter((x) => !found.includes(x.id));
  $('endHint').innerHTML = locked.length ? `🔮 Another ending waits: <i>${RM.pick(locked).hint}</i>` : 'You have found every ending. Corvin is impressed. Don\'t tell him we said so.';
  $('endCount').textContent = `${found.length} / ${RM.ENDINGS.length} endings found`;
  $('endRetry').style.display = RM.store.get('ckpt1', null) ? '' : 'none';
  if (e) { RM.AU.sting(0.4); } else RM.AU.chime(0.5);
});
function word(h) { return h >= 70 ? 'Still very human' : h >= 50 ? 'Mostly human' : h >= 30 ? 'Slipping' : h >= 10 ? 'More monster than person' : 'The Beast'; }
function statsHTML(s) {
  const friends = Object.entries(s.bonds).filter(([, v]) => v >= 2).map(([k]) => k[0].toUpperCase() + k.slice(1));
  return [
    ['🤍 Humanity', word(s.humanity)],
    ['🩸 Bites', s.bites + (s.kills ? ` (${s.kills} fatal)` : '')],
    ['👁 Dread', ['Nobody knows', 'Whispers', 'Posters', 'Hunted', 'Mobs'][Math.min(4, s.dread)]],
    ['🧩 Memories', s.memories + ' / 7'],
    ['💬 Friends', friends.length ? friends.join(', ') : 'None yet'],
  ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
}
function tbcText(s) {
  const f = s.flags, out = [];
  if (s.night >= 2) return tbc2(s);
  out.push('Night One is over, and Ravenmoor has a new story to whisper about.');
  if (f.pipDead) out.push('There is a small, still shape in an alley that nobody has found yet. You will see it every time you close your eyes.');
  else if (f.pipFriend) out.push('Pip is curled up asleep on the crypt steps, guarding you, with a sharpened stick and absolutely no fear.');
  else if (f.pipFainted) out.push('Pip woke up in the alley with two small marks on their neck and a head full of questions.');
  else if (f.pipFled || f.pipScared) out.push('Somewhere in town, Pip is telling anyone who will listen about the pale thing with red eyes.');
  if (f.gideonDead) out.push('The graveyard has a new grave, and nobody to dig the next one.');
  else if (f.gideonFriend) out.push('Gideon left a lantern burning on the crypt steps for you. Nobody has ever done that before.');
  else if (f.gideonForgot) out.push('In his cottage, old Gideon can\'t sleep. Something about tonight is nagging at him...');
  if (f.sleeperChain) out.push('Deep under the crypt, one chain lies broken. The breathing is a little louder now.');
  if (f.secretDoor) out.push('Behind Vane\'s iron door: stairs, going up, towards the manor. And voices. You heard your name.');
  if (f.nightmare) out.push('The faceless dream is still with you. You don\'t think it was only a dream.');
  out.push('<b>Nights Two to Five are coming:</b> the Witch-finder, the bell tower, Mirela in the cellar, the Masquerade at Vane Manor, and the Longest Night.');
  return out;
}

function tbc2(s) {
  const f = s.flags, c = s.choices, out = ['Night Two is over. The witch-finder came for you, and the town will never be quite the same.'];
  if (f.tobiasDead) out.push('Tobias Crook\'s hat washed up three miles downriver. Somewhere on the road to Ravenmoor, his sister Agnes has heard the news.');
  else if (f.tobiasTurned) out.push('Tobias sleeps in the coffin next to yours now. He snores. Vampires aren\'t supposed to snore.');
  else if (f.tobiasSpared) out.push('Tobias limped home on a leg you set yourself. He hasn\'t told anyone who pulled him from the river.' + (f.warnedAgnes ? ' He warned you about his sister. That has to mean something.' : ''));
  const v = f.pipDead ? (f.gideonDead ? 'the baker' : 'Gideon') : 'Pip';
  if (c.choir === 'save') out.push(`You walked into the Hollow Choir and walked out holding ${v}'s hand.`);
  else if (c.choir === 'hide') out.push(`The Choir took ${v} up the hill to the Manor. You heard every note of the hymn, and the moment it stopped.`);
  else if (c.choir === 'kill') out.push('Four porcelain masks lie cracked in the market square. Nobody has dared to pick them up.');
  else if (c.choir === 'bell') out.push('You rang the bell of St. Corvina\'s for the first time in forty years, and lived. The whole town heard it.');
  if (c.hangout === 'corvin') out.push('Corvin told you his secret on the top of the bell tower: he used to be a man. Vane\'s messenger.');
  if (f.sanctuary) out.push('You sleep behind Sister Imelda\'s altar. Your hands are still smoking a little. It was worth it.');
  else if (f.sewers) out.push('You sleep in the sewers, with the rats. Nobody will ever look for you there.');
  else if (c.sleep2 === 'coffin') out.push('You sleep in your coffin. Nobody comes. This time.');
  out.push('<b>Night Three is coming:</b> the bell tower, Corvin\'s secret, Mirela in Vane\'s cellar, and the Mirror Room.');
  return out;
}

/* ----------------------------------------------------------- gallery */
RM.openGallery = () => {
  const found = RM.foundEndings();
  $('galCount').textContent = `${found.length} / ${RM.ENDINGS.length} endings found`;
  $('galGrid').innerHTML = RM.ENDINGS.map((e) => {
    const has = found.includes(e.id);
    return `<div class="gcard ${has ? 'got k-' + e.k : 'locked'}"><div class="gn">${e.n}</div><div class="gt">${has ? e.t : '???'}</div><div class="gh">${has ? { good: 'Good ending', bad: 'Bad ending', strange: 'Strange ending', death: 'Death' }[e.k] : e.hint}</div></div>`;
  }).join('');
  $('gallery').classList.add('show');
};
})();
