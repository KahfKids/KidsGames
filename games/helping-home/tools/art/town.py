"""The parts of the art that belong to the one map (build.py calls finish() after the sheets are packed).

   The game shows the whole town with one camera and loads only what is near it, so three things are cut differently
   from the per-place pictures:
   - the ground: the outdoor places' backgrounds are laid on one canvas at their map positions and cut into square
     tiles, life/art/w/<col>_<row>.avif. A tile <col>_<row> covers screen pixels [col*TILE, (col+1)*TILE) x
     [row*TILE, (row+1)*TILE) (its picture is BLEED pixels bigger, to overlap its neighbours) where map point (x, y) is at screen ((y - x) * 96, (x + y) * 48). Empty tiles are not
     written, so no memory goes on the empty corners of a diamond, and the game loads only the tiles in view.
     art.ground = {tile, tiles: ["col_row", ...]}. The outdoor bg-<place> files are no longer shipped.
   - a building's outside: square pieces life/art/b-<lot>-<i>.avif (+ .n.avif), each loaded only while it is in view,
     the building is closed and the camera is near; and a small copy b-<lot>.s.avif (FAR of the size) that is always
     there for the far view. art.buildings[<lot>] = {w, h, ax, ay, far, parts: [{x, y, w, h}]} (w, h: the whole
     picture; ax, ay: the pixel of the footprint's middle on the ground; a part's x, y: its corner in the whole).
   - the small picture of the whole town for when the camera is far out: tools/art/overview.py writes it; its
     overview.json is copied into art.overview.
   - the open grass round the town: life/art/field.avif, one repeat of it; art.field = {w, h}.
   Run alone to redo these on the data.json that is already there:  python3 tools/art/town.py <bake_dir>"""
import json, os, subprocess, sys, math, hashlib, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import enc
TILE = 512
BLEED = 2          # a ground tile's picture is this much wider and taller than the tile: it overlaps its neighbours
FAR = 1 / 3        # a building's small copy is this much of its real size (the same as the picture of the whole town)
PIECE = 512        # a building's full picture is cut into square pieces this big

def sh(*a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a)[:300] + '\n' + r.stderr[:400])
    return r.stdout.strip()

