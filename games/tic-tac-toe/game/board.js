/* Star & Flower Tic Tac Toe: the Board scene (the world: courtyard, board, stars and flowers, robots, effects, and the match flow).
   What the engine does here, and what stays game code:
   - drawing and layout: images in the 1920 x 1080 design space of Kit.play.fit, anchored to the safe area; the courtyard,
     board and discs are pictures painted once (art.js) and only moved, scaled and tinted after that;
   - every move, hop, squash, pop, fade and fly-in is a tween (this.tweens); every wait is a timer (this.time.delayedCall);
     dust, sparks and confetti are particle emitters; the shake is the camera's;
   - taps, drags and keys are the engine's input (scene pointer events, camera.getWorldPoint, addKeys);
   - sound goes through Kit.snd (Phaser's sound system underneath).
   Game code (nothing in Phaser does it): the rules and the computer opponent (rules.js), best-of-three matches with 1 to 3
   stars, the ladder of opponents, whose turn it is, and "which squares are free". A new star or flower is drawn in: its
   outline pops in, then the colour washes in (tweens), and a glowing bar is drawn through a winning three.
   Turn-based, so the loop sleeps while nothing moves (Kit.play.start({ rest: true })): there is no idle animation here;
   every motion is a tween that ends.
   The interface (pause button, pause screen, ladder, banners, results) is the Hud scene (hud.js) above this one. */
