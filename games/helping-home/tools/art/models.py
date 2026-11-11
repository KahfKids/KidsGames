"""Helping Home art: the living room and its furniture (runs inside Blender; see kit.py).

Every builder puts its model at the world origin corner it is given and returns nothing; the caller renders.
1 unit = 1 floor tile = 1 metre. The room is ROOM x ROOM tiles; its two back walls stand on the X = 0 and Y = 0 lines.
"""
import math, random
import numpy as np
import bpy
from mathutils import Vector
import kit
from kit import box, cyl, ball, lathe, tube, arch, mat, tex_mat, rgb

ROOM = 6
WALL_H = 2.5
C = dict(wall='#F1DFC2', wall2='#BFD3B2', trim='#FFF6E6', wood='#CC9458', woodD='#9A6233', woodL='#DDAE78',
         teal='#2E9C97', tealD='#1F7773', terra='#D9704A', mustard='#EBB23A', sage='#8FB57A', leaf='#5E9C5A',
         leafD='#3F7D4A', indigo='#3B4A8F', cream='#FBF3E4', brass='#D9A441', sky='#CDEBFF', rose='#E58C8C')

# ---------- painted patterns (small pictures used as cloth and floor colours) ----------
def _grid(n):
    v = (np.arange(n) + 0.5) / n
    return np.meshgrid(v, v)

def planks(n):
    """A honey wood floor: boards in staggered rows, each a slightly different tone, thin dark joints."""
    u, v = _grid(n); out = np.zeros((n, n, 3), 'float32')
    rows = 6; r = np.floor(v * rows); uu = (u + (r % 3) * 0.37) % 1.0; cols = 2; cidx = np.floor(uu * cols)
    rnd = np.sin((r * 12.9898 + cidx * 78.233) * 43.7) * 0.5 + 0.5
    base = np.array(rgb(C['wood'])); lite = np.array(rgb(C['woodL'])); dark = np.array(rgb(C['woodD']))
    for k in range(3): out[:, :, k] = base[k] + (lite[k] - base[k]) * rnd * 0.8
    out += (np.sin(v * rows * 9 + rnd * 9 + np.sin(uu * 14) * 1.5) * 0.008)[:, :, None]
    gap = (np.abs((v * rows) % 1 - 0.5) > 0.478) | (np.abs((uu * cols) % 1 - 0.5) > 0.492)
    for k in range(3): out[:, :, k] = np.where(gap, out[:, :, k] * 0.78 + dark[k] * 0.1, out[:, :, k])
    return out

def khatam(n, bg, star, line, cells=4, border=None):
    """Eight-pointed stars (two squares, one turned 45 degrees) on a ground, with small diamonds between."""
    u, v = _grid(n); out = np.zeros((n, n, 3), 'float32')
    x = (u * cells) % 1 - 0.5; y = (v * cells) % 1 - 0.5
    a = 0.30
    sq1 = (np.abs(x) < a) & (np.abs(y) < a); sq2 = (np.abs(x + y) < a * 1.414) & (np.abs(x - y) < a * 1.414)
    st = sq1 | sq2
    inner = ((np.abs(x) < a * 0.55) & (np.abs(y) < a * 0.55)) | ((np.abs(x + y) < a * 0.78) & (np.abs(x - y) < a * 0.78))
    x2 = ((u * cells + 0.5) % 1) - 0.5; y2 = ((v * cells + 0.5) % 1) - 0.5
    dia = (np.abs(x2) + np.abs(y2)) < 0.13
    cb, cs, cl = np.array(rgb(bg)), np.array(rgb(star)), np.array(rgb(line))
    for k in range(3):
        ch = np.full((n, n), cb[k]); ch = np.where(st, cs[k], ch); ch = np.where(inner, cl[k], ch); ch = np.where(dia, cl[k], ch); out[:, :, k] = ch
    if border:
        e = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v)); c1, c2 = np.array(rgb(border[0])), np.array(rgb(border[1]))
        for k in range(3):
            out[:, :, k] = np.where(e < 0.085, c1[k], out[:, :, k]); out[:, :, k] = np.where((e > 0.035) & (e < 0.055), c2[k], out[:, :, k])
    return out

def prayer_mat(n, field, edge, archc):
    """A prayer mat: a border, a field, and an arch (mihrab) at the head end (v near 1)."""
    u, v = _grid(n); out = np.zeros((n, n, 3), 'float32')
    e = np.minimum(np.minimum(u, 1 - u) * 1.0, np.minimum(v, 1 - v) * 1.8)
    x = (u - 0.5) / 0.30; inside = (np.abs(x) < 1) & (v > 0.16) & (v < 0.62 + 0.24 * np.sqrt(np.clip(1 - x * x, 0, 1)))
    cf, ce, ca = np.array(rgb(field)), np.array(rgb(edge)), np.array(rgb(archc))
    stripes = (np.floor(v * 28) % 2 == 0) & (e < 0.1)
    for k in range(3):
        ch = np.full((n, n), cf[k]); ch = np.where(inside, ca[k], ch); ch = np.where(e < 0.1, ce[k], ch); ch = np.where(stripes, ce[k] * 0.86, ch)
        ch = np.where((e > 0.1) & (e < 0.125), 0.98, ch); out[:, :, k] = ch
    return out

