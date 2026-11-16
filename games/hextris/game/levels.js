/* Hextris (Kahf Kids edition): levels.js
   15 levels in 3 worlds plus an endless mode. Kid mode throughout: slow falls, few colours at first,
   a gentle ramp inside each level and hearts before game over.
   goal: { type: 'groups', n } clear n groups, or { type: 'score', n } reach a score.
   colors: how many tile colours. speed: fall speed (units/s; the field is ~200 units from the centre to the
   limit line). gap: seconds between drops at the start -> at the end of the level. help: chance that a new
   tile copies a colour already on top of a stack (makes matches easier). patterns: weighted drop shapes. */
(function () {
  'use strict';
  function L(name, colors, goal, speed, gap, help, patterns) {
    return { name: name, colors: colors, goal: goal, speed: speed, gap: gap, help: help, patterns: patterns };
  }
  var G = function (n) { return { type: 'groups', n: n }; };
  var S = function (n) { return { type: 'score', n: n }; };

  var list = [
    // ---- World 1: Fountain Garden (2-3 colours, single tiles, very slow) ----
    L('First Turn',      2, G(3),   40, [2.9, 2.5], 0.6,  { single: 1 }),
    L('Three Colours',   3, G(4),   42, [2.8, 2.4], 0.55, { single: 1 }),
    L('Little Pairs',    3, G(5),   45, [2.8, 2.2], 0.5,  { single: 3, double: 1 }),
    L('Garden Path',     3, S(300), 47, [2.7, 2.1], 0.45, { single: 3, double: 1, half: 1 }),
    L('Fountain Bloom',  3, G(8),   50, [2.6, 2.0], 0.4,  { single: 3, double: 1, half: 1, cross: 1 }),
    // ---- World 2: Lantern Court (4 colours, more shapes) ----
    L('Four Lanterns',   4, G(5),   48, [2.8, 2.3], 0.5,  { single: 1 }),
    L('Opposites',       4, G(6),   51, [2.7, 2.2], 0.45, { single: 3, cross: 1 }),
    L('Lantern Spiral',  4, S(450), 54, [2.6, 2.0], 0.4,  { single: 3, double: 1, spiral: 1 }),
    L('Half Moon Arch',  4, G(9),   56, [2.5, 1.9], 0.38, { single: 3, double: 1, half: 1, cross: 1 }),
    L('Night Market',    4, S(650), 58, [2.4, 1.8], 0.35, { single: 3, double: 1, half: 1, cross: 1, spiral: 1 }),
    // ---- World 3: Sunrise Terrace (faster, rings of tiles, 5 colours at the end) ----
    L('Dawn Tiles',      4, G(10),  60, [2.3, 1.7], 0.35, { single: 3, double: 1, half: 1, cross: 1 }),
    L('Rose Spiral',     4, S(850), 62, [2.2, 1.6], 0.32, { single: 3, double: 1, spiral: 1, ring: 1 }),
    L('Twin Rings',      4, G(12),  64, [2.2, 1.6], 0.3,  { single: 3, double: 1, half: 1, cross: 1, ring: 1 }),
    L('Five Glazes',     5, G(9),   58, [2.5, 1.9], 0.4,  { single: 3, double: 1, half: 1 }),
    L('Sunrise Dome',    5, S(1000), 62, [2.3, 1.7], 0.36, { single: 3, double: 1, half: 1, cross: 1, spiral: 1 })
  ];

  // How often a random tile avoids clearing right where it falls (so turning matters): gentle at first.
  list.forEach(function (lv, i) { lv.avoid = Math.min(0.92, 0.45 + i * 0.1); });

  window.HEX_LEVELS = {
    list: list,
    perWorld: 5,
    worldOf: function (n) { return Math.floor((n - 1) / 5); },
    // Endless: starts like level 2 and ramps with the number of groups cleared (k), capped well below arcade speed.
    endless: function (k) {
      var t = Math.min(1, k / 60);
      return {
        name: 'Endless', colors: k < 8 ? 3 : k < 30 ? 4 : 5, goal: null,
        speed: 44 + t * 50, gap: [2.6 - t * 1.4, 2.6 - t * 1.4], help: 0.45 - t * 0.25, avoid: 0.55 + t * 0.35,
        patterns: k < 5 ? { single: 1 } : k < 15 ? { single: 3, double: 1, half: 1 } :
          { single: 3, double: 1, half: 1, cross: 1, spiral: 1, ring: k > 30 ? 1 : 0 }
      };
    }
  };
})();
