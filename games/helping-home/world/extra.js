/* Helping Home world: the life around the people (window.WX): cars and a bus on the town roads, cats and birds, rain.
   Vehicles stop for anyone in front of them. Animals have no faces, like everyone else. Nothing here is scored. */
(function () {
  'use strict';
  const X = window.WX = {}, S = WS, C = WP.C, mo = matOf, rnd = (a, b) => a + Math.random()*(b - a), pick = a => a[Math.floor(Math.random()*a.length)];
  const rot = a => { const c = Math.round(Math.cos(a*Math.PI/180)*1e6)/1e6, s = Math.round(Math.sin(a*Math.PI/180)*1e6)/1e6; return (u, v) => [u*c - v*s, u*s + v*c]; };

  /* ---------- vehicles ---------- */
  const KIND = { car: { L: 56, W: 24 }, bus: { L: 86, W: 26, bus: 1 } };
  function vehSvg(k, col, dir){
    const T = rot(dir), L = k.L, Wd = k.W, ext = (u0, v0, u1, v1) => { const a = T(u0, v0), e = T(u1, v1); return [Math.min(a[0], e[0]), Math.min(a[1], e[1]), Math.max(a[0], e[0]), Math.max(a[1], e[1])]; };
    const b = (u0, v0, z0, u1, v1, z1, c, w) => { const e = ext(u0, v0, u1, v1); return H3.bx(e[0], e[1], z0, e[2], e[3], z1, mo(c), w == null ? .9 : w); };
    const [x0, y0, x1, y1] = ext(-L/2, -Wd/2, L/2, Wd/2), alongX = dir % 180 === 0, top = k.bus ? 42 : 19;
    const fx = (a, z0, c, z1, col2, w) => shape(on(PX(x1 + .2), rectUV(a, z0, c, z1)), col2, w == null ? .6 : w), fy = (a, z0, c, z1, col2, w) => shape(on(PY(y1 + .2), rectUV(a, z0, c, z1)), col2, w == null ? .6 : w);
    let s = ''; for (const u of [-L/2 + 11, L/2 - 11]) s += b(u - 6, -Wd/2 - 1, 0, u + 6, Wd/2 + 1, 10, '#3d3935', .7);
    s += b(-L/2, -Wd/2, 4, L/2, Wd/2, top, col, 1);
    if (k.bus){ s += b(-L/2, -Wd/2, top, L/2, Wd/2, top + 2, '#fbf6ea', .8);
      const side = alongX ? fy : fx, a0 = alongX ? x0 : y0, n = 4; for (let i = 0; i < n; i++) s += side(a0 + 4 + i*(L - 6)/n, 22, a0 + 2 + (i + 1)*(L - 6)/n, 36, C.glass);
      const end = alongX ? fx : fy, e0 = alongX ? y0 : x0; s += end(e0 + 3, 20, e0 + Wd - 3, 36, C.glass) + side(a0, 12, a0 + L, 15, C.green, 0); }
    else s += b(-L/2 + 10, -Wd/2 + 1.5, 19, L/2 - 16, Wd/2 - 1.5, 32, C.glass, .8) + b(-L/2 + 10, -Wd/2 + 1.5, 32, L/2 - 16, Wd/2 - 1.5, 34, col, .8);
    const end = alongX ? fx : fy, e0 = alongX ? y0 : x0, lc = dir < 180 ? '#ffe08a' : C.red;
    return s + end(e0 + 2, 10, e0 + 7, 15, lc, .4) + end(e0 + Wd - 7, 10, e0 + Wd - 2, 15, lc, .4);
  }
  const RING = [[122, 122], [458, 122], [458, 438], [122, 438]], RING2 = [[148, 148], [148, 412], [432, 412], [432, 148]];
  function mkVeh(id, kind, col, pts, loop, sp, o){ return Object.assign({ id, k: KIND[kind], kind, col, pts, loop, sp, seg: 0, x: pts[0][0], y: pts[0][1], dir: 0, wait: 0, halt: 0 }, o || {}); }
  function riders(v, k){
    const pl = S.PL.street, stop = pl.objs.find(o => o.id === 'bus' + k); if (!stop) return;
    for (const p of S.people) if (p.onBus && p.onBus.to === k){ const s0 = stop.slots[0], c = S.freeSpot(p, pl, s0.x, s0.y, 0); p.onBus = null; p.place = 'street'; p.x = c[0]; p.y = c[1]; p.st = 'idle'; p.pose = 'stand'; p.until = S.t + .6; if (X.onRider) X.onRider(p, false); }
    if (S.prayer || S.people.filter(p => p.onBus).length >= 4) return;
    for (const p of S.people) if (p.ai && p.place === 'street' && p.st === 'act' && p.act === stop && !p.talkWith && !p.want && !(p.busCool > S.t) && Math.random() < .75){ p.busCool = S.t + 300;
      S.release(p); p.onBus = { to: (k + 1 + Math.floor(Math.random()*3)) % 4 }; p.place = 'away'; p.st = 'idle'; p.until = 1e12; if (X.onRider) X.onRider(p, true); } }
  function vehTick(v, dt){
    if (v.wait > 0){ v.wait -= dt; if (v.wait <= 0) v.at = null; return; }
    const n = v.pts.length, a = v.pts[v.seg], b = v.pts[(v.seg + 1) % n], dx = b[0] - v.x, dy = b[1] - v.y, l = Math.hypot(dx, dy);
    v.dir = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) ? (b[0] > a[0] ? 0 : 180) : (b[1] > a[1] ? 90 : 270);
    const ux = v.dir === 0 ? 1 : v.dir === 180 ? -1 : 0, uy = v.dir === 90 ? 1 : v.dir === 270 ? -1 : 0, hl = v.k.L/2;
    // anyone in front? then wait
    const ahead = (px, py, far, wide) => { const al = (px - v.x)*ux + (py - v.y)*uy, la = Math.abs((px - v.x)*-uy + (py - v.y)*ux); return al > 0 && al < hl + far && la < wide; };
    let stop = false;
    const town = S.PL.street, ns = town.noStand;
    for (const p of S.people) if (p.place === 'street' && p !== X.rider && ahead(p.x, p.y, 36, v.k.W/2 + 10) && ns.has(WE.cellId(town, p.x, p.y))){ stop = true; break; }
    if (!stop) for (const q of X.pets) if (q.place === 'street' && !q.fly && ahead(q.x, q.y, 30, v.k.W/2 + 6) && ns.has(WE.cellId(town, q.x, q.y))){ if (q.kind === 'bird') fly(q, q.home[0] + rnd(-q.r, q.r), q.home[1] + rnd(-q.r, q.r)); else { stop = true; break; } }
    if (!stop) for (const w of X.cars) if (w !== v && ahead(w.x, w.y, w.k.L/2 + 18, 16)){ stop = true; break; }
    v.halt = stop ? v.halt + dt : 0; if (stop) return;
    const st = v.sp*dt;
    if (v.stops) for (let k = 0; k < v.stops.length; k++){ if (k === v.last) continue; const sx = v.stops[k][0], sy = v.stops[k][1], al = (sx - v.x)*ux + (sy - v.y)*uy, la = Math.abs((sx - v.x)*-uy + (sy - v.y)*ux);
      if (la < 3 && al > -1 && al <= st + .01){ v.x = sx; v.y = sy; v.last = k; v.at = k; v.wait = 6; riders(v, k); return; } }
    if (l <= st){ v.x = b[0]; v.y = b[1]; v.seg++; if (v.seg >= n - (v.loop ? 0 : 1)){ v.seg = 0; if (!v.loop){ v.x = v.pts[0][0]; v.y = v.pts[0][1]; v.wait = rnd(25, 60); v.stopped = false; } } }
    else { v.x += dx/l*st; v.y += dy/l*st; }
  }

  /* ---------- cats and birds ---------- */
  function petSvg(kind, pose, fr, dir, col){
    const T = rot(dir), at = (u, v, z) => { const q = T(u, v); return [q[0], q[1], z]; }, parts = [];
    const ball = (u, v, z, r, c) => parts.push([u, v, H3.ball(at(u, v, z), r, c || col)]), rd = (u0, v0, z0, u1, v1, z1, r, c) => parts.push([(u0 + u1)/2, (v0 + v1)/2, rod(at(u0, v0, z0), at(u1, v1, z1), r, mo(c || col), toneI, .6)]);
    const dk = mix(col, '#000000', .25);
    if (kind === 'bird'){ const pk = pose === 'peck' && fr % 2, up = pose === 'fly';
      ball(0, 0, 4.5, 3.6); ball(pk ? 3.6 : 2.6, 0, pk ? 3.6 : 8, 2.3); rd(-3, 0, 5, -7, 0, 6.5, 1, dk); rd(pk ? 5 : 4.4, 0, pk ? 2.6 : 8, pk ? 6.4 : 6.6, 0, pk ? 1 : 7.6, .6, '#ef8a3c');
      if (up){ const w = fr % 2 ? 9 : 5; rd(0, -1, 6, -1, -7, w, 1.4, dk); rd(0, 1, 6, -1, 7, w, 1.4, dk); } }
    else { const ears = (hx, hz) => { for (const sgn of [-1, 1]) parts.push([hx, sgn*2, shape([at(hx, sgn*3.4, hz + 2), at(hx, sgn*.8, hz + 3.6), at(hx, sgn*2.6, hz + 6.8)], col, .6)]); };
      if (pose === 'sleep'){ ball(0, 0, 4, 6); ball(4.5, 3, 3.6, 3.8); rd(-5, 1, 2, -1, -6, 2, 1.2, dk); }
      else if (pose === 'sit'){ ball(-2, 0, 5, 5.5); ball(1, 0, 9.5, 4.5); ball(3.5, 0, 15, 4.2); ears(3.5, 15); rd(-6, 0, 2, -9, 4, 3, 1.1, dk); }
      else { for (const [u, v, i] of [[-5, -2.5, 0], [-5, 2.5, 1], [4, -2.5, 1], [4, 2.5, 0]]){ const k = (fr + i) % 2 ? 2 : -2; rd(u, v, 7, u + k, v, 0, 1.1, dk); }
        ball(-4, 0, 9, 5); ball(3, 0, 9.5, 5); ball(9, 0, 13, 4.2); ears(9, 13); rd(-8, 0, 10, -13, 0, 17, 1.1, dk); } }
    return parts.sort((a, b) => { const p = T(a[0], a[1]), q = T(b[0], b[1]); return (p[0] + p[1]) - (q[0] + q[1]); }).map(p => p[2]).join('');
  }
  const noStand = pl => pl.noStand || null;
  function petGo(q, x, y, then){ const pl = S.PL[q.place], c = WE.freeNear(pl, x, y, noStand(pl), 0); if (!c) return false; const pa = WE.path(pl, [q.x, q.y], c); if (!pa) return false; q.path = pa; q.then = then || null; q.pose = 'walk'; return true; }
  const rest = (q, pose, secs) => { q.pose = pose; q.until = S.t + secs; };
  function petThink(q){
    const pl = S.PL[q.place], me = S.byId.me, near = me && me.place === q.place ? Math.hypot(me.x - q.x, me.y - q.y) : 1e9;
    if (q.kind === 'bird'){
      const cr = X.crumbs && X.crumbs.place === q.place && S.t < X.crumbs.until ? X.crumbs : null;
      if (cr){ if (Math.hypot(cr.x - q.x, cr.y - q.y) > 18) return fly(q, cr.x + rnd(-12, 12), cr.y + rnd(-12, 12)); return rest(q, 'peck', rnd(2, 4)); }
      if (near < 30) return fly(q, q.home[0] + rnd(-q.r, q.r), q.home[1] + rnd(-q.r, q.r));
      if (Math.hypot(q.x - q.home[0], q.y - q.home[1]) > q.r + 14) return fly(q, q.home[0] + rnd(-q.r, q.r)*.6, q.home[1] + rnd(-q.r, q.r)*.6);
      if (Math.random() < .5 && petGo(q, q.x + rnd(-18, 18), q.y + rnd(-18, 18), () => rest(q, 'peck', rnd(2, 5)))) return;
      return rest(q, Math.random() < .6 ? 'peck' : 'stand', rnd(2, 5)); }
    const bowl = pl.objs.find(o => o.use.tag === 'bowl' && o.prop.o.full);
    if (bowl && petGo(q, bowl.prop.x1 + 8, bowl.prop.y0 + 6, () => { q.face = 180; rest(q, 'sit', 5); q.then2 = () => { if (X.onDrink) X.onDrink(q, bowl); }; })) return;
    if (q.follow > S.t && near < 400 && near > 34 && petGo(q, me.x + rnd(-16, 16), me.y + rnd(10, 22), () => rest(q, 'sit', rnd(2, 5)))) return;
    const r = Math.random();
    if (r < .5 && petGo(q, q.home[0] + rnd(-q.r, q.r), q.home[1] + rnd(-q.r, q.r), () => rest(q, 'sit', rnd(3, 8)))) return;
    rest(q, r < .8 ? 'sit' : 'sleep', r < .8 ? rnd(5, 12) : rnd(14, 28));
  }
  function fly(q, x, y){ const pl = S.PL[q.place], c = WE.freeNear(pl, x, y, noStand(pl), 0) || [q.x, q.y]; q.fly = { x0: q.x, y0: q.y, x1: c[0], y1: c[1], t0: S.t, d: Math.max(.7, Math.hypot(c[0] - q.x, c[1] - q.y)/90) }; q.pose = 'fly'; q.path = null;
    q.face = Math.atan2(c[1] - q.y, c[0] - q.x)*180/Math.PI; }
  function petTick(q, dt){
    if (q.fly){ const f = q.fly, u = Math.min(1, (S.t - f.t0)/f.d); q.x = f.x0 + (f.x1 - f.x0)*u; q.y = f.y0 + (f.y1 - f.y0)*u; q.z = Math.sin(u*Math.PI)*34; q.frame = Math.floor(S.t*9) % 2;
      if (u >= 1){ q.fly = null; q.z = 0; rest(q, 'stand', rnd(1, 3)); } return; }
    if (q.path){ let left = q.sp*dt;
      while (left > 0 && q.path.length){ const n = q.path[0], dx = n[0] - q.x, dy = n[1] - q.y, l = Math.hypot(dx, dy);
        if (l <= left){ q.x = n[0]; q.y = n[1]; left -= l; q.path.shift(); } else { q.x += dx/l*left; q.y += dy/l*left; q.face = Math.atan2(dy, dx)*180/Math.PI; left = 0; } }
      q.frame = Math.floor(S.t*(q.kind === 'bird' ? 8 : 6)) % 2;
      if (!q.path.length){ q.path = null; q.pose = 'sit'; q.until = S.t + 1; const f = q.then; q.then = null; if (f) f(); } return; }
    q.frame = q.pose === 'peck' ? Math.floor(S.t*5 + q.seed) % 2 : 0;
    if (S.t >= q.until){ const f = q.then2; q.then2 = null; if (f) f(); petThink(q); }
  }
  const mkPet = (id, kind, col, place, home, r, sp) => ({ id, kind, col, place, home, r, sp, x: home[0], y: home[1], z: 0, face: 45, pose: kind === 'bird' ? 'stand' : 'sit', frame: 0, until: rnd(0, 4), path: null, follow: 0, seed: Math.random()*9, pet: true });

  /* ---------- rain ---------- */
  const rainPlan = d => { const n = d.getDate()*37 + d.getMonth()*91 + d.getFullYear()*7; return n % 10 < 4 ? { from: 9 + n % 8, len: 1.2 } : null; };
  X.rainNow = () => { if (X.forceRain != null) return X.forceRain; const d = S.now(), r = rainPlan(d), h = d.getHours() + d.getMinutes()/60; return !!r && h >= r.from && h < r.from + r.len; };

  X.stops = [[122, 300], [300, 122], [458, 300], [300, 438]];
  // is a car coming to (or standing on) this spot of the road? People look before they cross.
  X.carNear = (x, y) => { for (const v of X.cars){ const ux = v.dir === 0 ? 1 : v.dir === 180 ? -1 : 0, uy = v.dir === 90 ? 1 : v.dir === 270 ? -1 : 0, al = (x - v.x)*ux + (y - v.y)*uy, la = Math.abs((x - v.x)*-uy + (y - v.y)*ux), hl = v.k.L/2;
      if (v.wait > 0 || v.halt > .3){ if (Math.abs(al) < hl + 12 && la < v.k.W/2 + 8) return true; } else if (al > -hl - 8 && al < hl + 85 && la < v.k.W/2 + 9) return true; } return false; };
  X.init = PL => {
    X.cars = [mkVeh('car1', 'car', C.red, RING, true, 46), mkVeh('car2', 'car', C.blue, RING2, true, 40), mkVeh('car3', 'car', C.teal, RING, true, 46, { seg: 2, x: 458, y: 438 }),
      mkVeh('bus', 'bus', C.yellow, RING, true, 44, { stops: X.stops, seg: 3, x: 122, y: 438, at: null, last: -1 })];
    X.rider = null;
    X.pets = [mkPet('cat', 'cat', '#e39a4a', 'home0', [236, 250], 60, 30), mkPet('cat2', 'cat', '#9aa0aa', 'street', [290, 336], 50, 30)];
    for (let i = 0; i < 4; i++) X.pets.push(mkPet('bird' + i, 'bird', i % 2 ? '#c9d0d6' : '#8f9bb0', 'street', [330, 330], 34, 26));
    for (let i = 0; i < 2; i++) X.pets.push(mkPet('ybird' + i, 'bird', '#b98a5e', 'yard', [200, 236], 34, 26));
    for (const q of X.pets){ const pl = PL[q.place], c = WE.freeNear(pl, q.home[0] + rnd(-20, 20), q.home[1] + rnd(-20, 20), noStand(pl), 0); if (c){ q.x = c[0]; q.y = c[1]; } }
    X.wet = false; X.crumbs = null; S.wet = () => X.wet; S.carNear = X.carNear;
  };
  X.tick = dt => {
    for (const v of X.cars) vehTick(v, dt);
    for (const q of X.pets) petTick(q, dt);
    const w = X.rainNow(); if (w !== X.wet){ X.wet = w; if (X.onRain) X.onRain(w); }
  };
  // what to draw in a place: [{ x, y, z, sprite, pet | nohit }]
  X.actors = place => { const out = [];
    for (const q of X.pets){ if (q.place !== place) continue; const d = ((Math.round(q.face/45)*45) % 360 + 360) % 360;
      const s = WE.bake('a|' + q.kind + q.col + '|' + q.pose + '|' + q.frame + '|' + d, () => ({ svg: inkScale(petSvg(q.kind, q.pose, q.frame, d, q.col)), box: WE.box2([[-16, -16, 0], [16, 16, 24]], 6) })) || q._spr; q._spr = s;
      out.push({ x: q.x, y: q.y, z: q.z, sprite: s, pet: q, nohit: q.kind === 'bird' }); }
    if (place === 'street') for (const v of X.cars){
      const R = v.k.L/2 + 4, s = WE.bake('v|' + v.id + '|' + v.dir, () => ({ svg: WE.world(vehSvg(v.k, v.col, v.dir)), box: WE.box2w([[-R, -R, 0], [R, R, 48]], 8) })) || v._spr; v._spr = s;
      out.push({ x: v.x, y: v.y, z: 0, sprite: s, nohit: true, veh: v }); }
    return out; };
  X.petUrl = (kind, col, px) => WE.svgUrl(inkScale(petSvg(kind, 'sit', 0, 45, col)), WE.box2([[-12, -12, 0], [12, 12, 22]], 4), px || 60);
})();
