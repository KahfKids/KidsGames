/* Helping Home: catch in the yard with the older sister (HHPlay.catch).
   She throws a soft ball in a gentle arc toward the child's hands. Tap when it reaches the glowing ring to catch it;
   tap the ball in your hands to throw it back. Early taps just clap; a missed ball bounces softly and rolls into the
   hands anyway. Five catches and she waves, a hug, a heart. There is no fail state and no timer.
   HHPlay.catch.start(el, { date }) -> Promise<{ done: true|false, job: 'play-catch' }> */
(function () {
  'use strict';
  const PLAY = window.HHPlay = window.HHPlay || {};
  const SIS = [46, 76, 0], C = [196, 70, 40], RB = 5.2, ROUNDS = 5;
  const skin = () => { if (window.HH && HH.hand) return HH.hand(); try { const s = localStorage.getItem('hh.hand'), v = localStorage.getItem('hh.sleeve'); if (/^#[0-9a-f]{6}$/i.test(s || '')) return { skin: s, sleeve: /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#5b8fd6' }; } catch (e) {} return { skin: '#c98e62', sleeve: '#5b8fd6' }; };

  function yard(){
    const g = matOf('#a9d47b'), soil = matOf('#a8744b');
    let s = box(-6, -6, -10, 214, 150, 0, soil, toneI, 1.2) + fill(pd(on(PZ(.1), rectUV(-6, -6, 214, 150))), g.l);
    let tf = ''; for (let i = 0; i < 40; i++){ const x = 4 + (i*53 % 200), y = 4 + (i*37 % 140); tf += pd([[x, y, 0], [x - 1, y - 1, 4]], false) + pd([[x, y, 0], [x + 1.5, y + 1, 5]], false); }
    s += `<path d="${tf}" fill="none" stroke="#5f9a46" stroke-width="1" stroke-linecap="round"/>`;
    // a picket fence at the back and the right
    let posts = ''; for (let y = 0; y <= 150; y += 15) posts += box(-6, y - 2, 0, -2, y + 2, 34, WOOD, toneI, .7);
    for (let x = 10; x <= 210; x += 15) posts += box(x - 2, -6, 0, x + 2, -2, 34, WOOD, toneI, .7);
    s += posts + box(-6, -6, 22, -3, 150, 26, WOOD, toneI, .7) + box(-6, -6, 22, 214, -3, 26, WOOD, toneI, .7);
    // a tree: trunk and a round crown (shaded discs)
    s += rod([20, 128, 0], [20, 128, 62], 5, matOf('#8e6236'), toneI, 1.2);
    for (const [dx, dy, dz, r] of [[-8, 4, 74, 17], [10, -6, 70, 15], [0, 0, 90, 18]]){ const q = P(20 + dx, 128 + dy, dz), R = r*Math.sqrt(1.5);
      s += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${R.toFixed(1)}" fill="#3f8e4a" stroke="${INK}" stroke-width="1.4"/><circle cx="${(q[0] + R*.12).toFixed(1)}" cy="${(q[1] - R*.14).toFixed(1)}" r="${(R*.8).toFixed(1)}" fill="#5cae6a"/>`; }
    return s;
  }
  function ball(p, shadow){
    const q = P(...p), R = RB*Math.sqrt(1.5);
    let s = '';
    if (shadow){ const g = P(p[0], p[1], 0.2); s += `<ellipse cx="${g[0].toFixed(1)}" cy="${g[1].toFixed(1)}" rx="${(R*1.1).toFixed(1)}" ry="${(R*.55).toFixed(1)}" fill="${SHADOW}" opacity=".35"/>`; }
    return s + `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${R.toFixed(1)}" fill="#c4672a"/><circle cx="${(q[0] + R*.12).toFixed(1)}" cy="${(q[1] - R*.12).toFixed(1)}" r="${(R*.84).toFixed(1)}" fill="#ef8a3c"/>` +
      `<path d="M${(q[0] - R*.9).toFixed(1)} ${(q[1] - R*.1).toFixed(1)}Q${q[0].toFixed(1)} ${(q[1] + R*.5).toFixed(1)} ${(q[0] + R*.9).toFixed(1)} ${(q[1] - R*.1).toFixed(1)}" fill="none" stroke="#fff4d6" stroke-width="1.3"/>` +
      `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  }
  // the child's two hands, cupped (open) or closed round the ball, in their own skin and sleeve colours
  function hands(open){
    const h = skin(), sk = h.skin || '#c98e62', sl = h.sleeve || '#5b8fd6', o = open ? 1 : 0;
    const hand = (sx) => `<g transform="translate(${100 + sx*(26 + o*8)} 70) scale(${sx} 1) rotate(${open ? -14 : 4})">` +
      `<path d="M-10 46 L-12 22 L10 22 L12 46 Z" fill="${sl}" stroke="#231e16" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M-13 24 C-16 6 -12 -12 0 -14 C12 -14 18 -4 16 8 C15 16 12 22 10 24 Z" fill="${sk}" stroke="#231e16" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M14 2 C22 -4 26 2 20 10" fill="${sk}" stroke="#231e16" stroke-width="3" stroke-linecap="round"/></g>`;
    return `<svg viewBox="0 0 200 120">${hand(-1)}${hand(1)}</svg>`;
  }

  PLAY.catch = {
    start(el, opts){
      opts = opts || {};
      return new Promise(resolve => {
        const st = FAMILY.stage(el, { bounds: [[-6, -6, 0], [214, 150, 110]], yaw: 4, pitch: 30, top: 80, bottom: 150 });
        const H = document.createElement('div');
        Object.assign(H.style, { position: 'absolute', left: '50%', bottom: 'calc(env(safe-area-inset-bottom) + 18px)', width: '220px', height: '132px', marginLeft: '-110px', pointerEvents: 'none', transition: 'transform .18s' });
        st.el.appendChild(H);
        let caught = 0, mode = 'idle', sisPose = 'throw', sisFr = 4, bp = null, fly = null, timers = [];
        const T = (f, ms) => timers.push(setTimeout(f, ms));
        const finish = done => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); st.destroy(); try { if (done) window.KahfBridge && KahfBridge.complete(); } catch (e) {} resolve({ done, job: 'play-catch' }); };
        st.onClose = () => finish(false);
        st.draw('st', yard);
        // the catch point sits just above the hands on screen: keep C where the hands are
        const handAt = () => { const r = st.el.getBoundingClientRect(), hr = H.getBoundingClientRect(); return [hr.left - r.left + hr.width/2, hr.top - r.top + hr.height*.42]; };
        let CP = C.slice();
        const placeC = () => { const [x, y] = handAt(); const f = st.floor(st.el.getBoundingClientRect().left + x, st.el.getBoundingClientRect().top + y, 38); CP = [Math.min(700, f[0]), f[1], 38]; };
        const ring = document.createElement('div'); ring.className = 'fam-ring'; st.ov.appendChild(ring); ring.style.display = 'none';
        const placeRing = (hot) => { const [x, y] = st.toPx(CP); Object.assign(ring.style, { left: (x - 40) + 'px', top: (y - 40) + 'px', width: '80px', height: '80px', display: '' });
          ring.style.borderStyle = hot ? 'solid' : 'dashed'; ring.style.borderColor = hot ? '#ffe27a' : 'rgba(255,255,255,.95)'; };
        function draw(){
          st.draw('dy', () => FAMILY.svg('sister', sisPose, SIS, 0, sisFr) + (bp && mode !== 'held' ? ball(bp, bp[0] < 212) : ''));
        }
        H.innerHTML = hands(true);
        const relHand = () => [SIS[0] + 12, SIS[1] - 10, 78];
        let raf = 0;
        function throwIt(){
          mode = 'wind'; sisPose = 'throw'; let k = 0; sisFr = 0; draw(); st.sfx('fam_rustle');
          const w = setInterval(() => { k++; sisFr = Math.min(3, k); draw();
            if (k === 2){ clearInterval(w); release(); } }, 170); timers.push(w);
        }
        function release(){
          placeC(); st.sfx('fam_throw');
          fly = { from: relHand(), to: CP.slice(), t0: performance.now(), dur: 1650, h: 46 }; mode = 'fly'; ring.style.display = '';
          T(() => { sisFr = 4; draw(); }, 300);
          const step = now => { if (mode !== 'fly') return; const u = Math.min(1, (now - fly.t0)/fly.dur), e = 1 - Math.pow(1 - u, 1.6);
            bp = [fly.from[0] + (fly.to[0] - fly.from[0])*e, fly.from[1] + (fly.to[1] - fly.from[1])*e, fly.from[2] + (fly.to[2] - fly.from[2])*e + fly.h*Math.sin(Math.PI*e)];
            fly.u = u; placeRing(u > .62); draw();
            if (u < 1) raf = requestAnimationFrame(step); else miss(); };
          raf = requestAnimationFrame(step);
        }
        function catchIt(soft){
          cancelAnimationFrame(raf); mode = 'held'; ring.style.display = 'none'; caught++; st.dots(ROUNDS, caught);
          H.innerHTML = hands(false); H.style.transform = 'translateY(6px)'; T(() => { H.style.transform = ''; }, 180);
          st.sfx(soft ? 'fam_hop' : 'fam_catch'); draw();
          if (caught === ROUNDS){ T(end, 700); return; }
          if (caught % 2 === 0) st.praise();
          T(() => { if (mode === 'held') throwBack(); }, 2600);
        }
        // a missed ball lands softly in front of the hands, bounces, and rolls in: still a catch
        function miss(){
          mode = 'bounce'; st.sfx('fam_bounce'); const a = bp.slice(), t0 = performance.now();
          const step = now => { const u = Math.min(1, (now - t0)/900); bp = [a[0] + 6*u, a[1], Math.abs(Math.sin(u*Math.PI*2.4))*16*(1 - u) + RB];
            placeRing(false); draw(); if (u < 1) raf = requestAnimationFrame(step); else catchIt(true); };
          raf = requestAnimationFrame(step);
        }
        function throwBack(){
          mode = 'back'; H.innerHTML = hands(true); st.sfx('fam_throw'); const from = CP.slice(), to = relHand(), t0 = performance.now();
          sisPose = 'throw'; sisFr = 4; draw();
          const step = now => { const u = Math.min(1, (now - t0)/1100); bp = [from[0] + (to[0] - from[0])*u, from[1] + (to[1] - from[1])*u, from[2] + (to[2] - from[2])*u + 40*Math.sin(Math.PI*u)];
            draw(); if (u < 1) raf = requestAnimationFrame(step); else { st.sfx('fam_catch'); bp = null; sisFr = 4; draw(); T(throwIt, 1100); } };
          raf = requestAnimationFrame(step);
        }
        function end(){
          mode = 'end'; bp = null; st.praise(); let k = 0;
          const w = setInterval(() => { sisPose = k < 8 ? 'wave' : 'hug'; sisFr = k < 8 ? k % 4 : Math.min(5, k - 8); draw(); k++;
            if (k === 10){ st.sfx('fam_hug'); st.heart([SIS[0], SIS[1], 96]); }
            if (k > 15){ clearInterval(w); T(() => finish(true), 500); } }, 170); timers.push(w);
        }
        // one big target: tap anywhere
        st.el.addEventListener('pointerdown', e => {
          if (e.target.closest('.fam-x')) return;
          if (mode === 'fly'){ if (fly.u > .62) catchIt(false); else { H.innerHTML = hands(false); st.sfx('fam_rustle'); T(() => { if (mode === 'fly') H.innerHTML = hands(true); }, 220); } }
          else if (mode === 'held') throwBack();
        });
        st.dots(ROUNDS, 0); draw();
        st.onResize = () => { st.draw('st', yard); draw(); };
        T(throwIt, 900);
      });
    },
  };
})();
