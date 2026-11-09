/* Helping Home: the family house, drawn with the Colorfigures engine (iso/core.js, MIT). This file only draws.
   A dollhouse cutaway (front wall and roof cut away) of a three-floor family home, with real stairs:
     top     landing (stairs arrive) · NURSERY (cot, toy chest) · SISTER'S ROOM (desk, drawings, bed) · MY ROOM
     middle  landing + stairs · BATHROOM (wudu basin, miswak and brushes, bath, towel rail) · ABU AND UMMI'S ROOM ·
             PRAYER CORNER (Qur'an on its stand, mats, clock, lantern)
     ground  HALL (stairs, door, coats, shoes) · KITCHEN AND DINING · LIVING ROOM (cushions, low table, bookcase) ·
             LAUNDRY by the back door
     outside the YARD on the left (shed, tree with a bird feeder, vegetable bed of 4 plots, clothesline, swing,
             sandpit, a ball) and the FRONT PATH (wheelie bins, the curb spot)
   Rooms are marked by short wall stubs at the back, their own wallpaper and floors: full-height walls between rooms
   would hide most of each room in this view.
   Coordinates: x = depth (back wall x = 0, open front x = HW), y = width (right wall y = 0, open left side y = HDP),
   z = up, ground z = 0. About 1 unit = 1.6 cm: a door is 48 x 124. HD.LOT is the lot the street builder works around. */
