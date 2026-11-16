/* Helping Home: recorded voice clips (adhan phrases, responses, salah words, du'a).
   Clips live in games/helping-home/audio/ and are listed in audio/index.json as { "<id>": "<file>", ... }; the Boot
   scene loads that list with Phaser's loader (key 'hh-voice'). Each clip is fetched, decoded and played by Phaser's
   sound system through Kit.snd.voice (js/kit/sound.js): on the voice category, with effects and ambience ducked under
   it, muted with the game, and let go from memory when it has not been used for a while.
   A clip that is missing resolves after `fallbackMs` so a guide can still pace itself.
   API: HHVoice.play(id, {fallbackMs}) -> Promise (resolves when the clip ends or is stopped)
        HHVoice.has(id) -> Promise<bool>   HHVoice.preload([ids])   HHVoice.stop() */
(function () {
  'use strict';
  var BASE = '/KidsGames/games/helping-home/audio/';
  function list() { var g = window.Kit && Kit.play && Kit.play.game; return (g && g.cache.json.get('hh-voice')) || {}; }
  function url(id) { var f = list()[id]; return f ? BASE + f : null; }
  function wait(ms) { return Kit.snd ? Kit.snd.wait(ms) : Promise.resolve(); }
  window.HHVoice = {
    play: function (id, o) {
      o = o || {}; var u = url(id), fb = o.fallbackMs == null ? 1200 : o.fallbackMs;
      if (!u || !Kit.snd) return wait(fb);
      return Kit.snd.voice(u, { vol: o.vol }).then(function (heard) { return heard || Kit.snd.muted ? null : wait(0); });
    },
    stop: function () { if (window.Kit && Kit.snd) Kit.snd.stopVoice(); },
    preload: function (ids) { if (Kit.snd) Kit.snd.preload(ids.map(url).filter(Boolean)); },
    has: function (id) { return Promise.resolve(!!url(id)); }
  };
})();
