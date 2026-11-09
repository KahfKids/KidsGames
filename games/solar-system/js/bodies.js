/* Solar System: bodies.js
   The Sun, the eight planets and the moons we show: sizes and distances (not to scale, so a child can see
   and tap them), motion, the procedural texture recipe for each, and one short fact line. */
(function () {
  'use strict';
  var A = window.SolarArt, fbm = A.fbm, noise = A.noise, smooth = A.smooth;
  var DEG = 180 / Math.PI;

  function put(T, i, r, g, b) { var j = i * 3; T.rgb[j] = r < 0 ? 0 : r > 255 ? 255 : r; T.rgb[j + 1] = g < 0 ? 0 : g > 255 ? 255 : g; T.rgb[j + 2] = b < 0 ? 0 : b > 255 ? 255 : b; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  // Colour by latitude from a list of [latDeg, r, g, b] stops (north to south).
  function bands(stops, lat) {
    if (lat >= stops[0][0]) return stops[0].slice(1);
    for (var i = 1; i < stops.length; i++) if (lat >= stops[i][0]) {
      var a = stops[i - 1], b = stops[i], t = (lat - b[0]) / (a[0] - b[0]);
      t = t * t * (3 - 2 * t);
      return [b[1] + (a[1] - b[1]) * t, b[2] + (a[2] - b[2]) * t, b[3] + (a[3] - b[3]) * t];
    }
    return stops[stops.length - 1].slice(1);
  }
  // Craters: a list of unit vectors with sizes; returns a brightness change for point p.
  function craterSet(seed, n, rmin, rmax) {
    var r = A.rng(seed), list = [];
    for (var i = 0; i < n; i++) {
      var z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), rad = rmin + Math.pow(r(), 2.2) * (rmax - rmin);
      list.push([s * Math.cos(a), z, s * Math.sin(a), rad, r() < 0.12]);
    }
    return function (x, y, z) {
      var k = 0;
      for (var i = 0; i < list.length; i++) {
        var c = list[i], dx = x - c[0], dy = y - c[1], dz = z - c[2], d2 = dx * dx + dy * dy + dz * dz, R = c[3];
        if (d2 > R * R * 6.5) { continue; }
        var d = Math.sqrt(d2) / R;
        if (d < 1) k -= 0.16 * (1 - d * d) - 0.05 * Math.exp(-d * d * 30);
        k += 0.2 * Math.exp(-(d - 1) * (d - 1) * 40);
        if (c[4] && d < 2.5) k += 0.05 * (1 - d / 2.5) * (0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 9)); // ray streaks
      }
      return k;
    };
  }

  // ---------- Earth's continents: a 72 x 36 map (5 degree cells), as land spans per row, north to south ----------
  var EARTH_ROWS = ['', '18-32,38-41,55-57', '12-21,22-32,38-41,47-49,55-60', '3-8,11-23,25-32,40-42,48-71',
    '0-1,3-19,20-22,25-31,38-71', '3-16,21-23,26-28,31-33,37-71', '4-16,20-24,34-35,37-39,41-63,67-68',
    '10-17,19-25,34-35,36-63,67', '11-25,35-44,47-64', '11-23,34-40,44,47-61,64', '11-21,34-35,38-44,47-61,63-64',
    '12-20,34-60,62', '13-15,19,33-44,47-60', '14-16,19-21,32-47,49-59', '15-18,21-22,32-43,44-46,50-53,55-57,60',
    '17-19,32-45,51-52,55-57,60', '20-23,33-46,52,55-56,60-61', '20-26,37-45,55-56,57-59,60', '20-29,37-43,55-60,62-65',
    '20-29,38-43,57-58,64-65', '20-28,38-43,44-45,62-64', '22-27,38-42,44-45,60-65', '22-27,38-42,45,58-65',
    '21-26,39-42,58-66', '21-25,39-41,59-66', '21-24,64-65,70-71', '21-23,65,69-71', '21-22,69', '21', '', '24',
    '22-23,36-67', '6-23,32-67', '0-25,30-71', '0-71', '0-71'];
  var LAND = new Uint8Array(72 * 36);
  EARTH_ROWS.forEach(function (row, y) {
    row.split(',').forEach(function (sp) {
      if (!sp) return;
      var ab = sp.split('-'), a = +ab[0], b = ab.length > 1 ? +ab[1] : a;
      for (var x = a; x <= b; x++) LAND[y * 72 + x] = 1;
    });
  });
  // soften the 5 degree steps so coasts come out round (islands of one cell survive the 0.35 threshold)
  var LANDF = new Float32Array(72 * 36);
  for (var yy = 0; yy < 36; yy++) for (var xx = 0; xx < 72; xx++) {
    var sum = 0, wt = 0;
    for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
      var y2 = yy + oy; if (y2 < 0 || y2 > 35) continue;
      var wk = ox === 0 && oy === 0 ? 8 : (ox === 0 || oy === 0) ? 2 : 1;
      sum += LAND[y2 * 72 + ((xx + ox + 72) % 72)] * wk; wt += wk;
    }
    LANDF[yy * 72 + xx] = sum / wt;
  }
  function land(mx, my) {
    my = Math.max(0, Math.min(35, my));
    var x0 = Math.floor(mx), y0 = Math.floor(my), fx = mx - x0, fy = my - y0, y1 = Math.min(35, y0 + 1);
    var xa = ((x0 % 72) + 72) % 72, xb = (xa + 1) % 72;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = LANDF[y0 * 72 + xa] + (LANDF[y0 * 72 + xb] - LANDF[y0 * 72 + xa]) * fx;
    var b = LANDF[y1 * 72 + xa] + (LANDF[y1 * 72 + xb] - LANDF[y1 * 72 + xa]) * fx;
    return a + (b - a) * fy;
  }

  var GEN = {
    sun: function (T, i, x, y, z) {
      var g = fbm(x * 9, y * 9, z * 9, 3), g2 = noise(x * 34, y * 34, z * 34);
      var k = 0.8 + 0.28 * g + 0.1 * g2;
      put(T, i, 255 * k, 178 * k + 20 * g2, 70 * k);
    },
    mercury: function (T, i, x, y, z) {
      var n = fbm(x * 3, y * 3, z * 3, 5), k = 0.78 + 0.4 * (n - 0.5) + T.cr(x, y, z);
      put(T, i, 158 * k, 146 * k, 134 * k);
    },
    venus: function (T, i, x, y, z, lat) {
      var w = fbm(x * 2 + 5, y * 2, z * 2, 3);
      var n = fbm(x * 1.6 + w * 1.4, y * 5.5 + w * 2.2, z * 1.6, 5);
      var c = mixc([196, 150, 92], [250, 230, 186], smooth(0.3, 0.72, n));
      var v = 0.94 + 0.08 * Math.cos(lat * 6 + w * 4);
      put(T, i, c[0] * v, c[1] * v, c[2] * v);
    },
    earth: function (T, i, x, y, z, lat, lon) {
      var ld = lat * DEG, lo = lon * DEG - 180, al = Math.abs(ld);
      var dx = (fbm(x * 3, y * 3, z * 3, 3) - 0.5) * 2.6, dy = (fbm(x * 3 + 40, y * 3, z * 3, 3) - 0.5) * 1.8;
      var m = land((lo + 180) / 5 - 0.5 + dx, (90 - ld) / 5 - 0.5 + dy) + (fbm(x * 9, y * 9, z * 9, 2) - 0.5) * 0.5;
      var det = fbm(x * 14 + 3, y * 14, z * 14, 3);
      var c, isLand = m > 0.36;
      if (isLand) {
        var moist = fbm(x * 2.5 + 20, y * 2.5, z * 2.5, 3) + 0.18 * (1 - smooth(8, 16, al)) - 0.16 * smooth(12, 19, al) * (1 - smooth(31, 38, al)) + 0.14 * smooth(40, 50, al);
        var forest = mixc([32, 98, 40], [62, 112, 48], smooth(16, 28, al)), grass = mixc([132, 132, 70], [88, 112, 58], smooth(24, 36, al));
        c = mixc([204, 172, 112], grass, smooth(0.39, 0.47, moist));
        c = mixc(c, forest, smooth(0.51, 0.6, moist));
        if (al > 50) c = mixc(c, [118, 112, 92], smooth(52, 64, al));
        var hgt = smooth(0.62, 0.8, det);
        c = mixc(c, [126, 104, 84], hgt * 0.6);
        var kd = 0.88 + 0.24 * det; c = [c[0] * kd, c[1] * kd, c[2] * kd];
        if (ld < -62 || al > 70) c = mixc(c, [238, 243, 250], smooth(al > 70 ? 70 : 62, al > 70 ? 74 : 66, al));
        T.ocean[i] = 0;
        var cityN = noise(x * 60, y * 60, z * 60);
        T.lights[i] = (al < 58 && moist > 0.42 && ld > -50 && cityN > 0.7) ? Math.min(255, (cityN - 0.7) * 1100) : 0;
      } else {
        var shallow = smooth(0.08, 0.36, m);
        c = mixc([8, 34, 96], [24, 96, 158], shallow * 0.85 + det * 0.15);
        if (al > 72) c = mixc(c, [225, 235, 245], smooth(72, 80, al)); // sea ice
        T.ocean[i] = al > 74 ? 0 : 255;
        T.lights[i] = 0;
      }
      put(T, i, c[0], c[1], c[2]);
      // clouds: curly fronts, more at the equator and mid-latitude storm tracks, fewer over the deserts
      var wx = fbm(x * 2 + 9, y * 2, z * 2, 2), wy = fbm(x * 2, y * 2 + 9, z * 2, 2);
      var cn = fbm(x * 2.4 + wx * 2.2, y * 4.2 + wy * 2.2, z * 2.4, 4);
      var band = 0.08 * (1 - smooth(4, 12, al)) - 0.08 * smooth(13, 20, al) * (1 - smooth(29, 36, al)) + 0.06 * smooth(38, 46, al) * (1 - smooth(62, 70, al));
      T.cloud[i] = 255 * 0.92 * smooth(0.5, 0.72, cn + band);
    },
    moon: function (T, i, x, y, z) {
      var m = fbm(x * 1.7 + 7, y * 1.7, z * 1.7, 4), d = fbm(x * 8, y * 8, z * 8, 3);
      var c = mixc([92, 92, 98], [178, 175, 168], smooth(0.4, 0.5, m));
      var k = 0.9 + 0.2 * d + T.cr(x, y, z);
      put(T, i, c[0] * k, c[1] * k, c[2] * k);
    },
    mars: function (T, i, x, y, z, lat) {
      var n = fbm(x * 2.6, y * 2.6, z * 2.6, 5), d = fbm(x * 10, y * 10, z * 10, 3);
      var c = n < 0.45 ? mixc([104, 52, 34], [168, 84, 48], smooth(0.36, 0.45, n)) : mixc([168, 84, 48], [214, 124, 72], smooth(0.45, 0.62, n));
      var k = 0.9 + 0.2 * d + T.cr(x, y, z) * 0.5;
      c = [c[0] * k, c[1] * k, c[2] * k];
      var al = Math.abs(lat * DEG);
      c = mixc(c, [244, 240, 236], smooth(72, 78, al + (n - 0.5) * 10));
      put(T, i, c[0], c[1], c[2]);
    },
    jupiter: function (T, i, x, y, z, lat, lon) {
      var ld = lat * DEG;
      var turb = (fbm(x * 5, y * 5, z * 5, 4) - 0.5) * 5 + (fbm(x * 10, y * 34, z * 10, 4) - 0.5) * 3.2;
      var c = bands(T.pal, ld + turb);
      var k = 0.9 + 0.18 * fbm(x * 7 + 2, y * 22, z * 7, 4);
      c = [c[0] * k, c[1] * k, c[2] * k];
      // the Great Red Spot: one big oval storm in the south
      var dl = ld + 22, dlo = Math.atan2(Math.sin(lon - 1.2), Math.cos(lon - 1.2)) * DEG * Math.cos(lat);
      var e = Math.sqrt((dlo / 12) * (dlo / 12) + (dl / 6.5) * (dl / 6.5));
      if (e < 1.5) {
        var sw = 0.95 + 0.06 * Math.sin(e * 7);
        var spot = mixc([196, 92, 58], [232, 196, 160], smooth(0.75, 1.15, e));
        c = mixc([spot[0] * sw, spot[1] * sw, spot[2] * sw], c, smooth(1.05, 1.5, e));
      }
      put(T, i, c[0], c[1], c[2]);
    },
    saturn: function (T, i, x, y, z, lat) {
      var ld = lat * DEG, turb = (fbm(x * 4, y * 30, z * 4, 4) - 0.5) * 3;
      var c = bands(T.pal, ld + turb), k = 0.95 + 0.08 * fbm(x * 6, y * 20, z * 6, 3);
      put(T, i, c[0] * k, c[1] * k, c[2] * k);
    },
    uranus: function (T, i, x, y, z, lat) {
      var ld = lat * DEG, k = 0.97 + 0.04 * Math.sin(ld / 7 + fbm(x * 3, y * 12, z * 3, 3) * 2) + 0.05 * smooth(50, 85, ld);
      put(T, i, 168 * k, 222 * k, 230 * k);
    },
    neptune: function (T, i, x, y, z, lat, lon) {
      var ld = lat * DEG, turb = (fbm(x * 4, y * 18, z * 4, 4) - 0.5) * 6;
      var c = bands([[90, 62, 98, 200], [40, 66, 110, 222], [10, 74, 124, 232], [-12, 62, 104, 214], [-28, 48, 82, 192], [-50, 66, 108, 218], [-90, 60, 96, 200]], ld + turb);
      var dl = ld + 22, dlo = Math.atan2(Math.sin(lon - 3.5), Math.cos(lon - 3.5)) * DEG * Math.cos(lat);
      var e = Math.sqrt((dlo / 10) * (dlo / 10) + (dl / 6) * (dl / 6));
      if (e < 1.3) c = mixc([30, 46, 128], c, smooth(0.7, 1.3, e));
      var streak = fbm(x * 3, y * 26, z * 3, 4);
      var wsk = smooth(0.62, 0.74, streak) * (Math.exp(-Math.pow((ld + 33) / 5, 2)) + Math.exp(-Math.pow((ld - 26) / 4, 2)) + 0.5 * Math.exp(-Math.pow((ld + 14) / 3, 2)));
      c = mixc(c, [235, 245, 255], Math.min(0.85, wsk));
      put(T, i, c[0], c[1], c[2]);
    },
    io: function (T, i, x, y, z) {
      var n = fbm(x * 4, y * 4, z * 4, 4), s = noise(x * 11, y * 11, z * 11);
      var c = mixc([214, 190, 84], [244, 234, 176], smooth(0.45, 0.7, n));
      if (s > 0.74) c = mixc(c, s > 0.84 ? [52, 34, 22] : [214, 110, 40], smooth(0.74, 0.8, s));
      put(T, i, c[0], c[1], c[2]);
    },
    europa: function (T, i, x, y, z) {
      var n = fbm(x * 3, y * 3, z * 3, 4), l1 = Math.abs(noise(x * 5, y * 5, z * 5) - 0.5), l2 = Math.abs(noise(x * 9 + 3, y * 9, z * 9) - 0.5);
      var c = mixc([196, 170, 140], [236, 226, 210], smooth(0.35, 0.6, n));
      c = mixc(c, [150, 84, 56], Math.max(smooth(0.03, 0.0, l1) * 0.8, smooth(0.025, 0.0, l2) * 0.5));
      put(T, i, c[0], c[1], c[2]);
    },
    ganymede: function (T, i, x, y, z) {
      var n = fbm(x * 2.5, y * 2.5, z * 2.5, 5), k = 0.95 + T.cr(x, y, z) * 0.8;
      var c = mixc([104, 94, 84], [190, 180, 166], smooth(0.42, 0.55, n));
      put(T, i, c[0] * k, c[1] * k, c[2] * k);
    },
    callisto: function (T, i, x, y, z) {
      var n = fbm(x * 4, y * 4, z * 4, 4), s = noise(x * 30, y * 30, z * 30);
      var c = mixc([70, 60, 52], [120, 108, 94], n);
      if (s > 0.8) c = mixc(c, [220, 214, 204], smooth(0.8, 0.9, s));
      put(T, i, c[0], c[1], c[2]);
    },
    titan: function (T, i, x, y, z, lat) {
      var n = fbm(x * 2, y * 6, z * 2, 3), k = 0.92 + 0.12 * n - 0.06 * Math.exp(-Math.pow(lat * DEG / 20, 2));
      put(T, i, 222 * k, 158 * k, 72 * k);
    }
  };

  var JUP = [[90, 150, 140, 130], [62, 168, 150, 126], [46, 214, 196, 166], [38, 178, 128, 92], [30, 232, 216, 190],
    [22, 168, 104, 70], [13, 206, 160, 120], [7, 240, 228, 205], [0, 236, 220, 196], [-6, 240, 226, 202], [-11, 190, 128, 88],
    [-19, 176, 116, 80], [-26, 232, 218, 192], [-33, 186, 142, 106], [-42, 220, 200, 170], [-56, 176, 156, 130], [-90, 150, 140, 130]];
  var SAT = [[90, 150, 160, 168], [72, 176, 170, 140], [52, 214, 194, 150], [36, 226, 206, 160], [22, 236, 216, 170],
    [8, 242, 224, 178], [0, 238, 220, 172], [-10, 222, 198, 150], [-24, 232, 212, 166], [-40, 214, 194, 150], [-60, 200, 180, 140], [-90, 182, 166, 132]];

  // id, name, radius (units), orbit radius (units; moons: parent radii), orbit period (s at normal speed), spin period (s),
  // viewTilt/tilt (deg) for the picture frame, kind (shading), texture size, base colour, halo, fact
  var B = [
    { id: 'sun', name: 'the Sun', short: 'Sun', r: 0.75, orbit: 0, spin: 50, vt: 10, tilt: 0, kind: 'sun', tw: 256, th: 128, base: [255, 196, 90],
      fact: 'The Sun is a star. Allah made it to give us light and warmth.' },
    { id: 'mercury', name: 'Mercury', r: 0.16, orbit: 1.75, a0: 0.5, spin: 40, vt: 14, tilt: 2, kind: 'rock', tw: 256, th: 128, base: [150, 140, 128], craters: [11, 60, 0.05, 0.3],
      fact: 'Mercury is the smallest planet, and the closest to the Sun.' },
    { id: 'venus', name: 'Venus', r: 0.24, orbit: 2.45, a0: 2.7, spin: -70, vt: 14, tilt: 3, kind: 'haze', tw: 256, th: 128, base: [232, 200, 140], halo: '255,220,160',
      fact: 'Venus is the hottest planet. It is wrapped in thick clouds.' },
    { id: 'earth', name: 'Earth', r: 0.25, orbit: 3.15, a0: 4.5, spin: 16, vt: 16, tilt: 22, kind: 'earth', tw: 512, th: 256, base: [40, 90, 160], halo: '120,180,255',
      extra: ['cloud', 'ocean', 'lights'], fact: 'Earth is our home, with water, air and life.' },
    { id: 'moon', name: 'the Moon', short: 'Moon', parent: 'earth', r: 0.08, orbit: 3.4, a0: 1, period: 10, spin: 10, vt: 10, tilt: 0, kind: 'rock', tw: 256, th: 128, base: [160, 158, 152], craters: [21, 50, 0.04, 0.22],
      fact: 'The Moon goes around the Earth and lights up our night.' },
    { id: 'mars', name: 'Mars', r: 0.19, orbit: 3.85, a0: 1.5, spin: 17, vt: 14, tilt: 25, kind: 'rock', tw: 256, th: 128, base: [190, 96, 56], craters: [31, 30, 0.04, 0.16],
      fact: 'Mars is the red planet. It is dusty, rocky and cold.' },
    { id: 'jupiter', name: 'Jupiter', r: 0.62, orbit: 5.9, a0: 3.6, spin: 9, vt: 12, tilt: 3, kind: 'gas', tw: 512, th: 256, base: [214, 186, 150], pal: JUP,
      fact: 'Jupiter is the biggest planet. Its red spot is a giant storm.' },
    { id: 'io', name: 'Io', parent: 'jupiter', r: 0.065, orbit: 1.5, a0: 0.3, period: 5, spin: 5, vt: 10, tilt: 0, kind: 'rock', tw: 128, th: 64, base: [226, 204, 104],
      fact: 'Io is a moon of Jupiter. It has lots of volcanoes.' },
    { id: 'europa', name: 'Europa', parent: 'jupiter', r: 0.055, orbit: 1.85, a0: 2.4, period: 7, spin: 7, vt: 10, tilt: 0, kind: 'rock', tw: 128, th: 64, base: [222, 208, 186],
      fact: 'Europa is an icy moon of Jupiter.' },
    { id: 'ganymede', name: 'Ganymede', parent: 'jupiter', r: 0.085, orbit: 2.25, a0: 4.2, period: 10, spin: 10, vt: 10, tilt: 0, kind: 'rock', tw: 128, th: 64, base: [150, 140, 128], craters: [41, 24, 0.05, 0.2],
      fact: 'Ganymede is the biggest moon of all.' },
    { id: 'callisto', name: 'Callisto', parent: 'jupiter', r: 0.08, orbit: 2.7, a0: 5.6, period: 15, spin: 15, vt: 10, tilt: 0, kind: 'rock', tw: 128, th: 64, base: [96, 86, 74],
      fact: 'Callisto is an old moon covered in craters.' },
    { id: 'saturn', name: 'Saturn', r: 0.52, orbit: 7.45, a0: 0.9, spin: 10, vt: 24, tilt: -9, kind: 'gas', tw: 512, th: 256, base: [228, 206, 160], pal: SAT, ring: true,
      fact: 'Saturn has beautiful rings made of ice and rock.' },
    { id: 'titan', name: 'Titan', parent: 'saturn', r: 0.08, orbit: 2.75, a0: 2, period: 12, spin: 12, vt: 10, tilt: 0, kind: 'haze', tw: 128, th: 64, base: [220, 158, 72], halo: '255,190,110',
      fact: 'Titan is the biggest moon of Saturn. Its air is thick and orange.' },
    { id: 'uranus', name: 'Uranus', r: 0.37, orbit: 8.9, a0: 5.3, spin: -12, vt: 14, tilt: 84, kind: 'ice', tw: 256, th: 128, base: [170, 222, 230], halo: '170,235,255',
      fact: 'Uranus is an icy planet that spins on its side.' },
    { id: 'neptune', name: 'Neptune', r: 0.355, orbit: 10.1, a0: 2.2, spin: 11, vt: 14, tilt: 26, kind: 'ice', tw: 256, th: 128, base: [64, 110, 220], halo: '110,150,255',
      fact: 'Neptune is the farthest planet. It is cold, blue and very windy.' }
  ];
  var PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  var byId = {};
  B.forEach(function (b) {
    byId[b.id] = b;
    if (!b.short) b.short = b.name;
    b.order = PLANETS.indexOf(b.id) + 1; // 1..8, 0 for the Sun and moons
    // Kepler-like timing: inner planets go round faster. Earth takes 40 s at normal speed.
    if (!b.parent && b.orbit) b.period = 40 * Math.pow(b.orbit / 3.15, 1.5);
    b.basis = A.bodyBasis(b.vt, b.tilt);
    b.gen = GEN[b.id];
  });
  // Textures are created when first needed (cheap objects; the pixels are filled a few rows per frame).
  function texture(b) {
    if (b.texture) return b.texture;
    b.texture = A.makeTexture({ w: b.tw, h: b.th, base: b.base, extra: b.extra, gen: b.gen, init: function (T) {
      if (b.craters) { var c = b.craters; T.cr = craterSet(c[0], c[1], c[2], c[3]); } else T.cr = function () { return 0; };
      T.pal = b.pal;
    } });
    return b.texture;
  }

  window.SolarBodies = { list: B, byId: byId, planets: PLANETS, texture: texture };
})();