def weave(n, a, b, cells=10):
    u, v = _grid(n); out = np.zeros((n, n, 3), 'float32'); ca, cb = np.array(rgb(a)), np.array(rgb(b))
    t = ((np.floor(u * cells) + np.floor(v * cells)) % 2 == 0)
    for k in range(3): out[:, :, k] = np.where(t, ca[k], cb[k])
    return out

# ---------- the room ----------
FLOORS = dict(planks=(planks, 0.7, 3.0))          # name: (pattern, roughness, metres per repeat)
T = 0.16                                          # wall thickness

def _wall(wall):
    """A wall's own directions: u runs along it, n into the room. Walls are named by where they are ON SCREEN:
    'L' is the back-left wall (the Y = 0 plane, u = X), 'R' the back-right wall (the X = 0 plane, u = Y)."""
    def wbox(u, n, z, wu, wn, wz, m, bevel=0.01, name='w'):
        return box(n, u, z, wn, wu, wz, m, bevel, name) if wall == 'R' else box(u, n, z, wu, wn, wz, m, bevel, name)
    def wpt(u, n, z): return (n, u, z) if wall == 'R' else (u, n, z)
    return wbox, wpt

def _tag(before, part):
    """Mark every object made since `before` (a set of objects) as belonging to `part` ('floor', 'L' or 'R'). bake.py renders
    the floor and each back wall as its own picture, so every object of a room must say which one it is part of."""
    for o in bpy.data.objects:
        if o not in before and 'part' not in o.keys(): o['part'] = part

