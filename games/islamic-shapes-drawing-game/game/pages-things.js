/* Colouring Book: Things pages (kite, boat, house, milk and cookies, hot-air balloon, fruit basket). */
(function () {
  'use strict';
  var P = window.CBBooks.page;

  function bird(G, x, y, s) { return G.tf(G.path('M0 0 Q20 -18 40 -4 Q60 -18 80 0 Q60 -8 40 6 Q20 -8 0 0 Z'), { x: x, y: y, s: s || 1 }); }

  // 1. Kite (easy)
  P('things', 'kite', 'Kite', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    var kc = { r: -0.22, ox: 600, oy: 340 };
    function K(s) { return G.tf(s, kc); }
    var top = [600, 110], rt = [770, 320], bot = [600, 620], lf = [430, 320], mid = [600, 320];
    // string and tail are lines on the sky
    var tail = [bot, [560, 680], [600, 740], [560, 800], [600, 860]].map(function (p) { var q = G.tf([['M', p[0], p[1]]], kc)[0]; return [q[1], q[2]]; });
    R.detail(G.cr(tail, true));
    var m = G.tf([['M', 600, 320]], kc)[0];
    R.detail(G.path('M' + m[1] + ' ' + m[2] + ' C 420 520 260 620 130 900'));
    R.add(G.circle(140, 140, 75));
    R.add(G.cloud(820, 160, 260, 96));
    R.add(G.cloud(250, 430, 220, 80));
    R.add(K(G.poly([top, mid, lf])));
    R.add(K(G.poly([top, rt, mid])));
    R.add(K(G.poly([lf, mid, bot])));
    R.add(K(G.poly([mid, rt, bot])));
    [1, 2, 3].forEach(function (i) {
      var p = tail[i];
      R.add(G.poly([[p[0] - 38, p[1] - 24], [p[0], p[1] - 6], [p[0] + 38, p[1] - 24], [p[0] + 38, p[1] + 24], [p[0], p[1] + 6], [p[0] - 38, p[1] + 24]]));
    });
    R.add(G.path('M0 880 C200 800 420 810 600 900 V1000 H0 Z'));
    R.add(G.path('M420 1000 C520 880 780 850 1000 890 V1000 Z'));
  });

  // 2. Sailboat
  P('things', 'boat', 'Sailboat', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(830, 150, 72));
    R.add(G.cloud(220, 150, 250, 90));
    R.add(bird(G, 640, 140, 1)); R.add(bird(G, 740, 230, 0.75));
    R.add(G.path('M40 650 C110 560 250 560 330 650 Z'));
    R.add(G.path('M0 640 C150 620 300 660 500 640 C700 620 850 660 1000 640 V1000 H0 Z'));
    R.add(G.rect(492, 170, 18, 480));
    R.add(G.path('M508 172 L600 200 L508 228 Z'));
    R.add(G.path('M484 200 C430 330 380 480 290 612 H484 Z'));
    R.add(G.path('M520 240 C600 350 650 480 700 612 H520 Z'));
    R.add(G.path('M240 632 H790 C760 714 706 760 640 772 H380 C316 762 270 716 240 632 Z'));
    R.add(G.path('M252 664 H778 C772 678 765 690 758 700 H272 C264 690 257 678 252 664 Z'));
    [420, 515, 610].forEach(function (x) { R.add(G.circle(x, 734, 18)); });
    R.add(G.path('M0 820 C100 790 200 850 300 820 C400 790 500 850 600 820 C700 790 800 850 900 820 C950 805 980 812 1000 820 V1000 H0 Z'));
    R.add(G.path('M0 910 C100 880 200 940 300 910 C400 880 500 940 600 910 C700 880 800 940 900 910 C950 895 980 902 1000 910 V1000 H0 Z'));
  });

  // 3. House with a tree
  P('things', 'house', 'House', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(870, 130, 70));
    R.add(G.cloud(470, 130, 250, 86));
    R.add(G.path('M0 770 C300 735 700 735 1000 770 V1000 H0 Z'));
    R.add(G.path('M150 800 C160 700 165 600 160 500 H220 C214 600 220 700 236 800 Z'));
    R.add(G.union([{ c: [190, 420, 110] }, { c: [100, 470, 80] }, { c: [280, 470, 80] }, { c: [140, 350, 80] }, { c: [250, 350, 80] }, { c: [190, 520, 70] }], 190, 440));
    [[130, 430], [240, 400], [200, 500], [110, 520]].forEach(function (f) { R.add(G.circle(f[0], f[1], 22)); });
    R.add(G.rect(650, 270, 56, 150));
    R.add(G.rect(626, 252, 104, 30));
    R.add(G.rect(350, 460, 400, 320));
    R.add(G.poly([[318, 470], [550, 250], [782, 470]]));
    R.detail(G.line([[400, 420], [700, 420]]), { w: 0.5 });
    R.detail(G.line([[450, 370], [650, 370]]), { w: 0.5 });
    R.add(G.circle(550, 380, 34));
    R.add(G.rarch(505, 780, 90, 190));
    R.detail(G.circle(580, 700, 8), { fill: true });
    [[385, 520], [645, 520]].forEach(function (w) {
      R.add(G.rect(w[0] - 10, w[1] - 10, 120, 120));
      for (var i = 0; i < 4; i++) R.add(G.rect(w[0] + (i % 2) * 52 + 2, w[1] + Math.floor(i / 2) * 52 + 2, 46, 46));
    });
    R.add(G.path('M505 780 H595 L660 1000 H440 Z'));
    function flower(x, y, r) {
      var parts = []; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; parts.push({ c: [x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48] }); }
      R.add(G.union(parts, x, y)); R.add(G.circle(x, y, r * 0.34));
    }
    flower(380, 830, 42); flower(730, 840, 42); flower(860, 900, 46); flower(120, 900, 46);
  });

  // 4. A cup of milk and cookies
  P('things', 'milk', 'Milk & Cookies', function (R, G) {
    R.add(G.rect(0, 0, 1000, 620));
    R.add(G.rect(90, 90, 240, 240));
    R.add(G.rect(120, 120, 180, 180));
    R.add(G.star(210, 210, 8, 76, 58, -Math.PI / 2));
    R.add(G.circle(210, 210, 26));
    R.add(G.rect(0, 620, 1000, 380));
    R.add(G.rect(0, 620, 1000, 36));
    R.add(G.path('M480 450 C570 450 590 520 590 560 C590 630 545 670 480 670 V632 C525 632 552 600 552 560 C552 520 528 488 480 488 Z'));
    R.add(G.path('M240 400 H480 V700 C480 742 450 762 410 762 H310 C270 762 240 742 240 700 Z'));
    R.add(G.rect(240, 500, 240, 60));
    R.add(G.star(360, 640, 8, 50, 38, -Math.PI / 2));
    R.add(G.ellipse(360, 400, 120, 26));
    R.add(G.ellipse(360, 404, 102, 17));
    R.add(G.path('M620 420 C620 370 650 350 650 310 V262 H740 V310 C740 350 770 370 770 420 V740 C770 756 760 766 744 766 H646 C630 766 620 756 620 740 Z'));
    R.add(G.rrect(642, 222, 106, 46, 10));
    R.add(G.rect(620, 520, 150, 120));
    R.add(G.circle(695, 580, 36));
    R.add(G.ellipse(560, 880, 260, 70));
    R.add(G.ellipse(560, 872, 200, 46));
    [[470, 850], [640, 846], [555, 892]].forEach(function (c) {
      R.add(G.ellipse(c[0], c[1], 84, 40));
      [[-40, -8], [-6, -18], [30, -6], [-18, 14], [44, 14]].forEach(function (d) { R.detail(G.ellipse(c[0] + d[0], c[1] + d[1], 9, 6), { fill: true }); });
    });
  });

  // 5. Hot-air balloon
  P('things', 'balloon', 'Hot-Air Balloon', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.circle(130, 130, 66));
    R.add(G.cloud(820, 140, 250, 90)); R.add(G.cloud(170, 470, 200, 74)); R.add(G.cloud(860, 470, 190, 70));
    R.add(bird(G, 770, 270, 0.8)); R.add(bird(G, 840, 330, 0.6));
    R.add(G.path('M0 900 L170 650 L320 830 L520 600 L760 880 L870 760 L1000 860 V1000 H0 Z'));
    R.add(G.poly([[170, 650], [222, 726], [196, 712], [170, 734], [146, 712], [118, 726]]));
    R.add(G.poly([[520, 600], [583, 673], [552, 660], [522, 688], [492, 660], [460, 676]]));
    R.add(G.path('M0 920 C300 890 700 900 1000 920 V1000 H0 Z'));
    // envelope: five gores between meridians, a band and a skirt
    var cx = 500, top = 92;
    function W(y) { return y <= 400 ? Math.sqrt(Math.max(0, 232 * 232 - (y - 325) * (y - 325))) : 62 + (218 - 62) * Math.pow((560 - y) / 160, 1.25); }
    function meridian(u, y0, y1) { var pts = []; for (var k = 0; k <= 30; k++) { var y = y0 + (y1 - y0) * k / 30; pts.push([cx + u * W(y), y]); } return pts; }
    for (var i = 0; i < 5; i++) {
      var u0 = -1 + i * 0.4, u1 = u0 + 0.4;
      R.add(G.poly(meridian(u0, top, 440).concat(meridian(u1, top, 440).reverse())));
    }
    R.add(G.poly(meridian(-1, 440, 484).concat(meridian(1, 440, 484).reverse())));
    R.add(G.poly(meridian(-1, 484, 560).concat(meridian(1, 484, 560).reverse())));
    R.detail(G.line([[cx - 62, 560], [cx - 52, 640]])); R.detail(G.line([[cx + 62, 560], [cx + 52, 640]])); R.detail(G.line([[cx, 560], [cx, 640]]));
    R.add(G.rrect(cx - 62, 640, 124, 86, 12));
    R.detail(G.line([[cx - 62, 683], [cx + 62, 683]]), { w: 0.5 });
    R.add(G.rrect(cx - 72, 630, 144, 24, 10));
    // a small balloon far away
    R.add(G.cr([[820, 560], [780, 520], [775, 470], [820, 440], [865, 470], [860, 520]]));
    R.detail(G.line([[810, 562], [812, 585]])); R.detail(G.line([[830, 562], [828, 585]]));
    R.add(G.rect(806, 585, 28, 20));
  });

  // 6. Fruit basket
  P('things', 'fruit', 'Fruit Basket', function (R, G) {
    R.add(G.rect(0, 0, 1000, 640));
    R.add(G.rect(0, 640, 1000, 360));
    // pineapple: crown of leaves, a body with a criss-cross pattern
    var px = 330, py = 500, rx = 74, ry = 104;
    [[-70, -80, -10], [-30, -120, -6], [10, -130, 4], [48, -112, 8], [76, -70, 12]].forEach(function (l) { R.add(G.leaf(px, py - ry + 14, px + l[0], py - ry + l[1], 18, l[2])); });
    R.add(G.ellipse(px, py, rx, ry));
    for (var c = -3; c <= 3; c++) {
      [1, -1].forEach(function (sg) {
        // chord of the ellipse along y = sg * x * 1.2 + c * 52 (local coords)
        var pts = [];
        for (var k = 0; k <= 40; k++) { var x = -rx + k * rx / 20, y = sg * x * 1.2 + c * 52; if ((x * x) / (rx * rx) + (y * y) / (ry * ry) < 0.9) pts.push([px + x, py + y]); }
        if (pts.length > 1) R.detail(G.line([pts[0], pts[pts.length - 1]]), { w: 0.5 });
      });
    }
    R.add(G.tf(G.cr([[0, -110], [25, -95], [35, -50], [70, 10], [80, 60], [50, 100], [0, 110], [-50, 100], [-80, 60], [-70, 10], [-35, -50], [-25, -95]]), { x: 560, y: 470 }));
    R.add(G.rect(553, 330, 14, 34));
    R.add(G.leaf(567, 346, 640, 318, 16, 6));
    for (var r = 0; r < 4; r++) for (var c = 0; c <= 3 - r; c++) {
      if (r === 3) continue;
      R.add(G.circle(700 + c * 58 + r * 29, 450 + r * 50, 31));
    }
    R.add(G.circle(787, 600, 31));
    R.add(G.leaf(760, 420, 860, 340, 46, -14));
    function apple(x, y) {
      R.add(G.cr([[0, -60, 1], [40, -80], [80, -55], [92, -5], [72, 52], [32, 80], [0, 72], [-32, 80], [-72, 52], [-92, -5], [-80, -55], [-40, -80]].map(function (p) { return [p[0] + x, p[1] + y, p[2]]; })));
      R.add(G.rect(x - 6, y - 104, 12, 46));
      R.add(G.leaf(x + 6, y - 90, x + 70, y - 116, 16, -6));
    }
    apple(430, 560); apple(680, 590);
    R.add(G.circle(250, 600, 76));
    R.add(G.leaf(250, 524, 300, 500, 14, -5));
    R.add(G.rrect(150, 610, 700, 54, 27));
    R.add(G.path('M180 650 H820 L762 904 C752 932 722 948 690 948 H310 C278 948 248 932 238 904 Z'));
    R.add(G.path('M194 712 H806 L795 760 H205 Z'));
    R.add(G.path('M216 812 H784 L773 860 H227 Z'));
  });
})();
