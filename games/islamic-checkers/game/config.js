/* Courtyard Checkers: what is particular to this game (the shared Board and Hud scenes read it): the save key, the
   courtyard, the board, the discs, the words, and the six toy robots to play. Opponent levels and board sizes are the old
   page's: Beep and Bolt easy, Tinker and Sprocket medium, Gizmo and Professor Cog hard, small (6 x 6) then big (8 x 8). */
(function () {
  'use strict';
  var A = window.BkArt;
  window.BkCfg = {
    id: 'islamic-checkers', storeKey: 'kahf-checkers', title: 'Checkers', theme: 'garden', boardStyle: 'checkers', n: 6,
    hint: { touch: 'Tap a piece, then tap a glowing spot', keys: 'Arrow keys move  ·  Space picks a piece, then a spot' },
    how: { touch: 'Tap a piece, then tap a glowing spot  ·  or drag the piece', keys: 'Arrows move the cursor  ·  Space picks a piece, then a spot  ·  R restarts  ·  Esc pauses  ·  M sound' },
    forcedText: 'Jump!',
    colors: [[A.PAL[0].main, A.PAL[0].light], [A.PAL[1].main, A.PAL[1].light]],
    rules: window.BkRules,
    names: ['man0', 'man1', 'king0', 'king1'],
    frameOf: function (side, king) { return (king ? 'king' : 'man') + side; },
    fixedCell: 190,                                                      // the discs are painted once at this cell size (design units) and shown scaled
    dims: function (name, cell) { var pr = cell * 0.4, th = cell * (name.indexOf('king') === 0 ? 0.15 : 0.085); return [Math.ceil(pr * 2 + 6), Math.ceil(pr * 2 + th + 6)]; },
    paint: function (name, cell, z) { return A.pieceSprite(+name.slice(-1), name.indexOf('king') === 0, cell, z); },
    opponents: [
      { name: 'Beep', robot: 'beep', level: 'easy', n: 6, tag: 'small board' },
      { name: 'Bolt', robot: 'bolt', level: 'easy', n: 8, tag: 'big board' },
      { name: 'Tinker', robot: 'tinker', level: 'medium', n: 6, tag: 'small board' },
      { name: 'Sprocket', robot: 'sprocket', level: 'medium', n: 8, tag: 'big board' },
      { name: 'Gizmo', robot: 'gizmo', level: 'hard', n: 6, tag: 'small board' },
      { name: 'Professor Cog', robot: 'cog', level: 'hard', n: 8, tag: 'big board' }
    ]
  };
})();