def ground(data, art, BAKE, ART):
    P = data['places']; out = [p for p in P if P[p].get('outdoor') and p in art['places'] and os.path.exists(os.path.join(BAKE, 'bg-%s.png' % p))]
    if not out: return
    rect = {}; src = {}
    for p in out:
        a = art['places'][p]; x, y = P[p]['at']; src[p] = os.path.join(BAKE, 'bg-%s.png' % p)
        rect[p] = (round((y - x) * 96 - a['ox']), round((x + y) * 48 - a['oy']), int(a['w']), int(a['h']))
    ends = road_ends(data, BAKE)                                          # the main road where it leaves the town
    for p, (f, r) in ends.items(): src[p] = f; rect[p] = r
    c0 = min(r[0] for r in rect.values()) // TILE; r0 = min(r[1] for r in rect.values()) // TILE
    c1 = -(-max(r[0] + r[2] for r in rect.values()) // TILE); r1 = -(-max(r[1] + r[3] for r in rect.values()) // TILE)
    cols, rows = c1 - c0, r1 - r0; wdir = os.path.join(BAKE, 'w'); os.makedirs(wdir, exist_ok=True); os.makedirs(os.path.join(ART, 'w'), exist_ok=True)
    order = sorted(out, key=lambda p: P[p]['at'][0] + P[p]['at'][1]) + sorted(ends)      # (a road end goes down last: it lies over the town's edge)
    stamp = hashlib.md5(json.dumps([[p, rect[p], os.path.getmtime(src[p])] for p in order] + [TILE, BLEED, c0, r0]).encode()).hexdigest()
    mark = os.path.join(wdir, 'stamp'); idx = os.path.join(wdir, 'tiles.json')
    if not (os.path.exists(mark) and open(mark).read() == stamp and os.path.exists(idx)):
        for f in glob.glob(os.path.join(wdir, 't-*.png')): os.remove(f)
        # every picture goes down four times one pixel aside, then once in its place: a hairline between two zones
        # (their edges are soft) is then filled with ground and never shows the sky through
        args = ['magick', '-size', '%dx%d' % (cols * TILE, rows * TILE), 'xc:none']
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (0, 0)):
            for p in order:
                r = rect[p]; args += [src[p], '-geometry', '%+d%+d' % (r[0] - c0 * TILE + dx, r[1] - r0 * TILE + dy), '-composite']
        whole = os.path.join(wdir, 'ground.png'); sh(*args, 'PNG32:' + whole)
        # a tile carries BLEED pixels of its right and lower neighbours, so two tiles overlap and no hairline shows between them
        files = [os.path.join(wdir, 't-%d.png' % i) for i in range(cols * rows)]; cmd = ['magick', whole]
        for i, f in enumerate(files): cmd += ['(', '-clone', '0', '-crop', '%dx%d+%d+%d' % (TILE + BLEED, TILE + BLEED, i % cols * TILE, i // cols * TILE), '+repage', '-write', 'PNG32:' + f, '+delete', ')']
        sh(*cmd, 'null:')
        alpha = sh('magick', 'identify', '-format', '%[fx:mean.a]\n', *files).split()
        tiles = []
        for i, a in enumerate(alpha):
            if float(a) < 0.002: os.remove(files[i]); continue
            name = '%d_%d' % (c0 + i % cols, r0 + i // cols); os.replace(files[i], os.path.join(wdir, name + '.png')); tiles.append(name)
        json.dump(tiles, open(idx, 'w')); open(mark, 'w').write(stamp)
    tiles = json.load(open(idx))
    for n in tiles: enc.save(os.path.join(wdir, n + '.png'), os.path.join(ART, 'w', n))
    for f in os.listdir(os.path.join(ART, 'w')):
        if f.rsplit('.', 1)[0] not in tiles: os.remove(os.path.join(ART, 'w', f))
    for p in out:                                                        # the whole pictures are not shipped any more
        for ext in ('.avif', '.webp', '.n.avif', '.n.webp'):
            f = os.path.join(ART, 'bg-%s%s' % (p, ext))
            if os.path.exists(f): os.remove(f)
        if 'bg-' + p in art['normals']: art['normals'].remove('bg-' + p)
    art['ground'] = dict(tile=TILE, tiles=tiles)

def road_ends(data, BAKE):
    """world.roads.out: a stretch of the main road beyond the town's edge, baked as bg-<id> (the world's ground on a
       sheet). Only the road and its kerbs are kept, and the far end fades away (`fade`: from the x where it is whole to
       the x where it is gone). Returns {id: (the cut picture, its rectangle on the map's canvas)}; overview.py uses
       the same pictures (bg-<id>.m.png)."""
    R = (data.get('world') or {}).get('roads') or {}; got = {}
    for e in R.get('out', []):
        f = os.path.join(BAKE, 'bg-%s.png' % e['id'])
        if not os.path.exists(f): print('NOT BAKED YET: bg-' + e['id']); continue
        m = json.load(open(f[:-4] + '.json')); ax, ay = e['at']; c = R['segs']['main']['c']; half = R['half'] + 0.13; fa, fb = e['fade']; cut = f[:-4] + '.m.png'
        if not os.path.exists(cut) or os.path.getmtime(f) > os.path.getmtime(cut) or os.path.getmtime(os.path.join(HERE, 'town.py')) > os.path.getmtime(cut):
            X = '(((j-%s)/48-(i-%s)/96)/2+%s)' % (m['oy'], m['ox'], ax); Y = '(((j-%s)/48+(i-%s)/96)/2+%s)' % (m['oy'], m['ox'], ay)
            sh('magick', f, '-channel', 'A', '-fx', 'a*min(1,max(0,(%s-abs(%s-%s))/0.04))*min(1,max(0,(%s-(%s))/(%s)))' % (half, Y, c, X, fb, fa - fb), '+channel', 'PNG32:' + cut)
        got[e['id']] = (cut, (round((ay - ax) * 96 - m['ox']), round((ax + ay) * 48 - m['oy']), int(m['w']), int(m['h'])))
    return got

def buildings(data, art, BAKE, ART):
    art['buildings'] = {}; keep = set()
    for k, kd in data['kinds'].items():
        lot = kd.get('building')
        if not lot: continue
        n = '%s@0' % k; src = os.path.join(BAKE, 'k-%s.png' % n)
        if not os.path.exists(src): print('NOT BAKED YET: k-' + n); continue
        m = json.load(open(src[:-4] + '.json')); cl = os.path.join(BAKE, 'b-%s.c.png' % lot); dst = os.path.join(BAKE, 'b-%s.png' % lot)
        fresh = not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)
        if fresh:
            sh('magick', src, '-channel', 'A', '-level', '6%,100%', '+channel', 'PNG32:' + cl)
            sh('magick', cl, '-trim', '+repage', 'PNG32:' + dst)
        w, rest = sh('magick', cl, '-format', '%@', 'info:').split('x'); h, x, y = rest.replace('+', ' ').split(); w, h, x, y = int(w), int(h), int(x), int(y)
        small = os.path.join(BAKE, 'b-%s.s.png' % lot)                # the small copy shown from far off, and until the big one has loaded
        fmark = small + '.far'
        if fresh or not os.path.exists(small) or not os.path.exists(fmark) or open(fmark).read() != '%.4f' % FAR: sh('magick', dst, '-filter', 'Lanczos', '-resize', '%dx%d!' % (round(w * FAR), round(h * FAR)), 'PNG32:' + small); open(fmark, 'w').write('%.4f' % FAR)
        enc.save(small, os.path.join(ART, 'b-%s.s' % lot)); keep.add('b-%s.s' % lot)
        # the full picture, in square pieces, each cut to what it holds: a long building is a slanting band, mostly
        # empty as one rectangle, and the game loads only the pieces that are in view
        nsrc = os.path.join(BAKE, 'n-k-%s.png' % n); parts = []; cut = os.path.join(BAKE, 'b-%s.cut' % lot); how = 'pieces %d bleed %d' % (PIECE, BLEED)
        if not (os.path.exists(cut) and open(cut).read() == how): fresh = True
        if fresh:
            for f in glob.glob(os.path.join(BAKE, 'b-%s-*' % lot)): os.remove(f)
        q = 0
        for i in range(-(-w // PIECE)):
            for j in range(-(-h // PIECE)):
                cw = min(PIECE + BLEED, w - i * PIECE); ch = min(PIECE + BLEED, h - j * PIECE);      # (BLEED pixels of its neighbours: the pieces overlap, no hairline)
                piece = os.path.join(BAKE, 'b-%s-%d.png' % (lot, q)); box = os.path.join(BAKE, 'b-%s-%d-%d.box' % (lot, i, j))
                if not os.path.exists(box):
                    if float(sh('magick', dst, '-crop', '%dx%d+%d+%d' % (cw, ch, i * PIECE, j * PIECE), '+repage', '-format', '%[fx:mean.a]', 'info:')) < 0.002: json.dump(None, open(box, 'w')); continue
                    bw, rest = sh('magick', dst, '-crop', '%dx%d+%d+%d' % (cw, ch, i * PIECE, j * PIECE), '+repage', '-format', '%@', 'info:').split('x'); bh, bx, by = rest.replace('+', ' ').split()
                    bx = int(bx) // 2 * 2; by = int(by) // 2 * 2; bw = min(cw - bx, (int(bw) + 3) // 2 * 2); bh = min(ch - by, (int(bh) + 3) // 2 * 2)      # even, for the half-size surface map
                    X = i * PIECE + bx; Y = j * PIECE + by
                    sh('magick', dst, '-crop', '%dx%d+%d+%d' % (bw, bh, X, Y), '+repage', 'PNG32:' + piece); json.dump([X, Y, bw, bh, q], open(box, 'w'))
                    if os.path.exists(nsrc): sh('magick', nsrc, '-crop', '%dx%d+%d+%d' % (bw, bh, x + X, y + Y), '+repage', '-filter', 'Box', '-resize', '%dx%d!' % (round(bw / 2), round(bh / 2)), 'PNG24:' + piece[:-4] + '.n.png')
                got = json.load(open(box))
                if not got: continue
                px, py, pw, ph, q = got; piece = os.path.join(BAKE, 'b-%s-%d.png' % (lot, q)); name = 'b-%s-%d' % (lot, q); q += 1
                enc.save(piece, os.path.join(ART, name)); keep.add(name); parts.append(dict(x=px, y=py, w=pw, h=ph))
                if os.path.exists(piece[:-4] + '.n.png'):
                    enc.save_data(piece[:-4] + '.n.png', os.path.join(ART, name + '.n')); keep.add(name + '.n')
                    if name not in art['normals']: art['normals'].append(name)
        open(cut, 'w').write(how)
        art['buildings'][lot] = dict(w=w, h=h, ax=round(m['ax'] - x, 1), ay=round(m['ay'] - y, 1), far=round(FAR, 6), parts=parts)
    for f in os.listdir(ART):                                           # pictures of an earlier cut
        if f.startswith('b-') and f.rsplit('.', 1)[0] not in keep: os.remove(os.path.join(ART, f))

def field(data, art, BAKE, ART):
    """The open grass round the town: one repeat (1024 x 512) cut from the middle of the baked sheet bg-field, which
       holds three repeats each way. art.field = {w, h}; the game lays it out behind everything (a TileSprite)."""
    src = os.path.join(BAKE, 'bg-field.png')
    if not os.path.exists(src): print('NOT BAKED YET: bg-field'); return
    m = json.load(open(src[:-4] + '.json')); W, H = 1024, 512; out = os.path.join(BAKE, 'field.png')
    if not os.path.exists(out) or os.path.getmtime(src) > os.path.getmtime(out):
        sh('magick', src, '-crop', '%dx%d+%d+%d' % (W, H, round(m['ox']) - W // 2, round(m['oy']) + 16 * 48 - H // 2), '+repage', '-alpha', 'off',
           '(', '+clone', '-resize', '1x1!', '-resize', '%dx%d!' % (W, H), ')', '-define', 'compose:args=35', '-compose', 'blend', '-composite', 'PNG24:' + out)      # (a little calmer than the town's own grass: the eye stays on the town)
    enc.save(out, os.path.join(ART, 'field')); art['field'] = dict(w=W, h=H)

def finish(data, art, BAKE, ART):
    if not data.get('world'): return
    ground(data, art, BAKE, ART); buildings(data, art, BAKE, ART); field(data, art, BAKE, ART)
    r = subprocess.run([sys.executable, os.path.join(HERE, 'overview.py'), BAKE], capture_output=True, text=True)      # (it finds a Python that has Pillow)
    print((r.stdout + r.stderr).strip()[-300:])
    ov = os.path.join(ART, 'overview.json')
    if os.path.exists(ov): art['overview'] = json.load(open(ov))

if __name__ == '__main__':
    GAME = os.path.join(HERE, '..', '..'); f = os.path.join(GAME, 'life', 'data.json'); d = json.load(open(f))
    finish(d, d['art'], sys.argv[1], os.path.join(GAME, 'life', 'art'))
    json.dump(d, open(f, 'w'), separators=(',', ':'))
    print('ground: %d tiles of %d px; buildings: %s; overview: %s' % (len(d['art'].get('ground', {}).get('tiles', [])), TILE, ' '.join(d['art'].get('buildings', {})), 'yes' if d['art'].get('overview') else 'no'))
