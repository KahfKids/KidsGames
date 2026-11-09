/* Helping Home: the salah station's figure (window.SALAHFIG). Made with Colorfigures (MIT).
   A prayer mat on a patch of wooden floor, with a qibla compass beside it.

   How it really works (what the child does):
     1 ROLL OUT  the mat starts rolled up at its head end (the end with the arch, toward the qibla). It unrolls toward
                 the child: the flat part grows from the head and the roll moves to the foot end, getting thinner
                 (radius from the wound length: r = sqrt(r0^2 + remaining x thickness / pi)). Pattern face up, so
                 the outside of the roll shows the mat's plain woven back.
     2 QIBLA     a flat brass compass on the floor. The child turns its dial until the Kaaba mark points along the
                 mat to its head end, and it clicks. With a saved location, the dial's north tick sits at the real
                 qibla bearing from north (HHPrayer.qibla()); otherwise the direction is decorative.
     3 PRAY      the parts of the body that touch the mat glow on it for each position: two feet standing; seven
                 parts in sujood (forehead with nose, two palms, two knees, the toes of both feet); sitting: the
                 knees, the left foot laid under the body and the toes of the upright right foot. The points come
                 from the praying child's skeleton (pray/salah-kid.js), who is drawn in a layer above the mat.

   Parts: FLOOR board . MAT slab (pile top, woven back, cream border, terracotta line, green field, mihrab arch with an
   eight-point star, eight khatam stars, fringe at both ends) . ROLL (cylinder of the wound mat with a spiral end) .
   COMPASS (brass case, bezel, cream dial with ticks, optional north tick, turning pointer with a Kaaba mark, centre
   pin, glass) . CONTACTS (foot, hand, knee, forehead and toe imprints).
   Coordinates: x = depth (front at x = 140), y = width, z = up; 1 unit = 1 cm. The child faces -x (the head end).
   Seen from behind, the child's right is -y. */
