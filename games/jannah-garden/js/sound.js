/* Jannah Garden: sound.js
   The garden's own natural sounds, built on the kit's one audio context (Kit.sfx.define). No music of any kind:
   only natural, foley-style effects. Soil pats, leaf rustles, woody creaks, water splashes and bubbles, bird chirps,
   wing flutters, a warm lantern whoosh, wood knocks, a wicker basket, sparkles and soft claps, plus a quiet
   ambience (river trickle, distant birds, breeze in the leaves). Mute, unlock and pause-on-hide come from the kit.
   GardenSound.say() speaks goals and praise with the device voice. */
(function () {
  'use strict';
  var K = window.Kit;
  function r(a, b) { return a + Math.random() * (b - a); }

  // Leaves rustling: a handful of short, airy noise flicks. amt = how much (1 = a few leaves).
  function rustle(L, t, amt, lo, hi, spread) {
    var n = Math.round(4 * amt);
    for (var i = 0; i < n; i++) L.burst(t + Math.random() * (spread || 0.12 + 0.05 * amt), { dur: r(0.04, 0.1), freq: r(lo || 3200, hi || 6500), q: 0.9, vol: r(0.03, 0.06), pan: r(-0.4, 0.4) });
  }
  // A soft pat of earth: a low body thump with a puff of crumbly soil.
  function pat(L, t, size, vol) {
    size = size || 1; vol = vol == null ? 1 : vol;
    L.thump(t, { from: 150 / size, to: 55 / size, dur: 0.09 * size, vol: 0.3 * vol });
    L.burst(t, { dur: 0.08 * size, freq: 520 / size, type: 'lowpass', q: 0.7, brown: true, vol: 0.32 * vol });
    L.grains(t + 0.015, { n: 4, spread: 0.07, freq: 2000, q: 2, vol: 0.05 * vol, dur: 0.012 });
  }
  // A small bird: two or three quick, random chirps (each a single glide, never a tune).
  function chirp(L, t, vol, pan) {
    var n = 2 + (Math.random() < 0.5 ? 1 : 0), tt = t;
    for (var i = 0; i < n; i++) {
      var f = r(3000, 4200), up = Math.random() < 0.6;
      L.glide(tt, { from: up ? f : f * 1.45, to: up ? f * 1.5 : f * 0.8, dur: r(0.04, 0.07), vol: vol, attack: 0.004 });
      tt += r(0.07, 0.12);
    }
    L.burst(t, { dur: 0.03, freq: 6000, q: 2, vol: vol * 0.25, pan: pan || 0 });
  }
  // Wings: quick soft air puffs that fade.
  function wings(L, t, n, vol) { for (var i = 0; i < n; i++) L.burst(t + i * r(0.03, 0.04), { dur: 0.028, freq: r(900, 1400), type: 'lowpass', q: 0.8, vol: vol * (1 - i / (n + 2)) }); }
  // Water: a splash plus a few bubbles of random size.
  function splash(L, t, size, vol) {
    vol = vol == null ? 1 : vol;
    L.burst(t, { dur: 0.22 * size, freq: 2200, sweepTo: 650, q: 0.6, vol: 0.18 * vol });
    L.burst(t + 0.02, { dur: 0.12 * size, freq: 5000, q: 1, vol: 0.05 * vol });
    for (var i = 0; i < 2 + Math.round(size * 2); i++) L.drop(t + r(0.04, 0.22) * size, { size: r(0.55, 1.2), vol: 0.1 * vol });
  }

  K.sfx.define({
    // the kit's sheet buttons: a light leaf tick
    tap: function (L, t) { L.click(t, { freq: 3300, vol: 0.13 }); L.burst(t + 0.006, { dur: 0.045, freq: 5200, q: 1, vol: 0.035 }); },
    // each star on the level-complete sheet: a sparkle that grows brighter (more grains), with a leafy swish
    star: function (L, t, o) {
      var n = o.n || 0;
      L.grains(t, { n: 9 + n * 5, spread: 0.2 + n * 0.05, freq: 7500, vol: 0.08 + n * 0.015 });
      L.burst(t, { dur: 0.18, freq: 2600, sweepTo: 7000, q: 0.9, vol: 0.05 + n * 0.01 });
      rustle(L, t + 0.03, 1 + n * 0.5, 4000, 7000);
    },
    // planting a flower: a soft soil pat, a little leaf rustle, a pinch of sparkle as it pops up
    plant: function (L, t) { pat(L, t, 1, 0.9); rustle(L, t + 0.06, 1.2); L.grains(t + 0.14, { n: 5, spread: 0.2, freq: 8200, vol: 0.04 }); },
    // a bush: a pat and a bigger, lower rustle
    bush: function (L, t) { pat(L, t, 1.1, 0.9); rustle(L, t + 0.05, 2.4, 2200, 4800, 0.28); },
    // a tree growing: a deep pat, a woody creak (a slowing train of clicks), then the leaves shake
    tree: function (L, t) {
      pat(L, t, 1.4, 1);
      var tt = t + 0.1;
      for (var i = 0; i < 16; i++) { L.burst(tt, { dur: 0.012, freq: r(650, 900), q: 6, vol: 0.085 * (1 - i / 20) }); tt += 0.016 + i * 0.0025; }
      L.burst(t + 0.1, { dur: 0.35, freq: 420, q: 3, vol: 0.04, brown: true });
      rustle(L, t + 0.32, 3.2, 2600, 6000, 0.4);
    },
    // fountain and pond: a splash and bubbles
    water: function (L, t) { splash(L, t, 1, 1); },
    // tapping the river or a basin: a bigger splash
    splash: function (L, t) { splash(L, t, 1.3, 1.1); },
    // birdhouse (and tapping the sky): a little bird chirps and flaps away
    chirp: function (L, t) { chirp(L, t, 0.07, r(-0.3, 0.3)); wings(L, t + 0.22, 5, 0.06); },
    // butterfly: soft wing flutters and a faint shimmer
    flutter: function (L, t) { wings(L, t, 9, 0.08); L.grains(t + 0.05, { n: 4, spread: 0.25, freq: 9000, vol: 0.03 }); },
    // lantern: a warm glow whoosh with a soft flame crackle
    glow: function (L, t) {
      L.whoosh(t, { dur: 0.5, from: 260, to: 1300, vol: 0.15, brown: true });
      L.thump(t + 0.12, { from: 95, to: 60, dur: 0.18, vol: 0.12 });
      L.grains(t + 0.15, { n: 6, spread: 0.35, freq: 2800, q: 1.5, vol: 0.035 });
    },
    // bench: two wooden knocks as it is set down
    wood: function (L, t) { L.knock(t, { size: 1.15, vol: 0.85 }); L.knock(t + r(0.1, 0.13), { size: 1.3, vol: 0.55 }); pat(L, t + 0.02, 1, 0.4); },
    // picking something up: pulling it out of the grass
    pick: function (L, t) { L.burst(t, { dur: 0.13, freq: 2400, sweepTo: 5200, q: 0.8, vol: 0.09 }); rustle(L, t, 1); L.thump(t + 0.07, { from: 230, to: 140, dur: 0.05, vol: 0.1 }); },
    // putting it down again: a soft pat
    drop: function (L, t) { pat(L, t, 0.9, 0.75); rustle(L, t + 0.03, 0.6); },
    // into the basket: a wicker crunch
    basket: function (L, t) {
      L.grains(t, { n: 14, spread: 0.13, freq: 1700, q: 1.6, vol: 0.11, dur: 0.02 });
      L.burst(t, { dur: 0.16, freq: 900, q: 0.8, vol: 0.07 });
      L.thump(t + 0.03, { from: 160, to: 85, dur: 0.1, vol: 0.18 });
    },
    // a drag that was let go of nowhere: a tiny puff of air
    soft: function (L, t) { L.burst(t, { dur: 0.14, freq: 700, type: 'lowpass', q: 0.7, vol: 0.07, brown: true }); },
    // the garden is full: a gentle bump
    full: function (L, t) { L.thump(t, { from: 120, to: 80, dur: 0.12, vol: 0.18 }); rustle(L, t, 0.7); },
    // a goal met: a sparkle and soft claps (more of both for each goal)
    goal: function (L, t, o) {
      var n = o.n || 1;
      L.grains(t, { n: 12 + n * 6, spread: 0.35, freq: 7800, vol: 0.08 });
      L.whoosh(t, { dur: 0.3, from: 1200, to: 5000, vol: 0.06 });
      L.claps(t + 0.08, { people: 2 + n, dur: 0.6 + n * 0.15, vol: 0.075 });
    },
    // the level is done: a big round of claps, a confetti whoosh and lots of sparkle
    win: function (L, t) {
      L.whoosh(t, { dur: 0.6, from: 600, to: 4200, vol: 0.12 });
      L.grains(t + 0.05, { n: 34, spread: 0.9, freq: 7600, vol: 0.08 });
      L.claps(t + 0.1, { people: 9, dur: 1.7, vol: 0.1 });
    },
    // saved to My Gardens: a soft whoosh into the album and a sparkle
    saved: function (L, t) { L.whoosh(t, { dur: 0.35, from: 900, to: 3500, vol: 0.09 }); L.grains(t + 0.15, { n: 12, spread: 0.3, freq: 7800, vol: 0.07 }); pat(L, t + 0.3, 0.8, 0.5); },
    // ---- quiet ambience (played now and then by the game) ----
    trickle: function (L, t) { L.drop(t, { size: r(0.35, 0.65), vol: 0.022 }); L.burst(t, { dur: 0.14, freq: r(1400, 3200), q: 2, vol: 0.012, pan: r(-0.6, 0.6) }); },
    birdsFar: function (L, t) { var p = r(-0.8, 0.8); chirp(L, t, 0.018, p); if (Math.random() < 0.5) chirp(L, t + r(0.4, 0.9), 0.012, -p); },
    breeze: function (L, t) {
      L.burst(t, { dur: 2.6, freq: 380, sweepTo: 900, q: 0.5, attack: 1.1, vol: 0.03, brown: true });
      for (var i = 0; i < 6; i++) L.burst(t + r(0.6, 2.0), { dur: r(0.06, 0.14), freq: r(3500, 6500), q: 0.9, vol: 0.012, pan: r(-0.7, 0.7) });
    }
  });

  window.GardenSound = {
    play: function (name, o) { K.sfx.play(name, o); },
    // Spoken goals and praise for children who can't read yet (device voice, works offline where available).
    // English goals use the best installed English voice; praise is spoken in Arabic (Kit.say).
    say: function (text) { K.say.text(text, 'en'); },
    praise: function (key) { K.say.praise(key); }
  };
})();