(function () {
  'use strict';
  var C = window.BkCfg, A = window.BkArt, R = C.rules, TAU = Math.PI * 2;
  var COUNT = C.opponents.length, WIN_NEED = 2;
  var tmp = new Phaser.Math.Vector2();

  class Board extends Phaser.Scene {
    constructor() { super({ key: 'Board' }); }

    create() {
      var self = this;
      this.store = Kit.store(C.storeKey); this.progress = Kit.progress(this.store, COUNT);
      this.mode = 'ai'; this.level = 1; this.opp = C.opponents[0]; this.match = null; this.S = null;
      this.pcs = {}; this.sel = null; this.phase = 'intro'; this.drag = null; this.aiQueue = []; this.aiSel = null;
      this.lastMove = null; this.winFx = []; this.hinted = !!this.store.get('hinted', false);
      this.L = null; this.ps = null; this.robState = 'idle'; this.focus = { r: 1, c: 1 };
      this.device = this.registry.get('device') || 'touch';

      // ---- the world, back to front ----
      this.bgI = this.add.image(0, 0, 'ui', 'dot').setOrigin(0).setDepth(0);
      this.boardI = this.add.image(0, 0, 'ui', 'dot').setOrigin(0).setDepth(1);
      this.hi = {                                                       // highlights, made once and reused
        trail: [this.add.image(0, 0, 'ui', 'hi').setTint(0xffe28c).setAlpha(0.22).setVisible(false).setDepth(2), this.add.image(0, 0, 'ui', 'hi').setTint(0xffe28c).setAlpha(0.22).setVisible(false).setDepth(2)],
        sel: this.add.image(0, 0, 'ui', 'glow').setTint(0xffe68c).setAlpha(0.7).setVisible(false).setDepth(3),
        marks: [], rings: [], capRings: [],
        ai: this.add.image(0, 0, 'ui', 'ring').setVisible(false).setDepth(9),
        focus: this.add.image(0, 0, 'ui', 'focus').setVisible(false).setDepth(12)
      };
      this.makeBadges();
      this.tray = [0, 1].map(function (s) { return { dish: self.add.image(0, 0, 'ui', 'dot').setDepth(6), ring: self.add.image(0, 0, 'ui', 'ring').setTint(0xffd36b).setAlpha(0).setDepth(7), pc: self.add.image(0, 0, 'ui', 'dot').setDepth(8) }; });
      this.ghost = this.add.image(0, 0, 'ui', 'dot').setDepth(12).setVisible(false);
      this.hoverMark = this.add.image(0, 0, 'ui', 'mark').setTint(0xfff8e1).setDepth(4).setVisible(false);
      this.pal = [0xffd36b, 0xfff4c4, 0xffffff];
      this.fxStar = this.add.particles(0, 0, 'ui', { frame: ['star8', 'spark'], lifespan: { min: 500, max: 950 }, speed: { min: 80, max: 300 }, scale: { start: 0.5, end: 0 }, gravityY: 300, tint: { onEmit: function () { return self.pal[(Math.random() * self.pal.length) | 0]; } }, emitting: false }).setDepth(20);
      this.fxDust = this.add.particles(0, 0, 'ui', { frame: 'dot', lifespan: { min: 250, max: 420 }, speed: { min: 30, max: 110 }, scale: { start: 0.35, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: 0xfff0d2, emitting: false }).setDepth(19);

      // ---- input: the engine's pointer and keyboard ----
      this.input.dragDistanceThreshold = 9;
      this.input.on('pointerdown', this.onDown, this);
      this.input.on('pointermove', this.onMove, this);
      this.input.on('pointerup', this.onUp, this);
      this.input.on('pointerupoutside', this.onUp, this);
      var K = this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,SPACE,ENTER,W,A,S,D');
      ['LEFT', 'A'].forEach(function (k) { K[k].on('down', function () { self.moveFocus(-1, 0); }); });
      ['RIGHT', 'D'].forEach(function (k) { K[k].on('down', function () { self.moveFocus(1, 0); }); });
      ['UP', 'W'].forEach(function (k) { K[k].on('down', function () { self.moveFocus(0, -1); }); });
      ['DOWN', 'S'].forEach(function (k) { K[k].on('down', function () { self.moveFocus(0, 1); }); });
      ['SPACE', 'ENTER'].forEach(function (k) { K[k].on('down', function () { self.keyTap(); }); });
      this.input.keyboard.on('keydown', function () { self.setDevice('keys'); });
      this.input.on('pointerdown', function (p) { if (p.wasTouch || p.pointerType) self.setDevice('touch'); });

      Kit.play.fit(this, function (v) { self.layout(v); }, { w: 1280 });
      this.game.events.on('bk-device', this.setDevice, this);
      this.events.once('shutdown', function () { self.game.events.off('bk-device', self.setDevice, self); });
      this.startMatch(Q.has('mode') && Q.get('mode') === '2p' ? '2p' : Q.has('opp') ? +Q.get('opp') : this.progress.current());
      this.events.emit('ready');
      if (Kit.load) Kit.load.done();
    }

    get hud() { return this.scene.get('Hud'); }
    after(sec, fn) { return this.time.delayedCall(sec * 1000, fn, null, this); }
    isHuman(side) { return this.mode === '2p' || side === 0; }
    curN() { return this.S ? R.n(this.S) : (this.opp.n || C.n || 8); }
    snd(n, o) { Kit.snd.play(n, o); }

    setDevice(d) {
      if (d === this.device) return;
      this.device = d; this.registry.set('device', d); this.game.events.emit('bk-device-changed', d);
      this.hi.focus.setVisible(d === 'keys' && this.phase === 'play');
      this.placeFocus();
    }

    /* ---------------------------------------------------------------- layout */
    layout(v) {
      v.u = 52 * v.pt / 150;                                   // Tic Tac Toe's own size: a 150-unit button is 52 screen points on every screen
      this.v = v;
      var u = v.u, port = v.h > v.w * 1.05, n = this.curN(), PAD = 36;
      var left = v.sl + 20, right = v.sr - 20, top = v.st + 20, bottom = v.sb - 20, aw = right - left, ah = bottom - top;
      var L = { n: n, portrait: port }, rb = port ? 130 : 84,          // (upright: big badges above and below the board, as the old game)
         hint = 96 * Math.min(u, 1.4) + 36, S, bx, by;
      if (port) {
        var strip = 150 * u + PAD * 2, bh = Math.max(210 + 40 * Math.min(u, 1.3), 2 * rb + 40);
        S = Math.min(aw, 1240, ah - strip - 2 * bh - hint);
        var block = strip + 2 * bh + S + hint, y0 = top + Math.max(0, (ah - block) / 2);
        bx = left + (aw - S) / 2; by = y0 + strip + bh;
        L.badge = [{ x: bx + rb + 12, y: by + S + hint + bh / 2 }, { x: bx + rb + 12, y: by - bh / 2 }];
        L.round = { x: v.sl + PAD + 150 * u + PAD, y: v.st + PAD + 75 * u, side: 'right' };
        L.hintY = by + S + hint / 2;
        L.trayR = 115; L.tray = [{ x: bx + S - L.trayR - 20, y: L.badge[0].y }, { x: bx + S - L.trayR - 20, y: L.badge[1].y }];
      } else {
        var side = 270;
        S = Math.min(ah - hint, aw - side * 2, 1060);
        bx = left + (aw - S) / 2; by = top + (ah - hint - S) / 2 + 4;
        var cl = (left + bx) / 2, cr = (right + bx + S) / 2;
        L.badge = [{ x: cr, y: by + S * 0.68 }, { x: cl, y: by + S * 0.32 }];
        L.trayR = 78; L.tray = [{ x: cr, y: by + S * 0.30 }, { x: cl, y: by + S * 0.70 }];
        L.round = { x: cr, y: v.st + PAD + 75 * u, side: 'center', avail: 2 * Math.min(cr - (bx + S), v.sr - cr) - 24 };
        L.hintY = by + S + hint / 2;
      }
      L.rb = rb; L.cx = bx + S / 2;
      // the board and the discs are pictures at a fixed size (baked art), shown scaled to this screen
      var b = A.boardTex(this, C.boardStyle, C.theme, n), k = S / b.S;
      L.S = S; L.frame = b.frame * k; L.cell = b.cell * k; L.bx = bx; L.by = by;
      L.fx0 = L.bx + L.frame; L.fy0 = L.by + L.frame;
      this.L = L;
      this.boardI.setTexture(b.key).setPosition(L.bx - b.pad * k, L.by - b.pad * k).setDisplaySize(b.w * k, b.h * k);
      var bg = A.bg(this, port, C.theme), sb = Math.max(v.w / bg.w, v.h / bg.h);
      this.bgI.setTexture(bg.key).setOrigin(0.5).setPosition(v.l + v.w / 2, v.t + v.h / 2).setDisplaySize(bg.w * sb, bg.h * sb);
      var P = A.pieceSheet(this, C.fixedCell, C.paint, C.dims, C.names), kp = L.cell / C.fixedCell, fr = {};
      Object.keys(P.frames).forEach(function (nm) { var q = nm.indexOf('dish') === 0 ? 1 : kp; fr[nm] = { w: P.frames[nm].w * q, h: P.frames[nm].h * q }; });
      this.ps = { key: P.key, frames: fr };
      Object.keys(this.pcs).forEach(function (id) { this.skin(this.pcs[id]); this.putAt(this.pcs[id]); }, this);
      this.layBadges(); this.layTray();
      this.hilite();
      this.placeFocus();
      this.game.events.emit('bk-layout', L, v);
    }
    cellXY(c, r) { var L = this.L; return { x: L.fx0 + (c + 0.5) * L.cell, y: L.fy0 + (r + 0.5) * L.cell }; }
    cellAt(x, y) {
      var L = this.L, c = Math.floor((x - L.fx0) / L.cell), r = Math.floor((y - L.fy0) / L.cell);
      return r >= 0 && c >= 0 && r < L.n && c < L.n ? { r: r, c: c } : null;
    }

    /* ---------------------------------------------------------------- the badges (who is playing) */
    makeBadges() {
      var self = this;
      this.bd = [0, 1].map(function (s) {
        var o = { s: s };
        o.glow = self.add.image(0, 0, 'ui', 'glow').setTint(0xffd36b).setAlpha(0).setDepth(6);
        o.disc = self.add.image(0, 0, 'ui', 'dot').setTint(0x24124a).setDepth(7);
        o.rob = self.add.image(0, 0, 'rob', C.opponents[0].robot + '-idle').setDepth(7);
        o.pc = self.add.image(0, 0, 'ui', 'dot').setDepth(8);
        o.ring = self.add.image(0, 0, 'ui', 'ring').setTint(C.colors[s][0] === undefined ? 0xffd36b : Phaser.Display.Color.HexStringToColor(C.colors[s][0]).color).setDepth(8);
        o.name = self.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '40px', fontStyle: '800', color: A.CREAM, stroke: '#0f0823', strokeThickness: 7 }).setDepth(8);
        o.pips = [0, 1].map(function () { return self.add.image(0, 0, 'ui', 'pip').setDepth(8); });
        o.dots = [0, 1, 2].map(function () { return self.add.image(0, 0, 'ui', 'dot').setTint(0x5b3f8c).setDepth(11).setVisible(false); });
        o.bubble = self.add.image(0, 0, 'ui', 'bubble').setDepth(10).setVisible(false);
        return o;
      });
    }
    layBadges() {
      var L = this.L, v = this.v, self = this, tf = Math.min(v.u, 1.35);
      this.bd.forEach(function (o, s) {
        var b = L.badge[s], r = L.rb, robot = self.mode === 'ai' && s === 1;
        o.at = b;
        o.glow.setPosition(b.x, b.y).setScale(r * 3.6 / 256);
        o.disc.setPosition(b.x, b.y).setScale(r * 2 / 32).setVisible(!robot);
        o.rob.setPosition(b.x, b.y).setScale(r / 80).setVisible(robot);
        var f = self.ps && self.ps.frames[C.frameOf(s, false)];
        o.pc.setVisible(!robot && !!f);
        if (f) { var k = (r * 1.5) / Math.max(f.w, L.cell * 0.9); o.pc.setTexture(self.ps.key, C.frameOf(s, false)).setPosition(b.x, b.y).setDisplaySize(f.w * k, f.h * k); }
        o.ring.setPosition(b.x, b.y).setScale(r * 2.1 / 256).setVisible(!robot);
        var fs = Math.round(Math.max(40 * tf, 17 * v.pt));                // (a name is never under 17 points)
        o.name.setFontSize(fs).setStroke('#0f0823', Math.round(fs * 0.2));
        var px = 36 * tf;
        if (L.portrait) {
          o.name.setOrigin(0, 0.5).setPosition(b.x + r * 1.4, b.y - fs * 0.5);
          o.pips.forEach(function (p, i) { p.setPosition(b.x + r * 1.4 + px / 2 + i * px * 1.5, b.y + fs * 0.75).setScale(px / 64); });
        } else {
          o.name.setOrigin(0.5, 0.5).setPosition(b.x, b.y + r * 1.25 + fs * 0.6);
          o.pips.forEach(function (p, i) { p.setPosition(b.x + (i - 0.5) * px * 1.6, b.y + r * 1.25 + fs * 1.55).setScale(px / 64); });
        }
        var bub = L.portrait ? { x: b.x + r * 1.2, y: b.y - r * 1.25 } : { x: b.x + r * 1.15, y: b.y - r * 1.15 };
        o.bubble.setPosition(bub.x, bub.y).setScale(r * 1.6 / 160);
        o.dots.forEach(function (d, i) { d.setPosition(bub.x - r * 0.4 + i * r * 0.4, bub.y - r * 0.16).setScale(r * 0.22 / 32); });
      });
      this.updateBadges();
    }
    updateBadges() {
      var m = this.match, self = this;
      this.bd.forEach(function (o, s) {
        var robot = self.mode === 'ai' && s === 1;
        o.name.setText(self.mode === '2p' ? 'Player ' + (s + 1) : s === 1 ? self.opp.name : 'You');
        if (robot) o.rob.setFrame(self.opp.robot + '-' + self.robState);
        o.rob.setVisible(robot); o.disc.setVisible(!robot); o.ring.setVisible(!robot); o.pc.setVisible(!robot && !!(self.ps && self.ps.frames[C.frameOf(s, false)]));
        o.pips.forEach(function (p, i) { var on = m && m.wins[s] > i; p.setTint(on ? 0xf6c453 : 0xffffff).setAlpha(on ? 1 : 0.28); });
      });
      this.updateTurn();
    }
    updateTurn() {
      var S = this.S, turn = S ? R.turn(S) : 0, live = this.phase === 'play' || this.phase === 'ai' || this.phase === 'anim';
      this.bd.forEach(function (o, s) { o.glow.setAlpha(live && turn === s ? 0.85 : 0); });
      this.updateTray();
    }
    setRobot(state, dur) {
      var o = this.bd[1], self = this;
      if (this.robTimer) { this.robTimer.remove(); this.robTimer = null; }
      this.robState = state; if (this.mode === 'ai') o.rob.setFrame(this.opp.robot + '-' + state);
      this.tweens.killTweensOf(o.rob); o.rob.setAngle(0).setY(o.at.y);
      this.showThink(state === 'think');
      if (this.mode !== 'ai') return;
      var r = this.L.rb;
      if (state === 'win') this.tweens.add({ targets: o.rob, y: o.at.y - r * 0.22, duration: 160, yoyo: true, repeat: 4, ease: 'Sine.easeOut' });
      else if (state === 'lose') this.tweens.add({ targets: o.rob, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 5 });
      else if (state === 'think') this.tweens.add({ targets: o.rob, angle: 8, duration: 380, ease: 'Sine.easeOut' });
      if (state !== 'idle' && state !== 'think') this.robTimer = this.after(dur || 1.4, function () { self.robTimer = null; self.setRobot('idle'); });
    }
    robotHit() {
      if (this.mode !== 'ai') return;
      var o = this.bd[1]; this.tweens.killTweensOf(o.rob);
      this.tweens.add({ targets: o.rob, x: { from: o.at.x - 10, to: o.at.x + 10 }, duration: 45, yoyo: true, repeat: 3, onComplete: function () { o.rob.x = o.at.x; } });
    }
    showThink(on) {
      var o = this.bd[1];
      o.bubble.setVisible(on && this.mode === 'ai'); o.dots.forEach(function (d) { d.setVisible(on && this.mode === 'ai'); this.tweens.killTweensOf(d); d.y = o.bubble.y - this.L.rb * 0.16; }, this);
      if (on && this.mode === 'ai') o.dots.forEach(function (d, i) { this.tweens.add({ targets: d, y: d.y - this.L.rb * 0.16, duration: 260, yoyo: true, repeat: -1, delay: i * 130 }); }, this);
    }
    bump(s) {
      var o = this.bd[s], at = o.at; if (!at) return;
      var t = s === 1 && this.mode === 'ai' ? o.rob : o.disc;
      this.tweens.add({ targets: [o.pc, o.ring, o.disc].concat(s === 1 && this.mode === 'ai' ? [o.rob] : []), scale: '*=1.12', duration: 130, yoyo: true, ease: 'Sine.easeOut' });
    }

    /* ---------------------------------------------------------------- the dishes the stars and flowers wait in */
    layTray() {
      var L = this.L, self = this;
      this.tray.forEach(function (o, s) {
        var t = L.tray[s], d = self.ps.frames['dish' + s], f = self.ps.frames[C.frameOf(s)], k = L.trayR * 1.55 / f.w;
        o.dish.setTexture(self.ps.key, 'dish' + s).setPosition(t.x, t.y + 4).setDisplaySize(d.w, d.h);
        o.ring.setPosition(t.x, t.y).setScale(L.trayR * 2.3 / 256);
        o.pc.setTexture(self.ps.key, C.frameOf(s)).setPosition(t.x, t.y).setDisplaySize(f.w * k, f.h * k);
      });
      this.updateTray();
    }
    updateTray() {
      var S = this.S, turn = S ? R.turn(S) : 0, self = this;
      this.tray.forEach(function (o, s) {
        var on = self.phase === 'play' && turn === s && self.isHuman(s);
        o.ring.setAlpha(on ? 0.9 : 0); o.pc.setAlpha(self.drag && self.drag.moved && self.drag.key === 'tray' && turn === s ? 0.45 : on || !S ? 1 : 0.75);
      });
    }

    /* ---------------------------------------------------------------- the pieces */
    skin(pc) {
      var f = this.ps.frames[C.frameOf(pc.side, pc.king)], L = this.L;
      pc.body.setTexture(this.ps.key, C.frameOf(pc.side, pc.king)).setDisplaySize(f.w, f.h);
      pc.body.bx = pc.body.scaleX; pc.body.by0 = pc.body.scaleY;
      pc.sh.setVisible(false);
      pc.flash.setScale(L.cell * 1.7 / 256);
    }
    putAt(pc) { var p = this.cellXY(pc.c, pc.r); pc.o.setPosition(p.x, p.y); pc.body.y = pc.lifted ? -this.L.cell * 0.1 : 0; }
    newPiece(p) {
      var o = this.add.container(0, 0).setDepth(5);
      var pc = { id: p.id, side: p.side, king: !!p.king, r: p.r, c: p.c, o: o };
      pc.sh = this.add.image(0, 0, 'ui', 'shadow'); pc.body = this.add.image(0, 0, this.ps.key, C.frameOf(p.side, !!p.king));
      pc.flash = this.add.image(0, 0, 'ui', 'glow').setTint(0xfff6cf).setAlpha(0).setVisible(false);
      o.add([pc.sh, pc.body, pc.flash]); this.pcs[p.id] = pc; this.skin(pc); this.putAt(pc);
      return pc;
    }
    pieceAtCell(cell) { for (var id in this.pcs) { var pc = this.pcs[id]; if (pc.r === cell.r && pc.c === cell.c) return pc; } return null; }
    lift(pc, on) {
      if (!pc || pc.lifted === on) return; pc.lifted = on;
      var L = this.L; this.tweens.killTweensOf(pc.body);
      this.tweens.add({ targets: pc.body, y: on ? -L.cell * 0.1 : 0, scaleX: pc.body.bx * (on ? 1.08 : 1), scaleY: pc.body.by0 * (on ? 1.08 : 1), duration: 90, ease: 'Sine.easeOut' });
    }
    squash(pc) {
      var b = pc.body; this.tweens.killTweensOf(b);
      b.setScale(b.bx * 1.14, b.by0 * 0.86);
      this.tweens.add({ targets: b, scaleX: b.bx, scaleY: b.by0, duration: 260, ease: 'Back.easeOut' });
    }
    wiggle(pc) {
      this.snd('wiggle'); var o = pc.o, p = this.cellXY(pc.c, pc.r); this.tweens.killTweensOf(o);
      this.tweens.add({ targets: o, x: { from: p.x - this.L.cell * 0.06, to: p.x + this.L.cell * 0.06 }, duration: 40, yoyo: true, repeat: 4, onComplete: function () { o.x = p.x; } });
    }

    /* ---------------------------------------------------------------- effects */
    burst(kind, x, y, n, o) {
      var L = this.L, c = L.cell, e = kind === 'dust' ? this.fxDust : this.fxStar;
      o = o || {};
      e.setParticleSpeed(c * (o.v0 || 0.8), c * (o.v1 || 2.8));
      e.setParticleScale(c * (o.s || 0.0042) , 0);
      if (kind !== 'dust') { this.pal = o.tint || [0xffd36b, 0xfff4c4, 0xffffff]; e.setParticleGravity(0, c * (o.g == null ? 3 : o.g)); e.setParticleLifespan(o.life || 800); }
      e.explode(n, x, y);
    }
    floatText(text, x, y, color, size) {
      var t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: Math.round(size || this.L.cell * 0.45) + 'px', fontStyle: '900', color: color || '#fff2b0', stroke: '#3c1e00', strokeThickness: Math.round((size || this.L.cell * 0.45) * 0.18) }).setOrigin(0.5).setDepth(21);
      this.tweens.add({ targets: t, y: y - this.L.cell * 0.55, alpha: { from: 1, to: 0 }, duration: 1100, ease: 'Sine.easeOut', onComplete: function () { t.destroy(); } });
    }
    confetti() {
      var L = this.L, self = this;
      for (var i = 0; i < 5; i++) this.after(i * 0.14, function () {
        self.burst('star', L.bx + L.S * (0.15 + Math.random() * 0.7), L.by + L.S * (0.15 + Math.random() * 0.5), 18, { v0: 1.2, v1: 4.2, s: 0.0055, g: 4.5, life: 1300, tint: [0xffd36b, 0xff8fab, 0x7ae7ff, 0xffffff, 0x9ef0a8] });
      });
    }
    robotSparkle() { var b = this.bd[1].at; if (this.mode === 'ai' && b) this.burst('star', b.x, b.y, 14, { v0: 0.6, v1: 2, s: 0.004 }); }

    /* ---------------------------------------------------------------- highlights (static; nothing pulses) */
    pool(list, frame, depth) { var im = this.add.image(0, 0, 'ui', frame).setDepth(depth).setVisible(false); list.push(im); return im; }
    hilite() {
      var L = this.L, S = this.S, hi = this.hi, self = this, k = 0, kr = 0, kc = 0;
      hi.marks.forEach(function (m) { m.setVisible(false); }); hi.rings.forEach(function (m) { m.setVisible(false); }); hi.capRings.forEach(function (m) { m.setVisible(false); });
      hi.sel.setVisible(false); hi.trail.forEach(function (t) { t.setVisible(false); });
      if (this.lastMove && this.lastMove.to) {
        var tl = [this.lastMove.from, this.lastMove.to];
        tl.forEach(function (c, i) { if (!c) return; var p = self.cellXY(c[1], c[0]); hi.trail[i].setPosition(p.x, p.y).setDisplaySize(L.cell * 0.92, L.cell * 0.92).setVisible(true); });
      }
      if (!S || this.phase !== 'play' || !this.isHuman(R.turn(S))) return;
      var srcs = R.sources(S), forced = R.forced && R.forced(S);
      if (forced) srcs.forEach(function (s) {
        if (s.key === this.sel) return; var p = this.cellXY(s.c, s.r), im = hi.rings[kr++] || this.pool(hi.rings, 'ring', 4);
        im.setTint(0xffd36b).setAlpha(0.95).setPosition(p.x, p.y).setScale(L.cell * 1.0 / 256).setVisible(true);
      }, this);
      if (this.sel != null) {                                            // the free squares glow softly while it is your turn
        (R.targets(S, this.sel) || []).forEach(function (t) {
          var p = self.cellXY(t.c, t.r), m = hi.marks[k++] || self.pool(hi.marks, 'glow', 3);
          self.tweens.killTweensOf(m);
          m.setFrame('glow').setTint(0xffe278).setAlpha(0.5).setPosition(p.x, p.y).setScale(L.cell * 0.9 / 256).setVisible(true);
          self.tweens.add({ targets: m, scale: { from: L.cell * 0.4 / 256, to: L.cell * 0.9 / 256 }, duration: 200, ease: 'Back.easeOut' });
        });
      }
    }
    select(key) {
      if (this.sel === key) return;
      var old = this.pcs[this.sel]; if (old) this.lift(old, false);
      this.sel = key; var pc = this.pcs[key]; if (pc) this.lift(pc, true);
      this.hilite();
    }
    deselect() { this.select(null); }

    /* ---------------------------------------------------------------- the match */
    startMatch(lv) {
      this.time.removeAllEvents(); this.tweens.killAll();
      if (lv === '2p') { this.mode = '2p'; this.opp = C.opponents[Math.min(COUNT, this.progress.current()) - 1]; }
      else { this.mode = 'ai'; this.level = Phaser.Math.Clamp(lv, 1, COUNT); this.opp = C.opponents[this.level - 1]; this.progress.setCurrent(this.level); }
      this.match = { round: 1, wins: [0, 0], draws: 0, lost: 0 };
      this.robState = 'idle';
      this.startRound();
      this.game.events.emit('bk-match', this);
    }
    startRound() {
      var m = this.match, first = (m.round - 1) % 2, self = this;
      this.time.removeAllEvents();
      this.S = R.newGame({ n: this.opp.n || C.n, first: first });
      if (R.n(this.S) !== this.L.n) this.layout(this.v);
      this.clearFx();
      Object.keys(this.pcs).forEach(function (id) { self.pcs[id].o.destroy(); }); this.pcs = {};
      this.sel = null; this.drag = null; this.aiQueue = []; this.aiSel = null; this.lastMove = null;
      this.phase = 'intro';
      var L = this.L, ps = R.pieces(this.S);
      ps.forEach(function (p) {
        var pc = self.newPiece(p), d = (p.side ? p.r : L.n - 1 - p.r) * 70 + p.c * 25 + 50;
        pc.o.setAlpha(0); pc.body.setScale(0);
        self.tweens.add({ targets: pc.o, alpha: 1, duration: 120, delay: d });
        self.tweens.add({ targets: pc.body, scaleX: pc.body.bx, scaleY: pc.body.by0, duration: 380, ease: 'Back.easeOut', delay: d });
      });
      this.updateBadges(); this.hilite();
      this.hud.banner('Round ' + m.round, this.mode === 'ai' ? (m.round === 1 ? 'vs ' + this.opp.name : first ? this.opp.name + ' goes first' : 'You go first') : (first ? 'Player 2 goes first' : 'Player 1 goes first'), 1.15);
      this.snd('roundStart'); Kit.snd.amb('amb-court', { fade: 2 });   // an evening breeze in the moonlit courtyard, very low
      this.game.events.emit('bk-round', this);
      this.after(1.1, this.beginTurn);
    }
    clearFx() { this.winFx.forEach(function (o) { o.destroy(); }); this.winFx = []; }
    beginTurn() {
      var S = this.S, res = R.result(S);
      if (res) { this.roundEnd(res); return; }
      var turn = R.turn(S);
      this.updateTurn();
      if (!this.isHuman(turn)) { this.phase = 'ai'; this.updateTurn(); if (this.aiQueue.length) this.after(0.2, this.aiNext); else this.scheduleAI(); return; }
      this.aiQueue = []; this.phase = 'play';
      var srcs = R.sources(S);
      this.sel = null; this.select(srcs.length === 1 ? srcs[0].key : null);
      this.hilite(); this.updateTurn();
      this.hi.focus.setVisible(this.device === 'keys'); this.placeFocus(true);
    }
    scheduleAI() {
      var self = this; this.phase = 'ai';
      this.setRobot('think'); this.snd('robotThink'); this.hilite();
      var delay = 0.55 + Math.random() * 0.5 + (this.opp.level === 'hard' ? 0.3 : 0);
      this.after(delay, function () {
        self.aiQueue = (R.ai(self.S, self.opp.level, self.opp) || []).slice();
        self.setRobot('idle'); self.aiNext();
      });
    }
    aiNext() {
      var self = this, m = this.aiQueue.shift();
      if (!m) { this.roundEnd({ winner: 0 }); return; }                 // no move found: the opponent cannot move, so it loses
      this.aiSel = R.moveFrom(m); var pc = this.pcs[this.aiSel];
      if (pc) { var p = this.cellXY(pc.c, pc.r); this.hi.ai.setTint(0xffffff).setAlpha(0.9).setPosition(p.x, p.y).setScale(this.L.cell * 0.96 / 256).setVisible(true); this.lift(pc, true); }
      this.after(0.34, function () { self.hi.ai.setVisible(false); if (pc) self.lift(pc, false); self.aiSel = null; self.doMove(m); });
    }

    doMove(move, opts) {
      opts = opts || {};
      var S = this.S, mover = R.turn(S), before = {}, self = this, L = this.L;
      R.pieces(S).forEach(function (p) { before[p.id] = p; });
      var info = R.apply(S, move) || {}, seen = {}, dur = 0.12;
      this.phase = 'anim'; this.sel = null; this.hilite(); this.updateTurn(); this.hi.focus.setVisible(false);
      R.pieces(S).forEach(function (p) {
        seen[p.id] = 1;
        var pc = self.pcs[p.id], b = before[p.id];
        if (!pc) { pc = self.placeNew(p, opts); dur = Math.max(dur, opts.drop ? 0.2 : 0.62); return; }
        if (b && (b.r !== p.r || b.c !== p.c)) {
          var to = self.cellXY(p.c, p.r), o = pc.o, dist = Math.hypot(to.x - o.x, to.y - o.y) / L.cell;
          var dd = opts.drop ? 0.14 : 0.24 + dist * 0.08, hop = info.capture && !opts.drop;
          self.tweens.killTweensOf(o); self.lift(pc, false);
          self.tweens.add({ targets: o, x: to.x, y: to.y, duration: dd * 1000, ease: 'Sine.easeInOut', onComplete: function () { self.land(pc, hop); } });
          if (hop) self.tweens.add({ targets: pc.body, y: -L.cell * 0.45, duration: dd * 500, yoyo: true, ease: 'Sine.easeOut' });
          if (hop) pc.o.setDepth(7); else pc.o.setDepth(6);
          dur = Math.max(dur, dd);
        }
        pc.r = p.r; pc.c = p.c;
      });
      this.lastMove = info.to ? { from: info.from, to: info.to } : null;
      if (info.place) this.snd(opts.drop ? 'place' : 'trace'); else this.snd(info.capture ? 'hop' : 'slide', { vol: opts.drop ? 0.7 : 1 });
      if (this.isHuman(mover)) { if (this.mode === 'ai' && !this.hinted) { this.hinted = true; this.store.set('hinted', true); } this.game.events.emit('bk-hint', false); }
      if (info.capture && this.mode === 'ai') { if (mover === 0) { this.robotHit(); } else this.setRobot('win', 1.2); }
      this.after(dur + 0.06, function () { self.hilite(); self.beginTurn(); });
      return info;
    }
    // a new star or flower: dropped from where the finger let go, or drawn in (its outline pops in, then the colour washes in)
    placeNew(p, opts) {
      var self = this, L = this.L, to = this.cellXY(p.c, p.r), pc = this.newPiece(p), f = this.ps.frames[C.frameOf(p.side)], bs = pc.body.bx;
      if (opts.from) {
        pc.o.setPosition(opts.from.x, opts.from.y);
        this.tweens.add({ targets: pc.o, x: to.x, y: to.y, duration: 140, ease: 'Sine.easeOut', onComplete: function () { self.snd('place', { vol: 0.9 }); self.squash(pc); self.burst('star', to.x, to.y, 8, { v0: 0.6, v1: 2, s: 0.0035, g: 2 }); } });
        return pc;
      }
      pc.body.setAlpha(0).setScale(bs * 0.6);
      var ol = this.add.image(to.x, to.y, this.ps.key, 'o' + p.side).setDisplaySize(f.w, f.h).setDepth(6).setAlpha(0), os = ol.scaleX;
      ol.setScale(os * 0.55); this.winFx.push(ol);
      this.tweens.add({ targets: ol, alpha: 1, scale: os, angle: { from: -10, to: 0 }, duration: 220, ease: 'Back.easeOut' });
      this.after(0.24, function () {
        self.tweens.add({ targets: ol, alpha: 0, duration: 260 });
        pc.body.setAlpha(0);
        self.tweens.add({ targets: pc.body, alpha: 1, scaleX: bs, scaleY: pc.body.by0, duration: 380, ease: 'Back.easeOut', onComplete: function () { ol.destroy(); } });
        self.after(0.1, function () { self.snd('place'); Kit.buzz(8); self.burst('star', to.x, to.y, 10, { v0: 0.7, v1: 2.4, s: 0.004, g: 2.5, tint: [Phaser.Display.Color.HexStringToColor(C.colors[p.side][0]).color, 0xffffff] }); });
      });
      return pc;
    }
    land(pc, hop) {
      var L = this.L, p = this.cellXY(pc.c, pc.r); pc.o.setDepth(5);
      this.snd('land', { vol: hop ? 1 : 0.85 }); Kit.buzz(8); this.squash(pc);
      this.burst('dust', p.x, p.y + L.cell * 0.25, 6, { v0: 0.4, v1: 1.1, s: 0.0035 });
    }

    roundEnd(res) {
      var m = this.match, w = res.winner, title, sub = '', self = this;
      this.phase = 'roundEnd'; this.drag = null; this.aiQueue = []; this.sel = null; this.hilite(); this.updateTurn(); this.hi.focus.setVisible(false);
      if (w === null || w === undefined) {
        w = null;
        if (this.mode === 'ai' && this.opp.drawIsWin) { m.wins[0]++; title = 'A draw counts!'; sub = this.opp.name + ' is a master!'; }
        else { m.draws++; title = 'Draw!'; sub = 'Nobody wins this one'; }
        this.snd('roundDraw'); this.setRobot('idle');
      } else {
        m.wins[w]++;
        if (this.mode === 'ai' && w === 1) m.lost++;
        if (this.mode === '2p') title = 'Player ' + (w + 1) + ' wins!'; else title = w === 0 ? 'You win!' : this.opp.name + ' wins';
        if (this.mode === 'ai') sub = w === 0 ? 'Round ' + m.round : 'Good try!';
        if (this.mode === 'ai' && w === 1) { this.snd('roundLose'); this.after(0.25, function () { self.snd('robotWin'); }); this.setRobot('win', 2.4); this.robotSparkle(); }
        else { this.snd('roundWin'); this.confetti(); if (this.mode === 'ai') { this.setRobot('lose', 2.4); } }
        this.bump(w);
      }
      if (res.line) this.winLine(res.line);
      this.updateBadges();
      this.hud.banner(title, sub, 2.1);
      this.game.events.emit('bk-round', this);
      var done = m.wins[0] >= WIN_NEED || m.wins[1] >= WIN_NEED || m.round >= 3;
      this.after(2.5, function () { if (done) self.matchEnd(); else { m.round++; self.startRound(); } });
    }
    // a glowing bar drawn through the three: it grows from the first square to the last
    winLine(cells) {
      var L = this.L, a = this.cellXY(cells[0][1], cells[0][0]), b = this.cellXY(cells[2][1], cells[2][0]);
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ext = L.cell * 0.38, tot = len + ext * 2;
      var bar = this.add.image(a.x - dx / len * ext, a.y - dy / len * ext, 'ui', 'bar').setOrigin(36 / 512, 0.5).setRotation(Math.atan2(dy, dx)).setDepth(10);
      bar.setScale(0, L.cell * 0.46 / 56); this.winFx.push(bar);
      this.snd('winLine');
      this.tweens.add({ targets: bar, scaleX: tot / 440, duration: 450, ease: 'Cubic.easeOut' });
    }

    matchEnd() {
      var m = this.match, w0 = m.wins[0], w1 = m.wins[1], self = this;
      this.phase = 'over'; this.game.events.emit('bk-round', this);
      if (this.mode === '2p') {
        if (w0 !== w1) this.snd('matchWin');
        this.hud.result({ title: w0 === w1 ? "It's a tie!" : 'Player ' + (w0 > w1 ? 1 : 2) + ' wins the match!', text: 'Rounds ' + w0 + ' : ' + w1, buttons: [
          { label: 'Play Again', icon: 'ic-retry', primary: true, fn: function () { self.startMatch('2p'); } },
          { label: 'Opponents', icon: 'ic-bot', fn: function () { self.hud.ladder(); } }] });
        Kit.bridge.complete(); return;
      }
      if (w0 > w1) {
        var stars = Phaser.Math.Clamp(3 - m.lost - (m.draws > 0 ? 1 : 0), 1, 3), lv = this.level;
        var wasLocked = lv < COUNT && !this.progress.unlocked(lv + 1);
        this.progress.finish(lv, stars); Kit.bridge.complete();
        this.confetti(); this.setRobot('lose', 3); this.snd('matchWin');
        var last = lv === COUNT, next = C.opponents[lv], buttons = [];
        if (!last) buttons.push({ label: 'Play ' + next.name, icon: 'ic-next', primary: true, fn: function () { self.startMatch(lv + 1); } });
        buttons.push({ label: 'Replay', icon: 'ic-retry', primary: last, fn: function () { self.startMatch(lv); } });
        buttons.push({ label: 'Opponents', icon: 'ic-bot', fn: function () { self.hud.ladder(); } });
        this.hud.result({ title: last ? 'Champion!' : 'You beat ' + this.opp.name + '!', text: last ? 'You beat every friend. MashaAllah!' : wasLocked ? next.name + ' wants to play!' : 'Rounds ' + w0 + ' : ' + w1, stars: stars, robot: last ? null : next.robot, buttons: buttons });
      } else {
        this.setRobot('win', 3); this.robotSparkle(); this.snd('robotWin');
        this.hud.result({ title: w0 === w1 ? 'So close!' : this.opp.name + ' won the match', text: "Let's play again!", buttons: [
          { label: 'Try Again', icon: 'ic-retry', primary: true, fn: function () { self.startMatch(self.level); } },
          { label: 'Opponents', icon: 'ic-bot', fn: function () { self.hud.ladder(); } }] });
      }
    }

    /* ---------------------------------------------------------------- input: tap a piece then a spot, or drag the piece onto a spot */
    world(p) { return this.cameras.main.getWorldPoint(p.x, p.y, tmp); }
    targetAt(key, cell) {
      var ts = R.targets(this.S, key) || [];
      for (var i = 0; i < ts.length; i++) if (ts[i].r === cell.r && ts[i].c === cell.c) return ts[i];
      return null;
    }
    sourceAt(cell, srcs) { for (var i = 0; i < srcs.length; i++) if (srcs[i].r === cell.r && srcs[i].c === cell.c) return srcs[i]; return null; }
    // a tap (or Space / Enter) on a square: the same rules for a finger, a mouse and a key
    tapCell(cell, start) {
      var S = this.S, srcs = R.sources(S), pc;
      if (this.sel != null && cell) { var t = this.targetAt(this.sel, cell); if (t) { this.doMove(t.move); return true; } }
      var hit = cell && this.sourceAt(cell, srcs);
      if (hit) {
        var was = this.sel; this.select(hit.key); this.snd('pick'); Kit.buzz(6);
        if (!start && was === hit.key && srcs.length > 1) this.deselect();
        return hit.key;
      }
      if (cell) {
        pc = this.pieceAtCell(cell);
        if (pc) {
          this.wiggle(pc);
          if (pc.side === R.turn(S) && R.forced && R.forced(S)) { var p = this.cellXY(pc.c, pc.r); this.floatText(C.forcedText || 'Jump!', p.x, p.y - this.L.cell * 0.4, '#ffe08a', this.L.cell * 0.4); }
          return false;
        }
      }
      if (srcs.length > 1) this.deselect();
      return false;
    }
    onDown(p) {
      if (!this.S || !this.L) return;
      var w = this.world(p), cell = this.cellAt(w.x, w.y);
      if (this.phase === 'ai' || this.phase === 'anim') { var pc0 = cell && this.pieceAtCell(cell); if (pc0 && this.phase === 'ai') this.wiggle(pc0); return; }
      if (this.phase !== 'play' || !this.isHuman(R.turn(this.S))) return;
      var turn = R.turn(this.S), tp = this.L.tray[turn];
      if (Math.hypot(w.x - tp.x, w.y - tp.y) < this.L.trayR * 1.25) { this.drag = { key: 'tray', x: w.x, y: w.y, moved: false, touch: p.wasTouch }; this.snd('pick'); Kit.buzz(6); return; }
      if (cell) { this.focus = { r: cell.r, c: cell.c }; }
      var was = this.sel, key = this.tapCell(cell, true);
      if (key !== false && key != null && this.pcs[key]) this.drag = { key: key, x: w.x, y: w.y, moved: false, was: was, touch: p.wasTouch };
      else this.drag = null;
    }
    onMove(p) {
      var d = this.drag; if (!d || !p.isDown) return;
      var w = this.world(p), L = this.L; d.x = w.x; d.y = w.y;
      if (d.key === 'tray') {                                           // a star or flower carried from its dish
        if (!d.moved && p.getDistance() > 9) { d.moved = true; var turn = R.turn(this.S), f = this.ps.frames[C.frameOf(turn)]; this.ghost.setTexture(this.ps.key, C.frameOf(turn)).setDisplaySize(f.w * 1.06, f.h * 1.06).setVisible(true); this.updateTray(); }
        if (d.moved) {
          var gy = d.y - (d.touch ? L.cell * 0.3 : 0); this.ghost.setPosition(d.x, gy);
          var c0 = this.cellAt(d.x, gy), t0 = c0 && this.targetAt('tray', c0); if (!t0) { c0 = this.cellAt(d.x, d.y); t0 = c0 && this.targetAt('tray', c0); }
          if (t0) { var hp = this.cellXY(c0.c, c0.r); this.hoverMark.setPosition(hp.x, hp.y).setScale(L.cell * 0.62 / 256).setAlpha(0.9).setVisible(true); } else this.hoverMark.setVisible(false);
        }
        return;
      }
      if (!d.moved && p.getDistance() > 9) { d.moved = true; var pc = this.pcs[d.key]; this.tweens.killTweensOf(pc.o); pc.o.setDepth(8); this.snd('pick', { vol: 0.5 }); }
      if (d.moved) {
        var pc2 = this.pcs[d.key], cy = d.y - (d.touch ? L.cell * 0.3 : 0);
        pc2.o.setPosition(d.x, cy);
        var c = this.cellAt(d.x, cy), t = c && this.targetAt(d.key, c); if (!t) { c = this.cellAt(d.x, d.y); t = c && this.targetAt(d.key, c); }
        this.hover = t ? c : null;
      }
    }
    onUp(p) {
      var d = this.drag; if (!d) return; this.drag = null; this.hover = null;
      if (d.key === 'tray') {
        this.ghost.setVisible(false); this.hoverMark.setVisible(false); this.updateTray();
        if (this.phase !== 'play' || !d.moved) return;
        var w0 = this.world(p), L0 = this.L, gy = w0.y - (d.touch ? L0.cell * 0.3 : 0), c0 = this.cellAt(w0.x, gy), t0 = c0 && this.targetAt('tray', c0);
        if (!t0) { c0 = this.cellAt(w0.x, w0.y); t0 = c0 && this.targetAt('tray', c0); }
        if (t0) this.doMove(t0.move, { drop: true, from: { x: w0.x, y: gy } }); else this.snd('wiggle');
        return;
      }
      if (this.phase !== 'play') return;
      var pc = this.pcs[d.key]; if (!pc) return;
      if (d.moved) {
        pc.o.setDepth(5);
        var w = this.world(p), L = this.L, cy = w.y - (d.touch ? L.cell * 0.3 : 0), cell = this.cellAt(w.x, cy), t = cell && this.targetAt(d.key, cell);
        if (!t) { cell = this.cellAt(w.x, w.y); t = cell && this.targetAt(d.key, cell); }
        if (t) { this.doMove(t.move, { drop: true }); return; }
        var home = this.cellXY(pc.c, pc.r);                             // not a legal spot: glide home, stay picked
        this.tweens.add({ targets: pc.o, x: home.x, y: home.y, duration: 220, ease: 'Sine.easeOut' });
        this.snd('wiggle');
      } else if (d.was === d.key && R.sources(this.S).length > 1) this.deselect();   // tap the picked piece again to put it down
    }

    /* ---------------------------------------------------------------- keys: an arrow moves the cursor, Space or Enter taps it */
    moveFocus(dx, dy) {
      if (this.phase !== 'play' || !this.L) { return; }
      var f = this.focus, n = this.L.n;
      this.focus = { r: Phaser.Math.Clamp(f.r + dy, 0, n - 1), c: Phaser.Math.Clamp(f.c + dx, 0, n - 1) };
      this.hi.focus.setVisible(true); this.placeFocus();
    }
    keyTap() { if (this.phase === 'play' && this.isHuman(R.turn(this.S))) { this.tapCell(this.focus, false); this.placeFocus(); } }
    placeFocus(snap) {
      if (!this.L || !this.S) return;
      var S = this.S, f = this.focus;
      if (snap && this.phase === 'play') {                               // start on a piece that can move
        var srcs = R.sources(S); if (srcs.length && srcs[0].r !== undefined && !this.sourceAt(f, srcs)) this.focus = f = { r: srcs[0].r, c: srcs[0].c };
      }
      var p = this.cellXY(f.c, f.r);
      this.hi.focus.setPosition(p.x, p.y).setScale(this.L.cell * 1.02 / 256).setVisible(this.device === 'keys' && this.phase === 'play');
    }
  }
  var Q = new URLSearchParams(location.search);
  window.BkBoard = Board;
})();
