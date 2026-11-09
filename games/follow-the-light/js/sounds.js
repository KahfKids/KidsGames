/* Follow the Light: sounds.js
   This game's own sound effects on the kit's single audio context (Kit.sfx.define). No music: no notes,
   scales, chimes or bells. Each lantern has its own natural sound that matches its glass, and every pair
   differs in texture and length, not just pitch, so a child can remember and tell them apart:
     lantern0 gold star     -> sparkle crackle (bright glittering grains)
     lantern1 rose circle   -> water-drop bloop (one round drop and a tiny splash)
     lantern2 teal triangle -> wooden knock-knock (two hollow knocks)
     lantern3 blue diamond  -> bird chirp (two quick chirps)
     lantern4 violet flower -> leaf rustle (soft breathy shuffle)
     lantern5 orange drop   -> fire whoosh (low warm whoosh with crackles) */
(function () {
  'use strict';
  var K = window.Kit;
  function rnd(a, b) { return a + Math.random() * (b - a); }

  var DEFS = {
    // ---- the six lanterns ----
    lantern0: function (L, t) { // sparkle crackle
      L.grains(t, { n: 18, spread: 0.24, freq: 7000, q: 4, vol: 0.26 });
      L.grains(t + 0.02, { n: 7, spread: 0.16, freq: 10500, q: 5, vol: 0.14 });
      L.burst(t, { dur: 0.05, freq: 9000, type: 'highpass', q: 0.7, vol: 0.06 });
    },
    lantern1: function (L, t) { // water-drop bloop
      L.glide(t, { from: rnd(420, 470), to: 1250, dur: 0.11, vol: 0.3 });
      L.burst(t + 0.015, { dur: 0.06, freq: 2600, q: 1.2, vol: 0.06 });
      L.drop(t + 0.16, { size: 0.6, vol: 0.07 });
    },
    lantern2: function (L, t) { // wooden knock-knock
      L.knock(t, { size: 1.3, vol: 1.1 });
      L.knock(t + 0.13, { size: 1.25, vol: 0.85 });
    },
    lantern3: function (L, t) { // bird chirp: two fast downward chirps
      [0, 0.1].forEach(function (d, i) {
        var f = rnd(3600, 4000) * (i ? 0.94 : 1);
        L.glide(t + d, { from: f, to: f * 0.62, dur: 0.06, vol: 0.12, glideFrac: 1 });
        L.glide(t + d + 0.004, { from: f * 1.9, to: f * 1.2, dur: 0.04, vol: 0.025, glideFrac: 1 });
      });
    },
    lantern4: function (L, t) { // leaf rustle
      for (var i = 0; i < 7; i++) {
        L.burst(t + i * 0.045 + rnd(0, 0.03), { dur: rnd(0.05, 0.09), freq: rnd(2500, 4500), q: 0.9, attack: 0.012, vol: rnd(0.14, 0.22), pan: rnd(-0.3, 0.3) });
      }
      L.burst(t, { dur: 0.38, freq: 3200, q: 0.5, attack: 0.08, vol: 0.09 });
    },
    lantern5: function (L, t) { // fire whoosh with a few crackles
      L.burst(t, { dur: 0.48, freq: 260, sweepTo: 1300, type: 'lowpass', q: 0.7, attack: 0.14, vol: 0.5, brown: true });
      L.burst(t, { dur: 0.42, freq: 700, sweepTo: 1800, q: 0.8, attack: 0.16, vol: 0.08 });
      L.grains(t + 0.12, { n: 5, spread: 0.3, freq: 1700, q: 3, vol: 0.12 });
    },

    // ---- feedback ----
    tap: function (L, t) { // brass tick of a lantern ring
      L.click(t, { freq: 3400, vol: 0.16 });
      L.knock(t, { size: 0.55, vol: 0.25 });
    },
    nudge: function (L, t) { // a tap while the lights play: only a faint chain rattle
      L.grains(t, { n: 3, spread: 0.05, freq: 4200, q: 3, vol: 0.05 });
    },
    oops: function (L, t) { // soft puff and bonk, gentle
      L.burst(t, { dur: 0.28, freq: 700, sweepTo: 180, type: 'lowpass', q: 0.6, attack: 0.02, vol: 0.32, brown: true });
      L.thump(t + 0.02, { from: 170, to: 80, dur: 0.14, vol: 0.22 });
    },
    cheer: function (L, t) { // round complete: sparkle shower and a few claps
      L.grains(t, { n: 22, spread: 0.5, freq: 7600, q: 4, vol: 0.17 });
      L.whoosh(t, { dur: 0.35, from: 900, to: 3600, vol: 0.07 });
      L.claps(t + 0.08, { people: 4, dur: 0.75, vol: 0.17 });
    },
    glint: function (L, t) { // one lantern flaring during the level-win wave
      L.grains(t, { n: 7, spread: 0.12, freq: 8500, q: 5, vol: 0.08 });
    },
    win: function (L, t) { // level complete: big claps, sparkle burst, confetti whoosh
      L.whoosh(t, { dur: 0.6, from: 400, to: 3200, vol: 0.14 });
      L.grains(t + 0.1, { n: 40, spread: 1.2, freq: 7600, q: 4, vol: 0.16 });
      L.claps(t + 0.12, { people: 10, dur: 1.9, vol: 0.2 });
    },
    lose: function (L, t) { // out of hearts: a soft deflating puff, never harsh
      L.burst(t, { dur: 0.7, freq: 900, sweepTo: 140, type: 'lowpass', q: 0.5, attack: 0.05, vol: 0.28, brown: true });
    },
    star: function (L, t, o) { // each star on the level-complete sheet: a pop of light, more glitter per star
      var n = o.n || 0;
      L.thump(t, { from: 220, to: 120, dur: 0.07, vol: 0.18 });
      L.grains(t, { n: 9 + n * 6, spread: 0.25 + n * 0.08, freq: 8000, q: 5, vol: 0.1 + n * 0.02 });
    },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 500, to: 2200, vol: 0.12 }); }
  };
  K.sfx.define(DEFS);

  // Names the game uses for each lantern colour index.
  window.LightSound = {
    lantern: function (ci, o) { K.sfx.play('lantern' + (ci % 6), o); },
    play: function (name, o) { K.sfx.play(name, o); },
    names: Object.keys(DEFS), defs: DEFS
  };
})();
