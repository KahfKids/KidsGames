/* Helping Home world: the canvas engine (window.WE).
   Every drawing is still made by the Colorfigures code (iso/core.js) with the same hand-drawn filter, but only ONCE:
   it is rendered to a bitmap at full device sharpness and afterwards shown with a plain image copy. One fixed camera.
   - WE.bake(key, make)          a cached sprite, or null while it is being made. make() -> { svg, box:[x0,y0,x1,y1] }
   - WE.setPlace(place)          ground + props of one place; WE.ready() when all are baked
   - WE.frame(actors, fx)        draw one frame (ground, then props and people sorted back to front, then overlays)
   - WE.pick(px, py)             what is under a screen point: { actor } | { prop } | { ground:[x,y] }
   - WE.path(place, a, b)        A* over the place's 10-unit grid; WE.freeNear(place, x, y, taken)
   World axes: +x toward the viewer's right, +y toward the viewer's left, z up. Nearer = larger x + y. */
(function () {
  'use strict';
  const W = window.WE = {};
  let cv, ctx, DPR = 1, S = 1, vw = 0, vh = 0, FILT = '', tickN = 0;
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
  const SPR = new Map(), Q = []; let busy = 0, bytes = 0; const CAP = 48e6;
  W.stats = () => ({ sprites: SPR.size, mb: +(bytes/1e6).toFixed(1), queue: Q.length + busy });
  function bake(key, make, pin){
    let s = SPR.get(key);
    if (s){ s.t = tickN; return s.img ? s : null; }
    s = { key, img: null, t: tickN, pin: !!pin }; SPR.set(key, s); Q.push([s, make]); pump(); return null;
  }
  function pump(){
    while (busy < 3 && Q.length){
      const [s, make] = Q.shift(); let m;
      try { m = make(); } catch (e) { console.warn('bake', s.key, e); SPR.delete(s.key); continue; }
      if (!m || !m.svg){ SPR.delete(s.key); continue; }
      busy++;
      let x0 = Math.floor(m.box[0]), y0 = Math.floor(m.box[1]), w = Math.ceil(m.box[2]) - x0, h = Math.ceil(m.box[3]) - y0;
      let K = S*DPR; if (w*K > 4096) K = 4096/w; if (w*K*h*K > 8e6) K = Math.sqrt(8e6/(w*h));
      let pw = Math.max(1, Math.round(w*K)), ph = Math.max(1, Math.round(h*K)), filt = FILT;
      // a ground tile: exact pixels, and the hand filter worked out for this tile only
      if (m.px){ x0 = m.box[0]; y0 = m.box[1]; w = m.box[2] - x0; h = m.box[3] - y0; pw = ph = m.px;
        filt = FILT.replace('x="-3%" y="-3%" width="106%" height="106%"', `filterUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${w}" height="${h}"`); }
      const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x0} ${y0} ${w} ${h}"><defs>${filt}</defs>` +
        `<g filter="url(#hand)"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none"/>${m.svg}</g></svg>`;
      const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').drawImage(im, 0, 0, pw, ph);
        s.img = c; s.x = x0; s.y = y0; s.w = w; s.h = h; s.bytes = pw*ph*4; bytes += s.bytes; busy--; W.dirty = true; trim(); pump(); };
      im.onerror = () => { busy--; SPR.delete(s.key); pump(); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    }
  }
  // keep memory down: pictures not used for a while go first; the ground and things of a place you left go at once
  function trim(limit){
    limit = limit || CAP; if (bytes < limit) return;
    const old = [...SPR.values()].filter(s => s.img && !s.pin && s.t < tickN - 30).sort((a, b) => a.t - b.t);
    for (const s of old){ if (bytes < limit*.8) break; bytes -= s.bytes; SPR.delete(s.key); }
  }
  W.bake = bake;
  W.drop = pre => { for (const [k, s] of SPR) if (k.startsWith(pre)){ if (s.img) bytes -= s.bytes; SPR.delete(k); } };
  W.busy = () => Q.length + busy;
  // the screen box of a 3D box, padded
  W.box2 = (b, pad = 8) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]){ const q = P(x, y, z);
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
  W.box2w = (b, pad) => W.box2(b, 0).map((v, i) => v*WK + (i < 2 ? -1 : 1)*(pad == null ? 8 : pad));
  // a person: body, pose, frame, facing (snapped to 45 degrees), look version (clothes), options
  W.fig = (body, pose, frame, face, ver, opts) => {
    const d = ((Math.round(face/45)*45) % 360 + 360) % 360, ok = opts ? JSON.stringify(opts) : '';
    return bake('f|' + body + '|' + (ver || 0) + '|' + pose + '|' + frame + '|' + d + '|' + ok, () => {
      const it = FAMILY.draw(body, pose, [0, 0, 0], d, frame, opts)[0], b = W.box2(it.box, 16);
      if (pose === 'talk') b[1] -= 70, b[2] += 40;
      return { svg: inkScale(it.svg), box: b }; });
  };
  // any drawing as an <img> source (HUD pictures): same ink, not cached on the canvas
  W.svgUrl = (svg, box, px) => { const w = box[2] - box[0], h = box[3] - box[1];
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${Math.round(px*h/w)}" viewBox="${box[0]} ${box[1]} ${w} ${h}"><defs>${FILT}</defs><g filter="url(#hand)"><rect x="${box[0]}" y="${box[1]}" width="${w}" height="${h}" fill="none"/>${svg}</g></svg>`); };
  W.figUrl = (body, pose, face, px) => { const it = FAMILY.draw(body, pose || 'stand', [0, 0, 0], face == null ? 45 : face, 0)[0]; return W.svgUrl(inkScale(it.svg), W.box2(it.box, 10), px || 96); };

  /* ---------- the place on screen ---------- */
  let place = null, order = [];
  W.setPlace = p => {
    place = p; W.dirty = true;
    for (const s of SPR.values()){ const k = s.key, other = (k[0] === 'g' || k[0] === 'p') && k[1] === '|' && !k.startsWith('g|' + p.id + '|') && !k.startsWith('p|' + p.id + '|'); if (other){ s.pin = false; s.t = -1e9; } }
    ground(true);
    W.sortProps();
    trim(CAP*.45);
  };
  // the ground: one picture for a room; a big place (the town) is cut into tiles, made at full sharpness as they come into view
  const TPX = 360, TPAD = 24;
  function ground(pin){
    const p = place, b = p.gbox, K = S*DPR, gk = 'g|' + p.id + '|' + (p.ver || 0);
    if ((b[2] - b[0])*K <= 4096 && (b[2] - b[0])*(b[3] - b[1])*K*K <= 8e6){ const g = bake(gk, () => ({ svg: W.world(p.ground()), box: p.gbox }), pin); return g ? [g] : null; }
    if (p._gk !== gk){ p._gk = gk; p._gsvg = W.world(p.ground()); }
    const T = TPX/K, pad = TPAD/K, gx = Math.floor(b[0]), gy = Math.floor(b[1]), l = cam.x - vw/2/S - 24, t = cam.y - vh/2/S - 24, out = []; let all = true;
    for (let j = Math.max(0, Math.floor((t - gy)/T)); j <= Math.min(Math.ceil((b[3] - gy)/T) - 1, Math.floor((t + vh/S + 48 - gy)/T)); j++)
      for (let i = Math.max(0, Math.floor((l - gx)/T)); i <= Math.min(Math.ceil((b[2] - gx)/T) - 1, Math.floor((l + vw/S + 48 - gx)/T)); i++){
        const s = bake(gk + '|' + i + '|' + j, () => ({ svg: p._gsvg, box: [gx + i*T - pad, gy + j*T - pad, gx + (i + 1)*T + pad, gy + (j + 1)*T + pad], px: TPX + 2*TPAD }));
        if (s){ s.ti = i; s.tj = j; s.gx = gx; s.gy = gy; out.push(s); } else all = false; }
    out.tiles = true; out.all = all; return out;
  }
  W.sortProps = () => { order = place.props.slice().sort((a, b) => a.sk - b.sk); W.dirty = true; };
  const propSprite = o => bake('p|' + place.id + '|' + o.key, () => { const r = o.draw(); return { svg: W.world(r.svg), box: W.box2w(r.box, 10) }; });
  // only things on (or near) the screen are made and kept
  const vis = o => { const b = o._sb || (o._sb = W.box2w([[o.x0 - 34, o.y0 - 34, 0], [o.x1 + 34, o.y1 + 34, o.h + 40]], 0)), hw = vw/2/S + 70, hh = vh/2/S + 70; return b[2] > cam.x - hw && b[0] < cam.x + hw && b[3] > cam.y - hh && b[1] < cam.y + hh; };
  W.ready = () => { if (!place) return false; const g = ground(true); return !!g && (!g.tiles || g.all) && place.props.every(o => !vis(o) || !!propSprite(o)); };
  const inFront = (a, o) => a.x >= o.x1 - .5 || a.y >= o.y1 - .5;
  const near = (a, o) => a.x > o.x0 - 90 && a.x < o.x1 + 90 && a.y > o.y0 - 90 && a.y < o.y1 + 90;

  function blit(s, ox, oy){
    const k = S*DPR, x = Math.round(((s.x - cam.x)*S + vw/2 + ox)*DPR), y = Math.round(((s.y - cam.y)*S + vh/2 + oy)*DPR);
    ctx.drawImage(s.img, x, y, Math.round(s.w*k), Math.round(s.h*k));
  }
  const drawn = [];           // what was drawn this frame, for picking: { x0, y0, x1, y1, actor | prop }
  W.frame = (actors, fx) => {
    tickN++; if (!place) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = place.sky || '#f2efe7'; ctx.fillRect(0, 0, cv.width, cv.height);
    const g = ground(true);
    if (g && g.tiles){ if (!g.all) W.dirty = true; for (const s of g){ const bx = Math.round(((s.gx - cam.x)*S + vw/2)*DPR), by = Math.round(((s.gy - cam.y)*S + vh/2)*DPR);
      ctx.drawImage(s.img, TPAD, TPAD, TPX, TPX, bx + s.ti*TPX, by + s.tj*TPX, TPX, TPX); } }
    else if (g) blit(g[0], 0, 0);
    // people go after the nearest prop they stand in front of (exact box rule), else by depth
    const slots = order.map(() => []), first = [];
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
      if (s){ blit(s, 0, 0); if (o.hit) drawn.push({ x0: (s.x - cam.x)*S + vw/2, y0: (s.y - cam.y)*S + vh/2, w: s.w*S, h: s.h*S, prop: o }); }
      put(slots[i]); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (fx) fx(ctx);
    if (place.tint){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = place.tint; ctx.fillRect(0, 0, vw, vh); ctx.globalCompositeOperation = 'source-over'; }
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
  W.path = (p, a, b) => {
    const gr = p.grid, cols = gr.cols, rows = gr.rows, g = gr.g, s = cellOf(p, a[0], a[1]), e = cellOf(p, b[0], b[1]);
    const si = s[1]*cols + s[0], ei = e[1]*cols + e[0];
    if (si === ei) return [b.slice()];
    // getting up from a seat or a bed in the middle of a thing: step off to the nearest free cell first
    if (g[si]){ const n = W.freeNear(p, a[0], a[1], null, 1); if (!n) return null; if (W.cellId(p, n[0], n[1]) === ei) return [b.slice()]; const pa = W.path(p, n, b); return pa ? [n].concat(pa) : null; }
    // a seat or a bed in the middle of a thing: walk to the nearest free cell beside it, then step on
    if (g[ei]){ const n = W.freeNear(p, b[0], b[1], null, 1); if (!n) return null; if (W.cellId(p, n[0], n[1]) === si) return [b.slice()]; const pa = W.path(p, a, n); return pa ? pa.concat([b.slice()]) : null; }
    const N = cols*rows, cost = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), open = [si]; cost[si] = 0;
    const fsc = new Float32Array(N); const hf = i => { const dx = Math.abs(i % cols - e[0]), dy = Math.abs((i/cols | 0) - e[1]); return Math.max(dx, dy) + .41*Math.min(dx, dy); };
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
  W.init = canvas => {
    cv = canvas; ctx = cv.getContext('2d', { alpha: false });
    const fit = () => { DPR = Math.min(3, window.devicePixelRatio || 1); vw = cv.clientWidth || innerWidth; vh = cv.clientHeight || innerHeight;
      cv.width = Math.round(vw*DPR); cv.height = Math.round(vh*DPR);
      const s = Math.max(.9, Math.min(1.5, Math.min(vw/340, vh/460)));
      if (Math.abs(s - S) > .02){ S = s; for (const [k, sp] of SPR){ if (sp.img) bytes -= sp.bytes; SPR.delete(k); } if (place) W.setPlace(place); }
      W.dirty = true; };
    S = 0; FILT = filterFor(1); fit(); addEventListener('resize', fit);
  };
})();
