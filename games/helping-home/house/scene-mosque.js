/* Helping Home: the mosque with Abu (HHScene.mosque). No words are needed; nothing is timed or scored.
   Friday (Jumu'ah): 1. shoes on the rack (Abu's and the child's). 2. Sit beside Abu on the carpet and listen: a quiet
   moment while the khutbah is given (shown only as the minbar and a soft glow; no speech is invented). 3. Then pray:
   the pray button opens the salah guide (Dhuhr's 4 is the fallback for a child praying at home; the house passes
   p=dhuhr). Other days: a quiet visit; tidy the scattered shoes onto the rack and straighten the prayer rugs.
   HHScene.mosque.start(el, { date, kind }) -> Promise<{ done, job: 'mosque-visit', go? }>
   // TEACHER REVIEW: the scene's order (shoes off, sit and listen to the khutbah, then pray) and the Dhuhr fallback. */
(function () {
  'use strict';
  const SK = window.HSK, mo = matOf;
  const RACK = { x0: 0, x1: 22, y0: 20, y1: 90 }, MIN = [14, 150];
  function hall(){
    let s = SK.room({ W: 170, D: 210, H: 120, wall: '#f5eedd', floor: '#d9cdb6' });
    // carpet in rows (prayer lines), arched windows, the mihrab niche, the minbar (steps), a lamp
    s += fill(pd(on(PZ(.3), rectUV(40, 100, 168, 208))), '#3f8a74');
    let rows = ''; for (let x = 56; x < 168; x += 22) rows += pd([[x, 100, .4], [x, 208, .4]], false); s += `<path d="${rows}" fill="none" stroke="#e2b24a" stroke-width="1.2"/>`;
    for (const y of [120, 180]){ const pts = [[y - 10, 40], [y + 10, 40], [y + 10, 74], ...arcUV(y, 74, 10, 0, 180, 8).slice(1, -1), [y - 10, 74]]; s += shape(on(PX(.4), pts), '#cfe2ea', 1.1); }
    const nic = [[136, 0], [164, 0], [164, 56], ...arcUV(150, 56, 14, 0, 180, 10).slice(1, -1), [136, 56]]; s += shape(on(PX(.4), nic), '#e8dcc0', 1.2) + ink(pd(on(PX(.6), nic.map(([u, v]) => [150 + (u - 150)*.8, v*.85]))), .8).replace(INK, '#b5784a');
    s += H3.line3([[60, 160, 120], [60, 160, 96]], INK, 1) + H3.lathe(60, 160, [[80, 6], [96, 8], [100, 3]], mo('#e2b24a'), { n: 8, top: true });
    // shoe rack at the door
    for (const z of [0, 12, 24]) s += H3.bx(RACK.x0, RACK.y0, z, RACK.x1, RACK.y1, z + 2, WOOD, .7);
    s += H3.bx(RACK.x1 - 2, RACK.y0, 0, RACK.x1, RACK.y0 + 2, 26, mo('#b5784a'), .6) + H3.bx(RACK.x1 - 2, RACK.y1 - 2, 0, RACK.x1, RACK.y1, 26, mo('#b5784a'), .6);
    s += shape(on(PX(.4), rectUV(30, 0, 76, 104)), '#b8754a', 1.2);                            // the door
    return s;
  }
  function minbar(){
    let s = ''; for (let i = 0; i < 4; i++) s += H3.bx(MIN[0] + i*9, MIN[1] - 10, 0, MIN[0] + 9 + i*9, MIN[1] + 10, 40 - i*10, WOOD, .8);
    return s + H3.bx(MIN[0], MIN[1] - 11, 40, MIN[0] + 10, MIN[1] + 11, 62, mo('#b5784a'), .9);
  }
  const shoe = (p, col) => H3.mess({ kind: 'shoe', pos: p, rot: p[3] || 0, col }).svg;
  window.HHScene = window.HHScene || {};
  HHScene.mosque = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const d = opts.date || new Date(), friday = opts.kind ? !!opts.kind.friday : d.getDay() === 5;
        const st = SK.open(el, { bounds: [[0, 8, 0], [160, 204, 104]], pitch: 30, top: 90, bottom: 30 });
        let phase = 'shoes', busy = false, sat = false, abu = { pose: 'stand', frame: 0 };
        const cols = friday ? ['#7a5a3a', '#7a5a3a', '#e8574a', '#e8574a'] : ['#7a5a3a', '#3f5d9a', '#5cae6a', '#e8574a', '#9a6bb8'];
        const shoes = cols.map((c, i) => ({ c, p: [44 + (i*17) % 50, 30 + i*14, 0, i*1.3], hit: 34, on: false }));
        const mats = friday ? [] : [{ y: 120, a: .35 }, { y: 150, a: -.3 }, { y: 180, a: .25 }];
        st.onClose = () => { st.destroy(); resolve({ done: false, job: 'mosque-visit' }); };
        let AB = [132, 66, 0];                              // by the door at first; he sits on the carpet to listen
        function drawSt(){ st.draw('st', () => hall() + byDepth([{ box: [[MIN[0], MIN[1] - 11, 0], [MIN[0] + 36, MIN[1] + 11, 62]], svg: minbar() }])); }
        function drawDy(w){
          st.draw('dy', () => {
            const parts = [];
            shoes.forEach((s, i) => { const p = s.on ? [11, RACK.y0 + 9 + (i % 4)*16, 2 + Math.floor(i/4)*12, 0] : s.p; parts.push({ box: [[p[0] - 11, p[1] - 5, p[2]], [p[0] + 11, p[1] + 5, p[2] + 9]], svg: `<g transform="matrix(1.3 0 0 1.3 ${(P(...p.slice(0, 3))[0]*-.3).toFixed(1)} ${(P(...p.slice(0, 3))[1]*-.3).toFixed(1)})">` + shoe(p, s.c) + '</g>' }); });
            mats.forEach(m => { const c = Math.cos(m.a), s2 = Math.sin(m.a), pts = [[-22, -10], [24, -10], [24, 10], [-22, 10]].map(([u, v]) => [110 + u*c - v*s2, m.y + u*s2 + v*c, .8]);
              parts.push({ box: [[84, m.y - 26, .8], [136, m.y + 26, 1]], svg: shape(pts, '#b5443b', 1) + ink(pd(pts.map(([x, y, z]) => [110 + (x - 110)*.8, m.y + (y - m.y)*.8, z + .1])), .7).replace(INK, '#efe0c2') }); });
            const pose = w ? w.pose : abu.pose, fr = w ? w.frame : abu.frame;
            parts.push({ box: [[AB[0] - 10, AB[1] - 10, 0], [AB[0] + 10, AB[1] + 10, 110]], svg: SK.person('abu', pose, AB, 180, fr) });
            if (phase === 'listen' && !sat) parts.push({ box: [[96, 166, 0], [118, 186, 2]], svg: shape(on(PZ(.6), ellUV(106, 184, 10, 10, 16)), '#f4b829', 1) });
            return byDepth(parts.filter(Boolean));
          });
        }
        const total = friday ? 3 : 2, stepN = () => phase === 'shoes' ? 0 : phase === 'listen' ? 1 : 2;
        const all = () => { drawSt(); drawDy(); st.dots(total, stepN()); SK.rings(st); if (phase === 'shoes') SK.ring(st, [11, 55, 14], 44); if (phase === 'listen' && !sat) SK.ring(st, [106, 178, 2], 34); };
        all(); st.onResize = all;
        SK.drag(st, { busy: () => busy || phase !== 'shoes', list: () => shoes.filter(s => !s.on), redraw: () => drawDy(), plane: 0, lift: 10,
          onTap(e){ const b = st.svg.getBoundingClientRect(), hit = (p3, r) => { const [x, y] = st.toPx(p3); return Math.hypot(e.clientX - b.left - x, e.clientY - b.top - y) < r; };
            if (phase === 'listen' && !sat && hit([106, 178, 2], 60)) listen();
            if (phase === 'mats'){ const m = mats.find(m2 => Math.abs(m2.a) > .01 && hit([110, m2.y, 1], 56)); if (m){ const a0 = m.a; st.sfx('h_cloth'); SK.anim(380, k => { m.a = a0*(1 - k); drawDy(); }, () => { m.a = 0; drawDy();
              if (mats.every(x => !x.a)) finish(); }); } } },
          onDrop(s, e, near){ if (near(e, [11, 55, 14], 90)){ s.on = true; st.sfx('h_shoe'); drawDy(); if (shoes.every(x => x.on)) next(); return true; } return false; } });
        function next(){ SK.rings(st); if (friday){ phase = 'listen'; AB = [118, 158, 0]; abu = { pose: 'sitfloor', frame: 0 }; } else { phase = 'mats'; abu = { pose: 'stand', frame: 0 }; } all(); }
        // the quiet moment: a soft glow at the minbar while the khutbah is given; it ends by itself or with a tap
        function listen(){
          sat = true; busy = true; SK.rings(st); drawDy(); st.sfx('h_soft');
          const glow = document.createElement('div'), [x, y] = st.toPx([MIN[0] + 18, MIN[1], 50]);
          glow.style.cssText = `position:absolute;left:${x - 90}px;top:${y - 90}px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,226,140,.6),transparent 70%);pointer-events:none;animation:hhGlow 2.4s ease-in-out infinite alternate`;
          st.ov.appendChild(glow);
          const end = () => { if (phase !== 'listen') return; glow.remove(); phase = 'pray'; st.dots(3, 2); prayBtn(); };
          setTimeout(end, 7000); st.svg.addEventListener('pointerdown', () => setTimeout(end, 300), { once: true });
        }
        function prayBtn(){
          const b = document.createElement('button'); b.setAttribute('aria-label', 'Pray');
          b.style.cssText = 'all:unset;position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 34px);width:84px;height:84px;margin-left:-42px;border-radius:50%;background:#f4b829;border:2.5px solid #231e16;box-shadow:0 4px 0 #231e16;display:grid;place-items:center;cursor:pointer;z-index:3';
          b.innerHTML = '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#231e16" stroke-width="1.8" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1.5" fill="#b5443b"/><path d="M8 9a4 4 0 0 1 8 0v8H8z" fill="#2f6b4f"/></svg>';
          st.el.appendChild(b);
          b.addEventListener('click', () => { st.sfx('h_tap'); st.heart([AB[0], AB[1], 70]);
            const go = window.HHFlow ? HHFlow.url('salah', { from: 'house', p: 'dhuhr' }) : '/KidsGames/games/helping-home/pray/salah.html?from=house&p=dhuhr';
            setTimeout(() => { st.destroy(); resolve({ done: true, job: 'mosque-visit', go }); }, 700); });
        }
        function finish(){ busy = true; SK.end(st, 'abu', AB, 180, w => drawDy(w), resolve, 'mosque-visit'); }
      });
    },
  };
})();
