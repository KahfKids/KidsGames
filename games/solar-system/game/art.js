/* Solar System: the paint box.
   Look: deep blue-violet space, warm gold for light and rewards, soft glass plates for the interface (the old game's
   look, kept). Pictures come two ways and nothing is painted per frame:
   - made once by tools/bake.js and loaded as picture files (art/): every world's surface, Earth's masks, the sky
     (panorama and two star layers) and the asteroid belt. AVIF where the WebView reads it, WebP where it does not (the
     kit tests once, Kit.play.ext()). Measured with the baker: 114 KB as AVIF against 219 KB as WebP over the
     whole set; the lossless mask is WebP only.
   - plain shapes painted at a fixed design size with Kit.play.tex: Saturn's rings, the Sun's glow and rays, the dashed
     choice ring, the interface plates and icons. tools/bake-art.js bakes them to art/baked/*.avif (Kit.play.art in Boot).
   The ball of each world is not a picture: planet.js shades it on the graphics chip from its surface picture. */
(function () {
  'use strict';
  var TAU = Math.PI * 2, tex = function () { return Kit.play.tex.apply(null, arguments); };
  // the extension of the pictures to load: AVIF where the WebView reads it (the kit tests once), WebP where not
  var ext = function () { return Kit.play.ext(); };

  // queue the world's pictures with the engine's loader (ids: the bodies to show)
  function queue(scene, ids) {
    var L = scene.load, p = 'art/';
    ids.forEach(function (id) { L.image('tex-' + id, p + 'tex-' + id + ext()); });
    L.image('mask-earth', p + 'mask-earth.webp');
    L.image('sky', p + 'sky' + ext()); L.image('sky-faint', p + 'sky-faint' + ext()); L.image('sky-bright', p + 'sky-bright' + ext());
    L.image('belt', p + 'belt' + ext());
  }

  // Saturn's rings: one ellipse (1024 x 512, radii 1.22 .. 2.3 planets) in two halves, the far one and the near one
  var RING = [[1.22, 120, 105, 90, 0], [1.26, 140, 125, 105, 0.18], [1.5, 160, 140, 115, 0.3], [1.53, 215, 195, 160, 0.8],
    [1.7, 232, 214, 178, 0.92], [1.86, 240, 222, 186, 0.95], [1.94, 220, 200, 165, 0.85], [1.955, 60, 50, 45, 0.08],
    [2.02, 60, 50, 45, 0.1], [2.035, 205, 188, 155, 0.7], [2.17, 215, 198, 165, 0.75], [2.18, 80, 70, 60, 0.15],
    [2.195, 200, 182, 150, 0.65], [2.26, 190, 172, 140, 0.55], [2.3, 170, 155, 130, 0]];

  function paint(scene) {
    if (scene.textures.exists('sun-rays') && scene.textures.get('ring').has('back')) return;
    tex(scene, 'ring', 1024, 512, function (c) {
      c.translate(512, 256); c.scale(1, 0.5);
      var g = c.createRadialGradient(0, 0, 512 * 1.22 / 2.3, 0, 0, 512);
      RING.forEach(function (s) { g.addColorStop((s[0] - 1.22) / (2.3 - 1.22), 'rgba(' + s[1] + ',' + s[2] + ',' + s[3] + ',' + (s[4] * 0.95) + ')'); });
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 512, 0, TAU); c.arc(0, 0, 512 * 1.22 / 2.3, 0, TAU, true); c.fill();
    });
    var t = scene.textures.get('ring'); if (!t.has('back')) { t.add('back', 0, 0, 0, 1024, 256); t.add('front', 0, 0, 256, 1024, 256); }
    // the Sun's glow and its rays (white-gold, drawn with the add blend)
    tex(scene, 'sun-glow', 256, 256, function (c) {
      var g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,246,220,1)'); g.addColorStop(0.16, 'rgba(255,214,120,.75)'); g.addColorStop(0.3, 'rgba(255,160,60,.32)');
      g.addColorStop(0.55, 'rgba(255,110,40,.1)'); g.addColorStop(1, 'rgba(255,90,30,0)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    });
    tex(scene, 'sun-rays', 512, 512, function (c) {
      var a = 42, i, rnd = function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
      c.translate(256, 256); c.globalCompositeOperation = 'lighter';
      for (i = 0; i < 22; i++) {
        var ang = i / 22 * TAU + rnd() * 0.2, len = 512 * (0.3 + rnd() * 0.2), w = 0.03 + rnd() * 0.05;
        var g = c.createRadialGradient(0, 0, 512 * 0.08, 0, 0, len);
        g.addColorStop(0, 'rgba(255,220,150,.35)'); g.addColorStop(1, 'rgba(255,170,80,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, len, ang - w, ang + w); c.closePath(); c.fill();
      }
    });

    // the dashed ring round a planet to pick (turns, pulses) and the soft glow that helps after mistakes
    tex(scene, 'choice-ring', 256, 256, function (c) {
      c.translate(128, 128); c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round'; c.setLineDash([18, 14]);
      c.shadowColor = '#fff'; c.shadowBlur = 8; c.beginPath(); c.arc(0, 0, 112, 0, TAU); c.stroke(); c.setLineDash([]); c.shadowBlur = 0;
      for (var i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.translate(112, 0); star8(c, 11, 0.5); c.fill(); c.restore(); }
    });
    tex(scene, 'hint-glow', 256, 256, function (c) {
      var g = c.createRadialGradient(128, 128, 128 * 0.4, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    });
  }


  // interface pictures, in design units (1920 x 1080): glass plates, icons, hearts, stars, the bits particles are made of
  function paintUi(scene) {
    if (scene.textures.exists('ui-plate')) return;
    var T = tex;
    var glass = function (k, w, h, r, fill, edge) { T(scene, k, w, h, function (c) { c.fillStyle = fill; c.strokeStyle = edge; c.lineWidth = 4; c.beginPath(); c.roundRect(3, 3, w - 6, h - 6, r); c.fill(); c.stroke(); }); };
    glass('ui-pill9', 150, 150, 72, 'rgba(10,10,34,.74)', 'rgba(255,225,160,.4)');
    glass('ui-panel9', 200, 200, 70, 'rgba(14,10,40,.8)', 'rgba(255,225,160,.42)');
    glass('ui-btn9', 150, 150, 72, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.34)');
    T(scene, 'ui-btn9p', 150, 150, function (c) { var g = c.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, '#ffd978'); g.addColorStop(1, '#f2b23c'); c.fillStyle = g; c.beginPath(); c.roundRect(3, 3, 144, 144, 72); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.stroke(); });
    T(scene, 'ui-plate', 150, 150, function (c) { c.fillStyle = 'rgba(10,10,34,.74)'; c.beginPath(); c.arc(75, 75, 70, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,225,160,.45)'; c.lineWidth = 4; c.stroke(); });
    T(scene, 'ui-big', 230, 230, function (c) { var g = c.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, '#ffd978'); g.addColorStop(1, '#f2b23c'); c.fillStyle = g; c.beginPath(); c.arc(115, 115, 110, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.stroke(); });
    T(scene, 'ui-tile', 150, 150, function (c) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, 142, 142, 34); c.fill(); });
    T(scene, 'ui-tile-o', 150, 150, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, 142, 142, 34); c.stroke(); });
    var icon = function (k, draw, col) { T(scene, k, 96, 96, function (c) { c.strokeStyle = col || '#fff6dc'; c.fillStyle = col || '#fff6dc'; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); }); };
    icon('ic-exit', function (c) { Kit.play.exitIcon(c, 24, '#fff6dc', 2.4); });
    icon('ic-back', function (c) { c.beginPath(); c.moveTo(19, 12); c.lineTo(6, 12); c.moveTo(11, 6); c.lineTo(5, 12); c.lineTo(11, 18); c.stroke(); });
    icon('ic-next', function (c) { c.beginPath(); c.moveTo(5, 12); c.lineTo(18, 12); c.moveTo(13, 6); c.lineTo(19, 12); c.lineTo(13, 18); c.stroke(); });
    icon('ic-retry', function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); });
    icon('ic-grid', function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); });
    var spk = function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); };
    icon('ic-snd', function (c) { spk(c); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); });
    icon('ic-mute', function (c) { spk(c); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); });
    icon('ic-pause', function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); });
    icon('ic-close', function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); });
    icon('ic-play', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); });
    icon('ic-play-d', function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); }, '#2a1606');
    icon('ic-lock', function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); });
    // explore: a planet with a ring round it
    icon('ic-orbit', function (c) { c.beginPath(); c.arc(12, 12, 5.4, 0, TAU); c.fill(); c.lineWidth = 2; c.beginPath(); c.moveTo(4.6, 14.9); c.bezierCurveTo(1.6, 17, 0.9, 18.7, 2, 19.4); c.bezierCurveTo(3.9, 20.6, 10.4, 18, 16.4, 13.5); c.bezierCurveTo(22.4, 9, 24.9, 5.3, 22, 4.6); c.bezierCurveTo(21, 4.4, 19.4, 4.9, 17.4, 6); c.stroke(); });
    var starPath = function (c) { c.beginPath(); for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? 31 : 46; c.lineTo(50 + Math.cos(a) * q, 50 + Math.sin(a) * q); } c.closePath(); };
    T(scene, 'ic-star', 100, 100, function (c) { starPath(c); c.fillStyle = '#f6c453'; c.fill(); c.strokeStyle = '#7a4a12'; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(50, 20); c.lineTo(59, 30); c.lineTo(71, 29); c.lineTo(70, 41); c.lineTo(80, 50); c.stroke(); });
    T(scene, 'ic-star0', 100, 100, function (c) { starPath(c); c.fillStyle = 'rgba(255,255,255,.2)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(); });
    T(scene, 'ic-star8', 100, 100, function (c) { starPath(c); c.fillStyle = '#fff'; c.fill(); });
    T(scene, 'ic-heart', 96, 96, function (c) { c.scale(4, 4); c.beginPath(); c.moveTo(12, 21); c.bezierCurveTo(12, 21, 4.5, 16.4, 2.4, 11.8); c.bezierCurveTo(0.9, 8.4, 3, 4.5, 6.8, 4.5); c.bezierCurveTo(9, 4.5, 10.4, 5.7, 12, 7.5); c.bezierCurveTo(13.6, 5.7, 15, 4.5, 17.2, 4.5); c.bezierCurveTo(21, 4.5, 23.1, 8.4, 21.6, 11.8); c.bezierCurveTo(19.5, 16.4, 12, 21, 12, 21); c.closePath(); c.fillStyle = '#ff5d73'; c.fill(); c.strokeStyle = '#7a1030'; c.lineWidth = 1.2; c.stroke(); });
    T(scene, 'fx-star', 64, 64, function (c) { c.translate(32, 32); c.fillStyle = '#fff'; star8(c, 29, 0.55); c.fill(); });
    T(scene, 'fx-spark', 32, 32, function (c) { var g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
    T(scene, 'streak', 128, 8, function (c) { var g = c.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.9)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 4); c.lineTo(128, 0.5); c.lineTo(128, 7.5); c.closePath(); c.fill(); });
    T(scene, 'px', 16, 16, function (c) { c.fillStyle = '#fff'; c.fillRect(0, 0, 16, 16); });
  }

  // an 8-point star (an Islamic geometric motif) as a path
  function star8(c, r, inner) {
    c.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
    c.closePath();
  }

  window.SolArt = { star8: star8, paintUi: paintUi, TAU: TAU, queue: queue, paint: paint, ext: ext };
})();
