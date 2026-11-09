/* Sharp Eyes: levels.js
   30 levels in 3 worlds. Each level is a few short rounds; each round is one grid with exactly one odd picture.
   cells: how many pictures in the grid (laid out to fit the screen, 4 = 2x2 ... 36 = 6x6)
   rounds: odd ones to find   time: seconds per round (0 = no timer, World 1 is for the youngest)
   d: [min, max] difficulty of the difference (0 = jumps out, 1 = look closely; see SpotItems.difficulty)
   Pictures never repeat in two rounds in a row. */
(function () {
  'use strict';
  var EASY = ['apple', 'fish', 'cat', 'bird', 'flower', 'house', 'kite', 'star', 'cup', 'sheep', 'butterfly', 'boat', 'umbrella', 'melon', 'shoe', 'camel'];
  var NIGHT = ['lantern', 'star', 'book', 'mat', 'sky', 'flower', 'butterfly', 'cat', 'cup', 'kite', 'bird', 'apple', 'umbrella', 'house'];
  var ALL = ['lantern', 'palm', 'camel', 'star', 'cup', 'book', 'kite', 'fish', 'cat', 'bird', 'apple', 'flower', 'house', 'boat', 'sky', 'mat', 'shoe', 'sheep', 'butterfly', 'melon', 'umbrella'];

  function L(cells, rounds, time, d0, d1, pool) { return { cells: cells, rounds: rounds, time: time, d: [d0, d1], pool: pool }; }
  var list = [
    // ---- World 1: Oasis Morning (no timer) ----
    L(4, 3, 0, 0, 0.15, EASY), L(4, 4, 0, 0, 0.2, EASY), L(6, 4, 0, 0, 0.25, EASY), L(6, 4, 0, 0, 0.35, EASY), L(9, 4, 0, 0, 0.35, EASY),
    L(9, 5, 0, 0.05, 0.45, EASY), L(9, 5, 0, 0.1, 0.5, EASY), L(12, 5, 0, 0.1, 0.5, EASY), L(12, 5, 0, 0.15, 0.55, EASY), L(16, 5, 0, 0.15, 0.6, EASY),
    // ---- World 2: Lantern Garden (gentle timer) ----
    L(9, 5, 15, 0.2, 0.6, NIGHT), L(12, 5, 15, 0.2, 0.65, NIGHT), L(12, 5, 14, 0.25, 0.7, NIGHT), L(16, 5, 15, 0.25, 0.7, NIGHT), L(16, 5, 14, 0.3, 0.75, NIGHT),
    L(16, 6, 14, 0.35, 0.8, NIGHT), L(20, 5, 15, 0.35, 0.8, NIGHT), L(20, 6, 14, 0.4, 0.85, NIGHT), L(25, 5, 16, 0.4, 0.85, NIGHT), L(25, 6, 15, 0.45, 0.9, NIGHT),
    // ---- World 3: Harbour Sunset ----
    L(16, 5, 13, 0.45, 0.9, ALL), L(20, 5, 14, 0.45, 0.9, ALL), L(20, 6, 13, 0.5, 0.95, ALL), L(25, 6, 15, 0.5, 0.95, ALL), L(25, 6, 14, 0.55, 1, ALL),
    L(30, 6, 16, 0.55, 1, ALL), L(30, 6, 15, 0.6, 1, ALL), L(36, 6, 18, 0.6, 1, ALL), L(36, 6, 17, 0.62, 1, ALL), L(36, 7, 16, 0.65, 1, ALL)
  ];
  window.SPOT_LEVELS = {
    list: list,
    worldOf: function (n) { return Math.min(2, Math.floor((n - 1) / 10)); }
  };
})();
