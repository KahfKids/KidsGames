/* Shape Patterns: game.js
   A little steam train brings a pattern of shapes. Tap the piece that comes next and it flies into the empty
   wagon (or drag it there: it stays under the finger). 30 levels in 3 worlds; stars come from first-try answers.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var A = window.PatternArt, LV = window.PATTERN_LEVELS, K = window.Kit;
  var COUNT = LV.list.length, DEBUG = /[?&]debug\b/.test(location.search);
  var store = K.store('kahf-shape-patterns'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');
  var key = LV.key, TRAY_K = 0.7;

  // ---------- state ----------
  var level = 1, world = 0, rounds = [], ri = 0, round = null, phase = 'idle';
  var slotsTotal = 0, slotsMissed = 0, blankMisses = 0;
  var train = null, choices = [], fly = null, drag = null, press = null;
  var scroll = 0, scrollV = 0, time = 0, bannerT = 0, lastPrompt = '';
  var tasks = [], puffs = [], ambient = [], puffT = 0;
  var hinted = !!store.get('hinted', false), hint = null, tutorial = false;
  var loopApi = null;

  function later(s, fn) { tasks.push({ t: s, fn: fn }); }

  // ---------- layout (CSS px; laid out from the real screen size) ----------
  var L = { w: 0, h: 0, dpr: 1, top: 60, railY: 400, horizon: 300, P5: 80, Cv: 96, trayY: 700, trayTop: 640 };
  var bg = null, bgKey = '', sprites = {};
  var stage = K.stage(canvas, function (st) {
    L.w = st.w; L.h = st.h; L.dpr = st.dpr; L.safe = st.safe;
    L.top = st.safe.top + 62;
    var bot = st.h - st.safe.bottom, avail = bot - L.top;
    L.Cv = K.clamp(Math.min(112, avail * 0.24), 60, 112);
    L.trayY = bot - Math.max(12, Math.min(28, avail * 0.03)) - L.Cv * 0.55;
    L.trayTop = L.trayY - L.Cv / 2 - 10;
    var area = L.trayTop - L.top;
    L.P5 = Math.max(30, Math.min((st.w - 24) / 6.4, (area - 14) / 1.45, 150));
    L.railY = K.clamp(L.top + area * (st.h > st.w * 1.2 ? 0.8 : 0.74), L.top + 1.38 * L.P5, L.trayTop - 0.22 * L.P5);
    L.horizon = L.railY - Math.max(L.P5 * 1.1, (L.railY - L.top) * 0.35);
    sprites = {}; bg = null;
    if (train) fitTrain();
    makeAmbient();
  });
  var ctx = stage.ctx;
  function pitchFor(n) { return Math.max(26, Math.min(L.P5, (L.w - 24) / (n + 1.4))); }
  function choiceSize(k) { return Math.min(L.Cv, (L.w - 32 - (k - 1) * 14) / k); }

  // ---------- HUD ----------
  var pLevel = K.ui.pill(''), pRounds = K.ui.pill('');
  K.ui.spacer();
  K.ui.iconButton('pause', 'Pause', function () { if (phase !== 'done') pause(); });
  function hud() {
    pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' +
      A.WORLDS[world].color + '"/></svg>Level ' + level);
    var dots = '';
    for (var i = 0; i < rounds.length; i++) {
      var done = i < ri || (i === ri && (phase === 'lightup' || phase === 'depart' || phase === 'done'));
      dots += '<svg viewBox="0 0 20 20" style="width:14px;height:14px"><circle cx="10" cy="10" r="' + (done ? 7 : 6) + '" fill="' + (done ? '#f6c453' : 'none') +
        '" stroke="' + (done ? '#7a4a12' : i === ri ? '#fffaf0' : 'rgba(255,250,240,.45)') + '" stroke-width="' + (i === ri && !done ? 2.6 : 2) + '"/></svg>';
    }
    pRounds.set(dots);
  }

  // ---------- voice (only a voice that lives on the device, so nothing goes online) ----------
  // English prompts use the best installed English voice; praise is spoken in Arabic (Kit.say). Off in ?debug.
  function say(text) { if (!DEBUG) K.say.text(text, 'en'); }
  function praise(key) { if (!DEBUG) K.say.praise(key); }
  function promptText() {
    if (!round) return '';
    if (round.prompt === 'missing') return "What's missing?";
    return round.blanks.length > 1 ? 'What comes next? And next?' : 'What comes next?';
  }

  // ---------- levels and rounds ----------
  function startLevel(n) {
    level = K.clamp(n, 1, COUNT); world = LV.worldOf(level);
    progress.setCurrent(level);
    rounds = LV.makeLevel(level);
    ri = 0; slotsTotal = 0; slotsMissed = 0; lastPrompt = '';
    rounds.forEach(function (r) { slotsTotal += r.blanks.length; });
    tasks = []; fly = null; drag = null; press = null; choices = []; train = null;
    K.fx.clear(); puffs = [];
    bannerT = 2.0;
    tutorial = level === 1 && !hinted;
    if (!hinted && !hint) {
      hint = K.ui.hint('Tap what comes next', Math.round(L.h - L.trayTop + 6), true);
      // short landscape screens: no room between the rail and the tray, so the hint floats at the top
      if (L.trayTop - L.railY < 70) { hint.style.bottom = 'auto'; hint.style.top = 'calc(12px + var(--kit-st))'; }
    }
    startRound();
  }

  function startRound() {
    round = rounds[ri];
    var n = round.cells.length;
    train = { n: n, dx: 0, cells: round.cells.map(function (p, i) {
      return { p: p, blank: p === null, filled: false, missed: false, land: 0, hop: 0, flash: 0, bob: 0, alt: i % 2 };
    }) };
    fitTrain();
    train.dx = -(L.w / 2 + train.width / 2 + 40);
    train.from = train.dx; train.t = 0;
    blankMisses = 0;
    phase = 'arrive';
    choices = [];
    K.sfx.play('arrive', { dur: 1.25 });
    hud();
  }

  function fitTrain() {
    train.P = pitchFor(train.n);
    train.G = A.trainGeom(train.P);
    train.width = train.n * train.P + train.P * 0.05 + train.G.engineW;
  }
  function trainX0() { return (L.w - train.width) / 2 + train.dx; }
  function cellX(i) { return trainX0() + i * train.P + train.P / 2; }
  function engineX() { return trainX0() + train.n * train.P + train.P * 0.05; }
  function pieceY(i) { var c = train.cells[i]; return L.railY + train.G.pieceY - Math.sin(Math.min(1, c.hop) * Math.PI) * train.P * 0.28 * (c.hop > 0 ? 1 : 0) + c.bob; }

  function currentBlank() {
    if (!round || !train) return -1;
    for (var i = 0; i < round.blanks.length; i++) if (!train.cells[round.blanks[i]].filled) return round.blanks[i];
    return -1;
  }

  // ---------- choices ----------
  function setChoices(b) {
    var list = round.choices[b];
    choices = list.map(function (p, i) { return { p: p, k: key(p), i: i, pop: 0, state: 'idle', press: 0, wob: 0, glow: 0, blank: b }; });
    choices.forEach(function (c, i) { c.pop = -i * 0.09; });
    blankMisses = 0;
  }
  function choiceXY(i) {
    var k = choices.length, C = choiceSize(k), gap = Math.max(14, C * 0.22);
    return { x: L.w / 2 + (i - (k - 1) / 2) * (C + gap), y: L.trayY, C: C };
  }
  function choiceAt(x, y) {
    for (var i = 0; i < choices.length; i++) {
      if (choices[i].leaving) continue;
      var q = choiceXY(i);
      if (Math.hypot(x - q.x, y - q.y) <= q.C / 2 + 8) return i;
    }
    return -1;
  }
  function slotAt(x, y, radius) {
    if (!train) return -1;
    var best = -1, bd = radius;
    for (var i = 0; i < train.n; i++) {
      var c = train.cells[i]; if (!c.blank || c.filled) continue;
      var d = Math.hypot(x - cellX(i), y - pieceY(i));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // ---------- input ----------
  K.pointer(canvas, function (sx, sy) { return { x: sx, y: sy }; }, {
    down: function (p) {
      if (phase !== 'pick' || fly || drag) return;
      var i = choiceAt(p.x, p.y);
      if (i >= 0) {
        var c = choices[i];
        if (c.pop < 0.5) return;
        if (c.state === 'used') { K.sfx.play('tick'); c.wob = 1; return; }
        if (c.state !== 'idle') return;
        press = { i: i, x: p.x, y: p.y }; c.press = 1; K.sfx.play('pick');
        return;
      }
      if (slotAt(p.x, p.y, train.P * 0.6) >= 0) { say(promptText()); K.sfx.play('tick'); var b = currentBlank(); if (b >= 0) train.cells[b].land = 0.6; }
    },
    move: function (p) {
      if (drag) { drag.x = p.x + drag.ox; drag.y = p.y + drag.oy; return; }
      if (press && Math.hypot(p.x - press.x, p.y - press.y) > 9) {
        var c = choices[press.i], q = choiceXY(press.i);
        drag = { i: press.i, ox: q.x - press.x, oy: q.y - press.y, x: 0, y: 0, C: q.C };
        drag.x = p.x + drag.ox; drag.y = p.y + drag.oy;
        c.state = 'out'; press = null; K.sfx.play('swoosh', { soft: 1 });
      }
    },
    up: function (p) {
      if (drag) {
        var d = drag; drag = null;
        var s = slotAt(d.x, d.y, Math.max(train.P * 0.75, 52));
        if (s >= 0) launchTo(d.i, s, d.x, d.y, d.s || d.C * TRAY_K * 1.08, 'snap');
        else { fly = { i: d.i, phase: 'back', t: 0, dur: 0.28, fx: d.x, fy: d.y, fs: d.C * TRAY_K * 1.08, ok: true }; K.sfx.play('tick'); }
        return;
      }
      if (press) {
        var i = press.i; press = null; choices[i].press = 0;
        if (phase === 'pick' && !fly) { var b = currentBlank(); if (b >= 0) { var q = choiceXY(i); choices[i].state = 'out'; launchTo(i, b, q.x, q.y, q.C * TRAY_K, 'go'); K.sfx.play('swoosh'); } }
      }
    }
  });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'p') { if (phase !== 'done') pause(); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= choices.length && phase === 'pick' && !fly && !drag) {
      var c = choices[n - 1]; if (c.state !== 'idle' || c.pop < 0.5 || c.leaving) return;
      var b = currentBlank(), q = choiceXY(n - 1); c.state = 'out'; K.sfx.play('pick'); K.sfx.play('swoosh'); launchTo(n - 1, b, q.x, q.y, q.C * TRAY_K, 'go');
    }
  });

  // A piece leaves the tray for slot s. It is judged when it lands.
  function launchTo(i, s, fx, fy, fs, how) {
    K.bridge.answer();
    fly = { i: i, slot: s, phase: how, t: 0, dur: how === 'snap' ? 0.13 : 0.42, fx: fx, fy: fy, fs: fs };
    if (tutorial) tutorial = false;
  }

  function judge() {
    var c = choices[fly.i], cell = train.cells[fly.slot], ok = c.k === key(round.answers[fly.slot]);
    if (ok) {
      cell.p = c.p; cell.filled = true; cell.land = 1;
      if (cell.missed) slotsMissed++;
      var x = cellX(fly.slot), y = pieceY(fly.slot);
      K.sfx.play('clunk'); K.buzz(12);
      K.fx.burst(x, y, { n: 14, colors: ['#ffe9a0', '#ffffff', A.COLOURS[c.p.c] || '#ffd36b'], speed: 260, size: 11, life: 0.7, shape: 'star', gravity: 300 });
      var praise = cell.missed ? ['Yes!', 'Got it!'] : ['Yes!', 'Great!', 'Super!', 'Well done!', 'Nice!'];
      K.fx.text(x, y - train.P * 0.7, praise[(Math.random() * praise.length) | 0], { size: Math.max(26, Math.min(44, train.P * 0.42)), color: '#fff6c2', stroke: 'rgba(60,20,80,.6)' });
      fly = null; c.state = 'gone';
      if (!hinted) { hinted = true; store.set('hinted', true); if (hint) { hint.hide(); hint = null; } }
      var next = currentBlank();
      if (next >= 0) {
        choices.forEach(function (o) { o.leaving = true; });
        later(0.3, function () { setChoices(next); });
      } else {
        later(0.4, lightUp);
      }
    } else {
      cell.missed = true; blankMisses++;
      fly.phase = 'wiggle'; fly.t = 0; fly.dur = 0.5;
      K.sfx.play('wobble'); K.buzz(25);
    }
  }

  // ---------- round end, level end ----------
  function lightUp() {
    phase = 'lightup'; hud();
    choices.forEach(function (o) { o.leaving = true; });
    for (var i = 0; i < train.n; i++) (function (i) {
      later(i * 0.12, function () { var c = train.cells[i]; c.flash = 1; c.hop = 0.001; K.sfx.play('wagon', { i: i }); K.fx.burst(cellX(i), pieceY(i), { n: 6, color: '#fff3c4', speed: 150, size: 9, life: 0.5, shape: 'star', gravity: -40 }); });
    })(i);
    later(train.n * 0.12 + 0.45, function () {
      if (ri + 1 < rounds.length) depart(function () { ri++; startRound(); });
      else levelComplete();
    });
  }
  function depart(after) {
    phase = 'depart'; train.t = 0; train.from = train.dx; train.after = after;
    choices = [];
    K.sfx.play('depart', { dur: 1.15 });
  }

  function levelComplete() {
    var tolerance = Math.max(1, Math.floor(slotsTotal * 0.25));
    var stars = slotsMissed === 0 ? 3 : slotsMissed <= tolerance ? 2 : 1;
    progress.finish(level, stars);
    K.bridge.complete();
    K.sfx.play('win'); K.buzz(30);
    praise(stars === 3 ? 'mashaallah' : 'ahsant');
    var top = L.top, bottom = L.railY;
    for (var i = 0; i < 6; i++) later(i * 0.15, function () {
      K.fx.burst(K.rand(L.w * 0.12, L.w * 0.88), K.rand(top, Math.max(top + 20, bottom - 40)), { n: 22, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', '#b8f28a'], speed: 420, size: 14, life: 1.2, shape: 'star', gravity: 500 });
    });
    K.fx.text(L.w / 2, Math.max(L.top + 40, L.railY - train.P * 2), stars === 3 ? 'Perfect!' : 'Well done!', { size: Math.min(64, L.w * 0.11), color: '#fff6c2', stroke: 'rgba(60,20,80,.6)', life: 1.4, rise: 50 });
    depart(function () { train = null; });
    phase = 'done';
    hud();
    var last = level === COUNT, endOfWorld = level % 10 === 0;
    later(1.5, function () {
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: function () { openLevels(true); } });
      var right = slotsTotal - slotsMissed;
      K.ui.sheet({
        title: last ? 'You did it!' : endOfWorld ? A.WORLDS[world].name + ' done!' : 'Pattern pro!',
        text: last ? 'Every train is home. MashaAllah!' : 'Right first time: ' + right + ' of ' + slotsTotal,
        stars: stars, buttons: buttons });
    });
  }

  function pause() {
    if (loopApi) loopApi.paused = true;
    K.ui.sheet({ title: 'Paused', text: A.WORLDS[world].name + ' · Level ' + level, buttons: [
      { label: 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { resume(); startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: function () { openLevels(false); } },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); pause(); } }] });
  }
  function resume() { if (loopApi) loopApi.paused = false; }
  function openLevels(fromEnd) {
    if (loopApi && !fromEnd) loopApi.paused = true;
    K.ui.levelSelect({
      title: 'Shape Patterns',
      worlds: A.WORLDS.map(function (w, i) { return { name: w.name, color: w.color, from: i * 10 + 1, to: i * 10 + 10 }; }),
      progress: progress, current: level,
      onPick: function (n) { resume(); startLevel(n); },
      onClose: function () { resume(); if (phase === 'done') startLevel(progress.current()); }
    });
  }

  // ---------- simulation ----------
  function makeAmbient() {
    ambient = [];
    for (var i = 0; i < 24; i++) ambient.push({ x: Math.random(), y: Math.random(), v: 0.4 + Math.random() * 0.6, ph: Math.random() * 6.28, s: 0.6 + Math.random() * 0.8 });
  }

  function step(dt) {
    time += dt;
    K.fx.update(dt);
    for (var i = tasks.length - 1; i >= 0; i--) { var tk = tasks[i]; tk.t -= dt; if (tk.t <= 0) { tasks.splice(i, 1); tk.fn(); } }
    if (bannerT > 0) bannerT -= dt;
    ambient.forEach(function (a) { a.ph += dt; a.y -= dt * 0.01 * a.v * (world === 1 ? 0.5 : 1); if (a.y < -0.05) a.y = 1.05; a.x += Math.sin(a.ph * 0.7) * dt * 0.006; });

    // train motion: arrive from the left, depart to the right; the scenery scrolls with it
    var moving = 0;
    if (train) {
      if (phase === 'arrive') {
        train.t += dt; var u = Math.min(1, train.t / 1.25), e = 1 - Math.pow(1 - u, 3);
        train.dx = train.from * (1 - e);
        scrollV = 520 * (1 - e);
        moving = 1 - e;
        if (u >= 1) { train.dx = 0; phase = 'pick'; scrollV = 0; setChoices(currentBlank()); var pt = promptText(); if (pt !== lastPrompt || ri === 0) say(pt); lastPrompt = pt; hud(); }
      } else if ((phase === 'depart' || phase === 'done') && train.after) {
        train.t += dt; var u2 = Math.min(1, train.t / 1.15), e2 = u2 * u2 * u2;
        train.dx = train.from + (L.w / 2 + train.width / 2 + 60) * e2;
        scrollV = 520 * e2;
        moving = e2;
        if (u2 >= 1) { var fn = train.after; train.after = null; fn(); }
      }
    }
    scroll += scrollV * dt;
    if (train) {
      train.cells.forEach(function (c, i) {
        c.land = Math.max(0, c.land - dt * 2.6); c.flash = Math.max(0, c.flash - dt * 2.2);
        if (c.hop > 0) { c.hop += dt * 2.6; if (c.hop >= 1) c.hop = 0; }
        c.bob = moving > 0.05 ? Math.sin(time * 18 + i * 1.7) * 1.2 * moving : 0;
      });
      // steam
      puffT -= dt;
      if (puffT <= 0) {
        puffT = moving > 0.1 ? 0.07 : 0.9;
        var cx = engineX() + train.G.engineW - train.P * 0.3, cy = L.railY + train.G.bodyBottom - train.P * 0.84;
        if (cx > -40 && cx < L.w + 40) puffs.push({ x: cx, y: cy, r: train.P * (moving > 0.1 ? 0.1 : 0.07), vx: -scrollV * 0.35 - 10, vy: -train.P * 0.9, age: 0, life: moving > 0.1 ? 0.9 : 1.4 });
      }
    }
    for (var p = puffs.length - 1; p >= 0; p--) { var q = puffs[p]; q.age += dt; if (q.age >= q.life) { puffs.splice(p, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 0.97; q.r += dt * 18; }

    // choices
    choices.forEach(function (c) {
      if (c.leaving) c.pop = Math.max(0, c.pop - dt * 5);
      else if (c.pop < 1) c.pop = Math.min(1, c.pop + dt * 3.2);
      c.press = Math.max(0, c.press - dt * (press && choices[press.i] === c ? 0 : 6));
      c.wob = Math.max(0, c.wob - dt * 2.5);
      var want = blankMisses >= 2 && c.k === key(round.answers[c.blank]) ? 1 : 0;
      c.glow += (want - c.glow) * Math.min(1, dt * 4);
    });

    // flying piece
    if (fly) {
      fly.t += dt;
      if (fly.t >= fly.dur) {
        if (fly.phase === 'go' || fly.phase === 'snap') judge();
        else if (fly.phase === 'wiggle') {
          var c2 = choices[fly.i];
          fly = { i: fly.i, phase: 'back', t: 0, dur: 0.34, fx: cellX(fly.slot), fy: pieceY(fly.slot), fs: train.G.ps, ok: false };
          void c2;
        } else if (fly.phase === 'back') {
          choices[fly.i].state = fly.ok ? 'idle' : 'used';
          if (!fly.ok) choices[fly.i].wob = 0.6;
          fly = null;
        }
      }
    }
  }

  // ---------- drawing ----------
  function ensureArt() {
    var k = world + '|' + L.w + 'x' + L.h + '@' + L.dpr + '|' + Math.round(L.railY) + '|' + Math.round(L.P5);
    if (!bg || bgKey !== k) { bg = A.paintWorld(world, { w: L.w, h: L.h, dpr: L.dpr, railY: L.railY, horizon: L.horizon, P: L.P5 }); bgKey = k; sprites = {}; }
  }
  function sprite(k, make) { return sprites[k] || (sprites[k] = make()); }
  function pieceSprite(p, S) {
    S = Math.max(8, Math.round(S));
    return sprite('p|' + p.s + '|' + p.c + '|' + (p.n || 1) + '|' + S, function () { return A.piece(p, S, L.dpr); });
  }
  function drawPiece(p, x, y, S, rot, sx, sy, alpha) {
    var sp = pieceSprite(p, S), Sr = Math.round(Math.max(8, S)), pad = sp.pad, full = Sr + pad * 2, k = S / Sr;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((p.r || 0) * Math.PI / 2 + (rot || 0));
    ctx.scale((sx || 1) * k, (sy || 1) * k);
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(sp, -full / 2, -full / 2, full, full);
    ctx.restore();
  }
  function layer(img, f) {
    var TW = bg.TW, off = Math.round(((scroll * f * L.dpr) % TW + TW) % TW) % TW;
    ctx.drawImage(img, -off, 0); ctx.drawImage(img, TW - off, 0);
  }

  function drawTrain() {
    var P = train.P, G = train.G, rail = L.railY, wa = (train.dx + scroll) / G.wr, wv = (train.dx + scroll);
    var bcur = phase === 'pick' ? currentBlank() : -1, hover = drag ? slotAt(drag.x, drag.y, Math.max(P * 0.75, 52)) : -1;
    var wagonImg0 = sprite('w0|' + Math.round(P * 10), function () { return A.wagon(P, L.dpr, world, 0); });
    var wagonImg1 = sprite('w1|' + Math.round(P * 10), function () { return A.wagon(P, L.dpr, world, 1); });
    var engImg = sprite('e|' + Math.round(P * 10), function () { return A.engine(P, L.dpr, world); });
    if (cellX(0) - P > L.w || engineX() + G.engineW + P < 0) return;
    // couplings
    ctx.fillStyle = '#2a1d2a';
    ctx.fillRect(cellX(0), rail + G.bodyBottom - P * 0.035, train.n * P, P * 0.04);
    for (var i = 0; i < train.n; i++) {
      var c = train.cells[i], x = cellX(i), y = rail + c.bob * 0.5;
      // wheels
      A.wheel(ctx, x - P * 0.24, rail - G.wr, G.wr, wa, world);
      A.wheel(ctx, x + P * 0.24, rail - G.wr, G.wr, wa + 0.6, world);
      // body
      var img = c.alt ? wagonImg1 : wagonImg0, d = L.dpr;
      ctx.drawImage(img, x - img.ox, y - img.oy, img.width / d, img.height / d);
      if (c.flash > 0) {
        ctx.save(); ctx.globalAlpha = c.flash * 0.55; ctx.fillStyle = '#fff6c8';
        A.rr(ctx, x - G.bodyW / 2, y + G.bodyTop, G.bodyW, G.bodyBottom - G.bodyTop, P * 0.06); ctx.fill(); ctx.restore();
      }
      // piece or empty slot
      var py = pieceY(i);
      if (c.p && (!c.blank || c.filled)) {
        // soft shadow on the wagon
        ctx.fillStyle = 'rgba(20,8,20,.28)'; ctx.beginPath(); ctx.ellipse(x, rail + G.bodyTop + 1, G.ps * 0.34 * (1 - c.hop * 0.3), P * 0.035, 0, 0, 6.283); ctx.fill();
        var sq = c.land > 0 ? Math.sin(c.land * Math.PI) * 0.22 : 0;
        if (c.flash > 0) { var gl = ctx.createRadialGradient(x, py, 0, x, py, G.ps * 0.8); gl.addColorStop(0, 'rgba(255,240,180,' + c.flash * 0.7 + ')'); gl.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, py, G.ps * 0.8, 0, 6.283); ctx.fill(); }
        var breathe = phase === 'pick' ? Math.sin(time * 2.2 + i * 0.8) * 0.02 : 0;
        drawPiece(c.p, x, py + sq * G.ps * 0.2, G.ps, 0, 1 + sq + breathe, 1 - sq + breathe);
      } else {
        var cur = i === bcur, hov = i === hover, pulse = 0.5 + 0.5 * Math.sin(time * 4), s = G.ps * (cur ? 0.94 + pulse * 0.05 + c.land * 0.12 : 0.9);
        ctx.save();
        ctx.translate(x, py);
        if (hov || cur) { var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.95); hg.addColorStop(0, hov ? 'rgba(255,220,120,.55)' : 'rgba(255,240,200,' + (0.18 + pulse * 0.18) + ')'); hg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, 6.283); ctx.fill(); }
        A.rr(ctx, -s / 2, -s / 2, s, s, s * 0.22);
        ctx.fillStyle = hov ? 'rgba(255,225,140,.35)' : 'rgba(255,255,255,.14)'; ctx.fill();
        ctx.setLineDash([s * 0.12, s * 0.08]); ctx.lineDashOffset = -time * 18;
        ctx.lineWidth = Math.max(2, s * 0.05); ctx.strokeStyle = hov ? '#ffd36b' : 'rgba(255,250,235,' + (cur ? 0.7 + pulse * 0.3 : 0.55) + ')'; ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '900 ' + Math.round(s * 0.6) + 'px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = s * 0.08; ctx.strokeStyle = 'rgba(40,15,60,.45)'; ctx.lineJoin = 'round'; ctx.strokeText('?', 0, s * 0.04);
        ctx.fillStyle = cur ? '#fff6d8' : 'rgba(255,250,235,.7)'; ctx.fillText('?', 0, s * 0.04);
        ctx.restore();
      }
    }
    // engine
    var ex = engineX(), ew = A.engineWheels(P);
    ew.forEach(function (wv2, k) { A.wheel(ctx, ex + wv2[0], rail - wv2[1], wv2[1], wv / wv2[1] + k, world); });
    ctx.drawImage(engImg, ex - engImg.ox, rail - engImg.oy + Math.sin(time * 9) * 0.6 * (scrollV > 5 ? 1 : 0), engImg.width / L.dpr, engImg.height / L.dpr);
    // connecting rod between the two driving wheels
    var ra = wv / ew[1][1], rx = Math.cos(ra) * ew[1][1] * 0.5, ry = Math.sin(ra) * ew[1][1] * 0.5;
    ctx.strokeStyle = '#d9d2c8'; ctx.lineWidth = Math.max(2, P * 0.03); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex + ew[1][0] + rx, rail - ew[1][1] + ry); ctx.lineTo(ex + ew[2][0] + rx, rail - ew[2][1] + ry); ctx.stroke();
  }

  function drawPuffs() {
    puffs.forEach(function (q) {
      var k = q.age / q.life;
      ctx.globalAlpha = (1 - k) * 0.7;
      var g = ctx.createRadialGradient(q.x - q.r * 0.3, q.y - q.r * 0.3, 0, q.x, q.y, q.r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0.15)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawAmbient() {
    ambient.forEach(function (a, i) {
      var x = a.x * L.w, y = a.y * L.railY;
      if (world === 0) { ctx.globalAlpha = 0.3 + 0.3 * Math.sin(a.ph * 2 + i); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.arc(x, y, 1.6 * a.s, 0, 6.283); ctx.fill(); }
      else if (world === 1) {
        var yy = L.horizon + a.y * (L.h - L.horizon), on = 0.5 + 0.5 * Math.sin(a.ph * 3 + i);
        var g = ctx.createRadialGradient(x, yy, 0, x, yy, 9 * a.s); g.addColorStop(0, 'rgba(255,240,140,' + 0.8 * on + ')'); g.addColorStop(1, 'rgba(255,240,140,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, yy, 9 * a.s, 0, 6.283); ctx.fill();
      } else if (i < 4) { // gulls gliding far away (simple wing strokes)
        var gx = ((a.x * L.w + time * 14 * a.v) % (L.w + 60)) - 30, gy = L.top + 10 + a.y * Math.max(10, (L.horizon - L.top) * 0.6), fl = Math.sin(time * 5 + i) * 2;
        ctx.globalAlpha = 0.65; ctx.strokeStyle = '#2f5a78'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gx - 7 * a.s, gy - fl); ctx.quadraticCurveTo(gx - 3 * a.s, gy - 4 * a.s, gx, gy); ctx.quadraticCurveTo(gx + 3 * a.s, gy - 4 * a.s, gx + 7 * a.s, gy - fl); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawTray() {
    var k = choices.length; if (!k) return;
    var C = choiceSize(k);
    var padImg = sprite('pad|' + Math.round(C), function () { return A.pad(Math.round(C), L.dpr, world); });
    choices.forEach(function (c, i) {
      var q = choiceXY(i), e = c.pop <= 0 ? 0 : K.ease.outBack(Math.min(1, c.pop));
      if (e <= 0.01) return;
      var used = c.state === 'used', wob = Math.sin(c.wob * 20) * c.wob * 0.15;
      var s = e * (1 - c.press * 0.1), full = padImg.width / L.dpr;
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(s, s); ctx.rotate(wob);
      if (c.glow > 0.02) { var gg = ctx.createRadialGradient(0, 0, C * 0.3, 0, 0, C * 0.85); gg.addColorStop(0, 'rgba(255,225,120,' + 0.6 * c.glow * (0.7 + 0.3 * Math.sin(time * 6)) + ')'); gg.addColorStop(1, 'rgba(255,225,120,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, C * 0.85, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = used ? 0.45 : 1;
      ctx.drawImage(padImg, -full / 2, -full / 2, full, full);
      ctx.restore();
      if (c.state === 'idle' || c.state === 'used') {
        var bob = c.state === 'idle' ? Math.sin(time * 2.4 + i * 1.3) * C * 0.025 : 0;
        drawPiece(c.p, q.x, q.y - C * 0.02 + bob, C * TRAY_K, wob, s * (1 + Math.sin(time * 2.4 + i * 1.3) * 0.02), s, used ? 0.32 : 1);
      }
    });
  }

  function flyPos() {
    var c = choices[fly.i], q = choiceXY(fly.i), u = Math.min(1, fly.t / fly.dur);
    if (fly.phase === 'go' || fly.phase === 'snap') {
      var tx = cellX(fly.slot), ty = pieceY(fly.slot), e = fly.phase === 'snap' ? K.ease.outCubic(u) : K.ease.inOutSine(u);
      var cx = (fly.fx + tx) / 2, cy = Math.min(fly.fy, ty) - Math.max(40, Math.abs(fly.fx - tx) * 0.25);
      if (fly.phase === 'snap') { cx = (fly.fx + tx) / 2; cy = (fly.fy + ty) / 2; }
      var x = (1 - e) * (1 - e) * fly.fx + 2 * (1 - e) * e * cx + e * e * tx, y = (1 - e) * (1 - e) * fly.fy + 2 * (1 - e) * e * cy + e * e * ty;
      return { x: x, y: y, s: fly.fs + (train.G.ps - fly.fs) * e, rot: Math.sin(u * Math.PI) * 0.25, p: c.p };
    }
    if (fly.phase === 'wiggle') {
      var k = 1 - u;
      return { x: cellX(fly.slot) + Math.sin(u * 30) * 7 * k, y: pieceY(fly.slot), s: train.G.ps, rot: Math.sin(u * 30) * 0.28 * k, p: c.p };
    }
    var e2 = K.ease.inOutSine(u), bx = (fly.fx + q.x) / 2, by = Math.min(fly.fy, q.y) - 30;
    return { x: (1 - e2) * (1 - e2) * fly.fx + 2 * (1 - e2) * e2 * bx + e2 * e2 * q.x, y: (1 - e2) * (1 - e2) * fly.fy + 2 * (1 - e2) * e2 * by + e2 * e2 * q.y,
      s: fly.fs + (q.C * TRAY_K - fly.fs) * e2, rot: 0, p: c.p };
  }

  function drawHand(x, y, s, press) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24 * (1 - press * 0.12), s / 24 * (1 - press * 0.12)); ctx.translate(-10.5, -3);
    var hp = new Path2D('M9 11V4.5a1.5 1.5 0 0 1 3 0V10l.1-1.6a1.5 1.5 0 0 1 3 .2V11l.2-.9a1.4 1.4 0 0 1 2.8.5V15c0 3.3-2.4 6-5.6 6h-1a5.6 5.6 0 0 1-4.6-2.5l-2.6-4a1.5 1.5 0 0 1 2.4-1.8L9 15z');
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = '#fff'; ctx.fill(hp); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#2a1a4a'; ctx.lineJoin = 'round'; ctx.stroke(hp);
    ctx.restore();
  }
  function drawTutorial() {
    if (!tutorial || phase !== 'pick' || fly || drag || !choices.length) return;
    var b = currentBlank(); if (b < 0) return;
    var ci = -1; choices.forEach(function (c, i) { if (c.k === key(round.answers[b])) ci = i; });
    if (ci < 0 || choices[ci].pop < 1) return;
    var q = choiceXY(ci), tx = cellX(b), ty = pieceY(b), u = (time % 2.4) / 2.4, hs = Math.max(40, q.C * 0.55);
    var x, y, pr = 0, ghost = 0;
    if (u < 0.25) { var e = K.ease.outCubic(u / 0.25); x = q.x + q.C * 0.5 * (1 - e); y = q.y + q.C * 0.6 * (1 - e) + 6; }
    else if (u < 0.38) { x = q.x; y = q.y + 6; pr = Math.sin((u - 0.25) / 0.13 * Math.PI); }
    else if (u < 0.8) { var e2 = K.ease.inOutSine((u - 0.38) / 0.42); x = q.x + (tx - q.x) * e2; y = q.y + (ty - q.y) * e2 - Math.sin(e2 * Math.PI) * 50 + 6; ghost = 1; }
    else { x = tx; y = ty + 6; ghost = 1 - (u - 0.8) / 0.2; }
    ctx.globalAlpha = Math.min(1, u * 8, (1 - u) * 6);
    if (ghost > 0) drawPiece(choices[ci].p, x, y - 6, q.C * 0.5, 0, 1, 1, 0.45 * ghost);
    ctx.globalAlpha = Math.min(1, u * 8, (1 - u) * 6);
    drawHand(x + hs * 0.12, y + hs * 0.1, hs, pr);
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!L.w) return;
    ensureArt();
    var d = L.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.sky, 0, 0);
    layer(bg.far, 0.12);
    layer(bg.mid, 0.4);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (world !== 1) drawAmbient();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    layer(bg.ground, 1);
    var sh = K.fx.offset();
    ctx.setTransform(d, 0, 0, d, sh.x * d, sh.y * d);
    if (world === 1) drawAmbient();
    if (train) drawTrain();
    drawPuffs();
    A.nearPlants(ctx, world, L, scroll, time);
    drawTray();
    if (drag) { var dc = choices[drag.i]; ctx.fillStyle = 'rgba(10,5,25,.25)'; ctx.beginPath(); ctx.ellipse(drag.x, drag.y + drag.C * 0.42, drag.C * 0.26, drag.C * 0.07, 0, 0, 6.283); ctx.fill();
      var over = slotAt(drag.x, drag.y, Math.max(train.P * 0.75, 52)) >= 0, want = over ? Math.min(drag.C * TRAY_K * 1.08, train.G.ps * 1.15) : drag.C * TRAY_K * 1.08;
      drag.s = drag.s ? drag.s + (want - drag.s) * 0.25 : want;
      drawPiece(dc.p, drag.x, drag.y, drag.s, Math.sin(time * 8) * 0.04, 1, 1); }
    if (fly) { var f = flyPos(); drawPiece(f.p, f.x, f.y, f.s, f.rot, 1, 1); }
    K.fx.draw(ctx);
    drawTutorial();

    // level banner
    if (bannerT > 0) {
      var k = Math.min(1, bannerT / 0.4, (2.0 - bannerT) / 0.3), cy = L.top + (L.railY - (train ? train.P * 1.4 : 0) - L.top) * 0.45, fs = Math.min(64, L.w * 0.12);
      ctx.globalAlpha = Math.max(0, k);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 ' + Math.round(fs * 0.36) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = fs * 0.1; ctx.strokeStyle = 'rgba(10,6,30,.55)';
      ctx.strokeText(A.WORLDS[world].name.toUpperCase(), L.w / 2, cy - fs * 0.7); ctx.fillStyle = A.WORLDS[world].color; ctx.fillText(A.WORLDS[world].name.toUpperCase(), L.w / 2, cy - fs * 0.7);
      ctx.font = '900 ' + Math.round(fs) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = fs * 0.16;
      ctx.strokeText('Level ' + level, L.w / 2, cy); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, L.w / 2, cy);
      ctx.font = '800 ' + Math.round(fs * 0.42) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = fs * 0.1;
      ctx.strokeText(LV.list[level - 1].name, L.w / 2, cy + fs * 0.75); ctx.fillStyle = 'rgba(255,250,240,.92)'; ctx.fillText(LV.list[level - 1].name, L.w / 2, cy + fs * 0.75);
      ctx.globalAlpha = 1;
    }
  }

  loopApi = K.loop({ step: step, draw: draw, hz: 120, onHidden: function () { if (phase !== 'done' && !DEBUG && !(loopApi && loopApi.paused)) pause(); } });

  // Test hook (only with ?debug in the URL): step the game by hand and inspect it.
  if (DEBUG) window.SP = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 120); i++) step(1 / 120); draw(); },
    draw: draw, start: startLevel,
    get: function () {
      var b = currentBlank();
      return { phase: phase, level: level, round: ri, rounds: rounds.length, blank: b, total: slotsTotal, missed: slotsMissed, fly: !!fly, drag: drag ? { x: drag.x, y: drag.y } : null,
        choices: choices.map(function (c) { return c.k + ':' + c.state; }), answer: b >= 0 ? key(round.answers[b]) : null,
        cells: train ? train.cells.map(function (c) { return c.p ? key(c.p) : '_'; }) : [], stars: progress.stars(level), prompt: round && round.prompt, recipe: round && round.recipe };
    },
    correct: function () { var b = currentBlank(); if (b < 0) return -1; for (var i = 0; i < choices.length; i++) if (choices[i].k === key(round.answers[b])) return i; return -1; },
    choicePos: function (i) { var q = choiceXY(i); return { x: q.x, y: q.y, C: q.C }; },
    slotPos: function (i) { return { x: cellX(i), y: pieceY(i) }; },
    tap: function (i) { var c = choices[i], b = currentBlank(); if (phase !== 'pick' || fly || !c || c.leaving || c.pop < 0.5 || c.state !== 'idle' || b < 0) return false; var q = choiceXY(i); c.state = 'out'; launchTo(i, b, q.x, q.y, q.C * TRAY_K, 'go'); return true; },
    L: L, rounds: function () { return rounds; }
  };

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
