/* Memory Match: animals.js
   Twenty animals mentioned in the Quran, drawn in code as layered paper-cut figures (each piece casts a soft
   shadow on the piece below, like cut card stuck on card). House rule: NO FACES. No eyes, mouths, smiles,
   cheeks or expressions; every animal reads from its silhouette, posture and pattern.
   Coordinates: a 100 x 100 box centred on (0, 0), animals face right, the ground is at y = 34.
   draw(g, m): m.t = seconds, m.k = 0..1 how lively (0 = still pose, used for cached cards). */
(function () {
  'use strict';
  var M = window.MMAnimals = {};

  // ---------- colour helpers ----------
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(x[i] + (y[i] - x[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rgba(c, a) { var x = hex(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }
  M.mix = mix; M.shade = shade; M.rgba = rgba;

  // ---------- paper pieces ----------
  var U = 1;          // device px per unit, set by render(); shadows are in device px, not transformed
  var SH = true;      // paper shadows on/off (off for silhouettes)
  function shadow(g, on, k) {
    if (on && SH) { g.shadowColor = 'rgba(48,22,8,' + (0.34 * (k || 1)) + ')'; g.shadowBlur = 2.2 * U * (k || 1); g.shadowOffsetX = 0.45 * U; g.shadowOffsetY = 1.15 * U * (k || 1); }
    else { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0; }
  }
  // Catmull-Rom curve through points [x0,y0,x1,y1,...] (closed or open), added to the current path.
  function sample(p, closed, seg) {
    var n = p.length / 2, out = [], s = seg || 6;
    function P(i) { if (closed) i = (i + n) % n; else i = Math.max(0, Math.min(n - 1, i)); return [p[i * 2], p[i * 2 + 1]]; }
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (var k = 0; k < s; k++) {
        var t = k / s, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                  0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    if (!closed) out.push(P(n - 1));
    return out;
  }
  function curve(g, p) { var s = sample(p, true); g.moveTo(s[0][0], s[0][1]); for (var i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]); g.closePath(); }
  // A tapered strip along a smooth line (legs, tails, trunks, antennae), with round ends: one paper piece.
  function strip(g, p, w0, w1) {
    var s = sample(p, false, 8), n = s.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      var w = (w0 + (w1 - w0) * (i / (n - 1))) / 2, nx = -dy / d * w, ny = dx / d * w;
      L.push([s[i][0] + nx, s[i][1] + ny]); R.push([s[i][0] - nx, s[i][1] - ny]);
    }
    g.moveTo(L[0][0], L[0][1]);
    for (var j = 1; j < n; j++) g.lineTo(L[j][0], L[j][1]);
    var e = s[n - 1], ea = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
    g.arc(e[0], e[1], w1 / 2, ea, ea - Math.PI, true);
    for (var k = n - 1; k >= 0; k--) g.lineTo(R[k][0], R[k][1]);
    var st = s[0], sa = Math.atan2(R[0][1] - st[1], R[0][0] - st[0]);
    g.arc(st[0], st[1], w0 / 2, sa, sa - Math.PI, true);
    g.closePath();
  }
  function fillCol(g, col, y0, y1) {
    if (y0 == null) { g.fillStyle = col; return; }
    var gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, shade(col, 0.16)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.12));
    g.fillStyle = gr;
  }
  // piece(g, col, build, y0, y1, shadowK): one paper piece = path + soft shadow + top-lit fill
  function piece(g, col, build, y0, y1, k) {
    g.beginPath(); build(); shadow(g, true, k); fillCol(g, col, y0, y1); g.fill(); shadow(g, false);
  }
  function blob(g, col, pts, y0, y1, k) { piece(g, col, function () { curve(g, pts); }, y0, y1, k); }
  function limb(g, col, pts, w0, w1, k) { piece(g, col, function () { strip(g, pts, w0, w1 == null ? w0 : w1); }, null, null, k); }
  function oval(g, col, x, y, rx, ry, rot, k) { piece(g, col, function () { g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); }, y - ry, y + ry, k); }
  function dot(g, col, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fillStyle = col; g.fill(); }
  function clipTo(g, build, fn) { g.save(); g.beginPath(); build(); g.clip(); fn(); g.restore(); }
  function lines(g, col, w, segs) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    segs.forEach(function (p) { var s = sample(p, false, 6); g.moveTo(s[0][0], s[0][1]); for (var i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]); }); g.stroke(); }
  function rot(g, x, y, a, fn) { g.save(); g.translate(x, y); g.rotate(a); g.translate(-x, -y); fn(); g.restore(); }
  function leafShape(g, x, y, ang, len, wid) {
    var c = Math.cos(ang), s = Math.sin(ang);
    function P(u, v) { return [x + c * u - s * v, y + s * u + c * v]; }
    var a = P(0, 0), b = P(len * 0.5, -wid), e = P(len, 0), d = P(len * 0.5, wid);
    g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], e[0], e[1]); g.quadraticCurveTo(d[0], d[1], a[0], a[1]); g.closePath();
  }
  function leaf(g, col, x, y, ang, len, wid, vein) {
    piece(g, col, function () { leafShape(g, x, y, ang, len, wid); }, y - wid, y + wid);
    if (vein) lines(g, vein, Math.max(0.5, wid * 0.12), [[x, y, x + Math.cos(ang) * len * 0.85, y + Math.sin(ang) * len * 0.85]]);
  }
  function grass(g, col, x, y, s) {
    piece(g, col, function () {
      [[-0.5, -1], [0, -1.3], [0.45, -0.95], [0.9, -0.6], [-0.9, -0.55]].forEach(function (b, i) {
        var bx = x + b[0] * 3 * s, tx = x + b[0] * 7 * s, ty = y + b[1] * 9 * s;
        g.moveTo(bx - 1.3 * s, y); g.quadraticCurveTo(bx, y - 4 * s, tx, ty); g.quadraticCurveTo(bx + 0.6 * s, y - 3 * s, bx + 1.3 * s, y); g.closePath();
      });
    }, y - 10 * s, y, 0.7);
  }
  function hoof(g, x, y, w) { piece(g, '#3b2a22', function () { g.moveTo(x - w * 0.55, y - 2.2); g.lineTo(x + w * 0.55, y - 2.2); g.lineTo(x + w * 0.62, y + 0.6); g.lineTo(x - w * 0.62, y + 0.6); g.closePath(); }, null, null, 0.6); }
  function sw(m, f, ph) { return Math.sin(m.t * f + (ph || 0)) * m.k; }

  // ---------- the animals ----------
  var D = {};

  D.camel = function (g, m) {
    var C = '#d9a35c', F = '#b9824a', st = sw(m, 7), head = sw(m, 3.5) * 1.6;
    limb(g, F, [23, 2, 26 + st * 2, 19, 25 + st * 3, 33], 5.2, 4.6);
    limb(g, F, [-19, 4, -17 - st * 2, 20, -18 - st * 3, 33], 5.2, 4.6);
    oval(g, shade(F, -0.2), 25 + st * 3, 33.5, 3.6, 1.6); oval(g, shade(F, -0.2), -18 - st * 3, 33.5, 3.6, 1.6);
    limb(g, F, [-29, -5, -33, 2, -32, 12], 2.4, 1.4);
    oval(g, '#6b4426', -32, 13, 1.8, 3);
    blob(g, C, [-30, -2, -27, -13, -17, -22, -6, -28.5, 5, -22, 13, -15, 20, -9, 21, 3, 10, 10, -6, 12, -22, 9, -30, 4], -28, 12);
    g.save(); g.translate(0, head * 0.6);
    blob(g, C, [12, -12, 20, -10, 26, -15, 28.5, -25, 31, -32, 36, -35, 43, -34, 47.5, -30.5, 47, -27, 41, -25.5, 35.5, -23, 32, -13, 27, -3, 20, 3, 14, 2], -36, 3);
    limb(g, shade(C, -0.15), [32.5, -33, 30.5, -37.5], 2.6, 1.4);
    g.restore();
    // the saddle blanket on the hump: red felt with gold stripes and tassels
    var bl = function () { curve(g, [-17, -18, -11, -27, -3, -30, 6, -24, 9, -13, 6, -5, -4, -4, -15, -6]); };
    piece(g, '#c8473a', bl, -30, -4);
    clipTo(g, bl, function () {
      g.fillStyle = '#f2c14e'; g.fillRect(-20, -16, 32, 2.2); g.fillRect(-20, -10.5, 32, 1.6);
      g.fillStyle = '#7a2a5a'; g.fillRect(-20, -13.4, 32, 2);
      for (var i = 0; i < 6; i++) { g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(-14 + i * 4.4, -12.4, 0.8, 0, 6.283); g.fill(); }
    });
    [[-14, -6], [-6, -4], [3, -4.6]].forEach(function (p) { limb(g, '#f2c14e', [p[0], p[1], p[0] + 0.3, p[1] + 4], 1.4, 1.1, 0.6); dot(g, '#e08a2a', p[0] + 0.3, p[1] + 4.6, 1.3); });
    limb(g, C, [16, 2, 18.5 + st * 2, 19, 15.5 - st * 3, 33], 5.6, 4.8);
    limb(g, C, [-24, 4, -23 - st * 2, 20, -27 + st * 3, 33], 5.6, 4.8);
    oval(g, shade(C, -0.25), 15.5 - st * 3, 33.6, 3.9, 1.7); oval(g, shade(C, -0.25), -27 + st * 3, 33.6, 3.9, 1.7);
    dot(g, shade(C, -0.1), 18.5 + st * 2, 19, 3.2); dot(g, shade(C, -0.1), -23 - st * 2, 20, 3.2);
  };

  D.elephant = function (g, m) {
    var B = '#8d9bb6', F = '#76839e', st = sw(m, 5), flap = sw(m, 6) * 0.16, tr = sw(m, 3) * 4;
    limb(g, F, [-15, 4, -15 - st, 33], 11, 10.5); limb(g, F, [17, 4, 17 + st, 33], 11, 10.5);
    limb(g, F, [-31, -4, -36, 5, -35, 13], 2.2, 1.4); oval(g, '#4d566a', -35, 14, 1.8, 2.6);
    blob(g, B, [-33, -4, -29, -18, -15, -27, 4, -28, 19, -22, 23, -6, 19, 8, 3, 13, -16, 13, -30, 8], -28, 13);
    limb(g, B, [-23, 6, -23 + st, 34], 12, 11.5); limb(g, B, [9, 8, 9 - st, 34], 12, 11.5);
    [[-23 + st, 34], [9 - st, 34]].forEach(function (p) { for (var i = -1; i <= 1; i++) oval(g, '#eae2d0', p[0] + i * 3.4 + 0.8, p[1] - 0.6, 1.3, 1, 0, 0.4); });
    blob(g, B, [16, -24, 26, -32, 37, -30, 42.5, -20, 41.5, -10, 36, -4, 26, -2, 18, -8], -32, -2);
    limb(g, B, [38, -12, 43, -3, 44, 8 - tr * 0.4, 47 + tr * 0.3, 16 - tr, 51.5 + tr * 0.6, 15 - tr * 1.3, 53 + tr * 0.6, 11 - tr * 1.4], 9, 3.6);
    for (var i = 0; i < 4; i++) lines(g, rgba('#4d566a', 0.35), 0.6, [[41 + i * 0.4, -2 + i * 4, 45.5 + i * 0.6, -1 + i * 4]]);
    limb(g, '#f3ead6', [35, -6, 40, -2.5, 46, -3], 3.4, 1.4, 0.6);
    rot(g, 14, -18, flap, function () {
      blob(g, '#7b89a6', [13, -27, 22, -31.5, 29, -24, 29.5, -12, 25, -1, 17, 4, 10.5, -4, 9.5, -16], -31, 4);
      blob(g, '#c99bb0', [15, -24, 21, -27, 25.5, -21, 25.5, -12, 22, -4, 17, -0.5, 13.5, -6, 13, -16], -27, 0, 0.5);
    });
  };

  D.bee = function (g, m) {
    var fl = m.k ? 0.35 + 0.65 * Math.abs(Math.cos(m.t * 38)) : 1, bob = sw(m, 4) * 1.5;
    // a dotted flight loop behind
    g.save(); g.setLineDash([2.2, 3.2]); lines(g, 'rgba(160,110,40,.45)', 1.1, [[-46, 26, -34, 30, -26, 20, -34, 12, -40, 20, -30, 26, -20, 18]]); g.restore();
    g.save(); g.translate(0, bob);
    [[-7, 14, 9], [3, 15, 13], [12, 13, 10]].forEach(function (p) { limb(g, '#3a2a1e', [p[0], p[1] - 4, p[0] + 1, p[1] + 2, p[0] + 3, p[1] + 5], 1.8, 1.4, 0.6); });
    piece(g, '#3a2a1e', function () { g.moveTo(-23, 4); g.lineTo(-32, 8.5); g.lineTo(-23, 11); g.closePath(); }, null, null, 0.7);
    var body = function () { g.ellipse(-3, 5, 22, 15, -0.12, 0, 6.283); };
    piece(g, '#f7c531', body, -10, 20);
    clipTo(g, body, function () {
      g.fillStyle = '#3a2a1e';
      [-15, -4, 7].forEach(function (x) { g.save(); g.translate(x, 5); g.rotate(-0.12); g.beginPath(); g.ellipse(0, 0, 3.4, 20, 0, 0, 6.283); g.fill(); g.restore(); });
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-4, -4, 15, 4.5, -0.12, 0, 6.283); g.fill();
    });
    oval(g, '#3a2a1e', 21, 0, 9.5, 9.5);
    limb(g, '#3a2a1e', [22, -8, 25, -17, 31, -21], 1.6, 1.4, 0.6); dot(g, '#3a2a1e', 31.5, -21.5, 2);
    limb(g, '#3a2a1e', [19, -8, 19, -18, 23, -24], 1.6, 1.4, 0.6); dot(g, '#3a2a1e', 23.5, -24.5, 2);
    // wings: translucent paper, flutter by squashing toward their roots
    [[-5, -9, 11, 18, -0.55, '#d7ecf7'], [5, -10, 10, 16, 0.22, '#eaf6fd']].forEach(function (w) {
      g.save(); g.translate(w[0], w[1]); g.scale(1, fl); g.translate(-w[0], -w[1]);
      var wp = function () { g.ellipse(w[0] + Math.sin(w[4]) * w[3] * 0.0, w[1] - w[3] * 0.85, w[2], w[3], w[4], 0, 6.283); };
      g.globalAlpha = 0.86; piece(g, w[5], wp, w[1] - w[3] * 2, w[1], 0.6); g.globalAlpha = 1;
      g.beginPath(); wp(); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 1; g.stroke();
      lines(g, 'rgba(120,160,200,.55)', 0.6, [[w[0], w[1], w[0] + Math.sin(w[4]) * 10, w[1] - 22], [w[0], w[1], w[0] + Math.sin(w[4]) * 18 + 6, w[1] - 14]]);
      g.restore();
    });
    g.restore();
  };

  D.ant = function (g, m) {
    var A = '#a3412a', F = '#7a2e1d', st = sw(m, 12);
    // a green leaf held high (a leaf-cutter ant at work)
    rot(g, 26, -8, sw(m, 4) * 0.08, function () {
      limb(g, '#4f8f34', [26, -7, 21, -14, 16, -19], 1.6, 1.2, 0.6);
      leaf(g, '#6fbf4a', -14, -22, -0.22, 46, 13, '#4f8f34');
      lines(g, 'rgba(79,143,52,.6)', 0.7, [[0, -27, 4, -34], [10, -29, 14, -36], [-4, -25, -6, -18], [8, -27, 6, -20]]);
    });
    [[12, 2, 22 + st, 10, 26 + st, 21], [8, 3, 10 - st, 12, 12 - st, 21], [4, 3, -2 + st, 10, -15 + st, 19]].forEach(function (p) { limb(g, F, p, 2.4, 1.7, 0.6); });
    blob(g, A, [-28, 2, -24, -6, -14, -9, -4, -5, 0, 3, -4, 11, -14, 14, -24, 11], -9, 14);
    clipTo(g, function () { curve(g, [-28, 2, -24, -6, -14, -9, -4, -5, 0, 3, -4, 11, -14, 14, -24, 11]); }, function () {
      lines(g, 'rgba(60,15,5,.35)', 1, [[-20, -6, -22, 0, -20, 10], [-12, -8, -14, 0, -12, 12]]);
      dot(g, 'rgba(255,220,200,.25)', -17, -4, 4);
    });
    oval(g, A, 0.5, 3.5, 3, 2.6);
    oval(g, A, 9, 0.5, 9, 5.5, -0.3);
    oval(g, A, 22, -4, 7.5, 7);
    limb(g, F, [24, -10, 27, -19, 34, -22], 1.7, 1.3, 0.6);
    limb(g, F, [21, -10, 21, -18, 25, -25], 1.7, 1.3, 0.6);
    [[11, 4, 18 - st, 12, 20 - st, 23], [8, 5, 6 + st, 14, 4 + st, 23], [5, 4, -4 - st, 12, -10 - st, 22]].forEach(function (p) { limb(g, A, p, 2.6, 1.8, 0.6); });
    for (var i = 0; i < 9; i++) dot(g, 'rgba(150,100,50,.35)', -38 + i * 9.5, 25 + (i % 2) * 1.5, 0.9);
  };

  D.spider = function (g, m) {
    var bob = sw(m, 3.2) * 3, cx = 0, cy = -4;
    // the web: spokes and a sagging spiral of silk
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.75;
    var N = 9, ang = [];
    for (var i = 0; i < N; i++) ang.push(-Math.PI / 2 + i * 6.283 / N + (i % 2 ? 0.08 : -0.05));
    g.beginPath(); ang.forEach(function (a) { g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 47, cy + Math.sin(a) * 44); }); g.stroke();
    for (var r = 7; r < 44; r += 5.2) {
      g.beginPath();
      for (var j = 0; j <= N; j++) {
        var a0 = ang[j % N], a1 = ang[(j + 1) % N], x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r * 0.94;
        var x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r * 0.94, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        if (j === 0) g.moveTo(x0, y0);
        if (j < N) g.quadraticCurveTo(mx + (cx - mx) * 0.12, my + (cy - my) * 0.12, x1, y1);
      }
      g.stroke();
    }
    lines(g, 'rgba(255,255,255,.9)', 0.8, [[0, -50, 0, -4 + bob]]);
    g.save(); g.translate(0, 6 + bob);
    var LEG = [[3, -2, 13, -14, 23, -9], [4, 0, 17, -5, 26, 1], [4, 3, 17, 8, 24, 16], [3, 5, 12, 15, 17, 26]];
    var wig = sw(m, 9) * 1.2;
    LEG.forEach(function (p, i) {
      var w = (i % 2 ? wig : -wig);
      limb(g, '#3d2450', [p[0], p[1], p[2], p[3] + w, p[4], p[5] + w], 2.3, 1.5, 0.6);
      limb(g, '#3d2450', [-p[0], p[1], -p[2], p[3] - w, -p[4], p[5] - w], 2.3, 1.5, 0.6);
    });
    oval(g, '#4e2d63', 0, -1, 6, 6);
    var ab = function () { g.ellipse(0, 11, 9.5, 11.5, 0, 0, 6.283); };
    piece(g, '#5f3878', ab, 0, 22);
    clipTo(g, ab, function () {
      for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-5 + k * 0.6, 4 + k * 4.4); g.quadraticCurveTo(0, 8 + k * 4.4, 5 - k * 0.6, 4 + k * 4.4); g.lineWidth = 1.8; g.strokeStyle = '#a77ccc'; g.stroke(); }
      dot(g, 'rgba(255,255,255,.18)', -3, 6, 4);
    });
    g.restore();
  };

  D.cow = function (g, m) {
    var W = '#f5f0e6', F = '#d8d0c2', K = '#3b3434', st = sw(m, 6), tail = sw(m, 4) * 0.25;
    limb(g, F, [-18, 4, -18 - st, 33], 6.4, 6); limb(g, F, [15, 4, 15 + st, 33], 6.4, 6);
    hoof(g, -18 - st, 34, 6.6); hoof(g, 15 + st, 34, 6.6);
    rot(g, -30, -8, tail, function () { limb(g, F, [-30, -8, -35, 3, -34, 15], 2, 1.4); oval(g, K, -34, 16.5, 2.2, 3.4); });
    var body = [-31, -10, -26, -17, -6, -19, 12, -18, 22, -12, 22, 4, 14, 10, -4, 11, -22, 10, -30, 4];
    blob(g, W, body, -19, 11);
    clipTo(g, function () { curve(g, body); }, function () {
      blob(g, K, [-24, -12, -16, -16, -8, -12, -8, -2, -14, 4, -22, 0], -16, 4, 0.5);
      blob(g, K, [2, -22, 12, -20, 13, -12, 6, -8, 0, -14], -22, -8, 0.5);
      blob(g, K, [8, 4, 16, 2, 22, 8, 12, 14], 2, 14, 0.5);
      blob(g, '#efc4c0', [-6, 9, 0, 8, 2, 12, -6, 13], 8, 13, 0.4);
    });
    limb(g, W, [-24, 4, -24 + st, 34], 7, 6.6); limb(g, W, [8, 4, 8 - st, 34], 7, 6.6);
    hoof(g, -24 + st, 35, 7.2); hoof(g, 8 - st, 35, 7.2);
    var hd = sw(m, 3) * 0.06;
    rot(g, 20, -12, hd, function () {
      limb(g, '#e6dccb', [30, -23, 31, -29, 35, -31.5], 2.8, 1.4, 0.6);
      var head = [18, -14, 24, -22, 32, -24, 38, -20, 44, -12, 45.5, -6, 42, -2, 36, -2, 30, -6, 22, -2];
      blob(g, W, head, -24, -2);
      clipTo(g, function () { curve(g, head); }, function () {
        blob(g, K, [22, -26, 32, -27, 34, -18, 28, -12, 20, -14], -27, -12, 0.4);
        blob(g, '#efc4c0', [38, -12, 44, -14, 48, -6, 42, 0, 36, -4], -14, 0, 0.4);
      });
      leaf(g, '#cdbfb0', 28, -21, -2.75, 10, 3.6);
    });
  };

  D.horse = function (g, m) {
    var H = '#b8652f', F = '#96501f', K = '#4e2814', st = sw(m, 7), tail = sw(m, 3.5) * 3, mane = sw(m, 5) * 1.4;
    limb(g, F, [-18, 2, -17 - st * 2, 19, -19 - st * 3, 33], 4.6, 3.8); limb(g, F, [14, 2, 16 + st * 2, 19, 15 + st * 3, 33], 4.6, 3.8);
    hoof(g, -19 - st * 3, 34, 4.6); hoof(g, 15 + st * 3, 34, 4.6);
    limb(g, K, [-28, -10, -36 - tail * 0.3, -5, -38 + tail * 0.5, 8, -35 + tail, 21], 7.5, 2.4);
    limb(g, shade(K, 0.15), [-29, -8, -34, -2, -34 + tail * 0.4, 10], 3, 1.4, 0.4);
    blob(g, H, [-30, -8, -24, -15, -8, -16, 8, -16, 18, -14, 22, -6, 18, 4, 4, 7, -14, 7, -27, 3], -16, 7);
    blob(g, H, [12, -14, 18, -24, 24, -32, 28, -37, 32, -36.5, 38, -29, 42.5, -22.5, 41.5, -18, 36, -18, 30, -22, 26, -18, 22, -6], -37, -6);
    limb(g, H, [27.5, -35, 27, -42, 30, -37.5], 2.6, 1);
    limb(g, K, [26.5, -37 + mane * 0.2, 22 - mane, -32, 17 - mane, -25, 12 - mane * 0.6, -16], 6.5, 4.2);
    limb(g, K, [29, -37, 32 + mane * 0.3, -35], 3, 1.6, 0.5);
    limb(g, H, [-24, 2, -23 + st * 2, 19, -26 + st * 3, 33], 5, 4.2); limb(g, H, [8, 2, 10 - st * 2, 19, 8 - st * 3, 33], 5, 4.2);
    oval(g, '#fff4e6', -26 + st * 3, 30.6, 2.5, 2.6, 0, 0.4); oval(g, '#fff4e6', 8 - st * 3, 30.6, 2.5, 2.6, 0, 0.4);
    hoof(g, -26 + st * 3, 34.6, 5); hoof(g, 8 - st * 3, 34.6, 5);
  };

  D.whale = function (g, m) {
    var B = '#3f6fb5', tail = sw(m, 3) * 0.12, sp = m.k ? 0.7 + 0.3 * Math.sin(m.t * 9) : 1, bob = sw(m, 2.2) * 1.5;
    // the sea as a paper wave
    piece(g, '#5fb8de', function () {
      g.moveTo(-46, 40); g.lineTo(-46, 20);
      for (var x = -46; x <= 46; x += 11.5) g.quadraticCurveTo(x + 5.75, 13 + bob * 0.5, x + 11.5, 20);
      g.lineTo(46, 40); g.closePath();
    }, 14, 40, 0.7);
    g.save(); g.translate(0, bob);
    rot(g, -32, -6, tail, function () {
      blob(g, shade(B, -0.08), [-30, -6, -37, -12, -44, -22, -50, -27, -46, -18, -48, -8, -44, -11, -38, -2], -27, -2);
    });
    var body = [42, -1, 37, -13, 22, -20, 2, -20, -16, -15, -32, -8, -36, -4, -30, 1, -14, 7, 6, 13, 28, 11, 39, 6];
    blob(g, B, body, -20, 13);
    clipTo(g, function () { curve(g, body); }, function () {
      blob(g, '#dce9f3', [44, 2, 30, 4, 10, 6, -10, 4, -22, 2, -14, 12, 8, 18, 34, 14], 2, 18, 0.4);
      for (var i = 0; i < 5; i++) lines(g, 'rgba(63,111,181,.45)', 0.8, [[38 - i * 1.5, 5 + i * 1.6, 12 - i * 2, 7.5 + i * 1.8]]);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(4, -15, 20, 2.6, -0.06, 0, 6.283); g.fill();
    });
    leaf(g, shade(B, -0.12), 8, 6, 2.3, 13, 3.4);
    g.restore();
    // the spout: a fan of water strips and drops
    g.save(); g.translate(22, -20 + bob); g.scale(1, sp);
    [[-0.5, 1], [-0.2, 1.15], [0.15, 1.1], [0.5, 0.95]].forEach(function (s) {
      limb(g, '#e6f6ff', [0, 0, s[0] * 6, -10 * s[1], s[0] * 16, -16 * s[1]], 2.4, 1.2, 0.5);
      dot(g, '#e6f6ff', s[0] * 19, -14 * s[1], 1.5);
    });
    g.restore();
  };

  D.hoopoe = function (g, m) {
    var O = '#e9a173', crest = m.k ? 0.5 + 0.5 * Math.sin(m.t * 3) * m.k : 0.75, bob = sw(m, 5) * 1.2;
    limb(g, '#7a5232', [-44, 30, -10, 27, 20, 29, 44, 27], 4.4, 3.4);
    leaf(g, '#5f9f48', 28, 28, -0.6, 12, 3.4); leaf(g, '#5f9f48', -30, 29, -2.5, 11, 3.2);
    limb(g, '#6a6a72', [-2, 16, -4, 28], 1.6, 1.3, 0.5); limb(g, '#6a6a72', [4, 16, 4, 28], 1.6, 1.3, 0.5);
    g.save(); g.translate(0, bob);
    var tail = [-14, 6, -34, 10, -37, 16, -32, 18, -14, 13];
    blob(g, '#262222', tail, 6, 18);
    clipTo(g, function () { curve(g, tail); }, function () { g.fillStyle = '#f4ead8'; g.save(); g.translate(-25, 12); g.rotate(0.25); g.fillRect(-2, -8, 4, 16); g.restore(); });
    blob(g, O, [-18, 6, -10, -4, 4, -8, 14, -6, 18, 2, 12, 14, 0, 18, -12, 16], -8, 18);
    var wing = [-19, 5, -8, -2, 6, -2, 10, 6, 0, 12, -16, 11];
    blob(g, '#262222', wing, -2, 12);
    clipTo(g, function () { curve(g, wing); }, function () {
      g.fillStyle = '#f4ead8';
      for (var i = 0; i < 5; i++) { g.save(); g.translate(-14 + i * 5, 5); g.rotate(-0.5); g.fillRect(-1.1, -9, 2.2, 18); g.restore(); }
    });
    // the crest: a fan of orange feathers with black tips (opens up when happy)
    var n = 6;
    for (var k = 0; k < n; k++) {
      var a = -2.55 + k * (0.27 + 0.12 * crest) - (crest - 0.75) * 0.6, len = 15 + (k % 2) * 2 + crest * 3;
      g.save(); g.translate(15, -13); g.rotate(a);
      var fe = function () { g.moveTo(0, -1.6); g.quadraticCurveTo(len * 0.6, -2.8, len, 0); g.quadraticCurveTo(len * 0.6, 2.8, 0, 1.6); g.closePath(); };
      piece(g, '#f0a868', fe, -3, 3, 0.6);
      clipTo(g, fe, function () { g.fillStyle = '#262222'; g.fillRect(len - 4, -4, 5, 8); g.fillStyle = '#fff2e0'; g.fillRect(len - 6, -4, 1.6, 8); });
      g.restore();
    }
    oval(g, O, 17, -10, 7.2, 6.6);
    limb(g, '#3a3434', [23, -10, 31, -6.5, 37.5, 0.5], 2.6, 0.9, 0.6);
    g.restore();
  };

  D.crow = function (g, m) {
    var K = '#2a2b38', hop = m.k ? -Math.abs(Math.sin(m.t * 6)) * 4 * m.k : 0;
    for (var i = 0; i < 4; i++) grass(g, '#6a8f4a', -36 + i * 24, 34, 0.9);
    g.save(); g.translate(0, hop);
    blob(g, '#20212c', [-14, 4, -34, 9, -36, 15, -12, 12], 4, 15);
    limb(g, '#4a4a55', [0, 14, -1, 31], 1.8, 1.4, 0.5); limb(g, '#4a4a55', [6, 14, 7, 31], 1.8, 1.4, 0.5);
    lines(g, '#4a4a55', 1.2, [[-5, 31, -1, 31, 3, 32], [3, 31, 7, 31, 11, 32]]);
    blob(g, K, [-16, 6, -8, -6, 6, -10, 16, -8, 21, 0, 14, 12, 0, 16, -12, 12], -10, 16);
    var wing = [-19, 4, -6, -4, 8, -2, 10, 6, -2, 12, -21, 10];
    blob(g, '#363849', wing, -4, 12);
    clipTo(g, function () { curve(g, wing); }, function () {
      lines(g, 'rgba(150,140,220,.35)', 0.9, [[-14, 5, -6, 8, 4, 7], [-16, 8, -8, 10.5, 2, 10]]);
      var sh = g.createLinearGradient(-10, -4, 6, 8); sh.addColorStop(0, 'rgba(120,110,230,.45)'); sh.addColorStop(1, 'rgba(120,110,230,0)'); g.fillStyle = sh; g.fillRect(-20, -6, 32, 18);
    });
    oval(g, K, 18, -12, 8, 7.4);
    blob(g, '#4b4b55', [24, -15, 31, -13.5, 35, -11, 30, -9.5, 24, -8.5], -15, -8.5, 0.6);
    g.restore();
  };

  function wool(g, cx, cy, rx, ry, col, n) {
    var W = [];
    for (var i = 0; i < n; i++) { var a = i / n * 6.283; W.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 6.5 + (i % 3) * 0.9]); }
    oval(g, col, cx, cy, rx + 1, ry + 1);
    W.forEach(function (w) { oval(g, col, w[0], w[1], w[2], w[2], 0, 0.55); });
    [[-10, -5], [2, -7], [12, -3], [-4, 4], [8, 5], [-14, 6]].forEach(function (p) { oval(g, shade(col, 0.04), cx + p[0], cy + p[1], 6, 5.2, 0, 0.45); });
  }
  D.sheep = function (g, m) {
    var K = '#3d3431', C = '#f6efdf', bob = m.k ? -Math.abs(Math.sin(m.t * 5)) * 3 * m.k : 0;
    for (var i = 0; i < 3; i++) grass(g, '#79a85a', -30 + i * 30, 34, 0.8);
    limb(g, '#4e423d', [-13, 8, -13, 33], 4, 3.6); limb(g, '#4e423d', [13, 8, 13, 33], 4, 3.6);
    g.save(); g.translate(0, bob);
    wool(g, -2, -2, 24, 14, C, 13);
    oval(g, C, -27, -6, 4.5, 4.5);
    g.restore();
    limb(g, K, [-20, 10, -20, 34], 4.4, 4); limb(g, K, [6, 10, 6, 34], 4.4, 4);
    g.save(); g.translate(0, bob);
    leaf(g, '#5a4c47', 24, -12, 2.6, 10, 3.2);
    blob(g, K, [20, -14, 28, -19, 36, -14, 39, -5, 35, 1, 27, -1, 20, -6], -19, 1);
    oval(g, C, 25, -17, 3.8, 3.4, 0, 0.6); oval(g, C, 29, -19, 3.6, 3.2, 0, 0.6); oval(g, C, 22, -14, 3.4, 3.2, 0, 0.6);
    g.restore();
  };

  D.goat = function (g, m) {
    var B = '#b98a5e', F = '#9a6f48', K = '#4a3222', hop = m.k ? -Math.abs(Math.sin(m.t * 5.5)) * 4 * m.k : 0;
    for (var i = 0; i < 3; i++) grass(g, '#7fa85a', -34 + i * 32, 34, 0.75);
    g.save(); g.translate(0, hop);
    limb(g, F, [-16, 4, -16, 33], 4, 3.4); limb(g, F, [12, 4, 13, 33], 4, 3.4);
    hoof(g, -16, 34, 4); hoof(g, 13, 34, 4);
    limb(g, K, [-26, -10, -30, -16, -29, -19], 3, 2);
    var body = [-28, -8, -20, -14, 4, -14, 16, -12, 20, -4, 16, 6, -4, 8, -24, 6];
    blob(g, B, body, -14, 8);
    clipTo(g, function () { curve(g, body); }, function () {
      limb(g, K, [-26, -14, -8, -15.5, 12, -14], 3.2, 3.2, 0.4);
      blob(g, '#efe2cc', [-18, 4, 0, 2, 14, 2, 10, 10, -14, 10], 2, 10, 0.4);
    });
    limb(g, B, [-22, 4, -22, 34], 4.4, 3.8); limb(g, B, [6, 4, 6, 34], 4.4, 3.8);
    hoof(g, -22, 35, 4.4); hoof(g, 6, 35, 4.4);
    limb(g, K, [24, -27, 21, -35, 15, -38.5, 11.5, -35.5], 3.6, 1.6);
    blob(g, B, [12, -10, 17, -22, 23, -28.5, 30, -27.5, 36, -20, 38.5, -14, 34.5, -12, 28, -16, 22, -6], -29, -6);
    leaf(g, F, 25, -24, 2.9, 10, 3.2);
    blob(g, '#efe2cc', [33, -18, 38.5, -15, 35, -12, 31, -15], -18, -12, 0.3);
    piece(g, K, function () { g.moveTo(32, -13); g.quadraticCurveTo(35, -9, 33.5, -5); g.quadraticCurveTo(31.5, -8, 30, -12); g.closePath(); }, null, null, 0.6);
    g.restore();
  };

  D.wolf = function (g, m) {
    var G = '#8a90a2', F = '#6c7284', L = '#dfe1e8', tail = sw(m, 3) * 0.1, how = sw(m, 2) * 0.05;
    rot(g, -12, 28, tail, function () {
      var tl = [-8, 31, -24, 34, -38, 31, -46, 22, -45, 13, -40, 15, -36, 23, -24, 26, -10, 25];
      blob(g, F, tl, 13, 34);
      clipTo(g, function () { curve(g, tl); }, function () { blob(g, L, [-50, 10, -40, 12, -38, 22, -46, 26], 10, 26, 0.3); });
    });
    limb(g, F, [13, 4, 14, 31], 5, 4.6); oval(g, shade(F, -0.1), 15.5, 31.6, 3.8, 2.1);
    blob(g, G, [-20, 31, -24, 16, -20, 2, -11, -9, -2, -15, 7, -17, 14, -8, 12, 8, 11, 31], -17, 31);
    blob(g, L, [2, -15, 12, -12, 13, -1, 9, 12, 5, 2, 1, -6], -15, 12, 0.5);
    blob(g, F, [-26, 31, -28, 17, -19, 9, -7, 15, -6, 31], 9, 31);
    oval(g, shade(F, -0.1), -12, 31.5, 8, 2.6);
    limb(g, G, [6, 4, 6, 32], 5.4, 5); oval(g, shade(G, -0.1), 8, 32.5, 4, 2.2);
    // the ruff of fur at the neck
    piece(g, G, function () { g.moveTo(-12, -6); for (var i = 0; i < 5; i++) { g.lineTo(-14 + i * 3, -14 - i * 2.2); g.lineTo(-10 + i * 3, -10 - i * 2.2); } g.lineTo(4, -12); g.closePath(); }, -24, -6, 0.6);
    rot(g, 2, -16, how, function () {
      limb(g, F, [-1, -31, -7, -41, 4, -35], 4.5, 1.2);
      var hd = [-3, -16, -5, -26, -1, -33, 5, -36.5, 12, -37.5, 18, -41, 25, -46.5, 26.5, -43.5, 21, -36, 16, -28, 12, -20, 8, -14];
      blob(g, G, hd, -46, -14);
      clipTo(g, function () { curve(g, hd); }, function () { blob(g, L, [12, -28, 20, -37, 27, -45, 23, -38, 17, -28, 13, -20, 9, -20], -45, -20, 0.3); });
      limb(g, G, [3, -34, 1, -45, 8.5, -37.5], 4.6, 1.2);
      limb(g, shade(G, 0.35), [3.6, -36.5, 2.4, -42], 1.4, 0.6, 0.2);
    });
  };

  D.frog = function (g, m) {
    var G = '#68bb48', hop = m.k ? -Math.abs(Math.sin(m.t * 4.5)) * 7 * m.k : 0, stretch = m.k ? Math.abs(Math.sin(m.t * 4.5)) * m.k : 0;
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.9;
    [[0, 30, 44, 11], [0, 30, 50, 13.5]].forEach(function (r) { g.beginPath(); g.ellipse(r[0], r[1], r[2], r[3], 0, 0, 6.283); g.stroke(); });
    piece(g, '#3f8f4c', function () { g.ellipse(0, 30, 36, 8.5, 0, 0.35, 6.283 - 0.1); g.lineTo(0, 30); g.closePath(); }, 22, 38, 0.7);
    lines(g, 'rgba(255,255,255,.25)', 0.8, [[0, 30, -26, 26], [0, 30, -20, 36], [0, 30, 24, 36], [0, 30, 8, 22], [0, 30, -8, 22]]);
    g.save(); g.translate(0, hop);
    limb(g, '#55a33a', [-20 - stretch * 4, 18 + stretch * 4, -6, 24 + stretch * 3, 6 + stretch * 2, 25 + stretch * 3], 6, 4);
    [-0.5, 0, 0.5].forEach(function (a) { limb(g, '#55a33a', [6 + stretch * 2, 25 + stretch * 3, 6 + stretch * 2 + Math.cos(a) * 7, 25 + stretch * 3 + Math.sin(a) * 3], 2.2, 1.4, 0.5); });
    var body = [-18, 22, -22, 10, -16, -2, -4, -10, 10, -12, 20, -8, 27, 0, 25, 8, 14, 14, 0, 20];
    blob(g, G, body, -12, 22);
    clipTo(g, function () { curve(g, body); }, function () {
      blob(g, '#c9e88a', [27, 2, 22, 12, 8, 18, -4, 22, 6, 12, 18, 6], 2, 22, 0.3);
      [[-12, -2, 3.2], [-6, -7, 2.2], [-17, 7, 2.6], [-8, 4, 1.8]].forEach(function (s) { dot(g, '#3f8f35', s[0], s[1], s[2]); });
    });
    oval(g, '#5cae3e', -12, 12, 11, 8.5, -0.35);
    limb(g, '#5cae3e', [17, 8, 20, 18, 21, 26], 4, 3);
    [-0.4, 0.2].forEach(function (a) { limb(g, '#5cae3e', [21, 26, 21 + Math.cos(a) * 5, 26 + Math.sin(a) * 2], 1.8, 1.2, 0.5); });
    g.restore();
  };

  D.locust = function (g, m) {
    var B = '#93ad3c', kick = m.k ? Math.max(0, Math.sin(m.t * 5)) * m.k : 0;
    piece(g, '#5f9d45', function () { g.moveTo(-44, 36); g.quadraticCurveTo(-10, 24, 40, 18); g.quadraticCurveTo(-8, 30, -40, 40); g.closePath(); }, 18, 40, 0.6);
    g.save(); g.translate(0, -kick * 3);
    limb(g, '#6f8a2c', [14, 4, 18, 13, 22, 21], 2, 1.4, 0.5); limb(g, '#6f8a2c', [8, 5, 7, 13, 9, 21], 2, 1.4, 0.5);
    blob(g, B, [-31, 0, -20, -6, 0, -8, 16, -8, 22, -4, 24, 3, 18, 6, 0, 6, -20, 5], -8, 6);
    clipTo(g, function () { curve(g, [-31, 0, -20, -6, 0, -8, 16, -8, 22, -4, 24, 3, 18, 6, 0, 6, -20, 5]); }, function () {
      for (var i = 0; i < 6; i++) lines(g, 'rgba(70,90,20,.35)', 0.8, [[-26 + i * 5, -6, -27 + i * 5, 6]]);
    });
    var wing = [-35, -2, -20, -10, 6, -11, 13, -7.5, -2, -3.5, -30, 1.5];
    g.globalAlpha = 0.92; blob(g, '#c4ad62', wing, -11, 2); g.globalAlpha = 1;
    clipTo(g, function () { curve(g, wing); }, function () { lines(g, 'rgba(110,90,40,.55)', 0.6, [[-32, -1, -10, -7, 10, -8], [-30, 0, -6, -4], [-20, -7, -24, -1], [-10, -8, -14, -3], [0, -9, -4, -4]]); });
    oval(g, B, 26, -1.5, 6.2, 7.2, 0.2);
    limb(g, '#6f8a2c', [27, -7, 34, -20, 46, -27], 1.2, 0.8, 0.5);
    limb(g, '#6f8a2c', [25, -7, 29, -19, 37, -29], 1.2, 0.8, 0.5);
    // the big jumping leg
    var kx = -14 - kick * 4, ky = -15 + kick * 5;
    limb(g, '#a9c24c', [4, 1, -6, -8, kx, ky], 7.5, 4);
    clipTo(g, function () { strip(g, [4, 1, -6, -8, kx, ky], 7.5, 4); }, function () { for (var j = 0; j < 4; j++) lines(g, 'rgba(90,110,30,.5)', 0.7, [[0 - j * 3.5, -3 - j * 2.8, -3 - j * 3.5, 1 - j * 2.8]]); });
    limb(g, '#7f9a32', [kx, ky, -18 - kick * 10, 2 + kick * 3, -22 - kick * 14, 17 + kick * 2], 2.2, 1.6);
    g.restore();
  };

  D.butterfly = function (g, m) {
    var fl = m.k ? 0.45 + 0.55 * Math.abs(Math.cos(m.t * 9)) : 1, bob = sw(m, 3) * 2;
    var O = '#f39a3c', H = '#f7c04e', E = '#4a2a1a';
    g.save(); g.translate(0, bob);
    [1, -1].forEach(function (s) {
      g.save(); g.scale(s * fl, 1);
      var fw = [1, -4, 10, -25, 26, -34, 41, -29, 39, -12, 23, -2, 4, 2], hw = [1, 2, 18, 4, 32, 14, 29, 28, 15, 31, 4, 18];
      blob(g, E, hw, 2, 31); clipTo(g, function () { curve(g, hw); }, function () { g.save(); g.scale(0.82, 0.82); g.translate(1, 1); blob(g, H, hw, 2, 31, 0.3); g.restore(); });
      blob(g, E, fw, -34, 2); clipTo(g, function () { curve(g, fw); }, function () { g.save(); g.translate(3, 0); g.scale(0.84, 0.82); blob(g, O, fw, -34, 2, 0.3); g.restore();
        lines(g, rgba(E, 0.7), 0.9, [[4, -2, 20, -18, 33, -26], [5, 0, 24, -8, 36, -14], [6, -3, 16, -22, 22, -30]]); });
      [[36, -26, 1.5], [39, -20, 1.3], [38, -14, 1.2], [31, -31, 1.3], [26, 27, 1.3], [30, 22, 1.2], [20, 30, 1.1]].forEach(function (d) { dot(g, '#fff8e8', d[0], d[1], d[2]); });
      g.restore();
    });
    oval(g, '#3a2418', 0, 2, 3, 17);
    oval(g, '#3a2418', 0, -16.5, 3.4, 3.4);
    limb(g, '#3a2418', [-1, -19, -5, -28, -9, -33], 1, 0.8, 0.4); dot(g, '#3a2418', -9.3, -33.5, 1.6);
    limb(g, '#3a2418', [1, -19, 5, -28, 9, -33], 1, 0.8, 0.4); dot(g, '#3a2418', 9.3, -33.5, 1.6);
    g.restore();
  };

  D.fish = function (g, m) {
    var O = '#f28c4b', tw = sw(m, 9) * 0.22, bob = sw(m, 2.5) * 2;
    [[38, -16, 2.2], [42, -26, 1.6], [37, -34, 1.2]].forEach(function (b) { g.beginPath(); g.arc(b[0], b[1] - bob, b[2], 0, 6.283); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.9; g.stroke(); });
    g.save(); g.translate(0, bob);
    rot(g, -22, 0, tw, function () { blob(g, shade(O, -0.12), [-20, 0, -36, -17, -40, -14, -33, 0, -40, 14, -36, 17], -17, 17); });
    blob(g, shade(O, -0.1), [-6, -15, 4, -27, 16, -25, 20, -17], -27, -15);
    blob(g, shade(O, -0.1), [-2, 15, 6, 25, 12, 16], 15, 25);
    var body = [37, 0, 29, -14, 10, -20, -10, -16, -24, -6, -24, 6, -10, 16, 10, 20, 29, 14];
    blob(g, O, body, -20, 20);
    clipTo(g, function () { curve(g, body); }, function () {
      [[19, 6.5], [-2, 6], [-18, 5]].forEach(function (b) {
        g.save(); g.translate(b[0], 0); g.fillStyle = '#3a2418'; g.beginPath(); g.ellipse(0, 0, b[1] / 2 + 1.2, 24, 0, 0, 6.283); g.fill();
        g.fillStyle = '#fff8ee'; g.beginPath(); g.ellipse(0, 0, b[1] / 2, 24, 0, 0, 6.283); g.fill(); g.restore();
      });
      g.strokeStyle = 'rgba(160,60,20,.3)'; g.lineWidth = 0.8;
      for (var x = -14; x < 30; x += 6) for (var y = -16; y < 18; y += 6) { if (Math.abs(x - 19) < 5 || Math.abs(x + 2) < 5) continue; g.beginPath(); g.arc(x + (y / 6 % 2 ? 3 : 0), y, 3, 0.3, 2.8); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(2, -14, 18, 2.4, 0.08, 0, 6.283); g.fill();
    });
    rot(g, 8, 6, tw * 0.8, function () { leaf(g, shade(O, -0.15), 8, 6, 2.6, 11, 3.6); });
    g.restore();
  };

  // A bird in flight seen from below and behind, wings spread wide (67:19): body, swept wings, forked tail.
  function bird(g, x, y, s, ang, flap, col, light) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
    var span = 1 - 0.5 * Math.abs(flap), lift = flap * 5;
    piece(g, shade(col, -0.15), function () { g.moveTo(-2.4, 6); g.lineTo(-6, 19); g.lineTo(-1.2, 13); g.lineTo(0, 14); g.lineTo(1.2, 13); g.lineTo(6, 19); g.lineTo(2.4, 6); g.closePath(); }, 6, 19, 0.6);
    [1, -1].forEach(function (d) {
      var wing = function () { g.moveTo(d * 1.5, -4); g.quadraticCurveTo(d * 14 * span, -9 - lift, d * 27 * span, -1 - lift * 1.4); g.quadraticCurveTo(d * 21 * span, 0 - lift, d * 17 * span, 3 - lift * 0.6); g.quadraticCurveTo(d * 9 * span, 2, d * 1.5, 5); g.closePath(); };
      piece(g, col, wing, -10, 5, 0.7);
      clipTo(g, wing, function () {
        g.strokeStyle = light; g.lineWidth = 1.2; g.beginPath(); g.moveTo(d * 4, -2.5); g.quadraticCurveTo(d * 14 * span, -6 - lift, d * 22 * span, -1 - lift); g.stroke();
        g.strokeStyle = 'rgba(20,30,70,.3)'; g.lineWidth = 0.7;
        for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(d * (12 + k * 3.5) * span, -4 - lift * 0.8); g.lineTo(d * (11 + k * 3.5) * span, 2.5 - lift * 0.5); g.stroke(); }
      });
    });
    oval(g, col, 0, 1, 3.6, 8.5, 0, 0.7);
    oval(g, light, 0, 3, 2, 5, 0, 0.3);
    oval(g, shade(col, -0.1), 0, -8.5, 3.6, 3.8, 0, 0.6);
    g.restore();
  }
  D.birds = function (g, m) {
    var C = '#3f62a0', Lc = '#e9eef8';
    for (var i = 0; i < 3; i++) { g.beginPath(); g.ellipse(-30 + i * 34, 34 - i * 5, 12, 3.2, 0, 0, 6.283); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill(); }
    [[-22, 20, 0.62, 0.9, 2.2], [12, -6, 1, 0.75, 0], [-20, -24, 0.55, 0.95, 1.1]].forEach(function (b) {
      var f = m.k ? Math.sin(m.t * 8 + b[4]) * m.k : [0.1, -0.35, 0.3][Math.round(b[4]) % 3];
      bird(g, b[0] + (m.k ? Math.sin(m.t * 2 + b[4]) * 2 : 0), b[1] + (m.k ? Math.cos(m.t * 3 + b[4]) * 2 : 0), b[2], b[3], f, C, Lc);
    });
  };

  D.quail = function (g, m) {
    var B = '#a8764a', peck = m.k ? Math.max(0, Math.sin(m.t * 6)) * m.k : 0;
    for (var i = 0; i < 4; i++) grass(g, '#86a85a', -36 + i * 24, 34, 0.8);
    limb(g, '#c08a5a', [-2, 16, -3, 31], 1.6, 1.3, 0.5); limb(g, '#c08a5a', [5, 16, 5, 31], 1.6, 1.3, 0.5);
    lines(g, '#c08a5a', 1.1, [[-7, 31, -3, 31, 1, 32], [1, 31, 5, 31, 9, 32]]);
    blob(g, shade(B, -0.2), [-18, 2, -28, -2, -28, 3, -18, 8], -2, 8);
    var body = [-22, 8, -18, -6, -6, -14, 8, -14, 18, -8, 22, 4, 14, 16, 0, 20, -14, 18];
    blob(g, B, body, -14, 20);
    clipTo(g, function () { curve(g, body); }, function () {
      blob(g, '#ead4aa', [22, 0, 18, 12, 6, 20, -6, 20, 4, 8, 14, 2], 0, 20, 0.3);
      for (var y = 2; y < 20; y += 4) for (var x = -2; x < 22; x += 5) { g.beginPath(); g.arc(x + (y % 8 ? 2.5 : 0), y, 1.6, 0.2, 2.9); g.strokeStyle = 'rgba(122,85,52,.55)'; g.lineWidth = 0.8; g.stroke(); }
    });
    var wing = [-20, 6, -12, -5, 4, -5, 8, 6, -6, 13];
    blob(g, '#7a5534', wing, -5, 13);
    clipTo(g, function () { curve(g, wing); }, function () { lines(g, 'rgba(255,240,215,.75)', 1.1, [[-14, 0, -2, 1], [-15, 5, 2, 6], [-10, 9, 3, 10]]); });
    rot(g, 14, -10, peck * 0.35, function () {
      piece(g, '#2e2420', function () { g.moveTo(18, -20); g.quadraticCurveTo(19, -30, 25, -34); g.quadraticCurveTo(28, -34, 27, -31); g.quadraticCurveTo(23, -30, 21, -20); g.closePath(); }, null, null, 0.6);
      oval(g, '#8a5a3a', 18, -13, 8, 7.6);
      blob(g, '#2e2420', [24, -14.5, 29, -12.5, 24, -10.5], -14.5, -10.5, 0.5);
    });
  };

  D.donkey = function (g, m) {
    var B = '#9d99a6', F = '#7f7b89', K = '#4a4652', st = sw(m, 7), ear = sw(m, 4) * 0.18;
    limb(g, F, [-17, 4, -17 - st * 2, 33], 4.6, 4); limb(g, F, [12, 4, 12 + st * 2, 33], 4.6, 4);
    hoof(g, -17 - st * 2, 34, 4.6); hoof(g, 12 + st * 2, 34, 4.6);
    limb(g, F, [-27, -8, -31, 2, -30, 12], 1.8, 1.3); oval(g, K, -30, 13.5, 1.8, 3);
    var body = [-28, -6, -22, -13, -4, -14, 12, -14, 18, -8, 18, 4, 6, 8, -12, 8, -26, 4];
    blob(g, B, body, -14, 8);
    clipTo(g, function () { curve(g, body); }, function () { blob(g, '#dcd8e0', [-20, 4, 0, 2, 14, 2, 8, 10, -16, 10], 2, 10, 0.4); });
    limb(g, B, [-22, 4, -22 + st * 2, 34], 5, 4.4); limb(g, B, [6, 4, 6 - st * 2, 34], 5, 4.4);
    hoof(g, -22 + st * 2, 35, 5); hoof(g, 6 - st * 2, 35, 5);
    // a woven basket of dates on its back
    var bk = function () { g.moveTo(-17, -15); g.lineTo(4, -15); g.quadraticCurveTo(5, -2, 2, 2); g.lineTo(-14, 2); g.quadraticCurveTo(-18, -2, -17, -15); g.closePath(); };
    [[-12, -17], [-7, -18.5], [-2, -17.5], [-9.5, -20], [-4.5, -20.5]].forEach(function (d) { oval(g, '#7a3a1c', d[0], d[1], 2.8, 2, 0.3, 0.5); });
    piece(g, '#c99e5e', bk, -15, 2);
    clipTo(g, bk, function () {
      g.strokeStyle = 'rgba(110,70,30,.55)'; g.lineWidth = 0.9;
      for (var y = -13; y < 2; y += 3) { g.beginPath(); g.moveTo(-18, y); g.lineTo(6, y); g.stroke(); }
      for (var x = -16; x < 6; x += 3) { g.beginPath(); g.moveTo(x, -15); g.lineTo(x + 0.6, 3); g.stroke(); }
    });
    limb(g, '#7a5a3a', [-18, -14, -6, -16, 5, -14], 1.6, 1.6, 0.4);
    rot(g, 24, -26, ear, function () {
      limb(g, F, [26, -26, 27.5, -37, 28.5, -45], 4.6, 2.4); limb(g, B, [23, -27, 21.5, -38, 19.5, -46], 5, 2.6);
      limb(g, K, [21.8, -36, 20, -45], 1.6, 1, 0.3);
    });
    blob(g, B, [10, -12, 16, -22, 22, -28.5, 28, -28.5, 36, -20, 41, -14, 39, -9.5, 32, -12, 26, -14, 20, -4], -28.5, -4);
    clipTo(g, function () { curve(g, [10, -12, 16, -22, 22, -28.5, 28, -28.5, 36, -20, 41, -14, 39, -9.5, 32, -12, 26, -14, 20, -4]); }, function () { blob(g, '#dcd8e0', [34, -18, 42, -16, 41, -8, 33, -10], -18, -8, 0.3); });
    limb(g, K, [22, -28, 17, -22, 12, -14], 2.6, 2.2, 0.5);
  };

  // ---------- the list ----------
  // cap: shown after the name when the link to the Quran is well known; motion: whole-body idle when matched.
  M.LIST = [
    { id: 'camel', name: 'Camel', cap: 'Surah Al-Ghashiyah 88:17', bg: '#ffd49a', cue: 'clop', motion: 'walk' },
    { id: 'elephant', name: 'Elephant', cap: 'Surah Al-Fil', bg: '#cbd9f0', cue: 'stomp', motion: 'walk' },
    { id: 'bee', name: 'Bee', cap: 'Surah An-Nahl', bg: '#fff0a6', cue: 'buzz', motion: 'fly' },
    { id: 'ant', name: 'Ant', cap: 'Surah An-Naml', bg: '#dff2b8', cue: 'scurry', motion: 'walk' },
    { id: 'spider', name: 'Spider', cap: 'Surah Al-Ankabut', bg: '#ddcdf2', cue: 'silk', motion: 'still' },
    { id: 'cow', name: 'Cow', cap: 'Surah Al-Baqarah', bg: '#cdeebd', cue: 'moo', motion: 'walk' },
    { id: 'horse', name: 'Horse', cap: 'Surah An-Nahl 16:8', bg: '#ffdcb6', cue: 'gallop', motion: 'walk' },
    { id: 'whale', name: 'Whale', cap: 'Prophet Yunus', bg: '#c2e8f6', cue: 'splash', motion: 'still' },
    { id: 'hoopoe', name: 'Hoopoe', cap: 'Prophet Sulaiman', bg: '#ffe2cc', cue: 'flutter', motion: 'bob' },
    { id: 'crow', name: 'Crow', cap: "Surah Al-Ma'idah 5:31", bg: '#d8e2f2', cue: 'caw', motion: 'still' },
    { id: 'sheep', name: 'Sheep', cap: "Surah Al-An'am 6:143", bg: '#d3f0c4', cue: 'wool', motion: 'still' },
    { id: 'goat', name: 'Goat', cap: "Surah Al-An'am 6:143", bg: '#dfe9c2', cue: 'clop', motion: 'still' },
    { id: 'wolf', name: 'Wolf', cap: 'Surah Yusuf', bg: '#d2dbf4', cue: 'wind', motion: 'still' },
    { id: 'frog', name: 'Frog', cap: "Surah Al-A'raf 7:133", bg: '#c8eef0', cue: 'plop', motion: 'still' },
    { id: 'locust', name: 'Locust', cap: "Surah Al-A'raf 7:133", bg: '#ebf2b4', cue: 'chirp', motion: 'still' },
    { id: 'butterfly', name: 'Butterfly', cap: "Surah Al-Qari'ah", bg: '#ffd9e8', cue: 'flutter', motion: 'fly' },
    { id: 'fish', name: 'Fish', cap: 'Surah Al-Kahf', bg: '#c0ecf4', cue: 'bubble', motion: 'swim' },
    { id: 'birds', name: 'Birds', cap: 'Surah Al-Mulk 67:19', bg: '#d2e9ff', cue: 'flutter', motion: 'fly' },
    { id: 'quail', name: 'Quail', cap: 'Surah Al-Baqarah 2:57', bg: '#f4e4c0', cue: 'flutter', motion: 'still' },
    { id: 'donkey', name: 'Donkey', cap: 'Surah An-Nahl 16:8', bg: '#e9def4', cue: 'clop', motion: 'walk' }
  ];
  M.byId = {};
  M.LIST.forEach(function (a) { a.draw = D[a.id]; M.byId[a.id] = a; });
  // Pairs of animals that look alike (later levels may put both in one game: fair, but look closely).
  M.TWINS = [['sheep', 'goat'], ['horse', 'donkey'], ['crow', 'quail'], ['bee', 'locust'], ['fish', 'whale'], ['ant', 'spider']];

  // ---------- rendering ----------
  // render(canvas, animal, m, opts): draw an animal into a square canvas (cleared first).
  // opts.silhouette: one flat colour (album "not found yet"); opts.pad: margin fraction.
  var grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var g = c.getContext('2d'), r = 9;
    for (var i = 0; i < 1400; i++) { r = (r * 16807) % 2147483647; var x = r % 96; r = (r * 16807) % 2147483647; var y = r % 96; r = (r * 16807) % 2147483647;
      g.fillStyle = (r % 2) ? 'rgba(255,255,255,.5)' : 'rgba(60,30,10,.45)'; g.fillRect(x, y, 1, 1); }
    for (var k = 0; k < 40; k++) { r = (r * 16807) % 2147483647; var fx = r % 96; r = (r * 16807) % 2147483647; var fy = r % 96;
      g.strokeStyle = 'rgba(80,50,20,.25)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + (r % 9) - 4, fy + ((r >> 3) % 7) - 3); g.stroke(); }
    return (grainTile = c);
  }
  M.grain = grain;
  M.render = function (cv, a, m, o) {
    o = o || {};
    var g = cv.getContext('2d'), s = cv.width, pad = o.pad == null ? 0.06 : o.pad;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, cv.height);
    U = s * (1 - pad * 2) / 100; SH = !o.silhouette;
    g.save(); g.translate(s / 2, cv.height / 2); g.scale(U, U);
    a.draw(g, m || { t: 0, k: 0 });
    g.restore(); shadow(g, false);
    g.save(); g.globalCompositeOperation = 'source-atop';
    if (o.silhouette) { g.fillStyle = o.silhouette; g.fillRect(0, 0, s, cv.height); }
    else {
      g.globalAlpha = 0.16; g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, s, cv.height);
      g.globalAlpha = 1; var lt = g.createLinearGradient(0, 0, 0, cv.height);
      lt.addColorStop(0, 'rgba(255,250,235,.16)'); lt.addColorStop(0.5, 'rgba(255,250,235,0)'); lt.addColorStop(1, 'rgba(40,20,10,.12)');
      g.fillStyle = lt; g.fillRect(0, 0, s, cv.height);
    }
    g.restore();
    SH = true;
    return cv;
  };
})();
