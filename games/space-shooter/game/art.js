/* Star Rangers: the paint box (window.SrArt).
   The look is the old game's, kept: four painted space worlds, the ranger ship, friendly toy robots, drones, asteroids,
   space junk, power-up orbs, collectible stars and four friendly boss machines (machines, not characters: no faces).
   Every picture is painted ONCE into the engine's canvas textures (Kit.play.tex) and drawn by Phaser; nothing is painted
   per frame, and what used to be painted live (engine flames, sensor lights, glowing cores, ring lights, rotors) is a
   small glow or flame picture that the scene tints, scales and fades with tweens.
   - atlas 'sr'  : every small sprite of a wave in ONE texture (ship, robots, drone, junk, bolts, pick-ups, flame, glow ...),
                   painted at S = 1.5 texture pixels per game unit and shown at scale 1 / S so it stays sharp up to a tablet.
   - atlas 'ui'  : the interface (plates, icons, hearts, stars, nine-slice cards), painted once at S too.
   - per world   : the sky ('bg-*'), drifting scenery ('sc-*'), the asteroids ('rock-*'); the boss machines ('boss*') when a
                   boss wave starts. A world's pictures are painted when its first wave starts and dropped when the next
                   world starts.
   These pictures are code, as they were before: moving them to the art pipeline (rendered images, AVIF) is the owner's
   call (docs/phaser-standard.md section 3). */
