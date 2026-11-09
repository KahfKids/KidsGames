/* Star & Flower Tic Tac Toe: rules, opponents and piece art, on the shared board kit (js/board).
   You place golden stars, the opponent places flowers; three in a row wins. Each new piece is drawn in with an
   animated stroke. Toy-robot opponents climb from little Beep to Professor Cog, who never loses (a draw counts as a win). */
(function () {
  'use strict';
  var A = window.BoardArt, TAU = Math.PI * 2;
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

  // ---------- pieces: a golden star and a pink flower ----------
  var PAL = [
    { fill: ['#fff3b0', '#f6c453', '#e58a1f'], line: '#6e3a06', inner: '#fff8de' },
    { fill: ['#ffd1dc', '#ff7a9c', '#d6336c'], line: '#6a1438', inner: '#ffe27a' }
  ];
  // Outlines as point lists (unit radius), traced by the draw-in animation.
  var SHAPES = [[], []];
  (function () {
    for (var i = 0; i <= 16; i++) {   // eight-point star
      var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? 0.56 : 1;
      var p0 = [Math.cos(a) * q, Math.sin(a) * q];
      if (i) { var prev = SHAPES[0][SHAPES[0].length - 1]; for (var k = 1; k <= 6; k++) SHAPES[0].push([prev[0] + (p0[0] - prev[0]) * k / 6, prev[1] + (p0[1] - prev[1]) * k / 6]); }
      else SHAPES[0].push(p0);
    }
    for (var j = 0; j <= 120; j++) {   // six-petal flower
      var t = j / 120 * TAU - Math.PI / 2, rr = 0.48 + 0.52 * Math.pow(Math.abs(Math.cos(3 * (t + Math.PI / 2))), 0.55);
      SHAPES[1].push([Math.cos(t) * rr, Math.sin(t) * rr]);
    }
  })();
  function shapePath(g, side, R) {
    g.beginPath(); SHAPES[side].forEach(function (p, i) { i ? g.lineTo(p[0] * R, p[1] * R) : g.moveTo(p[0] * R, p[1] * R); }); g.closePath();
  }
  function paintPiece(g, side, cell) {
    var P = PAL[side], R = cell * 0.36, lw = Math.max(2, cell * 0.05);
    g.save(); g.translate(R * 0.06, R * 0.1); g.fillStyle = 'rgba(30,10,0,.25)'; shapePath(g, side, R); g.fill(); g.restore();
    var gr = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.05);
    gr.addColorStop(0, P.fill[0]); gr.addColorStop(0.5, P.fill[1]); gr.addColorStop(1, P.fill[2]);
    g.fillStyle = gr; shapePath(g, side, R); g.fill();
    if (side === 0) {
      g.fillStyle = 'rgba(255,248,222,.75)'; A.star8(g, 0, 0, R * 0.5, 0.56); g.fill();
      g.fillStyle = P.fill[2]; A.star8(g, 0, 0, R * 0.2, 0.5, Math.PI / 8); g.fill();
    } else {
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, R * 0.05); g.lineCap = 'round';
      for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3 - Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); g.lineTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72); g.stroke(); }
      var cg = g.createRadialGradient(-R * 0.08, -R * 0.08, 0, 0, 0, R * 0.28); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(1, '#f0a81c');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R * 0.27, 0, TAU); g.fill();
      g.fillStyle = 'rgba(150,80,0,.5)';
      for (var d = 0; d < 7; d++) { var b2 = d * TAU / 7; g.beginPath(); g.arc(Math.cos(b2) * R * 0.15, Math.sin(b2) * R * 0.15, R * 0.035, 0, TAU); g.fill(); }
    }
    g.strokeStyle = P.line; g.lineWidth = lw; g.lineJoin = 'round'; shapePath(g, side, R); g.stroke();
    // gloss
    g.save(); shapePath(g, side, R); g.clip();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-R * 0.3, -R * 0.5, R * 0.45, R * 0.2, -0.5, 0, TAU); g.fill();
    g.restore();
  }
  var cache = {};
  function pieceSprite(side, king, cell, dpr) {
    var key = side + '|' + Math.round(cell) + '|' + dpr;
    if (cache[key]) return cache[key];
    var W = cell * 0.86, c = A.canvas(W * dpr, W * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(W / 2, W / 2); paintPiece(g, side, cell);
    c.w = W; c.h = W;
    return (cache[key] = c);
  }
  // Draw-in: a pen traces the outline, then the colour washes in.
  var sparkle = {};
  function drawPlacing(ctx, side, cell, p) {
    var R = cell * 0.36, pts = SHAPES[side], k = Math.min(1, p / 0.62), n = pts.length - 1, upto = k * n, last = Math.floor(upto);
    if (p > 0.5) { var sp = pieceSprite(side, false, cell, Math.min(2, window.devicePixelRatio || 1)); ctx.globalAlpha = Math.min(1, (p - 0.5) / 0.4); ctx.drawImage(sp, -sp.w / 2, -sp.h / 2, sp.w, sp.h); ctx.globalAlpha = 1; }
    ctx.strokeStyle = PAL[side].line; ctx.lineWidth = Math.max(2, cell * 0.06); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i <= last; i++) i ? ctx.lineTo(pts[i][0] * R, pts[i][1] * R) : ctx.moveTo(pts[i][0] * R, pts[i][1] * R);
    var f = upto - last, tip = pts[last];
    if (last < n) { var nx = pts[last + 1]; tip = [tip[0] + (nx[0] - tip[0]) * f, tip[1] + (nx[1] - tip[1]) * f]; ctx.lineTo(tip[0] * R, tip[1] * R); }
    ctx.stroke();
    if (k < 1) {   // sparkle at the pen tip (its gradient is made once, around (0, 0), and drawn shifted to the tip)
      var gl = sparkle[cell];
      if (!gl) { gl = sparkle[cell] = ctx.createRadialGradient(0, 0, 0, 0, 0, cell * 0.12); gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(1, 'rgba(255,240,180,0)'); }
      ctx.save(); ctx.translate(tip[0] * R, tip[1] * R);
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, cell * 0.12, 0, TAU); ctx.fill(); ctx.restore();
    }
  }

  window.TTTRules = rules; window.TTTChoose = choose;
  BoardKit.run({
    storeKey: 'kahf-tic-tac-toe', title: 'Tic Tac Toe', theme: 'dusk', boardStyle: 'grid', n: 3,
    tray: true, directTap: true, pieceShadow: false,
    hint: 'Tap a square to place your star',
    colors: [['#f6c453', '#fff3b0'], ['#ff7a9c', '#ffd1dc']],
    pieceSprite: pieceSprite, drawPlacing: drawPlacing, rules: rules,
    opponents: [
      { name: 'Beep', robot: 'beep', level: 'easy', ai: { win: 0.3, block: 0.1, smart: 0, pref: 0 } },
      { name: 'Bolt', robot: 'bolt', level: 'easy', ai: { win: 0.5, block: 0.2, smart: 0, pref: 0.3 } },
      { name: 'Tinker', robot: 'tinker', level: 'medium', ai: { win: 1, block: 0.66, smart: 0, pref: 0.5 } },
      { name: 'Sprocket', robot: 'sprocket', level: 'medium', ai: { win: 1, block: 0.7, smart: 0.25, pref: 0.5 } },
      { name: 'Professor Cog', robot: 'cog', level: 'hard', tag: 'draw = win', drawIsWin: true, ai: { win: 1, block: 1, smart: 1 } }
    ]
  });
})();
