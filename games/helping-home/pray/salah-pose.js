/* Helping Home: the posture picture for the salah station (window.SALAHPOSE).
   A faceless ink silhouette (no eyes, mouth or any feature: the head is a plain round shape), drawn as thick inked
   strokes for the limbs. Seen from the side, facing left (toward the qibla end of the mat), for standing, takbir,
   ruku', standing up, sujood and sitting. For the salam it is seen from behind, so "right" on the screen is the
   child's own right, and the head turns right, then left.
   Moving between positions tweens the joints (a small SVG, about 30 elements; nothing else is redrawn).
   SALAHPOSE.mount(el) -> { set(name) }   names: stand takbir rise ruku sujud sit tash salamR salamL */
(function () {
  'use strict';
  var INKC = '#231e16', BODY = '#4d6a83', FAR = '#3a5168', MATC = '#2f6f5e', MATB = '#f2e3c2', ARROW = '#c8644a';
  // joints in a 100 x 100 box, ground at y = 90. Far limbs end in 2. f = the pointing finger (tashahhud)
  var SIDE = {
    stand:  { h: [50, 17], n: [50, 27], s: [50, 31], p: [51, 56], k: [50, 72], a: [51, 86.5], t: [42, 89], e: [53, 45], w: [45, 43],
              k2: [51.5, 72], a2: [52.5, 86.5], t2: [43.5, 89], e2: [52.5, 45.5], w2: [45.5, 44.5] },
    takbir: { h: [50, 17], n: [50, 27], s: [50, 31], p: [51, 56], k: [50, 72], a: [51, 86.5], t: [42, 89], e: [43.5, 37.5], w: [42.5, 21],
              k2: [51.5, 72], a2: [52.5, 86.5], t2: [43.5, 89], e2: [45, 38], w2: [44, 22] },
    rise:   { h: [50, 17], n: [50, 27], s: [50, 31], p: [51, 56], k: [50, 72], a: [51, 86.5], t: [42, 89], e: [51, 44], w: [50, 56.5],
              k2: [51.5, 72], a2: [52.5, 86.5], t2: [43.5, 89], e2: [52, 44], w2: [51.5, 56.5] },
    ruku:   { h: [25, 49.5], n: [33, 50], s: [37, 51], p: [61, 51], k: [60, 70], a: [61, 86.5], t: [52, 89], e: [46.5, 60], w: [56.5, 67],
              k2: [61.5, 70], a2: [62.5, 86.5], t2: [53.5, 89], e2: [45.5, 61], w2: [55.5, 68] },
    sujud:  { h: [27.5, 80.5], n: [35, 74], s: [39, 71.5], p: [66, 63], k: [57, 86.5], a: [77, 80], t: [71, 89], e: [46.5, 79], w: [34.5, 88],
              k2: [58.5, 86.5], a2: [78.5, 80], t2: [72.5, 89], e2: [45, 80], w2: [33, 88] },
    sit:    { h: [55, 34], n: [56.5, 44], s: [57, 48], p: [61, 73], k: [35, 84.5], a: [63, 87.5], t: [73, 89], e: [53, 62], w: [42, 76],
              k2: [36.5, 84.5], a2: [69, 79], t2: [63.5, 89], e2: [52, 62.5], w2: [43, 77] },
  };
  SIDE.tash = Object.assign({}, SIDE.sit, { e2: [51, 63], w2: [41, 74.5], f: [33.5, 72] });
  var BACK = { salamR: 1, salamL: -1 };

  function seg(a, b) { return 'M' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + 'L' + b[0].toFixed(2) + ' ' + b[1].toFixed(2); }
  function strokes(d, w, col) { return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  // a limb group: an ink outline, then the fill on top, so overlapping parts read as separate shapes
  function limb(list, col) {
    var o = '', i;
    for (i = 0; i < list.length; i++) o += strokes(list[i][0], list[i][1] + 2.8, INKC);
    for (i = 0; i < list.length; i++) o += strokes(list[i][0], list[i][1], col);
    return o;
  }
  function ground() {
    return '<rect x="9" y="89.6" width="82" height="4.2" rx="1" fill="' + MATC + '" stroke="' + INKC + '" stroke-width="1.3"/>' +
      '<path d="M12 91.7H88" stroke="' + MATB + '" stroke-width=".9" stroke-dasharray="2.5 1.6"/>';
  }
  function side(J) {
    var far = limb([[seg(J.p, J.k2) , 9.5], [seg(J.k2, J.a2), 7.6], [seg(J.a2, J.t2), 4.6]], FAR) +
              limb([[seg(J.s, J.e2), 6.4], [seg(J.e2, J.w2), 5.4]].concat(J.f ? [[seg(J.w2, J.f), 2.2]] : []), FAR);
    var body = limb([[seg(J.n, J.p), 14.5], [seg(J.n, J.h), 6]], BODY) +
               '<circle cx="' + J.h[0].toFixed(2) + '" cy="' + J.h[1].toFixed(2) + '" r="7.6" fill="' + BODY + '" stroke="' + INKC + '" stroke-width="1.4"/>';
    var near = limb([[seg(J.p, J.k), 9.5], [seg(J.k, J.a), 7.6], [seg(J.a, J.t), 4.6]], BODY) + limb([[seg(J.s, J.e), 6.4], [seg(J.e, J.w), 5.4]], BODY);
    return far + body + near;
  }
  function back(turn, hx) {
    var s = '<ellipse cx="50" cy="84.5" rx="27" ry="6.8" fill="' + FAR + '" stroke="' + INKC + '" stroke-width="1.4"/>';
    s += limb([[seg([50, 76], [50, 50]), 23]], BODY);
    s += limb([[seg([37.5, 51], [33, 64.5]), 7], [seg([33, 64.5], [36.5, 77]), 6], [seg([62.5, 51], [67, 64.5]), 7], [seg([67, 64.5], [63.5, 77]), 6]], BODY);
    s += limb([[seg([39, 50], [61, 50]), 11]], BODY);
    s += '<circle cx="' + (50 + hx).toFixed(2) + '" cy="36" r="8.4" fill="' + BODY + '" stroke="' + INKC + '" stroke-width="1.4"/>';
    // the turn: a curved arrow over the head, toward the shoulder the child turns to
    var x0 = 50 - turn * 9, x1 = 50 + turn * 14;
    s += '<path d="M' + x0 + ' 22Q50 13 ' + x1 + ' 23" fill="none" stroke="' + ARROW + '" stroke-width="2.6" stroke-linecap="round"/>' +
         '<path d="M' + (x1 - turn * 5.5) + ' 18.5L' + x1 + ' 23L' + (x1 - turn * 6) + ' 26" fill="none" stroke="' + ARROW + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    s += '<text x="' + (50 + turn * 30) + '" y="40" text-anchor="middle" font-family="ui-rounded,system-ui,sans-serif" font-weight="800" font-size="9" fill="' + INKC + '">' + (turn > 0 ? 'right' : 'left') + '</text>';
    return s;
  }
  var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  function lerpJ(A, B, t) { var o = {}; Object.keys(B).forEach(function (k) { var a = A[k] || B[k]; o[k] = [a[0] + (B[k][0] - a[0]) * t, a[1] + (B[k][1] - a[1]) * t]; });
    if (A.f && !B.f) o.f = null; return o; }

  window.SALAHPOSE = {
    mount: function (el) {
      el.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><g class="sp-g"></g></svg>';
      var g = el.querySelector('.sp-g'), cur = null, J = null, anim = 0;
      function draw(html) { g.innerHTML = ground() + html; }
      return {
        set: function (name, instant) {
          if (name === cur) return; var prev = cur; cur = name; var id = ++anim;
          var reduce = window.Kit && Kit.reducedMotion;
          if (BACK[name]) {
            var turn = BACK[name], from = BACK[prev] ? -turn * 3 : 0, t0 = performance.now();
            if (!BACK[prev]) { el.classList.remove('sp-fade'); void el.offsetWidth; el.classList.add('sp-fade'); }
            (function step() { if (id !== anim) return; var u = instant || reduce ? 1 : Math.min(1, (performance.now() - t0) / 650);
              draw(back(turn, from + (turn * 3 - from) * ease(u))); if (u < 1) requestAnimationFrame(step); })();
            return;
          }
          var target = SIDE[name] || SIDE.stand;
          if (!J || BACK[prev] || instant || reduce) { if (BACK[prev]) { el.classList.remove('sp-fade'); void el.offsetWidth; el.classList.add('sp-fade'); }
            J = target; draw(side(J)); return; }
          var A = J, t1 = performance.now();
          (function step() { if (id !== anim) return; var u = Math.min(1, (performance.now() - t1) / 520);
            J = lerpJ(A, target, ease(u)); if (u >= 1) J = target; draw(side(J)); if (u < 1) requestAnimationFrame(step); })();
        },
      };
    },
  };
})();
