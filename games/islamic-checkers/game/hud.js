/* Courtyard Checkers: the interface (scene 'Hud', above the Board, in the design space of Kit.play.fit).
   Laid out by the game-ui-ux skill, after Spider IK's hud.js. While playing, the screen is the board: one pause button in
   the top-left corner, the round (and the wins, which are also on the two badges beside the board), and a hint until the
   first move. Everything else is a stack of screens pushed over the paused game: the pause screen (resume, restart,
   opponents, sound, the way out), the ladder of opponents, the match result. Only the top screen takes input.
   All Phaser: pictures from the 'ui' sheet, Text objects, nine-slices for stretchy parts, tweens for every pop and fade.
   Sizes are multiplied by view.u, set here to 52 screen points per 150-unit button on every screen. Anchored to the safe area (view.sl .. sb), one gap
   constant (GAP), every touch target at least 150 units before the u factor. Keys: Esc pauses, R restarts the match,
   M switches sound, arrows/Space/Enter play (Board), Space/Enter resume on the pause screen. */
(function () {
  'use strict';
  var C = window.BkCfg, A = window.BkArt, GAP = 36, F = 'system-ui, -apple-system, sans-serif';
  var CREAM = '#fffaf0', GOLD_N = 0xf6c453;

  class Hud extends Phaser.Scene {
    constructor() { super({ key: 'Hud' }); }
    create() {
      var self = this, ev = this.game.events;
      this.stack = []; this.device = this.registry.get('device') || 'touch'; this.L = null;
      this.bPause = this.round('ic-pause', function () { self.openPause(); }).setDepth(50);
      this.pill = this.add.nineslice(0, 0, 'ui', 'chip', 10, 10, 48, 48, 40, 40).setScale(0.5).setDepth(50);
      this.pillT = this.add.text(0, 0, '', { fontFamily: F, fontSize: '40px', fontStyle: '800', color: CREAM }).setOrigin(0, 0.5).setDepth(51);
      this.pillD = [0, 1, 2].map(function () { return self.add.image(0, 0, 'ui', 'dot').setDepth(51); });
      this.hintB = this.add.nineslice(0, 0, 'ui', 'chip', 10, 10, 48, 48, 40, 40).setScale(0.5).setDepth(40).setVisible(false);
      this.hintT = this.add.text(0, 0, '', { fontFamily: F, fontSize: '40px', fontStyle: '700', color: CREAM, align: 'center' }).setOrigin(0.5).setDepth(41).setVisible(false);

      // keys: Esc pauses, R restarts, M sound; Space and Enter resume when the pause screen is up
      var K = this.input.keyboard.addKeys('ESC,R,M,SPACE,ENTER');
      K.ESC.on('down', function () { var top = self.top(); if (!top) self.openPause(); else if (top.close) top.close(); });
      K.R.on('down', function () { if (!self.top() && self.board().phase !== 'over') self.restart(); });
      K.M.on('down', function () { Kit.snd.setMuted(!Kit.snd.muted); var t = self.top(); if (t && t.snd) t.snd(); });
      ['SPACE', 'ENTER'].forEach(function (k) { K[k].on('down', function () { var t = self.top(); if (t && t.name === 'pause') t.close(); else if (t && t.name === 'result' && t.primary) t.primary(); }); });
      this.input.keyboard.on('keydown', function () { ev.emit('bk-device', 'keys'); });
      this.input.on('pointerdown', function () { ev.emit('bk-device', 'touch'); });

      var on = function (k, f) { ev.on(k, f, self); self.events.once('shutdown', function () { ev.off(k, f, self); }); };
      on('bk-layout', function (L) { self.L = L; self.layout(self.v); });
      on('bk-round', this.setRound);
      on('bk-match', function (b) { self.showHint(!b.hinted && b.mode === 'ai'); });
      on('bk-hint', function (show) { self.showHint(show); });
      on('bk-device-changed', function (d) { self.device = d; self.setHint(); var t = self.top(); if (t && t.layout) t.layout(self.v); });
      document.addEventListener('visibilitychange', this.hiddenFn = function () { if (document.hidden && !self.top() && /intro|play|ai|anim/.test(self.board().phase)) self.openPause(); });
      this.events.once('shutdown', function () { document.removeEventListener('visibilitychange', self.hiddenFn); });

      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });
      this.scene.launch('Board'); this.scene.bringToTop();
    }
    board() { return this.scene.get('Board'); }
    top() { return this.stack[this.stack.length - 1]; }
    ku() { return this.v ? this.v.u : 1; }
    tx(x, y, str, size, w, color, o) { return this.add.text(x, y, str, Object.assign({ fontFamily: F, fontSize: Math.round(size) + 'px', fontStyle: w || '700', color: color || CREAM }, o || {})).setOrigin(0.5); }
    sizedTap(c) { var self = this; c.on('pointerdown', function () { Kit.snd.play('tap'); self.tweens.add({ targets: c, scale: c.sc * 0.9, duration: 70, yoyo: true }); }); }

    // a round button: a dark plate and its icon; answers the touch at once
    round(icon, fn) {
      var c = this.add.container(0, 0, [this.add.image(0, 0, 'ui', 'plate'), this.add.image(0, 0, 'ui', icon).setScale(0.8)]);
      c.sc = 0.5; c.setScale(0.5).setSize(300, 300).setInteractive(); c.icon = c.list[1];
      this.sizedTap(c); c.on('pointerup', fn); return c;
    }
    /* ---------------------------------------------------------------- always on screen */
    layout(v) {
      if (v) v.u = 52 * v.pt / 150;                           // the same size as the board's scene: a 150-unit button is 52 points
      this.v = v; if (!v) return; var u = v.u;
      this.bPause.sc = 0.5 * u; this.bPause.setScale(0.5 * u).setPosition(v.sl + GAP + 75 * u, v.st + GAP + 75 * u);
      this.layPill(); this.layHint();
      this.stack.forEach(function (s) { if (s.layout) s.layout(v); });
    }
    setRound() {
      var b = this.board(), m = b.match; if (!m) return;
      this.pillT.setText('Round ' + m.round);
      this.pillD.forEach(function (d, i) { d.setTint(i < m.round - 1 ? GOLD_N : i === m.round - 1 ? 0xfffaf0 : 0x6a5a92).setAlpha(i <= m.round - 1 ? 1 : 0.7); });
      this.layPill();
      var ov = b.phase === 'over'; this.bPause.setVisible(!ov || !!this.top());
    }
    layPill() {
      var L = this.L, v = this.v; if (!L || !v) return; var k = this.ku(), fs = Math.round(Math.max(38 * k, 17 * v.pt));   // (never under 17 points)
      this.pillT.setFontSize(fs);
      var dw = fs * 0.5, tw = this.pillT.width, w = tw + dw * 3 * 1.7 + 70, h = fs * 1.9, cx = L.round.x, y = L.round.y;
      if (L.round.avail && w > L.round.avail) { fs = Math.floor(fs * L.round.avail / w); this.pillT.setFontSize(fs); dw = fs * 0.5; tw = this.pillT.width; w = tw + dw * 3 * 1.7 + 70; h = fs * 1.9; }
      var x0 = L.round.side === 'center' ? cx - w / 2 : cx;
      this.pill.setSize(w * 2, h * 2).setPosition(x0 + w / 2, y);
      this.pillT.setPosition(x0 + 34, y);
      this.pillD.forEach(function (d, i) { d.setPosition(x0 + 34 + tw + dw * 1.2 + i * dw * 1.7, y).setScale(dw / 32); });
    }
    showHint(on) { this.hintOn = on; this.setHint(); }
    setHint() {
      var show = !!this.hintOn && !this.top(); this.hintB.setVisible(show); this.hintT.setVisible(show);
      if (show) { this.hintT.setText(this.device === 'keys' ? C.hint.keys : C.hint.touch); this.layHint(); }
    }
    layHint() {
      var L = this.L, v = this.v; if (!L || !v || !this.hintOn) return; var k = this.ku(), fs = Math.round(Math.max(36 * k, 17 * v.pt));   // (never under 17 points)
      this.hintT.setFontSize(fs).setWordWrapWidth(Math.min(1100, v.sr - v.sl - 120));
      var w = this.hintT.width + 90, h = this.hintT.height + 30;
      this.hintB.setSize(w * 2, h * 2).setPosition(L.cx, L.hintY); this.hintT.setPosition(L.cx, L.hintY);
    }

    /* ---------------------------------------------------------------- a stack of screens over the paused game */
    push(name) {
      var self = this, s = { name: name, items: [], depth: 100 + this.stack.length * 20 };
      s.put = function (o) { s.items.push(o); if (o.setDepth) o.setDepth(s.depth + 1); return o; };
      s.dim = s.put(this.add.image(0, 0, 'ui', 'px').setTint(0x07031a).setAlpha(0.84).setInteractive()).setDepth(s.depth);
      s.close = function (quiet) { self.pop(s, quiet); };
      this.stack.push(s);
      if (this.stack.length === 1) { if (this.board().sys.settings.status === Phaser.Scenes.RUNNING) this.scene.pause('Board'); this.setHint(); }
      Kit.snd.play('page');
      return s;
    }
    pop(s, quiet) {
      var i = this.stack.indexOf(s); if (i < 0) return;
      this.stack.splice(i, 1);
      s.items.forEach(function (o) { if (o.input) o.disableInteractive(); }); this.tweens.killTweensOf(s.items);
      s.items.forEach(function (o) { o.destroy(); });
      if (!this.stack.length && !quiet) { this.scene.resume('Board'); this.setHint(); this.setRound(); }
      if (s.onClose && !quiet) s.onClose();
    }
    fade(s) { var its = s.items.filter(function (o) { return o !== s.dim; }); its.forEach(function (o) { o._a = o.alpha; o.setAlpha(0); }); this.tweens.add({ targets: its, alpha: function (t) { return t._a; }, duration: 180 }); }
    dimLay(s, v) { s.dim.setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(v.w + 4, v.h + 4); }
    panel(s, w, h) { return s.put(this.add.nineslice(0, 0, 'ui', 'panel', w * 2, h * 2, 90, 90, 90, 90).setScale(0.5)); }
    // a labelled button: a pill (cream, or gold for the main choice), an icon and the words
    button(s, label, icon, fn, primary) {
      var self = this, k = this.ku();
      var c = s.put(this.add.container(0, 0));
      c.bg = this.add.nineslice(0, 0, 'ui', 'btn', 400, 120, 64, 64, 56, 56).setScale(0.5).setTint(primary ? 0xf6c453 : 0xfff3d6);
      c.ic = this.add.image(0, 0, 'ui', icon).setTint(0x1b1040).setScale(0.62);
      c.lb = this.add.text(0, 0, label, { fontFamily: F, fontSize: Math.round(44 * k) + 'px', fontStyle: '800', color: '#1b1040' }).setOrigin(0, 0.5);
      c.add([c.bg, c.ic, c.lb]); c.sc = 1; c.fn = fn; c.setSize(400, 120).setInteractive();                // (a container's hit area starts at its top-left corner)
      c.size = function (w, h) { c.bg.setSize(w * 2, h * 2); c.setSize(w, h); c.input.hitArea.setSize(w, h); c.ic.setPosition(-w / 2 + 70 * k, 0).setScale(0.62 * k); c.lb.setPosition(-w / 2 + 70 * k + 56 * k, 0).setFontSize(Math.round(44 * k)); };
      this.sizedTap(c); c.on('pointerup', function () { fn(); });
      return c;
    }

    /* ---------------------------------------------------------------- the pause screen */
    openPause() {
      if (this.top()) return;
      var self = this, b = this.board(), s = this.push('pause'), k = this.ku();
      s.title = s.put(this.tx(0, 0, 'Paused', 78 * k, '800'));
      s.sub = s.put(this.tx(0, 0, '', 38 * k, '700', '#ffd98a'));
      s.exit = s.put(this.round('ic-exit', function () { Kit.play.exit(); })); s.exit.icon.setTint(0xffffff);
      var choice = function (icon, label, fn, main) {
        var c = s.put(self.add.container(0, 0, [self.add.image(0, 0, 'ui', main ? 'big' : 'plate'), self.add.image(main ? 8 : 0, 0, 'ui', icon).setScale(1.0).setTint(main ? 0x1b1040 : 0xffffff)]));
        c.setSize(300, 300).setInteractive(); c.sc = 1; c.icon = c.list[1]; c.main = main;
        c.lb = s.put(self.add.text(0, 0, label, { fontFamily: F, fontSize: Math.round(40 * k) + 'px', fontStyle: '700', color: CREAM }).setOrigin(0.5, 0));
        self.sizedTap(c); c.on('pointerup', fn); return c;
      };
      s.row = [
        choice('ic-play', 'Resume', function () { s.close(); }, true),
        choice('ic-retry', 'Restart', function () { s.close(); self.restart(); }),
        choice('ic-bot', 'Opponents', function () { s.close(true); self.ladder(true); }),
        choice(Kit.snd.muted ? 'ic-mute' : 'ic-snd', Kit.snd.muted ? 'Sound off' : 'Sound on', function () { Kit.snd.setMuted(!Kit.snd.muted); s.snd(); })
      ];
      s.how = s.put(this.tx(0, 0, '', 34 * k, '600', CREAM, { align: 'center', wordWrap: { width: 1100 } })).setAlpha(0.85);
      s.snd = function () { var m = Kit.snd.muted, c = s.row[3]; c.icon.setFrame(m ? 'ic-mute' : 'ic-snd'); c.lb.setText(m ? 'Sound off' : 'Sound on'); };
      s.layout = function (v) {
        var u = v.u, kk = self.ku(), cy = v.t + v.h / 2, w = 230 * kk, gap = 80, aw = v.sr - v.sl - 80, cols = aw >= 4 * w + 3 * gap ? 4 : 2, rows = Math.ceil(4 / cols), rowH = w + 40 * kk + 56;
        self.dimLay(s, v);
        s.exit.sc = 0.5 * u; s.exit.setScale(0.5 * u).setPosition(v.sl + GAP + 75 * u, v.st + GAP + 75 * u);
        var cx = (v.sl + v.sr) / 2, top0 = cy - (rows * rowH) / 2 + 40;
        s.title.setFontSize(Math.round(78 * kk)).setPosition(cx, top0 - 230 * kk); s.sub.setFontSize(Math.round(38 * kk)).setPosition(cx, top0 - 140 * kk);
        s.sub.setText(b.mode === 'ai' ? 'vs ' + b.opp.name + '  ·  Round ' + b.match.round : '2 Players  ·  Round ' + b.match.round);
        s.row.forEach(function (c, i) {
          var col = i % cols, row = (i / cols) | 0, n = Math.min(cols, 4 - row * cols), x0 = cx - ((n - 1) * (w + gap)) / 2;
          c.sc = w / 300 * (c.main ? 1.0 : 1); c.setScale(c.sc).setPosition(x0 + col * (w + gap), top0 + row * rowH + w / 2);
          c.lb.setFontSize(Math.round(Math.max(40 * kk, 17 * v.pt))).setPosition(c.x, c.y + w / 2 + 14 * kk);
        });
        s.how.setFontSize(Math.round(Math.max(34 * kk, 15 * v.pt))).setWordWrapWidth(Math.min(1100, v.sr - v.sl - 100))
          .setText(self.device === 'touch' ? C.how.touch : C.how.keys)
          .setPosition(cx, Math.min(v.sb - 60 * kk, top0 + rows * rowH + 60 * kk));
      };
      s.layout(this.v); this.fade(s);
    }
    restart() { var b = this.board(); b.startMatch(b.mode === '2p' ? '2p' : b.level); }

    /* ---------------------------------------------------------------- a round or match announced on a ribbon over the board */
    banner(text, sub, dur) {
      var L = this.L, v = this.v; if (!L || !v) return; var self = this, k = this.ku();
      if (this.ban) { this.tweens.killTweensOf(this.ban.list); this.ban.list.forEach(function (o) { o.destroy(); }); }
      var w = Math.min(L.S * 0.95, 980), sc = w / 512, x = L.cx, y = L.by + L.S / 2;
      var rib = this.add.image(0, 0, 'ui', 'ribbon').setScale(sc);
      var t = this.add.text(0, -w * 0.04, text, { fontFamily: F, fontSize: Math.round(Math.min(w * 0.115, 96) * 1) + 'px', fontStyle: '900', color: CREAM }).setOrigin(0.5);
      var st = this.add.text(0, w * 0.058, sub || '', { fontFamily: F, fontSize: Math.round(Math.min(w * 0.05, 44)) + 'px', fontStyle: '800', color: '#ffd98a' }).setOrigin(0.5);
      var tw = Math.max(t.width, st.width); if (tw > w * 0.78) { var f = w * 0.78 / tw; t.setScale(f); st.setScale(f); }
      var c = this.add.container(x, y, [rib, t, st]).setDepth(60).setScale(0);
      this.ban = { list: [c] };
      this.tweens.add({ targets: c, scale: 1, duration: 340, ease: 'Back.easeOut' });
      this.tweens.add({ targets: c, alpha: 0, scale: 0.85, delay: (dur || 1.6) * 1000 - 300, duration: 300, onComplete: function () { c.destroy(); if (self.ban && self.ban.list[0] === c) self.ban = null; } });
    }

    /* ---------------------------------------------------------------- the ladder of opponents */
    ladder(fromPause) {
      var self = this, b = this.board(), s = this.push('ladder'), k = this.ku(), P = b.progress, OPP = C.opponents;
      var over = b.phase === 'over' && !fromPause;
      while (this.stack.length > 1 && this.stack[0] !== s) { var o0 = this.stack[0]; if (o0 !== s) this.pop(o0, true); }
      s.panel = this.panel(s, 100, 100);
      s.title = s.put(this.tx(0, 0, 'Pick a friend', 64, '800'));
      s.x = s.put(this.round('ic-close', function () { s.close(); })); s.x.icon.setFrame('ic-close');
      s.onClose = function () { if (over && b.phase === 'over') self.restart(); else if (fromPause) self.openPause(); };
      s.rows = OPP.map(function (o, i) {
        var n = i + 1, open = P.unlocked(n), st = P.stars(n), c = s.put(self.add.container(0, 0)), items = [];
        c.bg = self.add.nineslice(0, 0, 'ui', 'row', 200, 200, 56, 56, 56, 56).setScale(0.5);
        if (b.mode === 'ai' && n === b.level) c.bg.setTint(0xf6c453);
        c.av = self.add.image(0, 0, 'rob', o.robot + (open ? '-idle' : '-lose')).setScale(0.72);
        c.nm = self.add.text(0, 0, o.name, { fontFamily: F, fontSize: '44px', fontStyle: '900', color: CREAM }).setOrigin(0, 0.5);
        c.lv = self.add.text(0, 0, { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[o.level] + (o.tag ? '  ·  ' + o.tag : ''), { fontFamily: F, fontSize: '30px', fontStyle: '700', color: { easy: '#8ff0a6', medium: '#ffd45e', hard: '#ff9a8a' }[o.level] }).setOrigin(0, 0.5);
        c.st = []; if (open) { for (var q = 0; q < 3; q++) c.st.push(self.add.image(0, 0, 'ui', 'pip').setTint(q < st ? GOLD_N : 0xffffff).setAlpha(q < st ? 1 : 0.25)); }
        else c.st.push(self.add.image(0, 0, 'ui', 'ic-lock').setAlpha(0.6));
        c.add([c.bg, c.av, c.nm, c.lv].concat(c.st)); c.n = n; c.open = open; c.sc = 1;
        c.setSize(300, 200);
        if (open) { c.setInteractive(); self.sizedTap(c); c.on('pointerup', function () { s.close(true); b.startMatch(n); self.release(); }); }
        else c.setAlpha(0.5);
        return c;
      });
      s.two = this.button(s, '2 Players', 'ic-two', function () { s.close(true); b.startMatch('2p'); self.release(); });
      s.layout = function (v) {
        var kk = self.ku(), aw = v.sr - v.sl - 60, ah = v.sb - v.st - 40, cols = aw >= 1500 ? 2 : 1, rowsN = Math.ceil(OPP.length / cols);
        var rowH = Math.min(176 * kk, (ah - 305 * kk) / rowsN), colW = Math.min(cols === 2 ? 740 : 1100, (aw - 100) / cols), pw = colW * cols + 90, ph = rowsN * rowH + 305 * kk;
        pw = Math.min(pw, aw); var cx = (v.sl + v.sr) / 2, cy = (v.st + v.sb) / 2; var top = cy - ph / 2;
        self.dimLay(s, v);
        s.panel.setSize(pw * 2, ph * 2).setPosition(cx, cy);
        s.title.setFontSize(Math.round(60 * kk)).setPosition(cx, top + 70 * kk);
        s.x.sc = 0.4 * kk; s.x.setScale(0.4 * kk).setPosition(cx + pw / 2 - 95 * kk, top + 80 * kk);
        s.rows.forEach(function (c, i) {
          var col = i % cols, row = (i / cols) | 0, x = cx + (col - (cols - 1) / 2) * (colW + 10), y = top + 150 * kk + row * rowH + rowH / 2, h = rowH - 12;
          c.setPosition(x, y); c.bg.setSize(colW * 2, h * 2); c.setSize(colW, h); if (c.input) c.input.hitArea.setSize(colW, h);
          var av = h / 2.1 / 80 * 1.0; c.av.setScale(Math.min(0.72, h * 0.46 / 80)).setPosition(-colW / 2 + h * 0.55, 0);
          var tx = -colW / 2 + h * 1.1; c.nm.setFontSize(Math.round(Math.min(44, h * 0.3))).setPosition(tx, -h * 0.17); c.lv.setFontSize(Math.round(Math.min(30, h * 0.2))).setPosition(tx, h * 0.18);
          var ps = Math.min(44, h * 0.3); c.st.forEach(function (im, q) { if (im.frame.name === 'pip') im.setScale(ps / 64).setPosition(colW / 2 - 30 - ps * (c.st.length - q - 0.5) * 1.1, 0); else im.setScale(ps / 90).setPosition(colW / 2 - 60, 0); });
          c.sc = 1;
        });
        var bw = Math.min(600 * kk, pw - 120), bh = 120 * kk; s.two.size(bw, bh); s.two.setPosition(cx, top + ph - 85 * kk);
      };
      s.layout(this.v); this.fade(s);
    }
    // after a screen hands over to a new match: the game wakes up if no screen is left
    release() { if (!this.stack.length && this.board().sys.settings.status === Phaser.Scenes.PAUSED) this.scene.resume('Board'); this.setHint(); this.setRound(); }

    /* ---------------------------------------------------------------- the match result */
    result(d) {
      var self = this, s = this.push('result'), k = this.ku(), b = this.board();
      s.panel = this.panel(s, 100, 100);
      s.title = s.put(this.tx(0, 0, d.title, 70, '900', CREAM, { align: 'center', wordWrap: { width: 900 } }));
      s.text = s.put(this.tx(0, 0, d.text || '', 38, '700', '#ffd98a', { align: 'center', wordWrap: { width: 900 } }));
      s.stars = []; if (d.stars) for (var i = 0; i < 3; i++) s.stars.push(s.put(this.add.image(0, 0, 'ui', 'pip').setTint(i < d.stars ? GOLD_N : 0xffffff).setAlpha(i < d.stars ? 1 : 0.25)));
      s.rob = d.robot ? s.put(this.add.image(0, 0, 'rob', d.robot + '-idle')) : null;
      s.btns = d.buttons.map(function (bt) { return self.button(s, bt.label, bt.icon, function () { s.close(true); bt.fn(); self.release(); }, bt.primary); });
      var prim = d.buttons.filter(function (x) { return x.primary; })[0]; s.primary = function () { s.close(true); prim.fn(); self.release(); };
      s.layout = function (v) {
        var kk = self.ku(), aw = v.sr - v.sl - 60, pw = Math.min(1100, aw), n = s.btns.length, bh = 120 * kk, gap = 26 * kk;
        var ph = (190 + (d.stars ? 130 : 0) + (s.rob ? 60 : 0)) * kk + n * (bh + gap) + 90 * kk, cx = (v.sl + v.sr) / 2, cy = (v.st + v.sb) / 2, top = cy - ph / 2;
        self.dimLay(s, v); s.panel.setSize(pw * 2, ph * 2).setPosition(cx, cy);
        s.title.setFontSize(Math.round(70 * kk)).setWordWrapWidth(pw - 120).setPosition(cx, top + 95 * kk);
        s.text.setFontSize(Math.round(38 * kk)).setWordWrapWidth(pw - 120).setPosition(cx, top + 95 * kk + s.title.height / 2 + 36 * kk);
        var y = top + (190 + 0) * kk + (s.title.height > 120 * kk ? 60 * kk : 0);
        if (d.stars) { var sp = 110 * kk; s.stars.forEach(function (im, q) { im.setScale(sp / 64 * 0.9).setPosition(cx + (q - 1) * sp * 1.15, y + 60 * kk); }); y += 130 * kk; }
        if (s.rob) { s.rob.setScale(0.5 * kk).setPosition(cx, y + 20 * kk); y += 60 * kk; }
        s.btns.forEach(function (c, q) { c.size(Math.min(720 * kk, pw - 100), bh); c.setPosition(cx, y + 40 * kk + q * (bh + gap) + bh / 2); });
      };
      s.layout(this.v); this.fade(s);
      this.setRound();
    }
  }
  window.BkHud = Hud;
})();
