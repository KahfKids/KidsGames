/* 2048 Garden: levels.js
   Twelve kid-sized goals in three gardens. Small 3x3 boards first (reach 8, 16, 32, 64), then 4x4 boards
   (64, 128, 256). Some levels give a head start tile or put a garden stone on the board.
   par = moves for the third star (a careful player gets there; a 4-year-old still finishes with 1-2 stars).
   Tuned with a bot that plays the real engine (see the test notes in the report). */
(function () {
  'use strict';
  var L = window.G48_LEVELS = {};

  L.WORLDS = [
    { name: 'Morning Garden', color: '#7fe0b8', from: 1, to: 4 },
    { name: 'Fountain Court', color: '#6cc8ff', from: 5, to: 8 },
    { name: 'Sunset Palace', color: '#ffb27a', from: 9, to: 12 }
  ];

  L.list = [
    { size: 3, goal: 8,   par: 8,   undos: 3 },
    { size: 3, goal: 16,  par: 14,  undos: 3 },
    { size: 3, goal: 32,  par: 24,  undos: 3 },
    { size: 3, goal: 64,  par: 40,  undos: 5, start: [{ value: 16 }] },

    { size: 4, goal: 64,  par: 48,  undos: 5 },
    { size: 4, goal: 64,  par: 54,  undos: 5, stones: [{ x: 3, y: 3 }] },
    { size: 4, goal: 128, par: 88,  undos: 5, start: [{ value: 32 }] },
    { size: 4, goal: 128, par: 92,  undos: 5 },

    { size: 4, goal: 128, par: 100, undos: 5, stones: [{ x: 0, y: 3 }] },
    { size: 4, goal: 256, par: 130, undos: 5, start: [{ value: 64 }, { value: 32 }] },
    { size: 4, goal: 256, par: 170, undos: 6, start: [{ value: 64 }] },
    { size: 4, goal: 256, par: 190, undos: 6 }
  ];

  L.worldOf = function (n) { return n <= 4 ? 0 : n <= 8 ? 1 : 2; };

  // 3 stars: no undo and within par. 2 stars: no undo, or within par. 1 star: goal reached.
  L.stars = function (n, moves, usedUndo) {
    var par = L.list[n - 1].par, quick = moves <= par;
    return !usedUndo && quick ? 3 : (!usedUndo || quick) ? 2 : 1;
  };
})();
