/* Helping Home: the corner shop with Ummi (HHScene.shop).
   1. A picture list (4 things, seeded by the day). Drag each from the shelves into Ummi's basket; something not on the
      list floats back to its shelf (no fail).
   2. Home: put the shopping away. Cold things go in the fridge, dry things in the cupboard (a sorting game).
   3. Ummi waves, a hug, a heart. HHScene.shop.start(el, { date }) -> Promise<{ done, job: 'put-away-shopping' }> */
(function () {
  'use strict';
  const SK = window.HSK, mo = matOf;
  const KINDS = ['apple', 'banana', 'bread', 'milk', 'eggs', 'carrot', 'rice', 'dates'];
  const SHELF = { x: 14, z: [6, 36, 66], y0: 26, y1: 176 };
  function seedPick(date){ const n = date.getFullYear()*400 + date.getMonth()*32 + date.getDate(), a = KINDS.slice(); for (let i = a.length - 1; i > 0; i--){ const j = (n*(i + 7) + i*13) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 4); }
  function shopRoom(){
    let s = SK.room({ W: 160, D: 200, H: 110, wall: '#f6efe0', floor: '#e9e1d0' });
    let g = ''; for (let x = 20; x < 160; x += 20) g += pd([[x, 0, .2], [x, 200, .2]], false); for (let y = 20; y < 200; y += 20) g += pd([[0, y, .2], [160, y, .2]], false);
    s += `<path d="${g}" fill="none" stroke="#d6ccb6" stroke-width=".7"/>`;
    // the shop's sign and awning stripe on the back wall
    s += H3.bx(0, 30, 92, 3, 170, 104, mo('#e8574a'), .9);
    for (let y = 40; y < 170; y += 20) s += fill(pd(on(PX(3.1), rectUV(y, 92, y + 10, 104))), '#fbf6ea');
    // shelves along the back wall
    s += H3.bx(0, 20, 0, 28, 24, 84, mo('#b5784a'), .9) + H3.bx(0, 176, 0, 28, 180, 84, mo('#b5784a'), .9);
    for (const z of [4, 34, 64]) s += H3.bx(0, 20, z, 28, 180, z + 2, mo('#e7c591'), .9);
    // the counter and till at the front right
    s += H3.bx(104, 6, 0, 150, 64, 40, mo('#5b8fd6'), 1, 1.6) + H3.bx(102, 4, 40, 152, 66, 44, mo('#efcb98'), .9) + H3.bx(116, 16, 44, 136, 36, 56, mo('#3d3935'), .8) + H3.bx(118, 18, 56, 134, 34, 60, mo('#8af0ae'), .6);
    return s;
  }
  function basket(items){
    const x0 = 96, x1 = 124, y0 = 140, y1 = 166, h = 18, A = on(PZ(.1), rrUV(x0 + 2, y0 + 2, x1 - 2, y1 - 2, 4, 4)), B = on(PZ(h), rrUV(x0, y0, x1, y1, 5, 4));
    let pile = ''; items.forEach((k, i) => { pile += SK.item(k, [x0 + 8 + (i % 2)*11, y0 + 7 + Math.floor(i/2)*10, 6 + i*1.5], { s: 1.2 }); });
    return openShell(A, B, nr => toneI(nr, { l: '#e2b277', m: '#c99555', d: '#8e6236' }), pile) + ink(pd(B), 1.2) + hullInk(A.concat(B), 1.6) +
      H3.rope([[x0 + 2, (y0 + y1)/2, h], [(x0 + x1)/2, (y0 + y1)/2, h + 14], [x1 - 2, (y0 + y1)/2, h]], '#c99555', 2);
  }
  function kitchenRoom(){
    let s = SK.room({ W: 160, D: 200, H: 110, wall: '#fff0bf', floor: '#efc3a0' });
    // the open fridge (left) and the open cupboard (right)
    s += H3.bx(0, 120, 0, 44, 176, 104, mo('#cfe8de'), 1, 1.8);
    s += fill(pd(on(PX(44.2), rectUV(124, 6, 172, 98))), '#eef7f3') + ink(pd(on(PX(44.3), rectUV(124, 6, 172, 98))), 1);
    for (const z of [34, 62]) s += H3.bx(30, 124, z, 45, 172, z + 2, mo('#f6fbfa'), .7);
    s += shape([[44, 176, 0], [80, 192, 0], [80, 192, 104], [44, 176, 104]], toneI([.4, .9, 0], mo('#cfe8de')), 1.1);
    s += H3.bx(0, 10, 0, 40, 80, 60, mo('#fbf4e4'), 1, 1.6) + fill(pd(on(PX(40.2), rectUV(14, 6, 76, 54))), '#8e6236');
    s += H3.bx(28, 14, 28, 41, 76, 30, mo('#efcb98'), .7);
    s += shape([[40, 10, 0], [64, -4, 0], [64, -4, 60], [40, 10, 60]], toneI([.5, -.8, 0], mo('#fbf4e4')), 1.1);
    // the table where the shopping bag stands
    s += H3.bx(78, 70, 30, 128, 140, 34, WOOD, 1, 1.6); for (const [x, y] of [[82, 74], [124, 74], [82, 136], [124, 136]]) s += H3.bx(x - 2, y - 2, 0, x + 2, y + 2, 30, mo('#b5784a'), .6);
    return s;
  }
  window.HHScene = window.HHScene || {};
  HHScene.shop = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const st = SK.open(el, { bounds: [[0, 14, 0], [140, 186, 96]], pitch: 30, top: 96, bottom: 30 });
        const want = seedPick(opts.date || new Date()), got = [];
        let phase = 'shop', items = [], ummi = { name: 'ummi', pose: 'stand', frame: 0 }, busy = false;
        st.onClose = () => { st.destroy(); resolve({ done: false, job: 'put-away-shopping' }); };
        // shelf stock: two of each kind, the listed ones always there
        KINDS.forEach((k, i) => { const z = SHELF.z[i % 3] + 2, y = SHELF.y0 + 14 + (i*47) % 132; items.push({ id: k, k, p: [SHELF.x, y, z], hit: 34 }); });
        const UA = [84, 128, 0];                         // Ummi stands behind her basket, facing the child
        function drawSt(){ st.draw('st', () => phase === 'shop' ? shopRoom() + basket(got) + SK.person('ummi', ummi.pose, UA, 45, ummi.frame) : kitchenRoom() + SK.person('ummi', ummi.pose, [128, 40, 0], 160, ummi.frame)); }
        function drawDy(){ st.draw('dy', () => byDepth(items.filter(it => !it.gone).map(it => ({ box: [[it.p[0] - 8, it.p[1] - 8, it.p[2]], [it.p[0] + 8, it.p[1] + 8, it.p[2] + 16]], svg: SK.item(it.k, it.p, { s: 1.4 }) })))); }
        function rings(){ SK.rings(st); if (phase === 'shop') SK.ring(st, [110, 153, 18], 40); else { SK.ring(st, [40, 148, 50], 42); SK.ring(st, [36, 45, 30], 40); } }
        const all = () => { drawSt(); drawDy(); rings(); st.dots(4, phase === 'shop' ? got.length : 4 - items.filter(i => !i.gone).length); };
        SK.list(st, want); all(); st.onResize = all;
        SK.drag(st, { busy: () => busy, list: () => items.filter(i => !i.gone), redraw: drawDy, plane: 0, lift: 20,
          onDrop(it, e, near){
            if (phase === 'shop'){
              if (near(e, [110, 153, 18], 80) && want.includes(it.k) && !got.includes(it.k)){ it.gone = true; got.push(it.k); SK.tick(st, it.k); st.sfx('h_cloth'); all();
                if (got.length === want.length) setTimeout(home, 600); return true; }
              if (near(e, [110, 153, 18], 80)) st.sfx('h_soft');
              return false;
            }
            const toFridge = near(e, [40, 148, 50], 90), toCup = near(e, [36, 45, 30], 90);
            if ((toFridge && SK.cold(it.k)) || (toCup && !SK.cold(it.k))){ it.gone = true; st.sfx(SK.cold(it.k) ? 'h_clink' : 'h_wood'); st.heart([it.p[0], it.p[1], it.p[2]]); all();
              if (items.every(i => i.gone)) finish(); return true; }
            if (toFridge || toCup) st.sfx('h_soft');
            return false;
          } });
        // home: the bag on the table, the fridge and the cupboard open
        function home(){
          busy = true; SK.rings(st);
          const fade = document.createElement('div'); fade.style.cssText = 'position:absolute;inset:0;background:#f2efe7;opacity:0;transition:opacity .35s;z-index:4;pointer-events:none'; st.el.appendChild(fade);
          requestAnimationFrame(() => fade.style.opacity = 1); st.sfx('h_zoom');
          setTimeout(() => { phase = 'home'; st.el.querySelector('.hsk-list').remove();
            items = got.map((k, i) => ({ id: k, k, p: [88 + (i % 2)*22, 84 + Math.floor(i/2)*26, 34], hit: 36 })); all(); fade.style.opacity = 0; busy = false; setTimeout(() => fade.remove(), 400); }, 450);
        }
        function finish(){ busy = true; SK.rings(st);
          SK.end(st, 'ummi', [128, 40, 0], 160, w => { if (w){ ummi = w; drawSt(); } }, resolve, 'put-away-shopping'); }
      });
    },
  };
})();
