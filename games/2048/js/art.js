/* 2048 Garden: art.js
   All art is drawn in code (crisp at any size, no downloads): three garden scenes in layers (sky, distant
   domes, an arcade with cypress trees, a garden floor, flowering bushes), the carved marble tray, glossy
   glazed tiles whose colour and pattern deepen as the number grows, garden stones and butterflies.
   No faces anywhere. */
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
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  A.rr = rr; A.star8 = star8; A.shade = shade; A.mix = mix; A.rgba = rgba;

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
  A.tileInk = function (v) { return TILES[tierOf(v)].ink; };

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

  // A glossy glazed tile with its number. Returns { c, pad } (canvas in device px, pad in CSS px).
  A.tile = function (value, s, dpr) {
    var k = tierOf(value), T = TILES[k], col = T.c, pad = Math.ceil(s * 0.14), thick = s * 0.075, faceH = s - thick, r = s * 0.17;
    var c = canvas((s + pad * 2) * dpr, (s + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(pad, pad);
    // soft drop shadow + glaze body (thickness)
    g.save(); g.shadowColor = 'rgba(30,15,5,.32)'; g.shadowBlur = s * 0.09; g.shadowOffsetY = s * 0.05;
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
    g.font = '800 ' + Math.round(fs) + 'px Nunito, system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var ty = faceH * 0.53;
    if (T.ink === '#ffffff') {
      g.lineJoin = 'round'; g.lineWidth = fs * 0.16; g.strokeStyle = rgba(shade(col, -0.55), 0.85); g.strokeText(str, s / 2, ty + fs * 0.03);
      g.fillStyle = '#ffffff'; g.fillText(str, s / 2, ty);
    } else {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(str, s / 2, ty + fs * 0.05);
      g.fillStyle = T.ink; g.fillText(str, s / 2, ty);
    }
    return { c: c, pad: pad };
  };

  // A carved garden stone that blocks one cell (never moves, never merges)
  A.stone = function (s, dpr, wi) {
    var pad = Math.ceil(s * 0.14), thick = s * 0.08, faceH = s - thick, r = s * 0.22, col = ['#9aa894', '#93a7ad', '#b09a92'][wi] || '#9aa894';
    var c = canvas((s + pad * 2) * dpr, (s + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(pad, pad);
    g.save(); g.shadowColor = 'rgba(30,15,5,.3)'; g.shadowBlur = s * 0.08; g.shadowOffsetY = s * 0.05;
    rr(g, 0, thick * 0.4, s, s - thick * 0.4, r); g.fillStyle = shade(col, -0.4); g.fill(); g.restore();
    var fg = g.createLinearGradient(0, 0, s * 0.3, faceH);
    fg.addColorStop(0, shade(col, 0.25)); fg.addColorStop(1, shade(col, -0.12));
    rr(g, 0, 0, s, faceH, r); g.fillStyle = fg; g.fill();
    g.save(); rr(g, 0, 0, s, faceH, r); g.clip();
    var R = rng(77);
    for (var i = 0; i < 26; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(40,50,40,.12)'; g.beginPath(); g.arc(R() * s, R() * faceH, s * (0.01 + R() * 0.03), 0, 6.283); g.fill(); }
    // moss along the bottom
    g.fillStyle = 'rgba(90,150,80,.55)';
    for (var m = 0; m < 9; m++) { g.beginPath(); g.ellipse(s * (0.05 + m * 0.11), faceH * (0.9 + R() * 0.08), s * 0.09, s * 0.06, 0, 0, 6.283); g.fill(); }
    g.restore();
    // engraved star
    star8(g, s / 2, faceH / 2, s * 0.26, 0.66);
    g.lineWidth = s * 0.035; g.strokeStyle = 'rgba(40,45,40,.35)'; g.stroke();
    g.save(); g.translate(0, s * 0.012); star8(g, s / 2, faceH / 2, s * 0.26, 0.66); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = s * 0.015; g.stroke(); g.restore();
    rr(g, s * 0.03, s * 0.03, s - s * 0.06, faceH - s * 0.06, r * 0.8); g.lineWidth = s * 0.02; g.strokeStyle = 'rgba(255,255,255,.3)'; g.stroke();
    return { c: c, pad: pad };
  };

  // Cell layout on a tray of size B with n x n cells
  A.cells = function (n, B) {
    var gap = B * (n === 3 ? 0.045 : 0.034), cs = (B - gap * (n + 1)) / n;
    return { gap: gap, cs: cs, at: function (i) { return gap + i * (cs + gap); } };
  };

  // The carved marble tray with its sockets. Returns { c, pad }.
  A.board = function (n, B, dpr, wi) {
    var W = A.WORLDS[wi], pad = Math.ceil(B * 0.07), r = B * 0.065, lip = B * 0.018, L = A.cells(n, B);
    var c = canvas((B + pad * 2) * dpr, (B + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(pad, pad);
    // shadow on the ground, then the tray's thickness, then its face
    g.save(); g.shadowColor = 'rgba(25,15,10,.38)'; g.shadowBlur = B * 0.06; g.shadowOffsetY = B * 0.03;
    rr(g, 0, lip, B, B - lip, r); g.fillStyle = W.slabEdge; g.fill(); g.restore();
    rr(g, 0, lip, B, B - lip, r); g.fillStyle = shade(W.slabEdge, -0.12); g.fill();
    var fg = g.createLinearGradient(0, 0, B * 0.4, B);
    fg.addColorStop(0, W.slab[0]); fg.addColorStop(1, W.slab[1]);
    rr(g, 0, 0, B, B - lip, r); g.fillStyle = fg; g.fill();
    // marble veins
    g.save(); rr(g, 0, 0, B, B - lip, r); g.clip();
    var R = rng(31 + wi);
    g.strokeStyle = rgba(W.slabEdge, 0.18); g.lineWidth = Math.max(1, B * 0.003);
    for (var v = 0; v < 7; v++) {
      g.beginPath(); var x = R() * B, y = 0; g.moveTo(x, y);
      for (var q = 0; q < 6; q++) { x += (R() - 0.5) * B * 0.18; y += B / 5; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
    // engraved border band with little stars in the corners
    var bi = Math.min(L.gap * 0.45, B * 0.016);
    rr(g, bi, bi, B - bi * 2, B - lip - bi * 2, r - bi); g.lineWidth = Math.max(1, B * 0.004); g.strokeStyle = rgba(W.accent, 0.4); g.stroke();
    rr(g, 1, 1, B - 2, B - lip - 2, r); g.lineWidth = Math.max(1, B * 0.004); g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
    // sockets: recessed, each with a faint engraved star
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      var x0 = L.at(i), y0 = L.at(j) - lip * 0.5, cs = L.cs, sr = cs * 0.17;
      var sg = g.createLinearGradient(0, y0, 0, y0 + cs);
      sg.addColorStop(0, shade(W.socket[0], -0.08)); sg.addColorStop(1, W.socket[1]);
      rr(g, x0, y0, cs, cs, sr); g.fillStyle = sg; g.fill();
      g.save(); rr(g, x0, y0, cs, cs, sr); g.clip();
      g.shadowColor = 'rgba(60,40,20,.35)'; g.shadowBlur = cs * 0.08; g.shadowOffsetY = cs * 0.04;
      g.lineWidth = cs * 0.08; g.strokeStyle = 'rgba(60,40,20,.25)'; rr(g, x0 - cs * 0.04, y0 - cs * 0.04, cs + cs * 0.08, cs + cs * 0.08, sr * 1.2); g.stroke();
      g.restore();
      star8(g, x0 + cs / 2, y0 + cs / 2, cs * 0.24, 0.62); g.lineWidth = Math.max(1, cs * 0.018); g.strokeStyle = rgba(W.slabEdge, 0.35); g.stroke();
      var hl = g.createLinearGradient(0, y0, 0, y0 + cs);
      hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.55, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(255,255,255,.7)');
      rr(g, x0 + 0.5, y0 + 0.5, cs - 1, cs - 0.5, sr); g.lineWidth = 1.2; g.strokeStyle = hl; g.stroke();
    }
    return { c: c, pad: pad, lip: lip };
  };

  // ---------- the garden scene ----------
  // lay = { bx, by, B } board rect in CSS px (so the arcade and garden sit where they can be seen).
  // Returns { sky, far, mid, near, margin } canvases in device px (wider than the screen for parallax).
  A.paintScene = function (wi, w, h, dpr, lay) {
    var W = A.WORLDS[wi], S = dpr, m = Math.round(24 * dpr), cw = Math.round(w * dpr) + m * 2, ch = Math.round(h * dpr);
    var R = rng(500 + wi * 91);
    var portrait = h > w * 1.15;
    var wallTop = Math.max(h * (portrait ? 0.16 : 0.16), Math.min(h * 0.45, lay.by - (portrait ? 70 : 40))) * S;
    var groundY = Math.max(wallTop + 130 * S, (lay.by + lay.B * 0.74) * S, h * 0.55 * S);
    if (groundY > ch - 40 * S) groundY = ch - 40 * S;
    function layer() { return canvas(cw, ch); }
    var sky = layer(), far = layer(), mid = layer(), near = layer();

    // Sky
    var g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, groundY);
    W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    var sx = cw * (wi === 2 ? 0.7 : 0.24), sy = wallTop - (wi === 2 ? 10 : 60) * S;
    var halo = g.createRadialGradient(sx, sy, 0, sx, sy, Math.max(cw, ch) * 0.5);
    halo.addColorStop(0, rgba(W.sun, 0.75)); halo.addColorStop(0.15, rgba(W.sun, 0.3)); halo.addColorStop(1, rgba(W.sun, 0));
    g.fillStyle = halo; g.fillRect(0, 0, cw, ch);
    g.fillStyle = rgba(W.sun, 0.95); g.beginPath(); g.arc(sx, sy, 34 * S, 0, 6.283); g.fill();
    // soft clouds
    g.save();
    g.shadowColor = wi === 2 ? 'rgba(255,205,185,.5)' : 'rgba(255,255,255,.62)'; g.shadowBlur = 14 * S; g.shadowOffsetX = 20000;
    g.fillStyle = '#000';
    for (var c = 0; c < 6; c++) {
      var cx = R() * cw, cy = (0.1 + R() * 0.7) * wallTop, cs = (50 + R() * 70) * S;
      g.beginPath();
      g.ellipse(cx - 20000, cy, cs * 1.1, cs * 0.16, 0, 0, 6.283);
      for (var k = 0; k < 3; k++) g.ellipse(cx - 20000 + (k - 1) * cs * 0.45, cy - cs * 0.1 - (k === 1 ? cs * 0.08 : 0), cs * (0.32 + R() * 0.12), cs * (0.2 + R() * 0.06), 0, 0, 6.283);
      g.fill();
    }
    g.restore();
    if (wi === 2) for (var st = 0; st < 50; st++) { var yy = R() * wallTop * 0.5; g.globalAlpha = 0.2 + R() * 0.6 * (1 - yy / wallTop); g.fillStyle = '#fff'; g.beginPath(); g.arc(R() * cw, yy, (R() + 0.3) * S, 0, 6.283); g.fill(); }
    g.globalAlpha = 1;

    // Far: hazy hills and a distant skyline of domes and a minaret
    g = far.getContext('2d');
    var base = wallTop + 6 * S;
    g.fillStyle = rgba(W.haze, 0.9);
    g.beginPath(); g.moveTo(0, base);
    for (var x = 0; x <= cw; x += 20 * S) g.lineTo(x, base - (18 + 14 * Math.sin(x / (140 * S) + wi) + 8 * Math.sin(x / (53 * S))) * S);
    g.lineTo(cw, ch); g.lineTo(0, ch); g.closePath(); g.fill();
    g.fillStyle = W.domes;
    var dx = R() * 120 * S;
    while (dx < cw) {
      var dw = (40 + R() * 50) * S, dh = dw * (0.75 + R() * 0.3), bh = (10 + R() * 26) * S;
      g.fillRect(dx - dw * 0.55, base - bh, dw * 1.1, bh + 4 * S);
      g.beginPath(); g.moveTo(dx - dw / 2, base - bh);
      g.bezierCurveTo(dx - dw / 2, base - bh - dh * 0.8, dx - dw * 0.08, base - bh - dh * 0.85, dx, base - bh - dh);
      g.bezierCurveTo(dx + dw * 0.08, base - bh - dh * 0.85, dx + dw / 2, base - bh - dh * 0.8, dx + dw / 2, base - bh);
      g.closePath(); g.fill();
      g.fillRect(dx - 1.2 * S, base - bh - dh - 10 * S, 2.4 * S, 10 * S);
      if (R() < 0.5) { // a slim minaret beside it
        var mx = dx + dw * (0.8 + R() * 0.5), mh = dh * (1.6 + R() * 0.6), mw = 9 * S;
        g.fillRect(mx - mw / 2, base - mh, mw, mh);
        g.fillRect(mx - mw * 0.9, base - mh * 0.72, mw * 1.8, 3 * S);
        g.beginPath(); g.moveTo(mx - mw / 2, base - mh); g.lineTo(mx, base - mh - 16 * S); g.lineTo(mx + mw / 2, base - mh); g.fill();
      }
      dx += dw * (2.2 + R() * 2.5);
    }
    // haze over the far layer
    var hz = g.createLinearGradient(0, base - 140 * S, 0, base);
    hz.addColorStop(0, rgba(W.haze, 0)); hz.addColorStop(1, rgba(W.haze, 0.55));
    g.fillStyle = hz; g.fillRect(0, base - 140 * S, cw, 140 * S);

    // Mid: the arcade wall with pointed arches, hanging lanterns, then cypress trees and the garden floor
    g = mid.getContext('2d');
    var bandH = 16 * S, aw = Math.max(70, Math.min(130, w * 0.16)) * S, col = aw * 0.24, top = wallTop;
    // merlons along the top
    g.fillStyle = W.wall;
    for (var mx2 = -aw; mx2 < cw + aw; mx2 += 22 * S) {
      g.beginPath(); g.moveTo(mx2, top); g.lineTo(mx2 + 4 * S, top - 9 * S); g.lineTo(mx2 + 7 * S, top - 9 * S); g.lineTo(mx2 + 7 * S, top - 15 * S);
      g.lineTo(mx2 + 15 * S, top - 15 * S); g.lineTo(mx2 + 15 * S, top - 9 * S); g.lineTo(mx2 + 18 * S, top - 9 * S); g.lineTo(mx2 + 22 * S, top); g.fill();
    }
    var wg = g.createLinearGradient(0, top, 0, groundY);
    wg.addColorStop(0, shade(W.wall, 0.12)); wg.addColorStop(1, W.wallShade);
    g.fillStyle = wg; g.fillRect(0, top, cw, groundY - top);
    // zellige band under the merlons
    var by = top + 6 * S;
    g.fillStyle = shade(W.wallShade, -0.1); g.fillRect(0, by - 2 * S, cw, bandH + 4 * S);
    for (var zx = 0, zi = 0; zx < cw; zx += bandH, zi++) {
      g.fillStyle = W.band[zi % 3];
      g.beginPath(); g.moveTo(zx + bandH / 2, by); g.lineTo(zx + bandH, by + bandH / 2); g.lineTo(zx + bandH / 2, by + bandH); g.lineTo(zx, by + bandH / 2); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(zx + bandH / 2, by + bandH * 0.4, bandH * 0.12, 0, 6.283); g.fill();
    }
    // arches
    var archTop = by + bandH + 18 * S, archBottom = groundY, span = aw + col;
    var x0 = ((cw / 2) % span) - span;
    for (var ax = x0; ax < cw + span; ax += span) {
      var l = ax + col / 2, rgt = l + aw, cxA = (l + rgt) / 2, spring = archTop + aw * 0.62;
      g.save();
      g.beginPath(); g.moveTo(l, archBottom); g.lineTo(l, spring);
      g.quadraticCurveTo(l, archTop + aw * 0.1, cxA, archTop); g.quadraticCurveTo(rgt, archTop + aw * 0.1, rgt, spring);
      g.lineTo(rgt, archBottom); g.closePath();
      var ag = g.createLinearGradient(0, archTop, 0, archBottom);
      ag.addColorStop(0, W.arch[0]); ag.addColorStop(1, W.arch[1]);
      g.fillStyle = ag; g.fill();
      g.clip();
      // light pooling at the back of the gallery
      var lg = g.createRadialGradient(cxA, archBottom, 0, cxA, archBottom, aw);
      lg.addColorStop(0, 'rgba(255,240,200,.35)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = lg; g.fillRect(l, archTop, aw, archBottom - archTop);
      // a lantern hanging in the arch
      var ly = archTop + aw * 0.42;
      g.strokeStyle = 'rgba(40,25,10,.6)'; g.lineWidth = 1.2 * S; g.beginPath(); g.moveTo(cxA, archTop); g.lineTo(cxA, ly - 9 * S); g.stroke();
      var lgl = g.createRadialGradient(cxA, ly, 0, cxA, ly, 34 * S);
      lgl.addColorStop(0, rgba(W.lantern, 0.75)); lgl.addColorStop(1, rgba(W.lantern, 0));
      g.fillStyle = lgl; g.beginPath(); g.arc(cxA, ly, 34 * S, 0, 6.283); g.fill();
      g.fillStyle = '#8a5a22'; g.beginPath(); g.moveTo(cxA - 6 * S, ly - 6 * S); g.lineTo(cxA + 6 * S, ly - 6 * S); g.lineTo(cxA + 3 * S, ly - 11 * S); g.lineTo(cxA - 3 * S, ly - 11 * S); g.fill();
      g.fillStyle = W.lantern; rr(g, cxA - 6 * S, ly - 6 * S, 12 * S, 15 * S, 4 * S); g.fill();
      g.fillStyle = '#8a5a22'; g.fillRect(cxA - 7 * S, ly + 8 * S, 14 * S, 3 * S);
      g.restore();
      // arch outline (a carved rim)
      g.beginPath(); g.moveTo(l, archBottom); g.lineTo(l, spring);
      g.quadraticCurveTo(l, archTop + aw * 0.1, cxA, archTop); g.quadraticCurveTo(rgt, archTop + aw * 0.1, rgt, spring); g.lineTo(rgt, archBottom);
      g.lineWidth = 4 * S; g.strokeStyle = shade(W.wall, 0.35); g.stroke();
      g.lineWidth = 1.5 * S; g.strokeStyle = shade(W.wallShade, -0.15); g.stroke();
      // column capital
      g.fillStyle = shade(W.wallShade, -0.08); g.fillRect(rgt - 2 * S, spring - 6 * S, col + 4 * S, 6 * S);
    }
    // garden floor
    var fy = groundY;
    var lawn = g.createLinearGradient(0, fy, 0, ch);
    lawn.addColorStop(0, W.lawn[0]); lawn.addColorStop(1, W.lawn[1]);
    g.fillStyle = lawn; g.fillRect(0, fy, cw, ch - fy);
    g.fillStyle = shade(W.wallShade, -0.05); g.fillRect(0, fy - 3 * S, cw, 7 * S); // plinth
    // a stone-edged water channel running across the garden
    var wy = fy + Math.max(26 * S, (ch - fy) * 0.32), wh = Math.max(14 * S, (ch - fy) * 0.16);
    g.fillStyle = shade(W.wall, 0.2); g.fillRect(0, wy - 5 * S, cw, wh + 10 * S);
    var wgr = g.createLinearGradient(0, wy, 0, wy + wh);
    wgr.addColorStop(0, W.water[0]); wgr.addColorStop(1, W.water[1]);
    g.fillStyle = wgr; g.fillRect(0, wy, cw, wh);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5 * S;
    for (var rp = 0; rp < 26; rp++) { var rx = R() * cw, ry = wy + (0.2 + R() * 0.6) * wh; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + (10 + R() * 26) * S, ry); g.stroke(); }
    // checker path tiles below the channel
    var py0 = wy + wh + 10 * S;
    for (var py = py0, row = 0; py < ch; py += 22 * S, row++) for (var px = (row % 2) * 22 * S - 22 * S; px < cw; px += 44 * S) {
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px, py, 22 * S, 22 * S);
    }
    // cypress trees standing in the garden in front of the columns
    for (var tx = x0 + span * 0.0 - col * 0.0, ti = 0; tx < cw + span; tx += span, ti++) {
      if (ti % 2) continue;
      var th = Math.min(groundY - wallTop + 40 * S, (groundY - archTop) * 1.1), tw = 26 * S + th * 0.08, tcx = tx + col / 2 + aw + col / 2;
      cypress(g, tcx, groundY + 6 * S, tw, th, W.cypress, S);
    }

    // Near: flowering bushes in the bottom corners and along the sides
    g = near.getContext('2d');
    var bushY = ch;
    bush(g, m + 10 * S, bushY, 90 * S, W, R, S);
    bush(g, cw - m - 10 * S, bushY, 90 * S, W, R, S);
    if (!portrait) { bush(g, m + 60 * S, bushY + 10 * S, 70 * S, W, R, S); bush(g, cw - m - 70 * S, bushY + 10 * S, 70 * S, W, R, S); }
    else { bush(g, cw * 0.5, bushY + 30 * S, 80 * S, W, R, S); }
    // jasmine vines hanging from the top corners
    vine(g, m - 6 * S, 0, 1, Math.min(ch * 0.4, 260 * S), W, R, S);
    vine(g, cw - m + 6 * S, 0, -1, Math.min(ch * 0.35, 220 * S), W, R, S);

    return { sky: sky, far: far, mid: mid, near: near, margin: m };
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
    // leafy texture strokes
    g.strokeStyle = rgba(shade(col, 0.4), 0.35); g.lineWidth = 1.4 * S;
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

  // A butterfly seen from above: two pairs of wings and a slim body (no face). flap 0..1.
  A.butterfly = function (ctx, x, y, s, flap, col, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    var k = 0.25 + 0.75 * Math.abs(Math.cos(flap * Math.PI));
    ctx.fillStyle = col;
    ctx.save(); ctx.scale(k, 1);
    ctx.beginPath(); ctx.ellipse(-s * 0.55, -s * 0.3, s * 0.55, s * 0.4, -0.5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.3, s * 0.55, s * 0.4, 0.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = shade(col, -0.2);
    ctx.beginPath(); ctx.ellipse(-s * 0.4, s * 0.3, s * 0.35, s * 0.28, 0.4, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.4, s * 0.3, s * 0.35, s * 0.28, -0.4, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.08, s * 0.5, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  };
})();
