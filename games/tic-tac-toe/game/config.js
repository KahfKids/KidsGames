/* Star & Flower Tic Tac Toe: what is particular to this game (the shared Board and Hud scenes read it): the save key,
   the courtyard, the board, the star and the flower, the words, and the five toy robots to play. Opponent strength is the old
   page's: Beep and Bolt easy, Tinker and Sprocket medium, Professor Cog perfect (a draw against him counts as a win). */
(function () {
  'use strict';
  window.BkCfg = {
    id: 'tic-tac-toe', storeKey: 'kahf-tic-tac-toe', title: 'Tic Tac Toe', theme: 'dusk', boardStyle: 'grid', n: 3,
    tray: true, hint: { touch: 'Tap a square to place your star', keys: 'Arrow keys move  ·  Space places your star' },
    how: { touch: 'Tap a square  ·  or drag your star onto it', keys: 'Arrows move the cursor  ·  Space places your star  ·  R restarts  ·  Esc pauses  ·  M sound' },
    forcedText: 'Jump!',
    colors: [['#f6c453', '#fff3b0'], ['#ff7a9c', '#ffd1dc']],
    rules: window.BkRules,
    names: ['s0', 's1', 'o0', 'o1', 'dish0', 'dish1'],
    frameOf: function (side) { return 's' + side; },
    fixedCell: 340,                                                      // the pieces are painted once at this cell size (design units) and shown scaled
    dims: function (name, cell) { var w = name.indexOf('dish') === 0 ? Math.ceil(78 * 2.6) : Math.ceil(cell * 0.86); return [w, w]; },
    paint: function (name, cell, z) { return BkArt.pieceSprite(name, cell, z); },
    opponents: [
      { name: 'Beep', robot: 'beep', level: 'easy', ai: { win: 0.3, block: 0.1, smart: 0, pref: 0 } },
      { name: 'Bolt', robot: 'bolt', level: 'easy', ai: { win: 0.5, block: 0.2, smart: 0, pref: 0.3 } },
      { name: 'Tinker', robot: 'tinker', level: 'medium', ai: { win: 1, block: 0.66, smart: 0, pref: 0.5 } },
      { name: 'Sprocket', robot: 'sprocket', level: 'medium', ai: { win: 1, block: 0.7, smart: 0.25, pref: 0.5 } },
      { name: 'Professor Cog', robot: 'cog', level: 'hard', tag: 'draw = win', drawIsWin: true, ai: { win: 1, block: 1, smart: 1 } }
    ]
  };
})();
