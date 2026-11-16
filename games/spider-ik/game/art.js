/* Spider IK: the paint box. The game's look is the original Scratch art, kept as it is: dark caves, glowing orbs,
   white story silhouettes, and the spider with its eyes (the one agreed exception to "no faces", AGENTS.md rule 14).
   - The sprites (spinners, orbs, traps, blobs, portals) are the original SVGs in js/assets.js. Phaser's loader
     rasterises each once (load.svg) at the size it is shown on this screen, so they stay sharp without being redrawn.
   - The plain shapes (the spider's body, leg segments, buttons, joystick, the frame round each cave) are painted once
     into the engine's canvas textures (Kit.play.tex). Nothing is painted per frame.
   - The shapes the physics engine uses come from levels/shapes.json (tools/trace.js): traced from the same art.
   - The cave pictures stay WebP, a measured exception to "AVIF" (docs/phaser-standard.md section 3): re-encoding these
     flat, already small lossy WebPs with the standard's AVIF settings saved only 13% (150 KB to 131 KB over seven
     pictures, about 180 KB for all 21 levels), adds a second lossy pass, and AVIF decodes slower on a budget phone.
   SpArt.K = 3: one Scratch unit is three level pixels; a level is 1440 x 1080. */
(function () {
  'use strict';
  var D = window.SPIDER_ASSETS, K = 3, W = 1440, H = 1080;
  var themes = [['#8fe0bd', '#2f8f77'], ['#8fb4ff', '#2c62c7'], ['#cba6ff', '#7a4bd1'], ['#ff8f80', '#c42a2a'], ['#e4e4e4', '#808080']];
  var bgs = ['#0c1b1e', '#081225', '#201533', '#320e0e', '#151515'];
  var chap = function (n) { return n <= 5 ? 0 : n <= 10 ? 1 : n <= 15 ? 2 : n <= 20 ? 3 : 4; };
  var urls = {};
  function url(svg) { return urls[svg] || (urls[svg] = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))); }
  function dims(a) { var m = a.s.match(/width="([\d.]+)" height="([\d.]+)"/); return { w: +m[1], h: +m[2] }; }

  // every picture by its short name: spin0..22, orb0..13, elec0..4, portal0..1, tele0, costume3..5
  var A = {};
  function put(k, a) { var d = dims(a); A[k] = { a: a, x: a.x, y: a.y, r: a.r, w: d.w, h: d.h }; }
  D.A.spin.forEach(function (a, i) { put('spin' + i, a); });
  D.A.orb.forEach(function (a, i) { put('orb' + i, a); });
  D.A.elec.forEach(function (a, i) { put('elec' + i, a); });
  D.A.portal.forEach(function (a, i) { put('portal' + i, a); });
  put('tele0', D.A.tele[0]);
  ['costume3', 'costume4', 'costume5'].forEach(function (k) { put(k, D.A.blob[k]); });

  // canvas pixels per level pixel on this screen, at the closest the camera gets (cave.js zoomFor), at most 2 x 0.95
  function rs() {
    var w = window.innerWidth, h = window.innerHeight, z = Math.max(SpArt.zoomFor(w, h), SpArt.zoomFor(h, w));
    return Math.min(1.9, z * Kit.play.dpr());
  }
  // queue a picture with Phaser's loader, rasterised for the size it is mostly drawn at
  function queue(scene, k, size) {
    if (scene.textures.exists(k)) return;
    var m = A[k]; scene.load.svg(k, url(m.a.s), { scale: Math.max(0.5, K * size / 100 / m.r * rs()) });
  }
  // place an image the way Scratch drew it: (x, y) in Scratch units, direction (90 = upright), size in %
  function place(img, k, x, y, dir, size) {
    var m = A[k], t = img.scene.textures.get(k).getSourceImage(), ts = t.width / m.w;
    img.setPosition((x + 240) * K, (180 - y) * K).setAngle(dir - 90).setScale(K * size / 100 / m.r / ts);
    if (img._k !== k) { img._k = k; img.setOrigin(m.x / m.w, m.y / m.h); }
    return img;
  }

  // the painted pictures: one texture with frames, so the spider and its legs draw in one batch
  function paint(scene) {
    if (scene.textures.exists('sp')) return;
    var S = 4;                                                                // painted at 4x, shown at 1/4: sharp at any zoom
    Kit.play.tex(scene, 'sp', 512, 400, function (c) {
      c.scale(S, S);
      // the body (the old drawFace): a round black body, two horns and two white eyes
      c.save(); c.translate(32, 32);
      c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.fill();
      [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(s * 13, -8); c.lineTo(s * 10, -22); c.lineTo(s * 3, -14); c.closePath(); c.fill(); });
      c.fillStyle = '#fff'; [-1, 1].forEach(function (s) { c.beginPath(); c.ellipse(s * 6, -1, 4, 5.3, 0, 0, 7); c.fill(); });
      c.restore();
      // leg segments, tapering like a real spider's: the upper leg 6 wide at the hip to 4.6 at the knee, the lower leg
      // 4.6 to 2 at the foot (hip at x 71, knee 26 on; knee at x 70.5, foot 35 on)
      var taper = function (x0, cy, len, r0, r1) { c.fillStyle = '#000'; c.beginPath(); c.arc(x0, cy, r0, Math.PI / 2, Math.PI * 1.5); c.lineTo(x0 + len, cy - r1); c.arc(x0 + len, cy, r1, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill(); };
      taper(71, 9, 26, 3, 2.3); taper(70.5, 24, 35, 2.3, 1);
      // a plain white dot and square (joystick, tints, fades)
      c.fillStyle = '#fff'; c.beginPath(); c.arc(16, 80, 15, 0, 7); c.fill(); c.fillRect(40, 66, 28, 28);
    });
    var t = scene.textures.get('sp');
    t.add('body', 0, 0, 0, 64 * S, 64 * S);
    t.add('thigh', 0, 68 * S, 4 * S, 38 * S, 10 * S);
    t.add('shin', 0, 68 * S, 19 * S, 42 * S, 10 * S);
    t.add('dot', 0, 1 * S, 65 * S, 30 * S, 30 * S);
    t.add('px', 0, 44 * S, 70 * S, 20 * S, 20 * S);
    paintUi(scene);
  }

  // interface pictures, in design units (1920 x 1080): plates, icons, joystick, the burst of a blob
  function paintUi(scene) {
    var tex = Kit.play.tex;
    tex(scene, 'ui-plate', 150, 150, function (c) { c.fillStyle = 'rgba(8,18,20,.72)'; c.beginPath(); c.arc(75, 75, 70, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 4; c.stroke(); });
    var icon = function (k, draw) { tex(scene, k, 96, 96, function (c) { c.strokeStyle = '#f2f7f6'; c.fillStyle = '#f2f7f6'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }); };
    icon('ic-exit', function (c) { Kit.play.exitIcon(c, 24, '#f2f7f6', 2.4); });          // the way out of the game (kit's exit icon)
    icon('ic-retry', function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); });
    icon('ic-grid', function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); });
    icon('ic-snd', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); });
    icon('ic-mute', function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); });
    icon('ic-pause', function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); });
    icon('ic-close', function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); });
    icon('ic-play', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); });
    icon('ic-lock', function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); });
    icon('ic-tick', function (c) { c.beginPath(); c.moveTo(5, 12.5); c.lineTo(10, 17.5); c.lineTo(19, 7); c.stroke(); });
    icon('ic-up', function (c) { c.beginPath(); c.moveTo(12, 19); c.lineTo(12, 6); c.moveTo(6, 11); c.lineTo(12, 5); c.lineTo(18, 11); c.stroke(); });
    tex(scene, 'ui-pill', 340, 150, function (c) { c.fillStyle = 'rgba(8,18,20,.72)'; c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 4; c.beginPath(); c.roundRect(5, 5, 330, 140, 70); c.fill(); c.stroke(); });
    // touch controls: dark plates with white edges, readable on every cave (game-ui-ux: 3:1 for key visuals)
    tex(scene, 'ui-joy', 300, 300, function (c) { c.fillStyle = 'rgba(8,18,20,.18)'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 6; c.beginPath(); c.arc(150, 150, 145, 0, 7); c.fill(); c.stroke();
      c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.9)'; [[150, 34, 0], [266, 150, 1], [150, 266, 2], [34, 150, 3]].forEach(function (p) { c.save(); c.translate(p[0], p[1]); c.rotate(p[2] * Math.PI / 2); c.beginPath(); c.moveTo(-14, 8); c.lineTo(0, -8); c.lineTo(14, 8); c.closePath(); c.fill(); c.restore(); }); });
    tex(scene, 'ui-knob', 132, 132, function (c) { c.fillStyle = 'rgba(242,247,246,.85)'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 6; c.beginPath(); c.arc(66, 66, 56, 0, 7); c.fill(); });
    tex(scene, 'ui-jump', 240, 240, function (c) { c.fillStyle = 'rgba(8,18,20,.18)'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 5; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 6; c.beginPath(); c.arc(120, 120, 114, 0, 7); c.fill(); c.stroke(); });
    tex(scene, 'ui-ring', 160, 160, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.arc(80, 80, 72, 0, 7); c.stroke(); });
    tex(scene, 'ui-orb', 64, 64, function (c) { var g = c.createRadialGradient(22, 22, 2, 32, 32, 30); g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#8fe0bd'); g.addColorStop(1, '#2f8f77'); c.fillStyle = g; c.beginPath(); c.arc(32, 32, 28, 0, 7); c.fill(); });
    tex(scene, 'ui-orb0', 64, 64, function (c) { c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 5; c.beginPath(); c.arc(32, 32, 26, 0, 7); c.stroke(); });
    tex(scene, 'ui-card', 1500, 1040, function (c) { c.fillStyle = 'rgba(12,27,30,.94)'; c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 4; c.beginPath(); c.roundRect(2, 2, 1496, 1036, 60); c.fill(); c.stroke(); });
    tex(scene, 'ui-lv', 140, 140, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.fill(); });
    tex(scene, 'ui-lvo', 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, 132, 132, 30); c.stroke(); });
    tex(scene, 'ui-big', 280, 280, function (c) { c.fillStyle = '#8fe0bd'; c.beginPath(); c.arc(140, 140, 134, 0, 7); c.fill(); });
    // a blob's burst (the old effect): a filled disc, a ring and ten rays, white so each chapter tints it
    tex(scene, 'fx-burst', 400, 400, function (c) {
      c.translate(200, 200); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(0, 0, 133 * 0.7, 0, 7); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 133, 0, 7); c.stroke();
      for (var i = 0; i < 10; i++) { var a = i * 0.628; c.beginPath(); c.moveTo(Math.cos(a) * 80, Math.sin(a) * 80); c.lineTo(Math.cos(a) * 199, Math.sin(a) * 199); c.stroke(); }
    });
  }

  // the rough frame round a level, from the traced shapes (the same lines the physics uses), in the chapter's colour
  function edge(scene, n, e) {
    var k = 'edge-' + n;
    Kit.play.tex(scene, k, W, H, function (c) {
      c.fillStyle = bgs[chap(n)];
      var strip = function (a, fn) { c.beginPath(); a.forEach(function (v, i) { var p = fn(i * 4, v); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); };
      strip(e.top, function (x, v) { return [x, v]; }); c.lineTo(W, 0); c.lineTo(0, 0); c.fill();
      strip(e.bottom, function (x, v) { return [x, H - v]; }); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      strip(e.left, function (y, v) { return [v, y]; }); c.lineTo(0, H); c.lineTo(0, 0); c.fill();
      strip(e.right, function (y, v) { return [W - v, y]; }); c.lineTo(W, H); c.lineTo(W, 0); c.fill();
    });
    return k;
  }

  window.SpArt = {
    K: K, W: W, H: H, A: A, D: D, themes: themes, bgs: bgs, chap: chap,
    theme: function (n) { return themes[chap(n)]; }, bg: function (n) { return bgs[chap(n)]; },
    url: url, dims: dims, queue: queue, place: place, paint: paint, edge: edge,
    // how far the camera is in: phones see a wider slice of the cave; big screens never see past its edges (old zoomFor)
    zoomFor: function (w, h) { var z = Math.min(0.95, Math.max(0.62, Math.min(w, h) / 760)); return Math.max(z, w / W, h / H); }
  };
})();
