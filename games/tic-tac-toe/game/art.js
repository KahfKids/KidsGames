/* Star & Flower Tic Tac Toe: the paint box. The look is the old board kit's, kept: a desert courtyard at sunset, a wooden
   board with glazed tiles and a lattice, golden stars (you) and pink flowers (the opponent), toy-robot opponents with
   no face (one visor band). Everything is painted ONCE with Canvas2D into the engine's canvas textures and then only
   moved, scaled and tinted by Phaser (nothing is painted per frame):
   - BkArt.init(scene): the interface sheet 'ui' (icons, plates, glows, marks, particles) and the robot sheet 'rob'
     (each robot in four poses), painted once at boot.
   - BkArt.bg(scene, view, theme): the courtyard for the screen it is shown on (sky, skyline, arches, floor, lanterns, plants)
     as one picture, repainted only if the screen's pixel density changes a lot.
   - BkArt.board(scene, n, units, z): the wooden board for its size on screen. BkArt.pieces: the discs for their size.
   The paint functions below are the old kit's (art.js of js/board), working in "virtual css pixels"; UNITS is how many
   design units one virtual pixel is, so the old detail sizes carry over. */
(function () {
  'use strict';
  var A = window.BkArt = {};
  var TAU = Math.PI * 2;

  // ---------- helpers ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) {
    if (c.indexOf('rgb') === 0) { var m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
  }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }
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
  A.rng = rng; A.mix = mix; A.shade = shade; A.rgba = rgba; A.rr = rr; A.star8 = star8; A.canvas = canvas;

  // ---------- themes ----------
  A.THEMES = {
    // Checkers: a courtyard garden at night, lanterns lit.
    garden: {
      sky: ['#060a26', '#14204f', '#2b2f72', '#5b4a8c', '#b9758d'], night: true,
      far: '#1a2457', farTree: '#101a40', wall: ['#3a2c63', '#2a2050'], wallLit: '#6a52a0', trim: '#e9c27a',
      ablaq: ['#d9c3a0', '#9b4a52'], dado: ['#1f8a8a', '#f0dfb8', '#2b5aa8', '#c9584e'],
      floor: ['#3b2d5e', '#2a2149'], floorLine: 'rgba(255,214,150,.16)', glow: '#ffcf7a',
      pot: ['#2c6fb0', '#f3ead8'], leaf: '#1d4a3a', leafLit: '#3f8a5c', mote: '#fff1b0',
      wood: ['#8a5530', '#5e3418', '#3d200d'], inlay: '#f4e6c8', inlayDark: '#2a160a',
      tileLight: '#f2e4c4', tileDark: '#17707a', tileDark2: '#0e4f5c'
    },
    // Tic Tac Toe: a warm desert courtyard at sunset.
    dusk: {
      sky: ['#2f2466', '#6b3f88', '#c45f7e', '#f2915f', '#ffd193'], night: false,
      far: '#b5677a', farTree: '#8a4a66', wall: ['#d79a6e', '#b87452'], wallLit: '#f6c9a0', trim: '#fff0cf',
      ablaq: ['#fbe7c6', '#c0563f'], dado: ['#1f8a8a', '#fbefd5', '#2b5aa8', '#e2774a'],
      floor: ['#e2b98c', '#c99a70'], floorLine: 'rgba(110,50,20,.16)', glow: '#ffd27a',
      pot: ['#1f7a8a', '#fbf1dd'], leaf: '#2f6b45', leafLit: '#6fb36a', mote: '#fff4cf',
      wood: ['#9a6236', '#6b3c1c', '#46250f'], inlay: '#fbf0d6', inlayDark: '#3a1d0b',
      tileLight: '#fbf1dc', tileDark: '#2a8f9c', tileDark2: '#1b6b78'
    }
  };

  // ---------- the courtyard scene ----------
  // Returns layers { sky, far, mid, near, margin } (device px) plus lantern positions (CSS px, mid layer).
  A.paintScene = function (themeName, w, h, dpr) {
    var T = A.THEMES[themeName], S = dpr, m = Math.round(32 * dpr);
    var Wd = Math.round(w * dpr) + m * 2, H = Math.round(h * dpr);
    var sky = canvas(Wd, H), far = canvas(Wd, H), mid = canvas(Wd, H), near = canvas(Wd, H);
    var R = rng(themeName === 'garden' ? 7 : 19);
    var portrait = h > w * 1.15;
    var floorY = H * (portrait ? 0.6 : 0.64);
    var archTotal = Math.min(H * (portrait ? 0.46 : 0.5), Wd * 0.6);   // floor to arch apex
    var apexY = floorY - archTotal;
    var u = Math.min(w, h) / 400 * S;   // detail unit

    // --- sky ---
    var g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, floorY);
    T.sky.forEach(function (c, i) { gr.addColorStop(i / (T.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
    var gx = Wd * 0.72, gy = Math.max(apexY * 0.55, H * 0.09);
    var halo = g.createRadialGradient(gx, gy, 0, gx, gy, 220 * u);
    halo.addColorStop(0, T.night ? 'rgba(255,240,200,.35)' : 'rgba(255,240,200,.6)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = halo; g.fillRect(0, 0, Wd, H);
    if (T.night) {
      for (var i = 0; i < 160; i++) { var sy = R() * floorY; g.globalAlpha = 0.2 + R() * 0.7 * (1 - sy / floorY);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(R() * Wd, sy, (R() * 1.2 + 0.35) * S, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
      // crescent moon, cut on its own canvas so the sky behind stays intact (respectful scenery only)
      var mr = 24 * u, mc = canvas(mr * 2.6, mr * 2.6), mg = mc.getContext('2d'), o = mc.width / 2;
      mg.fillStyle = '#fff4d6'; mg.beginPath(); mg.arc(o, o, mr, 0, TAU); mg.fill();
      mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(o + mr * 0.45, o - mr * 0.2, mr * 0.86, 0, TAU); mg.fill();
      g.drawImage(mc, gx - o, gy - o);
    } else {
      g.fillStyle = 'rgba(255,246,214,.95)'; g.beginPath(); g.arc(gx, floorY - archTotal * 0.25, 46 * u, 0, TAU); g.fill();
      for (var c = 0; c < 8; c++) { var cx = R() * Wd, cy = (0.08 + R() * 0.5) * floorY, cs = (30 + R() * 60) * u;
        g.fillStyle = 'rgba(255,236,220,' + (0.16 + R() * 0.22) + ')';
        for (var k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + (k - 1.5) * cs * 0.55, cy + (k % 2) * cs * 0.12, cs * 0.6, cs * 0.24, 0, 0, TAU); g.fill(); } }
    }

    // --- far: the garden and skyline seen through the arches ---
    var f = far.getContext('2d'), hz = floorY - archTotal * 0.12;
    function dome(ctx, x, base, r) {
      ctx.moveTo(x - r, base);
      ctx.bezierCurveTo(x - r * 1.2, base - r * 0.9, x - r * 0.2, base - r * 1.25, x, base - r * 1.7);
      ctx.bezierCurveTo(x + r * 0.2, base - r * 1.25, x + r * 1.2, base - r * 0.9, x + r, base);
      ctx.closePath();
    }
    f.fillStyle = T.far; f.beginPath();
    var xx = -20 * S;
    while (xx < Wd) {
      var bw = (40 + R() * 70) * u, bh = (18 + R() * 40) * u, kind = R();
      f.rect(xx, hz - bh, bw, bh + 4 * S);
      if (kind < 0.45) dome(f, xx + bw / 2, hz - bh, Math.min(bw * 0.36, 26 * u));
      else if (kind < 0.6) { f.rect(xx + bw * 0.4, hz - bh - 70 * u, 9 * u, 70 * u); dome(f, xx + bw * 0.4 + 4.5 * u, hz - bh - 70 * u, 7 * u); }
      xx += bw + R() * 20 * u;
    }
    f.fill();
    // garden trees in front of the skyline
    f.fillStyle = T.farTree;
    for (var t = 0; t < 26; t++) {
      var tx = R() * Wd, th = (40 + R() * 70) * u, tb = floorY - archTotal * 0.02;
      f.beginPath();
      if (R() < 0.6) f.ellipse(tx, tb - th * 0.5, th * 0.13, th * 0.55, 0, 0, TAU);   // cypress
      else { f.arc(tx, tb - th * 0.55, th * 0.32, 0, TAU); f.rect(tx - 2 * u, tb - th * 0.4, 4 * u, th * 0.4); }
      f.fill();
    }
    var hzg = f.createLinearGradient(0, hz - 80 * u, 0, floorY);
    hzg.addColorStop(0, rgba(T.sky[3], 0)); hzg.addColorStop(1, rgba(T.sky[3], 0.45));
    f.fillStyle = hzg; f.fillRect(0, hz - 80 * u, Wd, floorY - hz + 80 * u);
    f.fillStyle = T.floor[1]; f.fillRect(0, floorY - 2 * S, Wd, H);

    // --- mid: the arcade wall with pointed arches, and the tiled floor ---
    var md = mid.getContext('2d');
    var ow = Math.max(70 * u, Math.min(archTotal * 0.56, 150 * u)), pw = ow * 0.36, bay = ow + pw;
    var spring = apexY + ow * 0.62;
    var wallTop = apexY - Math.max(26 * u, archTotal * 0.16);
    var nb = Math.ceil(Wd / bay / 2) + 1, cx0 = Wd / 2, arches = [];
    for (var b = -nb; b <= nb; b++) arches.push(cx0 + b * bay);
    function archPath(ctx, x, grow) {
      var l = x - ow / 2 - grow, r2 = x + ow / 2 + grow, ap = apexY - grow * 1.1, sp = spring;
      ctx.moveTo(l, floorY + 2); ctx.lineTo(l, sp);
      ctx.bezierCurveTo(l, sp - (sp - ap) * 0.55, x - ow * 0.14, ap + (sp - ap) * 0.12, x, ap);
      ctx.bezierCurveTo(x + ow * 0.14, ap + (sp - ap) * 0.12, r2, sp - (sp - ap) * 0.55, r2, sp);
      ctx.lineTo(r2, floorY + 2);
    }
    function archCurve(ctx, x, grow) {
      var l = x - ow / 2 - grow, r2 = x + ow / 2 + grow, ap = apexY - grow * 1.1, sp = spring;
      ctx.moveTo(l, sp);
      ctx.bezierCurveTo(l, sp - (sp - ap) * 0.55, x - ow * 0.14, ap + (sp - ap) * 0.12, x, ap);
      ctx.bezierCurveTo(x + ow * 0.14, ap + (sp - ap) * 0.12, r2, sp - (sp - ap) * 0.55, r2, sp);
    }
    // wall
    var wg = md.createLinearGradient(0, wallTop, 0, floorY);
    wg.addColorStop(0, T.wall[0]); wg.addColorStop(1, T.wall[1]);
    md.fillStyle = wg; md.fillRect(0, wallTop, Wd, floorY - wallTop + 2);
    // merlons (stepped crenellation) along the top against the sky
    var mw = 22 * u;
    md.fillStyle = T.wall[0];
    for (var mx = -mw / 2 + (cx0 % mw); mx < Wd; mx += mw * 1.6) {
      md.beginPath(); md.moveTo(mx, wallTop); md.lineTo(mx, wallTop - 8 * u); md.lineTo(mx + mw * 0.2, wallTop - 8 * u);
      md.lineTo(mx + mw * 0.2, wallTop - 15 * u); md.lineTo(mx + mw * 0.5, wallTop - 20 * u); md.lineTo(mx + mw * 0.8, wallTop - 15 * u);
      md.lineTo(mx + mw * 0.8, wallTop - 8 * u); md.lineTo(mx + mw, wallTop - 8 * u); md.lineTo(mx + mw, wallTop); md.fill();
    }
    // frieze band with eight-point stars
    var fz = wallTop + 4 * u, fh = Math.max(10 * u, (apexY - wallTop) * 0.45);
    md.fillStyle = shade(T.wall[0], -0.25); md.fillRect(0, fz, Wd, fh);
    md.fillStyle = T.trim; md.globalAlpha = 0.85; md.fillRect(0, fz, Wd, 1.6 * S); md.fillRect(0, fz + fh - 1.6 * S, Wd, 1.6 * S);
    md.globalAlpha = 0.55;
    for (var sx2 = (cx0 % (fh * 1.4)); sx2 < Wd; sx2 += fh * 1.4) { star8(md, sx2, fz + fh / 2, fh * 0.32); md.fill(); }
    md.globalAlpha = 1;
    // cut the arch openings
    md.save(); md.globalCompositeOperation = 'destination-out'; md.beginPath();
    arches.forEach(function (x) { archPath(md, x, 0); md.closePath(); }); md.fill(); md.restore();
    // inner shadow in each opening (the wall has thickness)
    md.save(); md.beginPath(); arches.forEach(function (x) { archPath(md, x, 0); md.closePath(); }); md.clip();
    arches.forEach(function (x) {
      var ig = md.createLinearGradient(x - ow / 2, 0, x - ow / 2 + ow * 0.16, 0);
      ig.addColorStop(0, rgba(shade(T.wall[1], -0.5), 0.85)); ig.addColorStop(1, rgba(shade(T.wall[1], -0.5), 0));
      md.fillStyle = ig; md.fillRect(x - ow / 2, apexY, ow * 0.16, floorY - apexY);
    });
    md.restore();
    // ablaq voussoirs (alternating stones) around each arch, with rim light
    var vw = Math.max(5 * u, ow * 0.09);
    arches.forEach(function (x) {
      md.lineCap = 'butt'; md.lineWidth = vw;
      md.strokeStyle = T.ablaq[0]; md.beginPath(); archCurve(md, x, vw / 2); md.stroke();
      md.setLineDash([vw * 0.9, vw * 0.9]); md.strokeStyle = T.ablaq[1]; md.beginPath(); archCurve(md, x, vw / 2); md.stroke();
      md.setLineDash([]);
      md.lineWidth = 1.5 * S; md.strokeStyle = rgba(T.trim, 0.8); md.beginPath(); archCurve(md, x, vw + 1); md.stroke();
      md.strokeStyle = rgba('#000000', 0.25); md.beginPath(); archCurve(md, x, -1); md.stroke();
    });
    // pillar capitals and zellige dado on each pillar
    var dadoTop = floorY - Math.min(archTotal * 0.2, 60 * u), ts = Math.max(6 * u, pw / 4);
    arches.forEach(function (x, i) {
      if (i === arches.length - 1) return;
      var pl = x + ow / 2, pr = pl + pw;
      md.fillStyle = shade(T.wall[0], 0.12); md.fillRect(pl - 3 * u, spring - 6 * u, pw + 6 * u, 6 * u);
      md.fillStyle = rgba(T.trim, 0.6); md.fillRect(pl - 3 * u, spring - 6 * u, pw + 6 * u, 1.2 * S);
      // shaft light on the left edge, shade on the right
      var sg = md.createLinearGradient(pl, 0, pr, 0);
      sg.addColorStop(0, rgba(T.wallLit, 0.35)); sg.addColorStop(0.3, rgba(T.wallLit, 0)); sg.addColorStop(1, rgba('#000000', 0.22));
      md.fillStyle = sg; md.fillRect(pl, spring, pw, floorY - spring);
      md.save(); md.beginPath(); md.rect(pl, dadoTop, pw, floorY - dadoTop); md.clip();
      for (var yy = dadoTop; yy < floorY; yy += ts) for (var x2 = pl; x2 < pr; x2 += ts) {
        var ci = (Math.round((x2 - pl) / ts) + Math.round((yy - dadoTop) / ts)) % 2;
        md.fillStyle = ci ? T.dado[1] : T.dado[(Math.round((yy - dadoTop) / ts) % 2) ? 0 : 2];
        md.beginPath(); md.moveTo(x2 + ts / 2, yy); md.lineTo(x2 + ts, yy + ts / 2); md.lineTo(x2 + ts / 2, yy + ts); md.lineTo(x2, yy + ts / 2); md.fill();
      }
      md.restore();
      md.fillStyle = rgba(T.trim, 0.7); md.fillRect(pl, dadoTop - 1.5 * S, pw, 1.5 * S);
    });
    // floor: perspective tiles converging toward the centre
    var vpY = floorY - (H - floorY) * 1.6, rows = 9, cols = 18;
    var fg = md.createLinearGradient(0, floorY, 0, H);
    fg.addColorStop(0, shade(T.floor[1], -0.25)); fg.addColorStop(1, T.floor[0]);
    md.fillStyle = fg; md.fillRect(0, floorY, Wd, H - floorY);
    function fx(colEdge, y) { var k = (y - vpY) / (H - vpY); return cx0 + colEdge * (Wd * 1.6 / cols) * k * 1.0; }
    var ys = []; for (var rI = 0; rI <= rows; rI++) ys.push(floorY + (H - floorY) * Math.pow(rI / rows, 1.7));
    for (var rI2 = 0; rI2 < rows; rI2++) for (var cI = -cols; cI < cols; cI++) {
      if ((rI2 + cI + 100) % 2) continue;
      var y0 = ys[rI2], y1 = ys[rI2 + 1];
      md.fillStyle = rgba(T.floor[0], 0.55 * (0.4 + rI2 / rows));
      md.beginPath(); md.moveTo(fx(cI, y0), y0); md.lineTo(fx(cI + 1, y0), y0); md.lineTo(fx(cI + 1, y1), y1); md.lineTo(fx(cI, y1), y1); md.fill();
    }
    md.strokeStyle = T.floorLine; md.lineWidth = 1 * S;
    for (var cI2 = -cols; cI2 <= cols; cI2++) { md.beginPath(); md.moveTo(fx(cI2, floorY), floorY); md.lineTo(fx(cI2, H), H); md.stroke(); }
    ys.forEach(function (y) { md.beginPath(); md.moveTo(0, y); md.lineTo(Wd, y); md.stroke(); });
    // warm light pooled on the floor below each lantern
    arches.forEach(function (x) {
      var pg = md.createRadialGradient(x, floorY + 8 * u, 0, x, floorY + 8 * u, ow * 0.9);
      pg.addColorStop(0, rgba(T.glow, T.night ? 0.22 : 0.12)); pg.addColorStop(1, rgba(T.glow, 0));
      md.fillStyle = pg; md.beginPath(); md.ellipse(x, floorY + 8 * u, ow * 0.9, ow * 0.3, 0, 0, TAU); md.fill();
    });
    md.fillStyle = rgba('#000000', 0.25); md.fillRect(0, floorY, Wd, 2 * S);
    // base moulding
    md.fillStyle = shade(T.wall[1], -0.2); md.fillRect(0, floorY - 4 * u, Wd, 4 * u);
    var lanterns = arches.map(function (x) { return { x: (x - m) / dpr, top: apexY / dpr, y: (apexY + archTotal * 0.2) / dpr, s: ow / dpr / 90 }; });

    // --- near: glazed pots with leafy plants at the sides ---
    var n = near.getContext('2d');
    function plant(x, base, sc, flip) {
      // leaves
      var lr = rng(Math.round(x));
      for (var i = 0; i < 9; i++) {
        var a = -Math.PI / 2 + (i - 4) * 0.32 + (lr() - 0.5) * 0.2, L = (70 + lr() * 50) * sc;
        var tx = x + Math.cos(a) * L * (flip ? -1 : 1), ty = base - 40 * sc + Math.sin(a) * L;
        var lg = n.createLinearGradient(x, base, tx, ty); lg.addColorStop(0, T.leaf); lg.addColorStop(1, T.leafLit);
        n.fillStyle = lg; n.beginPath(); n.moveTo(x, base - 36 * sc);
        n.quadraticCurveTo((x + tx) / 2 + 18 * sc, (base + ty) / 2 - 20 * sc, tx, ty);
        n.quadraticCurveTo((x + tx) / 2 - 18 * sc, (base + ty) / 2 + 4 * sc, x, base - 36 * sc); n.fill();
        n.strokeStyle = rgba('#ffffff', 0.12); n.lineWidth = 1.2 * S; n.beginPath(); n.moveTo(x, base - 36 * sc); n.lineTo(tx, ty); n.stroke();
      }
      // pot
      var pg2 = n.createLinearGradient(x - 34 * sc, 0, x + 34 * sc, 0);
      pg2.addColorStop(0, shade(T.pot[0], -0.35)); pg2.addColorStop(0.35, shade(T.pot[0], 0.25)); pg2.addColorStop(1, shade(T.pot[0], -0.45));
      n.fillStyle = pg2; n.beginPath();
      n.moveTo(x - 26 * sc, base - 46 * sc); n.bezierCurveTo(x - 48 * sc, base - 20 * sc, x - 30 * sc, base, x - 18 * sc, base);
      n.lineTo(x + 18 * sc, base); n.bezierCurveTo(x + 30 * sc, base, x + 48 * sc, base - 20 * sc, x + 26 * sc, base - 46 * sc); n.closePath(); n.fill();
      n.fillStyle = T.pot[1]; n.globalAlpha = 0.85;
      for (var k = -2; k <= 2; k++) { star8(n, x + k * 13 * sc, base - 24 * sc, 4.5 * sc); n.fill(); }
      n.globalAlpha = 1;
      n.fillStyle = shade(T.pot[0], -0.2); rr(n, x - 30 * sc, base - 52 * sc, 60 * sc, 9 * sc, 4 * sc); n.fill();
      n.fillStyle = rgba('#ffffff', 0.25); n.fillRect(x - 28 * sc, base - 51 * sc, 56 * sc, 2 * sc);
      // contact shadow
      n.fillStyle = 'rgba(0,0,0,.28)'; n.beginPath(); n.ellipse(x, base + 2 * sc, 34 * sc, 6 * sc, 0, 0, TAU); n.fill();
    }
    var ps = Math.max(0.7, u / S * 1.05) * S;
    plant(m + 34 * ps, H - 8 * S, ps, false);
    plant(Wd - m - 34 * ps, H - 8 * S, ps, true);
    // vignette
    var vg = n.createRadialGradient(Wd / 2, H * 0.5, Math.min(Wd, H) * 0.35, Wd / 2, H * 0.5, Math.max(Wd, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,3,20,.42)');
    n.fillStyle = vg; n.fillRect(0, 0, Wd, H);

    // one picture: the layers drawn one over the other (the old kit moved them for a parallax; at rest nothing moves,
    // so they are flattened once), then the lanterns (still, with their glow) and the plants in front
    var out = canvas(Wd - m * 2, H), og = out.getContext('2d');
    og.drawImage(sky, -m, 0); og.drawImage(far, -m, 0); og.drawImage(mid, -m, 0);
    var gl = og.createRadialGradient(0, 0, 0, 0, 0, 1); gl.addColorStop(0, 'rgba(255,200,110,' + (T.night ? 0.55 : 0.35) + ')'); gl.addColorStop(1, 'rgba(255,200,110,0)');
    lanterns.forEach(function (ln) {
      var ls = A.lanternSprite(28 * ln.s, dpr, themeName), x = ln.x * dpr, top = ln.top * dpr, y = ln.y * dpr;
      if (x < -ls.width || x > out.width + ls.width) return;
      og.strokeStyle = 'rgba(40,20,10,.7)'; og.lineWidth = 1.2 * dpr; og.beginPath(); og.moveTo(x, top); og.lineTo(x, y); og.stroke();
      var gy = y + ls.height * 0.5, gr = ls.width * 2.6;
      og.save(); og.translate(x, gy); og.scale(gr, gr); og.globalAlpha = 0.8; og.fillStyle = gl; og.beginPath(); og.arc(0, 0, 1, 0, TAU); og.fill(); og.restore();
      og.drawImage(ls, x - ls.width / 2, y);
    });
    og.drawImage(near, -m, 0);
    return out;
  };

  // ---------- hanging lantern (sprite + live glow) ----------
  var lanternCache = {};
  A.lanternSprite = function (size, dpr, theme) {
    var key = Math.round(size) + '|' + dpr + '|' + theme;
    if (lanternCache[key]) return lanternCache[key];
    var T = A.THEMES[theme], W = size, H = size * 1.7, c = canvas(W * dpr, H * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(W / 2, 0);
    var gold = '#d9a441', dark = '#7a4f17';
    // cap
    g.fillStyle = gold; g.beginPath(); g.moveTo(-W * 0.08, H * 0.04); g.lineTo(W * 0.08, H * 0.04); g.lineTo(W * 0.3, H * 0.2); g.lineTo(-W * 0.3, H * 0.2); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, H * 0.03, W * 0.06, 0, TAU); g.fill();
    // glass body
    var bg = g.createLinearGradient(0, H * 0.2, 0, H * 0.78);
    bg.addColorStop(0, '#fff3c4'); bg.addColorStop(0.5, T.glow); bg.addColorStop(1, '#e9873a');
    g.fillStyle = bg; g.beginPath();
    g.moveTo(-W * 0.3, H * 0.2); g.bezierCurveTo(-W * 0.52, H * 0.38, -W * 0.46, H * 0.62, -W * 0.2, H * 0.78);
    g.lineTo(W * 0.2, H * 0.78); g.bezierCurveTo(W * 0.46, H * 0.62, W * 0.52, H * 0.38, W * 0.3, H * 0.2); g.closePath(); g.fill();
    // pierced metal ribs and star cut-outs
    g.strokeStyle = dark; g.lineWidth = Math.max(1, W * 0.04);
    [-0.17, 0, 0.17].forEach(function (k) { g.beginPath(); g.moveTo(k * W, H * 0.2); g.quadraticCurveTo(k * W * 1.9, H * 0.5, k * W * 1.1, H * 0.78); g.stroke(); });
    g.stroke();
    g.fillStyle = 'rgba(122,79,23,.55)'; star8(g, 0, H * 0.48, W * 0.1); g.fill();
    // base and finial
    g.fillStyle = gold; g.fillRect(-W * 0.22, H * 0.78, W * 0.44, H * 0.05);
    g.beginPath(); g.moveTo(-W * 0.1, H * 0.83); g.lineTo(W * 0.1, H * 0.83); g.lineTo(0, H * 0.96); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-W * 0.18, H * 0.4, W * 0.04, H * 0.1, 0.2, 0, TAU); g.fill();
    c.w = W; c.h = H;
    lanternCache[key] = c;
    return c;
  };

  // ---------- the board ----------
  // style 'checkers': n×n alternating tiles; style 'grid': n×n glazed tiles separated by raised wooden bars.
  // dark(r, c) says which squares are dark (playable) for checkers.
  A.board = function (style, n, S, dpr, themeName) {
    var T = A.THEMES[themeName];
    var frame = Math.round(S * (style === 'grid' ? 0.07 : 0.058)), depth = Math.round(S * 0.035), pad = Math.round(S * 0.08);
    var c = canvas((S + pad * 2) * dpr, (S + depth + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(pad, pad);
    var rad = S * 0.035, inner = S - frame * 2, cell = inner / n;
    // soft drop shadow onto the floor
    g.save(); g.shadowColor = 'rgba(8,4,20,.55)'; g.shadowBlur = S * 0.06 * dpr; g.shadowOffsetY = S * 0.035 * dpr;
    g.fillStyle = T.wood[2]; rr(g, 0, 0, S, S + depth, rad); g.fill(); g.restore();
    // slab side (thickness)
    var sg = g.createLinearGradient(0, S - rad, 0, S + depth);
    sg.addColorStop(0, T.wood[1]); sg.addColorStop(1, T.wood[2]);
    g.fillStyle = sg; rr(g, 0, depth * 0.2, S, S + depth * 0.8, rad); g.fill();
    // top face: wood with grain
    var wg = g.createLinearGradient(0, 0, S, S);
    wg.addColorStop(0, shade(T.wood[0], 0.12)); wg.addColorStop(0.5, T.wood[0]); wg.addColorStop(1, T.wood[1]);
    g.fillStyle = wg; rr(g, 0, 0, S, S, rad); g.fill();
    g.save(); rr(g, 0, 0, S, S, rad); g.clip();
    var R = rng(n * 13 + Math.round(S));
    for (var i = 0; i < 70; i++) {
      var y = R() * S, amp = 2 + R() * 4; g.strokeStyle = R() < 0.5 ? 'rgba(40,18,4,.18)' : 'rgba(255,220,170,.08)'; g.lineWidth = 0.6 + R() * 1.2;
      g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= S; x += S / 12) g.lineTo(x, y + Math.sin(x / S * 7 + i) * amp); g.stroke();
    }
    g.restore();
    // bevel rim light
    g.lineWidth = 2; var bl = g.createLinearGradient(0, 0, S, S);
    bl.addColorStop(0, 'rgba(255,230,190,.6)'); bl.addColorStop(0.5, 'rgba(255,230,190,.1)'); bl.addColorStop(1, 'rgba(0,0,0,.4)');
    g.strokeStyle = bl; rr(g, 1, 1, S - 2, S - 2, rad); g.stroke();
    // inlay track around the field: ebony with mother-of-pearl diamonds
    var tw = frame * 0.42, to = (frame - tw) / 2;
    g.fillStyle = T.inlayDark; rr(g, to, to, S - to * 2, S - to * 2, rad * 0.7); g.fill();
    g.fillStyle = T.wood[0]; g.fillRect(to + tw, to + tw, S - (to + tw) * 2, S - (to + tw) * 2);
    var step = tw * 1.25, edge = S - to * 2 - tw;
    g.fillStyle = T.inlay;
    function diamond(x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill(); }
    var cnt = Math.max(4, Math.round(edge / step));
    for (var k = 0; k <= cnt; k++) {
      var p = to + tw / 2 + edge * k / cnt;
      diamond(p, to + tw / 2, tw * 0.28); diamond(p, S - to - tw / 2, tw * 0.28);
      diamond(to + tw / 2, p, tw * 0.28); diamond(S - to - tw / 2, p, tw * 0.28);
    }
    // gold star medallions at the corners
    [[to + tw / 2, to + tw / 2], [S - to - tw / 2, to + tw / 2], [to + tw / 2, S - to - tw / 2], [S - to - tw / 2, S - to - tw / 2]].forEach(function (q) {
      g.fillStyle = '#e8b64c'; star8(g, q[0], q[1], tw * 0.72); g.fill();
      g.fillStyle = '#fff1c4'; star8(g, q[0], q[1], tw * 0.34); g.fill();
    });
    // field
    g.save(); g.translate(frame, frame);
    g.fillStyle = shade(T.wood[2], -0.2); g.fillRect(-2, -2, inner + 4, inner + 4);
    var tileCache = {};
    function tileSprite(kind) {
      if (tileCache[kind]) return tileCache[kind];
      var tc = canvas(cell * dpr, cell * dpr), t = tc.getContext('2d'); t.scale(dpr, dpr);
      var cs = cell, light = kind === 'light';
      var base = light ? T.tileLight : T.tileDark;
      var tg = t.createLinearGradient(0, 0, cs, cs);
      tg.addColorStop(0, shade(base, light ? 0.3 : 0.18)); tg.addColorStop(0.55, base); tg.addColorStop(1, shade(base, light ? -0.08 : -0.25));
      t.fillStyle = tg; t.fillRect(0, 0, cs, cs);
      if (light) {
        // faint four-petal motif
        t.fillStyle = rgba(T.tileDark, 0.1);
        for (var q = 0; q < 4; q++) { t.save(); t.translate(cs / 2, cs / 2); t.rotate(q * Math.PI / 2); t.beginPath(); t.ellipse(0, -cs * 0.2, cs * 0.08, cs * 0.18, 0, 0, TAU); t.fill(); t.restore(); }
        t.fillStyle = rgba(T.tileDark, 0.16); t.beginPath(); t.arc(cs / 2, cs / 2, cs * 0.05, 0, TAU); t.fill();
        if (style === 'grid') {
          t.strokeStyle = rgba(T.tileDark, 0.22); t.lineWidth = Math.max(1, cs * 0.012);
          star8(t, cs / 2, cs / 2, cs * 0.42, 0.72, Math.PI / 8); t.stroke();
          star8(t, cs / 2, cs / 2, cs * 0.3, 0.72); t.stroke();
          t.fillStyle = rgba(T.tileDark, 0.12);
          [[0, 0], [cs, 0], [0, cs], [cs, cs]].forEach(function (p) { star8(t, p[0], p[1], cs * 0.16); t.fill(); });
        }
      } else {
        t.fillStyle = 'rgba(255,255,255,.2)'; star8(t, cs / 2, cs / 2, cs * 0.34); t.fill();
        t.fillStyle = rgba(T.tileDark2, 0.7); star8(t, cs / 2, cs / 2, cs * 0.16); t.fill();
        t.fillStyle = 'rgba(255,255,255,.14)';
        [[0, 0], [cs, 0], [0, cs], [cs, cs]].forEach(function (p) { t.beginPath(); t.moveTo(p[0], p[1] - cs * 0.22); t.lineTo(p[0] + cs * 0.22, p[1]); t.lineTo(p[0], p[1] + cs * 0.22); t.lineTo(p[0] - cs * 0.22, p[1]); t.fill(); });
      }
      // glaze gloss
      var gl = t.createLinearGradient(0, 0, 0, cs * 0.6); gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      t.fillStyle = gl; t.beginPath(); t.ellipse(cs * 0.42, cs * 0.06, cs * 0.5, cs * 0.3, -0.3, 0, TAU); t.fill();
      // grout
      t.strokeStyle = 'rgba(30,20,10,.35)'; t.lineWidth = Math.max(1, cs * 0.02); t.strokeRect(0, 0, cs, cs);
      tileCache[kind] = tc;
      return tc;
    }
    for (var r = 0; r < n; r++) for (var cI = 0; cI < n; cI++) {
      var kind = style === 'grid' ? 'light' : ((r + cI) % 2 ? 'dark' : 'light');
      g.drawImage(tileSprite(kind), cI * cell, r * cell, cell, cell);
    }
    if (style === 'grid') {
      // raised wooden lattice bars between the cells, with brass studs where they cross
      var bw = cell * 0.085;
      for (var l = 1; l < n; l++) {
        [0, 1].forEach(function (vert) {
          g.save();
          g.fillStyle = 'rgba(20,8,0,.35)';
          if (vert) g.fillRect(l * cell - bw / 2 + bw * 0.35, 0, bw, inner); else g.fillRect(0, l * cell - bw / 2 + bw * 0.35, inner, bw);
          var lg = vert ? g.createLinearGradient(l * cell - bw / 2, 0, l * cell + bw / 2, 0) : g.createLinearGradient(0, l * cell - bw / 2, 0, l * cell + bw / 2);
          lg.addColorStop(0, shade(T.wood[0], 0.3)); lg.addColorStop(0.5, T.wood[0]); lg.addColorStop(1, T.wood[2]);
          g.fillStyle = lg;
          if (vert) rr(g, l * cell - bw / 2, -bw * 0.2, bw, inner + bw * 0.4, bw / 2); else rr(g, -bw * 0.2, l * cell - bw / 2, inner + bw * 0.4, bw, bw / 2);
          g.fill(); g.restore();
        });
      }
      for (var a1 = 1; a1 < n; a1++) for (var a2 = 1; a2 < n; a2++) {
        var sx = a1 * cell, sy = a2 * cell;
        g.fillStyle = 'rgba(20,8,0,.35)'; star8(g, sx + bw * 0.3, sy + bw * 0.3, bw * 1.1); g.fill();
        var bgd = g.createRadialGradient(sx - bw * 0.3, sy - bw * 0.3, 0, sx, sy, bw * 1.1);
        bgd.addColorStop(0, '#fff2c0'); bgd.addColorStop(0.5, '#e8b64c'); bgd.addColorStop(1, '#9a6a1c');
        g.fillStyle = bgd; star8(g, sx, sy, bw * 1.1); g.fill();
      }
    }
    // recessed edge shadow
    var es = Math.max(3, cell * 0.08);
    [['top', 0, 0, inner, es], ['left', 0, 0, es, inner]].forEach(function (q) {
      var eg = q[0] === 'top' ? g.createLinearGradient(0, 0, 0, es) : g.createLinearGradient(0, 0, es, 0);
      eg.addColorStop(0, 'rgba(0,0,0,.45)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = eg; g.fillRect(q[1], q[2], q[3], q[4]);
    });
    g.strokeStyle = 'rgba(255,230,190,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, inner + 0.75); g.lineTo(inner + 0.75, inner + 0.75); g.lineTo(inner + 0.75, 0); g.stroke();
    g.restore();
    return { canvas: c, pad: pad, frame: frame, depth: depth, cell: cell, inner: inner };
  };

  // ---------- opponents: chunky toy robots with NO face ----------
  // Where a face would be there is one smooth visor band that only shows simple symbols (a loading bar while
  // thinking, a star when it wins, a dim glow when it loses). Never two eyes, never a mouth.
  // A.robot(ctx, kind, R, o): round badge centred at 0,0, radius R. o = { t, state: idle|think|win|lose|hit }
  A.ROBOTS = {
    beep: { body: 'round', color: '#4fd8aa', accent: '#ff8fab', base: 'wheels', antenna: 'ball', bg: ['#effff8', '#a8ecd5'], ring: '#2fb98a' },
    bolt: { body: 'capsule', color: '#ff9a3c', accent: '#3fb6e8', base: 'wheel', antenna: 'bolt', bg: ['#fff4e6', '#ffd0a0'], ring: '#e5761c' },
    tinker: { body: 'square', color: '#ffcf2e', accent: '#e2504f', base: 'wheels', antenna: 'ball', bg: ['#fffbe6', '#ffe58a'], ring: '#d9a414' },
    sprocket: { body: 'round', color: '#4f8ff0', accent: '#ffd23f', base: 'hover', antenna: 'gear', bg: ['#eef5ff', '#a9c8ff'], ring: '#2f6bd0' },
    gizmo: { body: 'capsule', color: '#9b6bf0', accent: '#6fd98a', base: 'hover', antenna: 'two', bg: ['#f6f0ff', '#cdb6ff'], ring: '#7a4fd6' },
    cog: { body: 'square', color: '#f2b938', accent: '#2fb3c4', base: 'wheels', antenna: 'gear', big: true, bg: ['#fff8e0', '#ffd98a'], ring: '#b77a16' }
  };
  function gear(g, x, y, r, teeth, rot, color) {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = color; g.beginPath();
    for (var i = 0; i < teeth * 2; i++) { var a = i * Math.PI / teeth, q = i % 2 ? r * 0.72 : r; g.lineTo(Math.cos(a - 0.12) * q, Math.sin(a - 0.12) * q); g.lineTo(Math.cos(a + 0.12) * q, Math.sin(a + 0.12) * q); }
    g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill(); g.restore();
  }
  // The robot's gradients never change (they live in the robot's own unit space), so each is made once per
  // robot and canvas, not every frame. Glows that pulse use one gradient at full strength plus globalAlpha.
  var robotGrads = typeof WeakMap === 'function' ? new WeakMap() : null;
  function grads(g, B) {
    if (!robotGrads) return {};
    var m = robotGrads.get(g); if (!m) robotGrads.set(g, m = {});
    return m[B.color + B.ring] || (m[B.color + B.ring] = {});
  }
  function robotBody(g, B, t, st) {
    var col = B.color, sc = B.big ? 1.08 : 0.94, G = grads(g, B);
    g.scale(sc, sc);
    // base: wheels, one big wheel, or a hover glow
    if (B.base === 'hover') {
      var hg = G.hover;
      if (!hg) { hg = G.hover = g.createRadialGradient(0, 0.78, 0, 0, 0.78, 0.4); hg.addColorStop(0, 'rgba(120,230,255,.9)'); hg.addColorStop(1, 'rgba(120,230,255,0)'); }
      g.fillStyle = hg; g.beginPath(); g.ellipse(0, 0.78, 0.42, 0.14 + Math.sin(t * 6) * 0.02, 0, 0, TAU); g.fill();
      g.fillStyle = shade(col, -0.35); rr(g, -0.24, 0.6, 0.48, 0.1, 0.05); g.fill();
    } else {
      (B.base === 'wheel' ? [[0, 0.7, 0.2]] : [[-0.27, 0.7, 0.14], [0.27, 0.7, 0.14]]).forEach(function (w) {
        g.fillStyle = '#2a2440'; g.beginPath(); g.arc(w[0], w[1], w[2], 0, TAU); g.fill();
        g.fillStyle = '#b8c0d8'; g.beginPath(); g.arc(w[0], w[1], w[2] * 0.5, 0, TAU); g.fill();
        g.strokeStyle = '#6b7290'; g.lineWidth = 0.03;
        for (var k = 0; k < 3; k++) { var a = t * 3 + k * TAU / 3; g.beginPath(); g.moveTo(w[0], w[1]); g.lineTo(w[0] + Math.cos(a) * w[2] * 0.5, w[1] + Math.sin(a) * w[2] * 0.5); g.stroke(); }
      });
    }
    // lean while thinking, hop when winning
    var lean = st === 'think' ? 0.14 + Math.sin(t * 1.6) * 0.04 : st === 'lose' ? -0.05 : 0;
    var hop = st === 'win' ? -Math.abs(Math.sin(t * 8)) * 0.08 : 0;
    g.save(); g.translate(0, 0.62 + hop); g.rotate(lean); g.translate(0, -0.62);
    // arms (stubby), behind the body
    [-1, 1].forEach(function (s) {
      var up;   // how far the arm is raised outwards (radians)
      if (st === 'win') up = 2.3 + Math.sin(t * 12 + s) * 0.5;               // waving high
      else if (st === 'lose') up = -0.25 + Math.sin(t * 18) * 0.12;          // droop and wobble
      else if (st === 'hit') up = 0.9 + Math.sin(t * 26) * 0.5;
      else if (st === 'think' && s > 0) up = 2.6 + Math.sin(t * 3) * 0.1;    // a hand up to the head
      else up = 0.15 + Math.sin(t * 2 + s) * 0.12;
      g.save(); g.translate(s * 0.4, 0.2); g.rotate(-s * up);
      g.fillStyle = shade(col, -0.25); rr(g, -0.06, -0.02, 0.12, 0.3, 0.06); g.fill();
      g.fillStyle = '#b8c0d8'; g.beginPath(); g.arc(0, 0.3, 0.075, 0, TAU); g.fill();
      g.restore();
    });
    // body
    var bg2 = G.body;
    if (!bg2) { bg2 = G.body = g.createLinearGradient(-0.4, 0, 0.4, 0); bg2.addColorStop(0, shade(col, 0.3)); bg2.addColorStop(0.55, col); bg2.addColorStop(1, shade(col, -0.25)); }
    g.fillStyle = bg2; g.beginPath();
    if (B.body === 'round') g.ellipse(0, 0.3, 0.4, 0.33, 0, 0, TAU);
    else if (B.body === 'capsule') rr(g, -0.33, -0.02, 0.66, 0.64, 0.3);
    else rr(g, -0.4, 0.0, 0.8, 0.6, 0.13);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-0.18, 0.12, 0.08, 0.14, 0.4, 0, TAU); g.fill();
    // chest panel: a vertical strip of blinking lights
    g.fillStyle = 'rgba(20,20,45,.35)'; rr(g, -0.08, 0.1, 0.16, 0.34, 0.06); g.fill();
    for (var l = 0; l < 3; l++) {
      var on = (Math.floor(t * 3) + l) % 3 === 0 || st === 'win';
      g.fillStyle = on ? [B.accent, '#ffffff', '#ffd23f'][l] : 'rgba(255,255,255,.25)';
      g.beginPath(); g.arc(0, 0.16 + l * 0.11, 0.035, 0, TAU); g.fill();
    }
    // neck and head
    g.fillStyle = '#9aa3c0'; g.fillRect(-0.08, -0.08, 0.16, 0.1);
    var hg2 = G.head;
    if (!hg2) { hg2 = G.head = g.createLinearGradient(-0.36, 0, 0.36, 0); hg2.addColorStop(0, shade(col, 0.35)); hg2.addColorStop(0.55, col); hg2.addColorStop(1, shade(col, -0.25)); }
    g.fillStyle = hg2; g.beginPath();
    if (B.body === 'round') { g.moveTo(-0.34, -0.08); g.lineTo(-0.34, -0.3); g.arc(0, -0.3, 0.34, Math.PI, 0); g.lineTo(0.34, -0.08); g.closePath(); }
    else rr(g, -0.34, -0.56, 0.68, 0.48, B.body === 'capsule' ? 0.22 : 0.12);
    g.fill();
    // bolts on the sides of the head
    g.fillStyle = shade(col, -0.35); [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * 0.36, -0.3, 0.05, 0, TAU); g.fill(); });
    // antenna
    var blink = Math.sin(t * 5) > 0 ? 1 : 0.35;
    function ballTip(x, y) {
      var k = 'tip' + blink, bg3 = G[k];   // made around (0, 0) and drawn shifted to the tip
      if (!bg3) { bg3 = G[k] = g.createRadialGradient(0, 0, 0, 0, 0, 0.14); bg3.addColorStop(0, 'rgba(255,255,255,' + blink + ')'); bg3.addColorStop(0.4, B.accent); bg3.addColorStop(1, 'rgba(255,255,255,0)'); }
      g.save(); g.translate(x, y); g.fillStyle = bg3; g.beginPath(); g.arc(0, 0, 0.14, 0, TAU); g.fill(); g.restore();
      g.fillStyle = B.accent; g.globalAlpha = 0.6 + 0.4 * blink; g.beginPath(); g.arc(x, y, 0.055, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
    g.strokeStyle = '#6b7290'; g.lineWidth = 0.035; g.lineCap = 'round';
    var top = B.body === 'round' ? -0.64 : -0.56;
    if (B.antenna === 'two') {
      [-1, 1].forEach(function (s) { var sw = Math.sin(t * 3 + s) * 0.03; g.beginPath(); g.moveTo(s * 0.14, top); g.lineTo(s * 0.22 + sw, top - 0.13); g.stroke(); ballTip(s * 0.22 + sw, top - 0.15); });
    } else {
      var sw2 = Math.sin(t * 2.5) * 0.04;
      g.beginPath(); g.moveTo(0, top); g.lineTo(sw2, top - 0.12); g.stroke();
      if (B.antenna === 'gear') { gear(g, sw2, top - 0.17, 0.1, 7, t * 1.5, '#ffd23f'); ballTip(sw2, top - 0.17); }
      else if (B.antenna === 'bolt') {
        ballTip(sw2, top - 0.16);
        g.fillStyle = '#fff3a0'; g.beginPath(); g.moveTo(sw2 + 0.02, top - 0.26); g.lineTo(sw2 - 0.05, top - 0.15); g.lineTo(sw2 + 0.01, top - 0.15); g.lineTo(sw2 - 0.02, top - 0.06); g.lineTo(sw2 + 0.06, top - 0.18); g.lineTo(sw2, top - 0.18); g.closePath(); g.fill();
      } else ballTip(sw2, top - 0.14);
    }
    // the visor: one smooth glowing band (never eyes)
    var vx = -0.27, vy = -0.4, vw = 0.54, vh = 0.17;
    var vg = G.visor;
    if (!vg) { vg = G.visor = g.createLinearGradient(0, vy, 0, vy + vh); vg.addColorStop(0, '#16203a'); vg.addColorStop(1, '#0b1226'); }
    g.fillStyle = vg; rr(g, vx, vy, vw, vh, vh / 2); g.fill();
    g.save(); rr(g, vx, vy, vw, vh, vh / 2); g.clip();
    var glowA = st === 'lose' ? 0.12 : 0.32 + 0.12 * Math.sin(t * 2.5);
    g.fillStyle = 'rgba(120,230,255,' + glowA + ')'; g.fillRect(vx, vy, vw, vh);
    if (st === 'think') {   // a little loading bar that fills and restarts
      var k = (t * 0.9) % 1;
      g.fillStyle = 'rgba(200,250,255,.95)'; rr(g, vx + 0.06, vy + vh / 2 - 0.025, (vw - 0.12) * k, 0.05, 0.025); g.fill();
    } else if (st === 'win') {
      // one spinning star, with a soft shine sweeping across the band
      var sx = vx + ((t * 0.8) % 1) * vw, sh = g.createLinearGradient(sx - 0.1, 0, sx + 0.1, 0);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.45)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sh; g.fillRect(vx, vy, vw, vh);
      g.fillStyle = '#fff2a0'; star8(g, 0, vy + vh / 2, 0.075, 0.45, t * 2); g.fill();
    } else if (st === 'hit') {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(vx, vy, vw, vh);
    }
    g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, vx + 0.05, vy + 0.02, vw - 0.1, 0.035, 0.02); g.fill();
    g.restore();
    g.restore();
  }
  A.robot = function (ctx, kind, R, o) {
    o = o || {}; var t = o.t || 0, st = o.state || 'idle', B = A.ROBOTS[kind] || A.ROBOTS.beep;
    ctx.save();
    var G = grads(ctx, B);
    if (st === 'think') {
      var p = 0.5 + 0.5 * Math.sin(t * 5), gl = G['think' + R];
      if (!gl) { gl = G['think' + R] = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.55); gl.addColorStop(0, 'rgba(160,220,255,1)'); gl.addColorStop(1, 'rgba(160,220,255,0)'); }
      var ga = ctx.globalAlpha; ctx.globalAlpha = ga * (0.3 + p * 0.3);
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, R * 1.55, 0, TAU); ctx.fill();
      ctx.globalAlpha = ga;
    }
    ctx.translate(0, Math.sin(t * 2) * R * 0.025);   // idle bob
    var bg = G['bg' + R];
    if (!bg) { bg = G['bg' + R] = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R); bg.addColorStop(0, B.bg[0]); bg.addColorStop(1, B.bg[1]); }
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.lineWidth = R * 0.09; ctx.strokeStyle = B.ring; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R * 0.955, 0, TAU); ctx.clip(); ctx.scale(R, R); ctx.translate(0, 0.04);
    robotBody(ctx, B, t, st);
    ctx.restore();
    if (st === 'lose') { ctx.fillStyle = 'rgba(15,10,35,.3)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); }
    if (st === 'win') {
      ctx.fillStyle = '#fff2b0';
      for (var i = 0; i < 4; i++) { var a = t * 2 + i * Math.PI / 2, s = R * (0.1 + 0.05 * Math.sin(t * 8 + i)); star8(ctx, Math.cos(a) * R * 1.2, Math.sin(a) * R * 1.2, s, 0.4); ctx.fill(); }
    }
    ctx.restore();
  };

  // A small eight-point star (round pips, buttons).
  A.pip = function (ctx, x, y, r, on, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = on ? (color || '#f6c453') : 'rgba(255,255,255,.18)';
    star8(ctx, 0, 0, r, 0.66); ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.16); ctx.strokeStyle = on ? '#7a4a12' : 'rgba(255,255,255,.35)'; ctx.stroke();
    if (on) { ctx.fillStyle = 'rgba(255,255,255,.55)'; star8(ctx, -r * 0.15, -r * 0.15, r * 0.35, 0.66); ctx.fill(); }
    ctx.restore();
  };

  // ---------- pieces: a golden star (you) and a pink flower (the opponent), each with an outline that is drawn in first ----------
  var PAL = [
    { fill: ['#fff3b0', '#f6c453', '#e58a1f'], line: '#6e3a06', inner: '#fff8de' },
    { fill: ['#ffd1dc', '#ff7a9c', '#d6336c'], line: '#6a1438', inner: '#ffe27a' }
  ];
  A.PAL = [{ main: '#f6c453', light: '#fff3b0' }, { main: '#ff7a9c', light: '#ffd1dc' }];
  // outlines as point lists (unit radius)
  var SHAPES = [[], []];
  (function () {
    for (var i = 0; i <= 16; i++) {   // eight-point star
      var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? 0.56 : 1, p0 = [Math.cos(a) * q, Math.sin(a) * q];
      if (i) { var prev = SHAPES[0][SHAPES[0].length - 1]; for (var k = 1; k <= 6; k++) SHAPES[0].push([prev[0] + (p0[0] - prev[0]) * k / 6, prev[1] + (p0[1] - prev[1]) * k / 6]); }
      else SHAPES[0].push(p0);
    }
    for (var j = 0; j <= 120; j++) {   // six-petal flower
      var t = j / 120 * TAU - Math.PI / 2, rr2 = 0.48 + 0.52 * Math.pow(Math.abs(Math.cos(3 * (t + Math.PI / 2))), 0.55);
      SHAPES[1].push([Math.cos(t) * rr2, Math.sin(t) * rr2]);
    }
  })();
  function shapePath(g, side, R) { g.beginPath(); SHAPES[side].forEach(function (p, i) { i ? g.lineTo(p[0] * R, p[1] * R) : g.moveTo(p[0] * R, p[1] * R); }); g.closePath(); }
  function paintPiece(g, side, cell, outlineOnly) {
    var P = PAL[side], R = cell * 0.36, lw = Math.max(2, cell * 0.05);
    if (outlineOnly) { g.strokeStyle = P.line; g.lineWidth = lw * 1.2; g.lineJoin = 'round'; shapePath(g, side, R); g.stroke(); return; }
    g.save(); g.translate(R * 0.06, R * 0.1); g.fillStyle = 'rgba(30,10,0,.25)'; shapePath(g, side, R); g.fill(); g.restore();
    var gr = g.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R * 1.05);
    gr.addColorStop(0, P.fill[0]); gr.addColorStop(0.5, P.fill[1]); gr.addColorStop(1, P.fill[2]);
    g.fillStyle = gr; shapePath(g, side, R); g.fill();
    if (side === 0) {
      g.fillStyle = 'rgba(255,248,222,.75)'; star8(g, 0, 0, R * 0.5, 0.56); g.fill();
      g.fillStyle = P.fill[2]; star8(g, 0, 0, R * 0.2, 0.5, Math.PI / 8); g.fill();
    } else {
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, R * 0.05); g.lineCap = 'round';
      for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3 - Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); g.lineTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72); g.stroke(); }
      var cg = g.createRadialGradient(-R * 0.08, -R * 0.08, 0, 0, 0, R * 0.28); cg.addColorStop(0, '#fff6c0'); cg.addColorStop(1, '#f0a81c');
      g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R * 0.27, 0, TAU); g.fill();
      g.fillStyle = 'rgba(150,80,0,.5)';
      for (var d = 0; d < 7; d++) { var b2 = d * TAU / 7; g.beginPath(); g.arc(Math.cos(b2) * R * 0.15, Math.sin(b2) * R * 0.15, R * 0.035, 0, TAU); g.fill(); }
    }
    g.strokeStyle = P.line; g.lineWidth = lw; g.lineJoin = 'round'; shapePath(g, side, R); g.stroke();
    g.save(); shapePath(g, side, R); g.clip();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-R * 0.3, -R * 0.5, R * 0.45, R * 0.2, -0.5, 0, TAU); g.fill();
    g.restore();
  }
  // name: 's0' / 's1' (the piece), 'o0' / 'o1' (its outline), 'dish0' / 'dish1' (the glazed dish a piece waits in)
  A.pieceSprite = function (name, cell, dpr) {
    var side = +name.slice(-1), c, g;
    if (name.indexOf('dish') === 0) {
      var r = 78, W = r * 2.6; c = canvas(W * dpr, W * dpr); g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(W / 2, W / 2 - 4);
      g.fillStyle = 'rgba(10,5,20,.35)'; g.beginPath(); g.ellipse(r * 0.06, r * 0.18, r * 1.02, r * 0.96, 0, 0, TAU); g.fill();
      var dg = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
      dg.addColorStop(0, '#fffaf0'); dg.addColorStop(0.75, '#e9dcc0'); dg.addColorStop(1, '#b89a6a');
      g.fillStyle = dg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.globalAlpha = 0.6; g.strokeStyle = A.PAL[side].main; g.lineWidth = r * 0.06; g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.stroke(); g.globalAlpha = 1;
      return c;
    }
    var Wp = cell * 0.86; c = canvas(Wp * dpr, Wp * dpr); g = c.getContext('2d'); g.scale(dpr, dpr); g.translate(Wp / 2, Wp / 2);
    paintPiece(g, side, cell, name.charAt(0) === 'o');
    return c;
  };

  // ======================================================================================================
  // The Phaser side: sheets of pictures painted once into the engine's canvas textures
  // ======================================================================================================
  var KS = 2.8;                                                          // design units per "virtual css pixel" of the old paint code
  A.KS = KS;
  function bucket(z, max) { var L = [0.4, 0.55, 0.75, 1, 1.5, 2, 3], i; for (i = 0; i < L.length; i++) if (z <= L[i] * 1.001) break; return Math.min(L[Math.min(i, L.length - 1)], max || 3); }
  A.bucket = bucket;

  // a sheet: one picture at a FIXED size (Kit.play.tex, so tools/bake-art.js can bake it into an AVIF file) with frames packed in
  // rows. add(name, w, h, paint(ctx, w, h)) only records where a frame goes; done() paints the whole sheet (only when it was
  // not baked: tex() calls the painter or finds the baked picture) and then adds the frames, the same either way.
  function Sheet(scene, key, W, H) {
    var items = [], x = 0, y = 0, rh = 0;
    return {
      key: key,
      add: function (name, w, h, paint) {
        w = Math.ceil(w); h = Math.ceil(h);
        if (x + w > W) { x = 0; y += rh + 2; rh = 0; }
        if (y + h > H) throw new Error('sheet ' + key + ' is full at ' + name);
        items.push({ name: name, x: x, y: y, w: w, h: h, paint: paint }); x += w + 2; rh = Math.max(rh, h);
      },
      done: function () {
        Kit.play.tex(scene, key, W, H, function (g) {
          items.forEach(function (it) { g.save(); g.translate(it.x, it.y); g.beginPath(); g.rect(0, 0, it.w, it.h); g.clip(); it.paint(g, it.w, it.h); g.restore(); });
        });
        var t = scene.textures.get(key);
        items.forEach(function (it) { if (!t.has(it.name)) t.add(it.name, 0, it.x, it.y, it.w, it.h); });
      }
    };
  }
  A.Sheet = Sheet;

  var CREAM = '#fffaf0', GOLD = '#f6c453', PLUM = '#1b1040';
  A.CREAM = CREAM; A.GOLD = GOLD; A.PLUM = PLUM;

  // ---- the interface sheet 'ui' (2 texture pixels per design unit; icons in a 128 box = 64 units) ----
  function paintUI(scene) {
    var S = Sheet(scene, 'ui', 2048, 1056);
    function disc(g, cx, cy, r, c0, c1) { var gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }
    // round buttons
    S.add('plate', 300, 300, function (g) {
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
      disc(g, 150, 148, 136, 'rgba(58,38,112,.96)', 'rgba(24,12,56,.96)'); g.shadowColor = 'transparent';
      g.lineWidth = 6; g.strokeStyle = 'rgba(255,214,107,.6)'; g.beginPath(); g.arc(150, 148, 133, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 4; g.beginPath(); g.arc(150, 148, 120, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
    });
    S.add('big', 360, 360, function (g) {
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
      disc(g, 180, 176, 160, '#fff0b0', '#e0a02c'); g.shadowColor = 'transparent';
      g.lineWidth = 8; g.strokeStyle = 'rgba(120,70,8,.7)'; g.beginPath(); g.arc(180, 176, 156, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(130, 90, 70, 30, -0.5, 0, TAU); g.fill();
    });
    // stretchable pieces (used as nine-slices)
    S.add('btn', 512, 128, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d9d4e4');
      g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
      rr(g, 8, 6, w - 16, h - 20, 54); g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
      g.lineWidth = 4; g.strokeStyle = 'rgba(60,30,90,.35)'; rr(g, 8, 6, w - 16, h - 20, 54); g.stroke();
    });
    S.add('panel', 320, 320, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(46,28,98,.97)'); gr.addColorStop(1, 'rgba(22,11,52,.97)');
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
      rr(g, 20, 16, w - 40, h - 44, 70); g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
      g.lineWidth = 6; g.strokeStyle = 'rgba(255,214,107,.7)'; rr(g, 20, 16, w - 40, h - 44, 70); g.stroke();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.12)'; rr(g, 34, 30, w - 68, h - 72, 58); g.stroke();
    });
    S.add('chip', 256, 96, function (g, w, h) {
      rr(g, 6, 6, w - 12, h - 16, 40); g.fillStyle = 'rgba(22,11,52,.86)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,214,107,.75)'; g.stroke();
    });
    S.add('row', 256, 200, function (g, w, h) {            // a list row (the opponents)
      rr(g, 6, 6, w - 12, h - 12, 56); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,225,160,.4)'; g.stroke();
    });
    S.add('ribbon', 512, 160, function (g, w, h) {
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 12; g.shadowOffsetY = 5;
      g.beginPath(); g.moveTo(14, 12); g.lineTo(w - 14, 12); g.lineTo(w - 70, 72); g.lineTo(w - 14, h - 30); g.lineTo(14, h - 30); g.lineTo(70, 72); g.closePath();
      g.fillStyle = 'rgba(20,10,50,.9)'; g.fill(); g.shadowColor = 'transparent';
      g.lineWidth = 5; g.strokeStyle = 'rgba(255,214,107,.9)'; g.stroke();
    });
    // icons: white strokes in a 128 box
    function icon(name, draw) { S.add(name, 128, 128, function (g) { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); }); }
    icon('ic-pause', function (g) { rr(g, 34, 28, 18, 72, 8); g.fill(); rr(g, 76, 28, 18, 72, 8); g.fill(); });
    icon('ic-play', function (g) { g.beginPath(); g.moveTo(42, 26); g.lineTo(100, 64); g.lineTo(42, 102); g.closePath(); g.fill(); });
    icon('ic-retry', function (g) { g.lineWidth = 12; g.beginPath(); g.arc(64, 66, 34, -0.6, 4.5); g.stroke(); g.beginPath(); g.moveTo(88, 16); g.lineTo(96, 42); g.lineTo(70, 44); g.closePath(); g.fill(); });
    icon('ic-bot', function (g) { rr(g, 32, 42, 64, 54, 14); g.stroke(); g.beginPath(); g.moveTo(64, 42); g.lineTo(64, 24); g.stroke(); g.beginPath(); g.arc(64, 20, 6, 0, TAU); g.fill(); rr(g, 46, 62, 36, 12, 6); g.fill(); g.beginPath(); g.moveTo(24, 62); g.lineTo(24, 76); g.moveTo(104, 62); g.lineTo(104, 76); g.stroke(); });
    icon('ic-two', function (g) { g.beginPath(); g.arc(46, 48, 14, 0, TAU); g.arc(86, 52, 12, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(20, 100); g.quadraticCurveTo(46, 58, 72, 100); g.moveTo(78, 76); g.quadraticCurveTo(100, 66, 112, 100); g.stroke(); });
    icon('ic-snd', function (g) { g.beginPath(); g.moveTo(24, 50); g.lineTo(44, 50); g.lineTo(68, 28); g.lineTo(68, 100); g.lineTo(44, 78); g.lineTo(24, 78); g.closePath(); g.fill(); g.lineWidth = 9; g.beginPath(); g.arc(70, 64, 22, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(70, 64, 38, -0.9, 0.9); g.stroke(); });
    icon('ic-mute', function (g) { g.beginPath(); g.moveTo(20, 50); g.lineTo(40, 50); g.lineTo(64, 28); g.lineTo(64, 100); g.lineTo(40, 78); g.lineTo(20, 78); g.closePath(); g.fill(); g.lineWidth = 10; g.beginPath(); g.moveTo(84, 48); g.lineTo(112, 80); g.moveTo(112, 48); g.lineTo(84, 80); g.stroke(); });
    icon('ic-close', function (g) { g.lineWidth = 13; g.beginPath(); g.moveTo(34, 34); g.lineTo(94, 94); g.moveTo(94, 34); g.lineTo(34, 94); g.stroke(); });
    icon('ic-back', function (g) { g.lineWidth = 14; g.beginPath(); g.moveTo(78, 24); g.lineTo(38, 64); g.lineTo(78, 104); g.stroke(); });
    icon('ic-next', function (g) { g.lineWidth = 12; g.beginPath(); g.moveTo(26, 64); g.lineTo(98, 64); g.moveTo(70, 34); g.lineTo(100, 64); g.lineTo(70, 94); g.stroke(); });
    icon('ic-lock', function (g) { rr(g, 32, 60, 64, 46, 10); g.fill(); g.lineWidth = 11; g.beginPath(); g.moveTo(44, 62); g.lineTo(44, 48); g.arc(64, 48, 20, Math.PI, 0); g.lineTo(84, 62); g.stroke(); });
    icon('ic-exit', function (g) { Kit.play.exitIcon(g, 128, '#ffffff', 2.9); });
    icon('ic-star', function (g) { star8(g, 64, 64, 50, 0.6); g.fill(); });
    // a pip (round pips: small star with a rim) and the ladder's difficulty dot
    S.add('pip', 64, 64, function (g) { g.fillStyle = '#fff'; star8(g, 32, 32, 28, 0.66); g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(70,40,10,.8)'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; star8(g, 28, 28, 10, 0.66); g.fill(); });
    S.add('px', 16, 16, function (g) { g.fillStyle = '#fff'; g.fillRect(0, 0, 16, 16); });
    S.add('dot', 32, 32, function (g) { g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, TAU); g.fill(); });
    // effects
    S.add('glow', 256, 256, function (g) { var gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    S.add('ring', 256, 256, function (g) { g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.stroke(); });
    S.add('mark', 256, 256, function (g) {                    // a place the piece can go: soft disc, bright ring, dot
      g.fillStyle = 'rgba(255,255,255,.34)'; g.beginPath(); g.arc(128, 128, 96, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 16; g.beginPath(); g.arc(128, 128, 96, 0, TAU); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 32, 0, TAU); g.fill();
    });
    S.add('spark', 64, 64, function (g) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(32, 32, 62, 32); g.quadraticCurveTo(32, 32, 32, 62); g.quadraticCurveTo(32, 32, 2, 32); g.quadraticCurveTo(32, 32, 32, 2); g.fill(); });
    S.add('star8', 96, 96, function (g) { g.fillStyle = '#fff'; star8(g, 48, 48, 44, 0.5); g.fill(); });
    S.add('shadow', 192, 144, function (g) { var gr = g.createRadialGradient(96, 72, 0, 96, 72, 90); gr.addColorStop(0, 'rgba(10,5,0,.95)'); gr.addColorStop(0.6, 'rgba(10,5,0,.5)'); gr.addColorStop(1, 'rgba(10,5,0,0)'); g.save(); g.translate(96, 72); g.scale(1, 0.75); g.translate(-96, -72); g.fillStyle = gr; g.fillRect(0, 0, 192, 144); g.restore(); });
    S.add('hi', 128, 128, function (g) { rr(g, 8, 8, 112, 112, 22); g.fillStyle = '#fff'; g.fill(); });
    S.add('bar', 512, 128, function (g, w, h) {              // the winning line: a glowing capsule
      [[56, 0.16], [36, 0.3], [20, 0.7], [8, 1]].forEach(function (q) { g.fillStyle = q[1] === 1 ? '#fff' : 'rgba(255,214,107,' + q[1] + ')'; rr(g, 64 - q[0] / 2 + 0, 64 - q[0] / 2, w - 128 + q[0], q[0], q[0] / 2); g.fill(); });
    });
    S.add('focus', 256, 256, function (g) {                   // the keyboard cursor: four corners
      g.lineCap = 'round'; g.lineJoin = 'round';
      [['rgba(20,10,50,.8)', 24], ['#fff6cf', 13]].forEach(function (q) {
        g.strokeStyle = q[0]; g.lineWidth = q[1];
        [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (d) { var cx = d[0] > 0 ? 28 : 228, cy = d[1] > 0 ? 28 : 228; g.beginPath(); g.moveTo(cx, cy + d[1] * 56); g.lineTo(cx, cy); g.lineTo(cx + d[0] * 56, cy); g.stroke(); });
      });
    });
    S.add('bubble', 160, 110, function (g) { rr(g, 6, 6, 148, 66, 33); g.fillStyle = 'rgba(255,255,255,.96)'; g.fill(); g.beginPath(); g.arc(26, 88, 10, 0, TAU); g.fill(); g.beginPath(); g.arc(12, 102, 5, 0, TAU); g.fill(); });
    S.done();
  }

  // ---- the robots: each in four poses on one sheet 'rob' (frame 'beep-idle' ...), radius 80 px in a 256 box ----
  var POSE = { idle: 0.4, think: 1.0, win: 0.35, lose: 0.5 };
  A.POSES = ['idle', 'think', 'win', 'lose'];
  function paintRobots(scene, kinds) {
    var S = Sheet(scene, 'rob', 1040, 258 * kinds.length);
    kinds.forEach(function (k) {
      A.POSES.forEach(function (st) {
        S.add(k + '-' + st, 256, 256, function (g) { g.translate(128, 128); A.robot(g, k, 80, { state: st, t: POSE[st] }); });
      });
    });
    S.done();
  }
  A.init = function (scene, kinds) {
    if (A.inited) return; A.inited = true;
    paintUI(scene);
    paintRobots(scene, kinds);
  };

  // ---- the courtyard: two fixed pictures, painted past the edges at 0.8 texture pixels per design unit: a wide one (a phone on
  // its side, a tablet) and a tall one (an upright phone); the scene scales the one it needs to cover the screen ----
  var BG = { land: { w: 2400, h: 1200, key: 'bg-land' }, port: { w: 1280, h: 2800, key: 'bg-port' } }, BGD = 0.8;
  var BAKE = /[?&]bake\b/.test(location.search);
  A.bg = function (scene, port, theme) {
    var o = port ? BG.port : BG.land, other = port ? BG.land : BG.port, vw = Math.round(o.w / KS), vh = Math.round(o.h / KS), dpr = BGD * KS;
    var cw = Math.round(vw * dpr), ch = Math.round(vh * dpr);
    Kit.play.tex(scene, o.key, cw, ch, function (g) { g.drawImage(A.paintScene(theme, vw, vh, dpr), 0, 0); });
    if (!BAKE && scene.textures.exists(other.key)) scene.textures.remove(other.key);         // the other shape of screen is not needed now
    return { key: o.key, w: o.w, h: o.h };
  };

  // ---- the board: one picture per board size, at 1 texture pixel per design unit (shown scaled to the screen) ----
  var BS = 1000;
  A.boardTex = function (scene, style, theme, n) {
    var Sv = Math.round(BS / KS), pad = Math.round(Sv * 0.08), depth = Math.round(Sv * 0.035), frame = Math.round(Sv * (style === 'grid' ? 0.07 : 0.058));
    var cw = Math.ceil((Sv + pad * 2) * KS), ch = Math.ceil((Sv + depth + pad * 2) * KS), key = 'board-' + style + '-' + n;
    Kit.play.tex(scene, key, cw, ch, function (g) { g.drawImage(A.board(style, n, Sv, KS, theme).canvas, 0, 0); });
    return { key: key, pad: pad * KS, frame: frame * KS, depth: depth * KS, cell: (Sv - 2 * frame) / n * KS, S: Sv * KS, w: cw, h: ch };
  };

  // ---- the discs: one sheet at a fixed size. dims(name, cell) says how big each frame is, so the sheet can be laid out
  // (and baked) without painting; painter(name, cell, 1) paints one frame ----
  A.pieceSheet = function (scene, cell, painter, dims, names) {
    var d = names.map(function (nm) { return dims(nm, cell); }), W = 0, H = 0;
    d.forEach(function (q) { W += q[0] + 2; H = Math.max(H, q[1] + 2); });
    var S = Sheet(scene, 'pcs', W + 2, H + 2), info = { key: 'pcs', frames: {} };
    names.forEach(function (nm, i) { S.add(nm, d[i][0], d[i][1], function (g) { g.drawImage(painter(nm, cell, 1), 0, 0); }); info.frames[nm] = { w: Math.ceil(d[i][0]), h: Math.ceil(d[i][1]) }; });
    S.done(); return info;
  };

  // for tools/bake-art.js (?bake): paint every picture the game can ask for, so all of them are baked
  A.paintAll = function (scene, C) {
    A.bg(scene, false, C.theme); A.bg(scene, true, C.theme);
    var seen = {}; C.opponents.forEach(function (o) { var n = o.n || C.n; if (!seen[n]) { seen[n] = 1; A.boardTex(scene, C.boardStyle, C.theme, n); } });
  };
})();
