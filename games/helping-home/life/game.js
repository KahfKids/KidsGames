/* Helping Home (life): game.js
   The neighbourhood, drawn with Phaser 4. world.js and rules.js decide what everyone does; this file shows the
   whole town on one map and passes on the child's taps. Art is rendered from 3D models (tools/art/) and loaded with
   Phaser's loader as the camera comes near: bg-<place>.avif (its ground), t-<place> (an atlas of its things and walls),
   p/<person> (an atlas of poses each), ui (icons). Nothing is painted in code except three plain interface
   shapes, and the child's own character, which is stacked once from tinted layers when their look changes.

   Scenes: Boot (loads the data, makes the world) -> Place (the world) + Hud (needs, prayer, what you carry, exit).
   Other files add scenes by pushing classes onto window.LifeScenes before this file runs (panels, guides).
   Taps: the ground anywhere = walk there; a thing = go and use it; a person = a ring of things to do together; a
   building or its badge = go in. Drag = move the camera; pinch or the wheel = zoom; the map button = the whole town. ?debug exposes window.LT; ?perf shows frames per second, draw calls, the game's own time per frame, the canvas size, the longest and the total time spent handing new pictures to the chip, and the memory held in pictures; ?fast runs a whole day in 20 minutes; ?img decodes pictures the engine's way (see offThread). */
