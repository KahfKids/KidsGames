#!/usr/bin/env python3
"""Pack the baked animal frames into what the game loads (needs ImageMagick, `magick`).
   python3 build_animals.py <bake_dir> [<game_dir>] [id ...]        game_dir defaults to this game's folder
   In:   <bake_dir>/a-<id>-<frame>.png          the animal alone, and a-<id>-<frame>-sh.png its soft shadow alone (bake_animals.py)
         <bake_dir>/animals-meta.json           per animal: h, frame size, anchor, frame names
   Out:  life/art/a/<id>.avif (+ .webp) + <id>.json      one Phaser JSON-hash atlas per animal, trimmed frames
         life/art/a/index.json                           {id: {h, fw, fh, ax, ay, frames}}
   Nothing here draws: it clears the shadow catcher's faint haze, smooths the shadow a touch (the penumbra is soft anyway; the animal itself is
   not touched), lays the animal over it, trims, packs, fills the colour under fully clear pixels with the colour next to it (invisible, but
   it leaves no hard edge for the encoder to pay for) and converts."""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enc
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
BAKE = args[0]; rest = args[1:]
GAME = rest[0] if rest and os.path.isdir(rest[0]) else os.path.join(HERE, '..', '..')
ONLY = [a for a in rest if not os.path.isdir(a)]
ADIR = os.path.join(GAME, 'life', 'art', 'a')
MAXW, PAD = 1024, 2
SHADOW_BLUR = float(os.environ.get('AN_SB', 1.2))          # px: smoothing of the shadow alone
AQ = int(os.environ.get('AN_AQ', 6))                      # levels of the animal's own edge opacity (6 levels; 0 = as rendered)
BLEED = int(os.environ.get('AN_BLEED', 0))                # fill the colour under clear pixels (it made the files bigger, so off)
ALIGN = int(os.environ.get('AN_ALIGN', 1))               # boxes and places on a grid of this many px (the encoder's blocks)
META = json.load(open(os.path.join(BAKE, 'animals-meta.json')))
warn = []

def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a)[:300] + '\n' + r.stderr[:400])
    return r.stdout.strip()
def newer(src, dst): return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)
def pmap(fn, xs):
    with ThreadPoolExecutor(8) as ex: return list(ex.map(fn, xs))
def clean(src):
    """The frame as the game will see it: the shadow alone (haze cleared as build_people.py does, then smoothed), the animal laid over it."""
    dst = src[:-4] + '.c.png'; shp = src[:-4] + '-sh.png'
    if newer(src, dst) or newer(shp, dst):
        w, h = sh('magick', src, '-format', '%w %h', 'info:').split()
        sha = src[:-4] + '.sa.png'
        sh('magick', shp, '-alpha', 'extract', '-level', '6%,100%', '-blur', '0x%g' % SHADOW_BLUR, sha)
        sh('magick', '-size', '%sx%s' % (w, h), 'xc:black', sha, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite',
           *(['(', src, '-alpha', 'off', '(', src, '-alpha', 'extract', '-posterize', str(AQ), ')', '-compose', 'CopyOpacity', '-composite', ')'] if AQ else [src]), '-compose', 'Over', '-composite', 'PNG32:' + dst)
    return dst
def bleed(png):
    """Give the fully clear pixels the colour of what is near them (a pyramid of blurs, so it reaches everywhere); every pixel
    that has any opacity keeps its own colour and its alpha, so nothing visible changes. Returns the new file."""
    import shutil, tempfile
    out = png[:-4] + '.filled.png'; d = tempfile.mkdtemp(prefix='bleed-', dir=os.path.dirname(png)); f = lambda n: os.path.join(d, n + '.png')
    sh('magick', png, '-alpha', 'extract', '-colorspace', 'sRGB', '-type', 'TrueColor', '-define', 'png:color-type=2', f('A')); sh('magick', png, '-alpha', 'off', f('RGB'))
    sh('magick', f('RGB'), f('A'), '-compose', 'Multiply', '-composite', f('P'))
    for s_ in (2, 8, 32, 128):
        sh('magick', f('A'), '-blur', '0x%d' % s_, '-define', 'png:color-type=2', f('W%d' % s_)); sh('magick', f('P'), '-blur', '0x%d' % s_, f('Q%d' % s_))
        sh('magick', f('W%d' % s_), f('Q%d' % s_), '-compose', 'Divide_Src', '-composite', f('F%d' % s_))
        sh('magick', f('W%d' % s_), '-level', '0,1%', f('M%d' % s_))
    args = [f('F128')]
    for s_ in (32, 8, 2): args += ['(', f('F%d' % s_), f('M%d' % s_), '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', ')', '-compose', 'Over', '-composite']
    args += ['(', f('RGB'), '(', f('A'), '-threshold', '0', ')', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', ')', '-compose', 'Over', '-composite', '-alpha', 'off']
    sh('magick', *args, f('BL'))
    sh('magick', f('BL'), f('A'), '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', 'PNG32:' + out)
    shutil.rmtree(d)
    return out
