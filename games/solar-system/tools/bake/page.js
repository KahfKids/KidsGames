/* Solar System art bake: the in-page half (runs in Chromium, driven by tools/bake.js).
   Uses the old procedural code kept in render.js (noise, lit-sphere maths) and bodies.js (the texture recipe of each
   world) to make the pictures the game now loads as files: each world's surface (an equirectangular texture, Earth's
   clouds, oceans and city lights in a second one), the sky (nebula panorama and two star layers) and the asteroid belt.
   Every function returns PNG data URLs; bake.js writes and encodes them. Nothing here is in the game. */
(function () {
  'use strict';
  var A = window.SolarArt, SB = window.SolarBodies, TAU = Math.PI * 2;

  function png(c) { return c.toDataURL('image/png'); }
  function fromRGB(w, h, rgb) {
    var c = A.canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
    for (var i = 0, n = w * h; i < n; i++) { img.data[i * 4] = rgb[i * 3]; img.data[i * 4 + 1] = rgb[i * 3 + 1]; img.data[i * 4 + 2] = rgb[i * 3 + 2]; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); return c;
  }

  // a world's surface; Earth also gets a mask picture: red = clouds, green = ocean (for the sun's glint), blue = city lights
  function surface(id) {
    var b = SB.byId[id], T = SB.texture(b);
    A.pumpTexture(T, 1e9);
    var out = { w: T.w, h: T.h, color: png(fromRGB(T.w, T.h, T.rgb)) };
    if (T.cloud) {
      var m = new Uint8Array(T.w * T.h * 3);
      for (var i = 0; i < T.w * T.h; i++) { m[i * 3] = T.cloud[i]; m[i * 3 + 1] = T.ocean[i]; m[i * 3 + 2] = T.lights[i]; }
      out.mask = png(fromRGB(T.w, T.h, m));
    }
    return out;
  }

  // the sky: a 1024 x 512 panorama that repeats sideways (bands of nebula, the Milky Way with its dust lane) and two
  // star layers made for a tile shown one texel to one screen pixel
  function sky() {
    var OW = 1024, OH = 512, W = OW * 2, H = OH * 2, c = A.canvas(W, H), g = c.getContext('2d'), r = A.rng(7), amp = H * 0.2, phase = 1.3;   // painted at twice the size, then averaged down: that removes the dither of the gradients
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060718'); bg.addColorStop(0.55, '#0a0a26'); bg.addColorStop(1, '#120c2c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    function bandY(x) { return H * 0.5 + amp * Math.sin(x / W * TAU + phase) + amp * 0.25 * Math.sin(x / W * TAU * 2 + 0.4); }
    function blob(x, y, rad, col, a, mode) {
      for (var dx = -W; dx <= W; dx += W) {
        if (x + dx < -rad || x + dx > W + rad) continue;
        var gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
        gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.globalCompositeOperation = mode || 'lighter'; g.fillStyle = gr; g.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
      }
    }
    var i, x;
    for (i = 0; i < 9; i++) blob(r() * W, r() * H, H * (0.12 + r() * 0.2), ['90,60,150', '40,90,140', '120,50,110', '30,70,120'][i % 4], 0.07 + r() * 0.05);
    for (i = 0; i < 70; i++) { x = r() * W; blob(x, bandY(x) + (r() - 0.5) * amp * 0.5, H * (0.07 + r() * 0.1), r() < 0.5 ? '120,130,200' : '160,130,190', 0.08 + r() * 0.06); }
    for (i = 0; i < 90; i++) { x = r() * W; blob(x, bandY(x) + (r() - 0.5) * amp * 0.3, H * (0.02 + r() * 0.045), r() < 0.6 ? '230,215,255' : '255,220,185', 0.08 + r() * 0.1); }
    for (i = 0; i < 60; i++) { x = r() * W; blob(x, bandY(x) + (r() - 0.5) * amp * 0.12, H * (0.012 + r() * 0.03), '6,6,20', 0.3 + r() * 0.25, 'source-over'); }
    g.globalCompositeOperation = 'source-over';
    

    var half = A.canvas(OW, OH), hg = half.getContext('2d'); hg.imageSmoothingQuality = 'high'; hg.drawImage(c, 0, 0, OW, OH); c = half;
    // faint stars: a tile of 1024 x 1024 texels, each a crisp dot (shown one texel to one screen pixel)
    var f = A.canvas(1024, 1024), fg = f.getContext('2d'), r2 = A.rng(11), cols = ['#ffffff', '#ffffff', '#bcd2ff', '#ffd9b0'];
    for (i = 0; i < 380; i++) {
      var s = 1.3 + r2() * r2() * 2.6, a = 0.35 + r2() * 0.65, col = cols[(r2() * cols.length) | 0];
      fg.globalAlpha = a; fg.fillStyle = col; fg.beginPath(); fg.arc(r2() * 1024, r2() * 1024, s / 2, 0, TAU); fg.fill();
    }
    // bright stars: a few glowing crosses in a tile of 1024 x 1024
    var b = A.canvas(1024, 1024), bg2 = b.getContext('2d'), r3 = A.rng(23);
    for (i = 0; i < 16; i++) {
      var col2 = ['#ffffff', '#bcd2ff', '#ffd9b0'][i % 3], sz = (2.2 + r3() * 1.2) * 4.2 * 2 * (0.85 + r3() * 0.3);
      bg2.globalAlpha = 0.55 + r3() * 0.45; var bx = r3() * 1024 - sz / 2, by = r3() * 1024 - sz / 2;
      for (var ox = -1024; ox <= 1024; ox += 1024) for (var oy = -1024; oy <= 1024; oy += 1024) bg2.drawImage(A.starSprite(col2), bx + ox, by + oy, sz, sz);   // wrapped, so the tile repeats without a cut star
    }
    return { pano: png(c), faint: png(f), bright: png(b) };
  }

  // the asteroid belt: 1024 x 1024 texels, 100 texels to one unit of the model, rocks lit from the Sun in the middle
  function belt() {
    var S = 1024, c = A.canvas(S, S), g = c.getContext('2d'), r = A.rng(99), rk = A.rocks(), list = [];
    for (var i = 0; i < 900; i++) {
      var rad = 4.3 + (r() + r()) * 0.33;
      list.push({ a: r() * TAU, r: rad, s: 0.012 + r() * r() * 0.05, v: (r() * 6) | 0, t: 0.55 + r() * 0.45 });
    }
    g.fillStyle = '#b8a894';
    list.forEach(function (q) {
      var x = S / 2 + Math.cos(q.a) * q.r * 100, y = S / 2 - Math.sin(q.a) * q.r * 100, sz = Math.max(2.4, q.s * 100 * 1.6);
      if (sz < 3.4) { g.globalAlpha = Math.min(1, q.t * 1.0); g.fillRect(x - sz / 2, y - sz / 2, sz, sz); return; }
      g.globalAlpha = 1; g.save(); g.translate(x, y); g.rotate(Math.atan2(S / 2 - y, S / 2 - x)); g.drawImage(rk[q.v], -sz / 2, -sz / 2, sz, sz); g.restore();
    });
    return png(c);
  }

  window.BAKE = { surface: surface, sky: sky, belt: belt, ids: SB.list.map(function (b) { return b.id; }) };
})();
