/* Balloon Pop: deeds.js
   Good-deed picture cards, drawn in code. Each picture tells its story without words, so children who
   can't read yet still understand it: sharing food, helping parents, smiling, water for a cat, planting a
   tree, saying salam, reading Quran (a closed book on its stand), tidying up and visiting grandparents.
   Cards are designed on a 200 x 200 grid and cached per pixel size. Exposes window.BalloonDeeds. */
(function () {
  'use strict';
  var D = window.BalloonDeeds = {};

  // ---------- helpers ----------
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); }
  function star8(g, x, y, r, inner) {
    g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2, q = i % 2 ? r * (inner || 0.62) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function heart(g, x, y, s, col) {
    g.save(); g.translate(x, y); g.scale(s / 20, s / 20);
    g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-15, -1, -8, -15, 0, -6); g.bezierCurveTo(8, -15, 15, -1, 0, 8); g.closePath();
    g.fillStyle = col || '#ff5d73'; g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; ell(g, -5, -5, 2.6, 1.8, -0.6); g.fill();
    g.restore();
  }
  function sparkle(g, x, y, r, col) {
    g.fillStyle = col || '#fff6c8'; g.beginPath();
    g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  }
  D.heart = heart; D.sparkle = sparkle;

  // ---------- people ----------
  // person(g, x, feetY, s, o): a friendly flat-vector person facing the viewer, about 105 units tall at s = 1.
  // o.head: 'hair' | 'kufi' | 'hijab'; o.dress: long tunic/dress; o.armL / o.armR: angle in radians from
  // hanging down (raise toward the side); o.flip mirrors. Returns the hand positions in caller units.
  function person(g, x, y, s, o) {
    var f = o.flip ? -1 : 1;
    var skin = o.skin || '#f0c19a', top = o.top || '#4aa3df', bottom = o.bottom || '#3b4a7a';
    var SH = -60, HY = -84, HR = 19, hands = {};
    g.save(); g.translate(x, y); g.scale(s * f, s);
    // ground shadow
    g.fillStyle = 'rgba(40,20,10,.14)'; ell(g, 0, 1, 25, 4.5); g.fill();
    // legs and body
    if (o.dress) {
      g.fillStyle = '#5a3a2a'; ell(g, -8, -3, 8, 4.5); g.fill(); ell(g, 8, -3, 8, 4.5); g.fill();
      var dg = g.createLinearGradient(-20, 0, 20, 0); dg.addColorStop(0, shade(top, -0.12)); dg.addColorStop(0.5, top); dg.addColorStop(1, shade(top, -0.2));
      g.fillStyle = dg; g.beginPath(); g.moveTo(-15, SH); g.quadraticCurveTo(-17, -30, -23, -6); g.quadraticCurveTo(0, -1, 23, -6);
      g.quadraticCurveTo(17, -30, 15, SH); g.closePath(); g.fill();
      g.strokeStyle = shade(top, 0.25); g.lineWidth = 2; g.beginPath(); g.moveTo(-22, -9); g.quadraticCurveTo(0, -4, 22, -9); g.stroke();
    } else {
      g.fillStyle = bottom; rr(g, -13, -34, 11.5, 32, 5); g.fill(); rr(g, 1.5, -34, 11.5, 32, 5); g.fill();
      g.fillStyle = '#5a3a2a'; ell(g, -8, -3, 8.5, 4.5); g.fill(); ell(g, 8, -3, 8.5, 4.5); g.fill();
      var bg2 = g.createLinearGradient(-20, 0, 20, 0); bg2.addColorStop(0, shade(top, -0.1)); bg2.addColorStop(0.5, top); bg2.addColorStop(1, shade(top, -0.22));
      g.fillStyle = bg2; g.beginPath(); g.moveTo(-15, SH); g.quadraticCurveTo(-18, -44, -19, -27); g.quadraticCurveTo(0, -23, 19, -27);
      g.quadraticCurveTo(18, -44, 15, SH); g.closePath(); g.fill();
    }
    // arms
    function arm(side, a) {
      var sx = side * 13, sy = SH + 5, L = 27, hx = sx + side * Math.sin(a) * L, hy = sy + Math.cos(a) * L;
      var ex = sx + (hx - sx) * 0.62, ey = sy + (hy - sy) * 0.62;
      g.lineCap = 'round';
      g.strokeStyle = shade(top, -0.06); g.lineWidth = 10; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = skin; g.lineWidth = 7.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(hx, hy); g.stroke();
      g.fillStyle = skin; circ(g, hx, hy, 5.4); g.fill();
      return { x: x + f * s * hx, y: y + s * hy };
    }
    hands.l = arm(-1, o.armL || 0.12);
    hands.r = arm(1, o.armR || 0.12);
    // neck + head
    g.fillStyle = shade(skin, -0.12); rr(g, -5, HY + 14, 10, 10, 4); g.fill();
    if (o.head === 'hijab') {
      var hc = o.headCol || '#ff8fb1';
      g.fillStyle = shade(hc, -0.08); g.beginPath(); g.moveTo(-HR - 4, HY + 2); g.quadraticCurveTo(-24, SH + 8, -17, SH + 12);
      g.lineTo(17, SH + 12); g.quadraticCurveTo(24, SH + 8, HR + 4, HY + 2); g.closePath(); g.fill();
      var hg = g.createRadialGradient(-6, HY - 8, 2, 0, HY, HR + 6); hg.addColorStop(0, shade(hc, 0.25)); hg.addColorStop(1, hc);
      g.fillStyle = hg; circ(g, 0, HY + 1, HR + 5); g.fill();
      g.fillStyle = skin; ell(g, 0, HY + 3, HR - 3.5, HR - 2); g.fill();
    } else {
      g.fillStyle = skin; circ(g, -HR + 0.5, HY + 3, 4.2); g.fill(); circ(g, HR - 0.5, HY + 3, 4.2); g.fill();
      g.fillStyle = skin; circ(g, 0, HY, HR); g.fill();
      if (o.head === 'kufi') {
        var kc = o.headCol || '#ffffff';
        g.fillStyle = kc; g.beginPath(); g.moveTo(-HR - 0.5, HY - 5); g.bezierCurveTo(-HR, HY - 26, HR, HY - 26, HR + 0.5, HY - 5); g.closePath(); g.fill();
        g.fillStyle = shade(kc, -0.12); g.fillRect(-HR - 0.5, HY - 7, HR * 2 + 1, 3.5);
        g.fillStyle = shade(kc, -0.2); for (var k = -2; k <= 2; k++) { circ(g, k * 6, HY - 13 - (2 - Math.abs(k)) * 1.2, 1.1); g.fill(); }
      } else {
        g.fillStyle = o.hairCol || '#3a2618';
        g.beginPath(); g.arc(0, HY, HR + 1.5, Math.PI * 0.92, Math.PI * 2.08);
        g.quadraticCurveTo(HR * 0.4, HY - HR * 0.35, 0, HY - HR * 0.42); g.quadraticCurveTo(-HR * 0.7, HY - HR * 0.3, -HR - 1, HY + 1); g.closePath(); g.fill();
      }
    }
    // No facial features (owner rule): just a soft light on the head so it still reads as round.
    var lit = g.createRadialGradient(-6, HY - 8, 1, -6, HY - 8, 14); lit.addColorStop(0, 'rgba(255,255,255,.22)'); lit.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lit; circ(g, -6, HY - 6, 14); g.fill();
    g.restore();
    return hands;
  }

  // ---------- scene backdrops ----------
  function outdoor(g, top, bot, ground, groundY) {
    var sky = g.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, top); sky.addColorStop(1, bot);
    g.fillStyle = sky; g.fillRect(0, 0, 200, 200);
    g.fillStyle = 'rgba(255,255,255,.75)';
    [[40, 34, 15], [58, 30, 12], [150, 44, 12], [165, 40, 9]].forEach(function (c) { ell(g, c[0], c[1], c[2] * 1.4, c[2] * 0.75); g.fill(); });
    var gy = groundY || 150, gr = g.createLinearGradient(0, gy, 0, 200); gr.addColorStop(0, shade(ground, 0.12)); gr.addColorStop(1, shade(ground, -0.1));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, gy + 8); g.quadraticCurveTo(100, gy - 10, 200, gy + 6); g.lineTo(200, 200); g.lineTo(0, 200); g.fill();
  }
  function indoor(g, wall, floor, floorY) {
    var fy = floorY || 152;
    var wg = g.createLinearGradient(0, 0, 0, fy); wg.addColorStop(0, shade(wall, 0.12)); wg.addColorStop(1, shade(wall, -0.05));
    g.fillStyle = wg; g.fillRect(0, 0, 200, fy);
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (var y = 22; y < fy - 10; y += 34) for (var x = (y / 34 % 2) * 17 + 10; x < 200; x += 34) { star8(g, x, y, 5); g.fill(); }
    var fg = g.createLinearGradient(0, fy, 0, 200); fg.addColorStop(0, shade(floor, 0.08)); fg.addColorStop(1, shade(floor, -0.12));
    g.fillStyle = fg; g.fillRect(0, fy, 200, 200 - fy);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, fy, 200, 3);
  }
  function sun(g, x, y, r) {
    var h = g.createRadialGradient(x, y, 0, x, y, r * 2.4); h.addColorStop(0, 'rgba(255,240,170,.9)'); h.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = h; circ(g, x, y, r * 2.4); g.fill();
    g.fillStyle = '#ffe27a'; circ(g, x, y, r); g.fill();
  }

  // ---------- the nine deeds ----------
  var SCENES = {
    share: function (g) {
      outdoor(g, '#a9dcff', '#e8f6ff', '#8fd36f', 150);
      // picnic cloth
      g.fillStyle = '#ff6b6b'; ell(g, 100, 182, 70, 12); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; for (var i = -3; i <= 3; i++) { g.fillRect(100 + i * 18 - 4, 172, 8, 20); }
      person(g, 58, 180, 1, { head: 'kufi', top: '#2fb56d', bottom: '#33507a', skin: '#e3ad84', armR: 1.38, armL: 0.15, hairCol: '#2a1a10' });
      person(g, 142, 180, 1, { flip: true, head: 'hijab', headCol: '#ff8fb1', top: '#ffb547', dress: true, skin: '#f2c8a4', armR: 1.22, armL: 0.12 });
      // plate of dates and bread between their hands
      g.fillStyle = 'rgba(0,0,0,.12)'; ell(g, 101, 128, 22, 6); g.fill();
      g.fillStyle = '#ffffff'; ell(g, 101, 124, 22, 7); g.fill(); g.fillStyle = '#e8eef5'; ell(g, 101, 124, 15, 4.5); g.fill();
      g.fillStyle = '#e9a64f'; ell(g, 94, 118, 10, 6); g.fill(); g.fillStyle = '#f7c87a'; ell(g, 92, 116, 6, 3); g.fill();
      [[104, 119], [111, 120], [107, 115], [114, 116]].forEach(function (p) { g.fillStyle = '#7a3a18'; ell(g, p[0], p[1], 4.4, 2.8, 0.4); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, p[0] - 1, p[1] - 1, 1.6, 0.8, 0.4); g.fill(); });
      heart(g, 101, 72, 22); sparkle(g, 80, 88, 5); sparkle(g, 124, 84, 6);
    },
    help: function (g) {
      outdoor(g, '#ffe3b8', '#fff6e8', '#cfe6a6', 156);
      // little house door behind
      g.fillStyle = '#f3d9b5'; g.fillRect(150, 70, 50, 90); g.fillStyle = '#8a5a3a'; g.beginPath(); g.moveTo(160, 160); g.lineTo(160, 104); g.arc(176, 104, 16, Math.PI, 0); g.lineTo(192, 160); g.fill();
      var mum = person(g, 132, 182, 1.4, { head: 'hijab', headCol: '#2bb5a3', top: '#4f6bd8', dress: true, skin: '#d9a27a', armL: 0.22, armR: 0.1 });
      // mum's bag
      bag(g, mum.l.x - 2, mum.l.y + 4, 0.9);
      var kid = person(g, 60, 182, 1, { head: 'hair', hairCol: '#2a1a10', top: '#ff8a3d', bottom: '#3b4a7a', skin: '#d9a27a', armL: 0.62, armR: 0.62 });
      bag(g, 60, kid.r.y - 2, 1.05);
      heart(g, 96, 52, 22); sparkle(g, 30, 60, 5); sparkle(g, 118, 34, 5);
    },
    birds: function (g) {
      outdoor(g, '#bfe6ff', '#effaff', '#9fd97a', 150);
      sun(g, 30, 30, 12);
      // a little tree branch for one bird
      g.strokeStyle = '#8a5a33'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(200, 60); g.quadraticCurveTo(160, 64, 128, 58); g.stroke();
      g.fillStyle = '#5cbf5a'; [[176, 52], [150, 52], [190, 66]].forEach(function (p) { ell(g, p[0], p[1], 8, 4, -0.4); g.fill(); });
      bird(g, 146, 50, 0.9, '#7ac3ff', false);
      var kid = person(g, 52, 182, 1, { head: 'kufi', headCol: '#ffffff', top: '#ff9f43', bottom: '#33507a', skin: '#e3ad84', armR: 1.5, armL: 0.2 });
      // seeds falling from the open hand
      g.fillStyle = '#e0b060';
      [[kid.r.x + 8, kid.r.y + 6], [kid.r.x + 14, kid.r.y + 16], [kid.r.x + 6, kid.r.y + 22], [kid.r.x + 18, kid.r.y + 30], [kid.r.x + 10, kid.r.y + 38]].forEach(function (p) { ell(g, p[0], p[1], 2, 1.4, 0.5); g.fill(); });
      [[112, 178], [124, 182], [136, 177], [150, 181], [162, 178], [118, 186], [144, 186]].forEach(function (p) { ell(g, p[0], p[1], 2.2, 1.5, 0.3); g.fill(); });
      bird(g, 128, 172, 1.1, '#ff8a5c', true);
      bird(g, 162, 170, 1, '#ffd23f', true);
      heart(g, 104, 104, 18); sparkle(g, 182, 120, 5); sparkle(g, 92, 66, 5);
    },
    cat: function (g) {
      outdoor(g, '#cdeeff', '#f3fbff', '#bfe39a', 152);
      var kid = person(g, 58, 182, 1, { head: 'hijab', headCol: '#ff9f43', top: '#5c7cfa', dress: true, skin: '#f0c19a', armR: 1.12, armL: 0.5 });
      // jug, tipped toward the bowl
      g.save(); g.translate(kid.r.x + 4, kid.r.y - 4); g.rotate(0.75);
      g.fillStyle = '#3d8bd8'; g.beginPath(); g.moveTo(-9, -12); g.lineTo(9, -12); g.quadraticCurveTo(13, 6, 8, 12); g.lineTo(-8, 12); g.quadraticCurveTo(-13, 6, -9, -12); g.fill();
      g.fillStyle = '#6cb2f0'; g.fillRect(-9, -13, 18, 4); g.beginPath(); g.moveTo(9, -12); g.lineTo(16, -16); g.lineTo(9, -7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; rr(g, -6, -6, 3, 12, 1.5); g.fill();
      g.restore();
      // water stream into the bowl
      g.strokeStyle = 'rgba(90,180,255,.85)'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(kid.r.x + 16, kid.r.y + 6); g.quadraticCurveTo(kid.r.x + 26, kid.r.y + 20, 124, 166); g.stroke();
      g.fillStyle = '#7cc4ff'; [[118, 150], [130, 158]].forEach(function (p) { ell(g, p[0], p[1], 2, 3); g.fill(); });
      // bowl
      g.fillStyle = '#d94a68'; g.beginPath(); g.moveTo(108, 168); g.quadraticCurveTo(124, 186, 140, 168); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; ell(g, 124, 168, 16, 3.5); g.fill(); g.fillStyle = '#8fd0ff'; ell(g, 124, 168, 13, 2.6); g.fill();
      cat(g, 152, 176);
      heart(g, 162, 112, 20); sparkle(g, 140, 128, 5); sparkle(g, 186, 132, 4);
    },
    tree: function (g) {
      outdoor(g, '#bfe8ff', '#effaff', '#8fd36f', 150);
      sun(g, 170, 34, 14);
      var kid = person(g, 56, 182, 1, { head: 'hair', hairCol: '#4a2a14', top: '#ffcc33', bottom: '#2e6f9e', skin: '#c98c5f', armR: 1.3, armL: 0.2 });
      // watering can
      var hx = kid.r.x, hy = kid.r.y;
      g.save(); g.translate(hx + 10, hy + 2); g.rotate(0.35);
      g.fillStyle = '#34b878'; rr(g, -12, -9, 24, 20, 6); g.fill();
      g.strokeStyle = '#34b878'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.arc(-2, -9, 8, Math.PI, 0); g.stroke();
      g.beginPath(); g.moveTo(10, 4); g.lineTo(26, -6); g.stroke(); g.fillStyle = '#2a9b62'; ell(g, 27, -6, 4, 5, 0.6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; rr(g, -9, -6, 5, 13, 2.5); g.fill();
      g.restore();
      g.fillStyle = '#6cc0ff'; [[126, 132], [131, 142], [124, 150], [134, 154], [128, 162]].forEach(function (p) { ell(g, p[0], p[1], 1.8, 3); g.fill(); });
      // soil and sapling
      g.fillStyle = '#8b5a3c'; ell(g, 142, 178, 26, 8); g.fill(); g.fillStyle = '#a06c48'; ell(g, 140, 176, 16, 4); g.fill();
      g.strokeStyle = '#4f9a3a'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(142, 176); g.quadraticCurveTo(140, 158, 143, 134); g.stroke();
      [[143, 132, -0.3, 11], [133, 146, -0.9, 10], [153, 144, 0.8, 10], [134, 160, -1.1, 8], [151, 158, 1.0, 8]].forEach(function (l) {
        g.fillStyle = '#4cc35a'; ell(g, l[0], l[1], l[3] * 0.55, l[3], l[2]); g.fill();
        g.fillStyle = 'rgba(255,255,255,.3)'; ell(g, l[0] - 1, l[1] - 2, l[3] * 0.18, l[3] * 0.55, l[2]); g.fill();
      });
      sparkle(g, 166, 120, 6); sparkle(g, 118, 112, 5);
    },
    salam: function (g) {
      outdoor(g, '#ffd9ec', '#fff5fa', '#bfe3a2', 152);
      var a = person(g, 56, 182, 1, { head: 'kufi', headCol: '#ffffff', hairCol: '#2a1a10', top: '#4a90e2', bottom: '#2f3b66', skin: '#e3ad84', armR: 2.55, armL: 0.15 });
      var b = person(g, 144, 182, 1, { flip: true, head: 'hijab', headCol: '#a66cff', top: '#ffb347', dress: true, skin: '#c98c5f', armR: 2.55, armL: 0.15 });
      // waving lines
      g.strokeStyle = 'rgba(120,80,160,.6)'; g.lineWidth = 2.4; g.lineCap = 'round';
      [a.r, b.r].forEach(function (h) {
        g.beginPath(); g.arc(h.x, h.y - 2, 11, -2.5, -0.65); g.stroke();
        g.beginPath(); g.arc(h.x, h.y - 2, 16, -2.4, -0.75); g.stroke(); });
      // speech bubble
      g.fillStyle = '#ffffff'; rr(g, 58, 18, 84, 34, 16); g.fill();
      g.beginPath(); g.moveTo(92, 50); g.lineTo(100, 64); g.lineTo(106, 50); g.fill();
      g.fillStyle = '#2f8f5b'; g.font = '900 21px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Salam!', 100, 36);
      heart(g, 100, 92, 16); sparkle(g, 26, 70, 5); sparkle(g, 176, 74, 5);
    },
    quran: function (g) {
      indoor(g, '#f6e6c8', '#b8323a', 160);
      // arched window of light
      g.fillStyle = '#fff6dc'; g.beginPath(); g.moveTo(70, 120); g.lineTo(70, 60); g.quadraticCurveTo(70, 34, 100, 22); g.quadraticCurveTo(130, 34, 130, 60); g.lineTo(130, 120); g.fill();
      g.strokeStyle = '#d9b06a'; g.lineWidth = 3; g.stroke();
      var glow = g.createRadialGradient(100, 112, 4, 100, 112, 80); glow.addColorStop(0, 'rgba(255,236,160,.95)'); glow.addColorStop(1, 'rgba(255,236,160,0)');
      g.fillStyle = glow; circ(g, 100, 112, 80); g.fill();
      // rug border
      g.fillStyle = '#f2c14e'; g.fillRect(0, 164, 200, 3); g.fillRect(0, 192, 200, 3);
      for (var x = 6; x < 200; x += 16) { g.beginPath(); g.moveTo(x, 179); g.lineTo(x + 5, 174); g.lineTo(x + 10, 179); g.lineTo(x + 5, 184); g.fill(); }
      // girl sitting behind the stand
      g.save(); g.beginPath(); g.rect(0, 0, 200, 146); g.clip();
      person(g, 100, 162, 1.05, { head: 'hijab', headCol: '#ffffff', top: '#3aa58a', skin: '#e9b892', armL: 0.62, armR: 0.62 });
      g.restore();
      // rehal: X-shaped wooden stand
      var wood = '#a0642d', woodL = '#c98a4b';
      g.lineCap = 'round';
      g.strokeStyle = shade(wood, -0.2); g.lineWidth = 9; g.beginPath(); g.moveTo(72, 196); g.lineTo(126, 148); g.stroke();
      g.strokeStyle = wood; g.beginPath(); g.moveTo(128, 196); g.lineTo(74, 148); g.stroke();
      g.strokeStyle = woodL; g.lineWidth = 2; g.beginPath(); g.moveTo(126, 193); g.lineTo(76, 150); g.stroke();
      g.fillStyle = shade(wood, -0.1); g.beginPath(); g.moveTo(58, 152); g.lineTo(142, 152); g.lineTo(134, 140); g.lineTo(66, 140); g.closePath(); g.fill();
      // closed book with a geometric cover
      g.fillStyle = '#f5ecd4'; g.beginPath(); g.moveTo(68, 142); g.lineTo(132, 142); g.lineTo(129, 146); g.lineTo(71, 146); g.closePath(); g.fill();
      var bc = g.createLinearGradient(0, 100, 0, 142); bc.addColorStop(0, '#2c9a68'); bc.addColorStop(1, '#17643f');
      g.fillStyle = bc; g.beginPath(); g.moveTo(66, 142); g.lineTo(134, 142); g.lineTo(126, 100); g.lineTo(74, 100); g.closePath(); g.fill();
      g.strokeStyle = '#f2c14e'; g.lineWidth = 2; g.beginPath(); g.moveTo(71, 138); g.lineTo(129, 138); g.lineTo(123, 104); g.lineTo(77, 104); g.closePath(); g.stroke();
      g.fillStyle = '#f2c14e'; star8(g, 100, 121, 12); g.fill(); g.fillStyle = '#1d7a50'; star8(g, 100, 121, 6); g.fill();
      sparkle(g, 60, 86, 6); sparkle(g, 142, 80, 7); sparkle(g, 150, 116, 4); sparkle(g, 50, 120, 4);
    },
    tidy: function (g) {
      indoor(g, '#cfe9ff', '#e2b282', 150);
      // window
      g.fillStyle = '#ffffff'; rr(g, 22, 26, 46, 52, 6); g.fill(); g.fillStyle = '#9fdcff'; rr(g, 26, 30, 38, 44, 4); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(43, 30, 4, 44); g.fillRect(26, 50, 38, 4);
      // toy box
      g.save(); g.translate(-12, 0);
      g.fillStyle = '#b06b35'; g.beginPath(); g.moveTo(118, 132); g.lineTo(186, 132); g.lineTo(196, 98); g.lineTo(128, 98); g.closePath(); g.fill(); // open lid
      g.fillStyle = '#7a4520'; rr(g, 116, 130, 72, 8, 3); g.fill();
      // toys peeking out
      g.fillStyle = '#b97a45'; circ(g, 136, 128, 11); g.fill(); circ(g, 127, 119, 4.5); g.fill(); circ(g, 145, 119, 4.5); g.fill();
      g.fillStyle = '#a06a3a'; circ(g, 127, 119, 2.2); g.fill(); circ(g, 145, 119, 2.2); g.fill(); // teddy from behind
      g.fillStyle = '#ef476f'; circ(g, 162, 128, 10); g.fill(); g.fillStyle = '#ffd166'; g.fillRect(152, 126, 20, 4);
      var box = g.createLinearGradient(0, 136, 0, 182); box.addColorStop(0, '#d38b4c'); box.addColorStop(1, '#a8652e');
      g.fillStyle = box; rr(g, 114, 134, 76, 48, 6); g.fill();
      g.fillStyle = '#ffd166'; star8(g, 152, 158, 10); g.fill();
      g.restore();
      var kid = person(g, 60, 182, 1, { head: 'hair', hairCol: '#4a2d1a', top: '#ef476f', bottom: '#33507a', skin: '#f0c19a', armR: 1.45, armL: 0.25 });
      // block in hand
      g.save(); g.translate(kid.r.x + 8, kid.r.y - 6); g.rotate(-0.2);
      g.fillStyle = '#3fa9f5'; rr(g, -9, -9, 18, 18, 3); g.fill(); g.fillStyle = '#ffffff'; star8(g, 0, 0, 5); g.fill(); g.restore();
      // motion arc toward the box
      g.strokeStyle = 'rgba(80,80,140,.35)'; g.lineWidth = 2.4; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(kid.r.x + 16, kid.r.y - 16); g.quadraticCurveTo(112, 80, 126, 106); g.stroke(); g.setLineDash([]);
      // a block still on the floor
      g.fillStyle = '#4cd07d'; rr(g, 84, 168, 14, 14, 3); g.fill();
      sparkle(g, 182, 112, 7); sparkle(g, 112, 112, 5);
    },
    grand: function (g) {
      indoor(g, '#ffe6d2', '#d4ab80', 152);
      g.fillStyle = '#c48a4a'; rr(g, 120, 24, 40, 30, 3); g.fill(); g.fillStyle = '#bfe8ff'; g.fillRect(124, 28, 32, 22); g.fillStyle = '#7ccf6a'; g.beginPath(); g.moveTo(124, 50); g.lineTo(136, 36); g.lineTo(146, 46); g.lineTo(156, 38); g.lineTo(156, 50); g.fill();
      // armchair with grandma sitting in it
      g.fillStyle = '#b5523b'; rr(g, 6, 82, 76, 70, 16); g.fill();                 // chair back
      g.save(); g.beginPath(); g.rect(0, 0, 200, 140); g.clip();
      person(g, 44, 176, 1.12, { head: 'hijab', headCol: '#b39ddb', top: '#7e57c2', dress: true, skin: '#e3ad84', armR: 0.9, armL: 0.25 });
      g.restore();
      g.fillStyle = '#7e57c2'; rr(g, 22, 128, 50, 20, 8); g.fill();             // lap
      g.fillStyle = '#c4614a'; rr(g, 0, 118, 18, 52, 8); g.fill(); rr(g, 70, 118, 18, 52, 8); g.fill(); // arms of the chair
      g.fillStyle = '#9c4433'; rr(g, 8, 146, 74, 26, 6); g.fill();               // seat front
      g.fillStyle = '#6b3a22'; g.fillRect(12, 172, 6, 10); g.fillRect(72, 172, 6, 10);
      g.fillStyle = '#5a3a2a'; ell(g, 38, 184, 8, 4); g.fill(); ell(g, 56, 184, 8, 4); g.fill();
      // grandpa standing with his stick
      var gp = person(g, 166, 184, 1.08, { flip: true, head: 'kufi', headCol: '#ffffff', top: '#e9e2d2', dress: true, skin: '#d9a27a', armR: 0.35, armL: 0.25 });
      g.strokeStyle = '#7a4a22'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(gp.r.x, gp.r.y); g.lineTo(gp.r.x - 4, 184); g.stroke();
      g.beginPath(); g.arc(gp.r.x + 4, gp.r.y, 4, Math.PI + 0.2, -0.4); g.stroke();
      // child bringing a tray with tea and dates to grandma
      var kid = person(g, 118, 184, 0.92, { flip: true, head: 'hijab', headCol: '#ff6b6b', top: '#ffd166', dress: true, skin: '#f0c19a', armL: 1.05, armR: 1.05 });
      var tx = (kid.l.x + kid.r.x) / 2, ty = Math.min(kid.l.y, kid.r.y) - 2;
      g.fillStyle = '#c98a4b'; rr(g, tx - 24, ty - 2, 48, 6, 3); g.fill();
      g.fillStyle = '#ffffff'; rr(g, tx - 16, ty - 14, 12, 12, 3); g.fill(); g.fillStyle = '#c0703a'; g.fillRect(tx - 15, ty - 13, 10, 3);
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(tx - 3, ty - 8, 3, -1.2, 1.2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(tx - 12, ty - 18); g.quadraticCurveTo(tx - 8, ty - 23, tx - 11, ty - 28); g.stroke();
      g.fillStyle = '#ffffff'; ell(g, tx + 10, ty - 3, 10, 3); g.fill();
      g.fillStyle = '#7a3a18'; [[tx + 6, ty - 6], [tx + 12, ty - 6], [tx + 9, ty - 9]].forEach(function (p) { ell(g, p[0], p[1], 3.4, 2.2, 0.3); g.fill(); });
      heart(g, 84, 66, 20); heart(g, 104, 46, 12, '#ff8fab'); sparkle(g, 186, 70, 5);
    }
  };

  function bird(g, x, y, s, col, pecking) { // a little bird seen from the side, no eye
    g.save(); g.translate(x, y); g.scale(s, s);
    if (pecking) g.rotate(0.45);
    g.fillStyle = 'rgba(40,20,10,.12)'; if (pecking) { ell(g, 0, 10, 10, 2.5); g.fill(); }
    g.fillStyle = A_shade(col, -0.2); g.beginPath(); g.moveTo(9, -2); g.lineTo(18, -6); g.lineTo(16, 2); g.closePath(); g.fill(); // tail
    g.fillStyle = col; ell(g, 0, 0, 11, 8); g.fill();
    circ(g, -9, -6, 6); g.fill();
    g.fillStyle = A_shade(col, -0.15); ell(g, 3, -1, 6, 4, -0.3); g.fill();          // wing
    g.fillStyle = '#ff9f1c'; g.beginPath(); g.moveTo(-14, -7); g.lineTo(-20, -4.5); g.lineTo(-14, -3.5); g.closePath(); g.fill(); // beak
    g.strokeStyle = '#a0522d'; g.lineWidth = 1.4; if (!pecking) { g.beginPath(); g.moveTo(-2, 7); g.lineTo(-2, 11); g.moveTo(3, 7); g.lineTo(3, 11); g.stroke(); }
    g.restore();
  }
  function A_shade(c, k) { return shade(c, k); }

  function bag(g, x, y, s) { // paper shopping bag with food peeking out
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#4cc35a'; ell(g, -6, -14, 4, 9, -0.3); g.fill(); ell(g, -1, -16, 3.5, 9, 0.1); g.fill();
    g.fillStyle = '#e9b25a'; rr(g, 3, -22, 6, 18, 3); g.fill();
    g.fillStyle = '#ff5d5d'; circ(g, 8, -6, 5); g.fill();
    var bg3 = g.createLinearGradient(-12, 0, 12, 0); bg3.addColorStop(0, '#c58a4c'); bg3.addColorStop(1, '#e2ad6e');
    g.fillStyle = bg3; g.beginPath(); g.moveTo(-12, -6); g.lineTo(12, -6); g.lineTo(13, 18); g.lineTo(-13, 18); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(-12, -6, 24, 3);
    g.restore();
  }
  function cat(g, x, y) { // an orange cat, head down at the bowl
    var o = '#f5a742', d = '#d9822b';
    g.fillStyle = 'rgba(40,20,10,.14)'; ell(g, x, y + 1, 24, 4); g.fill();
    g.strokeStyle = o; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 18, y - 8); g.quadraticCurveTo(x + 36, y - 14, x + 30, y - 32); g.stroke();
    g.fillStyle = o; ell(g, x + 4, y - 12, 20, 13); g.fill();
    g.strokeStyle = d; g.lineWidth = 2.6; [[x + 2, y - 24], [x + 10, y - 24], [x + 17, y - 21]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + 2, p[1] + 5, p[0], p[1] + 9); g.stroke(); });
    g.fillStyle = o; rr(g, x - 13, y - 10, 7, 11, 3); g.fill(); rr(g, x + 12, y - 10, 7, 11, 3); g.fill();
    // head lowered toward the bowl
    g.fillStyle = o; circ(g, x - 22, y - 14, 11); g.fill();
    g.beginPath(); g.moveTo(x - 31, y - 20); g.lineTo(x - 30, y - 32); g.lineTo(x - 23, y - 24); g.fill();
    g.beginPath(); g.moveTo(x - 20, y - 24); g.lineTo(x - 13, y - 32); g.lineTo(x - 13, y - 19); g.fill();
    g.fillStyle = '#ffb3a7'; g.beginPath(); g.moveTo(x - 29, y - 22); g.lineTo(x - 28.5, y - 28); g.lineTo(x - 25, y - 24); g.fill();
    // no face: the head is a plain silhouette dipped into the bowl
  }

  D.list = [
    { id: 'share', caption: 'Sharing food!' },
    { id: 'help', caption: 'Helping Mum!' },
    { id: 'birds', caption: 'Feeding the birds!' },
    { id: 'cat', caption: 'Water for the cat!' },
    { id: 'tree', caption: 'Planting a tree!' },
    { id: 'salam', caption: 'Saying salam!' },
    { id: 'quran', caption: 'Reading Quran!' },
    { id: 'tidy', caption: 'Tidying up!' },
    { id: 'grand', caption: 'Visiting Grandma and Grandpa!' }
  ];

  // Framed card: gold frame with eight-point stars in the corners, the picture inside.
  function paintCard(g, i) {
    var fr = g.createLinearGradient(0, 0, 200, 200); fr.addColorStop(0, '#ffe29a'); fr.addColorStop(0.5, '#f2b33d'); fr.addColorStop(1, '#d98a1f');
    g.fillStyle = fr; rr(g, 0, 0, 200, 200, 30); g.fill();
    g.fillStyle = '#fff8e6'; rr(g, 8, 8, 184, 184, 24); g.fill();
    g.save(); rr(g, 13, 13, 174, 174, 20); g.clip();
    SCENES[D.list[i].id](g);
    // soft vignette and gloss
    var vg = g.createRadialGradient(100, 100, 70, 100, 100, 140); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,30,0,.18)');
    g.fillStyle = vg; g.fillRect(0, 0, 200, 200);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; rr(g, 3, 3, 194, 194, 28); g.stroke();
    [[16, 16], [184, 16], [16, 184], [184, 184]].forEach(function (p) { g.fillStyle = '#fff3c4'; star8(g, p[0], p[1], 11); g.fill(); g.fillStyle = '#d98a1f'; star8(g, p[0], p[1], 4.5); g.fill(); });
  }

  var cache = {};
  // D.card(i, px) -> square canvas of the framed card, px device pixels wide (bucketed so we reuse sprites).
  D.card = function (i, px) {
    px = Math.max(24, Math.ceil(px / 16) * 16);
    var key = i + '|' + px;
    if (!cache[key]) {
      var c = document.createElement('canvas'); c.width = c.height = px;
      var g = c.getContext('2d'); g.scale(px / 200, px / 200); paintCard(g, i);
      cache[key] = c;
    }
    return cache[key];
  };
  D.clearCache = function () { cache = {}; };

  // Small "good deed" goal icon: a gold card with a heart (data URL for the HUD).
  D.iconURL = function (px) {
    var c = document.createElement('canvas'); c.width = c.height = px;
    var g = c.getContext('2d'); g.scale(px / 200, px / 200);
    var fr = g.createLinearGradient(0, 0, 200, 200); fr.addColorStop(0, '#ffe29a'); fr.addColorStop(1, '#e59a2a');
    g.fillStyle = fr; rr(g, 10, 10, 180, 180, 36); g.fill();
    g.fillStyle = '#fff8e6'; rr(g, 30, 30, 140, 140, 24); g.fill();
    heart(g, 100, 104, 120);
    sparkle(g, 150, 54, 18, '#f2b33d');
    return c.toDataURL();
  };
  D.person = person;
})();
