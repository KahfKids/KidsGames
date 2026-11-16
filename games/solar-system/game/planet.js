/* Solar System: planet.js
   One lit, spinning ball on the graphics chip, used by the space scene and by the portraits in the interface.
   The old game shaded every ball on the CPU a few times a second (a per-pixel loop, then putImageData). Here the
   engine's own Shader game object does the same per-pixel work on the graphics chip: a texture fetch (the surface
   picture made once by tools/bake.js), the Sun's light with a soft terminator, atmosphere, a cool rim on the dark
   side, Earth's clouds / ocean glint / city lights, and the outer glow. Spin, light direction and size are uniforms,
   so a planet costs one quad and nothing on the CPU but setting a few numbers.
   Phaser has no sphere mapping, so this shader is the one thing here that is written by hand (docs/phaser-standard.md
   section 1: kit code is only for what the pinned build lacks). Textures are the engine's own (POT, so it repeats them
   sideways, and mipmapped when the game asks, which is what keeps tiny spinning balls from shimmering).
   Saturn's rings are two halves of one painted picture (art.js 'ring'), behind and in front of the ball. */
(function () {
  'use strict';
  var FRAG = [
    'precision highp float;',
    'varying vec2 outTexCoord;',
    'uniform sampler2D uTex; uniform sampler2D uMask;',
    'uniform vec3 uL; uniform vec3 uX; uniform vec3 uY; uniform vec3 uZ; uniform vec3 uAtm; uniform vec3 uHalo;',
    'uniform vec4 uKind;',    // amb, atmK, limb, rim
    'uniform vec4 uFlags;',   // spec, has mask, is the Sun, halo strength
    'uniform vec2 uSp;',      // surface spin, cloud spin (turns)
    'uniform float uPx; uniform float uQ;',
    'const float PI = 3.14159265; const float TAU = 6.2831853;',
    'void main () {',
    '  vec2 p = (outTexCoord - 0.5) * 2.0 * uQ;',
    '  float a = p.x, b = -p.y;',
    '  float rho = length(vec2(a, b));',
    '  float al = clamp((1.0 - rho) * uPx + 0.5, 0.0, 1.0);',
    '  vec4 outc = vec4(0.0);',
    // the glow outside the ball, nudged toward the Sun, under the disc
    '  if (uFlags.w > 0.0) {',
    '    float r2 = length(vec2(a, b) - uL.xy * 0.08);',
    '    float lit = 0.35 + 0.4 * max(0.0, uL.z + 0.5);',
    '    float h = uFlags.w * 0.42 * lit * (1.0 - clamp((r2 - 0.92) / 0.30, 0.0, 1.0));',
    '    outc = vec4(uHalo * h, h);',
    '  }',
    '  if (al > 0.0) {',
    '    float k = rho > 1.0 ? 1.0 / rho : 1.0;',
    '    float x = a * k, y = b * k, z = sqrt(max(0.0, 1.0 - x * x - y * y));',
    '    vec3 n = vec3(x, y, z);',
    '    float bx = dot(n, uX), by = dot(n, uY), bz = dot(n, uZ);',
    '    float u = atan(bx, bz) / TAU + uSp.x;',
    '    float v = clamp(0.5 - asin(clamp(by, -1.0, 1.0)) / PI, 0.004, 0.996);',
    '    vec3 c = texture2D(uTex, vec2(u, v)).rgb;',
    '    vec3 col;',
    '    if (uFlags.z > 0.5) {',
    '      float limb = 0.5 + 0.5 * sqrt(z), hot = z * z * z * 70.0 / 255.0;',
    '      col = vec3(c.r * limb + hot + 25.0 / 255.0 * (1.0 - z), c.g * limb * (0.85 + 0.15 * z) + hot, c.b * limb * (0.7 + 0.3 * z) + hot * 0.6);',
    '    } else {',
    '      float d = dot(n, uL);',
    '      float ts = clamp((d + 0.14) / 0.42, 0.0, 1.0); ts = ts * ts * (3.0 - 2.0 * ts);',
    '      float lam = ts * (0.55 + 0.5 * sqrt(max(d, 0.0)));',
    '      float cA = 0.0, oce = 0.0, lights = 0.0;',
    '      if (uFlags.y > 0.5) {',
    '        vec3 m = texture2D(uMask, vec2(u - uSp.x + uSp.y, v)).rgb;',
    '        cA = m.r; lights = texture2D(uMask, vec2(u - uSp.x, v)).b; oce = texture2D(uMask, vec2(u - uSp.x, v)).g;',
    '      }',
    '      c *= 1.0 - uKind.z + uKind.z * sqrt(z);',
    '      c += (vec3(248.0, 250.0, 255.0) / 255.0 - c) * cA;',
    '      float sh = uKind.x + lam;',
    '      c = vec3(c.r * sh, c.g * sh, c.b * (sh + uKind.x * 0.6));',
    '      float e1 = 1.0 - z;',
    '      float a2 = clamp(d + 0.35, 0.0, 1.0);',
    '      c += uAtm / 255.0 * (e1 * e1 * a2 * uKind.y);',
    '      if (uFlags.x > 0.5 && d > 0.0) {',
    '        vec3 hv = normalize(uL + vec3(0.0, 0.0, 1.0));',
    '        float sp = dot(n, hv);',
    '        if (sp > 0.9) { sp = pow(sp, 50.0) * 130.0 / 255.0 * oce * (1.0 - cA); c += vec3(sp, sp, sp * 0.9); }',
    '      }',
    '      if (uFlags.y > 0.5 && d < 0.05) {',
    '        float lk = lights * (1.0 - cA) * min(1.0, (0.05 - d) * 6.0);',
    '        c += vec3(255.0, 190.0, 90.0) / 255.0 * lk;',
    '      }',
    '      float rm = e1 * e1 * e1 * e1 * uKind.w * (1.0 - lam);',
    '      c += vec3(60.0, 90.0, 160.0) / 255.0 * rm;',
    '      col = c;',
    '    }',
    '    outc = vec4(min(col, 1.0) * al, al) + outc * (1.0 - al);',
    '  }',
    '  gl_FragColor = outc;',
    '}'
  ].join('\n');

  // shading by kind of world: amb, atmK, limb, rim, atmosphere colour, spec (the old KIND table)
  var KIND = {
    rock:  { k: [0.08, 0, 0, 0.5], atm: [0, 0, 0], spec: 0 },
    haze:  { k: [0.07, 0.55, 0.25, 0.5], atm: [255, 214, 150], spec: 0 },
    earth: { k: [0.06, 0.85, 0, 0.6], atm: [110, 170, 255], spec: 1 },
    gas:   { k: [0.07, 0.35, 0.3, 0.55], atm: [255, 236, 200], spec: 0 },
    ice:   { k: [0.07, 0.6, 0.3, 0.6], atm: [170, 230, 255], spec: 0 },
    sun:   { k: [0, 0, 0, 0], atm: [0, 0, 0], spec: 0 }
  };
  var Q = 1.3;                                                       // the quad reaches this many radii (room for the glow)

  function setup(set) {
    var u = this.u;
    set('uL', u.L); set('uX', u.X); set('uY', u.Y); set('uZ', u.Z); set('uAtm', u.atm); set('uHalo', u.halo);
    set('uKind', u.kind); set('uFlags', u.flags); set('uSp', u.sp); set('uPx', u.px); set('uQ', u.q);
  }

  // a ball for body b in scene s; its pictures must be loaded (SolarPlanet.load)
  function make(s, b) {
    var k = KIND[b.kind] || KIND.rock, tex = 'tex-' + b.id, mask = b.mask ? 'mask-' + b.id : tex;
    var sh = s.add.shader({ name: 'solar-ball', fragmentSource: FRAG, initialUniforms: { uTex: 0, uMask: 1 }, setupUniforms: setup }, 0, 0, 100, 100, [tex, mask]);
    var h = b.halo || [0, 0, 0];
    sh.u = { L: [0, 0, 1], X: b.X, Y: b.Y, Z: b.Z, atm: k.atm, halo: [h[0] / 255, h[1] / 255, h[2] / 255], kind: k.k,
      flags: [k.spec, b.mask ? 1 : 0, b.kind === 'sun' ? 1 : 0, b.halo ? 1 : 0], sp: [0, 0], px: 20, q: Q };
    var o = { b: b, sh: sh, R: 1, parts: [sh] };
    if (b.ring) {
      var s0 = Math.sin(b.vt * Math.PI / 180);
      o.back = s.add.image(0, 0, 'ring', 'back').setOrigin(0.5, 1).setRotation(b.tilt * Math.PI / 180);
      o.front = s.add.image(0, 0, 'ring', 'front').setOrigin(0.5, 0).setRotation(b.tilt * Math.PI / 180);
      o.ringY = s0 / 0.5;                                          // the picture is a flat ellipse 2:1; Saturn's is tipped by vt
      o.parts = [o.back, sh, o.front];
    }
    return o;
  }

  // place a ball: centre (x, y) in the scene, radius R (scene units), light direction L (screen space, unit), spin and cloud
  // turns, px = the ball's radius in screen pixels (for its soft edge), rot = how far the screen is rolled (kept upright)
  function place(o, x, y, R, L, spin, cloud, px, rot, depth, sq) {
    var u = o.sh.u, S = 2 * R * Q / 100, qx = sq || 1, qy = 1 / Math.sqrt(qx);     // sq: a squash (a planet that was tapped bounces)
    u.L = L; u.sp = [spin, cloud]; u.px = px;
    o.sh.setPosition(x, y).setScale(S * qx, S * qy).setRotation(rot);
    o.R = R;
    if (o.back) {
      var f = R * 2.3 / 512;                                       // the ring picture is 1024 wide: 2 x 2.3 planet radii
      o.back.setPosition(x, y).setScale(f * qx, f * o.ringY * qy).setRotation(o.b.tilt * Math.PI / 180 + rot);
      o.front.setPosition(x, y).setScale(f * qx, f * o.ringY * qy).setRotation(o.b.tilt * Math.PI / 180 + rot);
    }
    if (depth !== undefined) { o.parts.forEach(function (p, i) { p.setDepth(depth + i * 0.001); }); }
  }
  function show(o, on) { o.parts.forEach(function (p) { p.setVisible(on); }); }
  function destroy(o) { o.parts.forEach(function (p) { p.destroy(); }); }

  window.SolarPlanet = { make: make, place: place, show: show, destroy: destroy, Q: Q, KIND: KIND };
})();
