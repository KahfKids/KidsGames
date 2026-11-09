/* Helping Home: today's prayer chart (window.HHChart). A small, pure DOM render the house can embed.
   One row per prayer time (Fajr, Dhuhr, Asr, Maghrib, Isha, then Tahajjud), and in each row one button per unit
   (sunnah, fard, sunnah, witr…) holding a bead for every rak'ah: fard gold, sunnah green, witr indigo; optional units
   are faded. A unit's beads fill in when it was prayed today (from HHFlow.log()). Worship is never scored: no
   percentages, no "missed", no red. A prayer not prayed yet is simply plain. The current prayer is highlighted.
   The units and their words come from pray/prayer-text.js (PRAYER_TEXT.units / KINDS, TEACHER REVIEW): load it first.

   HHChart.render(el, opts) -> el      writes the chart into el (adds one small <style> to the page once)
     opts.madhab   'hanafi' | 'shafi'   (default: HHPrayer.settings().madhab, else 'shafi')
     opts.log      a day log { salah: [{ p, kind, rakah, u }] }   (default: HHFlow.log())
     opts.now      Date (default now)          opts.times   HHPrayer.times(now) (default: computed when HHPrayer exists)
     opts.prayers  which rows (default the five + 'tahajjud')
     opts.only     one prayer's units, no row head (used on the salah page to pick a unit)
     opts.selected { p, u } ringed          opts.friday  true/false (default: today is Friday) shows the Jumu'ah card
     opts.legend   false to hide the key    opts.from    added to the salah link as &from=
     opts.onTap(p, u, unit)  instead of opening pray/salah.html?p=&u=
   HHChart.units(madhab, p)  HHChart.prayed(log, p, u, unit) -> rak'ah prayed (0 when not)  HHChart.madhab() */
