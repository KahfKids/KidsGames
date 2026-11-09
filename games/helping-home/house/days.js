/* Helping Home: the days. Pure logic, no drawing. Everything is deterministic from the date plus localStorage.
   window.HHDays:
     hijri(date) kind(date) events(date)            the calendar and today's cards
     surprise(date) weather(date[,lat])             the day's seeded surprise and weather
     plant(plot,seed) water(plot[,now]) weed(plot[,now]) weeds(plot[,now]) stage(plot[,now]) harvest(plot[,now]) garden()
     prayerGarden(nDays)                            a flower per prayer from the day log (nothing wilts)
     sinceLast([now]) touch([now])                  the warm welcome back
     award(choreId) stickers()/list()               sticker book, levels at 3 / 10 / 30
     dailyPlan(date)                                3-6 activities for today plus the prayers
   Storage: hh.days {hijriOffset, schoolDays:[1..5]}, hh.garden, hh.stickers, hh.lastSeen, hh.log (read only), hh.prayer (lat only).
   Never: punishment, dying plants, lost streaks, timers. */
(function () {
  'use strict';

  /* ================= TEACHER REVIEW: every religious string is in this block ================= */
  // TEACHER REVIEW
  var MONTHS = ['Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani", 'Jumada al-awwal', 'Jumada al-thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah'];
  var TAKBIR_TR = 'Allahu akbar, Allahu akbar, la ilaha illa Allah. Wallahu akbar, Allahu akbar, wa lillahil hamd.';
  var TAKBIR_AR = 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ، وَلِلَّهِ الْحَمْدُ';
  var CARDS = {
    // TEACHER REVIEW: Friday (Jumu'ah)
    ghusl:      { icon: 'shower',   title: 'Friday wash',        line: 'Friday is Jumu\'ah. A good wash makes us fresh.', jobs: ['ghusl'] },
    bestclothes:{ icon: 'shirt',    title: 'Best clothes',       line: 'Put on your best clothes for Jumu\'ah.', jobs: ['best-clothes'] },
    perfume:    { icon: 'perfume',  title: 'Sweet smell',        line: 'A little perfume, as the Prophet loved. (no alcohol)', jobs: ['perfume'] },
    kahf:       { icon: 'book',     title: 'Surah al-Kahf',      line: 'On Friday we read or listen to Surah al-Kahf.', jobs: ['read-kahf'] },
    jumuah:     { icon: 'mosque',   title: 'Jumu\'ah prayer',    line: 'Go to the mosque with Abu.', jobs: ['jumuah-mosque'] },
    // TEACHER REVIEW: Ramadan
    suhoor:     { icon: 'plate',    title: 'Suhoor',             line: 'Early meal before Fajr, to help us fast.', jobs: ['set-suhoor'] },
    iftar:      { icon: 'dates',    title: 'Iftar dates',        line: 'At Maghrib we break the fast with dates and water.', jobs: ['iftar-table', 'iftar-dates'] },
    lanterns:   { icon: 'lantern',  title: 'Lanterns',           line: 'Hang the Ramadan lanterns.', jobs: ['hang-lanterns'] },
    lastten:    { icon: 'moon',     title: 'The last ten nights', line: 'These nights are special. We make extra du\'a.', jobs: [] },
    // TEACHER REVIEW: Eid
    eiddeco:    { icon: 'bunting',  title: 'Eid decorations',    line: 'Hang the Eid lights and flags.', jobs: ['eid-decorations'] },
    eidgifts:   { icon: 'gift',     title: 'Eid gifts',          line: 'Wrap gifts for family and neighbours.', jobs: ['eid-gifts', 'share-neighbour'] },
    takbir:     { icon: 'voice',    title: 'Takbir',             line: TAKBIR_TR, ar: TAKBIR_AR, jobs: [] },
    eidclothes: { icon: 'shirt',    title: 'Eid clothes',        line: 'Put on your new clothes. Eid Mubarak!', jobs: ['best-clothes'] },
    // TEACHER REVIEW: other days
    arafah:     { icon: 'sun',      title: 'Day of Arafah',      line: 'A very special day. Many people fast and make du\'a.', jobs: [] },
    white:      { icon: 'moonfull', title: 'A white day',        line: 'The moon is bright. A day to fast, if we can.', jobs: [] },
    monthu:     { icon: 'plate',    title: 'Monday or Thursday', line: 'The Prophet liked to fast today. Big children can try.', jobs: [] },
    ashura:     { icon: 'moon',     title: 'Ashura',             line: 'A day of Muharram. Many people fast.', jobs: [] }
  };
  /* end TEACHER REVIEW */

  var SEEDS = {
    tomato:     { name: 'Tomato',     icon: 'tomato',     need: 4, meal: 'tomato salad' },
    carrot:     { name: 'Carrot',     icon: 'carrot',     need: 3, meal: 'carrot soup' },
    mint:       { name: 'Mint',       icon: 'mint',       need: 3, meal: 'mint tea' },
    sunflower:  { name: 'Sunflower',  icon: 'sunflower',  need: 5, meal: 'toasted seeds' },
    strawberry: { name: 'Strawberry', icon: 'strawberry', need: 4, meal: 'strawberry bowl' },
    pumpkin:    { name: 'Pumpkin',    icon: 'pumpkin',    need: 5, meal: 'pumpkin soup' }
  };
  var SEED_IDS = Object.keys(SEEDS);

  /* ---------- helpers ---------- */
  function read(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function noon(d) { d = d ? new Date(d) : new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
  function addDays(d, n) { var x = noon(d); x.setDate(x.getDate() + n); return x; }
  function key(d) { d = noon(d); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }   // same as HHFlow.today()
  function dayNum(d) { d = noon(d); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = typeof seed === 'number' ? seed >>> 0 : hash(seed); return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, r) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function settings() {
    var s = read('hh.days', null) || {};
    var sd = Array.isArray(s.schoolDays) ? s.schoolDays.filter(function (n) { return n >= 0 && n <= 6; }) : [1, 2, 3, 4, 5];
    var off = parseInt(s.hijriOffset, 10); if (!isFinite(off)) off = 0;
    return { hijriOffset: Math.max(-2, Math.min(2, off)), schoolDays: sd };
  }
  function saveSettings(s) { write('hh.days', { hijriOffset: s.hijriOffset, schoolDays: s.schoolDays }); }
  function savedLat() { var p = read('hh.prayer', null); return p && isFinite(parseFloat(p.lat)) ? parseFloat(p.lat) : null; }

  /* ================= calendar ================= */
  var fmtCache = {};
  function hijriFmt() {
    if (fmtCache.f !== undefined) return fmtCache.f;
    var f = null, cals = ['islamic-umalqura', 'islamic'];
    for (var i = 0; i < cals.length && !f; i++) {
      try {
        var t = new Intl.DateTimeFormat('en-u-ca-' + cals[i] + '-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
        if (/^\d+\/\d+\/\d+/.test(t.format(new Date(2026, 5, 1))) || t.formatToParts) f = t;
      } catch (e) {}
    }
    return (fmtCache.f = f);
  }
  function hijri(date) {
    var d = addDays(date, settings().hijriOffset), f = hijriFmt(), day, month, year;
    if (f) {
      f.formatToParts(d).forEach(function (p) { if (p.type === 'day') day = parseInt(p.value, 10); else if (p.type === 'month') month = parseInt(p.value, 10); else if (p.type === 'year' || p.type === 'relatedYear') year = parseInt(p.value, 10); });
    }
    if (!(day && month && year)) {   // arithmetic Kuwaiti-style fallback if Intl has no Islamic calendar
      var jd = dayNum(d) + 2440588, l = jd - 1948440 + 10632, n = Math.floor((l - 1) / 10631); l = l - 10631 * n + 354;
      var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
      l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
      month = Math.floor((24 * l) / 709); day = l - Math.floor((709 * month) / 24); year = 30 * n + j - 30;
    }
    return { day: day, month: month, monthName: MONTHS[month - 1], year: year };
  }
  function kind(date) {
    var d = noon(date), h = hijri(d), dow = d.getDay(), S = settings();
    var ramadan = h.month === 9, eidFitr = h.month === 10 && h.day <= 3, eidAdha = h.month === 12 && h.day >= 10 && h.day <= 13;
    var holiday = eidFitr || eidAdha;
    return {
      friday: dow === 5,
      schoolDay: S.schoolDays.indexOf(dow) >= 0 && !holiday,
      ramadan: ramadan, eidFitr: eidFitr, eidAdha: eidAdha,
      arafah: h.month === 12 && h.day === 9,
      whiteDay: h.day >= 13 && h.day <= 15 && h.month !== 12,   // not in Dhul Hijjah: 13 is a Tashreeq day (no fasting)
      sunnahFast: (dow === 1 || dow === 4) && !ramadan && !holiday,
      ashura: h.month === 1 && (h.day === 9 || h.day === 10),
      lastTenNights: ramadan && h.day >= 21,
      hijri: h
    };
  }
  function C(id, extra) { var c = CARDS[id], o = { id: id, icon: c.icon, title: c.title, line: c.line, jobs: c.jobs.slice() }; if (c.ar) o.ar = c.ar; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  /** today's cards (short child language). Religious lines are in CARDS above (TEACHER REVIEW). */
  function events(date) {
    var k = kind(date), out = [];
    if (k.friday) { out.push(C('ghusl'), C('bestclothes'), C('perfume'), C('kahf'), C('jumuah')); }
    if (k.ramadan) { out.push(C('suhoor'), C('iftar'), C('lanterns')); if (k.lastTenNights) out.push(C('lastten')); }
    if (k.eidFitr || k.eidAdha) { out.push(C('eidclothes'), C('eiddeco'), C('eidgifts'), C('takbir')); }
    if (k.arafah) out.push(C('arafah'));
    if (k.ashura) out.push(C('ashura'));
    if (k.whiteDay) out.push(C('white'));
    if (k.sunnahFast && !k.whiteDay) out.push(C('monthu'));
    return out;
  }

  /* ================= the surprise ================= */
  // effect fields the house can apply: food, mail, laundryInside, weather, bird, giveSeed ('?' = the day's seed pick), sock, rainbow, sprout, stars, wind, visitor, critter, book, glow
  var SURPRISES = [
    { id: 'neighbour-plate', icon: 'plate',     title: 'A plate from next door', line: 'A neighbour left a warm plate. Say thank you!', effect: { food: 'neighbour', job: 'thank-neighbour' } },
    { id: 'letter',          icon: 'letter',    title: 'A letter!',              line: 'The post came. A letter for you.',               effect: { mail: 'letter' } },
    { id: 'rain-day',        icon: 'rain',      title: 'Rain day',               line: 'It is raining. The washing comes inside.',       effect: { weather: 'rain', laundryInside: true } },
    { id: 'bird-feeder',     icon: 'bird',      title: 'A bird at the feeder',   line: 'A little bird came to eat.',                     effect: { bird: 'feeder' } },
    { id: 'seed-packet',     icon: 'seeds',     title: 'A seed packet',          line: 'A new seed packet! What will grow?',             effect: { giveSeed: '?' } },
    { id: 'lost-sock',       icon: 'sock',      title: 'The lost sock',          line: 'The lost sock is found under the sofa.',         effect: { sock: true, job: 'pair-socks' } },
    { id: 'rainbow',         icon: 'rainbow',   title: 'A rainbow',              line: 'Look up! A rainbow over the street.',            effect: { weather: 'sun', rainbow: true } },
    { id: 'first-sprout',    icon: 'sprout',    title: 'A tiny sprout',          line: 'Something green is peeking out.',                effect: { sprout: true } },
    { id: 'star-gift',       icon: 'star',      title: 'Two bonus stars',        line: 'Ummi left two stars on your pillow.',            effect: { stars: 2 } },
    { id: 'windy-day',       icon: 'wind',      title: 'A windy day',            line: 'The wind blows! Gather the pegs.',               effect: { wind: true, job: 'gather-pegs' } },
    { id: 'neighbour-wave',  icon: 'door',      title: 'A neighbour waves',      line: 'Our neighbour waves from the gate.',             effect: { visitor: 'neighbour' } },
    { id: 'postcard',        icon: 'letter',    title: 'A postcard',             line: 'A postcard from Jiddo and Teta.',                effect: { mail: 'postcard' } },
    { id: 'butterfly',       icon: 'butterfly', title: 'A butterfly',            line: 'A butterfly lands on the bed.',                  effect: { critter: 'butterfly' } },
    { id: 'shiny-button',    icon: 'button',    title: 'A shiny button',         line: 'The toddler found a shiny button.',              effect: { find: 'button', job: 'tidy-treasure' } },
    { id: 'cat-on-wall',     icon: 'cat',       title: 'A cat on the wall',      line: 'A cat sits on the garden wall.',                 effect: { critter: 'cat' } },
    { id: 'fresh-bread',     icon: 'bread',     title: 'Fresh bread',            line: 'Ummi baked bread. It smells so good.',           effect: { food: 'bread' } },
    { id: 'snail',           icon: 'snail',     title: 'A slow snail',           line: 'A snail left a shiny trail.',                    effect: { critter: 'snail' } },
    { id: 'library-book',    icon: 'book',      title: 'A new book',             line: 'A new book from the library.',                   effect: { book: true } },
    { id: 'puddles',         icon: 'puddle',    title: 'Splashy puddles',        line: 'Puddles! Take the boots outside.',               effect: { weather: 'rain', puddles: true } },
    { id: 'sparkly-dew',     icon: 'dew',       title: 'Sparkly morning',        line: 'The grass sparkles with dew.',                   effect: { glow: 'dew' } },
    { id: 'owl',             icon: 'owl',       title: 'An owl at dusk',         line: 'Listen. An owl hoots at dusk.',                  effect: { critter: 'owl' } },
    { id: 'phone-call',      icon: 'phone',     title: 'A phone call',           line: 'Jiddo calls to say hello.',                      effect: { visitor: 'call' } },
    { id: 'neighbour-fruit', icon: 'pear',      title: 'Fruit from next door',   line: 'Fruit from our neighbour\'s tree.',              effect: { food: 'fruit', job: 'thank-neighbour' } },
    { id: 'kite',            icon: 'kite',      title: 'A kite',                 line: 'A kite flies over the park.',                    effect: { wind: true, kite: true } },
    { id: 'moon-glow',       icon: 'moonfull',  title: 'A big bright moon',      line: 'The moon is big and bright tonight.',            effect: { glow: 'moon' } }
  ];
  var BLOCK = SURPRISES.length;
  function permFor(b) {
    var p = shuffle(SURPRISES.map(function (_, i) { return i; }), rng('surprise-' + b));
    if (b > 0) {   // no repeat across a block boundary
      var prevLast = shuffle(SURPRISES.map(function (_, i) { return i; }), rng('surprise-' + (b - 1)))[BLOCK - 1];
      if (p[0] === prevLast) { var t = p[0]; p[0] = p[1]; p[1] = t; }
    }
    return p;
  }
  function surprise(date) {
    var n = dayNum(date), b = Math.floor(n / BLOCK), i = n - b * BLOCK;
    var s = SURPRISES[permFor(b)[i]], o = { id: s.id, icon: s.icon, title: s.title, line: s.line, effect: Object.assign({}, s.effect) };
    if (o.effect.giveSeed === '?') o.effect.giveSeed = SEED_IDS[hash('seed-' + key(date)) % SEED_IDS.length];
    return o;
  }

  /* ================= weather ================= */
  function weatherBase(date, lat) {
    if (lat === undefined || lat === null) lat = savedLat();
    if (lat === null) lat = 30;
    var d = noon(date), m = d.getMonth(), r = rng('wx-' + key(d))(), south = lat < 0, a = Math.abs(lat);
    var mm = south ? (m + 6) % 12 : m;               // season month as if northern: 0 Jan ... 11 Dec
    var winter = [11, 0, 1].indexOf(mm) >= 0, shoulder = [10, 2].indexOf(mm) >= 0;
    var summer = [5, 6, 7].indexOf(mm) >= 0;
    var rain, cloud;
    if (a < 23.5) {                                   // tropics: wet season Jun-Sep (north) or Dec-Mar (south)
      var wet = south ? [11, 0, 1, 2].indexOf(m) >= 0 : [5, 6, 7, 8].indexOf(m) >= 0;
      rain = wet ? .45 : .12; cloud = .25;
      if (a > 20 && !wet) rain = .06;
    } else if (a < 40) {                              // warm temperate / subtropical
      rain = winter ? .26 : summer ? .08 : .17; cloud = winter ? .3 : .22;
    } else {                                          // cool temperate
      rain = winter ? .34 : summer ? .17 : .27; cloud = winter ? .38 : .3;
    }
    var snowOK = a >= 40 && (winter || (a >= 50 && shoulder));
    var w = r < rain ? 'rain' : r < rain + cloud ? 'cloud' : 'sun';
    if (w === 'rain' && snowOK && rng('sn-' + key(d))() < Math.min(.8, (a - 38) / 30) * (winter ? .6 : .3)) w = 'snow';
    return w;
  }
  function weather(date, lat) {
    var w = weatherBase(date, lat), e = surprise(date).effect;
    if (e.weather && w !== 'snow') w = e.weather;
    return w;
  }

  /* ================= the garden ================= */
  function G() { var g = read('hh.garden', null); if (!g || typeof g !== 'object') g = {}; g.plots = g.plots || {}; g.harvested = g.harvested || {}; return g; }
  function plantedBefore(p, k) { return p && p.wet ? p.wet.filter(function (w) { return dayNum(parseKey(w)) < dayNum(parseKey(k)); }).length : 0; }
  function parseKey(k) { var a = String(k).split('-'); return new Date(+a[0], +a[1] - 1, +a[2], 12); }
  function plant(plot, seed, now) {
    if (!SEEDS[seed]) return false; var g = G(); if (g.plots[plot] && g.plots[plot].seed) return false;
    g.plots[plot] = { seed: seed, planted: key(now || new Date()), wet: [], weedDay: null }; write('hh.garden', g); return true;
  }
  function water(plot, now) {
    var g = G(), p = g.plots[plot]; if (!p || !p.seed) return false;
    var k = key(now || new Date()); if (p.wet.indexOf(k) < 0) p.wet.push(k);
    write('hh.garden', g); return true;
  }
  /** a seeded weed patch on some plot-days; pulling it is a job, never a requirement: growth ignores weeds */
  function weeds(plot, now) {
    var g = G(), p = g.plots[plot]; if (!p || !p.seed) return false;
    var k = key(now || new Date());
    return p.planted !== k && p.weedDay !== k && rng('weed-' + plot + '-' + k)() < .4;
  }
  function weed(plot, now) {
    var g = G(), p = g.plots[plot]; if (!p || !p.seed) return false;
    p.weedDay = key(now || new Date()); write('hh.garden', g); return true;
  }
  /** 0 seed, 1 sprout, 2 growing, 3 ready. Each watered calendar day counts once, from the next morning. Dry days only pause; nothing dies. */
  function stage(plot, now) {
    var p = G().plots[plot]; if (!p || !p.seed) return -1;
    var need = SEEDS[p.seed].need, c = plantedBefore(p, key(now || new Date()));
    return c >= need ? 3 : c >= 2 ? 2 : c >= 1 ? 1 : 0;
  }
  function harvest(plot, now) {
    var g = G(), p = g.plots[plot]; if (!p || stage(plot, now) !== 3) return null;
    var S = SEEDS[p.seed], out = { seed: p.seed, name: S.name, icon: S.icon, meal: S.meal, jobs: ['cook-with-ummi:' + p.seed, 'share-neighbour:' + p.seed] };
    g.harvested[p.seed] = (g.harvested[p.seed] || 0) + 1; delete g.plots[plot]; write('hh.garden', g); return out;
  }

  /* ================= prayer garden ================= */
  var FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  /** per day (oldest first, last is today): {date, fajr..isha: 'fard'|'fard+sunnah'|null, tahajjud, witr}. A prayer with no log has no flower. */
  function prayerGarden(nDays) {
    nDays = Math.max(1, Math.min(7, nDays || 7));
    var L = read('hh.log', {}) || {}, out = [], now = new Date();
    for (var i = nDays - 1; i >= 0; i--) {
      var d = addDays(now, -i), k = key(d), entries = (L[k] && L[k].salah) || [], row = { date: k, tahajjud: false, witr: false };
      FIVE.forEach(function (p) { row[p] = null; });
      var seen = {};
      entries.forEach(function (e) {
        var p = String(e.p || e.prayer || '').toLowerCase(), kd = String(e.kind || '').toLowerCase(), sun = /sunnah|nafl|rawatib/.test(kd) || /sunnah/.test(p);
        p = p.replace(/[-_ ]?sunnah.*$/, '');
        if (p === 'tahajjud' || p === 'witr') { row[p] = true; return; }
        if (FIVE.indexOf(p) < 0) return;
        var s = seen[p] || (seen[p] = { fard: false, sunnah: false });
        if (sun) s.sunnah = true; else s.fard = true;
      });
      Object.keys(seen).forEach(function (p) { row[p] = seen[p].fard && seen[p].sunnah ? 'fard+sunnah' : 'fard'; });   // a sunnah alone still earns the flower
      out.push(row);
    }
    return out;
  }

  /* ================= since last visit ================= */
  function sinceLast(now) {
    now = now || new Date();
    var ls = read('hh.lastSeen', null), today = key(now);
    var res = { first: !ls, days: 0, sprouted: [], grown: [], ready: [], surprise: surprise(now), weather: weather(now), line: '' };
    var g = G();
    if (ls && ls.day) {
      res.days = Math.max(0, dayNum(now) - dayNum(parseKey(ls.day)));
      var then = parseKey(ls.day);
      Object.keys(g.plots).forEach(function (pl) {
        var a = stage(pl, then), b = stage(pl, now), seed = g.plots[pl].seed;
        if (b > a) { res.grown.push({ plot: pl, seed: seed, from: a, to: b }); if (a < 1 && b >= 1) res.sprouted.push({ plot: pl, seed: seed }); if (b === 3) res.ready.push({ plot: pl, seed: seed }); }
      });
    }
    res.line = res.first ? 'Welcome home! Take a look around.'
      : res.days === 0 ? 'Welcome back!'
      : res.days === 1 ? 'Welcome back! The house kept your seat.'
      : 'We saved your seat. Welcome back!';
    return res;
  }
  function touch(now) { now = now || new Date(); write('hh.lastSeen', { day: key(now), ts: now.getTime() }); }

  /* ================= stickers ================= */
  var LEVELS = [3, 10, 30];
  function lvl(n) { return n >= 30 ? 3 : n >= 10 ? 2 : n >= 3 ? 1 : 0; }
  function award(choreId) {
    var s = read('hh.stickers', {}) || {}, before = lvl(s[choreId] || 0);
    s[choreId] = (s[choreId] || 0) + 1; write('hh.stickers', s);
    var after = lvl(s[choreId]); api.lastAward = { id: choreId, count: s[choreId], level: after, up: after > before };
    return after;
  }
  function list() { var s = read('hh.stickers', {}) || {}; return Object.keys(s).sort().map(function (id) { var n = s[id], l = lvl(n); return { id: id, count: n, level: l, next: l >= 3 ? null : LEVELS[l] }; }); }

  /* ================= the daily pick ================= */
  var CHORES = [   // id, icon, when, flags: school (school days only), out (outdoors), rain (needs fair weather)
    ['make-bed', 'bed', 'morning'], ['pyjamas-away', 'pyjamas', 'morning'], ['pack-schoolbag', 'bag', 'morning', 'school'], ['set-breakfast', 'plate', 'morning'], ['open-curtains', 'curtain', 'morning'],
    ['clear-table', 'table', 'midday'], ['wipe-table', 'cloth', 'midday'], ['dishes-rack', 'dishes', 'midday'], ['water-indoor-plant', 'plant', 'midday'], ['feed-bird-feeder', 'bird', 'midday'],
    ['homework-desk', 'desk', 'afternoon', 'school'], ['toddler-toys', 'blocks', 'afternoon'], ['sweep-floor', 'broom', 'afternoon'], ['shoe-rack', 'shoes', 'afternoon'], ['dust-shelves', 'cloth', 'afternoon'],
    ['set-dinner', 'plate', 'evening'], ['bins-out', 'bin', 'evening', 'out'], ['hang-washing', 'peg', 'morning', 'out'], ['fold-washing', 'shirt', 'evening'], ['evening-tidy', 'tidy', 'evening'],
    ['wash-laundry', 'washer', 'morning'], ['bring-washing-in', 'peg', 'afternoon', 'out'], ['sort-recycling', 'bin', 'afternoon'], ['wipe-windows', 'cloth', 'midday'], ['water-garden', 'can', 'afternoon', 'out'],
    ['put-away-shopping', 'bag', 'afternoon'], ['tidy-my-room', 'bed', 'evening'], ['lay-prayer-mats', 'mat', 'evening'], ['refill-water-jug', 'jug', 'midday'], ['straighten-cushions', 'cushion', 'afternoon']
  ].map(function (a) { return { id: a[0], icon: a[1], pool: 'chores', when: a[2], school: a.indexOf('school') > 2, out: a.indexOf('out') > 2 }; });
  var PLAY = [
    ['hide-and-seek', 'hide', 0], ['blocks', 'blocks', 0], ['catch', 'ball', 1], ['sandcastles', 'sand', 1], ['push-swing', 'swing', 1],
    ['story-toddler', 'book', 0], ['draw-together', 'crayon', 0], ['paper-boats', 'boat', 0], ['kite-flying', 'kite', 1], ['build-den', 'den', 0]
  ].map(function (a) { return { id: a[0], icon: a[1], pool: 'play', out: !!a[2] }; });
  var NEIGHBOUR = [
    ['shop-trip', 'shop', 0], ['plate-for-neighbour', 'plate', 0], ['help-bags', 'bag', 0], ['water-neighbour-plant', 'can', 1], ['pick-up-parcel', 'parcel', 0],
    ['read-to-neighbour', 'book', 0], ['card-for-neighbour', 'letter', 0], ['return-borrowed-bowl', 'bowl', 0], ['hold-the-door', 'door', 0], ['walk-to-park', 'tree', 1],
    ['feed-ducks', 'duck', 1], ['sweep-neighbour-step', 'broom', 1], ['carry-groceries', 'bag', 0], ['bring-mail-in', 'letter', 0], ['mosque-visit', 'mosque', 0]
  ].map(function (a) { return { id: a[0], icon: a[1], pool: 'neighbourhood', out: !!a[2] }; });
  var WORSHIP = [
    ['morning-dua', 'sun'], ['evening-dua', 'moon'], ['bedtime-dua', 'bed'], ['listen-quran', 'book'], ['say-bismillah-table', 'plate'], ['salawat-moment', 'heart']
  ].map(function (a) { return { id: a[0], icon: a[1], pool: 'worship' }; });
  var GARDEN_ACTS = { plant: { id: 'garden-plant', icon: 'seeds', pool: 'garden', out: true }, care: { id: 'garden-water', icon: 'can', pool: 'garden', out: true }, weed: { id: 'garden-weed', icon: 'weed', pool: 'garden', out: true },
    harvest: { id: 'garden-harvest', icon: 'basket', pool: 'garden', out: true }, cook: { id: 'cook-with-ummi', icon: 'pot', pool: 'garden' }, share: { id: 'share-with-neighbour', icon: 'plate', pool: 'garden' } };
  var DAY_NAMES = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

  function dailyPlan(date) {
    var d = noon(date), K = kind(d), r = rng('plan-' + key(d)), wx = weather(d), fair = wx === 'sun' || wx === 'cloud';
    var g = G(), plots = Object.keys(g.plots).filter(function (p) { return g.plots[p].seed; });
    var ready = plots.filter(function (p) { return stage(p, d) === 3; }), growing = plots.filter(function (p) { return stage(p, d) < 3; });
    var picked = [], used = {};
    function add(it, extra) { if (!it || used[it.id]) return; used[it.id] = 1; picked.push(Object.assign({}, it, extra || {})); }
    var rainSwap = function (it) { return fair || !it.out; };
    var n = 3 + Math.floor(r() * 4);          // 3..6
    // must-haves of the day
    if (K.friday) add({ id: 'jumuah', icon: 'mosque', pool: 'neighbourhood' });
    if (K.ramadan) add({ id: 'iftar-table', icon: 'dates', pool: 'worship' });
    if (K.eidFitr || K.eidAdha) add({ id: 'eid-gifts', icon: 'gift', pool: 'neighbourhood' });
    if (ready.length) add(GARDEN_ACTS.harvest);
    else if (growing.length && fair) add(GARDEN_ACTS.care);
    else if (!plots.length && r() < .5) add(GARDEN_ACTS.plant);
    if (g.pendingMeal) add(GARDEN_ACTS.cook);
    // fill, rotating pools in a seeded order (chores come twice so a day is never only play)
    var order = shuffle(['chores', 'play', 'neighbourhood', 'worship', 'chores'], r), pools = { chores: CHORES, play: PLAY, neighbourhood: NEIGHBOUR, worship: WORSHIP };
    var queues = {}; Object.keys(pools).forEach(function (p) { queues[p] = shuffle(pools[p].filter(function (it) { return (!it.school || K.schoolDay) && rainSwap(it); }), r); });
    if (!fair) { var li = queues.chores.filter(function (c) { return c.id !== 'hang-washing' && c.id !== 'bring-washing-in'; }); queues.chores = li; }
    var guard = 0;
    while (picked.length < n && guard++ < 60) {
      var p = order[guard % order.length], q = queues[p]; while (q.length && used[q[0].id]) q.shift();
      if (q.length) add(q.shift());
    }
    if (!picked.some(function (it) { return it.pool === 'chores'; })) add(queues.chores[0]);
    picked = picked.slice(0, Math.max(n, 3));
    var when = { morning: 0, midday: 1, afternoon: 2, evening: 3 };
    picked.sort(function (a, b) { return (when[a.when] === undefined ? 2 : when[a.when]) - (when[b.when] === undefined ? 2 : when[b.when]); });
    return { date: key(d), weather: wx, activities: picked, prayers: FIVE.slice(), tahajjudAndWitr: true, cards: events(d).map(function (c) { return c.id; }), closing: closing(date) };
  }
  /** "the house is cosy, see you at Asr": the natural end of a session */
  function closing(now) {
    var nm = null;
    try { var nx = window.HHPrayer && HHPrayer.next(now && now.getTime ? now : new Date()); if (nx) nm = DAY_NAMES[nx.name]; } catch (e) {}
    if (!nm) { var h = (now && now.getHours ? now : new Date()).getHours(); nm = h < 5 ? 'Fajr' : h < 12 ? 'Dhuhr' : h < 15 ? 'Asr' : h < 18 ? 'Maghrib' : h < 21 ? 'Isha' : 'Fajr'; }
    return 'The house is cosy. See you at ' + nm + '.';
  }

  var api = {
    SEEDS: SEEDS, MONTHS: MONTHS, SURPRISES: SURPRISES, CHORES: CHORES, PLAY: PLAY, NEIGHBOUR: NEIGHBOUR, WORSHIP: WORSHIP, CARDS: CARDS,
    settings: settings, saveSettings: saveSettings,
    hijri: hijri, kind: kind, events: events,
    surprise: surprise, weather: weather,
    plant: plant, water: water, weed: weed, weeds: weeds, stage: stage, harvest: harvest, garden: G,
    prayerGarden: prayerGarden,
    sinceLast: sinceLast, touch: touch,
    award: award, list: list, stickers: list, lastAward: null,
    dailyPlan: dailyPlan, closing: closing
  };
  window.HHDays = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
