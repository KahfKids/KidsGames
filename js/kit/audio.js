/* Kahf KidsGames kit: audio.js
   Sound plumbing only: no music. No notes, scales, melodies, jingles, chimes or instrument sounds anywhere.
   Every game defines its OWN sound effects (natural, non-musical: taps, knocks, pops, splashes, whooshes,
   rustles, footsteps, crackles, claps), using the building blocks in Kit.sfx.lib.

   The kit handles: one WebAudio context, unlock on the first touch (iOS and Chrome need a gesture), pausing
   while the app is hidden, and one remembered mute setting shared by all games.

   Usage in a game:
     Kit.sfx.define({
       tap:  function (L, t, o) { L.click(t, { freq: 2600 }); },
       pop:  function (L, t, o) { L.burst(t, { dur: 0.08, freq: 1800, sweepTo: 400 }); }
     });
     Kit.sfx.play('pop', { size: 2 });
   The kit's sheets play 'tap' (buttons) and 'star' (each star on a level-complete sheet, o.n = 0..2), so every
   game should define those two as well. Kit.sfx.note(step) plays the game's 'combo' sound with o.step. */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, out = null, noiseBuf = null, brownBuf = null;
  var MUTE_KEY = 'kahf-sound-muted';
  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  function get() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.15;
        out = ctx.createGain(); out.gain.value = 0.6;
        out.connect(comp); comp.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }
  function unlock() {
    var c = get();
    if (c && c.state === 'suspended' && !document.hidden) { try { c.resume(); } catch (e) {} }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (t) { addEventListener(t, unlock, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (e) {}
  });
  function ready() { var c = get(); return c && c.state === 'running' && !muted ? c : null; }

  function white(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function brown(c) { // deep rumbly noise (wind, rumble, sand)
    if (!brownBuf) {
      brownBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
      var d = brownBuf.getChannelData(0), last = 0;
      for (var i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    }
    return brownBuf;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---------- building blocks (all short, unpitched or gliding; none of them plays a musical note) ----------
  // Every block takes (t, o) where t is the start time; o.vol, o.dest are common options.
  var L = {
    get ctx() { return ctx; }, get out() { return out; }, rnd: rnd,

    // Filtered noise burst. o: dur, freq, q, type ('bandpass'|'lowpass'|'highpass'), sweepTo (filter glide),
    // attack, vol, brown (true = deeper noise), pan (-1..1)
    burst: function (t, o) {
      var c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), dur = o.dur || 0.1;
      s.buffer = o.brown ? brown(c) : white(c);
      s.playbackRate.value = o.rate || 1;
      f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 2000, t); f.Q.value = o.q == null ? 1 : o.q;
      if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.sweepTo), t + dur);
      var v = o.vol == null ? 0.25 : o.vol, a = o.attack || 0.002;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var node = g;
      if (o.pan && c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); node = p; }
      s.connect(f); f.connect(g); node.connect(o.dest || out);
      var off = Math.random() * 0.8; s.start(t, off); s.stop(t + dur + 0.02);
    },
    // A body thump: a fast falling sine (a knock, a footstep, a landing). o: from, to, dur, vol
    thump: function (t, o) {
      var c = ctx, osc = c.createOscillator(), g = c.createGain(), dur = o.dur || 0.09;
      osc.type = 'sine'; osc.frequency.setValueAtTime(o.from || 160, t); osc.frequency.exponentialRampToValueAtTime(o.to || 60, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol == null ? 0.35 : o.vol, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(o.dest || out); osc.start(t); osc.stop(t + dur + 0.02);
    },
    // A glide: one quick sweep (a water drop "bloop", a zap, a bubble). o: from, to, dur, vol, type, attack
    glide: function (t, o) {
      var c = ctx, osc = c.createOscillator(), g = c.createGain(), dur = o.dur || 0.08;
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.from || 400, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to || 1200), t + dur * (o.glideFrac || 0.85));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol == null ? 0.25 : o.vol, t + (o.attack || 0.003));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(o.dest || out); osc.start(t); osc.stop(t + dur + 0.02);
    },
    // A sharp click (wood, plastic, a switch). o: freq, vol, dur
    click: function (t, o) { o = o || {}; L.burst(t, { dur: o.dur || 0.018, freq: o.freq || 3000, q: o.q || 2.5, vol: o.vol == null ? 0.3 : o.vol, dest: o.dest }); },
    // Wood knock: a click plus a hollow body. o: size (0.5 small .. 2 big), vol
    knock: function (t, o) {
      o = o || {}; var s = o.size || 1, v = o.vol == null ? 1 : o.vol;
      L.burst(t, { dur: 0.03, freq: 1800 / s, q: 3, vol: 0.28 * v, dest: o.dest });
      L.thump(t, { from: 260 / s, to: 150 / s, dur: 0.07 * s, vol: 0.3 * v, dest: o.dest });
    },
    // Water drop. o: size (0.5 .. 2), vol
    drop: function (t, o) {
      o = o || {}; var s = o.size || 1, f = rnd(700, 950) / s;
      L.glide(t, { from: f, to: f * 2.6, dur: 0.06 * s, vol: (o.vol == null ? 0.22 : o.vol), dest: o.dest });
      L.burst(t + 0.01, { dur: 0.05 * s, freq: 2400 / s, q: 1.2, vol: 0.05, dest: o.dest });
    },
    // A spray of tiny random grains: sparkle, sand, glitter, crackle. o: n, spread (s), freq, vol, dur
    grains: function (t, o) {
      o = o || {};
      for (var i = 0; i < (o.n || 10); i++) L.burst(t + Math.random() * (o.spread || 0.3), { dur: o.dur || rnd(0.008, 0.02), freq: (o.freq || 6000) * rnd(0.7, 1.3), q: o.q || 4, vol: (o.vol || 0.12) * rnd(0.4, 1), dest: o.dest, pan: rnd(-0.6, 0.6) });
    },
    // Hand claps (a small crowd clapping). o: n (claps), people, dur, vol
    claps: function (t, o) {
      o = o || {}; var people = o.people || 5, span = o.dur || 1.2;
      for (var p = 0; p < people; p++) {
        var tt = t + Math.random() * 0.12, gap = rnd(0.16, 0.24);
        for (; tt < t + span; tt += gap * rnd(0.9, 1.1)) {
          L.burst(tt, { dur: 0.03, freq: rnd(1000, 1600), q: 1.4, vol: (o.vol || 0.12) * rnd(0.5, 1), dest: o.dest, pan: rnd(-0.7, 0.7) });
        }
      }
    },
    // Whoosh: a breathy filtered-noise sweep. o: dur, from, to, vol
    whoosh: function (t, o) { o = o || {}; L.burst(t, { dur: o.dur || 0.3, freq: o.from || 500, sweepTo: o.to || 2400, q: 0.8, attack: (o.dur || 0.3) * 0.4, vol: o.vol == null ? 0.18 : o.vol, dest: o.dest, brown: o.brown }); }
  };

  // Minimal fallbacks, used only until a game defines its own: plain non-musical clicks.
  var FALLBACK = {
    tap: function (L, t) { L.click(t, { freq: 2600, vol: 0.18 }); },
    star: function (L, t) { L.grains(t, { n: 8, spread: 0.2, freq: 7000, vol: 0.1 }); },
    whoosh: function (L, t) { L.whoosh(t, {}); }
  };
  var SFX = {};
  for (var k in FALLBACK) SFX[k] = FALLBACK[k];

  Kit.sfx = {
    lib: L,
    // Register this game's own sounds (call once at start). Later calls add or replace names.
    define: function (map) { for (var n in map) SFX[n] = map[n]; },
    has: function (name) { return !!SFX[name]; },
    names: function () { return Object.keys(SFX); },
    play: function (name, o) {
      var c = ready(); if (!c || !SFX[name]) return;
      try { SFX[name](L, c.currentTime + 0.005, o || {}); } catch (e) {}
    },
    // Combos: the game's own 'combo' sound gets the step (use it for intensity, never for a rising scale).
    note: function (step) { this.play(SFX.combo ? 'combo' : 'tap', { step: step }); },
    get muted() { return muted; },
    setMuted: function (m) { muted = !!m; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {} },
    toggle: function () { this.setMuted(!muted); if (!muted) { unlock(); if (Kit.say) Kit.say.stop(); this.play('tap'); } return muted; }
  };

  // ---------- voice (device text-to-speech, on-device voices only, works offline where installed) ----------
  // Praise is spoken in Arabic with an Arabic voice (it sounds right; an English voice mangles "MashaAllah").
  // Kit.say.praise('mashaallah' | 'subhanallah' | 'alhamdulillah' | 'ahsant' | 'barakallah' | 'allahuakbar')
  // Kit.say.text('What comes next?', 'en')  -> best installed English voice. Both return false if no voice.
  // Never uses novelty or singing voices (Apple's Bells, Cellos, Organ, etc.). Silent when muted.
  // Written with full vowel marks (harakat) so a text-to-speech voice can't guess the wrong reading.
  var PRAISE = {
    mashaallah: 'مَا شَاءَ اللَّهُ', subhanallah: 'سُبْحَانَ اللَّهِ', alhamdulillah: 'الْحَمْدُ لِلَّهِ',
    ahsant: 'أَحْسَنْتَ', barakallah: 'بَارَكَ اللَّهُ فِيكَ', allahuakbar: 'اللَّهُ أَكْبَرُ'
  };
  // Recorded clips beat any device voice. praise-clips.js (next to this file) holds them as base64 MP3s, so
  // they ship with the game: no download at play time, and they work offline once the game is cached.
  // It is loaded after the page has loaded, decoded on the first touch, and played through the kit's audio
  // context, so mute and pause-on-hide apply. If it is missing, praise falls back to the device voice.
  var me = document.currentScript, clips = {}, clipSrc = null, clipsAsked = false, clipsDecoded = false;
  var CLIP_URL = ((me && me.src) || '/KidsGames/js/kit/audio.js').replace(/audio\.js(\?.*)?$/, 'praise-clips.js');
  function askClips() {
    if (clipsAsked || Kit.praiseClips) return; clipsAsked = true;
    var s = document.createElement('script'); s.src = CLIP_URL; s.async = true;
    s.onload = function () { if (ctx && ctx.state === 'running') decodeClips(); };
    (document.head || document.documentElement).appendChild(s);
  }
  if (document.readyState === 'complete') setTimeout(askClips, 300);
  else addEventListener('load', function () { setTimeout(askClips, 300); });
  function decodeClips() {
    var c = get(), data = Kit.praiseClips; if (!c || !data || clipsDecoded) return; clipsDecoded = true;
    Object.keys(PRAISE).forEach(function (key) {
      if (!data[key]) return;
      try {
        var bin = atob(data[key]), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var p = c.decodeAudioData(bytes.buffer, function (buf) { clips[key] = buf; }, function () {});
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    });
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (t) { addEventListener(t, decodeClips, { capture: true, passive: true }); });
  function stopClip() { if (clipSrc) { try { clipSrc.stop(); } catch (e) {} clipSrc = null; } }
  function playClip(key) {
    var c = ready(), buf = clips[key]; if (!c || !buf) return false;
    try {
      stopClip();
      var s = c.createBufferSource(), g = c.createGain(); g.gain.value = 0.95;
      s.buffer = buf; s.connect(g); g.connect(c.destination); s.start();
      clipSrc = s; s.onended = function () { if (clipSrc === s) clipSrc = null; };
      return true;
    } catch (e) { return false; }
  }
  var NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|eddy|flo\b|reed|sandy|hysterical|deranged|pipe/i;
  var GOOD = /premium|enhanced|natural|neural|siri|google/i;
  var synth = window.speechSynthesis, voices = [], picked = {};
  function loadVoices() { try { voices = synth ? synth.getVoices() || [] : []; picked = {}; } catch (e) { voices = []; } }
  if (synth) { loadVoices(); try { synth.addEventListener ? synth.addEventListener('voiceschanged', loadVoices) : (synth.onvoiceschanged = loadVoices); } catch (e) {} }
  function pick(lang) {
    if (picked[lang] !== undefined) return picked[lang];
    var best = null, bestScore = -1;
    voices.forEach(function (v) {
      var l = (v.lang || '').toLowerCase().replace('_', '-');
      if (l.indexOf(lang) !== 0 || NOVELTY.test(v.name)) return;
      var s = 1;
      if (v.localService) s += 2;                                   // on-device: works offline
      if (GOOD.test(v.name)) s += 3;
      if (lang === 'ar' && /majed|maged|tarik|laila|hoda|naayf|zeina|hamed|salma/i.test(v.name)) s += 2;
      if (lang === 'en' && /samantha|karen|daniel|moira|serena|ava|allison|susan|tessa|martha|arthur|libby|sonia|ryan/i.test(v.name)) s += 2;
      if (lang === 'en' && /en-gb|en-us|en-au/.test(l)) s += 1;
      if (s > bestScore) { bestScore = s; best = v; }
    });
    return (picked[lang] = best);
  }
  function speak(text, lang, o) {
    o = o || {};
    if (!synth || !window.SpeechSynthesisUtterance || muted || document.hidden) return false;
    if (!voices.length) loadVoices();
    var v = pick(lang);
    if (!v && lang === 'ar') return false;                         // no Arabic voice: stay silent, never mangle it
    try {
      if (o.interrupt !== false) { synth.cancel(); stopClip(); }
      var u = new SpeechSynthesisUtterance(text);
      if (v) u.voice = v;
      u.lang = v ? v.lang : (lang === 'ar' ? 'ar-SA' : 'en-US');
      u.rate = o.rate || (lang === 'ar' ? 1 : 0.95); u.pitch = o.pitch || 1; u.volume = 1;
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }
  Kit.say = {
    praise: function (key, o) {
      var t = PRAISE[key]; if (!t) return false;
      if (muted || document.hidden) return false;
      if (playClip(key)) { try { synth && synth.cancel(); } catch (e) {} return true; }
      return speak(t, 'ar', o);
    },
    text: function (text, lang, o) { return speak(text, lang || 'en', o); },
    has: function (lang) { if (!voices.length) loadVoices(); return !!pick(lang || 'en'); },
    stop: function () { stopClip(); try { synth && synth.cancel(); } catch (e) {} },
    hasClips: function () { return Object.keys(clips).length > 0; },
    phrases: PRAISE
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden && Kit.say) Kit.say.stop(); });
})();
