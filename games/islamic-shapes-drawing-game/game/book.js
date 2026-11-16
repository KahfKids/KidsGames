/* Colouring Book: the page and its tools (scene 'Book', in the design space of Kit.play.fit; scene 'Menu' goes over it).
   Tap a shape to fill it (every page is closed vector regions, so a fill never leaks), or switch to the brush and colour
   with a finger (the brush stays inside the shape it started in). The picture is a list of actions (game/model.js),
   replayed into the engine's textures (game/paint.js), so it can be undone, redone, saved per page and kept in a gallery.

   Cameras (the engine's): the main camera draws the sky, the paper and the buttons; the page camera, a second camera
   whose viewport is the page, draws the colour layers and the line art, so it clips them to the paper (a Mask filter
   with a rounded picture) and zooms and pans them (camera zoom and scroll: two fingers, the wheel, the zoom button);
   the effects camera, last, draws what must lie over the page (sparkles, words, Next, the hint). Layers hold each
   camera's objects (cameras.ignore).
   Layout (game-ui-ux): one pause button and the progress ring in the top-left corner; the tools and the paint pots are
   the child's hands, always shown (never hidden), on dark plates; beside the page on a wide screen (two rails), under
   it on a tall one (upright phones). CBArt.ui sizes them: a button is 44 points on every screen. Everything else
   (resume, pages, saved pictures, save, start again, sound, the way out) is the pause screen (game/menu.js).
   Hand-written here, because the engine has no word for it: the pinch (two fingers = anchor point under the fingers),
   "the child's tap is a tap if it moved under 26 px", and the game rules (which shapes are done). Everything that moves
   is a tween, a timer or a particle emitter; nothing runs per frame (the loop sleeps while the child is not touching). */
