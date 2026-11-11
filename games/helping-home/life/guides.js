/* Helping Home (life): guides.js
   The two guides a child follows with their real body: WUDU (tap the washbasin or the wudu taps) and SALAH (tap your
   prayer mat). Two Phaser scenes, 'Wudu' and 'Salah', added with window.LifeScenes; game.js launches one with
   { back: fn } and the guide calls back() after it has stopped itself. ?guide=wudu|salah starts one straight away.

   WHAT IS SHOWN comes from the reviewed files and is used unchanged (TEACHER REVIEW): pray/wudu-text.js
   (window.WUDU_TEXT) and pray/prayer-text.js (window.PRAYER_TEXT); the prayer positions are people.POSES in
   tools/art/people.py (from pray/salah-kid.js). Nothing here rewords, shortens, reorders, adds or drops a step, a count,
   an Arabic text, a transliteration, a meaning or a clip. Worship is never scored: no points, stars, timers or streaks,
   and the finish is quiet. No device voice anywhere: only the recorded clips (audio/index.json, played by HHVoice); where a
   clip does not exist (or sound is off) the words stay on the screen and the child taps on. People are faceless. No music.

   THE PICTURES are rendered in Blender (tools/art/bake_guides.py, build_guides.py) into one sheet per guide,
   life/art/g/wudu and life/art/g/salah (.avif, or .webp on an old WebView: window.LifeExt), loaded in the scene's own
   preload and removed again on shutdown. One boy shows every step. The basin, bench, foot basin, water and the prayer mat
   are separate pictures in the same frame as the child, so they line up when placed on the same anchor.

   LAYOUT: everything lives in one container in CSS pixels (the design space scaled by 1 / (css pixels per unit)), so a
   font of 18 is 18 css pixels on every device. A phone on its side puts the child at the left and the words card at the
   right; upright (and any narrow screen) the child is above the card. Long words (the tashahhud, the salawat) scroll in the
   card. Buttons are round pictures (the Hud's plates and the game's icon sheet).

   Wudu:  the steps of WUDU_TEXT.steps in order (12 screens, 10 numbers: the arms and the feet have a right then a left
          screen); the tap runs real water; tap a drop (or the child) to count a wash, never required; next / back.
   Salah: roll out the mat -> turn the compass to the qibla -> choose the unit and make the intention -> every position
          of PRAYER_TEXT (built as in the old page) -> a quiet finish, then the next unit of the prayer or done.
   Test:  ?guide=wudu&step=N (0..11)   ?guide=salah&p=fajr|dhuhr|asr|maghrib|isha|tahajjud&u=<unit>&madhab=hanafi|shafi
          &step=N (0 mat, 1 qibla, 2 ready, 3.. the positions, past the end = finished)   ?fin=1 (wudu finished) */
