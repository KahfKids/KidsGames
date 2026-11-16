/* Hextris (Kahf Kids edition): game/hud.js, scene 'Hud': the game's screens, pushed over the paused game, in the 1920 x 1080
   design space of Kit.play.fit (game-ui-ux skill, docs/phaser-standard.md section 4a): the pause screen (resume, restart, levels,
   sound, the way out), the level map (three worlds of five levels with stars, and Endless), the result of a level (won, lost,
   Endless over). Only the top screen takes input; the game scene is paused under them (this.scene.pause).
   While playing nothing of this exists: the interface of play is in the Play scene (ingame.js), and this scene SLEEPS until a
   screen is wanted (show) and sleeps again when the last one closes (a scene kept awake costs a camera pass every frame).
   Keys while a screen is open: Esc closes the pause screen and the map, Space or Enter takes the bright button, R restarts, M
   switches sound. Words are kept from the old game. Pictures come from the 'hx-ui' sheet, panels are nine-slices, tweens do
   every fade and pulse. */
(function () {
  'use strict';
  var A = window.HexArt, LV = window.HEX_LEVELS, UI = window.HexUI, GAP = UI.GAP, REST = 0.6, FONT = 'system-ui, sans-serif';
  var progress = UI.progress, store = UI.store, COUNT = LV.list.length, PER = LV.perWorld;
  var CREDIT = 'Based on Hextris by Logan Engstrom and Garrett Finucane. Free software under the GNU GPL v3; this version is GPL v3 too (see LICENSE.md).';
  var num = function (n) { return n.toLocaleString(); };

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this;
      this.stack = []; this.scr = [];
      this.play = this.scene.get('Play');
      UI.hud = this;
      this.input.on('pointerdown', function (p) { if (UI.open) self.ig().setDevice(p.wasTouch ? 'touch' : 'keys'); });
      // keys while a screen is open (while playing they are the game's: ingame.js)
      var K = this.input.keyboard.addKeys('SPACE,ENTER,R,ESC,M');
      var act = function (f) { return function (k, e) { if (UI.open && !(e && e.repeat)) f.call(self); }; };
      K.ESC.on('down', act(function () { var t = this.top(); if (t && (t.name === 'pause' || t.name === 'levels')) this.back(); }));
      K.SPACE.on('down', act(function () { if (this.primary) this.primary(); }));
      K.ENTER.on('down', act(function () { if (this.primary) this.primary(); }));
      K.R.on('down', act(function () { if (this.play.state !== 'idle') this.restart(); }));
      K.M.on('down', act(function () { Kit.snd.setMuted(!Kit.snd.muted); if (this.top() && this.top().name === 'pause') this.render(); }));

      // the game's events
      var ev = this.game.events, on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('hx-won', this.won); on('hx-lost', this.lost);
      Kit.play.fit(this, function (v) { self.v = v; self.k = UI.k(v); if (self.top()) self.render(); });
      if (window.HXT) window.HXT.hud = this;
      this.scene.sleep();                                                          // asleep until a screen is wanted (show)
    }
    ig() { return this.play.ig; }

    // ---------- small builders ----------
    text(s, x, y, size, weight, color, parent) { return UI.text(this, s, x, y, size, weight, color, parent); }
    button(icon, fn) { return UI.button(this, icon, fn); }
    // a big round choice with its words under it; the first (the one the eye should land on) is bright
    choice(parent, x, y, icon, label, fn, main, accent) {
      var self = this, b = this.add.image(0, 0, 'hx-ui', main ? 'big' : 'plate').setScale(main ? 0.82 : 1.53);
      if (main) b.setTint(accent);
      var c = this.add.container(x, y, [b, this.add.image(main ? 10 : 0, 0, 'hx-ui', 'ic-' + icon).setScale(1.4).setTint(main ? 0x0c1b1e : 0xffffff)]).setSize(230, 230).setInteractive();
      c.label = this.text(label, x, y + 115 + 24, 40, 700, '#f2f7f6', parent).setOrigin(0.5, 0);
      c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); });
      c.on('pointerup', fn); parent.add(c); return c;
    }

    // ---------- the stack of screens ----------
    top() { return this.stack[this.stack.length - 1]; }
    show(name, args) {
      var was = this.stack.length;
      this.stack.push({ name: name, args: args || {} });
      if (!was) {
        UI.open = true; this.play.fast = false; this.scene.pause('Play'); this.ig().show(false);
        this.scene.wake();
      }
      this.render();
    }
    back() { this.stack.pop(); if (this.stack.length) this.render(); else this.closeAll(); }
    closeAll() {
      this.stack = []; this.clear(); UI.open = false;
      this.ig().show(true); this.scene.resume('Play'); this.scene.sleep();
    }
    clear() { this.scr.forEach(function (o) { o.destroy(); }); this.scr = []; this.primary = null; }
    render() {
      var t = this.top(), v = this.v; this.clear(); if (!t || !v) return;
      var self = this, k = this.k, portrait = v.w < v.h, ps = portrait ? k : 1, A_ = A.WORLDS[(this.play.hudInfo || {}).world || 0];
      var put = function (o) { self.scr.push(o); return o; };
      var dim = put(this.add.image(v.l + v.w / 2, v.t + v.h / 2, 'hx-ui', 'px').setTint(0x040a0c).setAlpha(0.74).setDisplaySize(v.w + 4, v.h + 4).setInteractive().setDepth(20));
      var P = put(this.add.container(v.l + v.w / 2, v.t + v.h / 2).setScale(ps).setDepth(21));
      this.accent = Phaser.Display.Color.HexStringToColor(A_.color).color;
      this.pw = Math.min(portrait ? 1000 : 1500, (v.w - 80) / ps);
      // the way out, where the pause button was; on the map also a close at the other corner
      var out = put(this.button('ic-exit', function () { Kit.play.exit(); }).setScale(k).setPosition(v.sl + 40 + 75 * k, v.st + 40 + 75 * k).setDepth(22));
      out.base = k;
      if (t.name === 'levels') { var cl = put(this.button('ic-close', function () { self.back(); }).setScale(k).setPosition(v.sr - 40 - 75 * k, v.st + 40 + 75 * k).setDepth(22)); cl.base = k; }
      this['s_' + t.name](P, portrait, t.args, put);
      P.alpha = 0; dim.alpha = 0;
      this.tweens.add({ targets: P, alpha: 1, duration: 160 }); this.tweens.add({ targets: dim, alpha: 0.74, duration: 160 });
    }

    // ---- the pause screen ----
    s_pause(P, portrait) {
      var self = this, play = this.play, I = play.hudInfo || {}, W = A.WORLDS[I.world || 0], touch = UI.device === 'touch', muted = Kit.snd.muted;
      var title = this.text('Paused', 0, portrait ? -420 : -250, 84, 800, '#f2f7f6', P);
      this.text(play.endless ? 'Endless · Score ' + num(play.score) : W.name + ' · Level ' + play.level, 0, portrait ? -335 : -165, 40, 700, W.color, P);
      var resume = function () { self.back(); };
      var spots = portrait ? [[-175, -100], [175, -100], [-175, 250], [175, 250]] : [[-480, 20], [-160, 20], [160, 20], [480, 20]];
      var b = [['play', 'Resume', resume, true], ['retry', 'Restart', function () { self.restart(); }], ['grid', 'Levels', function () { self.show('levels'); }],
        [muted ? 'mute' : 'snd', muted ? 'Sound off' : 'Sound on', function () { Kit.snd.setMuted(!Kit.snd.muted); self.render(); }]];
      b.forEach(function (q, i) { self.choice(P, spots[i][0], spots[i][1], q[0], q[1], q[2], q[3], self.accent); });
      this.primary = resume;
      var y = portrait ? 520 : 290;
      this.text('Turn the tiles so 3 of the same colour touch.', 0, y, 34, 600, '#f2f7f6', P).setAlpha(0.9);
      this.text(touch ? 'Tap left  ·  Tap right' : 'Arrow keys or A D turn  ·  Down speeds up  ·  Space pauses  ·  R restarts  ·  M sound', 0, y + 54, 32, 600, '#f2f7f6', P).setAlpha(0.8)
        .setWordWrapWidth(this.pw * 0.96);
      this.text(CREDIT, 0, y + (portrait ? 190 : 126), 24, 500, '#f2f7f6', P).setAlpha(0.6).setWordWrapWidth(this.pw * 0.92);
    }

    // ---- the level map: three worlds of five levels, with stars; Endless below ----
    s_levels(P, portrait) {
      var self = this, PW = this.pw, PH = portrait ? 1450 : 1000, cur = this.play.endless ? 0 : this.play.level;
      P.add(this.add.nineslice(0, 0, 'hx-ui', 'card', PW, PH, 60, 60, 60, 60));
      this.text('Hextris', 0, portrait ? -625 : -420, 72, 800, '#f2f7f6', P);
      A.WORLDS.forEach(function (W, wi) {
        var dark = Phaser.Display.Color.HexStringToColor(A.shade(W.color, -0.55)).color, light = Phaser.Display.Color.HexStringToColor(W.color).color;
        var ly = portrait ? -400 + wi * 360 : -250 + wi * 215, cy = portrait ? ly + 135 : ly;
        var lab = self.text(W.name, portrait ? 0 : -PW / 2 + 70, ly - (portrait ? 0 : 0), 34, 700, W.color, P).setOrigin(portrait ? 0.5 : 0, 0.5);
        for (var n = 0; n < PER; n++) {
          var lv = wi * PER + n + 1, locked = !progress.unlocked(lv), stars = progress.stars(lv);
          var x = portrait ? (n - 2) * 175 : -120 + n * 175;
          var kids = [self.add.image(0, 0, 'hx-ui', 'cell').setTint(dark).setAlpha(locked ? 0.15 : 0.55), self.add.image(0, 0, 'hx-ui', 'cello').setTint(light).setAlpha(locked ? 0.38 : 1)];
          if (locked) kids.push(self.add.image(0, 0, 'hx-ui', 'ic-lock').setScale(0.8).setAlpha(0.6));
          else {
            kids.push(self.text(String(lv), 0, -14, 58, 800, '#f2f7f6'));
            for (var s = 0; s < 3; s++) kids.push(self.add.image((s - 1) * 36, 38, 'hx-ui', s < stars ? 'star' : 'star0').setScale(0.3));
          }
          var cell = self.add.container(x, cy, kids).setSize(140, 140); P.add(cell);
          if (lv === cur && !locked) { var rg = self.add.image(0, 0, 'hx-ui', 'cello').setTint(light).setScale(1.14); cell.add(rg); self.tweens.add({ targets: rg, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 }); }
          if (!locked) (function (l, c) {
            c.setInteractive(); c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: 0.92, duration: 70, yoyo: true }); });
            c.on('pointerup', function () { self.go(l); });
          })(lv, cell);
        }
      });
      var best = store.get('best', 0), ey = portrait ? 640 : 380, eb = this.add.container(0, ey, [this.add.nineslice(0, 0, 'hx-ui', 'pillw', 760, 130, 62, 62, 62, 62).setTint(0xffd36b),
        this.add.image(-250, 0, 'hx-ui', 'ic-inf').setScale(0.9).setTint(0x0c1b1e), this.text('Endless', best ? -60 : 0, 0, 48, 800, '#0c1b1e')]).setSize(760, 130).setInteractive();
      if (best) eb.add(this.text('Best ' + num(best), 190, 0, 34, 800, '#3b2a06'));
      eb.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: eb, scale: 0.95, duration: 70, yoyo: true }); });
      eb.on('pointerup', function () { self.closeAll(); self.play.startEndless(); });
      P.add(eb);
    }

    // ---- a level won, lost, an endless game over ----
    s_won(P, portrait, r) {
      var self = this, W = A.WORLDS[r.world], last = r.last, endOfWorld = r.endOfWorld, quiet = r.quiet;
      this.text(last ? 'You did it!' : endOfWorld ? W.name + ' done!' : 'Level complete!', 0, portrait ? -520 : -300, 84, 800, '#f2f7f6', P);
      this.text(last ? 'All 15 courtyards are shining. MashaAllah!' : 'Score ' + num(r.score), 0, portrait ? -430 : -215, 42, 700, W.color, P);
      for (var i = 0; i < 3; i++) {
        var on = i < r.stars, st = this.add.image((i - 1) * 190, portrait ? -270 : -80, 'hx-ui', on ? 'star' : 'star0').setScale(on && !quiet ? 0.01 : 1.5); P.add(st);
        if (on && !quiet) this.tweens.add({ targets: st, scale: 1.5, duration: 420, ease: 'Back.easeOut', delay: 350 + i * 380, onStart: function () { Kit.snd.play('star'); } });
      }
      var btn = [];
      var next = function () { self.closeAll(); self.play.startLevel(r.level + 1); }, replay = function () { self.closeAll(); self.play.startLevel(last ? 1 : r.level); };
      if (!last) btn.push(['next', endOfWorld ? 'Next World' : 'Next Level', next, true]);
      btn.push([last ? 'play' : 'retry', last ? 'Play Again' : 'Replay', replay, last]);
      btn.push(['grid', 'Levels', function () { self.stack[self.stack.length - 1].args.quiet = true; self.show('levels'); }]);
      this.row(P, btn, portrait ? 40 : 170);
      this.primary = btn[0][2];
    }
    s_lost(P, portrait, r) {
      var self = this;
      this.text(r.endless ? (r.isBest ? 'New best!' : 'Great game!') : 'Out of hearts', 0, portrait ? -420 : -250, 84, 800, '#f2f7f6', P);
      this.text(r.endless ? 'Score ' + num(r.score) + ' · Best ' + num(r.best) : "Let's turn the tiles again!", 0, portrait ? -330 : -160, 42, 700, A.WORLDS[1].color, P);
      var again = function () { self.closeAll(); if (r.endless) self.play.startEndless(); else self.play.startLevel(r.level); };
      var btn = [['retry', r.endless ? 'Play Again' : 'Try Again', again, true], ['grid', 'Levels', function () { self.show('levels'); }]];
      this.row(P, btn, portrait ? -40 : 60);
      this.primary = again;
    }
    row(P, btn, y) {
      var self = this, n = btn.length;
      btn.forEach(function (q, i) { self.choice(P, (i - (n - 1) / 2) * 340, y, q[0], q[1], q[2], q[3], self.accent); });
    }

    // ---------- actions ----------
    go(n) { this.closeAll(); this.play.startLevel(n); }
    restart() { this.closeAll(); if (this.play.endless) this.play.startEndless(); else this.play.startLevel(this.play.level); }
    won(r) { this.show('won', r); }
    lost(r) { this.show('lost', r); }
  }
  window.HexHud = Hud;
})();
