/* Colouring Book: Ramadan pages (lantern, iftar, mosque, decorations, prayer mat, moon over the city). */
(function () {
  'use strict';
  var P = window.CBBooks.page;

  function sparkle(G, x, y, r) { return G.star(x, y, 4, r, r * 0.4); }

  // A classic fanous lantern in local units: centre x = 0, top of the hanging ring at y = 0.
  function fanous(R, G, o) {
    function T(s) { return G.tf(s, o); }
    R.add(T(G.ring(0, 30, 14, 30)), { rule: 'evenodd' });
    R.add(T(G.dome(0, 132, 150, 78)));
    R.detail(T(G.path('M-40 120 C-30 100 -12 92 0 90 C12 92 30 100 40 120')));
    R.add(T(G.path('M-105 130 H105 L140 180 H-140 Z')));
    R.detail(T(G.line([[-118, 155], [118, 155]])));
    R.add(T(G.poly([[-140, 180], [140, 180], [190, 300], [190, 490], [110, 600], [-110, 600], [-190, 490], [-190, 300]])));
    R.add(T(G.poly([[-125, 208], [-72, 208], [-72, 572], [-95, 572], [-163, 482], [-163, 308]])));
    R.add(T(G.arch(-50, 572, 100, 364, 70)));
    R.add(T(G.flipX(G.poly([[-125, 208], [-72, 208], [-72, 572], [-95, 572], [-163, 482], [-163, 308]]), 0)));
    R.add(T(G.rect(-26, 490, 52, 82)));
    R.add(T(G.path('M0 330 C15 375 45 405 40 440 C37 470 20 485 0 485 C-20 485 -37 470 -40 440 C-45 405 -15 375 0 330 Z')));
    R.add(T(G.path('M0 395 C8 420 22 435 20 452 C18 466 10 472 0 472 C-10 472 -18 466 -20 452 C-22 435 -8 420 0 395 Z')));
    R.add(T(G.path('M-110 600 H110 L75 650 H-75 Z')));
    R.add(T(G.path('M-60 650 H60 C55 690 30 715 0 730 C-30 715 -55 690 -60 650 Z')));
    R.add(T(G.circle(0, 757, 24)));
  }

  // 1. Lantern (easy)
  P('ramadan', 'lantern', 'Lantern', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    for (var y = 12; y < 118; y += 24) R.detail(G.ellipse(500, y, 7, 13));
    R.add(G.crescent(180, 190, 105, 45, -30, 90));
    [[835, 170, 42], [880, 420, 28], [110, 470, 30], [850, 690, 26], [160, 770, 36], [300, 70, 20]].forEach(function (s) { R.add(sparkle(G, s[0], s[1], s[2])); });
    fanous(R, G, { x: 500, y: 118 });
  });

  // 2. Dates and water for iftar
  P('ramadan', 'iftar', 'Iftar', function (R, G) {
    R.add(G.rect(0, 0, 1000, 600));
    R.add(G.arch(640, 470, 280, 400, 150));
    R.add(G.arch(668, 448, 224, 350, 125));
    R.add(G.crescent(782, 215, 46, 22, -14, 38));
    R.add(sparkle(G, 845, 340, 24));
    R.add(G.rect(615, 462, 330, 32));
    R.add(G.rect(0, 600, 1000, 400));
    R.detail(G.line([[0, 640], [1000, 640]]));
    R.add(G.rect(0, 880, 1000, 46));
    R.add(G.rect(0, 950, 1000, 22));
    // clay jug behind
    R.add(G.path('M640 470 C700 470 712 560 660 595 L650 575 C688 550 680 494 640 494 Z'));
    R.add(G.path('M545 662 C492 640 490 540 540 500 C555 488 560 470 556 450 H624 C620 470 625 488 640 500 C690 540 688 640 635 662 Z'));
    R.add(G.path('M509 560 C545 578 635 578 671 560 L673 598 C640 614 540 614 507 598 Z'));
    R.add(G.rrect(540, 428, 100, 26, 10));
    // plate of dates
    R.add(G.ellipse(320, 770, 255, 92));
    R.add(G.ellipse(320, 762, 198, 64));
    [[232, 742, -0.3], [318, 724, 0.18], [404, 744, -0.18], [272, 780, 0.22], [370, 786, -0.25]].forEach(function (d) {
      R.add(G.ellipse(d[0], d[1], 54, 27, d[2]));
      R.detail(G.tf(G.path('M-30 -6 C-10 -14 12 -14 28 -6'), { x: d[0], y: d[1], r: d[2] }));
    });
    // glass of water
    R.add(G.path('M700 520 H860 L842 848 C840 864 830 872 815 872 H745 C730 872 720 864 718 848 Z'));
    R.add(G.path('M708 610 H852 L840 842 C838 854 830 860 815 860 H745 C730 860 722 854 720 842 Z'));
    R.add(G.ellipse(780, 610, 72, 14));
    R.add(G.ellipse(780, 520, 80, 16));
  });

  // 3. Mosque seen from outside
  P('ramadan', 'mosque', 'Mosque', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.crescent(722, 150, 62, 28, -19, 53));
    [[120, 110, 26], [320, 80, 18], [620, 95, 22], [940, 300, 18], [60, 330, 18]].forEach(function (s) { R.add(sparkle(G, s[0], s[1], s[2])); });
    R.add(G.path('M0 850 C300 818 700 818 1000 850 V1000 H0 Z'));
    [130, 870].forEach(function (cx) {
      R.add(G.rect(cx - 32, 320, 64, 552));
      R.add(G.arch(cx - 13, 640, 26, 70, 18));
      R.add(G.rrect(cx - 50, 440, 100, 28, 8));
      R.add(G.dome(cx, 322, 84, 118));
      R.add(G.circle(cx, 192, 12));
    });
    R.add(G.rect(186, 640, 140, 232));
    R.add(G.rect(674, 640, 140, 232));
    R.add(G.dome(256, 641, 106, 110));
    R.add(G.dome(744, 641, 106, 110));
    R.add(G.arch(226, 800, 60, 104, 32));
    R.add(G.arch(714, 800, 60, 104, 32));
    R.add(G.rect(300, 560, 400, 312));
    R.detail(G.line([[300, 592], [700, 592]]));
    R.add(G.rect(342, 512, 316, 48));
    R.add(G.dome(500, 513, 300, 272));
    R.detail(G.line([[500, 241], [500, 222]]));
    R.add(G.circle(500, 222, 14));
    R.add(G.crescent(500, 178, 22, 10, -6, 18));
    R.add(G.arch(333, 770, 62, 124, 36));
    R.add(G.arch(605, 770, 62, 124, 36));
    R.add(G.star(500, 650, 8, 34, 26, -Math.PI / 2));
    R.add(G.arch(440, 872, 120, 172, 60));
    R.detail(G.line([[500, 872], [500, 708]]));
    R.add(G.path('M440 872 H560 L640 1000 H360 Z'));
    R.add(G.cloud(190, 900, 190, 74));
    R.add(G.cloud(810, 900, 190, 74));
  });

  // 4. Lanterns and flags for Ramadan
  P('ramadan', 'decorations', 'Decorations', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    function q(t) { var a = 1 - t; return [a * a * 0 + 2 * a * t * 500 + t * t * 1000, a * a * 70 + 2 * a * t * 250 + t * t * 70]; }
    var pts = []; for (var i = 0; i <= 40; i++) pts.push(q(i / 40));
    R.detail(G.line(pts));
    // strings to the lanterns
    var hang = [[0.22, 225, 380], [0.5, 500, 300], [0.78, 775, 420]];
    hang.forEach(function (h) { var p = q(h[0]); R.detail(G.line([p, [h[1], h[2]]])); });
    [[90, 860, 26], [330, 900, 20], [640, 880, 30], [910, 760, 22], [60, 560, 20], [930, 300, 18]].forEach(function (s) { R.add(sparkle(G, s[0], s[1], s[2])); });
    // flags
    for (var k = 0; k < 9; k++) {
      var t0 = 0.05 + k * 0.1, a = q(t0), b = q(t0 + 0.075), m = q(t0 + 0.0375);
      R.add(G.poly([a, b, [m[0], m[1] + 95]]));
    }
    // left: classic lantern
    fanous(R, G, { x: 225, y: 380, s: 0.48 });
    // middle: round lantern
    var cx = 500, y0 = 300;
    R.add(G.ring(cx, y0 + 16, 8, 18));
    R.add(G.path('M' + (cx - 46) + ' ' + (y0 + 74) + ' C' + (cx - 40) + ' ' + (y0 + 40) + ' ' + (cx - 20) + ' ' + (y0 + 32) + ' ' + cx + ' ' + (y0 + 30) + ' C' + (cx + 20) + ' ' + (y0 + 32) + ' ' + (cx + 40) + ' ' + (y0 + 40) + ' ' + (cx + 46) + ' ' + (y0 + 74) + ' Z'));
    R.add(G.ellipse(cx, y0 + 190, 128, 122));
    R.add(G.path('M' + (cx - 122) + ' ' + (y0 + 150) + ' C' + (cx - 60) + ' ' + (y0 + 172) + ' ' + (cx + 60) + ' ' + (y0 + 172) + ' ' + (cx + 122) + ' ' + (y0 + 150) +
      ' L' + (cx + 127) + ' ' + (y0 + 206) + ' C' + (cx + 60) + ' ' + (y0 + 228) + ' ' + (cx - 60) + ' ' + (y0 + 228) + ' ' + (cx - 127) + ' ' + (y0 + 206) + ' Z'));
    R.add(G.star(cx, y0 + 270, 8, 30, 22, -Math.PI / 2));
    R.add(G.star(cx, y0 + 110, 8, 28, 20, -Math.PI / 2));
    R.add(G.path('M' + (cx - 50) + ' ' + (y0 + 302) + ' H' + (cx + 50) + ' L' + (cx + 22) + ' ' + (y0 + 350) + ' H' + (cx - 22) + ' Z'));
    R.add(G.path('M' + (cx - 14) + ' ' + (y0 + 350) + ' H' + (cx + 14) + ' L' + cx + ' ' + (y0 + 420) + ' Z'));
    // right: tall hexagon lantern
    var rx = 775, ry = 420;
    R.add(G.ring(rx, ry + 14, 7, 16));
    R.add(G.path('M' + (rx - 60) + ' ' + (ry + 90) + ' L' + rx + ' ' + (ry + 26) + ' L' + (rx + 60) + ' ' + (ry + 90) + ' Z'));
    R.add(G.poly([[rx - 70, ry + 90], [rx + 70, ry + 90], [rx + 70, ry + 330], [rx - 70, ry + 330]]));
    R.add(G.arch(rx - 50, ry + 312, 42, 196, 40));
    R.add(G.arch(rx + 8, ry + 312, 42, 196, 40));
    R.add(G.poly([[rx - 82, ry + 330], [rx + 82, ry + 330], [rx + 52, ry + 372], [rx - 52, ry + 372]]));
    R.add(G.circle(rx, ry + 396, 20));
  });

  // 5. Prayer mat
  P('ramadan', 'prayer-mat', 'Prayer Mat', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    [200, 400, 600, 800].forEach(function (y) { R.detail(G.line([[0, y], [1000, y]]), { w: 0.5 }); });
    for (var x = 238; x <= 762; x += 22) { R.detail(G.line([[x, 80], [x, 36]]), { w: 0.55 }); R.detail(G.line([[x, 920], [x, 964]]), { w: 0.55 }); }
    R.add(G.rect(215, 80, 570, 840));
    R.add(G.rect(268, 133, 464, 734));
    R.add(G.arch(318, 780, 364, 600, 210));
    R.add(G.arch(350, 760, 300, 545, 185));
    R.detail(G.line([[500, 238], [500, 330]]));
    R.add(G.dome(500, 362, 70, 42));
    R.add(G.poly([[465, 362], [535, 362], [548, 420], [518, 470], [482, 470], [452, 420]]));
    R.add(G.path('M482 470 H518 L500 500 Z'));
    [[400, 822], [500, 822], [600, 822]].forEach(function (s) { R.add(G.star(s[0], s[1], 8, 30, 22, -Math.PI / 2)); });
    // border diamonds
    function dia(x, y) { R.add(G.poly([[x, y - 22], [x + 18, y], [x, y + 22], [x - 18, y]])); }
    for (var i = 0; i < 8; i++) { var yy = 200 + i * 86; dia(241.5, yy); dia(758.5, yy); }
    for (var j = 0; j < 4; j++) { var xx = 350 + j * 100; dia(xx, 106.5); dia(xx, 893.5); }
    [[241.5, 106.5], [758.5, 106.5], [241.5, 893.5], [758.5, 893.5]].forEach(function (c) { R.add(G.star(c[0], c[1], 8, 24, 17, -Math.PI / 2)); });
  });

  // 6. Moon over the city (hardest)
  P('ramadan', 'city', 'Night City', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.crescent(250, 230, 130, 58, -40, 112));
    [[520, 90, 26], [700, 200, 34], [880, 110, 22], [600, 330, 18], [90, 470, 20], [930, 380, 24], [420, 180, 16]].forEach(function (s) { R.add(sparkle(G, s[0], s[1], s[2])); });
    R.add(G.cloud(640, 450, 230, 64));
    // far skyline (one silhouette)
    R.add(G.path('M0 640 H60 V560 H120 V600 Q170 520 220 600 V560 H300 V620 H360 V520 C380 500 400 500 420 520 V620 H470 V580 Q520 500 570 580 V600 H640 V540 H700 V600 H760 V500 L780 470 L800 500 V600 H860 V570 Q900 520 940 570 V600 H1000 V760 H0 Z'));
    // front buildings
    R.add(G.rect(20, 650, 180, 270));
    R.add(G.dome(110, 651, 120, 110));
    R.add(G.rect(200, 700, 150, 220));
    R.add(G.rect(350, 620, 230, 300));
    R.add(G.dome(465, 621, 170, 160));
    R.add(G.rect(580, 690, 150, 230));
    R.add(G.rect(760, 450, 64, 470));
    R.add(G.rrect(744, 560, 96, 26, 8));
    R.add(G.dome(792, 451, 78, 110));
    R.add(G.rect(840, 680, 150, 240));
    // windows
    R.add(G.arch(80, 800, 60, 100, 30));
    R.add(G.rect(230, 740, 36, 50)); R.add(G.rect(284, 740, 36, 50)); R.add(G.rect(230, 820, 36, 50)); R.add(G.rect(284, 820, 36, 50));
    R.add(G.arch(385, 780, 50, 100, 26)); R.add(G.arch(495, 780, 50, 100, 26));
    R.add(G.arch(440, 920, 50, 90, 26));
    R.add(G.rect(610, 730, 36, 50)); R.add(G.rect(664, 730, 36, 50)); R.add(G.rect(610, 810, 36, 50)); R.add(G.rect(664, 810, 36, 50));
    R.add(G.arch(780, 680, 24, 60, 14));
    R.add(G.arch(880, 820, 70, 100, 34));
    R.add(G.path('M0 920 C250 900 750 900 1000 920 V1000 H0 Z'));
  });
})();
