/* Colouring Book: Nature pages (rainbow, camel, oasis, garden, birds, sea). Animals have no faces. */
(function () {
  'use strict';
  var P = window.CBBooks.page;
  var D = Math.PI / 180;

  function bird(G, x, y, s) { return G.tf(G.path('M0 0 Q20 -18 40 -4 Q60 -18 80 0 Q60 -8 40 6 Q20 -8 0 0 Z'), { x: x, y: y, s: s || 1 }); }
  function flower(R, G, x, y, r, n) {
    var parts = [];
    for (var i = 0; i < (n || 5); i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / (n || 5); parts.push({ c: [x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48] }); }
    R.add(G.union(parts, x, y));
    R.add(G.circle(x, y, r * 0.34));
  }
  function tuft(G, x, y, s) {
    s = s || 1;
    return G.poly([[x - 42 * s, y], [x - 34 * s, y - 46 * s], [x - 16 * s, y - 14 * s], [x - 2 * s, y - 66 * s], [x + 14 * s, y - 14 * s], [x + 34 * s, y - 50 * s], [x + 42 * s, y]]);
  }
  // Palm tree: curved trunk, fronds that droop, a bunch of dates.
  function palm(R, G, x, y, h, lean, s) {
    var tx = x + lean, ty = y - h, w0 = 30 * s, w1 = 17 * s, L = [], Rr = [];
    for (var i = 0; i <= 12; i++) {
      var t = i / 12, cx = x + lean * t * t, cy = y - h * t, w = w0 + (w1 - w0) * t;
      L.push([cx - w, cy]); Rr.unshift([cx + w, cy]);
    }
    R.add(G.poly(L.concat(Rr)));
    for (var k = 1; k < 9; k++) {
      var tt = k / 9, ccx = x + lean * tt * tt, ccy = y - h * tt, ww = w0 + (w1 - w0) * tt;
      R.detail(G.path('M' + (ccx - ww) + ' ' + (ccy + 6) + ' Q' + ccx + ' ' + (ccy - 8) + ' ' + (ccx + ww) + ' ' + (ccy + 6)));
    }
    R.add(G.union([{ c: [tx - 22 * s, ty + 40 * s, 17 * s] }, { c: [tx + 4 * s, ty + 48 * s, 17 * s] }, { c: [tx + 26 * s, ty + 36 * s, 16 * s] }, { c: [tx - 6 * s, ty + 22 * s, 17 * s] }, { c: [tx + 18 * s, ty + 14 * s, 15 * s] }], tx, ty + 32 * s));
    [-172, -138, -100, -64, -26, 14, 160].forEach(function (deg) {
      var a = deg * D, len = (deg === -100 ? 175 : 230) * s, ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len;
      var bend = 46 * s * (Math.cos(a) >= 0 ? 1 : -1);
      if (deg === -100) bend = -14 * s;
      R.add(G.leaf(tx, ty, ex, ey, 30 * s, bend));
      R.detail(G.rib(tx, ty, ex, ey, bend, 0.82));
    });
  }

  // 1. Rainbow hills (easy)
  P('nature', 'rainbow', 'Rainbow', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      R.add(G.poly([G.pol(830, 170, 98, a - 0.2), G.pol(830, 170, 150, a), G.pol(830, 170, 98, a + 0.2)]));
    }
    R.add(G.circle(830, 170, 80));
    [440, 390, 340, 290, 240].forEach(function (r) { R.add(G.annulus(500, 860, r - 50, r, Math.PI, Math.PI * 2)); });
    R.add(G.cloud(140, 810, 280, 120));
    R.add(G.cloud(860, 810, 280, 120));
    R.add(G.path('M0 870 C180 790 420 800 600 900 V1000 H0 Z'));
    R.add(G.path('M380 1000 C480 870 760 830 1000 880 V1000 Z'));
    flower(R, G, 160, 935, 44);
    flower(R, G, 620, 950, 38);
    flower(R, G, 860, 935, 44);
  });

  // 2. Camel in the desert
  P('nature', 'camel', 'Camel', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(230, 240, 95));
    R.add(bird(G, 560, 150, 1)); R.add(bird(G, 680, 210, 0.75));
    R.add(G.path('M0 620 C200 540 420 560 600 630 C760 580 900 570 1000 590 V1000 H0 Z'));
    // little palm far away
    R.add(G.path('M902 640 C906 600 910 560 908 520 L918 520 C922 560 918 600 916 640 Z'));
    R.add(G.leaf(913, 520, 860, 540, 12, -14)); R.add(G.leaf(913, 520, 966, 540, 12, 14)); R.add(G.leaf(913, 520, 900, 476, 10, -6)); R.add(G.leaf(913, 520, 948, 488, 10, 8));
    R.add(G.path('M0 820 C300 780 700 790 1000 830 V1000 H0 Z'));
    R.add(G.path('M120 900 C130 870 190 865 205 900 Z'));
    R.add(G.path('M780 930 C790 905 835 900 850 930 Z'));
    // tail and far legs sit behind the body
    R.add(G.cr([[306, 498], [292, 560], [276, 615, 1], [262, 668], [284, 672, 1], [292, 622], [306, 566], [320, 515]]));
    var farFront = [[634, 600], [664, 604], [662, 660], [666, 700], [662, 740], [660, 800], [666, 828, 1], [672, 838, 1], [628, 840, 1], [632, 800], [634, 740], [630, 700], [630, 660], [626, 615]];
    R.add(G.cr(farFront.map(function (p) { return [p[0] - 34, p[1], p[2]]; })));
    R.add(G.cr(farFront.map(function (p) { return [p[0] - 178, p[1], p[2]]; })));
    R.add(G.cr([[300, 478], [350, 410], [410, 355], [470, 330], [530, 348], [585, 400], [625, 445], [665, 462], [700, 452], [728, 420], [745, 370], [758, 320],
      [772, 292], [805, 276], [850, 284], [878, 302], [884, 322, 1], [868, 334], [830, 336], [800, 336], [784, 352], [778, 395], [768, 450], [748, 505], [716, 548],
      [704, 600], [700, 660], [704, 700], [700, 740], [698, 800], [704, 828, 1], [712, 838, 1], [668, 840, 1], [670, 800], [672, 740], [668, 700], [668, 660], [664, 615],
      [600, 628], [520, 634], [440, 626],
      [424, 650], [426, 700], [418, 750], [414, 800], [420, 828, 1], [426, 838, 1], [382, 840, 1], [386, 800], [384, 750], [380, 700], [364, 668], [338, 640], [306, 600], [290, 540]]));
    R.detail(G.path('M880 322 C830 380 760 420 700 448'));
    R.detail(G.path('M846 298 C852 312 852 324 846 334'));
    // saddle blanket with a stripe, a diamond and tassels
    R.add(G.path('M372 420 C420 368 520 352 600 440 L612 560 C520 588 470 588 380 560 Z'));
    R.add(G.path('M379 512 C470 538 540 538 606 512 L609 540 C520 566 470 566 380 540 Z'));
    R.add(G.poly([[492, 410], [526, 452], [492, 494], [458, 452]]));
    [392, 436, 480, 524, 568, 604].forEach(function (x, i) { var y = 562 + Math.sin(i / 5 * Math.PI) * 18; R.add(G.poly([[x - 14, y - 4], [x + 14, y - 4], [x, y + 30]])); });
  });

  // 3. Palm oasis
  P('nature', 'oasis', 'Oasis', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(810, 170, 80));
    R.add(bird(G, 420, 120, 1)); R.add(bird(G, 540, 170, 0.7));
    R.add(G.path('M0 560 C250 470 500 500 700 560 C820 520 920 510 1000 530 V1000 H0 Z'));
    R.add(G.path('M0 700 C300 660 700 670 1000 700 V1000 H0 Z'));
    R.add(G.ellipse(520, 830, 310, 95));
    R.add(G.ellipse(520, 826, 250, 62));
    palm(R, G, 230, 780, 430, 50, 1);
    palm(R, G, 800, 760, 360, -40, 0.85);
    R.add(tuft(G, 120, 905, 1.1)); R.add(tuft(G, 880, 920, 1)); R.add(tuft(G, 420, 700, 0.8));
    R.add(G.path('M600 760 C610 728 680 722 700 760 Z'));
    R.add(G.path('M290 940 C300 905 370 900 390 940 Z'));
  });

  // 4. Garden with tulips, daisies and a butterfly
  P('nature', 'garden', 'Garden', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(120, 130, 70));
    R.add(G.cloud(700, 150, 270, 96));
    R.add(G.union([{ c: [60, 560, 90] }, { c: [200, 530, 100] }, { c: [350, 555, 90] }, { c: [500, 530, 105] }, { c: [650, 550, 95] }, { c: [800, 525, 100] }, { c: [950, 555, 95] }, { b: [-40, 540, 1080, 120] }], 500, 640));
    R.add(G.rect(0, 600, 1000, 26));
    R.add(G.rect(0, 690, 1000, 26));
    for (var x = 25; x < 1000; x += 110) R.add(G.poly([[x, 545], [x + 30, 512], [x + 60, 545], [x + 60, 770], [x, 770]]));
    R.add(G.path('M0 750 C300 728 700 728 1000 750 V1000 H0 Z'));
    [[200, 960, 0.95], [500, 950, 1.1], [800, 960, 0.95]].forEach(function (t) {
      var x = t[0], y = t[1], s = t[2];
      R.add(G.path('M' + (x - 7 * s) + ' ' + y + ' C' + (x - 9 * s) + ' ' + (y - 100 * s) + ' ' + (x - 4 * s) + ' ' + (y - 160 * s) + ' ' + (x - 6 * s) + ' ' + (y - 210 * s) +
        ' H' + (x + 6 * s) + ' C' + (x + 8 * s) + ' ' + (y - 160 * s) + ' ' + (x + 9 * s) + ' ' + (y - 100 * s) + ' ' + (x + 7 * s) + ' ' + y + ' Z'));
      R.add(G.leaf(x, y - 20 * s, x - 75 * s, y - 140 * s, 22 * s, -10 * s));
      R.add(G.leaf(x, y - 40 * s, x + 70 * s, y - 150 * s, 20 * s, 10 * s));
      R.add(G.tf(G.path('M-58 -60 L-30 -32 L0 -78 L30 -32 L58 -60 C62 -10 40 22 0 24 C-40 22 -62 -10 -58 -60 Z'), { x: x, y: y - 228 * s, s: s }));
    });
    [[350, 860], [650, 870]].forEach(function (d) {
      R.detail(G.line([[d[0], d[1] + 40], [d[0], d[1] + 140]]));
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; R.add(G.ellipse(d[0] + Math.cos(a) * 56, d[1] + Math.sin(a) * 56, 44, 20, a)); }
      R.add(G.circle(d[0], d[1], 32));
    });
    // butterfly
    var bx = 480, by = 330;
    R.add(G.cr([[bx - 8, by - 10], [bx - 60, by - 110], [bx - 140, by - 120], [bx - 160, by - 60], [bx - 110, by - 10]]));
    R.add(G.cr([[bx - 8, by + 4], [bx - 100, by + 20], [bx - 120, by + 80], [bx - 70, by + 110], [bx - 20, by + 60]]));
    R.add(G.flipX(G.cr([[bx - 8, by - 10], [bx - 60, by - 110], [bx - 140, by - 120], [bx - 160, by - 60], [bx - 110, by - 10]]), bx));
    R.add(G.flipX(G.cr([[bx - 8, by + 4], [bx - 100, by + 20], [bx - 120, by + 80], [bx - 70, by + 110], [bx - 20, by + 60]]), bx));
    R.add(G.ellipse(bx, by + 10, 16, 70));
    R.detail(G.path('M' + (bx - 5) + ' ' + (by - 56) + ' C' + (bx - 15) + ' ' + (by - 100) + ' ' + (bx - 35) + ' ' + (by - 120) + ' ' + (bx - 50) + ' ' + (by - 124)));
    R.detail(G.path('M' + (bx + 5) + ' ' + (by - 56) + ' C' + (bx + 15) + ' ' + (by - 100) + ' ' + (bx + 35) + ' ' + (by - 120) + ' ' + (bx + 50) + ' ' + (by - 124)));
  });

  // 5. Birds on a blossom branch (no faces: just body, wing, tail and beak)
  P('nature', 'birds', 'Birds', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(720, 250, 170));
    R.add(G.cloud(200, 200, 260, 90));
    R.add(G.cr([[0, 540], [200, 560], [420, 556], [640, 522], [860, 470], [1000, 438, 1], [1000, 480, 1], [860, 514], [640, 566], [420, 602], [200, 606], [0, 592, 1]]));
    R.add(G.cr([[700, 520], [760, 440], [820, 370], [870, 330, 1], [884, 342, 1], [836, 392], [780, 460], [742, 510]]));
    [[140, 560, 80, 640, 1], [260, 600, 300, 690, -1], [520, 580, 470, 670, 1], [720, 545, 690, 640, -1], [860, 500, 930, 580, 1], [800, 380, 720, 330, -1], [860, 340, 920, 270, 1], [420, 560, 360, 470, -1]].forEach(function (l) {
      R.add(G.leaf(l[0], l[1], l[2], l[3], 30, 14 * l[4]));
      R.detail(G.rib(l[0], l[1], l[2], l[3], 14 * l[4], 0.8));
    });
    function birdOn(x, y, flip) {
      function T(s) { s = G.move(s, x, y); return flip ? G.flipX(s, x) : s; }
      R.add(T(G.poly([[-78, -62], [-178, -16], [-166, 12], [-70, -34]])));
      R.add(T(G.cr([[-95, -60], [-70, -110], [-20, -140], [8, -168], [42, -186], [80, -168], [88, -146], [86, -122], [80, -84], [52, -36], [0, -16], [-50, -22], [-90, -42]])));
      R.add(T(G.cr([[44, -132], [82, -118], [78, -80], [48, -38], [12, -28], [22, -86]])));
      R.add(T(G.cr([[-62, -104], [0, -118], [44, -88], [12, -56], [-50, -46], [-88, -68]])));
      R.add(T(G.poly([[84, -160], [126, -148], [84, -134]])));
      R.detail(T(G.line([[-14, -18], [-18, 8]])));
      R.detail(T(G.line([[14, -20], [14, 8]])));
    }
    birdOn(330, 562, false);
    birdOn(610, 532, true);
    [[230, 520], [500, 530], [930, 440]].forEach(function (f) { var parts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; parts.push({ c: [f[0] + Math.cos(a) * 26, f[1] + Math.sin(a) * 26, 22] }); } R.add(G.union(parts, f[0], f[1])); R.add(G.circle(f[0], f[1], 14)); });
  });

  // 6. Under the sea
  P('nature', 'sea', 'Under the Sea', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.path('M0 0 H1000 V80 C930 110 860 60 790 90 C720 120 650 70 580 95 C510 120 440 70 370 95 C300 120 230 70 160 92 C100 112 50 80 0 95 Z'));
    R.add(G.path('M0 850 C250 810 500 840 750 815 C850 805 950 815 1000 825 V1000 H0 Z'));
    [[90, 860], [300, 845], [880, 830]].forEach(function (b, i) {
      var h = [330, 260, 300][i], pts = [], back = [];
      for (var k = 0; k <= 10; k++) { var t = k / 10, y = b[1] - h * t, x = b[0] + Math.sin(t * 7 + i) * 26 * t, w = 22 * (1 - t * 0.75); pts.push([x - w, y]); back.unshift([x + w, y]); }
      R.add(G.cr(pts.concat(back)));
    });
    R.add(G.path('M640 840 C630 780 600 740 590 690 C585 660 610 655 615 690 C620 720 640 750 650 760 C650 700 650 650 660 610 C668 585 690 590 685 620 C678 660 675 720 680 760 C695 730 710 700 712 670 C716 645 740 648 736 675 C730 720 712 780 700 840 Z'));
    R.add(G.path('M420 880 C425 850 480 845 495 880 Z'));
    R.add(G.star(200, 920, 5, 60, 26, -Math.PI / 2));
    R.add(G.sector(800, 935, 60, Math.PI, Math.PI * 2));
    for (var r = 0; r < 5; r++) { var a = Math.PI + (r + 0.5) * Math.PI / 5; R.detail(G.line([[800, 935], G.pol(800, 935, 54, a)])); }
    function fish(x, y, s, flip, n) {
      function T(sh) { sh = G.tf(sh, { x: x, y: y, s: s }); return flip ? G.flipX(sh, x) : sh; }
      R.add(T(G.poly([[-80, 0], [-150, -50], [-135, 0], [-150, 50]])));
      R.add(T(G.cr([[-30, -48], [0, -100], [40, -60]])));
      R.add(T(G.cr([[-90, 0, 1], [-40, -52], [30, -60], [100, -26], [118, 0], [100, 26], [30, 60], [-40, 52]])));
      R.add(T(G.cr([[-10, -58], [20, -60], [26, 0], [20, 60], [-10, 58], [-4, 0]])));
      if (n > 1) R.add(T(G.cr([[46, -52], [70, -42], [74, 0], [70, 42], [46, 52], [52, 0]])));
    }
    fish(330, 330, 1.1, false, 2);
    fish(700, 500, 0.95, true, 2);
    fish(330, 640, 0.8, false, 1);
    [[560, 260, 20], [600, 200, 14], [580, 150, 10], [150, 470, 18], [170, 410, 12], [850, 330, 16]].forEach(function (b) { R.add(G.circle(b[0], b[1], b[2])); });
  });
})();
