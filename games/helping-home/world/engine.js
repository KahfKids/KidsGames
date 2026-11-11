/* Helping Home world: the canvas engine (window.WE).
   Every drawing is still made by the Colorfigures code (iso/core.js) with the same hand-drawn filter, but only ONCE:
   it is rendered to a bitmap at the screen's sharpness, handed to PixiJS as a texture (js/kit/gfx.js), and afterwards
   shown by the graphics chip. PixiJS is the only renderer: there is no Canvas2D drawing path.
   One fixed camera.
   - WE.prepare(canvas)          -> Promise: starts PixiJS (call before WE.init; it rejects when PixiJS cannot start)
   - WE.bake(key, make)          a cached sprite, or null while it is being made. make() -> { svg, box:[x0,y0,x1,y1] }
   - WE.setPlace(place)          ground + props of one place; WE.ready() when all are baked
   - WE.frame(actors, fx)        draw one frame (ground, then props and people sorted back to front, then overlays:
                                 fx(WE.fx) lists the small pictures over the world, see WE.fx below)
   - WE.pick(px, py)             what is under a screen point: { actor } | { prop } | { ground:[x,y] }
   - WE.path(place, a, b)        A* over the place's 10-unit grid; WE.freeNear(place, x, y, taken)
   World axes: +x toward the viewer's right, +y toward the viewer's left, z up. Nearer = larger x + y. */
