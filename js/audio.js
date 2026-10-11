'use strict';

// ---------------------------------------------------------------------------
// SOUND — everything is synthesized live with the Web Audio API, so the game
// stays a single file with no audio assets. Music has three moods (explore,
// boss, ending); N toggles all sound.
// ---------------------------------------------------------------------------

const audio = {
  ctx: null, master: null, music: null, sfx: null,
  noise: null, delay: null,
  started: false, muted: false,
  mood: 'explore', nextNote: 0, beat: 0, timer: null,
};

// Called on the first click or key press (browsers require a user gesture).
function audioInit() {
  if (audio.started) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(ctx.destination);
    audio.music = ctx.createGain();
    audio.music.gain.value = 0.22;
    audio.music.connect(audio.master);
    audio.sfx = ctx.createGain();
    audio.sfx.gain.value = 0.5;
    audio.sfx.connect(audio.master);

    // one shared noise buffer for whooshes and hits
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    audio.noise = buf;

    // a feedback delay gives the music its cavernous air
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    delay.connect(fb); fb.connect(delay);
    delay.connect(audio.music);
    audio.delay = delay;

    // the endless low drone of a dying land
    for (const [freq, vol] of [[73.42, 0.045], [110, 0.03], [73.9, 0.02]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      const g = ctx.createGain();
      g.gain.value = vol;
      o.connect(f); f.connect(g); g.connect(audio.music);
      o.start();
    }

    audio.started = true;
    audio.nextNote = ctx.currentTime + 0.5;
    audio.timer = setInterval(audioSchedule, 200);
  } catch (err) { /* no audio device — the game plays silent */ }
}

function audioToggle() {
  if (!audio.started) { audioInit(); if (!audio.started) return; }
  audio.muted = !audio.muted;
  audio.master.gain.setTargetAtTime(audio.muted ? 0 : 0.5, audio.ctx.currentTime, 0.05);
}

function audioMood(mood) { audio.mood = mood; }

// --- the music scheduler: plucks notes a little ahead of time --------------
const SCALES = {
  explore: [146.83, 174.61, 220, 261.63, 293.66, 110, 196, 164.81], // D minor, wandering
  boss:    [73.42, 65.41, 58.27, 87.31],                            // low stabs
  ending:  [293.66, 369.99, 440, 493.88, 587.33],                   // D major, dawn
};

function audioSchedule() {
  if (!audio.started || audio.muted) return;
  const ctx = audio.ctx;
  while (audio.nextNote < ctx.currentTime + 0.6) {
    const t = Math.max(audio.nextNote, ctx.currentTime);
    const scale = SCALES[audio.mood] || SCALES.explore;
    if (audio.mood === 'boss') {
      // driving low stabs with a war-drum thump
      const n = scale[audio.beat % 2 === 0 ? 0 : 1 + (audio.beat >> 1) % 3];
      pluck(t, n, 'sawtooth', 0.09, 0.3, false);
      thump(t, 90, 0.5);
      audio.nextNote += 0.46;
    } else if (audio.mood === 'ending') {
      if (audio.beat % 2 === 0) {
        pluck(t, scale[Math.floor(Math.random() * scale.length)], 'triangle', 0.07, 2.4, true);
      }
      audio.nextNote += 1.1;
    } else {
      // sparse, lonely plucks over the drone
      if (Math.random() < 0.72) {
        pluck(t, scale[Math.floor(Math.random() * scale.length)], 'triangle', 0.055, 2.0, true);
      }
      audio.nextNote += 1.5 + Math.random() * 1.2;
    }
    audio.beat++;
  }
}

function pluck(t, freq, type, vol, decay, echo) {
  const ctx = audio.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g);
  g.connect(audio.music);
  if (echo) g.connect(audio.delay);
  o.start(t); o.stop(t + decay + 0.1);
}

function thump(t, freq, vol) {
  const ctx = audio.ctx;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(audio.music);
  o.start(t); o.stop(t + 0.25);
}

// --- sound effects -----------------------------------------------------------
function noiseBurst(t, dur, filterType, from, to, vol) {
  const ctx = audio.ctx;
  const s = ctx.createBufferSource();
  s.buffer = audio.noise;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(to, 40), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(audio.sfx);
  s.start(t); s.stop(t + dur + 0.05);
}

function tone(t, from, to, type, dur, vol, dest) {
  const ctx = audio.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || audio.sfx);
  o.start(t); o.stop(t + dur + 0.05);
}

function sfx(name) {
  if (!audio.started || audio.muted) return;
  try {
    const t = audio.ctx.currentTime;
    switch (name) {
      case 'swing':
        noiseBurst(t, 0.16, 'bandpass', 2600, 500, 0.4);
        break;
      case 'hit':
        noiseBurst(t, 0.1, 'lowpass', 1800, 300, 0.5);
        tone(t, 160, 70, 'square', 0.1, 0.25);
        break;
      case 'arrow':
        noiseBurst(t, 0.1, 'highpass', 1500, 4000, 0.25);
        tone(t, 900, 300, 'sine', 0.08, 0.2);
        break;
      case 'kill':
        noiseBurst(t, 0.3, 'lowpass', 900, 120, 0.4);
        tone(t, 220, 60, 'sawtooth', 0.3, 0.2);
        break;
      case 'hurt':
        tone(t, 140, 55, 'sawtooth', 0.22, 0.4);
        noiseBurst(t, 0.15, 'lowpass', 700, 150, 0.3);
        break;
      case 'pickup':
        tone(t, 660, 660, 'sine', 0.08, 0.25);
        tone(t + 0.08, 990, 990, 'sine', 0.12, 0.25);
        break;
      case 'potion':
        for (let i = 0; i < 3; i++) tone(t + i * 0.07, 300 + i * 160, 380 + i * 160, 'sine', 0.09, 0.2);
        break;
      case 'sworddraw':
        noiseBurst(t, 0.3, 'highpass', 2500, 6500, 0.3);
        tone(t + 0.05, 1320, 1318, 'sine', 1.4, 0.18);
        tone(t + 0.05, 1980, 1975, 'sine', 1.0, 0.08);
        break;
      case 'quest':
        tone(t, 587, 587, 'triangle', 0.25, 0.25);
        tone(t + 0.18, 880, 880, 'triangle', 0.5, 0.25);
        break;
      case 'level':
        for (let i = 0; i < 4; i++) tone(t + i * 0.09, [294, 370, 440, 587][i], [294, 370, 440, 587][i], 'triangle', 0.25, 0.22);
        break;
      case 'roar':
        tone(t, 110, 40, 'sawtooth', 1.1, 0.5);
        tone(t, 165, 55, 'sawtooth', 1.1, 0.3);
        noiseBurst(t, 0.9, 'lowpass', 500, 90, 0.35);
        break;
      case 'bossdie':
        thump(t, 120, 0.8);
        tone(t, 98, 30, 'sawtooth', 1.8, 0.4);
        noiseBurst(t + 0.1, 1.4, 'lowpass', 800, 60, 0.4);
        tone(t + 0.6, 587, 587, 'sine', 2.2, 0.15);
        break;
      case 'death':
        tone(t, 330, 70, 'sawtooth', 1.3, 0.3);
        noiseBurst(t, 0.8, 'lowpass', 600, 80, 0.3);
        break;
      case 'bolt':
        noiseBurst(t, 0.18, 'bandpass', 500, 1600, 0.2);
        tone(t, 240, 480, 'sine', 0.15, 0.15);
        break;
    }
  } catch (err) { /* never let a sound break the game */ }
}
