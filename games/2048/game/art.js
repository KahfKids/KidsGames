/* 2048 Garden: art.js, the paint box.
   The look is the old game's, kept: three garden scenes in layers (sky, distant domes, an arcade with cypress trees, a
   garden floor with a water channel, flowering bushes), a carved marble tray, glossy glazed tiles whose colour and
   pattern deepen as the number grows, garden stones. No faces anywhere.
   Everything is painted ONCE into the engine's canvas textures (Kit.play.tex), never per frame
   (docs/phaser-standard.md section 3). Nothing here is a picture of a person or animal.
   - The interface (icons, plates, stars, sparks) is one atlas, 'g48ui', painted at Boot.
   - A world's scenery is a few strips (sky, far, mid, near) painted when a level of that world starts; the engine's
     TileSprite repeats them across any screen, so a phone held either way is covered. Other worlds' strips are let go.
   - The tray and the tiles are painted for the size they are shown at on this screen (one texture pixel per canvas
     pixel, so the numbers stay sharp) and again only when the screen shape changes.
   Sizes below are design units (the 1920 x 1080 space of Kit.play.fit); `u` is texture pixels per design unit. */
(function () {
  'use strict';
  var A = window.G48Art = {};

  // ---------- helpers ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rgba(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function star8(ctx, x, y, r, inner, rot) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2 + (rot || 0), q = i % 2 ? r * (inner || 0.62) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  var UU = 1;                                                                        // texture pixels per design unit while painting: a canvas shadow's blur and offset are in pixels, not scaled by the transform
  A.shade = shade; A.mix = mix; A.rgba = rgba;
  A.int = function (c) { var h = hex(c); return (h[0] << 16) | (h[1] << 8) | h[2]; };

  // ---------- worlds ----------
  A.WORLDS = [
    { // Morning Garden: soft blue morning, cream arcade, mint and jasmine
      sky: ['#7cc6ef', '#b9e4f3', '#e9f5ee', '#fff0d2'], sun: '#fffbe8', haze: '#cfe7ea', domes: '#b7d3d8',
      wall: '#f6e8cf', wallShade: '#d9c2a0', arch: ['#5f8f8b', '#88b3a6'], band: ['#2fae96', '#f2b84b', '#3d7fd6'],
      cypress: '#2f6b4f', lawn: ['#8fcf86', '#5fae6b'], water: ['#9fe3ef', '#4eb6cf'], bush: '#3f8f5a',
      flowers: ['#ffffff', '#ffd1e0', '#ffe27a'], lantern: '#ffd27a',
      slab: ['#fbf3e3', '#ecdcbf'], slabEdge: '#cdb38b', socket: ['#e4d3b3', '#efe2c9'], accent: '#2fae96' },
    { // Fountain Court: bright afternoon, turquoise zellige
      sky: ['#3fa6e6', '#86cdf0', '#cdeef3', '#f8f1dc'], sun: '#fffdf0', haze: '#bfe0ea', domes: '#9cc6d6',
      wall: '#f3e3c6', wallShade: '#d1b88f', arch: ['#2f6f8a', '#5c9fb3'], band: ['#1f9fc4', '#ffffff', '#f2a93b'],
      cypress: '#245c4a', lawn: ['#7cc79a', '#4c9e74'], water: ['#8ee0f0', '#2f9fc4'], bush: '#2f7f62',
      flowers: ['#ffffff', '#bfe8ff', '#ffb3c8'], lantern: '#ffe08a',
      slab: ['#f4f7f6', '#dde7e6'], slabEdge: '#a9bfc2', socket: ['#d2dfe0', '#e6eeee'], accent: '#1f9fc4' },
    { // Sunset Palace: rose and gold evening
      sky: ['#463b8f', '#9a5aa6', '#e2788f', '#f8a96d', '#ffd69a'], sun: '#fff1c4', haze: '#f2b4a4', domes: '#c98a9a',
      wall: '#f0c7a6', wallShade: '#c99474', arch: ['#6b3558', '#9a5068'], band: ['#d9475f', '#ffd36b', '#2f8f9a'],
      cypress: '#2e4f3e', lawn: ['#8bb874', '#5a8a5a'], water: ['#ffc9a8', '#c97a8f'], bush: '#3a7350',
      flowers: ['#ffd36b', '#ff9fb8', '#ffffff'], lantern: '#ffcf6a',
      slab: ['#fdf0e4', '#f0d9c4'], slabEdge: '#cf9f86', socket: ['#ead1bd', '#f5e3d4'], accent: '#d9475f' }
  ];

  // ---------- tile palette: colour and pattern deepen as the number grows ----------
  // k = log2(value): 1 = "2", 2 = "4" ... 11 = "2048".
  var TILES = [null,
    { c: '#fff6e2', ink: '#6b4a2e' },  // 2   cream
    { c: '#ffe2b8', ink: '#7a4519' },  // 4   apricot
    { c: '#a6ecd2', ink: '#0f5a47' },  // 8   mint
    { c: '#3cc7bd', ink: '#ffffff' },  // 16  turquoise
    { c: '#4aa6f2', ink: '#ffffff' },  // 32  sky
    { c: '#5a6cf0', ink: '#ffffff' },  // 64  indigo
    { c: '#9a5cf0', ink: '#ffffff' },  // 128 violet
    { c: '#e4559f', ink: '#ffffff' },  // 256 rose
    { c: '#f2654a', ink: '#ffffff' },  // 512 coral
    { c: '#f3a01f', ink: '#ffffff' },  // 1024 amber
    { c: '#14a673', ink: '#ffffff' }   // 2048 emerald
  ];
  function tierOf(v) { return Math.max(1, Math.min(11, Math.round(Math.log(v) / Math.LN2))); }
  A.tierOf = tierOf;
  A.tileColor = function (v) { return TILES[tierOf(v)].c; };
  var FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  A.FONT = FONT;

  // Pattern drawn into the glaze, behind the number. Gets richer with k.
  function pattern(g, k, s, faceH, col) {
    var light = k <= 3, pc = light ? shade(col, -0.22) : shade(col, 0.32), cx = s / 2, cy = faceH / 2;
    g.save();
    g.strokeStyle = rgba(pc, light ? 0.75 : 0.6); g.fillStyle = rgba(pc, light ? 0.55 : 0.4);
    g.lineWidth = Math.max(1, s * 0.022); g.lineJoin = 'round';
    var m = s * 0.13;
    function dots(r, inset) { [[inset, inset], [s - inset, inset], [inset, faceH - inset], [s - inset, faceH - inset]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], r, 0, 6.283); g.fill(); }); }
    if (k === 1) dots(s * 0.03, m);
    if (k === 2) { rr(g, m * 0.7, m * 0.7, s - m * 1.4, faceH - m * 1.4, s * 0.1); g.stroke(); dots(s * 0.025, m * 1.25); }
    if (k === 3) { [[0, 0], [s, 0], [0, faceH], [s, faceH]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], s * 0.28, 0, 6.283); g.stroke(); g.beginPath(); g.arc(p[0], p[1], s * 0.17, 0, 6.283); g.fill(); }); }
    if (k === 4) {
      g.beginPath(); g.moveTo(cx, cy - faceH * 0.44); g.lineTo(cx + s * 0.44, cy); g.lineTo(cx, cy + faceH * 0.44); g.lineTo(cx - s * 0.44, cy); g.closePath(); g.stroke();
      dots(s * 0.035, m);
    }
    if (k === 5) { star8(g, cx, cy, s * 0.44, 0.72); g.stroke(); star8(g, cx, cy, s * 0.3, 0.72); g.stroke(); dots(s * 0.03, m * 0.8); }
    if (k === 6) { star8(g, cx, cy, s * 0.46, 0.7); g.fill(); g.beginPath(); g.arc(cx, cy, s * 0.47, 0, 6.283); g.stroke(); }
    if (k >= 7) {
      // rosettes: an interlaced star, ring and petals; from 512 up a lattice of little stars fills the glaze
      if (k >= 9) {
        var n = 3, st = s / n;
        g.globalAlpha = 0.7;
        for (var i = 0; i <= n; i++) for (var j = 0; j <= n; j++) { star8(g, i * st, j * st * faceH / s, st * 0.34, 0.55); g.fill(); }
        g.globalAlpha = 1;
      }
      star8(g, cx, cy, s * 0.46, 0.66); g.stroke();
      star8(g, cx, cy, s * 0.46, 0.66, Math.PI / 8); g.stroke();
      g.beginPath(); g.arc(cx, cy, s * 0.3, 0, 6.283); g.fill();
      for (var p = 0; p < 8; p++) { var a = p * Math.PI / 4; g.beginPath(); g.arc(cx + Math.cos(a) * s * 0.39, cy + Math.sin(a) * s * 0.39, s * 0.03, 0, 6.283); g.fill(); }
    }
    g.restore();
  }

  // A glossy glazed tile with its number, drawn with its top-left corner at the origin (s design units wide).
  function drawTile(g, value, s) {
    var k = tierOf(value), T = TILES[k], col = T.c, thick = s * 0.075, faceH = s - thick, r = s * 0.17;
    // soft drop shadow + glaze body (thickness)
    g.save(); g.shadowColor = 'rgba(30,15,5,.32)'; g.shadowBlur = s * 0.09 * UU; g.shadowOffsetY = s * 0.05 * UU;
    rr(g, 0, thick * 0.4, s, s - thick * 0.4, r); g.fillStyle = shade(col, -0.38); g.fill(); g.restore();
    rr(g, 0, thick * 0.4, s, s - thick * 0.4, r); g.fillStyle = shade(col, k <= 2 ? -0.22 : -0.3); g.fill();
    // face
    var fg = g.createLinearGradient(0, 0, 0, faceH);
    fg.addColorStop(0, shade(col, 0.3)); fg.addColorStop(0.45, col); fg.addColorStop(1, shade(col, -0.1));
    rr(g, 0, 0, s, faceH, r); g.fillStyle = fg; g.fill();
    g.save(); rr(g, 0, 0, s, faceH, r); g.clip();
    pattern(g, k, s, faceH, col);
    // gloss: a soft sheen over the top of the glaze
    var gl = g.createLinearGradient(0, 0, 0, faceH * 0.55);
    gl.addColorStop(0, 'rgba(255,255,255,.62)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.ellipse(s * 0.5, -faceH * 0.08, s * 0.72, faceH * 0.5, 0, 0, 6.283); g.fill();
    // lower inner glow (light through the glaze)
    var lo = g.createRadialGradient(s * 0.5, faceH * 1.05, 0, s * 0.5, faceH * 1.05, s * 0.6);
    lo.addColorStop(0, rgba(shade(col, 0.35), 0.45)); lo.addColorStop(1, rgba(col, 0));
    g.fillStyle = lo; g.fillRect(0, 0, s, faceH);
    // tiny specular glint, top left
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(s * 0.22, faceH * 0.16, s * 0.08, s * 0.035, -0.5, 0, 6.283); g.fill();
    g.restore();
    // rim: a light edge on top, gold from 128 up
    g.save(); rr(g, s * 0.025, s * 0.025, s - s * 0.05, faceH - s * 0.05, r * 0.85);
    var rim = g.createLinearGradient(0, 0, 0, faceH);
    rim.addColorStop(0, 'rgba(255,255,255,.7)'); rim.addColorStop(0.5, 'rgba(255,255,255,.08)'); rim.addColorStop(1, 'rgba(255,255,255,.18)');
    g.lineWidth = Math.max(1, s * 0.02); g.strokeStyle = rim; g.stroke(); g.restore();
    if (k >= 7) {
      var gold = g.createLinearGradient(0, 0, s, faceH);
      gold.addColorStop(0, '#fff2b0'); gold.addColorStop(0.35, '#f6c453'); gold.addColorStop(0.7, '#c8862a'); gold.addColorStop(1, '#ffe08a');
      rr(g, s * 0.045, s * 0.045, s - s * 0.09, faceH - s * 0.09, r * 0.75); g.lineWidth = s * 0.035; g.strokeStyle = gold; g.stroke();
    }
    // number: big, round and readable
    var str = String(value), digits = str.length;
    var fs = s * (digits === 1 ? 0.56 : digits === 2 ? 0.5 : digits === 3 ? 0.4 : 0.31);
    g.font = '800 ' + Math.round(fs) + 'px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var ty = faceH * 0.53;
    if (T.ink === '#ffffff') {
      g.lineJoin = 'round'; g.lineWidth = fs * 0.16; g.strokeStyle = rgba(shade(col, -0.55), 0.85); g.strokeText(str, s / 2, ty + fs * 0.03);
      g.fillStyle = '#ffffff'; g.fillText(str, s / 2, ty);
    } else {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(str, s / 2, ty + fs * 0.05);
      g.fillStyle = T.ink; g.fillText(str, s / 2, ty);
    }
  }

  // A carved garden stone that blocks one cell (never moves, never merges)
  function drawStone(g, s, wi) {
    var thick = s * 0.08, faceH = s - thick, r = s * 0.22, col = ['#9aa894', '#93a7ad', '#b09a92'][wi] || '#9aa894';
    g.save(); g.shadowColor = 'rgba(30,15,5,.3)'; g.shadowBlur = s * 0.08 * UU; g.shadowOffsetY = s * 0.05 * UU;
    rr(g, 0, thick * 0.4, s, s - thick * 0.4, r); g.fillStyle = shade(col, -0.4); g.fill(); g.restore();
    var fg = g.createLinearGradient(0, 0, s * 0.3, faceH);
    fg.addColorStop(0, shade(col, 0.25)); fg.addColorStop(1, shade(col, -0.12));
    rr(g, 0, 0, s, faceH, r); g.fillStyle = fg; g.fill();
    g.save(); rr(g, 0, 0, s, faceH, r); g.clip();
    var R = rng(77);
    for (var i = 0; i < 26; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(40,50,40,.12)'; g.beginPath(); g.arc(R() * s, R() * faceH, s * (0.01 + R() * 0.03), 0, 6.283); g.fill(); }
    g.fillStyle = 'rgba(90,150,80,.55)';                                             // moss along the bottom
    for (var m = 0; m < 9; m++) { g.beginPath(); g.ellipse(s * (0.05 + m * 0.11), faceH * (0.9 + R() * 0.08), s * 0.09, s * 0.06, 0, 0, 6.283); g.fill(); }
    g.restore();
    star8(g, s / 2, faceH / 2, s * 0.26, 0.66);                                       // engraved star
    g.lineWidth = s * 0.035; g.strokeStyle = 'rgba(40,45,40,.35)'; g.stroke();
    g.save(); g.translate(0, s * 0.012); star8(g, s / 2, faceH / 2, s * 0.26, 0.66); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = s * 0.015; g.stroke(); g.restore();
    rr(g, s * 0.03, s * 0.03, s - s * 0.06, faceH - s * 0.06, r * 0.8); g.lineWidth = s * 0.02; g.strokeStyle = 'rgba(255,255,255,.3)'; g.stroke();
  }

  // Cell layout on a tray of size B with n x n cells
  A.cells = function (n, B) {
    var gap = B * (n === 3 ? 0.045 : 0.034), cs = (B - gap * (n + 1)) / n;
    return { gap: gap, cs: cs, at: function (i) { return gap + i * (cs + gap); }, lip: B * 0.018 };
  };

  // The carved marble tray with its sockets, drawn with its top-left corner at the origin (B design units wide).
  function drawBoard(g, n, B, wi) {
    var W = A.WORLDS[wi], r = B * 0.065, lip = B * 0.018, L = A.cells(n, B);
    g.save(); g.shadowColor = 'rgba(25,15,10,.38)'; g.shadowBlur = B * 0.06 * UU; g.shadowOffsetY = B * 0.03 * UU;
    rr(g, 0, lip, B, B - lip, r); g.fillStyle = W.slabEdge; g.fill(); g.restore();
    rr(g, 0, lip, B, B - lip, r); g.fillStyle = shade(W.slabEdge, -0.12); g.fill();
    var fg = g.createLinearGradient(0, 0, B * 0.4, B);
    fg.addColorStop(0, W.slab[0]); fg.addColorStop(1, W.slab[1]);
    rr(g, 0, 0, B, B - lip, r); g.fillStyle = fg; g.fill();
    g.save(); rr(g, 0, 0, B, B - lip, r); g.clip();                                   // marble veins
    var R = rng(31 + wi);
    g.strokeStyle = rgba(W.slabEdge, 0.18); g.lineWidth = Math.max(1, B * 0.003);
    for (var v = 0; v < 7; v++) {
      g.beginPath(); var x = R() * B, y = 0; g.moveTo(x, y);
      for (var q = 0; q < 6; q++) { x += (R() - 0.5) * B * 0.18; y += B / 5; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
    var bi = Math.min(L.gap * 0.45, B * 0.016);                                       // engraved border band
    rr(g, bi, bi, B - bi * 2, B - lip - bi * 2, r - bi); g.lineWidth = Math.max(1, B * 0.004); g.strokeStyle = rgba(W.accent, 0.4); g.stroke();
    rr(g, 1, 1, B - 2, B - lip - 2, r); g.lineWidth = Math.max(1, B * 0.004); g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {                         // sockets: recessed, each with a faint star
      var x0 = L.at(i), y0 = L.at(j) - lip * 0.5, cs = L.cs, sr = cs * 0.17;
      var sg = g.createLinearGradient(0, y0, 0, y0 + cs);
      sg.addColorStop(0, shade(W.socket[0], -0.08)); sg.addColorStop(1, W.socket[1]);
      rr(g, x0, y0, cs, cs, sr); g.fillStyle = sg; g.fill();
      g.save(); rr(g, x0, y0, cs, cs, sr); g.clip();
      g.shadowColor = 'rgba(60,40,20,.35)'; g.shadowBlur = cs * 0.08 * UU; g.shadowOffsetY = cs * 0.04 * UU;
      g.lineWidth = cs * 0.08; g.strokeStyle = 'rgba(60,40,20,.25)'; rr(g, x0 - cs * 0.04, y0 - cs * 0.04, cs + cs * 0.08, cs + cs * 0.08, sr * 1.2); g.stroke();
      g.restore();
      star8(g, x0 + cs / 2, y0 + cs / 2, cs * 0.24, 0.62); g.lineWidth = Math.max(1, cs * 0.018); g.strokeStyle = rgba(W.slabEdge, 0.35); g.stroke();
      var hl = g.createLinearGradient(0, y0, 0, y0 + cs);
      hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.55, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(255,255,255,.7)');
      rr(g, x0 + 0.5, y0 + 0.5, cs - 1, cs - 0.5, sr); g.lineWidth = 1.2; g.strokeStyle = hl; g.stroke();
    }
  }

  // ---------- pictures at a FIXED size (about 1 texture pixel per design unit): the same on every screen, so they can be
  // baked into AVIF files (tools/bake-art.js); the scene scales them on screen. ----------
  // The tray of every board is painted at FIX_B design units wide; a cell and its tile follow from it.
  var FIX_B = 1000;
  A.FIX_B = FIX_B;
  // A tile sheet for a board size n: frames t1..t8 (the goal is never above 256), then the stone of each garden apart.
  // Returns { key, scale (display scale of a frame for a cell of cs units), pad, fw (frame pixels), cs (painted cell) }.
  A.tileKey = function (n) { return 'g48-tiles-' + n; };
  A.stoneKey = function (n, wi) { return 'g48-stone-' + n + '-' + wi; };
  A.boardKey = function (n, wi) { return 'g48-board-' + n + '-' + wi; };
  A.tiles = function (scene, n) {
    var s = A.cells(n, FIX_B).cs, pad = Math.ceil(s * 0.14), fw = Math.ceil(s + pad * 2), cols = 4, rows = 2, key = A.tileKey(n);
    UU = 1;
    Kit.play.tex(scene, key, fw * cols, fw * rows, function (c) {
      for (var i = 0; i < 8; i++) { c.save(); c.translate((i % cols) * fw, Math.floor(i / cols) * fw); c.translate(pad, pad); drawTile(c, Math.pow(2, i + 1), s); c.restore(); }
    });
    var t = scene.textures.get(key);
    if (!t.has('t1')) for (var i = 0; i < 8; i++) t.add('t' + (i + 1), 0, (i % cols) * fw, Math.floor(i / cols) * fw, fw, fw);
    return { key: key, pad: pad, fw: fw, cs: s };
  };
  A.stone = function (scene, n, wi) {
    var s = A.cells(n, FIX_B).cs, pad = Math.ceil(s * 0.14), fw = Math.ceil(s + pad * 2), key = A.stoneKey(n, wi);
    UU = 1;
    Kit.play.tex(scene, key, fw, fw, function (c) { c.translate(pad, pad); drawStone(c, s, wi); });
    return key;
  };
  A.board = function (scene, n, wi) {
    var B = FIX_B, pad = Math.ceil(B * 0.07), key = A.boardKey(n, wi);
    UU = 1;
    Kit.play.tex(scene, key, B + pad * 2, B + pad * 2, function (c) { c.translate(pad, pad); drawBoard(c, n, B, wi); });
    return { key: key, pad: pad, px: B + pad * 2 };
  };
  // every texture key a level of board size n in garden wi needs (the scene loads these when they are baked)
  A.needs = function (n, wi) {
    var K = A.worldKeys(wi), o = [A.tileKey(n), A.stoneKey(n, wi), A.boardKey(n, wi)];
    Object.keys(K).forEach(function (k) { o.push(K[k]); });
    return o;
  };
  // for tools/bake-art.js (?bake): paint every fixed picture once, so each one is written to an AVIF file
  A.bakeAll = function (scene) {
    A.ui(scene);
    [0, 1, 2].forEach(function (wi) { A.world(scene, wi); });
    [3, 4].forEach(function (n) { A.tiles(scene, n); [0, 1, 2].forEach(function (wi) { A.stone(scene, n, wi); A.board(scene, n, wi); }); });
  };
  // let go of every picture of the game except these (a level in another garden or board size does not need them)
  A.dropExcept = function (scene, keep) {
    scene.textures.getTextureKeys().forEach(function (k) { if (/^g48-/.test(k) && keep.indexOf(k) < 0) scene.textures.remove(k); });
  };

  // ---------- the interface atlas ('g48ui'): plates, icons, stars, sparks; one texture, one batch ----------
  A.ui = function (scene) {
    var items = [];
    var add = function (name, w, h, paint) { items.push({ name: name, w: w, h: h, paint: paint }); };
    var icon = function (k, draw) { add(k, 96, 96, function (c) { c.strokeStyle = '#f6f2ff'; c.fillStyle = '#f6f2ff'; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }); };
    // a round dark plate (readable on any garden) and a big bright one for the main choice
    add('plate', 150, 150, function (c) { c.fillStyle = 'rgba(34,22,58,.92)'; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 4; c.stroke(); });
    add('big', 280, 280, function (c) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 6; c.stroke(); });
    // panel: nine-sliced (corner 70) for pills, cards and sheets
    add('panel', 200, 200, function (c) { c.fillStyle = 'rgba(34,22,58,.86)'; c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 4; rr(c, 2, 2, 196, 196, 70); c.fill(); c.stroke(); });
    add('panelg', 200, 200, function (c) { var g = c.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f6c453'); c.fillStyle = g; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; rr(c, 3, 3, 194, 194, 70); c.fill(); c.stroke(); });
    add('cell', 140, 140, function (c) { c.fillStyle = '#fff'; rr(c, 4, 4, 132, 132, 30); c.fill(); });
    add('cello', 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; rr(c, 4, 4, 132, 132, 30); c.stroke(); });
    add('ic-exit', 96, 96, function (c) { Kit.play.exitIcon(c, 96, '#f6f2ff', 2.4); });
    icon('ic-retry', function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); });
    icon('ic-grid', function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); });
    icon('ic-snd', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); });
    icon('ic-mute', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); });
    icon('ic-pause', function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); });
    icon('ic-close', function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); });
    icon('ic-play', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); });
    icon('ic-next', function (c) { c.beginPath(); c.moveTo(5, 12); c.lineTo(18, 12); c.moveTo(12.5, 6); c.lineTo(18.5, 12); c.lineTo(12.5, 18); c.stroke(); });
    icon('ic-lock', function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); });
    icon('ic-tick', function (c) { c.beginPath(); c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19, 7); c.stroke(); });
    icon('ic-undo', function (c) { c.stroke(new Path2D('M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11')); });
    // a gold star and its empty outline (the stars of a level)
    add('star', 96, 96, function (c) { star8(c, 48, 50, 44, 0.66); c.fillStyle = '#f6c453'; c.fill(); c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = '#7a4a12'; c.stroke(); });
    add('star0', 96, 96, function (c) { star8(c, 48, 50, 44, 0.66); c.fillStyle = 'rgba(255,255,255,.2)'; c.fill(); c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,.6)'; c.stroke(); });
    add('badge', 72, 72, function (c) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(36, 36, 31, 0, 7); c.fill(); c.lineWidth = 5; c.strokeStyle = 'rgba(34,22,58,.9)'; c.stroke(); });
    // effects: a sparkle for bursts, a soft dot, a ring, the swipe trail, the glow behind the goal tile
    add('spark', 64, 64, function (c) { c.fillStyle = '#fff'; c.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 9 : 30; c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.closePath(); c.fill(); });
    add('dot', 48, 48, function (c) { var g = c.createRadialGradient(24, 24, 0, 24, 24, 22); g.addColorStop(0, '#fff'); g.addColorStop(0.6, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(24, 24, 22, 0, 7); c.fill(); });
    add('ring', 160, 160, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(80, 80, 72, 0, 7); c.stroke(); });
    add('trail', 256, 40, function (c) { var g = c.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.75)'); c.fillStyle = g; rr(c, 0, 8, 256, 24, 12); c.fill(); });
    add('glow', 256, 256, function (c) { var g = c.createRadialGradient(128, 128, 0, 128, 128, 126); g.addColorStop(0, 'rgba(255,240,190,.7)'); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    add('px', 16, 16, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 16, 16); });
    // shelf-pack them into one sheet 1024 wide
    var x = 2, y = 2, rowH = 0;
    items.forEach(function (it) { if (x + it.w + 2 > 1024) { x = 2; y += rowH + 2; rowH = 0; } it.x = x; it.y = y; x += it.w + 2; rowH = Math.max(rowH, it.h); });
    var H = y + rowH + 2;
    if (scene.textures.exists('g48ui') && scene.textures.get('g48ui').has('plate')) return;
    Kit.play.tex(scene, 'g48ui', 1024, H, function (c) {
      items.forEach(function (it) { c.save(); c.translate(it.x, it.y); c.beginPath(); c.rect(-1, -1, it.w + 2, it.h + 2); c.clip(); it.paint(c, it.w, it.h); c.restore(); });
    });
    var t = scene.textures.get('g48ui');
    items.forEach(function (it) { t.add(it.name, 0, it.x, it.y, it.w, it.h); });
  };

  // ---------- the garden scenes ----------
  // The strips are painted at R texture pixels per design unit; S turns the old page's pixel sizes into design units.
  var S0 = 2.7;
  function layer(scene, key, w, h, paint) { Kit.play.tex(scene, key, w, h, paint); return key; }

  // Which keys a world uses (the scene lays them out): { sky, fx, halo, disc, far, mid, lawn, chan, path, bush, vine }
  A.worldKeys = function (wi) {
    var o = {}; ['sky', 'fx', 'halo', 'disc', 'far', 'mid', 'lawn', 'chan', 'path', 'bush', 'vine'].forEach(function (k) { o[k] = 'g48-w' + wi + '-' + k; });
    return o;
  };
  A.dropWorlds = function (scene, keep) {
    [0, 1, 2].forEach(function (wi) { if (wi === keep) return; var K = A.worldKeys(wi); Object.keys(K).forEach(function (k) { if (scene.textures.exists(K[k])) scene.textures.remove(K[k]); }); });
  };
  // strip sizes in design units (the scene needs them to place the strips)
  A.STRIP = { fxW: 960, fxH: 560, farW: 1920, farH: 400, farBase: 330, midH: 760, midGround: 750, midWall: 640, midR: 1.5, aw: 300, col: 72, span: 372, chanH: 60, pathP: 118, bushW: 560, bushH: 320, vineW: 520, vineH: 720 };

  A.world = function (scene, wi) {
    var K = A.worldKeys(wi);
    if (scene.textures.exists(K.mid)) return K;
    var W = A.WORLDS[wi], R = rng(500 + wi * 91), S = S0, T = A.STRIP, rnd = R;
    // sky: a vertical gradient, stretched
    layer(scene, K.sky, 4, 512, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); }); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    // the sun: a halo and a disc
    layer(scene, K.halo, 256, 256, function (g) { var h = g.createRadialGradient(128, 128, 0, 128, 128, 128); h.addColorStop(0, rgba(W.sun, 0.75)); h.addColorStop(0.15, rgba(W.sun, 0.3)); h.addColorStop(1, rgba(W.sun, 0)); g.fillStyle = h; g.fillRect(0, 0, 256, 256); });
    layer(scene, K.disc, 128, 128, function (g) { g.fillStyle = rgba(W.sun, 0.95); g.beginPath(); g.arc(64, 64, 62, 0, 6.283); g.fill(); });
    // soft clouds (and stars at sunset), repeating sideways: 960 x 560 units painted at half size
    layer(scene, K.fx, T.fxW / 2, T.fxH / 2, function (g, w, h) {
      g.scale(0.5, 0.5);
      var Rc = rng(900 + wi);
      g.save();
      g.shadowColor = wi === 2 ? 'rgba(255,205,185,.5)' : 'rgba(255,255,255,.62)'; g.shadowBlur = 14 * S * 0.5; g.shadowOffsetX = 20000; g.fillStyle = '#000';
      for (var c = 0; c < 4; c++) {
        var cx = Rc() * T.fxW, cy = (0.1 + Rc() * 0.7) * T.fxH, cs = (50 + Rc() * 70) * S;
        [-T.fxW, 0, T.fxW].forEach(function (off) {
          g.beginPath();
          g.ellipse(cx + off - 20000, cy, cs * 1.1, cs * 0.16, 0, 0, 6.283);
          for (var k = 0; k < 3; k++) g.ellipse(cx + off - 20000 + (k - 1) * cs * 0.45, cy - cs * 0.1 - (k === 1 ? cs * 0.08 : 0), cs * (0.32 + Rc() * 0.12), cs * (0.2 + Rc() * 0.06), 0, 0, 6.283);
          g.fill();
        });
      }
      g.restore();
      if (wi === 2) for (var st = 0; st < 22; st++) { g.globalAlpha = 0.25 + Rc() * 0.6; g.fillStyle = '#fff'; g.beginPath(); g.arc(Rc() * T.fxW, Rc() * T.fxH, (Rc() + 0.3) * 3, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
    });
    // far: hazy hills and a skyline of domes and minarets, 1920 wide so it repeats
    layer(scene, K.far, T.farW, T.farH, function (g, w, h) {
      var base = T.farBase;
      g.fillStyle = rgba(W.haze, 0.9);
      g.beginPath(); g.moveTo(0, base);
      for (var x = 0; x <= w; x += 20 * S) g.lineTo(x, base - (18 + 14 * Math.sin(x / w * 6.2832 * 3 + wi) + 8 * Math.sin(x / w * 6.2832 * 9)) * S * 0.6);
      g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
      g.fillStyle = W.domes;
      var dx = R() * 120 * S * 0.4, first = dx;
      while (dx < w) {
        var dw = (40 + R() * 50) * S * 0.8, dh = dw * (0.75 + R() * 0.3), bh = (10 + R() * 26) * S * 0.8;
        [0, w].forEach(function (off) {                                            // drawn twice so one crossing the seam shows on both sides
          var X = dx - off;
          g.fillRect(X - dw * 0.55, base - bh, dw * 1.1, bh + 4 * S);
          g.beginPath(); g.moveTo(X - dw / 2, base - bh);
          g.bezierCurveTo(X - dw / 2, base - bh - dh * 0.8, X - dw * 0.08, base - bh - dh * 0.85, X, base - bh - dh);
          g.bezierCurveTo(X + dw * 0.08, base - bh - dh * 0.85, X + dw / 2, base - bh - dh * 0.8, X + dw / 2, base - bh);
          g.closePath(); g.fill();
          g.fillRect(X - 1.2 * S, base - bh - dh - 10 * S, 2.4 * S, 10 * S);
        });
        if (R() < 0.5) {
          var mx = dx + dw * (0.8 + R() * 0.5), mh = dh * (1.6 + R() * 0.6), mw = 9 * S;
          [0, w].forEach(function (off) {
            var X = mx - off;
            g.fillRect(X - mw / 2, base - mh, mw, mh); g.fillRect(X - mw * 0.9, base - mh * 0.72, mw * 1.8, 3 * S);
            g.beginPath(); g.moveTo(X - mw / 2, base - mh); g.lineTo(X, base - mh - 16 * S); g.lineTo(X + mw / 2, base - mh); g.fill();
          });
        }
        dx += dw * (2.2 + R() * 2.5);
      }
      var hz = g.createLinearGradient(0, base - 140, 0, base);
      hz.addColorStop(0, rgba(W.haze, 0)); hz.addColorStop(1, rgba(W.haze, 0.55));
      g.fillStyle = hz; g.fillRect(0, base - 140, w, 140);
    });
    // mid: the arcade (merlons, zellige band, pointed arches with lanterns) and a cypress tree; 2 arches repeat, painted at 1.5 pixels a unit
    var P = T.span * 2, MR = T.midR;
    layer(scene, K.mid, P * MR, T.midH * MR, function (g, w0, h0) {
      g.scale(MR, MR);
      var w = P, h = T.midH;
      var gy = T.midGround, wallTop = gy - T.midWall, bandH = 16 * S, aw = T.aw, col = T.col;
      g.fillStyle = W.wall;
      for (var mx2 = 0; mx2 < w; mx2 += 22 * S) {
        g.beginPath(); g.moveTo(mx2, wallTop); g.lineTo(mx2 + 4 * S, wallTop - 9 * S); g.lineTo(mx2 + 7 * S, wallTop - 9 * S); g.lineTo(mx2 + 7 * S, wallTop - 15 * S);
        g.lineTo(mx2 + 15 * S, wallTop - 15 * S); g.lineTo(mx2 + 15 * S, wallTop - 9 * S); g.lineTo(mx2 + 18 * S, wallTop - 9 * S); g.lineTo(mx2 + 22 * S, wallTop); g.fill();
      }
      var wg = g.createLinearGradient(0, wallTop, 0, gy);
      wg.addColorStop(0, shade(W.wall, 0.12)); wg.addColorStop(1, W.wallShade);
      g.fillStyle = wg; g.fillRect(0, wallTop, w, gy - wallTop);
      var by = wallTop + 6 * S;
      g.fillStyle = shade(W.wallShade, -0.1); g.fillRect(0, by - 2 * S, w, bandH + 4 * S);
      for (var zx = 0, zi = 0; zx < w; zx += bandH, zi++) {
        g.fillStyle = W.band[zi % 3];
        g.beginPath(); g.moveTo(zx + bandH / 2, by); g.lineTo(zx + bandH, by + bandH / 2); g.lineTo(zx + bandH / 2, by + bandH); g.lineTo(zx, by + bandH / 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(zx + bandH / 2, by + bandH * 0.4, bandH * 0.12, 0, 6.283); g.fill();
      }
      var archTop = by + bandH + 18 * S, archBottom = gy;
      for (var i = 0; i < 2; i++) {
        var l = i * T.span + col / 2, rgt = l + aw, cxA = (l + rgt) / 2, spring = archTop + aw * 0.62;
        g.save();
        g.beginPath(); g.moveTo(l, archBottom); g.lineTo(l, spring);
        g.quadraticCurveTo(l, archTop + aw * 0.1, cxA, archTop); g.quadraticCurveTo(rgt, archTop + aw * 0.1, rgt, spring);
        g.lineTo(rgt, archBottom); g.closePath();
        var ag = g.createLinearGradient(0, archTop, 0, archBottom);
        ag.addColorStop(0, W.arch[0]); ag.addColorStop(1, W.arch[1]);
        g.fillStyle = ag; g.fill(); g.clip();
        var lg = g.createRadialGradient(cxA, archBottom, 0, cxA, archBottom, aw);
        lg.addColorStop(0, 'rgba(255,240,200,.35)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = lg; g.fillRect(l, archTop, aw, archBottom - archTop);
        var ly = archTop + aw * 0.42;                                              // a lantern hanging in the arch
        g.strokeStyle = 'rgba(40,25,10,.6)'; g.lineWidth = 1.2 * S; g.beginPath(); g.moveTo(cxA, archTop); g.lineTo(cxA, ly - 9 * S); g.stroke();
        var lgl = g.createRadialGradient(cxA, ly, 0, cxA, ly, 34 * S);
        lgl.addColorStop(0, rgba(W.lantern, 0.75)); lgl.addColorStop(1, rgba(W.lantern, 0));
        g.fillStyle = lgl; g.beginPath(); g.arc(cxA, ly, 34 * S, 0, 6.283); g.fill();
        g.fillStyle = '#8a5a22'; g.beginPath(); g.moveTo(cxA - 6 * S, ly - 6 * S); g.lineTo(cxA + 6 * S, ly - 6 * S); g.lineTo(cxA + 3 * S, ly - 11 * S); g.lineTo(cxA - 3 * S, ly - 11 * S); g.fill();
        g.fillStyle = W.lantern; rr(g, cxA - 6 * S, ly - 6 * S, 12 * S, 15 * S, 4 * S); g.fill();
        g.fillStyle = '#8a5a22'; g.fillRect(cxA - 7 * S, ly + 8 * S, 14 * S, 3 * S);
        g.restore();
        g.beginPath(); g.moveTo(l, archBottom); g.lineTo(l, spring);                // a carved rim
        g.quadraticCurveTo(l, archTop + aw * 0.1, cxA, archTop); g.quadraticCurveTo(rgt, archTop + aw * 0.1, rgt, spring); g.lineTo(rgt, archBottom);
        g.lineWidth = 4 * S; g.strokeStyle = shade(W.wall, 0.35); g.stroke();
        g.lineWidth = 1.5 * S; g.strokeStyle = shade(W.wallShade, -0.15); g.stroke();
        g.fillStyle = shade(W.wallShade, -0.08); g.fillRect(rgt, spring - 6 * S, col, 6 * S);
      }
      g.fillStyle = shade(W.wallShade, -0.05); g.fillRect(0, gy - 3 * S, w, h - gy + 3 * S);       // plinth
      for (var ti = 0; ti < 2; ti += 2) {                                                              // cypress trees in front of the columns
        var th = Math.min(gy - wallTop + 40 * S, (gy - archTop) * 1.1), tw = 26 * S + th * 0.08, tcx = (ti + 1) * T.span;
        cypress(g, tcx, gy + 6 * S, tw, th, W.cypress, S);
      }
    });
    // the garden floor: a gradient, a stone-edged water channel, checker path tiles
    layer(scene, K.lawn, 4, 256, function (g, w, h) { var lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, W.lawn[0]); lg.addColorStop(1, W.lawn[1]); g.fillStyle = lg; g.fillRect(0, 0, w, h); });
    layer(scene, K.chan, 400, T.chanH + 28, function (g, w, h) {
      g.fillStyle = shade(W.wall, 0.2); g.fillRect(0, 0, w, h);
      var wgr = g.createLinearGradient(0, 14, 0, 14 + T.chanH); wgr.addColorStop(0, W.water[0]); wgr.addColorStop(1, W.water[1]);
      g.fillStyle = wgr; g.fillRect(0, 14, w, T.chanH);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.lineCap = 'round';
      for (var rp = 0; rp < 4; rp++) { var rx = 20 + rnd() * (w - 100), ry = 14 + (0.2 + rnd() * 0.6) * T.chanH; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + 30 + rnd() * 50, ry); g.stroke(); }
    });
    layer(scene, K.path, T.pathP, T.pathP, function (g, w, h) { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); });
    // near: a flowering bush (hung in the bottom corners) and jasmine vines (hung from the top corners)
    layer(scene, K.bush, T.bushW, T.bushH, function (g) { var Rb = rng(41 + wi); bush(g, T.bushW / 2, T.bushH, 90 * S, W, Rb, S); });
    layer(scene, K.vine, T.vineW, T.vineH, function (g) { var Rv = rng(61 + wi); vine(g, 40, 0, 1, T.vineH - 20, W, Rv, S); });
    return K;
  };

  function cypress(g, x, y, w, h, col, S) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + w * 0.2, y, w * 0.9, 6 * S, 0, 0, 6.283); g.fill();
    var gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, shade(col, 0.25)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.35));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x, y - h);
    g.bezierCurveTo(x + w * 0.45, y - h * 0.7, x + w * 0.65, y - h * 0.25, x + w * 0.35, y - 4 * S);
    g.lineTo(x - w * 0.35, y - 4 * S);
    g.bezierCurveTo(x - w * 0.65, y - h * 0.25, x - w * 0.45, y - h * 0.7, x, y - h);
    g.fill();
    g.strokeStyle = rgba(shade(col, 0.4), 0.35); g.lineWidth = 1.4 * S;                // leafy texture strokes
    for (var i = 1; i < 12; i++) { var yy = y - h * i / 12, ww = w * 0.32 * Math.sin(Math.PI * Math.min(1, (i / 12) * 1.15));
      g.beginPath(); g.moveTo(x - ww, yy + 4 * S); g.quadraticCurveTo(x, yy - 4 * S, x + ww * 0.6, yy + 2 * S); g.stroke(); }
    g.fillStyle = '#6b4a2e'; g.fillRect(x - 2.5 * S, y - 6 * S, 5 * S, 8 * S);
    g.restore();
  }
  function bush(g, x, y, r, W, R, S) {
    for (var i = 0; i < 9; i++) {
      var a = Math.PI + (i / 8) * Math.PI, bx = x + Math.cos(a) * r * 0.75, by = y + Math.sin(a) * r * 0.55, br = r * (0.4 + R() * 0.25);
      var gr = g.createRadialGradient(bx - br * 0.3, by - br * 0.4, 0, bx, by, br);
      gr.addColorStop(0, shade(W.bush, 0.25)); gr.addColorStop(1, shade(W.bush, -0.3));
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, br, 0, 6.283); g.fill();
    }
    for (var f = 0; f < 16; f++) {
      var fa = Math.PI + R() * Math.PI, fd = R() * r * 0.95, fx = x + Math.cos(fa) * fd, fy = y + Math.sin(fa) * fd * 0.8;
      flower(g, fx, fy, (4 + R() * 3) * S, W.flowers[f % W.flowers.length], R() * 6);
    }
  }
  function flower(g, x, y, r, col, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = col;
    for (var p = 0; p < 5; p++) { var a = p * 1.2566; g.beginPath(); g.ellipse(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, r * 0.62, r * 0.42, a, 0, 6.283); g.fill(); }
    g.fillStyle = '#f2a93b'; g.beginPath(); g.arc(0, 0, r * 0.35, 0, 6.283); g.fill();
    g.restore();
  }
  function vine(g, x, y, dir, len, W, R, S) {
    g.save();
    g.strokeStyle = shade(W.bush, -0.2); g.lineWidth = 2.5 * S; g.lineCap = 'round';
    for (var s2 = 0; s2 < 3; s2++) {
      var vx = x + dir * s2 * 22 * S, vl = len * (1 - s2 * 0.25);
      g.beginPath(); g.moveTo(vx, y);
      for (var t = 0; t <= 1.001; t += 0.1) g.lineTo(vx + dir * Math.sin(t * 5 + s2) * 10 * S + dir * t * 16 * S, y + t * vl);
      g.stroke();
      for (var t2 = 0.08; t2 < 1; t2 += 0.09) {
        var lx = vx + dir * Math.sin(t2 * 5 + s2) * 10 * S + dir * t2 * 16 * S, ly = y + t2 * vl, side = (Math.round(t2 * 11) % 2 ? 1 : -1);
        g.fillStyle = shade(W.bush, 0.1 + R() * 0.2);
        g.beginPath(); g.ellipse(lx + side * 7 * S, ly, 8 * S, 3.6 * S, side * 0.6, 0, 6.283); g.fill();
        if (R() < 0.45) flower(g, lx - side * 5 * S, ly + 3 * S, 3.4 * S, '#ffffff', R() * 6);
      }
    }
    g.restore();
  }
})();
