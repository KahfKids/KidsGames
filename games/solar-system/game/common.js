/* Solar System: common.js
   Saved progress and the device's voice, shared by the scenes.
   Saved progress is the old game's, key and shape unchanged (Kit.store / Kit.progress in js/kit/core.js):
   'kahf-solar-system' = { stars: { level: 1..3 }, current: level to continue, found: true after the first right answer,
   explored: true after the first planet visited }.
   Voice: the old page read questions and facts aloud with the device's own voice (no recording of them exists), and said
   "SubhanAllah" or "MashaAllah" after a level in a recorded Arabic clip. Both are kept: the voice is the device's
   speechSynthesis, silent where there is none; the praise is the kit's recorded clip played as a voice through Kit.snd
   (so effects duck under it). Off in ?debug. */
(function () {
  'use strict';
  var store = Kit.store('kahf-solar-system'), progress = Kit.progress(store, 15), DEBUG = /[?&]debug\b/.test(location.search);
  var NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox/i, picked;
  function voices() { try { return window.speechSynthesis ? speechSynthesis.getVoices() || [] : []; } catch (e) { return []; } }
  function best() {
    if (picked !== undefined) return picked;
    var vs = voices().filter(function (v) { return /^en/i.test(v.lang) && !NOVELTY.test(v.name); });
    vs.sort(function (a, b) { return (b.localService ? 2 : 0) + (/premium|enhanced|natural|neural|siri|google/i.test(b.name) ? 3 : 0) - (a.localService ? 2 : 0) - (/premium|enhanced|natural|neural|siri|google/i.test(a.name) ? 3 : 0); });
    return (picked = vs[0] || (voices().length ? false : undefined));
  }
  try { if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', function () { picked = undefined; if (V.onchange) V.onchange(); }); } catch (e) { /* none */ }
  var praiseUrl = {};
  var V = window.SolarVoice = {
    has: function () { return !DEBUG && !!best(); },
    say: function (text) {
      try {
        if (DEBUG || !window.speechSynthesis || Kit.snd.muted || document.hidden) return;
        var v = best(); speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text); if (v) u.voice = v; u.lang = v ? v.lang : 'en-US'; u.rate = 0.95; speechSynthesis.speak(u);
      } catch (e) { /* no voice */ }
    },
    hush: function () { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* none */ } },
    praise: function (key) {
      if (DEBUG) return;
      var go = function () {
        var c = Kit.praiseClips; if (!c || !c[key]) return;
        if (!praiseUrl[key]) { var bin = atob(c[key]), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); praiseUrl[key] = URL.createObjectURL(new Blob([b], { type: 'audio/mpeg' })); }
        Kit.snd.voice(praiseUrl[key], { vol: 0.9 });
      };
      if (Kit.praiseClips) { go(); return; }
      var s = document.createElement('script'); s.src = '/KidsGames/js/kit/praise-clips.js'; s.onload = go; document.head.appendChild(s);
    }
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) V.hush(); });
  window.SolarSave = { store: store, progress: progress, DEBUG: DEBUG, cap: function (s) { return s.charAt(0).toUpperCase() + s.slice(1); } };
})();
