/* Mosaic Breaker: the paint box (window.BrArt). The game's look is the old game's, kept and tidied: layered world
   backdrops (a night desert, a rose garden at dawn, a palace on a sea), glazed zellige tiles with an eight-point star,
   the flying carpet, a glowing star for the ball, lantern power-ups and palace pillars. No faces, nothing sacred.
   Everything is painted ONCE into the engine's canvas textures (Kit.play.tex, docs/phaser-standard.md section 3) and
   shown as images, so nothing is painted per frame:
   - 'sprites'  one atlas: the ball, lanterns, glows, particles, the carpet (cut into strips that ripple), interface plates,
     icons and the 9-slice card (frames by name);
   - 'tiles<w>' the tiles of one world (19 pictures, painted at 2x: the tiles are the biggest pictures on screen);
   - 'bg<w>a' 'bg<w>b' 'bg<w>c' the backdrop of a world in three depth layers (sky and far hills, middle, near), painted at
     0.4 size (soft scenery, shown at 2.5x) and slid a little with the carpet (play.js, A.BG.slide); the middle and near
     ones start lower down, so they are short pictures;
   - 'pillar<w>' (a strip) and 'frieze<w>' (four tiles) that images repeat: no TileSprite, because each one breaks the batch
     (a TileSprite is its own draw call; the whole field is one draw call now).
   A world's pictures are painted when the world is first needed and let go when the next world starts.
   Design space is 1920 x 1080 (Kit.play.fit); backdrops reach x -380..2300 and y -260..1340. */
