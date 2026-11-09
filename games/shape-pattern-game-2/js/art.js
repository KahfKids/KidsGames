/* Shape Patterns: art.js
   Everything is drawn in code (crisp at any size, works offline): three layered worlds that scroll with
   parallax, the little steam train and its wagons, the pattern pieces (eight-point stars, drops, rosettes,
   hexagon tiles, arches, lanterns, leaves, turning tiles, dates) and the glowing choice pads.
   Pieces and train bodies are pre-rendered to offscreen canvases and cached by the game. No faces anywhere. */
(function () {
  'use strict';
  var A = window.PatternArt = {};
  var TAU = Math.PI * 2;

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
  A.rng = rng; A.shade = shade; A.mix = mix; A.rr = rr; A.star8 = star8; A.rgba = rgba;

  // ---------- palettes ----------
  var COL = {
    gold: '#f5bd3c', blue: '#3d7be6', coral: '#f0587a', teal: '#18b9a0', purple: '#9465ee',
    green: '#4fb85a', orange: '#f2862b', brown: '#8a4b22'
  };
  A.COLOURS = COL;
  function tone(name) { var b = COL[name] || name; return { b: b, l: shade(b, 0.42), d: shade(b, -0.28), k: shade(b, -0.6) }; }

  A.WORLDS = [
    { name: 'Desert Dusk', color: '#f6c453',
      sky: ['#24195a', '#5b3378', '#b85a7c', '#f08f68', '#ffcf8c'], sun: '#fff1c4',
      far: '#c47887', far2: '#a65c7c', mid: '#6e3466', ground: ['#f0b073', '#d9895a', '#b7664a'],
      ballast: '#8a5444', sleeper: '#4a2621', rail: '#f4dcc0', near: '#5a2648',
      wagon: '#c4462f', wagon2: '#d9653a', trim: '#ffd36b', engine: '#2f2a5a', cab: '#c4462f', mote: '#ffe2a0' },
    { name: 'Night Garden', color: '#8fb8ff',
      sky: ['#050821', '#0c1745', '#1a2f68', '#2c4d86'], sun: '#fff6dc',
      far: '#1f3566', far2: '#182b56', mid: '#0f1f42', ground: ['#2a5a46', '#1d4636', '#12302a'],
      ballast: '#2c3a40', sleeper: '#1a1c24', rail: '#cfd8ea', near: '#071419',
      wagon: '#2f5bb5', wagon2: '#3a6fd0', trim: '#ffd36b', engine: '#5a1f3a', cab: '#2f5bb5', mote: '#ffe98a' },
    { name: 'Sea Breeze', color: '#56d6e8',
      sky: ['#3f93d4', '#79bde6', '#bfe2ef', '#ffe8c2'], sun: '#fffbe8',
      far: '#7fb0c2', far2: '#5f98ad', mid: '#2f6d5f', ground: ['#f6dca4', '#e8bf7f', '#cf9a5e'],
      ballast: '#a98a6a', sleeper: '#6a4a33', rail: '#fff4e0', near: '#3a6b52',
      wagon: '#178f8a', wagon2: '#1fa59c', trim: '#fff0c8', engine: '#c4462f', cab: '#178f8a', mote: '#ffffff' }
  ];

  // ---------- backgrounds ----------
  // Layers are as wide as the screen and tile seamlessly, so they can scroll forever at different speeds.
  // L = { w, h, dpr, railY, horizon, P } in CSS px. Returns { sky, far, mid, ground, TW } (device px canvases).
  A.paintWorld = function (wi, L) {
    var W = A.WORLDS[wi], d = L.dpr, TW = Math.ceil(L.w * d), H = Math.ceil(L.h * d);
    var sky = canvas(TW, H), far = canvas(TW, H), mid = canvas(TW, H), ground = canvas(TW, H);
    var hz = L.horizon * d, rail = L.railY * d, P = L.P * d, S = Math.min(L.w, L.h) / 400 * d; // S: scenery scale
    var R = rng(500 + wi * 91);

    // periodic hill line: integer frequencies only, so the left and right edges meet
    function hillY(x, base, amp, ks, seed) {
      var r = rng(seed), y = base;
      for (var i = 0; i < ks.length; i++) y -= Math.sin(TAU * ks[i] * x / TW + r() * TAU) * amp / (i + 1);
      return y;
    }
    function hills(ctx, base, amp, ks, color, seed) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x < TW; x += 4 * d) ctx.lineTo(x, hillY(x, base, amp, ks, seed));
      ctx.lineTo(TW, hillY(TW, base, amp, ks, seed));
      ctx.lineTo(TW, H); ctx.closePath(); ctx.fill();
    }
    // draw fn(x) at x and its wrapped copies
    function wrap(x, span, fn) { fn(x); if (x - span < 0) fn(x + TW); if (x + span > TW) fn(x - TW); }
    function dome(ctx, cx, base, r) {
      ctx.moveTo(cx - r, base);
      ctx.bezierCurveTo(cx - r * 1.15, base - r * 0.9, cx - r * 0.25, base - r * 1.25, cx, base - r * 1.6);
      ctx.bezierCurveTo(cx + r * 0.25, base - r * 1.25, cx + r * 1.15, base - r * 0.9, cx + r, base);
      ctx.closePath();
    }
    function mosque(ctx, cx, base, s, color, light) {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.rect(cx - 60 * s, base - 34 * s, 120 * s, 34 * s);
      ctx.rect(cx - 30 * s, base - 50 * s, 60 * s, 18 * s);
      dome(ctx, cx, base - 48 * s, 28 * s);
      [-1, 1].forEach(function (k) {
        var mx = cx + k * 74 * s;
        ctx.rect(mx - 5 * s, base - 96 * s, 10 * s, 96 * s);
        ctx.rect(mx - 8 * s, base - 70 * s, 16 * s, 4 * s);
        dome(ctx, mx, base - 96 * s, 6 * s);
      });
      ctx.fill();
      if (light) { ctx.fillStyle = light;
        for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.rect(cx + i * 20 * s - 3 * s, base - 22 * s, 6 * s, 12 * s); ctx.arc(cx + i * 20 * s, base - 22 * s, 3 * s, Math.PI, 0); ctx.fill(); } }
    }
    function palm(ctx, x, base, hgt, color, lean) {
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round';
      var tx = x + hgt * lean, ty = base - hgt;
      ctx.lineWidth = hgt * 0.055; ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + hgt * lean * 0.2, base - hgt * 0.55, tx, ty); ctx.stroke();
      for (var i = 0; i < 8; i++) {
        var a = -Math.PI / 2 + (i - 3.5) * 0.44, Lf = hgt * (0.4 + (i % 2) * 0.1);
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(a) * Lf * 0.6, ty + Math.sin(a) * Lf * 0.6 - hgt * 0.1, tx + Math.cos(a) * Lf, ty + Math.sin(a) * Lf + hgt * 0.2);
        ctx.quadraticCurveTo(tx + Math.cos(a) * Lf * 0.45, ty + Math.sin(a) * Lf * 0.45, tx, ty); ctx.fill();
      }
      // a bunch of dates under the crown
      ctx.fillStyle = shade(color, 0.12);
      for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(tx + (k - 2) * hgt * 0.018, ty + hgt * 0.05 + (k % 2) * hgt * 0.02, hgt * 0.018, 0, TAU); ctx.fill(); }
    }
    function cypress(ctx, x, base, hgt, color) {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(x, base - hgt);
      ctx.bezierCurveTo(x + hgt * 0.16, base - hgt * 0.7, x + hgt * 0.15, base - hgt * 0.15, x + hgt * 0.04, base);
      ctx.lineTo(x - hgt * 0.04, base);
      ctx.bezierCurveTo(x - hgt * 0.15, base - hgt * 0.15, x - hgt * 0.16, base - hgt * 0.7, x, base - hgt);
      ctx.fill();
    }
    function haze(ctx, top, bottom, color, a) {
      var g = ctx.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, a));
      ctx.fillStyle = g; ctx.fillRect(0, top, TW, bottom - top);
    }

    // ---- sky (does not scroll) ----
    var g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, hz + 30 * d);
    W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, TW, H);
    var sx = TW * (wi === 1 ? 0.78 : 0.7), sy = hz - Math.max(60 * d, (hz - 70 * d) * (wi === 0 ? 0.25 : 0.55)), sr = Math.max(26, 34 * S / d) * d;
    var halo = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 5);
    halo.addColorStop(0, rgba(W.sun, wi === 1 ? 0.35 : 0.55)); halo.addColorStop(1, rgba(W.sun, 0));
    g.fillStyle = halo; g.fillRect(0, 0, TW, H);
    if (wi !== 2) { // stars
      var nst = wi === 1 ? 220 : 70;
      for (var i = 0; i < nst; i++) { var yy = R() * hz * 0.9; g.globalAlpha = (0.2 + R() * 0.7) * (1 - yy / hz) * (wi === 1 ? 1 : 0.7);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(R() * TW, yy, (R() * 1.2 + 0.35) * d, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    // sun or full moon: a plain glowing disc
    var body = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
    body.addColorStop(0, '#ffffff'); body.addColorStop(1, W.sun);
    g.fillStyle = body; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
    if (wi === 0) { // thin dusk clouds across the sun
      for (var c = 0; c < 7; c++) { var cx0 = R() * TW, cy0 = hz * (0.2 + R() * 0.55), cw0 = (50 + R() * 110) * d, ch0 = (2 + R() * 3) * d;
        var cgr = g.createLinearGradient(cx0 - cw0, 0, cx0 + cw0, 0); cgr.addColorStop(0, 'rgba(255,190,170,0)'); cgr.addColorStop(0.5, 'rgba(255,200,180,.32)'); cgr.addColorStop(1, 'rgba(255,190,170,0)');
        g.fillStyle = cgr; g.beginPath(); g.ellipse(cx0, cy0, cw0, ch0, 0, 0, TAU); g.fill(); }
    }
    if (wi === 2) { // puffy clouds and the sea
      for (var cl = 0; cl < 5; cl++) {
        var cx = R() * TW, cy = hz * (0.18 + R() * 0.45), cs = (26 + R() * 34) * S;
        g.fillStyle = 'rgba(255,255,255,.75)';
        for (var k = 0; k < 5; k++) { g.beginPath(); g.arc(cx + (k - 2) * cs * 0.6, cy - Math.sin(k / 4 * Math.PI) * cs * 0.5, cs * (0.5 + Math.sin(k / 4 * Math.PI) * 0.35), 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(160,200,230,.35)'; g.beginPath(); g.ellipse(cx, cy + cs * 0.25, cs * 1.5, cs * 0.18, 0, 0, TAU); g.fill();
      }
      var sea = g.createLinearGradient(0, hz, 0, rail);
      sea.addColorStop(0, '#5fb9cf'); sea.addColorStop(0.5, '#2c96b3'); sea.addColorStop(1, '#1b7795');
      g.fillStyle = sea; g.fillRect(0, hz, TW, H - hz);
      for (var l = 0; l < 90; l++) { var ly = hz + Math.pow(R(), 1.4) * (rail - hz), lw = (6 + R() * 30) * d * (1 + (ly - hz) / (rail - hz + 1));
        g.strokeStyle = 'rgba(255,255,255,' + (0.15 + R() * 0.4) + ')'; g.lineWidth = 1.4 * d;
        var lx = R() * TW; g.beginPath(); g.moveTo(lx - lw, ly); g.lineTo(lx + lw, ly); g.stroke(); }
      // sun path on the water
      g.fillStyle = 'rgba(255,250,220,.25)';
      for (var sp = 0; sp < 14; sp++) { var py = hz + (sp + 1) * (rail - hz) / 16; g.fillRect(sx - (10 + sp * 4) * d * R(), py, (20 + sp * 8) * d * R(), 2 * d); }
    }

    // ---- far layer ----
    var f = far.getContext('2d');
    if (wi === 0) {
      hills(f, hz - 6 * d, 18 * S, [1, 3, 5], W.far, 11);
      [0.18, 0.62].forEach(function (u) { wrap(u * TW, 140 * S, function (x) { mosque(f, x, hillY(x, hz - 6 * d, 18 * S, [1, 3, 5], 11) + 6 * d, 0.55 * S, W.far, null); }); });
      hills(f, hz + 10 * d, 12 * S, [2, 3, 7], W.far2, 12);
      haze(f, hz - 80 * S, hz + 30 * d, W.sky[4], 0.45);
    } else if (wi === 1) {
      hills(f, hz - 4 * d, 22 * S, [1, 2, 5], W.far, 21);
      [0.3, 0.8].forEach(function (u) { wrap(u * TW, 140 * S, function (x) { mosque(f, x, hillY(x, hz - 4 * d, 22 * S, [1, 2, 5], 21) + 8 * d, 0.6 * S, W.far, 'rgba(255,210,130,.75)'); }); });
      hills(f, hz + 14 * d, 14 * S, [2, 4, 6], W.far2, 22);
      haze(f, hz - 60 * S, hz + 40 * d, W.sky[3], 0.35);
    } else {
      // islands: a low green-grey hill with a little whitewashed town on top, and a pair of sailing dhows
      for (var is = 0; is < 3; is++) {
        var ix = (is + 0.3) / 3 * TW, iw = (70 + is * 30) * S, ih = (16 + is * 4) * S, houses = [];
        for (var hh = 0; hh < 4 + is; hh++) houses.push({ dx: (R() - 0.5) * iw * 1.1, w: (9 + R() * 9) * S, h: (6 + R() * 9) * S, dome: R() < 0.3, tower: R() < 0.2 });
        houses.sort(function (a, b) { return b.h - a.h; });
        wrap(ix, iw * 1.3, function (x) {
          f.fillStyle = W.far; f.beginPath(); f.ellipse(x, hz + 2 * d, iw * 1.25, ih, 0, Math.PI, 0); f.fill();
          houses.forEach(function (h) {
            var hx = x + h.dx, base = hz + 2 * d - ih * Math.sqrt(Math.max(0, 1 - Math.pow(h.dx / (iw * 1.25), 2))) + 3 * S;
            f.fillStyle = '#eef2ea'; f.fillRect(hx - h.w / 2, base - h.h, h.w, h.h);
            f.fillStyle = 'rgba(90,130,150,.35)'; f.fillRect(hx + h.w * 0.15, base - h.h, h.w * 0.35, h.h);
            f.fillStyle = 'rgba(70,110,130,.55)'; f.fillRect(hx - h.w * 0.2, base - h.h * 0.55, h.w * 0.14, h.h * 0.22);
            if (h.dome) { f.fillStyle = '#8fb7c8'; f.beginPath(); f.arc(hx, base - h.h, h.w * 0.32, Math.PI, 0); f.fill(); }
            if (h.tower) { f.fillStyle = '#eef2ea'; f.fillRect(hx - h.w * 0.4, base - h.h - 12 * S, 4 * S, 12 * S); }
          });
        });
      }
      [0.45, 0.9].forEach(function (u, k) {
        wrap(u * TW, 60 * S, function (x) {
          var by = hz + (8 + k * 14) * S, s = (0.8 + k * 0.35) * S;
          f.fillStyle = '#5a4030'; f.beginPath(); f.moveTo(x - 26 * s, by); f.lineTo(x + 30 * s, by); f.lineTo(x + 20 * s, by + 8 * s); f.lineTo(x - 18 * s, by + 8 * s); f.closePath(); f.fill();
          f.fillStyle = '#fffaf0'; f.beginPath(); f.moveTo(x, by - 2 * s); f.lineTo(x - 2 * s, by - 44 * s); f.quadraticCurveTo(x + 22 * s, by - 26 * s, x + 26 * s, by - 4 * s); f.closePath(); f.fill();
          f.strokeStyle = '#5a4030'; f.lineWidth = 1.5 * s; f.beginPath(); f.moveTo(x, by); f.lineTo(x - 2 * s, by - 46 * s); f.stroke();
        });
      });
    }

    // ---- mid layer ----
    var m = mid.getContext('2d'), gTop = rail - P * 0.05;
    if (wi === 0) {
      hills(m, gTop - 14 * S, 16 * S, [1, 2, 4], W.mid, 31);
      var nP = Math.max(3, Math.round(TW / (260 * S)));
      for (var pi = 0; pi < nP; pi++) {
        var px = (pi + 0.5) / nP * TW + (R() - 0.5) * 60 * S, ph = (110 + R() * 70) * S;
        wrap(px, ph, function (x) { var by = hillY(x, gTop - 14 * S, 16 * S, [1, 2, 4], 31) + 6 * d; palm(m, x, by, ph, W.mid, (R() - 0.5) * 0.3); palm(m, x + 40 * S, by + 4 * d, ph * 0.7, W.mid, 0.12); });
      }
    } else if (wi === 1) {
      // a garden arcade with glowing lanterns, cypress trees in front
      var SA = Math.min(S, (gTop - hz) * 0.62 / 120);
      var aw = 64 * SA, top = gTop - 120 * SA, nA = Math.max(4, Math.round(TW / aw)); aw = TW / nA;
      m.fillStyle = W.mid; m.fillRect(0, top - 16 * SA, TW, 18 * SA);
      for (var a = 0; a < nA; a++) {
        var ax = a * aw;
        m.fillStyle = W.mid; m.fillRect(ax, top, 9 * SA, gTop - top + 4 * d);
        m.beginPath(); m.moveTo(ax + 9 * SA, top); m.lineTo(ax + aw, top); m.lineTo(ax + aw, top + 26 * SA);
        m.quadraticCurveTo(ax + aw - 2 * SA, top + 6 * SA, ax + 9 * SA + (aw - 9 * SA) / 2, top + 2 * SA);
        m.quadraticCurveTo(ax + 11 * SA, top + 6 * SA, ax + 9 * SA, top + 26 * SA); m.closePath(); m.fill();
        m.fillStyle = 'rgba(255,225,170,.22)'; star8(m, ax + aw / 2 + 4 * SA, top - 7 * SA, 4.5 * SA); m.fill();
        // hanging lantern
        var lx = ax + 4.5 * SA + aw / 2, ly = top + 26 * SA;
        m.strokeStyle = 'rgba(255,220,160,.5)'; m.lineWidth = 1 * d; m.beginPath(); m.moveTo(lx, top + 4 * SA); m.lineTo(lx, ly - 6 * SA); m.stroke();
        var lg = m.createRadialGradient(lx, ly, 0, lx, ly, 26 * SA); lg.addColorStop(0, 'rgba(255,200,110,.55)'); lg.addColorStop(1, 'rgba(255,200,110,0)');
        m.fillStyle = lg; m.fillRect(lx - 26 * SA, ly - 26 * SA, 52 * SA, 52 * SA);
        m.fillStyle = '#ffd27a'; m.beginPath(); m.moveTo(lx - 4 * SA, ly - 6 * SA); m.lineTo(lx + 4 * SA, ly - 6 * SA); m.lineTo(lx + 6 * SA, ly + 3 * SA); m.lineTo(lx, ly + 8 * SA); m.lineTo(lx - 6 * SA, ly + 3 * SA); m.closePath(); m.fill();
      }
      var nC = Math.max(4, Math.round(TW / (120 * SA)));
      for (var ci = 0; ci < nC; ci++) { var cxp = (ci + 0.5) / nC * TW, chh = (90 + R() * 70) * Math.min(S, SA * 1.2); wrap(cxp, chh * 0.2, function (x) { cypress(m, x, gTop + 4 * d, chh, shade(W.mid, -0.25)); }); }
    } else {
      // shore line and palms
      m.fillStyle = shade(W.ground[0], 0.1); m.beginPath(); m.moveTo(0, H);
      for (var x2 = 0; x2 <= TW + 4 * d; x2 += 4 * d) m.lineTo(Math.min(x2, TW), gTop - 8 * S - Math.sin(TAU * 3 * Math.min(x2, TW) / TW) * 3 * S);
      m.lineTo(TW, H); m.fill();
      m.strokeStyle = 'rgba(255,255,255,.7)'; m.lineWidth = 2 * d; m.beginPath();
      for (var x3 = 0; x3 <= TW + 4 * d; x3 += 4 * d) m.lineTo(Math.min(x3, TW), gTop - 9 * S - Math.sin(TAU * 3 * Math.min(x3, TW) / TW) * 3 * S);
      m.stroke();
      var nP2 = Math.max(2, Math.round(TW / (300 * S)));
      for (var p2 = 0; p2 < nP2; p2++) { var pxx = (p2 + 0.3) / nP2 * TW, phh = (120 + R() * 50) * S; wrap(pxx, phh, function (x) { palm(m, x, gTop + 2 * d, phh, W.mid, 0.18); palm(m, x - 30 * S, gTop + 2 * d, phh * 0.75, shade(W.mid, 0.1), -0.15); }); }
    }

    // ---- ground + railway (scrolls with the train) ----
    var gg = ground.getContext('2d'), groundTop = rail + P * 0.02;
    var gl = gg.createLinearGradient(0, groundTop, 0, H);
    gl.addColorStop(0, W.ground[0]); gl.addColorStop(0.35, W.ground[1]); gl.addColorStop(1, W.ground[2]);
    gg.fillStyle = gl; gg.fillRect(0, groundTop, TW, H - groundTop);
    var R2 = rng(77 + wi);
    if (wi === 0 || wi === 2) { // sand ripples
      gg.strokeStyle = wi === 0 ? 'rgba(255,220,170,.35)' : 'rgba(255,255,255,.4)'; gg.lineWidth = 1.6 * d; gg.lineCap = 'round';
      for (var rp = 0; rp < 60; rp++) { var rx = R2() * TW, ry = groundTop + P * 0.3 + R2() * (H - groundTop), rw = (14 + R2() * 30) * d;
        wrap(rx, rw, function (x) { gg.beginPath(); gg.moveTo(x - rw, ry); gg.quadraticCurveTo(x, ry - 5 * d, x + rw, ry); gg.stroke(); }); }
      for (var sh = 0; sh < 26; sh++) { var shx = R2() * TW, shy = groundTop + P * 0.3 + R2() * (H - groundTop), shr = (2 + R2() * 3) * d;
        gg.fillStyle = wi === 2 ? ['#ffffff', '#ffd1c4', '#f8e2b0'][sh % 3] : 'rgba(120,60,40,.35)';
        gg.beginPath(); gg.ellipse(shx, shy, shr * 1.3, shr, 0, 0, TAU); gg.fill(); }
    } else { // grass blades and little flowers
      for (var gb = 0; gb < 160; gb++) { var gx = R2() * TW, gy = groundTop + P * 0.25 + R2() * (H - groundTop), gh = (5 + R2() * 9) * d;
        gg.strokeStyle = 'rgba(120,200,140,' + (0.15 + R2() * 0.25) + ')'; gg.lineWidth = 1.4 * d;
        gg.beginPath(); gg.moveTo(gx, gy); gg.lineTo(gx + (R2() - 0.5) * 6 * d, gy - gh); gg.stroke(); }
      for (var fl = 0; fl < 50; fl++) { gg.fillStyle = ['#ff9fbf', '#ffffff', '#ffe08a', '#c8b0ff'][fl % 4]; gg.globalAlpha = 0.85;
        gg.beginPath(); gg.arc(R2() * TW, groundTop + P * 0.3 + R2() * (H - groundTop), (1.5 + R2() * 2) * d, 0, TAU); gg.fill(); }
      gg.globalAlpha = 1;
    }
    // embankment and ballast
    var bTop = rail + P * 0.03, bBot = rail + P * 0.17;
    var bg = gg.createLinearGradient(0, bTop, 0, bBot); bg.addColorStop(0, shade(W.ballast, 0.15)); bg.addColorStop(1, shade(W.ballast, -0.2));
    gg.fillStyle = bg; gg.fillRect(0, bTop, TW, bBot - bTop);
    gg.fillStyle = 'rgba(0,0,0,.18)'; gg.fillRect(0, bBot, TW, 3 * d);
    for (var st = 0; st < TW / (3 * d); st++) { gg.fillStyle = R2() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)'; gg.beginPath(); gg.arc(R2() * TW, bTop + R2() * (bBot - bTop), (0.8 + R2() * 1.4) * d, 0, TAU); gg.fill(); }
    // sleepers (spacing divides the tile width so it wraps cleanly)
    var nS = Math.max(8, Math.round(TW / (P * 0.34))), sp2 = TW / nS, swd = P * 0.15;
    for (var s2 = 0; s2 < nS; s2++) {
      var sxx = s2 * sp2;
      gg.fillStyle = W.sleeper; rr(gg, sxx, rail + P * 0.025, swd, P * 0.055, 2 * d); gg.fill();
      gg.fillStyle = 'rgba(255,255,255,.12)'; gg.fillRect(sxx + 1 * d, rail + P * 0.027, swd - 2 * d, P * 0.012);
    }
    // the rail
    var rh = Math.max(3 * d, P * 0.035), rg = gg.createLinearGradient(0, rail, 0, rail + rh);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, W.rail); rg.addColorStop(1, shade(W.rail, -0.45));
    gg.fillStyle = rg; gg.fillRect(0, rail, TW, rh);
    gg.fillStyle = 'rgba(0,0,0,.25)'; gg.fillRect(0, rail + rh, TW, 1.5 * d);

    return { sky: sky, far: far, mid: mid, ground: ground, TW: TW };
  };

  // Soft foreground plants along the bottom edge (drawn live, cheap; x scrolls).
  A.nearPlants = function (ctx, wi, L, scroll, t) {
    var W = A.WORLDS[wi], n = Math.max(4, Math.round(L.w / 120)), span = L.w / n, R = rng(900 + wi);
    ctx.fillStyle = W.near;
    for (var i = 0; i < n + 1; i++) {
      var base = ((i * span - scroll * 1.25) % (L.w + span) + (L.w + span)) % (L.w + span) - span * 0.5, hgt = (18 + R() * 26) * Math.min(1.6, L.h / 600);
      var sway = Math.sin(t * 1.3 + i) * 3, y = L.h + 4;
      for (var b = 0; b < 5; b++) {
        var bx = base + (b - 2) * 6, bh = hgt * (0.6 + ((b * 37) % 10) / 20);
        ctx.beginPath(); ctx.moveTo(bx - 3, y); ctx.quadraticCurveTo(bx + (b - 2) * 4, y - bh * 0.6, bx + (b - 2) * 7 + sway, y - bh); ctx.quadraticCurveTo(bx + (b - 2) * 2, y - bh * 0.5, bx + 3, y); ctx.fill();
      }
    }
  };

  // ---------- pieces ----------
  // Each draw function draws one object centred at 0,0 that fits in a box of radius R.
  function fillShaded(g, R, t) {
    var gr = g.createLinearGradient(-R * 0.5, -R, R * 0.5, R);
    gr.addColorStop(0, t.l); gr.addColorStop(0.5, t.b); gr.addColorStop(1, t.d);
    g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(1, R * 0.075); g.lineJoin = 'round'; g.strokeStyle = t.k; g.stroke();
  }
  function gloss(g, R, path, a) {
    g.save(); path(); g.clip();
    var gl = g.createRadialGradient(-R * 0.4, -R * 0.55, 0, -R * 0.4, -R * 0.55, R * 0.95);
    gl.addColorStop(0, 'rgba(255,255,255,' + (a || 0.6) + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    g.restore();
  }
  var DRAW = {
    star: function (g, R, t) {
      var path = function () { star8(g, 0, 0, R, 0.66, Math.PI / 8); };
      path(); fillShaded(g, R, t); gloss(g, R, path);
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = R * 0.07; star8(g, 0, 0, R * 0.52, 0.66, Math.PI / 8); g.stroke();
      g.fillStyle = t.d; g.beginPath(); g.arc(0, 0, R * 0.16, 0, TAU); g.fill();
    },
    drop: function (g, R, t) {
      var path = function () {
        g.beginPath(); g.moveTo(0, -R);
        g.bezierCurveTo(R * 0.25, -R * 0.55, R * 0.72, -R * 0.1, R * 0.72, R * 0.3);
        g.arc(0, R * 0.3, R * 0.72, 0, Math.PI);
        g.bezierCurveTo(-R * 0.72, -R * 0.1, -R * 0.25, -R * 0.55, 0, -R); g.closePath();
      };
      path(); fillShaded(g, R, t); gloss(g, R, path, 0.45);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = R * 0.12; g.lineCap = 'round';
      g.beginPath(); g.arc(0, R * 0.3, R * 0.46, Math.PI * 1.05, Math.PI * 1.35); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(-R * 0.18, -R * 0.2, R * 0.07, 0, TAU); g.fill();
    },
    flower: function (g, R, t) {
      for (var i = 0; i < 8; i++) {
        g.save(); g.rotate(i * TAU / 8);
        g.beginPath(); g.ellipse(0, -R * 0.55, R * 0.27, R * 0.45, 0, 0, TAU);
        var gr = g.createLinearGradient(0, -R, 0, 0); gr.addColorStop(0, t.l); gr.addColorStop(1, t.b);
        g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1, R * 0.06); g.strokeStyle = t.k; g.stroke();
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, R * 0.32, 0, TAU);
      var cg = g.createRadialGradient(-R * 0.1, -R * 0.1, 0, 0, 0, R * 0.32); cg.addColorStop(0, '#fff3c0'); cg.addColorStop(1, '#e8a22a');
      g.fillStyle = cg; g.fill(); g.lineWidth = Math.max(1, R * 0.06); g.strokeStyle = '#8a5212'; g.stroke();
      g.fillStyle = 'rgba(138,82,18,.6)';
      for (var k = 0; k < 6; k++) { g.beginPath(); g.arc(Math.cos(k * TAU / 6) * R * 0.17, Math.sin(k * TAU / 6) * R * 0.17, R * 0.04, 0, TAU); g.fill(); }
    },
    hex: function (g, R, t) {
      var path = function (r) { g.beginPath(); for (var i = 0; i < 6; i++) { var a = i * TAU / 6 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
      path(R); fillShaded(g, R, t); gloss(g, R, function () { path(R); });
      g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = R * 0.07; path(R * 0.7); g.stroke();
      // six-petal rosette inside
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (var i = 0; i < 6; i++) { g.save(); g.rotate(i * TAU / 6); g.beginPath(); g.ellipse(0, -R * 0.25, R * 0.09, R * 0.22, 0, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = t.d; g.beginPath(); g.arc(0, 0, R * 0.1, 0, TAU); g.fill();
    },
    arch: function (g, R, t) {
      var w = R * 0.78, b = R * 0.95, sp = -R * 0.15;
      var path = function (k) {
        var ww = w * k, top = -R * (0.15 + 0.85 * k) ;
        g.beginPath(); g.moveTo(-ww, b - (1 - k) * R * 0.25); g.lineTo(-ww, sp);
        g.quadraticCurveTo(-ww, top + R * 0.2 * k, 0, top);
        g.quadraticCurveTo(ww, top + R * 0.2 * k, ww, sp);
        g.lineTo(ww, b - (1 - k) * R * 0.25); g.closePath();
      };
      path(1); fillShaded(g, R, t); gloss(g, R, function () { path(1); });
      g.fillStyle = 'rgba(30,10,60,.28)'; path(0.62); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = R * 0.07; path(0.62); g.stroke();
      g.fillStyle = '#ffe9a8'; star8(g, 0, -R * 0.22, R * 0.15, 0.55); g.fill();
      g.fillStyle = t.k; g.fillRect(-w * 1.08, b - R * 0.08, w * 2.16, R * 0.13);
    },
    lantern: function (g, R, t) {
      var glow = g.createRadialGradient(0, R * 0.1, 0, 0, R * 0.1, R * 1.05);
      glow.addColorStop(0, rgba(t.l, 0.6)); glow.addColorStop(1, rgba(t.l, 0));
      g.fillStyle = glow; g.beginPath(); g.arc(0, R * 0.1, R * 1.05, 0, TAU); g.fill();
      var gold = { b: '#e0a63a', l: '#ffe7a3', d: '#a8681c', k: '#5c3510' };
      // hanging ring and cap
      g.strokeStyle = gold.k; g.lineWidth = R * 0.08; g.beginPath(); g.arc(0, -R * 0.9, R * 0.1, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(-R * 0.3, -R * 0.52); g.quadraticCurveTo(0, -R * 0.95, R * 0.3, -R * 0.52); g.closePath(); fillShaded(g, R, gold);
      // glass body
      var body = function () { g.beginPath(); g.moveTo(-R * 0.36, -R * 0.5); g.lineTo(R * 0.36, -R * 0.5); g.lineTo(R * 0.56, R * 0.05); g.lineTo(R * 0.36, R * 0.6); g.lineTo(-R * 0.36, R * 0.6); g.lineTo(-R * 0.56, R * 0.05); g.closePath(); };
      body(); var bg = g.createRadialGradient(0, R * 0.05, 0, 0, R * 0.05, R * 0.6); bg.addColorStop(0, '#fffbe0'); bg.addColorStop(0.45, t.l); bg.addColorStop(1, t.b);
      g.fillStyle = bg; g.fill(); g.lineWidth = R * 0.08; g.strokeStyle = gold.k; g.stroke();
      g.strokeStyle = gold.b; g.lineWidth = R * 0.06;
      g.beginPath(); g.moveTo(0, -R * 0.5); g.lineTo(0, R * 0.6); g.moveTo(-R * 0.56, R * 0.05); g.lineTo(R * 0.56, R * 0.05); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)'; star8(g, 0, R * 0.05, R * 0.15, 0.5); g.fill();
      // base
      g.beginPath(); g.moveTo(-R * 0.4, R * 0.6); g.lineTo(R * 0.4, R * 0.6); g.lineTo(R * 0.22, R * 0.8); g.lineTo(-R * 0.22, R * 0.8); g.closePath(); fillShaded(g, R, gold);
      g.fillStyle = gold.d; g.beginPath(); g.arc(0, R * 0.9, R * 0.08, 0, TAU); g.fill();
    },
    leaf: function (g, R, t) {
      var path = function () {
        g.beginPath(); g.moveTo(0, -R);
        g.bezierCurveTo(R * 0.7, -R * 0.55, R * 0.62, R * 0.45, 0, R * 0.78);
        g.bezierCurveTo(-R * 0.62, R * 0.45, -R * 0.7, -R * 0.55, 0, -R); g.closePath();
      };
      path(); fillShaded(g, R, t); gloss(g, R, path, 0.45);
      g.strokeStyle = t.k; g.lineWidth = R * 0.08; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -R * 0.82); g.lineTo(0, R * 0.98); g.stroke();
      g.lineWidth = R * 0.05; g.strokeStyle = rgba(t.k, 0.7);
      for (var i = 0; i < 4; i++) { var y = -R * 0.5 + i * R * 0.3; g.beginPath(); g.moveTo(0, y + R * 0.1); g.lineTo(R * 0.36, y - R * 0.08); g.moveTo(0, y + R * 0.1); g.lineTo(-R * 0.36, y - R * 0.08); g.stroke(); }
    },
    // a square tile, one corner half coloured: turning it is easy to see
    tile: function (g, R, t) {
      var s = R * 0.86, r = R * 0.16;
      rr(g, -s, -s, s * 2, s * 2, r); g.fillStyle = '#fff6e2'; g.fill();
      g.save(); rr(g, -s, -s, s * 2, s * 2, r); g.clip();
      g.beginPath(); g.moveTo(-s, -s); g.lineTo(s, -s); g.lineTo(-s, s); g.closePath();
      var gr = g.createLinearGradient(-s, -s, s * 0.3, s * 0.3); gr.addColorStop(0, t.l); gr.addColorStop(1, t.b); g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; star8(g, -s * 0.42, -s * 0.42, s * 0.3, 0.55); g.fill();
      g.fillStyle = rgba(t.b, 0.35); g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.16, 0, TAU); g.fill();
      g.restore();
      g.lineWidth = Math.max(1.5, R * 0.1); g.strokeStyle = '#d9a33a'; rr(g, -s, -s, s * 2, s * 2, r); g.stroke();
      g.lineWidth = Math.max(1, R * 0.04); g.strokeStyle = t.k; rr(g, -s - R * 0.05, -s - R * 0.05, s * 2 + R * 0.1, s * 2 + R * 0.1, r + R * 0.04); g.stroke();
    },
    date: function (g, R, t) {
      var path = function () { g.beginPath(); g.ellipse(0, 0, R * 0.5, R * 0.86, 0, 0, TAU); };
      path(); fillShaded(g, R, t); gloss(g, R, path, 0.5);
      g.strokeStyle = 'rgba(40,15,5,.35)'; g.lineWidth = R * 0.06;
      g.beginPath(); g.moveTo(R * 0.15, -R * 0.4); g.quadraticCurveTo(R * 0.3, 0, R * 0.12, R * 0.45); g.stroke();
      g.fillStyle = '#e9c26a'; g.beginPath(); g.ellipse(0, -R * 0.84, R * 0.2, R * 0.1, 0, 0, TAU); g.fill();
    }
  };
  A.SHAPES = Object.keys(DRAW);

  // Layout of n small items for counting pieces (like dice).
  var COUNT_POS = {
    1: [[0, 0]], 2: [[-0.42, 0], [0.42, 0]], 3: [[0, -0.42], [-0.42, 0.34], [0.42, 0.34]],
    4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], 5: [[-0.44, -0.44], [0.44, -0.44], [0, 0], [-0.44, 0.44], [0.44, 0.44]],
    6: [[-0.44, -0.5], [0.44, -0.5], [-0.44, 0], [0.44, 0], [-0.44, 0.5], [0.44, 0.5]]
  };

  // Pre-render one piece: p = { s, c, n }, S = box size in CSS px. Rotation is applied when drawing.
  A.piece = function (p, S, dpr) {
    var pad = Math.ceil(S * 0.12), c = canvas((S + pad * 2) * dpr, (S + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(S / 2 + pad, S / 2 + pad);
    var t = tone(p.c), R = S * 0.44, draw = DRAW[p.s] || DRAW.star;
    if ((p.n || 1) > 1 || p.s === 'date') {
      // counting pieces sit on a cream plate so the group reads as one thing
      var pr = S * 0.47;
      g.fillStyle = 'rgba(40,20,10,.25)'; g.beginPath(); g.arc(0, pr * 0.06, pr, 0, TAU); g.fill();
      var pg = g.createRadialGradient(-pr * 0.3, -pr * 0.4, 0, 0, 0, pr); pg.addColorStop(0, '#fffdf4'); pg.addColorStop(1, '#f1dfb8');
      g.fillStyle = pg; g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.fill();
      g.strokeStyle = '#d6a64a'; g.lineWidth = Math.max(1.5, pr * 0.07); g.stroke();
      g.strokeStyle = 'rgba(214,166,74,.45)'; g.lineWidth = Math.max(1, pr * 0.03); g.beginPath(); g.arc(0, 0, pr * 0.84, 0, TAU); g.stroke();
      var n = p.n || 1, pos = COUNT_POS[n] || COUNT_POS[1], ir = n === 1 ? R * 0.55 : n <= 2 ? R * 0.34 : n <= 4 ? R * 0.29 : R * 0.24;
      pos.forEach(function (q) { g.save(); g.translate(q[0] * pr * 0.95, q[1] * pr * 0.95); draw(g, ir, t); g.restore(); });
    } else {
      draw(g, R, t);
    }
    c.pad = pad;
    return c;
  };

  // ---------- choice pad (a glowing medallion the piece floats on) ----------
  A.pad = function (C, dpr, wi) {
    var pad = Math.ceil(C * 0.15), c = canvas((C + pad * 2) * dpr, (C + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(C / 2 + pad, C / 2 + pad);
    var r = C / 2, W = A.WORLDS[wi];
    g.fillStyle = 'rgba(10,5,25,.3)'; g.beginPath(); g.ellipse(0, r * 0.92, r * 0.86, r * 0.2, 0, 0, TAU); g.fill();
    var ring = g.createLinearGradient(0, -r, 0, r); ring.addColorStop(0, '#ffe7a6'); ring.addColorStop(0.5, '#e6a73c'); ring.addColorStop(1, '#9a5a1a');
    g.fillStyle = ring; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    var inner = g.createRadialGradient(0, -r * 0.3, 0, 0, 0, r * 0.88);
    inner.addColorStop(0, shade(W.wagon, -0.1)); inner.addColorStop(1, shade(W.wagon, -0.55));
    g.fillStyle = inner; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.fill();
    // faint eight-point lattice
    g.save(); g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.clip();
    g.strokeStyle = 'rgba(255,230,170,.16)'; g.lineWidth = Math.max(1, r * 0.03);
    star8(g, 0, 0, r * 0.7, 0.7); g.stroke(); star8(g, 0, 0, r * 0.42, 0.7, Math.PI / 8); g.stroke();
    for (var i = 0; i < 8; i++) { var a = i * TAU / 8; g.beginPath(); g.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.22, 0, TAU); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = Math.max(1, r * 0.03); g.beginPath(); g.arc(0, 0, r * 0.95, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
    c.pad = pad;
    return c;
  };

  // ---------- train ----------
  // Geometry (relative to the rail line y and pitch P) shared by game.js.
  A.trainGeom = function (P) {
    var wr = P * 0.12, bodyBottom = -wr * 1.3, bodyH = P * 0.3, ps = P * 0.8;
    return { wr: wr, bodyBottom: bodyBottom, bodyTop: bodyBottom - bodyH, bodyW: P * 0.86, ps: ps,
      pieceY: bodyBottom - bodyH - ps * 0.5 - P * 0.02, engineW: P * 1.32 };
  };

  // Wagon body (no wheels): a lacquered flat car with a gold star frieze. Origin = wagon centre on the rail.
  A.wagon = function (P, dpr, wi, alt) {
    var G = A.trainGeom(P), W = A.WORLDS[wi], pad = Math.ceil(P * 0.08), bw = G.bodyW, bh = G.bodyBottom - G.bodyTop;
    var c = canvas((P + pad * 2) * dpr, (P * 0.6 + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(P / 2 + pad, P * 0.6 + pad);
    var col = alt ? W.wagon2 : W.wagon, t = tone(col);
    // chassis
    g.fillStyle = '#2a1d2a'; rr(g, -bw * 0.48, G.bodyBottom - P * 0.02, bw * 0.96, P * 0.07, P * 0.02); g.fill();
    // body
    var x = -bw / 2, y = G.bodyTop;
    rr(g, x, y, bw, bh, P * 0.06);
    var gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, t.l); gr.addColorStop(0.35, t.b); gr.addColorStop(1, t.d);
    g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1, P * 0.02); g.strokeStyle = t.k; g.stroke();
    // gold rim along the top edge
    g.fillStyle = W.trim; rr(g, x - P * 0.015, y - P * 0.02, bw + P * 0.03, P * 0.05, P * 0.025); g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + P * 0.02, y - P * 0.012, bw - P * 0.04, P * 0.012);
    // panel with an eight-point star and two diamonds
    g.strokeStyle = rgba(W.trim, 0.8); g.lineWidth = Math.max(1, P * 0.014); rr(g, x + P * 0.05, y + P * 0.06, bw - P * 0.1, bh - P * 0.1, P * 0.03); g.stroke();
    g.fillStyle = W.trim; star8(g, 0, y + bh * 0.55, bh * 0.28, 0.55); g.fill();
    g.fillStyle = shade(col, -0.35); star8(g, 0, y + bh * 0.55, bh * 0.11, 0.55); g.fill();
    [-1, 1].forEach(function (k) { g.fillStyle = rgba(W.trim, 0.85); g.beginPath(); var dx = k * bw * 0.3, dy = y + bh * 0.55, q = bh * 0.13;
      g.moveTo(dx, dy - q); g.lineTo(dx + q, dy); g.lineTo(dx, dy + q); g.lineTo(dx - q, dy); g.closePath(); g.fill(); });
    c.pad = pad; c.ox = P / 2 + pad; c.oy = P * 0.6 + pad;
    return c;
  };

  // Steam engine facing right. Origin = left end of the engine on the rail.
  A.engine = function (P, dpr, wi) {
    var G = A.trainGeom(P), W = A.WORLDS[wi], pad = Math.ceil(P * 0.1), EW = G.engineW;
    var c = canvas((EW + pad * 2) * dpr, (P * 1.25 + pad * 2) * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(pad, P * 1.25 + pad);
    var bb = G.bodyBottom, eng = tone(W.engine), cab = tone(W.cab), gold = tone('#e9b14a');
    // chassis
    g.fillStyle = '#231824'; rr(g, P * 0.02, bb - P * 0.03, EW - P * 0.06, P * 0.08, P * 0.02); g.fill();
    // cow-catcher
    g.fillStyle = '#3a2a30'; g.beginPath(); g.moveTo(EW - P * 0.12, bb - P * 0.03); g.lineTo(EW + P * 0.02, bb + P * 0.08); g.lineTo(EW - P * 0.16, bb + P * 0.08); g.closePath(); g.fill();
    // boiler
    var bx0 = P * 0.44, bx1 = EW - P * 0.1, by0 = bb - P * 0.5, by1 = bb - P * 0.04, bh = by1 - by0;
    rr(g, bx0, by0, bx1 - bx0, bh, bh * 0.45);
    var bgr = g.createLinearGradient(0, by0, 0, by1); bgr.addColorStop(0, eng.l); bgr.addColorStop(0.3, eng.b); bgr.addColorStop(1, eng.k);
    g.fillStyle = bgr; g.fill(); g.lineWidth = Math.max(1, P * 0.018); g.strokeStyle = eng.k; g.stroke();
    // gold bands
    [0.25, 0.55, 0.85].forEach(function (u) { g.fillStyle = W.trim; g.fillRect(bx0 + (bx1 - bx0) * u - P * 0.018, by0 + P * 0.01, P * 0.036, bh - P * 0.02); });
    // smoke box front + lamp
    rr(g, bx1 - P * 0.02, by0 + P * 0.03, P * 0.1, bh - P * 0.06, P * 0.04); g.fillStyle = '#2a2030'; g.fill();
    var lg = g.createRadialGradient(bx1 + P * 0.06, by0 + P * 0.04, 0, bx1 + P * 0.06, by0 + P * 0.04, P * 0.26);
    lg.addColorStop(0, 'rgba(255,240,180,.85)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = lg; g.beginPath(); g.arc(bx1 + P * 0.06, by0 + P * 0.04, P * 0.26, 0, TAU); g.fill();
    g.fillStyle = '#fff3c4'; rr(g, bx1 + P * 0.0, by0 - P * 0.04, P * 0.1, P * 0.08, P * 0.03); g.fill(); g.strokeStyle = gold.k; g.lineWidth = Math.max(1, P * 0.012); g.stroke();
    // chimney
    var cx = bx1 - P * 0.2;
    g.beginPath(); g.moveTo(cx - P * 0.07, by0 + P * 0.02); g.lineTo(cx - P * 0.06, by0 - P * 0.22); g.lineTo(cx - P * 0.11, by0 - P * 0.32); g.lineTo(cx + P * 0.11, by0 - P * 0.32); g.lineTo(cx + P * 0.06, by0 - P * 0.22); g.lineTo(cx + P * 0.07, by0 + P * 0.02); g.closePath();
    var cg = g.createLinearGradient(cx - P * 0.1, 0, cx + P * 0.1, 0); cg.addColorStop(0, eng.k); cg.addColorStop(0.4, eng.l); cg.addColorStop(1, eng.k);
    g.fillStyle = cg; g.fill(); g.fillStyle = W.trim; g.fillRect(cx - P * 0.115, by0 - P * 0.34, P * 0.23, P * 0.04);
    // steam dome
    var dx = bx0 + (bx1 - bx0) * 0.42;
    g.beginPath(); g.moveTo(dx - P * 0.09, by0 + P * 0.02); g.quadraticCurveTo(dx - P * 0.09, by0 - P * 0.14, dx, by0 - P * 0.14); g.quadraticCurveTo(dx + P * 0.09, by0 - P * 0.14, dx + P * 0.09, by0 + P * 0.02); g.closePath();
    var dg = g.createLinearGradient(0, by0 - P * 0.14, 0, by0); dg.addColorStop(0, gold.l); dg.addColorStop(1, gold.d); g.fillStyle = dg; g.fill();
    // cab with an arched, lit window (no faces: just a warm empty window)
    var c0 = P * 0.02, c1 = P * 0.5, ct = bb - P * 0.86;
    g.beginPath(); g.moveTo(c0, bb - P * 0.03); g.lineTo(c0, ct + P * 0.08); g.lineTo(c1, ct + P * 0.08); g.lineTo(c1, bb - P * 0.03); g.closePath();
    var kg = g.createLinearGradient(0, ct, 0, bb); kg.addColorStop(0, cab.l); kg.addColorStop(0.4, cab.b); kg.addColorStop(1, cab.d);
    g.fillStyle = kg; g.fill(); g.lineWidth = Math.max(1, P * 0.018); g.strokeStyle = cab.k; g.stroke();
    // roof
    g.beginPath(); g.moveTo(c0 - P * 0.05, ct + P * 0.09); g.quadraticCurveTo((c0 + c1) / 2, ct - P * 0.04, c1 + P * 0.05, ct + P * 0.09); g.lineTo(c1 + P * 0.05, ct + P * 0.12); g.lineTo(c0 - P * 0.05, ct + P * 0.12); g.closePath();
    g.fillStyle = eng.b; g.fill(); g.strokeStyle = eng.k; g.stroke();
    // window
    var wx = (c0 + c1) / 2, wy = ct + P * 0.2, ww = P * 0.13, wh = P * 0.22;
    g.beginPath(); g.moveTo(wx - ww, wy + wh); g.lineTo(wx - ww, wy + P * 0.05); g.quadraticCurveTo(wx - ww, wy - P * 0.04, wx, wy - P * 0.06); g.quadraticCurveTo(wx + ww, wy - P * 0.04, wx + ww, wy + P * 0.05); g.lineTo(wx + ww, wy + wh); g.closePath();
    var wg = g.createLinearGradient(0, wy - P * 0.06, 0, wy + wh); wg.addColorStop(0, '#fff3c4'); wg.addColorStop(1, '#f5b04a');
    g.fillStyle = wg; g.fill(); g.lineWidth = Math.max(1.5, P * 0.025); g.strokeStyle = W.trim; g.stroke();
    // star badge on the cab side
    g.fillStyle = W.trim; star8(g, wx, bb - P * 0.18, P * 0.07, 0.55); g.fill();
    g.fillStyle = cab.d; g.beginPath(); g.arc(wx, bb - P * 0.18, P * 0.025, 0, TAU); g.fill();
    // highlight along the boiler
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = P * 0.02; g.lineCap = 'round';
    g.beginPath(); g.moveTo(bx0 + bh * 0.4, by0 + bh * 0.22); g.lineTo(bx1 - bh * 0.4, by0 + bh * 0.22); g.stroke();
    c.ox = pad; c.oy = P * 1.25 + pad;
    return c;
  };
  // Engine wheel positions (x from the engine's left end) and radii.
  A.engineWheels = function (P) { return [[P * 0.2, P * 0.11], [P * 0.58, P * 0.17], [P * 0.94, P * 0.17], [P * 1.2, P * 0.1]]; };

  // A spoked wheel, drawn live so it can turn.
  A.wheel = function (ctx, x, y, r, ang, wi) {
    var W = A.WORLDS[wi];
    ctx.fillStyle = '#20161f'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(W.engine, 0.15); ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = W.trim; ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.11);
    ctx.beginPath();
    for (var i = 0; i < 4; i++) { var a = ang + i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); ctx.lineTo(x - Math.cos(a) * r * 0.75, y - Math.sin(a) * r * 0.75); }
    ctx.stroke();
    ctx.fillStyle = W.trim; ctx.beginPath(); ctx.arc(x, y, r * 0.24, 0, TAU); ctx.fill();
  };
})();
