/* Helping Home world: things and places (window.WP). Data first: every place is a list of rooms, low walls, things with
   their standing/sitting places (slots) and doors to other places. Drawing uses the Colorfigures engine and house/kit3d.js.
   A thing type: { w, d, h, solid, draw(D, o), slots:[[u, v, face, poses, on?, z?]], use:{...} }  (u = depth, v = width)
   o.sw swaps the two ground axes, so one drawing serves both back walls. */
(function () {
  'use strict';
  const C = { wood: '#d9a86c', woodL: '#efcb98', woodD: '#a8744b', white: '#fbf6ea', dark: '#3d3935', red: '#e8574a', blue: '#5b8fd6', green: '#5cae6a',
    yellow: '#f2c230', teal: '#3f9c92', purple: '#8a63ad', pink: '#ee8fa8', grey: '#c9d0d6', cream: '#f4ead6', brick: '#d1704d', leaf: '#86b96a', soil: '#a8744b', glass: '#cfe2ea', gold: '#e2b14a' };
  const mo = matOf;
  function ctxAt(x, y, sw){
    const T = (u, v) => sw ? [x + v, y + u] : [x + u, y + v];
    const D = { T, sw,
      b(u0, v0, z0, u1, v1, z1, c, w){ const a = T(u0, v0), e = T(u1, v1); return H3.bx(Math.min(a[0], e[0]), Math.min(a[1], e[1]), z0, Math.max(a[0], e[0]), Math.max(a[1], e[1]), z1, mo(c), w == null ? .9 : w); },
      l(u, v, prof, c, o){ const p = T(u, v); return H3.lathe(p[0], p[1], prof, mo(c), o || { top: true, n: 14 }); },
      flat(u0, v0, u1, v1, z, c, w){ const a = T(u0, v0), e = T(u1, v1); return shape(on(PZ(z), rectUV(a[0], a[1], e[0], e[1])), c, w == null ? .8 : w); },
      ell(u, v, ru, rv, z, c, w){ const p = T(u, v); return shape(on(PZ(z), ellUV(p[0], p[1], sw ? rv : ru, sw ? ru : rv, 22)), c, w == null ? .8 : w); },
      ball(u, v, z, r, c){ const p = T(u, v); return H3.ball([p[0], p[1], z], r, c); },
      front(u, v0, z0, v1, z1, c, w){ return shape(sw ? on(PY(y + u), rectUV(x + v0, z0, x + v1, z1)) : on(PX(x + u), rectUV(y + v0, z0, y + v1, z1)), c, w == null ? .7 : w); },
      frontEll(u, v, z, r, c, w){ return shape(sw ? on(PY(y + u), ellUV(x + v, z, r, r, 18)) : on(PX(x + u), ellUV(y + v, z, r, r, 18)), c, w == null ? .7 : w); },
      rod(u0, v0, z0, u1, v1, z1, r, c){ const a = T(u0, v0), e = T(u1, v1); return rod([a[0], a[1], z0], [e[0], e[1], z1], r, mo(c), toneI, .8); },
    };
    return D;
  }
  const books = (D, u, v0, v1, z, n) => { let s = ''; const cs = [C.red, C.blue, C.green, C.yellow, C.purple, C.teal], w = (v1 - v0)/n;
    for (let i = 0; i < n; i++) s += D.front(u, v0 + i*w + .6, z, v0 + (i + 1)*w - .6, z + 9 + (i*7 % 4), cs[(i*5 + (z | 0)) % 6], .5); return s; };
  const house = (D, o, w, d, h) => D.b(0, 0, 0, w, d, h, o.col || C.cream, 1.1) + D.b(-4, -4, h, w + 4, d + 4, h + 8, o.roof || C.brick, 1) + D.b(8, 4, h + 8, w - 8, d - 4, h + 20, o.roof || C.brick, 1) +
    D.front(w + .2, d/2 - 14, 0, d/2 + 14, 60, o.door || C.woodD, .9) + D.frontEll(w + .4, d/2 + 9, 30, 2, C.gold, .5) +
    D.front(w + .2, 7, 30, 27, 60, C.glass, .8) + D.front(w + .2, d - 27, 30, d - 7, 60, C.glass, .8) + D.flat(w, d/2 - 17, w + 12, d/2 + 17, .3, '#d8ccb4', .7) +
    (o.pots ? [17, d - 17].map((v, i) => D.b(w, v - 9, 22, w + 5, v + 9, 28, C.brick, .6) + D.ball(w + 2.5, v - 4, 31, 3.4, o.pots[i % o.pots.length]) + D.ball(w + 2.5, v + 4, 31, 3.4, o.pots[(i + 1) % o.pots.length])).join('') : '');

  const T = {
    bed: { w: 50, d: 86, h: 30, solid: 1, draw(D, o){ const w = o.wide ? 78 : 50; return D.b(0, 0, 0, w, 86, 12, C.wood) + D.b(0, 0, 12, w, 6, 36, C.wood) + D.b(3, 6, 12, w - 3, 84, 20, C.white) +
        D.b(8, 9, 20, w - 8, 25, 25, '#ffffff', .7) + D.b(3, 30, 20, w - 3, 84, 23, o.col || C.blue); },
      slots: o => o.wide ? [[22, 17, 270, ['sleep'], 1, 23], [56, 17, 270, ['sleep'], 1, 23]] : [[25, 17, 270, ['sleep'], 1, 23]], use: { tag: 'sleep', dur: [60, 120] } },
    cot: { w: 36, d: 52, h: 34, solid: 1, draw(D){ let s = D.b(0, 0, 0, 36, 52, 14, C.woodL) + D.b(2, 2, 14, 34, 50, 19, C.white) + D.b(0, 0, 14, 36, 3, 34, C.woodL);
        for (let i = 0; i < 6; i++) s += D.rod(36, 2 + i*9.6, 14, 36, 2 + i*9.6, 32, 1, C.woodL); return s + D.rod(36, 0, 32, 36, 52, 32, 1.3, C.woodL); },
      slots: () => [[18, 12, 270, ['sleep'], 1, 19]], use: { tag: 'sleep', dur: [60, 120] } },
    sofa: { w: 36, d: 96, h: 40, solid: 1, draw(D, o){ const c = o.col || C.teal; return D.b(0, 0, 0, 36, 96, 15, c) + D.b(0, 0, 15, 10, 96, 40, c) + D.b(10, 0, 15, 36, 7, 27, c) + D.b(10, 89, 15, 36, 96, 27, c) +
        D.b(11, 8, 15, 34, 48, 19, mix(c, '#ffffff', .25), .7) + D.b(11, 48, 15, 34, 88, 19, mix(c, '#ffffff', .25), .7); },
      slots: () => [[26, 22, 0, ['sit', 'tea'], 1], [26, 48, 0, ['sit', 'read'], 1], [26, 74, 0, ['sit', 'tea'], 1]], use: { offers: { rest: 60, social: 25 }, dur: [25, 60] } },
    stoolsB: { w: 14, d: 96, h: 16, solid: 0, draw(D){ return [14, 48, 82].map(v => D.l(7, v, [[0, 5], [14, 6.5], [16, 6.5]], C.woodL)).join(''); } },
    stoolsF: { w: 14, d: 96, h: 16, solid: 0, draw(D){ return [14, 48, 82].map(v => D.l(7, v, [[0, 5], [14, 6.5], [16, 6.5]], C.woodL)).join(''); } },
    table: { w: 56, d: 96, h: 32, solid: 1, draw(D){ let s = ''; for (const [u, v] of [[4, 4], [4, 88], [48, 4], [48, 88]]) s += D.b(u, v, 0, u + 4, v + 4, 28, C.wood, .7);
        s += D.b(0, 0, 28, 56, 96, 32, C.woodL); for (const v of [16, 48, 80]) s += D.ell(14, v, 6, 6, 32.3, '#fbfaf3', .7) + D.ell(42, v, 6, 6, 32.3, '#fbfaf3', .7);
        return s + D.l(28, 48, [[32, 6], [36, 9]], C.red, { inner: '#7a4a2e', n: 14 }); },
      slots: () => [[-11, 14, 0, ['eat'], 'b'], [-11, 48, 0, ['eat'], 'b'], [-11, 82, 0, ['eat'], 'b'], [67, 14, 180, ['eat'], 'f'], [67, 48, 180, ['eat'], 'f'], [67, 82, 180, ['eat'], 'f']],
      use: { tag: 'eat', offers: { hunger: 100, social: 30 }, dur: [40, 70], makes: 'cup' } },
    stove: { w: 30, d: 40, h: 36, solid: 1, draw(D){ return D.b(0, 0, 0, 30, 40, 34, C.white) + D.b(0, 0, 34, 30, 40, 36, C.dark) + D.front(30.2, 6, 6, 34, 24, '#56525a', .8) +
        D.l(15, 12, [[36, 7], [44, 7.6]], C.red, { inner: '#c9894e', n: 14 }) + D.l(15, 29, [[36, 5.5], [41, 6]], C.blue, { inner: '#c9894e', n: 12 }); },
      slots: () => [[40, 20, 180, ['cook']]], use: { tag: 'cook', offers: { tidy: 60 }, dur: [30, 60], who: 'cook', makes: 'cup', lock: 1 } },
    counter: { w: 30, d: 60, h: 36, solid: 1, draw(D){ return D.b(0, 0, 0, 30, 60, 33, C.wood) + D.b(0, 0, 33, 31, 60, 36, C.white) + D.b(8, 8, 36, 22, 26, 37.5, C.woodL, .7) +
        D.l(15, 44, [[36, 6], [39, 9]], C.white, { inner: '#6a3d24', n: 14 }); },
      slots: () => [[40, 30, 180, ['chop', 'wipe']]], use: { offers: { tidy: 50 }, dur: [20, 45], who: 'adult', gives: 'dates' } },
    sink: { w: 30, d: 44, h: 36, solid: 1, draw(D){ return D.b(0, 0, 0, 30, 44, 33, C.wood) + D.b(0, 0, 33, 31, 44, 36, C.grey) + D.flat(7, 8, 25, 36, 36.2, '#94cbe2', .7) + D.rod(4, 22, 36, 4, 22, 46, 1.4, C.grey) + D.rod(4, 22, 46, 12, 22, 44, 1.2, C.grey); },
      slots: () => [[40, 22, 180, ['wipe']]], use: { offers: { tidy: 60 }, dur: [20, 40], who: 'adult', takes: ['cup', 'plate'] } },
    fridge: { w: 30, d: 34, h: 74, solid: 1, draw(D){ return D.b(0, 0, 0, 30, 34, 74, C.white, 1) + D.front(30.2, 2, 46, 32, 46.6, C.dark, 0) + D.rod(30.6, 28, 52, 30.6, 28, 66, .9, C.grey) + D.rod(30.6, 28, 24, 30.6, 28, 40, .9, C.grey); },
      slots: () => [[40, 17, 180, ['stand']]], use: { offers: { hunger: 35 }, dur: [8, 16], gives: 'cup' } },
    shelf: { w: 18, d: 64, h: 62, solid: 1, draw(D, o){ const h = o.low ? 38 : 62; let s = D.b(0, 0, 0, 18, 64, h, C.wood);
        for (let z = 4; z < h - 12; z += 19) s += D.front(18.2, 3, z, 61, z + 16, '#8a6a48', .6) + books(D, 18.4, 4, 60, z, 9); return s; },
      slots: () => [[28, 32, 180, ['stand']]], use: { offers: { fun: 30 }, dur: [10, 20], who: 'reader', gives: 'book', takes: ['book'] } },
    toybox: { w: 26, d: 40, h: 20, solid: 1, draw(D){ return D.b(0, 0, 0, 26, 40, 18, C.yellow) + D.flat(2, 2, 24, 38, 18.2, '#8a6a48', .6) + D.ball(9, 12, 20, 7, C.red) + D.ball(17, 27, 19, 6, C.blue) + D.b(6, 24, 17, 14, 32, 24, C.green, .7); },
      slots: () => [[42, 6, 150, ['play', 'sitfloor']], [42, 36, 210, ['play', 'sitfloor']], [14, 58, 270, ['play']]], use: { offers: { fun: 90, social: 20 }, dur: [25, 60], who: 'kid', makes: 'block', gives: 'ball', takes: ['block', 'car', 'ball'] } },
    desk: { w: 50, d: 52, h: 30, solid: 1, draw(D){ return D.b(0, 0, 0, 4, 4, 26, C.wood, .7) + D.b(0, 48, 0, 4, 52, 26, C.wood, .7) + D.b(24, 0, 0, 28, 4, 26, C.wood, .7) + D.b(24, 48, 0, 28, 52, 26, C.wood, .7) +
        D.b(0, 0, 26, 28, 52, 29, C.woodL) + D.b(6, 30, 29, 20, 46, 31, C.blue, .6) + D.l(8, 12, [[29, 3], [36, 3.4]], C.red) + D.l(42, 26, [[0, 5], [14, 6.5], [16, 6.5]], C.woodL); },
      slots: () => [[42, 26, 180, ['homework'], 1]], use: { tag: 'study', offers: { fun: 20 }, dur: [40, 80], who: 'student', makes: 'paper' } },
    wardrobe: { w: 24, d: 56, h: 76, solid: 1, draw(D){ return D.b(0, 0, 0, 24, 56, 76, C.wood, 1) + D.front(24.2, 3, 6, 27, 72, C.woodL, .7) + D.front(24.2, 29, 6, 53, 72, C.woodL, .7) + D.frontEll(24.5, 25, 40, 1.4, C.dark, 0) + D.frontEll(24.5, 31, 40, 1.4, C.dark, 0); },
      slots: () => [[34, 28, 180, ['stand']]], use: { tag: 'wardrobe', dur: [4, 6], who: 'none' } },
    washer: { w: 30, d: 32, h: 38, solid: 1, draw(D){ return D.b(0, 0, 0, 30, 32, 38, C.white, 1) + D.frontEll(30.2, 16, 18, 10, C.grey, .9) + D.frontEll(30.4, 16, 18, 7, '#56628a', .7) + D.front(30.2, 4, 31, 28, 35, C.grey, .5) + D.frontEll(30.4, 24, 33, 1.4, C.red, 0); },
      slots: () => [[40, 16, 180, ['fold']]], use: { tag: 'washer', offers: { tidy: 60 }, dur: [20, 40], who: 'adult', takes: ['sock'] } },
    basket: { w: 20, d: 20, h: 20, solid: 1, draw(D){ return D.l(10, 10, [[0, 7], [18, 9.5]], C.woodL, { inner: C.pink, n: 14 }); } },
    basin: { w: 22, d: 34, h: 40, solid: 1, draw(D){ return D.b(4, 10, 0, 18, 24, 24, C.white) + D.l(11, 17, [[24, 8], [30, 13]], C.white, { inner: '#94cbe2', n: 16 }) + D.rod(3, 17, 24, 3, 17, 40, 1.3, C.grey) + D.rod(3, 17, 40, 10, 17, 38, 1.1, C.grey); },
      slots: () => [[32, 17, 180, ['stand']]], use: { tag: 'wudu', dur: [8, 12] } },
    plant: { w: 16, d: 16, h: 44, pad: 10, solid: 1, draw(D, o){ return D.l(8, 8, [[0, 5], [12, 7]], o.col || C.brick, { top: C.soil, n: 12 }) + D.ball(8, 8, 24, 10, C.leaf) + D.ball(4, 11, 33, 7, C.green) + D.ball(11, 5, 36, 6.5, C.leaf); } },
    lamp: { w: 12, d: 12, h: 60, solid: 1, draw(D, o){ return D.l(6, 6, [[0, 5], [2, 5]], C.dark) + D.rod(6, 6, 2, 6, 6, 44, 1, C.dark) + D.l(6, 6, [[42, 9], [58, 5]], o.col || C.yellow, { top: '#fff4d6', n: 14 }); } },
    stairs: { w: 60, d: 40, h: 60, solid: 1, draw(D, o){ let s = ''; for (let i = 5; i >= 0; i--) s += D.b(50 - i*10, 0, 0, 60 - i*10, 40, (i + 1)*10, o.down ? '#b9a98f' : C.woodL, .8); return s; },
      slots: () => [[68, 20, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    doorBack: { w: 5, d: 34, h: 56, solid: 1, draw(D, o){ return D.b(0, 0, 0, 5, 34, 56, o.col || C.woodD, 1) + D.frontEll(5.3, 27, 26, 1.8, C.gold, .5) + D.front(5.2, 6, 30, 28, 50, C.glass, .6) + D.flat(5, 2, 20, 32, .3, C.woodL, .6); },
      slots: () => [[14, 17, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    matExit: { w: 14, d: 34, h: 1, solid: 0, flat: 1, draw(D, o){ return D.flat(0, 0, 14, 34, .4, o.col || C.green, .9) + shape([D.T(4, 9), D.T(11, 17), D.T(4, 25)].map(p => [p[0], p[1], .6]), '#fffdf6', .6); },
      slots: () => [[5, 17, 0, ['stand']]], use: { tag: 'door', who: 'none' } },
    bench: { w: 16, d: 56, h: 30, solid: 1, draw(D){ return D.b(0, 0, 0, 3, 56, 30, C.wood, .8) + D.b(3, 0, 12, 16, 56, 16, C.woodL) + D.b(12, 2, 0, 15, 5, 12, C.wood, .6) + D.b(12, 51, 0, 15, 54, 12, C.wood, .6); },
      slots: () => [[11, 16, 0, ['sit'], 1], [11, 40, 0, ['sit'], 1]], use: { offers: { rest: 50, social: 20 }, dur: [25, 60] } },
    tree: { w: 14, d: 14, h: 120, pad: 30, solid: 1, draw(D, o){ const c = o.col || C.leaf; return D.rod(7, 7, 0, 7, 7, 58, 4.5, C.woodD) + D.ball(7, 7, 74, 24, c) + D.ball(-4, 14, 92, 17, mix(c, '#ffffff', .12)) + D.ball(16, 0, 96, 16, mix(c, '#000000', .08)) + D.ball(7, 7, 110, 13, c); } },
    bush: { w: 20, d: 20, h: 22, pad: 10, solid: 1, draw(D){ return D.ball(10, 10, 9, 11, C.leaf) + D.ball(5, 14, 14, 7, C.green) + D.ball(15, 6, 13, 6, C.pink); },
      slots: () => [[28, 10, 180, ['stand']]], use: { dur: [4, 6], who: 'none', gives: 'flower' } },
    bed2: { w: 36, d: 70, h: 12, solid: 1, draw(D, o){ const g = o.stage || 0; let s = D.b(0, 0, 0, 36, 70, 7, C.woodD) + D.flat(3, 3, 33, 67, 7.2, o.wet ? '#7a5234' : '#9a6a44', .6);
        if (g) for (let i = 0; i < 6; i++){ const u = 10 + (i % 2)*16, v = 12 + (i >> 1)*23; s += D.rod(u, v, 7, u, v, 7 + g*5, .9, C.green) + (g > 1 ? D.ball(u, v, 9 + g*5, 2 + g*1.4, g > 2 ? C.red : C.leaf) : ''); } return s; },
      slots: () => [[46, 35, 180, ['water']]], use: { tag: 'garden', offers: { tidy: 40, fun: 20 }, dur: [15, 30], who: 'adult' } },
    swing: { w: 24, d: 60, h: 74, solid: 1, draw(D){ return D.rod(0, 2, 0, 12, 2, 72, 1.6, C.red) + D.rod(24, 2, 0, 12, 2, 72, 1.6, C.red) + D.rod(12, 2, 72, 12, 58, 72, 1.6, C.red) +
        D.rod(12, 22, 72, 12, 22, 16, .6, C.dark) + D.rod(12, 38, 72, 12, 38, 16, .6, C.dark) + D.b(8, 20, 14, 16, 40, 16, C.yellow, .7) + D.rod(0, 58, 0, 12, 58, 72, 1.6, C.red) + D.rod(24, 58, 0, 12, 58, 72, 1.6, C.red); },
      slots: () => [[13, 30, 0, ['sit'], 1, 2]], use: { offers: { fun: 90 }, dur: [20, 40], who: 'kid' } },
    slide: { w: 76, d: 24, h: 56, solid: 1, draw(D){ return D.b(0, 2, 0, 16, 22, 46, C.blue) + D.b(0, 0, 46, 16, 3, 56, C.red, .7) + D.b(0, 21, 46, 16, 24, 56, C.red, .7) +
        shape([D.T(16, 3), D.T(16, 21), D.T(74, 21), D.T(74, 3)].map((p, i) => [p[0], p[1], i < 2 ? 46 : 3]), C.yellow, 1); },
      slots: () => [[84, 12, 0, ['skip', 'wave']]], use: { offers: { fun: 90 }, dur: [15, 30], who: 'kid' } },
    bin: { w: 14, d: 14, h: 24, solid: 1, draw(D){ return D.l(7, 7, [[0, 5.5], [22, 7]], C.green, { inner: C.dark, n: 12 }); }, slots: () => [[22, 7, 180, ['stand']]], use: { dur: [3, 5], who: 'none', takes: ['can', 'paper', 'wrapper', 'peel', 'bottle'] } },
    postbox: { w: 12, d: 12, h: 40, solid: 1, draw(D){ return D.l(6, 6, [[0, 5], [34, 5], [40, 2]], C.red, { top: true, n: 12 }) + D.front(11.2, 2.5, 26, 9.5, 28, C.dark, 0); } },
    lampPost: { w: 6, d: 6, h: 90, solid: 1, draw(D){ return D.rod(3, 3, 0, 3, 3, 84, 1.3, '#4d6b62') + D.l(3, 3, [[82, 4], [90, 6]], '#ffd56e', { top: C.dark, n: 10 }); } },
    ducks: { w: 30, d: 30, h: 10, solid: 0, draw(D){ let s = ''; for (const [u, v, c] of [[6, 8, C.white], [20, 16, C.yellow], [10, 24, C.white]]) s += D.l(u, v, [[1, 3], [4, 5.5], [7, 3]], c, { top: true, n: 10 }) + D.ball(u + 4, v, 9, 2.6, c); return s; } },
    // buildings on the street
    houseB: { w: 70, d: 90, h: 106, solid: 1, draw(D, o){ return house(D, o, 70, 90, 84); }, slots: () => [[80, 45, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    shopB: { w: 70, d: 90, h: 106, solid: 1, draw(D, o){ let s = house(D, Object.assign({ col: '#f6e2c0', roof: C.teal }, o), 70, 90, 84); for (let i = 0; i < 6; i++) s += D.b(70, 4 + i*14, 64, 86, 18 + i*14, 67 - (i % 2), i % 2 ? C.white : C.red, .6);
        return s + D.front(70.4, 28, 70, 62, 80, C.yellow, .7) + D.frontEll(70.6, 45, 75, 3.4, '#d99a52', .5); }, slots: () => [[82, 45, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    schoolB: { w: 70, d: 120, h: 150, solid: 1, draw(D){ let s = D.b(0, 0, 0, 70, 120, 104, '#f6d98a', 1.1) + D.b(-4, -4, 104, 74, 124, 112, C.blue, 1) + D.b(20, 44, 112, 50, 76, 126, C.blue, .9);
        for (const v of [8, 30, 74, 96]) s += D.front(70.2, v, 62, v + 16, 88, C.glass, .7); for (const v of [8, 96]) s += D.front(70.2, v, 22, v + 16, 48, C.glass, .7);
        s += D.front(70.2, 42, 0, 78, 50, C.red, .9) + D.front(70.3, 59.6, 0, 60.4, 50, C.dark, 0) + D.front(70.3, 30, 24, 38, 44, C.white, .6) + D.frontEll(70.4, 34, 38, 2.6, C.red, .4) + D.front(70.4, 31.5, 27, 36.5, 32, C.blue, .4) +
          D.front(70.2, 50, 64, 70, 86, C.white, .7) + D.frontEll(70.4, 60, 75, 8, '#fffdf6', .8) + D.rod(70.6, 60, 75, 70.6, 60, 80.5, .5, C.dark) + D.rod(70.6, 60, 75, 70.6, 64, 75, .5, C.dark) +
          D.rod(35, 60, 126, 35, 60, 150, .9, C.dark) + D.front(35, 60, 136, 78, 149, C.green, .6) + D.flat(70, 38, 86, 82, .3, '#d8ccb4', .7);
        return s; }, slots: () => [[82, 60, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    masjidB: { w: 70, d: 110, h: 200, solid: 1, draw(D){ const hs = []; for (let i = 0; i <= 8; i++){ const a = i/8*Math.PI/2; hs.push([92 + Math.sin(a)*28, Math.cos(a)*28]); }
        return D.b(0, 0, 0, 70, 110, 84, C.cream, 1.1) + D.b(-3, -3, 84, 73, 113, 92, '#e8dcc0', 1) + D.l(35, 48, hs, C.teal, { n: 20 }) + D.l(35, 48, [[120, 1.5], [130, 1.5]], C.gold, { top: true, n: 8 }) +
          D.l(12, 98, [[0, 8], [130, 7], [134, 10.5], [142, 10.5], [144, 6], [166, 5.5], [186, 0.5]], C.cream, { n: 14 }) + D.l(12, 98, [[186, 1.2], [196, 1.2]], C.gold, { top: true, n: 8 }) +
          D.front(70.2, 34, 0, 62, 48, C.woodD, .9) + D.frontEll(70.2, 48, 48, 14, C.woodD, .9) + D.frontEll(70.4, 15, 50, 8, C.glass, .7) + D.frontEll(70.4, 81, 50, 8, C.glass, .7) + D.flat(70, 30, 84, 66, .3, '#d8ccb4', .7); },
      slots: () => [[82, 48, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    gate: { w: 6, d: 44, h: 50, solid: 0, draw(D){ return D.b(0, 0, 0, 6, 5, 46, C.woodD) + D.b(0, 39, 0, 6, 44, 46, C.woodD) + D.b(0, 0, 44, 6, 44, 50, C.green); }, slots: () => [[14, 22, 180, ['stand']]], use: { tag: 'door', who: 'none' } },
    // the town
    fountain: { w: 40, d: 40, h: 40, pad: 8, solid: 1, draw(D){ return D.l(20, 20, [[0, 19], [9, 21]], '#d8d2c4', { inner: '#94cbe2', n: 22 }) + D.l(20, 20, [[5, 4], [22, 3], [24, 9], [27, 10]], '#d8d2c4', { inner: '#94cbe2', n: 14 }) + D.ball(20, 20, 31, 4, '#c9e8f3'); },
      slots: () => [[50, 20, 180, ['stand']], [20, 50, 270, ['stand']], [-10, 20, 0, ['stand']]], use: { tag: 'fountain', offers: { fun: 30, rest: 20 }, dur: [8, 16] } },
    stall: { w: 30, d: 56, h: 64, pad: 8, solid: 1, draw(D, o){ const c = o.col || C.red; let s = D.b(0, 0, 0, 30, 56, 24, C.woodL); for (const [u, v] of [[1, 1], [1, 53], [27, 1], [27, 53]]) s += D.rod(u + 1, v + 1, 24, u + 1, v + 1, 56, .9, C.woodD);
        for (let i = 0; i < 5; i++) s += D.ball(8 + (i % 2)*12, 8 + i*10, 27, 4.4, [C.red, '#ef8a3c', C.yellow, C.green, C.red][i]);
        for (let i = 0; i < 4; i++) s += D.b(-3, -2 + i*15, 56, 33, 13 + i*15, 59 + (i % 2), i % 2 ? C.white : c, .7); return s; },
      slots: () => [[40, 28, 180, ['stand']]], use: { offers: { fun: 20 }, dur: [8, 16], gives: 'fruit' } },
    busStop: { w: 16, d: 56, h: 66, pad: 8, solid: 1, draw(D){ return D.rod(14, 2, 0, 14, 2, 60, 1.1, '#4d6b62') + D.rod(14, 54, 0, 14, 54, 60, 1.1, '#4d6b62') + D.front(14, 3, 14, 53, 56, C.glass, .7) + D.b(-2, 0, 60, 16, 56, 63, C.green, .9) +
        D.b(4, 6, 12, 13, 50, 15, C.woodL, .7) + D.rod(-1, 59, 0, -1, 59, 52, .8, C.dark) + D.ball(-1, 59, 56, 6, C.blue) + D.ball(-1, 59, 56, 3, C.white); },
      slots: () => [[7, 18, 180, ['sit'], 1, 3], [7, 40, 180, ['sit'], 1, 3]], use: { tag: 'bus', offers: { rest: 40, fun: 30, social: 20 }, dur: [40, 70] } },
    busSign: { w: 6, d: 6, h: 60, pad: 8, solid: 1, draw(D){ return D.rod(3, 3, 0, 3, 3, 50, 1, C.dark) + D.ball(3, 3, 54, 7, C.blue) + D.ball(3, 3, 54, 3.4, C.white); }, slots: () => [[-8, 3, 0, ['stand']], [-8, 17, 0, ['stand']]], use: { tag: 'bus', offers: { rest: 30, fun: 30 }, dur: [40, 70] } },
    tub: { w: 28, d: 56, h: 24, solid: 1, draw(D){ return D.b(0, 0, 0, 28, 56, 20, C.white, 1) + D.flat(4, 4, 24, 52, 20.2, '#94cbe2', .7) + D.ell(10, 16, 4, 5, 20.4, '#ffffff', .4) + D.ell(18, 34, 5, 6, 20.4, '#ffffff', .4) + D.rod(14, 3, 20, 14, 3, 34, 1.2, C.grey) + D.rod(14, 3, 34, 14, 10, 32, 1, C.grey) + D.ball(22, 48, 23, 3, C.yellow); },
      slots: () => [[-8, 28, 0, ['stand']]], use: { tag: 'bath', dur: [4, 6], who: 'none' } },
    bowl: { w: 12, d: 12, h: 6, solid: 1, draw(D, o){ return D.l(6, 6, [[0, 4], [4, 6]], o.col || C.blue, { inner: o.full ? '#94cbe2' : '#e9e4d6', n: 12 }); }, slots: () => [[20, 6, 180, ['stand']]], use: { tag: 'bowl', dur: [3, 5], who: 'none' } },
    feeder: { w: 12, d: 12, h: 46, pad: 8, solid: 1, draw(D, o){ return D.rod(6, 6, 0, 6, 6, 36, 1.1, C.woodD) + D.l(6, 6, [[36, 9], [39, 10]], C.woodL, { inner: o.full ? '#e2b14a' : '#e9e4d6', n: 12 }) + D.rod(6, 6, 39, 6, 6, 46, .6, C.woodD) + D.l(6, 6, [[45, 8], [50, 1]], C.red, { top: true, n: 10 }); },
      slots: () => [[22, 6, 180, ['stand']]], use: { tag: 'feeder', dur: [3, 5], who: 'none' } },
    // masjid, shop, school
    minbar: { w: 30, d: 20, h: 44, solid: 1, draw(D){ let s = ''; for (let i = 3; i >= 0; i--) s += D.b(22 - i*7, 0, 0, 30 - i*7, 20, (i + 1)*9, C.wood, .8); return s + D.b(0, 0, 36, 4, 20, 44, C.woodL, .7); } },
    shoeRack: { w: 14, d: 50, h: 26, solid: 1, draw(D){ let s = D.b(0, 0, 0, 14, 50, 4, C.wood, .7) + D.b(0, 0, 12, 14, 50, 15, C.wood, .7) + D.b(0, 0, 0, 2, 50, 26, C.wood, .7);
        for (let i = 0; i < 4; i++) s += D.b(4, 4 + i*11, 4, 12, 11 + i*11, 8, [C.dark, C.red, C.blue, C.woodD][i], .6) + D.b(4, 6 + i*11, 15, 12, 13 + i*11, 19, [C.teal, C.dark, C.yellow, C.dark][i], .6); return s; },
      slots: () => [[24, 25, 180, ['stand']]], use: { dur: [3, 5], who: 'none', takes: ['shoe'] } },
    sadaqah: { w: 14, d: 14, h: 34, solid: 1, draw(D){ return D.b(0, 0, 0, 14, 14, 30, C.green, 1) + D.flat(4, 2, 10, 12, 30.2, C.dark, 0) + D.front(14.2, 3, 12, 11, 22, C.gold, .6); }, slots: () => [[24, 7, 180, ['stand']]], use: { tag: 'sadaqah', dur: [3, 5], who: 'none' } },
    goods: { w: 18, d: 70, h: 58, solid: 1, draw(D, o){ let s = D.b(0, 0, 0, 18, 70, 58, C.woodL); const cs = o.cs || [C.red, C.yellow, C.green, C.blue, C.pink];
        for (let z = 4; z < 50; z += 18){ s += D.front(18.2, 3, z, 67, z + 15, '#8a6a48', .6); for (let i = 0; i < 6; i++) s += D.front(18.4, 5 + i*10.4, z, 13 + i*10.4, z + 10 + (i % 3), cs[(i + z) % cs.length], .5); } return s; },
      slots: () => [[28, 20, 180, ['stand']], [28, 50, 180, ['stand']]], use: { tag: 'shop', offers: { fun: 30 }, dur: [10, 25], gives: 'seed' } },
    till: { w: 26, d: 64, h: 40, solid: 1, draw(D){ return D.b(0, 0, 0, 26, 64, 32, C.wood) + D.b(0, 0, 32, 27, 64, 35, C.woodL) + D.b(6, 8, 35, 20, 24, 44, C.dark, .8) + D.l(13, 46, [[35, 5], [39, 8]], C.white, { inner: C.gold, n: 12 }); },
      slots: () => [[-10, 32, 0, ['stand', 'wipe']], [36, 32, 180, ['stand', 'talk']]], use: { tag: 'till' } },
    breadRack: { w: 18, d: 52, h: 52, solid: 1, draw(D){ let s = D.b(0, 0, 0, 18, 52, 4, C.wood, .7) + D.b(0, 0, 0, 2, 52, 52, C.wood, .7); for (const z of [14, 30, 46]){ s += D.b(0, 0, z, 18, 52, z + 2, C.woodL, .7);
          for (let i = 0; i < 3; i++) s += D.l(9, 9 + i*17, [[z + 2, 5], [z + 5, 7], [z + 8, 4]], '#d99a52', { top: true, n: 10 }); } return s; },
      slots: () => [[28, 26, 180, ['stand']]], use: { dur: [4, 6], who: 'none', gives: 'bread' } },
    oven: { w: 34, d: 46, h: 56, solid: 1, draw(D){ return D.b(0, 0, 0, 34, 46, 50, C.brick, 1) + D.b(4, 14, 50, 16, 30, 70, C.brick, .8) + D.front(34.2, 10, 10, 36, 28, '#3a2a22', .8) + D.frontEll(34.3, 23, 28, 13, '#3a2a22', .8) + D.frontEll(34.5, 23, 18, 6, '#f2a23c', 0); },
      slots: () => [[44, 23, 180, ['cook', 'chop']]], use: { tag: 'bake', dur: [30, 60], who: 'baker', lock: 1 } },
    sdesk: { w: 38, d: 30, h: 24, solid: 1, draw(D){ return D.b(0, 2, 0, 3, 5, 20, C.wood, .6) + D.b(0, 25, 0, 3, 28, 20, C.wood, .6) + D.b(17, 2, 0, 20, 5, 20, C.wood, .6) + D.b(17, 25, 0, 20, 28, 20, C.wood, .6) + D.b(0, 0, 20, 20, 30, 23, C.woodL) + D.l(31, 15, [[0, 4.5], [12, 5.5], [14, 5.5]], C.blue); },
      slots: () => [[31, 15, 180, ['homework'], 1]], use: { tag: 'class', dur: [40, 90], who: 'kid' } },
    // things you can win and place at home
    prayMat: { w: 38, d: 22, h: 1, solid: 0, flat: 1, draw(D, o){ return D.flat(0, 0, 38, 22, .5, o.col || C.green, 1) + D.ell(9, 11, 5, 7, .7, '#fff4d6', .5) + D.flat(30, 2, 36, 20, .7, C.gold, .4); }, slots: () => [[22, 11, 180, ['stand']]], use: { tag: 'salah', who: 'none' } },
    rugD: { w: 40, d: 60, h: 1, solid: 0, flat: 1, draw(D, o){ return D.flat(0, 0, 40, 60, .4, o.col || C.red, .9) + D.flat(5, 5, 35, 55, .5, mix(o.col || C.red, '#ffffff', .35), .5) + D.ell(20, 30, 8, 12, .6, o.col || C.red, .5); } },
    lantern: { w: 12, d: 12, h: 30, solid: 1, draw(D){ return D.l(6, 6, [[0, 4], [3, 5.5], [20, 5.5], [24, 3], [28, 1]], C.gold, { n: 10 }) + D.front(11.6, 3, 5, 9, 18, '#ffe08a', .4); } },
    cushion: { w: 18, d: 18, h: 8, solid: 0, draw(D, o){ return D.l(9, 9, [[0, 7], [3, 9], [6, 8]], o.col || C.purple, { top: true, n: 14 }); } },
    frame: { w: 6, d: 30, h: 44, solid: 1, draw(D){ return D.b(0, 12, 0, 4, 18, 14, C.wood, .6) + D.b(0, 0, 14, 4, 30, 44, C.woodD, .9) + D.front(4.2, 3, 17, 27, 41, '#fbf6ea', .6) + D.frontEll(4.4, 15, 29, 6, C.teal, .8) + D.frontEll(4.5, 15, 29, 2.4, C.gold, 0); } },
    fishbowl: { w: 18, d: 18, h: 40, solid: 1, draw(D){ return D.b(2, 2, 0, 16, 16, 22, C.woodL) + D.l(9, 9, [[22, 5], [28, 9], [34, 8], [38, 5]], '#bfe3ea', { top: '#94cbe2', n: 14 }) + D.ball(9, 9, 30, 2.2, '#f2823c'); } },
    vase: { w: 12, d: 12, h: 34, solid: 1, draw(D){ return D.l(6, 6, [[0, 3.5], [8, 5.5], [16, 3]], C.blue, { top: true, n: 12 }) + D.rod(6, 6, 16, 4, 8, 28, .6, C.green) + D.ball(4, 8, 30, 3.4, C.pink) + D.rod(6, 6, 16, 8, 4, 25, .6, C.green) + D.ball(8, 4, 27, 3, C.yellow); } },
    tent: { w: 40, d: 44, h: 40, solid: 1, draw(D, o){ const c = o.col || C.red, p = (u, v, z) => { const q = D.T(u, v); return [q[0], q[1], z]; };
        return shape([p(0, 0, 0), p(40, 0, 0), p(20, 0, 40)], mix(c, '#000000', .2), .9) + shape([p(40, 0, 0), p(40, 44, 0), p(20, 44, 40), p(20, 0, 40)], c, 1) + shape([p(40, 14, 0), p(40, 30, 0), p(31, 22, 20)], '#5a4636', .7); } },
  };
  const DECOR = ['plant', 'lamp', 'rugD', 'cushion', 'vase', 'lantern', 'frame', 'fishbowl', 'shelf', 'tent', 'toybox', 'bench'];

  /* ---------- small things you can carry (drawn at the origin) ---------- */
  const ITEM = {
    ball: () => H3.mess({ kind: 'ball', pos: [0, 0, 0], col: C.red }), book: () => H3.mess({ kind: 'book', pos: [0, 0, 0], col: C.blue }), block: () => H3.mess({ kind: 'block', pos: [0, 0, 0], col: C.green }),
    car: () => H3.mess({ kind: 'car', pos: [0, 0, 0], col: C.red }), cup: () => H3.mess({ kind: 'cup', pos: [0, 0, 0], col: C.teal }), plate: () => H3.mess({ kind: 'plate', pos: [0, 0, 0], col: C.blue, dirty: 1 }),
    sock: () => H3.mess({ kind: 'sock', pos: [0, 0, 0], col: C.pink }), can: () => H3.mess({ kind: 'can', pos: [0, 0, 0] }), paper: () => H3.mess({ kind: 'paper', pos: [0, 0, 0] }),
    wrapper: () => H3.mess({ kind: 'wrapper', pos: [0, 0, 0] }), shoe: () => H3.mess({ kind: 'shoe', pos: [0, 0, 0], col: C.blue }),
    bread: () => ({ box: [[-8, -8, 0], [8, 8, 9]], svg: H3.lathe(0, 0, [[0, 5], [4, 8], [8, 4.5]], mo('#d99a52'), { top: true, n: 12 }) }),
    dates: () => ({ box: [[-9, -9, 0], [9, 9, 8]], svg: H3.lathe(0, 0, [[0, 5], [4, 9]], mo(C.white), { inner: '#fbfaf3', n: 14 }) + H3.ball([-3, 1, 5], 2.6, '#6a3d24') + H3.ball([2.5, -2, 5], 2.6, '#7a4a2e') + H3.ball([1, 3, 6], 2.4, '#5a3220') }),
    flower: () => ({ box: [[-6, -6, 0], [6, 6, 20]], svg: rod([0, 0, 0], [0, 0, 14], .8, mo(C.green), toneI, .6) + H3.ball([0, 0, 16], 4.6, C.pink) + H3.ball([0, 0, 17], 2, C.yellow) }),
    veg: () => ({ box: [[-8, -8, 0], [8, 8, 12]], svg: H3.ball([-3, 0, 5], 5, C.red) + H3.ball([4, 2, 4.5], 4.4, '#ef8a3c') + H3.ball([0, -3, 8], 3, C.leaf) }),
    seed: () => ({ box: [[-6, -6, 0], [6, 6, 14]], svg: H3.bx(-5, -3, 0, 5, 3, 12, mo('#efd9a8'), .8) + H3.ball([0, 3.4, 6], 2.6, C.green) }),
    gift: () => ({ box: [[-9, -9, 0], [9, 9, 16]], svg: H3.bx(-8, -8, 0, 8, 8, 13, mo(C.red), .9) + H3.bx(-1.5, -8.2, 0, 1.5, 8.2, 13.3, mo(C.yellow), .5) + H3.ball([0, 0, 15], 3, C.yellow) }),
    fruit: () => ({ box: [[-7, -7, 0], [7, 7, 14]], svg: H3.ball([0, 0, 6], 6, C.red) + rod([0, 0, 11], [1.5, 0, 14], .6, mo(C.woodD), toneI, .5) + H3.ball([3, 0, 13], 2, C.leaf) }),
    meal: () => ({ box: [[-10, -10, 0], [10, 10, 12]], svg: H3.lathe(0, 0, [[0, 5], [6, 10]], mo(C.white), { inner: '#ef8a3c', n: 14 }) + H3.ball([-3, 1, 7], 2.6, C.green) + H3.ball([3, -2, 7], 2.6, C.red) + H3.ball([1, 3, 7.5], 2.2, C.yellow) }),
    bike: () => ({ box: [[-32, -32, 0], [32, 32, 42]], svg: bike(true) }),
    coin: () => ({ box: [[-5, -5, 0], [5, 5, 3]], svg: H3.lathe(0, 0, [[0, 4.5], [2, 4.5]], mo(C.gold), { top: true, n: 12 }) }),
    can2: () => H3.tool('can', 0, 0, 0),
  };
  // a bicycle, seen from the side (along x) or end on (along y)
  function bike(ax){ const K = 1.6, wheel = c => shape(ax ? on(PY(0), ellUV(c*K, 7*K, 7*K, 7*K, 18)) : on(PX(0), ellUV(c*K, 7*K, 7*K, 7*K, 18)), '#efe9da', 1.4), q = (u, z) => ax ? [u*K, 0, z*K] : [0, u*K, z*K], r = (a, b, w, c) => rod(q(a[0], a[1]), q(b[0], b[1]), w, mo(c), toneI, .6);
    return wheel(-11) + wheel(11) + r([-11, 7], [-3, 17], 1, C.red) + r([-3, 17], [8, 17], 1, C.red) + r([-3, 17], [1, 7], 1, C.red) + r([1, 7], [-11, 7], 1, C.red) + r([8, 17], [11, 7], 1, C.red) + r([8, 17], [8.500, 23], .9, C.dark) + r([-6, 19.500], [-1, 19.500], 1.5, C.dark); }
  const TIDY = { block: 'toybox', car: 'toybox', ball: 'toybox', cup: 'sink', plate: 'sink', sock: 'washer', can: 'bin', paper: 'bin', wrapper: 'bin', book: 'shelf', shoe: 'shoeRack' };

  /* ---------- building a place ---------- */
  let uid = 0;
  function thing(pl, type, x, y, o){
    o = o || {}; const t = T[type], sw = !!o.sw, w0 = (type === 'bed' && o.wide) ? 78 : t.w, w = sw ? t.d : w0, d = sw ? w0 : t.d;
    const p = { id: o.id || type + (++uid), type, o, x0: x, y0: y, x1: x + w, y1: y + d, h: t.h, solid: !!t.solid, flat: !!t.flat, sk: x + w/2 + y + d/2 - (t.flat ? 500 : 0), key: (o.id || type) + '|' + x + '|' + y + '|' + JSON.stringify(o),
      hit: o.hit === 0 ? false : !!(t.use || o.hit), draw: () => { const k = t.pad || 6; return { svg: t.draw(ctxAt(x, y, sw), o), box: [[x - k, y - k, 0], [x + w + k, y + d + k, t.h + 4 + (t.pad || 0)]] }; } };
    pl.props.push(p);
    if (t.slots){ const use = Object.assign({}, t.use || {}, o.use || {});
      const ob = { id: p.id, type, place: pl.id, prop: p, use, to: o.to || null, owner: o.owner || null, slots: t.slots(o).map(([u, v, f, poses, onp, z]) => ({ x: sw ? x + v : x + u, y: sw ? y + u : y + v,
        face: sw ? 90 - f : f, poses, on: onp === 1 ? p : onp ? o[onp] : null, z: z || 0, by: null })) };
      p.obj = ob; pl.objs.push(ob); return ob; }
    return p;
  }
  // an invisible spot with places to be (a play rug, a prayer row, a picnic)
  function spot(pl, id, slots, use, o){ const ob = Object.assign({ id, type: (o && o.type) || 'spot', place: pl.id, prop: null, use, slots: slots.map(([x, y, f, poses, z]) => ({ x, y, face: f, poses, on: null, z: z || 0, by: null })) }, o || {}); pl.objs.push(ob); return ob; }
  function dining(pl, x, y, o){ const b = thing(pl, 'stoolsB', x - 18, y), f = { b }; const tb = thing(pl, 'table', x, y, Object.assign({ b: b, f: null }, o || {}));
    const fr = thing(pl, 'stoolsF', x + 60, y); for (const s of tb.slots) if (!s.on) s.on = fr; return tb; }
  const wallX = (x, y0, y1, h, c) => H3.bx(x - 6, y0 - 6, 0, x, y1, h, mo(c), 1.1), wallY = (y, x0, x1, h, c) => H3.bx(x0, y - 6, 0, x1, y, h, mo(c), 1.1);
  const fl = (x0, y0, x1, y1, c, w) => shape(on(PZ(0), rectUV(x0, y0, x1, y1)), c, w == null ? .8 : w);
  const win = (pl, a, b, z0, z1) => pl === 'x' ? shape(on(PX(.2), rectUV(a, z0, b, z1)), C.glass, .9) : shape(on(PY(.2), rectUV(a, z0, b, z1)), C.glass, .9);
  function mkPlace(id, bounds, o){
    const pl = Object.assign({ id, bounds, props: [], objs: [], blocks: [], rooms: [], stubs: [], flats: [], extra: [], wall: C.cream, wallH: 70, ver: 0 }, o || {});
    pl.room = (rid, x0, y0, x1, y1, c) => pl.rooms.push({ id: rid, x0, y0, x1, y1, c });
    // a low wall along x = const (dir 'x') or y = const, from a to b, with door gaps [[g0, g1], ...]
    pl.stub = (dir, at, a, b, gaps) => { let s = a; for (const g of (gaps || []).concat([[b, b]])){ if (g[0] > s){ pl.stubs.push([dir, at, s, g[0]]);
        pl.blocks.push(dir === 'x' ? [at, s, at + 4, g[0]] : [s, at, g[0], at + 4]); } s = g[1]; } };
    pl.ground = () => { const [x0, y0, x1, y1] = pl.bounds; let s = '';
      if (pl.out) s += fl(x0 - 60, y0 - 60, x1 + 60, y1 + 60, pl.out, 0);
      for (const r of pl.rooms) s += fl(r.x0, r.y0, r.x1, r.y1, r.c, .6);
      if (pl.wallH){ s += wallX(x0, y0, y1, pl.wallH, pl.wall) + wallY(y0, x0, x1, pl.wallH, pl.wall); }
      for (const e of pl.extra) s += e();
      for (const [dir, at, a, b] of pl.stubs) s += dir === 'x' ? H3.bx(at, a, 0, at + 4, b, 9, mo(pl.wall), .8) : H3.bx(a, at, 0, b, at + 4, 9, mo(pl.wall), .8);
      for (const f of pl.flats) s += f();
      return s; };
    const [x0, y0, x1, y1] = bounds; pl.gbox = WE.box2w([[x0 - 40, y0 - 40, 0], [x1 + 40, y1 + 40, (pl.top || pl.wallH || 0) + 30]], 10);
    return pl;
  }
  const rug = (pl, x0, y0, x1, y1, c) => pl.flats.push(() => fl(x0, y0, x1, y1, c, .9) + fl(x0 + 5, y0 + 5, x1 - 5, y1 - 5, mix(c, '#ffffff', .3), .5));
  const matP = (pl, x, y, c) => pl.flats.push(() => fl(x, y, x + 38, y + 22, c, .8) + shape(on(PZ(.2), ellUV(x + 9, y + 11, 5, 7, 12)), mix(c, '#ffffff', .4), .5));

  function build(){
    const PL = {}; uid = 0;
    /* ---- home, ground floor ---- */
    let p = PL.home0 = mkPlace('home0', [0, 0, 300, 420], { name: 'home' });
    p.room('living', 0, 0, 170, 200, '#ecd9b8'); p.room('kitchen', 0, 200, 170, 420, '#e6ece4'); p.room('bath', 170, 0, 300, 110, '#d6e8ee'); p.room('hall', 170, 110, 300, 310, '#e9dcc6'); p.room('laundry', 170, 310, 300, 420, '#e4e0ee');
    p.stub('x', 170, 0, 420, [[140, 180], [250, 290]]); p.stub('y', 200, 0, 170, [[110, 150]]); p.stub('y', 110, 174, 300, [[220, 260]]); p.stub('y', 310, 174, 300, [[220, 260]]);
    p.extra.push(() => win('x', 60, 110, 28, 56) + win('x', 250, 300, 30, 56) + win('y', 70, 120, 28, 56));
    rug(p, 62, 66, 150, 150, '#c9667a');
    thing(p, 'sofa', 4, 30, { col: C.teal }); thing(p, 'sofa', 56, 4, { sw: 1, col: C.teal }); thing(p, 'shelf', 4, 132); thing(p, 'plant', 152, 4); thing(p, 'lamp', 40, 6);
    spot(p, 'cushions', [[95, 95, 200, ['sitfloor', 'tea']], [125, 120, 230, ['sitfloor', 'read']], [100, 132, 290, ['sitfloor']]], { offers: { rest: 50, social: 40 }, dur: [25, 60] });
    thing(p, 'stove', 4, 214); thing(p, 'counter', 4, 258); thing(p, 'sink', 4, 322); thing(p, 'fridge', 4, 372); dining(p, 82, 262, { id: 'table-home' }); thing(p, 'bin', 152, 402);
    thing(p, 'basin', 196, 4, { sw: 1, id: 'wudu-home' }); thing(p, 'basin', 244, 4, { sw: 1 }); rug(p, 190, 50, 250, 90, '#7fb7d6'); thing(p, 'tub', 270, 44, { id: 'tub' }); thing(p, 'bowl', 178, 270, { id: 'bowl-home' });
    thing(p, 'stairs', 180, 120, { id: 'up', to: ['home1', 'down'] }); thing(p, 'shoeRack', 176, 190); thing(p, 'matExit', 286, 196, { id: 'front', to: ['street', 'home'] }); thing(p, 'plant', 280, 286);
    thing(p, 'washer', 176, 326, { id: 'washer' }); thing(p, 'basket', 178, 368); thing(p, 'matExit', 222, 404, { sw: 1, id: 'back', to: ['yard', 'door'], col: C.leaf });
    /* ---- home, upstairs ---- */
    p = PL.home1 = mkPlace('home1', [0, 0, 300, 420], { name: 'home' });
    p.room('myroom', 0, 0, 150, 140, '#f3e2b8'); p.room('sisroom', 0, 140, 150, 280, '#f1dbe2'); p.room('nursery', 0, 280, 150, 420, '#dcebd4'); p.room('landing', 150, 0, 200, 420, '#e9dcc6');
    p.room('parents', 200, 0, 300, 160, '#dfe3f0'); p.room('stairwell', 200, 160, 300, 260, '#e9dcc6'); p.room('prayer', 200, 260, 300, 420, '#e2efe6');
    p.stub('x', 150, 0, 420, [[50, 90], [190, 230], [330, 370]]); p.stub('y', 140, 0, 150); p.stub('y', 280, 0, 150);
    p.stub('x', 200, 0, 160, [[60, 100]]); p.stub('x', 200, 260, 420, [[320, 360]]); p.stub('y', 160, 204, 300); p.stub('y', 260, 204, 300);
    p.extra.push(() => win('x', 40, 90, 28, 56) + win('x', 180, 230, 28, 56) + win('x', 320, 370, 28, 56) + win('y', 220, 280, 28, 56));
    rug(p, 62, 70, 132, 126, '#6aa6d8'); thing(p, 'bed', 60, 4, { sw: 1, id: 'bed-me', owner: 'me', col: C.green }); thing(p, 'wardrobe', 4, 6, { id: 'wardrobe' }); thing(p, 'desk', 4, 70, { owner: 'me' });
    thing(p, 'bed', 4, 150, { id: 'bed-sister', owner: 'sister', col: C.pink }); thing(p, 'desk', 70, 146, { sw: 1, id: 'desk-sister', owner: 'sister' }); thing(p, 'shelf', 4, 240, { low: 1, sw: 0, id: 'shelf-sis' });
    thing(p, 'cot', 4, 290, { id: 'cot', owner: 'toddler' }); thing(p, 'toybox', 4, 352, { id: 'toybox' }); rug(p, 50, 300, 136, 404, '#f2c96a'); thing(p, 'plant', 130, 284);
    thing(p, 'bed', 208, 4, { sw: 1, wide: 1, id: 'bed-parents', owner: ['abu', 'ummi'], col: C.purple }); thing(p, 'wardrobe', 206, 100);
    thing(p, 'stairs', 218, 190, { id: 'down', to: ['home0', 'up'], down: 1 }); thing(p, 'plant', 180, 4);
    matP(p, 210, 318, '#3f9c92'); for (const y of [270, 302, 334]) matP(p, 256, y, ['#8a63ad', '#e8574a', '#5b8fd6', '#5cae6a'][(y - 270)/32]);
    thing(p, 'prayMat', 256, 366, { id: 'mymat' });
    spot(p, 'mats-home', [[232, 329, 180, ['pray']], [278, 281, 180, ['pray']], [278, 313, 180, ['pray']], [278, 345, 180, ['pray']], [278, 377, 180, ['pray']]], { tag: 'pray' }, { type: 'mats', imam: 0 });
    thing(p, 'shelf', 206, 398, { sw: 1, low: 1, id: 'quran-home' }).use.who = 'adult';
    /* ---- the yard ---- */
    p = PL.yard = mkPlace('yard', [0, 0, 300, 300], { name: 'yard', wallH: 0, out: '#bddc95', top: 120 });
    p.room('grass', 0, 0, 300, 300, '#b6d98c');
    p.extra.push(() => wallY(0, 0, 300, 76, C.cream) + win('y', 40, 90, 30, 56) + H3.bx(-4, 0, 0, 0, 300, 18, mo(C.woodL), .9));
    p.flats.push(() => fl(196, 30, 264, 46, '#e2d3b5', .7) + shape(on(PZ(.2), ellUV(232, 214, 40, 34, 24)), '#e6d3a6', .9));
    thing(p, 'doorBack', 216, 0, { sw: 1, id: 'door', to: ['home0', 'back'] });
    thing(p, 'bed2', 14, 50, { id: 'bedA' }); thing(p, 'bed2', 14, 140, { id: 'bedB' }); thing(p, 'tree', 30, 250); thing(p, 'swing', 120, 110); thing(p, 'bench', 110, 20, { sw: 1 }); thing(p, 'bush', 270, 60); thing(p, 'bush', 100, 260); thing(p, 'feeder', 180, 250, { id: 'feeder' });
    spot(p, 'sandpit', [[222, 200, 30, ['play', 'sitfloor']], [246, 222, 200, ['play', 'sitfloor']], [214, 232, 300, ['play']]], { offers: { fun: 90 }, dur: [25, 50], who: 'kid' });
    /* ---- the town: two roads each way, four blocks, houses along the back ---- */
    p = PL.street = mkPlace('street', [0, 0, 710, 720], { name: 'town', wallH: 0, out: '#bddc95', top: 215 });
    { const PV = '#ebe2cf', RD = '#a3a7b4', GR = '#b6d98c';
      p.room('grass', 0, 0, 710, 720, GR); p.room('paveW', 70, 110, 110, 720, PV); p.room('paveN', 70, 70, 710, 110, PV);
      for (const [a, b, c, d, inner] of [[160, 160, 420, 400, '#f5ecd8'], [470, 160, 710, 400, '#c6e2a0'], [160, 450, 420, 720, GR], [470, 450, 710, 720, '#c6e2a0']]){ p.room('blk', a, b, c, d, PV); p.room('in', a + 26, b + 26, c === 710 ? 710 : c - 26, d === 720 ? 720 : d - 26, inner); }
      p.room('rA', 110, 110, 160, 720, RD); p.room('rC', 110, 110, 710, 160, RD); p.room('rD', 420, 110, 470, 720, RD); p.room('rB', 0, 400, 710, 450, RD);
      p.flats.push(() => { let s = ''; const W = '#f7f2e4';
        // the middle lines
        for (const x of [134, 444]) for (let y = 200; y < 700; y += 44) if (y < 360 || y > 480) s += fl(x, y, x + 3, y + 22, W, 0);
        for (const y of [134, 424]) for (let x = 20; x < 700; x += 44) if ((x > 196 && x < 380) || x > 506 || (y === 424 && x < 70)) s += fl(x, y, x + 22, y + 3, W, 0);
        // zebra crossings: on the up-down roads, then on the left-right roads
        for (const x of [110, 420]) for (const y of [164, 372, 454]) for (let k = 0; k < 5; k++) s += fl(x + 3 + k*10, y, x + 9 + k*10, y + 22, W, 0);
        for (const y of [110, 400]) for (const x of [164, 394, 474, y === 400 ? 84 : 684]) for (let k = 0; k < 5; k++) s += fl(x, y + 3 + k*10, x + 22, y + 9 + k*10, W, 0);
        // the plaza stones, the sand, the ball field
        for (let x = 212; x < 394; x += 52) s += fl(x, 186, x + 1, 374, '#e2d6bb', 0); for (let y = 212; y < 374; y += 52) s += fl(186, y, 394, y + 1, '#e2d6bb', 0);
        s += shape(on(PZ(.2), ellUV(650, 240, 40, 32, 24)), '#e6d3a6', .9) + fl(236, 520, 360, 640, '#a9d27e', .7) + shape(on(PZ(.2), ellUV(298, 580, 18, 18, 20)), '#b6d98c', .6);
        return s; }); }
    thing(p, 'masjidB', 0, 170, { id: 'masjid', to: ['masjid', 'door'] }); thing(p, 'houseB', 0, 296, { id: 'home', to: ['home0', 'front'], door: C.blue, pots: [C.red, C.yellow] });
    thing(p, 'houseB', 0, 462, { id: 'friends', col: '#e4eed8', roof: C.woodD, door: C.red, hit: 0 }); thing(p, 'houseB', 0, 566, { id: 'elder', col: '#f3e6d0', roof: '#6b7f9a', door: C.green, hit: 0 });
    thing(p, 'houseB', 170, 0, { sw: 1, id: 'gran', to: ['gran', 'door'], col: '#f1e0c4', roof: '#9a6a8a', door: C.teal, pots: [C.pink, C.purple] }); thing(p, 'shopB', 290, 0, { sw: 1, id: 'shop', to: ['shop', 'door'] });
    thing(p, 'schoolB', 480, 0, { sw: 1, id: 'school', to: ['school', 'door'] }); thing(p, 'houseB', 610, 0, { sw: 1, id: 'newhome', col: '#dfe8f2', roof: '#c9704a', door: C.yellow, hit: 0 });
    for (const o of p.objs) if (!o.to) o.use = { tag: 'none', who: 'none' };
    spot(p, 'north', [[8, 425, 0, ['stand']]], { tag: 'door', who: 'none' });
    for (const [x, y] of [[24, 30], [24, 110], [24, 676], [118, 24], [396, 24], [440, 24], [192, 352], [376, 192], [376, 352], [686, 192], [686, 352], [380, 690], [200, 690], [500, 480], [690, 480], [500, 690], [690, 690]]) thing(p, 'tree', x, y, { col: (x + y) % 3 ? C.leaf : '#9cc77a' });
    for (const [x, y] of [[100, 286], [100, 556], [100, 664], [200, 100], [390, 100], [500, 100], [660, 100], [166, 166], [406, 386], [476, 166], [476, 456]]) thing(p, 'lampPost', x, y);
    thing(p, 'postbox', 96, 300); thing(p, 'bin', 94, 456); thing(p, 'bin', 380, 300); thing(p, 'bin', 500, 380);
    // the plaza: fountain, stalls, benches
    thing(p, 'fountain', 270, 262, { id: 'fountain' }); thing(p, 'bench', 222, 254, {}); thing(p, 'bench', 262, 214, { sw: 1 }); thing(p, 'stall', 190, 196, { id: 'stallA' }); thing(p, 'stall', 306, 188, { sw: 1, id: 'stallB', col: C.teal });
    thing(p, 'bowl', 240, 336, { id: 'bowl-town', col: C.red });
    spot(p, 'birds', [[330, 330, 0, ['stand']]], { tag: 'birds', who: 'none' });
    // the playground
    thing(p, 'swing', 520, 196); thing(p, 'slide', 540, 300, {}); thing(p, 'bench', 498, 280, {}); thing(p, 'bush', 600, 196); thing(p, 'bush', 640, 340);
    spot(p, 'sandT', [[636, 226, 30, ['play', 'sitfloor']], [662, 250, 200, ['play', 'sitfloor']], [630, 256, 300, ['play']]], { offers: { fun: 90 }, dur: [25, 50], who: 'kid' });
    // the green: bus stop, ball field, flowers
    thing(p, 'busStop', 272, 456, { sw: 1, id: 'bus3' }); thing(p, 'busSign', 100, 300, { id: 'bus0' }); thing(p, 'busSign', 270, 100, { sw: 1, id: 'bus1' }); thing(p, 'busSign', 484, 300, { id: 'bus2' }); thing(p, 'bush', 196, 484); thing(p, 'bush', 366, 484); thing(p, 'bench', 262, 664, { sw: 1 });
    spot(p, 'fieldT', [[262, 560, 0, ['throw', 'skip']], [334, 560, 180, ['throw', 'wave']], [298, 610, 270, ['skip', 'throw']]], { offers: { fun: 100, social: 30 }, dur: [25, 50], who: 'kid' });
    // the way to the park
    thing(p, 'bush', 540, 560); thing(p, 'bush', 650, 560); thing(p, 'bench', 560, 610, { sw: 1 }); thing(p, 'matExit', 584, 704, { sw: 1, id: 'park', to: ['park', 'gate'], col: C.leaf });
    /* ---- the masjid ---- */
    p = PL.masjid = mkPlace('masjid', [0, 0, 270, 300], { name: 'masjid', wall: '#f4ead6', wallH: 84 });
    p.room('hall', 0, 0, 270, 300, '#3f8f86');
    p.flats.push(() => { let s = ''; for (const x of [66, 102, 138, 174]) s += fl(x, 14, x + 26, 286, '#57a89e', .5) + fl(x + 22, 14, x + 26, 286, '#e9d9a8', 0); return s + fl(26, 126, 60, 174, '#57a89e', .6); });
    p.extra.push(() => shape(on(PX(.2), rectUV(128, 0, 172, 52)), '#e8dcc0', 1) + shape(on(PX(.3), ellUV(150, 52, 22, 22, 20)), '#e8dcc0', 1) + shape(on(PX(.4), rectUV(136, 0, 164, 46)), C.teal, .8) + shape(on(PX(.5), ellUV(150, 46, 14, 14, 18)), C.teal, .8) +
      win('x', 30, 70, 34, 66) + win('x', 230, 270, 34, 66) + win('y', 110, 160, 34, 66));
    thing(p, 'minbar', 4, 186); thing(p, 'shelf', 30, 4, { sw: 1, low: 1, id: 'quran-masjid' }).use.who = 'adult'; thing(p, 'basin', 180, 4, { sw: 1, id: 'wudu-masjid' }); thing(p, 'basin', 222, 4, { sw: 1 });
    thing(p, 'shoeRack', 240, 60); thing(p, 'sadaqah', 240, 220, { id: 'sadaqah' }); thing(p, 'matExit', 256, 134, { id: 'door', to: ['street', 'masjid'] });
    { const rows = [[42, 150, 180, ['pray']]]; for (const x of [80, 116, 152, 188]) for (let y = 30; y <= 270; y += 30) rows.push([x, y, 180, ['pray']]);
      spot(p, 'rows', rows, { tag: 'pray' }, { type: 'mats', imam: 0 }); }
    spot(p, 'circle', [[60, 60, 0, ['sitfloor', 'read']], [84, 44, 90, ['sitfloor']], [84, 76, 270, ['sitfloor']], [108, 60, 180, ['sitfloor']]], { offers: { rest: 60, social: 40 }, dur: [30, 60], who: 'adult' });
    /* ---- the shop and bakery ---- */
    p = PL.shop = mkPlace('shop', [0, 0, 230, 300], { name: 'shop', wall: '#f6e2c0' });
    p.room('floor', 0, 0, 230, 300, '#eadfc8'); p.extra.push(() => win('y', 60, 130, 26, 58));
    thing(p, 'oven', 4, 8, { id: 'oven' }); thing(p, 'breadRack', 4, 66, { id: 'bread' }); thing(p, 'till', 84, 26, { id: 'till' }); thing(p, 'goods', 4, 140, { id: 'goodsA' }); thing(p, 'goods', 4, 220, { id: 'goodsB', cs: [C.green, C.teal, C.yellow, C.purple] });
    thing(p, 'goods', 110, 190, { id: 'goodsC', cs: [C.blue, C.pink, C.red] }); thing(p, 'plant', 208, 6); thing(p, 'matExit', 216, 134, { id: 'door', to: ['street', 'shop'] });
    /* ---- the school ---- */
    p = PL.school = mkPlace('school', [0, 0, 250, 300], { name: 'school', wall: '#f1d9c0' });
    p.room('class', 0, 0, 250, 300, '#e8d8b0'); rug(p, 176, 26, 240, 110, '#7fb7d6');
    p.extra.push(() => shape(on(PX(.2), rectUV(100, 24, 200, 60)), '#3f6b5a', 1.1) + win('y', 60, 120, 28, 58) + win('y', 160, 220, 28, 58));
    spot(p, 'teach', [[26, 150, 0, ['talk', 'stand']]], { tag: 'teach', who: 'teacher' });
    for (const x of [70, 124]) for (const y of [56, 136, 216]) thing(p, 'sdesk', x, y);
    spot(p, 'story', [[196, 50, 180, ['sitfloor', 'read']], [220, 70, 200, ['sitfloor']], [200, 92, 250, ['sitfloor', 'play']]], { offers: { fun: 50, social: 40 }, dur: [25, 50], who: 'kid' });
    thing(p, 'shelf', 4, 220, { id: 'shelf-school' }); thing(p, 'plant', 4, 4); thing(p, 'matExit', 236, 134, { id: 'door', to: ['street', 'school'] });
    /* ---- the park ---- */
    p = PL.park = mkPlace('park', [0, 0, 420, 460], { name: 'park', wallH: 0, out: '#bddc95', top: 130 });
    p.room('grass', 0, 0, 420, 460, '#b6d98c');
    p.flats.push(() => fl(96, 0, 136, 200, '#e6d3a6', .6) + fl(96, 200, 400, 236, '#e6d3a6', .6) + shape(on(PZ(.2), ellUV(110, 350, 62, 48, 28)), '#94cbe2', 1) + shape(on(PZ(.3), ellUV(96, 340, 20, 12, 16)), '#c9e8f3', 0) +
      shape(on(PZ(.2), ellUV(286, 344, 44, 36, 24)), '#e6d3a6', .9) + fl(22, 110, 84, 176, '#e8574a', .9) + fl(28, 116, 78, 170, '#fbf6ea', .5));
    p.extra.push(() => H3.bx(0, -4, 0, 420, 0, 16, mo(C.woodL), .9) + H3.bx(-4, 0, 0, 0, 460, 16, mo(C.woodL), .9));
    p.blocks.push([56, 310, 164, 390]);
    thing(p, 'gate', 96, 0, { sw: 1, id: 'gate', to: ['street', 'park'] }); thing(p, 'ducks', 100, 336, { id: 'ducks', hit: 1 });
    thing(p, 'swing', 190, 60); thing(p, 'swing', 190, 130); thing(p, 'slide', 250, 250, { sw: 0 }); thing(p, 'bench', 150, 250, {}); thing(p, 'bench', 20, 220, {}); thing(p, 'bin', 144, 20); thing(p, 'bush', 20, 20); thing(p, 'bush', 380, 420);
    for (const [x, y] of [[20, 420], [390, 20], [390, 240], [200, 430], [330, 430], [10, 280]]) thing(p, 'tree', x, y);
    spot(p, 'sand', [[270, 330, 20, ['play', 'sitfloor']], [300, 356, 200, ['play', 'sitfloor']], [276, 364, 300, ['play']]], { offers: { fun: 90 }, dur: [25, 50], who: 'kid' });
    spot(p, 'field', [[300, 70, 90, ['throw', 'skip']], [300, 140, 270, ['throw', 'wave']], [350, 60, 135, ['skip']], [350, 150, 225, ['throw']]], { offers: { fun: 100, social: 30 }, dur: [25, 50], who: 'kid' });
    spot(p, 'picnic', [[36, 128, 45, ['sitfloor', 'tea']], [70, 128, 135, ['sitfloor', 'eat']], [36, 160, 315, ['sitfloor']], [70, 160, 225, ['sitfloor', 'tea']]], { offers: { rest: 60, social: 60, hunger: 40 }, dur: [30, 60] });
    spot(p, 'pond', [[176, 330, 180, ['stand']], [120, 296, 270, ['stand']]], { tag: 'pond', offers: { fun: 40, rest: 20 }, dur: [15, 30] });
    /* ---- the grandparents' house ---- */
    p = PL.gran = mkPlace('gran', [0, 0, 230, 280], { name: 'gran', wall: '#f1e0c4' });
    p.room('room', 0, 0, 230, 280, '#e6d2b4'); rug(p, 60, 40, 140, 110, '#9a6a8a'); p.extra.push(() => win('x', 150, 210, 28, 56) + win('y', 120, 180, 28, 56));
    thing(p, 'sofa', 4, 20, { col: '#9a6a8a' }); thing(p, 'shelf', 4, 122); thing(p, 'stove', 4, 196); thing(p, 'counter', 4, 240, { use: { gives: 'dates' } }).use.who = 'adult';
    dining(p, 110, 170, { id: 'table-gran' }); thing(p, 'plant', 60, 4); thing(p, 'plant', 206, 4); thing(p, 'lamp', 90, 6); thing(p, 'bed', 150, 4, { sw: 1, wide: 1, id: 'bed-gran', owner: ['dada', 'dadi'], col: '#c9667a' });
    thing(p, 'matExit', 216, 124, { id: 'door', to: ['street', 'gran'] });
    for (const k in PL) WE.makeGrid(PL[k]);
    return PL;
  }
  // which door leads from one place toward another (first step of the shortest way)
  function nextDoor(PL, from, to){
    if (from === to) return null; const seen = { [from]: 1 }, q = [[from, null]];
    while (q.length){ const [pid, first] = q.shift();
      for (const o of PL[pid].objs){ if (!o.to || seen[o.to[0]]) continue; const f = first || o; if (o.to[0] === to) return f; seen[o.to[0]] = 1; q.push([o.to[0], f]); } }
    return null;
  }
  window.WP = { bike, C, T, ITEM, TIDY, DECOR, build, thing, spot, nextDoor, ctxAt };
})();
