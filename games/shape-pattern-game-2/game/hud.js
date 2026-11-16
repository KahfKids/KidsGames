/* Shape Patterns: the interface (scene 'Hud', above 'Play', in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill and the owner's HUD rules (docs/phaser-standard.md section 4a). While playing the
   screen is the game: one pause button in the top-left corner of the safe area, and beside it the progress the child
   needs (the world, the level, and a dot for each train of the level). Everything else is a stack of screens pushed over
   the paused game: the pause screen (resume, restart, levels, sound, the way out drawn with the exit icon, and a line
   repeating the controls for the device last used), the level map, and the end-of-level sheet. Only the top screen takes
   input; Play is paused under them (scene.pause) and its timers and tweens wait.
   Controls on this game are direct touch on the world (drag a piece or tap it), so there are no on-screen buttons to
   hide; the keyboard (arrows, Space or Enter, Esc, R, M) works through the same events. Prompts follow the device last
   used. Buttons and text are sized in screen points (a 150-unit button is 48 points on every screen). All
   Phaser: images painted once (art.js), Text, nine-slices, tweens for every fade and pop. */
(function () {
  'use strict';
  var A = window.PatArt, FONT = 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif', GAP = 36, INK = '#f4ecff';
  var hexn = function (s) { return parseInt(s.slice(1), 16); };

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this;
      this.sv = window.PatSave; this.stack = []; this.device = 'pointer'; this.dots = [];
      this.registry.set('blocked', 0); this.registry.set('device', 'pointer');
      A.ui(this);
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.pill = this.add.nineslice(0, 0, 'ui', 'ui-pill', 300, 150, 85, 85, 0, 0);
      this.pStar = this.add.image(0, 0, 'ui', 'ui-star'); this.pText = this.txt(0, 0, '', 46, '800', INK).setOrigin(0, 0.5);
      this.n = { level: 1, world: 0, rounds: 0, ri: 0, done: false };

      var inp = this.input;
      inp.on('pointerdown', function (p) { self.setDevice('pointer'); });
      var K = this.keys = inp.keyboard.addKeys('ESC,R,M');
      inp.keyboard.on('keydown', function () { self.setDevice('keys'); });
      K.ESC.on('down', function () { var t = self.top(); if (!t) self.openPause(); else if (t.esc) t.esc(); });
      K.R.on('down', function () { if (!self.stack.length) self.restart(); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); var t = self.top(); if (t && t.name === 'pause') self.redraw(); });
      var ev = this.game.events, on = function (n, f) { ev.on(n, f, self); self.events.once('shutdown', function () { ev.off(n, f, self); }); };
      on('sp-level', function (d) { self.n = { level: d.level, world: d.world, rounds: d.rounds, ri: 0, done: false }; self.closeAll(true); self.pillMake(); });
      on('sp-round', function (d) { self.n.ri = d.ri; self.n.done = d.done; self.dotsPaint(); });
      on('sp-won', function (d) { self.openWon(d); });
      // the page hidden: the pause screen is there when the child is back
      var vis = function () { if (document.hidden && !self.stack.length && self.play().phase !== 'done' && !self.hiddenOff) self.openPause(); };
      document.addEventListener('visibilitychange', vis);
      this.events.once('shutdown', function () { document.removeEventListener('visibilitychange', vis); });
      Kit.play.fit(this, function (v) { self.layout(v); });
    }
    play() { return this.scene.get('Play'); }
    top() { return this.stack[this.stack.length - 1]; }
    txt(x, y, s, size, w, color) { return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', fontStyle: w, color: color || INK, align: 'center' }).setOrigin(0.5).setResolution(1.5); }

    setDevice(d) {
      if (d === this.device) return;
      this.device = d; this.registry.set('device', d); this.game.events.emit('sp-device', d);
      var t = this.top(); if (t && t.name === 'pause') this.redraw();
    }

    // a round button: a dark plate (readable on any backdrop) and its icon; it answers the touch at once
    button(icon, fn, plate, noSound) {
      var self = this, c = this.add.container(0, 0, [this.add.image(0, 0, 'ui', plate || 'ui-plate'), this.add.image(0, 0, 'ui', icon)]);
      c.icon = c.list[1]; c.setSize(150, 150).setInteractive();
      c.on('pointerdown', function () { if (!noSound) Kit.snd.play('tap'); self.tweens.add({ targets: c, scaleX: c.base * 0.9, scaleY: c.base * 0.9, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); c.base = 1; return c;
    }
    setBase(c, s) { c.base = s; c.setScale(s); }

    // ---------- the playing HUD ----------
    layout(v) {
      this.v = v; this.u = 48 * v.pt / 150;                                // Shape Patterns' own size: a 150-unit button is 48 screen points
      this.setBase(this.bPause, this.u);
      this.bPause.setPosition(v.sl + 30 + 75 * this.u, v.st + 30 + 75 * this.u);
      this.pillMake();
      this.redraw();
    }
    pillMake() {
      var v = this.v, u = this.u, n = this.n; if (!v) return;
      this.dots.forEach(function (d) { d.destroy(); }); this.dots = [];
      var W = A.WORLDS[n.world], h = 120 * u, y = this.bPause.y;
      this.pStar.setTint(hexn(W.color)).setScale(54 * u / 64);
      this.pText.setText('Level ' + n.level).setFontSize(46 * u + 'px');
      var dotW = 34 * u, w = 36 * u + 54 * u + 14 * u + this.pText.width + 26 * u + n.rounds * dotW + 22 * u, x0 = this.bPause.x + 75 * u + GAP;
      // (drawn at its full size and scaled as one: a nine-slice made smaller than its round ends turns into a blob)
      this.pill.setScale(1).setSize(w / u, h / u).setScale(u).setPosition(x0 + w / 2, y);
      var x = x0 + 36 * u;
      this.pStar.setPosition(x + 27 * u, y); x += 54 * u + 14 * u;
      this.pText.setPosition(x, y); x += this.pText.width + 26 * u;
      for (var i = 0; i < n.rounds; i++) { this.dots.push(this.add.image(x + dotW / 2 + i * dotW, y, 'ui', 'ui-dot')); }
      this.dotsPaint();
    }
    dotsPaint() {
      var n = this.n, u = this.u || 1;
      this.dots.forEach(function (d, i) {
        var done = i < n.ri || (i === n.ri && n.done), cur = i === n.ri && !n.done;
        d.setTint(done ? 0xf6c453 : 0xfffaf0).setAlpha(done || cur ? 1 : 0.4).setScale((done ? 24 : cur ? 22 : 17) * u / 64);
      });
    }

    // ---------- the stack of screens ----------
    push(s) { var t = this.top(); if (t) t.items.forEach(function (o) { o.setVisible(false); }); s.items = []; this.stack.push(s); s.draw(); this.blockSync(); }
    pop() {
      var s = this.stack.pop(); if (!s) return;
      s.items.forEach(function (o) { o.destroy(); }); s.items = [];
      var t = this.top(); if (t) { t.items.forEach(function (o) { o.setVisible(true); }); }
      this.blockSync();
    }
    closeAll(quiet) { while (this.stack.length) { var s = this.stack.pop(); s.items.forEach(function (o) { o.destroy(); }); } this.blockSync(); }
    redraw() {
      var t = this.top(); if (!t) return;
      t.items.forEach(function (o) { o.destroy(); }); t.items = []; t.draw();
    }
    blockSync() {
      var b = this.stack.length, was = this.registry.get('blocked') > 0;
      this.registry.set('blocked', b);
      var p = this.play(); if (!p) return;
      if (p.prompt) p.prompt.setVisible(!b);
      if (b && !was) { if (p.sys.settings.status >= Phaser.Scenes.RUNNING) this.scene.pause('Play'); }
      else if (!b && was) this.scene.resume('Play');
    }
    put(s, o) { s.items.push(o); return o; }
    dim(s, a) {
      var v = this.v, r = this.add.rectangle(960, 540, v.w + 8, v.h + 8, 0x040a1c, a).setInteractive(); r.setPosition(v.l + v.w / 2, v.t + v.h / 2); return this.put(s, r);
    }
    // a round button on a screen
    sbtn(s, icon, x, y, scale, fn, plate) { var b = this.put(s, this.button(icon, fn, plate)); this.setBase(b, scale); b.setPosition(x, y); return b; }
    // a big labelled choice: a plate with its icon and its word under it
    choice(s, icon, label, fn, main, size, x, y, fs) {
      var self = this, k = size / 230, c = this.put(s, this.add.container(x, y, [this.add.image(0, 0, 'ui', main ? 'ui-big' : 'ui-plate').setScale(main ? 1 : 1.53), this.add.image(main ? 8 : 0, 0, 'ui', icon).setScale(1.5).setTint(main ? 0x24195a : 0xffffff)]).setSize(230, 230).setInteractive());
      c.setScale(k); c.base = k;
      var l = this.put(s, this.txt(x, y + size / 2 + fs * 0.9, label, fs, '800', INK));
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: k * 0.92, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); c.label = l; return c;
    }

    // ---------- pause ----------
    openPause() {
      if (this.stack.length) return;
      var self = this;
      this.push({ name: 'pause', esc: function () { self.pop(); }, draw: function () { self.drawPause(this); } });
    }
    drawPause(s) {
      var self = this, v = this.v, u = this.u, W = A.WORLDS[this.n.world], p = this.put.bind(this, s), cu = Math.min(u, 1.7), cy = 540;
      this.dim(s, 0.88);
      this.sbtn(s, 'ic-exit', v.sl + 30 + 75 * u, v.st + 30 + 75 * u, u, function () { Kit.play.exit(); });
      p(this.txt(960, cy - 330 * cu, 'Paused', 84 * cu, '900', INK));
      p(this.txt(960, cy - 235 * cu, W.name + '  ·  Level ' + this.n.level, 44 * cu, '800', W.color));
      var size = 230 * Math.min(cu, 1.35), gap = 70 * cu, fs = 42 * cu, perRow = (4 * (size + gap) - gap <= v.w * 0.94) ? 4 : 2;
      var muted = Kit.snd.muted;
      var items = [
        ['ic-play', 'Resume', function () { self.pop(); }, true],
        ['ic-retry', 'Restart', function () { self.restart(); }, false],
        ['ic-grid', 'Levels', function () { self.openLevels(); }, false],
        [muted ? 'ic-mute' : 'ic-snd', muted ? 'Sound off' : 'Sound on', function () { Kit.snd.setMuted(!Kit.snd.muted); self.redraw(); }, false]];
      var rows = Math.ceil(4 / perRow), rowH = size + fs * 2.6 + gap * 0.5, y0 = cy + 20 * cu - ((rows - 1) * rowH) / 2 + (rows > 1 ? 40 : 0);
      items.forEach(function (it, i) {
        var r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, 4 - r * perRow);
        self.choice(s, it[0], it[1], it[2], it[3], size, 960 + (c - (inRow - 1) / 2) * (size + gap), y0 + r * rowH, fs);
      });
      var how = this.device === 'keys' ? 'Arrow keys choose  ·  Space puts it in  ·  R restarts  ·  Esc pauses  ·  M sound' : 'Drag a piece into the empty wagon, or tap it';
      p(this.txt(960, Math.min(v.sb - 40 * cu, y0 + (rows - 1) * rowH + size / 2 + fs * 2.6 + 70 * cu), how, 38 * cu, '700', INK).setAlpha(0.9).setWordWrapWidth(v.w * 0.9));
      s.items.forEach(function (o) { if (o !== s.items[0]) { o.alpha = 0; self.tweens.add({ targets: o, alpha: o.type === 'Text' && o.text === how ? 0.9 : 1, duration: 150 }); } });
      Kit.snd.play('page');
    }
    restart() { this.closeAll(); this.play().startLevel(this.n.level); }

    // ---------- the level map ----------
    openLevels() {
      var self = this;
      this.push({ name: 'levels', esc: function () { self.pop(); }, draw: function () { self.drawLevels(this); } });
    }
    drawLevels(s) {
      var self = this, v = this.v, u = this.u, pr = this.sv.progress, cur = this.n.level, cu = Math.min(u, 1.7);
      var cardW = Math.min(v.sr - v.sl - 40, 1800), cell = Math.round(150 * Math.max(1, u * 0.9)), gap = Math.round(14 * Math.max(1, u * 0.9));
      var cols = (cardW - 120) / (cell + gap) >= 10 ? 10 : 5, per = 10 / cols, head = 175 * cu, block = 78 * cu + per * (cell + gap) + 30;
      var cardH = head + 3 * block + 30, fit = Math.min(1, (v.h - 24) / cardH, 1);
      this.dim(s, 0.82);
      var root = this.put(s, this.add.container(960, 540).setScale(fit)); root.y = v.t + v.h / 2;
      var add = function (o) { root.add(o); return o; };
      add(this.add.nineslice(0, 0, 'ui', 'ui-card', cardW, cardH, 72, 72, 72, 72));
      var top = -cardH / 2;
      add(this.txt(0, top + 80 * cu, 'Shape Patterns', 70 * cu, '900', INK));
      add(this.txt(0, top + 150 * cu, 'Finish each pattern. Stars come from first-try answers.', 34 * cu, '600', INK).setAlpha(0.8).setWordWrapWidth(cardW - 420));
      var ex = this.button('ic-exit', function () { Kit.play.exit(); }), cl = this.button('ic-close', function () { self.pop(); });
      [[ex, -cardW / 2 + 40 + 75 * cu], [cl, cardW / 2 - 40 - 75 * cu]].forEach(function (a) { a[0].setScale(cu * 0.9); a[0].base = cu * 0.9; a[0].setPosition(a[1], top + 40 + 75 * cu * 0.9); add(a[0]); });
      A.WORLDS.forEach(function (W, wi) {
        var by = top + head + wi * block, dark = hexn(A.shade(W.color, -0.55)), light = hexn(W.color);
        add(self.txt(0, by + 30 * cu, W.name, 44 * cu, '800', W.color));
        for (var j = 0; j < 10; j++) {
          var n = wi * 10 + j + 1, r = Math.floor(j / cols), c = j % cols, x = (c - (cols - 1) / 2) * (cell + gap), y = by + 78 * cu + r * (cell + gap) + cell / 2;
          var locked = !pr.unlocked(n), stars = pr.stars(n), f = cell / 140;
          var kids = [self.add.image(0, 0, 'ui', 'ui-lv').setTint(dark).setAlpha(locked ? 0.3 : 0.7), self.add.image(0, 0, 'ui', 'ui-lvo').setTint(light).setAlpha(locked ? 0.4 : 1)];
          if (locked) kids.push(self.add.image(0, 0, 'ui', 'ic-lock').setScale(0.8).setAlpha(0.7));
          else {
            kids.push(self.add.text(0, stars ? -14 : 0, String(n), { fontFamily: FONT, fontSize: '62px', fontStyle: '900', color: INK }).setOrigin(0.5).setResolution(1.5));
            for (var q = 0; q < 3; q++) if (q < stars) kids.push(self.add.image((q - 1) * 34, 40, 'ui', 'ui-star').setScale(0.46).setTint(0xf6c453));
          }
          if (n === cur) kids.push(self.add.image(0, 0, 'ui', 'ui-lvo').setTint(0xffffff).setScale(1.12));
          var cc = add(self.add.container(x, y, kids).setSize(140, 140).setScale(f)); cc.base = f;
          if (!locked) (function (lv, c0) {
            c0.setInteractive();
            c0.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c0, scale: f * 0.92, duration: 70, yoyo: true }); });
            c0.on('pointerup', function () { self.closeAll(); self.play().startLevel(lv); });
          })(n, cc);
        }
      });
      Kit.snd.play('page');
    }

    // ---------- level done ----------
    openWon(d) {
      var self = this; this.hiddenOff = false;
      this.push({ name: 'won', d: d, esc: function () {}, draw: function () { self.drawWon(this); } });
    }
    drawWon(s) {
      var self = this, v = this.v, u = this.u, d = s.d, W = A.WORLDS[d.world], cu = Math.min(u, 1.7), p = this.put.bind(this, s);
      this.dim(s, 0.6);
      this.sbtn(s, 'ic-exit', v.sl + 30 + 75 * u, v.st + 30 + 75 * u, u, function () { Kit.play.exit(); });
      var cw = Math.min(v.w * 0.92, 1500), ch = 800 * Math.min(cu, 1.5), cy = 540;
      p(this.add.nineslice(960, cy, 'ui', 'ui-card', cw, ch, 72, 72, 72, 72));
      var title = d.last ? 'You did it!' : d.endOfWorld ? W.name + ' done!' : 'Pattern pro!';
      var text = d.last ? 'Every train is home. MashaAllah!' : 'Right first time: ' + d.right + ' of ' + d.total;
      p(this.txt(960, cy - ch / 2 + 100 * cu, title, 80 * cu, '900', INK).setWordWrapWidth(cw - 100));
      p(this.txt(960, cy - ch / 2 + 190 * cu, text, 46 * cu, '700', INK).setAlpha(0.9));
      for (var i = 0; i < 3; i++) {
        var st = p(this.add.image(960 + (i - 1) * 190 * cu, cy - ch / 2 + 330 * cu, 'ui', 'ui-star').setScale(190 * cu / 64 * 0.9).setTint(i < d.stars ? 0xf6c453 : 0x4a3f78).setAlpha(i < d.stars ? 1 : 0.7));
        if (i < d.stars && !s.shown) { st.setScale(0); (function (o, k) { self.tweens.add({ targets: o, scale: 190 * cu / 64 * 0.9, duration: 420, delay: 250 + k * 280, ease: 'Back.easeOut', onStart: function () { Kit.snd.play('star'); } }); })(st, i); }
      }
      s.shown = true;
      var size = 200 * Math.min(cu, 1.3), fs = 40 * cu, by = cy + ch / 2 - size / 2 - fs * 3.4;
      var big = [d.last ? 'Play Again' : d.endOfWorld ? 'Next World' : 'Next Level', d.last ? 'ic-retry' : 'ic-next'];
      var btns = [[big[1], big[0], function () { self.closeAll(); self.play().startLevel(d.last ? 1 : d.level + 1); }, true],
        ['ic-retry', 'Replay', function () { self.closeAll(); self.play().startLevel(d.level); }, false],
        ['ic-grid', 'Levels', function () { self.openLevels(); }, false]];
      if (d.last) btns.shift(), btns.unshift(['ic-retry', 'Play Again', function () { self.closeAll(); self.play().startLevel(1); }, true]), btns.splice(1, 1);
      var gap = 70 * cu;
      btns.forEach(function (b, i) { self.choice(s, b[0], b[1], b[2], b[3], size, 960 + (i - (btns.length - 1) / 2) * (size + gap), by, fs); });
    }
  }
  window.PatHud = Hud;
})();