(function () {
  'use strict';
  var FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], ROWS = FIVE.concat(['tahajjud']);
  var NAMES = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', tahajjud: 'Tahajjud' };
  var COL = { fard: '#e9a917', sunnah: '#4f9a62', witr: '#4b4f9e', nafl: '#4f9a62' };
  var INK = '#231e16', UI = 'ui-rounded,"SF Pro Rounded","Nunito",system-ui,sans-serif';
  var ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    stars: '<path d="M17 14.5A6.5 6.5 0 0 1 8.5 6a6.5 6.5 0 1 0 8.5 8.5z"/><path d="M18 3.5v3M16.5 5h3M20.5 9v2M19.5 10h2"/>',
    dawn: '<path d="M3 17h18"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M12 7v2.2M5.5 10.5l1.5 1.5M18.5 10.5 17 12"/><path d="M6 20.5h12"/>',
    dusk: '<path d="M3 17h18"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M6 20.5h12"/><path d="M12 6.5v3M10.5 8 12 9.5 13.5 8"/>',
    minaret: '<path d="M12 2.5v2"/><path d="M9.5 9 12 4.5 14.5 9z"/><path d="M9.5 9h5v5h-5z"/><path d="M8 14h8"/><path d="M10 14v7.5h4V14"/><path d="M7 21.5h10"/>',
  };
  var PICON = { fajr: 'dawn', dhuhr: 'sun', asr: 'sun', maghrib: 'dusk', isha: 'moon', tahajjud: 'stars' };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="' + INK + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CSS = '' +
    '.hhc{--hhc-ink:' + INK + ';font-family:'+UI+';color:var(--hhc-ink);display:flex;flex-direction:column;gap:6px}' +
    '.hhc-row{display:flex;flex-direction:column;gap:7px;padding:8px 10px 10px;border-radius:18px;border:2px dashed transparent}' +
    '.hhc-row.now{background:#fbe6a6;border:2.5px solid var(--hhc-ink);box-shadow:0 3px 0 var(--hhc-ink)}.hhc-row.next{border-color:rgba(35,30,22,.35)}' +
    '.hhc-name{display:flex;align-items:center;gap:7px;min-width:0}.hhc-name b{font:800 17px/1.1 '+UI+'}' +
    '.hhc-name svg{width:21px;height:21px;flex:none}.hhc-time{font:700 14px/1.1 '+UI+';opacity:.72;font-variant-numeric:tabular-nums}' +
    '.hhc-tag{margin-left:auto;font:800 11.5px/1 '+UI+';letter-spacing:.04em;padding:4px 9px;border-radius:999px;border:1.5px solid var(--hhc-ink);background:#fffaf0}' +
    '.hhc-saw{font-size:1.4em;line-height:0;vertical-align:-.12em}' +
    '.hhc-units{display:flex;flex-wrap:wrap;gap:6px;min-width:0}' +
    '.hhc-u{all:unset;box-sizing:border-box;min-height:52px;min-width:48px;padding:7px 8px 6px;border-radius:14px;border:2px solid var(--hhc-ink);background:#fffaf0;box-shadow:0 2.5px 0 var(--hhc-ink);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative}' +
    '.hhc-u:active{transform:translateY(2px);box-shadow:0 .5px 0 var(--hhc-ink)}' +
    '.hhc-u.opt{border-style:dashed;box-shadow:none;background:transparent}.hhc-u.opt .hhc-b,.hhc-u.opt .hhc-l{opacity:.55}.hhc-u.opt.done .hhc-b,.hhc-u.opt.done .hhc-l{opacity:1}' +
    '.hhc-u.sel{outline:3.5px solid #f4b829;outline-offset:2px}' +
    '.hhc-b{display:flex;gap:3px;align-items:center}.hhc-b i{width:14px;height:14px;border-radius:50%;box-sizing:border-box;border:2.2px solid var(--k);background:#fff}' +
    '.hhc-b i.on{background:var(--k);border:1.6px solid var(--hhc-ink)}.hhc-b i.gap{margin-left:5px}' +
    '.hhc-l{font:800 11px/1 '+UI+';letter-spacing:.02em;white-space:nowrap}' +
    '.hhc-u.done::after{content:"";position:absolute;right:-5px;top:-6px;width:16px;height:16px;border-radius:50%;background:var(--k) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M5 12.5 10 17.5 19 7%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%273.4%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") center/12px no-repeat;border:1.6px solid var(--hhc-ink)}' +
    '.hhc-jum{display:flex;gap:10px;align-items:center;margin:0 4px;padding:9px 12px;border-radius:16px;border:2px dashed var(--hhc-ink);background:#fffaf0;font:600 13.5px/1.35 '+UI+'}' +
    '.hhc-jum svg{width:26px;height:26px;flex:none}.hhc-jum b{font-weight:800}' +
    '.hhc-key{display:flex;flex-wrap:wrap;gap:6px 12px;padding:4px 6px 2px;font:700 12.5px/1.25 '+UI+'}' +
    '.hhc-key span{display:flex;align-items:center;gap:6px}.hhc-key i{width:13px;height:13px;border-radius:50%;flex:none;background:var(--k);border:1.6px solid var(--hhc-ink);box-sizing:border-box}' +
    '.hhc-key i.opt{background:#fff;border:2.2px dashed var(--k);opacity:.75}' +
    '.hhc.only .hhc-units{justify-content:center}';
  function style() {
    if (document.getElementById('hhc-css')) return;
    var s = document.createElement('style'); s.id = 'hhc-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function T() { return window.PRAYER_TEXT; }
  function madhab() { try { var s = window.HHPrayer && HHPrayer.settings(); if (s && s.madhab) return s.madhab; } catch (e) {} return 'shafi'; }
  function units(m, p) { return T() && T().units ? T().units(m, p) : []; }
  function kindOf(e) { return e.kind || 'fard'; }   // older log entries were {p} for the fard
  /** how many rak'ah of this unit were prayed today (0 = not yet). Witr counts once a night, from Isha or Tahajjud. */
  function prayed(log, p, u, unit) {
    var L = (log && log.salah) || [], hit = null;
    for (var i = L.length - 1; i >= 0 && !hit; i--) {
      var e = L[i], k = kindOf(e);
      if (unit.kind === 'witr') { if (k === 'witr') hit = e; }
      else if ((e.p || e.prayer) === p && k === unit.kind && (e.u == null || e.u === u || unit.kind === 'fard')) hit = e;
    }
    return hit ? (+hit.rakah || unit.rakah) : 0;
  }
  function pairs(log) { return ((log && log.salah) || []).filter(function (e) { return e.p === 'tahajjud' && kindOf(e) === 'sunnah'; }).length; }

  function current(now, times) {
    var c = null;
    try {
      if (window.HHPrayer) {
        var y = HHPrayer.times(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12)), t = times || HHPrayer.times(now);
        if (t && ((y && now >= y.tahajjud && now < t.fajr) || (now >= t.tahajjud && now < t.nextFajr))) return { now: 'tahajjud' };
        var cur = HHPrayer.current(now); if (cur) return { now: cur.name };
        var nx = HHPrayer.next(now); if (nx) c = { next: nx.name };
      }
    } catch (e) {}
    return c || {};
  }

  function beadsHTML(unit, filled) {
    var n = filled && unit.choose ? filled : unit.rakah, cut = [], acc = 0, h = '';
    (filled && unit.choose && filled === 1 ? [1] : unit.parts || [n]).forEach(function (k) { acc += k; cut.push(acc); });
    for (var i = 0; i < n; i++) h += '<i class="' + (filled ? 'on' : '') + (i && cut.indexOf(i) >= 0 ? ' gap' : '') + '"></i>';
    return '<span class="hhc-b">' + h + '</span>';
  }
  function unitHTML(p, u, unit, filled, sel, label) {
    var K = (T() && T().KINDS[unit.kind]) || { name: unit.kind, say: '' };
    var aria = unit.rakah + ' rak’ah ' + K.name + ' of ' + NAMES[p] + (filled ? ', prayed' : '') + (unit.optional ? ', if you like' : '');
    return '<button type="button" class="hhc-u' + (unit.optional ? ' opt' : '') + (filled ? ' done' : '') + (sel ? ' sel' : '') + '" style="--k:' + COL[unit.kind] + '"' +
      ' data-p="' + p + '" data-u="' + u + '" aria-label="' + esc(aria) + '">' + beadsHTML(unit, filled) + '<span class="hhc-l">' + esc(label || K.name) + '</span></button>';
  }
  function unitsHTML(p, list, log, sel) {
    var h = '';
    list.forEach(function (unit, u) {
      var isSel = sel && sel.p === p && sel.u === u;
      if (unit.repeat) {   // tahajjud: every pair prayed, then one more to start
        var n = pairs(log);
        for (var k = 0; k < n; k++) h += unitHTML(p, u, unit, 2, false);
        h += unitHTML(p, u, unit, 0, isSel, n ? '2 more' : '');
      } else h += unitHTML(p, u, unit, prayed(log, p, u, unit), isSel);
    });
    return h;
  }

  function render(el, o) {
    o = o || {}; style();
    var m = o.madhab || madhab(), now = o.now || new Date(), log = o.log || (window.HHFlow ? HHFlow.log() : {}), times = o.times;
    if (times === undefined) try { times = window.HHPrayer ? HHPrayer.times(now) : null; } catch (e) { times = null; }
    var h = '';
    if (o.only) {
      h = '<div class="hhc only"><div class="hhc-units">' + unitsHTML(o.only, units(m, o.only), log, o.selected) + '</div></div>';
    } else {
      var cur = o.current ? { now: o.current } : current(now, times), fri = o.friday != null ? o.friday : now.getDay() === 5;
      h = '<div class="hhc">';
      (o.prayers || ROWS).forEach(function (p) {
        var t = times && times[p], when = t ? (window.HHPrayer && HHPrayer.fmt ? HHPrayer.fmt(t) : t.getHours() + ':' + ('0' + t.getMinutes()).slice(-2)) : '';
        var isNow = cur.now === p, isNext = !isNow && cur.next === p;
        h += '<div class="hhc-row' + (isNow ? ' now' : isNext ? ' next' : '') + '" data-row="' + p + '">' +
          '<div class="hhc-name">' + icon(PICON[p]) + '<b>' + NAMES[p] + '</b>' + (when ? '<span class="hhc-time">' + (p === 'tahajjud' ? 'from ' : '') + when + '</span>' : '') +
          (isNow ? '<span class="hhc-tag">Now</span>' : isNext ? '<span class="hhc-tag">Next</span>' : '') + '</div>' +
          '<div class="hhc-units">' + unitsHTML(p, units(m, p), log, o.selected) + '</div></div>';
        if (p === 'dhuhr' && fri && T() && T().JUMUAH) h += '<div class="hhc-jum">' + icon('minaret') + '<div><b>Today is ' + esc(T().JUMUAH.title) + '.</b> ' + esc(T().JUMUAH.text) + '</div></div>';
      });
      if (o.legend !== false && T()) {
        var K = T().KINDS;
        h += '<div class="hhc-key">' +
          '<span><i style="--k:' + COL.fard + '"></i><b>' + K.fard.name + ':</b> ' + esc(K.fard.say) + '</span>' +
          '<span><i style="--k:' + COL.sunnah + '"></i><b>' + K.sunnah.name + ':</b> ' + esc(K.sunnah.say).replace('ﷺ', '<span class="hhc-saw">ﷺ</span>') + '</span>' +
          '<span><i style="--k:' + COL.witr + '"></i><b>' + K.witr.name + ':</b> ' + esc(K.witr.say) + '</span>' +
          '<span><i class="opt" style="--k:' + COL.nafl + '"></i><b>Faded:</b> ' + esc(K.nafl.say.charAt(0).toLowerCase() + K.nafl.say.slice(1)) + '</span></div>';
      }
      h += '</div>';
    }
    el.innerHTML = h;
    el._hhc = { o: o, m: m };
    if (!el._hhcTap) {
      el._hhcTap = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.hhc-u'); if (!b || !el.contains(b)) return;
        var c = el._hhc, p = b.dataset.p, u = +b.dataset.u, unit = units(c.m, p)[u];
        if (c.o.onTap) return c.o.onTap(p, u, unit);
        location.href = '/KidsGames/games/helping-home/pray/salah.html?p=' + p + '&u=' + u + (c.o.from ? '&from=' + encodeURIComponent(c.o.from) : '');
      });
    }
    return el;
  }

  window.HHChart = { render: render, units: units, prayed: prayed, pairs: pairs, madhab: madhab, COL: COL, NAMES: NAMES };
})();
