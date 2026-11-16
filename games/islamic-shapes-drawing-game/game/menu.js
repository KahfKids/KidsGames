/* Colouring Book: the screens over the paused page (scene 'Menu', launched by the Book scene, which is paused under it).
   A stack of screens (game-ui-ux): the pause screen (resume first and highlighted, pages, saved pictures, save, start
   again, sound; the way out, the kit's exit icon, where the pause button was; a line that repeats the controls of the
   device in use), then the page picker and the saved pictures (a back arrow pops to the pause screen; a second camera,
   the engine's, scrolls and clips the lists: drag or wheel), and the two questions (start again? remove this picture?).
   Only the top screen takes input. The screens are rebuilt when the window changes size (they are cheap, and the
   scroll position is kept). Small pictures of each page come from game/thumb.js, a few per frame. Words are the old
   book's: Pages, Saved, Start again?, Keep it, Clear, Remove this picture?. */
(function () {
  'use strict';
  var MD = window.CBModel, SV = window.CBSave, A = window.CBArt, TH = window.CBThumb, tx = window.CBText;
  var PAGES = MD.PAGES, BOOKS = MD.BOOKS, FONT = 'system-ui, sans-serif', G0 = 30, E0 = 40;

  class Menu extends Phaser.Scene {
    constructor() { super({ key: 'Menu' }); }

    create(data) {
      var self = this;
      this.closed = false;                     // Phaser reuses this scene when the pause screen opens again.
      this.book = this.scene.get('Book');
      this.touch = this.book.touch; this.device = this.book.device;
      this.stack = [{ name: data.screen || 'pause', args: data }]; this.items = []; this.job = null; this.scroll = 0; this.scrollMax = 0; this.view = null;
      this.Lm = this.add.layer(); this.Ls = this.add.layer();
      this.scam = this.cameras.add(0, 0, 10, 10); this.scam.ignore(this.Lm); this.cameras.main.ignore(this.Ls);
      var K = this.input.keyboard.addKeys('ESC,M');
      K.ESC.on('down', function () { self.pop(); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); self.build(); });
      this.input.keyboard.on('keydown', function () { if (self.device !== 'keys') { self.device = 'keys'; self.build(); } });
      this.input.on('pointerdown', function (p) { if (p.wasTouch && self.device !== 'touch') { self.device = 'touch'; self.build(); } self.drag = self.inList(p) ? { y: p.y, s: self.scroll, moved: 0 } : null; });
      this.input.on('pointermove', function (p) {
        var d = self.drag; if (!d || !p.isDown) return;
        d.moved = Math.max(d.moved, Math.abs(p.y - d.y));
        self.scroll = Phaser.Math.Clamp(d.s - (p.y - d.y) / self.scam.zoom, 0, self.scrollMax); self.scrollApply();
      });
      this.input.on('pointerup', function () { var d = self.drag; self.drag = null; if (d && d.moved > 12) self.justDragged = self.time.now; });
      this.input.on('wheel', function (p, o, dx, dy) { if (self.inList(p)) { self.scroll = Phaser.Math.Clamp(self.scroll + dy / self.scam.zoom, 0, self.scrollMax); self.scrollApply(); } });
      this.events.once('shutdown', function () { if (self.job) self.job.free(); self.book.menuRef = null; });
      this.book.menuRef = this;
      Kit.play.fit(this, function (v) { self.view = v; self.build(); });
    }
    relayout() {}

    /* ---------------- the stack ---------------- */
    push(name, args) { Kit.snd.play('page'); this.stack.push({ name: name, args: args || {} }); this.scroll = 0; this.build(); }
    pop() {
      if (this.stack.length > 1) { Kit.snd.play('tap', { vol: 0.7 }); this.stack.pop(); this.scroll = 0; this.build(); } else this.close();
    }
    close() {
      if (this.closed) return; this.closed = true;
      this.scene.resume('Book'); this.scene.stop('Menu');
    }
    // leave all the screens and carry on with the page
    closeAll(fn) { if (fn) fn(); this.close(); }

    /* ---------------- building a screen ---------------- */
    clear() {
      if (this.job) { this.job.free(); this.job = null; }
      this.items.forEach(function (o) { o.destroy(); }); this.items = [];
    }
    put(o, scroll) { (scroll ? this.Ls : this.Lm).add(o); this.items.push(o); return o; }
    unit() { var v = this.view, U = window.CBArt.ui(v); return { U: U, B: 150 * U, GAP: G0 * U, EDGE: E0 * U }; }
    build() {
      var v = this.view; if (!v) return; this.clear();
      var self = this, u = this.unit(), top = this.stack[this.stack.length - 1];
      this.scam.setVisible(false);
      this.dim = this.put(this.add.image(0, 0, 'ui', 'ui-px').setTint(0x07041a).setAlpha(0.94).setOrigin(0).setPosition(v.l - 100, v.t - 100).setDisplaySize(v.w + 200, v.h + 200).setInteractive());
      // the corner button: the way out on the pause screen, a step back on the others
      var corner = top.name === 'pause' ? this.round('ic-exit', function () { Kit.play.exit(); }) : this.round('ic-back', function () { self.pop(); });
      corner.setPosition(v.sl + u.EDGE + u.B / 2, v.st + u.EDGE + u.B / 2);
      this['s_' + top.name](u, top.args);
      // fade in
      var fade = this.items.filter(function (o) { return o !== self.dim && typeof o.alpha === 'number' && o.setAlpha; }), al = fade.map(function (o) { return o.alpha; });
      fade.forEach(function (o) { o.setAlpha(0); });
      fade.forEach(function (o, i) { self.tweens.add({ targets: o, alpha: al[i], duration: 140 }); });
      this.dim.setAlpha(0.94);
      if (Kit.play.debug) window.CBM = { items: function () {
        var c = self.cameras.main, d = Kit.play.dpr(), o = [];
        self.items.forEach(function (it) { if (it.input && it.input.enabled && it !== self.dim) { var m = it.getWorldTransformMatrix(), cam = self.Ls.exists(it) ? self.scam : c; o.push({ x: (m.tx - cam.worldView.x) * cam.zoom / d + (cam === self.scam ? cam.x / d : 0), y: (m.ty - cam.worldView.y) * cam.zoom / d + (cam === self.scam ? cam.y / d : 0), t: it.type + (it.list && it.list[1] && it.list[1].texture ? ':' + it.list[1].texture.key : '') }); } });
        return o; }, stack: function () { return self.stack.map(function (s) { return s.name; }); }, scrollMax: function () { return self.scrollMax; } };
    }
    // a round button (150 design units across, scaled by the interface scale)
    round(icon, fn, o) {
      var self = this, u = this.unit(), s = ((o && o.size) || u.B) / 150;
      var g = this.add.container(0, 0, [this.add.image(0, 0, 'ui', (o && o.plate) || 'ui-plate'), this.add.image(0, 0, 'ui', icon).setScale(0.9).setTint((o && o.tint) || 0xffffff)]);
      var c = this.add.container(0, 0, [g]).setSize(150, 150).setInteractive({ useHandCursor: true }).setScale(s);
      c.g = g; c.icon = g.list[1];
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.killTweensOf(g); g.setScale(0.88); self.tweens.add({ targets: g, scale: 1, duration: 160, ease: 'Back.easeOut' }); });
      c.on('pointerup', function () { if (fn && !self.busy) fn(); });
      return this.put(c, o && o.scroll);
    }
    label(s, x, y, size, color, w, o) { return this.put(tx(this, x, y, s, size, w || '700', Object.assign({ color: color || '#f2f0fa' }, o || {})).setOrigin(0.5)); }

    /* ---- the pause screen ---- */
    s_pause(u) {
      var self = this, v = this.view, bk = this.book, cur = bk.cur, b = cur.book, U = u.U;
      var availW = v.sr - v.sl - 2 * u.EDGE, W = 230 * U, gap = 60 * U, per = Math.max(1, Math.min(6, Math.floor((availW + gap) / (W + gap))));
      var acts = [
        { icon: 'ic-play', label: 'Resume', main: true, fn: function () { self.close(); } },
        { icon: 'ic-book', label: 'Pages', fn: function () { self.push('pages'); } },
        { icon: 'ic-pics', label: 'Saved', fn: function () { self.push('saved'); } },
        { icon: 'ic-save', label: 'Save', fn: function () { self.saveNow(); } },
        { icon: 'ic-retry', label: 'Start again', fn: function () { self.push('clear'); } },
        { icon: Kit.snd.muted ? 'ic-mute' : 'ic-snd', label: Kit.snd.muted ? 'Sound off' : 'Sound on', fn: function () { Kit.snd.setMuted(!Kit.snd.muted); self.build(); }, snd: true }
      ];
      var rows = Math.ceil(acts.length / per), lab = 56 * U, rowH = W + lab + 50 * U, gridH = rows * rowH - 50 * U;
      var cx = (v.sl + v.sr) / 2, titleH = 190 * U, howH = 130 * U, top = (v.t + v.b) / 2 - (titleH + gridH + howH) / 2 + 40 * U;
      this.label(cur.def.name, cx, top + 50 * U, 84 * U, '#f2f0fa', '800');
      this.label(b.name, cx, top + 140 * U, 42 * U, b.glow, '700');
      acts.forEach(function (a, i) {
        var r = Math.floor(i / per), inRow = Math.min(per, acts.length - r * per), c = i - r * per;
        var x = cx + (c - (inRow - 1) / 2) * (W + gap), y = top + titleH + r * rowH + W / 2;
        var btn = self.round(a.icon, a.fn, { size: W, plate: a.main ? 'ui-big' : 'ui-plate', tint: a.main ? 0x2a1606 : 0xffffff });
        btn.setPosition(x, y); btn.icon.setScale(1.0); if (a.main) btn.g.list[0].setDisplaySize(148, 148);
        var l = self.label(a.label, x, y + W / 2 + 40 * U, 46 * U, '#f2f0fa', '700');
        if (a.main) self.tweens.add({ targets: btn.g, scale: 1.05, duration: 700, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      });
      var how = this.device === 'touch' ? 'Tap a shape to fill it  ·  switch to the brush to draw  ·  two fingers zoom' : 'Click to fill or draw  ·  F fill  ·  B brush  ·  E eraser  ·  Z undo  ·  Esc pause  ·  M sound';
      this.label(how, cx, top + titleH + gridH + 80 * U, 36 * U, '#f2f0fa', '600', { wordWrap: { width: availW }, align: 'center' }).setAlpha(0.85);
    }
    saveNow() {
      var bk = this.book, ok = bk.saveToGallery(), v = this.view, U = window.CBArt.ui(v), cx = (v.sl + v.sr) / 2, self = this;
      var t = this.label(ok ? 'Saved!' : 'Colour something first', cx, (v.t + v.b) / 2 - 330 * U, 70 * U, '#ffffff', '800', { stroke: 'rgba(60,20,80,.7)', strokeThickness: 8 });
      this.tweens.add({ targets: t, y: t.y - 60 * U, alpha: 0, duration: 1300, delay: 300, onComplete: function () { t.destroy(); } });
      if (ok) { var s = this.put(this.add.image(cx, t.y + 130 * U, 'ui', 'ui-star').setScale(0.4 * U)); this.tweens.add({ targets: s, scale: 1.2 * U, alpha: 0, angle: 120, duration: 900, ease: 'Sine.easeOut', onComplete: function () { s.destroy(); } }); }
    }

    /* ---- a question with two answers ---- */
    dialog(u, title, def, ops, no, yes, onYes) {
      var self = this, v = this.view, U = u.U, cx = (v.sl + v.sr) / 2, cy = (v.t + v.b) / 2, availW = v.sr - v.sl - 2 * u.EDGE;
      var cw = Math.min(availW, 1100 * U);
      var s = cw / 1100, card = this.put(this.add.image(cx, cy, 'ui-card').setScale(s * 1100 / 1500, s * 940 / 1040));
      this.label(title, cx, cy - 350 * s, 78 * U, '#f2f0fa', '800');
      var th = this.put(this.add.image(cx, cy - 40 * s, 'ui', 'ui-thumb')).setDisplaySize(380 * s, 380 * s);
      var pic = this.put(this.add.image(cx, cy - 40 * s, 'ui', 'ui-thumb')).setDisplaySize(380 * s, 380 * s);
      this.job = TH.run(this, [{ img: pic, def: def, ops: ops, px: 330, size: 380 * s }]);
      var pill = function (label, x, primary, fn) {
        var c = self.add.container(x, cy + 340 * s, [self.add.image(0, 0, 'ui', primary ? 'ui-pill-gold' : 'ui-pill'), self.add.text(0, 0, label, { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: primary ? '#2a1606' : '#f2f0fa' }).setOrigin(0.5)]).setSize(340, 150).setInteractive({ useHandCursor: true }).setScale(Math.min(1.1 * U, s * 1.25));
        c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scaleX: c.scaleX * 0.92, scaleY: c.scaleY * 0.92, duration: 70, yoyo: true }); });
        c.on('pointerup', fn); return self.put(c);
      };
      var pw = 340 * Math.min(1.1 * U, s * 1.25);
      pill(no, cx - pw / 2 - u.GAP, false, function () { self.pop(); });
      pill(yes, cx + pw / 2 + u.GAP, true, function () { onYes(); });
    }
    s_clear(u) {
      var self = this, cur = this.book.cur;
      if (!cur.ops.length) { this.stack.pop(); this.close(); return; }
      this.dialog(u, 'Start again?', cur.def, cur.ops.slice(), 'Keep it', 'Clear', function () { self.book.clearPage(); self.close(); });
    }
    s_remove(u, a) {
      var self = this, it = a.item, def = PAGES.filter(function (p) { return p.id === it.page; })[0];
      this.dialog(u, 'Remove this picture?', def, it.ops, 'Keep', 'Remove', function () {
        Kit.snd.play('clear');
        SV.gallery = SV.gallery.filter(function (g) { return g.id !== it.id; });
        SV.storeGallery(); var cur = self.book.cur;
        if (cur.gid === it.id) cur.gid = null;
        Object.keys(SV.works).forEach(function (k) { if (SV.works[k].gid === it.id) SV.works[k].gid = null; });
        SV.persist(cur.def, cur);
        self.stack.pop(); self.scroll = 0; self.build();
      });
    }

    /* ---- the page picker and the saved pictures: a scrolling grid ---- */
    tabs(u, which) {
      var self = this, v = this.view, U = u.U, s = U * 0.95 * 1, y = v.st + u.EDGE + u.B / 2, x = v.sl + u.EDGE + u.B + u.GAP;
      ['pages', 'saved'].forEach(function (k, i) {
        var on = k === which, w = 340 * s;
        var c = self.add.container(x + w / 2 + i * (w + u.GAP * 0.6), y, [self.add.image(0, 0, 'ui', on ? 'ui-pill-gold' : 'ui-pill'), self.add.image(-100, 0, 'ui', k === 'pages' ? 'ic-book' : 'ic-pics').setScale(0.75).setTint(on ? 0x2a1606 : 0xffffff), self.add.text(34, 0, k === 'pages' ? 'Pages' : 'Saved', { fontFamily: FONT, fontSize: '54px', fontStyle: '800', color: on ? '#2a1606' : '#f2f0fa' }).setOrigin(0.5)]).setSize(340, 150).setInteractive({ useHandCursor: true }).setScale(s);
        c.on('pointerdown', function () { Kit.snd.play('tap'); });
        c.on('pointerup', function () { if (!on) { self.stack[self.stack.length - 1] = { name: k, args: {} }; self.scroll = 0; self.build(); } });
        self.put(c);
      });
      return y + u.B / 2 + u.GAP;
    }
    // the scrolling area: below the tabs, inside the safe area
    list(u, top) {
      var v = this.view, x0 = v.sl + u.EDGE, x1 = v.sr - u.EDGE, y1 = v.sb - u.EDGE * 0.5, z = v.z;
      this.vp = { x: x0, y: top, w: x1 - x0, h: y1 - top };
      this.scam.setVisible(true).setViewport(Math.round((x0 - v.l) * z), Math.round((top - v.t) * z), Math.round((x1 - x0) * z), Math.round((y1 - top) * z)).setZoom(z);
      return this.vp;
    }
    inList(p) { var c = this.scam; return c.visible && p.x >= c.x && p.y >= c.y && p.x <= c.x + c.width && p.y <= c.y + c.height; }
    scrollApply() { var vp = this.vp; if (vp) this.scam.centerOn(vp.x + vp.w / 2, vp.y + vp.h / 2 + this.scroll); }
    grid(u, vp) { var U = u.U, size = 200 * Math.max(1, U), gap = 36 * U, cols = Math.max(2, Math.floor((vp.w + gap) / (size + gap))); size = (vp.w - (cols - 1) * gap) / cols; return { size: Math.min(size, 330 * U), gap: gap, cols: cols }; }
    s_pages(u) {
      var self = this, bk = this.book, cur = bk.cur, vp = this.list(u, this.tabs(u, 'pages')), g = this.grid(u, vp), jobs = [], U = u.U;
      var y = vp.y + 10 * U, x0 = vp.x + (vp.w - (g.cols * g.size + (g.cols - 1) * g.gap)) / 2;
      BOOKS.forEach(function (bk2) {
        var list = PAGES.map(function (p, i) { return { p: p, i: i }; }).filter(function (o) { return o.p.book === bk2.id; });
        var got = list.filter(function (o) { return bk.progress.stars(o.i + 1) > 0; }).length;
        self.put(tx(self, vp.x + 10 * U, y + 34 * U, bk2.name.toUpperCase(), 44 * U, '800', { color: bk2.glow }).setOrigin(0, 0.5), true);
        var cnt = self.put(tx(self, vp.x + vp.w - 56 * U, y + 34 * U, got + ' / ' + list.length, 40 * U, '700', { color: '#cfc8e6' }).setOrigin(1, 0.5), true);
        self.put(self.add.image(vp.x + vp.w - 28 * U, y + 34 * U, 'ui', 'ui-star').setScale(0.42 * U), true);
        y += 90 * U;
        list.forEach(function (o, n) {
          var col = n % g.cols, row = Math.floor(n / g.cols), cx = x0 + col * (g.size + g.gap) + g.size / 2, cy = y + row * (g.size + g.gap) + g.size / 2;
          var isCur = o.i === cur.n;
          var base = self.put(self.add.image(cx, cy, 'ui', 'ui-thumb').setDisplaySize(g.size, g.size), true);
          var pic = self.put(self.add.image(cx, cy, 'ui', 'ui-thumb').setDisplaySize(g.size, g.size), true);
          var edge = self.put(self.add.image(cx, cy, 'ui', 'ui-thumb-edge').setDisplaySize(g.size, g.size).setTint(isCur ? parseInt(bk2.glow.slice(1), 16) : 0xffffff).setAlpha(isCur ? 1 : 0.18), true);
          if (bk.progress.stars(o.i + 1)) self.put(self.add.image(cx + g.size / 2 - 6 * U, cy - g.size / 2 + 6 * U, 'ui', 'ui-star').setScale(g.size / 220 * 0.5), true);
          var w = o.i === cur.n ? { ops: cur.ops } : (SV.works[o.p.id] || {});
          jobs.push({ img: pic, def: o.p, ops: w.ops || [], px: Math.round(120 * Math.min(2, Kit.play.dpr())), size: g.size });
          var hit = self.put(self.add.zone(cx, cy, g.size, g.size).setInteractive({ useHandCursor: true }), true);
          hit.on('pointerdown', function () { Kit.snd.play('tap', { vol: 0.8 }); self.tweens.add({ targets: [base, pic, edge], scale: base.scale * 0.94, duration: 70, yoyo: true }); });
          hit.on('pointerup', function () {
            if (self.justDragged && self.time.now - self.justDragged < 300) return;
            Kit.snd.play('page');
            self.closeAll(function () { if (o.i !== cur.n) bk.openPage(o.i); });
          });
        });
        y += Math.ceil(list.length / g.cols) * (g.size + g.gap) + 20 * U;
      });
      this.scrollMax = Math.max(0, y - vp.y - vp.h / 1 + 10 * U); this.scrollApply();
      this.job = TH.run(this, jobs);
    }
    s_saved(u) {
      var self = this, bk = this.book, cur = bk.cur, vp = this.list(u, this.tabs(u, 'saved')), g = this.grid(u, vp), jobs = [], U = u.U, items = SV.gallery;
      var shown = items.filter(function (it) { return PAGES.some(function (p) { return p.id === it.page; }); });
      if (!shown.length) {
        var cx = vp.x + vp.w / 2;
        this.put(this.add.image(cx, vp.y + 260 * U, 'ui', 'ic-pics').setScale(2.4 * U).setTint(0xf6c453).setAlpha(0.9), true);
        this.put(tx(this, cx, vp.y + 460 * U, 'Tap Save to keep your colouring here.', 48 * U, '600', { color: '#cfc8e6', align: 'center', wordWrap: { width: vp.w - 80 * U } }).setOrigin(0.5), true);
        this.scrollMax = 0; this.scrollApply(); return;
      }
      var y = vp.y + 20 * U, x0 = vp.x + (vp.w - (g.cols * g.size + (g.cols - 1) * g.gap)) / 2;
      shown.forEach(function (it, n) {
        var idx = -1, def = null; for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === it.page) { def = PAGES[i]; idx = i; }
        var col = n % g.cols, row = Math.floor(n / g.cols), cx = x0 + col * (g.size + g.gap) + g.size / 2, cy = y + row * (g.size + g.gap) + g.size / 2;
        var base = self.put(self.add.image(cx, cy, 'ui', 'ui-thumb').setDisplaySize(g.size, g.size), true);
        var pic = self.put(self.add.image(cx, cy, 'ui', 'ui-thumb').setDisplaySize(g.size, g.size), true);
        self.put(self.add.image(cx, cy, 'ui', 'ui-thumb-edge').setDisplaySize(g.size, g.size).setAlpha(0.18), true);
        jobs.push({ img: pic, def: def, ops: it.ops, px: Math.round(120 * Math.min(2, Kit.play.dpr())), size: g.size });
        var hit = self.put(self.add.zone(cx, cy, g.size, g.size).setInteractive({ useHandCursor: true }), true);
        hit.on('pointerup', function () {
          if (self.justDragged && self.time.now - self.justDragged < 300) return;
          Kit.snd.play('page');
          self.closeAll(function () {
            // keep unsaved work on that page before opening the saved copy
            var w = idx === cur.n ? { ops: cur.ops, dirty: cur.dirty, gid: cur.gid } : SV.works[def.id];
            if (w && w.dirty && w.ops && w.ops.length && w.gid !== it.id) { if (idx !== cur.n) bk.openPage(idx); bk.saveToGallery(true); }
            bk.openPage(idx, it.ops, it.id);
          });
        });
        var del = self.round('ic-close', function () { if (!(self.justDragged && self.time.now - self.justDragged < 300)) self.push('remove', { item: it }); }, { size: Math.max(90, g.size * 0.3), scroll: true });
        del.setPosition(cx + g.size / 2 - 6 * U, cy - g.size / 2 + 6 * U);
      });
      this.scrollMax = Math.max(0, y + Math.ceil(shown.length / g.cols) * (g.size + g.gap) - vp.y - vp.h + 40 * U); this.scrollApply();
      this.job = TH.run(this, jobs);
    }
  }
  window.CBMenu = Menu;
})();
