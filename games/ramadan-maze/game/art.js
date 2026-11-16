/* Ramadan Maze: game/art.js, the paint box. The look is the old page's (hedge garden, mud-brick lanes, tiled night; a kid seen
   from above in a blue cap with a backpack, no face; dates, a cup of water, a fanoos lantern; the house at the exit; the iftar
   room), kept and tidied. Nothing is painted per frame (docs/phaser-standard.md section 3): every picture is painted ONCE into
   the engine's canvas textures and then only shown, moved and tinted by the engine.
     - 'ui'   one atlas of interface pictures at 1 texel per design unit (plates, icons, the stick, cards, glow, spark).
     - 'mzs'  one atlas of world sprites at 1 texel per world unit (the kid's 8 walk frames, items, shadows), so they draw in one batch.
     - 'mzh0..2' one atlas per world for its house (base, door, lit windows, hanging lantern).
     - 'bg0..2'  a seamless 512 tile of the world's ground (a TileSprite), so the area round a big maze costs one small texture.
     - 'mz-floor' and 'mz-tops'  the current maze, painted at 1 texel per unit, the floor with the
       wall fronts and the wall tops as a second layer drawn over the kid, so walls in front hide her feet.
     - the iftar room, painted when first needed and let go after.
   (Canvas2D painting of these is the same code as the old page; a maze is made from its level number, so it cannot be an image
   file: there would be 30 of them.) */
