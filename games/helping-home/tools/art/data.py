"""The game's data, shared by the art tools and the game (plain Python, no Blender).
Sources: tools/data/*.json, each {"kinds": {...}, "places": {...}, "people": {...}, "items": {...}} (any may be missing).
build.py merges them, with the sprite sizes, into life/data.json, which is what the game loads."""
import json, os, glob
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, '..', 'data')
KEYS = ('kinds', 'places', 'people', 'items', 'you', 'decor', 'animals')

def load():
    out = {k: {} for k in KEYS}
    for f in sorted(glob.glob(os.path.join(SRC, '*.json'))):
        d = json.load(open(f))
        for k in KEYS: out[k].update(d.get(k, {}))
        if d.get('rewards'): out['rewards'] = d['rewards']      # the order in which won things are given
        for name, lst in d.get('packs', {}).items():           # extra sprites packed together (vehicles ...)
            out.setdefault('packs', {}).setdefault(name, [])
            out['packs'][name] += [n for n in lst if n not in out['packs'][name]]
        if d.get('world'): out['world'] = d['world']            # the one map every place sits on (roads, open ground between zones)
    # open ground between two neighbouring outdoor zones: a pair of doors with no picture, which the game makes seamless
    for i, g in enumerate((out.get('world') or {}).get('gates', [])):
        a, wa, pa, w, b, wb, pb = g
        if a not in out['places'] or b not in out['places']: continue
        ida, idb = 'g%d-%s' % (i, b), 'g%d-%s' % (i, a)
        for pid, wall, pos, to, me, other in ((a, wa, pa, b, ida, idb), (b, wb, pb, a, idb, ida)):
            doors = out['places'][pid].setdefault('doors', [])
            if not any(x['id'] == me for x in doors): doors.append({'id': me, 'wall': wall, 'pos': pos, 'w': w, 'to': to, 'door': other, 'open': True})
    return out

def rot_pt(p, rot):
    """Turn a point a quarter turn at a time (rot in degrees, counter-clockwise seen from above)."""
    x, y = p
    for _ in range((int(rot) // 90) % 4): x, y = -y, x
    return [x, y]

def sprite(kind, rot=0, state=None):
    return '%s@%d' % (kind, int(rot) % 360) + ('#%s' % state if state is not None else '')

def sprites_of(data, pid, buildings=True):
    """The sprite names a place needs (every state of every thing that is not baked into the background).
    buildings=False leaves out the outsides of buildings: each is its own picture, not part of the place's sheet."""
    out = []
    for t in data['places'][pid].get('things', []):
        k = data['kinds'][t['kind']]
        if k.get('fixed') or t.get('fixed') or (k.get('building') and not buildings): continue
        for st in (k.get('states') or [None]):
            n = sprite(t['kind'], t.get('rot', 0), st)
            if n not in out: out.append(n)
    return out

def decor_sprites(data):
    """The sprites of the things a child can win and put in their room (always shown at rot 0)."""
    out = []
    for d in data.get('decor', {}).values():
        n = sprite(d['kind'], 0, d.get('state'))
        if n not in out: out.append(n)
    return out
