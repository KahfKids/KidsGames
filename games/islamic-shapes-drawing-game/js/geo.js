/* Colouring Book: geo.js
   Tiny vector toolkit for the line-art pages. A shape is a list of absolute commands
   (['M',x,y], ['L',x,y], ['C',x1,y1,x2,y2,x,y], ['Z']) in page units (the page is 1000 x 1000).
   Shapes can be moved, scaled, rotated and mirrored, then turned into SVG path strings for Path2D. */
(function () {
  'use strict';
  var KAPPA = 0.5522847498;
  var G = window.CBGeo = {};

  function r1(n) { return Math.round(n * 10) / 10; }

  // ---------- builders ----------
  G.poly = function (pts) {
    var s = [['M', pts[0][0], pts[0][1]]];
    for (var i = 1; i < pts.length; i++) s.push(['L', pts[i][0], pts[i][1]]);
    s.push(['Z']);
    return s;
  };
  G.rect = function (x, y, w, h) { return G.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); };
  G.rrect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); var k = r * (1 - KAPPA);
    return [['M', x + r, y], ['L', x + w - r, y], ['C', x + w - k, y, x + w, y + k, x + w, y + r],
      ['L', x + w, y + h - r], ['C', x + w, y + h - k, x + w - k, y + h, x + w - r, y + h],
      ['L', x + r, y + h], ['C', x + k, y + h, x, y + h - k, x, y + h - r],
      ['L', x, y + r], ['C', x, y + k, x + k, y, x + r, y], ['Z']];
  };
  G.ellipse = function (cx, cy, rx, ry, rot) {
    var a = rx * KAPPA, b = ry * KAPPA;
    var s = [['M', cx + rx, cy], ['C', cx + rx, cy + b, cx + a, cy + ry, cx, cy + ry],
      ['C', cx - a, cy + ry, cx - rx, cy + b, cx - rx, cy], ['C', cx - rx, cy - b, cx - a, cy - ry, cx, cy - ry],
      ['C', cx + a, cy - ry, cx + rx, cy - b, cx + rx, cy], ['Z']];
    return rot ? G.tf(s, { r: rot, ox: cx, oy: cy }) : s;
  };
  G.circle = function (cx, cy, r) { return G.ellipse(cx, cy, r, r); };
  G.ngon = function (cx, cy, n, r, rot) {
    var p = [];
    for (var i = 0; i < n; i++) { var a = (rot || 0) + i * 2 * Math.PI / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    return G.poly(p);
  };
  // Star polygon with n points (outer radius ro, inner ri). rot = angle of the first point.
  G.star = function (cx, cy, n, ro, ri, rot) {
    var p = [];
    for (var i = 0; i < n * 2; i++) {
      var a = (rot == null ? -Math.PI / 2 : rot) + i * Math.PI / n, rr = i % 2 ? ri : ro;
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return G.poly(p);
  };
  // Polar point helper.
  G.pol = function (cx, cy, r, a) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };

  // Circular arc from angle a0 to a1 as cubic segments (appends to s; starts with L or M).
  function arcTo(s, cx, cy, r, a0, a1, move) {
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2))), d = (a1 - a0) / n;
    var k = 4 / 3 * Math.tan(d / 4) * r;
    var x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
    s.push([move ? 'M' : 'L', x0, y0]);
    for (var i = 0; i < n; i++) {
      var b0 = a0 + i * d, b1 = b0 + d;
      var p0x = cx + Math.cos(b0) * r, p0y = cy + Math.sin(b0) * r, p1x = cx + Math.cos(b1) * r, p1y = cy + Math.sin(b1) * r;
      s.push(['C', p0x - Math.sin(b0) * k, p0y + Math.cos(b0) * k, p1x + Math.sin(b1) * k, p1y - Math.cos(b1) * k, p1x, p1y]);
    }
    return s;
  }
  // Ring segment between radii r1 < r2, from angle a0 to a1.
  G.annulus = function (cx, cy, r1, r2, a0, a1) {
    var s = [];
    arcTo(s, cx, cy, r2, a0, a1, true);
    arcTo(s, cx, cy, r1, a1, a0, false);
    s.push(['Z']);
    return s;
  };
  G.sector = function (cx, cy, r, a0, a1) {
    var s = [['M', cx, cy]];
    arcTo(s, cx, cy, r, a0, a1, false);
    s.push(['Z']);
    return s;
  };
  // Full ring (use with rule 'evenodd').
  G.ring = function (cx, cy, r1, r2) { return G.circle(cx, cy, r2).concat(G.circle(cx, cy, r1)); };

  // Smooth closed (or open) curve through points (Catmull-Rom). A point [x, y, 1] is a sharp corner.
  G.cr = function (pts, open) {
    var n = pts.length, s = [['M', pts[0][0], pts[0][1]]], t = 1 / 6;
    function P(i) { return open ? pts[Math.max(0, Math.min(n - 1, i))] : pts[(i + n) % n]; }
    var last = open ? n - 1 : n;
    for (var i = 0; i < last; i++) {
      var p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      var c1x = p1[2] ? p1[0] : p1[0] + (p2[0] - p0[0]) * t, c1y = p1[2] ? p1[1] : p1[1] + (p2[1] - p0[1]) * t;
      var c2x = p2[2] ? p2[0] : p2[0] - (p3[0] - p1[0]) * t, c2y = p2[2] ? p2[1] : p2[1] - (p3[1] - p1[1]) * t;
      s.push(['C', c1x, c1y, c2x, c2y, p2[0], p2[1]]);
    }
    if (!open) s.push(['Z']);
    return s;
  };

  // Absolute SVG path syntax (M L H V C Q Z, uppercase) to commands, so shapes can be written as SVG.
  G.path = function (str) {
    var tok = str.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), s = [], i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
    function num() { return parseFloat(tok[i++]); }
    while (i < tok.length) {
      if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++].toUpperCase();
      if (cmd === 'M') { x = num(); y = num(); sx = x; sy = y; s.push(['M', x, y]); cmd = 'L'; }
      else if (cmd === 'L') { x = num(); y = num(); s.push(['L', x, y]); }
      else if (cmd === 'H') { x = num(); s.push(['L', x, y]); }
      else if (cmd === 'V') { y = num(); s.push(['L', x, y]); }
      else if (cmd === 'C') { var a = num(), b = num(), c = num(), d = num(); x = num(); y = num(); s.push(['C', a, b, c, d, x, y]); }
      else if (cmd === 'Q') {
        var qx = num(), qy = num(), ex = num(), ey = num();
        s.push(['C', x + (qx - x) * 2 / 3, y + (qy - y) * 2 / 3, ex + (qx - ex) * 2 / 3, ey + (qy - ey) * 2 / 3, ex, ey]);
        x = ex; y = ey;
      } else if (cmd === 'Z') { s.push(['Z']); x = sx; y = sy; }
      else i++;
    }
    return s;
  };

  // Pointed (Islamic) arch: bottom-left x, bottom y, width, total height, arch height.
  G.arch = function (x, y, w, h, ah) {
    var top = y - h, sp = top + ah;
    return [['M', x, y], ['L', x, sp], ['C', x, sp - ah * 0.55, x + w * 0.28, top + ah * 0.12, x + w / 2, top],
      ['C', x + w * 0.72, top + ah * 0.12, x + w, sp - ah * 0.55, x + w, sp], ['L', x + w, y], ['Z']];
  };
  // Round arch.
  G.rarch = function (x, y, w, h) {
    var r = w / 2, s = [['M', x, y]];
    arcTo(s, x + r, y - h + r, r, Math.PI, Math.PI * 2, false);
    s.push(['L', x + w, y], ['Z']);
    return s;
  };
  // Onion dome sitting on baseY.
  G.dome = function (cx, by, w, h) {
    var hw = w / 2;
    return [['M', cx - hw, by], ['C', cx - hw * 1.32, by - h * 0.42, cx - hw * 0.42, by - h * 0.66, cx, by - h],
      ['C', cx + hw * 0.42, by - h * 0.66, cx + hw * 1.32, by - h * 0.42, cx + hw, by], ['Z']];
  };
  // Leaf from base (x0,y0) to tip (x1,y1). w = half width, bend bends the midrib sideways.
  G.leaf = function (x0, y0, x1, y1, w, bend) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, b = bend || 0;
    function P(t, off) { return [x0 + dx * t + nx * (off + b * Math.sin(Math.PI * t)), y0 + dy * t + ny * (off + b * Math.sin(Math.PI * t))]; }
    var a = P(0.3, w * 1.05), c = P(0.72, w * 0.8), d = P(0.72, -w * 0.8), e = P(0.3, -w * 1.05);
    return [['M', x0, y0], ['C', a[0], a[1], c[0], c[1], x1, y1], ['C', d[0], d[1], e[0], e[1], x0, y0], ['Z']];
  };
  // Midrib line of a leaf (open path for a detail).
  G.rib = function (x0, y0, x1, y1, bend, t1) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, b = bend || 0, T = t1 || 0.8;
    var m = [x0 + dx * T / 2 + nx * b * 1.15, y0 + dy * T / 2 + ny * b * 1.15];
    return [['M', x0 + dx * 0.06, y0 + dy * 0.06], ['C', m[0], m[1], m[0], m[1], x0 + dx * T, y0 + dy * T]];
  };
  G.line = function (pts) {
    var s = [['M', pts[0][0], pts[0][1]]];
    for (var i = 1; i < pts.length; i++) s.push(['L', pts[i][0], pts[i][1]]);
    return s;
  };

  // Outline of a union of circles {c:[x,y,r]} and boxes {b:[x,y,w,h]}, which must be star-shaped around
  // (cx, cy): cast rays from the centre and keep the farthest exit point of any part.
  G.union = function (parts, cx, cy) {
    if (cx == null) {
      cx = 0; cy = 0;
      parts.forEach(function (p) { if (p.c) { cx += p.c[0]; cy += p.c[1]; } else { cx += p.b[0] + p.b[2] / 2; cy += p.b[1] + p.b[3] / 2; } });
      cx /= parts.length; cy /= parts.length;
    }
    var N = 360, pts = [];
    for (var i = 0; i < N; i++) {
      var a = i * 2 * Math.PI / N, dx = Math.cos(a), dy = Math.sin(a), best = 0;
      parts.forEach(function (p) {
        var t = -1;
        if (p.c) {
          var ox = cx - p.c[0], oy = cy - p.c[1], bq = ox * dx + oy * dy, cq = ox * ox + oy * oy - p.c[2] * p.c[2], disc = bq * bq - cq;
          if (disc >= 0) t = -bq + Math.sqrt(disc);
        } else {
          var tmin = -1e9, tmax = 1e9, B = p.b;
          [[dx, cx, B[0], B[0] + B[2]], [dy, cy, B[1], B[1] + B[3]]].forEach(function (q) {
            if (Math.abs(q[0]) < 1e-9) { if (q[1] < q[2] || q[1] > q[3]) { tmin = 1e9; } return; }
            var t1 = (q[2] - q[1]) / q[0], t2 = (q[3] - q[1]) / q[0];
            tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
          });
          if (tmax >= tmin) t = tmax;
        }
        if (t > best) best = t;
      });
      pts.push([cx + dx * best, cy + dy * best]);
    }
    return G.poly(pts);
  };
  // Fluffy cloud: a row of bumps on a flat base.
  G.cloud = function (cx, cy, w, h) {
    var hw = w / 2, r = h * 0.5, parts = [{ b: [cx - hw + r * 0.6, cy - r * 0.2, w - r * 1.2, r * 0.9] }];
    parts.push({ c: [cx - hw + r * 0.7, cy + r * 0.1, r * 0.6] }, { c: [cx + hw - r * 0.7, cy + r * 0.1, r * 0.6] });
    parts.push({ c: [cx - w * 0.2, cy - r * 0.2, r * 0.85] }, { c: [cx + w * 0.12, cy - r * 0.45, r] });
    return G.union(parts, cx, cy + r * 0.1);
  };
  // Crescent: circle (cx,cy,r) with the circle (cx+dx, cy+dy, r2) cut away.
  G.crescent = function (cx, cy, r, dx, dy, r2) {
    // contiguous run of samples on a circle that pass test(), in angle order
    function run(ox, oy, rr, test) {
      var N = 180, ok = [], i, start = 0;
      for (i = 0; i < N; i++) { var a = i * Math.PI * 2 / N, x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr; ok.push({ x: x, y: y, in: test(x, y) }); }
      for (i = 0; i < N; i++) if (ok[i].in && !ok[(i + N - 1) % N].in) { start = i; break; }
      var out = [];
      for (i = 0; i < N; i++) { var q = ok[(start + i) % N]; if (!q.in) break; out.push([q.x, q.y]); }
      return out;
    }
    var outer = run(cx, cy, r, function (x, y) { return Math.hypot(x - cx - dx, y - cy - dy) >= r2; });
    var inner = run(cx + dx, cy + dy, r2, function (x, y) { return Math.hypot(x - cx, y - cy) < r; });
    var e = outer[outer.length - 1];
    if (Math.hypot(inner[0][0] - e[0], inner[0][1] - e[1]) > Math.hypot(inner[inner.length - 1][0] - e[0], inner[inner.length - 1][1] - e[1])) inner.reverse();
    return G.poly(outer.concat(inner));
  };

  // ---------- transforms ----------
  // o: { x, y (translate), s or sx/sy (scale), r (radians), ox, oy (origin, default 0,0) }
  G.tf = function (shape, o) {
    var ox = o.ox || 0, oy = o.oy || 0, sx = o.sx != null ? o.sx : (o.s != null ? o.s : 1), sy = o.sy != null ? o.sy : (o.s != null ? o.s : 1);
    var c = Math.cos(o.r || 0), sn = Math.sin(o.r || 0), tx = o.x || 0, ty = o.y || 0;
    function P(x, y) { var px = (x - ox) * sx, py = (y - oy) * sy; return [ox + px * c - py * sn + tx, oy + px * sn + py * c + ty]; }
    return shape.map(function (cm) {
      if (cm[0] === 'Z') return ['Z'];
      var out = [cm[0]];
      for (var i = 1; i < cm.length; i += 2) { var p = P(cm[i], cm[i + 1]); out.push(p[0], p[1]); }
      return out;
    });
  };
  G.move = function (shape, x, y) { return G.tf(shape, { x: x, y: y }); };
  G.flipX = function (shape, cx) { return G.tf(shape, { sx: -1, sy: 1, ox: cx }); };
  G.join = function () { var s = []; for (var i = 0; i < arguments.length; i++) s = s.concat(arguments[i]); return s; };

  // ---------- output ----------
  G.str = function (shape) {
    var out = '';
    for (var i = 0; i < shape.length; i++) {
      var c = shape[i];
      out += c[0];
      for (var j = 1; j < c.length; j++) out += (j > 1 ? ' ' : '') + r1(c[j]);
    }
    return out;
  };
  G.bbox = function (shape) {
    var b = [1e9, 1e9, -1e9, -1e9];
    shape.forEach(function (c) { for (var j = 1; j < c.length; j += 2) { b[0] = Math.min(b[0], c[j]); b[1] = Math.min(b[1], c[j + 1]); b[2] = Math.max(b[2], c[j]); b[3] = Math.max(b[3], c[j + 1]); } });
    return b;
  };
})();
