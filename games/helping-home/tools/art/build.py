#!/usr/bin/env python3
"""Pack the baked frames into what the game loads, and write the game's data file.
   python3 build.py <bake_dir> [<game_dir>]        game_dir defaults to this game's folder
   Out:  life/art/bg-<place>.avif      one background per place (a room's: the floor only)
         life/art/t-<place>.avif/.json the furniture of that place (a Phaser atlas) and, for a room, its back walls as frames
                                       `wall-L` / `wall-R`; data.json art.walls[<place>] = {"L": {w, h, ax, ay}, "R": ...}: the size of
                                       the frame and the pixel (ax, ay) in it of the room's local ground point (0, 0, 0), the far corner
         life/art/ui.avif/.json        icons
         (each picture also as .webp, for a WebView too old for AVIF: see enc.py)
         life/data.json                everything in tools/data/*.json plus the size and anchor of every sprite
   Needs ImageMagick (`magick`), `avifenc` and `cwebp`. Nothing here draws or retouches: it only trims, places and converts."""
import json, os, subprocess, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import data as D, enc
BAKE = sys.argv[1]; GAME = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..')
ART = os.path.join(GAME, 'life', 'art'); os.makedirs(ART, exist_ok=True)
import shutil
def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a)[:300] + '\n' + r.stderr[:400])
    return r.stdout.strip()
def newer(src, dst): return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)
data = D.load(); art = dict(px=192, zpx=192 * 0.8660254 / 1.41421356, places={}, kinds={}, walls={}, floors={}, icons=[], people={}, you={}, animals={})
missing = []

def png_size(f):
    with open(f, 'rb') as fh: h = fh.read(24)
    return int.from_bytes(h[16:20], 'big'), int.from_bytes(h[20:24], 'big')

for pid in data['places']:
    src = os.path.join(BAKE, 'bg-%s.png' % pid)
    if not os.path.exists(src): missing.append('bg-' + pid); continue
    art['places'][pid] = json.load(open(src[:-4] + '.json'))
    if data.get('world'):               # on the one map no whole background is shipped: the town's ground is cut into tiles by town.py,
        for ext in ('.avif', '.webp', '.n.avif', '.n.webp'):      # and a room's floor goes into the room's own sheet in pieces (floor_pieces)
            f = os.path.join(ART, 'bg-%s%s' % (pid, ext))
            if os.path.exists(f): os.remove(f)
        continue
    enc.save(src, os.path.join(ART, 'bg-%s' % pid))

def clean(fn):
    """Clear the faint haze the shadow catcher leaves, and find the box that holds the picture."""
    src = os.path.join(BAKE, fn + '.png'); dst = os.path.join(BAKE, fn + '.c.png')
    if newer(src, dst): sh('magick', src, '-channel', 'A', '-level', '6%,100%', '+channel', 'PNG32:' + dst)
    w, rest = sh('magick', dst, '-format', '%@', 'info:').split('x'); h, x, y = rest.replace('+', ' ').split()
    return dict(fn=fn, w=int(w), h=int(h), tx=int(x), ty=int(y), m=json.load(open(src[:-4] + '.json')))

