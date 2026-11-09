/* Star Rangers: sounds.js
   A toy-space soundscape, defined on the shared kit (Kit.sfx.define: one AudioContext, shared mute, unlock and
   pause-on-hide are handled by the kit). No music anywhere: no notes, scales, jingles or chimes. Everything is
   foley-style: pews, bubble pops, toy-robot clunks and servo whirrs, propeller flutter, crunchy rock cracks,
   cushioned booms with debris grains, fizzes, hums, sparkle grains and claps. Streaks get MORE grains, never a
   higher pitch. game.js calls StarSfx.play(name, opts). */
(function () {
  'use strict';
  var Kit = window.Kit, last = {};
  function rnd(a, b) { return a + Math.random() * (b - a); }
  // Rate limit for sounds that can fire many times a second (keeps fast play from piling up).
  function gap(L, name, s) { var now = L.ctx.currentTime; if (last[name] && now - last[name] < s) return false; last[name] = now; return true; }
  function debris(L, t, n, spread, vol) { L.grains(t, { n: n, spread: spread, freq: 2400, q: 2, dur: 0.03, vol: vol }); }
  function rumble(L, t, dur, vol, freq) { L.burst(t, { brown: true, type: 'lowpass', dur: dur, freq: freq || 900, sweepTo: 90, q: 0.7, attack: 0.006, vol: vol }); }

  Kit.sfx.define({
    // ---- interface ----
    tap: function (L, t) { L.click(t, { freq: 3400, vol: 0.15 }); L.knock(t, { size: 0.45, vol: 0.35 }); },
    star: function (L, t, o) { // each star on the wave-clear sheet: a soft landing thump and a sparkle spray (more grains per star)
      var n = o.n || 0;
      L.thump(t, { from: 170, to: 80, dur: 0.12, vol: 0.2 });
      L.whoosh(t, { dur: 0.22, from: 1500, to: 5200, vol: 0.06 });
      L.grains(t + 0.04, { n: 10 + n * 7, spread: 0.35, freq: 7500, vol: 0.09 });
    },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 500, to: 2600, vol: 0.12 }); },

    // ---- the ranger ----
    laser: function (L, t) { // soft toy "pew"
      if (!gap(L, 'laser', 0.12)) return;
      var f = rnd(1450, 1700);
      L.glide(t, { from: f, to: f * 0.36, dur: 0.09, vol: 0.045, glideFrac: 1 });
      L.burst(t, { dur: 0.035, freq: 5200, q: 1, vol: 0.02 });
    },
    hurt: function (L, t) { // a gentle bonk, not a crash
      L.thump(t, { from: 250, to: 105, dur: 0.17, vol: 0.32 });
      L.knock(t, { size: 1.4, vol: 0.45 });
      L.burst(t, { brown: true, dur: 0.2, freq: 700, sweepTo: 220, q: 0.8, vol: 0.1 });
    },
    shipDown: function (L, t) { // cushioned poof with tumbling bits
      rumble(L, t, 0.8, 0.32, 1100);
      L.thump(t, { from: 130, to: 40, dur: 0.45, vol: 0.32 });
      debris(L, t + 0.05, 14, 0.6, 0.06);
    },
    lose: function (L, t) { // a soft deflating whoosh
      L.whoosh(t + 0.35, { dur: 0.7, from: 1800, to: 260, vol: 0.09 });
      L.thump(t + 0.4, { from: 110, to: 50, dur: 0.35, vol: 0.18 });
    },
    warp: function (L, t) { // jump-in whoosh with a low surge
      L.burst(t, { brown: true, dur: 0.9, freq: 250, sweepTo: 2600, q: 1.2, attack: 0.35, vol: 0.14 });
      L.whoosh(t + 0.1, { dur: 0.6, from: 700, to: 5000, vol: 0.08 });
      L.thump(t + 0.55, { from: 90, to: 50, dur: 0.3, vol: 0.12 });
    },

    // ---- enemies ----
    spark: function (L, t) { // a bubbly spark-shot pop
      if (!gap(L, 'spark', 0.05)) return;
      L.glide(t, { from: 230, to: 720, dur: 0.08, vol: 0.11, glideFrac: 0.7 });
      L.burst(t + 0.02, { dur: 0.05, freq: 1700, q: 2, vol: 0.05 });
    },
    charge: function (L, t) { // a little power-up whirr before a spark or boss attack
      if (!gap(L, 'charge', 0.3)) return;
      L.glide(t, { from: 170, to: 400, dur: 0.5, vol: 0.035, type: 'triangle', attack: 0.25, glideFrac: 1 });
      L.burst(t, { dur: 0.5, freq: 800, sweepTo: 2600, q: 3, attack: 0.3, vol: 0.025 });
    },
    whirr: function (L, t) { // a toy robot's servo as it dives
      if (!gap(L, 'whirr', 0.25)) return;
      L.glide(t, { from: 520, to: 210, dur: 0.32, vol: 0.05, type: 'triangle', glideFrac: 1 });
      L.burst(t, { dur: 0.32, freq: 1900, sweepTo: 600, q: 2.5, vol: 0.04 });
    },
    servo: function (L, t) { // a squad of robots flying in: servo bzzts and clicks
      for (var i = 0; i < 2; i++) {
        L.glide(t + i * 0.16, { from: 260, to: 360, dur: 0.11, vol: 0.035, type: 'triangle', glideFrac: 1 });
        L.click(t + i * 0.16 + 0.1, { freq: 2200, vol: 0.08 });
      }
    },
    buzz: function (L, t) { // drone propellers fluttering past
      if (!gap(L, 'buzz', 0.35)) return;
      for (var i = 0; i < 12; i++) { var e = Math.sin(i / 11 * Math.PI); L.burst(t + i * 0.024, { dur: 0.016, freq: 420, q: 1.4, vol: 0.06 * e + 0.005 }); }
    },
    clunk: function (L, t) { // a bolt bonking a toy robot's shell
      if (!gap(L, 'clunk', 0.04)) return;
      L.knock(t, { size: 0.7, vol: 0.55 });
      L.click(t, { freq: 4300, vol: 0.07 });
    },
    chip: function (L, t) { // a bolt chipping an asteroid
      if (!gap(L, 'chip', 0.04)) return;
      L.burst(t, { dur: 0.04, freq: 2600, q: 2, vol: 0.12 });
      L.grains(t + 0.01, { n: 3, spread: 0.06, freq: 3000, q: 2, vol: 0.06 });
    },
    boom: function (L, t, o) { // a robot pops apart: cushioned rumble, a clunk and debris grains
      if (!gap(L, 'boom', 0.035)) return;
      var s = o.size || 1;
      rumble(L, t, 0.4 * s, 0.24 * Math.min(1.3, s));
      L.thump(t, { from: 140, to: 45, dur: 0.28 * s, vol: 0.28 });
      L.knock(t, { size: 1.3, vol: 0.3 });
      debris(L, t + 0.05, Math.round(5 * s), 0.3 * s, 0.05);
    },
    crack: function (L, t, o) { // an asteroid crunches into gravel
      if (!gap(L, 'crack', 0.035)) return;
      var s = o.size || 1;
      L.burst(t, { dur: 0.07, freq: 3000, q: 0.8, vol: 0.18 });
      L.burst(t, { brown: true, dur: 0.25 * s, freq: 1300, sweepTo: 280, q: 1, vol: 0.2 });
      L.grains(t + 0.02, { n: Math.round(9 * s), spread: 0.25 * s, freq: 2000, q: 1.5, dur: 0.025, vol: 0.09 });
      L.thump(t, { from: 120, to: 50, dur: 0.18, vol: 0.18 });
    },
    zap: function (L, t) { // a drone fizzles out
      if (!gap(L, 'zap', 0.035)) return;
      L.burst(t, { dur: 0.16, freq: 4200, sweepTo: 700, q: 4, vol: 0.09 });
      L.thump(t + 0.03, { from: 170, to: 60, dur: 0.15, vol: 0.2 });
      debris(L, t + 0.05, 4, 0.2, 0.05);
    },
    junk: function (L, t) { // tin cans and gears clatter
      if (!gap(L, 'junk', 0.035)) return;
      L.burst(t, { dur: 0.06, freq: 2600, q: 6, vol: 0.1 });
      L.burst(t + 0.055, { dur: 0.05, freq: 3300, q: 6, vol: 0.07 });
      L.knock(t, { size: 0.8, vol: 0.35 });
      L.grains(t + 0.03, { n: 6, spread: 0.2, freq: 4200, q: 3, vol: 0.05 });
    },
    combo: function (L, t, o) { // streaks: more sparkle grains (never a rising pitch)
      var k = o.step || 2;
      L.grains(t, { n: 3 + k * 2, spread: 0.12 + k * 0.02, freq: 8200, vol: 0.05 + Math.min(0.05, k * 0.004) });
    },

    // ---- pickups ----
    collect: function (L, t) { // a star: tiny bubble pop with sparkle
      if (!gap(L, 'collect', 0.03)) return;
      L.drop(t, { size: 0.55, vol: 0.09 });
      L.grains(t, { n: 5, spread: 0.12, freq: 8200, vol: 0.06 });
    },
    powerup: function (L, t) { // a sparkly swoosh
      L.whoosh(t, { dur: 0.4, from: 600, to: 4200, vol: 0.11 });
      L.glide(t, { from: 200, to: 760, dur: 0.32, vol: 0.05, glideFrac: 1 });
      L.grains(t + 0.1, { n: 18, spread: 0.4, freq: 7600, vol: 0.08 });
    },
    shieldUp: function (L, t) { // the bubble shield fizzes on
      L.burst(t, { type: 'highpass', dur: 0.55, freq: 5000, q: 0.7, attack: 0.15, vol: 0.07 });
      L.grains(t, { n: 16, spread: 0.45, freq: 9000, vol: 0.05 });
      L.glide(t, { from: 140, to: 280, dur: 0.4, vol: 0.05, type: 'triangle', glideFrac: 1 });
    },
    shieldBlock: function (L, t) { // the shield pops and fizzes away
      L.burst(t, { dur: 0.25, freq: 6000, sweepTo: 1500, q: 1.5, vol: 0.14 });
      L.thump(t, { from: 380, to: 120, dur: 0.1, vol: 0.2 });
      L.grains(t + 0.03, { n: 10, spread: 0.25, freq: 8000, vol: 0.06 });
    },
    magnet: function (L, t) { // a low hum with a swoosh
      L.glide(t, { from: 70, to: 96, dur: 0.6, vol: 0.12, type: 'triangle', attack: 0.1, glideFrac: 1 });
      L.whoosh(t + 0.05, { dur: 0.5, from: 300, to: 2600, vol: 0.11 });
    },

    // ---- boss machines ----
    bossIn: function (L, t) { // a big machine rumbles in, servos whirring
      L.burst(t, { brown: true, type: 'lowpass', dur: 1.6, freq: 500, q: 0.6, attack: 0.6, vol: 0.28 });
      L.glide(t + 0.3, { from: 110, to: 170, dur: 0.45, vol: 0.06, type: 'triangle', glideFrac: 1 });
      L.glide(t + 0.85, { from: 170, to: 120, dur: 0.4, vol: 0.05, type: 'triangle', glideFrac: 1 });
      L.knock(t + 1.3, { size: 2, vol: 0.45 });
    },
    clank: function (L, t) { // a bolt clanks on the glowing core
      if (!gap(L, 'clank', 0.05)) return;
      L.burst(t, { dur: 0.12, freq: 3400, q: 9, vol: 0.07 });
      L.burst(t, { dur: 0.08, freq: 5200, q: 7, vol: 0.045 });
      L.thump(t, { from: 300, to: 140, dur: 0.08, vol: 0.17 });
      L.click(t, { freq: 4800, vol: 0.06 });
    },
    dig: function (L, t) { // the digger revs up for its dash
      L.burst(t, { brown: true, type: 'lowpass', dur: 1.4, freq: 420, q: 0.5, attack: 0.3, vol: 0.24 });
      L.grains(t + 0.1, { n: 22, spread: 1.2, freq: 900, q: 1.5, dur: 0.03, vol: 0.05 });
    },
    big: function (L, t) { // a boss machine breaks apart: crash, rumble and clattering pieces
      rumble(L, t, 1.6, 0.38, 1500);
      L.thump(t, { from: 120, to: 35, dur: 0.8, vol: 0.38 });
      for (var i = 0; i < 5; i++) L.burst(t + rnd(0.05, 0.55), { dur: 0.08, freq: rnd(2000, 4000), q: 6, vol: 0.08 });
      debris(L, t + 0.1, 36, 1.3, 0.06);
    },

    // ---- wave clear ----
    win: function (L, t) { // a confetti pop, sparkle and a little crowd clapping
      L.burst(t + 0.05, { dur: 0.12, freq: 1600, sweepTo: 400, q: 1, vol: 0.16 });
      L.thump(t + 0.05, { from: 180, to: 70, dur: 0.14, vol: 0.2 });
      L.whoosh(t, { dur: 0.5, from: 400, to: 4200, vol: 0.1 });
      L.grains(t + 0.1, { n: 30, spread: 1.2, freq: 8000, vol: 0.07 });
      L.claps(t + 0.2, { people: 7, dur: 1.6, vol: 0.11 });
    }
  });

  window.StarSfx = { play: function (name, o) { Kit.sfx.play(name, o); } };
})();
