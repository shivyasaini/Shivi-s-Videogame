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
  $('endTitle').textContent = e ? e.t : 'End of Night One';
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