def room_shell(sp):
    """A room from its data (tools/data): the floor, the back walls with their windows, doorways and wall things, and a mat at
    each way out on the two open sides. `walls` (default ['L', 'R']) says which back walls the room has. Every object made is
    tagged with its part (floor / L / R): the corner post belongs to wall L, so wall R starts at the corner."""
    w, d = sp['size']; sh = sp.get('shell', {}); h = sp.get('h', WALL_H); t = T; walls = sp.get('walls', ['L', 'R'])
    fl = FLOORS[sh.get('floor', 'planks')]
    floor = tex_mat('floor-%s-%sx%s' % (sh.get('floor', 'planks'), w, d), fl[0], 1024, fl[1], repeat=(w / fl[2], d / fl[2]))
    b0 = set(bpy.data.objects)
    fx = -t if 'R' in walls else 0.0; fy = -t if 'L' in walls else 0.0          # the floor reaches under the walls it has
    box(fx, fy, -0.14, w - fx, d - fy, 0.14, floor, 0.012, 'floor')
    fl_ = sp.get('flush', [])           # an edge where the floor goes on into the next place (the bedrooms' open front): no slab side shows there
    sl = 0.25            # a slab side that ends this far short of a flush edge is hidden under the floor's own overhang
    slab = mat(C['woodD'], 0.8)
    box(fx, fy, -0.30, (w - sl if 'FL' in fl_ else w) - fx, (d - sl if 'FR' in fl_ else d) - fy, 0.17, slab, 0.02, 'floor-edge')
    if 'FR' in fl_ and 'FL' not in fl_: box(w - 0.06, d - sl - 0.02, -0.30, 0.06, sl + 0.02, 0.17, slab, 0.01, 'floor-edge')    # the corner: the far slab side runs on to the end
    _tag(b0, 'floor')
    wallm = mat(sh.get('wall', C['wall']), 0.95); trim = mat(C['trim'], 0.8); band = sh.get('band', C['wall2'])
    for wall, length in (('R', d), ('L', w)):
        if wall not in walls: continue
        b0 = set(bpy.data.objects)
        wbox, wpt = _wall(wall)
        feats = list(sh.get(wall, [])) + [dict(t='door', at=dr['pos'], w=dr.get('w', 1.15), style=dr.get('style'), through=dr.get('through')) for dr in sp.get('doors', []) if dr['wall'] == wall]
        holes = []
        for f in feats:
            if f['t'] == 'window': holes.append((f['at'], f['at'] + f['w'], f.get('z', 0.75), f.get('z', 0.75) + f.get('h', 1.55)))
            if f['t'] == 'door': holes.append((f['at'], f['at'] + f['w'], 0, f.get('h', 2.05)))
        holes.sort(); u = -t if wall == 'L' else 0          # wall L carries the corner; wall R starts at it
        for (u0, u1, z0, z1) in holes:
            wbox(u, -t, 0, u0 - u, t, h, wallm, 0.01, 'wall')
            if z0 > 0: wbox(u0, -t, 0, u1 - u0, t, z0, wallm, 0.01, 'wall')
            wbox(u0, -t, z1, u1 - u0, t, h - z1, wallm, 0.01, 'wall'); u = u1
        wbox(u, -t, 0, length - u, t, h, wallm, 0.01, 'wall')
        if wall == 'L': wbox(-t - 0.02, -t - 0.02, h - 0.01, length + t + 0.02, t + 0.04, 0.08, trim, 0.02)
        else: wbox(-0.02, -t - 0.02, h - 0.01, length + 0.02, t + 0.04, 0.08, trim, 0.02)
        runs = []; u = 0
        for (u0, u1, z0, z1) in holes:
            if z0 == 0: runs.append((u, u0)); u = u1
        runs.append((u, length))
        for (a, b2) in runs:                       # skirting and a soft band of colour, broken at the doorways
            if b2 - a < 0.02: continue
            wbox(a, 0, 0, b2 - a, 0.035, 0.14, trim, 0.012)
            if band:
                wbox(a, 0.004, 0.14, b2 - a, 0.006, 0.62, mat(band, 0.95), 0); wbox(a, 0.004, 0.76, b2 - a, 0.02, 0.05, trim, 0.008)
        for f in feats: FEATURES[f['t']](wall, f, sp)
        if wall == 'L': box(-t - 0.02, -t - 0.02, h - 0.012, t + 0.02, t + 0.02, 0.084, trim, 0)      # the corner post (inside the cap's end: no face of its own shows)
        _tag(b0, wall)
    # the ways out on the open sides: a woven mat on the floor and a step beyond the edge (no step upstairs: the next floor is there)
    b0 = set(bpy.data.objects)
    mm = tex_mat('doormat', lambda s: weave(s, C['teal'], C['tealD'], 9), 256, 0.98)
    for dr in sp.get('doors', []):
        dw = dr.get('w', 1.15)
        if dr['wall'] == 'FR':
            b = box(dr['pos'], d - 0.52, 0, dw, 0.46, 0.02, None, 0.01, 'doormat'); b.data.materials.append(mm)
            if not sp.get('floor'): box(dr['pos'] - 0.05, d, -0.2, dw + 0.1, 0.3, 0.14, mat(C['woodL'], 0.7), 0.02)
        if dr['wall'] == 'FL':
            b = box(w - 0.52, dr['pos'], 0, 0.46, dw, 0.02, None, 0.01, 'doormat'); b.data.materials.append(mm)
            box(w, dr['pos'] - 0.05, -0.2, 0.3, dw + 0.1, 0.14, mat(C['woodL'], 0.7), 0.02)
    _tag(b0, 'floor')

def f_window(wall, f, sp):
    """An arched-free plain window: the sky, a wooden frame with bars, a sill and two sheer curtains."""
    wbox, wpt = _wall(wall); wy, ww, wz, wh = f['at'], f['w'], f.get('z', 0.75), f.get('h', 1.55)
    wbox(wy, -T + 0.02, wz, ww, 0.02, wh, mat(C['sky'], 0.4, emit=('#BFE6FF', 1.15)), 0, 'sky')
    fr = mat(C['woodL'], 0.6); trim = mat(C['trim'], 0.8)
    wbox(wy - 0.07, -0.03, wz - 0.07, ww + 0.14, 0.09, 0.09, fr, 0.02); wbox(wy - 0.07, -0.03, wz + wh - 0.02, ww + 0.14, 0.09, 0.09, fr, 0.02)
    wbox(wy - 0.07, -0.03, wz, 0.08, 0.09, wh, fr, 0.02); wbox(wy + ww - 0.01, -0.03, wz, 0.08, 0.09, wh, fr, 0.02)
    wbox(wy + ww / 2 - 0.025, -0.02, wz, 0.05, 0.05, wh, fr, 0.01); wbox(wy, -0.02, wz + wh * 0.55, ww, 0.05, 0.05, fr, 0.01)
    wbox(wy - 0.12, -0.03, wz - 0.11, ww + 0.24, 0.2, 0.06, trim, 0.02)
    if f.get('curtains', True):
        cur = mat(f.get('cloth', '#FFF6E6'), 0.95, sheen=0.4)
        for (y0, wdt) in [(wy - 0.2, 0.5), (wy + ww - 0.3, 0.5)]:
            for i in range(5):
                p = wpt(y0 + 0.05 + i * wdt / 5, 0.09, wz - 0.5); cyl(p[0], p[1], p[2], 0.055, wh + 0.75, cur, 0, 16)
        tube(wpt(wy - 0.3, 0.09, wz + wh + 0.27), wpt(wy + ww + 0.3, 0.09, wz + wh + 0.27), 0.025, mat(C['brass'], 0.35, 0.9))

