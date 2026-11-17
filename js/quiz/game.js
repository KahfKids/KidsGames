/* Kahf KidsGames quiz engine: game.js
   Every quiz in the catalog on Phaser 4 (owner, 2026-11-11: every game and every quiz), started by Kit.play.start like
   every game. The rules and the saves are quiz.js (KahfQuiz.model); this file only draws them and takes the child's taps.
   It replaces the DOM engine (quiz.css, the kit's DOM sheets and synthesised sounds) one to one: the same journey map,
   the same six question types, the same sheets, words, saves and bridge calls.

   Scenes: Boot (pictures, fonts, sounds, the one interface atlas) -> Map (the journey) and Play (a stop), with Sheet on
   top: the stack of sheets (who is playing, stickers, lightning round, pause, finished). Only the top sheet takes input
   and the scene under it is paused (game-ui-ux: screens as a stack).

   Layout: a quiz is read and tapped on an upright phone as much as on its side, so it lays itself out in screen points
   (as its DOM page did, CSS px) rather than in the fixed 1920 x 1080 frame: Kit.play.fit gives view.pt (design units per
   point) and each scene has one root container at the view's top-left scaled by it, so everything inside is in points.
   Text is drawn at the kit's pixel density (Text resolution = Kit.play.dpr()), which is exactly one texture pixel per
   screen pixel at that scale, so words stay sharp at any size.
   Art: the pictures are the WebP files in js/quiz/img/ (tools/quiz-art); interface shapes and icons are painted once
   into one atlas (Kit.play.tex) at two pixels per point. Nothing is painted per frame; dashed boxes are painted once per
   size. Rest mode: no endless tween anywhere (the next stop and the tap spots pulse now and then on Kit.play.every), so
   the engine's loop sleeps while a child reads or thinks.
   Sound: recordings through Kit.snd (js/quiz/audio, recipe.json); praise is the kit's recorded Arabic clips. Two things
   stay outside the engine on purpose: a recited ayah plays through one <audio> element (the Kahf bridge counts real
   listening only from media elements, and the bridge is not ours to change), and the youngest band hears questions read
   by the device's own voice (speechSynthesis; the engine has no speech).
   Keys: 1-4 or arrows + Enter answer, Y / N, Enter for next, Esc pauses or closes a sheet, M sound.
   ?debug exposes window.QZT (where to tap, state) for tests. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, K = window.Kit;
  var IMG = '/KidsGames/js/quiz/img/', AUD = '/KidsGames/js/quiz/audio/';
  var FONT = 'Nunito, "Noto Sans Bengali", "Kohinoor Bangla", "Bangla Sangam MN", system-ui, -apple-system, sans-serif';
  var ARABIC = '"Noto Naskh Arabic", "Geeza Pro", "Al Bayan", Amiri, serif';
  var INK = '#2a1c4a', CREAM = '#fffaf0', DIM = 'rgba(255,250,240,0.72)', GOLD = 0xf6c453;
  var GOODC = 0x2fa56a, BADC = 0xe0566b, R = 2;                         // R: atlas pixels per point
  var DEBUG = /[?&]debug\b/.test(location.search);
  var METRICS = {}, fontsReady = false;   // font metrics measured once each, after the web font has loaded
  var M = null, DPR = 1, CONFETTI = [0xf6c453, 0xffe9a8, 0x7fd6c2, 0xff9d7a, 0xffffff];
  var col = function (h) { return Phaser.Display.Color.HexStringToColor(h).color; };
  var reduced = false; try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------------------------------------------------------------- painting (once)
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function starPath(c, cx, cy, ro, ri) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.closePath();
  }
  // icons on a 24 grid (the same drawings as the DOM engine's), white, tinted where they are used
  var ICONS = {
    check: ['M5 12.5l4.5 4.5L19 7.5', 3], cross: ['M6 6l12 12M18 6L6 18', 3], next: ['M5 12h13M13 6l6 6-6 6', 3],
    bulb: ['M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.2h5.2c0-.9.4-1.7 1-2.2A6 6 0 0 0 12 3z', 2.2],
    book: ['M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13', 2.2],
    bolt: ['M13.5 2L5 13.5h5.5L9.5 22 19 10h-5.8z', 0], play: ['M8 5v14l11-7z', 0], pause: ['M7 5h3.5v14H7zM13.5 5H17v14h-3.5z', 0],
    map: ['M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5zM9 4v13.5M15 6.5V20', 2.2],
    restart: ['M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4v4.5H9', 2.6],
    sound: ['M4 9h4l5-4v14l-5-4H4z', 0, 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12', 2.2],
    soundOff: ['M4 9h4l5-4v14l-5-4H4z', 0, 'M16.5 9.5l5 5M21.5 9.5l-5 5', 2.4]
  };
  function icon(c, d, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s / 24, s / 24); c.lineCap = 'round'; c.lineJoin = 'round'; c.fillStyle = c.strokeStyle = '#fff';
    for (var i = 0; i < d.length; i += 2) { var p = new Path2D(d[i]); if (d[i + 1]) { c.lineWidth = d[i + 1]; c.stroke(p); } else c.fill(p); }
    c.restore();
  }
  // the age bands: a sprout, a compass, a mountain flag (no faces); 60 grid
  var BANDS = {
    1: [['M30 54V30', null, '#3c8f52', 5], ['M30 34C18 34 12 26 12 16c12 0 18 8 18 18z', '#6fcf7f'], ['M30 28c0-11 6-18 18-18 0 11-6 18-18 18z', '#9be08f'], ['M14 54a16 4 0 1 0 32 0a16 4 0 1 0-32 0z', '#8a5a2b']],
    2: [['M6 30a24 24 0 1 0 48 0a24 24 0 1 0-48 0z', '#fff3d6', '#c98a2b', 5], ['M38 22l-5 11-11 5 5-11z', '#e0566b'], ['M38 22l-11 5 6 6z', '#3b6fd1'], ['M27.4 30a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0z', '#2a1c4a']],
    3: [['M4 52L24 20l10 14 6-8 16 26z', '#7d6bd6'], ['M24 20l6 8.5-5 3-4-3-3.5 2z', '#fff'], ['M40 26V8', null, '#fff3d6', 3], ['M40 8l13 4.5L40 17z', '#f6c453']]
  };
  function bandIcon(c, b, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s / 60, s / 60); c.lineCap = 'round';
    BANDS[b].forEach(function (p) { var path = new Path2D(p[0]); if (p[1]) { c.fillStyle = p[1]; c.fill(path); } if (p[2]) { c.strokeStyle = p[2]; c.lineWidth = p[3]; c.stroke(path); } });
    c.restore();
  }

  // The interface atlas: every shape and icon on one texture (one draw batch), painted once at R pixels per point.
  // Frames are in atlas pixels; nine-slices are shown at scale 1 / R.
  function atlas(scene, theme) {
    var acc = theme.accent || ['#f6c453', '#e9973a'];
    var items = [], W = 1024, x = 0, y = 0, rowH = 0;
    function add(name, w, h, paint) {                                   // w, h in points
      var pw = Math.ceil(w * R) + 4, ph = Math.ceil(h * R) + 4;
      if (x + pw > W) { x = 0; y += rowH; rowH = 0; }
      items.push({ name: name, x: x + 2, y: y + 2, w: Math.ceil(w * R), h: Math.ceil(h * R), paint: paint });
      x += pw; rowH = Math.max(rowH, ph);
    }
    // answer cards: a 4 pt margin for the ring, a 5 pt edge under the face (CSS: 0 5px 0 edge, 0 0 0 4px ring)
    function cardP(face, edge, ring) {
      return function (c) {
        if (ring) { c.fillStyle = ring; rr(c, 0, 0, 80, 84, 24); c.fill(); }
        c.fillStyle = edge; rr(c, 4, 9, 72, 71, 20); c.fill();
        c.fillStyle = face; rr(c, 4, 4, 72, 71, 20); c.fill();
      };
    }
    add('c-n', 80, 84, cardP(CREAM, '#d9c7a0')); add('c-good', 80, 84, cardP('#dff6e8', '#7fc79f', '#2fa56a'));
    add('c-bad', 80, 84, cardP('#fde3e6', '#e6a3ad', '#e0566b')); add('c-sel', 80, 84, cardP(CREAM, acc[1], acc[0]));
    add('c-lock', 80, 84, cardP('#dff6e8', '#7fc79f'));
    add('glass', 64, 64, function (c) { c.fillStyle = 'rgba(14,10,34,0.42)'; rr(c, 0.5, 0.5, 63, 63, 22); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.stroke(); });
    add('pill', 46, 46, function (c) { c.fillStyle = 'rgba(14,10,34,0.62)'; rr(c, 0.5, 0.5, 45, 45, 22.5); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1; c.stroke(); });
    add('pill40', 40, 40, function (c) { c.fillStyle = 'rgba(14,10,34,0.62)'; rr(c, 0.5, 0.5, 39, 39, 19.5); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1; c.stroke(); });
    add('tag', 26, 26, function (c) { c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 4; c.fillStyle = CREAM; rr(c, 1, 1, 24, 24, 12); c.fill(); });
    add('btn1', 64, 70, function (c) {
      c.fillStyle = '#a8621f'; rr(c, 0, 6, 64, 64, 26); c.fill();
      var g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#ffd978'); g.addColorStop(0.55, '#f6c453'); g.addColorStop(1, '#e9973a');
      c.fillStyle = g; rr(c, 0, 0, 64, 64, 26); c.fill();
    });
    add('btn2', 64, 64, function (c) { c.fillStyle = 'rgba(255,255,255,0.1)'; rr(c, 0.5, 0.5, 63, 63, 24); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1; c.stroke(); });
    add('btnon', 64, 64, function (c) { c.fillStyle = 'rgba(246,196,83,0.16)'; rr(c, 1, 1, 62, 62, 23); c.fill(); c.strokeStyle = acc[0]; c.lineWidth = 2; c.stroke(); });
    add('sheet', 96, 96, function (c) {
      var g = c.createRadialGradient(48, 0, 4, 48, 20, 110); g.addColorStop(0, '#2a2160'); g.addColorStop(1, '#1b1640');
      c.fillStyle = g; rr(c, 1, 1, 94, 94, 28); c.fill(); c.strokeStyle = 'rgba(255,225,160,0.35)'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = 'rgba(255,225,160,0.06)'; c.lineWidth = 6; rr(c, 5, 5, 86, 86, 24); c.stroke();
    });
    add('fb', 64, 64, function (c) { c.fillStyle = CREAM; c.beginPath(); c.moveTo(0, 64); c.lineTo(0, 26); c.arcTo(0, 0, 26, 0, 26); c.lineTo(38, 0); c.arcTo(64, 0, 64, 26, 26); c.lineTo(64, 64); c.closePath(); c.fill(); });
    add('seg', 20, 10, function (c) { c.fillStyle = '#fff'; rr(c, 0, 0, 20, 10, 5); c.fill(); });
    add('px', 4, 4, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 4, 4); });
    add('dot', 8, 8, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(4, 4, 3, 0, 7); c.fill(); });
    add('disc', 64, 64, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill(); });
    add('glow', 120, 120, function (c) { var g = c.createRadialGradient(60, 60, 0, 60, 60, 60); g.addColorStop(0, 'rgba(255,214,120,0.55)'); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.fillRect(0, 0, 120, 120); });
    add('star', 64, 64, function (c) { starPath(c, 32, 33, 30, 13); c.fillStyle = '#f6c453'; c.fill(); c.strokeStyle = '#e9973a'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke(); });
    add('starw', 64, 64, function (c) { starPath(c, 32, 33, 30, 13); c.fillStyle = '#fff'; c.fill(); });
    add('shard', 12, 7, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 12, 7); });
    add('spark', 16, 16, function (c) { starPath(c, 8, 8, 8, 3.4); c.fillStyle = '#fff'; c.fill(); });
    add('badge', 56, 56, function (c) {
      c.translate(28, 28); c.scale(0.52, 0.52);
      var p = new Path2D('M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z');
      c.fillStyle = '#f6c453'; c.fill(p); c.strokeStyle = '#1b1640'; c.lineWidth = 5; c.stroke(p);
      c.fillStyle = '#1b1640'; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill();
    });
    function spotP(fill, ring) { return function (c) { c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = ring; c.beginPath(); c.arc(24, 24, 15, 0, 7); c.fill(); c.shadowColor = 'transparent'; c.fillStyle = fill; c.beginPath(); c.arc(24, 24, 11, 0, 7); c.fill(); }; }
    add('spot', 48, 48, spotP(CREAM, acc[1])); add('spot-good', 48, 48, spotP('#2fa56a', '#fff')); add('spot-bad', 48, 48, spotP('#e0566b', '#fff'));
    Object.keys(ICONS).forEach(function (k) { add('i-' + k, 48, 48, function (c) { var d = ICONS[k]; icon(c, d, 0, 0, 48); }); });
    add('i-exit', 48, 48, function (c) { K.play.exitIcon(c, 48, '#fff', 2.6); });
    [1, 2, 3].forEach(function (b) { add('band' + b, 60, 60, function (c) { bandIcon(c, b, 0, 0, 60); }); });
    var H = y + rowH + 4;
    K.play.tex(scene, 'qz-ui', W, H, function (c) {
      items.forEach(function (it) { c.save(); c.translate(it.x, it.y); c.scale(R, R); it.paint(c); c.restore(); });
    });
    var t = scene.textures.get('qz-ui');
    items.forEach(function (it) { t.add(it.name, 0, it.x, it.y, it.w, it.h); });
  }
  // nine-slice frames: [frame, left, right, top, bottom] in atlas pixels
  var NS = { card: [48, 48, 48, 58], glass: [46, 46, 46, 46], pill: [46, 46, 46, 46], pill40: [40, 40, 40, 40], tag: [26, 26, 26, 26], btn1: [52, 52, 52, 64],
    btn2: [48, 48, 48, 48], btnon: [48, 48, 48, 48], sheet: [60, 60, 60, 60], fb: [56, 56, 56, 8], seg: [10, 10, 9, 9] };   // (seg is not a three-slice: resizing one throws in 4.2.1)
  // a dashed (or solid) box, painted once for each size it is shown at
  function box(scene, w, h, r, o) {
    w = Math.round(w); h = Math.round(h);
    var key = 'qz-box-' + o.k + '-' + w + 'x' + h;
    K.play.tex(scene, key, w * R, h * R, function (c) {
      c.scale(R, R); rr(c, o.lw / 2, o.lw / 2, w - o.lw, h - o.lw, r);
      if (o.fill) { c.fillStyle = o.fill; c.fill(); }
      c.strokeStyle = o.line; c.lineWidth = o.lw; if (o.dash) c.setLineDash(o.dash); c.stroke();
    });
    return key;
  }
  var BOX = {
    bin: { k: 'bin', fill: 'rgba(255,255,255,0.1)', line: 'rgba(255,255,255,0.5)', lw: 3, dash: [9, 7] },
    binGood: { k: 'bing', fill: 'rgba(47,165,106,0.18)', line: '#2fa56a', lw: 3 },
    binBad: { k: 'binb', fill: 'rgba(224,86,107,0.16)', line: '#e0566b', lw: 3, dash: [9, 7] },
    slot: { k: 'slot', line: 'rgba(255,255,255,0.4)', lw: 2, dash: [7, 6] },
    slotFull: { k: 'slotf', fill: 'rgba(47,165,106,0.2)', line: '#2fa56a', lw: 2 }
  };

  // ---------------------------------------------------------------- small building blocks (all in points)
  function ns(scene, frame, w, h) {
    var s = NS[frame] || NS.card, n = scene.add.nineslice(0, 0, 'qz-ui', frame, w * R, h * R, s[0], s[1], s[2], s[3]).setScale(1 / R);
    n.fitTo = function (w2, h2) { n.setSize(w2 * R, h2 * R); return n; };
    return n;
  }
  function ui(scene, frame) { return scene.add.image(0, 0, 'qz-ui', frame).setScale(1 / R); }
  // the widest single word of a string at a font, so a word is never broken across lines (it shrinks to fit instead)
  var measureCtx = null;
  function widestWord(str, font) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = font; var w = 0;
    String(str).split(/\s+/).forEach(function (wd) { if (wd) w = Math.max(w, measureCtx.measureText(wd).width); });
    return w;
  }
  function text(scene, str, size, o) {
    o = o || {};
    var ar = o.ar || (KQ.isArabic(str || '') && !o.latin);
    if (o.wrap && str) { var ww = widestWord(str, (o.weight || 800) + ' ' + Math.round(size * (ar ? 1.3 : 1)) + 'px ' + (ar ? ARABIC : FONT)); if (ww > o.wrap) size = Math.max(11, size * o.wrap / ww * 0.98); }
    var st = { fontFamily: ar ? ARABIC : FONT, fontSize: Math.round(size * (ar ? 1.3 : 1)) + 'px', fontStyle: String(o.weight || 800), color: o.color || CREAM,
      align: o.align || 'center', lineSpacing: o.line == null ? Math.round(size * 0.18) : o.line, resolution: DPR * (scene.tup || 1) };   // (resolution in the style: setResolution afterwards drew every label twice)   // (no rtl: the canvas's own bidi shapes an Arabic run; the engine's rtl drew it off its canvas)
    if (o.wrap) st.wordWrap = { width: o.wrap, useAdvancedWrap: true };
    // The engine measures a font by drawing it and reading the pixels back (MeasureText) for every new Text unless it is
    // given the metrics: measured once per font and size here, then handed over (profiled: the largest cost of a question).
    var mk = st.fontStyle + ' ' + st.fontSize + ' ' + st.fontFamily;
    if (METRICS[mk]) st.metrics = METRICS[mk];
    var t = scene.add.text(0, 0, str || '', st); t.isAr = ar; t.setOrigin(o.ox == null ? 0.5 : o.ox, o.oy == null ? 0.5 : o.oy);
    if (!METRICS[mk] && fontsReady) METRICS[mk] = t.style.getTextMetrics();
    if (o.shadow) t.setShadow(0, 1, 'rgba(0,0,0,0.4)', 2);
    return t;
  }
  // a pressable thing: squash on touch (game-feel: answer at once), the action on release over it
  function press(scene, obj, fn, o) {
    o = o || {};
    obj.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, obj.width, obj.height), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    obj.on('pointerdown', function () {
      if (obj.off_) return;
      if (o.sound !== false) K.snd.play(o.sound || 'tap');
      var base = obj.baseScale || 1; scene.tweens.killTweensOf(obj); obj.setScale(base);
      scene.tweens.add({ targets: obj, scale: base * (o.k || 0.94), duration: 70, yoyo: true });
    });
    obj.on('pointerup', function (p) { if (obj.off_ || (scene.dragged && o.drag)) return; fn(p); });
    return obj;
  }
  // A wait with nothing moving (before the next question, before a voice): a browser timer that wakes the loop when it
  // fires. An engine delayedCall counts as moving, so the loop would redraw the same picture at the screen's rate for
  // the whole wait (measured in the lightning round). Skipped if the scene stopped; cleared when it shuts down.
  function later(scene, ms, fn) {
    var t = setTimeout(function () { if (scene.sys.isActive()) { K.play.wake(); fn(); } }, ms);
    scene.events.once('shutdown', function () { clearTimeout(t); });
  }
  // a pressable container's size and touch area together
  function hitSize(o, w, h) { o.setSize(w, h); if (o.input && o.input.hitArea) o.input.hitArea.setTo(0, 0, w, h); return o; }
  function wobble(scene, obj) {
    scene.tweens.killTweensOf(obj); var x = obj.x;
    scene.tweens.add({ targets: obj, x: { from: x - 9, to: x }, duration: 420, ease: function (t) { return Math.sin(t * 22) * (1 - t) * 0.9 + t; } });
  }
  function shake(scene, obj) {
    var x0 = obj.homeX == null ? (obj.homeX = obj.x) : obj.homeX; scene.tweens.killTweensOf(obj); obj.x = x0;
    scene.tweens.add({ targets: obj, x: x0, duration: 450, onUpdate: function (tw) { var t = tw.progress; obj.x = x0 + Math.sin(t * Math.PI * 4) * 9 * (1 - t); } });
  }
  function pop(scene, obj, k) { var b = obj.baseScale || 1; scene.tweens.add({ targets: obj, scale: b * (k || 1.07), duration: 160, yoyo: true, ease: 'Quad.easeOut' }); }
  // a round icon button on a dark plate (46 pt, as the DOM kit's)
  function iconBtn(scene, name, fn, o) {
    o = o || {}; var d = o.d || 46, c = scene.add.container(0, 0);
    var plate = ns(scene, d < 46 ? 'pill40' : 'pill', d, d), ic = ui(scene, 'i-' + name).setDisplaySize(d * 0.52, d * 0.52);
    if (o.tint) ic.setTint(o.tint);
    c.add([plate, ic]); c.icon = ic; c.setSize(d, d);
    c.setIcon = function (n) { ic.setFrame('i-' + n).setDisplaySize(d * 0.52, d * 0.52); };
    press(scene, c, fn, { k: 0.9 });
    if (o.dot) { c.dot = ui(scene, 'disc').setDisplaySize(10, 10).setTint(GOLD).setPosition(d / 2 - 9, -d / 2 + 9).setVisible(false); c.add(c.dot); }
    return c;
  }
  // a big button: primary (gold) or plain, with an optional icon; w = width in points
  function bigBtn(scene, label, ic, fn, o) {
    o = o || {}; var c = scene.add.container(0, 0), h = o.h || 56;
    var bg = ns(scene, o.primary ? 'btn1' : 'btn2', 10, o.primary ? h + 6 : h);
    var t = text(scene, label, o.size || 20, { color: o.primary ? '#2a1606' : CREAM, weight: 900 }); if (!label) t.setVisible(false);
    var i = ic ? ui(scene, 'i-' + ic).setDisplaySize(24, 24).setTint(o.primary ? 0x2a1606 : 0xfffaf0) : null;
    c.add([bg]); if (i) c.add(i); c.add(t); c.bg = bg; c.t = t; c.i = i; c.h = h; c.primary = !!o.primary;
    c.fit = function (w) {
      w = Math.max(w || 0, (i ? 32 : 0) + t.width + 40, h);
      c.cw = w; bg.fitTo(w, c.primary ? h + 6 : h).setPosition(0, c.primary ? 3 : 0);
      var iw = i ? 32 : 0, x0 = -(iw + t.width) / 2;
      if (i) i.setPosition(x0 + 12, 0); t.setPosition(x0 + iw + t.width / 2, 1);
      hitSize(c, w, h);
      return c;
    };
    c.setLabel = function (s) { t.setText(s); return c.fit(c.w0); };
    c.w0 = o.w; c.fit(o.w);
    press(scene, c, fn, { k: 0.95, drag: o.drag });
    return c;
  }
  // the root of a scene, in points from the visible top-left; g = { W, H, l, r, t, b } (safe insets)
  function rooted(scene, layout) {
    scene.root = scene.add.container(0, 0);
    K.play.fit(scene, function (v) {
      scene.root.setPosition(v.l, v.t).setScale(v.pt);
      var g = scene.g = { W: v.w / v.pt, H: v.h / v.pt, l: (v.sl - v.l) / v.pt, r: (v.r - v.sr) / v.pt, t: (v.st - v.t) / v.pt, b: (v.b - v.sb) / v.pt, v: v };
      if (layout) layout.call(scene, g);
    });
  }
  // a point in a scene's root -> CSS px on screen (for the test hook)
  function screenOf(scene, obj) {
    if (!obj || !obj.getBounds) return null;
    var b = obj.getBounds(), v = scene.g.v;
    return { x: (b.centerX - v.l) / v.pt, y: (b.centerY - v.t) / v.pt };
  }
  // load pictures (keys like 'p/ant') on the engine's loader, then go on
  function need(scene, keys, done) {
    var n = 0, sh = KQ.game && KQ.game.scene.getScene('Sheet'); if (sh && sh.load) scene = sh;
    keys.forEach(function (k) { if (k && !scene.textures.exists(k)) { scene.load.image(k, IMG + k + '.webp'); n++; } });
    if (!n) { done(); return; }
    scene.load.once('complete', done); if (!scene.load.isLoading()) scene.load.start();
  }
  function qPics(q) {
    if (!q) return [];
    var keys = [q.qp];
    (q.a || []).concat(q.items || [], q.bins || []).forEach(function (o) { keys.push(o.p && 'p/' + o.p); });
    (q.pairs || []).forEach(function (p) { keys.push(p.l.p && 'p/' + p.l.p, p.r.p && 'p/' + p.r.p); });
    if (keys[0]) keys[0] = 'p/' + keys[0];
    if (q.scene) keys.push('scene/' + q.scene);
    return keys.filter(Boolean);
  }
  function pic(scene, key, size) { var im = scene.add.image(0, 0, 'p/' + key); im.setScale(size / Math.max(im.width, im.height)); return im; }
  function backdrop(scene) {
    var th = M.theme;
    scene.bgGrad = scene.add.image(0, 0, 'qz-grad').setOrigin(0);
    scene.bgSky = th.sky ? scene.add.tileSprite(0, 0, 10, 10, 'sky/' + th.sky).setOrigin(0).setTileScale(0.5) : null;
    scene.root.add([scene.bgGrad].concat(scene.bgSky ? [scene.bgSky] : []));
  }
  function backdropLay(scene, g) {
    scene.bgGrad.setDisplaySize(g.W + 2, g.H + 2).setPosition(-1, -1);
    if (scene.bgSky) scene.bgSky.setSize(g.W * 2 + 4, g.H * 2 + 4).setScale(0.5).setTileScale(1).setPosition(-1, -1);
  }

  // ---------------------------------------------------------------- the device's voice (youngest band; not in the engine)
  var Say = (function () {
    var synth = window.speechSynthesis, voices = [], picked = {};
    var NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|eddy|flo\b|reed|sandy|hysterical|deranged|pipe/i;
    function load() { try { voices = synth ? synth.getVoices() || [] : []; picked = {}; } catch (e) { voices = []; } }
    if (synth) { load(); try { synth.addEventListener('voiceschanged', load); } catch (e) {} }
    function pick(lang) {
      if (picked[lang] !== undefined) return picked[lang];
      var best = null, bs = -1;
      voices.forEach(function (v) {
        var l = (v.lang || '').toLowerCase(); if (l.indexOf(lang) !== 0 || NOVELTY.test(v.name)) return;
        var s = 1 + (v.localService ? 2 : 0) + (/premium|enhanced|natural|neural|siri|google/i.test(v.name) ? 3 : 0);
        if (s > bs) { bs = s; best = v; }
      });
      return (picked[lang] = best);
    }
    return {
      has: function (lang) { if (!synth) return false; if (!voices.length) load(); return !!pick(lang) && !K.snd.muted; },
      text: function (s, lang) {
        if (!this.has(lang) || document.hidden) return;
        try { synth.cancel(); var u = new SpeechSynthesisUtterance(s), v = pick(lang); u.voice = v; u.lang = v.lang; u.rate = 0.9; synth.speak(u); } catch (e) {}
      },
      stop: function () { try { synth && synth.cancel(); } catch (e) {} }
    };
  })();
  // a recited ayah: one <audio> element (the bridge counts real listening from media elements only)
  var Ayah = { el: null, on: null, stop: function () { if (this.el) { try { this.el.pause(); } catch (e) {} } this.el = null; if (this.on) { var f = this.on; this.on = null; f(false); } } };
  function stopVoices() { Say.stop(); Ayah.stop(); K.snd.stopVoice(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopVoices(); });

  // ================================================================ Boot
  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      K.play.offThread(this.game);
      K.snd.load(this, AUD);
      this.load.font('Nunito', '/KidsGames/fonts/nunito-400-800.woff2', 'woff2', { weight: '400 800' });
      var th = M.theme, L = this.load;
      ['lit', 'open', 'locked'].forEach(function (s) { L.image('stop-' + s, IMG + 'stop/' + th.name + '-' + s + '.webp'); L.image('stop-' + s + '-b', IMG + 'stop/' + th.name + '-' + s + '-b.webp'); });
      if (th.sky) L.image('sky/' + th.sky, IMG + 'sky/' + th.sky + '.webp');
      L.image('decor', IMG + 'decor/' + th.name + '.webp');
      var orb = orbKey(); if (orb) L.image(orb, IMG + orb + '.webp');
    }
    create() {
      DPR = K.play.dpr(); fontsReady = true;
      atlas(this, M.theme);
      var bg = M.theme.bg;
      K.play.tex(this, 'qz-grad', 4, 256, function (c) { var g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); c.fillStyle = g; c.fillRect(0, 0, 4, 256); });
      this.scene.launch('Sheet'); this.scene.start('Map');
    }
  }
  function orbKey() { var th = M.theme; return th.orb === 'moon' ? 'sky/moon-' + Math.min(29, M.doneCount() + 1) : th.orb ? 'sky/' + th.orb : ''; }

  // ================================================================ Map: the journey
  var GAP = 118, PAD_TOP = 150, PAD_BOT = 190;
  class MapScene extends Phaser.Scene {
    constructor() { super('Map'); }
    create() {
      var self = this;
      this.scrollY = 0; this.dragged = false; this.content = null;
      rooted(this, function (g) { if (self.built) self.lay(g); });
      backdrop(this);
      this.orb = this.add.image(0, 0, '__DEFAULT').setVisible(false); this.root.add(this.orb);
      this.mapBox = this.add.container(0, 0); this.root.add(this.mapBox);
      // the HUD: the way out top-left, the title, then stars, stickers, the lightning round, the band and sound
      var hud = this.hud = this.add.container(0, 0); this.root.add(hud);
      this.bExit = iconBtn(this, 'exit', function () { leave(); });
      this.titlePill = ns(this, 'pill40', 10, 40); this.titleT = text(this, '', 16, { shadow: true });
      this.starPill = ns(this, 'pill40', 10, 40); this.starIc = ui(this, 'star').setDisplaySize(22, 22); this.starT = text(this, '0', 17, { shadow: true });
      this.bCards = M.cfg.cards && M.cfg.cards.length ? iconBtn(this, 'book', function () { Sheets().stickers(); }, { dot: true }) : null;
      this.bBolt = !M.cfg.daily ? iconBtn(this, 'bolt', function () { Sheets().lightning(); }, { tint: GOLD }) : null;
      this.chip = this.add.container(0, 0); this.chipBg = ns(this, 'pill', 10, 46); this.chipIc = ui(this, 'band1').setDisplaySize(30, 30); this.chipT = text(this, '', 15, { ox: 0 });
      this.chip.add([this.chipBg, this.chipIc, this.chipT]); press(this, this.chip, function () { Sheets().band(true); });
      this.bSound = iconBtn(this, K.snd.muted ? 'soundOff' : 'sound', function () { toggleSound(); });
      hud.add([this.bExit, this.titlePill, this.titleT, this.starPill, this.starIc, this.starT].concat([this.bCards, this.bBolt].filter(Boolean), [this.chip, this.bSound]));
      this.playBtn = bigBtn(this, ' ', 'play', function () { self.go(); }, { primary: true, w: 220 }); this.root.add(this.playBtn);

      // scrolling: drag (with a little glide after) and the wheel; taps on stops only when not dragged
      var start = null;
      this.input.on('pointerdown', function (p) { self.glide && self.glide.stop(); start = { y: p.y, s: self.scrollY, t: p.downTime, ys: [] }; self.dragged = false; });
      this.input.on('pointermove', function (p) {
        if (!start || !p.isDown) return;
        var dy = (p.y - start.y) * self.ptPerPx;                                 // canvas px -> points
        if (Math.abs(dy) > 8) self.dragged = true;
        if (self.dragged) { self.setScroll(start.s - dy); start.ys.push([p.y, self.time.now]); if (start.ys.length > 5) start.ys.shift(); }
      });
      this.input.on('pointerup', function () {
        if (start && self.dragged && start.ys.length > 1) {
          var a = start.ys[0], b = start.ys[start.ys.length - 1], dt = Math.max(16, b[1] - a[1]), vel = (b[0] - a[0]) * self.ptPerPx / dt;   // points per ms
          if (Math.abs(vel) > 0.2) { var o = { y: self.scrollY }; self.glide = self.tweens.add({ targets: o, y: self.scrollY - vel * 320, duration: 700, ease: 'Cubic.easeOut', onUpdate: function () { self.setScroll(o.y); } }); }
        }
        start = null;
      });
      this.input.on('wheel', function (p, objs, dx, dy) { self.setScroll(self.scrollY + dy * 0.6); });
      var kb = this.input.keyboard;
      kb.on('keydown-ENTER', function () { if (!Sheets().top()) self.go(); });
      kb.on('keydown-SPACE', function () { if (!Sheets().top()) self.go(); });
      kb.on('keydown-ESC', function () { if (!Sheets().top()) leave(); });
      kb.on('keydown-M', toggleSound);
      kb.on('keydown-UP', function () { self.setScroll(self.scrollY - 120); }); kb.on('keydown-DOWN', function () { self.setScroll(self.scrollY + 120); });
      this.events.on('wake', function () { self.build(); });
      // the next stop breathes twice when the map appears; after that its glow marks it and the loop sleeps (a pulse every
      // 3 s measured 20 ms a second of main thread at 6x CPU, every 14 s still 3 ms, against 0.1 for the old page's CSS)
      this.events.on('wake', function () { later(self, 500, function () { self.breathe(2); }); });
      later(this, 700, function () { self.breathe(2); });
      this.built = false;
      if (!M.band) { M.band = M.BANDS[0]; this.build(); M.band = 0; this.refreshHud(); Sheets().band(false); }
      else this.build();
      this.game.events.once('postrender', function () { K.load.done(); });   // (not on this scene's clock: a first-visit sheet pauses it)
    }
    get ptPerPx() { return 1 / DPR; }
    go() {
      if (Sheets().top()) return;
      if (M.dayDone()) { K.snd.play('locked'); wobble(this, this.playBtn); return; }
      startStop(this, M.nextStop());
    }
    refreshHud() {
      var L = M.L();
      this.titleT.setText(M.T(M.cfg.title));
      this.starT.setText(M.num(M.totalStars()));
      this.chip.setVisible(!!M.band);
      if (M.band) { this.chipIc.setFrame('band' + M.band).setDisplaySize(30, 30); this.chipT.setText(L.bands[M.band - 1] || ''); }
      if (this.bBolt) this.bBolt.setVisible(M.band >= 2 && M.doneCount() >= 1);
      if (this.bCards) this.bCards.dot.setVisible(Object.keys(M.cards()).length > 0);
      this.bSound.setIcon(K.snd.muted ? 'soundOff' : 'sound');
      this.playBtn.setLabel(M.dayDone() ? L.tomorrow : M.T(M.cfg.stopName) + ' ' + M.num(M.nextStop()));
      if (this.playBtn.i) this.playBtn.i.setVisible(!M.dayDone());
      this.playBtn.setAlpha(M.dayDone() ? 0.7 : 1);
      document.documentElement.lang = M.lang;
      if (this.g) this.layHud(this.g);
    }
    layHud(g) {
      var x = g.l + 10, y = g.t + 10 + 23, wide = g.W >= 520;
      this.bExit.setPosition(x + 23, y); x += 46 + 8;
      this.titleT.setVisible(wide); this.titlePill.setVisible(wide);
      if (wide) {
        var tw = Math.min(this.titleT.width, g.W * 0.46 - 28); this.titleT.setCrop(0, 0, tw * DPR + 2, 999);
        this.titlePill.fitTo(tw + 28, 40).setPosition(x + (tw + 28) / 2, y); this.titleT.setPosition(x + 14 + this.titleT.width / 2, y + 1);
      }
      // right-hand group, laid out from the right edge
      var rx = g.W - g.r - 10;
      this.bSound.setPosition(rx - 23, y); rx -= 46 + 8;
      if (this.chip.visible) {
        var cw = wide ? 8 + 30 + 6 + this.chipT.width + 14 : 46;
        this.chipT.setVisible(wide); this.chipBg.fitTo(cw, 46);
        this.chip.setPosition(rx - cw / 2, y); this.chipIc.setPosition(-cw / 2 + 8 + 15, 0); this.chipT.setPosition(-cw / 2 + 8 + 30 + 6, 1);
        hitSize(this.chip, cw, 46);
        rx -= cw + 8;
      }
      [this.bBolt, this.bCards].forEach(function (b) { if (b && b.visible) { b.setPosition(rx - 23, y); rx -= 46 + 8; } });
      var sw = 14 + 22 + 6 + this.starT.width + 14;
      this.starPill.fitTo(sw, 40).setPosition(rx - sw / 2, y); this.starIc.setPosition(rx - sw + 14 + 11, y); this.starT.setPosition(rx - sw + 14 + 22 + 6 + this.starT.width / 2, y + 1);
      this.playBtn.setPosition(g.W / 2, g.H - g.b - 18 - 28);
      this.orb.setPosition(g.W - g.r - 18 - 48, g.t + 70 + 48);
    }
    stopPos(n, w) { var amp = Math.min(w * 0.3, 190); return { x: w / 2 + Math.sin((n - 1) * 0.95) * amp, y: PAD_TOP + (M.cfg.stops - n) * GAP + 54 }; }
    build() {
      var self = this, g = this.g, cfg = M.cfg;
      if (this.content) this.content.destroy();
      var big = g.W >= 700 && g.H >= 700, k = big ? 1.2 : 1;
      var w = Math.min(g.W, 760), h = PAD_TOP + cfg.stops * GAP + PAD_BOT, nx = M.nextStop(), pts = [];
      this.mapW = w; this.mapH = h;
      var c = this.content = this.add.container((g.W - w) / 2, 0); this.mapBox.add(c);
      for (var i = 1; i <= cfg.stops; i++) pts.push(this.stopPos(i, w));
      var decor = this.add.image(0, h, 'decor').setOrigin(0, 1); decor.setDisplaySize(w, w * 200 / 760); c.add(decor);
      // the path: small dots along a curve from stop to stop, clear of the stops
      var pathCol = col((M.theme.path || 'rgba(255,233,168,.55)').replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, function (m, r, gg, b) { return '#' + [r, gg, b].map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join(''); }));
      var pathA = +(((M.theme.path || '').match(/,\s*([\d.]+)\)$/) || [0, 0.55])[1]);
      this.dots = [];
      for (var kq = 1; kq < pts.length; kq++) {
        var a = pts[kq - 1], b = pts[kq], my = (a.y + b.y) / 2;
        for (var j = 1; j < 9; j++) {
          var t = j / 9, u = 1 - t;
          var x = u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x;
          var y = u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y;
          if (Math.abs(y - a.y) < 46 * k || Math.abs(y - b.y) < 50 * k) continue;
          var d = ui(this, 'dot').setPosition(x, y).setTint(pathCol).setAlpha(pathA); c.add(d); this.dots.push(d);
        }
      }
      this.stops = []; this.nextGlow = null;
      for (var n = 1; n <= cfg.stops; n++) (function (n) {
        var st = M.stars()[n] || 0, open = M.unlocked(n), boss = M.isBoss(n), p = pts[n - 1];
        var s = self.add.container(p.x, p.y).setScale(k); s.baseScale = k;
        if (n === nx && !st && open) { var gl = ui(self, 'glow').setPosition(0, 38 - 54).setScale(0.5).setAlpha(0.7); s.add(gl); self.nextGlow = gl; self.nextStop = s; }
        var img = self.add.image(0, boss ? -54 - 10 : -54, 'stop-' + (st ? 'lit' : open ? 'open' : 'locked') + (boss ? '-b' : '')).setOrigin(0.5, 0);
        img.setDisplaySize(boss ? 78 : 64, boss ? 92 : 76); if (!open) img.setAlpha(0.55);
        s.add(img); s.pic = img;
        var num = text(self, M.num(n), boss ? 19 : 17, { weight: 900, color: open ? '#3a2408' : 'rgba(255,255,255,0.55)', line: 0 }).setPosition(0, (boss ? 30 : 31) - 54 + 11);
        s.add(num);
        if (st) for (var i = 0; i < 3; i++) s.add(ui(self, i < st ? 'star' : 'starw').setDisplaySize(16, 16).setPosition((i - 1) * 17, 76 + 2 + 8 - 54).setAlpha(i < st ? 1 : 0.2));
        s.setSize(84, 108);
        press(self, s, function () {
          if (!open) { K.snd.play('locked'); wobble(self, img); return; }
          startStop(self, n);
        }, { sound: open ? 'tap' : false, drag: true, k: 0.92 });
        c.add(s); self.stops.push(s); s.n = n;
      })(n);
      // the orb: a moon that grows with each night done, or a sun
      var ok = orbKey();
      if (ok && this.textures.exists(ok)) this.orb.setTexture(ok).setDisplaySize(96, 96).setVisible(true);
      else if (ok) need(this, [ok], function () { self.orb.setTexture(ok).setDisplaySize(96, 96).setVisible(true); });
      this.built = true;
      this.lay(g);
      var p0 = this.stopPos(this.focus || nx, w); this.focus = 0; this.setScroll(p0.y - g.H * 0.55);
      this.refreshHud();
    }
    lay(g) {
      backdropLay(this, g);
      if (this.content && Math.abs(Math.min(g.W, 760) - this.mapW) > 1) { this.build(); return; }   // (build lays out again)
      if (this.content) this.content.x = (g.W - this.mapW) / 2;
      this.layHud(g); this.setScroll(this.scrollY);
    }
    setScroll(y) {
      if (!this.g) return;
      this.scrollY = Math.max(0, Math.min(y, Math.max(0, this.mapH - this.g.H)));
      if (this.content) this.content.y = -this.scrollY;
      // only what is on screen is drawn (a long map has 30 stops and 200 dots)
      var top = this.scrollY - 140, bot = this.scrollY + this.g.H + 140;
      (this.stops || []).forEach(function (s) { s.setVisible(s.y > top && s.y < bot); });
      (this.dots || []).forEach(function (d) { d.setVisible(d.y > top && d.y < bot); });
    }
    breathe(n) {
      if (reduced || !this.nextStop || !this.nextStop.visible || (Sheets() && Sheets().top())) return;
      var s = this.nextStop.pic, gl = this.nextGlow, sx = s.scaleX, sy = s.scaleY;
      this.tweens.killTweensOf([s, gl]);
      this.tweens.add({ targets: s, scaleX: sx * 1.1, scaleY: sy * 1.1, duration: 420, yoyo: true, repeat: (n || 1) - 1, ease: 'Sine.easeInOut', onComplete: function () { s.setScale(sx, sy); } });
      if (gl) this.tweens.add({ targets: gl, alpha: 1, scale: 0.56, duration: 420, yoyo: true, repeat: (n || 1) - 1, ease: 'Sine.easeInOut' });
    }
  }
  // the way out: the app's own (Kit.play.exit tells it), or in a browser back to the quiz catalog, not the games hub
  function leave() { if (K.host && K.host.isNative()) K.play.exit(); else location.href = '/KidsGames/quizzes.html'; }
  function toggleSound() {
    K.snd.setMuted(!K.snd.muted); if (K.snd.muted) stopVoices(); else K.snd.play('tap');
    var m = KQ.game && KQ.game.scene.getScene('Map'); if (m && m.bSound) m.bSound.setIcon(K.snd.muted ? 'soundOff' : 'sound');
    var s = Sheets(); if (s && s.cur && s.cur.snd) s.cur.snd();
  }

  // ================================================================ Play: one stop
  var PER_TYPE_HINT = { order: 1, match: 1, sort: 1, place: 1 };
  function startStop(from, n, quick) {
    stopVoices();
    var queue = M.choose(n, quick); if (!queue.length) return;
    var game = from.game;
    need(from, qPics(queue[0]), function () {
      if (game.scene.isActive('Play') || game.scene.isPaused('Play')) game.scene.stop('Play');
      game.scene.run('Play', { n: n, quick: !!quick, queue: queue });
      game.scene.bringToTop('Sheet');
    });
  }
  class PlayScene extends Phaser.Scene {
    constructor() { super('Play'); }
    init(d) {
      this.n = d.n; this.quick = d.quick; this.queue = d.queue.slice(); this.total = this.queue.length;
      this.firstTry = {}; this.retried = {}; this.slotOf = {}; this.pos = 0; this.t0 = 0; this.fb = null; this.qv = null; this.busy = false; this.segs = null; this.qc = this.areaC = null; this.clockT = null; this.fx = null;
      var self = this; this.queue.forEach(function (q, i) { self.slotOf[q.id] = i; });
    }
    create() {
      var self = this;
      rooted(this, function (g) { if (self.segs) self.lay(g); });
      backdrop(this); if (this.bgSky) this.bgSky.setAlpha(0.4);
      this.body = this.add.container(0, 0); this.root.add(this.body);
      // while playing: one pause button and the progress (game-ui-ux; AGENTS.md 18a); everything else is on the pause sheet
      this.bPause = iconBtn(this, 'pause', function () { self.pause(); }); this.root.add(this.bPause);
      this.segs = []; for (var i = 0; i < this.total; i++) { var s = ns(this, 'seg', 10, 10).setTint(0xffffff).setAlpha(0.16); this.segs.push(s); this.root.add(s); }
      if (this.quick) { this.clockT = text(this, '0:00', 18, { weight: 900 }); this.root.add(this.clockT); this.t0 = this.time.now;
        // the clock shows whole seconds: a browser timer once a second that wakes the loop for the change (an engine timer
        // counts as moving and kept the loop drawing at the screen's rate for the whole round: 262 frames an answer)
        var last = '', tick = setInterval(function () {
          if (document.hidden || !self.sys.isActive()) return;
          var s2 = M.fmtTime(self.time.now - self.t0); if (s2 !== last) { last = s2; K.play.wake(); self.clockT.setText(s2); }
        }, 1000);
        this.events.once('shutdown', function () { clearInterval(tick); }); }
      var kb = this.input.keyboard;
      kb.on('keydown', function (e) { self.key(e); });
      this.events.on('shutdown', function () { stopVoices(); });
      // the map sleeps (not drawn) while a stop is played; queued here, after any resume a closing sheet queued
      if (this.scene.isActive('Map') || this.scene.isPaused('Map')) this.scene.sleep('Map');
      this.lay(this.g); this.ask();
    }
    key(e) {
      if (Sheets().top()) return;
      var k = e.key;
      if (k === 'Escape') return this.pause();
      if (k === 'm' || k === 'M') return toggleSound();
      if (this.fb && (k === 'Enter' || k === ' ' || k === 'ArrowRight')) return this.fb.go();
      var v = this.qv; if (!v || !v.keys) return;
      if (/^[1-9]$/.test(k)) v.keys.num(+k - 1);
      else if (k === 'y' || k === 'Y') v.keys.yes && v.keys.yes(true);
      else if (k === 'n' || k === 'N') v.keys.yes && v.keys.yes(false);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') v.keys.move(-1);
      else if (k === 'ArrowRight' || k === 'ArrowDown') v.keys.move(1);
      else if (k === 'Enter' || k === ' ') v.keys.go();
    }
    pause() { if (this.busy && !this.fb) return; Sheets().pause(this); }
    mark() {
      var self = this, cur = this.queue[this.pos];
      this.segs.forEach(function (s, i) {
        var id = self.queue.filter(function (q) { return self.slotOf[q.id] === i; })[0].id;
        var done = self.firstTry[id] === true || self.retried[id] === true, miss = self.firstTry[id] === false;
        var on = cur && self.slotOf[cur.id] === i;
        s.setTint(done ? GOLD : 0xffffff).setAlpha(done ? 1 : on ? 0.5 : miss ? 0.42 : 0.16);
        s.scaleY = on ? 1.5 / R : 1 / R;
      });
    }
    lay(g) {
      if (!g) return;
      backdropLay(this, g);
      var short = g.H < 430 && g.W > g.H, top = g.t + 8, bh = short ? 42 : 50, x = g.l + 12;
      this.bPause.setPosition(x + 23, top + bh / 2); x += 46 + 10;
      var right = g.W - g.r - 12 - (this.quick ? 64 : 0), n = this.segs.length, gap = 5, sw = (right - x - gap * (n - 1)) / n;
      this.segs.forEach(function (s, i) { s.fitTo(Math.max(4, sw), 10).setPosition(x + i * (sw + gap) + sw / 2, top + bh / 2); });
      if (this.clockT) this.clockT.setPosition(g.W - g.r - 12 - 30, top + bh / 2);
      this.mark();
      this.area = { x: g.l + 12, y: top + bh + 6, w: g.W - g.l - g.r - 24, h: g.H - (top + bh + 6) - g.b - 12 };
      if (this.qv) { if (this.qv.fresh()) this.show(true); else this.fitBody(); }
      if (this.fb) this.fb.lay();
    }
    ask() {
      var q = this.queue[this.pos], self = this;
      stopVoices();
      if (!q) return this.finish();
      this.mark();
      need(this, qPics(this.queue[this.pos + 1]), function () {});        // the next question's pictures, while this one is read
      need(this, qPics(q), function () { if (self.queue[self.pos] === q) self.show(); });
    }
    // draw the current question (again on a resize before it was touched)
    show(again) {
      var self = this, q = this.queue[this.pos], G = this.g, A0 = this.area;
      // a tablet: the question is laid out for a smaller screen and the whole of it drawn larger (text drawn at that
      // size, so it stays sharp), instead of small cards floating in a big empty screen
      var up = this.up = G.W >= 700 && G.H >= 700 ? Math.min(1.4, Math.min(G.W, G.H) / 600) : 1;
      var g = up === 1 ? G : { W: G.W / up, H: G.H / up }, A = this.areaV = up === 1 ? A0 : { x: A0.x / up, y: A0.y / up, w: A0.w / up, h: A0.h / up };
      this.tup = up;
      this.body.removeAll(true); this.body.setScale(up).setPosition(0, 0);
      var wide = g.W > g.H && g.W >= 620, short = g.H < 430 && wide, big = g.W >= 700 && g.H >= 700;
      var maxW = wide ? 1080 : 760, bw = Math.min(A.w, maxW), bx = A.x + (A.w - bw) / 2;
      var sz = this.sz = { wide: wide, short: short, big: big, b1: M.band === 1, smallP: !wide && g.H < 640 };
      // the question
      var qc = this.add.container(0, 0), qw = wide ? (bw - 18) * 0.9 / 2 : bw;
      var qpic = q.qp ? pic(this, q.qp, wide ? Math.min(g.H * 0.34, 150) : short ? 84 : big ? 110 : sz.smallP ? 56 : 76) : null;
      var fs = Math.max(19, Math.min(30, 3.2 * Math.min(g.W, g.H) / 100 + 9));
      var speak = !q.audio && Say.has(M.lang);
      var tw = wide ? qw - 44 - (speak && !qpic ? 80 : 0) : qw - 18 - 56 - (qpic ? qpic.displayWidth + 14 : 0);
      var parts = [text(this, M.T(q.q), fs, { wrap: tw, weight: 800, align: wide ? 'center' : 'left' })];
      if (q.ar) parts.push(text(this, q.ar, fs * (q.ar.replace(/[\u064b-\u0652\s]/g, '').length <= 3 ? 2.4 : 1.25), { wrap: tw, weight: 700, ar: true, line: Math.round(fs * 0.7) }));   // a lone letter is the question: big
      if (M.L()[q.type] && PER_TYPE_HINT[q.type]) parts.push(text(this, M.L()[q.type], fs * 0.56, { weight: 700, align: wide ? 'center' : 'left', color: 'rgba(255,250,240,0.7)' }));
      var listen = null;
      if (q.audio) listen = this.listenBtn(q);
      // stack them
      var th = 0; parts.forEach(function (p, i) { th += p.height + (i ? 4 : 0); }); if (listen) th += 10 + 48;
      var qh, bg;
      if (wide) {
        qh = Math.max(72, 22 + (qpic ? qpic.displayHeight + 12 : 0) + th + 22);
        bg = ns(this, 'glass', qw, qh); qc.add(bg);
        var y = -qh / 2 + 22;
        if (qpic) { qpic.setPosition(0, y + qpic.displayHeight / 2); qc.add(qpic); y += qpic.displayHeight + 12; }
        parts.forEach(function (p) { p.setOrigin(0.5, 0).setPosition(0, y); qc.add(p); y += p.height + 4; });
        if (listen) { listen.setPosition(0, y + 6 + 24); qc.add(listen); }
      } else {
        qh = Math.max(72, 32 + Math.max(th, qpic ? qpic.displayHeight : 0));
        bg = ns(this, 'glass', qw, qh); qc.add(bg);
        var lx = -qw / 2 + 18;
        if (qpic) { qpic.setPosition(lx + qpic.displayWidth / 2, 0); qc.add(qpic); lx += qpic.displayWidth + 14; }
        var y2 = -th / 2;
        parts.forEach(function (p) { p.setOrigin(p.isAr ? 1 : 0, 0).setPosition(p.isAr ? lx + tw : lx, y2); qc.add(p); y2 += p.height + 4; });
        if (listen) { listen.setPosition(lx + listen.cw / 2, y2 + 6 + 24); qc.add(listen); }
      }
      if (speak) {
        var sp = iconBtn(this, 'sound', function () { Say.text(M.T(q.q), M.lang); }, { d: 40 });
        sp.setPosition(qw / 2 - 10 - 20, -qh / 2 + 10 + 20); qc.add(sp);
        if (M.band === 1 && !this.quick && !again) later(this, 350, function () { if (self.queue[self.pos] === q && !self.fb) Say.text(M.T(q.q), M.lang); });
      }
      qc.cw = qw; qc.h = qh;
      // the answers
      var aw = wide ? (bw - 18) * 1.1 / 2 : bw;
      var ah = wide ? A.h : A.h - qh - 12;
      var area = this.add.container(0, 0);
      var v = this.qv = TYPES[q.type].call(this, q, area, aw, ah, sz, function (ok, node) { self.commit(q, ok, node); });
      v.touched = false;
      v.fresh = function () { return !v.touched && !self.fb; };
      // fit the answers in their place (shrink, never scroll: a child should see every answer at once)
      var k = Math.min(1, ah / Math.max(1, v.h), aw / Math.max(1, v.w));
      area.setScale(k);
      if (wide) {
        qc.setPosition(bx + qw / 2, A.y + A.h / 2);
        if (qh > A.h) qc.setScale(A.h / qh);
        area.setPosition(bx + qw + 18 + aw / 2, A.y + A.h / 2);
      } else {
        qc.setPosition(bx + qw / 2, A.y + qh / 2);
        area.setPosition(bx + bw / 2, A.y + qh + 12 + ah / 2);
      }
      this.body.add([qc, area]); this.qc = qc; this.areaC = area;
      this.bodyH = A.h;
      if (!again) {                                                      // in: rise and settle, the cards one after another
        [qc].concat(v.cards || []).forEach(function (o, i) {
          var y = o.y, a = o.alpha; o.y = y + 14; o.alpha = 0;
          self.tweens.add({ targets: o, y: y, alpha: a, duration: 260, delay: i ? 30 + i * 35 : 0, ease: 'Back.easeOut' });
        });
      }
      if (this.fb) this.fitBody();
    }
    listenBtn(q) {
      var self = this, clips = [].concat(q.audio), b = bigBtn(this, M.L().listen, 'sound', function () { play(); }, { h: 48, size: 17 });
      function setOn(on) { b.bg.setFrame(on ? 'btn1' : 'btn2'); b.t.setColor(on ? INK : CREAM); if (b.i) b.i.setTint(on ? col(INK) : 0xfffaf0); K.play.wake(); }
      function play() {
        Ayah.stop(); if (K.snd.muted) return;
        var i = 0, el = new Audio(); el.preload = 'auto'; Ayah.el = el; Ayah.on = setOn; setOn(true);
        el.addEventListener('ended', function () { if (Ayah.el !== el) return; i++; if (i < clips.length) { el.src = clips[i]; el.play().catch(function () {}); } else { Ayah.on = null; Ayah.el = null; setOn(false); } });
        el.src = clips[0]; el.play().catch(function () { if (Ayah.el === el) { Ayah.on = null; Ayah.el = null; setOn(false); } });
      }
      later(this, 300, function () { if (self.queue[self.pos] === q && !self.fb) play(); });
      var nq = this.queue[this.pos + 1]; if (nq && nq.audio) { var pre = new Audio(); pre.preload = 'auto'; pre.src = [].concat(nq.audio)[0]; }
      return b;
    }
    commit(q, ok, node) {
      K.bridge.answer();
      var again = q.id in this.firstTry, self = this;
      if (again) this.retried[q.id] = ok; else this.firstTry[q.id] = ok;
      if (ok) {
        K.snd.play('correct'); K.buzz(8); this.sparkle(node);
        if (!again && !this.quick) K.snd.praise(KQ.pick(M.cfg.praise || ['mashaallah', 'ahsant', 'barakallah']));
      } else { K.snd.play('wrong'); K.buzz(20); }
      // a missed question comes back once at the end of the stop (in the quick round, until it is right)
      if (!ok && (!again || this.quick)) this.queue.push(q);
      this.mark();
      if (this.quick && ok) { this.busy = true; later(this, 420, function () { self.busy = false; self.pos++; self.ask(); }); return; }
      this.showFb(q, ok);
    }
    sparkle(node) {
      if (!node) return;
      var b = node.getBounds(), v = this.g.v, x = (b.centerX - v.l) / v.pt, y = (b.centerY - v.t) / v.pt;
      burst(this, x, y, 14);
    }
    // the answer bar: why, the source, and the way on
    showFb(q, ok) {
      var self = this, L = M.L(), multi = q.type === 'sort' || q.type === 'order' || q.type === 'match';
      var c = this.add.container(0, 0); this.root.add(c);
      var bg = ns(this, 'fb', 10, 10); c.add(bg);
      var mark = this.add.container(0, 0, [ui(this, 'disc').setDisplaySize(50, 50).setTint(ok ? GOODC : BADC), ui(this, 'i-' + (ok ? 'check' : multi ? 'bulb' : 'cross')).setDisplaySize(28, 28)]);
      var next = bigBtn(this, '', 'next', function () { go(); }, { primary: true, w: 64, h: 52 });
      var tw0 = this.fbTextW();
      var head = text(this, ok ? KQ.pick(L.good) : multi ? L.learned : L.bad, 20, { weight: 900, color: ok ? '#1c7a4b' : '#b93349', ox: 0, oy: 0, align: 'left', wrap: tw0 });
      var why = q.why ? text(this, M.T(q.why), Math.round(Math.max(15, Math.min(19, 1.6 * Math.min(this.g.W, this.g.H) / 100 + 9))), { weight: 700, color: INK, ox: 0, oy: 0, align: 'left', wrap: tw0 }) : null;
      var ref = q.ref ? text(this, L.source + ': ' + q.ref, 12.5, { weight: 700, color: 'rgba(42,28,74,0.6)', ox: 0, oy: 0, align: 'left', wrap: tw0 }) : null;
      c.add([mark, head].concat(why ? [why] : [], ref ? [ref] : [], [next]));
      var shown = false;
      function go() {
        if (self.fb !== fb || !shown) return;
        Say.stop(); K.snd.stopVoice(); self.fb = null;
        self.tweens.add({ targets: c, y: c.y + fb.h + 20, duration: 220, ease: 'Quad.easeIn', onComplete: function () { c.destroy(); } });
        self.pos++; self.ask();
      }
      var fb = this.fb = { c: c, go: go, next: next, h: 0 };
      fb.lay = function () {
        var g = self.g, wide = g.W > g.H && g.W >= 620, maxw = wide ? 1080 : 760, W = g.W, inner = Math.min(W - 32 - g.l - g.r, maxw);
        var tx = 50 + 14, tw = self.fbTextW();
        if (Math.abs(tw - head.style.wordWrapWidth) > 0.5) { [head, why, ref].forEach(function (t) { if (t) t.setWordWrapWidth(tw, true); }); }   // (only after a resize)
        var th = head.height + (why ? 2 + why.height : 0) + (ref ? 4 + ref.height : 0), ih = Math.max(56, th);
        var h = fb.h = 16 + ih + 16 + g.b;
        var x0 = (W - inner) / 2 + (g.l - g.r) / 2;
        bg.fitTo(W + 2, h + 30).setPosition(W / 2, h / 2 + 15 - 1).setOrigin(0.5);
        mark.setPosition(x0 + 25, 16 + ih / 2);
        var y = 16 + (ih - th) / 2; head.setPosition(x0 + tx, y); y += head.height;
        if (why) { y += 2; why.setPosition(x0 + tx, y); y += why.height; }
        if (ref) { y += 4; ref.setPosition(x0 + tx, y); }
        next.setPosition(x0 + inner - next.cw / 2, 16 + ih / 2);
        c.x = 0; if (!fb.moving) c.y = g.H - h;
        self.fitBody();
      };
      fb.lay();
      c.y = this.g.H + 10; fb.moving = true;
      K.snd.play('slide');
      this.tweens.add({ targets: c, y: this.g.H - fb.h, duration: 320, ease: 'Back.easeOut', onComplete: function () { fb.moving = false; shown = true; } });
      this.time.delayedCall(120, function () { shown = true; });
      if (!ok && q.why && M.band === 1) later(this, 500, function () { if (self.fb === fb) Say.text(M.T(q.why), M.lang); });
    }
    fbTextW() { var g = this.g, wide = g.W > g.H && g.W >= 620, inner = Math.min(g.W - 32 - g.l - g.r, wide ? 1080 : 760); return inner - 64 - 14 - 64; }
    // with the bar up, what it would cover moves up into free space; only if there is not enough room does it all shrink
    fitBody() {
      var A = this.areaV || this.area, up = this.up || 1, qc = this.qc, ar = this.areaC; if (!qc || !ar) return;
      var limit = this.fb ? (this.g.H - this.fb.h - 8) / up : A.y + A.h, self = this;   // (in the body's own points)
      var ext = function (o, h) { return { o: o, y: o.homeY == null ? (o.homeY = o.y) : o.homeY, h: h * o.scaleY }; };
      var q = ext(qc, qc.h), a = ext(ar, this.qv.h), items = this.sz.wide ? [q, a] : [a], floor = this.sz.wide ? A.y : q.y + q.h / 2 + 12, k = 1;
      items.forEach(function (it) {
        var top = it.y - it.h / 2, over = top + it.h - limit, room = top - (it === a && !self.sz.wide ? floor : A.y);
        it.to = it.y - Math.max(0, Math.min(over, room));
        if (over > room) k = Math.min(k, (limit - A.y) / Math.max(1, (it === a && !self.sz.wide ? a.y + a.h / 2 : it.y + it.h / 2) - A.y));
      });
      this.tweens.killTweensOf([this.body, qc, ar]);
      items.forEach(function (it) { self.tweens.add({ targets: it.o, y: it.to, duration: 250, ease: 'Quad.easeOut' }); });
      var cx = this.g.W / 2;
      this.tweens.add({ targets: this.body, scale: up * k, x: cx * (1 - k), y: A.y * up * (1 - k), duration: 250, ease: 'Quad.easeOut' });
    }
    // the stop is over: back on the map (the stop just lit), with the finished sheet over it
    finish() {
      var g = this.game, sh = Sheets(), quick = this.quick, ms = this.time.now - this.t0, n = this.n;
      var res = quick ? M.finishQuick(ms) : M.finish(n, this.firstTry, this.total);
      K.bridge.complete(); K.snd.play('win');
      backToMap(this, n);
      if (quick) sh.quickDone(ms, res); else sh.done(n, res);
    }
  }
  // confetti and sparkles: the engine's particles, in a scene's points
  function burst(scene, x, y, n, wide) {
    if (!scene.fx) {
      scene.fx = scene.add.particles(0, 0, 'qz-ui', {
        frame: ['spark', 'shard', 'spark'], speed: { min: 160, max: 340 }, angle: { min: 0, max: 360 }, lifespan: { min: 420, max: 650 },
        gravityY: 500, scale: { start: 0.4, end: 0 }, rotate: { min: 0, max: 360 }, tint: CONFETTI, emitting: false
      });
      scene.root.add(scene.fx);
    }
    scene.root.bringToTop(scene.fx);
    scene.fx.explode(n || 14, x, y);
  }
  function confetti(scene) {
    var g = scene.g;
    for (var i = 0; i < 5; i++) burst(scene, g.W * (0.15 + 0.175 * i), g.H * 0.3, 16);
  }

  // ---------------------------------------------------------------- question types
  // Each builds into `area` (a container centred on (0,0)) within aw x ah points and returns
  // { w, h, cards, keys: { num(i), move(d), go(), yes(b) } }. done(ok, node) commits the answer.
  function answerCard(scene, o, w, sz, opt) {
    opt = opt || {};
    var c = scene.add.container(0, 0), T = M.T(o.t), picOnly = o.p && !o.t, row = !!opt.row;
    var ps = o.p ? (opt.pic || (picOnly ? (sz.big ? 180 : 128) : sz.big ? 150 : sz.short ? 64 : sz.smallP ? 78 : 104)) : 0;
    ps = Math.min(ps, w - 24);
    var fs = opt.fs || Math.max(16, Math.min(23, 2.4 * Math.min(scene.g.W, scene.g.H) / 100 + 8));
    var p = ps ? pic(scene, o.p, ps) : null;
    var t = T ? text(scene, T, fs, { wrap: Math.max(40, (row ? w - 24 - ps - 8 : w - 24)), weight: 800, color: INK, line: Math.round(fs * 0.25) }) : null;
    var minH = opt.minH || (sz.big ? 86 : sz.short ? 50 : 62);
    var h = row ? Math.max(minH, 20 + Math.max(ps, t ? t.height : 0)) : Math.max(minH, 20 + (p ? ps : 0) + (p && t ? 6 : 0) + (t ? t.height : 0));
    var bg = ns(scene, 'c-n', w + 8, h + 8).setPosition(0, 0);
    c.add(bg);
    if (row) { var x0 = -((ps ? ps + 8 : 0) + (t ? t.width : 0)) / 2; if (p) { p.setPosition(x0 + ps / 2, -2); c.add(p); } if (t) { t.setPosition(x0 + (ps ? ps + 8 : 0) + t.width / 2, -2); c.add(t); } }
    else {
      var y = -h / 2 + 10 - 2.5 + (h - (20 + (p ? ps : 0) + (p && t ? 6 : 0) + (t ? t.height : 0))) / 2;
      if (p) { p.setPosition(0, y + ps / 2); c.add(p); y += ps + 6; }
      if (t) { t.setPosition(0, y + t.height / 2); c.add(t); }
    }
    c.setSize(w, h); c.cw = w; c.h = h; c.bg = bg;
    c.state = function (s) {
      bg.setFrame({ n: 'c-n', good: 'c-good', bad: 'c-bad', sel: 'c-sel', lock: 'c-lock' }[s] || 'c-n');
      return c;
    };
    c.dim = function (a) { c.setAlpha(a); return c; };
    return c;
  }
  // rows of cards in a grid: returns total h; cards centred at their cells
  function grid(cards, cols, w, gap) {
    var cw = (w - gap * (cols - 1)) / cols, rows = [], y = 0;
    for (var i = 0; i < cards.length; i += cols) rows.push(cards.slice(i, i + cols));
    rows.forEach(function (r) { var h = Math.max.apply(null, r.map(function (c) { return c.h; })); r.forEach(function (c, j) { c.cellH = h; c.setPosition(-w / 2 + j * (cw + gap) + cw / 2, y + h / 2); }); y += h + gap; });
    return Math.max(0, y - gap);
  }
  function center(cards, h, dy) { cards.forEach(function (c) { c.y += -h / 2 + (dy || 0); c.homeX = c.x; }); }
  function stretch(scene, cards) { cards.forEach(function (c) { if (c.cellH && c.cellH > c.h) { c.bg.fitTo(c.cw + 8, c.cellH + 8); c.h = c.cellH; hitSize(c, c.cw, c.h); } }); }
  // keyboard focus ring on one of a list (game-ui-ux: something is always focused)
  function focusable(scene, area, list, pick) {
    var at = -1;
    function show() { list.forEach(function (c, i) { if (!c.off_ && c.state) c.state(i === at ? 'sel' : 'n'); }); }
    return {
      num: function (i) { if (list[i] && !list[i].off_) pick(list[i], i); },
      move: function (d) { var n = list.length; for (var k = 0; k < n; k++) { at = (at + d + n) % n; if (!list[at].off_) break; } show(); },
      go: function () { if (list[at] && !list[at].off_) pick(list[at], at); }
    };
  }
  var TYPES = {
    choice: function (q, area, aw, ah, sz, done) {
      var self = this, opts = q.a.map(function (o, i) { return { o: o, i: i }; });
      if (!q.fixed) opts = KQ.shuffle(opts);
      var long = opts.some(function (x) { return !x.o.p && M.T(x.o.t).length > 18; });
      var cols = long ? 1 : opts.length === 3 ? 3 : 2, gap = sz.big ? 16 : 10, cw = (aw - gap * (cols - 1)) / cols, locked = false;
      var cards = opts.map(function (x) { var c = answerCard(self, x.o, cw, sz); c.i = x.i; area.add(c); return c; });
      var h = grid(cards, cols, aw, gap); stretch(this, cards); center(cards, h);
      function pick(c) {
        if (locked) return; locked = true; self.qv.touched = true;
        var ok = c.i === q.correct, right = cards.filter(function (k) { return k.i === q.correct; })[0];
        cards.forEach(function (k) { k.off_ = true; if (k === right) { k.state('good'); pop(self, k); } else if (k !== c) k.dim(0.4); });
        if (!ok) { c.state('bad'); shake(self, c); }
        done(ok, right);
      }
      cards.forEach(function (c) { press(self, c, function () { pick(c); }, { k: 0.96 }); });
      return { w: aw, h: h, cards: cards, keys: focusable(this, area, cards, pick), right: function () { return cards.filter(function (k) { return k.i === q.correct; })[0]; } };
    },
    yesno: function (q, area, aw, ah, sz, done) {
      var self = this, L = M.L(), gap = 12, cw = (aw - gap) / 2, locked = false, hh = sz.short ? 84 : 120;
      function mk(label, ic, tint) {
        var c = self.add.container(0, 0), bg = ns(self, 'c-n', cw + 8, hh + 8), is = sz.short ? 40 : 54;
        var i = ui(self, 'i-' + ic).setDisplaySize(is, is).setTint(tint).setPosition(0, -is / 2 + 4);
        var t = text(self, label, Math.max(20, Math.min(28, 3 * Math.min(self.g.W, self.g.H) / 100 + 8)), { weight: 800, color: INK }).setPosition(0, is / 2 + 4);
        c.add([bg, i, t]); c.setSize(cw, hh); c.cw = cw; c.h = hh; c.bg = bg;
        c.state = function (s) { bg.setFrame({ good: 'c-good', bad: 'c-bad', sel: 'c-sel' }[s] || 'c-n'); return c; };
        area.add(c); return c;
      }
      var y = mk(L.yes, 'check', GOODC), n = mk(L.no, 'cross', BADC);
      y.setPosition(-cw / 2 - gap / 2, 0); n.setPosition(cw / 2 + gap / 2, 0); y.homeX = y.x; n.homeX = n.x; y.val = true; n.val = false;
      function pick(btn) {
        if (locked) return; locked = true; self.qv.touched = true;
        var ok = btn.val === !!q.yes, right = q.yes ? y : n;
        y.off_ = n.off_ = true; right.state('good'); pop(self, right); if (!ok) { btn.state('bad'); shake(self, btn); }
        done(ok, right);
      }
      press(this, y, function () { pick(y); }, { k: 0.96 }); press(this, n, function () { pick(n); }, { k: 0.96 });
      var f = focusable(this, area, [y, n], pick); f.yes = function (b) { pick(b ? y : n); };
      return { w: aw, h: hh, cards: [y, n], keys: f, right: function () { return q.yes ? y : n; } };
    },
    sort: function (q, area, aw, ah, sz, done) {
      var self = this, items = KQ.shuffle(q.items), i = 0, miss = false, busy = false, counts = [0, 0], gap = 12;
      var bh = sz.short ? 76 : 112, bw = (aw - gap) / 2, iw = Math.min(aw * 0.74, 300), ih = sz.short ? 70 : 110;
      var total = Math.max(ih + 24, Math.min(ah, ih * 1.6)) + gap + bh;
      var top = -total / 2, binY = total / 2 - bh / 2;
      var bins = q.bins.map(function (b, k) {
        var c = self.add.container((k ? 1 : -1) * (bw / 2 + gap / 2), binY), key = box(self, bw, bh, 22, BOX.bin);
        var bg = self.add.image(0, 0, key).setScale(1 / R), ps = sz.short ? 36 : 54;
        var p = b.p ? pic(self, b.p, ps) : null, t = text(self, M.T(b.t), Math.max(15, Math.min(21, 2.2 * Math.min(self.g.W, self.g.H) / 100 + 8)), { weight: 800, wrap: bw - 20 });
        var cnt = text(self, '', 14, { weight: 800, color: 'rgba(255,250,240,0.75)' });
        var hh = (p ? ps + 4 : 0) + t.height + 18, y = -hh / 2;
        if (p) { p.setPosition(0, y + ps / 2); y += ps + 4; } t.setPosition(0, y + t.height / 2); cnt.setPosition(0, y + t.height + 9);
        c.add([bg].concat(p ? [p] : [], [t, cnt])); c.setSize(bw, bh); c.bg = bg; c.cnt = cnt; c.k = k; c.homeX = c.x;
        c.look = function (s) { bg.setTexture(box(self, bw, bh, 22, s === 'good' ? BOX.binGood : s === 'bad' ? BOX.binBad : BOX.bin)); };
        area.add(c); return c;
      });
      var slotY = top + (total - bh - gap) / 2, card = null;
      function show() { card = answerCard(self, items[i], iw, sz, { minH: ih }); card.setPosition(0, slotY); area.add(card); card.setScale(0.6).setAlpha(0); self.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' }); K.play.wake(); }
      function drop(b) {
        if (busy || i >= items.length) return; self.qv.touched = true;
        var it = items[i];
        if (b.k !== it.bin) {
          miss = true; K.snd.play('wrong'); K.buzz(20); b.look('bad'); shake(self, b);
          self.time.delayedCall(500, function () { b.look(); }); return;
        }
        busy = true; K.snd.play('place'); b.look('good'); pop(self, b, 1.05);
        counts[b.k]++; b.cnt.setText(M.num(counts[b.k]));
        var c = card;
        self.tweens.add({ targets: c, x: b.x, y: b.y, scale: 0.3, alpha: 0, duration: 350, ease: 'Quad.easeIn', onComplete: function () { c.destroy(); } });
        self.time.delayedCall(360, function () {
          busy = false; b.look(); i++;
          if (i < items.length) show(); else done(!miss, b);
        });
      }
      bins.forEach(function (b) { press(self, b, function () { drop(b); }, { sound: false, k: 0.96 }); });
      show();
      var at = 0;
      return { w: aw, h: total, cards: bins, right: function () { return items[i] && bins[items[i].bin]; }, keys: { num: function (k) { if (bins[k]) drop(bins[k]); }, move: function (d) { at = d < 0 ? 0 : 1; bins.forEach(function (b, k) { b.look(k === at ? 'good' : undefined); }); }, go: function () { drop(bins[at]); } } };
    },
    order: function (q, area, aw, ah, sz, done) {
      var self = this, at = 0, miss = false, n = q.items.length, gap = sz.smallP ? 6 : 8;
      var sh = sz.b1 ? 58 : sz.short || sz.smallP ? 40 : 50, fs = Math.max(15, Math.min(20, 2 * Math.min(this.g.W, this.g.H) / 100 + 8));
      var slots = q.items.map(function (it, k) {
        var c = self.add.container(0, 0), bg = self.add.image(0, 0, box(self, aw, sh, 16, BOX.slot)).setScale(1 / R);
        var badge = self.add.container(-aw / 2 + 12 + 15, 0, [ui(self, 'disc').setDisplaySize(30, 30).setTint(0xffffff).setAlpha(0.16), text(self, M.num(k + 1), 16, { weight: 900 })]);
        c.add([bg, badge]); c.bg = bg; c.badge = badge; c.h = sh; area.add(c); return c;
      });
      var cols = sz.b1 ? 3 : 2, cw = (aw - 8 * (cols - 1)) / cols;
      var pool = KQ.shuffle(q.items.map(function (it, k) { return { it: it, k: k }; })).map(function (x) {
        var c = answerCard(self, x.it, cw, sz, sz.b1 ? { minH: 96, pic: 56, fs: fs } : { row: true, minH: sz.short ? 44 : sz.smallP ? 46 : 54, pic: 40, fs: fs });
        c.k = x.k; c.it = x.it; area.add(c); return c;
      });
      var y = 0; slots.forEach(function (s) { s.y = y + sh / 2; y += sh + gap; }); y += 6 - gap + 6;
      var ph = grid(pool, cols, aw, 8); pool.forEach(function (c) { c.y += y; }); stretch(this, pool);
      var total = y + ph; slots.forEach(function (s) { s.y -= total / 2; }); pool.forEach(function (c) { c.y -= total / 2; c.homeX = c.x; });
      function pick(c) {
        if (c.off_) return; self.qv.touched = true;
        if (c.k !== at) { miss = true; K.snd.play('wrong'); K.buzz(20); c.state('bad'); shake(self, c); self.time.delayedCall(500, function () { if (!c.off_) c.state('n'); }); return; }
        K.snd.play('place'); c.off_ = true;
        self.tweens.add({ targets: c, scale: 0.8, alpha: 0, duration: 200 });
        var s = slots[at]; s.bg.setTexture(box(self, aw, sh, 16, BOX.slotFull)); s.badge.list[0].setTint(GOODC).setAlpha(1); pop(self, s, 1.04);
        var ps = c.it.p ? Math.min(sh - 8, sz.b1 ? 44 : 36) : 0, x = -aw / 2 + 12 + 30 + 10;
        if (ps) { var p = pic(self, c.it.p, ps).setPosition(x + ps / 2, 0); s.add(p); x += ps + 8; }
        if (c.it.t) { var t = text(self, M.T(c.it.t), fs, { weight: 800, ox: 0, wrap: aw - (x + aw / 2) - 12, align: 'left' }).setPosition(x, 0); if (t.isAr) t.setOrigin(1, 0.5).setPosition(aw / 2 - 12, 0); s.add(t); }
        at++;
        if (at === n) done(!miss, s);
      }
      pool.forEach(function (c) { press(self, c, function () { pick(c); }, { sound: false, k: 0.96 }); });
      return { w: aw, h: total, cards: pool, keys: focusable(this, area, pool, pick), right: function () { return pool.filter(function (c) { return c.k === at && !c.off_; })[0]; } };
    },
    match: function (q, area, aw, ah, sz, done) {
      var self = this, sel = null, left = 0, miss = false, gx = 14, gy = 10, cw = (aw - gx) / 2;
      var o = { pic: sz.b1 ? 68 : 56, minH: 64 };
      var ls = q.pairs.map(function (p, k) { return { o: p.l, k: k, side: 0 }; });
      var rs = KQ.shuffle(q.pairs.map(function (p, k) { return { o: p.r, k: k, side: 1 }; }));
      var cards = [];
      for (var i = 0; i < ls.length; i++) [ls[i], rs[i]].forEach(function (x) { var c = answerCard(self, x.o, cw, sz, o); c.x_ = x; area.add(c); cards.push(c); });
      var h = 0, rows = [];
      for (var r = 0; r < cards.length; r += 2) rows.push([cards[r], cards[r + 1]]);
      var hh = grid(cards, 2, aw, gy); stretch(this, cards); center(cards, hh);
      function pick(c) {
        if (c.off_) return; self.qv.touched = true;
        if (!sel || sel.x_.side === c.x_.side) { if (sel) sel.state('n'); sel = c; c.state('sel'); K.snd.play('tap'); return; }
        var a = sel; sel = null;
        if (a.x_.k === c.x_.k) {
          K.snd.play('place'); [a, c].forEach(function (n) { n.state('lock'); n.setAlpha(0.75); n.off_ = true; pop(self, n, 1.05); });
          left++; if (left === q.pairs.length) done(!miss, c);
        } else {
          miss = true; K.snd.play('wrong'); K.buzz(20);
          [a, c].forEach(function (n) { n.state('bad'); shake(self, n); self.time.delayedCall(500, function () { if (!n.off_) n.state('n'); }); });
        }
      }
      cards.forEach(function (c) { press(self, c, function () { pick(c); }, { sound: false, k: 0.96 }); });
      return { w: aw, h: hh, cards: cards, keys: focusable(this, area, cards, pick), right: function () { var open = cards.filter(function (c) { return !c.off_; }); return sel ? open.filter(function (c) { return c !== sel && c.x_.k === sel.x_.k; })[0] : open[0]; } };
    },
    place: function (q, area, aw, ah, sz, done) {
      var self = this, sc = M.scenes[q.scene], locked = false;
      var w = Math.min(aw, ah * sc.w / sc.h), h = w * sc.h / sc.w, s = w / sc.w;
      var im = this.add.image(0, 0, 'scene/' + q.scene).setDisplaySize(w, h); area.add(im);
      var spots = (q.spots || Object.keys(sc.spots)).map(function (id) {
        var sp = sc.spots[id], c = self.add.container((sp.x - sc.w / 2) * s, (sp.y - sc.h / 2) * s);
        var dot = ui(self, 'spot').setDisplaySize(48, 48); c.add(dot); c.setSize(48, 48); c.dot = dot; c.id = id; c.homeX = c.x;
        area.add(c); return c;
      });
      function label(c, id) {
        var t = text(self, M.T(sc.spots[id].t), 14, { weight: 800, color: INK }), bg = ns(self, 'tag', t.width + 20, 26);
        bg.setPosition(0, 44 - 24 + 13); t.setPosition(0, 44 - 24 + 13); c.add([bg, t]);
        // keep the label on the picture
        var b = c.x + t.width / 2 + 10 - w / 2, a = c.x - t.width / 2 - 10 + w / 2;
        if (b > 0) { bg.x -= b; t.x -= b; } else if (a < 0) { bg.x -= a; t.x -= a; }
        area.bringToTop(c);
      }
      function pick(c) {
        if (locked) return; locked = true; self.qv.touched = true; stopBreath();
        var ok = c.id === q.correct, right = spots.filter(function (k) { return k.id === q.correct; })[0];
        spots.forEach(function (k) { k.off_ = true; if (k !== right && k !== c) k.setAlpha(0.35); });
        right.dot.setFrame('spot-good'); pop(self, right, 1.3); label(right, q.correct);
        if (!ok) { c.dot.setFrame('spot-bad'); shake(self, c); label(c, c.id); }
        done(ok, right);
      }
      spots.forEach(function (c) { press(self, c, function () { pick(c); }, { k: 0.85 }); });
      // the spots breathe now and then until one is tapped (no endless tween)
      var stopBreath = K.play.every(1800, 2600, function () { if (locked || reduced) return; spots.forEach(function (c) { self.tweens.add({ targets: c.dot, scale: c.dot.scale * 1.12, duration: 450, yoyo: true, ease: 'Sine.easeInOut' }); }); }, this);
      var at = -1;
      return { w: w, h: h, cards: [im], right: function () { return spots.filter(function (c) { return c.id === q.correct; })[0]; }, keys: { num: function (i) { if (spots[i]) pick(spots[i]); }, move: function (d) { at = (at + d + spots.length) % spots.length; spots.forEach(function (c, i) { c.setScale(i === at ? 1.3 : 1); }); }, go: function () { if (spots[at]) pick(spots[at]); } } };
    }
  };

  // ================================================================ Sheet: the stack of sheets
  function Sheets() { return KQ.game ? KQ.game.scene.getScene('Sheet') : null; }
  class SheetScene extends Phaser.Scene {
    constructor() { super('Sheet'); }
    create() {
      var self = this; this.stack = []; this.cur = null;
      rooted(this, function (g) { if (self.cur) self.cur.lay(g); });
      this.input.keyboard.on('keydown-ESC', function () { if (self.cur && self.cur.esc) self.cur.esc(); });
      this.input.keyboard.on('keydown-ENTER', function () { if (self.cur && self.cur.main) self.cur.main(); });
      this.input.keyboard.on('keydown-M', function () { if (self.cur) toggleSound(); });
    }
    top() { return this.cur; }
    under() { var p = this.scene.get('Play'); return p && (p.sys.isActive() || p.sys.isPaused()) && p.sys.settings.visible ? 'Play' : 'Map'; }
    // open a sheet: o = { title, text, stars, content(sheet, w) -> container with .h, buttons: [{ label, icon, primary, row, fn }],
    //                     close: fn (a close button), exit: true (the way out instead), esc }
    open(o) {
      var self = this, first = !this.cur;
      this.clear();
      if (first) { var u = this.down = o.under || this.under(); this.scene.pause(u); }
      K.snd.play('page');
      var s = this.cur = { o: o, items: [], btns: [] };
      var dim = this.add.image(0, 0, 'qz-ui', 'px').setTint(0x08051a).setAlpha(0.5).setOrigin(0).setInteractive(); s.items.push(dim);
      var panel = this.add.container(0, 0); s.items.push(panel); this.root.add([dim, panel]);
      var bg = ns(this, 'sheet', 10, 10); panel.add(bg);
      var badge = ui(this, 'badge').setDisplaySize(52, 52); panel.add(badge);
      var parts = [];
      var W = Math.min(420, this.g.W - 32 - this.g.l - this.g.r), inner = W - 44;
      if (o.title) parts.push(text(this, o.title, 30, { weight: 900, wrap: inner - (o.close ? 40 : 0) }));
      if (o.text) parts.push(text(this, o.text, 17, { weight: 700, color: DIM, wrap: inner }));
      var starsRow = null;
      if (o.stars != null) {
        starsRow = this.add.container(0, 0); starsRow.h = 96;
        for (var i = 0; i < 3; i++) (function (i) {
          var big = i === 1, sz = big ? 78 : 64, st = ui(self, i < o.stars ? 'star' : 'starw').setDisplaySize(sz, sz).setPosition((i - 1) * 76, big ? -10 + 8 : 8);
          if (i >= o.stars) st.setAlpha(0.28);
          var full = st.scaleX; st.setScale(0).setAngle(-40); starsRow.add(st);
          self.tweens.add({ targets: st, scale: full, angle: 0, delay: 350 + i * 330, duration: i < o.stars ? 500 : 300, ease: i < o.stars ? 'Back.easeOut' : 'Quad.easeOut',
            onStart: function () { if (i < o.stars) K.snd.play('star'); } });
        })(i);
        parts.push(starsRow);
      }
      if (o.content) { var cc = o.content(s, inner); if (cc) parts.push(cc); }
      var acts = [], row = null;
      (o.buttons || []).forEach(function (b) {
        var btn = bigBtn(self, b.label, b.icon, function () { if (b.keep) { b.fn(); return; } self.close(); if (b.fn) b.fn(); }, { primary: b.primary, w: inner });
        btn.def = b; s.btns.push(btn);
        if (b.row) { if (!row) { row = []; acts.push(row); } row.push(btn); } else { row = null; acts.push([btn]); }
        if (b.primary && !s.main) s.main = function () { self.close(); if (b.fn) b.fn(); };
      });
      if (acts.length) {
        var ac = this.add.container(0, 0), y = 0;
        acts.forEach(function (r, ri) {
          var bw = (inner - 10 * (r.length - 1)) / r.length, hh = Math.max.apply(null, r.map(function (b) { return b.h + (b.primary ? 6 : 0); }));
          r.forEach(function (b, j) { b.fit(bw); b.setPosition(-inner / 2 + j * (bw + 10) + bw / 2, y + b.h / 2); ac.add(b); });
          y += hh + 10;
        });
        ac.h = y - 10; ac.top = 18; parts.push(ac);
      }
      parts.forEach(function (p) { panel.add(p); });
      if (o.close) { s.x = iconBtn(this, 'cross', function () { self.close(); o.close(); }); panel.add(s.x); }
      if (o.exit) { s.ex = iconBtn(this, 'exit', function () { leave(); }); s.items.push(s.ex); this.root.add(s.ex); }
      s.esc = o.esc || (o.close ? function () { self.close(); o.close(); } : null);
      s.lay = function (g) {
        dim.setDisplaySize(g.W + 2, g.H + 2).setPosition(-1, -1);
        var y = 30;
        parts.forEach(function (p, i) {
          var ph = p.h != null ? p.h : p.height, gapTop = p.top != null ? p.top : i ? (p === starsRow ? 10 : 8) : 6;
          y += gapTop;
          if (p.h != null) p.setPosition(0, y + (p === starsRow ? ph / 2 : 0)); else p.setPosition(0, y + ph / 2);
          y += ph;
        });
        var H = y + 20, availH = g.H - g.t - g.b - 32 - 28, k = Math.min(1, availH / H, (g.W - g.l - g.r - 32) / W);
        bg.fitTo(W, H).setPosition(0, H / 2);
        badge.setPosition(0, 0);
        if (s.x) s.x.setPosition(W / 2 - 12 - 23, 12 + 23);
        panel.setScale(k).setPosition(g.l + (g.W - g.l - g.r) / 2, g.t + 16 + 28 + Math.max(0, (availH - H * k) / 2));
        s.H = H;
        if (s.ex) s.ex.setPosition(g.l + 10 + 23, g.t + 10 + 23);
      };
      s.lay(this.g);
      panel.setAlpha(0); var py = panel.y; panel.y += 24; var pk = panel.scale; panel.setScale(pk * 0.92);
      this.tweens.add({ targets: panel, alpha: 1, y: py, scale: pk, duration: 350, ease: 'Back.easeOut' });
      dim.setAlpha(0); this.tweens.add({ targets: dim, alpha: 0.5, duration: 250 });
      s.panel = panel;
      return s;
    }
    clear() { if (this.cur) { this.cur.items.forEach(function (i) { i.destroy(); }); this.cur = null; } }
    close() {
      if (!this.cur) return;
      this.clear();
      var u = this.down || this.under(); this.down = null; this.scene.resume(u);
    }

    // who is playing, and the language
    band(closeable) {
      var self = this, L = M.L();
      this.open({
        title: L.bandTitle, close: closeable ? function () {} : null, exit: !closeable,
        content: function (s, w) {
          var c = self.add.container(0, 0), y = 14;
          var lw = (w - 10) / 2;
          [['en', 'English'], ['bn', 'বাংলা']].forEach(function (l, i) {
            var b = self.add.container(-w / 2 + i * (lw + 10) + lw / 2, y + 25), bg = ns(self, l[0] === M.lang ? 'btnon' : 'btn2', lw, 50), t = text(self, l[1], 18, { weight: 900 });
            b.add([bg, t]); b.setSize(lw, 50);
            press(self, b, function () { M.setLang(l[0]); self.band(closeable); var m = self.scene.get('Map'); if (M.band && m.built) m.build(); });
            c.add(b);
          });
          y += 50 + 16;
          M.BANDS.forEach(function (b) {
            var row = self.add.container(0, y + 40), bg = ns(self, b === M.band ? 'btnon' : 'btn2', w, 80), ic = ui(self, 'band' + b).setDisplaySize(58, 58).setPosition(-w / 2 + 16 + 29, 0);
            var nm = text(self, L.bands[b - 1], 20, { weight: 900, ox: 0, oy: 1 }).setPosition(-w / 2 + 16 + 58 + 14, 2);
            var ag = text(self, L.ages[b - 1], 14, { weight: 700, color: DIM, ox: 0, oy: 0 }).setPosition(-w / 2 + 16 + 58 + 14, 4);
            row.add([bg, ic, nm, ag]); row.setSize(w, 80);
            press(self, row, function () { M.setBand(b); self.close(); var m = self.scene.get('Map'); m.build(); }, { k: 0.97 });
            c.add(row); y += 80 + 10;
          });
          c.h = y - 10; c.top = 4; return c;
        }
      });
    }
    // stickers won while playing
    stickers() {
      var self = this, L = M.L(), have = M.cards(), cards = M.cfg.cards;
      need(this, cards.map(function (c) { return 'p/' + c.p; }), function () {
        self.open({
          title: L.stickers, close: function () {},
          content: function (s, w) {
            var c = self.add.container(0, 0), cols = Math.max(2, Math.min(4, Math.floor((w + 10) / 114))), cw = (w - 10 * (cols - 1)) / cols, y = 14;
            cards.forEach(function (cd, i) {
              var got = have[cd.id], x = -w / 2 + (i % cols) * (cw + 10) + cw / 2, yy = y + Math.floor(i / cols) * 118 + 54;
              var t = self.add.container(x, yy), bg = got ? ns(self, 'c-n', cw + 8, 108 + 8) : ns(self, 'btn2', cw, 108);
              var p = pic(self, cd.p, 64).setPosition(0, -14);
              if (!got) p.setTint(0x6b6b6b).setAlpha(0.6);
              var nm = text(self, got ? M.T(cd.t) : '?', 14, { weight: 800, color: got ? INK : DIM, wrap: cw - 10 }).setPosition(0, 34);
              t.add([bg, p, nm]); t.setSize(cw, 108);
              press(self, t, function () {
                if (!got) { K.snd.play('locked'); wobble(self, t); return; }
                self.card(cd);
              }, { sound: got ? 'tap' : false });
              c.add(t);
            });
            var rows = Math.ceil(cards.length / cols); y += rows * 118;
            var note = text(self, L.stickerLocked, 14, { weight: 700, color: DIM, wrap: w }).setPosition(0, y + 12); c.add(note);
            c.h = y + 24 + note.height / 2; c.top = 0; return c;
          }
        });
      });
    }
    card(cd) {
      var self = this, L = M.L();
      M.item(M.cfg.id + ':' + cd.id);
      need(this, ['p/' + cd.p], function () {
        self.open({
          title: M.T(cd.t), close: function () {},
          content: function (s, w) {
            var c = self.add.container(0, 0), p = pic(self, cd.p, 150).setPosition(0, 10 + 75); c.add(p);
            var h = 10 + 150;
            if (cd.d) { var t = text(self, M.T(cd.d), 18, { weight: 700, wrap: w }); t.setPosition(0, h + 10 + t.height / 2); c.add(t); h += 10 + t.height; }
            c.h = h; c.top = 6; return c;
          },
          buttons: [{ label: L.stickers, icon: 'book', fn: function () { self.stickers(); } }]
        });
        if (cd.d) Say.text(M.T(cd.d), M.lang);
      });
    }
    lightning() {
      var self = this, L = M.L(), best = M.best();
      this.open({ title: L.lightning, text: L.lightningText + (best ? ' ' + L.best + ': ' + M.fmtTime(best) : ''), close: function () {},
        buttons: [{ label: L.go, icon: 'play', primary: true, fn: function () { startStop(self.scene.get('Map'), 0, true); } }] });
    }
    // the pause sheet (game-ui-ux: everything that is not the game lives here)
    pause(play) {
      var self = this, L = M.L(), quick = play.quick, untouched = play.pos === 0 && !Object.keys(play.firstTry).length;
      var title = quick ? L.lightning : M.T(M.cfg.stopName) + ' ' + M.num(play.n);
      var s = this.open({
        title: title, text: quick || untouched ? null : L.leaveText, exit: true, esc: function () { self.close(); },
        buttons: [
          { label: L.stay, icon: 'play', primary: true },
          { label: quick || untouched ? L.map : L.quit, icon: 'map', fn: function () { backToMap(play); } },
          { label: K.snd.muted ? L.soundOff : L.soundOn, icon: K.snd.muted ? 'soundOff' : 'sound', keep: true, fn: function () { toggleSound(); } }
        ]
      });
      // the sound button shows its state as words too
      var sb = s.btns.filter(function (o) { return o.def.keep; })[0];
      s.snd = function () { if (!sb) return; sb.setLabel(K.snd.muted ? L.soundOff : L.soundOn); if (sb.i) sb.i.setFrame('i-' + (K.snd.muted ? 'soundOff' : 'sound')).setDisplaySize(24, 24); };
      s.snd();
    }
    done(n, res) {
      var self = this, L = M.L(), cfg = M.cfg, st = res.stars, last = n >= cfg.stops || cfg.daily, buttons = [];
      var map = this.scene.get('Map');
      if (!last) buttons.push({ label: M.T(cfg.stopName) + ' ' + M.num(n + 1), icon: 'next', primary: true, fn: function () { startStop(map, n + 1); } });
      if (st < 3 && !cfg.daily) buttons.push({ label: L.again, icon: 'restart', primary: last, row: !last, fn: function () { startStop(map, n); } });
      var allThree = M.doneCount() === cfg.stops && M.totalStars() === cfg.stops * 3, up = M.BANDS[M.BANDS.indexOf(M.band) + 1];
      if (allThree && up) buttons.unshift({ label: L.tryBand + ' ' + L.bands[up - 1], icon: 'next', primary: true, fn: function () { M.setBand(up); map.build(); } });
      buttons.push({ label: L.map, icon: 'map', row: !last && st < 3, primary: last && (st === 3 || cfg.daily) && !(allThree && up) });
      var line = cfg.daily ? L.todayDone : M.T(cfg.stopName) + ' ' + M.num(n) + (cfg.doneText ? ' · ' + M.T(cfg.doneText(M.doneCount(), cfg.stops)) : '');
      var fresh = res.fresh;
      need(this, fresh.map(function (c) { return 'p/' + c.p; }), function () {
        self.open({ title: st === 3 ? L.perfect : L.done, text: line, stars: st, buttons: buttons, under: 'Map', esc: function () { self.close(); },
          content: fresh.length ? function (s, w) {
            var c = self.add.container(0, 0), h = text(self, L.newSticker, 18, { weight: 900, color: (M.theme.accent || ['#f6c453'])[0] }).setPosition(0, 10 + 12); c.add(h);
            fresh.forEach(function (cd, i) {
              var x = (i - (fresh.length - 1) / 2) * 140, t = self.add.container(x, 34 + 8 + 54), bg = ns(self, 'c-n', 130 + 8, 108 + 8), p = pic(self, cd.p, 64).setPosition(0, -14);
              var nm = text(self, M.T(cd.t), 14, { weight: 800, color: INK, wrap: 120 }).setPosition(0, 34);
              t.add([bg, p, nm]); t.setSize(130, 108); c.add(t);
              t.setScale(0); self.tweens.add({ targets: t, scale: 1, delay: 900, duration: 500, ease: 'Back.easeOut' });
              press(self, t, function () { M.item(cfg.id + ':' + cd.id); pop(self, t, 1.08); });
            });
            c.h = 34 + 8 + 108 + 6; c.top = 6; return c;
          } : null });
        confetti(self);
      });
    }
    quickDone(ms, r) {
      var self = this, L = M.L(), map = this.scene.get('Map');
      this.open({ title: r.best && r.old ? L.newBest : L.done, text: L.time + ': ' + M.fmtTime(ms) + (r.old ? ' · ' + L.best + ': ' + M.fmtTime(Math.min(r.old, ms)) : ''),
        under: 'Map', esc: function () { self.close(); },
        buttons: [{ label: L.again, icon: 'restart', primary: true, fn: function () { startStop(map, 0, true); } },
                  { label: L.map, icon: 'map' }] });
      if (r.best) confetti(this);
    }
  }
  function backToMap(play, n) {
    stopVoices();
    var g = play.game, m = g.scene.getScene('Map'); m.focus = n;
    g.scene.stop('Play'); g.scene.wake('Map');
  }

  // ================================================================ offline
  // After one visit a quiz plays offline: its page and scripts, the engine, its sounds, every recitation clip and every
  // picture its questions and stickers use (not only the ones already seen), kept by the shared service worker (sw.js, CACHE_URLS).
  function offline(cfg) {
    var Q = location.search;
    if (!('serviceWorker' in navigator) || location.pathname.indexOf('/KidsGames/') !== 0 || /[?&](nosw|debug)\b/.test(Q)) return;
    if (navigator.connection && navigator.connection.saveData) return;
    navigator.serviceWorker.register('/KidsGames/sw.js').catch(function () {});
    navigator.serviceWorker.ready.then(function (reg) { return new Promise(function (r) { setTimeout(function () { r(reg); }, 4000); }); }).then(function (reg) {
      var th = M.theme, urls = [location.pathname, 'data.js', '/KidsGames/js/kahf-bridge.js', '/KidsGames/js/vendor/phaser-4.2.1.min.js',
        '/KidsGames/js/kit/core.js', '/KidsGames/js/kit/sound.js', '/KidsGames/js/kit/play.js', '/KidsGames/js/kit/load.js', '/KidsGames/js/kit/praise-clips.js',
        '/KidsGames/js/quiz/quiz.js', '/KidsGames/js/quiz/themes.js', '/KidsGames/js/quiz/catalog.js', '/KidsGames/js/quiz/game.js',
        '/KidsGames/js/quiz/surahs.js', '/KidsGames/js/quiz/scenes.js', AUD + 'sfx.json', AUD + 'sfx.m4a', '/KidsGames/fonts/nunito-400-800.woff2'];
      ['lit', 'open', 'locked'].forEach(function (st) { urls.push(IMG + 'stop/' + th.name + '-' + st + '.webp', IMG + 'stop/' + th.name + '-' + st + '-b.webp'); });
      urls.push(IMG + 'decor/' + th.name + '.webp'); if (th.sky) urls.push(IMG + 'sky/' + th.sky + '.webp');
      if (th.orb === 'moon') for (var i = 1; i <= 29; i++) urls.push(IMG + 'sky/moon-' + i + '.webp'); else if (th.orb) urls.push(IMG + 'sky/' + th.orb + '.webp');
      var seen = {};
      (cfg.bank || []).forEach(function (q) { qPics(q).forEach(function (k) { seen[k] = 1; }); [].concat(q.audio || []).forEach(function (u) { urls.push(u); }); });   // (recited ayat too)
      (cfg.cards || []).forEach(function (c) { seen['p/' + c.p] = 1; });
      Object.keys(seen).forEach(function (k) { urls.push(IMG + k + '.webp'); });
      var abs = function (u) { return new URL(u, location.href).pathname; }, sw = reg.active || navigator.serviceWorker.controller;
      urls = urls.map(abs).filter(function (u, i, all) { return all.indexOf(u) === i; });
      if (sw) sw.postMessage({ type: 'CACHE_URLS', urls: urls });
    }).catch(function () {});
  }

  // ================================================================ start
  KQ.play = function (cfg) {
    if (!cfg) return;
    M = KQ.model(cfg, K);
    offline(cfg);
    var game = KQ.game = K.play.start({ scenes: [Boot, MapScene, PlayScene, SheetScene], color: M.theme.bg[0], rest: { ms: 0 }, textures: 8, msaa: false });   // (sleeps on the first calm frame: a quiz has nothing that needs the kit's 700 ms tail)
    if (DEBUG) window.QZT = {
      ready: function () { var m = game.scene.getScene('Map'); return !!(m && m.built && K.load.gone); },
      M: function () { return M; },
      where: function (what) {
        var sh = Sheets(), p = game.scene.getScene('Play'), m = game.scene.getScene('Map');
        if (what === 'play') return screenOf(m, m.playBtn);
        if (what === 'next') return p && p.fb ? screenOf(p, p.fb.next) : null;
        if (what === 'first') { if (!p || !p.qv || !p.sys.isActive()) return null; var c = (p.qv.cards || []).filter(function (k) { return !k.off_ && k.input; })[0] || (p.areaC && p.areaC.list.filter(function (k) { return k.input && !k.off_; })[0]); return c ? screenOf(p, c) : null; }
        if (/^nth:/.test(what)) { if (!p || !p.qv || !p.sys.isActive() || p.fb) return null; var all = p.areaC.list.filter(function (k) { return k.input && !k.off_ && k.input.enabled; }); return all.length ? screenOf(p, all[+what.slice(4) % all.length]) : null; }
        if (what === 'right') return p && p.qv && p.sys.isActive() && !p.fb && p.qv.right && p.qv.right() ? screenOf(p, p.qv.right()) : null;
        if (what === 'sheet') return sh && sh.cur ? true : null;
        if (what === 'pause') return p && p.sys.isActive() ? screenOf(p, p.bPause) : null;
        if (what === 'cards') return screenOf(m, m.bCards);
        if (what === 'bolt') return m.bBolt && m.bBolt.visible ? screenOf(m, m.bBolt) : null;
        if (what === 'chip') return screenOf(m, m.chip);
        if (/^btn\d$/.test(what)) { var b = sh && sh.cur && sh.cur.btns[+what.slice(3)]; return b ? screenOf(sh, b) : null; }
        return null;
      },
      scenes: function () { return game.scene.getScenes(true).map(function (s) { return s.sys.settings.key; }); }
    };
    return game;
  };
})();
