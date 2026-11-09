/* Jannah Garden: art.js
   Everything is drawn in code (no images, works offline): the three garden scenes with layered depth,
   every plantable item as a cached vector sprite, ambient butterflies and birds (faceless shapes),
   water, glow, tray pictures and goal icons. */
(function () {
  'use strict';
  var A = window.GardenArt = {};
  var TAU = Math.PI * 2, GD = window.GARDEN;

  // ---------- helpers ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function toHex(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2); return '#' + toHex(a[0] + (b[0] - a[0]) * t) + toHex(a[1] + (b[1] - a[1]) * t) + toHex(a[2] + (b[2] - a[2]) * t); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rgba(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function star8(g, x, y, r, inner) {
    g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function lin(g, x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s, i) { gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s); }); return gr; }
  function rad(g, x, y, r0, r1, stops) { var gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(function (s, i) { gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s); }); return gr; }
  A.rng = rng; A.mix = mix; A.shade = shade; A.rgba = rgba; A.rr = rr; A.star8 = star8;

  // ---------- view: maps ground coordinates (u, v) to the screen ----------
  A.view = function (w, h, safe, trayH) {
    var V = { w: w, h: h }, portrait = h > w * 1.1;
    V.hz = Math.round(h * (portrait ? 0.3 : 0.36));
    V.gBot = h - trayH - 8;
    V.gTop = V.hz + Math.max(6, (V.gBot - V.hz) * 0.035);
    V.padX = Math.max(14, w * 0.03) + Math.max(safe.left || 0, safe.right || 0);
    V.K = Math.max(0.42, Math.min(1.25, Math.min(w / 600, (V.gBot - V.hz) / 420)));
    V.x = function (u) { return V.padX + u * (w - 2 * V.padX); };
    V.y = function (v) { return V.gTop + v * (V.gBot - V.gTop); };
    V.u = function (x) { return (x - V.padX) / (w - 2 * V.padX); };
    V.v = function (y) { return (y - V.gTop) / (V.gBot - V.gTop); };
    V.pf = function (v) { return V.K * (0.45 + 0.7 * v); };
    V.vMax = V.v(h + 4);
    V.vMin = V.v(V.hz);
    return V;
  };

  // ---------- area palettes ----------
  var PAL = [
    { sky: ['#5fb4ee', '#93cdf3', '#cdebf2', '#fff1d2'], sun: [0.78, 0.32], sunCol: '#fff6d8',
      far: '#a9bfe0', far2: '#8fc0c4', mid: '#5f9f73', mid2: '#3f8458', grass: ['#bfe08a', '#7cc35a', '#4f9f45', '#3a8a3c'],
      haze: '#e6f4f2', water: ['#9ce3ef', '#55bfd8', '#2f98c0'], bank: '#e9d8a6' },
    { sky: ['#62a8e8', '#9fcbef', '#ffe3b0', '#ffcf8c'], sun: [0.2, 0.45], sunCol: '#fff3cc',
      far: '#e3c286', far2: '#c7b56c', mid: '#7fa752', mid2: '#5d8d3e', grass: ['#d4df8a', '#9ccb5e', '#69a944', '#4f933c'],
      haze: '#fff0d0', water: ['#9ce3ef', '#55bfd8', '#2f98c0'], bank: '#d8b47a' },
    { sky: ['#727fd6', '#ab98e0', '#ffb6c4', '#ffdcae'], sun: [0.5, 0.8], sunCol: '#fff0d6',
      far: '#c5a6d6', far2: '#b48fc6', mid: '#f4e3cf', mid2: '#e2c1b4', grass: ['#b9de86', '#86c766', '#57a64c', '#438f42'],
      haze: '#ffe6e0', water: ['#a6ecf3', '#4fc4dc', '#2a93c0'], bank: '#f3e4c9' }
  ];
  A.PAL = PAL;

  // ---------- scene painting (once per resize) ----------
  // Returns { sky, land } canvases in device px plus the water path for shimmer and highlights.
  A.paintArea = function (ai, V, dpr) {
    var P = PAL[ai], AR = GD.AREAS[ai], W = V.w, H = V.h, R = rng(4242 + ai * 101);
    var sky = canvas(W * dpr, H * dpr), land = canvas(W * dpr, H * dpr);
    var s = sky.getContext('2d'), g = land.getContext('2d');
    s.scale(dpr, dpr); g.scale(dpr, dpr);
    var hz = V.hz, K = V.K;

    // sky gradient, sun glow and soft rays
    s.fillStyle = lin(s, 0, 0, 0, hz + 10, P.sky); s.fillRect(0, 0, W, H);
    var sx = W * P.sun[0], sy = hz * P.sun[1], sr = Math.max(W, H) * 0.5;
    s.fillStyle = rad(s, sx, sy, 0, sr, [[0, rgba(P.sunCol, 0.75)], [0.15, rgba(P.sunCol, 0.35)], [1, rgba(P.sunCol, 0)]]);
    s.fillRect(0, 0, W, H);
    s.save(); s.globalCompositeOperation = 'lighter';
    for (var r = 0; r < 9; r++) {
      var a0 = r / 9 * TAU + 0.2, aw = 0.07 + R() * 0.06;
      s.fillStyle = rad(s, sx, sy, 0, sr * 0.9, [[0, 'rgba(255,250,225,0.10)'], [1, 'rgba(255,250,225,0)']]);
      s.beginPath(); s.moveTo(sx, sy); s.arc(sx, sy, sr * 0.9, a0, a0 + aw); s.closePath(); s.fill();
    }
    s.restore();
    var sunR = Math.max(16, 26 * K);
    s.fillStyle = rad(s, sx, sy, sunR * 0.6, sunR * 2.4, [[0, 'rgba(255,255,240,0.9)'], [1, 'rgba(255,255,240,0)']]); circle(s, sx, sy, sunR * 2.4); s.fill();
    s.fillStyle = '#fffdf2'; circle(s, sx, sy, sunR); s.fill();

    // ridge helper: smooth hills from layered sines
    function ridge(base, amp, col, seed, freq, toY) {
      var rr2 = rng(seed), ph = [rr2() * 6, rr2() * 6, rr2() * 6];
      g.fillStyle = col; g.beginPath(); g.moveTo(-10, toY || H);
      for (var x = -10; x <= W + 10; x += 6) {
        var t = x / Math.max(W, 400) * (freq || 3);
        var y = base - amp * (0.55 * Math.sin(t * 1.0 + ph[0]) + 0.3 * Math.sin(t * 2.3 + ph[1]) + 0.15 * Math.sin(t * 5.1 + ph[2]) + 0.5);
        g.lineTo(x, y);
      }
      g.lineTo(W + 10, toY || H); g.closePath(); g.fill();
    }
    function haze(top, bot, col, a) { g.fillStyle = lin(g, 0, top, 0, bot, [rgba(col, 0), rgba(col, a)]); g.fillRect(0, top, W, bot - top); }
    function cypress(x, base, hgt, col) {
      g.fillStyle = col; g.beginPath(); g.moveTo(x, base - hgt);
      g.quadraticCurveTo(x + hgt * 0.17, base - hgt * 0.55, x + hgt * 0.1, base); g.lineTo(x - hgt * 0.1, base);
      g.quadraticCurveTo(x - hgt * 0.17, base - hgt * 0.55, x, base - hgt); g.fill();
    }
    function roundTree(x, base, r, col) { g.fillStyle = col; circle(g, x, base - r * 1.1, r); g.fill(); circle(g, x - r * 0.6, base - r * 0.7, r * 0.7); g.fill(); circle(g, x + r * 0.6, base - r * 0.75, r * 0.72); g.fill(); g.fillRect(x - r * 0.08, base - r * 0.5, r * 0.16, r * 0.5); }
    function palmSil(x, base, hgt, col) {
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.5, hgt * 0.05); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + hgt * 0.06, base - hgt * 0.5, x + hgt * 0.1, base - hgt); g.stroke();
      for (var f = 0; f < 7; f++) {
        var a = -Math.PI / 2 + (f - 3) * 0.5, L = hgt * 0.42, tx = x + hgt * 0.1, ty = base - hgt;
        g.beginPath(); g.moveTo(tx, ty);
        g.quadraticCurveTo(tx + Math.cos(a) * L * 0.7, ty + Math.sin(a) * L * 0.7 - L * 0.12, tx + Math.cos(a) * L, ty + Math.sin(a) * L + L * 0.45);
        g.lineWidth = Math.max(1.5, hgt * 0.06); g.stroke();
      }
    }
    function dome(x, base, wd, hgt, col) {
      g.fillStyle = col; g.fillRect(x - wd / 2, base - hgt * 0.45, wd, hgt * 0.45);
      g.beginPath(); g.moveTo(x - wd * 0.42, base - hgt * 0.45);
      g.bezierCurveTo(x - wd * 0.5, base - hgt * 0.95, x - wd * 0.05, base - hgt * 0.95, x, base - hgt * 1.15);
      g.bezierCurveTo(x + wd * 0.05, base - hgt * 0.95, x + wd * 0.5, base - hgt * 0.95, x + wd * 0.42, base - hgt * 0.45);
      g.closePath(); g.fill();
    }

    var gH = H - hz;
    // ---- far and mid scenery ----
    if (ai === 0) {
      ridge(hz - hz * 0.2, hz * 0.32, P.far, 11, 2.2);
      // a distant waterfall glinting on the mountain
      var wx = W * 0.24, wy = hz - hz * 0.42;
      g.fillStyle = lin(g, 0, wy, 0, hz, ['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.35)']);
      g.fillRect(wx - 3 * K, wy, 6 * K, hz - wy - hz * 0.08);
      haze(hz - hz * 0.6, hz, P.haze, 0.55);
      ridge(hz - hz * 0.06, hz * 0.14, P.far2, 12, 3.4);
      // a little white pavilion on the far hill
      var px = W * 0.64, pb = hz - hz * 0.1;
      dome(px, pb, 26 * K, 30 * K, '#f4f1ea');
      g.fillStyle = 'rgba(180,170,200,0.5)'; g.fillRect(px - 13 * K, pb - 6 * K, 26 * K, 6 * K);
      haze(hz - hz * 0.3, hz, P.haze, 0.45);
      var rT = rng(13);
      for (var i = 0; i < 26; i++) { var tx = rT() * W, th = (26 + rT() * 30) * K; if (rT() < 0.55) cypress(tx, hz + 2, th, mix(P.mid, P.haze, 0.35)); else roundTree(tx, hz + 2, th * 0.3, mix(P.mid, P.haze, 0.3)); }
      for (var j = 0; j < 7; j++) palmSil(rT() * W, hz + 3, (40 + rT() * 30) * K, mix(P.mid2, P.haze, 0.2));
    } else if (ai === 1) {
      ridge(hz - hz * 0.12, hz * 0.22, P.far, 21, 2.0);
      var rO = rng(22);
      // orchard rows on the far hills
      for (var row = 0; row < 3; row++) {
        var by = hz - hz * (0.14 - row * 0.05);
        for (var x2 = -10; x2 < W + 10; x2 += (14 + row * 6) * K) roundTree(x2 + rO() * 6 * K, by + rO() * 3, (4 + row * 2) * K, mix(P.mid, P.far, 0.55 - row * 0.15));
      }
      haze(hz - hz * 0.5, hz, P.haze, 0.5);
      ridge(hz - hz * 0.03, hz * 0.07, P.far2, 23, 3.0);
      for (var x3 = -10; x3 < W + 10; x3 += 18 * K) roundTree(x3 + rO() * 8 * K, hz + 2, (8 + rO() * 5) * K, mix(P.mid2, P.haze, 0.15));
      // the orchard gate at the end of the path
      var gx = V.x(AR.pathC(0)), gb = hz + 3, gw = 34 * K, gh = 46 * K;
      g.fillStyle = '#f2e2c4'; g.beginPath(); g.moveTo(gx - gw / 2, gb); g.lineTo(gx - gw / 2, gb - gh * 0.6);
      g.quadraticCurveTo(gx - gw / 2, gb - gh, gx, gb - gh * 1.1); g.quadraticCurveTo(gx + gw / 2, gb - gh, gx + gw / 2, gb - gh * 0.6);
      g.lineTo(gx + gw / 2, gb); g.lineTo(gx + gw * 0.3, gb); g.lineTo(gx + gw * 0.3, gb - gh * 0.55);
      g.quadraticCurveTo(gx + gw * 0.3, gb - gh * 0.82, gx, gb - gh * 0.9); g.quadraticCurveTo(gx - gw * 0.3, gb - gh * 0.82, gx - gw * 0.3, gb - gh * 0.55);
      g.lineTo(gx - gw * 0.3, gb); g.closePath(); g.fill();
      g.fillStyle = 'rgba(120,160,70,0.85)';
      for (var vn = 0; vn < 14; vn++) { var va = vn / 13 * Math.PI; circle(g, gx - Math.cos(va) * gw * 0.42, gb - gh * 0.55 - Math.sin(va) * gh * 0.45, 3.2 * K); g.fill(); }
    } else {
      // palace domes far away, then the arcade along the back of the courtyard
      ridge(hz - hz * 0.1, hz * 0.12, P.far2, 31, 2.4);
      var rC = rng(32);
      for (var d = 0; d < 5; d++) { var dx = W * (0.08 + d * 0.21 + rC() * 0.05); dome(dx, hz - hz * 0.12, (30 + rC() * 30) * K, (38 + rC() * 30) * K, mix(P.far, P.haze, 0.2)); }
      haze(hz - hz * 0.55, hz, P.haze, 0.55);
      for (var c2 = 0; c2 < 18; c2++) cypress(rC() * W, hz - hz * 0.2, (40 + rC() * 30) * K, mix(P.mid2, '#8e6f9a', 0.55));
      // arcade: a wall with pointed arches cut out (on its own canvas so the view through the arches stays)
      var aTop = hz - Math.min(hz * 0.5, 150 * K), aw = Math.max(46, 76 * K), colW = aw * 0.17, n = Math.ceil(W / aw) + 2, off = ((W % aw) - aw) / 2;
      var wall = '#f5e6d4', wallSh = '#e4c7b9', spring = aTop + (hz - aTop) * 0.42;
      var tmp = canvas(W * dpr, H * dpr), t2 = tmp.getContext('2d'); t2.scale(dpr, dpr);
      t2.fillStyle = lin(t2, 0, aTop, 0, hz, [wall, wallSh]); t2.fillRect(-10, aTop - 18 * K, W + 20, hz - aTop + 18 * K);
      function archPath(c2, x1) { var a1 = x1 + colW, b1 = x1 + aw, m1 = (a1 + b1) / 2;
        c2.beginPath(); c2.moveTo(b1, hz + 1); c2.lineTo(b1, spring); c2.quadraticCurveTo(b1, aTop + (spring - aTop) * 0.25, m1, aTop + (spring - aTop) * 0.08);
        c2.quadraticCurveTo(a1, aTop + (spring - aTop) * 0.25, a1, spring); c2.lineTo(a1, hz + 1); c2.closePath(); }
      for (var k = 0; k < n; k++) {
        var x1 = off + k * aw;
        // merlons along the top
        t2.fillStyle = wall; t2.beginPath(); t2.moveTo(x1, aTop - 17 * K); t2.lineTo(x1 + aw * 0.25, aTop - 17 * K); t2.lineTo(x1 + aw * 0.25, aTop - 25 * K);
        t2.lineTo(x1 + aw * 0.5, aTop - 33 * K); t2.lineTo(x1 + aw * 0.75, aTop - 25 * K); t2.lineTo(x1 + aw * 0.75, aTop - 17 * K); t2.closePath(); t2.fill();
        t2.fillStyle = '#e7b75a'; star8(t2, x1 + colW / 2, aTop - 8 * K, 5 * K); t2.fill();
      }
      t2.save(); t2.globalCompositeOperation = 'destination-out';
      for (var k1 = 0; k1 < n; k1++) { archPath(t2, off + k1 * aw); t2.fill(); }
      t2.restore();
      t2.strokeStyle = 'rgba(170,110,110,0.4)'; t2.lineWidth = Math.max(1.5, 3.5 * K);
      for (var k2 = 0; k2 < n; k2++) { archPath(t2, off + k2 * aw); t2.stroke(); }
      t2.fillStyle = 'rgba(190,120,110,0.35)'; t2.fillRect(-10, aTop - 2 * K, W + 20, 3 * K);
      g.drawImage(tmp, 0, 0, W, H);
      // a small lantern hanging in every other arch
      for (var k3 = 1; k3 < n; k3 += 2) {
        var lx = off + k3 * aw + colW / 2 + aw / 2, ly = aTop + (spring - aTop) * 0.62;
        g.strokeStyle = 'rgba(120,80,60,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(lx, aTop + (spring - aTop) * 0.1); g.lineTo(lx, ly - 6 * K); g.stroke();
        g.fillStyle = rad(g, lx, ly, 0, 16 * K, [[0, 'rgba(255,214,130,0.7)'], [1, 'rgba(255,214,130,0)']]); circle(g, lx, ly, 16 * K); g.fill();
        g.fillStyle = '#ffcf6e'; rr(g, lx - 3.5 * K, ly - 6 * K, 7 * K, 10 * K, 2 * K); g.fill();
      }
      g.fillStyle = 'rgba(150,100,100,0.25)'; g.fillRect(-10, hz - 5 * K, W + 20, 5 * K);
    }

    // ---- ground ----
    g.fillStyle = lin(g, 0, hz, 0, H, [[0, P.grass[0]], [0.25, P.grass[1]], [0.65, P.grass[2]], [1, P.grass[3]]]);
    g.fillRect(0, hz, W, gH);
    // mottled light and shade, flattened by perspective
    var rG = rng(77 + ai);
    for (var m = 0; m < 46; m++) {
      var my = hz + Math.pow(rG(), 0.8) * gH, mk = (my - hz) / gH, mr = (30 + rG() * 90) * (0.3 + mk) * Math.max(0.7, K);
      g.fillStyle = rgba(rG() < 0.5 ? '#ffffff' : '#1d5a24', 0.05 + rG() * 0.06);
      ell(g, rG() * W, my, mr, mr * (0.25 + mk * 0.15)); g.fill();
    }
    // grass blades, smaller toward the horizon
    var blades = Math.min(9000, Math.round(W * gH / 26));
    for (var b = 0; b < blades; b++) {
      var by2 = hz + Math.pow(rG(), 0.7) * gH, k3 = (by2 - hz) / gH, bl = (2 + rG() * 5) * (0.25 + k3 * 1.2) * Math.max(0.8, K);
      var bx2 = rG() * W, lean = (rG() - 0.4) * bl * 0.6;
      g.strokeStyle = rgba(rG() < 0.6 ? shade(P.grass[2], 0.25 + rG() * 0.2) : shade(P.grass[3], -0.15), 0.25 + k3 * 0.45);
      g.lineWidth = Math.max(0.6, 1.1 * (0.3 + k3)); g.beginPath(); g.moveTo(bx2, by2); g.lineTo(bx2 + lean, by2 - bl); g.stroke();
    }
    // a meadow of tiny far-away flowers near the horizon
    var fc = ['#ffffff', '#ffd6e4', '#fff1a8', '#d9c7ff'];
    for (var f = 0; f < W / 3; f++) { var fy = hz + Math.pow(rG(), 2) * gH * 0.35, fk = (fy - hz) / gH; g.fillStyle = rgba(fc[f % 4], 0.6); circle(g, rG() * W, fy, (0.7 + fk * 3) * Math.max(0.8, K)); g.fill(); }

    var water = null; // Path2D (screen px) for shimmer
    function uvPoly(fnTop, fnBot, u0, u1, steps) { // polygon between two v(u) curves
      var p = new Path2D(), i2;
      for (i2 = 0; i2 <= steps; i2++) { var u = u0 + (u1 - u0) * i2 / steps; var y = V.y(fnTop(u)); i2 ? p.lineTo(V.x(u), y) : p.moveTo(V.x(u), y); }
      for (i2 = steps; i2 >= 0; i2--) { var u2 = u0 + (u1 - u0) * i2 / steps; p.lineTo(V.x(u2), V.y(fnBot(u2))); }
      p.closePath(); return p;
    }
    function vuPoly(fnL, fnR, v0, v1, steps) { // polygon between two u(v) curves
      var p = new Path2D(), i2;
      for (i2 = 0; i2 <= steps; i2++) { var v = v0 + (v1 - v0) * i2 / steps; var x = V.x(fnL(v)); i2 ? p.lineTo(x, V.y(v)) : p.moveTo(x, V.y(v)); }
      for (i2 = steps; i2 >= 0; i2--) { var v2 = v0 + (v1 - v0) * i2 / steps; p.lineTo(V.x(fnR(v2)), V.y(v2)); }
      p.closePath(); return p;
    }
    var u0 = V.u(-20), u1 = V.u(W + 20);
    if (ai === 0) {
      var c = AR.riverC, hw = AR.riverHW, bank = 0.022;
      var bankP = uvPoly(function (u) { return c(u) - hw - bank; }, function (u) { return c(u) + hw + bank * 1.4; }, u0, u1, 80);
      g.fillStyle = lin(g, 0, V.y(0.25), 0, V.y(0.6), [shade(P.bank, 0.15), P.bank]); g.fill(bankP);
      water = uvPoly(function (u) { return c(u) - hw; }, function (u) { return c(u) + hw; }, u0, u1, 80);
      g.fillStyle = lin(g, 0, V.y(0.28), 0, V.y(0.56), P.water); g.fill(water);
      // wet edge and sky reflection
      g.save(); g.clip(water);
      g.strokeStyle = 'rgba(20,80,110,0.35)'; g.lineWidth = Math.max(2, 4 * K);
      g.stroke(uvPoly(function (u) { return c(u) + hw; }, function (u) { return c(u) + hw + 0.05; }, u0, u1, 80));
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill(uvPoly(function (u) { return c(u) - hw; }, function (u) { return c(u) - hw + 0.018; }, u0, u1, 80));
      g.restore();
      // stepping stones across the river
      for (var st = 0; st < 4; st++) {
        var su = 0.22 + (st % 2) * 0.012, sv = c(su) - hw + (st + 0.5) * (2 * hw / 4), sk = V.pf(sv);
        g.fillStyle = 'rgba(20,70,90,0.35)'; ell(g, V.x(su), V.y(sv) + 3 * sk, 15 * sk, 6 * sk); g.fill();
        g.fillStyle = lin(g, 0, V.y(sv) - 6 * sk, 0, V.y(sv) + 4 * sk, ['#f1ead8', '#b9ad95']); ell(g, V.x(su), V.y(sv), 14 * sk, 5.5 * sk); g.fill();
      }
      // reeds and lily pads
      var rR = rng(91);
      for (var rd = 0; rd < 9; rd++) {
        var ru = rR(), side = rR() < 0.5 ? -1 : 1, rv = c(ru) + side * (hw - 0.004), rk = V.pf(rv), rx = V.x(ru), ry = V.y(rv);
        g.strokeStyle = '#4a8a3e'; g.lineCap = 'round';
        for (var q = 0; q < 5; q++) { g.lineWidth = 1.6 * rk; g.beginPath(); g.moveTo(rx + (q - 2) * 3 * rk, ry); g.quadraticCurveTo(rx + (q - 2) * 4 * rk, ry - 14 * rk, rx + (q - 2) * 6 * rk + 2 * rk, ry - (22 + q * 3) * rk); g.stroke(); }
        g.fillStyle = '#8a5a32'; ell(g, rx + 2 * rk, ry - 20 * rk, 1.8 * rk, 5 * rk); g.fill();
      }
      for (var lp = 0; lp < 7; lp++) {
        var lu = 0.08 + rR() * 0.84, lv = c(lu) + (rR() - 0.5) * hw * 1.2, lk = V.pf(lv);
        if (Math.abs(lu - 0.22) < 0.05) continue;
        g.fillStyle = '#5fae4a'; g.beginPath(); g.ellipse(V.x(lu), V.y(lv), 11 * lk, 4.2 * lk, 0, 0.35, TAU - 0.1); g.lineTo(V.x(lu), V.y(lv)); g.fill();
        if (lp % 3 === 0) { g.fillStyle = '#ffb3cf'; for (var pt = 0; pt < 5; pt++) { ell(g, V.x(lu) + (pt - 2) * 2.2 * lk, V.y(lv) - 3 * lk, 2.4 * lk, 4.2 * lk, (pt - 2) * 0.35); g.fill(); } }
      }
    } else if (ai === 1) {
      var pc = AR.pathC, phw = AR.pathHW, vEnd = V.vMax;
      var edge = vuPoly(function (v) { return pc(v) - phw(v) - 0.012; }, function (v) { return pc(v) + phw(v) + 0.012; }, V.vMin, vEnd, 60);
      g.fillStyle = 'rgba(70,110,40,0.35)'; g.fill(edge);
      var path = vuPoly(function (v) { return pc(v) - phw(v); }, function (v) { return pc(v) + phw(v); }, V.vMin, vEnd, 60);
      g.fillStyle = lin(g, 0, hz, 0, H, [shade(P.bank, 0.25), P.bank, shade(P.bank, -0.12)]); g.fill(path);
      g.save(); g.clip(path);
      var rP = rng(55);
      for (var sv2 = -0.03; sv2 < vEnd; ) {
        var sk2 = V.pf(sv2), side2 = rP() < 0.5 ? -1 : 1;
        for (var col = -1; col <= 1; col += 2) {
          var su2 = pc(sv2) + col * phw(sv2) * 0.45 + (rP() - 0.5) * phw(sv2) * 0.25;
          g.fillStyle = 'rgba(90,60,30,0.25)'; ell(g, V.x(su2), V.y(sv2) + 2 * sk2, 14 * sk2, 6 * sk2); g.fill();
          g.fillStyle = lin(g, 0, V.y(sv2) - 6 * sk2, 0, V.y(sv2) + 5 * sk2, ['#f7ecd6', '#d5c09c']); ell(g, V.x(su2), V.y(sv2), 13 * sk2, 5.5 * sk2, side2 * 0.08); g.fill();
        }
        sv2 += 0.04 + 0.05 * Math.max(0, sv2);
      }
      g.restore();
      // grass tufts along the path edges
      g.strokeStyle = shade(P.grass[2], 0.1); g.lineCap = 'round';
      for (var e = 0; e < 70; e++) {
        var ev = rP() * vEnd, ek = V.pf(ev), es = rP() < 0.5 ? -1 : 1, ex = V.x(pc(ev) + es * phw(ev)), ey = V.y(ev);
        g.lineWidth = 1.3 * ek;
        for (var q2 = 0; q2 < 3; q2++) { g.beginPath(); g.moveTo(ex + (q2 - 1) * 2 * ek, ey); g.lineTo(ex + (q2 - 1) * 4 * ek - es * 2 * ek, ey - (6 + q2 * 2) * ek); g.stroke(); }
      }
    } else {
      var F = AR.fount, chw = AR.crossHW, cv = AR.crossV, cvh = AR.crossVHW, vEnd2 = V.vMax;
      var stone = '#f3e4c9', joint = 'rgba(190,160,120,0.55)';
      // hedge borders along the walks
      g.fillStyle = '#3f8a45';
      g.fill(vuPoly(function (v) { return 0.5 - chw(v) - 0.014; }, function (v) { return 0.5 + chw(v) + 0.014; }, V.vMin, vEnd2, 40));
      g.fill(uvPoly(function () { return cv - cvh - 0.016; }, function () { return cv + cvh + 0.02; }, u0, u1, 4));
      var walkV = vuPoly(function (v) { return 0.5 - chw(v); }, function (v) { return 0.5 + chw(v); }, V.vMin, vEnd2, 40);
      var walkH = uvPoly(function () { return cv - cvh; }, function () { return cv + cvh; }, u0, u1, 4);
      var plaza = new Path2D();
      for (var o = 0; o <= 8; o++) { var oa = o / 8 * TAU + Math.PI / 8; var ox = V.x(F.u + Math.cos(oa) * F.ru * 1.12), oy = V.y(F.v + Math.sin(oa) * F.rv * 1.12); o ? plaza.lineTo(ox, oy) : plaza.moveTo(ox, oy); }
      plaza.closePath();
      [walkV, walkH, plaza].forEach(function (p) { g.fillStyle = lin(g, 0, hz, 0, H, [shade(stone, 0.1), stone, shade(stone, -0.08)]); g.fill(p); });
      // tile joints
      g.save(); g.clip(walkV); g.strokeStyle = joint; g.lineWidth = 1;
      for (var tv = V.vMin; tv < vEnd2; tv += 0.03 + 0.02 * Math.max(0, tv)) { g.beginPath(); g.moveTo(V.x(0.5 - chw(tv)), V.y(tv)); g.lineTo(V.x(0.5 + chw(tv)), V.y(tv)); g.stroke(); }
      g.restore();
      g.save(); g.clip(walkH); g.strokeStyle = joint;
      for (var tu = u0; tu < u1; tu += 0.035) { g.beginPath(); g.moveTo(V.x(tu), V.y(cv - cvh)); g.lineTo(V.x(tu + 0.01), V.y(cv + cvh)); g.stroke(); }
      g.restore();
      // the water channels down the middle of the walks (charbagh)
      var chV = vuPoly(function (v) { return 0.5 - chw(v) * 0.32; }, function (v) { return 0.5 + chw(v) * 0.32; }, V.vMin, vEnd2, 40);
      var chH = uvPoly(function () { return cv - cvh * 0.3; }, function () { return cv + cvh * 0.3; }, u0, u1, 4);
      water = new Path2D(); water.addPath(chV); water.addPath(chH);
      g.strokeStyle = '#2f8fb0'; g.lineWidth = Math.max(2, 3 * K); g.stroke(chV); g.stroke(chH);
      g.fillStyle = lin(g, 0, hz, 0, H, P.water); g.fill(chV); g.fill(chH);
      // star tiles on the plaza
      g.save(); g.clip(plaza);
      g.fillStyle = 'rgba(230,183,90,0.55)';
      for (var pz = 0; pz < 16; pz++) { var pa = pz / 16 * TAU; var ppx = V.x(F.u + Math.cos(pa) * F.ru * 1.05), ppy = V.y(F.v + Math.sin(pa) * F.rv * 1.05), pk = V.pf(F.v); g.save(); g.translate(ppx, ppy); g.scale(1, 0.45); star8(g, 0, 0, 6 * pk); g.fill(); g.restore(); }
      g.restore();
      g.strokeStyle = 'rgba(160,120,80,0.45)'; g.lineWidth = 1.5; g.stroke(plaza);
    }
    // haze where the ground meets the sky
    g.fillStyle = lin(g, 0, hz - 2, 0, hz + gH * 0.22, [rgba(P.haze, 0.6), rgba(P.haze, 0)]); g.fillRect(0, hz - 2, W, gH * 0.22);

    return { sky: sky, land: land, water: water };
  };

  // ---------- clouds ----------
  A.cloud = function (seed, size, dpr) {
    var r = rng(seed), w = size * 2.4, h = size * 1.2, c = canvas(w * dpr, h * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr);
    var puffs = [];
    for (var i = 0; i < 6; i++) puffs.push([w * (0.2 + i * 0.12 + r() * 0.05), h * (0.62 - Math.sin(i / 5 * Math.PI) * 0.22 + r() * 0.05), size * (0.26 + Math.sin(i / 5 * Math.PI) * 0.18 + r() * 0.06)]);
    g.fillStyle = 'rgba(190,180,220,0.35)'; puffs.forEach(function (p) { circle(g, p[0], p[1] + size * 0.06, p[2]); g.fill(); });
    puffs.forEach(function (p) { g.fillStyle = rad(g, p[0] - p[2] * 0.3, p[1] - p[2] * 0.4, p[2] * 0.1, p[2] * 1.1, ['#ffffff', '#f4f2ff']); circle(g, p[0], p[1], p[2]); g.fill(); });
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = lin(g, 0, h * 0.75, 0, h, ['rgba(0,0,0,0)', 'rgba(0,0,0,1)']); g.fillRect(0, h * 0.75, w, h * 0.25);
    return { c: c, w: w, h: h };
  };

  // ---------- item sprites (local units, base at 0,0, up is -y) ----------
  function leaf(g, x, y, len, wid, ang, col, vein) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.45, -wid, len, 0); g.quadraticCurveTo(len * 0.45, wid, 0, 0); g.fill();
    if (vein) { g.strokeStyle = vein; g.lineWidth = Math.max(0.6, wid * 0.12); g.beginPath(); g.moveTo(len * 0.1, 0); g.lineTo(len * 0.85, 0); g.stroke(); }
    g.restore();
  }
  function stem(g, x0, y0, cx, cy, x1, y1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); }
  function rosette(g, n, len, col, col2) { for (var i = 0; i < n; i++) { var a = Math.PI + (i + 0.5) / n * Math.PI; leaf(g, 0, -1, len * (0.8 + (i % 2) * 0.3), len * 0.28, a, i % 2 ? col : col2, shade(col, -0.25)); } }

  function rose(g, x, y, r) {
    g.fillStyle = '#2f7a35'; for (var s = 0; s < 5; s++) leaf(g, x, y + r * 0.5, r * 0.75, r * 0.3, Math.PI / 2 + (s - 2) * 0.6, '#3c8f3f');
    g.fillStyle = rad(g, x - r * 0.3, y - r * 0.4, r * 0.1, r * 1.1, ['#ff8a9a', '#e3344f', '#9c1631']); circle(g, x, y, r); g.fill();
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * TAU + 0.4;
      g.fillStyle = i % 2 ? '#d42744' : '#ef4a62';
      ell(g, x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.42, r * 0.5, r * 0.36, a); g.fill();
    }
    g.fillStyle = rad(g, x, y - r * 0.1, 0, r * 0.6, ['#ff9aa8', '#e23a55']); circle(g, x, y - r * 0.08, r * 0.55); g.fill();
    g.strokeStyle = '#a3172f'; g.lineWidth = r * 0.09; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y - r * 0.08, r * 0.38, 0.4, 3.6); g.stroke();
    g.beginPath(); g.arc(x + r * 0.05, y - r * 0.12, r * 0.18, 3.0, 6.0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; ell(g, x - r * 0.35, y - r * 0.55, r * 0.25, r * 0.12, -0.5); g.fill();
  }
  function tulipCup(g, x, y, r, c0, c1, c2) {
    g.save(); g.translate(x, y);
    g.fillStyle = lin(g, 0, -r * 1.35, 0, r * 0.9, [c0, c1, c2]);
    g.beginPath(); g.moveTo(-r, -0.2 * r); g.quadraticCurveTo(-r * 1.05, r * 0.9, 0, r * 0.9); g.quadraticCurveTo(r * 1.05, r * 0.9, r, -0.2 * r);
    g.lineTo(r * 0.78, -1.2 * r); g.quadraticCurveTo(r * 0.5, -0.7 * r, r * 0.3, -0.62 * r); g.lineTo(0, -1.35 * r); g.lineTo(-r * 0.3, -0.62 * r);
    g.quadraticCurveTo(-r * 0.5, -0.7 * r, -r * 0.78, -1.2 * r); g.closePath(); g.fill();
    g.fillStyle = rgba(c0, 0.55); g.beginPath(); g.moveTo(-r * 0.42, r * 0.7); g.quadraticCurveTo(-r * 0.55, -0.5 * r, 0, -1.35 * r); g.quadraticCurveTo(r * 0.55, -0.5 * r, r * 0.42, r * 0.7); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)'; ell(g, -r * 0.5, -r * 0.2, r * 0.14, r * 0.45, 0.2); g.fill();
    g.restore();
  }
  function daisyHead(g, x, y, r, tilt) {
    g.save(); g.translate(x, y); g.scale(1, tilt);
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * TAU;
      g.fillStyle = Math.sin(a) > 0.3 ? '#e7e2f2' : '#ffffff';
      ell(g, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.5, r * 0.16, a); g.fill();
    }
    g.fillStyle = rad(g, -r * 0.1, -r * 0.12, 0, r * 0.38, ['#ffe36b', '#f7b21f', '#d9830f']); circle(g, 0, 0, r * 0.34); g.fill();
    g.restore();
  }
  function canopy(g, blobs, base, light, dark) {
    g.fillStyle = dark; blobs.forEach(function (b) { circle(g, b[0] + 4, b[1] + 6, b[2]); g.fill(); });
    blobs.forEach(function (b) { g.fillStyle = rad(g, b[0] - b[2] * 0.35, b[1] - b[2] * 0.45, b[2] * 0.1, b[2] * 1.15, [light, base, shade(base, -0.18)]); circle(g, b[0], b[1], b[2]); g.fill(); });
  }
  function leafTexture(g, blobs, seed, col, n, sz) {
    var r = rng(seed);
    for (var i = 0; i < n; i++) {
      var b = blobs[(r() * blobs.length) | 0], a = r() * TAU, d = Math.sqrt(r()) * b[2] * 0.9;
      g.fillStyle = r() < 0.5 ? rgba(col, 0.35) : 'rgba(20,60,20,0.18)';
      ell(g, b[0] + Math.cos(a) * d, b[1] + Math.sin(a) * d, sz, sz * 0.5, r() * 3); g.fill();
    }
  }
  function trunk(g, h, w, col) {
    g.fillStyle = lin(g, -w, 0, w, 0, [shade(col, 0.15), col, shade(col, -0.3)]);
    g.beginPath(); g.moveTo(-w * 0.9, 0); g.quadraticCurveTo(-w * 0.5, -h * 0.5, -w * 0.45, -h); g.lineTo(w * 0.45, -h); g.quadraticCurveTo(w * 0.5, -h * 0.5, w * 0.9, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(70,120,40,0.8)'; for (var i = 0; i < 7; i++) { leaf(g, (i - 3) * w * 0.35, 0, w * 1.1, w * 0.3, -Math.PI / 2 + (i - 3) * 0.32, i % 2 ? '#5aa548' : '#3f8a3a'); }
  }
  function fruitTree(g, seed, base, light, dark, fruit) {
    trunk(g, 92, 10, '#8a5a36');
    g.strokeStyle = '#7a4c2c'; g.lineCap = 'round'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(0, -60); g.quadraticCurveTo(-18, -80, -34, -100); g.moveTo(0, -70); g.quadraticCurveTo(20, -88, 34, -104); g.stroke();
    var blobs = [[-46, -112, 40], [46, -114, 40], [0, -158, 46], [-28, -146, 40], [30, -150, 40], [0, -112, 46], [-58, -138, 28], [58, -140, 28]];
    canopy(g, blobs, base, light, dark);
    leafTexture(g, blobs, seed, light, 90, 6);
    var r = rng(seed + 7), placed = [];
    for (var i = 0; i < 40 && placed.length < 13; i++) {
      var b = blobs[(r() * blobs.length) | 0], a = r() * TAU, d = Math.sqrt(r()) * b[2] * 0.8, fx = b[0] + Math.cos(a) * d, fy = b[1] + Math.sin(a) * d;
      if (placed.some(function (p) { return Math.hypot(p[0] - fx, p[1] - fy) < 20; })) continue;
      placed.push([fx, fy]); fruit(g, fx, fy);
    }
  }
  function apple(g, x, y) {
    g.fillStyle = rad(g, x - 2.5, y - 3, 0.5, 8.5, ['#ff8a7a', '#e8413c', '#a8221e']); circle(g, x, y, 7.2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; ell(g, x - 2.6, y - 3, 1.8, 1.1, -0.6); g.fill();
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 1, y - 9.5); g.stroke();
    leaf(g, x + 1, y - 8.5, 7, 2.6, -0.4, '#4fa84a');
  }
  function orange(g, x, y) {
    g.fillStyle = rad(g, x - 2.5, y - 3, 0.5, 8.5, ['#ffd27a', '#ff9a1f', '#d36a0c']); circle(g, x, y, 7.2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; ell(g, x - 2.6, y - 3, 1.7, 1.1, -0.6); g.fill();
    leaf(g, x, y - 6.5, 7, 2.6, -0.9, '#2f8a4a');
  }
  function pomegranate(g, x, y) {
    g.fillStyle = rad(g, x - 3, y - 3, 0.5, 10, ['#ff7a86', '#c8283f', '#7e1426']); circle(g, x, y, 8.2); g.fill();
    g.fillStyle = '#8e1a2c'; g.beginPath(); g.moveTo(x - 3.5, y - 7); g.lineTo(x - 2.6, y - 11.5); g.lineTo(x - 0.8, y - 8.5); g.lineTo(x, y - 12); g.lineTo(x + 0.8, y - 8.5); g.lineTo(x + 2.6, y - 11.5); g.lineTo(x + 3.5, y - 7); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, x - 3, y - 3, 2, 1.2, -0.6); g.fill();
  }

  var SPR = A.SPR = {
    rose: { w: 78, h: 86, draw: function (g) {
      rosette(g, 6, 26, '#3c8f3f', '#2f7a35');
      stem(g, 0, 0, -6, -24, -18, -44, 3.2, '#3a7d34'); stem(g, 0, 0, 8, -30, 16, -54, 3.2, '#3a7d34'); stem(g, 0, 0, -2, -40, 0, -70, 3.4, '#3a7d34');
      leaf(g, -4, -26, 16, 6, -2.4, '#4c9c45', '#2b6a2a'); leaf(g, 6, -34, 16, 6, -0.6, '#4c9c45', '#2b6a2a'); leaf(g, 0, -52, 14, 5, -2.6, '#4c9c45', '#2b6a2a');
      rose(g, -18, -46, 12); rose(g, 16, -56, 12.5); rose(g, 0, -72, 13.5);
    } },
    tulip: { w: 66, h: 84, draw: function (g) {
      [[-14, -2.2], [12, -0.9]].forEach(function (l) { leaf(g, l[0] * 0.3, -2, 40, 9, l[1], '#5aa84a', '#3c7f35'); });
      stem(g, -2, 0, -10, -26, -16, -50, 3.2, '#4a9440'); stem(g, 2, 0, 12, -28, 15, -56, 3.2, '#4a9440'); stem(g, 0, 0, 0, -40, 0, -68, 3.4, '#4a9440');
      leaf(g, 0, -4, 34, 7, -1.75, '#64b252', '#3c7f35');
      tulipCup(g, -16, -54, 10.5, '#ffc1d6', '#ff6fa3', '#c23a72'); tulipCup(g, 15, -60, 10.5, '#ffc1d6', '#ff6fa3', '#c23a72'); tulipCup(g, 0, -74, 11.5, '#ffd0e0', '#ff5d98', '#b52f66');
    } },
    daisy: { w: 78, h: 64, draw: function (g) {
      rosette(g, 8, 22, '#5aa84a', '#468f3c');
      [[-22, -34, 10], [20, -38, 10.5], [-4, -50, 11.5], [8, -26, 9]].forEach(function (d) {
        stem(g, d[0] * 0.2, 0, d[0] * 0.6, d[1] * 0.4, d[0], d[1], 2.4, '#4a9440');
      });
      [[-22, -34, 10], [20, -38, 10.5], [8, -26, 9], [-4, -50, 11.5]].forEach(function (d) { daisyHead(g, d[0], d[1], d[2], 0.82); });
    } },
    lavender: { w: 64, h: 86, draw: function (g) {
      for (var i = 0; i < 9; i++) leaf(g, (i - 4) * 2, 0, 24, 3.2, -Math.PI / 2 + (i - 4) * 0.28, i % 2 ? '#7fa883' : '#93b896');
      var r = rng(5);
      for (var s = 0; s < 7; s++) {
        var a = (s - 3) * 0.16, L = 62 + r() * 18 - Math.abs(s - 3) * 4, tx = Math.sin(a) * L, ty = -Math.cos(a) * L;
        stem(g, 0, 0, tx * 0.4, ty * 0.5, tx, ty, 1.8, '#6f9a6a');
        for (var b = 0; b < 9; b++) {
          var t = 0.62 + b / 9 * 0.4, bx = tx * t, by = ty * t;
          g.fillStyle = b % 3 === 0 ? '#7346b8' : b % 3 === 1 ? '#9a6ce0' : '#b98bf2';
          ell(g, bx - 2.2, by, 2.6, 3.6, a - 0.5); g.fill(); ell(g, bx + 2.2, by - 1.5, 2.6, 3.6, a + 0.5); g.fill();
        }
        g.fillStyle = '#c9a8ff'; ell(g, tx, ty - 2, 2, 3.2, a); g.fill();
      }
    } },
    bush: { w: 112, h: 80, draw: function (g) {
      var blobs = [[-34, -24, 24], [34, -24, 24], [-14, -44, 28], [16, -46, 27], [0, -26, 32], [-44, -14, 14], [44, -14, 14]];
      canopy(g, blobs, '#4fa055', '#8fd878', '#255f30');
      leafTexture(g, blobs, 3, '#a8e890', 70, 4.5);
      var r = rng(8);
      for (var i = 0; i < 16; i++) {
        var b = blobs[(r() * blobs.length) | 0], a = r() * TAU, d = Math.sqrt(r()) * b[2] * 0.8, fx = b[0] + Math.cos(a) * d, fy = b[1] + Math.sin(a) * d;
        g.fillStyle = i % 3 ? '#ffd1e3' : '#ffffff';
        for (var p = 0; p < 5; p++) { var pa = p / 5 * TAU; circle(g, fx + Math.cos(pa) * 2, fy + Math.sin(pa) * 2, 1.8); g.fill(); }
        g.fillStyle = '#ffcf4a'; circle(g, fx, fy, 1.2); g.fill();
      }
    } },
    palm: { w: 190, h: 262, hitW: 0.5, draw: function (g) {
      // trunk: a gentle curve with ring segments
      var pts = [];
      for (var i = 0; i <= 20; i++) { var t = i / 20; pts.push([Math.sin(t * 1.6) * 16, -t * 196, 11 - t * 4.5]); }
      g.fillStyle = lin(g, -12, 0, 22, 0, ['#d9a86a', '#a8743e', '#6e4523']);
      g.beginPath(); pts.forEach(function (p, k) { k ? g.lineTo(p[0] - p[2], p[1]) : g.moveTo(p[0] - p[2], p[1]); });
      for (var j = pts.length - 1; j >= 0; j--) g.lineTo(pts[j][0] + pts[j][2], pts[j][1]); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(80,45,20,0.55)'; g.lineWidth = 2;
      for (var k = 1; k < pts.length; k++) { var p2 = pts[k]; g.beginPath(); g.moveTo(p2[0] - p2[2], p2[1] + 3); g.quadraticCurveTo(p2[0], p2[1] - 2, p2[0] + p2[2], p2[1] + 3); g.stroke(); }
      g.fillStyle = 'rgba(70,120,40,0.85)'; for (var q = 0; q < 6; q++) leaf(g, (q - 2.5) * 5, 0, 14, 4, -Math.PI / 2 + (q - 2.5) * 0.4, '#5aa548');
      var cx = pts[20][0], cy = pts[20][1];
      // dates
      [[-14, 10], [14, 8]].forEach(function (d) {
        for (var n = 0; n < 14; n++) { var dx = cx + d[0] + ((n % 4) - 1.5) * 5, dy = cy + d[1] + Math.floor(n / 4) * 5.5;
          g.fillStyle = n % 2 ? '#c8641c' : '#e08a2c'; ell(g, dx, dy, 3, 3.8); g.fill(); }
      });
      // fronds
      var fr = [[-2.9, 92], [-2.4, 100], [-1.95, 96], [-1.5, 84], [-1.1, 92], [-0.7, 98], [-0.25, 92], [0.15, 84], [-3.4, 80]];
      fr.forEach(function (f, n) {
        var a = f[0], L = f[1], ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * 0.55 + L * 0.42;
        var mx = cx + Math.cos(a) * L * 0.55, my = cy + Math.sin(a) * L * 0.6 - 16;
        var col = n % 2 ? '#3f9a4a' : '#56b356', dark = '#2d7a3a';
        g.strokeStyle = col; g.lineCap = 'round';
        for (var t = 0.08; t < 1; t += 0.05) {
          var bx = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * ex, by = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * my + t * t * ey;
          var tx = 2 * (1 - t) * (mx - cx) + 2 * t * (ex - mx), ty = 2 * (1 - t) * (my - cy) + 2 * t * (ey - my), tl = Math.hypot(tx, ty) || 1;
          var nx = -ty / tl, ny = tx / tl, ll = 22 * Math.sin(t * Math.PI) + 4;
          g.lineWidth = 3.2; g.strokeStyle = col;
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + nx * ll + tx / tl * 6, by + ny * ll + ty / tl * 6 + 5); g.stroke();
          g.strokeStyle = shade(col, -0.12);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - nx * ll + tx / tl * 6, by - ny * ll + ty / tl * 6 + 5); g.stroke();
        }
        g.strokeStyle = dark; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      });
      g.fillStyle = '#7a4c25'; circle(g, cx, cy, 7); g.fill();
    } },
    apple: { w: 200, h: 214, hitW: 0.7, draw: function (g) { fruitTree(g, 11, '#4fa84a', '#9be27a', '#24652e', apple); } },
    orange: { w: 200, h: 214, hitW: 0.7, draw: function (g) { fruitTree(g, 23, '#2f9a55', '#87dc8e', '#175f36', orange); } },
    pomegranate: { w: 200, h: 214, hitW: 0.7, draw: function (g) { fruitTree(g, 37, '#5a9e3c', '#b1de7a', '#2c5f22', pomegranate); } },
    fountain: { w: 132, h: 112, draw: function (g) {
      var stone = '#efe2c8', sh = '#c9b18c';
      g.fillStyle = lin(g, -58, 0, 58, 0, [shade(stone, -0.1), stone, sh]);
      g.beginPath(); g.moveTo(-58, -26); g.lineTo(-58, -6); g.ellipse(0, -6, 58, 14, 0, Math.PI, 0, true); g.lineTo(58, -26); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(140,110,80,0.4)'; g.lineWidth = 1.5;
      [-40, -14, 14, 40].forEach(function (x) { g.beginPath(); g.moveTo(x, -26 + 15 * Math.sqrt(1 - x * x / 3600)); g.lineTo(x, -6 + 14 * Math.sqrt(1 - x * x / 3364)); g.stroke(); });
      g.fillStyle = '#35b2ab'; g.beginPath(); g.ellipse(0, -18, 58, 14, 0, 0.15, Math.PI - 0.15); g.lineTo(-56, -14); g.ellipse(0, -14, 56, 13, 0, Math.PI - 0.15, 0.15, true); g.closePath(); g.fill();
      // rim
      g.fillStyle = shade(stone, 0.2); ell(g, 0, -26, 60, 15); g.fill();
      g.fillStyle = '#4fb8d4'; ell(g, 0, -26, 52, 11.5); g.fill();
      // pedestal and upper bowl
      g.fillStyle = lin(g, -8, 0, 8, 0, [stone, sh]); g.fillRect(-7, -66, 14, 42);
      g.fillStyle = lin(g, 0, -72, 0, -60, [shade(stone, 0.2), sh]); g.beginPath(); g.ellipse(0, -66, 28, 8, 0, 0, Math.PI); g.lineTo(-28, -66); g.fill();
      g.fillStyle = shade(stone, 0.25); ell(g, 0, -68, 28, 7); g.fill();
      g.fillStyle = '#62c6dd'; ell(g, 0, -68, 23, 5); g.fill();
      g.fillStyle = stone; g.fillRect(-3, -84, 6, 16); circle(g, 0, -86, 5); g.fill();
      g.fillStyle = '#e7b75a'; star8(g, 0, -14, 6); g.fill();
    } },
    pond: { w: 184, h: 38, below: 38, flat: true, draw: function (g) {
      // centred on the base point: a flat pool on the ground
      var r = rng(19);
      g.fillStyle = 'rgba(40,80,40,0.25)'; ell(g, 0, 4, 86, 30); g.fill();
      for (var i = 0; i < 26; i++) {
        var a = i / 26 * TAU, x = Math.cos(a) * 78, y = Math.sin(a) * 25;
        g.fillStyle = lin(g, 0, y - 6, 0, y + 6, [i % 2 ? '#efe6d2' : '#e2d6bc', '#a99a7c']); ell(g, x, y, 10 + r() * 3, 6 + r() * 1.5, a + Math.PI / 2 * 0); g.fill();
      }
      g.fillStyle = lin(g, 0, -24, 0, 24, ['#8fdde9', '#3aa8c8', '#2a86ad']); ell(g, 0, 0, 72, 21); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)'; ell(g, -10, -12, 50, 5); g.fill();
      [[-34, 4, 12], [26, -6, 11], [40, 8, 9]].forEach(function (p, k) {
        g.fillStyle = k ? '#5fae4a' : '#4c9c3f'; g.beginPath(); g.ellipse(p[0], p[1], p[2], p[2] * 0.42, 0, 0.4, TAU - 0.1); g.lineTo(p[0], p[1]); g.fill();
      });
      g.fillStyle = '#ffb3cf'; for (var pt = 0; pt < 6; pt++) { ell(g, -34 + (pt - 2.5) * 2.6, -1, 2.8, 5.5, (pt - 2.5) * 0.35); g.fill(); }
      g.fillStyle = '#ffe36b'; circle(g, -34, 0, 2); g.fill();
    } },
    bench: { w: 128, h: 70, draw: function (g) {
      var wood = '#c07a40', dark = '#7a4622', light = '#e8ac70';
      g.fillStyle = '#4a3324'; [-50, 50].forEach(function (x) { g.fillRect(x - 4, -24, 8, 24); g.fillRect(x - 3, -66, 6, 44); });
      g.fillStyle = lin(g, 0, -66, 0, -40, [light, wood]); rr(g, -58, -64, 116, 10, 4); g.fill(); rr(g, -58, -50, 116, 9, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-54, -63, 108, 2); g.fillRect(-54, -49, 108, 2);
      g.fillStyle = light; g.beginPath(); g.moveTo(-62, -30); g.lineTo(62, -30); g.lineTo(56, -22); g.lineTo(-56, -22); g.closePath(); g.fill();
      g.fillStyle = wood; g.fillRect(-56, -22, 112, 7); g.fillStyle = dark; g.fillRect(-56, -15, 112, 2);
      g.strokeStyle = 'rgba(90,50,20,0.4)'; g.lineWidth = 1; [-20, 20].forEach(function (x) { g.beginPath(); g.moveTo(x - 4, -30); g.lineTo(x - 2, -22); g.stroke(); });
      g.fillStyle = '#e7b75a'; star8(g, 0, -57, 5); g.fill();
    } },
    birdhouse: { w: 64, h: 142, draw: function (g) {
      g.fillStyle = lin(g, -4, 0, 4, 0, ['#b9844e', '#7d5130']); g.fillRect(-3.5, -92, 7, 92);
      g.fillStyle = 'rgba(70,120,40,0.85)'; for (var q = 0; q < 5; q++) leaf(g, (q - 2) * 3, 0, 12, 3.5, -Math.PI / 2 + (q - 2) * 0.45, '#5aa548');
      g.fillStyle = lin(g, -22, 0, 22, 0, ['#fff4dd', '#f2dfba', '#d9c093']); rr(g, -21, -124, 42, 36, 3); g.fill();
      g.fillStyle = '#2f9e95'; g.beginPath(); g.moveTo(-29, -118); g.lineTo(0, -142); g.lineTo(29, -118); g.lineTo(25, -114); g.lineTo(0, -134); g.lineTo(-25, -114); g.closePath(); g.fill();
      g.fillStyle = '#4fc3b8'; g.beginPath(); g.moveTo(-29, -118); g.lineTo(0, -142); g.lineTo(0, -134); g.lineTo(-25, -114); g.closePath(); g.fill();
      g.fillStyle = '#4a2e1c'; circle(g, 0, -108, 6.5); g.fill();
      g.strokeStyle = '#8a5a36'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -97); g.lineTo(0, -91); g.stroke();
      g.fillStyle = '#e7b75a'; star8(g, 0, -126, 3.4); g.fill();
    } },
    lantern: { w: 56, h: 140, glow: [0, -104], draw: function (g) {
      var br = '#5a4330';
      g.fillStyle = lin(g, -12, 0, 12, 0, ['#8a6a48', br]); rr(g, -12, -10, 24, 10, 3); g.fill();
      g.fillStyle = lin(g, -4, 0, 4, 0, ['#8a6a48', br]); g.fillRect(-3.5, -84, 7, 76);
      g.fillStyle = br; g.fillRect(-12, -88, 24, 5);
      // lantern body
      g.fillStyle = lin(g, 0, -122, 0, -88, ['#fff1b8', '#ffc85a', '#f39a2e']);
      g.beginPath(); g.moveTo(-11, -88); g.lineTo(-14, -112); g.lineTo(14, -112); g.lineTo(11, -88); g.closePath(); g.fill();
      g.strokeStyle = br; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(0, -88); g.lineTo(0, -112); g.stroke();
      g.fillStyle = 'rgba(160,80,20,0.55)'; star8(g, -6.5, -100, 3.6); g.fill(); star8(g, 6.5, -100, 3.6); g.fill();
      g.fillStyle = br; g.beginPath(); g.moveTo(-17, -112); g.lineTo(17, -112); g.quadraticCurveTo(12, -124, 0, -132); g.quadraticCurveTo(-12, -124, -17, -112); g.fill();
      g.fillStyle = '#e7b75a'; circle(g, 0, -134, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-11, -110, 3, 18);
    } },
    butterfly: { w: 60, h: 92, flat: false, draw: function () {} },
    // ---- fixed scenery ----
    well: { w: 110, h: 130, draw: function (g) {
      var st = '#d8cbb2';
      g.fillStyle = '#6b4a2e'; g.fillRect(-40, -116, 6, 92); g.fillRect(34, -116, 6, 92);
      g.fillStyle = '#b5523c'; g.beginPath(); g.moveTo(-52, -108); g.lineTo(0, -132); g.lineTo(52, -108); g.lineTo(46, -102); g.lineTo(-46, -102); g.closePath(); g.fill();
      g.fillStyle = '#d4705a'; g.beginPath(); g.moveTo(-52, -108); g.lineTo(0, -132); g.lineTo(0, -124); g.lineTo(-46, -102); g.closePath(); g.fill();
      g.strokeStyle = '#5a3a20'; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, -84); g.lineTo(34, -84); g.stroke();
      g.strokeStyle = '#8a7050'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(4, -84); g.lineTo(4, -54); g.stroke();
      g.fillStyle = '#8a5a36'; rr(g, -2, -56, 12, 11, 2); g.fill();
      g.fillStyle = lin(g, -44, 0, 44, 0, [shade(st, 0.1), st, shade(st, -0.2)]);
      g.beginPath(); g.moveTo(-44, -36); g.lineTo(-44, -4); g.ellipse(0, -4, 44, 11, 0, Math.PI, 0, true); g.lineTo(44, -36); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(120,100,70,0.45)'; g.lineWidth = 1.2;
      for (var row = 0; row < 3; row++) { g.beginPath(); g.ellipse(0, -32 + row * 10, 44, 11, 0, 0.1, Math.PI - 0.1); g.stroke(); }
      g.fillStyle = shade(st, 0.2); ell(g, 0, -36, 45, 11); g.fill(); g.fillStyle = '#2d4f5a'; ell(g, 0, -36, 37, 8); g.fill();
    } }
  };

  var cache = {};
  A.clearCache = function () { cache = {}; };
  // Sprite for an item type rendered at k device px per unit (cached).
  A.sprite = function (type, k) {
    var key = type + '@' + k.toFixed(3);
    if (cache[key]) return cache[key];
    var S = SPR[type], pad = 8, uw = S.w + pad * 2, uh = S.h + (S.below || 0) + pad * 2;
    var c = canvas(uw * k, uh * k), g = c.getContext('2d');
    g.scale(k, k); g.translate(uw / 2, S.h + pad);
    S.draw(g);
    cache[key] = { c: c, ax: uw / 2, ay: S.h + pad, uw: uw, uh: uh, S: S };
    return cache[key];
  };
  A.drawSprite = function (ctx, sp) { ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.uw, sp.uh); };

  // ---------- animated pieces ----------
  // A butterfly at (x, y), s = px per unit, t = time, hue = colour set, dir = facing (-1/1).
  var BFLY = [['#ffb347', '#ff7a2e', '#5a2a10'], ['#7ec8ff', '#3a8ee8', '#1a3a6a'], ['#ff9ec4', '#e8568f', '#5a1a3a'], ['#fff07a', '#f2c230', '#5a4410'], ['#c9a6ff', '#8f62e8', '#3a2060']];
  A.butterfly = function (ctx, x, y, s, t, hue, dir) {
    var C = BFLY[((hue % BFLY.length) + BFLY.length) % BFLY.length], f = 0.25 + 0.75 * Math.abs(Math.cos(t * 13));
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (dir || 1), s); ctx.rotate(0.12 * Math.sin(t * 3));
    [-1, 1].forEach(function (side) {
      ctx.save(); ctx.scale(side * f, 1);
      ctx.fillStyle = C[1]; ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(10, -22, 26, -18, 20, -4); ctx.bezierCurveTo(16, 2, 6, 2, 0, 0); ctx.fill();
      ctx.fillStyle = C[0]; ell(ctx, 13, -10, 5, 4, -0.4); ctx.fill();
      ctx.fillStyle = shade(C[1], -0.1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(12, 2, 18, 12, 10, 15); ctx.bezierCurveTo(5, 16, 1, 8, 0, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, 18, -12, 1.6); ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = C[2]; ell(ctx, 0, 2, 2, 8); ctx.fill();
    ctx.strokeStyle = C[2]; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-0.5, -5); ctx.quadraticCurveTo(-3, -12, -6, -14); ctx.moveTo(0.5, -5); ctx.quadraticCurveTo(3, -12, 6, -14); ctx.stroke();
    ctx.restore();
  };
  // A soft bird silhouette gliding (no face, just body and wings).
  A.bird = function (ctx, x, y, s, t, col) {
    var f = Math.sin(t * 7) * 0.8;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(-14, -2 - f * 8); ctx.quadraticCurveTo(-7, -6 - f * 4, 0, 0); ctx.quadraticCurveTo(7, -6 - f * 4, 14, -2 - f * 8); ctx.stroke();
    ell(ctx, 0, 0.5, 4.2, 2.2); ctx.fill();
    ctx.restore();
  };
  // Fountain water on top of the fountain sprite (local units, base at 0,0).
  A.fountainWater = function (ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.55; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2;
    for (var r = 0; r < 2; r++) { var k = (t * 0.6 + r * 0.5) % 1; ctx.globalAlpha = 0.5 * (1 - k); ctx.beginPath(); ctx.ellipse(0, -26, 12 + k * 36, 3 + k * 8, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(225,248,255,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * TAU + 0.3, ex = Math.cos(a) * 22, ey = -66 + Math.sin(a) * 5;
      ctx.beginPath(); ctx.moveTo(0, -88); ctx.quadraticCurveTo(ex * 0.5, -104, ex, ey); ctx.stroke();
      var bx = Math.cos(a) * 27, by = -66 + Math.sin(a) * 6.5, fx = Math.cos(a) * 44, fy = -26 + Math.sin(a) * 9;
      if (Math.sin(a) > -0.6) { ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + Math.cos(a) * 10, by - 2, fx, fy); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.fillStyle = '#ffffff';
    for (var d = 0; d < 8; d++) { var ph = (t * 1.4 + d / 8) % 1, da = d / 8 * TAU; ctx.globalAlpha = 1 - ph; circle(ctx, Math.cos(da) * 22 * ph, -88 - 18 * Math.sin(ph * Math.PI) + 22 * ph * ph, 1.3); ctx.fill(); }
    ctx.restore();
  };
  // The big courtyard fountain, sized to its footprint (screen px; cx, cy = centre; rx, ry = basin radii; k = px per unit).
  A.bigFountain = function (ctx, cx, cy, rx, ry, k, t) {
    var stone = '#f3e6cd', sh = '#cdb48e', wallH = Math.max(8, ry * 0.55);
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(60,40,20,0.18)'; ell(ctx, 0, wallH * 0.6, rx * 1.06, ry * 1.06); ctx.fill();
    // front wall
    ctx.fillStyle = lin(ctx, -rx, 0, rx, 0, [shade(stone, -0.06), stone, sh]);
    ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(rx, wallH); ctx.ellipse(0, wallH, rx, ry, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(53,178,171,0.85)'; ctx.beginPath(); ctx.ellipse(0, wallH * 0.45, rx, ry, 0, 0.12, Math.PI - 0.12); ctx.ellipse(0, wallH * 0.62, rx, ry, 0, Math.PI - 0.12, 0.12, true); ctx.closePath(); ctx.fill();
    // rim and water
    ctx.fillStyle = shade(stone, 0.2); ell(ctx, 0, 0, rx, ry); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ry, 0, ry, ['#9fe6f0', '#3fb0d0', '#2a8fb8']); ell(ctx, 0, 0, rx * 0.9, ry * 0.84); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.4;
    for (var r = 0; r < 3; r++) { var q = (t * 0.45 + r / 3) % 1; ctx.globalAlpha = 0.6 * (1 - q); ell(ctx, 0, 0, rx * (0.18 + q * 0.7), ry * (0.18 + q * 0.66)); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // tiers
    var colH = Math.min(rx * 0.75, 80 * k), cw = Math.max(5, rx * 0.07);
    ctx.fillStyle = lin(ctx, -cw, 0, cw, 0, [stone, sh]); ctx.fillRect(-cw, -colH, cw * 2, colH);
    var b1 = rx * 0.42, b1y = -colH * 0.55;
    ctx.fillStyle = lin(ctx, 0, b1y - 6, 0, b1y + b1 * 0.3, [shade(stone, 0.2), sh]); ctx.beginPath(); ctx.ellipse(0, b1y, b1, b1 * 0.3, 0, 0, Math.PI); ctx.lineTo(-b1, b1y); ctx.fill();
    ctx.fillStyle = shade(stone, 0.25); ell(ctx, 0, b1y, b1, b1 * 0.24); ctx.fill(); ctx.fillStyle = '#62c6dd'; ell(ctx, 0, b1y, b1 * 0.85, b1 * 0.18); ctx.fill();
    var b2 = rx * 0.22, b2y = -colH;
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(0, b2y, b2, b2 * 0.32, 0, 0, Math.PI); ctx.lineTo(-b2, b2y); ctx.fill();
    ctx.fillStyle = shade(stone, 0.25); ell(ctx, 0, b2y, b2, b2 * 0.24); ctx.fill(); ctx.fillStyle = '#7ad3e6'; ell(ctx, 0, b2y, b2 * 0.82, b2 * 0.17); ctx.fill();
    // water: a central jet and falling sheets
    var jet = colH * 0.55 * (1 + 0.06 * Math.sin(t * 6));
    ctx.fillStyle = lin(ctx, 0, b2y - jet, 0, b2y, ['rgba(255,255,255,0)', 'rgba(230,250,255,0.9)']);
    ctx.beginPath(); ctx.moveTo(-2.5, b2y); ctx.quadraticCurveTo(-1.5, b2y - jet * 0.7, 0, b2y - jet); ctx.quadraticCurveTo(1.5, b2y - jet * 0.7, 2.5, b2y); ctx.fill();
    ctx.strokeStyle = 'rgba(225,248,255,0.75)'; ctx.lineWidth = Math.max(1.4, 2 * k); ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * TAU, s1 = Math.sin(a), c1 = Math.cos(a);
      ctx.beginPath(); ctx.moveTo(0, b2y - jet * 0.9); ctx.quadraticCurveTo(c1 * b2 * 1.2, b2y - jet * 0.9, c1 * b2 * 1.5, b2y + s1 * b2 * 0.24 + 4); ctx.stroke();
      if (s1 > -0.5) { ctx.beginPath(); ctx.moveTo(c1 * b1, b1y + s1 * b1 * 0.24); ctx.quadraticCurveTo(c1 * b1 * 1.35, b1y + s1 * b1 * 0.24, c1 * rx * 0.72, s1 * ry * 0.6); ctx.stroke(); }
    }
    ctx.fillStyle = '#ffffff';
    for (var d = 0; d < 10; d++) { var ph = (t * 1.1 + d / 10) % 1, da = d / 10 * TAU; ctx.globalAlpha = 1 - ph; circle(ctx, Math.cos(da) * b2 * 1.6 * ph, b2y - jet * 0.9 * (1 - ph) + ph * ph * colH * 0.4, Math.max(1, 1.4 * k)); ctx.fill(); }
    ctx.globalAlpha = 1;
    // front rim edge over the wall top
    ctx.strokeStyle = shade(stone, 0.3); ctx.lineWidth = Math.max(2, ry * 0.12); ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.95, ry * 0.92, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    ctx.restore();
  };

  // A soft warm glow sprite (drawn with 'lighter').
  A.glow = function (r, dpr, col) {
    var c = canvas(r * 2 * dpr, r * 2 * dpr), g = c.getContext('2d'), h = hex(col || '#ffcf7a');
    g.fillStyle = rad(g, r * dpr, r * dpr, 0, r * dpr, [[0, 'rgba(' + h + ',0.55)'], [0.4, 'rgba(' + h + ',0.18)'], [1, 'rgba(' + h + ',0)']]);
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };

  // ---------- picture buttons and goal icons ----------
  // An item picture that fits a size x size square (CSS px) at dpr.
  A.icon = function (type, size, dpr) {
    var c = canvas(size * dpr, size * dpr), g = c.getContext('2d'), S = SPR[type];
    g.scale(dpr, dpr);
    if (type === 'butterfly') { A.butterfly(g, size / 2, size * 0.52, size / 44, 0.06, 0, 1); return c; }
    var bw = S.w, bh = S.h + (S.below || 0), k = Math.min(size * 0.86 / bw, size * 0.86 / bh);
    g.translate(size / 2, size / 2 + (S.h - (S.below || 0)) / 2 * k);
    g.scale(k, k);
    if (!S.flat) { g.fillStyle = 'rgba(30,60,20,0.25)'; ell(g, 0, 0, S.w * 0.36, S.w * 0.08); g.fill(); }
    S.draw(g);
    if (type === 'fountain') A.fountainWater(g, 0.3);
    return c;
  };
  // Zone pictures for goals: river, path, fountain, arches.
  A.zoneIcon = function (z, size, dpr) {
    var c = canvas(size * dpr, size * dpr), g = c.getContext('2d'), s = size / 40;
    g.scale(dpr * s, dpr * s);
    g.fillStyle = '#7cc35a'; rr(g, 2, 2, 36, 36, 9); g.fill();
    if (z === 'river') {
      g.fillStyle = '#e9d8a6'; g.beginPath(); g.moveTo(2, 15); g.bezierCurveTo(14, 9, 24, 23, 38, 15); g.lineTo(38, 29); g.bezierCurveTo(24, 37, 14, 23, 2, 29); g.closePath(); g.fill();
      g.fillStyle = '#3fb0d6'; g.beginPath(); g.moveTo(2, 18); g.bezierCurveTo(14, 12, 24, 26, 38, 18); g.lineTo(38, 26); g.bezierCurveTo(24, 34, 14, 20, 2, 26); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, 20); g.quadraticCurveTo(13, 18, 17, 21); g.moveTo(23, 24); g.quadraticCurveTo(27, 22, 31, 23); g.stroke();
    } else if (z === 'path') {
      g.fillStyle = '#d8b47a'; g.beginPath(); g.moveTo(17, 2); g.lineTo(23, 2); g.quadraticCurveTo(32, 22, 30, 38); g.lineTo(10, 38); g.quadraticCurveTo(8, 22, 17, 2); g.fill();
      g.fillStyle = '#f5e9cf'; [[20, 8, 3, 1.6], [18, 17, 4.5, 2.2], [22, 26, 5.5, 2.6], [19, 34, 6.5, 2.8]].forEach(function (p) { ell(g, p[0], p[1], p[2], p[3]); g.fill(); });
    } else if (z === 'fountain') {
      g.fillStyle = '#efe2c8'; g.beginPath(); g.moveTo(7, 26); g.lineTo(7, 32); g.ellipse(20, 32, 13, 4, 0, Math.PI, 0, true); g.lineTo(33, 26); g.closePath(); g.fill();
      g.fillStyle = '#4fb8d4'; ell(g, 20, 26, 13, 4); g.fill();
      g.fillStyle = '#efe2c8'; g.fillRect(18.5, 13, 3, 13); ell(g, 20, 15, 7, 2); g.fill();
      g.strokeStyle = '#e6faff'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(20, 9); g.quadraticCurveTo(12, 6, 10, 24); g.moveTo(20, 9); g.quadraticCurveTo(28, 6, 30, 24); g.moveTo(20, 13); g.lineTo(20, 7); g.stroke();
    } else if (z === 'arches') {
      g.fillStyle = '#9b8fe0'; rr(g, 2, 2, 36, 36, 9); g.fill();
      g.fillStyle = '#f5e6d4'; g.beginPath(); g.rect(4, 6, 32, 30);
      g.moveTo(12, 36); g.lineTo(12, 22); g.quadraticCurveTo(12, 13, 20, 10); g.quadraticCurveTo(28, 13, 28, 22); g.lineTo(28, 36); g.closePath(); g.fill('evenodd');
      g.fillStyle = '#e7b75a'; star8(g, 20, 6.5, 2.6); g.fill();
      g.fillStyle = '#7cc35a'; g.fillRect(4, 34, 32, 4);
    }
    return c;
  };
  // A woven basket (for removing things). open = lid lifted.
  A.basket = function (size, dpr, open) {
    var c = canvas(size * dpr, size * dpr), g = c.getContext('2d'), s = size / 60;
    g.scale(dpr * s, dpr * s);
    g.strokeStyle = '#8a5a2e'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(14, 28); g.quadraticCurveTo(30, open ? -4 : 2, 46, 28); g.stroke();
    g.fillStyle = lin(g, 0, 26, 0, 54, ['#e8b46e', '#c98a44', '#9a6230']);
    g.beginPath(); g.moveTo(8, 28); g.lineTo(52, 28); g.lineTo(46, 52); g.quadraticCurveTo(30, 56, 14, 52); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(110,60,20,0.55)'; g.lineWidth = 1.4;
    for (var i = 0; i < 4; i++) { g.beginPath(); g.moveTo(9 + i, 33 + i * 5); g.lineTo(51 - i, 33 + i * 5); g.stroke(); }
    for (var j = 0; j < 7; j++) { var x = 13 + j * 5.7; g.beginPath(); g.moveTo(x, 28); g.lineTo(x + (x - 30) * 0.12, 53); g.stroke(); }
    g.fillStyle = '#f2c98a'; rr(g, 6, 24, 48, 7, 3.5); g.fill();
    if (open) { g.fillStyle = '#ffe9a8'; star8(g, 30, 16, 5); g.fill(); }
    return c;
  };
  // A goal pip: filled or empty dot.
  A.ITEM_TYPES = GD.ITEMS.map(function (it) { return it.id; });
})();
