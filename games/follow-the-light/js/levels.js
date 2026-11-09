/* Follow the Light: levels.js
   30 levels in 3 worlds. Each level is "reach a sequence of N lights". The first round starts short and
   grows by one light per round, so a level always takes a few rounds. Lights stay on at least 400 ms and
   get gently quicker as the sequence grows. */
(function () {
  'use strict';
  var WORLDS = [
    { name: 'Lantern Courtyard', color: '#f6c453', lanterns: 4, base: 0.80, targets: [2, 3, 3, 4, 4, 4, 5, 5, 5, 6] },
    { name: 'Night Garden', color: '#7be0b0', lanterns: 4, base: 0.70, targets: [5, 6, 6, 7, 7, 8, 8, 9, 9, 10] },
    { name: 'Ramadan Night', color: '#ff9fd0', lanterns: 6, base: 0.74, targets: [3, 4, 5, 5, 6, 6, 7, 7, 8, 9] }
  ];
  var list = [];
  WORLDS.forEach(function (w, wi) {
    w.targets.forEach(function (t, k) {
      list.push({
        world: wi, lanterns: w.lanterns, target: t,
        start: Math.max(1, Math.floor(t / 2) - 1),
        base: w.base - k * 0.006,
        // World 1 never repeats a light twice in a row (easiest to follow for the youngest players).
        repeats: wi > 0
      });
    });
  });
  // Light on-time for a sequence of length len (seconds, never below 0.42) and the dark gap after it.
  function timing(lv, len) {
    var on = Math.max(0.42, lv.base - 0.03 * (len - 1));
    return { on: on, gap: Math.max(0.22, on * 0.42) };
  }
  window.LIGHT_LEVELS = { worlds: WORLDS, list: list, timing: timing, worldOf: function (n) { return list[n - 1].world; } };
})();
