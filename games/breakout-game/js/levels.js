/* Mosaic Breaker: levels.js
   30 levels in 3 worlds, 11 columns wide.
   .  empty      1-5  glazed tile (one hit), colour 1-5 of the world's palette
   a-e  strong tile (two hits)   G  gold tile (three hits)   #  carved stone (can't break, not needed to win)
   Breakable shapes are geometric patterns, plants, lanterns and animals (no sacred buildings or symbols). */
(function () {
  'use strict';
  var COLS = 11;

  function grid(fn, rows) { var out = []; for (var r = 0; r < rows; r++) { var s = ''; for (var c = 0; c < COLS; c++) s += fn(c, r) || '.'; out.push(s); } return out; }
  var col = function (n) { return String(1 + (((n % 5) + 5) % 5)); };
  var strong = function (n) { return 'abcde'[((n % 5) + 5) % 5]; };

  var L = [
    // ---- World 1: Desert Night (gentle start) ----
    { name: 'First Tiles', rows: [
      '...........',
      '.111111111.',
      '.222222222.',
      '.333333333.'] },
    { name: 'Pyramid', rows: [
      '....111....',
      '...22222...',
      '..3333333..',
      '.444444444.'] },
    { name: 'Palm Tree', rows: [
      '..55...55..',
      '.555.5.555.',
      '...55555...',
      '....555....',
      '.....3.....',
      '.....3.....',
      '....333....'] },
    { name: 'Eight-Point Star', rows: [
      '.....4.....',
      '....444....',
      '..4444444..',
      '..4422244..',
      '.444222444.',
      '..4422244..',
      '..4444444..',
      '....444....',
      '.....4.....'] },
    { name: 'Strong Wall', rows: [
      '.aaaaaaaaa.',
      '22222222222',
      '33333333333'] },
    { name: 'Lantern', rows: [
      '.....5.....',
      '....111....',
      '...1aaa1...',
      '..1a333a1..',
      '..1a333a1..',
      '..1a333a1..',
      '...1aaa1...',
      '....111....',
      '.....5.....'] },
    { name: 'Palace Gate', rows: [
      '.333333333.',
      '.3.......3.',
      '.3.11111.3.',
      '.3.1...1.3.',
      '.3.1.5.1.3.',
      '.3.1...1.3.',
      '.3.11111.3.',
      '.333.5.333.'] },
    { name: 'Checkerboard', rows: [
      '1.2.3.4.5.1',
      '.2.3.4.5.1.',
      '2.3.4.5.1.2',
      '.3.4.5.1.2.',
      '3.4.5.1.2.3'] },
    { name: 'Chevrons', rows: [
      '1.........1',
      '21.......12',
      '321.....123',
      '.321...123.',
      '..321.123..',
      '...32123...',
      '....323....',
      '.....3.....'] },
    { name: 'Golden Heart of the Desert', rows: [
      'aaaaaaaaaaa',
      'a222222222a',
      'a2.......2a',
      'a2..GGG..2a',
      'a2..GGG..2a',
      'a2.......2a',
      'a222222222a',
      'aaaaaaaaaaa'] },

    // ---- World 2: Garden Dawn ----
    { name: 'Rose', rows: [
      '....444....',
      '...44444...',
      '..1144411..',
      '.111aGa111.',
      '..1144411..',
      '...44444...',
      '....444....',
      '.....3.....',
      '....333....'] },
    { name: 'Arcade', rows: [
      'bbbbbbbbbbb',
      '22222222222',
      '2.2.2.2.2.2',
      '2.2.2.2.2.2',
      '33333333333'] },
    { name: 'Butterfly', rows: [
      '44.......44',
      '424.....424',
      '4b44...44b4',
      '44244.44244',
      '..4422244..',
      '...22G22...',
      '..1122211..',
      '.111...111.',
      '111.....111'] },
    { name: 'Twin Gems', rows: [
      '..1.....1..',
      '.1c1...1c1.',
      '1c3c1.1c3c1',
      '.1c1...1c1.',
      '..1.....1..',
      '.....G.....',
      '....GGG....',
      '.....G.....'] },
    { name: 'Mosaic Stripes', rows: [
      '1a1a1a1a1a1',
      '22222222222',
      '3c3c3c3c3c3',
      '44444444444'] },
    { name: 'Fountain', rows: [
      '.....3.....',
      '....3.3....',
      '...3...3...',
      '..3..4..3..',
      '.....4.....',
      '..aaaaaaa..',
      '.a1111111a.',
      'aaaaaaaaaaa'] },
    { name: 'Cypress', rows: [
      '.....5.....',
      '....555....',
      '....555....',
      '...55555...',
      '...5e5e5...',
      '..5555555..',
      '..55e5e55..',
      '....###....'] },
    { name: 'Goldfish', rows: [
      '...dddd....',
      '..d4444d..d',
      '.d444444dd.',
      'd4G444444d.',
      '.d444444dd.',
      '..d4444d..d',
      '...dddd....'] },
    { name: 'Garden Walls', rows: [
      '11111111111',
      '##.......##',
      '22222222222',
      '..##...##..',
      '33333333333',
      '#...###...#',
      '44444444444'] },
    { name: 'Sunrise Star', rows: [
      '....eee....',
      '...e555e...',
      '.ee55555ee.',
      'e555GGG555e',
      'e55GG.GG55e',
      'e555GGG555e',
      '.ee55555ee.',
      '...e555e...',
      '....eee....'] },

    // ---- World 3: Sea Palace ----
    { name: 'Waves', rows: grid(function (c, r) {
      var y = 3.5 + 2.6 * Math.sin(c * 0.75);
      return Math.abs(r - y) < 1.1 ? col(r < y ? 1 : 0) : (Math.abs(r - y - 3) < 0.7 ? col(3) : null);
    }, 9) },
    { name: 'Sea Castle', rows: [
      '.....G.....',
      '....ddd....',
      '...d333d...',
      '..d33333d..',
      '.#1111111#.',
      '.#1a1.1a1#.',
      '.#1a1.1a1#.',
      '.#1111111#.'] },
    { name: 'Ripples', rows: grid(function (c, r) {
      var d = Math.abs(c - 5) + Math.abs(r - 4);
      if (d > 6 || d % 2) return null;
      return d === 0 ? 'G' : d === 6 ? strong(1) : col(d / 2 + 1);
    }, 9) },
    { name: 'Dhow', rows: [
      '.....4.....',
      '....44.....',
      '...444.....',
      '..4444.....',
      '.44444.5...',
      '.....1.....',
      'aaaaaaaaaa.',
      '.aaaaaaaaa.',
      '..aaaaaaa..'] },
    { name: 'Tiled Courtyard', rows: grid(function (c, r) {
      return (c + r) % 2 ? strong(r) : col(c + r);
    }, 7) },
    { name: 'Lantern Festival', rows: [
      '.5...5...5.',
      '111.111.111',
      '1a1.1a1.1a1',
      '1G1.1a1.1G1',
      '1a1.1a1.1a1',
      '111.111.111',
      '.5...5...5.'] },
    { name: 'Stone Maze', rows: [
      '1111###1111',
      '2.........2',
      '2..#aaa#..2',
      '2...333...2',
      '2..#aaa#..2',
      '2.........2',
      '333.....333'] },
    { name: 'Rosette', rows: grid(function (c, r) {
      var x = c - 5, y = (r - 4) * 1.15, ax = Math.abs(x), ay = Math.abs(y);
      var inStar = (ax + ay <= 6) || (Math.max(ax, ay) <= 4.3);
      if (!inStar) return null;
      var d = Math.max(ax + ay, Math.max(ax, ay) * 1.3);
      return d < 1.5 ? 'G' : d < 3 ? col(2) : d < 4.7 ? strong(3) : col(1);
    }, 9) },
    { name: 'Great Wall of Tiles', rows: grid(function (c, r) {
      if (r < 2) return strong(c);
      return (c * 3 + r) % 9 === 0 ? 'G' : col(r + c);
    }, 8) },
    { name: 'Palace of Stars', rows: [
      'G.e.e.e.e.G',
      '.e5e5e5e5e.',
      'e5GGGGGGG5e',
      '.e5G333G5e.',
      'e5.G3G3G.5e',
      '.e5G333G5e.',
      'e5GGGGGGG5e',
      '.e5e5e5e5e.',
      'G.e.e.e.e.G'] }
  ];

  // Normalise every row to exactly 11 columns.
  L.forEach(function (lv) { lv.rows = lv.rows.map(function (s) { s = s.slice(0, COLS); while (s.length < COLS) s += '.'; return s; }); });

  window.MOSAIC_LEVELS = {
    cols: COLS,
    list: L,
    worldOf: function (n) { return Math.floor((n - 1) / 10); },
    // Ball speed (game units/s), carpet width and power-up chance per level.
    tuning: function (n) {
      var w = Math.floor((n - 1) / 10), k = ((n - 1) % 10) / 9;
      return { speed: [600, 740, 840][w] + k * [110, 110, 120][w], carpet: [330, 290, 260][w] - k * 20, drop: [0.16, 0.14, 0.13][w] };
    }
  };
})();
