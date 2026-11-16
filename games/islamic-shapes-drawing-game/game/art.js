/* Colouring Book: the paint box. The look is the old book's, kept: a night sky in each book's colours with a faint
   lattice of 8-point stars, a warm paper page with a gold edge, round paint pots, and plain round buttons on dark plates.
   Everything here is a plain interface shape, painted once into the engine's canvas texture (Kit.play.tex), one texture
   pixel per design unit (icons: a 24-unit grid drawn at 4x). Nothing is painted per frame. The one picture that
   changes, the progress ring, is repainted only when the number of finished shapes moves (CBArt.ring).
   The colouring itself (fills, brush strokes) is not here: it goes into the engine's DynamicTextures (game/paint.js).
   Icons use Path2D with SVG path data (the old inline SVGs), ink white so a Tint recolours them; the pots are
   colour-specific and are one atlas of 21 frames. No faces. */
(function () {
  'use strict';
  var COLOURS = ['#e8413c', '#ff7a3d', '#ffb53a', '#ffe14d', '#b7e35a', '#4cbb5e', '#1f8a5b',
    '#3cc8c0', '#5ec5f5', '#2f7de1', '#3b4cb8', '#8a54d6', '#d775e8', '#ff7eb6',
    '#ffc2d6', '#e0b884', '#a0643a', '#5b3a29', '#9aa3ad', '#2a2a3a', '#ffffff'];
  var INTS = COLOURS.map(function (c) { return parseInt(c.slice(1), 16); });
  var painted = false, STAR = 'M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z';

  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k); }
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function P(d) { return new Path2D(d); }

  // every small picture is a frame of one atlas texture 'ui' (one batch: the whole interface draws with one texture bind)
  function paint(scene) {
    if (painted) return; painted = true;
    var tex = Kit.play.tex, BG = window.CBModel.BOOKS, parts = [];
    var add = function (name, w, h, draw) { parts.push({ n: name, w: w, h: h, d: draw }); };

    // ---- plates and pills (dark, readable on any sky; the selected one is gold) ----
    add('ui-plate', 150, 150, function (c) { c.fillStyle = 'rgba(14,10,34,.72)'; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 4; c.stroke(); });
    add('ui-plate-on', 150, 150, function (c) {
      var g = c.createLinearGradient(0, 5, 0, 145); g.addColorStop(0, '#fff1c2'); g.addColorStop(1, '#f6c453');
      c.fillStyle = g; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.stroke();
    });
    add('ui-pill', 340, 150, function (c) { c.fillStyle = 'rgba(14,10,34,.72)'; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 4; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); c.stroke(); });
    add('ui-pill-gold', 340, 150, function (c) {
      var g = c.createLinearGradient(0, 5, 0, 145); g.addColorStop(0, '#fff1c2'); g.addColorStop(1, '#f6c453');
      c.fillStyle = g; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.stroke();
    });
    add('ui-big', 280, 280, function (c) { var g = c.createLinearGradient(0, 6, 0, 274); g.addColorStop(0, '#fff1c2'); g.addColorStop(1, '#f6c453'); c.fillStyle = g; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); });
    add('ui-px', 8, 8, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 8, 8); });
    add('ui-thumb', 220, 220, function (c) { c.fillStyle = '#fffdf7'; c.beginPath(); c.roundRect(4, 4, 212, 212, 34); c.fill(); });
    add('ui-thumb-edge', 220, 220, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.roundRect(4, 4, 212, 212, 34); c.stroke(); });

    // ---- icons: a 24-unit grid at 4x (96 px), white, recoloured by Tint ----
    var icon = function (k, draw) {
      add(k, 96, 96, function (c) {
        c.scale(4, 4); c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round'; draw(c);
      });
    };
    icon('ic-exit', function (c) { Kit.play.exitIcon(c, 24, '#fff', 2.4); });                       // the way out of the game (kit's exit icon)
    icon('ic-back', function (c) { c.lineWidth = 2.6; c.beginPath(); c.moveTo(14, 6); c.lineTo(8, 12); c.lineTo(14, 18); c.stroke(); });     // one screen back
    icon('ic-pause', function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); });
    icon('ic-play', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); });
    icon('ic-retry', function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); });
    icon('ic-close', function (c) { c.lineWidth = 2.6; c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); });
    icon('ic-tick', function (c) { c.lineWidth = 2.8; c.beginPath(); c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19, 7); c.stroke(); });
    icon('ic-next', function (c) { c.lineWidth = 2.8; c.beginPath(); c.moveTo(5, 12); c.lineTo(19, 12); c.moveTo(13, 6); c.lineTo(19, 12); c.lineTo(13, 18); c.stroke(); });
    icon('ic-snd', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); });
    icon('ic-mute', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); });
    icon('ic-book', function (c) { c.stroke(P('M3 5.5c3-1.6 6-1.6 9 .6 3-2.2 6-2.2 9-.6v13c-3-1.5-6-1.5-9 .7-3-2.2-6-2.2-9-.7z')); c.stroke(P('M12 6.1v13.1')); });
    icon('ic-save', function (c) {
      c.beginPath(); c.roundRect(2.5, 5.5, 15, 14, 2); c.stroke(); c.stroke(P('M2.5 17l4.5-4.5 3.5 3.5 2-2 5 5'));
      c.beginPath(); c.arc(8, 10, 1.4, 0, 7); c.fill();
      c.fillStyle = '#f6c453'; c.beginPath(); c.arc(19, 6, 4.4, 0, 7); c.fill();
      c.strokeStyle = '#2a1606'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(19, 3.8); c.lineTo(19, 8.2); c.moveTo(16.8, 6); c.lineTo(21.2, 6); c.stroke();
    });
    icon('ic-pics', function (c) { c.beginPath(); c.roundRect(3.5, 4.5, 17, 15, 2.2); c.stroke(); c.stroke(P('M3.5 16.5l5-5 4 4 2.5-2.5 5.5 5.5')); c.beginPath(); c.arc(9, 9.5, 1.5, 0, 7); c.fill(); });
    icon('ic-undo', function (c) { c.stroke(P('M9 14 4 9l5-5')); c.stroke(P('M4 9h10.5a5.5 5.5 0 0 1 0 11H11')); });
    icon('ic-redo', function (c) { c.stroke(P('m15 14 5-5-5-5')); c.stroke(P('M20 9H9.5a5.5 5.5 0 0 0 0 11H13')); });
    icon('ic-fill', function (c) { c.stroke(P('M3.5 11.5 10 5l7 7-6.5 6.5a1.5 1.5 0 0 1-2.1 0l-4.9-4.9a1.5 1.5 0 0 1 0-2.1z')); c.stroke(P('M7 8 4.6 3.4')); c.stroke(P('M4.3 12.2h11.3')); });
    icon('ic-drop', function (c) { c.lineWidth = 1.4; c.fill(P('M19.6 13.5c1.3 1.8 2 3.1 2 4a2 2 0 0 1-4 0c0-.9.7-2.2 2-4z')); c.stroke(P('M19.6 13.5c1.3 1.8 2 3.1 2 4a2 2 0 0 1-4 0c0-.9.7-2.2 2-4z')); });
    icon('ic-brush', function (c) { c.stroke(P('M20.5 3.5 12 12')); c.lineWidth = 3; c.stroke(P('m10.5 10.5 3 3')); });
    icon('ic-tip', function (c) { c.lineWidth = 1.5; c.fill(P('M9.6 13.2c-2.2-.3-4 1.3-4.2 3.6-.1 1.2-.8 2.3-2.4 2.9 3.2 1.4 7.3.8 8.3-2.3.5-1.6-.2-3.6-1.7-4.2z')); c.stroke(P('M9.6 13.2c-2.2-.3-4 1.3-4.2 3.6-.1 1.2-.8 2.3-2.4 2.9 3.2 1.4 7.3.8 8.3-2.3.5-1.6-.2-3.6-1.7-4.2z')); });
    icon('ic-eraser', function (c) { c.fillStyle = 'rgba(255,140,180,.8)'; c.fill(P('M14.5 3.8 20.2 9.5a1.6 1.6 0 0 1 0 2.2L12 20H7.2l-3.4-3.4a1.6 1.6 0 0 1 0-2.2L12.3 3.8a1.6 1.6 0 0 1 2.2 0z')); c.stroke(P('M14.5 3.8 20.2 9.5a1.6 1.6 0 0 1 0 2.2L12 20H7.2l-3.4-3.4a1.6 1.6 0 0 1 0-2.2L12.3 3.8a1.6 1.6 0 0 1 2.2 0z')); c.stroke(P('m8.5 9.5 6.5 6.5M12 20h8')); });
    [2.6, 4.8, 7.4].forEach(function (r, i) {
      icon('ic-s' + i, function (c) { c.beginPath(); c.arc(12, 12, r, 0, 7); c.fill(); c.globalAlpha = 0.45; c.lineWidth = 1.4; c.setLineDash([2, 2.6]); c.beginPath(); c.arc(12, 12, 10.4, 0, 7); c.stroke(); });
    });
    icon('ic-zoom', function (c) { c.lineWidth = 2.4; c.beginPath(); c.arc(10.5, 10.5, 6.5, 0, 7); c.stroke(); c.beginPath(); c.moveTo(15.5, 15.5); c.lineTo(21, 21); c.moveTo(7.5, 10.5); c.lineTo(13.5, 10.5); c.stroke(); });


    // ---- the paint pots (a round tin seen from above with a glossy pool of paint), the stars, the brush tip, sparkles ----
    COLOURS.forEach(function (hex, i) {
      add('pot' + i, 96, 96, function (c) {
        c.scale(2, 2);
        c.fillStyle = '#8f88ab'; c.fill(P('M5 25v7c0 7 8.5 12.5 19 12.5S43 39 43 32v-7'));
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(P('M5 25v7c0 7 8.5 12.5 19 12.5'));
        c.fillStyle = '#e9e5f5'; c.beginPath(); c.ellipse(24, 25, 19, 13, 0, 0, 7); c.fill();
        c.fillStyle = shade(hex, -0.28); c.beginPath(); c.ellipse(24, 25.6, 15.6, 10.2, 0, 0, 7); c.fill();
        c.fillStyle = hex; c.beginPath(); c.ellipse(24, 24.6, 15.2, 9.6, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.6; c.lineCap = 'round'; c.stroke(P('M13 21.5c3-3.2 8-4.4 12-4'));
        c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(31, 28.5, 1.6, 0, 7); c.fill();
      });
    });
    add('pot-ring', 120, 120, function (c) {
      c.lineWidth = 7; c.strokeStyle = 'rgba(246,196,83,.95)'; c.beginPath(); c.arc(60, 60, 54, 0, 7); c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#fff'; c.beginPath(); c.arc(60, 60, 54, 0, 7); c.stroke();
    });
    add('ui-star', 96, 96, function (c) { c.translate(48, 48); c.scale(0.96, 0.96); c.fillStyle = '#f6c453'; c.strokeStyle = '#7a4a12'; c.lineWidth = 5; c.lineJoin = 'round'; var s = P(STAR); c.fill(s); c.stroke(s); });
    add('fx-star', 64, 64, function (c) { c.translate(32, 32); c.scale(0.64, 0.64); c.fillStyle = '#fff'; c.fill(P(STAR)); });
    add('fx-dot', 32, 32, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(16, 16, 15, 0, 7); c.fill(); });
    add('cb-brush', 64, 64, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill(); });
    add('fx-sweep', 256, 8, function (c) { var g = c.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,220,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 8); });

    // ---- pack: rows of 2048, 3 px between pictures (so a scaled one never shows its neighbour) ----
    var W = 2048, x = 0, y = 0, rowH = 0, GUT = 3;
    parts.forEach(function (p) {
      if (x + p.w > W) { x = 0; y += rowH + GUT; rowH = 0; }
      p.x = x; p.y = y; x += p.w + GUT; rowH = Math.max(rowH, p.h);
    });
    var H = y + rowH;
    tex(scene, 'ui', W, H, function (c) {
      parts.forEach(function (p) { c.save(); c.translate(p.x, p.y); c.beginPath(); c.rect(0, 0, p.w, p.h); c.clip(); p.d(c); c.restore(); });
    });
    var t = scene.textures.get('ui');
    parts.forEach(function (p) { t.add(p.n, 0, p.x, p.y, p.w, p.h); });

    tex(scene, 'ui-card', 1500, 1040, function (c) { c.fillStyle = 'rgba(14,10,34,.94)'; c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 4; c.beginPath(); c.roundRect(2, 2, 1496, 1036, 60); c.fill(); c.stroke(); });

    // ---- the page: a rounded paper with a soft shadow and a thin gold edge, and the rounded mask the page camera cuts to ----
    tex(scene, 'paper', 1000, 1000, function (c) {
      c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 56; c.shadowOffsetY = 18;
      c.fillStyle = '#fffdf7'; c.fillRect(0, 0, 1000, 1000);
      c.shadowColor = 'transparent';
      c.lineWidth = 3; c.strokeStyle = 'rgba(246,196,83,.55)'; c.strokeRect(-1.5, -1.5, 1003, 1003);
    }, 90);

    // ---- the sky: a gradient per book, a lattice of 8-point stars that tiles, a glow behind the page, a vignette ----
    BG.forEach(function (b) {
      tex(scene, 'bg-' + b.id, 8, 256, function (c) { var g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, b.sky[0]); g.addColorStop(1, b.sky[1]); c.fillStyle = g; c.fillRect(0, 0, 8, 256); });
    });
    var STEP = 230;
    tex(scene, 'bg-lat', STEP, STEP * 2, function (c) {
      c.strokeStyle = 'rgba(255,240,210,.09)'; c.lineWidth = 2.4;
      var star = function (x, y, r) {
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {       // drawn again across the tile's edges so it tiles
          c.save(); c.translate(x + dx * STEP, y + dy * STEP * 2);
          c.beginPath(); for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? r * 0.72 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.stroke();
          c.beginPath(); c.arc(0, 0, STEP * 0.12, 0, 7); c.stroke(); c.restore();
        }
      };
      star(0, 0, STEP * 0.34); star(STEP / 2, STEP, STEP * 0.34);
    });
    tex(scene, 'fx-glow', 256, 256, function (c) { var g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    tex(scene, 'fx-vig', 256, 256, function (c) { var g = c.createRadialGradient(128, 128, 90, 128, 128, 190); g.addColorStop(0, 'rgba(5,3,20,0)'); g.addColorStop(1, 'rgba(5,3,20,.55)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    // the progress ring: repainted by CBArt.ring when the count moves
    // (not through Kit.play.tex: it is repainted, so it stays a live canvas and is never baked)
    var rc = document.createElement('canvas'); rc.width = rc.height = 96;
    scene.textures.addCanvas('ui-ring', rc); ringKey = ''; ring(scene, 0, false);
  }

  // Progress ring with a star in the middle (f 0..1, done = gold).
  var ringKey = '';
  function ring(scene, f, done) {
    var k = Math.round(Math.max(0, Math.min(1, f)) * 100) + (done ? 'd' : '');
    if (k === ringKey) return false; ringKey = k;
    var t = scene.textures.get('ui-ring'), c = t.getSourceImage().getContext('2d');
    c.clearRect(0, 0, 96, 96);
    c.lineWidth = 10; c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.arc(48, 48, 38, 0, 7); c.stroke();
    var a = Math.max(0, Math.min(1, f));
    if (a > 0) { c.strokeStyle = done ? '#f6c453' : '#8fe3a0'; c.beginPath(); c.arc(48, 48, 38, -Math.PI / 2, -Math.PI / 2 + a * Math.PI * 2); c.stroke(); }
    c.save(); c.translate(48, 48); var s = done ? 0.4 : 0.3; c.scale(s, s);
    c.fillStyle = done ? '#f6c453' : 'rgba(255,255,255,.4)'; c.strokeStyle = '#7a4a12'; c.lineWidth = done ? 5 : 0; c.lineJoin = 'round';
    var p = new Path2D(STAR); c.fill(p); if (done) c.stroke(p); c.restore();
    t.source[0].update();
    return true;
  }

  // the interface's unit for this game: a 150-unit button is 44 screen points on every screen (the old game's buttons were
  // 37 to 46 px), never enlarged on a tablet or computer, so the page gets the room
  function ui(v) { return 44 * v.pt / 150; }
  window.CBArt = { COLOURS: COLOURS, INTS: INTS, paint: paint, ring: ring, ui: ui, resetRing: function () { ringKey = ''; } };
})();
