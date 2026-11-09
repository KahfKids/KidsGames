/* Hextris (Kahf Kids edition): art.js
   All art is drawn in code and cached on offscreen canvases: three courtyard scenes with layered depth,
   the carved stone basin that holds the field, glossy glazed tiles (each colour also carries its own inlaid
   shape, so colours are easy to tell apart) and the turning brass-and-ceramic medallion in the middle. */
(function () {
  'use strict';
  var A = window.HexArt = {};
  var SQ3 = Math.sqrt(3);

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
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function hexPath(g, x, y, r, rot) { // flat-top hexagon (vertex at angle 0) of circumradius r
    g.beginPath();
    for (var i = 0; i < 6; i++) { var a = (rot || 0) + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }
  function starN(g, x, y, n, r, inner, rot) {
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = (rot || 0) + i * Math.PI / n - Math.PI / 2, q = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  A.mix = mix; A.shade = shade; A.rgba = rgba; A.hexPath = hexPath; A.starN = starN;

  // ---------- glazes (the same five colours in every world so children learn them) ----------
  // Each colour also has its own inlaid shape: dot, diamond, flower, leaf, star.
  A.GLAZES = [
    { c: '#2f7be6', name: 'blue' },
    { c: '#f7bd2c', name: 'yellow' },
    { c: '#ee4f63', name: 'red' },
    { c: '#33b865', name: 'green' },
    { c: '#9b67e3', name: 'purple' }
  ];

  // ---------- worlds ----------
  A.WORLDS = [
    { name: 'Fountain Garden', color: '#5fe0cf',
      sky: ['#04161f', '#0a3341', '#14616a', '#3f8f86', '#e0a873', '#f7d29a'], horizon: 0.6,
      far: '#123c48', arch: '#0b2b35', archGlow: '#ffd59a', floor: ['#1d5560', '#0c2a33'], floorLine: 'rgba(160,240,225,.16)',
      near: '#04141a', leaf: '#0a2a24', glow: '#7ff0dd', stars: 60, moon: true, plate: '#0c3640', plateRim: '#c9a86a' },
    { name: 'Lantern Court', color: '#ffc46b',
      sky: ['#05051a', '#100f3c', '#24205e', '#43307a', '#7b4a86', '#c47a77'], horizon: 0.62,
      far: '#1c1846', arch: '#120f33', archGlow: '#ffbe62', floor: ['#2a2358', '#100c2a'], floorLine: 'rgba(255,210,150,.13)',
      near: '#07061a', leaf: '#141033', glow: '#ffcf86', stars: 150, moon: true, lanterns: true, plate: '#1b1745', plateRim: '#d8a85a' },
    { name: 'Sunrise Terrace', color: '#ff9fb2',
      sky: ['#3b4a9a', '#7d74c0', '#d38fb0', '#f7b39a', '#ffd8a6', '#fff0c9'], horizon: 0.63,
      far: '#b2779a', arch: '#7e4f78', archGlow: '#fff2cf', floor: ['#c98e8c', '#5e3655'], floorLine: 'rgba(255,240,220,.22)',
      near: '#3a1f3c', leaf: '#4a2a44', glow: '#fff1cf', stars: 0, sun: true, domes: true, plate: '#4a2b55', plateRim: '#f0c27a' }
  ];

  // ---------- scene: sky, far arcade, floor, near plants (separate canvases for parallax) ----------
  // Returns { sky, far, near, margin } in device px; margin is the extra width on each side for drifting.
  A.paintWorld = function (wi, w, h, dpr) {
    var W = A.WORLDS[wi], m = Math.round(30 * dpr), cw = Math.round(w * dpr) + m * 2, ch = Math.round(h * dpr);
    var sky = canvas(cw, ch), far = canvas(cw, ch), near = canvas(cw, ch);
    var S = dpr, H = ch, Wd = cw, hz = H * W.horizon, R = rng(4242 + wi * 131);
    var unit = Math.min(w, h) * dpr / 400; // scenery scale: bigger screens get bigger arches

    // --- sky ---
    var g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, hz);
    W.sky.forEach(function (c, i) { gr.addColorStop(i / (W.sky.length - 1), c); });
    g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
    for (var i = 0; i < W.stars; i++) {
      var sy = Math.pow(R(), 1.4) * hz * 0.85;
      g.globalAlpha = (0.25 + R() * 0.75) * (1 - sy / hz);
      g.fillStyle = R() < 0.15 ? '#ffe7b0' : '#ffffff';
      g.beginPath(); g.arc(R() * Wd, sy, (R() * 1.2 + 0.35) * S, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    var mx = Wd * 0.8, my = hz * 0.22;
    if (W.moon) {
      var halo = g.createRadialGradient(mx, my, 0, mx, my, 120 * unit);
      halo.addColorStop(0, 'rgba(255,240,210,.35)'); halo.addColorStop(1, 'rgba(255,240,210,0)');
      g.fillStyle = halo; g.fillRect(0, 0, Wd, H);
      var mr = 20 * unit, mc = canvas(mr * 2.6, mr * 2.6), mg = mc.getContext('2d'), o = mc.width / 2;
      mg.fillStyle = '#fff3d2'; mg.beginPath(); mg.arc(o, o, mr, 0, 6.283); mg.fill();
      mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(o + mr * 0.42, o - mr * 0.22, mr * 0.86, 0, 6.283); mg.fill();
      g.drawImage(mc, mx - o, my - o);
    }
    if (W.sun) {
      var sx = Wd * 0.28, syy = hz * 0.86;
      var sh = g.createRadialGradient(sx, syy, 0, sx, syy, 260 * unit);
      sh.addColorStop(0, 'rgba(255,248,220,.95)'); sh.addColorStop(0.12, 'rgba(255,236,190,.7)'); sh.addColorStop(1, 'rgba(255,220,170,0)');
      g.fillStyle = sh; g.fillRect(0, 0, Wd, H);
      for (var c = 0; c < 8; c++) { // soft clouds
        var cx = R() * Wd, cy = (0.1 + R() * 0.5) * hz, cs = (30 + R() * 50) * unit;
        g.fillStyle = 'rgba(255,250,240,' + (0.12 + R() * 0.16) + ')';
        for (var k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx + (k - 2) * cs * 0.5, cy + (k % 2) * cs * 0.1, cs * 0.6, cs * 0.22, 0, 0, 6.283); g.fill(); }
      }
    }
    // light pooling where the play field sits, so the field glows out of the scene
    var cg = g.createRadialGradient(Wd / 2, H / 2, 0, Wd / 2, H / 2, Math.max(Wd, H) * 0.6);
    cg.addColorStop(0, rgba(W.glow, 0.16)); cg.addColorStop(1, rgba(W.glow, 0));
    g.fillStyle = cg; g.fillRect(0, 0, Wd, H);

    // --- far: arcade of horseshoe arches (or domes at sunrise) standing on the horizon ---
    var f = far.getContext('2d');
    var aw = 64 * unit, ah = 120 * unit, ab = hz + 4 * unit, n = Math.ceil(Wd / aw) + 1, wallTop = ab - ah - 22 * unit;
    if (W.domes) {
      f.fillStyle = mix(W.far, W.sky[3], 0.35);
      for (var d = 0; d < 6; d++) {
        var dx = (d / 5) * Wd + (R() - 0.5) * 60 * unit, dr = (22 + R() * 26) * unit, base = wallTop + (4 + R() * 10) * unit;
        f.fillRect(dx - dr * 1.1, base, dr * 2.2, hz - base + 4);
        f.beginPath(); f.moveTo(dx - dr, base); f.bezierCurveTo(dx - dr, base - dr * 1.25, dx - dr * 0.1, base - dr * 1.25, dx, base - dr * 1.55);
        f.bezierCurveTo(dx + dr * 0.1, base - dr * 1.25, dx + dr, base - dr * 1.25, dx + dr, base); f.fill();
        if (d % 2 === 0) { f.fillRect(dx + dr * 1.6, base - dr * 2.4, dr * 0.32, dr * 2.4 + hz - base); f.beginPath(); f.moveTo(dx + dr * 1.55, base - dr * 2.4); f.lineTo(dx + dr * 1.76, base - dr * 2.9); f.lineTo(dx + dr * 1.97, base - dr * 2.4); f.fill(); }
      }
    }
    // wall
    var wg = f.createLinearGradient(0, ab - ah - 26 * unit, 0, ab);
    wg.addColorStop(0, shade(W.far, 0.12)); wg.addColorStop(1, W.far);
    f.fillStyle = wg; f.fillRect(0, ab - ah - 22 * unit, Wd, ah + 22 * unit);
    // crenellation strip along the top
    f.fillStyle = shade(W.far, 0.06);
    for (var q = 0; q < Wd / (14 * unit) + 1; q++) f.fillRect(q * 14 * unit, ab - ah - 30 * unit, 8 * unit, 9 * unit);
    for (var j = 0; j < n; j++) {
      var ax = j * aw - aw * 0.25, acx = ax + aw / 2, ar = aw * 0.36, top = ab - ah + 22 * unit;
      // arch opening with warm light inside
      f.save();
      f.beginPath(); f.moveTo(acx - ar * 0.86, ab); f.lineTo(acx - ar * 0.86, top + ar * 0.5);
      f.arc(acx, top + ar * 0.25, ar, Math.PI * 0.82, Math.PI * 2.18); f.lineTo(acx + ar * 0.86, ab); f.closePath();
      var ig = f.createLinearGradient(0, top - ar, 0, ab);
      ig.addColorStop(0, rgba(W.archGlow, 0.55)); ig.addColorStop(1, rgba(W.archGlow, 0.12));
      f.fillStyle = W.arch; f.fill(); f.fillStyle = ig; f.fill();
      f.lineWidth = 2.5 * unit; f.strokeStyle = shade(W.far, 0.22); f.stroke();
      f.restore();
      // slim column between arches
      f.fillStyle = shade(W.far, 0.16); f.fillRect(ax - 3 * unit, top - 6 * unit, 6 * unit, ab - top + 6 * unit);
    }
    // haze where the arcade meets the floor
    var hg = f.createLinearGradient(0, hz - 60 * unit, 0, hz + 40 * unit);
    hg.addColorStop(0, rgba(W.sky[W.sky.length - 2], 0)); hg.addColorStop(0.7, rgba(W.sky[W.sky.length - 2], 0.35)); hg.addColorStop(1, rgba(W.sky[W.sky.length - 2], 0));
    f.fillStyle = hg; f.fillRect(0, hz - 60 * unit, Wd, 100 * unit);

    // --- floor: a tiled courtyard in perspective (drawn on the sky canvas, it doesn't drift) ---
    var fl = g.createLinearGradient(0, hz, 0, H);
    fl.addColorStop(0, W.floor[0]); fl.addColorStop(1, W.floor[1]);
    g.fillStyle = fl; g.fillRect(0, hz, Wd, H - hz);
    // perspective checker of glazed floor tiles, fading into the haze
    var vx = Wd / 2, NC = 16, NR = 12, rowY = function (r) { return hz + (H - hz) * Math.pow(r / NR, 1.7); };
    var colX = function (c, y) { var t = (y - hz) / (H - hz); return vx + (c - NC / 2) * (Wd * 0.03 + t * Wd * 0.16); };
    for (var r = 0; r < NR; r++) {
      var ya = rowY(r), yb = rowY(r + 1);
      for (var cc = -6; cc < NC + 6; cc++) {
        if ((r + cc) % 2) continue;
        g.globalAlpha = 0.04 + 0.07 * (r / NR);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(colX(cc, ya), ya); g.lineTo(colX(cc + 1, ya), ya); g.lineTo(colX(cc + 1, yb), yb); g.lineTo(colX(cc, yb), yb); g.closePath(); g.fill();
      }
    }
    g.globalAlpha = 1;
    g.strokeStyle = W.floorLine; g.lineWidth = 1 * S;
    for (var r2 = 1; r2 <= NR; r2++) { var y2 = rowY(r2); g.globalAlpha = 0.3 + 0.5 * (r2 / NR); g.beginPath(); g.moveTo(0, y2); g.lineTo(Wd, y2); g.stroke(); }
    g.globalAlpha = 1;
    var fh = g.createLinearGradient(0, hz, 0, hz + (H - hz) * 0.35);
    fh.addColorStop(0, rgba(W.sky[W.sky.length - 2], 0.45)); fh.addColorStop(1, rgba(W.sky[W.sky.length - 2], 0));
    g.fillStyle = fh; g.fillRect(0, hz, Wd, H - hz);

    // --- near: plants in the corners (palm fronds and round shrubs) ---
    var nn = near.getContext('2d');
    function frond(x, y, ang, len, col) {
      nn.save(); nn.translate(x, y); nn.rotate(ang); nn.fillStyle = col;
      nn.beginPath(); nn.moveTo(0, 0); nn.quadraticCurveTo(len * 0.5, -len * 0.18, len, len * 0.12); nn.quadraticCurveTo(len * 0.5, len * 0.02, 0, 0); nn.fill();
      for (var s = 0.12; s < 0.97; s += 0.06) {
        var px = len * s, py = -len * 0.18 * Math.sin(s * Math.PI) * 0.9 + len * 0.12 * s * s, ll = len * 0.26 * (1 - s * 0.7), wd = 2.2 * S * (1 - s * 0.5);
        [-1, 1].forEach(function (sd) {
          nn.beginPath(); nn.moveTo(px, py);
          nn.quadraticCurveTo(px + ll * 0.45, py + sd * ll * 0.35, px + ll * 0.75, py + sd * ll * 0.85 + ll * 0.25);
          nn.quadraticCurveTo(px + ll * 0.35, py + sd * ll * 0.3 + wd, px + wd * 2, py);
          nn.closePath(); nn.fill();
        });
      }
      nn.restore();
    }
    function shrub(x, y, rad, col) {
      nn.fillStyle = col;
      for (var b = 0; b < 7; b++) { var a2 = Math.PI + b / 6 * Math.PI; nn.beginPath(); nn.arc(x + Math.cos(a2) * rad * 0.7, y + Math.sin(a2) * rad * 0.45, rad * (0.5 + R() * 0.25), 0, 6.283); nn.fill(); }
      nn.fillRect(x - rad, y, rad * 2, rad);
    }
    var pu = unit * 1.15, nc = W.near, lc = W.leaf;
    // pot + palm on the left
    nn.fillStyle = nc; nn.beginPath(); nn.moveTo(m + 10 * pu, H); nn.lineTo(m + 18 * pu, H - 46 * pu); nn.lineTo(m + 74 * pu, H - 46 * pu); nn.lineTo(m + 82 * pu, H); nn.fill();
    nn.fillRect(m + 14 * pu, H - 54 * pu, 64 * pu, 10 * pu);
    nn.fillStyle = nc; nn.fillRect(m + 42 * pu, H - 150 * pu, 7 * pu, 100 * pu);
    [-2.7, -2.2, -1.75, -1.2, -0.7, -0.25].forEach(function (a, i) { frond(m + 46 * pu, H - 150 * pu, a, (78 + (i % 2) * 18) * pu, i % 2 ? lc : nc); });
    shrub(Wd - m - 50 * pu, H - 26 * pu, 50 * pu, lc);
    shrub(Wd - m - 110 * pu, H - 12 * pu, 36 * pu, nc);
    shrub(m + 120 * pu, H - 6 * pu, 30 * pu, lc);
    // gentle vignette to frame the scene
    var vg = nn.createRadialGradient(Wd / 2, H * 0.48, Math.min(Wd, H) * 0.35, Wd / 2, H * 0.48, Math.max(Wd, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,.42)');
    nn.fillStyle = vg; nn.fillRect(0, 0, Wd, H);
    return { sky: sky, far: far, near: near, margin: m };
  };

  // A hanging brass lantern (Lantern Court), drawn live so it can sway. x,y = hook point, CSS px.
  A.lantern = function (g, x, y, len, size, sway, t) {
    g.save(); g.translate(x, y); g.rotate(sway);
    g.strokeStyle = 'rgba(30,20,10,.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len); g.stroke();
    g.translate(0, len);
    var s = size, glow = g.createRadialGradient(0, s * 1.2, 0, 0, s * 1.2, s * 4);
    var flick = 0.75 + 0.25 * Math.sin(t * 9 + x) * Math.sin(t * 5.3 + y);
    glow.addColorStop(0, 'rgba(255,190,100,' + (0.45 * flick) + ')'); glow.addColorStop(1, 'rgba(255,190,100,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(0, s * 1.2, s * 4, 0, 6.283); g.fill();
    g.fillStyle = '#6b4a1e'; g.beginPath(); g.moveTo(-s * 0.35, 0); g.lineTo(s * 0.35, 0); g.lineTo(s * 0.7, s * 0.45); g.lineTo(-s * 0.7, s * 0.45); g.closePath(); g.fill();
    var body = g.createLinearGradient(-s * 0.7, 0, s * 0.7, 0);
    body.addColorStop(0, '#ffb54a'); body.addColorStop(0.5, '#fff0b8'); body.addColorStop(1, '#f39a3a');
    g.fillStyle = body; g.beginPath(); g.moveTo(-s * 0.7, s * 0.45); g.lineTo(s * 0.7, s * 0.45); g.lineTo(s * 0.55, s * 1.9); g.lineTo(-s * 0.55, s * 1.9); g.closePath(); g.fill();
    g.strokeStyle = '#6b4a1e'; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.moveTo(0, s * 0.45); g.lineTo(0, s * 1.9); g.stroke();
    g.fillStyle = '#6b4a1e'; g.beginPath(); g.moveTo(-s * 0.6, s * 1.9); g.lineTo(s * 0.6, s * 1.9); g.lineTo(0, s * 2.5); g.closePath(); g.fill();
    g.restore();
  };

  // ---------- field basin: carved stone plate, lane wedges, gold limit inlay ----------
  // geometry: { a0 (centre hex apothem), bh (tile height), rows }, scale = device px per unit.
  A.plate = function (wi, geo, scale) {
    var W = A.WORLDS[wi], lim = geo.a0 + geo.rows * geo.bh, limR = lim * 2 / SQ3, outR = geo.rim * 2 / SQ3;
    var size = (outR + 14) * 2 * scale, c = canvas(size, size), g = c.getContext('2d'), o = size / 2;
    g.translate(o, o); g.scale(scale, scale);
    // soft drop shadow under the basin
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 18 * scale; g.shadowOffsetY = 8 * scale;
    hexPath(g, 0, 0, outR, 0); g.fillStyle = shade(W.plateRim, -0.45); g.fill(); g.restore();
    // stone rim with bevel
    var rim = g.createLinearGradient(0, -outR, 0, outR);
    rim.addColorStop(0, shade(W.plateRim, 0.25)); rim.addColorStop(0.5, W.plateRim); rim.addColorStop(1, shade(W.plateRim, -0.35));
    hexPath(g, 0, 0, outR, 0); g.fillStyle = rim; g.fill();
    hexPath(g, 0, 0, outR - 2.2, 0); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2; g.stroke();
    // the outer track where new tiles appear: a darker carved groove
    var track = (geo.rim - 7) * 2 / SQ3;
    var tg = g.createRadialGradient(0, 0, limR * 0.8, 0, 0, track);
    tg.addColorStop(0, shade(W.plate, -0.5)); tg.addColorStop(1, shade(W.plate, -0.25));
    hexPath(g, 0, 0, track, 0); g.fillStyle = tg; g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; g.stroke();
    // carved arch notches along the rim, one row per side
    for (var e = 0; e < 6; e++) {
      var ea = e * Math.PI / 3, eb = ea + Math.PI / 3;
      for (var u = 1; u < 8; u++) {
        var f = u / 8, ex = Math.cos(ea) * (outR - 3.6) * (1 - f) + Math.cos(eb) * (outR - 3.6) * f, ey = Math.sin(ea) * (outR - 3.6) * (1 - f) + Math.sin(eb) * (outR - 3.6) * f;
        g.beginPath(); g.arc(ex, ey, 1.3, 0, 6.283); g.fillStyle = 'rgba(90,60,20,.5)'; g.fill();
      }
    }
    // inner water-glass floor
    var inner = limR + 3;
    var fg = g.createRadialGradient(0, -inner * 0.3, inner * 0.1, 0, 0, inner * 1.05);
    fg.addColorStop(0, shade(W.plate, 0.18)); fg.addColorStop(1, shade(W.plate, -0.35));
    hexPath(g, 0, 0, inner, 0); g.fillStyle = fg; g.fill();
    // six lane wedges, alternate ones slightly lighter so the lanes read
    for (var i = 0; i < 6; i++) {
      var a1 = (-120 + i * 60) * Math.PI / 180, a2 = a1 + Math.PI / 3;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner); g.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner); g.closePath();
      g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.07)'; g.fill();
    }
    // a faint lattice of 8-point stars set into the floor
    g.save(); hexPath(g, 0, 0, inner, 0); g.clip();
    g.fillStyle = 'rgba(255,255,255,.045)';
    for (var ly = -inner; ly <= inner; ly += 30) for (var lx = -inner; lx <= inner; lx += 34.6) {
      var ox = lx + ((Math.round(ly / 30) % 2) ? 17.3 : 0);
      if (ox * ox + ly * ly < (geo.a0 + 6) * (geo.a0 + 6)) continue;
      starN(g, ox, ly, 8, 7, 0.5, 0); g.fill();
    }
    g.restore();
    // faint rings marking each tile row
    g.lineWidth = 0.8;
    for (var rr = 1; rr <= geo.rows; rr++) { hexPath(g, 0, 0, (geo.a0 + rr * geo.bh) * 2 / SQ3, 0); g.strokeStyle = 'rgba(255,255,255,' + (0.03 + rr * 0.006) + ')'; g.stroke(); }
    // lane dividers from the corners
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * geo.a0 * 2 / SQ3, Math.sin(a) * geo.a0 * 2 / SQ3); g.lineTo(Math.cos(a) * inner, Math.sin(a) * inner); g.stroke(); }
    // gold limit line: tiles must stay inside it
    hexPath(g, 0, 0, limR, 0); g.lineWidth = 2.6; g.strokeStyle = rgba('#ffd98a', 0.75); g.setLineDash([7, 5]); g.stroke(); g.setLineDash([]);
    // small 8-point star studs on the rim corners
    for (var s = 0; s < 6; s++) {
      var sa = s * Math.PI / 3, sx = Math.cos(sa) * (outR - 7), sy = Math.sin(sa) * (outR - 7);
      starN(g, sx, sy, 8, 4.4, 0.55, 0); g.fillStyle = '#fff1c4'; g.fill(); g.strokeStyle = 'rgba(80,50,10,.5)'; g.lineWidth = 0.8; g.stroke();
    }
    c.half = o / scale;
    return c;
  };

  // ---------- glossy glazed tile ----------
  // The tile in ring k (0 = touching the medallion) as a trapezoid pointing "up" (outward), centred on its middle.
  A.tile = function (ci, k, geo, scale) {
    var col = A.GLAZES[ci].c, bh = geo.bh, d = geo.a0 + k * geo.bh;
    var wo = 2 * (d + bh) / SQ3, pad = 3, cw = (wo + pad * 2) * scale, chh = (bh + pad * 2) * scale;
    var c = canvas(cw, chh), g = c.getContext('2d');
    g.translate(cw / 2, chh / 2); g.scale(scale, scale);
    var gap = 0.9, sl = gap * 2 / SQ3;
    function trap(inset) { // inset from the gap-adjusted outline
      var r0 = d + gap + inset, r1 = d + bh - gap - inset, h0 = r0 / SQ3 - sl - inset * 0.6, h1 = r1 / SQ3 - sl - inset * 0.6, mid = d + bh / 2;
      g.beginPath(); g.moveTo(-h0, mid - r0); g.lineTo(h0, mid - r0); g.lineTo(h1, mid - r1); g.lineTo(-h1, mid - r1); g.closePath();
      return { y0: mid - r0, y1: mid - r1, h0: h0, h1: h1 };
    }
    // body: lighter toward the outer edge
    var t = trap(0);
    var body = g.createLinearGradient(0, t.y1, 0, t.y0);
    body.addColorStop(0, shade(col, 0.28)); body.addColorStop(0.55, col); body.addColorStop(1, shade(col, -0.28));
    g.fillStyle = body; g.fill();
    g.lineWidth = 0.9; g.strokeStyle = rgba(shade(col, -0.6), 0.75); g.stroke();
    // glossy glaze: a soft white sheen over the outer half
    g.save(); trap(0); g.clip();
    var sheen = g.createLinearGradient(0, t.y1, 0, (t.y0 + t.y1) / 2 + 1);
    sheen.addColorStop(0, 'rgba(255,255,255,.55)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.fillRect(-t.h1, t.y1, t.h1 * 2, (t.y0 - t.y1) * 0.55);
    // a pool of deeper glaze along the inner edge
    var pool = g.createLinearGradient(0, t.y0 - 4, 0, t.y0);
    pool.addColorStop(0, rgba(shade(col, -0.4), 0)); pool.addColorStop(1, rgba(shade(col, -0.4), 0.5));
    g.fillStyle = pool; g.fillRect(-t.h0 - 2, t.y0 - 4, t.h0 * 2 + 4, 4);
    g.restore();
    // bevel: bright top edge, dark bottom edge
    var b = trap(1.4);
    var bev = g.createLinearGradient(0, b.y1, 0, b.y0);
    bev.addColorStop(0, 'rgba(255,255,255,.75)'); bev.addColorStop(0.45, 'rgba(255,255,255,.08)'); bev.addColorStop(1, 'rgba(0,0,0,.25)');
    g.lineWidth = 1.1; g.strokeStyle = bev; g.stroke();
    // specular glint near the outer-left corner
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.ellipse(-b.h1 * 0.55, b.y1 + 2.3, Math.min(5, b.h1 * 0.18), 1.1, 0, 0, 6.283); g.fill();
    // inlaid shape for this colour
    var cy = (t.y0 + t.y1) / 2 + 0.6, sz = bh * 0.3;
    g.save(); g.translate(0, cy);
    g.fillStyle = 'rgba(255,252,240,.88)'; g.strokeStyle = rgba(shade(col, -0.55), 0.55); g.lineWidth = 0.8;
    glyph(g, ci, sz);
    g.restore();
    c.cw = wo + pad * 2; c.ch = bh + pad * 2;
    return c;
  };
  function glyph(g, ci, s) {
    g.beginPath();
    if (ci === 0) { g.arc(0, 0, s * 0.62, 0, 6.283); }
    else if (ci === 1) { g.moveTo(0, -s * 0.95); g.lineTo(s * 0.8, 0); g.lineTo(0, s * 0.95); g.lineTo(-s * 0.8, 0); g.closePath(); }
    else if (ci === 2) { for (var p = 0; p < 4; p++) { var a = p * Math.PI / 2; g.moveTo(0, 0); g.ellipse(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.5, s * 0.3, a, 0, 6.283); } }
    else if (ci === 3) { g.moveTo(-s * 0.95, 0); g.quadraticCurveTo(0, -s * 1.0, s * 0.95, 0); g.quadraticCurveTo(0, s * 1.0, -s * 0.95, 0); g.closePath(); }
    else { starN(g, 0, 0, 8, s * 0.95, 0.5, 0); }
    g.fill(); g.stroke();
    if (ci === 2) { g.beginPath(); g.arc(0, 0, s * 0.22, 0, 6.283); g.fillStyle = 'rgba(255,220,120,.95)'; g.fill(); }
  }

  // ---------- the centre medallion: brass rim, glazed ceramic, a 12-point rosette ----------
  A.medallion = function (wi, side, scale) {
    var W = A.WORLDS[wi], size = side * 2.4 * scale, c = canvas(size, size), g = c.getContext('2d'), o = size / 2;
    g.translate(o, o); g.scale(scale, scale);
    var R = side;
    // brass rim
    var rim = g.createLinearGradient(-R, -R, R, R);
    rim.addColorStop(0, '#fff1b8'); rim.addColorStop(0.3, '#e9b553'); rim.addColorStop(0.65, '#b57a24'); rim.addColorStop(1, '#f3cf74');
    hexPath(g, 0, 0, R, 0); g.fillStyle = rim; g.fill();
    g.lineWidth = 1.2; g.strokeStyle = '#6b4512'; g.stroke();
    // ceramic face
    var face = g.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.05, 0, 0, R * 0.95);
    face.addColorStop(0, shade(W.plate, 0.55)); face.addColorStop(0.5, shade(W.plate, 0.2)); face.addColorStop(1, shade(W.plate, -0.25));
    hexPath(g, 0, 0, R * 0.82, 0); g.fillStyle = face; g.fill();
    g.lineWidth = 1; g.strokeStyle = 'rgba(60,35,5,.6)'; g.stroke();
    // 12-point rosette with a ring of petals
    starN(g, 0, 0, 12, R * 0.62, 0.72, 0);
    var rg = g.createRadialGradient(0, -R * 0.15, 0, 0, 0, R * 0.62);
    rg.addColorStop(0, '#fffaf0'); rg.addColorStop(1, '#f0d9a6');
    g.fillStyle = rg; g.fill(); g.strokeStyle = 'rgba(110,70,20,.55)'; g.lineWidth = 0.9; g.stroke();
    for (var p = 0; p < 6; p++) {
      var a = p * Math.PI / 3 + Math.PI / 6;
      g.beginPath(); g.ellipse(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3, R * 0.13, R * 0.07, a, 0, 6.283);
      g.fillStyle = A.WORLDS[wi].color; g.fill();
    }
    g.beginPath(); g.arc(0, 0, R * 0.15, 0, 6.283);
    var gem = g.createRadialGradient(-R * 0.05, -R * 0.06, 0, 0, 0, R * 0.15);
    gem.addColorStop(0, '#ffffff'); gem.addColorStop(0.4, '#ffd36b'); gem.addColorStop(1, '#b36d12');
    g.fillStyle = gem; g.fill();
    // glaze highlight across the upper-left
    g.save(); hexPath(g, 0, 0, R * 0.82, 0); g.clip();
    var hl = g.createLinearGradient(-R, -R, R * 0.2, R * 0.2);
    hl.addColorStop(0, 'rgba(255,255,255,.4)'); hl.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    c.half = o / scale;
    return c;
  };

  // ---------- level 1 help: curved arrows around the field showing which way each side turns it ----------
  A.turnArrow = function (g, r, dir, t, col) {
    // dir -1: left side, turning anticlockwise; 1: right side, turning clockwise. Drawn at the top.
    var a0 = dir < 0 ? -1.75 : -1.39, a1 = dir < 0 ? -2.75 : -0.39, pulse = 0.55 + 0.45 * Math.sin(t * 4);
    g.save(); g.globalAlpha = 0.5 + 0.4 * pulse;
    g.lineCap = 'round'; g.lineWidth = 9; g.strokeStyle = col;
    g.beginPath(); g.arc(0, 0, r, a0, a1, dir < 0); g.stroke();
    var hx = Math.cos(a1) * r, hy = Math.sin(a1) * r, tang = a1 + (dir < 0 ? -Math.PI / 2 : Math.PI / 2);
    g.translate(hx, hy); g.rotate(tang);
    g.fillStyle = col; g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -13); g.lineTo(-8, 13); g.closePath(); g.fill();
    g.restore();
  };
})();
