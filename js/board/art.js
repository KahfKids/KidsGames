/* Kahf KidsGames board kit: art.js
   Everything is drawn in code: the courtyard scene behind the board (parallax layers), the wooden board with
   inlaid zellige tiles, hanging lanterns, and the toy-robot opponents (no faces: a single visor band). Exposes window.BoardArt. */
(function () {
  'use strict';
  var A = window.BoardArt = {};
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

    return { sky: sky, far: far, mid: mid, near: near, margin: m, lanterns: lanterns, floorY: floorY / dpr };
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
  function robotBody(g, B, t, st) {
    var col = B.color, sc = B.big ? 1.08 : 0.94;
    g.scale(sc, sc);
    // base: wheels, one big wheel, or a hover glow
    if (B.base === 'hover') {
      var hg = g.createRadialGradient(0, 0.78, 0, 0, 0.78, 0.4); hg.addColorStop(0, 'rgba(120,230,255,.9)'); hg.addColorStop(1, 'rgba(120,230,255,0)');
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
    var bg2 = g.createLinearGradient(-0.4, 0, 0.4, 0); bg2.addColorStop(0, shade(col, 0.3)); bg2.addColorStop(0.55, col); bg2.addColorStop(1, shade(col, -0.25));
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
    var hg2 = g.createLinearGradient(-0.36, 0, 0.36, 0); hg2.addColorStop(0, shade(col, 0.35)); hg2.addColorStop(0.55, col); hg2.addColorStop(1, shade(col, -0.25));
    g.fillStyle = hg2; g.beginPath();
    if (B.body === 'round') { g.moveTo(-0.34, -0.08); g.lineTo(-0.34, -0.3); g.arc(0, -0.3, 0.34, Math.PI, 0); g.lineTo(0.34, -0.08); g.closePath(); }
    else rr(g, -0.34, -0.56, 0.68, 0.48, B.body === 'capsule' ? 0.22 : 0.12);
    g.fill();
    // bolts on the sides of the head
    g.fillStyle = shade(col, -0.35); [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * 0.36, -0.3, 0.05, 0, TAU); g.fill(); });
    // antenna
    var blink = Math.sin(t * 5) > 0 ? 1 : 0.35;
    function ballTip(x, y) {
      var bg3 = g.createRadialGradient(x, y, 0, x, y, 0.14); bg3.addColorStop(0, 'rgba(255,255,255,' + blink + ')'); bg3.addColorStop(0.4, B.accent); bg3.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = bg3; g.beginPath(); g.arc(x, y, 0.14, 0, TAU); g.fill();
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
    var vg = g.createLinearGradient(0, vy, 0, vy + vh); vg.addColorStop(0, '#16203a'); vg.addColorStop(1, '#0b1226');
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
    if (st === 'think') {
      var p = 0.5 + 0.5 * Math.sin(t * 5), gl = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.55);
      gl.addColorStop(0, 'rgba(160,220,255,' + (0.3 + p * 0.3) + ')'); gl.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, R * 1.55, 0, TAU); ctx.fill();
    }
    ctx.translate(0, Math.sin(t * 2) * R * 0.025);   // idle bob
    var bg = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R);
    bg.addColorStop(0, B.bg[0]); bg.addColorStop(1, B.bg[1]);
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
})();
