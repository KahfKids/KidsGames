/* Courtyard Checkers: the rules and the computer opponent. Plain game code with no engine in it (so it can be tested
   in Node): this is the one part of the game that is not Phaser's to do. Kept exactly as the old page had it.
   Rules (kid-friendly checkers): men move one step diagonally forward; kings move one step diagonally any way
   (no flying kings); captures are forced; a capture chain continues with the same piece; a man reaching the far
   row becomes a king and the turn ends; a player with no legal move loses; 40 king-only moves without a capture
   is a draw. Computer levels: easy = a random legal move; medium = a search two moves deep (30% random moves, with
   noise); hard = four moves deep (five on the small board). The rules object is the interface the Board scene uses:
   sources/targets (what can be picked, where it can go), apply, pieces, result, ai. */
(function () {
  'use strict';
  // ---------- rules ----------
  function newGame(o) {
    var n = o.n || 8, rows = n >= 8 ? 3 : 2;
    var s = { n: n, turn: o.first || 0, grid: [], P: [null], chain: 0, quiet: 0 };
    for (var i = 0; i < n * n; i++) s.grid.push(0);
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if ((r + c) % 2 !== 1) continue;
      var side = r < rows ? 1 : r >= n - rows ? 0 : -1;
      if (side < 0) continue;
      var id = s.P.length;
      s.P.push({ id: id, r: r, c: c, side: side, king: false });
      s.grid[r * n + c] = id;
    }
    return s;
  }
  function clone(s) {
    return { n: s.n, turn: s.turn, grid: s.grid.slice(), chain: s.chain, quiet: s.quiet,
      P: s.P.map(function (p) { return p && { id: p.id, r: p.r, c: p.c, side: p.side, king: p.king }; }) };
  }
  function stepsFrom(s, p, capOnly, out) {
    var n = s.n, dirs = p.king ? [-1, 1] : [p.side === 0 ? -1 : 1];
    for (var i = 0; i < dirs.length; i++) for (var dc = -1; dc <= 1; dc += 2) {
      var dr = dirs[i], r1 = p.r + dr, c1 = p.c + dc;
      if (r1 < 0 || c1 < 0 || r1 >= n || c1 >= n) continue;
      var q = s.grid[r1 * n + c1];
      if (!q) { if (!capOnly) out.push({ id: p.id, fr: p.r, fc: p.c, r: r1, c: c1, cap: 0 }); continue; }
      if (s.P[q].side === p.side) continue;
      var r2 = r1 + dr, c2 = c1 + dc;
      if (r2 < 0 || c2 < 0 || r2 >= n || c2 >= n || s.grid[r2 * n + c2]) continue;
      out.push({ id: p.id, fr: p.r, fc: p.c, r: r2, c: c2, cap: q, cr: r1, cc: c1 });
    }
  }
  function legal(s) {
    var out = [];
    if (s.chain) { stepsFrom(s, s.P[s.chain], true, out); return out; }
    var caps = [], simple = [];
    for (var i = 1; i < s.P.length; i++) {
      var p = s.P[i]; if (!p || p.side !== s.turn) continue;
      var tmp = []; stepsFrom(s, p, false, tmp);
      tmp.forEach(function (m) { (m.cap ? caps : simple).push(m); });
    }
    return caps.length ? caps : simple;
  }
  function applyStep(s, m) {
    var n = s.n, p = s.P[m.id];
    s.grid[p.r * n + p.c] = 0; p.r = m.r; p.c = m.c; s.grid[p.r * n + p.c] = p.id;
    var info = { from: [m.fr, m.fc], to: [m.r, m.c], capture: !!m.cap, king: false };
    if (m.cap) { var q = s.P[m.cap]; s.grid[q.r * n + q.c] = 0; s.P[m.cap] = null; s.quiet = 0; }
    else if (!p.king) s.quiet = 0; else s.quiet++;
    if (!p.king && ((p.side === 0 && p.r === 0) || (p.side === 1 && p.r === n - 1))) {
      p.king = true; info.king = true; s.quiet = 0; s.chain = 0; s.turn ^= 1; return info;   // crowning ends the turn
    }
    if (m.cap) { var more = []; stepsFrom(s, p, true, more); if (more.length) { s.chain = p.id; return info; } }
    s.chain = 0; s.turn ^= 1;
    return info;
  }
  var DRAW_QUIET = 40;
  function result(s) {
    if (!legal(s).length) return { winner: s.turn ^ 1 };
    if (s.quiet >= DRAW_QUIET) return { winner: null };
    return null;
  }

  // ---------- AI ----------
  function turnPaths(s) {
    var out = [];
    (function rec(st, steps) {
      legal(st).forEach(function (m) {
        var c = clone(st); applyStep(c, m);
        var st2 = steps.concat([m]);
        if (c.chain && c.turn === st.turn) rec(c, st2); else out.push({ steps: st2, s: c });
      });
    })(s, []);
    return out;
  }
  function evaluate(s, side) {
    var n = s.n, v = 0, mid = (n - 1) / 2;
    for (var i = 1; i < s.P.length; i++) {
      var p = s.P[i]; if (!p) continue;
      var adv = p.side === 0 ? n - 1 - p.r : p.r, w;
      if (p.king) w = 170 - Math.abs(p.c - mid) * 2 - Math.abs(p.r - mid) * 2;
      else w = 100 + adv * 5 + (adv === 0 ? 6 : 0) + (p.c === 0 || p.c === n - 1 ? 2 : 0);
      v += p.side === side ? w : -w;
    }
    return v;
  }
  function negamax(s, depth, alpha, beta) {
    if (s.quiet >= DRAW_QUIET) return 0;
    var paths = turnPaths(s);
    if (!paths.length) return -10000 - depth;
    if (depth === 0) return evaluate(s, s.turn);
    // captures first helps pruning
    paths.sort(function (a, b) { return b.steps.length - a.steps.length; });
    var best = -Infinity;
    for (var i = 0; i < paths.length; i++) {
      var v = -negamax(paths[i].s, depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  function ai(s, level) {
    var paths = turnPaths(s);
    if (!paths.length) return [];
    var pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
    if (level === 'easy') return pick(paths).steps;
    if (level === 'medium' && Math.random() < 0.3) return pick(paths).steps;
    var depth = level === 'hard' ? (s.n <= 6 ? 5 : 4) : 2, noise = level === 'hard' ? 4 : 30;
    var best = null, bestV = -Infinity;
    paths.forEach(function (pt) {
      var v = -negamax(pt.s, depth - 1, -Infinity, Infinity) + Math.random() * noise;
      if (v > bestV) { bestV = v; best = pt; }
    });
    return best.steps;
  }

  var rules = {
    newGame: newGame,
    n: function (s) { return s.n; },
    turn: function (s) { return s.turn; },
    sources: function (s) {
      var seen = {}, out = [];
      legal(s).forEach(function (m) { if (!seen[m.id]) { seen[m.id] = 1; out.push({ key: m.id, r: m.fr, c: m.fc }); } });
      return out;
    },
    targets: function (s, key) {
      return legal(s).filter(function (m) { return m.id === key; }).map(function (m) { return { r: m.r, c: m.c, move: m, cap: m.cap ? [m.cr, m.cc] : null }; });
    },
    forced: function (s) { return !s.chain && legal(s).some(function (m) { return m.cap; }); },
    apply: applyStep,
    pieces: function (s) { return s.P.filter(Boolean).map(function (p) { return { id: p.id, r: p.r, c: p.c, side: p.side, king: p.king }; }); },
    result: result,
    ai: ai,
    moveFrom: function (m) { return m.id; },
    // for tests
    legal: legal, turnPaths: turnPaths
  };
  window.BkRules = rules;
  if (typeof module !== 'undefined') module.exports = rules;
})();
