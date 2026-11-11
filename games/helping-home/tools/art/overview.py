#!/usr/bin/env python3
"""The whole town in one picture (plain Python + Pillow, no Blender): the game shows it when the camera is zoomed far out.
   python3.14 tools/art/overview.py <bake_dir> [--preview <file.png>]        (any Python that has Pillow; this script finds one)

What it draws, from the baked PNG frames in <bake_dir> and tools/data/*.json: every outdoor place's ground (bg-<id>) at its world
position, then every thing of the outdoor places that is not `fixed` (in its first state, as its rot-0 sprite or the rot the
thing has), all sorted back to front by the depth (x + y) of the thing's anchor. No people, no vehicles, and not the
outsides of the buildings (tools/art/town.py makes those, large and small, as pictures of their own). (One global sort rather than zone by zone: the buildings and trees that
stand on the back edges of the world belong to a zone in FRONT of the ground they overlap.)

Writes life/art/overview.avif / .webp (through enc.save), a quarter-size copy overview.s (always in memory in the game:
what shows where a ground tile has not arrived yet) and life/art/overview.json = {"scale", "w", "h", "ox", "oy", "small"}.

CONVENTION. World (x, y) metres is at screen ((y - x) * 96, (x + y) * 48) full-resolution pixels (a tile is 192 x 96 on screen).
The picture is `w` x `h` pixels and is `scale` (1/3) the size of the real thing. `ox`, `oy` are FULL-RESOLUTION pixels: the
position of world (0, 0) inside the uncropped canvas, i.e. the picture, drawn at 1 / scale times its size with its top-left at
(-ox, -oy) in those screen coordinates, lines up with the world. (Pixel (i, j) of the picture covers the full-resolution
square from (-ox + i / scale, -oy + j / scale).) ox and oy are multiples of 1 / scale, so a pixel of the picture is a whole
number of full-resolution pixels."""
import os, sys, json, shutil, subprocess
try:
    from PIL import Image
except ImportError:
    for exe in ('python3.14', 'python3.13', 'python3.12', 'python3.11', 'python3.10', '/usr/local/bin/python3', '/usr/bin/python3'):
        p = shutil.which(exe)
        if p and subprocess.run([p, '-c', 'import PIL'], capture_output=True).returncode == 0 and os.path.realpath(p) != os.path.realpath(sys.executable):
            os.execv(p, [p] + sys.argv)
    sys.exit('needs Pillow (pip install pillow), e.g. python3.14')
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import data as D, enc
GAME = os.path.normpath(os.path.join(HERE, '..', '..')); ART = os.path.join(GAME, 'life', 'art')
TEST = '--test-scale' in sys.argv        # debugging: --test-scale N writes only the --preview picture at 1/N size (1 = full size), nothing in life/art
INV = int(sys.argv[sys.argv.index('--test-scale') + 1]) if TEST else 3
SCALE = 1 / INV                        # the picture is a third of the real size
TX, TY = 96, 48                        # screen pixels per metre along the two ground axes
args = [a for a in sys.argv[1:2] if not a.startswith('--')]
BAKE = args[0] if args else os.environ.get('HH_BAKE')
if not BAKE: sys.exit(__doc__)
PREVIEW = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None

def haze(im):
    """The faint haze the shadow catcher leaves round a sprite is cleared the way build.py does it (alpha level 6% .. 100%)."""
    a = im.getchannel('A').point(lambda v: 0 if v <= 15 else min(255, int((v - 15) * 255 / 240)))
    im.putalpha(a); return im

def load(fn, clean):
    f = os.path.join(BAKE, fn + '.png')
    if not os.path.exists(f): return None
    im = Image.open(f).convert('RGBA'); meta = json.load(open(os.path.join(BAKE, fn + '.json')))
    if clean: im = haze(im)
    return im, meta

def small(im):
    w, h = max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))
    return im.resize((w, h), Image.LANCZOS)

