/* Ramadan Maze: the iftar screen, a screen of the interface scene (hud.js) shown when the kid is home. The warm room (painted
   once: window with the crescent, low table with dates and water, the kid from behind) fades in under confetti, its
   lanterns swing on tweens; a moment later the card says how many treats she found, gives the stars, and offers the way
   on (Next Level / Next World, Replay, Levels). Everything is the engine's: images, tweens, timers and a particle emitter. */
(function () {
  'use strict';
  var H = MzHud.prototype, FONT = 'system-ui, sans-serif', INK = '#fff7e6', COUNT = MAZE_LEVELS.count;

  // the kid is home: show the room, then (a moment later) the card
  H.won = function (d) {
    var self = this; if (this.sheet) return;
    this.sheet = { d: d, c: null, room: null, shown: false, primary: null, born: true };
    var sheet = this.sheet;
    this.block(1);
    MzArt.iftarRoom(this);
    this.buildRoom(0);
    Kit.snd.play('dish'); Kit.snd.amb('amb-house', { vol: 0.9 });
    this.sheet.fade = this.tweens.add({ targets: this.sheet.room, alpha: 1, duration: 600, ease: 'Cubic.easeOut' });
    this.sheet.conf = this.add.particles(0, 0, 'ui', { frame: 'spark', emitting: true, x: { min: this.v.l, max: this.v.r }, y: this.v.t - 20, lifespan: 2600, speedY: { min: 120, max: 300 }, speedX: { min: -60, max: 60 }, gravityY: 160,
      scale: { start: 0.55, end: 0.25 }, rotate: { min: 0, max: 360 }, tint: [0xffd36b, 0xffffff, 0xff8fab, 0x7ae7ff], quantity: 2, frequency: 60 }).setDepth(45);
    this.time.delayedCall(1300, function () { if (self.sheet === sheet && sheet.conf) sheet.conf.stop(); });
    this.time.delayedCall(1700, function () { if (self.sheet !== sheet) return; sheet.shown = true; Kit.snd.play('page'); self.buildSheet(true); Kit.snd.praise('mashaallah'); });
  };
  // the room: wall gradient, faint star pattern, the room picture, swinging lanterns (rebuilt when the screen changes shape)
  H.buildRoom = function (alpha) {
    var s = this.sheet, v = this.v, a = alpha == null ? 1 : alpha; if (!s) return;
    if (s.room) s.room.destroy(true);
    var r = s.room = this.add.container(0, 0).setDepth(40).setAlpha(a), cx = (v.l + v.r) / 2, cy = (v.t + v.b) / 2;
    r.add(this.add.image(cx, cy, 'iftar-wall').setDisplaySize(v.w + 700, v.h + 8).setInteractive());
    r.add(this.add.tileSprite(cx, cy, v.w + 8, v.h + 8, 'iftar-pat'));
    r.add(this.add.image(960, v.b - 540, 'iftar-room'));          // the picture sits on the bottom of the screen (taller screens show more wall above)
    var nL = v.w > v.h ? 5 : 3;
    for (var l = 0; l < nL; l++) {
      var lx = v.l + v.w * (l + 0.5) / nL, key = 'iftar-lan' + (l % 5) + '-' + MzArt.ROPES[l % 2];
      var im = this.add.image(lx, v.t, key).setOrigin(0.5, 0); r.add(im);
      this.tweens.add({ targets: im, angle: { from: -4.5, to: 4.5 }, duration: 1900 + l * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: l * 220 });
    }
  };
  // the card: title, what was found, stars, the way on
  H.buildSheet = function (animate) {
    var self = this, s = this.sheet, v = this.v; if (!s) return;
    this.buildRoom(s.shown || s.fade && s.fade.progress >= 1 ? 1 : (s.room ? s.room.alpha : 0));
    if (!s.shown) return;
    if (s.c) s.c.destroy(true);
    var d = s.d, last = d.n === COUNT, endOfWorld = d.n % 10 === 0, wide = v.w >= 1300, cx = (v.l + v.r) / 2, cy = (v.t + v.b) / 2;
    var c = s.c = this.add.container(cx, cy).setDepth(60), W = wide ? 1240 : Math.min(v.w - 40, 940), Hh = wide ? 760 : 820;
    c.add(this.add.nineslice(0, 0, 'ui', 'card', W, Hh, 70, 70, 70, 70).setAlpha(0.93).setInteractive());
    var thing = d.world === 0 ? 'dates' : 'treats', text = last ? 'You found the way home in all 30 mazes!' : d.got >= d.total ? 'You found all the ' + thing + '!' : 'You found ' + d.got + ' of ' + d.total + ' ' + thing;
    var add = function (o) { c.add(o); return o; };
    add(this.add.text(0, -Hh / 2 + 110, last ? 'MashaAllah!' : 'Iftar time!', { fontFamily: FONT, fontSize: '96px', fontStyle: '800', color: '#f6c453' }).setOrigin(0.5));
    add(this.add.text(0, -Hh / 2 + 205, text, { fontFamily: FONT, fontSize: wide ? '46px' : '44px', fontStyle: '700', color: INK, align: 'center', wordWrap: { width: W - 120 } }).setOrigin(0.5));
    for (var i = 0; i < 3; i++) {
      var st = add(this.add.image((i - 1) * 130, -Hh / 2 + 340, 'ui', i < d.stars ? 'ic-star' : 'ic-star0').setDisplaySize(112, 112));
      if (animate && i < d.stars) { st.setScale(0); this.tweens.add({ targets: st, scale: 112 / 64, duration: 380, ease: 'Back.easeOut', delay: 350 + i * 260, onStart: (function (k) { return function () { Kit.snd.play('date', { rate: 1 + k * 0.04 }); }; })(i) }); }
    }
    var next = function () { self.go(d.n + 1); }, again = function () { self.go(last ? 1 : d.n); };
    var by = Hh / 2 - 215, sz = 230, defs = [];
    if (!last) defs.push(['ic-next', endOfWorld ? 'Next World' : 'Next Level', next, true]);
    defs.push(['ic-retry', last ? 'Play Again' : 'Replay', again, last]);
    defs.push(['ic-grid', 'Levels', function () { self.closeSheet(true); self.openMenu(false); }]);
    var gap = wide ? 130 : 60, n = defs.length;
    defs.forEach(function (q, k) { var b = self.big(c, (k - (n - 1) / 2) * (sz + gap), by, q[0], q[1], q[2], q[3], q[3] ? sz : 200); });
    s.primary = defs[0][2];
  };
  H.closeSheet = function (quiet) {
    var s = this.sheet; if (!s) return; this.sheet = null;
    Kit.snd.stopVoice();
    if (s.c) s.c.destroy(true); if (s.room) s.room.destroy(true); if (s.conf) s.conf.destroy();
    if (quiet) this.blocked = Math.max(0, this.blocked - 1); else this.block(-1);
  };
})();
