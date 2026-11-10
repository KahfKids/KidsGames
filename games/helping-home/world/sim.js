/* Helping Home world: the people and their shared day (window.WS).
   ONE simulation for everyone. A person looks at the same world as everybody else: every sitting or standing place (slot)
   is reserved by one person at a time, nobody stands on a taken spot, and free time is chosen from what things offer
   (Sims-style: need x offer, minus distance, minus "someone here is already doing this", one of the best three at random).
   Timetable hours follow the game clock (real time, or a fast practice day); what people do is timed in real seconds. */
(function () {
  'use strict';
  const S = window.WS = {};
  const rnd = (a, b) => a + Math.random()*(b - a), pick = a => a[Math.floor(Math.random()*a.length)];
  const ANIM = { walk: 0, cook: 700, chop: 260, wipe: 330, fold: 520, fix: 300, water: 600, tea: 1100, skip: 210, crawl: 230, talk: 380, nod: 520, eat: 800, play: 650, homework: 520, read: 4000, throw: 420, wave: 180, hug: 220 };
  const SALAH = [['qiyam', 12], ['ruku', 5], ['itidal', 3], ['sujood', 5], ['julus', 3], ['sujood', 5], ['qiyam', 10], ['ruku', 5], ['itidal', 3], ['sujood', 5], ['julus', 3], ['sujood', 5], ['julus', 9], ['salamR', 2], ['salamL', 2]];
  const SALAH_LEN = SALAH.reduce((a, b) => a + b[1], 0), PRAY_WALK = 55, PRAY_ALL = PRAY_WALK + SALAH_LEN + 14;

  /* ---------- who lives here ---------- */
  const B = FAMILY.PEOPLE, cl = (base, o) => Object.assign({}, B[base], o, { col: Object.assign({}, B[base].col, o.col || {}) });
  B.imam = cl('abu', { col: { top: '#fbf6ea', legs: '#fbf6ea', kufi: '#fbf6ea', hair: '#3a2a1e' }, dress: true });
  B.dada = cl('neighbour', { col: { top: '#6b8f71', legs: '#6a6258', kufi: '#fbf6ea', hair: '#e8e4da' } });
  B.dadi = cl('ummi', { col: { top: '#9a6a8a', legs: '#9a6a8a', scarf: '#f1e7d4' } });
  B.teacher = cl('ummi', { col: { top: '#5b7fb8', legs: '#5b7fb8', scarf: '#f2c9a0' } });
  B.keeper = cl('abu', { col: { top: '#5cae6a', legs: '#6a5a48', hair: '#2a2018' }, hat: null, beard: false });
  B.baker = cl('neighbour', { col: { top: '#fbf6ea', legs: '#8a8f9a', kufi: '#fbf6ea', hair: '#5a4636' } });
  B.elder = B.neighbour;
  B.ndad = cl('abu', { col: { top: '#c9704a', legs: '#3d4a5a', hair: '#2a2018', kufi: '#3f9c92' } });
  B.nmum = cl('ummi', { col: { top: '#d98a4a', legs: '#d98a4a', scarf: '#5a7a4a' } });
  B.friendg = cl('sister', { col: { top: '#5cae6a', legs: '#8a63ad', scarf: '#f2c230', shoe: '#5b8fd6' } });
  B.friendb = cl('sister', { col: { top: '#5b8fd6', legs: '#6a5a48', shoe: '#3d3935', hair: '#2a2018' }, scarf: null, tunic: false, hair: 'tuft' });
  B.newmum = cl('ummi', { col: { top: '#4a7cc0', legs: '#4a7cc0', scarf: '#e8a0b0' } });
  B.newkid = cl('sister', { col: { top: '#e8574a', legs: '#3f5d9a', shoe: '#3d3935', hair: '#33261c' }, scarf: null, tunic: false, hair: 'tuft' });
  // the timetable: [from hour, place or list of places, what]. '@ummi' = wherever Ummi is. 'away' = at work or in their own house.
  const SL = 'sleep', KID_FREE = [['park', 'street'], ['park', 'yard', 'home1'], ['park', 'yard']];
  const SCH = {
    abu: w => w ? [[0, 'home1', SL], [5.2, 'home0'], [7.5, 'home0', 'eat'], [8.2, ['yard', 'home0']], [10, ['park', 'street', 'yard']], [13, 'home0', 'eat'], [13.6, ['home0', 'yard']], [16, ['park', 'yard']], [18.5, 'home0', 'eat'], [19.2, 'home0'], [22.5, 'home1', SL]]
      : [[0, 'home1', SL], [5.2, 'home0'], [7.5, 'home0', 'eat'], [8.1, 'away'], [16.5, ['home0', 'yard']], [18.5, 'home0', 'eat'], [19.2, ['home0', 'yard']], [22.5, 'home1', SL]],
    ummi: () => [[0, 'home1', SL], [5.2, 'home0'], [6.8, 'home0', 'cook'], [7.5, 'home0', 'eat'], [8.2, 'home0'], [10, ['shop', 'home0', 'yard']], [11, 'home0'], [12.2, 'home0', 'cook'], [13, 'home0', 'eat'], [13.6, ['home0', 'home1']], [16, ['park', 'yard', 'home0']], [17.6, 'home0', 'cook'], [18.5, 'home0', 'eat'], [19.2, ['home0', 'home1']], [22.3, 'home1', SL]],
    sister: w => w ? [[0, 'home1', SL], [7.4, 'home0'], [7.5, 'home0', 'eat'], [8.2, ['home1', 'yard', 'home0']], [10, KID_FREE[2]], [13, 'home0', 'eat'], [13.6, ['home1', 'yard']], [15.5, KID_FREE[0]], [18.5, 'home0', 'eat'], [19.2, ['home0', 'home1']], [21, 'home1', SL]]
      : [[0, 'home1', SL], [6.9, 'home0'], [7.5, 'home0', 'eat'], [8.1, 'school', 'class'], [15, 'home0'], [15.4, 'home1', 'study'], [16.2, KID_FREE[1]], [18.5, 'home0', 'eat'], [19.2, ['home0', 'home1']], [21, 'home1', SL]],
    toddler: () => [[0, 'home1', SL], [7, 'home0'], [7.5, 'home0', 'eat'], [8.2, ['home1', 'home0']], [10, '@ummi'], [13, 'home0', 'eat'], [13.6, 'home1', SL], [15, ['home1', 'home0']], [16, '@ummi'], [18.5, 'home0', 'eat'], [19.2, 'home1'], [20, 'home1', SL]],
    imam: () => [[0, 'away'], [4.5, 'masjid'], [7, 'away'], [9, 'masjid'], [11, ['street', 'masjid']], [12, 'masjid'], [14, 'away'], [15, 'masjid'], [17, ['park', 'masjid', 'street']], [18, 'masjid'], [21.5, 'away']],
    teacher: w => w ? [[0, 'away'], [10, ['park', 'shop', 'street']], [12, 'away'], [16, ['park', 'street']], [17.5, 'away']] : [[0, 'away'], [7.6, 'school', 'teach'], [15.3, ['shop', 'park', 'street']], [16.5, 'away']],
    keeper: () => [[0, 'away'], [8, 'shop', 'till'], [20, 'away']],
    baker: () => [[0, 'away'], [5, 'shop', 'bake'], [14, ['park', 'street', 'masjid']], [16.5, 'away'], [17.5, ['park', 'street']], [19, 'away']],
    elder: () => [[0, 'away'], [6, 'street'], [9, 'away'], [10, ['street', 'park']], [12, 'masjid'], [13.5, 'away'], [15.5, ['park', 'street']], [18, 'masjid'], [20.5, 'away']],
    ndad: w => w ? [[0, 'away'], [9.5, ['park', 'street']], [12, 'away'], [16, 'park'], [18, 'away']] : [[0, 'away'], [17, ['street', 'park']], [18.2, 'away']],
    nmum: () => [[0, 'away'], [10.5, ['shop', 'street']], [11.6, 'away'], [16, 'park'], [17.6, 'away']],
    friendb: w => w ? [[0, 'away'], [9.5, ['park', 'street']], [12.5, 'away'], [15, 'park'], [18, 'away']] : [[0, 'away'], [8, 'school', 'class'], [15, ['park', 'street']], [18, 'away']],
    friendg: w => w ? [[0, 'away'], [10, ['park', 'street']], [12.5, 'away'], [15.2, 'park'], [18, 'away']] : [[0, 'away'], [8, 'school', 'class'], [15.2, ['park', 'street']], [17.8, 'away']],
    dada: w => w ? [[0, 'gran', SL], [5.5, 'gran'], [8, 'gran', 'eat'], [10, ['home0', 'yard']], [13, 'home0', 'eat'], [13.6, ['home0', 'yard']], [17, 'gran'], [19, 'gran', 'eat'], [21.5, 'gran', SL]]
      : [[0, 'gran', SL], [5.5, 'gran'], [8, 'gran', 'eat'], [9, ['gran', 'street']], [13, 'gran', 'eat'], [14, 'gran'], [16, ['park', 'street', 'gran']], [19, 'gran', 'eat'], [21.5, 'gran', SL]],
    dadi: w => w ? [[0, 'gran', SL], [5.5, 'gran'], [8, 'gran', 'eat'], [10, 'home0'], [13, 'home0', 'eat'], [13.6, 'home0'], [17, 'gran'], [18.2, 'gran', 'cook'], [19, 'gran', 'eat'], [21.5, 'gran', SL]]
      : [[0, 'gran', SL], [5.5, 'gran'], [7.2, 'gran', 'cook'], [8, 'gran', 'eat'], [9, 'gran'], [12.2, 'gran', 'cook'], [13, 'gran', 'eat'], [14, 'gran'], [16.5, ['street', 'gran']], [18.2, 'gran', 'cook'], [19, 'gran', 'eat'], [21.5, 'gran', SL]],
    newmum: () => [[0, 'away'], [10, ['street', 'shop']], [11.5, 'away'], [16, ['park', 'street']], [17.5, 'away']],
    newkid: w => w ? [[0, 'away'], [10, ['park', 'street']], [12.5, 'away'], [15, 'park'], [18, 'away']] : [[0, 'away'], [8, 'school', 'class'], [15, ['park', 'street']], [18, 'away']],
  };
  //            id, kid, male, walking speed, what they sometimes wish for, the street door they come and go by, where they pray
  const DEF = [
    ['abu', 0, 1, 40, ['dates', 'cup', 'bread'], 'north', 'masjid'], ['ummi', 0, 0, 38, ['bread', 'veg', 'flower'], 'north', 'home1'], ['sister', 1, 0, 44, ['book', 'flower'], 'north', 'home1'],
    ['toddler', 1, 1, 24, ['ball', 'book', 'fruit'], 'north', null], ['dada', 0, 1, 26, ['bread', 'dates', 'cup'], 'gran', 'masjid'], ['dadi', 0, 0, 26, ['flower', 'veg', 'bread'], 'gran', 'gran'],
    ['imam', 0, 1, 34, ['flower', 'book'], 'north', 'masjid'], ['teacher', 0, 0, 38, ['flower', 'book'], 'north', null], ['keeper', 0, 1, 38, ['cup'], 'north', 'masjid'],
    ['baker', 0, 1, 34, ['cup', 'flower'], 'elder', 'masjid'], ['elder', 0, 1, 22, ['bread', 'cup', 'dates', 'meal'], 'elder', 'masjid'], ['ndad', 0, 1, 40, ['dates'], 'friends', 'masjid'],
    ['nmum', 0, 0, 38, ['dates', 'bread', 'flower', 'meal'], 'friends', null], ['friendb', 1, 1, 46, ['ball'], 'friends', 'masjid'], ['friendg', 1, 0, 46, ['ball', 'flower', 'book', 'fruit'], 'friends', null],
    ['newmum', 0, 0, 38, ['bread', 'dates', 'flower'], 'newhome', null], ['newkid', 1, 1, 46, ['ball', 'fruit'], 'newhome', 'masjid'],
  ];
  const COOKS = { ummi: 1, dadi: 1 };

  /* ---------- the world ---------- */
  S.reset = (PL, o) => {
    o = o || {};
    S.PL = PL; S.people = []; S.byId = {}; S.loose = {}; S.t = 0; S.prayer = null; S.lastPrayerKey = ''; S.wantT = 40;
    S.clock = { base: o.start || Date.now(), real0: 0, speed: o.speed || 1 };
    for (const k in PL){ S.loose[k] = []; for (const ob of PL[k].objs) for (const s of ob.slots) s.by = null; }
    { const st = PL.street, ns = st.noStand = new Set(), cost = st.cost = new Uint8Array(st.grid.cols*st.grid.rows), band = (v, l) => l.some(a => v > a - 4 && v < a + 26);
      const zebra = (x, y) => (((x > 110 && x < 160) || (x > 420 && x < 470)) && band(y, [164, 372, 454])) || (y > 110 && y < 160 && band(x, [164, 394, 474, 684])) || (y > 400 && y < 450 && band(x, [84, 164, 394, 474]));
      for (const r of st.rooms) if (r.id[0] === 'r' && r.id.length === 2) for (let x = r.x0 + 5; x < r.x1; x += 10) for (let y = r.y0 + 5; y < r.y1; y += 10){ const id = WE.cellId(st, x, y); ns.add(id); cost[id] = zebra(x, y) ? 0 : 4; } }
    S.minbar = null;
    if (!PL.street.objs.find(x => x.id === 'north')) WP.spot(PL.street, 'north', [[110, 8, 90, ['stand']]], { tag: 'door', who: 'none' });
    if (!PL.gran.objs.find(x => x.id === 'mats-gran')) WP.spot(PL.gran, 'mats-gran', [[150, 120, 180, ['pray']], [176, 150, 180, ['pray']]], { tag: 'pray' }, { type: 'mats' });
    for (const [id, kid, male, sp, wants, gate, prayAt] of DEF){
      if ((id === 'newmum' || id === 'newkid') && !o.newFamily) continue;
      const p = { id, body: id, kid: !!kid, male: !!male, sp, wants, gate, prayAt, place: 'away', x: 0, y: 0, z: 0, face: 0, pose: 'stand', frame: 0, path: null, act: null, slot: null, until: 0, st: 'idle', ai: true,
        need: { hunger: rnd(50, 90), rest: rnd(50, 90), fun: rnd(40, 90), social: rnd(40, 90), tidy: rnd(40, 90) }, last: null, want: null, ox: 0, oy: 0, walked: 0, seed: Math.random()*1000, cool: 0, ver: 0 };
      S.people.push(p); S.byId[id] = p;
    }
    // start everyone where the timetable says, without the walk
    for (const p of S.people){ const d = duty(p); if (d.place !== 'away' && PL[d.place]){ p.place = d.place; const dr = PL[d.place].objs.find(o => o.to), s0 = dr ? dr.slots[0] : { x: 100, y: 100 }, c = freeSpot(p, PL[d.place], s0.x + rnd(-30, 30), s0.y + rnd(-30, 30), 1); p.x = c[0]; p.y = c[1]; } }
  };
  S.addMe = (body, place, x, y) => { const p = { id: 'me', body, kid: true, sp: 60, place, x, y, z: 0, face: 45, pose: 'stand', frame: 0, path: null, act: null, slot: null, until: 0, st: 'idle', ai: false, need: {}, ox: 0, oy: 0, walked: 0, seed: 1, ver: 0 };
    S.people = S.people.filter(q => q.id !== 'me'); S.people.push(p); S.byId.me = p; return p; };
  S.now = () => new Date(S.clock.base + (S.t - S.clock.real0)*1000*S.clock.speed);
  S.setSpeed = sp => { const n = S.now().getTime(); S.clock = { base: n, real0: S.t, speed: sp }; };
  S.hour = () => { const d = S.now(); return d.getHours() + d.getMinutes()/60 + d.getSeconds()/3600; };
  const FIX = { fajr: 5, dhuhr: 12.5, asr: 15.75, maghrib: 18.25, isha: 19.75 };
  let ptCache = { k: '', v: null };
  S.prayerHours = () => { const d = S.now(), k = d.toDateString(); if (ptCache.k === k) return ptCache.v;
    let v = FIX; try { const t = window.HHPrayer && HHPrayer.times(d); if (t){ v = {}; for (const n in FIX) v[n] = t[n].getHours() + t[n].getMinutes()/60; } } catch (e) {}
    ptCache = { k, v }; return v; };
  const weekend = () => { const g = S.now().getDay(); return g === 0 || g === 6; };

  function duty(p){
    if (S.override){ const o = S.override(p); if (o) return o; }
    if (S.prayer && S.t < S.prayer.until && p.prayAt && (p.place !== 'away' || p.id === 'imam' || !p.ai) && !(S.prayer.name === 'fajr' && p.kid)) return { place: p.prayAt, tag: 'pray' };
    if (S.prayer && p.id === 'toddler' && S.prayer.name === 'maghrib' && S.t < S.prayer.until) return { place: 'home1', tag: 'pray' };
    const rows = SCH[p.id](weekend()), h = S.hour(); let r = rows[0];
    for (const x of rows) if (x[0] <= h) r = x;
    let pl = r[1];
    if (pl === '@ummi'){ const u = S.byId.ummi; pl = u ? duty(u).place : 'home0'; }
    if (Array.isArray(pl)) pl = pl[Math.floor((p.seed + r[0]*7 + S.now().getDate()*3) % pl.length)];
    let tag = r[2] || null; const base = HOME[p.id];
    // rain: people who were going to be outside stay in
    if (S.wet && S.wet() && OUT[pl] && !tag) pl = base || (p.id === 'imam' ? 'masjid' : 'away');
    // Ramadan: a meal before fajr and one at sunset; grown-ups do not eat in the day
    if (S.cal && S.cal.ramadan && base){ const T = S.prayerHours();
      if (p.id !== 'toddler' && ((h >= T.fajr - 1 && h < T.fajr - .1) || (h >= T.maghrib && h < T.maghrib + 1.1))) return { place: base, tag: 'eat' };
      if ((tag === 'eat' || (tag === 'cook' && h < T.maghrib - 2.5)) && !p.kid && h > T.fajr && h < T.maghrib){ tag = null; } }
    return { place: pl, tag };
  }
  const OUT = { park: 1, yard: 1, street: 1 }, HOME = { abu: 'home0', ummi: 'home0', sister: 'home0', toddler: 'home0', dada: 'gran', dadi: 'gran' };
  S.duty = duty;

  /* ---------- spots ---------- */
  function taken(pl, skip){ const t = new Set();
    for (const q of S.people){ if (q.place !== pl.id || q === skip) continue; t.add(WE.cellId(pl, q.x, q.y)); if (q.st !== 'walk') for (const [a, b] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) t.add(WE.cellId(pl, q.x + a, q.y + b)); if (q.path && q.path.length){ const e = q.path[q.path.length - 1]; t.add(WE.cellId(pl, e[0], e[1])); } }
    for (const ob of pl.objs) for (const s of ob.slots) t.add(WE.cellId(pl, s.x, s.y));
    if (pl.noStand){ const ns = pl.noStand; return { has: id => t.has(id) || ns.has(id) }; }
    return t; }
  function freeSpot(p, pl, x, y, minR){ const b = pl.bounds; if (x == null){ x = rnd(b[0] + 30, b[2] - 30); y = rnd(b[1] + 30, b[3] - 30); }
    return WE.freeNear(pl, x, y, taken(pl, p), minR) || [x, y]; }
  S.freeSpot = freeSpot;
  function release(p){ if (p.slot){ if (p.slot.by === p.id) p.slot.by = null; p.slot = null; } p.act = null; p.z = 0; p.on = null; }
  S.release = release;
  const whoOk = (p, ob) => { const w = ob.use.who; if (ob.owner) return [].concat(ob.owner).includes(p.id);
    return !w || (w === 'kid' ? p.kid : w === 'adult' ? !p.kid : w === 'cook' ? !!COOKS[p.id] : w === 'reader' ? p.id !== 'toddler' : w === 'student' ? p.kid && p.id !== 'toddler' : w === p.id); };

  function go(p, to, then){
    const pl = S.PL[p.place], path = WE.path(pl, [p.x, p.y], to);
    if (!path){ p.until = S.t + 3; p.st = 'idle'; return false; }
    p.path = path; p.then = then || null; p.st = 'walk'; p.pose = p.id === 'toddler' && Math.random() < .25 ? 'crawl' : 'walk'; p.stuck = S.t; return true;
  }
  S.go = go;
  function useSlot(p, ob, s, poses, dur){
    release(p); s.by = p.id; p.slot = s; p.act = ob;
    return go(p, [s.x, s.y], () => { p.face = s.face; p.z = s.z; p.on = s.on; p.pose = pick(poses || s.poses); p.until = S.t + (dur || rnd(...(ob.use.dur || [20, 40]))); p.st = 'act';
      const of = ob.use.offers; if (of) for (const k in of) p.need[k] = Math.min(100, (p.need[k] || 0) + of[k]*.6); });
  }
  S.useSlot = useSlot;
  function travel(p, door){
    const to = door.to, s = door.slots[0];
    release(p);
    go(p, [s.x, s.y], () => { if (to[0] === 'away'){ p.place = 'away'; p.st = 'idle'; p.until = S.t + 5; return; } arrive(p, to[0], to[1]); });
  }
  function arrive(p, place, objId){
    const pl = S.PL[place], ob = pl.objs.find(o => o.id === objId), s = ob ? ob.slots[0] : null;
    p.place = place; p.path = null; const c = WE.freeNear(pl, s ? s.x : 50, s ? s.y : 50, taken(pl, p)) || [s.x, s.y]; p.x = c[0]; p.y = c[1]; p.st = 'idle'; p.until = S.t + .4; p.pose = 'stand'; p.ox = p.oy = 0;
    if (!p.ai && S.onArrive) S.onArrive(p, place);
  }
  S.arrive = arrive; S.travel = travel;

  /* ---------- deciding ---------- */
  function think(p){
    const d = duty(p); release(p); p.pose = 'stand';
    if (p.place === 'away'){ if (d.place === 'away'){ p.until = S.t + 8; return; } arrive(p, 'street', p.gate); return; }
    if (d.place === 'away'){ const pl = S.PL[p.place]; if (p.place === 'street'){ const g = pl.objs.find(o => o.id === p.gate); travel(p, { to: ['away'], slots: g.slots }); } else { const dr = WP.nextDoor(S.PL, p.place, 'street'); if (dr) travel(p, dr); else p.until = S.t + 5; } return; }
    if (d.place !== p.place){ const dr = WP.nextDoor(S.PL, p.place, d.place); if (dr) travel(p, dr); else p.until = S.t + 5; return; }
    const pl = S.PL[p.place];
    if (d.tag){
      const tagOf = { sleep: 'sleep', eat: 'eat', cook: 'cook', class: 'class', teach: 'teach', till: 'till', bake: 'bake', pray: 'pray', study: 'study' }[d.tag];
      let cands = pl.objs.filter(o => o.use.tag === tagOf && (d.tag === 'pray' || whoOk(p, o) || (tagOf === 'study' && o.owner && [].concat(o.owner).includes(p.id))));
      if (d.tag === 'sleep') cands = cands.filter(o => o.owner && [].concat(o.owner).includes(p.id));
      for (const ob of cands){
        let free = ob.slots.filter(s => !s.by);
        if (d.tag === 'pray'){ const lead = p.id === 'imam' || (ob.id === 'mats-home' && p.id === 'abu'); free = lead ? free.filter(s => s === ob.slots[0]) : free.filter(s => s !== ob.slots[0] || ob.id === 'mats-gran'); }
        if (d.tag === 'till') free = free.filter(s => s === ob.slots[0]);
        if (!free.length) continue;
        const s = d.tag === 'pray' || d.tag === 'eat' ? free[0] : pick(free), long = d.tag === 'sleep' || d.tag === 'class' || d.tag === 'teach' || d.tag === 'till' ? rnd(50, 90) : d.tag === 'pray' ? Math.max(8, S.prayer ? S.prayer.until - S.t : 20) : null;
        if (useSlot(p, ob, s, d.tag === 'pray' ? ['stand'] : null, long)){ p.praying = d.tag === 'pray'; return; }
      }
      if (d.tag === 'till' || d.tag === 'teach' || d.tag === 'bake'){ wander(p, pl); return; }
    }
    p.praying = false;
    { const me = S.byId.me; if (p.followMe > S.t && me && me.place === p.place){ const c = freeSpot(p, pl, me.x, me.y, 2); if (Math.hypot(c[0] - p.x, c[1] - p.y) < 12){ p.st = 'act'; p.until = S.t + 2; return; } if (go(p, c, () => { p.st = 'act'; p.until = S.t + 2; p.face = Math.atan2(me.y - p.y, me.x - p.x)*180/Math.PI; })) return; } }
    // free time: score what this place offers
    const sc = [];
    for (const ob of pl.objs){ const u = ob.use; if (!u.offers || u.tag === 'eat' && p.need.hunger > 45 || !whoOk(p, ob)) continue;
      const free = ob.slots.filter(s => !s.by); if (!free.length) continue;
      let v = 0; for (const k in u.offers) v += u.offers[k]*Math.pow(1 - (p.need[k] || 50)/100, 2);
      const s = free[Math.floor(Math.random()*free.length)], dist = Math.hypot(s.x - p.x, s.y - p.y);
      v -= dist/14; if (ob.id === p.last) v -= 30;
      v -= 22*S.people.filter(q => q !== p && q.place === p.place && q.act && q.act.type === ob.type && q.act !== ob).length;
      v += rnd(0, 18); sc.push([v, ob, s]); }
    const soc = Math.pow(1 - p.need.social/100, 2)*70 + rnd(0, 14); if (soc > 16) sc.push([soc, 'chat']);
    sc.push([rnd(4, 22) + (pl.wallH ? 0 : 10), 'wander']);
    if (p.kid && S.byId.me && S.byId.me.place === p.place && (S.friend ? S.friend(p.id) : 0) > 2) sc.push([rnd(10, 34), 'follow']);
    sc.sort((a, b) => b[0] - a[0]);
    const ch = sc[Math.floor(Math.random()*Math.min(3, sc.length))];
    if (ch[1] === 'chat'){ if (!chat(p, pl)) wander(p, pl); }
    else if (ch[1] === 'wander') wander(p, pl);
    else if (ch[1] === 'follow'){ const me = S.byId.me, c = freeSpot(p, pl, me.x, me.y, 2); go(p, c, () => { p.st = 'act'; p.until = S.t + rnd(4, 9); p.face = Math.atan2(me.y - p.y, me.x - p.x)*180/Math.PI; p.pose = 'stand'; }); }
    else { p.last = ch[1].id; useSlot(p, ch[1], ch[2]); }
  }
  function wander(p, pl){ const c = freeSpot(p, pl); if (!go(p, c, () => { p.st = 'act'; p.pose = 'stand'; p.until = S.t + rnd(4, 12); })) p.until = S.t + 3; }
  const BUSY = { sleep: 1, eat: 1, class: 1, pray: 1, teach: 1 };
  function chat(p, pl){
    const c = S.people.filter(q => q !== p && q.place === p.place && q.st === 'act' && !q.talkWith && !(q.act && BUSY[q.act.use.tag]) && !q.praying && q.ai);
    if (!c.length) return false;
    const q = pick(c), a = Math.atan2(p.y - q.y, p.x - q.x), spot = WE.freeNear(pl, q.x + Math.cos(a)*20, q.y + Math.sin(a)*20, taken(pl, p), 0);
    if (!spot || Math.hypot(spot[0] - q.x, spot[1] - q.y) > 44) return false;
    q.until = Math.max(q.until, S.t + 25); q.talkWith = p.id;
    return go(p, spot, () => { const dur = rnd(10, 20); p.st = 'act'; p.pose = 'talk'; p.until = S.t + dur; p.face = Math.atan2(q.y - p.y, q.x - p.x)*180/Math.PI; p.need.social = 100;
      if (q.st === 'act' && q.place === p.place){ q.until = S.t + dur; q.need.social = 100; if (q.pose === 'stand'){ q.pose = 'nod'; q.face = p.face + 180; } }
      p.talkWith = q.id; });
  }

  /* ---------- prayer: the whole town moves with the adhan ---------- */
  S.callPrayer = name => { const k = S.clock.speed > 1 ? .45 : 1;      // a fast practice day prays a shorter picture of the prayer
    const jum = name === 'dhuhr' && S.cal && S.cal.friday, KH = jum ? 24 : 0;
    S.prayer = { name, t0: S.t, k, until: S.t + (PRAY_ALL + KH)*k, start: S.t + PRAY_WALK*k, kh: KH };
    for (const p of S.people) if (p.ai && p.place !== 'away' && (p.prayAt || p.id === 'toddler') && !(p.act && p.act.use.tag === 'sleep' && p.kid)){ p.until = 0; if (p.st === 'walk'){ p.path = null; p.st = 'idle'; } }
    if (S.onPrayer) S.onPrayer(name); };
  function checkPrayer(){
    const T = S.prayerHours(), h = S.hour(), day = S.now().toDateString();
    for (const n in T){ const k = day + n; if (h >= T[n] && h < T[n] + .25 && S.lastPrayerKey !== k && !S.prayer){ S.lastPrayerKey = k; S.callPrayer(n); } }
    if (S.prayer && S.t > S.prayer.until){ S.prayer = null; for (const p of S.people){ if (p.praying && !p.ai){ release(p); p.pose = 'stand'; p.st = 'idle'; } p.praying = false; } if (S.onPrayerEnd) S.onPrayerEnd(); }
  }
  S.salahPose = masjid => { if (!S.prayer) return null; let t = (S.t - S.prayer.start)/S.prayer.k; if (t < 0) return 'stand'; if (S.prayer.kh && masjid){ if (t < S.prayer.kh) return 'khutbah'; t -= S.prayer.kh; } for (const [pz, d] of SALAH){ if (t < d) return pz; t -= d; } return 'julus'; };

  /* ---------- one step for everyone ---------- */
  S.tick = dt => {
    S.t += dt; checkPrayer();
    const salH = S.salahPose(false), salM = S.salahPose(true);
    for (const p of S.people){
      if (p.st === 'walk' && p.path){
        let left = p.sp*dt*(p.pose === 'crawl' ? .6 : 1);
        if (p.place === 'street' && S.carNear && p.path.length){ const pl = S.PL.street, ns = pl.noStand;
          if (!ns.has(WE.cellId(pl, p.x, p.y))){ const n = p.path[0], dx = n[0] - p.x, dy = n[1] - p.y, l = Math.hypot(dx, dy) || 1;
            for (const k of [10, 22, 34, 46]){ if (k > l + 4) break; const ax = p.x + dx/l*k, ay = p.y + dy/l*k; if (ns.has(WE.cellId(pl, ax, ay)) && S.carNear(ax, ay)){ left = 0; p.stuck = S.t; p.frame = 0; break; } } } }
        while (left > 0 && p.path.length){ const n = p.path[0], dx = n[0] - p.x, dy = n[1] - p.y, l = Math.hypot(dx, dy);
          if (l <= left){ p.x = n[0]; p.y = n[1]; left -= l; p.walked += l; p.path.shift(); }
          else { p.x += dx/l*left; p.y += dy/l*left; p.walked += left; p.face = Math.atan2(dy, dx)*180/Math.PI; left = 0; } }
        p.frame = Math.floor(p.walked/(p.pose === 'crawl' ? 3.4 : 4.7)) % (p.pose === 'crawl' ? 4 : 6);
        if (!p.path.length){ p.path = null; p.st = 'act'; p.pose = 'stand'; p.frame = 0; p.until = S.t + .2; const f = p.then; p.then = null; if (f) f(); }
        else if (S.t - p.stuck > 90){ p.path = null; p.st = 'idle'; p.until = 0; }
      } else {
        const sal = p.place === 'masjid' ? salM : salH;
        if (p.praying && sal && p.st === 'act'){ const lead = p.act && p.slot === p.act.slots[0];
          if (sal === 'khutbah'){ p.pose = 'sitfloor'; p.face = 180;
            if (lead){ const u = (S.t - S.prayer.start)/S.prayer.k/S.prayer.kh; S.minbar = S.minbar || S.PL.masjid.props.find(o => o.type === 'minbar'); p.x = 16; p.y = 196; p.z = 27; p.on = S.minbar; p.face = 0; p.pose = u > .45 && u < .57 ? 'sit' : 'talk'; } }
          else { if (p.slot){ p.face = p.slot.face; if (lead && p.on && p.place === 'masjid'){ p.x = p.slot.x; p.y = p.slot.y; p.z = 0; p.on = null; } } p.pose = sal === 'stand' ? 'stand' : (p.id === 'toddler' && (sal === 'ruku' || sal === 'itidal') ? 'qiyam' : sal); } }
        const ms = ANIM[p.pose]; p.frame = ms ? Math.floor((S.t*1000 + p.seed*100)/ms) % (FAMILY.FRAMES[p.pose] || 1) : 0;
        if (p.ai && S.t >= p.until){ if (p.talkWith){ const q = S.byId[p.talkWith]; if (q && q.talkWith === p.id) q.talkWith = null; p.talkWith = null; }
          if (p.act && p.act.use.makes && p.place !== 'away' && Math.random() < .3) S.drop(p.place, p.act.use.makes, p.x, p.y, p);
          think(p); }
      }
      if (p.ai) for (const k in p.need) p.need[k] = Math.max(0, p.need[k] - dt*(k === 'social' ? .35 : k === 'fun' && p.kid ? .5 : .25));
    }
    // people walking past each other step aside a little (drawn offset only; standing places are never shared)
    for (const p of S.people){ let fx = 0, fy = 0;
      if (p.st === 'walk') for (const q of S.people){ if (q === p || q.place !== p.place) continue; const dx = p.x - q.x, dy = p.y - q.y, l = Math.hypot(dx, dy);
        if (l < 13){ const a = p.face*Math.PI/180, k = (13 - l)/13*8, side = (dx*-Math.sin(a) + dy*Math.cos(a)) >= 0 ? 1 : -1; fx += -Math.sin(a)*k*side; fy += Math.cos(a)*k*side; } }
      p.ox += (fx - p.ox)*Math.min(1, dt*6); p.oy += (fy - p.oy)*Math.min(1, dt*6); }
    // someone wishes for something now and then
    S.wantT -= dt;
    if (S.wantT <= 0){ S.wantT = rnd(50, 110); const me = S.byId.me;
      for (const p of S.people) if (p.want && S.t > p.want.until) p.want = null;
      if (S.people.filter(p => p.want).length < 2){ const c = S.people.filter(p => p.ai && p.place !== 'away' && p.wants && !p.want && !(p.act && BUSY[p.act.use.tag]) && (!me || p.place === me.place || Math.random() < .4));
        if (c.length){ const p = pick(c); p.want = { item: pick(p.wants), until: S.t + 400 }; if (S.onWant) S.onWant(p); } } }
  };
  S.drop = (place, kind, x, y, by) => { const L = S.loose[place]; if (!L || L.filter(i => i.mess).length >= 5) return null; const pl = S.PL[place], c = WE.freeNear(pl, x + rnd(-24, 24), y + rnd(-24, 24), taken(pl, null), 1);
    if (!c) return null; const it = { kind, x: c[0], y: c[1], mess: !!by, id: 'l' + Math.random().toString(36).slice(2, 8) }; L.push(it); return it; };

  /* ---------- a test that runs many days fast and looks for people sharing a spot ---------- */
  S.selfTest = (days, PL, cal) => {
    const save = { people: S.people, byId: S.byId, loose: S.loose, t: S.t, clock: S.clock, prayer: S.prayer, lk: S.lastPrayerKey, PL: S.PL, onPrayer: S.onPrayer, onWant: S.onWant, override: S.override, wet: S.wet, cal: S.cal, carNear: S.carNear };
    S.onPrayer = S.onWant = S.override = S.wet = S.carNear = null; S.cal = cal || null;
    S.reset(PL || WP.build(), { start: new Date(2026, 10, 9, 4, 30).getTime(), speed: 72, newFamily: true });
    let overlaps = 0, crowd = 0, ticks = 0, stuck = 0, road = 0; const seen = {}, placesUsed = {}, acts = {};
    const end = days*1200;
    while (S.t < end){ S.tick(.25); ticks++;
      if (ticks % 4) continue;
      const still = S.people.filter(p => p.place !== 'away' && p.st !== 'walk');
      for (let i = 0; i < still.length; i++){ const a = still[i]; placesUsed[a.place] = (placesUsed[a.place] || 0) + 1; if (a.act) acts[a.act.type] = (acts[a.act.type] || 0) + 1;
        for (let j = i + 1; j < still.length; j++){ const b = still[j]; if (a.place === b.place && Math.hypot(a.x - b.x, a.y - b.y) < 7){ const k = a.id + b.id + Math.floor(S.t/20); if (!seen[k]){ seen[k] = 1; overlaps++; } } } }
      const solo = {}; for (const a of still) if (a.act && a.act.slots.length === 1 && !a.act.use.tag){ const k = a.place + a.act.type; solo[k] = (solo[k] || 0) + 1; if (solo[k] > 2) crowd++; }
      for (const p of S.people) if (p.st === 'walk' && S.t - p.stuck > 80) stuck++;
      for (const a of still) if (a.place === 'street' && S.PL.street.noStand.has(WE.cellId(S.PL.street, a.x, a.y)) && a.st === 'act' && S.t - (a._rd || (a._rd = S.t)) > 6) road++; else a._rd = 0;
    }
    const out = { days, ticks, overlaps, crowd, stuck, road, placesUsed, acts };
    Object.assign(S, { people: save.people, byId: save.byId, loose: save.loose, t: save.t, clock: save.clock, prayer: save.prayer, lastPrayerKey: save.lk, PL: save.PL, onPrayer: save.onPrayer, onWant: save.onWant, override: save.override, wet: save.wet, cal: save.cal, carNear: save.carNear });
    return out;
  };
  S.SALAH = SALAH; S.ANIM = ANIM;
})();
