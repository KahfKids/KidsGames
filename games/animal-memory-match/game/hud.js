/* Memory Match: the interface (scene 'Hud', above the table, in the 1920 x 1080 design space of Kit.play.fit).
   Laid out by the game-ui-ux skill (docs/phaser-standard.md section 4a). While playing, the screen is the table:
   ONE pause button in the top-left corner of the safe area and, beside it one GAP apart, the progress that matters
   (pairs found / pairs). The pairs themselves are the in-world progress: a found pair lifts, glows and shows its gold
   frame (play.js). Everything else is a stack of screens pushed over the paused game: the pause screen (resume,
   restart, levels, my animals, sound, the way out as a back arrow where the pause button was), the level map, the
   album, the win sheet. The cards need no on-screen controls (a tap on the card is the control); keys are arrows to
   move a ring, Space or Enter to turn, Esc pause, R restart, M sound. Prompts follow the device last used.
   All Phaser: images painted once (art.js), NineSlice plates, Text, tweens for every pop. No endless tween here, so the
   game loop can sleep between moves (rest mode). */
(function () {
  'use strict';
  var K = window.Kit, A = window.MMArt, M = window.MMAnimals, LV = window.MM_LEVELS, COUNT = LV.list.length, PER = LV.PER;
  var GAP = 36, FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', CREAM = '#fffaf0', GOLD = '#ffd98a';
  var color = function (h) { return Phaser.Display.Color.HexStringToColor(h).color; };

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }

    create() {
      var self = this;
      this.blocked = 0; this.registry.set('blocked', 0); this.screen = null; this.device = 'point'; this.lv = null; this.found = 0;
      // the one pause button, and the pairs found beside it (full contrast, on dark plates: they never fade)
      this.bPause = this.button('ic-pause', function () { self.openPause(); });
      this.pill = this.add.nineslice(0, 0, 'mm-ui', 'panel', 290, 112, 56, 56, 56, 56);
      this.pillIc = this.add.image(0, 0, 'mm-ui', 'ic-cards').setScale(1.05);
      this.pillT = this.add.text(0, 0, '0 / 0', { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: CREAM }).setOrigin(0, 0.5);
      this.prog = this.add.container(0, 0, [this.pill, this.pillIc, this.pillT]);

      var kb = this.input.keyboard, key = function (k, f) { kb.addKey(k).on('down', f); };
      key('ESC', function () { self.esc(); });
      key('M', function () { K.snd.setMuted(!K.snd.muted); if (self.screen && self.screen.snd) self.screen.snd(); });
      key('R', function () { if (!self.screen && self.play() && self.play().phase !== 'clear') self.play().startLevel(self.play().level); });
      key('P', function () { if (!self.screen) self.openPause(); });

      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('mm-level', this.levelStart); on('mm-found', this.foundNow); on('mm-won', this.levelWon); on('mm-device', function (d) { self.setDevice(d); });
      this.input.on('pointerdown', function (p) { if (self.device !== 'point') self.setDevice('point'); });
      Kit.play.fit(this, function (v) { self.layout(v); });
      var lv = this.registry.get('lv'); if (lv) this.levelStart(lv);          // the table may have started first
    }
    play() { return this.scene.get('Play'); }

    // a round button on a dark plate, readable on any scene; it answers the touch at once
    button(icon, fn, o) {
      o = o || {}; var self = this, d = o.d || 150;
      var kids = [this.add.image(0, 0, 'mm-ui', o.main ? 'big' : 'plate').setScale(d / (o.main ? 230 : 150)),
                  this.add.image(o.main ? 8 * d / 150 : 0, 0, 'mm-ui', icon).setScale((o.main ? 1.5 : 1.1) * d / 150)];
      if (o.main) kids[1].setTint(0x2a1650);
      var c = this.add.container(0, 0, kids); c.icon = kids[1]; c.setSize(d, d).setInteractive();
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: '*=0.9', duration: 70, yoyo: true }); });
      c.on('pointerup', fn);
      return c;
    }
    layout(v) {
      this.v = v;
      var u = this.u = 48 * v.pt / 150;                                        // Memory Match's own size: a 150-unit button is 48 screen points
      this.bPause.setScale(u).setPosition(v.sl + (40 + 75) * u, v.st + (40 + 75) * u);
      this.prog.setScale(u).setPosition(this.bPause.x + (75 + GAP) * u, this.bPause.y);   // (the pill's own origin is its left end, below)
      this.progLay();
      if (this.screen && this.screen.lay) this.screen.lay(v);
    }
    progLay() {
      var w = 56 + 70 + 16 + this.pillT.width + 56;
      this.pill.setPosition(w / 2, 0).setSize(w, 112); this.pillIc.setPosition(56 + 35, 0); this.pillT.setPosition(56 + 70 + 16, 2);
    }

    /* ---------- events from the table ---------- */
    levelStart(lv) {
      this.lv = lv; this.found = lv.found || 0; this.pairs = lv.pairs;
      this.pillT.setText(this.found + ' / ' + lv.pairs); this.progLay();
    }
    foundNow(found, pairs) {
      this.found = found; this.pillT.setText(found + ' / ' + pairs); this.progLay();
      this.tweens.killTweensOf(this.prog); this.prog.setScale((this.u || 1) * 1.14); this.tweens.add({ targets: this.prog, scale: this.u || 1, duration: 300, ease: 'Back.easeOut' });
    }
    levelWon(info) { this.showWin(info); }
    setDevice(d) { if (d === this.device) return; this.device = d; if (this.screen && this.screen.kind === 'pause') this.pauseHow(); }

    /* ---------- the stack of screens (the game is paused under them) ---------- */
    block(d) {
      this.blocked = Math.max(0, this.blocked + d); this.registry.set('blocked', this.blocked);
      // (scene changes are queued to the next step: ask for the state wanted rather than test the state now)
      if (this.blocked) this.scene.pause('Play'); else this.scene.resume('Play');
    }
    // open a screen (replacing the one on top without un-pausing the game); returns the screen with put()
    open(kind, o) {
      o = o || {};
      if (this.screen) this.screen.items.forEach(function (i) { i.destroy(); }); else this.block(1);
      var self = this, s = this.screen = { kind: kind, items: [], from: o.from, cw: o.w || 1500 };
      s.put = function (i) { s.items.push(i); s.box.add(i); return i; };
      s.top = function (i) { s.items.push(i); return i; };                     // the dim and the corner buttons are not scaled with the content
      s.dim = s.top(this.add.image(0, 0, 'mm-ui', 'px').setTint(0x0b0620).setAlpha(o.dim || 0.92).setInteractive());
      s.box = this.add.container(0, 0);                                      // the content: scaled about the middle of the design space
      s.items.push(s.box);
      s.exit = s.top(this.button('ic-exit', function () { Kit.play.exit(); }));
      if (o.close) s.close = s.top(this.button('ic-close', o.close));
      s.tx = function (str, x, y, size, w, st) { return s.put(self.add.text(x, y, str, Object.assign({ fontFamily: FONT, fontSize: size + 'px', fontStyle: w, color: CREAM, align: 'center' }, st || {})).setOrigin(0.5)); };
      s.lay = function (v) {
        var u = 48 * v.pt / 150, k = Math.min(u * 1.6, (v.sr - v.sl) / (s.cw + 80));   // (a screen card: about 1.6 x the button size, never wider than the screen)
        s.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4);
        s.box.setScale(k).setPosition(960 * (1 - k), 540 * (1 - k));
        s.exit.setScale(u).setPosition(v.sl + (40 + 75) * u, v.st + (40 + 75) * u);   // where the pause button was
        if (s.close) s.close.setScale(u).setPosition(v.sr - (40 + 75) * u, v.st + (40 + 75) * u);
        if (s.lay2) s.lay2(v);
      };
      s.items.forEach(function (i) { if (i !== s.dim && i !== s.box) i.setAlpha(0); });
      s.box.setAlpha(0); this.tweens.add({ targets: [s.box, s.exit, s.close].filter(Boolean), alpha: 1, duration: 160 });
      return s;
    }
    done() { var s = this.screen; if (!s) return; this.screen = null; s.items.forEach(function (i) { i.destroy(); }); this.block(-1); }
    esc() {
      var s = this.screen, p = this.play();
      if (!s) { if (p && p.phase !== 'clear' && p.def) this.openPause(); return; }
      if (s.kind === 'pause') this.done(); else if (s.kind === 'map' || s.kind === 'album') this.back(s);
    }
    back(s) { if (s.from === 'pause') this.openPause(true); else if (s.from === 'win') this.showWin(this.winInfo); else this.done(); }
    // a labelled big choice
    choice(s, icon, label, fn, main) {
      var b = s.put(this.button(icon, fn, { main: main, d: 230 }));
      b.label = s.put(this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '40px', fontStyle: '700', color: CREAM }).setOrigin(0.5, 0));
      return b;
    }

    /* ---------- the pause screen ---------- */
    openPause(fromBack) {
      var p = this.play(); if (!p || !p.def || (p.phase === 'clear' && !fromBack)) return;
      if (this.screen && !fromBack) return;
      var self = this, lv = this.lv || { level: 1, world: 0 }, W = A.WORLDS[lv.world], s = this.open('pause');
      s.title = s.tx('Level ' + lv.level + ' / ' + COUNT, 960, 290, 80, '800');
      s.sub = s.tx(W.name, 960, 370, 42, '700', { color: W.color });
      s.row = [
        this.choice(s, 'ic-play', 'Resume', function () { self.done(); }, true),
        this.choice(s, 'ic-retry', 'Restart', function () { self.done(); self.play().startLevel(lv.level); }),
        this.choice(s, 'ic-grid', 'Levels', function () { self.openMap('pause'); }),
        this.choice(s, 'ic-paw', 'Animals', function () { self.openAlbum('pause'); }),
        this.choice(s, K.snd.muted ? 'ic-mute' : 'ic-snd', K.snd.muted ? 'Sound off' : 'Sound on', function () { K.snd.setMuted(!K.snd.muted); s.snd(); })
      ];
      s.how = s.tx('', 960, 900, 34, '600', { alpha: 0.9 }); s.how.setAlpha(0.9);
      s.snd = function () { var m = K.snd.muted, b = s.row[4]; b.icon.setTexture('mm-ui', m ? 'ic-mute' : 'ic-snd'); b.label.setText(m ? 'Sound off' : 'Sound on'); };
      s.lay2 = function (v) {
        var gap = 62, w = 230, n = s.row.length, x0 = 960 - ((n - 1) * (w + gap)) / 2, cy = 640;
        s.row.forEach(function (c, i) { c.setPosition(x0 + i * (w + gap), cy); c.label.setPosition(c.x, cy + w / 2 + 22); });
        s.how.setPosition(960, Math.min(v.sb - 50, 940));
      };
      this.pauseHow(); s.lay(this.v);
    }
    pauseHow() {
      var s = this.screen; if (!s || s.kind !== 'pause') return;
      s.how.setText(this.device === 'keys' ? 'Arrows choose  ·  Space or Enter turns  ·  R restarts  ·  Esc pauses  ·  M sound' : 'Tap a card to turn it over  ·  Find two the same');
    }

    /* ---------- the level map: every level by world, with its stars ---------- */
    openMap(from) {
      var self = this, P = MMSave.progress, s = this.open('map', { from: from, w: 1500, dim: 0.95, close: function () { self.back(self.screen); } });
      s.tx('Memory Match', 960, 105, 76, '800');
      s.tx(P.total() + ' stars  ·  ' + MMSave.album.length + ' of ' + M.LIST.length + ' animals found', 960, 190, 36, '600', { color: GOLD });
      A.WORLDS.forEach(function (W, wi) {
        var y = 340 + wi * 185, light = color(W.color), dark = color(M.shade(W.color, -0.55));
        s.tx(W.name, 700, y, 38, '700', { color: W.color }).setOrigin(1, 0.5);
        for (var i = 0; i < PER; i++) {
          var n = wi * PER + i + 1, x = 800 + i * 150, ok = P.unlocked(n), st = P.stars(n);
          var kids = [self.add.image(0, 0, 'mm-ui', 'cell').setTint(dark).setAlpha(ok ? 0.7 : 0.18).setScale(0.93), self.add.image(0, 0, 'mm-ui', 'cellr').setTint(light).setAlpha(ok ? 1 : 0.38).setScale(0.93)];
          if (!ok) kids.push(self.add.image(0, 0, 'mm-ui', 'ic-lock').setScale(0.8).setAlpha(0.7));
          else kids.push(self.add.text(0, 0, String(n), { fontFamily: FONT, fontSize: '56px', fontStyle: '800', color: CREAM }).setOrigin(0.5));
          if (n === P.current() && ok) kids.push(self.add.image(0, 0, 'mm-ui', 'cellr').setTint(0xffffff).setScale(1.1));
          for (var k = 0; k < 3 && st > 0; k++) kids.push(self.add.image((k - 1) * 40, 86, 'mm-ui', k < st ? 'star' : 'star0').setScale(0.4));
          var cell = s.put(self.add.container(x, y, kids).setSize(130, 130));
          if (ok) (function (lv, c) {
            c.setInteractive(); c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); });
            c.on('pointerup', function () { self.done(); self.play().startLevel(lv); });
          })(n, cell);
        }
      });
      s.lay(this.v);
    }

    /* ---------- my animals ---------- */
    openAlbum(from) {
      var self = this, pl = this.play(), s = this.open('album', { from: from, dim: 0.95, close: function () { self.back(self.screen); } });
      Kit.snd.play('page');
      s.tx('My Animals', 960, 105, 76, '800');
      var sub = s.tx(MMSave.album.length + ' of ' + M.LIST.length + ' animals found', 960, 190, 38, '600', { color: GOLD });
      M.LIST.forEach(function (a, i) {
        var got = MMSave.album.indexOf(a.id) >= 0, x = 960 + ((i % 5) - 2) * 280, y = 355 + Math.floor(i / 5) * 185;
        var disc = self.add.image(0, 0, 'mm-cards', 'disc').setScale(124 / 280), pic = self.add.image(0, 2, 'mm-animals', a.id).setScale(112 / A.AN);
        if (got) disc.setTint(color(a.bg)); else { disc.setTint(0xffffff).setAlpha(0.12); pic.setTint(0xefe2c8).setTintMode(Phaser.TintModes.FILL).setAlpha(0.25); }
        var nm = self.add.text(0, 82, got ? a.name : '?', { fontFamily: FONT, fontSize: '32px', fontStyle: '800', color: got ? CREAM : '#a99cc4' }).setOrigin(0.5);
        var tile = s.put(self.add.container(x, y, [disc, pic, nm]).setSize(250, 170));
        if (got) {
          tile.setInteractive();
          tile.on('pointerdown', function () { self.tweens.killTweensOf(tile); self.tweens.add({ targets: tile, scale: 1.12, duration: 110, yoyo: true, ease: 'Back.easeOut' }); });
          tile.on('pointerup', function () { Kit.snd.play(a.id); sub.setText(a.name + (a.cap ? '  ·  ' + a.cap : '')); });
        }
      });
      s.lay(this.v);
    }

    /* ---------- the win sheet ---------- */
    showWin(info) {
      var self = this, s = this.open('win', { dim: 0.9 }), lv = info.level, last = info.last, endW = lv % PER === 0, W = A.WORLDS[LV.worldOf(lv)];
      this.winInfo = info;
      s.tx(last ? 'You did it!' : endW ? W.name + ' done!' : 'MashaAllah!', 960, 215, 100, '800', { stroke: '#140a28', strokeThickness: 14 });
      s.tx(last ? 'Every level! What a memory!' : 'You found all ' + info.pairs + ' pairs!', 960, 330, 50, '700');
      for (var i = 0; i < 3; i++) {
        var st = s.put(this.add.image(960 + (i - 1) * 210, 500, 'mm-ui', i < info.stars ? 'star' : 'star0').setScale(0).setAngle(-20));
        this.tweens.add({ targets: st, scale: 2, angle: 0, duration: 420, delay: 250 + i * 260, ease: 'Back.easeOut', onStart: (function (on) { return function () { if (on) Kit.snd.play('match'); }; })(i < info.stars) });
      }
      var next = function () { self.done(); self.play().startLevel(lv + 1); }, again = function () { self.done(); self.play().startLevel(last ? 1 : lv); };
      s.row = [];
      if (!last) s.row.push(this.choice(s, 'ic-next', endW ? 'Next World' : 'Next Level', next, true));
      s.row.push(this.choice(s, 'ic-retry', last ? 'Play Again' : 'Replay', again, last));
      s.row.push(this.choice(s, 'ic-grid', 'Levels', function () { self.openMap('win'); }));
      s.lay2 = function () {
        var gap = 90, w = 230, n = s.row.length, x0 = 960 - ((n - 1) * (w + gap)) / 2, cy = 800;
        s.row.forEach(function (c, i) { c.setPosition(x0 + i * (w + gap), cy); c.label.setPosition(c.x, cy + w / 2 + 22); });
      };
      s.lay(this.v);
    }
  }
  window.MMHud = Hud;
})();
