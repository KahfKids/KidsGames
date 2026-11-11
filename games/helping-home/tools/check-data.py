#!/usr/bin/env python3
"""Check tools/data/*.json before baking: every thing fits its place, every place to stand is free floor and can be
walked to from the first door, doors pair up, and names exist.   python3 tools/check-data.py"""
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art'))
import data as D
CELL = 0.25; data = D.load(); bad = []; warn = []
PAIR = dict(L='FR', FR='L', R='FL', FL='R')
def door_spot(sp, dr):
    w, d = sp['size']; m = dr['pos'] + dr.get('w', 1.15) / 2
    i = 0.125 if dr.get('open') else 0.5           # open ground between two zones: right at the edge (as life/world.js does)
    return dict(L=(m, i), R=(i, m), FL=(w - i, m), FR=(m, d - i))[dr['wall']]
def road_blocks(sp):
    """The parts of the town's roads that lie in this outdoor place, less the zebra crossings (as life/world.js does)."""
    W = data.get('world'); out = []
    if not (W and sp.get('outdoor') and sp.get('at')): return out
    R = W['roads']; h = R['half']; ox, oy = sp['at']; w, d = sp['size']
    for name, s in R['segs'].items():
        cuts = sorted(c['at'] for c in R['cross'] if c['road'] == name); a = s['from'] - h
        for c0, c1 in cuts + [[s['to'] + h, None]]:
            lo, hi = a, c0
            if hi > lo:
                r = [lo, s['c'] - h, hi, s['c'] + h] if s['axis'] == 'x' else [s['c'] - h, lo, s['c'] + h, hi]
                r = [max(0, r[0] - ox), max(0, r[1] - oy), min(w, r[2] - ox), min(d, r[3] - oy)]
                if r[2] > r[0] and r[3] > r[1]: out.append(r)
            a = c1
    return out
for pid, sp in data['places'].items():
    w, d = sp['size']; nx, ny = round(w / CELL), round(d / CELL); g = [[0] * nx for _ in range(ny)]
    lim = 16 if sp.get('outdoor') else 20          # the biggest zones of the town, and the long upstairs gallery
    if w > lim or d > lim: bad.append('%s: larger than %d x %d' % (pid, lim, lim))
    def block(x0, y0, x1, y1):
        for cy in range(max(0, int(y0 / CELL)), min(ny, math.ceil(y1 / CELL))):
            for cx in range(max(0, int(x0 / CELL)), min(nx, math.ceil(x1 / CELL))): g[cy][cx] = 1
    if not sp.get('outdoor'): block(0, 0, w, CELL); block(0, 0, CELL, d)        # indoors: keep off the two back walls
    for b in road_blocks(sp): block(*b)
    for b in sp.get('blocks', []): block(*b)
    ids = set()
    for t in sp.get('things', []):
        if t['id'] in ids: bad.append('%s: two things called %s' % (pid, t['id']))
        ids.add(t['id'])
        if t['kind'] not in data['kinds']: bad.append('%s/%s: no kind %s' % (pid, t['id'], t['kind'])); continue
        k = data['kinds'][t['kind']]; rot = t.get('rot', 0); pad = k.get('pad', 0.1); x, y = t['at']
        sw, sd = k['size'] if (rot // 90) % 2 == 0 else k['size'][::-1]
        if k.get('building') or k.get('solid') in (None, 'none') and (x < 0 or y < 0): pass      # a building or a tree beyond the back edge of the map
        elif x - sw / 2 < -0.01 or y - sd / 2 < -0.01 or x + sw / 2 > w + 0.01 or y + sd / 2 > d + 0.01: bad.append('%s/%s: sticks out of the place' % (pid, t['id']))
        if k.get('solid') == 'rect': block(x - sw / 2 - pad, y - sd / 2 - pad, x + sw / 2 + pad, y + sd / 2 + pad)
        if k.get('solid') == 'circle':
            r = k['size'][0] / 2 + pad
            for cy in range(ny):
                for cx in range(nx):
                    if math.hypot((cx + .5) * CELL - x, (cy + .5) * CELL - y) < r: g[cy][cx] = 1
    def free(p): cx, cy = int(p[0] / CELL), int(p[1] / CELL); return 0 <= cx < nx and 0 <= cy < ny and not g[cy][cx]
    doors = sp.get('doors', [])
    if not doors: bad.append('%s: no door' % pid); continue
    spots = []
    for dr in doors:
        s = door_spot(sp, dr); spots.append(('door ' + dr['id'], s))
        o = data['places'].get(dr['to'])
        if not o: bad.append('%s: door %s leads to unknown place %s' % (pid, dr['id'], dr['to'])); continue
        back = [x for x in o.get('doors', []) if x['id'] == dr['door']]
        if not back: bad.append('%s: door %s has no door "%s" in %s' % (pid, dr['id'], dr['door'], dr['to']))
        elif back[0]['to'] != pid or back[0]['door'] != dr['id']: bad.append('%s: door %s and %s/%s do not point at each other' % (pid, dr['id'], dr['to'], dr['door']))
        elif PAIR[dr['wall']] != back[0]['wall']: warn.append('%s: door %s on %s meets %s on %s (expected %s)' % (pid, dr['id'], dr['wall'], dr['door'], back[0]['wall'], PAIR[dr['wall']]))
    for t in sp.get('things', []):
        k = data['kinds'].get(t['kind']);
        if not k: continue
        for i, sl in enumerate(k.get('slots', [])):
            f = D.rot_pt(sl.get('from', sl['at']), t.get('rot', 0)); spots.append(('%s slot %d' % (t['id'], i), (t['at'][0] + f[0], t['at'][1] + f[1])))
    for p in sp.get('pray', []): spots.append(('pray spot', tuple(p)))
    # flood from the first door
    start = spots[0][1]; seen = set(); todo = [(int(start[0] / CELL), int(start[1] / CELL))]
    if not free(start): bad.append('%s: %s is not on free floor' % (pid, spots[0][0]))
    while todo:
        c = todo.pop()
        if c in seen or not (0 <= c[0] < nx and 0 <= c[1] < ny) or g[c[1]][c[0]]: continue
        seen.add(c); todo += [(c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1)]
    for name, p in spots[1:]:
        if not free(p): bad.append('%s: %s at (%.2f, %.2f) is not on free floor' % (pid, name, p[0], p[1]))
        elif (int(p[0] / CELL), int(p[1] / CELL)) not in seen: bad.append('%s: %s cannot be walked to from %s' % (pid, name, spots[0][0]))
    print('%-10s %sx%s  %d things, %d doors, %d places to stand, %d%% of the floor free' % (pid, w, d, len(sp.get('things', [])), len(doors), len(spots) - len(doors), 100 * len(seen) // (nx * ny)))
for m in warn: print('note:', m)
for m in bad: print('WRONG:', m)
sys.exit(1 if bad else 0)
