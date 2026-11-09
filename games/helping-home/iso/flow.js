/* Helping Home: moving between the house and its stations, and remembering what was done today.
   A station URL can carry ?from=house&p=<prayer>&next=wudu,salah . When a station finishes it calls
   HHFlow.done('<station>', data): the day's log is saved, then the child goes on to the next station in `next`,
   or back to the house (which reads ?back=<station> to zoom out of the right corner).
   Pages live in games/helping-home/{index.html, jobs/*.html, pray/*.html}. */
(function () {
  'use strict';
  var ROOT = '/KidsGames/games/helping-home/';
  var PAGES = { house: 'index.html', washer: 'jobs/washing-machine.html', adhan: 'pray/adhan.html', wudu: 'pray/wudu.html', salah: 'pray/salah.html', settings: 'settings.html' };
  var q = new URLSearchParams(location.search);
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function read(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function url(station, params) {
    var p = new URLSearchParams(params || {});
    var s = p.toString(); return ROOT + (PAGES[station] || station) + (s ? '?' + s : '');
  }
  function log() { var l = read('hh.log', {}); return l[today()] || {}; }
  window.HHFlow = {
    ROOT: ROOT, PAGES: PAGES, q: q, today: today, read: read, write: write, url: url,
    fromHouse: q.get('from') === 'house',
    prayer: q.get('p') || '',
    log: log,
    /** record a finished station today: {station: [{t, ...data}]} */
    mark: function (station, data) {
      var l = read('hh.log', {}), d = today(), keep = {};
      Object.keys(l).sort().slice(-6).forEach(function (k) { keep[k] = l[k]; });   // keep a week
      var day = keep[d] || (keep[d] = {}); (day[station] = day[station] || []).push(Object.assign({ t: Date.now() }, data || {}));
      write('hh.log', keep);
    },
    /** finish a station: mark it, then go to the next station or back to the house */
    done: function (station, data) {
      HHFlow.mark(station, data);
      if (!HHFlow.fromHouse) return false;
      var next = (q.get('next') || '').split(',').filter(Boolean);
      if (next.length) { location.href = url(next[0], { from: 'house', p: HHFlow.prayer, next: next.slice(1).join(',') }); return true; }
      location.href = url('house', { back: station }); return true;
    },
    home: function () { location.href = url('house', { back: (location.pathname.split('/').pop() || '').replace('.html', '') }); },
  };
})();
