/* Helping Home: the house, drawn with the Colorfigures engine (iso/core.js, MIT). This file only draws.
   A dollhouse cutaway: the front wall and the roof are cut away, so the child looks into three floors at once.
     top floor     BEDROOM   bed, toy box, bookshelf, wardrobe, window (and the child's own decorations)
     middle floor  LAUNDRY + WUDU (right of a low partition)   washing machine, basket, basin with tap, towel hook
                   PRAYER (left)   rolled mat (laid out at prayer time), bookshelf with the Qur'an on a stand on top,
                   wall clock, hanging lantern
     ground floor  KITCHEN + HALL   fridge, counter with sink and drying rack, table, back door, shoe rack, coat pegs
     outside       GARDEN strip in front: three plants and a watering can
   Coordinates: x = depth (back wall at x = 0, the open front at x = HW), y = width (right wall at y = 0, the open
   left side at y = HDP), z = up. A unit is a "dollhouse centimetre": small things are drawn chunky so they read on
   a phone. Every furniture piece goes through byDepth with a box; wall-mounted flat things are drawn first.
   The camera turns only a little (the open side must stay toward the viewer), so walls never need their outsides. */
(function () {
  'use strict';
  const HW = 150, HDP = 300, T = 8, SL = 12, FH = 180, GW = 58, YP = 150;
  const ZF = [SL, 2*SL + FH, 3*SL + 2*FH], ZTOP = ZF[2] + FH;          // floor surfaces 12, 184, 356; walls end at 516
  const mo = matOf;
  const MT = {
    cut: { l:'#f6ead2', m:'#e9d7b4', d:'#cdb48b' }, slab: mo('#e7c591'), roof: mo('#d1704d'), base: mo('#ddd2bd'),
    grass: mo('#a9d47b'), soil: mo('#a8744b'), pot: mo('#d9805a'),
    wBed: mo('#ffe6da'), wPray: mo('#e3f0dc'), wWash: mo('#dcedf6'), wKit: mo('#fff0bf'),
    woodL: mo('#efcb98'), wood: WOOD, woodD: mo('#b5784a'), cream: mo('#fbf4e4'), white: CERAMIC, steel: METAL,
    mint: PALS.mint, red: mo('#e8574a'), blue: mo('#5b8fd6'), mustard: PALS.mustard, green: mo('#5cae6a'),
    navy: mo('#3f5d9a'), plum: mo('#9a6bb8'), teal: mo('#3f9c92'), fridge: mo('#cfe8de'), wicker: { l:'#e2b277', m:'#c99555', d:'#8e6236' },
  };
  const SKY = '#bfe0f2';

  /* ---------- helpers ---------- */
  const part = (box, svg) => ({ box, svg });
  const bbox = pts => [[0,1,2].map(i => Math.min(...pts.map(p => p[i]))), [0,1,2].map(i => Math.max(...pts.map(p => p[i])))];
  const quad = (pts, col) => face(pd(pts), col);
  // a box: shaded faces plus one ink path for all their edges (4 nodes instead of 6)
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
  // a body of revolution about a vertical axis: prof = [[z, r], ...] bottom to top. Strips are merged per shading
  // band, so a pot or a cup is 3–5 paths, not 30. opt: top (cap colour), inner (open top: inner colour), n, w
  function lathe(cx, cy, prof, m, opt = {}){
    const n = opt.n || 16, w = opt.w == null ? .9 : opt.w;
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
    if (opt.inner && prof[prof.length - 1][1] > 0) s += shape(last, opt.inner, w*.8);
    else if (opt.top && prof[prof.length - 1][1] > 0) s += shape(last, opt.top === true ? toneI([0,0,1], m) : opt.top, w*.8);
    return s + hullInk([].concat(...rings), w*1.2);
  }
  const lathePts = (cx, cy, prof) => { const r = Math.max(...prof.map(p => p[1])); return [[cx - r, cy - r, prof[0][0]], [cx + r, cy + r, prof[prof.length - 1][0]]]; };
  // a flat outline lying in a plane, turned and scaled
  const flatPts = (plane, cu, cv, poly, ang, sc) => { const c = Math.cos(ang), s2 = Math.sin(ang); return on(plane, poly.map(([u, v]) => [cu + sc*(u*c - v*s2), cv + sc*(u*s2 + v*c)])); };
  const disc = (z, cx, cy, r, col, w = .8, n = 18) => shape(on(PZ(z), ellUV(cx, cy, r, r, n)), col, w);
  // a sphere is a circle in an orthographic view
  function ball(c, r, col){
    const q = P(...c), R = r*Math.sqrt(1.5), dk = mix(col, '#000000', .25), lt = mix(col, '#ffffff', .45);
    return `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R)}" fill="${dk}"/>` +
      `<circle cx="${f(q[0] + R*.12)}" cy="${f(q[1] - R*.12)}" r="${f(R*.86)}" fill="${col}"/>` +
      `<circle cx="${f(q[0] + R*.32)}" cy="${f(q[1] - R*.36)}" r="${f(R*.2)}" fill="${lt}"/>` +
      `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(R)}" fill="none" stroke="${INK}" stroke-width="1.1"/>`;
  }
  const line3 = (pts, col, w) => `<path d="${pd(pts, false)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  /* ---------- the shell: slabs, walls, floors, windows ---------- */
  function slabFaces(z0, z1, m){
    let s = '';
    if (vis([1,0,0])) s += quad([[HW,-T,z0],[HW,HDP,z0],[HW,HDP,z1],[HW,-T,z1]], toneI([1,0,0], m));
    if (vis([0,1,0])) s += quad([[-T,HDP,z0],[HW,HDP,z0],[HW,HDP,z1],[-T,HDP,z1]], toneI([0,1,0], m));
    return s + ink(pd([[HW,-T,z1],[HW,-T,z0],[HW,HDP,z0],[-T,HDP,z0],[-T,HDP,z1],[HW,HDP,z1],[HW,-T,z1]], false) + pd([[HW,HDP,z0],[HW,HDP,z1]], false), 1.4);
  }
  // the inner faces of the two walls for one floor, plus the cut edges of the walls (dollhouse cross-sections)
  function walls(i, cols){
    const z0 = ZF[i], z1 = z0 + FH;
    let s = '';
    // back wall (x = 0), possibly in two colours split at the partition
    for (const [y0, y1, m] of cols.back) s += quad([[0,y0,z0],[0,y1,z0],[0,y1,z1],[0,y0,z1]], toneI([1,0,0], m));
    s += quad([[0,0,z0],[HW,0,z0],[HW,0,z1],[0,0,z1]], toneI([0,1,0], cols.right));
    // cut ends: right wall at the front, back wall at the left
    s += quad([[HW,-T,z0],[HW,0,z0],[HW,0,z1],[HW,-T,z1]], toneI([1,0,0], MT.cut));
    s += quad([[-T,HDP,z0],[0,HDP,z0],[0,HDP,z1],[-T,HDP,z1]], toneI([0,1,0], MT.cut));
    s += ink(pd([[0,0,z0],[0,0,z1]], false) + pd([[0,0,z0],[0,HDP,z0]], false) + pd([[0,0,z0],[HW,0,z0]], false) + pd([[HW,0,z0],[HW,0,z1]], false) + pd([[0,HDP,z0],[0,HDP,z1]], false), 1.2);
    return s;
  }
  // floor surface with its pattern: boards (lines along x), tiles (grid) or checker
  function floorRect(z, x0, y0, x1, y1, col, kind, lineCol){
    let s = fill(pd(on(PZ(z), rectUV(x0, y0, x1, y1))), col), d = '';
    if (kind === 'boards'){ for (let y = y0 + 17; y < y1 - 2; y += 17) d += pd([[x0, y, z], [x1, y, z]], false);
      for (let y = y0, k = 0; y < y1; y += 17, k++) for (let x = x0 + 30 + (k % 3)*22; x < x1 - 5; x += 66) d += pd([[x, y, z], [x, Math.min(y1, y + 17), z]], false); }
    if (kind === 'grid'){ for (let y = y0 + 20; y < y1; y += 20) d += pd([[x0, y, z], [x1, y, z]], false); for (let x = x0 + 20; x < x1; x += 20) d += pd([[x, y0, z], [x, y1, z]], false); }
    if (kind === 'check'){ let c = ''; for (let x = x0, a = 0; x < x1 - .1; x += 18.75, a++) for (let y = y0, b = 0; y < y1 - .1; y += 18.75, b++) if ((a + b) % 2) c += pd(on(PZ(z), rectUV(x, y, Math.min(x1, x + 18.75), Math.min(y1, y + 18.75))));
      s += fill(c, lineCol); return s; }
    return s + `<path d="${d}" fill="none" stroke="${lineCol}" stroke-width=".7"/>`;
  }
  // a window in the back wall (x = 0): frame, sky, glazing bars, sill; arch = round top
  function windowX(y0, y1, z0, z1, sky, opt = {}){
    const fr = 3.5, yc = (y0 + y1)/2, r = (y1 - y0)/2;
    const outline = (a, pad) => opt.arch ? [[y0 - pad, z0 - pad], [y1 + pad, z0 - pad], [y1 + pad, z1 - r], ...arcUV(yc, z1 - r, r + pad, 0, 180, 10).slice(1, -1), [y0 - pad, z1 - r]]
                                         : rectUV(y0 - pad, z0 - pad, y1 + pad, z1 + pad);
    let s = shape(on(PX(.3), outline(0, fr)), opt.frame || '#fbf6ea', 1.2);
    s += fill(pd(on(PX(.45), outline(0, 0))), sky);
    if (opt.night) s += fill(pd(on(PX(.5), [[yc + r*.3, z1 - r*.55]].concat(arcUV(yc + r*.3, z1 - r*.55, 4, 0, 360, 8)))), '#fff3c4');
    else s += fill(pd(on(PX(.5), ellUV(yc - r*.25, z0 + (z1 - z0)*.62, r*.42, 4, 10))), '#ffffff', 'opacity=".7"');
    s += ink(pd(on(PX(.55), [[yc, z0], [yc, opt.arch ? z1 : z1]]), false) + pd(on(PX(.55), [[y0, (z0 + z1)/2 - (opt.arch ? 6 : 0)], [y1, (z0 + z1)/2 - (opt.arch ? 6 : 0)]]), false), 1.3);
    s += ink(pd(on(PX(.5), outline(0, 0))), 1);
    s += bx(0, y0 - fr - 3, z0 - fr - 3, 6, y1 + fr + 3, z0 - fr, MT.cream, .8);
    if (opt.curtains){ const c = opt.curtains;
      s += shape(on(PX(1.2), [[y0 - 10, z1 + 8], [y0 + 4, z1 + 8], [y0 - 1, (z0 + z1)/2], [y0 + 2, z0 - 6], [y0 - 11, z0 - 6]]), c, .9);
      s += shape(on(PX(1.2), [[y1 + 10, z1 + 8], [y1 - 4, z1 + 8], [y1 + 1, (z0 + z1)/2], [y1 - 2, z0 - 6], [y1 + 11, z0 - 6]]), c, .9);
      s += shape(on(PX(1), rectUV(y0 - 14, z1 + 7, y1 + 14, z1 + 10)), '#a8693f', .7); }
    return s;
  }
  // a window in the right wall (y = 0)
  function windowY(x0, x1, z0, z1, sky){
    const fr = 3.5, xc = (x0 + x1)/2;
    let s = shape(on(PY(.3), rectUV(x0 - fr, z0 - fr, x1 + fr, z1 + fr)), '#fbf6ea', 1.2);
    s += fill(pd(on(PY(.45), rectUV(x0, z0, x1, z1))), sky);
    s += ink(pd(on(PY(.55), [[xc, z0], [xc, z1]]), false) + pd(on(PY(.55), [[x0, (z0 + z1)/2], [x1, (z0 + z1)/2]]), false), 1.3) + ink(pd(on(PY(.5), rectUV(x0, z0, x1, z1))), 1);
    s += bx(x0 - fr - 3, 0, z0 - fr - 3, x1 + fr + 3, 6, z0 - fr, MT.cream, .8);
    return s;
  }

  /* ---------- clothes, toys, dishes: the things that get messy ---------- */
  const SOCK = [[-1.5,4.2],[1.5,4.2],[1.5,-.6],[4.6,-1.4],[4.6,-4],[-1.5,-4]];
  const SHIRT = [[-2.2,4],[2.2,4],[5,2.2],[3.8,.3],[2.6,1],[2.6,-4],[-2.6,-4],[-2.6,1],[-3.8,.3],[-5,2.2]];
  const PANTS = [[-3,4.2],[3,4.2],[3.5,-4.2],[.9,-4.2],[0,-.4],[-.9,-4.2],[-3.5,-4.2]];
  // draw one mess item where it lies: returns { box, svg, flat }
  function messPart(it){
    const [x, y, z] = it.pos, a = it.rot || 0, col = it.col || '#e8574a', m = mo(col);
    switch (it.kind){
      case 'sock': {
        const pts = flatPts(PZ(z + .4), x, y, SOCK, a, 2.5);
        const band = flatPts(PZ(z + .5), x, y, [[-1.5,4.2],[1.5,4.2],[1.5,2.6],[-1.5,2.6]], a, 2.5);
        return { flat: true, box: bbox(pts.concat([[x, y, z + 3]])), svg: shape(pts, col, .9) + shape(band, '#fbf6ea', .6) };
      }
      case 'pyj': {
        const top = flatPts(PZ(z + .5), x, y, SHIRT, a, 3.2), legs = flatPts(PZ(z + .4), x + 14*Math.cos(a + 1.2), y + 14*Math.sin(a + 1.2), PANTS, a + .5, 2.8);
        let dots = ''; for (const [u, v] of [[-1,2],[1.3,-.5],[-.8,-2.4],[1,2.6],[-1.6,.2]]) dots += pd(flatPts(PZ(z + .6), x, y, ellUV(u, v, .45, .45, 6), a, 3.2));
        return { flat: true, box: bbox(top.concat(legs, [[x, y, z + 3]])), svg: shape(legs, mix(col, '#ffffff', .25), .9) + shape(top, col, .9) + fill(dots, '#ffffff') };
      }
      case 'block': {
        const pts = rbxPts(x, y, z, 13, 13, 13, a);
        return { box: bbox(pts), svg: rbx(x, y, z, 13, 13, 13, a, m, .9) + shape(on(PZ(z + 13.1), ellUV(x, y, 3.2, 3.2, 10)), '#fff4d6', .6) };
      }
      case 'ball': return { box: [[x - 8, y - 8, z], [x + 8, y + 8, z + 16]], svg: ball([x, y, z + 8], 8, col) +
        `<path d="${pd(on(PX(x + 4), arcUV(y, z + 8, 7.2, 200, 340, 6)), false)}" fill="none" stroke="#fff4d6" stroke-width="1.6"/>` };
      case 'car': {
        const c = Math.cos(a), s2 = Math.sin(a), at = (u, v) => [x + u*c - v*s2, y + u*s2 + v*c];
        let w = ''; for (const [u, v] of [[-6,-6],[6,-6],[-6,6],[6,6]]){ const p = at(u, v); w += ball([p[0], p[1], z + 3.4], 3.2, '#3d3935'); }
        return { box: bbox(rbxPts(x, y, z, 22, 13, 13, a)), svg: w.slice(0, w.length/2) + rbx(x, y, z + 2.5, 22, 12, 6, a, m, .9) + rbx(x - 2*c, y - 2*s2, z + 8.5, 11, 10, 5, a, MT.cream, .8) + w.slice(w.length/2) };
      }
      case 'rings': {
        let s = lathe(x, y, [[z, 7], [z + 3, 7]], MT.woodL, { top: true, n: 12 });
        const RC = ['#e8574a', '#f2c230', '#5cae6a', '#5b8fd6'];
        RC.forEach((c, i) => { const r = 9 - i*1.5, z0 = z + 3 + i*4.2; s += lathe(x, y, [[z0, r - 1], [z0 + 2, r], [z0 + 4, r - 1]], mo(c), { top: true, n: 14 }); });
        s += ball([x, y, z + 22], 3, '#ef8a3c');
        return { box: [[x - 9, y - 9, z], [x + 9, y + 9, z + 25]], svg: s };
      }
      case 'book': {
        const pts = rbxPts(x, y, z, 20, 15, 4.4, a), c = Math.cos(a), s2 = Math.sin(a);
        return { box: bbox(pts), svg: rbx(x, y, z, 19, 14, 3.6, a, MT.cream, .7) + rbx(x, y, z + 3.6, 20, 15, .8, a, m, .8) + rbx(x - 9.6*c, y - 9.6*s2, z, .9, 15, 4.4, a, m, .7) };
      }
      case 'plate': return { box: [[x - 9, y - 9, z], [x + 9, y + 9, z + 2]], svg: disc(z + .4, x, y, 9, CERAMIC.d, 0) + disc(z + 1.6, x, y, 9, '#fbfaf3', .9) +
        ink(pd(on(PZ(z + 1.7), ellUV(x, y, 6, 6, 16))), .8).replace(INK, col) + fill(pd(on(PZ(z + 1.7), ellUV(x + 1.5, y - 1, 2.6, 1.6, 8))), '#e9d5a4') };
      case 'bowl': return { box: [[x - 8, y - 8, z], [x + 8, y + 8, z + 7]], svg: lathe(x, y, [[z, 4.5], [z + 3, 7.4], [z + 6.5, 8.4]], mo('#fbfaf3'), { inner: mix(col, '#ffffff', .5), n: 16 }) };
      case 'cup': {
        const hc = [x + 6.5*Math.cos(a), y + 6.5*Math.sin(a)];
        const handle = line3([[hc[0], hc[1], z + 8], [hc[0] + 2.5*Math.cos(a), hc[1] + 2.5*Math.sin(a), z + 6], [hc[0], hc[1], z + 3]], INK, 3) + line3([[hc[0], hc[1], z + 8], [hc[0] + 2.5*Math.cos(a), hc[1] + 2.5*Math.sin(a), z + 6], [hc[0], hc[1], z + 3]], col, 1.6);
        return { box: [[x - 7, y - 7, z], [x + 7, y + 7, z + 10]], svg: handle + lathe(x, y, [[z, 4.6], [z + 10, 5.6]], m, { inner: '#7a4a2e', n: 14 }) };
      }
      case 'shoe': {
        const c = Math.cos(a), s2 = Math.sin(a);
        return { box: bbox(rbxPts(x, y, z, 21, 9, 9, a)), svg: rbx(x, y, z, 21, 9, 2.2, a, DARK, .8) + rbx(x - 2*c, y - 2*s2, z + 2.2, 16, 8, 6, a, m, .8) +
          shape(on(PZ(z + 8.3), ellUV(x - 5*c, y - 5*s2, 3, 3, 10)), '#3d3935', .6) + ink(pd([[x + 4*c - 3*s2, y + 4*s2 + 3*c, z + 8.3], [x + 4*c + 3*s2, y + 4*s2 - 3*c, z + 8.3]], false), 1.4).replace(INK, '#fbf6ea') };
      }
      case 'bag': {
        const pts = rbxPts(x, y, z, 14, 26, 22, a), c = Math.cos(a), s2 = Math.sin(a);
        return { box: bbox(pts), svg: rbx(x, y, z, 14, 26, 20, a, m, 1) + rbx(x + 4*c, y + 4*s2, z + 10, 7, 24, 11, a, mo(mix(col, '#000000', .1)), .8) +
          shape(on(PZ(z + 20.2), ellUV(x, y, 3, 6, 10)), '#3d3935', .6) + line3([[x - 6*c, y - 6*s2, z + 20], [x - 6*c, y - 6*s2, z + 27], [x - 6*c - 8*s2, y - 6*s2 + 8*c, z + 20]], INK, 1.6) };
      }
    }
    return { box: [[x, y, z], [x, y, z]], svg: '' };
  }

  /* ---------- containers and what has been put away in them ---------- */
  function rackPart(n){        // drying rack on the counter, plates standing in it
    const x0 = 6, x1 = 44, y0 = 106, y1 = 140, z = ZF[0] + 74;
    let s = bx(x0, y0, z, x1, y1, z + 2.5, MT.steel, .8);
    let tines = ''; for (let y = y0 + 4; y < y1 - 1; y += 6) tines += pd([[x0 + 4, y, z + 2.5], [x0 + 4, y, z + 14]], false) + pd([[x1 - 4, y, z + 2.5], [x1 - 4, y, z + 9]], false);
    let plates = '';
    for (let i = 0; i < Math.min(5, n); i++){ const y = y0 + 6 + i*6, c = ['#fbfaf3', '#f0e4c8', '#fbfaf3', '#e6f0f4', '#fbfaf3'][i];
      plates += shape(on(PY(y), ellUV((x0 + x1)/2, z + 12, 11, 11, 18)), c, .9) + ink(pd(on(PY(y + .1), ellUV((x0 + x1)/2, z + 12, 7.5, 7.5, 16))), .6).replace(INK, '#5b8fd6'); }
    s += plates + `<path d="${tines}" fill="none" stroke="${INK}" stroke-width=".9"/>`;
    return part([[x0, y0, z], [x1, y1, z + 24]], s);
  }
  function bookshelfB(n){       // bedroom bookshelf on the right wall, front facing +y; tidied books fill the gap
    const x0 = 58, x1 = 112, y1 = 24, z = ZF[2], h = 78;
    let s = bx(x0, 0, z, x1, y1, z + h, MT.woodL, 1, 1.8);
    if (vis([0,1,0])){
      const bays = [[z + 4, z + 25], [z + 29, z + 50], [z + 54, z + 74]];
      for (const [b0, b1] of bays) s += fill(pd(on(PY(y1 + .2), rectUV(x0 + 3, b0, x1 - 3, b1))), '#8e6236');
      const BC = ['#e8574a', '#5b8fd6', '#f2c230', '#5cae6a', '#9a6bb8', '#ef8a3c', '#3f9c92'];
      let k = 0;
      const row = (b0, list) => { let u = x0 + 4; for (const w of list){ const c = BC[k++ % BC.length], hh = 15 + (k*7) % 5;
        s += shape(on(PY(y1 + .4), rectUV(u, b0, u + w, b0 + hh)), c, .7); u += w + .6; } };
      row(z + 4, [6, 5, 7, 5, 6, 5, 6]);
      row(z + 29, [5, 6, 5].concat(Array.from({ length: Math.min(4, n) }, () => 6)));
      row(z + 54, [7, 5, 6, 6]);
      s += shape(on(PY(y1 + .4), ellUV(x1 - 12, z + 60, 5, 5, 12)), '#93d3b0', .8);           // a little globe on the top shelf
    }
    return part([[x0, 0, z], [x1, y1, z + h]], s);
  }
  function toyBox(n){
    const x0 = 112, x1 = 146, y0 = 8, y1 = 60, z = ZF[2], h = 28;
    const A = on(PZ(z + 1), rectUV(x0 + 1.5, y0 + 1.5, x1 - 1.5, y1 - 1.5)), B = on(PZ(z + h), rectUV(x0, y0, x1, y1));
    let toys = '';
    const TS = [['ball', '#5b8fd6', [122, 22]], ['block', '#f2c230', [134, 44]], ['ball', '#e8574a', [136, 20]], ['block', '#5cae6a', [121, 46]], ['ball', '#f2c230', [129, 33]], ['block', '#e98fb0', [138, 32]]];
    for (let i = 0; i < Math.min(TS.length, 2 + n); i++){ const [k, c, [tx, ty]] = TS[i], zz = z + h - 8 + (i % 3)*2;
      toys += k === 'ball' ? ball([tx, ty, zz + 4], 6, c) : rbx(tx, ty, zz - 2, 10, 10, 10, i*.5, mo(c), .8); }
    let s = openShell(A, B, nr => toneI(nr, MT.red), toys);
    if (vis([1,0,0])) s += fill(pd(on(PX(x1 + .2), rectUV(y0 + 4, z + 8, y1 - 4, z + 11))), '#f2c230') + fill(pd(on(PX(x1 + .2), rectUV(y0 + 4, z + 17, y1 - 4, z + 20))), '#f2c230');
    s += ink(pd(B), 1.2) + hullInk(A.concat(B), 1.8);
    // the lid stands open against the wall
    const L = [[x0, y0, z + h], [x1, y0, z + h], [x1, 2, z + h + 30], [x0, 2, z + h + 30]];
    const lid = quad(L, toneI([0, .7, .3], MT.red)) + ink(pd(L), 1);
    return part([[x0, 2, z], [x1, y1, z + h + 30]], lid + s);
  }
  function shoeRack(n){
    const x0 = 0, x1 = 22, y0 = 202, y1 = 240, z = ZF[0];
    let s = '';
    for (const zz of [z, z + 13, z + 25]) s += bx(x0, y0, zz, x1, y1, zz + 2, MT.wood, .7);
    s += bx(x1 - 2, y0, z, x1, y0 + 2, z + 27, MT.woodD, .6) + bx(x1 - 2, y1 - 2, z, x1, y1, z + 27, MT.woodD, .6);
    // grown-ups' shoes on the bottom shelf (signs of the family), the child's on top when tidied
    s += messPart({ kind: 'shoe', pos: [11, 210, z + 2], rot: 0, col: '#7a5a3a' }).svg + messPart({ kind: 'shoe', pos: [11, 220, z + 2], rot: 0, col: '#7a5a3a' }).svg;
    s += messPart({ kind: 'shoe', pos: [11, 230, z + 2], rot: 0, col: '#3f5d9a' }).svg;
    if (n > 0) s += messPart({ kind: 'shoe', pos: [11, 211, z + 15], rot: 0, col: '#e8574a' }).svg;
    if (n > 1) s += messPart({ kind: 'shoe', pos: [11, 222, z + 15], rot: 0, col: '#e8574a' }).svg;
    return part([[x0, y0, z], [x1, y1, z + 27]], s);
  }
  function basketPart(b){       // laundry basket: dirty pile, clean folded stack, socks
    const x0 = 6, x1 = 40, y0 = 64, y1 = 100, z = ZF[1], h = 24;
    const A = on(PZ(z + .01), rrUV(x0 + 2, y0 + 2, x1 - 2, y1 - 2, 4, 4)), B = on(PZ(z + h), rrUV(x0, y0, x1, y1, 5, 4));
    let pile = '';
    if (b.clean){ const FC = ['#fbf9f2', '#93d3b0', '#f3a6bb', '#76a0e2'];
      FC.forEach((c, i) => { pile += bx(14, 72, z + 6 + i*4.2, 32, 92, z + 9.8 + i*4.2, mo(c), .7); }); }
    else if (b.dirty){ const DC = ['#e8574a', '#4f7fd0', '#5cb87a', '#f2c230', '#fbf9f2'];
      DC.forEach((c, i) => { pile += shape(flatPts(PZ(z + 8 + i*3.2), 23 + ((i*7) % 5) - 2, 82 + ((i*5) % 7) - 3, i % 2 ? SHIRT : PANTS, i*1.1, 2.1), c, .8); }); }
    for (let i = 0; i < b.socks; i++) pile += shape(flatPts(PZ(z + (b.clean ? 24 : b.dirty ? 24 : 6) + i*1.5), 20 + i*7, 78 + i*5, SOCK, .8 + i, 2.2), ['#f2c230', '#e98fb0', '#76a0e2', '#5cae6a'][i % 4], .8);
    let weave = ''; for (let zz = z + 5; zz < z + h; zz += 4.6){ const k = 2*(1 - (zz - z)/h); weave += pd(on(PZ(zz), rrUV(x0 + k, y0 + k, x1 - k, y1 - k, 4.5, 4))); }
    const s = openShell(A, B, nr => toneI(nr, MT.wicker), pile) + `<path d="${weave}" fill="none" stroke="${MT.wicker.d}" stroke-width=".7" opacity=".7"/>` + ink(pd(B), 1.3) + hullInk(A.concat(B), 1.8);
    return part([[x0, y0, z], [x1, y1, z + h + (b.socks ? 4 : 0)]], s);
  }

  /* ---------- the ground floor: kitchen and hall ---------- */
  function kitchen(v){
    const z = ZF[0], out = [];
    // fridge, with a child's drawing and magnets on the door
    { let s = bx(0, 2, z, 48, 46, z + 112, MT.fridge, 1, 2.2);
      if (vis([1,0,0])){ s += ink(pd([[48.2, 2, z + 74], [48.2, 46, z + 74]], false), 1.1);
        s += bx(48, 38, z + 80, 51, 41, z + 104, MT.steel, .7) + bx(48, 38, z + 44, 51, 41, z + 68, MT.steel, .7);
        s += shape(on(PX(48.3), rectUV(10, z + 82, 28, z + 102)), '#fffdf6', .7);
        s += ink(pd(on(PX(48.4), [[13, z + 90], [19, z + 96], [25, z + 90]]), false) + pd(on(PX(48.4), [[14, z + 90], [14, z + 85], [24, z + 85], [24, z + 90]]), false), .9).replace(INK, '#e8574a') + fill(pd(on(PX(48.4), ellUV(23, z + 98, 1.8, 1.8, 8))), '#f2c230');
        s += fill(pd(on(PX(48.4), ellUV(33, z + 94, 2.4, 2.4, 8))), '#5b8fd6') + fill(pd(on(PX(48.4), ellUV(31, z + 86, 2, 2, 8))), '#e98fb0'); }
      out.push(part([[0, 2, z], [51, 46, z + 112]], s)); }
    // counter with the sink
    { let s = bx(0, 50, z, 50, 142, z + 70, MT.cream, 1);
      if (vis([1,0,0])){ s += ink(pd([[50.2, 81, z + 4], [50.2, 81, z + 66]], false) + pd([[50.2, 112, z + 4], [50.2, 112, z + 66]], false) + pd([[50.2, 50, z + 58], [50.2, 142, z + 58]], false), 1);
        for (const y of [72, 88, 105, 120, 135]) s += shape(on(PX(50.3), ellUV(y, y === 88 || y === 120 ? z + 64 : z + 46, 1.4, 1.4, 8)), '#c99555', .5); }
      s += bx(-1, 48, z + 70, 53, 144, z + 75, MT.woodL, 1, 2);
      // sink basin in the worktop and the tap
      s += shape(on(PZ(z + 75.1), rrUV(9, 60, 42, 100, 4, 3)), '#9aa3a6', 1) + fill(pd(on(PZ(z + 75.2), rrUV(12, 63, 39, 97, 3, 3))), '#6d7679');
      s += fill(pd(on(PZ(z + 75.3), ellUV(26, 80, 1.6, 1.6, 8))), '#3d3935');
      s += rod([5, 80, z + 75], [5, 80, z + 93], 1.6, MT.steel, toneI, .8) + rod([5, 80, z + 93], [17, 80, z + 93], 1.4, MT.steel, toneI, .8) + rod([17, 80, z + 93], [17, 80, z + 89], 1.3, MT.steel, toneI, .7);
      s += lathe(5, 72, [[z + 75, 2.2], [z + 79, 2.2]], MT.blue, { top: true, n: 10 });
      out.push(part([[-1, 48, z], [53, 144, z + 95]], s)); }
    out.push(rackPart(v.counts.rack || 0));
    // table with a fruit bowl and a cup (someone was here)
    { const t0 = z + 56; let s = '';
      for (const [lx, ly] of [[73, 61], [117, 61], [73, 133], [117, 133]]) s += bx(lx - 2, ly - 2, z, lx + 2, ly + 2, t0, MT.woodD, .7);
      s += bx(70, 58, t0, 122, 138, t0 + 4, MT.wood, 1, 2);
      out.push(part([[70, 58, z], [122, 138, t0 + 4]], s));
      const tz = t0 + 4;
      out.push(part([[82, 82, tz], [102, 102, tz + 13]], lathe(92, 92, [[tz, 6], [tz + 4, 9.5], [tz + 7, 10.5]], mo('#e8dcc4'), { inner: '#f6ead2', n: 16 }) +
        ball([89, 89, tz + 9], 4.4, '#ef8a3c') + ball([96, 93, tz + 9.5], 4.2, '#ef8a3c') + ball([90, 97, tz + 8.6], 4, '#93c25c')));
      out.push(part([[110, 66, tz], [122, 78, tz + 10]], messPart({ kind: 'cup', pos: [116, 72, tz], rot: 1.2, col: '#5b8fd6' }).svg)); }
    // stools at the table's ends
    for (const sy of [44, 152]){ const s = lathe(96, sy, [[z, 6], [z + 2, 6]], MT.woodD, { top: true, n: 12 }) + rod([96, sy, z + 2], [96, sy, z + 34], 1.6, MT.woodD, toneI, .7) + lathe(96, sy, [[z + 34, 9], [z + 38, 9]], MT.wood, { top: true, n: 16 });
      out.push(part([[87, sy - 9, z], [105, sy + 9, z + 38]], s)); }
    // pendant lamp above the table
    { const zc = ZF[1] - SL, on2 = v.lamps;
      const s = line3([[96, 98, zc], [96, 98, zc - 26]], INK, 1) + lathe(96, 98, [[zc - 42, 13], [zc - 30, 4], [zc - 26, 2.5]], on2 ? mo('#ffd77a') : MT.teal, { n: 16 }) +
        (on2 ? shape(on(PZ(zc - 42.2), ellUV(96, 98, 12, 12, 16)), '#fff3c4', .8) : '');
      out.push(part([[83, 85, zc - 42], [109, 111, zc]], s)); }
    out.push(shoeRack(v.counts.shoerack || 0));
    // the back door with its doormat (flat, drawn with the floor)
    return out;
  }
  function kitchenWall(v){
    const z = ZF[0];
    let s = '';
    // tiles behind the counter
    let d = ''; for (let zz = z + 75; zz <= z + 110; zz += 9) d += pd([[.3, 48, zz], [.3, 144, zz]], false); for (let y = 48; y <= 144; y += 12) d += pd([[.3, y, z + 75], [.3, y, z + 111]], false);
    s += fill(pd(on(PX(.2), rectUV(48, z + 75, 144, z + 111))), '#fbf8ef') + `<path d="${d}" fill="none" stroke="#c9d7dc" stroke-width=".8"/>`;
    s += windowY(66, 130, z + 64, z + 120, v.sky);
    // back door with a little round window
    { const D = rectUV(246, z, 290, z + 116);
      s += shape(on(PX(.4), rectUV(242, z, 294, z + 120)), '#fbf6ea', 1.1) + shape(on(PX(.6), D), '#b8754a', 1.2);
      s += ink(pd(on(PX(.7), rectUV(251, z + 8, 285, z + 50))) + pd(on(PX(.7), rectUV(251, z + 58, 285, z + 80))), .8);
      s += shape(on(PX(.7), ellUV(268, z + 97, 8, 8, 14)), v.sky, .9) + shape(on(PX(1.2), ellUV(250.5, z + 56, 2.2, 2.2, 8)), '#f2c230', .7); }
    // coat pegs: a coat hangs on one, the schoolbag goes on the next
    s += bx(0, 202, z + 96, 3, 244, z + 102, MT.woodD, .8);
    for (const y of [210, 224, 238]) s += rod([3, y, z + 99], [9, y, z + 101], 1.2, MT.woodD, toneI, .6);
    s += shape(on(PX(4), [[202, z + 98], [218, z + 98], [221, z + 60], [219, z + 46], [201, z + 46], [199, z + 60]]), '#d49c1f', 1.1);
    s += ink(pd(on(PX(4.2), [[210, z + 96], [210, z + 47]]), false), .9) + fill(pd(on(PX(4.3), ellUV(213, z + 80, 1.1, 1.1, 6))) + pd(on(PX(4.3), ellUV(213, z + 68, 1.1, 1.1, 6))), INK);
    return s;
  }
  function bagOnPeg(){
    const z = ZF[0] + 66, y0 = 228, y1 = 248;
    return part([[1, y0, z], [12, y1, z + 30]], bx(1, y0, z, 11, y1, z + 24, MT.red, 1) + bx(11, y0 + 2, z + 8, 13, y1 - 2, z + 18, mo('#cf4a3d'), .7) +
      line3([[3, y0 + 4, z + 24], [6, 238, z + 34]], INK, 1.6) + line3([[3, y1 - 4, z + 24], [6, 238, z + 34]], INK, 1.6));
  }

  /* ---------- middle floor: laundry and wudu (right), prayer (left) ---------- */
  function washerMini(st){
    const x1 = 52, y0 = 6, y1 = 58, z = ZF[1], h = 64, m = MT.mint, prof = rrUV(y0, z + 2, y1, z + h, 4, 4);
    let s = extrude(prof, 0, x1, m, toneI);
    if (vis([1,0,0])){
      s += fill(pd(on(PX(x1), prof)), toneI([1,0,0], m));
      const yc = (y0 + y1)/2, zc = z + 28;
      s += shape(on(PX(x1 + .2), rrUV(y0 + 3, z + h - 13, y1 - 3, z + h - 3, 2, 3)), '#fff4d6', .9);
      s += shape(on(PX(x1 + .3), rectUV(y1 - 15, z + h - 11, y1 - 5, z + h - 6)), '#5c544a', .6);
      s += shape(on(PX(x1 + .3), ellUV(y0 + 10, z + h - 8, 3, 3, 12)), '#fff4d6', .8);
      s += shape(on(PX(x1 + .3), rectUV(y0 + 17, z + h - 10.5, y0 + 27, z + h - 5.5)), '#1d2a26', .6);
      s += shape(on(PX(x1 + .3), ellUV(yc, zc, 17, 17, 24)), '#fbf9f2', 1.2);
      s += shape(on(PX(x1 + .4), ellUV(yc, zc, 12.5, 12.5, 22)), st.clean ? '#d5ecf3' : '#b9c6ca', 1);
      if (!st.clean) for (let i = 0; i < 3; i++) s += fill(pd(on(PX(x1 + .5), ellUV(yc - 5 + i*5, zc - 6 + (i % 2)*3, 4, 3, 8))), ['#e8574a', '#4f7fd0', '#f2c230'][i]);
      s += fill(pd(on(PX(x1 + .5), ellUV(yc - 4, zc + 5, 5, 1.4, 8))), '#ffffff', 'opacity=".7"');
    }
    s += hullInk([...on(PX(0), prof), ...on(PX(x1), prof)], 2);
    return part([[0, y0, z], [x1 + 1, y1, z + h]], s);
  }
  function basin(){
    const z = ZF[1], cx = 106, out = [];
    out.push(part([[100, 4, z], [112, 16, z + 60]], lathe(cx, 10, [[z, 7], [z + 6, 5], [z + 56, 4.5], [z + 60, 6]], MT.white, { n: 14 })));
    let s = bx(88, 0, z + 60, 124, 30, z + 71, MT.white, 1, 1.8);
    s += shape(on(PZ(z + 71.1), rrUV(93, 4, 119, 26, 6, 4)), '#cfe4ee', .9) + fill(pd(on(PZ(z + 71.2), ellUV(106, 15, 1.5, 1.5, 8))), '#6d7679');
    s += rod([106, 0, z + 82], [106, 9, z + 82], 1.6, MT.steel, toneI, .8) + rod([106, 9, z + 82], [106, 9, z + 77], 1.3, MT.steel, toneI, .7);
    s += rod([106, 0, z + 88], [106, 3, z + 88], 1.2, MT.steel, toneI, .6) + rod([101, 3, z + 88], [111, 3, z + 88], 1.1, MT.blue, toneI, .6);
    out.push(part([[88, 0, z + 60], [124, 30, z + 90]], s));
    // a step stool so a child can reach the tap
    out.push(part([[98, 34, z], [120, 52, z + 15]], bx(98, 34, z + 11, 120, 52, z + 15, MT.woodL, .9) + bx(99, 35, z, 103, 51, z + 11, MT.wood, .7) + bx(115, 35, z, 119, 51, z + 11, MT.wood, .7)));
    return out;
  }
  function washWall(v){
    const z = ZF[1];
    let s = '';
    // tiles on the lower half of the wudu wall
    let d = ''; for (let zz = z + 10; zz < z + 74; zz += 10) d += pd([[70, .3, zz], [HW, .3, zz]], false); for (let x = 70; x < HW; x += 10) d += pd([[x, .3, z], [x, .3, z + 74]], false);
    s += fill(pd(on(PY(.2), rectUV(70, z, HW, z + 74))), '#f4fafc') + `<path d="${d}" fill="none" stroke="#b7d3df" stroke-width=".8"/>`;
    // mirror, towel hook and towel
    s += shape(on(PY(.4), rrUV(94, z + 96, 118, z + 132, 6, 4)), '#c7dfe6', 1.1) + ink(pd(on(PY(.6), [[99, z + 120], [107, z + 128]]), false) + pd(on(PY(.6), [[101, z + 112], [113, z + 124]]), false), 1.4).replace(INK, '#ffffff');
    s += rod([136, 0, z + 106], [136, 6, z + 107], 1.3, MT.steel, toneI, .6);
    s += shape(on(PY(3), [[128, z + 106], [144, z + 106], [145, z + 64], [127, z + 64]]), '#f3a6bb', 1) + fill(pd(on(PY(3.2), rectUV(127.5, z + 70, 144.5, z + 74))), '#fff4d6');
    s += windowX(66, 122, z + 66, z + 104, v.sky, { night: v.night });
    // shelf with the soap
    return s;
  }
  function prayerWall(v){
    const z = ZF[1];
    let s = windowX(166, 204, z + 44, z + 102, v.sky, { arch: true, night: v.night, frame: '#f3ecd8' });
    // wall clock: plain dial, ticks; its hands are drawn in the moving layer so they can show the real time
    s += shape(on(PX(.5), ellUV(228, z + 86, 15, 15, 24)), '#fbf6ea', 1.3) + ink(pd(on(PX(.6), ellUV(228, z + 86, 12.5, 12.5, 20))), .5);
    let tk = ''; for (let i = 0; i < 12; i++){ const a = i*Math.PI/6, r0 = i % 3 ? 11 : 9.6; tk += pd(on(PX(.7), [[228 + r0*Math.cos(a), z + 86 + r0*Math.sin(a)], [228 + 12.3*Math.cos(a), z + 86 + 12.3*Math.sin(a)]]), false); }
    s += ink(tk, .9);
    return s;
  }
  function clockHands(d){       // moving layer: the prayer-room clock shows the time
    const z = ZF[1] + 86, h = (d.getHours() % 12 + d.getMinutes()/60)/12*2*Math.PI, m = d.getMinutes()/60*2*Math.PI;
    const pt = (a, r) => [.9, 228 - r*Math.sin(a), z + r*Math.cos(a)];
    return ink(pd([[.9, 228, z], pt(h, 6.5)], false), 1.8) + ink(pd([[.9, 228, z], pt(m, 10)], false), 1.2) + fill(pd(on(PX(1), ellUV(228, z, 1.3, 1.3, 8))), INK);
  }
  function prayerParts(v){
    const z = ZF[1], out = [];
    // bookshelf with the Qur'an on its stand on top
    { const x1 = 26, y0 = 254, y1 = 298, h = 70;
      let s = bx(0, y0, z, x1, y1, z + h, MT.woodD, 1, 1.8);
      if (vis([1,0,0])){
        for (const [b0, b1] of [[z + 5, z + 31], [z + 36, z + 63]]) s += fill(pd(on(PX(x1 + .2), rectUV(y0 + 3, b0, y1 - 3, b1))), '#5a3a22');
        const BC = ['#3f6e5a', '#8a3b34', '#3f5d9a', '#c99555', '#5a7a3a', '#8a3b34', '#3f6e5a'];
        let u = y0 + 4, k = 0; for (const w of [5, 6, 5, 7, 5, 6]){ s += shape(on(PX(x1 + .4), rectUV(u, z + 5, u + w, z + 24 + (k % 3))), BC[k++], .6); u += w + .5; }
        u = y0 + 5; for (const w of [6, 5, 6, 5]){ s += shape(on(PX(x1 + .4), rectUV(u, z + 36, u + w, z + 55 + (k % 2)*2)), BC[k++ % 7], .6); u += w + .5; }
      }
      // rehal (folding stand), the Qur'an resting open-faced shut on it
      const zc = z + h, yc = (y0 + y1)/2;
      s += quad([[4, yc - 13, zc], [22, yc - 13, zc], [17, yc - 13, zc + 13], [9, yc - 13, zc + 13]], toneI([0, -1, 0], MT.wood));
      s += ink(pd([[4, yc - 13, zc], [17, yc - 13, zc + 13]], false) + pd([[22, yc - 13, zc], [9, yc - 13, zc + 13]], false) + pd([[4, yc + 13, zc], [17, yc + 13, zc + 13]], false) + pd([[22, yc + 13, zc], [9, yc + 13, zc + 13]], false), 1.6);
      const Qb = [[6, yc - 11, zc + 9], [6, yc + 11, zc + 9], [19, yc + 11, zc + 17], [19, yc - 11, zc + 17]];
      s += quad([[6, yc - 11, zc + 6], [6, yc + 11, zc + 6], [6, yc + 11, zc + 9], [6, yc - 11, zc + 9]], '#efe6cf');
      s += quad([[6, yc + 11, zc + 6], [19, yc + 11, zc + 14], [19, yc + 11, zc + 17], [6, yc + 11, zc + 9]], '#efe6cf');
      s += shape(Qb, '#2f6b4f', 1.1);
      s += ink(pd([[8, yc - 8, zc + 10.3], [8, yc + 8, zc + 10.3], [17, yc + 8, zc + 15.7], [17, yc - 8, zc + 15.7]]), .9).replace(INK, '#e2b24a');
      const qc = [12.5, yc, zc + 13.1]; let st8 = '';
      for (let i = 0; i < 8; i++){ const a = i*Math.PI/4, r = i % 2 ? 2.2 : 3.8; st8 += (i ? 'L' : 'M') + P(qc[0] + r*Math.cos(a)*.55, qc[1] + r*Math.sin(a), qc[2] + r*Math.cos(a)*.35).map(f).join(' '); }
      s += `<path d="${st8}Z" fill="#e2b24a"/>`;
      out.push(part([[0, y0, z], [x1, y1, zc + 18]], s)); }
    // prayer mat: rolled in the corner, or laid out toward the back wall when it is time to pray
    if (v.prayNow){ /* drawn flat with the floor */ }
    else { const s = rod([14, 166, z + 7.5], [14, 222, z + 7.5], 7.5, mo('#b5443b'), toneI, 1.1) +
        ink(pd(on(PY(222.2), arcUV(14, z + 7.5, 4.5, 0, 300, 10)), false), .8) +
        line3([[14, 222, z + 1], [14, 226, z + .5]], '#efe0c2', 1.2) + line3([[18, 222, z + 3], [20, 226, z + 1]], '#efe0c2', 1.2);
      out.push(part([[6, 166, z], [22, 226, z + 15]], s)); }
    // hanging lantern
    { const zc = ZF[2] - SL, lit = v.lamps, gl = lit ? mo('#ffd77a') : mo('#e8c26a');
      let s = line3([[80, 236, zc], [80, 236, zc - 30]], INK, 1);
      s += lathe(80, 236, [[zc - 36, 2], [zc - 30, 6]], MT.woodD, { n: 6, top: true });
      s += lathe(80, 236, [[zc - 58, 7], [zc - 36, 7]], gl, { n: 6 });
      s += lathe(80, 236, [[zc - 62, 4], [zc - 58, 8]], MT.woodD, { n: 6, top: true });
      out.push(part([[72, 228, zc - 62], [88, 244, zc]], s)); }
    return out;
  }
  function prayerMatFlat(){
    const z = ZF[1] + .6, x0 = 34, x1 = 140, y0 = 200, y1 = 252;
    let s = shape(on(PZ(z), rectUV(x0, y0, x1, y1)), '#b5443b', 1.1);
    s += ink(pd(on(PZ(z + .1), rectUV(x0 + 5, y0 + 5, x1 - 5, y1 - 5))), 1).replace(INK, '#efe0c2');
    const yc = (y0 + y1)/2, arch = [[x1 - 8, y0 + 12], [x0 + 30, y0 + 12], ...arcUV(x0 + 30, yc, 14, 270, 90, 10).map(([u, v2]) => [x0 + 30 - (u - (x0 + 30)) * 1.4, v2]).slice(1, -1), [x0 + 30, y1 - 12], [x1 - 8, y1 - 12]];
    s += shape(on(PZ(z + .15), arch), '#2f6b4f', .8);
    let st8 = ''; const cx = x0 + 64, R = 8; for (let i = 0; i < 16; i++){ const a = i*Math.PI/8, r = i % 2 ? R*.55 : R; st8 += (i ? 'L' : 'M') + P(cx + r*Math.cos(a), yc + r*Math.sin(a), z + .2).map(f).join(' '); }
    s += `<path d="${st8}Z" fill="#e2b24a" stroke="${INK}" stroke-width=".6"/>`;
    let fr = ''; for (let y = y0 + 3; y < y1; y += 4) fr += pd([[x1, y, z], [x1 + 4, y, z]], false) + pd([[x0, y, z], [x0 - 4, y, z]], false);
    return s + `<path d="${fr}" fill="none" stroke="#efe0c2" stroke-width="1"/>`;
  }

  /* ---------- top floor: the bedroom, and the child's own decorations ---------- */
  const DECOR = {
    rug:     { cost: 1 }, lamp: { cost: 2 }, cushion: { cost: 4 }, plant: { cost: 6 }, frame: { cost: 9 }, garland: { cost: 12 },
  };
  function bedroomWall(v){
    const z = ZF[2];
    let s = windowX(92, 152, z + 70, z + 128, v.sky, { night: v.night, curtains: '#e98fb0' });
    // a small wall light over the toy box
    s += rod([120, 0, z + 106], [120, 6, z + 106], 1.2, MT.steel, toneI, .6) + lathe(120, 7, [[z + 100, 6], [z + 108, 3]], v.lamps ? mo('#ffd77a') : MT.mustard, { n: 12 });
    if (v.decor.frame){ s += shape(on(PX(.6), rectUV(190, z + 66, 236, z + 104)), '#b5784a', 1.2) + shape(on(PX(.9), rectUV(194, z + 70, 232, z + 100)), '#fbf4e4', .8);
      const cy = 213, cz = z + 85; let a8 = '', b8 = '';
      for (let i = 0; i < 4; i++){ const a = i*Math.PI/2, b = a + Math.PI/4; a8 += (i ? 'L' : 'M') + P(1, cy + 11*Math.cos(a), cz + 11*Math.sin(a)).map(f).join(' '); b8 += (i ? 'L' : 'M') + P(1, cy + 11*Math.cos(b), cz + 11*Math.sin(b)).map(f).join(' '); }
      s += `<path d="${a8}Z" fill="#3f9c92" stroke="${INK}" stroke-width=".8"/><path d="${b8}Z" fill="#3f9c92" fill-opacity=".85" stroke="${INK}" stroke-width=".8"/>` + shape(on(PX(1.1), ellUV(cy, cz, 4, 4, 12)), '#e2b24a', .7); }
    if (v.decor.garland){ const pts = []; for (let i = 0; i <= 16; i++){ const t = i/16, y = 160 + t*130; pts.push([.8, y, z + 150 - 12*Math.sin(t*Math.PI)]); }
      s += line3(pts, INK, 1);
      const SC = ['#f2c230', '#ef8a3c', '#93d3b0', '#f3a6bb']; const byC = {};
      pts.forEach((p, i) => { if (i % 2 || i === 0 || i === 16) return; let d = ''; for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, r = k % 2 ? 2.3 : 5.2;
        d += (k ? 'L' : 'M') + P(1, p[1] + r*Math.cos(a), p[2] - 6 - r*Math.sin(a)).map(f).join(' '); } (byC[SC[(i/2) % 4]] = (byC[SC[(i/2) % 4]] || '') + d + 'Z'); });
      for (const c in byC) s += `<path d="${byC[c]}" fill="${c}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`; }
    return s;
  }
  function bed(made, decor){
    const z = ZF[2], x0 = 0, x1 = 124, y0 = 170, y1 = 252, out = [];
    let s = '';
    s += extrude(rrUV(y0 - 2, z, y1 + 2, z + 58, 14, 5), 0, 6, MT.woodD, toneI) + (vis([1,0,0]) ? fill(pd(on(PX(6), rrUV(y0 - 2, z, y1 + 2, z + 58, 14, 5))), toneI([1,0,0], MT.woodD)) : '') +
      hullInk([...on(PX(0), rrUV(y0 - 2, z, y1 + 2, z + 58, 14, 5)), ...on(PX(6), rrUV(y0 - 2, z, y1 + 2, z + 58, 14, 5))], 1.6);
    s += bx(6, y0, z + 4, x1, y1, z + 16, MT.wood, 1);
    for (const [lx, ly] of [[x1 - 4, y0 + 1], [x1 - 4, y1 - 5]]) s += bx(lx, ly, z, lx + 4, ly + 4, z + 4, MT.woodD, .6);
    s += bx(7, y0 + 2, z + 16, x1 - 1, y1 - 2, z + 28, MT.white, .9);
    const duv = mo('#76a0e2');
    if (made){
      s += bx(10, y0 + 3, z + 28, 34, y1 - 3, z + 36, MT.white, .9, 1.2);                                         // pillow
      s += bx(36, y0 - 1, z + 14, x1 + 1, y1 + 1, z + 31, duv, 1, 1.4);                                          // duvet
      s += bx(36, y0 - 1, z + 31, 48, y1 + 1, z + 32, mo('#fbf4e4'), .8);                                         // its folded top
      let dots = ''; for (let x = 56; x < x1; x += 14) for (let y = y0 + 8; y < y1 - 4; y += 14) dots += pd(on(PZ(z + 31.1), ellUV(x + ((y/14) % 2)*6, y, 1.4, 1.4, 6)));
      s += fill(dots, '#fbf4e4');
      if (vis([0,1,0])) { let sd = ''; for (let x = 56; x < x1; x += 14) sd += pd(on(PY(y1 + 1.1), ellUV(x, z + 22, 1.4, 1.4, 6))); s += fill(sd, '#fbf4e4'); }
    } else {
      s += rbx(44, y0 + 30, z + 28, 26, 46, 8, .5, MT.white, .9);                                                    // pillow knocked sideways
      const R = [[40, y0 + 6, z + 29], [x1 - 6, y0 + 2, z + 28], [x1, y1 - 18, z + 40], [70, y1 - 6, z + 44], [52, y1 - 30, z + 38]];
      s += shape(R, toneI([0, 0, 1], duv), 1.1);
      const hang = [[x1 - 8, y1 - 2, z + 30], [74, y1 + 2, z + 42], [70, y1 + 9, z + 10], [x1 - 14, y1 + 8, z + 6]];
      s += shape(hang, toneI([0, 1, 0], duv), 1.1);
      s += ink(pd([[60, y0 + 12, z + 33], [84, y0 + 26, z + 38], [100, y0 + 18, z + 35]], false) + pd([[88, y1 - 26, z + 40], [104, y1 - 14, z + 36]], false), .9);
    }
    out.push(part([[0, y0 - 2, z], [x1 + 1, y1 + 10, z + 58]], s));
    if (decor.cushion && made) out.push(part([[86, 222, z + 31], [110, 246, z + 41]], rbx(98, 234, z + 31, 18, 18, 7, .35, PALS.mustard, .9) + shape(on(PZ(z + 38.2), ellUV(98, 234, 2, 2, 8)), '#ef8a3c', .6)));
    return out;
  }
  function bedroomParts(v){
    const z = ZF[2], out = [];
    // wardrobe in the back-right corner
    { let s = bx(0, 4, z + 3, 44, 66, z + 138, MT.woodL, 1, 2.2);
      s += bx(-1, 2, z + 138, 47, 68, z + 143, MT.woodD, .9);
      if (vis([1,0,0])){ s += ink(pd([[44.2, 35, z + 6], [44.2, 35, z + 134]], false) + pd([[44.2, 6, z + 24], [44.2, 64, z + 24]], false), 1.1);
        for (const y of [31, 39]) s += shape(on(PX(44.4), ellUV(y, z + 80, 1.8, 1.8, 10)), '#b5784a', .6);
        s += shape(on(PX(44.4), rrUV(28, z + 13, 42, z + 16, 1, 2)), '#b5784a', .6); }
      for (const [lx, ly] of [[38, 6], [38, 60]]) s += bx(lx, ly, z, lx + 4, ly + 3, z + 3, MT.woodD, .5);
      out.push(part([[-1, 2, z], [47, 68, z + 143]], s)); }
    out.push(bookshelfB(v.counts.shelfB || 0));
    out.push(toyBox(v.counts.toybox || 0));
    out.push(...bed(v.bed, v.decor));
    // bedside table (the lamp decoration stands on it)
    { let s = bx(0, 256, z, 28, 288, z + 36, MT.woodL, 1, 1.6);
      if (vis([1,0,0])) s += ink(pd([[28.2, 258, z + 24], [28.2, 286, z + 24]], false), .9) + shape(on(PX(28.4), ellUV(272, z + 30, 1.6, 1.6, 8)), '#b5784a', .5);
      if (v.decor.lamp) s += lathe(14, 272, [[z + 36, 6], [z + 39, 5]], MT.woodD, { top: true, n: 12 }) + rod([14, 272, z + 39], [14, 272, z + 52], 1.2, MT.woodD, toneI, .7) +
        lathe(14, 272, [[z + 50, 10], [z + 64, 6]], v.lamps ? mo('#ffe08a') : mo('#f3a6bb'), { top: v.lamps ? '#fff6d0' : true, n: 14 });
      out.push(part([[0, 256, z], [28, 288, z + (v.decor.lamp ? 64 : 36)]], s)); }
    if (v.decor.plant){ let s = lathe(134, 282, [[z, 7], [z + 16, 9.5], [z + 18, 10]], MT.pot, { inner: '#6b4a32', n: 14 });
      const leaves = [[-.6, 30], [.5, 34], [1.6, 28], [2.6, 32], [3.7, 27], [4.9, 31]];
      for (const [a, h] of leaves){ const tip = [134 + 11*Math.cos(a), 282 + 11*Math.sin(a), z + h + 14], mid = [134 + 6*Math.cos(a + .5), 282 + 6*Math.sin(a + .5), z + 18 + h*.6], mid2 = [134 + 6*Math.cos(a - .5), 282 + 6*Math.sin(a - .5), z + 18 + h*.6];
        s += shape([[134, 282, z + 17], mid, tip, mid2], a > 2 ? '#5cae6a' : '#4b9a5a', .8); }
      out.push(part([[124, 272, z], [146, 294, z + 50]], s)); }
    return out;
  }
  function rugFlat(){
    const z = ZF[2] + .5;
    let s = shape(on(PZ(z), rrUV(58, 76, 140, 166, 8, 4)), '#e98f6b', 1.1) + ink(pd(on(PZ(z + .1), rrUV(63, 81, 135, 161, 6, 4))), 1).replace(INK, '#fbe6c8');
    let a8 = '', b8 = ''; const cx = 99, cy = 121;
    for (let i = 0; i < 4; i++){ const a = i*Math.PI/2 + Math.PI/4, b = i*Math.PI/2; a8 += (i ? 'L' : 'M') + P(cx + 22*Math.cos(a), cy + 22*Math.sin(a), z + .2).map(f).join(' '); b8 += (i ? 'L' : 'M') + P(cx + 22*Math.cos(b), cy + 22*Math.sin(b), z + .2).map(f).join(' '); }
    return s + `<path d="${a8}Z" fill="#f2c230" stroke="${INK}" stroke-width=".7"/><path d="${b8}Z" fill="#f2c230" stroke="${INK}" stroke-width=".7"/>` + shape(on(PZ(z + .3), ellUV(cx, cy, 7, 7, 12)), '#3f9c92', .7);
  }

  /* ---------- the garden strip ---------- */
  const PLANTS = [{ id: 'p1', x: 176, y: 56, kind: 'flower' }, { id: 'p2', x: 176, y: 132, kind: 'herb' }, { id: 'p3', x: 176, y: 208, kind: 'tomato' }];
  const CAN = [176, 268];
  function plant(p, thirsty){
    const z = 8, out = '', cx = p.x, cy = p.y;
    let s = lathe(cx, cy, [[z, 9], [z + 18, 12], [z + 21, 13]], MT.pot, { inner: thirsty ? '#c9a27a' : '#5e3f2a', n: 16 });
    const top = z + 20, green = thirsty ? '#c4b66a' : '#4fa65c', green2 = thirsty ? '#d3c27d' : '#6cc070';
    if (thirsty) s += ink(pd([[cx - 6, cy - 2, top + 1.1], [cx - 1, cy + 1, top + 1.1], [cx + 2, cy - 4, top + 1.1]], false) + pd([[cx + 1, cy + 5, top + 1.1], [cx + 6, cy + 3, top + 1.1]], false), .8).replace(INK, '#8e6a44');
    const leaves = p.kind === 'herb' ? 7 : 5;
    for (let i = 0; i < leaves; i++){ const a = i/leaves*2*Math.PI + .3, hgt = (p.kind === 'tomato' ? 34 : p.kind === 'herb' ? 22 : 28) + (i % 2)*5;
      const droop = thirsty ? 1 : 0, r = p.kind === 'herb' ? 12 : 10;
      const tip = thirsty ? [cx + (r + 8)*Math.cos(a), cy + (r + 8)*Math.sin(a), top - 4 + (i % 2)*3] : [cx + r*Math.cos(a), cy + r*Math.sin(a), top + hgt];
      const m1 = [cx + 6*Math.cos(a + .5), cy + 6*Math.sin(a + .5), top + (thirsty ? 9 : hgt*.55)], m2 = [cx + 6*Math.cos(a - .5), cy + 6*Math.sin(a - .5), top + (thirsty ? 9 : hgt*.55)];
      s += shape([[cx, cy, top], m1, tip, m2], i % 2 ? green : green2, .8); }
    if (!thirsty){
      if (p.kind === 'flower') for (const [a, c] of [[.5, '#f3a6bb'], [2.6, '#f2c230'], [4.4, '#e98fb0']]) s += ball([cx + 6*Math.cos(a), cy + 6*Math.sin(a), top + 30], 3.6, c);
      if (p.kind === 'tomato') for (const a of [1, 3.2, 5]) s += ball([cx + 7*Math.cos(a), cy + 7*Math.sin(a), top + 20], 3, '#e8574a');
    }
    return part([[cx - 14, cy - 14, z], [cx + 14, cy + 14, top + 40]], s);
  }
  function wateringCan(cx, cy, z, tilt = 0){
    let s = lathe(cx, cy, [[z, 9], [z + 17, 9]], mo('#5b8fd6'), { top: true, n: 16 });
    s += rod([cx + 7, cy - 4, z + 5], [cx + 17, cy - 9, z + 22], 1.8, mo('#5b8fd6'), toneI, .8) + lathe(cx + 17, cy - 9, [[z + 21, 2.6], [z + 24, 3.4]], mo('#4a7cc0'), { top: '#3d3935', n: 10 });
    s += line3([[cx - 6, cy + 4, z + 17], [cx - 2, cy + 6, z + 27], [cx + 4, cy + 3, z + 17]], INK, 3.4) + line3([[cx - 6, cy + 4, z + 17], [cx - 2, cy + 6, z + 27], [cx + 4, cy + 3, z + 17]], '#4a7cc0', 1.8);
    return s;
  }
  function garden(v){
    const z0 = 0, z1 = 8, x0 = HW, x1 = HW + GW;
    let s = '';
    if (vis([1,0,0])) s += quad([[x1, -T, z0], [x1, HDP, z0], [x1, HDP, z1], [x1, -T, z1]], toneI([1,0,0], MT.soil));
    if (vis([0,1,0])) s += quad([[x0, HDP, z0], [x1, HDP, z0], [x1, HDP, z1], [x0, HDP, z1]], toneI([0,1,0], MT.soil));
    s += fill(pd(on(PZ(z1), rectUV(x0, -T, x1, HDP))), MT.grass.l);
    let tufts = ''; for (let i = 0; i < 26; i++){ const x = x0 + 6 + (i*37 % 44), y = 4 + i*11.3; if (Math.abs(x - 176) < 15 && (PLANTS.some(p => Math.abs(y - p.y) < 16) || Math.abs(y - CAN[1]) < 14)) continue;
      tufts += pd([[x, y, z1], [x - 1, y - 1, z1 + 4]], false) + pd([[x, y, z1], [x + 1.5, y + 1, z1 + 5]], false); }
    s += `<path d="${tufts}" fill="none" stroke="#5f9a46" stroke-width="1" stroke-linecap="round"/>`;
    s += ink(pd([[x1, -T, z1], [x1, HDP, z1], [x0, HDP, z1]], false), 1.4) + ink(pd([[x1, -T, z0], [x1, HDP, z0], [x0, HDP, z0]], false) + pd([[x1, HDP, z0], [x1, HDP, z1]], false) + pd([[x1, -T, z0], [x1, -T, z1]], false), 1.8);
    const parts = PLANTS.map(p => plant(p, !!v.thirsty[p.id]));
    if (!v.canHeld) parts.push(part([[CAN[0] - 10, CAN[1] - 12, z1], [CAN[0] + 20, CAN[1] + 10, z1 + 27]], wateringCan(CAN[0], CAN[1], z1)));
    return s + `<g opacity=".45">${PLANTS.map(p => castShadow([[p.x - 11, p.y - 11, 8], [p.x + 11, p.y + 11, 8], [p.x + 11, p.y - 11, 8], [p.x - 11, p.y + 11, 8], [p.x, p.y, 34]], 8)).join('')}</g>` + byDepth(parts);
  }

  /* ---------- shadows of furniture on each floor (flat blue, clipped to the floor) ---------- */
  const footprint = (x0, y0, x1, y1, h, z) => [[x0, y0, z], [x1, y0, z], [x0, y1, z], [x1, y1, z], [x0, y0, z + h], [x1, y0, z + h], [x0, y1, z + h], [x1, y1, z + h]];
  function floorShadows(z, list){
    const clip = on(PZ(z), rectUV(0, 0, HW, HDP));
    return clipTo(clip, `<g opacity=".38">${list.map(b => castShadow(footprint(...b, z), z)).join('')}</g>`);
  }

  /* ---------- the whole static scene ---------- */
  function scene(v){
    let s = '';
    // the house's own shadow on the paper, short and joined to it
    s += castShadow([[-T, -T, 0], [HW + GW, -T, 0], [HW + GW, HDP, 0], [-T, HDP, 0], [-T, HDP, 110], [HW, HDP, 110], [-T, -T, 110]], 0);
    // ground slab and garden
    s += slabFaces(0, SL, MT.base);
    // ---- ground floor
    s += walls(0, { back: [[0, HDP, MT.wKit]], right: MT.wKit });
    s += floorRect(ZF[0], 0, 0, HW, HDP, '#efc3a0', 'grid', '#d9a481');
    s += kitchenWall(v);
    s += shape(on(PZ(ZF[0] + .5), rrUV(2, 248, 26, 288, 3, 3)), '#5cae6a', .9);                // doormat
    s += floorShadows(ZF[0], [[0, 2, 48, 46, 112], [0, 50, 50, 142, 72], [70, 58, 122, 138, 60], [0, 202, 22, 240, 27]]);
    const g0 = kitchen(v);
    if (v.counts.peg) g0.push(bagOnPeg());
    let flat0 = '';
    for (const it of v.mess) if (it.fl === 0){ const p = messPart(it); if (p.flat) flat0 += p.svg; else g0.push(p); }
    s += flat0 + byDepth(g0);
    s += garden(v);
    // ---- middle floor
    s += slabFaces(ZF[1] - SL, ZF[1], MT.slab);
    s += walls(1, { back: [[0, YP, MT.wWash], [YP, HDP, MT.wPray]], right: MT.wWash });
    s += floorRect(ZF[1], 0, 0, HW, YP, '#eee8da', 'check', '#d6ccb6');
    s += floorRect(ZF[1], 0, YP, HW, HDP, '#dcae74', 'boards', '#b9844f');
    s += washWall(v) + prayerWall(v);
    if (v.prayNow) s += prayerMatFlat();
    s += floorShadows(ZF[1], [[0, 6, 52, 58, 64], [6, 64, 40, 100, 24], [0, 254, 26, 298, 72], [88, 0, 124, 30, 70]]);
    s += bx(0, YP - 3, ZF[1], HW, YP + 3, ZF[1] + 1.2, MT.woodD, .8);                          // threshold strip between the two rooms
    const g1 = [];
    g1.push(washerMini(v.washer), basketPart(v.basket), ...basin(), ...prayerParts(v));
    // laundry ceiling light
    { const zc = ZF[2] - SL; g1.push(part([[64, 64, zc - 8], [86, 86, zc]], lathe(75, 75, [[zc - 8, 10], [zc - 2, 10], [zc, 6]], v.lamps ? mo('#ffe08a') : MT.cream, { n: 16 }))); }
    let flat1 = ''; for (const it of v.mess) if (it.fl === 1){ const p = messPart(it); if (p.flat) flat1 += p.svg; else g1.push(p); }
    s += flat1 + byDepth(g1);
    // ---- top floor
    s += slabFaces(ZF[2] - SL, ZF[2], MT.slab);
    s += walls(2, { back: [[0, HDP, MT.wBed]], right: MT.wBed });
    s += floorRect(ZF[2], 0, 0, HW, HDP, '#e7bb83', 'boards', '#c4915a');
    s += bedroomWall(v);
    if (v.decor.rug) s += rugFlat();
    s += floorShadows(ZF[2], [[0, 4, 44, 66, 140], [58, 0, 112, 24, 78], [112, 8, 146, 60, 28], [0, 170, 124, 252, 30], [0, 256, 28, 288, 36]]);
    const g2 = bedroomParts(v);
    let flat2 = ''; for (const it of v.mess) if (it.fl === 2){ const p = messPart(it); if (p.flat) flat2 += p.svg; else g2.push(p); }
    s += flat2 + byDepth(g2);
    // roof trim, chimney
    s += bx(-T - 3, -T - 3, ZTOP, 3, HDP + 3, ZTOP + 7, MT.roof, 1.1);
    s += bx(3, -T - 3, ZTOP, HW + 3, 3, ZTOP + 7, MT.roof, 1.1);
    s += bx(-14, 34, ZTOP + 7, 2, 60, ZTOP + 44, mo('#c9694c'), 1, 1.8) + bx(-16, 32, ZTOP + 44, 4, 62, ZTOP + 49, MT.roof, .9);
    s += hullInk([[-T, -T, 0], [HW, -T, 0], [HW, HDP, 0], [-T, HDP, 0], [-T, -T, ZTOP], [HW, -T, ZTOP], [-T, HDP, ZTOP]], 2.8);
    return s;
  }

  /* ---------- anchors, rooms, regions (for taps, snapping, zoom, light) ---------- */
  const A = {
    washer: [52, 32, ZF[1] + 30], basket: [23, 82, ZF[1] + 22], basin: [106, 15, ZF[1] + 72], mat: [70, 226, ZF[1] + 4], clock: [1, 228, ZF[1] + 86],
    wardrobe: [44, 35, ZF[2] + 70], toybox: [129, 34, ZF[2] + 30], shelfB: [85, 24, ZF[2] + 42], rack: [25, 123, ZF[0] + 82], shoerack: [11, 221, ZF[0] + 22],
    peg: [6, 238, ZF[0] + 84], bed: [70, 211, ZF[2] + 32], can: [CAN[0], CAN[1], 20], window: [0, 122, ZF[2] + 100],
    rug: [99, 121, ZF[2]], lamp: [14, 272, ZF[2] + 50], cushion: [98, 234, ZF[2] + 36], plant: [134, 282, ZF[2] + 26], frame: [1, 213, ZF[2] + 85], garland: [1, 225, ZF[2] + 142],
  };
  PLANTS.forEach(p => { A[p.id] = [p.x, p.y, 34]; });
  const ROOMS = {
    bedroom: { fl: 2, y0: 0, y1: HDP, c: [80, 150, ZF[2] + 58], k: 1.6 },
    laundry: { fl: 1, y0: 0, y1: YP, c: [80, 74, ZF[1] + 56], k: 2.2 },
    prayer:  { fl: 1, y0: YP, y1: HDP, c: [80, 226, ZF[1] + 56], k: 2.2 },
    kitchen: { fl: 0, y0: 0, y1: HDP, c: [80, 150, ZF[0] + 56], k: 1.6 },
    garden:  { fl: -1, y0: 0, y1: HDP, c: [HW + GW/2, 150, 20], k: 2 },
  };
  // the room's back faces as one screen path: anything in the room is drawn inside it
  function roomPath(id){
    const r = ROOMS[id];
    if (r.fl < 0) return pd([[HW, -T, 0], [HW + GW, -T, 0], [HW + GW, -T, 50], [HW + GW, HDP, 50], [HW + GW, HDP, 0], [HW, HDP, 0]].map(p => p)) ;
    const z0 = ZF[r.fl], z1 = z0 + FH;
    let d = pd([[0, r.y0, z0], [HW, r.y0, z0], [HW, r.y1, z0], [0, r.y1, z0]]) + pd([[0, r.y0, z0], [0, r.y1, z0], [0, r.y1, z1], [0, r.y0, z1]]);
    if (r.y0 === 0) d += pd([[0, 0, z0], [HW, 0, z0], [HW, 0, z1], [0, 0, z1]]);
    return d;
  }
  // screen hull of everything above floor `fl` (the slab and the rooms on top hide the room's upper part)
  function abovePath(fl){
    if (fl >= 2) return '';
    const z = fl < 0 ? ZF[0] - SL : ZF[fl + 1] - SL, pts = [];
    for (const x of [-T, HW]) for (const y of [-T, HDP]) for (const zz of [z, ZTOP + 50]) pts.push(P(x, y, zz));
    return sp(hull(pts));
  }
  function inRoomPoly(id, X, Y){      // is the screen point inside the room's region (and not hidden by what is above)
    const r = ROOMS[id];
    const inside = poly => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j];
      if ((a[1] > Y) !== (b[1] > Y) && X < (b[0] - a[0])*(Y - a[1])/(b[1] - a[1]) + a[0]) c = !c; } return c; };
    const above = () => { if (r.fl >= 2) return false; const z = r.fl < 0 ? ZF[0] - SL : ZF[r.fl + 1] - SL, pts = [];
      for (const x of [-T, HW]) for (const y of [-T, HDP]) for (const zz of [z, ZTOP + 50]) pts.push(P(x, y, zz)); return inside(hull(pts)); };
    let faces;
    if (r.fl < 0) faces = [[[HW, -T, 0], [HW + GW, -T, 0], [HW + GW, -T, 60], [HW + GW, HDP, 60], [HW + GW, HDP, 0], [HW, HDP, 0], [HW, HDP, 60], [HW, -T, 60]]];
    else { const z0 = ZF[r.fl], z1 = z0 + FH; faces = [[[0, r.y0, z0], [HW, r.y0, z0], [HW, r.y1, z0], [0, r.y1, z0]], [[0, r.y0, z0], [0, r.y1, z0], [0, r.y1, z1], [0, r.y0, z1]]];
      if (r.y0 === 0) faces.push([[0, 0, z0], [HW, 0, z0], [HW, 0, z1], [0, 0, z1]]); }
    const hitF = faces.some(fc => inside(r.fl < 0 ? hull(fc.map(p => P(...p))) : fc.map(p => P(...p))));
    return hitF && !above();
  }
  // a mess item's anchor and size, for taps and snapping
  function messBox(it){ return messPart(it).box; }

  // the frame: everything that may be drawn, at the front view
  const BOUNDS = [[-T - 16, -T - 3, 0], [HW + GW, HDP + 3, ZTOP + 50]];

  window.HD = {
    HW, HDP, T, SL, FH, GW, YP, ZF, ZTOP, BOUNDS, A, ROOMS, PLANTS, CAN, DECOR,
    scene, messPart, messBox, clockHands, roomPath, abovePath, inRoomPoly, wateringCan, bbox, lathe, ball, line3,
  };
})();