(function () {
  'use strict';
  var MD = window.CBModel, SV = window.CBSave, A = window.CBArt, Paint = window.CBPaint;
  var PAGES = MD.PAGES, COLOURS = A.COLOURS, SIZES = [16, 34, 64];
  var FONT = 'system-ui, sans-serif', GAP0 = 30, EDGE0 = 40, MAXZ = 3;
  var bridged = {};

  var T = { font: FONT, color: '#f2f0fa' };
  function tx(scene, x, y, s, size, w, o) {
    var t = scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: w || '700', color: '#f2f0fa' }, o || {}));
    t.setResolution(Math.min(2, Math.max(1, (scene.view && scene.view.z) || 1)));
    return t;
  }

  class Book extends Phaser.Scene {
    constructor() { super({ key: 'Book' }); }

    create() {
      var self = this;
      this.events.once('shutdown', function () { self.stopPraise(); });
      Kit.snd.amb('amb-room', { fade: 3 });                    // the quiet of a room at home while the child colours, very low
      this.touch = this.sys.game.device.input.touch;
      this.device = this.touch ? 'touch' : 'keys';
      this.store = SV.store; this.progress = SV.progress;
      this.tool = this.store.get('tool', 'fill'); this.colour = Math.min(COLOURS.length - 1, this.store.get('colour', 3)); this.size = this.store.get('size', 1) % 3;
      this.lastPaintTool = this.tool === 'eraser' ? 'fill' : this.tool;
      this.cur = { n: 0, def: null, ops: [], redo: [], gid: null, dirty: false, done: false, book: null };
      this.V = { z: 1, cx: 500, cy: 500 }; this.pz = 0.5; this.pop = { k: 1 };
      this.live = null; this.pending = null; this.touches = {}; this.nTouch = 0; this.pinch = null; this.ready = false; this.hint = null; this.celebrating = false;
      this.mode = 'rails'; this.page = { x: 0, y: 0, s: 800 }; this.ems = {}; this.sig = {};

      // layers: one per camera
      this.Lm = this.add.layer(); this.Lp = this.add.layer(); this.Lf = this.add.layer();
      this.cameras.main.ignore([this.Lp, this.Lf]);
      this.pcam = this.cameras.add(0, 0, 10, 10); this.pcam.ignore([this.Lm, this.Lf]);
      this.fcam = this.cameras.add(0, 0, 10, 10); this.fcam.ignore([this.Lm, this.Lp]); this.fcam.setVisible(false);   // shown only while something is over the page

      // the sky, the paper and the glow are ONE picture (composed when the layout or the book changes); the buttons and the
      // pots are three more (the dock); touch targets are Zones; a ring that answers each touch
      this.sky = this.Lm.add(this.add.image(0, 0, 'ui', 'ui-px').setOrigin(0));
      this.imgs = {};
      ['top', 'tools', 'pal'].forEach(function (k) { self.imgs[k] = self.Lm.add(self.add.image(0, 0, 'ui', 'ui-px').setOrigin(0)); });
      this.rip = this.Lm.add(this.add.image(0, 0, 'ui', 'pot-ring').setVisible(false));

      // the colour layers and the line art, in page units (0..1000), seen by the page camera
      var px = this.rtSize();
      this.paint = new Paint(this, px);
      var s = 1000 / px;
      this.Lp.add(this.add.rectangle(0, 0, 1000, 1000, 0xfffdf7).setOrigin(0));
      this.colImg = this.Lp.add(this.add.image(0, 0, 'cb-col').setOrigin(0).setScale(s));
      this.wipeImg = this.Lp.add(this.add.image(0, 0, 'cb-wipe').setOrigin(0).setScale(s).setVisible(false)); this.paint.wipeImg = this.wipeImg;
      this.strImg = this.Lp.add(this.add.image(0, 0, 'cb-str').setOrigin(0).setScale(s));
      this.flashImg = this.Lp.add(this.add.image(0, 0, 'cb-col').setOrigin(0).setScale(s).setVisible(false));
      this.lpx = Phaser.Math.Clamp(Math.round(Math.min(window.innerWidth, window.innerHeight) * Kit.play.dpr()), 1024, 1800);
      this.lineCv = document.createElement('canvas'); this.lineCv.width = this.lineCv.height = this.lpx;
      // Only the source canvas is repainted; CanvasTexture's retained CPU readback is never used.
      this.lines = this.textures.addImage('cb-lines', this.lineCv);
      this.linImg = this.Lp.add(this.add.image(0, 0, 'cb-lines').setOrigin(0).setScale(1000 / this.lpx));
      this.sweep = this.Lp.add(this.add.image(0, 0, 'ui', 'fx-sweep').setOrigin(0.5).setVisible(false).setAngle(-12));
      this.ringTex = this.textures.get('ui-ring');

      this.buildUi();
      this.buildKeys();
      this.buildInput();
      var fitted = Kit.play.fit(this, function (v) { self.layout(v); });
      this.game.events.on('hidden', function () { self.stopBrushSound(); });

      // open the page the child was on
      var n = this.progress.current() - 1;
      if (/[?&]page=(\d+)/.test(location.search)) n = +RegExp.$1 - 1;
      this.openPage(n);
      var hinted = this.store.get('hinted', 0);
      if (!hinted) this.showHint(this.touch ? 'Tap a shape to colour it' : 'Click a shape to colour it');
      this.events.on('resume', function () { self.touches = {}; self.nTouch = 0; self.pinch = null; self.live = null; self.pending = null; self.stopBrushSound(); });
      if (Kit.load) this.time.delayedCall(60, function () { Kit.load.done(); });
      if (Kit.play.debug) this.debugHook();
    }

    // texture size of the colour layers: the page as seen on this screen, kept in bounds for a small phone
    rtSize() {
      var mem = navigator.deviceMemory || 4, big = Math.min(window.innerWidth, window.innerHeight) * Kit.play.dpr();
      return mem <= 2 ? 768 : big > 1100 ? 1280 : 1024;
    }

    /* ---------------- the interface ----------------
       The dock: the buttons and the paint pots are pictures stamped from the atlas 'ui' into three small DynamicTextures
       (the corner, the tools, the palette), each shown as ONE image and recomposed only when something they show changes
       (a tool, a colour, the size, undo and redo, the progress). Touch targets are Zones (nothing to draw). A touch is
       answered at once: the state changes (the gold plate, the ring round a pot) and a ring grows from the touch. */
    buildUi() {
      var self = this;
      this.btn = {}; this.cl = { top: { items: [] }, tools: { items: [] }, pal: { items: [] } };
      var def = function (id, cl, o) {
        var it = Object.assign({ id: id, cl: cl, x: 0, y: 0, s: 150, icons: [], dis: false, on: null }, o);
        it.zone = self.add.zone(0, 0, 150, 150).setInteractive(); self.Lm.add(it.zone);
        it.zone.on('pointerdown', function () {
          if (it.dis) return;
          Kit.snd.play(it.sound || 'tap'); self.ripple(it.x, it.y, it.s);
          if (it.down) it.down();
        });
        if (it.up) it.zone.on('pointerup', function () { if (!it.dis) it.up(); });
        self.btn[id] = it; self.cl[cl].items.push(it); return it;
      };
      var tint = function (on, dark) { return on ? 0x2a1606 : 0xffffff; };
      def('pause', 'top', { icons: [{ f: 'ic-pause' }], up: function () { self.openMenu('pause'); } });
      def('ring', 'top', { ring: true, up: function () { self.showMissing(); } });
      def('fill', 'tools', { sound: 'tool', icons: [{ f: 'ic-fill', t: tint }, { f: 'ic-drop', t: function () { return A.INTS[self.colour]; } }], on: function () { return self.tool === 'fill'; }, down: function () { self.setTool('fill'); } });
      def('brush', 'tools', { sound: 'tool', icons: [{ f: 'ic-brush', t: tint }, { f: 'ic-tip', t: function () { return A.INTS[self.colour]; } }], on: function () { return self.tool === 'brush'; }, down: function () { self.setTool('brush'); } });
      def('eraser', 'tools', { sound: 'tool', icons: [{ f: 'ic-eraser', t: tint }], on: function () { return self.tool === 'eraser'; }, down: function () { self.setTool('eraser'); } });
      def('size', 'tools', { icons: [{ f: function () { return 'ic-s' + self.size; } }], alpha: function () { return self.tool === 'fill' ? 0.5 : 1; }, down: function () {
        self.size = (self.size + 1) % 3; self.store.set('size', self.size); self.updateUi();
      } });
      def('undo', 'tools', { sound: 'undo', icons: [{ f: 'ic-undo' }], alpha: function () { return self.btn.undo.dis ? 0.4 : 1; }, down: function () { self.undo(); } });
      def('redo', 'tools', { sound: 'undo', icons: [{ f: 'ic-redo' }], alpha: function () { return self.btn.redo.dis ? 0.4 : 1; }, down: function () { self.redo(); } });
      // the palette is one picture and one Zone: the pot under the touch is worked out from where it landed
      this.palZone = this.add.zone(0, 0, 100, 100).setInteractive(); this.Lm.add(this.palZone);
      this.palZone.on('pointerdown', function (p, lx, ly) {
        var g = self.palGrid, i = Math.floor(lx / g.cell) + g.cols * Math.floor(ly / g.cell);
        if (i < 0 || i >= COLOURS.length || Math.floor(lx / g.cell) >= g.cols) return;
        self.colour = i; self.store.set('colour', i);
        if (self.tool === 'eraser') self.setTool(self.lastPaintTool, true);
        Kit.snd.play('pot'); self.ripple(g.x + (i % g.cols + 0.5) * g.cell, g.y + (Math.floor(i / g.cols) + 0.5) * g.cell, g.cell);
        self.updateUi();
      });
      // over the page, so on the effects layer (shown only while there is something there)
      var zp = this.add.image(0, 0, 'ui', 'ui-plate'), zi = this.add.image(0, 0, 'ui', 'ic-zoom').setScale(0.9);
      this.bZoom = this.add.container(0, 0, [zp, zi]).setSize(150, 150).setInteractive(); this.Lf.add(this.bZoom); this.bZoom.setVisible(false);
      this.bZoom.on('pointerdown', function () { Kit.snd.play('tap'); });
      this.bZoom.on('pointerup', function () { Kit.snd.play('zoom'); self.resetView(true); });
      this.bNext = this.add.container(0, 0).setSize(340, 150); this.Lf.add(this.bNext);
      this.nextG = this.add.container(0, 0, [this.add.image(0, 0, 'ui', 'ui-pill-gold'), this.add.text(-40, 0, 'Next', { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: '#2a1606' }).setOrigin(0.5), this.add.image(88, 0, 'ui', 'ic-next').setTint(0x2a1606).setScale(0.8)]);
      this.bNext.add(this.nextG); this.bNext.setInteractive(); this.bNext.setVisible(false);
      this.bNext.on('pointerdown', function () { Kit.snd.play('page'); self.tweens.add({ targets: self.nextG, scale: 0.92, duration: 80, yoyo: true }); });
      this.bNext.on('pointerup', function () { self.openPage((self.cur.n + 1) % PAGES.length); });
    }
    nextShow(v) { this.bNext.setVisible(v).setAlpha(1); if (v) this.fxSoon(0); else this.fxCheck(); }
    // a ring that grows from a touch (one image, used again)
    ripple(x, y, s) {
      var r = this.rip, k = s / 120;
      this.tweens.killTweensOf(r); r.setVisible(true).setPosition(x, y).setScale(k * 0.8).setAlpha(0.9);
      this.tweens.add({ targets: r, scale: k * 1.4, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: function () { r.setVisible(false); } });
    }
    setTool(t, quiet) {
      this.tool = t; this.store.set('tool', t);
      if (t !== 'eraser') this.lastPaintTool = t;
      if (t === 'brush' && !quiet) Kit.snd.loop('brush', { vol: 0.0001, fade: 0.01 }).stop(0.01);     // warm the loop's file
      if (t === 'brush' && !quiet && !this.store.get('brushHinted', 0) && !this.hint) {
        this.store.set('brushHinted', 1);
        this.showHint(this.touch ? 'Draw with your finger' : 'Draw with the mouse', 4000);
      }
      this.updateUi();
    }
    updateUi() {
      var cur = this.cur;
      this.btn.undo.dis = !cur.ops.length; this.btn.redo.dis = !cur.redo.length;
      var sg = this.sig, rk = 'x';
      if (cur.def) { var n = this.paint.fill.length, f = this.paint.countDone() / n; A.ring(this, f, cur.done); rk = Math.round(Math.max(0, Math.min(1, f)) * 100) + (cur.done ? 'd' : ''); }
      // a picture is composed again only when something it shows has changed (a fill moves the ring, not the pots)
      var st = { top: rk, tools: this.tool + '|' + this.colour + '|' + this.size + '|' + this.btn.undo.dis + this.btn.redo.dis, pal: '' + this.colour };
      for (var id in st) if (sg[id] !== st[id]) { sg[id] = st[id]; this.compose(id); }
    }
    // stamp one cluster's pictures into its texture, at the screen's pixels
    compose(id) {
      var cl = this.cl[id], t = cl.tex; if (!t) return;
      var z = cl.z, ix = this.imgs[id]; t.clear();
      if (id === 'pal') {
        var g = this.palGrid, k = 1.28 * g.cell / 140 * z;
        for (var i = 0; i < COLOURS.length; i++) {
          var cx = (g.x + (i % g.cols + 0.5) * g.cell - cl.x) * z, cy = (g.y + (Math.floor(i / g.cols) + 0.5) * g.cell - cl.y) * z;
          t.stamp('ui', 'pot' + i, cx, cy, { scale: k });
          if (i === this.colour) t.stamp('ui', 'pot-ring', cx, cy, { scale: 1.12 * g.cell / 140 * z });
        }
      } else cl.items.forEach(function (it) {
        var cx = (it.x - cl.x) * z, cy = (it.y - cl.y) * z, k = it.s / 150 * z, on = it.on && it.on(), al = it.alpha ? it.alpha() : 1;
        t.stamp('ui', on ? 'ui-plate-on' : 'ui-plate', cx, cy, { scale: k, alpha: al });
        if (it.ring) t.stamp('ui-ring', null, cx, cy, { scale: k * 1.05, alpha: al });
        it.icons.forEach(function (ic) {
          t.stamp('ui', typeof ic.f === 'function' ? ic.f() : ic.f, cx, cy, { scale: k * 0.9, alpha: al, tint: ic.t ? ic.t(on) : 0xffffff });
        });
      });
      t.render();
    }
    // the sky: gradient, lattice, glow behind the page, vignette and the paper, composed once for this layout and book at
    // half the screen's pixels (it is soft)
    composeSky() {
      var v = this.v, b = this.cur.book; if (!v || !b) return;
      var z = v.z * 0.5, w = Math.ceil((v.w + 200) * z), h = Math.ceil((v.h + 200) * z), ox = v.l - 100, oy = v.t - 100, p = this.page;
      if (!this.skyTex || this.skyTex.width !== w || this.skyTex.height !== h) {
        if (this.skyTex) this.textures.remove('cb-sky');
        this.skyTex = this.textures.addDynamicTexture('cb-sky', w, h);
        this.sky.setTexture('cb-sky');
      }
      var t = this.skyTex, gl = parseInt(b.glow.slice(1), 16);
      t.clear();
      t.stamp('bg-' + b.id, null, w / 2, h / 2, { scaleX: w / 8, scaleY: h / 256 });
      for (var y = 0; y < (v.h + 200); y += 460) for (var x = 0; x < (v.w + 200); x += 230) t.stamp('bg-lat', null, x * z, y * z, { originX: 0, originY: 0, scale: z, tint: gl, alpha: 0.85 });
      t.stamp('fx-glow', null, (p.x + p.s / 2 - ox) * z, (p.y + p.s / 2 - oy) * z, { scale: p.s * 2 * z / 256, tint: gl, alpha: 0.3 });
      t.stamp('fx-vig', null, w / 2, h / 2, { scaleX: w / 256, scaleY: h / 256 });
      t.stamp('paper', null, (p.x + p.s / 2 - ox) * z, (p.y + p.s / 2 - oy) * z, { scale: p.s / 1000 * z });
      t.render();
      this.sky.setPosition(ox, oy).setScale(1 / z);
    }
    // the effects camera draws only while something is over the page (it costs a pass a frame)
    fxSoon(ms) {
      var self = this; this.fcam.setVisible(true);
      this.time.delayedCall(ms + 40, function () { self.fxCheck(); });
    }
    fxCheck() {
      var self = this, all = this.Lf.getAll(), live = false, shown = false;
      for (var i = 0; i < all.length; i++) {
        var o = all[i];
        if (o.getAliveParticleCount) { if (o.getAliveParticleCount()) live = true; } else if (o.visible) shown = true;
      }
      if (live) { this.time.delayedCall(40, function () { self.fxCheck(); }); return; }       // sparks still falling
      this.fcam.setVisible(shown);
    }

    /* ---------------- layout (design units; CBArt.ui: a button is 44 points) ---------------- */
    layout(v) {
      this.v = v; this.sig = {};
      var U = A.ui(v), B = 150 * U, GAP = GAP0 * U, EDGE = EDGE0 * U, main = this.cameras.main, f = this.fcam, I = this.btn;
      f.setViewport(0, 0, this.scale.width, this.scale.height).setZoom(main.zoom).setScroll(main.scrollX, main.scrollY);
      var rails = v.w / v.h >= 1.2; this.mode = rails ? 'rails' : 'stacked';
      var put = function (it, s, x, y) { it.x = x; it.y = y; it.s = s; it.zone.setPosition(x, y).setSize(s, s); it.zone.input.hitArea.setSize(s, s); };
      var P, px, py, cell, pal = {};
      if (rails) {
        var x0 = v.sl + EDGE, y0 = v.st + EDGE, availH = v.sb - v.st - 2 * EDGE, Bs = Math.min(B, (availH - 3 * GAP) / 4);
        var c1 = x0 + Bs / 2, c2 = c1 + Bs + GAP, row = function (i) { return y0 + Bs / 2 + i * (Bs + GAP); };
        put(I.pause, Bs, c1, row(0)); put(I.ring, Bs, c2, row(0)); put(I.fill, Bs, c1, row(1)); put(I.brush, Bs, c2, row(1));
        put(I.eraser, Bs, c1, row(2)); put(I.size, Bs, c2, row(2)); put(I.undo, Bs, c1, row(3)); put(I.redo, Bs, c2, row(3));
        cell = Math.min(140 * U, availH / 7);
        var px0 = v.sr - EDGE - 3 * cell, py0 = y0 + (availH - 7 * cell) / 2;
        pal = { x: px0, y: py0, cell: cell, cols: 3, rows: 7 };
        var ax0 = x0 + 2 * Bs + GAP * 3, ax1 = px0 - GAP * 2; P = Math.max(300, Math.min(ax1 - ax0, availH));
        px = ax0 + (ax1 - ax0 - P) / 2; py = y0 + (availH - P) / 2;
      } else {
        var availW = v.sr - v.sl - 2 * EDGE, cx = (v.sl + v.sr) / 2;
        cell = Math.min(availW / 7, 64 * v.pt);
        var palTop = v.sb - EDGE - 3 * cell, pl = cx - 3.5 * cell;
        pal = { x: pl, y: palTop, cell: cell, cols: 7, rows: 3 };
        var Bt = Math.min(B, (availW - 5 * GAP) / 6), ty = palTop - GAP - Bt / 2, tl = cx - (6 * Bt + 5 * GAP) / 2 + Bt / 2;
        [I.fill, I.brush, I.eraser, I.size, I.undo, I.redo].forEach(function (b, i) { put(b, Bt, tl + i * (Bt + GAP), ty); });
        var Bp = Math.min(B, 150 * U), topY = v.st + EDGE + Bp / 2;
        put(I.pause, Bp, v.sl + EDGE + Bp / 2, topY); put(I.ring, Bp, v.sl + EDGE + Bp * 1.5 + GAP, topY);
        var ay0 = topY + Bp / 2 + GAP, ay1 = ty - Bt / 2 - GAP; P = Math.max(300, Math.min(availW, ay1 - ay0));
        px = cx - P / 2; py = ay0 + (ay1 - ay0 - P) / 2;
      }
      this.page = { x: px, y: py, s: P, u: U };
      this.palGrid = pal; this.palZone.setPosition(pal.x, pal.y).setOrigin(0).setSize(pal.cols * pal.cell, pal.rows * pal.cell);
      this.palZone.input.hitArea.setSize(pal.cols * pal.cell, pal.rows * pal.cell);
      // the dock pictures: one texture each, as big as the buttons in it, at this screen's pixels
      var z = v.z, self = this;
      var box = function (items, extra) {
        var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        items.forEach(function (it) { x0 = Math.min(x0, it.x - it.s / 2); y0 = Math.min(y0, it.y - it.s / 2); x1 = Math.max(x1, it.x + it.s / 2); y1 = Math.max(y1, it.y + it.s / 2); });
        if (extra) { x0 = extra.x; y0 = extra.y; x1 = extra.x + extra.w; y1 = extra.y + extra.h; }
        return { x: x0 - 4, y: y0 - 4, w: x1 - x0 + 8, h: y1 - y0 + 8 };
      };
      ['top', 'tools', 'pal'].forEach(function (id) {
        var cl = self.cl[id], bx = box(cl.items, id === 'pal' ? { x: pal.x, y: pal.y, w: pal.cols * pal.cell, h: pal.rows * pal.cell } : null);
        var w = Math.ceil(bx.w * z), h = Math.ceil(bx.h * z), key = 'cb-ui-' + id;
        if (!cl.tex || cl.tex.width !== w || cl.tex.height !== h) { if (cl.tex) self.textures.remove(key); cl.tex = self.textures.addDynamicTexture(key, w, h); self.imgs[id].setTexture(key); }
        cl.x = bx.x; cl.y = bx.y; cl.z = z; self.imgs[id].setPosition(bx.x, bx.y).setScale(1 / z);
      });
      // the page camera: its viewport is the page on the screen (canvas pixels)
      var vx = Math.round((px - v.l) * z), vy = Math.round((py - v.t) * z), vs = Math.round(P * z);
      this.pcam.setViewport(vx, vy, vs, vs); this.pz = vs / 1000;
      this.applyView();
      // over the page
      var zs = Math.min(B, 150 * U) * 0.8;
      this.bZoom.setScale(zs / 150).setPosition(px + P - zs / 2 - 14 * U, py + zs / 2 + 14 * U);
      var ns = Math.min(1.3 * U, P / 1000 * 1.6);
      this.bNext.setScale(ns).setPosition(px + P / 2, py + P - 30 * ns);
      this.placeHint();
      if (this.cur.def) { this.composeSky(); this.updateUi(); }
    }
    applyView() {
      var V = this.V, vis = 500 / V.z;
      V.cx = Phaser.Math.Clamp(V.cx, vis, 1000 - vis); V.cy = Phaser.Math.Clamp(V.cy, vis, 1000 - vis);
      var k = 0.9 + 0.1 * this.pop.k;
      this.pcam.setZoom(this.pz * V.z * k).centerOn(V.cx, V.cy).setAlpha(Math.min(1, this.pop.k * 2));
      var zv = V.z > 1.02; if (zv !== this.bZoom.visible) { this.bZoom.setVisible(zv); if (zv) this.fxSoon(0); else this.fxCheck(); }
    }
    resetView(animate) {
      var V = this.V, self = this;
      if (!animate) { V.z = 1; V.cx = 500; V.cy = 500; this.applyView(); return; }
      this.tweens.add({ targets: V, z: 1, cx: 500, cy: 500, duration: 300, ease: 'Cubic.easeOut', onUpdate: function () { self.applyView(); } });
    }
    // page units <-> screen
    // (worked out from the view, not from the camera's matrices, which the engine refreshes at the next frame)
    toPage(p) { var c = this.pcam, V = this.V; return { x: V.cx + (p.x - c.x - c.width / 2) / c.zoom, y: V.cy + (p.y - c.y - c.height / 2) / c.zoom }; }
    toScreen(wx, wy) { var c = this.pcam, V = this.V; return { x: c.x + c.width / 2 + (wx - V.cx) * c.zoom, y: c.y + c.height / 2 + (wy - V.cy) * c.zoom }; }
    toFx(wx, wy) {       // a page point in design units (the effects camera)
      var s = this.toScreen(wx, wy), v = this.v;
      return { x: v.l + s.x / v.z, y: v.t + s.y / v.z };
    }
    inPage(p) { var c = this.pcam; return p.x >= c.x && p.y >= c.y && p.x <= c.x + c.width && p.y <= c.y + c.height; }

    /* ---------------- opening a page ---------------- */
    stopPraise() {
      if (this.praiseTimer) { this.praiseTimer.remove(); this.praiseTimer = null; }
      Kit.snd.stopVoice();
    }
    openPage(n, ops, gid) {
      this.stopPraise();
      n = Phaser.Math.Clamp(n, 0, PAGES.length - 1);
      var def = PAGES[n], w = SV.works[def.id] || {}, cur = this.cur;
      this.tweens.killTweensOf(this.pop); this.tweens.killTweensOf(this.V);
      cur.n = n; cur.def = def; cur.book = MD.bookOf(def);
      cur.ops = (ops || w.ops || []).slice(); cur.redo = [];
      cur.gid = ops ? gid : (w.gid || null); cur.dirty = ops ? false : !!w.dirty;
      this.paint.open(def);
      this.paint.replay(cur.ops);
      cur.done = this.paint.allDone();
      this.live = null; this.pending = null; this.celebrating = false; this.flashImg.setVisible(false); this.sweep.setVisible(false);
      this.progress.setCurrent(n + 1);
      if (ops) SV.persist(def, cur);
      // line art, painted once for this page
      var c = this.lineCv.getContext('2d'), k = this.lpx / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.lpx, this.lpx); c.setTransform(k, 0, 0, k, 0, 0);
      MD.paintLines(c, MD.model(def), MD.LINE); this.lines.source[0].update();
      // the sky of this book
      var b = cur.book;
      this.composeSky();
      this.cameras.main.setBackgroundColor(b.sky[0]);
      this.resetView(false);
      this.nextShow(cur.done);
      this.ready = false; this.pop.k = 0;
      var self = this;
      this.tweens.add({ targets: this.pop, k: 1, duration: 450, ease: 'Back.easeOut', onUpdate: function () { self.applyView(); }, onComplete: function () { self.ready = true; } });
      this.time.delayedCall(200, function () { self.ready = true; });
      this.applyView(); this.updateUi();
    }

    /* ---------------- input ---------------- */
    buildInput() {
      var self = this, inp = this.input;
      inp.on('pointerdown', function (p, over) { self.down(p, over); });
      inp.on('pointermove', function (p) { self.move(p); });
      inp.on('pointerup', function (p) { self.up(p); });
      inp.on('pointerupoutside', function (p) { self.up(p); });
      inp.on('wheel', function (p, over, dx, dy) {
        if (!self.inPage(p)) return;
        self.zoomAt(p.x, p.y, Phaser.Math.Clamp(self.V.z * Math.exp(-dy * 0.0015), 1, MAXZ));
      });
    }
    setDevice(d) { if (d !== this.device) { this.device = d; this.hintDevice(); } }
    down(p, over) {
      this.setDevice(p.wasTouch ? 'touch' : 'keys');
      if (over && over.length) return;
      if (p.wasTouch) {
        this.touches[p.id] = { x: p.x, y: p.y }; this.nTouch++;
        if (this.nTouch === 2) { this.cancelSingle(); this.startPinch(); return; }
        if (this.nTouch > 2) return;
      }
      if (!this.ready || this.pinch || !this.inPage(p)) return;
      var w = this.toPage(p), r = MD.hit(MD.model(this.cur.def), w.x, w.y);
      if (r < 0) return;
      if (this.tool === 'fill') { this.pending = { x: w.x, y: w.y, sx: p.x, sy: p.y, r: r, id: p.id }; return; }
      var op = { t: 's', r: r, c: this.tool === 'eraser' ? null : COLOURS[this.colour], w: SIZES[this.size], p: [Math.round(w.x), Math.round(w.y)] };
      this.live = { op: op, id: p.id, sx: p.x, sy: p.y, far: 0, vol: 0 };
      this.paint.begin(op);
      this.startBrushSound(this.tool === 'eraser' ? 'rub' : 'brush');
    }
    move(p) {
      if (this.touches[p.id]) { this.touches[p.id].x = p.x; this.touches[p.id].y = p.y; }
      if (this.pinch && this.pinch.live) { this.pinchMove(); return; }
      var L = this.live; if (!L || L.id !== p.id) return;
      var w = this.toPage(p), op = L.op, n = op.p.length;
      if (Math.hypot(w.x - op.p[n - 2], w.y - op.p[n - 1]) < 3) return;
      op.p.push(Math.round(w.x), Math.round(w.y));
      L.far = Math.max(L.far, Math.hypot(p.x - L.sx, p.y - L.sy));
      this.paint.extend(op, n);
      this.brushSpeed(p);
    }
    up(p) {
      if (this.touches[p.id]) {
        delete this.touches[p.id]; this.nTouch = Math.max(0, this.nTouch - 1);
        if (this.pinch && this.pinch.live && this.nTouch < 2) { this.pinch.live = false; if (this.V.z < 1.08) this.resetView(true); }
        if (!this.nTouch) this.pinch = null;
        if (this.pinch === null && !this.live && !this.pending) return;
      }
      if (this.pinch) { this.pending = null; return; }
      var d = this.pending;
      if (d && d.id === p.id) {
        this.pending = null;
        if (Math.hypot(p.x - d.sx, p.y - d.sy) < 26 * Kit.play.dpr()) this.fillAt(d.r, d.x, d.y, COLOURS[this.colour]);
        return;
      }
      var L = this.live; if (!L || L.id !== p.id) return;
      this.live = null; this.stopBrushSound(); this.paint.flush();
      var op = L.op;
      if (op.c === null && L.far < 14 * Kit.play.dpr()) {            // a tap with the eraser clears the whole shape
        this.paint.nstr[op.r] = Math.max(0, this.paint.nstr[op.r] - 1);
        this.paint.replay(this.cur.ops);
        this.fillAt(op.r, op.p[0], op.p[1], null);
        return;
      }
      this.commit(op);
      this.afterChange(op.p[op.p.length - 2], op.p[op.p.length - 1]);
    }
    // a second finger: the stroke in progress was not meant, take it back
    cancelSingle() {
      this.pending = null; this.stopBrushSound();
      if (this.live) { this.live = null; this.paint.replay(this.cur.ops); }
    }
    startPinch() {
      var ids = Object.keys(this.touches), a = this.touches[ids[0]], b = this.touches[ids[1]];
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, w = this.toPage({ x: mx, y: my });
      this.pinch = { live: true, d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z0: this.V.z, ax: w.x, ay: w.y };
      this.hideHint();
    }
    pinchMove() {
      var ids = Object.keys(this.touches); if (ids.length < 2) return;
      var a = this.touches[ids[0]], b = this.touches[ids[1]], P = this.pinch;
      var z = Phaser.Math.Clamp(P.z0 * Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)) / P.d0, 1, MAXZ);
      this.anchor(P.ax, P.ay, (a.x + b.x) / 2, (a.y + b.y) / 2, z);
    }
    // zoom to z keeping page point (ax, ay) under screen point (sx, sy)
    anchor(ax, ay, sx, sy, z) {
      var c = this.pcam, V = this.V, zoom = this.pz * z * (0.9 + 0.1 * this.pop.k);
      V.z = z; V.cx = ax - (sx - (c.x + c.width / 2)) / zoom; V.cy = ay - (sy - (c.y + c.height / 2)) / zoom;
      this.applyView();
    }
    zoomAt(sx, sy, z) { var w = this.toPage({ x: sx, y: sy }); this.anchor(w.x, w.y, sx, sy, z); }

    /* ---------------- colouring ---------------- */
    fillAt(r, x, y, c) {
      var P = this.paint;
      if (P.fill[r] === c && !P.nstr[r]) { Kit.snd.play('tap', { vol: 0.5, rate: 0.85 }); return; }
      var b = P.m.regions[r].bbox, rad = Math.max(Math.hypot(x - b[0], y - b[1]), Math.hypot(x - b[2], y - b[1]), Math.hypot(x - b[0], y - b[3]), Math.hypot(x - b[2], y - b[3]));
      var area = Math.min(1, ((b[2] - b[0]) * (b[3] - b[1])) / 250000);
      P.setFill(r, c, c ? { x: x, y: y, dur: Phaser.Math.Clamp(0.22 + rad / 2600, 0.25, 0.55) } : null);
      this.commit({ t: 'f', r: r, c: c });
      if (c) { Kit.snd.play('fill', { vol: 0.8 + 0.2 * area }); if (area > 0.35) Kit.snd.play('wash', { vol: 0.5 + 0.5 * area, delay: 0.04 }); } else Kit.snd.play('erase');
      Kit.buzz(6);
      if (c) this.burst(x, y, A.INTS[this.colour]);
      this.afterChange(x, y);
    }
    commit(op) {
      var cur = this.cur; cur.ops.push(op); cur.redo.length = 0; cur.dirty = true;
      if (this.hint && this.hintKey === 'first') { this.store.set('hinted', 1); }
      this.hideHint();
      SV.persist(cur.def, cur);
    }
    afterChange(x, y) {
      var cur = this.cur, was = cur.done;
      cur.done = this.paint.allDone();
      if (cur.done && !was) this.complete(x, y);
      if (!cur.done) this.nextShow(false);
      if (this.flashImg.visible) this.flashAgain();
      this.updateUi();
    }
    rerender() {
      var cur = this.cur, was = cur.done;
      this.paint.replay(cur.ops);
      cur.dirty = true; SV.persist(cur.def, cur);
      cur.done = this.paint.allDone();
      if (!cur.done) this.nextShow(false); else if (!was) this.nextShow(true);
      if (this.flashImg.visible) this.flashAgain();
      this.updateUi();
    }
    undo() { var cur = this.cur; if (!cur.ops.length || this.live) return; this.stopPraise(); cur.redo.push(cur.ops.pop()); this.rerender(); }
    redo() { var cur = this.cur; if (!cur.redo.length || this.live) return; cur.ops.push(cur.redo.pop()); this.rerender(); }
    // start again: everything off the page (kept in the actions so it can be undone)
    clearPage() {
      var cur = this.cur; if (!cur.ops.length) return;
      cur.ops.push({ t: 'x' }); cur.redo.length = 0; cur.gid = null;
      Kit.snd.play('clear'); this.rerender();
    }

    /* ---------------- sound of the brush ---------------- */
    startBrushSound(kind) {
      this.stopBrushSound();
      this.snd = { h: Kit.snd.loop(kind, { vol: 0.0001, fade: 0.12 }), kind: kind, v: 0, t: 0 };
    }
    // louder with the finger's speed, silent when it rests; never more often than every 90 ms
    brushSpeed(p) {
      var s = this.snd; if (!s) return;
      var now = this.time.now; if (now - s.t < 90) return; s.t = now;
      var sp = Phaser.Math.Clamp(p.velocity.length() / 14, 0, 1), v = (s.kind === 'rub' ? 0.9 : 0.8) * sp;
      if (Math.abs(v - s.v) > 0.08) { s.v = v; s.h.vol(Math.max(0.0001, v), 0.1); }
    }
    stopBrushSound() { if (this.snd) { this.snd.h.stop(0.2); this.snd = null; } }

    /* ---------------- keys: Esc pause, M sound, R start again, Z / Y undo redo, F B E tools ---------------- */
    buildKeys() {
      var self = this, kb = this.input.keyboard;
      var K = this.keys = kb.addKeys('ESC,M,R,Z,Y,F,B,E,S,N');
      var free = function (f) { return function () { if (self.ready) f(); }; };
      kb.on('keydown', function () { self.setDevice('keys'); });
      K.ESC.on('down', function () { self.openMenu('pause'); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); });
      K.R.on('down', function () { self.openMenu('clear'); });
      K.Z.on('down', function (e) { if (e.shiftKey) self.redo(); else self.undo(); });
      K.Y.on('down', function () { self.redo(); });
      K.F.on('down', free(function () { self.setTool('fill'); })); K.B.on('down', free(function () { self.setTool('brush'); })); K.E.on('down', free(function () { self.setTool('eraser'); }));
      K.N.on('down', function () { if (self.cur.done) self.openPage((self.cur.n + 1) % PAGES.length); });
      K.S.on('down', function () { self.saveToGallery(); });
    }

    /* ---------------- hints (words follow the device in use, until used) ---------------- */
    showHint(s, ms, key) {
      this.hideHint();
      this.hintKey = s.indexOf('shape') >= 0 ? 'first' : 'brush';
      this.hint = tx(this, 0, 0, s, 46, '700', { backgroundColor: 'rgba(14,10,34,0.82)', padding: { x: 34, y: 18 }, align: 'center' }).setOrigin(0.5, 1);
      this.Lf.add(this.hint); this.hintMs = ms; this.fxSoon(0);
      this.placeHint();
      this.hint.setAlpha(0); this.tweens.add({ targets: this.hint, alpha: 1, duration: 300 });
      if (ms) { var h = this.hint, self = this; this.time.delayedCall(ms, function () { if (self.hint === h) self.hideHint(); }); }
    }
    hintDevice() {
      if (!this.hint) return;
      var first = this.hintKey === 'first';
      this.hint.setText(first ? (this.device === 'touch' ? 'Tap a shape to colour it' : 'Click a shape to colour it') : (this.device === 'touch' ? 'Draw with your finger' : 'Draw with the mouse'));
    }
    placeHint() {
      if (!this.hint || !this.page) return;
      var p = this.page, s = Math.max(Math.min(1.6, p.u) * 0.9, 15 * this.v.pt / 46);   // never under 15 points (the old game's size)
      this.hint.setScale(s).setPosition(p.x + p.s / 2, p.y + p.s - 60 * s);
    }
    hideHint() {
      var h = this.hint, self = this; if (!h) return; this.hint = null;
      this.tweens.add({ targets: h, alpha: 0, duration: 200, onComplete: function () { h.destroy(); self.fxCheck(); } });
    }

    /* ---------------- show the shapes still to colour ---------------- */
    showMissing() {
      var self = this;
      if (this.cur.done) { this.burstAt(this.btn.ring.x, this.btn.ring.y, 0xffe58a, 10, 'fx-star'); return; }
      this.flashImg.setTexture(this.paint.flash()).setVisible(true).setAlpha(0);
      this.tweens.killTweensOf(this.flashImg);
      this.tweens.add({ targets: this.flashImg, alpha: { from: 0, to: 0.7 }, duration: 260, yoyo: true, repeat: 3, onComplete: function () { self.flashImg.setVisible(false); } });
    }
    flashAgain() { this.flashImg.setTexture(this.paint.flash()); }

    /* ---------------- effects (the effects camera: design units) ---------------- */
    burst(wx, wy, tint) { var f = this.toFx(wx, wy); this.burstAt(f.x, f.y, tint, 7, 'fx-dot'); }
    // two emitters, made once and used again (an emitter per burst was made and thrown away each time)
    emitter(big) {
      var k = big ? 'big' : 'dot', e = this.ems[k];
      if (!e) {
        e = this.ems[k] = this.add.particles(0, 0, 'ui', { frame: big ? 'fx-star' : 'fx-dot', speed: { min: big ? 200 : 140, max: big ? 420 : 300 }, lifespan: big ? 800 : 480, gravityY: big ? 300 : 260, scale: { start: big ? 0.5 : 0.28, end: 0 }, emitting: false });
        this.Lf.add(e);
      }
      return e;
    }
    burstAt(x, y, tint, n, key) {
      var big = key === 'fx-star', e = this.emitter(big);
      this.fxSoon(big ? 800 : 480);
      e.setParticleTint(tint); e.explode(n || 7, x, y);
    }
    complete(x, y) {
      var self = this, cur = this.cur, n = cur.n + 1, first = !this.progress.stars(n), p = this.page;
      if (first) { this.progress.finish(n, 1); this.progress.setCurrent(n); }
      if (!bridged[cur.def.id]) { bridged[cur.def.id] = 1; Kit.bridge.complete(); }
      Kit.snd.play('win');
      this.praiseTimer = this.time.delayedCall(450, function () { self.praiseTimer = null; Kit.snd.praise('mashaallah'); });
      this.celebrating = true;
      // the page bounces and a shimmer sweeps over it
      this.tweens.add({ targets: this.pop, k: { from: 1, to: 1.25 }, duration: 220, yoyo: true, ease: 'Sine.easeOut', onUpdate: function () { self.applyView(); }, onComplete: function () { self.pop.k = 1; self.applyView(); } });
      this.sweep.setVisible(true).setPosition(-500, 500).setScale(1000 / 256 * 0.6, 160).setAlpha(0.55);
      this.tweens.add({ targets: this.sweep, x: 1500, duration: 1100, ease: 'Sine.easeInOut', onComplete: function () { self.sweep.setVisible(false); } });
      // words and sparkles over the page
      var cx = p.x + p.s / 2, cy = p.y + p.s / 2;
      var t = tx(this, cx, cy - p.s * 0.06, "Masha'Allah!", Math.round(Math.max(60, p.s * 0.1)), '800', { color: '#fff3c4', stroke: 'rgba(60,20,80,.7)', strokeThickness: 10 }).setOrigin(0.5).setAlpha(0);
      this.Lf.add(t); this.fxSoon(1800);
      this.tweens.chain({ targets: t, tweens: [{ alpha: 1, y: cy - p.s * 0.1, scale: { from: 0.6, to: 1 }, duration: 380, ease: 'Back.easeOut' }, { alpha: 0, y: cy - p.s * 0.16, duration: 700, delay: 900, onComplete: function () { t.destroy(); } }] });
      this.time.addEvent({ delay: 140, repeat: 6, callback: function () {
        self.burstAt(p.x + Math.random() * p.s, p.y + Math.random() * p.s, [0xffe58a, 0xffffff, 0xf6c453, 0xffd1f0][Math.floor(Math.random() * 4)], 6, 'fx-star');
      } });
      if (first) this.time.delayedCall(700, function () { self.flyStar(cx, cy - p.s * 0.06); });
      this.time.delayedCall(1300, function () { if (self.cur.done) { self.nextShow(true); self.bNext.setAlpha(0); self.tweens.add({ targets: self.bNext, alpha: 1, duration: 300 }); self.nextG.setScale(0.7); self.tweens.add({ targets: self.nextG, scale: { from: 0.7, to: 1 }, duration: 420, ease: 'Back.easeOut' }); self.tweens.add({ targets: self.nextG, scale: 1.07, duration: 500, yoyo: true, repeat: 3, delay: 500 }); } self.celebrating = false; });
    }
    // the star of a first finish flies to the progress ring
    flyStar(x, y) {
      var self = this, st = this.add.image(x, y, 'ui', 'ui-star').setScale(0.2), r = this.btn.ring, curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2((x + r.x) / 2, Math.min(y, r.y) - 160), new Phaser.Math.Vector2(r.x, r.y)), pt = new Phaser.Math.Vector2();
      this.Lf.add(st); this.fxSoon(1300);
      this.tweens.add({ targets: st, scale: 1.3, duration: 260, ease: 'Back.easeOut' });
      this.tweens.addCounter({ from: 0, to: 1, duration: 1100, ease: 'Sine.easeInOut', onUpdate: function (tw) {
        curve.getPoint(tw.getValue(), pt); st.setPosition(pt.x, pt.y).setAngle(tw.getValue() * 300); if (tw.getValue() > 0.4) st.setScale(1.3 - (tw.getValue() - 0.4) * 1.1);
      }, onComplete: function () {
        st.destroy(); Kit.snd.play('star'); self.burstAt(r.x, r.y, 0xffe58a, 12, 'fx-star');
        self.ripple(r.x, r.y, r.s * 1.5);
      } });
    }

    /* ---------------- pause screen and the screens over it ---------------- */
    openMenu(screen, extra) {
      if (this.scene.isPaused('Book') || this.scene.isActive('Menu')) return;
      this.stopPraise();
      this.cancelSingle();                 // A stroke interrupted before pointer-up was never saved; remove its preview.
      this.scene.pause('Book');
      // (added the first time it is wanted: a scene that is registered but never started sits at status INIT for ever,
      // which the kit's rest check reads as "still starting", and the loop would never sleep)
      var data = Object.assign({ screen: screen }, extra || {});
      if (!this.scene.manager.keys.Menu) this.scene.add('Menu', window.CBMenu, true, data); else this.scene.launch('Menu', data);
    }
    saveToGallery(silent) {
      var cur = this.cur, G = SV.gallery;
      if (!cur.ops.length) { if (!silent) { Kit.snd.play('tap', { vol: 0.5, rate: 0.8 }); } return false; }
      var item = null;
      for (var i = 0; i < G.length; i++) if (G[i].id === cur.gid) { item = G.splice(i, 1)[0]; break; }
      if (!item) { item = { id: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), page: cur.def.id }; cur.gid = item.id; }
      item.ops = MD.compact(cur.ops); item.t = Date.now();
      G.unshift(item);
      if (G.length > SV.MAX) G.length = SV.MAX;
      SV.storeGallery();
      cur.dirty = false; SV.persist(cur.def, cur);
      if (!silent) Kit.snd.play('save');
      return true;
    }

    /* ---------------- test hook (?debug) ---------------- */
    debugHook() {
      var self = this, wk = function (f) { return function () { Kit.play.wake(); return f.apply(this, arguments); }; };   // (a test call is not a touch: it wakes the loop itself)
      window.CB = {
        scene: this, pages: PAGES,
        state: function () { var c = self.cur; return { page: c.n, id: c.def.id, regions: self.paint.fill.length, done: self.paint.countDone(), complete: c.done, ops: c.ops.length, tool: self.tool, colour: self.colour, size: self.size, mode: self.mode, pageRect: self.page, view: self.V, gallery: SV.gallery.length, stars: self.progress.total() }; },
        open: wk(function (n) { self.openPage(n); }),
        // a screen point (canvas pixels) in the middle of the biggest visible part of region r
        point: function (r) {
          var m = MD.model(self.cur.def), b = m.regions[r].bbox, P = self.paint, o = P.cv(r), best = null, bd = -1;
          for (var y = 0; y < o.H; y++) for (var x = 0; x < o.W; x++) {
            if (!o.vis[y * o.W + x]) continue;
            var s = 0; for (var q = 1; q < 12; q++) { var ok = o.vis[Math.min(o.H - 1, y + q) * o.W + x] && o.vis[Math.max(0, y - q) * o.W + x] && o.vis[y * o.W + Math.min(o.W - 1, x + q)] && o.vis[y * o.W + Math.max(0, x - q)]; if (!ok) break; s = q; }
            if (s > bd) { bd = s; best = [o.x0 + (x + 0.5) * 4, o.y0 + (y + 0.5) * 4]; }
          }
          if (!best) return null;
          var c = self.pcam, sx = c.x + c.width / 2 + (best[0] - c.midPoint.x) * c.zoom, sy = c.y + c.height / 2 + (best[1] - c.midPoint.y) * c.zoom, v = self.v;
          return { x: sx, y: sy, cssx: sx / Kit.play.dpr(), cssy: sy / Kit.play.dpr(), px: best[0], py: best[1], depth: bd * 4 };
        },
        at: function (x, y) { var q = self.toScreen(x, y), d = Kit.play.dpr(); return { x: q.x / d, y: q.y / d }; },
        fill: wk(function (r, ci) { if (ci != null) self.colour = ci; var b = MD.model(self.cur.def).regions[r].bbox; self.fillAt(r, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, COLOURS[self.colour]); }),
        undo: wk(function () { self.undo(); }), redo: wk(function () { self.redo(); }), setTool: wk(function (t) { self.setTool(t); }), save: wk(function () { return self.saveToGallery(); }),
        works: function () { return SV.works; }, galleryItems: function () { return SV.gallery; }, flush: SV.flush,
        buttons: function () { var o = {}, v = self.v, d = Kit.play.dpr(), cv = function (x, y, vis) { return { x: (x - v.l) * v.z / d, y: (y - v.t) * v.z / d, vis: vis !== false }; };
          var map = { bPause: 'pause', bRing: 'ring', bFill: 'fill', bBrush: 'brush', bEraser: 'eraser', bSize: 'size', bUndo: 'undo', bRedo: 'redo' };
          Object.keys(map).forEach(function (k) { var b = self.btn[map[k]]; o[k] = cv(b.x, b.y); });
          o.bZoom = cv(self.bZoom.x, self.bZoom.y, self.bZoom.visible); o.bNext = cv(self.bNext.x, self.bNext.y, self.bNext.visible);
          var g = self.palGrid; o.pots = COLOURS.map(function (c, i) { return cv(g.x + (i % g.cols + 0.5) * g.cell, g.y + (Math.floor(i / g.cols) + 0.5) * g.cell); }); return o; }
      };
    }
  }

  window.CBBook = Book;
  window.CBText = tx;
})();
