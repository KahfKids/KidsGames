/* Shape Patterns: the paint box (window.PatArt).
   The game's look (unchanged from the old page, rebuilt for the engine): three worlds seen from a little steam train on
   a rail: Desert Dusk, Night Garden and Sea Breeze, each in layers (sky, far hills, near trees, ground and rail) that
   slide past at different speeds; lacquered wagons with a gold star frieze; pattern pieces (eight-point stars, drops,
   rosettes, hexagon tiles, arches, lanterns, leaves, turning tiles, dates); glowing choice pads. No faces anywhere.
   How it is made (docs/phaser-standard.md section 3): every picture is painted ONCE with Canvas2D into the engine's
   canvas texture (Kit.play.tex), one texture pixel per design unit of the 1920 x 1080 space, and shown as an image,
   tile sprite or nine-slice. Nothing is painted per frame. Only the current world's backdrop is kept in memory.
   Design numbers shared with play.js: the rail is at y = RAIL, the horizon at y = HZ, the train's reference pitch
   (one wagon) is P0 = 210 units; play.js scales the train's pictures to the pitch the screen allows. */
(function () {
  'use strict';
  var A = window.PatArt = {};
  var TAU = Math.PI * 2;
  var TW = 2048, RAIL = 640, HZ = 430, P0 = 210, S = 2.6;            // S: scenery scale (the old art was made for a ~400 px high screen)
  A.TW = TW; A.RAIL = RAIL; A.HZ = HZ; A.P0 = P0; A.S0 = 240;       // S0: the box a piece is painted in

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
  A.shade = shade; A.mix = mix; A.rr = rr; A.star8 = star8; A.rgba = rgba;

  // ---------- palettes ----------
  var COL = { gold: '#f5bd3c', blue: '#3d7be6', coral: '#f0587a', teal: '#18b9a0', purple: '#9465ee', green: '#4fb85a', orange: '#f2862b', brown: '#8a4b22' };
  A.COLOURS = COL;
  function tone(name) { var b = COL[name] || name; return { b: b, l: shade(b, 0.42), d: shade(b, -0.28), k: shade(b, -0.6) }; }
  A.WORLDS = [
    { name: 'Desert Dusk', color: '#f6c453',
      sky: ['#24195a', '#5b3378', '#b85a7c', '#f08f68', '#ffcf8c'], sun: '#fff1c4',
      far: '#c47887', far2: '#a65c7c', mid: '#6e3466', ground: ['#f0b073', '#d9895a', '#b7664a'],
      ballast: '#8a5444', sleeper: '#4a2621', rail: '#f4dcc0', near: '#5a2648',
      wagon: '#c4462f', wagon2: '#d9653a', trim: '#ffd36b', engine: '#2f2a5a', cab: '#c4462f' },
    { name: 'Night Garden', color: '#8fb8ff',
      sky: ['#050821', '#0c1745', '#1a2f68', '#2c4d86'], sun: '#fff6dc',
      far: '#1f3566', far2: '#182b56', mid: '#0f1f42', ground: ['#2a5a46', '#1d4636', '#12302a'],
      ballast: '#2c3a40', sleeper: '#1a1c24', rail: '#cfd8ea', near: '#071419',
      wagon: '#2f5bb5', wagon2: '#3a6fd0', trim: '#ffd36b', engine: '#5a1f3a', cab: '#2f5bb5' },
    { name: 'Sea Breeze', color: '#56d6e8',
      sky: ['#3f93d4', '#79bde6', '#bfe2ef', '#ffe8c2'], sun: '#fffbe8',
      far: '#7fb0c2', far2: '#5f98ad', mid: '#2f6d5f', ground: ['#f6dca4', '#e8bf7f', '#cf9a5e'],
      ballast: '#a98a6a', sleeper: '#6a4a33', rail: '#fff4e0', near: '#3a6b52',
      wagon: '#178f8a', wagon2: '#1fa59c', trim: '#fff0c8', engine: '#c4462f', cab: '#178f8a' }
  ];

  // ---------- backdrops (one world at a time) ----------
  // Returns the keys and the numbers play.js needs. Layers: sky (still, painted at half size and shown at 2x),
  // far, mid, ground and near (tile 2048 units wide that wrap, so tile sprites slide them forever).
  var SKY = { x0: -540, y0: -420, w: 3000, h: 1140 };
  var LAY = { far: { y0: HZ - 260, h: 330 }, mid: { y0: 70, h: 640 }, ground: { y0: RAIL - 4, h: 520 }, near: { y0: 0, h: 170 } };
  A.SKY = SKY; A.LAY = LAY;
  A.world = function (scene, wi) {
    var W = A.WORLDS[wi], k = 'w' + wi + '-';
    if (scene.textures.exists(k + 'sky')) return k;
    var hz = HZ, rail = RAIL, TWd = TW;
    function hillY(x, base, amp, ks, seed) { var r = rng(seed), y = base; for (var i = 0; i < ks.length; i++) y -= Math.sin(TAU * ks[i] * x / TWd + r() * TAU) * amp / (i + 1); return y; }
    function hills(c, base, amp, ks, color, seed, y1) {
      c.fillStyle = color; c.beginPath(); c.moveTo(0, y1);
      for (var x = 0; x < TWd; x += 8) c.lineTo(x, hillY(x, base, amp, ks, seed));
      c.lineTo(TWd, hillY(TWd, base, amp, ks, seed)); c.lineTo(TWd, y1); c.closePath(); c.fill();
    }
    function wrap(x, span, fn) { fn(x); if (x - span < 0) fn(x + TWd); if (x + span > TWd) fn(x - TWd); }
    function dome(c, cx, base, r) {
      c.moveTo(cx - r, base);
      c.bezierCurveTo(cx - r * 1.15, base - r * 0.9, cx - r * 0.25, base - r * 1.25, cx, base - r * 1.6);
      c.bezierCurveTo(cx + r * 0.25, base - r * 1.25, cx + r * 1.15, base - r * 0.9, cx + r, base);
      c.closePath();
    }
    function mosque(c, cx, base, s, color, light) {
      c.fillStyle = color; c.beginPath();
      c.rect(cx - 60 * s, base - 34 * s, 120 * s, 34 * s); c.rect(cx - 30 * s, base - 50 * s, 60 * s, 18 * s);
      dome(c, cx, base - 48 * s, 28 * s);
      [-1, 1].forEach(function (k2) {
        var mx = cx + k2 * 74 * s;
        c.rect(mx - 5 * s, base - 96 * s, 10 * s, 96 * s); c.rect(mx - 8 * s, base - 70 * s, 16 * s, 4 * s); dome(c, mx, base - 96 * s, 6 * s);
      });
      c.fill();
      if (light) { c.fillStyle = light;
        for (var i = -2; i <= 2; i++) { c.beginPath(); c.rect(cx + i * 20 * s - 3 * s, base - 22 * s, 6 * s, 12 * s); c.arc(cx + i * 20 * s, base - 22 * s, 3 * s, Math.PI, 0); c.fill(); } }
    }
    function palm(c, x, base, hgt, color, lean) {
      c.strokeStyle = color; c.fillStyle = color; c.lineCap = 'round';
      var tx = x + hgt * lean, ty = base - hgt;
      c.lineWidth = hgt * 0.055; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + hgt * lean * 0.2, base - hgt * 0.55, tx, ty); c.stroke();
      for (var i = 0; i < 8; i++) {
        var a = -Math.PI / 2 + (i - 3.5) * 0.44, Lf = hgt * (0.4 + (i % 2) * 0.1);
        c.beginPath(); c.moveTo(tx, ty);
        c.quadraticCurveTo(tx + Math.cos(a) * Lf * 0.6, ty + Math.sin(a) * Lf * 0.6 - hgt * 0.1, tx + Math.cos(a) * Lf, ty + Math.sin(a) * Lf + hgt * 0.2);
        c.quadraticCurveTo(tx + Math.cos(a) * Lf * 0.45, ty + Math.sin(a) * Lf * 0.45, tx, ty); c.fill();
      }
      c.fillStyle = shade(color, 0.12);
      for (var q = 0; q < 5; q++) { c.beginPath(); c.arc(tx + (q - 2) * hgt * 0.018, ty + hgt * 0.05 + (q % 2) * hgt * 0.02, hgt * 0.018, 0, TAU); c.fill(); }
    }
    function cypress(c, x, base, hgt, color) {
      c.fillStyle = color; c.beginPath(); c.moveTo(x, base - hgt);
      c.bezierCurveTo(x + hgt * 0.16, base - hgt * 0.7, x + hgt * 0.15, base - hgt * 0.15, x + hgt * 0.04, base);
      c.lineTo(x - hgt * 0.04, base);
      c.bezierCurveTo(x - hgt * 0.15, base - hgt * 0.15, x - hgt * 0.16, base - hgt * 0.7, x, base - hgt); c.fill();
    }
    function haze(c, top, bottom, color, a) {
      var g = c.createLinearGradient(0, top, 0, bottom); g.addColorStop(0, rgba(color, 0)); g.addColorStop(1, rgba(color, a));
      c.fillStyle = g; c.fillRect(0, top, TWd, bottom - top);
    }
    // a tile layer: painted in design y coordinates, the canvas starts at y0
    function layer(key, y0, h, paint) {
      Kit.play.tex(scene, key, TWd, h, function (c) { c.translate(0, -y0); c.save(); c.beginPath(); c.rect(0, y0, TWd, h); c.clip(); paint(c); c.restore(); });
    }
    var R = rng(500 + wi * 91);

    // ---- sky: still, 3000 x 1140 units painted at half size ----
    Kit.play.tex(scene, k + 'sky', SKY.w / 2, SKY.h / 2, function (g) {
      g.scale(0.5, 0.5); g.translate(-SKY.x0, -SKY.y0);
      var gr = g.createLinearGradient(0, SKY.y0, 0, hz + 40);
      W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
      g.fillStyle = gr; g.fillRect(SKY.x0, SKY.y0, SKY.w, SKY.h);
      var sx = 1960 * (wi === 1 ? 0.78 : 0.7), sy = hz - Math.max(110, (hz - 150) * (wi === 0 ? 0.55 : 0.9)), sr = 62;
      var halo = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 5);
      halo.addColorStop(0, rgba(W.sun, wi === 1 ? 0.35 : 0.55)); halo.addColorStop(1, rgba(W.sun, 0));
      g.fillStyle = halo; g.fillRect(SKY.x0, SKY.y0, SKY.w, SKY.h);
      if (wi !== 2) { // stars
        var nst = wi === 1 ? 300 : 90;
        for (var i = 0; i < nst; i++) { var yy = SKY.y0 + R() * (hz - SKY.y0) * 0.95; g.globalAlpha = (0.25 + R() * 0.7) * Math.max(0, 1 - (yy - SKY.y0) / (hz - SKY.y0)) * (wi === 1 ? 1 : 0.75);
          g.fillStyle = '#fff'; g.beginPath(); g.arc(SKY.x0 + R() * SKY.w, yy, (R() * 1.6 + 0.8) * 1.4, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      var body = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
      body.addColorStop(0, '#ffffff'); body.addColorStop(1, W.sun);
      g.fillStyle = body; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
      if (wi === 0) { // thin dusk clouds across the sun
        for (var c2 = 0; c2 < 8; c2++) { var cx0 = SKY.x0 + R() * SKY.w, cy0 = hz * (0.25 + R() * 0.6), cw0 = 130 + R() * 280, ch0 = 5 + R() * 8;
          var cgr = g.createLinearGradient(cx0 - cw0, 0, cx0 + cw0, 0); cgr.addColorStop(0, 'rgba(255,190,170,0)'); cgr.addColorStop(0.5, 'rgba(255,200,180,.32)'); cgr.addColorStop(1, 'rgba(255,190,170,0)');
          g.fillStyle = cgr; g.beginPath(); g.ellipse(cx0, cy0, cw0, ch0, 0, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe2a0'; // a few dust motes in the last light
        for (var m = 0; m < 26; m++) { g.globalAlpha = 0.25 + R() * 0.35; g.beginPath(); g.arc(SKY.x0 + R() * SKY.w, hz * (0.3 + R() * 0.9), 2 + R() * 2, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      if (wi === 2) { // puffy clouds, gulls and the sea
        for (var cl = 0; cl < 6; cl++) {
          var cx = SKY.x0 + R() * SKY.w, cy = hz * (0.2 + R() * 0.5), cs = 70 + R() * 90;
          g.fillStyle = 'rgba(255,255,255,.75)';
          for (var q = 0; q < 5; q++) { g.beginPath(); g.arc(cx + (q - 2) * cs * 0.6, cy - Math.sin(q / 4 * Math.PI) * cs * 0.5, cs * (0.5 + Math.sin(q / 4 * Math.PI) * 0.35), 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(160,200,230,.35)'; g.beginPath(); g.ellipse(cx, cy + cs * 0.25, cs * 1.5, cs * 0.18, 0, 0, TAU); g.fill();
        }
        g.strokeStyle = '#2f5a78'; g.lineWidth = 3.4; g.lineCap = 'round'; g.globalAlpha = 0.65;
        for (var gl = 0; gl < 5; gl++) { var gx = SKY.x0 + R() * SKY.w, gy = 60 + R() * 250, a = 0.8 + R() * 0.9;
          g.beginPath(); g.moveTo(gx - 17 * a, gy - 2); g.quadraticCurveTo(gx - 7 * a, gy - 11 * a, gx, gy); g.quadraticCurveTo(gx + 7 * a, gy - 11 * a, gx + 17 * a, gy - 2); g.stroke(); }
        g.globalAlpha = 1;
        var sea = g.createLinearGradient(0, hz, 0, rail);
        sea.addColorStop(0, '#5fb9cf'); sea.addColorStop(0.5, '#2c96b3'); sea.addColorStop(1, '#1b7795');
        g.fillStyle = sea; g.fillRect(SKY.x0, hz, SKY.w, SKY.y0 + SKY.h - hz);
        for (var l = 0; l < 130; l++) { var ly = hz + Math.pow(R(), 1.4) * (rail - hz), lw = (14 + R() * 70) * (1 + (ly - hz) / (rail - hz + 1));
          g.strokeStyle = 'rgba(255,255,255,' + (0.15 + R() * 0.4) + ')'; g.lineWidth = 3;
          var lx = SKY.x0 + R() * SKY.w; g.beginPath(); g.moveTo(lx - lw, ly); g.lineTo(lx + lw, ly); g.stroke(); }
        g.fillStyle = 'rgba(255,250,220,.25)';
        for (var sp = 0; sp < 14; sp++) { var py = hz + (sp + 1) * (rail - hz) / 16; g.fillRect(sx - (24 + sp * 10) * R(), py, (46 + sp * 20) * R(), 5); }
      }
    });

    // ---- far layer ----
    layer(k + 'far', LAY.far.y0, LAY.far.h, function (f) {
      if (wi === 0) {
        hills(f, hz - 14, 46, [1, 3, 5], W.far, 11, hz + 90);
        [0.18, 0.62].forEach(function (u) { wrap(u * TWd, 380, function (x) { mosque(f, x, hillY(x, hz - 14, 46, [1, 3, 5], 11) + 14, 1.5, W.far, null); }); });
        hills(f, hz + 24, 30, [2, 3, 7], W.far2, 12, hz + 90);
        haze(f, hz - 200, hz + 60, W.sky[4], 0.45);
      } else if (wi === 1) {
        hills(f, hz - 10, 56, [1, 2, 5], W.far, 21, hz + 90);
        [0.3, 0.8].forEach(function (u) { wrap(u * TWd, 380, function (x) { mosque(f, x, hillY(x, hz - 10, 56, [1, 2, 5], 21) + 18, 1.6, W.far, 'rgba(255,210,130,.75)'); }); });
        hills(f, hz + 32, 36, [2, 4, 6], W.far2, 22, hz + 90);
        haze(f, hz - 160, hz + 70, W.sky[3], 0.35);
      } else { // islands with a little whitewashed town, and two sailing dhows
        for (var is = 0; is < 3; is++) {
          var ix = (is + 0.3) / 3 * TWd, iw = (70 + is * 30) * S, ih = (16 + is * 4) * S, houses = [];
          for (var hh = 0; hh < 4 + is; hh++) houses.push({ dx: (R() - 0.5) * iw * 1.1, w: (9 + R() * 9) * S, h: (6 + R() * 9) * S, dome: R() < 0.3, tower: R() < 0.2 });
          houses.sort(function (a, b) { return b.h - a.h; });
          wrap(ix, iw * 1.3, function (x) {
            f.fillStyle = W.far; f.beginPath(); f.ellipse(x, hz + 5, iw * 1.25, ih, 0, Math.PI, 0); f.fill();
            houses.forEach(function (h) {
              var hx = x + h.dx, base = hz + 5 - ih * Math.sqrt(Math.max(0, 1 - Math.pow(h.dx / (iw * 1.25), 2))) + 3 * S;
              f.fillStyle = '#eef2ea'; f.fillRect(hx - h.w / 2, base - h.h, h.w, h.h);
              f.fillStyle = 'rgba(90,130,150,.35)'; f.fillRect(hx + h.w * 0.15, base - h.h, h.w * 0.35, h.h);
              f.fillStyle = 'rgba(70,110,130,.55)'; f.fillRect(hx - h.w * 0.2, base - h.h * 0.55, h.w * 0.14, h.h * 0.22);
              if (h.dome) { f.fillStyle = '#8fb7c8'; f.beginPath(); f.arc(hx, base - h.h, h.w * 0.32, Math.PI, 0); f.fill(); }
              if (h.tower) { f.fillStyle = '#eef2ea'; f.fillRect(hx - h.w * 0.4, base - h.h - 12 * S, 4 * S, 12 * S); }
            });
          });
        }
        [0.45, 0.9].forEach(function (u, k2) {
          wrap(u * TWd, 160, function (x) {
            var by = hz + (8 + k2 * 14) * S, s = (0.8 + k2 * 0.35) * S;
            f.fillStyle = '#5a4030'; f.beginPath(); f.moveTo(x - 26 * s, by); f.lineTo(x + 30 * s, by); f.lineTo(x + 20 * s, by + 8 * s); f.lineTo(x - 18 * s, by + 8 * s); f.closePath(); f.fill();
            f.fillStyle = '#fffaf0'; f.beginPath(); f.moveTo(x, by - 2 * s); f.lineTo(x - 2 * s, by - 44 * s); f.quadraticCurveTo(x + 22 * s, by - 26 * s, x + 26 * s, by - 4 * s); f.closePath(); f.fill();
            f.strokeStyle = '#5a4030'; f.lineWidth = 1.5 * s; f.beginPath(); f.moveTo(x, by); f.lineTo(x - 2 * s, by - 46 * s); f.stroke();
          });
        });
      }
    });

    // ---- mid layer: the trees or arcade beside the rail ----
    var gTop = rail - P0 * 0.05;
    layer(k + 'mid', LAY.mid.y0, LAY.mid.h, function (m) {
      if (wi === 0) {
        hills(m, gTop - 36, 42, [1, 2, 4], W.mid, 31, rail + 20);
        var nP = Math.max(3, Math.round(TWd / (260 * S)));
        for (var pi = 0; pi < nP; pi++) {
          var px = (pi + 0.5) / nP * TWd + (R() - 0.5) * 150, ph = (110 + R() * 70) * S * 0.8, lean = (R() - 0.5) * 0.3;
          wrap(px, ph, function (x) { var by = hillY(x, gTop - 36, 42, [1, 2, 4], 31) + 12; palm(m, x, by, ph, W.mid, lean); palm(m, x + 100, by + 8, ph * 0.7, W.mid, 0.12); });
        }
      } else if (wi === 1) { // a garden arcade with glowing lanterns, cypress trees in front
        var SA = Math.min(S, (gTop - hz) * 0.62 / 120);
        var aw = 64 * SA, top = gTop - 120 * SA, nA = Math.max(4, Math.round(TWd / aw)); aw = TWd / nA;
        m.fillStyle = W.mid; m.fillRect(0, top - 16 * SA, TWd, 18 * SA);
        for (var a = 0; a < nA; a++) {
          var ax = a * aw;
          m.fillStyle = W.mid; m.fillRect(ax, top, 9 * SA, gTop - top + 8);
          m.beginPath(); m.moveTo(ax + 9 * SA, top); m.lineTo(ax + aw, top); m.lineTo(ax + aw, top + 26 * SA);
          m.quadraticCurveTo(ax + aw - 2 * SA, top + 6 * SA, ax + 9 * SA + (aw - 9 * SA) / 2, top + 2 * SA);
          m.quadraticCurveTo(ax + 11 * SA, top + 6 * SA, ax + 9 * SA, top + 26 * SA); m.closePath(); m.fill();
          m.fillStyle = 'rgba(255,225,170,.22)'; star8(m, ax + aw / 2 + 4 * SA, top - 7 * SA, 4.5 * SA); m.fill();
          var lx = ax + 4.5 * SA + aw / 2, ly = top + 26 * SA;
          m.strokeStyle = 'rgba(255,220,160,.5)'; m.lineWidth = 2; m.beginPath(); m.moveTo(lx, top + 4 * SA); m.lineTo(lx, ly - 6 * SA); m.stroke();
          var lg = m.createRadialGradient(lx, ly, 0, lx, ly, 26 * SA); lg.addColorStop(0, 'rgba(255,200,110,.55)'); lg.addColorStop(1, 'rgba(255,200,110,0)');
          m.fillStyle = lg; m.fillRect(lx - 26 * SA, ly - 26 * SA, 52 * SA, 52 * SA);
          m.fillStyle = '#ffd27a'; m.beginPath(); m.moveTo(lx - 4 * SA, ly - 6 * SA); m.lineTo(lx + 4 * SA, ly - 6 * SA); m.lineTo(lx + 6 * SA, ly + 3 * SA); m.lineTo(lx, ly + 8 * SA); m.lineTo(lx - 6 * SA, ly + 3 * SA); m.closePath(); m.fill();
        }
        var nC = Math.max(4, Math.round(TWd / (120 * SA)));
        for (var ci = 0; ci < nC; ci++) { var cxp = (ci + 0.5) / nC * TWd, chh = (90 + R() * 70) * Math.min(S, SA * 1.2); wrap(cxp, chh * 0.2, function (x) { cypress(m, x, gTop + 8, chh, shade(W.mid, -0.25)); }); }
        for (var ff = 0; ff < 40; ff++) { // fireflies, still
          var fx = R() * TWd, fy = hz + 20 + R() * (rail - hz - 10), fg = m.createRadialGradient(fx, fy, 0, fx, fy, 22 + R() * 12);
          fg.addColorStop(0, 'rgba(255,240,140,.9)'); fg.addColorStop(1, 'rgba(255,240,140,0)'); m.fillStyle = fg; m.beginPath(); m.arc(fx, fy, 34, 0, TAU); m.fill();
        }
      } else { // shore line and palms
        m.fillStyle = shade(W.ground[0], 0.1); m.beginPath(); m.moveTo(0, rail + 20);
        for (var x2 = 0; x2 <= TWd + 8; x2 += 8) m.lineTo(Math.min(x2, TWd), gTop - 20 - Math.sin(TAU * 3 * Math.min(x2, TWd) / TWd) * 8);
        m.lineTo(TWd, rail + 20); m.fill();
        m.strokeStyle = 'rgba(255,255,255,.7)'; m.lineWidth = 4; m.beginPath();
        for (var x3 = 0; x3 <= TWd + 8; x3 += 8) m.lineTo(Math.min(x3, TWd), gTop - 23 - Math.sin(TAU * 3 * Math.min(x3, TWd) / TWd) * 8);
        m.stroke();
        var nP2 = Math.max(2, Math.round(TWd / (300 * S)));
        for (var p2 = 0; p2 < nP2; p2++) { var pxx = (p2 + 0.3) / nP2 * TWd, phh = (120 + R() * 50) * S * 0.75; wrap(pxx, phh, function (x) { palm(m, x, gTop + 4, phh, W.mid, 0.18); palm(m, x - 80, gTop + 4, phh * 0.75, shade(W.mid, 0.1), -0.15); }); }
      }
    });

    // ---- ground + rail ----
    layer(k + 'ground', LAY.ground.y0, LAY.ground.h, function (gg) {
      var groundTop = rail + P0 * 0.02, yEnd = LAY.ground.y0 + LAY.ground.h;
      var gl = gg.createLinearGradient(0, groundTop, 0, yEnd);
      gl.addColorStop(0, W.ground[0]); gl.addColorStop(0.35, W.ground[1]); gl.addColorStop(1, W.ground[2]);
      gg.fillStyle = gl; gg.fillRect(0, groundTop, TWd, yEnd - groundTop);
      var R2 = rng(77 + wi);
      if (wi === 0 || wi === 2) { // sand ripples and shells
        gg.strokeStyle = wi === 0 ? 'rgba(255,220,170,.35)' : 'rgba(255,255,255,.4)'; gg.lineWidth = 3.4; gg.lineCap = 'round';
        for (var rp = 0; rp < 70; rp++) { var rx = R2() * TWd, ry = groundTop + P0 * 0.4 + R2() * (yEnd - groundTop - P0 * 0.4), rw = 30 + R2() * 70;
          wrap(rx, rw, function (x) { gg.beginPath(); gg.moveTo(x - rw, ry); gg.quadraticCurveTo(x, ry - 10, x + rw, ry); gg.stroke(); }); }
        for (var sh = 0; sh < 30; sh++) { var shx = R2() * TWd, shy = groundTop + P0 * 0.4 + R2() * (yEnd - groundTop - P0 * 0.4), shr = 4 + R2() * 6;
          gg.fillStyle = wi === 2 ? ['#ffffff', '#ffd1c4', '#f8e2b0'][sh % 3] : 'rgba(120,60,40,.35)';
          gg.beginPath(); gg.ellipse(shx, shy, shr * 1.3, shr, 0, 0, TAU); gg.fill(); }
      } else { // grass blades and little flowers
        for (var gb = 0; gb < 190; gb++) { var gx = R2() * TWd, gy = groundTop + P0 * 0.4 + R2() * (yEnd - groundTop - P0 * 0.4), gh = 10 + R2() * 20;
          gg.strokeStyle = 'rgba(120,200,140,' + (0.15 + R2() * 0.25) + ')'; gg.lineWidth = 3;
          gg.beginPath(); gg.moveTo(gx, gy); gg.lineTo(gx + (R2() - 0.5) * 12, gy - gh); gg.stroke(); }
        for (var fl = 0; fl < 60; fl++) { gg.fillStyle = ['#ff9fbf', '#ffffff', '#ffe08a', '#c8b0ff'][fl % 4]; gg.globalAlpha = 0.85;
          gg.beginPath(); gg.arc(R2() * TWd, groundTop + P0 * 0.4 + R2() * (yEnd - groundTop - P0 * 0.4), 3 + R2() * 4, 0, TAU); gg.fill(); }
        gg.globalAlpha = 1;
      }
      var bTop = rail + P0 * 0.03, bBot = rail + P0 * 0.17;
      var bg = gg.createLinearGradient(0, bTop, 0, bBot); bg.addColorStop(0, shade(W.ballast, 0.15)); bg.addColorStop(1, shade(W.ballast, -0.2));
      gg.fillStyle = bg; gg.fillRect(0, bTop, TWd, bBot - bTop);
      gg.fillStyle = 'rgba(0,0,0,.18)'; gg.fillRect(0, bBot, TWd, 6);
      for (var st = 0; st < TWd / 6; st++) { gg.fillStyle = R2() < 0.5 ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)'; gg.beginPath(); gg.arc(R2() * TWd, bTop + R2() * (bBot - bTop), 1.6 + R2() * 2.8, 0, TAU); gg.fill(); }
      var nS = Math.round(TWd / (P0 * 0.34)), sp2 = TWd / nS, swd = P0 * 0.15;     // sleepers: the spacing divides the tile, so it wraps
      for (var s2 = 0; s2 < nS; s2++) {
        var sxx = s2 * sp2;
        gg.fillStyle = W.sleeper; rr(gg, sxx, rail + P0 * 0.025, swd, P0 * 0.055, 4); gg.fill();
        gg.fillStyle = 'rgba(255,255,255,.12)'; gg.fillRect(sxx + 2, rail + P0 * 0.027, swd - 4, P0 * 0.012);
      }
      var rh = Math.max(6, P0 * 0.035), rg = gg.createLinearGradient(0, rail, 0, rail + rh);
      rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.35, W.rail); rg.addColorStop(1, shade(W.rail, -0.45));
      gg.fillStyle = rg; gg.fillRect(0, rail, TWd, rh);
      gg.fillStyle = 'rgba(0,0,0,.25)'; gg.fillRect(0, rail + rh, TWd, 3);
    });

    // ---- near plants along the bottom edge (a tile; play.js puts it at the bottom of the screen) ----
    layer(k + 'near', LAY.near.y0, LAY.near.h, function (c) {
      var n = 16, span = TWd / n, R3 = rng(900 + wi);
      c.fillStyle = W.near;
      for (var i = 0; i < n; i++) {
        var base = (i + 0.5) * span, hgt = 42 + R3() * 62, y = LAY.near.h + 6;
        for (var b = 0; b < 5; b++) {
          var bx = base + (b - 2) * 14, bh = hgt * (0.6 + ((b * 37) % 10) / 20);
          c.beginPath(); c.moveTo(bx - 7, y); c.quadraticCurveTo(bx + (b - 2) * 9, y - bh * 0.6, bx + (b - 2) * 16, y - bh); c.quadraticCurveTo(bx + (b - 2) * 5, y - bh * 0.5, bx + 7, y); c.fill();
        }
      }
    });
    return k;
  };
  A.BAKE = /[?&]bake\b/.test(location.search);
  // forget a world's backdrop (a new world starts)
  A.dropWorld = function (scene, wi) {
    ['sky', 'far', 'mid', 'ground', 'near', 'wheel', 'wag0', 'wag1', 'eng', 'pad'].forEach(function (n) { if (scene.textures.exists('w' + wi + '-' + n)) scene.textures.remove('w' + wi + '-' + n); });
  };

  // ---------- the pieces ----------
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
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (var i = 0; i < 6; i++) { g.save(); g.rotate(i * TAU / 6); g.beginPath(); g.ellipse(0, -R * 0.25, R * 0.09, R * 0.22, 0, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = t.d; g.beginPath(); g.arc(0, 0, R * 0.1, 0, TAU); g.fill();
    },
    arch: function (g, R, t) {
      var w = R * 0.78, b = R * 0.95, sp = -R * 0.15;
      var path = function (k) {
        var ww = w * k, top = -R * (0.15 + 0.85 * k);
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
      g.strokeStyle = gold.k; g.lineWidth = R * 0.08; g.beginPath(); g.arc(0, -R * 0.9, R * 0.1, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(-R * 0.3, -R * 0.52); g.quadraticCurveTo(0, -R * 0.95, R * 0.3, -R * 0.52); g.closePath(); fillShaded(g, R, gold);
      var body = function () { g.beginPath(); g.moveTo(-R * 0.36, -R * 0.5); g.lineTo(R * 0.36, -R * 0.5); g.lineTo(R * 0.56, R * 0.05); g.lineTo(R * 0.36, R * 0.6); g.lineTo(-R * 0.36, R * 0.6); g.lineTo(-R * 0.56, R * 0.05); g.closePath(); };
      body(); var bg = g.createRadialGradient(0, R * 0.05, 0, 0, R * 0.05, R * 0.6); bg.addColorStop(0, '#fffbe0'); bg.addColorStop(0.45, t.l); bg.addColorStop(1, t.b);
      g.fillStyle = bg; g.fill(); g.lineWidth = R * 0.08; g.strokeStyle = gold.k; g.stroke();
      g.strokeStyle = gold.b; g.lineWidth = R * 0.06;
      g.beginPath(); g.moveTo(0, -R * 0.5); g.lineTo(0, R * 0.6); g.moveTo(-R * 0.56, R * 0.05); g.lineTo(R * 0.56, R * 0.05); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)'; star8(g, 0, R * 0.05, R * 0.15, 0.5); g.fill();
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
    tile: function (g, R, t) {   // a square tile, one corner half coloured: turning it is easy to see
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
  var COUNT_POS = {   // n small items laid out like dice, for the counting pieces
    1: [[0, 0]], 2: [[-0.42, 0], [0.42, 0]], 3: [[0, -0.42], [-0.42, 0.34], [0.42, 0.34]],
    4: [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]], 5: [[-0.44, -0.44], [0.44, -0.44], [0, 0], [-0.44, 0.44], [0.44, 0.44]],
    6: [[-0.44, -0.5], [0.44, -0.5], [-0.44, 0.5], [0.44, 0.5], [-0.44, 0], [0.44, 0]]
  };
  COUNT_POS[6] = [[-0.44, -0.5], [0.44, -0.5], [-0.44, 0], [0.44, 0], [-0.44, 0.5], [0.44, 0.5]];
  // one piece { s, c, n } painted once in a box of A.S0 units; the image is turned by its own rotation
  A.pieceKey = function (p) { return 'p|' + p.s + '|' + p.c + '|' + (p.n || 1); };
  A.piece = function (scene, p) {
    var key = A.pieceKey(p), S0 = A.S0, pad = Math.ceil(S0 * 0.12);
    var k2 = Kit.play.tex(scene, key, S0, S0, function (g) {
      g.translate(S0 / 2, S0 / 2);
      var t = tone(p.c), R = S0 * 0.44, draw = DRAW[p.s] || DRAW.star;
      if ((p.n || 1) > 1 || p.s === 'date') {                     // counting pieces sit on a cream plate so the group reads as one thing
        var pr = S0 * 0.47;
        g.fillStyle = 'rgba(40,20,10,.25)'; g.beginPath(); g.arc(0, pr * 0.06, pr, 0, TAU); g.fill();
        var pg = g.createRadialGradient(-pr * 0.3, -pr * 0.4, 0, 0, 0, pr); pg.addColorStop(0, '#fffdf4'); pg.addColorStop(1, '#f1dfb8');
        g.fillStyle = pg; g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.fill();
        g.strokeStyle = '#d6a64a'; g.lineWidth = Math.max(1.5, pr * 0.07); g.stroke();
        g.strokeStyle = 'rgba(214,166,74,.45)'; g.lineWidth = Math.max(1, pr * 0.03); g.beginPath(); g.arc(0, 0, pr * 0.84, 0, TAU); g.stroke();
        var n = p.n || 1, pos = COUNT_POS[n] || COUNT_POS[1], ir = n === 1 ? R * 0.55 : n <= 2 ? R * 0.34 : n <= 4 ? R * 0.29 : R * 0.24;
        pos.forEach(function (q) { g.save(); g.translate(q[0] * pr * 0.95, q[1] * pr * 0.95); draw(g, ir, t); g.restore(); });
      } else draw(g, R, t);
    }, pad);
    if (Kit.play.bakeOut) delete Kit.play.bakeOut[key];      // ~100 combinations, a level uses a dozen: painted live, never baked (memory)
    return k2;
  };
  A.piecePad = Math.ceil(240 * 0.12);

  // ---------- the choice pad: a glowing medallion the piece sits on ----------
  A.pad = function (scene, wi) {
    var C = 300, pad = Math.ceil(C * 0.15);
    return Kit.play.tex(scene, 'w' + wi + '-pad', C, C, function (g) {
      g.translate(C / 2, C / 2);
      var r = C / 2, W = A.WORLDS[wi];
      g.fillStyle = 'rgba(10,5,25,.3)'; g.beginPath(); g.ellipse(0, r * 0.92, r * 0.86, r * 0.2, 0, 0, TAU); g.fill();
      var ring = g.createLinearGradient(0, -r, 0, r); ring.addColorStop(0, '#ffe7a6'); ring.addColorStop(0.5, '#e6a73c'); ring.addColorStop(1, '#9a5a1a');
      g.fillStyle = ring; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      var inner = g.createRadialGradient(0, -r * 0.3, 0, 0, 0, r * 0.88);
      inner.addColorStop(0, shade(W.wagon, -0.1)); inner.addColorStop(1, shade(W.wagon, -0.55));
      g.fillStyle = inner; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.clip();
      g.strokeStyle = 'rgba(255,230,170,.16)'; g.lineWidth = Math.max(1, r * 0.03);
      star8(g, 0, 0, r * 0.7, 0.7); g.stroke(); star8(g, 0, 0, r * 0.42, 0.7, Math.PI / 8); g.stroke();
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8; g.beginPath(); g.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.22, 0, TAU); g.stroke(); }
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = Math.max(1, r * 0.03); g.beginPath(); g.arc(0, 0, r * 0.95, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
    }, pad);
  };
  A.padPad = Math.ceil(300 * 0.15);

  // ---------- the train (painted at the reference pitch P0) ----------
  // Geometry relative to the rail line and pitch P (the same numbers the old page used).
  A.trainGeom = function (P) {
    var wr = P * 0.12, bodyBottom = -wr * 1.3, bodyH = P * 0.3, ps = P * 0.8;
    return { wr: wr, bodyBottom: bodyBottom, bodyTop: bodyBottom - bodyH, bodyW: P * 0.86, ps: ps,
      pieceY: bodyBottom - bodyH - ps * 0.5 - P * 0.02, engineW: P * 1.32 };
  };
  // Engine wheel positions (x from the engine's left end) and radii.
  A.engineWheels = function (P) { return [[P * 0.2, P * 0.11], [P * 0.58, P * 0.17], [P * 0.94, P * 0.17], [P * 1.2, P * 0.1]]; };

  // returns keys { wag0, wag1, eng, wheel } with the pad each was painted with (origins are on the images)
  A.train = function (scene, wi) {
    var P = P0, G = A.trainGeom(P), W = A.WORLDS[wi], k = 'w' + wi + '-';
    var out = { wag0: k + 'wag0', wag1: k + 'wag1', eng: k + 'eng', wheel: k + 'wheel' };
    // wagon body (no wheels): a lacquered flat car with a gold star frieze. Origin = wagon centre on the rail.
    [0, 1].forEach(function (alt) {
      var pad = Math.ceil(P * 0.08), bw = G.bodyW, bh = G.bodyBottom - G.bodyTop;
      Kit.play.tex(scene, out['wag' + alt], P, P * 0.6, function (g) {
        g.translate(P / 2, P * 0.6);
        var col = alt ? W.wagon2 : W.wagon, t = tone(col);
        g.fillStyle = '#2a1d2a'; rr(g, -bw * 0.48, G.bodyBottom - P * 0.02, bw * 0.96, P * 0.07, P * 0.02); g.fill();
        var x = -bw / 2, y = G.bodyTop;
        rr(g, x, y, bw, bh, P * 0.06);
        var gr = g.createLinearGradient(0, y, 0, y + bh); gr.addColorStop(0, t.l); gr.addColorStop(0.35, t.b); gr.addColorStop(1, t.d);
        g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1, P * 0.02); g.strokeStyle = t.k; g.stroke();
        g.fillStyle = W.trim; rr(g, x - P * 0.015, y - P * 0.02, bw + P * 0.03, P * 0.05, P * 0.025); g.fill();
        g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + P * 0.02, y - P * 0.012, bw - P * 0.04, P * 0.012);
        g.strokeStyle = rgba(W.trim, 0.8); g.lineWidth = Math.max(1, P * 0.014); rr(g, x + P * 0.05, y + P * 0.06, bw - P * 0.1, bh - P * 0.1, P * 0.03); g.stroke();
        g.fillStyle = W.trim; star8(g, 0, y + bh * 0.55, bh * 0.28, 0.55); g.fill();
        g.fillStyle = shade(col, -0.35); star8(g, 0, y + bh * 0.55, bh * 0.11, 0.55); g.fill();
        [-1, 1].forEach(function (k2) { g.fillStyle = rgba(W.trim, 0.85); g.beginPath(); var dx = k2 * bw * 0.3, dy = y + bh * 0.55, q = bh * 0.13;
          g.moveTo(dx, dy - q); g.lineTo(dx + q, dy); g.lineTo(dx, dy + q); g.lineTo(dx - q, dy); g.closePath(); g.fill(); });
      }, pad);
    });
    out.wagPad = Math.ceil(P * 0.08); out.wagOx = P / 2; out.wagOy = P * 0.6;

    // the steam engine facing right. Origin = left end of the engine on the rail.
    (function () {
      var pad = Math.ceil(P * 0.1), EW = G.engineW;
      Kit.play.tex(scene, out.eng, EW, P * 1.25, function (g) {
        g.translate(0, P * 1.25);
        var bb = G.bodyBottom, eng = tone(W.engine), cab = tone(W.cab), gold = tone('#e9b14a');
        g.fillStyle = '#231824'; rr(g, P * 0.02, bb - P * 0.03, EW - P * 0.06, P * 0.08, P * 0.02); g.fill();
        g.fillStyle = '#3a2a30'; g.beginPath(); g.moveTo(EW - P * 0.12, bb - P * 0.03); g.lineTo(EW + P * 0.02, bb + P * 0.08); g.lineTo(EW - P * 0.16, bb + P * 0.08); g.closePath(); g.fill();
        var bx0 = P * 0.44, bx1 = EW - P * 0.1, by0 = bb - P * 0.5, by1 = bb - P * 0.04, bh = by1 - by0;
        rr(g, bx0, by0, bx1 - bx0, bh, bh * 0.45);
        var bgr = g.createLinearGradient(0, by0, 0, by1); bgr.addColorStop(0, eng.l); bgr.addColorStop(0.3, eng.b); bgr.addColorStop(1, eng.k);
        g.fillStyle = bgr; g.fill(); g.lineWidth = Math.max(1, P * 0.018); g.strokeStyle = eng.k; g.stroke();
        [0.25, 0.55, 0.85].forEach(function (u) { g.fillStyle = W.trim; g.fillRect(bx0 + (bx1 - bx0) * u - P * 0.018, by0 + P * 0.01, P * 0.036, bh - P * 0.02); });
        rr(g, bx1 - P * 0.02, by0 + P * 0.03, P * 0.1, bh - P * 0.06, P * 0.04); g.fillStyle = '#2a2030'; g.fill();
        var lg = g.createRadialGradient(bx1 + P * 0.06, by0 + P * 0.04, 0, bx1 + P * 0.06, by0 + P * 0.04, P * 0.26);
        lg.addColorStop(0, 'rgba(255,240,180,.85)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = lg; g.beginPath(); g.arc(bx1 + P * 0.06, by0 + P * 0.04, P * 0.26, 0, TAU); g.fill();
        g.fillStyle = '#fff3c4'; rr(g, bx1, by0 - P * 0.04, P * 0.1, P * 0.08, P * 0.03); g.fill(); g.strokeStyle = gold.k; g.lineWidth = Math.max(1, P * 0.012); g.stroke();
        var cx = bx1 - P * 0.2;
        g.beginPath(); g.moveTo(cx - P * 0.07, by0 + P * 0.02); g.lineTo(cx - P * 0.06, by0 - P * 0.22); g.lineTo(cx - P * 0.11, by0 - P * 0.32); g.lineTo(cx + P * 0.11, by0 - P * 0.32); g.lineTo(cx + P * 0.06, by0 - P * 0.22); g.lineTo(cx + P * 0.07, by0 + P * 0.02); g.closePath();
        var cg = g.createLinearGradient(cx - P * 0.1, 0, cx + P * 0.1, 0); cg.addColorStop(0, eng.k); cg.addColorStop(0.4, eng.l); cg.addColorStop(1, eng.k);
        g.fillStyle = cg; g.fill(); g.fillStyle = W.trim; g.fillRect(cx - P * 0.115, by0 - P * 0.34, P * 0.23, P * 0.04);
        var dx = bx0 + (bx1 - bx0) * 0.42;
        g.beginPath(); g.moveTo(dx - P * 0.09, by0 + P * 0.02); g.quadraticCurveTo(dx - P * 0.09, by0 - P * 0.14, dx, by0 - P * 0.14); g.quadraticCurveTo(dx + P * 0.09, by0 - P * 0.14, dx + P * 0.09, by0 + P * 0.02); g.closePath();
        var dg = g.createLinearGradient(0, by0 - P * 0.14, 0, by0); dg.addColorStop(0, gold.l); dg.addColorStop(1, gold.d); g.fillStyle = dg; g.fill();
        var c0 = P * 0.02, c1 = P * 0.5, ct = bb - P * 0.86;                 // the cab, with an arched, lit window (a warm empty window)
        g.beginPath(); g.moveTo(c0, bb - P * 0.03); g.lineTo(c0, ct + P * 0.08); g.lineTo(c1, ct + P * 0.08); g.lineTo(c1, bb - P * 0.03); g.closePath();
        var kg = g.createLinearGradient(0, ct, 0, bb); kg.addColorStop(0, cab.l); kg.addColorStop(0.4, cab.b); kg.addColorStop(1, cab.d);
        g.fillStyle = kg; g.fill(); g.lineWidth = Math.max(1, P * 0.018); g.strokeStyle = cab.k; g.stroke();
        g.beginPath(); g.moveTo(c0 - P * 0.05, ct + P * 0.09); g.quadraticCurveTo((c0 + c1) / 2, ct - P * 0.04, c1 + P * 0.05, ct + P * 0.09); g.lineTo(c1 + P * 0.05, ct + P * 0.12); g.lineTo(c0 - P * 0.05, ct + P * 0.12); g.closePath();
        g.fillStyle = eng.b; g.fill(); g.strokeStyle = eng.k; g.stroke();
        var wx = (c0 + c1) / 2, wy = ct + P * 0.2, ww = P * 0.13, wh = P * 0.22;
        g.beginPath(); g.moveTo(wx - ww, wy + wh); g.lineTo(wx - ww, wy + P * 0.05); g.quadraticCurveTo(wx - ww, wy - P * 0.04, wx, wy - P * 0.06); g.quadraticCurveTo(wx + ww, wy - P * 0.04, wx + ww, wy + P * 0.05); g.lineTo(wx + ww, wy + wh); g.closePath();
        var wg = g.createLinearGradient(0, wy - P * 0.06, 0, wy + wh); wg.addColorStop(0, '#fff3c4'); wg.addColorStop(1, '#f5b04a');
        g.fillStyle = wg; g.fill(); g.lineWidth = Math.max(1.5, P * 0.025); g.strokeStyle = W.trim; g.stroke();
        g.fillStyle = W.trim; star8(g, wx, bb - P * 0.18, P * 0.07, 0.55); g.fill();
        g.fillStyle = cab.d; g.beginPath(); g.arc(wx, bb - P * 0.18, P * 0.025, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = P * 0.02; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx0 + bh * 0.4, by0 + bh * 0.22); g.lineTo(bx1 - bh * 0.4, by0 + bh * 0.22); g.stroke();
      }, pad);
      out.engPad = pad; out.engOy = P * 1.25;
    })();

    // a spoked wheel of radius 60 units (shown at any radius by scale; it turns as an image)
    Kit.play.tex(scene, out.wheel, 120, 120, function (c) {
      var r = 60;
      c.translate(60, 60);
      c.fillStyle = '#20161f'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      c.fillStyle = shade(W.engine, 0.15); c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.fill();
      c.strokeStyle = W.trim; c.lineWidth = r * 0.14; c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.stroke();
      c.lineWidth = r * 0.11; c.beginPath();
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 4; c.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); c.lineTo(-Math.cos(a) * r * 0.75, -Math.sin(a) * r * 0.75); }
      c.stroke();
      c.fillStyle = W.trim; c.beginPath(); c.arc(0, 0, r * 0.24, 0, TAU); c.fill();
    });
    return out;
  };

  // praise words are frames of the ui sheet (cream letters, dark outline), a fixed width each so the sheet is the same on every device
  var WORD_PX = 100;
  A.WORDS = ['Yes!', 'Great!', 'Super!', 'Well done!', 'Nice!', 'Got it!', 'Perfect!'];
  A.word = function (scene, str) { return 'wd|' + str; };
  A.WORD_PX = WORD_PX;

  // ---------- interface pictures (painted once, 'ui-*' and 'ic-*'; white icons are tinted by the game) ----------
  // One sheet, 'ui', with a frame for every picture (docs: one atlas, a few draw calls). The cells are packed in rows in a
  // fixed order at a fixed size, so the painted sheet is the same on every device and tools/bake-art.js can bake it.
  A.ui = function (scene) {
    var tm = scene.textures, list = [];
    if (tm.exists('ui') && tm.get('ui').has('ui-plate')) return;
    var T = function (sc, key, w, h, paint, pad) { list.push({ key: key, w: w, h: h, paint: paint, pad: pad || 0 }); };
    // round dark plate under an icon: readable on any backdrop
    T(scene, 'ui-plate', 150, 150, function (c) {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(75, 79, 70, 0, TAU); c.fill();
      c.fillStyle = 'rgba(22,16,44,.9)'; c.beginPath(); c.arc(75, 75, 70, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.beginPath(); c.arc(75, 75, 68, 0, TAU); c.stroke();
    }, 14);
    // a bright round button (the main choice)
    T(scene, 'ui-big', 230, 230, function (c) {
      var g = c.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, '#ffe7a6'); g.addColorStop(0.55, '#f2b93d'); g.addColorStop(1, '#c4801c');
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.arc(115, 121, 112, 0, TAU); c.fill();
      c.fillStyle = g; c.beginPath(); c.arc(115, 115, 112, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath(); c.arc(115, 115, 104, Math.PI * 1.05, Math.PI * 1.7); c.stroke();
    }, 16);
    // a pill (nine-sliced across its width) and a card
    T(scene, 'ui-pill', 160, 150, function (c) {
      c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, 0, 4, 160, 146, 73); c.fill();
      c.fillStyle = 'rgba(22,16,44,.9)'; rr(c, 0, 0, 160, 146, 73); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; rr(c, 2, 2, 156, 142, 71); c.stroke();
    }, 12);
    T(scene, 'ui-card', 200, 200, function (c) {
      c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, 0, 10, 200, 190, 56); c.fill();
      c.fillStyle = 'rgba(30,22,62,.96)'; rr(c, 0, 0, 200, 190, 56); c.fill();
      c.strokeStyle = 'rgba(255,225,160,.75)'; c.lineWidth = 6; rr(c, 4, 4, 192, 182, 52); c.stroke();
    }, 16);
    // a level button, a ring, a glow for the next thing to touch
    T(scene, 'ui-lv', 140, 140, function (c) { c.fillStyle = '#fff'; rr(c, 0, 0, 140, 140, 36); c.fill(); });
    T(scene, 'ui-lvo', 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; rr(c, 4, 4, 132, 132, 33); c.stroke(); });
    T(scene, 'ui-ring', 200, 200, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 12; c.beginPath(); c.arc(100, 100, 90, 0, TAU); c.stroke(); }, 8);
    T(scene, 'ui-glow', 300, 300, function (c) {
      var g = c.createRadialGradient(150, 150, 30, 150, 150, 150); g.addColorStop(0, 'rgba(255,230,140,.85)'); g.addColorStop(1, 'rgba(255,230,140,0)');
      c.fillStyle = g; c.fillRect(0, 0, 300, 300);
    });
    T(scene, 'ui-dot', 64, 64, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 30, 0, TAU); c.fill(); });
    T(scene, 'ui-dash', 220, 220, function (c) {          // the empty wagon's dashed outline, with a faint fill
      c.fillStyle = 'rgba(255,255,255,.16)'; rr(c, 10, 10, 200, 200, 46); c.fill();
      c.setLineDash([26, 17]); c.lineWidth = 11; c.lineCap = 'round'; c.strokeStyle = '#fffaeb'; rr(c, 10, 10, 200, 200, 46); c.stroke();
    }, 6);
    T(scene, 'ui-shadow', 160, 60, function (c) { c.fillStyle = 'rgba(20,8,20,.4)'; c.beginPath(); c.ellipse(80, 30, 78, 26, 0, 0, TAU); c.fill(); }, 4);
    T(scene, 'ui-puff', 64, 64, function (c) {
      var g = c.createRadialGradient(24, 24, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0.2)');
      c.fillStyle = g; c.beginPath(); c.arc(32, 32, 30, 0, TAU); c.fill();
    });
    T(scene, 'ui-q', 120, 120, function (c) {            // the "?" in an empty wagon, painted once
      c.font = '900 100px ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(40,15,60,.5)'; c.fillText('?', 60, 66); c.fillStyle = '#fff'; c.fillText('?', 60, 62);
    });
    T(scene, 'ui-star', 64, 64, function (c) { c.fillStyle = '#fff'; star8(c, 32, 32, 30, 0.55); c.fill(); });
    // icons, 96 units, white
    var ic = function (name, paint) { T(scene, 'ic-' + name, 96, 96, function (c) { c.save(); c.scale(4, 4); c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round'; paint(c); c.restore(); }); };
    ic('pause', function (c) { rr(c, 6.5, 4.5, 4, 15, 1.4); c.fill(); rr(c, 13.5, 4.5, 4, 15, 1.4); c.fill(); });
    ic('exit', function (c) { c.save(); c.scale(1 / 4, 1 / 4); Kit.play.exitIcon(c, 96, '#ffffff', 2.6); c.restore(); });
    ic('close', function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); });
    ic('play', function (c) { c.beginPath(); c.moveTo(8, 4.5); c.lineTo(19, 12); c.lineTo(8, 19.5); c.closePath(); c.fill(); c.stroke(); });
    ic('next', function (c) { c.beginPath(); c.moveTo(4, 12); c.lineTo(19, 12); c.moveTo(13, 5.5); c.lineTo(19.5, 12); c.lineTo(13, 18.5); c.stroke(); });
    ic('retry', function (c) {
      c.beginPath(); c.arc(12, 12, 7.5, -Math.PI * 0.35, Math.PI * 1.35); c.stroke();
      c.beginPath(); c.moveTo(10.9, 4.1); c.lineTo(8.5, 8); c.lineTo(5.9, 3.4); c.closePath(); c.fill(); });
    ic('grid', function (c) { for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { rr(c, 4 + i * 6.2, 4 + j * 6.2, 4.4, 4.4, 1.2); c.fill(); } });
    ic('snd', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(8, 9.5); c.lineTo(13, 5); c.lineTo(13, 19); c.lineTo(8, 14.5); c.lineTo(4, 14.5); c.closePath(); c.fill(); c.beginPath(); c.arc(13, 12, 4.5, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 8.5, -0.9, 0.9); c.stroke(); });
    ic('mute', function (c) { c.beginPath(); c.moveTo(3, 9.5); c.lineTo(7, 9.5); c.lineTo(12, 5); c.lineTo(12, 19); c.lineTo(7, 14.5); c.lineTo(3, 14.5); c.closePath(); c.fill(); c.beginPath(); c.moveTo(15.5, 9); c.lineTo(21, 15); c.moveTo(21, 9); c.lineTo(15.5, 15); c.stroke(); });
    ic('lock', function (c) { rr(c, 5.5, 10.5, 13, 9, 2); c.fill(); c.beginPath(); c.arc(12, 10.5, 4, Math.PI, 0); c.stroke(); });
    ic('tick', function (c) { c.lineWidth = 3.4; c.beginPath(); c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19, 7); c.stroke(); });
    ic('hand', function (c) {                                            // a hand that shows what to do (the old tutorial's)
      c.translate(0.5, 0.5); c.scale(1, 1);
      var hp = new Path2D('M9 11V4.5a1.5 1.5 0 0 1 3 0V10l.1-1.6a1.5 1.5 0 0 1 3 .2V11l.2-.9a1.4 1.4 0 0 1 2.8.5V15c0 3.3-2.4 6-5.6 6h-1a5.6 5.6 0 0 1-4.6-2.5l-2.6-4a1.5 1.5 0 0 1 2.4-1.8L9 15z');
      c.fillStyle = '#fff'; c.fill(hp); c.lineWidth = 1.1; c.strokeStyle = '#2a1a4a'; c.stroke(hp);
    });
    ic('cursor', function (c) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(7, 3); c.lineTo(7, 18); c.lineTo(11, 14.5); c.lineTo(14, 21); c.lineTo(16.5, 19.8); c.lineTo(13.6, 13.4); c.lineTo(18.5, 13); c.closePath(); c.fill(); });
    // the praise words
    A.WORDS.forEach(function (str) {
      var w = Math.ceil(WORD_PX * 0.66 * str.length + 30), h = Math.ceil(WORD_PX * 1.4);
      T(scene, 'wd|' + str, w, h, function (c) {
        c.font = '900 ' + WORD_PX + 'px ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        c.lineWidth = WORD_PX * 0.16; c.strokeStyle = '#3c1450'; c.strokeText(str, w / 2, h / 2); c.fillStyle = '#fff6c2'; c.fillText(str, w / 2, h / 2);
      });
    });
    // pack in rows 1400 wide, then paint every cell into the one canvas
    var x = 0, y = 0, rowH = 0, W = 1400, cells = list.map(function (e) {
      var cw = Math.ceil(e.w + e.pad * 2) + 2, ch = Math.ceil(e.h + e.pad * 2) + 2;          // (2 units of gap so neighbours never bleed)
      if (x + cw > W) { x = 0; y += rowH; rowH = 0; }
      var c = { e: e, x: x, y: y, w: cw - 2, h: ch - 2 }; x += cw; rowH = Math.max(rowH, ch); return c;
    });
    var H = y + rowH;
    Kit.play.tex(scene, 'ui', W, H, function (c) {
      cells.forEach(function (k) {
        c.save(); c.beginPath(); c.rect(k.x, k.y, k.w, k.h); c.clip(); c.translate(k.x + k.e.pad, k.y + k.e.pad); k.e.paint(c, k.e.w, k.e.h); c.restore();
      });
    });
    var t = tm.get('ui');
    cells.forEach(function (k) { if (!t.has(k.e.key)) t.add(k.e.key, 0, k.x, k.y, k.w, k.h); });
  };
})();
