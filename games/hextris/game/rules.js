/* Hextris (Kahf Kids edition): game/rules.js
   The rules of the game and nothing else: no Phaser, no drawing, so they can be tried in Node.
   Based on Hextris by Logan Engstrom and Garrett Finucane (https://github.com/Hextris/hextris), free software under
   the GNU General Public License v3 (see LICENSE.md in this folder). The core rules are theirs: six lanes, stacks that
   turn with the hexagon, flood-fill matching of 3+ touching same-colour tiles across neighbouring sides and rows,
   collapsing stacks and timed combos. This version is also released under the GNU GPL v3.

   Vocabulary: a lane is a fixed direction on the screen (0 = straight up, then clockwise); a side is a face of the
   turning hexagon; `rot` is how many sixths the hexagon has turned, so lane l lands on side (l - rot) mod 6.
   A stack is an array per side of cells { c: colour, del: being cleared, settled: sitting in its slot }.
   Why this is game code and not the engine's: it is a grid rule (which stack a lane feeds, which cells touch across a
   corner), not a collision between shapes. Arcade or Matter would add a body per tile and still need this table. */
(function () {
  'use strict';
  var SQ3 = Math.sqrt(3);
  // geometry in field units (the medallion sits at 0,0): apothem of the centre hexagon, height of a tile, rows allowed
  var SIDE = 56, A0 = SIDE * SQ3 / 2, BH = 26, ROWS = 6, LIMIT = A0 + ROWS * BH, SPAWN = LIMIT + 7, RIM = SPAWN + BH + 10;
  var GEO = { side: SIDE, a0: A0, bh: BH, rows: ROWS, limit: LIMIT, spawn: SPAWN, rim: RIM };

  function side(lane, rot) { return ((lane - rot) % 6 + 6) % 6; }
  function liveCount(st) { var n = 0; for (var i = 0; i < st.length; i++) if (!st[i].del) n++; return n; }
  function neighbours(s, j) { return [[(s + 1) % 6, j], [(s + 5) % 6, j], [s, j + 1], [s, j - 1]]; }

  // Size of the group a tile of colour c would make if it landed on side s now (patterns adapted from Hextris' wave generator).
  function groupIf(stacks, s, c) {
    var j = stacks[s].length, seen = {}, list = [[s, j]], n = 0;
    seen[s + ',' + j] = 1;
    while (list.length) {
      var p = list.pop(); n++;
      var nb = neighbours(p[0], p[1]);
      for (var i = 0; i < 4; i++) {
        var a = nb[i], t = stacks[a[0]][a[1]], key = a[0] + ',' + a[1];
        if (!t || seen[key] || t.del || t.c !== c) continue;
        seen[key] = 1; list.push(a);
      }
    }
    return n;
  }

  // Colour for a new tile in this lane. With chance cfg.help it is a colour that clears somewhere else, so turning the
  // medallion to the right spot is rewarded. Otherwise it is random, but (chance cfg.avoid) not a colour that would
  // clear right where it falls: matches come from turning, not from waiting.
  function pickColor(stacks, cfg, lane, rot) {
    var n = cfg.colors, s0 = side(lane, rot), c, i;
    if (Math.random() < cfg.help) {
      var good = [];
      for (var s = 0; s < 6; s++) if (s !== s0) for (c = 0; c < n; c++) if (groupIf(stacks, s, c) >= 3 && groupIf(stacks, s0, c) < 3) good.push(c);
      if (good.length) return good[(Math.random() * good.length) | 0];
    }
    for (i = 0; i < 4; i++) { c = (Math.random() * n) | 0; if (Math.random() >= cfg.avoid || groupIf(stacks, s0, c) < 3) return c; }
    return c;
  }
  function pickPattern(cfg) {
    var tot = 0, p = cfg.patterns, k;
    for (k in p) tot += p[k];
    var r = Math.random() * tot;
    for (k in p) { r -= p[k]; if (r <= 0) return k; }
    return 'single';
  }
  // One drop: { items: [{ t: seconds after the drop, lane, c }], cost: how many "gaps" of waiting it earns }
  function spawn(stacks, cfg, rot) {
    var name = pickPattern(cfg), l = (Math.random() * 6) | 0, c = pickColor(stacks, cfg, l, rot), cost = 1, q = [];
    var pc = function (lane) { return pickColor(stacks, cfg, lane, rot); };
    if (name === 'single') q.push({ t: 0, lane: l, c: c });
    else if (name === 'double') { q.push({ t: 0, lane: l, c: c }, { t: 0, lane: (l + 1) % 6, c: Math.random() < 0.5 ? c : pc((l + 1) % 6) }); cost = 1.5; }
    else if (name === 'cross') { q.push({ t: 0, lane: l, c: c }, { t: 0, lane: (l + 3) % 6, c: c }); cost = 1.5; }
    else if (name === 'half') { var c2 = Math.random() < 0.5 ? c : pc((l + 1) % 6); q.push({ t: 0, lane: l, c: c }, { t: 0, lane: (l + 1) % 6, c: c2 }, { t: 0, lane: (l + 2) % 6, c: c }); cost = 2.1; }
    else if (name === 'spiral') { var dir = Math.random() < 0.5 ? 1 : -1; for (var i = 0; i < 4; i++) q.push({ t: i * 0.5, lane: (l + dir * i + 12) % 6, c: i % 2 ? pc((l + dir * i + 12) % 6) : c }); cost = 2.6; }
    else if (name === 'ring') { var cc = [c, pc((l + 1) % 6)]; for (var j = 0; j < 6; j++) q.push({ t: 0, lane: j, c: cc[j % 2] }); cost = 3.2; }
    return { items: q, cost: cost };
  }

  // The group of 3 or more settled, same-colour, live cells touching the cell at (s, j); [] when there is none.
  function group(stacks, s, j) {
    var col = stacks[s][j].c, seen = {}, list = [[s, j]], out = [];
    seen[s + ',' + j] = 1;
    while (list.length) {
      var p = list.pop(); out.push(p);
      var nb = neighbours(p[0], p[1]);
      for (var i = 0; i < 4; i++) {
        var a = nb[i], t = stacks[a[0]][a[1]], key = a[0] + ',' + a[1];
        if (!t || seen[key] || t.del || t.c !== col || !t.settled) continue;
        seen[key] = 1; list.push(a);
      }
    }
    return out.length < 3 ? [] : out;
  }

  window.HexRules = { SQ3: SQ3, GEO: GEO, side: side, liveCount: liveCount, groupIf: groupIf, pickColor: pickColor, spawn: spawn, group: group };
})();
