/* Memory Match: art.js
   The four world scenes (layered parallax with haze and soft light), the card backs (a different Islamic
   geometric pattern for each world), the card faces (paper cards with the animal) and small cached sprites.
   All drawn in code; everything is cached on offscreen canvases in device pixels. */
(function () {
  'use strict';
  var A = window.MMArt = {};
  var M = window.MMAnimals, shade = M.shade, mix = M.mix, rgba = M.rgba;

  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function starN(g, x, y, r, inner, n, rot) {
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = i * Math.PI / n - Math.PI / 2 + (rot || 0), q = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function star8(g, x, y, r, inner, rot) { starN(g, x, y, r, inner || 0.62, 8, rot); }
  function glow(g, x, y, r, col, a) { var q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); }
  A.rr = rr; A.star8 = star8; A.rgba = rgba;

  A.WORLDS = [
    { name: 'Desert Dusk', color: '#ffb36b', focus: 'rgba(40,14,40,.28)', ink: '#fff3e0', dark: true },
    { name: 'Oasis Garden', color: '#8fe3a8', focus: 'rgba(255,250,225,.34)', ink: '#2c4a36', dark: false },
    { name: 'Under the Sea', color: '#8fe0ff', focus: 'rgba(6,30,60,.3)', ink: '#eafcff', dark: true },
    { name: 'Lantern Night', color: '#c9b2ff', focus: 'rgba(8,8,34,.32)', ink: '#fff6df', dark: true }
  ];

  // ---------- world scenes: { sky, far, mid, near, margin } in device px ----------
  A.paintWorld = function (wi, w, h, dpr) {
    var m = Math.round(36 * dpr), cw = Math.round(w * dpr) + m * 2, ch = Math.round(h * dpr);
    var sky = canvas(cw, ch), far = canvas(cw, ch), mid = canvas(cw, ch), near = canvas(cw, ch);
    var S = dpr * Math.max(0.75, Math.min(1.6, Math.min(w, h) / 430)), H = ch, Wd = cw;
    var horizon = H * (h > w ? 0.66 : 0.62);
    var R = rng(900 + wi * 77);
    var g = sky.getContext('2d'), f = far.getContext('2d'), md = mid.getContext('2d'), n = near.getContext('2d');
    function vgrad(ctx, y0, y1, stops) { var q = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(function (c, i) { q.addColorStop(i / (stops.length - 1), c); }); return q; }
    function ridge(ctx, base, amp, fill, seed, f1, f2) {
      var r = rng(seed), ph = r() * 6, a = f1 || (0.0025 + r() * 0.002), b = f2 || (0.007 + r() * 0.004);
      ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= Wd + 8; x += 5 * S) ctx.lineTo(x, base - Math.sin(x / S * a + ph) * amp - Math.sin(x / S * b + ph * 2) * amp * 0.35);
      ctx.lineTo(Wd, H); ctx.closePath(); ctx.fill();
      return function (x) { return base - Math.sin(x / S * a + ph) * amp - Math.sin(x / S * b + ph * 2) * amp * 0.35; };
    }
    function rim(ctx, yf, col, a, wdt) { ctx.strokeStyle = rgba(col, a); ctx.lineWidth = (wdt || 2) * S; ctx.beginPath(); for (var x = 0; x <= Wd + 8; x += 5 * S) x ? ctx.lineTo(x, yf(x)) : ctx.moveTo(x, yf(x)); ctx.stroke(); }
    function haze(ctx, top, bot, col, a) { var q = ctx.createLinearGradient(0, top, 0, bot); q.addColorStop(0, rgba(col, 0)); q.addColorStop(1, rgba(col, a)); ctx.fillStyle = q; ctx.fillRect(0, top, Wd, bot - top); }
    function stars(ctx, cnt, maxY, seed) { var r = rng(seed); for (var i = 0; i < cnt; i++) { var y = r() * maxY; ctx.globalAlpha = (0.25 + r() * 0.75) * (1 - y / maxY * 0.8); ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(r() * Wd, y, (0.4 + r() * 1.2) * S, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; }
    function palm(ctx, x, base, hgt, col, lean) {
      ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
      var tx = x + hgt * (lean || 0.12), ty = base - hgt;
      ctx.lineWidth = hgt * 0.05; ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + hgt * 0.02, base - hgt * 0.55, tx, ty); ctx.stroke();
      for (var i = 0; i < 9; i++) {
        var a = -Math.PI / 2 + (i - 4) * 0.42, L = hgt * (0.42 + (i % 2) * 0.1);
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - hgt * 0.1, tx + Math.cos(a) * L, ty + Math.sin(a) * L + hgt * 0.22);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.45, ty + Math.sin(a) * L * 0.45, tx, ty); ctx.fill();
      }
      ctx.restore();
    }
    function camelSil(ctx, x, y, s, col) { // a tiny far-away camel silhouette (no detail at all)
      ctx.fillStyle = col; ctx.beginPath();
      ctx.ellipse(x, y - 9 * s, 9 * s, 4.2 * s, 0, 0, 6.283); ctx.moveTo(x - 3 * s, y - 12 * s); ctx.ellipse(x - 1 * s, y - 12 * s, 4.5 * s, 3.5 * s, 0, 0, 6.283); ctx.fill();
      ctx.lineWidth = 1.6 * s; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(x + 7 * s, y - 10 * s); ctx.quadraticCurveTo(x + 11 * s, y - 9 * s, x + 12 * s, y - 16 * s); ctx.lineTo(x + 14.5 * s, y - 16.5 * s);
      [-6, -3, 4, 7].forEach(function (d) { ctx.moveTo(x + d * s, y - 7 * s); ctx.lineTo(x + d * s + 0.5 * s, y); }); ctx.stroke();
    }

    if (wi === 0) { // ---------------- Desert Dusk ----------------
      g.fillStyle = vgrad(g, 0, horizon, ['#251f52', '#4f357a', '#a2507c', '#e9805f', '#ffc77a']); g.fillRect(0, 0, Wd, H);
      stars(g, 90, horizon * 0.45, 3);
      var sx = Wd * 0.68, sy = horizon - 16 * S;
      glow(g, sx, sy, 330 * S, '#ffd59a', 0.7); glow(g, sx, sy, 120 * S, '#fff1c8', 0.6);
      g.fillStyle = '#fff1cc'; g.beginPath(); g.arc(sx, sy, 46 * S, 0, 6.283); g.fill();
      for (var c = 0; c < 6; c++) { g.fillStyle = 'rgba(255,190,170,' + (0.18 + R() * 0.2) + ')'; g.beginPath(); g.ellipse(R() * Wd, (0.25 + R() * 0.45) * horizon, (50 + R() * 120) * S, 4 * S, 0, 0, 6.283); g.fill(); }
      var fr = ridge(f, horizon + 4 * S, 20 * S, '#b2617a', 11); rim(f, fr, '#ffc49a', 0.5, 1.5);
      haze(f, horizon - 70 * S, horizon + 40 * S, '#ffb98a', 0.45);
      var mr = ridge(md, horizon + 46 * S, 26 * S, '#a54c52', 21, 0.004, 0.009); rim(md, mr, '#ffb07a', 0.55, 2);
      var cx0 = Wd * 0.18;
      for (var k = 0; k < 4; k++) { var xx = cx0 + k * 30 * S; camelSil(md, xx, mr(xx) + 1 * S, 1.15 * S, '#5b2a44'); }
      palm(md, Wd * 0.86, mr(Wd * 0.86) + 6 * S, 80 * S, '#4a2440', -0.12); palm(md, Wd * 0.9, mr(Wd * 0.9) + 6 * S, 62 * S, '#4a2440', 0.15);
      haze(md, horizon - 10 * S, H, '#e9805f', 0.18);
      var nr = ridge(n, H - 70 * S, 34 * S, '#5e2b45', 31, 0.0035, 0.008); rim(n, nr, '#f39a6e', 0.55, 2.4);
      n.strokeStyle = 'rgba(255,170,130,.18)'; n.lineWidth = 1.2 * S;
      for (var q = 0; q < 14; q++) { var yy = H - (10 + q * 4.2) * S; n.beginPath(); n.moveTo(0, yy); n.quadraticCurveTo(Wd * 0.5, yy - 12 * S * Math.sin(q), Wd, yy + 6 * S); n.stroke(); }
      ridge(n, H - 24 * S, 14 * S, '#46203a', 32);
      palm(n, Wd * 0.03, H - 14 * S, 230 * S, '#2b1430', 0.18); palm(n, Wd * 0.985, H - 8 * S, 190 * S, '#2b1430', -0.16);
    } else if (wi === 1) { // ---------------- Oasis Garden ----------------
      g.fillStyle = vgrad(g, 0, horizon, ['#5cb9e4', '#9fdcef', '#d7f2e8', '#fff1c4']); g.fillRect(0, 0, Wd, H);
      glow(g, Wd * 0.15, horizon * 0.12, 300 * S, '#fff6d0', 0.8);
      for (var cl = 0; cl < 7; cl++) { var cx = R() * Wd, cy = (0.08 + R() * 0.4) * horizon, cs = (18 + R() * 20) * S; g.fillStyle = 'rgba(255,255,255,' + (0.55 + R() * 0.3) + ')';
        g.beginPath(); [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [-0.4, -0.35, 0.7], [0.45, -0.3, 0.65]].forEach(function (p) { g.moveTo(cx + p[0] * cs + p[2] * cs, cy + p[1] * cs); g.arc(cx + p[0] * cs, cy + p[1] * cs, p[2] * cs, 0, 6.283); }); g.fill(); }
      ridge(f, horizon - 30 * S, 26 * S, '#9cc9b0', 41); haze(f, horizon - 120 * S, horizon, '#e8f6ea', 0.55);
      var rC = rng(42); f.fillStyle = '#6fa58a';
      for (var t = 0; t < 16; t++) { var tx = (t / 15) * Wd + (rC() - 0.5) * 40 * S, th = (60 + rC() * 50) * S; f.beginPath(); f.ellipse(tx, horizon - 20 * S - th * 0.4, th * 0.1, th * 0.48, 0, 0, 6.283); f.fill(); }
      haze(f, horizon - 60 * S, horizon + 20 * S, '#f4fbef', 0.35);
      // the garden wall with arches
      var top = horizon - 20 * S, aw = 104 * S;
      md.fillStyle = '#f2dfba'; md.fillRect(0, top - 14 * S, Wd, H - top + 14 * S);
      md.fillStyle = '#e4c896'; md.fillRect(0, top - 18 * S, Wd, 6 * S);
      for (var ax = -aw * 0.3; ax < Wd + aw; ax += aw) {
        var cw2 = aw * 0.18, l = ax + cw2, r2 = ax + aw, mx = (l + r2) / 2, bot = top + aw * 1.2;
        var ag = md.createLinearGradient(0, top, 0, bot); ag.addColorStop(0, '#76b88a'); ag.addColorStop(1, '#3f8058');
        md.fillStyle = ag; md.beginPath(); md.moveTo(l, bot); md.lineTo(l, top + aw * 0.36); md.quadraticCurveTo(l, top + aw * 0.06, mx, top + aw * 0.02); md.quadraticCurveTo(r2, top + aw * 0.06, r2, top + aw * 0.36); md.lineTo(r2, bot); md.closePath(); md.fill();
        md.strokeStyle = '#c99c5c'; md.lineWidth = 2.5 * S; md.stroke();
        md.fillStyle = '#c99c5c'; star8(md, ax + cw2 / 2, top + aw * 0.12, 5 * S); md.fill();
        palm(md, mx, top + aw * 0.9, 70 * S, 'rgba(40,100,60,.55)', 0.08);
      }
      haze(md, top - 40 * S, H, '#fff6e0', 0.22);
      var nb = rng(52), base = H - 30 * S;
      for (var b = 0; b < 16; b++) { var bx = nb() * Wd, br = (24 + nb() * 34) * S; n.fillStyle = b % 2 ? '#2f6e45' : '#3a7f50'; n.beginPath(); n.arc(bx, base, br, 0, 6.283); n.fill(); }
      n.fillStyle = '#2b6340'; n.fillRect(0, base, Wd, H - base);
      for (var fl = 0; fl < 46; fl++) { n.fillStyle = ['#ff8fab', '#ffd166', '#ffffff', '#ffb2c8'][fl % 4]; n.beginPath(); n.arc(nb() * Wd, H - (6 + nb() * 60) * S, (1.8 + nb() * 2.4) * S, 0, 6.283); n.fill(); }
      palm(n, Wd * 0.02, H, 240 * S, '#235638', 0.2); palm(n, Wd * 0.99, H, 210 * S, '#235638', -0.18);
    } else if (wi === 2) { // ---------------- Under the Sea ----------------
      g.fillStyle = vgrad(g, 0, H, ['#8de4ee', '#3db3cf', '#1a7fa8', '#0f5784', '#0a3462']); g.fillRect(0, 0, Wd, H);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (var ry = 0; ry < 7; ry++) { var rx = (0.05 + ry * 0.15 + R() * 0.05) * Wd, rw = (30 + R() * 60) * S, lg = g.createLinearGradient(0, 0, 0, H * 0.85);
        lg.addColorStop(0, 'rgba(220,255,255,.2)'); lg.addColorStop(1, 'rgba(220,255,255,0)'); g.fillStyle = lg;
        g.beginPath(); g.moveTo(rx, 0); g.lineTo(rx + rw, 0); g.lineTo(rx + rw * 2.6 + H * 0.18, H * 0.85); g.lineTo(rx + rw * 0.8 + H * 0.18, H * 0.85); g.closePath(); g.fill(); }
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.4 * S;
      for (var cz = 0; cz < 30; cz++) { var zx = R() * Wd, zy = R() * H * 0.12; g.beginPath(); g.moveTo(zx, zy); g.quadraticCurveTo(zx + 14 * S, zy + 5 * S, zx + 28 * S, zy); g.stroke(); }
      var fr2 = ridge(f, horizon + 20 * S, 34 * S, '#1d6e94', 61, 0.004, 0.011);
      f.fillStyle = '#1d6e94';
      for (var ar = 0; ar < 3; ar++) { var axx = (0.2 + ar * 0.32) * Wd, ah = (60 + R() * 50) * S; f.beginPath(); f.ellipse(axx, fr2(axx), 26 * S, ah, 0, Math.PI, 0); f.fill(); }
      haze(f, horizon - 120 * S, H, '#2a8fb8', 0.45);
      var mr2 = ridge(md, H - 90 * S, 22 * S, '#175e86', 71);
      var cr = rng(73);
      for (var co = 0; co < 9; co++) {
        var ccx = (co / 8) * Wd + (cr() - 0.5) * 50 * S, ccy = mr2(ccx) + 10 * S, col = ['#d9788f', '#a679c9', '#eaa86c', '#6fc7b8'][co % 4];
        if (co % 3 === 0) { md.fillStyle = col; md.beginPath(); md.ellipse(ccx, ccy, 30 * S, 22 * S, 0, Math.PI, 0); md.fill();
          md.strokeStyle = rgba(shade(col, -0.25), 0.6); md.lineWidth = 1.5 * S; for (var bl = 0; bl < 4; bl++) { md.beginPath(); md.ellipse(ccx, ccy, (8 + bl * 6) * S, (5 + bl * 4.5) * S, 0, Math.PI, 0); md.stroke(); } }
        else { md.strokeStyle = col; md.lineCap = 'round';
          (function br2(x, y, a, len, wdt, d) { if (d > 4) return; var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; md.lineWidth = wdt; md.beginPath(); md.moveTo(x, y); md.lineTo(ex, ey); md.stroke();
            br2(ex, ey, a - 0.45 - cr() * 0.2, len * 0.75, wdt * 0.72, d + 1); br2(ex, ey, a + 0.45 + cr() * 0.2, len * 0.75, wdt * 0.72, d + 1); })(ccx, ccy, -Math.PI / 2, (22 + cr() * 12) * S, 7 * S, 0); }
      }
      haze(md, mr2(0) - 60 * S, H, '#0f5784', 0.2);
      n.fillStyle = vgrad(n, H - 60 * S, H, ['#e7cf96', '#c9a86a']); var sr = ridge(n, H - 38 * S, 10 * S, '#e2c58a', 81); rim(n, sr, '#fff4d0', 0.5, 1.6);
      n.fillStyle = 'rgba(160,120,60,.35)'; for (var sp = 0; sp < 60; sp++) { n.beginPath(); n.arc(R() * Wd, H - R() * 34 * S, 1.2 * S, 0, 6.283); n.fill(); }
      function weed(x, hgt, col, ph) { n.strokeStyle = col; n.lineCap = 'round'; n.lineWidth = 7 * S; n.beginPath(); n.moveTo(x, H); for (var yy = 0; yy <= 1; yy += 0.1) n.lineTo(x + Math.sin(yy * 7 + ph) * 12 * S * yy, H - yy * hgt); n.stroke(); }
      for (var wd = 0; wd < 5; wd++) { weed(Wd * 0.02 + wd * 9 * S, (120 + wd * 30) * S, '#0d4a52', wd); weed(Wd * 0.98 - wd * 10 * S, (100 + wd * 28) * S, '#0d4a52', wd + 2); }
      n.fillStyle = '#0d3f5c'; n.beginPath(); n.ellipse(Wd * 0.1, H - 6 * S, 60 * S, 26 * S, 0, Math.PI, 0); n.ellipse(Wd * 0.92, H - 4 * S, 70 * S, 30 * S, 0, Math.PI, 0); n.fill();
      [[0.3, '#f6b8a8'], [0.55, '#fff0d8'], [0.75, '#f2c48a']].forEach(function (sh) { var x = Wd * sh[0], y = H - 14 * S; n.fillStyle = sh[1]; n.beginPath(); n.moveTo(x, y + 6 * S); n.arc(x, y + 6 * S, 9 * S, Math.PI * 1.1, Math.PI * 1.9); n.closePath(); n.fill(); });
    } else { // ---------------- Lantern Night ----------------
      g.fillStyle = vgrad(g, 0, horizon, ['#070b2e', '#141c55', '#2b2a72', '#4f3d8a']); g.fillRect(0, 0, Wd, H);
      stars(g, 220, horizon * 0.95, 5);
      var mx2 = Wd * (w > h ? 0.6 : 0.78), my2 = Math.max(horizon * 0.26, 96 * dpr);
      glow(g, mx2, my2, 200 * S, '#fff2c0', 0.35);
      g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(mx2, my2, 26 * S, 0, 6.283); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(mx2 + 11 * S, my2 - 6 * S, 23 * S, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
      glow(g, Wd * 0.5, horizon, 380 * S, '#8a6ad8', 0.4);
      // a far city of domes and towers (scenery)
      var rT = rng(91), bl2 = horizon + 4 * S; f.fillStyle = '#25235f';
      f.fillRect(0, bl2 - 10 * S, Wd, H - bl2 + 10 * S);
      for (var bi = 0; bi < 26; bi++) { var bx2 = rT() * Wd, bw = (16 + rT() * 30) * S, bh = (14 + rT() * 34) * S; f.fillRect(bx2, bl2 - bh, bw, bh);
        if (rT() < 0.4) { f.beginPath(); f.arc(bx2 + bw / 2, bl2 - bh, bw * 0.42, Math.PI, 0); f.fill(); }
        if (rT() < 0.18) { f.fillRect(bx2 + bw * 0.4, bl2 - bh - 46 * S, 5 * S, 46 * S); f.beginPath(); f.arc(bx2 + bw * 0.4 + 2.5 * S, bl2 - bh - 46 * S, 4 * S, Math.PI, 0); f.fill(); } }
      f.fillStyle = 'rgba(255,214,140,.7)'; for (var wn = 0; wn < 70; wn++) f.fillRect(rT() * Wd, bl2 - rT() * 40 * S, 2 * S, 2.6 * S);
      haze(f, horizon - 100 * S, H, '#5a4aa0', 0.4);
      // arcade and lantern strings
      var atop = horizon + 10 * S, aw2 = 110 * S;
      md.fillStyle = '#17164a'; md.fillRect(0, atop - 16 * S, Wd, 16 * S);
      for (var ax2 = -aw2 * 0.4; ax2 < Wd + aw2; ax2 += aw2) { md.fillRect(ax2, atop, aw2 * 0.16, H - atop); md.beginPath(); md.moveTo(ax2 + aw2 * 0.16, atop); md.lineTo(ax2 + aw2, atop); md.lineTo(ax2 + aw2, atop + aw2 * 0.3); md.quadraticCurveTo(ax2 + aw2, atop + aw2 * 0.06, ax2 + aw2 * 0.58, atop + aw2 * 0.02); md.quadraticCurveTo(ax2 + aw2 * 0.16, atop + aw2 * 0.06, ax2 + aw2 * 0.16, atop + aw2 * 0.3); md.closePath(); md.fill(); }
      function lanterns(ctx, y0, sag, seed) {
        var r = rng(seed); ctx.strokeStyle = 'rgba(20,14,40,.95)'; ctx.lineWidth = 1.4 * S; ctx.beginPath(); ctx.moveTo(0, y0); ctx.quadraticCurveTo(Wd / 2, y0 + sag * 2, Wd, y0); ctx.stroke();
        var cnt = Math.max(5, Math.round(Wd / (74 * S)));
        for (var i = 1; i < cnt; i++) {
          var tt = i / cnt, x = tt * Wd, y = y0 + sag * 4 * tt * (1 - tt) + 2 * S, s = (0.8 + r() * 0.45) * S, col = ['#ffcf6a', '#ff9f7a', '#ffe08a', '#ffb3c6'][i % 4];
          glow(ctx, x, y + 15 * s, 40 * s, col, 0.5);
          ctx.strokeStyle = 'rgba(20,14,40,.95)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5 * s); ctx.stroke();
          ctx.fillStyle = '#2a1d4a'; ctx.beginPath(); ctx.moveTo(x - 6 * s, y + 8 * s); ctx.quadraticCurveTo(x, y + 1 * s, x + 6 * s, y + 8 * s); ctx.fill();
          var lg2 = ctx.createLinearGradient(0, y + 8 * s, 0, y + 23 * s); lg2.addColorStop(0, '#fff6c8'); lg2.addColorStop(1, col);
          ctx.fillStyle = lg2; ctx.beginPath(); ctx.moveTo(x - 6 * s, y + 8 * s); ctx.lineTo(x + 6 * s, y + 8 * s); ctx.lineTo(x + 7.5 * s, y + 15 * s); ctx.lineTo(x + 5 * s, y + 22 * s); ctx.lineTo(x - 5 * s, y + 22 * s); ctx.lineTo(x - 7.5 * s, y + 15 * s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(42,29,74,.55)'; ctx.fillRect(x - 0.6 * s, y + 8 * s, 1.2 * s, 14 * s);
          ctx.fillStyle = '#2a1d4a'; ctx.fillRect(x - 4 * s, y + 22 * s, 8 * s, 3 * s);
        }
      }
      lanterns(md, H * 0.05, 30 * S, 44); lanterns(md, H * 0.15, 20 * S, 45);
      var nb2 = rng(97), base2 = H - 36 * S;
      for (var b2 = 0; b2 < 14; b2++) { var bx3 = nb2() * Wd, br3 = (22 + nb2() * 32) * S; n.fillStyle = '#0b0b28'; n.beginPath(); n.arc(bx3, base2, br3, 0, 6.283); n.fill(); }
      n.fillStyle = '#0b0b28'; n.fillRect(0, base2, Wd, H - base2);
      [0.12, 0.88].forEach(function (px) { var lx = Wd * px, ly = H - 22 * S; glow(n, lx, ly - 12 * S, 70 * S, '#ffcf6a', 0.55);
        n.fillStyle = '#ffe9a8'; n.beginPath(); n.moveTo(lx - 8 * S, ly - 22 * S); n.lineTo(lx + 8 * S, ly - 22 * S); n.lineTo(lx + 10 * S, ly - 10 * S); n.lineTo(lx + 7 * S, ly); n.lineTo(lx - 7 * S, ly); n.lineTo(lx - 10 * S, ly - 10 * S); n.closePath(); n.fill();
        n.fillStyle = '#1a1438'; n.beginPath(); n.moveTo(lx - 9 * S, ly - 22 * S); n.quadraticCurveTo(lx, ly - 32 * S, lx + 9 * S, ly - 22 * S); n.fill(); n.fillRect(lx - 8 * S, ly, 16 * S, 4 * S); });
    }
    return { sky: sky, far: far, mid: mid, near: near, margin: m };
  };

  // ---------- card backs: one geometric pattern per world ----------
  var BACK = [
    { base: ['#c25f35', '#8c3a20'], line: '#f3c766', frame: '#fbe3a8' },
    { base: ['#23795a', '#134733'], line: '#ecc76a', frame: '#f6e6b0' },
    { base: ['#167a98', '#0b4a66'], line: '#a8ecf0', frame: '#e2fbff' },
    { base: ['#2d3484', '#161a4a'], line: '#f2c45a', frame: '#ffe7a6' }
  ];
  function patternBack(g, wi, w, h) {
    var B = BACK[wi], s = Math.min(w, h) / 3.2, R = rng(5 + wi);
    g.lineJoin = 'round';
    if (wi === 0) { // eight-point stars and crosses (khatam)
      for (var y = -s; y < h + s; y += s) for (var x = -s; x < w + s; x += s) {
        star8(g, x, y, s * 0.46, 0.7, Math.PI / 8); g.fillStyle = '#f2d39a'; g.fill(); g.lineWidth = s * 0.05; g.strokeStyle = B.line; g.stroke();
        star8(g, x, y, s * 0.24, 0.66, Math.PI / 8); g.fillStyle = '#b4532f'; g.fill();
        g.beginPath(); g.moveTo(x + s / 2, y + s * 0.2); g.lineTo(x + s * 0.8, y + s / 2); g.lineTo(x + s / 2, y + s * 0.8); g.lineTo(x + s * 0.2, y + s / 2); g.closePath(); g.fillStyle = 'rgba(255,214,140,.32)'; g.fill();
      }
    } else if (wi === 1) { // an ogee lattice with small eight-petal flowers
      var sx = s * 0.9, sy = s * 1.15;
      g.strokeStyle = B.line; g.lineWidth = s * 0.06;
      for (var yy = -sy; yy < h + sy; yy += sy) for (var xx = -sx; xx < w + sx * 2; xx += sx) {
        var ox = (Math.round(yy / sy) % 2) * sx / 2 + xx;
        g.beginPath(); g.moveTo(ox, yy); g.bezierCurveTo(ox + sx * 0.5, yy + sy * 0.15, ox + sx * 0.0, yy + sy * 0.35, ox + sx * 0.5, yy + sy * 0.5);
        g.bezierCurveTo(ox + sx * 1.0, yy + sy * 0.65, ox + sx * 0.5, yy + sy * 0.85, ox + sx, yy + sy); g.stroke();
        g.beginPath(); g.moveTo(ox + sx, yy); g.bezierCurveTo(ox + sx * 0.5, yy + sy * 0.15, ox + sx * 1.0, yy + sy * 0.35, ox + sx * 0.5, yy + sy * 0.5);
        g.bezierCurveTo(ox, yy + sy * 0.65, ox + sx * 0.5, yy + sy * 0.85, ox, yy + sy); g.stroke();
        for (var p = 0; p < 8; p++) { var a = p * Math.PI / 4; g.fillStyle = p % 2 ? '#f8e8bf' : '#ffd36b'; g.beginPath(); g.ellipse(ox + Math.cos(a) * s * 0.09, yy + Math.sin(a) * s * 0.09, s * 0.09, s * 0.045, a, 0, 6.283); g.fill(); }
        g.fillStyle = '#c0412f'; g.beginPath(); g.arc(ox, yy, s * 0.045, 0, 6.283); g.fill();
        g.fillStyle = 'rgba(160,230,170,.35)'; g.beginPath(); g.ellipse(ox + sx * 0.5, yy + sy * 0.5, s * 0.06, s * 0.16, 0, 0, 6.283); g.fill();
      }
    } else if (wi === 2) { // overlapping circles (waves and scales)
      g.strokeStyle = rgba(B.line, 0.75); g.lineWidth = s * 0.045;
      var r = s * 0.5;
      for (var y2 = -s; y2 < h + s; y2 += r) for (var x2 = -s; x2 < w + s; x2 += r) { g.beginPath(); g.arc(x2, y2, r, 0, 6.283); g.stroke(); }
      g.fillStyle = 'rgba(220,255,255,.55)';
      for (var y3 = -s; y3 < h + s; y3 += r) for (var x3 = -s; x3 < w + s; x3 += r) { g.beginPath(); g.arc(x3 + r / 2, y3 + r / 2, s * 0.05, 0, 6.283); g.fill(); }
    } else { // a field of small stars
      for (var i = 0; i < 70; i++) { var x4 = R() * w, y4 = R() * h, rr2 = (0.012 + R() * 0.025) * w; star8(g, x4, y4, rr2, 0.45); g.fillStyle = rgba('#ffe7a6', 0.35 + R() * 0.5); g.fill(); }
      g.strokeStyle = rgba(B.line, 0.35); g.lineWidth = s * 0.03;
      for (var k = 0; k < 4; k++) { var cxk = k % 2 ? w : 0, cyk = k > 1 ? h : 0; for (var ring = 1; ring < 4; ring++) { g.beginPath(); g.arc(cxk, cyk, s * 0.42 * ring, 0, 6.283); g.stroke(); } }
    }
  }
  function medallion(g, wi, x, y, r) {
    var B = BACK[wi];
    g.save();
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = r * 0.3; g.shadowOffsetY = r * 0.06;
    g.fillStyle = B.base[0]; g.beginPath(); g.arc(x, y, r * 1.12, 0, 6.283); g.fill();
    g.restore();
    g.lineWidth = r * 0.07; g.strokeStyle = B.frame; g.beginPath(); g.arc(x, y, r * 1.08, 0, 6.283); g.stroke();
    g.lineWidth = r * 0.03; g.strokeStyle = rgba(B.line, 0.8); g.beginPath(); g.arc(x, y, r * 0.98, 0, 6.283); g.stroke();
    var n = [8, 8, 10, 16][wi];
    starN(g, x, y, r, [0.72, 0.78, 0.74, 0.8][wi], n, 0); var gg = g.createLinearGradient(x, y - r, x, y + r); gg.addColorStop(0, shade(B.line, 0.35)); gg.addColorStop(1, shade(B.line, -0.18));
    g.fillStyle = gg; g.fill();
    starN(g, x, y, r * 0.66, 0.7, n, Math.PI / n); g.fillStyle = B.base[0]; g.fill();
    starN(g, x, y, r * 0.42, 0.6, 8, Math.PI / 8); g.fillStyle = B.frame; g.fill();
    g.beginPath(); g.arc(x, y, r * 0.14, 0, 6.283); g.fillStyle = B.base[1]; g.fill();
  }
  A.cardBack = function (wi, w, h) {
    var c = canvas(w, h), g = c.getContext('2d'), B = BACK[wi], rad = Math.min(w, h) * 0.12, u = Math.min(w, h);
    rr(g, 0, 0, w, h, rad); g.save(); g.clip();
    var bg = g.createLinearGradient(0, 0, w * 0.3, h); bg.addColorStop(0, B.base[0]); bg.addColorStop(1, B.base[1]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var ins = u * 0.075;
    g.save(); rr(g, ins, ins, w - ins * 2, h - ins * 2, rad * 0.6); g.clip(); g.globalAlpha = 0.62; patternBack(g, wi, w, h); g.globalAlpha = 1;
    var vg = g.createRadialGradient(w / 2, h / 2, u * 0.1, w / 2, h / 2, Math.max(w, h) * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.restore();
    g.lineWidth = u * 0.022; g.strokeStyle = B.frame; rr(g, ins, ins, w - ins * 2, h - ins * 2, rad * 0.6); g.stroke();
    medallion(g, wi, w / 2, h / 2, u * 0.23);
    var sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(0.35, 'rgba(255,255,255,.04)'); sh.addColorStop(0.36, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.1; g.fillStyle = g.createPattern(M.grain(), 'repeat'); g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    g.restore();
    g.lineWidth = Math.max(1, u * 0.012); g.strokeStyle = 'rgba(255,240,210,.55)'; rr(g, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, rad); g.stroke();
    return c;
  };

  // ---------- card faces: cream paper, a coloured disc and corner stars (the animal is drawn on top) ----------
  A.cardFace = function (a, w, h, matched) {
    var c = canvas(w, h), g = c.getContext('2d'), rad = Math.min(w, h) * 0.12, u = Math.min(w, h);
    rr(g, 0, 0, w, h, rad); g.save(); g.clip();
    var bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, '#f3e3c6'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2 + h * 0.02, dr = Math.min(w * 0.46, h * 0.44);
    var dg = g.createRadialGradient(cx, cy - dr * 0.3, dr * 0.1, cx, cy, dr); dg.addColorStop(0, shade(a.bg, 0.35)); dg.addColorStop(1, a.bg);
    g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, dr, 0, 6.283); g.fill();
    g.strokeStyle = rgba(shade(a.bg, -0.25), 0.5); g.lineWidth = u * 0.012; g.setLineDash([u * 0.025, u * 0.02]); g.beginPath(); g.arc(cx, cy, dr * 0.94, 0, 6.283); g.stroke(); g.setLineDash([]);
    var ins = u * 0.06;
    g.lineWidth = u * 0.014; g.strokeStyle = matched ? '#e9b44c' : 'rgba(200,150,80,.55)'; rr(g, ins, ins, w - ins * 2, h - ins * 2, rad * 0.6); g.stroke();
    [[ins * 1.9, ins * 1.9], [w - ins * 1.9, ins * 1.9], [ins * 1.9, h - ins * 1.9], [w - ins * 1.9, h - ins * 1.9]].forEach(function (p) { star8(g, p[0], p[1], u * 0.035, 0.55); g.fillStyle = matched ? '#e9b44c' : 'rgba(205,150,80,.6)'; g.fill(); });
    g.globalAlpha = 0.12; g.fillStyle = g.createPattern(M.grain(), 'repeat'); g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    g.restore();
    g.lineWidth = Math.max(1.5, u * (matched ? 0.03 : 0.012)); g.strokeStyle = matched ? '#f6c453' : 'rgba(150,100,50,.35)'; rr(g, g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth, rad); g.stroke();
    return c;
  };
  // where the animal sits on a face, as a square (x, y, size) in card px
  A.animalBox = function (w, h) { var s = Math.min(w * 0.99, h * 0.9); return { x: (w - s) / 2, y: (h - s) / 2 + h * 0.02, s: s }; };

  // soft card shadow (drawn under every card, scaled), and the gold glow behind a matched pair
  A.shadow = function (w, h) {
    var p = Math.round(Math.min(w, h) * 0.18), c = canvas(w + p * 2, h + p * 2), g = c.getContext('2d');
    g.shadowColor = 'rgba(10,5,25,.55)'; g.shadowBlur = p * 0.7; g.fillStyle = '#000';
    g.translate(-10000, 0); g.shadowOffsetX = 10000; rr(g, p, p, w, h, Math.min(w, h) * 0.12); g.fill();
    c.pad = p; return c;
  };
  A.glow = function (s) {
    var c = canvas(s, s), g = c.getContext('2d'), q = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    q.addColorStop(0, 'rgba(255,226,140,.85)'); q.addColorStop(0.45, 'rgba(255,200,90,.35)'); q.addColorStop(1, 'rgba(255,190,80,0)');
    g.fillStyle = q; g.fillRect(0, 0, s, s); return c;
  };
  A.goldStar = function (g, x, y, r, filled) {
    star8(g, x, y, r, 0.62);
    if (filled) { var gr = g.createLinearGradient(x, y - r, x, y + r); gr.addColorStop(0, '#fff1a8'); gr.addColorStop(0.5, '#f6c453'); gr.addColorStop(1, '#e08a2a'); g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1, r * 0.14); g.strokeStyle = '#7a4a12'; g.stroke(); }
    else { g.fillStyle = 'rgba(10,6,30,.35)'; g.fill(); g.lineWidth = Math.max(1, r * 0.12); g.strokeStyle = 'rgba(255,240,200,.7)'; g.stroke(); }
  };
})();
