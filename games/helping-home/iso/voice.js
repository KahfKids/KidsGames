/* Helping Home: recorded voice clips (adhan phrases, responses, salah words, du'a).
   Clips live in games/helping-home/audio/ and are listed in audio/index.json as { "<id>": "<file>" , ... }.
   Plays through the kit's Web Audio context (fetch + decodeAudioData), never <audio>, so cached files play offline.
   A clip that is missing (not sourced yet) resolves after `fallbackMs` so a guide can still pace itself.
   API: HHVoice.play(id, {fallbackMs}) -> Promise (resolves when the clip ends or is stopped)
        HHVoice.has(id) -> Promise<bool>   HHVoice.preload([ids])   HHVoice.stop()   HHVoice.files() -> Promise<[urls]> */
(function () {
  'use strict';
  var BASE = '/KidsGames/games/helping-home/audio/', man = null, bufs = {}, cur = null;
  function manifest() { return man || (man = fetch(BASE + 'index.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })); }
  function lib() { return (window.Kit && Kit.sfx && (Kit.sfx.lib || Kit.sfx)) || {}; }
  function ctx() { return lib().ctx; }
  function load(id) {
    if (bufs[id]) return bufs[id];
    return (bufs[id] = manifest().then(function (m) {
      var c = ctx(); if (!m[id] || !c) return null;
      return fetch(BASE + m[id]).then(function (r) { return r.arrayBuffer(); })
        .then(function (a) { return new Promise(function (ok) { c.decodeAudioData(a, ok, function () { ok(null); }); }); });
    }).catch(function () { return null; }).then(function (b) { if (!b) delete bufs[id]; return b; }));
  }
  function stop() { if (cur) { try { cur.src.stop(); } catch (e) {} var d = cur.done; cur = null; d(); } }
  function play(id, o) {
    o = o || {}; stop();
    return load(id).then(function (b) {
      var c = ctx(), muted = window.Kit && Kit.sfx && Kit.sfx.muted;
      return new Promise(function (done) {
        if (!b || !c || muted) { var t = setTimeout(done, o.fallbackMs == null ? 1200 : o.fallbackMs); cur = { src: { stop: function () { clearTimeout(t); } }, done: done }; return; }
        var s = c.createBufferSource(), g = c.createGain(); g.gain.value = o.vol || 1;
        s.buffer = b; s.connect(g); g.connect(lib().out || c.destination);
        var me = { src: s, done: done }; cur = me;
        s.onended = function () { if (cur === me) { cur = null; done(); } };
        s.start();
      });
    });
  }
  window.HHVoice = {
    play: play, stop: stop, preload: function (ids) { ids.forEach(load); },
    has: function (id) { return manifest().then(function (m) { return !!m[id]; }); },
    files: function () { return manifest().then(function (m) { return Object.keys(m).map(function (k) { return BASE + m[k]; }); }); },
  };
})();
