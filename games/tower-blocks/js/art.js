/* Tower Blocks: art.js
   All art is drawn in code and cached on small offscreen canvases.
   - Block textures: glazed zellige tile slabs and carved stone layers, as repeating pattern tiles in world units,
     so a sliced block keeps its pattern exactly where it was.
   - Scene: a dusk-to-night sky (sun, clouds, stars, moon), a distant city skyline with lit windows, a tiled
     courtyard and standing lanterns. Nothing here has a face. */
(function () {
  'use strict';
  var A = window.TowerArt = {};

  // ---------- helpers ----------
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rgb(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(r, g, b) { return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
  function shade(c, amt) { return amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt); }
  function rgba(c, a) { var x = rgb(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  A.rng = rng; A.mix = mix; A.shade = shade; A.rgba = rgba; A.smooth = smooth;

  // 8-point star (khatam) path. inner = inner radius as a fraction of r.
  function star8(g, x, y, r, inner) {
    g.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? r * (inner || 0.72) : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  A.star8 = star8;
  function diamond(g, x, y, rx, ry) { g.beginPath(); g.moveTo(x, y - ry); g.lineTo(x + rx, y); g.lineTo(x, y + ry); g.lineTo(x - rx, y); g.closePath(); }

  // ---------- block palettes: glazed tile slabs and carved stone layers take turns, so the tower is banded ----------
  var PALS = A.PALS = [
    { id: 'tq', kind: 'glaze', base: '#1ba39c', light: '#86e6d9', dark: '#0b565b', accent: '#f4e2b0', accent2: '#1f4f94', grout: '#f8f1df' },
    { id: 'sd', kind: 'stone', base: '#d7a565', light: '#f4d8a4', dark: '#8f5f2c' },
    { id: 'cb', kind: 'glaze', base: '#2b5fc4', light: '#8db3f7', dark: '#142c6a', accent: '#f6c453', accent2: '#f8f1df', grout: '#f8f1df' },
    { id: 'tc', kind: 'stone', base: '#c86b43', light: '#efa67e', dark: '#7c341a' },
    { id: 'em', kind: 'glaze', base: '#23905a', light: '#7bdba2', dark: '#0d472a', accent: '#f6c453', accent2: '#f8f1df', grout: '#f8f1df' },
    { id: 'rs', kind: 'stone', base: '#d58b8a', light: '#f7c6ba', dark: '#8b4649' },
    { id: 'sf', kind: 'glaze', base: '#e7a22c', light: '#ffdc8a', dark: '#8f520c', accent: '#1f4f94', accent2: '#fff6dc', grout: '#fff6dc' },
    { id: 'mb', kind: 'stone', base: '#e6dbc4', light: '#fffaf0', dark: '#9c8a6b' }
  ];
  A.FOUND = { id: 'fd', kind: 'stone', base: '#cfae7f', light: '#f2dcb2', dark: '#856540', frieze: true };
  A.PLINTH = { id: 'pl', kind: 'stone', base: '#9a7a58', light: '#caa982', dark: '#56402c', plain: true };

  var P = 52; // pattern period in world units (two motifs per period)

  // ---------- side tile: one period wide, one layer tall ----------
  A.sideTile = function (pal, H, k) {
    var cw = Math.max(4, Math.round(P * k)), ch = Math.max(2, Math.round(H * k));
    var c = canvas(cw, ch), g = c.getContext('2d'), kx = cw / P, ky = ch / H;
    g.scale(kx, ky);
    if (pal.kind === 'glaze') glazeSide(g, pal, H); else stoneSide(g, pal, H);
    return { img: c, kx: kx, ky: ky };
  };

  function glazeSide(g, pal, H) {
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, pal.light); gr.addColorStop(0.14, pal.base); gr.addColorStop(0.82, shade(pal.base, -0.1)); gr.addColorStop(1, pal.dark);
    g.fillStyle = gr; g.fillRect(0, 0, P, H);
    var b0 = H * 0.22, b1 = H * 0.8, mid = (b0 + b1) / 2, bh = b1 - b0;
    // zellige band: 8-point stars and little diamonds between cream grout lines
    g.fillStyle = shade(pal.dark, 0.05); g.fillRect(0, b0, P, bh);
    g.fillStyle = pal.grout; g.fillRect(0, b0 - 0.8, P, 0.9); g.fillRect(0, b1 - 0.1, P, 0.9);
    [13, 39].forEach(function (x) {
      star8(g, x, mid, bh * 0.47, 0.72); g.fillStyle = pal.accent; g.fill();
      g.lineWidth = 0.75; g.strokeStyle = pal.grout; g.stroke();
      star8(g, x, mid, bh * 0.24, 0.72); g.fillStyle = pal.base; g.fill();
      g.beginPath(); g.arc(x, mid, bh * 0.08, 0, 6.283); g.fillStyle = pal.accent2; g.fill();
    });
    [0, 26, 52].forEach(function (x) {
      diamond(g, x, mid, bh * 0.26, bh * 0.34);
      g.fillStyle = pal.light; g.fill(); g.lineWidth = 0.6; g.strokeStyle = pal.grout; g.stroke();
      g.beginPath(); g.arc(x, mid, bh * 0.06, 0, 6.283); g.fillStyle = pal.dark; g.fill();
    });
    // glassy glaze: a soft sheen at the top and a bright lip
    var gl = g.createLinearGradient(0, 0, 0, H * 0.55);
    gl.addColorStop(0, 'rgba(255,255,255,.34)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(0, 0, P, H * 0.55);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(0, 0.35, P, 0.75);
    g.fillStyle = rgba(pal.dark, 0.85); g.fillRect(0, H - 1.1, P, 1.1);
  }

  function speckle(g, pal, w, h, n, seed) {
    var r = rng(seed);
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, s = 0.3 + r() * 0.8;
      g.fillStyle = r() < 0.55 ? rgba(pal.light, 0.32) : rgba(pal.dark, 0.22);
      g.fillRect(x, y, s, s);
      if (x < 1.2) g.fillRect(x + w, y, s, s);
      if (y < 1.2) g.fillRect(x, y + h, s, s);
    }
  }
  // A carved line: a dark groove below-right and a light lip above-left.
  function carve(g, pal, path, w) {
    g.lineWidth = w || 1.1;
    g.save(); g.translate(0.45, 0.55); path(); g.strokeStyle = rgba(pal.dark, 0.75); g.stroke(); g.restore();
    g.save(); g.translate(-0.35, -0.4); path(); g.strokeStyle = rgba(pal.light, 0.85); g.stroke(); g.restore();
  }

  function stoneSide(g, pal, H) {
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, shade(pal.base, 0.06)); gr.addColorStop(1, shade(pal.base, -0.08));
    g.fillStyle = gr; g.fillRect(0, 0, P, H);
    speckle(g, pal, P, H, Math.round(P * H / 9), pal.id.charCodeAt(0) * 31 + H);
    // top and bottom mouldings
    g.fillStyle = pal.light; g.fillRect(0, 0, P, H * 0.12);
    g.fillStyle = rgba(pal.dark, 0.6); g.fillRect(0, H * 0.12, P, 0.8);
    g.fillStyle = rgba(pal.dark, 0.55); g.fillRect(0, H * 0.85, P, 0.8);
    g.fillStyle = shade(pal.base, 0.1); g.fillRect(0, H * 0.85 + 0.8, P, H * 0.15 - 0.8);
    g.fillStyle = rgba(pal.dark, 0.75); g.fillRect(0, H - 1, P, 1);
    if (pal.plain) {
      // rough-cut blocks: vertical joints
      [0, 26, 52].forEach(function (x) { carve(g, pal, function () { g.beginPath(); g.moveTo(x, H * 0.16); g.lineTo(x, H * 0.82); }, 0.9); });
      return;
    }
    var c0 = H * 0.24, c1 = H * 0.76, cm = (c0 + c1) / 2, hh = (c1 - c0) / 2;
    if (pal.frieze) {
      // foundation frieze: carved 8-point stars linked by a band
      [13, 39].forEach(function (x) {
        carve(g, pal, function () { star8(g, x, cm, hh * 0.95, 0.74); }, 1.2);
        carve(g, pal, function () { g.beginPath(); g.arc(x, cm, hh * 0.32, 0, 6.283); }, 1);
      });
      [0, 26, 52].forEach(function (x) { carve(g, pal, function () { diamond(g, x, cm, hh * 0.45, hh * 0.6); }, 1); });
      carve(g, pal, function () { g.beginPath(); g.moveTo(0, c0 - 1.5); g.lineTo(P, c0 - 1.5); g.moveTo(0, c1 + 1.5); g.lineTo(P, c1 + 1.5); }, 0.8);
      return;
    }
    // carved lattice: lozenges with roundels, small roundels between
    [13, 39].forEach(function (x) {
      carve(g, pal, function () { diamond(g, x, cm, 11.5, hh); }, 1.15);
      carve(g, pal, function () { g.beginPath(); g.arc(x, cm, hh * 0.38, 0, 6.283); }, 1);
    });
    [0, 26, 52].forEach(function (x) { carve(g, pal, function () { g.beginPath(); g.arc(x, cm, hh * 0.3, 0, 6.283); }, 0.9); });
  }

  // ---------- top tile: one period square, seen from above ----------
  A.topTile = function (pal, k) {
    var cw = Math.max(4, Math.round(P * k)), c = canvas(cw, cw), g = c.getContext('2d'), kk = cw / P;
    g.scale(kk, kk);
    if (pal.kind === 'glaze') glazeTop(g, pal); else stoneTop(g, pal);
    return { img: c, kx: kk, ky: kk };
  };

  function glazeTop(g, pal) {
    g.fillStyle = pal.base; g.fillRect(0, 0, P, P);
    var h = P / 2;
    function starTile(x, y, fill, innerFill) {
      star8(g, x, y, 15, 0.72); g.fillStyle = fill; g.fill(); g.lineWidth = 0.9; g.strokeStyle = pal.grout; g.stroke();
      star8(g, x, y, 7.5, 0.72); g.fillStyle = innerFill; g.fill(); g.lineWidth = 0.6; g.stroke();
      g.beginPath(); g.arc(x, y, 2, 0, 6.283); g.fillStyle = pal.grout; g.fill();
    }
    starTile(h, h, pal.accent, pal.dark);
    [[0, 0], [P, 0], [0, P], [P, P]].forEach(function (q) { starTile(q[0], q[1], pal.accent2, pal.base); });
    [[h, 0], [h, P], [0, h], [P, h]].forEach(function (q) {
      diamond(g, q[0], q[1], 5.5, 5.5); g.fillStyle = pal.light; g.fill(); g.lineWidth = 0.7; g.strokeStyle = pal.grout; g.stroke();
    });
    var gl = g.createLinearGradient(0, 0, P, P);
    gl.addColorStop(0, 'rgba(255,255,255,.22)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,.08)');
    g.fillStyle = gl; g.fillRect(0, 0, P, P);
  }

  function stoneTop(g, pal) {
    g.fillStyle = shade(pal.base, 0.08); g.fillRect(0, 0, P, P);
    speckle(g, pal, P, P, 260, pal.id.charCodeAt(1) * 17 + 5);
    var h = P / 2;
    carve(g, pal, function () { star8(g, h, h, 15, 0.74); }, 1.2);
    carve(g, pal, function () { g.beginPath(); g.arc(h, h, 5.5, 0, 6.283); }, 1);
    [[0, 0], [P, 0], [0, P], [P, P]].forEach(function (q) { carve(g, pal, function () { g.beginPath(); g.arc(q[0], q[1], 9, 0, 6.283); }, 1); });
  }

  // ---------- courtyard: a tiled plaza that fades into the dusk, rendered once per screen size ----------
  // Returns { day, night, ox, oy, w, h } in CSS px at scale S; (ox, oy) is where the world origin sits.
  A.plaza = function (S, D, R) {
    var rd = Math.min(D, 1.5), w = 4 * R * S + 8, h = 2 * R * S + 8, ox = w / 2, oy = h / 2;
    var day = canvas(w * rd, h * rd), g = day.getContext('2d');
    // pattern tile, 40 units
    var T = 40, k = S * rd, tw = Math.max(4, Math.round(T * k)), tile = canvas(tw, tw), t = tile.getContext('2d'), kk = tw / T;
    t.scale(kk, kk);
    t.fillStyle = '#e6d0a4'; t.fillRect(0, 0, T, T);
    diamond(t, 20, 20, 13, 13); t.fillStyle = '#c4693f'; t.fill(); t.lineWidth = 1; t.strokeStyle = '#f6e9cc'; t.stroke();
    diamond(t, 20, 20, 5, 5); t.fillStyle = '#f2dfb6'; t.fill();
    [[0, 0], [T, 0], [0, T], [T, T]].forEach(function (q) {
      star8(t, q[0], q[1], 7.5, 0.72); t.fillStyle = '#23938c'; t.fill(); t.lineWidth = 0.8; t.strokeStyle = '#f6e9cc'; t.stroke();
    });
    t.strokeStyle = 'rgba(120,80,40,.35)'; t.lineWidth = 0.6; t.strokeRect(0, 0, T, T);
    var pat = g.createPattern(tile, 'repeat');
    g.setTransform(S * rd, 0.5 * S * rd, -S * rd, 0.5 * S * rd, ox * rd, oy * rd);
    g.save(); g.scale(1 / kk, 1 / kk); g.fillStyle = pat; g.fillRect(-R * kk, -R * kk, 2 * R * kk, 2 * R * kk); g.restore();
    // a stone border with a gold inlay line, and a rosette ring around the plinth
    g.lineWidth = 12; g.strokeStyle = '#8c6a4a'; g.strokeRect(-R + 6, -R + 6, 2 * R - 12, 2 * R - 12);
    g.lineWidth = 1.4; g.strokeStyle = '#e8c27a'; g.strokeRect(-R + 15, -R + 15, 2 * R - 30, 2 * R - 30);
    g.lineWidth = 6; g.strokeStyle = '#a77c55'; g.strokeRect(-96, -96, 192, 192);
    g.lineWidth = 1.2; g.strokeStyle = '#f0d49a'; g.strokeRect(-101, -101, 202, 202);
    // fade the edges into the ground
    g.setTransform(rd * 2, 0, 0, rd, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    var rg = g.createRadialGradient(ox / 2, oy, 0, ox / 2, oy, R * S);
    rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.55, 'rgba(0,0,0,1)'); rg.addColorStop(0.97, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    // night version: the same plaza in moonlight blue
    var night = canvas(w * rd, h * rd), n = night.getContext('2d');
    n.drawImage(day, 0, 0);
    n.globalCompositeOperation = 'source-atop';
    n.fillStyle = 'rgba(12,16,52,.62)'; n.fillRect(0, 0, night.width, night.height);
    // dusk version: warm light raking across
    var dusk = canvas(w * rd, h * rd), d = dusk.getContext('2d');
    d.drawImage(day, 0, 0);
    d.globalCompositeOperation = 'source-atop';
    var dg = d.createLinearGradient(0, 0, dusk.width, dusk.height);
    dg.addColorStop(0, 'rgba(255,170,90,.25)'); dg.addColorStop(1, 'rgba(70,30,80,.35)');
    d.fillStyle = dg; d.fillRect(0, 0, dusk.width, dusk.height);
    return { day: dusk, night: night, ox: ox, oy: oy, w: w, h: h };
  };

  // ---------- a standing courtyard lantern (drawn live; it flickers) ----------
  // (x, y) = foot of the post in CSS px; u = px per world unit; glow 0..1
  A.lantern = function (ctx, x, y, u, glow, t, seed) {
    var fl = 0.85 + 0.15 * Math.sin(t * 9 + seed) * Math.sin(t * 5.3 + seed * 2);
    var cy = y - 40 * u;
    if (glow > 0.02) {
      var rg = ctx.createRadialGradient(x, cy, 0, x, cy, 60 * u);
      rg.addColorStop(0, 'rgba(255,200,110,' + (0.55 * glow * fl) + ')'); rg.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, cy, 60 * u, 0, 6.283); ctx.fill();
      // a pool of light on the floor
      var pg = ctx.createRadialGradient(x, y, 0, x, y, 34 * u);
      pg.addColorStop(0, 'rgba(255,190,100,' + (0.35 * glow) + ')'); pg.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.translate(-x, -y);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, 34 * u, 0, 6.283); ctx.fill(); ctx.restore();
    }
    // post and base
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, 9 * u, 4 * u, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#3a2a22'; ctx.fillRect(x - 6 * u, y - 4 * u, 12 * u, 4 * u);
    var pg2 = ctx.createLinearGradient(x - 2 * u, 0, x + 2 * u, 0); pg2.addColorStop(0, '#6a4c36'); pg2.addColorStop(1, '#2c1e17');
    ctx.fillStyle = pg2; ctx.fillRect(x - 1.8 * u, y - 30 * u, 3.6 * u, 27 * u);
    // lantern body: a six-sided brass lantern with star-cut glowing panes
    var bw = 9 * u, bh = 15 * u, top = cy - bh / 2;
    ctx.fillStyle = '#4a3322';
    ctx.beginPath(); ctx.moveTo(x - bw * 0.6, top + bh + 2 * u); ctx.lineTo(x + bw * 0.6, top + bh + 2 * u); ctx.lineTo(x + bw * 0.8, top + bh); ctx.lineTo(x - bw * 0.8, top + bh); ctx.fill();
    var lg = ctx.createLinearGradient(x, top, x, top + bh);
    lg.addColorStop(0, mix('#7a5a3a', '#ffd27a', 0.6 * glow * fl)); lg.addColorStop(1, mix('#5a3f2a', '#ff9f45', 0.7 * glow * fl));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x - bw * 0.8, top + bh); ctx.lineTo(x - bw, top + bh * 0.25); ctx.lineTo(x - bw * 0.55, top);
    ctx.lineTo(x + bw * 0.55, top); ctx.lineTo(x + bw, top + bh * 0.25); ctx.lineTo(x + bw * 0.8, top + bh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = Math.max(1, 1.1 * u);
    ctx.beginPath(); ctx.moveTo(x - bw * 0.3, top + 1 * u); ctx.lineTo(x - bw * 0.35, top + bh); ctx.moveTo(x + bw * 0.3, top + 1 * u); ctx.lineTo(x + bw * 0.35, top + bh); ctx.stroke();
    ctx.fillStyle = rgba('#fff4d0', 0.35 + 0.6 * glow * fl);
    star8(ctx, x, top + bh * 0.55, 2.6 * u, 0.6); ctx.fill();
    // cap and ring
    ctx.fillStyle = '#5a3d27';
    ctx.beginPath(); ctx.moveTo(x - bw * 0.7, top); ctx.quadraticCurveTo(x, top - 9 * u, x + bw * 0.7, top); ctx.fill();
    ctx.strokeStyle = '#5a3d27'; ctx.lineWidth = Math.max(1, 1.2 * u);
    ctx.beginPath(); ctx.arc(x, top - 7.5 * u, 2 * u, 0, 6.283); ctx.stroke();
  };

  // ---------- sky ----------
  var SKY = [
    [0.00, '#463c8c', '#d9708f', '#ffc46e'],
    [0.30, '#2f2a72', '#9a4f92', '#ff8c78'],
    [0.58, '#181b50', '#43307c', '#b15f90'],
    [0.82, '#090c2b', '#141c4c', '#2f2c6a'],
    [1.00, '#04061a', '#0a1138', '#1e2358']
  ];
  function skyAt(p) {
    p = Math.max(0, Math.min(1, p));
    for (var i = 0; i < SKY.length - 1; i++) {
      var a = SKY[i], b = SKY[i + 1];
      if (p <= b[0]) { var t = (p - a[0]) / (b[0] - a[0]); return { top: mix(a[1], b[1], t), mid: mix(a[2], b[2], t), hor: mix(a[3], b[3], t) }; }
    }
    var l = SKY[SKY.length - 1]; return { top: l[1], mid: l[2], hor: l[3] };
  }
  A.skyAt = skyAt;

  // Skyline masks (white shapes) for the far and near city, plus a lit-windows layer. Width w CSS px, unit u px.
  function skyline(w, u, D) {
    var H = Math.ceil(130 * u), G2 = Math.ceil(10 * u), cw = w * D, ch = (H + G2) * D;
    var far = canvas(cw, ch), near = canvas(cw, ch), lit = canvas(cw, ch);
    var f = far.getContext('2d'), n = near.getContext('2d'), l = lit.getContext('2d');
    [f, n, l].forEach(function (g) { g.scale(D, D); g.fillStyle = '#fff'; });
    var r = rng(4242), base = H;
    function windows(x, top, bw, bh, chance, size) {
      for (var wy = top + 6 * u; wy < base - 6 * u; wy += 9 * u) {
        for (var wx = x + 4 * u; wx < x + bw - 5 * u; wx += 8 * u) {
          if (r() > chance) continue;
          l.globalAlpha = 0.55 + r() * 0.45;
          l.fillStyle = r() < 0.8 ? '#ffd27a' : '#ffb35c';
          var ww = 2.6 * u * size, wh = 4 * u * size;
          l.beginPath(); l.moveTo(wx, wy + wh); l.lineTo(wx, wy + ww / 2); l.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); l.lineTo(wx + ww, wy + wh); l.fill();
        }
      }
      l.globalAlpha = 1;
    }
    // far city: wind towers, domed houses, terraced blocks
    var x = -10 * u;
    while (x < w + 10 * u) {
      var t = r(), bw, bh;
      if (t < 0.2) {
        bw = (9 + r() * 5) * u; bh = (52 + r() * 30) * u;
        f.fillRect(x, base - bh, bw, bh); f.fillRect(x - 1.5 * u, base - bh - 3 * u, bw + 3 * u, 3 * u);
        f.fillRect(x + 1.5 * u, base - bh - 6 * u, bw - 3 * u, 3 * u);
        x += bw + (2 + r() * 5) * u;
      } else if (t < 0.42) {
        bw = (28 + r() * 18) * u; bh = (18 + r() * 18) * u;
        f.fillRect(x, base - bh, bw, bh);
        var dr = bw * 0.3; f.beginPath(); f.ellipse(x + bw / 2, base - bh, dr, dr * 1.1, 0, Math.PI, 0); f.fill();
        windows(x, base - bh, bw, bh, 0.2, 0.8);
        x += bw + (1 + r() * 4) * u;
      } else {
        bw = (22 + r() * 34) * u; bh = (16 + r() * 40) * u;
        f.fillRect(x, base - bh, bw, bh);
        for (var c = x + 1 * u; c < x + bw - 3 * u; c += 6 * u) f.fillRect(c, base - bh - 2.5 * u, 3 * u, 2.5 * u);
        if (r() < 0.5) f.fillRect(x + bw * 0.3, base - bh - 9 * u, bw * 0.4, 9 * u);
        windows(x, base - bh, bw, bh, 0.18, 0.8);
        x += bw + (1 + r() * 3) * u;
      }
    }
    // near city: low houses with parapets, arched doorways and palms
    x = -20 * u;
    while (x < w + 20 * u) {
      var tt = r();
      if (tt < 0.25) {
        palm(n, x + 6 * u, base, (34 + r() * 18) * u, u, r);
        x += (10 + r() * 8) * u;
      } else {
        var w2 = (34 + r() * 40) * u, h2 = (12 + r() * 24) * u;
        n.fillRect(x, base - h2, w2, h2);
        for (var c2 = x; c2 < x + w2 - 2 * u; c2 += 7 * u) n.fillRect(c2, base - h2 - 3 * u, 4 * u, 3 * u);
        if (r() < 0.35) { var d2 = w2 * 0.2; n.beginPath(); n.ellipse(x + w2 * 0.7, base - h2, d2, d2, 0, Math.PI, 0); n.fill(); }
        windows(x, base - h2, w2, h2, 0.42, 1);
        x += w2 + (r() < 0.5 ? 0 : (2 + r() * 8) * u);
      }
    }
    // a garden tree line at the foot of the city: round trees with a few slim cypresses, on a solid hedge
    n.fillRect(-2, base - 1, w + 4, 7 * u);
    var gx = -6 * u;
    while (gx < w + 10 * u) {
      var tr = (4 + r() * 3.5) * u, gy = base + 6 * u;
      if (r() < 0.25) { n.beginPath(); n.ellipse(gx, gy - tr * 1.9, tr * 0.6, tr * 2.3, 0, 0, 6.283); n.fill(); }
      else { n.beginPath(); n.arc(gx, gy - tr * 0.8, tr, 0, 6.283); n.arc(gx + tr * 0.8, gy - tr * 0.45, tr * 0.75, 0, 6.283); n.arc(gx - tr * 0.7, gy - tr * 0.35, tr * 0.7, 0, 6.283); n.fill(); }
      gx += tr * (1.3 + r() * 1.2);
    }
    return { far: far, near: near, lit: lit, H: H, G: G2 };
  }
  function palm(g, x, base, hgt, u, r) {
    var lean = (r() - 0.5) * 14 * u, tx = x + lean, ty = base - hgt;
    g.save();
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 2.6 * u;
    g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + lean * 0.2, base - hgt * 0.5, tx, ty); g.stroke();
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI / 2 + (i - 3) * 0.48 + (r() - 0.5) * 0.2, len = (14 + r() * 6) * u;
      var ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.7 + len * 0.45;
      g.beginPath(); g.moveTo(tx, ty);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 3 * u, ex, ey);
      g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.5 + 2 * u, tx, ty + 1 * u);
      g.fill();
    }
    g.restore();
  }
  function tint(mask, color) {
    var c = canvas(mask.width, mask.height), g = c.getContext('2d');
    g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function cloudMask(u, D, r) {
    var cw = (110 + r() * 90) * u, ch = cw * 0.42, c = canvas(cw * D, ch * D), g = c.getContext('2d');
    g.scale(D, D);
    var n = 6 + ((r() * 4) | 0), base = ch * 0.8;
    for (var pass = 0; pass < 3; pass++) {
      var rr = rng(Math.floor(cw * 13));
      g.globalAlpha = pass === 0 ? 0.25 : pass === 1 ? 0.45 : 1;
      var grow = pass === 0 ? 1.18 : pass === 1 ? 1.08 : 1;
      for (var i = 0; i < n; i++) {
        var px = cw * (0.15 + 0.7 * (i / (n - 1))), rad = ch * (0.22 + rr() * 0.22) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.7);
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(px, base - rad * 0.9, rad * grow, 0, 6.283); g.fill();
      }
      g.beginPath(); g.ellipse(cw / 2, base - ch * 0.06, cw * 0.42 * grow, ch * 0.14 * grow, 0, 0, 6.283); g.fill();
    }
    return { c: c, w: cw, h: ch };
  }
  function cloudTint(m, top, bottom) {
    var c = canvas(m.c.width, m.c.height), g = c.getContext('2d');
    g.drawImage(m.c, 0, 0); g.globalCompositeOperation = 'source-in';
    var gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0.15, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function starfield(w, h, D) {
    var c = canvas(w * D, h * D), g = c.getContext('2d'), r = rng(99), n = Math.round(w * h / 1700);
    g.scale(D, D);
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, s = r() < 0.92 ? 0.5 + r() * 0.7 : 1.2 + r() * 0.8;
      g.globalAlpha = 0.35 + r() * 0.65; g.fillStyle = r() < 0.15 ? '#ffe7b0' : '#ffffff';
      g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill();
    }
    return c;
  }

  // ---------- the whole backdrop ----------
  // A.scene(w, h, D, S).draw(ctx, o) with o = { p (0 dusk .. 1 night), camH, S, ay, horizonY, t }
  A.scene = function (w, h, D, S) {
    var u = S * 0.85, sk = skyline(w, u, D), stars = starfield(w, h, D), r = rng(7);
    var masks = [0, 1, 2, 3, 4].map(function () { return cloudMask(u, D, r); });
    var clouds = [];
    for (var i = 0; i < 12; i++) clouds.push({ ca: 120 + i * 85 + r() * 50, x: r(), sp: 4 + r() * 9, m: i % masks.length, s: 0.75 + r() * 0.5 });
    var twinkles = [];
    for (var j = 0; j < 16; j++) twinkles.push({ x: r() * w, y: r() * h * 0.7, ph: r() * 6.28, s: 1.5 + r() * 2 });
    var key = -1, farC, nearC, cl = [];
    function retint(p) {
      var k = Math.round(p * 60); if (k === key) return; key = k;
      var c = skyAt(k / 60);
      farC = tint(sk.far, shade(mix(c.hor, c.top, 0.55), -0.22));
      nearC = tint(sk.near, shade(mix('#24152f', c.top, 0.3), -0.25));
      var ctop = mix(c.hor, '#ffffff', 0.4), cbot = mix(c.mid, c.top, 0.35);
      cl = masks.map(function (m) { return cloudTint(m, ctop, cbot); });
    }
    return {
      draw: function (ctx, o) {
        var p = o.p, c = skyAt(p), hy = o.horizonY, t = o.t;
        retint(p);
        ctx.setTransform(D, 0, 0, D, 0, 0);
        // sky gradient
        var g = ctx.createLinearGradient(0, 0, 0, Math.max(hy, 10));
        g.addColorStop(0, c.top); g.addColorStop(0.6, c.mid); g.addColorStop(1, c.hor);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, Math.min(h, hy + 2));
        // stars
        var sa = smooth(0.42, 0.8, p);
        if (sa > 0.01) {
          var off = ((o.camH * o.S * 0.05) % h + h) % h;
          ctx.globalAlpha = sa;
          ctx.drawImage(stars, 0, off - h, w, h); ctx.drawImage(stars, 0, off, w, h);
          ctx.fillStyle = '#fffbe8';
          twinkles.forEach(function (s) {
            var a = 0.5 + 0.5 * Math.sin(t * 2.2 + s.ph), y = (s.y + off) % h, rr = s.s * (0.6 + 0.4 * a);
            ctx.globalAlpha = sa * a;
            ctx.beginPath(); ctx.moveTo(s.x, y - rr * 2.2); ctx.lineTo(s.x + rr * 0.4, y - rr * 0.4); ctx.lineTo(s.x + rr * 2.2, y);
            ctx.lineTo(s.x + rr * 0.4, y + rr * 0.4); ctx.lineTo(s.x, y + rr * 2.2); ctx.lineTo(s.x - rr * 0.4, y + rr * 0.4);
            ctx.lineTo(s.x - rr * 2.2, y); ctx.lineTo(s.x - rr * 0.4, y - rr * 0.4); ctx.closePath(); ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        // moon (a plain glowing disc)
        var ma = smooth(0.38, 0.62, p);
        if (ma > 0.01) {
          var mx = w * 0.8, my = Math.max(90, h * 0.15) + 30, mr = Math.max(16, 20 * u);
          var mg = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4.5);
          mg.addColorStop(0, 'rgba(255,246,214,' + 0.35 * ma + ')'); mg.addColorStop(1, 'rgba(255,246,214,0)');
          ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 4.5, 0, 6.283); ctx.fill();
          var md = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
          md.addColorStop(0, mix(c.top, '#fffdf2', ma)); md.addColorStop(1, mix(c.top, '#f1dfae', ma));
          ctx.fillStyle = md; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
        }
        // setting sun behind the city
        var sa2 = 1 - smooth(0.05, 0.42, p);
        if (sa2 > 0.01 && hy > -40) {
          var sx = w * 0.3, sy = hy - 22 * u;
          var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 170 * u);
          sg.addColorStop(0, 'rgba(255,214,140,' + 0.7 * sa2 + ')'); sg.addColorStop(0.35, 'rgba(255,160,110,' + 0.25 * sa2 + ')'); sg.addColorStop(1, 'rgba(255,140,110,0)');
          ctx.fillStyle = sg; ctx.fillRect(sx - 170 * u, sy - 170 * u, 340 * u, 340 * u);
          ctx.globalAlpha = sa2;
          var sd = ctx.createRadialGradient(sx, sy - 8 * u, 0, sx, sy, 26 * u);
          sd.addColorStop(0, '#fff2c4'); sd.addColorStop(1, '#ffb45a');
          ctx.fillStyle = sd; ctx.beginPath(); ctx.arc(sx, sy, 26 * u, 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // drifting clouds: thick at twilight, thin and dark at night; you climb up past them
        var ca = 0.2 + 0.7 * smooth(0.1, 0.3, p) * (1 - smooth(0.62, 0.9, p) * 0.7);
        clouds.forEach(function (k) {
          var m = masks[k.m], img = cl[k.m], cw = m.w * k.s, chh = m.h * k.s;
          var rel = (((k.ca - o.camH * 0.55) % 1100) + 1100) % 1100 - 180;
          var y = o.ay - rel * o.S - chh;
          if (y > h || y + chh < 0) return;
          var x = ((k.x * (w + cw) + t * k.sp) % (w + cw)) - cw;
          ctx.globalAlpha = ca;
          ctx.drawImage(img, x, y, cw, chh);
        });
        ctx.globalAlpha = 1;
        // city skyline sits on the horizon
        var top = hy - sk.H, fullH = sk.H + sk.G;
        if (top < h) {
          ctx.drawImage(farC, 0, top, w, fullH);
          var hz = ctx.createLinearGradient(0, hy - 60 * u, 0, hy);
          hz.addColorStop(0, rgba(c.hor, 0)); hz.addColorStop(1, rgba(c.hor, 0.45));
          ctx.fillStyle = hz; ctx.fillRect(0, hy - 60 * u, w, 60 * u);
          // the ground below the horizon
          var gg = ctx.createLinearGradient(0, hy, 0, Math.max(hy + 10, h));
          gg.addColorStop(0, shade(mix(c.hor, '#2a1630', 0.62), -0.1)); gg.addColorStop(0.35, shade(mix(c.mid, '#1c0f26', 0.7), -0.2));
          gg.addColorStop(1, shade(mix(c.top, '#140a1c', 0.6), -0.3));
          ctx.fillStyle = gg; ctx.fillRect(0, hy - 0.5, w, h - hy + 1);
          ctx.drawImage(nearC, 0, top, w, fullH);
          ctx.globalAlpha = 0.3 + 0.7 * smooth(0.12, 0.6, p);
          ctx.drawImage(sk.lit, 0, top, w, fullH);
          ctx.globalAlpha = 1;
        }
      }
    };
  };
})();
