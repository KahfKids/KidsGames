/* Balloon Pop: levels.js
   24 levels in 3 worlds of 8. Goals are shown as pictures (a green balloon x 8, a good-deed card x 3),
   so children who can't read yet understand them.
     goals: [{ t: 'any', n }]           pop n balloons of any colour
            [{ t: 'color', c, n }]      pop n balloons of colour c (index into BalloonArt.COLORS)
            [{ t: 'deed', n }]          pop n good-deed balloons
   Tuning: rise = seconds a balloon takes to cross the screen, every = seconds between new balloons,
   max = balloons on screen at most, colors = colours that appear, deed/storm/rainbow = chance per new
   balloon, escape = a balloon that floats away (and was still needed) costs a heart.
   World 1 has no storms, no escapes and no way to lose: a 4-year-old can always win it. */
(function () {
  'use strict';
  var R = 0, O = 1, Y = 2, G = 3, B = 4, P = 5, K = 6;
  var W1 = { rise: 9.5, every: 1.25, max: 5, storm: 0, rainbow: 0, deed: 0.05, escape: false, hearts: 3 };
  var W2 = { rise: 7.8, every: 1.0, max: 6, storm: 0, rainbow: 0.03, deed: 0.06, escape: false, hearts: 3 };
  var W3 = { rise: 6.6, every: 0.85, max: 7, storm: 0.12, rainbow: 0.04, deed: 0.06, escape: false, hearts: 3 };
  function L(base, o) { var r = {}; for (var k in base) r[k] = base[k]; for (var j in o) r[j] = o[j]; return r; }

  var list = [
    // ---- World 1: Morning Garden (gentle, nothing to lose) ----
    L(W1, { name: 'Hello Balloons', goals: [{ t: 'any', n: 5 }], colors: [R, Y, B], max: 4, deed: 0 }),
    L(W1, { name: 'Red Balloons', goals: [{ t: 'color', c: R, n: 5 }], colors: [R, Y, B] }),
    L(W1, { name: 'Good Deeds', goals: [{ t: 'deed', n: 2 }], colors: [R, G, B, Y], deed: 0.3 }),
    L(W1, { name: 'Green Garden', goals: [{ t: 'color', c: G, n: 8 }], colors: [G, O, P, Y] }),
    L(W1, { name: 'Rainbow Fun', goals: [{ t: 'any', n: 12 }], colors: [R, O, Y, G, B], rainbow: 0.07, rise: 9 }),
    L(W1, { name: 'Blue and Yellow', goals: [{ t: 'color', c: B, n: 5 }, { t: 'color', c: Y, n: 5 }], colors: [B, Y, R, G], rise: 9 }),
    L(W1, { name: 'Kind Hearts', goals: [{ t: 'deed', n: 3 }, { t: 'any', n: 8 }], colors: [K, P, B, Y], deed: 0.25, rise: 8.8 }),
    L(W1, { name: 'Garden Party', goals: [{ t: 'any', n: 15 }, { t: 'deed', n: 2 }], colors: [R, O, Y, G, B, P, K], deed: 0.18, rainbow: 0.05, rise: 8.5, every: 1.1 }),

    // ---- World 2: Seaside (storm clouds and floating-away arrive) ----
    L(W2, { name: 'Sea Breeze', goals: [{ t: 'color', c: O, n: 8 }], colors: [O, B, K, G] }),
    L(W2, { name: 'Watch the Clouds', goals: [{ t: 'any', n: 10 }], colors: [R, Y, B, G], storm: 0.12, stormMax: 1 }),
    L(W2, { name: 'Float Away', goals: [{ t: 'any', n: 12 }], colors: [O, Y, B, K], escape: true, hearts: 5, max: 4, every: 1.15 }),
    L(W2, { name: 'Purple Shells', goals: [{ t: 'color', c: P, n: 10 }], colors: [P, B, K, Y], storm: 0.13 }),
    L(W2, { name: 'Beach Helpers', goals: [{ t: 'deed', n: 3 }, { t: 'color', c: K, n: 6 }], colors: [K, O, B, G], deed: 0.22, storm: 0.1 }),
    L(W2, { name: 'Catch Them All', goals: [{ t: 'any', n: 16 }], colors: [R, O, Y, G, B], escape: true, hearts: 5, storm: 0.08, max: 5 }),
    L(W2, { name: 'Green and Blue', goals: [{ t: 'color', c: G, n: 8 }, { t: 'color', c: B, n: 8 }], colors: [G, B, Y, P], storm: 0.14, rainbow: 0.05 }),
    L(W2, { name: 'Seaside Party', goals: [{ t: 'any', n: 20 }, { t: 'deed', n: 3 }], colors: [R, O, Y, G, B, P, K], deed: 0.15, storm: 0.14, rainbow: 0.05, rise: 7.4, every: 0.9 }),

    // ---- World 3: Lantern Night (quicker balloons, more clouds) ----
    L(W3, { name: 'Lantern Glow', goals: [{ t: 'color', c: Y, n: 12 }], colors: [Y, O, P, B] }),
    L(W3, { name: 'Night Kindness', goals: [{ t: 'deed', n: 4 }], colors: [K, P, B, G], deed: 0.24, storm: 0.14 }),
    L(W3, { name: 'Up, Up and Away', goals: [{ t: 'any', n: 18 }], colors: [R, Y, G, B, P], escape: true, hearts: 5, storm: 0.1, max: 5, every: 0.95 }),
    L(W3, { name: 'Red and Blue', goals: [{ t: 'color', c: R, n: 10 }, { t: 'color', c: B, n: 10 }], colors: [R, B, Y, G, P], storm: 0.16 }),
    L(W3, { name: 'Starry Deeds', goals: [{ t: 'deed', n: 4 }, { t: 'any', n: 15 }], colors: [O, Y, G, K, P], deed: 0.18, storm: 0.16 }),
    L(W3, { name: 'Sky Race', goals: [{ t: 'any', n: 24 }], colors: [R, O, Y, G, B, P], escape: true, hearts: 5, storm: 0.12, rainbow: 0.05, max: 6, rise: 6.2 }),
    L(W3, { name: 'Three Wishes', goals: [{ t: 'color', c: G, n: 8 }, { t: 'color', c: P, n: 8 }, { t: 'deed', n: 3 }], colors: [G, P, Y, O, K], deed: 0.16, storm: 0.18 }),
    L(W3, { name: 'Lantern Festival', goals: [{ t: 'any', n: 30 }, { t: 'deed', n: 4 }], colors: [R, O, Y, G, B, P, K], deed: 0.14, storm: 0.15, rainbow: 0.05, escape: true, hearts: 5, rise: 6.2, every: 0.75 })
  ];

  window.BALLOON_LEVELS = {
    list: list,
    perWorld: 8,
    worldOf: function (n) { return Math.floor((n - 1) / 8); },
    // Seconds a quick, careful child needs (used for the third star). wf = how much wider than a phone the
    // screen is (wider screens send more balloons at once).
    par: function (def, wf) {
      var every = def.every / wf, pops = 0, deeds = 0;
      def.goals.forEach(function (g) {
        if (g.t === 'deed') deeds += g.n;
        else if (g.t === 'color') pops += g.n * Math.min(2.4, 1 / (0.5 / def.goals.length + 0.5 / def.colors.length + 0.1));
        else pops += g.n;
      });
      var est = Math.max(pops * every, deeds * Math.max(4, every / Math.max(0.05, def.deed)) * 0.9);
      return Math.round(8 + def.rise * 0.5 + est * 1.7 + deeds * 2.5);
    }
  };
})();
