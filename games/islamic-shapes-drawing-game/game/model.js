/* Colouring Book: model.js
   A page is a list of closed vector regions in paint order (later regions sit on top), built by the page files
   (game/pages-*.js) with the tiny vector kit in game/geo.js. This file turns a page definition into regions with a
   Path2D each, and holds what is game rules, not drawing:
   - hit(): which region a tap lands in (the browser's own Path2D.isPointInPath, topmost region first; Phaser has no
     test for a bezier region, and the shapes are vector areas, not pictures)
   - replay(): the saved list of actions -> which regions are filled and with what
   - paintColours / paintLines / thumb(): the old Canvas2D painters, kept ONLY for small pictures painted once into a
     texture (the page picker and the saved pictures, game/thumb.js) and for the line art texture of the open page
     (painted once per page, game/paint.js). Nothing here runs per frame.
   Saved actions (unchanged since the first version): { t:'f', r, c } fill region r with colour c (c null = paper);
   { t:'s', r, c, w, p:[x,y,...] } brush stroke clipped to region r (c null = eraser); { t:'x' } clear the page. */
(function () {
  'use strict';
  var G = window.CBGeo, BK = window.CBBooks;
  BK.sort();
  var PAGES = BK.pages, BOOKS = BK.books;
  var PAPER = '#fffdf7', INK = '#2c2443', LINE = 6;
  var M = window.CBModel = { PAGES: PAGES, BOOKS: BOOKS, PAPER: PAPER, INK: INK, LINE: LINE };

  M.model = function (def) {
    if (def.model) return def.model;
    var regions = [];
    var R = {
      add: function (shape, o) {
        regions.push({ i: regions.length, path: new Path2D(G.str(shape)), bbox: G.bbox(shape), rule: (o && o.rule) || 'nonzero', details: [] });
        return regions.length - 1;
      },
      detail: function (shape, o) {
        var r = regions[regions.length - 1], b = G.bbox(shape);
        r.details.push({ path: new Path2D(G.str(shape)), fill: o && o.fill, w: o && o.w });
        r.dbox = r.dbox ? [Math.min(r.dbox[0], b[0]), Math.min(r.dbox[1], b[1]), Math.max(r.dbox[2], b[2]), Math.max(r.dbox[3], b[3])] : b;
      }
    };
    def.build(R, G);
    def.model = { regions: regions };
    return def.model;
  };
  M.bookOf = function (def) { for (var i = 0; i < BOOKS.length; i++) if (BOOKS[i].id === def.book) return BOOKS[i]; return BOOKS[0]; };
  M.overlap = function (a, b) { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]; };

  // ---------- the picture as data ----------
  M.replay = function (m, ops) {
    var n = m.regions.length, st = { fill: [], strokes: [] };
    for (var i = 0; i < n; i++) { st.fill.push(null); st.strokes.push([]); }
    ops.forEach(function (op) { M.apply(st, op); });
    return st;
  };
  M.apply = function (st, op) {
    if (op.t === 'f') { st.fill[op.r] = op.c; st.strokes[op.r] = []; }
    else if (op.t === 's') st.strokes[op.r].push(op);
    else if (op.t === 'x') for (var i = 0; i < st.fill.length; i++) { st.fill[i] = null; st.strokes[i] = []; }
  };
  M.compact = function (ops) {
    var k = -1;
    for (var i = ops.length - 1; i >= 0; i--) if (ops[i].t === 'x') { k = i; break; }
    return ops.slice(k + 1);
  };

  // ---------- which region is at a point (page units, 0..1000) ----------
  var hitCtx = document.createElement('canvas').getContext('2d');
  M.hit = function (m, px, py) {
    if (px < 0 || py < 0 || px > 1000 || py > 1000) return -1;
    for (var i = m.regions.length - 1; i >= 0; i--) {
      var rg = m.regions[i], b = rg.bbox;
      if (px < b[0] || px > b[2] || py < b[1] || py > b[3]) continue;
      if (hitCtx.isPointInPath(rg.path, px, py, rg.rule)) return i;
    }
    return -1;
  };

  // ---------- Canvas2D painters (small pictures, and the line art, each painted once) ----------
  function shadeRegion(x, rg) {
    var b = rg.bbox, g = x.createLinearGradient(0, b[1], 0, b[3]);
    g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,20,60,.12)');
    x.fillStyle = g; x.fill(rg.path, rg.rule);
  }
  function strokePath(x, s) {
    var p = s.p;
    x.beginPath();
    x.moveTo(p[0], p[1]);
    if (p.length === 2) x.lineTo(p[0] + 0.1, p[1]);
    for (var i = 2; i < p.length - 2; i += 2) x.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
    if (p.length > 2) x.lineTo(p[p.length - 2], p[p.length - 1]);
  }
  M.paintColours = function (x, m, st) {
    x.fillStyle = PAPER; x.fillRect(0, 0, 1000, 1000);
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (var i = 0; i < m.regions.length; i++) {
      var rg = m.regions[i], c = st.fill[i];
      if (c) { x.fillStyle = c; x.fill(rg.path, rg.rule); shadeRegion(x, rg); }
      else if (i) { x.fillStyle = PAPER; x.fill(rg.path, rg.rule); }
      var ss = st.strokes[i];
      if (ss.length) {
        x.save(); x.clip(rg.path, rg.rule);
        for (var k = 0; k < ss.length; k++) { var s = ss[k]; x.strokeStyle = s.c || st.fill[i] || PAPER; x.lineWidth = s.w; strokePath(x, s); x.stroke(); }
        x.restore();
      }
    }
  };
  // Line art: each region erases the lines underneath it and draws its own outline, so the lines always match
  // exactly what a tap fills. The context's transform maps page units to pixels.
  M.paintLines = function (x, m, lw) {
    x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = INK;
    m.regions.forEach(function (rg) {
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fill(rg.path, rg.rule);
      x.globalCompositeOperation = 'source-over';
      x.lineWidth = lw; x.stroke(rg.path);
      for (var k = 0; k < rg.details.length; k++) {
        var d = rg.details[k];
        if (d.fill) { x.fillStyle = INK; x.fill(d.path); } else { x.lineWidth = lw * (d.w || 0.62); x.stroke(d.path); }
      }
    });
    x.globalCompositeOperation = 'source-over';
  };
  // A small finished picture on a canvas (px x px).
  M.thumb = function (def, ops, px) {
    var m = M.model(def), st = M.replay(m, ops || []), c = document.createElement('canvas');
    c.width = c.height = px;
    var x = c.getContext('2d'), k = px / 1000;
    x.setTransform(k, 0, 0, k, 0, 0);
    M.paintColours(x, m, st);
    var l = document.createElement('canvas'); l.width = l.height = px;
    var lx = l.getContext('2d'); lx.setTransform(k, 0, 0, k, 0, 0);
    M.paintLines(lx, m, Math.max(LINE, 1.1 / k));
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(l, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; x.beginPath(); x.roundRect(0, 0, px, px, px * 0.155); x.fill();      // rounded like the tiles
    return c;
  };
})();
