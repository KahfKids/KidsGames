/* Solar System: sounds.js
   This game's own sounds: a calm space feel. No music anywhere: no notes, scales, melodies or chimes.
   Only soft radar blips (single glides), filtered-noise swells and whooshes, sparkle grains, claps,
   and a very quiet low rumble of space. Built on Kit.sfx.define (js/kit/audio.js). */
(function () {
  'use strict';
  var K = window.Kit;
  var rumbleBuf = null;
  function rumbleNoise(c) { // our own long, looping brown noise for the space rumble
    if (rumbleBuf) return rumbleBuf;
    var n = c.sampleRate * 4, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    // fade the ends together so the loop has no click
    var x = Math.round(c.sampleRate * 0.25);
    for (i = 0; i < x; i++) { var k = i / x; d[i] = d[i] * k + d[n - x + i] * (1 - k); }
    return (rumbleBuf = b);
  }

  K.sfx.define({
    // a soft radar blip: one short downward glide with a tiny click on top
    tap: function (L, t) {
      L.glide(t, { from: 1500, to: 1050, dur: 0.07, vol: 0.09, glideFrac: 0.6 });
      L.click(t, { freq: 4200, vol: 0.05, dur: 0.01 });
    },
    // tapping a planet: a rounder blip, a little deeper for big planets (o.size 0..1)
    blip: function (L, t, o) {
      var s = o.size || 0.4, f = 1300 - s * 500;
      L.glide(t, { from: f, to: f * 0.62, dur: 0.11, vol: 0.12, glideFrac: 0.7 });
      L.burst(t, { dur: 0.05, freq: 2600, q: 2, vol: 0.04 });
    },
    // tapping empty space: the faintest tick
    tick: function (L, t) { L.click(t, { freq: 3400, vol: 0.06, dur: 0.012 }); },
    // a new question: soft airy shimmer
    ask: function (L, t) {
      L.whoosh(t, { dur: 0.35, from: 2400, to: 5200, vol: 0.05 });
      L.grains(t + 0.05, { n: 5, spread: 0.25, freq: 7500, vol: 0.05 });
    },
    // the camera flying to a planet: a deep "whoom"
    whoom: function (L, t, o) {
      var v = o.vol == null ? 1 : o.vol;
      L.burst(t, { dur: 0.9, freq: 140, sweepTo: 700, type: 'lowpass', q: 1.2, attack: 0.3, vol: 0.32 * v, brown: true });
      L.glide(t, { from: 95, to: 48, dur: 0.75, vol: 0.14 * v, attack: 0.12, glideFrac: 1 });
    },
    // the camera flying back out, level start
    whoosh: function (L, t) { L.burst(t, { dur: 0.6, freq: 900, sweepTo: 220, type: 'lowpass', q: 0.9, attack: 0.18, vol: 0.2, brown: true }); },
    // a fact card opening: a gentle swoosh
    swoosh: function (L, t) {
      L.whoosh(t, { dur: 0.32, from: 700, to: 3200, vol: 0.09 });
      L.grains(t + 0.18, { n: 4, spread: 0.12, freq: 8000, vol: 0.035 });
    },
    // a correct answer: a warm swell of filtered noise plus sparkle grains
    good: function (L, t) {
      L.burst(t, { dur: 1.1, freq: 260, sweepTo: 2600, type: 'lowpass', q: 2.5, attack: 0.35, vol: 0.2 });
      L.burst(t, { dur: 0.9, freq: 180, sweepTo: 900, type: 'lowpass', q: 1, attack: 0.3, vol: 0.18, brown: true });
      L.grains(t + 0.15, { n: 18, spread: 0.7, freq: 7000, vol: 0.09 });
    },
    // a wrong answer: a soft low bump
    bump: function (L, t) {
      L.thump(t, { from: 150, to: 70, dur: 0.16, vol: 0.32 });
      L.burst(t, { dur: 0.12, freq: 380, type: 'lowpass', q: 0.7, vol: 0.1, brown: true });
    },
    // out of hearts: a slow sigh of noise sinking away (gentle)
    lose: function (L, t) {
      L.burst(t, { dur: 1.1, freq: 1100, sweepTo: 160, type: 'lowpass', q: 1.2, attack: 0.15, vol: 0.18, brown: true });
      L.thump(t + 0.1, { from: 110, to: 50, dur: 0.4, vol: 0.18 });
    },
    // a shooting star: a quick sparkle streak
    shoot: function (L, t) {
      L.burst(t, { dur: 0.5, freq: 3500, sweepTo: 9000, type: 'highpass', q: 0.7, attack: 0.08, vol: 0.035, pan: -0.4 });
      L.grains(t + 0.05, { n: 9, spread: 0.45, freq: 9000, vol: 0.035 });
    },
    // level won: claps, sparkle and a whoosh of stardust (the device voice adds "MashaAllah!")
    win: function (L, t) {
      L.claps(t + 0.05, { people: 7, dur: 1.5, vol: 0.12 });
      L.grains(t, { n: 30, spread: 1.3, freq: 7000, vol: 0.08 });
      L.whoosh(t, { dur: 0.8, from: 400, to: 5000, vol: 0.1 });
    },
    // each star on the level-complete sheet: a sparkle burst that grows (o.n 0..2), never a rising note
    star: function (L, t, o) {
      var n = o.n || 0;
      L.grains(t, { n: 8 + n * 6, spread: 0.18 + n * 0.08, freq: 7500, vol: 0.08 + n * 0.02 });
      L.burst(t, { dur: 0.35, freq: 400, sweepTo: 2200, type: 'lowpass', q: 2, attack: 0.08, vol: 0.08 + n * 0.03 });
    },
    // the quiet bed of space: a very low rumble that fades in and out (the game repeats it so it overlaps)
    rumble: function (L, t) {
      var c = L.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), dur = 8;
      s.buffer = rumbleNoise(c); s.loop = true;
      f.type = 'lowpass'; f.frequency.setValueAtTime(110, t); f.frequency.linearRampToValueAtTime(190, t + dur / 2); f.frequency.linearRampToValueAtTime(120, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 3); g.gain.setValueAtTime(0.05, t + dur - 3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(L.out);
      s.start(t, Math.random() * 3); s.stop(t + dur + 0.05);
    }
  });
})();
