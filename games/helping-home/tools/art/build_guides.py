#!/usr/bin/env python3
"""Pack the baked pictures of the two guides into what the game loads (needs ImageMagick, `magick`).
   python3 build_guides.py <bake_dir> [<game_dir>]        game_dir defaults to this game's folder
   In:   <bake_dir>/g-<name>.png            bake_guides.py (the child's steps, the props, the water)
         <bake_dir>/guides-meta.json        frame size, anchor, where the hands and feet are
   Out:  life/art/g/wudu.avif + wudu.json   ONE sheet and one Phaser JSON-hash atlas per guide (trimmed frames; .webp beside it)
         life/art/g/salah.avif + salah.json
         life/art/g/index.json              {fw, fh, ax, ay, k, marks, spout, ...}: what life/guides.js needs to place things
   Nothing here draws or retouches: it clears the shadow catcher's faint haze, trims, packs and converts (tools/art/enc.py)."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enc
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
BAKE = sys.argv[1]; GAME = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', '..')
GDIR = os.path.join(GAME, 'life', 'art', 'g')
MAXW, PAD = 1024, 2
META = json.load(open(os.path.join(BAKE, 'guides-meta.json')))
FW, FH, AX, AY = META['fw'], META['fh'], META['ax'], META['ay']
PROPS = ['basin', 'bench', 'footbasin', 'stream0', 'stream1', 'splash0', 'splash1']
# sheet -> [(frame name in the atlas, baked picture)]; the girl's sheets use the same frame names, so the game code is the same
SHEETS = {'wudu': [(n, n) for n in META['wudu'] + PROPS], 'salah': [(n, n) for n in META['salah']] + [('mat', 'mat')],
          'wudu-girl': [(n, 'girl-' + n) for n in META['wudu']] + [(n, n) for n in PROPS],
          'salah-girl': [(n, 'girl-' + n) for n in META['salahgirl']] + [('mat', 'mat')]}
NOSHADOW = {'stream0', 'stream1', 'splash0', 'splash1'}        # the water has no ground shadow and no haze to clear
warn = []

def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a)[:300] + '\n' + r.stderr[:400])
    return r.stdout.strip()
def newer(src, dst): return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)
def pmap(fn, xs):
    with ThreadPoolExecutor(8) as ex: return list(ex.map(fn, xs))
def clean(src):
    dst = src[:-4] + '.c.png'
    if newer(src, dst): sh('magick', src, '-channel', 'A', '-level', '8%,100%', '+channel', 'PNG32:' + dst)
    return dst
def box(png):
    if float(sh('magick', png, '-alpha', 'extract', '-format', '%[fx:maxima]', 'info:')) <= 0: return None
    w, rest = sh('magick', png, '-alpha', 'extract', '-threshold', '4%', '-format', '%@', 'info:').split('x'); h, x, y = rest.replace('+', ' ').split()
    return (int(x), int(y), int(w), int(h))
def layout(entries):
    es = sorted(entries, key=lambda e: -e['h']); x = y = rowh = 0; wmax = 0
    for e in es:
        if x + e['w'] > MAXW: x = 0; y += rowh + PAD; rowh = 0
        e['x'], e['y'] = x, y; x += e['w'] + PAD; rowh = max(rowh, e['h']); wmax = max(wmax, x - PAD)
    return wmax, y + rowh
def atlas(image, entries, W, H):
    frames = {}
    for e in entries:
        if e['name'] in NOSHADOW:      # the water is placed by its own top-centre or centre in the game, so its frame is the picture
            frames[e['name']] = {'frame': {'x': e['x'], 'y': e['y'], 'w': e['w'], 'h': e['h']}, 'rotated': False, 'trimmed': False,
                                 'spriteSourceSize': {'x': 0, 'y': 0, 'w': e['w'], 'h': e['h']}, 'sourceSize': {'w': e['w'], 'h': e['h']}}
            continue
        frames[e['name']] = {'frame': {'x': e['x'], 'y': e['y'], 'w': e['w'], 'h': e['h']}, 'rotated': False, 'trimmed': True,
                             'spriteSourceSize': {'x': e['tx'], 'y': e['ty'], 'w': e['w'], 'h': e['h']}, 'sourceSize': {'w': FW, 'h': FH}}
    return {'frames': frames, 'meta': {'image': image, 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}}

os.makedirs(GDIR, exist_ok=True); report = []
for sheet, pairs in SHEETS.items():
    names = [a for a, _ in pairs]
    srcs = [os.path.join(BAKE, 'g-%s.png' % f) for _, f in pairs]
    if not all(os.path.exists(s) for s in srcs): print('NOT BAKED YET:', sheet, [n for n, s in zip(names, srcs) if not os.path.exists(s)]); continue
    files = pmap(lambda a: a[1] if a[0] in NOSHADOW else clean(a[1]), list(zip(names, srcs)))
    boxes = pmap(box, files); ents = []
    for n, f, b in zip(names, files, boxes):
        if not b: sys.exit('empty frame ' + n)
        e = dict(name=n, file=f, tx=b[0], ty=b[1], w=b[2], h=b[3])
        if e['tx'] <= 0 or e['ty'] <= 0 or e['tx'] + e['w'] >= FW or e['ty'] + e['h'] >= FH: warn.append('%s touches the frame edge' % n)
        ents.append(e)
    W, H = layout(ents); out = os.path.join(GDIR, sheet)
    args = ['magick', '-size', '%dx%d' % (W, H), 'xc:none']
    for e in ents: args += ['(', e['file'], '-crop', '%dx%d+%d+%d' % (e['w'], e['h'], e['tx'], e['ty']), '+repage', ')', '-geometry', '+%d+%d' % (e['x'], e['y']), '-composite']
    png = os.path.join(BAKE, 'sheet-g-%s.png' % sheet); sh(*args, 'PNG32:' + png); enc.save(png, out)
    json.dump(atlas(sheet + '.avif', ents, W, H), open(out + '.json', 'w'), separators=(',', ':'))
    report.append('%-6s %4dx%-4d  avif %6.1f KB  webp %6.1f KB' % (sheet, W, H, os.path.getsize(out + '.avif') / 1024, os.path.getsize(out + '.webp') / 1024))
    for e in sorted(ents, key=lambda e: e['name']): report.append('    %-10s %3dx%-3d' % (e['name'], e['w'], e['h']))

M = META['marks']
idx = dict(fw=FW, fh=FH, ax=AX, ay=AY, k=META['k'], kc=META['kc'], wudu=META['wudu'], salah=META['salah'], salahgirl=META['salahgirl'],
           marks={k: v for k, v in M.items() if not k.startswith('girl-')}, marksG={k[5:]: v for k, v in M.items() if k.startswith('girl-')},
           spout=META['spout'], bowl=META['bowl'], footspout=META['footspout'], footbowl=META['footbowl'])
json.dump(idx, open(os.path.join(GDIR, 'index.json'), 'w'), separators=(',', ':'))
print('\n'.join(report))
print('frame %dx%d, anchor (%g, %g)' % (FW, FH, AX, AY))
if warn: print('WARNINGS:\n  ' + '\n  '.join(warn))
