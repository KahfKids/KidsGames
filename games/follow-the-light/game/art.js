/* Follow the Light: the paint box. The look is the old page's, kept: a night courtyard (sky, far domes and minarets, an
   arcade with a tiled floor and a fountain, carved pillars, a vignette) and brass lanterns with coloured glass. Every
   lantern has its own colour AND its own shape on the glass (star, circle, triangle, diamond, flower, drop), so a
   child who cannot tell colours apart can still follow. No faces anywhere.
   Everything is painted ONCE into the engine's canvas textures (Kit.play.tex), never per frame:
   - 'ftl-lan': one sheet with the six lanterns, dark and lit (frames d0..d5, l0..l5), so every lantern draws in one batch;
   - 'land-<world>': the far skyline, arcade, floor and fountain of the world on screen (the sky itself is a stretched
     gradient image and the stars a tiled picture, so any screen shape is covered); only the world in use is kept;
   - 'rope', 'ropeg' (the string of little lamps and its glow), 'link' (a chain link, tiled), the pillars, the plants,
     the moon, the vignette, the beads, hearts, particles and the interface pieces.
   Art ships as baked AVIF (owner, 2026-11-16): every picture is painted at a FIXED design size (about 1 texture pixel per design
   unit, never sized from the screen), grouped into three kinds of sheet ('ftl-lan', 'ftl-ui', 'ftl-world-<n>'); tools/bake-art.js
   reads them back and writes art/baked/*.avif, which Boot loads (Kit.play.art), so the painters below run only to bake.
   Light is two glow pictures (play.js), not the engine's PointLights.
*/
(function () {
  'use strict';
  var realTex = Kit.play.tex, collect = null;
  // while a sheet's pictures are being gathered, tex() only lists them (key, size, painter); otherwise it is Kit.play.tex
  function tex(scene, key, w, h, fn, pad) {
    if (collect) { collect.push({ key: key, w: Math.ceil(w), h: Math.ceil(h), fn: fn }); return key; }
    return realTex(scene, key, w, h, fn, pad);
  }
  // pack listed pictures into one sheet (shelves, tallest first, 2 px apart: the same every time, so the baked file and the
  // frames agree), and paint them in their places
  function pack(items, W) {
    var list = items.slice().sort(function (a, b) { return b.h - a.h || (a.key < b.key ? -1 : 1); }), x = 2, y = 2, rh = 0;
    list.forEach(function (it) { if (x + it.w + 2 > W) { x = 2; y += rh + 2; rh = 0; } it.x = x; it.y = y; x += it.w + 2; rh = Math.max(rh, it.h); });
    return { w: W, h: y + rh + 2 };
  }
  function paintItems(c, items) {
    items.forEach(function (it) { c.save(); c.translate(it.x, it.y); c.beginPath(); c.rect(0, 0, it.w, it.h); c.clip(); it.fn(c, it.w, it.h); c.restore(); });
  }

  // ---------- helpers (from the old page) ----------
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

  // ---------- lantern colours and shapes ----------
  var LANTERNS = [
    { name: 'gold', c: '#ffc23a', shape: 'star' },
    { name: 'rose', c: '#ff4f6d', shape: 'circle' },
    { name: 'teal', c: '#1fd1a5', shape: 'triangle' },
    { name: 'blue', c: '#4f86ff', shape: 'diamond' },
    { name: 'violet', c: '#b36bff', shape: 'flower' },
    { name: 'orange', c: '#ff8a2a', shape: 'drop' }
  ];
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

  // ---------- one lantern, in lantern units: width 1, ring top at y 0, finial tip at 1.64; origin = ring top centre ----------
  var LH = 1.64, BODY_Y = 0.80, T = 0.43, B = 1.18;
  var PX_T = [-0.42, -0.25, 0.25, 0.42], PX_B = [-0.34, -0.205, 0.205, 0.34];
  function panel(g, i) { g.beginPath(); g.moveTo(PX_T[i], T); g.lineTo(PX_T[i + 1], T); g.lineTo(PX_B[i + 1], B); g.lineTo(PX_B[i], B); g.closePath(); }
  function brass(g, x0, x1) {
    var m = g.createLinearGradient(x0, 0, x1, 0);
    m.addColorStop(0, '#5a3610'); m.addColorStop(0.22, '#b77c2c'); m.addColorStop(0.5, '#ffe2a0');
    m.addColorStop(0.68, '#e0a54a'); m.addColorStop(0.9, '#8a5618'); m.addColorStop(1, '#4a2a0a');
    return m;
  }
  // g is already scaled so that 1 unit = one lantern width and its origin is the ring top centre
  function lantern(g, ci, lit) {
    var L = LANTERNS[ci], col = L.c;
    g.lineJoin = 'round'; g.lineCap = 'round';
    var metal = brass(g, -0.5, 0.5), dark = '#3e2408';
    for (var i = 0; i < 3; i++) {                                   // glass panels
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
    if (lit) {
      g.save(); g.globalCompositeOperation = 'lighter';
      var core = g.createRadialGradient(0, 0.84, 0, 0, 0.84, 0.36);
      core.addColorStop(0, 'rgba(255,250,225,.75)'); core.addColorStop(1, 'rgba(255,250,225,0)');
      g.fillStyle = core; g.fillRect(-0.45, T, 0.9, B - T); g.restore();
    }
    // the shape on the glass: one big, a small one above and below, two on each side panel
    var gFill = lit ? '#fffef6' : mix(col, '#ffffff', 0.12), gLine = lit ? shade(col, -0.55) : '#e6b25a';
    function mark(x, y, r, sx, big) {
      glyph(g, L.shape, x, y, r, sx);
      g.fillStyle = gFill; g.globalAlpha = big ? 1 : 0.92; g.fill();
      g.globalAlpha = 1; g.lineWidth = big ? 0.034 : 0.022; g.strokeStyle = gLine; g.stroke();
      if (big && !lit) { g.lineWidth = 0.012; g.strokeStyle = 'rgba(255,240,200,.7)'; g.stroke(); }
    }
    g.save(); panel(g, 1); g.clip();
    mark(0, 0.84, 0.17, 1, true); mark(0, 0.585, 0.06, 1); mark(0, 1.085, 0.06, 1);
    g.restore();
    [0, 2].forEach(function (pi) {
      g.save(); panel(g, pi); g.clip();
      [0.66, 0.98].forEach(function (y) {
        var k = (y - T) / (B - T), x = ((PX_T[pi] + PX_T[pi + 1]) / 2) * (1 - k) + ((PX_B[pi] + PX_B[pi + 1]) / 2) * k;
        mark(x, y, 0.075, 0.5);
      });
      g.restore();
    });
    for (var a = 0; a < 3; a++) {                                   // pointed arch tops (pierced brass)
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
    g.strokeStyle = metal; g.lineWidth = 0.04;                      // brass frame
    for (var m = 0; m < 4; m++) { g.beginPath(); g.moveTo(PX_T[m], T); g.lineTo(PX_B[m], B); g.stroke(); }
    g.lineWidth = 0.012; g.strokeStyle = 'rgba(255,240,200,.55)';
    for (var m2 = 1; m2 < 4; m2++) { g.beginPath(); g.moveTo(PX_T[m2] + 0.012, T + 0.02); g.lineTo(PX_B[m2] + 0.012, B - 0.02); g.stroke(); }
    g.fillStyle = metal; g.beginPath();                             // eave with scallops
    g.moveTo(-0.34, 0.345); g.lineTo(0.34, 0.345); g.lineTo(0.47, 0.44); g.lineTo(-0.47, 0.44); g.closePath(); g.fill();
    g.fillStyle = brass(g, -0.6, 0.6);
    for (var s = -0.44; s <= 0.445; s += 0.0733) { g.beginPath(); g.arc(s, 0.44, 0.032, 0, Math.PI); g.fill(); }
    g.fillStyle = 'rgba(255,240,200,.6)'; g.fillRect(-0.4, 0.352, 0.8, 0.012);
    g.fillStyle = metal; g.beginPath();                             // dome cap with pierced holes that glow when lit
    g.moveTo(-0.33, 0.355); g.bezierCurveTo(-0.33, 0.22, -0.1, 0.19, 0, 0.125); g.bezierCurveTo(0.1, 0.19, 0.33, 0.22, 0.33, 0.355); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,40,8,.6)'; g.lineWidth = 0.012; g.stroke();
    for (var h = -0.21; h <= 0.211; h += 0.07) {
      g.fillStyle = lit ? mix(col, '#ffffff', 0.6) : dark;
      g.beginPath(); g.arc(h, 0.3 - Math.abs(h) * 0.12, 0.016, 0, Math.PI * 2); g.fill();
    }
    star8(g, 0, 0.245, 0.035, 0.5); g.fillStyle = lit ? '#fffbe6' : dark; g.fill();
    g.fillStyle = metal; g.beginPath(); g.ellipse(0, 0.12, 0.05, 0.035, 0, 0, Math.PI * 2); g.fill();     // knob and ring
    g.strokeStyle = metal; g.lineWidth = 0.026; g.beginPath(); g.arc(0, 0.05, 0.042, 0, Math.PI * 2); g.stroke();
    g.fillStyle = metal; g.beginPath();                             // lower band, skirt with little windows, finial
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
    g.lineWidth = 0.014; g.strokeStyle = 'rgba(255,248,225,.55)';   // rim light right, soft shade left, gloss streak
    g.beginPath(); g.moveTo(PX_T[3] - 0.012, T + 0.18); g.lineTo(PX_B[3] - 0.012, B - 0.02); g.stroke();
    var sh = g.createLinearGradient(-0.45, 0, -0.1, 0); sh.addColorStop(0, 'rgba(10,4,30,.35)'); sh.addColorStop(1, 'rgba(10,4,30,0)');
    g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = sh; g.fillRect(-0.5, 0, 0.4, 1.7); g.restore();
    g.save(); panel(g, 1); g.clip();
    var gl = g.createLinearGradient(-0.25, 0, 0.0, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,' + (lit ? 0.22 : 0.12) + ')'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.moveTo(-0.2, T); g.lineTo(-0.1, T); g.lineTo(-0.15, B); g.lineTo(-0.23, B); g.closePath(); g.fill();
    g.restore();
  }

  // ---------- the worlds ----------
  var WORLDS = [
    { sky: ['#050822', '#0f1645', '#25205f', '#4b2d72', '#7a4276'], far: '#1a1748', wall: '#2c235e', wall2: '#3b2f72',
      floor: ['#2a2058', '#140f36'], trim: '#e9b866', glow: '#ffbe6a', near: '#0b0820', leaf: '#123a35', haze: '#5b3a7a' },
    { sky: ['#020f1a', '#06263a', '#0e4250', '#1d5d5c', '#3d7564'], far: '#0a2b33', wall: '#163d40', wall2: '#1f4d4f',
      floor: ['#183c3d', '#08201f'], trim: '#bfe3b0', glow: '#ffd58a', near: '#04130f', leaf: '#0f3a26', haze: '#2a6a62' },
    { sky: ['#0a0522', '#1d0d45', '#3e1764', '#6d2671', '#b2506e'], far: '#22103f', wall: '#3a1a5c', wall2: '#4c2470',
      floor: ['#35184f', '#170a2b'], trim: '#ffc27a', glow: '#ffb070', near: '#0e051c', leaf: '#2a1240', haze: '#7a3a7a' }
  ];

  // The land of a world in DESIGN units, x -300..2220, y -160..1100, horizon at y 700, painted at 0.38 texture px per unit.
  // (The same scene as the old page's far / mid layers, in the 1920 x 1080 design space: sizes are the old ones x 2.7.)
  var LX = -300, LY = -160, LW = 2520, LHH = 1260, LS = 0.38, HOR = 700;
  function land(c, wi) {
    var W = WORLDS[wi], U = 2.7, S = 2.7, Wd = LW, horizon = HOR, FLOOR_END = LY + LHH;
    var archW = 184, archH = archW * 1.3, wallTop = horizon - archH - archW * 0.55;
    c.scale(LS, LS); c.translate(-LX, -LY);
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
    // far: domes and minarets beyond the wall, soft in the haze (scenery)
    c.fillStyle = W.far; c.beginPath();
    var dx = 1190, dr = 70 * U;
    c.rect(dx - dr * 1.25, wallTop - dr * 0.5, dr * 2.5, dr * 0.6); dome(c, dx, wallTop - dr * 0.45, dr);
    minaret(c, dx - dr * 2.1, wallTop + 4 * S, 13 * U, 190 * U); minaret(c, dx + dr * 2.1, wallTop + 4 * S, 13 * U, 190 * U);
    [[346, 36], [-130, 30], [2150, 32]].forEach(function (q) { c.rect(q[0] - q[1] * U * 1.4, wallTop - 30 * U, q[1] * U * 2.8, 34 * U); dome(c, q[0], wallTop - 28 * U, q[1] * U); });
    c.fill();
    c.fillStyle = rgba(W.glow, 0.55);                               // a few warm windows far away
    for (var wn = -2; wn <= 2; wn++) { var wx = dx + wn * dr * 0.4; c.beginPath(); c.rect(wx - 3 * U, wallTop - dr * 0.32, 6 * U, 9 * U); c.arc(wx, wallTop - dr * 0.32, 3 * U, Math.PI, 0); c.fill(); }
    var fh = c.createLinearGradient(0, wallTop - 200 * U, 0, wallTop + 10 * S);
    fh.addColorStop(0, rgba(W.sky[3], 0)); fh.addColorStop(1, rgba(W.sky[4], 0.55));
    c.fillStyle = fh; c.fillRect(LX, wallTop - 200 * U, Wd, 210 * U + 10 * S);

    // floor
    var fl = c.createLinearGradient(0, horizon, 0, FLOOR_END);
    fl.addColorStop(0, W.floor[0]); fl.addColorStop(1, W.floor[1]);
    c.fillStyle = fl; c.fillRect(LX, horizon, Wd, FLOOR_END - horizon);
    var vx = 960, vy = horizon - 380 * 1.2, t0 = (horizon - vy) / (1080 - vy);
    c.save(); c.beginPath(); c.rect(LX, horizon, Wd, FLOOR_END - horizon); c.clip();
    c.strokeStyle = rgba(W.trim, 0.1); c.lineWidth = 1.2 * S;
    for (var li = -24; li <= 24; li++) {
      var bx = vx + li * archW * 0.7, sx0 = vx + (bx - vx) * t0, slope = (bx - sx0) / 380;
      c.beginPath(); c.moveTo(sx0, horizon); c.lineTo(bx + slope * (FLOOR_END - 1080), FLOOR_END); c.stroke();
    }
    for (var row = 1; row < 22; row++) { var ty = horizon + 380 * Math.pow(row / 13, 1.8); if (ty > FLOOR_END) break; c.beginPath(); c.moveTo(LX, ty); c.lineTo(LX + Wd, ty); c.stroke(); }
    c.fillStyle = rgba(W.trim, 0.13);                               // small star inlays where the lines cross
    for (var r2 = 3; r2 < 22; r2 += 2) {
      var yy = horizon + 380 * Math.pow(r2 / 13, 1.8); if (yy > FLOOR_END) break;
      var tt = (yy - vy) / (1080 - vy);
      for (var c2 = -24; c2 <= 24; c2 += 2) { var xx = vx + c2 * archW * 0.7 * tt + archW * 0.35 * tt; star8(c, xx, yy + 2 * S * tt, 7 * S * tt * 1.6, 0.5); c.fill(); }
    }
    c.restore();

    // back wall with arches
    var wg = c.createLinearGradient(0, wallTop, 0, horizon);
    wg.addColorStop(0, W.wall2); wg.addColorStop(1, W.wall);
    c.fillStyle = wg; c.fillRect(LX, wallTop, Wd, horizon - wallTop + 1);
    c.fillStyle = W.wall2;                                          // stepped merlons along the top
    var mw2 = archW * 0.32;
    for (var mx2 = LX - mw2 / 2; mx2 < LX + Wd; mx2 += mw2 * 1.6) {
      c.beginPath(); c.moveTo(mx2, wallTop); c.lineTo(mx2, wallTop - mw2 * 0.5); c.lineTo(mx2 + mw2 * 0.25, wallTop - mw2 * 0.5);
      c.lineTo(mx2 + mw2 * 0.25, wallTop - mw2 * 0.85); c.lineTo(mx2 + mw2 * 0.75, wallTop - mw2 * 0.85); c.lineTo(mx2 + mw2 * 0.75, wallTop - mw2 * 0.5);
      c.lineTo(mx2 + mw2, wallTop - mw2 * 0.5); c.lineTo(mx2 + mw2, wallTop); c.closePath(); c.fill();
    }
    var bandY = wallTop + archW * 0.08, bandH = archW * 0.2;        // tile frieze band
    c.fillStyle = shade(W.wall, -0.25); c.fillRect(LX, bandY, Wd, bandH);
    c.fillStyle = rgba(W.trim, 0.5); c.fillRect(LX, bandY, Wd, 1.2 * S); c.fillRect(LX, bandY + bandH - 1.2 * S, Wd, 1.2 * S);
    for (var sx = LX + archW * 0.2; sx < LX + Wd; sx += archW * 0.4) { c.fillStyle = rgba(W.trim, (Math.round((sx - LX) / (archW * 0.4)) % 2) ? 0.45 : 0.25); star8(c, sx, bandY + bandH / 2, bandH * 0.36, 0.55); c.fill(); }
    var gap = archW * 0.28, n = Math.ceil(Wd / (archW + gap)) + 1, off = (Wd - n * (archW + gap)) / 2;
    function archPath(ctx, x, y0, ww, hh) {
      ctx.beginPath(); ctx.moveTo(x, y0 + hh); ctx.lineTo(x, y0 + ww * 0.45);
      ctx.bezierCurveTo(x, y0 + ww * 0.12, x + ww * 0.32, y0 + ww * 0.02, x + ww / 2, y0 - ww * 0.12);
      ctx.bezierCurveTo(x + ww * 0.68, y0 + ww * 0.02, x + ww, y0 + ww * 0.12, x + ww, y0 + ww * 0.45);
      ctx.lineTo(x + ww, y0 + hh); ctx.closePath();
    }
    for (var a = 0; a < n; a++) {                                   // arches: glowing interiors
      var ax = LX + off + a * (archW + gap) + gap / 2, top = horizon - archH, aw = archW;
      archPath(c, ax - aw * 0.07, top - aw * 0.06, aw * 1.14, archH + aw * 0.06);
      c.fillStyle = shade(W.wall2, 0.08); c.fill();
      archPath(c, ax, top, aw, archH);
      var ig = c.createLinearGradient(0, top, 0, horizon);
      ig.addColorStop(0, shade(W.wall, -0.55)); ig.addColorStop(0.55, mix(shade(W.wall, -0.4), W.glow, 0.25)); ig.addColorStop(1, mix(W.wall, W.glow, 0.55));
      c.fillStyle = ig; c.fill();
      c.strokeStyle = rgba(W.trim, 0.55); c.lineWidth = 1.4 * S; c.stroke();
      var sp = c.createRadialGradient(ax + aw / 2, horizon, 0, ax + aw / 2, horizon, aw * 1.1);
      sp.addColorStop(0, rgba(W.glow, 0.28)); sp.addColorStop(1, rgba(W.glow, 0));
      c.fillStyle = sp; c.fillRect(ax - aw * 0.6, horizon, aw * 2.2, aw * 1.1);
    }
    c.fillStyle = shade(W.wall, -0.3); c.fillRect(LX, horizon - 3 * S, Wd, 4 * S);

    // the fountain in the middle of the courtyard
    var fy = horizon + 380 * 0.42, frx = 405, fry = frx * 0.26, fx0 = 960;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(fx0, fy + fry * 0.5, frx * 1.08, fry * 1.1, 0, 0, 6.283); c.fill();
    function oct(ctx, cx, cy, rx, ry) { ctx.beginPath(); for (var q = 0; q < 8; q++) { var qa = q * Math.PI / 4 + Math.PI / 8; ctx.lineTo(cx + Math.cos(qa) * rx, cy + Math.sin(qa) * ry); } ctx.closePath(); }
    oct(c, fx0, fy + fry * 0.25, frx, fry); c.fillStyle = shade(W.wall2, 0.15); c.fill();
    oct(c, fx0, fy, frx, fry); c.fillStyle = shade(W.wall2, 0.35); c.fill();
    oct(c, fx0, fy, frx * 0.88, fry * 0.8);
    var wa = c.createLinearGradient(0, fy - fry, 0, fy + fry); wa.addColorStop(0, '#2c6f8f'); wa.addColorStop(1, '#123a5a');
    c.fillStyle = wa; c.fill();
    c.strokeStyle = 'rgba(200,240,255,.35)'; c.lineWidth = 1.2 * S;
    for (var rp = 1; rp < 4; rp++) { c.beginPath(); c.ellipse(fx0, fy, frx * 0.2 * rp, fry * 0.2 * rp, 0, 0, 6.283); c.stroke(); }
    c.fillStyle = shade(W.wall2, 0.3); c.fillRect(fx0 - 5 * U, fy - 26 * U, 10 * U, 26 * U);
    c.beginPath(); c.ellipse(fx0, fy - 26 * U, 16 * U, 5 * U, 0, 0, 6.283); c.fill();

    var mh = c.createLinearGradient(0, wallTop - archW, 0, horizon + 40 * S);   // haze over the whole mid ground for depth
    mh.addColorStop(0, rgba(W.haze, 0)); mh.addColorStop(1, rgba(W.haze, 0.18));
    c.fillStyle = mh; c.fillRect(LX, wallTop - archW, Wd, horizon - wallTop + archW + 40 * S);
  }

  // the string of little lamps along a rope, hanging in a curve (sag SAG at the middle of x -440..2360), as one picture
  var SAG = 70, ROPE_HALF = LW / 2, ROPE_H = SAG + 70;
  function ropeY(x) { var xn = (x - 960) / ROPE_HALF; return SAG * (1 - xn * xn); }
  function rope(c, glow, S) {
    c.scale(S, S); c.translate(-LX, 20);
    var x0 = LX, x1 = LX + LW, N = 19;
    if (!glow) {
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(12,6,24,.85)'; c.lineWidth = 8.6;
      c.beginPath(); c.moveTo(x0, 0); c.quadraticCurveTo(960, SAG * 2, x1, 0); c.stroke();
      c.strokeStyle = 'rgba(233,184,102,.35)'; c.lineWidth = 2.7;
      c.beginPath(); c.moveTo(x0, -2.7); c.quadraticCurveTo(960, SAG * 2 - 2.7, x1, -2.7); c.stroke();
    }
    for (var i = 1; i < N; i++) {
      var x = x0 + i * LW / N, y = ropeY(x);
      if (glow) {
        var g = c.createRadialGradient(x, y + 15, 0, x, y + 15, 46); g.addColorStop(0, 'rgba(255,190,100,.55)'); g.addColorStop(1, 'rgba(255,190,100,0)');
        c.fillStyle = g; c.fillRect(x - 46, y - 31, 92, 92); continue;
      }
      c.strokeStyle = 'rgba(12,6,24,.8)'; c.lineWidth = 2.7; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke();
      c.fillStyle = 'rgba(255,184,90,.28)'; c.beginPath(); c.arc(x, y + 15, 17, 0, 6.283); c.fill();
      c.fillStyle = 'rgba(255,217,138,.85)'; c.beginPath(); c.arc(x, y + 15, 7, 0, 6.283); c.fill();
      c.fillStyle = '#fffbe8'; c.beginPath(); c.arc(x - 1.6, y + 13.3, 2.7, 0, 6.283); c.fill();
    }
  }

  // ---------- interface icons (a plain stroke, painted once; same family as Spider IK's) ----------
  function paintUi(scene) {
    var INK = '#f6efe0', GOLD = '#ffd36b', DARK = 'rgba(14,8,34,.74)';
    var icon = function (k, draw) { tex(scene, k, 96, 96, function (c) { c.strokeStyle = INK; c.fillStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }); };
    tex(scene, 'ic-exit', 96, 96, function (c) { Kit.play.exitIcon(c, 96, INK, 2.4); });          // the way out of the game: the kit's exit icon
    icon('ic-retry', function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); });
    icon('ic-grid', function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); });
    icon('ic-snd', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); });
    icon('ic-mute', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); });
    icon('ic-pause', function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); });
    icon('ic-close', function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); });
    icon('ic-play', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); });
    icon('ic-next', function (c) { c.beginPath(); c.moveTo(5, 12); c.lineTo(19, 12); c.moveTo(13, 6); c.lineTo(19, 12); c.lineTo(13, 18); c.stroke(); });
    icon('ic-lock', function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); });
    icon('ic-lantern', function (c) { c.beginPath(); c.moveTo(12, 2); c.lineTo(12, 4.5); c.moveTo(9, 6.5); c.lineTo(15, 6.5); c.lineTo(14, 4.5); c.lineTo(10, 4.5); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(8, 6.5); c.lineTo(16, 6.5); c.lineTo(17, 9.5); c.lineTo(17, 16.5); c.lineTo(15, 19); c.lineTo(9, 19); c.lineTo(7, 16.5); c.lineTo(7, 9.5); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(12, 10); c.lineTo(13.6, 12.3); c.lineTo(12, 14.6); c.lineTo(10.4, 12.3); c.closePath(); c.stroke(); });
    // the plate behind a button, a pill, the cards and the big round button
    tex(scene, 'ui-plate', 150, 150, function (c) { c.fillStyle = DARK; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 4; c.stroke(); });
    tex(scene, 'ui-pill', 150, 150, function (c) { c.fillStyle = DARK; c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 4; c.beginPath(); c.roundRect(5, 5, 140, 140, 70); c.fill(); c.stroke(); });   // (9-slice)
    tex(scene, 'ui-card', 160, 160, function (c) { c.fillStyle = 'rgba(16,10,40,.95)'; c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 4; c.beginPath(); c.roundRect(2, 2, 156, 156, 62); c.fill(); c.stroke(); });   // drawn as a 9-slice at any size
    tex(scene, 'ui-big', 200, 200, function (c) { c.scale(200 / 280, 200 / 280); var g = c.createLinearGradient(0, 0, 0, 280); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f2b23a'); c.fillStyle = g; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); });
    tex(scene, 'ui-btn', 150, 150, function (c) { var g = c.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f2b23a'); c.fillStyle = g; c.beginPath(); c.roundRect(2, 2, 146, 146, 73); c.fill(); });
    tex(scene, 'ui-btn2', 150, 150, function (c) { c.fillStyle = 'rgba(255,255,255,.12)'; c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 5; c.beginPath(); c.roundRect(4, 4, 142, 142, 71); c.fill(); c.stroke(); });
    tex(scene, 'ui-lv', 150, 150, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, 142, 142, 32); c.fill(); });
    tex(scene, 'ui-lvo', 150, 150, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, 142, 142, 32); c.stroke(); });
    // hearts (the tries) and stars
    var heart = function (c, s) { c.beginPath(); c.moveTo(48, 84); c.bezierCurveTo(8, 56, 10, 22, 32, 22); c.bezierCurveTo(42, 22, 48, 30, 48, 36); c.bezierCurveTo(48, 30, 54, 22, 64, 22); c.bezierCurveTo(86, 22, 88, 56, 48, 84); c.closePath(); };
    tex(scene, 'heart', 96, 96, function (c) { var g = c.createLinearGradient(0, 20, 0, 84); g.addColorStop(0, '#ff8aa0'); g.addColorStop(1, '#e8385a'); c.fillStyle = g; heart(c); c.fill(); c.strokeStyle = 'rgba(80,10,30,.7)'; c.lineWidth = 4; c.stroke(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(32, 38, 7, 4.5, -0.7, 0, 7); c.fill(); });
    tex(scene, 'heart0', 96, 96, function (c) { c.fillStyle = 'rgba(255,255,255,.08)'; heart(c); c.fill(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 5; c.stroke(); });
    tex(scene, 'star8', 96, 96, function (c) { c.fillStyle = '#fff'; star8(c, 48, 48, 44, 0.55); c.fill(); });
    tex(scene, 'bead1', 96, 96, function (c) { c.fillStyle = '#fff'; star8(c, 48, 48, 42, 0.6); c.fill(); c.strokeStyle = '#7a4a12'; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke(); });
    tex(scene, 'bead0', 96, 96, function (c) { c.fillStyle = 'rgba(255,255,255,.16)'; star8(c, 48, 48, 42, 0.6); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke(); });
    tex(scene, 'dot', 64, 64, function (c) { var g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    tex(scene, 'px', 8, 8, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 8, 8); });
    tex(scene, 'focus', 180, 180, function (c) { c.scale(0.5, 0.5); c.strokeStyle = '#fff'; c.lineWidth = 9; c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 10; c.setLineDash([34, 22]); c.beginPath(); c.arc(180, 180, 160, 0, 7); c.stroke(); });
    tex(scene, 'ring', 160, 160, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(80, 80, 72, 0, 7); c.stroke(); });
    tex(scene, 'badge', 90, 90, function (c) { c.fillStyle = 'rgba(14,8,34,.8)'; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.beginPath(); c.arc(45, 45, 40, 0, 7); c.fill(); c.stroke(); });
    tex(scene, 'vig', 128, 128, function (c) { c.scale(0.5, 0.5); var g = c.createRadialGradient(128, 118, 80, 128, 128, 200); g.addColorStop(0, 'rgba(4,2,16,0)'); g.addColorStop(1, 'rgba(4,2,16,.55)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    tex(scene, 'stars', 192, 192, function (c) {
      c.scale(0.375, 0.375); var R = rng(77);
      for (var i = 0; i < 70; i++) { c.globalAlpha = 0.25 + R() * 0.7; c.fillStyle = R() < 0.15 ? '#ffe9c2' : '#ffffff'; c.beginPath(); c.arc(R() * 512, R() * 512, (R() * 1.1 + 0.4) * 2.2, 0, 6.283); c.fill(); }
    });
    // the chain a lantern hangs from: one tall strip (cropped to the length wanted, so a lantern's chain is one image)
    tex(scene, 'chain', 32, 320, function (c) {
      c.strokeStyle = '#c99a4a'; c.lineWidth = 5;
      for (var y = 0; y < 320; y += 64) {
        c.beginPath(); c.ellipse(16, y + 16, 7, 14, 0, 0, 6.283); c.stroke();
        c.beginPath(); c.ellipse(16, y + 48, 2.5, 13, 0, 0, 6.283); c.stroke();
      }
    });
    // a lit lantern's glow: a strong core and a wide faint tail, white, tinted per lantern and added to the picture
    tex(scene, 'glow', 128, 128, function (c) {
      var g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.15, 'rgba(255,255,255,.62)'); g.addColorStop(0.4, 'rgba(255,255,255,.26)'); g.addColorStop(0.7, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    });
    // the moon with its soft glow (scenery)
    tex(scene, 'moon', 240, 240, function (c) {
      c.scale(0.5, 0.5); var o = 240, mr = 58, halo = c.createRadialGradient(o, o, 0, o, o, o);
      halo.addColorStop(0, 'rgba(255,236,190,.35)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
      c.fillStyle = halo; c.fillRect(0, 0, 480, 480);
      var m = document.createElement('canvas'); m.width = m.height = 160; var g = m.getContext('2d'), q = 80;
      var gr = g.createLinearGradient(q - mr, 0, q + mr, 0); gr.addColorStop(0, '#fff8e2'); gr.addColorStop(1, '#f3d9a0');
      g.fillStyle = gr; g.beginPath(); g.arc(q, q, mr, 0, 6.283); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(q + mr * 0.42, q - mr * 0.22, mr * 0.86, 0, 6.283); g.fill();
      c.drawImage(m, o - q, o - q);
    });
  }

  // the carved pillar tile and the urn with its fronds, in the colours of a world
  function paintWorldBits(scene, wi) {
    var W = WORLDS[wi];
    tex(scene, 'pillar', 120, 240, function (c) {
      var g = c.createLinearGradient(0, 0, 120, 0); g.addColorStop(0, shade(W.near, 0.02)); g.addColorStop(1, shade(W.near, 0.1));
      c.fillStyle = g; c.fillRect(0, 0, 120, 240);
      c.fillStyle = rgba(W.trim, 0.5); c.fillRect(114, 0, 6, 240); c.fillStyle = rgba(W.trim, 0.1); c.fillRect(100, 0, 14, 240);
      c.fillStyle = rgba(W.trim, 0.24); star8(c, 56, 120, 26, 0.5); c.fill();
    });
    var sz = 216;
    tex(scene, 'plant', sz * 1.5, sz * 1.1, function (c) {
      c.translate(sz * 0.75, sz * 1.08);
      c.fillStyle = W.near; c.beginPath();
      c.moveTo(-sz * 0.32, 0); c.bezierCurveTo(-sz * 0.42, -sz * 0.25, -sz * 0.3, -sz * 0.45, -sz * 0.18, -sz * 0.5);
      c.lineTo(sz * 0.18, -sz * 0.5); c.bezierCurveTo(sz * 0.3, -sz * 0.45, sz * 0.42, -sz * 0.25, sz * 0.32, 0); c.closePath(); c.fill();
      c.strokeStyle = rgba(W.trim, 0.35); c.lineWidth = 4; c.stroke();
      c.fillStyle = W.leaf;
      for (var q = 0; q < 7; q++) {
        var qa = -Math.PI / 2 + (q - 3) * 0.36, L = sz * (0.75 + (q % 2) * 0.25);
        c.beginPath(); c.moveTo(0, -sz * 0.5);
        c.quadraticCurveTo(Math.cos(qa) * L * 0.5 - sz * 0.08, -sz * 0.5 + Math.sin(qa) * L * 0.5, Math.cos(qa) * L, -sz * 0.5 + Math.sin(qa) * L + sz * 0.15);
        c.quadraticCurveTo(Math.cos(qa) * L * 0.5 + sz * 0.08, -sz * 0.5 + Math.sin(qa) * L * 0.5 + sz * 0.06, 0, -sz * 0.5);
        c.fill();
      }
    });
  }

  // the sky: a stretched strip of gradient (so any screen shape is covered) and the stars tile
  function paintSky(scene, wi) {
    var W = WORLDS[wi];
    tex(scene, 'sky', 8, 256, function (c) { var g = c.createLinearGradient(0, 0, 0, 256); W.sky.forEach(function (col, i) { g.addColorStop(i / (W.sky.length - 1), col); }); c.fillStyle = g; c.fillRect(0, 0, 8, 256); });
  }

  // ---------- public ----------
  // Fixed design-size pictures (owner, 2026-11-16: art ships as baked AVIF, tools/bake-art.js): nothing here follows the screen.
  var LPAD = 3, LU = 232, CW = Math.ceil(LU * 0.96) + LPAD * 2, CH = Math.ceil(LH * LU + LPAD * 2);
  var GX = 0.46, GY0 = 0.33, GH = 0.9, GW = Math.ceil(2 * GX * LU) + 2, GHP = Math.ceil(GH * LU) + 2;
  var BAKE = /[?&]bake\b/.test(location.search);
  var out = {
    LANTERNS: LANTERNS, WORLDS: WORLDS, LH: LH, BODY_Y: BODY_Y, LU: LU, LPAD: LPAD, CH: CH, SAG: SAG, ROPE_H: ROPE_H, ropeY: ropeY, HOR: HOR, LX: LX, LY: LY, LS: LS, LW: LW, LHH: LHH,
    mix: mix, shade: shade,
    cell: { w: CW, h: CH, ox: 0.5, oy: LPAD / CH },                       // the whole dark lantern in its sheet, pivot at the ring top
    litCell: { w: GW, h: GHP, ox: 0.5, oy: -GY0 * LU / GHP },             // the lit glass only (drawn over the dark lantern)
    // everything every level uses, once (Boot)
    paint: function (scene) {
      if (out.done) return; out.done = true;
      // one sheet of the lantern pictures: the six dark lanterns whole, and the lit ones as the glass only
      var t = realTex(scene, 'ftl-lan', CW * 3, CH * 2 + GHP * 2, function (c) {
        for (var k = 0; k < 6; k++) {
          c.save(); c.translate((k % 3) * CW + CW / 2, ((k / 3) | 0) * CH + LPAD); c.scale(LU, LU); lantern(c, k, false); c.restore();
        }
        for (var m = 0; m < 6; m++) {
          c.save(); c.translate((m % 3) * GW + GW / 2, CH * 2 + ((m / 3) | 0) * GHP - GY0 * LU + 1); c.scale(LU, LU);
          c.beginPath(); c.rect(-GX, GY0, 2 * GX, GH); c.clip(); lantern(c, m, true); c.restore();
        }
      });
      var tx = scene.textures.get(t);
      for (var k2 = 0; k2 < 6; k2++) if (!tx.has('d' + k2)) {
        tx.add('d' + k2, 0, (k2 % 3) * CW, ((k2 / 3) | 0) * CH, CW, CH);
        tx.add('l' + k2, 0, (k2 % 3) * GW, CH * 2 + ((k2 / 3) | 0) * GHP, GW, GHP);
      }
      // the small pictures (icons, plates, hearts, stars, glows, the moon, the rope...) on one sheet, then each cut out
      // into a texture of its own under its own name (the sheet is one file; the rest of the game uses the names)
      collect = []; paintUi(scene);
      tex(scene, 'rope', LW * LS, ROPE_H * LS, function (c) { rope(c, false, LS); });
      tex(scene, 'ropeg', LW * LS / 2, ROPE_H * LS / 2, function (c) { rope(c, true, LS / 2); });
      var items = collect, L; collect = null; L = pack(items, 1024);
      var sheet = realTex(scene, 'ftl-ui', L.w, L.h, function (c) { paintItems(c, items); }), src = scene.textures.get(sheet).getSourceImage();
      items.forEach(function (it) {
        var cv = document.createElement('canvas'); cv.width = it.w; cv.height = it.h;
        cv.getContext('2d').drawImage(src, it.x, it.y, it.w, it.h, 0, 0, it.w, it.h); scene.textures.addCanvas(it.key, cv);
      });
      scene.textures.remove('ftl-ui');
      if (BAKE) [0, 1, 2].forEach(function (i) { out.world(scene, i, true); });          // (the bake tool wants every world's sheet)
    },
    // the world on screen: one sheet with its land, sky strip, pillar and plant (frames 'land', 'sky', 'pillar', 'plant');
    // the other worlds' sheets are let go
    world: function (scene, wi, keep) {
      var key = 'ftl-world-' + wi;
      if (!keep) scene.textures.getTextureKeys().forEach(function (k) { var m = /^ftl-world-(\d)$/.exec(k); if (m && +m[1] !== wi) scene.textures.remove(k); });
      collect = []; tex(scene, 'land', LW * LS, LHH * LS, function (c) { land(c, wi); }); paintWorldBits(scene, wi); paintSky(scene, wi);
      var items = collect; collect = null; var L = pack(items, 970);
      realTex(scene, key, L.w, L.h, function (c) { paintItems(c, items); });
      var tx = scene.textures.get(key);
      items.forEach(function (it) { if (!tx.has(it.key)) tx.add(it.key, 0, it.x, it.y, it.w, it.h); });
      return key;
    }
  };
  window.LFArt = out;
})();