(function () {
  'use strict';
  var FW = 140, FD = 118, FT = 3;                                   // floor board
  var MX0 = 14, MX1 = 126, MY0 = 10, MY1 = 74, YC = 42, ML = MX1 - MX0, MT = .9, TOP = FT + MT;
  var QX = 27, QY = 97, QR = 12.5, QZ = FT + 3.6;                   // compass centre, radius, dial height
  var FLOOR = { l: '#ecd2a8', m: '#d6b484', d: '#a7814f' };
  var BORDER = '#f2e3c2', LINE = '#c8644a', FIELD = '#2f6f5e', FIELD2 = '#28604f', ARCH = '#22564a', STAR = '#e8b64a';
  var BACK = { l: '#cfae84', m: '#b38f63', d: '#7e6140' };
  var BRASS = { l: '#f0cf72', m: '#cfa74a', d: '#8b6a24' };
  var GLOWC = '#ffd866';

  var z1 = function (pts, dz) { return pts.map(function (p) { return [p[0], p[1], TOP + (dz || .02)]; }); };
  var flat = function (pts, col, w, dz) { return shape(z1(pts, dz), col, w == null ? .7 : w); };
  var rectXY = function (x0, y0, x1, y1) { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; };
  // a shape in a local frame on the mat: u forward (toward the qibla, -x), v to the side (+y), centred (cx, cy)
  var loc = function (cx, cy, pts) { return pts.map(function (p) { return [cx - p[0], cy + p[1]]; }); };
  var ell = function (ru, rv, n, cu, cv) { var o = []; n = n || 14; for (var i = 0; i < n; i++) { var a = i / n * 2 * Math.PI; o.push([(cu || 0) + ru * Math.cos(a), (cv || 0) + rv * Math.sin(a)]); } return o; };
  var k1 = function () { return Math.hypot.apply(null, sub(P(0, 0, 1), P(0, 0, 0)).slice(0, 2)); };

  function star8(cx, cy, R) { var o = []; for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8, r = i % 2 ? R * .765 : R; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }

  /* ---------- the mat: flat part from the head to the roll, pattern clipped to what is unrolled ---------- */
  function radius(roll) { return Math.sqrt(1.4 * 1.4 + (1 - roll) * ML * MT / Math.PI); }
  function mat(st) {
    var roll = st.rollE, xr = MX0 + roll * ML, s = '';
    if (xr > MX0 + .5) {
      // slab: sides (woven back colour), pile top
      var x1 = Math.min(xr, MX1);
      s += box(MX0, MY0, FT, x1, MY1, TOP, BACK, toneI, .8);
      var pat = '';
      pat += flat(rectXY(MX0, MY0, MX1, MY1), BORDER, 0);
      pat += flat(rectXY(MX0 + 2.2, MY0 + 2.2, MX1 - 2.2, MY1 - 2.2), 'none', 0) + line(z1(rectXY(MX0 + 2.2, MY0 + 2.2, MX1 - 2.2, MY1 - 2.2).concat([[MX0 + 2.2, MY0 + 2.2]])), .9).replace(INK, LINE);
      pat += flat(rectXY(MX0 + 5, MY0 + 5, MX1 - 5, MY1 - 5), FIELD, .9);
      // little diamonds along the border
      for (var i = 0; i < 14; i++) { var bx = MX0 + 8 + i * (ML - 16) / 13;
        [MY0 + 3.6, MY1 - 3.6].forEach(function (by) { pat += flat([[bx - 1.6, by], [bx, by - 1.1], [bx + 1.6, by], [bx, by + 1.1]], LINE, 0); }); }
      // mihrab arch at the head end (pointed toward the qibla)
      var arch = [], A0 = MX0 + 44, AW = 21;
      arch.push([A0, YC - AW], [MX0 + 24, YC - AW]);
      for (var k = 0; k <= 10; k++) { var t = k / 10, ang = Math.PI * t; arch.push([MX0 + 24 - 15 * Math.sin(ang) - 2.5 * Math.sin(ang) * Math.sin(ang), YC - AW * Math.cos(ang)]); }
      arch.push([MX0 + 24, YC + AW], [A0, YC + AW]);
      pat += flat(arch, ARCH, .9);
      var inner = arch.map(function (p) { return [p[0] + (p[0] < MX0 + 24 ? 2.2 : 0) - (p[0] >= A0 ? 0 : 0), YC + (p[1] - YC) * .86]; });
      pat += line(z1(inner.slice(1, -1)), .8).replace(INK, BORDER);
      pat += flat(star8(MX0 + 22, YC, 6.2), STAR, .7) + flat(ell(2, 2, 10, 0, 0).map(function (p) { return [MX0 + 22 + p[0], YC + p[1]]; }), FIELD, .5);
      // a lamp hanging in the arch (a plain shape, no figure)
      pat += line(z1([[MX0 + 28.5, YC], [MX0 + 33, YC]]), .7).replace(INK, BORDER) + flat([[MX0 + 33, YC - 2.2], [MX0 + 37.5, YC - 1.4], [MX0 + 37.5, YC + 1.4], [MX0 + 33, YC + 2.2]], STAR, .6);
      // field: eight khatam stars between the arch and the foot end, and a band under the arch
      pat += flat(rectXY(A0, MY0 + 5, A0 + 1.5, MY1 - 5), LINE, .5);
      [55, 74, 93, 112].forEach(function (sx) { [YC - 14, YC + 14].forEach(function (sy) {
        pat += flat(star8(sx, sy, 4.6), FIELD2, .6) + flat(ell(1.3, 1.3, 8).map(function (p) { return [sx + p[0], sy + p[1]]; }), STAR, .4); }); });
      [64.5, 83.5, 102.5].forEach(function (sx) { pat += flat([[sx - 2.2, YC], [sx, YC - 2.2], [sx + 2.2, YC], [sx, YC + 2.2]], STAR, .5); });
      s += clipTo(z1(rectXY(MX0, MY0 - 1, x1, MY1 + 1), .01), pat);
      // fringe at the head (always out) and at the foot (once unrolled)
      var fr = function (x0, dx) { var d = ''; for (var j = 0; j < 15; j++) { var fy = MY0 + 3 + j * (MY1 - MY0 - 6) / 14, a = P(x0, fy, FT + .2), b = P(x0 + dx, fy + (j % 2 ? .4 : -.4), FT + .1);
        d += 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); } return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width=".7" stroke-linecap="round"/>'; };
      s += fr(MX0, -3.2);
      if (roll > .995) s += fr(MX1, 3.2);
      s += hullInk(z1(rectXY(MX0, MY0, x1, MY1), 0).concat(rectXY(MX0, MY0, x1, MY1).map(function (p) { return [p[0], p[1], FT]; })), 1.6);
    }
    return s;
  }
  function theRoll(st) {
    var roll = st.rollE; if (roll > .995) return '';
    var R = radius(roll), cx = MX0 + roll * ML + R * (1 - roll) * .9, zc = FT + R, capY = vis([0, 1, 0]) ? MY1 : MY0;
    var s = rod([cx, MY0, zc], [cx, MY1, zc], R, BACK, toneI, 1.4);
    // woven lines along the roll and the spiral of the wound mat on the end you see
    var d = '';
    for (var j = 1; j < 8; j++) { var a = P(cx, MY0 + j * (MY1 - MY0) / 8, zc + R), b = P(cx, MY0 + j * (MY1 - MY0) / 8, zc + R * .55);
      if (vis([0, 0, 1])) d += 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); }
    s += '<path d="' + d + '" fill="none" stroke="' + BACK.d + '" stroke-width=".6"/>';
    var sp = [], turns = 1 + 3 * (1 - roll);
    for (var i = 0; i <= 40; i++) { var t = i / 40, ang = t * turns * 2 * Math.PI, r = 1 + (R - 1.2) * t; sp.push([cx + r * Math.cos(ang), capY, zc + r * Math.sin(ang)]); }
    s += line(sp, .8);
    // the border colour shows along the spiral's edge
    s += line(sp.slice(-12), 1.6).replace(INK, BORDER) + line(sp.slice(-12), .6);
    return { at: [cx, YC, zc], box: [[cx - R, MY0, FT], [cx + R, MY1, FT + 2 * R]], svg: act('mat', s) };
  }

  /* ---------- where the body touches the mat: taken from the child's own skeleton (pray/salah-kid.js), so the glow
     sits exactly under the feet, knees, palms, toes and forehead of the figure ---------- */
  // a shape in a local frame on the mat: u along the direction `a` (radians, world), v to its left; centred (cx, cy)
  var locA = function (cx, cy, a, pts) { var c = Math.cos(a), s = Math.sin(a); return pts.map(function (p) { return [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]; }); };
  var FOOT = (function () { var o = []; for (var i = 0; i < 16; i++) { var a = i / 16 * 2 * Math.PI, u = 5.4 * Math.cos(a), w = 1.75 + .95 * (u + 5.4) / 10.8; o.push([u, w * Math.sin(a)]); } return o; })();
  function foot(c) {
    var s = flat(locA(c.x, c.y, c.a, FOOT), GLOWC, .8, .06);
    if (c.toes) [[5.9, -1.6, .75], [6.4, -.4, .85], [6.3, .8, .7], [5.9, 1.8, .6]].forEach(function (t) { s += flat(locA(c.x, c.y, c.a, ell(t[2], t[2] * .9, 8, t[0], t[1])), GLOWC, .5, .06); });
    return s;
  }
  function toes(c) { var s = ''; [[0, -1.9, .85], [.5, -.6, .95], [.4, .7, .85], [0, 1.9, .75]].forEach(function (t) { s += flat(locA(c.x, c.y, c.a, ell(t[2] * 1.3, t[2], 8, t[0], t[1])), GLOWC, .5, .06); }); return s; }
  function hand(c) {
    var sd = c.side || 1, s = flat(locA(c.x, c.y, c.a, ell(2.9, 2.4, 14, -1.2, 0)), GLOWC, .8, .06);
    [-1.75, -.6, .55, 1.65].forEach(function (v, i) { var L = [3.6, 4.3, 4.1, 3.3][i]; s += flat(locA(c.x, c.y, c.a, ell(L / 2, .55, 10, 1.1 + L / 2, v)), GLOWC, .5, .06); });
    s += flat(locA(c.x, c.y, c.a, [[-.6, -sd * 2.0], [-2.9 + 2.3, -sd * 3.9], [-.6 + 1.2, -sd * 3.3], [.4, -sd * 1.3]]), GLOWC, .5, .06);
    return s;
  }
  var dotG = function (c, ru, rv) { return flat(locA(c.x, c.y, c.a || 0, ell(ru, rv, 14)), GLOWC, .8, .06); };
  var SIZE = { foot: 6, toes: 3.8, knee: 4.5, hand: 5, head: 5 };
  var cCache = {};
  function contactsOf(name) { if (!name || !window.SALAHKID) return []; var k = name + SALAHKID.styleKey; return cCache[k] || (cCache[k] = SALAHKID.contacts(name)); }
  function contactSVG(name) {
    return contactsOf(name).map(function (c) {
      return c.kind === 'foot' ? foot(c) : c.kind === 'toes' ? toes(c) : c.kind === 'hand' ? hand(c) : c.kind === 'knee' ? dotG(c, 3.2, 3.2) : dotG(c, 3.9, 3.1) + dotG({ x: c.x + 3.2 * Math.cos(c.a || 0), y: c.y + 3.2 * Math.sin(c.a || 0) }, 1.2, 1);
    }).join('');
  }

  /* ---------- the compass ---------- */
  function compass(st) {
    var s = '', dz = QZ + .15, kk = k1();
    s += cyl(QX, QY, FT, QZ, QR, BRASS, toneI, 1.6, 32);
    s += shape(on(PZ(QZ + .05), ellUV(QX, QY, QR - 1.2, QR - 1.2, 32)), st.qibla ? '#fff0b8' : '#fbf4e2', .9);
    if (st.qibla) s += line(on(PZ(QZ + .06), ellUV(QX, QY, QR - 2, QR - 2, 32)).concat([[QX + QR - 2, QY, QZ + .06]]), 1.6).replace(INK, '#2f6f5e');
    // ticks every 45 degrees, turning with the dial
    var d = '';
    for (var i = 0; i < 16; i++) { var a = st.qa + i * Math.PI / 8, r0 = QR - 1.6, r1 = QR - (i % 4 ? 2.3 : 3.1);
      var A = P(QX + r0 * Math.cos(a), QY + r0 * Math.sin(a), dz), B = P(QX + r1 * Math.cos(a), QY + r1 * Math.sin(a), dz);
      d += 'M' + f(A[0]) + ' ' + f(A[1]) + 'L' + f(B[0]) + ' ' + f(B[1]); }
    s += '<path d="' + d + '" stroke="' + INK + '" stroke-width=".7" stroke-linecap="round"/>';
    // north tick: only with a real bearing (north sits at the qibla angle minus the bearing, clockwise as seen from above)
    if (st.bearing != null) { var an = st.qa - st.bearing * Math.PI / 180, nx = Math.cos(an), ny = Math.sin(an), px = -ny, py = nx;
      s += shape([[QX + nx * (QR - 1.5), QY + ny * (QR - 1.5), dz], [QX + nx * (QR - 4.2) + px * 1.2, QY + ny * (QR - 4.2) + py * 1.2, dz], [QX + nx * (QR - 4.2) - px * 1.2, QY + ny * (QR - 4.2) - py * 1.2, dz]], '#c8644a', .6); }
    // the pointer: a shaft from the centre and the Kaaba mark at its end
    var ux = Math.cos(st.qa), uy = Math.sin(st.qa), vx = -uy, vy = ux;
    var at = function (u, v) { return [QX + ux * u + vx * v, QY + uy * u + vy * v, dz + .1]; };
    s += shape([at(-4.6, -.9), at(2.6, -.9), at(2.6, .9), at(-4.6, .9)], '#c8644a', .7);
    s += shape([at(-4.6, 0), at(-6.2, -1.6), at(-5.6, 0), at(-6.2, 1.6)], '#c8644a', .6);
    s += shape([at(2.4, -2.1), at(6.6, -2.1), at(6.6, 2.1), at(2.4, 2.1)], '#1f1c1a', .8);
    s += line([at(3.4, -2.1), at(3.4, 2.1)], 1.4).replace(INK, BRASS.l);
    var c = P(QX, QY, dz + .2);
    s += '<circle cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" r="' + f(.9 * kk) + '" fill="' + BRASS.m + '" stroke="' + INK + '" stroke-width=".7"/>';
    // glass: a faint sheen and two streaks
    s += '<path d="' + pd(on(PZ(QZ + .3), ellUV(QX, QY, QR - 1.2, QR - 1.2, 28))) + '" fill="#cfe9f0" opacity=".16"/>';
    s += line([[QX + 3, QY - 5.5, QZ + .35], [QX + 5.5, QY - 2.5, QZ + .35]], 1.1).replace(INK, '#ffffff').replace('/>', ' opacity=".55"/>');
    return { at: [QX, QY, FT + 2], box: [[QX - QR, QY - QR, FT], [QX + QR, QY + QR, QZ]], svg: act('compass', s) };
  }

  /* ---------- FX: halos and pulses (no filter, CSS only) ---------- */
  function halo(x, y, z, r, cls) {
    var pts = on(PZ(z), ellUV(x, y, r, r, 20));
    return '<path class="' + (cls || 'ps-pulse') + '" d="' + pd(pts) + '" fill="url(#sfGlow)"/>';
  }
  function fx(st) {
    var s = '<defs><radialGradient id="sfGlow"><stop offset="0" stop-color="#fff2b0" stop-opacity=".95"/><stop offset=".55" stop-color="#ffd866" stop-opacity=".55"/><stop offset="1" stop-color="#ffd866" stop-opacity="0"/></radialGradient></defs>';
    if (st.phase === 'mat') { var R = radius(st.rollE); s += halo(MX0 + R, YC, FT + .1, 30); }
    if (st.phase === 'qibla' && !st.qibla) s += halo(QX, QY, FT + .1, QR + 7) +
      '<path class="ps-pulse" d="' + pd(on(PZ(QZ + .2), ellUV(QX, QY, QR + 2.2, QR + 2.2, 36))) + '" fill="none" stroke="#e0a21c" stroke-width="2.4" stroke-dasharray="5 4" stroke-linecap="round"/>';
    if (st.qibla && (st.phase === 'qibla' || st.phase === 'ready')) s += halo(MX0 + 22, YC, TOP + .1, 17);
    if (st.phase === 'pray' || st.phase === 'ready') contactsOf(st.contacts).forEach(function (c) { s += halo(c.x, c.y, TOP + .1, SIZE[c.kind] + 2.5); });
    return s;
  }

  function scene(st) {
    var s = board(0, 0, FW, FD, FT, 8, FLOOR);
    // floor boards: seams along x
    var d = ''; for (var j = 1; j < 6; j++) { var a = P(0.6, j * FD / 6, FT + .02), b = P(FW - .6, j * FD / 6, FT + .02); d += 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); }
    s += '<path d="' + d + '" stroke="' + FLOOR.d + '" stroke-width=".7" fill="none"/>';
    var clipF = boardTop(0, 0, FW, FD, FT, 8);
    var sh = st.phase === 'pray' || st.phase === 'ready' || st.phase === 'done' ? '' : castShadow(on(PZ(FT), ellUV(QX, QY, QR, QR, 16)).concat(on(PZ(QZ), ellUV(QX, QY, QR, QR, 16))), FT);
    if (st.rollE < .995) { var R = radius(st.rollE), cx = MX0 + st.rollE * ML + R * (1 - st.rollE) * .9;
      sh += castShadow([[cx - R, MY0, FT], [cx + R, MY0, FT], [cx - R, MY1, FT], [cx + R, MY1, FT], [cx, MY0, FT + 2 * R], [cx, MY1, FT + 2 * R]], FT); }
    s += clipTo(clipF, sh);
    s += '<!--DYN-->';
    var m = mat(st) + (st.rollE > .995 && (st.phase === 'pray' || st.phase === 'ready') ? contactSVG(st.contacts) : '');
    var r = theRoll(st);                                   // the roll lies on the mat: always after it
    // while praying the compass has done its job: it is left out, so the picture is only the mat and the child
    var praying = st.phase === 'pray' || st.phase === 'ready' || st.phase === 'done';
    var parts = [{ at: [(MX0 + MX1) / 2, YC, FT], box: [[MX0 - 4, MY0, FT], [MX1 + 4, MY1, FT + 14]], svg: m + (r ? r.svg : '') }, praying ? null : compass(st)];
    s += byDepth(parts);
    s += '<!--/DYN--><!--FX-->' + fx(st) + '<!--/FX-->';
    return s;
  }

  // the mat as flat shapes only (field, border, line), for a close-up bubble drawn with another camera
  function patch() {
    return flat(rectXY(MX0, MY0, MX1, MY1), BORDER, .8) + flat(rectXY(MX0 + 5, MY0 + 5, MX1 - 5, MY1 - 5), FIELD, .8) +
      line(z1(rectXY(MX0 + 2.2, MY0 + 2.2, MX1 - 2.2, MY1 - 2.2).concat([[MX0 + 2.2, MY0 + 2.2]])), .9).replace(INK, LINE);
  }
  // the child stands at the foot of the mat, between the glowing feet, facing the arch
  if (window.SALAHKID) SALAHKID.place(101, YC, TOP);
  // the praying view: from the child's front right, low, so the bow, the sujood and the sitting read in profile and the
  // raised hands still show; framed on the mat and every position of the child
  var CAM = [-118, 21];
  function frame() {
    var pts = [[MX0 - 3, MY0, FT], [MX1 + 3, MY0, FT], [MX0 - 3, MY1, FT], [MX1 + 3, MY1, FT]];
    return window.SALAHKID ? pts.concat(SALAHKID.extent()) : pts;
  }
  window.SALAHFIG = { scene: scene, size: [FW, FD, 24], center: [FW / 2, FD / 2], Q: [QX, QY, QZ], TARGET: Math.PI, CAM: CAM, frame: frame, contacts: contactsOf, patch: patch };
})();
