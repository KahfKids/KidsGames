/* Balloon Pop: art.js
   All art is drawn in code (crisp at any size, works offline): glossy balloons with rim light, the
   rainbow and good-deed balloons, the grumpy storm cloud, and three layered worlds (Morning Garden,
   Seaside, Lantern Night) painted once per screen size onto offscreen canvases. Exposes window.BalloonArt. */
(function () {
  'use strict';
  var A = window.BalloonArt = {};

  // ---------- helpers ----------
  function rng(seed) { // mulberry32: the same scene every time for a world
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rgba(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); }
  function star8(g, x, y, r, inner) {
    g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function vgrad(g, y0, y1, stops) { var gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  A.shade = shade; A.mix = mix; A.rgba = rgba; A.rr = rr; A.star8 = star8; A.rng = rng;

  // ---------- palette ----------
  // Each colour also has its own little symbol on the balloon, so colour goals work for colour-blind kids too.
  A.COLORS = [
    { name: 'red', c: '#ff4d5e', m: 'heart' },
    { name: 'orange', c: '#ff9a3c', m: 'ring' },
    { name: 'yellow', c: '#ffd23f', m: 'sun' },
    { name: 'green', c: '#3fcf74', m: 'leaf' },
    { name: 'blue', c: '#3fa4f5', m: 'drop' },
    { name: 'purple', c: '#a77bff', m: 'diamond' },
    { name: 'pink', c: '#ff7eb9', m: 'flower' }
  ];
  A.CONFETTI = ['#ff4d5e', '#ffd23f', '#3fcf74', '#3fa4f5', '#a77bff', '#ff9a3c', '#ffffff'];

  A.WORLDS = [
    { name: 'Morning Garden', color: '#7fdc6a', string: 'rgba(80,60,70,.5)', night: false },
    { name: 'Seaside', color: '#4fd0f0', string: 'rgba(40,70,100,.5)', night: false },
    { name: 'Lantern Night', color: '#ffc35a', string: 'rgba(255,240,220,.55)', night: true }
  ];

  // ---------- balloon ----------
  var BW = 94, BHt = 106, KNOT = 9;
  A.BALLOON = { w: BW, h: BHt, knot: KNOT };
  function bodyPath(g) {
    var w = BW, h = BHt;
    g.beginPath(); g.moveTo(0, h / 2);
    g.bezierCurveTo(-w * 0.62, h * 0.3, -w * 0.6, -h * 0.5, 0, -h * 0.5);
    g.bezierCurveTo(w * 0.6, -h * 0.5, w * 0.62, h * 0.3, 0, h * 0.5);
    g.closePath();
  }
  // Symbol for a colour, centred at (x, y), about 2s wide.
  function motif(g, m, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s / 10, s / 10); g.beginPath();
    if (m === 'heart') { g.moveTo(0, 8); g.bezierCurveTo(-15, -1, -8, -15, 0, -6); g.bezierCurveTo(8, -15, 15, -1, 0, 8); g.fill(); }
    else if (m === 'ring') { g.arc(0, 0, 8.5, 0, 6.2832); g.arc(0, 0, 4.2, 0, 6.2832, true); g.fill('evenodd'); }
    else if (m === 'sun') { g.arc(0, 0, 5.2, 0, 6.2832); g.fill(); g.lineWidth = 2.4; g.lineCap = 'round'; g.strokeStyle = g.fillStyle; g.beginPath();
      for (var k = 0; k < 8; k++) { var a2 = k * Math.PI / 4; g.moveTo(Math.cos(a2) * 7.5, Math.sin(a2) * 7.5); g.lineTo(Math.cos(a2) * 10.5, Math.sin(a2) * 10.5); } g.stroke(); }
    else if (m === 'leaf') { g.moveTo(0, -10); g.quadraticCurveTo(10, 0, 0, 10); g.quadraticCurveTo(-10, 0, 0, -10); g.fill(); }
    else if (m === 'drop') { g.moveTo(0, -11); g.bezierCurveTo(4, -4, 9, 0, 9, 4); g.arc(0, 4, 9, 0, Math.PI); g.bezierCurveTo(-9, 0, -4, -4, 0, -11); g.fill(); }
    else if (m === 'diamond') { g.moveTo(0, -10); g.lineTo(8, 0); g.lineTo(0, 10); g.lineTo(-8, 0); g.closePath(); g.fill(); }
    else if (m === 'flower') { for (var i = 0; i < 5; i++) { var a = i * 1.2566 - 1.5708; g.moveTo(Math.cos(a) * 5.5 + 4.2, Math.sin(a) * 5.5); g.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 4.2, 0, 6.2832); } g.fill(); }
    g.restore();
  }
  A.motif = motif;

  // A.balloon(ci, kind, sc) -> { c, ox, oy, w, h }: sprite in device px; draw at (-ox, -oy, w, h) in game units
  // around the body centre. kind: 'b' (plain colour ci), 'deed' (pearl and gold), 'rainbow'.
  A.balloon = function (ci, kind, sc, glow) {
    var pad = 18, w = BW + pad * 2, h = BHt + KNOT + pad * 2;
    var c = canvas(w * sc, h * sc), g = c.getContext('2d');
    g.scale(sc, sc); g.translate(w / 2, pad + BHt / 2);
    var col = kind === 'deed' ? '#fff3dc' : kind === 'rainbow' ? '#ffffff' : A.COLORS[ci].c;
    // soft glow at night, soft drop shadow by day
    g.save();
    if (glow) { g.shadowColor = rgba(col, 0.75); g.shadowBlur = 22 * sc; }
    else { g.shadowColor = 'rgba(30,20,60,.22)'; g.shadowBlur = 12 * sc; g.shadowOffsetY = 6 * sc; }
    bodyPath(g); g.fillStyle = col; g.fill(); g.restore();
    // knot
    g.fillStyle = shade(col, -0.25);
    g.beginPath(); g.moveTo(-6.5, BHt / 2 + KNOT); g.quadraticCurveTo(0, BHt / 2 + KNOT - 3, 6.5, BHt / 2 + KNOT); g.lineTo(0, BHt / 2 - 3); g.closePath(); g.fill();
    // body
    bodyPath(g);
    var gr = g.createRadialGradient(-BW * 0.2, -BHt * 0.26, 3, -BW * 0.04, -BHt * 0.04, BHt * 0.74);
    gr.addColorStop(0, shade(col, 0.55)); gr.addColorStop(0.32, col); gr.addColorStop(0.82, shade(col, -0.2)); gr.addColorStop(1, shade(col, -0.36));
    g.fillStyle = gr; g.fill();
    g.save(); bodyPath(g); g.clip();
    if (kind === 'rainbow') {
      g.save(); g.rotate(-0.5);
      var bands = ['#ff4d5e', '#ff9a3c', '#ffd23f', '#3fcf74', '#3fa4f5', '#a77bff'];
      for (var i = 0; i < 12; i++) { g.fillStyle = bands[i % 6]; g.fillRect(-120 + i * 20, -120, 20, 240); }
      g.restore();
      var sh = g.createRadialGradient(-BW * 0.2, -BHt * 0.26, 3, -BW * 0.04, -BHt * 0.04, BHt * 0.74);
      sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(20,0,40,.35)');
      g.fillStyle = sh; g.fillRect(-BW, -BHt, BW * 2, BHt * 2);
    } else if (kind === 'deed') {
      var pearl = g.createLinearGradient(-BW / 2, -BHt / 2, BW / 2, BHt / 2);
      pearl.addColorStop(0, 'rgba(255,220,240,.35)'); pearl.addColorStop(0.5, 'rgba(210,240,255,.3)'); pearl.addColorStop(1, 'rgba(255,236,190,.4)');
      g.fillStyle = pearl; g.fillRect(-BW, -BHt, BW * 2, BHt * 2);
      g.fillStyle = 'rgba(214,150,40,.22)';
      for (var y = -BHt / 2; y < BHt / 2; y += 26) for (var x = -BW / 2 + ((y / 26) & 1) * 13; x < BW / 2; x += 26) { star8(g, x, y, 7); g.fill(); }
      g.fillStyle = '#f2b33d'; star8(g, 0, 2, 22); g.fill();
      g.fillStyle = '#fff6d8'; star8(g, 0, 2, 13); g.fill();
      g.fillStyle = '#ff6b81'; g.save(); g.translate(0, 3); g.scale(0.55, 0.55); g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-15, -1, -8, -15, 0, -6); g.bezierCurveTo(8, -15, 15, -1, 0, 8); g.fill(); g.restore();
    } else {
      g.fillStyle = 'rgba(255,255,255,.3)'; motif(g, A.COLORS[ci].m, 0, 6, 11);
    }
    // rim light (right/bottom inside edge) and bounce light
    g.save(); g.translate(-6, -5); bodyPath(g); g.restore();
    g.lineWidth = 7; g.strokeStyle = kind === 'deed' ? 'rgba(255,214,120,.9)' : 'rgba(255,255,255,.28)'; g.stroke();
    var bl = g.createRadialGradient(BW * 0.2, BHt * 0.24, 0, BW * 0.2, BHt * 0.24, 26); bl.addColorStop(0, 'rgba(255,255,255,.22)'); bl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = bl; g.fillRect(-BW, -BHt, BW * 2, BHt * 2);
    g.restore();
    // specular highlight
    var hl = g.createLinearGradient(0, -BHt * 0.42, 0, -BHt * 0.06); hl.addColorStop(0, 'rgba(255,255,255,.95)'); hl.addColorStop(1, 'rgba(255,255,255,.1)');
    g.fillStyle = hl; ell(g, -BW * 0.21, -BHt * 0.22, BW * 0.085, BHt * 0.17, 0.42); g.fill();
    if (kind === 'deed') { g.strokeStyle = '#e8a93a'; g.lineWidth = 2; bodyPath(g); g.stroke(); }
    return { c: c, ox: w / 2, oy: pad + BHt / 2, w: w, h: h };
  };

  // ---------- storm cloud (avoid tapping) ----------
  var PUFFS = [[-40, 8, 25], [-14, -14, 31], [20, -8, 29], [44, 10, 22], [2, 14, 30], [-52, 22, 16], [56, 24, 14], [-24, 22, 22], [28, 22, 22]];
  A.STORM = { w: 150, h: 96 };
  A.storm = function (sc, night) {
    var pad = 20, w = 150 + pad * 2, h = 100 + pad * 2, c = canvas(w * sc, h * sc), g = c.getContext('2d');
    g.scale(sc, sc); g.translate(w / 2, h / 2 - 4);
    function puffs() { g.beginPath(); PUFFS.forEach(function (p) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, 6.2832); }); }
    g.save(); g.shadowColor = night ? 'rgba(150,140,255,.35)' : 'rgba(20,20,50,.3)'; g.shadowBlur = 14 * sc; g.shadowOffsetY = 6 * sc;
    puffs(); g.fillStyle = '#6d6f96'; g.fill(); g.restore();
    puffs(); g.fillStyle = vgrad(g, -46, 46, [[0, '#9a96c4'], [0.55, '#6c6898'], [1, '#46426e']]); g.fill();
    g.save(); puffs(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.28)'; [[-14, -20, 22], [20, -14, 18], [-40, 2, 14]].forEach(function (p) { ell(g, p[0], p[1], p[2], p[2] * 0.6); g.fill(); });
    g.fillStyle = 'rgba(30,30,70,.3)'; g.fillRect(-90, 22, 180, 34);
    g.restore();
    // a small lightning bolt under the cloud (no face: owner rule)
    g.save(); g.shadowColor = 'rgba(255,230,120,.8)'; g.shadowBlur = 10 * sc;
    g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(6, 30); g.lineTo(-8, 54); g.lineTo(1, 54); g.lineTo(-5, 70); g.lineTo(14, 46); g.lineTo(5, 46); g.lineTo(13, 30); g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-40, -2); g.quadraticCurveTo(-20, 6, 0, 0); g.quadraticCurveTo(20, -6, 40, 2); g.stroke();
    return { c: c, ox: w / 2, oy: h / 2 - 4, w: w, h: h };
  };

  // Soft white cloud for the daytime sky (decor only).
  A.softCloud = function (sc, seed) {
    var R = rng(seed), w = 220, h = 100, c = canvas(w * sc, h * sc), g = c.getContext('2d');
    g.scale(sc, sc);
    var puffs = [[60, 62, 22], [92, 48, 30], [130, 44, 26], [160, 60, 20], [110, 66, 22], [78, 70, 16], [146, 70, 15]];
    puffs.forEach(function (p) { p[0] += (R() - 0.5) * 12; p[2] *= 0.85 + R() * 0.3; });
    puffs.forEach(function (p) { g.fillStyle = 'rgba(200,215,240,.55)'; circ(g, p[0], p[1] + 4, p[2]); g.fill(); });
    puffs.forEach(function (p) {
      var gr = g.createRadialGradient(p[0] - p[2] * 0.3, p[1] - p[2] * 0.45, 1, p[0], p[1], p[2]); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(244,248,255,.92)');
      g.fillStyle = gr; circ(g, p[0], p[1], p[2]); g.fill();
    });
    return c;
  };

  // A fanous lantern (hanging decoration / rising sky lantern), drawn live at (x, y), size s.
  A.lantern = function (g, x, y, s, col, t) {
    g.save(); g.translate(x, y); g.scale(s / 30, s / 30);
    var gl = g.createRadialGradient(0, 4, 2, 0, 4, 40); gl.addColorStop(0, rgba(col, 0.55)); gl.addColorStop(1, rgba(col, 0));
    g.fillStyle = gl; circ(g, 0, 4, 40); g.fill();
    g.fillStyle = '#c8902f'; g.beginPath(); g.moveTo(-9, -14); g.lineTo(9, -14); g.lineTo(4, -21); g.lineTo(-4, -21); g.closePath(); g.fill();
    circ(g, 0, -23, 2.6); g.fill();
    var body = g.createLinearGradient(-12, 0, 12, 0); body.addColorStop(0, shade(col, -0.25)); body.addColorStop(0.5, shade(col, 0.45)); body.addColorStop(1, shade(col, -0.25));
    g.fillStyle = body; g.beginPath(); g.moveTo(-9, -14); g.bezierCurveTo(-17, -4, -17, 10, -7, 18); g.lineTo(7, 18); g.bezierCurveTo(17, 10, 17, -4, 9, -14); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,70,10,.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -14); g.lineTo(0, 18); g.moveTo(-8, -12); g.quadraticCurveTo(-12, 3, -5, 18); g.moveTo(8, -12); g.quadraticCurveTo(12, 3, 5, 18); g.stroke();
    g.fillStyle = 'rgba(255,250,220,' + (0.55 + 0.25 * Math.sin(t || 0)) + ')'; ell(g, 0, 3, 4, 7); g.fill();
    g.fillStyle = '#c8902f'; g.fillRect(-7, 18, 14, 3.5);
    g.restore();
  };

  // ---------- worlds ----------
  // Painted once per screen size: sky, far, mid and near layers (device px, a little wider than the
  // screen so they can drift for depth). k = game-unit scale so scenery scales with the screen.
  A.paintWorld = function (wi, w, h, dpr, k) {
    var m = Math.round(34 * dpr), Wd = Math.round(w * dpr) + m * 2, H = Math.round(h * dpr), S = dpr * Math.max(0.75, Math.min(1.5, k));
    var L = { sky: canvas(Wd, H), far: canvas(Wd, H), mid: canvas(Wd, H), near: canvas(Wd, H) };
    var out = [garden, seaside, night][wi](L, Wd, H, S, m);
    out.sky = L.sky; out.far = L.far; out.mid = L.mid; out.near = L.near; out.margin = m;
    return out;
  };

  function sunDisk(g, x, y, r, S, rays) {
    var halo = g.createRadialGradient(x, y, 0, x, y, r * 7); halo.addColorStop(0, 'rgba(255,246,205,.85)'); halo.addColorStop(0.3, 'rgba(255,240,190,.35)'); halo.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = halo; circ(g, x, y, r * 7); g.fill();
    if (rays) { g.save(); g.translate(x, y); g.fillStyle = 'rgba(255,250,220,.08)';
      for (var i = 0; i < 14; i++) { g.rotate(Math.PI / 7); g.beginPath(); g.moveTo(-r * 0.35, 0); g.lineTo(r * 0.35, 0); g.lineTo(0, -r * 9); g.closePath(); g.fill(); } g.restore(); }
    var d = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); d.addColorStop(0, '#fffdf0'); d.addColorStop(1, '#ffe48a');
    g.fillStyle = d; circ(g, x, y, r); g.fill();
  }
  function ridge(g, base, amp, color, seed, Wd, H, S) {
    var r = rng(seed), ph = r() * 6, f1 = 0.0025 + r() * 0.002, f2 = 0.007 + r() * 0.004;
    g.fillStyle = color; g.beginPath(); g.moveTo(0, H);
    for (var x = 0; x <= Wd + 8; x += 6 * S) g.lineTo(x, base - Math.sin(x / S * f1 + ph) * amp - Math.sin(x / S * f2 + ph * 2) * amp * 0.4);
    g.lineTo(Wd, H); g.closePath(); g.fill();
  }
  function haze(g, top, bottom, color, a, Wd) {
    var hz = g.createLinearGradient(0, top, 0, bottom); hz.addColorStop(0, rgba(color, 0)); hz.addColorStop(1, rgba(color, a));
    g.fillStyle = hz; g.fillRect(0, top, Wd, bottom - top);
  }
  function onion(g, cx, base, r) {
    g.moveTo(cx - r, base);
    g.bezierCurveTo(cx - r * 1.25, base - r * 0.9, cx - r * 0.2, base - r * 1.3, cx, base - r * 1.75);
    g.bezierCurveTo(cx + r * 0.2, base - r * 1.3, cx + r * 1.25, base - r * 0.9, cx + r, base);
    g.closePath();
  }
  function archPath(g, x, top, w, bottom) { // pointed arch opening
    var r = w * 0.62;
    g.moveTo(x - w / 2, bottom); g.lineTo(x - w / 2, top + w * 0.5);
    g.arcTo(x - w / 2, top, x, top - w * 0.05, r); g.lineTo(x, top - w * 0.05);
    g.arcTo(x + w / 2, top, x + w / 2, top + w * 0.5, r); g.lineTo(x + w / 2, bottom); g.closePath();
  }
  function bush(g, x, y, r, col, R) {
    for (var i = 0; i < 6; i++) { var a = -Math.PI + i * Math.PI / 5, rr2 = r * (0.5 + R() * 0.3);
      g.fillStyle = col; circ(g, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.45, rr2); g.fill(); }
    g.fillStyle = col; ell(g, x, y, r * 1.05, r * 0.5); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (var j = 0; j < 4; j++) { circ(g, x - r * 0.4 + j * r * 0.25, y - r * 0.55 + (j % 2) * r * 0.1, r * 0.18); g.fill(); }
  }
  function tulip(g, x, y, s, col) {
    g.strokeStyle = '#2f8a3f'; g.lineWidth = 2.2 * s / 10; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * 0.2, y - s, x, y - s * 1.8); g.stroke();
    g.fillStyle = '#3ea24c'; ell(g, x - s * 0.35, y - s * 0.7, s * 0.18, s * 0.5, -0.5); g.fill();
    g.fillStyle = col; g.beginPath(); g.moveTo(x - s * 0.45, y - s * 2.2); g.lineTo(x - s * 0.2, y - s * 1.95); g.lineTo(x, y - s * 2.3); g.lineTo(x + s * 0.2, y - s * 1.95);
    g.lineTo(x + s * 0.45, y - s * 2.2); g.quadraticCurveTo(x + s * 0.5, y - s * 1.6, x, y - s * 1.55); g.quadraticCurveTo(x - s * 0.5, y - s * 1.6, x - s * 0.45, y - s * 2.2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, x - s * 0.15, y - s * 1.9, s * 0.08, s * 0.2); g.fill();
  }

  // --- World 1: Morning Garden ---
  function garden(L, Wd, H, S) {
    var hz = H * 0.6, R = rng(101);
    var g = L.sky.getContext('2d');
    g.fillStyle = vgrad(g, 0, hz + 30 * S, [[0, '#4f9fea'], [0.45, '#8ccbf6'], [0.8, '#ffdcc6'], [1, '#fff1dc']]); g.fillRect(0, 0, Wd, H);
    sunDisk(g, Wd * 0.8, H * 0.15, 32 * S, S, true);
    var f = L.far.getContext('2d');
    ridge(f, hz - 40 * S, 30 * S, '#b9d9d0', 11, Wd, H, S);
    // tiny trees on the far ridge
    for (var i = 0; i < 26; i++) { var tx = R() * Wd, ty = hz - 30 * S - R() * 20 * S; f.fillStyle = '#a2cbbd'; circ(f, tx, ty, (4 + R() * 5) * S); f.fill(); }
    ridge(f, hz - 10 * S, 22 * S, '#9cc9b0', 12, Wd, H, S);
    // a little domed garden pavilion far away
    var px = Wd * 0.24, pb = hz - 18 * S; f.fillStyle = '#a9cdbd'; f.beginPath();
    f.rect(px - 22 * S, pb - 26 * S, 44 * S, 26 * S); onion(f, px, pb - 26 * S, 18 * S); f.fill();
    haze(f, hz - 150 * S, hz + 20 * S, '#fff4e4', 0.55, Wd);
    var md = L.mid.getContext('2d');
    var wallTop = hz + 4 * S, wallBot = hz + 92 * S;
    // tree crowns peeking over the wall
    for (var t = 0; t < Wd / (60 * S) + 2; t++) { var cx = t * 60 * S + R() * 30 * S, cr = (26 + R() * 18) * S;
      md.fillStyle = t % 2 ? '#69b96a' : '#5aa95e'; circ(md, cx, wallTop - cr * 0.35, cr); md.fill();
      md.fillStyle = 'rgba(255,255,255,.12)'; circ(md, cx - cr * 0.3, wallTop - cr * 0.7, cr * 0.4); md.fill(); }
    // garden wall with pointed arches and a tile band
    md.fillStyle = vgrad(md, wallTop, wallBot, [[0, '#f6e4ca'], [1, '#e8cba6']]); md.fillRect(0, wallTop, Wd, wallBot - wallTop);
    md.fillStyle = '#d6a978'; md.fillRect(0, wallTop - 10 * S, Wd, 12 * S); md.fillStyle = 'rgba(255,255,255,.35)'; md.fillRect(0, wallTop - 10 * S, Wd, 2.5 * S);
    for (var x = 0; x < Wd; x += 16 * S) { md.fillStyle = (x / (16 * S)) % 2 < 1 ? '#2aa198' : '#e07a5f';
      md.beginPath(); md.moveTo(x, wallTop + 11 * S); md.lineTo(x + 8 * S, wallTop + 5 * S); md.lineTo(x + 16 * S, wallTop + 11 * S); md.lineTo(x + 8 * S, wallTop + 17 * S); md.fill(); }
    var aw = 100 * S, ow = 54 * S;
    for (var ax = aw / 2 - (R() * aw * 0.5); ax < Wd + aw; ax += aw) {
      md.beginPath(); archPath(md, ax, wallTop + 30 * S, ow, wallBot); md.fillStyle = vgrad(md, wallTop + 26 * S, wallBot, [[0, '#d9f1df'], [1, '#93cfa4']]); md.fill();
      md.fillStyle = '#7cbf86'; ell(md, ax, wallBot - 4 * S, ow * 0.45, 10 * S); md.fill();
      md.strokeStyle = 'rgba(150,100,50,.3)'; md.lineWidth = 3 * S; md.beginPath(); archPath(md, ax, wallTop + 30 * S, ow, wallBot); md.stroke();
      md.fillStyle = 'rgba(214,169,120,.6)'; star8(md, ax + aw / 2, wallTop + 44 * S, 7 * S); md.fill();
    }
    // lawn
    md.fillStyle = vgrad(md, wallBot, H, [[0, '#93d676'], [1, '#5db45b']]); md.fillRect(0, wallBot, Wd, H - wallBot);
    md.fillStyle = 'rgba(0,0,0,.08)'; md.fillRect(0, wallBot, Wd, 5 * S);
    // cypresses in front of the wall
    for (var c2 = 0; c2 < Wd / (170 * S) + 1; c2++) { var cx2 = c2 * 170 * S + 60 * S + R() * 40 * S, ch = (110 + R() * 50) * S;
      md.fillStyle = '#2f7d4a'; ell(md, cx2, wallBot - ch * 0.42, 15 * S, ch * 0.55); md.fill();
      md.fillStyle = '#3f9a5c'; ell(md, cx2 - 5 * S, wallBot - ch * 0.46, 7 * S, ch * 0.44); md.fill(); }
    // flower bed along the wall
    for (var fl = 0; fl < Wd / (9 * S); fl++) { md.fillStyle = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff'][fl % 4]; circ(md, fl * 9 * S + R() * 6 * S, wallBot + (4 + R() * 10) * S, (2 + R() * 2) * S); md.fill(); }
    // a path and a star-shaped fountain pool in the middle of the lawn
    var fx = Wd * 0.5, fy = wallBot + (H - wallBot) * 0.42;
    md.fillStyle = 'rgba(240,222,190,.9)'; md.beginPath(); md.moveTo(fx - 26 * S, wallBot); md.lineTo(fx + 26 * S, wallBot); md.lineTo(fx + 90 * S, H); md.lineTo(fx - 90 * S, H); md.fill();
    md.fillStyle = 'rgba(0,0,0,.1)'; ell(md, fx, fy + 10 * S, 92 * S, 26 * S); md.fill();
    md.save(); md.translate(fx, fy); md.scale(1, 0.32);
    md.fillStyle = '#e9d2ac'; star8(md, 0, 0, 96 * S, 0.8); md.fill();
    md.fillStyle = '#d4b483'; star8(md, 0, 10 * S, 96 * S, 0.8); md.globalCompositeOperation = 'destination-over'; md.fill(); md.globalCompositeOperation = 'source-over';
    md.fillStyle = vgrad(md, -80 * S, 80 * S, [[0, '#9fe3f0'], [1, '#3fb6d6']]); star8(md, 0, 0, 82 * S, 0.8); md.fill();
    md.fillStyle = 'rgba(255,255,255,.35)'; ell(md, -20 * S, -24 * S, 30 * S, 10 * S); md.fill();
    md.restore();
    md.fillStyle = '#e9d2ac'; md.fillRect(fx - 7 * S, fy - 34 * S, 14 * S, 34 * S); ell(md, fx, fy - 34 * S, 20 * S, 6 * S); md.fill();
    md.strokeStyle = 'rgba(220,245,255,.85)'; md.lineWidth = 3 * S; md.lineCap = 'round';
    [-1, 1].forEach(function (d2) { md.beginPath(); md.moveTo(fx, fy - 44 * S); md.quadraticCurveTo(fx + d2 * 24 * S, fy - 70 * S, fx + d2 * 40 * S, fy - 8 * S); md.stroke(); });
    md.beginPath(); md.moveTo(fx, fy - 36 * S); md.lineTo(fx, fy - 62 * S); md.stroke();
    bush(md, Wd * 0.12, fy + 6 * S, 34 * S, '#4c9f52', R); bush(md, Wd * 0.88, fy + 2 * S, 30 * S, '#4c9f52', R);
    var n = L.near.getContext('2d');
    n.fillStyle = vgrad(n, H - 90 * S, H, [[0, '#4aa652'], [1, '#2f7d3f']]);
    n.beginPath(); n.moveTo(0, H); n.lineTo(0, H - 70 * S);
    n.bezierCurveTo(Wd * 0.25, H - 104 * S, Wd * 0.45, H - 46 * S, Wd * 0.62, H - 58 * S); n.bezierCurveTo(Wd * 0.8, H - 70 * S, Wd * 0.9, H - 96 * S, Wd, H - 80 * S);
    n.lineTo(Wd, H); n.fill();
    bush(n, -10 * S, H - 74 * S, 60 * S, '#2c7a3e', R); bush(n, Wd + 10 * S, H - 86 * S, 70 * S, '#2c7a3e', R);
    var cols = ['#ff5d73', '#ffd43b', '#ff8fc8', '#ffffff', '#ff9a3c'];
    for (var tp = 0; tp < Wd / (34 * S); tp++) { var tx2 = tp * 34 * S + R() * 20 * S, u = tx2 / Wd;
      var by = u < 0.62 ? H - 70 * S + (u / 0.62) * 8 * S : H - 62 * S - (u - 0.62) * 40 * S;
      tulip(n, tx2, by + (10 + R() * 30) * S, (10 + R() * 4) * S, cols[tp % cols.length]); }
    return { horizon: hz };
  }

  // --- World 2: Seaside ---
  function seaside(L, Wd, H, S) {
    var hz = H * 0.55, R = rng(202);
    var g = L.sky.getContext('2d');
    g.fillStyle = vgrad(g, 0, hz, [[0, '#2b8fdc'], [0.55, '#74c2f2'], [0.92, '#d6f1ff'], [1, '#fff4e0']]); g.fillRect(0, 0, Wd, H);
    var sx = Wd * 0.2, sy = H * 0.13; sunDisk(g, sx, sy, 30 * S, S, false);
    var f = L.far.getContext('2d');
    f.fillStyle = vgrad(f, hz, H, [[0, '#62cbe4'], [0.3, '#2ea0cc'], [1, '#126fa3']]); f.fillRect(0, hz, Wd, H - hz);
    // distant island
    f.fillStyle = '#8bbdb9'; f.beginPath(); f.moveTo(Wd * 0.62, hz + 1); f.bezierCurveTo(Wd * 0.68, hz - 34 * S, Wd * 0.78, hz - 40 * S, Wd * 0.92, hz + 1); f.fill();
    for (var p = 0; p < 3; p++) { var px = Wd * (0.7 + p * 0.06), pb = hz - 24 * S + p * 6 * S; f.strokeStyle = '#7aaeaa'; f.lineWidth = 2 * S; f.beginPath(); f.moveTo(px, pb + 10 * S); f.lineTo(px + 2 * S, pb - 12 * S); f.stroke();
      f.fillStyle = '#7aaeaa'; for (var q = 0; q < 5; q++) { ell(f, px + 2 * S + Math.cos(q * 1.26) * 6 * S, pb - 12 * S + Math.sin(q * 1.26) * 2 * S, 7 * S, 2 * S, q * 1.26); f.fill(); } }
    // shimmering light path below the sun
    for (var l = 0; l < 80; l++) { var ly = hz + Math.pow(R(), 1.5) * (H - hz) * 0.7, lw = (6 + R() * 26) * S * (1 + (ly - hz) / H * 2);
      f.strokeStyle = 'rgba(255,255,240,' + (0.12 + R() * 0.4) * (1 - (ly - hz) / (H - hz)) + ')'; f.lineWidth = 2 * S;
      var lx = sx + (R() - 0.5) * 200 * S; f.beginPath(); f.moveTo(lx - lw, ly); f.lineTo(lx + lw, ly); f.stroke(); }
    // dhow sailing far away
    var bx = Wd * 0.5, by = hz + 14 * S; f.fillStyle = '#7b5233'; f.beginPath(); f.moveTo(bx - 22 * S, by); f.lineTo(bx + 26 * S, by); f.lineTo(bx + 16 * S, by + 8 * S); f.lineTo(bx - 16 * S, by + 8 * S); f.fill();
    f.fillStyle = '#fff8ea'; f.beginPath(); f.moveTo(bx, by - 2 * S); f.lineTo(bx - 2 * S, by - 40 * S); f.quadraticCurveTo(bx + 24 * S, by - 20 * S, bx + 22 * S, by - 4 * S); f.closePath(); f.fill();
    haze(f, hz - 60 * S, hz + 40 * S, '#e6f7ff', 0.45, Wd);
    var md = L.mid.getContext('2d');
    // headland with a white seaside town
    var hx = Wd * 0.3;
    md.fillStyle = vgrad(md, hz - 70 * S, H * 0.8, [[0, '#e4cfa3'], [1, '#c4a777']]);
    md.beginPath(); md.moveTo(0, H * 0.8); md.lineTo(0, hz - 60 * S); md.bezierCurveTo(hx * 0.5, hz - 72 * S, hx * 0.8, hz - 40 * S, hx, hz + 10 * S); md.quadraticCurveTo(hx + 20 * S, H * 0.72, hx + 60 * S, H * 0.8); md.fill();
    var houses = [];
    for (var hsx = -10 * S; hsx < hx - 30 * S; hsx += (34 + R() * 18) * S) {
      var u2 = hsx / hx, base = hz - 58 * S + u2 * u2 * 60 * S, hw = (28 + R() * 16) * S, hh = (24 + R() * 30) * S;
      houses.push([hsx, base, hw, hh]);
    }
    houses.forEach(function (hs, i) {
      var x0 = hs[0], b = hs[1], w2 = hs[2], h2 = hs[3];
      md.fillStyle = '#fbf7ef'; md.fillRect(x0, b - h2, w2, h2 + 30 * S);
      md.fillStyle = '#e1d9cb'; md.fillRect(x0 + w2 * 0.78, b - h2, w2 * 0.22, h2 + 30 * S);
      md.fillStyle = '#efe6d6'; md.fillRect(x0 - 2 * S, b - h2 - 3 * S, w2 + 4 * S, 4 * S);
      md.fillStyle = i % 3 ? '#2f7fb5' : '#1f9e8f';
      var ww = 6 * S, wy = b - h2 * 0.55; md.beginPath(); md.rect(x0 + w2 * 0.28 - ww / 2, wy, ww, 9 * S); md.arc(x0 + w2 * 0.28, wy, ww / 2, Math.PI, 0); md.fill();
      if (w2 > 34 * S) { md.beginPath(); md.rect(x0 + w2 * 0.58 - ww / 2, wy, ww, 9 * S); md.arc(x0 + w2 * 0.58, wy, ww / 2, Math.PI, 0); md.fill(); }
    });
    // a lighthouse on the point
    var lx2 = hx - 16 * S, lb = hz - 2 * S; md.fillStyle = '#fbf7ef'; md.beginPath(); md.moveTo(lx2 - 10 * S, lb); md.lineTo(lx2 - 6 * S, lb - 70 * S); md.lineTo(lx2 + 6 * S, lb - 70 * S); md.lineTo(lx2 + 10 * S, lb); md.fill();
    md.fillStyle = '#ff6b5e'; md.fillRect(lx2 - 9 * S, lb - 26 * S, 18 * S, 9 * S); md.fillRect(lx2 - 7 * S, lb - 54 * S, 14 * S, 8 * S);
    md.fillStyle = '#ffe9a0'; md.fillRect(lx2 - 6 * S, lb - 82 * S, 12 * S, 12 * S); md.fillStyle = '#ff6b5e'; md.beginPath(); md.moveTo(lx2 - 9 * S, lb - 82 * S); md.lineTo(lx2, lb - 92 * S); md.lineTo(lx2 + 9 * S, lb - 82 * S); md.fill();
    // beach
    var sb = H * 0.84;
    for (var wv = 0; wv < 9; wv++) { var wy = hz + (sb - hz) * (0.25 + wv * 0.085), wx = hx + 70 * S + R() * (Wd - hx - 120 * S), wl = (30 + R() * 50) * S;
      md.strokeStyle = 'rgba(255,255,255,' + (0.25 + wv * 0.04) + ')'; md.lineWidth = 2 * S; md.lineCap = 'round';
      md.beginPath(); md.moveTo(wx - wl, wy); md.quadraticCurveTo(wx, wy - 5 * S, wx + wl, wy); md.stroke(); }
    md.fillStyle = 'rgba(255,255,255,.75)'; md.beginPath(); md.moveTo(0, sb - 6 * S);
    for (var x = 0; x <= Wd; x += 10 * S) md.lineTo(x, sb - 6 * S - Math.sin(x / S * 0.05) * 3 * S); md.lineTo(Wd, sb + 6 * S); md.lineTo(0, sb + 6 * S); md.fill();
    md.fillStyle = '#d9b77c'; md.fillRect(0, sb, Wd, 8 * S);
    md.fillStyle = vgrad(md, sb + 6 * S, H, [[0, '#f4dcaa'], [1, '#e6c48a']]); md.fillRect(0, sb + 6 * S, Wd, H - sb);
    var n = L.near.getContext('2d');
    // sand dune foreground
    n.fillStyle = vgrad(n, H - 70 * S, H, [[0, '#f2d49a'], [1, '#d9b072']]);
    n.beginPath(); n.moveTo(0, H); n.lineTo(0, H - 46 * S); n.bezierCurveTo(Wd * 0.3, H - 70 * S, Wd * 0.6, H - 30 * S, Wd, H - 56 * S); n.lineTo(Wd, H); n.fill();
    // sandcastle with a bucket, and a striped parasol
    var scx = Wd * 0.3, scy = H - 34 * S;
    n.fillStyle = '#e2bd7c'; n.fillRect(scx - 34 * S, scy - 26 * S, 68 * S, 26 * S);
    n.fillStyle = '#ecca8c'; n.fillRect(scx - 18 * S, scy - 50 * S, 36 * S, 24 * S);
    for (var cr = -34; cr < 34; cr += 12) { n.fillStyle = '#e2bd7c'; n.fillRect(scx + cr * S, scy - 32 * S, 7 * S, 6 * S); }
    for (var cr2 = -18; cr2 < 18; cr2 += 10) { n.fillStyle = '#ecca8c'; n.fillRect(scx + cr2 * S, scy - 56 * S, 6 * S, 6 * S); }
    n.fillStyle = '#b8935a'; n.beginPath(); n.rect(scx - 5 * S, scy - 14 * S, 10 * S, 14 * S); n.arc(scx, scy - 14 * S, 5 * S, Math.PI, 0); n.fill();
    n.strokeStyle = '#7a5a3a'; n.lineWidth = 1.5 * S; n.beginPath(); n.moveTo(scx, scy - 56 * S); n.lineTo(scx, scy - 74 * S); n.stroke();
    n.fillStyle = '#ff6b6b'; n.beginPath(); n.moveTo(scx, scy - 74 * S); n.lineTo(scx + 14 * S, scy - 69 * S); n.lineTo(scx, scy - 64 * S); n.fill();
    n.fillStyle = '#3fa4f5'; n.beginPath(); n.moveTo(scx + 44 * S, scy - 22 * S); n.lineTo(scx + 64 * S, scy - 22 * S); n.lineTo(scx + 60 * S, scy); n.lineTo(scx + 48 * S, scy); n.fill();
    n.strokeStyle = '#3fa4f5'; n.lineWidth = 2 * S; n.beginPath(); n.arc(scx + 54 * S, scy - 22 * S, 9 * S, Math.PI, 0); n.stroke();
    var pu = Wd * 0.62, pv = H - 30 * S;
    n.strokeStyle = '#f4f1ea'; n.lineWidth = 4 * S; n.beginPath(); n.moveTo(pu, pv); n.lineTo(pu - 8 * S, pv - 120 * S); n.stroke();
    n.save(); n.translate(pu - 8 * S, pv - 120 * S); n.rotate(-0.12);
    for (var pk = 0; pk < 6; pk++) { n.fillStyle = pk % 2 ? '#ffffff' : '#ff7a5c'; n.beginPath(); n.moveTo(0, -12 * S);
      n.lineTo(-66 * S + pk * 22 * S, 18 * S); n.quadraticCurveTo(-55 * S + pk * 22 * S, 10 * S, -44 * S + pk * 22 * S, 18 * S); n.closePath(); n.fill(); }
    n.restore();
    n.fillStyle = 'rgba(120,80,30,.18)'; ell(n, pu - 4 * S, pv + 4 * S, 60 * S, 8 * S); n.fill();
    // shells and a starfish
    [[0.18, 26, '#ffb3c1'], [0.42, 20, '#fff2e0'], [0.7, 30, '#ffc48a']].forEach(function (s, i) {
      var x2 = Wd * s[0], y2 = H - s[1] * S; n.fillStyle = s[2];
      if (i === 2) { n.save(); n.translate(x2, y2); n.rotate(0.3); n.beginPath(); for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5 - Math.PI / 2, rq = (k % 2 ? 5 : 13) * S; n.lineTo(Math.cos(a) * rq, Math.sin(a) * rq); } n.closePath(); n.fill(); n.restore(); }
      else { n.beginPath(); n.moveTo(x2 - 9 * S, y2 + 4 * S); n.quadraticCurveTo(x2, y2 - 14 * S, x2 + 9 * S, y2 + 4 * S); n.closePath(); n.fill();
        n.strokeStyle = 'rgba(160,90,60,.35)'; n.lineWidth = 1.2 * S; for (var k2 = -2; k2 <= 2; k2++) { n.beginPath(); n.moveTo(x2, y2 + 3 * S); n.lineTo(x2 + k2 * 4 * S, y2 - 6 * S); n.stroke(); } }
    });
    // beach grass
    [[0.04, 1], [0.1, 0.8], [0.52, 0.7]].forEach(function (b2) { var gx = Wd * b2[0], gy = H - 40 * S;
      n.strokeStyle = '#7da34a'; n.lineWidth = 3 * S; n.lineCap = 'round';
      for (var k3 = -3; k3 <= 3; k3++) { n.beginPath(); n.moveTo(gx, gy); n.quadraticCurveTo(gx + k3 * 6 * S, gy - 30 * S * b2[1], gx + k3 * 12 * S, gy - (40 + Math.abs(k3) * -4) * S * b2[1]); n.stroke(); } });
    // big palm on the right
    var tx = Wd + 10 * S, ty = H - 20 * S, topx = Wd - 90 * S, topy = H * 0.5;
    n.strokeStyle = '#8a5a33'; n.lineWidth = 22 * S; n.lineCap = 'round';
    n.beginPath(); n.moveTo(tx, ty); n.quadraticCurveTo(Wd - 20 * S, H * 0.68, topx, topy); n.stroke();
    n.strokeStyle = 'rgba(60,30,10,.35)'; n.lineWidth = 3 * S;
    for (var r2 = 0.1; r2 < 1; r2 += 0.08) { var bx2 = (1 - r2) * (1 - r2) * tx + 2 * (1 - r2) * r2 * (Wd - 20 * S) + r2 * r2 * topx, by2 = (1 - r2) * (1 - r2) * ty + 2 * (1 - r2) * r2 * H * 0.68 + r2 * r2 * topy;
      n.beginPath(); n.moveTo(bx2 - 10 * S, by2 + 2 * S); n.lineTo(bx2 + 10 * S, by2 - 2 * S); n.stroke(); }
    for (var fr = 0; fr < 8; fr++) { var a2 = -Math.PI * 0.95 + fr * Math.PI * 0.95 / 7 * 1.5, Lf = (90 + (fr % 2) * 30) * S;
      var ex = topx + Math.cos(a2) * Lf, ey = topy + Math.sin(a2) * Lf * 0.6 + 40 * S;
      n.fillStyle = fr % 2 ? '#2f9e5b' : '#24854b';
      n.beginPath(); n.moveTo(topx, topy); n.quadraticCurveTo(topx + Math.cos(a2) * Lf * 0.5, topy + Math.sin(a2) * Lf * 0.5 - 30 * S, ex, ey);
      n.quadraticCurveTo(topx + Math.cos(a2) * Lf * 0.45, topy + Math.sin(a2) * Lf * 0.4 - 6 * S, topx, topy); n.fill(); }
    n.fillStyle = '#6b4a22'; circ(n, topx - 6 * S, topy + 8 * S, 7 * S); n.fill(); circ(n, topx + 6 * S, topy + 10 * S, 7 * S); n.fill();
    return { horizon: hz, sea: [hz, sb] };
  }

  // --- World 3: Lantern Night ---
  function night(L, Wd, H, S) {
    var hz = H * 0.64, R = rng(303);
    var g = L.sky.getContext('2d');
    g.fillStyle = vgrad(g, 0, hz, [[0, '#0a1238'], [0.45, '#1d1f5c'], [0.8, '#43317c'], [1, '#7c5596']]); g.fillRect(0, 0, Wd, H);
    for (var i = 0; i < 170; i++) { var sy = R() * hz * 0.92; g.globalAlpha = 0.25 + R() * 0.7 * (1 - sy / hz);
      g.fillStyle = '#fff'; circ(g, R() * Wd, sy, (R() * 1.2 + 0.4) * S); g.fill(); }
    g.globalAlpha = 1;
    var mx = Wd * 0.8, my = H * 0.13, mr = 28 * S;
    var halo = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5); halo.addColorStop(0, 'rgba(255,240,200,.35)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = halo; circ(g, mx, my, mr * 5); g.fill();
    var mc = canvas(mr * 2.6, mr * 2.6), mg = mc.getContext('2d'), o = mc.width / 2;
    mg.fillStyle = '#fff4d6'; circ(mg, o, o, mr); mg.fill();
    mg.globalCompositeOperation = 'destination-out'; circ(mg, o + mr * 0.45, o - mr * 0.2, mr * 0.86); mg.fill();
    g.drawImage(mc, mx - o, my - o);
    var f = L.far.getContext('2d');
    // skyline with domes and minarets (scenery only)
    f.fillStyle = '#2e2a6c'; var wins = [];
    for (var x = -30 * S; x < Wd + 30 * S;) {
      var kind = R(), bw = (40 + R() * 60) * S, bh = (24 + R() * 50) * S;
      f.beginPath();
      if (kind < 0.16) { var mw = 12 * S, mh = (110 + R() * 60) * S; f.rect(x, hz - mh, mw, mh); f.rect(x - 4 * S, hz - mh * 0.72, mw + 8 * S, 4 * S); onion(f, x + mw / 2, hz - mh, mw * 0.62); f.fill(); x += 30 * S; continue; }
      f.rect(x, hz - bh, bw, bh + 4 * S);
      if (kind < 0.55) { var dr = Math.min(bw * 0.36, 30 * S); onion(f, x + bw / 2, hz - bh, dr); }
      f.fill();
      var nw = Math.max(1, Math.floor(bw / (15 * S)));
      for (var k = 0; k < nw; k++) if (R() < 0.6) wins.push([x + (k + 0.5) * bw / nw, hz - bh * (0.3 + R() * 0.4)]);
      x += bw + R() * 16 * S;
    }
    wins.forEach(function (wv) { f.fillStyle = R() < 0.75 ? 'rgba(255,205,120,.75)' : 'rgba(255,240,200,.35)'; f.beginPath(); f.rect(wv[0] - 2.5 * S, wv[1], 5 * S, 6 * S); f.arc(wv[0], wv[1], 2.5 * S, Math.PI, 0); f.fill(); });
    haze(f, hz - 120 * S, hz + 10 * S, '#7c5596', 0.5, Wd);
    f.fillStyle = '#231f57'; f.fillRect(0, hz, Wd, H - hz);
    var md = L.mid.getContext('2d');
    // rooftops closer by, with glowing arched windows
    var roofs = [];
    for (var rx = -20 * S; rx < Wd + 20 * S;) { var rw = (70 + R() * 90) * S, rh = (40 + R() * 60) * S; roofs.push([rx, rw, rh]); rx += rw + 4 * S; }
    roofs.forEach(function (rf) {
      var top = hz + 40 * S - rf[2];
      md.fillStyle = '#1a1745'; md.fillRect(rf[0], top, rf[1], H - top);
      md.fillStyle = '#241f58'; md.fillRect(rf[0] - 3 * S, top - 5 * S, rf[1] + 6 * S, 6 * S);
      for (var fl2 = 0; top + 18 * S + fl2 * 54 * S < H - 70 * S; fl2++)
      for (var k2 = 0; k2 < rf[1] / (24 * S) - 1; k2++) { if (R() < 0.35 + fl2 * 0.12) continue;
        var wx = rf[0] + 16 * S + k2 * 24 * S, wy = top + 18 * S + fl2 * 54 * S;
        var gl = md.createRadialGradient(wx, wy + 6 * S, 0, wx, wy + 6 * S, 18 * S); gl.addColorStop(0, 'rgba(255,190,100,.35)'); gl.addColorStop(1, 'rgba(255,190,100,0)');
        md.fillStyle = gl; circ(md, wx, wy + 6 * S, 18 * S); md.fill();
        md.fillStyle = '#ffcf7a'; md.beginPath(); md.rect(wx - 4 * S, wy, 8 * S, 12 * S); md.arc(wx, wy, 4 * S, Math.PI, 0); md.fill(); }
    });
    haze(md, hz, H, '#0a0820', 0.6, Wd);
    // strings of lanterns across the rooftops
    var lanternCols = ['#ffb347', '#ff6b6b', '#4fd1c5', '#ffd166', '#b794f4'];
    for (var s2 = 0; s2 < 2; s2++) {
      var x0 = s2 ? Wd * 0.48 : -10 * S, x1 = s2 ? Wd + 10 * S : Wd * 0.56, y0 = hz - (s2 ? 70 : 40) * S, sag = 40 * S;
      md.strokeStyle = 'rgba(40,30,60,.9)'; md.lineWidth = 1.6 * S; md.beginPath(); md.moveTo(x0, y0); md.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0); md.stroke();
      for (var lk = 1; lk < 7; lk++) { var u = lk / 7, lx = x0 + (x1 - x0) * u, ly = y0 + sag * 2 * 2 * u * (1 - u);
        md.strokeStyle = 'rgba(40,30,60,.9)'; md.beginPath(); md.moveTo(lx, ly); md.lineTo(lx, ly + 10 * S); md.stroke();
        A.lantern(md, lx, ly + 22 * S, 14 * S, lanternCols[(lk + s2 * 2) % 5], lk); }
    }
    var n = L.near.getContext('2d');
    // terrace railing with little arches
    var ry = H - 64 * S;
    n.fillStyle = '#0e0b2a'; n.fillRect(0, ry, Wd, H - ry);
    n.fillStyle = '#16123a'; n.fillRect(0, ry - 8 * S, Wd, 10 * S);
    n.fillStyle = 'rgba(255,200,120,.18)'; n.fillRect(0, ry - 8 * S, Wd, 2 * S);
    for (var ax = 10 * S; ax < Wd; ax += 34 * S) { n.fillStyle = '#231d55'; n.beginPath(); archPath(n, ax + 12 * S, ry + 10 * S, 18 * S, ry + 44 * S); n.fill(); }
    // lanterns standing on the railing
    [0.2, 0.5, 0.8].forEach(function (u, i) { A.lantern(n, Wd * u, ry - 30 * S, 24 * S, ['#ffb347', '#4fd1c5', '#ff6b6b'][i], i * 2); });
    // palm silhouettes at the edges
    [[-10 * S, 1], [Wd + 10 * S, -1]].forEach(function (p) {
      var bx = p[0], dir = p[1], top = H * 0.55;
      n.strokeStyle = '#0b0920'; n.lineWidth = 16 * S; n.lineCap = 'round'; n.beginPath(); n.moveTo(bx, H); n.quadraticCurveTo(bx + dir * 30 * S, H * 0.75, bx + dir * 50 * S, top); n.stroke();
      n.fillStyle = '#0b0920';
      for (var fr = 0; fr < 7; fr++) { var a = -Math.PI / 2 + (fr - 3) * 0.5, Lf = (80 + (fr % 2) * 24) * S, cx = bx + dir * 50 * S;
        n.beginPath(); n.moveTo(cx, top); n.quadraticCurveTo(cx + Math.cos(a) * Lf * 0.6, top + Math.sin(a) * Lf * 0.6 - 18 * S, cx + Math.cos(a) * Lf, top + Math.sin(a) * Lf + 30 * S);
        n.quadraticCurveTo(cx + Math.cos(a) * Lf * 0.5, top + Math.sin(a) * Lf * 0.5, cx, top); n.fill(); }
    });
    return { horizon: hz };
  }

  // ---------- HUD icons (SVG strings) ----------
  var MOTIF_SVG = {
    heart: '<path d="M0 8C-15-1-8-15 0-6 8-15 15-1 0 8Z"/>',
    ring: '<path fill-rule="evenodd" d="M-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0ZM-4.2 0a4.2 4.2 0 1 0 8.4 0a4.2 4.2 0 1 0-8.4 0Z"/>',
    sun: '<g><circle r="5.2"/><path d="M7.5 0H10.5M-7.5 0H-10.5M0 7.5V10.5M0-7.5V-10.5M5.3 5.3 7.4 7.4M-5.3-5.3-7.4-7.4M5.3-5.3 7.4-7.4M-5.3 5.3-7.4 7.4" stroke="rgba(255,255,255,.75)" stroke-width="2.4" stroke-linecap="round"/></g>',
    leaf: '<path d="M0-10Q10 0 0 10Q-10 0 0-10Z"/>',
    drop: '<path d="M0-11C4-4 9 0 9 4A9 9 0 0 1-9 4C-9 0-4-4 0-11Z"/>',
    diamond: '<path d="M0-10 8 0 0 10-8 0Z"/>',
    flower: '<g><circle cx="0" cy="-5.5" r="4.2"/><circle cx="5.2" cy="-1.7" r="4.2"/><circle cx="3.2" cy="4.4" r="4.2"/><circle cx="-3.2" cy="4.4" r="4.2"/><circle cx="-5.2" cy="-1.7" r="4.2"/></g>'
  };
  function balloonSVGBody(col, m, tx, s) {
    return '<g transform="translate(' + tx + ' 0) scale(' + s + ')">' +
      '<path d="M0 30C-9 25-16 18-16 9-16 0-9-6 0-6S16 0 16 9C16 18 9 25 0 30Z" fill="' + col + '" stroke="rgba(0,0,0,.25)" stroke-width="1"/>' +
      '<path d="M-3 33 3 33 0 29Z" fill="' + col + '"/>' +
      '<ellipse cx="-7" cy="3" rx="3" ry="5" fill="rgba(255,255,255,.6)" transform="rotate(25 -7 3)"/>' +
      (m ? '<g transform="translate(0 11) scale(.62)" fill="rgba(255,255,255,.75)">' + MOTIF_SVG[m] + '</g>' : '') + '</g>';
  }
  A.balloonSVG = function (ci) {
    var C = A.COLORS[ci];
    return '<svg viewBox="-18 -8 36 44" class="bp-ico">' + balloonSVGBody(C.c, C.m, 0, 1) + '</svg>';
  };
  A.anySVG = function () {
    return '<svg viewBox="-26 -8 52 44" class="bp-ico wide">' + balloonSVGBody('#3fa4f5', null, -11, 0.78) + balloonSVGBody('#ffd23f', null, 11, 0.78) + balloonSVGBody('#ff4d5e', null, 0, 0.9) + '</svg>';
  };
})();
