/* Kahf KidsGames board kit: board.js
   Shared engine for the board games (Checkers, Tic Tac Toe): full-screen courtyard scene, square board sized
   from the real screen, tap-a-piece-then-tap-a-target OR drag-and-drop, highlights, sliding/popping pieces,
   friendly AI opponents with thinking time, best-of-3 matches with 1-3 stars, a ladder of opponents that
   unlock, and 2-player pass-and-play. Built on the shared kit (js/kit). Exposes window.BoardKit.

   BoardKit.run(cfg)
     cfg.storeKey, cfg.title, cfg.theme ('garden'|'dusk'), cfg.boardStyle ('checkers'|'grid')
     cfg.opponents: [{ name, robot (art.js ROBOTS: beep|bolt|tinker|sprocket|gizmo|cog), level: 'easy'|'medium'|'hard', n, tag, drawIsWin }]
     cfg.tray: true when moves come from a pile beside the board (Tic Tac Toe)
     cfg.directTap: tapping a target with nothing selected plays it when only one piece can go there
     cfg.pieceSprite(side, king, cell, dpr) -> canvas (with .w/.h in CSS px), drawn centred on the cell
     cfg.drawPlacing(ctx, side, cell, p)  optional: draw-in animation (0..1) for newly placed pieces
     cfg.colors[side] = [main, light] for particles
     cfg.hint, cfg.forcedText
     Sounds: each game defines its own (Kit.sfx.define, in its js/sounds.js); robot sounds live in js/board/robot-sounds.js.
       Names played here: tap, pick, slide, hop, land, capture, crown, wiggle, trace, place, winLine, roundStart,
       roundWin, roundLose, roundDraw, matchWin, robotThink, robotBlip, robotHit, robotWin, robotLose (plus star from the kit).
     cfg.rules: {
       newGame({ n, first }) -> state
       n(s), turn(s) -> 0 (bottom / player one) | 1 (top / opponent)
       sources(s) -> [{ key, r, c }] (key 'tray' for the pile), targets(s, key) -> [{ r, c, move, cap: [r, c]? }]
       forced(s) -> true when a capture must be made (pulse the pieces that must capture)
       apply(s, move) -> { from: [r, c]?, to: [r, c], capture, king }
       pieces(s) -> fresh [{ id, r, c, side, king }]
       result(s) -> null | { winner: 0 | 1 | null (draw), line: [[r, c], ...]? }
       ai(s, level, opponent) -> [move, ...] (a whole turn), moveFrom(move) -> source key
     } */
