/* Sharp Eyes: the paint box. The look is the old game's, kept: three worlds (a sunny oasis, a lantern garden at night,
   a harbour at sunset), soft tiles the pictures sit on, gold eight-point stars, round dark interface plates.
   Everything is painted ONCE into the engine's canvas textures, never per frame. What is the same on every screen is painted
   through Kit.play.tex at a fixed size and baked into optimized AVIF files by tools/bake-art.js (art/baked, loaded by
   Kit.play.art in Boot), so a phone downloads and decodes pictures instead of painting them:
   - a world's four layers (sky, far, mid, near) composited into one picture of the design-space band (2920 x 1080 units,
     half a texture pixel per unit; the old game blitted four layers every frame and drifted them);
   - the interface sheet: icons, stars, hearts, beads, plates, the three sky gradients and three grid glows, as frames;
   Painted live, because it follows the screen's shape: the round's atlas (the tiles, the two pictures of the round and a ring,
   a 3 x 2 grid of frames, so a whole grid draws in one batch). The tile size comes from the grid that fits this screen and
   the things are the ones just chosen (a thousand variants cannot be baked), so it is a small paint, made ahead of time.
   The items themselves (the things in the tiles) are drawn by items.js, which also measures every difference. */
(function () {
  'use strict';
  var A = window.SpotArt = {};
  var shade = window.SpotItems.shade, mix = window.SpotItems.mix;

  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function rgba(c, a) { c = c.replace('#', ''); return 'rgba(' + parseInt(c.substr(0, 2), 16) + ',' + parseInt(c.substr(2, 2), 16) + ',' + parseInt(c.substr(4, 2), 16) + ',' + a + ')'; }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function star8(g, x, y, r, inner, rot) {
    g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2 + (rot || 0), q = i % 2 ? r * (inner || 0.62) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  A.star8 = star8; A.rr = rr; A.rgba = rgba;

  A.WORLDS = [
    { name: 'Oasis Morning', color: '#ffb547', dark: false,
      sky: ['#4fb3e6', '#8fd2ef', '#cfeeea', '#ffe2b0'], far: '#f3cf9a', mid: '#e6ae6c', near: '#a8673a',
      plate: ['#fff8ea', '#ffd9a8'], plateA: 0.82, rim: '#ffffff', focus: 'rgba(255,236,200,.3)', ink: '#5a3418' },
    { name: 'Lantern Garden', color: '#8fd3ff', dark: true,
      sky: ['#070b2e', '#141c55', '#2b2a72', '#4b3a86'], far: '#20235e', mid: '#151744', near: '#0a0b26',
      plate: ['#2c3480', '#1a1f58'], plateA: 0.72, rim: '#f6c453', focus: 'rgba(10,12,40,.38)', ink: '#fff6df' },
    { name: 'Harbour Sunset', color: '#ff8f6b', dark: true,
      sky: ['#2a2a6e', '#7b3f84', '#d1607a', '#f79d65', '#ffd59a'], far: '#7a4a7c', mid: '#4a2c5c', near: '#24142e',
      plate: ['#5a3270', '#341c4a'], plateA: 0.7, rim: '#ffcf8a', focus: 'rgba(30,10,40,.32)', ink: '#fff2e6' }
  ];

  // ---------- backgrounds: { sky, far, mid, near } canvases, w x h px, S = px per drawing unit ----------
  function paintLayers(wi, w, h, S) {
    var W = A.WORLDS[wi], cw = Math.round(w), ch = Math.round(h);
    function layer() { var c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; }
    var sky = layer(), far = layer(), mid = layer(), near = layer();
    var H = ch, Wd = cw;
    var horizon = H * 0.68;
    var R = rng(500 + wi * 91);
    var g = sky.getContext('2d'), f = far.getContext('2d'), md = mid.getContext('2d'), n = near.getContext('2d');

    var gr = g.createLinearGradient(0, 0, 0, horizon);
    W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
    g.fillStyle = W.sky[W.sky.length - 1]; g.fillRect(0, horizon, Wd, H - horizon);

    function glow(ctx, x, y, r, col, a) { var q = ctx.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, rgba(col, a)); q.addColorStop(1, rgba(col, 0)); ctx.fillStyle = q; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    function cloud(ctx, x, y, s, a) {
      ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.beginPath();
      [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [-0.4, -0.35, 0.7], [0.45, -0.3, 0.65]].forEach(function (c) { ctx.moveTo(x + c[0] * s + c[2] * s, y + c[1] * s); ctx.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, 6.283); });
      ctx.moveTo(x + 1.6 * s, y + 0.45 * s); ctx.ellipse(x, y + 0.45 * s, 1.6 * s, 0.5 * s, 0, 0, 6.283); ctx.fill();
    }
    function hills(ctx, base, amp, color, seed, step) {
      var r = rng(seed), ph = r() * 6, f1 = 0.003 + r() * 0.002, f2 = 0.008 + r() * 0.004;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= Wd + 8; x += (step || 6) * S) ctx.lineTo(x, base - Math.sin(x / S * f1 + ph) * amp - Math.sin(x / S * f2 + ph * 2) * amp * 0.35);
      ctx.lineTo(Wd, H); ctx.closePath(); ctx.fill();
    }
    function palm(ctx, x, base, hgt, col, lean) {
      ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
      var tx = x + hgt * (lean || 0.12), ty = base - hgt;
      ctx.lineWidth = hgt * 0.055; ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + hgt * 0.02, base - hgt * 0.55, tx, ty); ctx.stroke();
      for (var i = 0; i < 8; i++) {
        var a = -Math.PI / 2 + (i - 3.5) * 0.46, L = hgt * (0.45 + (i % 2) * 0.1);
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - hgt * 0.1, tx + Math.cos(a) * L, ty + Math.sin(a) * L + hgt * 0.2);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.45, ty + Math.sin(a) * L * 0.45, tx, ty); ctx.fill();
      }
      ctx.restore();
    }
    function tent(ctx, x, base, s, col, stripe) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 60 * s, base); ctx.quadraticCurveTo(x - 40 * s, base - 30 * s, x - 20 * s, base - 42 * s);
      ctx.lineTo(x + 24 * s, base - 40 * s); ctx.quadraticCurveTo(x + 44 * s, base - 28 * s, x + 64 * s, base); ctx.closePath(); ctx.fill();
      if (stripe) { ctx.fillStyle = stripe; for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 22 * s, base); ctx.lineTo(x + k * 9 * s - 3 * s, base - 41 * s); ctx.lineTo(x + k * 9 * s + 3 * s, base - 41 * s); ctx.lineTo(x + k * 22 * s + 7 * s, base); ctx.fill(); } }
      ctx.fillStyle = 'rgba(60,25,10,.55)'; ctx.beginPath(); ctx.moveTo(x - 8 * s, base); ctx.lineTo(x, base - 24 * s); ctx.lineTo(x + 8 * s, base); ctx.fill();
    }
    function arches(ctx, base, color, top, aw) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.rect(0, top - 16 * S, Wd, 18 * S); ctx.fill();
      for (var x = -aw * 0.3; x < Wd + aw; x += aw) {
        var cw2 = aw * 0.16; ctx.beginPath(); ctx.rect(x, top, cw2, base - top);
        ctx.moveTo(x + cw2, top); ctx.lineTo(x + aw, top); ctx.lineTo(x + aw, top + aw * 0.28);
        ctx.quadraticCurveTo(x + aw, top + aw * 0.06, x + cw2 + (aw - cw2) / 2, top + aw * 0.02); ctx.quadraticCurveTo(x + cw2, top + aw * 0.06, x + cw2, top + aw * 0.28); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,220,150,.16)'; star8(ctx, x + aw * 0.58, top - 7 * S, 4.5 * S); ctx.fill(); ctx.fillStyle = color;
      }
    }
    function lanternString(ctx, y0, sag, seed, color) {
      var r = rng(seed); ctx.strokeStyle = 'rgba(30,20,50,.9)'; ctx.lineWidth = 1.4 * S; ctx.beginPath();
      ctx.moveTo(0, y0); ctx.quadraticCurveTo(Wd / 2, y0 + sag * 2, Wd, y0); ctx.stroke();
      var cnt = Math.max(5, Math.round(Wd / (70 * S)));
      for (var i = 1; i < cnt; i++) {
        var t = i / cnt, x = t * Wd, y = y0 + sag * 2 * 2 * t * (1 - t) + 2 * S, s = (0.75 + r() * 0.4) * S, col = ['#ffcf6a', '#ff8fa3', '#8fe0ff', '#c3a6ff'][i % 4];
        glow(ctx, x, y + 14 * s, 34 * s, col, 0.45);
        ctx.strokeStyle = 'rgba(30,20,50,.9)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 4 * s); ctx.stroke();
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - 6 * s, y + 7 * s); ctx.quadraticCurveTo(x, y + 1 * s, x + 6 * s, y + 7 * s); ctx.fill();
        var lg = ctx.createLinearGradient(0, y + 7 * s, 0, y + 22 * s); lg.addColorStop(0, '#fff6c8'); lg.addColorStop(1, col);
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x - 6 * s, y + 7 * s); ctx.lineTo(x + 6 * s, y + 7 * s); ctx.lineTo(x + 7.5 * s, y + 14 * s); ctx.lineTo(x + 5 * s, y + 21 * s); ctx.lineTo(x - 5 * s, y + 21 * s); ctx.lineTo(x - 7.5 * s, y + 14 * s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = color; ctx.fillRect(x - 4 * s, y + 21 * s, 8 * s, 3 * s);
      }
    }
    function haze(ctx, top, color, a) { var hz = ctx.createLinearGradient(0, top, 0, H); hz.addColorStop(0, rgba(color, 0)); hz.addColorStop(1, rgba(color, a)); ctx.fillStyle = hz; ctx.fillRect(0, top, Wd, H - top); }
    function dhow(ctx, x, base, s, col, sail) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 50 * s, base - 14 * s); ctx.lineTo(x + 56 * s, base - 18 * s); ctx.quadraticCurveTo(x + 40 * s, base, x + 26 * s, base); ctx.lineTo(x - 30 * s, base); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 1.5 * s, base - 90 * s, 3 * s, 76 * s);
      ctx.fillStyle = sail; ctx.beginPath(); ctx.moveTo(x + 2 * s, base - 92 * s); ctx.quadraticCurveTo(x + 40 * s, base - 50 * s, x + 46 * s, base - 22 * s); ctx.lineTo(x - 34 * s, base - 22 * s); ctx.quadraticCurveTo(x - 10 * s, base - 50 * s, x + 2 * s, base - 92 * s); ctx.fill();
    }

    if (wi === 0) {
      var sx = Wd * 0.8, sy = horizon * 0.2;
      glow(g, sx, sy, 260 * S, '#fff3c4', 0.75);
      g.fillStyle = '#fff8dc'; g.beginPath(); g.arc(sx, sy, 34 * S, 0, 6.283); g.fill();
      for (var c = 0; c < 6; c++) cloud(g, R() * Wd, (0.1 + R() * 0.45) * horizon, (16 + R() * 18) * S, 0.5 + R() * 0.3);
      hills(f, horizon - 18 * S, 22 * S, W.far, 11); haze(f, horizon - 60 * S, '#fff1d6', 0.5);
      // oasis pool, palms and tents in the middle distance
      hills(md, horizon + 20 * S, 12 * S, W.mid, 21);
      var px = Wd * 0.3, py = horizon + 30 * S;
      md.fillStyle = '#5fc2d6'; md.beginPath(); md.ellipse(px, py, 120 * S, 16 * S, 0, 0, 6.283); md.fill();
      md.fillStyle = 'rgba(255,255,255,.5)'; for (var l = 0; l < 6; l++) md.fillRect(px - 80 * S + R() * 140 * S, py - 6 * S + R() * 12 * S, (12 + R() * 20) * S, 1.6 * S);
      [[px - 110 * S, 90], [px - 70 * S, 120], [px + 90 * S, 100], [px + 130 * S, 76]].forEach(function (p, i) { palm(md, p[0], py - 4 * S, p[1] * S, '#3f8f4c', i % 2 ? -0.12 : 0.14); });
      tent(md, Wd * 0.72, horizon + 26 * S, S, '#fbe9cf', '#e0745a');
      tent(md, Wd * 0.88, horizon + 22 * S, 0.75 * S, '#f3dcbd', '#5a8fd0');
      haze(md, horizon - 40 * S, '#ffe9c8', 0.25);
      hills(n, H - 54 * S, 28 * S, W.near, 31);
      hills(n, H - 26 * S, 14 * S, shade(W.near, -0.15), 32);
      palm(n, Wd * 0.04, H - 30 * S, 210 * S, '#2f6e3c', 0.18); palm(n, Wd * 0.97, H - 20 * S, 250 * S, '#2f6e3c', -0.16);
    } else if (wi === 1) {
      for (var i = 0; i < 160; i++) { var yy = R() * horizon * 0.95; g.globalAlpha = 0.2 + R() * 0.7 * (1 - yy / horizon); g.fillStyle = '#fff'; g.beginPath(); g.arc(R() * Wd, yy, (R() * 1.2 + 0.3) * S, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      glow(g, Wd * 0.5, horizon, 360 * S, '#7a5cc8', 0.4);
      hills(f, horizon - 10 * S, 18 * S, W.far, 41);
      // cypress row
      var rC = rng(42); f.fillStyle = shade(W.far, -0.15);
      for (var t = 0; t < 14; t++) { var cx = (t / 13) * Wd + (rC() - 0.5) * 40 * S, ch2 = (80 + rC() * 60) * S; f.beginPath(); f.ellipse(cx, horizon - ch2 * 0.45, ch2 * 0.11, ch2 * 0.5, 0, 0, 6.283); f.fill(); }
      haze(f, horizon - 120 * S, '#5a4aa0', 0.35);
      arches(md, H, W.mid, horizon - 40 * S, 96 * S);
      lanternString(md, H * 0.06, 26 * S, 44, '#2a1d4a');
      lanternString(md, H * 0.16, 18 * S, 45, '#2a1d4a');
      hills(n, H - 40 * S, 18 * S, W.near, 51);
      var rF = rng(52);
      for (var b = 0; b < 12; b++) { var bx = rF() * Wd, br = (20 + rF() * 30) * S; n.fillStyle = W.near; n.beginPath(); n.arc(bx, H - 30 * S, br, 0, 6.283); n.fill(); }
      for (var fl = 0; fl < 40; fl++) { n.fillStyle = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff'][fl % 4]; n.globalAlpha = 0.75; n.beginPath(); n.arc(rF() * Wd, H - (8 + rF() * 46) * S, (1.6 + rF() * 2.2) * S, 0, 6.283); n.fill(); }
      n.globalAlpha = 1;
    } else {
      var sx2 = Wd * 0.34, sy2 = horizon - 30 * S;
      glow(g, sx2, sy2, 320 * S, '#ffe0a0', 0.7);
      g.fillStyle = '#fff0c8'; g.beginPath(); g.arc(sx2, sy2, 40 * S, 0, 6.283); g.fill();
      for (var c2 = 0; c2 < 5; c2++) { g.fillStyle = 'rgba(255,190,170,' + (0.2 + R() * 0.2) + ')'; var cy2 = (0.2 + R() * 0.5) * horizon, cl = (60 + R() * 120) * S; g.beginPath(); g.ellipse(R() * Wd, cy2, cl, 5 * S, 0, 0, 6.283); g.fill(); }
      // the sea
      var sea = g.createLinearGradient(0, horizon, 0, H); sea.addColorStop(0, '#e98a74'); sea.addColorStop(0.3, '#7a4a86'); sea.addColorStop(1, '#2a1a48');
      g.fillStyle = sea; g.fillRect(0, horizon, Wd, H - horizon);
      for (var k = 0; k < 90; k++) { var ly = horizon + Math.pow(R(), 1.5) * (H - horizon), lw = (8 + R() * 40) * S * (1 + (ly - horizon) / H * 2), lx = sx2 + (R() - 0.5) * 300 * S;
        g.strokeStyle = 'rgba(255,225,170,' + (0.1 + R() * 0.35) * (1 - (ly - horizon) / (H - horizon)) + ')'; g.lineWidth = 1.6 * S; g.beginPath(); g.moveTo(lx - lw, ly); g.lineTo(lx + lw, ly); g.stroke(); }
      // far town on the shore (scenery only)
      var rT = rng(61), x0 = Wd * 0.55; f.fillStyle = W.far;
      f.beginPath(); f.rect(x0, horizon - 8 * S, Wd - x0, 8 * S);
      for (var q = 0; q < 16; q++) { var bw = (14 + rT() * 22) * S, bh = (10 + rT() * 30) * S, bx2 = x0 + q * (Wd - x0) / 16; f.rect(bx2, horizon - bh, bw, bh); }
      f.rect(x0 + (Wd - x0) * 0.6, horizon - 70 * S, 7 * S, 70 * S); f.fill();
      haze(f, horizon - 80 * S, '#f79d65', 0.35);
      dhow(md, Wd * 0.7, horizon + 26 * S, 0.8 * S, W.mid, 'rgba(255,230,200,.85)');
      dhow(md, Wd * 0.12, horizon + 14 * S, 0.5 * S, W.far, 'rgba(255,220,190,.7)');
      // pier in the foreground
      n.fillStyle = W.near; n.beginPath(); n.rect(0, H - 34 * S, Wd, 34 * S); n.fill();
      for (var pp = 0; pp < Wd; pp += 120 * S) { n.beginPath(); n.rect(pp + 8 * S, H - 74 * S, 12 * S, 74 * S); n.fill(); n.beginPath(); n.ellipse(pp + 14 * S, H - 74 * S, 8 * S, 3 * S, 0, 0, 6.283); n.fill(); }
      n.strokeStyle = W.near; n.lineWidth = 3 * S; n.beginPath();
      for (var p2 = 0; p2 < Wd; p2 += 120 * S) { n.moveTo(p2 + 14 * S, H - 62 * S); n.quadraticCurveTo(p2 + 74 * S, H - 40 * S, p2 + 134 * S, H - 62 * S); }
      n.stroke();
      n.fillStyle = 'rgba(255,200,140,.25)'; n.fillRect(0, H - 34 * S, Wd, 2 * S);
    }
    return [sky, far, mid, near];
  }
  // A world as one picture: the design-space band 2920 x 1080 units (x -500..2420), half a texture pixel per unit, fixed size so
  // it can be baked. Its sky fades out over the top fifth, over the ui sheet's sky gradient (the same colours, stretched), so
  // a taller screen (a tablet, a phone upright) gets a sky as tall as it needs, and the same picture where it is 16:9 or wider.
  A.worldTex = function (scene, wi) {
    var key = 'world-' + wi, w = 1460, h = 540;
    Kit.play.tex(scene, key, w, h, function (c) {
      var ls = paintLayers(wi, w, h, h / 450), sg = ls[0].getContext('2d'), f = sg.createLinearGradient(0, 0, 0, h * 0.22);
      sg.globalCompositeOperation = 'destination-out'; f.addColorStop(0, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = f; sg.fillRect(0, 0, w, h * 0.22);
      ls.forEach(function (l) { c.drawImage(l, 0, 0); });
    });
    return A.edges[key] = { key: key, horizon: 0.68 * 1080 };
  };
  A.edges = {};

  // ---------- one round's atlas: tiles, the two pictures, a ring (3 x 2 frames, one texture, one draw batch) ----------
  function drawPlate(g, W, px, state) {
    var r = px * 0.24;
    g.fillStyle = 'rgba(10,5,30,' + (W.dark ? 0.35 : 0.16) + ')'; rr(g, px * 0.02, px * 0.05, px, px, r); g.fill();
    var gr = g.createLinearGradient(0, 0, 0, px);
    var top = state === 'right' ? '#fff7c8' : state === 'wrong' ? '#ffc4cc' : W.plate[0], bot = state === 'right' ? '#ffd76a' : state === 'wrong' ? '#ff8a9b' : W.plate[1];
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    g.globalAlpha = state ? 0.92 : W.plateA; g.fillStyle = gr; rr(g, 0, 0, px, px, r); g.fill();
    g.globalAlpha = 1;
    g.save(); rr(g, 0, 0, px, px, r); g.clip();
    g.fillStyle = W.dark ? 'rgba(255,230,170,.06)' : 'rgba(255,190,110,.12)';
    star8(g, px / 2, px / 2, px * 0.46, 0.66); g.fill();
    var gl = g.createLinearGradient(0, 0, 0, px * 0.45); gl.addColorStop(0, 'rgba(255,255,255,' + (W.dark ? 0.16 : 0.5) + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(0, 0, px, px * 0.45);
    g.restore();
    g.lineWidth = Math.max(1, px * 0.022); g.strokeStyle = rgba(W.rim, W.dark ? 0.45 : 0.9);
    rr(g, g.lineWidth / 2, g.lineWidth / 2, px - g.lineWidth, px - g.lineWidth, r); g.stroke();
  }
  var FR = [['plate', 0, 0], ['right', 1, 0], ['wrong', 2, 0], ['ring', 0, 1], ['base', 1, 1], ['odd', 2, 1]];
  // px = the tile in texture pixels; pic(g, cx, cy, which) draws 'base' or 'odd' centred at (cx, cy). Returns the frame size F.
  A.cellAtlas = function (scene, key, wi, px, pic) {
    var W = A.WORLDS[wi], pad = Math.round(px * 0.1), F = px + pad * 2;
    var t = scene.textures.createCanvas(key, F * 3, F * 2), g = t.context;
    FR.forEach(function (f) {
      var ox = f[1] * F, oy = f[2] * F;
      t.add(f[0], 0, ox, oy, F, F);
      g.save(); g.translate(ox + pad, oy + pad);
      if (f[0] === 'ring') {
        var lw = Math.max(2, px * 0.05); g.lineWidth = lw; g.strokeStyle = '#ffffff'; g.shadowColor = 'rgba(255,214,107,.9)'; g.shadowBlur = px * 0.05;
        rr(g, lw / 2 - px * 0.02, lw / 2 - px * 0.02, px - lw + px * 0.04, px - lw + px * 0.04, px * 0.26); g.stroke();
      } else if (f[0] === 'base' || f[0] === 'odd') pic(g, px / 2, px / 2, f[0]);
      else drawPlate(g, W, px, f[0] === 'plate' ? null : f[0]);
      g.restore();
    });
    t.refresh();
    return F;
  };

  // ---------- the interface: one texture, many frames (design units: one pixel per unit) ----------
  function star(g, x, y, r, filled) {
    star8(g, x, y, r, 0.62);
    if (filled) {
      var gr = g.createLinearGradient(x, y - r, x, y + r); gr.addColorStop(0, '#fff1a8'); gr.addColorStop(0.5, '#f6c453'); gr.addColorStop(1, '#e08a2a');
      g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1.2, r * 0.14); g.strokeStyle = '#7a4a12'; g.lineJoin = 'round'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.35, r * 0.28, r * 0.14, -0.6, 0, 6.283); g.fill();
    } else {
      g.fillStyle = 'rgba(10,6,30,.45)'; g.fill(); g.lineWidth = Math.max(1.5, r * 0.1); g.strokeStyle = 'rgba(255,240,200,.75)'; g.lineJoin = 'round'; g.stroke();
    }
  }
  function heart(g, k, filled) {                                  // a heart in a 96 box
    g.save(); g.translate(48, 50); g.scale(k, k); g.translate(-12, -12.5);
    g.beginPath(); g.moveTo(12, 21); g.bezierCurveTo(2, 14, 2, 6.5, 7, 5); g.bezierCurveTo(9.5, 4.4, 11.3, 5.6, 12, 7.2); g.bezierCurveTo(12.7, 5.6, 14.5, 4.4, 17, 5); g.bezierCurveTo(22, 6.5, 22, 14, 12, 21); g.closePath();
    if (filled) {
      var gr = g.createLinearGradient(0, 4, 0, 21); gr.addColorStop(0, '#ff9aa8'); gr.addColorStop(1, '#e0405a');
      g.fillStyle = gr; g.fill(); g.lineWidth = 0.9; g.strokeStyle = '#7a1a30'; g.lineJoin = 'round'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(8, 8.6, 1.9, 1.1, -0.7, 0, 6.283); g.fill();
    } else { g.fillStyle = 'rgba(10,6,30,.45)'; g.fill(); g.lineWidth = 0.8; g.strokeStyle = 'rgba(255,240,230,.7)'; g.lineJoin = 'round'; g.stroke(); }
    g.restore();
  }
  A.ui = function (scene) {
    var icon = function (draw) { return function (c) { c.strokeStyle = '#fff6e0'; c.fillStyle = '#fff6e0'; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }; };
    var sky = function (c, wi) { var sk = A.WORLDS[wi].sky, g = c.createLinearGradient(0, 0, 0, 256); sk.forEach(function (col, i) { g.addColorStop(i / (sk.length - 1), col); }); c.fillStyle = g; c.fillRect(0, 0, 8, 256); };
    var focus = function (c, wi) { var g = c.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, A.WORLDS[wi].focus); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); };
    var spk = function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); };
    var L = [
      ['plate', 150, 150, function (c) { c.fillStyle = 'rgba(14,10,34,.78)'; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4; c.stroke(); }],
      ['pill', 340, 150, function (c) { c.fillStyle = 'rgba(14,10,34,.78)'; c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); c.stroke(); }],
      ['card', 240, 240, function (c) { c.fillStyle = 'rgba(14,10,34,.94)'; c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 4; c.beginPath(); c.roundRect(2, 2, 236, 236, 70); c.fill(); c.stroke(); }],
      ['big', 280, 280, function (c) { var g = c.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f2a93a'); c.fillStyle = g; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); }],
      ['lv', 140, 140, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.fill(); }],
      ['lvo', 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.stroke(); }],
      ['glow', 128, 128, function (c) { var g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }],
      ['px', 16, 16, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 16, 16); }, 4],
      ['bead', 40, 40, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(20, 20, 17, 0, 7); c.fill(); }],
      ['star-w', 64, 64, function (c) { star8(c, 32, 32, 30, 0.62); c.fillStyle = '#fff'; c.fill(); }],
      ['star-on', 96, 96, function (c) { star(c, 48, 50, 44, true); }],
      ['star-off', 96, 96, function (c) { star(c, 48, 50, 44, false); }],
      ['heart-on', 96, 96, function (c) { heart(c, 4, true); }],
      ['heart-off', 96, 96, function (c) { heart(c, 4, false); }],
      ['sky-0', 8, 256, function (c) { sky(c, 0); }, 2], ['sky-1', 8, 256, function (c) { sky(c, 1); }, 2], ['sky-2', 8, 256, function (c) { sky(c, 2); }, 2],
      ['focus-0', 256, 256, function (c) { focus(c, 0); }], ['focus-1', 256, 256, function (c) { focus(c, 1); }], ['focus-2', 256, 256, function (c) { focus(c, 2); }],
      ['ic-exit', 96, 96, function (c) { Kit.play.exitIcon(c, 96, '#fff6e0', 2.6); }],
      ['ic-retry', 96, 96, icon(function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); })],
      ['ic-grid', 96, 96, icon(function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); })],
      ['ic-snd', 96, 96, icon(function (c) { spk(c); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); })],
      ['ic-mute', 96, 96, icon(function (c) { spk(c); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); })],
      ['ic-pause', 96, 96, icon(function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); })],
      ['ic-close', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); })],
      ['ic-play', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); })],
      ['ic-next', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(5, 12); c.lineTo(18, 12); c.moveTo(13, 6); c.lineTo(19, 12); c.lineTo(13, 18); c.stroke(); })],
      ['ic-lock', 96, 96, icon(function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); })],
      ['ic-tick', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19, 7); c.stroke(); })]
    ];
    var x = 0, y = 0, rowH = 0, MW = 1024, GAP = 6, place = [];
    L.forEach(function (e) {
      if (x + e[1] > MW) { x = 0; y += rowH + GAP; rowH = 0; }
      place.push([e, x, y]); x += e[1] + GAP; rowH = Math.max(rowH, e[2]);
    });
    // painted once at this fixed size (and baked into art/baked by tools/bake-art.js); the frames are added either way.
    // A frame with an inset leaves its outer pixels out, so a picture stretched over the screen never blends into the gap.
    Kit.play.tex(scene, 'ui', MW, y + rowH, function (c) {
      place.forEach(function (p) { c.save(); c.translate(p[1], p[2]); c.beginPath(); c.rect(0, 0, p[0][1], p[0][2]); c.clip(); p[0][3](c, p[0][1], p[0][2]); c.restore(); });
    });
    var t = scene.textures.get('ui');
    place.forEach(function (p) { var e = p[0], k = e[4] || 0; if (!t.has(e[0])) t.add(e[0], 0, p[1] + k, p[2] + k, e[1] - 2 * k, e[2] - 2 * k); });
  };
})();