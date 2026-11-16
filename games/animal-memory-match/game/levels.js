/* Memory Match: levels.js
   24 levels in 4 worlds of 6. pairs: how many pairs (cards = pairs x 2, laid out to fit the screen).
   peek: seconds all cards show face up at the start (gentle help that gets shorter). twins: how many look-alike
   pairs of animals to include (sheep and goat, horse and donkey...). pool: the animals this world draws from;
   animals not yet in the child's album come first, so every world brings new friends. */
(function () {
  'use strict';
  var DESERT = ['camel', 'horse', 'donkey', 'sheep', 'goat', 'ant', 'locust', 'spider'];
  var GARDEN = ['bee', 'butterfly', 'hoopoe', 'frog', 'quail', 'cow', 'birds', 'sheep', 'ant', 'spider', 'goat'];
  var SEA = ['whale', 'fish', 'crow', 'elephant', 'wolf', 'frog', 'birds', 'hoopoe', 'camel', 'cow', 'bee', 'horse'];
  var ALL = null; // every animal

  function L(pairs, peek, twins, pool) { return { pairs: pairs, peek: peek, twins: twins || 0, pool: pool }; }
  var list = [
    // ---- World 1: Desert Dusk (the youngest: few cards, a long look first) ----
    L(2, 3.0, 0, DESERT), L(2, 2.5, 0, DESERT), L(3, 2.6, 0, DESERT), L(3, 2.2, 0, DESERT), L(4, 2.4, 0, DESERT), L(4, 2.0, 0, DESERT),
    // ---- World 2: Oasis Garden ----
    L(4, 2.0, 0, GARDEN), L(5, 2.0, 0, GARDEN), L(5, 1.7, 0, GARDEN), L(6, 1.8, 0, GARDEN), L(6, 1.5, 0, GARDEN), L(6, 1.3, 1, GARDEN),
    // ---- World 3: Under the Sea ----
    L(6, 1.4, 0, SEA), L(6, 1.2, 1, SEA), L(8, 1.4, 0, SEA), L(8, 1.2, 1, SEA), L(8, 1.0, 1, SEA), L(8, 0.9, 2, SEA),
    // ---- World 4: Lantern Night ----
    L(8, 1.0, 1, ALL), L(8, 0.8, 2, ALL), L(10, 1.0, 1, ALL), L(10, 0.9, 2, ALL), L(10, 0.8, 2, ALL), L(10, 0.7, 3, ALL)
  ];
  window.MM_LEVELS = {
    list: list,
    PER: 6,
    worldOf: function (n) { return Math.min(3, Math.floor((n - 1) / 6)); },
    // Stars by extra flips: every mismatched pair is one miss. Generous, since nobody can know unseen cards.
    stars: function (pairs, misses) { return misses <= pairs ? 3 : misses <= Math.ceil(pairs * 2.2) ? 2 : 1; }
  };
})();
