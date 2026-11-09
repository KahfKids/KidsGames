/* Ramadan Maze: levels.js
   30 fixed levels in 3 worlds. Every maze is generated from its level number (seeded), so level 7 is always
   the same maze. Recursive-backtracker maze (a perfect maze: one route between any two cells), with a few
   extra openings in later worlds so there is more than one way round. Cells hold open sides as bits. */
(function () {
  'use strict';
  var N = 1, E = 2, S = 4, W = 8;
  var DIRS = [N, E, S, W];
  var DX = {}, DY = {}, OPP = {};
  DX[N] = 0; DY[N] = -1; OPP[N] = S;
  DX[E] = 1; DY[E] = 0; OPP[E] = W;
  DX[S] = 0; DY[S] = 1; OPP[S] = N;
  DX[W] = -1; DY[W] = 0; OPP[W] = E;

  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(a, R) { for (var i = a.length - 1; i > 0; i--) { var j = (R() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // [long side, short side]; the game turns the maze to match the screen (portrait or landscape).
  var SIZES = [
    [5, 5], [6, 5], [6, 6], [7, 6], [7, 7], [8, 6], [8, 7], [8, 8], [9, 7], [9, 8],
    [9, 9], [10, 8], [10, 9], [11, 8], [11, 9], [12, 9], [12, 10], [13, 9], [13, 10], [14, 10],
    [11, 9], [12, 9], [12, 10], [13, 10], [13, 11], [14, 11], [14, 12], [15, 11], [15, 12], [16, 12]
  ];
  var NAMES = [
    'First Steps', 'Little Garden', 'Palm Corner', 'Sandy Path', 'Date Grove', 'Shady Hedges', 'Well Walk', 'Garden Gate', 'Long Way Home', 'Sunset Garden',
    'Market Street', 'Bakery Lane', 'Blue Door', 'Fountain Square', 'Spice Alley', 'Twisty Lanes', 'Old Arches', 'Rooftop Steps', 'Clay Walls', 'Grand Bazaar',
    'First Lantern', 'Night Path', 'Starry Lanes', 'Glowing Tiles', 'Moonlit Court', 'Lantern Trail', 'Quiet Night', 'Mosaic Walls', 'Bright Lights', 'Iftar Night'
  ];

  function generate(n) {
    var size = SIZES[n - 1], cols = size[0], rows = size[1], world = Math.floor((n - 1) / 10), k = (n - 1) % 10;
    var R = rng(7919 * n + 1301);
    var cells = new Array(cols * rows);
    for (var i = 0; i < cells.length; i++) cells[i] = 0;
    function at(x, y) { return x >= 0 && y >= 0 && x < cols && y < rows; }
    function open(x, y, d) { cells[y * cols + x] |= d; cells[(y + DY[d]) * cols + x + DX[d]] |= OPP[d]; }

    // start in a corner
    var corners = [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]];
    var st = corners[(R() * 4) | 0];

    // recursive backtracker (iterative)
    var seen = new Uint8Array(cols * rows), stack = [[st[0], st[1]]];
    seen[st[1] * cols + st[0]] = 1;
    while (stack.length) {
      var c = stack[stack.length - 1], opts = [];
      for (var d = 0; d < 4; d++) {
        var dir = DIRS[d], nx = c[0] + DX[dir], ny = c[1] + DY[dir];
        if (at(nx, ny) && !seen[ny * cols + nx]) opts.push(dir);
      }
      if (!opts.length) { stack.pop(); continue; }
      var pick = opts[(R() * opts.length) | 0];
      open(c[0], c[1], pick);
      var tx = c[0] + DX[pick], ty = c[1] + DY[pick];
      seen[ty * cols + tx] = 1;
      stack.push([tx, ty]);
    }

    // the house goes on the cell farthest from the start (in a perfect maze that is always a dead end)
    var dist0 = bfs(cells, cols, rows, st[0], st[1]), far = 0;
    for (var j = 0; j < dist0.length; j++) if (dist0[j] > dist0[far]) far = j;
    var goal = [far % cols, Math.floor(far / cols)];

    // a few loops in later worlds (more ways round = gentler on bigger mazes); the house stays at a dead end
    if (world > 0) {
      var loops = Math.round(cols * rows * (world === 1 ? 0.045 : 0.06)), tries = 0;
      while (loops > 0 && tries++ < 500) {
        var lx = (R() * cols) | 0, ly = (R() * rows) | 0, ld = DIRS[(R() * 4) | 0], nx2 = lx + DX[ld], ny2 = ly + DY[ld];
        if (!at(nx2, ny2) || (cells[ly * cols + lx] & ld)) continue;
        if ((lx === goal[0] && ly === goal[1]) || (nx2 === goal[0] && ny2 === goal[1])) continue;
        open(lx, ly, ld);
        // keep the way home long: a loop may not cut the shortest route by more than a fifth
        if (bfs(cells, cols, rows, st[0], st[1])[far] < dist0[far] * 0.8) { cells[ly * cols + lx] &= ~ld; cells[ny2 * cols + nx2] &= ~OPP[ld]; continue; }
        loops--;
      }
    }
    var dist = bfs(cells, cols, rows, st[0], st[1]);
    far = goal[1] * cols + goal[0];

    // collectibles: dead ends first (exploring pays off), spread apart, never on start or house
    var nDates = world === 0 ? 3 + Math.floor(k / 2) : world === 1 ? 5 + Math.floor(k / 2.5) : 5 + Math.floor(k / 3);
    var nExtra = world === 0 ? 0 : world === 1 ? 2 + Math.floor(k / 5) : 3 + Math.floor(k / 4);
    var extraType = world === 1 ? 'cup' : 'lantern';
    var dead = [], other = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      if ((x === st[0] && y === st[1]) || (x === goal[0] && y === goal[1])) continue;
      var v = cells[y * cols + x], deg = (v & 1) + (v >> 1 & 1) + (v >> 2 & 1) + (v >> 3 & 1);
      if (Math.abs(x - st[0]) + Math.abs(y - st[1]) < 2) continue;
      (deg === 1 ? dead : other).push([x, y]);
    }
    shuffle(dead, R); shuffle(other, R);
    var pool = dead.concat(other), items = [], want = nDates + nExtra, gap = cols * rows > 40 ? 3 : 2;
    for (var pass = 0; pass < 2 && items.length < want; pass++) {
      for (var p = 0; p < pool.length && items.length < want; p++) {
        var q = pool[p], ok = true;
        for (var m = 0; m < items.length; m++) if (Math.abs(items[m].x - q[0]) + Math.abs(items[m].y - q[1]) < (pass ? 1 : gap)) { ok = false; break; }
        if (ok) items.push({ x: q[0], y: q[1] });
      }
    }
    // spread the extra items through the list so they are not all bunched at the dead ends
    items.forEach(function (it) { it.type = 'date'; });
    for (var e = 0; e < nExtra; e++) { var ix = Math.floor((e + 0.5) * items.length / nExtra); if (items[ix]) items[ix].type = extraType; }

    return { n: n, world: world, cols: cols, rows: rows, cells: cells, start: st, goal: goal, items: items, name: NAMES[n - 1],
             route: dist[far] };
  }

  function bfs(cells, cols, rows, sx, sy) {
    var dist = new Int32Array(cols * rows).fill(-1), q = [sy * cols + sx], h = 0;
    dist[q[0]] = 0;
    while (h < q.length) {
      var i = q[h++], x = i % cols, y = (i / cols) | 0, v = cells[i];
      for (var d = 0; d < 4; d++) {
        var dir = DIRS[d]; if (!(v & dir)) continue;
        var j = (y + DY[dir]) * cols + x + DX[dir];
        if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); }
      }
    }
    return dist;
  }

  // Turn a maze on its diagonal (swap x and y) so a wide maze stands tall on a portrait phone.
  function transpose(m) {
    var c2 = new Array(m.cells.length), T = {}; T[N] = W; T[W] = N; T[E] = S; T[S] = E;
    for (var y = 0; y < m.rows; y++) for (var x = 0; x < m.cols; x++) {
      var v = m.cells[y * m.cols + x], o = 0;
      for (var d = 0; d < 4; d++) if (v & DIRS[d]) o |= T[DIRS[d]];
      c2[x * m.rows + y] = o;
    }
    return { n: m.n, world: m.world, cols: m.rows, rows: m.cols, cells: c2, start: [m.start[1], m.start[0]], goal: [m.goal[1], m.goal[0]],
             items: m.items.map(function (it) { return { x: it.y, y: it.x, type: it.type }; }), name: m.name, route: m.route, flipped: !m.flipped };
  }

  window.MAZE_LEVELS = {
    count: SIZES.length, perWorld: 10, N: N, E: E, S: S, W: W, DIRS: DIRS, DX: DX, DY: DY, OPP: OPP,
    generate: generate, transpose: transpose, bfs: bfs, rng: rng,
    worldOf: function (n) { return Math.floor((n - 1) / 10); }
  };
})();
