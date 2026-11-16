/* Jannah Garden: levels.js
   The things a child can plant, the three garden areas (their water, paths and zones, all in ground
   coordinates u = 0..1 left to right and v = 0..1 far to near) and 15 gentle goal levels. */
(function () {
  'use strict';

  // kind: flower | tree | thing | water | flat (flat things lie on the ground and are drawn first)
  // snd: the gentle sound it makes when planted or tapped
  var ITEMS = [
    { id: 'rose', name: 'Rose', kind: 'flower', snd: 'plant' },
    { id: 'tulip', name: 'Tulip', kind: 'flower', snd: 'plant' },
    { id: 'daisy', name: 'Daisy', kind: 'flower', snd: 'plant' },
    { id: 'lavender', name: 'Lavender', kind: 'flower', snd: 'plant' },
    { id: 'bush', name: 'Bush', kind: 'flower', snd: 'bush' },
    { id: 'palm', name: 'Date palm', kind: 'tree', snd: 'tree' },
    { id: 'apple', name: 'Apple tree', kind: 'tree', snd: 'tree' },
    { id: 'orange', name: 'Orange tree', kind: 'tree', snd: 'tree' },
    { id: 'pomegranate', name: 'Pomegranate tree', kind: 'tree', snd: 'tree' },
    { id: 'fountain', name: 'Fountain', kind: 'thing', snd: 'water' },
    { id: 'pond', name: 'Pond', kind: 'flat', snd: 'water' },
    { id: 'bench', name: 'Bench', kind: 'thing', snd: 'wood' },
    { id: 'birdhouse', name: 'Birdhouse', kind: 'thing', snd: 'chirp' },
    { id: 'lantern', name: 'Lantern', kind: 'thing', snd: 'glow' },
    { id: 'butterfly', name: 'Butterfly', kind: 'thing', snd: 'flutter' }
  ];
  var BY_ID = {};
  ITEMS.forEach(function (it, i) { it.index = i; BY_ID[it.id] = it; });

  var TAU = Math.PI * 2;
  function sq(x) { return x * x; }

  // ---------- the three garden areas ----------
  // Each area: blocked(u, v) -> true where nothing can stand (water, paths, the big fountain);
  // zones: { name: test(u, v) }; fixed: scenery objects drawn in depth order with the planted items.
  var riverC = function (u) { return 0.4 + 0.09 * Math.sin(u * 4.6 + 0.7); };
  var RIVER_HW = 0.065;
  var pathC = function (v) { return 0.47 + 0.15 * Math.sin(v * 3.6 + 0.5); };
  var pathHW = function (v) { return 0.028 + 0.06 * v; };
  var FOUNT = { u: 0.5, v: 0.46, ru: 0.12, rv: 0.1 };
  var crossHW = function (v) { return 0.024 + 0.045 * v; }; // courtyard walk half width (u), widens as it nears
  var CROSS_V = FOUNT.v, CROSS_VHW = 0.05;

  var AREAS = [
    { id: 'river', name: 'River Garden', color: '#5fd0e6',
      inWater: function (u, v) { return Math.abs(v - riverC(u)) < RIVER_HW; },
      blocked: function (u, v) { return Math.abs(v - riverC(u)) < RIVER_HW + 0.012; },
      nudge: function (u, v) { var c = riverC(u); return { u: u, v: v < c ? c - RIVER_HW - 0.03 : c + RIVER_HW + 0.03 }; },
      zones: { river: function (u, v) { var d = Math.abs(v - riverC(u)); return d >= RIVER_HW && d < RIVER_HW + 0.15; } },
      fixed: [],
      riverC: riverC, riverHW: RIVER_HW },
    { id: 'orchard', name: 'Fruit Orchard', color: '#ffb547',
      inWater: function () { return false; },
      blocked: function (u, v) { return Math.abs(u - pathC(v)) < pathHW(v) + 0.008 || sq((u - 0.84) / 0.06) + sq((v - 0.15) / 0.06) < 1; },
      nudge: function (u, v) { var c = pathC(v), hw = pathHW(v) + 0.03; return { u: u < c ? c - hw : c + hw, v: v }; },
      zones: { path: function (u, v) { var d = Math.abs(u - pathC(v)); return d >= pathHW(v) && d < pathHW(v) + 0.11; } },
      fixed: [{ t: 'well', u: 0.84, v: 0.16 }],
      pathC: pathC, pathHW: pathHW },
    { id: 'court', name: 'Fountain Courtyard', color: '#ff9ec4',
      inWater: function (u, v) { return sq((u - FOUNT.u) / FOUNT.ru) + sq((v - FOUNT.v) / FOUNT.rv) < 1; },
      blocked: function (u, v) {
        if (sq((u - FOUNT.u) / (FOUNT.ru + 0.01)) + sq((v - FOUNT.v) / (FOUNT.rv + 0.01)) < 1) return true;
        return Math.abs(u - 0.5) < crossHW(v) + 0.006 || Math.abs(v - CROSS_V) < CROSS_VHW + 0.006;
      },
      nudge: function (u, v) {
        var du = Math.abs(u - 0.5) - crossHW(v), dv = Math.abs(v - CROSS_V) - CROSS_VHW;
        if (sq((u - FOUNT.u) / FOUNT.ru) + sq((v - FOUNT.v) / FOUNT.rv) < 1.2) { du = -1; dv = -1; }
        // step off the walk toward the nearest grass
        if (du < 0.02 && (dv >= 0.02 || du > dv)) u = 0.5 + (u < 0.5 ? -1 : 1) * (crossHW(v) + 0.03);
        if (Math.abs(v - CROSS_V) < CROSS_VHW + 0.02) v = CROSS_V + (v < CROSS_V ? -1 : 1) * (CROSS_VHW + 0.035);
        if (Math.abs(u - 0.5) < crossHW(v) + 0.02) u = 0.5 + (u < 0.5 ? -1 : 1) * (crossHW(v) + 0.03);
        return { u: u, v: v };
      },
      zones: {
        fountain: function (u, v) { return sq((u - FOUNT.u) / 0.3) + sq((v - FOUNT.v) / 0.26) < 1; },
        path: function (u, v) { var a = Math.abs(u - 0.5) - crossHW(v), b = Math.abs(v - CROSS_V) - CROSS_VHW; return (a >= 0 && a < 0.1) || (b >= 0 && b < 0.1); },
        arches: function (u, v) { return v < 0.2; }
      },
      fixed: [{ t: 'bigfountain', u: FOUNT.u, v: FOUNT.v }],
      fount: FOUNT, crossHW: crossHW, crossV: CROSS_V, crossVHW: CROSS_VHW }
  ];

  // ---------- 15 goal levels, 5 per area ----------
  // Each goal: plant n of item t (in zone z if given). Each goal met lights one star.
  function g(t, n, z) { return { t: t, n: n, z: z || null }; }
  var LEVELS = [
    // River Garden
    { area: 0, goals: [g('rose', 1), g('daisy', 1), g('butterfly', 1)] },
    { area: 0, goals: [g('tulip', 2), g('daisy', 2, 'river'), g('bush', 1)] },
    { area: 0, goals: [g('rose', 3, 'river'), g('palm', 1), g('bench', 1)] },
    { area: 0, goals: [g('lavender', 3, 'river'), g('palm', 2), g('birdhouse', 1)] },
    { area: 0, goals: [g('pond', 1), g('lantern', 2, 'river'), g('rose', 4)] },
    // Fruit Orchard
    { area: 1, goals: [g('apple', 2), g('daisy', 3), g('bench', 1, 'path')] },
    { area: 1, goals: [g('orange', 2, 'path'), g('butterfly', 2), g('bush', 2)] },
    { area: 1, goals: [g('pomegranate', 2), g('apple', 2, 'path'), g('birdhouse', 1)] },
    { area: 1, goals: [g('palm', 2, 'path'), g('lantern', 2, 'path'), g('tulip', 4)] },
    { area: 1, goals: [g('orange', 2), g('pomegranate', 2, 'path'), g('lavender', 4)] },
    // Fountain Courtyard
    { area: 2, goals: [g('rose', 2, 'fountain'), g('bench', 1), g('lantern', 1)] },
    { area: 2, goals: [g('tulip', 3, 'path'), g('bush', 2, 'arches'), g('butterfly', 1)] },
    { area: 2, goals: [g('palm', 2, 'arches'), g('lantern', 2, 'path'), g('daisy', 4, 'fountain')] },
    { area: 2, goals: [g('orange', 2, 'path'), g('bench', 2, 'fountain'), g('birdhouse', 1, 'arches')] },
    { area: 2, goals: [g('rose', 4, 'fountain'), g('lantern', 4, 'path'), g('pomegranate', 2, 'arches')] }
  ];

  var ZONE_WORDS = { river: 'by the river', path: 'by the path', fountain: 'by the fountain', arches: 'by the arches' };

  window.GARDEN = {
    ITEMS: ITEMS, BY_ID: BY_ID, AREAS: AREAS, LEVELS: LEVELS, ZONE_WORDS: ZONE_WORDS,
    WORLDS: AREAS.map(function (a, i) { return { name: a.name, color: a.color, from: i * 5 + 1, to: i * 5 + 5 }; }),
    areaOf: function (n) { return LEVELS[n - 1].area; },
    // How many of goal gl are met by items [{t, u, v}].
    count: function (gl, area, items) {
      var A = AREAS[area], z = gl.z ? A.zones[gl.z] : null, c = 0;
      for (var i = 0; i < items.length; i++) { var it = items[i]; if (it.t === gl.t && (!z || z(it.u, it.v))) c++; }
      return c;
    },
    sayGoal: function (gl) {
      var it = BY_ID[gl.t], nm = it.name.toLowerCase();
      var word = gl.n === 1 ? (/^[aeiou]/.test(nm) ? 'an ' : 'a ') + nm : gl.n + ' ' + (nm === 'butterfly' ? 'butterflies' : nm === 'bush' ? 'bushes' : nm + 's');
      return (it.kind === 'flower' || it.kind === 'tree' ? 'Plant ' : 'Put ') + word + (gl.z ? ' ' + ZONE_WORDS[gl.z] : '');
    },
    TAU: TAU
  };
})();