def f_door(wall, f, sp):
    """A doorway: a wooden frame and the next room beyond (a darker warm tone)."""
    wbox, wpt = _wall(wall); dx, dw, dh = f['at'], f['w'], f.get('h', 2.05); fr = mat(C['woodL'], 0.6)
    if not f.get('through'): wbox(dx, -T - 0.02, 0, dw, 0.03, dh, mat(f.get('beyond', '#B98A5E'), 0.9), 0, 'beyond')      # `through`: a real opening, the next room shows
    wbox(dx - 0.09, -0.03, 0, 0.09, 0.09, dh + 0.09, fr, 0.02); wbox(dx + dw, -0.03, 0, 0.09, 0.09, dh + 0.09, fr, 0.02); wbox(dx - 0.09, -0.03, dh, dw + 0.18, 0.09, 0.09, fr, 0.02)

PATS = dict(a=lambda s: khatam(s, C['cream'], C['teal'], C['mustard'], 3), b=lambda s: khatam(s, C['indigo'], C['mustard'], C['cream'], 2),
            c=lambda s: khatam(s, C['terra'], C['cream'], C['indigo'], 2), d=lambda s: khatam(s, C['sage'], C['cream'], C['teal'], 3))
def f_frame(wall, f, sp):
    """A framed geometric pattern on the wall (never writing, never a living thing)."""
    wbox, wpt = _wall(wall); sz = f.get('s', 0.6); zz = f.get('z', 1.4); fr = mat(C['woodL'], 0.6)
    pm = tex_mat('frame-' + f.get('pat', 'a'), PATS[f.get('pat', 'a')], 256, 0.8)
    rot = (0, math.radians(90), 0) if wall == 'R' else (math.radians(90), 0, 0)
    bk = box(0, 0, 0, sz + 0.09, sz + 0.09, 0.045, fr, 0.015); bk.rotation_euler = rot; bk.location = wpt(f['at'] + sz / 2, 0.0225, zz + sz / 2)
    p = box(0, 0, 0, sz, sz, 0.012, None, 0); p.data.materials.append(pm); p.rotation_euler = rot; p.location = wpt(f['at'] + sz / 2, 0.05, zz + sz / 2)

def f_shelf(wall, f, sp):
    """A small wall shelf with a pot plant and a vase."""
    wbox, wpt = _wall(wall); z = f.get('z', 1.35); wd = f.get('w', 1.05)
    wbox(f['at'], 0, z, wd, 0.26, 0.05, mat(C['woodL'], 0.6), 0.015)
    p = wpt(f['at'] + wd * 0.29, 0.13, z + 0.05); pot(p[0], p[1], p[2], 0.6)
    p = wpt(f['at'] + wd * 0.67, 0.13, z + 0.05); lathe(p[0], p[1], p[2], [(0.001, 0), (0.07, 0), (0.09, 0.1), (0.05, 0.2), (0.04, 0.26), (0.001, 0.26)], mat(C['terra'], 0.6))

FEATURES = dict(window=f_window, door=f_door, frame=f_frame, shelf=f_shelf)

def rug(x, y, w=2.8, d=2.2):
    m = tex_mat('rug', lambda s: khatam(s, C['cream'], C['teal'], C['terra'], 4, border=(C['indigo'], C['mustard'])), 1024, 0.98)
    box(x, y, 0, w, d, 0.025, m, 0.012, 'rug')
    fr = mat(C['cream'], 0.98)
    for i in range(int(w / 0.09)):
        box(x + 0.02 + i * 0.09, y - 0.07, 0, 0.045, 0.08, 0.012, fr, 0); box(x + 0.02 + i * 0.09, y + d - 0.01, 0, 0.045, 0.08, 0.012, fr, 0)

def mats(x, y, n=2, first=0):
    """Prayer mats side by side, their heads toward the right wall (the qibla is -Y here)."""
    cols = [(C['teal'], C['indigo'], C['cream']), (C['terra'], '#8F3F2B', C['cream']), (C['indigo'], C['mustard'], C['cream'])]
    for i in range(n):
        f, e, a = cols[(first + i) % 3]
        m = tex_mat('pmat%d' % ((first + i) % 3), lambda s, f=f, e=e, a=a: prayer_mat(s, f, e, a)[::-1], 512, 0.98)
        box(x + i * 0.82, y, 0, 0.68, 1.2, 0.02, m, 0.01, 'pmat')

