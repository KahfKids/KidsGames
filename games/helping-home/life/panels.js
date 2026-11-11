/* Helping Home (life): panels.js
   The screens that sit on top of the world: the character maker, the wardrobe, the Akhlaq album, friends, today,
   and the decorating tray. They share the look of the Hud (cream cards, soft shadows, round white buttons) and use
   NO words and NO numerals: pictures, colours, dots and big round buttons only.

   Added to the game with window.LifeScenes (game.js starts them by name). Every panel is a dimmed backdrop that swallows
   taps, a cream card, a round cross button (top right) and open / close animations of about 200 ms. Phones held upright
   see a tall, narrow slice of the design space, so a panel lays itself out again for that shape and zooms in on it
   (the design width is 1240 units there instead of 1920) to keep the buttons a finger can hit.

   Pictures that are missing yet are replaced by something plain, never by an error: no `cast` portraits -> a round
   plate with a faceless bust; no flower / roller icon -> one painted here; no decor art -> the gift icon.

   Scenes: DecoTray (always running, invisible until a room is being decorated), Maker, Wardrobe, Album, Friends, Today. */
(function () {
  'use strict';
  const ART = '/KidsGames/games/helping-home/life/art/';
  const EXT = () => window.LifeExt || '.avif';                                  // the picture format game.js chose (read when needed)
  const hex = s => Phaser.Display.Color.HexStringToColor(String(s)).color;                  // '#rrggbb' -> 0xrrggbb
  const Lf = () => window.Life;
  const sfx = n => { try { Lf().sfx(n); } catch (e) { /* no sound */ } };
  const clone = o => JSON.parse(JSON.stringify(o));
  const CARD = 0xfffaf0, INK = 0x7b6a96, GREEN = 0x3cae66;

  // what the data would say if it had not been merged yet
  const FALLBACK = {
    skins: ['#F0C8A0', '#E0B08A', '#D7A27A', '#C98E62', '#A8714C', '#7E5236'], hairs: ['#1E1E22', '#33261C', '#5A3A22', '#8A5A3C'],
    tops: ['#3E8FD8', '#2E9C97', '#5FA85A', '#EBB23A', '#E58C3A', '#E7835F', '#C96A7A', '#7A5CA8', '#3B4A8F', '#F8F3E8', '#8FB57A', '#F2A7B5'],
    legs: ['#2F5E9E', '#3F6E4A', '#5A4636', '#8A6A4A', '#3B4A8F', '#F8F3E8'], hats: ['#FBF6EA', '#3F7D78', '#3B4A8F', '#7A5236', '#D9A441'],
    scarves: ['#F6E3B8', '#FBF6EA', '#F2A7B5', '#BFD3B2', '#CDEBFF', '#F2C6C0', '#DDDDE6'],
    kinds: { boy: [{ set: 'boy-kurta' }, { set: 'boy-thobe' }], girl: [{ set: 'girl-hair' }, { set: 'girl-scarf' }] }
  };
  // when an icon is not in the sheet yet: another icon that says nearly the same, or one painted here ('pn-i-...')
  const ALT = { hand: ['salam'], drops: ['drop'], parcel: ['gift'], people: ['heart'], moneybox: ['coin'], abacus: ['seeds'], school: ['book'] };
  const SELF = { roller: 'pn-i-roller', flower0: 'pn-i-fl0', flower1: 'pn-i-fl1', flower2: 'pn-i-fl2', flower3: 'pn-i-fl3', flower4: 'pn-i-fl4' };
  function ref(name) {                                                                // -> [texture, frame]
    const ic = (Lf().data.art.icons) || [], list = [name].concat(ALT[name] || []);
    for (let i = 0; i < list.length; i++) if (ic.indexOf('i-' + list[i]) >= 0) return ['ui', 'i-' + list[i]];
    return SELF[name] ? [SELF[name]] : ['ui', 'i-star'];
  }
  const setPic = (img, name) => { const r = ref(name); img.setTexture(r[0], r[1]); return img; };
  const pic = (sc, name, x, y, s) => { const r = ref(name); return sc.add.image(x || 0, y || 0, r[0], r[1]).setScale(s || 1); };

  /* ---------- the pictures painted here, once ---------- */
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  const circ = (cx, cy, r) => 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 -' + (2 * r) + ' 0z';
  const W = '#ffffff', D = '#d2cfe0';
  // white pictograms (tinted by the colour they stand for); each part is [colour, svg path, stroke width?]
  const GLYPH = {
    bust: [[W, circ(64, 38, 27) + 'M14 124C14 88 36 76 64 76C92 76 114 88 114 124Z']],
    hair: [[W, 'M20 82C10 36 34 10 64 10C94 10 118 36 108 82C102 60 94 46 64 44C34 46 26 60 20 82Z'], [D, 'M36 44C48 30 80 30 92 44C80 38 48 38 36 44Z']],
    hairlong: [[W, 'M64 8C26 8 10 40 16 88C18 108 12 118 8 124L42 124C34 104 36 72 44 58C54 50 74 50 84 58C92 72 94 104 86 124L120 124C116 118 110 108 112 88C118 40 102 8 64 8Z']],
    cap: [[W, 'M14 88C14 44 40 26 64 26C88 26 114 44 114 88Z'], [D, 'M10 88H118V92H10Z'], [W, 'M10 92H118V106H10Z'], [W, circ(64, 22, 8)]],
    shirt: [[W, 'M42 14L14 32L4 62L30 72L38 58L38 114L90 114L90 58L98 72L124 62L114 32L86 14C82 28 46 28 42 14Z'], [D, 'M42 14C46 28 82 28 86 14L90 16C84 36 44 36 38 16Z']],
    trousers: [[W, 'M30 12H98L106 116H72L64 56L56 116H22Z'], [D, 'M30 12H98V22H30Z']],
    dress: [[W, 'M46 12H82L88 44L118 118H10L40 44Z'], [D, 'M40 44H88V52H40Z']],
    scarf: [['#fff', 'M64 8C102 8 116 40 110 74C108 92 114 106 122 122H6C14 106 20 92 18 74C12 40 26 8 64 8ZM64 28C50 28 42 40 42 54C42 70 52 82 64 82C76 82 86 70 86 54C86 40 78 28 64 28Z']],
    kurta: [[W, 'M42 10L16 26L6 62L30 70L38 50L38 96L90 96L90 50L98 70L122 62L112 26L86 10C82 22 46 22 42 10Z'], [W, 'M40 98H62V122H40ZM66 98H88V122H66Z'], [D, 'M64 24V60']],
    thobe: [[W, 'M42 8L16 24L6 60L30 68L38 46L32 124H96L90 46L98 68L122 60L112 24L86 8C82 20 46 20 42 8Z'], [D, 'M64 22V64']]
  };
  function paintAll(sc) {
    const T = (k, w, h, f, pad) => Kit.play.tex(sc, k, w, h, f, pad);
    T('pn-card', 400, 300, c => {
      c.shadowColor = 'rgba(30,20,60,.30)'; c.shadowBlur = 30; c.shadowOffsetY = 10; c.fillStyle = '#fff'; rr(c, 0, 0, 400, 300, 56); c.fill();
      c.shadowColor = 'rgba(0,0,0,0)'; c.strokeStyle = 'rgba(120,90,60,.10)'; c.lineWidth = 5; rr(c, 12, 12, 376, 276, 46); c.stroke();
    }, 44);
    T('pn-dot', 120, 120, c => {
      c.shadowColor = 'rgba(30,20,60,.25)'; c.shadowBlur = 8; c.shadowOffsetY = 4;
      const g = c.createRadialGradient(46, 40, 6, 60, 60, 60); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#f4f1f9'); g.addColorStop(1, '#dcd7e8');
      c.fillStyle = g; c.beginPath(); c.arc(60, 60, 56, 0, 7); c.fill();
      c.shadowColor = 'rgba(0,0,0,0)'; c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(44, 30, 24, 11, -0.5, 0, 7); c.fill();
    }, 12);
    T('pn-ring', 136, 136, c => { c.strokeStyle = '#fff'; c.lineWidth = 12; c.beginPath(); c.arc(68, 68, 62, 0, 7); c.stroke(); }, 6);
    T('pn-ok', 180, 180, c => {
      c.shadowColor = 'rgba(20,60,30,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 7;
      const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#74dd90'); g.addColorStop(1, '#2fa95b');
      c.fillStyle = g; c.beginPath(); c.arc(90, 88, 82, 0, 7); c.fill();
      c.shadowColor = 'rgba(0,0,0,0)'; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 8; c.beginPath(); c.arc(90, 88, 72, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(90, 44, 52, 24, 0, 0, 7); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 22; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(50, 92); c.lineTo(80, 122); c.lineTo(132, 60); c.stroke();
    }, 14);
    T('pn-x', 64, 64, c => { c.strokeStyle = '#e4606f'; c.lineWidth = 15; c.lineCap = 'round'; c.beginPath(); c.moveTo(10, 10); c.lineTo(54, 54); c.moveTo(54, 10); c.lineTo(10, 54); c.stroke(); });
    for (const n in GLYPH) T('pn-g-' + n, 128, 128, c => { GLYPH[n].forEach(p => { c.fillStyle = p[0]; c.fill(new Path2D(p[1]), 'evenodd'); }); });
    T('pn-g-nocap', 128, 128, c => {
      c.fillStyle = '#cfcbdc'; c.fill(new Path2D('M16 88C16 46 40 28 64 28C88 28 112 46 112 88Z M12 90H116V106H12Z'));
      c.strokeStyle = '#e4566c'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.arc(64, 66, 50, 0, 7); c.moveTo(30, 100); c.lineTo(98, 32); c.stroke();
    });
    // a painted roller (until the sheet has one)
    T('pn-i-roller', 96, 96, c => {
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#7a5a40'; c.lineWidth = 7; c.beginPath(); c.moveTo(48, 50); c.lineTo(48, 62); c.stroke();
      c.fillStyle = '#e88a3c'; rr(c, 42, 60, 12, 30, 5); c.fill();
      const g = c.createLinearGradient(0, 8, 0, 40); g.addColorStop(0, '#8fb5ff'); g.addColorStop(1, '#4f7fe0'); c.fillStyle = g; rr(c, 10, 10, 66, 28, 12); c.fill();
      c.strokeStyle = '#7a5a40'; c.lineWidth = 7; c.beginPath(); c.moveTo(76, 24); c.lineTo(84, 24); c.lineTo(84, 48); c.lineTo(48, 48); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, 18, 14, 40, 7, 3.5); c.fill();
    });
    // friendship flowers, growing: a sprout, a bud, a small flower, a bloom, a bloom with leaves
    for (let s = 0; s < 5; s++) T('pn-i-fl' + s, 96, 96, c => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      const leaf = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#5fb85a'; c.beginPath(); c.ellipse(0, 0, 14, 7, 0, 0, 7); c.fill(); c.restore(); };
      c.fillStyle = '#b98a5a'; c.beginPath(); c.ellipse(48, 86, 24, 7, 0, 0, 7); c.fill();
      c.strokeStyle = '#4fa24d'; c.lineWidth = 6; const top = [66, 58, 46, 36, 28][s];
      c.beginPath(); c.moveTo(48, 84); c.lineTo(48, top); c.stroke();
      leaf(38, 76, -0.6); leaf(58, 70, 0.6);
      if (s >= 3) { leaf(36, 58, -0.8); leaf(60, 52, 0.8); }
      if (s === 1) { c.fillStyle = '#f28fa8'; c.beginPath(); c.ellipse(48, top - 6, 8, 11, 0, 0, 7); c.fill(); }
      if (s >= 2) {
        const n = s === 2 ? 5 : 6, r = s === 2 ? 9 : s === 3 ? 12 : 14, pc = ['', '', '#f6c453', '#f28fa8', '#f28fa8'][s];
        c.fillStyle = pc; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; c.beginPath(); c.arc(48 + Math.cos(a) * r, top + Math.sin(a) * r, r * 0.72, 0, 7); c.fill(); }
        c.fillStyle = s === 2 ? '#f08a3c' : '#fff3b0'; c.beginPath(); c.arc(48, top, r * 0.6, 0, 7); c.fill();
      }
    });
  }
  // a card of the visible size w x h (the texture carries 44 units of shadow on every side)
  function nine(sc, key, w, h, inset) { return sc.add.nineslice(0, 0, key, undefined, w + 88, h + 88, inset, inset, inset, inset); }
  const ns = (n, w, h) => { n.setSize(w + 88, h + 88); return n; };
  // a colour k of the way from a to b (the engine's Interpolate, on whole numbers)
  const mix = (a, b, k) => { const C = Phaser.Display.Color; return C.Interpolate.ColorWithColor(C.IntegerToColor(a), C.IntegerToColor(b), 1, k).color; };
  const base = (c, s) => { c.base = s; c.setScale(s); return c; };
  // a round white button: touch it and it squashes, lift the finger on it and it acts
  function mkBtn(sc, parts, fn, hit) {
    const c = sc.add.container(0, 0), pl = sc.add.image(0, 0, 'ui-plate');
    c.add([pl].concat(parts)); c.pl = pl; c.setSize(hit || 150, hit || 150).setInteractive(); c.base = 1; c.fn = fn;
    let dn = false;
    c.on('pointerdown', () => { dn = true; sfx('tap'); sc.tweens.add({ targets: c, scale: c.base * 0.9, duration: 70, yoyo: true }); });
    c.on('pointerout', () => { dn = false; });
    c.on('pointerup', () => { if (dn) { dn = false; c.fn(); } });
    return c;
  }
  // the people's pictures: the `cast` atlas if it exists (asked for once, quietly), else a faceless bust on a plate
  let castNo = false;
  function withCast(sc, cb) {
    if (sc.textures.exists('cast')) { cb(); return; }
    if (castNo || !window.fetch) return;
    fetch(ART + 'p/cast.json', { method: 'HEAD' }).then(r => {
      if (!r.ok) { castNo = true; return; }
      if (!sc.sys.isActive()) return;
      sc.load.atlas('cast', ART + 'p/cast' + EXT(), ART + 'p/cast.json');
      sc.load.once('complete', () => { if (sc.sys.isActive() && sc.textures.exists('cast')) cb(); });
      sc.load.start();
    }).catch(() => { castNo = true; });
  }
  const BUST = [0xe9a07a, 0x7fb7d9, 0xb59ad6, 0x8ccf9d, 0xf1c05e, 0xe58aa0, 0x9fc9a0, 0xd8a0c8];
  function mkPortrait(sc, id, size) {
    let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const c = sc.add.container(0, 0), pl = sc.add.image(0, 0, 'ui-plate').setScale(size / 124), bust = sc.add.image(0, 4, 'pn-g-bust').setScale(size * 0.62 / 128).setTint(BUST[h % BUST.length]);
    const im = sc.add.image(0, 0, 'ui', 'i-star').setVisible(false);
    c.add([pl, bust, im]);
    c.fill = () => {
      const An = (window.Life && Life.data && Life.data.animals) || {};            // an animal's portrait is its icon
      if (An[id]) { const n = 'i-' + An[id].kind; if (sc.textures.get('ui').has(n)) { im.setTexture('ui', n).setVisible(true).setScale(size * 0.6 / 128); bust.setVisible(false); } return; }
      if (!sc.textures.exists('cast') || !sc.textures.get('cast').has(id)) return;
      const f = sc.textures.get('cast').get(id); im.setTexture('cast', id).setVisible(true).setScale(Math.min(size * 0.86 / f.width, size * 0.86 / f.height)); bust.setVisible(false);
    };
    c.fill(); return c;
  }
  // a won thing's real picture from the decor atlas, scaled to fit a box; the gift icon if it is not there
  function decorPic(sc, id, box) {
    const D0 = Lf().data, d = (D0.decor || {})[id], k = d && D0.art.kinds ? d.kind + '@0' + (d.state != null ? '#' + d.state : '') : null, m = k && D0.art.kinds[k];
    if (m && sc.textures.exists('t-decor') && sc.textures.get('t-decor').has(k)) return sc.add.image(0, 0, 't-decor', k).setScale(Math.min(box / m.w, box / m.h));
    const r = ref('gift'); return sc.add.image(0, 0, r[0], r[1]).setScale(box / 130);
  }

  /* ---------- a panel: backdrop, card, cross, opening and closing ---------- */
  class Panel extends Phaser.Scene {
    constructor(key) { super(key); }
    init(d) { this.opt = d || {}; this.closable = true; this.outsideClose = true; this.start(this.opt); }
    start() { /* subclasses set their own options here */ }
    create() {
      paintAll(this); this.closing = false;
      this.back = this.add.rectangle(0, 0, 9000, 9000, 0x1a1440, 0).setInteractive();
      this.root = this.add.container(0, 0).setAlpha(0).setScale(0.84);
      this.card = nine(this, 'pn-card', 1000, 700, 110).setTint(CARD); this.root.add(this.card);
      let dn = false;
      this.back.on('pointerdown', p => { dn = this.outside(p); });
      this.back.on('pointerup', p => { if (dn && this.outside(p) && this.closable && this.outsideClose) this.close(); dn = false; });
      this.build();
      if (this.closable) { this.xb = mkBtn(this, [this.add.image(0, -1, 'pn-x').setScale(0.8)], () => this.close()); base(this.xb, 0.9); this.root.add(this.xb); }
      Kit.play.fit(this, v => this.fitted(v));
      this.tweens.add({ targets: this.back, fillAlpha: 0.55, duration: 200 });
      this.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });
      sfx('pop');
      this.events.once('shutdown', () => this.gone());
    }
    gone() { /* subclasses remove what they listen to */ }
    outside(p) { const M = this.M; return !M || Math.abs(p.worldX - this.root.x) > M.cw / 2 || Math.abs(p.worldY - this.root.y) > M.ch / 2; }
    fitted(v) {
      const gw = this.scale.width, gh = this.scale.height, cam = this.cameras.main;
      let l = v.l, r = v.r, t = v.t, b = v.b, sl = v.sl, sr = v.sr, st = v.st, sb = v.sb;
      const port = gw < gh * 0.92;
      if (port) {                                                    // upright phone: a narrower design width, so buttons stay big enough
        const z = gw / 1240, k = v.z / z, vw = gw / z, vh = gh / z; cam.setZoom(z); cam.centerOn(960, 540);
        l = 960 - vw / 2; r = 960 + vw / 2; t = 540 - vh / 2; b = 540 + vh / 2;
        sl = l + (v.sl - v.l) * k; sr = r - (v.r - v.sr) * k; st = t + (v.st - v.t) * k; sb = b - (v.b - v.sb) * k;
      }
      const aw = sr - sl, ah = sb - st;
      const M = this.M = { port: port, l: l, r: r, t: t, b: b, sl: sl, sr: sr, st: st, sb: sb, cw: port ? Math.min(aw - 80, 1150) : Math.min(aw - 90, 2100), ch: port ? Math.min(ah - 200, this.portH || 2300) : Math.min(ah - 80, 1100) };
      this.back.setPosition((l + r) / 2, (t + b) / 2);
      this.root.setPosition((sl + sr) / 2, (st + sb) / 2);
      ns(this.card, M.cw, M.ch);
      if (this.xb) this.xb.setPosition(M.cw / 2 - 66, -M.ch / 2 + 66);
      this.arrange(M);
    }
    arrange() { /* subclasses */ }
    close(then) {
      if (this.closing) return; this.closing = true; sfx('soft');
      this.tweens.add({ targets: this.back, fillAlpha: 0, duration: 180 });
      this.tweens.add({ targets: this.root, scale: 0.88, alpha: 0, duration: 180, ease: 'Sine.easeIn', onComplete: () => { this.scene.stop(); if (then) then(); } });
    }
    // a little shower of stars from a point (inside the root): the engine's particle emitter, one kept for the panel
    burst(x, y, n) {
      if (!this.sparks || !this.sparks.active) this.sparks = this.add.particles(0, 0, 'ui', { frame: 'i-star', emitting: false, lifespan: 650, speed: { min: 220, max: 320 },
        scale: { start: 0.1, end: 0.5, ease: 'Cubic.easeOut' }, alpha: { start: 1, end: 0, ease: 'Quad.easeIn' } });
      this.sparks.explode(n || 8, this.root.x + x * this.root.scaleX, this.root.y + y * this.root.scaleY);
    }
  }

  /* ---------- the character maker and the wardrobe ---------- */
  const SETGLYPH = { 'boy-kurta': 'kurta', 'boy-thobe': 'thobe', 'girl-hair': 'hairlong', 'girl-scarf': 'scarf' };
  const genderOf = set => (set.indexOf('girl') === 0 ? 'girl' : 'boy');
  const NEWGIRL = { top: '#C96A7A', hair: '#33261C', scarf: '#F6E3B8', legs: '#2F5E9E', hat: '#FBF6EA' };
  function loadSet(sc, set) {
    const A = Lf().data.art.you[set]; if (!A) return;
    A.layers.filter(l => l !== 'bike').forEach(l => { const k = 'pn-' + set + '-' + l; if (!sc.textures.exists(k)) sc.load.atlas(k, ART + 'you/' + set + '-' + l + EXT(), ART + 'you/' + set + '.json'); });
  }
  const haveSet = (sc, set) => { const A = Lf().data.art.you[set]; return !!A && A.layers.every(l => l === 'bike' || sc.textures.exists('pn-' + set + '-' + l)); };
  // the child, stacked from tinted layers: tinting is the same multiply as the world's baked sheet, and instant
  function figure(sc, set) {
    const A = Lf().data.art.you[set], c = sc.add.container(0, 0); c.ls = [];
    A.layers.filter(l => l !== 'bike').forEach(l => { const s = sc.add.sprite(0, 0, 'pn-' + set + '-' + l, 'idle').setOrigin(A.ax / A.fw, A.ay / A.fh); s._l = l; c.add(s); c.ls.push(s); });
    c.set = set; return c;
  }
  function dressFig(c, look) { c.ls.forEach(s => { if (s._l === 'shadow') s.setVisible(false); if (s._l === 'hat') s.setVisible(!!look.hat); if (s._l !== 'shadow' && look.colors[s._l]) s.setTint(hex(window.Life && Life.tint ? Life.tint(look.colors[s._l]) : look.colors[s._l])); }); }
  const poseFig = (c, f) => c.ls.forEach(s => s.setFrame(f));
  // the walk: the engine's animation on every layer (all started together, so they stay together)
  const walkFig = (sc, c) => c.ls.forEach(s => { const k = s.texture.key + '-walk'; if (!sc.anims.exists(k)) sc.anims.create({ key: k, frames: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ key: s.texture.key, frame: 'walk' + i })), frameRate: 11, repeat: -1 }); s.play(k); });

  class Dress extends Panel {
    constructor(k) { super(k); this.portH = 1900; }
    start(d) { this.first = !!d.first; this.closable = !this.first; this.outsideClose = false; }
    userData() { return Lf().data.you || FALLBACK; }
    defaultLook(g) {
      const U = this.userData(), set = ((U.kinds || FALLBACK.kinds)[g] || FALLBACK.kinds[g])[0].set, Y0 = Lf().YOU0, col = Object.assign({}, Y0.colors);
      return { set: set, hat: g === 'boy', colors: g === 'boy' ? col : Object.assign(col, NEWGIRL) };
    }
    fix(look) {
      const A = Lf().data.art.you; if (!look || !A[look.set]) return this.defaultLook('boy');
      look = clone(look); look.colors = Object.assign({}, Lf().YOU0.colors, look.colors); look.hat = !!look.hat; return look;
    }
    preload() {
      const D0 = Lf().data, U = D0.you || FALLBACK, cur = Lf().state && Lf().state.you;
      if (this.first) { loadSet(this, ((U.kinds || FALLBACK.kinds).boy[0] || {}).set); loadSet(this, ((U.kinds || FALLBACK.kinds).girl[0] || {}).set); }
      else loadSet(this, (cur && D0.art.you[cur.set] ? cur.set : this.defaultLook('boy').set));
    }
    build() {
      this.U = this.userData(); this.look = this.first ? this.defaultLook('boy') : this.fix(Lf().state.you); this.start0 = JSON.stringify(this.look);
      if (!haveSet(this, this.look.set)) this.look = this.defaultLook('boy');
      this.cat = 'skin'; this.loading = false; this.waving = false;
      // the stage: a soft light, the floor shadow, the figure
      this.glow = this.add.image(0, 0, 'ui-glow').setTint(0xfff0c0).setAlpha(0.9);
      this.glow2 = this.add.image(0, 0, 'ui-glow').setTint(0xcfe8ff).setAlpha(0.7);
      this.floor = this.add.image(0, 0, 'ui-glow').setTint(0x2a2050).setAlpha(0.22);
      this.zone = this.add.zone(0, 0, 300, 560).setInteractive();
      this.zone.on('pointerup', () => this.wave());
      this.root.add([this.glow, this.glow2, this.floor, this.zone]);
      this.fig = null; this.newFig();
      // boy / girl (the maker only)
      this.genders = [];
      if (this.first) ['boy', 'girl'].forEach(g => {
        const c = mkBtn(this, [], () => this.setGender(g), 150), D0 = this.defaultLook(g), f = figure(this, D0.set);
        dressFig(f, D0); poseFig(f, 'idle'); f.setScale(0.72).setPosition(0, 50);
        c.pl.setTint(g === 'boy' ? 0xdcebff : 0xffe1ea); c.add(f); c.ring = this.add.image(0, 0, 'pn-ring').setTint(GREEN).setScale(1.06); c.add(c.ring); c.g = g; this.genders.push(c); this.root.add(c);
      });
      // category tabs and the swatches of the open one (pools: nothing is created while choosing)
      this.tabs = []; for (let i = 0; i < 6; i++) this.tabs.push(this.mkTab(i));
      this.sw = []; for (let i = 0; i < 13; i++) this.sw.push(this.mkSwatch(i));
      this.ok = mkBtn(this, [], () => this.finish(), 190); this.ok.remove(this.ok.pl, true); this.ok.addAt(this.add.image(0, 0, 'pn-ok'), 0); this.root.add(this.ok);
      this.refresh(false);
    }
    newFig() {
      if (this.fig) this.fig.destroy();
      this.fig = figure(this, this.look.set); dressFig(this.fig, this.look); if (this.waving) poseFig(this.fig, 'wave'); else walkFig(this, this.fig);
      this.root.addAt(this.fig, this.root.getIndex(this.zone) + 1);
      if (this.M) this.place();
    }
    // ---- the tabs
    cats() {
      const L0 = this.look, A = Lf().data.art.you[L0.set], has = l => A.layers.indexOf(l) >= 0, g = genderOf(L0.set), U = this.U, out = [];
      out.push({ id: 'skin', glyph: 'bust', col: 'skin', list: U.skins });
      if (((U.kinds || {})[g] || []).length > 1) out.push({ id: 'kind', glyph: SETGLYPH[L0.set] || 'shirt', ink: true });
      if (has('hair')) out.push({ id: 'hair', glyph: g === 'girl' ? 'hairlong' : 'hair', col: 'hair', list: U.hairs });
      if (has('scarf')) out.push({ id: 'scarf', glyph: 'scarf', col: 'scarf', list: U.scarves });
      if (has('hat')) out.push({ id: 'hat', glyph: 'cap', col: 'hat', list: U.hats, off: true });
      out.push({ id: 'top', glyph: g === 'girl' ? 'dress' : 'shirt', col: 'top', list: U.tops });
      if (has('legs')) out.push({ id: 'legs', glyph: 'trousers', col: 'legs', list: U.legs });
      return out;
    }
    mkTab(i) {
      const gl = this.add.image(0, -2, 'pn-g-bust').setScale(0.52), c = mkBtn(this, [gl], () => this.openCat(c.cid), 134);
      c.gl = gl; c.setVisible(false); this.root.add(c); return c;
    }
    mkSwatch(i) {
      const dot = this.add.image(0, -2, 'pn-dot').setScale(0.785), gl = this.add.image(0, -2, 'pn-g-bust').setScale(0.6).setVisible(false), ring = this.add.image(0, 0, 'pn-ring').setTint(GREEN).setScale(1.04).setVisible(false);
      const c = mkBtn(this, [dot, gl, ring], () => this.pick(c.item), 134); c.dot = dot; c.gl = gl; c.ring = ring; c.setVisible(false); this.root.add(c); return c;
    }
    refresh(anim) {
      const cats = this.cats(), L0 = this.look;
      if (!cats.some(c => c.id === this.cat)) this.cat = 'skin';
      this.curCats = cats;
      this.tabs.forEach((t, i) => {
        const c = cats[i]; t.setVisible(!!c); if (!c) return; t.cid = c.id; t.gl.setTexture('pn-g-' + c.glyph);
        t.gl.setTint(c.col ? hex(L0.colors[c.col]) : INK).setAlpha(c.off && !L0.hat ? 0.4 : 1);
        const on = c.id === this.cat; t.pl.setTint(on ? 0xffe9a0 : 0xefeaf7); t.on = on; base(t, (t.sz || 1) * (on ? 1.12 : 1)); t.y = t.y0 || 0;
      });
      this.fillSwatches(anim);
      this.place();
    }
    fillSwatches(anim) {
      const cat = this.curCats.find(c => c.id === this.cat), L0 = this.look, items = [];
      if (cat.id === 'kind') (this.U.kinds[genderOf(L0.set)] || []).forEach(k => items.push({ glyph: SETGLYPH[k.set] || 'shirt', sel: L0.set === k.set, kind: k.set }));
      else {
        if (cat.off) items.push({ glyph: 'nocap', plain: true, sel: !L0.hat, none: true });
        cat.list.forEach(col => items.push({ col: col, key: cat.col, sel: L0.colors[cat.col].toLowerCase() === col.toLowerCase() && (!cat.off || L0.hat) }));
      }
      this.nItems = items.length;
      this.sw.forEach((s, i) => {
        const it = items[i]; s.setVisible(!!it); if (!it) return; s.item = it;
        s.dot.setVisible(!it.glyph); s.gl.setVisible(!!it.glyph); s.ring.setVisible(it.sel);
        if (it.glyph) { s.gl.setTexture('pn-g-' + it.glyph).setTint(it.plain ? 0xffffff : INK); s.pl.setTint(it.sel ? 0xe4f7e8 : 0xffffff); }
        else { s.dot.setTint(hex(it.col)); s.pl.setTint(0xffffff); }
        s.base = s.base || 1; base(s, (s.sz || 1) * (it.sel ? 1.1 : 1));
        if (anim) { s.setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 160, delay: i * 14 }); } else s.setAlpha(1);
      });
    }
    openCat(id) { if (id === this.cat) return; this.cat = id; this.refresh(true); }
    pick(it) {
      if (!it || this.loading) return;
      const L0 = this.look;
      if (it.kind) { if (it.kind !== L0.set) this.switchSet(it.kind, null); return; }
      if (it.none) L0.hat = false;
      else { L0.colors[it.key] = it.col; if (it.key === 'hat') L0.hat = true; }
      this.changed();
    }
    changed() {
      dressFig(this.fig, this.look); this.refresh(false); sfx('pop');
      this.tweens.killTweensOf(this.fig); const k = this.fig.scale; this.fig.setScale(k, k); this.tweens.add({ targets: this.fig, scaleY: k * 1.05, scaleX: k * 0.97, duration: 90, yoyo: true });
      this.burst(this.fig.x, this.fig.y - this.fig.scale * 90, 4);
    }
    // another sort of clothes, or the other gender: get its pictures if they are not here yet, then show it
    switchSet(set, look) {
      const A = Lf().data.art.you[set]; if (!A || this.loading) return; this.loading = true;
      const go = () => {
        this.loading = false; if (!this.sys.isActive() || !haveSet(this, set)) return;
        this.look = look || Object.assign(this.look, { set: set });
        if (!look) { this.look.hat = this.look.hat; }
        const k = this.fig.scale; this.newFig(); this.fig.setScale(k); this.refresh(true); this.place(); sfx('pop'); this.burst(this.fig.x, this.fig.y - this.fig.scale * 90, 6);
      };
      if (haveSet(this, set)) { go(); return; }
      loadSet(this, set); this.load.once('complete', go); this.load.start();
    }
    setGender(g) {
      if (genderOf(this.look.set) === g || this.loading) return;
      const nl = this.defaultLook(g); nl.colors.skin = this.look.colors.skin; this.cat = 'skin'; this.switchSet(nl.set, nl);
    }
    wave() {
      if (this.waving || !this.fig) return; this.waving = true; this.fig.ls.forEach(s => s.anims.stop()); poseFig(this.fig, 'wave'); sfx('spark'); this.burst(this.fig.x, this.fig.y - this.fig.scale * 100, 6);
      this.time.delayedCall(900, () => { this.waving = false; if (this.fig && this.sys.isActive()) walkFig(this, this.fig); });
    }
    finish() {
      if (this.closing) return; const look = clone(this.look), L0 = Lf();
      this.tweens.add({ targets: this.ok, scale: this.ok.base * 1.15, duration: 120, yoyo: true }); sfx('spark');
      if (this.first) {
        L0.state.you = look; L0.save();
        // Boot (whose loader Life.makeYou will use) has been stopped by now and cannot load anything: so put the pictures it
        // asks for in the cache first, under its own names, and it will stack them without loading
        const A = L0.data.art.you[look.set], pre = 'you-' + look.set + '-'; let n = 0;
        if (A) {
          A.layers.filter(l => l !== 'hat' || look.hat).forEach(l => { if (!this.textures.exists(pre + l)) { this.load.image(pre + l, ART + 'you/' + look.set + '-' + l + EXT()); n++; } });
          if (!this.cache.json.exists(pre + 'atlas')) { this.load.json(pre + 'atlas', ART + 'you/' + look.set + '.json'); n++; }
        }
        const go = () => this.close(() => { if (this.opt.done) this.opt.done(); });
        if (n) { this.load.once('complete', go); this.load.start(); } else go();
        return;
      }
      if (JSON.stringify(look) === this.start0) { this.close(); return; }
      L0.state.you = look; L0.save();
      const P = L0.place;
      if (!P) { this.close(); return; }
      L0.makeYou(P, look, () => { if (P.refreshYou) P.refreshYou(); this.close(); });
    }
    // ---- where everything goes
    arrange(M) { this.place(); }
    place() {
      const M = this.M; if (!M) return; const cw = M.cw, ch = M.ch, port = M.port, first = this.first;
      const cats = this.curCats || [], nT = cats.length, nS = this.nItems || 6;
      let rcx, rw, figH, figX, figY, gy, ty, sy, okx, oky;
      const gH = first ? 196 : 0, gap = 38;
      if (!port) {
        const LW = cw * 0.42; figX = -cw / 2 + 60 + LW / 2; figH = Math.min(ch * 0.5, 540); figY = -ch / 2 + 110 + figH;
        rcx = (-cw / 2 + 60 + LW + 90 + cw / 2 - 80) / 2; rw = cw / 2 - 80 - (-cw / 2 + 60 + LW + 90);
        okx = figX; oky = ch / 2 - 150;
      } else { figX = 0; rcx = 0; rw = cw - 110; figH = Math.min(ch * 0.34, 760); okx = 0; }
      const maxC = Math.min(6, Math.max(1, Math.floor(rw / 150))), rows = Math.ceil(nS / maxC), cols = Math.ceil(nS / rows), S = Math.min(144, rw / cols - 14);
      const tsz = Math.min(138, rw / Math.max(nT, 1) - 10), tH = tsz * 1.12;
      const colH = gH + (first ? gap : 0) + tH + gap + rows * (S + 14);
      let y;
      if (!port) { y = -colH / 2 - 10; }
      else {
        const total = figH + 30 + colH + gap + 190; y = -total / 2; figY = y + figH; y += figH + 30; oky = -total / 2 + total - 95;
        this.fitFig = true;
      }
      // the figure and its stage
      const k = figH / 160; this.fig.setPosition(figX, figY).setScale(k); this.zone.setPosition(figX, figY - figH / 2).setSize(260, figH);
      this.glow.setPosition(figX, figY - figH * 0.42).setScale(figH / 128 * 1.55); this.glow2.setPosition(figX, figY - figH * 0.3).setScale(figH / 128 * 1.0);
      this.floor.setPosition(figX, figY + 6).setScale(figH / 128 * 0.95, figH / 128 * 0.26);
      // boy / girl
      if (first) { this.genders.forEach((g, i) => { g.setPosition(rcx + (i ? 1 : -1) * 125, y + gH / 2); base(g, 1.35); g.ring.setVisible(genderOf(this.look.set) === g.g); g.pl.setTint(g.g === 'boy' ? 0xdcebff : 0xffe1ea); }); y += gH + gap; }
      // tabs
      this.tabs.forEach((t, i) => { t.sz = tsz / 124; t.setPosition(rcx + (i - (nT - 1) / 2) * (tsz + 10), y + tH / 2); t.y0 = t.y; base(t, t.sz * (t.on ? 1.12 : 1)); });
      y += tH + gap;
      // swatches
      this.sw.forEach((s, i) => { const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, nS - r * cols); s.sz = S / 124; s.setPosition(rcx + (c - (inRow - 1) / 2) * (S + 14), y + S / 2 + r * (S + 14)); base(s, s.sz * (s.item && s.item.sel ? 1.1 : 1)); });
      this.ok.setPosition(okx, oky); base(this.ok, 1);
    }
  }
  class Maker extends Dress { constructor() { super('Maker'); } }
  class Wardrobe extends Dress { constructor() { super('Wardrobe'); } }

  /* ---------- the album ---------- */
  const QS = ['kind', 'give', 'help', 'clean', 'patient', 'thanks', 'learn', 'animals'], QI = ['heart', 'gift', 'hand', 'drops', 'sprout', 'star', 'school', 'paw'];
  const QBG = [0xffe3ea, 0xffefcf, 0xdcecff, 0xd7f2ef, 0xe2f3d2, 0xebe1fb, 0xfde3d0], QAC = [0xf27b96, 0xf2a03d, 0x5b8def, 0x3fb6b0, 0x6cbd4f, 0x9b7bd6, 0xe8834a];
  class Album extends Panel {
    constructor() { super('Album'); this.portH = 1800; }
    build() {
      this.pg = 0; this.slots = [];
      this.sheet = nine(this, 'pn-card', 600, 400, 110).setAlpha(0.6); this.root.add(this.sheet);
      this.glowB = this.add.image(0, 0, 'ui-glow').setAlpha(0.9); this.big = mkBtn(this, [pic(this, 'heart', 0, -3, 0.95)], () => { sfx('spark'); this.fill(true); }, 200); base(this.big, 2); this.root.add([this.glowB, this.big]);
      this.marks = QS.map((q, i) => { const c = mkBtn(this, [pic(this, QI[i], 0, -3, 0.5)], () => this.go(i), 140); c.pl.setTint(QBG[i]); c.ring = this.add.image(0, 0, 'pn-ring').setTint(QAC[i]).setScale(0.92); c.add(c.ring); this.root.add(c); return c; });
      for (let i = 0; i < 24; i++) {
        const c = this.add.container(0, 0), pl = this.add.image(0, 0, 'ui-plate'), em = this.add.image(0, 0, 'ui-ring').setAlpha(0.45), ic = this.add.image(0, -3, 'ui', 'i-star');
        c.add([em, pl, ic]); c.pl = pl; c.em = em; c.ic = ic; this.slots.push(c); this.root.add(c);
      }
      this.cardTint = CARD;
      // turn the page with a swipe
      this.input.on('pointerup', p => { if (p.getDistanceX() > 70 && p.getDistanceX() > p.getDistanceY() * 1.6 && !this.outside({ worldX: p.worldX, worldY: p.worldY })) this.go(Phaser.Math.Clamp(this.pg + (p.upX < p.downX ? 1 : -1), 0, QS.length - 1)); });
      this.go(0, true);
    }
    go(i, first) {
      if (i === this.pg && !first) return; this.pg = i; if (!first) sfx('soft');
      const from = this.cardTint, to = mix(QBG[i], 0xffffff, 0.35); this.tweens.addCounter({ from: 0, to: 1, duration: first ? 1 : 240, onUpdate: tw => { this.cardTint = mix(from, to, tw.getValue()); this.card.setTint(this.cardTint); } });
      this.glowB.setTint(mix(QAC[i], 0xffffff, 0.7)); setPic(this.big.list[1], QI[i]); 
      this.marks.forEach((m, k) => { m.ring.setVisible(k === i); m.base = (m.sz || 1) * (k === i ? 1.12 : 0.94); m.setScale(m.base); });
      this.sheet.setTint(mix(QBG[i], 0xffffff, 0.55)); this.fill(!first);
    }
    fill(anim) {
      const arr = (Lf().rules.s.album || {})[QS[this.pg]] || [];
      this.slots.forEach((s, k) => {
        const it = arr[k]; s.em.setTint(mix(QAC[this.pg], 0xffffff, 0.35)).setVisible(!it); s.pl.setVisible(!!it); s.ic.setVisible(!!it);
        this.tweens.killTweensOf(s); s.setScale(s.sz || 1);
        if (it) { setPic(s.ic, it.i); if (anim) { s.setScale(0); this.tweens.add({ targets: s, scale: s.sz || 1, duration: 260, delay: k * 22, ease: 'Back.easeOut' }); } }
      });
    }
    arrange(M) {
      const cw = M.cw, ch = M.ch, port = M.port, cols = port ? 4 : 6, rows = 24 / cols;
      let gx, gy, gw, gh;
      if (!port) {
        const mS = Math.min(112, (ch - 260) / 8); this.marks.forEach((m, i) => { m.sz = mS / 124 * 1.12; m.setPosition(-cw / 2 + 112, -ch / 2 + 130 + i * (ch - 260) / 6); });
        this.big.setPosition(-cw / 2 + 400, -ch * 0.1); base(this.big, Math.min(2.2, ch / 560)); this.glowB.setPosition(this.big.x, this.big.y).setScale(Math.min(7, ch / 160));
        gx = -cw / 2 + 590; gw = cw / 2 - 70 - gx; gy = -ch / 2 + 100; gh = ch - 200;
      } else {
        const mS = Math.min(128, (cw - 100) / 7 - 12); this.marks.forEach((m, i) => { m.sz = mS / 124 * 1.12; m.setPosition((i - 3) * (cw - 110) / 7, -ch / 2 + 230); });
        const bs = Math.min(1.8, ch / 1000); this.big.setPosition(0, -ch / 2 + 300 + 124 * bs / 2 + 20); base(this.big, bs); this.glowB.setPosition(this.big.x, this.big.y).setScale(5.5 * bs / 1.8 * 1.2);
        gx = -cw / 2 + 60; gw = cw - 120; gy = this.big.y + 124 * bs / 2 + 60; gh = ch / 2 - 60 - gy;
      }
      const S = Math.min(200, gw / cols - 10, gh / rows - 10), sc = S / 124; this.slotS = S;
      ns(this.sheet, gw + 30, rows * (S + 10) + 40).setPosition(gx + gw / 2, gy + 20 + (rows * (S + 10) - 10) / 2);
      this.slots.forEach((s, i) => { const r = Math.floor(i / cols), c = i % cols; s.sz = sc; s.setScale(sc); s.setPosition(gx + gw / 2 + (c - (cols - 1) / 2) * (S + 10), gy + 20 + S / 2 + r * (S + 10)); s.ic.setScale(0.95); s.em.setScale(1.0); });
      this.marks.forEach((m, k) => { m.base = m.sz * (k === this.pg ? 1.12 : 0.94); m.setScale(m.base); });
    }
  }

  /* ---------- friends ---------- */
  class Friends extends Panel {
    constructor() { super('Friends'); this.portH = 1900; }
    build() {
      const Lx = Lf(), P = Lx.data.people || {}, day = (Lx.world && Lx.world.playDay) || 1;
      this.ids = Object.keys(P).filter(id => id !== 'you' && !(P[id].fromDay > day));
      const An = Lx.data.animals || {}; Object.keys(An).forEach(id => { if (!An[id].zone && (Lx.rules.s.friends[id] || 0) > 0) this.ids.push(id); });   // a pet you have been kind to is a friend too
      this.cells = this.ids.map(id => {
        const c = this.add.container(0, 0), bg = nine(this, 'pn-card', 300, 220, 110).setTint(0xffffff);
        const pt = mkPortrait(this, id, 128), st = Lx.rules.flower(id), fl = pic(this, 'flower' + Math.min(4, st), 0, 0, 1.15);
        const gnd = this.add.image(0, 0, 'ui-glow').setTint(0xcfe9b8).setAlpha(0.75);
        c.add([bg, gnd, pt, fl]); c.bg = bg; c.pt = pt; c.fl = fl; c.gnd = gnd; c.id = id; c.st = st;
        c.setSize(310, 240).setInteractive(); c.on('pointerup', () => this.cheer(c)); this.root.add(c); return c;
      });
      this.ports = this.cells.map(c => c.pt); withCast(this, () => this.ports.forEach(p => p.fill()));
      this.cells.forEach((c, i) => { c.setScale(0); this.tweens.add({ targets: c, scale: c.sc || 1, duration: 240, delay: 120 + i * 30, ease: 'Back.easeOut' }); });
    }
    cheer(c) {
      sfx('spark'); this.tweens.killTweensOf(c.fl); c.fl.setScale(c.fl.sx || 1.15); const k = c.fl.scale;
      this.tweens.add({ targets: c.fl, scale: k * 1.35, angle: 8, duration: 140, yoyo: true, onComplete: () => c.fl.setAngle(0) });
      this.tweens.add({ targets: c.pt, scale: 1.12, duration: 110, yoyo: true });
      const h = this.add.image(c.x - 40 * (c.sc || 1), c.y - 90 * (c.sc || 1), 'ui', Lf().data.art.icons.indexOf('i-heart') >= 0 ? 'i-heart' : 'i-star').setScale(0.2); this.root.add(h);
      this.tweens.add({ targets: h, scale: 0.5, y: h.y - 70, duration: 480, ease: 'Cubic.easeOut' }); this.tweens.add({ targets: h, alpha: 0, delay: 300, duration: 300, onComplete: () => h.destroy() });
    }
    arrange(M) {
      const n = this.cells.length, port = M.port, cw = M.cw, ch = M.ch;
      const cols = port ? 3 : (n > 12 ? 6 : n > 6 ? 4 : 3), rows = Math.max(1, Math.ceil(n / cols));
      const aw = cw - 130, ah = ch - (port ? 220 : 170), cwid = aw / cols, chei = ah / rows, k = Math.min(cwid / 320, chei / 250, 1.25);
      this.cells.forEach((c, i) => {
        const r = Math.floor(i / cols), q = i % cols, inRow = Math.min(cols, n - r * cols); c.sc = k; c.setScale(k);
        c.setPosition((q - (inRow - 1) / 2) * cwid, -ah / 2 + chei / 2 + r * chei + (port ? 40 : 30));
        ns(c.bg, 300, 220); c.pt.setPosition(-80, -2); c.gnd.setPosition(76, 44).setScale(1.2, 0.5); c.fl.setPosition(76, -2); c.fl.sx = 1.15;
      });
    }
  }

  /* ---------- today ---------- */
  const TBG = [0xfff0c8, 0xdcecff, 0xe3f4d6];
  class Today extends Panel {
    constructor() { super('Today'); this.portH = 1700; }
    build() {
      const R = Lf().rules, d = R.s.daily || { cards: [], gift: true };
      this.cards = [0, 1, 2].map(i => {
        const c = this.add.container(0, 0), bg = nine(this, 'pn-card', 470, 520, 110).setTint(TBG[i]), ic = pic(this, 'star', 0, 0, 2);
        const dots = []; for (let k = 0; k < 4; k++) { const e = this.add.image(0, 0, 'ui-ring').setTint(0xb9b2c9).setAlpha(0.7).setScale(0.5), f = this.add.image(0, 0, 'pn-dot').setTint(0x58c07a).setScale(0.7).setVisible(false); dots.push([e, f]); }
        const tk = this.add.image(0, 0, 'pn-ok').setScale(0.5).setVisible(false);
        c.add([bg, ic].concat(dots.reduce((a, b) => a.concat(b), []), [tk])); c.bg = bg; c.ic = ic; c.dots = dots; c.tk = tk; c.n = -1; this.root.add(c); return c;
      });
      this.glow = this.add.image(0, 0, 'ui-glow').setTint(0xffe38a).setAlpha(0);
      this.parcel = this.add.container(0, 0); this.pimg = pic(this, 'parcel', 0, 0, 2.3); this.ptk = this.add.image(0, 0, 'pn-ok').setScale(0.5).setVisible(false);
      this.pprize = null; this.parcel.add([this.pimg, this.ptk]);
      this.parcel.setSize(300, 300).setInteractive(); this.parcel.on('pointerup', () => this.openGift());
      this.root.add([this.glow, this.parcel]);
      this.chips = [0, 1].map(() => {
        const c = this.add.container(0, 0), b = nine(this, 'pn-card', 340, 150, 110).setTint(0xfff3c4), ic = pic(this, 'star', 60, -2, 0.9); c.b = b; c.ic = ic; c.pt = null; c.add([b, ic]); this.root.add(c); return c;
      });
      this.on = (n, f) => this.game.events.on('life-' + n, f, this); ['card', 'wish'].forEach(n => this.on(n, () => this.refresh(true)));
      this.refresh(false); this.ready();
    }
    gone() { ['card', 'wish'].forEach(n => this.game.events.off('life-' + n, undefined, this)); }
    refresh(anim) {
      const R = Lf().rules, d = R.s.daily || { cards: [], gift: true };
      this.cards.forEach((c, i) => {
        const x = d.cards[i]; c.setVisible(!!x); if (!x) return;
        setPic(c.ic, x.icon); const done = x.n >= x.need; c.bg.setTint(done ? 0xd9f3d6 : TBG[i]); c.tk.setVisible(done);
        c.dots.forEach((p, k) => { p[0].setVisible(k < x.need); p[1].setVisible(k < x.need && k < x.n); });
        if (anim && c.n >= 0 && x.n > c.n) { sfx('spark'); this.tweens.add({ targets: c, scale: c.sc * 1.07, duration: 140, yoyo: true }); this.burst(c.x, c.y - 40, 6); }
        c.n = x.n; c.need = x.need;
      });
      this.cardLayout();
      // the parcel
      const gift = d.gift; this.pimg.setVisible(!this.pprize); this.ptk.setVisible(gift && !this.pprize);
      this.tweens.killTweensOf(this.pimg); this.tweens.killTweensOf(this.glow); this.pimg.setAngle(0).setScale(this.pimg.k || 2.3);
      this.pimg.setTint(gift ? 0xb8b4c4 : 0xffffff); this.pimg.setAlpha(gift ? 0.7 : 1); this.parcel.input.enabled = !gift;
      if (!gift) {
        this.tweens.add({ targets: this.pimg, angle: 7, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: this.glow, alpha: 0.9, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else this.glow.setAlpha(0);
      // who wants what
      const ws = R.wishes.slice(0, 2); this.ports = this.ports || [];
      this.chips.forEach((c, i) => {
        const w = ws[i]; c.setVisible(!!w); if (!w) return; setPic(c.ic, w.icon);
        if (c.pid !== w.who) { if (c.pt) c.pt.destroy(); c.pt = mkPortrait(this, w.who, 110); c.pt.setPosition(-102, -2); c.add(c.pt); c.pid = w.who; }
      });
    }
    ready() { withCast(this, () => this.chips.forEach(c => { if (c.pt) c.pt.fill(); })); }
    openGift() {
      const id = Lf().rules.openGift(); if (!id) return; sfx('spark');
      this.tweens.killTweensOf(this.pimg); this.tweens.killTweensOf(this.glow);
      const px = this.parcel.x, py = this.parcel.y, k = this.pimg.k || 2.3;
      this.tweens.add({ targets: this.pimg, scale: k * 1.4, alpha: 0, duration: 220, onComplete: () => this.pimg.setVisible(false) });
      this.burst(px, py, 12);
      this.time.delayedCall(180, () => {
        const pz = id === 'star' ? pic(this, 'star', 0, 0, 2.4) : decorPic(this, id, 250);
        this.pprize = pz; this.parcel.add(pz); pz.setScale(0); const tk = pz.scale || 1;
        const target = id === 'star' ? 2.4 : pz._fit || (pz.texture.key === 't-decor' ? Math.min(250 / pz.width, 250 / pz.height) : 250 / 130 * 1.0);
        this.tweens.add({ targets: pz, scale: target, duration: 320, ease: 'Back.easeOut' });
        this.tweens.add({ targets: pz, y: -14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });
        this.glow.setAlpha(0.9); this.ptk.setVisible(true); this.parcel.bringToTop(this.ptk); this.ptk.setPosition(0, 150);
        this.parcel.input.enabled = false; sfx('pop');
      });
    }
    cardLayout() { /* positions are set in arrange */ }
    arrange(M) {
      const cw = M.cw, ch = M.ch, port = M.port;
      if (!port) {
        const cwid = Math.min(500, (cw - 560) / 3 - 40), chei = Math.min(540, ch - 380);
        this.cards.forEach((c, i) => { c.setPosition(-cw / 2 + 70 + cwid / 2 + i * (cwid + 36), -ch / 2 + 130 + chei / 2); this.sizeCard(c, cwid, chei); });
        const px = cw / 2 - 250, py = -ch / 2 + 130 + chei / 2; this.parcel.setPosition(px, py); this.glow.setPosition(px, py).setScale(5); this.setParcel(Math.min(2.4, chei / 220));
        this.chips.forEach((c, i) => c.setPosition(-cw / 2 + 70 + 170 + i * 390, ch / 2 - 130));
      } else {
        const cwid = (cw - 80 - 40) / 3, chei = Math.min(500, cwid * 1.5);
        this.cards.forEach((c, i) => { c.setPosition((i - 1) * (cwid + 20), -ch / 2 + 90 + chei / 2); this.sizeCard(c, cwid, chei); });
        const py = -ch / 2 + 90 + chei + 90 + Math.min(220, ch * 0.12); this.parcel.setPosition(0, py); this.glow.setPosition(0, py).setScale(5.5); this.setParcel(2.6);
        const wy = Math.min(ch / 2 - 130, py + 440); this.chips.forEach((c, i) => c.setPosition(0, wy + i * 170));
      }
    }
    setParcel(k) { this.pimg.k = k; this.pimg.setScale(k); this.parcel.setSize(260, 260); }
    sizeCard(c, w, h) {
      c.sc = 1; ns(c.bg, w, h); const s = Math.min(w / 235, h / 300, 2.2); c.ic.setScale(s).setPosition(0, -h * 0.12);
      const need = c.need || 3, gap = Math.min(90, (w - 90) / Math.max(need, 1)), ds = Math.min(1, gap / 100);
      c.dots.forEach((p, k) => { const x = (k - (need - 1) / 2) * gap, y = h * 0.3; p[0].setPosition(x, y).setScale(0.5 * ds * 1.3); p[1].setPosition(x, y).setScale(0.7 * ds * 1.0); });
      c.tk.setPosition(w / 2 - 54, -h / 2 + 54).setScale(Math.min(0.6, w / 900));
    }
  }


  /* ---------- digits: the same rounded face as the Hud's coin counter ---------- */
  const numTxt = (sc, x, y, str, size) => {
    const t = sc.add.text(x, y, String(str), { fontFamily: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif', fontSize: (size || 58) + 'px', fontStyle: '800', color: '#7a4a16' }).setOrigin(0.5);
    if (t.setResolution) t.setResolution(2); return t;
  };

  /* ---------- the shop's book of things for the room ---------- */
  class Shop extends Panel {
    constructor() { super('Shop'); this.portH = 1900; }
    preload() { if (!this.textures.exists('t-decor')) this.load.atlas('t-decor', ART + 't-decor' + EXT(), ART + 't-decor.json'); }
    build() {
      const R = Lf().rules, dec = Lf().data.decor || {};
      this.ids = R.forSale();
      this.purse = this.add.container(0, 0); this.pcoin = pic(this, 'coin', 0, -2, 0.62); this.ptxt = numTxt(this, 0, -3, R.s.coins, 62);
      this.purse.add([this.add.image(0, 0, 'ui-plate').setScale(2.5, 0.95), this.pcoin, this.ptxt]); this.root.add(this.purse);
      this.cards = this.ids.map(id => {
        const c = this.add.container(0, 0), bg = nine(this, 'pn-card', 300, 350, 110).setTint(0xffffff), im = decorPic(this, id, 190); im.y = -52;
        const pill = this.add.container(0, 112), pl = this.add.image(0, 0, 'ui-plate').setScale(1.75, 0.62).setTint(0xfff3c4), coin = pic(this, 'coin', 0, -2, 0.46), tx = numTxt(this, 0, -2, dec[id].price, 46);
        const w = tx.width + 56; coin.x = -w / 2 + 24; tx.x = coin.x + 28 + tx.width / 2; pill.add([pl, coin, tx]);
        const tk = this.add.image(0, -40, 'pn-ok').setScale(0).setAlpha(1);
        c.add([bg, im, pill, tk]); c.bg = bg; c.im = im; c.pill = pill; c.tk = tk; c.id = id; c.price = dec[id].price; c.sc = 1; c.sold = false;
        c.setSize(300, 350).setInteractive(); let dn = false;
        c.on('pointerdown', () => { dn = true; this.tweens.add({ targets: c, scale: c.sc * 0.94, duration: 70, yoyo: true }); });
        c.on('pointerout', () => { dn = false; }); c.on('pointerup', () => { if (dn) { dn = false; this.buy(c); } });
        this.root.add(c); return c;
      });
      this.none = this.add.container(0, 0); this.none.add([this.add.image(0, 20, 'pn-ok').setScale(1.3), pic(this, 'star', 150, -90, 1.6)]); this.none.setVisible(!this.cards.length); this.root.add(this.none);
      this.game.events.on('life-coins', this.coins, this); this.coins();
    }
    gone() { this.game.events.off('life-coins', this.coins, this); }
    coins() {
      const n = Lf().rules.s.coins; this.ptxt.setText(String(n)); const w = this.ptxt.width + 80; this.pcoin.x = -w / 2 + 40; this.ptxt.x = this.pcoin.x + 52 + this.ptxt.width / 2;
      this.cards.forEach(c => { const ok = n >= c.price; c.bg.setAlpha(ok ? 1 : 0.6); c.im.setAlpha(ok ? 1 : 0.5); });
    }
    buy(c) {
      if (c.sold || this.closing) return;
      if (Lf().rules.buy(c.id)) {
        c.sold = true; sfx('spark'); this.burst(c.x, c.y - 40, 10); this.coins();
        this.tweens.add({ targets: c.tk, scale: 0.8, duration: 260, ease: 'Back.easeOut' });
        this.tweens.add({ targets: c.im, y: c.im.y - 20, duration: 200, yoyo: true });
        this.time.delayedCall(700, () => { this.tweens.add({ targets: c, scale: 0, alpha: 0, duration: 220, onComplete: () => { this.cards.splice(this.cards.indexOf(c), 1); c.destroy(); this.none.setVisible(!this.cards.length); if (!this.cards.length) { this.none.setScale(0); this.tweens.add({ targets: this.none, scale: 1, duration: 300, ease: 'Back.easeOut' }); } this.layout(true); } }); });
      } else { sfx('soft'); this.tweens.killTweensOf(c.pill); c.pill.x = 0; this.tweens.add({ targets: c.pill, x: 12, duration: 50, yoyo: true, repeat: 4, onComplete: () => { c.pill.x = 0; } }); }
    }
    arrange() { this.layout(false); }
    layout(anim) {
      const M = this.M; if (!M) return; const cw = M.cw, ch = M.ch, port = M.port, n = this.cards.length;
      this.purse.setPosition(port ? -cw / 2 + 280 : -cw / 2 + 330, -ch / 2 + 110).setScale(port ? 0.9 : 1);
      this.none.setPosition(0, 40);
      if (!n) return;
      const aw = cw - 120, ah = ch - 250; let best = null;
      for (let cols = 1; cols <= Math.min(n, 8); cols++) { const rows = Math.ceil(n / cols), k = Math.min(aw / cols / 320, ah / rows / 370, 1.25); if (!best || k > best.k) best = { cols: cols, rows: rows, k: k }; }
      const cwid = aw / best.cols, chei = Math.min(ah / best.rows, cwid * 1.18), top = -ch / 2 + 215 + (ah - chei * best.rows) / 2;
      this.cards.forEach((c, i) => {
        const r = Math.floor(i / best.cols), q = i % best.cols, inRow = Math.min(best.cols, n - r * best.cols), x = (q - (inRow - 1) / 2) * cwid, y = top + chei / 2 + r * chei;
        if (c.sold) return; c.sc = best.k; this.tweens.killTweensOf(c);
        if (anim) this.tweens.add({ targets: c, x: x, y: y, scale: best.k, duration: 260, ease: 'Sine.easeInOut' }); else { c.setPosition(x, y); c.setScale(best.k); }
      });
    }
  }

  /* ---------- the child's own page: who they are, what they are good at, their money box ---------- */
  const SKC = { read: 0x5b8def, write: 0xf2a03d, count: 0x9b7bd6, build: 0xe9695c, garden: 0x6cbd4f, cook: 0xf28a3c, sport: 0x3fb6b0 };
  class Me extends Panel {
    constructor() { super('Me'); this.portH = 2000; }
    build() {
      const RU = window.LifeRules, Lx = Lf(), R = Lx.rules; this.names = RU.SKILLS.slice();
      const top = Lx.state && Lx.state.you && Lx.state.you.colors ? hex(Lx.state.you.colors.top) : 0xcfe8c0, rugC = mix(top, 0xffffff, 0.55);
      this.rug = this.add.image(0, 0, 'pn-dot').setTint(rugC); this.rug2 = this.add.image(0, 0, 'ui-ring').setTint(0xffffff).setAlpha(0.9); this.rug3 = this.add.image(0, 0, 'ui-ring').setTint(mix(top, 0xffffff, 0.3)).setAlpha(0.6);
      this.glow = this.add.image(0, 0, 'ui-glow').setTint(0xfff0c0).setAlpha(0.9);
      this.root.add([this.glow, this.rug, this.rug2, this.rug3]);
      const P = Lx.data.art.people && Lx.data.art.people.you;
      if (this.textures.exists('you') && P) { this.me = this.add.sprite(0, 0, 'you', 'idle').setOrigin(P.ax / P.fw, P.ay / P.fh); this.meH = P.h * Lx.data.art.zpx; }
      else { this.me = this.add.image(0, 0, 'pn-g-bust').setTint(INK); this.meH = 128; this.me.setOrigin(0.5, 1); }
      this.root.add(this.me); this.me.setInteractive(); this.me.on('pointerup', () => { if (this.me.setFrame && this.me.texture.has('wave')) { this.me.setFrame('wave'); sfx('spark'); this.time.delayedCall(900, () => { if (this.me.active) this.me.setFrame('idle'); }); } });
      this.rows = this.names.map(n => {
        const c = this.add.container(0, 0), pl = this.add.image(0, 0, 'ui-plate').setTint(mix(SKC[n] || 0xcccccc, 0xffffff, 0.8)), ic = pic(this, RU.SKILL_ICON[n] || 'star', 0, -3, 0.72), pips = [];
        c.add([pl, ic]);
        for (let i = 0; i < 5; i++) { const e = this.add.image(0, 0, 'ui-ring').setTint(0xcfc8dc).setAlpha(0.8), f = this.add.image(0, 0, 'pn-dot').setTint(SKC[n] || 0x58c07a); c.add([e, f]); pips.push({ e: e, f: f }); }
        c.pl = pl; c.pips = pips; c.n = n; this.root.add(c); return c;
      });
      this.box = this.add.container(0, 0); this.bx = pic(this, 'moneybox', 0, -3, 1.1); this.btxt = numTxt(this, 0, -3, R.s.coins, 62);
      this.box.add([this.add.image(0, 0, 'ui-plate').setScale(1.5), this.bx, this.add.image(190, 0, 'ui-plate').setScale(2.2, 0.95).setTint(0xfff3c4), this.btxt]); this.root.add(this.box);
      this.on = (n, f) => this.game.events.on('life-' + n, f, this); this.on('coins', () => this.refresh()); this.on('skill', () => this.refresh());
      this.refresh();
    }
    gone() { ['coins', 'skill'].forEach(n => this.game.events.off('life-' + n, undefined, this)); }
    refresh() {
      const RU = window.LifeRules, R = Lf().rules, LV = RU.LEVEL;
      this.btxt.setText(String(R.s.coins)); this.btxt.setPosition(190, -3);
      this.rows.forEach(r => {
        const xp = R.s.skills[r.n] || 0, lv = R.skill(r.n), lo = lv > 0 ? LV[lv - 1] : 0, hi = LV[lv], frac = hi ? Phaser.Math.Clamp((xp - lo) / (hi - lo), 0, 1) : 0;
        r.pips.forEach((p, i) => { const full = i < lv, part = i === lv && frac > 0; p.f.setVisible(full || part).setScale((this.pipK || 0.8) * (full ? 1 : 0.28 + 0.62 * frac)); p.f.setAlpha(full ? 1 : 0.9); });
      });
    }
    arrange(M) {
      const cw = M.cw, ch = M.ch, port = M.port, n = this.rows.length;
      let rx0, rx1, ry0, rh, figX, figY, figH;
      if (!port) {
        const LW = cw * 0.34; figX = -cw / 2 + 60 + LW / 2; figH = Math.min(ch * 0.46, 480); figY = -ch / 2 + 130 + figH;
        rx0 = -cw / 2 + 60 + LW + 60; rx1 = cw / 2 - 90; rh = Math.min(122, (ch - 190) / n); ry0 = -n * rh / 2 + rh / 2 + 10;
        this.box.setPosition(figX - 120, ch / 2 - 120);
      } else {
        figX = 0; figH = Math.min(ch * 0.24, 520); figY = -ch / 2 + 130 + figH; rx0 = -cw / 2 + 70; rx1 = cw / 2 - 70;
        this.box.setPosition(-190, figY + 175); rh = Math.min(150, (ch / 2 - 70 - (figY + 330)) / n); ry0 = figY + 330 + rh / 2;
      }
      const k = figH / (this.meH || 128); this.me.setScale(k).setPosition(figX, figY); this.glow.setPosition(figX, figY - figH * 0.45).setScale(figH / 128 * 1.7);
      this.rug.setPosition(figX, figY + 8).setScale(figH / 120 * 1.55, figH / 120 * 0.5); this.rug2.setPosition(figX, figY + 8).setScale(figH / 128 * 1.2, figH / 128 * 0.37); this.rug3.setPosition(figX, figY + 8).setScale(figH / 128 * 1.38, figH / 128 * 0.44);
      this.box.setScale(Math.min(1, ch / 900));
      const iconS = Math.min(0.9, rh / 124 * 0.9), pw = rx1 - rx0 - 124 * iconS - 40, pipS = Math.min(1, rh / 124 * 0.85, pw / 5 / 124), pipStep = Math.min(175, pw / 5);
      this.rows.forEach((r, i) => {
        r.setPosition(0, ry0 + i * rh); r.pl.setPosition(rx0 + 62 * iconS, 0).setScale(iconS); r.list[1].setPosition(rx0 + 62 * iconS, -3 * iconS).setScale(0.72 * iconS * 1.0);
        r.pips.forEach((p, j) => { const x = rx0 + 124 * iconS + 50 + j * pipStep + pipStep / 2; p.e.setPosition(x, 0).setScale(124 * pipS / 110); p.f.setPosition(x, -1); });
      });
      this.pipK = 0.8 * pipS; this.refresh();
    }
  }

  /* ---------- the decorating tray (always running; shows itself while a room is being decorated) ---------- */
  class DecoTray extends Phaser.Scene {
    constructor() { super({ key: 'DecoTray', active: true }); }
    create() {
      this.built = false; this.deco = false; this.items = []; this.rollerOn = false; this.sig = '';
      this.game.events.on('life-deco', this.onDeco, this); this.events.once('shutdown', () => this.game.events.off('life-deco', this.onDeco, this));
    }
    // the world, the data and the icon sheet arrive after this scene starts: build when they are all there
    tryBuild() {
      const L0 = Lf(); if (!L0 || !L0.data || !L0.place || !L0.rules || !this.textures.exists('ui') || !this.textures.exists('ui-plate')) return;
      paintAll(this); this.built = true;
      this.roller = mkBtn(this, [pic(this, 'roller', 0, -3, 0.78)], () => { const P = Lf().place; if (P && !P.busy) { sfx('pop'); P.decorate(true); } });
      this.roller.setVisible(false).setScale(0);
      this.tray = this.add.container(0, 0).setVisible(false);
      this.bar = nine(this, 'pn-card', 900, 190, 110).setTint(CARD); this.slotsC = this.add.container(0, 0); this.tray.add([this.bar, this.slotsC]);
      this.ok = mkBtn(this, [], () => { const P = Lf().place; if (P) P.decorate(false); }, 190); this.ok.remove(this.ok.pl, true); this.ok.addAt(this.add.image(0, 0, 'pn-ok'), 0); this.ok.setVisible(false);
      Kit.play.fit(this, () => this.place());
      this.scroll = 0; let drag = null;
      this.input.on('pointerdown', p => { if (this.deco && this.hitBar(p)) drag = { x: p.x, s: this.scroll, moved: false }; });
      this.input.on('pointermove', p => { if (!drag || !p.isDown) return; const dx = (p.x - drag.x) / this.cameras.main.zoom; if (Math.abs(dx) > 12) drag.moved = true; if (drag.moved) this.setScroll(drag.s + dx); });
      this.input.on('pointerup', () => { drag = null; });
      this.dragging = () => drag && drag.moved;
      if (L0.place.deco) this.onDeco(true);
    }
    hitBar(p) { const v = this.view, y = p.worldY, x = p.worldX; return this.deco && y > this.bar.y - 110 + this.tray.y && x > this.bar.x - this.bar.width / 2 && x < this.bar.x + this.bar.width / 2; }
    onDeco(on) {
      this.deco = !!on; if (!this.built) return;
      if (this.deco) { this.build(); this.tray.setVisible(true); this.ok.setVisible(true); this.tray.y = 300; this.ok.setScale(0); this.tweens.add({ targets: this.tray, y: 0, duration: 240, ease: 'Back.easeOut' }); this.tweens.add({ targets: this.ok, scale: 1, duration: 260, ease: 'Back.easeOut' }); sfx('pop'); }
      else { this.tweens.add({ targets: this.tray, y: 320, duration: 180, ease: 'Sine.easeIn', onComplete: () => { if (!this.deco) this.tray.setVisible(false); } }); this.tweens.add({ targets: this.ok, scale: 0, duration: 160, onComplete: () => { if (!this.deco) this.ok.setVisible(false); } }); }
      this.sig = '';
    }
    // the won things, each as its real picture, ringed when it is already out in this room
    build() {
      const L0 = Lf(), P = L0.place, owned = (L0.rules.s.owned || []).filter(id => (L0.data.decor || {})[id]);
      this.slotsC.removeAll(true); this.items = [];
      this.nOwned = owned.length; const n = Math.max(owned.length, 0);
      if (!n) { for (let i = 0; i < 3; i++) { const r = this.add.image(0, 0, 'ui-ring').setTint(0xcfc8dc).setAlpha(0.7).setScale(1.0); this.slotsC.add(r); this.items.push({ r: r, empty: true }); } }
      owned.forEach(id => {
        const c = this.add.container(0, 0), pl = this.add.image(0, 0, 'ui-plate').setScale(1.25), im = decorPic(this, id, 138), ring = this.add.image(0, 0, 'pn-ring').setTint(GREEN).setScale(1.2).setVisible(false);
        im.y = -4; c.add([pl, im, ring]); c.setSize(165, 165).setInteractive(); c.pl = pl; c.ring = ring; c.id = id; c.im = im; c.k = 1;
        let dn = false;
        c.on('pointerdown', () => { dn = true; });
        c.on('pointerout', () => { dn = false; });
        c.on('pointerup', () => { if (dn && !(this.dragging && this.dragging())) this.toggle(c); dn = false; });
        this.slotsC.add(c); this.items.push(c);
      });
      this.mark(); this.layoutItems(); this.place(); this.setScroll(0);
    }
    mark() { const P = Lf().place; this.items.forEach(c => { if (c.empty) return; const out = !!(P && P.pl && P.pl.things['dec-' + c.id]); c.ring.setVisible(out); c.pl.setTint(out ? 0xe4f7e8 : 0xffffff); }); }
    toggle(c) {
      const P = Lf().place; if (!P || !P.pl) return; const out = !!P.pl.things['dec-' + c.id];
      if (out) P.removeDecor(c.id); else if (!P.addDecor(c.id)) { this.tweens.add({ targets: c, x: c.x + 8, duration: 50, yoyo: true, repeat: 3 }); sfx('soft'); return; }
      this.mark(); this.tweens.killTweensOf(c.im); c.im.setScale(c.im.scale); const k = c.im.scale;
      this.tweens.add({ targets: c.im, scale: k * 1.25, duration: 120, yoyo: true, ease: 'Sine.easeOut' });
    }
    layoutItems() {
      const sp = 178; this.span = this.items.length * sp;
      this.items.forEach((c, i) => { const x = i * sp + sp / 2; if (c.empty) c.r.setPosition(x, 0); else c.setPosition(x, 0); });
    }
    setScroll(x) {
      const room = (this.barW || 900) - 100, over = Math.max(0, this.span - room); this.scroll = Phaser.Math.Clamp(x, -over, 0);
      this.slotsC.x = (this.bar.x - room / 2) + (over > 0 ? this.scroll : (room - this.span) / 2);
    }
    place() {
      const v = this.view; if (!this.built || !v) return;
      const x0 = v.sl + 60, x1 = v.sr - 270, w = Math.min(x1 - x0, 1700, Math.max(560, (this.span || 0) + 150)), cx = (x0 + x1) / 2, y = v.sb - 130;
      this.barW = w; this.bar.setPosition(cx, y).setSize(w, 200); this.slotsC.y = y; this.tray.y = this.tray.y;
      this.ok.setPosition(v.sr - 100, v.sb - 104); this.roller.setPosition(v.sl + 100, v.sb - 270);
      if (this.deco) this.setScroll(this.scroll);
    }
    update() {
      if (!this.built) { this.tryBuild(); return; }
      const L0 = Lf(), P = L0.place, pl = P && L0.data.places[P.pid], show = !!(P && pl && pl.decorate && !P.deco && !P.busy);
      if (show !== this.rollerOn) {
        this.rollerOn = show; this.tweens.killTweensOf(this.roller);
        if (show) { this.roller.setVisible(true); this.tweens.add({ targets: this.roller, scale: 1, duration: 240, ease: 'Back.easeOut' }); }
        else this.tweens.add({ targets: this.roller, scale: 0, duration: 160, onComplete: () => { if (!this.rollerOn) this.roller.setVisible(false); } });
        this.roller.base = 1;
      }
    }
  }

  (window.LifeScenes = window.LifeScenes || []).push(DecoTray, Maker, Wardrobe, Album, Friends, Today, Shop, Me);
})();
