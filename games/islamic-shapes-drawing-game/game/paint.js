/* Colouring Book: paint.js
   The colour layers of the open page, all in the engine's own DynamicTextures (Phaser 4 command-buffer render targets):
     cb-col  the fills (one tinted silhouette stamp per filled shape)
     cb-str  the brush strokes (one round brush stamp every few units along the finger, composited from cb-tmp)
     cb-tmp  scratch: the strokes of one move, cut to the shape they started in, then drawn into cb-str
     cb-msk  scratch: the inverse silhouette of that shape (everything but the shape), made once per shape
   so a brush stroke is a few stamps into a texture as the finger moves, never a redraw of the strokes before it.
   "Stays inside the shape it started in" is the engine's ERASE blend mode: the stamps go into cb-tmp, the inverse
   silhouette is erased from them, and what is left is drawn into cb-str. The eraser tool is the same stamps with the
   ERASE blend into cb-str. A tap fill stamps the shape's silhouette, tinted, into cb-col (and erases the strokes of
   that shape from cb-str); the old circular wipe is a growing disc cut by the same inverse silhouette.
   Silhouettes: each shape's VISIBLE part (the shape minus the shapes painted over it, as the old painter's order drew
   it), painted once into a small canvas texture the first time the shape is used, with a light-to-deeper top-to-bottom
   shade baked in (the old fill shading), freed when the page changes.
   Game code that stays: the coverage grid (how much of a shape the brush has covered: 4-unit cells, a shape counts as
   coloured at 60%) and the region data; the engine has no "how much of this shape is painted" and no vector regions.
   Saved actions (see game/model.js) replay into these textures in one batch (open, undo, redo). */
