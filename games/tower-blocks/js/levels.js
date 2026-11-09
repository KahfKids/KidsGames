/* Tower Blocks: levels.js
   20 levels in 4 worlds. Each level asks for a tower of `goal` blocks.
   speed: how fast the block slides (world units per second; a block starts 100 units wide)
   amp:   how far it slides, as a share of the tower's width. Below 1 the block always lands on the tower,
          so world 1 can't be missed at all.
   minW:  the safety ledge: the tower never gets narrower than this share of its full width.
   tol:   how close (units) counts as a perfect drop, which snaps flush.
   grow:  perfect drops in a row before each further perfect grows the block back toward full size.
          Three perfect drops in a row also win back a lost heart.
   axes:  'x' = the block always slides the same way; 'xz' = it takes turns from the left and the right. */
window.TOWER_LEVELS = (function () {
  'use strict';
  var WORLDS = [
    { name: 'Golden Dusk', color: '#f6c453', sky: 0 },
    { name: 'Rose Twilight', color: '#ff9fb6', sky: 150 },
    { name: 'Lantern Night', color: '#b3a6ff', sky: 300 },
    { name: 'Starry Heights', color: '#7ae7ff', sky: 450 }
  ];
  var DEF = [
    { axes: 'x', amp: 0.85, minW: 0.45, tol: 10, grow: 2, goals: [6, 7, 8, 9, 10], speeds: [55, 64, 73, 82, 90] },
    { axes: 'x', amp: 1.0, minW: 0.4, tol: 8, grow: 3, goals: [10, 11, 12, 12, 14], speeds: [92, 100, 108, 116, 124] },
    { axes: 'xz', amp: 1.1, minW: 0.3, tol: 8, grow: 3, goals: [12, 13, 14, 15, 16], speeds: [96, 104, 112, 120, 130] },
    { axes: 'xz', amp: 1.25, minW: 0.22, tol: 7, grow: 3, goals: [16, 17, 18, 19, 20], speeds: [130, 138, 146, 156, 166] }
  ];
  var list = [];
  DEF.forEach(function (d, w) {
    d.goals.forEach(function (g, i) {
      list.push({ world: w, goal: g, speed: d.speeds[i], amp: d.amp, minW: d.minW, tol: d.tol, grow: d.grow, axes: d.axes, sky: WORLDS[w].sky });
    });
  });
  return {
    worlds: WORLDS,
    list: list,
    count: list.length,
    perWorld: 5,
    worldOf: function (n) { return list[n - 1].world; },
    // Free Build: endless. It starts gentle and slowly speeds up and narrows its ledge as the tower grows.
    free: function (h) {
      return { world: -1, goal: Infinity, speed: Math.min(185, 80 + h * 3.5), amp: h < 6 ? 1.0 : 1.3, minW: h < 10 ? 0.3 : 0.14,
               tol: 8, grow: 3, axes: h < 8 ? 'x' : 'xz', sky: 0 };
    },
    milestones: [10, 25, 50, 75, 100]
  };
})();
