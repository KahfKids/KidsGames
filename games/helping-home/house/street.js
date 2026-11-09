/* Helping Home: the neighbourhood street around the house (a backdrop with a few tappable places, not an open world).
   Drawn with the Colorfigures engine (iso/core.js, MIT), in the house's own coordinates and palette, a little calmer.
   This file only draws. It is static: the integrator draws it once into the static layer and redraws it only when the
   light, the weather or the camera changes.

   Layout (x = depth, the street is in front of the lot at +x; y = width, +y toward viewer-left; z = up):
     the lot (drawn by the house)      house + yard, x in [lot.x0, lot.x1], y in [lot.y0, lot.y1]
     the street in front               pavement, road, far pavement, running along y; a side lane on the lot's left
     the house row (same x as the lot) right of the lot: the school, a neighbour; left of the lane: the corner shop,
                                       a neighbour
     across the street                 a village green with the duck pond (low, so the house stays in full view),
                                       and set back beyond it: a neighbour's bungalow, the mosque, the playground
     behind                            back gardens, trees, rolling hills
   Rule that keeps the house clear: anything in front of the lot is low enough that, for every camera yaw in 45 +-30
   at pitch 27, its top never reaches the lot on screen (height < 0.5 x its distance in front of the lot). Tall
   things (mosque, minaret, bungalow) stand far enough back across the green.

   API (see the bottom of the file): HStreet.items(o), HStreet.draw(o, houseSvg), HStreet.glow(o), HStreet.sky(o),
   HStreet.weather(o), HStreet.places, HStreet.bounds(lot), HStreet.CSS. */