(function () {
  'use strict';
  var K = window.Kit, A = window.BoardArt, TAU = Math.PI * 2;
  var BK = window.BoardKit = {};
  var DEBUG = /[?&]debug\b/.test(location.search);
  var FONT = 'Nunito, system-ui, sans-serif';
  var LEVEL_NAMES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }, LEVEL_DOTS = { easy: 1, medium: 2, hard: 3 };

  BK.run = function (cfg) {
    var R = cfg.rules, OPP = cfg.opponents, COUNT = OPP.length;
    K.icons.bkPlayers = K.icons.bkPlayers || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><circle cx="16.5" cy="9" r="2.7"/><path d="M2.5 19c.6-3.4 2.8-5.3 5.5-5.3s4.9 1.9 5.5 5.3M14 14.2c.8-.4 1.6-.6 2.5-.6 2.4 0 4.3 1.7 4.9 4.9"/></svg>';
    var store = K.store(cfg.storeKey), progress = K.progress(store, COUNT);
    var canvas = document.getElementById('stage');

    // ---------- state ----------
    var mode = 'ai', level = 1, opp = OPP[0], match = null, S = null;
    var disp = {}, pops = [], sel = null, drag = null, hover = null, aiSel = null, aiQueue = [];
    var phase = 'intro', prevPhase = 'play', time = 0, timers = [];
    var lastMove = null, winLine = null, winGlow = null, banner = null, forcedFlash = 0;
    var robotState = [{ m: 'idle', t: 0 }, { m: 'idle', t: 0 }], bump = [0, 0];   // robot states: idle | think | win | lose | hit
    var hinted = !!store.get('hinted', false), hintEl = null;
    var par = { x: 0, y: 0, tx: 0, ty: 0, live: 0 };
    var ambient = [];
    var L = { w: 0, h: 0, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
    var scene = null, boardArt = null, sprites = {};

    function isHuman(side) { return mode === '2p' || side === 0; }
    function after(sec, fn) { timers.push({ t: sec, fn: fn }); }
    function setRobot(side, m, dur) { robotState[side] = { m: m, t: dur || 1.4 }; }
    function curN() { return S ? R.n(S) : (opp.n || cfg.n || 8); }

    // ---------- layout (CSS px, from the real screen) ----------
    var stage = K.stage(canvas, function (st) { L.w = st.w; L.h = st.h; L.dpr = st.dpr; L.safe = st.safe; layout(); });
    var ctx = stage.ctx;
    function layout() {
      var sa = L.safe, left = sa.left + 10, right = L.w - sa.right - 10, top = sa.top + 10, bottom = L.h - sa.bottom - 10;
      var aw = right - left, ah = bottom - top, hudH = 54, Sz, r0;
      L.portrait = ah > aw * 1.15;
      if (L.portrait) {
        // the band below the board is taller: it keeps a lane for the first-match hint between board and badge
        var HINT = 64;
        Sz = Math.min(aw, ah - hudH - 2 * Math.max(84, ah * 0.11) - HINT, 940);
        var band = (ah - hudH - Sz - HINT) / 2;
        L.bx = left + (aw - Sz) / 2; L.by = top + hudH + band;
        r0 = K.clamp(band * 0.36, 24, 50);
        var off = Math.min(band * 0.5, r0 + 30);
        L.badge = [{ x: L.bx + r0 + 4, y: L.by + Sz + HINT + off }, { x: L.bx + r0 + 4, y: L.by - off }];
        L.hintTop = L.by + Sz + Math.round(Sz * 0.035) + 4;
        L.badge[0].y = Math.max(L.badge[0].y, L.hintTop + 54 + r0 * 1.2);   // keep the badge's glow ring clear of the hint lane
        L.trayR = r0 * 0.95;
        L.tray = [{ x: L.bx + Sz - L.trayR - 4, y: L.badge[0].y }, { x: L.bx + Sz - L.trayR - 4, y: L.badge[1].y }];
      } else {
        var side = K.clamp(aw * 0.17, 120, 260);
        Sz = Math.min(ah, aw - side * 2, 940);
        var reserve = (aw - Sz) / 2 < 150;
        if (reserve) Sz = Math.min(Sz, ah - hudH);
        L.bx = left + (aw - Sz) / 2;
        L.by = reserve ? top + hudH + (ah - hudH - Sz) / 2 : top + (ah - Sz) / 2;
        var mW = (aw - Sz) / 2;
        r0 = K.clamp(Math.min(mW * 0.28, ah * 0.11), 24, 56);
        var cl = left + mW / 2, cr = right - mW / 2;
        L.badge = [{ x: cr, y: L.by + Sz * 0.72 }, { x: cl, y: L.by + Sz * 0.28 }];
        L.trayR = r0 * 0.95;
        L.tray = [{ x: cr, y: L.by + Sz * 0.28 }, { x: cl, y: L.by + Sz * 0.72 }];
        L.mW = mW;
      }
      L.S = Math.floor(Sz); L.r = r0;
      L.frame = Math.round(L.S * (cfg.boardStyle === 'grid' ? 0.07 : 0.058));
      L.n = curN(); L.cell = (L.S - L.frame * 2) / L.n;
      L.fx0 = L.bx + L.frame; L.fy0 = L.by + L.frame;
      scene = null; boardArt = null; sprites = {};
      makeAmbient();
    }
    function cellXY(c, r) { return { x: L.fx0 + (c + 0.5) * L.cell, y: L.fy0 + (r + 0.5) * L.cell }; }
    function cellAt(x, y) {
      var c = Math.floor((x - L.fx0) / L.cell), r = Math.floor((y - L.fy0) / L.cell);
      return r >= 0 && c >= 0 && r < L.n && c < L.n ? { r: r, c: c } : null;
    }
    function pxToCell(p) { return { x: (p.x - L.fx0) / L.cell - 0.5, y: (p.y - L.fy0) / L.cell - 0.5 }; }

    // ---------- art caches ----------
    function ensureArt() {
      if (!scene) scene = A.paintScene(cfg.theme, L.w, L.h, L.dpr);
      if (!boardArt || boardArt.n !== L.n) { boardArt = A.board(cfg.boardStyle, L.n, L.S, L.dpr, cfg.theme); boardArt.n = L.n; sprites = {}; }
    }
    function sprite(side, king) {
      var k = side + '|' + (king ? 1 : 0);
      if (!sprites[k]) sprites[k] = cfg.pieceSprite(side, !!king, L.cell, L.dpr);
      return sprites[k];
    }
    function makeAmbient() {
      ambient = [];
      for (var i = 0; i < 26; i++) ambient.push({ x: Math.random() * L.w, y: Math.random() * L.h, ph: Math.random() * 6.28, v: 0.5 + Math.random(), s: 0.6 + Math.random() * 0.9 });
    }

    // ---------- HUD ----------
    var pRound = K.ui.pill('');
    K.ui.spacer();
    K.ui.iconButton('levels', 'Opponents', function () { if (phase !== 'paused') openLadder(); });
    K.ui.iconButton('pause', 'Pause', function () { if (phase !== 'paused' && phase !== 'over') pause(); });
    function hud() {
      var dots = '';
      for (var i = 1; i <= 3; i++) dots += '<span style="display:inline-block;width:9px;height:9px;border-radius:5px;margin-left:3px;background:' +
        (i < match.round ? '#f6c453' : i === match.round ? '#fffaf0' : 'rgba(255,255,255,.25)') + '"></span>';
      pRound.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="#f6c453"/></svg>Round ' + match.round + dots);
    }

    // ---------- match flow ----------
    function startMatch(lv) {
      if (lv === '2p') { mode = '2p'; opp = OPP[Math.min(COUNT, progress.current()) - 1]; }
      else { mode = 'ai'; level = K.clamp(lv, 1, COUNT); opp = OPP[level - 1]; progress.setCurrent(level); }
      match = { round: 1, wins: [0, 0], draws: 0, lost: 0 };
      K.fx.clear(); timers = [];
      startRound();
      if (!hinted && mode === 'ai' && !hintEl) {
        // portrait: in its own lane between the board and the player's badge; landscape: over the board's top frame
        var hb = L.portrait ? L.h - L.hintTop - 46 : L.h - L.by - 66;
        hintEl = K.ui.hint(cfg.hint, Math.round(hb - L.safe.bottom), true);
      }
    }
    function startRound() {
      var first = (match.round - 1) % 2;   // the first mover alternates each round
      S = R.newGame({ n: opp.n || cfg.n, first: first });
      if (R.n(S) !== L.n) layout();
      disp = {}; pops = []; sel = null; drag = null; hover = null; aiSel = null; aiQueue = [];
      lastMove = null; winLine = null; winGlow = null; timers = [];
      R.pieces(S).forEach(function (p) {
        var d = newDisp(p);
        d.enter = -(0.05 + (p.side ? p.r : L.n - 1 - p.r) * 0.07 + p.c * 0.025);
        disp[p.id] = d;
      });
      phase = 'intro'; hud();
      showBanner('Round ' + match.round, mode === 'ai' ? (match.round === 1 ? 'vs ' + opp.name : first ? opp.name + ' goes first' : 'You go first')
        : (first ? 'Player 2 goes first' : 'Player 1 goes first'), 1.5);
      K.sfx.play('roundStart');
      after(1.1, beginTurn);
    }
    function newDisp(p) { return { id: p.id, side: p.side, king: p.king, x: p.c, y: p.r, slide: null, sq: 0, lift: 0, crownT: 1, placeT: 1, enter: 1, wig: 0 }; }

    function beginTurn() {
      var res = R.result(S);
      if (res) { roundEnd(res); return; }
      var turn = R.turn(S);
      if (!isHuman(turn)) {
        if (aiQueue.length) { phase = 'ai'; after(0.2, aiNext); }
        else scheduleAI();
        return;
      }
      aiQueue = [];
      phase = 'play';
      var srcs = R.sources(S);
      sel = srcs.length === 1 ? srcs[0].key : null;
      if (cfg.tray) sel = 'tray';
    }

    function scheduleAI() {
      phase = 'ai'; setRobot(1, 'think', 99); K.sfx.play('robotThink');
      var delay = 0.55 + Math.random() * 0.5 + (opp.level === 'hard' ? 0.3 : 0);
      after(delay, function () {
        aiQueue = (R.ai(S, opp.level, opp) || []).slice();
        setRobot(1, 'idle', 0.1);
        aiNext();
      });
    }
    function aiNext() {
      var m = aiQueue.shift();
      if (!m) { roundEnd({ winner: 0 }); return; }   // no move found: the opponent can't move, so it loses
      aiSel = R.moveFrom(m);
      K.sfx.play('robotBlip');
      after(0.34, function () { aiSel = null; doMove(m); });
    }

    function doMove(move, opts) {
      opts = opts || {};
      var mover = R.turn(S), before = {};
      R.pieces(S).forEach(function (p) { before[p.id] = p; });
      var info = R.apply(S, move) || {};
      var seen = {}, dur = 0.12, landing = null;
      R.pieces(S).forEach(function (p) {
        seen[p.id] = 1;
        var d = disp[p.id], b = before[p.id];
        if (!d) {
          d = disp[p.id] = newDisp(p);
          if (opts.dropPx) { var fc = pxToCell(opts.dropPx); d.slide = { sx: fc.x, sy: fc.y, tx: p.c, ty: p.r, t: 0, dur: 0.14, hop: 0 }; d.x = fc.x; d.y = fc.y; dur = Math.max(dur, 0.16); }
          else if (cfg.drawPlacing) { d.placeT = 0; dur = Math.max(dur, 0.6); }
          else d.enter = 0;
          landing = d;
          return;
        }
        if (b && (b.r !== p.r || b.c !== p.c)) {
          var from = opts.dropPx ? pxToCell(opts.dropPx) : { x: d.x, y: d.y };
          var dist = Math.hypot(p.c - from.x, p.r - from.y), dd = opts.dropPx ? 0.14 : 0.24 + dist * 0.08;
          d.slide = { sx: from.x, sy: from.y, tx: p.c, ty: p.r, t: 0, dur: dd, hop: info.capture && !opts.dropPx ? 1 : 0 };
          d.x = from.x; d.y = from.y;
          dur = Math.max(dur, dd); landing = d;
        }
        if (b && !b.king && p.king) { d.crownAt = dur; }
        d.side = p.side;
      });
      Object.keys(disp).forEach(function (id) {
        if (seen[id]) return;
        var d = disp[id];
        pops.push({ x: d.x, y: d.y, side: d.side, king: d.king, t: -dur * 0.55 });
        delete disp[id];
      });
      // crowning happens when the piece lands
      Object.keys(disp).forEach(function (id) {
        var d = disp[id];
        if (d.crownAt != null) { var at = d.crownAt; d.crownAt = null; after(at, function () { crown(d); }); dur = Math.max(dur, at + 0.5); }
      });
      lastMove = { from: info.from, to: info.to };
      sel = null; hover = null; phase = 'anim';
      // sound: a new piece is traced in (tap) or set down (drop); a moving piece slides or hops
      if (info.place) K.sfx.play(opts.dropPx ? 'place' : 'trace');
      else K.sfx.play(info.capture ? 'hop' : 'slide', { short: !!opts.dropPx });
      if (isHuman(mover)) { if (mode === 'ai' && !hinted) { hinted = true; store.set('hinted', true); } if (hintEl) { hintEl.hide(); hintEl = null; } }
      if (info.capture && mode === 'ai') { setRobot(1, mover === 0 ? 'hit' : 'win', mover === 0 ? 0.5 : 1.2); if (mover === 0) after(dur * 0.6, function () { K.sfx.play('robotHit'); }); }
      after(dur + 0.06, beginTurn);
      return info;
    }
    function crown(d) {
      d.king = true; d.crownT = 0;
      var p = cellXY(d.x, d.y);
      K.sfx.play('crown'); K.buzz(20);
      K.fx.burst(p.x, p.y, { n: 18, colors: ['#ffd36b', '#fff4c4', '#ffffff'], speed: L.cell * 4, size: L.cell * 0.18, life: 0.9, shape: 'star', gravity: L.cell * 3 });
      K.fx.text(p.x, p.y - L.cell * 0.5, 'King!', { size: Math.max(22, L.cell * 0.45), color: '#fff2b0', stroke: 'rgba(60,30,0,.6)' });
    }

    function roundEnd(res) {
      phase = 'roundEnd'; sel = null; drag = null; aiQueue = []; aiSel = null;
      var w = res.winner, title, sub = '';
      if (w === null || w === undefined) {
        w = null;
        if (mode === 'ai' && opp.drawIsWin) { match.wins[0]++; title = 'A draw counts!'; sub = opp.name + ' is a master!'; }
        else { match.draws++; title = 'Draw!'; sub = 'Nobody wins this one'; }
        K.sfx.play('roundDraw'); setRobot(1, 'idle', 1);
      } else {
        match.wins[w]++;
        if (mode === 'ai' && w === 1) match.lost++;
        if (mode === '2p') title = 'Player ' + (w + 1) + ' wins!';
        else title = w === 0 ? 'You win!' : opp.name + ' wins';
        if (mode === 'ai') sub = w === 0 ? 'Round ' + match.round : 'Good try!';
        if (mode === 'ai' && w === 1) { K.sfx.play('roundLose'); after(0.25, function () { K.sfx.play('robotWin'); }); setRobot(1, 'win', 2.4); robotSparkle(); }
        else { K.sfx.play('roundWin'); confetti(); if (mode === 'ai') { setRobot(1, 'lose', 2.4); after(0.5, function () { K.sfx.play('robotLose'); }); } }
        bump[w] = 1;
      }
      if (res.line) { winLine = { cells: res.line, t: 0 }; K.sfx.play('winLine'); }
      else if (w !== null) winGlow = { side: w, t: 0 };
      showBanner(title, sub, 2.1);
      hud();
      var done = match.wins[0] >= 2 || match.wins[1] >= 2 || match.round >= 3;
      after(2.5, function () {
        if (done) matchEnd();
        else { match.round++; startRound(); }
      });
    }

    function matchEnd() {
      phase = 'over';
      var w0 = match.wins[0], w1 = match.wins[1];
      if (mode === '2p') {
        if (w0 !== w1) K.sfx.play('matchWin');
        K.ui.sheet({ title: w0 === w1 ? "It's a tie!" : 'Player ' + (w0 > w1 ? 1 : 2) + ' wins the match!',
          text: 'Rounds ' + w0 + ' : ' + w1, buttons: [
            { label: 'Play Again', icon: 'restart', primary: true, onClick: function () { startMatch('2p'); } },
            { label: 'Opponents', icon: 'levels', onClick: openLadder }] });
        K.bridge.complete();
        return;
      }
      if (w0 > w1) {
        var stars = K.clamp(3 - match.lost - (match.draws > 0 ? 1 : 0), 1, 3);
        var wasLocked = level < COUNT && !progress.unlocked(level + 1);
        progress.finish(level, stars);
        K.bridge.complete();
        confetti(); setRobot(1, 'lose', 3); K.sfx.play('matchWin');
        var last = level === COUNT, next = OPP[level];
        var buttons = [];
        if (!last) buttons.push({ label: 'Play ' + next.name, icon: 'next', primary: true, onClick: function () { startMatch(level + 1); } });
        buttons.push({ label: 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startMatch(level); } });
        buttons.push({ label: 'Opponents', icon: 'levels', row: true, onClick: openLadder });
        K.ui.sheet({ title: last ? 'Champion!' : 'You beat ' + opp.name + '!',
          text: last ? 'You beat every friend. MashaAllah!' : wasLocked ? next.name + ' wants to play!' : 'Rounds ' + w0 + ' : ' + w1,
          stars: stars, buttons: buttons, content: last ? null : avatarRow(next.robot) });
      } else {
        setRobot(1, 'win', 3); robotSparkle(); K.sfx.play('robotWin');
        K.ui.sheet({ title: w0 === w1 ? 'So close!' : opp.name + ' won the match', text: "Let's play again!", buttons: [
          { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startMatch(level); } },
          { label: 'Opponents', icon: 'levels', onClick: openLadder }] });
      }
    }
    function avatarRow(kind) {
      var wrap = document.createElement('div'); wrap.className = 'bk-next';
      wrap.appendChild(avatarCanvas(kind, 64, 'idle'));
      return wrap;
    }
    function avatarCanvas(kind, size, state) {
      var c = document.createElement('canvas'), d = Math.min(2, window.devicePixelRatio || 1);
      c.width = c.height = Math.round(size * d); c.style.width = c.style.height = size + 'px';
      var g = c.getContext('2d'); g.scale(d, d); g.translate(size / 2, size / 2);
      A.robot(g, kind, size / 2 - 3, { state: state || 'idle', t: 0.4 });
      return c;
    }

    function pause() {
      prevPhase = phase; phase = 'paused';
      K.ui.sheet({ title: 'Paused', text: mode === 'ai' ? 'vs ' + opp.name + ' · Round ' + match.round : '2 Players · Round ' + match.round, buttons: [
        { label: 'Resume', icon: 'play', primary: true, onClick: resume },
        { label: 'Restart', icon: 'restart', row: true, onClick: function () { startMatch(mode === '2p' ? '2p' : level); } },
        { label: 'Opponents', icon: 'levels', row: true, onClick: function () { phase = prevPhase; openLadder(); } },
        { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); phase = prevPhase; pause(); } }] });
    }
    function resume() { phase = prevPhase; }

    function openLadder() {
      if (phase !== 'paused') prevPhase = phase;
      phase = 'paused';
      var wrap = document.createElement('div'); wrap.className = 'bk-ladder';
      var sh;
      OPP.forEach(function (o, i) {
        var n = i + 1, open = progress.unlocked(n), st = progress.stars(n);
        var b = document.createElement('button');
        b.className = 'bk-opp' + (mode === 'ai' && n === level ? ' cur' : '') + (open ? '' : ' locked');
        b.setAttribute('aria-label', o.name + (open ? '' : ' (locked)'));
        b.appendChild(avatarCanvas(o.robot, 54, open ? 'idle' : 'lose'));
        var info = document.createElement('div'); info.className = 'bk-info';
        var dots = ''; for (var k = 0; k < 3; k++) dots += '<i class="' + (k < LEVEL_DOTS[o.level] ? 'on' : '') + '"></i>';
        info.innerHTML = '<b>' + o.name + '</b><span class="bk-lvl lv-' + o.level + '">' + dots + LEVEL_NAMES[o.level] + (o.tag ? ' · ' + o.tag : '') + '</span>';
        b.appendChild(info);
        var right = document.createElement('div'); right.className = 'bk-st';
        if (open) { var s = ''; for (var q = 0; q < 3; q++) s += K.starSvg(q < st ? '#f6c453' : 'rgba(255,255,255,.18)'); right.innerHTML = s; }
        else right.innerHTML = K.icons.lock;
        b.appendChild(right);
        if (!open) b.disabled = true;
        else b.onclick = function () { K.sfx.play('tap'); sh.close(); startMatch(n); };
        wrap.appendChild(b);
      });
      sh = K.ui.sheet({ title: 'Pick a friend', content: wrap, closeable: true,
        onClose: function () { if (prevPhase === 'over') startMatch(mode === '2p' ? '2p' : level); else phase = prevPhase; },
        buttons: [{ label: '2 Players', icon: 'bkPlayers',
          onClick: function () { startMatch('2p'); } }] });
      sh.el.classList.add('bk-ladder-sheet');
    }

    // ---------- input: tap a piece then a target, or drag the piece onto a target ----------
    function targetsOf(key) { return R.targets(S, key) || []; }
    function targetAt(key, cell) {
      var ts = targetsOf(key);
      for (var i = 0; i < ts.length; i++) if (ts[i].r === cell.r && ts[i].c === cell.c) return ts[i];
      return null;
    }
    function sourceAt(x, y, srcs) {
      for (var i = 0; i < srcs.length; i++) {
        var s = srcs[i];
        if (s.key === 'tray') { var t = L.tray[R.turn(S)]; if (Math.hypot(x - t.x, y - t.y) < L.trayR * 1.25) return s; }
        else { var c = cellAt(x, y); if (c && c.r === s.r && c.c === s.c) return s; }
      }
      return null;
    }
    function pieceAtCell(cell) {
      for (var id in disp) { var d = disp[id]; if (Math.round(d.x) === cell.c && Math.round(d.y) === cell.r) return d; }
      return null;
    }
    function dragCenter(dg) { return { x: dg.x, y: dg.y - (dg.touch ? L.cell * 0.3 : 0) }; }

    function onDown(p, e) {
      par.tx = (p.x / L.w - 0.5) * 2; par.ty = (p.y / L.h - 0.5) * 2; par.live = 2;
      if (phase !== 'play' || !S) {
        if (phase === 'ai' && cellAt(p.x, p.y)) { var pc0 = pieceAtCell(cellAt(p.x, p.y)); if (pc0) { pc0.wig = 1; K.sfx.play('wiggle'); } }
        return;
      }
      var turn = R.turn(S); if (!isHuman(turn)) return;
      var srcs = R.sources(S), cell = cellAt(p.x, p.y);
      if (sel && cell) { var t = targetAt(sel, cell); if (t) { doMove(t.move); return; } }
      var hit = sourceAt(p.x, p.y, srcs);
      if (hit) {
        var was = sel; sel = hit.key;
        drag = { key: hit.key, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, was: was, touch: !e || e.pointerType !== 'mouse' };
        K.sfx.play('pick'); K.buzz(6);
        return;
      }
      if (cfg.directTap && cell) {
        var found = null, cnt = 0;
        srcs.forEach(function (s) { targetsOf(s.key).forEach(function (t2) { if (t2.r === cell.r && t2.c === cell.c) { found = t2; cnt++; } }); });
        if (cnt === 1) { doMove(found.move); return; }
      }
      if (cell) {
        var pc = pieceAtCell(cell);
        if (pc) {
          pc.wig = 1; K.sfx.play('wiggle');
          if (pc.side === turn && R.forced && R.forced(S)) {
            forcedFlash = 1.6;
            var c2 = cellXY(pc.x, pc.y);
            K.fx.text(c2.x, c2.y - L.cell * 0.4, cfg.forcedText || 'Jump!', { size: Math.max(20, L.cell * 0.4), color: '#ffe08a', stroke: 'rgba(60,20,0,.65)', life: 1.1 });
          }
          return;
        }
      }
      if (cell || !cfg.tray) sel = srcs.length === 1 ? srcs[0].key : (cfg.tray ? 'tray' : null);
    }
    function onMove(p) {
      par.tx = (p.x / L.w - 0.5) * 2; par.ty = (p.y / L.h - 0.5) * 2; par.live = 2;
      if (!drag) return;
      drag.x = p.x; drag.y = p.y;
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 9) drag.moved = true;
      if (drag.moved) { var c = dragCenter(drag); hover = cellAt(c.x, c.y); if (hover && !targetAt(drag.key, hover)) hover = cellAt(p.x, p.y); }
    }
    function onUp(p) {
      if (!drag) return;
      var dg = drag; drag = null; hover = null;
      if (phase !== 'play') return;
      if (dg.moved) {
        var c = dragCenter(dg), cell = cellAt(c.x, c.y), t = cell && targetAt(dg.key, cell);
        if (!t) { cell = cellAt(p.x, p.y); t = cell && targetAt(dg.key, cell); }
        if (t) { doMove(t.move, { dropPx: c }); return; }
        if (dg.key !== 'tray' && disp[dg.key]) {   // not a legal spot: glide home, stay selected
          var d = disp[dg.key], fc = pxToCell(c);
          d.slide = { sx: fc.x, sy: fc.y, tx: d.x, ty: d.y, t: 0, dur: 0.22, hop: 0 };
          d.x = fc.x; d.y = fc.y;
        }
        K.sfx.play('wiggle');
      } else if (dg.was === dg.key && R.sources(S).length > 1) sel = null;   // tap the chosen piece again to put it down
    }
    K.pointer(canvas, function (x, y) { return { x: x, y: y }; }, { down: onDown, move: onMove, up: onUp,
      hover: function (p) { par.tx = (p.x / L.w - 0.5) * 2; par.ty = (p.y / L.h - 0.5) * 2; par.live = 2; } });
    addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'p') && phase !== 'paused' && phase !== 'over') pause(); });

    // ---------- effects ----------
    function confetti() {
      for (var i = 0; i < 5; i++) after(i * 0.14, function () {
        K.fx.burst(L.bx + L.S * (0.15 + Math.random() * 0.7), L.by + L.S * (0.15 + Math.random() * 0.5),
          { n: 20, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', '#9ef0a8'], speed: L.S * 0.9, size: Math.max(8, L.cell * 0.16), life: 1.2, shape: 'star', gravity: L.S * 1.1 });
      });
    }
    function robotSparkle() {
      var b = L.badge[1];
      K.fx.burst(b.x, b.y, { n: 16, colors: ['#ffd36b', '#fff4c4', '#ffffff'], speed: L.r * 5, size: Math.max(8, L.r * 0.22), life: 0.8, shape: 'star', gravity: L.r * 3 });
    }
    function showBanner(text, sub, dur) { banner = { text: text, sub: sub, t: 0, dur: dur || 1.6 }; }

    // ---------- simulation ----------
    function step(dt) {
      if (phase === 'paused') return;
      time += dt;
      K.fx.update(dt);
      if (par.live > 0) par.live -= dt; else { par.tx = Math.sin(time * 0.25) * 0.35; par.ty = Math.cos(time * 0.19) * 0.2; }
      par.x += (par.tx - par.x) * (1 - Math.exp(-dt * 2.5)); par.y += (par.ty - par.y) * (1 - Math.exp(-dt * 2.5));
      ambient.forEach(function (a) { a.ph += dt * a.v; a.y -= dt * 8 * a.v; a.x += Math.sin(a.ph) * dt * 10; if (a.y < -10) { a.y = L.h + 10; a.x = Math.random() * L.w; } });
      for (var s = 0; s < 2; s++) {
        if (robotState[s].t > 0) { robotState[s].t -= dt; if (robotState[s].t <= 0) robotState[s].m = 'idle'; }
        bump[s] = Math.max(0, bump[s] - dt * 1.5);
      }
      forcedFlash = Math.max(0, forcedFlash - dt);
      if (banner) { banner.t += dt; if (banner.t > banner.dur) banner = null; }
      if (winLine) winLine.t += dt;
      if (winGlow) winGlow.t += dt;
      // timers (game time, so ?debug can fast-forward)
      var due = [];
      for (var i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { due.push(timers[i]); timers.splice(i, 1); } }
      due.reverse().forEach(function (tm) { tm.fn(); });
      // pieces
      for (var id in disp) {
        var d = disp[id];
        if (d.enter < 1) d.enter = Math.min(1, d.enter + dt * 2.6);
        if (d.slide) {
          var sl = d.slide; sl.t += dt;
          var k = Math.min(1, sl.t / sl.dur), e = K.ease.inOutSine(k);
          d.x = sl.sx + (sl.tx - sl.sx) * e; d.y = sl.sy + (sl.ty - sl.sy) * e; d.hopY = sl.hop ? Math.sin(Math.PI * k) * 0.45 : 0;
          if (k >= 1) {
            d.slide = null; d.hopY = 0; d.sq = 1;
            var lp = cellXY(d.x, d.y);
            K.sfx.play('land', { side: d.side, hop: !!sl.hop }); K.buzz(8);
            K.fx.burst(lp.x, lp.y + L.cell * 0.25, { n: 6, colors: ['rgba(255,240,210,.9)'], speed: L.cell * 1.6, size: L.cell * 0.08, life: 0.35, gravity: 0, shape: 'dot' });
          }
        }
        d.sq = Math.max(0, d.sq - dt * 4);
        d.wig = Math.max(0, d.wig - dt * 2.5);
        if (d.crownT < 1) d.crownT = Math.min(1, d.crownT + dt * 2.2);
        if (d.placeT < 1) { var was = d.placeT; d.placeT = Math.min(1, d.placeT + dt / 0.55); if (was < 0.7 && d.placeT >= 0.7) { var pp = cellXY(d.x, d.y); d.sq = 1; K.sfx.play('place'); K.fx.burst(pp.x, pp.y, { n: 10, colors: cfg.colors[d.side].concat(['#ffffff']), speed: L.cell * 2.4, size: L.cell * 0.12, life: 0.6, shape: 'star', gravity: L.cell * 2 }); } }
        var lifted = (sel === d.id && phase === 'play') || aiSel === d.id || (drag && drag.moved && drag.key === d.id);
        d.lift += ((lifted ? 1 : 0) - d.lift) * (1 - Math.exp(-dt * 14));
      }
      for (var j = pops.length - 1; j >= 0; j--) {
        var q = pops[j], was2 = q.t; q.t += dt;
        if (was2 < 0 && q.t >= 0) {
          var c = cellXY(q.x, q.y), col = cfg.colors[q.side];
          K.sfx.play('capture'); K.buzz(14); K.fx.shake(3, 0.15);
          K.fx.burst(c.x, c.y, { n: 18, colors: [col[0], col[1], '#ffffff'], speed: L.cell * 4.5, size: L.cell * 0.2, life: 0.75, gravity: L.cell * 6 });
          K.fx.burst(c.x, c.y, { n: 6, color: '#fff3c4', speed: L.cell * 2, size: L.cell * 0.22, life: 0.6, shape: 'star', gravity: -L.cell });
        }
        if (q.t > 0.32) pops.splice(j, 1);
      }
    }

    // ---------- drawing ----------
    function drawPiece(d, x, y, extraScale) {
      var sp = sprite(d.side, d.king), e = d.enter < 0 ? 0 : d.enter;
      if (e <= 0) return;
      var es = K.ease.outBack(Math.min(1, e)), breath = 1 + Math.sin(time * 2.2 + d.id * 1.7) * 0.012;
      var sc = es * breath * (1 + d.lift * 0.1) * (extraScale || 1), sq = d.sq * Math.sin(d.sq * 3.1);
      var hop = (d.hopY || 0) * L.cell, lift = d.lift * L.cell * 0.1 + hop;
      var wig = d.wig > 0 ? Math.sin(d.wig * 26) * d.wig * L.cell * 0.06 : 0;
      y -= (1 - Math.min(1, e)) * L.cell * 0.5;
      // shadow on the board
      if (cfg.pieceShadow !== false) ctx.fillStyle = 'rgba(10,5,0,' + (0.32 - Math.min(0.15, lift / L.cell * 0.3)) + ')';
      if (cfg.pieceShadow !== false) { ctx.beginPath(); ctx.ellipse(x + L.cell * 0.04 + lift * 0.3, y + L.cell * 0.1 + lift * 0.4, L.cell * 0.38 * sc, L.cell * 0.3 * sc, 0, 0, TAU); ctx.fill(); }
      ctx.save();
      ctx.translate(x + wig, y - lift);
      ctx.scale(sc * (1 + sq * 0.14), sc * (1 - sq * 0.14));
      if (d.placeT < 1 && cfg.drawPlacing) cfg.drawPlacing(ctx, d.side, L.cell, d.placeT);
      else ctx.drawImage(sp, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      if (d.king && d.crownT < 1) {   // crowning flash
        ctx.globalAlpha = 1 - d.crownT; ctx.fillStyle = '#fff6cf';
        ctx.beginPath(); ctx.arc(0, 0, L.cell * 0.42 * (1 + d.crownT * 0.6), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    function cellRect(r, c, inset, rad) {
      A.rr(ctx, L.fx0 + c * L.cell + inset, L.fy0 + r * L.cell + inset, L.cell - inset * 2, L.cell - inset * 2, rad);
    }
    function ring(x, y, rad, color, width, alpha) {
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }

    function drawBackground() {
      var d = L.dpr, m = scene.margin;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(scene.sky, -m - par.x * 4 * d, -par.y * 2 * d);
      ctx.drawImage(scene.far, -m - par.x * 9 * d, -par.y * 3 * d);
      ctx.drawImage(scene.mid, -m - par.x * 16 * d, 0);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      var ox = -par.x * 16, night = A.THEMES[cfg.theme].night;
      scene.lanterns.forEach(function (ln, i) {
        var x = ln.x + ox, sw = Math.sin(time * 1.3 + i) * 0.05, ls = A.lanternSprite(28 * ln.s, d, cfg.theme);
        if (x < -60 || x > L.w + 60) return;
        ctx.save(); ctx.translate(x, ln.top); ctx.rotate(sw);
        ctx.strokeStyle = 'rgba(40,20,10,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, ln.y - ln.top); ctx.stroke();
        var gy = ln.y - ln.top + ls.h * 0.5, fl = 0.75 + Math.sin(time * 7 + i * 2) * 0.08 + Math.sin(time * 13 + i) * 0.05;
        var gr = ctx.createRadialGradient(0, gy, 0, 0, gy, ls.w * 2.6);
        gr.addColorStop(0, 'rgba(255,200,110,' + (night ? 0.55 : 0.35) * fl + ')'); gr.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, gy, ls.w * 2.6, 0, TAU); ctx.fill();
        ctx.drawImage(ls, -ls.w / 2, ln.y - ln.top, ls.w, ls.h);
        ctx.restore();
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(scene.near, -m - par.x * 26 * d, 0);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      var T = A.THEMES[cfg.theme];
      ambient.forEach(function (a, i) {
        var al = night ? 0.25 + 0.55 * Math.max(0, Math.sin(a.ph * 1.7 + i)) : 0.35;
        ctx.globalAlpha = al;
        if (night) {
          var g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 6 * a.s); g.addColorStop(0, 'rgba(230,255,160,.9)'); g.addColorStop(1, 'rgba(230,255,160,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, 6 * a.s, 0, TAU); ctx.fill();
        } else { ctx.fillStyle = T.mote; ctx.beginPath(); ctx.arc(a.x, a.y, 1.5 * a.s, 0, TAU); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
    }

    function drawBoard() {
      var ba = boardArt, sh = K.fx.offset();
      ctx.save(); ctx.translate(sh.x, sh.y);
      ctx.drawImage(ba.canvas, L.bx - ba.pad, L.by - ba.pad, L.S + ba.pad * 2, L.S + ba.depth + ba.pad * 2);
      var turn = S ? R.turn(S) : 0, human = S && isHuman(turn) && phase === 'play';
      // last move trail
      if (lastMove && lastMove.to) {
        ctx.fillStyle = 'rgba(255,226,140,.22)';
        if (lastMove.from) { cellRect(lastMove.from[0], lastMove.from[1], L.cell * 0.04, L.cell * 0.12); ctx.fill(); }
        cellRect(lastMove.to[0], lastMove.to[1], L.cell * 0.04, L.cell * 0.12); ctx.fill();
      }
      var pulse = 0.5 + 0.5 * Math.sin(time * 5);
      if (human) {
        var srcs = R.sources(S), forced = R.forced && R.forced(S);
        if (forced) srcs.forEach(function (s) {
          if (s.key === 'tray' || s.key === sel) return;
          var p = cellXY(s.c, s.r);
          ring(p.x, p.y, L.cell * (0.45 + pulse * 0.04), '#ffd36b', L.cell * 0.07, 0.35 + pulse * 0.45 + Math.min(1, forcedFlash) * 0.3);
        });
        if (sel) {
          if (sel !== 'tray' && disp[sel]) {
            var sp = cellXY(disp[sel].x, disp[sel].y);
            var gg = ctx.createRadialGradient(sp.x, sp.y, L.cell * 0.2, sp.x, sp.y, L.cell * 0.62);
            gg.addColorStop(0, 'rgba(255,230,140,.55)'); gg.addColorStop(1, 'rgba(255,230,140,0)');
            ctx.fillStyle = gg; ctx.fillRect(sp.x - L.cell * 0.62, sp.y - L.cell * 0.62, L.cell * 1.24, L.cell * 1.24);
          }
          targetsOf(sel).forEach(function (t, i) {
            var p = cellXY(t.c, t.r), on = hover && hover.r === t.r && hover.c === t.c;
            var col = t.cap ? '255,150,70' : '255,226,120';
            var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, L.cell * 0.5);
            gr.addColorStop(0, 'rgba(' + col + ',' + (on ? 0.75 : 0.35 + pulse * 0.15) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
            ctx.fillStyle = gr; ctx.fillRect(p.x - L.cell / 2, p.y - L.cell / 2, L.cell, L.cell);
            if (!cfg.tray || on) {
              var br = 0.3 + 0.03 * Math.sin(time * 5 + i);
              ctx.fillStyle = 'rgba(255,248,225,' + (on ? 0.5 : 0.28) + ')';
              ctx.beginPath(); ctx.arc(p.x, p.y, L.cell * br, 0, TAU); ctx.fill();
              ring(p.x, p.y, L.cell * br, '#fff8e1', L.cell * 0.05, 0.95);
              ctx.fillStyle = 'rgb(' + col + ')';
              ctx.beginPath(); ctx.arc(p.x, p.y, L.cell * (on ? 0.15 : 0.1 + 0.02 * Math.sin(time * 5 + i)), 0, TAU); ctx.fill();
            }
            if (t.cap) { var cp = cellXY(t.cap[1], t.cap[0]); ring(cp.x, cp.y, L.cell * 0.44, '#ff6a4d', L.cell * 0.05, 0.4 + pulse * 0.5); }
          });
        }
      }
      if (aiSel && aiSel !== 'tray' && disp[aiSel]) { var ap = cellXY(disp[aiSel].x, disp[aiSel].y); ring(ap.x, ap.y, L.cell * 0.46, '#ffffff', L.cell * 0.05, 0.85); }
      // winner's pieces glow
      if (winGlow) for (var gid in disp) if (disp[gid].side === winGlow.side) {
        var wp = cellXY(disp[gid].x, disp[gid].y), wg = ctx.createRadialGradient(wp.x, wp.y, L.cell * 0.2, wp.x, wp.y, L.cell * 0.7);
        wg.addColorStop(0, 'rgba(255,220,120,' + (0.5 + 0.3 * Math.sin(winGlow.t * 6)) + ')'); wg.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = wg; ctx.fillRect(wp.x - L.cell * 0.7, wp.y - L.cell * 0.7, L.cell * 1.4, L.cell * 1.4);
      }
      // pieces: resting first, moving/lifted on top
      var list = Object.keys(disp).map(function (k) { return disp[k]; });
      list.sort(function (a, b) { return (a.lift + (a.slide ? 2 : 0)) - (b.lift + (b.slide ? 2 : 0)) || a.y - b.y; });
      list.forEach(function (d) {
        if (drag && drag.moved && drag.key === d.id) return;
        var p = cellXY(d.x, d.y); drawPiece(d, p.x, p.y);
      });
      // popping captured pieces
      pops.forEach(function (q) {
        if (q.t < 0) { var p0 = cellXY(q.x, q.y); drawPiece({ id: 0, side: q.side, king: q.king, enter: 1, lift: 0, sq: 0, wig: 0, placeT: 1, crownT: 1 }, p0.x, p0.y); return; }
        var k = q.t / 0.32, p = cellXY(q.x, q.y), spr = sprite(q.side, q.king);
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.scale(1 + k * 0.7, 1 + k * 0.7);
        ctx.drawImage(spr, -spr.w / 2, -spr.h / 2, spr.w, spr.h); ctx.restore();
      });
      // win line
      if (winLine) {
        var cs = winLine.cells, a = cellXY(cs[0][1], cs[0][0]), b = cellXY(cs[cs.length - 1][1], cs[cs.length - 1][0]);
        var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ext = L.cell * 0.38;
        var x0 = a.x - dx / len * ext, y0 = a.y - dy / len * ext, x1 = b.x + dx / len * ext, y1 = b.y + dy / len * ext;
        var g = K.ease.outCubic(Math.min(1, winLine.t / 0.45)), ex = x0 + (x1 - x0) * g, ey = y0 + (y1 - y0) * g, pl = 0.8 + 0.2 * Math.sin(winLine.t * 6);
        ctx.lineCap = 'round';
        [[0.42, 0.16], [0.26, 0.3], [0.14, 0.7], [0.05, 1]].forEach(function (w) {
          ctx.strokeStyle = w[1] === 1 ? '#ffffff' : 'rgba(255,214,107,' + w[1] * pl + ')'; ctx.lineWidth = L.cell * w[0];
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
        });
      }
      ctx.restore();
    }

    function drawDragged() {
      if (!drag || !drag.moved) return;
      var c = dragCenter(drag), d = drag.key === 'tray' ? { id: 0, side: R.turn(S), king: false, enter: 1, lift: 1, sq: 0, wig: 0, placeT: 1, crownT: 1 } : disp[drag.key];
      if (!d) return;
      var keep = d.lift; d.lift = 1; drawPiece(d, c.x, c.y, 1.06); d.lift = keep;
    }

    function drawBadges() {
      var turn = S ? R.turn(S) : 0, active = phase === 'play' || phase === 'ai' || phase === 'anim';
      for (var s = 1; s >= 0; s--) {
        var b = L.badge[s], r = L.r, on = active && turn === s;
        var bob = (on ? Math.sin(time * 4) * 2 : 0) - bump[s] * Math.abs(Math.sin(bump[s] * 9)) * 8;
        ctx.save(); ctx.translate(b.x, b.y + bob);
        if (on) {
          var gl = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.6);
          gl.addColorStop(0, 'rgba(255,214,107,.55)'); gl.addColorStop(1, 'rgba(255,214,107,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TAU); ctx.fill();
          ctx.save(); ctx.rotate(time * 0.8); ctx.setLineDash([r * 0.22, r * 0.16]); ring(0, 0, r * 1.18, '#ffd36b', Math.max(2, r * 0.08), 0.95); ctx.restore();
        }
        if (mode === 'ai' && s === 1) A.robot(ctx, opp.robot, r, { state: robotState[1].m, t: time });
        else {
          var bgc = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
          bgc.addColorStop(0, 'rgba(255,255,255,.3)'); bgc.addColorStop(1, 'rgba(20,12,40,.6)');
          ctx.fillStyle = bgc; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
          ring(0, 0, r, cfg.colors[s][0], r * 0.09, 1);
          var sp = sprite(s, false), k = (r * 1.45) / Math.max(sp.w, L.cell * 0.9);
          ctx.drawImage(sp, -sp.w * k / 2, -sp.h * k / 2, sp.w * k, sp.h * k);
        }
        // thinking bubble
        if (mode === 'ai' && s === 1 && phase === 'ai' && robotState[1].m === 'think') {
          ctx.save(); ctx.translate(r * 0.95, -r * 0.95);
          ctx.fillStyle = 'rgba(255,255,255,.95)'; A.rr(ctx, -r * 0.1, -r * 0.42, r * 1.2, r * 0.62, r * 0.31); ctx.fill();
          ctx.beginPath(); ctx.arc(-r * 0.12, r * 0.28, r * 0.09, 0, TAU); ctx.fill();
          for (var q = 0; q < 3; q++) { var up = Math.max(0, Math.sin(time * 6 - q * 0.8)); ctx.fillStyle = '#5b3f8c'; ctx.beginPath(); ctx.arc(r * (0.17 + q * 0.32), -r * 0.11 - up * r * 0.1, r * 0.09, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
        ctx.restore();
        // name and round stars
        var name = mode === '2p' ? 'Player ' + (s + 1) : s === 1 ? opp.name : 'You';
        var fs = K.clamp(r * 0.42, 13, 21), tx, ty, align;
        if (L.portrait) { tx = b.x + r * 1.45; ty = b.y - fs * 0.45; align = 'left'; }
        else { tx = b.x; ty = b.y + r * 1.25 + fs * 0.5; align = 'center'; }
        ctx.font = '900 ' + fs + 'px ' + FONT; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = fs * 0.28; ctx.strokeStyle = 'rgba(15,8,35,.7)'; ctx.strokeText(name, tx, ty);
        ctx.fillStyle = on ? '#fff3c4' : '#fffaf0'; ctx.fillText(name, tx, ty);
        var pr = fs * 0.55, py = ty + fs * 1.15;
        for (var k2 = 0; k2 < 2; k2++) {
          var px = align === 'left' ? tx + pr + k2 * pr * 2.6 : tx + (k2 - 0.5) * pr * 2.6;
          A.pip(ctx, px, py, pr, match && match.wins[s] > k2);
        }
      }
    }

    function drawTrays() {
      if (!cfg.tray || !S) return;
      var turn = R.turn(S);
      for (var s = 0; s < 2; s++) {
        var t = L.tray[s], r = L.trayR, on = phase === 'play' && turn === s && isHuman(s);
        ctx.save(); ctx.translate(t.x, t.y);
        // glazed dish
        ctx.fillStyle = 'rgba(10,5,20,.35)'; ctx.beginPath(); ctx.ellipse(r * 0.06, r * 0.18, r * 1.02, r * 0.96, 0, 0, TAU); ctx.fill();
        var dg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
        dg.addColorStop(0, '#fffaf0'); dg.addColorStop(0.75, '#e9dcc0'); dg.addColorStop(1, '#b89a6a');
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ring(0, 0, r * 0.8, cfg.colors[s][0], r * 0.06, 0.6);
        if (on) ring(0, 0, r * (1.08 + 0.05 * Math.sin(time * 5)), '#ffd36b', r * 0.1, 0.9);
        var dragging = drag && drag.moved && drag.key === 'tray' && turn === s;
        var sp = sprite(s, false), k = r * 1.55 / sp.w, by = on ? Math.sin(time * 4) * r * 0.06 : 0;
        ctx.globalAlpha = dragging ? 0.45 : (phase === 'play' && turn !== s) || !S ? 0.75 : 1;
        ctx.drawImage(sp, -sp.w * k / 2, -sp.h * k / 2 + by, sp.w * k, sp.h * k);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    function drawBanner() {
      if (!banner) return;
      var t = banner.t, k = Math.min(1, t / 0.35), out = Math.max(0, (t - banner.dur + 0.35) / 0.35);
      var sc = K.ease.outBack(k) * (1 - out * 0.15), cx = L.bx + L.S / 2, cy = L.by + L.S / 2;
      var w = Math.min(L.S * 0.92, Math.max(L.S * 0.7, 360)), h = Math.max(70, L.S * 0.22);
      ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(cx, cy); ctx.scale(sc, sc);
      // ribbon
      ctx.fillStyle = 'rgba(20,10,50,.82)';
      ctx.beginPath(); ctx.moveTo(-w / 2 - h * 0.25, -h / 2); ctx.lineTo(w / 2 + h * 0.25, -h / 2); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 + h * 0.25, h / 2);
      ctx.lineTo(-w / 2 - h * 0.25, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,107,.85)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#f6c453'; A.star8(ctx, -w / 2 + h * 0.12, 0, h * 0.13); ctx.fill(); A.star8(ctx, w / 2 - h * 0.12, 0, h * 0.13); ctx.fill();
      var fs = Math.min(h * 0.42, w / Math.max(6, banner.text.length) * 1.6);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '900 ' + fs + 'px ' + FONT; ctx.fillStyle = '#fffaf0';
      ctx.fillText(banner.text, 0, banner.sub ? -h * 0.1 : 0);
      if (banner.sub) { ctx.font = '800 ' + Math.max(13, fs * 0.42) + 'px ' + FONT; ctx.fillStyle = '#ffd98a'; ctx.fillText(banner.sub, 0, h * 0.27); }
      ctx.restore();
    }

    function draw() {
      if (!L.w) return;
      ensureArt();
      drawBackground();
      ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
      drawBoard();
      drawTrays();
      drawDragged();
      K.fx.draw(ctx);
      drawBadges();
      drawBanner();
    }

    K.loop({ step: step, draw: draw, hz: 60, onHidden: function () { if (!DEBUG && phase !== 'paused' && phase !== 'over') pause(); } });

    // ---------- ?debug test hook ----------
    if (DEBUG) window.BG = {
      run: function (sec) { for (var i = 0; i < Math.round(sec * 60); i++) step(1 / 60); draw(); },
      start: startMatch, rules: R,
      state: function () { return S; },
      get: function () { return { phase: phase, mode: mode, level: level, round: match && match.round, wins: match && match.wins.slice(), turn: S && R.turn(S), sel: sel, result: S && R.result(S), timers: timers.length }; },
      play: function (move) { return phase === 'play' ? doMove(move) : null; },
      cell: function (r, c) { return cellXY(c, r); }, L: L, progress: progress,
      tap: function (x, y) { onDown({ x: x, y: y }, { pointerType: 'touch' }); onUp({ x: x, y: y }); },
      openLadder: openLadder, pause: pause
    };

    var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
      startMatch(progress.current());
    });
  };
})();
