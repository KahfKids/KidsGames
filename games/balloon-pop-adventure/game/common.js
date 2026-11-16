/* Balloon Pop: common.js
   What the scenes share: saved progress, the screen fitting, a few helpers.
   Saved progress (unchanged from the old game): localStorage key 'kahf-balloon-pop' (Kit.store), one JSON object
     { current: level to continue, stars: { "<level>": best stars 1..3 }, popped: true once the child has popped a balloon,
       stormHint: true once the storm-cloud tip was shown }
   and level n + 1 opens when level n has a star (Kit.progress, js/kit/core.js, as before). */
(function () {
  'use strict';
  var Bp = window.Bp = {};
  Bp.FONT = 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif';
  Bp.GAP = 36;                                     // the space between neighbouring things, design units
  Bp.store = Kit.store('kahf-balloon-pop');
  Bp.progress = Kit.progress(Bp.store, window.BpData.count);

  // The play field is shown at the old game's scale: it drew one of its units at min(width, height) / 430 screen points
  // (0.8 to 1.6), and one old unit is 2.4 design units (BpArt.U), so the camera shows 2.4 * width / that scale units across.
  // A phone upright shows about 1030 units across, on its side about 2230, a tablet 1540, a desktop window 2160: balloons
  // come out the same size on the screen as in the old game. The kit's fit reads the option on every resize.
  Bp.fit = function (scene, layout, across) {
    return Kit.play.fit(scene, function (v) { v.upright = v.h > v.w; if (layout) layout.call(scene, v); },
      function () {
        // the interface ('hud'): its own size on every screen, 150 units are 48 screen points (never huge on a tablet or a computer)
        if (across === 'hud') return { w: window.innerWidth * 150 / 48, h: 1 };
        var iw = window.innerWidth, ih = window.innerHeight, os = Math.min(1.6, Math.max(0.8, Math.min(iw, ih) / 430));
        return { w: 2.4 * iw / os, h: 1 };
      });
  };

  // The caption of a good deed, spoken by the device's own voice (the old game did this too); silent when muted, in
  // the background, or in ?debug. The engine has no text to speech, so this stays a few lines of the browser's own.
  Bp.say = function (text) {
    try {
      var s = window.speechSynthesis;
      if (!s || Kit.snd.muted || document.hidden || Kit.play.debug) return;
      s.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.95; s.speak(u);
    } catch (e) { /* no voice: the card has its caption in words */ }
  };
  document.addEventListener('visibilitychange', function () { try { if (document.hidden && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* none */ } });

  // Arabic praise, recorded clips (audio/praise-*.mp3, from the kit's praise-clips.js), played as the engine's voice
  // so the effects and the bed dip under it.
  Bp.praise = function () {
    if (Kit.play.debug) return;
    Kit.snd.voice('audio/praise-' + (Math.random() < 0.25 ? 'barakallah' : 'mashaallah') + '.mp3', { vol: 0.9 });
  };

  // A burst of n particles of one emitter in several colours: the engine's tint is one colour at a time (a list of
  // colours makes it fade through them over the particle's life), so a burst is a few explosions, one per colour.
  // An emitter costs the engine work every frame even when nothing is flying (measured: six idle emitters were 4% of the
  // main thread at 6x CPU), so each sleeps (inactive and invisible) until a burst wakes it and goes back to sleep once
  // its last particle is gone.
  Bp.sleepy = function (emitter) { emitter.setActive(false).setVisible(false); return emitter; };
  Bp.fan = function (emitter, tints, n, x, y) {
    var k = Math.max(1, Math.ceil(n / tints.length));
    emitter.setActive(true).setVisible(true);
    for (var i = 0; i < tints.length; i++) { emitter.setParticleTint(tints[i]); emitter.explode(k, x, y); }
    if (emitter.bpT) emitter.bpT.remove();
    emitter.bpT = emitter.scene.time.addEvent({ delay: 400, loop: true, callback: function () {
      if (emitter.getAliveParticleCount() > 0) return;
      emitter.bpT.remove(); emitter.bpT = null; emitter.setActive(false).setVisible(false);
    } });
  };
  Bp.buzz = function (ms) { try { Kit.buzz(ms); } catch (e) { /* none */ } };
  Bp.hex = function (s) { return Phaser.Display.Color.HexStringToColor(s).color; };
})();