data = D.load(); places = data['places']; kinds = data['kinds']
outdoor = {pid: p for pid, p in places.items() if p.get('outdoor') and p.get('at')}
items = []                             # (kind of layer, depth key, image, left, top) in full-resolution screen coordinates
zones = sorted(outdoor, key=lambda z: outdoor[z]['at'][0] + outdoor[z]['size'][0] / 2 + outdoor[z]['at'][1] + outdoor[z]['size'][1] / 2)
for z in zones:
    p = outdoor[z]; got = load('bg-' + z, False)
    if not got: print('no bg-' + z); continue
    im, m = got; ax, ay = p['at']
    items.append((0, zones.index(z), im, (ay - ax) * TX - m['ox'], (ax + ay) * TY - m['oy']))
for i, e in enumerate(((data.get('world') or {}).get('roads') or {}).get('out', [])):      # the main road where it leaves the town (cut by town.py)
    f = os.path.join(BAKE, 'bg-%s.m.png' % e['id'])
    if not os.path.exists(f): continue
    m = json.load(open(os.path.join(BAKE, 'bg-%s.json' % e['id']))); ax, ay = e['at']
    items.append((0, len(zones) + i, Image.open(f).convert('RGBA'), (ay - ax) * TX - m['ox'], (ax + ay) * TY - m['oy']))
missing = []
for z in zones:
    p = outdoor[z]; ax, ay = p['at']
    for t in p.get('things', []):
        k = kinds[t['kind']]
        if k.get('fixed') or t.get('fixed') or k.get('building'): continue      # (a building's outside is its own picture: it must be able to go when the child is inside)
        st = t.get('state') or (k.get('states') or [None])[0]
        name = D.sprite(t['kind'], t.get('rot', 0), st)
        got = load('k-' + name, True)
        if not got: missing.append(name); continue
        im, m = got; X, Y = ax + t['at'][0], ay + t['at'][1]
        layer = 1 if k.get('layer') == 'floor' else 2
        items.append((layer, X + Y, im, (Y - X) * TX - m['ax'], (X + Y) * TY - m['ay']))
items.sort(key=lambda i: (i[0], i[1]))
# the canvas
l = min(i[3] for i in items); t_ = min(i[4] for i in items); r = max(i[3] + i[2].width for i in items); b = max(i[4] + i[2].height for i in items)
L = int(l // INV * INV) - INV; T = int(t_ // INV * INV) - INV
W = int((r - L) / INV) + 2; H = int((b - T) / INV) + 2
canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for (_, _, im, x, y) in items:
    sm = small(im); px = round((x - L) / INV); py = round((y - T) / INV)
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0)); layer.paste(sm, (px, py)); canvas = Image.alpha_composite(canvas, layer)
bb = canvas.getchannel('A').getbbox(); canvas = canvas.crop(bb); L += bb[0] * INV; T += bb[1] * INV
png = os.path.join(BAKE, 'overview.png'); canvas.save(png)
if PREVIEW:
    bgc = Image.new('RGBA', canvas.size, (233, 226, 208, 255)); bgc.alpha_composite(canvas); bgc.convert('RGB').save(PREVIEW)
if not TEST:
    enc.save(png, os.path.join(ART, 'overview'))
    # a tiny copy that is always in memory: what shows for a moment where a ground tile has not arrived yet
    tiny = os.path.join(BAKE, 'overview.s.png'); canvas.resize((max(1, canvas.width // 4), max(1, canvas.height // 4)), Image.LANCZOS).save(tiny)
    enc.save(tiny, os.path.join(ART, 'overview.s'))
    json.dump({'scale': 0.333333, 'w': canvas.width, 'h': canvas.height, 'ox': -L, 'oy': -T, 'small': 0.25}, open(os.path.join(ART, 'overview.json'), 'w'))
print('overview %dx%d  ox %d oy %d  (%d things, %d bgs)%s' % (canvas.width, canvas.height, -L, -T, len(items) - len(zones), len(zones), ('  missing sprites: ' + ' '.join(sorted(set(missing)))) if missing else ''))
