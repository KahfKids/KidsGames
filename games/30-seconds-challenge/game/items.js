/* Sharp Eyes: items.js
   Twenty friendly things drawn in code (no images, no emoji), each with the ways one copy can be made different:
   another colour, a missing part, an extra spot, mirrored, turned, tilted or smaller.
   Every difference is measured before it is used (SpotItems.score): both pictures are rendered small and compared
   pixel by pixel in Lab colour, also through protanopia and deuteranopia filters, so a round can never ask a child
   to find a difference that is invisible (or invisible to a colour-blind child). */
(function () {
  'use strict';
  var I = window.SpotItems = {};

  // ---------- colour helpers ----------
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function hexToRgb(c) { return hex(c); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function ink(c) { return mix(shade(c, -0.6), '#2a1636', 0.35); }
  I.shade = shade; I.mix = mix;

  // ---------- drawing helpers (100 x 100 units) ----------
  // Fill the current path with a soft top-lit gradient and an ink outline drawn OUTSIDE the shape
  // (stroke twice as wide first, then fill on top), so overlapping sub-shapes merge into one silhouette.
  function blob(g, col, y0, y1, lw) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = (lw || 2.4) * 2; g.strokeStyle = ink(col); g.stroke();
    var gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, shade(col, 0.3)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.18));
    g.fillStyle = gr; g.fill();
  }
  function flat(g, col) { g.fillStyle = col; g.fill(); }
  function line(g, col, w, pts) {
    g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function shine(g, x, y, rx, ry, rot, a) {
    g.save(); g.fillStyle = 'rgba(255,255,255,' + (a || 0.55) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); g.fill(); g.restore();
  }
  function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.283); } // adds a sub-path (no stray joining line)
  function ell(g, x, y, rx, ry, rot) { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.283); }
  function rrect(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function star8(g, x, y, r, inner, rot) {
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2 + (rot || 0), q = i % 2 ? r * (inner || 0.6) : r;
      i ? g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function sparkle(g, x, y, r) { // four-point twinkle
    g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.closePath();
  }
  // House rule: no faces anywhere. Animals are clean faceless shapes (no eyes, mouths, cheeks or expressions).
  function leaf(g, x, y, ang, len, wid, col) {
    g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -wid, len, 0); g.quadraticCurveTo(len * 0.5, wid, 0, 0); g.closePath();
    blob(g, col, -wid, wid, 1.6); line(g, shade(col, -0.25), 1.2, [len * 0.1, 0, len * 0.85, 0]); g.restore();
  }

  // ---------- the items ----------
  // colors: the main colour choices (first is the default). parts: things that can go missing.
  // spot: where an extra dot goes [x, y, r]. Coordinates are a 100 x 100 box.
  var LIST = [
    { id: 'lantern', name: 'Lantern', colors: ['#e9a93a', '#d0703a', '#2aa7a0', '#d94a5a', '#4a74d9', '#8e5cd9', '#e9c23a'],
      parts: ['ring', 'bars', 'tassel'], spot: [50, 25, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.ring) { g.beginPath(); g.arc(50, 11, 6, 0, 6.283); g.lineWidth = 6; g.strokeStyle = ink(c); g.stroke(); g.lineWidth = 2.6; g.strokeStyle = shade(c, 0.15); g.stroke(); }
        g.beginPath(); g.moveTo(32, 33); g.quadraticCurveTo(34, 20, 50, 16); g.quadraticCurveTo(66, 20, 68, 33); g.closePath(); blob(g, c, 16, 33);
        g.beginPath(); g.moveTo(34, 33); g.lineTo(66, 33); g.lineTo(71, 53); g.lineTo(64, 73); g.lineTo(36, 73); g.lineTo(29, 53); g.closePath();
        g.lineWidth = 4.8; g.strokeStyle = ink(c); g.stroke();
        var gl = g.createRadialGradient(50, 55, 2, 50, 53, 24); gl.addColorStop(0, '#fffbe0'); gl.addColorStop(0.45, '#ffd866'); gl.addColorStop(1, '#f39a2c');
        g.fillStyle = gl; g.fill();
        if (!v.hide.bars) { g.strokeStyle = shade(c, -0.1); line(g, shade(c, -0.1), 3, [50, 33, 50, 73]); line(g, shade(c, -0.1), 2.6, [42, 33, 38, 53, 42, 73]); line(g, shade(c, -0.1), 2.6, [58, 33, 62, 53, 58, 73]); }
        g.beginPath(); g.moveTo(50, 46); g.quadraticCurveTo(56, 55, 50, 62); g.quadraticCurveTo(44, 55, 50, 46); flat(g, 'rgba(255,255,255,.75)');
        g.beginPath(); g.moveTo(34, 73); g.lineTo(66, 73); g.lineTo(59, 81); g.lineTo(41, 81); g.closePath(); blob(g, c, 73, 81);
        if (!v.hide.tassel) { line(g, ink('#d94a5a'), 6, [50, 81, 50, 90]); line(g, '#e85b6c', 3, [50, 81, 50, 90]); g.beginPath(); g.moveTo(46, 89); g.lineTo(54, 89); g.lineTo(56, 97); g.lineTo(44, 97); g.closePath(); blob(g, '#e85b6c', 89, 97, 1.6); }
        shine(g, 42, 24, 5, 2.5, -0.5);
      } },
    { id: 'palm', name: 'Date palm', colors: ['#3fa34d', '#2e8b57', '#7cbf34', '#1f9e8a', '#a3c43a'],
      parts: ['dates', 'trunk-rings'], spot: [60, 64, 5],
      draw: function (g, v) {
        var c = v.c, wood = '#b27a43';
        g.beginPath(); g.moveTo(40, 94); g.quadraticCurveTo(44, 62, 51, 36); g.lineTo(59, 37); g.quadraticCurveTo(54, 64, 54, 94); g.closePath(); blob(g, wood, 36, 94);
        if (!v.hide['trunk-rings']) for (var k = 0; k < 6; k++) { var y = 46 + k * 8, x = 50.5 + (94 - y) * -0.06 + (y < 60 ? 3 : 0); line(g, shade(wood, -0.3), 2, [x - 5, y, x + 2, y + 2.5, x + 7, y]); }
        if (!v.hide.dates) {
          [[46, 42], [50, 46], [44, 47], [62, 43], [66, 46], [60, 48]].forEach(function (d) { g.beginPath(); ell(g, d[0], d[1], 3.4, 4.2, 0); blob(g, '#c4512a', d[1] - 4, d[1] + 4, 1.3); });
        }
        var cx = 55, cy = 34;
        [[-2.75, 34, 9], [-2.25, 30, 8], [-1.7, 26, 7], [-0.9, 28, 8], [-0.4, 34, 9], [0.25, 32, 8], [3.2, 30, 8]].forEach(function (f) { leaf(g, cx, cy, f[0], f[1], f[2], c); });
        g.beginPath(); circ(g, cx, cy, 5); blob(g, shade(c, -0.15), 29, 39, 1.4);
      } },
    { id: 'camel', name: 'Camel', colors: ['#d9a066', '#b97a3e', '#ead2a8', '#8f6040', '#c9b9a0'],
      parts: ['saddle', 'tail', 'ear'], spot: [40, 62, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.tail) { line(g, ink(c), 6, [22, 52, 17, 64, 18, 72]); line(g, c, 2.6, [22, 52, 17, 64, 18, 72]); g.beginPath(); ell(g, 18, 74, 3, 5, 0.2); blob(g, shade(c, -0.35), 69, 79, 1.2); }
        g.beginPath();
        ell(g, 44, 58, 25, 14, 0);
        g.moveTo(26, 52); g.bezierCurveTo(30, 30, 52, 28, 58, 50); g.closePath();
        g.moveTo(60, 60); g.quadraticCurveTo(72, 46, 70, 30); g.lineTo(80, 28); g.quadraticCurveTo(80, 52, 64, 66); g.closePath();
        ell(g, 79, 26, 10, 6.5, 0.15);
        [[28, 64], [36, 66], [54, 66], [62, 64]].forEach(function (L) { rrect(g, L[0] - 3, L[1], 6.5, 28 - (L[1] - 64), 3); });
        blob(g, c, 28, 92);
        if (!v.hide.ear) { g.beginPath(); ell(g, 73, 21, 2.6, 4.6, -0.5); blob(g, shade(c, -0.1), 16, 26, 1.3); }
        if (!v.hide.saddle) {
          g.beginPath(); g.moveTo(32, 46); g.quadraticCurveTo(42, 30, 54, 44); g.lineTo(56, 56); g.lineTo(31, 56); g.closePath(); blob(g, '#d8434e', 36, 56, 1.6);
          line(g, '#ffd166', 2.2, [33, 50, 55, 50]);
          for (var t = 0; t < 6; t++) { line(g, '#ffd166', 1.8, [33 + t * 4.4, 57, 33 + t * 4.4, 61]); }
        }
        shine(g, 42, 40, 6, 2.5, -0.4, 0.4);
      } },
    { id: 'star', name: 'Star', colors: ['#f6c453', '#ef7fb0', '#36c2b4', '#5aa9ff', '#b48cff', '#ff9f43', '#7ad06a'],
      parts: ['center'], spot: [68, 32, 5],
      draw: function (g, v) {
        var c = v.c;
        g.beginPath(); star8(g, 50, 52, 40, 0.66); blob(g, c, 12, 92);
        g.beginPath(); star8(g, 50, 52, 30, 0.66); g.lineWidth = 2; g.strokeStyle = shade(c, 0.45); g.stroke();
        if (!v.hide.center) { g.beginPath(); circ(g, 50, 52, 12); blob(g, '#fff4cf', 40, 64, 1.6); g.beginPath(); star8(g, 50, 52, 7, 0.5); flat(g, shade(c, -0.1)); }
        shine(g, 38, 34, 7, 3, -0.7, 0.5);
      } },
    { id: 'cup', name: 'Cup of milk', colors: ['#4a90d9', '#e2574c', '#47b26b', '#f2b134', '#9b6bd6', '#ef7fb0'],
      parts: ['handle', 'band', 'milk'], spot: [42, 70, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.handle) { g.beginPath(); g.arc(68, 58, 13, -Math.PI / 2, Math.PI / 2); g.lineWidth = 12; g.strokeStyle = ink(c); g.stroke(); g.lineWidth = 7; g.strokeStyle = c; g.stroke(); }
        g.beginPath(); g.moveTo(26, 34); g.lineTo(74, 34); g.lineTo(70, 82); g.quadraticCurveTo(69, 90, 60, 90); g.lineTo(40, 90); g.quadraticCurveTo(31, 90, 30, 82); g.closePath(); blob(g, c, 34, 90);
        if (!v.hide.band) { g.beginPath(); g.moveTo(28.4, 56); g.lineTo(71.6, 56); g.lineTo(71, 64); g.lineTo(29, 64); g.closePath(); flat(g, '#fff6e0'); [36, 44, 52, 60, 66].forEach(function (x) { g.beginPath(); circ(g, x, 60, 1.8); flat(g, shade(c, -0.1)); }); }
        g.beginPath(); ell(g, 50, 34, 24, 6.5, 0); g.lineWidth = 4.8; g.strokeStyle = ink(c); g.stroke(); flat(g, v.hide.milk ? shade(c, -0.45) : '#fbfaf4');
        if (!v.hide.milk) { g.beginPath(); ell(g, 50, 35, 18, 3.8, 0); flat(g, '#efeadc'); }
        shine(g, 34, 50, 2.6, 9, 0.1, 0.5);
      } },
    { id: 'book', name: 'Book', colors: ['#3a7bd5', '#d64545', '#2e9e6a', '#8a4fd1', '#e08a2e'],
      parts: ['ribbon', 'stand'], spot: [36, 46, 5],
      draw: function (g, v) {
        var c = v.c, wood = '#a46a3a';
        if (!v.hide.stand) { line(g, ink(wood), 9, [34, 70, 26, 92]); line(g, ink(wood), 9, [66, 70, 74, 92]); line(g, wood, 5, [34, 70, 26, 92]); line(g, wood, 5, [66, 70, 74, 92]);
          g.beginPath(); rrect(g, 22, 66, 56, 8, 3); blob(g, wood, 66, 74, 1.8); }
        g.beginPath(); g.moveTo(12, 28); g.quadraticCurveTo(30, 22, 50, 30); g.quadraticCurveTo(70, 22, 88, 28); g.lineTo(88, 70); g.quadraticCurveTo(70, 64, 50, 72); g.quadraticCurveTo(30, 64, 12, 70); g.closePath(); blob(g, c, 22, 72);
        g.beginPath(); g.moveTo(16, 26); g.quadraticCurveTo(32, 20, 50, 28); g.lineTo(50, 66); g.quadraticCurveTo(32, 59, 16, 64); g.closePath();
        g.moveTo(84, 26); g.quadraticCurveTo(68, 20, 50, 28); g.lineTo(50, 66); g.quadraticCurveTo(68, 59, 84, 64); g.closePath();
        g.fillStyle = '#fffaf0'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = '#c9b89a'; g.stroke();
        for (var k = 0; k < 4; k++) { var y = 34 + k * 7; line(g, '#b9c2d8', 1.6, [22, y - 1, 44, y + 1.5]); line(g, '#b9c2d8', 1.6, [56, y + 1.5, 78, y - 1]); }
        if (!v.hide.ribbon) { g.beginPath(); g.moveTo(52, 28); g.lineTo(58, 28); g.lineTo(58, 86); g.lineTo(55, 82); g.lineTo(52, 86); g.closePath(); blob(g, '#f2c14e', 28, 86, 1.4); }
      } },
    { id: 'kite', name: 'Kite', colors: ['#e94f64', '#3fa7e0', '#f5b82e', '#5cc46b', '#9b6bd6'],
      parts: ['tail', 'spars'], spot: [62, 34, 5],
      draw: function (g, v) {
        var c = v.c, light = shade(c, 0.55);
        if (!v.hide.tail) {
          g.beginPath(); g.moveTo(50, 76); g.bezierCurveTo(44, 86, 64, 84, 62, 94); g.lineWidth = 2; g.strokeStyle = '#5a4630'; g.stroke();
          [[52, 82, '#ffd166'], [57, 87, '#5aa9ff'], [62, 93, '#ef5f8f']].forEach(function (b) {
            g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] - 6, b[1] - 4); g.lineTo(b[0] - 6, b[1] + 4); g.closePath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + 6, b[1] - 4); g.lineTo(b[0] + 6, b[1] + 4); g.closePath(); blob(g, b[2], b[1] - 4, b[1] + 4, 1.2); });
        }
        g.beginPath(); g.moveTo(50, 8); g.lineTo(80, 38); g.lineTo(50, 78); g.lineTo(20, 38); g.closePath(); blob(g, c, 8, 78);
        g.beginPath(); g.moveTo(50, 8); g.lineTo(80, 38); g.lineTo(50, 38); g.closePath(); g.moveTo(50, 38); g.lineTo(20, 38); g.lineTo(50, 78); g.closePath(); flat(g, light);
        if (!v.hide.spars) { line(g, '#7a5530', 2.4, [50, 10, 50, 76]); line(g, '#7a5530', 2.4, [22, 38, 78, 38]); }
      } },
    { id: 'fish', name: 'Fish', colors: ['#f5862e', '#3d8fe0', '#e2496b', '#36b38a', '#f2c12e', '#8c5ad6'],
      parts: ['fin', 'stripes', 'tail'], spot: [52, 62, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.fin) { g.beginPath(); g.moveTo(36, 40); g.quadraticCurveTo(46, 20, 62, 36); g.closePath(); blob(g, shade(c, -0.12), 22, 40, 1.8); }
        g.beginPath();
        g.moveTo(84, 52); g.bezierCurveTo(78, 30, 40, 26, 26, 52); g.bezierCurveTo(40, 78, 78, 74, 84, 52); g.closePath();
        if (!v.hide.tail) { g.moveTo(30, 52); g.lineTo(10, 36); g.quadraticCurveTo(16, 52, 10, 68); g.closePath(); }
        blob(g, c, 30, 74);
        g.beginPath(); g.moveTo(40, 62); g.bezierCurveTo(52, 72, 72, 70, 80, 60); g.bezierCurveTo(70, 66, 52, 66, 40, 62); flat(g, shade(c, 0.45));
        if (!v.hide.stripes) { [48, 60].forEach(function (x) { g.beginPath(); g.moveTo(x, 35); g.quadraticCurveTo(x + 5, 52, x, 69); g.lineWidth = 4.5; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke(); }); }
        shine(g, 58, 38, 8, 2.5, -0.1, 0.45);
      } },
    { id: 'cat', name: 'Cat', colors: ['#f29a3a', '#9aa3ad', '#5b5868', '#f3ece0', '#a8754a'],
      parts: ['tail', 'stripes', 'ears'], spot: [42, 70, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.tail) { g.beginPath(); g.moveTo(66, 86); g.bezierCurveTo(90, 86, 92, 60, 80, 52); g.lineWidth = 12; g.strokeStyle = ink(c); g.lineCap = 'round'; g.stroke(); g.lineWidth = 7; g.strokeStyle = c; g.stroke(); }
        g.beginPath();
        g.moveTo(30, 90); g.bezierCurveTo(24, 60, 36, 46, 50, 46); g.bezierCurveTo(64, 46, 76, 60, 70, 90); g.closePath();
        circ(g, 50, 36, 19);
        if (!v.hide.ears) { g.moveTo(34, 28); g.lineTo(32, 8); g.lineTo(48, 20); g.closePath(); g.moveTo(66, 28); g.lineTo(68, 8); g.lineTo(52, 20); g.closePath(); }
        blob(g, c, 10, 90);
        if (!v.hide.ears) { g.beginPath(); g.moveTo(36, 23); g.lineTo(35, 13); g.lineTo(43, 20); g.closePath(); g.moveTo(64, 23); g.lineTo(65, 13); g.lineTo(57, 20); g.closePath(); flat(g, '#f6a5b5'); }
        g.beginPath(); ell(g, 50, 72, 11, 14, 0); flat(g, shade(c, 0.45));
        if (!v.hide.stripes) { var s = shade(c, -0.32); line(g, s, 2.6, [50, 18, 50, 25]); line(g, s, 2.6, [43, 20, 45, 26]); line(g, s, 2.6, [57, 20, 55, 26]); line(g, s, 3, [31, 66, 37, 64]); line(g, s, 3, [30, 74, 37, 73]); line(g, s, 3, [69, 66, 63, 64]); line(g, s, 3, [70, 74, 63, 73]); }
      } },
    { id: 'bird', name: 'Bird', colors: ['#4aa3e8', '#f2c12e', '#e8574a', '#5cbf6a', '#a070dc'],
      parts: ['wing', 'crest', 'legs'], spot: [44, 66, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.legs) { line(g, '#e08a2e', 2.6, [44, 74, 42, 90]); line(g, '#e08a2e', 2.6, [54, 74, 56, 90]); line(g, '#e08a2e', 2.2, [37, 90, 46, 90]); line(g, '#e08a2e', 2.2, [52, 90, 61, 90]); }
        if (!v.hide.crest) { leaf(g, 62, 26, -2.0, 13, 3.5, shade(c, -0.15)); leaf(g, 64, 26, -1.5, 15, 3.5, shade(c, -0.15)); }
        g.beginPath();
        g.moveTo(26, 52); g.lineTo(8, 40); g.lineTo(12, 56); g.closePath();
        ell(g, 46, 58, 24, 19, 0); circ(g, 64, 40, 15);
        blob(g, c, 25, 77);
        g.beginPath(); ell(g, 50, 66, 15, 10, 0); flat(g, shade(c, 0.5));
        g.beginPath(); g.moveTo(77, 36); g.lineTo(90, 42); g.lineTo(77, 47); g.closePath(); blob(g, '#f59a2e', 36, 47, 1.5);
        if (!v.hide.wing) { g.beginPath(); g.moveTo(30, 52); g.bezierCurveTo(36, 40, 56, 44, 56, 56); g.bezierCurveTo(48, 66, 34, 64, 30, 52); g.closePath(); blob(g, shade(c, -0.2), 44, 64, 1.6); line(g, shade(c, -0.38), 1.6, [36, 55, 48, 58]); }
        shine(g, 58, 32, 5, 2.4, -0.5, 0.5);
      } },
    { id: 'apple', name: 'Apple', colors: ['#e23b3b', '#7cc242', '#f2c53d', '#f08a2e', '#c2364f'],
      parts: ['leaf', 'stem'], spot: [40, 64, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.stem) line(g, '#6b4423', 4, [50, 32, 52, 18]);
        if (!v.hide.leaf) leaf(g, 53, 24, -0.45, 22, 7, '#4caf50');
        g.beginPath(); g.moveTo(50, 32);
        g.bezierCurveTo(38, 22, 14, 28, 16, 54); g.bezierCurveTo(18, 80, 36, 94, 50, 86);
        g.bezierCurveTo(64, 94, 82, 80, 84, 54); g.bezierCurveTo(86, 28, 62, 22, 50, 32); g.closePath(); blob(g, c, 26, 92);
        shine(g, 32, 46, 5, 9, 0.35, 0.55);
      } },
    { id: 'flower', name: 'Flower', colors: ['#ef5f8f', '#e94b4b', '#9b6bd6', '#4a90e2', '#ff9f3a', '#f7f2ea'],
      parts: ['leaf', 'petal', 'stem'], spot: [34, 30, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.stem) line(g, ink('#4caf50'), 7, [50, 54, 52, 94]);
        if (!v.hide.stem) line(g, '#4caf50', 3.4, [50, 54, 52, 94]);
        if (!v.hide.leaf) leaf(g, 51, 78, -2.6, 22, 7, '#56b45a');
        g.beginPath();
        for (var i = 0; i < 6; i++) { if (i === 0 && v.hide.petal) continue; var a = i * Math.PI / 3 - Math.PI / 3, x = 50 + Math.cos(a) * 17, y = 38 + Math.sin(a) * 17; g.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ell(g, x, y, 12, 9, a); }
        blob(g, c, 10, 66);
        g.beginPath(); circ(g, 50, 38, 10); blob(g, '#ffcf3d', 28, 48, 1.6);
        g.beginPath(); circ(g, 50, 38, 5.5); g.lineWidth = 1.6; g.strokeStyle = '#d99a1e'; g.stroke();
      } },
    { id: 'house', name: 'House', colors: ['#d9534f', '#3a7bd5', '#2e9e6a', '#8a4fd1', '#e08a2e'],
      parts: ['door', 'window', 'chimney'], spot: [50, 36, 5],
      draw: function (g, v) {
        var c = v.c, wall = '#f6e7c8';
        if (!v.hide.chimney) { g.beginPath(); g.rect(64, 16, 9, 22); blob(g, '#b5654a', 16, 38, 1.8); }
        g.beginPath(); g.rect(22, 46, 56, 44); blob(g, wall, 46, 90);
        g.beginPath(); g.moveTo(14, 50); g.lineTo(50, 16); g.lineTo(86, 50); g.closePath(); blob(g, c, 16, 50);
        line(g, shade(c, 0.35), 2, [24, 46, 50, 22]);
        if (!v.hide.door) { g.beginPath(); g.moveTo(30, 90); g.lineTo(30, 70); g.arc(37, 70, 7, Math.PI, 0); g.lineTo(44, 90); g.closePath(); blob(g, '#9a5b30', 63, 90, 1.6); g.beginPath(); circ(g, 41, 80, 1.3); flat(g, '#ffd166'); }
        if (!v.hide.window) { g.beginPath(); g.rect(54, 58, 16, 16); blob(g, '#9fd8f5', 58, 74, 1.8); line(g, '#ffffff', 2, [62, 58, 62, 74]); line(g, '#ffffff', 2, [54, 66, 70, 66]); }
      } },
    { id: 'boat', name: 'Boat', colors: ['#a0612f', '#3a7bd5', '#d9534f', '#2e9e6a', '#e0a02e'],
      parts: ['flag', 'sail', 'stripe'], spot: [34, 72, 5],
      draw: function (g, v) {
        var c = v.c;
        line(g, ink('#8a5a2e'), 6, [50, 14, 50, 66]); line(g, '#8a5a2e', 3, [50, 14, 50, 66]);
        if (!v.hide.flag) { g.beginPath(); g.moveTo(50, 12); g.lineTo(64, 16); g.lineTo(50, 21); g.closePath(); blob(g, '#2fbf9a', 12, 21, 1.4); }
        if (!v.hide.sail) { g.beginPath(); g.moveTo(52, 20); g.quadraticCurveTo(76, 40, 82, 60); g.lineTo(28, 60); g.quadraticCurveTo(42, 46, 52, 20); g.closePath(); blob(g, '#fbf1d8', 20, 60, 2); line(g, '#e3d3ae', 1.6, [52, 26, 46, 58]); }
        g.beginPath(); g.moveTo(10, 62); g.lineTo(90, 60); g.quadraticCurveTo(84, 78, 72, 82); g.lineTo(28, 82); g.quadraticCurveTo(16, 76, 10, 62); g.closePath(); blob(g, c, 60, 82);
        if (!v.hide.stripe) line(g, '#ffe6a0', 3, [16, 68, 86, 66.5]);
        g.beginPath(); g.moveTo(6, 84); for (var x = 6; x <= 94; x += 11) g.quadraticCurveTo(x + 5.5, 79, x + 11, 84); g.lineTo(94, 92); g.lineTo(6, 92); g.closePath(); blob(g, '#4fb6e0', 79, 92, 1.6);
      } },
    { id: 'sky', name: 'Night sky', colors: ['#1d2a6b', '#4b2c7f', '#145f73', '#7a2f62', '#2f4f9f'],
      parts: ['big-star', 'hills'], spot: [32, 64, 5],
      draw: function (g, v) {
        var c = v.c;
        g.beginPath(); rrect(g, 14, 14, 72, 72, 14); blob(g, c, 14, 86, 2.4);
        g.save(); g.beginPath(); rrect(g, 14, 14, 72, 72, 14); g.clip();
        if (!v.hide.hills) { g.beginPath(); g.moveTo(14, 86); g.lineTo(14, 70); g.quadraticCurveTo(34, 58, 52, 72); g.quadraticCurveTo(70, 62, 86, 68); g.lineTo(86, 86); g.closePath(); flat(g, shade(c, -0.35)); }
        g.restore();
        if (!v.hide['big-star']) { g.beginPath(); sparkle(g, 62, 36, 13); flat(g, '#fff1b8'); }
        [[30, 28, 5], [44, 46, 4], [74, 54, 4], [26, 48, 3]].forEach(function (s) { g.beginPath(); sparkle(g, s[0], s[1], s[2]); flat(g, '#fff1b8'); });
      } },
    { id: 'mat', name: 'Prayer mat', colors: ['#b8323c', '#2e7d5b', '#2f5fa8', '#7a3b8f', '#c27a2c'],
      parts: ['fringe', 'arch'], spot: [50, 68, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.fringe) for (var i = 0; i < 7; i++) { var x = 30 + i * 6.6; line(g, '#f3e2b6', 2.2, [x, 8, x, 16]); line(g, '#f3e2b6', 2.2, [x, 84, x, 92]); }
        g.beginPath(); g.rect(26, 14, 48, 72); blob(g, c, 14, 86, 2.2);
        g.beginPath(); g.rect(30.5, 18.5, 39, 63); g.lineWidth = 2.6; g.strokeStyle = '#f2c96b'; g.stroke();
        if (!v.hide.arch) { g.beginPath(); g.moveTo(36, 76); g.lineTo(36, 40); g.quadraticCurveTo(36, 28, 50, 24); g.quadraticCurveTo(64, 28, 64, 40); g.lineTo(64, 76); g.closePath(); flat(g, shade(c, 0.28)); g.lineWidth = 1.6; g.strokeStyle = '#f2c96b'; g.stroke(); }
        g.beginPath(); star8(g, 50, 56, 6, 0.55); flat(g, '#f2c96b');
      } },
    { id: 'shoe', name: 'Shoe', colors: ['#e2463f', '#3a7bd5', '#47b26b', '#f2b134', '#9b6bd6', '#ef7fb0'],
      parts: ['laces', 'toe'], spot: [34, 58, 5],
      draw: function (g, v) {
        var c = v.c;
        g.beginPath(); g.moveTo(14, 74); g.lineTo(16, 44); g.quadraticCurveTo(26, 40, 34, 44); g.lineTo(46, 40); g.quadraticCurveTo(58, 52, 74, 56); g.quadraticCurveTo(90, 60, 90, 74); g.closePath(); blob(g, c, 40, 74);
        if (!v.hide.toe) { g.beginPath(); g.moveTo(70, 74); g.quadraticCurveTo(70, 58, 78, 57.5); g.quadraticCurveTo(90, 60, 90, 74); g.closePath(); flat(g, '#fdf7ee'); }
        g.beginPath(); rrect(g, 10, 72, 82, 10, 5); blob(g, '#f4f1ea', 72, 82, 1.8); line(g, '#c9c2b5', 1.4, [14, 77, 88, 77]);
        if (!v.hide.laces) { [[44, 44, 52, 50], [48, 48, 58, 52], [52, 51, 62, 55]].forEach(function (l) { line(g, '#ffffff', 2.8, l); }); [[44, 50, 52, 44], [48, 53, 58, 48]].forEach(function (l) { line(g, '#ffffff', 2.4, l); }); }
        shine(g, 24, 52, 3, 6, 0.2, 0.45);
      } },
    { id: 'sheep', name: 'Sheep', colors: ['#f7f3ea', '#e8d9b8', '#c9c3bb', '#f4c8d8', '#c8dff2'],
      parts: ['ear', 'tail', 'legs'], spot: [40, 50, 5],
      draw: function (g, v) {
        var c = v.c, dark = '#4a3b46';
        if (!v.hide.legs) [30, 40, 56, 64].forEach(function (x) { line(g, dark, 5, [x, 66, x, 88]); });
        g.beginPath();
        [[30, 54, 12], [42, 46, 13], [56, 46, 12], [64, 56, 11], [52, 64, 12], [36, 64, 12], [46, 56, 14]].forEach(function (b) { g.moveTo(b[0] + b[2], b[1]); g.arc(b[0], b[1], b[2], 0, 6.283); });
        if (!v.hide.tail) { g.moveTo(25, 46); g.arc(19, 48, 6, 0, 6.283); }
        blob(g, c, 33, 76, 2);
        g.beginPath(); ell(g, 76, 48, 10, 13, 0.35); blob(g, dark, 36, 60, 1.6);
        if (!v.hide.ear) { g.beginPath(); ell(g, 70, 38, 7, 3.2, -0.5); blob(g, dark, 34, 42, 1.4); }
        [[42, 38], [56, 40], [34, 52]].forEach(function (s) { shine(g, s[0], s[1], 5, 3, -0.4, 0.55); });
      } },
    { id: 'butterfly', name: 'Butterfly', colors: ['#f28c38', '#4aa3e8', '#e8574a', '#a070dc', '#f2c12e', '#3fbf9a'],
      parts: ['tips', 'antennae', 'lower-wings'], spot: [30, 40, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.antennae) { g.beginPath(); g.moveTo(48, 30); g.quadraticCurveTo(44, 16, 36, 12); g.moveTo(52, 30); g.quadraticCurveTo(56, 16, 64, 12); g.lineWidth = 2; g.strokeStyle = '#3a2a3a'; g.stroke(); g.beginPath(); circ(g, 36, 12, 2.6); circ(g, 64, 12, 2.6); flat(g, '#3a2a3a'); }
        // lower wings first, then the upper wings on top, so outlines never cross a wing
        if (!v.hide['lower-wings']) { g.beginPath(); ell(g, 36, 66, 13, 11, 0.5); ell(g, 64, 66, 13, 11, -0.5); blob(g, shade(c, -0.08), 52, 80); }
        g.beginPath(); ell(g, 32, 40, 19, 15, -0.5); blob(g, c, 22, 58);
        g.beginPath(); ell(g, 68, 40, 19, 15, 0.5); blob(g, c, 22, 58);
        if (!v.hide.tips) [[32, 40, -0.5, 14, 27], [68, 40, 0.5, 86, 27]].forEach(function (w) { // dark wing tips
          g.save(); g.beginPath(); ell(g, w[0], w[1], 19, 15, w[2]); g.clip(); g.beginPath(); circ(g, w[3], w[4], 14); flat(g, shade(c, -0.5));
          g.restore(); });
        g.beginPath(); ell(g, 50, 52, 4.5, 22, 0); blob(g, '#4a3346', 30, 74, 1.4);
      } },
    { id: 'melon', name: 'Watermelon', colors: ['#ef4a5a', '#ff7f8f', '#f7d14a', '#f4874a'],
      parts: ['seeds', 'rind'], spot: [62, 50, 5],
      draw: function (g, v) {
        var c = v.c, cy = 34;
        g.beginPath(); g.moveTo(10, cy); g.arc(50, cy, 40, 0, Math.PI); g.closePath(); blob(g, v.hide.rind ? c : '#3f9e4a', cy, 76, 2.2);
        if (!v.hide.rind) { g.beginPath(); g.moveTo(16, cy); g.arc(50, cy, 34, 0, Math.PI); g.closePath(); flat(g, '#f4f7df'); }
        g.beginPath(); g.moveTo(19, cy); g.arc(50, cy, 31, 0, Math.PI); g.closePath();
        var gr = g.createLinearGradient(0, cy, 0, cy + 31); gr.addColorStop(0, shade(c, 0.15)); gr.addColorStop(1, c); g.fillStyle = gr; g.fill();
        if (!v.hide.seeds) [[30, 42], [42, 47], [55, 44], [68, 41], [36, 55], [51, 57], [62, 52]].forEach(function (s) { g.beginPath(); ell(g, s[0], s[1], 1.8, 3, 0); flat(g, '#2a1a22'); });
        line(g, 'rgba(255,255,255,.45)', 2.4, [22, cy + 1, 78, cy + 1]);
      } },
    { id: 'umbrella', name: 'Umbrella', colors: ['#e94f64', '#3fa7e0', '#f5b82e', '#5cc46b', '#9b6bd6'],
      parts: ['handle', 'tip', 'panels'], spot: [36, 36, 5],
      draw: function (g, v) {
        var c = v.c;
        if (!v.hide.handle) { g.beginPath(); g.moveTo(50, 50); g.lineTo(50, 82); g.arc(43, 82, 7, 0, Math.PI); g.lineWidth = 7; g.strokeStyle = ink('#8a5a2e'); g.lineCap = 'round'; g.stroke(); g.lineWidth = 3.4; g.strokeStyle = '#a8703a'; g.stroke(); }
        if (!v.hide.tip) { line(g, ink('#8a5a2e'), 6, [50, 16, 50, 7]); line(g, '#c48a3a', 3, [50, 16, 50, 7]); }
        g.beginPath(); g.moveTo(12, 52); g.bezierCurveTo(12, 26, 30, 14, 50, 14); g.bezierCurveTo(70, 14, 88, 26, 88, 52);
        for (var i = 4; i > 0; i--) { var x1 = 12 + i * 19, x0 = x1 - 19; g.quadraticCurveTo((x0 + x1) / 2, 44, x0, 52); }
        g.closePath(); blob(g, c, 14, 52);
        if (!v.hide.panels) { g.save(); g.clip(); g.beginPath(); g.moveTo(50, 14); g.quadraticCurveTo(36, 30, 31, 56); g.lineTo(50, 56); g.closePath(); g.moveTo(50, 14); g.quadraticCurveTo(80, 26, 88, 56); g.lineTo(69, 56); g.quadraticCurveTo(64, 30, 50, 14); flat(g, shade(c, 0.5)); g.restore(); }
        shine(g, 34, 26, 7, 3, -0.6, 0.45);
      } }
  ];
  I.LIST = LIST;
  I.byId = {}; LIST.forEach(function (it) { I.byId[it.id] = it; });

  // ---------- variants ----------
  // v = { c: main colour, hide: {part: true}, spot: bool, flip: bool, rot: radians, scale: number }
  I.base = function (item, color) { return { c: color || item.colors[0], hide: {}, spot: false, flip: false, rot: 0, scale: 1 }; };
  // All the ways an item can be made different from a base variant, with a "kind" for picking by level.
  I.oddOptions = function (item, base) {
    var out = [];
    function v(o, kind, label) { var r = { c: base.c, hide: {}, spot: false, flip: false, rot: 0, scale: 1 }; for (var k in o) r[k] = o[k]; out.push({ kind: kind, v: r, label: label }); }
    item.colors.forEach(function (c) { if (c !== base.c) v({ c: c }, 'color', 'colour ' + c); });
    item.parts.forEach(function (p) { var h = {}; h[p] = true; v({ hide: h }, 'missing', 'no ' + p); });
    v({ spot: true }, 'spot', 'extra spot');
    v({ flip: true }, 'mirror', 'mirrored');
    v({ rot: Math.PI }, 'turn', 'upside down');
    v({ rot: 0.5 }, 'tilt', 'tilted');
    [0.6, 0.72, 0.82].forEach(function (s) { v({ scale: s }, 'small', 'size ' + s); });
    return out;
  };

  // Draw an item variant centred in a box of `size` units (the item art spans ~100 units = size).
  I.draw = function (g, item, v, x, y, size) {
    g.save(); g.translate(x, y); var s = size / 100; g.scale(s, s);
    if (v.flip) g.scale(-1, 1);
    if (v.rot) g.rotate(v.rot);
    if (v.scale !== 1) g.scale(v.scale, v.scale);
    g.translate(-50, -50);
    item.draw(g, v);
    if (v.spot) { var p = item.spot, h = hexToRgb(v.c), cool = h[2] > h[0] && h[2] > 90; // blue dot on warm items, gold dot on cool ones
      g.beginPath(); circ(g, p[0], p[1], 10); g.lineWidth = 3.4; g.strokeStyle = '#2a1636'; g.stroke(); flat(g, cool ? '#ffc93d' : '#2f56d6'); }
    g.restore();
  };

  // Pre-render a variant to its own canvas (px square), item art spans 100 units = px / 1.2 (room for tilt).
  I.sprite = function (item, v, px) {
    var c = document.createElement('canvas'); c.width = c.height = Math.max(8, Math.round(px));
    I.draw(c.getContext('2d'), item, v, c.width / 2, c.height / 2, c.width / 1.2);
    return c;
  };

  // ---------- the visibility check ----------
  // Lab colour of each pixel, after compositing on a neutral plate colour; also seen through protanopia and
  // deuteranopia (Machado et al. 2009, severity 1). Score = mean over pixels of how clearly they differ
  // (ΔE 12 or less counts nothing, ΔE 52+ counts fully), the minimum over the three kinds of vision.
  var N = 72, PLATE = [150, 140, 170];
  var SIMS = [null,
    [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881]];
  function lin(u) { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }
  var LIN = []; for (var q = 0; q < 256; q++) LIN[q] = lin(q);
  function lab(r, g2, b) {
    var x = (r * 0.4124 + g2 * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g2 * 0.7152 + b * 0.0722, z = (r * 0.0193 + g2 * 0.1192 + b * 0.9505) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    var fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  var scratch = null;
  function pixels(item, v) {
    if (!scratch) { scratch = document.createElement('canvas'); scratch.width = scratch.height = N; }
    var g = scratch.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, N, N);
    I.draw(g, item, v, N / 2, N / 2, N / 1.2);
    var d = g.getImageData(0, 0, N, N).data, out = [null, null, null], edge = 0, cover = 0;
    for (var s = 0; s < 3; s++) out[s] = new Float32Array(N * N * 3);
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      var a = d[i + 3] / 255; if (a > 0.5) cover++;
      var px = p % N, py = (p / N) | 0;
      if (a > 0.1 && (px === 0 || py === 0 || px === N - 1 || py === N - 1)) edge++;
      var r = LIN[Math.round(d[i] * a + PLATE[0] * (1 - a))], gg = LIN[Math.round(d[i + 1] * a + PLATE[1] * (1 - a))], b = LIN[Math.round(d[i + 2] * a + PLATE[2] * (1 - a))];
      for (s = 0; s < 3; s++) {
        var m = SIMS[s], R = r, G = gg, B = b;
        if (m) { R = Math.max(0, m[0] * r + m[1] * gg + m[2] * b); G = Math.max(0, m[3] * r + m[4] * gg + m[5] * b); B = Math.max(0, m[6] * r + m[7] * gg + m[8] * b); }
        var L = lab(R, G, B); out[s][p * 3] = L[0]; out[s][p * 3 + 1] = L[1]; out[s][p * 3 + 2] = L[2];
      }
    }
    return { lab: out, edge: edge, cover: cover / (N * N) };
  }
  var cache = {};
  function key(item, v) { return item.id + '|' + v.c + '|' + Object.keys(v.hide).join(',') + '|' + (v.spot ? 1 : 0) + (v.flip ? 1 : 0) + '|' + v.rot + '|' + v.scale; }
  function pix(item, v) { var k = key(item, v); return cache[k] || (cache[k] = pixels(item, v)); }
  // Returns { score, clipped, cover } where score is 0..~0.5 (fraction of the box that clearly changed).
  I.score = function (item, base, odd) {
    var A = pix(item, base), B = pix(item, odd), best = Infinity;
    for (var s = 0; s < 3; s++) {
      var a = A.lab[s], b = B.lab[s], sum = 0;
      for (var i = 0; i < a.length; i += 3) {
        var dl = a[i] - b[i], da = a[i + 1] - b[i + 1], db = a[i + 2] - b[i + 2], de = Math.sqrt(dl * dl + da * da + db * db);
        if (de > 12) sum += Math.min(1, (de - 12) / 40);
      }
      best = Math.min(best, sum / (N * N / 1.44)); // relative to the 100x100 item box
    }
    return { score: best, clipped: B.edge > 0 || A.edge > 0, cover: A.cover };
  };
  I.MIN_SCORE = 0.03; // below this a difference is too hard to see: never used

  // How hard an option is to spot, 0 (jumps out) .. 1 (look closely), from its kind and its measured score.
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  I.difficulty = function (opt, score) {
    switch (opt.kind) {
      case 'color': return clamp(1 - (score - 0.04) / 0.16, 0, 1);
      case 'missing': return clamp(1 - (score - 0.03) / 0.09, 0.35, 1);
      case 'spot': return clamp(0.85 - (score - 0.03) * 6, 0.45, 0.85);
      case 'mirror': return score > 0.12 ? 0.62 : 0.8;
      case 'turn': return 0.12;
      case 'tilt': return 0.5;
      case 'small': return opt.v.scale < 0.65 ? 0.08 : opt.v.scale < 0.75 ? 0.42 : 0.78;
    }
    return 0.5;
  };
  // Every usable odd-one-out for an item drawn in `color`: measured, never clipped, never below MIN_SCORE.
  I.usable = function (item, color) {
    var base = I.base(item, color);
    return I.oddOptions(item, base).map(function (o) {
      var s = I.score(item, base, o.v);
      return { kind: o.kind, label: o.label, v: o.v, base: base, score: s.score, ok: !s.clipped && s.score >= I.MIN_SCORE, d: I.difficulty(o, s.score) };
    });
  };
})();
