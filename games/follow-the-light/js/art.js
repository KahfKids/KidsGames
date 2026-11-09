/* Follow the Light: art.js
   All art drawn in code: a layered night courtyard (sky, far skyline, arcade and tiled floor, carved arch
   frame in front) and brass lanterns with coloured glass. Every lantern has its own colour AND its own shape
   on the glass (star, circle, triangle, diamond, flower, drop), so children who can't tell colours apart can
   still follow. Sprites are pre-rendered once per size to offscreen canvases. */
(function () {
  'use strict';
  var A = window.LightArt = {};

  // ---------- helpers ----------
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function rgba(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function star8(ctx, x, y, r, inner) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  A.star8 = star8; A.mix = mix; A.shade = shade; A.rgba = rgba;

  // ---------- lantern colours and shapes ----------
  // Distinct hue AND brightness AND shape for each lantern.
  A.LANTERNS = [
    { name: 'gold', c: '#ffc23a', shape: 'star' },
    { name: 'rose', c: '#ff4f6d', shape: 'circle' },
    { name: 'teal', c: '#1fd1a5', shape: 'triangle' },
    { name: 'blue', c: '#4f86ff', shape: 'diamond' },
    { name: 'violet', c: '#b36bff', shape: 'flower' },
    { name: 'orange', c: '#ff8a2a', shape: 'drop' }
  ];

  // Glyph path centred on (x, y) with radius r. sx squashes it horizontally (side panels in perspective).
  function glyph(g, shape, x, y, r, sx) {
    g.save(); g.translate(x, y); g.scale(sx || 1, 1);
    g.beginPath();
    if (shape === 'star') {
      for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * 0.58 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
      g.closePath();
    } else if (shape === 'circle') {
      g.arc(0, 0, r * 0.86, 0, Math.PI * 2);
    } else if (shape === 'triangle') {
      g.moveTo(0, -r); g.lineTo(r * 0.92, r * 0.62); g.lineTo(-r * 0.92, r * 0.62); g.closePath();
    } else if (shape === 'diamond') {
      g.moveTo(0, -r); g.lineTo(r * 0.7, 0); g.lineTo(0, r); g.lineTo(-r * 0.7, 0); g.closePath();
    } else if (shape === 'flower') {
      for (var p = 0; p < 6; p++) {
        var pa = p * Math.PI / 3 - Math.PI / 2, px = Math.cos(pa) * r * 0.5, py = Math.sin(pa) * r * 0.5;
        g.moveTo(px + r * 0.46, py); g.arc(px, py, r * 0.46, 0, Math.PI * 2);
      }
    } else if (shape === 'drop') {
      g.moveTo(0, -r); g.bezierCurveTo(r * 0.25, -r * 0.55, r * 0.78, -r * 0.05, r * 0.78, r * 0.3);
      g.arc(0, r * 0.3, r * 0.78, 0, Math.PI); g.bezierCurveTo(-r * 0.78, -r * 0.05, -r * 0.25, -r * 0.55, 0, -r);
      g.closePath();
    }
    g.restore();
  }
  A.glyph = glyph;

  // ---------- one lantern sprite ----------
  // Geometry is in lantern units: width 1 (u), ring top at y=0, finial tip at y=1.64. Origin = ring top centre.
  A.LANTERN_H = 1.64;
  A.BODY_Y = 0.80; // centre of the glass body (for glow and particles)
  var T = 0.43, B = 1.18; // glass top / bottom
  var PX_T = [-0.42, -0.25, 0.25, 0.42], PX_B = [-0.34, -0.205, 0.205, 0.34];
  function panel(g, i) { g.beginPath(); g.moveTo(PX_T[i], T); g.lineTo(PX_T[i + 1], T); g.lineTo(PX_B[i + 1], B); g.lineTo(PX_B[i], B); g.closePath(); }
  function brass(g, x0, x1) {
    var m = g.createLinearGradient(x0, 0, x1, 0);
    m.addColorStop(0, '#5a3610'); m.addColorStop(0.22, '#b77c2c'); m.addColorStop(0.5, '#ffe2a0');
    m.addColorStop(0.68, '#e0a54a'); m.addColorStop(0.9, '#8a5618'); m.addColorStop(1, '#4a2a0a');
    return m;
  }

  A.lanternSprite = function (ci, u, dpr, lit) {
    var L = A.LANTERNS[ci], col = L.c, pad = 0.1 * u;
    var c = canvas((u + pad * 2) * dpr, (A.LANTERN_H * u + pad * 2) * dpr), g = c.getContext('2d');
    g.setTransform(u * dpr, 0, 0, u * dpr, (pad + u / 2) * dpr, pad * dpr);
    g.lineJoin = 'round'; g.lineCap = 'round';
    var metal = brass(g, -0.5, 0.5), dark = '#3e2408';

    // --- glass panels ---
    for (var i = 0; i < 3; i++) {
      panel(g, i);
      var gr;
      if (i === 1) {
        gr = g.createRadialGradient(0, 0.8, 0.02, 0, 0.8, 0.5);
        if (lit) { gr.addColorStop(0, '#fffdf0'); gr.addColorStop(0.3, mix(col, '#ffffff', 0.55)); gr.addColorStop(0.75, col); gr.addColorStop(1, shade(col, -0.15)); }
        else { gr.addColorStop(0, shade(col, -0.18)); gr.addColorStop(0.7, shade(col, -0.45)); gr.addColorStop(1, shade(col, -0.62)); }
      } else {
        gr = g.createLinearGradient(PX_T[i], 0, PX_T[i + 1], 0);
        var l = i === 0;
        if (lit) { gr.addColorStop(0, l ? shade(col, -0.12) : mix(col, '#ffffff', 0.2)); gr.addColorStop(1, l ? mix(col, '#ffffff', 0.15) : mix(col, '#ffffff', 0.45)); }
        else { gr.addColorStop(0, shade(col, l ? -0.72 : -0.5)); gr.addColorStop(1, shade(col, l ? -0.55 : -0.36)); }
      }
      g.fillStyle = gr; g.fill();
    }
    // inner light bloom inside the glass
    if (lit) {
      g.save(); g.globalCompositeOperation = 'lighter';
      var core = g.createRadialGradient(0, 0.84, 0, 0, 0.84, 0.36);
      core.addColorStop(0, 'rgba(255,250,225,.75)'); core.addColorStop(1, 'rgba(255,250,225,0)');
      g.fillStyle = core; g.fillRect(-0.45, T, 0.9, B - T); g.restore();
    }

    // --- shapes on the glass: one big glyph, a small one above and below, two on each side panel ---
    var gFill = lit ? '#fffef6' : mix(col, '#ffffff', 0.12), gLine = lit ? shade(col, -0.55) : '#e6b25a';
    function mark(x, y, r, sx, big) {
      glyph(g, L.shape, x, y, r, sx);
      g.fillStyle = gFill; g.globalAlpha = big ? 1 : 0.92; g.fill(L.shape === 'flower' ? 'nonzero' : 'nonzero');
      g.globalAlpha = 1; g.lineWidth = big ? 0.034 : 0.022; g.strokeStyle = gLine; g.stroke();
      if (big && !lit) { g.lineWidth = 0.012; g.strokeStyle = 'rgba(255,240,200,.7)'; g.stroke(); }
    }
    g.save(); panel(g, 1); g.clip();
    mark(0, 0.84, 0.17, 1, true);
    mark(0, 0.585, 0.06, 1); mark(0, 1.085, 0.06, 1);
    g.restore();
    [0, 2].forEach(function (pi) {
      g.save(); panel(g, pi); g.clip();
      [0.66, 0.98].forEach(function (y) {
        var k = (y - T) / (B - T), x = ((PX_T[pi] + PX_T[pi + 1]) / 2) * (1 - k) + ((PX_B[pi] + PX_B[pi + 1]) / 2) * k;
        mark(x, y, 0.075, 0.5);
      });
      g.restore();
    });

    // --- pointed arch tops in each panel (pierced brass) ---
    for (var a = 0; a < 3; a++) {
      var x0 = PX_T[a], x1 = PX_T[a + 1], cx = (x0 + x1) / 2, hw = (x1 - x0) / 2 - 0.02, base = T + 0.17;
      g.save(); panel(g, a); g.clip();
      g.beginPath(); g.rect(x0 - 0.02, T - 0.02, x1 - x0 + 0.04, base - T + 0.02);
      g.moveTo(cx - hw, base); g.lineTo(cx - hw, base - 0.05);
      g.bezierCurveTo(cx - hw, T + 0.04, cx - hw * 0.25, T + 0.05, cx, T + 0.015);
      g.bezierCurveTo(cx + hw * 0.25, T + 0.05, cx + hw, T + 0.04, cx + hw, base - 0.05);
      g.lineTo(cx + hw, base); g.closePath();
      g.fillStyle = metal; g.fill('evenodd');
      g.restore();
    }

    // --- brass frame: mullions, bands ---
    g.strokeStyle = metal; g.lineWidth = 0.04;
    for (var m = 0; m < 4; m++) { g.beginPath(); g.moveTo(PX_T[m], T); g.lineTo(PX_B[m], B); g.stroke(); }
    g.lineWidth = 0.012; g.strokeStyle = 'rgba(255,240,200,.55)';
    for (var m2 = 1; m2 < 4; m2++) { g.beginPath(); g.moveTo(PX_T[m2] + 0.012, T + 0.02); g.lineTo(PX_B[m2] + 0.012, B - 0.02); g.stroke(); }

    // eave above the glass with scallops
    g.fillStyle = metal; g.beginPath();
    g.moveTo(-0.34, 0.345); g.lineTo(0.34, 0.345); g.lineTo(0.47, 0.44); g.lineTo(-0.47, 0.44); g.closePath(); g.fill();
    g.fillStyle = brass(g, -0.6, 0.6);
    for (var s = -0.44; s <= 0.445; s += 0.0733) { g.beginPath(); g.arc(s, 0.44, 0.032, 0, Math.PI); g.fill(); }
    g.fillStyle = 'rgba(255,240,200,.6)'; g.fillRect(-0.4, 0.352, 0.8, 0.012);

    // dome cap with pierced holes that glow when lit
    g.fillStyle = metal; g.beginPath();
    g.moveTo(-0.33, 0.355); g.bezierCurveTo(-0.33, 0.22, -0.1, 0.19, 0, 0.125); g.bezierCurveTo(0.1, 0.19, 0.33, 0.22, 0.33, 0.355); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,40,8,.6)'; g.lineWidth = 0.012; g.stroke();
    for (var h = -0.21; h <= 0.211; h += 0.07) {
      g.fillStyle = lit ? mix(col, '#ffffff', 0.6) : dark;
      g.beginPath(); g.arc(h, 0.3 - Math.abs(h) * 0.12, 0.016, 0, Math.PI * 2); g.fill();
    }
    star8(g, 0, 0.245, 0.035, 0.5); g.fillStyle = lit ? '#fffbe6' : dark; g.fill();
    // knob and ring
    g.fillStyle = metal; g.beginPath(); g.ellipse(0, 0.12, 0.05, 0.035, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = metal; g.lineWidth = 0.026; g.beginPath(); g.arc(0, 0.05, 0.042, 0, Math.PI * 2); g.stroke();

    // lower band, skirt with little glass windows, finial
    g.fillStyle = metal; g.beginPath();
    g.moveTo(-0.36, B - 0.015); g.lineTo(0.36, B - 0.015); g.lineTo(0.385, B + 0.045); g.lineTo(-0.385, B + 0.045); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,.55)'; g.fillRect(-0.34, B - 0.008, 0.68, 0.01);
    g.fillStyle = metal; g.beginPath();
    g.moveTo(-0.37, B + 0.045); g.lineTo(0.37, B + 0.045); g.lineTo(0.13, 1.37); g.lineTo(-0.13, 1.37); g.closePath(); g.fill();
    [-0.17, 0, 0.17].forEach(function (x) {
      g.beginPath(); g.moveTo(x - 0.05, B + 0.075); g.lineTo(x + 0.05, B + 0.075); g.lineTo(x, B + 0.15); g.closePath();
      g.fillStyle = lit ? mix(col, '#ffffff', 0.5) : shade(col, -0.45); g.fill();
    });
    g.fillStyle = metal; g.beginPath(); g.arc(0, 1.415, 0.07, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-0.045, 1.46); g.bezierCurveTo(-0.04, 1.53, -0.01, 1.58, 0, 1.635); g.bezierCurveTo(0.01, 1.58, 0.04, 1.53, 0.045, 1.46); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,245,215,.7)'; g.beginPath(); g.arc(0.022, 1.4, 0.02, 0, Math.PI * 2); g.fill();

    // rim light on the right edge of the glass, soft shade on the left
    g.lineWidth = 0.014; g.strokeStyle = 'rgba(255,248,225,.55)';
    g.beginPath(); g.moveTo(PX_T[3] - 0.012, T + 0.18); g.lineTo(PX_B[3] - 0.012, B - 0.02); g.stroke();
    var sh = g.createLinearGradient(-0.45, 0, -0.1, 0); sh.addColorStop(0, 'rgba(10,4,30,.35)'); sh.addColorStop(1, 'rgba(10,4,30,0)');
    g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = sh; g.fillRect(-0.5, 0, 0.4, 1.7); g.restore();
    // glass gloss streak
    g.save(); panel(g, 1); g.clip();
    var gl = g.createLinearGradient(-0.25, 0, 0.0, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,' + (lit ? 0.22 : 0.12) + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.moveTo(-0.2, T); g.lineTo(-0.1, T); g.lineTo(-0.15, B); g.lineTo(-0.23, B); g.closePath(); g.fill();
    g.restore();

    c.pad = pad; c.u = u;
    return c;
  };

  // Soft light bloom (drawn with 'lighter'); radius in CSS px.
  A.bloom = function (col, R, dpr) {
    var c = canvas(R * 2 * dpr, R * 2 * dpr), g = c.getContext('2d'), r = R * dpr;
    var gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba(mix(col, '#ffffff', 0.4), 0.9)); gr.addColorStop(0.2, rgba(col, 0.62));
    gr.addColorStop(0.42, rgba(col, 0.26)); gr.addColorStop(0.7, rgba(col, 0.08)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    return c;
  };

  // ---------- worlds ----------
  A.WORLDS = [
    { sky: ['#050822', '#0f1645', '#25205f', '#4b2d72', '#7a4276'], far: '#1a1748', wall: '#2c235e', wall2: '#3b2f72',
      floor: ['#2a2058', '#140f36'], trim: '#e9b866', glow: '#ffbe6a', near: '#0b0820', leaf: '#123a35', haze: '#5b3a7a' },
    { sky: ['#020f1a', '#06263a', '#0e4250', '#1d5d5c', '#3d7564'], far: '#0a2b33', wall: '#163d40', wall2: '#1f4d4f',
      floor: ['#183c3d', '#08201f'], trim: '#bfe3b0', glow: '#ffd58a', near: '#04130f', leaf: '#0f3a26', haze: '#2a6a62' },
    { sky: ['#0a0522', '#1d0d45', '#3e1764', '#6d2671', '#b2506e'], far: '#22103f', wall: '#3a1a5c', wall2: '#4c2470',
      floor: ['#35184f', '#170a2b'], trim: '#ffc27a', glow: '#ffb070', near: '#0e051c', leaf: '#2a1240', haze: '#7a3a7a' }
  ];

  // Returns { sky, far, mid, near, margin } canvases in device px. Each layer is a little wider than the screen
  // so it can drift for parallax depth.
  A.paintScene = function (wi, w, h, dpr, safe) {
    var W = A.WORLDS[wi], m = Math.round(24 * dpr), cw = Math.round(w * dpr) + m * 2, ch = Math.round(h * dpr);
    var S = dpr, U = Math.min(w, h) / 400 * S; // U: a scale unit that follows the smaller screen side
    var sky = canvas(cw, ch), far = canvas(cw, ch), mid = canvas(cw, ch), near = canvas(cw, ch);
    var H = ch, Wd = cw, R = rng(500 + wi * 91);
    var horizon = H * (h > w ? 0.6 : 0.64);

    // ---- sky ----
    var g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, horizon);
    W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
    // milky haze band
    for (var k = 0; k < 6; k++) {
      var hx = Wd * (0.1 + k * 0.17), hy = horizon * (0.25 + 0.1 * Math.sin(k * 1.7)), hr = (80 + R() * 90) * U;
      var hz = g.createRadialGradient(hx, hy, 0, hx, hy, hr);
      hz.addColorStop(0, rgba(W.haze, 0.18)); hz.addColorStop(1, rgba(W.haze, 0));
      g.fillStyle = hz; g.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
    }
    for (var i = 0; i < 180; i++) {
      var sy = Math.pow(R(), 1.4) * horizon * 0.95, sa = (0.2 + R() * 0.75) * (1 - sy / horizon * 0.8);
      g.globalAlpha = sa; g.fillStyle = R() < 0.15 ? '#ffe9c2' : '#ffffff';
      g.beginPath(); g.arc(R() * Wd, sy, (R() * 1.1 + 0.35) * S, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    // crescent moon with glow (scenery)
    var mx = Wd * (h > w ? 0.78 : 0.86), my = Math.max(safe.top * S + 90 * S, horizon * 0.2), mr = Math.max(16, 22 * U) ;
    var halo = g.createRadialGradient(mx, my, 0, mx, my, mr * 6);
    halo.addColorStop(0, 'rgba(255,236,190,.35)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = halo; g.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    var mc = canvas(mr * 2.6, mr * 2.6), mg = mc.getContext('2d'), o = mc.width / 2;
    var mgr = mg.createLinearGradient(o - mr, 0, o + mr, 0); mgr.addColorStop(0, '#fff8e2'); mgr.addColorStop(1, '#f3d9a0');
    mg.fillStyle = mgr; mg.beginPath(); mg.arc(o, o, mr, 0, 6.283); mg.fill();
    mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(o + mr * 0.42, o - mr * 0.22, mr * 0.86, 0, 6.283); mg.fill();
    g.drawImage(mc, mx - o, my - o);

    // ---- far: domes and minarets beyond the courtyard wall (respectful scenery, soft in the haze) ----
    var f = far.getContext('2d');
    var archW = Math.max(46 * S, Math.min(120 * S, 0.17 * Math.min(w, h) * S)), archH = archW * 1.3;
    var wallTop = horizon - archH - archW * 0.55;
    function dome(ctx, cx, base, r) {
      ctx.moveTo(cx - r, base);
      ctx.bezierCurveTo(cx - r * 1.2, base - r * 0.95, cx - r * 0.25, base - r * 1.25, cx, base - r * 1.7);
      ctx.bezierCurveTo(cx + r * 0.25, base - r * 1.25, cx + r * 1.2, base - r * 0.95, cx + r, base);
      ctx.closePath();
    }
    function minaret(ctx, cx, base, mw, mh) {
      ctx.rect(cx - mw / 2, base - mh, mw, mh);
      ctx.rect(cx - mw * 0.85, base - mh * 0.7, mw * 1.7, mw * 0.3);
      ctx.rect(cx - mw * 0.75, base - mh * 0.95, mw * 1.5, mw * 0.25);
      dome(ctx, cx, base - mh, mw * 0.55);
    }
    f.fillStyle = W.far; f.beginPath();
    var dx = Wd * 0.62, dr = 70 * U;
    f.rect(dx - dr * 1.25, wallTop - dr * 0.5, dr * 2.5, dr * 0.6); dome(f, dx, wallTop - dr * 0.45, dr);
    minaret(f, dx - dr * 2.1, wallTop + 4 * S, 13 * U, 190 * U); minaret(f, dx + dr * 2.1, wallTop + 4 * S, 13 * U, 190 * U);
    var dx2 = Wd * 0.18; f.rect(dx2 - 50 * U, wallTop - 30 * U, 100 * U, 34 * U); dome(f, dx2, wallTop - 28 * U, 36 * U);
    f.fill();
    // a few warm windows far away
    f.fillStyle = rgba(W.glow, 0.55);
    for (var wn = -2; wn <= 2; wn++) { var wx = dx + wn * dr * 0.4; f.beginPath(); f.rect(wx - 3 * U, wallTop - dr * 0.32, 6 * U, 9 * U); f.arc(wx, wallTop - dr * 0.32, 3 * U, Math.PI, 0); f.fill(); }
    var fh = f.createLinearGradient(0, wallTop - 200 * U, 0, wallTop + 10 * S);
    fh.addColorStop(0, rgba(W.sky[3], 0)); fh.addColorStop(1, rgba(W.sky[4], 0.55));
    f.fillStyle = fh; f.fillRect(0, wallTop - 200 * U, Wd, 210 * U + 10 * S);

    // ---- mid: the courtyard arcade and tiled floor ----
    var md = mid.getContext('2d');
    // floor
    var fl = md.createLinearGradient(0, horizon, 0, H);
    fl.addColorStop(0, W.floor[0]); fl.addColorStop(1, W.floor[1]);
    md.fillStyle = fl; md.fillRect(0, horizon, Wd, H - horizon);
    // perspective tile lines
    var vx = Wd / 2, vy = horizon - (H - horizon) * 1.2;
    md.save(); md.beginPath(); md.rect(0, horizon, Wd, H - horizon); md.clip();
    md.strokeStyle = rgba(W.trim, 0.1); md.lineWidth = 1.2 * S;
    for (var li = -24; li <= 24; li++) {
      var bx = vx + li * archW * 0.7, t0 = (horizon - vy) / (H - vy);
      md.beginPath(); md.moveTo(vx + (bx - vx) * t0, horizon); md.lineTo(bx + (bx - vx) * 0.0, H); md.stroke();
    }
    for (var row = 1; row < 14; row++) { var ty = horizon + (H - horizon) * Math.pow(row / 13, 1.8); md.beginPath(); md.moveTo(0, ty); md.lineTo(Wd, ty); md.stroke(); }
    // small star inlays where lines cross (a few rows)
    md.fillStyle = rgba(W.trim, 0.13);
    for (var r2 = 3; r2 < 13; r2 += 2) {
      var yy = horizon + (H - horizon) * Math.pow(r2 / 13, 1.8), tt = (yy - vy) / (H - vy);
      for (var c2 = -24; c2 <= 24; c2 += 2) { var xx = vx + c2 * archW * 0.7 * tt + archW * 0.35 * tt; star8(md, xx, yy + 2 * S * tt, 7 * S * tt * 1.6, 0.5); md.fill(); }
    }
    md.restore();

    // back wall with arches
    var wg = md.createLinearGradient(0, wallTop, 0, horizon);
    wg.addColorStop(0, W.wall2); wg.addColorStop(1, W.wall);
    md.fillStyle = wg; md.fillRect(0, wallTop, Wd, horizon - wallTop + 1);
    // stepped merlons along the top of the wall
    md.fillStyle = W.wall2;
    var mw2 = archW * 0.32;
    for (var mx2 = -mw2 / 2; mx2 < Wd; mx2 += mw2 * 1.6) {
      md.beginPath(); md.moveTo(mx2, wallTop); md.lineTo(mx2, wallTop - mw2 * 0.5); md.lineTo(mx2 + mw2 * 0.25, wallTop - mw2 * 0.5);
      md.lineTo(mx2 + mw2 * 0.25, wallTop - mw2 * 0.85); md.lineTo(mx2 + mw2 * 0.75, wallTop - mw2 * 0.85); md.lineTo(mx2 + mw2 * 0.75, wallTop - mw2 * 0.5);
      md.lineTo(mx2 + mw2, wallTop - mw2 * 0.5); md.lineTo(mx2 + mw2, wallTop); md.closePath(); md.fill();
    }
    // tile frieze band
    var bandY = wallTop + archW * 0.08, bandH = archW * 0.2;
    md.fillStyle = shade(W.wall, -0.25); md.fillRect(0, bandY, Wd, bandH);
    md.fillStyle = rgba(W.trim, 0.5); md.fillRect(0, bandY, Wd, 1.2 * S); md.fillRect(0, bandY + bandH - 1.2 * S, Wd, 1.2 * S);
    for (var sx = archW * 0.2; sx < Wd; sx += archW * 0.4) { md.fillStyle = rgba(W.trim, (Math.round(sx / (archW * 0.4)) % 2) ? 0.45 : 0.25); star8(md, sx, bandY + bandH / 2, bandH * 0.36, 0.55); md.fill(); }
    // arches: glowing interiors
    var gap = archW * 0.28, n = Math.ceil(Wd / (archW + gap)) + 1, off = (Wd - n * (archW + gap)) / 2;
    for (var a = 0; a < n; a++) {
      var ax = off + a * (archW + gap) + gap / 2, top = horizon - archH, aw = archW;
      function archPath(ctx, x, y0, ww, hh) {
        ctx.beginPath(); ctx.moveTo(x, y0 + hh); ctx.lineTo(x, y0 + ww * 0.45);
        ctx.bezierCurveTo(x, y0 + ww * 0.12, x + ww * 0.32, y0 + ww * 0.02, x + ww / 2, y0 - ww * 0.12);
        ctx.bezierCurveTo(x + ww * 0.68, y0 + ww * 0.02, x + ww, y0 + ww * 0.12, x + ww, y0 + ww * 0.45);
        ctx.lineTo(x + ww, y0 + hh); ctx.closePath();
      }
      // outer frame
      archPath(md, ax - aw * 0.07, top - aw * 0.06, aw * 1.14, archH + aw * 0.06);
      md.fillStyle = shade(W.wall2, 0.08); md.fill();
      archPath(md, ax, top, aw, archH);
      var ig = md.createLinearGradient(0, top, 0, horizon);
      ig.addColorStop(0, shade(W.wall, -0.55)); ig.addColorStop(0.55, mix(shade(W.wall, -0.4), W.glow, 0.25)); ig.addColorStop(1, mix(W.wall, W.glow, 0.55));
      md.fillStyle = ig; md.fill();
      md.strokeStyle = rgba(W.trim, 0.55); md.lineWidth = 1.4 * S; md.stroke();
      // floor light spilling out of the arch
      var sp = md.createRadialGradient(ax + aw / 2, horizon, 0, ax + aw / 2, horizon, aw * 1.1);
      sp.addColorStop(0, rgba(W.glow, 0.28)); sp.addColorStop(1, rgba(W.glow, 0));
      md.fillStyle = sp; md.fillRect(ax - aw * 0.6, horizon, aw * 2.2, aw * 1.1);
    }
    // column bases line
    md.fillStyle = shade(W.wall, -0.3); md.fillRect(0, horizon - 3 * S, Wd, 4 * S);

    // fountain in the middle of the courtyard
    var fy = horizon + (H - horizon) * 0.42, frx = Math.min(Wd * 0.3, 150 * U), fry = frx * 0.26;
    var fx0 = Wd / 2;
    md.fillStyle = 'rgba(0,0,0,.25)'; md.beginPath(); md.ellipse(fx0, fy + fry * 0.5, frx * 1.08, fry * 1.1, 0, 0, 6.283); md.fill();
    function oct(ctx, cx, cy, rx, ry) { ctx.beginPath(); for (var q = 0; q < 8; q++) { var qa = q * Math.PI / 4 + Math.PI / 8; ctx.lineTo(cx + Math.cos(qa) * rx, cy + Math.sin(qa) * ry); } ctx.closePath(); }
    oct(md, fx0, fy + fry * 0.25, frx, fry); md.fillStyle = shade(W.wall2, 0.15); md.fill();
    oct(md, fx0, fy, frx, fry); md.fillStyle = shade(W.wall2, 0.35); md.fill();
    oct(md, fx0, fy, frx * 0.88, fry * 0.8);
    var wa = md.createLinearGradient(0, fy - fry, 0, fy + fry); wa.addColorStop(0, '#2c6f8f'); wa.addColorStop(1, '#123a5a');
    md.fillStyle = wa; md.fill();
    md.strokeStyle = 'rgba(200,240,255,.35)'; md.lineWidth = 1.2 * S;
    for (var rp = 1; rp < 4; rp++) { md.beginPath(); md.ellipse(fx0, fy, frx * 0.2 * rp, fry * 0.2 * rp, 0, 0, 6.283); md.stroke(); }
    md.fillStyle = shade(W.wall2, 0.3); md.fillRect(fx0 - 5 * U, fy - 26 * U, 10 * U, 26 * U);
    md.beginPath(); md.ellipse(fx0, fy - 26 * U, 16 * U, 5 * U, 0, 0, 6.283); md.fill();

    // haze over the whole mid ground for depth
    var mh = md.createLinearGradient(0, wallTop - archW, 0, horizon + 40 * S);
    mh.addColorStop(0, rgba(W.haze, 0)); mh.addColorStop(1, rgba(W.haze, 0.18));
    md.fillStyle = mh; md.fillRect(0, wallTop - archW, Wd, horizon - wallTop + archW + 40 * S);

    // ---- near: a carved arch frame and plants in the corners (dark silhouettes with rim light) ----
    var nr = near.getContext('2d');
    var pw = Math.max(14 * S, Math.min(44 * S, w * 0.045 * S)) + m, spring = H * (h > w ? 0.2 : 0.3), apex = -H * 0.06;
    function opening(ctx) {
      ctx.moveTo(pw, H + 10); ctx.lineTo(pw, spring);
      ctx.bezierCurveTo(pw, spring - (spring - apex) * 0.55, Wd / 2 - (Wd / 2 - pw) * 0.25, apex + (spring - apex) * 0.12, Wd / 2, apex);
      ctx.bezierCurveTo(Wd / 2 + (Wd / 2 - pw) * 0.25, apex + (spring - apex) * 0.12, Wd - pw, spring - (spring - apex) * 0.55, Wd - pw, spring);
      ctx.lineTo(Wd - pw, H + 10);
    }
    nr.beginPath(); nr.rect(0, 0, Wd, H); opening(nr); nr.closePath();
    var ng = nr.createLinearGradient(0, 0, 0, H); ng.addColorStop(0, shade(W.near, 0.08)); ng.addColorStop(1, W.near);
    nr.fillStyle = ng; nr.fill('evenodd');
    // carved border along the opening
    nr.save(); nr.beginPath(); opening(nr); nr.strokeStyle = rgba(W.trim, 0.45); nr.lineWidth = 2 * S; nr.stroke();
    nr.translate(0, 0); nr.lineWidth = 5 * S; nr.strokeStyle = rgba(W.trim, 0.08); nr.stroke(); nr.restore();
    // star rosettes on the pillars
    nr.fillStyle = rgba(W.trim, 0.22);
    for (var py = spring + 60 * S; py < H - 40 * S; py += 110 * S) { star8(nr, (pw - m) / 2 + m, py, (pw - m) * 0.32, 0.5); nr.fill(); star8(nr, Wd - (pw - m) / 2 - m, py, (pw - m) * 0.32, 0.5); nr.fill(); }
    // plants in the corners
    function plant(cx, base, sz, flip) {
      nr.save(); nr.translate(cx, base); nr.scale(flip ? -1 : 1, 1);
      // urn
      nr.fillStyle = W.near; nr.beginPath();
      nr.moveTo(-sz * 0.32, 0); nr.bezierCurveTo(-sz * 0.42, -sz * 0.25, -sz * 0.3, -sz * 0.45, -sz * 0.18, -sz * 0.5);
      nr.lineTo(sz * 0.18, -sz * 0.5); nr.bezierCurveTo(sz * 0.3, -sz * 0.45, sz * 0.42, -sz * 0.25, sz * 0.32, 0); nr.closePath(); nr.fill();
      nr.strokeStyle = rgba(W.trim, 0.35); nr.lineWidth = 1.4 * S; nr.stroke();
      // fronds
      nr.fillStyle = W.leaf;
      for (var q = 0; q < 7; q++) {
        var qa = -Math.PI / 2 + (q - 3) * 0.36, L = sz * (0.75 + (q % 2) * 0.25);
        nr.beginPath(); nr.moveTo(0, -sz * 0.5);
        nr.quadraticCurveTo(Math.cos(qa) * L * 0.5 - sz * 0.08, -sz * 0.5 + Math.sin(qa) * L * 0.5, Math.cos(qa) * L, -sz * 0.5 + Math.sin(qa) * L + sz * 0.15);
        nr.quadraticCurveTo(Math.cos(qa) * L * 0.5 + sz * 0.08, -sz * 0.5 + Math.sin(qa) * L * 0.5 + sz * 0.06, 0, -sz * 0.5);
        nr.fill();
      }
      nr.restore();
    }
    var psz = Math.min(110 * U, H * 0.2);
    plant(m + psz * 0.35, H - safe.bottom * S, psz, false);
    plant(Wd - m - psz * 0.35, H - safe.bottom * S, psz * 0.85, true);
    if (wi === 1) { // garden: cypress shapes behind the plants
      nr.fillStyle = W.leaf;
      [[m + psz * 0.9, 1.6], [Wd - m - psz * 0.95, 1.4]].forEach(function (p) { nr.beginPath(); nr.ellipse(p[0], H - psz * p[1] * 0.5, psz * 0.16, psz * p[1] * 0.5, 0, 0, 6.283); nr.fill(); });
    }
    // floor vignette
    var vg = nr.createRadialGradient(Wd / 2, H * 0.45, Math.min(Wd, H) * 0.35, Wd / 2, H * 0.5, Math.max(Wd, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,2,16,.45)');
    nr.fillStyle = vg; nr.fillRect(0, 0, Wd, H);

    return { sky: sky, far: far, mid: mid, near: near, margin: m, horizon: horizon / dpr, pillar: (pw - m) / dpr, spring: spring / dpr };
  };
})();
