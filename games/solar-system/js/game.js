/* Solar System: game.js
   A living model of the Solar System to explore (drag to turn it, pinch to zoom, tap a planet to fly to it)
   and a "Find the planet!" game: 15 levels in 3 worlds with "Which is bigger?" and "Closest to the Sun?"
   rounds. Built on the shared kit (js/kit): stage, loop, pointer, fx, sfx, ui, progress, bridge. */
(function () {
  'use strict';
  var K = window.Kit, A = window.SolarArt, SB = window.SolarBodies, LV = window.SolarLevels;
  var TAU = Math.PI * 2, DEBUG = /[?&]debug\b/.test(location.search);
  var COUNT = LV.list.length, BODIES = SB.list, BY = SB.byId;
  var SUN = BY.sun, FULL_R = 10.9;
  var store = K.store('kahf-solar-system'), progress = K.progress(store, COUNT);
  var canvas = document.getElementById('stage');

  // ---------- state ----------
  var mode = 'level';           // 'level' | 'explore'
  var state = 'init';           // 'init' | 'banner' | 'settle' | 'ask' | 'good' | 'clear' | 'fail'
  var paused = false, level = 1, world = 0, def = null, ri = -1, round = null;
  var hearts = 3, mistakes = 0, wrongInRound = 0, bannerT = 0, goodT = 0, time = 0, simT = 0, ts = 0.3, tsT = 0.3;
  var hint = null, exploreHint = null, foundOnce = !!store.get('found', false), selected = null, shooting = null, shootT = 4;

  // ---------- layout ----------
  var G = { w: 0, h: 0, dpr: 1, safe: null, minDim: 1, maxDim: 1, phoneLand: false, roll: 0, eDef: 0.52, Smin: 40, cap: 384,
            ax: 0, ay: 0, aw: 1, ah: 1, cx0: 0, cy0: 0 };
  var sky = null;
  function fitFor(R, rolled) {
    var e = G.eDef, hw = R + 0.25, hh = R * Math.sin(e) + 0.85 * Math.cos(e);
    if (rolled) { var t = hw; hw = hh; hh = t; }
    return Math.min(G.aw / (2 * hw), G.ah / (2 * hh));
  }
  function fit(R) { return fitFor(R, G.roll !== 0); }
  function layout() {
    var s = G.safe, w = G.w, h = G.h;
    G.minDim = Math.min(w, h); G.maxDim = Math.max(w, h);
    G.phoneLand = h < 520 && w > h * 1.3;
    G.eDef = G.phoneLand ? 0.44 : 0.52;
    var top = s.top + 62, bottom = s.bottom + (G.phoneLand ? 10 : (G.minDim < 500 ? 100 : 112));
    G.ax = s.left + 10; G.ay = top; G.aw = w - s.left - s.right - 20; G.ah = Math.max(80, h - top - bottom);
    G.cx0 = G.ax + G.aw / 2; G.cy0 = G.ay + G.ah / 2;
    var s0 = fitFor(FULL_R, false), s1 = fitFor(FULL_R, true);
    G.roll = s1 > s0 * 1.12 ? -Math.PI / 2 : 0;
    G.Smin = 1.3 * fit(FULL_R);
    G.cap = G.dpr > 1.5 ? 448 : 320;
    sky = A.buildSky(G.minDim, G.maxDim);
    G.K1 = 0.38 * G.maxDim;
    cam.elev = Kit.clamp(cam.elev || G.eDef, 0.17, 1.3);
  }

  // ---------- camera ----------
  var cam = { yaw: 0.35, elev: 0, vyaw: 0, velev: 0, zm: 1, panX: 0, panY: 0, frameR: 4.5, frameRT: 4.5,
              follow: null, fk: 0, fkT: 0, followPx: 0, fcx: 0, fcy: 0, idle: 0, touching: false };
  var V = { s: 1, b: 1, cx: 0, cy: 0, fx: 0, fy: 0, fz: 0, cyw: 1, syw: 0, ce: 1, se: 0, cr: 1, sr: 0 };
  function easeK(k) { return k * k * (3 - 2 * k); }
  function bodyWorld(b, s, out) {
    var bb = Math.max(1, G.Smin / s);
    if (b === SUN) { out[0] = out[1] = out[2] = 0; return out; }
    var a = (b.a0 || 0) + simT * TAU / b.period;
    if (b.parent) {
      var p = bodyWorld(BY[b.parent], s, [0, 0, 0]), rr = b.orbit * BY[b.parent].r * bb;
      out[0] = p[0] + Math.cos(a) * rr; out[1] = p[1]; out[2] = p[2] - Math.sin(a) * rr;
    } else { out[0] = Math.cos(a) * b.orbit; out[1] = 0; out[2] = -Math.sin(a) * b.orbit; }
    return out;
  }
  var tmp3 = [0, 0, 0];
  function computeView() {
    var base = fit(cam.frameR), k = easeK(cam.fk), s = base;
    if (cam.follow && k > 0) {
      var sF = cam.followPx / cam.follow.r;
      s = Math.exp(Math.log(base) + (Math.log(sF) - Math.log(base)) * k);
    }
    s *= cam.zm;
    V.s = s; V.b = Math.max(1, G.Smin / s);
    V.cyw = Math.cos(cam.yaw); V.syw = Math.sin(cam.yaw); V.ce = Math.cos(cam.elev); V.se = Math.sin(cam.elev);
    V.cr = Math.cos(G.roll); V.sr = Math.sin(G.roll);
    if (cam.follow && k > 0) { bodyWorld(cam.follow, s, tmp3); V.fx = tmp3[0] * k; V.fy = tmp3[1] * k; V.fz = tmp3[2] * k; }
    else V.fx = V.fy = V.fz = 0;
    V.cx = G.cx0 + cam.panX + (cam.fcx - G.cx0) * k;
    V.cy = G.cy0 + cam.panY + (cam.fcy - G.cy0) * k;
  }
  // world point -> screen (CSS px) + depth (bigger = nearer the viewer)
  function project(x, y, z, out) {
    var dx = x - V.fx, dy = y - V.fy, dz = z - V.fz;
    var x1 = dx * V.cyw + dz * V.syw, z1 = -dx * V.syw + dz * V.cyw;
    var sy = z1 * V.se - dy * V.ce, d = dy * V.se + z1 * V.ce;
    out[0] = V.cx + (x1 * V.cr - sy * V.sr) * V.s; out[1] = V.cy + (x1 * V.sr + sy * V.cr) * V.s; out[2] = d;
    return out;
  }
  function rotDir(x, y, z) {
    var x1 = x * V.cyw + z * V.syw, z1 = -x * V.syw + z * V.cyw, sy = z1 * V.se - y * V.ce, d = y * V.se + z1 * V.ce;
    return [x1 * V.cr - sy * V.sr, x1 * V.sr + sy * V.cr, d];
  }

  // ---------- stage ----------
  var stage = K.stage(canvas, function (st) {
    G.w = st.w; G.h = st.h; G.dpr = st.dpr; G.safe = st.safe;
    layout();
    if (card && cardOpen()) placeFollowCenter();
  });
  var ctx = stage.ctx;

  // ---------- HUD ----------
  var ORBIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="6.2" fill="currentColor" stroke="none"/><path d="M4.6 14.9C1.6 17 .9 18.7 2 19.4c1.9 1.2 8.4-1.4 14.4-5.9S24.9 5.3 22 4.6c-1-.2-2.6.3-4.6 1.4"/></svg>';
  var pLevel = K.ui.pill(''), pHearts = K.ui.hearts(5);
  K.ui.spacer();
  var bExplore = K.ui.iconButton(ORBIT_ICON, 'Explore', function () { if (mode === 'explore') exitExplore(); else enterExplore(); });
  K.ui.iconButton('pause', 'Pause', function () { pause(); });
  function hud() {
    if (mode === 'explore') {
      pLevel.set(ORBIT_ICON.replace('<svg', '<svg style="width:20px;height:20px"') + 'Explore');
      pHearts.style.display = 'none';
      bExplore.setIcon('play'); bExplore.setAttribute('aria-label', 'Back to the game');
    } else {
      var W = LV.worlds[world];
      pLevel.set('<svg viewBox="-50 -50 100 100" style="width:18px;height:18px"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="' + W.color + '"/></svg>Level ' + level);
      pHearts.style.display = '';
      pHearts.setMax(def ? def.hearts : 3); pHearts.setLives(hearts);
      bExplore.setIcon(ORBIT_ICON); bExplore.setAttribute('aria-label', 'Explore');
    }
  }

  // ---------- voice: the kit's device voices (English for questions and facts; praise in Arabic). Off in ?debug. ----------
  function voiceCheck() { document.documentElement.classList.toggle('ss-voice', !DEBUG && !!(K.say && K.say.has('en'))); }
  voiceCheck();
  try { window.speechSynthesis && window.speechSynthesis.addEventListener('voiceschanged', function () { setTimeout(voiceCheck, 0); }); } catch (e) {}
  var lastSaid = '';
  function say(text) { lastSaid = text; if (!DEBUG && K.say) K.say.text(text, 'en'); } // also kept for the replay buttons
  function hush() { if (K.say) K.say.stop(); }

  // ---------- pictures (planet portraits for the prompt and cards) ----------
  var pics = [];
  var PIC_L = (function () { var v = [-0.62, -0.36, 0.7], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
  var PIC_SPIN = { earth: 0.55, jupiter: 1.05 / TAU, neptune: 3.4 / TAU };
  function paintPic(p) {
    var b = p.b, c = p.c, g = c.getContext('2d'), S = c.width, ring = !!b.ring;
    var R = ring ? S / 2 / 2.4 : S / 2 * (b === SUN ? 0.7 : 0.9), D = A.spriteSize(Math.ceil(R * 2) + 2, 512);
    var tex = SB.texture(b);
    if (!tex.ready) A.pumpTexture(tex, 400);
    var spr = A.newSprite(D);
    A.renderSphere(spr, b, PIC_L, (PIC_SPIN[b.id] || 0) * tex.w, (PIC_SPIN[b.id] || 0) * tex.w + tex.w * 0.3, 0);
    g.clearRect(0, 0, S, S);
    var dr = R * D / (D / 2 - 1) / 2;
    if (b === SUN) { g.globalCompositeOperation = 'lighter'; g.drawImage(A.sunGlow(), S / 2 - R * 2.4, S / 2 - R * 2.4, R * 4.8, R * 4.8); g.globalCompositeOperation = 'source-over'; }
    if (ring) A.drawRing(g, S / 2, S / 2, R, b.basis, PIC_L, 'back');
    g.drawImage(spr.canvas, S / 2 - dr, S / 2 - dr, dr * 2, dr * 2);
    if (ring) A.drawRing(g, S / 2, S / 2, R, b.basis, PIC_L, 'front');
    p.done = tex.ready;
  }
  function picture(id, css) {
    var b = BY[id], px = Math.round(css * G.dpr), c = A.canvas(px, px);
    c.style.width = c.style.height = css + 'px'; c.className = 'ss-pic';
    var p = { b: b, c: c, done: false };
    paintPic(p);
    if (!p.done) pics.push(p);
    return c;
  }

  // ---------- prompt (bottom, or top on a landscape phone) ----------
  var SPEAK_ICON = K.icons.sound;
  var prompt = document.createElement('div');
  prompt.className = 'ss-prompt'; prompt.hidden = true;
  prompt.innerHTML = '<div class="ss-pics"></div><div class="ss-txt"><small></small><b></b></div><button class="kit-btn-icon ss-say" aria-label="Say it again">' + SPEAK_ICON + '</button>';
  document.body.appendChild(prompt);
  var pPics = prompt.querySelector('.ss-pics'), pSmall = prompt.querySelector('small'), pBig = prompt.querySelector('b');
  prompt.querySelector('.ss-say').addEventListener('click', function (e) { e.stopPropagation(); K.sfx.play('tap'); say(lastSaid); });
  function setPrompt(picsIds, small, big, cls) {
    pPics.innerHTML = '';
    var size = G.phoneLand ? 44 : (G.minDim < 400 ? 56 : 66);
    var many = picsIds.length > 2;
    picsIds.forEach(function (id, i) {
      if (i) { var vs = document.createElement('span'); vs.className = 'ss-or'; vs.textContent = 'or'; pPics.appendChild(vs); }
      pPics.appendChild(picture(id, many ? Math.round(size * (G.w < 420 ? 0.72 : 0.82)) : size));
    });
    pSmall.textContent = small; pBig.textContent = big;
    prompt.className = 'ss-prompt' + (G.phoneLand ? ' top' : '') + (many ? ' many' : '') + (cls ? ' ' + cls : '');
    prompt.hidden = false;
    prompt.classList.remove('pop'); void prompt.offsetWidth; prompt.classList.add('pop');
  }
  function hidePrompt() { prompt.hidden = true; }

  // ---------- explore fact card ----------
  var card = document.createElement('div');
  card.className = 'ss-card'; card.hidden = true;
  card.innerHTML = '<div class="ss-row"><div class="ss-cpic"></div><div class="ss-ctxt"><h3></h3><p></p></div></div><canvas class="ss-strip"></canvas>' +
    '<div class="ss-cbtns"><button class="kit-btn-icon ss-say" aria-label="Say it again">' + SPEAK_ICON + '</button><button class="kit-btn-icon" aria-label="Close">' + K.icons.close + '</button></div>';
  document.body.appendChild(card);
  card.querySelector('.ss-say').addEventListener('click', function (e) { e.stopPropagation(); K.sfx.play('tap'); say(lastSaid); });
  card.querySelectorAll('.kit-btn-icon')[1].addEventListener('click', function (e) { e.stopPropagation(); K.sfx.play('tap'); unselect(); });
  function cardOpen() { return !card.hidden; }
  function placeFollowCenter() {
    var s = G.safe;
    if (G.phoneLand || (G.w > G.h && G.w >= 700)) {
      var cw = card.offsetWidth || 320;
      cam.fcx = (s.left + (G.w - cw - 24 - s.right)) / 2; cam.fcy = (G.ay + G.h - s.bottom) / 2;
    } else {
      var ch = card.offsetHeight || 190;
      cam.fcx = G.w / 2; cam.fcy = (G.ay + (G.h - ch - 20 - s.bottom)) / 2;
    }
  }
  function drawStrip(cv, b) {
    var css = 236, hh = 34, d = G.dpr; cv.width = css * d; cv.height = hh * d; cv.style.width = css + 'px'; cv.style.height = hh + 'px';
    var g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
    var gl = g.createRadialGradient(13, hh / 2, 0, 13, hh / 2, 16);
    gl.addColorStop(0, '#fff6d0'); gl.addColorStop(0.55, '#ffbe4d'); gl.addColorStop(0.75, 'rgba(255,150,50,.45)'); gl.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(13, hh / 2, 16, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(31, hh / 2); g.lineTo(css - 6, hh / 2); g.stroke();
    var target = b.parent ? BY[b.parent] : b;
    SB.planets.forEach(function (id, i) {
      var p = BY[id], x = 46 + i * 24.5, r = 2.6 + Math.sqrt(p.r) * 6;
      if (p === target) { g.strokeStyle = '#f6c453'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, hh / 2, r + 4.5, 0, TAU); g.stroke(); }
      g.fillStyle = 'rgb(' + p.base.join(',') + ')'; g.globalAlpha = p === target ? 1 : 0.55;
      g.beginPath(); g.arc(x, hh / 2, r, 0, TAU); g.fill(); g.globalAlpha = 1;
      if (p === target && b.parent) { g.fillStyle = '#ddd'; g.beginPath(); g.arc(x + r + 5, hh / 2 - r - 2, 2.4, 0, TAU); g.fill(); }
    });
    if (b === SUN) { g.strokeStyle = '#f6c453'; g.lineWidth = 2.5; g.beginPath(); g.arc(13, hh / 2, 15, 0, TAU); g.stroke(); }
  }
  function showCard(b) {
    card.querySelector('.ss-cpic').innerHTML = '';
    card.querySelector('.ss-cpic').appendChild(picture(b.id, G.minDim < 400 ? 70 : 84));
    var nm = b.short;
    card.querySelector('h3').textContent = nm.charAt(0).toUpperCase() + nm.slice(1);
    card.querySelector('p').textContent = b.fact;
    drawStrip(card.querySelector('.ss-strip'), b);
    card.className = 'ss-card' + ((G.phoneLand || (G.w > G.h && G.w >= 700)) ? ' side' : '');
    card.hidden = false;
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
    placeFollowCenter();
  }

  // ---------- levels and rounds ----------
  var runId = 0; // bumps on every level start so late timers from an old level do nothing
  function startLevel(n) {
    runId++;
    level = K.clamp(n, 1, COUNT); def = LV.list[level - 1]; world = def.w;
    progress.setCurrent(level);
    hearts = def.hearts; mistakes = 0; ri = -1; round = null;
    mode = 'level'; paused = false; selected = null; card.hidden = true;
    cam.frameRT = LV.worlds[world].frame; cam.follow = null; cam.fk = 0; cam.fkT = 0; cam.zm = 1; cam.panX = cam.panY = 0;
    tsT = LV.speed(level);
    K.fx.clear(); hidePrompt();
    if (exploreHint) { exploreHint.hide(); exploreHint = null; }
    if (hint && level !== 1) { hint.hide(); hint = null; }
    state = 'banner'; bannerT = level === 1 ? 3.2 : 2.2;
    hud();
    K.sfx.play('whoosh');
  }
  function nextRound() {
    ri++;
    if (ri >= def.rounds.length) { clearLevel(); return; }
    round = def.rounds[ri]; wrongInRound = 0; round.hint = false; round.out = {};
    settle();
  }
  // Before asking, wait until the camera has stopped flying and every choice is fully on screen.
  // Taps during this time never count (tapBody only answers in 'ask').
  var settleT = 0;
  function settle() { state = 'settle'; settleT = 0; hidePrompt(); }
  function ask() {
    state = 'ask';
    askPrompt();
    K.sfx.play('ask');
    if (!foundOnce && !hint && level === 1) hint = K.ui.hint('Tap the planet!', G.phoneLand ? 24 : (G.minDim < 500 ? 112 : 126), true);
  }
  function camMoving() { return cam.fk > 0 || cam.fkT > 0 || Math.abs(cam.frameR - cam.frameRT) > 0.015 * cam.frameRT; }
  var tmpS = [0, 0, 0], tmpP = [0, 0, 0];
  function fullyOnScreen(id) {
    var b = BY[id], wp = bodyWorld(b, V.s, tmpS), p = project(wp[0], wp[1], wp[2], tmpP);
    var r = b.r * V.s * V.b * (b.ring ? 2.4 : 1) + 14;
    return p[0] - r >= G.ax && p[0] + r <= G.ax + G.aw && p[1] - r >= G.ay && p[1] + r <= G.ay + G.ah;
  }
  function settleStep(dt) {
    settleT += dt;
    if (camMoving() || settleT < 0.15) return;
    computeView();
    var ids = round.t === 'find' ? [round.id] : round.ids;
    if (ids.every(fullyOnScreen)) { ask(); return; }
    // something would be off screen: first undo the child's own zoom, pan and tilt, then widen the view
    var k = 1 - Math.exp(-dt * 6);
    if (Math.abs(cam.zm - 1) > 0.02 || Math.abs(cam.panX) + Math.abs(cam.panY) > 2 || Math.abs(cam.elev - G.eDef) > 0.02) {
      cam.zm += (1 - cam.zm) * k; cam.panX -= cam.panX * k; cam.panY -= cam.panY * k; cam.elev += (G.eDef - cam.elev) * k;
      cam.vyaw = cam.velev = 0;
    } else { cam.frameRT = Math.min(cam.frameRT * 1.06, 18); cam.frameR = cam.frameRT; }
  }
  function askPrompt() {
    if (round.t === 'find') {
      var b = BY[round.id];
      setPrompt([round.id], 'Find', cap(b.short) + '!');
      say('Find ' + b.name + '!');
    } else {
      var names = round.ids.map(function (id) { return BY[id].name; });
      if (round.t === 'big') { setPrompt(round.ids, 'Which is', 'bigger?'); say('Which is bigger? ' + names.join(', or ') + '?'); }
      else { setPrompt(round.ids, 'Which is closest', 'to the Sun?'); say('Which is closest to the Sun? ' + names.join(', or ') + '?'); }
    }
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function answerOf(r) {
    if (r.t === 'find') return r.id;
    var best = null;
    r.ids.forEach(function (id) {
      var b = BY[id];
      if (!best || (r.t === 'big' ? b.r > best.r : b.orbit < best.orbit)) best = b;
    });
    return best.id;
  }
  function choices() { return round && round.t !== 'find' ? round.ids : null; }

  function tapBody(b) {
    if (mode === 'explore') { select(b); return; }
    if (state === 'good') { if (goodT > 0.7) endGood(); return; }
    if (state !== 'ask' || paused) return;
    var ch = choices();
    if (ch && ch.indexOf(b.id) < 0) { // not one of the glowing choices: a gentle nudge, no penalty
      K.sfx.play('tick'); round.pulse = 0;
      return;
    }
    if (ch && round.out[b.id]) { K.sfx.play('tick'); return; }
    K.bridge.answer();
    if (b.id === answerOf(round)) correct(b); else wrong(b);
  }
  function correct(b) {
    state = 'good'; goodT = 0;
    if (!foundOnce) { foundOnce = true; store.set('found', true); }
    if (hint) { hint.hide(); hint = null; }
    b.bounceT = 0;
    K.sfx.play('good'); K.sfx.play('whoom', { vol: 0.6 }); K.buzz(12);
    var p = screenOf(b);
    K.fx.burst(p.x, p.y, { n: 22, colors: ['#ffd36b', '#ffffff', '#9fd8ff'], speed: 300, size: 13, life: 1, shape: 'star', gravity: 0, drag: 0.95 });
    K.fx.burst(p.x, p.y, { n: 14, color: '#fff3c4', speed: 180, size: 7, life: 0.7, shape: 'spark', gravity: 0 });
    var line;
    if (round.t === 'find') { line = b.fact; say('Yes! ' + b.fact); }
    else if (round.t === 'big') { line = cap(b.short) + ' is bigger!'; say('Yes! ' + cap(b.name) + ' is bigger.'); }
    else { line = cap(b.short) + ' is closest to the Sun!'; say('Yes! ' + cap(b.name) + ' is closest to the Sun.'); }
    setPrompt([b.id], cap(b.short), line, 'good');
    // fly in a little toward it
    cam.follow = b; cam.followPx = Math.max(b === SUN ? 0.16 : 0.11, 0) * G.minDim; cam.fkT = 1;
    cam.fcx = G.cx0; cam.fcy = G.cy0;
  }
  function endGood() {
    if (state !== 'good') return;
    cam.fkT = 0;
    nextRound();
  }
  function wrong(b) {
    mistakes++; wrongInRound++; hearts--;
    b.wobT = 0;
    K.sfx.play('bump'); K.buzz(30);
    pHearts.setLives(hearts); pHearts.bump();
    prompt.classList.remove('shake'); void prompt.offsetWidth; prompt.classList.add('shake');
    var p = screenOf(b);
    if (round.t === 'find') { K.fx.text(p.x, p.y - Math.max(18, p.r + 14), "That's " + b.short, { size: 26, color: '#ffe1ea', stroke: 'rgba(40,10,40,.7)', life: 1.4, rise: 40 }); say("That's " + b.name + '.'); }
    else { round.out[b.id] = true; K.fx.text(p.x, p.y - Math.max(18, p.r + 14), 'Not this one', { size: 24, color: '#ffe1ea', stroke: 'rgba(40,10,40,.7)', life: 1.3, rise: 40 }); say('Not quite. Try again!'); }
    if (wrongInRound >= (world === 0 ? 1 : 2)) round.hint = true;
    if (hearts <= 0) {
      state = 'fail'; K.sfx.play('lose'); hidePrompt();
      var myRun = runId;
      setTimeout(function () {
        if (myRun !== runId) return;
        K.ui.sheet({ title: 'Out of hearts', text: "Let's look at the planets again!", buttons: [
          { label: 'Try Again', icon: 'restart', primary: true, onClick: function () { startLevel(level); } },
          { label: 'Levels', icon: 'levels', onClick: openLevels }] });
      }, 900);
    }
  }
  function clearLevel() {
    state = 'clear'; hidePrompt(); cam.fkT = 0;
    var stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    progress.finish(level, stars);
    K.bridge.complete();
    K.sfx.play('win');
    setTimeout(function () { if (!DEBUG && K.say) K.say.praise(Math.random() < 0.5 ? 'subhanallah' : 'mashaallah'); }, 250);
    for (var i = 0; i < 5; i++) setTimeout(function () {
      if (state !== 'clear') return;
      K.fx.burst(K.rand(G.w * 0.2, G.w * 0.8), K.rand(G.h * 0.2, G.h * 0.6), { n: 20, colors: ['#ffd36b', '#ff9ec0', '#9fe3ff', '#ffffff'], speed: 380, size: 15, life: 1.3, shape: 'star', gravity: 80 });
    }, i * 170);
    var last = level === COUNT, endOfWorld = level % 5 === 0, myRun = runId;
    setTimeout(function () {
      if (myRun !== runId) return;
      var buttons = [];
      if (!last) buttons.push({ label: endOfWorld ? 'Next World' : 'Next Level', icon: 'next', primary: true, onClick: function () { startLevel(level + 1); } });
      buttons.push({ label: last ? 'Play Again' : 'Replay', icon: 'restart', row: true, primary: last, onClick: function () { startLevel(last ? 1 : level); } });
      buttons.push({ label: 'Levels', icon: 'levels', row: true, onClick: openLevels });
      buttons.push({ label: 'Explore the Planets', onClick: enterExplore });
      K.ui.sheet({
        title: last ? 'You found them all!' : endOfWorld ? LV.worlds[world].name + ' done!' : 'Well done!',
        text: last ? 'SubhanAllah! Allah made the Sun, the Moon and all the planets.' : 'You know your planets!',
        stars: stars, buttons: buttons });
    }, 1300);
  }

  // ---------- explore mode ----------
  function enterExplore() {
    if (mode === 'explore') return;
    if (state === 'good') cam.fkT = 0;
    mode = 'explore'; paused = false; hidePrompt(); hush();
    if (hint) { hint.hide(); hint = null; }
    cam.frameRT = FULL_R; tsT = 1; cam.zm = 1; cam.panX = cam.panY = 0;
    hud();
    if (!store.get('explored', false) && !exploreHint) exploreHint = K.ui.hint('Tap a planet to visit it', G.phoneLand ? 24 : 40, true);
  }
  function exitExplore() {
    if (mode !== 'explore') return;
    unselect(true);
    mode = 'level'; cam.frameRT = LV.worlds[world].frame; cam.zm = 1; cam.panX = cam.panY = 0; tsT = LV.speed(level);
    if (exploreHint) { exploreHint.hide(); exploreHint = null; }
    hud();
    if (state === 'clear') startLevel(progress.current());
    else if (state === 'fail') startLevel(level);
    else if (state === 'good') nextRound();       // that round was already answered
    else if (state === 'ask') settle();           // fly back, then ask the same question again
  }
  function select(b) {
    if (exploreHint) { exploreHint.hide(); exploreHint = null; store.set('explored', true); }
    selected = b;
    b.bounceT = 0;
    K.sfx.play('whoom'); K.sfx.play('swoosh');
    cam.follow = b; cam.fkT = 1; cam.zm = 1; cam.panX = cam.panY = 0;
    cam.followPx = (b === SUN ? 0.17 : b.ring ? 0.12 : 0.2) * G.minDim * (b.parent ? 0.7 : 1);
    showCard(b);
    say(cap(b.name) + '. ' + b.fact);
    try { window.KahfBridge && window.KahfBridge.item && window.KahfBridge.item('solar-' + b.id); } catch (e) {}
  }
  function unselect(quiet) {
    if (!selected && card.hidden) return;
    selected = null; card.hidden = true; cam.fkT = 0;
    if (!quiet) K.sfx.play('whoosh');
    hush();
  }

  // ---------- pause / level select ----------
  function pause() {
    if (state === 'clear' || state === 'fail') return;
    paused = true; hush();
    var inEx = mode === 'explore';
    K.ui.sheet({ title: 'Paused', text: inEx ? 'Exploring the Solar System' : LV.worlds[world].name + ' · Level ' + level, buttons: [
      { label: inEx ? 'Keep Exploring' : 'Resume', icon: 'play', primary: true, onClick: resume },
      { label: 'Restart', icon: 'restart', row: true, onClick: function () { paused = false; startLevel(level); } },
      { label: 'Levels', icon: 'levels', row: true, onClick: openLevels },
      { label: inEx ? 'Back to the Game' : 'Explore', icon: inEx ? 'next' : null, onClick: function () { paused = false; if (inEx) exitExplore(); else enterExplore(); } },
      { label: K.sfx.muted ? 'Sound: Off' : 'Sound: On', icon: K.sfx.muted ? 'soundOff' : 'sound', onClick: function () { K.sfx.toggle(); if (K.sfx.muted) hush(); pause(); } }] });
  }
  function resume() { paused = false; if (mode === 'level' && state === 'ask') say(lastSaid); }
  function openLevels() {
    paused = true; hush();
    K.ui.levelSelect({
      title: 'Solar System',
      worlds: LV.worlds.map(function (w, i) { return { name: w.name, color: w.color, from: i * 5 + 1, to: i * 5 + 5 }; }),
      progress: progress, current: level,
      onPick: function (n) { startLevel(n); },
      onClose: function () { paused = false; if (state === 'clear' || state === 'fail') startLevel(progress.current()); }
    });
  }

  // ---------- input: drag to turn, pinch to zoom (canvas only), tap a planet ----------
  var drag = null, touches = {}, pinch = null, hadPinch = false;
  K.pointer(canvas, function (x, y) { return { x: x, y: y }; }, {
    down: function (p) {
      if (pinch) return;
      drag = { x0: p.sx, y0: p.sy, lx: p.sx, ly: p.sy, t0: performance.now(), moved: false, vx: 0, vy: 0, lt: performance.now() };
      cam.vyaw = cam.velev = 0; cam.touching = true; cam.idle = 0;
    },
    move: function (p) {
      if (!drag || pinch || hadPinch) return;
      var dx = p.sx - drag.lx, dy = p.sy - drag.ly, now = performance.now();
      drag.lx = p.sx; drag.ly = p.sy;
      if (!drag.moved && Math.hypot(p.sx - drag.x0, p.sy - drag.y0) > 12) drag.moved = true;
      if (!drag.moved) return;
      var r = turn(dx, dy), dt = Math.max(0.008, (now - drag.lt) / 1000);
      drag.lt = now; drag.vx = drag.vx * 0.6 + r[0] / dt * 0.4; drag.vy = drag.vy * 0.6 + r[1] / dt * 0.4;
    },
    up: function (p) {
      cam.touching = false;
      var d = drag; drag = null;
      if (hadPinch) { if (!Object.keys(touches).length) hadPinch = false; return; }
      if (!d) return;
      if (!d.moved) tap(p.sx, p.sy); // slow presses count too: small hands press slowly
      else if (d.moved) { cam.vyaw = K.clamp(d.vx, -4, 4); cam.velev = K.clamp(d.vy, -2, 2); }
    }
  });
  // drag in screen px -> yaw/elevation change (undoing the portrait roll so it always feels like turning a disc)
  function turn(dx, dy) {
    var c = Math.cos(-G.roll), s = Math.sin(-G.roll), ux = dx * c - dy * s, uy = dx * s + dy * c, k = 2.4 / G.minDim;
    var dyaw = ux * k, del = uy * k * 0.8;
    cam.yaw += dyaw; cam.elev = K.clamp(cam.elev + del, 0.17, 1.3);
    return [dyaw, del];
  }
  function onPD(e) {
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    var ids = Object.keys(touches);
    if (ids.length === 2) {
      var a = touches[ids[0]], b = touches[ids[1]];
      pinch = { d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), zm0: cam.zm, c0x: (a.x + b.x) / 2, c0y: (a.y + b.y) / 2, px0: cam.panX, py0: cam.panY, cx: V.cx - cam.panX, cy: V.cy - cam.panY };
      hadPinch = true; drag = null; cam.idle = 0;
    }
  }
  function onPM(e) {
    if (!touches[e.pointerId]) return;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!pinch) return;
    var ids = Object.keys(touches); if (ids.length < 2) return;
    var a = touches[ids[0]], b = touches[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
    var zm = K.clamp(pinch.zm0 * d / pinch.d0, 0.55, 7), ratio = zm / pinch.zm0;
    var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    cam.zm = zm;
    cam.panX = K.clamp(cx - pinch.cx - (pinch.c0x - pinch.cx - pinch.px0) * ratio, -G.maxDim * 2, G.maxDim * 2);
    cam.panY = K.clamp(cy - pinch.cy - (pinch.c0y - pinch.cy - pinch.py0) * ratio, -G.maxDim * 2, G.maxDim * 2);
    cam.idle = 0;
  }
  function onPU(e) {
    delete touches[e.pointerId];
    if (Object.keys(touches).length < 2) pinch = null;
    if (!Object.keys(touches).length) setTimeout(function () { if (!Object.keys(touches).length && !drag) hadPinch = false; }, 0);
  }
  canvas.addEventListener('pointerdown', onPD);
  canvas.addEventListener('pointermove', onPM);
  canvas.addEventListener('pointerup', onPU);
  canvas.addEventListener('pointercancel', onPU);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var old = cam.zm, zm = K.clamp(old * Math.exp(-e.deltaY * 0.0015), 0.55, 7), ratio = zm / old;
    var cx = V.cx - cam.panX, cy = V.cy - cam.panY;
    cam.panX = K.clamp(e.clientX - cx - (e.clientX - cx - cam.panX) * ratio, -G.maxDim * 2, G.maxDim * 2);
    cam.panY = K.clamp(e.clientY - cy - (e.clientY - cy - cam.panY) * ratio, -G.maxDim * 2, G.maxDim * 2);
    cam.zm = zm; cam.idle = 0;
  }, { passive: false });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'p') { if (!document.querySelector('.kit-veil')) pause(); }
    if (e.key === '+' || e.key === '=') cam.zm = K.clamp(cam.zm * 1.2, 0.55, 7);
    if (e.key === '-') cam.zm = K.clamp(cam.zm / 1.2, 0.55, 7);
  });

  function tappable(b) {
    if (mode === 'explore') return true;
    return !b.parent || b.id === 'moon';
  }
  var lastTap = null;
  function tap(x, y) {
    lastTap = [Math.round(x), Math.round(y), paused];
    if (paused) return;
    var best = null, bs = 1, tight = null, tsc = 1;
    BODIES.forEach(function (b) {
      if (!b.vis || !tappable(b)) return;
      var core = b.rpx * (b.ring ? 1.7 : 1), dist = Math.hypot(x - b.sx, y - b.sy);
      var hr = Math.max(core + 6, b.parent ? 24 : 26), d = dist / hr;
      if (d < bs) { bs = d; best = b; }
      var tr = Math.max(core + 4, 16), dt2 = dist / tr; // "really on it"
      if (dt2 < tsc) { tsc = dt2; tight = b; }
    });
    if (best && mode === 'level' && state === 'ask') {
      // A heart is only ever lost for a tap that is really on a wrong planet. A near miss can still find the
      // right answer (generous target), but otherwise it is just a soft tick.
      var ans = BY[answerOf(round)], pick = tight;
      if (!pick && ans.vis && Math.hypot(x - ans.sx, y - ans.sy) < Math.max(ans.rpx * (ans.ring ? 1.7 : 1) + 6, 26)) pick = ans;
      if (!pick) { K.sfx.play('tick'); return; }
      best = pick;
    }
    if (best) { K.sfx.play('blip', { size: Math.min(1, best.r / 0.75) }); tapBody(best); return; }
    // empty space
    if (mode === 'explore' && selected) { unselect(); return; }
    if (state === 'good' && goodT > 0.7) { endGood(); return; }
    K.sfx.play('tick');
  }
  function screenOf(b) { return { x: b.sx || 0, y: b.sy || 0, r: b.rpx || 0 }; }

  // ---------- simulation ----------
  function step(dt) {
    K.fx.update(dt);
    if (paused) return;
    time += dt;
    ambT -= dt; if (ambT <= 0) { ambT = 5.5; K.sfx.play('rumble'); } // very quiet bed of space, overlapping fades
    ts += (tsT - ts) * (1 - Math.exp(-dt * 2));
    simT += dt * ts;
    // camera
    if (!cam.touching) {
      cam.yaw += cam.vyaw * dt; cam.elev = K.clamp(cam.elev + cam.velev * dt, 0.17, 1.3);
      var dmp = Math.exp(-dt * 3.2); cam.vyaw *= dmp; cam.velev *= dmp;
      if (!cam.follow || cam.fk < 0.01) cam.yaw += 0.018 * dt;
      cam.idle += dt;
      if (mode === 'level' && cam.idle > 5 && !pinch) { // drift back to the level's view
        var k = 1 - Math.exp(-dt * 0.8);
        cam.zm += (1 - cam.zm) * k; cam.panX += -cam.panX * k; cam.panY += -cam.panY * k; cam.elev += (G.eDef - cam.elev) * k;
      }
    }
    cam.frameR += (cam.frameRT - cam.frameR) * (1 - Math.exp(-dt * (state === 'settle' ? 5 : 2.5)));
    if (cam.fkT > cam.fk) cam.fk = Math.min(cam.fkT, cam.fk + dt / 1.0);
    else if (cam.fkT < cam.fk) { cam.fk = Math.max(cam.fkT, cam.fk - dt / 0.9); if (cam.fk === 0) cam.follow = null; }
    if (cam.follow && cam.fkT === 0 && cam.fk === 0) cam.follow = null;
    BODIES.forEach(function (b) { if (b.bounceT != null) b.bounceT += dt; if (b.wobT != null) b.wobT += dt; });
    if (round && round.pulse != null) round.pulse += dt;
    // shooting star now and then
    shootT -= dt;
    if (shootT <= 0) { shootT = 7 + Math.random() * 9; shooting = { x: Math.random(), y: Math.random() * 0.5, a: 2.4 + Math.random() * 0.5, t: 0 }; K.sfx.play('shoot'); }
    if (shooting) { shooting.t += dt; if (shooting.t > 0.9) shooting = null; }
    if (mode !== 'level') return;
    if (state === 'banner') { bannerT -= dt; if (bannerT <= 0) nextRound(); }
    else if (state === 'settle') settleStep(dt);
    else if (state === 'good') { goodT += dt; if (goodT > 3.4) endGood(); }
  }

  // ---------- drawing ----------
  var ambT = 0.5, P3 = [0, 0, 0], frameMs = 0, slowFrames = 0, rocks = [];
  (function () {
    var r = A.rng(99);
    for (var i = 0; i < 560; i++) {
      var rad = 4.3 + (r() + r()) * 0.33;
      rocks.push({ a: r() * TAU, r: rad, y: (r() - 0.5) * 0.14, w: TAU / (40 * Math.pow(rad / 3.15, 1.5)), s: 0.012 + r() * r() * 0.05, v: (r() * 6) | 0, t: 0.55 + r() * 0.45 });
    }
  })();

  // ---------- the far sky ----------
  // The background gradient and the Milky Way don't change from frame to frame apart from the sky's slow scroll, so
  // they are no longer re-rendered every frame: each is kept in a canvas on the stage's pixel grid and copied in 1:1
  // (a plain copy on whole device pixels, no resampling).
  var bgC = null;
  function bgLayer(d, w, h) { // the gradient, painted once per screen size with the same calls as before
    var cw = canvas.width, ch = canvas.height, key = cw + 'x' + ch + ':' + w + 'x' + h + ':' + d;
    if (!bgC || bgC.key !== key) {
      var c = bgC && bgC.c.width === cw && bgC.c.height === ch ? bgC.c : A.canvas(cw, ch), g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
      g.setTransform(d, 0, 0, d, 0, 0);
      var bg = g.createLinearGradient(0, 0, w * 0.3, h);
      bg.addColorStop(0, '#060718'); bg.addColorStop(0.55, '#0a0a26'); bg.addColorStop(1, '#120c2c');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      bgC = { c: c, key: key };
    }
    return bgC.c;
  }
  function drawFarSky(d, w, h, sx, sy) {
    var cw = canvas.width, ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bgLayer(d, w, h), 0, 0);
    ctx.drawImage(skyPano, -sx - panoT.ax, -sy - panoT.ay, cw, ch, 0, 0, cw, ch);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  // The Milky Way panorama is a small image blown up ~12x (and turned a quarter on portrait phones): resampling it
  // was most of the frame. It is rendered in 256 px tiles fixed to the panorama (same transform, same 0.95 alpha,
  // same pixels), the tiles are copied into a buffer that covers the screen plus a margin, and each frame copies the
  // screen's part of the buffer, offset by the sky's scroll rounded to whole device pixels. Past the margin the
  // buffer's pixels are moved over (a plain copy) and the strip that comes into view is filled from the tiles; only
  // a ring of tiles around the buffer is kept, made ahead of time, two a frame.
  var skyPano = A.canvas(1, 1);
  var TILE = 256, MARGIN = 128, panoT = { key: '', tiles: new Map(), spare: [], ax: 0, ay: 0 };
  function panoTile(ti, tj, d, w, h, vw, vh, S) {
    var id = ti + ',' + tj, t = panoT.tiles.get(id);
    if (t) { panoT.tiles.delete(id); panoT.tiles.set(id, t); return t; } // most recently used goes last
    // which copies of the (horizontally repeating) panorama touch this tile? (tile corners back to sky space)
    var c = Math.cos(G.roll), s = Math.sin(G.roll), umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (var q = 0; q < 4; q++) {
      var X = ((q & 1) ? ti + 1 : ti) * TILE / d - w / 2, Y = ((q & 2) ? tj + 1 : tj) * TILE / d - h / 2;
      var u = c * X + s * Y + vw / 2, v = -s * X + c * Y + vh / 2;
      if (u < umin) umin = u; if (u > umax) umax = u; if (v < vmin) vmin = v; if (v > vmax) vmax = v;
    }
    t = { c: null };
    if (vmax >= -2 && vmin <= S.SH + 2) {
      var cv = panoT.spare.pop() || A.canvas(TILE, TILE), g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, TILE, TILE);
      g.setTransform(d, 0, 0, d, -ti * TILE, -tj * TILE);
      g.translate(w / 2, h / 2); g.rotate(G.roll); g.translate(-vw / 2, -vh / 2);
      g.globalAlpha = 0.95;
      for (var k = Math.floor((umin - 2) / S.SW); k <= Math.floor((umax + 2) / S.SW); k++) g.drawImage(S.pano, 0, 0, S.pw, S.ph, k * S.SW, 0, S.SW, S.SH);
      g.globalAlpha = 1;
      t.c = cv;
    }
    panoT.tiles.set(id, t);
    if (panoT.tiles.size > panoT.max) {
      var old = panoT.tiles.keys().next().value, ot = panoT.tiles.get(old);
      panoT.tiles.delete(old); if (ot.c) panoT.spare.push(ot.c);
    }
    return t;
  }
  function drawPano(d, w, h, vw, vh, S, oxU, oy) {
    var cw = canvas.width, ch = canvas.height, LW = cw + 2 * MARGIN, LH = ch + 2 * MARGIN;
    var key = cw + 'x' + ch + ':' + w + 'x' + h + ':' + d + ':' + G.roll + ':' + S.SW + 'x' + S.SH;
    if (panoT.key !== key || panoT.sky !== S) {
      panoT.tiles.forEach(function (t) { if (t.c) panoT.spare.push(t.c); });
      panoT.tiles.clear(); panoT.key = key; panoT.sky = S; panoT.ax = null;
      skyPano.width = LW; skyPano.height = LH;
      panoT.max = 2 * (Math.ceil(LW / TILE) + Math.ceil(LH / TILE)) + 24; // a ring around the buffer, and some
    }
    // device-pixel offset of the panorama for this scroll: -(dpr * rotate(roll)) * (ox, oy), rounded. Device pixel
    // p shows the panorama's pixel p - (sx, sy) (in the tiles' fixed grid).
    var c = Math.cos(G.roll), s = Math.sin(G.roll);
    var sx = Math.round(-d * (c * oxU - s * oy)), sy = Math.round(-d * (s * oxU + c * oy));
    var ax = panoT.ax, ay = panoT.ay; // the sky canvas holds grid pixels [ax, ax + LW) x [ay, ay + LH)
    if (ax === null || -sx < ax || -sx + cw > ax + LW || -sy < ay || -sy + ch > ay + LH) {
      var oax = ax, oay = ay, g = skyPano.getContext('2d');
      ax = panoT.ax = -sx - MARGIN; ay = panoT.ay = -sy - MARGIN;
      g.setTransform(1, 0, 0, 1, 0, 0);
      var keep = oax !== null && Math.abs(ax - oax) < LW && Math.abs(ay - oay) < LH;
      if (keep) { g.globalCompositeOperation = 'copy'; g.drawImage(skyPano, oax - ax, oay - ay); g.globalCompositeOperation = 'source-over'; }
      for (var i = Math.floor(ax / TILE); i <= Math.floor((ax + LW - 1) / TILE); i++)
        for (var j = Math.floor(ay / TILE); j <= Math.floor((ay + LH - 1) / TILE); j++) {
          var X0 = i * TILE - ax, Y0 = j * TILE - ay;
          // tiles wholly inside what was already there are in place; the rest are (re)drawn
          if (keep && i * TILE >= oax && (i + 1) * TILE <= oax + LW && j * TILE >= oay && (j + 1) * TILE <= oay + LH) continue;
          g.clearRect(X0, Y0, TILE, TILE);
          var t = panoTile(i, j, d, w, h, vw, vh, S);
          if (t.c) g.drawImage(t.c, X0, Y0);
        }
    }
    panoT.sx = sx; panoT.sy = sy;
    // make the ring of tiles just outside the sky canvas ahead of time, a couple a frame
    var made = 0, i0 = Math.floor(ax / TILE), i1 = Math.floor((ax + LW - 1) / TILE), j0 = Math.floor(ay / TILE), j1 = Math.floor((ay + LH - 1) / TILE);
    for (i = i0 - 1; i <= i1 + 1 && made < 2; i++) for (j = j0 - 1; j <= j1 + 1 && made < 2; j++) {
      if (i >= i0 && i <= i1 && j >= j0 && j <= j1) continue;
      if (!panoT.tiles.has(i + ',' + j)) { panoTile(i, j, d, w, h, vw, vh, S); made++; }
    }
  }

  var STAR_COLS = ['#ffffff', '#bcd2ff', '#ffd9b0'];
  function drawSky(d) {
    var w = G.w, h = G.h;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    var rolled = G.roll !== 0, vw = rolled ? h : w, vh = rolled ? w : h, S = sky;
    // parallax: the far sky slides a little as the camera flies away from the Sun
    var sun = project(0, 0, 0, P3), px = (sun[0] - G.cx0) * 0.035, py = (sun[1] - G.cy0) * 0.035;
    var c = Math.cos(-G.roll), s = Math.sin(-G.roll), qx = px * c - py * s, qy = px * s + py * c;
    var K1 = G.K1, ox = ((-cam.yaw * K1 - qx) % S.SW + S.SW) % S.SW;
    var oy = K.clamp((S.SH - vh) / 2 - (cam.elev - G.eDef) * K1 * 0.9 - qy, 0, S.SH - vh);
    drawPano(d, w, h, vw, vh, S, -cam.yaw * K1 - qx, oy);
    drawFarSky(d, w, h, panoT.sx, panoT.sy);
    ctx.save();
    ctx.translate(w / 2, h / 2); ctx.rotate(G.roll); ctx.translate(-vw / 2, -vh / 2);
    // faint stars, grouped by colour
    var cols = STAR_COLS;
    for (var ci = 0; ci < 3; ci++) {
      ctx.fillStyle = cols[ci];
      for (var i = 0; i < S.stars.length; i++) {
        var st = S.stars[i]; if (st.c !== cols[ci]) continue;
        var X = st.x - ox; if (X < 0) X += S.SW; if (X > vw) continue;
        var Y = st.y - oy; if (Y < 0 || Y > vh) continue;
        ctx.globalAlpha = st.a * (0.75 + 0.25 * Math.sin(time * st.tw + st.ph));
        ctx.fillRect(X - st.s / 2, Y - st.s / 2, st.s, st.s);
      }
    }
    // bright stars: a nearer layer that moves a touch more (parallax)
    var ox2 = ((-cam.yaw * K1 * 1.18 - qx * 2.2) % S.SW + S.SW) % S.SW, oy2 = oy - qy * 1.2;
    for (i = 0; i < S.bright.length; i++) {
      st = S.bright[i];
      X = st.x - ox2; if (X < 0) X += S.SW; if (X > vw + 10) continue;
      Y = st.y - oy2; if (Y < -10 || Y > vh + 10) continue;
      var tw = 0.65 + 0.35 * Math.sin(time * st.tw * 1.3 + st.ph), sz = st.s * 4.2 * (0.85 + 0.15 * tw);
      ctx.globalAlpha = st.a * tw;
      ctx.drawImage(A.starSprite(st.c), X - sz / 2, Y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (shooting) {
      var u = shooting.t / 0.9, sx = shooting.x * w + Math.cos(shooting.a) * u * 260, sy = shooting.y * h + Math.sin(shooting.a) * u * 260;
      var gr = ctx.createLinearGradient(sx, sy, sx - Math.cos(shooting.a) * 90, sy - Math.sin(shooting.a) * 90);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.8 * (1 - u)) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(shooting.a) * 90, sy - Math.sin(shooting.a) * 90); ctx.stroke();
    }
  }

  // Each orbit is a 120-sided polygon fixed in the world. Its points are projected once a frame (shared by the back
  // and front halves), and runs of sides lying wholly off screen (with a margin wider than any join) are skipped:
  // they could never touch a visible pixel.
  var orbPts = {}, orbFrame = 0, ORB_M = 64;
  function orbitPath(R, sunD, front) {
    var N = 120, P = orbPts[R];
    if (!P || P.f !== orbFrame) {
      if (!P) P = orbPts[R] = { f: -1, a: new Float64Array((N + 1) * 3) };
      for (var i = 0; i <= N; i++) {
        var a = i / N * TAU, p = project(Math.cos(a) * R, 0, -Math.sin(a) * R, P3);
        P.a[i * 3] = p[0]; P.a[i * 3 + 1] = p[1]; P.a[i * 3 + 2] = p[2];
      }
      P.f = orbFrame;
    }
    var A3 = P.a, x0 = -ORB_M, y0 = -ORB_M, x1 = G.w + ORB_M, y1 = G.h + ORB_M, prevIn = false, down = false;
    ctx.beginPath();
    for (i = 0; i <= N; i++) {
      var x = A3[i * 3], y = A3[i * 3 + 1], inFront = A3[i * 3 + 2] >= sunD;
      if (inFront === front) {
        if (prevIn) {
          var px = A3[i * 3 - 3], py = A3[i * 3 - 2];
          if ((x < x0 && px < x0) || (x > x1 && px > x1) || (y < y0 && py < y0) || (y > y1 && py > y1)) down = false;
          else { if (!down) ctx.moveTo(px, py); ctx.lineTo(x, y); down = true; }
        }
        prevIn = true;
      } else { prevIn = false; down = false; }
    }
  }
  function drawOrbits(sunD, front) {
    ctx.lineWidth = 1.2;
    SB.planets.forEach(function (id) {
      var b = BY[id], hi = (selected === b) || (round && state === 'ask' && round.hint && answerOf(round) === id);
      ctx.strokeStyle = hi ? 'rgba(246,196,83,' + (front ? 0.55 : 0.35) + ')' : 'rgba(150,180,255,' + (front ? 0.2 : 0.12) + ')';
      orbitPath(b.orbit, sunD, front); ctx.stroke();
    });
  }

  function spriteFor(b, D) {
    b.sprs = b.sprs || {};
    if (!b.sprs[D]) {
      var keys = Object.keys(b.sprs);
      if (keys.length >= 2) delete b.sprs[keys[0]];
      b.sprs[D] = A.newSprite(D);
    }
    return b.sprs[D];
  }

  // The Sun's glow, bloom and two turning ray layers: big 'lighter' sprites, resampled every frame before. Each is
  // now pre-drawn at its on-screen size (same sprite, same scale and turn) and copied 1:1, centred on the nearest
  // device pixel, with the same alpha and blend. The rays turn slowly: their copy is re-drawn each time the turn has
  // moved the outer tips by one device px (so they are never more than half a pixel off), and the next step is
  // prepared ahead a band at a time so no single frame pays for a whole re-draw. While zooming (size changing every
  // frame) the rays are drawn directly, exactly as before, and the round glows use fxMirror.
  var sunFx = { glow: {}, ray1: {}, ray2: {}, bloom: {} }, FX_MAX = 1600, FX_BANDS = 3;
  function fxPaint(c, img, D, turn, y0, y1) { // draw rows [y0, y1) of a copy
    var N = c.width, g = c.getContext('2d'), part = y0 > 0 || y1 < N;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (part) { g.save(); g.beginPath(); g.rect(0, y0, N, y1 - y0); g.clip(); }
    g.clearRect(0, y0, N, y1 - y0);
    g.translate(N / 2, N / 2); if (turn) g.rotate(turn);
    g.drawImage(img, -D / 2, -D / 2, D, D);
    if (part) g.restore();
  }
  // While zooming, a round glow (the same in all four quarters) is drawn into one quarter at this frame's size and
  // copied out four times, flipped (whole pixels, so a plain copy): a quarter of the resampling.
  function fxMirror(slot, img, m, x, y, D) {
    var Q = Math.ceil(D / 2) + 2;
    if (2 * Q > FX_MAX) return false;
    if (!slot.qc || slot.qc.width !== Q) slot.qc = A.canvas(Q, Q);
    var g = slot.qc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, Q, Q);
    g.drawImage(img, Q - D / 2, Q - D / 2, D, D);
    var cx = Math.round(m.a * x + m.e), cy = Math.round(m.d * y + m.f);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    for (var k = 0; k < 4; k++) { ctx.setTransform(k & 1 ? -1 : 1, 0, 0, k & 2 ? -1 : 1, cx, cy); ctx.drawImage(slot.qc, -Q, -Q); }
    ctx.restore();
    return true;
  }
  // The copy is drawn with the current alpha and blend. dir: +1/-1, which way the turn is going (to prepare the
  // next step).
  function fxBlit(slot, img, x, y, size, ang, dir) {
    var m = ctx.getTransform();
    if (m.b || m.c) return false;
    var D = size * m.a, prev = slot.prev; slot.prev = D;
    var same = slot.c && Math.abs(D - slot.D) <= 1;   // within 1 px across (half a pixel at the edge)
    var Dr = same ? slot.D : D, n = ang == null ? 0 : Math.round(ang / (2 / Dr)); // turn steps of 1 px at the tips
    if (!same || n !== slot.n) {
      if (prev == null || Math.abs(D - prev) > 1) return ang == null ? fxMirror(slot, img, m, x, y, D) : false; // zooming
      var N = 2 * Math.ceil(Dr / 2) + 4, nx = slot.nx;
      if (N > FX_MAX) return false;
      if (same && nx && nx.n === n && nx.D === slot.D && nx.c.width === slot.c.width) { // prepared ahead: finish and swap
        if (nx.row < N) fxPaint(nx.c, img, slot.D, n * 2 / slot.D, nx.row, N);
        var t = slot.c; slot.c = nx.c; nx.c = t; nx.n = null;
      } else {
        if (!slot.c || slot.c.width !== N) slot.c = A.canvas(N, N);
        fxPaint(slot.c, img, Dr, n * 2 / Dr, 0, N);
        slot.D = Dr; if (nx) nx.n = null;
      }
      slot.n = n;
    }
    if (dir) { // prepare the next turn step, a band of rows per frame
      var NN = slot.c.width, tn = slot.n + dir;
      nx = slot.nx || (slot.nx = { c: null, n: null, D: 0, row: 0 });
      if (nx.n !== tn || nx.D !== slot.D || !nx.c || nx.c.width !== NN) {
        if (!nx.c || nx.c.width !== NN) nx.c = A.canvas(NN, NN);
        nx.n = tn; nx.D = slot.D; nx.row = 0;
      }
      if (nx.row < NN) { var y1 = Math.min(NN, nx.row + Math.ceil(NN / FX_BANDS)); fxPaint(nx.c, img, slot.D, tn * 2 / slot.D, nx.row, y1); nx.row = y1; }
    }
    var cx = m.a * x + m.e, cy = m.d * y + m.f, h = slot.c.width / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(slot.c, Math.round(cx) - h, Math.round(cy) - h);
    ctx.setTransform(m);
    return true;
  }

  function drawBody(b) {
    var x = b.sx, y = b.sy, R = b.rpx, spr = b.spr;
    if (!spr) return;
    var sq = 1, wob = 0;
    if (b.bounceT != null && b.bounceT < 1.2) sq = 1 + 0.2 * Math.exp(-b.bounceT * 4) * Math.sin(b.bounceT * 16);
    if (b.wobT != null && b.wobT < 0.8) wob = Math.max(4, R * 0.25) * Math.exp(-b.wobT * 5) * Math.sin(b.wobT * 34);
    x += wob;
    var rx = R * sq, ry = R / Math.sqrt(sq);
    if (b === SUN) {
      ctx.globalCompositeOperation = 'lighter';
      var gs = R * 7.5; ctx.globalAlpha = 0.9;
      if (!fxBlit(sunFx.glow, A.sunGlow(), x, y, gs, null)) ctx.drawImage(A.sunGlow(), x - gs / 2, y - gs / 2, gs, gs);
      var ra = 0.5 + 0.08 * Math.sin(time * 1.3), rs = R * 5.2, rs2 = R * 4.2;
      ctx.globalAlpha = ra; var ok1 = fxBlit(sunFx.ray1, A.sunRays(), x, y, rs, time * 0.04, 1);
      ctx.globalAlpha = 0.3; var ok2 = fxBlit(sunFx.ray2, A.sunRays(), x, y, rs2, time * 0.04 - time * 0.09, -1);
      if (!ok1 || !ok2) { // zooming: draw them as before
        ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.04); ctx.globalAlpha = ra;
        if (!ok1) ctx.drawImage(A.sunRays(), -rs / 2, -rs / 2, rs, rs);
        ctx.rotate(-time * 0.09); ctx.globalAlpha = 0.3; if (!ok2) ctx.drawImage(A.sunRays(), -rs2 / 2, -rs2 / 2, rs2, rs2);
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    } else if (b.halo && R > 3) {
      var L = b.L, hx = x + L[0] * R * 0.08, hy = y + L[1] * R * 0.08;
      var hg = ctx.createRadialGradient(hx, hy, R * 0.92, hx, hy, R * 1.22);
      var lit = 0.35 + 0.4 * Math.max(0, L[2] + 0.5);
      hg.addColorStop(0, 'rgba(' + b.halo + ',' + (0.42 * lit) + ')'); hg.addColorStop(1, 'rgba(' + b.halo + ',0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, R * 1.22, 0, TAU); ctx.fill();
    }
    if (b.ring) A.drawRing(ctx, x, y, R * sq, b.basis, b.L, 'back');
    var D = spr.D, k = (D / 2) / (D / 2 - 1);
    ctx.drawImage(spr.canvas, x - rx * k, y - ry * k, rx * 2 * k, ry * 2 * k);
    if (b.ring) A.drawRing(ctx, x, y, R * sq, b.basis, b.L, 'front');
    if (b === SUN) { // bloom over the disc edge
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
      var bs = R * 2.9; if (!fxBlit(sunFx.bloom, A.sunGlow(), x, y, bs, null)) ctx.drawImage(A.sunGlow(), x - bs / 2, y - bs / 2, bs, bs);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawRocks(list) {
    var rk = A.rocks();
    ctx.fillStyle = '#b8a894'; // (drawImage below doesn't touch it, so set it once)
    for (var i = 0; i < list.length; i++) {
      var q = list[i], sz = q.sz;
      if (sz < 2.4) { ctx.globalAlpha = q.t * 0.85; ctx.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz); continue; }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.ang);
      ctx.drawImage(rk[q.v], -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function draw(alpha, frameDt) {
    var d = G.dpr, w = G.w, h = G.h, t0 = performance.now();
    orbFrame++;
    computeView();
    drawSky(d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    var sh = K.fx.offset(); if (sh.x || sh.y) ctx.translate(sh.x, sh.y);

    // place every body on screen
    var items = [], sunP = project(0, 0, 0, [0, 0, 0]);
    BODIES.forEach(function (b) {
      var wp = bodyWorld(b, V.s, b.wp || (b.wp = [0, 0, 0]));
      var p = project(wp[0], wp[1], wp[2], b.sp || (b.sp = [0, 0, 0]));
      b.sx = p[0]; b.sy = p[1]; b.sd = p[2];
      b.rpx = b.r * V.s * V.b;
      var ext = b.rpx * (b === SUN ? 4 : b.ring ? 2.4 : 1.3);
      b.vis = b.sx > -ext && b.sx < w + ext && b.sy > -ext && b.sy < h + ext && b.rpx > 0.6;
      if (b !== SUN) { // light from the Sun, nudged a little toward the viewer so near-side planets still read as lit
        var ln = Math.hypot(wp[0], wp[1], wp[2]) || 1, Lr = rotDir(-wp[0] / ln, -wp[1] / ln, -wp[2] / ln);
        Lr[2] += 0.85; var ll = Math.hypot(Lr[0], Lr[1], Lr[2]) || 1; b.L = [Lr[0] / ll, Lr[1] / ll, Lr[2] / ll];
      }
      if (b.vis) items.push({ d: b.sd, b: b });
    });
    // textures: fill a few rows per frame, nearest/biggest first
    var budget = time < 1 ? 14 : 7, vis = items.map(function (it) { return it.b; }).sort(function (a, c) { return c.rpx - a.rpx; });
    for (var i = 0; i < vis.length && budget > 0; i++) {
      var tx = SB.texture(vis[i]); if (tx.ready) continue;
      var tt = performance.now(); A.pumpTexture(tx, budget); budget -= performance.now() - tt;
    }
    if (budget > 2) for (i = 0; i < BODIES.length && budget > 2; i++) { tx = SB.texture(BODIES[i]); if (!tx.ready) { tt = performance.now(); A.pumpTexture(tx, budget); budget -= performance.now() - tt; } }
    for (i = pics.length - 1; i >= 0; i--) if (pics[i].b.texture && pics[i].b.texture.ready) { paintPic(pics[i]); pics.splice(i, 1); }
    // sphere sprites: re-light the stale ones, within a per-frame pixel budget
    var pixLeft = 260000;
    vis.forEach(function (b) {
      var need = Math.ceil(b.rpx * 2 * d) + 2, D = A.spriteSize(need, G.cap), spr = spriteFor(b, D);
      var age = time - spr.t, minAge = D <= 64 ? 0.03 : D <= 160 ? 0.03 : 0.045;
      var fresh = spr.t >= 0 && age < minAge && spr.L && Math.abs(spr.L[0] - (b.L ? b.L[0] : 0)) + Math.abs(spr.L[1] - (b.L ? b.L[1] : 0)) < 0.01;
      if ((spr.t < 0 || !fresh) && (pixLeft > 0 || spr.t < 0 || age > 0.25)) {
        var tx2 = SB.texture(b), spin = time / b.spin * tx2.w;
        A.renderSphere(spr, b, b.L || [0, 0, 1], spin, spin * 0.8 + 37, time);
        spr.t = time; spr.L = b.L ? b.L.slice() : null; pixLeft -= D * D * 0.8;
      }
      if (spr.t >= 0) b.spr = spr;
    });

    // asteroid belt
    var rockItems = [[], [], [], [], [], []], sunAng = 0;
    for (i = 0; i < rocks.length; i++) {
      var q = rocks[i], a = q.a + simT * q.w, wx = Math.cos(a) * q.r, wz = -Math.sin(a) * q.r;
      var rp = project(wx, q.y, wz, P3);
      if (rp[0] < -20 || rp[0] > w + 20 || rp[1] < -20 || rp[1] > h + 20) continue;
      q.x = rp[0]; q.y2 = rp[1];
      var bi = K.clamp(Math.floor((rp[2] / 5 + 1) * 3), 0, 5);
      sunAng = Math.atan2(sunP[1] - rp[1], sunP[0] - rp[0]);
      rockItems[bi].push({ x: rp[0], y: rp[1], sz: Math.max(1, q.s * V.s * 1.0), v: q.v, t: q.t, ang: sunAng });
    }
    rockItems.forEach(function (list, bi) { if (list.length) items.push({ d: (bi / 3 - 1) * 5 + 0.8, rocks: list }); });
    items.push({ d: sunP[2] + 1e-4, orbitsFront: true });
    items.sort(function (a, c) { return a.d - c.d; });

    drawOrbits(sunP[2], false);
    items.forEach(function (it) {
      if (it.b) drawBody(it.b);
      else if (it.rocks) drawRocks(it.rocks);
      else drawOrbits(sunP[2], true);
    });

    // round highlights: the glowing choices, and a helping glow after mistakes
    if (mode === 'level' && round && (state === 'ask')) {
      var ch = choices();
      if (ch) ch.forEach(function (id, j) { var b = BY[id]; if (b.vis && !round.out[id]) ring(b, '#f6c453', j); });
      if (round.hint) { var tb = BY[answerOf(round)]; if (tb.vis) ring(tb, '#ffffff', 0, true); }
    }
    // names while exploring
    if (mode === 'explore') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      BODIES.forEach(function (b) {
        if (!b.vis || (b.parent && b.rpx < 5 && selected !== b)) return;
        var pa = b.parent && BY[b.parent];
        if (pa && b.sd < pa.sd && Math.hypot(b.sx - pa.sx, b.sy - pa.sy) < pa.rpx) return; // hidden behind its planet
        var fs = b.parent ? 12 : 14, y = b.sy + b.rpx * (b.ring ? 1.0 : 1) + 6;
        ctx.font = '800 ' + fs + 'px Nunito, system-ui, sans-serif';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,5,20,.75)'; ctx.strokeText(cap(b.short), b.sx, y);
        ctx.fillStyle = selected === b ? '#ffe39a' : 'rgba(255,250,240,.92)'; ctx.fillText(cap(b.short), b.sx, y);
      });
    }
    K.fx.draw(ctx);
    if (state === 'banner' && mode === 'level') drawBanner();

    // keep the frame cheap on slower devices: smaller sphere sprites if drawing is slow
    var ms = performance.now() - t0; frameMs = frameMs * 0.9 + ms * 0.1;
    if (frameMs > 14 && G.cap > 192) { if (++slowFrames > 40) { G.cap = G.cap > 320 ? 320 : G.cap > 256 ? 256 : 192; slowFrames = 0; } } else slowFrames = 0;
  }

  function ring(b, col, j, soft) {
    var r = Math.max(b.rpx * (b.ring ? 2.35 : 1) + 9, 22), t = time + j * 0.4;
    ctx.save(); ctx.translate(b.sx, b.sy);
    if (soft) {
      var pr = r + 6 + 6 * Math.sin(time * 5);
      var g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, pr + 10);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, pr + 10, 0, TAU); ctx.fill();
    } else {
      var pulse = 1 + 0.06 * Math.sin(t * 4);
      ctx.rotate(t * 0.6); ctx.scale(pulse, pulse);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([9, 7]); ctx.lineCap = 'round';
      ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      for (var i = 0; i < 4; i++) { ctx.fillStyle = col; A.star8(ctx, Math.cos(i * Math.PI / 2) * r, Math.sin(i * Math.PI / 2) * r, 5, 0.5); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawBanner() {
    var tot = level === 1 ? 3.2 : 2.2, k = Math.min(1, bannerT / 0.4, (tot - bannerT) / 0.35), W = LV.worlds[world];
    var cx = G.w / 2, cy = G.ay + G.ah * 0.22, big = Math.min(64, G.minDim * 0.14);
    ctx.globalAlpha = Math.max(0, k);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.font = '800 ' + Math.round(big * 0.4) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(5,5,20,.7)';
    ctx.strokeText(W.name.toUpperCase(), cx, cy - big * 0.75); ctx.fillStyle = W.color; ctx.fillText(W.name.toUpperCase(), cx, cy - big * 0.75);
    ctx.font = '900 ' + Math.round(big) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 10;
    ctx.strokeText('Level ' + level, cx, cy); ctx.fillStyle = '#fffaf0'; ctx.fillText('Level ' + level, cx, cy);
    if (level === 1) {
      ctx.font = '800 ' + Math.round(Math.max(15, big * 0.3)) + 'px Nunito, system-ui, sans-serif'; ctx.lineWidth = 6;
      var line = 'Allah made the Sun, the Moon and the planets';
      ctx.strokeText(line, cx, cy + big * 0.78); ctx.fillStyle = '#ffe9b0'; ctx.fillText(line, cx, cy + big * 0.78);
    }
    ctx.globalAlpha = 1;
  }

  var loop = K.loop({ step: step, draw: draw, hz: 60, onHidden: function () { hush(); if (!DEBUG && !paused && mode === 'level' && state === 'ask') pause(); } });

  // ---------- test hook (?debug): step the game by hand and inspect it ----------
  if (DEBUG) window.SS = {
    run: function (sec) { for (var i = 0; i < Math.round(sec * 60); i++) step(1 / 60); draw(0, 0); },
    draw: function () { draw(0, 0); }, start: startLevel,
    get: function () {
      return { mode: mode, state: state, level: level, world: world, ri: ri, rounds: def ? def.rounds.length : 0, hearts: hearts, mistakes: mistakes,
        round: round ? { t: round.t, id: round.id, ids: round.ids, answer: answerOf(round), hint: !!round.hint } : null,
        stars: progress.stars(level), paused: paused, zm: cam.zm, yaw: cam.yaw, elev: cam.elev, follow: cam.follow ? cam.follow.id : null, fk: cam.fk,
        roll: G.roll, cap: G.cap, touches: Object.keys(touches).length, pinch: !!pinch, hadPinch: hadPinch, drag: !!drag, lastTap: lastTap, frameMs: Math.round(frameMs * 10) / 10, selected: selected ? selected.id : null,
        texReady: BODIES.filter(function (b) { return b.texture && b.texture.ready; }).length };
    },
    screen: function (id) { var b = BY[id]; return { x: b.sx, y: b.sy, r: b.rpx, vis: !!b.vis }; },
    bodies: function () { return BODIES.map(function (b) { return { id: b.id, x: Math.round(b.sx), y: Math.round(b.sy), r: Math.round(b.rpx * 10) / 10, vis: !!b.vis }; }); },
    tap: tap, explore: function (on) { if (on) enterExplore(); else exitExplore(); }, select: function (id) { select(BY[id]); },
    cam: cam, G: G, loop: loop,
    texAll: function () { BODIES.forEach(function (b) { A.pumpTexture(SB.texture(b), 1e9); }); }
  };

  // Fonts load quickly from the local cache; start once they are ready so the banner text is crisp.
  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('900 40px Nunito') : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 700); })]).catch(function () {}).then(function () {
    startLevel(progress.current());
  });
})();