def sofa(x, y, w=2.1, d=0.92):
    """A low sofa along the left wall, facing +X."""
    body = mat(C['teal'], 0.95, sheen=0.5); dark = mat(C['tealD'], 0.95); wood = mat(C['woodD'], 0.6)
    for (ax, ay) in [(0.08, 0.08), (d - 0.14, 0.08), (0.08, w - 0.14), (d - 0.14, w - 0.14)]: cyl(x + ax + 0.03, y + ay + 0.03, 0, 0.035, 0.1, wood, 0.01, 16)
    box(x, y, 0.09, d, w, 0.2, dark, 0.06)
    box(x, y, 0.2, 0.26, w, 0.62, body, 0.1)                                   # the back
    box(x + 0.04, y, 0.2, d - 0.04, 0.2, 0.4, body, 0.09); box(x + 0.04, y + w - 0.2, 0.2, d - 0.04, 0.2, 0.4, body, 0.09)   # arms
    for i in range(2): box(x + 0.22, y + 0.21 + i * (w - 0.42) / 2, 0.27, d - 0.2, (w - 0.42) / 2 - 0.015, 0.17, body, 0.07)
    for i in range(2): box(x + 0.2, y + 0.22 + i * (w - 0.44) / 2, 0.42, 0.17, (w - 0.44) / 2 - 0.02, 0.36, body, 0.08)
    p1 = tex_mat('cush1', lambda s: khatam(s, C['mustard'], C['cream'], C['terra'], 2), 256, 0.98); p2 = tex_mat('cush2', lambda s: weave(s, C['terra'], '#E58C63', 8), 256, 0.98)
    for (yy, pm, rz) in [(y + 0.3, p1, 0.25), (y + w - 0.66, p2, -0.2)]:
        c = box(0, 0, 0, 0.36, 0.36, 0.13, None, 0.06); c.data.materials.append(pm)
        c.rotation_euler = (0, math.radians(-66), rz); c.location = (x + 0.36, yy + 0.18, 0.66)

def tea_table(x, y):
    wood = mat(C['woodL'], 0.5); brass = mat(C['brass'], 0.3, 0.9)
    cyl(x, y, 0.26, 0.5, 0.05, wood, 0.02, 48); cyl(x, y, 0.22, 0.46, 0.05, mat(C['woodD'], 0.6), 0.01, 48)
    for a in range(4):
        ang = math.pi / 4 + a * math.pi / 2; tube((x + math.cos(ang) * 0.3, y + math.sin(ang) * 0.3, 0.24), (x + math.cos(ang) * 0.38, y + math.sin(ang) * 0.38, 0.02), 0.03, wood, 0.022)
    # a tray, a teapot, two glasses and a plate of dates
    cyl(x - 0.05, y + 0.02, 0.31, 0.3, 0.015, brass, 0.008, 40)
    lathe(x - 0.12, y - 0.04, 0.325, [(0.001, 0), (0.07, 0), (0.105, 0.05), (0.11, 0.1), (0.08, 0.16), (0.04, 0.19), (0.05, 0.2), (0.02, 0.24), (0.001, 0.25)], mat(C['indigo'], 0.3))
    tube((x - 0.03, y - 0.04, 0.42), (x + 0.07, y - 0.04, 0.47), 0.016, mat(C['indigo'], 0.3), 0.012)
    for (gx, gy) in [(0.06, 0.12), (-0.02, 0.2)]: lathe(x + gx, y + gy, 0.325, [(0.001, 0), (0.03, 0), (0.026, 0.035), (0.036, 0.085), (0.001, 0.085)], mat('#E8B36A', 0.2))
    cyl(x + 0.24, y - 0.16, 0.31, 0.13, 0.02, mat(C['cream'], 0.4), 0.008, 32)
    random.seed(3)
    for i in range(7):
        a = i * 0.9; r = 0.05 + 0.02 * (i % 2); ball(x + 0.24 + math.cos(a) * r, y - 0.16 + math.sin(a) * r, 0.345 + (0.012 if i > 4 else 0), 0.022, mat('#5A2F1C', 0.5), 1.5, 1, 0.9)

def pot(x, y, z=0, s=1.0):
    lathe(x, y, z, [(0.001, 0), (0.1 * s, 0), (0.15 * s, 0.14 * s), (0.17 * s, 0.24 * s), (0.15 * s, 0.26 * s), (0.001, 0.26 * s)], mat(C['terra'], 0.75))
    ball(x, y, z + 0.3 * s, 0.13 * s, mat(C['leaf'], 0.8), 1, 1, 0.8); ball(x + 0.06 * s, y - 0.05 * s, z + 0.38 * s, 0.09 * s, mat(C['sage'], 0.8))