(function () {
  'use strict';
  var A = window.BrArt = {};
  var W = 1920, H = 1080;

  // ---------- the field, in design units (one place: play.js and hud.js read these) ----------
  // The field is 1000 wide inside two 36-wide pillars, centred, in both orientations (11 columns of 91). Its height follows
  // the screen: on a phone on its side it is the design height (ceiling 116, carpet 940); upright, A.fitView stretches it
  // down the whole tall screen (below the interface rows, above the thumb).
  var L = A.L = { W: W, H: H, COLS: 11, WALL: 36, FL: 424, FR: 1496, BH: 46, ROW: 52, CARPET_H: 36, BALL_R: 28,
    CEIL: 116, TOP: 186, CARPET_Y: 940, SPD: 0.8, dy: 0, port: false };
  L.IN_L = L.FL + L.WALL; L.IN_R = L.FR - L.WALL; L.CELL = (L.IN_R - L.IN_L) / L.COLS; L.BW = Math.floor(L.CELL - 6);
  // How the screen is fitted (called by both scenes in the layout callback of Kit.play.fit, after the kit set its zoom):
  // upright (taller than wide): zoom onto the field (1100 units across) and give the field the whole height; on its side:
  // the field plus a narrow margin each side for the interface (1350 across, so a 4:3 tablet sees the field as wide as the old
  // game showed it; 16:9 and wider are limited by height).
  // Recomputes the view's edges, and v.u (at most 1): interface sizes times v.u look as big as in the plain fit, whatever the zoom.
  A.fitView = function (scene, v) {
    var gw = scene.scale.width, gh = scene.scale.height, port = gh > gw, z = Math.min(gw / (port ? 1100 : 1350), gh / H);
    if (Math.abs(z - v.z) > 1e-6) {
      var r = v.z / z, il = (v.sl - v.l) * r, ir = (v.r - v.sr) * r, it = (v.st - v.t) * r, ib = (v.b - v.sb) * r, cam = scene.cameras.main;
      cam.setZoom(z); cam.centerOn(W / 2, H / 2);
      v.z = z; v.w = gw / z; v.h = gh / z; v.l = W / 2 - v.w / 2; v.r = W / 2 + v.w / 2; v.t = H / 2 - v.h / 2; v.b = H / 2 + v.h / 2;
      v.sl = v.l + il; v.sr = v.r - ir; v.st = v.t + it; v.sb = v.b - ib;
    }
    // Breakout's own interface size: in screen points, like the old game (its buttons were 46 points on every screen), so the
    // pause button (150 units) is 48 points whatever the zoom: easy to touch on a phone, never huge on a tablet or a computer
    v.u = 48 * Kit.play.dpr() / (150 * z);
    v.port = port; L.port = port;
    if (port) {
      // the old game's distances from the screen's edges, in screen points: the frieze ends about 90 points down (the
      // interface row sits on the ceiling band above it), the carpet rides about 65 points above the bottom
      var pt = Kit.play.dpr() / z;
      L.CEIL = Math.round(v.st + 63 * pt); L.CARPET_Y = Math.round(v.sb - 66 * pt);
      L.TOP = Math.round(L.CEIL + 70 + Math.max(0, (L.CARPET_Y - L.CEIL - 1400) * 0.3));   // a tall field starts its bricks lower (the old game's 0.3 of the extra height)
      L.SPD = Math.min(1.25, Math.max(1, (L.CARPET_Y - L.CEIL) / 1500));
    } else {
      // on its side: the design height; a screen taller than 16:9 (a 4:3 tablet) stretches the field to its whole height, so
      // no empty band is left above the ceiling or below the carpet
      L.CEIL = Math.round(v.t + 84); L.CARPET_Y = Math.round(Math.max(940, v.b - 140)); L.TOP = L.CEIL + 70;   // (the frieze at the top edge, as the old game)
      L.SPD = 0.8 * Math.max(1, Math.min(1.25, (L.CARPET_Y - L.CEIL) / 824));
    }
    L.dy = L.CARPET_Y - 940;
    return v;
  };

  // ---------- helpers ----------
  function rng(seed) {                                           // mulberry32: the same scene every time for a world
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
  A.shade = shade; A.mix = mix; A.hex = function (c) { var h = hex(c); return (h[0] << 16) | (h[1] << 8) | h[2]; };

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
  // the lanterns that fall: colour and what they do
  A.PU = { wide: { c: '#ff9f43', t: 'Big Carpet!' }, multi: { c: '#4dd4ff', t: 'Triple Star!' }, slow: { c: '#a78bfa', t: 'Slow Motion' }, life: { c: '#ff5d73', t: '+1 Heart' } };

  // ---------- backdrops ----------
  var T = 0.4, X0 = -2200, X1 = 4120, Y0 = -120, Y1 = 1180, BOT = 1080;
  // the three layers (back, middle, near): where each picture starts (design y, per world) and how far it slides with the carpet
  A.BG = { x: X0, x1: X1, y: Y0, y1: Y1, scale: 1 / T, tops: [[Y0, 340, 340], [Y0, 80, 400], [Y0, Y0, 640]], slide: [14, 35, 57] };
  // Four layers of a world, each its own texture so they can drift a little with the carpet (depth). Painted once.
  // S: one unit of the old page's pixel sizes is 2.2 design units here (the old page was drawn for a ~800 px screen).
  A.world = function (scene, wi) {
    var W_ = A.WORLDS[wi], S = 2.2, horizon = BOT * (wi === 2 ? 0.6 : 0.66), WD = X1 - X0, NK = WD / 2520;   // NK: counts scale with the width (it was 2520)
    var key = 'bg' + wi;                                              // (tex() paints nothing for a picture already there: baked ones are loaded)
    var tops = A.BG.tops[wi];
    var R = rng(1000 + wi * 77);
    var layers = [];
    function layer(k, fn) { layers.push(fn); }
    var fx = function (f) { return f * W; };                                   // a place across the design width

    function dunes(c, base, amp, color, seed) {
      var r = rng(seed); c.fillStyle = color; c.beginPath(); c.moveTo(X0, Y1);
      var ph = r() * 6, f1 = 0.002 + r() * 0.002, f2 = 0.005 + r() * 0.004;
      for (var x = X0; x <= X1; x += 12) c.lineTo(x, base - Math.sin(x / S * f1 + ph) * amp - Math.sin(x / S * f2 + ph * 2) * amp * 0.35);
      c.lineTo(X1, Y1); c.closePath(); c.fill();
    }
    function onionDome(c, cx, base, r) {
      c.moveTo(cx - r, base);
      c.bezierCurveTo(cx - r * 1.25, base - r * 0.9, cx - r * 0.2, base - r * 1.3, cx, base - r * 1.75);
      c.bezierCurveTo(cx + r * 0.2, base - r * 1.3, cx + r * 1.25, base - r * 0.9, cx + r, base);
      c.closePath();
    }
    function minaret(c, cx, base, w2, h2) {
      c.rect(cx - w2 / 2, base - h2, w2, h2);
      c.rect(cx - w2 * 0.8, base - h2 * 0.72, w2 * 1.6, w2 * 0.35);
      onionDome(c, cx, base - h2, w2 * 0.62);
      c.rect(cx - 0.8 * S, base - h2 - w2 * 1.6, 1.6 * S, w2 * 0.6);
    }
    function city(c, base, scale, color, lights, seed) {
      var r = rng(seed), x = X0 - 40 * S; c.fillStyle = color; var wins = [];
      while (x < X1 + 40 * S) {
        var kind = r(), bw = (40 + r() * 70) * S * scale, bh = (30 + r() * 60) * S * scale;
        c.beginPath();
        if (kind < 0.18) { minaret(c, x + 10 * S * scale, base, 12 * S * scale, (120 + r() * 70) * S * scale); x += 26 * S * scale; c.fill(); continue; }
        c.rect(x, base - bh, bw, bh);
        if (kind < 0.6) { var dr = Math.min(bw * 0.38, 34 * S * scale); c.rect(x + bw / 2 - dr, base - bh - 6 * S * scale, dr * 2, 8 * S * scale); onionDome(c, x + bw / 2, base - bh - 4 * S * scale, dr); }
        else if (kind < 0.8) { c.moveTo(x, base - bh); c.arc(x + bw / 2, base - bh, bw / 2, Math.PI, 0); }
        c.fill();
        var nw = Math.max(1, Math.floor(bw / (16 * S * scale)));
        for (var i = 0; i < nw; i++) if (r() < 0.75) wins.push([x + (i + 0.5) * bw / nw, base - bh * (0.35 + r() * 0.35), 3.2 * S * scale]);
        x += bw + (r() < 0.3 ? r() * 30 * S * scale : 0);
      }
      if (lights) wins.forEach(function (wv) {
        c.fillStyle = r() < 0.7 ? lights : 'rgba(0,0,0,.35)';
        c.beginPath(); c.rect(wv[0] - wv[2], wv[1], wv[2] * 2, wv[2] * 2.4); c.arc(wv[0], wv[1], wv[2], Math.PI, 0); c.fill();
      });
    }
    function palm(c, x, base, hgt, color) {
      c.strokeStyle = color; c.fillStyle = color; c.lineCap = 'round';
      c.lineWidth = hgt * 0.06; c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + hgt * 0.15, base - hgt * 0.5, x + hgt * 0.05, base - hgt); c.stroke();
      var tx = x + hgt * 0.05, ty = base - hgt;
      for (var i = 0; i < 7; i++) {
        var a = -Math.PI / 2 + (i - 3) * 0.48, Ln = hgt * (0.42 + (i % 2) * 0.1);
        c.beginPath(); c.moveTo(tx, ty);
        c.quadraticCurveTo(tx + Math.cos(a) * Ln * 0.6, ty + Math.sin(a) * Ln * 0.6 - hgt * 0.08, tx + Math.cos(a) * Ln, ty + Math.sin(a) * Ln + hgt * 0.18);
        c.quadraticCurveTo(tx + Math.cos(a) * Ln * 0.5, ty + Math.sin(a) * Ln * 0.5, tx, ty); c.fill();
      }
    }
    function cypress(c, x, base, hgt, color) { c.fillStyle = color; c.beginPath(); c.ellipse(x, base - hgt * 0.5, hgt * 0.12, hgt * 0.52, 0, 0, 6.283); c.fill(); }
    function arcade(c, base, color, seed) {
      var r = rng(seed), aw = 70 * S, colW = 10 * S, top = base - 150 * S;
      c.fillStyle = color; c.beginPath(); c.rect(X0, top - 22 * S, WD, 26 * S); c.fill();
      for (var x = X0; x < X1; x += aw) {
        c.fillStyle = color; c.fillRect(x, top, colW, base - top);
        c.beginPath(); c.moveTo(x + colW, top); c.lineTo(x + aw, top); c.lineTo(x + aw, top + 24 * S);
        c.arc(x + colW + (aw - colW) / 2, top + 30 * S, (aw - colW) / 2, 0, Math.PI, true); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,230,200,.18)'; star8(c, x + aw / 2 + colW / 2, top - 9 * S, 6 * S); c.fill();
      }
      var tx = fx(0.25 + r() * 0.5); c.fillStyle = color; c.beginPath();
      c.rect(tx - 26 * S, top - 150 * S, 52 * S, 150 * S); onionDome(c, tx, top - 150 * S, 30 * S); c.fill();
    }
    function islands(c, base, color, seed) {
      var r = rng(seed); c.fillStyle = color;
      for (var i = 0; i < 4; i++) {
        var cx = fx(0.1 + i * 0.27 + r() * 0.1), iw = (120 + r() * 160) * S;
        c.beginPath(); c.ellipse(cx, base, iw / 2, 18 * S, 0, Math.PI, 0); c.fill();
        c.beginPath(); for (var k = 0; k < 4; k++) { var bx = cx + (k - 1.5) * iw * 0.18, bh = (16 + r() * 30) * S; c.rect(bx - 10 * S, base - 12 * S - bh, 20 * S, bh); if (r() < 0.6) onionDome(c, bx, base - 12 * S - bh, 10 * S); }
        c.fill();
      }
    }
    function palace(c, base, color, lights) {
      var cx = fx(0.64), s2 = 1.4 * S;
      c.fillStyle = color; c.beginPath();
      c.rect(cx - 170 * s2, base - 70 * s2, 340 * s2, 70 * s2);
      c.rect(cx - 70 * s2, base - 120 * s2, 140 * s2, 50 * s2);
      onionDome(c, cx, base - 120 * s2, 62 * s2);
      minaret(c, cx - 190 * s2, base, 16 * s2, 190 * s2); minaret(c, cx + 190 * s2, base, 16 * s2, 190 * s2);
      c.fill();
      c.fillStyle = lights;
      for (var i = 0; i < 9; i++) { var wx = cx - 140 * s2 + i * 35 * s2; c.beginPath(); c.rect(wx - 5 * s2, base - 40 * s2, 10 * s2, 18 * s2); c.arc(wx, base - 40 * s2, 5 * s2, Math.PI, 0); c.fill(); }
      c.save(); c.globalAlpha = 0.25; c.translate(0, base); c.scale(1, -0.45); c.translate(0, -base);      // its reflection
      c.fillStyle = color; c.fillRect(cx - 170 * s2, base - 70 * s2, 340 * s2, 70 * s2); c.restore();
    }
    function haze(c, top, color, a) {
      var hz = c.createLinearGradient(0, top, 0, Y1); hz.addColorStop(0, 'rgba(0,0,0,0)');
      var q = hex(color); hz.addColorStop(1, 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + a + ')'); c.fillStyle = hz; c.fillRect(X0, top, WD, Y1 - top);
    }

    // sky: stars (or clouds at dawn) and the sea below the horizon at the palace. The sky's gradient, the glow and the moon or
    // sun are not in this picture: the old game placed them by the screen (the gradient from the top of the screen to the
    // horizon, the glow 30% across, 62% at dawn), so play.js lays them out for each screen (A.sky below)
    layer(0, function (g) {
      var gx = fx(wi === 1 ? 0.62 : 0.3);
      if (wi !== 1) {
        for (var i = 0; i < 260 * NK; i++) {
          var sy = Y0 + R() * (horizon * 0.9 - Y0); g.globalAlpha = Math.min(1, 0.25 + R() * 0.7 * (1 - Math.max(0, sy) / horizon)) * Math.min(1, (sy - Y0) / 250);      // (fading in from the picture's top edge: no seam above it)
          g.fillStyle = '#fff'; g.beginPath(); g.arc(X0 + R() * WD, sy, (0.7 + R() * 1.3) * S * 0.9, 0, 6.283); g.fill();
        }
        g.globalAlpha = 1;
      } else {
        for (var c = 0; c < 10 * NK; c++) {
          var cx = X0 + R() * WD, cy = (0.1 + R() * 0.35) * horizon, cs = (40 + R() * 70) * S;
          g.fillStyle = 'rgba(255,255,255,' + (0.18 + R() * 0.2) + ')';
          for (var k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + (k - 1.5) * cs * 0.55, cy + (k % 2) * cs * 0.12, cs * 0.6, cs * 0.28, 0, 0, 6.283); g.fill(); }
        }
      }
      if (wi === 2) {
        var sea = g.createLinearGradient(0, horizon, 0, Y1);
        sea.addColorStop(0, '#2a7f93'); sea.addColorStop(0.2, '#13506c'); sea.addColorStop(1, '#041a2c');
        g.fillStyle = sea; g.fillRect(X0, horizon, WD, Y1 - horizon);
        for (var l = 0; l < 90 * NK; l++) {
          var ly = horizon + Math.pow(R(), 1.6) * (BOT - horizon), lw = (10 + R() * 50) * S * (1 + (ly - horizon) / BOT * 2);
          g.strokeStyle = 'rgba(255,220,160,' + (0.08 + R() * 0.25) * (1 - (ly - horizon) / (BOT - horizon)) + ')'; g.lineWidth = 1.6 * S;
          var lx = gx + (R() - 0.5) * 240 * S; g.beginPath(); g.moveTo(lx - lw, ly); g.lineTo(lx + lw, ly); g.stroke();
        }
      }
    });
    // far, mid and near silhouettes of each world
    layer(1, function (f) {
      if (wi === 0) { dunes(f, horizon - 10 * S, 26 * S, W_.far, 11); city(f, horizon - 4 * S, 0.55, W_.far, null, 12); }
      else if (wi === 1) { dunes(f, horizon - 30 * S, 34 * S, W_.far, 41); dunes(f, horizon, 20 * S, shade(W_.far, -0.08), 42); }
      else islands(f, horizon, W_.far, 61);
      haze(f, horizon - 160 * S, W_.sky[3], 0.35);
    });
    layer(2, function (m) {
      if (wi === 0) { city(m, horizon + 26 * S, 1, W_.mid, 'rgba(255,196,110,.85)', 21); dunes(m, horizon + 60 * S, 14 * S, W_.mid, 22); }
      else if (wi === 1) arcade(m, horizon + 70 * S, W_.mid, 43);
      else palace(m, horizon + 4 * S, W_.mid, 'rgba(255,205,120,.9)');
    });
    layer(3, function (n) {
      if (wi === 0) {
        dunes(n, BOT - 70 * S, 40 * S, W_.near, 31);
        palm(n, fx(0.08), BOT - 60 * S, 190 * S, W_.near); palm(n, fx(0.93), BOT - 40 * S, 230 * S, W_.near); palm(n, fx(0.82), BOT - 70 * S, 150 * S, W_.near);
      } else if (wi === 1) {
        dunes(n, BOT - 60 * S, 26 * S, W_.near, 51);
        var rC = rng(52); for (var t = 0, tn = Math.round(12 * NK); t < tn; t++) cypress(n, X0 + (t / (tn - 1)) * WD + (rC() - 0.5) * 60 * S, BOT - 50 * S, (150 + rC() * 120) * S, W_.near);
        for (var fl = 0; fl < 90 * NK; fl++) { n.fillStyle = ['#ff8fab', '#ffd166', '#ffffff', '#c3a6ff'][fl % 4]; n.beginPath(); n.arc(X0 + rC() * WD, BOT - (10 + rC() * 60) * S, (2 + rC() * 3) * S, 0, 6.283); n.fill(); }
      } else {
        n.fillStyle = W_.near; n.beginPath(); n.moveTo(X0, Y1);
        for (var x = X0; x <= X1; x += 14) n.lineTo(x, BOT - 70 * S - Math.sin(x / S * 0.02) * 10 * S - Math.sin(x / S * 0.053) * 6 * S);
        n.lineTo(X1, Y1); n.fill();
        var bx = fx(0.18), by = BOT - 86 * S; n.beginPath(); n.moveTo(bx - 60 * S, by); n.lineTo(bx + 70 * S, by); n.lineTo(bx + 46 * S, by + 22 * S); n.lineTo(bx - 44 * S, by + 22 * S); n.closePath(); n.fill();   // a little dhow
        n.beginPath(); n.moveTo(bx, by); n.lineTo(bx, by - 110 * S); n.lineTo(bx + 62 * S, by - 14 * S); n.closePath(); n.fill();
      }
    });
    // three depth layers, each its own picture (the sky and far hills are one, they hardly move apart); a layer's top is
    // where its scenery starts (above it the picture would be empty), so the near ones are short and cost little memory
    [[0, 1], [2], [3]].forEach(function (ls, i) {
      Kit.play.tex(scene, key + 'abc'[i], WD * T, (Y1 - tops[i]) * T, function (c) {
        c.scale(T, T); c.translate(-X0, -tops[i]);
        ls.forEach(function (k) { c.save(); layers[k](c); c.restore(); });
      });
    });
    // the glow, the crescent moon and the dawn sun, each its own small picture (design units: one old point = 2.2 units)
    Kit.play.tex(scene, 'bg-glow', 256, 256, function (g) {              // (a soft blur: painted small, shown 4.5 times as big)
      var h = g.createRadialGradient(128, 128, 0, 128, 128, 128); h.addColorStop(0, 'rgba(255,240,200,.55)'); h.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = h; g.fillRect(0, 0, 256, 256);
    });
    Kit.play.tex(scene, 'bg-moon', 160, 160, function (g) {
      var mr = 66, o = 80; g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(o, o, mr, 0, 6.283); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(o + mr * 0.45, o - mr * 0.2, mr * 0.88, 0, 6.283); g.fill();
    });
    Kit.play.tex(scene, 'bg-sun', 210, 210, function (g) { g.fillStyle = 'rgba(255,246,214,.95)'; g.beginPath(); g.arc(105, 105, 101, 0, 6.283); g.fill(); });
    // palace pillars (a 36 x 720 strip of six 120 tall tiles, stacked as images) and the frieze along the ceiling (a 184 x 58 strip of four 46 wide tiles, laid in a row)
    var stone = W_.stone;
    Kit.play.tex(scene, 'pillar' + wi, 72, 1440, function (g) {                // (6 tiles one above the other: images stack it, so the whole scene is one batch)
      g.scale(2, 2);
      var w = 36, h = 120, gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, shade(stone, -0.45)); gr.addColorStop(0.35, shade(stone, 0.12)); gr.addColorStop(0.6, stone); gr.addColorStop(1, shade(stone, -0.55));
      for (var k = 0; k < 6; k++) {
        g.save(); g.translate(0, k * h);
        g.fillStyle = gr; g.fillRect(w * 0.12, 0, w * 0.76, h);
        g.fillStyle = 'rgba(0,0,0,.18)'; star8(g, w / 2, 40, w * 0.26); g.fill();
        g.fillStyle = shade(stone, 0.2); g.fillRect(0, 100, w, 6);
        g.restore();
      }
    });
    Kit.play.tex(scene, 'frieze' + wi, 368, 116, function (g) {                 // (4 tiles in a row: fewer images to draw along the ceiling)
      g.scale(2, 2);
      var h = 34, step = 46, gr = g.createLinearGradient(0, 0, 0, h + 10);
      gr.addColorStop(0, shade(stone, -0.5)); gr.addColorStop(1, shade(stone, 0.05));
      for (var k = 0; k < 4; k++) {
        g.save(); g.translate(k * step, 0);
        g.fillStyle = gr; g.fillRect(0, 0, step, h);
        g.fillStyle = shade(stone, -0.15); g.beginPath(); g.moveTo(0, h); g.arc(step / 2, h, step / 2, Math.PI, 0, true); g.closePath(); g.fill();      // hanging scallops
        g.fillStyle = 'rgba(255,240,200,.35)'; star8(g, step / 2, h - h * 0.55, 7); g.fill();
        g.fillStyle = shade(stone, 0.25); g.fillRect(0, h - 3, step, 3);
        g.restore();
      }
    });
    paintTiles(scene, wi);
    return key;
  };
  // let a world's pictures go (the next world is about to be painted)
  A.dropWorld = function (scene, wi) {
    if (A.keep) return;                                               // (baked pictures are kept: they are small files, loaded once)
    ['bg' + wi + 'a', 'bg' + wi + 'b', 'bg' + wi + 'c', 'pillar' + wi, 'frieze' + wi, 'tiles' + wi].forEach(function (k) { scene.textures.remove(k); });
  };

  // ---------- tiles: every tile of every world in one atlas, painted at 2x ----------
  // frame names: w<world>n<colour> (one hit) · w<world>s<colour>h<hp> (two hits) · w<world>gh<hp> (gold, three) · w<world>x (stone)
  function tilePaint(g, w, h, color, kind, hp, maxHp) {
    var pad = 6, r = Math.min(10, h * 0.28);
    g.translate(pad, pad);
    g.fillStyle = 'rgba(10,6,30,.35)'; rr(g, 1.5, 4, w, h, r); g.fill();                                   // soft drop shadow
    var base = kind === 'gold' ? '#f2b938' : kind === 'stone' ? '#9a8a78' : color;
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, shade(base, 0.35)); gr.addColorStop(0.45, base); gr.addColorStop(1, shade(base, -0.28));
    g.fillStyle = gr; rr(g, 0, 0, w, h, r); g.fill();
    g.lineWidth = kind === 'strong' ? 4 : 2.2;                                                             // the white grout edge
    g.strokeStyle = kind === 'strong' ? '#ffe2a0' : kind === 'stone' ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.85)';
    rr(g, 1, 1, w - 2, h - 2, r - 1); g.stroke();
    if (kind === 'strong') { g.lineWidth = 1.5; g.strokeStyle = 'rgba(120,60,10,.6)'; rr(g, 4.5, 4.5, w - 9, h - 9, r - 4); g.stroke(); }
    g.save(); rr(g, 0, 0, w, h, r); g.clip();
    if (kind === 'stone') {
      g.strokeStyle = 'rgba(40,25,10,.35)'; g.lineWidth = 2;
      for (var x = -h; x < w + h; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); g.beginPath(); g.moveTo(x + h, 0); g.lineTo(x, h); g.stroke(); }
    } else {                                                                                               // the eight-point star motif
      g.fillStyle = kind === 'gold' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.32)';
      star8(g, w / 2, h / 2, h * 0.36); g.fill();
      g.fillStyle = 'rgba(0,0,0,.12)'; star8(g, w / 2, h / 2, h * 0.16); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)';
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1] - h * 0.3); g.lineTo(p[0] + h * 0.3, p[1]); g.lineTo(p[0], p[1] + h * 0.3); g.lineTo(p[0] - h * 0.3, p[1]); g.fill(); });
    }
    var gl = g.createLinearGradient(0, 0, 0, h * 0.5); gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.ellipse(w * 0.5, h * 0.08, w * 0.46, h * 0.36, 0, 0, 6.283); g.fill();     // gloss
    if (maxHp > 1 && hp < maxHp) {                                                                         // cracks on a damaged tile
      g.strokeStyle = 'rgba(30,10,0,.55)'; g.lineWidth = 1.6; g.lineCap = 'round';
      var R2 = rng(hp * 31 + maxHp * 7 + Math.round(w)), cracks = (maxHp - hp) * 2;
      for (var k = 0; k < cracks; k++) { var sx = R2() * w, sy = R2() * h; g.beginPath(); g.moveTo(sx, sy); for (var j = 0; j < 3; j++) { sx += (R2() - 0.5) * w * 0.35; sy += (R2() - 0.5) * h * 0.7; g.lineTo(sx, sy); } g.stroke(); }
    }
    if (kind === 'gold') { g.fillStyle = '#fff'; star8(g, w * 0.82, h * 0.28, 4, 0.3); g.fill(); }
    g.restore();
  }
  A.tileFrame = function (world, kind, color, hp) {
    return 'w' + world + (kind === 'normal' ? 'n' + color : kind === 'strong' ? 's' + color + 'h' + hp : kind === 'gold' ? 'gh' + hp : 'x');
  };
  function paintTiles(scene, wi) {
    var BW = L.BW, BH = L.BH, S = 2, cw = (BW + 12) * S, ch = (BH + 12) * S, cols = 5, list = [], key = 'tiles' + wi;
    for (var c = 0; c < 5; c++) list.push([wi, 'normal', c, 1, 1]);
    for (c = 0; c < 5; c++) { list.push([wi, 'strong', c, 2, 2]); list.push([wi, 'strong', c, 1, 2]); }
    for (var hp = 3; hp >= 1; hp--) list.push([wi, 'gold', 2, hp, 3]);
    list.push([wi, 'stone', 0, 1, 1]);
    var rows = Math.ceil(list.length / cols);
    Kit.play.tex(scene, key, cw * cols, ch * rows, function (g) {
      list.forEach(function (e, i) {
        g.save(); g.translate((i % cols) * cw, Math.floor(i / cols) * ch); g.scale(S, S);
        tilePaint(g, BW, BH, A.WORLDS[wi].tiles[e[2]], e[1], e[3], e[4]); g.restore();
      });
    });
    var t = scene.textures.get(key);
    list.forEach(function (e, i) { var n = A.tileFrame(e[0], e[1], e[2], e[3]); if (!t.has(n)) t.add(n, 0, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch); });
  }

  // ---------- the carpet: painted flat, cut into strips that ripple ----------
  // 400 x 38 of carpet with 20 units of tassels at each end and 10 above and below, painted at 2x into the sprites atlas and
  // cut into 6 strips (frames cs0..cs5); play.js sets each strip's height and tilt along a wave (sprites in the same batch
  // as everything else, instead of a Rope's own mesh draw).
  A.CARPET = { w: 400, h: 38, padX: 20, padY: 10, S: 2, N: 6 };
  function carpetPaint(g) {
    var C = A.CARPET, S = C.S, w = C.w, h = C.h;
    g.save(); g.scale(S, S); g.translate(C.padX, C.padY);
    var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e2453c'); gr.addColorStop(1, '#9d1f2f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd36b'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 4); g.lineTo(w, 4); g.moveTo(0, h - 4); g.lineTo(w, h - 4); g.stroke();
    var cnt = 9;
    for (var k = 0; k < cnt; k++) {
      var mx = w * (k + 0.5) / cnt, my = h / 2;
      g.fillStyle = k % 2 ? '#2b3a8f' : '#ffd36b';
      g.beginPath(); g.moveTo(mx, my - 7); g.lineTo(mx + 9, my); g.lineTo(mx, my + 7); g.lineTo(mx - 9, my); g.closePath(); g.fill();
    }
    g.strokeStyle = '#ffd36b'; g.fillStyle = '#ffd36b'; g.lineWidth = 2.4; g.lineCap = 'round';              // tassels
    [[0, -1], [w, 1]].forEach(function (e) {
      for (var q = 0; q < 4; q++) { var yy = 4 + q * (h - 8) / 3; g.beginPath(); g.moveTo(e[0], yy); g.lineTo(e[0] + e[1] * 12, yy + (q % 2 ? 2 : -2)); g.stroke(); g.beginPath(); g.arc(e[0] + e[1] * 13, yy + (q % 2 ? 2 : -2), 2.6, 0, 6.283); g.fill(); }
    });
    g.restore();
  }

  // ---------- the small pictures: one atlas ----------
  function paintSprites(scene) {
    var cx = 0, cy = 0, rowH = 0, PW = 1100, PH = 0, cells = [], jobs = [];
    // (a shelf packer, tallest first: put(name, w, h, paint, pad) lists a picture, and when all are listed each is painted
    // into its own cell of the atlas; every texture the chip holds is memory, so the atlas is packed tight)
    var measure = false, body = function (c) {
      var put = function (name, w, h, paint, pad) { pad = pad || 0; jobs.push({ name: name, w: w, h: h, paint: paint, pad: pad, cw: w + pad * 2, ch: h + pad * 2 }); };
      var flush = function () {
        jobs.sort(function (a, b) { return b.ch - a.ch; });
        jobs.forEach(function (j) {
          if (cx + j.cw > PW) { cx = 0; cy += rowH + 1; rowH = 0; }
          if (!measure) { c.save(); c.translate(cx + j.pad, cy + j.pad); j.paint(c, j.w, j.h); c.restore(); }
          if (measure) {
            if (j.name === 'carpet') for (var si = 0; si < A.CARPET.N; si++) cells.push(['cs' + si, cx + si * j.cw / A.CARPET.N, cy, j.cw / A.CARPET.N, j.ch]);   // (the carpet is only kept as strips)
            else cells.push([j.name, cx, cy, j.cw, j.ch]);
          }
          cx += j.cw + 1; rowH = Math.max(rowH, j.ch);
        });
      };
      var icon = function (name, draw) { put(name, 96, 96, function (g) { g.strokeStyle = '#f6f1ff'; g.fillStyle = '#f6f1ff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.scale(4, 4); g.lineWidth = 2.4; draw(g); }); };
      // the carpet, cut into strips
      var CP = A.CARPET, cwid = (CP.w + CP.padX * 2) * CP.S, chei = (CP.h + CP.padY * 2) * CP.S;
      put('carpet', cwid, chei, function (g) { g.save(); carpetPaint(g); g.restore(); });
      // particles
      put('dot', 32, 32, function (g) { var q = g.createRadialGradient(16, 16, 0, 16, 16, 15); q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(0.55, 'rgba(255,255,255,.9)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 32, 32); });
      put('shard', 28, 28, function (g) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(3, 18); g.lineTo(16, 2); g.lineTo(25, 20); g.lineTo(10, 26); g.closePath(); g.fill(); });
      put('spark', 40, 40, function (g) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(20, 0); g.quadraticCurveTo(22, 18, 40, 20); g.quadraticCurveTo(22, 22, 20, 40); g.quadraticCurveTo(18, 22, 0, 20); g.quadraticCurveTo(18, 18, 20, 0); g.fill(); });
      put('star8', 48, 48, function (g) { g.fillStyle = '#fff'; star8(g, 24, 24, 22, 0.55); g.fill(); });
      put('petal', 28, 14, function (g) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(14, 7, 13, 6, 0, 0, 6.283); g.fill(); });
      put('px', 8, 8, function (g) { g.fillStyle = '#fff'; g.fillRect(0, 0, 8, 8); });
      put('mote', 12, 12, function (g) { var q = g.createRadialGradient(6, 6, 0, 6, 6, 6); q.addColorStop(0, '#fff'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 12, 12); });
      put('lamp', 22, 30, function (g) { var q = g.createRadialGradient(11, 15, 0, 11, 15, 22); q.addColorStop(0, 'rgba(255,200,110,.9)'); q.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = q; g.fillRect(-12, -10, 46, 50); g.fillStyle = '#ffcf7a'; g.fillRect(4, 8, 14, 16); }, 14);
      // the ball: a soft glow baked round it (so one image is the whole star), and the star that turns on it
      var r = L.BALL_R, gp = Math.round(r * 1.6);
      put('ball', r * 2, r * 2, function (g) {
        var glow = g.createRadialGradient(r, r, r * 0.6, r, r, r * 2.6); glow.addColorStop(0, 'rgba(255,236,170,.55)'); glow.addColorStop(1, 'rgba(255,236,170,0)');
        g.fillStyle = glow; g.beginPath(); g.arc(r, r, r * 2.6, 0, 6.283); g.fill();
        var body = g.createRadialGradient(r * 0.65, r * 0.65, r * 0.1, r, r, r);
        body.addColorStop(0, '#ffffff'); body.addColorStop(0.5, '#fff1b8'); body.addColorStop(1, '#f2b23a');
        g.fillStyle = body; g.beginPath(); g.arc(r, r, r, 0, 6.283); g.fill();
      }, gp);
      var sr = r * 0.62;
      put('ballstar', sr * 2, sr * 2, function (g) { g.fillStyle = 'rgba(214,128,20,.6)'; star8(g, sr, sr, sr, 0.55); g.fill(); });
      // numbers as pictures: the score (n0..n9, n, ) and the rising +points (p0..p9, p+) are made of these, so a change of score
      // sets frames on a few images instead of painting a canvas text and uploading it (A.Num below)
      ['n', 'p'].forEach(function (k) {
        var N = A.NUM[k], list = '0123456789' + (k === 'n' ? ',' : '+');
        for (var gi = 0; gi < list.length; gi++) (function (ch) {
          var w = Math.round(N.size * (ch === ',' ? N.comma : N.adv)), h = Math.round(N.size * 1.2);
          put(k + ch, w, h, function (g) {
            g.font = '800 ' + N.size + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
            var y = h / 2 + N.size * 0.36;
            if (N.stroke) { g.lineWidth = N.stroke; g.strokeStyle = 'rgba(30,10,60,.7)'; g.strokeText(ch, w / 2, y); }
            g.fillStyle = N.color; g.fillText(ch, w / 2, y);
          }, N.stroke ? Math.ceil(N.stroke / 2) + 1 : 2);
        })(list[gi]);
      });
      // the carpet's shadow and the soft light round it while a power-up lasts
      put('shadow', 200, 30, function (g) { var q = g.createRadialGradient(100, 15, 0, 100, 15, 100); q.addColorStop(0, 'rgba(5,3,20,.5)'); q.addColorStop(1, 'rgba(5,3,20,0)'); g.save(); g.translate(0, 15); g.scale(1, 0.15); g.translate(0, -15); g.fillStyle = q; g.fillRect(0, -70, 200, 200); g.restore(); });
      put('cglow', 200, 60, function (g) { g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 24; rr(g, 30, 16, 140, 28, 12); g.fill(); g.shadowBlur = 0; g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; rr(g, 34, 20, 132, 20, 8); g.fill(); });
      // lanterns: a glow, a cap, a swelling body in the power-up's colour and a plain white sign (no letters: ↔ star moon heart)
      Object.keys(A.PU).forEach(function (type) {
        var col = A.PU[type].c;
        put('lantern-' + type, 92, 92, function (g) {
          g.translate(46, 46);
          var glow = g.createRadialGradient(0, 0, 4, 0, 0, 46); glow.addColorStop(0, col + 'aa'); glow.addColorStop(1, col + '00');
          g.fillStyle = glow; g.beginPath(); g.arc(0, 0, 46, 0, 6.283); g.fill();
          g.strokeStyle = '#ffd36b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -38); g.lineTo(0, -28); g.stroke();
          g.fillStyle = '#c98a2b'; g.beginPath(); g.moveTo(-14, -24); g.lineTo(14, -24); g.lineTo(8, -30); g.lineTo(-8, -30); g.closePath(); g.fill();
          g.fillStyle = col; g.beginPath(); g.moveTo(-14, -24); g.bezierCurveTo(-26, -8, -26, 10, -12, 22); g.lineTo(12, 22); g.bezierCurveTo(26, 10, 26, -8, 14, -24); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,240,200,.8)'; g.lineWidth = 2; g.stroke();
          g.fillStyle = '#c98a2b'; g.fillRect(-12, 22, 24, 6);
          g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
          if (type === 'wide') { g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(-5, -5); g.lineTo(-10, 0); g.lineTo(-5, 5); g.moveTo(5, -5); g.lineTo(10, 0); g.lineTo(5, 5); g.stroke(); }
          else if (type === 'multi') { star8(g, 0, -1, 10, 0.5); g.fill(); }
          else if (type === 'slow') { g.beginPath(); g.arc(0, -1, 9, 0, 6.283); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(4, -4, 8, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over'; }
          else { g.beginPath(); g.moveTo(0, 9); g.bezierCurveTo(-14, 0, -8, -11, 0, -4); g.bezierCurveTo(8, -11, 14, 0, 0, 9); g.fill(); }
        });
      });
      // interface: dark plates (readable on any backdrop), icons, hearts, stars
      put('plate', 150, 150, function (g) { g.fillStyle = 'rgba(13,11,36,.78)'; g.beginPath(); g.arc(75, 75, 70, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 4; g.stroke(); });
      put('pill', 340, 150, function (g) { g.fillStyle = 'rgba(13,11,36,.78)'; g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 4; rr(g, 5, 5, 330, 140, 70); g.fill(); g.stroke(); });
      put('card9', 200, 200, function (g) { g.fillStyle = 'rgba(16,13,44,.95)'; g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 4; rr(g, 2, 2, 196, 196, 60); g.fill(); g.stroke(); });      // (9-sliced into every card and sheet)
      put('pillw', 340, 150, function (g) { g.fillStyle = '#fff'; rr(g, 5, 5, 330, 140, 70); g.fill(); });
      put('big', 140, 140, function (g) { g.fillStyle = '#f6c453'; g.beginPath(); g.arc(70, 70, 67, 0, 7); g.fill(); });
      put('cell', 150, 150, function (g) { g.fillStyle = '#fff'; rr(g, 4, 4, 142, 142, 32); g.fill(); });
      put('cello', 150, 150, function (g) { g.strokeStyle = '#fff'; g.lineWidth = 6; rr(g, 4, 4, 142, 142, 32); g.stroke(); });
      var heart = function (g, s, fill) { g.save(); g.scale(s, s); g.beginPath(); g.moveTo(12, 21); g.bezierCurveTo(12, 21, 4.5, 16.4, 2.4, 11.8); g.bezierCurveTo(0.9, 8.4, 3, 4.5, 6.8, 4.5); g.bezierCurveTo(9, 4.5, 10.4, 5.7, 12, 7.5); g.bezierCurveTo(13.6, 5.7, 15, 4.5, 17.2, 4.5); g.bezierCurveTo(21, 4.5, 23.1, 8.4, 21.6, 11.8); g.bezierCurveTo(19.5, 16.4, 12, 21, 12, 21); g.closePath(); if (fill) { g.fillStyle = '#ff5d73'; g.fill(); g.strokeStyle = '#7a1030'; g.lineWidth = 1.2; } else { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6; } g.stroke(); g.restore(); };
      put('heart', 72, 72, function (g) { heart(g, 3, true); });
      put('heart0', 72, 72, function (g) { heart(g, 3, false); });
      var starIcon = function (g, fill) { g.save(); g.translate(36, 36); g.scale(0.72, 0.72); g.beginPath(); g.moveTo(0, -46); [[13, -31], [32, -32], [31, -13], [46, 0], [31, 13], [32, 32], [13, 31], [0, 46], [-13, 31], [-32, 32], [-31, 13], [-46, 0], [-31, -13], [-32, -32], [-13, -31]].forEach(function (p) { g.lineTo(p[0], p[1]); }); g.closePath(); g.fillStyle = fill; g.fill(); g.lineJoin = 'round'; g.strokeStyle = fill === '#f6c453' ? '#7a4a12' : 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.stroke(); g.restore(); };
      put('star', 72, 72, function (g) { starIcon(g, '#f6c453'); });
      put('star0', 72, 72, function (g) { starIcon(g, 'rgba(255,255,255,.14)'); });
      put('touch', 120, 120, function (g) { var q = g.createRadialGradient(60, 60, 0, 60, 60, 54); q.addColorStop(0, 'rgba(255,255,255,.55)'); q.addColorStop(1, 'rgba(255,255,255,.2)'); g.fillStyle = q; g.beginPath(); g.arc(60, 60, 54, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 6; g.stroke(); });
      put('ic-exit', 96, 96, function (g) { Kit.play.exitIcon(g, 96, '#f6f1ff', 2.4); });
      icon('ic-retry', function (g) { g.beginPath(); g.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); g.stroke(); g.beginPath(); g.moveTo(4, 4); g.lineTo(4, 9.5); g.lineTo(9.5, 9.5); g.stroke(); });
      icon('ic-grid', function (g) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { rr(g, p[0], p[1], 6, 6, 1.5); g.stroke(); }); });
      icon('ic-snd', function (g) { g.beginPath(); g.moveTo(4, 9.5); g.lineTo(4, 14.5); g.lineTo(7.5, 14.5); g.lineTo(12, 18.5); g.lineTo(12, 5.5); g.lineTo(7.5, 9.5); g.closePath(); g.stroke(); g.beginPath(); g.arc(13, 12, 4, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(13, 12, 7.5, -0.9, 0.9); g.stroke(); });
      icon('ic-mute', function (g) { g.beginPath(); g.moveTo(4, 9.5); g.lineTo(4, 14.5); g.lineTo(7.5, 14.5); g.lineTo(12, 18.5); g.lineTo(12, 5.5); g.lineTo(7.5, 9.5); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(15.5, 9.5); g.lineTo(20.5, 14.5); g.moveTo(20.5, 9.5); g.lineTo(15.5, 14.5); g.stroke(); });
      put('btn-pause', 150, 150, function (g) { g.fillStyle = 'rgba(13,11,36,.78)'; g.beginPath(); g.arc(75, 75, 70, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 4; g.stroke(); g.save(); g.translate(27, 27); g.fillStyle = '#f6f1ff'; g.scale(4, 4); rr(g, 6.5, 5, 3.6, 14, 1.4); g.fill(); rr(g, 13.9, 5, 3.6, 14, 1.4); g.fill(); g.restore(); });      // (the in-game pause button is one picture)
      icon('ic-pause', function (g) { rr(g, 6.5, 5, 3.6, 14, 1.4); g.fill(); rr(g, 13.9, 5, 3.6, 14, 1.4); g.fill(); });
      icon('ic-close', function (g) { g.beginPath(); g.moveTo(6, 6); g.lineTo(18, 18); g.moveTo(18, 6); g.lineTo(6, 18); g.stroke(); });
      icon('ic-play', function (g) { g.beginPath(); g.moveTo(8, 5); g.lineTo(19, 12); g.lineTo(8, 19); g.closePath(); g.fill(); });
      icon('ic-next', function (g) { g.beginPath(); g.moveTo(5, 12); g.lineTo(18, 12); g.moveTo(13, 6); g.lineTo(19, 12); g.lineTo(13, 18); g.stroke(); });
      icon('ic-lock', function (g) { rr(g, 5, 11, 14, 10, 2); g.stroke(); g.beginPath(); g.moveTo(8, 11); g.lineTo(8, 8); g.arc(12, 8, 4, Math.PI, 0); g.lineTo(16, 11); g.stroke(); });
      flush();
    };
    measure = true; body(null); measure = false;                                                         // (first only the layout, to size the atlas exactly)
    PH = Math.ceil(cy + rowH); cx = cy = rowH = 0; jobs = [];                                // (the frames come from this layout: a baked sheet has the same one)
    Kit.play.tex(scene, 'sprites', PW, PH, body);
    var tx = scene.textures.get('sprites');
    cells.forEach(function (e) { if (!tx.has(e[0])) tx.add(e[0], 0, e[1], e[2], e[3], e[4]); });
  }

  // ---------- numbers made of pictures ----------
  // size: the glyph's height in design units as painted (shown scaled), adv: a digit's advance in ems, comma: a comma's.
  A.NUM = { n: { size: 100, adv: 0.62, comma: 0.32, color: '#f6f1ff', stroke: 0 }, p: { size: 60, adv: 0.62, comma: 0.32, color: '#ffffff', stroke: 12 } };
  // A.Num(scene, 'n' | 'p', maxChars): a Container of Images, centred on its position; .set('12,340') puts a frame on each.
  // Scale the container to the size wanted (.base remembers it); tween it like any other object.
  A.Num = function (scene, kind, max) {
    var N = A.NUM[kind], c = scene.add.container(0, 0), im = [], i;
    for (i = 0; i < max; i++) im.push(scene.add.image(0, 0, 'sprites', kind + '0').setVisible(false));
    c.add(im); c.base = 1; c.str = '';
    c.set = function (str) {
      if (str === c.str) return c;
      c.str = str; var n = str.length, tot = 0, x, k, adv = [];
      for (k = 0; k < n; k++) { adv.push(N.size * (str[k] === ',' ? N.comma : N.adv)); tot += adv[k]; }
      x = -tot / 2;
      for (k = 0; k < max; k++) {
        if (k >= n) { if (im[k].visible) im[k].setVisible(false); continue; }
        im[k].setFrame(kind + str[k]).setPosition(x + adv[k] / 2, 0).setVisible(true); x += adv[k];
      }
      return c;
    };
    return c;
  };

  // everything every level uses, painted once at boot
  A.paint = function (scene) { paintSprites(scene); };
})();
