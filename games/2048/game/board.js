/* 2048 Garden: board.js, the play scene ('Garden', restarted for each level with { n, resume }) and the layout both
   scenes share. Swipes and keys come from the interface scene (hud.js); this scene draws the board.
   What the engine does, the engine does (docs/phaser-standard.md section 1):
   - every slide, merge pop, spawn, bump, parallax nudge, fade and floating text is a tween on the engine's clock
     (Quad.easeOut slides, Back.easeOut for a new tile, Sine pops for a merge);
   - the burst of a merge or of a win is a particle emitter (explode), the scenery repeats with TileSprite, the tray and
     tiles are canvas textures painted once (art.js), the timers are this.time, the sounds go through Kit.snd.
   Kept as game code, because the engine has no such feature: the 2048 rules (rules.js: slide, merge, spawn, game over,
   undo history), stars from moves and undo (levels.js), and the saved progress (main.js).
   Turn-based: nothing runs while nothing moves (Kit.play.start({ rest: true })): no ambient loops, no idle tweens.
   The scene shares its state with the interface scene through window.G48S (level, board, moves, undo) and the game's
   events: g48-start, g48-move, g48-tiles, g48-stuck, g48-won, g48-near, g48-nope. */
(function () {
  'use strict';
  var A = window.G48Art, LV = window.G48_LEVELS, GM = window.G48Rules.GameManager;
  var SLIDE = 120, POP = 240, SPAWN = 200;
  var DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  var PRAISE = ['mashaallah', 'ahsant', 'barakallah', 'alhamdulillah'];
  var S = window.G48S = { ready: false };
  var seq = 0;

  // 2048's own interface size, in screen points like the old game: a button (150 units) is 48 points on every screen (easy to
  // touch on a phone, never huge on a tablet or a computer); the board takes the room that is left.
  function uiScale(v) { return 48 * Kit.play.dpr() / (150 * v.z); }
  // The board and the gutters round it, for the view v (Kit.play.fit) and a board of `size` x `size`.
  // Landscape: the tray in the middle, the goal on the left, undo bottom-right. Upright: a row on top, the tray, undo below.
  function lay(v, size) {
    var k = uiScale(v), m = 40 * k, land = v.w > v.h * 1.15, sw = v.sr - v.sl, sh = v.sb - v.st, B, cy, cx = (v.sl + v.sr) / 2;
    var cap = (size === 3 ? 600 : 720) * Kit.play.dpr() / v.z;      // the old game's limit in screen points: a big screen does not get a huge board
    if (land) {
      B = Math.max(300, Math.min(sh - 130 * k, 1000, sw - 2 * 400 * k, cap));
      cy = (v.st + v.sb) / 2 + 6;
    } else {
      var zone = (40 + 150 + 36) * k;
      B = Math.max(300, Math.min(sw - 2 * m, sh - 2 * zone, cap));
      cy = (v.st + zone + v.sb - zone) / 2;
    }
    var cl = A.cells(size, B);
    return { k: k, m: m, land: land, B: B, bx: cx - B / 2, by: cy - B / 2, cx: cx, cy: cy, cl: cl };
  }
  window.G48Lay = lay; window.G48UiScale = uiScale;

  class Garden extends Phaser.Scene {
    constructor() { super('Garden'); }
    init(d) { this.d = d || {}; }
    // the baked pictures (art/baked.json, tools/bake-art.js) this level needs and the scene does not hold yet are loaded here
    // (decoded off the main thread); anything not baked is painted in create(). Other gardens' pictures are not loaded.
    preload() {
      var baked = this.cache.json.get('kit-baked-art/'), n = Math.max(1, Math.min(window.G48Save.count, this.d.n | 0 || 1)), def = LV.list[n - 1], self = this;
      if (!baked) return;
      A.needs(def.size, LV.worldOf(n)).forEach(function (k) { var d = baked[k]; if (d && !self.textures.exists(k)) self.load.image(k, 'art/' + d.f + Kit.play.ext()); });
    }
    create() {
      var self = this, sv = window.G48Save, d = this.d;
      var n = Math.max(1, Math.min(sv.count, d.n | 0 || 1));
      S.n = n; S.def = LV.list[n - 1]; S.world = LV.worldOf(n);
      var def = S.def;
      sv.progress.setCurrent(n);
      S.gm = new GM(def.size, { stones: def.stones, start: def.start });
      S.moves = 0; S.undos = def.undos; S.used = false; S.hist = []; S.queued = -1; S.busy = false; S.state = 'play';
      var saved = d.resume ? sv.store.get('board', null) : null;
      if (saved && saved.level === n && saved.snap && saved.snap.grid && saved.snap.grid.size === def.size) {
        try { S.gm.restore(saved.snap); S.moves = saved.moves || 0; S.undos = saved.undos == null ? def.undos : saved.undos; S.used = !!saved.used; }
        catch (e) { S.gm = new GM(def.size, { stones: def.stones, start: def.start }); }
      }
      S.bestTier = A.tierOf(Math.max(2, S.gm.maxValue()));
      this.sp = {}; this.pool = []; this.pops = []; this.pending = null; this.slideT = null; this.ckey = ''; this.fxKey = ''; this.fx = null; this.tt = null; this.bt = null; this.boardImg = null;
      this.tilt = { x: 0, y: 0 };

      // the scenery is four layers that nudge a little against each other when the tiles slide
      this.cSky = this.add.container(0, 0).setDepth(0); this.cFar = this.add.container(0, 0).setDepth(1);
      this.cMid = this.add.container(0, 0).setDepth(2); this.cNear = this.add.container(0, 0).setDepth(3);
      this.boardC = this.add.container(0, 0).setDepth(10);
      A.dropExcept(this, A.needs(def.size, S.world).concat(['g48ui']));
      this.K = A.world(this, S.world);
      this.events.once('shutdown', function () { S.ready = false; });

      Kit.play.fit(this, function (v) { self.layout(v); });
      this.syncAll('enter');
      S.ready = true;
      this.game.events.emit('g48-start');
      Kit.snd.play('whoosh'); Kit.snd.amb('amb-' + S.world, { fade: 2 });   // each world's own air: birds in the morning garden, the fountain court, evening wind
      if (S.gm.over) this.stuck();
      this.time.delayedCall(1500, function () { Kit.snd.preload([self.praise(n)]); });     // the praise voice is fetched and decoded now, not in the frame that wins
      if (Kit.load) Kit.load.done();
    }

    /* ---- layout: positions and (when the screen changes shape) the tray and tile pictures ---- */
    layout(v) {
      var def = S.def, L = this.lay = lay(v, def.size); S.lay = L; S.v = v;
      var key = [def.size, Math.round(L.B), S.world].join('|');
      this.repaint();
      this.boardC.setPosition(L.bx, L.by);
      if (this.fxKey !== key) { this.makeFx(); this.fxKey = key; }
      var id;
      for (id in this.sp) { var s = this.sp[id]; s.setPosition(this.px(s.gx), this.py(s.gy)); }
      this.buildScene(v, L);
    }
    px(x) { return this.lay.cl.at(x) + this.lay.cl.cs / 2; }
    py(y) { return this.lay.cl.at(y) + this.lay.cl.cs / 2 - this.lay.cl.lip * 0.5; }

    // the tray and the tile sheet of this board size: pictures of a fixed size (art.js; baked into AVIF files), scaled to the
    // screen here. Nothing is painted again when the screen turns; only the scale changes.
    repaint() {
      var def = S.def, L = this.lay, i;
      this.bt = A.board(this, def.size, S.world); this.tt = A.tiles(this, def.size);
      this.stoneKey = A.stone(this, def.size, S.world);
      var kb = L.B / A.FIX_B, kt = L.cl.cs / this.tt.cs;
      this.bt.scale = kb; this.tt.scale = kt;
      if (!this.boardImg) { this.boardImg = this.add.image(0, 0, this.bt.key).setOrigin(0, 0); this.boardC.addAt(this.boardImg, 0); }
      else this.boardImg.setTexture(this.bt.key);
      this.boardImg.setScale(kb).setPosition(-this.bt.pad * kb, -this.bt.pad * kb);
      var all = this.pool.slice(), k; for (k in this.sp) all.push(this.sp[k]);
      for (i = 0; i < all.length; i++) this.skin(all[i], all[i].fr).setScale(kt);
      S.tt = this.tt; S.tk = this.tt.key;
      this.game.events.emit('g48-tiles');
    }
    // a tile image shows frame fr of the tile sheet, or the stone picture
    skin(s, fr) { if (fr === 'stone') s.setTexture(this.stoneKey); else s.setTexture(this.tt.key, fr); s.fr = fr; return s; }

    // the garden: sky, sun, clouds, far skyline, the arcade, the lawn with a water channel and path, bushes and vines.
    // The strips repeat sideways, so any screen shape is covered (art.js).
    buildScene(v, L) {
      var K = this.K, T = A.STRIP, W = A.WORLDS[S.world], self = this, add = this.add;
      [this.cSky, this.cFar, this.cMid, this.cNear].forEach(function (c) { c.removeAll(true); });
      var X0 = v.l - 260, XW = v.w + 520;
      var groundY = Math.min(v.b - 120, Math.max(v.t + 0.55 * v.h, L.by + L.B * 0.74));
      var s = Math.max(0.6, Math.min(2.4, (groundY - (L.by - 70)) / T.midWall)), wallTop = groundY - T.midWall * s;
      groundY = Math.max(groundY, wallTop + 130);
      var cs = Math.min(1.6, s);
      // sky and sun
      this.cSky.add(add.image(X0, v.t - 300, K.sky).setOrigin(0, 0).setDisplaySize(XW, groundY - (v.t - 300) + 10));
      var sx = v.l + v.w * (S.world === 2 ? 0.7 : 0.24), sy = wallTop - (S.world === 2 ? 10 : 60) * 2.7;
      this.cSky.add(add.image(sx, sy, K.halo).setDisplaySize(1900, 1900));
      this.cSky.add(add.image(sx, sy, K.disc).setDisplaySize(190, 190));
      var fxTop = v.t - 300, fxH = wallTop + 40 - fxTop;
      this.cSky.add(add.tileSprite(X0, fxTop, XW, fxH, K.fx).setOrigin(0, 0).setTileScale(2, 2));
      // far skyline, resting on the top of the arcade
      var sf = s * 0.9;
      this.cFar.add(add.tileSprite(X0, wallTop + 16 - T.farBase * sf, XW, T.farH * sf, K.far).setOrigin(0, 0).setTileScale(sf, sf));
      // the garden floor, then the arcade standing on it
      this.cMid.add(add.image(X0, groundY, K.lawn).setOrigin(0, 0).setDisplaySize(XW, v.b + 500 - groundY));
      var chY = groundY + 60 * cs, chH = (T.chanH + 28) * cs;
      this.cMid.add(add.tileSprite(X0, chY + chH + 10 * cs, XW, v.b + 500 - chY, K.path).setOrigin(0, 0).setTileScale(cs, cs));
      this.cMid.add(add.tileSprite(X0, chY, XW, chH, K.chan).setOrigin(0, 0).setTileScale(cs, cs));
      this.cMid.add(add.tileSprite(X0, groundY - T.midGround * s, XW, T.midH * s, K.mid).setOrigin(0, 0).setTileScale(s / T.midR, s / T.midR));
      // near: bushes in the bottom corners (and the middle when upright), vines from the top corners
      var bs = Math.max(1, Math.min(1.8, s * 0.6)), vs = Math.min(1.6, 0.42 * v.h / T.vineH);
      this.cNear.add(add.image(v.l + 130 * bs, v.b + 30, K.bush).setOrigin(0.5, 1).setScale(bs));
      this.cNear.add(add.image(v.r - 130 * bs, v.b + 30, K.bush).setOrigin(0.5, 1).setScale(bs).setFlipX(true));
      if (!L.land) this.cNear.add(add.image(L.cx, v.b + 60, K.bush).setOrigin(0.5, 1).setScale(bs * 0.9));
      this.cNear.add(add.image(v.l - 20, v.t - 10, K.vine).setOrigin(0, 0).setScale(vs));
      this.cNear.add(add.image(v.r + 20, v.t - 10, K.vine).setOrigin(1, 0).setScale(vs).setFlipX(true));
      this.parallax();
    }
    // layers nudge against each other when the tiles slide (design units: the old page's pixels x 2.7)
    parallax() {
      var t = this.tilt;
      this.cSky.setPosition(-t.x * 8, -t.y * 5); this.cFar.setPosition(-t.x * 19, -t.y * 8);
      this.cMid.setPosition(-t.x * 32, -t.y * 11); this.cNear.setPosition(-t.x * 49, -t.y * 16);
    }

    /* ---- tile pictures: a pool of images, each shows one tile ---- */
    tileImg(t) {
      var fr = t.stone ? 'stone' : 't' + A.tierOf(t.value), s = this.pool.pop();
      if (!s) { s = this.add.image(0, 0, this.tt.key, 't1'); this.boardC.add(s); }
      this.skin(s, fr); s.gx = t.x; s.gy = t.y;
      s.setVisible(true).setAlpha(1).setScale(this.tt.scale).setPosition(this.px(t.x), this.py(t.y));
      this.sp[t.id] = s; return s;
    }
    release(s) { this.tweens.killTweensOf(s); s.setVisible(false); this.pool.push(s); }
    // draw the whole board again from the rules ('enter': a new level, tiles pop in one after another; 'undo': they settle back)
    syncAll(mode) {
      var self = this, base = this.tt.scale;
      Object.keys(this.sp).forEach(function (id) { self.release(self.sp[id]); }); this.sp = {};
      S.gm.grid.eachCell(function (x, y, t) {
        if (!t) return;
        var s = self.tileImg(t); if (t.stone) return;
        if (mode === 'enter') { s.setScale(0); self.tweens.add({ targets: s, scale: base, delay: 250 + (x + y) * 60, duration: 240, ease: 'Back.easeOut' }); }
        else if (mode === 'undo') { s.setScale(base * 0.86).setAlpha(0.3); self.tweens.add({ targets: s, scale: base, alpha: 1, duration: 250, ease: 'Back.easeOut' }); }
      });
    }

    /* ---- a move ---- */
    request(dir) {
      if (S.state !== 'play' || !S.gm) return;
      if (S.busy) { S.queued = dir; return; }
      this.doMove(dir);
    }
    doMove(dir) {
      var self = this, gm = S.gm, before = gm.snapshot(), res = gm.move(dir), sv = window.G48Save;
      if (!res.moved) { this.bump(dir); return; }                 // nothing can slide that way: the tray gives a little knock
      S.hist.push(before); if (S.hist.length > 40) S.hist.shift();
      S.moves++;
      var n = 0; gm.grid.eachCell(function (x, y, t) { if (t && !t.stone && t.previousPosition && (t.previousPosition.x !== x || t.previousPosition.y !== y)) n++; });
      this.animate();
      S.busy = true; this.pending = res;
      this.tilt.x = DV[dir][0]; this.tilt.y = DV[dir][1];
      this.tweens.killTweensOf(this.tilt); this.tweens.add({ targets: this.tilt, x: 0, y: 0, duration: 650, ease: 'Cubic.easeOut', onUpdate: function () { self.parallax(); } });
      Kit.snd.play('slide', { vol: 0.55 + 0.45 * Math.min(1, (n + res.merges.length) / 8) });
      this.slideT = this.time.delayedCall(SLIDE, this.landed, [], this);
      if (!sv.store.get('swiped', false)) sv.store.set('swiped', true);
      this.save();
      this.game.events.emit('g48-move');
    }
    // slide the pictures to where the rules put the tiles; merged tiles slide into each other, then the new one pops
    animate() {
      var self = this; this.pops = [];
      S.gm.grid.eachCell(function (x, y, t) {
        if (!t || t.stone) return;
        var X = self.px(x), Y = self.py(y), sp;
        if (t.mergedFrom) {
          t.mergedFrom.forEach(function (src) { var o = self.sp[src.id]; delete self.sp[src.id]; if (o) { o.gx = x; o.gy = y; self.slide(o, X, Y, true); } });
          var m = self.tileImg(t); m.setVisible(false); self.pops.push({ s: m, k: 'merge' });
        } else if (t.previousPosition) {
          sp = self.sp[t.id];
          if (sp && (t.previousPosition.x !== x || t.previousPosition.y !== y)) { sp.gx = x; sp.gy = y; self.slide(sp, X, Y, false); }
        } else { var ns = self.tileImg(t); ns.setVisible(false); self.pops.push({ s: ns, k: 'spawn' }); }
      });
    }
    slide(sp, X, Y, rel) {
      var self = this;
      this.tweens.add({ targets: sp, x: X, y: Y, duration: SLIDE, ease: 'Quad.easeOut', onComplete: rel ? function () { self.release(sp); } : undefined });
    }

    // runs when the tiles land: merge pops and bursts, the new tile, then the goal or no-moves checks
    landed() {
      var res = this.pending; this.pending = null; S.busy = false; this.slideT = null;
      if (!res) return;
      var self = this, base = this.tt.scale, def = S.def, L = this.lay, cs = L.cl.cs;
      this.pops.forEach(function (p) {
        p.s.setVisible(true);
        if (p.k === 'spawn') { p.s.setScale(0); self.tweens.add({ targets: p.s, scale: base, duration: SPAWN, ease: 'Back.easeOut' }); }
        else { p.s.setScale(base); self.tweens.add({ targets: p.s, scale: base * 1.22, duration: POP / 2, yoyo: true, ease: 'Sine.easeOut' }); }
      });
      this.pops = [];
      if (res.merges.length) {
        var big = 0;
        res.merges.forEach(function (m) {
          big = Math.max(big, m.value);
          var k = A.tierOf(m.value), col = A.tileColor(m.value);
          self.burst('merge', L.bx + self.px(m.x), L.by + self.py(m.y), 6 + k * 2, [A.int(col), A.int(A.shade(col, 0.4)), 0xffffff]);
        });
        var bk = A.tierOf(big);
        Kit.snd.play(bk >= 5 ? 'merge-big' : 'merge', { vol: 0.7 + 0.3 * Math.min(1, bk / 8) }); Kit.buzz(8 + bk);
        if (bk > S.bestTier && big < def.goal) {
          S.bestTier = bk;
          if (bk >= 3) {
            var top = res.merges.filter(function (m) { return m.value === big; })[0];
            Kit.snd.play('shine');
            this.burst('shine', L.bx + this.px(top.x), L.by + this.py(top.y), 10, [0xfff3c4]);
            if (big * 2 === def.goal) this.game.events.emit('g48-near');          // almost there: the goal tile waves
          }
        }
      }
      if (res.spawned) Kit.snd.play('spawn');
      if (S.gm.maxValue() >= def.goal) { this.win(); return; }
      if (S.gm.over) { this.stuck(); return; }
      if (S.queued >= 0) { var q = S.queued; S.queued = -1; this.request(q); }
    }

    // Particle emitters and the win text are made once per level and screen shape (a frame that makes them is long on a
    // budget phone), then every burst is only explode() with a tint: 3 emitters for merges (taken in turn), one for a
    // new biggest tile, one for the win.
    makeFx() {
      var self = this, L = this.lay, cs = L.cl.cs, fx = this.fx;
      if (fx) { fx.all.forEach(function (e) { e.destroy(); }); fx.text.destroy(); fx.ring.destroy(); }
      var mk = function (speed, size, life, grav) {
        return self.add.particles(0, 0, 'g48ui', { frame: ['spark', 'dot'], emitting: false, lifespan: { min: life * 0.7, max: life }, speed: { min: speed * 0.35, max: speed },
          angle: { min: 0, max: 360 }, gravityY: grav, scale: { start: size / 64, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, tint: 0xffffff }).setDepth(20);
      };
      fx = this.fx = { merge: [mk(150 + cs * 2.2, Math.max(22, cs * 0.16), 550, 900), mk(150 + cs * 2.2, Math.max(22, cs * 0.16), 550, 900), mk(150 + cs * 2.2, Math.max(22, cs * 0.16), 550, 900)],
        mi: 0, shine: mk(380, Math.max(28, cs * 0.22), 800, -80), win: mk(900, 44, 1100, 900) };
      fx.all = fx.merge.concat([fx.shine, fx.win]);
      fx.text = this.add.text(L.cx, L.cy, 'You made ' + S.def.goal + '!', { fontFamily: A.FONT, fontSize: Math.round(Math.min(120, L.B * 0.11)) + 'px', fontStyle: '800', color: '#fff6c2', stroke: '#3c1450', strokeThickness: 14, resolution: 1.5 })
        .setOrigin(0.5).setDepth(30).setAlpha(0.004);     // (not quite 0: the engine draws it once now, so its picture is uploaded before a win needs it)
      fx.ring = this.add.image(0, 0, 'g48ui', 'ring').setDepth(15).setTint(0xfff3c4).setAlpha(0.004);
    }
    // a burst of sparks at (x, y): kind 'merge' | 'shine' | 'win', colors = tints
    burst(kind, x, y, n, colors) {
      var fx = this.fx, e = kind === 'merge' ? fx.merge[fx.mi++ % 3] : fx[kind];
      var per = Math.max(1, Math.round(n / colors.length));                          // one tint (a number) a call: an array here is not read as a list
      for (var i = 0; i < colors.length; i++) { e.setParticleTint(colors[i]); e.explode(per, x, y); }
    }
    bump(dir) {
      var L = this.lay, b = this.boardC;
      Kit.snd.play('bump'); Kit.buzz(6);
      this.tweens.killTweensOf(b); b.setPosition(L.bx, L.by);
      this.tweens.add({ targets: b, x: L.bx + DV[dir][0] * 16, y: L.by + DV[dir][1] * 16, duration: 70, yoyo: true, ease: 'Sine.easeOut' });
    }

    /* ---- undo ---- */
    undo() {
      if (!S.gm || !(S.state === 'play' || S.state === 'stuck')) return false;
      if (S.undos <= 0 || !S.hist.length) { Kit.snd.play('bump'); this.game.events.emit('g48-nope'); return false; }
      S.queued = -1;
      if (S.busy) { if (this.slideT) this.slideT.remove(false); this.landed(); if (S.state !== 'play' && S.state !== 'stuck') return false; }
      S.gm.restore(S.hist.pop());
      S.undos--; S.used = true; S.moves = Math.max(0, S.moves - 1);
      this.syncAll('undo');
      S.bestTier = A.tierOf(Math.max(2, S.gm.maxValue()));
      Kit.snd.play('undo');
      S.state = 'play';
      this.save();
      this.game.events.emit('g48-move');
      return true;
    }
    save() { window.G48Save.store.set('board', { level: S.n, snap: S.gm.snapshot(), moves: S.moves, undos: S.undos, used: S.used }); }

    praise(n) { return 'audio/voice/' + (n === window.G48Save.count ? 'mashaallah' : PRAISE[(n - 1) % PRAISE.length]) + '.mp3'; }

    /* ---- goal reached ---- */
    win() {
      var self = this, sv = window.G48Save, def = S.def, n = S.n, L = this.lay, cs = L.cl.cs, col = A.tileColor(def.goal);
      S.state = 'clear';
      var stars = LV.stars(n, S.moves, S.used);
      sv.progress.finish(n, stars); sv.store.set('board', null);
      try { window.KahfBridge && window.KahfBridge.complete(); } catch (e) { /* not in the app */ }
      Kit.snd.play('whoosh'); Kit.snd.play('win', { delay: 0.12 }); Kit.buzz(30);
      this.game.events.emit('g48-end', { kind: 'won', stars: stars });
      Kit.snd.voice(this.praise(n), { vol: 0.8 });
      var wt = null; for (var id in this.sp) if (this.sp[id].fr === 't' + A.tierOf(def.goal)) wt = this.sp[id];
      var cx = L.bx + (wt ? wt.x : L.B / 2), cy = L.by + (wt ? wt.y : L.B / 2), gold = A.int(col);
      this.burst('win', cx, cy, 30, [gold, 0xffd36b, 0xffffff, A.int(A.shade(col, 0.4))]);
      if (wt) {
        var base = this.tt.scale;
        this.tweens.add({ targets: wt, scale: base * 1.1, duration: 280, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
        var ring = this.fx.ring.setPosition(cx, cy).setScale(0.6).setAlpha(0.9);
        this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 900, repeat: 2 });
      }
      var tx = this.fx.text.setPosition(L.cx, L.cy).setAlpha(0);
      this.tweens.add({ targets: tx, alpha: 1, y: L.cy - 90, duration: 500, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: tx, alpha: 0, delay: 1300, duration: 450 });
      this.cameras.main.shake(220, 0.0025);
      for (var i = 1; i < 6; i++) this.time.delayedCall(i * 170, function () {
        if (S.state !== 'clear' || S.n !== n) return;
        self.burst('win', L.bx + Phaser.Math.Between(0, L.B), L.by + Phaser.Math.Between(0, L.B * 0.7), 18, [0xffd36b, 0xff8fab, 0x7ae7ff, 0xffffff, gold]);
      });
      this.time.delayedCall(1500, function () { if (S.state === 'clear' && S.n === n) self.game.events.emit('g48-won', { stars: stars }); });
    }

    /* ---- no moves left: gentle, never a dead end (the sheet offers undo, retry, levels) ---- */
    stuck() {
      var self = this, n = S.n;
      S.state = 'stuck'; Kit.snd.play('stuck');
      this.game.events.emit('g48-end', { kind: 'stuck' });
      this.time.delayedCall(800, function () { if (S.state === 'stuck' && S.n === n) self.game.events.emit('g48-stuck'); });
    }
  }

  window.G48Garden = Garden;
})();
