/* Kahf KidsGames quiz engine: sounds.js
   The sounds every quiz shares (no music, no notes): a paper card tick, a flame catching, a soft wooden
   knock, a cloth thud, a latch rattle, and hand claps at the end of a stop. Built on Kit.sfx.lib. */
(function () {
  'use strict';
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  Kit.sfx.define({
    // a card tapped on a table
    tap: function (L, t) { L.burst(t, { dur: 0.02, freq: 3200, q: 2.5, vol: 0.16 }); L.thump(t, { from: 380, to: 240, dur: 0.03, vol: 0.07 }); },
    // right answer: a lantern flame catches (soft puff, then a few bright sparks)
    correct: function (L, t) {
      L.burst(t, { dur: 0.16, freq: 500, sweepTo: 1500, q: 0.7, vol: 0.2, brown: true });
      L.grains(t + 0.07, { n: 7, spread: 0.16, freq: 6200, vol: 0.1, q: 3 });
      L.knock(t, { freq: 620, vol: 0.14 });
    },
    // wrong answer: a soft cloth thud, nothing harsh
    wrong: function (L, t) { L.thump(t, { from: 170, to: 80, dur: 0.14, vol: 0.3 }); L.burst(t, { dur: 0.07, freq: 420, q: 0.8, vol: 0.1, brown: true }); },
    // a card dropped into a basket or a slot
    place: function (L, t) { L.knock(t, { freq: rnd(520, 640), vol: 0.2 }); L.burst(t + 0.01, { dur: 0.03, freq: 2400, q: 2, vol: 0.08 }); },
    // a locked lantern: a small latch rattle
    locked: function (L, t) { L.click(t, { freq: 1500, vol: 0.14 }); L.click(t + 0.07, { freq: 1300, vol: 0.12 }); },
    // each star on the finished sheet: a spark
    star: function (L, t, o) { L.grains(t, { n: 9, spread: 0.18, freq: 6800 + (o.n || 0) * 300, vol: 0.12, q: 3 }); L.knock(t, { freq: 700, vol: 0.12 }); },
    // stop finished: people clapping
    win: function (L, t) { L.claps(t, { n: 14, spread: 0.9, vol: 0.2 }); L.whoosh(t, { dur: 0.4, from: 600, to: 2600, vol: 0.1 }); }
  });
})();
