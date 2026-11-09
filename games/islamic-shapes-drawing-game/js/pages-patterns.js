/* Colouring Book: Islamic pattern pages, built from geometry (star rosettes, star-and-cross tiles,
   a ten-fold girih rosette, an arabesque frame and a twelve-point medallion). */
(function () {
  'use strict';
  var P = window.CBBooks.page;

  // Rosette with n points: outer disc, n star tips, n petals, an inner star and a centre.
  function rosette(R, G, cx, cy, n, Rad, o) {
    o = o || {};
    var st = -Math.PI / 2, ri = Rad * (o.ri || 0.64), rc = Rad * (o.rc || 0.3), step = 2 * Math.PI / n;
    if (!o.noDisc) R.add(G.circle(cx, cy, Rad));
    var tip = Rad * (o.tip || 0.94);
    for (var k = 0; k < n; k++) {
      var a = st + k * step;
      R.add(G.poly([G.pol(cx, cy, ri, a - step / 2), G.pol(cx, cy, tip, a), G.pol(cx, cy, ri, a + step / 2)]));
    }
    // the inner polygon split into n petals around an inner star
    for (var j = 0; j < n; j++) {
      var b = st + j * step;
      R.add(G.poly([G.pol(cx, cy, ri, b - step / 2), G.pol(cx, cy, ri, b + step / 2), G.pol(cx, cy, rc, b)]));
    }
    var pts = [];
    for (var i = 0; i < n; i++) { var c = st + i * step; pts.push(G.pol(cx, cy, rc, c), G.pol(cx, cy, ri, c + step / 2)); }
    R.add(G.poly(pts));
    if (o.centre !== false) R.add(G.circle(cx, cy, rc * 0.55));
  }

  // 1. Eight-point star (easy)
  P('patterns', 'star', 'Star', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    [[0, 0, 0], [1000, 0, 1], [1000, 1000, 2], [0, 1000, 3]].forEach(function (c) {
      var a0 = c[2] * Math.PI / 2;
      R.add(G.sector(c[0], c[1], 190, a0, a0 + Math.PI / 2));
      R.add(G.sector(c[0], c[1], 100, a0, a0 + Math.PI / 2));
    });
    R.add(G.circle(500, 500, 440));
    var ro = 410, ri = ro * 0.7654;
    for (var k = 0; k < 8; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 4;
      R.add(G.poly([G.pol(500, 500, ri, a - Math.PI / 8), G.pol(500, 500, ro, a), G.pol(500, 500, ri, a + Math.PI / 8)]));
    }
    var oct = []; for (var j = 0; j < 8; j++) oct.push(G.pol(500, 500, ri, -Math.PI / 2 + Math.PI / 8 + j * Math.PI / 4));
    R.add(G.poly(oct));
    R.add(G.star(500, 500, 8, 220, 168, -Math.PI / 2 + Math.PI / 8));
    R.add(G.circle(500, 500, 100));
  });

  // 2. Star-and-cross tiles
  P('patterns', 'tiles', 'Star Tiles', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
      var x = 200 + c * 300, y = 200 + r * 300;
      R.add(G.star(x, y, 8, 140, 140 * 0.7654, -Math.PI / 2));
      R.add(G.ngon(x, y, 8, 62, Math.PI / 8));
    }
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) R.add(G.star(350 + j * 300, 350 + i * 300, 4, 70, 30, -Math.PI / 2));
    [[50, 50], [950, 50], [50, 950], [950, 950]].forEach(function (p) { R.add(G.star(p[0], p[1], 4, 46, 20, -Math.PI / 2)); });
  });

  // 3. Six-fold rosette with six small stars around it
  P('patterns', 'hexa', 'Six Star', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.ngon(500, 500, 6, 470, 0));
    for (var k = 0; k < 6; k++) {
      var p = G.pol(500, 500, 375, -Math.PI / 2 + k * Math.PI / 3);
      R.add(G.star(p[0], p[1], 6, 92, 54, -Math.PI / 2));
      R.add(G.circle(p[0], p[1], 34));
    }
    rosette(R, G, 500, 500, 6, 270, { ri: 0.6, rc: 0.32 });
    [[70, 70], [930, 70], [70, 930], [930, 930]].forEach(function (q) { R.add(G.star(q[0], q[1], 6, 56, 32, -Math.PI / 2)); });
  });

  // 4. Ten-fold girih rosette
  P('patterns', 'girih', 'Girih Rose', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    [[0, 0], [1000, 0], [0, 1000], [1000, 1000]].forEach(function (c) { R.add(G.circle(c[0], c[1], 180)); R.add(G.star(c[0], c[1], 5, 120, 52, Math.atan2(500 - c[1], 500 - c[0]))); });
    R.add(G.circle(500, 500, 460));
    for (var k = 0; k < 10; k++) {
      var a = -Math.PI / 2 + k * Math.PI / 5;
      R.add(G.circle(G.pol(500, 500, 418, a + Math.PI / 10)[0], G.pol(500, 500, 418, a + Math.PI / 10)[1], 30));
    }
    rosette(R, G, 500, 500, 10, 400, { ri: 0.66, rc: 0.34, noDisc: true });
  });

  // 5. Arabesque frame: border palmettes, corner stars, a quatrefoil medallion and leafy corners
  P('patterns', 'arabesque', 'Arabesque', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    R.add(G.join(G.rect(30, 30, 940, 940), G.rect(140, 140, 720, 720)), { rule: 'evenodd' });
    function palmette(x, y, rot) {
      R.add(G.tf(G.path('M0 30 C-30 22 -40 -2 -30 -22 C-22 -10 -12 -8 -9 -12 C-12 -28 -5 -40 0 -48 C5 -40 12 -28 9 -12 C12 -8 22 -10 30 -22 C40 -2 30 22 0 30 Z'), { x: x, y: y, r: rot }));
    }
    for (var i = 0; i < 4; i++) {
      var t = 290 + i * 140;
      palmette(t, 85, Math.PI); palmette(t, 915, 0); palmette(85, t, Math.PI / 2); palmette(915, t, -Math.PI / 2);
    }
    [[85, 85], [915, 85], [85, 915], [915, 915]].forEach(function (c) { R.add(G.star(c[0], c[1], 8, 46, 34, -Math.PI / 2)); });
    // leafy sprays in the corners of the field
    [[140, 140, 1, 1], [860, 140, -1, 1], [140, 860, 1, -1], [860, 860, -1, -1]].forEach(function (c) {
      var x = c[0], y = c[1], sx = c[2], sy = c[3];
      R.add(G.leaf(x + sx * 10, y + sy * 10, x + sx * 190, y + sy * 60, 34, 22 * sx * sy));
      R.add(G.leaf(x + sx * 10, y + sy * 10, x + sx * 60, y + sy * 190, 34, -22 * sx * sy));
      R.add(G.leaf(x + sx * 10, y + sy * 10, x + sx * 150, y + sy * 150, 30, 0));
    });
    R.add(G.circle(500, 500, 270));
    for (var j = 0; j < 8; j++) { var a1 = j * Math.PI / 4, e = G.pol(500, 500, 262, a1); R.add(G.leaf(500, 500, e[0], e[1], 62, 0)); }
    for (var q = 0; q < 8; q++) { var p2 = G.pol(500, 500, 232, Math.PI / 8 + q * Math.PI / 4); R.add(G.circle(p2[0], p2[1], 26)); }
    R.add(G.star(500, 500, 8, 150, 115, -Math.PI / 2));
    R.add(G.ngon(500, 500, 8, 92, Math.PI / 8));
    R.add(G.circle(500, 500, 46));
  });

  // 6. Twelve-point medallion
  P('patterns', 'twelve', 'Twelve Star', function (R, G) {
    R.add(G.rect(0, 0, 1000, 1000));
    [[100, 100], [900, 100], [100, 900], [900, 900]].forEach(function (c) { R.add(G.star(c[0], c[1], 8, 90, 69, -Math.PI / 2)); R.add(G.circle(c[0], c[1], 36)); });
    R.add(G.circle(500, 500, 450));
    for (var k = 0; k < 12; k++) { var p = G.pol(500, 500, 450, -Math.PI / 2 + k * Math.PI / 6 + Math.PI / 12); R.add(G.circle(p[0], p[1], 34)); }
    rosette(R, G, 500, 500, 12, 410, { ri: 0.7, rc: 0.38 });
  });
})();
