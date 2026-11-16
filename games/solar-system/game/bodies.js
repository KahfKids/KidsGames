/* Solar System: bodies.js (data only)
   The Sun, the eight planets and the moons we show: sizes and distances (not to scale, so a child can see and tap
   them), motion, how each is shaded (kind), and one short fact line. The surfaces themselves are pictures made once by
   tools/bake.js (art/tex-<id>) and shaded on the graphics chip by planet.js. All the words are the old game's. */
(function () {
  'use strict';
  // id, name, radius (units), orbit radius (units; moons: parent radii), orbit period (s at normal speed), spin period (s),
  // vt / tilt (deg): how the north pole is tipped to the viewer and rolled in the picture, kind (shading), base colour, halo, fact
  var B = [
    { id: 'sun', name: 'the Sun', short: 'Sun', r: 0.75, orbit: 0, spin: 50, vt: 10, tilt: 0, kind: 'sun', base: [255, 196, 90],
      fact: 'The Sun is a star. Allah made it to give us light and warmth.' },
    { id: 'mercury', name: 'Mercury', r: 0.16, orbit: 1.75, a0: 0.5, spin: 40, vt: 14, tilt: 2, kind: 'rock', base: [150, 140, 128],
      fact: 'Mercury is the smallest planet, and the closest to the Sun.' },
    { id: 'venus', name: 'Venus', r: 0.24, orbit: 2.45, a0: 2.7, spin: -70, vt: 14, tilt: 3, kind: 'haze', base: [232, 200, 140], halo: [255, 220, 160],
      fact: 'Venus is the hottest planet. It is wrapped in thick clouds.' },
    { id: 'earth', name: 'Earth', r: 0.25, orbit: 3.15, a0: 4.5, spin: 16, vt: 16, tilt: 22, kind: 'earth', base: [40, 90, 160], halo: [120, 180, 255], mask: true,
      fact: 'Earth is our home, with water, air and life.' },
    { id: 'moon', name: 'the Moon', short: 'Moon', parent: 'earth', r: 0.08, orbit: 3.4, a0: 1, period: 10, spin: 10, vt: 10, tilt: 0, kind: 'rock', base: [160, 158, 152],
      fact: 'The Moon goes around the Earth and lights up our night.' },
    { id: 'mars', name: 'Mars', r: 0.19, orbit: 3.85, a0: 1.5, spin: 17, vt: 14, tilt: 25, kind: 'rock', base: [190, 96, 56],
      fact: 'Mars is the red planet. It is dusty, rocky and cold.' },
    { id: 'jupiter', name: 'Jupiter', r: 0.62, orbit: 5.9, a0: 3.6, spin: 9, vt: 12, tilt: 3, kind: 'gas', base: [214, 186, 150],
      fact: 'Jupiter is the biggest planet. Its red spot is a giant storm.' },
    { id: 'io', name: 'Io', parent: 'jupiter', r: 0.065, orbit: 1.5, a0: 0.3, period: 5, spin: 5, vt: 10, tilt: 0, kind: 'rock', base: [226, 204, 104],
      fact: 'Io is a moon of Jupiter. It has lots of volcanoes.' },
    { id: 'europa', name: 'Europa', parent: 'jupiter', r: 0.055, orbit: 1.85, a0: 2.4, period: 7, spin: 7, vt: 10, tilt: 0, kind: 'rock', base: [222, 208, 186],
      fact: 'Europa is an icy moon of Jupiter.' },
    { id: 'ganymede', name: 'Ganymede', parent: 'jupiter', r: 0.085, orbit: 2.25, a0: 4.2, period: 10, spin: 10, vt: 10, tilt: 0, kind: 'rock', base: [150, 140, 128],
      fact: 'Ganymede is the biggest moon of all.' },
    { id: 'callisto', name: 'Callisto', parent: 'jupiter', r: 0.08, orbit: 2.7, a0: 5.6, period: 15, spin: 15, vt: 10, tilt: 0, kind: 'rock', base: [96, 86, 74],
      fact: 'Callisto is an old moon covered in craters.' },
    { id: 'saturn', name: 'Saturn', r: 0.52, orbit: 7.45, a0: 0.9, spin: 10, vt: 24, tilt: -9, kind: 'gas', base: [228, 206, 160], ring: true,
      fact: 'Saturn has beautiful rings made of ice and rock.' },
    { id: 'titan', name: 'Titan', parent: 'saturn', r: 0.08, orbit: 2.75, a0: 2, period: 12, spin: 12, vt: 10, tilt: 0, kind: 'haze', base: [220, 158, 72], halo: [255, 190, 110],
      fact: 'Titan is the biggest moon of Saturn. Its air is thick and orange.' },
    { id: 'uranus', name: 'Uranus', r: 0.37, orbit: 8.9, a0: 5.3, spin: -12, vt: 14, tilt: 84, kind: 'ice', base: [170, 222, 230], halo: [170, 235, 255],
      fact: 'Uranus is an icy planet that spins on its side.' },
    { id: 'neptune', name: 'Neptune', r: 0.355, orbit: 10.1, a0: 2.2, spin: 11, vt: 14, tilt: 26, kind: 'ice', base: [64, 110, 220], halo: [110, 150, 255],
      fact: 'Neptune is the farthest planet. It is cold, blue and very windy.' }
  ];
  var PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'], byId = {};
  B.forEach(function (b) {
    byId[b.id] = b;
    if (!b.short) b.short = b.name;
    if (!b.parent && b.orbit) b.period = 40 * Math.pow(b.orbit / 3.15, 1.5);      // Kepler-like: inner planets go round faster; Earth 40 s
    // the picture frame's axes (north pole tipped toward the viewer by vt, rolled by tilt), as in the old bodyBasis
    var vt = b.vt * Math.PI / 180, ta = b.tilt * Math.PI / 180, ct = Math.cos(ta), st = Math.sin(ta);
    var rot = function (v) { return [v[0] * ct - v[1] * st, v[0] * st + v[1] * ct, v[2]]; };
    b.X = rot([1, 0, 0]); b.Y = rot([0, -Math.cos(vt), Math.sin(vt)]); b.Z = rot([0, Math.sin(vt), Math.cos(vt)]);
    b.order = PLANETS.indexOf(b.id) + 1;
  });
  window.SolarBodies = { list: B, byId: byId, planets: PLANETS };
})();
