/* Helping Home world: the game on top of the engine and the people (your character, taps, carrying, the picture ring,
   friendship flowers, the Akhlaq album, decorating, the garden, prayer times and the calendar). No words to read and no
   device voice: pictures, the thing itself glowing, and sounds. Worship is never scored. */
(function () {
  'use strict';
  const S = WS, X = WX, C = WP.C, B = FAMILY.PEOPLE, KEY = 'hh.world.v2', D2R = Math.PI/180;
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const rd = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const G = Object.assign({ av: null, friends: {}, fday: { d: '', by: {} }, album: { salam: 0, give: 0, help: 0, clean: 0, care: 0, learn: 0 }, need: { hunger: 70, rest: 80, fun: 60, clean: 70 }, petDay: {}, decor: [], unlocked: ['plant', 'lamp', 'rugD'], garden: {}, jar: 0, given: 0, days: [], gift: '', fast: false }, rd());
  const setH = (e, h) => { if (e._h !== h){ e._h = h; e.innerHTML = h; } }, setT = (e, v) => { if (e._t !== v){ e._t = v; e.textContent = v; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} };
  const sfx = n => { try { Kit.sfx.play(n); } catch (e) {} };
  const praise = () => { try { Kit.say.praise(['mashaallah', 'barakallah', 'ahsant'][Math.floor(Math.random()*3)]); } catch (e) {} };
  const bridge = id => { try { window.KahfBridge && KahfBridge.item && KahfBridge.item(id); } catch (e) {} };
  const dkey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const q = new URLSearchParams(location.search);

  /* ---------- pictures for buttons (ink style, no words) ---------- */
  const I = (p, f) => `<svg viewBox="0 0 24 24" fill="${f || 'none'}" stroke="#231e16" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const IC = {
    wave: I('<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13m-9 0-1.6-1.8a1.5 1.5 0 0 0-2.3 2L8 19a5 5 0 0 0 4 2h1a5 5 0 0 0 5-5v-5.5" fill="#f2c9a0"/><path d="M19.5 3.5c1 .8 1.6 1.8 1.8 3M3 5.5C3.300 4.300 4 3.300 5 2.700" />'),
    heart: I('<path d="M12 20.500S3.500 15 3.500 9.200A4.600 4.600 0 0 1 12 6.600a4.600 4.600 0 0 1 8.500 2.600C20.500 15 12 20.500 12 20.500z" fill="#e8574a"/>'),
    play: I('<circle cx="12" cy="12" r="8.500" fill="#e8574a"/><path d="M5 8.500c4 1.500 10 1.500 14 0M5 15.500c4-1.500 10-1.500 14 0" stroke="#fff4d6"/>'),
    help: I('<path d="M12 3l1.900 5.200L19 10l-5.100 1.800L12 17l-1.900-5.200L5 10l5.100-1.800z" fill="#f2c230"/><path d="M18.500 15.500l.8 2.200 2.200.8-2.200.8-.8 2.200-.8-2.200-2.200-.8 2.200-.8z" fill="#f2c230"/>'),
    book: I('<path d="M12 6c-2-1.600-5.500-1.600-8 0v13c2.500-1.600 6-1.600 8 0 2-1.600 5.500-1.600 8 0V6c-2.500-1.600-6-1.600-8 0z" fill="#fbf6ea"/><path d="M12 6v13"/><path d="M12 11.500S9 9.700 9 8a1.600 1.600 0 0 1 3-.8 1.600 1.600 0 0 1 3 .8c0 1.700-3 3.500-3 3.500z" fill="#e8574a" stroke-width="1.200"/>'),
    brush: I('<path d="M14 4l6 6-8 8H6v-6z" fill="#5b8fd6"/><path d="M6 18l-3 3M11 7l6 6"/>'),
    ok: I('<circle cx="12" cy="12" r="9.500" fill="#5cae6a"/><path d="M7.500 12.500l3 3 6-6.500" stroke="#fff" stroke-width="2.400"/>'),
    x: I('<path d="M6 6l12 12M18 6L6 18" stroke-width="2.400"/>'),
    fast: I('<path d="M4 6l7 6-7 6zM13 6l7 6-7 6z" fill="#f2c230"/>'),
    sun: I('<circle cx="12" cy="12" r="4.500" fill="#f4b829"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/>'),
    moon: I('<path d="M19 14.500A8 8 0 1 1 9.500 5a6.500 6.500 0 0 0 9.500 9.500z" fill="#f2e2a0"/>'),
    mosque: I('<path d="M5 21v-8h14v8z" fill="#f4ead6"/><path d="M7 13a5 5 0 0 1 10 0z" fill="#3f9c92"/><path d="M12 8V5.500M19 21V7l1.500-2.500L22 7v14" fill="#f4ead6"/><path d="M10.500 21v-3.500a1.500 1.500 0 0 1 3 0V21"/>'),
    mat: I('<path d="M5 3.500h14v17H5z" fill="#5cae6a"/><path d="M9 3.500v17M15 3.500v17" stroke="#fff4d6" stroke-width="1"/><path d="M12 7.500a3 3 0 0 0-3 3v3h6v-3a3 3 0 0 0-3-3z" fill="#fff4d6"/>'),
    lock: I('<rect x="5.500" y="10.500" width="13" height="10" rx="2" fill="#f2c230"/><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500"/>'),
    walk: I('<circle cx="13" cy="4.500" r="2.200" fill="#f2c9a0"/><path d="M13 7.500l-2 6 3 3v4.500M11 13.500l-3 7M10.500 9l-3 2v3M14 9.500l3 2.500"/>'),
    star: I('<path d="M12 2.800l2.700 5.900 6.400.7-4.800 4.400 1.300 6.400L12 17l-5.600 3.200 1.300-6.400L2.900 9.400l6.400-.7z" fill="#f4b829"/>'),
    drop: I('<path d="M12 3.500c3.500 4.500 6 7.500 6 11a6 6 0 0 1-12 0c0-3.500 2.500-6.500 6-11z" fill="#94cbe2"/>'),
    clean: I('<path d="M12 3v9M7 12h10l1.500 9h-13z" fill="#e2b14a"/><path d="M9 16v5M12 16v5M15 16v5"/>'),
    paw: I('<circle cx="7" cy="10" r="2" fill="#e39a4a"/><circle cx="12" cy="7.500" r="2" fill="#e39a4a"/><circle cx="17" cy="10" r="2" fill="#e39a4a"/><path d="M8 17a4 4 0 0 1 8 0c0 2-2 2.500-4 2.500S8 19 8 17z" fill="#e39a4a"/>'),
    gift: I('<path d="M4 10h16v10H4z" fill="#e8574a"/><path d="M3 7h18v3H3z" fill="#e8574a"/><path d="M12 7v13" stroke="#f2c230" stroke-width="2.600"/><path d="M12 7c-1.500-3-5-3-5-1s3.500 1 5 1zm0 0c1.500-3 5-3 5-1s-3.500 1-5 1z" fill="#f2c230"/>'),
    map: I('<path d="M3.500 6.500l5.500-2 6 2 5.500-2v13l-5.500 2-6-2-5.500 2z" fill="#cfe9d2"/><path d="M9 4.500v13M15 6.500v13"/><circle cx="12" cy="11" r="1.800" fill="#e8574a"/>'),
    talk: I('<path d="M4 5.500h16v10H11l-4.500 4v-4H4z" fill="#fffdf6"/><circle cx="8.500" cy="10.500" r="1" fill="#231e16"/><circle cx="12" cy="10.500" r="1" fill="#231e16"/><circle cx="15.500" cy="10.500" r="1" fill="#231e16"/>'),
    food: I('<path d="M3.500 11h17a8.500 7 0 0 1-17 0z" fill="#ef8a3c"/><path d="M8 20h8M9 7c0-1.500 1.500-1.500 1.500-3M13.500 7c0-1.500 1.500-1.500 1.500-3"/>'),
    pencil: I('<path d="M4 20l1.500-5L16 4.500l3.500 3.500L9 18.500z" fill="#f2c230"/><path d="M14 6.500l3.500 3.500M4 20l5-1.500-3.500-3.500z" fill="#f2c9a0"/>'),
    tree: I('<path d="M12 21v-7" stroke-width="2.600"/><circle cx="12" cy="9" r="6.500" fill="#86b96a"/>'),
    bus: I('<rect x="3" y="5" width="18" height="12.500" rx="2.500" fill="#f2c230"/><path d="M3 11.500h18M8 5v6.500M13 5v6.500" /><circle cx="7.500" cy="18.500" r="1.800" fill="#3d3935"/><circle cx="16.500" cy="18.500" r="1.800" fill="#3d3935"/>'),
    jar: I('<path d="M7 8h10l1 3v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8z" fill="#cfe2ea"/><path d="M8 5h8v3H8z" fill="#5cae6a"/><circle cx="10.500" cy="16" r="1.800" fill="#e2b14a"/><circle cx="14" cy="17" r="1.800" fill="#e2b14a"/>'),
  };
  const flowerSvg = n => { const st = Math.min(4, n >= 12 ? 4 : n >= 7 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);
    let s = '<path d="M5 21h14" /><path d="M8 21a4 2.500 0 0 1 8 0z" fill="#a8744b"/>';
    if (st >= 1) s += `<path d="M12 19V${[0, 16, 12, 9, 7][st]}" stroke="#5cae6a" stroke-width="2"/><path d="M12 17c-2 0-3.500-1-4-2.500 2 0 3.500 1 4 2.500zM12 15.500c2 0 3.500-1 4-2.500-2 0-3.500 1-4 2.500z" fill="#86b96a" stroke-width="1"/>`;
    if (st === 2) s += '<circle cx="12" cy="11" r="2.200" fill="#ee8fa8"/>';
    if (st >= 3) s += `<g fill="${st === 4 ? '#e8574a' : '#ee8fa8'}" stroke-width="1"><circle cx="12" cy="4.500" r="2.300"/><circle cx="15" cy="7" r="2.300"/><circle cx="12" cy="9.500" r="2.300"/><circle cx="9" cy="7" r="2.300"/></g><circle cx="12" cy="7" r="1.800" fill="#f4b829" stroke-width="1"/>`;
    if (st === 4) s += '<path d="M4 6l.6 1.600 1.600.6-1.600.6L4 10.400l-.6-1.600L1.800 8.200l1.600-.6zM20 11l.5 1.300 1.300.5-1.300.5-.5 1.300-.5-1.300-1.300-.5 1.300-.5z" fill="#f4b829" stroke-width=".8"/>';
    return I(s); };

  /* ---------- the Hijri calendar ---------- */
  const hijri = d => { try { const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).formatToParts(d), o = {}; for (const x of p) o[x.type] = +x.value; return { m: o.month, d: o.day }; } catch (e) { return { m: 0, d: 0 }; } };
  const calOf = d => { const h = hijri(d); const f = q.get('cal'); return { ramadan: h.m === 9 || f === 'ramadan', eid: (h.m === 10 && h.d <= 3) || (h.m === 12 && h.d >= 10 && h.d <= 12) || f === 'eid', friday: d.getDay() === 5 || f === 'friday' }; };

  /* ---------- start ---------- */
  let PL, me, modal = null, carry = null, ver = 1, guide = null, tapMark = null, meTimer = null, decorating = null, veil, hud = {}, lastPlace = '', CAL = calOf(new Date());
  const imgs = {}, pic = (key, url) => { let m = imgs[key]; if (!m){ m = imgs[key] = new Image(); m.src = url(); } return m.complete && m.naturalWidth ? m : null; };
  const icUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '));
  const sayPic = k => k.startsWith('item:') ? pic(k, () => itemUrl(k.slice(5), 64)) : pic('ic' + k, () => icUrl(IC[k]));
  const laters = [], later = (secs, fn) => laters.push({ t: S.t + secs, fn });
  const say = (p, k, delay, secs) => { const f = () => { p.say = { k, until: S.t + (secs || 2.2) }; }; if (delay) later(delay, f); else f(); };
  // a thing passed from one person to another, so you can see what is going on
  const flies = [], toss = (kind, from, to, delay, d) => flies.push({ kind, a: [from.x, from.y], b: [to.x, to.y], t0: S.t + (delay || 0), d: d || .7 });
  let ride = null, prevPlace = '';
  let rainbow = 0, lessonT = 0, readT = 0, visitT = 50;
  const fxs = [];           // floating hearts and sparkles: { x, y, z, t0, kind }
  function applyAv(){
    const a = G.av, base = a.girl ? B.sister : B.friendb;
    B.me = Object.assign({}, base, { col: Object.assign({}, base.col, a.girl ? { top: a.top, scarf: a.head } : { top: a.top, kufi: '#fbf6ea' }), hat: a.girl ? null : (a.kufi ? 'kufi' : null) });
    FAMILY.setSkin(a.skin); try { const h = JSON.parse(localStorage.getItem('hh.hand') || '{}'); const o = h && typeof h === 'object' ? h : {}; o.skin = a.skin; localStorage.setItem('hh.hand', JSON.stringify(o)); } catch (e) {}
    FAMILY.clearCache(); WE.drop('f|'); ver++; for (const p of S.people) p._spr = null;
  }
  function boot(){
    const today = dkey(new Date()); if (!G.days.includes(today)){ G.days.push(today); G.days = G.days.slice(-40); }
    G.unlocked = [...new Set(G.unlocked)];
    PL = WP.build();
    if (CAL.ramadan || CAL.eid) for (const y of [206, 330, 486, 620]) WP.thing(PL.street, 'lantern', 96, y);
    for (const d of G.decor) addDecor(d, true);
    growGarden(today); prayerGarden();
    for (const k in PL) WE.makeGrid(PL[k]);
    S.reset(PL, { newFamily: G.days.length >= 3 }); S.cal = CAL;
    X.init(PL); if (q.get('rain')) X.forceRain = q.get('rain') === '1';
    X.onRain = w => { if (w){ const t = dkey(S.now()); for (const id in G.garden){ const b = G.garden[id]; if (b.stage > 0 && b.stage < 3) b.w = t; } syncBeds(); save(); } else rainbow = S.t + 50; WE.dirty = true; };
    X.onRider = (p, on) => { if (me.place === 'street'){ const bus = X.cars.find(v => v.id === 'bus'); burst(on ? bus : p, 'star', 2); } };
    X.onDrink = (c, bowl) => { bowl.prop.o.full = 0; rekey(bowl.prop); burst(c, 'heart', 3); c.follow = S.t + 60; petCare(c.id); };
    S.friend = id => G.friends[id] || 0;
    S.override = p => CAL.eid && S.hour() >= 8 && S.hour() < 10 && p.id !== 'toddler' ? { place: 'park', tag: null } : null;
    S.onArrive = (p, place) => enter(place);
    S.onPrayerEnd = () => { const b = document.querySelector('.w-pray'); if (b) b.remove(); if (me.place === 'masjid' || me.place === 'home1') burst(me, 'heart', 3); };
    S.onPrayer = onPrayer; S.onWant = p => { if ((p.want.item === 'veg' || p.want.item === 'meal') && !ripeBed()) p.want.item = 'flower'; hudWants(); };
    const back = q.get('back'), start = back === 'salah' || back === 'adhan' ? ['home1', 240, 300] : back === 'wudu' ? ['home0', 230, 50] : back === 'washing-machine' || back === 'washer' ? ['home0', 230, 345] : G.av ? ['home0', 250, 215] : ['home1', 100, 100];
    if (!G.av) G.av = { girl: false, skin: '#c98e62', top: C.red, head: C.pink, kufi: false, fresh: true };
    applyAv();
    me = S.addMe('me', start[0], start[1], start[2]); me.need = G.need; if (back === 'wudu') me.need.clean = 100; const c = S.freeSpot(me, PL[start[0]], start[1], start[2]); me.x = c[0]; me.y = c[1];
    WE.init(document.getElementById('cv')); buildHud(); enter(me.place);
    if (G.fast) S.setSpeed(72);
    { const b = G.bike && PL[G.bike.place] && !PL[G.bike.place].wallH ? G.bike : { place: 'street', x: 92, y: 392 }; S.loose[b.place].push({ kind: 'bike', x: b.x, y: b.y, id: 'bike' }); }
    if (G.gift !== today){ S.loose.street.push({ kind: 'gift', x: 95, y: 356, id: 'gift' }); }
    if (G.av.fresh) openEditor(true);
    else if (back === 'salah'){ setTimeout(() => { praise(); burst(me, 'heart', 5); }, 900); }
    else if (back) setTimeout(() => burst(me, 'star', 4), 900);
    if (q.get('perf')){ const e = el('div'); e.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99;font:12px/1.2 monospace;background:rgba(0,0,0,.6);color:#fff;padding:3px 6px;border-radius:6px;pointer-events:none'; document.body.appendChild(e); perf = { el: e, last: performance.now(), t0: performance.now(), n: 0, worst: 0 }; }
    input(); requestAnimationFrame(loop);
    offline();
    if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) try { navigator.serviceWorker.getRegistration('/KidsGames/').then(r => r || navigator.serviceWorker.register('/KidsGames/sw.js', { scope: '/KidsGames/' })).catch(() => {}); } catch (e) {}
  }
  // the whole game works offline after the first visit (Android app, web, PWA): hand the file list to the service worker
  function offline(){
    if (!('serviceWorker' in navigator) || !window.fetch || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    let saved = null; try { saved = localStorage.getItem('hh.offline'); } catch (e) {}
    fetch('/KidsGames/games/helping-home/offline.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !Array.isArray(d.files)) return; const key = d.version + ':' + (d.bytes || 0); if (saved === key) return;
      const c = navigator.serviceWorker.controller;
      (c ? Promise.resolve(c) : navigator.serviceWorker.ready.then(r => r.active)).then(w => { if (!w) return; w.postMessage({ type: 'CACHE_URLS', urls: d.files }); try { localStorage.setItem('hh.offline', key); } catch (e) {} });
    }).catch(() => {});
  }
  function enter(place){
    const prev = lastPlace;
    if (me.bike && PL[place].wallH && PL[prev]){ const dr = PL[prev].objs.find(o => o.to && o.to[0] === place), s0 = dr ? dr.slots[0] : { x: 100, y: 100 }, c = WE.freeNear(PL[prev], s0.x + 14, s0.y + 8, PL[prev].noStand || null, 1) || [s0.x, s0.y]; offBike(prev, c[0], c[1]); }
    lastPlace = place; WE.calm = false; WE.setPlace(PL[place]); WE.follow(me.x, me.y, true); veil.classList.add('on'); tint(); hud.brush.hidden = !['home0', 'home1', 'yard'].includes(place);
    if (decorating) endDecor(); closeRing();
    // a friend who is here says hello
    for (const p of S.people) if (p.ai && p.place === place) p.cool = S.t + 2 + Math.random()*4;
  }
  function tint(){ const h = S.hour(), pl = PL[me.place], T = S.prayerHours(), night = h < T.fajr || h > T.isha + .3, dusk = !night && (h < T.fajr + 1.2 || h > T.maghrib - .7), inside = !!pl.wallH;
    const t = night ? (inside ? '#d2cfe6' : '#8f98c8') : dusk ? (inside ? '#fdf3e6' : '#fde3c6') : null;
    if (pl.tint !== t){ pl.tint = t; WE.dirty = true; } pl.sky = inside ? '#efe9dc' : night ? '#3d466e' : dusk ? '#f6dcc0' : '#cfe6f2';
    setH(hud.sun, night ? IC.moon : IC.sun); }

  /* ---------- the loop ---------- */
  let lastT = 0, lastSig = '', slowT = 0, lastDraw = 0, veilT = 0;
  // ?perf=1 : a small readout to check a real phone (frames per second, the longest frame of the last second, pictures being made, memory)
  let perf = null;
  function perfTick(t){ const d = t - perf.last; perf.last = t; perf.n++; if (d > perf.worst) perf.worst = d;
    if (t - perf.t0 >= 1000){ const st = WE.stats(); perf.el.textContent = Math.round(perf.n*1000/(t - perf.t0)) + ' fps  worst ' + Math.round(perf.worst) + ' ms  q ' + st.queue + '  ' + st.mb + ' MB  x' + (window.devicePixelRatio || 1).toFixed(2) + ' ' + (WE.noise || ''); perf.t0 = t; perf.n = 0; perf.worst = 0; } }
  function loop(t){
    requestAnimationFrame(loop);
    const dt = Math.min(.1, (t - lastT)/1000 || 0); lastT = t; if (document.hidden) return;
    if (modal !== 'editor' && modal !== 'book' && modal !== 'map'){ S.tick(dt); X.tick(dt); }
    for (let i = laters.length - 1; i >= 0; i--) if (S.t >= laters[i].t){ const f = laters[i].fn; laters.splice(i, 1); f(); }
    if (meTimer && S.t >= meTimer.t){ const f = meTimer.fn; meTimer = null; me.pose = 'stand'; if (f) f(); }
    slowT -= dt; if (slowT <= 0){ slowT = .5; slow(); }
    const acts = [], here = me.place; let sig = '';
    if (ride){ me.x = ride.x; me.y = ride.y; me.ox = me.oy = 0; }
    // only what is on (or near) the screen is drawn, so a quiet corner of the town costs nothing
    const [vw0, vh0] = WE.size(), seen = (x, y) => { const q = WE.toScreen(x, y, 0); return q[0] > -170 && q[0] < vw0 + 170 && q[1] > -120 && q[1] < vh0 + 230; };
    for (const p of S.people){ if (p.place !== here || (p === me && ride) || (p !== me && !seen(p.x, p.y))) continue;
      const biking = p === me && me.bike, pose = biking ? 'sit' : p.pose, opts = pose === 'sleep' ? { inBed: true } : undefined;
      const fr = biking ? 0 : p.frame, fv = p === me ? ver : p.ver; let s = p._fs;
      if (s && s.img && p._fp === pose && p._ff === fr && p._fa === p.face && p._fv === fv) WE.keep(s);
      else { s = WE.fig(p.body, pose, fr, p.face, fv, opts); if (s){ p._fs = s; p._fp = pose; p._ff = fr; p._fa = p.face; p._fv = fv; } else { p._fs = null; s = p._spr; } }
      p._spr = s;
      const a = { x: p.x + p.ox, y: p.y + p.oy, z: p.z + (biking ? 15 : 0), sprite: s, on: p.on, me: p === me, p };
      if (biking){ const ax = Math.abs(Math.cos(me.face*D2R)) > .7, bs = WE.bake('bk|' + ax, () => ({ svg: inkScale(WP.bike(ax)), box: WE.box2([[-32, -32, 0], [32, 32, 42]], 6) })); acts.push({ x: a.x - .3, y: a.y - .3, z: 0, sprite: bs, veh: 1 }); sig += 'b' + ax; }
      if (pose === 'sleep'){ const o = sleepOff(p), f = p.face*D2R, fx = -Math.cos(f), fy = -Math.sin(f), L = p.id === 'toddler' ? 20 : p.kid ? 34 : 44, ax = Math.abs(fx) > .7;
        a.x = p.x - o[0]; a.y = p.y - o[1];
        const col = mix((p.act && p.act.prop && p.act.prop.o.col) || C.blue, '#ffffff', .16), sg = ax ? Math.sign(fx) : Math.sign(fy), bs = WE.bake('bl|' + col + L + ax + sg, () => {
          // a low shape under the blanket: shoulders and body
          const seg = (u0, u1, hw, h) => { const lo = Math.min(u0*sg, u1*sg), hi = Math.max(u0*sg, u1*sg), b = ax ? [lo, -hw, 0, hi, hw] : [-hw, lo, 0, hw, hi]; return [(b[0] + b[3])/2 + (b[1] + b[4])/2, H3.bx(b[0], b[1], 0, b[3], b[4], h, matOf(col), .7)]; };
          const parts = [seg(7, 7 + L, 7, 3), seg(8, 8 + L*.36, 8.500, 4.600)].sort((a, b) => a[0] - b[0]);
          const e = 9 + L; return { svg: WE.world(parts.map(q => q[1]).join('')), box: WE.box2w([[-e, -e, 0], [e, e, 7]], 8) }; });
        acts.push({ x: p.x, y: p.y, z: p.z - 1, sprite: bs, on: p.on, veh: 1 }); sig += 'z'; }
      if (p === me && carry){ a.carry = itemSprite(carry); a.cz = 30; if (!a.carry) a.carry = null; }
      acts.push(a); sig += (s ? s.key : '-') + ((a.x*2 | 0)) + ',' + ((a.y*2 | 0)) + ';'; }
    for (const it of S.loose[here]){ const s = itemSprite(it.kind); acts.push({ x: it.x, y: it.y, z: 0, sprite: s, item: it }); sig += it.id + (s ? 1 : 0); }
    for (const a of X.actors(here)){ if (!seen(a.x, a.y)) continue; acts.push(a); sig += (a.sprite ? a.sprite.key : '-') + (a.x*2 | 0) + ',' + (a.y*2 | 0) + ',' + (a.z | 0) + ';'; }
    if (lessonT > 0 && here === 'school') WE.follow((me.x + 20)/2, (me.y + 150)/2); else WE.follow(me.x, me.y);   // in a lesson, look toward the board
    // a place opens when its pictures are made (or after 8 s whatever happens, so a phone short of memory still gets in)
    const von = veil.classList.contains('on'), ready = von && WE.ready(); if (von && !veilT) veilT = t;
    if (von && (ready || t - veilT > 8000)){ veil.classList.remove('on'); veilT = 0; }
    WE.calm = !(von && !ready && t - veilT <= 8000); WE.tick();
    if (perf) perfTick(t);
    const out = !PL[here].wallH, live = fxs.length || flies.length || tapMark || guide || decorating || (out && (X.wet || rainbow > S.t)) || lessonT > 0 || S.people.some(p => (p.want || (p.say && p.say.until > S.t)) && p.place === here) || X.pets.some(c => c.say && c.say.until > S.t && c.place === here);
    if ((sig !== lastSig || WE.dirty || live) && t - lastDraw > 15){ lastDraw = t; lastSig = sig; WE.dirty = false; WE.frame(acts, overlays); }
  }
  function slow(){
    const d = S.now(); setT(hud.time, d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2)); tint();
    const cal = calOf(d); if (cal.eid !== CAL.eid || cal.friday !== CAL.friday || cal.ramadan !== CAL.ramadan) S.cal = CAL = cal;
    // people you know wave when you come near
    for (const p of S.people){ if (!p.ai || p.place !== me.place) continue;
      if (p.waveEnd && S.t > p.waveEnd){ p.waveEnd = 0; if (p.pose === 'wave') p.pose = 'stand'; }
      if (p.st === 'act' && p.pose === 'stand' && !p.praying && S.t > (p.cool || 0) && Math.hypot(p.x - me.x, p.y - me.y) < 80 && (G.friends[p.id] || 0) >= 1){
        p.pose = 'wave'; p.face = Math.atan2(me.y - p.y, me.x - p.x)/D2R; p.cool = S.t + 60; p.waveEnd = S.t + 1.6; p.until = Math.max(p.until, S.t + 2); } }
    slowMe(); busCheck();
    if (dkey(d) !== slow.day){ slow.day = dkey(d); growGarden(slow.day); }
    hudWants();
  }
  const NEEDS = [['hunger', 'food', ['home0', 'table-home'], .11], ['rest', 'moon', ['home1', 'bed-me'], .07], ['fun', 'play', ['street', 'swing'], .13], ['clean', 'drop', ['home0', 'tub'], .09]];
  function slowMe(){
    const n = me.need, tag = me.st === 'act' && me.act ? me.act.use.tag : null, of = me.st === 'act' && me.act && me.act.use.offers;
    for (const [k, , , rate] of NEEDS) n[k] = Math.max(0, Math.min(100, n[k] - rate*.5));
    if (tag === 'sleep') n.rest = Math.min(100, n.rest + 5); if (tag === 'eat') n.hunger = Math.min(100, n.hunger + 4); if (of && of.fun) n.fun = Math.min(100, n.fun + of.fun/30); if (of && of.rest) n.rest = Math.min(100, n.rest + of.rest/40);
    hud.nd.forEach((b, i) => { const v = n[NEEDS[i][0]]; const r = Math.round(v); if (b._v !== r){ b._v = r; b.style.setProperty('--v', r); b.classList.toggle('low', v < 25); } });
    // a lesson at school, a book on the sofa
    const atDesk = me.st === 'act' && me.act && me.act.type === 'sdesk';
    if (atDesk){ lessonT += .5; if (Math.abs(lessonT - 12) < .26){ album('learn'); burst(me, 'star', 4); praise(); } } else lessonT = 0;
    if (me.st === 'act' && me.pose === 'read'){ readT += .5; if (Math.abs(readT - 8) < .26){ album('learn'); burst(me, 'star', 3); } } else readT = 0;
    // someone you are friends with comes over to say salam, and sometimes brings a little gift
    visitT -= .5;
    if (visitT <= 0 && !modal && me.st !== 'walk' && !me.praying){ visitT = 70 + Math.random()*60;
      const c = S.people.filter(p => p.ai && p.place === me.place && p.st === 'act' && !p.praying && !p.talkWith && p.pose !== 'sleep' && !(p.act && p.act.use.tag) && (G.friends[p.id] || 0) >= 2 && Math.hypot(p.x - me.x, p.y - me.y) < 260);
      if (c.length){ const p = c[Math.floor(Math.random()*c.length)], to = S.freeSpot(p, PL[me.place], me.x, me.y, 2); S.release(p);
        S.go(p, to, () => { p.st = 'act'; p.until = S.t + 5; p.face = Math.atan2(me.y - p.y, me.x - p.x)/D2R; p.pose = 'wave'; p.waveEnd = S.t + 1.6; p.cool = S.t + 60; say(p, 'wave'); sfx('tap');
          if ((G.friends[p.id] || 0) >= 4 && !carry && Math.random() < .6){ const it = ['dates', 'fruit', 'flower', 'bread'][Math.floor(Math.random()*4)]; later(1.6, () => { if (carry || p.place !== me.place) return; say(p, 'item:' + it); setCarry(it); burst(me, 'heart', 3); }); } }); } }
    save.t = (save.t || 0) + 1; if (save.t % 20 === 0) save();
  }
  /* ---------- the bus and the bike ---------- */
  function waitBus(ob){ const k = +ob.id.slice(3), free = ob.slots.filter(s => !s.by || s.by === 'me');
    const set = () => { me.busStop = k; say(me, 'bus', 0, 3); };
    if (ob.type === 'busStop' && free.length){ meTimer = null; S.useSlot(me, ob, free[0], null, 1e7); me.then = (f => () => { f(); set(); })(me.then); } else walkThen(ob, set); }
  function busCheck(){
    const bus = X.cars.find(v => v.id === 'bus');
    if (ride){ hud.off.hidden = ride.at == null; setH(hud.off, IC.walk); return; }
    { const lying = me.st === 'act' && !!me.slot && !me.praying; hud.off.hidden = !lying; if (lying) setH(hud.off, me.pose === 'sleep' ? IC.sun : IC.walk);
      if (lying && me.pose === 'sleep' && me.need.rest >= 100 && (me.napT = (me.napT || 0) + .5) > 6){ me.napT = 0; getUp(); burst(me, 'star', 3); } else if (!lying || me.pose !== 'sleep') me.napT = 0; }
    if (me.busStop == null || me.place !== 'street' || me.bike) return;
    if (bus.at === me.busStop && me.st !== 'walk' && Math.hypot(bus.x - me.x, bus.y - me.y) < 80){ S.release(me); meTimer = null; me.path = null; me.st = 'idle'; me.pose = 'stand'; me.busStop = null; ride = X.rider = bus; bus.wait = Math.max(bus.wait, 2.5); closeRing(); sfx('whoosh'); burst(bus, 'star', 3); } }
  function getOff(){ if (!ride || ride.at == null) return; const pl = PL.street, ob = pl.objs.find(o => o.id === 'bus' + ride.at), s0 = ob.slots[0], c = WE.freeNear(pl, s0.x, s0.y, pl.noStand, 0) || [s0.x, s0.y];
    me.x = c[0]; me.y = c[1]; me.face = 45; ride = X.rider = null; hud.off.hidden = true; sfx('whoosh'); me.need.fun = Math.min(100, me.need.fun + 15); }
  function onBike(){ me.bike = true; me.sp = 118; hud.bike.hidden = false; sfx('whoosh'); burst(me, 'star', 2); }
  function offBike(place, x, y){ if (!me.bike) return; me.bike = false; me.sp = 60; hud.bike.hidden = true; const pl = PL[place || me.place], c = x != null ? [x, y] : (WE.freeNear(pl, me.x + 12, me.y + 6, occupied(pl), 1) || [me.x, me.y]);
    S.loose[pl.id].push({ kind: 'bike', x: c[0], y: c[1], id: 'bike' }); G.bike = { place: pl.id, x: c[0], y: c[1] }; save(); sfx('tap'); }
  const petCare = id => { const t = dkey(new Date()); if (G.petDay.d !== t) G.petDay = { d: t }; if (G.petDay[id]) return; G.petDay[id] = 1; album('care'); };
  // where the head of a sleeper is drawn, measured from the drawing itself, so it can be put on the pillow
  const sleepOffs = {}, sleepOff = p => { const d = ((Math.round(p.face/45)*45) % 360 + 360) % 360, k = p.body + d; if (!sleepOffs[k]){ let o = [0, 0]; try { const h = FAMILY.draw(p.body, 'sleep', [0, 0, 0], d, 0, { inBed: true })[0].at; o = [h[0]/WE.WK, h[1]/WE.WK]; } catch (e) {} sleepOffs[k] = o; } return sleepOffs[k]; };
  // get up from a bed or a seat
  function getUp(){ if (!me.slot && me.st !== 'act') return; const pl = PL[me.place], c = WE.freeNear(pl, me.x, me.y, occupied(pl), 1); meTimer = null; if (c) meGo(c); else S.release(me); hud.off.hidden = true; sfx('whoosh'); }
  const itemSprite = kind => WE.bake('i|' + kind, () => { const r = WP.ITEM[kind](); return { svg: inkScale(r.svg), box: WE.box2(r.box, 6) }; });
  const itemUrl = (kind, px) => { const r = WP.ITEM[kind](); return WE.svgUrl(inkScale(r.svg), WE.box2(r.box, 4), px || 64); };
  const thingUrl = (type, px, o) => { const t = WP.T[type]; return WE.svgUrl(inkScale(t.draw(WP.ctxAt(0, 0, false), o || {})), WE.box2([[0, 0, 0], [t.w, t.d, t.h]], 6), px || 72); };

  /* ---------- what is drawn over the world ---------- */
  const headY = p => { const s = p._spr, q = WE.toScreen(p.x, p.y, p.z); return [q[0], q[1] + (s ? s.y*WE.scale() : -90)]; };
  function bubble(ctx, x, y, draw){ ctx.save(); ctx.translate(x, y - 30);
    ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#231e16'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-21, -21, 42, 40, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, 18); ctx.lineTo(0, 27); ctx.lineTo(6, 18); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.stroke(); ctx.fillRect(-5, 16, 11, 3);
    draw(ctx); ctx.restore(); }
  function heartPath(ctx, s){ ctx.beginPath(); ctx.moveTo(0, 6*s); ctx.bezierCurveTo(-11*s, -2*s, -6*s, -10*s, 0, -4*s); ctx.bezierCurveTo(6*s, -10*s, 11*s, -2*s, 0, 6*s); ctx.closePath(); }
  function starPath(ctx, s){ ctx.beginPath(); for (let i = 0; i < 10; i++){ const a = i*Math.PI/5 - Math.PI/2, r = i % 2 ? 3.4*s : 8*s; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); }
  function arrow(ctx, x, y){ const b = Math.sin(performance.now()/180)*5; ctx.save(); ctx.translate(x, y - 16 + b); ctx.beginPath(); ctx.moveTo(-11, -16); ctx.lineTo(11, -16); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = '#f4b829'; ctx.strokeStyle = '#231e16'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.fill(); ctx.stroke(); ctx.restore(); }
  function overlays(ctx){
    const now = S.t;
    if (tapMark){ const u = (now - tapMark.t)/.5; if (u > 1) tapMark = null; else { const s = WE.toScreen(tapMark.x, tapMark.y, 0); ctx.strokeStyle = 'rgba(35,30,22,' + (1 - u) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s[0], s[1], 8 + u*14, 4 + u*7, 0, 0, 7); ctx.stroke(); } }
    if (me.place === 'street') for (const ob of PL.street.objs){ if (!ob.to || !BADGE[ob.to[0]]) continue; const sl = ob.slots[0], q = WE.toScreen(sl.x, sl.y, ob.prop && !ob.prop.flat ? 104 : 46), [vw, vh] = WE.size();
      if (q[0] < -30 || q[0] > vw + 30 || q[1] < -30 || q[1] > vh + 30) continue; const m = BADGE[ob.to[0]]();
      ctx.save(); ctx.translate(q[0], q[1]); ctx.beginPath(); ctx.moveTo(-7, 15); ctx.lineTo(0, 26); ctx.lineTo(7, 15); ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#231e16'; ctx.lineWidth = 2.2; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill(); ctx.stroke(); if (m){ const k = Math.min(30/m.width, 30/m.height); ctx.drawImage(m, -m.width*k/2, -m.height*k/2, m.width*k, m.height*k); } ctx.restore(); }
    for (const p of S.people.concat(X.pets)){ if (p.place !== me.place) continue; const sy = p.say && p.say.until > now ? p.say : null; if (!sy && (!p.want || p === me)) continue;
      const h = headY(p), m = sy ? sayPic(sy.k) : null, sp = sy ? null : itemSprite(p.want.item);
      bubble(ctx, h[0], h[1], c => { if (m){ const k = Math.min(30/m.width, 30/m.height); c.drawImage(m, -m.width*k/2, -1 - m.height*k/2, m.width*k, m.height*k); } else if (sp) c.drawImage(sp.img, -15, -17, 30, 30*sp.h/sp.w); }); }
    if (lessonT > 0 && me.place === 'school'){ const q = WE.toScreen(0, 150, 42), sc = WE.scale(), AB = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي', L = AB[Math.floor(lessonT/3) % AB.length];
      ctx.save(); ctx.transform(.78*sc, -.36*sc, 0, sc, q[0], q[1]); ctx.fillStyle = '#fbf6ea'; ctx.font = '700 44px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L, 0, 0); ctx.restore(); }
    for (let i = fxs.length - 1; i >= 0; i--){ const f = fxs[i], u = (now - f.t0)/1.3; if (u > 1){ fxs.splice(i, 1); continue; } if (u < 0) continue;
      const s = WE.toScreen(f.x, f.y, f.z + u*46); ctx.save(); ctx.translate(s[0] + Math.sin(u*6 + f.x)*5, s[1]); ctx.globalAlpha = 1 - u*u; ctx.strokeStyle = '#231e16'; ctx.lineWidth = 1.8;
      if (f.kind === 'heart'){ heartPath(ctx, 1.3); ctx.fillStyle = '#e8574a'; } else if (f.kind === 'drop'){ ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fillStyle = '#94cbe2'; } else { starPath(ctx, 1.1); ctx.fillStyle = '#f4b829'; }
      ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (ride){ const q = WE.toScreen(ride.x, ride.y, 74), m = BADGE.home0(); ctx.save(); ctx.translate(q[0], q[1]); ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#231e16'; ctx.lineWidth = 2.2; ctx.fill(); ctx.stroke();
      if (m){ const k = Math.min(30/m.width, 30/m.height); ctx.drawImage(m, -m.width*k/2, -m.height*k/2, m.width*k, m.height*k); } ctx.restore(); }
    for (let i = flies.length - 1; i >= 0; i--){ const f = flies[i], u = (now - f.t0)/f.d; if (u < 0) continue; if (u > 1){ flies.splice(i, 1); continue; }
      const q = WE.toScreen(f.a[0] + (f.b[0] - f.a[0])*u, f.a[1] + (f.b[1] - f.a[1])*u, 34 + Math.sin(u*Math.PI)*24), m = sayPic('item:' + f.kind); if (m) ctx.drawImage(m, q[0] - 14, q[1] - 14, 28, 28*m.height/m.width); }
    const g = guideTarget(); if (g){ const s = WE.toScreen(g.x, g.y, g.z); arrow(ctx, s[0], s[1]); }
    if (decorating && decorating.type){ ctx.fillStyle = 'rgba(92,174,106,.18)'; ctx.fillRect(0, 0, ...WE.size()); }
    if (!PL[me.place].wallH){ const [vw, vh] = WE.size(), t = performance.now()/1000;
      if (X.wet){ ctx.strokeStyle = 'rgba(70,105,150,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 54; i++){ const x = (i*97.3 + t*150) % (vw + 40) - 20, y = (i*61.7 + t*560 + i*i*7) % (vh + 30) - 15; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 15); } ctx.stroke();
        ctx.fillStyle = 'rgba(120,140,170,.10)'; ctx.fillRect(0, 0, vw, vh); }
      else if (rainbow > S.t){ ctx.save(); ctx.globalAlpha = .34*Math.min(1, (rainbow - S.t)/6); ctx.lineWidth = 9; ['#e8574a', '#f2a23c', '#f2c230', '#5cae6a', '#5b8fd6', '#8a63ad'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(vw/2, vh*.5, vw*.62 - i*9, Math.PI*1.08, Math.PI*1.92); ctx.stroke(); }); ctx.restore(); } }
  }
  // the picture over each door in town: whose house it is, or what the place is for
  const BADGE = { home0: () => pic('bh' + ver, () => WE.figUrl('me', 'stand', 45, 64)), gran: () => pic('bg', () => WE.figUrl('dadi', 'stand', 45, 64)), masjid: () => pic('icmosque', () => icUrl(IC.mosque)), shop: () => pic('item:bread', () => itemUrl('bread', 64)),
    school: () => pic('icpencil', () => icUrl(IC.pencil)), park: () => pic('ictree', () => icUrl(IC.tree)) };
  function burst(p, kind, n){ for (let i = 0; i < n; i++) fxs.push({ x: p.x + (Math.random() - .5)*18, y: p.y + (Math.random() - .5)*18, z: 50 + Math.random()*20, t0: S.t + i*.12, kind }); sfx('star'); }

  /* ---------- friendship and the album ---------- */
  function friend(p, n){ const t = dkey(new Date()); if (G.fday.d !== t) G.fday = { d: t, by: {} }; const by = G.fday.by; if ((by[p.id] || 0) >= 8) return;
    by[p.id] = (by[p.id] || 0) + n; const a = G.friends[p.id] || 0; G.friends[p.id] = a + n; burst(p, 'heart', Math.min(4, n + 1));
    for (const lim of [3, 7, 12]) if (a < lim && a + n >= lim){ unlockNext(); break; } save(); }
  function album(kind){ G.album[kind] = (G.album[kind] || 0) + 1; G.jar = Math.min(9, G.jar + 1); bridge('akhlaq-' + kind);
    const tot = Object.values(G.album).reduce((a, b) => a + b, 0); if (tot % 5 === 0) unlockNext(); hud.book.classList.remove('pop'); void hud.book.offsetWidth; hud.book.classList.add('pop'); save(); }
  function unlockNext(){ const n = WP.DECOR.find(t => !G.unlocked.includes(t)); if (!n) return; G.unlocked.push(n); save(); toast(`<i>${IC.gift}</i><img src="${thingUrl(n, 72)}">`); sfx('star'); }
  function toast(html){ const t = el('div', 'w-toast', html); document.body.appendChild(t); requestAnimationFrame(() => t.classList.add('on')); setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 2600); }

  /* ---------- moving and using things ---------- */
  const occupied = pl => { const t = new Set(); for (const p of S.people) if (p.place === pl.id && p !== me) t.add(WE.cellId(pl, p.x, p.y)); return t; };
  function meGo(to, then){ S.release(me); meTimer = null; return S.go(me, to, then); }
  function walkThen(ob, fn){ const s = ob.slots[0], pl = PL[me.place], c = (!s.by || s.by === 'me') ? [s.x, s.y] : (WE.freeNear(pl, s.x, s.y, occupied(pl), 1) || [s.x, s.y]);
    if (Math.hypot(c[0] - me.x, c[1] - me.y) < 4){ me.face = s.face; fn(); return; }
    meGo(c, () => { me.face = s.face; fn(); }); }
  const mePose = (pose, secs, fn) => { me.pose = pose; me.st = 'act'; meTimer = { t: S.t + secs, fn }; };
  function useObj(ob){
    const u = ob.use, pl = PL[me.place];
    if (me.bike && !ob.to) offBike();
    if (ob.to) return S.travel(me, ob);
    if (u.tag === 'wardrobe') return walkThen(ob, () => openEditor(false));
    if (u.tag === 'salah') return walkThen(ob, () => goPage('salah', { p: nowPrayer() }));
    if (u.tag === 'wudu') return walkThen(ob, () => goPage('wudu', {}));
    if (ob.id === 'washer' && carry !== 'sock') return walkThen(ob, () => goPage('washer', {}));
    if (u.tag === 'sadaqah') return walkThen(ob, () => { if (!G.jar) return sfx('tap'); const n = G.jar; G.jar = 0; G.given += n; for (let i = 0; i < Math.min(5, n); i++) fxs.push({ x: me.x, y: me.y, z: 40, t0: S.t + i*.15, kind: 'star' }); mePose('wipe', 1.2); album('give'); G.jar = 0; praise(); save(); hudJar(); });
    if (u.tag === 'garden') return walkThen(ob, () => gardenAct(ob));
    if (u.tag === 'pond') return feedDucks();
    if (u.tag === 'bus') return waitBus(ob);
    const drops = (x, y, z) => { for (let i = 0; i < 5; i++) fxs.push({ x: x + (Math.random() - .5)*16, y: y + (Math.random() - .5)*16, z: z || 20, t0: S.t + .2 + i*.2, kind: 'drop' }); };
    if (u.tag === 'bath') return walkThen(ob, () => { drops(ob.prop.x0 + 14, ob.prop.y0 + 28, 24); mePose('wipe', 3, () => { me.need.clean = 100; burst(me, 'star', 3); slowMe(); }); });
    if (u.tag === 'fountain') return walkThen(ob, () => { drops(ob.prop.x0 + 20, ob.prop.y0 + 20, 30); mePose('wave', 2); me.need.fun = Math.min(100, me.need.fun + 20); me.need.clean = Math.min(100, me.need.clean + 15); });
    if (u.tag === 'bowl') return walkThen(ob, () => { if (ob.prop.o.full){ toast(`<i>${IC.drop}</i><i>${IC.ok}</i>`); return; } ob.prop.o.full = 1; rekey(ob.prop); drops(ob.prop.x0 + 6, ob.prop.y0 + 6, 6); mePose('water', 1.8); for (const c of X.pets) if (c.kind === 'cat' && c.place === me.place) c.until = 0; });
    if (u.tag === 'feeder') return walkThen(ob, () => { if (FOOD[carry]){ setCarry(null); ob.prop.o.full = 1; rekey(ob.prop); X.crumbs = { place: me.place, x: ob.slots[0].x + 4, y: ob.slots[0].y + 14, until: S.t + 45 }; for (const c of X.pets) if (c.kind === 'bird') c.until = 0; mePose('fix', 1.4); later(3, () => burst({ x: ob.slots[0].x + 4, y: ob.slots[0].y + 14 }, 'heart', 3)); petCare('feeder'); praise(); }
      else { guide = { src: 'bread' }; toast(`<img src="${itemUrl('bread', 64)}">`); } });
    if (ob.type === 'stove' && me.place === 'home0'){ if (carry === 'veg') return walkThen(ob, () => { setCarry(null); mePose('cook', 3.5, () => { setCarry('meal'); burst(me, 'star', 4); praise(); }); }); if (!carry) return walkThen(ob, () => toast(`<img src="${itemUrl('veg', 56)}"><i>${IC.fast}</i><img src="${itemUrl('meal', 56)}">`)); }
    if (carry && u.takes && u.takes.includes(carry)) return walkThen(ob, () => { const k = carry; setCarry(null); mePose('wipe', 1); burst(me, 'star', 3); album(k === 'book' || k === 'ball' ? 'clean' : 'clean'); if (Math.random() < .5) praise(); });
    if (!carry && u.gives) return walkThen(ob, () => { setCarry(u.gives); sfx('whoosh'); });
    if (u.lock) return walkThen(ob, () => { lockAt = { ob, t: S.t }; toast(`<i>${IC.lock}</i>`); sfx('tap'); });
    if (u.who === 'none' || u.tag === 'none') return walkThen(ob, () => {});
    const free = ob.slots.filter(s => !s.by || s.by === 'me');
    // someone is already there: take the nearest free one of the same kind, or show that it is taken
    if (!free.length){ const alt = pl.objs.filter(o => o !== ob && o.type === ob.type && o.slots.some(s => !s.by)).sort((a, b) => Math.hypot(a.slots[0].x - me.x, a.slots[0].y - me.y) - Math.hypot(b.slots[0].x - me.x, b.slots[0].y - me.y))[0];
      if (alt) return useObj(alt); say(me, 'x', 0, 1.4); return sfx('tap'); }
    free.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); meTimer = null;
    S.useSlot(me, ob, free[0], carry === 'book' && (free[0].poses.includes('read') || free[0].poses.includes('sit')) ? ['read'] : null, 1e7); if (u.tag === 'eat' || ob.type === 'bench' || ob.type === 'sofa') me.then = (f => () => { f(); bridge('sit'); })(me.then);
  }
  let lockAt = null;
  function setCarry(k){ carry = k; hud.carry.hidden = !k; if (k) hud.carry.innerHTML = `<img src="${itemUrl(k, 56)}">`; refreshGuide(); }
  function dropCarry(){ if (!carry) return; const it = S.drop(me.place, carry, me.x, me.y, null); if (it){ it.x = WE.freeNear(PL[me.place], me.x + 14, me.y + 6, occupied(PL[me.place]), 0)[0]; setCarry(null); sfx('tap'); } }
  function takeLoose(it){ const pl = PL[me.place], c = WE.freeNear(pl, it.x, it.y, occupied(pl), 0) || [it.x, it.y];
    meGo(c, () => { const L = S.loose[me.place], i = L.indexOf(it); if (i < 0) return; L.splice(i, 1); sfx('whoosh');
      if (it.kind === 'bike'){ onBike(); return; }
      if (it.kind === 'gift'){ G.gift = dkey(new Date()); save(); burst(me, 'star', 5); unlockNext(); return; }
      if (carry) S.loose[me.place].push({ kind: carry, x: it.x, y: it.y, id: 'l' + Math.random().toString(36).slice(2, 7) });
      setCarry(it.kind); }); }
  function feedDucks(){ const ob = PL.park.objs.find(o => o.id === 'pond'); walkThen(ob, () => { if (carry === 'bread'){ setCarry(null); mePose('throw', 2); for (let i = 0; i < 5; i++) fxs.push({ x: 110 + i*6, y: 340 - i*4, z: 4, t0: S.t + .4 + i*.15, kind: 'heart' }); album('care'); praise(); }
    else { mePose('wave', 1.5); guide = { src: 'bread' }; refreshGuide(); } }); }
  function goPage(st, params){ save(); try { location.href = HHFlow.url(st, Object.assign({ from: 'house' }, params)); } catch (e) {} }
  const nowPrayer = () => { if (S.prayer) return S.prayer.name; const T = S.prayerHours(), h = S.hour(); let n = 'isha'; for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) if (h >= T[k]) n = k; return n; };

  /* ---------- the garden: plant, water each day, pick ---------- */
  const bedOf = id => G.garden[id] || (G.garden[id] = { stage: 0, w: '', g: '' });
  const ripeBed = () => Object.values(G.garden).some(b => b.stage >= 3);
  function rekey(p){ p.key = p.id + '|' + p.x0 + '|' + p.y0 + '|' + JSON.stringify(p.o); WE.dirty = true; }
  function syncBeds(){ for (const id of ['bedA', 'bedB']){ const ob = PL.yard.objs.find(o => o.id === id); if (!ob) continue; const b = bedOf(id); ob.prop.o.stage = b.stage; ob.prop.o.wet = b.w === dkey(S ? (S.now ? new Date() : new Date()) : new Date()) ? 1 : 0; rekey(ob.prop); } }
  function growGarden(today){ for (const id in G.garden){ const b = G.garden[id]; if (b.stage > 0 && b.stage < 3 && b.w && b.w !== today && b.g !== today){ b.stage++; b.g = today; } } if (PL) syncBeds(); save(); }
  function gardenAct(ob){ const b = bedOf(ob.id), today = dkey(S.now());
    if (b.stage === 0){ if (carry === 'seed'){ setCarry(null); b.stage = 1; b.w = ''; b.g = today; mePose('fix', 1.6); burst(me, 'star', 3); album('care'); } else { guide = { src: 'seed' }; refreshGuide(); toast(`<img src="${itemUrl('seed', 64)}">`); } }
    else if (b.stage >= 3){ if (!carry){ b.stage = 0; b.w = ''; setCarry('veg'); burst(me, 'star', 4); praise(); } }
    else if (b.w !== today){ b.w = today; mePose('water', 2.2); for (let i = 0; i < 5; i++) fxs.push({ x: ob.prop.x0 + 10 + i*4, y: ob.prop.y0 + 15 + i*9, z: 8, t0: S.t + .3 + i*.2, kind: 'drop' }); album('care'); }
    else { mePose('wave', 1); toast(`<i>${IC.drop}</i><i>${IC.ok}</i>`); }
    syncBeds(); save(); }
  function prayerGarden(){ let n = 0; try { const l = HHFlow.log().salah || [], seen = {}; for (const e of l) if (e.p && !seen[e.p]){ seen[e.p] = 1; n++; } } catch (e) {}
    PL.yard.ver = n; if (!n) return;
    PL.yard.flats.push(() => { let s = ''; for (let i = 0; i < n; i++){ const x = 130 + i*16, y = 44; s += rod([x, y, 0], [x, y, 12], .9, matOf(C.green), toneI, .6) + H3.ball([x, y, 15], 5, [C.pink, C.yellow, C.red, C.purple, C.blue][i]) + H3.ball([x, y, 16.5], 2, '#fff4d6'); } return s; }); }

  /* ---------- people: the picture ring ---------- */
  const FAM = { abu: 1, ummi: 1, sister: 1, toddler: 1, dada: 1, dadi: 1 }, CHORE = { cook: 1, chop: 1, wipe: 1, fold: 1, water: 1, fix: 1 };
  let ring = null;
  function approach(p){
    const pl = PL[me.place]; if (p.pet){ p.path = null; p.pose = 'sit'; p.then = null; } else if (p.st === 'walk'){ p.path = null; p.st = 'act'; p.pose = 'stand'; p.then = null; } p.until = Math.max(p.until, S.t + 12);
    // stand beside them as seen on screen (never in front of or behind them), with a clear gap
    const side = (me.x - p.x) - (me.y - p.y) >= 0 ? 1 : -1, gap = p.pet ? 16 : 30, c = WE.freeNear(pl, p.x + side*.707*gap, p.y - side*.707*gap, occupied(pl), 0);
    if (!c) return; meGo(c, () => { me.face = Math.atan2(p.y - me.y, p.x - me.x)/D2R; openRing(p); });
  }
  function openRing(p){
    closeRing(); if (p.place !== me.place) return; p.until = Math.max(p.until, S.t + 20);
    if (p.pet){ const acts = [['pet', IC.heart]]; if (FOOD[carry]) acts.push(['feed', `<img src="${itemUrl(carry, 56)}">`]); return ringOf(p, acts, k => doPet(k, p)); }
    if (p.pose === 'sleep') return say(p, 'moon'); if (p.praying) return say(p, 'mat');
    const acts = [['salam', IC.wave], ['talk', IC.talk]]; if (carry) acts.push(['give', `<img src="${itemUrl(carry, 56)}">`]);
    if (p.kid){ acts.push(['play', IC.play]); if (p.id !== 'toddler' && (G.friends[p.id] || 0) >= 2) acts.push(['come', IC.walk]); } else if (CHORE[p.pose]) acts.push(['help', IC.help]);
    if (FAM[p.id]) acts.push(['hug', IC.heart]);
    ringOf(p, acts, k => doAct(k, p));
  }
  function ringOf(p, acts, fn){
    const h = headY(p), [vw] = WE.size(), box = el('div', 'w-ring'); ring = { p, box };
    acts.forEach(([k, pic], i) => { const b = el('button', 'w-rb', pic), n = acts.length, ang = (-90 + (i - (n - 1)/2)*(n > 4 ? 44 : 52))*D2R, r = n > 4 ? 86 : 74;
      b.style.left = Math.max(34, Math.min(vw - 34, h[0] + Math.cos(ang)*r)) + 'px'; b.style.top = Math.max(40, h[1] + 34 + Math.sin(ang)*r) + 'px';
      b.onclick = e => { e.stopPropagation(); closeRing(); fn(k); }; box.appendChild(b); });
    box.onclick = closeRing; document.body.appendChild(box); modal = 'ring';
  }
  function closeRing(){ if (ring){ ring.box.remove(); ring = null; if (modal === 'ring') modal = null; } }
  const FOOD = { bread: 1, fruit: 1, meal: 1, dates: 1, seed: 1 };
  function doPet(k, c){ sfx('tap'); me.face = Math.atan2(c.y - me.y, c.x - me.x)/D2R; c.path = null; c.pose = 'sit'; c.until = S.t + 4; c.face = Math.atan2(me.y - c.y, me.x - c.x)/D2R;
    if (k === 'pet'){ mePose('fix', 1.6); later(.5, () => { burst(c, 'heart', 3); say(c, 'heart'); }); c.follow = S.t + 60; petCare(c.id); me.need.fun = Math.min(100, me.need.fun + 15); }
    else { setCarry(null); mePose('fix', 1.4); later(.6, () => { burst(c, 'heart', 4); say(c, 'heart'); }); c.follow = S.t + 90; petCare(c.id + 'f'); praise(); } }
  function feedBirds(b){ if (!FOOD[carry]){ guide = { src: 'bread' }; refreshGuide(); return toast(`<img src="${itemUrl('bread', 64)}">`); }
    setCarry(null); me.face = Math.atan2(b.y - me.y, b.x - me.x)/D2R; mePose('throw', 1.6); const a = Math.atan2(b.y - me.y, b.x - me.x), d = Math.min(46, Math.hypot(b.x - me.x, b.y - me.y));
    X.crumbs = { place: me.place, x: me.x + Math.cos(a)*d, y: me.y + Math.sin(a)*d, until: S.t + 40 }; for (const c of X.pets) if (c.kind === 'bird' && c.place === me.place) c.until = 0;
    later(3.5, () => burst(X.crumbs, 'heart', 4)); petCare('birds' + me.place); praise(); }
  function doAct(k, p){
    const face = () => { p.face = Math.atan2(me.y - p.y, me.x - p.x)/D2R; }, canPose = (!p.act || !p.act.use.tag) && p.st === 'act', hold = n => { p.until = Math.max(p.until, S.t + n); };
    const pose = (ps, n) => { if (canPose){ face(); p.pose = ps; p.waveEnd = S.t + n; } hold(n + .6); };
    sfx('tap'); me.face = Math.atan2(p.y - me.y, p.x - me.x)/D2R;
    if (k === 'salam'){ mePose('wave', 1.6); say(me, 'wave', 0, 1.4); later(.8, () => { pose('wave', 1.6); say(p, 'wave'); sfx('tap'); });
      const first = !G.friends[p.id]; friend(p, 1); if (first || Math.random() < .35) album('salam'); }
    else if (k === 'talk'){ mePose('stand', 4.6); if (canPose){ face(); p.pose = 'stand'; } hold(5.2);
      const mine = carry || ['ball', 'book', 'flower', 'fruit'][Math.floor(Math.random()*4)], theirs = p.want ? p.want.item : p.wants[Math.floor(Math.random()*p.wants.length)];
      say(me, 'item:' + mine, 0, 1.6); later(1.7, () => { say(p, 'item:' + theirs, 0, 1.8); sfx('tap'); }); later(3.6, () => { say(p, 'heart', 0, 1.2); say(me, 'heart', 0, 1.2); });
      friend(p, 1); p.need.social = 100; }
    else if (k === 'give'){ const item = carry, wanted = p.want && p.want.item === item; setCarry(null); mePose('stand', 1.2); toss(item, me, p, 0, .6); hold(3); later(.6, () => { pose('wave', 1.6); say(p, wanted ? 'star' : 'heart'); sfx('whoosh'); });
      if (wanted){ p.want = null; friend(p, 3); album('help'); praise(); if (guide && guide.who === p.id) guide = null; } else { friend(p, 1); album('give'); }
      // kindness comes back
      if (wanted || Math.random() < .4){ const it = ['dates', 'fruit', 'flower'].filter(x => x !== item)[Math.floor(Math.random()*2)]; hold(4.4); later(2.6, () => { if (carry || p.place !== me.place) return; say(p, 'item:' + it, 0, 1.2); toss(it, p, me, .3, .6); later(.9, () => { if (!carry){ setCarry(it); sfx('whoosh'); burst(me, 'heart', 2); } }); }); }
      hudWants(); }
    else if (k === 'play'){ const ps = p.id === 'toddler' ? 'play' : 'throw'; mePose(ps, 5); if (canPose){ face(); p.pose = ps; p.until = S.t + 5; } if (p.id !== 'toddler') for (let i = 0; i < 4; i++) toss('ball', i % 2 ? p : me, i % 2 ? me : p, .3 + i*1.1, .9); later(4.6, () => { say(p, 'heart'); if (p.id !== 'toddler') p.followMe = S.t + 30; });
      me.need.fun = Math.min(100, me.need.fun + 35); friend(p, 1); if (p.id === 'toddler') album('care'); }
    else if (k === 'come'){ p.followMe = S.t + 60; p.until = S.t + .6; say(p, 'ok'); mePose('wave', 1); }
    else if (k === 'help'){ mePose(p.pose, 5, () => { friend(p, 2); album('help'); praise(); say(p, 'star'); }); me.face = p.face; hold(6); }
    else if (k === 'hug'){ hold(6); const sd = (me.x - p.x) - (me.y - p.y) >= 0 ? 1 : -1, hug = () => { me.face = Math.atan2(p.y - me.y, p.x - me.x)/D2R; mePose('hug', 2.2); pose('hug', 2.2); say(p, 'heart', .7); friend(p, 1); };
      if (!meGo([p.x + sd*12, p.y - sd*12], hug)) hug(); }
  }

  /* ---------- little picture cards: someone wishes for something ---------- */
  const SRC = { bread: 'shop', dates: 'home0', cup: 'home0', book: 'home0', ball: 'home1', flower: 'yard', veg: 'yard', seed: 'shop', fruit: 'street', meal: 'home0' };
  function hudWants(){ const ws = S.people.filter(p => p.want && p.ai), k = ws.map(p => p.id + p.want.item).join() + (guide ? guide.who || guide.src : '');
    if (k === hudWants.k) return; hudWants.k = k; hud.wants.innerHTML = '';
    for (const p of ws.slice(0, 2)){ const b = el('button', 'w-want' + (guide && guide.who === p.id ? ' sel' : ''), `<img src="${WE.figUrl(p.body, 'stand', 45, 60)}"><img src="${itemUrl(p.want.item, 44)}">`);
      b.onclick = () => { sfx('tap'); guide = guide && guide.who === p.id ? null : { who: p.id }; hudWants.k = ''; hudWants(); }; hud.wants.appendChild(b); } }
  function refreshGuide(){ if (guide && guide.src && carry === guide.src) guide = null; }
  // where the arrow points: the thing to fetch, then the person; through the next door when it is somewhere else
  function guideTarget(){
    if (!guide) return null; let place, find;
    const at = ob => ({ x: ob.slots[0].x, y: ob.slots[0].y, z: (ob.prop ? ob.prop.h : 20) + 30 });
    if (guide.place){ if (me.place === guide.place){ guide = null; return null; } place = guide.place; }
    else if (guide.at){ place = guide.at[0]; if (me.place === place){ const ob = PL[place].objs.find(o => o.id === guide.at[1] || o.type === guide.at[1]); if (!ob || Math.hypot(ob.slots[0].x - me.x, ob.slots[0].y - me.y) < 26){ guide = null; return null; } return at(ob); } }
    else if (guide.who){ const p = S.byId[guide.who]; if (!p || !p.want){ guide = null; hudWants(); return null; }
      if (carry === p.want.item){ if (p.place === 'away') return null; if (p.place === me.place) return { x: p.x, y: p.y, z: 120 }; place = p.place; }
      else { place = SRC[p.want.item]; find = p.want.item; } }
    else { place = SRC[guide.src]; find = guide.src; }
    if (find === 'meal' && carry !== 'veg' && !ripeBed()) find = null;
    if (find === 'meal' && carry !== 'veg'){ place = 'yard'; find = 'veg'; }
    if (place === me.place && find){ const ob = find === 'meal' ? PL[place].objs.find(o => o.type === 'stove') : PL[place].objs.find(o => o.use.gives === find && (find !== 'veg' || bedOf(o.id).stage >= 3)) || (find === 'veg' ? PL.yard.objs.find(o => bedOf(o.id).stage >= 3 && o.use.tag === 'garden') : null);
      return ob ? at(ob) : null; }
    if (place === me.place) return null;
    const dr = WP.nextDoor(PL, me.place, place); return dr ? { x: dr.slots[0].x, y: dr.slots[0].y, z: Math.min(104, (dr.prop && !dr.prop.flat ? dr.prop.h : 0) + 34) } : null;
  }

  /* ---------- prayer time ---------- */
  let adhanCtx = null;
  function clip(file){ try { adhanCtx = adhanCtx || new (window.AudioContext || window.webkitAudioContext)(); if (adhanCtx.state === 'suspended') adhanCtx.resume();
      fetch('/KidsGames/games/helping-home/audio/' + file).then(r => r.arrayBuffer()).then(b => adhanCtx.decodeAudioData(b, buf => { const s = adhanCtx.createBufferSource(); s.buffer = buf; const g = adhanCtx.createGain(); g.gain.value = .8; s.connect(g); g.connect(adhanCtx.destination); s.start(); })).catch(() => {}); } catch (e) {} }
  function onPrayer(name){
    clip('adhan-takbir1.m4a'); const old = document.querySelector('.w-pray'); if (old) old.remove();
    const b = el('div', 'w-pray', `<i class="m">${IC.mosque}</i>`), go = el('button', 'w-pb', IC.mat), join = el('button', 'w-pb', IC.walk), no = el('button', 'w-pb x', IC.x);
    if (S.clock.speed === 1) b.appendChild(go); b.appendChild(join); b.appendChild(no); document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('on'));
    const done = () => { b.classList.remove('on'); setTimeout(() => b.remove(), 300); };
    go.onclick = () => { done(); goPage('adhan', { p: name, next: 'wudu,salah' }); };
    join.onclick = () => { done(); joinPrayer(); }; no.onclick = done; setTimeout(done, 40000);
  }
  // walk to the prayer with everyone (a boy to the masjid with Abu, a girl to the prayer room with Ummi), and pray along
  function joinPrayer(){
    const dest = G.av.girl ? 'home1' : 'masjid';
    const step = () => { if (!S.prayer) return; if (me.place !== dest){ const dr = WP.nextDoor(PL, me.place, dest); if (dr){ S.travel(me, dr); auto = step; } return; }
      auto = null; const ob = PL[dest].objs.find(o => o.use.tag === 'pray'), free = ob.slots.filter((s, i) => i > 0 && !s.by); if (!free.length) return;
      S.useSlot(me, ob, free[0], ['stand'], 1e7); me.praying = true; };
    step();
  }
  let auto = null;

  /* ---------- decorating: put what you have won anywhere at home ---------- */
  function addDecor(d, silent){ const pl = PL[d.place]; if (!pl || !WP.T[d.type]) return; const before = pl.props.length, nob = pl.objs.length; WP.thing(pl, d.type, d.x, d.y, { id: 'dec' + d.x + '_' + d.y + d.type, col: d.col });
    const p = pl.props[before]; p.decor = d; p.hit = true; if (pl.objs.length > nob) pl.objs[nob].decor = d; if (!silent){ if (p.solid && pl.block) pl.block(p.x0, p.y0, p.x1, p.y1, 1); WE.sortProps(); } }
  function placeDecor(x, y){
    const t = WP.T[decorating.type], pl = PL[me.place], bx = Math.round((x - t.w/2)/10)*10, by = Math.round((y - t.d/2)/10)*10;
    const ok = (gx, gy) => { for (let a = gx + 1; a < gx + t.w; a += 5) for (let b = gy + 1; b < gy + t.d; b += 5) if (!WE.walkable(pl, a, b)) return false;
      if (S.people.some(p => p.place === pl.id && p.x > gx - 8 && p.x < gx + t.w + 8 && p.y > gy - 8 && p.y < gy + t.d + 8)) return false;
      for (const ob of pl.objs) for (const s of ob.slots) if (s.x > gx - 6 && s.x < gx + t.w + 6 && s.y > gy - 6 && s.y < gy + t.d + 6) return false; return true; };
    // the nearest place where it fits (so a tap always puts it down somewhere close)
    let at = null; for (let r = 0; r < 9 && !at; r++) for (let i = -r; i <= r && !at; i++) for (let j = -r; j <= r && !at; j++) if (Math.max(Math.abs(i), Math.abs(j)) === r && ok(bx + i*10, by + j*10)) at = [bx + i*10, by + j*10];
    if (!at) return sfx('tap');
    const cols = [C.red, C.blue, C.green, C.purple, C.yellow, C.teal], d = { place: pl.id, type: decorating.type, x: at[0], y: at[1], col: cols[G.decor.length % cols.length] };
    G.decor.push(d); addDecor(d); save(); sfx('star'); fxs.push({ x: at[0] + t.w/2, y: at[1] + t.d/2, z: 20, t0: S.t, kind: 'star' });
  }
  function removeDecor(p){ const pl = PL[me.place], i = pl.props.indexOf(p); if (i < 0) return; pl.props.splice(i, 1); if (p.solid) pl.block(p.x0, p.y0, p.x1, p.y1, 0);
    const oi = pl.objs.findIndex(o => o.prop === p); if (oi >= 0){ for (const s of pl.objs[oi].slots) if (s.by){ const w = S.byId[s.by]; if (w){ S.release(w); w.until = 0; } } pl.objs.splice(oi, 1); }
    G.decor.splice(G.decor.indexOf(p.decor), 1); save(); WE.sortProps(); sfx('whoosh'); }
  function startDecor(){ closeRing(); decorating = { type: null }; const tray = el('div', 'w-tray'); decorating.tray = tray;
    for (const t of WP.DECOR){ const have = G.unlocked.includes(t), b = el('button', 'w-tb' + (have ? '' : ' no'), have ? `<img src="${thingUrl(t, 64)}">` : IC.lock);
      if (have) b.onclick = () => { sfx('tap'); decorating.type = decorating.type === t ? null : t; for (const x of tray.children) x.classList.toggle('sel', x === b && !!decorating.type); }; tray.appendChild(b); }
    const ok = el('button', 'w-tb ok', IC.ok); ok.onclick = endDecor; tray.appendChild(ok); document.body.appendChild(tray); hud.brush.classList.add('sel'); }
  function endDecor(){ if (!decorating) return; decorating.tray.remove(); decorating = null; hud.brush.classList.remove('sel'); WE.dirty = true; }

  /* ---------- make your character ---------- */
  function openEditor(first){
    closeRing(); modal = 'editor'; const a = Object.assign({}, G.av), v = el('div', 'w-sheet maker'), prev = el('img', 'w-prev');
    const row = (items, cur, set, cls) => { const r = el('div', 'w-row'); items.forEach(it => { const b = el('button', 'w-sw ' + (cls || ''), it.h || ''); if (it.c) b.style.background = it.c; if (it.v === cur()) b.classList.add('sel');
      b.onclick = () => { sfx('tap'); set(it.v); for (const x of r.children) x.classList.toggle('sel', x === b); show(); }; r.appendChild(b); }); return r; };
    const show = () => { const keep = G.av; G.av = a; applyAv(); prev.src = WE.figUrl('me', 'stand', 45, 150); G.av = keep; };
    v.appendChild(prev);
    v.appendChild(row([{ v: false, h: `<img src="${WE.figUrl('friendb', 'stand', 45, 60)}">` }, { v: true, h: `<img src="${WE.figUrl('sister', 'stand', 45, 60)}">` }], () => a.girl, x => a.girl = x, 'big'));
    v.appendChild(row(['#f1c9a5', '#e0ac7e', '#c98e62', '#a36a44', '#6f4a32'].map(c => ({ v: c, c })), () => a.skin, x => a.skin = x));
    v.appendChild(row([C.red, C.blue, C.green, C.yellow, C.purple, C.teal, '#fbf6ea'].map(c => ({ v: c, c })), () => a.top, x => a.top = x));
    v.appendChild(row([C.pink, C.purple, C.blue, '#fbf6ea', C.teal].map(c => ({ v: c, c })).concat([{ v: 'none', h: IC.x }]), () => a.girl ? a.head : (a.kufi ? '#fbf6ea' : 'none'), x => { if (x === 'none') a.kufi = false; else { a.head = x; a.kufi = true; } }));
    const ok = el('button', 'w-ok', IC.ok); ok.onclick = () => { delete a.fresh; G.av = a; applyAv(); save(); v.remove(); modal = null; sfx('star'); if (first) burst(me, 'star', 5); }; v.appendChild(ok);
    document.body.appendChild(v); show();
  }

  /* ---------- the book: people you know, and the good you did ---------- */
  function openBook(){
    closeRing(); modal = 'book'; const v = el('div', 'w-sheet book'), x = el('button', 'w-x', IC.x); x.onclick = () => { v.remove(); modal = null; }; v.appendChild(x);
    const al = el('div', 'w-album'); for (const [k, ic] of [['salam', IC.wave], ['give', IC.gift], ['help', IC.help], ['clean', IC.clean], ['care', IC.paw], ['learn', IC.pencil]]){ const n = G.album[k] || 0, r = el('div', 'w-al', `<i>${ic}</i>`);
      for (let i = 0; i < 8; i++) r.appendChild(el('b', i < Math.min(8, n) ? 'on' : '', IC.star)); if (n > 8) r.appendChild(el('span', '', '+' + (n - 8))); al.appendChild(r); }
    v.appendChild(al);
    let pg = 0; try { const l = HHFlow.log().salah || [], seen = {}; for (const e of l) if (e.p && !seen[e.p]){ seen[e.p] = 1; pg++; } } catch (e) {}
    const pr = el('div', 'w-al pr', `<i>${IC.mat}</i>`); for (let i = 0; i < 5; i++) pr.appendChild(el('b', i < pg ? 'on' : '', flowerSvg(i < pg ? 7 : 0))); v.appendChild(pr);
    const jr = el('div', 'w-al pr', `<i>${IC.jar}</i>`); for (let i = 0; i < 9; i++) jr.appendChild(el('b', i < G.jar ? 'on coin' : 'coin', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#e2b14a" stroke="#231e16" stroke-width="1.800"/></svg>')); v.appendChild(jr);
    const pp = el('div', 'w-people'); for (const p of S.people){ if (!p.ai) continue; const n = G.friends[p.id] || 0; pp.appendChild(el('div', 'w-pp' + (n ? '' : ' new'), `<img src="${WE.figUrl(p.body, 'stand', 45, 80)}"><i>${flowerSvg(n)}</i>`)); }
    v.appendChild(pp); document.body.appendChild(v); sfx('whoosh');
  }
  function hudJar(){}
  // the town map: tap a place and an arrow shows the way
  function openMap(){
    closeRing(); modal = 'map'; const v = el('div', 'w-sheet'), x = el('button', 'w-x', IC.x), close = () => { v.remove(); modal = null; }; x.onclick = close; v.appendChild(x);
    const g = el('div', 'w-map'); for (const [pl, src] of [['home0', WE.figUrl('me', 'stand', 45, 96)], ['masjid', icUrl(IC.mosque)], ['school', icUrl(IC.pencil)], ['shop', itemUrl('bread', 96)], ['park', icUrl(IC.tree)], ['gran', WE.figUrl('dadi', 'stand', 45, 96)]]){
      const here = me.place === pl || (pl === 'home0' && (me.place === 'home1' || me.place === 'yard')), b = el('button', 'w-mb' + (here ? ' sel' : ''), `<img src="${src}">`);
      b.onclick = () => { sfx('tap'); guide = here ? null : { place: pl }; hudWants.k = ''; close(); }; g.appendChild(b); }
    v.appendChild(g); document.body.appendChild(v); sfx('whoosh');
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage){   // inside the Kahf Kids app: a way back to the app
      const ex = el('button', 'w-x w-exit', '<svg viewBox="0 0 24 24" fill="none" stroke="#231e16" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg><b>Exit</b>');
      ex.setAttribute('aria-label', 'Exit'); ex.onclick = () => { sfx('tap'); kahfNav('exit'); }; v.appendChild(ex);
    }
  }

  function kahfNav(action){ try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'kahfNav', v: 1, action })); } catch (e) {} }
  /* ---------- the buttons on screen ---------- */
  function buildHud(){
    veil = el('div', 'w-veil on', '<i></i>'); document.body.appendChild(veil);
    if (window.ReactNativeWebView) kahfNav('exitReady');
    const top = el('div', 'w-top'); hud.clock = el('button', 'w-chip'); hud.sun = el('i'); hud.time = el('b', '', '0:00'); hud.fast = el('i', 'ff', IC.fast);
    hud.clock.append(hud.sun, hud.time, hud.fast); hud.clock.classList.toggle('fast', !!G.fast);
    hud.clock.onclick = () => { G.fast = !G.fast; save(); sfx('whoosh'); hud.clock.classList.toggle('fast', G.fast); if (G.fast) S.setSpeed(72); else { S.clock = { base: Date.now(), real0: S.t, speed: 1 }; } slow(); };
    hud.book = el('button', 'w-btn', IC.book); hud.book.onclick = openBook;
    hud.brush = el('button', 'w-btn', IC.brush); hud.brush.onclick = () => { sfx('tap'); decorating ? endDecor() : startDecor(); };
    hud.map = el('button', 'w-btn', IC.map); hud.map.onclick = openMap;
    const nds = el('div', 'w-needs'); hud.nd = NEEDS.map(([k, ic, at]) => { const b = el('button', 'w-nd', `<i>${IC[ic]}</i>`); b.onclick = () => { sfx('tap'); guide = guide && guide.at === at ? null : { at }; }; nds.appendChild(b); return b; }); document.body.appendChild(nds);
    const right = el('div', 'w-right'); right.append(hud.brush, hud.map, hud.book); top.append(hud.clock, right); document.body.appendChild(top);
    hud.wants = el('div', 'w-wants'); document.body.appendChild(hud.wants);
    hud.carry = el('button', 'w-carry'); hud.carry.hidden = true; hud.carry.onclick = dropCarry; document.body.appendChild(hud.carry);
    hud.bike = el('button', 'w-carry side', `<img src="${itemUrl('bike', 56)}"><i>${IC.x}</i>`); hud.bike.hidden = true; hud.bike.onclick = () => offBike(); document.body.appendChild(hud.bike);
    hud.off = el('button', 'w-carry side r', IC.walk); hud.off.hidden = true; hud.off.onclick = () => ride ? getOff() : getUp(); document.body.appendChild(hud.off);
  }
  function input(){
    const cv = document.getElementById('cv'); let down = null;
    cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; try { Kit.sfx && Kit.sfx.unlock && Kit.sfx.unlock(); } catch (er) {} });
    cv.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 14){ down = null; return; } down = null; tap(e.clientX, e.clientY); });
  }
  function tap(px, py){
    if (modal || ride) return; me.busStop = null; const r = document.getElementById('cv').getBoundingClientRect(), h = WE.pick(px - r.left, py - r.top), pl = PL[me.place]; auto = null; me.praying = false;
    if (decorating){ if (h.prop && h.prop.decor) return removeDecor(h.prop); if (decorating.type){ const g = WE.fromScreen(px - r.left, py - r.top); return placeDecor(g[0], g[1]); } }
    if (h.actor){ sfx('tap'); const a = h.actor; if (a.pet) return a.pet.kind === 'bird' ? feedBirds(a.pet) : approach(a.pet); return a.item ? takeLoose(a.item) : approach(a.p); }
    if (h.prop){ sfx('tap'); if (h.prop.obj && me.act === h.prop.obj && me.st === 'act' && me.slot) return getUp(); if (h.prop.obj) return useObj(h.prop.obj); if (h.prop.type === 'ducks') return feedDucks(); }
    const g = h.ground || WE.fromScreen(px - r.left, py - r.top);
    // a free place to sit or play right where you tapped (a picnic rug, the sandpit, a prayer row)
    let best = null, bd = 15; for (const ob of pl.objs){ if (ob.prop || ob.use.who === 'none' || ob.use.tag === 'teach' || ob.use.tag === 'door') continue; for (const s of ob.slots){ const d = Math.hypot(s.x - g[0], s.y - g[1]); if (d < bd && !s.by){ bd = d; best = [ob, s]; } } }
    if (best){ sfx('tap'); meTimer = null; S.useSlot(me, best[0], best[1], best[0].use.tag === 'pray' ? ['stand'] : null, 1e7); if (best[0].use.tag === 'pray' && S.prayer) me.praying = true; return; }
    const c = WE.freeNear(pl, g[0], g[1], occupied(pl), 0); if (!c) return;
    if (meGo(c)){ tapMark = { x: c[0], y: c[1], t: S.t }; }
  }
  // moving on through doors when walking to the prayer
  const _arr = () => { if (auto){ const f = auto; setTimeout(f, 350); } };
  const oldEnter = enter; enter = function (pl){ oldEnter(pl); _arr(); };
  window.HHWorld = { G, save, get me(){ return me; }, get PL(){ return PL; }, callPrayer: n => S.callPrayer(n || 'dhuhr'), use: id => useObj(PL[me.place].objs.find(o => o.id === id || o.type === id)), carry: k => k === undefined ? carry : setCarry(k), stats: () => Object.assign(WE.stats(), { people: S.people.filter(p => p.place === me.place).length }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
