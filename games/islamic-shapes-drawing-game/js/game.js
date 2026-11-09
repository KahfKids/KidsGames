/* Colouring Book: game.js
   Tap a shape to fill it (exact: every page is made of closed vector regions, so a fill can never leak),
   or switch to the brush and colour with a finger (the brush stays inside the shape it started in).
   The picture is stored as a list of actions, so it is redrawn sharply after rotating or resizing,
   can be undone and redone, is saved per page, and can be kept in a gallery.
   Built on the shared kit (js/kit): full-screen stage, loop, pointer input, fx, sfx, ui, store. */
(function () {
  'use strict';
  var K = window.Kit, G = window.CBGeo, A = window.CBArt, BK = window.CBBooks;
  BK.sort();
  var PAGES = BK.pages, BOOKS = BK.books, COLOURS = A.COLOURS;
  var SIZES = [16, 34, 64], PAPER = '#fffdf7', INK = '#2c2443', LINE = 6;
  var DEBUG = /[?&]debug\b/.test(location.search);

  var store = K.store('kahf-colouring'), gstore = K.store('kahf-colouring-gallery');
  var progress = K.progress(store, PAGES.length);
  var works = store.get('works', {});
  var gallery = gstore.get('items', []);
  var GALLERY_MAX = 30;

  // ---------- page models ----------
  function model(def) {
    if (def.model) return def.model;
    var regions = [];
    var R = {
      add: function (shape, o) {
        var d = G.str(shape);
        regions.push({ i: regions.length, path: new Path2D(d), bbox: G.bbox(shape), rule: (o && o.rule) || 'nonzero', details: [] });
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
  }
  function bookOf(def) { for (var i = 0; i < BOOKS.length; i++) if (BOOKS[i].id === def.book) return BOOKS[i]; return BOOKS[0]; }

  // ---------- picture state (replayed from actions) ----------
  // Actions: { t: 'f', r, c } fill region r with colour c (null = paper); { t: 's', r, c, w, p: [x,y,...] } brush
  // stroke clipped to region r (c null = eraser); { t: 'x' } clear the page.
  function replay(m, ops) {
    var n = m.regions.length, st = { fill: [], strokes: [], cov: [] };
    for (var i = 0; i < n; i++) { st.fill.push(null); st.strokes.push([]); st.cov.push(0); }
    ops.forEach(function (op) { apply(st, op); });
    return st;
  }
  function apply(st, op) {
    if (op.t === 'f') { st.fill[op.r] = op.c; st.strokes[op.r] = []; st.cov[op.r] = 0; }
    else if (op.t === 's') st.strokes[op.r].push(op);
    else if (op.t === 'x') for (var i = 0; i < st.fill.length; i++) { st.fill[i] = null; st.strokes[i] = []; st.cov[i] = 0; }
  }
  function compact(ops) {
    var k = -1;
    for (var i = ops.length - 1; i >= 0; i--) if (ops[i].t === 'x') { k = i; break; }
    return ops.slice(k + 1);
  }

  // ---------- drawing a page ----------
  function overlap(a, b) { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]; }
  function shadeRegion(x, rg, c) {
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
  // Paint fills and brush strokes (page units, x already scaled). rect limits the work to a dirty area.
  function paintColours(x, m, st, rect, anims) {
    x.save();
    if (rect) { x.beginPath(); x.rect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]); x.clip(); }
    x.fillStyle = PAPER; x.fillRect(rect ? rect[0] : 0, rect ? rect[1] : 0, rect ? rect[2] - rect[0] : 1000, rect ? rect[3] - rect[1] : 1000);
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (var i = 0; i < m.regions.length; i++) {
      var rg = m.regions[i];
      if (rect && !overlap(rg.bbox, rect)) continue;
      var a = anims && anims[i], c = a ? a.from : st.fill[i];
      if (c || a) { x.fillStyle = c || PAPER; x.fill(rg.path, rg.rule); if (c) shadeRegion(x, rg, c); }
      else if (i) { x.fillStyle = PAPER; x.fill(rg.path, rg.rule); }
      if (a) {
        x.save(); x.clip(rg.path, rg.rule);
        x.beginPath(); x.arc(a.x, a.y, Math.max(0.1, a.rad), 0, 6.2832); x.clip();
        x.fillStyle = a.to || PAPER; x.fill(rg.path, rg.rule);
        if (a.to) shadeRegion(x, rg, a.to);
        x.restore();
      }
      var ss = st.strokes[i];
      if (ss.length) {
        x.save(); x.clip(rg.path, rg.rule);
        for (var k = 0; k < ss.length; k++) {
          var s = ss[k];
          x.strokeStyle = s.c || st.fill[i] || PAPER; x.lineWidth = s.w;
          strokePath(x, s); x.stroke();
        }
        x.restore();
      }
    }
    x.restore();
  }
  // Line art: each region erases the lines underneath it and draws its own outline, so the lines always
  // match exactly what a tap will fill.
  function paintLines(x, m, lw) {
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
  }
  // Small finished picture (page picker, gallery, save animation).
  function thumb(def, ops, px) {
    var m = model(def), st = replay(m, ops || []), c = document.createElement('canvas');
    c.width = c.height = px;
    var x = c.getContext('2d'), k = px / 1000;
    x.setTransform(k, 0, 0, k, 0, 0);
    paintColours(x, m, st, null, null);
    var l = document.createElement('canvas'); l.width = l.height = px;
    var lx = l.getContext('2d'); lx.setTransform(k, 0, 0, k, 0, 0);
    paintLines(lx, m, Math.max(LINE, 1.1 / k));
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(l, 0, 0);
    return c;
  }

  // ---------- hit test and coverage ----------
  var hitCtx = document.createElement('canvas').getContext('2d');
  function hit(m, px, py) {
    if (px < 0 || py < 0 || px > 1000 || py > 1000) return -1;
    for (var i = m.regions.length - 1; i >= 0; i--) {
      var rg = m.regions[i], b = rg.bbox;
      if (px < b[0] || px > b[2] || py < b[1] || py > b[3]) continue;
      if (hitCtx.isPointInPath(rg.path, px, py, rg.rule)) return i;
    }
    return -1;
  }
  // Visible part of region i, drawn small: returns { cv, x, k, b } with opaque pixels where i shows.
  var covCv = document.createElement('canvas'), covX = covCv.getContext('2d', { willReadFrequently: true });
  function visibleMask(m, i, size) {
    var rg = m.regions[i], b = rg.bbox, bw = Math.max(1, b[2] - b[0]), bh = Math.max(1, b[3] - b[1]);
    var k = Math.min(2, (size || 160) / Math.max(bw, bh)), W = Math.ceil(bw * k) + 2, H = Math.ceil(bh * k) + 2;
    covCv.width = W; covCv.height = H;
    covX.setTransform(k, 0, 0, k, -b[0] * k + 1, -b[1] * k + 1);
    covX.fillStyle = '#f00'; covX.fill(rg.path, rg.rule);
    covX.globalCompositeOperation = 'destination-out';
    for (var j = i + 1; j < m.regions.length; j++) if (overlap(m.regions[j].bbox, b)) covX.fill(m.regions[j].path, m.regions[j].rule);
    covX.globalCompositeOperation = 'source-over';
    return { W: W, H: H, k: k };
  }
  function countPx(W, H, test) {
    var d = covX.getImageData(0, 0, W, H).data, n = 0;
    for (var p = 0; p < d.length; p += 4) if (test(d[p], d[p + 1], d[p + 3])) n++;
    return n;
  }
  // How much of region i the brush has covered (0..1).
  function coverage(m, st, i) {
    var ss = st.strokes[i]; if (!ss.length) return 0;
    var mk = visibleMask(m, i, 120);
    var vis = countPx(mk.W, mk.H, function (r, g, a) { return a > 128; });
    if (!vis) return 1;
    covX.globalCompositeOperation = 'source-atop'; covX.lineCap = 'round'; covX.lineJoin = 'round';
    ss.forEach(function (s) { covX.strokeStyle = s.c ? '#0f0' : '#f00'; covX.lineWidth = s.w; strokePath(covX, s); covX.stroke(); });
    covX.globalCompositeOperation = 'source-over';
    return countPx(mk.W, mk.H, function (r, g, a) { return a > 128 && g > 128; }) / vis;
  }
  function regionDone(st, i) { return st.fill[i] != null || st.cov[i] >= 0.6; }

  // ---------- current page ----------
  var cur = { n: 0, def: null, m: null, ops: [], redo: [], st: null, book: BOOKS[0], gid: null, dirty: false, done: false };
  var anims = {}, animCount = 0, liveStroke = null, pending = null, flashT = 0, pageIn = 1, celebrate = null;
  var tool = store.get('tool', 'fill'), colour = store.get('colour', 3), size = store.get('size', 1), lastPaintTool = tool === 'eraser' ? 'fill' : tool;
  var bridged = {};

  function openPage(n, ops, gid) {
    n = K.clamp(n, 0, PAGES.length - 1);
    cur.n = n; cur.def = PAGES[n]; cur.m = model(cur.def); cur.book = bookOf(cur.def);
    var w = works[cur.def.id] || {};
    cur.ops = (ops || w.ops || []).slice(); cur.redo = [];
    cur.gid = ops ? gid : (w.gid || null); cur.dirty = ops ? false : !!w.dirty;
    cur.st = replay(cur.m, cur.ops);
    for (var i = 0; i < cur.m.regions.length; i++) if (cur.st.strokes[i].length) cur.st.cov[i] = coverage(cur.m, cur.st, i);
    cur.done = isDone();
    anims = {}; animCount = 0; liveStroke = null; pending = null; celebrate = null; flashT = 0;
    if (window.CBSound) CBSound.brushStop();
    progress.setCurrent(n + 1);
    if (ops) persist();
    pageIn = 0;
    resetView(false);
    nextBtn.hidden = !cur.done;
    rebuildLayers(true);
    updateUi();
  }
  function isDone() { for (var i = 0; i < cur.m.regions.length; i++) if (!regionDone(cur.st, i)) return false; return true; }
  function countDone() { var n = 0; for (var i = 0; i < cur.m.regions.length; i++) if (regionDone(cur.st, i)) n++; return n; }

  var saveT = null;
  function persist() {
    works[cur.def.id] = { ops: compact(cur.ops), gid: cur.gid, dirty: cur.dirty };
    clearTimeout(saveT);
    saveT = setTimeout(function () { store.set('works', works); }, 250);
  }

  // ---------- layers (sized to the page on screen) ----------
  var canvas = document.getElementById('stage');
  var L = { w: 0, h: 0, dpr: 1, page: { x: 0, y: 0, s: 100 }, bg: null, paper: null, col: null, lin: null, k: 1 };
  var colCv = document.createElement('canvas'), colX = colCv.getContext('2d');
  var linCv = document.createElement('canvas'), linX = linCv.getContext('2d');
  // View: zoom V.z (1-4) and pan V.x/V.y (CSS px). The layers cover the page rectangle on screen and are
  // drawn for the view in RV; during a pinch the old layers are stretched until the fingers lift.
  var V = { z: 1, x: 0, y: 0 }, RV = { z: 1, x: 0, y: 0 };
  function setXform(x) { x.setTransform(L.k, 0, 0, L.k, -RV.x * L.dpr, -RV.y * L.dpr); }
  function rebuildLayers(all, bg) {
    if (!cur.m) return;
    var px = Math.max(16, Math.round(L.page.s * L.dpr));
    RV.z = V.z; RV.x = V.x; RV.y = V.y;
    L.k = px * V.z / 1000;
    if (colCv.width !== px) { colCv.width = colCv.height = px; linCv.width = linCv.height = px; all = true; }
    setXform(colX);
    paintColours(colX, cur.m, cur.st, null, animCount ? anims : null);
    if (all) {
      linX.setTransform(1, 0, 0, 1, 0, 0); linX.clearRect(0, 0, px, px);
      setXform(linX);
      paintLines(linX, cur.m, Math.max(LINE * (0.6 + 0.4 / V.z), 1.6 / L.k));
      if (bg !== false) L.bg = A.backdrop(L.w, L.h, L.dpr, cur.book, L.page);
      if (flashT > 0) buildFlash();
    }
  }
  // Repaint part of the colour layer (page units), snapped to whole device pixels so there are no seams.
  function repaint(b) {
    var k = L.k, ox = RV.x * L.dpr, oy = RV.y * L.dpr;
    var r = [(Math.floor(b[0] * k - ox) + ox) / k, (Math.floor(b[1] * k - oy) + oy) / k, (Math.ceil(b[2] * k - ox) + ox) / k, (Math.ceil(b[3] * k - oy) + oy) / k];
    setXform(colX);
    paintColours(colX, cur.m, cur.st, r, animCount ? anims : null);
  }
  // Draw a page-sized layer rendered for view RV, under the current view V.
  function drawLayer(cv) {
    var p = L.page, f = V.z / RV.z;
    ctx.drawImage(cv, p.x + RV.x * f - V.x, p.y + RV.y * f - V.y, p.s * f, p.s * f);
  }
  function clampView() {
    V.z = K.clamp(V.z, 1, 4);
    var m = L.page.s * (V.z - 1);
    V.x = K.clamp(V.x, 0, m); V.y = K.clamp(V.y, 0, m);
    zoomBtn.hidden = V.z < 1.02;
  }
  function resetView(animate) {
    if (!animate) { V.z = 1; V.x = 0; V.y = 0; clampView(); return; }
    K.tween(V, { z: 1, x: 0, y: 0 }, 0.3, K.ease.outCubic, function () { clampView(); rebuildLayers(true, false); });
  }

  // ---------- UI ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function group(cls) { var g = el('div', 'cb-group ' + (cls || '')); document.body.appendChild(g); return g; }
  function btn(g, html, label, fn) {
    var b = el('button', 'kit-btn-icon cb-btn', html);
    b.setAttribute('aria-label', label);
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(b); });
    g.appendChild(b);
    return b;
  }
  var gA = group('cb-a'), gB = group('cb-b'), gRing = group('cb-ring'), gTools = group('cb-tools'), gPal = el('div', 'cb-pal');
  document.body.appendChild(gPal);
  var bBook = btn(gA, A.icon.book, 'Pages and gallery', function () { K.sfx.play('tap'); openPicker('pages'); });
  var bSave = btn(gA, A.icon.save, 'Save to my gallery', function () { saveToGallery(); });
  var bClear = btn(gB, A.icon.clear, 'Start again', function () { K.sfx.play('tap'); askClear(); });
  var bUndo = btn(gB, A.icon.undo, 'Undo', function () { undo(); });
  var bRedo = btn(gB, A.icon.redo, 'Redo', function () { redo(); });
  var bRing = btn(gRing, A.ring(0, false), 'Show the shapes still to colour', function () { K.sfx.play('tap'); showMissing(); });
  var bFill = btn(gTools, '', 'Fill', function () { setTool('fill'); });
  var bBrush = btn(gTools, '', 'Brush', function () { setTool('brush'); });
  var bEraser = btn(gTools, A.icon.eraser, 'Eraser', function () { setTool('eraser'); });
  var bSize = btn(gTools, '', 'Brush size', function () { size = (size + 1) % 3; store.set('size', size); K.sfx.play('size', { size: size }); bSize.classList.remove('wig'); void bSize.offsetWidth; bSize.classList.add('wig'); updateUi(); });
  var pots = COLOURS.map(function (c, i) {
    var b = el('button', 'cb-pot', A.pot(c));
    b.setAttribute('aria-label', 'Colour ' + (i + 1));
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      colour = i; store.set('colour', i);
      if (tool === 'eraser') setTool(lastPaintTool, true);
      K.sfx.play('pot');
      b.classList.remove('dip'); void b.offsetWidth; b.classList.add('dip');
      updateUi();
    });
    gPal.appendChild(b);
    return b;
  });
  var zoomBtn = el('button', 'kit-btn-icon cb-zoom', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M7.5 10.5h6"/></svg>');
  zoomBtn.setAttribute('aria-label', 'Zoom out');
  zoomBtn.hidden = true;
  zoomBtn.addEventListener('click', function (e) { e.stopPropagation(); K.sfx.play('zoom'); resetView(true); });
  document.body.appendChild(zoomBtn);
  var nextBtn = el('button', 'kit-btn primary cb-next', '<span>Next</span>' + K.icons.next);
  nextBtn.hidden = true;
  nextBtn.addEventListener('click', function (e) { e.stopPropagation(); K.sfx.play('page'); openPage((cur.n + 1) % PAGES.length); });
  document.body.appendChild(nextBtn);

  function setTool(t, quiet) {
    tool = t; store.set('tool', t);
    if (t !== 'eraser') lastPaintTool = t;
    if (!quiet) K.sfx.play('tool');
    if (t === 'brush' && !quiet && !store.get('brushHinted', 0) && !hint) {
      store.set('brushHinted', 1);
      hint = K.ui.hint('Draw with your finger', 120, true);
      placeHint();
      setTimeout(function () { if (hint) { hint.hide(); hint = null; } }, 4000);
    }
    updateUi();
  }
  function updateUi() {
    var c = COLOURS[colour];
    bFill.innerHTML = A.icon.fill(c); bBrush.innerHTML = A.icon.brush(c); bSize.innerHTML = A.icon.size(size);
    bFill.classList.toggle('on', tool === 'fill'); bBrush.classList.toggle('on', tool === 'brush'); bEraser.classList.toggle('on', tool === 'eraser');
    bSize.classList.toggle('dim', tool === 'fill');
    pots.forEach(function (p, i) { p.classList.toggle('on', i === colour); });
    bUndo.disabled = !cur.ops.length; bRedo.disabled = !cur.redo.length;
    bClear.disabled = !cur.ops.length;
    if (cur.m) {
      var n = cur.m.regions.length, d = countDone();
      bRing.innerHTML = A.ring(d / n, cur.done);
      bRing.classList.toggle('done', cur.done);
    }
  }

  // ---------- layout ----------
  var B = 48, GAP = 6, POT = 50;
  var stage = K.stage(canvas, function (st) {
    L.w = st.w; L.h = st.h; L.dpr = st.dpr;
    layout(st);
    L.paper = A.paper(L.page.s, L.dpr);
    rebuildLayers(true);
  });
  var ctx = stage.ctx;
  function place(e, x, y, w, h) { e.style.left = Math.round(x) + 'px'; e.style.top = Math.round(y) + 'px'; if (w != null) e.style.width = Math.round(w) + 'px'; if (h != null) e.style.height = Math.round(h) + 'px'; }
  function layout(st) {
    var s = st.safe, m = 10, w = st.w, h = st.h;
    var top = s.top + m, bot = h - s.bottom - m, left = s.left + m, right = w - s.right - m, aw = right - left, ah = bot - top;
    var barH = B + 8, nC = COLOURS.length;
    // portrait: buttons on top, tools and paint pots below
    var best = null;
    for (var rows = 1; rows <= 3; rows++) {
      var palH = rows * POT + 8, avail = ah - barH - (B + 8) - palH - GAP * 3, ps = Math.min(aw, avail);
      var cand = { kind: 'p', rows: rows, ps: ps };
      if (!best || ps > best.ps + 4 || (ps >= best.ps - 4 && ps === aw && rows > best.rows)) best = cand;
    }
    // landscape: rails on the left (book, save, progress, tools) and right (undo/redo/clear, pots)
    var leftW = 2 * B + GAP + 8, cols = 3, rightW = cols * POT + 8;
    var lps = Math.min(ah, aw - leftW - rightW - GAP * 4);
    if (lps > best.ps + 6) best = { kind: 'l', ps: lps };
    var ps2 = Math.floor(best.ps);
    document.body.classList.toggle('cb-land', best.kind === 'l');
    gTools.style.width = gTools.style.height = gPal.style.width = gPal.style.height = '';
    if (best.kind === 'p') {
      var palRows = best.rows, palCols = Math.ceil(nC / palRows), palW = Math.min(aw, palCols * POT + 8);
      gPal.style.gridTemplateColumns = 'repeat(' + palCols + ', ' + POT + 'px)';
      gPal.style.gridAutoFlow = 'row';
      var palH2 = palRows * POT + 8;
      place(gPal, left + (aw - palW) / 2, bot - palH2, palW, palH2);
      gPal.classList.toggle('scroll', palCols * POT + 8 > aw);
      var toolsW = 4 * B + 3 * GAP + 8;
      place(gTools, left + (aw - toolsW) / 2, bot - palH2 - GAP - (B + 8));
      place(gA, left, top); place(gB, right - (3 * B + 2 * GAP + 8), top);
      place(gRing, left + 2 * B + GAP + 8 + GAP, top);
      var y0 = top + barH + GAP, y1 = bot - palH2 - GAP - (B + 8) - GAP;
      L.page = { x: left + (aw - ps2) / 2, y: y0 + Math.max(0, (y1 - y0 - ps2) / 2), s: ps2 };
    } else {
      place(gA, left, top);
      place(gRing, left + (leftW - (B + 8)) / 2, top + barH + GAP);
      place(gTools, left, top + 2 * (barH + GAP));
      var bw = 3 * B + 2 * GAP + 8;
      place(gB, right - Math.max(bw, rightW) + (Math.max(bw, rightW) - bw) / 2, top);
      var pH = ah - barH - GAP, needH = Math.ceil(nC / cols) * POT + 8;
      gPal.style.gridTemplateColumns = 'repeat(' + cols + ', ' + POT + 'px)';
      place(gPal, right - rightW - (Math.max(bw, rightW) - rightW) / 2, top + barH + GAP, rightW, Math.min(pH, needH));
      gPal.classList.toggle('scroll', needH > pH);
      var lx0 = left + leftW + GAP * 2, lx1 = right - Math.max(bw, rightW) - GAP * 2;
      L.page = { x: lx0 + (lx1 - lx0 - ps2) / 2, y: top + (ah - ps2) / 2, s: ps2 };
    }
    place(zoomBtn, L.page.x + L.page.s - 54, L.page.y + 8);
    V.z = 1; V.x = 0; V.y = 0; if (typeof zoomBtn !== 'undefined') zoomBtn.hidden = true;
    // the Next button sits on the bottom edge of the page
    place(nextBtn, L.page.x + L.page.s / 2 - 70, L.page.y + L.page.s - 34);
    placeHint();
  }

  // ---------- input ----------
  function toPage(sx, sy) {
    if (sx < L.page.x || sy < L.page.y || sx > L.page.x + L.page.s || sy > L.page.y + L.page.s) return { x: -1, y: -1, out: true };
    return { x: (sx - L.page.x + V.x) / (L.page.s * V.z) * 1000, y: (sy - L.page.y + V.y) / (L.page.s * V.z) * 1000 };
  }
  var sheetOpen = false;
  K.pointer(canvas, toPage, {
    down: function (p) {
      if (sheetOpen || !cur.m || pageIn < 0.6 || pinch) return;
      var r = hit(cur.m, p.x, p.y);
      if (r < 0) return;
      if (tool === 'fill') { pending = { x: p.x, y: p.y, sx: p.sx, sy: p.sy, r: r }; return; }
      liveStroke = { t: 's', r: r, c: tool === 'eraser' ? null : COLOURS[colour], w: SIZES[size], p: [Math.round(p.x), Math.round(p.y)], sx: p.sx, sy: p.sy, far: 0 };
      cur.st.strokes[r].push(liveStroke);
      repaint(sbox(liveStroke.p[0], liveStroke.p[1], liveStroke.p[0], liveStroke.p[1], liveStroke.w));
      if (window.CBSound) CBSound.brushStart(tool === 'eraser' ? 'rub' : 'brush');
    },
    move: function (p) {
      if (!liveStroke || pinch) return;
      var s = liveStroke, n = s.p.length, lx = s.p[n - 2], ly = s.p[n - 1];
      if (Math.hypot(p.x - lx, p.y - ly) < 3) return;
      s.p.push(Math.round(p.x), Math.round(p.y));
      s.far = Math.max(s.far, Math.hypot(p.sx - s.sx, p.sy - s.sy));
      var px = n >= 4 ? s.p[n - 4] : lx, py = n >= 4 ? s.p[n - 3] : ly;
      repaint(sbox(Math.min(px, lx, p.x), Math.min(py, ly, p.y), Math.max(px, lx, p.x), Math.max(py, ly, p.y), s.w));
      if (window.CBSound) CBSound.brushMove(Math.hypot(p.x - lx, p.y - ly) * V.z, size);
    },
    up: function (p) {
      if (pinch) { pending = null; return; }
      if (pending) {
        var pd = pending; pending = null;
        if (Math.hypot(p.sx - pd.sx, p.sy - pd.sy) < 26) fillAt(pd.r, pd.x, pd.y, COLOURS[colour]);
        return;
      }
      if (window.CBSound) CBSound.brushStop();
      if (!liveStroke) return;
      var s = liveStroke; liveStroke = null;
      delete s.sx; delete s.sy;
      var far = s.far; delete s.far;
      if (s.c === null && far < 14) {
        // a tap with the eraser clears the whole shape
        var arr = cur.st.strokes[s.r]; arr.splice(arr.indexOf(s), 1);
        fillAt(s.r, s.p[0], s.p[1], null);
        return;
      }
      commit(s, true);
      cur.st.cov[s.r] = coverage(cur.m, cur.st, s.r);
      afterChange(s.p[s.p.length - 2], s.p[s.p.length - 1]);
    }
  });
  function sbox(x0, y0, x1, y1, w) { var r = w / 2 + 3; return [x0 - r, y0 - r, x1 + r, y1 + r]; }

  function fillAt(r, x, y, c) {
    if (cur.st.fill[r] === c && !cur.st.strokes[r].length) {
      K.sfx.play('same');
      return;
    }
    var rg = cur.m.regions[r], b = rg.bbox;
    var rad = Math.max(Math.hypot(x - b[0], y - b[1]), Math.hypot(x - b[2], y - b[1]), Math.hypot(x - b[0], y - b[3]), Math.hypot(x - b[2], y - b[3]));
    if (!anims[r]) animCount++;
    anims[r] = { x: x, y: y, rad: 0, max: rad, t: 0, dur: K.clamp(0.22 + rad / 2600, 0.25, 0.55), from: cur.st.fill[r], to: c };
    var op = { t: 'f', r: r, c: c };
    commit(op, false);
    if (c) K.sfx.play('splat', { big: Math.min(1, ((b[2] - b[0]) * (b[3] - b[1])) / 250000) }); else K.sfx.play('erase');
    K.buzz(6);
    var sp = toScreen(x, y);
    if (c && !K.reducedMotion) K.fx.burst(sp.x, sp.y, { n: 7, colors: [c, '#ffffff'], speed: 140, size: 7, life: 0.45, gravity: 120, shape: 'dot' });
    afterChange(x, y);
  }
  function commit(op, alreadyIn) {
    if (!alreadyIn) apply(cur.st, op);
    cur.ops.push(op); cur.redo.length = 0; cur.dirty = true;
    if (hint) { hint.hide(); hint = null; store.set('hinted', 1); }
    persist();
  }
  function afterChange(x, y) {
    var was = cur.done;
    cur.done = isDone();
    if (cur.done && !was) complete(x, y);
    if (!cur.done) nextBtn.hidden = true;
    if (flashT > 0) buildFlash();
    updateUi();
  }
  function rerender() {
    cur.st = replay(cur.m, cur.ops);
    for (var i = 0; i < cur.m.regions.length; i++) if (cur.st.strokes[i].length) cur.st.cov[i] = coverage(cur.m, cur.st, i);
    anims = {}; animCount = 0;
    rebuildLayers(false);
    cur.dirty = true; persist();
    var was = cur.done; cur.done = isDone();
    if (!cur.done) nextBtn.hidden = true; else if (!was) nextBtn.hidden = false;
    updateUi();
  }
  function undo() { if (!cur.ops.length || liveStroke) return; cur.redo.push(cur.ops.pop()); K.sfx.play('undo'); rerender(); }
  function redo() { if (!cur.redo.length || liveStroke) return; cur.ops.push(cur.redo.pop()); K.sfx.play('redo'); rerender(); }
  addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || e.key === 'Z') { e.preventDefault(); redo(); }
  });
  function toScreen(x, y) { return { x: L.page.x + x / 1000 * L.page.s * V.z - V.x, y: L.page.y + y / 1000 * L.page.s * V.z - V.y }; }

  // ---------- pinch to zoom (two fingers), wheel on desktop ----------
  var touches = {}, nTouch = 0, pinch = null;
  function cancelSingle() {
    pending = null;
    if (window.CBSound) CBSound.brushStop();
    if (liveStroke) {
      var arr = cur.st.strokes[liveStroke.r]; arr.splice(arr.indexOf(liveStroke), 1);
      var lp = liveStroke.p, b = [1e9, 1e9, -1e9, -1e9];
      for (var i = 0; i < lp.length; i += 2) { b[0] = Math.min(b[0], lp[i]); b[1] = Math.min(b[1], lp[i + 1]); b[2] = Math.max(b[2], lp[i]); b[3] = Math.max(b[3], lp[i + 1]); }
      liveStroke = null; repaint(sbox(b[0], b[1], b[2], b[3], 70));
    }
  }
  function pinchInfo() {
    var ids = Object.keys(touches), a = touches[ids[0]], b = touches[ids[1]];
    return { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' || sheetOpen) return;
    touches[e.pointerId] = { x: e.clientX, y: e.clientY }; nTouch++;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    if (nTouch === 2) {
      cancelSingle();
      var pi = pinchInfo();
      pinch = { d0: pi.d, x0: pi.x, y0: pi.y, z0: V.z, vx: V.x, vy: V.y, live: true };
      if (hint) { hint.hide(); hint = null; }
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!touches[e.pointerId]) return;
    touches[e.pointerId].x = e.clientX; touches[e.pointerId].y = e.clientY;
    if (pinch && pinch.live && nTouch >= 2) {
      var pi = pinchInfo(), z = K.clamp(pinch.z0 * pi.d / pinch.d0, 1, 4);
      var ux = (pinch.x0 - L.page.x + pinch.vx) / pinch.z0, uy = (pinch.y0 - L.page.y + pinch.vy) / pinch.z0;
      V.z = z; V.x = ux * z - (pi.x - L.page.x); V.y = uy * z - (pi.y - L.page.y);
      clampView();
    }
  });
  function touchEnd(e) {
    if (!touches[e.pointerId]) return;
    delete touches[e.pointerId]; nTouch = Math.max(0, nTouch - 1);
    if (pinch && pinch.live && nTouch < 2) { pinch.live = false; if (V.z < 1.08) resetView(true); else rebuildLayers(true, false); }
    if (!nTouch) pinch = null;
  }
  canvas.addEventListener('pointerup', touchEnd);
  canvas.addEventListener('pointercancel', touchEnd);
  var wheelT = null;
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (sheetOpen) return;
    var z0 = V.z, z = K.clamp(z0 * Math.exp(-e.deltaY * 0.0015), 1, 4);
    var ux = (e.clientX - L.page.x + V.x) / z0, uy = (e.clientY - L.page.y + V.y) / z0;
    V.z = z; V.x = ux * z - (e.clientX - L.page.x); V.y = uy * z - (e.clientY - L.page.y);
    clampView();
    clearTimeout(wheelT); wheelT = setTimeout(function () { rebuildLayers(true, false); }, 140);
  }, { passive: false });

  // ---------- page finished ----------
  function complete(x, y) {
    var n = cur.n + 1, first = !progress.stars(n);
    if (first) { progress.finish(n, 1); progress.setCurrent(n); }
    if (!bridged[cur.def.id]) { bridged[cur.def.id] = 1; K.bridge.complete(); }
    K.sfx.play('win');
    setTimeout(function () { if (window.CBSound) CBSound.praise('Masha Allah!'); }, 450);
    celebrate = { t: 0, first: first, from: toScreen(x, y) };
    var c = toScreen(500, 500);
    K.fx.text(c.x, c.y - L.page.s * 0.08, "Masha'Allah!", { size: Math.max(34, L.page.s * 0.1), color: '#fff3c4', stroke: 'rgba(60,20,80,.6)', life: 1.8, rise: L.page.s * 0.1 });
    setTimeout(function () { nextBtn.hidden = !cur.done; }, 1300);
  }
  function sparkleBurst(t) {
    var s = L.page, n = 5;
    for (var i = 0; i < n; i++) {
      var x = s.x + Math.random() * s.s, y = s.y + Math.random() * s.s;
      K.fx.burst(x, y, { n: 6, colors: ['#ffe58a', '#ffffff', '#f6c453', '#ffd1f0'], speed: 220, size: 14, life: 0.9, gravity: 260, shape: 'star' });
    }
  }

  // ---------- show the shapes still to colour ----------
  function showMissing() {
    if (cur.done) { K.fx.burst(bRingCenter().x, bRingCenter().y, { n: 10, colors: ['#ffe58a', '#fff'], speed: 200, size: 12, shape: 'star', gravity: 200 }); return; }
    buildFlash();
    flashT = 2.2;
  }
  function buildFlash() {
    // painter's order: shapes still to colour in gold, finished shapes cut it away again
    var px = colCv.width;
    if (!flashCv) flashCv = document.createElement('canvas');
    flashCv.width = flashCv.height = px;
    var x = flashCv.getContext('2d');
    setXform(x); x.fillStyle = '#ffd65a';
    for (var i = 0; i < cur.m.regions.length; i++) {
      var rg = cur.m.regions[i];
      x.globalCompositeOperation = regionDone(cur.st, i) ? 'destination-out' : 'source-over';
      x.fill(rg.path, rg.rule);
    }
    x.globalCompositeOperation = 'source-over';
  }
  var flashCv = null;
  function bRingCenter() { var r = bRing.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  // ---------- clear ----------
  function askClear() {
    if (!cur.ops.length) return;
    sheetOpen = true;
    var pic = thumb(cur.def, cur.ops, 220); pic.className = 'cb-clear-pic';
    var box = el('div', 'cb-clear'); box.appendChild(pic);
    K.ui.sheet({
      title: 'Start again?', content: box, closeable: true, onClose: function () { sheetOpen = false; },
      buttons: [
        { label: 'Keep it', row: true, onClick: function () { sheetOpen = false; } },
        { label: 'Clear', icon: 'restart', primary: true, row: true, onClick: function () {
          sheetOpen = false;
          cur.ops.push({ t: 'x' }); cur.redo.length = 0; cur.gid = null;
          K.sfx.play('clear');
          rerender();
        } }
      ]
    });
  }

  // ---------- gallery ----------
  function storeGallery() {
    for (var tries = 0; tries < 6; tries++) {
      try { localStorage.setItem('kahf-colouring-gallery', JSON.stringify({ items: gallery })); return true; } catch (e) { if (gallery.length > 1) gallery.pop(); else return false; }
    }
    return false;
  }
  function saveToGallery(silent) {
    if (!cur.ops.length) { if (!silent) { K.sfx.play('nope'); wiggle(bSave); } return; }
    var item = null;
    for (var i = 0; i < gallery.length; i++) if (gallery[i].id === cur.gid) { item = gallery.splice(i, 1)[0]; break; }
    if (!item) { item = { id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), page: cur.def.id }; cur.gid = item.id; }
    item.ops = compact(cur.ops); item.t = Date.now();
    gallery.unshift(item);
    if (gallery.length > GALLERY_MAX) gallery.length = GALLERY_MAX;
    storeGallery();
    cur.dirty = false; persist();
    if (silent) return;
    K.sfx.play('save');
    flyToBook();
  }
  function wiggle(b) { b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig'); }
  function flyToBook() {
    var img = thumb(cur.def, cur.ops, 160); img.className = 'cb-fly';
    var r = bBook.getBoundingClientRect(), p = L.page;
    img.style.left = p.x + 'px'; img.style.top = p.y + 'px'; img.style.width = img.style.height = p.s + 'px';
    document.body.appendChild(img);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        img.style.transform = 'translate(' + (r.left + r.width / 2 - p.x - p.s / 2) + 'px,' + (r.top + r.height / 2 - p.y - p.s / 2) + 'px) scale(' + (40 / p.s) + ') rotate(-8deg)';
        img.style.opacity = '0.2';
      });
    });
    setTimeout(function () { img.remove(); wiggle(bBook); var c = bRingCenter(); var br = bBook.getBoundingClientRect(); K.fx.burst(br.left + br.width / 2, br.top + br.height / 2, { n: 10, colors: ['#ffe58a', '#fff'], speed: 180, size: 10, shape: 'star', gravity: 160 }); void c; }, 700);
    var c2 = toScreen(500, 500);
    K.fx.text(c2.x, c2.y, 'Saved!', { size: Math.max(30, L.page.s * 0.08), color: '#ffffff', life: 1.1 });
  }

  // ---------- page picker and gallery sheet ----------
  function openPicker(tab) {
    sheetOpen = true;
    var wrap = el('div', 'cb-picker');
    var tabs = el('div', 'cb-tabs');
    var tPages = el('button', 'cb-tab', A.icon.book + '<span>Pages</span>'), tGal = el('button', 'cb-tab', A.icon.save + '<span>Saved</span>');
    var snd = el('button', 'kit-btn-icon cb-snd', K.sfx.muted ? K.icons.soundOff : K.icons.sound);
    snd.setAttribute('aria-label', 'Sound on or off');
    snd.onclick = function () { var mu = K.sfx.toggle(); snd.innerHTML = mu ? K.icons.soundOff : K.icons.sound; };
    tabs.appendChild(tPages); tabs.appendChild(tGal); tabs.appendChild(snd);
    var body = el('div', 'cb-pick-body');
    wrap.appendChild(tabs); wrap.appendChild(body);
    var queue = [], qT = null;
    function drawQueued() {
      var t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) { var q = queue.shift(); q.holder.appendChild(thumb(q.def, q.ops, q.px)); }
      if (queue.length) qT = requestAnimationFrame(drawQueued);
    }
    function lazyThumb(holder, def, ops) { queue.push({ holder: holder, def: def, ops: ops, px: Math.round(120 * Math.min(2, L.dpr)) }); }
    function show(which) {
      tPages.classList.toggle('on', which === 'pages'); tGal.classList.toggle('on', which === 'gallery');
      body.innerHTML = ''; queue.length = 0;
      if (which === 'pages') {
        BOOKS.forEach(function (bk) {
          var list = PAGES.map(function (p, i) { return { p: p, i: i }; }).filter(function (o) { return o.p.book === bk.id; });
          var got = list.filter(function (o) { return progress.stars(o.i + 1) > 0; }).length;
          var sec = el('div', 'cb-book');
          sec.style.setProperty('--c', bk.glow);
          sec.appendChild(el('h3', '', '<span>' + bk.name + '</span><span class="cnt">' + got + ' / ' + list.length + ' ' + starIcon() + '</span>'));
          var grid = el('div', 'cb-grid');
          list.forEach(function (o) {
            var b = el('button', 'cb-thumb' + (o.i === cur.n ? ' cur' : ''));
            b.setAttribute('aria-label', o.p.name);
            var hold = el('span', 'cb-th'); b.appendChild(hold);
            if (progress.stars(o.i + 1)) b.appendChild(el('span', 'cb-badge', starIcon()));
            var w = o.i === cur.n ? { ops: cur.ops } : (works[o.p.id] || {});
            lazyThumb(hold, o.p, w.ops || []);
            b.onclick = function () { K.sfx.play('page'); close(); if (o.i !== cur.n) openPage(o.i); };
            grid.appendChild(b);
          });
          sec.appendChild(grid);
          body.appendChild(sec);
        });
      } else {
        if (!gallery.length) {
          body.appendChild(el('div', 'cb-empty', '<div class="cb-empty-art">' + A.icon.save + '</div><p>Tap the picture button to keep your colouring here.</p>'));
        } else {
          var grid = el('div', 'cb-grid cb-gal');
          gallery.forEach(function (it) {
            var def = null, idx = -1;
            for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === it.page) { def = PAGES[i]; idx = i; }
            if (!def) return;
            var b = el('button', 'cb-thumb');
            b.setAttribute('aria-label', 'Open ' + def.name);
            var hold = el('span', 'cb-th'); b.appendChild(hold);
            lazyThumb(hold, def, it.ops);
            var del = el('span', 'cb-del', K.icons.close);
            del.setAttribute('role', 'button'); del.setAttribute('aria-label', 'Remove');
            del.onclick = function (e) { e.stopPropagation(); K.sfx.play('tap'); askRemove(it, b); };
            b.appendChild(del);
            b.onclick = function () {
              K.sfx.play('page'); close();
              // keep unsaved work on that page before opening the saved copy
              var w = idx === cur.n ? { ops: cur.ops, dirty: cur.dirty, gid: cur.gid } : works[def.id];
              if (w && w.dirty && w.ops && w.ops.length && w.gid !== it.id) {
                if (idx !== cur.n) openPage(idx);
                saveToGallery(true);
              }
              openPage(idx, it.ops, it.id);
            };
            grid.appendChild(b);
          });
          body.appendChild(grid);
        }
      }
      drawQueued();
    }
    function askRemove(it, node) {
      var conf = el('div', 'cb-confirm', '<p>Remove this picture?</p>');
      var row = el('div', 'row');
      var keep = el('button', 'kit-btn', '<span>Keep</span>'), rm = el('button', 'kit-btn primary', '<span>Remove</span>');
      row.appendChild(keep); row.appendChild(rm); conf.appendChild(row);
      node.appendChild(conf);
      keep.onclick = function (e) { e.stopPropagation(); K.sfx.play('tap'); conf.remove(); };
      rm.onclick = function (e) {
        e.stopPropagation(); K.sfx.play('crumple');
        gallery = gallery.filter(function (g) { return g.id !== it.id; });
        storeGallery();
        if (cur.gid === it.id) cur.gid = null;
        Object.keys(works).forEach(function (k) { if (works[k].gid === it.id) works[k].gid = null; });
        persist();
        show('gallery');
      };
    }
    tPages.onclick = function () { K.sfx.play('tap'); show('pages'); };
    tGal.onclick = function () { K.sfx.play('tap'); show('gallery'); };
    var sh = K.ui.sheet({ content: wrap, closeable: true, onClose: function () { sheetOpen = false; cancelAnimationFrame(qT); } });
    sh.el.classList.add('cb-sheet');
    function close() { sheetOpen = false; cancelAnimationFrame(qT); sh.close(); }
    show(tab || 'pages');
    return sh;
  }
  function starIcon() { return '<svg viewBox="-50 -50 100 100"><path d="M0-46 13-31 32-32 31-13 46 0 31 13 32 32 13 31 0 46-13 31-32 32-31 13-46 0-31-13-32-32-13-31Z" fill="#f6c453" stroke="#7a4a12" stroke-width="5"/></svg>'; }

  // ---------- loop ----------
  var motes = [];
  for (var i = 0; i < 16; i++) motes.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 5, v: 0.008 + Math.random() * 0.02, ph: Math.random() * 6 });
  var time = 0;
  function step(dt) {
    time += dt;
    K.fx.update(dt);
    if (pageIn < 1) pageIn = Math.min(1, pageIn + dt / 0.45);
    if (flashT > 0) flashT = Math.max(0, flashT - dt);
    if (animCount) {
      for (var r in anims) {
        var a = anims[r];
        a.t += dt;
        var k = Math.min(1, a.t / a.dur);
        a.rad = a.max * K.ease.outCubic(k);
        var rg = cur.m.regions[r];
        if (k >= 1) { delete anims[r]; animCount--; }
        repaint(rg.bbox);
      }
    }
    if (celebrate) {
      celebrate.t += dt;
      if (celebrate.t < 1.2 && Math.floor(celebrate.t * 8) !== Math.floor((celebrate.t - dt) * 8)) sparkleBurst(celebrate.t);
      if (celebrate.t > 2.6) celebrate = null;
    }
    for (var j = 0; j < motes.length; j++) { var mo = motes[j]; mo.y -= mo.v * dt; if (mo.y < -0.05) { mo.y = 1.05; mo.x = Math.random(); } }
  }
  function draw() {
    var w = L.w, h = L.h, p = L.page;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    if (L.bg) ctx.drawImage(L.bg, 0, 0, w, h); else { ctx.fillStyle = '#171246'; ctx.fillRect(0, 0, w, h); }
    // drifting motes
    ctx.fillStyle = cur.book.mote;
    for (var j = 0; j < motes.length; j++) {
      var mo = motes[j];
      ctx.globalAlpha = 0.12 + 0.12 * Math.sin(time * 1.3 + mo.ph);
      ctx.beginPath(); ctx.arc(mo.x * w + Math.sin(time * 0.4 + mo.ph) * 12, mo.y * h, mo.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the page (pops in when opened)
    var e = K.ease.outBack(pageIn), sc = 0.9 + 0.1 * e, cx = p.x + p.s / 2, cy = p.y + p.s / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, pageIn * 2);
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    if (celebrate && celebrate.t < 0.5) { var b = Math.sin(celebrate.t / 0.5 * Math.PI) * 0.025; ctx.translate(cx, cy); ctx.scale(1 + b, 1 + b); ctx.translate(-cx, -cy); }
    if (L.paper) ctx.drawImage(L.paper.canvas, p.x - L.paper.pad, p.y - L.paper.pad, p.s + L.paper.pad * 2, p.s + L.paper.pad * 2);
    ctx.save();
    A.rr(ctx, p.x, p.y, p.s, p.s, L.paper ? L.paper.r : 10); ctx.clip();
    drawLayer(colCv);
    if (flashT > 0 && flashCv) {
      ctx.globalAlpha = (0.35 + 0.3 * Math.sin(time * 9)) * Math.min(1, flashT);
      drawLayer(flashCv);
      ctx.globalAlpha = 1;
    }
    drawLayer(linCv);
    if (celebrate && celebrate.t < 1.4) {
      var gl = Math.sin(Math.min(1, celebrate.t / 1.4) * Math.PI);
      var gr = ctx.createLinearGradient(p.x - p.s + celebrate.t * p.s * 2.2, p.y, p.x + celebrate.t * p.s * 2.2, p.y + p.s);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,220,' + (0.45 * gl).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.restore();
    ctx.restore();
    // star flying from the page to the progress ring
    if (celebrate && celebrate.first && celebrate.t > 0.7 && celebrate.t < 2.2) {
      var u = Math.min(1, (celebrate.t - 0.7) / 1.1), rc = bRingCenter(), f = celebrate.from;
      var mid = { x: (f.x + rc.x) / 2, y: Math.min(f.y, rc.y) - 120 };
      var eu = K.ease.inOutSine(u), q = 1 - eu;
      var sx = q * q * f.x + 2 * q * eu * mid.x + eu * eu * rc.x, sy = q * q * f.y + 2 * q * eu * mid.y + eu * eu * rc.y;
      var sz = (u < 0.2 ? K.ease.outBack(u / 0.2) : 1) * (60 - 34 * eu);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(time * 3);
      ctx.fillStyle = '#f6c453'; ctx.strokeStyle = '#7a4a12'; ctx.lineWidth = 3;
      K.starPath(ctx, sz / 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      if (u >= 1 && !celebrate.landed) { celebrate.landed = 1; K.sfx.play('star', { n: 3 }); wiggle(bRing); K.fx.burst(rc.x, rc.y, { n: 14, colors: ['#ffe58a', '#fff', '#f6c453'], speed: 240, size: 12, shape: 'star', gravity: 200 }); }
    }
    K.fx.draw(ctx);
  }
  K.loop({ step: step, draw: draw, hz: 60 });

  // ---------- start ----------
  var hint = null;
  setTool(tool, true);
  openPage(progress.current() - 1);
  if (!store.get('hinted', 0)) {
    hint = K.ui.hint('Tap a shape to colour it', 120, true);
    placeHint();
  }
  function placeHint() {
    if (!hint) return;
    var below = gTools.getBoundingClientRect().top - (L.page.y + L.page.s);
    hint.style.left = (L.page.x + L.page.s / 2) + 'px';
    hint.style.bottom = (below > 60 && !document.body.classList.contains('cb-land') ? L.h - L.page.y - L.page.s - below / 2 - 24 : L.h - L.page.y - L.page.s + 20) + 'px';
  }

  // Test hook (only with ?debug in the URL).
  if (DEBUG) window.CB = {
    pages: PAGES, open: function (n) { openPage(n); }, state: function () {
      return { page: cur.n, id: cur.def.id, regions: cur.m.regions.length, done: countDone(), complete: cur.done, ops: cur.ops.length,
        stars: progress.total(), tool: tool, colour: colour, size: size, gallery: gallery.length, layout: document.body.classList.contains('cb-land') ? 'land' : 'port', pageRect: L.page };
    },
    fill: function (r, ci) { colour = ci == null ? colour : ci; var b = cur.m.regions[r].bbox; fillAt(r, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, COLOURS[colour]); },
    // a point (screen px) inside the visible part of region r, or null
    point: function (r) {
      var mk = visibleMask(cur.m, r, 200), d = covX.getImageData(0, 0, mk.W, mk.H).data, b = cur.m.regions[r].bbox, best = null, bd = -1;
      // pick the visible pixel farthest from the region's edge (cheap: sample, score by neighbours)
      for (var y = 1; y < mk.H - 1; y += 1) for (var x = 1; x < mk.W - 1; x += 1) {
        if (d[(y * mk.W + x) * 4 + 3] < 200) continue;
        var qx = (x - 1) / mk.k + b[0], qy = (y - 1) / mk.k + b[1];
        if (qx < 4 || qy < 4 || qx > 996 || qy > 996) continue;
        var s = 0;
        for (var rr = 1; rr < 40; rr += 2) {
          var ok = true;
          [[rr, 0], [-rr, 0], [0, rr], [0, -rr], [rr * 0.7, rr * 0.7], [-rr * 0.7, -rr * 0.7], [rr * 0.7, -rr * 0.7], [-rr * 0.7, rr * 0.7]].forEach(function (o) {
            var xx = Math.round(x + o[0]), yy = Math.round(y + o[1]);
            if (xx < 0 || yy < 0 || xx >= mk.W || yy >= mk.H || d[(yy * mk.W + xx) * 4 + 3] < 200) ok = false;
          });
          if (!ok) break; s = rr;
        }
        if (s > bd) { bd = s; best = [x, y]; }
      }
      if (!best) return null;
      var px = (best[0] - 1) / mk.k + b[0], py = (best[1] - 1) / mk.k + b[1];
      return { x: L.page.x + px / 1000 * L.page.s, y: L.page.y + py / 1000 * L.page.s, depth: bd / mk.k };
    },
    visible: function (n) {
      var def = PAGES[n], m = model(def);
      return m.regions.map(function (rg, i) { var mk = visibleMask(m, i, 300); return Math.round(countPx(mk.W, mk.H, function (r, g, a) { return a > 128; }) / (mk.k * mk.k)); });
    },
    thumb: function (n, colourAll) {
      var def = PAGES[n], m = model(def), ops = [];
      if (colourAll) m.regions.forEach(function (rg, i) { ops.push({ t: 'f', r: i, c: COLOURS[(i * 5 + 3) % COLOURS.length] }); });
      return thumb(def, ops, colourAll === 2 ? 1000 : 500).toDataURL('image/png');
    },
    view: function () { return { z: V.z, x: V.x, y: V.y, rz: RV.z }; }, sheetOpen: function () { return sheetOpen; },
    undo: undo, redo: redo, setTool: setTool, save: function () { saveToGallery(); }, picker: openPicker,
    hit: function (x, y) { return hit(cur.m, x, y); }, works: function () { return works; }, galleryItems: function () { return gallery; }
  };
})();
