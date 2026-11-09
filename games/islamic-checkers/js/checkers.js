/* Courtyard Checkers: rules, opponents and piece art, on the shared board kit (js/board).
   Rules (kid-friendly checkers): men move one step diagonally forward; kings move one step diagonally any way
   (no flying kings); captures are forced; a capture chain continues with the same piece; a man reaching the far
   row becomes a king and the turn ends; a player with no legal move loses; 40 king-only moves without a capture
   is a draw. */
(function () {
  'use strict';
  var A = window.BoardArt, TAU = Math.PI * 2;

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

  // ---------- piece art: glazed discs, a star for you and a rosette for the opponent ----------
  var PAL = [
    { main: '#f6c453', light: '#fff1b8', dark: '#a8620f', rim: '#7a4208', motif: '#fff8e0' },
    { main: '#e2504f', light: '#ffb3a3', dark: '#8a1f2a', rim: '#5e1018', motif: '#ffd36b' }
  ];
  function crownPath(g, w) {
    g.beginPath();
    g.moveTo(-w, w * 0.45); g.lineTo(-w, -w * 0.15); g.lineTo(-w * 0.5, w * 0.12); g.lineTo(0, -w * 0.55);
    g.lineTo(w * 0.5, w * 0.12); g.lineTo(w, -w * 0.15); g.lineTo(w, w * 0.45); g.closePath();
  }
  function pieceSprite(side, king, cell, dpr) {
    var P = PAL[side], pr = cell * 0.4, th = cell * (king ? 0.15 : 0.085), W = pr * 2 + 6, H = pr * 2 + th + 6;
    var c = A.canvas(W * dpr, H * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(W / 2, 3 + pr);
    // side wall (thickness), with a seam when stacked as a king
    var sw = g.createLinearGradient(-pr, 0, pr, 0);
    sw.addColorStop(0, P.rim); sw.addColorStop(0.4, P.dark); sw.addColorStop(1, P.rim);
    g.fillStyle = sw; g.beginPath(); g.arc(0, th, pr, 0, Math.PI); g.lineTo(-pr, 0); g.arc(0, 0, pr, Math.PI, 0, true); g.closePath(); g.fill();
    g.fillRect(-pr, 0, pr * 2, th);
    if (king) { g.strokeStyle = 'rgba(255,240,200,.45)'; g.lineWidth = Math.max(1, cell * 0.015); g.beginPath(); g.arc(0, th * 0.5, pr, 0.15, Math.PI - 0.15); g.stroke(); }
    // top face
    var tg = g.createRadialGradient(-pr * 0.35, -pr * 0.4, pr * 0.1, 0, 0, pr * 1.05);
    tg.addColorStop(0, P.light); tg.addColorStop(0.55, P.main); tg.addColorStop(1, P.dark);
    g.fillStyle = tg; g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.fill();
    // carved groove ring
    g.lineWidth = Math.max(1, pr * 0.07);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(0, pr * 0.02, pr * 0.76, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(0, -pr * 0.02, pr * 0.76, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // motif
    if (!king) {
      g.fillStyle = P.motif;
      if (side === 0) { A.star8(g, 0, 0, pr * 0.5, 0.6); g.fill(); g.fillStyle = P.main; A.star8(g, 0, 0, pr * 0.2, 0.6); g.fill(); }
      else {
        for (var k = 0; k < 8; k++) { g.save(); g.rotate(k * Math.PI / 4); g.beginPath(); g.ellipse(0, -pr * 0.3, pr * 0.11, pr * 0.22, 0, 0, TAU); g.fill(); g.restore(); }
        g.fillStyle = P.light; g.beginPath(); g.arc(0, 0, pr * 0.13, 0, TAU); g.fill();
      }
    } else {
      // golden crown
      var cw = pr * 0.46;
      g.save(); g.translate(0, pr * 0.04);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.save(); g.translate(pr * 0.04, pr * 0.06); crownPath(g, cw); g.fill(); g.restore();
      var cg = g.createLinearGradient(0, -cw, 0, cw); cg.addColorStop(0, '#fff3b0'); cg.addColorStop(0.5, '#f2c14e'); cg.addColorStop(1, '#b77a16');
      g.fillStyle = cg; crownPath(g, cw); g.fill();
      g.strokeStyle = '#7a4a08'; g.lineWidth = Math.max(1, cw * 0.1); g.lineJoin = 'round'; g.stroke();
      g.fillStyle = side === 0 ? '#e2504f' : '#2fb3c4';
      [[-cw, -cw * 0.2], [0, -cw * 0.6], [cw, -cw * 0.2]].forEach(function (q) { g.beginPath(); g.arc(q[0], q[1], cw * 0.16, 0, TAU); g.fill(); });
      g.restore();
    }
    // gloss
    g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-pr * 0.35, -pr * 0.45, pr * 0.32, pr * 0.15, -0.6, 0, TAU); g.fill();
    c.w = W; c.h = H;
    return c;
  }

  // ---------- the game ----------
  window.CheckersRules = rules;
  BoardKit.run({
    storeKey: 'kahf-checkers', title: 'Checkers', theme: 'garden', boardStyle: 'checkers', n: 6,
    hint: 'Tap a piece, then tap a glowing spot', forcedText: 'Jump!',
    colors: [[PAL[0].main, PAL[0].light], [PAL[1].main, PAL[1].light]],
    pieceSprite: pieceSprite, rules: rules,
    opponents: [
      { name: 'Beep', robot: 'beep', level: 'easy', n: 6, tag: 'small board' },
      { name: 'Bolt', robot: 'bolt', level: 'easy', n: 8, tag: 'big board' },
      { name: 'Tinker', robot: 'tinker', level: 'medium', n: 6, tag: 'small board' },
      { name: 'Sprocket', robot: 'sprocket', level: 'medium', n: 8, tag: 'big board' },
      { name: 'Gizmo', robot: 'gizmo', level: 'hard', n: 6, tag: 'small board' },
      { name: 'Professor Cog', robot: 'cog', level: 'hard', n: 8, tag: 'big board' }
    ]
  });
})();
