/* Star Rangers: art.js
   All art is drawn in code (no image files): four painted space worlds with layered depth, the ranger ship,
   friendly robots, drones, asteroids, space junk, power-up orbs, collectible stars and four friendly bosses.
   Sprites are pre-rendered once per screen scale to offscreen canvases and reused every frame. */
(function () {
  'use strict';
  var A = window.StarArt = {};
  var TAU = Math.PI * 2;

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
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function star8(ctx, x, y, r, inner, rot) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8 - Math.PI / 2 + (rot || 0), q = i % 2 ? r * (inner || 0.62) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function glow(ctx, x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  // Runtime glow: a cached soft radial sprite per colour, stretched to size (much cheaper than a gradient per call).
  var gcache = {};
  function glowF(ctx, x, y, r, color, a) {
    if (a <= 0.01 || r <= 0) return;
    var c = gcache[color];
    if (!c) {
      c = gcache[color] = canvas(64, 64);
      var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.4, rgba(color, 0.5)); gr.addColorStop(1, rgba(color, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }
    var pa = ctx.globalAlpha; ctx.globalAlpha = pa * Math.min(1, a);
    ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = pa;
  }
  A.rr = rr; A.star8 = star8; A.shade = shade; A.mix = mix; A.rgba = rgba; A.rng = rng;

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

  // ---------- sprite cache (game units, rendered at the current screen scale) ----------
  var K = 1, cache = {};
  A.setScale = function (k) { if (Math.abs(k - K) > 1e-6) { K = k; cache = {}; } };
  function make(w, h, k, fn) {
    var c = canvas(w * k, h * k), g = c.getContext('2d');
    g.scale(k, k); g.translate(w / 2, h / 2); g.lineJoin = 'round'; g.lineCap = 'round';
    fn(g); c.w = w; c.h = h; return c;
  }
  function get(key, w, h, fn) { return cache[key] || (cache[key] = make(w, h, K, fn)); }
  function white(key, src) {
    var k2 = key + '#w';
    if (!cache[k2]) {
      var c = canvas(src.width, src.height), g = c.getContext('2d');
      g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      c.w = src.w; c.h = src.h; cache[k2] = c;
    }
    return cache[k2];
  }
  function blit(ctx, c, x, y, sx, sy) { sx = sx || 1; sy = sy || sx; ctx.drawImage(c, x - c.w * sx / 2, y - c.h * sy / 2, c.w * sx, c.h * sy); }
  // Draw a sprite, then a white "hit flash" silhouette over it.
  function blitFlash(ctx, key, c, x, y, flash, sx, sy) {
    blit(ctx, c, x, y, sx, sy);
    if (flash > 0.02) { ctx.globalAlpha *= Math.min(1, flash); blit(ctx, white(key, c), x, y, sx, sy); ctx.globalAlpha = 1; }
  }

  var OL = '#1b1838'; // outline ink

  // ---------- the ranger ship (about 130 x 150 units, nose up) ----------
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
    // fuselage
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
    // cockpit
    var cg = g.createLinearGradient(0, -44, 0, 2); cg.addColorStop(0, '#d2fcff'); cg.addColorStop(0.45, '#3cc3e0'); cg.addColorStop(1, '#0c4f78');
    g.fillStyle = cg; g.beginPath(); g.ellipse(0, -21, 13, 22, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-4.5, -30, 3.6, 8, -0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(5, -10, 2.2, 0, TAU); g.fill();
    // nozzles
    [-12, 12].forEach(function (x) {
      g.fillStyle = '#4a5278'; g.strokeStyle = OL; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, 54, 8.5, 5, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#12152c'; g.beginPath(); g.ellipse(x, 55, 5, 2.8, 0, 0, TAU); g.fill();
    });
    // rim light
    g.strokeStyle = 'rgba(190,245,255,.75)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(13, -52); g.bezierCurveTo(23, -30, 25, 0, 23, 30); g.stroke();
  }

  // Engine flame: a flickering teardrop, drawn additively.
  A.flame = function (ctx, x, y, len, w, t) {
    var f = 1 + Math.sin(t * 47) * 0.12 + Math.sin(t * 31 + 1) * 0.08, L = len * f;
    var c = get('flame', 24, 64, function (g) {
      g.translate(0, -32);
      var gr = g.createLinearGradient(0, 0, 0, 62);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.25, 'rgba(255,220,120,.9)'); gr.addColorStop(0.6, 'rgba(255,120,60,.6)'); gr.addColorStop(1, 'rgba(255,60,90,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(-9, 28, 0, 62); g.quadraticCurveTo(9, 28, 10, 0); g.closePath(); g.fill();
    });
    var pc = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(c, x - w * 1.2, y, w * 2.4, L * 64 / 62);
    glowF(ctx, x, y + 4, w * 2.4, '#ffb060', 0.35);
    ctx.globalCompositeOperation = pc;
  };

  // o: { bank (-1..1), t, flash, alpha, muzzle, shield, magnet, thrust, squash }
  A.ship = function (ctx, x, y, o) {
    var c = get('ship', 150, 160, drawShip), t = o.t;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.translate(x, y);
    var thrust = o.thrust || 0;
    A.flame(ctx, -12 + o.bank * 3, 58, 30 + thrust * 26, 7, t);
    A.flame(ctx, 12 + o.bank * 3, 58, 30 + thrust * 26, 7, t + 0.37);
    ctx.rotate(o.bank * 0.16);
    var sq = o.squash || 0, sx = (1 - Math.abs(o.bank) * 0.12) * (1 + sq * 0.12), sy = 1 - sq * 0.12;
    blitFlash(ctx, 'ship', c, 0, 0, o.flash || 0, sx, sy);
    if (o.muzzle > 0) {
      ctx.globalCompositeOperation = 'lighter';
      var m = o.muzzle;
      glowF(ctx, 0, -76, 34 * m, '#9ff4ff', 0.9);
      ctx.fillStyle = 'rgba(255,255,255,' + m + ')'; star8(ctx, 0, -76, 16 * m, 0.35, t * 9); ctx.fill();
      if (o.spread) { glowF(ctx, -58, 2, 22 * m, '#ffcf6b', 0.8); glowF(ctx, 58, 2, 22 * m, '#ffcf6b', 0.8); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    ctx.save();
    if (o.shield > 0) {
      var a = Math.min(1, o.shield * 2) * (o.shield < 2 ? 0.55 + 0.45 * Math.sin(t * 20) : 1), R = 96 + Math.sin(t * 5) * 3;
      ctx.globalAlpha = a;
      var sg = ctx.createRadialGradient(x, y, R * 0.55, x, y, R);
      sg.addColorStop(0, 'rgba(110,230,255,0)'); sg.addColorStop(0.8, 'rgba(110,230,255,.18)'); sg.addColorStop(1, 'rgba(180,250,255,.55)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,250,255,.85)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(200,250,255,.35)'; ctx.lineWidth = 2;
      star8(ctx, x, y, R * 0.92, 0.72, t * 0.6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(x - R * 0.45, y - R * 0.5, R * 0.18, R * 0.08, -0.7, 0, TAU); ctx.fill();
    }
    if (o.magnet > 0) {
      ctx.globalAlpha = Math.min(1, o.magnet * 2) * 0.8; ctx.strokeStyle = '#d59bff'; ctx.lineWidth = 4;
      for (var i = 0; i < 3; i++) { var r2 = 110 + ((t * 70 + i * 40) % 120); ctx.globalAlpha = Math.min(1, o.magnet * 2) * 0.6 * (1 - (r2 - 110) / 120);
        ctx.beginPath(); ctx.arc(x, y, r2, -2.6, -0.54); ctx.stroke(); }
    }
    ctx.restore();
  };

  // ---------- robots: machines, not characters (sensor bar, vents, rivets, cores; deliberately asymmetric) ----------
  var BOT = {
    bot: { c: '#3cc8b4', light: '#8ffcff', W: 88, H: 70 },
    tank: { c: '#ff9f43', light: '#fff07a', W: 100, H: 80 },
    zapper: { c: '#ff8fc8', light: '#fff0a0', W: 84, H: 74 }
  };
  function metal(g, c, y0, y1) { var hg = g.createLinearGradient(0, y0, 0, y1); hg.addColorStop(0, shade(c, 0.45)); hg.addColorStop(0.5, c); hg.addColorStop(1, shade(c, -0.4)); return hg; }
  function rivet(g, x, y, c) { g.fillStyle = shade(c, 0.6); g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 0.8, y + 0.8, 1.4, 0, TAU); g.fill(); }
  function drawBot(kind) {
    return function (g) {
      var B = BOT[kind], c = B.c, W = B.W, H = B.H;
      g.strokeStyle = OL; g.lineWidth = 2.6;
      // thruster nozzle
      g.fillStyle = '#4a4f72'; g.beginPath(); g.moveTo(-14, H / 2 - 4); g.lineTo(14, H / 2 - 4); g.lineTo(9, H / 2 + 11); g.lineTo(-9, H / 2 + 11); g.closePath(); g.fill(); g.stroke();
      if (kind === 'bot') {
        // swept fins
        for (var s = -1; s <= 1; s += 2) { g.fillStyle = shade(c, -0.25); rr(g, s > 0 ? W / 2 - 6 : -W / 2 - 10, 4, 16, 26, 8); g.fill(); g.stroke(); }
        g.lineWidth = 3; g.beginPath(); g.moveTo(-W * 0.28, -H / 2); g.lineTo(-W * 0.28, -H / 2 - 13); g.stroke();
        g.fillStyle = metal(g, c, -H / 2, H / 2); rr(g, -W / 2, -H / 2, W, H, 22); g.fill(); g.lineWidth = 3; g.stroke();
        // sensor bar (a single scanning light runs along it, drawn live)
        var sg = g.createLinearGradient(0, -H / 2 + 12, 0, -H / 2 + 26); sg.addColorStop(0, '#0b1030'); sg.addColorStop(1, '#222a55');
        g.fillStyle = sg; rr(g, -W / 2 + 10, -H / 2 + 12, W - 20, 13, 6.5); g.fill(); g.lineWidth = 2; g.stroke();
        // panel lines, vents (one side only), rivets
        g.strokeStyle = 'rgba(15,40,50,.45)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-W / 2 + 6, 6); g.lineTo(W / 2 - 6, 6); g.moveTo(-W * 0.18, 6); g.lineTo(-W * 0.18, H / 2 - 2); g.stroke();
        g.strokeStyle = shade(c, -0.5); g.lineWidth = 3;
        for (var v = 0; v < 3; v++) { g.beginPath(); g.moveTo(W * 0.08 + v * 9, 14); g.lineTo(W * 0.08 + v * 9 + 6, 28); g.stroke(); }
        rivet(g, -W / 2 + 9, H / 2 - 10, c); rivet(g, W / 2 - 9, H / 2 - 10, c); rivet(g, -W * 0.32, 18, c);
      } else if (kind === 'tank') {
        g.fillStyle = metal(g, c, -H / 2, H / 2); rr(g, -W / 2, -H / 2, W, H, 26); g.fill(); g.lineWidth = 3; g.stroke();
        // armour plates
        g.fillStyle = shade(c, -0.15); g.strokeStyle = OL; g.lineWidth = 2;
        rr(g, -W / 2 + 6, -H / 2 + 8, W * 0.3, H - 16, 6); g.fill(); g.stroke();
        rr(g, W / 2 - 6 - W * 0.3, -H / 2 + 8, W * 0.3, H - 16, 6); g.fill(); g.stroke();
        for (var i = 0; i < 3; i++) { rivet(g, -W / 2 + 13, -H / 2 + 18 + i * 20, c); rivet(g, W / 2 - 13, -H / 2 + 18 + i * 20, c); }
        // hazard band
        g.save(); rr(g, -W * 0.18, H / 2 - 16, W * 0.36, 11, 3); g.clip();
        g.fillStyle = '#2a2240'; g.fillRect(-W, -H, W * 2, H * 2); g.fillStyle = '#ffd34a';
        for (var x = -W * 0.3; x < W * 0.3; x += 12) { g.beginPath(); g.moveTo(x, H / 2 - 5); g.lineTo(x + 6, H / 2 - 16); g.lineTo(x + 12, H / 2 - 16); g.lineTo(x + 6, H / 2 - 5); g.closePath(); g.fill(); }
        g.restore();
        // battery chest light: three cells that light up in turn (drawn live)
        g.fillStyle = '#4a3f7a'; rr(g, -19, -22, 38, 32, 7); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.6; g.stroke();
        g.fillStyle = shade(c, 0.3); rr(g, -6, -27, 12, 6, 2); g.fill(); g.stroke();
      } else { // zapper: a spark pod with three coil prongs and a lens underneath
        [0].forEach(function (p) { // one spring with a ball on top
          g.strokeStyle = OL; g.lineWidth = 5.5; g.beginPath(); g.moveTo(p * 20, -H / 2 + 8);
          for (var k = 1; k <= 5; k++) g.lineTo(p * 20 + (k % 2 ? 7 : -7), -H / 2 + 8 - k * 4.4);
          g.stroke(); g.strokeStyle = '#e8ecf6'; g.lineWidth = 2.6; g.stroke();
          g.fillStyle = '#fff0a0'; g.beginPath(); g.arc(p * 20, -H / 2 - 20, 7.5, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.2; g.stroke();
          g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(p * 20 - 2.5, -H / 2 - 22.5, 2.4, 0, TAU); g.fill();
        });
        g.fillStyle = metal(g, c, -H / 2, H / 2); g.beginPath(); g.ellipse(0, 0, W / 2, H / 2, 0, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
        g.strokeStyle = 'rgba(120,20,70,.35)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, 0, W / 2 - 9, H / 2 - 9, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
        g.beginPath(); g.moveTo(-W * 0.3, -H * 0.18); g.lineTo(W * 0.38, -H * 0.18); g.stroke();
        // coil rings around the body
        g.strokeStyle = shade(c, 0.5); g.lineWidth = 3; g.beginPath(); g.ellipse(0, -H * 0.05, W / 2 + 2, 7, 0, 0.1, Math.PI - 0.1); g.stroke();
        rivet(g, W * 0.3, -H * 0.3, c); rivet(g, -W * 0.36, 2, c);
        g.fillStyle = '#7a3a7a'; g.beginPath(); g.arc(0, H / 2 - 6, 11, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 2.4; g.stroke();
      }
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-W / 2 + 6, -H / 2 + 22); g.quadraticCurveTo(-W / 2 + 6, -H / 2 + 6, -W / 2 + 22, -H / 2 + 5); g.stroke();
    };
  }
  A.bot = function (ctx, e, t) {
    var B = BOT[e.kind], key = 'bot-' + e.kind, c = get(key, B.W + 50, B.H + 56, drawBot(e.kind));
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0);
    var sq = e.squash || 0;
    A.flame(ctx, 0, B.H / 2 + 11, 16 + Math.sin(t * 8 + e.ph) * 3 + (e.boost || 0) * 22, 6, t + e.ph);
    blitFlash(ctx, key, c, 0, 0, e.flash, 1 + sq * 0.14, 1 - sq * 0.14);
    ctx.globalCompositeOperation = 'lighter';
    var warn = e.warn || 0, hot = warn > 0 ? '#ff8a5c' : B.light;
    if (e.kind === 'bot') { // one light scanning along the sensor bar
      var sx = Math.sin(t * (3 + warn * 8) + e.ph) * (B.W / 2 - 18), sy = -B.H / 2 + 18.5;
      glowF(ctx, sx, sy, 16, hot, 0.6);
      ctx.fillStyle = hot; rr(ctx, sx - 9, sy - 3.5, 18, 7, 3.5); ctx.fill();
      glowF(ctx, -B.W * 0.28, -B.H / 2 - 16, 13, e.carrier ? '#fff2a0' : '#ff7a8a', 0.3 + 0.5 * (Math.sin(t * 5 + e.ph) > 0 ? 1 : 0));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = e.carrier ? '#ffe680' : '#ff7a8a'; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-B.W * 0.28, -B.H / 2 - 16, 6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
    } else if (e.kind === 'tank') {
      var lit = e.hp >= e.maxHp ? 3 : e.hp, step = ((t * 3 + e.ph) | 0) % 4;
      for (var cell = 0; cell < 3; cell++) {
        var on = cell < lit && (warn > 0 || cell !== step);
        ctx.fillStyle = on ? hot : 'rgba(255,255,255,.12)'; rr(ctx, -15 + cell * 10.5, -18, 8.5, 24, 3); ctx.fill();
      }
      glowF(ctx, 0, -6, 28, hot, 0.25 + warn * 0.4);
      if (e.carrier) glowF(ctx, 0, -6, 36, '#fff2a0', 0.5);
    } else {
      glowF(ctx, 0, -B.H / 2 - 20, 15, '#fff0a0', Math.sin(t * 6 + e.ph) > 0 ? 0.85 : 0.2);
      if (e.charge > 0) {
        glowF(ctx, 0, B.H / 2 - 6, 16 + e.charge * 32, '#ff6fc4', 0.5 + e.charge * 0.5);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, B.H / 2 - 6, 4 + e.charge * 6, 0, TAU); ctx.fill();
      } else glowF(ctx, 0, B.H / 2 - 6, 12, '#ff7ad9', 0.35);
      if (e.carrier) glowF(ctx, 0, 0, 30, '#fff2a0', 0.35);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (e.kind === 'tank' && e.hp < e.maxHp) { // cracks in the plates show damage
      ctx.strokeStyle = 'rgba(40,10,0,.65)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(B.W * 0.3, -B.H * 0.3); ctx.lineTo(B.W * 0.36, -B.H * 0.12); ctx.lineTo(B.W * 0.29, B.H * 0.04); ctx.stroke();
      if (e.hp < e.maxHp - 1) { ctx.beginPath(); ctx.moveTo(-B.W * 0.36, B.H * 0.05); ctx.lineTo(-B.W * 0.28, B.H * 0.18); ctx.lineTo(-B.W * 0.37, B.H * 0.3); ctx.stroke(); }
    }
    ctx.restore();
  };

  // ---------- drones (rotor discs) ----------
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
  A.drone = function (ctx, e, t) {
    var c = get('drone', 120, 90, drawDrone);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0);
    ctx.globalCompositeOperation = 'lighter';
    var gl = ctx.createLinearGradient(0, 18, 0, 66); gl.addColorStop(0, 'rgba(120,255,230,.4)'); gl.addColorStop(1, 'rgba(120,255,230,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(-14, 18); ctx.lineTo(14, 18); ctx.lineTo(26, 64); ctx.lineTo(-26, 64); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    blitFlash(ctx, 'drone', c, 0, 0, e.flash);
    // spinning rotor on its mast
    var a = t * 26 + e.ph, cs = Math.cos(a);
    ctx.fillStyle = 'rgba(220,235,255,.22)'; ctx.beginPath(); ctx.ellipse(0, -24, 44, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = OL; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-44 * cs, -24); ctx.lineTo(44 * cs, -24); ctx.stroke();
    ctx.strokeStyle = '#dfe6f5'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glowF(ctx, 0, 0, 16, '#7dfcff', 0.55 + 0.3 * Math.sin(t * 9 + e.ph));
    for (var i = 0; i < 6; i++) { var on = ((t * 7 + i + e.ph) | 0) % 6 === i, ang = Math.PI * (0.08 + i * 0.168);
      glowF(ctx, Math.cos(ang) * -44, 6 + Math.sin(ang) * 10, 8, i % 2 ? '#ff7ad9' : '#ffe27a', on ? 0.95 : 0.2); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  };

  // ---------- asteroids (many small scattered craters, no rim arcs) ----------
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
      // speckled surface and lots of small pits, scattered so no pattern stands out
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
      // rim light along the lit outer edge only
      g.save(); path(); g.clip();
      g.strokeStyle = far ? 'rgba(255,200,170,.25)' : 'rgba(255,245,225,.5)'; g.lineWidth = far ? r * 0.06 : 4;
      g.translate(r * 0.06, r * 0.06); path(); g.stroke();
      g.restore();
    };
  }
  A.rock = function (ctx, e, wi) {
    var tint = A.WORLDS[wi].rock, key = 'rock-' + e.r + '-' + e.v + '-' + wi, c = get(key, e.r * 2 + 16, e.r * 2 + 16, drawRock(e.r, 77 + e.v * 13 + e.r, tint));
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0);
    blitFlash(ctx, key, c, 0, 0, e.flash);
    ctx.restore();
  };

  // ---------- space junk ----------
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
  var JUNK = { can: [56, 92, drawCan], gear: [80, 80, drawGear], sat: [176, 80, drawSat] };
  A.junk = function (ctx, e) {
    var J = JUNK[e.kind], key = 'junk-' + e.kind, c = get(key, J[0], J[1], J[2]);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0);
    blitFlash(ctx, key, c, 0, 0, e.flash);
    if (e.kind === 'sat') { ctx.globalCompositeOperation = 'lighter'; glowF(ctx, 0, -38, 10, '#ff6b6b', 0.4 + 0.4 * Math.sin(e.ph * 6)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  };

  // ---------- shots ----------
  A.bullet = function (ctx, b) {
    var c = get('bullet' + (b.gold ? 'g' : ''), 30, 74, function (g) {
      var col = b.gold ? '#ffd36b' : '#7ff6ff';
      var gl = g.createRadialGradient(0, 0, 2, 0, 0, 34); gl.addColorStop(0, rgba(col, 0.6)); gl.addColorStop(1, rgba(col, 0));
      g.fillStyle = gl; g.beginPath(); g.ellipse(0, 0, 14, 36, 0, 0, TAU); g.fill();
      g.fillStyle = col; rr(g, -6, -24, 12, 48, 6); g.fill();
      g.fillStyle = '#ffffff'; rr(g, -3, -20, 6, 36, 3); g.fill();
    });
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vx, -b.vy));
    ctx.globalCompositeOperation = 'lighter'; blit(ctx, c, 0, 0); ctx.restore();
  };
  A.orb = function (ctx, s, t) {
    var c = get('orb', 70, 70, function (g) {
      var gl = g.createRadialGradient(0, 0, 4, 0, 0, 34); gl.addColorStop(0, 'rgba(255,120,200,.9)'); gl.addColorStop(0.5, 'rgba(255,80,170,.4)'); gl.addColorStop(1, 'rgba(255,80,170,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill();
      g.fillStyle = '#ff6fc4'; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-3, -3, 7, 0, TAU); g.fill();
    });
    var p = 1 + Math.sin(t * 14 + s.ph) * 0.12;
    blit(ctx, c, s.x, s.y, p * (s.r / 16));
  };

  // ---------- pickups ----------
  var PU = { spread: { c: '#ffb347', label: 'Triple Shot!' }, shield: { c: '#5ee7ff', label: 'Shield!' },
             magnet: { c: '#c98bff', label: 'Star Magnet!' }, heart: { c: '#ff5d73', label: '+1 Heart' } };
  A.PU = PU;
  function drawIcon(g, type) {
    g.lineWidth = 3; g.strokeStyle = OL;
    if (type === 'spread') { // three bolts fanning out
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
  A.pickup = function (ctx, p, t) {
    if (p.type === 'star') { A.starItem(ctx, p.x, p.y, t + p.ph); return; }
    var P = PU[p.type], c = get('pu-' + p.type, 100, 100, function (g) {
      var gl = g.createRadialGradient(0, 0, 10, 0, 0, 48); gl.addColorStop(0, rgba(P.c, 0.55)); gl.addColorStop(1, rgba(P.c, 0));
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 48, 0, TAU); g.fill();
      var bg = g.createRadialGradient(-10, -12, 4, 0, 0, 32); bg.addColorStop(0, shade(P.c, 0.55)); bg.addColorStop(0.6, P.c); bg.addColorStop(1, shade(P.c, -0.45));
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); g.strokeStyle = OL; g.lineWidth = 3; g.stroke();
      drawIcon(g, p.type);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-12, -17, 8, 4.5, -0.6, 0, TAU); g.fill();
    });
    var bob = Math.sin(t * 4 + p.ph) * 5, sc = 1 + Math.sin(t * 6 + p.ph) * 0.05;
    ctx.save(); ctx.translate(p.x, p.y + bob);
    ctx.strokeStyle = rgba(P.c, 0.85); ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    blit(ctx, c, 0, 0, sc);
    ctx.restore();
  };
  A.starItem = function (ctx, x, y, t) {
    var c = get('star', 56, 56, function (g) {
      var gl = g.createRadialGradient(0, 0, 4, 0, 0, 27); gl.addColorStop(0, 'rgba(255,220,120,.6)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 27, 0, TAU); g.fill();
      var sg = g.createLinearGradient(0, -18, 0, 18); sg.addColorStop(0, '#fff3b8'); sg.addColorStop(0.5, '#f6c453'); sg.addColorStop(1, '#d98a1f');
      g.fillStyle = sg; star8(g, 0, 0, 18, 0.6); g.fill(); g.strokeStyle = '#7a4a12'; g.lineWidth = 2.2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; star8(g, -2, -3, 6, 0.5); g.fill();
    });
    blit(ctx, c, x, y, Math.max(0.15, Math.abs(Math.cos(t * 3))), 1);
  };

  // ---------- boss machines (no faces: each has one glowing core, its weak point) ----------
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
    function (g) { // Rock Crusher: a chunky yellow digger rig with scoops, cab lights and a bucket wheel (spins live)
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
    function (g) { // Ring Keeper: a station core with gold bands (ring and iris drawn live)
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
    function (g) { // Mega Drone: a wide mothership with a glass dome over its core (turrets drawn live)
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
  A.bossSprite = function (id) { var B = A.BOSSES[id]; return get('boss' + id, B.w, B.h, BOSS_DRAW[id]); };
  var CRACKS = [];
  function cracks(ctx, id, level) {
    if (!CRACKS[id]) {
      var B = A.BOSSES[id], R = rng(id * 101 + 7), list = [];
      for (var i = 0; i < 6; i++) {
        var a = R() * TAU, x = Math.cos(a) * B.rx * (0.45 + R() * 0.35), y = Math.sin(a) * B.ry * (0.4 + R() * 0.3), pts = [[x, y]];
        for (var k = 0; k < 4; k++) { x += (R() - 0.5) * 50; y += (R() - 0.5) * 36; pts.push([x, y]); }
        list.push(pts);
      }
      CRACKS[id] = list;
    }
    ctx.strokeStyle = 'rgba(20,8,10,.75)'; ctx.lineWidth = 4;
    CRACKS[id].slice(0, level * 3).forEach(function (pts) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,170,90,.45)'; ctx.lineWidth = 1.6;
    CRACKS[id].slice(0, level * 3).forEach(function (pts) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0] + 1, p[1] + 1) : ctx.moveTo(p[0] + 1, p[1] + 1); }); ctx.stroke(); });
  }

  // b: { id, x, y, t, flash, tilt, thrust, charge, coreC, damage (0-2), aim (turret angle), split (0.. when breaking apart) }
  A.boss = function (ctx, b) {
    var B = A.BOSSES[b.id], c = A.bossSprite(b.id), t = b.t, co = B.core, cc = b.coreC || '#7dfcff';
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tilt || 0);
    if (b.split > 0) { // breaking apart: two halves drift away from each other
      var sp = b.split;
      [-1, 1].forEach(function (s) {
        ctx.save(); ctx.translate(s * sp * 140, sp * sp * 60); ctx.rotate(s * sp * 0.5);
        ctx.beginPath(); ctx.rect(s < 0 ? -B.w : 0, -B.h, B.w, B.h * 2); ctx.clip();
        blit(ctx, c, 0, 0); cracks(ctx, b.id, 2);
        ctx.restore();
      });
      ctx.restore(); return;
    }
    if (b.id === 0) [-90, 0, 90].forEach(function (x, i) { A.flame(ctx, x, 118, 34 + (b.thrust || 0) * 30, 13, t + i); });
    if (b.id === 1) { A.flame(ctx, -110, 100, 26 + (b.thrust || 0) * 26, 10, t); A.flame(ctx, 110, 100, 26 + (b.thrust || 0) * 26, 10, t + 0.5); drill(ctx, t * (1 + (b.thrust || 0) * 3)); }
    if (b.id === 3) [-120, 120].forEach(function (x, i) { A.flame(ctx, x, 70, 24 + (b.thrust || 0) * 24, 10, t + i * 0.3); });
    if (b.id === 2) ring(ctx, t, true);
    blitFlash(ctx, 'boss' + b.id, c, 0, 0, b.flash);
    if (b.damage) cracks(ctx, b.id, b.damage);
    // the glowing core (weak point)
    ctx.globalCompositeOperation = 'lighter';
    var pulse = 0.65 + 0.35 * Math.sin(t * (b.damage > 1 ? 14 : 5));
    glowF(ctx, co[0], co[1], co[2] * 1.9, cc, 0.45 * pulse + (b.charge || 0) * 0.5);
    glowF(ctx, co[0], co[1], co[2] * 0.9, cc, 0.9);
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7 + 0.3 * pulse; ctx.beginPath(); ctx.arc(co[0], co[1], co[2] * (0.28 + (b.charge || 0) * 0.25), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (b.id === 2) iris(ctx, co[0], co[1], co[2], t);
    if (b.id === 0) { // turning radar dish
      var dw = Math.cos(t * 2.4);
      ctx.fillStyle = '#e8ecf6'; ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(112, -142, Math.max(3, Math.abs(dw) * 26), 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    if (b.id === 3) [-120, 120].forEach(function (x) { turret(ctx, x, 64, b.aim == null ? Math.PI / 2 : b.aim); });
    ctx.globalCompositeOperation = 'lighter';
    if (b.id === 0) glowF(ctx, 112, -132, 12, '#ff7a8a', Math.sin(t * 5) > 0 ? 0.9 : 0.2);
    if (b.id === 1) for (var i = 0; i < 4; i++) glowF(ctx, -15 + i * 30, -116, 10, '#ffe27a', ((t * 4 | 0) % 4 === i) ? 0.9 : 0.25);
    if (b.id === 2) glowF(ctx, -38, -152, 14, '#ffe27a', 0.6 + 0.3 * Math.sin(t * 6));
    if (b.id === 3) for (var j = 0; j < 9; j++) { var on = ((t * 8 + j) | 0) % 3 === 0; glowF(ctx, -200 + j * 50, 22 + Math.abs(j - 4) * -3, 12, j % 2 ? '#ff7ad9' : '#ffe27a', on ? 0.9 : 0.25); }
    ctx.globalCompositeOperation = 'source-over';
    if (b.id === 2) ring(ctx, t, false);
    ctx.restore();
  };
  function drill(ctx, t) { // the digger's bucket wheel, turning
    ctx.save(); ctx.translate(0, 112); ctx.rotate(t * 1.6);
    for (var i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i * TAU / 8); ctx.translate(0, -56);
      ctx.fillStyle = '#ff9f43'; ctx.strokeStyle = OL; ctx.lineWidth = 3; rr(ctx, -15, -12, 30, 22, 9); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    var wg = ctx.createRadialGradient(-12, -12, 6, 0, 0, 52); wg.addColorStop(0, '#f2f5fc'); wg.addColorStop(1, '#7d86a6');
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = '#5d6890'; ctx.lineWidth = 6; for (var k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(k * TAU / 4) * 44, Math.sin(k * TAU / 4) * 44); ctx.stroke(); }
    ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  function iris(ctx, x, y, r, t) { // candy balls spinning around the Ring Keeper's core
    var cols = ['#ff8fc8', '#ffd36b', '#7dfcff', '#9dff9a', '#ffb347', '#c9a6ff'];
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.2);
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6; ctx.fillStyle = cols[i]; ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.15, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  function turret(ctx, x, y, a) { // bubble wand: a little ring on a stalk that tilts toward the ranger
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#ff8fc8'; ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.rotate(a - Math.PI / 2);
    ctx.strokeStyle = OL; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, 30); ctx.stroke();
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = OL; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 42, 13, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,190,240,.35)'; ctx.fill();
    ctx.restore();
  }
  function ring(ctx, t, back) { // the Ring Keeper's ring with lights running around it
    ctx.save(); ctx.rotate(-0.18);
    var from = back ? Math.PI : 0, to = back ? TAU : Math.PI;
    ctx.strokeStyle = OL; ctx.lineWidth = 26; ctx.beginPath(); ctx.ellipse(0, 0, 240, 58, 0, from, to); ctx.stroke();
    ctx.strokeStyle = back ? '#c79a3a' : '#f6c453'; ctx.lineWidth = 19; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -4, 240, 58, 0, from, to); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * TAU + t * 1.4, sa = ((a % TAU) + TAU) % TAU;
      if (back ? sa < Math.PI : sa >= Math.PI) continue;
      glowF(ctx, Math.cos(sa) * 240, Math.sin(sa) * 58, 13, i % 2 ? '#ff7ad9' : '#7dfcff', back ? 0.45 : 0.9);
    }
    ctx.restore();
  }


  // ---------- painted backgrounds (device px, with a margin for parallax) ----------
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
    // night side
    var sx = x - Math.cos(lightDir) * r * 0.9, sy = y - Math.sin(lightDir) * r * 0.9;
    var sh = g.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 1.5);
    sh.addColorStop(0, 'rgba(4,4,20,.82)'); sh.addColorStop(0.55, 'rgba(4,4,20,.35)'); sh.addColorStop(1, 'rgba(4,4,20,0)');
    g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    g.strokeStyle = rgba('#ffffff', 0.45); g.lineWidth = Math.max(1.5, r * 0.025);
    g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, lightDir - 1.1, lightDir + 1.1); g.stroke();
  }

  A.paintBg = function (wi, w, h, dpr) {
    var W = A.WORLDS[wi], m = Math.round(36 * dpr), cw = Math.round(w * dpr) + m * 2, ch = Math.round(h * dpr) + m * 2;
    var c = canvas(cw, ch), g = c.getContext('2d'), R = rng(500 + wi * 91), S = dpr, D = Math.sqrt(cw * ch);
    var gr = g.createLinearGradient(0, 0, cw * 0.3, ch);
    W.sky.forEach(function (col, i) { gr.addColorStop(i / (W.sky.length - 1), col); });
    g.fillStyle = gr; g.fillRect(0, 0, cw, ch);

    // nebula clouds along a diagonal band
    g.globalCompositeOperation = 'lighter';
    var nClouds = wi === 3 ? 34 : 18;
    for (var i = 0; i < nClouds; i++) {
      var u = R(), bx = cw * (u * 1.2 - 0.1), by = ch * (0.85 - u * 0.7) + (R() - 0.5) * ch * 0.35, r = D * (0.12 + R() * 0.22);
      var col = W.neb[(R() * W.neb.length) | 0], a = (wi === 3 ? 0.11 : 0.06) + R() * 0.07;
      var ng = g.createRadialGradient(bx, by, 0, bx, by, r); ng.addColorStop(0, rgba(col, a)); ng.addColorStop(0.6, rgba(col, a * 0.4)); ng.addColorStop(1, rgba(col, 0));
      g.fillStyle = ng; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    if (wi === 3) { // dark dust lanes give the nebula shape
      for (var d = 0; d < 9; d++) { var dx = cw * R(), dy = ch * R(), dr = D * (0.06 + R() * 0.1);
        var dg = g.createRadialGradient(dx, dy, 0, dx, dy, dr); dg.addColorStop(0, 'rgba(8,2,24,.45)'); dg.addColorStop(1, 'rgba(8,2,24,0)');
        g.fillStyle = dg; g.beginPath(); g.ellipse(dx, dy, dr * 1.8, dr * 0.7, -0.6, 0, TAU); g.fill(); }
    }
    // milky band of tiny stars + scattered still stars
    for (var s = 0; s < 900; s++) {
      var t2 = R(), sx = cw * (t2 * 1.2 - 0.1) + (R() - 0.5) * D * 0.25 * (R() + R() - 1), sy = ch * (0.85 - t2 * 0.7) + (R() - 0.5) * D * 0.18;
      g.globalAlpha = 0.15 + R() * 0.45; g.fillStyle = R() < 0.2 ? W.dust : '#ffffff';
      g.fillRect(sx, sy, S * (R() < 0.1 ? 1.6 : 0.9), S * (R() < 0.1 ? 1.6 : 0.9));
    }
    for (var s2 = 0; s2 < 160; s2++) { g.globalAlpha = 0.25 + R() * 0.6; g.fillStyle = '#fff'; g.beginPath(); g.arc(R() * cw, R() * ch, (0.4 + R() * 0.9) * S, 0, TAU); g.fill(); }
    g.globalAlpha = 1;

    var big = Math.max(cw, ch), small = Math.min(cw, ch);
    if (wi === 0) { // big moon low on one side, a blue planet far away, a crescent glint
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
    } else if (wi === 1) { // warm sun, a belt of rocks streaming across
      var sx2 = cw * 0.12, sy2 = ch * 0.1;
      g.globalCompositeOperation = 'lighter';
      glow(g, sx2, sy2, small * 0.6, '#ffb060', 0.35); glow(g, sx2, sy2, small * 0.18, '#fff0c0', 0.9);
      g.strokeStyle = 'rgba(255,220,160,.25)'; g.lineWidth = 2 * S;
      for (var f = 0; f < 4; f++) { var fa = f * Math.PI / 4 + 0.2; g.beginPath(); g.moveTo(sx2 - Math.cos(fa) * small * 0.3, sy2 - Math.sin(fa) * small * 0.3); g.lineTo(sx2 + Math.cos(fa) * small * 0.3, sy2 + Math.sin(fa) * small * 0.3); g.stroke(); }
      g.globalCompositeOperation = 'source-over';
      for (var b2 = 0; b2 < 420; b2++) {
        var u2 = R(), bx2 = cw * (1.1 - u2 * 1.2), by2 = ch * (0.15 + u2 * 0.75) + (R() + R() - 1) * small * 0.18, br = (0.6 + Math.pow(R(), 3) * 7) * S;
        g.fillStyle = rgba(mix('#3a2230', '#c99a7a', R() * 0.6), 0.5 + R() * 0.5); g.beginPath(); g.ellipse(bx2, by2, br * 1.2, br, R() * 3, 0, TAU); g.fill();
        if (br > 3 * S) { g.fillStyle = 'rgba(255,210,160,.4)'; g.beginPath(); g.arc(bx2 - br * 0.3, by2 - br * 0.3, br * 0.4, 0, TAU); g.fill(); }
      }
    } else if (wi === 2) { // the great ringed planet
      var px = cw * 0.8, py = ch * 0.24, pr = big * 0.19;
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
    } else { // a little spiral galaxy and bright twinkles
      var gx = cw * 0.78, gy = ch * 0.2, gs = small * 0.16;
      g.save(); g.translate(gx, gy); g.scale(1, 0.45); g.rotate(0.4);
      g.globalCompositeOperation = 'lighter';
      glow(g, 0, 0, gs * 0.5, '#fff0d0', 0.8);
      for (var p = 0; p < 500; p++) { var arm = p % 2, rr2 = Math.pow(R(), 0.7) * gs, ang = rr2 / gs * 5 + arm * Math.PI + (R() - 0.5) * 0.6;
        g.fillStyle = rgba(R() < 0.5 ? '#c7b8ff' : '#ffd2f4', 0.5); g.fillRect(Math.cos(ang) * rr2, Math.sin(ang) * rr2, 1.6 * S, 1.6 * S); }
      g.restore(); g.globalCompositeOperation = 'source-over';
    }
    // bright stars with soft cross flares
    g.globalCompositeOperation = 'lighter';
    for (var q2 = 0; q2 < (wi === 3 ? 16 : 9); q2++) {
      var qx = R() * cw, qy = R() * ch, qs = (3 + R() * 6) * S, qc = R() < 0.5 ? '#ffffff' : W.dust;
      glow(g, qx, qy, qs * 3, qc, 0.5);
      g.strokeStyle = rgba(qc, 0.55); g.lineWidth = 1.1 * S;
      g.beginPath(); g.moveTo(qx - qs * 3, qy); g.lineTo(qx + qs * 3, qy); g.moveTo(qx, qy - qs * 3); g.lineTo(qx, qy + qs * 3); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    // vignette for depth
    var vg = g.createRadialGradient(cw / 2, ch / 2, small * 0.35, cw / 2, ch / 2, big * 0.75);
    vg.addColorStop(0, 'rgba(0,0,8,0)'); vg.addColorStop(1, 'rgba(0,0,8,.5)');
    g.fillStyle = vg; g.fillRect(0, 0, cw, ch);
    return { c: c, m: m };
  };
  function ringBand(g, x, y, r, back) {
    g.save(); g.translate(x, y); g.rotate(-0.3);
    var from = back ? Math.PI : 0, to = back ? TAU : Math.PI;
    var rings = [[1.45, 0.06, '#f3d9b0', 0.55], [1.6, 0.05, '#c79a6a', 0.5], [1.78, 0.09, '#f0d2a4', 0.6], [1.98, 0.04, '#a87a5a', 0.4], [2.1, 0.03, '#f7e4c4', 0.4]];
    rings.forEach(function (q) { g.strokeStyle = rgba(q[2], back ? q[3] * 0.7 : q[3]); g.lineWidth = r * q[1]; g.beginPath(); g.ellipse(0, 0, r * q[0], r * q[0] * 0.24, 0, from, to); g.stroke(); });
    g.restore();
  }

  // ---------- drifting scenery (CSS px sprites, drawn at device scale) ----------
  var pcache = {};
  A.scenery = function (kind, size, dpr, wi) {
    var key = kind + size + '|' + dpr + '|' + wi;
    if (pcache[key]) return pcache[key];
    var pad = size * 0.4, w = size + pad * 2, c = canvas(w * dpr, w * dpr), g = c.getContext('2d'), W = A.WORLDS[wi];
    g.scale(dpr, dpr); g.translate(w / 2, w / 2);
    var r = size / 2, R = rng(size * 7 + wi);
    if (kind === 'moonlet') planetBall(g, 0, 0, r, R() < 0.5 ? '#9b9cb8' : '#c2a98f', -0.8, { halo: 1.2, detail: function (q) {
      for (var k = 0; k < 7; k++) { var cx = (R() - 0.5) * r * 1.4, cy = (R() - 0.5) * r * 1.4, cr = r * (0.08 + R() * 0.15); q.fillStyle = 'rgba(40,40,70,.35)'; q.beginPath(); q.arc(cx, cy, cr, 0, TAU); q.fill(); } } });
    else if (kind === 'icemoon') planetBall(g, 0, 0, r, '#a8d4f0', -0.8, { atmo: '#d8f0ff', halo: 1.3 });
    else if (kind === 'gasball') planetBall(g, 0, 0, r, ['#ff9fd0', '#8f7dff', '#5fe0d0'][(R() * 3) | 0], -0.8, { halo: 1.35, detail: function (q) {
      q.fillStyle = 'rgba(255,255,255,.18)'; for (var k = -3; k < 3; k++) q.fillRect(-r, k * r * 0.3, r * 2, r * 0.12); } });
    else if (kind === 'rock') { var dr = drawRock(r, 31 + size, mix(W.rock, W.haze, 0.72), 'far'); g.globalAlpha = 0.75; dr(g); g.globalAlpha = 1; }
    else if (kind === 'darkrock') { var dr2 = drawRock(r, 57 + size, mix(W.rock, '#0a0612', 0.82), 'near'); dr2(g); }
    else if (kind === 'station') { // a distant orbital station with lit arched windows
      g.rotate(-0.35); g.globalAlpha = 0.85;
      g.strokeStyle = rgba('#c9d4f0', 0.8); g.lineWidth = r * 0.12; g.beginPath(); g.ellipse(0, 0, r, r * 0.34, 0, 0, TAU); g.stroke();
      var hb = g.createLinearGradient(0, -r * 0.3, 0, r * 0.3); hb.addColorStop(0, '#c3cbe6'); hb.addColorStop(1, '#5b6690'); g.fillStyle = hb; g.beginPath(); g.ellipse(0, 0, r * 0.38, r * 0.3, 0, 0, TAU); g.fill();
      g.fillStyle = '#6f7aa0'; rr(g, -r * 0.08, -r * 0.75, r * 0.16, r * 1.5, r * 0.06); g.fill();
      g.fillStyle = '#ffd98a';
      for (var k = -2; k <= 2; k++) { var wx = k * r * 0.13, wy = -r * 0.02, ww = r * 0.05; g.beginPath(); g.rect(wx - ww, wy, ww * 2, ww * 2.2); g.arc(wx, wy, ww, Math.PI, 0); g.fill(); }
      g.fillStyle = '#f6c453'; star8(g, 0, -r * 0.82, r * 0.12, 0.55); g.fill();
      g.fillStyle = 'rgba(90,162,255,.85)'; g.fillRect(-r * 1.25, -r * 0.08, r * 0.3, r * 0.16); g.fillRect(r * 0.95, -r * 0.08, r * 0.3, r * 0.16);
    }
    c.size = w; pcache[key] = c;
    return c;
  };
  A.clearScenery = function () { pcache = {}; };
})();
