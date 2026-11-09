/* Ramadan Maze: sounds.js
   This game's own sound effects, all natural and foley-style (no music, no notes, no tunes): footsteps that
   change with the world, wall bumps, dates landing on a plate, a cup's splash, a lantern catching light,
   the creaking house door, the iftar room murmur with claps, and quiet world ambience (wind in the palms,
   distant birds, crickets at night). Built on the kit's building blocks (Kit.sfx.define / Kit.sfx.lib).
   o.world: 0 Palm Garden (sand, hedges), 1 Old City Lanes (cobbles, mud brick), 2 Lantern Night (tiles). */
(function () {
  'use strict';
  var K = window.Kit;
  function r(a, b) { return a + Math.random() * (b - a); }

  // A wooden door creak: a slow, wobbling rasp through a narrow resonance (a hinge, not a tone).
  function creak(L, t, dur, vol) {
    var c = L.ctx, osc = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(r(55, 70), t);
    osc.frequency.linearRampToValueAtTime(r(85, 110), t + dur * 0.6);
    osc.frequency.linearRampToValueAtTime(r(60, 75), t + dur);
    lfo.type = 'sine'; lfo.frequency.value = r(14, 22); lg.gain.value = 18; // irregular stick-slip of the hinge
    lfo.connect(lg); lg.connect(osc.frequency);
    f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.06);
    g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f); f.connect(g); g.connect(L.out);
    osc.start(t); lfo.start(t); osc.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
  }

  // A room murmur: low filtered noise that swells and settles, like a family chatting softly.
  function murmur(L, t, dur, vol) {
    for (var i = 0; i < 4; i++) {
      var tt = t + i * dur / 5;
      L.burst(tt, { dur: dur * 0.5, freq: r(350, 650), q: 1.6, brown: true, attack: dur * 0.2, vol: vol * r(0.6, 1), pan: r(-0.5, 0.5) });
    }
  }

  K.sfx.define({
    // ----- the kit's own calls -----
    tap: function (L, t) { L.knock(t, { size: 0.55, vol: 0.55 }); L.grains(t + 0.01, { n: 3, spread: 0.05, freq: 7000, vol: 0.05 }); },
    star: function (L, t, o) { // a date lands on the plate, with a sparkle that gets fuller star by star
      var n = o.n || 0;
      L.knock(t, { size: 0.6, vol: 0.7 }); L.click(t, { freq: 3600, vol: 0.12 });
      L.grains(t + 0.02, { n: 8 + n * 6, spread: 0.25 + n * 0.08, freq: 6500, vol: 0.09 + n * 0.02 });
    },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 400, to: 1800, vol: 0.12 }); },

    // ----- walking -----
    step: function (L, t, o) { // one footfall; o.alt alternates the feet so it never sounds machine-like
      var w = o.world || 0, v = o.alt ? 0.85 : 1;
      if (w === 0) { // soft sand crunch
        L.burst(t, { dur: r(0.05, 0.07), freq: r(1800, 2600), q: 0.9, vol: 0.05 * v, attack: 0.008 });
        L.grains(t, { n: 3, spread: 0.035, freq: 4200, q: 2, vol: 0.03 * v });
      } else if (w === 1) { // a shoe on cobbles
        L.burst(t, { dur: 0.025, freq: r(1300, 1700), q: 3, vol: 0.07 * v });
        L.thump(t, { from: r(170, 200), to: 90, dur: 0.045, vol: 0.07 * v });
      } else { // a tap on smooth tiles
        L.click(t, { freq: r(2600, 3200), vol: 0.06 * v, dur: 0.014 });
        L.thump(t, { from: 230, to: 120, dur: 0.035, vol: 0.05 * v });
      }
    },
    turn: function (L, t) { L.burst(t, { dur: 0.06, freq: 2600, q: 0.7, vol: 0.035, attack: 0.02 }); }, // a little scuff of the shoe
    bump: function (L, t, o) {
      if ((o.world || 0) === 0) { // into the hedge: leaves rustle around a soft push
        L.thump(t, { from: 120, to: 60, dur: 0.12, vol: 0.18 });
        L.grains(t, { n: 12, spread: 0.18, freq: 3800, q: 1.2, vol: 0.06 });
        L.burst(t, { dur: 0.2, freq: 2400, q: 0.6, vol: 0.05, attack: 0.03 });
      } else { // a dull thud on brick or tile, with a little grit trickling down
        L.thump(t, { from: 140, to: 55, dur: 0.12, vol: 0.24 });
        L.burst(t, { dur: 0.04, freq: 900, q: 1.5, vol: 0.08 });
        L.grains(t + 0.05, { n: 5, spread: 0.2, freq: 5200, vol: 0.03 });
      }
    },
    hop: function (L, t) { // tapping the kid: a little cloth swish up, and a soft landing
      L.whoosh(t, { dur: 0.16, from: 700, to: 2200, vol: 0.08 });
      L.thump(t + 0.3, { from: 150, to: 70, dur: 0.07, vol: 0.12 });
    },
    mark: function (L, t) { L.knock(t, { size: 0.5, vol: 0.45 }); L.burst(t + 0.02, { dur: 0.12, freq: 1800, q: 0.6, vol: 0.04, attack: 0.04 }); },
    nope: function (L, t) { L.thump(t, { from: 110, to: 70, dur: 0.07, vol: 0.12 }); L.thump(t + 0.1, { from: 100, to: 60, dur: 0.07, vol: 0.09 }); },

    // ----- treats -----
    date: function (L, t, o) { // a ceramic knock on the plate and sparkle; fuller as the count grows
      var n = Math.min(o.n || 1, 10);
      L.knock(t, { size: 0.45, vol: 0.55 });
      L.burst(t, { dur: 0.05, freq: 3200, q: 5, vol: 0.06 });
      L.grains(t + 0.03, { n: 6 + n, spread: 0.2 + n * 0.02, freq: 7000, vol: 0.06 + n * 0.004 });
    },
    cup: function (L, t) { // a little splash
      L.drop(t, { size: 0.9, vol: 0.16 });
      L.drop(t + 0.05, { size: 0.6, vol: 0.1 });
      L.burst(t + 0.01, { dur: 0.16, freq: 2800, sweepTo: 1200, q: 0.8, vol: 0.09 });
      L.grains(t + 0.04, { n: 6, spread: 0.12, freq: 5200, q: 3, vol: 0.05 });
    },
    lantern: function (L, t) { // a warm whoosh as the flame catches, then a fire-crackle
      L.whoosh(t, { dur: 0.45, from: 250, to: 1200, vol: 0.16, brown: true });
      L.thump(t + 0.05, { from: 90, to: 50, dur: 0.18, vol: 0.12 });
      L.grains(t + 0.15, { n: 14, spread: 0.5, freq: 2400, q: 2, vol: 0.07, dur: 0.012 });
    },
    allfound: function (L, t) { // every treat found: a shower of sparkle and a few happy claps
      L.grains(t, { n: 30, spread: 0.6, freq: 7000, vol: 0.08 });
      L.whoosh(t, { dur: 0.5, from: 600, to: 3000, vol: 0.08 });
      L.claps(t + 0.15, { people: 3, dur: 0.6, vol: 0.07 });
    },

    // ----- home and iftar -----
    door: function (L, t) { // two knocks on the wooden door, then it creaks open
      L.knock(t, { size: 1.3, vol: 0.8 }); L.knock(t + 0.17, { size: 1.3, vol: 0.7 });
      creak(L, t + 0.35, 0.55, 0.05);
    },
    home: function (L, t) { // windows light up: a warm whoosh, sparkle and cheering claps
      L.whoosh(t, { dur: 0.5, from: 300, to: 1600, vol: 0.12, brown: true });
      L.grains(t + 0.05, { n: 26, spread: 0.7, freq: 6500, vol: 0.08 });
      L.claps(t + 0.1, { people: 6, dur: 1.1, vol: 0.1 });
    },
    iftar: function (L, t) { // the room at iftar: a soft murmur and a few gentle claps
      murmur(L, t, 2.6, 0.06);
      L.claps(t + 0.4, { people: 4, dur: 0.9, vol: 0.07 });
    },

    // ----- quiet world ambience (played now and then while walking) -----
    ambience: function (L, t, o) {
      var w = o.world || 0;
      if (w === 0) { // wind through the palm fronds
        L.burst(t, { dur: r(2, 3), freq: r(400, 700), sweepTo: r(250, 400), q: 0.5, brown: true, attack: 0.9, vol: 0.06 });
        L.grains(t + 0.5, { n: 10, spread: 1.4, freq: 3200, q: 0.8, vol: 0.02, dur: 0.05 });
        if (Math.random() < 0.6) birds(L, t + r(0.4, 1.5), 0.035);
      } else if (w === 1) { // a breeze down the lanes, a far-off bird
        L.burst(t, { dur: r(1.6, 2.4), freq: r(300, 500), q: 0.6, brown: true, attack: 0.7, vol: 0.045 });
        if (Math.random() < 0.7) birds(L, t + r(0.2, 1.2), 0.03);
      } else { // crickets at night
        var base = r(4200, 4700), n = 2 + ((Math.random() * 2) | 0);
        for (var k = 0; k < n; k++) for (var i = 0; i < 5; i++)
          L.burst(t + k * 0.42 + i * 0.045, { dur: 0.022, freq: base, q: 25, vol: 0.05, pan: -0.4 });
        if (Math.random() < 0.5) for (var j = 0; j < 4; j++) L.burst(t + 0.9 + j * 0.05, { dur: 0.02, freq: base * 1.1, q: 25, vol: 0.03, pan: 0.5 });
      }
    }
  });

  // Distant birds: a couple of quick, random chirps (a call, not a tune).
  function birds(L, t, vol) {
    var n = 2 + ((Math.random() * 3) | 0), pan = r(-0.7, 0.7);
    for (var i = 0; i < n; i++) {
      var f = r(2600, 3800), tt = t + i * r(0.07, 0.12);
      L.glide(tt, { from: f, to: f * r(1.25, 1.5), dur: 0.05, vol: vol, attack: 0.004 });
      L.burst(tt, { dur: 0.04, freq: f * 1.3, q: 8, vol: vol * 0.3, pan: pan });
    }
  }

  // The device voice for praise (only when sound is on and the device has a voice).
  window.MazeVoice = {
    // Praise is spoken in Arabic with an Arabic voice (Kit.say); silent if the device has none.
    praise: function (key) { K.say.praise(key); }
  };
})();
