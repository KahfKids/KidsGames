/* Kahf KidsGames kit: fx.js
   Juice for every game: easing, tweens, pooled particles, floating text and screen shake.
   Everything runs in game units on the game's own canvas transform. Respects reduced motion. */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};

  var E = Kit.ease = {
    linear: function (t) { return t; },
    outQuad: function (t) { return t * (2 - t); },
    inQuad: function (t) { return t * t; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outBack: function (t) { var c = 1.70158, d = t - 1; return 1 + (c + 1) * d * d * d + c * d * d; },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    }
  };

  // ---------- tweens ----------
  // Kit.tween(obj, {prop: target}, seconds, ease, onDone) — advanced by Kit.fx.update(dt).
  var tweens = [];
  Kit.tween = function (obj, to, dur, ease, done) {
    var from = {};
    for (var k in to) from[k] = obj[k];
    var tw = { obj: obj, from: from, to: to, t: 0, dur: Math.max(0.0001, dur), ease: ease || E.outCubic, done: done };
    tweens.push(tw);
    return tw;
  };

  // ---------- particles ----------
  var parts = [], texts = [], MAX = 420;
  var shake = { t: 0, mag: 0, x: 0, y: 0 };
  var reduce = !!Kit.reducedMotion;

  // Kit.fx.burst(x, y, { n, color(s), speed, size, life, gravity, shape: 'shard'|'dot'|'star'|'spark', spread, angle })
  function burst(x, y, o) {
    o = o || {};
    var n = reduce ? Math.ceil((o.n || 12) / 3) : (o.n || 12);
    var colors = o.colors || [o.color || '#fff'];
    for (var i = 0; i < n; i++) {
      if (parts.length >= MAX) parts.shift();
      var a = (o.angle != null ? o.angle : 0) + (o.spread != null ? (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2);
      var sp = (o.speed || 300) * (0.35 + Math.random() * 0.75);
      parts.push({
        x: x + (Math.random() - 0.5) * (o.jitter || 0), y: y + (Math.random() - 0.5) * (o.jitter || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: o.gravity != null ? o.gravity : 900,
        life: (o.life || 0.8) * (0.6 + Math.random() * 0.6), age: 0,
        size: (o.size || 10) * (0.6 + Math.random() * 0.7),
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 12,
        color: colors[(Math.random() * colors.length) | 0],
        shape: o.shape || 'shard', drag: o.drag != null ? o.drag : 0.985
      });
    }
  }

  // Kit.fx.text(x, y, 'Great!', { color, size, rise, life, stroke })
  function text(x, y, s, o) {
    o = o || {};
    texts.push({ x: x, y: y, s: s, color: o.color || '#fff', stroke: o.stroke || 'rgba(0,0,0,.35)',
                 size: o.size || 42, rise: o.rise != null ? o.rise : 90, life: o.life || 0.9, age: 0, font: o.font });
  }

  function addShake(mag, t) {
    if (reduce) return;
    shake.mag = Math.max(shake.mag, mag);
    shake.t = Math.max(shake.t, t || 0.25);
  }

  function update(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var tw = tweens[i];
      tw.t += dt;
      var k = Math.min(1, tw.t / tw.dur), e = tw.ease(k);
      for (var p in tw.to) tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e;
      if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
    for (var j = parts.length - 1; j >= 0; j--) {
      var q = parts[j];
      q.age += dt;
      if (q.age >= q.life) { parts.splice(j, 1); continue; }
      q.vx *= q.drag; q.vy = q.vy * q.drag + q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
    for (var m = texts.length - 1; m >= 0; m--) {
      var t = texts[m];
      t.age += dt;
      if (t.age >= t.life) texts.splice(m, 1);
    }
    if (shake.t > 0) {
      shake.t -= dt;
      var s = shake.mag * Math.max(0, shake.t / 0.25);
      shake.x = (Math.random() - 0.5) * 2 * s;
      shake.y = (Math.random() - 0.5) * 2 * s;
      if (shake.t <= 0) { shake.x = shake.y = 0; shake.mag = 0; }
    }
  }

  function star(ctx, r) {
    // An 8-point star (two overlapping squares), the classic Islamic geometric motif.
    ctx.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8, rr = i % 2 ? r * 0.62 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  Kit.starPath = star;

  function draw(ctx) {
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i], k = 1 - q.age / q.life;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = q.color;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      var s = q.size * (q.shape === 'spark' ? k : 1);
      if (q.shape === 'dot' || q.shape === 'spark') {
        ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, 6.283); ctx.fill();
      } else if (q.shape === 'star') {
        star(ctx, s * 0.6); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.3); ctx.lineTo(s * 0.5, -s * 0.15); ctx.lineTo(s * 0.1, s * 0.45); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (var m = 0; m < texts.length; m++) {
      var t = texts[m], u = t.age / t.life, pop = u < 0.15 ? E.outBack(u / 0.15) : 1;
      ctx.globalAlpha = u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
      ctx.font = (t.font || '800 ') + Math.round(t.size * pop) + 'px Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var y = t.y - t.rise * E.outCubic(u);
      ctx.lineWidth = t.size * 0.16; ctx.strokeStyle = t.stroke; ctx.lineJoin = 'round';
      ctx.strokeText(t.s, t.x, y);
      ctx.fillStyle = t.color; ctx.fillText(t.s, t.x, y);
    }
    ctx.globalAlpha = 1;
  }

  Kit.fx = {
    burst: burst, text: text, shake: addShake, update: update, draw: draw,
    offset: function () { return shake; },
    clear: function () { parts.length = 0; texts.length = 0; tweens.length = 0; shake.t = 0; shake.x = shake.y = 0; },
    count: function () { return parts.length; }
  };
})();