def plant(x, y):
    """A tall plant in a glazed pot."""
    lathe(x, y, 0, [(0.001, 0), (0.17, 0), (0.24, 0.2), (0.26, 0.38), (0.23, 0.42), (0.2, 0.42), (0.001, 0.4)], mat(C['cream'], 0.35))
    lathe(x, y, 0.1, [(0.245, 0), (0.262, 0.06), (0.245, 0.12)], mat(C['teal'], 0.4))
    cyl(x, y, 0.38, 0.2, 0.03, mat('#5B3B26', 0.95), 0, 24)
    tube((x, y, 0.4), (x + 0.02, y - 0.02, 1.25), 0.022, mat('#7A5A3A', 0.8), 0.014)
    random.seed(11); lm = [mat(C['leaf'], 0.6), mat(C['leafD'], 0.6), mat(C['sage'], 0.6)]
    for i in range(13):
        a = i * 2.39996; hgt = 0.62 + i * 0.062; r = 0.3 - i * 0.008
        l = ball(0, 0, 0, 0.19 - i * 0.004, lm[i % 3], 1.0, 0.5, 0.09)
        l.rotation_euler = (0, math.radians(-28 - (i % 3) * 8), a); l.location = (x + math.cos(a) * r * 0.62, y + math.sin(a) * r * 0.62, hgt)

def bookshelf(x, y, w=1.35, d=0.34, h=1.75):
    """A bookshelf against the right wall (its back on Y = y), facing +Y."""
    wood = mat(C['woodL'], 0.55); back = mat(C['wood'], 0.7)
    box(x, y, 0, w, 0.03, h, back, 0.01); box(x, y, 0, 0.05, d, h, wood, 0.015); box(x + w - 0.05, y, 0, 0.05, d, h, wood, 0.015)
    shelves = [0.06, 0.48, 0.9, 1.32, h - 0.05]
    for z in shelves: box(x, y, z, w, d, 0.05, wood, 0.015)
    random.seed(5); cols = [C['teal'], C['terra'], C['mustard'], C['indigo'], C['sage'], C['cream'], C['rose'], C['tealD']]
    for si, z in enumerate(shelves[:-1]):
        px = x + 0.08; limit = x + w - 0.08
        if si == 2: limit = x + w * 0.55
        while px < limit - 0.06:
            bw = random.choice([0.045, 0.055, 0.065, 0.08]); bh = random.uniform(0.24, 0.34)
            b = box(px, y + 0.05, z + 0.05, bw, d - 0.1, bh, mat(random.choice(cols), 0.7), 0.01)
            if random.random() < 0.12: b.rotation_euler = (0, math.radians(12), 0)
            px += bw + 0.006
        if si == 2:
            pot(x + w * 0.78, y + d / 2, z + 0.05, 0.75)
    lantern(x + 0.3, y + d / 2, h, 0.55); box(x + 0.75, y + 0.06, h, 0.36, 0.22, 0.05, mat(C['indigo'], 0.7), 0.01); box(x + 0.78, y + 0.07, h + 0.05, 0.3, 0.2, 0.045, mat(C['terra'], 0.7), 0.01)

def lantern(x, y, z=0, s=1.0):
    """A brass lantern with a warm light inside."""
    brass = mat(C['brass'], 0.3, 0.9)
    lathe(x, y, z, [(0.001, 0), (0.13 * s, 0), (0.14 * s, 0.03 * s), (0.1 * s, 0.06 * s), (0.001, 0.06 * s)], brass)
    lathe(x, y, z + 0.06 * s, [(0.09 * s, 0), (0.115 * s, 0.14 * s), (0.09 * s, 0.3 * s)], mat('#FFE9B0', 0.3, emit=('#FFD98A', 1.6)), 8)
    for i in range(8):
        a = i * math.pi / 4 + math.pi / 8; tube((x + math.cos(a) * 0.095 * s, y + math.sin(a) * 0.095 * s, z + 0.06 * s), (x + math.cos(a) * 0.095 * s, y + math.sin(a) * 0.095 * s, z + 0.36 * s), 0.008 * s, brass, caps=False)
    lathe(x, y, z + 0.36 * s, [(0.125 * s, 0), (0.1 * s, 0.05 * s), (0.04 * s, 0.14 * s), (0.02 * s, 0.2 * s), (0.001, 0.21 * s)], brass)
    b = ball(x, y, z + 0.6 * s, 0.03 * s, brass);

def floor_lamp(x, y):
    brass = mat(C['brass'], 0.3, 0.9)
    lathe(x, y, 0, [(0.001, 0), (0.17, 0), (0.17, 0.025), (0.03, 0.05), (0.001, 0.05)], brass)
    tube((x, y, 0.04), (x, y, 1.42), 0.016, brass, caps=False)
    lathe(x, y, 1.3, [(0.2, 0), (0.13, 0.3), (0.001, 0.3)], mat('#FFE9B8', 0.9, emit=('#FFD38A', 0.55)), 40)
    lathe(x, y, 1.3, [(0.205, 0), (0.205, 0.02)], mat(C['mustard'], 0.8), 40)