(function () {
  'use strict';
  const mo = matOf;
  const DEF_LOT = { x0: -30, y0: -20, x1: 200, y1: 612 };

  /* ---------- palette (the house's, a touch calmer) ---------- */
  const PAL = {
    grass: '#bddc95', grass2: '#b2d68a', park: '#b6d98c', snow: '#f1f4f7', soil: mo('#a8744b'),
    pave: '#ebe2cf', paveJ: '#d5c9ae', kerb: mo('#d8ccb4'), road: '#a3a7b4', roadWet: '#8c91a0', line: '#f7f2e4',
    water: '#94cbe2', ripple: '#c9e8f3', sand: '#e6d3a6',
    hedge: mo('#86b96a'), wood: mo('#d9a86c'), woodL: mo('#efcb98'), post: mo('#4d6b62'), gold: '#f2c230',
    glass: '#cfe2ea', glassN: '#56628a', lit: '#ffd56e', frame: '#fbf6ea',
  };
  const SNOWM = { l: '#ffffff', m: '#e7edf3', d: '#c4d0dc' };

  /* ---------- small helpers (same drawing rules as house/draw.js) ---------- */
  const quad = (pts, col) => face(pd(pts), col);
  const bmid = b => [0, 1, 2].map(k => (b[0][k] + b[1][k])/2);
  function bx(x0, y0, z0, x1, y1, z1, m, w = .8){
    const F = [
      [[0,1,0],  [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]],
      [[1,0,0],  [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],
      [[0,-1,0], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],
      [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]],
      [[0,0,1],  [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]] ];
    let s = '', d = '';
    for (const [n, q] of F) if (vis(n)){ const p = pd(q); s += face(p, toneI(n, m)); d += p; }
    return w ? s + ink(d, w) : s;
  }
  // body of revolution (bands merged per shade): prof = [[z, r], ...] bottom to top
  function lathe(cx, cy, prof, m, opt = {}){
    const n = opt.n || 16, w = opt.w == null ? .8 : opt.w;
    const rings = prof.map(([z, r]) => Array.from({ length: n }, (_, i) => { const a = i/n*2*Math.PI; return [cx + r*Math.cos(a), cy + r*Math.sin(a), z]; }));
    let s = '';
    for (let k = 0; k < rings.length - 1; k++){
      const A = rings[k], B = rings[k + 1], strip = [];
      for (let i = 0; i < n; i++){
        const a = (i + .5)/n*2*Math.PI, dr = prof[k][1] - prof[k + 1][1], dz = prof[k + 1][0] - prof[k][0];
        const nr = norm([Math.cos(a)*dz, Math.sin(a)*dz, dr]);
        strip.push(vis(nr) ? toneI(nr, m) : null);
      }
      let st = strip.indexOf(null); if (st < 0) st = 0;
      for (let j = 0; j < n;){
        const i0 = (st + j) % n, col = strip[i0]; if (!col){ j++; continue; }
        let len = 1; while (j + len < n && strip[(st + j + len) % n] === col) len++;
        const top = [], bot = [];
        for (let t = 0; t <= len; t++){ const ii = (i0 + t) % n; bot.push(A[ii]); top.push(B[ii]); }
        s += face(pd(bot.concat(top.reverse())), col);
        j += len;
      }
    }
    const last = rings[rings.length - 1];
    if (opt.top && prof[prof.length - 1][1] > .5) s += shape(last, opt.top === true ? toneI([0,0,1], m) : opt.top, w*.8);
    return s + (w ? hullInk([].concat(...rings), w*1.4) : '');
  }
  function ball(c, r, col, w = 1){
    const q = P(...c), R = r*Math.sqrt(1.5), dk = mix(col, '#000000', .22), lt = mix(col, '#ffffff', .4);
    return `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R)}" fill="${dk}"/>` +
      `<circle cx="${f(q[0] + R*.1)}" cy="${f(q[1] - R*.1)}" r="${f(R*.86)}" fill="${col}"/>` +
      `<circle cx="${f(q[0] + R*.34)}" cy="${f(q[1] - R*.36)}" r="${f(R*.22)}" fill="${lt}"/>` +
      `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R)}" fill="none" stroke="${INK}" stroke-width="${w}"/>`;
  }
  // a slim inked bar (posts, rails, frames): all segments in one ink path and one colour path
  const bars = (segs, col, w) => { const d = segs.map(s => pd(s, false)).join('');
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 1.5)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const archUV = (u0, u1, v0, v1) => { const r = (u1 - u0)/2, um = (u0 + u1)/2;
    return [[u0, v0], [u1, v0], [u1, v1 - r], ...arcUV(um, v1 - r, r, 0, 180, 8).slice(1, -1), [u0, v1 - r]]; };
  // a seeded random (the same street every time)
  const rnd = (i, k = 0) => { const x = Math.sin(i*127.1 + k*311.7)*43758.5453; return x - Math.floor(x); };

  /* ---------- windows and doors on a wall plane ----------
     ax 'x': the wall x = c, rects [u0, u1, v0, v1, arch] with u = y; ax 'y': the wall y = c, u = x. v = z.
     Glass, then a cream frame with glazing bars, then a fine ink outline: 3–4 paths per wall, whatever the count. */
  function wins(ax, c, sgn, rects, lit, opt = {}){
    const n = ax === 'x' ? [sgn, 0, 0] : [0, sgn, 0];
    if (!vis(n) || !rects.length) return '';
    const pl = ax === 'x' ? PX(c + sgn*.5) : PY(c + sgn*.5);
    let g = '', l = '', fr = '', o = '';
    rects.forEach((r, i) => {
      const [u0, u1, v0, v1, arch] = r, out = arch ? archUV(u0, u1, v0, v1) : rectUV(u0, v0, u1, v1), d = pd(on(pl, out));
      if (lit && lit(i)) l += d; else g += d;
      o += d;
      if (!opt.plain){ const um = (u0 + u1)/2, vm = arch ? v0 + (v1 - v0)*.42 : (v0 + v1)/2;
        fr += pd(on(pl, [[um, v0], [um, arch ? v1 : v1]]), false) + pd(on(pl, [[u0, vm], [u1, vm]]), false); }
    });
    let s = '';
    if (g) s += fill(g, opt.glass || PAL.glass);
    if (l) s += fill(l, opt.litCol || PAL.lit);
    if (fr) s += `<path d="${fr}" fill="none" stroke="${opt.frame || PAL.frame}" stroke-width="2"/>`;
    s += `<path d="${o}" fill="none" stroke="${opt.frame || PAL.frame}" stroke-width="2.6"/>` + ink(o, .7);
    return s;
  }
  function door(ax, c, sgn, u0, u1, h, col, arch){
    const n = ax === 'x' ? [sgn, 0, 0] : [0, sgn, 0];
    if (!vis(n)) return '';
    const pl = ax === 'x' ? PX(c + sgn*.5) : PY(c + sgn*.5), out = arch ? archUV(u0, u1, 0, h) : rectUV(u0, 0, u1, h);
    const km = sgn*(ax === 'x' ? 1 : -1) > 0 ? u0 + 5 : u1 - 5;
    return shape(on(pl, out), col, .8) + ink(pd(on(pl, rectUV(u0 + 4, h*.15, u1 - 4, h*.5))) , .5) +
      fill(pd(on(pl, ellUV(km, h*.5, 1.8, 1.8, 6))), '#f2c230');
  }

  /* ---------- buildings ---------- */
  // a house with a pitched roof; ridge along 'y' (eaves to the street) or 'x' (gable to the street)
  function pitched(o){
    const { x0, y0, x1, y1, zw, hr } = o, wm = mo(o.wall), rm = o.snow ? SNOWM : mo(o.roof), ov = 7;
    let s = bx(x0, y0, 0, x1, y1, zw, wm, .9);
    s += o.decor || '';
    const zt = zw + hr;
    if (o.ridge === 'y'){
      const xm = (x0 + x1)/2, sl = hr/((x1 - x0)/2), ze = zw - ov*sl;
      for (const [yy, sg] of [[y0, -1], [y1, 1]]) if (vis([0, sg, 0])){ const g = [[x0, yy, zw], [x1, yy, zw], [xm, yy, zt]]; s += quad(g, toneI([0, sg, 0], wm)) + ink(pd(g), .8); }
      const sP = [[x1 + ov, y0 - ov, ze], [x1 + ov, y1 + ov, ze], [xm, y1 + ov, zt], [xm, y0 - ov, zt]];
      const sN = [[x0 - ov, y0 - ov, ze], [x0 - ov, y1 + ov, ze], [xm, y1 + ov, zt], [xm, y0 - ov, zt]];
      const nP = norm([sl, 0, 1]), nN = norm([-sl, 0, 1]);
      if (vis(nN)) s += quad(sN, toneI(nN, rm));
      if (o.chimney && o.chimney[0] < xm) s += o.chimney[1];
      if (vis(nP)){ s += quad(sP, toneI(nP, rm));
        let t = ''; for (let k = 1; k < 4; k++){ const u = k/4, x = x1 + ov + (xm - x1 - ov)*u, z = ze + (zt - ze)*u; t += pd([[x, y0 - ov + 2, z], [x, y1 + ov - 2, z]], false); }
        s += `<path d="${t}" fill="none" stroke="${rm.d}" stroke-width=".8" opacity=".7"/>`; }
      if (vis([0, 1, 0])){ const yy = y1 + ov, b = [[x1 + ov, yy, ze], [xm, yy, zt], [x0 - ov, yy, ze], [x0 - ov, yy, ze - 4], [xm, yy, zt - 4], [x1 + ov, yy, ze - 4]]; s += quad(b, rm.d); }
      if (o.chimney && o.chimney[0] >= xm) s += o.chimney[1];
      s += ink(pd(vis(nP) ? sP : sN), 1.1);
    } else {
      const ym = (y0 + y1)/2, sl = hr/((y1 - y0)/2), ze = zw - ov*sl;
      for (const [xx, sg] of [[x0, -1], [x1, 1]]) if (vis([sg, 0, 0])){ const g = [[xx, y0, zw], [xx, y1, zw], [xx, ym, zt]]; s += quad(g, toneI([sg, 0, 0], wm)) + ink(pd(g), .8); }
      const sP = [[x0 - ov, y1 + ov, ze], [x1 + ov, y1 + ov, ze], [x1 + ov, ym, zt], [x0 - ov, ym, zt]];
      const sN = [[x0 - ov, y0 - ov, ze], [x1 + ov, y0 - ov, ze], [x1 + ov, ym, zt], [x0 - ov, ym, zt]];
      const nP = norm([0, sl, 1]), nN = norm([0, -sl, 1]);
      if (vis(nN)) s += quad(sN, toneI(nN, rm));
      if (o.chimney && o.chimney[0] < ym) s += o.chimney[1];
      if (vis(nP)){ s += quad(sP, toneI(nP, rm));
        let t = ''; for (let k = 1; k < 4; k++){ const u = k/4, y = y1 + ov + (ym - y1 - ov)*u, z = ze + (zt - ze)*u; t += pd([[x0 - ov + 2, y, z], [x1 + ov - 2, y, z]], false); }
        s += `<path d="${t}" fill="none" stroke="${rm.d}" stroke-width=".8" opacity=".7"/>`; }
      if (vis([1, 0, 0])){ const xx = x1 + ov, b = [[xx, y1 + ov, ze], [xx, ym, zt], [xx, y0 - ov, ze], [xx, y0 - ov, ze - 4], [xx, ym, zt - 4], [xx, y1 + ov, ze - 4]]; s += quad(b, rm.d); }
      if (o.chimney && o.chimney[0] >= ym) s += o.chimney[1];
      s += ink(pd(vis(nP) ? sP : sN), 1.1);
    }
    return s + hullInk([[x0, y0, 0], [x1, y0, 0], [x0, y1, 0], [x1, y1, 0], [x0 - ov, y0 - ov, zw], [x1 + ov, y1 + ov, zw], [x0 - ov, y1 + ov, zw], [x1 + ov, y0 - ov, zw],
      ...(o.ridge === 'y' ? [[(x0 + x1)/2, y0 - ov, zt], [(x0 + x1)/2, y1 + ov, zt]] : [[x0 - ov, (y0 + y1)/2, zt], [x1 + ov, (y0 + y1)/2, zt]])], 1.6);
  }
  const chim = (x, y, zb, h, col, snow) => bx(x - 8, y - 9, zb, x + 8, y + 9, zb + h, mo(col), .8) + bx(x - 10, y - 11, zb + h, x + 10, y + 11, zb + h + 5, snow ? SNOWM : mo('#8d6f5e'), .7);

  /* ---------- small street things ---------- */
  const CANOPY = { spring: ['#9fd07a', '#8cc46e'], summer: ['#86c070', '#79b565'], autumn: ['#efaa45', '#e07f45'], winter: ['#a7b98f', '#98ad83'] };
  // a round street tree: trunk with a branch, and a canopy of three inked balls (back, right, front-top), the way the
  // house draws its own tree; the balls are flat toward the viewer, so they are right from every side
  function tree(x, y, h, i, o){
    const ss = o.season in CANOPY ? o.season : 'summer', col = CANOPY[ss][i % 2], r = h*.26, zc = h - r*.9;
    let s = bars([[[x, y, 0], [x, y, zc]], [[x, y, zc*.62], [x + r*.25, y - r*.35, zc*.86]]], '#9a6a44', 3.2);
    const base = o.snow ? mix(col, '#ffffff', .35) : col, q = P(x, y, zc), R = r*Math.sqrt(1.5);
    const tint = ss === 'autumn' ? ['#c9653a', '#e08f3c', '#eab04a'] : [mix(base, '#000000', .14), base, mix(base, '#ffffff', .16)];
    [[-.42, .12, .68, 0], [.44, .1, .64, 1], [-.02, -.34, .7, 2]].forEach(([dx, dy, k, c]) => {
      const cx = q[0] + dx*R, cy = q[1] + dy*R, rr = k*R;
      s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" fill="${tint[c]}" stroke="${INK}" stroke-width=".9"/>` +
        `<circle cx="${f(cx + rr*.3)}" cy="${f(cy - rr*.34)}" r="${f(rr*.22)}" fill="${mix(tint[c], '#ffffff', .4)}"/>`; });
    if (o.snow) s += `<path d="M${f(q[0] - R*.75)} ${f(q[1] - R*.55)}A${f(R*.72)} ${f(R*.72)} 0 0 1 ${f(q[0] + R*.7)} ${f(q[1] - R*.55)}Q${f(q[0])} ${f(q[1] - R*.38)} ${f(q[0] - R*.75)} ${f(q[1] - R*.55)}Z" fill="#ffffff" stroke="${INK}" stroke-width=".6"/>`;
    else if (ss === 'spring' && i % 2 === 0){ let d = ''; for (let k = 0; k < 7; k++){ const a = k*1.1 + i, px = q[0] + R*.62*Math.cos(a), py = q[1] - R*.1 + R*.5*Math.sin(a);
      d += `M${f(px - 1.8)} ${f(py)}a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0`; } s += `<path d="${d}" fill="#f6b8c8"/>`; }
    return { box: [[x - r, y - r, 0], [x + r, y + r, h]], svg: s, kind: 'tree' };
  }
  function conifer(x, y, h, o){
    const r = h*.3, col = o.snow ? '#e9eef2' : '#6aa475';
    const s = bars([[[x, y, 0], [x, y, h*.2]]], '#9a6a44', 3) + lathe(x, y, [[h*.16, r], [h*.55, r*.55], [h*.5, r*.78], [h, 1]], mo(col), { n: 12, w: .7 });
    return { box: [[x - r, y - r, 0], [x + r, y + r, h]], svg: s, kind: 'tree' };
  }
  function lamp(x, y, z0, o, out){
    const h = 132, on_ = o.lamps > .3, hz = z0 + h;
    let s = bars([[[x, y, z0], [x, y, hz - 6]], [[x, y, hz - 10], [x + 9, y, hz - 6]]], '#4d6b62', 2.4);
    s += bx(x + 3, y - 6, hz - 16, x + 15, y + 6, hz - 6, on_ ? mo('#ffe08a') : mo('#f4efe2'), .7) + shape([[x + 1, y - 8, hz - 5], [x + 17, y - 8, hz - 5], [x + 17, y + 8, hz - 5], [x + 1, y + 8, hz - 5]], PAL.post.m, .7);
    if (out) out.push([x + 9, y, hz - 12]);
    return { box: [[x - 3, y - 8, z0], [x + 17, y + 8, hz]], svg: s, kind: 'lamp' };
  }
  function bench(x, y, ang){       // ang 0: seat along y, back on the -x side (faces +x)
    const c = ang ? 1 : 0;
    let s = '';
    if (!c){ s += bars([[[x, y - 22, 0], [x, y - 22, 12]], [[x, y + 22, 0], [x, y + 22, 12]]], '#4d6b62', 2);
      s += bx(x - 7, y - 26, 12, x + 7, y + 26, 15, PAL.wood, .7) + bx(x - 8, y - 26, 15, x - 5, y + 26, 30, PAL.wood, .7); }
    else { s += bars([[[x - 22, y, 0], [x - 22, y, 12]], [[x + 22, y, 0], [x + 22, y, 12]]], '#4d6b62', 2);
      s += bx(x - 26, y - 7, 12, x + 26, y + 7, 15, PAL.wood, .7) + bx(x - 26, y - 8, 15, x + 26, y - 5, 30, PAL.wood, .7); }
    return { box: c ? [[x - 26, y - 8, 0], [x + 26, y + 7, 30]] : [[x - 8, y - 26, 0], [x + 7, y + 26, 30]], svg: s };
  }
  // a low clipped hedge along x or y
  const hedge = (x0, y0, x1, y1, h, o) => ({ box: [[x0, y0, 0], [x1, y1, h]], svg: bx(x0, y0, 0, x1, y1, h, o.snow ? SNOWM : PAL.hedge, .8) });
  // railings: posts every `st` units between two ground points, two rails
  function railing(a, b, h, st, col){
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L/st)), segs = [];
    for (let i = 0; i <= n; i++){ const t = i/n, x = a[0] + (b[0] - a[0])*t, y = a[1] + (b[1] - a[1])*t; segs.push([[x, y, 0], [x, y, h]]); }
    segs.push([[a[0], a[1], h], [b[0], b[1], h]], [[a[0], a[1], h*.45], [b[0], b[1], h*.45]]);
    return bars(segs, col, 1.4);
  }
  // a duck on the water, drawn as plain shapes (body, head, bill): no eyes, no face
  function duck(x, y, s, col, dir){
    const q = P(x, y, 0), X = q[0], Y = q[1], d = dir, k = s;
    const body = `M${f(X - 7*k*d)} ${f(Y - 1*k)}C${f(X - 9*k*d)} ${f(Y - 6*k)} ${f(X - 4*k*d)} ${f(Y - 4.5*k)} ${f(X - 2*k*d)} ${f(Y - 4*k)}L${f(X + 4*k*d)} ${f(Y - 4*k)}C${f(X + 8*k*d)} ${f(Y - 4*k)} ${f(X + 8*k*d)} ${f(Y + 1.6*k)} ${f(X + 3*k*d)} ${f(Y + 1.6*k)}L${f(X - 4*k*d)} ${f(Y + 1.6*k)}C${f(X - 6*k*d)} ${f(Y + 1.6*k)} ${f(X - 7*k*d)} ${f(Y + .5*k)} ${f(X - 7*k*d)} ${f(Y - 1*k)}Z`;
    const head = `M${f(X + 4.8*k*d - 2.6*k)} ${f(Y - 7.4*k)}a${f(2.6*k)} ${f(2.6*k)} 0 1 0 ${f(5.2*k)} 0a${f(2.6*k)} ${f(2.6*k)} 0 1 0 ${f(-5.2*k)} 0`;
    const neck = `M${f(X + 2.6*k*d)} ${f(Y - 3.5*k)}L${f(X + 3.2*k*d)} ${f(Y - 7*k)}L${f(X + 6.2*k*d)} ${f(Y - 7*k)}L${f(X + 6*k*d)} ${f(Y - 3.5*k)}Z`;
    const bill = `M${f(X + 7*k*d)} ${f(Y - 7.8*k)}L${f(X + 10*k*d)} ${f(Y - 7*k)}L${f(X + 7*k*d)} ${f(Y - 6*k)}Z`;
    const ring = `M${f(X - 9*k)} ${f(Y + 2.2*k)}Q${f(X)} ${f(Y + 4.6*k)} ${f(X + 9*k)} ${f(Y + 2.2*k)}`;
    return `<path d="${ring}" fill="none" stroke="${PAL.ripple}" stroke-width="1.2"/>` + fill(bill, '#ef8a3c') +
      `<path d="${body + neck + head}" fill="${col}" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>`;
  }
  // a crescent and ball finial, drawn flat toward the viewer (it reads the same from every side)
  function crescent(p, r){
    const q = P(...p), X = q[0], Y = q[1];
    return `<path d="M${f(X - r*.2)} ${f(Y - r)}A${f(r)} ${f(r)} 0 1 0 ${f(X - r*.2)} ${f(Y + r)}A${f(r*.78)} ${f(r*.78)} 0 1 1 ${f(X - r*.2)} ${f(Y - r)}Z" fill="${PAL.gold}" stroke="${INK}" stroke-width=".7"/>`;
  }

  /* ---------- the scene ---------- */
  function normLot(l){
    if (!l) return DEF_LOT;
    if (Array.isArray(l)) return { x0: l[0][0], y0: l[0][1], x1: l[1][0], y1: l[1][1] };
    if (l.LOT) return normLot(l.LOT);
    return l;
  }
  function layout(lot){
    const L = normLot(lot), X1 = L.x1, Y0 = L.y0, Y1 = L.y1, X0 = L.x0;
    const PA = [X1 + 4, X1 + 36], RD = [X1 + 36, X1 + 136], PB = [X1 + 136, X1 + 168], XA = X1 + 176;
    return {
      L, PA, RD, PB, XA,
      lane: [Y1 + 48, Y1 + 128],
      board: [[X0 - 660, Y0 - 840], [X1 + 1500, Y1 + 1400]],
      school: { x0: X0 + 20, x1: X1 - 70, y0: Y0 - 290, y1: Y0 - 50 },
      n1: { x0: X0 + 20, x1: X1 - 70, y0: Y0 - 560, y1: Y0 - 390 },
      shop: { x0: X0 - 170, x1: X0 - 30, y0: Y1 - 130, y1: Y1 + 18 },
      n2: { x0: X0 - 400, x1: X0 - 240, y0: Y1 - 150, y1: Y1 + 10 },
      pond: { cx: XA + 106, cy: Y1 + 92, rx: 72, ry: 128 },
      n3: { x0: XA + 270, x1: XA + 420, y0: Y0 + 40, y1: Y0 + 250 },
      mosque: { x0: XA + 270, x1: XA + 430, y0: Y0 + 420, y1: Y0 + 650 },
      park: { x0: XA + 20, x1: XA + 360, y0: Y1 + 260, y1: Y1 + 600 },
    };
  }

  function groundItem(G, o){
    const [[bx0, by0], [bx1, by1]] = G.board, L = G.L, sn = o.snow, wet = o.weather === 'rain';
    const g = sn ? PAL.snow : PAL.grass, z = 0;
    let s = '';
    // the board: top, then the two front edges (soil)
    if (vis([1,0,0])) s += quad([[bx1, by0, -22], [bx1, by1, -22], [bx1, by1, z], [bx1, by0, z]], toneI([1,0,0], PAL.soil));
    if (vis([0,1,0])) s += quad([[bx0, by1, -22], [bx1, by1, -22], [bx1, by1, z], [bx0, by1, z]], toneI([0,1,0], PAL.soil));
    s += fill(pd(on(PZ(z), rectUV(bx0, by0, bx1, by1))), g);
    s += ink(pd([[bx1, by0, z], [bx1, by1, z], [bx0, by1, z]], false), 1.6) + ink(pd([[bx1, by0, -22], [bx1, by1, -22], [bx0, by1, -22]], false) + pd([[bx1, by1, -22], [bx1, by1, z]], false), 1.8);
    // mown stripes and grass tufts on the lawns (one path each)
    const flat = (pts, col) => fill(pd(on(PZ(z), pts)), col);
    // the green across the street and the park lawn, a touch brighter
    const XA = G.XA, gr = G.park, pd_ = G.pond;
    s += flat(rrUV(XA + 6, L.y0 - 10, XA + 214, pd_.cy + pd_.ry + 40, 20), sn ? '#f7f9fb' : PAL.grass2);
    s += flat(rrUV(gr.x0, gr.y0, gr.x1, gr.y1, 18), sn ? '#f7f9fb' : PAL.park);
    // the road (with the side lane) and the pavements
    const road = sn ? '#b9bcc6' : wet ? PAL.roadWet : PAL.road;
    s += flat(rectUV(G.RD[0], by0, G.RD[1], by1), road);
    s += flat(rectUV(bx0, G.lane[0], G.RD[0], G.lane[1]), road);
    let dash = ''; for (let y = by0 + 20; y < by1 - 40; y += 64) if (y + 34 < G.lane[0] - 4 || y > G.lane[1] + 4) dash += pd(on(PZ(z + .2), rectUV((G.RD[0] + G.RD[1])/2 - 2, y, (G.RD[0] + G.RD[1])/2 + 2, y + 34)));
    for (let x = bx0 + 30; x < L.x0 - 20; x += 64) dash += pd(on(PZ(z + .2), rectUV(x, (G.lane[0] + G.lane[1])/2 - 2, x + 34, (G.lane[0] + G.lane[1])/2 + 2)));
    // a zebra crossing from the house's side to the green, beside the lane
    for (let k = 0; k < 6; k++){ const x = G.RD[0] + 8 + k*15; dash += pd(on(PZ(z + .2), rectUV(x, G.lane[0] - 64, x + 9, G.lane[0] - 18))); }
    s += fill(dash, sn ? '#ffffff' : PAL.line);
    s += ink(pd([[G.RD[0], by0, z], [G.RD[0], G.lane[0], z]], false) + pd([[G.RD[0], G.lane[1], z], [G.RD[0], by1, z]], false) + pd([[G.RD[1], by0, z], [G.RD[1], by1, z]], false) +
      pd([[bx0, G.lane[0], z], [L.x0, G.lane[0], z]], false), .7);
    // pavements: raised 4, a kerb face toward the viewer, paving joints
    const pave = sn ? '#f7f8fa' : PAL.pave;
    const slab = (x0, y0, x1, y1) => { let t = '';
      if (vis([1,0,0])) t += quad([[x1, y0, 0], [x1, y1, 0], [x1, y1, 4], [x1, y0, 4]], toneI([1,0,0], PAL.kerb));
      if (vis([0,1,0])) t += quad([[x0, y1, 0], [x1, y1, 0], [x1, y1, 4], [x0, y1, 4]], toneI([0,1,0], PAL.kerb));
      t += fill(pd(on(PZ(4), rectUV(x0, y0, x1, y1))), pave);
      let j = ''; for (let y = y0 + 32; y < y1 - 4; y += 32) j += pd([[x0, y, 4], [x1, y, 4]], false);
      return t + `<path d="${j}" fill="none" stroke="${PAL.paveJ}" stroke-width=".8"/>` + ink(pd([[x1, y0, 4], [x1, y1, 4], [x0, y1, 4]], false) + pd([[x1, y0, 0], [x1, y1, 0]], false), .8); };
    s += slab(G.PA[0], by0, G.PA[1], G.lane[0]) + slab(G.PA[0], G.lane[1], G.PA[1], by1) + slab(G.PB[0], by0, G.PB[1], by1);
    { const y0 = G.lane[0] - 26, y1 = G.lane[0], x0 = bx0, x1 = G.PA[0]; let t = '';
      if (vis([0,1,0])) t += quad([[x0, y1, 0], [x1, y1, 0], [x1, y1, 4], [x0, y1, 4]], toneI([0,1,0], PAL.kerb));
      t += fill(pd(on(PZ(4), rectUV(x0, y0, x1, y1))), pave);
      let j = ''; for (let x = x1 - 32; x > x0; x -= 32) j += pd([[x, y0, 4], [x, y1, 4]], false);
      s += t + `<path d="${j}" fill="none" stroke="${PAL.paveJ}" stroke-width=".8"/>` + ink(pd([[x0, y1, 4], [x1, y1, 4]], false) + pd([[x0, y1, 0], [x1, y1, 0]], false), .8); }
    // paths: across the green to the mosque gate, to each front door, the shop forecourt, the school yard
    const m = G.mosque, ym = (m.y0 + m.y1)/2;
    let pth = pd(on(PZ(z + .3), rectUV(G.PB[1], ym - 16, m.x0 - 30, ym + 16)));
    { const h = G.n1, yc = (h.y0 + h.y1)/2; pth += pd(on(PZ(z + .3), rectUV(h.x1, yc - 12, G.PA[0], yc + 12))); }
    { const h = G.n2, xc = (h.x0 + h.x1)/2; pth += pd(on(PZ(z + .3), rectUV(h.x1 - 58, h.y1, h.x1 - 18, G.lane[0] - 26))); }
    const n3 = G.n3; pth += pd(on(PZ(z + .3), rectUV(G.PB[1], (n3.y0 + n3.y1)/2 - 12, n3.x0, (n3.y0 + n3.y1)/2 + 12)));
    s += fill(pth, sn ? '#e3e8ee' : '#e4d6b8');
    const sc = G.school;
    s += flat(rectUV(sc.x1, sc.y0, G.PA[0] - 4, sc.y1), sn ? '#e9edf2' : '#c9c3bb');
    // hopscotch in the school yard
    let hp = ''; const hx = sc.x1 + 22, hy = (sc.y0 + sc.y1)/2 + 40;
    for (let k = 0; k < 4; k++) hp += pd(on(PZ(z + .4), rectUV(hx - 8, hy + k*16, hx + 8, hy + k*16 + 16)));
    s += `<path d="${hp}" fill="none" stroke="#fbf6ea" stroke-width="1.6"/>`;
    // the duck pond: sandy rim, water, ripples, reeds, lily pads
    const { cx, cy, rx, ry } = pd_;
    s += flat(ellUV(cx, cy, rx + 9, ry + 9, 28), sn ? '#e4e9ef' : PAL.sand);
    s += shape(on(PZ(z + .4), ellUV(cx, cy, rx, ry, 28)), sn ? '#bcd8e6' : PAL.water, 1);
    if (!sn){
      let rp = ''; for (const [u, v, a] of [[-.3, -.35, 22], [.25, .1, 28], [-.15, .45, 18]]) rp += pd(on(PZ(z + .5), arcUV(cx + u*rx, cy + v*ry, a, 200, 320, 5)), false);
      s += `<path d="${rp}" fill="none" stroke="${PAL.ripple}" stroke-width="1.4" stroke-linecap="round"/>`;
      s += fill(pd(on(PZ(z + .6), ellUV(cx + rx*.45, cy - ry*.55, 8, 8, 10))) + pd(on(PZ(z + .6), ellUV(cx + rx*.6, cy - ry*.38, 6, 6, 10))), '#7fb866');
    }
    // the ducks (on still water; on ice in snow they stand on the rim)
    const DK = [[cx - rx*.25, cy - ry*.3, 2.2, '#fbf6ea', 1], [cx + rx*.1, cy + ry*.0, 2.2, '#fbf6ea', -1], [cx + rx*.3, cy + ry*.24, 1.4, '#f6d35a', -1], [cx + rx*.42, cy + ry*.4, 1.4, '#f6d35a', -1]];
    for (const [x, y, k, c, d] of DK) s += duck(x, y, k, c, d);
    // the playground's soft surface and the sandpit
    s += flat(rrUV(gr.x0 + 30, gr.y0 + 40, gr.x0 + 200, gr.y0 + 300, 14), sn ? '#eef1f5' : '#e7b49a');
    // puddles in the rain
    if (wet){ let pu = ''; for (const [x, y, a, b] of [[G.RD[0] + 30, L.y0 + 120, 22, 40], [G.RD[0] + 70, L.y0 + 420, 16, 30], [G.PB[0] + 14, L.y0 + 300, 10, 22], [G.RD[0] + 50, L.y1 + 260, 20, 34]])
      pu += pd(on(PZ(x > G.PB[0] ? 4.5 : .5), ellUV(x, y, a, b, 14))); s += fill(pu, '#b9d3e3'); }
    // flowers (spring, summer) or fallen leaves (autumn) on the green
    if (!sn && o.season !== 'winter'){ let fl = ''; const col = o.season === 'autumn' ? '#e08a3c' : '#f3a6bb';
      for (let i = 0; i < 30; i++){ const x = XA + 20 + rnd(i, 1)*180, y = L.y0 + rnd(i, 2)*(pd_.cy + pd_.ry + 30 - L.y0);
        if (((x - cx)/(rx + 16))**2 + ((y - cy)/(ry + 16))**2 < 1 || Math.abs(y - ym) < 24) continue;
        const q = P(x, y, 0); fl += `M${f(q[0] - 1.8)} ${f(q[1])}a1.8 1.4 0 1 0 3.6 0a1.8 1.4 0 1 0 -3.6 0`; }
      s += `<path d="${fl}" fill="${col}"/>`; }
    return s;
  }

  function shadows(G, o){
    const sh = [], b = (x0, y0, x1, y1, h) => sh.push(castShadow([[x0, y0, 0], [x1, y0, 0], [x0, y1, 0], [x1, y1, 0], [x0, y0, h], [x1, y0, h], [x0, y1, h], [x1, y1, h]], 0));
    for (const k of ['school', 'n1', 'shop', 'n2', 'n3', 'mosque']){ const h = G[k]; b(h.x0, h.y0, h.x1, h.y1, k === 'n3' ? 150 : k === 'shop' ? 140 : k === 'mosque' ? 130 : 220); }
    return `<g opacity=".32">${sh.join('')}</g>`;
  }

  // the context: { lot | LOT, light (HL.light), weather | kind.weather, season, t | now }. Both the names this file
  // documents and the ones house/main.js passes are accepted.
  function norm0(c){
    c = c || {};
    const t = c.t instanceof Date ? c.t : c.now instanceof Date ? c.now : null, m = (t || new Date()).getMonth();
    const light = c.light || (c.night ? { lamps: 1, night: true } : {});
    return { lot: c.lot || c.LOT, light, t, weather: c.weather || (c.kind && c.kind.weather) || 'sun',
      season: c.season || ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][m] };
  }
  function build(o){
    o = norm0(o);
    const light = o.light, lamps = light.lamps != null ? light.lamps : (light.night ? 1 : 0);
    o.lamps = lamps; o.snow = o.weather === 'snow';
    const G = layout(o.lot), L = G.L, items = [], glowAt = [], winGlow = [];
    const night = lamps > .5, t = o.t instanceof Date ? o.t : null;
    const litBy = (seed, share) => i => night && rnd(i + 1, seed) < share;
    const side = b => (b[1][0] <= L.x0 || b[1][1] <= L.y0) ? 'back' : 'front';
    const add = (it, extra) => { it.at = it.at || bmid(it.box); it.side = side(it.box); Object.assign(it, extra || {}); items.push(it); return it; };

    // ground (one flat item, drawn before everything, the house included)
    // its box is deliberately the board's back quarter (behind the lot, below z = 0): any back/front split then draws
    // it first, before the house, and byDepth puts it under everything (it is the only box below the ground)
    items.push({ box: [[G.board[0][0], G.board[0][1], -22], [L.x0, L.y0, 0]], at: [G.board[0][0], G.board[0][1], -40], side: 'ground', ground: true,
      svg: groundItem(G, o) + shadows(G, o) });

    // ---- the school (house row, right of the lot): flag, gate, clock, alphabet blocks
    { const s = G.school, { x0, x1, y0, y1 } = s, zw = 150, ym = (y0 + y1)/2;
      const wm = mo('#e6a888');
      const wl = [[y0 + 16, y0 + 56, 40, 112], [y0 + 66, y0 + 106, 40, 112], [y1 - 106, y1 - 66, 40, 112], [y1 - 56, y1 - 16, 40, 112]];
      let deco = wins('x', x1, 1, wl, litBy(3, 0)) + wins('y', y1, 1, [[x0 + 24, x0 + 64, 40, 112], [x0 + 80, x1 - 24, 40, 112]], null);
      deco += door('x', x1, 1, ym - 22, ym + 22, 104, '#5b8fd6');
      if (vis([1,0,0])){
        deco += shape(on(PX(x1 + .6), rectUV(ym - 34, 108, ym + 34, 116)), '#fbf6ea', .7);                                          // canopy edge
        deco += shape(on(PX(x1 + .6), ellUV(ym, 132, 11, 11, 18)), '#fbf6ea', .9) + ink(pd(on(PX(x1 + .7), [[ym, 132], [ym, 140]]), false) + pd(on(PX(x1 + .7), [[ym, 132], [ym - 6, 132]]), false), 1.1);
        ['#e8574a', '#f2c230', '#5b8fd6'].forEach((c, i) => { deco += shape(on(PX(x1 + .6), rectUV(ym + 40 + i*13, 116, ym + 51 + i*13, 127)), c, .7); });
      }
      add({ box: [[x0, y0, 0], [x1, y1, zw + 64]], svg: pitched({ x0, y0, x1, y1, zw, hr: 64, ridge: 'y', wall: '#e6a888', roof: '#7a8aa6', snow: o.snow, decor: deco }) }, { id: 'school' });
      // canopy over the door
      add({ box: [[x1, ym - 36, 104], [x1 + 18, ym + 36, 118]], svg: bx(x1, ym - 36, 108, x1 + 18, ym + 36, 114, o.snow ? SNOWM : mo('#7a8aa6'), .8) +
        bars([[[x1 + 16, ym - 32, 0], [x1 + 16, ym - 32, 108]], [[x1 + 16, ym + 32, 0], [x1 + 16, ym + 32, 108]]], '#fbf6ea', 2) });
      // railings along the front with a gate; open on school mornings
      const fx = L.x1 - 6, gy0 = ym - 26, gy1 = ym + 26;
      const open = t ? (t.getDay() >= 1 && t.getDay() <= 5 && t.getHours() >= 7 && t.getHours() < 16) : true;
      add({ box: [[fx - 2, y0 - 10, 0], [fx + 2, gy0 - 8, 46]], svg: railing([fx, y0 - 10], [fx, gy0 - 8], 44, 10, '#3f5d9a') });
      add({ box: [[fx - 2, gy1 + 8, 0], [fx + 2, y1 + 30, 46]], svg: railing([fx, gy1 + 8], [fx, y1 + 30], 44, 10, '#3f5d9a') });
      for (const yy of [gy0 - 4, gy1 + 4]) add({ box: [[fx - 6, yy - 6, 0], [fx + 6, yy + 6, 74]], svg: bx(fx - 6, yy - 6, 0, fx + 6, yy + 6, 66, mo('#d98a6a'), .8) + ball([fx, yy, 72], 6, '#f4efe2', .8) });
      add({ box: [[fx - 2, gy0, 0], [fx + 2, gy1, 92]], svg: bars([[[fx, gy0, 80], [fx, (gy0 + gy1)/2, 92], [fx, gy1, 80]]].concat(open ? [] : Array.from({ length: 7 }, (_, i) => [[fx, gy0 + 4 + i*7.3, 2], [fx, gy0 + 4 + i*7.3, 44]]), open ? [] : [[[fx, gy0 + 2, 40], [fx, gy1 - 2, 40]]]), '#3f5d9a', 1.4) });
      // the flag
      const px = x1 + 30, py = y0 + 28, ph = 196;
      let fl = bars([[[px, py, 0], [px, py, ph]]], '#e9e4d8', 2.2) + ball([px, py, ph + 3], 3, PAL.gold, .7);
      if (vis([1,0,0]) || true){ const pl = PX(px), wv = (u) => 5*Math.sin(u/16*Math.PI);
        const top = [], bot = []; for (let k = 0; k <= 6; k++){ const u = k*9; top.push([py - 2 - u, ph - 4 + wv(u)]); bot.push([py - 2 - u, ph - 38 + wv(u)]); }
        const mid = top.map(([u, v], k) => [u, (v + bot[k][1])/2]);
        fl += shape(on(pl, top.concat(mid.slice().reverse())), '#5cae6a', 0) + shape(on(pl, mid.concat(bot.slice().reverse())), '#f2c230', 0) + ink(pd(on(pl, top.concat(bot.slice().reverse()))), .9); }
      add({ box: [[px - 3, py - 60, 0], [px + 3, py + 3, ph + 6]], svg: fl });
    }

    // ---- neighbour 1 (house row, right): yellow, slate roof, front hedge
    { const h = G.n1, { x0, x1, y0, y1 } = h, zw = 226, yc = (y0 + y1)/2;
      let deco = wins('x', x1, 1, [[y0 + 18, y0 + 58, 130, 190], [y1 - 58, y1 - 18, 130, 190], [y0 + 18, y0 + 58, 30, 90]], litBy(5, .7)) + wins('y', y1, 1, [[x0 + 30, x0 + 70, 130, 190], [x1 - 64, x1 - 24, 40, 100]], litBy(6, .5));
      deco += door('x', x1, 1, y1 - 60, y1 - 18, 100, '#3f9c92');
      add({ box: [[x0, y0, 0], [x1, y1, zw + 78]], svg: pitched({ x0, y0, x1, y1, zw, hr: 78, ridge: 'y', wall: '#f1dca6', roof: '#7d8fa9', snow: o.snow, decor: deco,
        chimney: [x0 + 30, chim(x0 + 30, y0 + 40, zw + 20, 76, '#c9694c', o.snow)] }) }, { id: 'neighbour1' });
      winGlow.push([x1, yc, 160]);
      add(hedge(L.x1 - 16, y0 - 10, L.x1 - 2, yc + 30, 30, o)); add(hedge(L.x1 - 16, y1 - 10, L.x1 - 2, y1 + 40, 30, o));
    }

    // ---- the corner shop: on the lane, behind the yard, its front (+y) toward the lane: awning, sign, fruit crates
    { const s = G.shop, { x0, x1, y0, y1 } = s, zw = 132, xm = (x0 + x1)/2;
      const wm = mo('#f6ecd5');
      let deco = '';
      if (vis([0,1,0])){
        const pl = PY(y1 + .5), pl2 = PY(y1 + .7);
        deco += shape(on(pl, rectUV(x0 + 12, 26, xm + 6, 92)), night ? PAL.lit : PAL.glass, .9);
        // goods on the shelves behind the glass
        let gd = ''; ['#e8574a', '#f2c230', '#5cae6a', '#5b8fd6'].forEach((c, i) => { for (let k = 0; k < 3; k++) gd += pd(on(PY(y1 + .6), rectUV(x0 + 18 + k*19 + (i % 2)*5, 36 + i*14, x0 + 29 + k*19 + (i % 2)*5, 44 + i*14))); });
        deco += fill(gd, '#ef8a3c') + ink(pd(on(pl2, [[(x0 + xm)/2 + 9, 26], [(x0 + xm)/2 + 9, 92]]), false), .8);
        // sign board with an apple
        deco += shape(on(pl, rectUV(x0 + 8, 104, x1 - 8, 128)), '#4f9e5e', .9);
        const ax = xm, az = 116;
        deco += shape(on(PY(y1 + .8), ellUV(ax, az, 8, 7.5, 14)), '#e8574a', .8) + shape(on(PY(y1 + .9), [[ax, az + 6], [ax + 6, az + 12], [ax + 1, az + 10]]), '#9fd07a', .6) +
          ink(pd(on(PY(y1 + .9), [[ax, az + 5], [ax - 1, az + 10]]), false), 1);
      }
      deco += door('y', y1, 1, xm + 16, xm + 54, 96, '#5cae6a');
      deco += wins('x', x1, 1, [[y0 + 24, y0 + 70, 40, 96]], litBy(7, .9));
      const roofM = o.snow ? SNOWM : mo('#e9dcc0');
      add({ box: [[x0, y0, 0], [x1, y1, zw + 10]], svg: bx(x0, y0, 0, x1, y1, zw, wm, .9) + deco + bx(x0 - 3, y0 - 3, zw, x1 + 3, y1 + 3, zw + 10, roofM, .9) +
        hullInk([[x0, y0, 0], [x1, y0, 0], [x0, y1, 0], [x1, y1, 0], [x0 - 3, y0 - 3, zw + 10], [x1 + 3, y1 + 3, zw + 10], [x0 - 3, y1 + 3, zw + 10], [x1 + 3, y0 - 3, zw + 10]], 1.6) }, { id: 'shop' });
      // the striped awning, out over the pavement
      { const za = 100, dA = 28, dz = 16, n = 8, w = (x1 - x0 - 16)/n, a0 = x0 + 8;
        let red = '', wht = '', vr = '', vw = '';
        for (let k = 0; k < n; k++){ const xa = a0 + k*w, xb = xa + w;
          const q = pd([[xa, y1, za], [xb, y1, za], [xb, y1 + dA, za - dz], [xa, y1 + dA, za - dz]]);
          const v = pd(on(PY(y1 + dA), [[xa, za - dz], [xb, za - dz], ...arcUV(xa + w/2, za - dz - 6, w/2, 0, -180, 5)]));
          if (k % 2){ wht += q; vw += v; } else { red += q; vr += v; } }
        const nA = norm([0, dz, dA]);
        let aw = (vis(nA) ? fill(red, o.snow ? '#ffffff' : '#e8574a') + fill(wht, '#fbf6ea') : '') + (vis([0,1,0]) ? fill(vr, '#d14b3f') + fill(vw, '#ece4d2') : '');
        aw += ink(pd([[a0, y1, za], [a0, y1 + dA, za - dz], [a0 + n*w, y1 + dA, za - dz], [a0 + n*w, y1, za]], false), 1);
        add({ box: [[x0 + 8, y1, za - dz - 12], [x1 - 8, y1 + dA, za]], svg: aw });
      }
      // fruit crates on the pavement in front
      ['#e8574a', '#ef8a3c', '#9fd07a'].forEach((c, i) => { const cx = x0 + 22 + i*30, cy = y1 + 14, z1 = 16 + (i === 1 ? 6 : 0);
        let cr = bx(cx - 13, cy - 11, 0, cx + 13, cy + 11, z1, PAL.woodL, .8) + ink(pd(on(PY(cy + 11.5), [[cx - 13, z1*.5], [cx + 13, z1*.5]]), false), .5);
        let d = ''; for (let a = 0; a < 6; a++){ const q = P(cx - 8 + Math.floor(a/2)*8, cy - 5 + (a % 2)*10, z1 + 3); d += `M${f(q[0] - 4.2)} ${f(q[1])}a4.2 3.6 0 1 0 8.4 0a4.2 3.6 0 1 0 -8.4 0`; }
        cr += `<path d="${d}" fill="${c}" stroke="${INK}" stroke-width=".6"/>`;
        add({ box: [[cx - 13, cy - 11, 0], [cx + 13, cy + 11, z1 + 6]], svg: cr }); });
      winGlow.push([xm, y1, 60]);
    }

    // ---- neighbour 2 (on the lane, past the shop): sage walls, gable to the lane
    { const h = G.n2, { x0, x1, y0, y1 } = h, zw = 226, xc = (x0 + x1)/2;
      let deco = wins('y', y1, 1, [[x0 + 16, x0 + 56, 130, 190], [x1 - 56, x1 - 16, 130, 190], [x0 + 16, x0 + 56, 30, 90], [xc - 14, xc + 14, 250, 280]], litBy(9, .6)) +
        wins('x', x1, 1, [[y0 + 26, y0 + 66, 130, 190], [y0 + 26, y0 + 66, 30, 90]], litBy(10, .5));
      deco += door('y', y1, 1, x1 - 58, x1 - 18, 100, '#e8574a');
      add({ box: [[x0, y0, 0], [x1, y1, zw + 80]], svg: pitched({ x0, y0, x1, y1, zw, hr: 80, ridge: 'y', wall: '#cfe3cf', roof: '#c97452', snow: o.snow, decor: deco,
        chimney: [x0 + 30, chim(x0 + 34, y0 + 40, zw + 20, 70, '#b5785a', o.snow)] }) }, { id: 'neighbour2' });
      winGlow.push([xc, y1, 160]);
      add(hedge(x0 - 10, y1 + 22, xc - 20, y1 + 36, 28, o));
    }

    // ---- across the green: neighbour 3, a bungalow (its back garden toward us, with a washing line)
    { const h = G.n3, { x0, x1, y0, y1 } = h, zw = 138, yc = (y0 + y1)/2;
      let deco = wins('x', x1, 1, [[y0 + 20, y0 + 64, 34, 96], [y1 - 64, y1 - 20, 34, 96]], litBy(11, .8)) + wins('y', y1, 1, [[x0 + 30, x0 + 74, 34, 96], [x1 - 74, x1 - 30, 34, 96]], litBy(12, .6));
      deco += door('x', x1, 1, yc - 18, yc + 18, 98, '#9a6bb8');
      add({ box: [[x0, y0, 0], [x1, y1, zw + 66]], svg: pitched({ x0, y0, x1, y1, zw, hr: 66, ridge: 'y', wall: '#f1cdc3', roof: '#8f7aa3', snow: o.snow, decor: deco }) }, { id: 'neighbour3' });
      winGlow.push([x1, yc, 70]);
      if (o.weather !== 'rain' && o.weather !== 'snow'){
        const lx = x1 + 46, la = y0 + 30, lb = y1 - 30, hz = 92;
        let wl = bars([[[lx, la, 0], [lx, la, hz]], [[lx, lb, 0], [lx, lb, hz]]], '#e9e4d8', 2) + `<path d="${pd([[lx, la, hz - 3], [lx, (la + lb)/2, hz - 12], [lx, lb, hz - 3]], false)}" fill="none" stroke="${INK}" stroke-width=".8"/>`;
        [['#5b8fd6', .25], ['#f2c230', .45], ['#e98fb0', .68]].forEach(([c, u]) => { const y = la + (lb - la)*u, z = hz - 3 - 9*Math.sin(u*Math.PI);
          wl += shape([[lx, y - 10, z], [lx, y + 10, z], [lx, y + 8, z - 26], [lx, y - 8, z - 26]], c, .7); });
        add({ box: [[lx - 2, la, 0], [lx + 2, lb, hz]], svg: wl });
      }
      add(hedge(G.PB[1] + 30, y0 - 20, G.PB[1] + 44, yc - 20, 26, o)); add(hedge(G.PB[1] + 30, yc + 20, G.PB[1] + 44, y1 + 10, 26, o));
    }

    // ---- the mosque: white walls, green dome on a drum, a minaret with a balcony, crescent finials
    { const m = G.mosque, { x0, x1, y0, y1 } = m, H = 124, cx = (x0 + x1)/2, cy = (y0 + y1)/2, wm = mo('#f5eedd'), tm = mo('#3f9c86');
      const dm = o.snow ? SNOWM : mo('#5aae8c');
      const mLit = night;
      let s = bx(x0, y0, 0, x1, y1, H, wm, .9);
      s += wins('x', x1, 1, [[y0 + 24, y0 + 60, 36, 100, 1], [cy - 18, cy + 18, 36, 100, 1], [y1 - 60, y1 - 24, 36, 100, 1]], () => mLit, { glass: '#bfe0d6', litCol: '#ffe08a' });
      s += wins('y', y1, 1, [[x0 + 22, x0 + 54, 36, 100, 1], [x1 - 54, x1 - 22, 36, 100, 1]], () => mLit, { glass: '#bfe0d6', litCol: '#ffe08a' });
      s += door('y', y1, 1, cx - 24, cx + 24, 108, '#3f9c86', true);
      if (vis([0,1,0])) s += ink(pd(on(PY(y1 + .6), archUV(cx - 30, cx + 30, 0, 116))), 1.2).replace(INK, '#2f7a68');
      // a band and a little crenellated parapet
      s += bx(x0 - 3, y0 - 3, H, x1 + 3, y1 + 3, H + 10, tm, .9);
      let cr = '', ca = '';
      if (vis([1,0,0])) for (let k = 0; k < 9; k++){ const y = y0 + 6 + k*((y1 - y0 - 12)/8); ca += pd([[x1 + 3, y - 4, H + 10], [x1 + 3, y + 4, H + 10], [x1 + 3, y + 4, H + 18], [x1 + 3, y - 4, H + 18]]); }
      if (vis([0,1,0])) for (let k = 1; k < 6; k++){ const x = x0 + k*((x1 - x0)/6); ca += pd([[x - 4, y1 + 3, H + 10], [x + 4, y1 + 3, H + 10], [x + 4, y1 + 3, H + 18], [x - 4, y1 + 3, H + 18]]); }
      cr = `<path d="${ca}" fill="${wm.l}" stroke="${INK}" stroke-width=".6" stroke-linejoin="round"/>`;
      // drum and dome
      const R = 52, zd = H + 10;
      let dome = lathe(cx, cy, [[zd, R*.82], [zd + 20, R*.82]], wm, { n: 20, w: .8 });
      dome += lathe(cx, cy, [[zd + 20, R*.9], [zd + 20 + R*.42, R*.98], [zd + 20 + R*.8, R*.78], [zd + 20 + R*1.08, R*.42], [zd + 20 + R*1.24, 3]], dm, { n: 20, w: .9 });
      const zt = zd + 20 + R*1.24;
      dome += bars([[[cx, cy, zt], [cx, cy, zt + 16]]], PAL.gold, 1.6) + ball([cx, cy, zt + 7], 3.2, PAL.gold, .7) + crescent([cx, cy, zt + 24], 6.5);
      add({ box: [[x0 - 3, y0 - 3, 0], [x1 + 3, y1 + 3, zt + 30]], svg: s + cr + dome }, { id: 'mosque' });
      winGlow.push([x1, cy, 70], [cx, y1, 70]);
      // minaret beside the hall (right front corner)
      { const mx = x1 - 14, my = y1 + 26, r = 15, h1 = 200, h2 = 240;
        let mn = lathe(mx, my, [[0, r + 3], [14, r + 3]], wm, { n: 14, w: .8 }) + lathe(mx, my, [[14, r], [h1, r*.92]], wm, { n: 14, w: .9 });
        // two slit windows on the side toward the viewer
        const a = YAW*Math.PI/180, sx = mx + r*.95*Math.cos(a), sy = my + r*.95*Math.sin(a);
        mn += bars([[[sx, sy, 70], [sx, sy, 92]], [[sx, sy, 140], [sx, sy, 162]]], mLit ? '#ffe08a' : '#3f9c86', 2.4);
        mn += lathe(mx, my, [[h1, r + 7], [h1 + 8, r + 7]], tm, { top: true, n: 14, w: .8 });
        mn += lathe(mx, my, [[h1 + 8, r*.72], [h2, r*.72]], wm, { n: 12, w: .8 });
        mn += lathe(mx, my, [[h2, r*.95], [h2 + 10, r*.9], [h2 + 20, r*.55], [h2 + 27, 2]], dm, { n: 12, w: .8 });
        mn += bars([[[mx, my, h2 + 27], [mx, my, h2 + 38]]], PAL.gold, 1.4) + crescent([mx, my, h2 + 44], 5);
        add({ box: [[mx - r - 7, my - r - 7, 0], [mx + r + 7, my + r + 7, h2 + 50]], svg: mn }, { id: 'minaret' });
        glowAt.push([mx, my, 150]);
      }
      // the forecourt wall toward the green, with an arched gateway and a lantern
      const wx = x0 - 34, g0 = cy - 26, g1 = cy + 26;
      add({ box: [[wx - 4, y0 - 30, 0], [wx + 4, g0, 36]], svg: bx(wx - 4, y0 - 30, 0, wx + 4, g0, 30, wm, .8) + bx(wx - 5, y0 - 31, 30, wx + 5, g0, 35, tm, .7) });
      add({ box: [[wx - 4, g1, 0], [wx + 4, y1 + 20, 36]], svg: bx(wx - 4, g1, 0, wx + 4, y1 + 20, 30, wm, .8) + bx(wx - 5, g1, 30, wx + 5, y1 + 21, 35, tm, .7) });
      { let gt = bx(wx - 6, g0 - 10, 0, wx + 6, g0, 74, wm, .8) + bx(wx - 6, g1, 0, wx + 6, g1 + 10, 74, wm, .8);
        const pl = PX(wx + 6);
        if (vis([1,0,0])){ const out = [[g0 - 10, 74], ...arcUV(cy, 74, 36, 180, 0, 10).map(([u, v]) => [u, 74 + (v - 74)*.75]), [g1 + 10, 74], [g1 + 10, 92], [g0 - 10, 92]];
          gt += shape(on(pl, out), '#f5eedd', .9) + ink(pd(on(PX(wx + 6.3), arcUV(cy, 74, 28, 180, 0, 10).map(([u, v]) => [u, 74 + (v - 74)*.75])), false), .9).replace(INK, '#2f7a68'); }
        gt += bx(wx - 6, g0 - 12, 92, wx + 6, g1 + 12, 98, tm, .8) + ball([wx, cy, 104], 5, night ? '#ffe08a' : '#f2c230', .8);
        add({ box: [[wx - 6, g0 - 12, 0], [wx + 6, g1 + 12, 110]], svg: gt });
        glowAt.push([wx, cy, 104]); }
      // Jumu'ah: bicycles at the gate on Friday around midday
      if (t && t.getDay() === 5 && t.getHours() >= 11 && t.getHours() < 15){
        for (let k = 0; k < 3; k++){ const by = g1 + 30 + k*22, bxx = wx - 14, c = ['#e8574a', '#5b8fd6', '#5cae6a'][k];
          const W = (u) => pd(on(PX(bxx), ellUV(by + u, 9, 8, 8, 12)));
          const bk = `<path d="${W(-11) + W(11)}" fill="none" stroke="${INK}" stroke-width="1.6"/>` + bars([[[bxx, by - 11, 9], [bxx, by - 2, 22], [bxx, by + 8, 9]], [[bxx, by - 2, 22], [bxx, by + 9, 22], [bxx, by + 11, 9]]], c, 1.4);
          add({ box: [[bxx - 2, by - 20, 0], [bxx + 2, by + 20, 26]], svg: bk }); }
      }
    }

    // ---- the playground: swing, slide, sandpit, bench, low fence
    { const p = G.park, sx = p.x0 + 80, sy = p.y0 + 120;
      // swing: A-frames along y, two seats on chains
      const a = 46, h = 84, fr = [];
      for (const yy of [sy - a, sy + a]) fr.push([[sx - 26, yy, 0], [sx, yy, h], [sx + 26, yy, 0]]);
      fr.push([[sx, sy - a, h], [sx, sy + a, h]]);
      let sw = bars(fr, '#e8574a', 2.6), ch = '';
      for (const yy of [sy - 18, sy + 18]){ ch += pd([[sx, yy - 6, h], [sx, yy - 6, 26]], false) + pd([[sx, yy + 6, h], [sx, yy + 6, 26]], false); }
      sw = `<path d="${ch}" fill="none" stroke="${INK}" stroke-width=".8"/>` + sw;
      for (const yy of [sy - 18, sy + 18]) sw += bx(sx - 6, yy - 8, 22, sx + 6, yy + 8, 26, mo('#f2c230'), .7);
      add({ box: [[sx - 26, sy - a - 2, 0], [sx + 26, sy + a + 2, h + 2]], svg: sw }, { id: 'swing' });
      // slide: ladder at the back, platform, chute down toward +x
      const lx = p.x0 + 70, ly = p.y0 + 250, ph = 62, cw = 20;
      let sl = bars([[[lx - 14, ly - 12, 0], [lx - 2, ly - 12, ph + 26]], [[lx - 14, ly + 12, 0], [lx - 2, ly + 12, ph + 26]], ...Array.from({ length: 5 }, (_, i) => { const z = 10 + i*12, x = lx - 14 + 12*z/(ph + 26); return [[x, ly - 12, z], [x, ly + 12, z]]; })], '#5b8fd6', 2);
      sl += bx(lx - 2, ly - 14, ph - 4, lx + 22, ly + 14, ph, mo('#f2c230'), .8);
      const ch0 = [[lx + 22, ly - cw/2, ph], [lx + 22, ly + cw/2, ph], [lx + 98, ly + cw/2, 6], [lx + 98, ly - cw/2, 6]], cn = norm([ph - 6, 0, 76]);
      sl += quad(ch0, toneI(cn, mo('#5cae6a'))) + ink(pd(ch0), .9);
      sl += bars([[[lx + 22, ly - cw/2 - 1, ph + 10], [lx + 98, ly - cw/2 - 1, 14]], [[lx + 22, ly + cw/2 + 1, ph + 10], [lx + 98, ly + cw/2 + 1, 14]], [[lx + 22, ly - cw/2 - 1, ph], [lx + 22, ly - cw/2 - 1, ph + 10]], [[lx + 22, ly + cw/2 + 1, ph], [lx + 22, ly + cw/2 + 1, ph + 10]]], '#5cae6a', 1.8);
      sl += bars([[[lx + 20, ly - 12, 0], [lx + 20, ly - 12, ph]], [[lx + 20, ly + 12, 0], [lx + 20, ly + 12, ph]]], '#5b8fd6', 2);
      add({ box: [[lx - 14, ly - cw/2 - 4, 0], [lx + 98, ly + cw/2 + 4, ph + 26]], svg: sl }, { id: 'slide' });
      // sandpit
      const qx = p.x0 + 250, qy = p.y0 + 90;
      add({ box: [[qx - 40, qy - 40, 0], [qx + 40, qy + 40, 10]], svg: bx(qx - 40, qy - 40, 0, qx + 40, qy + 40, 9, PAL.woodL, .8) + fill(pd(on(PZ(9.2), rectUV(qx - 34, qy - 34, qx + 34, qy + 34))), o.snow ? '#ffffff' : '#f1dca0') +
        bx(qx + 6, qy + 8, 9, qx + 18, qy + 20, 16, mo('#e8574a'), .6) });
      add(bench(p.x1 - 40, p.y0 + 200, 0));
      add({ box: [[p.x0 - 2, p.y0 - 2, 0], [p.x0 + 2, p.y1 + 2, 30]], svg: railing([p.x0, p.y0 + 30], [p.x0, p.y1 - 30], 28, 24, '#4d6b62') });
    }

    // ---- benches by the pond, trees, lamps
    const pn = G.pond;
    add(bench(pn.cx + pn.rx + 34, pn.cy - 60, 0));
    add(bench(pn.cx + pn.rx + 34, pn.cy + 70, 0));
    const T = [
      // across: the green's back edge, the playground, one far out for the turn
      [G.XA + 196, L.y0 + 20, 170], [G.XA + 196, L.y0 + 250, 160], [G.park.x0 + 30, G.park.y1 - 30, 180], [G.park.x1 - 40, G.park.y1 - 50, 200],
      [G.n3.x1 + 120, G.n3.y0 + 20, 210],
      // pavements, outside the lot's view
      [G.PB[0] + 16, L.y0 - 160, 170], [G.PB[0] + 16, L.y1 + 540, 180], [G.PA[0] + 16, L.y0 - 330, 170], [G.PA[0] + 16, L.y1 + 380, 170],
    ];
    T.forEach(([x, y, h], i) => add(tree(x, y, h, i, o)));
    [[L.x0 - 340, L.y0 + 120, 220], [L.x0 - 300, L.y1 - 330, 200], [L.x0 - 400, L.y1 + 170, 230], [L.x0 - 200, L.y0 - 420, 240]].forEach(([x, y, h]) => add(conifer(x, y, h, o)));
    const LP = [[G.PB[0] + 16, L.y0 - 260], [G.PB[0] + 16, L.y1 + 420], [G.PA[0] + 14, L.y0 - 170], [G.PA[0] + 14, L.y1 + 330], [G.park.x1 - 20, G.park.y0 + 150], [L.x0 - 22, G.lane[0] - 13]];
    LP.forEach(([x, y]) => add(lamp(x, y, (x < G.PB[1] && x > L.x1) || y > G.lane[0] - 30 && y < G.lane[0] ? 4 : 0, o, glowAt)));

    // ---- the hills behind: low rolling domes on the board's back strip (they hide its back edges), paler with distance
    { const [[bx0, by0]] = G.board, sky = (light.sky || '#bfe0f2');
      const HL_ = [];
      for (let k = 0; k < 4; k++) HL_.push([bx0 - 60 + 50*rnd(k, 31), L.y1 + 420 - k*420, 270 + 60*rnd(k, 32), 90 + 60*rnd(k, 33), .14 + .08*rnd(k, 34)]);
      for (let k = 0; k < 3; k++) HL_.push([bx0 + 420 + k*430, by0 - 60 + 50*rnd(k, 35), 270 + 60*rnd(k, 36), 90 + 60*rnd(k, 37), .14 + .08*rnd(k, 38)]);
      HL_.push([bx0 + 20, by0 + 20, 340, 170, .24]);
      HL_.forEach(([x, y, r, h, k], i) => { const col = mix(o.snow ? '#eef2f5' : '#a8cf86', sky, k);
        let s = lathe(x, y, [[0, r], [h*.5, r*.74], [h*.9, r*.28], [h, 2]], mo(col), { n: 12, w: 1 });
        if (!o.snow && i % 3 === 0){ let d = ''; for (let k2 = 0; k2 < 4; k2++){ const a = (YAW + (k2 - 1.5)*22)*Math.PI/180, rr = r*(.35 + .3*rnd(i, k2)), zz = h*(1 - Math.pow(rr/r, 1.6))*.95;
          const q = P(x + rr*Math.cos(a), y + rr*Math.sin(a), zz); d += `M${f(q[0] - 3.5)} ${f(q[1])}a3.5 5 0 1 0 7 0a3.5 5 0 1 0 -7 0`; }
          s += `<path d="${d}" fill="${mix('#5f9a68', sky, k)}" stroke="${INK}" stroke-width=".6"/>`; }
        items.push({ box: [[x - r, y - r, 0], [x + r, y + r, h]], at: [x, y, h/2], svg: s, side: 'back', kind: 'hill' }); });
    }

    // places to tap
    const m = G.mosque, p = G.park, sc = G.school, sh = G.shop;
    PLACES = [
      { id: 'mosque', at: [(m.x0 + m.x1)/2, (m.y0 + m.y1)/2, 190], label: 'Mosque', icon: ICON.mosque },
      { id: 'park', at: [p.x0 + 80, p.y0 + 120, 50], label: 'Park', icon: ICON.park },
      { id: 'pond', at: [G.pond.cx, G.pond.cy, 4], label: 'Duck pond', icon: ICON.duck },
      { id: 'shop', at: [sh.x1 + 10, (sh.y0 + sh.y1)/2, 100], label: 'Shop', icon: ICON.shop },
      { id: 'school', at: [sc.x1, (sc.y0 + sc.y1)/2, 110], label: 'School', icon: ICON.school },
      { id: 'neighbour1', at: [G.n1.x1, G.n1.y1 - 38, 60], label: 'Neighbour', icon: ICON.house },
      { id: 'neighbour2', at: [G.n2.x1, G.n2.y1 - 36, 60], label: 'Neighbour', icon: ICON.house },
      { id: 'neighbour3', at: [G.n3.x1, (G.n3.y0 + G.n3.y1)/2, 60], label: 'Neighbour', icon: ICON.house },
    ];
    return { items, glowAt, winGlow, G };
  }

  /* ---------- the night glow (for the screen-blend light layer) ---------- */
  function glow(o){
    const c = norm0(o), light = c.light, lamps = light.lamps != null ? light.lamps : (light.night ? 1 : 0);
    if (lamps < .3) return '';
    const r = build(o); let defs = `<radialGradient id="hsg"><stop offset="0" stop-color="#ffcf7a" stop-opacity="${(.75*lamps).toFixed(2)}"/><stop offset=".5" stop-color="#ffb84d" stop-opacity="${(.25*lamps).toFixed(2)}"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>`;
    let s = '';
    for (const p of r.glowAt){ const q = P(...p); s += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="46" fill="url(#hsg)"/>`; }
    if (lamps > .5) for (const p of r.winGlow){ const q = P(...p); s += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="70" fill="url(#hsg)" opacity=".55"/>`; }
    return `<defs>${defs}</defs>` + s;
  }

  /* ---------- the sky (screen space, w x h): gradient by the time of day, the sun or moon on its arc, clouds ---------- */
  const SKYPH = {
    night:  ['#141b44', '#26305e', '#3d4882'],
    dawn:   ['#7d8cc6', '#f0b9ab', '#ffdcb0'],
    day:    ['#86c4ea', '#bfe0f2', '#e6f4f6'],
    golden: ['#93bfe2', '#f6cf8e', '#fbe4b4'],
    dusk:   ['#464a8a', '#c58ba5', '#f1b48c'],
  };
  const blend3 = (A, B, k) => A.map((c, i) => mix(c, B[i], Math.max(0, Math.min(1, k))));
  function toDate(t){ if (t instanceof Date) return t; const d = new Date(); if (typeof t === 'string' && /^\d{1,2}(:\d{2})?$/.test(t)){ const [h, m] = t.split(':').map(Number); d.setHours(h, m || 0, 0, 0); } return d; }
  function timesOf(d, o){
    if (o.times) return o.times;
    try { if (window.HL && HL.times) return HL.times(d); } catch (e) {}
    const at = (h, m, dd = 0) => { const x = new Date(d); x.setDate(x.getDate() + dd); x.setHours(h, m, 0, 0); return x; };
    return { fajr: at(5, 30), sunrise: at(6, 50), dhuhr: at(12, 30), asr: at(15, 45), maghrib: at(18, 15), isha: at(19, 45), nextFajr: at(5, 30, 1) };
  }
  // the same phases as HL.light, so the sky matches the house's light
  function phase(d, T){
    const ms = d.getTime(), M = 60000, span = (a, b) => (ms - a)/Math.max(1, b - a), sr = T.sunrise.getTime(), mg = T.maghrib.getTime();
    if (ms < T.fajr.getTime()) return { c: SKYPH.night, dark: 1 };
    if (ms < sr){ const k = span(T.fajr.getTime(), sr); return { c: blend3(SKYPH.night, SKYPH.dawn, k), dark: 1 - k }; }
    if (ms < sr + 50*M) return { c: blend3(SKYPH.dawn, SKYPH.day, span(sr, sr + 50*M)), dark: 0 };
    if (ms < T.asr.getTime()) return { c: SKYPH.day, dark: 0 };
    if (ms < mg - 45*M) return { c: blend3(SKYPH.day, SKYPH.golden, span(T.asr.getTime(), mg - 45*M)), dark: 0 };
    if (ms < mg) return { c: blend3(SKYPH.golden, SKYPH.dusk, span(mg - 45*M, mg)), dark: 0 };
    if (ms < T.isha.getTime()){ const k = span(mg, T.isha.getTime()); return { c: blend3(SKYPH.dusk, SKYPH.night, k), dark: k }; }
    return { c: SKYPH.night, dark: 1 };
  }
  // the moon's age in days (0 = new), from a known new moon; good to about half a day
  const moonAge = d => { const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14); return (((d.getTime() - ref)/864e5) % syn + syn) % syn; };

  const CSS = `
  .hs-sky,.hs-wx{position:absolute;inset:0;overflow:hidden;pointer-events:none}
  .hs-sky>svg,.hs-wx>div,.hs-wx>div>div{position:absolute;left:0;top:0;display:block;will-change:transform}
  .hs-cl{animation:hsDrift linear infinite}
  @keyframes hsDrift{from{transform:translate3d(var(--x0),0,0)}to{transform:translate3d(var(--x1),0,0)}}
  .hs-tw{animation:hsTw 3.2s ease-in-out infinite alternate}
  @keyframes hsTw{from{opacity:.35}to{opacity:1}}
  .hs-fall{animation:hsFall linear infinite}
  @keyframes hsFall{from{transform:translate3d(0,var(--y0),0)}to{transform:translate3d(var(--dx),0,0)}}
  .hs-sway{animation:hsSway 4s ease-in-out infinite alternate}
  @keyframes hsSway{from{transform:translate3d(-10px,0,0)}to{transform:translate3d(10px,0,0)}}
  @media (prefers-reduced-motion:reduce){.hs-cl,.hs-tw,.hs-fall,.hs-sway{animation:none}}`;
  const STYLE = `<style>${CSS}</style>`;

  function cloudPath(w, h, k){
    // a flat-bottomed hand-inked cumulus, w wide; k varies the bumps
    const b = h, r1 = w*.18, r2 = w*(.22 + .06*k), r3 = w*.16;
    return `M${f(w*.06)} ${f(b)}A${f(r1)} ${f(r1)} 0 0 1 ${f(w*.28)} ${f(b - r1*1.05)}A${f(r2)} ${f(r2)} 0 0 1 ${f(w*.66)} ${f(b - r2*1.15)}A${f(r3)} ${f(r3)} 0 0 1 ${f(w*.94)} ${f(b)}Z`;
  }
  function sky(o){
    o = o || {};
    const w = Math.round(o.w || 390), h = Math.round(o.h || 844), d = toDate(o.t || o.now), T = timesOf(d, o), wx = o.weather || (o.kind && o.kind.weather) || 'sun';
    const ph = phase(d, T); let c = ph.c.slice();
    if (o.light && o.light.sky) c[1] = mix(c[1], o.light.sky, .5);
    const grey = { cloud: ['#b9c2cc', .3], rain: ['#8f99a6', .55], snow: ['#d6dde5', .45] }[wx];
    if (grey) c = c.map((x, i) => mix(x, ph.dark > .5 ? mix(grey[0], '#202848', .7) : grey[0], grey[1]*(i === 0 ? 1 : .8)));
    const hz = o.horizon != null ? o.horizon : h*.55, top = h*.1;
    // the house multiplies its whole stack by the day's light (MUL layer); a sky inside that stack is pre-divided by
    // that tint so it ends up looking as drawn. Pass tinted:false for a sky that sits outside the light layer.
    const lt = o.light && o.light.tint && o.light.a && o.tinted !== false ? mix('#ffffff', o.light.tint, o.light.a) : null;
    const un = col => { if (!lt) return col; return '#' + [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(col.substr(i, 2), 16)/Math.max(.2, parseInt(lt.substr(i, 2), 16)/255))).toString(16).padStart(2, '0')).join(''); };
    let s = `<defs><linearGradient id="hsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${un(c[0])}"/><stop offset="${(hz/h*.62).toFixed(3)}" stop-color="${un(c[1])}"/><stop offset="${(hz/h).toFixed(3)}" stop-color="${un(c[2])}"/><stop offset="1" stop-color="${un(c[2])}"/></linearGradient>` +
      `<radialGradient id="hsSun"><stop offset="0" stop-color="#fff6cf" stop-opacity=".9"/><stop offset="1" stop-color="#fff6cf" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="${w}" height="${h}" fill="url(#hsSky)"/>`;
    const ms = d.getTime(), sr = T.sunrise.getTime(), mg = T.maghrib.getTime();
    const arc = u => [w*(.08 + .84*u), hz - (hz - top)*Math.sin(Math.PI*Math.max(0, Math.min(1, u)))];
    let layers = '';
    const clear = wx === 'sun' || wx === 'cloud';
    if (ms >= sr - 20*60000 && ms <= mg + 20*60000){
      const [x, y] = arc((ms - sr)/(mg - sr)), R = Math.max(16, w*.055);
      if (clear) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R*2.6)}" fill="url(#hsSun)"/>`;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="${wx === 'sun' ? '#f7c63d' : mix('#f7c63d', c[1], .45)}" stroke="#231e16" stroke-width="1.8"/>`;
      if (wx === 'sun'){ let ry = ''; for (let k = 0; k < 10; k++){ const a = k/10*2*Math.PI; ry += `M${f(x + Math.cos(a)*R*1.35)} ${f(y + Math.sin(a)*R*1.35)}L${f(x + Math.cos(a)*R*1.7)} ${f(y + Math.sin(a)*R*1.7)}`; }
        s += `<path d="${ry}" stroke="#f2b829" stroke-width="2.4" stroke-linecap="round"/>`; }
    } else {
      // night: the moon from maghrib to the next sunrise, in its real phase; stars
      // the night runs from maghrib to the next sunrise (before dawn: from yesterday's maghrib)
      const st2 = ms < sr ? timesOf(new Date(ms - 864e5), {}).maghrib.getTime() : mg, en = ms < sr ? sr : sr + 864e5;
      const [x, y] = arc((ms - st2)/Math.max(1, en - st2)), R = Math.max(13, w*.042), age = moonAge(d);
      const lit = (1 - Math.cos(age/29.53*2*Math.PI))/2, f2 = Math.max(.16, lit), wax = age < 14.77;
      const off = 2*R*f2*(wax ? -1 : 1);
      if (clear) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R*2.4)}" fill="url(#hsSun)" opacity=".5"/>`;
      s += `<clipPath id="hsMoon"><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}"/></clipPath><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="${un('#fff3c4')}"/>`;
      if (lit < .97) s += `<circle cx="${f(x + off)}" cy="${f(y - R*.08)}" r="${f(R*1.02)}" fill="${un(c[0])}" opacity=".93" clip-path="url(#hsMoon)"/>`;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="none" stroke="#231e16" stroke-width="1.6"/>`;
      if (ph.dark > .3 && wx !== 'rain'){
        // most stars sit in the still sky; a third twinkle in one layer only as tall as the sky (one GPU layer)
        const n = wx === 'sun' ? 3 : 1, sh = Math.round(hz);
        for (let g = 0; g < 2; g++){ let dd = '';
          for (let i = 0; i < 18*n; i++){ const sx = rnd(i, g + 20)*w, sy = rnd(i, g + 40)*hz*.92, r = .8 + rnd(i, g + 60)*1.6;
            if (Math.hypot(sx - x, sy - y) < R*3) continue;
            dd += `M${f(sx)} ${f(sy - r*2)}L${f(sx + r*.5)} ${f(sy - r*.5)}L${f(sx + r*2)} ${f(sy)}L${f(sx + r*.5)} ${f(sy + r*.5)}L${f(sx)} ${f(sy + r*2)}L${f(sx - r*.5)} ${f(sy + r*.5)}L${f(sx - r*2)} ${f(sy)}L${f(sx - r*.5)} ${f(sy - r*.5)}Z`; }
          const star = `<path d="${dd}" fill="${un('#fff3c4')}" opacity="${(.4 + .6*ph.dark).toFixed(2)}"/>`;
          if (g === 0) s += star;
          else layers += `<svg class="hs-tw" width="${w}" height="${sh}" viewBox="0 0 ${w} ${sh}">${star}</svg>`; }
      }
    }
    // clouds: each its own small svg, drifting across (compositor-only transform)
    const nC = { sun: 3, cloud: 6, rain: 7, snow: 6 }[wx] || 3;
    const cCol = mix(wx === 'rain' ? mix('#c3cad3', c[0], .25) : wx === 'snow' ? '#f3f5f8' : '#fbf8f0', c[0], .55*Math.max(0, Math.min(1, ph.dark*1.4)));
    const cSh = un(mix(cCol, '#8794a8', .28)), cC = un(cCol);
    for (let i = 0; i < nC; i++){
      const cw = Math.round(w*(.28 + .2*rnd(i, 3))*(wx === 'sun' ? .8 : 1)), ch = Math.round(cw*.42), y = Math.round(top*.4 + rnd(i, 4)*(hz*.62 - top*.4)), dur = Math.round(90 + rnd(i, 5)*80);
      const pth = cloudPath(cw, ch, rnd(i, 6));
      layers += `<svg class="hs-cl" width="${cw}" height="${ch + 4}" viewBox="0 -2 ${cw} ${ch + 4}" style="top:${y}px;--x0:${-cw - 10}px;--x1:${w + 10}px;animation-duration:${dur}s;animation-delay:${-Math.round(rnd(i, 7)*dur)}s">` +
        `<path d="${pth}" fill="${cC}"/><path d="M${f(cw*.1)} ${f(ch - 2)}Q${f(cw*.5)} ${f(ch - ch*.32)} ${f(cw*.9)} ${f(ch - 2)}Z" fill="${cSh}"/><path d="${pth}" fill="none" stroke="#231e16" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    }
    return STYLE + `<div class="hs-sky"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${s}</svg>${layers}</div>`;
  }
  // rain or snow in front of everything (pointer-events none). One layer, a little taller than the screen, painted
  // with a repeating tile and moved by one tile height (a compositor-only transform): one GPU layer whatever the size.
  function weather(o){
    o = o || {}; const w = Math.round(o.w || 390), h = Math.round(o.h || 844), wx = o.weather || (o.kind && o.kind.weather) || 'sun';
    if (wx !== 'rain' && wx !== 'snow') return '';
    const T = 240, TW = 240, url = svg => `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
    let d = '', tile;
    if (wx === 'rain'){
      for (let i = 0; i < 26; i++){ const x = rnd(i, 80)*TW, y = rnd(i, 90)*T, l = 12 + 10*rnd(i, 91);
        for (const dx of [0, -TW, TW]) for (const dy of [0, -T, T]) d += `M${f(x + dx)} ${f(y + dy)}l${f(-l*.22)} ${f(l)}`; }
      tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${T}"><path d="${d}" stroke="#6f8fb8" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".75"/></svg>`;
      return STYLE + `<div class="hs-wx"><div class="hs-fall" style="left:-${Math.round(T*.22)}px;width:${w + Math.round(T*.22)}px;height:${h + T}px;--y0:${-T}px;--dx:${-Math.round(T*.22)}px;animation-duration:.55s;background:${url(tile)}"></div></div>`;
    }
    for (let i = 0; i < 16; i++){ const x = rnd(i, 70)*TW, y = rnd(i, 75)*T, r = 1.4 + 1.8*rnd(i, 79);
      for (const dx of [0, -TW, TW]) for (const dy of [0, -T, T]) d += `M${f(x + dx - r)} ${f(y + dy)}a${f(r)} ${f(r)} 0 1 0 ${f(2*r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2*r)} 0`; }
    tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${T}"><path d="${d}" fill="#ffffff" stroke="#9fb0c6" stroke-width=".7"/></svg>`;
    return STYLE + `<div class="hs-wx"><div class="hs-sway" style="left:-12px;width:${w + 24}px;height:${h}px"><div class="hs-fall" style="width:${w + 24}px;height:${h + T}px;--y0:${-T}px;--dx:0px;animation-duration:7s;background:${url(tile)}"></div></div></div>`;
  }

  /* ---------- icons for the places (24x24, the HUD's style) ---------- */
  const SV = b => `<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
  const ICON = {
    mosque: SV('<path d="M5 21V12h14v9z" fill="#f5eedd"/><path d="M7.5 12a4.5 4.5 0 0 1 9 0z" fill="#5aae8c"/><path d="M12 7.5V5.5"/><path d="M2.5 21V9.5h2.5V21" fill="#f5eedd"/><path d="M10 21v-4a2 2 0 0 1 4 0v4" fill="#3f9c86"/><path d="M2 21h20"/>'),
    park: SV('<path d="M4 20 8 6l4 14M8 6h10M15 20l3-14 3 14" /><path d="M11 6v8M16 6v8"/><path d="M9.5 14h3" stroke="#f2c230" stroke-width="2.6"/>'),
    duck: SV('<path d="M4 14c0 3 3 5 8 5s8-2 8-5c-2 1-5 1-7-1 1-2 1-5-2-6-3 0-4 3-3 5-2 1-3 1-4 2z" fill="#fbf6ea"/><path d="M8 8l-3 .8L8 10" fill="#ef8a3c"/>'),
    shop: SV('<path d="M4 10v10h16V10" fill="#f6ecd5"/><path d="M3 5h18l1 5H2z" fill="#e8574a"/><path d="M9 20v-6h6v6" fill="#cfe2ea"/>'),
    school: SV('<path d="M4 21V10l8-5 8 5v11z" fill="#e6a888"/><path d="M10 21v-5h4v5" fill="#5b8fd6"/><circle cx="12" cy="11" r="2" fill="#fbf6ea"/><path d="M12 5V2h4v2h-4" fill="#5cae6a"/>'),
    house: SV('<path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5" fill="#f1dca6"/><path d="M10 20v-5h4v5" fill="#3f9c92"/>'),
  };

  /* ---------- the API ---------- */
  let PLACES = [];
  function items(o){ return build(o || {}).items; }
  // everything in one string: ground, then the street and the house sorted together (house = one part with the lot's box)
  function draw(o, houseSvg){
    const r = build(o || {}), L = r.G.L, g = r.items.filter(i => i.ground), rest = r.items.filter(i => !i.ground);
    const back = rest.filter(i => i.side === 'back'), front = rest.filter(i => i.side !== 'back');
    return g.map(i => i.svg).join('') + byDepth(back) + (houseSvg || '') + byDepth(front);
  }
  function bounds(lot){ const G = layout(lot); return [[G.board[0][0], G.board[0][1], 0], [G.board[1][0], G.board[1][1], 300]]; }
  build({});
  window.HStreet = {
    items, draw, glow, sky, weather, bounds, layout, CSS,
    get places(){ return PLACES; },
    placesFor(lot){ build({ lot }); return PLACES; },
    ICON,
  };
})();