PIECE, BLEED = 512, 2
def floor_pieces(pid):
    """A room's floor as frames floor-<i> for the room's sheet: square pieces, each cut to what it holds (a floor is a
       diamond, so half of its rectangle is empty) and BLEED pixels over its neighbours (no hairline between them)."""
    fn = 'bg-' + pid; src = os.path.join(BAKE, fn + '.png'); dst = os.path.join(BAKE, fn + '.c.png'); idx = os.path.join(BAKE, fn + '.pieces.json')
    if newer(src, dst): shutil.copyfile(src, dst)
    m = json.load(open(src[:-4] + '.json')); W, H = int(m['w']), int(m['h']); how = [os.path.getmtime(src), PIECE, BLEED]
    got = json.load(open(idx)) if os.path.exists(idx) else None
    if not got or got[0] != how:
        boxes = []
        for i in range(-(-W // PIECE)):
            for j in range(-(-H // PIECE)):
                cw = min(PIECE + BLEED, W - i * PIECE); ch = min(PIECE + BLEED, H - j * PIECE); crop = ['magick', src, '-crop', '%dx%d+%d+%d' % (cw, ch, i * PIECE, j * PIECE), '+repage']
                if float(sh(*crop, '-format', '%[fx:mean.a]', 'info:')) < 0.002: continue
                bw, rest = sh(*crop, '-format', '%@', 'info:').split('x'); bh, bx, by = rest.replace('+', ' ').split()
                bx = int(bx) // 2 * 2; by = int(by) // 2 * 2; boxes.append([i * PIECE + bx, j * PIECE + by, min(cw - bx, (int(bw) + 3) // 2 * 2), min(ch - by, (int(bh) + 3) // 2 * 2)])
        got = [how, boxes]; json.dump(got, open(idx, 'w'))
    return [dict(fn=fn, w=b[2], h=b[3], tx=b[0], ty=b[1], m=dict(m, ax=m['ox'], ay=m['oy']), name='floor-%d' % k) for k, b in enumerate(got[1])]

def pack(sheet, entries):
    """Row-pack trimmed frames into one sheet; returns {name: {w, h, ax, ay}}."""
    boxes = sorted(entries, key=lambda b: -b['h']); PAD = 2
    def rows(maxw):
        """The row packing for a sheet at most maxw wide: ([(x, y)], used width, height)."""
        x = y = rowh = 0; pos = []; uw = 0
        for b in boxes:
            if x + b['w'] > maxw: x = 0; y += rowh + PAD; rowh = 0
            pos.append((x, y)); x += b['w'] + PAD; rowh = max(rowh, b['h']); uw = max(uw, x - PAD)
        return pos, uw, y + rowh
    # the width that wastes the least: of 1024 .. 2048 (or the widest frame, if that is wider) the one with the smallest area
    wmin = max(b['w'] for b in boxes); cands = sorted(set([max(wmin, w) for w in range(1024, 2049, 128)]))
    best = None
    for mw in cands:
        pos, uw, h = rows(mw); uw += uw % 2; fits = h <= 2048
        key = (not fits, uw * h if fits else h, uw)
        if best is None or key < best[0]: best = (key, pos, uw, h)
    _, pos, maxw, H = best
    for b, (bx_, by_) in zip(boxes, pos): b['x'], b['y'] = bx_, by_
    frames = {}; out = {}
    if H > 2048: print('WARNING: sheet %s is %d px high (over 2048)' % (sheet, H))
    args = ['magick', '-size', '%dx%d' % (maxw, H), 'xc:none']
    for b in boxes:
        args += ['(', os.path.join(BAKE, b['fn'] + '.c.png'), '-crop', '%dx%d+%d+%d' % (b['w'], b['h'], b['tx'], b['ty']), '+repage', ')', '-geometry', '+%d+%d' % (b['x'], b['y']), '-composite']
        frames[b['name']] = {'frame': {'x': b['x'], 'y': b['y'], 'w': b['w'], 'h': b['h']}, 'rotated': False, 'trimmed': False,
                             'spriteSourceSize': {'x': 0, 'y': 0, 'w': b['w'], 'h': b['h']}, 'sourceSize': {'w': b['w'], 'h': b['h']}}
        out[b['name']] = dict(w=b['w'], h=b['h'], ax=round(b['m']['ax'] - b['tx'], 1), ay=round(b['m']['ay'] - b['ty'], 1))
    png = os.path.join(BAKE, 'sheet-%s.png' % sheet); sh(*args, 'PNG32:' + png); enc.save(png, os.path.join(ART, sheet))
    json.dump({'frames': frames, 'meta': {'image': sheet + '.avif', 'size': {'w': maxw, 'h': H}, 'scale': '1'}}, open(os.path.join(ART, sheet + '.json'), 'w'), separators=(',', ':'))
    return out

# A thing that stands in two or more outdoor places (the big trees, a lamp, a bench, a bin) is packed ONCE, into the
# sheet t-out that every outdoor place shares; a place's own sheet holds only what is its alone. (Packed per place,
# the same two big trees were in memory four times over.)
uses = {}
for pid, sp in data['places'].items():
    if sp.get('outdoor') and data.get('world'):
        for n in set(D.sprites_of(data, pid, buildings=False)): uses[n] = uses.get(n, 0) + 1
shared = sorted(n for n, c in uses.items() if c > 1); art['sheets'] = []
ent = []
for n in shared:
    if not os.path.exists(os.path.join(BAKE, 'k-%s.png' % n)): missing.append('k-' + n); continue
    e = clean('k-' + n); e['name'] = n; ent.append(e)
if ent: art['kinds'].update(pack('t-out', ent)); art['sheets'].append('t-out')
for pid in data['places']:
    ent = []
    for n in D.sprites_of(data, pid, buildings=False):
        if data['places'][pid].get('outdoor') and n in shared: continue
        if not os.path.exists(os.path.join(BAKE, 'k-%s.png' % n)): missing.append('k-' + n); continue
        e = clean('k-' + n); e['name'] = n; ent.append(e)
    sp = data['places'][pid]
    if not sp.get('outdoor'):               # a room's back walls go into its own atlas, as frames wall-L / wall-R
        for wl in sp.get('walls', ['L', 'R']):
            if not os.path.exists(os.path.join(BAKE, 'wall-%s-%s.png' % (pid, wl))): missing.append('wall-%s-%s' % (pid, wl)); continue
            e = clean('wall-%s-%s' % (pid, wl)); e['name'] = 'wall-' + wl; ent.append(e)
        if data.get('world') and os.path.exists(os.path.join(BAKE, 'bg-%s.png' % pid)): ent += floor_pieces(pid)
    if ent:
        m = pack('t-' + pid, ent); art['sheets'].append('t-' + pid)
        for n, v in m.items():
            if n.startswith('wall-'): art['walls'].setdefault(pid, {})[n[5:]] = v
            elif n.startswith('floor-'): art['floors'].setdefault(pid, {})[n] = v
            else: art['kinds'][n] = v
ent = []
for n in D.decor_sprites(data):
    if not os.path.exists(os.path.join(BAKE, 'k-%s.png' % n)): missing.append('k-' + n); continue
    e = clean('k-' + n); e['name'] = n; ent.append(e)
if ent: art['kinds'].update(pack('t-decor', ent)); art['decor'] = True
art['packs'] = []; ui_extra = []
for pname, lst in data.get('packs', {}).items():
    ent = []
    for n in lst:
        if not os.path.exists(os.path.join(BAKE, 'k-%s.png' % n)): missing.append('k-' + n); continue
        e = clean('k-' + n); e['name'] = n; ent.append(e)
    if pname == 'ui': ui_extra = ent
    elif ent: art['kinds'].update(pack('t-' + pname, ent)); art['packs'].append(pname)
ent = []
for f in sorted(glob.glob(os.path.join(BAKE, 'i-*.png'))):
    if f.endswith('.c.png'): continue
    n = os.path.basename(f)[:-4]; e = clean(n); e['name'] = n; ent.append(e)
icons = [e['name'] for e in ent]
ent += [e for e in ui_extra if e['name'] not in icons]
# things that can be carried about or left anywhere (a ball, a toy) also go on the icon sheet, so every place can show them
for k, kd in data['kinds'].items():
    n = D.sprite(k, 0, (kd.get('states') or [None])[0])
    if kd.get('act') in ('pickup', 'kick', 'ride') and n not in [e['name'] for e in ent] and os.path.exists(os.path.join(BAKE, 'k-%s.png' % n)):
        e = clean('k-' + n); e['name'] = n; ent.append(e)
if ent:
    m = pack('ui', ent); art['icons'] = sorted(icons)
    for n in m:
        if n not in icons: art['kinds'].setdefault(n, m[n])
# people and the player's layers are packed by their own tool, which leaves an index beside its sheets
for k, sub in (('people', 'p'), ('you', 'you'), ('animals', 'a')):
    idx = os.path.join(ART, sub, 'index.json')
    if os.path.exists(idx): art[k] = json.load(open(idx))
for pid in data['places']:                # the sheet of a place that has none any more
    if 't-' + pid not in art['sheets']:
        for ext in ('.avif', '.webp', '.json', '.n.avif', '.n.webp'):
            f = os.path.join(ART, 't-%s%s' % (pid, ext))
            if os.path.exists(f): os.remove(f)
import town; town.finish(data, art, BAKE, ART)      # the one map: ground tiles, the outsides of buildings, the far picture
data['art'] = art
json.dump(data, open(os.path.join(GAME, 'life', 'data.json'), 'w'), separators=(',', ':'))
tot = old = 0
for root, _, files in os.walk(ART):
    for f in files:
        if f.endswith(('.n.avif', '.n.webp')): os.remove(os.path.join(root, f)); continue      # surface maps of an earlier build: the game lights with tints, and loads none
        if f.endswith('.webp'): old += os.path.getsize(os.path.join(root, f))
        else: tot += os.path.getsize(os.path.join(root, f))
print('art the game downloads %.0f KB (the WebP copies for old WebViews, not downloaded: %.0f KB); data.json %.1f KB' % (tot / 1024, old / 1024, os.path.getsize(os.path.join(GAME, 'life', 'data.json')) / 1024))
if missing: print('NOT BAKED YET:', ' '.join(missing))