(function () {
  'use strict';
  var A = window.MzArt = {};
  var K = A.K = { C: 128, DEN: 1 };                // C: one maze cell in world units; DEN: texels per world unit (1: nothing is painted bigger than it is shown)

  // ---------- helpers ----------

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
  function rgba(c, al) { var a = hex(c); return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function star8(ctx, x, y, r, inner, rot) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 + (rot || 0), q = i % 2 ? r * (inner || 0.62) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function glow(ctx, x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }

  A.rng = rng; A.mix = mix; A.shade = shade; A.rgba = rgba; A.rr = rr; A.star8 = star8; A.glow = glow;

  // ---------- worlds ----------
  A.WORLDS = [
    { name: 'Palm Garden', color: '#9fdc6a', wall: 'hedge', wallT: 0.34, sand: '#ecc993', tint: ['#ff9a4a', '#7a3d8f'],
      bg: '#d9a868', ink: '#fff7e6', house: { wall: '#f1d2a6', trim: '#c98a4b', door: '#7a4424', roof: '#e2b98a' } },
    { name: 'Old City Lanes', color: '#ffb86b', wall: 'brick', wallT: 0.3, tint: ['#ffc27a', '#4a3b8f'],
      bg: '#b98d63', ink: '#fff7e6', house: { wall: '#f6ebd9', trim: '#3f86c8', door: '#2f6fb3', roof: '#e9dcc5' } },
    { name: 'Lantern Night', color: '#ffd36b', wall: 'tile', wallT: 0.3, tint: ['#3d4fb8', '#1a0f3d'],
      bg: '#131a42', ink: '#fff7e6', dark: true, house: { wall: '#efe3cf', trim: '#d8a43a', door: '#8a4b1f', roof: '#e2d3b8' } }
  ];

  // Many small pictures in ONE canvas texture (so they draw in one batch). list: [{ n, w, h, paint(ctx, w, h), d }]; each is painted
  // at d texels per unit (default d) with its own top-left at the origin, and added as a named frame. The frame remembers its
  // density (frame.customData.d), so a game object can be shown in world units: setScale(1 / d).
  A.pack = function (scene, key, list, d, maxW) {
    maxW = maxW || 2048;
    var x = 0, y = 0, rowH = 0, G = 2, i, it, dd, pw, ph, slots = [];
    for (i = 0; i < list.length; i++) {
      it = list[i]; dd = it.d || d; pw = Math.ceil(it.w * dd); ph = Math.ceil(it.h * dd);
      if (x + pw > maxW) { x = 0; y += rowH + G; rowH = 0; }
      slots.push({ x: x, y: y, pw: pw, ph: ph, dd: dd }); x += pw + G; rowH = Math.max(rowH, ph);
    }
    // one fixed-size picture (Kit.play.tex: baked into an AVIF file by tools/bake-art.js, so nothing is painted when it was)
    Kit.play.tex(scene, key, maxW, Math.max(2, y + rowH + G), function (c) {
      for (var i = 0; i < list.length; i++) {
        var it = list[i], s = slots[i];
        c.save(); c.translate(s.x, s.y); c.beginPath(); c.rect(0, 0, s.pw, s.ph); c.clip(); c.scale(s.dd, s.dd); it.paint(c, it.w, it.h); c.restore();
      }
    });
    var tex = scene.textures.get(key);
    for (i = 0; i < list.length; i++) if (!tex.frames[list[i].n]) { var f = tex.add(list[i].n, 0, slots[i].x, slots[i].y, slots[i].pw, slots[i].ph); f.customData.d = slots[i].dd; }
    return key;
  };

  // ---------- the ground round the maze: a seamless 512 tile per world (a TileSprite repeats it) ----------
  A.paintTile = function (scene, wi) {
    var key = 'bg' + wi, S = 512;
    return Kit.play.tex(scene, key, S, S, function (g) { paintTile(g, wi, S); });
  };
  function paintTile(g, wi, S) {
    var R = rng(500 + wi * 31), i, x, y;
    function wrap(px, py, r, fn) { for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) { var qx = px + a * S, qy = py + b * S; if (qx + r > 0 && qx - r < S && qy + r > 0 && qy - r < S) fn(qx, qy); } }
    if (wi === 0) {
      g.fillStyle = '#e3b979'; g.fillRect(0, 0, S, S);
      // dune ridges: soft bands of light and shade, whole waves across the tile so it joins
      for (i = 0; i < 7; i++) {
        var by = R() * S, amp = 14 + R() * 26, mm = 1 + ((R() * 2) | 0), ph = R() * 6.28, wd = 26 + R() * 30;
        g.lineWidth = wd; g.strokeStyle = i % 2 ? 'rgba(255,240,205,.16)' : 'rgba(150,80,30,.10)';
        for (var rep = -1; rep <= 1; rep++) { g.beginPath(); for (x = 0; x <= S; x += 8) { y = by + rep * S + Math.sin(x / S * 6.2832 * mm + ph) * amp; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
      }
      for (i = 0; i < S * S / 200; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,245,220,.35)' : 'rgba(120,70,30,.18)'; g.fillRect(R() * S, R() * S, 1.6, 1.6); }
      for (i = 0; i < 16; i++) { var tx = R() * S, ty = R() * S, ts = 6 + R() * 8, sd = 3000 + i; wrap(tx, ty, 20, function (qx, qy) { tuft(g, qx, qy, ts, rng(sd)); }); }
      for (i = 0; i < 4; i++) { var pxx = R() * S, pyy = R() * S, pr = 34 + R() * 34, prot = R() * 6.28, sd2 = 4000 + i; wrap(pxx, pyy, pr * 1.3, function (qx, qy) { palmTop(g, qx, qy, pr, prot, rng(sd2)); }); }
    } else if (wi === 1) {
      g.fillStyle = '#c99c6d'; g.fillRect(0, 0, S, S);
      // roofs: flat roofs with parapets, domes and little courtyard trees
      var s = 64;
      for (y = 0; y < S; y += s) for (x = 0; x < S; x += s) {
        var rw = s * (0.7 + R() * 0.6), rh = s * (0.7 + R() * 0.6), rx = x + R() * 10, ry = y + R() * 10;
        var base = ['#e8d4b5', '#dcbf98', '#f0e2cc', '#d7b48a', '#e9c9a1'][(R() * 5) | 0], k = R(), sd3 = (R() * 1e6) | 0;
        (function (rx, ry, rw, rh, base, k, sd3) {
          wrap(rx + rw / 2, ry + rh / 2, Math.max(rw, rh) / 2 + 12, function (qx, qy) {
            var X = qx - rw / 2, Y = qy - rh / 2, RR = rng(sd3);
            g.fillStyle = 'rgba(70,40,20,.28)'; g.beginPath(); rr(g, X + 7, Y + 9, rw, rh, 4); g.fill();
            g.fillStyle = shade(base, -0.12); g.beginPath(); rr(g, X, Y, rw, rh, 4); g.fill();
            g.fillStyle = base; g.beginPath(); rr(g, X + 4, Y + 4, rw - 8, rh - 8, 3); g.fill();
            if (k < 0.22) dome(g, X + rw / 2, Y + rh / 2, Math.min(rw, rh) * 0.32, RR() < 0.5 ? '#f3efe6' : '#7fb8d8');
            else if (k < 0.36) { for (var q = 0; q < 5; q++) { g.fillStyle = ['#4f8f3f', '#66a84a', '#3d7a36'][q % 3]; g.beginPath(); g.arc(X + rw / 2 + (RR() - 0.5) * rw * 0.4, Y + rh / 2 + (RR() - 0.5) * rh * 0.4, rw * 0.18, 0, 6.283); g.fill(); } }
            else if (k < 0.5) { g.fillStyle = 'rgba(90,60,40,.25)'; g.fillRect(X + rw * 0.2, Y + rh * 0.25, rw * 0.25, rh * 0.18); }
          });
        })(rx, ry, rw, rh, base, k, sd3);
      }
    } else {
      var gn = g.createLinearGradient(0, 0, 0, S); gn.addColorStop(0, '#111839'); gn.addColorStop(0.5, '#1a1450'); gn.addColorStop(1, '#111839');
      g.fillStyle = gn; g.fillRect(0, 0, S, S);
      var s2 = 64;
      for (y = 0; y < S; y += s2) for (x = 0; x < S; x += s2) {
        var w2 = s2 * (0.7 + R() * 0.5), h2 = s2 * (0.7 + R() * 0.5), x2 = x + R() * 12, y2 = y + R() * 12, col = ['#1f2a5e', '#252f68', '#1b2453'][(R() * 3) | 0], dm = R() < 0.18, lit = R() < 0.55, fx = R(), fy = R();
        (function (x2, y2, w2, h2, col, dm, lit, fx, fy) {
          wrap(x2 + w2 / 2, y2 + h2 / 2, Math.max(w2, h2) / 2 + 30, function (qx, qy) {
            var X = qx - w2 / 2, Y = qy - h2 / 2;
            g.fillStyle = 'rgba(0,0,10,.35)'; g.beginPath(); rr(g, X + 6, Y + 8, w2, h2, 4); g.fill();
            g.fillStyle = col; g.beginPath(); rr(g, X, Y, w2, h2, 4); g.fill();
            if (dm) dome(g, X + w2 / 2, Y + h2 / 2, Math.min(w2, h2) * 0.3, '#3a4a8a');
            if (lit) { var lx = X + fx * w2, ly = Y + fy * h2; glow(g, lx, ly, 26, '#ffb85a', 0.45); g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(lx, ly, 2.2, 0, 6.283); g.fill(); }
          });
        })(x2, y2, w2, h2, col, dm, lit, fx, fy);
      }
    }
  }

  function tuft(g, x, y, s, R) {
    g.strokeStyle = 'rgba(70,110,40,.75)'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + (R() - 0.5) * 1.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.stroke(); }
  }
  function palmTop(g, x, y, r, rot, R) {
    // shadow first (long dusk shadow to the lower right)
    g.save(); g.translate(x + r * 0.45, y + r * 0.55); g.rotate(rot); g.fillStyle = 'rgba(80,40,20,.22)';
    fronds(g, r, 0); g.restore();
    g.save(); g.translate(x, y); g.rotate(rot);
    fronds(g, r, 1);
    g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(0, 0, r * 0.12, 0, 6.283); g.fill();
    g.fillStyle = '#c0471f'; for (var i = 0; i < 5; i++) { g.beginPath(); g.arc(Math.cos(i * 1.3) * r * 0.12, Math.sin(i * 1.3) * r * 0.12, r * 0.05, 0, 6.283); g.fill(); }
    g.restore();
  }
  function fronds(g, r, colored) {
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + (i % 2) * 0.2, L = r * (0.85 + (i % 3) * 0.08);
      g.save(); g.rotate(a);
      if (colored) { var gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, '#2f6b2a'); gr.addColorStop(1, '#6fae45'); g.fillStyle = gr; }
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -L * 0.22, L, 0); g.quadraticCurveTo(L * 0.5, L * 0.22, 0, 0); g.fill();
      if (colored) { g.strokeStyle = 'rgba(30,60,20,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(L * 0.95, 0); g.stroke(); }
      g.restore();
    }
  }
  function dome(g, x, y, r, col) {
    g.fillStyle = 'rgba(40,20,10,.3)'; g.beginPath(); g.arc(x + r * 0.25, y + r * 0.3, r, 0, 6.283); g.fill();
    var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, shade(col, 0.5)); gr.addColorStop(0.6, col); gr.addColorStop(1, shade(col, -0.3));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    g.strokeStyle = rgba(shade(col, -0.35), 0.6); g.lineWidth = 1.2;
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    g.fillStyle = '#e6b84a'; g.beginPath(); g.arc(x, y, r * 0.12, 0, 6.283); g.fill();
  }
  // ---------- the maze: floor layer (with shadows and wall fronts) and tops layer ----------
  // Returns { floor, tops, pad, t, H, w, h, runs } : canvases at dpr (= texels per world unit); the grid origin is at (pad, pad) units;
  // runs: the wall footprints [{ x, y, w, h }] in cell space, which the physics makes its static bodies.
  A.paintMaze = function (m, C, dpr) {
    var W = A.WORLDS[m.world], t = C * W.wallT, H = C * 0.2, pad = Math.ceil(t / 2 + H + C * 0.25);
    var cw = m.cols * C + pad * 2, ch = m.rows * C + pad * 2;
    var floor = canvas(cw * dpr, ch * dpr), tops = canvas(cw * dpr, ch * dpr);
    var f = floor.getContext('2d'), g = tops.getContext('2d'), R = rng(m.n * 131 + 7);
    f.scale(dpr, dpr); f.translate(pad, pad); g.scale(dpr, dpr); g.translate(pad, pad);

    // wall runs as footprint rects (merged straight lines of wall)
    var runs = [], x, y, cells = m.cols;
    function wallS(x, y) { return y < 0 || y >= m.rows ? true : !(m.cells[y * cells + x] & 4); } // wall on the south side of (x,y)
    function wallE(x, y) { return x < 0 || x >= m.cols ? true : !(m.cells[y * cells + x] & 2); }
    for (y = 0; y <= m.rows; y++) {
      var sx = -1;
      for (x = 0; x <= m.cols; x++) {
        var has = x < m.cols && (y === 0 || y === m.rows ? true : wallS(x, y - 1));
        if (has && sx < 0) sx = x;
        if (!has && sx >= 0) { runs.push({ x: sx * C - t / 2, y: y * C - t / 2, w: (x - sx) * C + t, h: t, hz: 1 }); sx = -1; }
      }
    }
    for (x = 0; x <= m.cols; x++) {
      var sy = -1;
      for (y = 0; y <= m.rows; y++) {
        var hv = y < m.rows && (x === 0 || x === m.cols ? true : wallE(x - 1, y));
        if (hv && sy < 0) sy = y;
        if (!hv && sy >= 0) { runs.push({ x: x * C - t / 2, y: sy * C - t / 2, w: t, h: (y - sy) * C + t, hz: 0 }); sy = -1; }
      }
    }
    var rad = W.wall === 'hedge' ? t * 0.45 : W.wall === 'brick' ? t * 0.18 : t * 0.12;
    function union(ctx, dx, dy, grow, lift) {
      ctx.beginPath();
      runs.forEach(function (r) { rr(ctx, r.x + dx - grow, r.y + dy - grow - (lift || 0), r.w + grow * 2, r.h + grow * 2 + (lift < 0 ? -lift : 0), rad + grow); });
    }
    function bodies(ctx, grow) { ctx.beginPath(); runs.forEach(function (r) { rr(ctx, r.x - grow, r.y - H - grow, r.w + grow * 2, r.h + H + grow * 2, rad + grow); }); }

    // 1. floor
    var fw = m.cols * C, fh = m.rows * C;
    paintFloor(f, m, C, W, R, fw, fh, t);
    // start mat
    var stx = (m.start[0] + 0.5) * C, sty = (m.start[1] + 0.5) * C;
    f.save(); f.translate(stx, sty);
    f.fillStyle = 'rgba(0,0,0,.14)'; f.beginPath(); f.ellipse(2, 3 - C * 0.08, C * 0.36, C * 0.24, 0, 0, 6.283); f.fill();
    f.fillStyle = '#a8423a'; f.beginPath(); f.ellipse(0, -C * 0.08, C * 0.36, C * 0.24, 0, 0, 6.283); f.fill();
    f.strokeStyle = 'rgba(246,196,83,.8)'; f.lineWidth = Math.max(1, C * 0.02); f.beginPath(); f.ellipse(0, -C * 0.08, C * 0.29, C * 0.18, 0, 0, 6.283); f.stroke();
    f.restore();

    // 2. soft shadow cast by the walls (sun low on the upper left)
    f.save();
    f.shadowColor = W.dark ? 'rgba(0,0,12,.6)' : 'rgba(60,25,5,.42)';
    f.shadowBlur = C * 0.22 * dpr; f.shadowOffsetX = C * 0.08 * dpr; f.shadowOffsetY = C * 0.1 * dpr;
    f.fillStyle = '#000'; bodies(f, 0); f.fill();
    f.restore();

    // 3. wall bodies: the front face shows below each top
    var P = WALLS[W.wall];
    f.fillStyle = P.body; bodies(f, 0); f.fill();
    f.save(); bodies(f, 0); f.clip();
    runs.forEach(function (r) {
      var y0 = r.y + r.h - H, gr = f.createLinearGradient(0, y0, 0, r.y + r.h);
      gr.addColorStop(0, P.bodyHi); gr.addColorStop(1, P.bodyLo);
      f.fillStyle = gr; f.fillRect(r.x - 1, y0, r.w + 2, H + 1);
      P.front(f, r, H, C, R);
    });
    f.restore();

    // 4. tops (separate layer, drawn over the kid so walls in front hide her feet)
    g.fillStyle = P.edge; union(g, 0, 0, Math.max(1, C * 0.012), H); g.fill();
    g.fillStyle = P.hi; union(g, 0, 0, 0, H); g.fill();
    g.save(); union(g, 0, 0, 0, H); g.clip();
    g.fillStyle = P.top; union(g, t * 0.08, t * 0.12, 0, H); g.fill();
    P.texture(g, runs, H, C, t, R);
    g.restore();
    return { floor: floor, tops: tops, pad: pad, t: t, H: H, w: cw, h: ch, runs: runs };
  };

  function paintFloor(f, m, C, W, R, fw, fh, t) {
    var i, x, y;
    f.save(); f.beginPath(); f.rect(-t / 2, -t / 2, fw + t, fh + t); f.clip();
    if (W.wall === 'hedge') {
      var gr = f.createLinearGradient(0, 0, fw, fh); gr.addColorStop(0, '#f2d5a2'); gr.addColorStop(1, '#e2b57c');
      f.fillStyle = gr; f.fillRect(-t, -t, fw + 2 * t, fh + 2 * t);
      for (i = 0; i < fw * fh / 90; i++) { f.fillStyle = R() < 0.5 ? 'rgba(255,248,228,.5)' : 'rgba(150,95,45,.18)'; f.fillRect(R() * fw, R() * fh, 1.3, 1.3); }
      // raked ripples and pebbles
      f.strokeStyle = 'rgba(170,110,55,.16)'; f.lineWidth = Math.max(1, C * 0.02); f.lineCap = 'round';
      for (i = 0; i < m.cols * m.rows * 1.5; i++) { x = R() * fw; y = R() * fh; f.beginPath(); f.arc(x, y + C * 0.2, C * 0.2, -2.2, -0.9); f.stroke(); }
      for (i = 0; i < m.cols * m.rows * 0.8; i++) { x = R() * fw; y = R() * fh; var pr = C * (0.02 + R() * 0.03);
        f.fillStyle = 'rgba(90,50,20,.22)'; f.beginPath(); f.ellipse(x + pr * 0.4, y + pr * 0.5, pr, pr * 0.8, 0, 0, 6.283); f.fill();
        f.fillStyle = ['#d8c3a0', '#bfa585', '#e8d8bc'][(R() * 3) | 0]; f.beginPath(); f.ellipse(x, y, pr, pr * 0.8, 0, 0, 6.283); f.fill(); }
      // little flowers along the hedges
      for (y = 0; y < m.rows; y++) for (x = 0; x < m.cols; x++) if (R() < 0.35) {
        var fx = (x + 0.15 + R() * 0.7) * C, fy = (y + 0.15 + R() * 0.7) * C, pc = ['#ff8fab', '#ffffff', '#ffd36b', '#c08cff'][(R() * 4) | 0], ps = C * 0.035;
        for (var k = 0; k < 5; k++) { f.fillStyle = pc; f.beginPath(); f.arc(fx + Math.cos(k * 1.256) * ps, fy + Math.sin(k * 1.256) * ps, ps * 0.8, 0, 6.283); f.fill(); }
        f.fillStyle = '#f6a623'; f.beginPath(); f.arc(fx, fy, ps * 0.6, 0, 6.283); f.fill();
      }
    } else if (W.wall === 'brick') {
      f.fillStyle = '#7c6a5a'; f.fillRect(-t, -t, fw + 2 * t, fh + 2 * t);
      var sz = C / 3.3;
      for (y = -t; y < fh + t; y += sz) for (x = -t - (Math.round(y / sz) % 2) * sz / 2; x < fw + t; x += sz) {
        var c = ['#b9a68c', '#a8957c', '#c5b398', '#b09c80', '#9e8b73'][(R() * 5) | 0], j = sz * 0.08;
        f.fillStyle = shade(c, -0.25); f.beginPath(); rr(f, x + j, y + j + 1.2, sz - j * 2, sz - j * 2, sz * 0.3); f.fill();
        f.fillStyle = c; f.beginPath(); rr(f, x + j, y + j, sz - j * 2, sz - j * 2.4, sz * 0.3); f.fill();
        f.fillStyle = 'rgba(255,255,255,.12)'; f.beginPath(); f.ellipse(x + sz * 0.4, y + sz * 0.35, sz * 0.18, sz * 0.1, -0.4, 0, 6.283); f.fill();
      }
    } else {
      f.fillStyle = '#1c2a66'; f.fillRect(-t, -t, fw + 2 * t, fh + 2 * t);
      for (y = 0; y < m.rows; y++) for (x = 0; x < m.cols; x++) {
        var cx = (x + 0.5) * C, cy = (y + 0.5) * C;
        f.fillStyle = (x + y) % 2 ? '#22327a' : '#1f2e70'; f.fillRect(x * C, y * C, C, C);
        f.strokeStyle = 'rgba(140,190,255,.22)'; f.lineWidth = Math.max(1, C * 0.02);
        star8(f, cx, cy, C * 0.3, 0.7, Math.PI / 8); f.stroke();
        f.fillStyle = 'rgba(255,210,110,.14)'; star8(f, cx, cy, C * 0.12, 0.55, Math.PI / 8); f.fill();
        f.fillStyle = 'rgba(120,200,220,.18)';
        f.save(); f.translate(x * C, y * C); f.rotate(Math.PI / 4); f.fillRect(-C * 0.07, -C * 0.07, C * 0.14, C * 0.14); f.restore();
      }
    }
    f.restore();
  }

  // Wall styles: colours for the body (front face), the top, a highlight rim and the outline, plus textures.
  var WALLS = {
    hedge: {
      body: '#24592b', bodyHi: '#2f6e33', bodyLo: '#173f1d', top: '#3c8a3f', hi: '#7fcf6a', edge: '#173f1d',
      front: function (f, r, H, C, R) {
        // leafy scallops along the bottom of the front face
        f.fillStyle = 'rgba(80,150,70,.55)';
        for (var x = r.x + C * 0.05; x < r.x + r.w; x += C * 0.11) { f.beginPath(); f.arc(x, r.y + r.h - H * 0.55 + R() * H * 0.3, C * 0.05, 0, 6.283); f.fill(); }
        f.fillStyle = 'rgba(10,40,15,.35)'; f.fillRect(r.x, r.y + r.h - H * 0.18, r.w, H * 0.18);
      },
      texture: function (g, runs, H, C, t, R) {
        // clumps of leaves in a few greens, lit from the upper left
        var cols = ['#2f7a35', '#46993f', '#5aae4a', '#3a8a3a', '#6cc15a'];
        runs.forEach(function (r) {
          var n = Math.ceil(r.w * r.h / (C * C * 0.012));
          for (var i = 0; i < n; i++) {
            var x = r.x + R() * r.w, y = r.y - H + R() * r.h, s = C * (0.035 + R() * 0.05);
            g.fillStyle = 'rgba(15,50,20,.35)'; g.beginPath(); g.arc(x + s * 0.3, y + s * 0.4, s, 0, 6.283); g.fill();
            g.fillStyle = cols[(R() * cols.length) | 0]; g.beginPath(); g.arc(x, y, s, 0, 6.283); g.fill();
            g.fillStyle = 'rgba(200,255,170,.25)'; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.35, s * 0.45, 0, 6.283); g.fill();
          }
          // a few berries / white blossoms
          for (var j = 0; j < r.w * r.h / (C * C * 0.25); j++) {
            g.fillStyle = R() < 0.5 ? '#fff4f0' : '#ff9fb5'; g.beginPath(); g.arc(r.x + R() * r.w, r.y - H + R() * r.h, C * 0.018, 0, 6.283); g.fill();
          }
        });
      }
    },
    brick: {
      body: '#9a5f37', bodyHi: '#b0703f', bodyLo: '#6e4024', top: '#d39a66', hi: '#f1c592', edge: '#5d3519',
      front: function (f, r, H, C, R) {
        // courses of mud bricks and the round ends of roof beams
        var y0 = r.y + r.h - H, bh = H / 3, bw = C * 0.2;
        f.strokeStyle = 'rgba(70,35,15,.45)'; f.lineWidth = Math.max(1, C * 0.012);
        for (var row = 1; row < 3; row++) { f.beginPath(); f.moveTo(r.x, y0 + row * bh); f.lineTo(r.x + r.w, y0 + row * bh); f.stroke(); }
        for (row = 0; row < 3; row++) for (var x = r.x + (row % 2) * bw / 2; x < r.x + r.w; x += bw) { f.beginPath(); f.moveTo(x, y0 + row * bh); f.lineTo(x, y0 + (row + 1) * bh); f.stroke(); }
        if (r.hz && r.w > C * 1.2) for (var b = r.x + C * 0.5; b < r.x + r.w - C * 0.3; b += C) {
          f.fillStyle = '#5a3418'; f.beginPath(); f.arc(b, y0 + H * 0.3, C * 0.035, 0, 6.283); f.fill();
          f.fillStyle = 'rgba(255,220,170,.35)'; f.beginPath(); f.arc(b - C * 0.008, y0 + H * 0.27, C * 0.015, 0, 6.283); f.fill();
        }
      },
      texture: function (g, runs, H, C, t, R) {
        runs.forEach(function (r) {
          // straw flecks and smooth plaster patches on the top
          for (var i = 0; i < r.w * r.h / (C * C * 0.02); i++) {
            var x = r.x + R() * r.w, y = r.y - H + R() * r.h;
            g.strokeStyle = R() < 0.5 ? 'rgba(255,230,180,.35)' : 'rgba(110,60,25,.25)'; g.lineWidth = 1;
            var a = R() * 3.14, l = C * 0.03; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
          }
          // a pot of greenery on some wall tops
          if (r.w * r.h > C * C * 0.5 && R() < 0.5) {
            var px = r.hz ? r.x + C * (0.6 + R() * (r.w / C - 1.2)) : r.x + r.w / 2, py = r.hz ? r.y - H + r.h / 2 : r.y - H + C * (0.6 + R() * Math.max(0, r.h / C - 1.2));
            var s = t * 0.36;
            g.fillStyle = 'rgba(60,30,10,.35)'; g.beginPath(); g.ellipse(px + s * 0.25, py + s * 0.35, s * 1.1, s, 0, 0, 6.283); g.fill();
            g.fillStyle = '#9c4524'; g.beginPath(); g.ellipse(px, py, s * 1.05, s * 0.95, 0, 0, 6.283); g.fill();
            g.fillStyle = '#c9683c'; g.beginPath(); g.ellipse(px, py, s * 0.85, s * 0.75, 0, 0, 6.283); g.fill();
            var lv = ['#2f7a35', '#46993f', '#5aae4a', '#3a8a3a', '#6cc15a'];
            for (var k = 0; k < 9; k++) { var la = k * 2.4 + R(), ld = s * (0.15 + R() * 0.55); g.fillStyle = lv[k % 5];
              g.beginPath(); g.ellipse(px + Math.cos(la) * ld, py + Math.sin(la) * ld, s * 0.42, s * 0.26, la, 0, 6.283); g.fill(); }
            for (var fl = 0; fl < 3; fl++) { g.fillStyle = ['#ff8fab', '#ffffff', '#ffd36b'][fl]; g.beginPath(); g.arc(px + (R() - 0.5) * s, py + (R() - 0.5) * s, s * 0.13, 0, 6.283); g.fill(); }
          }
        });
      }
    },
    tile: {
      body: '#e8dcc4', bodyHi: '#efe4cf', bodyLo: '#c9b893', top: '#f3ead8', hi: '#ffffff', edge: '#7a6a4a',
      front: function (f, r, H, C, R) {
        // a band of zellige tiles along the front face
        var y0 = r.y + r.h - H, s = H * 0.5, cols = ['#1f9aa6', '#2a5bb8', '#f2c14e', '#ffffff'];
        for (var x = r.x, i = 0; x < r.x + r.w; x += s, i++) {
          f.fillStyle = cols[i % 4]; f.fillRect(x + 0.5, y0 + H * 0.2, s - 1, s - 1);
          f.fillStyle = cols[(i + 2) % 4]; f.fillRect(x + 0.5, y0 + H * 0.2 + s, s - 1, s * 0.6);
        }
        f.fillStyle = '#d8a43a'; f.fillRect(r.x, y0 + H * 0.12, r.w, H * 0.08);
      },
      texture: function (g, runs, H, C, t, R) {
        runs.forEach(function (r) {
          // inlaid tile line along the middle of the top
          g.fillStyle = '#1f9aa6';
          if (r.hz) g.fillRect(r.x + t * 0.3, r.y - H + r.h / 2 - t * 0.09, r.w - t * 0.6, t * 0.18);
          else g.fillRect(r.x + r.w / 2 - t * 0.09, r.y - H + t * 0.3, t * 0.18, r.h - t * 0.6);
          g.fillStyle = '#f2c14e';
          var len = r.hz ? r.w : r.h;
          for (var d = t * 0.5; d < len - t * 0.3; d += C * 0.5) {
            var x = r.hz ? r.x + d : r.x + r.w / 2, y = r.hz ? r.y - H + r.h / 2 : r.y - H + d;
            star8(g, x, y, t * 0.17, 0.55, Math.PI / 8); g.fill();
          }
        });
      }
    }
  };

  // ---------- the kid, seen from above (no face: cap, shoulders, backpack, hands and feet) ----------
  // Painted facing up, centred on (0, 0), r = the kid's radius. phase: the walk cycle (0 = standing); the game turns the picture.
  function paintKid(g, r, phase, standing) {
    var st = standing ? 0 : Math.sin(phase), bob = standing ? 0 : Math.abs(Math.cos(phase)) * r * 0.06;
    g.save(); g.translate(0, -bob);
    // feet (step forward and back)
    g.fillStyle = '#3a2a22';
    g.beginPath(); g.ellipse(-r * 0.32, -st * r * 0.42, r * 0.17, r * 0.24, 0, 0, 6.283); g.fill();
    g.beginPath(); g.ellipse(r * 0.32, st * r * 0.42, r * 0.17, r * 0.24, 0, 0, 6.283); g.fill();
    // hands swing opposite to the feet
    g.fillStyle = '#2f9e8f';
    g.beginPath(); g.ellipse(-r * 0.78, st * r * 0.3, r * 0.19, r * 0.25, 0.2, 0, 6.283); g.fill();
    g.beginPath(); g.ellipse(r * 0.78, -st * r * 0.3, r * 0.19, r * 0.25, -0.2, 0, 6.283); g.fill();
    g.fillStyle = '#c68a5e';
    g.beginPath(); g.arc(-r * 0.8, st * r * 0.3 - r * 0.2, r * 0.13, 0, 6.283); g.fill();
    g.beginPath(); g.arc(r * 0.8, -st * r * 0.3 - r * 0.2, r * 0.13, 0, 6.283); g.fill();
    // shoulders (teal jacket)
    var gb = g.createLinearGradient(-r, -r, r, r); gb.addColorStop(0, '#4fd1bd'); gb.addColorStop(1, '#1f7f73');
    g.fillStyle = gb; g.beginPath(); g.ellipse(0, r * 0.08, r * 0.8, r * 0.52, 0, 0, 6.283); g.fill();
    // backpack on the back
    g.fillStyle = '#c9771f'; g.beginPath(); rr(g, -r * 0.5, r * 0.18, r, r * 0.62, r * 0.2); g.fill();
    g.fillStyle = '#f2a93b'; g.beginPath(); rr(g, -r * 0.44, r * 0.2, r * 0.88, r * 0.5, r * 0.18); g.fill();
    g.fillStyle = '#ffd36b'; g.beginPath(); rr(g, -r * 0.24, r * 0.46, r * 0.48, r * 0.18, r * 0.07); g.fill();
    // head from above: dark hair, and a blue knitted cap sitting toward the back (front edge trimmed in gold)
    g.fillStyle = '#3a2418'; g.beginPath(); g.ellipse(0, -r * 0.04, r * 0.5, r * 0.55, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,215,170,.2)'; g.beginPath(); g.ellipse(-r * 0.14, -r * 0.42, r * 0.2, r * 0.07, -0.35, 0, 6.283); g.fill();
    g.save(); g.beginPath(); g.ellipse(0, r * 0.1, r * 0.46, r * 0.41, 0, 0, 6.283); g.clip();
    var gc = g.createLinearGradient(-r * 0.4, -r * 0.3, r * 0.4, r * 0.5);
    gc.addColorStop(0, '#6a8fe6'); gc.addColorStop(1, '#2c4a9e');
    g.fillStyle = gc; g.fillRect(-r, -r, r * 2, r * 2);
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = Math.max(0.8, r * 0.04);
    for (var i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-r * 0.5, r * 0.1 + i * r * 0.12); g.lineTo(r * 0.5, r * 0.1 + i * r * 0.12); g.stroke(); }
    g.restore();
    g.strokeStyle = '#e8b84a'; g.lineWidth = Math.max(1.2, r * 0.08); g.lineCap = 'round';
    g.beginPath(); g.ellipse(0, r * 0.1, r * 0.44, r * 0.39, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    g.restore();
  }

  // ---------- collectibles ----------
  // g is centred on the item; size is its width in world units.
  function paintItem(g, type, size) {
    var s = size / 2;
    if (type === 'date') {
      // three dates lying side by side on a little plate (like the iftar table)
      g.fillStyle = 'rgba(40,20,5,.25)'; g.beginPath(); g.ellipse(s * 0.06, s * 0.3, s * 0.98, s * 0.42, 0, 0, 6.283); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, s * 0.22, s * 0.95, s * 0.42, 0, 0, 6.283); g.fill();
      g.strokeStyle = '#3f86c8'; g.lineWidth = Math.max(1, s * 0.06); g.beginPath(); g.ellipse(0, s * 0.22, s * 0.74, s * 0.31, 0, 0, 6.283); g.stroke();
      drawDate(g, -s * 0.06, -s * 0.22, s * 0.66, Math.PI / 2 - 0.12);
      drawDate(g, s * 0.16, s * 0.0, s * 0.66, Math.PI / 2 + 0.1);
      drawDate(g, -s * 0.14, s * 0.2, s * 0.66, Math.PI / 2 - 0.04);
    } else if (type === 'cup') drawCup(g, s);
    else lanternShape(g, 0, 0, s * 0.62, '#ff9e45', true);
  }
  A.itemSize = { date: 0.7 * K.C, cup: 0.56 * K.C, lantern: 0.56 * K.C };

  function drawDate(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    var rx = s * 0.34, ry = s * 0.62;
    g.fillStyle = 'rgba(40,10,0,.3)'; g.beginPath(); g.ellipse(s * 0.06, s * 0.08, rx, ry, 0, 0, 6.283); g.fill();
    var gr = g.createLinearGradient(-rx, -ry, rx, ry);
    gr.addColorStop(0, '#b4532a'); gr.addColorStop(0.45, '#7e2c12'); gr.addColorStop(1, '#4a1406');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 6.283); g.fill();
    // wrinkles
    g.strokeStyle = 'rgba(40,8,0,.45)'; g.lineWidth = Math.max(0.8, s * 0.035); g.lineCap = 'round';
    g.beginPath(); g.moveTo(-rx * 0.4, -ry * 0.2); g.quadraticCurveTo(-rx * 0.1, ry * 0.05, -rx * 0.35, ry * 0.4); g.stroke();
    g.beginPath(); g.moveTo(rx * 0.35, -ry * 0.45); g.quadraticCurveTo(rx * 0.1, -ry * 0.15, rx * 0.3, ry * 0.15); g.stroke();
    g.beginPath(); g.moveTo(-rx * 0.05, ry * 0.5); g.quadraticCurveTo(rx * 0.25, ry * 0.6, rx * 0.4, ry * 0.4); g.stroke();
    // shine
    g.fillStyle = 'rgba(255,220,180,.55)'; g.beginPath(); g.ellipse(-rx * 0.45, -ry * 0.35, rx * 0.16, ry * 0.3, 0.2, 0, 6.283); g.fill();
    // cap where it hung on the palm
    g.fillStyle = '#e2b56a'; g.beginPath(); g.ellipse(0, -ry * 0.94, rx * 0.36, ry * 0.12, 0, 0, 6.283); g.fill();
    g.fillStyle = '#a77a3a'; g.beginPath(); g.ellipse(0, -ry * 0.98, rx * 0.16, ry * 0.06, 0, 0, 6.283); g.fill();
    g.restore();
  }
  function drawCup(g, s) {
    var w0 = s * 0.62, w1 = s * 0.46, top = -s * 0.7, bot = s * 0.7;
    g.fillStyle = 'rgba(20,40,80,.25)'; g.beginPath(); g.ellipse(s * 0.1, bot + s * 0.06, w1 * 1.1, s * 0.16, 0, 0, 6.283); g.fill();
    // water
    var wy = -s * 0.18;
    var gw = g.createLinearGradient(0, wy, 0, bot); gw.addColorStop(0, '#6fd3ff'); gw.addColorStop(1, '#1f7fd1');
    g.fillStyle = gw; g.beginPath();
    var wTop = w0 + (w1 - w0) * ((wy - top) / (bot - top));
    g.moveTo(-wTop, wy); g.lineTo(-w1, bot - s * 0.08); g.quadraticCurveTo(0, bot + s * 0.1, w1, bot - s * 0.08); g.lineTo(wTop, wy); g.closePath(); g.fill();
    g.fillStyle = '#b8ecff'; g.beginPath(); g.ellipse(0, wy, wTop, s * 0.1, 0, 0, 6.283); g.fill();
    // glass
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1, s * 0.07); g.lineJoin = 'round';
    g.fillStyle = 'rgba(220,245,255,.22)';
    g.beginPath(); g.moveTo(-w0, top); g.lineTo(-w1, bot - s * 0.08); g.quadraticCurveTo(0, bot + s * 0.1, w1, bot - s * 0.08); g.lineTo(w0, top); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, top, w0, s * 0.13, 0, 0, 6.283); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(-w0 * 0.7, top + s * 0.2); g.lineTo(-w1 * 0.65, bot - s * 0.2); g.lineTo(-w1 * 0.45, bot - s * 0.2); g.lineTo(-w0 * 0.5, top + s * 0.2); g.fill();
  }
  // Fanoos lantern: cap, glowing panels, finial. s = half width.
  function lanternShape(g, x, y, s, glass, big) {
    g.save(); g.translate(x, y);
    if (big) glow(g, 0, s * 0.2, s * 2.4, '#ffb347', 0.45);
    g.strokeStyle = '#7a4a12'; g.lineWidth = Math.max(1, s * 0.1);
    g.beginPath(); g.arc(0, -s * 1.75, s * 0.28, 0, 6.283); g.stroke();
    // cap
    var gold = g.createLinearGradient(-s, 0, s, 0); gold.addColorStop(0, '#a8661c'); gold.addColorStop(0.45, '#ffd978'); gold.addColorStop(1, '#b8741f');
    g.fillStyle = gold;
    g.beginPath(); g.moveTo(-s * 0.85, -s * 0.85); g.quadraticCurveTo(0, -s * 2.0, s * 0.85, -s * 0.85); g.closePath(); g.fill();
    // body panels
    g.beginPath(); g.moveTo(-s * 0.85, -s * 0.85); g.lineTo(-s, s * 0.2); g.lineTo(-s * 0.55, s * 1.05); g.lineTo(s * 0.55, s * 1.05); g.lineTo(s, s * 0.2); g.lineTo(s * 0.85, -s * 0.85); g.closePath();
    var gl = g.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.2); gl.addColorStop(0, '#fff6c8'); gl.addColorStop(0.5, glass); gl.addColorStop(1, shade(glass, -0.35));
    g.fillStyle = gl; g.fill();
    g.strokeStyle = '#8a5414'; g.lineWidth = Math.max(1, s * 0.12); g.stroke();
    g.beginPath(); g.moveTo(0, -s * 0.85); g.lineTo(0, s * 1.05); g.moveTo(-s, s * 0.2); g.lineTo(s, s * 0.2); g.stroke();
    // base and finial
    g.fillStyle = gold; g.beginPath(); rr(g, -s * 0.62, s * 1.0, s * 1.24, s * 0.28, s * 0.1); g.fill();
    g.beginPath(); g.moveTo(-s * 0.2, s * 1.28); g.lineTo(s * 0.2, s * 1.28); g.lineTo(0, s * 1.65); g.closePath(); g.fill();
    g.restore();
  }

  // ---------- the world sprites: one atlas, 1 texel per world unit ----------
  A.sprites = function (scene) {
    var C = K.C, r = C * 0.35, list = [];
    list.push({ n: 'kid-idle', w: 100, h: 100, paint: function (g) { g.translate(50, 50); paintKid(g, r, 0, true); } });
    for (var i = 0; i < 8; i++) (function (i) { list.push({ n: 'kid' + i, w: 100, h: 100, paint: function (g) { g.translate(50, 50); paintKid(g, r, i * Math.PI / 4, false); } }); })(i);
    list.push({ n: 'kid-sh', w: 100, h: 80, paint: function (g) { g.fillStyle = 'rgba(30,15,5,.28)'; g.beginPath(); g.ellipse(50 + r * 0.18, 40 + r * 0.3, r * 0.95, r * 0.75, 0, 0, 6.283); g.fill(); } });
    ['date', 'cup', 'lantern'].forEach(function (t) {
      var sz = A.itemSize[t], fw = Math.ceil(sz * 1.5);
      list.push({ n: t, w: fw, h: fw, paint: function (g) { g.translate(fw / 2, fw / 2); paintItem(g, t, sz); } });
    });
    list.push({ n: 'item-sh', w: 60, h: 24, paint: function (g) { g.fillStyle = 'rgba(40,20,5,.22)'; g.beginPath(); g.ellipse(30, 12, 23, 8, 0, 0, 6.283); g.fill(); } });
    list.push({ n: 'ring-ok', w: 90, h: 56, paint: function (g) { g.strokeStyle = '#fff6c2'; g.lineWidth = 6; g.beginPath(); g.ellipse(45, 28, 36, 21, 0, 0, 6.283); g.stroke(); } });
    list.push({ n: 'ring-no', w: 90, h: 56, paint: function (g) { g.strokeStyle = '#ff8a8a'; g.lineWidth = 6; g.beginPath(); g.ellipse(45, 28, 36, 21, 0, 0, 6.283); g.stroke(); } });
    list.push({ n: 'glint', w: 30, h: 30, paint: function (g) { g.fillStyle = '#fff'; star8(g, 15, 15, 13, 0.3, 0); g.fill(); } });
    list.push({ n: 'plate', w: 86, h: 40, paint: function (g) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(43, 20, 40, 17, 0, 0, 6.283); g.fill(); g.strokeStyle = '#3f86c8'; g.lineWidth = 3; g.beginPath(); g.ellipse(43, 20, 30, 12, 0, 0, 6.283); g.stroke(); } });
    return A.pack(scene, 'mzs', list, K.DEN);
  };

  // ---------- the house at the exit: base, door slab, lit windows, hanging lantern (3/4 view facade) ----------
  // Painted with x = the middle and base = the ground line, in world units; the house frame is 260 x 230 with base at y 200.
  var HOUSE = { w: 260, h: 230, x: 130, base: 200 };
  function paintHouse(g, wi) {
    var C = K.C, P = A.WORLDS[wi].house, x = HOUSE.x, base = HOUSE.base, w = C * 0.98, h = C * 0.72, top = base - h, roofH = C * 0.2;
    g.fillStyle = 'rgba(40,20,5,.35)'; g.beginPath(); g.ellipse(x + C * 0.08, base + C * 0.02, w * 0.58, C * 0.1, 0, 0, 6.283); g.fill();
    // little dome behind the roof
    var dg = g.createRadialGradient(x - C * 0.08, top - roofH - C * 0.12, C * 0.02, x, top - roofH, C * 0.24);
    dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, wi === 1 ? '#7fb8d8' : P.roof);
    g.fillStyle = dg; g.beginPath(); g.arc(x + w * 0.22, top - roofH * 0.6, C * 0.16, Math.PI, 0); g.fill();
    g.fillStyle = '#d8a43a'; g.fillRect(x + w * 0.22 - C * 0.01, top - roofH * 0.6 - C * 0.24, C * 0.02, C * 0.09);
    // roof top (seen from slightly above) and parapet
    g.fillStyle = P.roof; g.beginPath(); rr(g, x - w / 2 - C * 0.03, top - roofH, w + C * 0.06, roofH + C * 0.04, C * 0.04); g.fill();
    g.fillStyle = shade(P.roof, -0.15); g.fillRect(x - w / 2 - C * 0.03, top - C * 0.02, w + C * 0.06, C * 0.05);
    // facade
    var gw = g.createLinearGradient(0, top, 0, base); gw.addColorStop(0, shade(P.wall, 0.15)); gw.addColorStop(1, shade(P.wall, -0.12));
    g.fillStyle = gw; g.fillRect(x - w / 2, top, w, h);
    g.fillStyle = P.trim; g.fillRect(x - w / 2, top, w, C * 0.035);
    // windows
    [-1, 1].forEach(function (sd) {
      var wx = x + sd * w * 0.32, wy = top + h * 0.28, ww = C * 0.13, wh = C * 0.2;
      g.fillStyle = P.trim; g.beginPath(); g.moveTo(wx - ww / 2 - 2, wy + wh + 2); g.lineTo(wx - ww / 2 - 2, wy); g.arc(wx, wy, ww / 2 + 2, Math.PI, 0); g.lineTo(wx + ww / 2 + 2, wy + wh + 2); g.fill();
      g.fillStyle = mix('#3a2a4a', '#ffd36b', 0.55); g.beginPath(); g.moveTo(wx - ww / 2, wy + wh); g.lineTo(wx - ww / 2, wy); g.arc(wx, wy, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wy + wh); g.fill();
      g.strokeStyle = rgba(P.trim, 0.8); g.lineWidth = Math.max(1, C * 0.012); g.beginPath(); g.moveTo(wx, wy - ww / 2); g.lineTo(wx, wy + wh); g.stroke();
    });
    // arched doorway onto warm light (the door slab is its own picture, so it can swing open)
    var dw = C * 0.26, dh = C * 0.42, dx = x - dw / 2, dy = base - dh;
    g.fillStyle = P.trim; g.beginPath(); g.moveTo(dx - 3, base); g.lineTo(dx - 3, dy + dw / 2); g.arc(x, dy + dw / 2, dw / 2 + 3, Math.PI, 0); g.lineTo(dx + dw + 3, base); g.fill();
    g.fillStyle = '#ffd98a'; g.beginPath(); g.moveTo(dx, base); g.lineTo(dx, dy + dw / 2); g.arc(x, dy + dw / 2, dw / 2, Math.PI, 0); g.lineTo(dx + dw, base); g.fill();
    g.fillStyle = shade(P.roof, -0.2); g.fillRect(dx - C * 0.05, base - C * 0.015, dw + C * 0.1, C * 0.04);
    // palm for the garden world, a potted plant otherwise
    if (wi === 0) { g.save(); g.translate(x - w * 0.55, top - roofH * 0.2); g.rotate(-0.2); fronds(g, C * 0.28, 1); g.restore(); }
    else { g.fillStyle = '#b5532c'; g.beginPath(); rr(g, x - w * 0.46, base - C * 0.1, C * 0.1, C * 0.1, 2); g.fill();
      g.fillStyle = '#3e8a3a'; g.beginPath(); g.arc(x - w * 0.41, base - C * 0.13, C * 0.07, 0, 6.283); g.fill(); }
  }
  A.house = function (scene, wi) {
    var key = 'mzh' + wi, C = K.C, P = A.WORLDS[wi].house, dw = C * 0.26, dh = C * 0.42;
    A.pack(scene, key, [
      { n: 'base', w: HOUSE.w, h: HOUSE.h, paint: function (g) { paintHouse(g, wi); } },
      { n: 'door', w: Math.ceil(dw), h: Math.ceil(dh), paint: function (g) {
        g.fillStyle = P.door; g.beginPath(); g.moveTo(0, dh); g.lineTo(0, dw / 2); g.arc(dw / 2, dw / 2, dw / 2, Math.PI, 0); g.lineTo(dw, dh); g.closePath(); g.fill();
        g.fillStyle = '#f6c453'; g.beginPath(); g.arc(dw * 0.78, dh * 0.6, C * 0.018, 0, 6.283); g.fill(); } },
      { n: 'lit', w: HOUSE.w, h: HOUSE.h, paint: function (g) {
        var w = C * 0.98, h = C * 0.72, top = HOUSE.base - h;
        [-1, 1].forEach(function (sd) {
          var wx = HOUSE.x + sd * w * 0.32, wy = top + h * 0.28, ww = C * 0.13, wh = C * 0.2;
          glow(g, wx, wy + wh * 0.4, C * 0.3, '#ffcf6b', 0.55);
          g.fillStyle = '#ffd36b'; g.beginPath(); g.moveTo(wx - ww / 2, wy + wh); g.lineTo(wx - ww / 2, wy); g.arc(wx, wy, ww / 2, Math.PI, 0); g.lineTo(wx + ww / 2, wy + wh); g.fill();
        });
        glow(g, HOUSE.x, HOUSE.base - C * 0.2, C * 0.45, '#ffcf6b', 0.4); } },
      { n: 'lamp', w: 40, h: 56, paint: function (g) {
        g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(20, 0); g.lineTo(20, 14); g.stroke();
        glow(g, 20, 22, C * 0.16, '#ffb347', 0.5); lanternShape(g, 20, 22, C * 0.035, '#ff9e45'); } }
    ], K.DEN);
    return key;
  };
  A.HOUSE = HOUSE;

  // ---------- the interface: one atlas at 1 texel per design unit (1920 x 1080 space of Kit.play.fit) ----------
  A.ui = function (scene) {
    var INK = '#fff7e6', list = [];
    function add(n, w, h, paint) { list.push({ n: n, w: w, h: h, paint: paint }); }
    function icon(n, draw) { add(n, 96, 96, function (c) { c.strokeStyle = INK; c.fillStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }); }
    add('px', 64, 64, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); });
    add('plate', 150, 150, function (c) { c.fillStyle = 'rgba(13,11,36,.74)'; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 4; c.stroke(); });
    icon('ic-exit', function (c) { Kit.play.exitIcon(c, 24, INK, 2.4); });
    icon('ic-back', function (c) { c.beginPath(); c.moveTo(14.5, 5.5); c.lineTo(8, 12); c.lineTo(14.5, 18.5); c.stroke(); });
    icon('ic-retry', function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); });
    icon('ic-grid', function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); });
    icon('ic-snd', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); });
    icon('ic-mute', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); });
    icon('ic-pause', function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); });
    icon('ic-play', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); });
    icon('ic-next', function (c) { c.beginPath(); c.moveTo(5, 5); c.lineTo(14, 12); c.lineTo(5, 19); c.closePath(); c.fill(); c.beginPath(); c.moveTo(16, 5); c.lineTo(16, 19); c.stroke(); });
    icon('ic-lock', function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); });
    add('ic-star', 64, 64, function (c) { c.fillStyle = '#f6c453'; c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? 13 : 29; c.lineTo(32 + Math.cos(a) * q, 34 + Math.sin(a) * q); } c.closePath(); c.fill(); c.lineJoin = 'round'; c.strokeStyle = '#c98a1b'; c.lineWidth = 3; c.stroke(); });
    add('ic-star0', 64, 64, function (c) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? 13 : 29; c.lineTo(32 + Math.cos(a) * q, 34 + Math.sin(a) * q); } c.closePath(); c.stroke(); });
    add('pill', 340, 150, function (c) { c.fillStyle = 'rgba(13,11,36,.74)'; c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 4; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); c.stroke(); });
    // touch controls: see-through rings with a white edge and soft shadow, readable on every world (game-ui-ux: 3:1)
    add('joy', 300, 300, function (c) {
      c.fillStyle = 'rgba(13,11,36,.2)'; c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 5; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 6; c.beginPath(); c.arc(150, 150, 145, 0, 7); c.fill(); c.stroke();
      c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.92)'; [[150, 34, 0], [266, 150, 1], [150, 266, 2], [34, 150, 3]].forEach(function (p) { c.save(); c.translate(p[0], p[1]); c.rotate(p[2] * Math.PI / 2); c.beginPath(); c.moveTo(-14, 8); c.lineTo(0, -8); c.lineTo(14, 8); c.closePath(); c.fill(); c.restore(); });
    });
    add('knob', 132, 132, function (c) { c.fillStyle = 'rgba(255,247,230,.88)'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 6; c.beginPath(); c.arc(66, 66, 56, 0, 7); c.fill(); });
    add('ring', 160, 160, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(80, 80, 72, 0, 7); c.stroke(); });
    add('card', 1500, 1040, function (c) { c.fillStyle = 'rgba(16,13,44,.95)'; c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 4; c.beginPath(); c.roundRect(2, 2, 1496, 1036, 60); c.fill(); c.stroke(); });
    add('lv', 140, 140, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.fill(); });
    add('lvo', 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.stroke(); });
    add('big', 280, 280, function (c) { c.fillStyle = '#f6c453'; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); });
    add('btn', 420, 150, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(3, 3, 414, 144, 72); c.fill(); });
    add('glow', 256, 256, function (c) { var g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    add('hole', 256, 256, function (c) { var g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    add('spark', 48, 48, function (c) { c.fillStyle = '#fff'; star8(c, 24, 24, 22, 0.42, 0); c.fill(); });
    add('dot', 24, 24, function (c) { var g = c.createRadialGradient(12, 12, 0, 12, 12, 12); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 24, 24); });
    add('house-pin', 64, 64, function (c) {  // a little house badge for the screen edge when the real one is off screen
      c.translate(32, 36); c.fillStyle = '#fff1d6'; c.fillRect(-14, -4, 28, 18); c.beginPath(); c.moveTo(-18, -3); c.lineTo(0, -19); c.lineTo(18, -3); c.closePath(); c.fill();
      c.fillStyle = '#ffcf6b'; c.beginPath(); c.moveTo(-5, 14); c.lineTo(-5, 3); c.arc(0, 3, 5, Math.PI, 0); c.lineTo(5, 14); c.fill(); });
    add('arrow', 40, 40, function (c) { c.fillStyle = '#f6c453'; c.beginPath(); c.moveTo(36, 20); c.lineTo(8, 4); c.lineTo(8, 36); c.closePath(); c.fill(); });
    A.pack(scene, 'ui', list, 1);
  };

  // ---------- the iftar room (painted once when first shown, then let go) ----------
  // A warm room at sunset: arched window with the crescent, a low table with dates and water, our kid (seen from behind) sitting
  // down to break the fast. The gradient wall, its faint star pattern and the swaying lanterns are separate (iftar.js).
  A.iftarRoom = function (scene) {
    var w = 1920, h = 1080;
    Kit.play.tex(scene, 'iftar-room', w, h, function (ctx) {
    var s = Math.min(w, h), cx = w / 2;
    var aw = Math.min(w * 0.5, s * 0.62), ah = h * 0.5, ax = cx - aw / 2, ay = h * 0.1;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(ax, ay + ah); ctx.lineTo(ax, ay + aw / 2); ctx.arc(cx, ay + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(ax + aw, ay + ah); ctx.closePath();
    var sky = ctx.createLinearGradient(0, ay, 0, ay + ah); sky.addColorStop(0, '#1b2a6b'); sky.addColorStop(0.6, '#c2607a'); sky.addColorStop(1, '#f3a56c');
    ctx.fillStyle = sky; ctx.fill(); ctx.clip();
    for (var i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(i * 2.1)) + ')'; ctx.beginPath(); ctx.arc(ax + ((i * 37) % 100) / 100 * aw, ay + ((i * 53) % 60) / 100 * ah, 1.6, 0, 6.283); ctx.fill(); }
    var mx = cx + aw * 0.18, my = ay + aw * 0.42, mr = aw * 0.12;
    glow(ctx, mx, my, mr * 3, '#fff2c8', 0.35);
    var mc = canvas(mr * 3, mr * 3), mg = mc.getContext('2d');
    mg.fillStyle = '#fff4d6'; mg.beginPath(); mg.arc(mr * 1.5, mr * 1.5, mr, 0, 6.283); mg.fill();
    mg.globalCompositeOperation = 'destination-out'; mg.beginPath(); mg.arc(mr * 1.5 + mr * 0.45, mr * 1.5 - mr * 0.2, mr * 0.88, 0, 6.283); mg.fill();
    ctx.drawImage(mc, mx - mr * 1.5, my - mr * 1.5);
    // distant rooftops and a minaret silhouette
    ctx.fillStyle = '#3a2350';
    ctx.fillRect(ax, ay + ah * 0.82, aw, ah * 0.2);
    ctx.beginPath(); ctx.arc(ax + aw * 0.3, ay + ah * 0.84, aw * 0.12, Math.PI, 0); ctx.fill();
    ctx.fillRect(ax + aw * 0.68, ay + ah * 0.55, aw * 0.05, ah * 0.3);
    ctx.beginPath(); ctx.arc(ax + aw * 0.705, ay + ah * 0.55, aw * 0.035, Math.PI, 0); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#d8a43a'; ctx.lineWidth = Math.max(3, s * 0.012);
    ctx.beginPath(); ctx.moveTo(ax, ay + ah); ctx.lineTo(ax, ay + aw / 2); ctx.arc(cx, ay + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(ax + aw, ay + ah); ctx.stroke();
    // rug
    var tw = Math.min(w * 0.4, s * 0.5), th = tw * 0.19, ty = h * 0.74;
    ctx.fillStyle = '#7a1f2b'; ctx.beginPath(); ctx.ellipse(cx, ty + th, tw * 1.45, th * 2.8, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#f6c453'; ctx.lineWidth = Math.max(2, tw * 0.012); ctx.beginPath(); ctx.ellipse(cx, ty + th, tw * 1.3, th * 2.35, 0, 0, 6.283); ctx.stroke();
    // low round table (sofra) with cloth
    ctx.fillStyle = '#5a2e14'; ctx.fillRect(cx - tw * 0.8, ty, tw * 0.1, th * 1.6); ctx.fillRect(cx + tw * 0.7, ty, tw * 0.1, th * 1.6);
    ctx.fillStyle = '#e9d9b8'; ctx.beginPath(); ctx.ellipse(cx, ty, tw, th, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#d8c39a'; ctx.beginPath(); ctx.ellipse(cx, ty + th * 0.25, tw, th, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#2f9e8f'; ctx.lineWidth = Math.max(1.5, tw * 0.008); ctx.beginPath(); ctx.ellipse(cx, ty, tw * 0.9, th * 0.8, 0, 0, 6.283); ctx.stroke();
    // plate of dates
    var pr = tw * 0.32;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx - tw * 0.32, ty - th * 0.2, pr, pr * 0.32, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#3f86c8'; ctx.lineWidth = Math.max(1.5, tw * 0.008); ctx.beginPath(); ctx.ellipse(cx - tw * 0.32, ty - th * 0.2, pr * 0.8, pr * 0.24, 0, 0, 6.283); ctx.stroke();
    for (var dI = 0; dI < 6; dI++) drawDate(ctx, cx - tw * 0.32 + (dI - 2.5) * pr * 0.28, ty - th * 0.35 - (dI % 2) * th * 0.25, pr * 0.32, 1.2 + (dI % 3) * 0.3);
    // water jug and cups
    var jx = cx + tw * 0.12, jy = ty - th * 0.3, js = tw * 0.1;
    ctx.fillStyle = '#c8873e'; ctx.beginPath(); ctx.ellipse(jx, jy - js * 0.3, js * 0.35, js * 0.45, 0, 0, 6.283); ctx.fill();
    ctx.fillRect(jx - js * 0.12, jy - js, js * 0.24, js * 0.5);
    ctx.strokeStyle = '#a86a2a'; ctx.lineWidth = Math.max(2, js * 0.08); ctx.beginPath(); ctx.arc(jx + js * 0.35, jy - js * 0.4, js * 0.2, -1.4, 1.4); ctx.stroke();
    ctx.save(); ctx.translate(cx + tw * 0.38, ty - th * 0.45); drawCup(ctx, js * 0.36); ctx.restore();
    ctx.save(); ctx.translate(cx + tw * 0.6, ty - th * 0.1); drawCup(ctx, js * 0.36); ctx.restore();
    // our kid, seen from behind: blue cap, hair, shoulders, and the backpack set down beside
    var kr = tw * 0.15, kx = cx, ky = ty + th * 1.2 + kr * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(kx, ky + kr * 1.2, kr * 1.5, kr * 0.35, 0, 0, 6.283); ctx.fill();
    var gb = ctx.createLinearGradient(0, ky - kr * 0.3, 0, ky + kr * 1.3); gb.addColorStop(0, '#4fd1bd'); gb.addColorStop(1, '#1f7f73');
    ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(kx - kr * 1.2, ky + kr * 1.25); ctx.quadraticCurveTo(kx - kr * 1.2, ky - kr * 0.2, kx, ky - kr * 0.25); ctx.quadraticCurveTo(kx + kr * 1.2, ky - kr * 0.2, kx + kr * 1.2, ky + kr * 1.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c68a5e'; ctx.beginPath(); ctx.ellipse(kx - kr * 0.7, ky - kr * 0.62, kr * 0.1, kr * 0.16, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(kx + kr * 0.7, ky - kr * 0.62, kr * 0.1, kr * 0.16, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(kx, ky - kr * 0.75, kr * 0.7, 0, 6.283); ctx.fill();
    var cg = ctx.createLinearGradient(kx - kr * 0.6, 0, kx + kr * 0.6, 0); cg.addColorStop(0, '#6a8fe6'); cg.addColorStop(1, '#2c4a9e');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(kx, ky - kr * 0.92, kr * 0.62, Math.PI * 1.02, -0.02); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8b84a'; ctx.lineWidth = Math.max(1.5, kr * 0.08); ctx.beginPath(); ctx.moveTo(kx - kr * 0.6, ky - kr * 0.96); ctx.lineTo(kx + kr * 0.6, ky - kr * 0.96); ctx.stroke();
    ctx.fillStyle = '#f2a93b'; ctx.beginPath(); rr(ctx, kx + kr * 1.6, ky + kr * 0.2, kr * 0.9, kr * 1.05, kr * 0.2); ctx.fill();
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); rr(ctx, kx + kr * 1.75, ky + kr * 0.6, kr * 0.6, kr * 0.25, kr * 0.08); ctx.fill();
    });
    // the wall behind it: a tall gradient (stretched across), and one tile of the faint 8-point star pattern
    Kit.play.tex(scene, 'iftar-wall', 8, 1900, function (gg) {
      var bgr = gg.createLinearGradient(0, 0, 0, 1900); bgr.addColorStop(0, '#2b1b55'); bgr.addColorStop(0.5, '#6b2f5e'); bgr.addColorStop(1, '#3a1d2e'); gg.fillStyle = bgr; gg.fillRect(0, 0, 8, 1900); });
    Kit.play.tex(scene, 'iftar-pat', 256, 256, function (pg) { pg.fillStyle = 'rgba(255,220,160,.06)'; star8(pg, 64, 64, 36, 0.6); pg.fill(); star8(pg, 192, 192, 36, 0.6); pg.fill(); });
    for (var l = 0; l < 5; l++) for (var r = 0; r < 2; r++) A.hanging(scene, l, ROPES[r]);
  };
  var ROPES = [120, 200], HANG = ['#ff7a59', '#ffd36b', '#7ae0c3', '#ff9fd0', '#8ec5ff'];

  // a lantern for the iftar room's ceiling on its rope (origin at the top of the rope; a tween swings it): colour l, rope r (0 short, 1 long)
  A.hanging = function (scene, l, rope) {
    return Kit.play.tex(scene, 'iftar-lan' + l + '-' + rope, 180, rope + 140, function (g) {
      g.strokeStyle = 'rgba(255,220,160,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(90, 0); g.lineTo(90, rope); g.stroke();
      glow(g, 90, rope + 50, 80, '#ffb347', 0.5); lanternShape(g, 90, rope + 52, 30, HANG[l]);
    });
  };
  A.ROPES = ROPES;
  A.paintKid = paintKid; A.drawDate = drawDate;
})();
