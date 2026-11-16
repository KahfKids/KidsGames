/* Tower Blocks: art.js, the paint box.
   The look (kept from the Canvas2D version): a dusk-to-night sky over a city of wind towers, domes and palms, a tiled
   courtyard with two lanterns, and a tower of glazed zellige tile slabs and carved stone layers that take turns. No faces.
   Every picture is painted ONCE into the engine's canvas textures (Kit.play.tex) when the game starts, and never again:
   - block tiles: one repeating pattern tile per palette for a side (52 x layer height units) and one for a top (52 x 52),
     at R texture pixels per world unit. The tower scene shows each face as a TileSprite (the engine repeats the tile),
     so a sliced block keeps its pattern exactly where it was.
   - the courtyard is painted already in the isometric view (it never changes shape); the lantern, the goal ring and the
     interface shapes are small atlases ('fx', 'ui'); the sky pieces (cloud masks, sun, moon, glows) are the atlas 'sk',
     the skyline (far, near, lit windows) and the stars are tiles the sky scene repeats.
   Colours that change with the climb (sky, skyline, night) are tints on white pictures, never repainted. */
(function () {
  'use strict';
  var A = window.TBArt = {};

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
  A.int = function (c) { var x = rgb(c); return (x[0] << 16) | (x[1] << 8) | x[2]; };

  function star8(g, x, y, r, inner) {
    g.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? r * (inner || 0.72) : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  function diamond(g, x, y, rx, ry) { g.beginPath(); g.moveTo(x, y - ry); g.lineTo(x + rx, y); g.lineTo(x, y + ry); g.lineTo(x - rx, y); g.closePath(); }

  // a set of pictures in one texture, each a frame: items = [name, x, y, w, h, paint(ctx, w, h)]
  function atlas(scene, key, w, h, items) {
    Kit.play.tex(scene, key, w, h, function (c) {
      items.forEach(function (it) {
        c.save(); c.translate(it[1], it[2]); c.beginPath(); c.rect(0, 0, it[3], it[4]); c.clip(); it[5](c, it[3], it[4]); c.restore();
      });
    });
    var t = scene.textures.get(key);
    items.forEach(function (it) { t.add(it[0], 0, it[1], it[2], it[3], it[4]); });
  }

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

  var P = A.P = 52; // pattern period in world units (two motifs per period)

  // ---------- side tile: one period wide, one layer tall ----------
  function glazeSide(g, pal, H) {
    var gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, pal.light); gr.addColorStop(0.14, pal.base); gr.addColorStop(0.82, shade(pal.base, -0.1)); gr.addColorStop(1, pal.dark);
    g.fillStyle = gr; g.fillRect(0, 0, P, H);
    var b0 = H * 0.22, b1 = H * 0.8, mid = (b0 + b1) / 2, bh = b1 - b0;
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
    g.fillStyle = pal.light; g.fillRect(0, 0, P, H * 0.12);
    g.fillStyle = rgba(pal.dark, 0.6); g.fillRect(0, H * 0.12, P, 0.8);
    g.fillStyle = rgba(pal.dark, 0.55); g.fillRect(0, H * 0.85, P, 0.8);
    g.fillStyle = shade(pal.base, 0.1); g.fillRect(0, H * 0.85 + 0.8, P, H * 0.15 - 0.8);
    g.fillStyle = rgba(pal.dark, 0.75); g.fillRect(0, H - 1, P, 1);
    if (pal.plain) {
      [0, 26, 52].forEach(function (x) { carve(g, pal, function () { g.beginPath(); g.moveTo(x, H * 0.16); g.lineTo(x, H * 0.82); }, 0.9); });
      return;
    }
    var c0 = H * 0.24, c1 = H * 0.76, cm = (c0 + c1) / 2, hh = (c1 - c0) / 2;
    if (pal.frieze) {
      [13, 39].forEach(function (x) {
        carve(g, pal, function () { star8(g, x, cm, hh * 0.95, 0.74); }, 1.2);
        carve(g, pal, function () { g.beginPath(); g.arc(x, cm, hh * 0.32, 0, 6.283); }, 1);
      });
      [0, 26, 52].forEach(function (x) { carve(g, pal, function () { diamond(g, x, cm, hh * 0.45, hh * 0.6); }, 1); });
      carve(g, pal, function () { g.beginPath(); g.moveTo(0, c0 - 1.5); g.lineTo(P, c0 - 1.5); g.moveTo(0, c1 + 1.5); g.lineTo(P, c1 + 1.5); }, 0.8);
      return;
    }
    [13, 39].forEach(function (x) {
      carve(g, pal, function () { diamond(g, x, cm, 11.5, hh); }, 1.15);
      carve(g, pal, function () { g.beginPath(); g.arc(x, cm, hh * 0.38, 0, 6.283); }, 1);
    });
    [0, 26, 52].forEach(function (x) { carve(g, pal, function () { g.beginPath(); g.arc(x, cm, hh * 0.3, 0, 6.283); }, 0.9); });
  }
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
    g.fillStyle = 'rgba(255,246,228,.1)'; g.fillRect(0, 0, P, P);   // the top catches the light
  }

  A.sideKey = function (pal, H) { return 'sd-' + pal.id + '-' + H; };
  A.topKey = function (pal) { return 'tp-' + pal.id; };
  function paintBlocks(scene, R) {
    var tw = Math.max(8, Math.round(P * R));
    function side(pal, H) {
      var key = A.sideKey(pal, H), th = Math.max(4, Math.round(H * R));
      Kit.play.tex(scene, key, tw, th, function (g, w, h) { g.scale(w / P, h / H); if (pal.kind === 'glaze') glazeSide(g, pal, H); else stoneSide(g, pal, H); });
    }
    function top(pal) {
      Kit.play.tex(scene, A.topKey(pal), tw, tw, function (g, w) { g.scale(w / P, w / P); if (pal.kind === 'glaze') glazeTop(g, pal); else stoneTop(g, pal); });
    }
    PALS.forEach(function (p) { side(p, 26); top(p); });
    side(A.FOUND, 34); top(A.FOUND);
    side(A.PLINTH, 14); side(A.PLINTH, 12); top(A.PLINTH);
  }

  // ---------- courtyard: a tiled plaza in the isometric view that fades into the dusk, painted once ----------
  // 4 R x 2 R world units, the world origin in its middle (R here = the plaza radius, 190)
  var PLAZA_R = A.PLAZA_R = 190;
  function paintPlaza(scene, rd) {
    var R = PLAZA_R, w = Math.ceil(4 * R + 8), h = Math.ceil(2 * R + 8), ox = w / 2, oy = h / 2;
    A.plazaRes = rd;
    Kit.play.tex(scene, 'plaza', w * rd, h * rd, function (g) {
      var T = 40, tw = Math.max(4, Math.round(T * rd)), tile = canvas(tw, tw), t = tile.getContext('2d'), kk = tw / T;
      t.scale(kk, kk);
      t.fillStyle = '#e6d0a4'; t.fillRect(0, 0, T, T);
      diamond(t, 20, 20, 13, 13); t.fillStyle = '#c4693f'; t.fill(); t.lineWidth = 1; t.strokeStyle = '#f6e9cc'; t.stroke();
      diamond(t, 20, 20, 5, 5); t.fillStyle = '#f2dfb6'; t.fill();
      [[0, 0], [T, 0], [0, T], [T, T]].forEach(function (q) {
        star8(t, q[0], q[1], 7.5, 0.72); t.fillStyle = '#23938c'; t.fill(); t.lineWidth = 0.8; t.strokeStyle = '#f6e9cc'; t.stroke();
      });
      t.strokeStyle = 'rgba(120,80,40,.35)'; t.lineWidth = 0.6; t.strokeRect(0, 0, T, T);
      var pat = g.createPattern(tile, 'repeat');
      g.setTransform(rd, 0.5 * rd, -rd, 0.5 * rd, ox * rd, oy * rd);
      g.save(); g.scale(1 / kk, 1 / kk); g.fillStyle = pat; g.fillRect(-R * kk, -R * kk, 2 * R * kk, 2 * R * kk); g.restore();
      g.lineWidth = 12; g.strokeStyle = '#8c6a4a'; g.strokeRect(-R + 6, -R + 6, 2 * R - 12, 2 * R - 12);
      g.lineWidth = 1.4; g.strokeStyle = '#e8c27a'; g.strokeRect(-R + 15, -R + 15, 2 * R - 30, 2 * R - 30);
      g.lineWidth = 6; g.strokeStyle = '#a77c55'; g.strokeRect(-96, -96, 192, 192);
      g.lineWidth = 1.2; g.strokeStyle = '#f0d49a'; g.strokeRect(-101, -101, 202, 202);
      // fade the edges into the ground
      g.setTransform(rd, 0, 0, rd, 0, 0);
      g.globalCompositeOperation = 'destination-in';
      var rg = g.createRadialGradient(ox, oy, 0, ox, oy, R * 2);
      rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(0.55, 'rgba(0,0,0,1)'); rg.addColorStop(0.97, 'rgba(0,0,0,0)');
      g.save(); g.translate(ox, oy); g.scale(1, 0.5); g.translate(-ox, -oy);
      g.fillStyle = rg; g.fillRect(0, -oy, w, h * 2); g.restore();   // (squashed about the middle: this covers the whole picture, 0..h)
      g.globalCompositeOperation = 'source-atop';
      // dusk: warm light raking across (night is a tint on the picture)
      var dg = g.createLinearGradient(0, 0, w, h);
      dg.addColorStop(0, 'rgba(255,170,90,.25)'); dg.addColorStop(1, 'rgba(70,30,80,.35)');
      g.fillStyle = dg; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    });
    A.plaza = { w: w, h: h, ox: ox, oy: oy };
  }

  // ---------- a standing courtyard lantern: a brass post and a six-sided lantern (the glow is a light, drawn apart) ----------
  // frame is 28 x 72 units with the foot of the post at (14, 66)
  function paintLantern(scene, R) {
    var w = 28, h = 72;
    Kit.play.tex(scene, 'lantern', w * R, h * R, function (g) {
      g.scale(R, R); g.translate(14, 66);
      var x = 0, y = 0, u = 1, cy = y - 40 * u;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, 9 * u, 4 * u, 0, 0, 6.283); g.fill();
      g.fillStyle = '#3a2a22'; g.fillRect(x - 6 * u, y - 4 * u, 12 * u, 4 * u);
      var pg = g.createLinearGradient(-2 * u, 0, 2 * u, 0); pg.addColorStop(0, '#6a4c36'); pg.addColorStop(1, '#2c1e17');
      g.fillStyle = pg; g.fillRect(-1.8 * u, y - 30 * u, 3.6 * u, 27 * u);
      var bw = 9 * u, bh = 15 * u, top = cy - bh / 2;
      g.fillStyle = '#4a3322';
      g.beginPath(); g.moveTo(x - bw * 0.6, top + bh + 2 * u); g.lineTo(x + bw * 0.6, top + bh + 2 * u); g.lineTo(x + bw * 0.8, top + bh); g.lineTo(x - bw * 0.8, top + bh); g.fill();
      var lg = g.createLinearGradient(x, top, x, top + bh);
      lg.addColorStop(0, mix('#7a5a3a', '#ffd27a', 0.5)); lg.addColorStop(1, mix('#5a3f2a', '#ff9f45', 0.6));
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(x - bw * 0.8, top + bh); g.lineTo(x - bw, top + bh * 0.25); g.lineTo(x - bw * 0.55, top);
      g.lineTo(x + bw * 0.55, top); g.lineTo(x + bw, top + bh * 0.25); g.lineTo(x + bw * 0.8, top + bh); g.closePath(); g.fill();
      g.strokeStyle = '#3a2618'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(x - bw * 0.3, top + 1 * u); g.lineTo(x - bw * 0.35, top + bh); g.moveTo(x + bw * 0.3, top + 1 * u); g.lineTo(x + bw * 0.35, top + bh); g.stroke();
      g.fillStyle = rgba('#fff4d0', 0.8);
      star8(g, x, top + bh * 0.55, 2.6 * u, 0.6); g.fill();
      g.fillStyle = '#5a3d27';
      g.beginPath(); g.moveTo(x - bw * 0.7, top); g.quadraticCurveTo(x, top - 9 * u, x + bw * 0.7, top); g.fill();
      g.strokeStyle = '#5a3d27'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(x, top - 7.5 * u, 2 * u, 0, 6.283); g.stroke();
    });
  }

  // ---------- pictures for effects and the world: plain white shapes the scenes tint ----------
  function paintFx(scene) {
    var RR = 2, r = 68;
    atlas(scene, 'fx', 1024, 768, [
      ['pxbig', 0, 0, 12, 12, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 12, 12); }],      // ('px' is its middle 4 x 4: stretched, its edge must not blend with the empty gutter)
      ['dot', 12, 0, 64, 64, function (c) { var g = c.createRadialGradient(32, 32, 4, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }],
      ['star4', 82, 0, 64, 64, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(32, 2); c.lineTo(38, 26); c.lineTo(62, 32); c.lineTo(38, 38); c.lineTo(32, 62); c.lineTo(26, 38); c.lineTo(2, 32); c.lineTo(26, 26); c.closePath(); c.fill(); }],
      ['chip', 152, 0, 24, 24, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(2, 2, 20, 20, 5); c.fill(); }],
      ['glow', 0, 80, 256, 256, function (c) { var g = c.createRadialGradient(128, 128, 0, 128, 128, 126); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); }],
      ['pool', 270, 80, 256, 128, function (c) { var g = c.createRadialGradient(128, 64, 0, 128, 64, 126); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.save(); c.translate(0, 64); c.scale(1, 0.5); c.translate(0, -128); c.fillStyle = g; c.fillRect(0, 0, 256, 256); c.restore(); }],
      // the tower's contact shadow on the courtyard: a soft dark ellipse (370 x 185 units, stretched 1:2 like the plaza)
      ['shadow', 0, 350, 370, 185, function (c, w, h) { c.save(); c.translate(w / 2, h / 2); c.scale(1, 0.5); var g = c.createRadialGradient(0, 0, 40, 0, 0, 185); g.addColorStop(0, 'rgba(25,10,30,.5)'); g.addColorStop(1, 'rgba(25,10,30,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 185, 0, 6.283); c.fill(); c.restore(); }],
      // the goal ring, painted in the isometric view (a rectangle of 2 r, flat on the tower top), white to be tinted
      ['ring', 400, 350, 4 * r * RR + 20, 2 * r * RR + 20, function (c, w, h) {
        c.translate(w / 2, h / 2); c.scale(RR, RR); c.transform(1, 0.5, -1, 0.5, 0, 0);
        c.lineWidth = 9; c.strokeStyle = 'rgba(255,255,255,.2)'; c.strokeRect(-r, -r, 2 * r, 2 * r);
        c.setLineDash([12, 8]); c.lineWidth = 2.6; c.strokeStyle = 'rgba(255,255,255,.95)'; c.strokeRect(-r, -r, 2 * r, 2 * r);
      }],
      ['badge', 0, 560, 80, 80, function (c) { star8(c, 40, 40, 36, 0.74); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(70,40,10,.85)'; c.stroke(); }]
    ]);
    scene.textures.get('fx').add('px', 0, 4, 4, 4, 4);
  }

  // ---------- the interface (design units, 1920 x 1080): plates, pills and icons ----------
  function paintUi(scene) {
    var icon = function (name, x, y, draw) {
      return [name, x, y, 96, 96, function (c) { c.strokeStyle = '#f2f7f6'; c.fillStyle = '#f2f7f6'; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }];
    };
    var items = [
      ['plate', 0, 0, 150, 150, function (c) { c.fillStyle = 'rgba(22,16,56,.78)'; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 4; c.stroke(); }],
      ['pill', 160, 0, 340, 150, function (c) { c.fillStyle = 'rgba(22,16,56,.78)'; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 4; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); c.stroke(); }],
      ['pillw', 0, 400, 340, 150, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); }],
      ['big', 510, 0, 280, 280, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); }],
      ['lv', 800, 0, 140, 140, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.fill(); }],
      ['lvo', 950, 0, 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.stroke(); }],
      ['ring', 800, 150, 160, 160, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(80, 80, 72, 0, 7); c.stroke(); }],
      ['star', 970, 150, 100, 100, function (c) { star8(c, 50, 50, 46, 0.74); c.fillStyle = '#fff'; c.fill(); }],
      ['heart', 1080, 150, 96, 96, function (c) { c.scale(4, 4); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12, 20.5); c.bezierCurveTo(4, 14.5, 2.5, 9.5, 5.5, 6.5); c.bezierCurveTo(8, 4.3, 11, 5.5, 12, 8); c.bezierCurveTo(13, 5.5, 16, 4.3, 18.5, 6.5); c.bezierCurveTo(21.5, 9.5, 20, 14.5, 12, 20.5); c.fill(); }],
      // a little block and a little tower, as in the old pills (the block's three faces in the tile colours)
      ['cube', 1190, 150, 96, 96, function (c) { c.scale(4, 4); c.fillStyle = '#86e6d9'; c.beginPath(); c.moveTo(12, 3.5); c.lineTo(20.5, 7.7); c.lineTo(12, 11.9); c.lineTo(3.5, 7.7); c.closePath(); c.fill(); c.fillStyle = '#1ba39c'; c.beginPath(); c.moveTo(3.5, 7.7); c.lineTo(3.5, 16.1); c.lineTo(12, 20.4); c.lineTo(12, 11.9); c.closePath(); c.fill(); c.fillStyle = '#0b565b'; c.beginPath(); c.moveTo(20.5, 7.7); c.lineTo(20.5, 16.1); c.lineTo(12, 20.4); c.lineTo(12, 11.9); c.closePath(); c.fill(); }],
      ['tower', 1300, 150, 96, 96, function (c) { c.scale(4, 4); var f = function (col, pts) { c.fillStyle = col; c.beginPath(); pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); c.fill(); };
        f('#ffe7a6', [[12, 2.5], [18, 5.5], [12, 8.5], [6, 5.5]]); f('#1ba39c', [[6, 5.5], [6, 9.5], [12, 12.5], [12, 8.5]]); f('#0b565b', [[18, 5.5], [18, 9.5], [12, 12.5], [12, 8.5]]);
        f('#d7a565', [[6, 9.5], [6, 14], [12, 17], [12, 12.5]]); f('#8f5f2c', [[18, 9.5], [18, 14], [12, 17], [12, 12.5]]);
        f('#2b5fc4', [[6, 14], [6, 18.5], [12, 21.5], [12, 17]]); f('#142c6a', [[18, 14], [18, 18.5], [12, 21.5], [12, 17]]); }],
      icon('ic-back', 0, 160, function (c) { c.beginPath(); c.moveTo(19, 12); c.lineTo(6, 12); c.moveTo(11, 6); c.lineTo(5, 12); c.lineTo(11, 18); c.stroke(); }),
      ['ic-exit', 480, 400, 96, 96, function (c) { Kit.play.exitIcon(c, 96, '#f2f7f6', 2.6); }],      // the way out of the game (the kit's own icon); ic-back only goes back one screen
      icon('ic-retry', 106, 160, function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); }),
      icon('ic-grid', 212, 160, function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); }),
      icon('ic-snd', 318, 160, function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); }),
      icon('ic-mute', 424, 160, function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); }),
      icon('ic-pause', 0, 266, function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); }),
      icon('ic-close', 106, 266, function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); }),
      icon('ic-play', 212, 266, function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); }),
      icon('ic-lock', 318, 266, function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); }),
      icon('ic-tick', 424, 266, function (c) { c.beginPath(); c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19, 7); c.stroke(); }),
      icon('ic-next', 360, 400, function (c) { c.beginPath(); c.moveTo(5, 12); c.lineTo(18, 12); c.moveTo(13, 6); c.lineTo(19, 12); c.lineTo(13, 18); c.stroke(); })
    ];
    atlas(scene, 'ui', 1420, 560, items);
  }

  // ---------- the sky: clouds, sun, moon, glows (white pictures, tinted by the climb), skyline and stars (tiles) ----------
  var RS = A.RS = 1.5;   // texture pixels per sky unit (u)
  function cloudMask(w, h, seed) {
    return function (g) {
      var r = rng(seed), ch = h / RS, cw = w / RS;
      g.scale(RS, RS);
      var n = 6 + ((r() * 4) | 0), base = ch * 0.8;
      for (var pass = 0; pass < 3; pass++) {
        var rr = rng(seed * 13);
        g.globalAlpha = pass === 0 ? 0.25 : pass === 1 ? 0.45 : 1;
        var grow = pass === 0 ? 1.18 : pass === 1 ? 1.08 : 1;
        for (var i = 0; i < n; i++) {
          var px = cw * (0.15 + 0.7 * (i / (n - 1))), rad = ch * (0.22 + rr() * 0.22) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.7);
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(px, base - rad * 0.9, rad * grow, 0, 6.283); g.fill();
        }
        g.beginPath(); g.ellipse(cw / 2, base - ch * 0.06, cw * 0.42 * grow, ch * 0.14 * grow, 0, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-in';
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0.1, '#ffffff'); gr.addColorStop(1, '#aab0c8');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
    };
  }
  A.CLOUDS = [[160, 66], [190, 80], [130, 54], [210, 88], [150, 62]];   // sizes in u
  function paintSkyAtlas(scene) {
    var items = [], y = 0;
    A.CLOUDS.forEach(function (c, i) {
      var w = Math.round(c[0] * RS), h = Math.round(c[1] * RS);
      items.push(['cloud' + i, 0, y, w, h, cloudMask(w, h, 91 + i * 7)]); y += h + 4;
    });
    items.push(['sglow', 340, 0, 170, 170, function (c) { var g = c.createRadialGradient(85, 85, 0, 85, 85, 84); g.addColorStop(0, 'rgba(255,214,140,.7)'); g.addColorStop(0.35, 'rgba(255,160,110,.25)'); g.addColorStop(1, 'rgba(255,140,110,0)'); c.fillStyle = g; c.fillRect(0, 0, 170, 170); }]);
    items.push(['mglow', 340, 180, 100, 100, function (c) { var g = c.createRadialGradient(50, 50, 8, 50, 50, 49); g.addColorStop(0, 'rgba(255,246,214,.55)'); g.addColorStop(1, 'rgba(255,246,214,0)'); c.fillStyle = g; c.fillRect(0, 0, 100, 100); }]);
    items.push(['moon', 340, 290, 64, 64, function (c) { var g = c.createRadialGradient(24, 24, 4, 32, 32, 30); g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#f1dfae'); c.fillStyle = g; c.beginPath(); c.arc(32, 32, 30, 0, 6.283); c.fill(); }]);
    items.push(['sun', 340, 364, 86, 86, function (c) { var g = c.createRadialGradient(43, 35, 0, 43, 43, 39); g.addColorStop(0, '#fff2c4'); g.addColorStop(1, '#ffb45a'); c.fillStyle = g; c.beginPath(); c.arc(43, 43, 39, 0, 6.283); c.fill(); }]);
    atlas(scene, 'sk', 512, Math.max(y, 460), items);
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
  // The skyline as a tile one SKY_W units wide that repeats: a far city (wind towers, domes, terraces), a near city
  // (houses, parapets, palms, a garden hedge) as white masks, and a layer of lit windows. No building crosses the
  // tile's edge, so the repeat has no seam.
  var SKY_W = A.SKY_W = 1000, SKY_H = A.SKY_H = 130, SKY_G = A.SKY_G = 10;
  var NOP = new Proxy(function () {}, { get: function () { return NOP; }, set: function () { return true; }, apply: function () { return NOP; } });
  // Draws the whole skyline into three contexts (far city, near city, lit windows); a texture that is painted passes the real
  // one for its layer and a do-nothing for the others, so each layer comes out the same however the others are made
  // (a layer that was baked to a file is simply not painted).
  function skylineInto(f, n, l) {
    var D = RS, u = 1, W = SKY_W, H = SKY_H, r = rng(4242), base = H;
    [f, n, l].forEach(function (g) { if (g !== NOP) { g.scale(D, D); g.fillStyle = '#fff'; } });
    function windows(x, top, bw, bh, chance, size) {
      for (var wy = top + 6 * u; wy < base - 6 * u; wy += 9 * u) {
        for (var wx = x + 4 * u; wx < x + bw - 5 * u; wx += 8 * u) {
          if (r() > chance) continue;
          var a = 0.55 + r() * 0.45, c = r() < 0.8 ? '#ffd27a' : '#ffb35c';
          l.globalAlpha = a; l.fillStyle = c;
          var ww = 2.6 * u * size, wh = 4 * u * size;
          l.beginPath(); l.moveTo(wx, wy + wh); l.lineTo(wx, wy + ww / 2); l.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); l.lineTo(wx + ww, wy + wh); l.fill();
        }
      }
      l.globalAlpha = 1;
    }
    var x = 0;
    while (x < W - 70) {
      var t = r(), bw, bh;
      if (t < 0.2) {
        bw = 9 + r() * 5; bh = 52 + r() * 30;
        f.fillRect(x, base - bh, bw, bh); f.fillRect(x - 1.5, base - bh - 3, bw + 3, 3); f.fillRect(x + 1.5, base - bh - 6, bw - 3, 3);
        x += bw + 2 + r() * 5;
      } else if (t < 0.42) {
        bw = 28 + r() * 18; bh = 18 + r() * 18;
        f.fillRect(x, base - bh, bw, bh);
        var dr = bw * 0.3; f.beginPath(); f.ellipse(x + bw / 2, base - bh, dr, dr * 1.1, 0, Math.PI, 0); f.fill();
        windows(x, base - bh, bw, bh, 0.2, 0.8);
        x += bw + 1 + r() * 4;
      } else {
        bw = 22 + r() * 34; bh = 16 + r() * 40;
        f.fillRect(x, base - bh, bw, bh);
        for (var c = x + 1; c < x + bw - 3; c += 6) f.fillRect(c, base - bh - 2.5, 3, 2.5);
        if (r() < 0.5) f.fillRect(x + bw * 0.3, base - bh - 9, bw * 0.4, 9);
        windows(x, base - bh, bw, bh, 0.18, 0.8);
        x += bw + 1 + r() * 3;
      }
    }
    x = 0;
    while (x < W - 90) {
      var tt = r();
      if (tt < 0.25) { palm(n, x + 6, base, 34 + r() * 18, 1, r); x += 10 + r() * 8; }
      else {
        var w2 = 34 + r() * 40, h2 = 12 + r() * 24;
        n.fillRect(x, base - h2, w2, h2);
        for (var c2 = x; c2 < x + w2 - 2; c2 += 7) n.fillRect(c2, base - h2 - 3, 4, 3);
        if (r() < 0.35) { var d2 = w2 * 0.2; n.beginPath(); n.ellipse(x + w2 * 0.7, base - h2, d2, d2, 0, Math.PI, 0); n.fill(); }
        windows(x, base - h2, w2, h2, 0.42, 1);
        x += w2 + (r() < 0.5 ? 0 : 2 + r() * 8);
      }
    }
    n.fillRect(0, base - 1, W, 7);                                   // a garden tree line at the foot of the city on a solid hedge
    var gx = 2;
    while (gx < W - 8) {
      var tr = 4 + r() * 3.5, gy = base + 6;
      if (r() < 0.25) { n.beginPath(); n.ellipse(gx, gy - tr * 1.9, tr * 0.6, tr * 2.3, 0, 0, 6.283); n.fill(); }
      else { n.beginPath(); n.arc(gx, gy - tr * 0.8, tr, 0, 6.283); n.arc(gx + tr * 0.8, gy - tr * 0.45, tr * 0.75, 0, 6.283); n.arc(gx - tr * 0.7, gy - tr * 0.35, tr * 0.7, 0, 6.283); n.fill(); }
      gx += tr * (1.3 + r() * 1.2);
    }
  }
  function paintSkyline(scene) {
    var cw = Math.ceil(SKY_W * RS), ch = Math.ceil((SKY_H + SKY_G) * RS);
    Kit.play.tex(scene, 'sky-far', cw, ch, function (g) { skylineInto(g, NOP, NOP); });
    Kit.play.tex(scene, 'sky-near', cw, ch, function (g) { skylineInto(NOP, g, NOP); });
    Kit.play.tex(scene, 'sky-lit', cw, ch, function (g) { skylineInto(NOP, NOP, g); });
  }
  // stars: 1024 x 1024 pixels, a tile; one pixel = one canvas pixel on screen
  function paintStars(scene) {
    Kit.play.tex(scene, 'stars', 1024, 1024, function (g) {
      var r = rng(99), n = 360;
      for (var i = 0; i < n; i++) {
        var x = r() * 1024, y = r() * 1024, s = r() < 0.92 ? 0.6 + r() * 0.8 : 1.4 + r() * 1.0;
        g.globalAlpha = 0.35 + r() * 0.65; g.fillStyle = r() < 0.15 ? '#ffe7b0' : '#ffffff';
        [[0, 0], [x < 3 ? 1024 : 0, y < 3 ? 1024 : 0]].forEach(function (o) { g.beginPath(); g.arc(x + o[0], y + o[1], s, 0, 6.283); g.fill(); });
      }
      g.globalAlpha = 1;
    });
  }

  // sky colours by progress p (0 dusk .. 1 night): [p, top, mid, horizon]
  var SKY = [
    [0.00, '#463c8c', '#d9708f', '#ffc46e'],
    [0.30, '#2f2a72', '#9a4f92', '#ff8c78'],
    [0.58, '#181b50', '#43307c', '#b15f90'],
    [0.82, '#090c2b', '#141c4c', '#2f2c6a'],
    [1.00, '#04061a', '#0a1138', '#1e2358']
  ];
  A.skyAt = function (p) {
    p = Math.max(0, Math.min(1, p));
    for (var i = 0; i < SKY.length - 1; i++) {
      var a = SKY[i], b = SKY[i + 1];
      if (p <= b[0]) { var t = (p - a[0]) / (b[0] - a[0]); return { top: mix(a[1], b[1], t), mid: mix(a[2], b[2], t), hor: mix(a[3], b[3], t) }; }
    }
    var l = SKY[SKY.length - 1]; return { top: l[1], mid: l[2], hor: l[3] };
  };

  // how big one world unit is on this screen, in CSS pixels (the tower is as big as fits: wide enough that the sliding
  // block stays mostly on screen, short enough to leave room above for the block and the climb)
  A.sCss = function (w, h) { return Math.min(1.15 * (w / 2 - 6) / 235, h * 0.4 / 200); };

  // Paint everything once, at fixed sizes (tools/bake-art.js bakes them to files; a baked picture is not painted).
  A.paint = function (scene) {
    var R = A.R = 2;   // texture pixels per world unit, fixed (about one per design unit on a phone on its side), so the pictures can be baked
    paintBlocks(scene, R);
    paintPlaza(scene, 1.5);
    paintLantern(scene, 2);
    paintFx(scene);
    paintUi(scene);
    paintSkyAtlas(scene);
    paintSkyline(scene);
    paintStars(scene);
  };
})();
