/* Kahf KidsGames board kit: robot-sounds.js
   The toy-robot opponents' own sounds (shared by Checkers and Tic Tac Toe). Mechanical foley only: servo
   whirrs, clunks, a spring boing, a deflating hiss, and one short single blip. No melodies, no notes in a row.
   Each game's piece, board and win sounds live in that game's js/sounds.js. */
(function () {
  'use strict';
  var K = window.Kit;
  // A filtered motor tone gliding through a short path (a servo turning). pts: [[time, freq], ...]
  function servo(L, t, pts, vol, cut) {
    var c = L.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), end = t + pts[pts.length - 1][0];
    o.type = 'square'; f.type = 'lowpass'; f.frequency.value = cut || 900; f.Q.value = 2;
    o.frequency.setValueAtTime(pts[0][1], t);
    for (var i = 1; i < pts.length; i++) o.frequency.linearRampToValueAtTime(pts[i][1], t + pts[i][0]);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, end - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(f); f.connect(g); g.connect(L.out); o.start(t); o.stop(end + 0.02);
  }
  K.sfx.define({
    // servo whirr while it thinks: the head turns one way, then back
    robotThink: function (L, t) {
      servo(L, t, [[0, 95], [0.16, 140], [0.24, 140], [0.42, 105]], 0.05, 700);
      L.burst(t, { dur: 0.42, freq: 1800, q: 6, vol: 0.025, attack: 0.03 });
      L.click(t + 0.44, { freq: 2200, vol: 0.08 });
    },
    // one short blip when it picks its piece
    robotBlip: function (L, t) { L.glide(t, { from: 1150, to: 1350, dur: 0.05, vol: 0.07 }); L.click(t, { freq: 4000, vol: 0.05 }); },
    // a little metal clank when one of its pieces is taken
    robotHit: function (L, t) {
      L.burst(t, { dur: 0.09, freq: 2600, q: 14, vol: 0.12 }); L.burst(t, { dur: 0.06, freq: 3900, q: 16, vol: 0.06 });
      L.thump(t, { from: 260, to: 140, dur: 0.06, vol: 0.12 });
    },
    // happy clunk, then a springy boing as it hops
    robotWin: function (L, t) {
      L.thump(t, { from: 140, to: 55, dur: 0.12, vol: 0.32 }); L.burst(t, { dur: 0.05, freq: 1300, q: 3, vol: 0.14 });
      var c = L.ctx, o = c.createOscillator(), g = c.createGain(), n = 64, curve = new Float32Array(n), d = 0.45;
      for (var i = 0; i < n; i++) { var u = i / (n - 1); curve[i] = 230 + 120 * u + Math.sin(u * 30) * 55 * (1 - u); }   // a spring wobbling as it settles
      o.type = 'triangle'; o.frequency.setValueCurveAtTime(curve, t + 0.08, d);
      g.gain.setValueAtTime(0.0001, t + 0.08); g.gain.linearRampToValueAtTime(0.09, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08 + d);
      o.connect(g); g.connect(L.out); o.start(t + 0.08); o.stop(t + 0.1 + d);
      L.click(t + 0.5, { freq: 1500, vol: 0.12 });
    },
    // deflating hiss and a droop of the motor
    robotLose: function (L, t) {
      L.burst(t, { dur: 0.75, freq: 3200, sweepTo: 450, q: 0.8, attack: 0.04, vol: 0.09 });
      servo(L, t + 0.05, [[0, 170], [0.6, 60]], 0.04, 500);
      L.thump(t + 0.62, { from: 110, to: 50, dur: 0.12, vol: 0.18 });
    }
  });
})();
