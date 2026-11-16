#!/usr/bin/env python3
"""Where each of the child's layers lies in the `idle` frame, for the character maker's tab pictures.
   python3 tools/art/you_boxes.py            (run after build_people.py; needs ImageMagick, `magick`)
   In:   life/art/you/<set>.json + <set>-<layer>.webp     the layer sheets build_people.py packed
   Out:  life/art/you/boxes.json   { "<set>": { "<layer>": [x, y, w, h], ..., "head": [x, y, w, h] } }
         x, y in the idle frame's untrimmed space (sourceSize, 288 x 288: the space Phaser sizes, crops and places a
         trimmed frame in, as the figure's origin is); `head` is the skin above the collar.
   The maker shows a garment by cropping the same sprite frame the figure uses to that box and tinting it, so its
   tab pictures are the real rendered clothes, not drawings. Nothing is drawn here: it only measures."""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); YDIR = os.path.join(HERE, '..', '..', 'life', 'art', 'you')
def sh(*a): return subprocess.run(a, capture_output=True, text=True, check=True).stdout.strip()
def box(img, crop):
    """(x, y, w, h) of what is seen (over 3% opacity) inside crop = (x, y, w, h) of img, relative to the crop; None if empty."""
    x, y, w, h = crop
    g = sh('magick', img, '-crop', '%dx%d+%d+%d' % (w, h, x, y), '+repage', '-alpha', 'extract', '-threshold', '3%', '-format', '%@ %[fx:maxima]', 'info:')
    geo, mx = g.split()
    if float(mx) <= 0: return None
    bw, rest = geo.split('x'); bh, bx, by = rest.replace('+', ' ').split()
    return [int(bx), int(by), int(bw), int(bh)]
idx = json.load(open(os.path.join(YDIR, 'index.json'))); out = {}
for s, info in idx.items():
    F = json.load(open(os.path.join(YDIR, s + '.json')))['frames']['idle']; f = F['frame']; fr = (f['x'], f['y'], f['w'], f['h']); ox, oy = F['spriteSourceSize']['x'], F['spriteSourceSize']['y']
    b = {}
    for l in info['layers']:
        if l in ('shadow', 'bike'): continue
        r = box(os.path.join(YDIR, '%s-%s.webp' % (s, l)), fr)
        if r: b[l] = r
    if 'skin' in b and 'top' in b:                     # the head: the skin above the top of the clothes
        cut = b['top'][1] + 4
        h = box(os.path.join(YDIR, '%s-skin.webp' % s), (fr[0], fr[1], fr[2], cut))
        if h: b['head'] = h
    out[s] = {k: [v[0] + ox, v[1] + oy, v[2], v[3]] for k, v in b.items()}
json.dump(out, open(os.path.join(YDIR, 'boxes.json'), 'w'), indent=1)
print(json.dumps(out))
