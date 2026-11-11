#!/usr/bin/env python3
"""Pack the baked people frames into what the game loads (needs ImageMagick, `magick`).
   python3 build_people.py <bake_dir> [<game_dir>]        game_dir defaults to this game's folder
   In:   <bake_dir>/p-<id>-<frame>.png                    the cast (bake_people.py cast)
         <bake_dir>/you-<set>-<layer>-<frame>.png         the child's layers (bake_people.py you)
         <bake_dir>/people-meta.json                      frame size, anchor, who is in the cast, the sets
   Out:  life/art/p/<id>.avif + <id>.json                 one Phaser JSON-hash atlas per person, trimmed frames
         life/art/p/cast.avif + cast.json                 the Friends panel portraits: one head-and-shoulders frame per person id
         life/art/p/index.json                            {id: {h, fw, fh, ax, ay, frames}}
         life/art/you/<set>-<layer>.avif                  one sheet per layer, every frame at the same place in each
         life/art/you/<set>.json                          ONE atlas valid for every layer of the set
         life/art/you/index.json                          {set: {layers, h, fw, fh, ax, ay, frames}}
   Nothing here draws or retouches: it clears the shadow catcher's faint haze, trims, packs and converts."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enc
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
BAKE = sys.argv[1]; GAME = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..')
ART = os.path.join(GAME, 'life', 'art'); PDIR = os.path.join(ART, 'p'); YDIR = os.path.join(ART, 'you')
MAXW, PAD = 1024, 2
META = json.load(open(os.path.join(BAKE, 'people-meta.json')))
FW, FH, AX, AY = META['fw'], META['fh'], META['ax'], META['ay']
warn = []

def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a)[:300] + '\n' + r.stderr[:400])
    return r.stdout.strip()
def newer(src, dst): return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)
def pmap(fn, xs):
    with ThreadPoolExecutor(8) as ex: return list(ex.map(fn, xs))

def clean(src):
    """Clear the faint haze the shadow catcher leaves (as build.py does); returns the cleaned file."""
    dst = src[:-4] + '.c.png'
    if newer(src, dst): sh('magick', src, '-channel', 'A', '-level', '6%,100%', '+channel', 'PNG32:' + dst)
    return dst
def box(png):
    """The box the picture covers, (x, y, w, h), or None when nothing is drawn."""
    if float(sh('magick', png, '-alpha', 'extract', '-format', '%[fx:maxima]', 'info:')) <= 0: return None
    # what counts is what can be seen: pixels under 3% opacity (the tail of the soft shadow) do not decide the box
    w, rest = sh('magick', png, '-alpha', 'extract', '-threshold', '3%', '-format', '%@', 'info:').split('x'); h, x, y = rest.replace('+', ' ').split()
    return (int(x), int(y), int(w), int(h))
def union(boxes):
    boxes = [b for b in boxes if b]
    if not boxes: return None
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[0] + b[2] for b in boxes); y1 = max(b[1] + b[3] for b in boxes)
    return (x0, y0, x1 - x0, y1 - y0)

def layout(entries):
    """Row-pack boxes (each has w, h) into a sheet at most MAXW wide: sets x, y on each; returns (width, height)."""
    es = sorted(entries, key=lambda e: -e['h']); x = y = rowh = 0; wmax = 0
    for e in es:
        if x + e['w'] > MAXW: x = 0; y += rowh + PAD; rowh = 0
        e['x'], e['y'] = x, y; x += e['w'] + PAD; rowh = max(rowh, e['h']); wmax = max(wmax, x - PAD)
    return wmax, y + rowh

def atlas(image, entries, W, H):
    frames = {}
    for e in entries:
        frames[e['name']] = {'frame': {'x': e['x'], 'y': e['y'], 'w': e['w'], 'h': e['h']}, 'rotated': False, 'trimmed': True,
                             'spriteSourceSize': {'x': e['tx'], 'y': e['ty'], 'w': e['w'], 'h': e['h']}, 'sourceSize': {'w': FW, 'h': FH}}
    return {'frames': frames, 'meta': {'image': image, 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}}

def edge_check(label, e):
    if e['tx'] <= 0 or e['ty'] <= 0 or e['tx'] + e['w'] >= FW or e['ty'] + e['h'] >= FH: warn.append('%s touches the frame edge' % label)

def sheet(path, entries, W, H, src):
    """One sheet (path without extension; enc.py writes it as .avif and .webp): each entry's file (src(e)) cropped to its
    box and placed at (x, y)."""
    args = ['magick', '-size', '%dx%d' % (W, H), 'xc:none']
    for e in entries:
        if src(e) is None: continue
        args += ['(', src(e), '-crop', '%dx%d+%d+%d' % (e['w'], e['h'], e['tx'], e['ty']), '+repage', ')', '-geometry', '+%d+%d' % (e['x'], e['y']), '-composite']
    png = os.path.join(BAKE, 'sheet-%s-%s.png' % (os.path.basename(os.path.dirname(path)), os.path.basename(path)))
    sh(*args, 'PNG32:' + png); enc.save(png, path)

# ---------- the cast ----------
os.makedirs(PDIR, exist_ok=True); pidx = {}; report = []
for pid, info in META['cast'].items():
    names = META['frames']; srcs = [os.path.join(BAKE, 'p-%s-%s.png' % (pid, n)) for n in names]
    if not all(os.path.exists(s) for s in srcs): print('NOT BAKED YET:', pid); continue
    cleaned = pmap(clean, srcs); boxes = pmap(box, cleaned); ents = []
    for n, c, b in zip(names, cleaned, boxes):
        if not b: sys.exit('empty frame %s %s' % (pid, n))
        e = dict(name=n, file=c, tx=b[0], ty=b[1], w=b[2], h=b[3]); edge_check('%s/%s' % (pid, n), e); ents.append(e)
    W, H = layout(ents); out = os.path.join(PDIR, pid)
    sheet(out, ents, W, H, lambda e: e['file'])
    json.dump(atlas(pid + '.avif', ents, W, H), open(os.path.join(PDIR, pid + '.json'), 'w'), separators=(',', ':'))
    pidx[pid] = dict(h=info['h'], fw=FW, fh=FH, ax=AX, ay=AY, frames=list(names))
    report.append('%-8s %4dx%-4d %6.1f KB' % (pid, W, H, os.path.getsize(out + '.avif') / 1024))
if pidx: json.dump(pidx, open(os.path.join(PDIR, 'index.json'), 'w'), indent=1)

# ---------- portraits for the Friends panel: cast.webp (one head-and-shoulders picture per person) ----------
PH, PW = 160, 192
def portraits():
    """The baked front `idle` frame of each person, cropped to head and shoulders and scaled to PH px tall: no new render,
    no shadow (the crop is above the ground), a soft fade at the bottom edge where the body is cut."""
    K = META['px'] * 0.8660254 / 1.41421356; ents = []; tmp = []
    for pid, info in META['cast'].items():
        c = os.path.join(BAKE, 'p-%s-idle.c.png' % pid)
        if not os.path.exists(c): print('NOT BAKED YET: portrait', pid); return
        tx, ty, w, h = box(c); ch = int(round(min(76, 0.55 * info["h"] * K))); cw = int(round(ch * PW / PH)); y0 = ty - 4
        r = sh('magick', c, '-crop', '%dx%d+0+%d' % (FW, ch, y0), '+repage', '-alpha', 'extract', '-threshold', '20%', '-format', '%@', 'info:')
        w2, rest = r.split('x'); h2, x2, y2 = rest.replace('+', ' ').split(); cx = int(x2) + int(w2) / 2
        x0 = max(0, min(FW - cw, int(round(cx - cw / 2))))
        out = os.path.join(BAKE, 'portrait-%s.png' % pid); tmp.append(out)
        mask = ['(', '-size', '%dx%d' % (PW, PH), 'xc:white', '(', '-size', '%dx26' % PW, 'gradient:white-black', ')', '-geometry', '+0+%d' % (PH - 26), '-composite', '-colorspace', 'Gray', ')']
        sh('magick', c, '-crop', '%dx%d+%d+%d' % (cw, ch, x0, y0), '+repage', '-filter', 'Lanczos', '-resize', '%dx%d!' % (PW, PH),
           '(', '+clone', '-alpha', 'extract', *mask, '-compose', 'Multiply', '-composite', ')', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', 'PNG32:' + out)
        ents.append(dict(name=pid, file=out, tx=0, ty=0, w=PW, h=PH))
    cols = 4; W = cols * PW + (cols - 1) * PAD; H = ((len(ents) + cols - 1) // cols) * (PH + PAD) - PAD
    for i, e in enumerate(ents): e['x'] = (i % cols) * (PW + PAD); e['y'] = (i // cols) * (PH + PAD)
    sheet(os.path.join(PDIR, 'cast'), ents, W, H, lambda e: e['file'])
    fr = {e['name']: {'frame': {'x': e['x'], 'y': e['y'], 'w': PW, 'h': PH}, 'rotated': False, 'trimmed': False,
                      'spriteSourceSize': {'x': 0, 'y': 0, 'w': PW, 'h': PH}, 'sourceSize': {'w': PW, 'h': PH}} for e in ents}
    json.dump({'frames': fr, 'meta': {'image': 'cast.avif', 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}}, open(os.path.join(PDIR, 'cast.json'), 'w'), separators=(',', ':'))
    report.append('%-8s %4dx%-4d %6.1f KB   (portraits: %d people, %dx%d each)' % ('cast', W, H, os.path.getsize(os.path.join(PDIR, 'cast.avif')) / 1024, len(ents), PW, PH))
portraits()

# ---------- the child's own character ----------
os.makedirs(YDIR, exist_ok=True); yidx = {}
for sname, info in META['you'].items():
    layers = info['layers']; names = META['you_frames']
    # `bike` exists only in the ride frames; everywhere else that layer is simply empty
    srcs = {(l, n): os.path.join(BAKE, 'you-%s-%s-%s.png' % (sname, l, n)) for l in layers for n in names if l != 'bike' or n.startswith('ride')}
    if not all(os.path.exists(s) for s in srcs.values()): print('NOT BAKED YET:', sname); continue
    files = dict(srcs)
    for (l, n), s in srcs.items():
        if l == 'shadow': files[(l, n)] = clean(s)      # only the shadow has haze; the body layers are left as rendered
    keys = list(files); boxes = dict(zip(keys, pmap(lambda k: box(files[k]), keys)))
    ents = []
    for n in names:
        u = union([boxes.get((l, n)) for l in layers])
        if not u: sys.exit('empty frame %s %s' % (sname, n))
        e = dict(name=n, tx=u[0], ty=u[1], w=u[2], h=u[3]); edge_check('%s/%s' % (sname, n), e); ents.append(e)
    W, H = layout(ents)
    for l in layers:
        out = os.path.join(YDIR, '%s-%s' % (sname, l))
        sheet(out, ents, W, H, lambda e, l=l: files.get((l, e['name'])))
        report.append('%-22s %4dx%-4d %6.1f KB' % (sname + '-' + l, W, H, os.path.getsize(out + '.avif') / 1024))
    json.dump(atlas('%s-%s.avif' % (sname, layers[0]), ents, W, H), open(os.path.join(YDIR, sname + '.json'), 'w'), separators=(',', ':'))
    yidx[sname] = dict(layers=layers, h=info['h'], fw=FW, fh=FH, ax=AX, ay=AY, frames=list(names))
if yidx: json.dump(yidx, open(os.path.join(YDIR, 'index.json'), 'w'), indent=1)

print('\n'.join(report))
print('frame %dx%d, anchor (%g, %g)' % (FW, FH, AX, AY))
if warn: print('WARNINGS:\n  ' + '\n  '.join(warn))
