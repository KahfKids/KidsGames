/* Shape Patterns: levels.js
   30 levels in 3 worlds. Each level is a few trains (rounds); each train shows a real pattern with one or two
   empty wagons. A round recipe is a string:
     next:<unit>:<mode>   pattern then an empty wagon at the end ("What comes next?")
     mid:<unit>:<mode>    full pattern with one wagon missing in the middle ("What's missing?")
     two:<unit>:<mode>    the last two wagons are empty
     grow:up | grow:down | grow:mid   counting patterns (1, 2, 3, ? ...)
     rot:2 | rot:4 | rot:c            turning tiles (two-step, quarter turns, turns + colours)
   unit: AB, AAB, ABB, ABC, AABB, ABCD
   mode: easy (shape and colour both change), shape (only shape), colour (only colour),
         combo (shape and colour both matter: wrong choices share one of them). */
(function () {
  'use strict';

  var SHAPES = ['star', 'drop', 'flower', 'hex', 'arch', 'lantern', 'leaf'];
  var HOME = { star: 'gold', drop: 'blue', flower: 'coral', hex: 'teal', arch: 'purple', lantern: 'orange', leaf: 'green' };
  var COLOUR_SHAPES = ['star', 'flower', 'hex', 'drop', 'lantern', 'arch'];
  // Colour-only sets keep clear brightness differences (kind to colour-blind eyes), never red next to green.
  var CSETS = {
    2: [['gold', 'blue'], ['coral', 'teal'], ['gold', 'purple'], ['orange', 'blue'], ['teal', 'purple'], ['gold', 'coral']],
    3: [['gold', 'blue', 'coral'], ['teal', 'purple', 'gold'], ['orange', 'blue', 'teal'], ['coral', 'purple', 'gold']],
    4: [['gold', 'blue', 'coral', 'teal'], ['orange', 'purple', 'teal', 'gold']]
  };
  var ALL_COLOURS = ['gold', 'blue', 'coral', 'teal', 'purple', 'orange'];

  var L = [
    // ---- World 1: Desert Dusk (gentle start) ----
    { name: 'First Patterns', rounds: 3, choices: 2, mix: ['next:AB:easy'] },
    { name: 'Stars and Drops', rounds: 3, choices: 2, mix: ['next:AB:easy'] },
    { name: 'Pick the Next', rounds: 3, choices: 3, mix: ['next:AB:easy'] },
    { name: 'Colour Pairs', rounds: 3, choices: 3, mix: ['next:AB:colour'] },
    { name: 'Two and One', rounds: 3, choices: 3, mix: ['next:AAB:easy'] },
    { name: 'One and Two', rounds: 3, choices: 3, mix: ['next:ABB:easy'] },
    { name: 'Mix It Up', rounds: 4, choices: 3, mix: ['next:AB:easy', 'next:AAB:easy', 'next:ABB:easy'] },
    { name: 'Colour Steps', rounds: 4, choices: 3, mix: ['next:AAB:colour', 'next:AB:colour'] },
    { name: 'Same Colour', rounds: 4, choices: 3, mix: ['next:AB:shape', 'next:ABB:shape'] },
    { name: 'Desert Parade', rounds: 4, choices: 3, mix: ['next:AAB:easy', 'next:ABB:colour', 'next:AB:shape', 'next:ABB:easy'] },
    // ---- World 2: Night Garden ----
    { name: 'Three in a Row', rounds: 3, choices: 3, mix: ['next:ABC:easy'] },
    { name: 'Lantern Lights', rounds: 4, choices: 3, mix: ['next:ABC:colour', 'next:ABC:easy'] },
    { name: 'Twos and Twos', rounds: 4, choices: 3, mix: ['next:AABB:easy'] },
    { name: 'Growing', rounds: 3, choices: 3, mix: ['grow:up'] },
    { name: 'Shape Shift', rounds: 4, choices: 4, mix: ['next:ABC:shape', 'next:AABB:colour'] },
    { name: 'Colour and Shape', rounds: 4, choices: 4, mix: ['next:AB:combo'] },
    { name: 'Count Down', rounds: 4, choices: 3, mix: ['grow:down', 'grow:up'] },
    { name: 'Garden Path', rounds: 4, choices: 4, mix: ['next:AABB:shape', 'next:ABC:combo'] },
    { name: 'Tricky Pairs', rounds: 4, choices: 4, mix: ['next:AAB:combo', 'next:ABB:combo'] },
    { name: 'Night Parade', rounds: 5, choices: 4, mix: ['next:ABC:combo', 'grow:up', 'next:AABB:colour', 'next:AB:combo', 'grow:down'] },
    // ---- World 3: Sea Breeze ----
    { name: 'Turning Tiles', rounds: 3, choices: 3, mix: ['rot:2'] },
    { name: "What's Missing?", rounds: 4, choices: 3, mix: ['mid:AB:easy', 'mid:ABC:easy'] },
    { name: 'Round and Round', rounds: 4, choices: 4, mix: ['rot:4'] },
    { name: 'Find the Gap', rounds: 4, choices: 4, mix: ['mid:AAB:shape', 'mid:ABB:colour'] },
    { name: 'Two More', rounds: 4, choices: 3, mix: ['two:AB:easy', 'two:ABC:easy'] },
    { name: 'Four Friends', rounds: 4, choices: 4, mix: ['next:ABCD:easy', 'next:ABCD:colour'] },
    { name: 'Hidden Number', rounds: 4, choices: 4, mix: ['grow:mid', 'mid:ABC:combo'] },
    { name: 'Spin and Colour', rounds: 4, choices: 4, mix: ['rot:c', 'rot:4'] },
    { name: 'Double Gaps', rounds: 4, choices: 4, mix: ['two:AABB:easy', 'two:ABC:combo', 'mid:AABB:shape', 'two:AB:colour'] },
    { name: 'Grand Parade', rounds: 5, choices: 4, mix: ['next:ABCD:combo', 'rot:c', 'two:ABC:shape', 'grow:mid', 'mid:AABB:combo'] }
  ];

  // ---------- helpers ----------
  function pick(a, R) { return a[Math.floor(R() * a.length)]; }
  function shuffle(a, R) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function P(s, c, r, n) { return { s: s, c: c, r: r || 0, n: n || 1 }; }
  function key(p) { return p.s + '|' + p.c + '|' + (p.r || 0) + '|' + (p.n || 1); }
  function uniq(u) { var out = []; for (var i = 0; i < u.length; i++) if (out.indexOf(u[i]) < 0) out.push(u[i]); return out; }

  // Pieces for each distinct letter of the unit.
  function assign(mode, k, R) {
    var shapes = shuffle(SHAPES, R).slice(0, k), out = [];
    if (mode === 'easy') shapes.forEach(function (s) { out.push(P(s, HOME[s])); });
    else if (mode === 'shape') { var c = pick(['gold', 'blue', 'coral', 'teal', 'purple'], R); shapes.forEach(function (s) { out.push(P(s, c)); }); }
    else if (mode === 'colour') { var s1 = pick(COLOUR_SHAPES, R); shuffle(pick(CSETS[k], R), R).forEach(function (c2) { out.push(P(s1, c2)); }); }
    else { var cs = shuffle(pick(CSETS[k], R), R); shapes.forEach(function (s, i) { out.push(P(s, cs[i])); }); }
    return out;
  }
  // Wrong choices that make the child look at the right thing for this mode.
  function pool(mode, letters, R) {
    var out = [];
    if (mode === 'easy') SHAPES.forEach(function (s) { out.push(P(s, HOME[s])); });
    else if (mode === 'shape') SHAPES.forEach(function (s) { out.push(P(s, letters[0].c)); });
    else if (mode === 'colour') ALL_COLOURS.forEach(function (c) { out.push(P(letters[0].s, c)); });
    else {
      var cross = [];
      letters.forEach(function (a) { letters.forEach(function (b) { if (a !== b) cross.push(P(a.s, b.c)); }); });
      out = shuffle(cross, R);
    }
    return out;
  }
  function choicesFor(answer, letters, extra, n, R) {
    var seen = {}, list = [answer]; seen[key(answer)] = 1;
    function add(p) { if (list.length < n && !seen[key(p)]) { seen[key(p)] = 1; list.push(p); } }
    shuffle(letters, R).forEach(add);
    extra.forEach(add);
    return shuffle(list, R);
  }

  // ---------- one train ----------
  // Returns { cells: [piece|null], blanks: [index...] in fill order, answers: {i: piece}, choices: {i: [piece]}, prompt }
  function makeRound(recipe, nChoices, R) {
    var parts = recipe.split(':'), kind = parts[0], cells = [], blanks = [], letters, extra;
    if (kind === 'next' || kind === 'mid' || kind === 'two') {
      var unit = parts[1], mode = parts[2], ul = uniq(unit.split('')), u = unit.length;
      letters = assign(mode, ul.length, R);
      var at = function (i) { return letters[ul.indexOf(unit[i % u])]; };
      var len;
      if (kind === 'next') len = pick(u === 2 ? [5, 6] : u === 4 && ul.length === 4 ? [7] : [6, 7], R);
      else if (kind === 'two') len = u === 2 ? 6 : 7;
      else len = u === 2 ? 6 : 7;
      for (var i = 0; i < len; i++) cells.push(at(i));
      if (kind === 'next') blanks = [len - 1];
      else if (kind === 'two') blanks = [len - 2, len - 1];
      else { var lo = Math.min(u, len - 3), hi = len - 2; blanks = [lo + Math.floor(R() * (hi - lo + 1))]; }
      extra = shuffle(pool(mode, letters, R), R);
    } else if (kind === 'grow') {
      var dir = parts[1], shape = pick(['date', 'star', 'drop', 'flower'], R), col = shape === 'date' ? 'brown' : HOME[shape];
      var start, steps;
      if (dir === 'up') { start = pick([1, 1, 2], R); steps = 1; }
      else if (dir === 'down') { start = pick([5, 6], R); steps = -1; }
      else { start = 1; steps = 1; }
      var glen = dir === 'mid' ? 5 : 4;
      for (var g = 0; g < glen; g++) cells.push(P(shape, col, 0, start + g * steps));
      blanks = dir === 'mid' ? [2] : [glen - 1];
      letters = [];
      extra = [];
      var ans = cells[blanks[0]].n;
      shuffle([ans - 1, ans + 1, ans + 2, ans - 2, ans + 3], R).forEach(function (m) { if (m >= 1 && m <= 6) extra.push(P(shape, col, 0, m)); });
      // the numbers next to the gap are the most tempting wrong answers, so keep them first
      extra.sort(function (a, b) { return Math.abs(a.n - ans) - Math.abs(b.n - ans); });
    } else { // rotation
      // only pieces whose four turns all look clearly different (a leaf pointing left and right looks too alike)
      var how = parts[1], rs = pick(['tile', 'tile', 'drop', 'arch'], R), rc = rs === 'tile' ? pick(['blue', 'coral', 'teal', 'purple'], R) : HOME[rs];
      var r0 = Math.floor(R() * 4), rlen = pick([5, 6], R), cB = pick(['gold', 'teal'], R);
      if (how === 'c') { rs = 'tile'; rc = pick(['blue', 'coral', 'purple'], R); }
      for (var q = 0; q < rlen; q++) {
        var r = how === '2' ? (r0 + (q % 2)) % 4 : (r0 + q) % 4;
        cells.push(P(rs, how === 'c' ? (q % 2 ? cB : rc) : rc, r));
      }
      blanks = [rlen - 1];
      var a2 = cells[rlen - 1];
      letters = [];
      extra = [];
      if (how === 'c') extra.push(P(rs, a2.c === rc ? cB : rc, a2.r), P(rs, a2.c, (a2.r + 2) % 4), P(rs, a2.c === rc ? cB : rc, (a2.r + 1) % 4), P(rs, a2.c, (a2.r + 1) % 4));
      else shuffle([1, 2, 3], R).forEach(function (d) { extra.push(P(rs, rc, (a2.r + d) % 4)); });
      // with a two-step turn the previous position is the tempting one
      if (how === '2') extra.sort(function (a, b) { return (b.r === cells[rlen - 2].r) - (a.r === cells[rlen - 2].r); });
    }
    var answers = {}, choices = {};
    blanks.forEach(function (b) {
      answers[b] = cells[b];
      choices[b] = choicesFor(cells[b], letters, extra, nChoices, R);
    });
    blanks.forEach(function (b) { cells[b] = null; });
    return { cells: cells, blanks: blanks, answers: answers, choices: choices, prompt: kind === 'mid' || (kind === 'grow' && parts[1] === 'mid') ? 'missing' : 'next', recipe: recipe };
  }

  function makeLevel(n, R) {
    R = R || Math.random;
    var d = L[n - 1], rounds = [];
    for (var i = 0; i < d.rounds; i++) rounds.push(makeRound(d.mix[i % d.mix.length], d.choices, R));
    return rounds;
  }

  window.PATTERN_LEVELS = {
    list: L, key: key, makeLevel: makeLevel, makeRound: makeRound,
    worldOf: function (n) { return Math.min(2, Math.floor((n - 1) / 10)); }
  };
})();
