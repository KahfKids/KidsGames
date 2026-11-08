/* Mosaic Breaker: art.js
   All art is drawn in code (crisp at any size, no image downloads): layered world backgrounds,
   glazed zellige tiles, the flying carpet, the star ball, lantern power-ups and the palace pillars. */
(function () {
  'use strict';
  var A = window.MosaicArt = {};

  // ---------- helpers ----------
  function rng(seed) { // mulberry32: same scene every time for a given world
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')'; }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function star8(ctx, x, y, r, inner) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  A.star8 = star8; A.shade = shade; A.mix = mix; A.rr = rr;

  // ---------- worlds ----------
  A.WORLDS = [
    { name: 'Desert Night', color: '#f6c453', sky: ['#070b2b', '#1f1b57', '#5a2f73', '#c2607a', '#f3a56c'],
      far: '#3b2f6f', mid: '#251d52', near: '#110d2b', glow: '#ffcf7a', stone: '#c99a63', ink: '#fff6df',
      tiles: ['#22c3b0', '#3f6fe0', '#f2b33d', '#ee5d78', '#43bd7d'] },
    { name: 'Garden Dawn', color: '#ff8fa3', sky: ['#5b6fb8', '#9a8fd0', '#f0a6b8', '#ffc8a2', '#ffe3b0'],
      far: '#d9a2a8', mid: '#a5677f', near: '#4c2b4e', glow: '#fff1c9', stone: '#e8c9a6', ink: '#fffaf2',
      tiles: ['#3cc9a6', '#ff7b7b', '#5aa9ff', '#ffd23f', '#b48cff'] },
    { name: 'Sea Palace', color: '#56d6e8', sky: ['#04152e', '#0b3a63', '#15708a', '#e7a868', '#ffd59a'],
      far: '#1d5a74', mid: '#123f57', near: '#06202f', glow: '#ffd27a', stone: '#9fc7c9', ink: '#eafcff',
      tiles: ['#f4f1e8', '#2fd0d6', '#ff7a5c', '#f7c548', '#4a63d9'] }
  ];

  // Sky + far/mid/near silhouettes, each on its own canvas so they can drift for depth (parallax).
  // Returns { sky, far, mid, near, margin } canvases in device px.
  A.paintWorld = function (wi, w, h, dpr) {
    var W = A.WORLDS[wi], m = Math.round(28 * dpr), cw = Math.round(w * dpr) + m * 2, ch = Math.round(h * dpr);
    function layer() { var c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; }
    var sky = layer(), far = layer(), mid = layer(), near = layer();
    var S = dpr, H = ch, Wd = cw, horizon = H * (wi === 2 ? 0.6 : 0.66);
    var R = rng(1000 + wi * 77);

    // Sky
    var g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, horizon + 40 * S);
    W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
    // soft sun/moon glow near the horizon
    var gx = Wd * (wi === 1 ? 0.62 : 0.3), gy = horizon - (wi === 1 ? 40 : 160) * S;
    var halo = g.createRadialGradient(gx, gy, 0, gx, gy, 260 * S);
    halo.addColorStop(0, 'rgba(255,240,200,.55)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = halo; g.fillRect(0, 0, Wd, H);
    if (wi !== 1) { // stars
      for (var i = 0; i < 140; i++) { var sy = R() * horizon * 0.9; g.globalAlpha = 0.25 + R() * 0.7 * (1 - sy / horizon);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(R() * Wd, sy, (R() * 1.3 + 0.3) * S, 0, 6.283); g.fill(); }
      g.globalAlpha = 1;
      // crescent moon
      // crescent moon, cut on its own canvas so the sky behind it stays intact
      var mr = 30 * S, mc = document.createElement('canvas'); mc.width = mc.height = Math.ceil(mr * 2.4);
      var mg = mc.getContext('2d'), o = mc.width / 2;
      mg.fillStyle = '#fff4d6'; mg.beginPath(); mg.arc(o, o, mr, 0, 6.283); mg.fill();
      mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(o + mr * 0.45, o - mr * 0.2, mr * 0.88, 0, 6.283); mg.fill();
      g.drawImage(mc, gx - o, gy - 60 * S - o);
    } else { // sun and clouds at dawn
      g.fillStyle = 'rgba(255,246,214,.95)'; g.beginPath(); g.arc(gx, gy, 46 * S, 0, 6.283); g.fill();
      for (var c = 0; c < 7; c++) { var cx = R() * Wd, cy = (0.12 + R() * 0.35) * horizon, cs = (40 + R() * 70) * S;
        g.fillStyle = 'rgba(255,255,255,' + (0.18 + R() * 0.2) + ')';
        for (var k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + (k - 1.5) * cs * 0.55, cy + (k % 2) * cs * 0.12, cs * 0.6, cs * 0.28, 0, 0, 6.283); g.fill(); } }
    }
    if (wi === 2) { // sea below the horizon
      var sea = g.createLinearGradient(0, horizon, 0, H);
      sea.addColorStop(0, '#2a7f93'); sea.addColorStop(0.25, '#13506c'); sea.addColorStop(1, '#041a2c');
      g.fillStyle = sea; g.fillRect(0, horizon, Wd, H - horizon);
      for (var l = 0; l < 70; l++) { var ly = horizon + Math.pow(R(), 1.6) * (H - horizon), lw = (10 + R() * 50) * S * (1 + (ly - horizon) / H * 2);
        g.strokeStyle = 'rgba(255,220,160,' + (0.08 + R() * 0.25) * (1 - (ly - horizon) / (H - horizon)) + ')'; g.lineWidth = 1.5 * S;
        var lx = gx + (R() - 0.5) * 240 * S; g.beginPath(); g.moveTo(lx - lw, ly); g.lineTo(lx + lw, ly); g.stroke(); }
    }

    // Silhouette helpers (device px)
    function dunes(ctx, base, amp, color, seed) {
      var r = rng(seed); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      var ph = r() * 6, f1 = 0.002 + r() * 0.002, f2 = 0.005 + r() * 0.004;
      for (var x = 0; x <= Wd; x += 6 * S) ctx.lineTo(x, base - Math.sin(x / S * f1 + ph) * amp - Math.sin(x / S * f2 + ph * 2) * amp * 0.35);
      ctx.lineTo(Wd, H); ctx.closePath(); ctx.fill();
    }
    function onionDome(ctx, cx, base, r) {
      ctx.moveTo(cx - r, base);
      ctx.bezierCurveTo(cx - r * 1.25, base - r * 0.9, cx - r * 0.2, base - r * 1.3, cx, base - r * 1.75);
      ctx.bezierCurveTo(cx + r * 0.2, base - r * 1.3, cx + r * 1.25, base - r * 0.9, cx + r, base);
      ctx.closePath();
    }
    function minaret(ctx, cx, base, w2, h2) {
      ctx.rect(cx - w2 / 2, base - h2, w2, h2);
      ctx.rect(cx - w2 * 0.8, base - h2 * 0.72, w2 * 1.6, w2 * 0.35);
      onionDome(ctx, cx, base - h2, w2 * 0.62);
      ctx.rect(cx - 0.8 * S, base - h2 - w2 * 1.6, 1.6 * S, w2 * 0.6);
    }
    function city(ctx, base, scale, color, lights, seed) {
      var r = rng(seed), x = -40 * S;
      ctx.fillStyle = color;
      var wins = [];
      while (x < Wd + 40 * S) {
        var kind = r(), bw = (40 + r() * 70) * S * scale, bh = (30 + r() * 60) * S * scale;
        ctx.beginPath();
        if (kind < 0.18) { minaret(ctx, x + 10 * S * scale, base, 12 * S * scale, (120 + r() * 70) * S * scale); x += 26 * S * scale; ctx.fill(); continue; }
        ctx.rect(x, base - bh, bw, bh);
        if (kind < 0.6) { var dr = Math.min(bw * 0.38, 34 * S * scale); ctx.rect(x + bw / 2 - dr, base - bh - 6 * S * scale, dr * 2, 8 * S * scale); onionDome(ctx, x + bw / 2, base - bh - 4 * S * scale, dr); }
        else if (kind < 0.8) { ctx.moveTo(x, base - bh); ctx.arc(x + bw / 2, base - bh, bw / 2, Math.PI, 0); }
        ctx.fill();
        // arched windows
        var nw = Math.max(1, Math.floor(bw / (16 * S * scale)));
        for (var i = 0; i < nw; i++) if (r() < 0.75) wins.push([x + (i + 0.5) * bw / nw, base - bh * (0.35 + r() * 0.35), 3.2 * S * scale]);
        x += bw + (r() < 0.3 ? r() * 30 * S * scale : 0);
      }
      if (lights) wins.forEach(function (wv) {
        ctx.fillStyle = r() < 0.7 ? lights : 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.rect(wv[0] - wv[2], wv[1], wv[2] * 2, wv[2] * 2.4); ctx.arc(wv[0], wv[1], wv[2], Math.PI, 0); ctx.fill();
      });
    }
    function palm(ctx, x, base, hgt, color) {
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
      ctx.lineWidth = hgt * 0.06; ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + hgt * 0.15, base - hgt * 0.5, x + hgt * 0.05, base - hgt); ctx.stroke();
      var tx = x + hgt * 0.05, ty = base - hgt;
      for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + (i - 3) * 0.48, L = hgt * (0.42 + (i % 2) * 0.1);
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - hgt * 0.08, tx + Math.cos(a) * L, ty + Math.sin(a) * L + hgt * 0.18);
        ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.5, tx, ty); ctx.fill(); }
    }
    function cypress(ctx, x, base, hgt, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, base - hgt * 0.5, hgt * 0.12, hgt * 0.52, 0, 0, 6.283); ctx.fill();
    }
    function arcade(ctx, base, color, seed) {
      var r = rng(seed), aw = 70 * S, colW = 10 * S, top = base - 150 * S;
      ctx.fillStyle = color; ctx.beginPath(); ctx.rect(0, top - 22 * S, Wd, 26 * S); ctx.fill();
      // band of eight-point stars along the frieze
      for (var x = 0; x < Wd; x += aw) {
        ctx.fillStyle = color; ctx.fillRect(x, top, colW, base - top);
        ctx.beginPath(); ctx.moveTo(x + colW, top); ctx.lineTo(x + aw, top); ctx.lineTo(x + aw, top + 24 * S);
        ctx.arc(x + colW + (aw - colW) / 2, top + 30 * S, (aw - colW) / 2, 0, Math.PI, true); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,200,.18)'; star8(ctx, x + aw / 2 + colW / 2, top - 9 * S, 6 * S); ctx.fill();
      }
      // a tower and dome behind the arcade
      var tx = Wd * (0.25 + r() * 0.5); ctx.fillStyle = color; ctx.beginPath();
      ctx.rect(tx - 26 * S, top - 150 * S, 52 * S, 150 * S); onionDome(ctx, tx, top - 150 * S, 30 * S); ctx.fill();
    }
    function islands(ctx, base, color, seed) {
      var r = rng(seed); ctx.fillStyle = color;
      for (var i = 0; i < 4; i++) { var cx = (0.1 + i * 0.27 + r() * 0.1) * Wd, iw = (120 + r() * 160) * S;
        ctx.beginPath(); ctx.ellipse(cx, base, iw / 2, 18 * S, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); for (var k = 0; k < 4; k++) { var bx = cx + (k - 1.5) * iw * 0.18, bh = (16 + r() * 30) * S; ctx.rect(bx - 10 * S, base - 12 * S - bh, 20 * S, bh); if (r() < 0.6) onionDome(ctx, bx, base - 12 * S - bh, 10 * S); }
        ctx.fill(); }
    }
    function palace(ctx, base, color, lights, seed) {
      var r = rng(seed), cx = Wd * 0.64, s2 = 1.4 * S;
      ctx.fillStyle = color; ctx.beginPath();
      ctx.rect(cx - 170 * s2, base - 70 * s2, 340 * s2, 70 * s2);
      ctx.rect(cx - 70 * s2, base - 120 * s2, 140 * s2, 50 * s2);
      onionDome(ctx, cx, base - 120 * s2, 62 * s2);
      minaret(ctx, cx - 190 * s2, base, 16 * s2, 190 * s2); minaret(ctx, cx + 190 * s2, base, 16 * s2, 190 * s2);
      ctx.fill();
      ctx.fillStyle = lights;
      for (var i = 0; i < 9; i++) { var wx = cx - 140 * s2 + i * 35 * s2; ctx.beginPath(); ctx.rect(wx - 5 * s2, base - 40 * s2, 10 * s2, 18 * s2); ctx.arc(wx, base - 40 * s2, 5 * s2, Math.PI, 0); ctx.fill(); }
      // reflection
      ctx.save(); ctx.globalAlpha = 0.25; ctx.scale(1, -0.45); ctx.translate(0, -base * (1 + 1 / 0.45));
      ctx.fillStyle = color; ctx.fillRect(cx - 170 * s2, base - 70 * s2, 340 * s2, 70 * s2); ctx.restore();
    }
    function haze(ctx, top, color, a) {
      var hz = ctx.createLinearGradient(0, top, 0, H); hz.addColorStop(0, 'rgba(0,0,0,0)');
      var c = hex(color); hz.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'); ctx.fillStyle = hz; ctx.fillRect(0, top, Wd, H - top);
    }

    var f = far.getContext('2d'), md = mid.getContext('2d'), n = near.getContext('2d');
    if (wi === 0) {
      dunes(f, horizon - 10 * S, 26 * S, W.far, 11); city(f, horizon - 4 * S, 0.55, W.far, null, 12);
      city(md, horizon + 26 * S, 1, W.mid, 'rgba(255,196,110,.85)', 21); dunes(md, horizon + 60 * S, 14 * S, W.mid, 22);
      dunes(n, H - 70 * S, 40 * S, W.near, 31); palm(n, Wd * 0.08, H - 60 * S, 190 * S, W.near); palm(n, Wd * 0.93, H - 40 * S, 230 * S, W.near); palm(n, Wd * 0.82, H - 70 * S, 150 * S, W.near);
    } else if (wi === 1) {
      dunes(f, horizon - 30 * S, 34 * S, W.far, 41); dunes(f, horizon, 20 * S, shade(W.far, -0.08), 42);
      arcade(md, horizon + 70 * S, W.mid, 43);
      dunes(n, H - 60 * S, 26 * S, W.near, 51);
      var rC = rng(52); for (var t = 0; t < 9; t++) cypress(n, (t / 8) * Wd + (rC() - 0.5) * 60 * S, H - 50 * S, (150 + rC() * 120) * S, W.near);
      for (var fl = 0; fl < 60; fl++) { n.fillStyle = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff'][fl % 4]; n.beginPath(); n.arc(rC() * Wd, H - (10 + rC() * 60) * S, (2 + rC() * 3) * S, 0, 6.283); n.fill(); }
    } else {
      islands(f, horizon, W.far, 61);
      palace(md, horizon + 4 * S, W.mid, 'rgba(255,205,120,.9)', 62);
      n.fillStyle = W.near; n.beginPath(); n.moveTo(0, H);
      for (var x = 0; x <= Wd; x += 8 * S) n.lineTo(x, H - 70 * S - Math.sin(x / S * 0.02) * 10 * S - Math.sin(x / S * 0.053) * 6 * S);
      n.lineTo(Wd, H); n.fill();
      // a little dhow sailing
      var bx = Wd * 0.18, by = H - 86 * S; n.beginPath(); n.moveTo(bx - 60 * S, by); n.lineTo(bx + 70 * S, by); n.lineTo(bx + 46 * S, by + 22 * S); n.lineTo(bx - 44 * S, by + 22 * S); n.closePath(); n.fill();
      n.beginPath(); n.moveTo(bx, by); n.lineTo(bx, by - 110 * S); n.lineTo(bx + 62 * S, by - 14 * S); n.closePath(); n.fill();
    }
    haze(f, horizon - 160 * S, W.sky[3], 0.35);
    return { sky: sky, far: far, mid: mid, near: near, margin: m, horizon: horizon / dpr };
  };

  // ---------- tiles ----------
  // A glazed zellige tile: glossy gradient, white grout edge, eight-point star motif. hp/maxHp adds cracks.
  A.tile = function (w, h, scale, color, kind, hp, maxHp) {
    var c = document.createElement('canvas'), pad = 6;
    c.width = Math.ceil((w + pad * 2) * scale); c.height = Math.ceil((h + pad * 2) * scale);
    var g = c.getContext('2d'); g.scale(scale, scale); g.translate(pad, pad);
    var r = Math.min(10, h * 0.28);
    // drop shadow
    g.fillStyle = 'rgba(10,6,30,.35)'; rr(g, 1.5, 4, w, h, r); g.fill();
    var base = kind === 'gold' ? '#f2b938' : kind === 'stone' ? '#9a8a78' : color;
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, shade(base, 0.35)); gr.addColorStop(0.45, base); gr.addColorStop(1, shade(base, -0.28));
    g.fillStyle = gr; rr(g, 0, 0, w, h, r); g.fill();
    // grout / rim
    g.lineWidth = kind === 'strong' ? 4 : 2.2;
    g.strokeStyle = kind === 'strong' ? '#ffe2a0' : kind === 'stone' ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.85)';
    rr(g, 1, 1, w - 2, h - 2, r - 1); g.stroke();
    if (kind === 'strong') { g.lineWidth = 1.5; g.strokeStyle = 'rgba(120,60,10,.6)'; rr(g, 4.5, 4.5, w - 9, h - 9, r - 4); g.stroke(); }
    // motif
    g.save(); rr(g, 0, 0, w, h, r); g.clip();
    if (kind === 'stone') {
      g.strokeStyle = 'rgba(40,25,10,.35)'; g.lineWidth = 2;
      for (var x = -h; x < w + h; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); g.beginPath(); g.moveTo(x + h, 0); g.lineTo(x, h); g.stroke(); }
    } else {
      g.fillStyle = kind === 'gold' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.32)';
      star8(g, w / 2, h / 2, h * 0.36); g.fill();
      g.fillStyle = 'rgba(0,0,0,.12)'; star8(g, w / 2, h / 2, h * 0.16); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)';
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1] - h * 0.3); g.lineTo(p[0] + h * 0.3, p[1]); g.lineTo(p[0], p[1] + h * 0.3); g.lineTo(p[0] - h * 0.3, p[1]); g.fill(); });
    }
    // gloss
    var gl = g.createLinearGradient(0, 0, 0, h * 0.5); gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.ellipse(w * 0.5, h * 0.08, w * 0.46, h * 0.36, 0, 0, 6.283); g.fill();
    // cracks for damaged strong/gold tiles
    if (maxHp > 1 && hp < maxHp) {
      g.strokeStyle = 'rgba(30,10,0,.55)'; g.lineWidth = 1.6; g.lineCap = 'round';
      var R2 = rng(hp * 31 + maxHp * 7 + Math.round(w)), cracks = (maxHp - hp) * 2;
      for (var k = 0; k < cracks; k++) { var sx = R2() * w, sy = R2() * h; g.beginPath(); g.moveTo(sx, sy);
        for (var j = 0; j < 3; j++) { sx += (R2() - 0.5) * w * 0.35; sy += (R2() - 0.5) * h * 0.7; g.lineTo(sx, sy); } g.stroke(); }
    }
    if (kind === 'gold') { g.fillStyle = '#fff'; star8(g, w * 0.82, h * 0.28, 4, 0.3); g.fill(); }
    g.restore();
    c.pad = pad;
    return c;
  };

  // ---------- carpet ----------
  A.carpet = function (ctx, x, y, w, h, t, glow) {
    var n = 14, wave = function (i) { var u = i / n; return Math.sin(t * 7 + u * 6) * 3.2 * (0.4 + Math.abs(u - 0.5)); };
    // shadow
    ctx.fillStyle = 'rgba(5,3,20,.32)'; ctx.beginPath(); ctx.ellipse(x, y + h + 18, w * 0.5, 8, 0, 0, 6.283); ctx.fill();
    if (glow) { ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 26; }
    function edge(off, sgn) { var pts = []; for (var i = 0; i <= n; i++) pts.push([x - w / 2 + (w * i) / n, y + off + wave(i)]); if (sgn < 0) pts.reverse(); return pts; }
    var top = edge(0, 1), bot = edge(h, -1);
    ctx.beginPath(); top.concat(bot).forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    var gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#e2453c'); gr.addColorStop(1, '#9d1f2f');
    ctx.fillStyle = gr; ctx.fill();
    if (glow) ctx.restore();
    // gold border and inner band
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 3;
    ctx.beginPath(); edge(4, 1).forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0] + 6, p[1]); }); ctx.stroke();
    ctx.beginPath(); edge(h - 4, 1).forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0] + 6, p[1]); }); ctx.stroke();
    // diamond medallions along the middle
    var cnt = Math.max(3, Math.round(w / 46));
    for (var k = 0; k < cnt; k++) {
      var u = (k + 0.5) / cnt, i2 = u * n, mx = x - w / 2 + w * u, my = y + h / 2 + wave(i2);
      ctx.fillStyle = k % 2 ? '#2b3a8f' : '#ffd36b';
      ctx.beginPath(); ctx.moveTo(mx, my - 7); ctx.lineTo(mx + 9, my); ctx.lineTo(mx, my + 7); ctx.lineTo(mx - 9, my); ctx.closePath(); ctx.fill();
    }
    // tassels
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    [[-1, 0], [1, n]].forEach(function (s) {
      var ex = x + s[0] * w / 2, ey = y + wave(s[1]);
      for (var q = 0; q < 4; q++) { var yy = ey + 4 + q * (h - 8) / 3, sway = Math.sin(t * 9 + q) * 3;
        ctx.beginPath(); ctx.moveTo(ex, yy); ctx.lineTo(ex + s[0] * 12, yy + sway); ctx.stroke();
        ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(ex + s[0] * 13, yy + sway, 2.6, 0, 6.283); ctx.fill(); }
    });
  };

  // ---------- star ball ----------
  A.ball = function (ctx, x, y, r, t, trail) {
    for (var i = 0; i < trail.length; i++) {
      var p = trail[i], k = (i + 1) / (trail.length + 1);
      ctx.globalAlpha = k * 0.35; ctx.fillStyle = '#ffe6a3';
      ctx.beginPath(); ctx.arc(p[0], p[1], r * (0.4 + k * 0.6), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    var halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.6);
    halo.addColorStop(0, 'rgba(255,236,170,.55)'); halo.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, 6.283); ctx.fill();
    var body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.5, '#fff1b8'); body.addColorStop(1, '#f2b23a');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2.2);
    ctx.fillStyle = 'rgba(214,128,20,.55)'; star8(ctx, 0, 0, r * 0.62, 0.55); ctx.fill(); ctx.restore();
  };

  // ---------- lantern power-up ----------
  var PU = { wide: { c: '#ff9f43', g: '↔' }, multi: { c: '#4dd4ff', g: '✦' }, slow: { c: '#a78bfa', g: '☾' }, life: { c: '#ff5d73', g: '♥' } };
  A.lantern = function (ctx, x, y, type, t) {
    var p = PU[type], sw = Math.sin(t * 4) * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    var glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46); glow.addColorStop(0, p.c + 'aa'); glow.addColorStop(1, p.c + '00');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 46, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, -28); ctx.stroke();
    ctx.fillStyle = '#c98a2b'; ctx.beginPath(); ctx.moveTo(-14, -24); ctx.lineTo(14, -24); ctx.lineTo(8, -30); ctx.lineTo(-8, -30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.moveTo(-14, -24); ctx.bezierCurveTo(-26, -8, -26, 10, -12, 22); ctx.lineTo(12, 22); ctx.bezierCurveTo(26, 10, 26, -8, 14, -24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c98a2b'; ctx.fillRect(-12, 22, 24, 6);
    ctx.fillStyle = '#fff'; ctx.font = '900 22px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.g, 0, 0);
    ctx.restore();
  };
  A.PU_COLORS = PU;

  // ---------- palace pillars and frieze (frame the play area without a box) ----------
  A.pillar = function (w, h, scale, stone) {
    var c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
    var g = c.getContext('2d'); g.scale(scale, scale);
    var gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, shade(stone, -0.45)); gr.addColorStop(0.35, shade(stone, 0.12)); gr.addColorStop(0.6, stone); gr.addColorStop(1, shade(stone, -0.55));
    g.fillStyle = gr; g.fillRect(w * 0.12, 0, w * 0.76, h);
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (var y = 40; y < h; y += 120) { star8(g, w / 2, y, w * 0.26); g.fill(); }
    g.fillStyle = shade(stone, 0.2);
    for (var y2 = 100; y2 < h; y2 += 120) g.fillRect(0, y2, w, 6);
    return c;
  };
  A.frieze = function (ctx, x0, x1, y, stone, t) {
    var h = 34, gr = ctx.createLinearGradient(0, y - h, 0, y + 10);
    gr.addColorStop(0, shade(stone, -0.5)); gr.addColorStop(1, shade(stone, 0.05));
    ctx.fillStyle = gr; ctx.fillRect(x0, y - h - 400, x1 - x0, h + 400);
    // hanging scalloped arches (muqarnas hint)
    var step = 46;
    ctx.fillStyle = shade(stone, -0.15);
    for (var x = x0; x < x1; x += step) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x + step / 2, y, step / 2, Math.PI, 0, true); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,240,200,.35)';
    for (var x2 = x0 + step / 2; x2 < x1; x2 += step) { star8(ctx, x2, y - h * 0.55, 7); ctx.fill(); }
    ctx.fillStyle = shade(stone, 0.25); ctx.fillRect(x0, y - 3, x1 - x0, 3);
  };
})();