(function () {
  'use strict';
  const L = window.LifeWorld, RU = window.LifeRules, BASE = '/KidsGames/games/helping-home/';
  let EXT = '.avif';      // set once at the bottom of this file, before anything loads
  const Q = new URLSearchParams(location.search), KEY = 'hh.life.v1';
  const ROOT = BASE, ART = ROOT + 'life/art/';
  const DOOR_ICON = { zoo: 'zoo', hall: 'house', living: 'sofa', kitchen: 'kitchen', yard: 'sprout', landing: 'stairs', myroom: 'bed', sister: 'bed', parents: 'bed', bathroom: 'bath',
    street: 'street', plaza: 'plaza', park: 'park', masjid: 'masjid', shop: 'shop', school: 'school', grandhouse: 'grandhouse' };
  const ADHAN = ['takbir1', 'takbir2', 'shahada1', 'shahada2', 'risala1', 'risala2', 'salah1', 'salah2', 'falah1', 'falah2', 'takbir3', 'tahlil'];
  const YOU0 = { set: 'boy-kurta', hat: true, colors: { skin: '#C98E62', top: '#3E8FD8', legs: '#2F5E9E', hair: '#33261C', hat: '#FBF6EA', scarf: '#F6E3B8' } };
  let D = null;
  const sfx = (n, o) => { try { Kit.sfx.play(n, o); } catch (e) { /* no sound */ } };
  if (window.Kit && Kit.sfx) Kit.sfx.define({
    tap: (S, t) => S.click(t, { freq: 2400, vol: 0.18 }),
    pop: (S, t) => S.glide(t, { from: 520, to: 1300, dur: 0.06, vol: 0.18 }),
    soft: (S, t) => S.burst(t, { dur: 0.12, freq: 500, q: 0.7, vol: 0.18, brown: true }),
    knock: (S, t) => S.knock(t, { size: 1.2, vol: 0.5 }),
    spark: (S, t) => S.grains(t, { n: 12, spread: 0.3, freq: 7200, vol: 0.08 }),
    click: (S, t) => S.click(t, { freq: 1500, vol: 0.28, dur: 0.03 }),
    door: (S, t) => S.knock(t, { size: 0.7, vol: 0.3 })
  });

  /* ---------- what is kept between visits ---------- */
  const Life = window.Life = { YOU0: YOU0, sfx: sfx };
  let saveT = 0;
  Life.save = function () { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(Life.state)); } catch (e) { /* private mode */ } }, 300); };
  function loadState() { let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* none */ } return s && s.v === 1 ? s : { v: 1, you: null, rules: null, at: null, dayOff: 0 }; }
  Life.ico = n => (D.art.icons.indexOf('i-' + n) >= 0 ? 'i-' + n : 'i-star');
  // today's five prayer times in minutes of the day (from the family's own place if it has been set)
  function prayTimes() {
    const out = { fajr: 300, dhuhr: 750, asr: 960, maghrib: 1110, isha: 1200 };
    try { const t = window.HHPrayer && HHPrayer.times(new Date()); if (t) for (const n in out) if (t[n]) out[n] = t[n].getHours() * 60 + t[n].getMinutes(); } catch (e) { /* not set */ }
    return out;
  }
  function makeWorld() {
    const now = new Date(), fast = Q.has('fast') || Life.state.fast;
    const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000) + (Life.state.dayOff || 0);
    const w = Life.world = new L.World(D, { clock: Q.has('clock') ? +Q.get('clock') : now.getHours() * 60 + now.getMinutes(), rate: fast ? 1.2 : 1 / 60, day: day, weekday: now.getDay(), prayTimes: prayTimes() });
    Life.rules = new RU.Rules(w, Life.state.rules, { save: s => { Life.state.rules = s; Life.save(); } });
    Life.state.rules = Life.rules.s;
    const has = id => id && w.places[id] && D.art.places[id];                        // (a place whose picture is missing cannot be shown)
    const at = has(Q.get('at')) ? Q.get('at') : has(Life.state.at) ? Life.state.at : has('myroom') ? 'myroom' : Object.keys(w.places).find(has);
    const you = w.add(new L.Person('you', Object.assign({}, D.people.you, { place: at }))), s = w.freeSpot(at, you); you.x = s.x; you.y = s.y;
    w.people.forEach(p => { if (!p.you && p.away) w.settle(p); });                  // (the play-day count is known only now)
    Life.rules.start();
    // the child's bicycle waits where it was left (by our front door the first time)
    const bk = Life.state.bike || { place: 'street', at: [6.0, 1.8] };
    if (D.kinds.bike && w.places[bk.place] && w.places[bk.place].outdoor) w.places[bk.place].add({ id: 'bike', kind: 'bike', at: bk.at.slice() });
    // the child's own arrangement of a room: things moved, and won things put out
    const dec = Life.state.decor || {};
    for (const pid in dec) {
      const pl = w.places[pid]; if (!pl) continue;
      for (const id in dec[pid].moved) { const th = pl.things[id]; if (th) { th.at = dec[pid].moved[id].slice(); pl.slotsOf(th); } }
      (dec[pid].items || []).forEach(it => { const d = (D.decor || {})[it.id]; if (d && D.kinds[d.kind]) pl.add({ id: 'dec-' + it.id, kind: d.kind, state: d.state, at: it.at.slice() }); });
      pl.regrid();
    }
    return w;
  }

  // a colour between two (t: 0 the first, 1 the second)
  const mix = (a, b, t) => { const f = s => { const x = (a >> s) & 255; return Math.round(x + (((b >> s) & 255) - x) * t); }; return (f(16) << 16) | (f(8) << 8) | f(0); };
  const SHARP = 'helping-home-sharp';           // how sharp this phone can draw and stay smooth (see watch)
  const ROOM = 0xfff0d8, WARM = 0xffe2b0;       // the light of a room's own lamp, and of a lamp out of doors

  /* ---------- the child's own character: tinted layers stacked once into one sheet ---------- */
  // The layers are rendered in a light grey (#F2F2F2), not pure white, so a chosen colour is lifted by that much first
  // and comes out as chosen instead of 5% darker.
  Life.tint = hex => { const C = Phaser.Display.Color, c = C.HexStringToColor(hex), up = v => Math.min(255, Math.round(v / 0.949)); return '#' + C.GetColor(up(c.red), up(c.green), up(c.blue)).toString(16).padStart(6, '0'); };
  Life.makeYou = function (scene, look, done) {
    const Y = D.art.you && D.art.you[look.set]; if (!Y) { done(false); return; }
    const layers = Y.layers.filter(l => l !== 'hat' || look.hat), pre = 'you-' + look.set + '-';
    layers.forEach(l => { if (!scene.textures.exists(pre + l)) scene.load.image(pre + l, ART + 'you/' + look.set + '-' + l + EXT); });
    if (!scene.cache.json.exists(pre + 'atlas')) scene.load.json(pre + 'atlas', ART + 'you/' + look.set + '.json');
    const build = () => {
      const first = scene.textures.get(pre + layers[0]).getSourceImage();
      if (scene.textures.exists('you')) { ['you-walk', 'you-walkB', 'you-ride', 'you-rideB'].forEach(k => scene.anims.remove(k)); scene.textures.remove('you'); }
      // the engine's DynamicTexture: each layer is stamped on it with its tint (multiplied, as a sprite's tint is)
      const tex = scene.textures.addDynamicTexture('you', first.width, first.height), fr = scene.cache.json.get(pre + 'atlas').frames;
      layers.forEach(l => { const col = look.colors[l]; tex.stamp(pre + l, null, 0, 0, { originX: 0, originY: 0, tint: col && l !== 'shadow' ? Phaser.Display.Color.HexStringToColor(Life.tint(col)).color : 0xffffff }); });
      tex.render();
      for (const n in fr) {
        const f = fr[n], x = tex.add(n, 0, f.frame.x, f.frame.y, f.frame.w, f.frame.h);
        if (x && f.trimmed) x.setTrim(f.sourceSize.w, f.sourceSize.h, f.spriteSourceSize.x, f.spriteSourceSize.y, f.spriteSourceSize.w, f.spriteSourceSize.h);
      }
      layers.forEach(l => scene.textures.remove(pre + l));
      D.art.people.you = { h: Y.h, fw: Y.fw, fh: Y.fh, ax: Y.ax, ay: Y.ay };
      walkAnims(scene, 'you'); done(true);
      // a lost and restored WebGL context empties a DynamicTexture (a canvas texture came back by itself): stack it again
      if (!Life.glHook) { Life.glHook = true; scene.game.renderer.on('restorewebgl', () => { const P = Life.place; if (P && P.sys.isActive() && Life.state.you) Life.makeYou(P, Life.state.you, () => P.refreshYou()); }); }
    };
    if (scene.load.list.size || scene.load.isLoading()) { scene.load.once('complete', build); if (!scene.load.isLoading()) scene.load.start(); } else build();
  };
  function walkAnims(scene, key) {
    const tex = scene.textures.get(key);                                          // people walk in 8 pictures, animals in 4
    const run = (name, pre) => { const fr = [0, 1, 2, 3, 4, 5, 6, 7].filter(i => tex.has(pre + i)); if (fr.length && !scene.anims.exists(key + '-' + name)) scene.anims.create({ key: key + '-' + name, frames: fr.map(i => ({ key: key, frame: pre + i })), frameRate: fr.length > 4 ? 11 : 7, repeat: -1 }); };
    run('walk', 'walk'); run('walkB', 'walkB');
    // on the bicycle (only the child has these frames)
    if (scene.textures.get(key).has('ride0')) ['ride', 'rideB'].forEach(n => { if (!scene.anims.exists(key + '-' + n)) scene.anims.create({ key: key + '-' + n, frames: [0, 1].map(i => ({ key: key, frame: n + i })), frameRate: 6, repeat: -1 }); });
  }

  /* Pictures are decoded off the main thread. The engine hands a downloaded picture to the graphics chip as an <img>, and
     the browser decodes it at that moment, on the main thread: on a phone the game stops for a tenth of a second or more
     each time a new part of the town loads. So each picture is also decoded in the background (createImageBitmap) while
     the engine makes its <img>, and the decoded copy is what goes to the chip, once; then it is let go, so nothing is
     held twice. The <img> stays as the engine's source (a restored WebGL context reads it again). The first picture goes
     the engine's own way: that shows which way up the engine wants pictures and how it wants their alpha (`how`).
     `?img` leaves the engine's way on, to compare. */
  function offThread(game) {
    const gl = game.renderer.gl, IF = Phaser.Loader.FileTypes.ImageFile.prototype; if (!window.createImageBitmap || IF.lifeDecode) return; IF.lifeDecode = true;
    const tex = gl.texImage2D, own = IF.onProcess; let how = null;
    gl.texImage2D = function () {
      const a = arguments, im = a[a.length - 1], b = im && im._bmp;
      if (!b) { if (!how && im instanceof HTMLImageElement) how = { imageOrientation: gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL) ? 'flipY' : 'none', premultiplyAlpha: gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL) ? 'premultiply' : 'none' }; return tex.apply(gl, a); }
      im._bmp = null; a[a.length - 1] = b;
      const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL); if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);      // (the copy is already the right way up; some browsers would turn it again)
      try { tex.apply(gl, a); } catch (e) { a[a.length - 1] = im; if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); b.close(); return tex.apply(gl, a); }
      if (flip) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); b.close();
    };
    IF.onProcess = function () {
      const blob = this.xhrLoader && this.xhrLoader.response;
      if (how && blob instanceof Blob) {                                           // the file is ready when both the <img> and the decoded copy are
        const done = this.onProcessComplete; let n = 2, bmp = null;
        this.onProcessComplete = () => { if (--n) return; if (bmp) this.data._bmp = bmp; this.onProcessComplete = done; done.call(this); };
        createImageBitmap(blob, how).then(b => { bmp = b; this.onProcessComplete(); }, () => this.onProcessComplete());
      }
      own.call(this);
    };
  }

  class Boot extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      if (!Q.has('img')) offThread(this.game);
      const w = this.scale.width, h = this.scale.height;
      this.add.rectangle(w / 2, h / 2, w * 0.3, h * 0.022, 0xffffff, 0.35);
      const bar = this.add.rectangle(w * 0.35, h / 2, 1, h * 0.022, 0xffffff).setOrigin(0, 0.5);
      this.load.on('progress', v => { bar.width = Math.max(1, w * 0.3 * v); });
      this.load.json('data', ROOT + 'life/data.json');
      this.load.atlas('ui', ART + 'ui' + EXT, ART + 'ui.json');
    }
    create() {
      D = Life.data = this.cache.json.get('data');
      for (const k in (D.art.animals || {})) D.art.people[k] = Object.assign({ animal: true }, D.art.animals[k]);   // animals are drawn as people are
      Kit.play.tex(this, 'ui-plate', 160, 160, c => { c.shadowColor = 'rgba(30,20,60,.3)'; c.shadowBlur = 14; c.shadowOffsetY = 6; c.fillStyle = '#fff'; c.beginPath(); c.arc(80, 76, 62, 0, 7); c.fill(); }, 4);
      Kit.play.tex(this, 'ui-glow', 128, 128, c => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
      Kit.play.tex(this, 'ui-pool', 128, 128, c => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); [[0, 1], [0.25, 0.62], [0.5, 0.3], [0.75, 0.09], [1, 0]].forEach(q => g.addColorStop(q[0], 'rgba(255,255,255,' + q[1] + ')')); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });      // lamplight on the ground: bright under the lamp, soon faint
      Kit.play.tex(this, 'ui-ring', 128, 128, c => { c.strokeStyle = '#fff'; c.lineWidth = 9; c.beginPath(); c.arc(64, 64, 54, 0, 7); c.stroke(); });
      Kit.play.tex(this, 'ui-card', 520, 360, c => { c.shadowColor = 'rgba(30,20,60,.28)'; c.shadowBlur = 22; c.shadowOffsetY = 8; c.fillStyle = '#fffaf0'; c.beginPath(); c.roundRect(0, 0, 520, 360, 44); c.fill(); }, 30);
      Life.state = loadState();
      const gd = Q.get('guide');                                                   // ?guide=wudu|salah: straight into a guide (for testing)
      if (gd && this.scene.get(gd === 'wudu' ? 'Wudu' : 'Salah')) { this.scene.start(gd === 'wudu' ? 'Wudu' : 'Salah', { back: () => Kit.play.exit() }); return; }
      // the Maker is launched, not started: this scene's loader must stay alive for go()
      const go = () => { makeWorld(); Life.makeYou(this, Life.state.you, () => this.scene.start('Place')); };
      if (!Life.state.you) { if (this.scene.get('Maker') && !Q.has('nomaker')) { this.scene.launch('Maker', { first: true, done: go }); return; } Life.state.you = JSON.parse(JSON.stringify(YOU0)); }
      go();
    }
  }

  /* The town: every place at its own spot on one map (place.at), seen by one camera that the child drags and pinches.
     - Each place is a Phaser Layer; the layers are drawn back to front (rank), and inside a layer things sort as before.
     - Only what is near the camera is loaded (stream): a place's ground, its sprites and its lights come and go with
       the view; far away, and when zoomed right out, one small picture of the whole town (overview) stands in.
     - A building shows its outside until the child walks in. Then the outside fades and its rooms on the child's floor
       are shown in the same spot; a wall that would hide the room the child is in is cut away. */
  const OVER = 1e6, LOD = 0.5, BLOD = 0.62, LOWMEM = !!(navigator.deviceMemory && navigator.deviceMemory <= 2), KEPT = { 't-decor': 1, 't-out': 1 };      // (KEPT: sheets more than one place uses; they stay)      // below LOD: the small picture of the town; from BLOD: a building's full picture
  class PlaceScene extends Phaser.Scene {
    constructor() { super('Place'); }
    get pid() { return this.you.place; }
    get pl() { return this.w.places[this.you.place]; }
    create() {
      const w = this.w = Life.world, T = D.art.px, Zp = D.art.zpx; this.you = w.you; Life.place = this;
      this.spr = new Map(); this.veh = new Map(); this.Z = {}; this.marks = {}; this.loading = {}; this.puffs = {}; this.bld = {}; this.busy = true; this.follow = true;
      this.iso = (x, y, z) => ({ x: (y - x) * T / 2, y: (x + y) * T / 4 - (z || 0) * Zp });
      this.floorAt = (sx, sy) => { const a = sx / (T / 2), b = sy / (T / 4); return { x: (b - a) / 2, y: (b + a) / 2 }; };
      this.at = (pl, x, y, z) => this.iso(pl.at[0] + x, pl.at[1] + y, z);
      this.rankPlaces();
      this.farL = this.add.layer().setDepth(1000);                                  // people and vehicles where no place is shown
      this.marker = this.add.image(0, 0, 'ui-ring').setScale(0.9, 0.45).setAlpha(0).setDepth(OVER - 2);
      this.carryImg = this.add.image(0, 0, 'ui', 'i-star').setVisible(false);
      // the whole map's edges on screen, for the camera
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const id in w.places) { const z = this.zv(id); x0 = Math.min(x0, z.bx0); x1 = Math.max(x1, z.bx1); y0 = Math.min(y0, z.by0); y1 = Math.max(y1, z.by1); }
      this.map = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      { const B = this.town = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }; for (const id in w.places) { const pl = w.places[id]; if (!pl.outdoor) continue; B.x0 = Math.min(B.x0, pl.at[0]); B.y0 = Math.min(B.y0, pl.at[1]); B.x1 = Math.max(B.x1, pl.at[0] + pl.w); B.y1 = Math.max(B.y1, pl.at[1] + pl.d); } }      // the town's ground, on the map
      /* Light costs nothing to draw: it is each picture's own tint. One colour over the whole town follows the clock; a
         room with its lamp on keeps a warm colour of its own; whatever stands near a lamp out of doors is tinted
         lighter. Round every lamp a soft pool lies on the ground and a glow sits at its head (pictures drawn with the
         engine's ADD blend); particles make the fireflies. There are no per-pixel lights and no full-screen filters:
         on a phone those cost more than the whole rest of the picture. By day every tint is white. */
      this.amb = 0xffffff; this.isLit = false;
      this.wireInput(); this.wire();
      this.scale.on('resize', this.fitCam, this); this.events.once('shutdown', () => this.scale.off('resize', this.fitCam, this));
      this.scene.launch('Hud');
      this.time.addEvent({ delay: 9000, loop: true, callback: () => this.remind() });
      this.time.addEvent({ delay: 220, loop: true, callback: () => this.stream() });
      this.time.addEvent({ delay: 1000, loop: true, callback: () => this.watch() });
      if (Q.has('debug')) window.LT = { game: this.game, world: w, rules: Life.rules, place: this, life: Life };
      // the first view: where the child is, loaded before anything is shown
      const cam = this.cameras.main, sky = cam.backgroundColor;
      this.fitCam(true); this.focus(); this.light();
      const go = () => {
        const O = D.art.overview; if (O && this.textures.exists('overview.s')) this.under = this.lit(this.add.image(-O.ox, -O.oy, 'overview.s').setOrigin(0).setDisplaySize(O.w / O.scale, O.h / O.scale).setDepth(-50));
        // the open grass round the town, without end: one picture repeated (the engine's TileSprite), under everything
        if (D.art.field && this.textures.exists('field')) { const m = this.map, pad = Math.max(m.w, m.h) * 1.1; this.field = this.lit(this.add.tileSprite(m.x - pad, m.y - pad, m.w + pad * 2, m.h + pad * 2, 'field').setOrigin(0).setDepth(-60)); }
        this.makeBuildings(); this.stream(); this.busy = false; this.sync(0, 0); this.centre(true); cam.fadeIn(320, sky.red, sky.green, sky.blue); };
      if (D.art.overview && D.art.overview.small && !this.textures.exists('overview.s')) this.load.image('overview.s', ART + 'overview.s' + EXT);
      if (D.art.field && !this.textures.exists('field')) this.load.image('field', ART + 'field' + EXT);
      { const t = this.target(); cam.centerOn(t.x, t.y); }                          // (before anything is asked for: only what is round the child is loaded)
      for (const lot in (D.art.buildings || {})) if (!this.textures.exists('b-' + lot + '.s')) this.load.image('b-' + lot + '.s', ART + 'b-' + lot + '.s' + EXT);
      if ((D.art.packs || []).indexOf('road') >= 0 && !this.textures.exists('t-road')) this.load.atlas({ key: 't-road', textureURL: ART + 't-road' + EXT, atlasURL: ART + 't-road.json' });
      this.stream();
      if (this.load.list.size || this.load.isLoading()) { this.load.once('complete', go); this.load.start(); } else go();
    }

    /* ---------- the order the places are drawn in: one further from the camera first ---------- */
    rankPlaces() {
      const P = this.w.places, R = {}, fl = {}, e = 0.01;
      for (const id in P) { const p = P[id]; R[id] = [p.at[0], p.at[1], p.at[0] + p.w, p.at[1] + p.d]; fl[id] = p.floor || 0; }
      // a thing that stands outside its place (a building's outside, a big tree behind the houses) is ranked by its own footprint
      for (const id in P) { const p = P[id]; for (const t in p.things) { const th = p.things[t]; if (th.at[0] >= 0 && th.at[1] >= 0) continue; const f = p.foot(th); R[id + '/' + t] = [p.at[0] + f[0], p.at[1] + f[1], p.at[0] + f[2], p.at[1] + f[3]]; fl[id + '/' + t] = 0; } }
      // the main road where it leaves the town is ranked too: what drives there is behind whatever stands nearer (the shop)
      const RD = (D.world || {}).roads || {}; (RD.out || []).forEach(o => { const c = RD.segs.main.c; R['@' + o.id] = [o.at[0], c - RD.half, o.at[0] + o.size[0], c + RD.half]; fl['@' + o.id] = 0; });
      const behind = (a, b) => { const A = R[a], B = R[b], ab = A[2] <= B[0] + e || A[3] <= B[1] + e, ba = B[2] <= A[0] + e || B[3] <= A[1] + e; return ab && !ba; };
      const key = id => fl[id] * 1000 + R[id][0] + R[id][1], left = new Set(Object.keys(R)); this.rank = {}; let n = 0;
      while (left.size) {
        const all = [...left], free = all.filter(b => !all.some(a => a !== b && behind(a, b)));
        const pickd = (free.length ? free : all).sort((a, b) => key(a) - key(b))[0];
        this.rank[pickd] = n++; left.delete(pickd);
      }
    }
    // what the scene keeps about one place
    zv(pid) {
      let z = this.Z[pid];
      if (!z) {
        const pl = this.w.places[pid], a = pl.at, tall = 420;
        z = this.Z[pid] = { id: pid, pl: pl, state: 'off', things: {}, objs: [], lamps: [], lit: [], badges: [], glow: [], walls: {}, layer: null, seen: 0, px: 0,
          bx0: this.iso(a[0] + pl.w, a[1]).x - 40, bx1: this.iso(a[0], a[1] + pl.d).x + 40, by0: this.iso(a[0], a[1]).y - tall, by1: this.iso(a[0] + pl.w, a[1] + pl.d).y + 60 };
        // out of doors the ground is tiles of its own, so the place is wanted only while one of its things is in view
        // (tx0 .. ty1: the box round their pictures; a big tree behind the houses is one of them)
        if (pl.outdoor) {
          z.tx0 = z.ty0 = z.gx0 = z.gy0 = 1e9; z.tx1 = z.ty1 = z.gx1 = z.gy1 = -1e9;                          // (gx0 .. gy1: the same box measured along the map's own two axes; a place is a diamond on the screen)
          for (const t in pl.things) {
            const th = pl.things[t], m = !th.fixed && !th.k.building && D.art.kinds[this.spriteName(th)]; if (!m) continue; const q = this.at(pl, th.at[0], th.at[1]);
            const l = q.x - m.ax, t2 = q.y - m.ay; z.tx0 = Math.min(z.tx0, l); z.tx1 = Math.max(z.tx1, l + m.w); z.ty0 = Math.min(z.ty0, t2); z.ty1 = Math.max(z.ty1, t2 + m.h);
            [[l, t2], [l + m.w, t2], [l, t2 + m.h], [l + m.w, t2 + m.h]].forEach(c => { const g = this.floorAt(c[0], c[1]); z.gx0 = Math.min(z.gx0, g.x); z.gx1 = Math.max(z.gx1, g.x); z.gy0 = Math.min(z.gy0, g.y); z.gy1 = Math.max(z.gy1, g.y); });
          }
          if (z.tx1 > z.tx0) { z.bx0 = Math.min(z.bx0, z.tx0); z.bx1 = Math.max(z.bx1, z.tx1); z.by0 = Math.min(z.by0, z.ty0); z.by1 = Math.max(z.by1, z.ty1); }
        }
      }
      return z;
    }
    shown(pid) { const z = this.Z[pid]; return !!z && z.state === 'on' && z.layer.visible; }

    /* ---------- loading what is near, letting go of what is far ---------- */
    keys(pid) {
      const sp = D.places[pid], out = (D.art.ground && sp.outdoor) || (D.art.floors && D.art.floors[pid]) ? [] : [['bg-' + pid, 'image']];      // (the town's ground is tiles; a room's floor is in the room's sheet)
      if (D.art.sheets ? D.art.sheets.indexOf('t-' + pid) >= 0 : (D.art.walls && D.art.walls[pid]) || sp.things.some(t => { const k = D.kinds[t.kind] || {}; return !k.fixed && !(k.building && D.art.buildings); })) out.push(['t-' + pid, 'atlas']);
      if (sp.outdoor && D.art.sheets && D.art.sheets.indexOf('t-out') >= 0) out.push(['t-out', 'atlas']);      // what the outdoor places share (kept: see KEPT)
      if (D.art.decor && (sp.decorate || Object.keys(this.w.places[pid].things).some(id => id.indexOf('dec-') === 0))) out.push(['t-decor', 'atlas']);
      return out;
    }
    // queue what a place still needs; true when all of it is here
    need(pid) {
      let ok = true;
      this.keys(pid).forEach(k => {
        if (this.textures.exists(k[0])) return; ok = false; if (this.loading[k[0]]) return; this.loading[k[0]] = 1;
        if (k[1] === 'image') this.load.image(k[0], ART + k[0] + EXT);
        else this.load.atlas(k[0], ART + k[0] + EXT, ART + k[0] + '.json');
      });
      return ok;
    }
    // queue a person's sheet if it is not here yet; true when it had to be queued
    wantSheet(p) {
      const key = p.you ? 'you' : 'p-' + p.sprite; if (this.textures.exists(key) || this.loading[key] || p.you || !D.art.people[p.sprite] || !p.place) return false;
      const q = this.at(this.w.places[p.place], p.x, p.y), v = this.cameras.main.worldView; if (q.x < v.x - 260 || q.x > v.right + 260 || q.y < v.y - 160 || q.y > v.bottom + 460) return false;      // (only who is in view, or about to be)
      this.loading[key] = 1; const dir = D.art.people[p.sprite].animal ? 'a/' : 'p/'; this.load.atlas(key, ART + dir + p.sprite + EXT, ART + dir + p.sprite + '.json');
      return true;
    }
    stream() {
      const cam = this.cameras.main, v = cam.worldView, mx = v.width * 0.1, my = v.height * 0.1, near = cam.zoom >= LOD * this.zs, P = this.w.places, now = this.time.now;
      const lot = this.openLot, fl = this.openFloor, dest = this.you.dest && P[this.you.dest], want = {}, pre = {};
      // the view measured along the map's two axes (its corners: least x top right, most x bottom left, least y top left, most y bottom right)
      const g0 = this.floorAt(v.right + mx, v.y - my), g1 = this.floorAt(v.x - mx, v.bottom + my), g2 = this.floorAt(v.x - mx, v.y - my), g3 = this.floorAt(v.right + mx, v.bottom + my);
      for (const id in P) {
        const pl = P[id], z = this.zv(id);
        if (pl.outdoor) { if (near && z.tx1 > v.x - mx && z.tx0 < v.right + mx && z.ty1 > v.y - my && z.ty0 < v.bottom + my && z.gx1 > g0.x && z.gx0 < g1.x && z.gy1 > g2.y && z.gy0 < g3.y) want[id] = 1; }
        else if (pl.lot === lot && pl.floor === fl) want[id] = 1;
        else if (dest && !dest.outdoor && pl.lot === dest.lot && pl.floor === dest.floor) pre[id] = 1;      // the child is on the way there
      }
      this.tiles(v, near);
      if (this.field) { const B = this.town, m = 0.25, f = [[v.x - v.width * m, v.y - v.height * m], [v.right + v.width * m, v.y - v.height * m], [v.x - v.width * m, v.bottom + v.height * m], [v.right + v.width * m, v.bottom + v.height * m]]; this.field.setVisible(!near || f.some(c => { const g = this.floorAt(c[0], c[1]); return g.x < B.x0 || g.x > B.x1 || g.y < B.y0 || g.y > B.y1; })); }      // (the open grass is drawn only when the view reaches past the town)
      // the small picture of the whole town: fetched as the camera draws back, let go when it has been near for a while
      const O = D.art.overview;
      if (O) {
        if (cam.zoom < LOD * 1.25 * this.zs) {
          this.ovSeen = now;
          if (!this.overview) { if (this.textures.exists('overview')) { delete this.loading.overview; this.overview = this.lit(this.add.image(-O.ox, -O.oy, 'overview').setOrigin(0).setScale(1 / O.scale).setDepth(-49)); } else if (!this.loading.overview) { this.loading.overview = 1; this.load.image('overview', ART + 'overview' + EXT); } }
        } else if (now - (this.ovSeen || 0) > 5000) { if (this.overview) { this.overview.destroy(); this.overview = null; } if (this.textures.exists('overview')) { this.textures.remove('overview'); delete this.loading.overview; } }
      }
      for (const id in pre) this.need(id);
      for (const id in want) { const z = this.Z[id]; z.seen = now; if (z.state !== 'on' && this.need(id)) this.build(id); }
      // what is shown: an outdoor place stays while it is loaded; a room only while its building is open on that floor
      let px = 0;
      for (const id in this.Z) {
        const z = this.Z[id]; if (z.state !== 'on') continue; px += z.px;
        const on = z.pl.outdoor ? (z.bx1 > v.x && z.bx0 < v.right && z.by1 > v.y && z.by0 < v.bottom) : !!want[id];
        if (on !== z.layer.visible) { z.layer.setVisible(on); z.lamps.forEach(l => { if (l.halo) l.halo.setVisible(on); }); if (on) this.light(); }
      }
      for (const id in this.Z) { const z = this.Z[id]; if (z.state === 'on' || want[id] || pre[id]) continue; this.keys(id).forEach(k => { if (!KEPT[k[0]] && this.textures.exists(k[0])) { this.textures.remove(k[0]); delete this.loading[k[0]]; } }); }
      const cap = LOWMEM ? 5e6 : 8e6;
      while (px > cap) {
        let old = null; for (const id in this.Z) { const z = this.Z[id]; if (z.state === 'on' && !want[id] && !pre[id] && (!old || z.seen < old.seen)) old = z; }
        if (!old) break; px -= old.px; this.drop(old.id);
      }
      this.exteriors(); this.sheets();
      if (this.load.list.size && !this.load.isLoading()) this.load.start();
    }
    /* The ground of the town: square tiles cut from one big picture (art.ground). Only the tiles in view are loaded;
       the ones seen longest ago go when there are too many. */
    tiles(v, near) {
      const G = D.art.ground; if (!G) return; const T = G.tile, now = this.time.now; if (!this.gt) { this.gt = new Map(); this.gset = {}; G.tiles.forEach(n => { this.gset[n] = 1; }); }
      let n = 0, live = 0, miss = 0;
      if (near) for (let c = Math.floor((v.x - T * 0.25) / T); c <= Math.floor((v.right + T * 0.25) / T); c++) for (let r = Math.floor((v.y - T * 0.25) / T); r <= Math.floor((v.bottom + T * 0.25) / T); r++) {
        const name = c + '_' + r; if (!this.gset[name]) continue; const key = 'w-' + name; let e = this.gt.get(name); if (!e) this.gt.set(name, e = { img: null, seen: 0 }); e.seen = now; live++;
        if (e.img) continue;
        miss++;
        if (this.textures.exists(key)) { delete this.loading[key]; e.img = this.lit(this.add.image(c * T, r * T, key).setOrigin(0).setDepth(-40)); }      // (its picture is a little bigger than the tile and overlaps its neighbours: no hairline)
        else if (!this.loading[key]) { this.loading[key] = 1; this.load.image(key, ART + 'w/' + name + EXT); }
      }
      this.gt.forEach((e, name) => { if (e.img) n++; else if (e.seen < now && this.textures.exists('w-' + name)) { this.textures.remove('w-' + name); delete this.loading['w-' + name]; } });      // (one that came too late goes again)
      const cap = live + (LOWMEM ? 2 : 6);
      while (n > cap) { let old = null, on = null; this.gt.forEach((e, name) => { if (e.img && e.seen < now && (!old || e.seen < old.seen)) { old = e; on = name; } }); if (!old) break; old.img.destroy(); old.img = null; this.textures.remove('w-' + on); n--; }
      this.tpx = n * T * T;
      if (this.under) this.under.setVisible(!near || miss > 0);                     // (the small picture of the town lies under the tiles only until they are all there)
    }
    // people's and animals' sheets: held to a budget of pixels; the one of whoever has been out of sight longest goes first
    sheets() {
      const now = this.time.now, seen = this.sseen || (this.sseen = {}), v = this.cameras.main.worldView; let keys = [];
      if (this.cameras.main.zoom >= LOD * this.zs) this.spr.forEach((s, p) => { if (p.you) return; if (s.visible && s._L.visible && s.x > v.x - 200 && s.x < v.right + 200 && s.y > v.y - 100 && s.y < v.bottom + 400) seen[s.texture.key] = now; });
      let px = 0; const size = {};
      this.textures.getTextureKeys().forEach(k => { if (k.indexOf('p-') === 0) { const im = this.textures.get(k).getSourceImage(); keys.push(k); px += size[k] = im.width * im.height; if (!seen[k]) seen[k] = now; } });
      const cap = LOWMEM ? 3e6 : 5e6;
      keys.sort((a, b) => seen[a] - seen[b]);
      while (px > cap && keys.length && now - seen[keys[0]] > 4000) {
        const k = keys.shift(); px -= size[k]; delete seen[k]; this.spr.forEach((s, p) => { if (s.texture.key === k) { this.dropSprite(s); this.spr.delete(p); } });
        ['walk', 'walkB'].forEach(n => this.anims.remove(k + '-' + n)); this.textures.remove(k); this.gone = this.gone || {}; this.gone[k] = now;
      }
    }
    drop(pid) {
      const z = this.Z[pid]; if (!z || z.state !== 'on') return;
      const out = z.pl.outdoor ? this.propLayer(this.rank[pid]) : this.farL;
      this.spr.forEach((s, p) => { if (s._L === z.layer) { out.add(s); s._L = out; } });
      this.veh.forEach(s => { if (s._L === z.layer) { out.add(s); s._L = out; } });
      if (this.carryImg._L === z.layer) { out.add(this.carryImg); this.carryImg._L = out; }
      z.lamps.forEach(l => { if (l.halo) l.halo.destroy(); });
      z.objs.forEach(o => o.destroy()); z.layer.destroy();
      for (const k in this.marks) if (this.marks[k]._pid === pid) delete this.marks[k];
      this.keys(pid).forEach(k => { if (KEPT[k[0]]) return; if (this.textures.exists(k[0])) this.textures.remove(k[0]); delete this.loading[k[0]]; });
      Object.assign(z, { state: 'off', things: {}, objs: [], lamps: [], lit: [], badges: [], glow: [], walls: {}, layer: null, px: 0, sig: null, tint: null });
    }

    /* ---------- one place: its ground, its things, its doors, its lights ---------- */
    build(pid) {
      const z = this.zv(pid), pl = z.pl, A = D.art.places[pid], o0 = this.at(pl, 0, 0), L = z.layer = this.add.layer().setDepth(this.rank[pid]);
      const keep = o => { L.add(o); z.objs.push(o); return o; };
      z.state = 'on'; z.keep = keep;
      const src = k => { const t = this.textures.exists(k) && this.textures.get(k).getSourceImage(); return t ? t.width * t.height : 0; };
      z.px = this.keys(pid).reduce((n, k) => n + (KEPT[k[0]] ? 0 : src(k[0]) * 1.25), 0);
      const F = D.art.floors && D.art.floors[pid];                              // a room's floor: pieces in the room's own sheet (no empty corners held in memory)
      if (F) { for (const n in F) { const m = F[n]; this.lit(keep(this.add.image(o0.x, o0.y, 't-' + pid, n).setOrigin(m.ax / m.w, m.ay / m.h).setDepth(-1e6)), z); } }
      else if (this.textures.exists('bg-' + pid)) this.lit(keep(this.add.image(o0.x - A.ox, o0.y - A.oy, 'bg-' + pid).setOrigin(0).setDepth(-1e6)), z);
      // the two back walls of a room, each its own picture so that it can be cut away
      const W = D.art.walls && D.art.walls[pid];
      if (W) ['L', 'R'].forEach(s => { const m = W[s]; if (m && this.textures.get('t-' + pid).has('wall-' + s)) z.walls[s] = this.lit(keep(this.add.image(o0.x, o0.y, 't-' + pid, 'wall-' + s).setOrigin(m.ax / m.w, m.ay / m.h).setDepth(-9e5)), z); });
      for (const id in pl.things) this.addThing(pl.things[id]);
      // a round badge over a building's door showing what it is, and over the stairs
      for (const id in pl.doors) {
        const d = pl.doors[id], to = this.w.places[d.to]; if (d.open || !to || !(d.stairs || (pl.outdoor && !to.outdoor))) continue;
        const front = d.wall[0] === 'F', p = this.at(pl, d.x, d.y - (pl.outdoor && !front ? 0.5 : 0), front ? 0.5 : pl.outdoor ? 2.5 : 2.05);
        const c = keep(this.add.container(p.x, p.y).setDepth(8e5)); c.add([this.add.image(0, 0, 'ui-plate').setScale(0.56), this.add.image(0, -3, 'ui', Life.ico(d.stairs ? 'stairs' : DOOR_ICON[d.to] || (to.lot && DOOR_ICON[to.lot]) || 'house')).setScale(0.44)]);
        c.setSize(120, 120).setInteractive(); c.on('pointerup', ptr => { if (!this.moved(ptr)) this.goDoor(d); });
        this.tweens.add({ targets: c, y: p.y - 9, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        c._door = d; c._lot = to.lot; z.badges.push(c);
      }
      // where people pray here: a soft light on each spot during the call to prayer
      z.glow = pl.pray.concat(pl.prayW).map(s => { const p = this.at(pl, s.x, s.y - 0.35); const g = keep(this.add.image(p.x, p.y, 'ui-glow').setScale(2.3, 1.15).setTint(0xfff0b0).setAlpha(0).setDepth(-8.5e5).setBlendMode('ADD')); g._spot = s; return g; });
      // lamps: a pool of light on the ground under each (r: how far it reaches across the screen), and a glow at its head
      const M = D.art.px / 1.414;                                                  // screen pixels per metre along the ground
      const lamp = (x, y, reach, color, power, o) => {
        const q = this.at(pl, x, y), r = reach * M, l = Object.assign({ x: q.x, y: q.y, r: r, power: power, on: 0 }, o || {});
        if (!l.room) l.pool = keep(this.add.image(q.x, q.y, 'ui-pool').setDisplaySize(r * 2, r).setTint(color).setAlpha(0).setDepth(-6e5).setBlendMode('SCREEN'));
        z.lamps.push(l); return l;
      };
      for (const id in pl.things) {
        const th = pl.things[id], gl = th.k.glow; if (!gl) continue;
        const q = this.at(pl, th.at[0], th.at[1], gl[0]);
        lamp(th.at[0], th.at[1], gl[1] * 2, 0xffd08a, pl.outdoor ? 0.5 : 0.25, { id: pid + '/' + id, halo: this.add.pointlight(q.x, q.y, 0xffd9a0, gl[1] * M * 0.36, 0, 0.08).setDepth(OVER - 3) });
      }
      if (pl.outdoor) {
        for (const id in pl.doors) { const d = pl.doors[id], to = this.w.places[d.to]; if (!d.open && d.wall[0] !== 'F' && to && !to.outdoor) lamp(d.x, d.y, 2.2, 0xffc070, 0.5); }   // light from a house
        for (const id in z.things) { const s = z.things[id].s; s._lw = this.lampAt(z, s.x, s.y); }                    // how much of the lamps' light falls on each thing
      }
      else lamp(pl.w / 2, pl.d / 2, 0, 0, 0, { room: true });                                                          // the room's own light: the whole room's colour
      if (((D.world || {}).fireflies || []).indexOf(pid) >= 0) { const c = this.at(pl, pl.w / 2, pl.d / 2); z.flies = keep(this.add.particles(c.x, c.y, 'ui-glow', { x: { min: -pl.w * 60, max: pl.w * 60 }, y: { min: -pl.d * 30, max: pl.d * 30 }, lifespan: 6000, speedX: { min: -14, max: 14 }, speedY: { min: -10, max: 10 }, scale: { min: 0.05, max: 0.1 }, tint: 0xe8ff9a, alpha: { start: 0, end: 0.9, ease: 'Sine.easeInOut', yoyo: true }, frequency: 700, blendMode: 'ADD', emitting: false }).setDepth(9e5)); }
      // which of this room's walls stand in front of another room of the same floor (to be cut when the child is in it)
      if (pl.lot) {
        z.hides = { L: [], R: [] };
        for (const id in this.w.places) {
          const q = this.w.places[id]; if (q === pl || q.lot !== pl.lot || q.floor !== pl.floor) continue;
          if (Math.abs(q.at[1] + q.d - pl.at[1]) < 0.3 && q.at[0] < pl.at[0] + pl.w - 0.5 && q.at[0] + q.w > pl.at[0] + 0.5) z.hides.L.push(id);
          if (Math.abs(q.at[0] + q.w - pl.at[0]) < 0.3 && q.at[1] < pl.at[1] + pl.d - 0.5 && q.at[1] + q.d > pl.at[1] + 0.5) z.hides.R.push(id);
        }
      }
      Life.rules.jobs.forEach(j => this.mark(j));
      if (this.w.calling) this.glow(true);
      if (this.deco && pid === this.pid) Object.keys(z.things).forEach(id => this.dragOn(z.things[id].s, true));
      this.cut(true); this.light(); this.guide(this.hint);
    }
    spriteName(th) { return th.kind + '@' + th.rot + (th.k.states && th.state != null ? '#' + th.state : ''); }
    T(th) { const z = th && this.Z[th.place]; return z && z.things[th.id]; }           // the picture of a thing, if it is shown
    addThing(th) {
      const z = this.Z[th.place]; if (!z || z.state !== 'on' || th.fixed || z.things[th.id]) return;
      if (th.k.building && D.art.buildings) return;                                // (a building's outside: see exteriors)
      const name = this.spriteName(th), m = D.art.kinds[name]; if (!m) return;
      const tex = ['t-' + th.place, 't-out', 't-decor', 'ui'].find(k => this.textures.exists(k) && this.textures.get(k).has(name)); if (!tex) return;
      const p = this.at(z.pl, th.at[0], th.at[1]), s = z.keep(this.add.image(p.x, p.y, tex, name).setOrigin(m.ax / m.w, m.ay / m.h));
      const floor = th.k.layer === 'floor', k = th.k, own = this.rank[th.place + '/' + th.id];
      if (own != null) this.propLayer(own).add(s);                                 // it stands beyond the back edge: drawn in its own turn
      s.setDepth(floor ? -7e5 + p.y : p.y); s._tid = th.id; this.lit(s, z);
      const t = z.things[th.id] = { s: s, th: th, depth: s.depth, f: z.pl.foot(th), solid: k.solid === 'rect' || k.solid === 'circle',
        use: !!((k.slots && k.slots.length) || k.act || k.takes || k.source || k.item) };
      t.rank = own != null ? own : this.rank[th.place];
      if (m.ay > 250 && m.w > 200) t.tall = { x0: p.x - m.w * 0.3, x1: p.x + m.w * 0.3, y0: p.y - m.ay, y1: p.y - 105 };      // a tree or the like: it goes see-through in front of someone
    }
    propLayer(rank) { const L = this.props || (this.props = {}); return L[rank] || (L[rank] = this.add.layer().setDepth(rank)); }
    dropSprite(s) { if (s._bub) s._bub.destroy(); s.destroy(); }
    // after the wardrobe: show the child's new look
    refreshYou() { const s = this.spr.get(this.you); if (s) { this.dropSprite(s); this.spr.delete(this.you); } }

    /* ---------- a building opens when the child is in it; a wall in the child's way is cut ---------- */
    focus() {
      const pl = this.pl, lot = pl.lot || null, fl = pl.floor || 0;
      if (lot !== this.openLot || fl !== this.openFloor) { this.openLot = lot; this.openFloor = fl; if (!this.busy) this.stream(); }
      this.cut(); this.exteriors();
      if (Life.state.at !== this.pid) { Life.state.at = this.pid; Life.save(); }
    }
    cut(now) {
      const here = this.pid;
      for (const id in this.Z) {
        const z = this.Z[id]; if (z.state !== 'on' || !z.hides) continue;
        ['L', 'R'].forEach(s => { const wl = z.walls[s]; if (!wl) return; const a = z.hides[s].indexOf(here) >= 0 ? 0 : 1; if (wl._a === a) return; wl._a = a; this.tweens.killTweensOf(wl); if (now) wl.setAlpha(a); else this.tweens.add({ targets: wl, alpha: a, duration: 220 }); });
      }
    }
    /* Nothing tall may hide a person, as in The Sims: a tree (or anything as tall and wide) that stands in front of the
       child turns see-through, and half see-through in front of anyone else, and comes back when they have passed. */
    seeThrough() {
      const you = this.you, ppl = [];
      this.spr.forEach((s, p) => { if (s.visible && !p.hidden) ppl.push({ x: s.x, y0: s.y - s._h, y1: s.y - 20, d: s.depth, r: this.rank[p.place], you: p === you }); });
      for (const id in this.Z) {
        const z = this.Z[id]; if (z.state !== 'on' || !z.layer.visible) continue;
        for (const tid in z.things) {
          const t = z.things[tid], b = t.tall, r = t.rank; if (!b) continue; let a = 1;
          for (const q of ppl) { if (q.x < b.x0 || q.x > b.x1 || q.y1 < b.y0 || q.y0 > b.y1) continue; if (q.r > r || (q.r === r && q.d > t.depth)) continue; a = Math.min(a, q.you ? 0.35 : 0.6); }
          if (t.fade === a) continue; t.fade = a; this.tweens.killTweensOf(t.s); this.tweens.add({ targets: t.s, alpha: a, duration: 200 });
        }
      }
    }
    /* The outside of a building. A small copy of each is always there (it is what the far view shows); the full picture
       is loaded only while the building is in view, closed and seen from near. The outside goes while the child is
       inside the building, and while it stands in front of the building the child is in. */
    makeBuildings() {
      for (const id in this.w.places) { const pl = this.w.places[id]; for (const t in pl.things) {
        const th = pl.things[t], lot = th.k.building, m = lot && D.art.buildings && D.art.buildings[lot]; if (!m || !this.textures.exists('b-' + lot + '.s')) continue;
        const p = this.at(pl, th.at[0], th.at[1]), L = this.propLayer(this.rank[id + '/' + t]);
        const far = this.lit(this.add.image(p.x, p.y, 'b-' + lot + '.s').setOrigin(m.ax / m.w, m.ay / m.h).setScale(1 / m.far)); L.add(far);
        this.bld[lot] = { th: th, pid: id, lot: lot, m: m, p: p, L: L, far: far, parts: (m.parts || []).map((q, i) => ({ q: q, key: 'b-' + lot + '-' + i, s: null })), a: 1, v: 1, x0: p.x - m.ax, y0: p.y - m.ay, k: pl.at[0] + pl.at[1] + th.at[0] + th.at[1] - (th.k.size[0] + th.k.size[1]) / 2 };
      } }
    }
    exteriors() {
      const open = this.openLot, cam = this.cameras.main, v = cam.worldView, big = cam.zoom >= BLOD * this.zs; let box = null;
      if (open) for (const id in this.w.places) { const pl = this.w.places[id]; if (pl.lot !== open || pl.floor !== this.openFloor) continue; const z = this.zv(id), k = pl.at[0] + pl.at[1]; box = box ? { x0: Math.min(box.x0, z.bx0), x1: Math.max(box.x1, z.bx1), y0: Math.min(box.y0, z.by0 + 200), y1: Math.max(box.y1, z.by1), k: Math.min(box.k, k) } : { x0: z.bx0, x1: z.bx1, y0: z.by0 + 200, y1: z.by1, k: k }; }
      this.bpx = 0;
      for (const lot in this.bld) {
        const b = this.bld[lot], m = b.m, key = 'b-' + lot; let a = 1;
        if (lot === open) a = 0;
        else if (box && b.k > box.k && b.x0 + m.w > box.x0 && b.x0 < box.x1 && b.y0 + m.h > box.y0 && b.y0 < box.y1) a = 0;
        if (b.a !== a) { b.a = a; if (b.tw) b.tw.remove(); b.tw = this.tweens.addCounter({ from: b.v, to: a, duration: 260, onUpdate: tw => { b.v = tw.getValue(); b.far.setAlpha(b.v); b.parts.forEach(q => { if (q.s) q.s.setAlpha(b.v); }); } }); }
        this.bpx += m.w * m.h * m.far * m.far;
        // the full picture, strip by strip: wanted while it can be seen from near; let go of otherwise
        for (const q of b.parts) {
          const x = b.x0 + q.q.x, y = b.y0 + q.q.y, want = a === 1 && big && x + q.q.w > v.x - 60 && x < v.right + 60 && y + q.q.h > v.y - 60 && y < v.bottom + 60;
          if (want && !q.s) {
            if (!this.textures.exists(q.key)) { if (!this.loading[q.key]) { this.loading[q.key] = 1; this.load.image(q.key, ART + q.key + EXT); } }
            else { delete this.loading[q.key]; q.s = this.lit(this.add.image(x, y, q.key).setOrigin(0).setAlpha(b.v)); b.L.add(q.s); }
          } else if (!want && q.s && (b.v < 0.02 || a === 1)) { q.s.destroy(); q.s = null; if (this.textures.exists(q.key)) this.textures.remove(q.key); }
          else if (!want && !q.s && this.textures.exists(q.key)) { this.textures.remove(q.key); delete this.loading[q.key]; }
          if (q.s) this.bpx += q.q.w * q.q.h * 1.25;
        }
      }
      for (const id in this.Z) this.Z[id].badges.forEach(c => { if (c._lot) c.setVisible(c._lot !== open || !this.Z[id].pl.outdoor); });
    }

    /* ---------- decorating: in a room that allows it, things are dragged to new spots and won things are added ---------- */
    dragOn(s, on) { if (on) { s.setInteractive(); this.input.setDraggable(s, true); } else if (s.input) { this.input.setDraggable(s, false); s.disableInteractive(); } }
    decorate(on) {
      const pid = on ? this.pid : (this.decoPid || this.pid);
      this.deco = !!on && !!D.places[pid].decorate; this.closeRing(); if (on) this.w.stop(this.you);
      const z = this.Z[pid]; if (this.held) this.held.up(); if (z) Object.keys(z.things).forEach(id => this.dragOn(z.things[id].s, this.deco));
      if (!this.deco) this.saveDecor(); this.decoPid = this.deco ? pid : null;
      this.game.events.emit('life-deco', this.deco);
    }
    canSit(th, x, y) {
      const pl = this.w.places[th.place], k = th.k, w2 = k.size[(th.rot / 90 | 0) % 2 ? 1 : 0] / 2, d2 = k.size[(th.rot / 90 | 0) % 2 ? 0 : 1] / 2;
      if (x - w2 < 0.3 || y - d2 < 0.3 || x + w2 > pl.w - 0.05 || y + d2 > pl.d - 0.05) return false;
      for (const id in pl.doors) { const d = pl.doors[id]; if (Math.abs(d.x - x) < w2 + 0.8 && Math.abs(d.y - y) < d2 + 0.8) return false; }
      if (k.solid === 'none' || !k.solid) return true;
      for (const id in pl.things) {
        const o = pl.things[id]; if (o === th || o.k.solid === 'none' || !o.k.solid) continue; const f = pl.foot(o);
        if (x + w2 > f[0] - 0.1 && x - w2 < f[2] + 0.1 && y + d2 > f[1] - 0.1 && y - d2 < f[3] + 0.1) return false;
      }
      return true;
    }
    grab(id, ptr) {
      this.held = null; const z = this.Z[this.pid], t = z && z.things[id], th = t && t.th; if (!th || th.slots.some(s => s.by)) return;
      const pl = z.pl, loc = p => { const f = this.floorAt(p.worldX, p.worldY); return { x: f.x - pl.at[0], y: f.y - pl.at[1] }; };
      const from = [th.at[0], th.at[1]], off = loc(ptr); off.x -= th.at[0]; off.y -= th.at[1]; let ok = true;
      this.held = {
        t: t,
        move: p => {
          if (!t.s.active) return; const f = loc(p), x = Math.round((f.x - off.x) * 4) / 4, y = Math.round((f.y - off.y) * 4) / 4, q = this.at(pl, x, y);
          ok = this.canSit(th, x, y); th.at = [x, y]; t.s.setPosition(q.x, q.y).setDepth(9e5 - 1).setTint(ok ? 0xffffff : 0xff9a9a);
        },
        up: () => {
          this.held = null; if (!t.s.active) return;
          if (!ok) th.at = from; if (th.at[0] !== from[0] || th.at[1] !== from[1]) sfx('knock');
          this.settleThing(th); this.saveDecor();
        }
      };
      sfx('tap');
    }
    settleThing(th) {
      const t = this.T(th), pl = this.w.places[th.place], q = this.at(pl, th.at[0], th.at[1]); pl.slotsOf(th); pl.regrid(); if (!t) return;
      t.f = pl.foot(th); t.depth = th.k.layer === 'floor' ? -7e5 + q.y : q.y; t.s.setPosition(q.x, q.y).setDepth(t.depth); { const z = this.Z[th.place]; t.s.setTint(z && z.tint != null ? z.tint : this.amb); }
    }
    // add something the child has won to this room, or put it away again
    addDecor(id) {
      const d = D.decor[id], pl = this.pl; if (!d || pl.things['dec-' + id]) return false;
      const s = this.w.freeSpot(this.pid, null), th = pl.add({ id: 'dec-' + id, kind: d.kind, state: d.state, at: [Math.round(s.x * 4) / 4, Math.round(s.y * 4) / 4] }); if (!th) return false;
      for (let i = 0; i < 60 && !this.canSit(th, th.at[0], th.at[1]); i++) { const q = this.w.freeSpot(this.pid, null); th.at = [Math.round(q.x * 4) / 4, Math.round(q.y * 4) / 4]; }
      this.addThing(th); const t = this.T(th); if (t) { this.settleThing(th); if (this.deco) this.dragOn(t.s, true); } this.saveDecor(); sfx('pop'); return true;
    }
    removeDecor(id) { const pl = this.pl, th = pl.things['dec-' + id], t = this.T(th); if (!th) return; delete pl.things[th.id]; if (t) { t.s.destroy(); delete this.Z[th.place].things[th.id]; } pl.regrid(); this.saveDecor(); sfx('soft'); }
    saveDecor() {
      const pid = this.decoPid || this.pid, pl = this.w.places[pid], base = {}; D.places[pid].things.forEach(t => { base[t.id] = t.at; });
      const out = { moved: {}, items: [] };
      for (const id in pl.things) { const th = pl.things[id]; if (id.indexOf('dec-') === 0) out.items.push({ id: id.slice(4), at: th.at }); else if (base[id] && (base[id][0] !== th.at[0] || base[id][1] !== th.at[1])) out.moved[id] = th.at; }
      (Life.state.decor = Life.state.decor || {})[pid] = out; Life.save();
    }

    /* ---------- the camera: dragged with one finger, pinched with two (or the wheel); it goes with the child until moved ---------- */
    fitCam(first) {
      const cam = this.cameras.main, gw = this.scale.width, gh = this.scale.height, m = this.map; if (!m) return;
      // zs: how sharp the canvas is against the sharpest (2 canvas pixels to a screen pixel). Every zoom is measured against
      // it, so a softer canvas shows the same part of the town at the same size (and the same detail is loaded).
      const d = Kit.play.dpr(), zs = d / 2, was = this.zs, cx = cam.scrollX + (this.cw || cam.width) / 2, cy = cam.scrollY + (this.ch || cam.height) / 2; this.zs = zs;
      this.z0 = Phaser.Math.Clamp(Math.min(gh / d / 490, gw / d / 450), 0.5, 1) * zs; this.zMin = Math.min(this.z0, Math.max(0.1 * zs, Math.min(gw / m.w, gh / m.h) * 0.96)); this.zMax = Math.max(1.3 * zs, this.z0 * 1.6);
      if (first === true) cam.setZoom(this.z0); else { cam.setZoom(Phaser.Math.Clamp(cam.zoom * zs / (was || zs), this.zMin, this.zMax)); cam.scrollX = cx - cam.width / 2; cam.scrollY = cy - cam.height / 2; }      // (the middle of the view stays where it was)
      this.cw = cam.width; this.ch = cam.height;
      this.bound();
    }
    // the whole town at once (the map button), and back to the child
    mapView() { const cam = this.cameras.main, out = cam.zoom > this.zMin * 1.25, z = out ? this.zMin : this.z0; if (out) this.setFollow(false); else this.centre(); this.tweens.addCounter({ from: cam.zoom, to: z, duration: 420, ease: 'Sine.easeInOut', onUpdate: tw => { cam.setZoom(tw.getValue()); this.bound(); if (out) cam.centerOn(this.map.x + this.map.w / 2, this.map.y + this.map.h / 2); } }); }
    bound() { const cam = this.cameras.main, m = this.map, vw = cam.width / cam.zoom, vh = cam.height / cam.zoom; cam.setBounds(m.x - vw * 0.35, m.y - vh * 0.35, m.w + vw * 0.7, m.h + vh * 0.7); }
    zoomAt(sx, sy, z) {
      const cam = this.cameras.main, z0 = cam.zoom, a = { x: cam.scrollX + cam.width / 2 + (sx - cam.width / 2) / z0, y: cam.scrollY + cam.height / 2 + (sy - cam.height / 2) / z0 }; z = Phaser.Math.Clamp(z, this.zMin, this.zMax); if (z === z0) return;
      cam.setZoom(z); this.bound(); cam.scrollX = a.x - cam.width / 2 - (sx - cam.width / 2) / z; cam.scrollY = a.y - cam.height / 2 - (sy - cam.height / 2) / z;
    }
    // what the camera goes with: the child, or the bus the child is on
    target() { const b = this.w.bus; if (b && b.carry === this.you) return this.iso(b.x, b.y, 0.8); const p = this.w.xy(this.you); return this.iso(p.x, p.y, 0.8); }
    setFollow(v) { if (this.follow !== v) { this.follow = v; this.game.events.emit('life-follow', v); } }
    centre(now) { this.setFollow(true); if (now) { const t = this.target(); this.cameras.main.centerOn(t.x, t.y); } }
    moved(ptr) { return this.panned || ptr.getDistance() > 14 * Kit.play.dpr(); }
    wireInput() {
      const inp = this.input, cam = this.cameras.main; inp.addPointer(1);
      let pinch = 0;
      inp.on('pointerdown', () => { if (!inp.pointer1.isDown || !inp.pointer2.isDown) { pinch = 0; } });
      inp.on('pointermove', ptr => {
        if (this.busy || this.held) return;
        const a = inp.pointer1, b = inp.pointer2;
        if (a.isDown && b.isDown) {                                                  // two fingers: zoom about the point between them
          const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch > 0 && d > 0) this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, cam.zoom * d / pinch);
          pinch = d; this.panned = true; this.setFollow(false); return;
        }
        if (!ptr.isDown) return;
        if (!this.panned && ptr.getDistance() > 14 * Kit.play.dpr()) { this.panned = true; this.closeRing(); this.setFollow(false); }
        if (this.panned && !pinch) { cam.scrollX -= (ptr.x - ptr.prevPosition.x) / cam.zoom; cam.scrollY -= (ptr.y - ptr.prevPosition.y) / cam.zoom; }
      });
      inp.on('wheel', (ptr, over, dx, dy) => { this.zoomAt(ptr.x, ptr.y, cam.zoom * (dy > 0 ? 0.88 : 1.14)); });
      inp.on('pointerup', (ptr, over) => {
        const was = this.panned, any = inp.pointer1.isDown || inp.pointer2.isDown || (inp.mousePointer && inp.mousePointer.isDown);
        if (!any) { this.panned = false; pinch = 0; }
        if (this.busy || was || any || over.length) return;
        if (this.ring) { this.closeRing(); return; }
        this.tap(ptr.worldX, ptr.worldY);
      });
      // decorating: a thing in the child's own room is dragged with the engine's own drag
      inp.on('dragstart', (ptr, s) => { if (s._tid && this.deco) this.grab(s._tid, ptr); });
      inp.on('drag', (ptr, s) => { if (this.held && this.held.t.s === s) this.held.move(ptr); });
      inp.on('dragend', (ptr, s) => { if (this.held && this.held.t.s === s) this.held.up(); });
    }

    // day and night, and a lamp switched off
    light() {
      const c = this.w.clock, pt = this.w.prayTimes || { fajr: 300, maghrib: 1110 };
      // k: how far into the night (0 day, 1 night), from the real prayer times
      const k = c < pt.fajr - 30 || c > pt.maghrib + 70 ? 1 : c < pt.fajr + 40 ? 1 - (c - pt.fajr + 30) / 70 : c > pt.maghrib ? (c - pt.maghrib) / 70 : 0;
      const d = Math.min(1, k + (this.w.calling ? 0.06 : 0));
      const amb = d < 0.5 ? mix(0xffffff, 0xe6bfb0, d * 2) : mix(0xe6bfb0, 0x6474b0, (d - 0.5) * 2), out = this.lampsOn = Math.min(1, Math.max(0, (k - 0.1) * 1.6));
      this.isLit = d > 0.01;
      if (amb !== this.amb) {                                                      // what belongs to no place: the field, the ground, the outsides of buildings, what is on the road
        this.amb = amb;
        [this.field, this.under, this.overview].forEach(o => { if (o) o.setTint(amb); }); if (this.gt) this.gt.forEach(e => { if (e.img) e.img.setTint(amb); });
        for (const lot in this.bld) { const b = this.bld[lot]; b.far.setTint(amb); b.parts.forEach(q => { if (q.s) q.s.setTint(amb); }); }
        this.veh.forEach(s => s.setTint(amb));
        this.cameras.main.setBackgroundColor(((0xa1 * (amb >> 16 & 255) / 255) << 16) | ((0xde * (amb >> 8 & 255) / 255) << 8) | (0x75 * (amb & 255) / 255));     // (the colour of the field, in this light, for the moment before its picture is there)
      }
      for (const id in this.Z) {
        const z = this.Z[id]; if (z.state !== 'on') continue; const vis = z.layer.visible; let room = 0, sig = '';
        const off = Object.keys(this.w.lamps).some(i => i.indexOf(id + '/') === 0 && this.w.lamps[i]);
        z.lamps.forEach(l => {
          const on = !vis || (l.id && this.w.lamps[l.id]) ? 0 : l.room ? (off ? 0 : Math.min(1, k * 1.5)) : out;
          l.on = on; if (l.room) room = on; else sig += (on * 50 | 0) + ',';
          if (l.pool) l.pool.setAlpha(on * l.power); if (l.halo) l.halo.intensity = on * 0.2;
        });
        const tint = z.pl.outdoor ? amb : mix(amb, ROOM, room * 0.62); sig = tint + ':' + sig;
        if (sig !== z.sig) {
          z.sig = sig; z.tint = tint; z.lit = z.lit.filter(o => o.active);
          z.lit.forEach(o => o.setTint(o._lw && out ? mix(tint, WARM, Math.min(0.6, o._lw * out)) : tint));
        }
        if (z.flies) { if (k > 0.7 && vis) z.flies.start(); else z.flies.stop(); }
      }
      this.shade();
    }
    // how much of a place's lamps' light falls at a point on the ground (0 none, 1 right under one)
    lampAt(z, x, y) { let m = 0; for (const l of z.lamps) { if (!l.pool) continue; const dx = (x - l.x) / l.r, dy = (y - l.y) / (l.r * 0.5), q = 1 - Math.sqrt(dx * dx + dy * dy); if (q > m) m = q; } return m; }
    // people take the light of where they stand
    shade() {
      const out = this.lampsOn || 0;
      this.spr.forEach((s, p) => {
        const z = this.Z[p.place]; let t = this.amb;
        if (z && z.state === 'on' && z.tint != null) { t = z.tint; if (out && z.pl.outdoor) { const lw = this.lampAt(z, s.x, s.y); if (lw > 0) t = mix(t, WARM, Math.min(0.6, lw * out)); } }
        if (s._tint !== t) { s._tint = t; s.setTint(t); }
      });
    }
    /* A phone that cannot hold the frame rate draws fewer pixels: after four slow seconds one step softer, and it is kept
       for next time. If the step did not help (the phone is slow at something else) it is taken back and no more are tried. */
    watch() {
      const W = this.fps || (this.fps = { slow: 0 }), f = this.game.loop.actualFps;
      if (W.done || this.busy || this.load.isLoading()) { W.slow = 0; return; }
      if (W.t) { if (++W.t.n < 4) return; if (f < W.t.f * 1.15) { Kit.play.sharp(W.t.d); W.done = true; } else { try { localStorage.setItem(SHARP, String(Kit.play.dpr())); } catch (e) { /* private mode */ } } W.t = null; W.slow = 0; return; }
      W.slow = f < 45 ? W.slow + 1 : 0;
      if (W.slow >= 4) { const d = Kit.play.dpr(); if (d > 1) { W.t = { f: f, n: 0, d: d }; Kit.play.sharp(Math.max(1, d - 0.25)); } else W.done = true; }
    }
    // something the light falls on (ground, walls, furniture, people, vehicles): it carries the colour of its place
    lit(o, z) { if (z) z.lit.push(o); if (o.setTint) o.setTint(z && z.tint != null ? z.tint : this.amb); return o; }

    /* ---------- the child's taps: a person first, then a thing that can be used, then the ground ---------- */
    tap(wx, wy) {
      if (this.you.praying || this.you.riding === 'bus') return;
      const zoom = this.cameras.main.zoom, reach = Math.max(46, 34 * this.zs / zoom);
      // someone (their whole height, and a finger's width either side)
      let who = null, best = 1e9;
      this.spr.forEach((s, p) => {
        if (p === this.you || !s.visible || s.alpha < 0.5) return; const h = Math.max(s._h, 60 / zoom);
        if (Math.abs(wx - s.x) > reach || wy > s.y + 14 || wy < s.y - h - 18) return;
        const dd = Math.hypot(wx - s.x, (wy - (s.y - h / 2)) * 0.5); if (dd < best) { best = dd; who = p; }
      });
      if (who) { this.tapPerson(who); return; }
      // a thing that does something, by its own shape (the engine reads the picture's alpha); the one in front wins
      let hit = null, hz = null, hd = -1e18, nearT = null, nearD = Math.max(40, 30 / zoom);
      for (const id in this.Z) {
        const z = this.Z[id]; if (z.state !== 'on' || !z.layer.visible) continue;
        for (const tid in z.things) {
          const t = z.things[tid], s = t.s; if (!t.use || s.alpha < 0.5) continue;
          const lx = wx - s.x + s.displayOriginX, ly = wy - s.y + s.displayOriginY;
          if (lx >= 0 && ly >= 0 && lx < s.width && ly < s.height) {
            const a = this.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), s.texture.key, s.frame.name), d = this.rank[id] * 1e7 + t.depth;
            if (a > 40 && d > hd) { hd = d; hit = t; hz = z; }
          }
          { const cx = s.x - s.displayOriginX + s.width / 2, cy = s.y - s.displayOriginY + s.height / 2, dd = Math.hypot(wx - cx, wy - cy); if (dd < nearD) { nearD = dd; nearT = t; } }
        }
      }
      hit = hit || nearT;
      if (hit) { this.tapThing(hit.th); return; }
      // a building's outside: go in by its door
      for (const lot in this.bld) {
        const s = this.bld[lot].far; if (this.bld[lot].v < 0.5) continue; const lx = (wx - s.x) / s.scaleX + s.displayOriginX, ly = (wy - s.y) / s.scaleY + s.displayOriginY;
        if (lx >= 0 && ly >= 0 && lx < s.width && ly < s.height && this.textures.getPixelAlpha(Math.floor(lx), Math.floor(ly), s.texture.key) > 40) { const d = this.doorOf(lot); if (d) { this.goDoor(d); return; } }
      }
      // the ground: a room of the open building, or the town
      const f = this.floorAt(wx, wy); let pl = null;
      for (const id in this.Z) { const z = this.Z[id], q = z.pl; if (!q.outdoor && z.state === 'on' && z.layer.visible && f.x >= q.at[0] && f.y >= q.at[1] && f.x < q.at[0] + q.w && f.y < q.at[1] + q.d) pl = q; }
      pl = pl || this.w.zoneAt(f.x, f.y);
      if (!pl) {                                                                   // just off the edge of the map: the nearest ground
        let bd = 2.5; for (const id in this.w.places) { const q = this.w.places[id]; if (!q.outdoor) continue; const cx = Phaser.Math.Clamp(f.x, q.at[0], q.at[0] + q.w), cy = Phaser.Math.Clamp(f.y, q.at[1], q.at[1] + q.d), dd = Math.hypot(f.x - cx, f.y - cy); if (dd < bd) { bd = dd; pl = q; } }
      }
      if (pl) this.tapFloor(pl, f.x - pl.at[0], f.y - pl.at[1]);
    }
    doorOf(lot) { for (const id in this.w.places) { const pl = this.w.places[id]; if (!pl.outdoor) continue; for (const k in pl.doors) { const d = pl.doors[k], to = this.w.places[d.to]; if (to && to.lot === lot) return d; } } return null; }
    // walk to a spot in any place, and then do something there
    reach(pid, x, y, then) { const w = this.w, you = this.you; w.stop(you); this.centreIfSeen(); return w.travel(you, pid, x, y, then); }
    centreIfSeen() { const s = this.spr.get(this.you), v = this.cameras.main.worldView; if (s && s.x > v.x && s.x < v.right && s.y > v.y && s.y < v.bottom) this.centre(); }
    tapFloor(pl, x, y) {
      const w = this.w, you = this.you, g = pl.grid, here = pl.id === this.pid;
      const pr = w.prayers[pl.id];
      if (here && pr && pr.stage !== 'done') { const s = pl.pray.concat(pl.prayW).find(q => !q.by && Math.hypot(x - q.x, y - q.y + 0.4) < 0.8); if (s) { this.joinPrayer(); return; } }
      if (here && !w.calling && this.scene.get('Salah') && pl.pray.some(q => Math.hypot(x - q.x, y - q.y + 0.4) < 0.75)) { const q = pl.pray[0]; w.stop(you); w.go(you, q.x, q.y, () => { you.face = '-y'; w.emit('guide', 'salah', null); }); sfx('pop'); return; }
      const e = pl.outdoor ? 0.13 : 0.35, t = g.spot(Phaser.Math.Clamp(x, e, pl.w - (pl.outdoor ? 0.13 : 0.25)), Phaser.Math.Clamp(y, e, pl.d - (pl.outdoor ? 0.13 : 0.25))); if (!t) return;
      if (!this.reach(pl.id, t.x, t.y)) return; sfx('tap');
      const p = this.at(pl, t.x, t.y); this.marker.setPosition(p.x, p.y).setAlpha(0.9).setScale(0.5, 0.25);
      this.tweens.killTweensOf(this.marker); this.tweens.add({ targets: this.marker, scaleX: 1.1, scaleY: 0.55, alpha: 0, duration: 520, ease: 'Sine.easeOut' });
    }
    tapThing(th) {
      this.closeRing(); if (this.you.praying) return; const w = this.w, you = this.you; let ok;
      if (th.place === you.place) { ok = w.use(you, th.id); this.centreIfSeen(); }
      else { const pl = w.places[th.place], s = pl.grid.spot(th.at[0], th.at[1]) || { x: th.at[0], y: th.at[1] }; ok = this.reach(th.place, s.x, s.y, () => { if (pl.things[th.id] === th) w.use(you, th.id); }); }
      sfx(ok ? 'pop' : 'soft');
      const t = this.T(th); if (t) this.tweens.add({ targets: t.s, scaleY: 1.06, scaleX: 0.97, duration: 90, yoyo: true });
    }
    goDoor(d) { if (this.busy || this.you.praying) return; this.closeRing(); sfx('tap'); this.reach(d.to); }
    joinPrayer() { if (this.w.joinPrayer(this.you)) { sfx('soft'); return true; } return false; }
    // do something with someone: at once if they are in the same place, or after walking to where they are
    withP(p, fn) { const w = this.w, you = this.you; if (p.place === you.place) { fn(); return; } if (p.away || !p.place) return; this.reach(p.place, p.x, p.y, () => { if (p.place === you.place) fn(); }); }
    tapPerson(p) {
      if (p === this.you || this.you.praying || p.praying) return;
      this.closeRing(); sfx('tap');
      const s = this.spr.get(p), w = this.w, you = this.you, items = p.animal ? [] : [['salam', () => this.withP(p, () => w.meet(you, p, 'salam'))]];
      if (p.animal) {                                                              // stroke it if you can reach it; feed it at its bowl or trough
        if (!p.zone || !p.food) items.push(['paw', () => this.withP(p, () => w.meet(you, p))]);
        const th = p.food && p.place === p.home && w.places[p.home].things[p.food]; if (th) items.push([th.k.icon || 'seeds', () => this.tapThing(th)]);
        if (!items.length) return;
      } else {
        if (you.carry) items.push([you.carry, () => this.withP(p, () => w.meet(you, p, 'give'))]);
        if (p.family) items.push(['hug', () => this.withP(p, () => w.meet(you, p, 'hug'))]);
      }
      const top = s.y - D.art.people[p.sprite].h * D.art.zpx - 70;
      this.ring = items.map((it, i) => {
        const c = this.add.container(s.x, top + 60).setDepth(OVER).setScale(0);
        c.add([this.add.image(0, 0, 'ui-plate').setScale(0.62), this.add.image(0, -3, 'ui', Life.ico(it[0])).setScale(0.5)]);
        c.setSize(112, 112).setInteractive(); c.on('pointerup', () => { sfx('pop'); this.closeRing(); it[1](); });
        this.tweens.add({ targets: c, x: s.x + (i - (items.length - 1) / 2) * 112, y: top, scale: Math.max(1, 0.8 * this.zs / this.cameras.main.zoom), duration: 240, ease: 'Back.easeOut', delay: i * 45 });
        return c;
      });
      // their friendship flower, above the ring
      const fl = this.add.image(s.x, top - 96, 'ui', Life.ico('flower' + Math.min(4, Life.rules.flower(p.id)))).setDepth(OVER).setScale(0); this.tweens.add({ targets: fl, scale: 0.5, duration: 240, ease: 'Back.easeOut' }); this.ring.push(fl);
    }
    closeRing() { if (this.ring) { this.ring.forEach(c => c.destroy()); this.ring = null; } }

    /* ---------- small pictures that rise, bubbles, marks ---------- */
    rise(icon, x, y, o) {
      o = o || {};
      const i = this.add.image(x, y, 'ui', Life.ico(icon)).setDepth(OVER).setScale(0.1);
      this.tweens.add({ targets: i, scale: o.scale || 0.5, duration: 220, ease: 'Back.easeOut' });
      this.tweens.add({ targets: i, y: y - (o.up || 70), alpha: 0, duration: o.dur || 1100, delay: 250, ease: 'Sine.easeIn', onComplete: () => i.destroy() });
    }
    // a little flurry of one picture (hearts, coins): the engine's particle emitter, one kept for each picture and size,
    // pops 'n' of them up one after another (a random delay up to 0.44 s; scale 0 until then) and lets them drift up and fade
    puff(icon, x, y, n, k, up) {
      const fr = Life.ico(icon), key = fr + k + up; let e = this.puffs[key];
      if (!e || !e.active) {
        const E = Phaser.Math.Easing, life = 1350;
        e = this.puffs[key] = this.add.particles(0, 0, 'ui', { frame: fr, emitting: false, lifespan: life, delay: { min: 0, max: 440 }, speedY: -up / (life / 1000),
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-30, -8, 60, 16) },
          scale: { start: 0, end: k, ease: t => E.Back.Out(Math.min(1, t * life / 220)) },
          alpha: { start: 1, end: 0, ease: t => (t * life < 250 ? 0 : E.Sine.In((t * life - 250) / (life - 250))) } }).setDepth(OVER);
      }
      e.explode(n, x, y);
    }
    bubble(p, icon, ms) {
      const s = this.spr.get(p); if (!s || !s.visible) return; if (s._bub) s._bub.destroy();
      const c = s._bub = this.add.container(s.x, s.y - s._h - 46).setDepth(OVER - 1).setScale(0);
      c.add([this.add.image(0, 0, 'ui-plate').setScale(0.5), this.add.image(0, -3, 'ui', Life.ico(icon)).setScale(0.42)]);
      this.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.easeOut' });
      this.time.delayedCall(ms || 2400, () => { if (!c.active) return; if (s._bub === c) s._bub = null; this.tweens.add({ targets: c, scale: 0, duration: 160, onComplete: () => c.destroy() }); });
    }
    // a waiting chore: a small bobbing picture over the thing
    mark(j) {
      if (this.marks[j.k]) return; const z = this.Z[j.place], t = z && z.state === 'on' && z.things[j.thing]; if (!t) return;
      const m = D.art.kinds[this.spriteName(t.th)], x = t.s.x, y = t.s.y - (m ? m.ay : 60) - 34;
      const c = z.keep(this.add.container(x, y).setDepth(8e5 + 1)); c.add([this.add.image(0, 0, 'ui-plate').setScale(0.4).setTint(0xfff3c4), this.add.image(0, -2, 'ui', Life.ico(j.icon)).setScale(0.32)]);
      this.tweens.add({ targets: c, y: y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      c._pid = j.place; this.marks[j.k] = c;
    }
    unmark(j) { const c = this.marks[j.k]; if (c) { delete this.marks[j.k]; this.tweens.add({ targets: c, scale: 0, duration: 200, onComplete: () => c.destroy() }); } }
    // people who wish for something show it now and then
    remind() {
      this.w.people.forEach(a => { if (!a.animal || a.away || !this.shown(a.place) || a.needs.food > 0.4 || !a.food) return; const th = this.w.places[a.home].things[a.food]; if (th && th.k.states && th.state === th.k.states[0]) this.bubble(a, th.k.icon || 'seeds', 2600); });   // a hungry animal asks
      Life.rules.wishes.forEach(x => { const q = this.w.by[x.who]; if (q && !q.away && !q.hidden) this.bubble(q, x.icon, 2600); }); this.light();
    }
    // point the way to another place: the camera goes to look at it for a moment, and its door's badge grows and shines
    guide(pid) {
      const fresh = pid && pid !== this.hint; this.hint = pid && pid !== this.pid ? pid : null; const to = this.hint && this.w.places[this.hint];
      for (const id in this.Z) this.Z[id].badges.forEach(c => { const on = to && (c._door.to === this.hint || (to.lot && c._lot === to.lot && !c._door.stairs)); c.setScale(on ? 1.35 : 1); c.list[0].setTint(on ? 0xffe38a : 0xffffff); });
      if (to && fresh && !this.busy) { const d = to.outdoor ? null : this.doorOf(to.lot), q = d ? this.w.places[d.place] : to, p = d ? this.at(q, d.x, d.y) : this.at(to, to.w / 2, to.d / 2); if (q.lot !== this.openLot || q.outdoor) this.peek = { x: p.x, y: p.y, until: this.time.now + 2600 }; }
    }
    glow(on) { for (const id in this.Z) this.Z[id].glow.forEach((g, i) => { if (!g.active) return; this.tweens.killTweensOf(g); if (on) this.tweens.add({ targets: g, alpha: 0.7, duration: 700, yoyo: true, repeat: -1, delay: i * 120 }); else this.tweens.add({ targets: g, alpha: 0, duration: 800 }); }); }

    /* ---------- what the world tells us ---------- */
    wire() {
      const w = this.w, on = w.on, here = p => p && !p.away && p.place && this.shown(p.place), S = p => { const s = this.spr.get(p); return s && s.visible ? s : null; }, R = Life.rules, T = th => this.T(th);
      const hud = (n, a, b) => this.game.events.emit('life-' + n, a, b);
      on.want = (p, th) => { if (!p.you && here(p) && th.k.icon) this.bubble(p, th.k.icon); };
      on.start = (p, th) => { if (!here(p)) return; if (p.you && th.k.lesson && R.staffed(p.place)) { const tch = w.here(p.place).find(o => o.slot && o.slot.staff), pid = p.place; ['book', 'abacus', 'pencil'].forEach((ic, i) => this.time.delayedCall(600 + i * 2600, () => { if (tch && tch.place === pid) this.bubble(tch, ic, 2200); })); } const t = T(th); if (t && th.k.pose === 'reach') this.tweens.add({ targets: t.s, angle: 2.2, duration: 220, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' }); if (p.you && th.k.icon && S(p)) { this.rise(th.k.icon, S(p).x, S(p).y - 150, { scale: 0.46 }); sfx('pop'); } };
      on.end = (p, th) => { if (p.you && th && S(p)) { this.rise('star', S(p).x, S(p).y - 160, { scale: 0.4 }); sfx('spark'); } };
      on.full = (p, th) => { const t = T(th); if (t && p.you) { this.tweens.add({ targets: t.s, x: t.s.x + 6, duration: 50, yoyo: true, repeat: 3 }); sfx('soft'); } };
      on.no = on.full; on.hands = (p) => { if (p.you) { sfx('soft'); hud('hands'); } };
      on.kick = (p, th) => {
        const t = T(th); if (!t) return; sfx('knock'); const pl = w.places[th.place];
        const s = w.freeSpot(th.place, null), to = this.at(pl, s.x, s.y), x0 = t.s.x, y0 = t.s.y; th.at = [s.x, s.y];
        this.tweens.addCounter({ from: 0, to: 1, duration: 700, ease: 'Sine.easeOut', onUpdate: tw => { if (!t.s.active) return; const k = tw.getValue(); t.s.x = x0 + (to.x - x0) * k; t.s.y = y0 + (to.y - y0) * k - Math.abs(Math.sin(k * Math.PI * 2.5)) * 46 * (1 - k); t.s.setDepth(t.s.y); t.depth = t.s.y; t.s.angle = k * 540; } });
      };
      on.lamp = () => { sfx('click'); this.light(); };
      on.state = th => { const t = T(th); if (!t) return; const n = this.spriteName(th), m = D.art.kinds[n]; if (m && t.s.texture.has(n)) { t.s.setFrame(n).setOrigin(m.ax / m.w, m.ay / m.h); this.tweens.add({ targets: t.s, scaleX: 1.08, scaleY: 1.08, duration: 140, yoyo: true }); } };
      on.thing = th => { this.addThing(th); const t = T(th); if (t) { t.s.setScale(0); this.tweens.add({ targets: t.s, scale: 1, duration: 260, ease: 'Back.easeOut' }); } };
      on.take = (p, th) => { const t = T(th); if (t) { delete this.Z[th.place].things[th.id]; t.s.destroy(); } if (p.you) { sfx('pop'); hud('carry'); } };
      on.got = (p) => { if (p.you) hud('carry'); };
      on.drop = (p) => { if (p.you) { sfx('soft'); hud('carry'); } };
      on.put = (p, th, item) => { const t = T(th); if (t && here(p)) { this.rise(item, t.s.x, t.s.y - 90, { scale: 0.4, up: -40, dur: 500 }); this.tweens.add({ targets: t.s, scaleY: 1.1, duration: 110, yoyo: true }); sfx('knock'); } if (p.you) hud('carry'); };
      const hearts = (p, q) => { const a = S(p), b = S(q); if (!a || !b) return; sfx('spark'); this.puff('heart', (a.x + b.x) / 2, Math.min(a.y, b.y) - 170, 3, 0.34, 90); };
      on.salam = (p, q) => { if (here(p) && (p.you || q.you)) hearts(p, q); else if (here(p)) this.bubble(p, 'salam', 1500); };
      on.hug = hearts;
      on.gift = (p, q, item) => { const a = S(p), b = S(q); if (!a || !b) return; hearts(p, q); const i = this.add.image(a.x, a.y - 110, 'ui', Life.ico(item)).setScale(0.4).setDepth(OVER); this.tweens.add({ targets: i, x: b.x, y: b.y - 120, duration: 500, ease: 'Sine.easeInOut', onComplete: () => i.destroy() }); hud('carry'); };
      on.cross = (p, from, to) => {
        if (p.you) { const a = w.places[from], b = w.places[to]; if (!(a && b && a.outdoor && b.outdoor)) sfx('door'); if (this.deco) this.decorate(false); this.focus(); if (this.hint === to) this.guide(null); }
        else if (this.Z[to] && this.Z[to].state === 'on' && this.wantSheet(p) && !this.load.isLoading()) this.load.start();
      };
      on.back = p => { if (here(p) && this.wantSheet(p) && !this.load.isLoading()) this.load.start(); };
      on.adhan = name => { this.glow(true); this.light(); hud('adhan', true); this.adhan(name); };
      on.prayStart = pid => { const z = this.Z[pid]; if (z) z.glow.forEach(g => { if (!g.active) return; this.tweens.killTweensOf(g); this.tweens.add({ targets: g, alpha: 0.4, duration: 500 }); }); };
      on.prayEnd = (pid, who) => { const z = this.Z[pid]; if (z) z.glow.forEach(g => { if (g.active) { this.tweens.killTweensOf(g); this.tweens.add({ targets: g, alpha: 0, duration: 800 }); } }); if (who.indexOf(this.you) >= 0) { sfx('spark'); try { window.KahfBridge && KahfBridge.complete(); } catch (e) { /* not in the app */ } } };
      on.prayOver = () => { this.glow(false); this.light(); hud('adhan', false); };
      on.guide = (name, th) => { const sc = name === 'wudu' ? 'Wudu' : 'Salah'; if (this.scene.get(sc)) { this.scene.pause(); this.scene.setVisible(false, 'Hud'); this.scene.launch(sc, { back: () => { this.scene.setVisible(true, 'Hud'); this.scene.resume(); } }); } else if (S(this.you)) this.rise('drop', S(this.you).x, S(this.you).y - 150); };
      on.wardrobe = () => hud('open', 'Wardrobe');
      on.job = j => this.mark(j); on.jobDone = (j, p) => { this.unmark(j); if (p && p.you) hud('cheer', j.icon); };
      on.sticker = (q, icon) => { hud('sticker', q, icon); };
      on.flower = (id, st) => { const q = w.by[id]; if (q && S(q)) { this.rise('flower' + Math.min(4, st), S(q).x, S(q).y - 200, { scale: 0.7, up: 110, dur: 1800 }); sfx('spark'); } hud('flower', id, st); };
      on.unlock = id => hud('unlock', id);
      on.wish = x => { const q = w.by[x.who]; if (q && here(q)) this.bubble(q, x.icon, 3000); hud('wish'); };
      on.wishDone = x => { hud('wish'); hud('cheer', x.icon); }; on.wishGone = () => hud('wish');
      on.card = c => hud('card', c); on.cardsDone = () => hud('cheer', 'star');
      on.grow = (th, what) => { const t = T(th); if (t) { this.rise(what === 'pick' ? 'veg' : what === 'water' ? 'drop' : 'sprout', t.s.x, t.s.y - 80, { scale: 0.5 }); sfx(what === 'water' ? 'soft' : 'pop'); } hud('carry'); };
      const heart3 = (x, y) => this.puff('heart', x, y, 3, 0.3, 70);
      on.feed = (p, th) => { const t = T(th); if (t) { heart3(t.s.x, t.s.y - 60); sfx('knock'); } if (p && p.you) hud('carry'); };
      on.need = (p, th, item) => { if (p.you) { sfx('soft'); this.bubble(this.you, item, 2400); } };      // "bring this first"
      on.notyet = (p, th) => { on.full(p, th); };
      on.fedok = (p, th) => { const t = T(th); if (t) this.rise('heart', t.s.x, t.s.y - 60, { scale: 0.3 }); };
      on.collect = (p, th, item) => { const t = T(th); if (t) this.rise(th.k.icon || item, t.s.x, t.s.y - 80, { scale: 0.4, up: -40, dur: 500 }); sfx('pop'); if (p.you) hud('carry'); };
      on.pet = (p, q) => { const s = S(q); if (s) heart3(s.x, s.y - D.art.people[q.sprite].h * D.art.zpx - 30); sfx('pop'); };
      on.far = () => sfx('soft');
      on.fed = th => { const t = T(th); if (t) heart3(t.s.x, t.s.y - 60); };
      on.day = () => { hud('day'); this.light(); };
      // money and learning
      on.coins = (total, d, icon) => { hud('coins', total, d); if (d > 0 && S(this.you)) { this.puff('coin', S(this.you).x, S(this.you).y - 150, Math.min(5, d), 0.32, 80); sfx('spark'); } };
      on.poor = th => { sfx('soft'); hud('poor'); const t = T(th); if (t) this.tweens.add({ targets: t.s, x: t.s.x + 6, duration: 50, yoyo: true, repeat: 3 }); };
      on.closed = (p, th) => { sfx('soft'); const t = T(th); if (t) this.rise('cross', t.s.x, t.s.y - 110, { scale: 0.5 }); };
      on.bought = (p, th, item) => { hud('carry'); sfx('click'); const st = w.here(p.place).find(o => o.slot && o.slot.staff), a = S(p), b = st && S(st); if (a && b) { const i = this.add.image(a.x, a.y - 110, 'ui', Life.ico('coin')).setScale(0.34).setDepth(OVER); this.tweens.add({ targets: i, x: b.x, y: b.y - 120, duration: 450, ease: 'Sine.easeInOut', onComplete: () => i.destroy() }); this.bubble(st, 'heart', 1400); } };
      on.gave = th => { const t = T(th); if (t) { this.rise('coin', t.s.x, t.s.y - 120, { scale: 0.36, up: -50, dur: 500 }); this.time.delayedCall(450, () => { if (t.s.active) this.rise('heart', t.s.x, t.s.y - 90, { scale: 0.4 }); }); } sfx('spark'); };
      on.shop = () => hud('open', 'Shop');
      on.skill = (name, lv, up) => { hud('skill', name, up ? lv : 0); };
      on.ride = p => { if (!p.you) return; sfx('click'); hud('carry'); const b = this.pl.things.bike; Life.state.bike = p.riding === 'bike' ? null : (b ? { place: this.pid, at: b.at } : Life.state.bike); Life.save(); };
      on.waitBus = p => { if (S(p)) this.bubble(p, 'bus', 3000); sfx('tap'); };
      on.board = () => { sfx('door'); this.centre(); }; on.off = () => { sfx('door'); this.centre(); };
      on.gone = p => { const s2 = this.spr.get(p); if (s2) { this.spr.delete(p); this.tweens.add({ targets: s2, alpha: 0, duration: 260, onComplete: () => this.dropSprite(s2) }); } };
    }
    // the recorded adhan, phrase by phrase, quietly. Never a device voice. The prayer waits until it has been heard.
    adhan(name) {
      const c0 = this.w.calling; if (!c0) return;
      let S = null, ctx = null; try { S = Kit.sfx; ctx = S.lib.ctx; } catch (e) { /* no sound */ }
      if (!ctx || ctx.state !== 'running' || S.muted) return;
      c0.hold = true;
      const list = ADHAN.slice(); if (name === 'fajr') list.splice(10, 0, 'fajr1', 'fajr2');
      const next = () => {
        if (this.w.calling !== c0) return; const n = list.shift(); if (!n) { c0.hold = false; return; }
        fetch(BASE + 'audio/adhan-' + n + '.m4a').then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a, b => {
          if (this.w.calling !== c0) return; const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 0.6; s.buffer = b; s.connect(g); g.connect(S.lib.out || ctx.destination); s.onended = next; s.start();
        }, () => { c0.hold = false; })).catch(() => { c0.hold = false; });
      };
      next();
    }

    /* ---------- every frame: step the world, then put each sprite where its person is ---------- */
    update(time, delta) {
      const dt = Math.min(0.05, delta / 1000); this.w.step(dt); if (this.busy) return;
      this.sync(time, dt); if ((this.tick = (this.tick || 0) + 1) % 6 === 0) { this.seeThrough(); this.shade(); }
      // the camera goes with the child (or looks, for a moment, at a place being pointed out) unless it has been moved by hand
      const cam = this.cameras.main, pk = this.peek && this.time.now < this.peek.until ? this.peek : (this.peek = null);
      if (pk || this.follow) { const t = pk || this.target(), k = Math.min(1, dt * (pk ? 3 : 5)), cx = cam.scrollX + cam.width / 2, cy = cam.scrollY + cam.height / 2; cam.scrollX += (t.x - cx) * k; cam.scrollY += (t.y - cy) * k; }
      else if (!this.input.activePointer.isDown && this.you.path.length) this.centreIfSeen();
    }
    layerOf(pid) { const z = this.Z[pid]; return z && z.state === 'on' ? z.layer : null; }
    sync(time, dt) {
      const w = this.w, Zp = D.art.zpx, P = w.places; let i = 0;
      for (const p of w.people) {
        let s = this.spr.get(p); const key = p.you ? 'you' : 'p-' + p.sprite, pl = !p.away && p.place ? P[p.place] : null;
        // seen: in a place that is shown; or out of doors anywhere, drawn over the small picture of the town
        const L = pl && (this.layerOf(p.place) || (pl.outdoor ? this.propLayer(this.rank[p.place]) : null)), vis = !!L && (L.visible || pl.outdoor);
        if (!vis) { if (s) { this.dropSprite(s); this.spr.delete(p); } continue; }
        if (!s) {
          if (!this.textures.exists(key)) { if (this.cameras.main.zoom >= LOD * this.zs && !(this.gone && this.time.now - (this.gone[key] || -1e9) < 3000) && this.wantSheet(p) && !this.load.isLoading()) this.load.start(); continue; }
          delete this.loading[key]; walkAnims(this, key);
          const d = D.art.people[p.sprite];
          s = this.lit(this.add.sprite(0, 0, key, 'idle').setOrigin(d.ax / d.fw, d.ay / d.fh)); s._h = d.h * Zp; s._key = '';
          this.spr.set(p, s); if (!p.you) { s.setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 220 }); }
        }
        if (s._L !== L) { L.add(s); s._L = L; }
        i++;
        // where they are on the map; a step through a door is walked, not jumped
        const wx = pl.at[0] + p.x, wy = pl.at[1] + p.y;
        if (s._wx == null || !dt) { s._wx = wx; s._wy = wy; }
        else { const dx = wx - s._wx, dy = wy - s._wy, dd = Math.hypot(dx, dy); if (dd < 0.3 || dd > 2.2) { s._wx = wx; s._wy = wy; } else { const st = Math.min(dd, dt * 5); s._wx += dx / dd * st; s._wy += dy / dd * st; } }
        const pos = this.iso(s._wx, s._wy), back = p.face === '-x' || p.face === '-y', walking = p.path.length > 0; let flip = p.face === '+x' || p.face === '-y', f;
        if (p.animal) f = walking ? (back ? '@walkB' : '@walk') : (p.pose === 'eat' || p.pose === 'sit' || p.pose === 'sleep') ? (s.texture.has(p.pose) ? p.pose : 'sit') : (back ? 'idleB' : 'idle');
        else if (p.riding === 'bike' && s.texture.has('ride0')) f = walking ? (back ? '@rideB' : '@ride') : (back ? 'rideB0' : 'ride0');
        else if (walking) f = p.carry ? (back ? 'carryB' : 'carry') : (back ? '@walkB' : '@walk');
        else if (p.pose[0] === 'p') { f = s.texture.has(p.pose) ? p.pose : p.pose === 'ptakbir' ? 'pstand' : 'psit'; flip = false; }
        else if (p.pose === 'sit') f = back ? 'sitB' : 'sit';
        else if (p.pose === 'sitlow') f = 'sitlow';
        else if (p.pose === 'reach') f = back ? 'reachB' : 'reach';
        else if (p.pose === 'salam' || p.pose === 'wave') f = back ? 'idleB' : p.pose;
        else f = p.carry ? (back ? 'carryB' : 'carry') : (back ? 'idleB' : 'idle');
        if (f !== s._key) { s._key = f; if (f[0] === '@') s.play(key + '-' + f.slice(1), true); else { s.anims.stop(); s.setFrame(f); } }
        s.setFlipX(flip).setVisible(!p.hidden);
        const bob = walking && p.carry ? Math.abs(Math.sin(time / 110)) * 5 : 0;
        s.setPosition(pos.x, pos.y - bob);
        s.scaleY = (walking || f[0] === 'p') ? 1 : 1 + Math.sin(time / 520 + i * 2) * 0.012;
        // in front of or behind each piece of furniture, by which side of it the person is on
        let depth = pos.y; const z = this.Z[p.place], things = z ? z.things : null;
        if (things) {
          if (p.state === 'use' && p.slot && p.thing && things[p.thing.id]) depth = things[p.thing.id].depth + (p.slot.over ? 1 : -1);
          else for (const id in things) {
            const t = things[id]; if (!t.solid) continue; const q = t.f;
            const front = p.x >= q[2] - 0.05 || p.y >= q[3] - 0.05, behind = p.x <= q[0] + 0.05 || p.y <= q[1] + 0.05;
            if (front && !behind && depth <= t.depth) depth = t.depth + 0.5; else if (behind && !front && depth >= t.depth) depth = t.depth - 0.5;
          }
        }
        s.setDepth(depth);
        if (s._bub) s._bub.setPosition(s.x, s.y - s._h - 46);
        if (p.you) {
          const c = this.carryImg; c.setVisible(!!p.carry && !p.hidden);
          if (p.carry) { if (c._L !== L) { L.add(c); c._L = L; } if (c._item !== p.carry) { c._item = p.carry; c.setFrame(Life.ico(p.carry)); } c.setScale(0.3).setPosition(s.x + (flip ? -1 : 1) * (back ? -8 : 8), s.y - s._h * 0.56 - bob).setDepth(depth + (back ? -0.2 : 0.2)); }
        }
      }
      // what is on the roads
      if (!this.textures.exists('t-road')) return;
      const vs = w.vehicles(), tex = this.textures.get('t-road');
      this.veh.forEach((s, v) => { if (vs.indexOf(v) < 0) { s.destroy(); this.veh.delete(v); } });
      for (const v of vs) {
        let s = this.veh.get(v); const st = v.state ? '#' + v.state : '', n = [v.rot, v.rot % 180 ? 0 : v.rot].map(r => v.kind + '@' + r + st).find(x => tex.has(x)); if (!n) continue;
        if (!s) { s = this.lit(this.add.image(0, 0, 't-road', n)); s._n = ''; this.veh.set(v, s); }
        if (s._n !== n) { const m = D.art.kinds[n]; s._n = n; s.setFrame(n).setOrigin(m.ax / m.w, m.ay / m.h); }
        // (beyond the town's edge it is drawn in that stretch of road's own turn: behind whatever stands nearer; and it fades away at the road's end)
        const E = D.world.roads.ends, zn = w.zoneAt(v.x, v.y), o = !zn && (D.world.roads.out || []).find(e => v.x >= e.at[0] && v.x < e.at[0] + e.size[0]);
        const L = zn ? this.layerOf(zn.id) || this.propLayer(this.rank[zn.id]) : o ? this.propLayer(this.rank['@' + o.id]) : this.farL; if (s._L !== L) { L.add(s); s._L = L; }
        s.setAlpha(Phaser.Math.Clamp(Math.min(v.x - E[0][0], E[1][0] - v.x) / 2.5, 0, 1));
        const q = this.iso(v.x, v.y); s.setPosition(q.x, q.y + (v.v > 0.4 ? Math.sin(time / 55 + v.x) * 0.7 : 0)).setDepth(q.y);
      }
    }
  }

  /* The interface: your four needs, the call to prayer, what you carry, the way out, and the doors to the panels. */
  class Hud extends Phaser.Scene {
    constructor() { super('Hud'); }
    create() {
      Kit.play.fit(this, () => this.place());
      const P = () => Life.place, ev = this.game.events, w = Life.world, R = Life.rules;
      const btn = (icon, fn, sc) => {
        const c = this.add.container(0, 0), im = this.add.image(0, -4, 'ui', Life.ico(icon)).setScale(sc || 0.78);
        c.add([this.add.image(0, 0, 'ui-plate'), im]); c.icon = im; c.setSize(150, 150).setInteractive();
        c.on('pointerdown', () => { sfx('tap'); this.tweens.add({ targets: c, scale: c.scale * 0.9, duration: 70, yoyo: true }); });
        c.on('pointerup', fn); return c;
      };
      this.exit = btn('house', () => Kit.play.exit());
      this.moon = btn('moon', () => this.pray());
      this.hand = btn('hand', () => { w.drop(w.you); }).setVisible(false);
      this.bike = btn('bike', () => { w.stop(w.you); w.dismount(w.you); }).setVisible(false);
      this.find = btn('follow', () => { const p = P(); if (p) p.centre(); }, 0.62).setVisible(false);       // back to the child, after looking round
      this.mapB = btn('map', () => { const p = P(); if (p && !p.busy) p.mapView(); }, 0.62);                   // the whole town
      this.panels = [['album', 'Album'], ['people', 'Friends'], ['star', 'Today']].filter(p => this.scene.get(p[1])).map(p => btn(p[0], () => this.open(p[1]), 0.62));
      this.gauges = [['food', 'dates', 0xf2a03d], ['rest', 'cushion', 0x5b8def], ['fun', 'ball', 0x3fb37f], ['clean', 'drop', 0x4fb6d9]].map(g => {
        const c = this.add.container(0, 0), arc = this.add.graphics();
        c.add([this.add.image(0, 0, 'ui-plate').setScale(0.8), arc, this.add.image(0, -4, 'ui', Life.ico(g[1])).setScale(0.46)]);
        return { c: c, arc: arc, need: g[0], col: g[2], v: -1 };
      });
      this.wishes = [];
      // the child's coins
      this.purse = this.add.container(0, 0); this.coinTxt = this.add.text(18, -6, String(R.s.coins), { fontFamily: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif', fontSize: '58px', fontStyle: '800', color: '#7a4a16' }).setOrigin(0, 0.5);
      this.purse.add([this.add.image(40, 0, 'ui-plate').setScale(1.5, 0.62), this.add.image(-42, -4, 'ui', Life.ico('coin')).setScale(0.5), this.coinTxt]);
      this.me = this.scene.get('Me') ? btn('pencil', () => this.open('Me'), 0.6) : null;
      const on = (n, f) => { ev.on('life-' + n, f, this); };
      on('coins', (total, d) => { this.coinTxt.setText(String(total)); this.tweens.add({ targets: this.purse, scale: this.purse.scale * 1.18, duration: 110, yoyo: true }); });
      on('poor', () => this.tweens.add({ targets: this.purse, x: this.purse.x + 10, duration: 50, yoyo: true, repeat: 3 }));
      on('skill', (name, lv) => { this.cheer(RU.SKILL_ICON[name] || 'star', !lv); if (lv) sfx('spark'); });
      on('adhan', v => { this.tweens.killTweensOf(this.moon); this.moon.setScale(1); if (v) this.tweens.add({ targets: this.moon, scale: 1.18, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
      on('follow', v => { this.find.setVisible(!v); });
      on('carry', () => this.carry()); on('hands', () => this.tweens.add({ targets: this.hand, scale: 1.25, duration: 120, yoyo: true, repeat: 1 }));
      on('wish', () => this.showWishes()); on('open', n => this.open(n));
      on('cheer', icon => this.cheer(icon)); on('sticker', (q, icon) => this.cheer(icon, true));
      on('unlock', id => this.unlock(id));
      this.events.once('shutdown', () => ['adhan', 'carry', 'hands', 'wish', 'open', 'cheer', 'sticker', 'unlock', 'coins', 'poor', 'skill', 'follow'].forEach(n => ev.off('life-' + n, undefined, this)));
      this.place(); this.carry(); this.showWishes();
      if (Q.has('perf')) {
        const el = document.createElement('div'); el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;font:600 12px/1.3 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 8px;border-radius:8px;pointer-events:none';
        document.body.appendChild(el);
        // (how many times a frame the renderer hands pictures to the graphics chip, and how long the game's own work takes)
        const gl = this.game.renderer.gl, st = window.LTP = { dc: 0, fr: 0, ms: 0, t: 0, up: 0, ups: 0 };
        ['drawArrays', 'drawElements'].forEach(n => { const f = gl[n]; gl[n] = function () { st.dc++; return f.apply(gl, arguments); }; });
        { const f = gl.texImage2D; gl.texImage2D = function () { const t = Date.now(), r = f.apply(gl, arguments), d = Date.now() - t; st.ups += d; if (d > st.up) st.up = d; return r; }; }      // (handing a new picture to the chip: the longest one is how long the game stops when something loads)
        this.game.events.on('prestep', () => { st.t = performance.now(); }); this.game.events.on('postrender', () => { st.ms += performance.now() - st.t; st.fr++; });
        this.time.addEvent({ delay: 500, loop: true, callback: () => { const c = Math.floor(w.clock), fr = st.fr || 1, cv = this.game.canvas; el.textContent = Math.round(this.game.loop.actualFps) + ' fps · ' + Math.round(st.dc / fr) + ' draws · ' + (st.ms / fr).toFixed(1) + ' ms · ' + cv.width + 'x' + cv.height + ' · load ' + st.up + '/' + st.ups + ' ms · ' + (P() ? Object.keys(P().Z).filter(k => P().Z[k].state === 'on').length + ' places · ' + Math.round(this.textures.getTextureKeys().reduce((n, k) => { const t = this.textures.get(k), im = t.getSourceImage(); return n + (im ? im.width * im.height : 0) * (t.dataSource && t.dataSource.length ? 1.25 : 1); }, 0) * 4 / 1e6) + ' MB · z' + P().cameras.main.zoom.toFixed(2) + ' · ' + P().pid : '') + ' · ' + Math.floor(c / 60) + ':' + ('0' + c % 60).slice(-2); st.dc = st.fr = st.ms = 0; } });
      }
    }
    open(name) { if (!this.scene.get(name) || this.scene.isActive(name)) return; sfx('pop'); this.scene.launch(name); }
    // the moon: join the prayer here, or be shown the way to it; when no prayer is called, a practice one at home
    pray() {
      const w = Life.world, you = w.you, P = Life.place; if (you.praying || !P || P.busy) return;
      if (w.calling) {
        if (w.prayers[you.place] && w.prayers[you.place].stage !== 'done') { P.joinPrayer(); return; }
        const pid = Object.keys(w.prayers).filter(k => w.prayers[k].stage !== 'done').sort((a, b) => (a === you.prayAt ? -1 : 0) - (b === you.prayAt ? -1 : 0))[0];
        if (pid) { P.guide(pid); w.stop(you); w.travel(you, pid, null, null, () => { if (Life.place.pid === pid) Life.place.joinPrayer(); }); }
      } else if (w.time - (this.lastCall || -999) > 120) { this.lastCall = w.time; w.callPrayer('practice'); }
    }
    carry() { const you = Life.world.you; this.hand.setVisible(!!you.carry); if (you.carry) this.hand.icon.setFrame(Life.ico(you.carry)); this.bike.setVisible(you.riding === 'bike'); }
    showWishes() {
      this.wishes.forEach(c => c.destroy());
      this.wishes = Life.rules.wishes.map((x, i) => {
        const c = this.add.container(0, 0); c.add([this.add.image(0, 0, 'ui-plate').setScale(0.7).setTint(0xfff3c4), this.add.image(0, -4, 'ui', Life.ico(x.icon)).setScale(0.44)]);
        c.setSize(110, 110).setInteractive(); c.on('pointerup', () => { sfx('tap'); const q = Life.world.by[x.who], P = Life.place; if (q && P && q.place) { P.bubble(q, x.icon, 2600); if (q.place !== P.pid) { P.hint = null; P.guide(q.place); } } });
        return c;
      });
      this.place();
    }
    // a small celebration in the middle of the screen: the picture of what was just done
    cheer(icon, small) {
      const v = this.view, x = (v.l + v.r) / 2, y = v.st + (small ? 230 : 170);
      const i = this.add.image(x, y + 40, 'ui', Life.ico(icon)).setScale(0).setDepth(50);
      this.tweens.add({ targets: i, scale: small ? 0.6 : 0.9, y: y, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: i, alpha: 0, y: y - 60, duration: 500, delay: 1100, onComplete: () => i.destroy() });
    }
    // something new for the home: a card that shows it
    unlock(id) {
      const v = this.view, x = (v.l + v.r) / 2, y = (v.t + v.b) / 2, c = this.add.container(x, y).setDepth(60).setScale(0), r = (Life.data.decor || {})[id] || {};
      const fn = r.kind ? r.kind + '@0' + (r.state != null ? '#' + r.state : '') : '', real = fn && this.textures.exists('t-decor') && this.textures.get('t-decor').has(fn);
      const pic = real ? this.add.image(0, -20, 't-decor', fn) : this.add.image(0, -20, 'ui', Life.ico('gift')).setScale(1.3); if (real) pic.setScale(Math.min(1.2, 230 / Math.max(pic.width, pic.height)));
      c.add([this.add.image(0, 0, 'ui-card'), pic, this.add.image(170, 110, 'ui', Life.ico('star')).setScale(0.5), this.add.image(-170, 110, 'ui', Life.ico('star')).setScale(0.5)]);
      sfx('spark'); this.tweens.add({ targets: c, scale: 1, duration: 320, ease: 'Back.easeOut' });
      this.time.delayedCall(2200, () => this.tweens.add({ targets: c, scale: 0, duration: 220, onComplete: () => c.destroy() }));
    }
    place() {
      const v = this.view; if (!v || !this.exit) return;
      // an upright phone is narrow: a design width of 1080 instead of 1920 keeps every button big enough for a child's finger
      const gw = this.scale.width, gh = this.scale.height;
      if (gw < gh * 0.92) {
        const z = gw / 1080, k = v.z / z, vw = gw / z, vh = gh / z, cam = this.cameras.main, e = { l: v.sl - v.l, r: v.r - v.sr, t: v.st - v.t, b: v.b - v.sb };
        cam.setZoom(z); cam.centerOn(960, 540);
        v.l = 960 - vw / 2; v.r = 960 + vw / 2; v.t = 540 - vh / 2; v.b = 540 + vh / 2; v.w = vw; v.h = vh; v.z = z;
        v.sl = v.l + e.l * k; v.sr = v.r - e.r * k; v.st = v.t + e.t * k; v.sb = v.b - e.b * k;
      }
      this.exit.setPosition(v.sl + 100, v.st + 100).setScale(0.9);
      this.moon.setPosition(v.sr - 100, v.sb - 104);
      this.hand.setPosition(v.sl + 100, v.sb - 104); this.bike.setPosition(v.sl + 270, v.sb - 104);
      this.mapB.setPosition(v.sr - 100, v.sb - 270).setScale(0.74); this.find.setPosition(v.sr - 100, v.sb - 402).setScale(0.74);
      this.gauges.forEach((g, i) => g.c.setPosition(v.sr - 90 - i * 136, v.st + 92));
      this.purse.setPosition(v.sl + 262, v.st + 96).setScale(0.82);
      if (this.me && this.panels.indexOf(this.me) < 0) this.panels.push(this.me);
      this.panels.forEach((c, i) => c.setPosition(v.sl + 100, v.st + 250 + i * 132).setScale(0.74));
      this.wishes.forEach((c, i) => c.setPosition(v.sr - 96, v.st + 250 + i * 128));
    }
    update() {
      const you = Life.world.you;
      this.gauges.forEach(g => {
        const v = Math.round(you.needs[g.need] * 50) / 50; if (v === g.v) return; g.v = v;
        g.arc.clear(); g.arc.lineStyle(12, 0xe7e0f2, 1); g.arc.beginPath(); g.arc.arc(0, -4, 56, 0, Math.PI * 2); g.arc.strokePath();
        g.arc.lineStyle(12, g.col, 1); g.arc.beginPath(); g.arc.arc(0, -4, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v); g.arc.strokePath();
      });
    }
  }

  Life.Boot = Boot;
  /* The art is AVIF (about half the bytes of WebP). A WebView too old to read it gets the WebP copies instead; one tiny
     picture decoded before anything loads tells us which. `?webp` forces the old files, for testing. */
  const start = ok => {
    EXT = window.LifeExt = ok ? '.avif' : '.webp';
    // (drawn for a phone: a canvas of at most 1.6 million pixels, no multisampling, four textures to a batch: see js/kit/play.js)
    let sharp = 0; try { sharp = +localStorage.getItem(SHARP) || 0; } catch (e) { /* private mode */ }
    const game = Kit.play.start({ scenes: [Boot, PlaceScene, Hud].concat(window.LifeScenes || []), color: '#8fc7d6', pixels: 1.6e6, sharp: sharp, msaa: false, textures: 4 });
    if (Q.has('debug')) window.LTG = game;
  };
  if (Q.has('webp')) start(false);
  else {
    const im = new Image(); let done = false; const end = ok => { if (!done) { done = true; start(ok); } };
    im.onload = () => end(im.width === 2); im.onerror = () => end(false); setTimeout(() => end(false), 1500);
    im.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAAGGbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAACxpbG9jAAAAAEQAAAIAAQAAAAEAAAG/AAAAIgACAAAAAQAAAa4AAAARAAAAQmlpbmYAAAAAAAIAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAABppbmZlAgAAAAACAABhdjAxQWxwaGEAAAAAGmlyZWYAAAAAAAAADmF1eGwAAgABAAEAAADDaXBycAAAAJ1pcGNvAAAAFGlzcGUAAAAAAAAAAgAAAAIAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBIAAAAAAAE2NvbHJuY2x4AAEAAgAGgAAAAA5waXhpAAAAAAEIAAAADGF2MUOBABwAAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAeaXBtYQAAAAAAAAACAAEEAQKDBAACBAEFhgcAAAA7bWRhdBIACgQYADYVMgcbAGmhABCgEgAKBzgANpAQIGkyFRxCYuTpppphYAAAkDWOMsJ4xHoy0A==';
  }
})();