(function () {
  'use strict';
  const BASE = '/KidsGames/games/helping-home/', ART = BASE + 'life/art/g/';
  const EXT = () => window.LifeExt || '.avif';
  const Q = new URLSearchParams(location.search);
  const Lf = () => window.Life;
  const sfx = n => { try { Lf().sfx(n); } catch (e) { /* no sound */ } };
  const UIF = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif';
  const ARF = '"Noto Naskh Arabic", "Geeza Pro", "Noto Sans Arabic", "Amiri Quran", "Amiri", "Traditional Arabic", serif';
  const INK = '#3a3050', SOFT = '#7b6a96', RC = '#ef7a4f', LC = '#8b78cf', RT = '#c4502b', LT = '#5b48a0', GOLD = 0xf4b829;
  const hex = c => '#' + c.toString(16).padStart(6, '0');
  const clamp = Phaser.Math.Clamp;
  // girl or boy: from the child's own character (the sets are boy-kurta, boy-thobe, girl-hair, girl-scarf); ?girl / ?boy for tests
  const isGirl = () => { if (Q.has('girl')) return true; if (Q.has('boy')) return false; try { const y = window.Life && Life.state && Life.state.you; return !!(y && /^girl/.test(y.set || '')); } catch (e) { return false; } };
  const wait = (sc, ms) => new Promise(ok => sc.time.delayedCall(ms, ok));

  // HHVoice reads Kit.sfx.ctx / Kit.sfx.out; the kit exposes them on Kit.sfx.lib (as pray/salah-shell.js does)
  try {
    if (window.Kit && Kit.sfx && Kit.sfx.lib && !('ctx' in Kit.sfx)) {
      Object.defineProperty(Kit.sfx, 'ctx', { get: function () { return Kit.sfx.lib.ctx; } });
      Object.defineProperty(Kit.sfx, 'out', { get: function () { return Kit.sfx.lib.out; } });
    }
  } catch (e) { /* the voice then only paces */ }

  /* ---------- sounds: natural only (clicks, drops, running water) ---------- */
  if (window.Kit && Kit.sfx) Kit.sfx.define({
    gturn: (L, t) => { L.click(t, { freq: 1700, vol: 0.2 }); L.burst(t + 0.03, { dur: 0.14, freq: 900, sweepTo: 1500, q: 4, vol: 0.05 }); L.click(t + 0.16, { freq: 2300, vol: 0.14 }); },
    gdrop: (L, t) => L.drop(t, { size: 1.1, vol: 0.2 }),
    gdone: (L, t) => { L.drop(t, { size: 0.8, vol: 0.14 }); L.grains(t + 0.05, { n: 10, spread: 0.45, freq: 6500, vol: 0.07 }); },
    gcloth: (L, t) => { L.whoosh(t, { dur: 0.9, from: 300, to: 1100, vol: 0.06, brown: true }); },
    gdetent: (L, t) => L.click(t, { freq: 1100, vol: 0.2 })
  });
  const flow = { node: null, gain: null };
  function waterSound(on) {
    const L = window.Kit && Kit.sfx && Kit.sfx.lib, c = L && L.ctx;
    if (!c) return;
    const now = c.currentTime;
    if (on) {
      if (flow.node || Kit.sfx.muted) return;
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.08 * w) / 1.08; d[i] = last * 2.2 + w * 0.18; }
      const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.16, now + 0.35);
      s.connect(bp); bp.connect(g); g.connect(L.out || c.destination); s.start();
      flow.node = s; flow.gain = g;
    } else if (flow.node) {
      const s = flow.node, g = flow.gain; flow.node = flow.gain = null;
      try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3); s.stop(now + 0.35); } catch (e) { /* already stopped */ }
    }
  }

  /* ---------- recorded clips (never a device voice) ---------- */
  const hasMemo = {};
  const clipOK = id => !!id && !(window.Kit && Kit.sfx && Kit.sfx.muted) && !!window.HHVoice && (() => { const c = Kit.sfx.lib && Kit.sfx.lib.ctx; return !c || c.state === 'running'; })();
  function hasClip(id) { if (!id || !window.HHVoice) return Promise.resolve(false); return hasMemo[id] || (hasMemo[id] = HHVoice.has(id).catch(() => false)); }
  // plays a clip once; resolves true when it was played to the end, false when there is none / sound is off / it was stopped early
  function playClip(id) {
    if (!clipOK(id)) return Promise.resolve(false);
    return hasClip(id).then(h => h ? HHVoice.play(id, { fallbackMs: 0 }).then(() => true) : false);
  }
  const hush = () => { try { window.HHVoice && HHVoice.stop(); } catch (e) { /* none */ } };

  /* ---------- the pictures painted here once: plain interface shapes only ---------- */
  function paint(sc) {
    const T = (k, w, h, f, pad) => Kit.play.tex(sc, k, w, h, f, pad);
    T('gd-dot', 64, 64, c => { c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 30, 0, 7); c.fill(); });
    T('gd-ring', 64, 64, c => { c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.arc(32, 32, 27, 0, 7); c.stroke(); });
    const badge = (k, col, ch, ink) => T(k, 80, 80, c => {
      c.shadowColor = 'rgba(30,20,60,.32)'; c.shadowBlur = 6; c.shadowOffsetY = 3; c.fillStyle = col; c.beginPath(); c.arc(40, 38, 32, 0, 7); c.fill();
      c.shadowColor = 'rgba(0,0,0,0)'; c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
      c.fillStyle = ink || '#fff'; c.font = '800 40px ' + UIF; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 40, 42);
    }, 4);
    badge('gd-R', RC, 'R'); badge('gd-L', LC, 'L'); badge('gd-n1', '#fff1b8', '1', '#3a3050'); badge('gd-n2', '#fff1b8', '2', '#3a3050'); badge('gd-n3', '#fff1b8', '3', '#3a3050');
    const glyph = (k, d, stroke) => T(k, 64, 64, c => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (stroke) { c.strokeStyle = INK; c.lineWidth = 6; c.stroke(new Path2D(d)); } else { c.fillStyle = INK; c.fill(new Path2D(d)); }
    });
    glyph('gd-play', 'M20 12L52 32L20 52Z'); glyph('gd-pause', 'M17 12h11v40H17zM36 12h11v40H36z');
    T('gd-speaker', 64, 64, c => {
      c.fillStyle = INK; c.fill(new Path2D('M8 24h11l14-12v40L19 40H8z'));
      c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.arc(30, 32, 14, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(30, 32, 25, -0.85, 0.85); c.stroke();
    });
    T('gd-chev', 64, 40, c => { c.strokeStyle = SOFT; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(10, 8); c.lineTo(32, 30); c.lineTo(54, 8); c.stroke(); });
    // the compass: a cream face in an ink ring, a star of eight ticks, and the black Kaaba mark at the top
    T('gd-dial', 440, 440, c => {
      c.shadowColor = 'rgba(30,20,60,.3)'; c.shadowBlur = 14; c.shadowOffsetY = 6; c.fillStyle = '#231e16'; c.beginPath(); c.arc(220, 218, 206, 0, 7); c.fill();
      c.shadowColor = 'rgba(0,0,0,0)'; c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(220, 218, 190, 0, 7); c.fill();
      c.fillStyle = '#f4e3b8'; c.beginPath(); c.arc(220, 218, 150, 0, 7); c.fill();
      c.strokeStyle = '#231e16'; c.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r0 = i % 2 ? 160 : 150, r1 = 182; c.lineWidth = i % 2 ? 4 : 7; c.beginPath(); c.moveTo(220 + Math.sin(a) * r0, 218 - Math.cos(a) * r0); c.lineTo(220 + Math.sin(a) * r1, 218 - Math.cos(a) * r1); c.stroke(); }
      c.fillStyle = '#ef7a4f'; c.beginPath(); c.moveTo(220, 218 - 100); c.lineTo(250, 218); c.lineTo(190, 218); c.fill(); c.fillStyle = '#8b78cf'; c.beginPath(); c.moveTo(220, 218 + 100); c.lineTo(250, 218); c.lineTo(190, 218); c.fill();
      c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(220, 218, 12, 0, 7); c.fill(); c.strokeStyle = '#231e16'; c.lineWidth = 5; c.stroke();
      // the Kaaba mark
      c.fillStyle = '#231e16'; c.beginPath(); c.roundRect(188, 30, 64, 64, 10); c.fill();
      c.fillStyle = '#e9b44c'; c.fillRect(188, 50, 64, 9); c.strokeStyle = '#fff6dc'; c.lineWidth = 4; c.beginPath(); c.roundRect(188, 30, 64, 64, 10); c.stroke();
    }, 10);
    T('gd-bg-w', 16, 512, c => { const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#bfe8ee'); g.addColorStop(1, '#e6f5ec'); c.fillStyle = g; c.fillRect(0, 0, 16, 512); });
    T('gd-bg-s', 16, 512, c => { const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#f3e6cf'); g.addColorStop(1, '#e6def2'); c.fillStyle = g; c.fillRect(0, 0, 16, 512); });
  }

  /* ---------- text: one object per visual line, so a long text can scroll in the card without clipping tricks ---------- */
  function mk(sc, parent, str, size, color, o) {
    o = o || {};
    // Arabic is set right to left by wrapping it in a right-to-left isolate (the engine's own `rtl` draws the text off its canvas);
    // the isolate marks are invisible and add no letter, so the words, order and signs are the reviewed ones
    if (o.ar && str) str = '\u2067' + str + '\u2069';
    const t = sc.add.text(0, 0, str, { fontFamily: o.ar ? ARF : UIF, fontSize: size + 'px', fontStyle: o.ar ? '400' : (o.w || '800'), color: color || INK, align: o.ar ? 'left' : 'center', wordWrap: o.width ? { width: o.width, useAdvancedWrap: true } : undefined, lineSpacing: o.ls || 0 });
    t.setResolution(sc.dpr || 2).setOrigin(o.ox == null ? 0.5 : o.ox, o.oy == null ? 0 : o.oy);
    if (parent) parent.add(t);
    return t;
  }
  // a string wrapped into lines the way the engine would, one array entry per line
  function wrapLines(sc, str, size, o) {
    const t = mk(sc, null, '', size, INK, o), lines = t.getWrappedText(str); t.destroy(); return lines.length ? lines : [str];
  }
  // a line of words with the RIGHT / LEFT words in their own colours: {R:RIGHT} / {L:LEFT} (or plain words right / left in the salah lines)
  function richLine(sc, parent, src, width, size, color) {
    const toks = []; let sp = false;
    const re = /\{([RL]):([^}]+)\}|(\S+)|(\s+)/g; let m;
    while ((m = re.exec(src))) {
      if (m[4]) { sp = true; continue; }
      if (m[1]) toks.push({ s: m[2], k: m[1], sp }); else toks.push({ s: m[3], k: null, sp });
      sp = false;
    }
    const sw = size * 0.28, T = toks.map(k => { const t = mk(sc, parent, k.s, size, k.k === 'R' ? RT : k.k === 'L' ? LT : color || INK, { ox: 0, w: '800' }); return { t, w: t.width, sp: k.sp }; });
    const lines = []; let cur = [], cw = 0;
    T.forEach(k => { const add = (cur.length && k.sp ? sw : 0) + k.w; if (cur.length && k.sp && cw + add > width) { lines.push({ it: cur, w: cw }); cur = []; cw = 0; } const a = (cur.length && k.sp ? sw : 0); k.dx = cw + a; cw += a + k.w; cur.push(k); });
    if (cur.length) lines.push({ it: cur, w: cw });
    const lh = Math.round(size * 1.3);
    lines.forEach((l, i) => l.it.forEach(k => k.t.setPosition(-l.w / 2 + k.dx, i * lh)));
    return { h: lines.length * lh, lh, toks: T.map(k => k.t) };
  }
  // right / left in a plain sentence of the salah page get the same colours
  const rlMark = s => s.replace(/\b(right|left)\b/gi, w => '{' + (w[0].toLowerCase() === 'r' ? 'R' : 'L') + ':' + w + '}');

  /* ---------- a round picture button on the Hud's white plate ---------- */
  function roundBtn(sc, parent, o) {
    const c = sc.add.container(0, 0), S = o.size || 52;
    const plate = sc.add.image(0, 0, 'ui-plate').setScale(S / 124);
    if (o.tint != null) plate.setTint(o.tint);
    c.add(plate);
    let ic = null;
    if (o.frame) { ic = sc.add.image(0, -S * 0.04, 'ui', Lf().ico(o.frame)); ic.setScale(S * 0.6 / Math.max(ic.width, ic.height)); }
    else if (o.key) { ic = sc.add.image(0, 0, o.key); ic.setScale(S * 0.5 / Math.max(ic.width, ic.height)); }
    if (ic) { if (o.flip) ic.setFlipX(true); c.add(ic); }
    c.setSize(S, S).setInteractive();
    c.plate = plate; c.ic = ic; c.S = S; c.on_ = true;
    c.on('pointerdown', () => { if (!c.on_) return; sfx('tap'); sc.tweens.add({ targets: c, scale: c.scale * 0.9, duration: 70, yoyo: true }); });
    c.on('pointerup', () => { if (c.on_ && o.fn) o.fn(); });
    c.enable = on => { c.on_ = on; c.setAlpha(on ? 1 : 0.35); return c; };
    c.pulse = on => {
      if (c._pt) { c._pt.remove(); c._pt = null; c.setScale(1); }
      if (on && c.on_) c._pt = sc.tweens.add({ targets: c, scale: 1.14, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    };
    if (parent) parent.add(c);
    return c;
  }

  /* ---------- the scrolling words panel: lines are shown whole, the ones cut by the edge fade ---------- */
  class Panel {
    constructor(sc, parent) { this.sc = sc; this.c = sc.add.container(0, 0); parent.add(this.c); this.items = []; this.y = 0; this.off = 0; this.w = 100; this.h = 100; }
    setRect(x, y, w, h) { this.c.setPosition(x, y); this.w = w; this.h = h; }
    add(o, y, h) { this.c.add(o); this.items.push({ o, y, h }); this.y = Math.max(this.y, y + h); return this; }
    get hv() { return this.y > this.h + 1 ? this.h - 22 : this.h; }        // a scrolling panel keeps a row for the chevron
    get min() { return Math.min(0, this.hv - this.y); }
    scroll(d, abs) { this.off = clamp(abs ? d : this.off + d, this.min, 0); this.cull(); }
    cull() {
      this.items.forEach(it => {
        // a line is shown whole or not at all, so nothing is ever cut or sits under the chevron's strip
        const top = it.y + this.off, bot = top + it.h, show = top >= -1 && bot <= this.hv + 1;
        it.o.y = top + (it.o.__dy || 0); it.o.setVisible(show); it.o.setAlpha(1);
      });
      if (this.more) this.more.setVisible(this.y > this.h + 1 && this.off > this.min + 2);
    }
    destroy() { this.c.destroy(); }
  }

  /* =====================================================================================================
     The base scene: chrome (background, exit, dots, card, buttons), layout, scrolling, audio.
     ===================================================================================================== */
  class Guide extends Phaser.Scene {
    init(d) { this.backFn = d && d.back; this.girl = isGirl(); this.sheet = this.base + (this.girl ? '-girl' : ''); }
    preload() {
      this.load.atlas(this.akey, ART + this.sheet + EXT(), ART + this.sheet + '.json');
      if (!this.cache.json.exists('gd-index')) this.load.json('gd-index', ART + 'index.json');
    }
    create() {
      this.I = this.cache.json.get('gd-index'); this.MK = this.girl ? this.I.marksG : this.I.marks; this.dpr = Kit.play.dpr(); this.sayId = 0;
      paint(this);
      this.bg = this.add.image(960, 540, this.bgKey);
      this.ui = this.add.container(960, 540);
      this.stage = this.ui.add(this.add.container(0, 0)) && this.ui.list[this.ui.list.length - 1];
      this.cardG = this.add.graphics(); this.ui.add(this.cardG);
      this.cc = this.add.container(0, 0); this.ui.add(this.cc);                      // the card's content, made again for each step
      this.dots = this.add.container(0, 0); this.ui.add(this.dots);
      this.exitB = roundBtn(this, this.ui, { frame: 'house', size: 50, fn: () => this.leave() });
      this.backB = roundBtn(this, this.ui, { frame: 'arrow', size: 50, flip: true, fn: () => this.goBack() });
      this.nextB = roundBtn(this, this.ui, { frame: 'arrow', size: 72, tint: 0xd9f3dc, fn: () => this.goNext() });
      this.soundB = roundBtn(this, this.ui, { key: 'gd-speaker', size: 44, fn: () => this.replay() });
      this.stageIn = this.add.container(0, 0); this.ui.add(this.stageIn);
      this.input.on('pointermove', p => { if (this.drag && p.isDown) { this.drag.moved = this.drag.moved || Math.abs(p.y - this.drag.y0) > 8; if (this.panel) this.panel.scroll(this.drag.off0 + (p.y - this.drag.y0) / this.k, true); } });
      this.input.on('pointerup', () => { this.drag = null; });
      this.input.on('wheel', (p, o, dx, dy) => { if (this.panel) this.panel.scroll(-dy / 3); });
      this.events.once('shutdown', () => this.cleanup());
      if (Q.has('debug')) window.GD = this;
      // the world underneath is paused by game.js; it is not drawn either while a guide covers the screen (and drawn again after)
      try { const sm = this.scene; if (sm.isPaused('Place') && sm.isVisible('Place')) { sm.setVisible(false, 'Place'); this.hidP = true; } } catch (e) { /* no world under this guide */ }
      this.build();
      Kit.play.fit(this, v => this.layout(v));
    }
    atlasFrames() { return this.textures.get(this.akey).frames; }
    // the box (from the anchor) every picture in `names` covers, in the pictures' own pixels
    union(names) {
      const fr = this.atlasFrames(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      names.forEach(n => { const f = fr[n]; if (!f) return; const x = f.x - this.I.ax, y = f.y - this.I.ay; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + f.width); y1 = Math.max(y1, y + f.height); });
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    // a picture of the sheet, standing on the anchor (the same spot as the child's feet)
    pic(name, parent) {
      const I = this.I, im = this.add.image(0, 0, this.akey, name).setOrigin(I.ax / I.fw, I.ay / I.fh);
      (parent || this.stageIn).add(im); return im;
    }
    hitBox(im, name) { const f = this.atlasFrames()[name]; im.setInteractive(new Phaser.Geom.Rectangle(f.x, f.y, f.width, f.height), Phaser.Geom.Rectangle.Contains); return im; }
    badge(key, x, y, size) { const b = this.add.image(x, y, key).setScale(size / 80); b.setData('n', 1); return b; }

    /* ----- layout ----- */
    layout(v) {
      const dpr = this.dpr, cpu = v.z / dpr; this.k = 1 / cpu;                         // ui units (css px) per design unit = cpu; the container scale is 1 / cpu
      this.ui.setScale(1 / cpu).setPosition(960, 540);
      this.bg.setPosition(960, 540).setDisplaySize(v.w + 8, v.h + 8);
      const uw = (v.r - v.l) * cpu, uh = (v.b - v.t) * cpu;
      const S = this.S = { l: (v.sl - 960) * cpu, r: (v.sr - 960) * cpu, t: (v.st - 540) * cpu, b: (v.sb - 540) * cpu };
      const M = 12, land = this.land = uw > uh * 1.05; this.uw = uw; this.uh = uh;
      const W = S.r - S.l, Hh = S.b - S.t;
      this.exitB.setPosition(S.l + M + 25, S.t + M + 25);
      if (land) {
        const cw = clamp(W * 0.46, 310, 500), navH = 82;
        this.cardR = { x: S.r - M - cw, y: S.t + M, w: cw, h: Hh - 2 * M - navH };
        this.stageR = { x: S.l + M + 54, y: S.t + 52, w: this.cardR.x - M - (S.l + M + 54), h: Hh - 52 - M };
        this.nextB.setPosition(S.r - M - 44, S.b - M - 40); this.backB.setPosition(S.r - M - 44 - 36 - 30 - 12, S.b - M - 36);
        this.soundB.setPosition(this.backB.x - 62, S.b - M - 36);
        this.dotsAt = { x: this.stageR.x + this.stageR.w / 2, y: S.t + M + 25 };
      } else {
        const sh = clamp(Hh * (this.base === 'wudu' ? 0.45 : 0.4), 230, 560), navH = 92;
        this.stageR = { x: S.l + M, y: S.t + 60, w: W - 2 * M, h: sh };
        this.cardR = { x: S.l + M, y: this.stageR.y + sh + 4, w: W - 2 * M, h: S.b - M - navH - (this.stageR.y + sh + 4) };
        this.nextB.setPosition((S.l + S.r) / 2 + 74, S.b - M - 44); this.backB.setPosition((S.l + S.r) / 2 + 8, S.b - M - 36);
        this.soundB.setPosition((S.l + S.r) / 2 - 54, S.b - M - 36);
        this.dotsAt = { x: (S.l + S.r) / 2 + 22, y: S.t + M + 25 };
      }
      this.drawCard();
      this.fitStage();
      this.renderAll();
    }
    drawCard(h) {
      const r = this.cardR, g = this.cardG; g.clear(); h = this.cardH = h || r.h;
      g.fillStyle(0x3c2d6e, 0.13); g.fillRoundedRect(r.x, r.y + 6, r.w, h, 24);
      g.fillStyle(0xfffaf0, 1); g.fillRoundedRect(r.x, r.y, r.w, h, 24);
      g.lineStyle(3, 0x7b6a96, 0.14); g.strokeRoundedRect(r.x + 1.5, r.y + 1.5, r.w - 3, h - 3, 22);
    }
    // a card only as tall as its words (up to the room there is); the panel then scrolls only when it must
    fitCard(p, pad) {
      this.drawCard(Math.min(this.cardR.h, Math.max(130, p.y + 2 * pad + 4)));
      p.h = this.cardH - 2 * pad; if (p.more) p.more.y = p.c.y + p.h - 8; if (this.zone) { this.zone.setSize(p.w, p.h); this.zone.y = p.c.y + p.h / 2; this.zone.input && this.zone.input.hitArea.setSize(p.w, p.h); }
    }
    // the stage: the pictures (in baked pixels, around the anchor) are fitted into the stage rectangle
    fitStage(box) {
      box = box || this.box; if (!box) return;
      const r = this.stageR, s = this.ss = Math.min(r.w / box.w, r.h / box.h) * 0.96;
      const cx = r.x + r.w / 2 - (box.x + box.w / 2) * s, cy = r.y + r.h / 2 - (box.y + box.h / 2) * s;
      this.stageIn.setPosition(cx, cy).setScale(s); this.anchor = { x: cx, y: cy };
      this.placeStage && this.placeStage();
    }
    // text sizes in css px, a little larger on a tablet
    get fs() { const a = Math.min(this.uw, this.uh); return a >= 700 ? 1.12 : a >= 500 ? 1.0 : a >= 380 ? 0.96 : 0.9; }
    // the dots of the progress: n of them, `cur` current, `done` before it; `gaps` are extra spaces before these indexes
    drawDots(n, cur, gaps, colors) {
      this.dots.removeAll(true); gaps = gaps || [];
      const avail = (this.S.r - this.S.l) - 24 - 62 - 12 - (this.land ? this.cardR.w + 12 : 0);
      let sz = n > 12 ? 13 : 16, step = sz + 8, gp = 8, tot = 0; const calc = () => { tot = 0; for (let i = 0; i < n; i++) tot += step + (gaps.indexOf(i) >= 0 ? gp : 0); };
      calc(); if (tot > avail) { sz = 13; step = 20; gp = 6; calc(); } if (tot > avail) { sz = 11; step = 17; gp = 4; calc(); }
      let x = -tot / 2 + step / 2;
      for (let i = 0; i < n; i++) {
        if (gaps.indexOf(i) >= 0) x += gp;
        const col = colors && colors[i] != null ? colors[i] : 0x3fa7a3;
        const d = this.add.image(x, 0, 'gd-dot').setScale(sz / 64);
        if (i < cur) d.setTint(col); else if (i === cur) { d.setTint(GOLD).setScale(sz * 1.35 / 64); const rg = this.add.image(x, 0, 'gd-ring').setScale(sz * 1.9 / 64).setTint(0xb98300); this.dots.add(rg); } else d.setTint(0xffffff).setAlpha(0.85);
        this.dots.add(d); x += step;
      }
      const S = this.S, half = tot / 2; this.dots.setPosition(clamp(this.dotsAt.x, S.l + 12 + 50 + 12 + half, Math.max(S.l + 12 + 50 + 12 + half, S.r - 12 - half)), this.dotsAt.y);
    }
    // the card's panel: lines stack from the top, whole lines only; a chevron says there is more
    newPanel(x, y, w, h) {
      if (this.panel) this.panel.destroy();
      const p = this.panel = new Panel(this, this.cc); p.setRect(x, y, w, h);
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive(); this.cc.add(zone); this.zone = zone;
      zone.on('pointerdown', pt => { this.drag = { y0: pt.y, off0: p.off, moved: false }; });
      zone.on('pointerup', pt => { if (this.drag && !this.drag.moved && this.onPanelTap) this.onPanelTap(pt); });
      p.more = this.add.image(x + w / 2, y + h - 9, 'gd-chev').setScale(0.5).setVisible(false); this.cc.add(p.more);
      this.tweens.add({ targets: p.more, y: p.more.y - 5, duration: 500, yoyo: true, repeat: -1 });
      return p;
    }
    // a block of text lines into the panel: kind 'ar' | 'tr' | 'en' | 'p'
    addBlock(p, str, size, color, o) {
      o = o || {}; const lh = Math.round(size * (o.ar ? 1.8 : 1.36)), w = p.w - 8;
      const lines = wrapLines(this, str, size, Object.assign({ width: w }, o)); let y = (o.gap || 0) + p.y;
      lines.forEach(l => { const t = mk(this, null, l, size, color, Object.assign({ w: o.w }, o)); t.setPosition(p.w / 2, 0); t.__dy = o.ar ? -size * 0.18 : 0; if (o.italic) t.setFontStyle('italic ' + (o.w || '600')); p.add(t, y, lh); y += lh; });
      return p;
    }

    /* ----- audio ----- */
    stopSay() { this.sayId++; hush(); }
    showPlace() { if (this.hidP) { this.hidP = false; try { this.scene.setVisible(true, 'Place'); } catch (e) { /* gone */ } } }
    cleanup() {
      this.stopSay(); waterSound(false); this.showPlace();
      try { this.textures.remove(this.akey); } catch (e) { /* already gone */ }
      if (this.onClean) this.onClean();
    }
    leave() {
      this.stopSay(); waterSound(false); sfx('pop'); this.showPlace();
      this.scene.stop(this.scene.key);
      if (this.backFn) this.backFn(); else Kit.play.exit();
    }
    done_(station, data) { try { window.HHFlow && HHFlow.mark(station, data); } catch (e) { /* not kept */ } try { window.KahfBridge && KahfBridge.complete(); } catch (e) { /* not in the app */ } }
    toast(str, ms) {
      if (this.toastC) this.toastC.destroy();
      const c = this.toastC = this.add.container(0, 0); this.ui.add(c);
      const t = mk(this, c, str, 15 * this.fs, '#fff', { width: Math.min(300, this.stageR.w - 24), w: '700' }).setOrigin(0.5, 0.5);
      const g = this.add.graphics(); g.fillStyle(0x4b3f6e, 0.92); g.fillRoundedRect(-t.width / 2 - 14, -t.height / 2 - 9, t.width + 28, t.height + 18, 16); c.addAt(g, 0);
      const tb = this.tapB, tw = t.width + 28;
      if (tb) c.setPosition(clamp(tb.x - 44 - tw / 2, this.stageR.x + tw / 2, this.stageR.x + this.stageR.w - tw / 2), tb.y); else c.setPosition(this.stageR.x + this.stageR.w / 2, this.stageR.y + 26);
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 160 }); this.tweens.add({ targets: c, alpha: 0, delay: ms || 3200, duration: 300, onComplete: () => c.destroy() });
    }
  }

  /* =====================================================================================================
     WUDU
     ===================================================================================================== */
  const T = window.WUDU_TEXT;
  // the picture of each step, and the R / L marks on it (the child's RIGHT is first, as the text says)
  const WFR = { intention: 'stand', hands: 'hands', mouth: 'mouth', nose: 'noseR', face: 'face', armR: 'armR', armL: 'armL', head: 'head', ears: 'ears', footR: 'footR', footL: 'footL', dua: 'stand' };
  const WMK = { mouth: [['R', 'handR']], noseR: [['R', 'handR']], noseL: [['L', 'handL']], armR: [['R', 'elbowR']], armL: [['L', 'elbowL']], footR: [['R', 'footR'], ['L', 'handL']], footL: [['L', 'footL']] };

  class Wudu extends Guide {
    constructor() { super('Wudu'); this.base = 'wudu'; this.akey = 'gd-w'; this.bgKey = 'gd-bg-w'; }
    build() {
      this.steps = T.steps; this.last = this.steps.length - 1;
      this.i = 0; this.tapOn = false; this.counts = {}; this.ran = {}; this.saved = 0; this.finished = false; this.frameName = 'stand'; this.noseT = 0;
      const names = this.I.wudu.filter(n => !/^foot/.test(n)).concat(['basin']);
      this.box = this.union(names);
      // the pictures, bottom to top: the basin (or the bench and the foot basin), the child, the water, the marks
      this.basin = this.pic('basin');
      this.bench = this.pic('bench'); this.footb = this.pic('footbasin');
      this.child = this.pic('stand'); this.hitBox(this.child, 'stand');
      this.child.on('pointerdown', () => this.countOne());
      this.stream = this.add.image(0, 0, this.akey, 'stream0').setOrigin(0.5, 0); this.splash = this.add.image(0, 0, this.akey, 'splash0');
      this.stageIn.add([this.stream, this.splash]); this.stream.setVisible(false); this.splash.setVisible(false);
      this.marks = this.add.container(0, 0); this.stageIn.add(this.marks);
      this.hitBox(this.basin, 'basin'); this.basin.on('pointerdown', () => this.toggleTap());
      this.tapB = roundBtn(this, this.ui, { frame: 'drops', size: 52, fn: () => this.toggleTap() });
      this.drops = this.add.container(0, 0); this.ui.add(this.drops);
      this.time.addEvent({ delay: 150, loop: true, callback: () => { this.fl = !this.fl; if (this.tapOn) { this.stream.setFrame(this.fl ? 'stream1' : 'stream0'); this.splash.setFrame(this.fl ? 'splash1' : 'splash0'); } } });
      const s0 = Q.has('step') ? clamp(+Q.get('step') || 0, 0, this.last) : 0;
      this.i = s0;
      if (Q.get('fin') === '1') this.time.delayedCall(300, () => this.finish());
      if (Q.get('tap') === '1') this.time.delayedCall(200, () => this.toggleTap(true));
    }
    onClean() { /* the timers die with the scene */ }
    get step() { return this.steps[this.i]; }
    // the screens of a step number, for the dots: 12 screens, 10 numbers; the right and left screens are neighbours
    drawProgress() {
      const gaps = []; this.steps.forEach((s, i) => { if (i && this.steps[i - 1].n !== s.n) gaps.push(i); });
      this.drawDots(this.steps.length, this.finished ? this.steps.length : this.i, gaps);
    }
    layout(v) { super.layout(v); }
    renderAll() {
      this.drawProgress(); this.placeButtons();
      if (this.finished) this.renderFinish(); else this.show(this.i, true);
    }
    placeButtons() {
      const r = this.stageR;
      this.tapB.setPosition(r.x + r.w - 34, r.y + 40);
      this.drops.setPosition(r.x + 36, r.y + r.h - 30);
    }
    placeStage() {
      const m = this.MK[this.frameName]; if (!m) return;
      this.placeWater();
    }
    // the frame shown now, and what goes with it (which props, which marks, where the water falls)
    setFrame(name, pop) {
      this.frameName = name; this.child.setFrame(name); this.hitBox(this.child, name);
      const foot = /^foot/.test(name), s = this.step;
      this.basin.setVisible(!foot); this.bench.setVisible(foot); this.footb.setVisible(foot);
      (foot ? [this.stream, this.child, this.splash, this.marks] : [this.child, this.stream, this.splash, this.marks]).forEach(o => this.stageIn.bringToTop(o));
      this.marks.removeAll(true);
      (WMK[name] || []).forEach(([k, part]) => { const p = this.MK[name][part], b = this.add.image(p[0] + (part === 'handR' ? 14 : part === 'handL' ? -14 : 0) / this.ss, p[1] - (/^hand/.test(part) ? 14 : 0) / this.ss, 'gd-' + k).setScale(30 / 80 / this.ss); this.marks.add(b); });
      this.placeWater();
      if (pop) { this.child.setScale(0.97, 1.02); this.tweens.add({ targets: this.child, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.easeOut' }); }
      if (this.tapB) this.suggest();
    }
    placeWater() {
      const I = this.I, n = this.frameName, m = this.MK[n]; if (!m) return;
      let top, bot, sp;
      if (/^foot/.test(n)) { top = I.footspout; sp = [I.footbowl[0] + 4, I.footbowl[1] - 16]; bot = sp[1]; }
      else if (n === 'hands') { top = I.spout; const hy = (m.handR[1] + m.handL[1]) / 2 - 8; sp = [(m.handR[0] + m.handL[0]) / 2, hy + 10]; bot = hy; }
      else { top = I.spout; sp = I.bowl; bot = I.bowl[1] - 6; }
      this.stream.setPosition(top[0], top[1]).setScale(1, Math.max(0.05, (bot - top[1]) / 127));
      this.splash.setPosition(sp[0], sp[1]);
      this.stream.setVisible(this.tapOn); this.splash.setVisible(this.tapOn);
    }
    // the tap glows where it should be changed (a glow, never a rule)
    suggest() {
      const s = this.step, want = this.finished ? null : s.water ? ((this.ran[this.i] || 0) > 0 ? null : 'on') : (s.id === 'head' || s.id === 'ears' ? null : 'off');
      const glow = (want === 'on' && !this.tapOn) || (want === 'off' && this.tapOn) || (this.tapOn && this.nudgeOff);
      this.tapB.pulse(glow);
      this.tapB.plate.setTint(this.tapOn ? 0xbfe6fb : 0xffffff);
    }
    toggleTap(force) {
      if (this.finished && force == null) return;
      const on = force == null ? !this.tapOn : !!force;
      if (on === this.tapOn) return;
      this.tapOn = on; sfx('gturn'); waterSound(on);
      this.stream.setVisible(on); this.splash.setVisible(on);
      if (on) { this.ranT = this.time.addEvent({ delay: 250, loop: true, callback: () => { this.ran[this.i] = (this.ran[this.i] || 0) + 0.25; } }); }
      else {
        if (this.ranT) { this.ranT.remove(); this.ranT = null; }
        // water ran in this step and was then turned off: saved water (the first time, the lesson is said)
        if ((this.ran[this.i] || 0) > 0.8 && !this.savedAt) { this.savedAt = {}; }
        if ((this.ran[this.i] || 0) > 0.8 && this.savedAt && !this.savedAt[this.i]) { this.savedAt[this.i] = true; this.saved++; if (this.saved === 1) this.toast(T.water.lesson, 3600); }
      }
      this.suggest();
    }

    /* ----- a step ----- */
    show(i, quiet) {
      this.i = clamp(i, 0, this.last); const s = this.step;
      this.nudgeOff = false;
      this.stopSay();
      // the child's picture; the nose has two (right sniffs, left blows out) that take turns
      if (this.noseT) { this.noseT.remove(); this.noseT = null; }
      this.setFrame(WFR[s.id] || 'stand', !quiet);
      if (s.id === 'nose') { this.noseT = this.time.addEvent({ delay: 1700, loop: true, callback: () => this.setFrame(this.frameName === 'noseR' ? 'noseL' : 'noseR', true) }); }
      this.drawProgress();
      this.backB.enable(this.i > 0);
      this.nextB.setFrame_ && 0;
      this.renderCard(); this.renderDrops();
      this.suggest();
      this.nextB.pulse(false);
      hasClip(s.voice).then(a => hasClip(s.arabicVoice).then(b => { if (this.step === s) { this.soundB.setVisible(a || b); } }));
      if (!quiet) this.time.delayedCall(700, () => this.say(s));
    }
    renderCard() {
      const s = this.step, r = this.cardR, f = this.fs; this.cc.removeAll(true); this.panel = null;
      const pad = 16, w = r.w - 2 * pad;
      const holder = this.add.container(r.x + r.w / 2, r.y + pad + 4); this.cc.add(holder);
      const p = this.newPanel(r.x + pad, r.y + pad, w, r.h - 2 * pad);
      // the English line, then (where something is said aloud) the Say card
      const ls = Math.round((s.arabic ? 21 : 24) * f), rl = richLine(this, p.c, s.line, w - 12, ls, INK); holder.destroy();
      rl.toks.forEach(t => { t.x += p.w / 2; t.__dy = 0; p.items.push({ o: t, y: t.y + 4, h: rl.lh }); });
      p.y = rl.h + 14;
      const ar = s.arabic && T[s.arabic];
      if (ar) {
        const extra = s.arabic === 'shahada' && T.shahadaExtra && T.shahadaExtra.show ? T.shahadaExtra : null;
        p.y += 6;
        const tag = this.add.container(p.w / 2, 0); p.c.add(tag);
        const sp = this.add.image(-24, 12, 'gd-speaker').setScale(0.4), lb = mk(this, tag, T.say + ':', 18 * f, SOFT, { ox: 0, w: '800' }); lb.setPosition(-8, 2); tag.add(sp); p.add(tag, p.y, 26); p.y += 30;
        [ar, extra].filter(Boolean).forEach(a => {
          this.addBlock(p, a.ar, Math.round(34 * f), INK, { ar: true, gap: 4 });
          this.addBlock(p, a.tr, Math.round(17 * f), '#6a5a86', { w: '700', gap: 6, italic: true });
          this.addBlock(p, a.en, Math.round(17 * f), INK, { w: '600', gap: 6 });
        });
      }
      this.fitCard(p, pad); p.scroll(0, true);
    }
    renderDrops() {
      this.drops.removeAll(true); const s = this.step, n = this.need(s); if (!n) return;
      const have = Math.min(n, this.counts[this.i] || 0), gap = 50;
      for (let k = 0; k < n; k++) {
        const d = this.add.image(k * gap, 0, 'ui', Lf().ico('drop')); d.setScale(36 / d.height * 1.1);
        if (k >= have) d.setTint(0xb9c2d4).setAlpha(0.7);
        d.setInteractive(); d.on('pointerdown', () => this.countOne()); this.drops.add(d);
      }
      this.nextB.pulse(have >= n);
    }
    need(s) { return this.finished ? 0 : (s.count || (s.once ? 1 : 0)); }
    // one wash counted (tap a drop or the child): never required
    countOne() {
      const s = this.step, n = this.need(s); if (!n) return;
      const have = this.counts[this.i] || 0; if (have >= n) { sfx('tap'); return; }
      this.counts[this.i] = have + 1; sfx('gdrop'); this.renderDrops();
      const d = this.drops.list[have]; if (d) this.tweens.add({ targets: d, scale: d.scale * 1.35, duration: 120, yoyo: true });
      this.tweens.add({ targets: this.child, y: -6, duration: 90, yoyo: true });
    }
    // the English instruction has no recording yet; a recorded clip for a step is played if there is one, then the recited words
    async say(s) {
      const id = ++this.sayId;
      if (s.voice && await playClip(s.voice)) { if (id !== this.sayId) return; await wait(this, 300); }
      if (id !== this.sayId) return;
      if (s.arabicVoice) await playClip(s.arabicVoice);
    }
    replay() { const s = this.step; if (this.finished) return; this.say(s); }
    goNext() {
      if (this.finished) return;
      const s = this.step;
      if (s.id === 'dua') { this.finish(); return; }
      sfx('gdone');
      const leftOn = this.tapOn && s.water;
      this.show(this.i + 1);
      if (leftOn) { this.nudgeOff = true; this.toast(T.water.turnOff, 3400); this.suggest(); }
    }
    goBack() { if (this.i === 0 || this.finished) return; this.show(this.i - 1); }

    /* ----- the end: quiet. A calm card, then on to the prayer, again, or out ----- */
    finish() {
      if (this.finished) return;
      this.finished = true; this.stopSay();
      if (this.tapOn) this.toggleTap(false);
      if (this.noseT) { this.noseT.remove(); this.noseT = null; }
      this.setFrame('stand', true);
      this.done_('wudu', { mode: 'with', water: Math.round(Object.keys(this.ran).reduce((a, k) => a + this.ran[k], 0)), saved: this.saved });
      sfx('gdone');
      this.drawProgress(); this.drops.removeAll(true); this.nextB.pulse(false); this.nextB.setVisible(false); this.backB.setVisible(false); this.tapB.setVisible(false);
      this.renderFinish();
    }
    renderFinish() {
      const r = this.cardR, f = this.fs; this.cc.removeAll(true); this.panel = null; this.soundB.setVisible(false); this.drawCard();
      const w = r.w - 32;
      const p = this.newPanel(r.x + 16, r.y + 16, w, r.h - 32 - 96);
      const t = mk(this, null, T.finish.title, Math.round(26 * f), INK, { width: w - 10 }); t.setPosition(p.w / 2, 0); p.add(t, 0, t.height + 6); p.y = t.height + 14;
      this.addBlock(p, T.finish.calm, Math.round(18 * f), INK, { w: '700', gap: 4 });
      this.addBlock(p, T.finish.purity, Math.round(17 * f), SOFT, { w: '700', gap: 8 });
      if (this.saved) this.addBlock(p, T.water.sunnah, Math.round(15 * f), '#6a5a86', { w: '600', gap: 10 });
      p.scroll(0, true);
      // three round buttons with their words: the prayer, once more, home
      const by = r.y + r.h - 60, bx = [r.x + r.w * 0.2, r.x + r.w * 0.5, r.x + r.w * 0.8];
      const mkb = (x, frame, label, fn, tint) => { const b = roundBtn(this, this.cc, { frame, size: 56, fn, tint }); b.setPosition(x, by); const l = mk(this, this.cc, label, 13 * f, SOFT, { width: r.w * 0.3, w: '800' }); l.setPosition(x, by + 34); return b; };
      if (this.scene.get('Salah')) mkb(bx[0], 'mat', T.finish.pray, () => { this.stopSay(); const back = this.backFn; this.scene.stop(this.scene.key); this.scene.start('Salah', { back: back || (() => Kit.play.exit()) }); }, 0xd9f3dc);
      mkb(bx[1], 'drop', T.finish.again, () => { this.finished = false; this.nextB.setVisible(true); this.backB.setVisible(true); this.tapB.setVisible(true); this.i = 0; this.counts = {}; this.ran = {}; this.savedAt = {}; this.saved = 0; this.drawProgress(); this.show(0, true); });
      mkb(bx[2], 'house', '', () => this.leave());
    }
  }

  /* =====================================================================================================
     SALAH
     ===================================================================================================== */
  const TXT = window.PRAYER_TEXT;
  const COL = { fard: 0xe9a917, sunnah: 0x4f9a62, witr: 0x4b4f9e, nafl: 0x4f9a62 };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  function currentPrayer() {
    const ok = { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1, tahajjud: 1 }, p = (Q.get('p') || '').toLowerCase();
    if (ok[p]) return p;
    try {
      const H = window.HHPrayer;
      if (H) {
        let c = typeof H.current === 'function' ? H.current() : null; if (c && typeof c === 'object') c = c.name || c.prayer || c.id; c = String(c || '').toLowerCase(); if (ok[c]) return c;
        let n = typeof H.next === 'function' ? H.next() : null; n = String(n && (n.name || n) || '').toLowerCase(); if (ok[n]) return n;
      }
    } catch (e) { /* none */ }
    return 'dhuhr';
  }
  function madhab() {
    const m = Q.get('madhab'); if (m === 'hanafi' || m === 'shafi') return m;
    try { const s = window.HHPrayer && HHPrayer.settings(); if (s && s.madhab) return s.madhab === 'hanafi' ? 'hanafi' : 'shafi'; } catch (e) { /* none */ } return 'shafi';
  }
  // how many rak'ah of a unit were prayed today (0 = not yet), from the day's log, as pray/chart.js counts it
  function prayedToday(p, u, unit) {
    let log = {}; try { log = window.HHFlow ? HHFlow.log() : {}; } catch (e) { /* none */ }
    const L = (log && log.salah) || []; let hit = null;
    for (let i = L.length - 1; i >= 0 && !hit; i--) { const e = L[i], k = e.kind || 'fard'; if (unit.kind === 'witr') { if (k === 'witr') hit = e; } else if ((e.p || e.prayer) === p && k === unit.kind && (e.u == null || e.u === u || unit.kind === 'fard')) hit = e; }
    return hit ? (+hit.rakah || unit.rakah) : 0;
  }
  // which frame of the sheet shows each position (the Hanafi boy's hands are lower: TEACHER REVIEW)
  const posePic = (pose, hb, girl) => 'p-' + (pose === 'sujud' && hb && girl ? 'sujudH' : ({ takbir: hb ? 'takbirH' : 'takbir', stand: hb ? 'standH' : 'stand' }[pose] || pose));

  class Salah extends Guide {
    constructor() { super('Salah'); this.base = 'salah'; this.akey = 'gd-s'; this.bgKey = 'gd-bg-s'; }
    build() {
      this.T = TXT.S; this.H = TXT.HOW; this.P = currentPrayer(); this.PN = TXT.NAMES[this.P]; this.M = madhab();
      this.UNITS = TXT.units(this.M, this.P);
      this.setUnitVars(Q.has('u') ? +Q.get('u') : -1, +Q.get('w'));
      this.logs = !Q.has('step');
      let bearing = null; try { if (window.HHPrayer && HHPrayer.settings && HHPrayer.settings()) { const b = HHPrayer.qibla(); if (isFinite(b)) bearing = b; } } catch (e) { /* none */ }
      this.bearing = bearing;
      this.box = this.union((this.girl ? this.I.salahgirl : this.I.salah).concat(['mat'])); this.matBox = this.union(['mat']);
      this.mat = this.pic('mat'); this.mat.setVisible(false);
      this.glow = this.add.image(0, 0, 'ui-glow').setTint(0xffe38a).setAlpha(0).setScale(1.6, 0.9); this.stageIn.add(this.glow);
      this.ghost = this.pic('p-rise').setAlpha(0); this.child = this.pic('p-rise').setVisible(false);
      this.hitBox(this.child, 'p-rise');
      this.child.on('pointerdown', () => this.replayMove());
      this.marks = this.add.container(0, 0); this.stageIn.add(this.marks);
      this.matIcon = this.add.image(0, 0, 'ui', Lf().ico('mat')); this.ui.add(this.matIcon); this.matIcon.setVisible(false);
      this.matIcon.setInteractive().on('pointerdown', () => { if (this.phase === 'mat') this.rollOut(); });
      this.dial = this.add.image(0, 0, 'gd-dial'); this.ui.add(this.dial); this.dial.setVisible(false); this.dial.setInteractive();
      this.dialMark = this.add.image(0, 0, 'ui', Lf().ico('mat')); this.ui.add(this.dialMark); this.dialMark.setVisible(false);
      this.dialNote = this.add.graphics(); this.ui.add(this.dialNote);
      this.setupDial();
      this.alt = null; this.cur = -1; this.phase = 'mat'; this.qa = Math.PI / 4; this.qibla = false; this.rolled = false;
      this.shown = null; this.lineIdx = 0; this.playing = false; this.rak = 0;
      const k0 = +(Q.get('step') || 0);
      this.startStep = k0;
    }
    /* ----- the unit: which one, how many rak'ah, in which parts ----- */
    sum(a) { return sum(a); }
    K(unit) { return TXT.KINDS[(unit || this.UNIT).kind]; }
    short(unit, n) { unit = unit || this.UNIT; n = n || unit.rakah; return unit.kind === 'witr' ? 'Witr' : this.P === 'tahajjud' ? n + ' rak’ah' : n + ' ' + this.K(unit).name; }
    intent() {
      if (this.UNIT.kind === 'witr') return this.N + ' rak’ah of witr';
      if (this.P === 'tahajjud') return this.N + ' rak’ah of tahajjud';
      return this.N + ' rak’ah ' + this.K().name.toLowerCase() + ' of ' + this.PN;
    }
    defaultU() {
      const U = this.UNITS;
      for (let i = 0; i < U.length; i++) if (!U[i].optional && !U[i].ifNoWitr && !(!U[i].repeat && prayedToday(this.P, i, U[i]))) return i;
      for (let i = 0; i < U.length; i++) if (U[i].kind === 'fard') return i;
      return 0;
    }
    setUnitVars(u, w) {
      this.U = this.UNITS[u] ? u : this.defaultU(); this.UNIT = this.UNITS[this.U] || { kind: 'fard', rakah: TXT.RAKAH[this.P] || 2 };
      this.W = this.UNIT.choose && this.UNIT.choose.indexOf(w) >= 0 ? w : this.UNIT.rakah;
      this.PARTS = this.UNIT.choose && this.W !== this.UNIT.rakah ? [this.W] : (this.UNIT.parts || [this.UNIT.rakah]).slice();
      this.N = sum(this.PARTS); this.STEPS = this.plan(this.PARTS, this.UNIT);
    }
    // the positions of a unit, exactly as pray/salah.js builds them (the common Sunnah order shared by the four madhhabs)
    plan(parts, unit) {
      const T = this.T, S = [], fard = unit.kind === 'fard'; let g = 0;
      const surahFor = (r, len) => { if (len === 1) return { lines: TXT.IKHLAS, sub: 'Surat al-Ikhlas' }; if (r === 1) return { lines: TXT.KAWTHAR, sub: 'Surat al-Kawthar' }; if (r === 2 || !fard) return { lines: TXT.IKHLAS, sub: 'Surat al-Ikhlas' }; return null; };
      const add = (how, pose, lines, rak, o) => S.push(Object.assign({ how, pose, lines, rak }, o || {}));
      const mov = t => Object.assign({ moving: true }, t);
      parts.forEach((len, pi) => {
        for (let r = 1; r <= len; r++) {
          g++;
          const last = r === len, lastOfAll = last && pi === parts.length - 1, sur = surahFor(r, len);
          if (r === 1) {
            add(pi ? 'newPart' : 'takbir', 'takbir', [T.takbir], g, pi ? { rest: unit.kind === 'witr' ? len + ' rak’ah of witr' : len + ' more rak’ah' } : null);
            add('stand', 'stand', [T.thana, T.taawwudh], g, { sub: 'Opening du’a' });
            add('stand', 'stand', TXT.FATIHA.concat([T.amin]), g, { sub: 'Al-Fatihah' });
          } else add('standUp', 'stand', [mov(T.takbir)].concat(TXT.FATIHA, [T.amin]), g, { sub: 'Al-Fatihah' });
          if (sur) add('stand', 'stand', sur.lines, g, { sub: sur.sub });
          if (lastOfAll && unit.qunut === 'hanafi') { add('qtakbir', 'takbir', [T.takbir], g, { sub: 'Witr' }); add('qunutH', 'stand', TXT.QUNUT.hanafi, g, { sub: 'Witr' }); }
          add('ruku', 'ruku', [mov(T.takbir), T.ruku], g);
          add('rise', 'rise', [T.sami, T.rabbana], g);
          if (lastOfAll && unit.qunut === 'shafi') add('qunutS', 'qunut', TXT.QUNUT.shafi, g, { sub: 'If your family says it' });
          add('sujud', 'sujud', [mov(T.takbir), T.sujud], g, { sub: 'First sujood' });
          add('jalsa', 'sit', [mov(T.takbir), T.jalsa], g);
          add('sujud', 'sujud', [mov(T.takbir), T.sujud], g, { sub: 'Second sujood' });
          if (r === 2 && len > 2) add('tash', 'tash', [mov(T.takbir), T.tashahhud], g, { done: g, sub: 'The middle sitting. Then stand up for rak’ah ' + (g + 1) + '.' });
          if (last) {
            add('tash', 'tash', [mov(T.takbir), T.tashahhud, T.ibrahimiyya], g, { done: g, sub: 'The last sitting: the tashahhud, then the salawat.' });
            add('salamR', 'salamR', [T.salam], g, { done: g });
            add('salamL', 'salamL', [T.salam], g, { done: g });
          }
        }
      });
      return S;
    }

    /* ----- the stage ----- */
    placeStage() {
      const a = this.anchor, r = this.stageR; if (!a) return;
      // the compass and the mat icon sit in the middle of the stage
      const dsz = Math.min(r.w, r.h) * 0.62, cx = r.x + r.w / 2, cy = r.y + r.h / 2 + dsz * 0.06;
      this.dial.setPosition(cx, cy).setScale(dsz / 420); this.dialMark.setPosition(cx, cy - dsz / 2 - dsz * 0.16).setScale(dsz * 0.0036);
      this.dialR = dsz / 2; this.dialC = { x: cx, y: cy };
      this.matIcon.setPosition(cx, cy).setScale(Math.min(r.w, r.h) * 0.0046);
      this.glow.setPosition(0, 6);
    }
    renderAll() {
      if (this.startStep != null) { const k = this.startStep; this.startStep = null; this.openAt(k); return; }
      this.refresh();
    }
    refresh() {
      this.drawBeads(); this.nextB.setVisible(true); this.backB.enable(this.phase === 'pray' && this.cur > 0 || this.phase === 'done');
      ({ mat: () => this.showMat(true), qibla: () => this.showQibla(true), ready: () => this.showReady(true), pray: () => this.go(this.cur, false, true), done: () => this.finish(true) })[this.phase]();
    }
    openAt(k) {
      if (k >= 3 + this.STEPS.length) { this.rolled = true; this.qibla = true; this.cur = this.STEPS.length - 1; this.finish(); }
      else if (k >= 3) { this.rolled = true; this.qibla = true; this.go(k - 3, false); }
      else if (k === 2) { this.rolled = true; this.qibla = true; this.showReady(); }
      else if (k === 1) { this.rolled = true; this.showQibla(); }
      else this.showMat();
    }
    drawBeads() {
      const gaps = [], done = this.phase === 'pray' || this.phase === 'done' ? this.rak : -1; let a = 0; this.PARTS.slice(0, -1).forEach(k => { a += k; gaps.push(a); });
      const colors = []; for (let i = 0; i < this.N; i++) colors.push(COL[this.UNIT.kind] || 0x3fa7a3);
      this.drawDots(this.N, done, gaps, colors);
    }
    // what the stage shows in each phase
    setStageFor(phase) {
      const pray = phase === 'ready' || phase === 'pray' || phase === 'done';
      this.fitStage(phase === 'mat' ? this.matBox : this.box);
      this.mat.setVisible(pray); this.child.setVisible(pray); this.matIcon.setVisible(phase === 'mat' && !this.rolled);
      this.dial.setVisible(phase === 'qibla'); this.dialMark.setVisible(phase === 'qibla'); this.dialNote.setVisible(phase === 'qibla');
      this.glow.setAlpha(phase === 'ready' ? 0.9 : 0);
      if (phase === 'qibla') { this.mat.setAlpha(0.55); } else this.mat.setAlpha(1);
      if (!pray) { this.marks.removeAll(true); this.ghost.setAlpha(0); }
    }
    cardTop(icon, title, hint, tsz) {
      const r = this.cardR, f = this.fs; this.cc.removeAll(true); this.panel = null; this.soundB.setVisible(false); this.drawCard();
      const pad = 16, w = r.w - 2 * pad, p = this.newPanel(r.x + pad, r.y + pad, w, r.h - 2 * pad);
      const t = mk(this, null, title, Math.round((tsz || 23) * f), INK, { width: w - 6 }); t.setPosition(p.w / 2, 0); p.add(t, 0, t.height + 4); p.y = t.height + 10;
      if (hint) this.addBlock(p, hint, Math.round(16 * f), '#5d5446', { w: '600', gap: 2 });
      return p;
    }

    /* ----- 1. roll out the mat ----- */
    showMat(again) {
      this.phase = 'mat'; this.stopSay(); this.setStageFor('mat'); this.nextB.setVisible(true);
      const p = this.cardTop('mat', 'Roll out your mat', 'Find a clean place. The top of the mat, with the arch, goes toward the qibla.'); this.fitCard(p, 16); p.scroll(0, true);
      this.matIcon.setVisible(!this.rolled); this.mat.setVisible(this.rolled);
      this.tweens.killTweensOf(this.matIcon);
      if (!this.rolled) this.tweens.add({ targets: this.matIcon, scale: this.matIcon.scale * 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.nextB.pulse(true); this.drawBeads();
    }
    rollOut() {
      if (this.phase !== 'mat' || this.rolled) return;
      this.rolled = true; sfx('gcloth'); this.tweens.killTweensOf(this.matIcon); this.matIcon.setVisible(false); this.nextB.pulse(false);
      this.mat.setVisible(true).setAlpha(1).setScale(0.2); this.mat.setAngle(-8);
      this.tweens.add({ targets: this.mat, scale: 1, angle: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => { sfx('pop'); this.time.delayedCall(250, () => { if (this.phase === 'mat') this.showQibla(); }); } });
    }

    /* ----- 2. turn the compass to the qibla ----- */
    setupDial() {
      this.dial.on('pointerdown', p => {
        if (this.phase !== 'qibla' || this.qibla) return;
        this.turning = (this.turning || 0) + 1;
        this.dg = { a0: Math.atan2(p.y - this.dialScreen().y, p.x - this.dialScreen().x), q0: this.qa, x: p.x, y: p.y, moved: false, tick: Math.round(this.qa / (Math.PI / 8)) };
      });
      this.input.on('pointermove', p => {
        if (!this.dg || !p.isDown) return;
        if (Math.hypot(p.x - this.dg.x, p.y - this.dg.y) > 8) this.dg.moved = true;
        if (!this.dg.moved) return;
        const c = this.dialScreen(); this.qa = this.dg.q0 + wrapA(Math.atan2(p.y - c.y, p.x - c.x) - this.dg.a0); this.dial.setRotation(this.qa);
        const tk = Math.round(this.qa / (Math.PI / 8)); if (tk !== this.dg.tick) { this.dg.tick = tk; sfx('gdetent'); }
      });
      this.input.on('pointerup', () => {
        if (!this.dg) return; const d = this.dg; this.dg = null;
        if (this.phase !== 'qibla' || this.qibla) return;
        if (!d.moved) return this.turnStep();
        if (Math.abs(wrapA(this.qa)) < 0.4) this.turnTo(this.qa + wrapA(-this.qa), 220, () => this.found());
      });
    }
    dialScreen() { const c = this.dial, cam = this.cameras.main; const m = c.getWorldTransformMatrix(); return { x: (m.tx - cam.worldView.x) * cam.zoom / cam.zoom * 1, y: (m.ty - cam.worldView.y) * 1 }; }
    turnTo(a, ms, then) {
      const id = this.turning = (this.turning || 0) + 1, a0 = this.qa;
      this.tweens.addCounter({ from: 0, to: 1, duration: ms, ease: 'Sine.easeInOut', onUpdate: tw => { if (id !== this.turning) return; this.qa = a0 + (a - a0) * tw.getValue(); this.dial.setRotation(this.qa); }, onComplete: () => { if (id === this.turning) then && then(); } });
    }
    turnStep() {
      if (this.phase !== 'qibla' || this.qibla) return;
      sfx('gdetent'); const next = this.qa + Math.PI / 4;
      this.turnTo(next, 280, () => { this.qa = wrapA(next); this.dial.setRotation(this.qa); if (Math.abs(this.qa) < 0.06) this.found(); });
    }
    showQibla(again) {
      this.phase = 'qibla'; this.stopSay(); this.rolled = true; this.setStageFor('qibla'); this.drawBeads();
      this.dial.setRotation(this.qa);
      const p = this.cardTop('compass', this.qibla ? 'That is the qibla' : 'Find the qibla', this.qibla ? 'Your mat faces the Kaaba in Makkah. Now stand at the bottom of your mat.'
        : 'Turn the compass until the black Kaaba mark points to the top of your mat. Drag it round, or tap it.' + (this.bearing != null ? ' From your home, the qibla is ' + Math.round(this.bearing) + '° from north.' : ''));
      this.fitCard(p, 16); p.scroll(0, true); this.nextB.pulse(this.qibla);
    }
    found() {
      this.qibla = true; this.qa = 0; this.dial.setRotation(0); sfx('click');
      this.showQibla();
      this.time.delayedCall(1400, () => { if (this.phase === 'qibla') this.showReady(); });
    }

    /* ----- 3. ready: which unit, and the intention ----- */
    kindLine(p, unit) {
      const k = this.K(unit), f = this.fs, say = k.say;
      const row = (name, text) => {
        const c = this.add.container(0, 0), dot = this.add.image(10, 11, 'gd-dot').setScale(0.3).setTint(COL[unit.kind] || 0x4f9a62); c.add(dot);
        const t = mk(this, c, name + ': ' + text + '.', 14 * f, INK, { ox: 0, w: '700', width: p.w - 40 }); t.setPosition(24, 0);
        c.setPosition(0, 0); p.c.add(c); const h = t.height + 6; p.add(c, p.y + 6, h); p.y += h + 6;
      };
      row(k.name, say);
      if (unit.wajib && TXT.KINDS.wajib) row(TXT.KINDS.wajib.name, TXT.KINDS.wajib.say);
    }
    chip(p, parent, label, beads, col, on, fn) {
      const f = this.fs, c = this.add.container(0, 0), t = mk(this, null, label, 14 * f, INK, { w: '800' });
      const w = Math.max(70, t.width + 26), h = 46;
      const g = this.add.graphics(); g.fillStyle(0xffffff, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 16); g.lineStyle(on ? 5 : 2.5, on ? GOLD : 0x7b6a96, on ? 1 : 0.7); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16); c.add(g);
      t.setPosition(0, 1); c.add(t);
      if (beads) for (let i = 0; i < beads; i++) { const d = this.add.image((i - (beads - 1) / 2) * 12, -13, 'gd-dot').setScale(0.2).setTint(col); c.add(d); }
      c.setSize(w, h); c.cw = w; c.setInteractive();
      c.on('pointerup', pt => { if (Math.abs(pt.y - pt.downY) < 10 && Math.abs(pt.x - pt.downX) < 10) { sfx('tap'); fn(); } });
      return c;
    }
    // chips in rows that wrap, into the panel
    chips(p, items) {
      const rowsW = p.w; let x = 0, y = p.y + 6, rows = [[]], cur = rows[0], cw = 0;
      items.forEach(c => { if (cur.length && cw + c.cw + 8 > rowsW) { cur = []; rows.push(cur); cw = 0; } cur.push(c); cw += c.cw + 8; });
      rows.forEach((row, ri) => { const tw = sum(row.map(c => c.cw + 8)) - 8; let xx = -tw / 2; row.forEach(c => { c.setPosition(p.w / 2 + xx + c.cw / 2, 0); c.__dy = 23; p.c.add(c); p.items.push({ o: c, y: y + ri * 54, h: 46 }); xx += c.cw + 8; }); });
      p.y = y + rows.length * 54;
    }
    showReady(again) {
      this.phase = 'ready'; this.qibla = true; this.rolled = true; this.stopSay(); this.rak = 0; this.cur = -1; this.setStageFor('ready'); this.drawBeads();
      this.showChild('p-rise', null, false);
      const f = this.fs, H = this.H, p = this.cardTop(null, this.PN + ': ' + this.short(), '', 21);
      this.addBlock(p, H.intention.title + '. ' + H.intention.hint.replace('{prayer}', this.intent()) + ' Stand at the bottom of your mat, facing the qibla, where your feet glow.', Math.round(14 * f), '#5d5446', { w: '600', gap: 0 });
      this.kindLine(p, this.UNIT);
      if (this.UNITS.length > 1) {
        this.addBlock(p, this.PN + ': tap one to pray it', Math.round(12 * f), SOFT, { w: '800', gap: 8 });
        this.chips(p, this.UNITS.map((u, i) => this.chip(p, null, this.short(u), u.rakah, COL[u.kind] || 0x4f9a62, i === this.U, () => this.setUnit(i, this.W))));
      }
      if (this.UNIT.choose) this.chips(p, this.UNIT.choose.slice().reverse().map(w => this.chip(p, null, (w === 1 ? '1 rak’ah' : w + ' rak’ah' + (this.UNIT.parts ? ' (' + this.UNIT.parts.join(', then ') + ')' : '')), 0, 0, w === this.W, () => this.setUnit(this.U, w))));
      this.fitCard(p, 16); p.scroll(0, true); this.nextB.pulse(true);
      hasClip(this.STEPS[0].lines[0].audio).then(() => { try { HHVoice.preload(this.STEPS[0].lines.concat(this.STEPS[1].lines).map(l => l.audio).filter(Boolean)); } catch (e) { /* none */ } });
    }
    setUnit(u, w) {
      this.stopSay(); this.setUnitVars(u, w);
      try { const q = new URLSearchParams(location.search); q.set('p', this.P); q.set('u', this.U); if (this.UNIT.choose) q.set('w', this.W); else q.delete('w'); q.delete('step'); history.replaceState(null, '', '?' + q); } catch (e) { /* none */ }
      this.showReady();
    }

    /* ----- 4. the positions ----- */
    // the child's picture: a quick settle from the last position (the last one fades out beside it)
    showChild(name, from, animate) {
      this.shown = name; const hb = this.M === 'hanafi'; void hb;
      this.child.setVisible(true).setFrame(name); this.hitBox(this.child, name);
      this.tweens.killTweensOf(this.child); this.tweens.killTweensOf(this.ghost); this.child.setAlpha(1).setScale(1);
      if (animate && from && from !== name && !(window.Kit && Kit.reducedMotion)) {
        this.ghost.setFrame(from).setAlpha(0.32); this.tweens.add({ targets: this.ghost, alpha: 0, duration: 650, delay: 120 });
        this.child.setAlpha(0.2); this.tweens.add({ targets: this.child, alpha: 1, duration: 320 });
        this.child.setScale(0.97, 1.03); this.tweens.add({ targets: this.child, scaleX: 1, scaleY: 1, duration: 420, ease: 'Back.easeOut' });
      } else this.ghost.setAlpha(0);
    }
    frameOf(pose) { return posePic(pose, this.M === 'hanafi', this.girl); }
    // the marks after a move: R on the right hand; 1 2 3 going down (knees, hands, forehead); 1 or 2 for the salam
    putMarks(pose, from) {
      this.marks.removeAll(true); const n = this.shown, m = this.MK[n]; if (!m) return;
      const sz = 30 / 80 / this.ss, add = (key, p, dx, dy, delay) => { const b = this.add.image(p[0] + (dx || 0) / this.ss, p[1] + (dy || 0) / this.ss, key).setScale(sz).setAlpha(0); this.marks.add(b); this.tweens.add({ targets: b, alpha: 1, scale: sz * 1.0, duration: 260, delay: delay || 0 }); };
      if (/^(takbir|stand|tash|ruku|qunut)$/.test(pose)) add('gd-R', m.handR, 20, 8, 0);
      if (pose === 'sujud' && from !== 'sujud') { add('gd-n1', m.kneeR, 22, 6, 380); add('gd-n2', m.handR, -26, 10, 760); add('gd-n3', m.head, 30, -34, 1150); }
      if (pose === 'salamR') add('gd-n1', m.head, -52, -10, 300);
      if (pose === 'salamL') add('gd-n2', m.head, 52, -10, 300);
    }
    go(i, play, quiet) {
      this.stopSay();
      if (i >= this.STEPS.length) return this.finish();
      const S = this.STEPS[i], prev = quiet ? null : (i > 0 ? this.STEPS[i - 1].pose : 'rise');
      this.cur = i; this.lineIdx = 0; this.playing = false; this.phase = 'pray'; this.rak = S.done || S.rak - 1;
      this.setStageFor('pray'); this.drawBeads();
      const name = this.frameOf(S.pose), from = prev ? this.frameOf(prev) : null;
      this.showChild(name, from, !quiet);
      this.time.delayedCall(quiet ? 0 : 380, () => { if (this.cur === i && this.phase === 'pray') this.putMarks(S.pose, prev); });
      this.nextB.pulse(false); this.backB.enable(true);
      this.renderPray(S);
      hasClip(S.lines[0].audio);
      const nx = this.STEPS[i + 1]; if (nx) try { HHVoice.preload(nx.lines.map(l => l.audio).filter(Boolean)); } catch (e) { /* none */ }
      if (!quiet) this.time.delayedCall(700, () => { if (this.cur === i && this.phase === 'pray') this.sayFrom(0); });
    }
    renderPray(S) {
      const r = this.cardR, f = this.fs; this.cc.removeAll(true); this.panel = null; this.soundB.setVisible(false); this.drawCard();
      const pad = 14, w = r.w - 2 * pad, how = this.H[S.how], Ln = TXT.line(S.how, this.M, this.girl);
      const tag = S.sub && S.sub.length <= 24 ? S.sub : '';
      const more = (S.rest ? 'Now pray ' + S.rest + '. ' : S.sub && !tag ? S.sub + ' ' : '') + (Ln.more || '');
      // the instruction: one plain line that says right and left, and a small line of detail
      const head = this.add.container(r.x + r.w / 2, r.y + pad + 2); this.cc.add(head);
      const rl = richLine(this, head, rlMark(Ln.say || how.short || how.title), w - 8, Math.round(19 * f), INK); let y = rl.h + 2;
      let moreH = 0;
      if (more.trim()) { const t = mk(this, head, more, 13 * f, '#5d5446', { width: w - 8, w: '600' }); t.setPosition(0, y + 2); moreH = t.height + 6; }
      const topH = rl.h + moreH + 12;
      // the Say card: play, "Say", the tag, one dot per line; then the line being said
      const sy = r.y + pad + topH, sh = r.y + r.h - pad - sy;
      const g = this.add.graphics(); g.fillStyle(0xfdeeb6, 0.55); g.fillRoundedRect(r.x + 8, sy, r.w - 16, sh + 6, 18); this.cc.add(g);
      this.playB = roundBtn(this, this.cc, { key: 'gd-play', size: 42, fn: () => this.togglePlay() }); this.playB.setPosition(r.x + 8 + 6 + 21, sy + 8 + 21);
      const say = mk(this, this.cc, 'Say', 17 * f, INK, { ox: 0, w: '800' }); say.setPosition(r.x + 8 + 6 + 48, sy + 8 + 10);
      let tx = say.x + say.width + 10;
      if (tag) { const t = mk(this, this.cc, tag, 12 * f, SOFT, { ox: 0, w: '800' }); t.setPosition(tx, sy + 8 + 13); tx += t.width + 8; }
      this.lineDots = this.add.container(0, 0); this.cc.add(this.lineDots);
      this.lineDots.setPosition(r.x + r.w - 20, sy + 8 + 21);
      const bodyY = sy + 8 + 52, bodyH = Math.max(40, r.y + r.h - pad - bodyY);
      this.newPanel(r.x + 14, bodyY, r.w - 28, bodyH);
      this.onPanelTap = () => this.nextLine();
      this.showLine(0);
    }
    // one line of the words: Arabic, transliteration, meaning; the dots say which of the lines it is
    showLine(k) {
      const S = this.STEPS[this.cur], L = S.lines[k]; if (!L) return; this.lineIdx = k;
      const f = this.fs, p = this.panel; p.items.forEach(it => it.o.destroy()); p.items = []; p.y = 0; p.off = 0;
      const tg = L.moving ? 'Say it as you move' : L.surah ? L.surah + ' ' + L.ayah : '';
      if (tg) this.addBlock(p, tg, Math.round(12 * f), SOFT, { w: '800', gap: 0 });
      const big = (L.ar.length > 120 ? 27 : L.ar.length > 70 ? 31 : 36) * (this.uh < 450 ? 0.86 : 1);
      this.addBlock(p, L.ar, Math.round(big * f), INK, { ar: true, gap: 2 });
      this.addBlock(p, L.tr + (L.repeat > 1 ? ' ×' + L.repeat : ''), Math.round(15 * f), '#6a5a86', { w: '700', gap: 4, italic: true });
      this.addBlock(p, L.en, Math.round(15 * f), INK, { w: '600', gap: 4 });
      this.repDots = null;
      if (L.repeat > 1) { const c = this.add.container(p.w / 2, 0); p.c.add(c); for (let i = 0; i < L.repeat; i++) { const d = this.add.image((i - (L.repeat - 1) / 2) * 22, 8, 'gd-dot').setScale(0.26).setTint(0xcfc7df); c.add(d); } p.add(c, p.y + 6, 18); p.y += 28; this.repDots = c; }
      p.scroll(0, true);
      this.lineDots.removeAll(true);
      const n = S.lines.length; if (n > 1) for (let i = 0; i < n; i++) { const d = this.add.image(-(n - 1 - i) * 12, 0, 'gd-dot').setScale(0.2); d.setTint(i < k ? 0x3fa7a3 : i === k ? GOLD : 0xcfc7df); this.lineDots.add(d); }
    }
    setRep(rep) { if (this.repDots) this.repDots.list.forEach((d, i) => d.setTint(i <= rep ? 0x3fa7a3 : 0xcfc7df)); }
    setPlayIcon() { if (this.playB && this.playB.ic) this.playB.ic.setTexture(this.playing ? 'gd-pause' : 'gd-play'); }
    // say the lines of this step from line k: each plays its clip (as many times as it repeats); where there is no clip, or sound is
    // off, the words stay and the child taps on (the words, or the play button, or the dots)
    async sayFrom(k) {
      const id = ++this.sayId, S = this.STEPS[this.cur]; this.playing = true; this.setPlayIcon(); this.nextB.pulse(false);
      for (let i = k; i < S.lines.length; i++) {
        const L = S.lines[i]; if (id !== this.sayId) return;
        if (i !== this.lineIdx) this.showLine(i);
        const n = L.repeat > 1 ? L.repeat : 1;
        for (let rep = 0; rep < n; rep++) {
          this.setRep(rep - 1 >= 0 ? rep - 1 : -1); this.setRep(rep);
          const ok = await playClip(L.audio);
          if (id !== this.sayId) return;
          if (!ok) { this.playing = false; this.setPlayIcon(); this.nextB.pulse(i >= S.lines.length - 1); return; }
          await wait(this, rep < n - 1 ? 350 : 550);
          if (id !== this.sayId) return;
        }
      }
      this.playing = false; this.setPlayIcon(); this.lineDots.list.forEach(d => d.setTint(0x3fa7a3)); this.nextB.pulse(true);
    }
    togglePlay() {
      if (this.phase !== 'pray') return;
      if (this.playing) { this.stopSay(); this.playing = false; this.setPlayIcon(); this.nextB.pulse(true); } else this.sayFrom(this.lineIdx);
    }
    nextLine() { if (this.phase !== 'pray') return; const S = this.STEPS[this.cur]; if (this.lineIdx < S.lines.length - 1) { this.stopSay(); this.playing = false; this.setPlayIcon(); this.showLine(this.lineIdx + 1); sfx('tap'); } }
    replay() { }
    replayMove() {
      if (this.phase !== 'pray' || this.cur < 1) return; const S = this.STEPS[this.cur]; sfx('tap');
      this.showChild(this.frameOf(S.pose), this.frameOf(this.STEPS[this.cur - 1].pose), true); this.time.delayedCall(380, () => this.putMarks(S.pose, this.STEPS[this.cur - 1].pose));
    }
    goNext() {
      if (this.phase === 'mat') { if (!this.rolled) this.rollOut(); else this.showQibla(); return; }
      if (this.phase === 'qibla') { if (this.qibla) this.showReady(); else this.turnStep(); return; }
      if (this.phase === 'ready') { sfx('tap'); this.go(0, true); return; }
      if (this.phase === 'pray') { sfx('tap'); this.go(this.cur + 1, true); return; }
    }
    goBack() {
      if (this.phase === 'pray' && this.cur > 0) { sfx('tap'); this.go(this.cur - 1, false); this.time.delayedCall(700, () => { if (this.phase === 'pray') this.sayFrom(0); }); }
      else if (this.phase === 'pray') this.showReady();
      else if (this.phase === 'done') this.go(this.STEPS.length - 1, false);
    }

    /* ----- 5. finished: logged, then the next unit of this prayer or done ----- */
    nextUnits() {
      const U = this.UNITS, out = [];
      if (this.UNIT.repeat) { out.push({ u: this.U, label: '2 more' }); U.forEach((x, i) => { if (x.kind === 'witr' && !prayedToday(this.P, i, x)) out.push({ u: i, label: 'Now Witr' }); }); return out; }
      for (let i = this.U + 1; i < U.length; i++) if (!prayedToday(this.P, i, U[i])) return [{ u: i, label: 'Now ' + this.short(U[i]) }];
      return out;
    }
    finish(again) {
      this.stopSay(); const prev = this.cur >= 0 && this.STEPS[this.cur] ? this.STEPS[this.cur].pose : 'salamL';
      this.phase = 'done'; this.rak = this.N; this.setStageFor('done'); this.drawBeads(); this.nextB.setVisible(false); this.nextB.pulse(false);
      this.showChild(posePic('sit', false), again ? null : this.frameOf(prev), !again); this.marks.removeAll(true);
      if (!again) { if (this.logs) this.done_('salah', { p: this.P, kind: this.UNIT.kind, rakah: this.N, u: this.U }); sfx('gdone'); }
      const r = this.cardR, f = this.fs, nx = this.nextUnits(); this.cc.removeAll(true); this.panel = null; this.soundB.setVisible(false); this.drawCard();
      const what = this.UNIT.kind === 'witr' ? 'Witr, ' + this.N + ' rak’ah' : this.P === 'tahajjud' ? 'Tahajjud, ' + this.N + ' rak’ah' : this.PN + ', ' + this.short();
      const w = r.w - 32, p = this.newPanel(r.x + 16, r.y + 16, w, r.h - 32 - 84);
      const t = mk(this, null, 'You prayed it', Math.round(25 * f), INK, { width: w - 10 }); t.setPosition(p.w / 2, 0); p.add(t, 0, t.height + 6); p.y = t.height + 12;
      this.addBlock(p, what + '. Masha’Allah!' + (nx.length ? ' Pray the next one now, or later.' : ''), Math.round(17 * f), INK, { w: '700', gap: 4 });
      this.kindLine(p, this.UNIT); p.scroll(0, true);
      const by = r.y + r.h - 52, mkb = (x, frame, label, fn, tint) => { const b = roundBtn(this, this.cc, { frame, size: 58, fn, tint }); b.setPosition(x, by); if (label) { const l = mk(this, this.cc, label, 13 * f, SOFT, { width: r.w * 0.4, w: '800' }); l.setPosition(x, by + 34); } return b; };
      if (nx.length) { mkb(r.x + r.w * 0.3, 'arrow', nx[0].label, () => { sfx('tap'); this.setUnit(nx[0].u, this.W); }, 0xd9f3dc); mkb(r.x + r.w * 0.7, nx[1] ? 'arrow' : 'house', nx[1] ? nx[1].label : 'Done for now', nx[1] ? () => { sfx('tap'); this.setUnit(nx[1].u, this.W); } : () => this.leave()); }
      else mkb(r.x + r.w / 2, 'check', 'Done', () => this.leave(), 0xd9f3dc);
    }
  }

  (window.LifeScenes = window.LifeScenes || []).push(Wudu, Salah);
})();