(function () {
  'use strict';
  var MD = window.CBModel, CELL = 4, DONE = 0.6;
  var ERASE = Phaser.BlendModes.ERASE;
  var covCv = document.createElement('canvas'), covX = covCv.getContext('2d', { willReadFrequently: true });

  class Paint {
    constructor(scene, px) {
      this.scene = scene; this.px = px; this.k = px / 1000; this.gen = 0;
      var tm = scene.textures;
      ['cb-col', 'cb-str', 'cb-tmp', 'cb-msk', 'cb-flash', 'cb-wipe'].forEach(function (k) { if (tm.exists(k)) tm.remove(k); });
      this.col = tm.addDynamicTexture('cb-col', px, px);
      this.str = tm.addDynamicTexture('cb-str', px, px);
      this.tmp = tm.addDynamicTexture('cb-tmp', px, px);
      this.msk = tm.addDynamicTexture('cb-msk', px, px);
      this.wt = tm.addDynamicTexture('cb-wipe', px, px);   // the growing disc of a wipe, shown over the fills while it runs
      this.wipeImg = null;                                  // (the image that shows it; the page scene sets it)
      this.flashTex = null;
      this.so = { originX: 0.5, originY: 0.5, scaleX: 1, scaleY: 1, tint: 0xffffff, blendMode: 0 };     // options of one stamp, used again (no garbage per frame)
      this.do = { tint: 0xffffff, scale: 1 };
      this.eo = { blendMode: ERASE };
      this.pend = null; var self = this; this.flushFn = function () { self.flush(); };
      this.sils = []; this.covs = []; this.fill = []; this.nstr = []; this.maskR = -1; this.wipe = null; this.m = null;
    }

    // ---- a page ----
    open(def) {
      this.finishWipe(); this.cancelPre(); this.drop();
      var tm = this.scene.textures;
      for (var i = 0; i < this.sils.length; i++) if (this.sils[i]) tm.remove(this.sils[i].key);
      this.gen++; this.sils = []; this.covs = []; this.maskR = -1;
      this.m = MD.model(def); this.def = def;
      this.fill = []; this.nstr = [];
      for (i = 0; i < this.m.regions.length; i++) { this.fill.push(null); this.nstr.push(0); }
      this.col.clear().render(); this.str.clear().render();
      if (this.flashTex) this.flashTex.clear().render();
      this.prebuild();
    }

    // ---- ahead of the first touch ----
    // The silhouette and the coverage grid of every shape never change, so they are made in small slices of the browser's
    // idle time after the page opens (a browser timer, not the engine's: it must not keep the loop awake), and the first
    // tap on a shape finds them ready instead of painting one in the middle of a frame. A slice stops after about 3 ms.
    prebuild() {
      var self = this, gen = this.gen, n = this.m.regions.length, i = 0;
      if (this.pre) { this.cancelPre(); }
      var idle = window.requestIdleCallback;
      var step = function (dl) {
        self.pre = 0;
        if (gen !== self.gen) return;
        var t0 = performance.now();
        while (i < n && performance.now() - t0 < 3 && !(dl && dl.timeRemaining && dl.timeRemaining() < 1)) { self.sil(i); self.cv(i); i++; }
        if (i < n) self.pre = idle ? idle(step, { timeout: 400 }) : setTimeout(step, 24);
        self.preIdle = !!idle;
      };
      this.pre = idle ? idle(step, { timeout: 400 }) : setTimeout(step, 24); this.preIdle = !!idle;
    }
    cancelPre() { if (this.pre) { if (this.preIdle && window.cancelIdleCallback) cancelIdleCallback(this.pre); else clearTimeout(this.pre); this.pre = 0; } }

    // ---- a shape's visible silhouette, painted once when first needed ----
    sil(r) {
      var s = this.sils[r]; if (s) return s;
      var m = this.m, rg = m.regions[r], b = rg.bbox, pad = 3;
      var x0 = Math.max(-20, Math.floor(b[0] - pad)), y0 = Math.max(-20, Math.floor(b[1] - pad)), x1 = Math.min(1020, Math.ceil(b[2] + pad)), y1 = Math.min(1020, Math.ceil(b[3] + pad));
      var w = Math.max(2, x1 - x0), h = Math.max(2, y1 - y0), ks = this.k * 0.8;
      var tw = Math.max(2, Math.ceil(w * ks)), th = Math.max(2, Math.ceil(h * ks)), key = 'sil' + this.gen + '_' + r;
      var cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
      var c = cv.getContext('2d'), sx = tw / w, sy = th / h;
      c.setTransform(sx, 0, 0, sy, -x0 * sx, -y0 * sy);
      var g = c.createLinearGradient(0, b[1], 0, b[3]);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e2e2e2');                 // the old fill shading: light on top, a little deeper below
      c.fillStyle = g; c.fill(rg.path, rg.rule);
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
      for (var j = r + 1; j < m.regions.length; j++) if (MD.overlap(m.regions[j].bbox, b)) c.fill(m.regions[j].path, m.regions[j].rule);
      this.scene.textures.addImage(key, cv);   // a plain image texture: this silhouette never changes, so no CPU pixel copy
      // where it stamps in the page textures: centre and scale in texture pixels
      s = this.sils[r] = { key: key, cx: (x0 + w / 2) * this.k, cy: (y0 + h / 2) * this.k, sx: w * this.k / tw, sy: h * this.k / th };
      return s;
    }
    stampSil(target, r, extra) {
      var s = this.sil(r), o = this.so;
      o.scaleX = s.sx; o.scaleY = s.sy; o.tint = extra && extra.tint != null ? extra.tint : 0xffffff; o.blendMode = extra && extra.blendMode != null ? extra.blendMode : 0;
      target.stamp(s.key, null, s.cx, s.cy, o);
    }
    // everything but shape r, in cb-msk (white where the shape is not)
    setMask(r) {
      if (this.maskR === r) return;
      this.maskR = r;
      this.msk.clear(); this.msk.fill(0xffffff, 1); this.stampSil(this.msk, r, { blendMode: ERASE }); this.msk.render();
    }

    // ---- how much of a shape the brush has covered ----
    cv(r) {
      var o = this.covs[r]; if (o) return o;
      var m = this.m, rg = m.regions[r], b = rg.bbox;
      var x0 = Math.max(0, Math.floor(b[0])), y0 = Math.max(0, Math.floor(b[1])), x1 = Math.min(1000, Math.ceil(b[2])), y1 = Math.min(1000, Math.ceil(b[3]));
      var W = Math.max(1, Math.ceil((x1 - x0) / CELL)), H = Math.max(1, Math.ceil((y1 - y0) / CELL));
      covCv.width = W; covCv.height = H;
      covX.setTransform(1 / CELL, 0, 0, 1 / CELL, -x0 / CELL, -y0 / CELL);
      covX.fillStyle = '#f00'; covX.fill(rg.path, rg.rule);
      covX.globalCompositeOperation = 'destination-out';
      for (var j = r + 1; j < m.regions.length; j++) if (MD.overlap(m.regions[j].bbox, b)) covX.fill(m.regions[j].path, m.regions[j].rule);
      covX.globalCompositeOperation = 'source-over';
      var d = covX.getImageData(0, 0, W, H).data, vis = new Uint8Array(W * H), n = 0;
      for (var i = 0; i < W * H; i++) if (d[i * 4 + 3] > 128) { vis[i] = 1; n++; }
      o = this.covs[r] = { x0: x0, y0: y0, W: W, H: H, vis: vis, n: n, got: new Uint8Array(W * H), cnt: 0 };
      return o;
    }
    resetCov(r) { var o = this.covs[r]; if (o) { o.got.fill(0); o.cnt = 0; } }
    mark(r, pts, w, on) {
      var o = this.cv(r), rad = w / 2, v = on ? 1 : 0;
      for (var q = 0; q < pts.length; q += 2) {
        var cx = pts[q], cy = pts[q + 1];
        var a0 = Math.max(0, Math.floor((cx - rad - o.x0) / CELL)), a1 = Math.min(o.W - 1, Math.floor((cx + rad - o.x0) / CELL));
        var b0 = Math.max(0, Math.floor((cy - rad - o.y0) / CELL)), b1 = Math.min(o.H - 1, Math.floor((cy + rad - o.y0) / CELL));
        for (var yy = b0; yy <= b1; yy++) for (var xx = a0; xx <= a1; xx++) {
          var i = yy * o.W + xx;
          if (!o.vis[i] || o.got[i] === v) continue;
          var dx = o.x0 + (xx + 0.5) * CELL - cx, dy = o.y0 + (yy + 0.5) * CELL - cy;
          if (dx * dx + dy * dy > rad * rad) continue;
          o.got[i] = v; o.cnt += v ? 1 : -1;
        }
      }
    }
    coverage(r) { var o = this.covs[r]; if (!o) return 0; return o.n ? o.cnt / o.n : 1; }
    isDone(r) { return this.fill[r] != null || this.coverage(r) >= DONE; }
    countDone() { var n = 0; for (var i = 0; i < this.fill.length; i++) if (this.isDone(i)) n++; return n; }
    allDone() { for (var i = 0; i < this.fill.length; i++) if (!this.isDone(i)) return false; return true; }

    // ---- fills ----
    // c: a CSS colour or null (paper). animate: { x, y, dur } grows the colour out from the touch, cut to the shape.
    setFill(r, c, animate) {
      this.finishWipe();
      this.fill[r] = c; this.nstr[r] = 0; this.resetCov(r);
      this.stampSil(this.str, r, { blendMode: ERASE }); this.str.render();            // the strokes in this shape go
      if (!c) { this.stampSil(this.col, r, { blendMode: ERASE }); this.col.render(); return; }
      var tint = parseInt(c.slice(1), 16);
      if (!animate || /nowipe/.test(location.search)) { this.stampSil(this.col, r, { tint: tint }); this.col.render(); return; }
      this.setMask(r);
      var b = this.m.regions[r].bbox, x = animate.x, y = animate.y, max = Math.max(Math.hypot(x - b[0], y - b[1]), Math.hypot(x - b[2], y - b[1]), Math.hypot(x - b[0], y - b[3]), Math.hypot(x - b[2], y - b[3]));
      var self = this, w = this.wipe = { r: r, tint: tint, tween: null };
      w.tween = this.scene.tweens.addCounter({
        from: 0, to: 1, duration: animate.dur * 1000, ease: 'Cubic.easeOut',
        onUpdate: function (tw) { self.disc(r, tint, x, y, max * tw.getValue()); },
        onComplete: function () { self.finishWipe(); }
      });
    }
    // one pass per frame: the disc cut to the shape goes into its own picture, which the page camera shows over the fills
    // (before, it was drawn into a scratch picture and then into the fills: two passes a frame)
    disc(r, tint, x, y, rad) {
      var k = this.k, t = this.wt, px = this.px;
      this.setMask(r);
      var o = this.do; o.tint = tint; o.scale = Math.max(0.01, rad * 2 * k / 62);
      t.clear(); t.stamp('ui', 'cb-brush', x * k, y * k, o);
      t.stamp('cb-msk', null, px / 2, px / 2, this.eo); t.render();
      if (this.wipeImg && !this.wipeImg.visible) this.wipeImg.setVisible(true);
    }
    // finish a running wipe at once (any other action, or its end): the whole shape, exact
    finishWipe() {
      var w = this.wipe; if (!w) return; this.wipe = null;
      if (w.tween) { w.tween.stop(); w.tween = null; }
      this.stampSil(this.col, w.r, { tint: w.tint }); this.col.render();
      this.wt.clear().render(); if (this.wipeImg) this.wipeImg.setVisible(false);
    }

    // ---- brush strokes ----
    // the stamps from flat point index i0 on, spaced so a round brush leaves a smooth line; (lx, ly) = where the last was
    walk(op, i0, lx, ly) {
      var p = op.p, step = Math.max(1.5, op.w * 0.14), pts = [], x = lx, y = ly;
      if (i0 === 0) { pts.push(p[0], p[1]); x = p[0]; y = p[1]; i0 = 2; }
      for (var i = i0; i < p.length; i += 2) {
        var dx = p[i] - x, dy = p[i + 1] - y, n = Math.ceil(Math.hypot(dx, dy) / step);
        for (var j = 1; j <= n; j++) pts.push(x + dx * j / n, y + dy * j / n);
        x = p[i]; y = p[i + 1];
      }
      return { pts: pts, lx: x, ly: y };
    }
    // cut these stamps to the stroke's shape and put them into (or, for the eraser, out of) cb-str
    put(op, pts) {
      this.setMask(op.r);
      var k = this.k, t = this.tmp, px = this.px, o = this.do;
      o.tint = op.c ? parseInt(op.c.slice(1), 16) : 0xffffff; o.scale = op.w * k / 62;
      t.clear();
      for (var i = 0; i < pts.length; i += 2) t.stamp('ui', 'cb-brush', pts[i] * k, pts[i + 1] * k, o);
      t.stamp('cb-msk', null, px / 2, px / 2, this.eo); t.render();
      if (op.c) this.str.stamp('cb-tmp', null, px / 2, px / 2); else this.str.stamp('cb-tmp', null, px / 2, px / 2, this.eo);
      this.str.render();
      this.mark(op.r, pts, op.w, !!op.c);
    }
    // a live stroke: begin (first point), then extend with each new point
    begin(op) {
      this.finishWipe(); this.drop();
      this.nstr[op.r]++;
      var s = this.walk(op, 0, 0, 0); this.lx = s.lx; this.ly = s.ly; this.put(op, s.pts);
    }
    // the points of a move are painted once a frame, in the engine's update, however many touch events came in it
    // (the stroke's own point list is kept up to date at once by the caller; only the pictures wait for the frame)
    extend(op, i0) {
      if (this.pend) return;
      this.pend = { op: op, i0: i0 };
      this.scene.events.once('update', this.flushFn);
    }
    flush() {
      var q = this.pend; if (!q) return;
      this.pend = null; this.scene.events.off('update', this.flushFn);
      var s = this.walk(q.op, q.i0, this.lx, this.ly); this.lx = s.lx; this.ly = s.ly; this.put(q.op, s.pts);
    }
    drop() { if (this.pend) { this.pend = null; this.scene.events.off('update', this.flushFn); } }
    // a stroke taken back (cancelled by a second finger): everything is replayed by the caller

    // ---- all saved actions at once (a page opens, undo, redo) ----
    replay(ops) {
      this.finishWipe(); this.drop();
      var self = this;
      this.col.clear(); this.str.clear();
      for (var i = 0; i < this.fill.length; i++) { this.fill[i] = null; this.nstr[i] = 0; this.resetCov(i); }
      ops.forEach(function (op) {
        if (op.t === 'f') {
          self.fill[op.r] = op.c; self.nstr[op.r] = 0; self.resetCov(op.r);
          self.stampSil(self.str, op.r, { blendMode: ERASE });
          if (op.c) self.stampSil(self.col, op.r, { tint: parseInt(op.c.slice(1), 16) }); else self.stampSil(self.col, op.r, { blendMode: ERASE });
        } else if (op.t === 's') {
          self.nstr[op.r]++;
          var s = self.walk(op, 0, 0, 0); self.put(op, s.pts);
        } else if (op.t === 'x') {
          self.col.clear(); self.str.clear();
          for (var j = 0; j < self.fill.length; j++) { self.fill[j] = null; self.nstr[j] = 0; self.resetCov(j); }
        }
      });
      this.col.render(); this.str.render();
    }

    // ---- the shapes still to colour, in gold (a picture for the flash) ----
    flash() {
      if (!this.flashTex) this.flashTex = this.scene.textures.addDynamicTexture('cb-flash', this.px, this.px);
      var t = this.flashTex; t.clear();
      for (var i = 0; i < this.fill.length; i++) if (!this.isDone(i)) this.stampSil(t, i, { tint: 0xffd65a });
      t.render();
      return 'cb-flash';
    }
  }
  window.CBPaint = Paint;
})();