def blocks(x, y):
    """A small pile of wooden building blocks."""
    cols = [C['terra'], C['mustard'], C['teal'], C['sage'], C['indigo'], C['rose']]
    random.seed(8)
    spots = [(0, 0, 0, 0.2), (0.24, 0.03, 0, 0.3), (0.1, 0.26, 0, -0.2), (0.11, 0.05, 0.16, 0.4), (-0.2, 0.2, 0, 0.9), (0.36, 0.3, 0, 0.1)]
    for i, (dx, dy, dz, rz) in enumerate(spots):
        b = box(0, 0, 0, 0.16, 0.16, 0.16, mat(cols[i % 6], 0.6), 0.025); b.rotation_euler = (0, 0, rz); b.location = (x + dx + 0.08, y + dy + 0.08, dz + 0.08)
    c = cyl(x - 0.12, y - 0.1, 0, 0.08, 0.2, mat(cols[2], 0.6), 0.02, 24)
    lathe(x + 0.12, y + 0.07, 0.32, [(0.11, 0), (0.001, 0.16)], mat(cols[0], 0.6), 4)

def ball_toy(x, y):
    ball(x, y, 0.11, 0.11, mat(C['terra'], 0.6)); lathe(x, y, 0.11, [(0.1115, -0.015), (0.1115, 0.015)], mat(C['cream'], 0.6), 40)