(function () {
  'use strict';
  const W = window.WE = {};
  let cv, SF = null, MAXT = 4096, DPR = 1, S = 1, vw = 0, vh = 0, FILT = '', tickN = 0;      // SF: the kit drawing surface
  setCam(45, 27); INK_K = 1;
  const A = P(1, 0, 0)[0], B = P(1, 0, 0)[1], ZK = -P(0, 0, 1)[1];
  const cam = W.cam = { x: 0, y: 0 };
  W.G = 10;
  const WK = W.WK = 1.5;      // the world is drawn 1.5x so furniture and rooms fit the people (who are drawn 1:1)
  W.proj = (x, y, z) => [(x - y)*A*WK, ((x + y)*B - (z || 0)*ZK)*WK];
  W.unproj = (sx, sy) => { const d = sx/A/WK, s = sy/B/WK; return [(s + d)/2, (s - d)/2]; };
  W.world = svg => { INK_K = 1/1.25; const s = inkScale(svg); INK_K = 1; return `<g transform="scale(${WK})">${s}</g>`; };
  W.toScreen = (x, y, z) => { const q = W.proj(x, y, z); return [(q[0] - cam.x)*S + vw/2, (q[1] - cam.y)*S + vh/2]; };
  W.fromScreen = (px, py) => W.unproj((px - vw/2)/S + cam.x, (py - vh/2)/S + cam.y);
  W.scale = () => S; W.size = () => [vw, vh];

  /* ---------- sprites ---------- */
  /* Each picture is made in small pieces (never more than about 450 x 450 pixels of filter work at a time), one piece per
     frame while you play, so making pictures never holds a frame up. The wobbly line is still the SVG filter; the paper
     grain and blots are the same noise, made ONCE as a repeating tile and laid over each picture (5 of the 7 noise passes
     of the old filter were the grain, redone for every picture). */
  const SPR = new Map(), Q = [], Q2 = [], RUN = [], FAILS = {}; let busy = 0, bytes = 0, NOISE = null, noiseK = 1, noiseGen = 0;
  const STR = 400, PADPX = 24;
  const cap = () => Math.min(150e6, 52e6*Math.max(1, Math.pow(S*DPR/2.2, 2)));
  W.calm = false;             // true while playing: one piece per frame. false while a place is loading: as fast as it goes
  W.stats = () => ({ sprites: SPR.size, mb: +(bytes/1e6).toFixed(1), queue: Q.length + Q2.length + RUN.length + busy, made: W.made, ms: W.bakeMs, gfx: W.gfx || '' });
  W.made = 0; W.bakeMs = 0;
  W.top = n => [...SPR.values()].filter(s => s.img).sort((a, b) => b.bytes - a.bytes).slice(0, n || 12).map(s => s.key.slice(0, 40) + ' ' + (s.bytes/1e6).toFixed(1) + (s.pin ? ' pin' : '') + ' age ' + (tickN - s.t));
  function free(s){ if (s.img){ bytes -= s.bytes; if (s.tex){ SF.free(s.tex); s.tex = null; } try { s.img.width = s.img.height = 0; } catch (e) {} s.img = null; } s.job = null; }
  function bake(key, make, pin, low){
    let s = SPR.get(key);
    if (s){ s.t = tickN; if (!low && s.q === 2){ const i = Q2.indexOf(s); if (i >= 0){ Q2.splice(i, 1); Q.push(s); } s.q = 1; } return s.img ? s : null; }
    if (low && bytes > cap()*.75) return null;
    s = { key, img: null, t: tickN, pin: !!pin, make, q: low ? 2 : 1 }; SPR.set(key, s); (low ? Q2 : Q).push(s); if (!W.calm) pump(); return null;
  }
  function load(src, ok, bad){
    const im = new Image(); let url = null, data = false;
    const asData = () => { data = true; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src); };
    im.onload = () => { if (url){ URL.revokeObjectURL(url); url = null; } ok(im); };
    im.onerror = () => { if (url){ URL.revokeObjectURL(url); url = null; } if (!data) asData(); else bad(); };
    try { url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' })); im.src = url; } catch (e) { asData(); }
  }
  const handF = (x, y, w, h) => NOISE
    ? `<filter id="hand" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.0450" numOctaves="2" seed="4" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.40" xChannelSelector="R" yChannelSelector="G"/></filter>`
    : FILT.replace('x="-3%" y="-3%" width="106%" height="106%"', `filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"`);
  // the grain and blot tile: black, with the darkening as its alpha, so "source-atop" gives exactly picture x grain x blot
  function makeNoise(){
    const gen = ++noiseGen, K = S*DPR, N = 256, px = Math.round(N*K); NOISE = null; W.noise = 'wait';
    const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${N} ${N}"><defs><filter id="n" filterUnits="userSpaceOnUse" x="0" y="0" width="${N}" height="${N}" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="11" stitchTiles="stitch" result="n1"/><feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84  .3 0 0 0 .84  .3 0 0 0 .84  0 0 0 0 1" result="grain"/>` +
      `<feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" stitchTiles="stitch" result="n2"/><feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85  .3 0 0 0 .85  .3 0 0 0 .85  0 0 0 0 1" result="blot"/>` +
      `<feBlend in="grain" in2="blot" mode="multiply" result="m"/><feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 0 0 0 1"/></filter></defs><rect width="${N}" height="${N}" filter="url(#n)"/></svg>`;
    const done = c => { if (gen !== noiseGen) return; NOISE = c; noiseK = K; W.noise = c ? 'tile' : 'filter'; pump(); };
    load(src, im => { let c = null; try { c = document.createElement('canvas'); c.width = c.height = px; c.getContext('2d').drawImage(im, 0, 0, px, px); } catch (e) { c = null; } done(c); }, () => done(null));
  }
  function fail(s){
    if (SPR.get(s.key) !== s) return; free(s); SPR.delete(s.key); FAILS[s.key] = (FAILS[s.key] || 0) + 1; console.warn('bake failed', s.key);
    for (let i = RUN.length - 1; i >= 0; i--) if (RUN[i][0] === s) RUN.splice(i, 1);
    trim(cap()*.5, true);
  }
  function start(s){
    let m; try { m = s.make(); } catch (e) { console.warn('bake', s.key, e); SPR.delete(s.key); return; }
    if (!m || !m.svg || (FAILS[s.key] || 0) > 2){ SPR.delete(s.key); if (m && m.svg) SPR.set(s.key, { key: s.key, img: null, dead: true, t: tickN, pin: true }); return; }
    let x0, y0, w, h, K, pw, ph, pad = PADPX;
    if (m.px){ x0 = m.box[0]; y0 = m.box[1]; w = m.box[2] - x0; h = m.box[3] - y0; pw = ph = m.px; K = pw/w; }   // a ground tile: exact pixels, its own margin
    else { x0 = Math.floor(m.box[0]); y0 = Math.floor(m.box[1]); w = Math.ceil(m.box[2]) - x0; h = Math.ceil(m.box[3]) - y0;
      K = S*DPR; if (w*K > MAXT) K = MAXT/w; if (h*K > MAXT) K = MAXT/h; if (w*K*h*K > 8e6) K = Math.sqrt(8e6/(w*h)); pw = Math.max(1, Math.ceil(w*K - .01)); ph = Math.max(1, Math.ceil(h*K - .01)); }
    let c, cx; try { c = document.createElement('canvas'); c.width = pw; c.height = ph; cx = c.getContext('2d'); } catch (e) { cx = null; }
    if (!cx){ fail(s); return; }
    const j = s.job = { c, cx, svg: m.svg, x0, y0, K, pw, ph, pad, n: 0, of: 0, nx: m.nx || 0, ny: m.ny || 0 };
    const st = W.calm ? STR : 1600;      // small pieces while playing (no frame waits long); big ones while a place loads (fewer, faster)
    for (let py = 0; py < ph; py += st) for (let px = 0; px < pw; px += st){ RUN.push([s, j, px, py, Math.min(st, pw - px), Math.min(st, ph - py)]); j.of++; }
  }
  function piece(r){
    const s = r[0], j = r[1], px = r[2], py = r[3], cw = r[4], ch = r[5], p = j.pad, K = j.K;
    const ux = j.x0 + (px - p)/K, uy = j.y0 + (py - p)/K, uw = (cw + 2*p)/K, uh = (ch + 2*p)/K;
    const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw + 2*p}" height="${ch + 2*p}" viewBox="${ux} ${uy} ${uw} ${uh}"><defs>${handF(ux, uy, uw, uh)}</defs><g filter="url(#hand)">${j.svg}</g></svg>`;
    busy++;
    const end = () => { busy--; if (!W.calm) pump(); };
    load(src, im => {
      const t0 = performance.now();
      try {
        if (SPR.get(s.key) === s && s.job === j){
          const cx = j.cx; cx.drawImage(im, p, p, cw, ch, px, py, cw, ch);
          if (NOISE){ const k = K/noiseK, np = NOISE.width*k, ox = ((j.nx % np) + np) % np, oy = ((j.ny % np) + np) % np;
            cx.save(); cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = j.pat || (j.pat = cx.createPattern(NOISE, 'repeat'));
            cx.beginPath(); cx.rect(px, py, cw, ch); cx.clip(); cx.translate(-ox, -oy); cx.scale(k, k); cx.fillRect((px + ox)/k - 1, (py + oy)/k - 1, cw/k + 2, ch/k + 2); cx.restore(); }
          if (++j.n === j.of){ s.img = j.c; s.x = j.x0; s.y = j.y0; s.w = j.pw/K; s.h = j.ph/K; s.bytes = j.pw*j.ph*4; bytes += s.bytes; s.job = null; s.make = null;
            s.tex = SF.texture(j.c);      // on WebGL the picture now lives on the graphics chip and the canvas memory is handed back
            W.dirty = true; trim(); }
        }
      } catch (e) { fail(s); }
      W.made++; W.bakeMs = Math.max(W.bakeMs*.9, performance.now() - t0);
      end();
    }, () => { fail(s); end(); });
  }
  function pump(one){
    if (W.noise === 'wait') return;
    const lim = W.calm ? 1 : 3; let n = 0;
    while (busy < lim && !(one && n)){
      if (!RUN.length){ const s = Q.shift() || Q2.shift(); if (!s) break; if (SPR.get(s.key) !== s) continue; s.q = 0; start(s); continue; }
      const r = RUN.shift(); if (r[0].job !== r[1]) continue; piece(r); n++;
    }
  }
  W.tick = () => pump(W.calm);
  // keep memory down: pictures not used for a while go first (people's poses last, they are small and come back often);
  // the ground and things of a place you left go at once. The canvas memory is handed back straight away (iPhone keeps it otherwise).
  function trim(limit, hard){
    limit = limit || cap(); if (bytes < limit) return;
    const over = bytes > limit*1.4 || hard;
    const old = [...SPR.values()].filter(s => s.img && !s.pin && s.t < tickN - 30 && (over || s.key[0] !== 'f' || s.t < tickN - 1800)).sort((a, b) => a.t - b.t);
    for (const s of old){ if (bytes < limit*.8) break; free(s); SPR.delete(s.key); }
  }
  W.bake = bake; W.keep = s => { s.t = tickN; return s; };
  W.drop = pre => { for (const [k, s] of SPR) if (k.startsWith(pre)){ free(s); SPR.delete(k); } };
  W.busy = () => Q.length + RUN.length + busy;
  // the screen box of a 3D box, padded
  W.box2 = (b, pad = 8) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]){ const q = P(x, y, z);
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
  W.box2w = (b, pad) => W.box2(b, 0).map((v, i) => v*WK + (i < 2 ? -1 : 1)*(pad == null ? 8 : pad));
  // a person: body, pose, frame, facing (snapped to 45 degrees), look version (clothes), options
  W.fig = (body, pose, frame, face, ver, opts) => {
    const d = ((Math.round(face/45)*45) % 360 + 360) % 360, ok = opts ? JSON.stringify(opts) : '';
    const mk = (fr, low) => bake('f|' + body + '|' + (ver || 0) + '|' + pose + '|' + fr + '|' + d + '|' + ok, () => {
      const it = FAMILY.draw(body, pose, [0, 0, 0], d, fr, opts)[0], b = W.box2(it.box, 16);
      if (pose === 'talk') b[1] -= 70, b[2] += 40;
      return { svg: inkScale(it.svg), box: b }; }, false, low);
    // the other steps of this walk (or wave, or sweep) are made ahead, quietly, so the first steps never wait
    const n = pose === 'walk' ? 6 : pose === 'crawl' ? 4 : (FAMILY.FRAMES && FAMILY.FRAMES[pose]) || 1, r = mk(frame);
    if (n > 1 && W.calm) for (let i = 1; i < n; i++) mk((frame + i) % n, true);
    return r;
  };
  // any drawing as an <img> source (HUD pictures): same ink, not cached on the canvas
  W.svgUrl = (svg, box, px) => { const w = box[2] - box[0], h = box[3] - box[1];
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${Math.round(px*h/w)}" viewBox="${box[0]} ${box[1]} ${w} ${h}"><defs>${FILT}</defs><g filter="url(#hand)"><rect x="${box[0]}" y="${box[1]}" width="${w}" height="${h}" fill="none"/>${svg}</g></svg>`); };
  W.figUrl = (body, pose, face, px) => { const it = FAMILY.draw(body, pose || 'stand', [0, 0, 0], face == null ? 45 : face, 0)[0]; return W.svgUrl(inkScale(it.svg), W.box2(it.box, 10), px || 96); };

  /* ---------- the place on screen ---------- */
  let place = null, order = [];
  W.setPlace = p => {
    place = p; W.dirty = true;
    for (const s of SPR.values()){ const k = s.key, other = (k[0] === 'g' || k[0] === 'p') && k[1] === '|' && !k.startsWith('g|' + p.id + '|') && !k.startsWith('p|' + p.id + '|'); if (other){ free(s); SPR.delete(k); } }
    ground(true);
    W.sortProps();
    trim(cap()*.45);
  };
  // the ground: one picture for a room; a big place (the town) is cut into tiles, made at full sharpness as they come into view
  const TPX = 360;
  function ground(pin){
    const p = place, b = p.gbox, K = S*DPR, gk = 'g|' + p.id + '|' + (p.ver || 0);
    if ((b[2] - b[0])*K <= MAXT && (b[3] - b[1])*K <= MAXT && (b[2] - b[0])*(b[3] - b[1])*K*K <= 8e6){ const g = bake(gk, () => ({ svg: W.world(p.ground()), box: p.gbox }), pin); return g ? [g] : null; }
    if (p._gk !== gk){ p._gk = gk; p._gsvg = W.world(p.ground()); }
    const T = TPX/K, gx = Math.floor(b[0]), gy = Math.floor(b[1]), l = cam.x - vw/2/S - 24, t = cam.y - vh/2/S - 24, out = []; let all = true;
    const nI = Math.ceil((b[2] - gx)/T) - 1, nJ = Math.ceil((b[3] - gy)/T) - 1, e = W.calm ? T*.4 : 0;      // while playing, the tiles just past the edge are made ahead
    const i0 = Math.max(0, Math.floor((l - gx)/T)), i1 = Math.min(nI, Math.floor((l + vw/S + 48 - gx)/T)), j0 = Math.max(0, Math.floor((t - gy)/T)), j1 = Math.min(nJ, Math.floor((t + vh/S + 48 - gy)/T));
    const tl = p._tl && p._tlk === gk + K ? p._tl : (p._tlk = gk + K, p._tl = new Map());
    for (let j = Math.max(0, Math.floor((t - e - gy)/T)); j <= Math.min(nJ, Math.floor((t + e + vh/S + 48 - gy)/T)); j++)
      for (let i = Math.max(0, Math.floor((l - e - gx)/T)); i <= Math.min(nI, Math.floor((l + e + vw/S + 48 - gx)/T)); i++){
        const inView = i >= i0 && i <= i1 && j >= j0 && j <= j1, id = j*4096 + i; let s = tl.get(id);
        if (s && s.img) s.t = tickN;
        else { s = bake(gk + '|' + i + '|' + j, () => ({ svg: p._gsvg, box: [gx + i*T, gy + j*T, gx + (i + 1)*T, gy + (j + 1)*T], px: TPX, nx: i*TPX, ny: j*TPX }), false, !inView);
          if (s){ s.ti = i; s.tj = j; s.gx = gx; s.gy = gy; tl.set(id, s); } else tl.delete(id); }
        if (!inView) continue;
        if (s) out.push(s); else all = false; }
    out.tiles = true; out.all = all; return out;
  }
  W.sortProps = () => { order = place.props.slice().sort((a, b) => a.sk - b.sk); W.dirty = true; };
  // one picture per kind of thing (type + its options), shared by every copy in the place and drawn where each one stands
  const pkey = o => { if (o._kf !== o.key){ o._kf = o.key; o._sk = 'p|' + place.id + '|' + (o.draw0 ? o.type + '|' + (o.x1 - o.x0) + '|' + JSON.stringify(o.o) : o.key); const q = o.draw0 ? W.proj(o.x0, o.y0, 0) : [0, 0]; o._px = q[0]; o._py = q[1]; } return o._sk; };
  const propSprite = (o, low) => { const c = o._s; if (c && c.img && c.key === pkey(o)){ c.t = tickN; return c; } return o._s = propMake(o, low); };
  const propMake = (o, low) => bake(pkey(o), () => { const r = o.draw0 ? o.draw0() : o.draw(); return { svg: W.world(r.svg), box: W.box2w(r.box, 10) }; }, false, low);
  // only things on (or near) the screen are made and kept
  const vis = (o, m) => { const b = o._sb || (o._sb = W.box2w([[o.x0 - 34, o.y0 - 34, 0], [o.x1 + 34, o.y1 + 34, o.h + 40]], 0)), hw = vw/2/S + (m || 70), hh = vh/2/S + (m || 70); return b[2] > cam.x - hw && b[0] < cam.x + hw && b[3] > cam.y - hh && b[1] < cam.y + hh; };
  const done = s => !!s && !!(s.img || s.dead);
  W.ready = () => { if (!place || W.noise === 'wait') return false; const g = ground(true); return !!g && (!g.tiles || g.all) && place.props.every(o => !vis(o) || !!propSprite(o) || done(SPR.get(pkey(o)))); };
  const inFront = (a, o) => a.x >= o.x1 - .5 || a.y >= o.y1 - .5;
  const near = (a, o) => a.x > o.x0 - 90 && a.x < o.x1 + 90 && a.y > o.y0 - 90 && a.y < o.y1 + 90;

  function blit(s, ox, oy){
    if (!s.img) return;
    const k = S*DPR, x = Math.round(((s.x - cam.x)*S + vw/2 + ox)*DPR), y = Math.round(((s.y - cam.y)*S + vh/2 + oy)*DPR);
    SF.draw(s.tex, x, y, Math.round(s.w*k), Math.round(s.h*k));
  }
  /* ---------- small pictures over the world (speech bubbles, hearts, arrows, rain) ---------- */
  /* Each shape is painted once with Canvas2D at the screen's sharpness, then shown like every other picture, so the
     whole frame is one list of sprites. Sizes and places are CSS pixels. */
  const STAMPS = new Map();
  const FX = W.fx = {
    // a picture w x h painted once: draw(ctx), with 0,0 at its centre. k: pixels per CSS pixel (the screen's, unless a
    // big soft picture can do with less)
    stamp(key, w, h, draw, k){ let t = STAMPS.get(key);
      if (!t){ k = k || DPR; t = SF.paint(Math.ceil(w*k), Math.ceil(h*k), c => { c.scale(k, k); c.translate(w/2, h/2); draw(c); }); t.cw = w; t.ch = h; t.k = k; STAMPS.set(key, t); }
      return t; },
    // show a stamp centred on x, y; m = [a, b, c, d] turns or skews it
    put(t, x, y, alpha, m){ const f = DPR/t.k;
      if (m) SF.drawM(t, m[0]*f, m[1]*f, m[2]*f, m[3]*f, DPR*(x - (m[0]*t.cw + m[2]*t.ch)/2), DPR*(y - (m[1]*t.cw + m[3]*t.ch)/2), alpha);
      else if (f === 1) SF.draw(t, Math.round((x - t.cw/2)*DPR), Math.round((y - t.ch/2)*DPR), t.w, t.h, alpha);
      else SF.draw(t, Math.round((x - t.cw/2)*DPR), Math.round((y - t.ch/2)*DPR), Math.round(t.cw*DPR), Math.round(t.ch*DPR), alpha); },
    // a loaded <img>, or a baked sprite (from WE.bake), with its top left corner at x, y
    img(src, x, y, w, h, alpha){ const t = !src ? null : src.tex ? src.tex : src.key ? null : SF.image(src, Math.ceil(w*DPR));
      if (t) SF.draw(t, Math.round(x*DPR), Math.round(y*DPR), Math.round(w*DPR), Math.round(h*DPR), alpha); },
    rect(x, y, w, h, color, alpha){ SF.rect(Math.round(x*DPR), Math.round(y*DPR), Math.round(w*DPR), Math.round(h*DPR), color, alpha); }
  };
  const slotsA = [], firstA = [];
  const drawn = [];           // what was drawn this frame, for picking: { x0, y0, x1, y1, actor | prop }
  W.frame = (actors, fx) => {
    tickN++; if (!place) return;
    SF.begin(place.sky || '#f2efe7');
    const g = ground(true);
    if (g && g.tiles){ if (!g.all) W.dirty = true; for (const s of g){ if (!s.img) continue; const bx = Math.round(((s.gx - cam.x)*S + vw/2)*DPR), by = Math.round(((s.gy - cam.y)*S + vh/2)*DPR);
      SF.draw(s.tex, bx + s.ti*TPX, by + s.tj*TPX, s.tex.w, s.tex.h); } }
    else if (g) blit(g[0], 0, 0);
    // people go after the nearest prop they stand in front of (exact box rule), else by depth
    while (slotsA.length < order.length) slotsA.push([]); const slots = slotsA, first = firstA; first.length = 0; for (let i = 0; i < order.length; i++) slots[i].length = 0;
    for (const a of actors){
      let idx = -1, k = a.x + a.y;
      for (let i = 0; i < order.length; i++){ const o = order[i];
        if (o === a.on){ idx = i; continue; }
        if (near(a, o)){ if (inFront(a, o)) idx = i; } else if (o.sk < k && idx < i && !o.flat) idx = i; }
      a._i = idx;
    }
    // two vehicles passing in neighbouring lanes are drawn in the same step, so the lane order below decides
    for (let i = 0; i < actors.length; i++){ const p = actors[i], a = p.veh; if (!a || !a.k) continue;
      for (let j = i + 1; j < actors.length; j++){ const q = actors[j], b = q.veh; if (!b || !b.k || a.dir % 180 !== b.dir % 180) continue;
        const ax = a.dir % 180 === 0, al = Math.abs(ax ? p.x - q.x : p.y - q.y), pe = Math.abs(ax ? p.y - q.y : p.x - q.x);
        if (pe < 40 && al < (a.k.L + b.k.L)/2 + 10) p._i = q._i = Math.min(p._i, q._i); } }
    for (const a of actors) (a._i < 0 ? first : slots[a._i]).push(a);
    drawn.length = 0;
    // two vehicles side by side in their lanes: the one in the nearer lane is drawn last
    const cmp = (p, q) => { const a = p.veh, b = q.veh; if (a && b && a.k && b.k && a.dir % 180 === b.dir % 180){ const d = a.dir % 180 === 0 ? p.y - q.y : p.x - q.x; if (Math.abs(d) > 4) return d; } return (p.x + p.y) - (q.x + q.y); };
    const put = list => { list.sort(cmp);
      for (const a of list){ const s = a.sprite; if (!s) continue; const q = W.proj(a.x, a.y, a.z || 0);
        const ox = q[0]*S, oy = q[1]*S; blit(s, ox, oy);
        drawn.push({ x0: (s.x + q[0] - cam.x)*S + vw/2, y0: (s.y + q[1] - cam.y)*S + vh/2, w: s.w*S, h: s.h*S, actor: a });
        if (a.carry){ const c = a.carry; blit(c, (q[0] + (a.cx || 0))*S, (q[1] - (a.cz || 34)*ZK)*S); } } };
    put(first);
    for (let i = 0; i < order.length; i++){ const o = order[i], s = vis(o) ? propSprite(o) : null;
      if (!s && W.calm && (tickN + i) % 20 === 0 && vis(o, 190)) propSprite(o, true);
      if (s){ blit(s, o._px*S, o._py*S); if (o.hit) drawn.push({ x0: (s.x + o._px - cam.x)*S + vw/2, y0: (s.y + o._py - cam.y)*S + vh/2, w: s.w*S, h: s.h*S, prop: o }); }
      put(slots[i]); }
    if (fx) fx(FX);
    if (place.tint) SF.multiply(place.tint);
    SF.end();
  };
  W.pick = (px, py) => {
    for (let i = drawn.length - 1; i >= 0; i--){ const d = drawn[i]; if (!d.actor || d.actor.me || d.actor.veh) continue;
      if (px > d.x0 + d.w*.2 && px < d.x0 + d.w*.8 && py > d.y0 + d.h*.1 && py < d.y0 + d.h) return { actor: d.actor }; }
    for (let i = drawn.length - 1; i >= 0; i--){ const d = drawn[i]; if (!d.prop) continue;
      if (px > d.x0 + d.w*.12 && px < d.x0 + d.w*.88 && py > d.y0 + d.h*.1 && py < d.y0 + d.h*.95) return { prop: d.prop }; }
    return { ground: W.fromScreen(px, py) };
  };
  W.follow = (x, y, snap) => {
    const q = W.proj(x, y, 30), b = place.gbox, hw = vw/2/S, hh = vh/2/S;
    const cl = (v, a, c) => a > c ? (a + c)/2 : Math.max(a, Math.min(c, v));
    const tx = cl(q[0], b[0] + hw, b[2] - hw), ty = cl(q[1], b[1] + hh, b[3] - hh), k = snap ? 1 : .12;
    const nx = cam.x + (tx - cam.x)*k, ny = cam.y + (ty - cam.y)*k;
    if (Math.abs(nx - cam.x) + Math.abs(ny - cam.y) > .02){ cam.x = nx; cam.y = ny; W.dirty = true; }
  };

  /* ---------- the grid: who can walk where ---------- */
  W.makeGrid = p => {
    const G = W.G, [x0, y0, x1, y1] = p.bounds, cols = Math.ceil((x1 - x0)/G), rows = Math.ceil((y1 - y0)/G), g = new Uint8Array(cols*rows);
    const block = (a, b, c, d, v) => { for (let i = Math.max(0, Math.floor((a - x0 + .01)/G)); i <= Math.min(cols - 1, Math.floor((c - x0 - .01)/G)); i++)
      for (let j = Math.max(0, Math.floor((b - y0 + .01)/G)); j <= Math.min(rows - 1, Math.floor((d - y0 - .01)/G)); j++) g[j*cols + i] = v; };
    for (const w of p.blocks || []) block(w[0], w[1], w[2], w[3], 1);
    for (const o of p.props) if (o.solid) block(o.x0, o.y0, o.x1, o.y1, 1);
    p.grid = { g, cols, rows, x0, y0 }; p.block = block; return p.grid;
  };
  const cellOf = (p, x, y) => { const gr = p.grid; return [Math.max(0, Math.min(gr.cols - 1, Math.floor((x - gr.x0)/W.G))), Math.max(0, Math.min(gr.rows - 1, Math.floor((y - gr.y0)/W.G)))]; };
  const mid = (p, i, j) => [p.grid.x0 + (i + .5)*W.G, p.grid.y0 + (j + .5)*W.G];
  W.cellId = (p, x, y) => { const c = cellOf(p, x, y); return c[1]*p.grid.cols + c[0]; };
  W.walkable = (p, x, y) => { const gr = p.grid; if (x < gr.x0 || y < gr.y0 || x >= gr.x0 + gr.cols*W.G || y >= gr.y0 + gr.rows*W.G) return false; return !gr.g[W.cellId(p, x, y)]; };
  // the nearest free cell centre to a point (spiral), skipping cells in `taken` (a Set of cell ids)
  W.freeNear = (p, x, y, taken, minR) => {
    const gr = p.grid, [ci, cj] = cellOf(p, x, y);
    for (let r = minR || 0; r < 14; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++){
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= gr.cols || j >= gr.rows) continue; const id = j*gr.cols + i;
      if (!gr.g[id] && !(taken && taken.has(id))) return mid(p, i, j); }
    return null;
  };
  let PB = null;
  W.path = (p, a, b) => {
    const gr = p.grid, cols = gr.cols, rows = gr.rows, g = gr.g, s = cellOf(p, a[0], a[1]), e = cellOf(p, b[0], b[1]);
    const si = s[1]*cols + s[0], ei = e[1]*cols + e[0];
    if (si === ei) return [b.slice()];
    // getting up from a seat or a bed in the middle of a thing: step off to the nearest free cell first
    if (g[si]){ const n = W.freeNear(p, a[0], a[1], null, 1); if (!n) return null; if (W.cellId(p, n[0], n[1]) === ei) return [b.slice()]; const pa = W.path(p, n, b); return pa ? [n].concat(pa) : null; }
    // a seat or a bed in the middle of a thing: walk to the nearest free cell beside it, then step on
    if (g[ei]){ const n = W.freeNear(p, b[0], b[1], null, 1); if (!n) return null; if (W.cellId(p, n[0], n[1]) === si) return [b.slice()]; const pa = W.path(p, a, n); return pa ? pa.concat([b.slice()]) : null; }
    const N = cols*rows; if (!PB || PB.n < N) PB = { n: N, cost: new Float32Array(N), from: new Int32Array(N), fsc: new Float32Array(N) };
    const cost = PB.cost, from = PB.from, fsc = PB.fsc, open = [si]; cost.fill(1e9, 0, N); from.fill(-1, 0, N); cost[si] = 0;
    const hf = i => { const dx = Math.abs(i % cols - e[0]), dy = Math.abs((i/cols | 0) - e[1]); return Math.max(dx, dy) + .41*Math.min(dx, dy); };
    fsc[si] = hf(si); let found = false, guard = 0;
    while (open.length && guard++ < 6000){
      let bi = 0; for (let k = 1; k < open.length; k++) if (fsc[open[k]] < fsc[open[bi]]) bi = k;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === ei){ found = true; break; }
      const cx = cur % cols, cy = cur/cols | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){ if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; const ni = ny*cols + nx;
        if (g[ni] && ni !== ei && ni !== si) continue;
        if (dx && dy && (g[cy*cols + nx] || g[ny*cols + cx])) continue;
        const c = cost[cur] + (dx && dy ? 1.41 : 1)*(1 + (p.cost ? p.cost[ni] : 0));
        if (c < cost[ni]){ if (cost[ni] === 1e9) open.push(ni); cost[ni] = c; from[ni] = cur; fsc[ni] = c + hf(ni); } }
    }
    if (!found) return null;
    const out = [b.slice()]; let c = from[ei];
    while (c >= 0 && c !== si){ out.push(mid(p, c % cols, c/cols | 0)); c = from[c]; }
    out.reverse();
    // drop the middle of straight runs
    const sm = []; for (let i = 0; i < out.length; i++){ const p0 = sm[sm.length - 1] || a, q = out[i], n = out[i + 1];
      if (n && Math.abs((q[0] - p0[0])*(n[1] - q[1]) - (q[1] - p0[1])*(n[0] - q[0])) < .01) continue; sm.push(q); }
    return sm;
  };

  /* ---------- canvas ---------- */
  // PixiJS is started first (it has to arrive); WE.init needs it
  W.prepare = canvas => Kit.gfx.create(canvas).then(s => { SF = s; });
  W.init = () => {
    cv = SF.canvas; MAXT = SF.maxTex; W.gfx = SF.note;
    // every picture is made again: the size of the screen changed, or the graphics chip dropped its textures
    const wipe = () => { for (const [k, sp] of SPR){ free(sp); SPR.delete(k); } Q.length = Q2.length = RUN.length = 0;
      for (const t of STAMPS.values()) SF.free(t); STAMPS.clear(); makeNoise(); if (place) W.setPlace(place); };
    const fit = () => { const d0 = DPR; DPR = Kit.gfx.dpr(); if (d0 !== DPR) S = 0; vw = cv.clientWidth || innerWidth; vh = cv.clientHeight || innerHeight;
      SF.resize(Math.round(vw*DPR), Math.round(vh*DPR));
      const s = Math.max(.9, Math.min(1.5, Math.min(vw/340, vh/460)));
      if (Math.abs(s - S) > .02){ S = s; wipe(); }
      W.dirty = true; };
    SF.onLost(() => { wipe(); W.dirty = true; });
    S = 0; FILT = filterFor(1); fit(); addEventListener('resize', fit);
  };
})();
