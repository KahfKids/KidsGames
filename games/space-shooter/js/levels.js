/* Star Rangers: levels.js
   24 waves in 4 worlds; the last wave of each world is a boss machine.
   A wave is a list of groups that play one after another:
     { f: ['bbbbb', '.ttt.'], pu }   formation (rows top to bottom): b scout robot, t hauler (3 hits), z spark pod
                                     (shoots once shots are on), . empty. pu = power-up carried by one robot.
                                     Formations swoop in on curved paths, then sway, strafe and ripple.
     { s: 'pRpcg', every, from }     a stream: p pebble, R big asteroid (splits), c fuel can, g gear, s old satellite.
                                     from: 'top' (default, drifting diagonally) or 'alt' (tumbling in from the sides).
     { w: 5, side, depth, every }    drones swoop in a U toward the ranger. side 'L' | 'R' | 'alt'. depth 0..1.
     { d: 6, every }                 drones zig-zag down through the field, drifting toward the ranger.
     { boss: id }
   Tuning (per world, overridable per wave):
     speed   enemy speed           sway   formation strafe speed (rad/s)
     dive    seconds between dives (0 = none)      divers  how many may dive at once      diveSpeed
     shoot   seconds between spark-pod volleys (0 = none)   burst  sparks per volley   shot  spark speed (units/s)
     aim     sparks aim at the ranger (else straight down)  track  spark pods leave the row to follow the ranger
     home    0..1 how strongly drones steer toward the ranger
     homing  how fast (rad/s) aimed sparks curve toward the ranger until they get close (0 = straight) */