# ---------- small things shown on buttons and in thought bubbles (rendered like everything else) ----------
import bpy, bmesh
def plaque(pts, thick, m, bevel=0.03, name='plaque'):
    """A flat shape cut from an outline [(x, y), ...], standing up and turned to face the camera."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    f = [bm.verts.new((p[0], p[1], thick / 2)) for p in pts]; b = [bm.verts.new((p[0], p[1], -thick / 2)) for p in pts]
    bm.faces.new(f); bm.faces.new(list(reversed(b))); n = len(pts)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    d = Vector((math.cos(kit.ELEV) * math.cos(math.radians(45)), math.cos(kit.ELEV) * math.sin(math.radians(45)), math.sin(kit.ELEV)))
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.location = (0, 0, 0.5)
    return kit._finish(o, m, bevel, True, 4)

def icon_heart():
    pts = []
    for i in range(48):
        t = 2 * math.pi * i / 48
        pts.append((0.021 * 16 * math.sin(t) ** 3, 0.021 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) + 0.03))
    plaque(pts, 0.2, mat('#E8524F', 0.45), 0.06)
def icon_star():
    pts = [((0.42 if i % 2 == 0 else 0.17) * math.sin(math.pi * i / 4), (0.42 if i % 2 == 0 else 0.17) * math.cos(math.pi * i / 4)) for i in range(8)]
    plaque(pts, 0.16, mat(C['mustard'], 0.35), 0.04)
def icon_moon():
    R, r, d = 0.4, 0.34, 0.17
    t = math.acos((R * R + d * d - r * r) / (2 * R * d)); ph = math.atan2(R * math.sin(t), R * math.cos(t) - d)
    pts = [(R * math.cos(a), R * math.sin(a)) for a in [t + i * (2 * math.pi - 2 * t) / 28 for i in range(29)]]
    pts += [(d + r * math.cos(a), r * math.sin(a)) for a in [(2 * math.pi - ph) - i * (2 * math.pi - 2 * ph) / 24 for i in range(1, 24)]]
    plaque(pts, 0.16, mat(C['mustard'], 0.35), 0.03)
def icon_salam():
    """A speech bubble with a small heart: a greeting."""
    pts = [(0.44 * math.cos(a), 0.34 * math.sin(a) + 0.06) for a in [math.radians(250 - i * 340 / 30) for i in range(31)]] + [(-0.3, -0.42)]
    plaque(pts, 0.14, mat(C['cream'], 0.5), 0.04)
    h = []
    for i in range(36):
        t = 2 * math.pi * i / 36; h.append((0.0095 * 16 * math.sin(t) ** 3, 0.0095 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) + 0.07))
    o = plaque(h, 0.1, mat('#E8524F', 0.45), 0.03); d = Vector((math.cos(kit.ELEV) * 0.7071, math.cos(kit.ELEV) * 0.7071, math.sin(kit.ELEV))); o.location = Vector((0, 0, 0.5)) + d * 0.1
def icon_dates():
    cyl(0, 0, 0.3, 0.42, 0.06, mat(C['cream'], 0.4), 0.03, 40)
    for i in range(7):
        a = i * 0.9; r = 0.14 + 0.07 * (i % 2); ball(math.cos(a) * r, math.sin(a) * r, 0.42 + (0.05 if i > 4 else 0), 0.075, mat('#5A2F1C', 0.45), 1.5, 1, 0.9)
def icon_cushion():
    c = box(0, 0, 0, 0.72, 0.72, 0.3, None, 0.13); c.data.materials.append(tex_mat('cush1', lambda s: khatam(s, C['mustard'], C['cream'], C['terra'], 2), 256, 0.98)); c.location = (0, 0, 0.4)
def icon_ball():
    ball(0, 0, 0.5, 0.36, mat(C['terra'], 0.6)); lathe(0, 0, 0.5, [(0.364, -0.05), (0.364, 0.05)], mat(C['cream'], 0.6), 40)
def icon_gift():
    b = box(0, 0, 0, 0.6, 0.6, 0.46, mat(C['teal'], 0.6), 0.04); b.location = (0, 0, 0.36)
    for (w, d) in [(0.62, 0.14), (0.14, 0.62)]:
        r = box(0, 0, 0, w, d, 0.48, mat(C['mustard'], 0.5), 0.02); r.location = (0, 0, 0.36)
    ball(0.09, 0, 0.66, 0.09, mat(C['mustard'], 0.5), 1.3, 0.8, 0.8); ball(-0.09, 0, 0.66, 0.09, mat(C['mustard'], 0.5), 1.3, 0.8, 0.8)
def icon_mat():
    mm = tex_mat('pmat0', lambda s: prayer_mat(s, C['teal'], C['indigo'], C['cream'])[::-1], 512, 0.98)
    b = box(0, 0, 0, 0.52, 0.9, 0.03, None, 0.012); b.data.materials.append(mm); b.location = (0, 0, 0.3)
def icon_house():
    b = box(0, 0, 0, 0.62, 0.62, 0.42, mat(C['cream'], 0.8), 0.04); b.location = (0, 0, 0.36)
    lathe(0, 0, 0.56, [(0.52, 0), (0.001, 0.36)], mat(C['terra'], 0.7), 4).rotation_euler = (0, 0, math.radians(45))
    d = box(0, 0, 0, 0.03, 0.18, 0.26, mat(C['woodD'], 0.6), 0.01); d.location = (0.31, 0, 0.29)
def icon_book():
    b = box(0, 0, 0, 0.5, 0.66, 0.12, mat(C['indigo'], 0.6), 0.03); b.location = (0, 0, 0.4)
    p = box(0, 0, 0, 0.46, 0.62, 0.09, mat(C['cream'], 0.8), 0.01); p.location = (0.02, 0, 0.4)
def icon_blocks():
    for (x, y, z, c) in [(-0.2, 0.1, 0.3, C['terra']), (0.2, -0.05, 0.3, C['mustard']), (0.02, 0.0, 0.62, C['teal'])]:
        b = box(0, 0, 0, 0.34, 0.34, 0.34, mat(c, 0.6), 0.05); b.location = (x, y, z)
def icon_can():
    cyl(0, 0, 0.25, 0.24, 0.42, mat(C['teal'], 0.5), 0.04, 32); tube((0.2, 0, 0.36), (0.52, 0, 0.62), 0.045, mat(C['teal'], 0.5)); ball(0.54, 0, 0.64, 0.07, mat(C['teal'], 0.5), 1, 1, 0.6)
    tube((-0.22, 0, 0.6), (-0.4, 0, 0.42), 0.035, mat(C['tealD'], 0.5)); tube((-0.4, 0, 0.42), (-0.24, 0, 0.3), 0.035, mat(C['tealD'], 0.5))
ICONS = dict(heart=icon_heart, star=icon_star, moon=icon_moon, salam=icon_salam, dates=icon_dates, cushion=icon_cushion, ball=icon_ball,
             gift=icon_gift, mat=icon_mat, house=icon_house, book=icon_book, blocks=icon_blocks, can=icon_can)


# ---------- what bake.py can build by name ----------
# A kind is built with the middle of its footprint on the world origin, in its "rot 0" direction (see tools/data).
# st is the kind's state (a string) when it has states, else None.
KINDS = dict(
    sofa=lambda st: sofa(-0.46, -1.05), table=lambda st: tea_table(0, 0), plant=lambda st: plant(0, 0),
    shelf=lambda st: bookshelf(-0.675, -0.17), lamp=lambda st: floor_lamp(0, 0), blocks=lambda st: blocks(-0.1, -0.1),
    ball=lambda st: ball_toy(0, 0), rug=lambda st: rug(-1.4, -1.1), pmat=lambda st: mats(-0.34, -0.6, 1, int(st or 0)),
)
PLACES = {}        # custom place builders (outdoor places): name -> fn(place_data)
