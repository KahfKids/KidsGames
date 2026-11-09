/* Helping Home: on-device prayer times (adhan-js, MIT, vendored in vendor/adhan.js). No network.
   Needs vendor/adhan.js loaded first (global `adhan`). Times are computed for the device's local calendar day, so a
   city that is not the device's own timezone will show shifted clock times: the app is for the child's own place.
   API: HHPrayer.settings() save(s) times(date[,override]) current(now) next(now) qibla() methodFor(cc) RAKAH NAMES METHODS */
(function () {
  'use strict';
  var KEY = 'hh.prayer';
  var METHODS = {   // key -> [label, adhan factory name]
    MWL: ['Muslim World League', 'MuslimWorldLeague'],
    ISNA: ['ISNA (North America)', 'NorthAmerica'],
    Egyptian: ['Egyptian General Authority', 'Egyptian'],
    UmmAlQura: ['Umm al-Qura (Makkah)', 'UmmAlQura'],
    Karachi: ['Karachi (Univ. of Islamic Sciences)', 'Karachi'],
    Dubai: ['Dubai (UAE)', 'Dubai'],
    Kuwait: ['Kuwait', 'Kuwait'],
    Qatar: ['Qatar', 'Qatar'],
    Singapore: ['Singapore / Malaysia / Indonesia', 'Singapore'],
    Turkey: ['Diyanet (Turkey)', 'Turkey'],
    Tehran: ['Tehran (Univ. of Tehran)', 'Tehran'],
    Moonsighting: ['Moonsighting Committee', 'MoonsightingCommittee']
  };
  var BY_COUNTRY = {
    SA: 'UmmAlQura', YE: 'UmmAlQura', US: 'ISNA', CA: 'ISNA', MX: 'ISNA',
    EG: 'Egyptian', SD: 'Egyptian', SY: 'Egyptian', LB: 'Egyptian', JO: 'Egyptian', PS: 'Egyptian', IQ: 'Egyptian', LY: 'Egyptian', DZ: 'Egyptian', TN: 'Egyptian', MA: 'Egyptian',
    PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', LK: 'Karachi', NP: 'Karachi',
    AE: 'Dubai', OM: 'Dubai', BH: 'Qatar', QA: 'Qatar', KW: 'Kuwait',
    SG: 'Singapore', MY: 'Singapore', ID: 'Singapore', BN: 'Singapore', TH: 'Singapore',
    TR: 'Turkey', AZ: 'Turkey', IR: 'Tehran', GB: 'Moonsighting', IE: 'Moonsighting'
  };
  var HANAFI = { PK: 1, IN: 1, BD: 1, AF: 1, TR: 1 };
  var NAMES = {
    fajr: { en: 'Fajr', ar: 'الفجر' }, sunrise: { en: 'Sunrise', ar: 'الشروق' }, dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
    asr: { en: 'Asr', ar: 'العصر' }, maghrib: { en: 'Maghrib', ar: 'المغرب' }, isha: { en: 'Isha', ar: 'العشاء' },
    midnight: { en: 'Midnight', ar: 'منتصف الليل' }, tahajjud: { en: 'Last third of the night', ar: 'الثلث الأخير' }
  };
  var RAKAH = { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 };
  var FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var KAABA = [21.4225, 39.8262];

  function methodFor(cc) { return BY_COUNTRY[String(cc || '').toUpperCase()] || 'MWL'; }
  function madhabFor(cc) { return HANAFI[String(cc || '').toUpperCase()] ? 'hanafi' : 'shafi'; }
  function num(v) { v = parseFloat(v); return isFinite(v) ? v : null; }

  function stored() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function fromUrl() {
    try {
      var q = new URLSearchParams(location.search), la = num(q.get('lat')), ln = num(q.get('lng'));
      if (la === null || ln === null || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
      return { lat: la, lng: ln };
    } catch (e) { return null; }
  }
  var cache = null;
  function nearest(lat, lng) {   // nearest listed city within ~150 km, to guess country/method for a bare lat/lng
    var C = window.HH_CITIES, best = null, bd = 1e9;
    if (!C) return null;
    for (var i = 0; i < C.length; i++) {
      var dy = C[i][2] - lat, dx = (C[i][3] - lng) * Math.cos(lat * Math.PI / 180), d = dy * dy + dx * dx;
      if (d < bd) { bd = d; best = C[i]; }
    }
    return best && Math.sqrt(bd) * 111 < 150 ? best : null;
  }
  // No place chosen and none passed by the app: guess the city from the device's time zone ("Asia/Dhaka" → Dhaka),
  // so a child's first day already has real times. Not saved, and marked `guessed` so settings can ask a grown-up.
  var ZONE_ALIAS = { calcutta: 'kolkata', kolkata: 'kolkata', saigon: 'ho chi minh city', rangoon: 'yangon', katmandu: 'kathmandu' };
  function fromZone() {
    var C = window.HH_CITIES, tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    if (!C || tz.indexOf('/') < 0) return null;
    var name = tz.split('/').pop().replace(/_/g, ' ').toLowerCase(); name = ZONE_ALIAS[name] || name;
    for (var i = 0; i < C.length; i++) {
      if (String(C[i][0]).toLowerCase() === name) {
        var cc = C[i][1];
        return { lat: C[i][2], lng: C[i][3], city: C[i][0], country: cc, method: methodFor(cc), madhab: madhabFor(cc), guessed: true };
      }
    }
    return null;
  }
  function settings() {
    if (cache) return cache;
    var s = stored(), u = fromUrl();
    // A place a grown-up chose on the settings page (manual) wins; otherwise the coordinates the Kahf app passes win.
    if (u && !(s && s.manual)) {
      var same = s && Math.abs(s.lat - u.lat) < 0.2 && Math.abs(s.lng - u.lng) < 0.2;
      if (!same) {
        var n = nearest(u.lat, u.lng), cc = n ? n[1] : '';
        s = { lat: u.lat, lng: u.lng, city: n ? n[0] : '', country: cc, method: methodFor(cc), madhab: madhabFor(cc) };
      } else { s.lat = u.lat; s.lng = u.lng; }
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    }
    if (!s || num(s.lat) === null || num(s.lng) === null) s = fromZone();
    if (!s) return null;
    s.method = METHODS[s.method] ? s.method : methodFor(s.country);
    s.madhab = s.madhab === 'hanafi' ? 'hanafi' : 'shafi';
    return (cache = s);
  }
  function save(s) {
    s = Object.assign({}, s);
    s.lat = num(s.lat); s.lng = num(s.lng);
    if (!METHODS[s.method]) s.method = methodFor(s.country);
    if (s.madhab !== 'hanafi') s.madhab = 'shafi';
    cache = null;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return settings();
  }

  function params(s) {
    var p = adhan.CalculationMethod[METHODS[s.method][1]]();
    p.madhab = s.madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
    return p;
  }
  function times(date, override) {   // `override` previews other settings without saving (settings page)
    var s = override || settings(); if (!s) return null;
    date = date || new Date();
    var c = new adhan.Coordinates(s.lat, s.lng), pt = new adhan.PrayerTimes(c, date, params(s)), sn = new adhan.SunnahTimes(pt);
    return {
      fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha,
      midnight: sn.middleOfTheNight, tahajjud: sn.lastThirdOfTheNight, nextFajr: nextFajr(c, date, s)
    };
  }
  function nextFajr(c, date, s) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12);
    return new adhan.PrayerTimes(c, d, params(s)).fajr;
  }
  function endOf(name, t) {
    return { fajr: t.sunrise, dhuhr: t.asr, asr: t.maghrib, maghrib: t.isha, isha: t.midnight }[name];
  }
  /** the prayer whose window contains `now` (Isha runs to midnight, which may be after 00:00 of the next day), else null */
  function current(now) {
    now = now || new Date();
    var t = times(now); if (!t) return null;
    var y = times(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12));
    if (y && now >= y.isha && now < y.midnight) return { name: 'isha', start: y.isha, end: y.midnight };
    for (var i = 0; i < 5; i++) {
      var n = FIVE[i], a = t[n], b = endOf(n, t);
      if (now >= a && now < b) return { name: n, start: a, end: b };
    }
    return null;
  }
  function next(now) {
    now = now || new Date();
    var t = times(now); if (!t) return null;
    for (var i = 0; i < 5; i++) if (now < t[FIVE[i]]) return { name: FIVE[i], at: t[FIVE[i]] };
    return { name: 'fajr', at: t.nextFajr };
  }
  /** bearing to the Kaaba in degrees clockwise from true north */
  function qibla(lat, lng) {
    var s = (lat === undefined) ? settings() : { lat: lat, lng: lng };
    if (!s) return null;
    return adhan.Qibla(new adhan.Coordinates(s.lat, s.lng));
  }
  function fmt(d) { return d ? d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) : ''; }

  window.HHPrayer = {
    settings: settings, save: save, times: times, current: current, next: next, qibla: qibla,
    methodFor: methodFor, madhabFor: madhabFor, fmt: fmt,
    RAKAH: RAKAH, NAMES: NAMES, METHODS: METHODS, FIVE: FIVE, KAABA: KAABA
  };
})();