(function () {
  'use strict';
  const { part, bbox, quad, bx, rbx, lathe, flatPts, disc, ball, line3, rope, star8, mess, tool, hanging } = H3;
  const HW = 140, HDP = 440, T = 8, SL = 12, FH = 176;
  const ZF = [SL, 2*SL + FH, 3*SL + 2*FH], ZTOP = ZF[2] + FH;                 // floors 12, 200, 388; walls end at 564
  const LOT = [[-30, -20], [200, 612]], YY = 440;                                // yard: y 440..612
  const mo = matOf;
  const MT = {
    cut: { l:'#f6ead2', m:'#e9d7b4', d:'#cdb48b' }, slab: mo('#e7c591'), roof: mo('#d1704d'), base: mo('#ddd2bd'),
    grass: mo('#a9d47b'), soil: mo('#a8744b'), pot: mo('#d9805a'), pave: mo('#dcd3c2'),
    woodL: mo('#efcb98'), wood: WOOD, woodD: mo('#b5784a'), cream: mo('#fbf4e4'), white: CERAMIC, steel: METAL,
    mint: PALS.mint, red: mo('#e8574a'), blue: mo('#5b8fd6'), mustard: PALS.mustard, green: mo('#5cae6a'), teal: mo('#3f9c92'),
    fridge: mo('#cfe8de'), wicker: { l:'#e2b277', m:'#c99555', d:'#8e6236' }, sand: mo('#f1d9a0'),
  };
  /* ---------- rooms: floor, span, wallpaper, floor finish ---------- */
  const ROOMS = {
    hall:    { fl: 0, y0: 0,   y1: 112, wall: '#efe5d2', floor: ['#dcad74', 'boards', '#b9844f'] },
    kitchen: { fl: 0, y0: 112, y1: 262, wall: '#fff0bf', floor: ['#efc3a0', 'grid', '#d9a481'] },
    living:  { fl: 0, y0: 262, y1: 372, wall: '#e3eed7', floor: ['#d8a66c', 'boards', '#b5804a'] },
    laundry: { fl: 0, y0: 372, y1: 440, wall: '#dcedf6', floor: ['#eee8da', 'check', '#d6ccb6'] },
    bath:    { fl: 1, y0: 40,  y1: 150, wall: '#d8eef0', floor: ['#e6f2f2', 'check', '#c3dcdc'] },
    parents: { fl: 1, y0: 150, y1: 300, wall: '#f4e1e6', floor: ['#dcad74', 'boards', '#b9844f'] },
    prayer:  { fl: 1, y0: 300, y1: 440, wall: '#e3f0dc', floor: ['#d6a46c', 'boards', '#b5804a'] },
    nursery: { fl: 2, y0: 40,  y1: 160, wall: '#fff3c6', floor: ['#e9c08a', 'boards', '#c99a62'] },
    sister:  { fl: 2, y0: 160, y1: 290, wall: '#ebe4f7', floor: ['#e2b57c', 'boards', '#c4915a'] },
    myroom:  { fl: 2, y0: 290, y1: 440, wall: '#ffe6da', floor: ['#e7bb83', 'boards', '#c4915a'] },
    yard:    { fl: -1, y0: YY, y1: LOT[1][1] },
  };
  const LANDING = { wall: '#efe5d2', floor: ['#dcad74', 'boards', '#b9844f'] };
  const DECOR = { rug: { cost: 1 }, lamp: { cost: 2 }, cushion: { cost: 4 }, plant: { cost: 6 }, frame: { cost: 9 }, garland: { cost: 12 } };

  /* ---------- the shell ---------- */
  function slabFaces(z0, z1, m){
    let s = '';
    if (vis([1,0,0])) s += quad([[HW,-T,z0],[HW,HDP,z0],[HW,HDP,z1],[HW,-T,z1]], toneI([1,0,0], m));
    if (vis([0,1,0])) s += quad([[-T,HDP,z0],[HW,HDP,z0],[HW,HDP,z1],[-T,HDP,z1]], toneI([0,1,0], m));
    return s + ink(pd([[HW,-T,z1],[HW,-T,z0],[HW,HDP,z0],[-T,HDP,z0],[-T,HDP,z1],[HW,HDP,z1],[HW,-T,z1]], false) + pd([[HW,HDP,z0],[HW,HDP,z1]], false), 1.4);
  }
  const roomsOn = fl => Object.keys(ROOMS).filter(id => ROOMS[id].fl === fl);
  function walls(fl){
    const z0 = ZF[fl], z1 = z0 + FH;
    let s = '', spans = roomsOn(fl).map(id => [ROOMS[id].y0, ROOMS[id].y1, ROOMS[id].wall]);
    if (fl > 0) spans.unshift([0, 40, LANDING.wall]);
    for (const [y0, y1, c] of spans) s += quad([[0,y0,z0],[0,y1,z0],[0,y1,z1],[0,y0,z1]], toneI([1,0,0], mo(c)));
    s += quad([[0,0,z0],[HW,0,z0],[HW,0,z1],[0,0,z1]], toneI([0,1,0], mo(fl ? LANDING.wall : ROOMS.hall.wall)));
    s += quad([[HW,-T,z0],[HW,0,z0],[HW,0,z1],[HW,-T,z1]], toneI([1,0,0], MT.cut));
    s += quad([[-T,HDP,z0],[0,HDP,z0],[0,HDP,z1],[-T,HDP,z1]], toneI([0,1,0], MT.cut));
    return s + ink(pd([[0,0,z0],[0,0,z1]], false) + pd([[0,0,z0],[0,HDP,z0]], false) + pd([[0,0,z0],[HW,0,z0]], false) + pd([[HW,0,z0],[HW,0,z1]], false) + pd([[0,HDP,z0],[0,HDP,z1]], false), 1.2);
  }
  function floorRect(z, x0, y0, x1, y1, [col, kind, lc]){
    let s = fill(pd(on(PZ(z), rectUV(x0, y0, x1, y1))), col), d = '';
    if (kind === 'boards'){ for (let y = y0 + 17; y < y1 - 2; y += 17) d += pd([[x0, y, z], [x1, y, z]], false);
      for (let y = y0, k = 0; y < y1; y += 17, k++) for (let x = x0 + 30 + (k % 3)*22; x < x1 - 5; x += 66) d += pd([[x, y, z], [x, Math.min(y1, y + 17), z]], false); }
    if (kind === 'grid'){ for (let y = y0 + 20; y < y1; y += 20) d += pd([[x0, y, z], [x1, y, z]], false); for (let x = x0 + 20; x < x1; x += 20) d += pd([[x, y0, z], [x, y1, z]], false); }
    if (kind === 'check'){ let c = ''; const st = 17.5; for (let x = x0, a = 0; x < x1 - .1; x += st, a++) for (let y = y0, b = 0; y < y1 - .1; y += st, b++) if ((a + b) % 2) c += pd(on(PZ(z), rectUV(x, y, Math.min(x1, x + st), Math.min(y1, y + st))));
      return s + fill(c, lc); }
    return s + `<path d="${d}" fill="none" stroke="${lc}" stroke-width=".7"/>`;
  }
  function floors(fl){
    const z = ZF[fl]; let s = '';
    for (const id of roomsOn(fl)){ const r = ROOMS[id]; s += floorRect(z, 0, r.y0, HW, r.y1, r.floor); }
    if (fl > 0){ s += floorRect(z, 0, 0, 30, 40, LANDING.floor) + floorRect(z, 76, 0, HW, 40, LANDING.floor) + floorRect(z, 30, 36, 76, 40, LANDING.floor);
      s += quad([[30, 0, z - SL], [30, 36, z - SL], [30, 36, z], [30, 0, z]], toneI([1,0,0], MT.cut)) + ink(pd([[30, 0, z], [30, 36, z], [76, 36, z], [76, 0, z]], false), 1.2); }
    // thresholds between rooms
    for (const id of roomsOn(fl)){ const y = ROOMS[id].y0; if (y > 0 || fl > 0) s += bx(16, y - 2, z, HW, y + 2, z + .8, MT.woodD, .6); }
    return s;
  }
  const stub = (fl, y) => part([[0, y - 4, ZF[fl]], [16, y + 4, ZF[fl] + FH]], bx(0, y - 4, ZF[fl], 16, y + 4, ZF[fl] + FH, MT.cut, 1));
  function windowX(y0, y1, z0, z1, v, opt = {}){
    const fr = 3.5, yc = (y0 + y1)/2, r = (y1 - y0)/2, sky = v.sky;
    const outline = pad => opt.arch ? [[y0 - pad, z0 - pad], [y1 + pad, z0 - pad], [y1 + pad, z1 - r], ...arcUV(yc, z1 - r, r + pad, 0, 180, 10).slice(1, -1), [y0 - pad, z1 - r]] : rectUV(y0 - pad, z0 - pad, y1 + pad, z1 + pad);
    let s = shape(on(PX(.3), outline(fr)), opt.frame || '#fbf6ea', 1.2) + fill(pd(on(PX(.45), outline(0))), sky);
    if (v.night) s += fill(pd(on(PX(.5), ellUV(yc + r*.3, z1 - r*.55 - (opt.arch ? r*.4 : 0), 3, 3, 8))), '#fff3c4');
    else s += fill(pd(on(PX(.5), ellUV(yc - r*.25, z0 + (z1 - z0)*.62, r*.42, 4, 10))), '#ffffff', 'opacity=".7"');
    const zm = (z0 + z1)/2 - (opt.arch ? 6 : 0);
    s += ink(pd(on(PX(.55), [[yc, z0], [yc, z1]]), false) + pd(on(PX(.55), [[y0, zm], [y1, zm]]), false), 1.3) + ink(pd(on(PX(.5), outline(0))), 1);
    s += bx(0, y0 - fr - 3, z0 - fr - 3, 6, y1 + fr + 3, z0 - fr, MT.cream, .8);
    if (opt.curtains){ const c = opt.curtains;
      s += shape(on(PX(1.2), [[y0 - 10, z1 + 8], [y0 + 4, z1 + 8], [y0 - 1, (z0 + z1)/2], [y0 + 2, z0 - 6], [y0 - 11, z0 - 6]]), c, .9);
      s += shape(on(PX(1.2), [[y1 + 10, z1 + 8], [y1 - 4, z1 + 8], [y1 + 1, (z0 + z1)/2], [y1 - 2, z0 - 6], [y1 + 11, z0 - 6]]), c, .9);
      s += shape(on(PX(1), rectUV(y0 - 14, z1 + 7, y1 + 14, z1 + 10)), '#a8693f', .7); }
    return s;
  }
  // a straight flight of 10 steps against the right wall, rising from the front to the back, floor fl to fl + 1
  function flight(fl){
    const za = ZF[fl], zb = ZF[fl + 1], X0 = 136, X1 = 30, N = 10, t = (X0 - X1)/N, r = (zb - za)/N, Y = 34;
    let tops = '', ris = '', saw = [[X0, Y, za]];
    for (let k = 0; k < N; k++){ const xa = X0 - k*t, xb = X0 - (k + 1)*t, zt = za + (k + 1)*r;
      tops += pd([[xb, 0, zt], [xa, 0, zt], [xa, Y, zt], [xb, Y, zt]]); ris += pd([[xa, 0, zt - r], [xa, Y, zt - r], [xa, Y, zt], [xa, 0, zt]]);
      saw.push([xa, Y, zt], [xb, Y, zt]); }
    // an open stair: the stringer is a band under the steps, so the hall behind still shows
    const band = saw.slice(1).concat([[X1, Y, zb - 22], [X0 - t, Y, za - 2 + r*.2], [X0, Y, za]]);
    let s = face(pd(band), toneI([0,1,0], MT.woodL)) + fill(ris, toneI([1,0,0], MT.cream)) + fill(tops, MT.woodL.l) + ink(tops + ris, .7) + ink(pd(band), 1.4);
    // banister on the open side
    let posts = ''; const rail = [];
    for (let k = 0; k <= N; k += 2){ const x = X0 - k*t - t/2, zt = za + (k + 1)*r; posts += pd([[x, Y - 2, zt], [x, Y - 2, zt + 40]], false); rail.push([x, Y - 2, zt + 40]); }
    s += `<path d="${posts}" fill="none" stroke="${INK}" stroke-width="1.6"/>` + rope(rail, '#b5784a', 2.4);
    return part([[X1, 0, za], [X0, Y, zb + 40]], s);
  }
  function railingTop(fl){
    const z = ZF[fl]; let d = '';
    const pts = [[76, 0], [76, 38], [30, 38]];
    for (const [a, b] of [[pts[0], pts[1]], [pts[1], pts[2]]]) for (let u = 0; u <= 1.001; u += .2){ const x = a[0] + (b[0] - a[0])*u, y = a[1] + (b[1] - a[1])*u; d += pd([[x, y, z], [x, y, z + 34]], false); }
    return part([[30, 0, z], [77, 39, z + 36]], `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.5"/>` + rope(pts.map(([x, y]) => [x, y, z + 34]), '#b5784a', 2.6));
  }
  const shadowsOn = (z, list) => clipTo(on(PZ(z), rectUV(0, 0, HW, HDP)), `<g opacity=".36">${list.map(([x0, y0, x1, y1, h]) =>
    castShadow([[x0,y0,z],[x1,y0,z],[x0,y1,z],[x1,y1,z],[x0,y0,z+h],[x1,y0,z+h],[x0,y1,z+h],[x1,y1,z+h]], z)).join('')}</g>`);

  /* ---------- small furniture used in several rooms ---------- */
  function bedPart(x0, y0, x1, y1, z, made, duv, opt = {}){
    let s = '';
    const hb = rrUV(y0 - 2, z, y1 + 2, z + (opt.hb || 52), 12, 5);
    s += extrude(hb, 0, 6, MT.woodD, toneI) + (vis([1,0,0]) ? fill(pd(on(PX(6), hb)), toneI([1,0,0], MT.woodD)) : '') + hullInk([...on(PX(0), hb), ...on(PX(6), hb)], 1.6);
    s += bx(6, y0, z + 4, x1, y1, z + 15, MT.wood, 1) + bx(7, y0 + 2, z + 15, x1 - 1, y1 - 2, z + 26, MT.white, .9);
    const dm = mo(duv);
    if (made){
      s += bx(10, y0 + 3, z + 26, 32, y1 - 3, z + 33, MT.white, .9, 1.2);
      s += bx(34, y0 - 1, z + 13, x1 + 1, y1 + 1, z + 29, dm, 1, 1.4) + bx(34, y0 - 1, z + 29, 45, y1 + 1, z + 30, mo('#fbf4e4'), .8);
      if (opt.dots){ let d = ''; for (let x = 54; x < x1; x += 14) for (let y = y0 + 8; y < y1 - 4; y += 14) d += pd(on(PZ(z + 29.1), ellUV(x + ((y/14) % 2)*6, y, 1.4, 1.4, 6))); s += fill(d, '#fbf4e4'); }
    } else {
      s += rbx(42, (y0 + y1)/2 - 6, z + 26, 24, (y1 - y0)*.55, 7, .5, MT.white, .9);
      const R = [[38, y0 + 5, z + 27], [x1 - 6, y0 + 2, z + 26], [x1, y1 - 16, z + 38], [66, y1 - 6, z + 42], [50, (y0 + y1)/2, z + 36]];
      s += shape(R, toneI([0, 0, 1], dm), 1.1) + shape([[x1 - 8, y1 - 2, z + 28], [72, y1 + 2, z + 40], [68, y1 + 9, z + 9], [x1 - 14, y1 + 8, z + 5]], toneI([0, 1, 0], dm), 1.1);
      s += ink(pd([[58, y0 + 10, z + 31], [80, y0 + 22, z + 36], [96, y0 + 16, z + 33]], false), .9);
    }
    return part([[0, y0 - 2, z], [x1 + 1, y1 + 10, z + (opt.hb || 52)]], s);
  }
  function shelfBooks(x0, x1, z0, h, yFace, bays, count, palette){      // a bookcase whose front faces +y
    let s = bx(x0, yFace - 22, z0, x1, yFace, z0 + h, MT.woodL, 1, 1.6);
    if (vis([0,1,0])){
      const BC = palette || ['#e8574a', '#5b8fd6', '#f2c230', '#5cae6a', '#9a6bb8', '#ef8a3c', '#3f9c92']; let k = 0;
      bays.forEach(([b0, b1], bi) => { s += fill(pd(on(PY(yFace + .2), rectUV(x0 + 3, z0 + b0, x1 - 3, z0 + b1))), '#8e6236');
        let u = x0 + 4; const n = bi === 1 ? 3 + Math.min(4, count) : 4 + (bi % 2); for (let i = 0; i < n && u < x1 - 8; i++){ const w = 5 + (k*3) % 3;
          s += shape(on(PY(yFace + .4), rectUV(u, z0 + b0, u + w, z0 + b0 + Math.min(b1 - b0 - 2, 14 + (k*7) % 5))), BC[k++ % BC.length], .7); u += w + .6; } });
    }
    return part([[x0, yFace - 22, z0], [x1, yFace, z0 + h]], s);
  }

  /* ---------- ground floor ---------- */
  function groundWall(v){
    const z = ZF[0]; let s = '';
    // hall: door, coat rail with a coat (Abu's) and a scarf, the school bag's peg
    s += shape(on(PX(.4), rectUV(34, z, 88, z + 128)), '#fbf6ea', 1.1) + shape(on(PX(.6), rectUV(38, z, 84, z + 124)), '#b8754a', 1.2);
    s += ink(pd(on(PX(.7), rectUV(43, z + 10, 79, z + 54))) + pd(on(PX(.7), rectUV(43, z + 62, 79, z + 84))), .8) + shape(on(PX(.7), ellUV(61, z + 104, 8, 8, 14)), v.sky, .9) + shape(on(PX(1.2), ellUV(44, z + 62, 2.2, 2.2, 8)), '#f2c230', .7);
    s += bx(0, 88, z + 96, 3, 110, z + 102, MT.woodD, .8) + rod([3, 93, z + 99], [9, 93, z + 101], 1.2, MT.woodD, toneI, .6) + rod([3, 105, z + 99], [9, 105, z + 101], 1.2, MT.woodD, toneI, .6);
    s += shape(on(PX(4), [[87, z + 98], [100, z + 98], [102, z + 62], [100, z + 48], [86, z + 48], [84, z + 62]]), '#d49c1f', 1.1) + ink(pd(on(PX(4.2), [[93, z + 96], [93, z + 49]]), false), .9);
    // kitchen: tiles behind the counter, a small window, a calendar
    let d = ''; for (let zz = z + 75; zz <= z + 104; zz += 9) d += pd([[.3, 114, zz], [.3, 198, zz]], false); for (let y = 114; y <= 198; y += 12) d += pd([[.3, y, z + 75], [.3, y, z + 105]], false);
    s += fill(pd(on(PX(.2), rectUV(114, z + 75, 198, z + 105))), '#fbf8ef') + `<path d="${d}" fill="none" stroke="#c9d7dc" stroke-width=".8"/>`;
    s += windowX(130, 180, z + 108, z + 128, v);
    s += shape(on(PX(.5), rectUV(208, z + 116, 232, z + 140)), '#fffdf6', .8) + fill(pd(on(PX(.6), rectUV(208, z + 134, 232, z + 140))), '#e8574a');
    // living: window, a framed calligraphy-free geometric tile
    s += windowX(324, 366, z + 62, z + 116, v, { curtains: '#3f9c92' });
    s += shape(on(PX(.5), rectUV(286, z + 112, 306, z + 132)), '#b5784a', 1) + fill(star8(PX(.8), 296, z + 122, 7), '#e2b24a');
    // laundry: a shelf with soap
    s += bx(0, 380, z + 92, 10, 430, z + 95, MT.woodL, .8) + bx(1, 386, z + 95, 8, 394, z + 108, MT.blue, .7) + bx(1, 400, z + 95, 8, 412, z + 104, mo('#fbf4e4'), .7);
    return s;
  }
  function groundParts(v){
    const z = ZF[0], out = [flight(0), stub(0, 112), stub(0, 262), stub(0, 372)];
    // hall: shoe rack under the coats
    { let s = ''; for (const zz of [z, z + 13, z + 25]) s += bx(0, 88, zz, 22, 110, zz + 2, MT.wood, .7);
      s += bx(20, 88, z, 22, 90, z + 27, MT.woodD, .6) + bx(20, 108, z, 22, 110, z + 27, MT.woodD, .6);
      for (const [yy, c] of [[93, '#7a5a3a'], [101, '#7a5a3a'], [108, '#3f5d9a']]) s += mess({ kind: 'shoe', pos: [11, yy, z + 2], rot: 0, col: c }).svg;
      const n = v.counts.shoerack || 0; if (n > 0) s += mess({ kind: 'shoe', pos: [11, 94, z + 15], col: '#e8574a' }).svg; if (n > 1) s += mess({ kind: 'shoe', pos: [11, 104, z + 15], col: '#e8574a' }).svg;
      out.push(part([[0, 88, z], [22, 110, z + 27]], s)); }
    if (v.bag === 'peg') out.push(part([[1, 98, z + 66], [12, 114, z + 96]], bx(1, 98, z + 66, 11, 114, z + 90, MT.red, 1) + bx(11, 100, z + 74, 13, 112, z + 84, mo('#cf4a3d'), .7) + rope([[3, 101, z + 90], [6, 105, z + 100], [3, 111, z + 90]], '#3d3935', .8)));
    if (v.bag === 'open') out.push(part([[60, 48, z], [80, 74, z + 22]], bx(60, 48, z, 76, 74, z + 18, MT.red, 1) + quad([[76, 48, z + 18], [76, 74, z + 18], [86, 74, z + 4], [86, 48, z + 4]], toneI([1,0,1], mo('#cf4a3d'))) + ink(pd([[76, 48, z + 18], [76, 74, z + 18], [86, 74, z + 4], [86, 48, z + 4]]), .9) +
      fill(pd(on(PZ(z + 18.2), rectUV(61.5, 49.5, 74.5, 72.5))), '#5a2a22') + (v.packed || []).map((k, i) => k === 'sbook' ? bx(64, 52 + i*6, z + 10, 72, 56 + i*6, z + 22, MT.blue, .6) : k === 'lunchbox' ? bx(63, 60, z + 12, 73, 68, z + 20, MT.green, .6) : bx(64, 66, z + 10, 70, 70, z + 24, mo('#76a0e2'), .6)).join('')));
    if (v.tools.broom) out.push(part(...(t => [t.box, t.svg])(tool('broom', 104, 44, z))));
    // kitchen: counter with the sink and the drying rack; fridge; the two bins; the table and stools; the lamp
    { let s = bx(0, 116, z, 46, 196, z + 70, MT.cream, 1);
      if (vis([1,0,0])){ s += ink(pd([[46.2, 144, z + 4], [46.2, 144, z + 66]], false) + pd([[46.2, 172, z + 4], [46.2, 172, z + 66]], false) + pd([[46.2, 116, z + 58], [46.2, 196, z + 58]], false), 1);
        for (const y of [132, 158, 186]) s += shape(on(PX(46.3), ellUV(y, z + 46, 1.4, 1.4, 8)), '#c99555', .5); }
      s += bx(-1, 114, z + 70, 49, 198, z + 75, MT.woodL, 1, 2);
      s += shape(on(PZ(z + 75.1), rrUV(9, 126, 38, 160, 4, 3)), '#9aa3a6', 1) + fill(pd(on(PZ(z + 75.2), rrUV(12, 129, 35, 157, 3, 3))), '#6d7679');
      s += rod([5, 143, z + 75], [5, 143, z + 93], 1.6, MT.steel, toneI, .8) + rod([5, 143, z + 93], [16, 143, z + 93], 1.4, MT.steel, toneI, .8) + rod([16, 143, z + 93], [16, 143, z + 89], 1.3, MT.steel, toneI, .7);
      out.push(part([[-1, 114, z], [49, 198, z + 95]], s)); }
    { const x0 = 6, x1 = 40, y0 = 166, y1 = 194, zz = z + 75; let s = bx(x0, y0, zz, x1, y1, zz + 2.5, MT.steel, .8), tn = '', pl = '';
      for (let y = y0 + 4; y < y1 - 1; y += 5) tn += pd([[x0 + 4, y, zz + 2.5], [x0 + 4, y, zz + 14]], false) + pd([[x1 - 4, y, zz + 2.5], [x1 - 4, y, zz + 9]], false);
      for (let i = 0; i < Math.min(5, v.counts.rack || 0); i++){ const y = y0 + 4 + i*5; pl += shape(on(PY(y), ellUV((x0 + x1)/2, zz + 12, 10, 10, 18)), i % 2 ? '#f0e4c8' : '#fbfaf3', .9) + ink(pd(on(PY(y + .1), ellUV((x0 + x1)/2, zz + 12, 6.8, 6.8, 16))), .6).replace(INK, '#5b8fd6'); }
      out.push(part([[x0, y0, zz], [x1, y1, zz + 23]], s + pl + `<path d="${tn}" fill="none" stroke="${INK}" stroke-width=".9"/>`)); }
    if (v.tools.cloth) out.push(part(...(t => [t.box, t.svg])(tool('cloth', 42, 124, z + 75))));
    { let s = bx(0, 200, z, 44, 240, z + 112, MT.fridge, 1, 2.2);
      if (vis([1,0,0])){ s += ink(pd([[44.2, 200, z + 74], [44.2, 240, z + 74]], false), 1.1) + bx(44, 234, z + 80, 47, 237, z + 104, MT.steel, .7) + bx(44, 234, z + 44, 47, 237, z + 68, MT.steel, .7);
        s += shape(on(PX(44.3), rectUV(206, z + 82, 224, z + 102)), '#fffdf6', .7) + ink(pd(on(PX(44.4), [[209, z + 90], [215, z + 96], [221, z + 90]]), false) + pd(on(PX(44.4), [[210, z + 90], [210, z + 85], [220, z + 85], [220, z + 90]]), false), .9).replace(INK, '#e8574a');
        for (const d2 of v.fridgeArt || []) s += shape(on(PX(44.3), rectUV(d2[0], z + d2[1], d2[0] + 12, z + d2[1] + 14)), '#fffdf6', .6) + fill(pd(on(PX(44.4), ellUV(d2[0] + 6, z + d2[1] + 8, 3, 3, 8))), d2[2]); }
      out.push(part([[0, 200, z], [47, 240, z + 112]], s)); }
    for (const [x0, col, kind] of [[2, '#5b8fd6', 'rec'], [24, '#8f9a8c', 'gen']]){ const n = kind === 'rec' ? v.counts.recycle || 0 : v.counts.general || 0;
      let s = bx(x0, 243, z, x0 + 18, 260, z + 24, mo(col), 1, 1.4) + bx(x0 - .5, 242.5, z + 24, x0 + 18.5, 260.5, z + 27, mo(mix(col, '#000000', .12)), .8);
      if (vis([1,0,0]) && kind === 'rec'){ const yc = 251.5, zc = z + 13; s += ink(pd(on(PX(x0 + 18.2), [[yc - 4, zc - 3], [yc, zc + 4], [yc + 4, zc - 3]])) , 1.3).replace(INK, '#fbf4e4'); }
      if (n) s += fill(pd(on(PZ(z + 27.2), ellUV(x0 + 9, 251.5, 3 + Math.min(4, n), 2.4, 8))), kind === 'rec' ? '#e6eaec' : '#c9a27a');
      out.push(part([[x0 - .5, 242.5, z], [x0 + 18.5, 260.5, z + 27]], s)); }
    { const t0 = z + 56; let s = ''; for (const [lx, ly] of [[65, 163], [109, 163], [65, 233], [109, 233]]) s += bx(lx - 2, ly - 2, z, lx + 2, ly + 2, t0, MT.woodD, .7);
      s += bx(62, 160, t0, 112, 236, t0 + 4, MT.wood, 1, 2); out.push(part([[62, 160, z], [112, 236, t0 + 4]], s));
      const tz = t0 + 4;
      for (const k of v.table || []){ const p = SEATS[k.seat]; out.push(part(...(m => [m.box, m.svg])(mess({ kind: k.kind, pos: [p[0], p[1] + (k.kind === 'cup' ? (p[1] < 200 ? -7 : 7) : 0), tz], rot: 1, col: k.col || '#5b8fd6', dirty: k.dirty })))); }
      if (v.fruit) out.push(part([[78, 188, tz], [98, 208, tz + 13]], lathe(88, 198, [[tz, 6], [tz + 4, 9.5], [tz + 7, 10.5]], mo('#e8dcc4'), { inner: '#f6ead2', n: 16 }) + ball([85, 195, tz + 9], 4.4, '#ef8a3c') + ball([92, 199, tz + 9.5], 4.2, '#ef8a3c') + ball([86, 203, tz + 8.6], 4, '#93c25c')));
      for (const [sx, sy] of [[72, 150], [100, 150], [72, 246], [100, 246]]) out.push(part([[sx - 8, sy - 8, z], [sx + 8, sy + 8, z + 36]], lathe(sx, sy, [[z, 5], [z + 2, 5]], MT.woodD, { top: true, n: 10 }) + rod([sx, sy, z + 2], [sx, sy, z + 32], 1.4, MT.woodD, toneI, .7) + lathe(sx, sy, [[z + 32, 8], [z + 36, 8]], MT.wood, { top: true, n: 14 }))); }
    { const zc = ZF[1] - SL; out.push(part([[75, 185, zc - 40], [101, 211, zc]], line3([[88, 198, zc], [88, 198, zc - 24]], INK, 1) + lathe(88, 198, [[zc - 40, 12], [zc - 28, 4], [zc - 24, 2.5]], v.lamps ? mo('#ffd77a') : MT.teal, { n: 16 }) + (v.lamps ? shape(on(PZ(zc - 40.2), ellUV(88, 198, 11, 11, 16)), '#fff3c4', .8) : ''))); }
    // living room: bookcase, low table, floor cushions
    out.push(shelfBooks(0, 24, z, 104, 318, [[4, 30], [34, 62], [66, 94]], 0, ['#3f6e5a', '#8a3b34', '#3f5d9a', '#c99555', '#5a7a3a']));
    out.push(part([[54, 296, z], [112, 350, z + 22]], bx(56, 298, z + 17, 110, 348, z + 21, MT.woodD, 1, 1.6) + bx(58, 300, z, 62, 304, z + 17, MT.woodD, .6) + bx(104, 300, z, 108, 304, z + 17, MT.woodD, .6) + bx(58, 342, z, 62, 346, z + 17, MT.woodD, .6) + bx(104, 342, z, 108, 346, z + 17, MT.woodD, .6) +
      lathe(72, 318, [[z + 21, 4], [z + 26, 6], [z + 30, 3]], mo('#3f9c92'), { top: true, n: 12 }) + bx(86, 326, z + 21, 100, 338, z + 24, MT.red, .7)));
    for (const [cx, cy, col, a] of [[38, 322, '#e98fb0', .2], [83, 286, '#f2c230', 0], [83, 360, '#93d3b0', .1], [126, 322, '#76a0e2', -.2]]) out.push(part([[cx - 12, cy - 12, z], [cx + 12, cy + 12, z + 8]], rbx(cx, cy, z, 20, 20, 7, a, mo(col), .9) + shape(on(PZ(z + 7.1), ellUV(cx, cy, 1.8, 1.8, 8)), mix(col, '#000000', .2), .5)));
    { const zc = ZF[1] - SL; out.push(part([[106, 352, zc - 30], [122, 368, zc]], line3([[114, 360, zc], [114, 360, zc - 18]], INK, 1) + lathe(114, 360, [[zc - 30, 6], [zc - 18, 6]], v.lamps ? mo('#ffd77a') : mo('#f3a6bb'), { n: 8, top: true }))); }
    // laundry: washer, the dirty basket and the clean basket
    out.push(washerMini(v.washer));
    out.push(basketPart(56, 378, 92, 406, z, v.basket));
    out.push(basketPart(56, 410, 92, 438, z, { clean: v.folded > 0, folded: v.folded, wet: v.wetBasket }));
    // the back door to the yard, standing open
    { const y = HDP; let s = bx(96, y - 3, z, 100, y + 3, z + 128, MT.woodD, .8) + bx(132, y - 3, z, 136, y + 3, z + 128, MT.woodD, .8) + bx(96, y - 3, z + 124, 136, y + 3, z + 130, MT.woodD, .8);
      s += shape(on(PZ(z + .5), rrUV(100, y + 3, 132, y + 14, 3, 3)), '#c9bfae', .8);
      out.push(part([[96, y - 3, z], [136, y + 14, z + 130]], s)); }
    return out;
  }
  const SEATS = [[74, 174], [100, 174], [74, 222], [100, 222]];
  function washerMini(st){
    const x1 = 50, y0 = 378, y1 = 428, z = ZF[0], h = 62, m = MT.mint, prof = rrUV(y0, z + 2, y1, z + h, 4, 4);
    let s = extrude(prof, 0, x1, m, toneI);
    if (vis([1,0,0])){ const yc = (y0 + y1)/2, zc = z + 27;
      s += fill(pd(on(PX(x1), prof)), toneI([1,0,0], m)) + shape(on(PX(x1 + .2), rrUV(y0 + 3, z + h - 13, y1 - 3, z + h - 3, 2, 3)), '#fff4d6', .9);
      s += shape(on(PX(x1 + .3), rectUV(y1 - 15, z + h - 11, y1 - 5, z + h - 6)), '#5c544a', .6) + shape(on(PX(x1 + .3), ellUV(y0 + 10, z + h - 8, 3, 3, 12)), '#fff4d6', .8);
      s += shape(on(PX(x1 + .3), ellUV(yc, zc, 16.5, 16.5, 24)), '#fbf9f2', 1.2) + shape(on(PX(x1 + .4), ellUV(yc, zc, 12, 12, 22)), st.clean ? '#d5ecf3' : '#b9c6ca', 1);
      if (!st.clean) for (let i = 0; i < 3; i++) s += fill(pd(on(PX(x1 + .5), ellUV(yc - 5 + i*5, zc - 6 + (i % 2)*3, 4, 3, 8))), ['#e8574a', '#4f7fd0', '#f2c230'][i]);
      s += fill(pd(on(PX(x1 + .5), ellUV(yc - 4, zc + 5, 5, 1.4, 8))), '#ffffff', 'opacity=".7"'); }
    return part([[0, y0, z], [x1 + 1, y1, z + h]], s + hullInk([...on(PX(0), prof), ...on(PX(x1), prof)], 2));
  }
  function basketPart(x0, y0, x1, y1, z, b){
    const h = 22, cx = (x0 + x1)/2, cy = (y0 + y1)/2, A = on(PZ(z + .01), rrUV(x0 + 2, y0 + 2, x1 - 2, y1 - 2, 4, 4)), B = on(PZ(z + h), rrUV(x0, y0, x1, y1, 5, 4));
    let pile = '';
    if (b.clean){ ['#fbf9f2', '#93d3b0', '#f3a6bb', '#76a0e2', '#f2c230'].slice(0, Math.max(2, Math.min(5, b.folded || 4))).forEach((c, i) => { pile += bx(cx - 9, cy - 8, z + 6 + i*4, cx + 9, cy + 8, z + 9.6 + i*4, mo(c), .7); }); }
    else if (b.dirty){ ['#e8574a', '#4f7fd0', '#5cb87a', '#f2c230', '#fbf9f2'].forEach((c, i) => { pile += shape(flatPts(PZ(z + 8 + i*3), cx + ((i*7) % 5) - 2, cy + ((i*5) % 7) - 3, i % 2 ? H3.SHIRT : H3.PANTS, i*1.1, 2), c, .8); }); }
    for (let i = 0; i < (b.socks || 0); i++) pile += shape(flatPts(PZ(z + (b.dirty ? 24 : 7) + i*1.5), cx - 4 + i*6, cy - 3 + i*4, H3.SOCK, .8 + i, 2.1), ['#f2c230', '#e98fb0', '#76a0e2', '#5cae6a'][i % 4], .8);
    let wv = ''; for (let zz = z + 5; zz < z + h; zz += 4.6){ const k = 2*(1 - (zz - z)/h); wv += pd(on(PZ(zz), rrUV(x0 + k, y0 + k, x1 - k, y1 - k, 4.5, 4))); }
    return part([[x0, y0, z], [x1, y1, z + h + 4]], openShell(A, B, nr => toneI(nr, MT.wicker), pile) + `<path d="${wv}" fill="none" stroke="${MT.wicker.d}" stroke-width=".7" opacity=".7"/>` + ink(pd(B), 1.3) + hullInk(A.concat(B), 1.8));
  }

  /* ---------- middle floor ---------- */
  function middleWall(v){
    const z = ZF[1]; let s = '';
    // bathroom tiles, mirror, towel rail with towels
    let d = ''; for (let zz = z + 10; zz < z + 70; zz += 10) d += pd([[.3, 40, zz], [.3, 150, zz]], false); for (let y = 40; y <= 150; y += 10) d += pd([[.3, y, z], [.3, y, z + 70]], false);
    s += fill(pd(on(PX(.2), rectUV(40, z, 150, z + 70))), '#f4fafc') + `<path d="${d}" fill="none" stroke="#b7d3df" stroke-width=".8"/>`;
    s += shape(on(PX(.4), rrUV(52, z + 84, 82, z + 118, 6, 4)), '#c7dfe6', 1.1) + ink(pd(on(PX(.6), [[58, z + 108], [66, z + 115]]), false) + pd(on(PX(.6), [[60, z + 100], [72, z + 112]]), false), 1.4).replace(INK, '#ffffff');
    s += bx(0, 52, z + 78, 8, 82, z + 81, MT.white, .7);                                                  // little shelf under the mirror
    s += rod([2, 100, z + 96], [2, 146, z + 96], 1.3, MT.steel, toneI, .7) + rod([0, 100, z + 96], [3, 100, z + 96], 1.2, MT.steel, toneI, .5) + rod([0, 146, z + 96], [3, 146, z + 96], 1.2, MT.steel, toneI, .5);
    s += shape(on(PX(3), [[104, z + 97], [122, z + 97], [122, z + 64], [104, z + 64]]), '#f3a6bb', 1) + fill(pd(on(PX(3.2), rectUV(104, z + 69, 122, z + 73))), '#fff4d6');
    s += shape(on(PX(3.5), [[126, z + 97], [142, z + 97], [142, z + 70], [126, z + 70]]), '#93d3b0', 1);
    // parents: window above the bed, a shelf with a small plant
    s += windowX(198, 252, z + 76, z + 120, v, { curtains: '#d8869c' });
    // prayer corner: arched window and the wall clock (its hands are drawn in the moving layer)
    s += windowX(316, 352, z + 44, z + 100, v, { arch: true, frame: '#f3ecd8' });
    s += shape(on(PX(.5), ellUV(372, z + 88, 14, 14, 24)), '#fbf6ea', 1.3) + ink(pd(on(PX(.6), ellUV(372, z + 88, 11.5, 11.5, 20))), .5);
    let tk = ''; for (let i = 0; i < 12; i++){ const a = i*Math.PI/6, r0 = i % 3 ? 10 : 8.8; tk += pd(on(PX(.7), [[372 + r0*Math.cos(a), z + 88 + r0*Math.sin(a)], [372 + 11.3*Math.cos(a), z + 88 + 11.3*Math.sin(a)]]), false); }
    return s + ink(tk, .9);
  }
  function clockHands(d){
    const z = ZF[1] + 88, h = (d.getHours() % 12 + d.getMinutes()/60)/12*2*Math.PI, m = d.getMinutes()/60*2*Math.PI, pt = (a, r) => [.9, 372 - r*Math.sin(a), z + r*Math.cos(a)];
    return ink(pd([[.9, 372, z], pt(h, 6)], false), 1.8) + ink(pd([[.9, 372, z], pt(m, 9.2)], false), 1.2) + fill(pd(on(PX(1), ellUV(372, z, 1.3, 1.3, 8))), INK);
  }
  function middleParts(v){
    const z = ZF[1], out = [flight(1), stub(1, 40), stub(1, 150), stub(1, 300)];
    // bathroom: the basin (wudu), its tap, the brush cup with four brushes and a miswak; bath; step stool
    out.push(part([[10, 62, z], [22, 74, z + 58]], lathe(16, 68, [[z, 7], [z + 6, 5], [z + 54, 4.5], [z + 58, 6]], MT.white, { n: 14 })));
    { let s = bx(0, 50, z + 58, 32, 86, z + 69, MT.white, 1, 1.8) + shape(on(PZ(z + 69.1), rrUV(4, 54, 28, 82, 6, 4)), '#cfe4ee', .9) + fill(pd(on(PZ(z + 69.2), ellUV(16, 68, 1.5, 1.5, 8))), '#6d7679');
      s += rod([0, 68, z + 82], [9, 68, z + 82], 1.6, MT.steel, toneI, .8) + rod([9, 68, z + 82], [9, 68, z + 77], 1.3, MT.steel, toneI, .7);
      s += lathe(4, 78, [[z + 81, 3.4], [z + 90, 3.8]], mo('#93d3b0'), { inner: '#3d6b55', n: 10 });
      [['#e8574a', -1.6], ['#5b8fd6', -.5], ['#f2c230', .6], ['#e98fb0', 1.6]].forEach(([c, dy]) => { s += rope([[4, 78 + dy, z + 86], [4.5 + dy*.3, 78 + dy*1.8, z + 100]], c, 1.4); });
      s += rod([5, 80, z + 86], [7, 82, z + 101], 1.1, mo('#b88a54'), toneI, .6);                      // the miswak
      out.push(part([[0, 50, z + 58], [32, 86, z + 102]], s)); }
    { let s = '';
      const A = on(PZ(z + 4), rrUV(4, 98, 44, 146, 10, 4)), B = on(PZ(z + 34), rrUV(0, 94, 48, 150, 12, 4));
      s += openShell(A, B, nr => toneI(nr, MT.white), fill(pd(on(PZ(z + 20), rrUV(6, 100, 42, 144, 9, 4))), '#bfe3ea', 'opacity=".8"')) + ink(pd(B), 1.2) + hullInk(A.concat(B), 1.8);
      s += rod([0, 104, z + 48], [8, 104, z + 48], 1.4, MT.steel, toneI, .7) + rod([8, 104, z + 48], [8, 104, z + 42], 1.2, MT.steel, toneI, .6);
      out.push(part([[0, 94, z], [48, 150, z + 48]], s)); }
    out.push(part([[52, 58, z], [72, 82, z + 14]], bx(52, 58, z + 10, 72, 82, z + 14, MT.woodL, .9) + bx(53, 59, z, 57, 81, z + 10, MT.wood, .7) + bx(67, 59, z, 71, 81, z + 10, MT.wood, .7)));
    // Abu and Ummi's room: bed, bedside tables with lamps, Abu's prayer mat folded at the foot of the bed
    out.push(bedPart(0, 182, 112, 268, z, true, '#c9a0d8'));
    for (const y0 of [156, 272]){ let s = bx(0, y0, z, 24, y0 + 24, z + 34, MT.woodL, 1, 1.4) + lathe(12, y0 + 12, [[z + 34, 5], [z + 36, 4]], MT.woodD, { top: true, n: 10 }) +
      rod([12, y0 + 12, z + 36], [12, y0 + 12, z + 46], 1, MT.woodD, toneI, .6) + lathe(12, y0 + 12, [[z + 44, 8], [z + 56, 5]], v.lamps ? mo('#ffe08a') : mo('#fbf4e4'), { top: true, n: 12 });
      out.push(part([[0, y0, z], [24, y0 + 24, z + 56]], s)); }
    out.push(part([[92, 196, z + 29], [116, 236, z + 34]], bx(92, 198, z + 29, 114, 234, z + 32, mo('#2f6b4f'), .8) + ink(pd(on(PZ(z + 32.1), rectUV(95, 202, 111, 230))), .7).replace(INK, '#e2b24a')));
    // prayer corner: bookshelf with the Qur'an on its stand on top; rolled mats; the lantern
    { const x1 = 26, y0 = 396, y1 = 438, h = 70; let s = bx(0, y0, z, x1, y1, z + h, MT.woodD, 1, 1.8);
      if (vis([1,0,0])){ for (const [b0, b1] of [[z + 5, z + 31], [z + 36, z + 63]]) s += fill(pd(on(PX(x1 + .2), rectUV(y0 + 3, b0, y1 - 3, b1))), '#5a3a22');
        const BC = ['#3f6e5a', '#8a3b34', '#3f5d9a', '#c99555', '#5a7a3a']; let u = y0 + 4, k = 0;
        for (const w of [5, 6, 5, 7, 5, 6]){ s += shape(on(PX(x1 + .4), rectUV(u, z + 5, u + w, z + 24 + (k % 3))), BC[k++ % 5], .6); u += w + .5; }
        u = y0 + 5; for (const w of [6, 5, 6, 5]){ s += shape(on(PX(x1 + .4), rectUV(u, z + 36, u + w, z + 55 + (k % 2)*2)), BC[k++ % 5], .6); u += w + .5; } }
      const zc = z + h, yc = (y0 + y1)/2;
      s += quad([[4, yc - 12, zc], [22, yc - 12, zc], [17, yc - 12, zc + 13], [9, yc - 12, zc + 13]], toneI([0, -1, 0], MT.wood));
      s += ink(pd([[4, yc - 12, zc], [17, yc - 12, zc + 13]], false) + pd([[22, yc - 12, zc], [9, yc - 12, zc + 13]], false) + pd([[4, yc + 12, zc], [17, yc + 12, zc + 13]], false) + pd([[22, yc + 12, zc], [9, yc + 12, zc + 13]], false), 1.6);
      s += quad([[6, yc - 10, zc + 6], [6, yc + 10, zc + 6], [6, yc + 10, zc + 9], [6, yc - 10, zc + 9]], '#efe6cf') + quad([[6, yc + 10, zc + 6], [19, yc + 10, zc + 14], [19, yc + 10, zc + 17], [6, yc + 10, zc + 9]], '#efe6cf');
      s += shape([[6, yc - 10, zc + 9], [6, yc + 10, zc + 9], [19, yc + 10, zc + 17], [19, yc - 10, zc + 17]], '#2f6b4f', 1.1) + ink(pd([[8, yc - 7, zc + 10.3], [8, yc + 7, zc + 10.3], [17, yc + 7, zc + 15.7], [17, yc - 7, zc + 15.7]]), .9).replace(INK, '#e2b24a');
      out.push(part([[0, y0, z], [x1, y1, zc + 18]], s)); }
    if (!v.prayNow) out.push(part([[6, 312, z], [22, 372, z + 15]], rod([14, 314, z + 7.5], [14, 368, z + 7.5], 7.5, mo('#b5443b'), toneI, 1.1) + ink(pd(on(PY(368.2), arcUV(14, z + 7.5, 4.5, 0, 300, 10)), false), .8)));
    out.push(part([[28, 316, z], [40, 364, z + 12]], rod([34, 318, z + 6], [34, 362, z + 6], 6, mo('#3f6e5a'), toneI, 1)));
    { const zc = ZF[2] - SL, gl = v.lamps ? mo('#ffd77a') : mo('#e8c26a'); out.push(part([[72, 372, zc - 62], [88, 388, zc]], line3([[80, 380, zc], [80, 380, zc - 30]], INK, 1) +
      lathe(80, 380, [[zc - 36, 2], [zc - 30, 6]], MT.woodD, { n: 6, top: true }) + lathe(80, 380, [[zc - 58, 7], [zc - 36, 7]], gl, { n: 6 }) + lathe(80, 380, [[zc - 62, 4], [zc - 58, 8]], MT.woodD, { n: 6, top: true }))); }
    return out;
  }
  function prayerMatFlat(){
    const z = ZF[1] + .6, x0 = 36, x1 = 136, y0 = 344, y1 = 394, yc = (y0 + y1)/2;
    let s = shape(on(PZ(z), rectUV(x0, y0, x1, y1)), '#b5443b', 1.1) + ink(pd(on(PZ(z + .1), rectUV(x0 + 5, y0 + 5, x1 - 5, y1 - 5))), 1).replace(INK, '#efe0c2');
    const arch = [[x1 - 8, y0 + 12], [x0 + 30, y0 + 12], ...arcUV(x0 + 30, yc, 13, 270, 90, 10).map(([u, v2]) => [x0 + 30 - (u - (x0 + 30))*1.4, v2]).slice(1, -1), [x0 + 30, y1 - 12], [x1 - 8, y1 - 12]];
    s += shape(on(PZ(z + .15), arch), '#2f6b4f', .8) + `<path d="${star8(PZ(z + .2), x0 + 62, yc, 8)}" fill="#e2b24a" stroke="${INK}" stroke-width=".6"/>`;
    let fr = ''; for (let y = y0 + 3; y < y1; y += 4) fr += pd([[x1, y, z], [x1 + 4, y, z]], false) + pd([[x0, y, z], [x0 - 4, y, z]], false);
    return s + `<path d="${fr}" fill="none" stroke="#efe0c2" stroke-width="1"/>`;
  }

  /* ---------- top floor ---------- */
  function topWall(v){
    const z = ZF[2]; let s = '';
    // nursery: moon and stars on the wall, a window
    s += windowX(100, 146, z + 74, z + 118, v, { curtains: '#f2c230' });
    for (const [y, zz, r] of [[60, z + 120, 5], [76, z + 134, 3.5], [138, z + 140, 4]]){ let d = ''; for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, rr = k % 2 ? r*.45 : r; d += (k ? 'L' : 'M') + P(.6, y + rr*Math.cos(a), zz - rr*Math.sin(a)).map(f).join(' '); } s += `<path d="${d}Z" fill="#f2c230" stroke="${INK}" stroke-width=".7"/>`; }
    s += shape(on(PX(.6), [[88, z + 140], ...arcUV(96, z + 140, 8, 90, 270, 8)].map(p => p)), '#fff3c4', .8);
    // sister: her drawings over the desk, a window, a shelf of books
    for (const [y, zz, col] of [[172, z + 66, '#f2c230'], [190, z + 70, '#e98fb0'], [208, z + 64, '#5cae6a']]){ s += shape(on(PX(.5), rectUV(y, zz, y + 14, zz + 18)), '#fffdf6', .7) + fill(pd(on(PX(.6), ellUV(y + 7, zz + 10, 3.4, 3.4, 10))), col) + ink(pd(on(PX(.6), [[y + 3, zz + 3], [y + 11, zz + 3]]), false), .6).replace(INK, '#5cae6a'); }
    s += windowX(240, 280, z + 82, z + 122, v, { curtains: '#9a6bb8' });
    s += bx(0, 172, z + 96, 9, 226, z + 99, MT.woodL, .8); { let u = 176; ['#e8574a', '#5b8fd6', '#f2c230', '#9a6bb8', '#5cae6a'].forEach((c, i) => { s += bx(1, u, z + 99, 8, u + 4, z + 112 + (i % 2)*2, mo(c), .5); u += 4.6; }); }
    // my room: window above the bed, decorations
    s += windowX(362, 404, z + 72, z + 120, v, { curtains: '#e98fb0' });
    if (v.decor.frame){ s += shape(on(PX(.6), rectUV(410, z + 74, 436, z + 104)), '#b5784a', 1.2) + shape(on(PX(.9), rectUV(413, z + 77, 433, z + 101)), '#fbf4e4', .8) + `<path d="${star8(PX(1), 423, z + 89, 8)}" fill="#3f9c92" stroke="${INK}" stroke-width=".8"/>` + shape(on(PX(1.1), ellUV(423, z + 89, 3, 3, 10)), '#e2b24a', .6); }
    if (v.decor.garland){ const pts = []; for (let i = 0; i <= 16; i++){ const t = i/16, y = 300 + t*136; pts.push([.8, y, z + 150 - 12*Math.sin(t*Math.PI)]); }
      s += line3(pts, INK, 1); const SC = ['#f2c230', '#ef8a3c', '#93d3b0', '#f3a6bb'], byC = {};
      pts.forEach((p, i) => { if (i % 2 || i === 0 || i === 16) return; let d = ''; for (let k = 0; k < 10; k++){ const a = -Math.PI/2 + k*Math.PI/5, r = k % 2 ? 2.3 : 5.2; d += (k ? 'L' : 'M') + P(1, p[1] + r*Math.cos(a), p[2] - 6 - r*Math.sin(a)).map(f).join(' '); }
        byC[SC[(i/2) % 4]] = (byC[SC[(i/2) % 4]] || '') + d + 'Z'; });
      for (const c in byC) s += `<path d="${byC[c]}" fill="${c}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`; }
    return s;
  }
  function topParts(v){
    const z = ZF[2], out = [railingTop(2), stub(2, 40), stub(2, 160), stub(2, 290)];
    out.push(part([[110, 8, z], [128, 26, z + 34]], lathe(119, 17, [[z, 6], [z + 12, 8]], MT.pot, { inner: '#6b4a32', n: 12 }) + ball([119, 17, z + 22], 9, '#5cae6a')));
    // nursery: cot with bars, toy chest (lid open), a soft play mat
    { const x1 = 50, y0 = 52, y1 = 96; let s = bx(0, y0, z + 14, x1, y1, z + 22, MT.white, .9) + bx(0, y0, z, x1, y0 + 3, z + 50, MT.woodL, .8);
      let bars = ''; for (let x = 4; x < x1; x += 6) bars += pd([[x, y1, z + 4], [x, y1, z + 50]], false); for (let y = y0 + 6; y < y1; y += 6) bars += pd([[x1, y, z + 4], [x1, y, z + 50]], false);
      s += `<path d="${bars}" fill="none" stroke="#b5784a" stroke-width="2.2"/><path d="${bars}" fill="none" stroke="${INK}" stroke-width=".5" opacity=".6"/>`;
      s += line3([[0, y1, z + 50], [x1, y1, z + 50], [x1, y0, z + 50]], '#efcb98', 3) + ink(pd([[0, y1, z + 51.5], [x1, y1, z + 51.5], [x1, y0, z + 51.5]], false) + pd([[0, y1, z + 4], [x1, y1, z + 4], [x1, y0, z + 4]], false), 1.2);
      s = bx(0, y0 + 2, z + 22, 40, y1 - 2, z + 26, mo('#f3a6bb'), .8) + s;
      for (const [lx, ly] of [[x1 - 2, y0], [x1 - 2, y1 - 2], [0, y1 - 2]]) s += bx(lx, ly, z, lx + 2.5, ly + 2.5, z + 52, MT.woodL, .6);
      out.push(part([[0, y0, z], [x1 + .5, y1 + .5, z + 52]], s)); }
    { const x0 = 104, x1 = 136, y0 = 112, y1 = 156, h = 26, A = on(PZ(z + 1), rectUV(x0 + 1.5, y0 + 1.5, x1 - 1.5, y1 - 1.5)), B = on(PZ(z + h), rectUV(x0, y0, x1, y1));
      const TS = [['ball', '#5b8fd6', [112, 122]], ['block', '#f2c230', [126, 146]], ['ball', '#e8574a', [128, 120]], ['block', '#5cae6a', [114, 146]], ['ball', '#f2c230', [121, 134]], ['block', '#e98fb0', [130, 132]]];
      let toys = ''; for (let i = 0; i < Math.min(TS.length, 1 + (v.counts.toychest || 0)); i++){ const [k, c, [tx, ty]] = TS[i], zz = z + h - 8 + (i % 3)*2; toys += k === 'ball' ? ball([tx, ty, zz + 4], 5.5, c) : rbx(tx, ty, zz - 2, 9, 9, 9, i*.5, mo(c), .8); }
      let s = openShell(A, B, nr => toneI(nr, MT.blue), toys);
      if (vis([1,0,0])) s += `<path d="${star8(PX(x1 + .2), (y0 + y1)/2, z + 13, 7)}" fill="#f2c230" stroke="${INK}" stroke-width=".7"/>`;
      s += ink(pd(B), 1.2) + hullInk(A.concat(B), 1.8);
      const L = [[x0, y0, z + h], [x0, y1, z + h], [x0 - 22, y1, z + h + 18], [x0 - 22, y0, z + h + 18]];
      out.push(part([[x0 - 22, y0, z], [x1, y1, z + h + 18]], quad(L, toneI([.6, 0, .8], MT.blue)) + ink(pd(L), 1) + s)); }
    // sister's room: desk with lamp and chair, her bed
    { let s = bx(0, 172, z + 40, 36, 228, z + 44, MT.woodL, 1, 1.4) + bx(0, 172, z, 34, 176, z + 40, MT.woodL, .7) + bx(0, 224, z, 34, 228, z + 40, MT.woodL, .7);
      s += lathe(8, 180, [[z + 44, 4], [z + 46, 3]], MT.woodD, { top: true, n: 10 }) + rope([[8, 180, z + 46], [10, 182, z + 60], [16, 186, z + 62]], '#3f9c92', 1.2) + lathe(17, 187, [[z + 56, 6], [z + 62, 3]], v.lamps ? mo('#ffe08a') : mo('#3f9c92'), { top: true, n: 10 });
      s += lathe(28, 220, [[z + 44, 3], [z + 52, 3.4]], mo('#e8574a'), { inner: '#5a3a22', n: 10 }) + rope([[28, 219, z + 51], [30, 218, z + 58]], '#f2c230', 1) + rope([[28, 221, z + 51], [26, 222, z + 57]], '#5b8fd6', 1);
      for (let i = 0; i < (v.counts.desk || 0) + 1; i++) s += bx(6, 196, z + 44 + i*3.6, 26, 212, z + 47.4 + i*3.6, mo(['#fbf4e4', '#5b8fd6', '#e98fb0', '#f2c230'][i % 4]), .6);
      out.push(part([[0, 172, z], [36, 228, z + 62]], s));
      out.push(part([[42, 190, z], [58, 210, z + 52]], bx(42, 190, z + 24, 58, 210, z + 28, mo('#9a6bb8'), .9) + bx(42, 190, z + 28, 45, 210, z + 52, mo('#9a6bb8'), .9) + bx(54, 191, z, 57, 194, z + 24, MT.woodD, .5) + bx(54, 206, z, 57, 209, z + 24, MT.woodD, .5))); }
    out.push(bedPart(0, 238, 104, 284, z, v.bedS !== false, '#e98fb0', { hb: 46 }));
    // my room: wardrobe, bookshelf against the wall stub, bed, decorations
    { let s = bx(0, 296, z + 3, 40, 342, z + 136, MT.woodL, 1, 2.2) + bx(-1, 294, z + 136, 43, 344, z + 141, MT.woodD, .9);
      if (vis([1,0,0])){ s += ink(pd([[40.2, 319, z + 6], [40.2, 319, z + 132]], false) + pd([[40.2, 298, z + 24], [40.2, 340, z + 24]], false), 1.1);
        for (const y of [316, 322]) s += shape(on(PX(40.4), ellUV(y, z + 78, 1.8, 1.8, 10)), '#b5784a', .6); }
      out.push(part([[-1, 294, z], [43, 344, z + 141]], s)); }
    out.push(shelfBooks(64, 118, z, 64, 316, [[4, 22], [26, 44], [48, 62]], v.counts.shelfB || 0));
    out.push(...[bedPart(0, 352, 112, 420, z, v.bed, '#76a0e2', { dots: true })]);
    if (v.decor.cushion && v.bed) out.push(part([[84, 396, z + 29], [108, 418, z + 39]], rbx(96, 406, z + 29, 17, 17, 7, .35, PALS.mustard, .9) + shape(on(PZ(z + 36.2), ellUV(96, 406, 2, 2, 8)), '#ef8a3c', .6)));
    if (v.decor.lamp) out.push(part([[14, 342, z], [34, 362, z + 80]], lathe(24, 352, [[z, 7], [z + 3, 6]], MT.woodD, { top: true, n: 12 }) + rod([24, 352, z + 3], [24, 352, z + 66], 1.3, MT.woodD, toneI, .7) +
      lathe(24, 352, [[z + 62, 11], [z + 80, 7]], v.lamps ? mo('#ffe08a') : mo('#f3a6bb'), { top: v.lamps ? '#fff6d0' : true, n: 14 })));
    if (v.decor.plant){ let s = lathe(128, 428, [[z, 7], [z + 16, 9.5], [z + 18, 10]], MT.pot, { inner: '#6b4a32', n: 14 });
      for (const [a, h] of [[-.6, 30], [.5, 34], [1.6, 28], [2.6, 32], [3.7, 27], [4.9, 31]]){ const tip = [128 + 11*Math.cos(a), 428 + 11*Math.sin(a), z + h + 14];
        s += shape([[128, 428, z + 17], [128 + 6*Math.cos(a + .5), 428 + 6*Math.sin(a + .5), z + 18 + h*.6], tip, [128 + 6*Math.cos(a - .5), 428 + 6*Math.sin(a - .5), z + 18 + h*.6]], a > 2 ? '#5cae6a' : '#4b9a5a', .8); }
      out.push(part([[118, 418, z], [140, 440, z + 50]], s)); }
    return out;
  }
  function rugFlat(){
    const z = ZF[2] + .5, cx = 92, cy = 340;
    return shape(on(PZ(z), rrUV(50, 322, 134, 360, 8, 4)), '#e98f6b', 1.1) + ink(pd(on(PZ(z + .1), rrUV(55, 327, 129, 355, 6, 4))), 1).replace(INK, '#fbe6c8') +
      `<path d="${star8(PZ(z + .2), cx, cy, 14)}" fill="#f2c230" stroke="${INK}" stroke-width=".7"/>` + shape(on(PZ(z + .3), ellUV(cx, cy, 5, 5, 12)), '#3f9c92', .7);
  }

  /* ---------- the yard and the front path ---------- */
  const PLOTS = [0, 1, 2, 3].map(i => ({ id: 'plot' + i, x: 60 + (i % 2)*30, y: 456 + Math.floor(i/2)*40, w: 26, d: 36 }));
  const LINE = { x: 76, y0: 552, y1: 606, z: 88, slots: [562, 576, 590] };
  const CAN = [112, 548];
  function crop(p, st){            // st: {stage 0..3, kind, thirsty}
    const cx = p.x + p.w/2, cy = p.y + p.d/2, z = 12; let s = '';
    if (!st || st.stage == null || st.stage < 0) return '';
    if (st.stage === 0){ for (const [dx, dy] of [[-6, -8], [5, 0], [-4, 9]]) s += fill(pd(on(PZ(z + .4), ellUV(cx + dx, cy + dy, 1.6, 1.2, 6))), '#5e3f2a'); return s; }
    const g = st.thirsty ? '#c4b66a' : '#4fa65c', g2 = st.thirsty ? '#d3c27d' : '#6cc070', h = [0, 7, 14, 20][st.stage];
    for (const [dx, dy] of [[-6, -9], [6, 0], [-5, 10]]){ const x = cx + dx, y = cy + dy;
      for (let i = 0; i < 3 + st.stage; i++){ const a = i*2.1 + dx, tip = st.thirsty ? [x + 7*Math.cos(a), y + 7*Math.sin(a), z + 2] : [x + 4*Math.cos(a), y + 4*Math.sin(a), z + h];
        s += shape([[x, y, z], [x + 2*Math.cos(a + 1), y + 2*Math.sin(a + 1), z + h*.5 + 1], tip, [x + 2*Math.cos(a - 1), y + 2*Math.sin(a - 1), z + h*.5 + 1]], i % 2 ? g : g2, .6); }
      if (st.stage === 3 && !st.thirsty) s += ball([x + 2, y, z + h*.55], 2.8, { carrot: '#ef8a3c', tomato: '#e8574a', lettuce: '#93c25c', onion: '#c98e62', beans: '#5cae6a', pumpkin: '#f2a03c' }[st.kind] || '#e8574a'); }
    return s;
  }
  function yard(v){
    const z0 = 0, gz = 6, out = [];
    let s = '';
    // ground: grass for the yard, paving for the front path, both little slabs
    const YX0 = LOT[0][0], YX1 = LOT[1][0], YY1 = LOT[1][1];
    if (vis([1,0,0])) s += quad([[YX1, YY, z0], [YX1, YY1, z0], [YX1, YY1, gz], [YX1, YY, gz]], toneI([1,0,0], MT.soil));
    if (vis([0,1,0])) s += quad([[YX0, YY1, z0], [YX1, YY1, z0], [YX1, YY1, gz], [YX0, YY1, gz]], toneI([0,1,0], MT.soil));
    s += fill(pd(on(PZ(gz), rectUV(YX0, YY, YX1, YY1))), MT.grass.l);
    let tf = ''; for (let i = 0; i < 46; i++){ const x = YX0 + 8 + (i*53 % (YX1 - YX0 - 16)), y = YY + 6 + (i*37 % (YY1 - YY - 12)); if (x > 50 && x < 124 && y < 540) continue; if (x > 124 && y < 512) continue;
      tf += pd([[x, y, gz], [x - 1, y - 1, gz + 4]], false) + pd([[x, y, gz], [x + 1.5, y + 1, gz + 5]], false); }
    s += `<path d="${tf}" fill="none" stroke="#5f9a46" stroke-width="1" stroke-linecap="round"/>`;
    s += ink(pd([[YX1, YY, gz], [YX1, YY1, gz], [YX0, YY1, gz]], false), 1.4) + ink(pd([[YX1, YY, z0], [YX1, YY1, z0], [YX0, YY1, z0]], false) + pd([[YX1, YY1, z0], [YX1, YY1, gz]], false), 1.6);
    // front path: paving slabs with joints
    const FX0 = HW, pz = 4;
    if (vis([1,0,0])) s += quad([[YX1, LOT[0][1], z0], [YX1, YY, z0], [YX1, YY, pz], [YX1, LOT[0][1], pz]], toneI([1,0,0], MT.pave));
    s += fill(pd(on(PZ(pz), rectUV(FX0, LOT[0][1], YX1, YY))), MT.pave.l);
    let jn = ''; for (let y = LOT[0][1] + 24; y < YY; y += 24) jn += pd([[FX0, y, pz], [YX1, y, pz]], false); jn += pd([[FX0 + 30, LOT[0][1], pz], [FX0 + 30, YY, pz]], false);
    s += `<path d="${jn}" fill="none" stroke="#bfb4a0" stroke-width=".9"/>` + ink(pd([[YX1, LOT[0][1], pz], [YX1, YY, pz]], false), 1.4) + ink(pd([[YX1, LOT[0][1], z0], [YX1, YY, z0]], false), 1.6);
    // the curb spot, painted on the path's outer edge
    s += ink(pd(on(PZ(pz + .1), rectUV(176, 4, 198, 60))), 1).replace(INK, '#9a8f7c');
    // shed with a pitched roof
    { const x0 = -24, x1 = 28, y0 = 452, y1 = 500, h = 64; let sh = bx(x0, y0, gz, x1, y1, gz + h, mo('#93c2a8'), 1, 2);
      if (vis([1,0,0])) sh += shape(on(PX(x1 + .2), rectUV(462, gz, 486, gz + 50)), '#6d9c84', 1) + shape(on(PX(x1 + .4), ellUV(482, gz + 26, 1.5, 1.5, 8)), '#f2c230', .6);
      if (vis([0,1,0])) sh += shape(on(PY(y1 + .2), rectUV(x0 + 14, gz + 30, x0 + 34, gz + 48)), v.sky, .9);
      const R1 = [[x0 - 4, y0 - 4, gz + h], [x0 - 4, y1 + 4, gz + h], [(x0 + x1)/2, y1 + 4, gz + h + 24], [(x0 + x1)/2, y0 - 4, gz + h + 24]], R2 = [[x1 + 4, y0 - 4, gz + h], [x1 + 4, y1 + 4, gz + h], [(x0 + x1)/2, y1 + 4, gz + h + 24], [(x0 + x1)/2, y0 - 4, gz + h + 24]];
      if (vis([0,1,0])) sh += shape([[x0, y1, gz + h], [x1, y1, gz + h], [(x0 + x1)/2, y1, gz + h + 24]], toneI([0,1,0], mo('#93c2a8')), 1);
      sh += shape(R1, toneI([-.7, 0, .7], MT.roof), 1.2) + shape(R2, toneI([.7, 0, .7], MT.roof), 1.2);
      out.push(part([[x0 - 4, y0 - 4, gz], [x1 + 4, y1 + 4, gz + h + 24]], sh)); }
    // vegetable bed with 4 plots
    { let sb = bx(56, 452, gz, 118, 536, gz + 6, MT.woodL, 1, 1.4);
      for (const p of PLOTS){ sb += fill(pd(on(PZ(gz + 6.1), rectUV(p.x, p.y, p.x + p.w, p.y + p.d))), '#9a6a44'); let fu = ''; for (let y = p.y + 6; y < p.y + p.d; y += 7) fu += pd([[p.x + 2, y, gz + 6.2], [p.x + p.w - 2, y, gz + 6.2]], false);
        sb += `<path d="${fu}" fill="none" stroke="#7a5233" stroke-width=".9"/>`;
        if (!v.plots[p.id] || v.plots[p.id].stage < 0) sb += rod([p.x + p.w - 4, p.y + 4, gz + 6], [p.x + p.w - 4, p.y + 4, gz + 20], .8, MT.woodD, toneI, .6) + shape(on(PX(p.x + p.w - 3.5), rectUV(p.y + 1, gz + 14, p.y + 9, gz + 21)), '#fbf4e4', .6); }
      for (const p of PLOTS) sb += crop(p, v.plots[p.id]);
      out.push(part([[56, 452, gz], [118, 536, gz + 30]], sb)); }
    // tree with a bird feeder
    { const tx = 4, ty = 578; let tr = rod([tx, ty, gz], [tx, ty, gz + 96], 7, mo('#9a6a44'), toneI, 1.4) + rod([tx, ty, gz + 70], [tx + 22, ty - 20, gz + 104], 3, mo('#9a6a44'), toneI, 1);
      const fx = tx + 26, fy = ty - 24, fz = gz + 86;
      tr += line3([[fx, fy, fz + 18], [fx, fy, fz + 10]], INK, .9) + bx(fx - 6, fy - 6, fz, fx + 6, fy + 6, fz + 2, MT.woodL, .7) + bx(fx - 4, fy - 4, fz + 2, fx + 4, fy + 4, fz + 7, mo('#fbf4e4'), .6) +
        quad([[fx - 7, fy - 7, fz + 7], [fx + 7, fy - 7, fz + 7], [fx, fy, fz + 12], [fx - 7, fy + 7, fz + 7]], toneI([0,0,1], MT.roof)) + ink(pd([[fx - 7, fy - 7, fz + 7], [fx + 7, fy - 7, fz + 7], [fx + 7, fy + 7, fz + 7], [fx - 7, fy + 7, fz + 7], [fx - 7, fy - 7, fz + 7]], false) + pd([[fx - 7, fy - 7, fz + 7], [fx, fy, fz + 12], [fx + 7, fy + 7, fz + 7]], false), .8);
      if (v.bird){ const bq = P(fx + 6, fy + 2, fz + 4); tr += `<path d="M${f(bq[0] - 4)} ${f(bq[1])}q4 -6 9 -1q3 -3 5 -1l-4 2q-2 5 -9 3z" fill="#5b8fd6" stroke="${INK}" stroke-width=".8"/>`; }
      const leaves = [[0, 0, 120, 30], [-18, 16, 112, 24], [16, -14, 116, 26], [6, 10, 140, 24], [-8, -10, 136, 22]];
      for (const [dx, dy, zz, r] of leaves) tr += ball([tx + dx, ty + dy, gz + zz], r, ['#5cae6a', '#4fa05e', '#6cc070', '#5cae6a', '#4b9a5a'][(dx + 30) % 5 | 0]);
      out.push(part([[tx - 40, ty - 40, gz], [tx + 40, ty + 34, gz + 168]], tr)); }
    // clothesline: two posts and the line, with whatever is hanging
    { let cl = rod([LINE.x, LINE.y0, gz], [LINE.x, LINE.y0, gz + LINE.z + 4], 1.8, MT.steel, toneI, .8) + rod([LINE.x, LINE.y1, gz], [LINE.x, LINE.y1, gz + LINE.z + 4], 1.8, MT.steel, toneI, .8);
      cl += line3([[LINE.x, LINE.y0, gz + LINE.z], [LINE.x, (LINE.y0 + LINE.y1)/2, gz + LINE.z - 3], [LINE.x, LINE.y1, gz + LINE.z]], INK, .9);
      (v.line || []).forEach((h, i) => { if (h) cl += hanging(LINE.x + .5, LINE.slots[i], gz + LINE.z - 2, h.g, h.col, h.wet); });
      out.push(part([[LINE.x - 2, LINE.y0 - 2, gz], [LINE.x + 2, LINE.y1 + 2, gz + LINE.z + 4]], cl)); }
    // swing: an A-frame with a seat on two ropes
    { const sx0 = 140, sx1 = 176, ya = 540, yb = 598, top = gz + 96; let sw = '';
      for (const y of [ya, yb]) sw += rod([sx0, y, gz], [(sx0 + sx1)/2, y, top], 2.2, MT.woodD, toneI, .9) + rod([sx1, y, gz], [(sx0 + sx1)/2, y, top], 2.2, MT.woodD, toneI, .9);
      sw += rod([(sx0 + sx1)/2, ya, top], [(sx0 + sx1)/2, yb, top], 2.4, MT.woodD, toneI, 1);
      const sxm = (sx0 + sx1)/2, ss = 0, sz = gz + 26;
      if (v.swing !== 'dyn') sw += line3([[sxm, 560, top], [sxm + ss, 560, sz]], INK, 1) + line3([[sxm, 578, top], [sxm + ss, 578, sz]], INK, 1) + bx(sxm + ss - 5, 558, sz - 2, sxm + ss + 5, 580, sz, mo('#e8574a'), .9);
      out.push(part([[sx0, ya - 2, gz], [sx1, yb + 2, top + 3]], sw)); }
    // sandpit with a bucket and spade
    { let sp = bx(128, 452, gz, 188, 506, gz + 7, MT.woodL, 1, 1.4) + fill(pd(on(PZ(gz + 7.1), rectUV(131, 455, 185, 503))), MT.sand.l);
      sp += fill(pd(on(PZ(gz + 7.3), ellUV(150, 476, 9, 6, 12))), MT.sand.m) + lathe(168, 490, [[gz + 7, 4], [gz + 15, 5.4]], mo('#e8574a'), { inner: '#c9473a', n: 12 }) + rod([142, 492, gz + 8], [150, 497, gz + 16], .9, mo('#f2c230'), toneI, .6) + rbx(141, 491, gz + 7.2, 6, 5, 1.2, .5, mo('#f2c230'), .5);
      if (v.castle) sp += lathe(156, 470, [[gz + 7, 8], [gz + 14, 7], [gz + 14, 5], [gz + 20, 4]], MT.sand, { top: true, n: 8 });
      out.push(part([[128, 452, gz], [188, 506, gz + 20]], sp)); }
    out.push(prayerGarden(v.pgarden));
    // the ball
    if (!v.ballHeld) out.push(part([[v.ballAt[0] - 8, v.ballAt[1] - 8, gz], [v.ballAt[0] + 8, v.ballAt[1] + 8, gz + 16]], ball([v.ballAt[0], v.ballAt[1], gz + 8], 8, '#ef6a4c') + `<path d="${pd(on(PX(v.ballAt[0] + 4), arcUV(v.ballAt[1], gz + 8, 7.2, 200, 340, 6)), false)}" fill="none" stroke="#fff4d6" stroke-width="1.6"/>`));
    // watering can
    if (v.tools.can) { const t = tool('can', CAN[0], CAN[1], gz); out.push(part(t.box, t.svg)); }
    // a low fence on the street sides, with a gate gap
    { let fc = '', rails = []; const post = (x, y) => { fc += pd([[x, y, gz], [x, y, gz + 22]], false); };
      for (let x = YX0; x <= YX1; x += 14) post(x, YY1 - 1); for (let y = YY + 4; y < YY1; y += 14) if (y < 515 || y > 548) post(YX1 - 1, y);
      out.push(part([[YX0, YY1 - 2, gz], [YX1, YY1, gz + 22]], `<path d="${fc}" fill="none" stroke="#8e6236" stroke-width="2.6"/>` + rope([[YX0, YY1 - 1, gz + 17], [YX1, YY1 - 1, gz + 17]], '#c99555', 1.6) + rope([[YX0, YY1 - 1, gz + 8], [YX1, YY1 - 1, gz + 8]], '#c99555', 1.6)));
      out.push(part([[YX1 - 2, YY, gz], [YX1, YY1 - 2, gz + 22]], rope([[YX1 - 1, YY + 4, gz + 17], [YX1 - 1, 515, gz + 17]], '#c99555', 1.6) + rope([[YX1 - 1, 548, gz + 17], [YX1 - 1, YY1, gz + 17]], '#c99555', 1.6))); }
    // the wheelie bins, home by the house or out at the curb
    for (const [i, col] of [[0, '#5b8fd6'], [1, '#5f8f5a']]){ if (v.binsHidden && v.binsHidden[i]) continue; const atCurb = v.bins && v.bins[i], x = atCurb ? 178 : 146, y = 6 + i*28;
      out.push(part([[x, y, 4], [x + 20, y + 24, 46]], bx(x, y, 4, x + 18, y + 22, 40, mo(col), 1, 1.8) + bx(x - 1, y - 1, 40, x + 20, y + 23, 44, mo(mix(col, '#000000', .2)), .9) + ball([x + 3, y + 3, 7], 3, '#3d3935') + ball([x + 3, y + 19, 7], 3, '#3d3935'))); }
    return s + `<g opacity=".4">${[[-24, 452, 28, 500, 70], [140, 540, 176, 598, 90], [-30, 548, 40, 610, 110]].map(([x0, y0, x1, y1, h]) => castShadow([[x0,y0,gz],[x1,y0,gz],[x0,y1,gz],[x1,y1,gz],[x0,y0,gz+h],[x1,y1,gz+h]], gz)).join('')}</g>` + byDepth(out);
  }

  /* ---------- the whole static scene ---------- */
  // loose things on a floor: flat ones on the floor are drawn under everything; things on furniture sort with it
  function messOn(fl, v, out){ let flat = ''; for (const it of v.mess) if (it.fl === fl && !it.hang){ const p = mess(it); if (p.flat && !it.onTop) flat += p.svg; else out.push(p); } return flat; }
  // the prayer garden: a planter by the front path, a flower for each prayer prayed this week (nothing wilts)
  const PCOL = ['#f3a6bb', '#f2c230', '#ef8a3c', '#e8574a', '#76a0e2'];
  function prayerGarden(rows){
    const x0 = 150, x1 = 196, y0 = 372, y1 = 434, z = 4, h = 10, out = [];
    let s = bx(x0, y0, z, x1, y1, z + h, MT.woodL, 1, 1.4) + fill(pd(on(PZ(z + h + .1), rectUV(x0 + 2, y0 + 2, x1 - 2, y1 - 2))), '#9a6a44');
    (rows || []).forEach((r, di) => r.forEach((st, pi) => { if (!st) return; const x = x0 + 6 + pi*8.6, y = y0 + 5 + di*8.4, zz = z + h, fh = 5 + (di === rows.length - 1 ? 3 : 0);
      s += line3([[x, y, zz], [x, y, zz + fh]], '#4f8f4a', 1.1) + ball([x, y, zz + fh + 1.6], st === 2 ? 2.6 : 2, PCOL[pi]) + (st === 2 ? ball([x + 1.6, y - 1, zz + fh - 1.5], 1.2, '#5cae6a') : ''); }));
    return part([[x0, y0, z], [x1, y1, z + h + 12]], s);
  }
  function scene(v){
    let s = '';
    const st = v.street || { back: '', front: '' };
    s += st.back;
    s += castShadow([[-T, -T, 0], [HW, -T, 0], [HW, HDP, 0], [-T, HDP, 0], [-T, HDP, 100], [HW, HDP, 100], [-T, -T, 100]], 0).replace('<path', '<path opacity=".55"');
    s += slabFaces(0, SL, MT.base);
    // ground floor
    s += walls(0) + floors(0) + groundWall(v) + shape(on(PZ(ZF[0] + .5), rrUV(42, 40, 64, 82, 3, 3)), '#5cae6a', .9) + shape(on(PZ(ZF[0] + .5), rrUV(46, 280, 124, 366, 8, 3)), '#e9b7a0', 1);
    s += shadowsOn(ZF[0], [[0, 116, 46, 196, 72], [0, 200, 44, 240, 112], [62, 160, 112, 236, 60], [0, 268, 24, 318, 104], [0, 378, 50, 428, 62], [56, 296, 110, 348, 22], [30, 0, 136, 34, 120]]);
    const g0 = groundParts(v); s += messOn(0, v, g0) + byDepth(g0.concat(v.fam ? v.fam(0) : []));
    // floors above the room the child is looking into fade to a ghost (as Colorfigures' see-through does), so the
    // slab and the rooms on top never hide what needs doing; v.ghostAbove = that room's floor
    const gA = v.ghostAbove, ghost = (fl, str) => gA != null && fl > gA ? `<g opacity=".2">${str}</g>` : str;
    let m1 = '', m2 = '', rf = '';
    // middle floor
    m1 += slabFaces(ZF[1] - SL, ZF[1], MT.slab) + walls(1) + floors(1) + middleWall(v);
    if (v.prayNow) m1 += prayerMatFlat();
    m1 += shape(on(PZ(ZF[1] + .5), rrUV(52, 96, 76, 146, 3, 3)), '#93d3b0', .8);
    m1 += shadowsOn(ZF[1], [[0, 50, 32, 86, 70], [0, 94, 48, 150, 34], [0, 182, 112, 268, 30], [0, 396, 26, 438, 88], [30, 0, 136, 34, 120]]);
    const g1 = middleParts(v); m1 += messOn(1, v, g1) + byDepth(g1.concat(v.fam ? v.fam(1) : []));
    // top floor
    m2 += slabFaces(ZF[2] - SL, ZF[2], MT.slab) + walls(2) + floors(2) + topWall(v);
    if (v.decor.rug) m2 += rugFlat();
    m2 += shape(on(PZ(ZF[2] + .5), ellUV(80, 104, 30, 22, 20)), '#bfe3d0', 1);
    m2 += shadowsOn(ZF[2], [[0, 52, 50, 96, 52], [104, 112, 136, 156, 26], [0, 172, 36, 228, 44], [0, 238, 104, 284, 30], [0, 296, 40, 342, 140], [0, 352, 112, 420, 30]]);
    const g2 = topParts(v); m2 += messOn(2, v, g2) + byDepth(g2.concat(v.fam ? v.fam(2) : []));
    // roof trim and chimney
    rf += bx(-T - 3, -T - 3, ZTOP, 3, HDP + 3, ZTOP + 7, MT.roof, 1.1) + bx(3, -T - 3, ZTOP, HW + 3, 3, ZTOP + 7, MT.roof, 1.1);
    rf += bx(-14, 60, ZTOP + 7, 2, 86, ZTOP + 46, mo('#c9694c'), 1, 1.8) + bx(-16, 58, ZTOP + 46, 4, 88, ZTOP + 51, MT.roof, .9);
    s += ghost(1, m1) + ghost(2, m2) + ghost(3, rf);
    if (gA == null) s += hullInk([[-T, -T, 0], [HW, -T, 0], [HW, HDP, 0], [-T, HDP, 0], [-T, -T, ZTOP], [HW, -T, ZTOP], [-T, HDP, ZTOP]], 2.8);
    // the yard and the front path (in front of the house's left side), then the family outside, then the street in front
    const yy = []; s += messOn(-1, v, yy);
    s += yard(v) + (yy.length ? byDepth(yy) : '') + (v.fam ? byDepth(v.fam(-1)) : '');
    s += st.front;
    return s;
  }

  /* ---------- anchors (targets, stations, tools, decorations), rooms, regions ---------- */
  const A = {
    // containers the hand puts things in
    basket: [74, 392, ZF[0] + 20], wardrobe: [40, 319, ZF[2] + 70], toychest: [120, 134, ZF[2] + 26], shelfB: [91, 316, ZF[2] + 36], rack: [23, 180, ZF[0] + 84],
    shoerack: [11, 99, ZF[0] + 22], peg: [6, 106, ZF[0] + 86], recycle: [11, 251, ZF[0] + 26], general: [33, 251, ZF[0] + 26], table: [87, 198, ZF[0] + 60],
    bag: [70, 61, ZF[0] + 16], desk: [18, 204, ZF[2] + 46], line: [LINE.x, 578, LINE.z], cleanBasket: [74, 424, ZF[0] + 20], curb0: [187, 18, 30], curb1: [187, 46, 30],
    // stations and things to tap
    washer: [50, 403, ZF[0] + 30], basin: [16, 68, ZF[1] + 70], brushes: [4, 78, ZF[1] + 92], mat: [80, 368, ZF[1] + 4], clock: [1, 372, ZF[1] + 88],
    bed: [70, 386, ZF[2] + 30], bedS: [60, 261, ZF[2] + 28], window: [0, 383, ZF[2] + 100], swing: [158, 569, 30], sandpit: [156, 478, 12], ball: [166, 524, 14], feeder: [30, 554, 92],
    bin0: [155, 17, 26], bin1: [155, 45, 26], bookcase: [12, 318, ZF[0] + 50], fridge: [44, 220, ZF[0] + 80],
    // tools at home
    can: [CAN[0], CAN[1], 16], cloth: [42, 124, ZF[0] + 78], broom: [102, 44, ZF[0] + 40],
    // My Room decorations
    rug: [92, 340, ZF[2]], lamp: [24, 352, ZF[2] + 60], cushion: [96, 406, ZF[2] + 34], plant: [128, 428, ZF[2] + 26], frame: [1, 423, ZF[2] + 89], garland: [1, 368, ZF[2] + 142],
  };
  PLOTS.forEach(p => { A[p.id] = [p.x + p.w/2, p.y + p.d/2, 14]; });
  const FOCUS = { hall: [70, 60, ZF[0] + 50], kitchen: [70, 190, ZF[0] + 45], living: [70, 318, ZF[0] + 40], laundry: [60, 408, ZF[0] + 40], bath: [40, 92, ZF[1] + 50],
    parents: [60, 226, ZF[1] + 40], prayer: [60, 372, ZF[1] + 45], nursery: [60, 100, ZF[2] + 40], sister: [50, 226, ZF[2] + 40], myroom: [60, 370, ZF[2] + 40], yard: [80, 530, 30] };
  const BOX = id => { const r = ROOMS[id]; return r.fl < 0 ? [[LOT[0][0], YY, 0], [LOT[1][0], LOT[1][1], 110]] : [[0, r.y0, ZF[r.fl]], [HW, r.y1, ZF[r.fl] + FH*.72]]; };
  function roomFaces(id){
    const r = ROOMS[id];
    if (r.fl < 0) return null;
    const z0 = ZF[r.fl], z1 = z0 + FH, fs = [[[0, r.y0, z0], [HW, r.y0, z0], [HW, r.y1, z0], [0, r.y1, z0]], [[0, r.y0, z0], [0, r.y1, z0], [0, r.y1, z1], [0, r.y0, z1]]];
    if (r.y0 === 0) fs.push([[0, 0, z0], [HW, 0, z0], [HW, 0, z1], [0, 0, z1]]);
    return fs;
  }
  function roomPath(id){ const fs = roomFaces(id); if (!fs){ const pts = []; const B = BOX(id); for (const x of [B[0][0], B[1][0]]) for (const y of [B[0][1], B[1][1]]) for (const z of [0, 60]) pts.push(P(x, y, z)); return sp(hull(pts)); } return fs.map(fc => pd(fc)).join(''); }
  function abovePath(fl){
    if (fl >= 2) return '';
    const z = fl < 0 ? ZF[0] - SL : ZF[fl + 1] - SL, pts = [];
    for (const x of [-T, HW]) for (const y of [-T, HDP]) for (const zz of [z, ZTOP + 50]) pts.push(P(x, y, zz));
    return sp(hull(pts));
  }
  const inside = (poly, X, Y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j];
    if ((a[1] > Y) !== (b[1] > Y) && X < (b[0] - a[0])*(Y - a[1])/(b[1] - a[1]) + a[0]) c = !c; } return c; };
  function inRoomPoly(id, X, Y){
    const r = ROOMS[id], fs = roomFaces(id);
    if (!fs){ const B = BOX(id), pts = []; for (const x of [B[0][0], B[1][0]]) for (const y of [B[0][1], B[1][1]]) for (const z of [0, 110]) pts.push(P(x, y, z)); return inside(hull(pts), X, Y); }
    if (!fs.some(fc => inside(fc.map(p => P(...p)), X, Y))) return false;
    if (r.fl >= 2) return true;
    const z = ZF[r.fl + 1] - SL, pts = []; for (const x of [-T, HW]) for (const y of [-T, HDP]) for (const zz of [z, ZTOP + 50]) pts.push(P(x, y, zz));
    return !inside(hull(pts), X, Y);
  }
  const BOUNDS = [[LOT[0][0] - 10, LOT[0][1] - 4, 0], [LOT[1][0], LOT[1][1], ZTOP + 52]];

  window.HD = {
    HW, HDP, T, SL, FH, ZF, ZTOP, LOT, YY, BOUNDS, A, ROOMS, FOCUS, BOX, PLOTS, LINE, CAN, SEATS, DECOR,
    scene, clockHands, roomPath, abovePath, inRoomPoly, messBox: it => mess(it).box, messPart: mess, tool,
    SCALE: 'about 1 unit = 1.6 cm: a door is 48 x 124; floors are 176 high; an adult is about 115, a child about 80',
  };
})();
