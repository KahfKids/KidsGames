/* Star & Flower Tic Tac Toe: the rules and the computer opponent. Plain game code with no engine in it (so it can be
   tested in Node): the one part of the game that is not Phaser's to do. Kept exactly as the old page had it. You place
   golden stars, the opponent places flowers; three in a row wins. Opponent strength is a few chances per opponent
   (win: takes a win it sees, block: stops yours, smart: plays the perfect move, pref: likes the middle and corners);
   Professor Cog plays perfectly, so a draw against him counts as a win. The rules object is the interface the Board scene
   uses: sources (the dish) and targets (the empty squares), apply, pieces, result, ai. */
(function () {
  'use strict';
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  // ---------- rules ----------
  function lineWin(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { side: b[l[0]] - 1, line: l };
    }
    return null;
  }
  function empties(b) { var e = []; for (var i = 0; i < 9; i++) if (!b[i]) e.push(i); return e; }
  var rules = {
    newGame: function (o) { return { b: [0, 0, 0, 0, 0, 0, 0, 0, 0], turn: o.first || 0, placed: [] }; },
    n: function () { return 3; },
    turn: function (s) { return s.turn; },
    sources: function (s) { return rules.result(s) ? [] : [{ key: 'tray' }]; },
    targets: function (s) { return rules.result(s) ? [] : empties(s.b).map(function (i) { return { r: (i / 3) | 0, c: i % 3, move: { i: i } }; }); },
    forced: function () { return false; },
    apply: function (s, m) {
      s.b[m.i] = s.turn + 1;
      s.placed.push({ id: s.placed.length + 1, r: (m.i / 3) | 0, c: m.i % 3, side: s.turn, king: false });
      s.turn ^= 1;
      return { to: [(m.i / 3) | 0, m.i % 3], place: true };
    },
    pieces: function (s) { return s.placed.map(function (p) { return { id: p.id, r: p.r, c: p.c, side: p.side, king: false }; }); },
    result: function (s) {
      var w = lineWin(s.b);
      if (w) return { winner: w.side, line: w.line.map(function (i) { return [(i / 3) | 0, i % 3]; }) };
      if (!empties(s.b).length) return { winner: null };
      return null;
    },
    ai: function (s, level, opp) { return [{ i: choose(s.b, s.turn + 1, opp.ai) }]; },
    moveFrom: function () { return 'tray'; }
  };

  // ---------- AI ----------
  function findWin(b, v) {
    var e = empties(b);
    for (var i = 0; i < e.length; i++) { b[e[i]] = v; var w = lineWin(b); b[e[i]] = 0; if (w) return e[i]; }
    return -1;
  }
  function minimax(b, me, turn, depth) {
    var w = lineWin(b);
    if (w) return (w.side + 1 === me ? 10 : -10) - (w.side + 1 === me ? depth : -depth);
    var e = empties(b);
    if (!e.length) return 0;
    var best = turn === me ? -Infinity : Infinity;
    for (var i = 0; i < e.length; i++) {
      b[e[i]] = turn;
      var v = minimax(b, me, 3 - turn, depth + 1);
      b[e[i]] = 0;
      best = turn === me ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }
  function bestMove(b, me) {
    var e = empties(b), best = [], bv = -Infinity;
    e.forEach(function (i) {
      b[i] = me; var v = minimax(b, me, 3 - me, 1); b[i] = 0;
      if (v > bv) { bv = v; best = [i]; } else if (v === bv) best.push(i);
    });
    return best[(Math.random() * best.length) | 0];
  }
  function choose(b, me, o) {
    o = o || { win: 1, block: 1, smart: 1 };
    var them = 3 - me, e = empties(b), r = Math.random;
    var w = findWin(b, me); if (w >= 0 && r() < o.win) return w;
    var bl = findWin(b, them); if (bl >= 0 && r() < o.block) return bl;
    if (o.smart && r() < o.smart) return bestMove(b, me);
    if (o.pref && r() < o.pref) {
      var good = e.filter(function (i) { return i === 4 || i === 0 || i === 2 || i === 6 || i === 8; });
      if (good.length) return good[(r() * good.length) | 0];
    }
    return e[(r() * e.length) | 0];
  }

  window.BkRules = rules; window.BkChoose = choose;
  if (typeof module !== 'undefined') module.exports = rules;
})();