(function () {
  'use strict';
  var A = window.SrArt = {};
  var TAU = Math.PI * 2, S = 1.5, OL = '#1b1838';
  A.S = S; A.U = 1 / S;
  // Pictures that are the same on every screen go through Kit.play.tex at a FIXED size (tools/bake-art.js bakes them into
  // art/baked/*.avif and Boot loads those instead of painting). Pictures whose layout depends on the device (the sky follows
  // the screen's shape, the number font follows the system font) or that load later are painted into a plain canvas
  // texture here and are never baked.
  var tex = Kit.play.tex;
  function live(scene, key, w, h, paint) {
    if (scene.textures.exists(key)) return key;
    var cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h);
    paint(cv.getContext('2d')); scene.textures.addImage(key, cv);      // (addImage, not addCanvas: a CanvasTexture keeps a second copy of every pixel in memory)
    return key;
  }
  var BAKE = /[?&]bake\b/.test(location.search);

  // ---------- helpers ----------
  function rng(seed) { // mulberry32: the same scene every time for a given seed
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(c, k) { return k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
  function rgba(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function star8(g, x, y, r, inner, rot) {
    g.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2 + (rot || 0), q = i % 2 ? r * (inner || 0.62) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath();
  }
  function glow(g, x, y, r, color, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(color, a)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  function metal(g, c, y0, y1) { var hg = g.createLinearGradient(0, y0, 0, y1); hg.addColorStop(0, shade(c, 0.45)); hg.addColorStop(0.5, c); hg.addColorStop(1, shade(c, -0.4)); return hg; }
  function rivet(g, x, y, c) { g.fillStyle = shade(c, 0.6); g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 0.8, y + 0.8, 1.4, 0, TAU); g.fill(); }
  A.rr = rr; A.shade = shade; A.mix = mix; A.rgba = rgba; A.rng = rng;

  // ---------- worlds ----------
  A.WORLDS = [
    { name: 'Moon Orbit', color: '#8fd3ff', sky: ['#02040f', '#081330', '#10234f', '#173064'],
      neb: ['#2f62d0', '#25a9c4', '#5a48c2'], rock: '#9c9db4', haze: '#173064', dust: '#bfe6ff' },
    { name: 'Asteroid Belt', color: '#ffb35c', sky: ['#07040c', '#1c0d22', '#3b1830', '#5a2634'],
      neb: ['#ff7f45', '#c23f68', '#ffc56b'], rock: '#a6806a', haze: '#5a2634', dust: '#ffd9a8' },
    { name: 'Ringed Planet', color: '#ffd27a', sky: ['#04051a', '#11153d', '#25235c', '#3b3172'],
      neb: ['#7462ff', '#ff94c2', '#ffcf7a'], rock: '#b6a6c8', haze: '#3b3172', dust: '#ffe6c2' },
    { name: 'Nebula', color: '#ff8fe0', sky: ['#06021a', '#170936', '#311152', '#1c0f45'],
      neb: ['#ff4fc0', '#6a58ff', '#2fe0cf', '#ffae5c'], rock: '#a99bd6', haze: '#311152', dust: '#ffd2f4' }
  ];

  /* ==================== the small sprites (atlas 'sr') ==================== */
  // The ranger ship, about 130 x 150 units, nose up.
  function drawShip(g) {
    for (var s = -1; s <= 1; s += 2) {
      g.save(); g.scale(s, 1);
      var wg = g.createLinearGradient(10, -10, 60, 50); wg.addColorStop(0, '#ff8070'); wg.addColorStop(1, '#b8243f');
      g.fillStyle = wg; g.strokeStyle = OL; g.lineWidth = 3;
      g.beginPath(); g.moveTo(14, -24); g.bezierCurveTo(34, -2, 52, 16, 60, 36); g.quadraticCurveTo(63, 50, 50, 50); g.lineTo(18, 44); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#ffd36b'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(19, -14); g.bezierCurveTo(34, 2, 47, 16, 54, 32); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(20, -8); g.bezierCurveTo(30, 6, 40, 18, 46, 30); g.lineTo(38, 32); g.bezierCurveTo(32, 20, 26, 10, 20, 2); g.closePath(); g.fill();
      g.fillStyle = '#ffd36b'; star8(g, 36, 36, 7.5, 0.5); g.fill();
      var pg = g.createLinearGradient(52, 0, 66, 0); pg.addColorStop(0, '#f4f7fd'); pg.addColorStop(1, '#8592b2');
      g.fillStyle = pg; g.strokeStyle = OL; g.lineWidth = 2.6; rr(g, 52, 4, 13, 38, 6.5); g.fill(); g.stroke();
      g.fillStyle = '#ff6b6b'; rr(g, 53.5, 2, 10, 9, 4.5); g.fill();
      g.restore();
    }
    function body() { g.beginPath(); g.moveTo(0, -72); g.bezierCurveTo(24, -60, 30, -14, 27, 28); g.quadraticCurveTo(25, 54, 0, 56);
      g.quadraticCurveTo(-25, 54, -27, 28); g.bezierCurveTo(-30, -14, -24, -60, 0, -72); g.closePath(); }
    body();
    var fg = g.createLinearGradient(-28, 0, 28, 0); fg.addColorStop(0, '#8b9fc6'); fg.addColorStop(0.35, '#ffffff'); fg.addColorStop(0.7, '#e2e9f6'); fg.addColorStop(1, '#7487b2');
    g.fillStyle = fg; g.fill();
    g.save(); g.clip();
    g.fillStyle = '#ff6b5e'; g.fillRect(-40, -80, 80, 27);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-40, -55, 80, 3);
    g.fillStyle = '#f6c453'; g.fillRect(-40, 12, 80, 13); g.fillStyle = '#c98a2b'; g.fillRect(-40, 24, 80, 2.5);
    var sh = g.createLinearGradient(0, 20, 0, 58); sh.addColorStop(0, 'rgba(20,30,70,0)'); sh.addColorStop(1, 'rgba(20,30,70,.38)');
    g.fillStyle = sh; g.fillRect(-40, 20, 80, 40);
    g.restore();
    body(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#fffaf0'; star8(g, 0, 18.5, 6, 0.5); g.fill();
    var cg = g.createLinearGradient(0, -44, 0, 2); cg.addColorStop(0, '#d2fcff'); cg.addColorStop(0.45, '#3cc3e0'); cg.addColorStop(1, '#0c4f78');
    g.fillStyle = cg; g.beginPath(); g.ellipse(0, -21, 13, 22, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-4.5, -30, 3.6, 8, -0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(5, -10, 2.2, 0, TAU); g.fill();
    [-12, 12].forEach(function (x) {
      g.fillStyle = '#4a5278'; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, 54, 8.5, 5, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#12152c'; g.beginPath(); g.ellipse(x, 55, 5, 2.8, 0, 0, TAU); g.fill();
    });
    g.strokeStyle = 'rgba(190,245,255,.75)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(13, -52); g.bezierCurveTo(23, -30, 25, 0, 23, 30); g.stroke();
  }

  // Robots: machines, not characters (sensor bar, vents, rivets, cores). Lights are separate glow images.
  var BOT = {
    bot: { c: '#3cc8b4', light: '#8ffcff', W: 88, H: 70 },
    tank: { c: '#ff9f43', light: '#fff07a', W: 100, H: 80 },
    zapper: { c: '#ff8fc8', light: '#fff0a0', W: 84, H: 74 }
  };
  A.BOT = BOT;
  function drawBot(kind) {
    return function (g) {
      var B = BOT[kind], c = B.c, W = B.W, H = B.H;
      g.strokeStyle = OL; g.lineWidth = 2.6;
      g.fillStyle = '#4a4f72'; g.beginPath(); g.moveTo(-14, H / 2 - 4); g.lineTo(14, H / 2 - 4); g.lineTo(9, H / 2 + 11); g.lineTo(-9, H / 2 + 11); g.closePath(); g.fill(); g.stroke();
      if (kind === 'bot') {
        for (var s = -1; s <= 1; s += 2) { g.fillStyle = shade(c, -0.25); rr(g, s > 0 ? W / 2 - 6 : -W / 2 - 10, 4, 16, 26, 8); g.fill(); g.stroke(); }
        g.lineWidth = 3; g.beginPath(); g.moveTo(-W * 0.28, -H / 2); g.lineTo(-W * 0.28, -H / 2 - 13); g.stroke();
        g.fillStyle = metal(g, c, -H / 2, H / 2); rr(g, -W / 2, -H / 2, W, H, 22); g.fill(); g.lineWidth = 3; g.stroke();
        var sg = g.createLinearGradient(0, -H / 2 + 12, 0, -H / 2 + 26); sg.addColorStop(0, '#0b1030'); sg.addColorStop(1, '#222a55');
        g.fillStyle = sg; rr(g, -W / 2 + 10, -H / 2 + 12, W - 20, 13, 6.5); g.fill(); g.lineWidth = 2; g.stroke();
        g.strokeStyle = 'rgba(15,40,50,.45)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-W / 2 + 6, 6); g.lineTo(W / 2 - 6, 6); g.moveTo(-W * 0.18, 6); g.lineTo(-W * 0.18, H / 2 - 2); g.stroke();
        g.strokeStyle = shade(c, -0.5); g.lineWidth = 3;
        for (var v = 0; v < 3; v++) { g.beginPath(); g.moveTo(W * 0.08 + v * 9, 14); g.lineTo(W * 0.08 + v * 9 + 6, 28); g.stroke(); }
        rivet(g, -W / 2 + 9, H / 2 - 10, c); rivet(g, W / 2 - 9, H / 2 - 10, c); rivet(g, -W * 0.32, 18, c);
        g.fillStyle = '#ff7a8a'; g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.arc(-W * 0.28, -H / 2 - 16, 6, 0, TAU); g.fill(); g.stroke();   // antenna ball
      } else if (kind === 'tank') {
        g.fillStyle = metal(g, c, -H / 2, H / 2); rr(g, -W / 2, -H / 2, W, H, 26); g.fill(); g.lineWidth = 3; g.stroke();
        g.fillStyle = shade(c, -0.15); g.strokeStyle = OL; g.lineWidth = 2;
        rr(g, -W / 2 + 6, -H / 2 + 8, W * 0.3, H - 16, 6); g.fill(); g.stroke();
        rr(g, W / 2 - 6 - W * 0.3, -H / 2 + 8, W * 0.3, H - 16, 6); g.fill(); g.stroke();
        for (var i = 0; i < 3; i++) { rivet(g, -W / 2 + 13, -H / 2 + 18 + i * 20, c); rivet(g, W / 2 - 13, -H / 2 + 18 + i * 20, c); }
        g.save(); rr(g, -W * 0.18, H / 2 - 16, W * 0.36, 11, 3); g.clip();
        g.fillStyle = '#2a2240'; g.fillRect(-W, -H, W * 2, H * 2); g.fillStyle = '#ffd34a';
        for (var x = -W * 0.3; x < W * 0.3; x += 12) { g.beginPath(); g.moveTo(x, H / 2 - 5); g.lineTo(x + 6, H / 2 - 16); g.lineTo(x + 12, H / 2 - 16); g.lineTo(x + 6, H / 2 - 5); g.closePath(); g.fill(); }
        g.restore();
        g.fillStyle = '#4a3f7a'; rr(g, -19, -22, 38, 32, 7); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
        g.fillStyle = shade(c, 0.3); rr(g, -6, -27, 12, 6, 2); g.fill(); g.stroke();
        for (var cell = 0; cell < 3; cell++) { g.fillStyle = B.light; rr(g, -15 + cell * 10.5, -18, 8.5, 24, 3); g.fill(); }   // three battery cells
      } else {
        g.strokeStyle = OL; g.lineWidth = 5.5; g.beginPath(); g.moveTo(0, -H / 2 + 8);
        for (var k = 1; k <= 5; k++) g.lineTo((k % 2 ? 7 : -7), -H / 2 + 8 - k * 4.4);
        g.stroke(); g.strokeStyle = '#e8ecf6'; g.lineWidth = 2.6; g.stroke();
        g.fillStyle = '#fff0a0'; g.beginPath(); g.arc(0, -H / 2 - 20, 7.5, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.2; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(-2.5, -H / 2 - 22.5, 2.4, 0, TAU); g.fill();
        g.fillStyle = metal(g, c, -H / 2, H / 2); g.beginPath(); g.ellipse(0, 0, W / 2, H / 2, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
        g.strokeStyle = 'rgba(120,20,70,.35)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, 0, W / 2 - 9, H / 2 - 9, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
        g.beginPath(); g.moveTo(-W * 0.3, -H * 0.18); g.lineTo(W * 0.38, -H * 0.18); g.stroke();
        g.strokeStyle = shade(c, 0.5); g.lineWidth = 3; g.beginPath(); g.ellipse(0, -H * 0.05, W / 2 + 2, 7, 0, 0.1, Math.PI - 0.1); g.stroke();
        rivet(g, W * 0.3, -H * 0.3, c); rivet(g, -W * 0.36, 2, c);
        g.fillStyle = '#7a3a7a'; g.beginPath(); g.arc(0, H / 2 - 6, 11, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.4; g.stroke();
      }
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-W / 2 + 6, -H / 2 + 22); g.quadraticCurveTo(-W / 2 + 6, -H / 2 + 6, -W / 2 + 22, -H / 2 + 5); g.stroke();
    };
  }
  // the cracks a hurt tank shows
  function drawTankCracks(g) {
    var B = BOT.tank;
    g.strokeStyle = 'rgba(40,10,0,.65)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(B.W * 0.3, -B.H * 0.3); g.lineTo(B.W * 0.36, -B.H * 0.12); g.lineTo(B.W * 0.29, B.H * 0.04); g.stroke();
    g.beginPath(); g.moveTo(-B.W * 0.36, B.H * 0.05); g.lineTo(-B.W * 0.28, B.H * 0.18); g.lineTo(-B.W * 0.37, B.H * 0.3); g.stroke();
  }

  // Drone: body only (the glow trail, rotor and lights are separate images)
  function drawDrone(g) {
    var gd = g.createLinearGradient(0, -8, 0, 22); gd.addColorStop(0, '#f2f5fc'); gd.addColorStop(0.5, '#a9b6d4'); gd.addColorStop(1, '#5d6890');
    g.strokeStyle = OL; g.lineWidth = 3;
    g.fillStyle = '#4b5580'; rr(g, -4, -22, 8, 18, 3); g.fill(); g.stroke();
    g.fillStyle = gd; g.beginPath(); g.ellipse(0, 4, 48, 15, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#4b5580'; g.beginPath(); g.ellipse(0, 8, 40, 7, 0, 0, Math.PI); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 2, 40, 9, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.fillStyle = '#2a2f52'; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, 0, 13, 6, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffb347'; g.strokeStyle = OL; g.lineWidth = 2; rr(g, -26, 15, 12, 6, 3); g.fill(); g.stroke(); rr(g, 14, 15, 12, 6, 3); g.fill(); g.stroke();
  }
  // the drone's rotor: a soft disc with a blade across it (the scene flips its width to spin it)
  function drawRotor(g) {
    g.fillStyle = 'rgba(220,235,255,.22)'; g.beginPath(); g.ellipse(0, 0, 44, 7, 0, 0, TAU); g.fill();
    g.strokeStyle = OL; g.lineWidth = 5; g.beginPath(); g.moveTo(-44, 0); g.lineTo(44, 0); g.stroke();
    g.strokeStyle = '#dfe6f5'; g.lineWidth = 2.6; g.stroke();
  }
  function drawBeam(g) { // the drone's downward glow
    var gl = g.createLinearGradient(0, -24, 0, 24); gl.addColorStop(0, 'rgba(120,255,230,.4)'); gl.addColorStop(1, 'rgba(120,255,230,0)');
    g.fillStyle = gl; g.beginPath(); g.moveTo(-14, -24); g.lineTo(14, -24); g.lineTo(26, 24); g.lineTo(-26, 24); g.closePath(); g.fill();
  }

  // Space junk
  function drawCan(g) {
    var bg = g.createLinearGradient(-18, 0, 18, 0); bg.addColorStop(0, '#9aa4bf'); bg.addColorStop(0.4, '#ffffff'); bg.addColorStop(1, '#7d86a6');
    g.fillStyle = bg; rr(g, -18, -30, 36, 60, 10); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
    g.save(); rr(g, -18, -30, 36, 60, 10); g.clip();
    g.fillStyle = '#ff7a45'; g.fillRect(-20, -12, 40, 9); g.fillRect(-20, 6, 40, 9);
    g.restore();
    g.fillStyle = '#5c6688'; rr(g, -8, -39, 16, 10, 3); g.fill(); g.stroke();
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(0, -41, 4, 0, TAU); g.fill();
  }
  function drawGear(g) {
    var n = 10, R1 = 34, R2 = 26;
    g.beginPath();
    for (var i = 0; i < n * 2; i++) { var a0 = i / (n * 2) * TAU, a1 = (i + 1) / (n * 2) * TAU, r = i % 2 ? R2 : R1; g.arc(0, 0, r, a0, a1); }
    g.closePath();
    var gg = g.createRadialGradient(-10, -12, 4, 0, 0, 36); gg.addColorStop(0, '#f1f4fb'); gg.addColorStop(0.6, '#a5aec8'); gg.addColorStop(1, '#5f6788');
    g.fillStyle = gg; g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
    g.fillStyle = '#3b4266'; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 18, 3.6, 5.2); g.stroke();
  }
  function drawSat(g) {
    for (var s = -1; s <= 1; s += 2) {
      g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.moveTo(s * 18, 0); g.lineTo(s * 28, 0); g.stroke();
      var pg = g.createLinearGradient(0, -14, 0, 14); pg.addColorStop(0, '#5aa2ff'); pg.addColorStop(1, '#1f3f9a');
      g.fillStyle = pg; rr(g, s > 0 ? 28 : -80, -15, 52, 30, 4); g.fill(); g.lineWidth = 2.4; g.stroke();
      g.strokeStyle = 'rgba(200,230,255,.55)'; g.lineWidth = 1.4;
      for (var k = 1; k < 4; k++) { var x = (s > 0 ? 28 : -80) + k * 13; g.beginPath(); g.moveTo(x, -14); g.lineTo(x, 14); g.stroke(); }
      g.beginPath(); g.moveTo(s > 0 ? 29 : -79, 0); g.lineTo(s > 0 ? 79 : -29, 0); g.stroke();
    }
    var bg = g.createLinearGradient(-18, -18, 18, 18); bg.addColorStop(0, '#ffe7a0'); bg.addColorStop(0.5, '#e7a83c'); bg.addColorStop(1, '#9a5c1c');
    g.fillStyle = bg; rr(g, -18, -20, 36, 40, 6); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = 'rgba(120,60,10,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-12, -6); g.lineTo(12, -10); g.moveTo(-12, 8); g.lineTo(12, 4); g.stroke();
    g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, -30); g.stroke();
    g.fillStyle = '#eef2fb'; g.beginPath(); g.ellipse(0, -34, 14, 6, 0, Math.PI, TAU); g.closePath(); g.fill(); g.stroke();
  }

  // Shots
  function bulletPainter(col) {
    return function (g) {
      var gl = g.createRadialGradient(0, 0, 2, 0, 0, 34); gl.addColorStop(0, rgba(col, 0.6)); gl.addColorStop(1, rgba(col, 0));
      g.fillStyle = gl; g.beginPath(); g.ellipse(0, 0, 14, 36, 0, 0, TAU); g.fill();
      g.fillStyle = col; rr(g, -6, -24, 12, 48, 6); g.fill();
      g.fillStyle = '#ffffff'; rr(g, -3, -20, 6, 36, 3); g.fill();
    };
  }
  function drawOrb(g) { // the robots' spark: a pink bubble
    var gl = g.createRadialGradient(0, 0, 4, 0, 0, 34); gl.addColorStop(0, 'rgba(255,120,200,.9)'); gl.addColorStop(0.5, 'rgba(255,80,170,.4)'); gl.addColorStop(1, 'rgba(255,80,170,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill();
    g.fillStyle = '#ff6fc4'; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-3, -3, 7, 0, TAU); g.fill();
  }

  // Pick-ups
  var PU = { spread: { c: '#ffb347', label: 'Triple Shot!' }, shield: { c: '#5ee7ff', label: 'Shield!' },
             magnet: { c: '#c98bff', label: 'Star Magnet!' }, heart: { c: '#ff5d73', label: '+1 Heart' } };
  A.PU = PU;
  function drawIcon(g, type) {
    g.lineWidth = 3; g.strokeStyle = OL;
    if (type === 'spread') {
      [-0.6, 0, 0.6].forEach(function (a) {
        g.save(); g.translate(0, 13); g.rotate(a);
        g.fillStyle = '#fff6d0'; g.strokeStyle = OL; g.lineWidth = 1.8; rr(g, -3.5, -30, 7, 18, 3.5); g.fill(); g.stroke();
        g.restore();
      });
      g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(0, 13, 5, 0, TAU); g.fill(); g.stroke();
    } else if (type === 'shield') {
      g.strokeStyle = '#ffffff'; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.stroke();
      g.fillStyle = '#ffffff'; star8(g, 0, 0, 9, 0.55); g.fill();
    } else if (type === 'magnet') {
      g.lineCap = 'butt'; g.strokeStyle = '#ff5d73'; g.lineWidth = 9; g.beginPath(); g.arc(0, -2, 11, Math.PI, 0, true); g.stroke();
      g.strokeStyle = '#e8ecf6'; g.beginPath(); g.moveTo(-11, -2); g.lineTo(-11, -14); g.moveTo(11, -2); g.lineTo(11, -14); g.stroke();
      g.lineCap = 'round';
    } else {
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 15); g.bezierCurveTo(-20, 2, -16, -16, 0, -8); g.bezierCurveTo(16, -16, 20, 2, 0, 15); g.fill();
    }
  }
  function puPainter(type) {
    return function (g) {
      var P = PU[type];
      var gl = g.createRadialGradient(0, 0, 10, 0, 0, 48); gl.addColorStop(0, rgba(P.c, 0.55)); gl.addColorStop(1, rgba(P.c, 0));
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 48, 0, TAU); g.fill();
      var bg = g.createRadialGradient(-10, -12, 4, 0, 0, 32); bg.addColorStop(0, shade(P.c, 0.55)); bg.addColorStop(0.6, P.c); bg.addColorStop(1, shade(P.c, -0.45));
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
      drawIcon(g, type);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-12, -17, 8, 4.5, -0.6, 0, TAU); g.fill();
    };
  }
  function drawStarItem(g) {
    var gl = g.createRadialGradient(0, 0, 4, 0, 0, 27); gl.addColorStop(0, 'rgba(255,220,120,.6)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.fill();
    var sg = g.createLinearGradient(0, -18, 0, 18); sg.addColorStop(0, '#fff3b8'); sg.addColorStop(0.5, '#f6c453'); sg.addColorStop(1, '#d98a1f');
    g.fillStyle = sg; star8(g, 0, 0, 18, 0.6); g.fill(); g.strokeStyle = '#7a4a12'; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; star8(g, -2, -3, 6, 0.5); g.fill();
  }

  // Lights and effects: all white, tinted by the scene
  function drawFlame(g) { // origin at the top centre of the picture
    g.translate(0, -32);
    var gr = g.createLinearGradient(0, 0, 0, 62);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.25, 'rgba(255,220,120,.9)'); gr.addColorStop(0.6, 'rgba(255,120,60,.6)'); gr.addColorStop(1, 'rgba(255,60,90,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(-9, 28, 0, 62); g.quadraticCurveTo(9, 28, 10, 0); g.closePath(); g.fill();
  }
  function drawGlow(g) {
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 32, 0, TAU); g.fill();
  }
  function drawLamp(g) { g.fillStyle = '#fff'; rr(g, -9, -3.5, 18, 7, 3.5); g.fill(); }        // the scanning light on a robot's sensor bar
  function drawDot(g) { var gr = g.createRadialGradient(0, 0, 0, 0, 0, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill(); }
  function drawSpark(g) { g.fillStyle = '#fff'; star8(g, 0, 0, 15, 0.35); g.fill(); }
  function drawStarP(g) { g.fillStyle = '#fff'; star8(g, 0, 0, 15, 0.6); g.fill(); }
  function drawRing(g) { g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 72, 0, TAU); g.stroke(); }
  function drawDashRing(g) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([10, 9]); g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.stroke(); }
  function drawShield(g) {
    var R = 98, sg = g.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
    sg.addColorStop(0, 'rgba(110,230,255,0)'); sg.addColorStop(0.8, 'rgba(110,230,255,.18)'); sg.addColorStop(1, 'rgba(180,250,255,.55)');
    g.fillStyle = sg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,250,255,.85)'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(200,250,255,.35)'; g.lineWidth = 2; star8(g, 0, 0, R * 0.92, 0.72, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-R * 0.45, -R * 0.5, R * 0.18, R * 0.08, -0.7, 0, TAU); g.fill();
  }
  function drawMagnetArc(g) { g.strokeStyle = '#d59bff'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 110, -2.6, -0.54); g.stroke(); }

  var SPRITES = [
    ['ship', 150, 160, drawShip],
    ['bot-bot', 138, 126, drawBot('bot')], ['bot-tank', 150, 136, drawBot('tank')], ['bot-zapper', 134, 130, drawBot('zapper')],
    ['tank-crack', 150, 136, drawTankCracks],
    ['drone', 120, 90, drawDrone], ['rotor', 100, 20, drawRotor], ['beam', 60, 50, drawBeam],
    ['junk-can', 56, 92, drawCan], ['junk-gear', 80, 80, drawGear], ['junk-sat', 176, 80, drawSat],
    ['bullet', 30, 74, bulletPainter('#7ff6ff')], ['bullet-g', 30, 74, bulletPainter('#ffd36b')], ['orb', 70, 70, drawOrb],
    ['pu-spread', 100, 100, puPainter('spread')], ['pu-shield', 100, 100, puPainter('shield')], ['pu-magnet', 100, 100, puPainter('magnet')], ['pu-heart', 100, 100, puPainter('heart')],
    ['star', 56, 56, drawStarItem],
    ['flame', 24, 64, drawFlame], ['glow', 64, 64, drawGlow], ['lamp', 22, 10, drawLamp],
    ['dot', 32, 32, drawDot], ['spark', 32, 32, drawSpark], ['starp', 32, 32, drawStarP],
    ['ring', 160, 160, drawRing], ['dashring', 90, 90, drawDashRing], ['shield', 210, 210, drawShield], ['magarc', 260, 260, drawMagnetArc]
  ];

  // Shelf-pack a list of [name, w, h, paint(g)] into one canvas texture (key), returning its frames. Each sprite is painted
  // centred in its own cell at s pixels per unit. Tall ones first, and the narrowest sheet width (1024 .. 2048) that gives
  // the smallest area wins, so the sheet is only as big as its pictures (the old 2048-wide shelves left 60% empty). The
  // height is whatever is needed (not a power of two: the sheet is never mipmapped).
  function atlas(scene, key, list, s) {
    var pad = 2, items = list.map(function (it) { return { name: it[0], w: Math.ceil(it[1] * s), h: Math.ceil(it[2] * s), fn: it[3], uw: it[1], uh: it[2] }; });
    items.sort(function (a, b) { return b.h - a.h || b.w - a.w; });
    var best = null;
    [1024, 1280, 1536, 2048].forEach(function (width) {
      var x = pad, y = pad, rowH = 0, slots = [];
      items.forEach(function (it) {
        if (x + it.w + pad > width) { x = pad; y += rowH + pad; rowH = 0; }
        slots.push({ it: it, x: x, y: y }); x += it.w + pad; rowH = Math.max(rowH, it.h);
      });
      var H = y + rowH + pad;
      if (!best || width * H < best.width * best.H) best = { width: width, H: H, slots: slots };
    });
    tex(scene, key, best.width, best.H, function (g) {
      best.slots.forEach(function (sl) {
        g.save(); g.translate(sl.x, sl.y); g.scale(s, s); g.translate(sl.it.uw / 2, sl.it.uh / 2); g.lineJoin = 'round'; g.lineCap = 'round';
        sl.it.fn(g); g.restore();
      });
    });
    var t = scene.textures.get(key);             // (a baked sheet is loaded by Boot; its frames are the same either way)
    best.slots.forEach(function (sl) { if (!t.has(sl.it.name)) t.add(sl.it.name, 0, sl.x, sl.y, sl.it.w, sl.it.h); });
  }

  A.paintSprites = function (scene) { atlas(scene, 'sr', SPRITES, S); };

  /* ==================== the interface (atlas 'ui') ==================== */
  var P = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z';
  function icon(draw) { // a 96 x 96 icon in a 24 x 24 grid, ink colour near white
    return function (c) { c.translate(-48, -48); c.strokeStyle = '#f2f7f6'; c.fillStyle = '#f2f7f6'; c.lineCap = 'round'; c.lineJoin = 'round'; c.scale(4, 4); c.lineWidth = 2.4; draw(c); };
  }
  var UI = [
    ['plate', 150, 150, function (c) { c.fillStyle = 'rgba(8,10,28,.74)'; c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4; c.stroke(); }],
    ['pill9', 100, 100, function (c) { c.fillStyle = '#fff'; rr(c, -48, -48, 96, 96, 48); c.fill(); }],
    ['pillp9', 100, 100, function (c) { c.fillStyle = 'rgba(8,10,28,.74)'; rr(c, -48, -48, 96, 96, 48); c.fill(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4; c.stroke(); }],
    ['pillline9', 100, 100, function (c) { c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 4; rr(c, -48, -48, 96, 96, 48); c.stroke(); }],
    ['card9', 140, 140, function (c) { c.fillStyle = '#fff'; rr(c, -66, -66, 132, 132, 44); c.fill(); }],
    ['cardline9', 140, 140, function (c) { c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 4; rr(c, -66, -66, 132, 132, 44); c.stroke(); }],
    ['big', 280, 280, function (c) { c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(0, 0, 134, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-40, -66, 60, 26, -0.4, 0, TAU); c.fill(); }],
    ['lv', 140, 140, function (c) { c.fillStyle = '#fff'; rr(c, -66, -66, 132, 132, 30); c.fill(); }],
    ['lvo', 140, 140, function (c) { c.strokeStyle = '#fff'; c.lineWidth = 6; rr(c, -66, -66, 132, 132, 30); c.stroke(); }],
    ['finger', 160, 160, function (c) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,.14)'; c.fill(); }],
    ['px', 8, 8, function (c) { c.fillStyle = '#fff'; c.fillRect(-4, -4, 8, 8); }],
    ['heart', 80, 80, function (c) { c.scale(3.3, 3.3); c.translate(-12, -12.2); var p = new Path2D(P); c.fillStyle = '#ff5d73'; c.fill(p); c.strokeStyle = '#7a1030'; c.lineWidth = 1.3; c.lineJoin = 'round'; c.stroke(p); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(8, 8, 2.3, 1.3, -0.7, 0, TAU); c.fill(); }],
    ['heart0', 80, 80, function (c) { c.scale(3.3, 3.3); c.translate(-12, -12.2); var p = new Path2D(P); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke(p); }],
    ['gold', 100, 100, function (c) { c.fillStyle = '#f6c453'; star8(c, 0, 0, 44, 0.64); c.fill(); c.strokeStyle = '#7a4a12'; c.lineWidth = 4.5; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -30); c.lineTo(9, -20); c.lineTo(21, -21); c.lineTo(20, -9); c.lineTo(30, 0); c.stroke(); }],
    ['gold0', 100, 100, function (c) { c.fillStyle = 'rgba(255,255,255,.16)'; star8(c, 0, 0, 44, 0.64); c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.stroke(); }],
    ['hand', 110, 130, function (c) { c.scale(4.4, 4.4); c.translate(-12, -14); c.fillStyle = '#fff'; c.strokeStyle = '#2a1a4a'; c.lineWidth = 1.2; c.lineJoin = 'round';
      var p = new Path2D('M9 11V4.5a1.5 1.5 0 0 1 3 0V10l.1-1.6a1.5 1.5 0 0 1 3 .2V11l.2-.9a1.4 1.4 0 0 1 2.8.5V15c0 3.3-2.4 6-5.6 6h-1a5.6 5.6 0 0 1-4.6-2.5l-2.6-4a1.5 1.5 0 0 1 2.4-1.8L9 15z'); c.fill(p); c.stroke(p); }],
    ['ic-exit', 96, 96, function (c) { c.translate(-48, -48); Kit.play.exitIcon(c, 96, '#f2f7f6', 2.6); }],
    ['ic-back', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(19, 12); c.lineTo(6, 12); c.moveTo(11, 6); c.lineTo(5, 12); c.lineTo(11, 18); c.stroke(); })],
    ['ic-next', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(5, 12); c.lineTo(18, 12); c.moveTo(13, 6); c.lineTo(19, 12); c.lineTo(13, 18); c.stroke(); })],
    ['ic-retry', 96, 96, icon(function (c) { c.beginPath(); c.arc(12, 12, 8, Math.PI * 1.25, Math.PI * 3.05); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(4, 9.5); c.lineTo(9.5, 9.5); c.stroke(); })],
    ['ic-grid', 96, 96, icon(function (c) { [[4, 4], [14, 4], [4, 14], [14, 14]].forEach(function (p) { c.beginPath(); c.roundRect(p[0], p[1], 6, 6, 1.5); c.stroke(); }); })],
    ['ic-snd', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); })],
    ['ic-mute', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(4, 9.5); c.lineTo(4, 14.5); c.lineTo(7.5, 14.5); c.lineTo(12, 18.5); c.lineTo(12, 5.5); c.lineTo(7.5, 9.5); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(15.5, 9.5); c.lineTo(20.5, 14.5); c.moveTo(20.5, 9.5); c.lineTo(15.5, 14.5); c.stroke(); })],
    ['ic-pause', 96, 96, icon(function (c) { c.beginPath(); c.roundRect(6.5, 5, 3.6, 14, 1.4); c.roundRect(13.9, 5, 3.6, 14, 1.4); c.fill(); })],
    ['ic-close', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(6, 6); c.lineTo(18, 18); c.moveTo(18, 6); c.lineTo(6, 18); c.stroke(); })],
    ['ic-play', 96, 96, icon(function (c) { c.beginPath(); c.moveTo(8, 5); c.lineTo(19, 12); c.lineTo(8, 19); c.closePath(); c.fill(); })],
    ['ic-lock', 96, 96, icon(function (c) { c.beginPath(); c.roundRect(5, 11, 14, 10, 2); c.stroke(); c.beginPath(); c.moveTo(8, 11); c.lineTo(8, 8); c.arc(12, 8, 4, Math.PI, 0); c.lineTo(16, 11); c.stroke(); })]
  ];
  A.paintUi = function (scene) { atlas(scene, 'ui', UI, S); };

  /* ==================== per world: sky, scenery, asteroids ==================== */
  function planetBall(g, x, y, r, base, lightDir, opts) {
    opts = opts || {};
    var lx = x + Math.cos(lightDir) * r * 0.45, ly = y + Math.sin(lightDir) * r * 0.45;
    var halo = g.createRadialGradient(x, y, r * 0.9, x, y, r * (opts.halo || 1.25));
    halo.addColorStop(0, rgba(opts.atmo || base, 0.5)); halo.addColorStop(1, rgba(opts.atmo || base, 0));
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * (opts.halo || 1.25), 0, TAU); g.fill();
    var gr = g.createRadialGradient(lx, ly, r * 0.05, x, y, r);
    gr.addColorStop(0, shade(base, 0.45)); gr.addColorStop(0.55, base); gr.addColorStop(1, shade(base, -0.55));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    if (opts.detail) opts.detail(g);
    var sx = x - Math.cos(lightDir) * r * 0.9, sy = y - Math.sin(lightDir) * r * 0.9;
    var sh = g.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 1.5);
    sh.addColorStop(0, 'rgba(4,4,20,.82)'); sh.addColorStop(0.55, 'rgba(4,4,20,.35)'); sh.addColorStop(1, 'rgba(4,4,20,0)');
    g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    g.strokeStyle = rgba('#ffffff', 0.45); g.lineWidth = Math.max(1.5, r * 0.025);
    g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, lightDir - 1.1, lightDir + 1.1); g.stroke();
  }
  function ringBand(g, x, y, r, back) {
    g.save(); g.translate(x, y); g.rotate(-0.3);
    var from = back ? Math.PI : 0, to = back ? TAU : Math.PI;
    var rings = [[1.45, 0.06, '#f3d9b0', 0.55], [1.6, 0.05, '#c79a6a', 0.5], [1.78, 0.09, '#f0d2a4', 0.6], [1.98, 0.04, '#a87a5a', 0.4], [2.1, 0.03, '#f7e4c4', 0.4]];
    rings.forEach(function (q) { g.strokeStyle = rgba(q[2], back ? q[3] * 0.7 : q[3]); g.lineWidth = r * q[1]; g.beginPath(); g.ellipse(0, 0, r * q[0], r * q[0] * 0.24, 0, from, to); g.stroke(); });
    g.restore();
  }

  // The sky of a world, painted once on a canvas of w x h (the orientation of the screen: portrait or landscape).
  function paintBg(wi, cw, ch) {
    return function (g) {
      var W = A.WORLDS[wi], R = rng(500 + wi * 91), D = Math.sqrt(cw * ch), SS = 1.4;
      var gr = g.createLinearGradient(0, 0, cw * 0.3, ch);
      W.sky.forEach(function (col, i) { gr.addColorStop(i / (W.sky.length - 1), col); });
      g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'lighter';
      var nClouds = wi === 3 ? 34 : 18;
      for (var i = 0; i < nClouds; i++) {
        var u = R(), bx = cw * (u * 1.2 - 0.1), by = ch * (0.85 - u * 0.7) + (R() - 0.5) * ch * 0.35, r = D * (0.12 + R() * 0.22);
        var col = W.neb[(R() * W.neb.length) | 0], a = (wi === 3 ? 0.11 : 0.06) + R() * 0.07;
        var ng = g.createRadialGradient(bx, by, 0, bx, by, r); ng.addColorStop(0, rgba(col, a)); ng.addColorStop(0.6, rgba(col, a * 0.4)); ng.addColorStop(1, rgba(col, 0));
        g.fillStyle = ng; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      if (wi === 3) {
        for (var d = 0; d < 9; d++) { var dx = cw * R(), dy = ch * R(), dr = D * (0.06 + R() * 0.1);
          var dg = g.createRadialGradient(dx, dy, 0, dx, dy, dr); dg.addColorStop(0, 'rgba(8,2,24,.45)'); dg.addColorStop(1, 'rgba(8,2,24,0)');
          g.fillStyle = dg; g.beginPath(); g.ellipse(dx, dy, dr * 1.8, dr * 0.7, -0.6, 0, TAU); g.fill(); }
      }
      for (var s = 0; s < 700; s++) {
        var t2 = R(), sx = cw * (t2 * 1.2 - 0.1) + (R() - 0.5) * D * 0.25 * (R() + R() - 1), sy = ch * (0.85 - t2 * 0.7) + (R() - 0.5) * D * 0.18;
        g.globalAlpha = 0.15 + R() * 0.45; g.fillStyle = R() < 0.2 ? W.dust : '#ffffff';
        g.fillRect(sx, sy, SS * (R() < 0.1 ? 1.6 : 0.9), SS * (R() < 0.1 ? 1.6 : 0.9));
      }
      g.globalAlpha = 1;
      var big = Math.max(cw, ch), small = Math.min(cw, ch);
      if (wi === 0) {
        planetBall(g, cw * 0.86, ch * 0.13, small * 0.07, '#3f8fe0', 2.4, { atmo: '#7fd6ff', halo: 1.5, detail: function (q) {
          var x = cw * 0.86, y = ch * 0.13, r = small * 0.07, r2 = rng(5);
          q.fillStyle = '#3fbf8a'; for (var k = 0; k < 5; k++) { q.beginPath(); q.ellipse(x + (r2() - 0.5) * r * 1.4, y + (r2() - 0.5) * r * 1.4, r * (0.2 + r2() * 0.3), r * (0.12 + r2() * 0.2), r2() * 3, 0, TAU); q.fill(); }
          q.strokeStyle = 'rgba(255,255,255,.55)'; q.lineWidth = r * 0.08; for (var k2 = 0; k2 < 4; k2++) { q.beginPath(); q.ellipse(x, y + (r2() - 0.5) * r * 1.4, r * 0.9, r * 0.18, 0.2, 0, Math.PI); q.stroke(); } } });
        var mr = big * 0.36, mx = cw * 0.08, my = ch * 1.02;
        planetBall(g, mx, my, mr, '#a9aac2', -0.75, { atmo: '#cfd8ff', halo: 1.08, detail: function (q) {
          var r3 = rng(9);
          for (var k = 0; k < 6; k++) { q.fillStyle = 'rgba(70,72,105,.28)'; q.beginPath(); q.ellipse(mx + (r3() - 0.3) * mr, my - r3() * mr, mr * (0.15 + r3() * 0.2), mr * (0.1 + r3() * 0.14), r3() * 3, 0, TAU); q.fill(); }
          for (var k3 = 0; k3 < 40; k3++) { var cx = mx + (r3() - 0.2) * mr * 1.3, cy = my - r3() * mr, cr = mr * (0.015 + r3() * r3() * 0.08);
            q.fillStyle = 'rgba(60,62,95,.4)'; q.beginPath(); q.ellipse(cx, cy, cr, cr * 0.8, 0, 0, TAU); q.fill();
            q.strokeStyle = 'rgba(255,255,255,.35)'; q.lineWidth = Math.max(1, cr * 0.2); q.beginPath(); q.ellipse(cx, cy, cr, cr * 0.8, 0, 3.6, 5.6); q.stroke(); } } });
      } else if (wi === 1) {
        var sx2 = cw * 0.12, sy2 = ch * 0.1;
        g.globalCompositeOperation = 'lighter';
        glow(g, sx2, sy2, small * 0.6, '#ffb060', 0.35); glow(g, sx2, sy2, small * 0.18, '#fff0c0', 0.9);
        g.strokeStyle = 'rgba(255,220,160,.25)'; g.lineWidth = 2 * SS;
        for (var f = 0; f < 4; f++) { var fa = f * Math.PI / 4 + 0.2; g.beginPath(); g.moveTo(sx2 - Math.cos(fa) * small * 0.3, sy2 - Math.sin(fa) * small * 0.3); g.lineTo(sx2 + Math.cos(fa) * small * 0.3, sy2 + Math.sin(fa) * small * 0.3); g.stroke(); }
        g.globalCompositeOperation = 'source-over';
        for (var b2 = 0; b2 < 300; b2++) {
          var u2 = R(), bx2 = cw * (1.1 - u2 * 1.2), by2 = ch * (0.15 + u2 * 0.75) + (R() + R() - 1) * small * 0.18, br = (0.6 + Math.pow(R(), 3) * 7) * SS;
          g.fillStyle = rgba(mix('#3a2230', '#c99a7a', R() * 0.6), 0.5 + R() * 0.5); g.beginPath(); g.ellipse(bx2, by2, br * 1.2, br, R() * 3, 0, TAU); g.fill();
          if (br > 3 * SS) { g.fillStyle = 'rgba(255,210,160,.4)'; g.beginPath(); g.arc(bx2 - br * 0.3, by2 - br * 0.3, br * 0.4, 0, TAU); g.fill(); }
        }
      } else if (wi === 2) {
        var px = cw * 0.8, py = ch * 0.24, pr = big * 0.19;
        if (cw > ch) { px = cw * 0.78; py = ch * 0.3; pr = ch * 0.2; }
        ringBand(g, px, py, pr, true);
        planetBall(g, px, py, pr, '#e7a86a', -2.4, { atmo: '#ffd9a0', halo: 1.15, detail: function (q) {
          q.save(); q.translate(px, py); q.rotate(-0.3);
          var cols = ['#f5d2a0', '#d98b5a', '#f0c48a', '#c4704a', '#f7dcb0', '#b8664a', '#eab27a'];
          for (var k = -8; k < 8; k++) { q.fillStyle = rgba(cols[(k + 16) % cols.length], 0.55); q.fillRect(-pr * 1.5, k * pr * 0.14, pr * 3, pr * 0.1 + (k % 3) * pr * 0.02); }
          q.fillStyle = 'rgba(200,90,60,.5)'; q.beginPath(); q.ellipse(pr * 0.3, pr * 0.25, pr * 0.16, pr * 0.08, 0, 0, TAU); q.fill();
          q.restore(); } });
        ringBand(g, px, py, pr, false);
        planetBall(g, cw * 0.18, ch * 0.62, small * 0.05, '#bcd8ff', -2.4, { atmo: '#cfe6ff', halo: 1.4 });
        g.fillStyle = rgba(W.haze, 0.3); g.fillRect(0, 0, cw, ch);
      } else {
        var gx = cw * 0.78, gy = ch * 0.2, gs = small * 0.16;
        g.save(); g.translate(gx, gy); g.scale(1, 0.45); g.rotate(0.4);
        g.globalCompositeOperation = 'lighter';
        glow(g, 0, 0, gs * 0.5, '#fff0d0', 0.8);
        for (var p = 0; p < 500; p++) { var arm = p % 2, rr2 = Math.pow(R(), 0.7) * gs, ang = rr2 / gs * 5 + arm * Math.PI + (R() - 0.5) * 0.6;
          g.fillStyle = rgba(R() < 0.5 ? '#c7b8ff' : '#ffd2f4', 0.5); g.fillRect(Math.cos(ang) * rr2, Math.sin(ang) * rr2, 1.6 * SS, 1.6 * SS); }
        g.restore(); g.globalCompositeOperation = 'source-over';
      }
      g.globalCompositeOperation = 'lighter';
      for (var q2 = 0; q2 < (wi === 3 ? 16 : 9); q2++) {
        var qx = R() * cw, qy = R() * ch, qs = (3 + R() * 6) * SS, qc = R() < 0.5 ? '#ffffff' : W.dust;
        glow(g, qx, qy, qs * 3, qc, 0.5);
        g.strokeStyle = rgba(qc, 0.55); g.lineWidth = 1.1 * SS;
        g.beginPath(); g.moveTo(qx - qs * 3, qy); g.lineTo(qx + qs * 3, qy); g.moveTo(qx, qy - qs * 3); g.lineTo(qx, qy + qs * 3); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      var vg = g.createRadialGradient(cw / 2, ch / 2, small * 0.35, cw / 2, ch / 2, big * 0.75);
      vg.addColorStop(0, 'rgba(0,0,8,0)'); vg.addColorStop(1, 'rgba(0,0,8,.5)');
      g.fillStyle = vg; g.fillRect(0, 0, cw, ch);
    };
  }
  A.BG = { portrait: [768, 1152], landscape: [1152, 768] };
  // returns the texture key (painted once per world and orientation); the old world's sky is dropped
  A.sky = function (scene, wi, landscape) {
    var key = 'bg-' + wi + (landscape ? 'l' : 'p'), sz = landscape ? A.BG.landscape : A.BG.portrait;
    if (scene.textures.exists(key)) return key;
    scene.textures.getTextureKeys().forEach(function (k) { if (/^bg-/.test(k)) scene.textures.remove(k); });
    return live(scene, key, sz[0], sz[1], function (g) { paintBg(wi, sz[0], sz[1])(g); });
  };
  // one tile of stars that wraps: faint small dots, brighter bigger ones and a few round bright ones
  A.paintStars = function (scene) {
    tex(scene, 'stars0', 512, 1024, function (g) {
      var R = rng(31); g.fillStyle = '#ffffff';
      [[1.9, 0.45, 30, 0], [3.1, 0.7, 16, 0], [4.8, 0.95, 8, 1]].forEach(function (D) {
        for (var i = 0; i < D[2]; i++) {
          var x = R() * 512, y = R() * 1024, sz = D[0]; g.globalAlpha = D[1] * (0.75 + R() * 0.25);
          if (D[3]) { g.beginPath(); g.arc(x, y, sz * 0.75, 0, TAU); g.fill(); } else g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
        }
      });
    });
    // warp streaks (shown only while the ship jumps in): thin vertical lines, a small tile shown at twice its size
    tex(scene, 'streaks', 256, 512, function (g) {
      var R = rng(77); g.fillStyle = '#ffffff';
      for (var i = 0; i < 20; i++) { g.globalAlpha = 0.25 + R() * 0.55; g.fillRect(R() * 256, R() * 512, 1.5 + R() * 1.5, 50 + R() * 130); }
    });
  };

  // drifting scenery and the dark rocks that pass close
  function sceneryPaint(kind, size, wi) {
    return function (g) {
      var r = size / 2, R = rng(size * 7 + wi), W = A.WORLDS[wi];
      if (kind === 'moonlet') planetBall(g, 0, 0, r, R() < 0.5 ? '#9b9cb8' : '#c2a98f', -0.8, { halo: 1.2, detail: function (q) {
        for (var k = 0; k < 7; k++) { var cx = (R() - 0.5) * r * 1.4, cy = (R() - 0.5) * r * 1.4, cr = r * (0.08 + R() * 0.15); q.fillStyle = 'rgba(40,40,70,.35)'; q.beginPath(); q.arc(cx, cy, cr, 0, TAU); q.fill(); } } });
      else if (kind === 'icemoon') planetBall(g, 0, 0, r, '#a8d4f0', -0.8, { atmo: '#d8f0ff', halo: 1.3 });
      else if (kind === 'gasball') planetBall(g, 0, 0, r, ['#ff9fd0', '#8f7dff', '#5fe0d0'][(R() * 3) | 0], -0.8, { halo: 1.35, detail: function (q) {
        q.fillStyle = 'rgba(255,255,255,.18)'; for (var k = -3; k < 3; k++) q.fillRect(-r, k * r * 0.3, r * 2, r * 0.12); } });
      else if (kind === 'rock') { g.globalAlpha = 0.75; drawRock(r, 31 + size, mix(W.rock, W.haze, 0.72), 'far')(g); g.globalAlpha = 1; }
      else if (kind === 'darkrock') drawRock(r, 57 + size, mix(W.rock, '#0a0612', 0.82), 'near')(g);
      else if (kind === 'station') {
        g.rotate(-0.35); g.globalAlpha = 0.85;
        g.strokeStyle = rgba('#c9d4f0', 0.8); g.lineWidth = r * 0.12; g.beginPath(); g.ellipse(0, 0, r, r * 0.34, 0, 0, TAU); g.stroke();
        var hb = g.createLinearGradient(0, -r * 0.3, 0, r * 0.3); hb.addColorStop(0, '#c3cbe6'); hb.addColorStop(1, '#5b6690'); g.fillStyle = hb; g.beginPath(); g.ellipse(0, 0, r * 0.38, r * 0.3, 0, 0, TAU); g.fill();
        g.fillStyle = '#6f7aa0'; rr(g, -r * 0.08, -r * 0.75, r * 0.16, r * 1.5, r * 0.06); g.fill();
        g.fillStyle = '#ffd98a';
        for (var k = -2; k <= 2; k++) { var wx = k * r * 0.13, wy = -r * 0.02, ww = r * 0.05; g.beginPath(); g.rect(wx - ww, wy, ww * 2, ww * 2.2); g.arc(wx, wy, ww, Math.PI, 0); g.fill(); }
        g.fillStyle = '#f6c453'; star8(g, 0, -r * 0.82, r * 0.12, 0.55); g.fill();
        g.fillStyle = 'rgba(90,162,255,.85)'; g.fillRect(-r * 1.25, -r * 0.08, r * 0.3, r * 0.16); g.fillRect(r * 0.95, -r * 0.08, r * 0.3, r * 0.16);
      }
    };
  }
  A.scenery = function (scene, kind, size, wi) {
    var key = 'sc-' + wi + '-' + kind + size, w = Math.ceil(size * 1.8);
    if (!scene.textures.exists(key)) tex(scene, key, w, w, function (g) { g.translate(w / 2, w / 2); sceneryPaint(kind, size, wi)(g); });
    return key;
  };

  // Asteroids: many small scattered craters, no rim arcs
  function drawRock(r, seed, tint, far) {
    return function (g) {
      var R = rng(seed), n = 13, pts = [];
      for (var i = 0; i < n; i++) { var a = i / n * TAU, q = r * (0.78 + R() * 0.24); pts.push([Math.cos(a) * q, Math.sin(a) * q]); }
      function path() { g.beginPath(); pts.forEach(function (p, i) { var nx = pts[(i + 1) % n]; var mx = (p[0] + nx[0]) / 2, my = (p[1] + nx[1]) / 2; i ? g.quadraticCurveTo(p[0], p[1], mx, my) : g.moveTo(mx, my); }); g.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2); g.closePath(); }
      path();
      var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
      gr.addColorStop(0, shade(tint, 0.35)); gr.addColorStop(0.55, tint); gr.addColorStop(1, shade(tint, -0.6));
      g.fillStyle = gr; g.fill();
      g.save(); path(); g.clip();
      for (var s = 0; s < r * 0.9; s++) { g.fillStyle = R() < 0.5 ? 'rgba(255,240,220,.12)' : 'rgba(20,10,20,.16)'; g.beginPath(); g.arc((R() - 0.5) * r * 2, (R() - 0.5) * r * 2, 1 + R() * r * 0.04, 0, TAU); g.fill(); }
      var pits = 7 + Math.round(r / 12);
      for (var c2 = 0; c2 < pits; c2++) {
        var cx = (R() - 0.5) * r * 1.5, cy = (R() - 0.5) * r * 1.5, cr = r * (0.05 + R() * R() * 0.13);
        var pg = g.createRadialGradient(cx + cr * 0.3, cy + cr * 0.3, 0, cx, cy, cr);
        pg.addColorStop(0, 'rgba(20,10,20,.42)'); pg.addColorStop(1, 'rgba(20,10,20,0)');
        g.fillStyle = pg; g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
      }
      g.restore();
      if (far === 'far') return;
      if (!far) { path(); g.strokeStyle = OL; g.lineWidth = r > 50 ? 3.4 : 2.6; g.stroke(); }
      g.save(); path(); g.clip();
      g.strokeStyle = far ? 'rgba(255,200,170,.25)' : 'rgba(255,245,225,.5)'; g.lineWidth = far ? r * 0.06 : 4;
      g.translate(r * 0.06, r * 0.06); path(); g.stroke();
      g.restore();
    };
  }
  // an asteroid of radius r, variant v (0..2), in world wi: its own small texture, scale 1 / S
  A.rock = function (scene, r, v, wi) {
    var key = 'rock-' + wi + '-' + r + '-' + v, w = r * 2 + 16;
    if (!scene.textures.exists(key)) tex(scene, key, w * S, w * S, function (g) { g.scale(S, S); g.translate(w / 2, w / 2); g.lineJoin = 'round'; g.lineCap = 'round'; drawRock(r, 77 + v * 13 + r, A.WORLDS[wi].rock)(g); });
    return key;
  };
  // what drifts in a world: the passing scenery (kind, size) and the dark rocks that fly close; sizes are fixed units
  var SCEN = [['moonlet', 'station', 'moonlet'], ['rock', 'rock', 'rock', 'rock', 'rock'], ['icemoon', 'rock', 'rock', 'rock'], ['gasball', 'gasball', 'rock']];
  A.worldScenery = function (wi) {
    var out = SCEN[wi].map(function (kind, i) { return { kind: kind, size: Math.round((kind === 'station' ? 44 : kind === 'rock' ? 22 + i * 9 : 34 + i * 14) * 2.4) }; });
    return { mid: out, fore: (wi === 1 || wi === 2) ? [0, 1].map(function (f) { return { kind: 'darkrock', size: Math.round((110 + f * 50) * 2.4) }; }) : [] };
  };

  /* ==================== boss machines (no faces: each has one glowing core, its weak point) ==================== */
  A.BOSSES = [
    { name: 'Moon Mech', color: '#6fc8e8', w: 460, h: 340, rx: 165, ry: 110, core: [0, -18, 50] },
    { name: 'Rock Crusher', color: '#ffc94a', w: 460, h: 380, rx: 170, ry: 115, core: [0, -12, 44] },
    { name: 'Ring Keeper', color: '#b59cff', w: 520, h: 320, rx: 125, ry: 120, core: [0, 0, 52] },
    { name: 'Mega Drone', color: '#7ee0c8', w: 520, h: 300, rx: 225, ry: 90, core: [0, -58, 38] }
  ];
  function hull(g, x, y, w, h, r, c) {
    g.fillStyle = metal(g, c, y, y + h); rr(g, x, y, w, h, r); g.fill(); g.strokeStyle = OL; g.lineWidth = 4; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x + 14, y + r + 6); g.quadraticCurveTo(x + 14, y + 14, x + r + 6, y + 12); g.stroke();
  }
  function hazard(g, x, y, w, h) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#2a2240'; g.fillRect(x, y, w, h); g.fillStyle = '#ffd34a';
    for (var k = x - h; k < x + w + h; k += h * 1.6) { g.beginPath(); g.moveTo(k, y + h); g.lineTo(k + h * 0.8, y); g.lineTo(k + h * 1.6, y); g.lineTo(k + h * 0.8, y + h); g.closePath(); g.fill(); }
    g.restore(); g.strokeStyle = OL; g.lineWidth = 2.5; g.strokeRect(x, y, w, h);
  }
  function coreHousing(g, x, y, r, c, bolts) {
    g.fillStyle = shade(c, -0.35); g.beginPath(); g.arc(x, y, r + 12, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3.5; g.stroke();
    g.fillStyle = '#3a3470'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    for (var i = 0; i < bolts; i++) { var a = i / bolts * TAU + 0.2; rivet(g, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), c); }
  }
  function vents(g, x, y, n, w, c) { g.strokeStyle = shade(c, -0.5); g.lineWidth = 4; for (var i = 0; i < n; i++) { g.beginPath(); g.moveTo(x, y + i * 11); g.lineTo(x + w, y + i * 11); g.stroke(); } }
  function lines(g, segs) { g.strokeStyle = 'rgba(15,20,50,.35)'; g.lineWidth = 2.4; g.beginPath(); segs.forEach(function (s) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); }); g.stroke(); }
  var BOSS_DRAW = [
    function (g) { // Moon Mech: a chunky lifter toy with ball hands
      var c = '#6fc8e8';
      for (var s = -1; s <= 1; s += 2) {
        g.strokeStyle = OL; g.lineWidth = 17; g.beginPath(); g.moveTo(s * 150, 10); g.quadraticCurveTo(s * 210, 30, s * 196, 90); g.stroke();
        g.strokeStyle = shade(c, -0.2); g.lineWidth = 10; g.stroke();
        g.fillStyle = shade(c, -0.25); g.strokeStyle = OL; g.lineWidth = 3.5; g.beginPath(); g.arc(s * 152, 8, 26, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#ffd36b'; g.lineWidth = 3.5; g.beginPath(); g.arc(s * 196, 100, 24, 0, TAU); g.fill(); g.stroke();
        g.strokeStyle = '#c98a2b'; g.lineWidth = 3; g.beginPath(); g.arc(s * 196, 100, 15, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(s * 190, 93, 6, 0, TAU); g.fill();
      }
      [-90, 0, 90].forEach(function (x) { g.fillStyle = '#4a5278'; g.strokeStyle = OL; g.lineWidth = 3; rr(g, x - 20, 92, 40, 26, 8); g.fill(); g.stroke(); });
      g.strokeStyle = OL; g.lineWidth = 5; g.beginPath(); g.moveTo(112, -100); g.lineTo(112, -136); g.stroke();
      hull(g, -160, -100, 320, 200, 48, c);
      hazard(g, -150, 56, 300, 20);
      lines(g, [[-80, -98, -80, 54], [92, -98, 92, 54], [92, -40, 158, -40]]);
      vents(g, -146, -72, 5, 46, c);
      for (var i = 0; i < 4; i++) { rivet(g, 104 + (i % 2) * 36, -84 + (i >> 1) * 26, c); }
      rivet(g, -146, 40, c); rivet(g, 146, 40, c);
      coreHousing(g, 0, -18, 50, c, 10);
    },
    function (g) { // Rock Crusher: a chunky yellow digger rig with scoops and cab lights (its bucket wheel is a separate picture)
      var c = '#ffc94a';
      for (var s = -1; s <= 1; s += 2) {
        g.strokeStyle = OL; g.lineWidth = 18; g.beginPath(); g.moveTo(s * 150, 10); g.lineTo(s * 200, 70); g.stroke();
        g.strokeStyle = '#8b93b0'; g.lineWidth = 11; g.stroke();
        g.fillStyle = '#8b93b0'; g.strokeStyle = OL; g.lineWidth = 3.5; g.beginPath(); g.moveTo(s * 176, 66); g.lineTo(s * 226, 60); g.lineTo(s * 222, 112); g.quadraticCurveTo(s * 196, 124, s * 172, 104); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(30,35,60,.5)'; g.lineWidth = 2; for (var k = 0; k < 3; k++) { g.beginPath(); g.moveTo(s * (182 + k * 12), 70); g.lineTo(s * (180 + k * 12), 110); g.stroke(); }
      }
      g.fillStyle = '#4a5278'; g.strokeStyle = OL; g.lineWidth = 3; rr(g, -40, -138, 150, 44, 14); g.fill(); g.stroke();
      hull(g, -165, -100, 330, 196, 40, c);
      hazard(g, -158, 60, 316, 26);
      lines(g, [[-165, -40, -70, -40], [70, -98, 70, 58], [-110, -40, -110, 58]]);
      vents(g, 92, -76, 4, 54, c);
      rivet(g, -148, -82, c); rivet(g, -148, 40, c); rivet(g, 148, 40, c);
      coreHousing(g, 0, -12, 44, c, 6);
    },
    function (g) { // Ring Keeper: a station core with gold bands (the ring and the candy iris are separate pictures)
      var c = '#b59cff';
      var bg = g.createRadialGradient(-40, -50, 20, 0, 0, 130); bg.addColorStop(0, shade(c, 0.55)); bg.addColorStop(0.6, c); bg.addColorStop(1, shade(c, -0.5));
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 4; g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.clip();
      g.strokeStyle = '#f6c453'; g.lineWidth = 9; g.beginPath(); g.ellipse(0, 78, 140, 24, 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(0, -84, 140, 22, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2;
      for (var i = 0; i < 7; i++) { star8(g, -96 + i * 32, 102, 8, 0.55); g.stroke(); }
      vents(g, 70, -50, 4, 34, c);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 106, 3.5, 4.6); g.stroke();
      coreHousing(g, 0, 0, 52, c, 12);
      g.strokeStyle = OL; g.lineWidth = 4; g.beginPath(); g.moveTo(-30, -120); g.lineTo(-38, -150); g.stroke();
    },
    function (g) { // Mega Drone: a wide mothership with a glass dome over its core (the wands are separate pictures)
      var c = '#7ee0c8';
      var dg = g.createLinearGradient(0, -128, 0, -4); dg.addColorStop(0, 'rgba(216,255,246,.95)'); dg.addColorStop(1, 'rgba(42,143,152,.95)');
      g.fillStyle = dg; g.beginPath(); g.ellipse(0, -8, 108, 104, 0, Math.PI, TAU); g.closePath(); g.fill(); g.strokeStyle = OL; g.lineWidth = 4; g.stroke();
      coreHousing(g, 0, -58, 38, c, 8);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-62, -66, 12, 26, -0.6, 0, TAU); g.fill();
      var hg = g.createLinearGradient(0, -20, 0, 70); hg.addColorStop(0, '#f2f6fd'); hg.addColorStop(0.45, '#a9b6d4'); hg.addColorStop(1, '#4e5980');
      g.fillStyle = hg; g.beginPath(); g.ellipse(0, 18, 236, 62, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 4.5; g.stroke();
      g.fillStyle = '#3b4470'; g.beginPath(); g.ellipse(0, 30, 200, 30, 0, 0, Math.PI); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 10, 200, 34, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      lines(g, [[-150, -4, -150, 40], [60, -10, 60, 48], [150, -4, 150, 40]]);
      g.fillStyle = '#f6c453'; [-196, 196].forEach(function (x) { star8(g, x, 18, 12, 0.55); g.fill(); });
      g.fillStyle = shade(c, -0.25); g.strokeStyle = OL; g.lineWidth = 3; [-40, 40].forEach(function (x) { rr(g, x - 16, 56, 32, 18, 7); g.fill(); g.stroke(); });
    }
  ];
  function drawCracks(id) {
    var B = A.BOSSES[id], R = rng(id * 101 + 7), list = [];
    for (var i = 0; i < 6; i++) {
      var a = R() * TAU, x = Math.cos(a) * B.rx * (0.45 + R() * 0.35), y = Math.sin(a) * B.ry * (0.4 + R() * 0.3), pts = [[x, y]];
      for (var k = 0; k < 4; k++) { x += (R() - 0.5) * 50; y += (R() - 0.5) * 36; pts.push([x, y]); }
      list.push(pts);
    }
    return function (g, level) {
      var seg = list.slice(0, level * 3);
      g.strokeStyle = 'rgba(20,8,10,.75)'; g.lineWidth = 4;
      seg.forEach(function (pts) { g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke(); });
      g.strokeStyle = 'rgba(255,170,90,.45)'; g.lineWidth = 1.6;
      seg.forEach(function (pts) { g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0] + 1, p[1] + 1) : g.moveTo(p[0] + 1, p[1] + 1); }); g.stroke(); });
    };
  }
  function drawDrill(g) { // the digger's bucket wheel
    for (var i = 0; i < 8; i++) {
      g.save(); g.rotate(i * TAU / 8); g.translate(0, -56);
      g.fillStyle = '#ff9f43'; g.strokeStyle = OL; g.lineWidth = 3; rr(g, -15, -12, 30, 22, 9); g.fill(); g.stroke();
      g.restore();
    }
    var wg = g.createRadialGradient(-12, -12, 6, 0, 0, 52); wg.addColorStop(0, '#f2f5fc'); wg.addColorStop(1, '#7d86a6');
    g.fillStyle = wg; g.beginPath(); g.arc(0, 0, 48, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3.5; g.stroke();
    g.strokeStyle = '#5d6890'; g.lineWidth = 6; for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(k * TAU / 4) * 44, Math.sin(k * TAU / 4) * 44); g.stroke(); }
    g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
  }
  function drawIris(g) { // candy balls around the Ring Keeper's core
    var cols = ['#ff8fc8', '#ffd36b', '#7dfcff', '#9dff9a', '#ffb347', '#c9a6ff'], r = 52;
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6; g.fillStyle = cols[i]; g.strokeStyle = OL; g.lineWidth = 2; g.beginPath(); g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.15, 0, TAU); g.fill(); g.stroke(); }
  }
  function drawWand(g) { // bubble wand: a little ring on a stalk (the scene tilts it toward the ranger); pivot at the base disc
    g.fillStyle = '#ff8fc8'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = OL; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 8); g.lineTo(0, 30); g.stroke();
    g.strokeStyle = '#fff0a0'; g.lineWidth = 4; g.stroke();
    g.strokeStyle = OL; g.lineWidth = 7; g.beginPath(); g.arc(0, 42, 13, 0, TAU); g.stroke();
    g.strokeStyle = '#fff0a0'; g.lineWidth = 4; g.stroke();
    g.fillStyle = 'rgba(255,190,240,.35)'; g.fill();
  }
  function drawDish(g) { g.fillStyle = '#e8ecf6'; g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, 26, 10, 0, 0, TAU); g.fill(); g.stroke(); }
  function drawKeeperRing(back) { // the Ring Keeper's ring, painted pre-tilted: far arc behind the machine, near arc in front
    return function (g) {
      g.rotate(-0.18);
      var from = back ? Math.PI : 0, to = back ? TAU : Math.PI;
      g.strokeStyle = OL; g.lineWidth = 26; g.beginPath(); g.ellipse(0, 0, 240, 58, 0, from, to); g.stroke();
      g.strokeStyle = back ? '#c79a3a' : '#f6c453'; g.lineWidth = 19; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, -4, 240, 58, 0, from, to); g.stroke();
    };
  }
  // paints the boss pictures (the body and its moving parts are baked; the crack overlays are cheap line drawings painted
  // when the boss wave starts)
  A.paintBoss = function (scene, id) {
    var B = A.BOSSES[id], key = 'boss' + id;
    var one = function (k, w, h, fn) { tex(scene, k, w * S, h * S, function (g) { g.scale(S, S); g.translate(w / 2, h / 2); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); }); };
    var lone = function (k, w, h, fn) { live(scene, k, w * S, h * S, function (g) { g.scale(S, S); g.translate(w / 2, h / 2); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); }); };
    one(key, B.w, B.h, BOSS_DRAW[id]);
    var cr = drawCracks(id);
    lone('bcrack' + id + '-1', B.w, B.h, function (g) { cr(g, 1); });
    lone('bcrack' + id + '-2', B.w, B.h, function (g) { cr(g, 2); });
    if (id === 1) one('bdrill', 120, 120, drawDrill);
    if (id === 2) { one('bring-back', 540, 140, drawKeeperRing(true)); one('bring-front', 540, 140, drawKeeperRing(false)); one('biris', 110, 110, drawIris); }
    if (id === 3) one('bwand', 60, 80, function (g) { g.translate(0, -20); drawWand(g); });
    if (id === 0) one('bdish', 60, 24, drawDish);
  };
  // tools/bake-art.js opens the page with ?bake: paint every world's and boss's fixed pictures so they are all baked
  A.bakeAll = function (scene) {
    for (var wi = 0; wi < 4; wi++) {
      var L = A.worldScenery(wi); L.mid.concat(L.fore).forEach(function (o) { A.scenery(scene, o.kind, o.size, wi); });
      [66, 34].forEach(function (r) { for (var v = 0; v < 3; v++) A.rock(scene, r, v, wi); });
      A.paintBoss(scene, wi);
    }
  };
  A.boss = function (id) { return A.BOSSES[id]; };

  // The baked pictures beyond the two sheets, per wave: only the wave's own world (scenery, asteroids) and, on a boss
  // wave, that machine's parts are loaded (Play does it with Kit.play.artNeed); the other worlds stay on disk. A world's
  // pictures leave the graphics chip when the next world starts (Play.dropArt). Names are those of tools/bake-art.js.
  var BOSS_ART = ['boss0|bdish', 'boss1|bdrill', 'boss2|biris|bring-', 'boss3|bwand'], ALL_ART = /^(sc-|rock-|boss\d|bdish|bdrill|biris|bring-|bwand)/;
  A.artFor = function (world, boss) { return new RegExp('^(sc|rock)-' + world + '-' + (boss ? '|^(' + BOSS_ART[world] + ')' : '')); };
  A.artLater = function (need) { return new RegExp('^(?!(?:' + need.source + '))(?:' + ALL_ART.source.slice(1) + ')'); };   // everything optional that this wave does not need
  A.isOptionalArt = function (key) { return ALL_ART.test(key) || /^bcrack/.test(key); };


  /* ==================== the number font ====================
     Floating words (+100, Nice!) and the score change on every hit; redrawing a Text object each time uploads a new
     canvas to the graphics chip (measured: 9 to 23 ms a hit at 6x CPU slowdown). So the glyphs are painted once, in the
     house font with a dark outline, into one canvas texture and registered as the engine's own bitmap font
     (cache.bitmapFont); BitmapText then shows any string with no upload. White glyphs: BitmapText.setTint colours them. */
  A.paintFont = function (scene) {
    if (scene.cache.bitmapFont.exists('wfont')) return;
    var FS = 52, CH = 80, PAD = 8, TW = 1024, chars = {}, x = 0, y = 0, list = [];
    var fam = '800 ' + FS + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    var m = document.createElement('canvas').getContext('2d'); m.font = fam;
    for (var code = 33; code <= 126; code++) { var w = Math.ceil(m.measureText(String.fromCharCode(code)).width); list.push([code, w]); }
    var cells = list.map(function (it) { var cw = it[1] + PAD * 2; if (x + cw > TW) { x = 0; y += CH; } var c = { code: it[0], adv: it[1], x: x, y: y, w: cw }; x += cw; return c; });
    var TH = 64; while (TH < y + CH) TH *= 2;
    live(scene, 'wfont', TW, TH, function (g) {
      g.font = fam; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.lineWidth = 9; g.strokeStyle = '#281040'; g.fillStyle = '#ffffff';
      cells.forEach(function (c) { var ch = String.fromCharCode(c.code); g.strokeText(ch, c.x + PAD, c.y + 52); g.fillText(ch, c.x + PAD, c.y + 52); });
    });
    // (u0..v1: what the engine's own bitmap-font parser writes, v flipped)
    cells.forEach(function (c) { chars[c.code] = { x: c.x, y: c.y, width: c.w, height: CH, centerX: c.w / 2, centerY: CH / 2, xOffset: -PAD, yOffset: 0, xAdvance: c.adv, data: {}, kerning: {}, u0: c.x / TW, v0: 1 - c.y / TH, u1: (c.x + c.w) / TW, v1: 1 - (c.y + CH) / TH }; });
    chars[32] = { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0, xOffset: 0, yOffset: 0, xAdvance: Math.round(FS * 0.3), data: {}, kerning: {}, u0: 0, v0: 1, u1: 0, v1: 1 };
    scene.cache.bitmapFont.add('wfont', { data: { font: 'wfont', size: FS, lineHeight: 66, retroFont: false, chars: chars }, texture: 'wfont', frame: null });
  };
})();