(function () {
  'use strict';
  var W = [
    { speed: 0.8, sway: 0.5, dive: 0, divers: 1, diveSpeed: 0.7, shoot: 0, burst: 1, shot: 165, aim: false, track: false, home: 0.15, homing: 0 },
    { speed: 0.95, sway: 0.8, dive: 2.6, divers: 3, diveSpeed: 1.1, shoot: 2, burst: 3, shot: 240, aim: true, track: true, home: 0.6, homing: 0.7 },
    { speed: 1.08, sway: 1, dive: 2.3, divers: 3, diveSpeed: 1.2, shoot: 2.3, burst: 3, shot: 260, aim: true, track: true, home: 0.65, homing: 0.6 },
    { speed: 1.2, sway: 1.2, dive: 2, divers: 4, diveSpeed: 1.3, shoot: 2.1, burst: 3, shot: 265, aim: true, track: true, home: 0.75, homing: 0.65 }
  ];
  function t(base, o) { var r = {}; for (var k in W[base]) r[k] = W[base][k]; for (var k2 in o || {}) r[k2] = o[k2]; return r; }

  var list = [
    // ---- World 1: Moon Orbit (gentle: no sparks in waves 1-3, slow wiggle-first dives from wave 2) ----
    { name: 'Lift Off', tune: t(0), g: [{ f: ['.bbb.'] }, { f: ['bbbb'] }, { f: ['bbbbb'], pu: 'spread' }] },
    { name: 'Moon Dust', tune: t(0, { dive: 8 }), g: [{ s: 'pppp', every: 1.5 }, { f: ['bbbbb'] }, { s: 'ppppp', every: 1.2 }, { f: ['b...b', '.b.b.', '..b..'], pu: 'shield' }] },
    { name: 'Robot Parade', tune: t(0, { dive: 7 }), g: [{ f: ['bbbbbb'] }, { w: 4, side: 'L', depth: 0.35, every: 0.5 }, { f: ['.bbbb.', 'bbbbbb'], pu: 'magnet' }] },
    { name: 'Space Junk', tune: t(0, { dive: 6.5, shoot: 5.5 }), g: [{ s: 'cgcgc', every: 1.3, from: 'alt' }, { f: ['bbzbb', '.btb.'], pu: 'spread' }, { s: 'gcsgc', every: 1.2, from: 'alt' }] },
    { name: 'Drone Dance', tune: t(0, { dive: 6, shoot: 5, speed: 0.85 }), g: [{ w: 5, side: 'L', depth: 0.45, every: 0.45 }, { w: 5, side: 'R', depth: 0.45, every: 0.45 }, { f: ['btztb'], pu: 'heart' }, { w: 6, side: 'alt', depth: 0.55, every: 0.5 }] },
    { name: 'Moon Mech', boss: 0, tune: t(0, { speed: 0.85, shot: 165 }), g: [{ boss: 0 }] },

    // ---- World 2: Asteroid Belt (aimed sparks, two divers, rocks everywhere) ----
    { name: 'Rocky Road', tune: t(1, { burst: 1 }), g: [{ s: 'pRppRp', every: 1.1 }, { f: ['bbzbbz'], pu: 'spread' }, { s: 'RpRpp', every: 1 }] },
    { name: 'Rock Splitter', tune: t(1, { burst: 1 }), g: [{ s: 'RRR', every: 1.6 }, { f: ['bztzb', '.bzb.'], pu: 'magnet' }, { s: 'pppppppp', every: 0.55 }] },
    { name: 'Diving Bots', tune: t(1, { dive: 3.4, divers: 3 }), g: [{ f: ['bzbzb'] }, { f: ['b.z.b.b', '.b.b.z.'], pu: 'magnet' }, { s: 'RpRpR', every: 1.1 }] },
    { name: 'Spark Field', tune: t(1, { shoot: 1.7, homing: 0.85 }), g: [{ f: ['zbzbz'] }, { s: 'pRpp', every: 1.1 }, { f: ['.zbz.', 'bztzb'], pu: 'shield' }] },
    { name: 'Belt Rush', tune: t(1, { shoot: 1.7, homing: 0.85, dive: 2.2 }), g: [{ w: 6, side: 'alt', depth: 0.7, every: 0.45 }, { s: 'RpRpRp', every: 0.9 }, { f: ['tzbzt', 'bzbzb'], pu: 'spread' }, { s: 'ppppp', every: 0.5 }] },
    { name: 'Rock Crusher', boss: 1, tune: t(1, { homing: 0.9, shot: 255 }), g: [{ boss: 1 }] },

    // ---- World 3: Ringed Planet (spark pods track you, faster strafing) ----
    { name: 'Ring Run', tune: t(2), g: [{ s: 'sgcs', every: 1.1, from: 'alt' }, { f: ['bzbzbz'], pu: 'spread' }, { w: 6, side: 'R', depth: 0.8, every: 0.42 }] },
    { name: 'Satellite Sweep', tune: t(2), g: [{ s: 'ssss', every: 1.2, from: 'alt' }, { f: ['.tzt.', 'zbzbz'], pu: 'shield' }, { s: 'cgcgcg', every: 0.75 }] },
    { name: 'Tank Wall', tune: t(2), g: [{ f: ['tztzt'], pu: 'spread' }, { d: 7, every: 0.65 }, { f: ['bzbzbz'], pu: 'heart' }] },
    { name: 'Spiral Drones', tune: t(2), g: [{ w: 6, side: 'L', depth: 0.85, every: 0.42 }, { w: 6, side: 'R', depth: 0.85, every: 0.42 }, { f: ['zbzbz', '.tzt.'], pu: 'magnet' }, { d: 7, every: 0.55 }] },
    { name: 'Spark Storm', tune: t(2), g: [{ f: ['zzzzz'], pu: 'shield' }, { s: 'RpRpRp', every: 0.85 }, { f: ['bztzb', 'zbzbz'], pu: 'spread' }] },
    { name: 'Ring Keeper', boss: 2, tune: t(2), g: [{ boss: 2 }] },

    // ---- World 4: Nebula (fast, three divers, bursts of three) ----
    { name: 'Glow Clouds', tune: t(3), g: [{ d: 8, every: 0.55 }, { f: ['bzbzbz', '.zbbz.'], pu: 'spread' }, { w: 7, side: 'alt', depth: 0.9, every: 0.42 }] },
    { name: 'Swirl', tune: t(3), g: [{ w: 6, side: 'L', depth: 0.9, every: 0.4 }, { w: 6, side: 'R', depth: 0.9, every: 0.4 }, { f: ['tzbzt', 'zbzbz'], pu: 'shield' }] },
    { name: 'Star Storm', tune: t(3), g: [{ s: 'RpRpRpRp', every: 0.75 }, { f: ['zbzbz', 'tztzt'], pu: 'magnet' }, { d: 8, every: 0.45 }] },
    { name: 'Big Parade', tune: t(3), g: [{ f: ['bzbzbzb', '.zbtbz.'], pu: 'spread' }, { s: 'sgsgc', every: 0.85, from: 'alt' }, { f: ['ttttt', 'zzzzz'], pu: 'heart' }] },
    { name: 'Last Light', tune: t(3), g: [{ w: 7, side: 'alt', depth: 1, every: 0.42 }, { f: ['zbtbz', 'btztb'], pu: 'shield' }, { s: 'RRpRRp', every: 0.75 }, { d: 8, every: 0.45 }] },
    { name: 'Mega Drone', boss: 3, tune: t(3), g: [{ boss: 3 }] }
  ];

  window.STAR_WAVES = {
    list: list,
    perWorld: 6,
    worldOf: function (n) { return Math.floor((n - 1) / 6); },
    bossHp: [45, 80, 100, 120]
  };
})();
