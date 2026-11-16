/* Spider IK: traces the shapes the physics engine needs, once, from the art (the art pipeline, not the game).
   node games/spider-ik/tools/trace.js            (needs ffmpeg and ImageMagick's `magick`)
   Writes games/spider-ik/levels/shapes.json:
     levels[n-1] = { rock: [[x,y, x,y, ...], ...], edge: { top, bottom, left, right } }
       rock: the walls as polygons in level pixels (1440 x 1080): the main picture's alpha (> 127) plus the rough
             frame round the level. Cut into a grid of cells (split again where a cell would hold a hole), so every
             polygon is a simple outline Matter can split into convex parts (Bodies.fromVertices), and each cell is
             its own body: the engine's queries skip cells far from the spider by their bounds.
       edge: the frame's wavy lines (one offset per 4 px), so the game paints the same frame it collides with.
     sprites[name] = { w, h, polys: [[x,y, ...], ...] }   outlines of the moving things in their SVG's own pixels
             (holes dropped), for spinners, blobs, electric traps and portals as Matter bodies and sensors.
   The frame uses the old page's seeded random numbers, so every level keeps the exact frame it had. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), os = require('os');
const ROOT = path.join(__dirname, '..'), W = 1440, H = 1080, LEVELS = 21;
global.window = {}; require(path.join(ROOT, 'js/assets.js')); const D = window.SPIDER_ASSETS;

// ---- a binary grid's outlines: pixel-edge loops with rock on the right, then Douglas-Peucker ----
function loops(solid, x0, y0, w, h) {
  const at = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && solid(x, y);
  const out = new Map(), key = (x, y) => x * 4096 + y;
  const add = (ax, ay, bx, by) => { const k = key(ax, ay); (out.get(k) || out.set(k, []).get(k)).push([bx, by]); };
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!at(x, y)) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);           // top side, going right
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);   // right side, going down
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);   // bottom, going left
    if (!at(x - 1, y)) add(x, y + 1, x, y);           // left, going up
  }
  const res = [];
  for (const [k0, list] of out) {
    while (list.length) {
      const sx = Math.floor(k0 / 4096), sy = k0 % 4096, pts = [[sx, sy]];
      let [cx, cy] = list.pop(), px = sx, py = sy, guard = 0;
      while (!(cx === sx && cy === sy) && guard++ < 1e7) {
        pts.push([cx, cy]);
        const nx = out.get(key(cx, cy));
        // at a corner two loops share, keep turning the same way (right) so loops never cross
        let pick = 0;
        if (nx.length > 1) { const dx = cx - px, dy = cy - py; pick = nx.findIndex(([qx, qy]) => (qx - cx) === -dy && (qy - cy) === dx); if (pick < 0) pick = 0; }
        const nxt = nx.splice(pick, 1)[0]; px = cx; py = cy; [cx, cy] = nxt;
      }
      res.push(pts);
    }
  }
  return res;
}
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
function rdp(p, eps) {
  if (p.length < 4) return p;
  // closed loop: split at the point farthest from the first, simplify both halves
  let far = 0, fd = -1; for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1]); if (d > fd) { fd = d; far = i; } }
  const open = (a) => {
    if (a.length < 3) return a;
    const [ax, ay] = a[0], [bx, by] = a[a.length - 1], L = Math.hypot(bx - ax, by - ay) || 1;
    let mi = 0, md = 0;
    for (let i = 1; i < a.length - 1; i++) { const d = Math.abs((bx - ax) * (ay - a[i][1]) - (ax - a[i][0]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md <= eps) return [a[0], a[a.length - 1]];
    const l = open(a.slice(0, mi + 1)), r = open(a.slice(mi));
    return l.slice(0, -1).concat(r);
  };
  const A = open(p.slice(0, far + 1)), B = open(p.slice(far).concat([p[0]]));
  return A.slice(0, -1).concat(B.slice(0, -1));
}
const flat = p => p.reduce((a, q) => (a.push(q[0], q[1]), a), []);

// Matter's decomposer (poly-decomp) only works on a SIMPLE outline: no repeated point, no collinear run, no zero-width spike
// and no edge touching or crossing another. Douglas-Peucker on a pixel-edge loop can leave all of these (a one-pixel neck
// pinched shut, a spike running back over its own edge), and then the engine returns a broken body: parts that are not
// convex (a point query and the feet's casts miss rock inside them) or parts quietly dropped. So every outline is cleaned,
// checked, and simplified less where it is not simple (down to the exact pixel loop), and cut in two where it pinches.
function tidy(p) {
  p = p.map(q => q.slice());
  for (let again = true; again && p.length >= 3;) {
    again = false;
    for (let i = 0; i < p.length; i++) {
      const n = p.length, a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
      if ((a[0] === b[0] && a[1] === b[1]) || (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) === 0) { p.splice(i, 1); again = true; break; }
    }
  }
  return p;
}
const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
const onSeg = (a, b, c) => Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
function meet(a, b, c, d) {       // do segments ab and cd share any point (touching counts)
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return (o1 !== o2 && o3 !== o4) || (!o1 && onSeg(a, b, c)) || (!o2 && onSeg(a, b, d)) || (!o3 && onSeg(c, d, a)) || (!o4 && onSeg(c, d, b));
}
function simple(p) {
  const n = p.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue;            // neighbours share their end point by design
    if (meet(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return false;
  }
  return true;
}
// one pixel loop -> simple outlines (list), simplified as far as it stays simple
const fixed = { eps: 0, split: 0, loops: 0 };
function outlines(loop, eps) {
  fixed.loops++;
  for (const e of [eps, 0.6, 0.3, 0]) {
    const s = tidy(e > 0 ? rdp(loop, e) : loop);
    if (s.length < 3) return [];
    if (simple(s)) { if (e !== eps) fixed.eps++; return [s]; }
  }
  // the exact pixel loop pinches shut at a corner it passes twice: cut it into the loops it is made of
  const s = tidy(loop), seen = new Map();
  for (let i = 0; i < s.length; i++) {
    const k = s[i][0] * 4096 + s[i][1];
    if (seen.has(k)) { const j = seen.get(k); fixed.split++; return outlines(s.slice(j, i), 0).concat(outlines(s.slice(0, j).concat(s.slice(i)), 0)); }
    seen.set(k, i);
  }
  throw new Error('outline is not simple and has no pinch point: ' + JSON.stringify(s.slice(0, 8)));
}

// cells: whole rock -> one rectangle; empty -> nothing; else its outlines, split into four while it holds a hole
function cell(solid, x0, y0, w, h, eps, acc) {
  let n = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (solid(x, y)) n++;
  if (!n) return;
  if (n === w * h) { acc.push([x0, y0, x0 + w, y0, x0 + w, y0 + h, x0, y0 + h]); return; }
  const ls = loops(solid, x0, y0, w, h), outer = ls.filter(l => area(l) > 0), holes = ls.filter(l => area(l) < 0);
  if (holes.length && w > 12 && h > 12) {
    const hw = w >> 1, hh = h >> 1;
    cell(solid, x0, y0, hw, hh, eps, acc); cell(solid, x0 + hw, y0, w - hw, hh, eps, acc);
    cell(solid, x0, y0 + hh, hw, h - hh, eps, acc); cell(solid, x0 + hw, y0 + hh, w - hw, h - hh, eps, acc);
    return;
  }
  for (const l of outer) for (const s of outlines(l, eps)) if (Math.abs(area(s)) >= 4) acc.push(flat(s));
}

// ---- the old page's frame: the same seeded waves ----
const rng = s => { s >>>= 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
function edge(n) {
  const r = rng(n * 977 + 13);
  const P = len => { const ph = [r() * 6, r() * 6, r() * 6], a = []; for (let x = 0; x <= len; x += 4) a.push(+(24 + 4.5 * Math.sin(x * 0.035 + ph[0]) + 2.5 * Math.sin(x * 0.09 + ph[1]) + 1 * Math.sin(x * 0.18 + ph[2])).toFixed(2)); return a; };
  return { top: P(W), bottom: P(W), left: P(H), right: P(H) };
}
const at4 = (a, v) => { const i = Math.min(a.length - 2, Math.floor(v / 4)), t = v / 4 - i; return a[i] + (a[i + 1] - a[i]) * t; };

function alphaOf(file, w, h) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
  const a = new Uint8Array(w * h); for (let i = 0; i < a.length; i++) a[i] = raw[i * 4 + 3]; return a;
}


// morphological opening (erode then dilate) with a (2r+1) square, separable: removes features narrower than 2r+1 px
function open(a, r) {
  const pass = (src, horiz, isMin) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = isMin ? 1 : 0;
      for (let k = -r; k <= r; k++) {
        const xx = horiz ? x + k : x, yy = horiz ? y : y + k;
        const q = xx < 0 || yy < 0 || xx >= W || yy >= H ? (isMin ? 1 : 0) : src[yy * W + xx];
        if (isMin ? !q : q) { v = isMin ? 0 : 1; break; }
      }
      out[y * W + x] = v;
    }
    return out;
  };
  return pass(pass(pass(pass(a, true, true), false, true), true, false), false, false);
}
const OPEN = 3;

const out = { levels: [], sprites: {} };
for (let n = 1; n <= LEVELS; n++) {
  const al = alphaOf(path.join(ROOT, 'levels/main-' + n + '.webp'), W, H), e = edge(n);
  const raw = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raw[y * W + x] = al[y * W + x] > 127 || y < at4(e.top, x + 0.5) || H - y - 1 < at4(e.bottom, x + 0.5) || x < at4(e.left, y + 0.5) || W - x - 1 < at4(e.right, y + 0.5) ? 1 : 0;
  // drop rock thinner than about 6 px (grass blades, spikes' tips): the old game tested its body at 14 points round a
  // 16 px circle and stepped its feet 3 px at a time, so it never caught on them; an exact shape would trap the spider
  const m = open(raw, OPEN);
  const solid = (x, y) => m[y * W + x] === 1;
  const rock = [];
  for (let y = 0; y < H; y += 180) for (let x = 0; x < W; x += 180) cell(solid, x, y, 180, 180, 1.0, rock);
  out.levels.push({ rock, edge: e });
  console.log('level', n, rock.length, 'polygons,', rock.reduce((s, p) => s + p.length / 2, 0), 'points; loops redone with finer detail:', fixed.eps, 'cut at a pinch:', fixed.split, 'of', fixed.loops);
}

// sprites: rasterise each SVG at 4x with ImageMagick, trace its outer outlines, back to SVG pixels
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spider-trace-'));
const want = {};
D.A.spin.forEach((a, i) => want['spin' + i] = a); D.A.elec.forEach((a, i) => want['elec' + i] = a);
D.A.portal.forEach((a, i) => want['portal' + i] = a); want.tele0 = D.A.tele[0];
['costume3', 'costume4', 'costume5'].forEach(k => want[k] = D.A.blob[k]);
for (const [name, a] of Object.entries(want)) {
  const S = 4, svg = path.join(tmp, name + '.svg'), png = path.join(tmp, name + '.rgba');
  fs.writeFileSync(svg, a.s);
  const m = a.s.match(/width="([\d.]+)" height="([\d.]+)"/), w = +m[1], h = +m[2], pw = Math.ceil(w * S), ph = Math.ceil(h * S);
  execFileSync('magick', ['-background', 'none', '-density', String(96 * S), svg, '-resize', pw + 'x' + ph + '!', '-depth', '8', 'RGBA:' + png]);
  const raw = fs.readFileSync(png), al = new Uint8Array(pw * ph); for (let i = 0; i < al.length; i++) al[i] = raw[i * 4 + 3];
  const solid = (x, y) => al[y * pw + x] > 110;
  const polys = loops(solid, 0, 0, pw, ph).filter(l => area(l) > 0).map(l => rdp(l, 1.5)).filter(l => l.length >= 3 && area(l) >= 16)
    .map(l => flat(l.map(q => [+(q[0] / S).toFixed(2), +(q[1] / S).toFixed(2)])));
  out.sprites[name] = { w, h, polys };
  console.log('sprite', name, polys.length, 'outlines,', polys.reduce((s, p) => s + p.length / 2, 0), 'points');
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(ROOT, 'levels/shapes.json'), JSON.stringify(out));
console.log('wrote levels/shapes.json', (fs.statSync(path.join(ROOT, 'levels/shapes.json')).size / 1024).toFixed(0), 'KB');
