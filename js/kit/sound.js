/* Kahf KidsGames kit: sound.js
   Sound for Phaser games, on Phaser's own sound system (this.sound, its loader and cache, its tweens). Kit.play.start
   turns it on and calls Kit.snd.init(game). Old pages not on Phaser still use js/kit/audio.js.
   No music: recordings of natural sounds only (no notes, melodies, jingles, chimes or instruments).

   What Phaser does and this file leaves to it: loading and decoding (audio sprites and single files, through the
   loader, so the loading bar counts them), unlocking on the first touch, pausing while the page is hidden, mute,
   and playing (volume, pan, rate, detune, loop, sample-exact marker loops).
   What Phaser has no word for, added here and nothing more (audio-design):
   - categories: 'ui', 'sfx', 'amb', 'voice'. A sound's volume is its category's volume x its own.
   - ducking: while a voice plays, effects and ambience dip (a Phaser tween on each playing sound's volume).
   - variation: a sound has several takes; never the one played last, and a little detune (under half a semitone:
     more makes a recording sound wobbly) and level (1 dB) each time.
   - a cap: at most 3 of one sound and 12 in all at once, and one sound not twice within 90 ms, so a weak phone
     never piles sounds up.
   - loops and voices are loaded when first wanted and their decoded audio is let go when unused for a while; the
     one-shots are one audio sprite, decoded once at boot.
   - one ambience bed at a time, cross-faded.

   Sounds come from tools/sound-cut.py: <dir>/sfx.m4a + sfx.json (Phaser's audio-sprite JSON with a "sounds" table).
   Use:
     Boot preload():   Kit.snd.load(this, '/KidsGames/games/<id>/audio/sfx/')
     Kit.snd.play('pop', { vol, pan, rate, delay })    vol 0..1 (for distance), pan -1..1
     const h = Kit.snd.loop('water', { vol, fade })    h.vol(v, secs)  h.stop(secs)
     Kit.snd.amb('amb-day' | null, { fade, vol })
     Kit.snd.voice(url, { vol }) -> Promise(true when heard to the end)   Kit.snd.stopVoice()   Kit.snd.preload([urls])
     Kit.snd.muted, Kit.snd.setMuted(m)   (the same remembered setting as js/kit/audio.js) */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};
  var MUTE_KEY = 'kahf-sound-muted', CAT = { ui: 1, sfx: 1, amb: 0.8, voice: 1 }, DUCK = { ui: 0.8, sfx: 0.6, amb: 0.35, voice: 1 };
  var PER = 3, LIMIT = 12, KEEP = 20000, GAP = 90;
  var isMuted = false, game = null, sc = null, base = '', S = {}, live = [], ducks = 0, amb = { name: null, h: null }, voiceSnd = null, voiceDone = null;

  function muted() { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; } }
  function catVol(c) { return (CAT[c] == null ? 1 : CAT[c]) * (ducks ? (DUCK[c] == null ? 1 : DUCK[c]) : 1); }
  function db(v) { return Math.pow(10, v / 20); }

  // a scene of the kit's own that never pauses: its loader fetches loops and voices, its tweens fade them
  var Svc = { key: 'KitSound', active: true, visible: false, create: function () { sc = this; } };
  function init(g) {
    game = g; if (!g || !g.sound) return;
    isMuted = muted(); g.sound.mute = isMuted; g.sound.pauseOnBlur = true;
    if (!g.scene.getScene('KitSound')) g.scene.add('KitSound', Svc, true);
  }
  // queue the game's one-shots (the audio sprite) in a scene's preload
  function load(scene, dir) {
    base = dir.replace(/\/?$/, '/');
    scene.load.audioSprite('kit-sfx', base + 'sfx.json', [base + 'sfx.m4a']);
    scene.load.once('filecomplete-json-kit-sfx', function () {}, null);
    scene.load.once('complete', function () { var j = scene.cache.json.get('kit-sfx'); S = (j && j.sounds) || {}; });
  }
  // a file this kit fetches later (a loop, a voice): Phaser's loader on the kit's scene; resolves when it is in the cache
  function fetchAudio(key, url) {
    if (game.cache.audio.exists(key)) return Promise.resolve(true);
    return new Promise(function (res) {
      if (!sc) { res(false); return; }
      var L = sc.load, done = function (ok_) { L.off('filecomplete-audio-' + key, yes); L.off('loaderror', bad); res(ok_); };
      var yes = function () { done(true); }, bad = function (f) { if (f && f.key === key) done(false); };
      L.on('filecomplete-audio-' + key, yes); L.on('loaderror', bad);
      L.audio(key, url); if (!L.isLoading()) L.start();
    });
  }
  // let go of a file's decoded audio once nothing has used it for KEEP ms
  var users = {}, freeT = {};
  function hold(key) { users[key] = (users[key] || 0) + 1; clearTimeout(freeT[key]); }
  function release(key) {
    users[key] = Math.max(0, (users[key] || 1) - 1); clearTimeout(freeT[key]);
    freeT[key] = setTimeout(function () { if (!users[key] && game.cache.audio.exists(key)) { game.sound.removeByKey(key); game.cache.audio.remove(key); } }, KEEP);
  }

  function play(name, o) {
    var e = S[name]; if (!game || !e || !e.takes || isMuted || game.sound.locked) return;
    o = o || {}; var now = game.loop.time;
    live = live.filter(function (v) { return v.end > now; });
    if (live.length >= LIMIT || live.filter(function (v) { return v.name === name; }).length >= PER) return;
    if (now - (e.at || -1e9) < GAP) return; e.at = now;                       // the same sound twice in one moment is a flam, not two
    var n = e.takes.length, i = n < 2 ? 0 : Math.floor(Math.random() * (n - 1)); if (n > 1 && i >= (e.last == null ? -1 : e.last)) i++; e.last = i;
    var key = e.takes[i], m = game.cache.json.get('kit-sfx').spritemap[key];
    var cfg = { volume: catVol(e.cat) * (o.vol == null ? 1 : o.vol) * db(Math.random() * 2 - 1), detune: Math.random() * 80 - 40, rate: o.rate || 1, delay: o.delay || 0 };
    if (o.pan) cfg.pan = Math.max(-1, Math.min(1, o.pan));
    if (!game.sound.playAudioSprite('kit-sfx', key, cfg)) return;
    live.push({ name: name, end: now + (o.delay || 0) * 1000 + (m.end - m.start) * 1000 / cfg.rate });
  }
  // the sounds playing now in a category, for ducking
  function playing(cat) { return game.sound.getAllPlaying().filter(function (s) { return s.kitCat === cat; }); }
  function fade(snd, to, secs, then) {
    if (!sc) { snd.volume = to; if (then) then(); return; }
    sc.tweens.killTweensOf(snd); sc.tweens.add({ targets: snd, volume: to, duration: Math.max(1, secs * 1000), onComplete: then });
  }
  function loop(name, o) {
    o = o || {}; var e = S[name], h = { on: true, snd: null, v: o.vol == null ? 1 : o.vol };
    h.vol = function (v, secs) { h.v = v; if (h.snd) fade(h.snd, catVol(e.cat) * v, secs == null ? 0.3 : secs); return h; };
    h.stop = function (secs) {
      if (!h.on) return; h.on = false; var s = h.snd; if (!s) return;
      fade(s, 0, secs == null ? 0.4 : secs, function () { s.stop(); s.destroy(); release('kit-loop-' + name); });
    };
    if (!game || !e || !e.loop) { h.on = false; return h; }
    var key = 'kit-loop-' + name; hold(key);
    fetchAudio(key, base + e.loop.file).then(function (got) {
      if (!got || !h.on) { if (!h.on || !got) release(key); return; }
      var s = game.sound.add(key); s.kitCat = e.cat;
      s.addMarker({ name: 'loop', start: e.loop.start, duration: e.loop.end - e.loop.start, config: { loop: true } });
      s.play('loop', { volume: 0, loop: true }); h.snd = s; fade(s, catVol(e.cat) * h.v, o.fade == null ? 0.6 : o.fade);
    });
    return h;
  }
  function setAmb(name, o) {
    o = o || {}; if (name === amb.name) { if (amb.h && o.vol != null) amb.h.vol(o.vol, 1); return; }
    if (amb.h) amb.h.stop(o.fade == null ? 1.5 : o.fade);
    amb.name = name; amb.h = name ? loop(name, { fade: o.fade == null ? 1.5 : o.fade, vol: o.vol }) : null;
  }
  function duck(on) {
    ducks = Math.max(0, ducks + (on ? 1 : -1));
    ['ui', 'sfx', 'amb'].forEach(function (c) {
      playing(c).forEach(function (s) { if (s.kitBase == null) s.kitBase = s.volume / (ducks ? 1 : DUCK[c]); fade(s, s.kitBase * (ducks ? DUCK[c] : 1), ducks ? 0.15 : 0.5); });
    });
  }
  // a recorded voice (a phrase of the adhan, a word of the prayer): loaded once, played on the voice category,
  // everything else ducked under it. Resolves true when it was heard to the end, false if stopped, missing or muted.
  function voice(url, o) {
    o = o || {}; stopVoice();
    if (!game) return Promise.resolve(false);
    var key = 'kit-v-' + url;
    hold(key);
    return fetchAudio(key, url).then(function (got) {
      return new Promise(function (res) {
        if (!got || isMuted) { release(key); res(false); return; }
        var s = game.sound.add(key, { volume: catVol('voice') * (o.vol == null ? 1 : o.vol) }); s.kitCat = 'voice';
        var end = function (full) { if (voiceSnd !== s) return; voiceSnd = null; voiceDone = null; duck(false); s.destroy(); release(key); res(full); };
        voiceSnd = s; voiceDone = function () { s.stop(); end(false); };
        s.once('complete', function () { end(true); });
        duck(true); s.play();
      });
    });
  }
  function stopVoice() { if (voiceDone) voiceDone(); }

  Kit.snd = {
    init: init, load: load, play: play, loop: loop, amb: setAmb, voice: voice, stopVoice: stopVoice,
    // fetch voices ahead (the next lines of a guide), so they start at once; let go again if not played soon
    preload: function (urls) { if (!game) return; urls.forEach(function (u) { var k = 'kit-v-' + u; hold(k); fetchAudio(k, u).then(function () { release(k); }); }); },
    has: function (name) { return !!S[name]; },
    // a pause on the engine's clock (the kit's scene), as a Promise
    wait: function (ms) { return new Promise(function (ok) { if (sc) sc.time.delayedCall(ms, ok); else ok(); }); },
    // (kept here: Phaser's own `mute` reads the audio gain back, which changes only on the audio thread, a moment later)
    get muted() { return game ? isMuted : muted(); },
    setMuted: function (m) { isMuted = !!m; try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch (e) {} if (game) game.sound.mute = isMuted; },
    // what is decoded and held now, for ?perf
    held: function () { if (!game) return ''; var k = game.cache.audio.getKeys(); return k.length + ' audio · ' + game.sound.getAllPlaying().length + ' playing'; }
  };
})();