def box(png):
    if float(sh('magick', png, '-alpha', 'extract', '-format', '%[fx:maxima]', 'info:')) <= 0: return None
    w, rest = sh('magick', png, '-alpha', 'extract', '-threshold', '3%', '-format', '%@', 'info:').split('x'); h, x, y = rest.replace('+', ' ').split()
    return (int(x), int(y), int(w), int(h))
def layout(entries):
    es = sorted(entries, key=lambda e: -e['h']); x = y = rowh = 0; wmax = 0; pad = PAD if ALIGN == 1 else 0
    for e in es:
        if x + e['w'] > MAXW: x = 0; y += rowh + pad; rowh = 0
        e['x'], e['y'] = x, y; x += e['w'] + pad; rowh = max(rowh, e['h']); wmax = max(wmax, x - pad)
    return wmax, y + rowh
def atlas(image, entries, W, H, FW, FH):
    frames = {e['name']: {'frame': {'x': e['x'], 'y': e['y'], 'w': e['w'], 'h': e['h']}, 'rotated': False, 'trimmed': True,
                          'spriteSourceSize': {'x': e['tx'], 'y': e['ty'], 'w': e['w'], 'h': e['h']}, 'sourceSize': {'w': FW, 'h': FH}} for e in entries}
    return {'frames': frames, 'meta': {'image': image, 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}}

os.makedirs(ADIR, exist_ok=True)
idx_path = os.path.join(ADIR, 'index.json')
idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
report = []
for aid, info in META.items():
    if ONLY and aid not in ONLY: continue
    FW, FH = info['fw'], info['fh']; names = info['frames']
    srcs = [os.path.join(BAKE, 'a-%s-%s.png' % (aid, n)) for n in names]
    if not all(os.path.exists(s) for s in srcs): print('NOT BAKED YET:', aid); continue
    cleaned = pmap(clean, srcs); boxes = pmap(box, cleaned); ents = []
    for n, c, b in zip(names, cleaned, boxes):
        if not b: sys.exit('empty frame %s %s' % (aid, n))
        e = dict(name=n, file=c, tx=b[0], ty=b[1], w=b[2], h=b[3])
        if ALIGN > 1:
            g = ALIGN; w2 = -(-e['w'] // g) * g; h2 = -(-e['h'] // g) * g
            e['tx'] = max(0, min(FW - w2, e['tx'] - (w2 - e['w']) // 2)); e['ty'] = max(0, min(FH - h2, e['ty'] - (h2 - e['h']) // 2)); e['w'], e['h'] = w2, h2
        ents.append(e)
        if e['tx'] <= 0 or e['ty'] <= 0 or e['tx'] + e['w'] >= FW or e['ty'] + e['h'] >= FH: warn.append('%s/%s touches the frame edge' % (aid, n))
    W, H = layout(ents); out = os.path.join(ADIR, aid)
    args_ = ['magick', '-size', '%dx%d' % (W, H), 'xc:none']
    for e in ents: args_ += ['(', e['file'], '-crop', '%dx%d+%d+%d' % (e['w'], e['h'], e['tx'], e['ty']), '+repage', ')', '-geometry', '+%d+%d' % (e['x'], e['y']), '-composite']
    png = os.path.join(BAKE, 'sheet-a-%s.png' % aid); sh(*args_, 'PNG32:' + png); enc.save(bleed(png) if BLEED else png, out)
    json.dump(atlas(aid + '.avif', ents, W, H, FW, FH), open(out + '.json', 'w'), separators=(',', ':'))
    idx[aid] = dict(h=info['h'], fw=FW, fh=FH, ax=info['ax'], ay=info['ay'], frames=list(names))
    report.append('%-9s sheet %4dx%-4d  avif %6.1f KB   webp %6.1f KB   frame %dx%d  anchor (%g, %.1f)' % (aid, W, H, os.path.getsize(out + '.avif') / 1024, os.path.getsize(out + '.webp') / 1024, FW, FH, info['ax'], info['ay']))
order = [i for i in META if i in idx]
json.dump({i: idx[i] for i in order}, open(idx_path, 'w'), indent=1)
print('\n'.join(report))
if warn: print('WARNINGS:\n  ' + '\n  '.join(warn))
