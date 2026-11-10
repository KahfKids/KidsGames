/* Today's Five: data.js — one short mixed round a day.
   It has no questions of its own. It loads the banks of the quizzes this child opened most recently
   (or three starter quizzes on a first visit) and lets the engine pick five from them for the child's level.
   The other banks are fetched when the page runs, so the page shows a spinner until they arrive. */
(function () {
  'use strict';
  var KQ = window.KahfQuiz, ID = 'todays-five';
  var MAX = 6;                                             // newest few quizzes only: a small download for slow phones
  var STARTERS = ['stories-prophets', 'good-manners-duas', 'animals-world'];
  var cfg = KQ.define(ID, { bank: [] });
  if (typeof document === 'undefined' || !window.Kit) return;   // tools that only read the catalog stop here

  function sources() {
    var live = {}, opened = {};
    (KQ.catalog || []).forEach(function (c) { if (!c.daily) live[c.id] = 1; });
    try { opened = window.Kit.store('kahf-quiz').get('opened', {}) || {}; } catch (e) {}
    var ids = Object.keys(opened).filter(function (id) { return live[id]; })
      .sort(function (a, b) { return opened[b] - opened[a]; }).slice(0, MAX);
    STARTERS.forEach(function (id) { if (ids.length < 3 && ids.indexOf(id) < 0) ids.push(id); });
    return ids;
  }
  function load(id, done) {
    var s = document.createElement('script');
    s.src = '/KidsGames/games/' + id + '/data.js';
    s.onload = s.onerror = function () { done(); };
    document.body.appendChild(s);
  }

  var realRun = KQ.run;
  KQ.run = function (id) {
    if (id !== ID) return realRun(id);
    var ids = sources(), left = ids.length;
    var wait = document.createElement('div');
    wait.className = 'qz-load'; wait.innerHTML = '<div class="qz-spin"></div>';
    document.body.appendChild(wait);
    function ready() {
      var bank = [], gens = [];
      ids.forEach(function (q) {
        var d = KQ.defs[q];
        if (!d) return;                                    // that file did not arrive: carry on with the rest
        if (d.bank) bank = bank.concat(d.bank);
        if (d.gen) gens.push(d.gen);
      });
      KQ.last = cfg;
      if (!bank.length && !gens.length) {                  // nothing arrived at all (offline with no copy saved)
        var bn = /^bn/i.test(navigator.language || '');
        wait.innerHTML = '<p>' + (bn ? 'লোড হয়নি। ইন্টারনেট সংযোগ দেখো।' : 'Could not load. Please check the internet.') + '</p><button class="kit-btn primary">' + (bn ? 'আবার চেষ্টা করো' : 'Try again') + '</button>';
        wait.querySelector('button').onclick = function () { location.reload(); };
        return;
      }
      cfg.bank = bank;
      if (gens.length) {
        cfg.genShare = bank.length ? 0.2 : 1;              // one made-up sum in five, the rest written questions
        cfg.gen = function (band, n, o) {
          var out = [];
          for (var i = 0; i < n; i++) out = out.concat(gens[Math.floor(Math.random() * gens.length)](band, 1, o) || []);
          return out;
        };
      }
      wait.remove();
      realRun(ID);
    }
    if (!left) return ready();
    ids.forEach(function (q) { load(q, function () { if (--left === 0) ready(); }); });
  };
})();
