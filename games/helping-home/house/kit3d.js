/* Helping Home: small 3D drawing helpers on top of the Colorfigures engine (iso/core.js, MIT), and the drawings of
   every loose thing in the house (clothes, toys, dishes, rubbish, school things, tools). Exposes window.H3.
   Every drawer returns SVG strings; things that sort return { box, svg } for byDepth. */
(function () {
  'use strict';
  const mo = matOf;
  const part = (box, svg) => ({ box, svg });
  const bbox = pts => [[0,1,2].map(i => Math.min(...pts.map(p => p[i]))), [0,1,2].map(i => Math.max(...pts.map(p => p[i])))];
  const quad = (pts, col) => face(pd(pts), col);
  // a box: shaded faces plus one ink path for all their edges (4 nodes, not 6); sil = silhouette ink weight
  function bx(x0, y0, z0, x1, y1, z1, m, w = .9, sil = 0){
    const F = [
      [[0,1,0],  [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]],
      [[1,0,0],  [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],
      [[0,-1,0], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],
      [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]],
      [[0,0,1],  [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]] ];
    let s = '', d = '';
    for (const [n, q] of F) if (vis(n)){ const p = pd(q); s += face(p, toneI(n, m)); d += p; }
    if (w) s += ink(d, w);
    if (sil) s += hullInk([[x0,y0,z0],[x1,y0,z0],[x0,y1,z0],[x1,y1,z0],[x0,y0,z1],[x1,y0,z1],[x0,y1,z1],[x1,y1,z1]], sil);
    return s;
  }
  // a box turned by `ang` about the vertical axis, centred at (cx, cy), from z0 up by h
  function rbx(cx, cy, z0, lx, ly, h, ang, m, w = .8){
    const c = Math.cos(ang), s2 = Math.sin(ang), pt = (u, v, z) => [cx + u*c - v*s2, cy + u*s2 + v*c, z], a = lx/2, b = ly/2, z1 = z0 + h;
    const F = [
      [[c, s2, 0],   [pt(a,-b,z0), pt(a,b,z0), pt(a,b,z1), pt(a,-b,z1)]],
      [[-c, -s2, 0], [pt(-a,-b,z0), pt(-a,b,z0), pt(-a,b,z1), pt(-a,-b,z1)]],
      [[-s2, c, 0],  [pt(-a,b,z0), pt(a,b,z0), pt(a,b,z1), pt(-a,b,z1)]],
      [[s2, -c, 0],  [pt(-a,-b,z0), pt(a,-b,z0), pt(a,-b,z1), pt(-a,-b,z1)]],
      [[0,0,1],      [pt(-a,-b,z1), pt(a,-b,z1), pt(a,b,z1), pt(-a,b,z1)]] ];
    let o = '', d = '';
    for (const [n, q] of F) if (vis(n)){ const p = pd(q); o += face(p, toneI(n, m)); d += p; }
    return o + ink(d, w);
  }
  const rbxPts = (cx, cy, z0, lx, ly, h, ang) => { const c = Math.cos(ang), s2 = Math.sin(ang), o = [];
    for (const u of [-lx/2, lx/2]) for (const v of [-ly/2, ly/2]) for (const z of [z0, z0 + h]) o.push([cx + u*c - v*s2, cy + u*s2 + v*c, z]); return o; };
  // a body of revolution about a vertical axis, prof = [[z, r], ...] bottom to top; strips merged per shading band
  function lathe(cx, cy, prof, m, opt = {}){
    const n = opt.n || 16, w = opt.w == null ? .9 : opt.w;
    const rings = prof.map(([z, r]) => Array.from({ length: n }, (_, i) => { const a = i/n*2*Math.PI; return [cx + r*Math.cos(a), cy + r*Math.sin(a), z]; }));
    let s = '';
    for (let k = 0; k < rings.length - 1; k++){
      const A = rings[k], B = rings[k + 1], strip = [];
      for (let i = 0; i < n; i++){ const a = (i + .5)/n*2*Math.PI, dr = prof[k][1] - prof[k + 1][1], dz = prof[k + 1][0] - prof[k][0];
        const nr = norm([Math.cos(a)*dz, Math.sin(a)*dz, dr]); strip.push(vis(nr) ? toneI(nr, m) : null); }
      let st = strip.indexOf(null); if (st < 0) st = 0;
      for (let j = 0; j < n;){ const i0 = (st + j) % n, col = strip[i0]; if (!col){ j++; continue; }
        let len = 1; while (j + len < n && strip[(st + j + len) % n] === col) len++;
        const top = [], bot = []; for (let t = 0; t <= len; t++){ const ii = (i0 + t) % n; bot.push(A[ii]); top.push(B[ii]); }
        s += face(pd(bot.concat(top.reverse())), col); j += len; }
    }
    const last = rings[rings.length - 1];
    if (opt.inner && prof[prof.length - 1][1] > 0) s += shape(last, opt.inner, w*.8);
    else if (opt.top && prof[prof.length - 1][1] > 0) s += shape(last, opt.top === true ? toneI([0,0,1], m) : opt.top, w*.8);
    return s + hullInk([].concat(...rings), w*1.2);
  }
  const flatPts = (plane, cu, cv, poly, ang, sc) => { const c = Math.cos(ang), s2 = Math.sin(ang); return on(plane, poly.map(([u, v]) => [cu + sc*(u*c - v*s2), cv + sc*(u*s2 + v*c)])); };
  const disc = (z, cx, cy, r, col, w = .8, n = 18) => shape(on(PZ(z), ellUV(cx, cy, r, r, n)), col, w);
  function ball(c, r, col){            // a sphere is a circle in an orthographic view
    const q = P(...c), R = r*Math.sqrt(1.5), dk = mix(col, '#000000', .25), lt = mix(col, '#ffffff', .45);
    return `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R)}" fill="${dk}"/><circle cx="${f(q[0] + R*.12)}" cy="${f(q[1] - R*.12)}" r="${f(R*.86)}" fill="${col}"/>` +
      `<circle cx="${f(q[0] + R*.32)}" cy="${f(q[1] - R*.36)}" r="${f(R*.2)}" fill="${lt}"/><circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R)}" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
  }
  const line3 = (pts, col, w) => `<path d="${pd(pts, false)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const rope = (pts, col, w) => line3(pts, INK, w + 1.6) + line3(pts, col, w);
  // an 8-pointed star (two squares), as a path on a plane
  const star8 = (plane, cu, cv, r) => { let a = '', b = ''; for (let i = 0; i < 4; i++){ const t = i*Math.PI/2, u = t + Math.PI/4;
    a += (i ? 'L' : 'M') + P(...plane([cu + r*Math.cos(t), cv + r*Math.sin(t)])).map(f).join(' '); b += (i ? 'L' : 'M') + P(...plane([cu + r*Math.cos(u), cv + r*Math.sin(u)])).map(f).join(' '); } return a + 'Z' + b + 'Z'; };

  /* ---------- the loose things ---------- */
  const SOCK = [[-1.5,4.2],[1.5,4.2],[1.5,-.6],[4.6,-1.4],[4.6,-4],[-1.5,-4]];
  const SHIRT = [[-2.2,4],[2.2,4],[5,2.2],[3.8,.3],[2.6,1],[2.6,-4],[-2.6,-4],[-2.6,1],[-3.8,.3],[-5,2.2]];
  const PANTS = [[-3,4.2],[3,4.2],[3.5,-4.2],[.9,-4.2],[0,-.4],[-.9,-4.2],[-3.5,-4.2]];
  const TOWEL = [[-4.6,3.2],[4.6,3.2],[4.6,-3.2],[-4.6,-3.2]];
  const GARM = { shirt: SHIRT, pants: PANTS, towel: TOWEL, sock: SOCK };
  function mess(it){
    const [x, y, z] = it.pos, a = it.rot || 0, col = it.col || '#e8574a', m = mo(col), c = Math.cos(a), s2 = Math.sin(a);
    switch (it.kind){
      case 'sock': { const pts = flatPts(PZ(z + .4), x, y, SOCK, a, 2.5), band = flatPts(PZ(z + .5), x, y, [[-1.5,4.2],[1.5,4.2],[1.5,2.6],[-1.5,2.6]], a, 2.5);
        return { flat: true, box: bbox(pts.concat([[x, y, z + 3]])), svg: shape(pts, col, .9) + shape(band, '#fbf6ea', .6) }; }
      case 'pyj': { const top = flatPts(PZ(z + .5), x, y, SHIRT, a, 3.2), legs = flatPts(PZ(z + .4), x + 14*Math.cos(a + 1.2), y + 14*Math.sin(a + 1.2), PANTS, a + .5, 2.8);
        let dots = ''; for (const [u, v] of [[-1,2],[1.3,-.5],[-.8,-2.4],[1,2.6],[-1.6,.2]]) dots += pd(flatPts(PZ(z + .6), x, y, ellUV(u, v, .45, .45, 6), a, 3.2));
        return { flat: true, box: bbox(top.concat(legs, [[x, y, z + 3]])), svg: shape(legs, mix(col, '#ffffff', .25), .9) + shape(top, col, .9) + fill(dots, '#ffffff') }; }
      case 'wet': case 'dry': { const g = GARM[it.g || 'shirt'], pts = flatPts(PZ(z + .5), x, y, g, a, it.g === 'sock' ? 2.2 : 2.8);
        return { flat: true, box: bbox(pts.concat([[x, y, z + 3]])), svg: shape(pts, it.kind === 'wet' ? mix(col, '#2c4a6e', .18) : col, .9) +
          (it.kind === 'wet' ? fill(pd(flatPts(PZ(z + .6), x, y, ellUV(1, -1, 1.2, .8, 8), a, 2.8)), '#ffffff', 'opacity=".5"') : '') }; }
      case 'block': return { box: bbox(rbxPts(x, y, z, 13, 13, 13, a)), svg: rbx(x, y, z, 13, 13, 13, a, m, .9) + shape(on(PZ(z + 13.1), ellUV(x, y, 3.2, 3.2, 10)), '#fff4d6', .6) };
      case 'ball': return { box: [[x - 8, y - 8, z], [x + 8, y + 8, z + 16]], svg: ball([x, y, z + 8], 8, col) +
        `<path d="${pd(on(PX(x + 4), arcUV(y, z + 8, 7.2, 200, 340, 6)), false)}" fill="none" stroke="#fff4d6" stroke-width="1.6"/>` };
      case 'car': { const at = (u, v) => [x + u*c - v*s2, y + u*s2 + v*c]; let w = '';
        for (const [u, v] of [[-6,-6],[6,-6],[-6,6],[6,6]]){ const p = at(u, v); w += ball([p[0], p[1], z + 3.4], 3.2, '#3d3935'); }
        return { box: bbox(rbxPts(x, y, z, 22, 13, 13, a)), svg: w.slice(0, w.length/2) + rbx(x, y, z + 2.5, 22, 12, 6, a, m, .9) + rbx(x - 2*c, y - 2*s2, z + 8.5, 11, 10, 5, a, mo('#fbf4e4'), .8) + w.slice(w.length/2) }; }
      case 'rings': { let s = lathe(x, y, [[z, 7], [z + 3, 7]], mo('#efcb98'), { top: true, n: 12 });
        ['#e8574a', '#f2c230', '#5cae6a', '#5b8fd6'].forEach((cc, i) => { const r = 9 - i*1.5, z0 = z + 3 + i*4.2; s += lathe(x, y, [[z0, r - 1], [z0 + 2, r], [z0 + 4, r - 1]], mo(cc), { top: true, n: 14 }); });
        return { box: [[x - 9, y - 9, z], [x + 9, y + 9, z + 25]], svg: s + ball([x, y, z + 22], 3, '#ef8a3c') }; }
      case 'book': case 'hw': case 'sbook': { const pts = rbxPts(x, y, z, 20, 15, 4.4, a);
        let s = rbx(x, y, z, 19, 14, 3.6, a, mo('#fbf4e4'), .7) + rbx(x, y, z + 3.6, 20, 15, .8, a, m, .8) + rbx(x - 9.6*c, y - 9.6*s2, z, .9, 15, 4.4, a, m, .7);
        if (it.kind !== 'book') s += shape(flatPts(PZ(z + 4.5), x, y, rectUV(-4, -5, 5, 1), a, 1), '#fffdf6', .6);
        if (it.kind === 'hw') s += rod([x - 6*c + 4*s2, y - 6*s2 - 4*c, z + 5], [x + 6*c + 4*s2, y + 6*s2 - 4*c, z + 5], .9, mo('#f2c230'), toneI, .6);
        return { box: bbox(pts), svg: s }; }
      case 'plate': return { box: [[x - 9, y - 9, z], [x + 9, y + 9, z + 2]], svg: disc(z + .4, x, y, 9, CERAMIC.d, 0) + disc(z + 1.6, x, y, 9, '#fbfaf3', .9) +
        ink(pd(on(PZ(z + 1.7), ellUV(x, y, 6, 6, 16))), .8).replace(INK, col) + (it.dirty ? fill(pd(on(PZ(z + 1.7), ellUV(x + 1.5, y - 1, 2.6, 1.6, 8))), '#c9894e') : '') };
      case 'bowl': return { box: [[x - 8, y - 8, z], [x + 8, y + 8, z + 7]], svg: lathe(x, y, [[z, 4.5], [z + 3, 7.4], [z + 6.5, 8.4]], mo('#fbfaf3'), { inner: it.dirty ? '#d9a46a' : mix(col, '#ffffff', .5), n: 16 }) };
      case 'cup': { const hc = [x + 6.5*c, y + 6.5*s2], hp = [[hc[0], hc[1], z + 8], [hc[0] + 2.5*c, hc[1] + 2.5*s2, z + 6], [hc[0], hc[1], z + 3]];
        return { box: [[x - 7, y - 7, z], [x + 7, y + 7, z + 10]], svg: rope(hp, col, 1.6) + lathe(x, y, [[z, 4.6], [z + 10, 5.6]], m, { inner: it.dirty ? '#7a4a2e' : '#fbf4e4', n: 14 }) }; }
      case 'shoe': return { box: bbox(rbxPts(x, y, z, 21, 9, 9, a)), svg: rbx(x, y, z, 21, 9, 2.2, a, DARK, .8) + rbx(x - 2*c, y - 2*s2, z + 2.2, 16, 8, 6, a, m, .8) +
          shape(on(PZ(z + 8.3), ellUV(x - 5*c, y - 5*s2, 3, 3, 10)), '#3d3935', .6) };
      case 'bag': return { box: bbox(rbxPts(x, y, z, 14, 26, 22, a)), svg: rbx(x, y, z, 14, 26, 20, a, m, 1) + rbx(x + 4*c, y + 4*s2, z + 10, 7, 24, 11, a, mo(mix(col, '#000000', .1)), .8) +
          shape(on(PZ(z + 20.2), ellUV(x, y, 3, 6, 10)), '#3d3935', .6) + line3([[x - 6*c, y - 6*s2, z + 20], [x - 6*c, y - 6*s2, z + 27], [x - 6*c - 8*s2, y - 6*s2 + 8*c, z + 20]], INK, 1.6) };
      // rubbish: recycling (can, paper, bottle) and general (peel, wrapper)
      case 'can': return { box: [[x - 4, y - 4, z], [x + 4, y + 4, z + 11]], svg: lathe(x, y, [[z, 3.6], [z + 11, 3.6]], mo('#c9d0d6'), { top: '#e6eaec', n: 12 }) + fill(pd(on(PX(x + 3.7), rectUV(y - 2.5, z + 3, y + 2.5, z + 7))), '#e8574a') };
      case 'paper': { const pts = flatPts(PZ(z + .6), x, y, [[-6,-4],[5,-5],[6,4],[-5,5]], a, 1); return { flat: true, box: bbox(pts.concat([[x, y, z + 3]])),
        svg: ball([x, y, z + 4], 4.4, '#f6f1e2') + ink(pd([[x - 2, y - 1, z + 6], [x + 1, y + 1, z + 3], [x + 2, y - 2, z + 5]], false), .6) }; }
      case 'bottle': return { box: bbox(rbxPts(x, y, z, 16, 7, 7, a)), svg: rod([x - 7*c, y - 7*s2, z + 3.5], [x + 5*c, y + 5*s2, z + 3.5], 3.4, mo('#bfe3ea'), toneI, .7) + rod([x + 5*c, y + 5*s2, z + 3.5], [x + 8*c, y + 8*s2, z + 3.5], 1.6, mo('#5b8fd6'), toneI, .6) };
      case 'peel': { const pts = [[0, 0], [-6, 4], [-8, -1], [0, -2], [6, -6], [8, -2]].map(([u, v]) => [x + u*c - v*s2, y + u*s2 + v*c, z + .6]);
        return { flat: true, box: bbox(pts.concat([[x, y, z + 3]])), svg: shape([pts[0], pts[1], pts[2]], '#f2c230', .8) + shape([pts[0], pts[3], pts[4], pts[5]], '#e6b52a', .8) }; }
      case 'wrapper': { const pts = flatPts(PZ(z + .5), x, y, [[-5,-3],[5,-3],[6,0],[5,3],[-5,3],[-6,0]], a, 1); return { flat: true, box: bbox(pts.concat([[x, y, z + 2]])), svg: shape(pts, '#ef8a3c', .8) + ink(pd(flatPts(PZ(z + .6), x, y, [[-3, 0], [3, 0]], a, 1), false), .6) }; }
      case 'lunchbox': return { box: bbox(rbxPts(x, y, z, 16, 11, 8, a)), svg: rbx(x, y, z, 16, 11, 6, a, mo('#5cae6a'), .8) + rbx(x, y, z + 6, 16.6, 11.6, 2, a, mo('#f2c230'), .8) };
      case 'wbottle': return { box: [[x - 3.5, y - 3.5, z], [x + 3.5, y + 3.5, z + 17]], svg: lathe(x, y, [[z, 3.3], [z + 13, 3.3], [z + 15, 2]], mo('#76a0e2'), { top: '#e8574a', n: 12 }) };
      case 'dust': { let d = ''; for (let i = 0; i < 9; i++){ const u = Math.cos(i*2.4)*(4 + i % 3*2.4), v = Math.sin(i*2.4)*(3 + i % 4*1.7); d += pd(on(PZ(z + .3), ellUV(x + u, y + v, 2.2, 1.6, 7))); }
        return { flat: true, box: [[x - 9, y - 8, z], [x + 9, y + 8, z + 2]], svg: fill(d, '#a8957a', 'opacity=".75"') + fill(pd(on(PZ(z + .4), ellUV(x + 2, y - 2, 1.3, 1, 6))), '#7a6a52') }; }
      case 'drawing': { const pts = flatPts(PZ(z + .4), x, y, rectUV(-7, -5, 7, 5), a, 1);
        return { flat: true, box: bbox(pts.concat([[x, y, z + 2]])), svg: shape(pts, '#fffdf6', .8) + fill(pd(flatPts(PZ(z + .5), x, y, ellUV(-2, 1, 2.6, 2.6, 10), a, 1)), col) +
          ink(pd(flatPts(PZ(z + .5), x, y, [[1, -3], [4, 0], [6, -3]], a, 1), false), .8).replace(INK, '#5cae6a') }; }
      case 'pot': return { box: [[x - 10, y - 10, z], [x + 10, y + 10, z + 12]], svg: rope([[x - 11, y, z + 9], [x - 8, y, z + 9]], '#3d3935', 1.4) + rope([[x + 8, y, z + 9], [x + 11, y, z + 9]], '#3d3935', 1.4) +
          lathe(x, y, [[z, 7.5], [z + 10, 8.2]], mo(col), { inner: '#c9894e', n: 16 }) };
      case 'crumb': { let d = ''; for (let i = 0; i < 6; i++) d += pd(on(PZ(z + .3), ellUV(x + Math.cos(i*1.9)*4, y + Math.sin(i*1.9)*3.4, .9 + (i % 2)*.5, .8, 6)));
        return { flat: true, box: [[x - 6, y - 6, z], [x + 6, y + 6, z + 1]], svg: fill(pd(on(PZ(z + .2), ellUV(x, y, 6, 4.4, 10))), '#e3b98a', 'opacity=".55"') + fill(d, '#b07446') }; }
    }
    return { box: [[x, y, z], [x, y, z]], svg: '' };
  }
  // tools the hand carries: the wiping cloth, the broom, the watering can
  function tool(kind, x, y, z){
    if (kind === 'cloth') return { box: [[x - 9, y - 7, z], [x + 9, y + 7, z + 4]], svg: rbx(x, y, z, 17, 13, 3, .2, mo('#76a0e2'), .8) + ink(pd(flatPts(PZ(z + 3.1), x, y, [[-7,-2],[7,-2]], .2, 1), false) + pd(flatPts(PZ(z + 3.1), x, y, [[-7,2],[7,2]], .2, 1), false), .6).replace(INK, '#fbf4e4') };
    if (kind === 'broom') return { box: [[x - 10, y - 6, z], [x + 4, y + 6, z + 86]], svg: rod([x, y, z + 18], [x - 6, y, z + 86], 1.4, mo('#c9894e'), toneI, .8) +
      rbx(x + 1, y, z, 6, 16, 18, 0, mo('#e2b14a'), .9) + bx(x - 2, y - 7, z + 16, x + 4, y + 7, z + 20, mo('#e8574a'), .8) };
    if (kind === 'can'){ let s = lathe(x, y, [[z, 9], [z + 17, 9]], mo('#5b8fd6'), { top: true, n: 16 });
      s += rod([x + 7, y - 4, z + 5], [x + 17, y - 9, z + 22], 1.8, mo('#5b8fd6'), toneI, .8) + lathe(x + 17, y - 9, [[z + 21, 2.6], [z + 24, 3.4]], mo('#4a7cc0'), { top: '#3d3935', n: 10 });
      s += rope([[x - 6, y + 4, z + 17], [x - 2, y + 6, z + 27], [x + 4, y + 3, z + 17]], '#4a7cc0', 1.8);
      return { box: [[x - 10, y - 12, z], [x + 20, y + 10, z + 27]], svg: s }; }
    return { box: [[x, y, z], [x, y, z]], svg: '' };
  }
  // a garment hanging on a line in the plane x = const (facing the viewer's right)
  function hanging(x, y, z, g, col, wet){
    const poly = (GARM[g] || SHIRT).map(([u, v]) => [y + u*2.6, z - 10 - (4.2 - v)*2.6*.9]);
    return shape(on(PX(x), poly), wet ? mix(col, '#2c4a6e', .15) : col, .9) + bx(x - 1, y - 1, z - 2, x + 1, y + 1, z + 2, mo('#f2c230'), .5);
  }

  window.H3 = { part, bbox, quad, bx, rbx, rbxPts, lathe, flatPts, disc, ball, line3, rope, star8, mess, tool, hanging, GARM, SOCK, SHIRT, PANTS, TOWEL };
})();
