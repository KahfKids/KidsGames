/* Helping Home: the neighbour next door (HHScene.neighbour). Good neighbourliness, with no words needed.
   1. If the family cooked today, there is a covered plate to take: drag it into the neighbour's hands.
   2. Help carry the shopping: three bags by the gate go to the doorstep.
   The neighbour is an older man drawn like the family (faceless). Ends with a wave, a hug and a heart.
   HHScene.neighbour.start(el, { date, plate }) -> Promise<{ done, job: 'help-bags' | 'plate-for-neighbour' }> */
(function () {
  'use strict';
  const SK = window.HSK, mo = matOf;
  const DOOR = [0, 100], STEP = [16, 100, 6], NB = [30, 136, 6];
  function front(){
    let s = H3.bx(-8, -8, -10, 180, 220, 0, mo('#a8744b'), 1, 1.4) + fill(pd(on(PZ(.1), rectUV(-8, -8, 180, 220))), '#a9d47b');
    s += fill(pd(on(PZ(.2), rectUV(10, 84, 180, 118))), '#e8dcc0');                                // the path
    let j = ''; for (let x = 30; x < 180; x += 22) j += pd([[x, 84, .3], [x, 118, .3]], false); s += `<path d="${j}" fill="none" stroke="#c9bfa6" stroke-width=".8"/>`;
    // the house front: wall, door, window, a pot of flowers
    s += fill(pd([[0, -8, 0], [0, 220, 0], [0, 220, 130], [0, -8, 130]]), toneI([1, 0, 0], mo('#efc9a4'))) + ink(pd([[0, -8, 0], [0, 220, 0], [0, 220, 130], [0, -8, 130]]), 1.4);
    s += shape(on(PX(.4), rectUV(DOOR[1] - 22, 0, DOOR[1] + 22, 112)), '#5b8fd6', 1.2) + shape(on(PX(.6), ellUV(DOOR[1] - 14, 58, 2.4, 2.4, 8)), '#f2c230', .6);
    s += shape(on(PX(.4), rectUV(150, 52, 196, 96)), '#cfe2ea', 1.1) + ink(pd(on(PX(.6), [[173, 52], [173, 96]]), false) + pd(on(PX(.6), [[150, 74], [196, 74]]), false), 1);
    s += H3.bx(0, STEP[1] - 26, 0, STEP[0] + 8, STEP[1] + 26, STEP[2], mo('#d9cfbc'), 1, 1.2);
    s += H3.lathe(14, 40, [[0, 7], [14, 9]], mo('#d9805a'), { inner: '#6b4a32', n: 12 }) + H3.ball([12, 38, 20], 4, '#f3a6bb') + H3.ball([16, 43, 19], 4, '#f2c230') + H3.ball([14, 36, 22], 3.5, '#e98fb0');
    // the gate and a low wall at the front
    for (let y = -8; y < 220; y += 14) if (y < 84 || y > 118) s += H3.bx(168, y, 0, 174, y + 10, 24, mo('#d9cfbc'), .8);
    s += H3.bx(168, 84, 0, 172, 88, 30, WOOD, .7) + H3.bx(168, 114, 0, 172, 118, 30, WOOD, .7);
    return s;
  }
  window.HHScene = window.HHScene || {};
  HHScene.neighbour = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const st = SK.open(el, { bounds: [[0, 30, 0], [176, 196, 120]], pitch: 30, top: 90, bottom: 30 });
        let busy = false, nb = { pose: 'stand', frame: 0 };
        const things = [];
        if (opts.plate) things.push({ k: 'covered', p: [150, 100, 0], hit: 40, plate: true });
        const bagC = ['#cfe8de', '#f3d9c4', '#e3e9f6'], bagT = ['#e8574a', '#f2c230', '#93c25c'];
        for (let i = 0; i < 3; i++) things.push({ k: 'sbag', col: bagC[i], top: bagT[i], p: [150 - i*4, 60 + i*24, 0], hit: 40, bag: true });
        const tgt = it => it.plate ? [NB[0] + 10, NB[1] - 6, 46] : [STEP[0], STEP[1] - 16 + things.filter(t => t.bag && t.done).length*14, STEP[2]];
        st.onClose = () => { st.destroy(); resolve({ done: false, job: 'help-bags' }); };
        function draw(w){
          st.draw('st', () => front());
          st.draw('dy', () => {
            const parts = things.filter(t => !t.done || t.bag).map(t => { const p = t.done ? t.at : t.p; return { box: [[p[0] - 9, p[1] - 9, p[2]], [p[0] + 9, p[1] + 9, p[2] + 20]], svg: SK.item(t.k, p, { col: t.col, top: t.top, s: 1.3 }) }; });
            parts.push({ box: [[NB[0] - 10, NB[1] - 10, NB[2]], [NB[0] + 10, NB[1] + 10, NB[2] + 110]], svg: SK.person('neighbour', w ? w.pose : nb.pose, NB, 0, w ? w.frame : nb.frame, things.some(t => t.plate && t.done) ? { prop: 'plate' } : null) });
            return byDepth(parts);
          });
          SK.rings(st); const next = things.find(t => !t.done); if (next && !busy) SK.ring(st, tgt(next), 38);
          st.dots(things.length, things.filter(t => t.done).length);
        }
        draw(); st.onResize = () => draw();
        SK.drag(st, { busy: () => busy, list: () => things.filter(t => !t.done), redraw: () => draw(), plane: 0, lift: 16,
          onDrop(t, e, near){ const g = tgt(t);
            if (near(e, g, 80)){ t.done = true; t.at = t.plate ? [NB[0] + 8, NB[1] - 4, 50] : g; st.sfx(t.plate ? 'h_clink' : 'h_cloth');
              if (t.plate){ t.at = null; st.heart([NB[0], NB[1], 100]); }
              draw(); if (things.every(x => x.done)){ busy = true; SK.end(st, 'neighbour', NB, 0, w => draw(w), resolve, opts.plate ? 'plate-for-neighbour' : 'help-bags'); }
              return true; }
            return false; } });
      });
    },
  };
})();
