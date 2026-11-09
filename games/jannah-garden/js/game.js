/* Jannah Garden: game.js
   A calm garden-building game. Tap a picture in the tray, then tap the garden to plant it (or drag it up
   from the tray). Drag a planted thing to move it; drop it in the basket to take it away.
   15 gentle goal levels in 3 garden areas, plus free play with 4 saved gardens.
   Built on the shared kit (js/kit): full-screen stage, fixed-step loop, pointer input, fx, sfx, ui, progress. */
(function () {
  'use strict';
  var K = window.Kit, A = window.GardenArt, GD = window.GARDEN, SND = window.GardenSound;
  var COUNT = GD.LEVELS.length, MAX_ITEMS = 60, SLOTS = 4, TAP_MOVE = 10, GROW_T = 0.8;
  var DEBUG = /[?&]debug\b/.test(location.search);
  var store = K.store('kahf-jannah-garden'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var mode = 'level', level = 1, slot = 0, area = -1, items = [], nextId = 1;
  var goals = [], goalCount = [], goalDone = [], levelDone = false;
  var selected = 'rose', time = 0, wind = 0, gust = 0, bannerT = 0;
  var drag = null, press = null, leaving = [], ripples = [], timers = [];
  var V = null, layers = null, dpr = 1, spriteK = 1, zoneMasks = {}, zoneShowT = 0, streaks = [];
  var clouds = [], birds = [], flies = [], motes = [], petals = [], glowImg = null;
  var sheetOpen = false, hint = null, moveHint = null, planted = 0, loop = null;
  var slots = store.get('slots', []);
  var lvs = store.get('lvs', {});
  for (var s0 = 0; s0 < SLOTS; s0++) if (slots[s0] === undefined) slots[s0] = null;

  // ---------- extra icons (added to the kit's icon set for sheet buttons) ----------
  var SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
  K.icons.garden = SV + '<circle cx="12" cy="7.6" r="1.6"/><circle cx="12" cy="4.2" r="1.7"/><circle cx="15.2" cy="6.6" r="1.7"/><circle cx="14" cy="10.4" r="1.7"/><circle cx="10" cy="10.4" r="1.7"/><circle cx="8.8" cy="6.6" r="1.7"/><path d="M12 12.6V21M12 18.4c-2.4 0-4-1.5-4-3.4 2.1 0 4 1.2 4 3.4zM12 19.6c2.1 0 3.6-1.3 3.6-3-2 0-3.6 1.1-3.6 3z"/></svg>';
  K.icons.basket = SV + '<path d="M3.5 10.5h17l-2.2 9h-12.6z"/><path d="M8 10.5l4-6 4 6M9 13.5v3M12 13.5v3M15 13.5v3"/></svg>';
  K.icons.check = SV + '<path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  K.icons.menu = SV + '<path d="M5 7h14M5 12h14M5 17h14"/></svg>';

  // ---------- HUD ----------
  var pTitle = K.ui.pill('');
  K.ui.spacer();
  var bGardens = K.ui.iconButton(K.icons.garden, 'My gardens', function () { openGardens(); });
  K.ui.iconButton('menu', 'Menu', function () { openMenu(); });
  var areaImg = [];
  function hud() {
    if (!areaImg.length) areaImg = ['river', 'path', 'fountain'].map(function (z) { return A.zoneIcon(z, 26, 2).toDataURL(); });
    var img = '<img src="' + areaImg[Math.max(0, area)] + '" alt="" style="width:24px;height:24px;border-radius:7px">';
    pTitle.set(img + (mode === 'level' ? 'Level ' + level : 'My Garden ' + (slot + 1)));
  }

  // ---------- goal bar ----------
  var goalBar = document.createElement('div'); goalBar.className = 'jg-goals'; document.body.appendChild(goalBar);
  var finishBtn = null, chips = [];
  function buildGoalBar() {
    goalBar.innerHTML = ''; chips = [];
    goalBar.hidden = mode !== 'level';
    if (mode !== 'level') return;
    goals.forEach(function (gl, i) {
      var c = document.createElement('button'); c.className = 'jg-chip';
      c.setAttribute('aria-label', GD.sayGoal(gl));
      var ic = A.icon(gl.t, 34, dpr); ic.className = 'it'; c.appendChild(ic);
      var pips = document.createElement('span'); pips.className = 'jg-pips';
      for (var k = 0; k < gl.n; k++) pips.appendChild(document.createElement('i'));
      c.appendChild(pips);
      if (gl.z) { var zc = A.zoneIcon(gl.z, 24, dpr); zc.className = 'zn'; c.appendChild(zc); }
      c.insertAdjacentHTML('beforeend', '<span class="jg-star">' + K.starSvg() + '</span>');
      c.addEventListener('click', function (e) { e.stopPropagation(); tapGoal(i); });
      goalBar.appendChild(c); chips.push(c);
    });
    finishBtn = document.createElement('button'); finishBtn.className = 'jg-finish'; finishBtn.innerHTML = K.icons.check;
    finishBtn.setAttribute('aria-label', 'Finish');
    finishBtn.addEventListener('click', function (e) { e.stopPropagation(); K.sfx.play('tap'); var n = goalDone.filter(Boolean).length; if (n && !levelDone) finishLevel(n); });
    goalBar.appendChild(finishBtn);
  }
  function tapGoal(i) {
    var gl = goals[i];
    select(gl.t, true);
    if (gl.z) zoneShowT = 3.5;
    SND.say(GD.sayGoal(gl));
    chips[i].classList.remove('pulse'); void chips[i].offsetWidth; chips[i].classList.add('pulse');
  }
  function evalGoals(announce) {
    if (mode !== 'level') return;
    var newly = false;
    goals.forEach(function (gl, i) {
      var c = GD.count(gl, area, items), was = goalDone[i];
      goalCount[i] = c; goalDone[i] = c >= gl.n;
      var chip = chips[i]; if (!chip) return;
      [].forEach.call(chip.querySelectorAll('.jg-pips i'), function (p, k) { p.className = k < c ? 'on' : ''; });
      chip.classList.toggle('done', goalDone[i]);
      if (goalDone[i] && !was && announce) { newly = true; chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse'); }
    });
    var n = goalDone.filter(Boolean).length;
    if (finishBtn) finishBtn.classList.toggle('show', n > 0 && n < goals.length && !levelDone);
    if (newly) SND.play('goal', { n: n });
    if (n === goals.length && !levelDone && announce) { levelDone = true; later(1.1, function () { finishLevel(n); }); }
    markTray();
  }

  // ---------- tray (picture buttons) ----------
  var tray = document.createElement('div'); tray.className = 'jg-tray';
  var scroller = document.createElement('div'); scroller.className = 'jg-scroll';
  var basket = document.createElement('button'); basket.className = 'jg-basket'; basket.setAttribute('aria-label', 'Basket: drop things here to take them away');
  tray.appendChild(scroller); tray.appendChild(basket); document.body.appendChild(tray);
  var trayBtns = {}, suppressClick = false, trayPress = null, btnSize = 58;
  basket.addEventListener('click', function () { K.sfx.play('tap'); bumpBasket(); if (!moveHint && !store.get('moved')) showMoveHint(); });
  function buildTray() {
    scroller.innerHTML = ''; trayBtns = {};
    GD.ITEMS.forEach(function (it) {
      var b = document.createElement('button'); b.className = 'jg-item'; b.setAttribute('aria-label', it.name);
      b.appendChild(A.icon(it.id, btnSize, dpr));
      b.addEventListener('pointerdown', function (e) { trayPress = { id: e.pointerId, x: e.clientX, y: e.clientY, t: it.id, b: b, started: false }; });
      b.addEventListener('pointermove', function (e) {
        var tp = trayPress; if (!tp || tp.id !== e.pointerId) return;
        if (!tp.started) {
          var dx = e.clientX - tp.x, dy = e.clientY - tp.y;
          if (dy < -14 && Math.abs(dy) > Math.abs(dx) * 1.1 && !sheetOpen) {
            tp.started = true; try { b.setPointerCapture(e.pointerId); } catch (_) {}
            select(it.id, false); beginNewDrag(it.id, e.clientX, e.clientY);
          }
        } else if (drag) moveDrag(e.clientX, e.clientY);
      });
      b.addEventListener('pointerup', function (e) { var tp = trayPress; if (!tp || tp.id !== e.pointerId) return; if (tp.started) { suppressClick = true; if (drag) endDrag(e.clientX, e.clientY); } trayPress = null; });
      b.addEventListener('pointercancel', function () { if (trayPress && trayPress.started && drag) cancelDrag(); trayPress = null; });
      b.addEventListener('click', function (e) { e.stopPropagation(); if (suppressClick) { suppressClick = false; return; } select(it.id, true); });
      scroller.appendChild(b); trayBtns[it.id] = b;
    });
    basket.innerHTML = ''; basket.appendChild(A.basket(btnSize, dpr, false)); basket.appendChild(A.basket(btnSize, dpr, true));
    select(selected, false);
    markTray();
  }
  function markTray() {
    for (var id in trayBtns) {
      var need = false;
      if (mode === 'level') goals.forEach(function (gl, i) { if (gl.t === id && !goalDone[i]) need = true; });
      trayBtns[id].classList.toggle('goal', need);
    }
  }
  function select(id, loud) {
    selected = id;
    for (var k in trayBtns) trayBtns[k].classList.toggle('sel', k === id);
    var b = trayBtns[id];
    if (b) {
      var sr = scroller.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (br.left < sr.left || br.right > sr.right) scroller.scrollBy({ left: br.left - sr.left - (sr.width - br.width) / 2, behavior: loud ? 'smooth' : 'auto' });
      if (loud) { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); var it = GD.BY_ID[id]; SND.play(it.snd); }
    }
  }
  function bumpBasket() { basket.classList.remove('bump'); void basket.offsetWidth; basket.classList.add('bump'); }

  // ---------- layout ----------
  var trayTop = 0, safe = { top: 0, bottom: 0, left: 0, right: 0 };
  var stage = K.stage(canvas, function (st) {
    dpr = st.dpr; safe = st.safe;
    var newBtn = Math.min(st.w, st.h) >= 600 ? 70 : (st.h < 430 ? 54 : 58);
    var rebuild = newBtn !== btnSize || !scroller.children.length;
    btnSize = newBtn;
    document.documentElement.style.setProperty('--jg-btn', btnSize + 'px');
    var trayH = btnSize + 16 + 8 + st.safe.bottom;
    trayTop = st.h - trayH;
    V = A.view(st.w, st.h, st.safe, trayH);
    spriteK = V.K * 1.15 * 1.12 * dpr;
    A.clearCache(); layers = null; zoneMasks = {}; glowImg = null;
    var wide = st.w >= 600;
    goalBar.style.top = 'calc(' + (wide ? 10 : 62) + 'px + var(--kit-st))';
    goalBar.classList.toggle('narrow', st.w < 400);
    if (rebuild) buildTray();
    if (area >= 0) { buildGoalBar(); evalGoals(false); }
    makeAmbient();
  });
  var ctx = stage.ctx;

  function ensureLayers() {
    if (layers) return;
    layers = A.paintArea(area, V, dpr);
    // shimmer streaks inside the water
    streaks = [];
    if (layers.water) {
      var tc = document.createElement('canvas').getContext('2d');
      for (var i = 0; i < 400 && streaks.length < 46; i++) {
        var x = Math.random() * V.w, y = V.hz + Math.random() * (V.h - V.hz);
        if (tc.isPointInPath(layers.water, x, y)) streaks.push({ x: x, y: y, ph: Math.random() * 6.28, l: 6 + Math.random() * 12 });
      }
    }
    glowImg = A.glow(80, dpr, '#ffcf7a');
  }
  function zoneMask(z) {
    if (zoneMasks[z]) return zoneMasks[z];
    var AR = GD.AREAS[area], test = AR.zones[z], sc = 5, cw = Math.ceil(V.w / sc), ch = Math.ceil(V.h / sc);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var g = c.getContext('2d'), img = g.createImageData(cw, ch), d = img.data, pts = [], al = new Float32Array(cw * ch);
    // 2x2 samples per cell, then a soft blur, so the glow has smooth edges
    for (var py = 0; py < ch; py++) for (var px = 0; px < cw; px++) {
      var n = 0;
      for (var sy = 0; sy < 2; sy++) for (var sx = 0; sx < 2; sx++) {
        var x = (px + 0.25 + sx * 0.5) * sc, y = (py + 0.25 + sy * 0.5) * sc, u = V.u(x), v = V.v(y);
        if (v >= 0 && v <= 1 && u >= 0 && u <= 1 && test(u, v) && !AR.blocked(u, v)) n++;
      }
      al[py * cw + px] = n / 4;
      if (n === 4 && Math.random() < 0.03) pts.push([(px + 0.5) * sc, (py + 0.5) * sc, Math.random() * 6.28]);
    }
    for (var py2 = 0; py2 < ch; py2++) for (var px2 = 0; px2 < cw; px2++) {
      var sum = 0, cnt = 0;
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) { var qx = px2 + ox, qy = py2 + oy; if (qx >= 0 && qy >= 0 && qx < cw && qy < ch) { sum += al[qy * cw + qx]; cnt++; } }
      var i = (py2 * cw + px2) * 4; d[i] = 255; d[i + 1] = 228; d[i + 2] = 130; d[i + 3] = Math.round(255 * sum / cnt);
    }
    g.putImageData(img, 0, 0);
    pts.sort(function () { return Math.random() - 0.5; });
    zoneMasks[z] = { c: c, pts: pts.slice(0, 26) };
    return zoneMasks[z];
  }

  // ---------- ambient life ----------
  function makeAmbient() {
    if (!V) return;
    clouds = []; birds = []; flies = []; motes = []; petals = [];
    for (var i = 0; i < 4; i++) { var size = (50 + Math.random() * 50) * Math.max(0.7, V.K); clouds.push({ img: A.cloud(7 + i * 13, size, dpr), x: Math.random() * V.w, y: V.hz * (0.12 + Math.random() * 0.45), v: 4 + Math.random() * 6 }); }
    for (var b = 0; b < 3; b++) birds.push(newBird(Math.random() * V.w));
    for (var f = 0; f < 3; f++) flies.push({ x: Math.random() * V.w, y: V.y(Math.random()) - 40, vx: 0, vy: 0, tx: 0, ty: 0, wait: 0, hue: f + 1, t: Math.random() * 9, dir: 1 });
    for (var m = 0; m < 18; m++) motes.push({ x: Math.random() * V.w, y: V.hz + Math.random() * (V.h - V.hz), ph: Math.random() * 6.28, s: 0.6 + Math.random() });
    for (var p = 0; p < 5; p++) petals.push({ x: Math.random() * V.w, y: Math.random() * V.h, r: Math.random() * 6.28, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6.28 });
  }
  function newBird(x, y, fast) {
    var dir = Math.random() < 0.5 ? -1 : 1;
    return { x: x != null ? x : (dir > 0 ? -30 : V.w + 30), y: y != null ? y : V.hz * (0.15 + Math.random() * 0.55), vx: dir * (fast ? 120 : 22 + Math.random() * 22) * Math.max(0.7, V.K),
      vy: fast ? -40 : 0, s: (0.55 + Math.random() * 0.45) * Math.max(0.7, V.K), ph: Math.random() * 6.28 };
  }
  function flyTarget(fl) {
    var cands = items.filter(function (it) { var k = GD.BY_ID[it.t].kind; return (k === 'flower' || k === 'tree') && it.grow >= 1; });
    if (cands.length && Math.random() < 0.8) {
      var it = cands[(Math.random() * cands.length) | 0], s = V.pf(it.v) * it.sc, S = A.SPR[it.t];
      fl.tx = V.x(it.u) + (Math.random() - 0.5) * S.w * s * 0.5; fl.ty = V.y(it.v) - S.h * s * (0.75 + Math.random() * 0.2);
    } else { fl.tx = V.x(Math.random()); fl.ty = V.y(0.2 + Math.random() * 0.8) - 30 - Math.random() * 60; }
    fl.wait = 0;
  }
  function scatter(x, y) {
    flies.forEach(function (fl) { if (Math.hypot(fl.x - x, fl.y - y) < 110) { fl.tx = fl.x + (fl.x - x) * 2 + (Math.random() - 0.5) * 80; fl.ty = fl.y - 80 - Math.random() * 60; fl.wait = 0; fl.vy -= 80; } });
  }

  // ---------- items ----------
  function mk(t, u, v, o) {
    o = o || {};
    return { id: nextId++, t: t, u: u, v: v, flip: o.flip || (Math.random() < 0.5 ? -1 : 1), sc: o.sc || (0.92 + Math.random() * 0.16),
      hue: o.hue != null ? o.hue : (Math.random() * 5) | 0, ph: Math.random() * 6.28, grow: o.grown ? 1 : 0, wig: 0, lift: 0 };
  }
  function encode(list) { return list.map(function (it) { return [it.t, Math.round(it.u * 1000), Math.round(it.v * 1000), it.flip, Math.round(it.sc * 100), it.hue | 0]; }); }
  function decode(arr) {
    return (arr || []).filter(function (a) { return a && GD.BY_ID[a[0]] && isFinite(a[1]) && isFinite(a[2]); })
      .slice(0, MAX_ITEMS).map(function (a) { return mk(a[0], K.clamp(a[1] / 1000, 0, 1), K.clamp(a[2] / 1000, 0, 1), { flip: a[3] === -1 ? -1 : 1, sc: K.clamp((a[4] || 100) / 100, 0.8, 1.2), hue: a[5] | 0, grown: true }); });
  }
  function itemScale(it) { return V.pf(it.v) * it.sc; }
  function flyPos(it) {
    var s = itemScale(it), a = time * 0.9 + it.ph;
    return { x: V.x(it.u) + Math.cos(a) * 20 * s, y: V.y(it.v) - 52 * s + Math.sin(time * 1.9 + it.ph) * 9 * s, dir: Math.sin(a) > 0 ? -1 : 1 };
  }
  // Front-most item under the point (screen px), or null.
  function hitItem(x, y) {
    var best = null, bv = -9;
    items.forEach(function (it) {
      var S = A.SPR[it.t], s = itemScale(it), ix = V.x(it.u), iy = V.y(it.v), hit = false;
      if (it.t === 'butterfly') { var p = flyPos(it); hit = Math.hypot(p.x - x, p.y - y) < Math.max(30, 26 * s); }
      else if (S.flat) { var hw = Math.max(26, S.w * 0.42 * s), hh = Math.max(24, 30 * s); hit = Math.abs(x - ix) < hw && Math.abs(y - iy) < hh; }
      else { var w = Math.max(48, S.w * (S.hitW || 0.8) * s), h = Math.max(48, S.h * s); hit = Math.abs(x - ix) < w / 2 && y < iy + 10 && y > iy - h; }
      var key = it.v + (S.flat ? -2 : 0);
      if (hit && key > bv) { best = it; bv = key; }
    });
    return best;
  }
  function plantable(u, v) { return u >= 0 && u <= 1 && v >= 0 && v <= 1 && !GD.AREAS[area].blocked(u, v); }
  // Move a spot off water and paths onto the nearest grass.
  function settle(u, v) {
    u = K.clamp(u, 0, 1); v = K.clamp(v, 0, 1);
    var AR = GD.AREAS[area];
    for (var i = 0; i < 4 && AR.blocked(u, v); i++) { var n = AR.nudge(u, v); u = K.clamp(n.u, 0, 1); v = K.clamp(n.v, 0, 1); }
    if (AR.blocked(u, v)) { // last resort: search nearby
      for (var r = 0.02; r < 0.4; r += 0.02) for (var a = 0; a < 6.28; a += 0.5) { var uu = u + Math.cos(a) * r, vv = v + Math.sin(a) * r; if (plantable(uu, vv)) return { u: uu, v: vv }; }
    }
    return { u: u, v: v };
  }
  function plant(type, u, v, quiet) {
    if (items.length >= MAX_ITEMS) { bumpBasket(); SND.play('full'); K.fx.text(V.x(u), V.y(v) - 20, 'Garden full!', { size: 26, color: '#fff6c2', stroke: 'rgba(40,60,20,.6)' }); return null; }
    var p = settle(u, v), it = mk(type, p.u, p.v);
    items.push(it);
    var info = GD.BY_ID[type], x = V.x(it.u), y = V.y(it.v), s = itemScale(it);
    if (!quiet) {
      SND.play(info.snd); K.buzz(8);
      K.fx.burst(x, y, { n: 8, colors: ['#8a5a36', '#a87444', '#6b4426'], speed: 110 * s + 40, size: 6 * s + 3, life: 0.5, gravity: 420, shape: 'dot', spread: 2.2, angle: -Math.PI / 2 });
      K.fx.burst(x, y - A.SPR[type].h * s * 0.5, { n: 10, colors: ['#fff6c2', '#ffd36b', '#ffffff', '#ffc1d6'], speed: 160, size: 9, life: 0.9, gravity: -30, shape: 'star', jitter: 20 });
      scatter(x, y);
    }
    planted++;
    if (hint) { hint.hide(); hint = null; store.set('hinted', true); }
    if (planted === 4 && !store.get('moved')) showMoveHint();
    evalGoals(true); save();
    return it;
  }
  function removeItem(it, toBasket) {
    var i = items.indexOf(it); if (i < 0) return;
    items.splice(i, 1);
    var br = basket.getBoundingClientRect();
    leaving.push({ it: it, x0: drag && drag.it === it ? drag.x : V.x(it.u), y0: drag && drag.it === it ? drag.y : V.y(it.v), x1: br.left + br.width / 2, y1: br.top + br.height / 2, t: 0, toBasket: toBasket });
    SND.play('basket'); bumpBasket();
    evalGoals(true); save();
  }

  // ---------- input: the garden ----------
  K.pointer(canvas, function (sx, sy) { return { x: sx, y: sy }; }, {
    down: function (p) {
      if (sheetOpen || !V) return;
      var it = hitItem(p.x, p.y);
      press = { x: p.x, y: p.y, t: performance.now(), it: it, moved: false };
      if (it) it.wig = Math.max(it.wig, 0.25);
    },
    move: function (p) {
      if (!press) return;
      if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) > TAP_MOVE) {
        press.moved = true;
        if (press.it && !drag) beginItemDrag(press.it, press.x, press.y);
      }
      if (drag) moveDrag(p.x, p.y);
    },
    up: function (p, e) {
      if (!press) return;
      var pr = press; press = null;
      if (drag) { if (e && e.type === 'pointercancel') cancelDrag(); else endDrag(p.x, p.y); return; }
      if (e && e.type !== 'pointerup') return; // cancelled touches never plant
      if (!pr.moved && performance.now() - pr.t < 900) tapAt(p.x, p.y, pr.it);
    }
  });
  function tapAt(x, y, it) {
    if (it) {
      it.wig = 1; var info = GD.BY_ID[it.t]; SND.play(info.snd);
      var s = itemScale(it), ty = it.t === 'butterfly' ? flyPos(it).y : V.y(it.v) - A.SPR[it.t].h * s * 0.6;
      K.fx.burst(it.t === 'butterfly' ? flyPos(it).x : V.x(it.u), ty, { n: 6, colors: ['#ffffff', '#fff1a8'], speed: 120, size: 7, life: 0.6, gravity: -20, shape: 'star' });
      scatter(x, y);
      return;
    }
    var u = V.u(x), v = V.v(y), AR = GD.AREAS[area];
    if (y < V.hz) { // the sky: a bird flies by
      birds.push(newBird(x, y, true)); SND.play('chirp'); return;
    }
    if (y > trayTop - 2 || v > 1.06) return;
    if (AR.inWater(u, K.clamp(v, 0, 1)) && v >= 0) { ripples.push({ x: x, y: y, t: 0, s: V.pf(v) }); SND.play('splash'); K.fx.burst(x, y, { n: 8, color: '#e6fbff', speed: 140, size: 6, life: 0.5, gravity: 500, shape: 'dot', spread: 1.6, angle: -Math.PI / 2 }); return; }
    plant(selected, u, Math.max(0, v));
  }
  function overRemove(x, y) {
    var br = basket.getBoundingClientRect();
    if (x > br.left - 18 && x < br.right + 18 && y > br.top - 24 && y < br.bottom + 18) return 2;
    return y > trayTop + 4 ? 1 : 0;
  }
  function beginItemDrag(it, x, y) {
    drag = { kind: 'item', it: it, offX: V.x(it.u) - x, offY: V.y(it.v) - y, x: x, y: y, over: 0 };
    SND.play('pick'); K.buzz(6);
    basket.classList.add('open'); tray.classList.add('dragging');
    if (moveHint) { moveHint.hide(); moveHint = null; }
    if (!store.get('moved')) store.set('moved', true);
  }
  function beginNewDrag(t, x, y) {
    drag = { kind: 'new', t: t, x: x, y: y, over: 1 };
    SND.play('pick'); K.buzz(6);
    basket.classList.add('open'); tray.classList.add('dragging');
  }
  function newDragSpot(x, y) { var gy = y - 34; return { u: V.u(x), v: V.v(gy), gy: gy }; }
  function moveDrag(x, y) {
    drag.x = x; drag.y = y; drag.over = overRemove(x, y);
    basket.classList.toggle('hot', drag.over > 0 && drag.kind === 'item');
    if (drag.kind === 'item' && !drag.over) {
      var it = drag.it, u = V.u(x + drag.offX), v = V.v(y + drag.offY);
      it.u = K.clamp(u, 0, 1); it.v = K.clamp(v, 0, 1);
    }
  }
  function endDrag(x, y) {
    var d = drag; if (!d) return;
    moveDrag(x, y); drag = null;
    basket.classList.remove('open', 'hot'); tray.classList.remove('dragging');
    if (d.kind === 'item') {
      if (d.over) { drag = d; removeItem(d.it, true); drag = null; return; }
      var p = settle(d.it.u, d.it.v); d.it.u = p.u; d.it.v = p.v; d.it.wig = 0.8;
      SND.play('drop');
      var s = itemScale(d.it);
      K.fx.burst(V.x(p.u), V.y(p.v), { n: 6, colors: ['#c9a272', '#e7d3a8'], speed: 90, size: 5 * s + 2, life: 0.4, gravity: 300, shape: 'dot', spread: 2.4, angle: -Math.PI / 2 });
      evalGoals(true); save();
    } else {
      var sp = newDragSpot(x, y);
      if (d.over || sp.v < -0.08 || sp.v > 1.1) { SND.play('soft'); return; }
      plant(d.t, sp.u, Math.max(0, sp.v));
    }
  }
  function cancelDrag() {
    var d = drag; drag = null; basket.classList.remove('open', 'hot'); tray.classList.remove('dragging');
    if (d && d.kind === 'item') { var p = settle(d.it.u, d.it.v); d.it.u = p.u; d.it.v = p.v; save(); }
  }

  // ---------- saving ----------
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
  function saveNow() {
    clearTimeout(saveT);
    if (area < 0) return;
    if (mode === 'level') { lvs[level] = { d: levelDone ? 1 : 0, i: encode(items) }; store.set('lvs', lvs); }
    else { slots[slot] = { a: area, i: encode(items) }; store.set('slots', slots); }
    store.set('mode', mode); store.set('slot', slot);
  }
  addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(); });

  // ---------- timers in game time ----------
  function later(sec, fn) { timers.push({ t: sec, fn: fn }); }

  // ---------- modes ----------
  function setArea(a) {
    if (a !== area) { area = a; layers = null; zoneMasks = {}; }
  }
  function clearTransient() { drag = null; press = null; leaving = []; ripples = []; timers = []; K.fx.clear(); basket.classList.remove('open', 'hot'); tray.classList.remove('dragging'); }
  function startLevel(n, fresh) {
    if (area >= 0) saveNow();
    clearTransient();
    mode = 'level'; level = K.clamp(n, 1, COUNT); progress.setCurrent(level);
    setArea(GD.areaOf(level));
    var sv = lvs[level];
    items = (!fresh && sv && !sv.d) ? decode(sv.i) : [];
    levelDone = false; goals = GD.LEVELS[level - 1].goals; goalCount = goals.map(function () { return 0; }); goalDone = goals.map(function () { return false; });
    buildGoalBar(); evalGoals(false);
    var first = 0; for (var i = 0; i < goals.length; i++) if (!goalDone[i]) { first = i; break; }
    select(goals[first].t, false);
    bannerT = 2.4; hud(); saveNow();
    if (hint) { hint.hide(); hint = null; }
    if (moveHint) { moveHint.hide(); moveHint = null; }
    if (level === 1 && !store.get('hinted') && !items.length) hint = K.ui.hint('Tap a picture, then the garden', trayH() + 18, true);
    makeAmbient();
  }
  function trayH() { return (V ? V.h - trayTop : 90) - safe.bottom; }
  function openFree(i, a) {
    if (area >= 0) saveNow();
    clearTransient();
    mode = 'free'; slot = i;
    if (!slots[i]) slots[i] = { a: a || 0, i: [] };
    setArea(slots[i].a); items = decode(slots[i].i);
    goals = []; goalDone = []; levelDone = false;
    buildGoalBar(); markTray();
    bannerT = 2.0; hud(); saveNow();
    if (hint) { hint.hide(); hint = null; }
    if (moveHint) { moveHint.hide(); moveHint = null; }
    makeAmbient();
  }
  var lastStars = 0;
  function finishLevel(stars) {
    levelDone = true; lastStars = stars;
    progress.finish(level, stars);
    K.bridge.complete();
    saveNow();
    if (finishBtn) finishBtn.classList.remove('show');
    SND.play('win'); later(0.5, function () { SND.praise('mashaallah'); });
    items.forEach(function (it, k) { later(k * 0.03, function () { it.wig = 1; }); });
    for (var i = 0; i < 6; i++) later(i * 0.16, function () {
      K.fx.burst(K.rand(V.w * 0.15, V.w * 0.85), K.rand(V.hz * 0.6, V.gBot * 0.8), { n: 20, colors: ['#ffd36b', '#ff8fab', '#7ae7ff', '#ffffff', '#b8f28a'], speed: 380, size: 14, life: 1.2, shape: 'star', gravity: 360 });
    });
    later(1.4, function () {
      var last = level === COUNT, endOfArea = level % 5 === 0, free = firstFreeSlot();
      var buttons = [];
      if (!last) buttons.push({ label: endOfArea ? 'Next Garden' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1, true); } });
      else buttons.push({ label: 'My Gardens', icon: 'garden', primary: true, onClick: openGardens });
      buttons.push({ label: 'Plant More', icon: 'garden', row: true, onClick: function () {} });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      if (free >= 0 && items.length) buttons.push({ label: 'Save to My Gardens', icon: 'heart', onClick: function () {
        slots[free] = { a: area, i: encode(items) }; store.set('slots', slots); SND.play('saved'); K.fx.text(V.w / 2, V.hz, 'Saved!', { size: 44, color: '#fff6c2', stroke: 'rgba(40,60,20,.6)' }); } });
      sheet({ title: stars === 3 ? 'Beautiful garden!' : 'Lovely garden!',
        text: last ? 'Every garden is blooming. MashaAllah!' : GD.AREAS[area].name + ' · Level ' + level, stars: stars, buttons: buttons });
    });
  }
  function firstFreeSlot() { for (var i = 0; i < SLOTS; i++) if (!slots[i] || !slots[i].i || !slots[i].i.length) return i; return -1; }

  // ---------- sheets ----------
  function sheet(o) {
    sheetOpen = true; if (loop) loop.paused = true;
    if (press) press = null; if (drag) cancelDrag();
    (o.buttons || []).forEach(function (b) { var f = b.onClick; b.onClick = function () { unpause(); if (f) f(); }; });
    var oc = o.onClose; o.onClose = function () { unpause(); if (oc) oc(); };
    return K.ui.sheet(o);
  }
  function unpause() { sheetOpen = false; if (loop) loop.paused = false; }
  function openMenu() {
    saveNow();
    var buttons = [{ label: 'Play', icon: 'play', primary: true, onClick: function () {} }];
    buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
    buttons.push({ label: 'My Gardens', icon: 'garden', row: true, onClick: openGardens });
    if (items.length) buttons.push({ label: 'Clear Garden', icon: 'basket', onClick: confirmClear });
    buttons.push({ label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); openMenu(); } });
    sheet({ title: mode === 'level' ? 'Level ' + level : 'My Garden ' + (slot + 1), text: GD.AREAS[area].name, buttons: buttons, closeable: true });
  }
  function confirmClear() {
    var th = thumb(area, items, 220, 130); th.className = 'jg-thumb';
    sheet({ title: 'Clear the garden?', content: th, buttons: [
      { label: 'Clear', icon: 'basket', primary: true, row: true, onClick: clearGarden },
      { label: 'Keep', icon: 'close', row: true, onClick: function () {} }] });
  }
  function clearGarden() {
    var list = items.slice();
    list.forEach(function (it, k) {
      later(k * 0.025, function () {
        var s = itemScale(it);
        K.fx.burst(V.x(it.u), V.y(it.v) - A.SPR[it.t].h * s * 0.4, { n: 6, colors: ['#ffffff', '#fff1a8', '#c9f2a0'], speed: 140, size: 8, life: 0.6, gravity: -40, shape: 'star' });
      });
    });
    items = []; SND.play('basket'); bumpBasket();
    if (mode === 'level') { levelDone = false; evalGoals(false); }
    saveNow();
  }
  function openLevels() {
    sheetOpen = true; if (loop) loop.paused = true;
    K.ui.levelSelect({ title: 'Jannah Garden', worlds: GD.WORLDS, progress: progress, current: mode === 'level' ? level : -1,
      onPick: function (n) { unpause(); startLevel(n, false); }, onClose: unpause });
  }
  // A small picture of a garden (used for saved gardens).
  function thumb(a, list, w, h) {
    var tv = A.view(w, h, { left: 0, right: 0 }, 0), td = Math.min(2, dpr);
    var lay = A.paintArea(a, tv, td), c = document.createElement('canvas');
    c.width = Math.round(w * td); c.height = Math.round(h * td);
    var g = c.getContext('2d');
    g.drawImage(lay.sky, 0, 0); g.drawImage(lay.land, 0, 0);
    var all = GD.AREAS[a].fixed.map(function (f) { return { t: f.t, u: f.u, v: f.v, fixed: true, sc: 1, flip: 1 }; }).concat(list);
    all.sort(function (p, q) { return (A.SPR[p.t] && A.SPR[p.t].flat ? -2 : 0) + p.v - ((A.SPR[q.t] && A.SPR[q.t].flat ? -2 : 0) + q.v); });
    all.forEach(function (it) {
      var s = tv.pf(it.v) * (it.sc || 1), x = tv.x(it.u), y = tv.y(it.v);
      if (it.t === 'bigfountain') { var F = GD.AREAS[a].fount, rx = F.ru * (tv.w - 2 * tv.padX); g.setTransform(td, 0, 0, td, 0, 0); A.bigFountain(g, x, y, rx, Math.min(F.rv * (tv.gBot - tv.gTop), rx * 0.42), tv.K, 0); return; }
      if (it.t === 'butterfly') { g.setTransform(td, 0, 0, td, 0, 0); A.butterfly(g, x, y - 52 * s, s * 0.8, 0.1, it.hue || 0, 1); return; }
      var sp = A.sprite(it.t, Math.max(1, spriteK));
      g.setTransform(td * s * (it.flip || 1), 0, 0, td * s, td * x, td * y);
      A.drawSprite(g, sp);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }
  function openGardens() {
    saveNow();
    var wrap = document.createElement('div'); wrap.className = 'jg-slots';
    var sh = null;
    function go(fn) { return function (e) { e.stopPropagation(); K.sfx.play('tap'); if (sh) sh.close(); unpause(); fn(); }; }
    for (var i = 0; i < SLOTS; i++) (function (i) {
      var card = document.createElement('div'); card.className = 'jg-slot';
      var sv = slots[i];
      if (sv && sv.i && sv.i.length || (mode === 'free' && slot === i)) {
        var list = (mode === 'free' && slot === i) ? items : decode(sv.i);
        var b = document.createElement('button'); b.className = 'jg-open'; b.setAttribute('aria-label', 'Open garden ' + (i + 1));
        b.appendChild(thumb(sv ? sv.a : area, list, 200, 120));
        b.addEventListener('click', go(function () { openFree(i); }));
        card.appendChild(b);
        var del = document.createElement('button'); del.className = 'jg-del'; del.innerHTML = K.icons.basket; del.setAttribute('aria-label', 'Empty garden ' + (i + 1));
        del.addEventListener('click', go(function () { confirmDelete(i); }));
        card.appendChild(del);
      } else {
        card.classList.add('empty');
        [0, 1, 2].forEach(function (a) {
          var nb = document.createElement('button'); nb.className = 'jg-new'; nb.setAttribute('aria-label', 'New ' + GD.AREAS[a].name);
          nb.appendChild(A.zoneIcon(['river', 'path', 'fountain'][a], 40, dpr));
          nb.addEventListener('click', go(function () { slots[i] = { a: a, i: [] }; openFree(i, a); }));
          card.appendChild(nb);
        });
      }
      wrap.appendChild(card);
    })(i);
    sh = sheet({ title: 'My Gardens', content: wrap, closeable: true, buttons: [
      { label: 'Garden Levels', icon: 'levels', onClick: function () { if (mode !== 'level') startLevel(progress.current(), false); } }] });
  }
  function confirmDelete(i) {
    var sv = slots[i]; if (!sv) return;
    var th = thumb(sv.a, decode(sv.i), 220, 130); th.className = 'jg-thumb';
    sheet({ title: 'Empty this garden?', content: th, buttons: [
      { label: 'Empty', icon: 'basket', primary: true, row: true, onClick: function () {
        slots[i] = null; store.set('slots', slots); SND.play('basket');
        if (mode === 'free' && slot === i) { items = []; openFree(i, sv.a); }
        openGardens(); } },
      { label: 'Keep', icon: 'close', row: true, onClick: openGardens }] });
  }
  function showMoveHint() {
    if (moveHint || hint) return;
    moveHint = K.ui.hint('Drag to move · Basket to remove', trayH() + 18, true);
    later(6, function () { if (moveHint) { moveHint.hide(); moveHint = null; } });
  }

  // ---------- simulation ----------
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    for (var ti = timers.length - 1; ti >= 0; ti--) { var tm = timers[ti]; tm.t -= dt; if (tm.t <= 0) { timers.splice(ti, 1); tm.fn(); } }
    if (Math.random() < dt * 0.08) gust = 1;
    gust = Math.max(0, gust - dt * 0.5);
    wind = 0.55 * Math.sin(time * 0.45) + 0.25 * Math.sin(time * 1.3 + 1) + gust * Math.sin(time * 3) * 0.6;
    if (bannerT > 0) bannerT -= dt;
    ambience(dt);
    if (zoneShowT > 0) zoneShowT -= dt;
    items.forEach(function (it) {
      if (it.grow < 1) it.grow = Math.min(1, it.grow + dt / GROW_T);
      if (it.wig > 0) it.wig = Math.max(0, it.wig - dt * 1.5);
      var tl = drag && drag.it === it ? 1 : 0; it.lift += (tl - it.lift) * Math.min(1, dt * 14);
    });
    for (var l = leaving.length - 1; l >= 0; l--) { leaving[l].t += dt / 0.35; if (leaving[l].t >= 1) leaving.splice(l, 1); }
    for (var r = ripples.length - 1; r >= 0; r--) { ripples[r].t += dt; if (ripples[r].t > 1.4) ripples.splice(r, 1); }
    if (!V) return;
    clouds.forEach(function (c) { c.x += c.v * dt * (1 + wind * 0.2); if (c.x > V.w + 20) c.x = -c.img.w - 20; });
    for (var b = birds.length - 1; b >= 0; b--) {
      var bd = birds[b]; bd.x += bd.vx * dt; bd.y += (bd.vy || 0) * dt + Math.sin(time + bd.ph) * 4 * dt; bd.ph += dt;
      if (bd.x < -60 || bd.x > V.w + 60 || bd.y < -40) { if (birds.length > 3) birds.splice(b, 1); else birds[b] = newBird(); }
    }
    flies.forEach(function (fl) {
      fl.t += dt;
      if (!fl.tx && !fl.ty) flyTarget(fl);
      var dx = fl.tx - fl.x, dy = fl.ty - fl.y, d = Math.hypot(dx, dy);
      if (d < 10) { fl.wait += dt; if (fl.wait > 2 + (fl.hue % 3)) flyTarget(fl); }
      var sp = 60 * Math.max(0.7, V.K);
      fl.vx += (dx / (d || 1) * sp - fl.vx) * Math.min(1, dt * 2); fl.vy += (dy / (d || 1) * sp - fl.vy) * Math.min(1, dt * 2);
      if (d < 10) { fl.vx *= 0.9; fl.vy *= 0.9; }
      fl.x += fl.vx * dt + Math.sin(fl.t * 2.3) * 12 * dt; fl.y += fl.vy * dt + Math.sin(fl.t * 3.1) * 16 * dt;
      if (Math.abs(fl.vx) > 4) fl.dir = fl.vx > 0 ? 1 : -1;
    });
    motes.forEach(function (m) { m.ph += dt; m.y -= dt * 6 * m.s; m.x += (wind * 10 + Math.sin(m.ph) * 4) * dt; if (m.y < V.hz - 40) m.y = V.gBot; if (m.x > V.w + 5) m.x = -5; if (m.x < -5) m.x = V.w + 5; });
    petals.forEach(function (p) { p.ph += dt; p.x += (18 + wind * 26) * p.s * dt; p.y += (14 + Math.sin(p.ph * 1.7) * 10) * p.s * dt; p.r += dt * (1.5 + wind); if (p.x > V.w + 10 || p.y > V.h + 10) { p.x = -10 + Math.random() * V.w * 0.5; p.y = -10; } });
  }

  // Quiet ambience: river trickle where there is water, distant birds, breeze in the leaves.
  var amb = { water: 0.5, birds: 3, breeze: 4 };
  function ambience(dt) {
    if (area < 0) return;
    var wet = area !== 1 || items.some(function (it) { return it.t === 'fountain' || it.t === 'pond'; });
    if (wet && (amb.water -= dt) <= 0) { SND.play('trickle'); amb.water = K.rand(0.25, 0.7); }
    if ((amb.birds -= dt) <= 0) { SND.play('birdsFar'); amb.birds = K.rand(area === 1 ? 4 : 6, area === 1 ? 9 : 13); }
    if ((amb.breeze -= dt) <= 0) { SND.play('breeze'); amb.breeze = K.rand(7, 12); }
  }

  // ---------- drawing ----------
  function drawItem(it, alpha) {
    var S = A.SPR[it.t], info = GD.BY_ID[it.t], s = itemScale(it), x = V.x(it.u), y = V.y(it.v);
    var g = it.grow, sx = 1, sy = 1;
    if (g < 1) {
      var e = info.kind === 'tree' ? K.ease.outBack(g) : K.ease.outElastic(g), st = Math.sin(Math.min(1, g * 1.5) * Math.PI) * 0.25 * (1 - g);
      sx = e * (1 - st * 0.6); sy = e * (1 + st);
    }
    if (it.wig > 0) { var w = Math.sin(it.wig * 22) * it.wig; sx *= 1 + 0.1 * w; sy *= 1 - 0.09 * w; }
    var lift = it.lift; if (lift > 0.01) { s *= 1 + 0.1 * lift; y -= 12 * lift; }
    var sway = 0;
    if (info.kind === 'flower' || info.kind === 'tree') {
      var amp = (it.t === 'palm' ? 0.07 : info.kind === 'tree' ? 0.04 : 0.09) * (K.reducedMotion ? 0.3 : 1);
      sway = (wind * amp + Math.sin(time * 1.6 + it.ph) * amp * 0.25);
    }
    if (alpha != null) ctx.globalAlpha = alpha;
    // shadow
    if (!S.flat) {
      var shw = (S.w * 0.36 * (info.kind === 'tree' ? 0.75 : 1)) * s * Math.max(0.2, sx);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(25,55,20,' + (0.24 - lift * 0.08) + ')';
      ctx.beginPath(); ctx.ellipse(x, V.y(it.v) + 1, shw * (1 + lift * 0.3), shw * 0.26 * (1 + lift * 0.3), 0, 0, 6.283); ctx.fill();
    }
    if (it.t === 'butterfly') {
      var p = flyPos(it); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      A.butterfly(ctx, p.x, p.y - 12 * lift, s * 0.85 * Math.max(0.05, sx), time + it.ph, it.hue, p.dir);
      ctx.globalAlpha = 1; return;
    }
    var sp = A.sprite(it.t, spriteK);
    var a = dpr * s * sx * it.flip, d = dpr * s * sy;
    ctx.setTransform(a, 0, -sway * d, d, dpr * x, dpr * y);
    A.drawSprite(ctx, sp);
    if (it.t === 'fountain' && g > 0.6) A.fountainWater(ctx, time + it.ph);
    if (it.t === 'pond') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.4;
      for (var r = 0; r < 2; r++) { var q = (time * 0.35 + r * 0.5 + it.ph) % 1; ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.6 * (1 - q); ctx.beginPath(); ctx.ellipse(18, 4, 8 + q * 30, 3 + q * 9, 0, 0, 6.283); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawFixed(f) {
    var x = V.x(f.u), y = V.y(f.v);
    if (f.t === 'bigfountain') {
      var F = GD.AREAS[area].fount, rx = F.ru * (V.w - 2 * V.padX), ry = Math.min(F.rv * (V.gBot - V.gTop), rx * 0.42);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); A.bigFountain(ctx, x, y, rx, ry, V.K, time); return;
    }
    var s = V.pf(f.v), sp = A.sprite(f.t, spriteK), S = A.SPR[f.t];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(25,55,20,0.22)'; ctx.beginPath(); ctx.ellipse(x, y + 1, S.w * 0.4 * s, S.w * 0.1 * s, 0, 0, 6.283); ctx.fill();
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * x, dpr * y); A.drawSprite(ctx, sp);
  }

  function draw() {
    if (!V || area < 0) return;
    ensureLayers();
    var W = V.w, H = V.h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layers.sky, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clouds.forEach(function (c) { ctx.drawImage(c.img.c, c.x, c.y, c.img.w, c.img.h); });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layers.land, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // birds far away in the sky
    birds.forEach(function (b) { A.bird(ctx, b.x, b.y, b.s, time * 1.2 + b.ph, 'rgba(70,70,110,0.55)'); });
    // water shimmer
    if (layers.water && streaks.length) {
      ctx.save(); ctx.clip(layers.water);
      ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
      streaks.forEach(function (st) {
        var k = 0.5 + 0.5 * Math.sin(time * 1.8 + st.ph), kk = Math.max(0.6, (st.y - V.hz) / (H - V.hz) * 1.6);
        ctx.globalAlpha = 0.15 + 0.45 * k; ctx.lineWidth = 1.6 * kk;
        var xx = st.x + Math.sin(time * 0.7 + st.ph) * 8;
        ctx.beginPath(); ctx.moveTo(xx - st.l * kk * 0.5, st.y); ctx.lineTo(xx + st.l * kk * 0.5, st.y); ctx.stroke();
      });
      ctx.restore(); ctx.globalAlpha = 1;
    }
    ripples.forEach(function (r) {
      var q = r.t / 1.4; ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - q)) + ')'; ctx.lineWidth = 2;
      for (var k = 0; k < 2; k++) { var qq = Math.max(0, q - k * 0.2); ctx.beginPath(); ctx.ellipse(r.x, r.y, (6 + qq * 46) * r.s, (2 + qq * 15) * r.s, 0, 0, 6.283); ctx.stroke(); }
    });
    // zone highlight: where the current goal wants this picture
    var z = activeZone();
    if (z) {
      var zm = zoneMask(z), pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
      ctx.globalAlpha = (zoneShowT > 0 ? 0.42 : 0.24) + 0.14 * pulse; ctx.drawImage(zm.c, 0, 0, W, H); ctx.globalAlpha = 1;
      ctx.fillStyle = '#fffbe0';
      zm.pts.forEach(function (p, i) { var k = Math.sin(time * 2.4 + p[2]); if (k > 0.3) { ctx.globalAlpha = (k - 0.3) * 1.2; ctx.save(); ctx.translate(p[0], p[1] - 4); A.star8(ctx, 0, 0, 2 + 3 * k); ctx.fill(); ctx.restore(); } });
      ctx.globalAlpha = 1;
    }
    // first-level coaching ring
    if (hint && !drag) {
      var hx = V.x(0.32), hy = V.y(0.62), hp = (time % 1.4) / 1.4;
      ctx.strokeStyle = 'rgba(255,250,220,' + (1 - hp) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(hx, hy, 10 + hp * 34, (10 + hp * 34) * 0.4, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,220,0.85)'; ctx.beginPath(); ctx.ellipse(hx, hy, 6, 2.6, 0, 0, 6.283); ctx.fill();
    }

    // things in the garden, back to front (flat things first)
    var list = [];
    GD.AREAS[area].fixed.forEach(function (f) { list.push({ f: f, key: f.v }); });
    items.forEach(function (it) { if (!(drag && drag.it === it)) list.push({ it: it, key: (A.SPR[it.t].flat ? -10 : 0) + it.v }); });
    list.sort(function (p, q) { return p.key - q.key; });
    list.forEach(function (o) { if (o.f) drawFixed(o.f); else drawItem(o.it); });
    // lantern glow
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    items.forEach(function (it) {
      if (it.t !== 'lantern' || it.grow < 0.5) return;
      var s = itemScale(it), gl = (110 + 8 * Math.sin(time * 2.2 + it.ph)) * s * Math.max(0.6, V.K);
      ctx.drawImage(glowImg, V.x(it.u) - gl, V.y(it.v) - 104 * s - gl - 12 * it.lift, gl * 2, gl * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
    // ambient butterflies, pollen and petals in front
    flies.forEach(function (fl) { A.butterfly(ctx, fl.x, fl.y, 0.62 * Math.max(0.75, V.K), fl.t, fl.hue, fl.dir); });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes.forEach(function (m) { ctx.globalAlpha = 0.3 + 0.4 * Math.sin(m.ph * 2); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(m.x, m.y, 1.5 * m.s, 0, 6.283); ctx.fill(); });
    petals.forEach(function (p) { ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffc6da'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, 0.5 + 0.5 * Math.sin(p.ph * 3)); ctx.beginPath(); ctx.ellipse(0, 0, 5 * p.s, 2.6 * p.s, 0, 0, 6.283); ctx.fill(); ctx.restore(); });
    ctx.globalAlpha = 1;
    // the thing being dragged, on top
    if (drag && drag.kind === 'item') {
      if (drag.over) { var it2 = drag.it; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ghost(it2.t, drag.x, drag.y, 0.7, it2.flip); }
      else drawItem(drag.it);
    } else if (drag && drag.kind === 'new') {
      var sp2 = newDragSpot(drag.x, drag.y), ok = !drag.over && sp2.v > -0.08 && sp2.v < 1.1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ok) {
        var vv = K.clamp(sp2.v, 0, 1), pr = settle(sp2.u, vv);
        ctx.strokeStyle = 'rgba(255,248,210,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
        var rs = 34 * V.pf(pr.v); ctx.beginPath(); ctx.ellipse(V.x(pr.u), V.y(pr.v), rs, rs * 0.36, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      }
      ghost(drag.t, drag.x, sp2.gy, ok ? V.pf(K.clamp(sp2.v, 0, 1)) : 0.6, 1, 0.85);
    }
    // leaving for the basket
    leaving.forEach(function (l) {
      var e = K.ease.inQuad(l.t), x = K.lerp(l.x0, l.x1, e), y = K.lerp(l.y0, l.y1, e) - Math.sin(l.t * Math.PI) * 40;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ghost(l.it.t, x, y, 0.7 * (1 - e * 0.8), l.it.flip, 1 - e * 0.4);
    });
    // fx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    K.fx.draw(ctx);
    // banner
    if (bannerT > 0) {
      // lay the banner out below whatever floats at the top (goal chips or HUD), measured from the DOM
      var k2 = Math.max(0, Math.min(1, bannerT / 0.5, (2.4 - bannerT) / 0.4)), top = safe.top + 56;
      if (!goalBar.hidden) top = Math.max(top, goalBar.getBoundingClientRect().bottom);
      var big = Math.min(64, W / 9, Math.max(36, (V.gBot - top) * 0.3)), cy = Math.max(V.hz * 0.6, top + 14 + big * 0.85);
      ctx.globalAlpha = k2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = '800 ' + Math.round(big * 0.45) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,40,70,.45)';
      var nm = GD.AREAS[area].name.toUpperCase();
      ctx.strokeText(nm, W / 2, cy - big * 0.62); ctx.fillStyle = '#fff8e0'; ctx.fillText(nm, W / 2, cy - big * 0.62);
      var tt = mode === 'level' ? 'Level ' + level : 'My Garden ' + (slot + 1);
      ctx.font = '900 ' + Math.round(big) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 10;
      ctx.strokeText(tt, W / 2, cy + big * 0.12); ctx.fillStyle = '#ffffff'; ctx.fillText(tt, W / 2, cy + big * 0.12);
      ctx.globalAlpha = 1;
    }
  }
  // Draw an item picture centred on a point (for dragging and the basket).
  function ghost(t, x, y, s, flip, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    if (t === 'butterfly') { A.butterfly(ctx, x, y - 30 * s, s * 0.85, time, 0, 1); ctx.globalAlpha = 1; return; }
    var sp = A.sprite(t, spriteK), S = A.SPR[t];
    ctx.save(); ctx.translate(x, y + (S.flat ? 0 : 0)); ctx.scale(s * (flip || 1), s); A.drawSprite(ctx, sp); ctx.restore();
    if (t === 'fountain') { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); A.fountainWater(ctx, time); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  function activeZone() {
    if (mode !== 'level') return null;
    var want = drag ? (drag.kind === 'new' ? drag.t : drag.it.t) : selected;
    for (var i = 0; i < goals.length; i++) if (goals[i].z && goals[i].t === want && (!goalDone[i] || zoneShowT > 0)) return goals[i].z;
    if (zoneShowT > 0) for (var j = 0; j < goals.length; j++) if (goals[j].z && goals[j].t === selected) return goals[j].z;
    return null;
  }

  loop = K.loop({ step: step, draw: draw, hz: 60, onHidden: saveNow });

  // ---------- test hook (only with ?debug) ----------
  if (DEBUG) window.JG = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 60); i++) step(1 / 60); draw(); },
    draw: draw, start: startLevel, free: openFree, select: select, finish: finishLevel,
    plant: function (t, u, v) { var it = plant(t, u, v); return it && it.id; },
    remove: function (id) { var it = items.filter(function (q) { return q.id === id; })[0]; if (it) removeItem(it, true); },
    screen: function (u, v) { return { x: V.x(u), y: V.y(v) }; },
    item: function (id) { var it = items.filter(function (q) { return q.id === id; })[0]; return it ? { id: it.id, t: it.t, u: it.u, v: it.v, x: V.x(it.u), y: V.y(it.v), h: A.SPR[it.t].h * itemScale(it) } : null; },
    // A plantable spot (u, v) for goal zone z (or anywhere), the k-th in a spread-out list.
    spot: function (z, k) {
      var AR = GD.AREAS[area], test = z ? AR.zones[z] : null, out = [];
      for (var v = 0.04; v <= 0.98; v += 0.06) for (var u = 0.05; u <= 0.95; u += 0.07) if (plantable(u, v) && (!test || test(u, v))) out.push({ u: u, v: v });
      var pick = [];
      for (var i = 0; i < out.length; i++) { var q = out[(i * 7) % out.length]; pick.push(q); }
      return pick[k % pick.length];
    },
    get: function () {
      return { mode: mode, level: level, slot: slot, area: area, done: levelDone, selected: selected, sheet: sheetOpen, drag: !!drag,
        items: items.map(function (it) { return { id: it.id, t: it.t, u: +it.u.toFixed(3), v: +it.v.toFixed(3) }; }),
        goals: goals.map(function (gl, i) { return { t: gl.t, n: gl.n, z: gl.z, count: goalCount[i], done: goalDone[i] }; }),
        stars: progress.stars(level), lastStars: lastStars, trayTop: trayTop, V: { w: V.w, h: V.h, hz: V.hz, gTop: V.gTop, gBot: V.gBot, K: V.K } };
    },
    basketRect: function () { var r = basket.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    trayButton: function (t) { var r = trayBtns[t].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vis: r.left >= 0 && r.right <= innerWidth }; },
    slots: function () { return slots; }, save: saveNow
  };

  // ---------- start: straight into the garden the child was last in ----------
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    var m = store.get('mode', 'level'), sl = store.get('slot', 0);
    if (m === 'free' && slots[sl]) openFree(sl); else startLevel(progress.current(), false);
  });
})();
