"""Helping Home art: the animal park ("zoo") and the pet things for the house (runs inside Blender; see kit.py, models.py
and m_out.py for the style: this file borrows the outdoor helpers of m_out.py and never changes them).

The place `zoo` is 12 x 12. Its background is the ground (lawn, paths, the floor of every pen) and what stands along the two
back walls (hedges, rocks, trees, the stable roof). The pens are described in tools/data/zoo.json under `pens` (id, rect,
floor): the fences, troughs and the rest are ordinary things placed there. No animal is modelled here except the small
parrots inside the aviary and the toy silhouettes of the album icons; every living shape is FACELESS (no eyes, nose, mouth).
"""
import math, random
import numpy as np
import bpy, bmesh
from mathutils import Vector
import kit, models as M
import m_out as MO
from kit import box, cyl, ball, lathe, tube, mat, tex_mat, rgb
from m_out import O, lm, shade, Cv, Wl, sd_rect, sd_rrect, sd_circle, sd_blob, sd_ring, sd_or, sd_sub, sd_star8, pat_grass, pat_pavers, pat_flowers, vnoise, h2
from m_out import prism, boxes, balls, hcyl, hedge, tree, crown, arch_pts, arch_ring, window, flower_box, door, roof_mat, xz_prism, picket

C = M.C
KINDS, ICONS, PLACES = {}, {}, {}
def kind(name):
    def deco(fn): KINDS[name] = fn; return fn
    return deco
def icon(name):
    def deco(fn): ICONS[name] = fn; return fn
    return deco
def scaled(s):
    """Build a kind a little smaller than its drawing numbers (smaller sprite, smaller file)."""
    def deco(fn):
        def run(st):
            before = set(bpy.data.objects); fn(st); made = [o for o in bpy.data.objects if o not in before and o.parent is None]
            root = kit.group(made, 'scaled'); root.scale = (s, s, s)
        run.__name__ = fn.__name__; return run
    return deco

ROCK = ('#B7AFA2', '#9C958A', '#CBC4B6')
SANDROCK = ('#E6C98F', '#D2B070', '#F0D9A6')

# ================================================================= small helpers
def bars(segs, r, m, name='bars', sides=5):
    """Many thin round bars in one object: segs = [(p0, p1), ...]."""
    bm = bmesh.new()
    for p0, p1 in segs:
        a = Vector(p0); b = Vector(p1); d = b - a
        if d.length < 1e-5: continue
        z = d.normalized(); ref = Vector((0, 0, 1)) if abs(z.z) < 0.95 else Vector((1, 0, 0)); u = z.cross(ref).normalized(); v = z.cross(u)
        r0 = [bm.verts.new(a + (u * math.cos(2 * math.pi * i / sides) + v * math.sin(2 * math.pi * i / sides)) * r) for i in range(sides)]
        r1 = [bm.verts.new(b + (u * math.cos(2 * math.pi * i / sides) + v * math.sin(2 * math.pi * i / sides)) * r) for i in range(sides)]
        for i in range(sides): bm.faces.new((r0[i], r0[(i + 1) % sides], r1[(i + 1) % sides], r1[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def lumps(items, m, seed=1, sub=2, jit=0.1, name='rocks'):
    """Rough flat-shaded stones in one object: items = (x, y, z, rx, ry, rz)."""
    rnd = random.Random(seed); bm = bmesh.new()
    for (x, y, z, rx, ry, rz) in items:
        r = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        for v in r['verts']:
            k = 1 + rnd.uniform(-jit, jit); v.co = Vector((x + v.co.x * rx * k, y + v.co.y * ry * k, z + v.co.z * rz * k))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = False
    return o

def stones(items, seed=1, tones=ROCK, name='rocks'):
    """Stones split over three tones. items = (x, y, z, rx, ry, rz)."""
    g = [[], [], []]
    for i, it in enumerate(items): g[i % 3].append(it)
    for k in range(3):
        if g[k]: lumps(g[k], lm(tones[k], 0.92), seed + k, 2, 0.1, name)

def frond(cx, cy, cz, ang, L, droop, m, W=0.2, seg=7):
    """A palm leaf: a pointed strip that rises a little, then falls."""
    bm = bmesh.new(); dx, dy = math.cos(ang), math.sin(ang); px, py = -dy, dx; rowsL = []; rowsR = []
    for i in range(seg + 1):
        t = i / seg; w = W * math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.8; z = cz + 0.26 * math.sin(t * math.pi * 0.75) - droop * t * t
        bx, by = cx + dx * L * t, cy + dy * L * t
        rowsL.append(bm.verts.new((bx + px * w, by + py * w, z - w * 0.35))); rowsR.append(bm.verts.new((bx - px * w, by - py * w, z - w * 0.35)))
        if i == 0: mid0 = None
    mids = [bm.verts.new((cx + dx * L * i / seg, cy + dy * L * i / seg, cz + 0.26 * math.sin(i / seg * math.pi * 0.75) - droop * (i / seg) ** 2 + 0.03)) for i in range(seg + 1)]
    for i in range(seg):
        bm.faces.new((rowsL[i], mids[i], mids[i + 1], rowsL[i + 1])); bm.faces.new((mids[i], rowsR[i], rowsR[i + 1], mids[i + 1]))
    me = bpy.data.meshes.new('frond'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('frond', me); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def palm(x, y, h, lean=(0.35, 0.15), seed=1, s=1.0):
    rnd = random.Random(seed); tm = lm('#A07C52', 0.9); tmD = lm('#7E5F3C', 0.9); pts = []
    for i in range(7):
        t = i / 6.0; pts.append((x + lean[0] * t * t * s, y + lean[1] * t * t * s, h * t))
    for i, (p0, p1) in enumerate(zip(pts, pts[1:])): tube(p0, p1, 0.15 * s * (1 - 0.35 * i / 6), tm if i % 2 == 0 else tmD, 0.15 * s * (1 - 0.35 * (i + 1) / 6), caps=False)
    top = pts[-1]; g1 = lm('#5E9C5A', 0.8); g2 = lm('#7DB468', 0.8)
    for k in range(9):
        a = 2 * math.pi * k / 9 + rnd.uniform(-0.15, 0.15); frond(top[0], top[1], top[2], a, rnd.uniform(1.15, 1.45) * s, rnd.uniform(0.5, 0.8) * s, g1 if k % 2 == 0 else g2, 0.2 * s)
    balls([(top[0] + 0.14 * math.cos(a), top[1] + 0.14 * math.sin(a), top[2] - 0.1, 0.1 * s, 0.1 * s, 0.1 * s) for a in (0.4, 2.5, 4.4)], lm('#6B4A2E', 0.8), 'nuts', 1)

def acacia(x, y, h, r=1.1, seed=1, lean=0.25):
    """A flat-topped tree: a leaning trunk with a wide, low crown."""
    tm = lm('#8A5A36', 0.9); a = (x, y, 0); b = (x + lean * 0.5, y, h * 0.55); c = (x + lean, y + 0.1, h)
    tube(a, b, 0.17, tm, 0.12, caps=False); tube(b, c, 0.12, tm, 0.09, caps=False)
    for ang in (0.5, 2.6, 4.3): tube((x + lean * 0.7, y + 0.05, h * 0.8), (x + lean + math.cos(ang) * r * 0.6, y + 0.1 + math.sin(ang) * r * 0.6, h + 0.1), 0.05, tm, 0.04, caps=False)
    crown(x + lean, y + 0.1, h + 0.18, r, ('#7DAF58', '#5A9248', '#9CC66A'), seed, 7, 0.42, 0.95)

# ================================================================= the ground
def d_zoo(sp):
    """The zoo's own ground details (pen floors, paths, the little plaza, flower beds), painted over the town's ground in the
    old zoo's own coordinates: the old zoo's (0, 0) is zoo local (0, 1.3), so world = zone `at` + (0, 1.3) + old."""
    import m_town as T
    pens = {p['id']: p for p in sp['pens']}; DY = 1.3
    def paint(cv):
        with T.Shift(cv, sp['at'][0], sp['at'][1] + DY):
            kerb = '#BCA582'
            pv = cv.WORLD['brick']
            def floor(pid, painter):
                x0, y0, x1, y1 = pens[pid]['rect']; y0 -= DY; y1 -= DY; sd = sd_rect(cv, x0, y0, x1, y1)
                cv.put(sd, painter(sd)); cv.put(sd_ring(sd, 0.1), '#8C7A56' if pid != 'rabbit' else '#7E9F57')
            def noise(base, k=0.08, s=0.35, seed=3.0):
                return np.array(rgb(base), 'float32') * (1 - k / 2 + k * vnoise(cv.X, cv.Y, s, seed)[:, :, None])
            floor('elephant', lambda sd: noise('#CDAE80', 0.12, 0.5, 4.0))
            pool = sd_blob(cv, 1.35, 1.15, 1.15, 0.8, 0.14, 2.0)
            cv.put(pool - 0.2, '#B58F62'); cv.put(pool - 0.08, '#8C6B49')
            t = np.clip(-pool / 0.7, 0, 1)[:, :, None]; mud = np.array(rgb('#9A7752'), 'float32') + (np.array(rgb('#745436'), 'float32') - np.array(rgb('#9A7752'), 'float32')) * t
            rip = (0.5 + 0.5 * np.sin((cv.X * 1.8 + cv.Y * 1.3) * 6 + vnoise(cv.X, cv.Y, 0.5, 1.0) * 5))[:, :, None] * 0.05
            cv.put(pool, mud + rip); cv.put(sd_ring(pool, 0.05), '#B99A74')
            floor('farm', lambda sd: noise('#E6CD7C', 0.1, 0.3, 5.0))
            ix = np.floor(cv.X / 0.11); iy = np.floor(cv.Y / 0.11); r = h2(ix, iy, 7.0); fy = cv.Y / 0.11 - iy
            x0, y0, x1, y1 = pens['farm']['rect']; y0 -= DY; y1 -= DY
            inside = ((cv.X > x0) & (cv.X < x1) & (cv.Y > y0) & (cv.Y < y1))[:, :, None]
            dash = ((r > 0.78) & (np.abs(fy - 0.5) < 0.12))[:, :, None] & inside
            cv.img = np.where(dash, np.array(rgb('#F6E39C'), 'float32'), cv.img); dash2 = ((r < 0.12) & (np.abs(fy - 0.5) < 0.1))[:, :, None] & inside
            cv.img = np.where(dash2, np.array(rgb('#C9A858'), 'float32'), cv.img)
            under = sd_rect(cv, 0.0, 4.5, 1.5, 8.5); cv.put(under, pat_pavers(cv, 0.9, 0.3, '#B58A58', '#A27A4B', 0.02, 0.5, 6.0, swap=True, gapc='#7A5A38'))
            floor('rabbit', lambda sd: pat_grass(cv, 31.0, None) * 1.06)
            cv.put(sd_blob(cv, 4.95, 0.5, 0.62, 0.5, 0.1, 1.0), '#8A6A47')
            floor('camel', lambda sd: np.array(rgb(O['sand']), 'float32') * (0.965 + 0.05 * np.sin((cv.X * 1.4 + cv.Y * 2.1) * 7 + vnoise(cv.X, cv.Y, 0.8, 9.0) * 4))[:, :, None])
            floor('giraffe', lambda sd: (np.array(rgb('#C9C675'), 'float32') * (0.94 + 0.12 * vnoise(cv.X, cv.Y, 0.6, 6.0))[:, :, None]))
            # paths (pavers with a stone edge; the town's own paver pattern, so they join the pavement strip)
            walk = sd_or(sd_rect(cv, 6.95, -0.3, 8.55, 4.7, 0.1), sd_rect(cv, 4.5, 3.15, 8.55, 4.5, 0.1), sd_rect(cv, 8.5, 3.75, 12.5, 4.65, 0.1),
                         sd_rect(cv, 4.45, 4.3, 5.7, 8.7, 0.1), sd_rect(cv, 3.75, 8.6, 5.7, 12.5, 0.1), sd_rect(cv, 10.1, 4.5, 11.1, 7.3, 0.1))
            plaza = sd_circle(cv, 6.9, 6.8, 2.55)
            cv.put(sd_sub(sd_or(walk, plaza) - 0.1, sd_rect(cv, -9, -9, 30, 0.0)), kerb); cv.put(walk, pv); cv.put(plaza, pv)
            cv.put(sd_ring(plaza, 0.12), O['teal']); cv.put(sd_ring(plaza + 0.45, 0.05), O['stoneD'])
            st = sd_star8(cv, 6.9, 6.8, 1.75); cv.put(st, '#F6EBCF'); cv.put(sd_ring(st, 0.06), O['tile'])
            cv.put(sd_circle(cv, 6.9, 6.8, 1.45), '#EBDDB8')
            for i in range(8):
                a = i * math.pi / 4 + math.pi / 8; cv.put(sd_rrect(cv, 6.9 + 2.05 * math.cos(a), 6.8 + 2.05 * math.sin(a), 0.1, 0.15, a + math.pi / 2, 0.02), O['tile'])
            cols = [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3']
            for (a, b, c, d) in sp.get('beds', []):
                T.bed(cv, a, b - DY, c, d - DY, 0.25, 3.0)
    return paint

# ================================================================= the back walls
def gate(L, sp):
    d = [x for x in sp['doors'] if x['wall'] == 'L'][0]; u0 = d['pos']; u1 = u0 + d['w']; wd = lm(O['wood'], 0.7); wdl = lm(O['woodL'], 0.7)
    for uu in (u0 - 0.18, u1): L.box(uu, -0.1, 0, 0.18, 0.2, 1.95, wd, 0.03, 'gpost'); L.box(uu - 0.03, -0.13, 1.95, 0.24, 0.26, 0.08, wdl, 0.03, 'gcap')
    prism(L, arch_ring(u0, u1, 1.95, 0.16, 'round'), 'uz', -0.12, 0.12, wd, 0.02, 'garch')
    mid = (u0 + u1) / 2; x, y = L.xy(mid, 0.0)
    o = hcyl(x, y, 2.95, 0.34, 0.07, lm(O['teal'], 0.6), 'y', 32, 0.01); o2 = hcyl(x, y + 0.04, 2.95, 0.25, 0.06, lm(O['cream'], 0.6), 'y', 32, 0.01)
    tube((x, y, 2.75), (x, y, 2.28), 0.02, wd, caps=False)
    # a plain leaf on the disc (a flat cut-out facing the camera)
    leaf = [(0.0, 0.2), (0.12, 0.05), (0.1, -0.08), (0.0, -0.2), (-0.1, -0.08), (-0.12, 0.05)]
    pl = M.plaque(leaf, 0.06, lm(O['leaf'], 0.6), 0.01); pl.location = (x + 0.08, y + 0.1, 2.95)
    rnd = random.Random(5); fl = []
    for i in range(16):
        a = math.pi * i / 15; u = mid - (mid - u0 + 0.1) * math.cos(a); z = 1.95 + (mid - u0 + 0.1) * math.sin(a)
        xx, yy = L.xy(u + rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.12)); fl.append((xx, yy, z, 0.09, 0.09, 0.08))
    for k in range(4):
        xx, yy = L.xy(u0 - 0.09 if k % 2 == 0 else u1 + 0.09, 0.0); fl.append((xx, yy, 0.5 + k * 0.4, 0.07, 0.09, 0.09))
    balls(fl, lm(O['leaf'], 0.8), 'gleaf', 1); balls([(a, b, c + 0.05, 0.05, 0.05, 0.05) for (a, b, c, *_r) in fl[::2]], lm(O['pink'], 0.6), 'gbloom', 1)

def back_L(L, sp):
    """The back-left wall: rocks and jungle trees (elephant), a hedge (rabbits), the gate, sandstone and palms (camel)."""
    rnd = random.Random(11)
    # elephant: a wall of rounded stones with tall trees behind
    it = []
    for i in range(9):
        u = 0.3 + i * 0.47; x, y = L.xy(u, -0.4 + rnd.uniform(-0.1, 0.1)); it.append((x, y, 0.45 + rnd.uniform(0, 0.25), 0.42, 0.4, 0.5))
    for i in range(6):
        u = 0.55 + i * 0.7; x, y = L.xy(u, -0.35 + rnd.uniform(-0.05, 0.1)); it.append((x, y, 1.1 + rnd.uniform(0, 0.25), 0.38, 0.34, 0.4))
    for i in range(3):
        u = 1.0 + i * 1.3; x, y = L.xy(u, -0.4); it.append((x, y, 1.6 + rnd.uniform(0, 0.2), 0.3, 0.28, 0.3))
    stones(it, 21, ROCK)
    for i, (u, th, cr) in enumerate(((0.7, 2.6, 1.15), (2.2, 3.0, 1.2), (3.7, 2.4, 1.0))):
        x, y = L.xy(u, -1.3); tree(x, y, 0, th, cr, 90 + i, (O['leaf'], O['leafD'], O['leafL']) if i % 2 == 0 else ('#6BA85A', '#4C8B4C', '#9AC96E'), 0.13)
    tree(-1.3, -1.3, 0, 3.2, 1.3, 77, trunk=0.15)
    # rabbits: a clipped hedge and one blossom tree
    hedge(L, 4.4, 6.82, -0.85, -0.1, 1.45, 5)
    x, y = L.xy(5.5, -1.2); tree(x, y, 0, 2.0, 1.0, 93, ('#F2A7B5', '#D98294', '#F8CBD3'), 0.12)
    # the entrance
    gate(L, sp)
    # camel: warm sandstone rock with a palm in the pen and another behind
    L.box(8.8, -0.55, 0, 2.9, 0.5, 1.15, lm('#D9BB82', 0.92), 0.05, 'sandwall')
    it = []
    for i in range(6):
        u = 9.0 + i * 0.43; x, y = L.xy(u, -0.38 + rnd.uniform(-0.08, 0.08)); it.append((x, y, 1.15 + rnd.uniform(0, 0.3), 0.36, 0.34, 0.4))
    for i in range(3):
        u = 9.2 + i * 0.75; x, y = L.xy(u, -0.3); it.append((x, y, 1.7 + rnd.uniform(0, 0.15), 0.3, 0.28, 0.28))
    stones(it, 31, SANDROCK)
    palm(11.15, 0.9, 2.7, (0.3, 0.12), 3, 1.0); palm(9.0, -1.1, 3.3, (0.4, -0.1), 4, 1.05)

def back_R(R, sp):
    """The back-right wall: rocks and trees (elephant), the stable and its lean-to roof (farm), tall trees (giraffe)."""
    rnd = random.Random(13)
    it = []
    for i in range(8):
        u = 0.5 + i * 0.5; x, y = R.xy(u, -0.4 + rnd.uniform(-0.1, 0.1)); it.append((x, y, 0.45 + rnd.uniform(0, 0.25), 0.4, 0.42, 0.5))
    for i in range(5):
        u = 0.8 + i * 0.75; x, y = R.xy(u, -0.35); it.append((x, y, 1.1 + rnd.uniform(0, 0.25), 0.34, 0.38, 0.4))
    stones(it, 41, ROCK)
    for i, (u, th, cr) in enumerate(((1.4, 2.5, 1.1), (3.0, 3.0, 1.2), (4.3, 2.3, 0.95))):
        x, y = R.xy(u, -1.3); tree(x, y, 0, th, cr, 70 + i, ('#6BA85A', '#4C8B4C', '#9AC96E') if i % 2 == 0 else (O['leaf'], O['leafD'], O['leafL']), 0.13)
    # farm corner: a timber back wall, a low open stable roof on posts, hay
    wood = lm('#C28D55', 0.85); woodD = lm('#8E5E34', 0.85); woodL = lm(O['woodL'], 0.7)
    R.box(4.5, -0.3, 0, 4.0, 0.3, 2.25, wood, 0.03, 'barn')
    for i in range(16): R.box(4.56 + i * 0.25, -0.02, 0.0, 0.05, 0.03, 2.2, woodD, 0.006, 'batten')
    R.box(4.42, -0.34, 2.22, 4.16, 0.44, 0.1, lm('#8E5E34', 0.7), 0.03, 'barncap')
    prism(R, [(0.0, 2.2), (1.5, 1.82), (1.5, 1.9), (0.0, 2.28)], 'nz', 4.45, 8.55, roof_mat(O['tile'], True, 4.1, 1.5), 0.01, 'stable')
    R.box(4.45, 1.45, 1.78, 4.1, 0.1, 0.11, woodL, 0.02, 'eave')
    for u in (4.58, 6.5, 8.35): R.box(u, 1.38, 0, 0.14, 0.14, 1.85, woodL, 0.03, 'post')
    for (u, z) in ((4.6, 0.0), (4.6, 0.4), (5.15, 0.0), (7.45, 0.0), (8.0, 0.0), (8.0, 0.4)): R.box(u, 0.1, z, 0.5, 0.45, 0.4, lm('#E9C45E', 0.9), 0.04, 'bale')
    for i, (u, th, cr) in enumerate(((5.2, 2.2, 1.0), (7.4, 2.6, 1.1))):
        x, y = R.xy(u, -1.4); tree(x, y, 0, th, cr, 50 + i, (O['leaf'], O['leafD'], O['leafL']), 0.13)
    # giraffe: a tall hedge and two tall trees behind it
    hedge(R, 8.8, 11.6, -0.6, -0.1, 1.5, 9)
    for i, (u, th, cr) in enumerate(((9.4, 3.8, 1.2), (10.3, 3.4, 0.9))):
        x, y = R.xy(u, -0.95); tree(x, y, 0, th, cr, 30 + i, ('#6BA85A', '#4C8B4C', '#9AC96E') if i % 2 == 0 else (O['leaf'], O['leafD'], O['leafL']), 0.15)

def pen_things(dy=1.3):
    """What stays in the picture inside the pens (all low, under 0.3 m): a burrow mound, a few logs and stones. The boulder and
    the acacias are things now (sprites)."""
    sm = lm('#8B6A47', 0.95); ball(4.95, 0.45 + dy, 0.0, 0.42, sm, 1.0, 0.85, 0.55, 'mound')
    ball(4.95, 0.8 + dy, 0.1, 0.11, lm('#2E2118', 0.95), 1.0, 0.3, 0.8, 'hole')
    balls([(4.82, 0.38 + dy, 0.19, 0.1, 0.1, 0.06), (5.1, 0.34 + dy, 0.2, 0.09, 0.09, 0.06), (4.95, 0.5 + dy, 0.22, 0.09, 0.09, 0.05)], lm('#6FB45A', 0.8), 'tufts', 1)
    balls([(4.6, 0.85 + dy, 0.04, 0.07, 0.06, 0.04), (5.35, 0.75 + dy, 0.04, 0.06, 0.05, 0.04)], lm('#B6A98F', 0.9), 'pebbles', 1)
    lm1 = lm('#8A5A36', 0.9); lm2 = lm('#A8743F', 0.9)
    hcyl(6.13, 0.28 + dy, 0.1, 0.1, 0.7, lm1, 'x', 16); hcyl(6.13, 0.5 + dy, 0.1, 0.1, 0.7, lm2, 'x', 16)
    stones([(10.6, 0.5 + dy, 0.12, 0.2, 0.18, 0.15), (11.55, 1.35 + dy, 0.1, 0.16, 0.15, 0.12)], 71, SANDROCK, 'pebbles')

def build_zoo(sp):
    import m_town as T
    T.zone_ground(sp, 'zoo', T.world_painter(sp, [d_zoo(sp)]))
    pen_things(1.3)
PLACES['zoo'] = build_zoo

# ---- sprites that used to stand in the background (tall, so they are things now)
@kind('zboulder')
def k_zboulder(st):
    stones([(0.0, 0.25, 0.35, 0.5, 0.42, 0.42), (0.35, -0.15, 0.18, 0.28, 0.26, 0.22), (-0.4, 0.0, 0.14, 0.22, 0.2, 0.18)], 61, ROCK, 'boulder')

@kind('acacia')
def k_acacia(st):
    """A small flat-topped tree (about 1.6 m wide, 2.6 m tall, crown above 1.5 m)."""
    tm = lm('#8A5A36', 0.9); tube((0, 0, 0), (0.12, 0.03, 1.2), 0.08, tm, 0.06, caps=False); tube((0.12, 0.03, 1.2), (0.2, 0.05, 2.0), 0.06, tm, 0.045, caps=False)
    crown(0.2, 0.05, 2.15, 0.62, ('#7DAF58', '#5A9248', '#9CC66A'), 81, 6, 0.5, 0.55)

@kind('palm')
def k_palm(st): palm(0, 0, 2.2, (0.25, 0.1), 3, 0.55)

@kind('blossom')
def k_blossom(st): MO.small_tree(0, 0, ('#F2A7B5', '#D98294', '#F8CBD3'), 93)

@kind('zoogate')
def k_zoogate(st):
    """The zoo's gate: two timber posts with a wide arch of climbing flowers, a round teal sign with a leaf (no writing) hung
    in the arch, and a short stone wing each side. Opening x 0 .. 1.5 along X (centre of the sprite at the middle of the gap)."""
    wd = lm(O['wood'], 0.7); wdl = lm(O['woodL'], 0.7); stone = lm('#EFE4CB', 0.8)
    for sx in (-0.88, 0.88):
        box(sx - 0.11, -0.11, 0, 0.22, 0.22, 2.0, wd, 0.03, 'gpost'); box(sx - 0.15, -0.15, 2.0, 0.3, 0.3, 0.09, wdl, 0.03, 'gcap'); box(sx - 0.17, -0.17, 0, 0.34, 0.34, 0.3, stone, 0.03, 'gbase')
        ball(sx, 0, 2.18, 0.08, lm(C['brass'], 0.3, 0.9))
    L = Wl('L')
    prism(L, arch_ring(-0.72, 0.72, 2.0, 0.17, 'round'), 'uz', -0.12, 0.12, wd, 0.02, 'garch')
    sg = hcyl(0.0, 0.14, 2.45, 0.36, 0.07, lm(O['teal'], 0.6), 'y', 32, 0.01); hcyl(0.0, 0.18, 2.45, 0.27, 0.06, lm(O['cream'], 0.6), 'y', 32, 0.01)
    tube((0, 0.0, 2.72), (0, 0.0, 2.1), 0.02, wd, caps=False)
    leaf = [(0.0, 0.2), (0.12, 0.05), (0.1, -0.08), (0.0, -0.2), (-0.1, -0.08), (-0.12, 0.05)]
    pl = M.plaque(leaf, 0.06, lm(O['leaf'], 0.6), 0.01); pl.location = (0.08, 0.24, 2.45)
    rnd = random.Random(5); fl = []
    for i in range(18):
        a = math.pi * i / 17; u = -0.88 * math.cos(a) * 0.9; z = 2.0 + 0.78 * math.sin(a); fl.append((u + rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.12), z, 0.09, 0.09, 0.08))
    for k in range(6): fl.append((-0.9 if k % 2 == 0 else 0.9, 0.0, 0.5 + (k // 2) * 0.5, 0.07, 0.09, 0.09))
    balls(fl, lm(O['leaf'], 0.8), 'gleaf', 1); balls([(a, b, c + 0.05, 0.05, 0.05, 0.05) for (a, b, c, *_r) in fl[::2]], lm(O['pink'], 0.6), 'gbloom', 1)

@kind('penfence2')
def k_penfence2(st):
    """A 2.0 m piece of low timber fence along X (a post at each end, two rails)."""
    w = lm('#D6A56C', 0.7); p = lm('#9A6233', 0.8)
    for x in (-0.94, 0.94): box(x - 0.06, -0.06, 0, 0.12, 0.12, 0.78, p, 0.025, 'post'); ball(x, 0, 0.8, 0.065, p)
    for z in (0.22, 0.5): box(-1.0, -0.035, z, 2.0, 0.07, 0.1, w, 0.02, 'rail')

# ================================================================= kinds: fences, troughs and the rest
WOOD = lambda: lm(O['woodL'], 0.7)
WOODD = lambda: lm(O['woodD'], 0.8)

@kind('penfence')
def k_penfence(st):
    """A 1.2 m piece of low timber fence along X: a post at each end and two rails."""
    w = lm('#D6A56C', 0.7); p = lm('#9A6233', 0.8)
    for x in (-0.54, 0.54): box(x - 0.06, -0.06, 0, 0.12, 0.12, 0.78, p, 0.025, 'post'); ball(x, 0, 0.8, 0.065, p)
    for z in (0.22, 0.5): box(-0.6, -0.035, z, 1.2, 0.07, 0.1, w, 0.02, 'rail')

def hay_pile(x, y, z, big=1.0):
    g = [(x + dx * big, y + dy * big, z + dz, 0.15 * big, 0.17 * big, 0.1 * big) for dx, dy, dz in ((0, 0, 0.0), (0.2, 0.2, 0.0), (-0.2, 0.15, 0.0), (0.05, -0.2, 0.0), (0.1, 0.05, 0.1), (-0.1, -0.05, 0.1))]
    balls(g, lm('#EBCB63', 0.9), 'hay', 1)

@kind('trough')
def k_trough(st):
    """A feeding trough along Y; the fence is on its +x side. empty / full."""
    wd = lm(O['woodL'], 0.7); wdD = lm(O['woodD'], 0.8); inn = lm('#7A5230', 0.9)
    box(-0.25, -0.65, 0.16, 0.5, 1.3, 0.2, wd, 0.03, 'tray'); box(-0.19, -0.59, 0.3, 0.38, 1.18, 0.07, inn, 0.0, 'in')
    for y in (-0.5, 0.5): box(-0.22, y - 0.05, 0, 0.44, 0.1, 0.2, wdD, 0.02, 'leg')
    for (x0, y0, w0, d0) in ((-0.25, -0.65, 0.5, 0.05), (-0.25, 0.6, 0.5, 0.05), (-0.25, -0.65, 0.05, 1.3), (0.2, -0.65, 0.05, 1.3)): box(x0, y0, 0.34, w0, d0, 0.1, wd, 0.015, 'lip')
    if st == 'full':
        balls([(0.0, -0.4 + 0.2 * i, 0.4, 0.14, 0.14, 0.09) for i in range(5)], lm('#E9C45E', 0.9), 'hay', 1)
        balls([(-0.04, -0.3 + 0.3 * i, 0.46, 0.08, 0.08, 0.06) for i in range(4)], lm('#6FAE4F', 0.8), 'leaf', 1)
        balls([(0.08, -0.5 + 0.35 * i, 0.46, 0.06, 0.05, 0.05) for i in range(3)], lm('#E8742F', 0.6), 'veg', 1)

@kind('hightrough')
def k_hightrough(st):
    """A feeding basket on a tall pole (for the giraffe); a rope and a small bucket hang on the path side. empty / full."""
    wd = lm(O['woodD'], 0.8); wdl = lm(O['woodL'], 0.7); rope = lm('#EFE0BC', 0.9)
    lathe(0, 0, 0, [(0.001, 0), (0.2, 0), (0.2, 0.06), (0.1, 0.12), (0.001, 0.12)], wd, 24)
    tube((0, 0, 0.05), (0, 0, 2.3), 0.055, wd, 0.045, caps=False)
    lathe(0, 0, 2.15, [(0.1, 0), (0.33, 0.04), (0.38, 0.2), (0.32, 0.22), (0.001, 0.04)], wdl, 24, 'basket')
    lathe(0, 0, 2.15, [(0.37, 0.12), (0.37, 0.14)], wd, 24)
    if st == 'full':
        balls([(0.0, 0.0, 2.4, 0.3, 0.3, 0.12), (0.12, 0.05, 2.46, 0.14, 0.14, 0.1)], lm('#6FAE4F', 0.8), 'leaves', 2)
        balls([(-0.12, -0.1, 2.46, 0.12, 0.12, 0.09)], lm('#E9C45E', 0.9), 'hay', 1)
    tube((0.38, 0.0, 2.2), (0.36, 0.0, 0.95), 0.012, rope, caps=False)
    lathe(0.36, 0.0, 0.8, [(0.001, 0), (0.1, 0.0), (0.13, 0.16), (0.001, 0.16)], lm(O['tealD'], 0.6), 18, 'bucket')

@kind('milkcan')
def k_milkcan(st):
    """A metal milk churn. empty (dark inside) / full (milk to the brim)."""
    steel = lm('#C6CED2', 0.35, 0.5); band = lm(O['teal'], 0.5)
    lathe(0, 0, 0, [(0.001, 0), (0.2, 0), (0.21, 0.03), (0.21, 0.5), (0.16, 0.62), (0.12, 0.7), (0.12, 0.74), (0.15, 0.78), (0.15, 0.8)], steel, 28, 'can')
    lathe(0, 0, 0.1, [(0.205, 0), (0.205, 0.05)], band, 28); lathe(0, 0, 0.4, [(0.21, 0), (0.21, 0.05)], band, 28)
    # the open neck: milk or shadow inside, and the lid beside it
    inside = lm('#FFF8EC', 0.35) if st == 'full' else lm('#33383A', 0.9)
    cyl(0, 0, 0.7, 0.115, 0.1, inside, 0.0, 24)
    tube((-0.21, 0.0, 0.32), (-0.3, 0.0, 0.52), 0.018, steel, 0.018); tube((-0.3, 0.0, 0.52), (-0.21, 0.0, 0.62), 0.018, steel, 0.018)
    tube((0.21, 0.0, 0.32), (0.3, 0.0, 0.52), 0.018, steel, 0.018); tube((0.3, 0.0, 0.52), (0.21, 0.0, 0.62), 0.018, steel, 0.018)
    if st == 'full': ball(0, 0, 0.8, 0.11, lm('#FFFDF6', 0.4), 1, 1, 0.55, 'foam'); ball(0.1, 0.0, 0.62, 0.025, lm('#FFFDF6', 0.4), 1, 1.4, 1.7, 'drip')
    lid = lathe(0.0, 0.0, 0.0, [(0.001, 0.0), (0.15, 0.0), (0.15, 0.06), (0.06, 0.12), (0.001, 0.13)], lm(O['teal'], 0.5), 24, 'lid'); lid.location = (0.36, 0.34, 0.0)

@kind('zookiosk')
@scaled(0.9)
def k_zookiosk(st):
    """A little feed stall: timber counter on the +x side, sacks of feed, a slanted thatch-yellow roof."""
    wood = lm(O['wood'], 0.75); woodL = lm(O['woodL'], 0.7); teal = lm(O['teal'], 0.7); roof = lm('#D9A646', 0.9)
    box(-0.5, -0.8, 0, 0.06, 1.6, 1.9, lm('#C28D55', 0.85), 0.02, 'back'); box(-0.5, -0.8, 0, 1.0, 0.06, 1.9, wood, 0.02, 'sideL'); box(-0.5, 0.74, 0, 1.0, 0.06, 1.9, wood, 0.02, 'sideR')
    box(0.2, -0.78, 0, 0.3, 1.56, 0.84, wood, 0.03, 'counter'); box(0.15, -0.84, 0.84, 0.42, 1.68, 0.06, woodL, 0.025, 'top'); box(0.5, -0.78, 0.25, 0.02, 1.56, 0.12, teal, 0.0, 'band')
    # shelf at the back with sacks, a scoop and a crate
    box(-0.44, -0.74, 1.0, 0.3, 1.48, 0.05, woodL, 0.015, 'shelf')
    sk = lm('#EADFC4', 0.95); sk2 = lm('#D8C9A5', 0.95)
    for (x, y, z, s, m) in ((0.3, -0.5, 0.9, 1.0, sk), (0.32, -0.15, 0.9, 0.9, sk2), (-0.3, -0.45, 1.05, 0.9, sk), (-0.3, 0.2, 1.05, 1.0, sk2), (-0.3, 0.55, 1.05, 0.8, sk)):
        lathe(x, y, z, [(0.001, 0), (0.15 * s, 0), (0.17 * s, 0.1 * s), (0.14 * s, 0.26 * s), (0.08 * s, 0.32 * s), (0.001, 0.32 * s)], m, 16, 'sack')
        tube((x, y, z + 0.3 * s), (x, y, z + 0.33 * s), 0.07 * s, lm(O['teal'], 0.7), 0.04 * s, caps=False)
    # carrots in a crate on the counter
    box(0.28, 0.1, 0.9, 0.3, 0.5, 0.14, woodL, 0.015, 'crate')
    for i in range(5): tube((0.3 + 0.04 * (i % 2), 0.15 + 0.09 * i, 1.04), (0.38 + 0.04 * (i % 2), 0.17 + 0.09 * i, 1.14), 0.025, lm('#E8742F', 0.6), 0.005, caps=False)
    # posts and the slanted roof with a scalloped front edge
    for (x, y) in ((0.55, -0.85), (0.55, 0.79)): box(x - 0.03, y - 0.03, 0, 0.07, 0.07, 1.85, woodL, 0.012, 'post')
    xz_prism([(-0.62, 2.3), (0.72, 1.9), (0.72, 1.98), (-0.62, 2.38)], -0.92, 0.92, roof, 0.01, 'roof')
    for i in range(9):
        y0 = -0.9 + i * 0.2; ball(0.73, y0 + 0.1, 1.92, 0.1, roof, 0.3, 1, 0.85)
    box(-0.62, -0.92, 2.28, 0.04, 1.84, 0.12, lm('#C58B3A', 0.8), 0.01, 'ridge')

@kind('keeperhut')
@scaled(0.9)
def k_keeperhut(st):
    """The keeper's hut: cream walls, a tiled gable roof (ridge along X), a round door on the +y side."""
    L, R = Wl('L'), Wl('R'); cream = lm('#F3E2B8', 0.9); base = lm('#B8986B', 0.9); trim = lm(O['cream'], 0.7); tile = lm(O['tile'], 0.8)
    box(-0.9, -1.0, 0, 1.8, 2.0, 1.55, cream, 0.03, 'wall'); box(-0.93, -1.03, 0, 1.86, 2.06, 0.3, base, 0.03, 'plinth')
    xz = [(-1.0, 1.5), (1.0, 1.5), (0.0, 2.45)]
    prism(R, [(-1.2, 1.5), (1.2, 1.5), (0.0, 2.4)], 'uz', -1.02, 1.02, cream, 0.004, 'gablebody', flat=True) if False else None
    # roof: two slabs sloping from the ridge (ridge along X)
    for sgn in (1, -1):
        me = bpy.data.meshes.new('roof'); bm = bmesh.new()
        pts = [(-1.08, 0.0, 2.4), (1.08, 0.0, 2.4), (1.08, sgn * 1.2, 1.48), (-1.08, sgn * 1.2, 1.48)]
        top = [bm.verts.new(p) for p in pts]; bot = [bm.verts.new((p[0], p[1], p[2] - 0.08)) for p in pts]
        bm.faces.new(top); bm.faces.new(list(reversed(bot)))
        for i in range(4): bm.faces.new((top[i], bot[i], bot[(i + 1) % 4], top[(i + 1) % 4]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(o); kit._finish(o, tile, 0.012)
    # the gable triangles on the +x and -x ends
    for xx in (0.9, -0.92): xz_gable = prism(Wl('L'), [(-1.0, 1.55), (1.0, 1.55), (0.0, 2.38)], 'nz', xx, xx + 0.02, cream, 0.004, 'gable', flat=True)
    box(-1.1, -0.04, 2.38, 2.2, 0.08, 0.1, lm(O['tileD'], 0.7), 0.025, 'ridge')
    box(0.35, 0.3, 1.5, 0.3, 0.3, 0.9, lm(O['brick'], 0.9), 0.02, 'chimney'); box(0.31, 0.26, 2.38, 0.38, 0.38, 0.07, lm(O['stone'], 0.85), 0.02, 'chcap')
    # the door and a window on the +y face (L-wall helpers at y = 1.0), a round window and a flower box on the +x end
    door(L, -0.2, 0.75, 1.38, O['teal'], k='round', step=True, n0=1.0)
    window(L, -0.75, 0.55, 0.45, 0.55, trim=O['cream'], n0=1.0, bars=1, curtain=None); flower_box(L, -0.78, 0.28, 0.51, 1.0)
    window(L, 0.45, 0.55, 0.38, 0.55, trim=O['cream'], n0=1.0, bars=1, curtain=None)
    window(R, -0.2, 0.6, 0.4, 0.4, 'round', trim=O['cream'], n0=0.9, bars=0, curtain=None, sill=False)
    # a lantern by the door
    M.lantern(0.7, 1.1, 1.0, 0.7)

@kind('kennel')
def k_kennel(st):
    """A dog kennel: a wooden hut with a gabled front (+x) and a round-topped opening, a red cushion before it."""
    wood = lm('#C28D55', 0.85); woodD = lm('#8E5E34', 0.85); tile = lm(O['tile'], 0.8); dark = lm('#2E2118', 0.95)
    box(-0.5, -0.5, 0, 1.0, 1.0, 0.62, wood, 0.03, 'body'); box(-0.53, -0.53, 0, 1.06, 1.06, 0.1, woodD, 0.02, 'base')
    for sgn in (1, -1):
        me = bpy.data.meshes.new('roof'); bm = bmesh.new()
        pts = [(-0.6, 0.0, 1.02), (0.6, 0.0, 1.02), (0.6, sgn * 0.62, 0.62), (-0.6, sgn * 0.62, 0.62)]
        top = [bm.verts.new(p) for p in pts]; bot = [bm.verts.new((p[0], p[1], p[2] - 0.06)) for p in pts]
        bm.faces.new(top); bm.faces.new(list(reversed(bot)))
        for i in range(4): bm.faces.new((top[i], bot[i], bot[(i + 1) % 4], top[(i + 1) % 4]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(o); kit._finish(o, tile, 0.01)
    prism(Wl('L'), [(-0.5, 0.6), (0.5, 0.6), (0.0, 1.0)], 'nz', 0.46, 0.5, wood, 0.003, 'gable', flat=True)
    prism(Wl('R'), arch_pts(-0.24, 0.24, 0.0, 0.3, 'round'), 'uz', 0.5, 0.52, dark, 0.006, 'opening', flat=True)
    prism(Wl('R'), arch_ring(-0.24, 0.24, 0.3, 0.05, 'round'), 'uz', 0.5, 0.54, woodD, 0.006, 'arch', flat=True)
    box(-0.6, -0.05, 1.0, 1.2, 0.1, 0.06, woodD, 0.02, 'ridge')
    lathe(0.9, 0.05, 0.0, [(0.001, 0), (0.2, 0), (0.22, 0.04), (0.19, 0.07), (0.001, 0.07)], lm(O['red'], 0.7), 22, 'cushion')
    lathe(0.9, 0.05, 0.0, [(0.001, 0.07), (0.15, 0.07), (0.001, 0.09)], lm('#F3C9B8', 0.8), 22, 'cushion2')

# ---------- the aviary ----------
def parrot(x, y, z, hx, hy, body, wing, tail='#2F7EA6'):
    """A small perched parrot (faceless): body, head, hooked beak, wings, a long tail. Heading (hx, hy)."""
    n = math.hypot(hx, hy); hx, hy = hx / n, hy / n; px, py = -hy, hx
    ball(x, y, z + 0.16, 0.085, lm(body, 0.7), 0.85, 0.8, 1.4, 'pbody'); ball(x + hx * 0.025, y + hy * 0.025, z + 0.31, 0.065, lm(body, 0.7), 1, 1, 1, 'phead')
    ball(x + hx * 0.085, y + hy * 0.085, z + 0.29, 0.03, lm('#F2E2B4', 0.5), 1.3, 1, 0.9, 'pbeak')
    ball(x - hx * 0.03 + px * 0.075, y - hy * 0.03 + py * 0.075, z + 0.17, 0.045, lm(wing, 0.7), 0.7, 0.4, 1.7, 'wingA'); ball(x - hx * 0.03 - px * 0.075, y - hy * 0.03 - py * 0.075, z + 0.17, 0.045, lm(wing, 0.7), 0.7, 0.4, 1.7, 'wingB')
    tube((x - hx * 0.05, y - hy * 0.05, z + 0.08), (x - hx * 0.1, y - hy * 0.1, z - 0.12), 0.026, lm(tail, 0.7), 0.012, caps=False)
    for s in (-1, 1): tube((x + px * 0.03 * s, y + py * 0.03 * s, z + 0.05), (x + px * 0.03 * s, y + py * 0.03 * s, z), 0.012, lm('#C9A46A', 0.8), caps=False)

@kind('aviary')
@scaled(0.88)
def k_aviary(st):
    """A domed bird cage on a stone base with three small parrots inside. States a / b: the birds in two places."""
    stone = lm('#EFE4CB', 0.8); stoneD = lm('#D9C8A6', 0.85); teal = lm(O['teal'], 0.6); R0 = 1.1; Z0 = 0.3; ZC = 1.35; H = 1.0
    lathe(0, 0, 0, [(0.001, 0), (R0 + 0.12, 0), (R0 + 0.14, 0.04), (R0 + 0.14, 0.28), (R0 + 0.06, 0.32), (0.001, 0.32)], stone, 40, 'base')
    lathe(0, 0, 0.2, [(R0 + 0.145, 0), (R0 + 0.145, 0.06)], teal, 40, 'baseband')
    cyl(0, 0, 0.3, R0 - 0.02, 0.03, lm('#E3D0A0', 0.95), 0.0, 40)
    # the bars: meridians up the sides and over the dome, and rings
    segs = []; M_ = 8; steps = 6
    for k in range(M_):
        a = 2 * math.pi * k / M_; ca, sa = math.cos(a), math.sin(a)
        segs.append(((R0 * ca, R0 * sa, Z0 + 0.02), (R0 * ca, R0 * sa, ZC)))
        prev = (R0 * ca, R0 * sa, ZC)
        for i in range(1, steps + 1):
            ph = math.pi / 2 * i / steps; p = (R0 * math.cos(ph) * ca, R0 * math.cos(ph) * sa, ZC + H * math.sin(ph)); segs.append((prev, p)); prev = p
    iron = lm(O['iron'], 0.45, 0.3)
    bars(segs, 0.019, iron, 'meridians', 4)
    rs = []
    for (z, r) in ((Z0 + 0.04, R0), (ZC, R0), (ZC + H * math.sin(0.7), R0 * math.cos(0.7))):
        for k in range(24): a0 = 2 * math.pi * k / 24; a1 = 2 * math.pi * (k + 1) / 24; rs.append(((r * math.cos(a0), r * math.sin(a0), z), (r * math.cos(a1), r * math.sin(a1), z)))
    bars(rs, 0.024, lm(O['tealD'], 0.5), 'rings', 5)
    ball(0, 0, ZC + H + 0.05, 0.07, lm(C['brass'], 0.3, 0.9)); tube((0, 0, ZC + H), (0, 0, ZC + H + 0.05), 0.02, iron, caps=False)
    # inside: perches, a bush, a dish
    wd = lm(O['woodD'], 0.8)
    tube((-0.55, -0.1, 1.0), (0.45, 0.25, 1.0), 0.03, wd, 0.025); tube((-0.2, -0.7, 1.45), (0.55, -0.35, 1.45), 0.025, wd, 0.022)
    tube((-0.1, 0.45, 0.9), (0.3, 0.7, 0.9), 0.025, wd, 0.022)
    balls([(-0.55, 0.55, 0.5, 0.3, 0.3, 0.32), (-0.35, 0.7, 0.45, 0.24, 0.22, 0.25), (0.6, -0.55, 0.45, 0.28, 0.26, 0.3)], lm(O['leaf'], 0.8), 'bush', 2)
    balls([(-0.5, 0.6, 0.72, 0.05, 0.05, 0.05), (0.55, -0.6, 0.7, 0.05, 0.05, 0.05)], lm(O['pink'], 0.6), 'blooms', 1)
    lathe(0.5, 0.45, 0.33, [(0.001, 0), (0.1, 0), (0.12, 0.05), (0.001, 0.05)], lm(O['tile'], 0.7), 18, 'dish')
    if st == 'b': A = [(0.35, 0.18, 1.0, 1, 0.3, '#5E9C5A', '#EBC03E'), (-0.4, -0.55, 1.45, -1, 0.5, '#E8742F', '#F6E3B8'), (0.15, 0.68, 0.9, -1, -0.3, '#2E9C97', '#F6E3B8')]
    else: A = [(-0.4, -0.05, 1.0, 1, -0.4, '#5E9C5A', '#EBC03E'), (0.4, -0.4, 1.45, 1, 0.3, '#E8742F', '#F6E3B8'), (-0.1, 0.5, 0.9, 1, 0.6, '#2E9C97', '#F6E3B8')]
    for (x, y, z, hx, hy, c, w) in A: parrot(x, y, z, hx, hy, c, w, '#2F7EA6' if c != '#2E9C97' else '#EBC03E')

# ---------- pet things for the house and yard ----------
@kind('catbowl')
def k_catbowl(st):
    mat_ = lm('#E7B8A0', 0.95); rim = lm(O['teal'], 0.6)
    cyl(0, 0, 0, 0.2, 0.02, mat_, 0.01, 28); cyl(0, 0, 0.0, 0.17, 0.025, lm('#F6E3D2', 0.95), 0.008, 28)
    lathe(0, 0, 0.02, [(0.001, 0), (0.08, 0), (0.115, 0.05), (0.125, 0.09), (0.12, 0.095), (0.1, 0.07), (0.07, 0.03), (0.001, 0.025)], lm(O['teal'], 0.55), 24, 'bowl')
    lathe(0, 0, 0.1, [(0.12, 0), (0.125, 0.01)], lm('#FFF6E6', 0.5), 24)
    if st == 'full': balls([(0.03 * ((i % 3) - 1), 0.03 * (i // 3 - 0.5), 0.1, 0.03, 0.025, 0.025) for i in range(6)], lm('#8A5A36', 0.85), 'kibble', 1); balls([(0.0, 0.0, 0.112, 0.045, 0.03, 0.02)], lm('#E58C8C', 0.7), 'fish', 1)

@kind('catbed')
def k_catbed(st):
    wv = lm('#C79A5B', 0.9); wvD = lm('#9F7440', 0.9)
    lathe(0, 0, 0, [(0.001, 0), (0.24, 0), (0.29, 0.04), (0.3, 0.14), (0.28, 0.2), (0.25, 0.2), (0.25, 0.1), (0.001, 0.08)], wv, 32, 'basket')
    for z in (0.05, 0.1, 0.15): lathe(0, 0, 0, [(0.265 + z * 0.25, z), (0.275 + z * 0.25, z + 0.012)], wvD, 32)
    lathe(0, 0, 0.06, [(0.001, 0.04), (0.2, 0.05), (0.23, 0.07), (0.2, 0.1), (0.001, 0.11)], lm('#E8B7A8', 0.95, sheen=0.4), 28, 'cushion')

@kind('coop')
def k_coop(st):
    """A hen house on legs with a ramp and a nest box on the +x side (eggs when state is `eggs`)."""
    wood = lm('#C28D55', 0.85); woodD = lm('#8E5E34', 0.85); woodL = lm(O['woodL'], 0.7); tile = lm(O['tile'], 0.8); dark = lm('#2E2118', 0.95)
    for (x, y) in ((-0.4, -0.35), (-0.4, 0.35), (0.2, -0.35), (0.2, 0.35)): box(x - 0.04, y - 0.04, 0, 0.08, 0.08, 0.3, woodD, 0.012, 'leg')
    box(-0.5, -0.45, 0.28, 0.8, 0.9, 0.06, woodD, 0.02, 'floor'); box(-0.48, -0.42, 0.34, 0.76, 0.84, 0.6, wood, 0.03, 'house')
    for i in range(6): box(-0.28 + i * 0.0, -0.4 + i * 0.15, 0.36, 0.01, 0.03, 0.56, woodD, 0.004, 'slat')
    for sgn in (1, -1):
        me = bpy.data.meshes.new('roof'); bm = bmesh.new()
        pts = [(0.0 - 0.58, sgn * 0.0, 1.35), (0.42, sgn * 0.0, 1.35), (0.42, sgn * 0.5, 0.88), (-0.58, sgn * 0.5, 0.88)]
        pts = [(p[0], p[1] * 1.0, p[2]) for p in pts]
        top = [bm.verts.new(p) for p in pts]; bot = [bm.verts.new((p[0], p[1], p[2] - 0.05)) for p in pts]
        bm.faces.new(top); bm.faces.new(list(reversed(bot)))
        for i in range(4): bm.faces.new((top[i], bot[i], bot[(i + 1) % 4], top[(i + 1) % 4]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(o); kit._finish(o, tile, 0.01)
    prism(Wl('L'), [(-0.42, 0.95), (0.42, 0.95), (0.0, 1.32)], 'nz', 0.27, 0.29, wood, 0.003, 'gable', flat=True)
    # the pop-hole and ramp on the +y side (towards the camera's right)
    prism(Wl('L'), arch_pts(-0.3, -0.05, 0.34, 0.5, 'round'), 'uz', 0.42, 0.44, dark, 0.004, 'hole', flat=True)
    xz = [(0.0, 0.0), (0.0, 0.0)]
    me = bpy.data.meshes.new('ramp'); bm = bmesh.new(); pv = [(-0.3, 0.44, 0.34), (-0.05, 0.44, 0.34), (-0.05, 0.95, 0.02), (-0.3, 0.95, 0.02)]
    t = [bm.verts.new(p) for p in pv]; b = [bm.verts.new((p[0], p[1], p[2] - 0.04)) for p in pv]
    bm.faces.new(t); bm.faces.new(list(reversed(b)))
    for i in range(4): bm.faces.new((t[i], b[i], b[(i + 1) % 4], t[(i + 1) % 4]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('ramp', me); bpy.context.collection.objects.link(o); kit._finish(o, woodL, 0.008)
    for i in range(1, 5): z = 0.34 - i * 0.065; box(-0.3, 0.44 + i * 0.1, z + 0.0, 0.25, 0.025, 0.03, woodD, 0.004, 'cleat')
    # the nest box in front (+x) with its lid propped up
    box(0.3, -0.28, 0.34, 0.28, 0.56, 0.26, woodL, 0.025, 'nest'); box(0.33, -0.25, 0.46, 0.24, 0.5, 0.16, lm('#C9A15E', 0.95), 0.0, 'straw')
    if st == 'eggs':
        balls([(0.44, -0.12, 0.62, 0.065, 0.05, 0.05), (0.46, 0.06, 0.62, 0.065, 0.05, 0.05), (0.42, 0.0, 0.66, 0.06, 0.048, 0.05)], lm('#FBF1DC', 0.5), 'egg', 2)
        balls([(0.44, 0.17, 0.62, 0.062, 0.048, 0.048)], lm('#E8C79B', 0.55), 'egg2', 2)
    box(0.28, -0.3, 0.6, 0.02, 0.6, 0.04, woodD, 0.006, 'lip')
    box(0.3, -0.3, 0.6, 0.3, 0.03, 0.04, woodD, 0.006, 'lip'); box(0.3, 0.27, 0.6, 0.3, 0.03, 0.04, woodD, 0.006, 'lip')

@kind('henfeeder')
def k_henfeeder(st):
    tin = lm('#C6CED2', 0.35, 0.5); band = lm(O['teal'], 0.55)
    lathe(0, 0, 0.0, [(0.001, 0.06), (0.17, 0.06), (0.2, 0.09), (0.2, 0.12), (0.18, 0.12), (0.15, 0.09), (0.001, 0.09)], band, 28, 'tray')
    for i in range(3): a = i * 2.094 + 0.5; tube((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.07), (math.cos(a) * 0.17, math.sin(a) * 0.17, 0.0), 0.012, tin, caps=False)
    lathe(0, 0, 0.1, [(0.001, 0), (0.04, 0), (0.07, 0.3), (0.1, 0.34), (0.001, 0.34)] if False else [(0.04, 0), (0.1, 0.28), (0.12, 0.3)], tin, 24, 'hopper')
    lathe(0, 0, 0.38, [(0.121, 0), (0.1, 0.05), (0.001, 0.1)], lm(O['tile'], 0.7), 24, 'lid')
    if st == 'full': balls([(0.1 * math.cos(a), 0.1 * math.sin(a), 0.125, 0.035, 0.035, 0.03) for a in [i * 0.9 for i in range(7)]] + [(0.0, 0.0, 0.14, 0.05, 0.05, 0.04)], lm('#E3B659', 0.8), 'grain', 1)

# ================================================================= icons: faceless toy silhouettes, and the small things
def _heading(objs, deg=118, s=1.0, dz=0.0):
    root = kit.group([o for o in objs if o.parent is None], 'toy'); root.rotation_euler = (0, 0, math.radians(deg)); root.scale = (s, s, s); root.location = (0, 0, dz)
    return root

def toy(name, deg=118, s=1.0, dz=0.0):
    def deco(fn):
        def run():
            before = set(bpy.data.objects); fn(); made = [o for o in bpy.data.objects if o not in before]
            _heading(made, deg, s, dz)
        ICONS[name] = run; return fn
    return deco

def legs(pts, h, r, m, r2=None):
    for (x, y) in pts: tube((x, y, h), (x, y, 0.02), r, m, r2 or r * 0.8, caps=True)

@toy('cow', 108, 0.9)
def i_cow():
    wh = lm('#FBF6EA', 0.7); br = lm('#8A5A36', 0.7); pk = lm('#F0B3A8', 0.7); dk = lm('#E8DDC8', 0.7); horn = lm('#F3E3B8', 0.6)
    ball(0, 0, 0.5, 0.46, wh, 1.1, 0.72, 0.62, 'body'); ball(0.5, 0, 0.62, 0.23, wh, 1, 0.85, 0.95, 'head'); ball(0.69, 0, 0.55, 0.12, pk, 1.0, 0.95, 0.8, 'muzzle')
    ball(0.08, 0.2, 0.62, 0.2, br, 1.0, 0.4, 0.8, 'patch'); ball(-0.25, -0.22, 0.58, 0.18, br, 1.0, 0.4, 0.75, 'patch')
    for s in (-1, 1): ball(0.44, s * 0.22, 0.77, 0.09, dk, 0.5, 1.0, 0.6, 'ear'); tube((0.5, s * 0.12, 0.83), (0.5, s * 0.16, 0.95), 0.03, horn, 0.012)
    legs([(0.28, 0.17), (0.28, -0.17), (-0.3, 0.17), (-0.3, -0.17)], 0.3, 0.07, dk)
    tube((-0.5, 0, 0.6), (-0.58, 0, 0.3), 0.025, wh, 0.02); ball(-0.58, 0, 0.26, 0.05, br); ball(-0.12, 0, 0.26, 0.1, pk, 1.0, 0.8, 0.7, 'udder')

@toy('goat', 108, 1.0)
def i_goat():
    cr = lm('#F1E4C8', 0.75); br = lm('#B48250', 0.75); horn = lm('#7A6A50', 0.6); dk = lm('#E2D2AE', 0.75)
    ball(0, 0, 0.46, 0.38, cr, 1.1, 0.62, 0.58, 'body'); ball(0.44, 0, 0.66, 0.19, cr, 1.0, 0.8, 0.95, 'head'); ball(0.6, 0, 0.6, 0.1, br, 1.0, 0.8, 0.75)
    for s in (-1, 1): tube((0.42, s * 0.07, 0.82), (0.3, s * 0.12, 1.02), 0.03, horn, 0.012); ball(0.4, s * 0.2, 0.7, 0.08, br, 0.8, 0.4, 0.6, 'ear')
    tube((0.6, 0, 0.52), (0.58, 0, 0.36), 0.025, br, 0.005); ball(0.15, 0.17, 0.52, 0.16, br, 1.0, 0.3, 0.6, 'patch')
    legs([(0.24, 0.14), (0.24, -0.14), (-0.24, 0.14), (-0.24, -0.14)], 0.3, 0.05, dk)
    tube((-0.4, 0, 0.55), (-0.5, 0, 0.7), 0.04, cr, 0.015)

@toy('rabbit', 112, 1.0)
def i_rabbit():
    wh = lm('#F6EEE2', 0.8); gr = lm('#CDBFAA', 0.8); pk = lm('#F0B3A8', 0.8)
    ball(0, 0, 0.32, 0.34, wh, 1.1, 0.8, 0.82, 'body'); ball(0.3, 0, 0.5, 0.2, wh, 1, 0.9, 1.0, 'head'); ball(-0.34, 0, 0.3, 0.13, wh, 1, 1, 1, 'tail')
    for s in (-1, 1): ball(0.26 - 0.05 * s, s * 0.1, 0.95, 0.075, wh, 0.6, 0.55, 3.2, 'ear'); ball(0.28 - 0.05 * s, s * 0.1, 0.92, 0.04, pk, 0.4, 0.4, 2.6, 'inner')
    ball(0.08, 0.2, 0.4, 0.17, gr, 1.0, 0.35, 0.6, 'patch'); ball(0.2, 0, 0.12, 0.14, wh, 1.4, 1.5, 0.6, 'foot'); ball(-0.2, 0.2, 0.1, 0.14, wh, 1.8, 0.7, 0.6, 'hind'); ball(-0.2, -0.2, 0.1, 0.14, wh, 1.8, 0.7, 0.6, 'hind')

@toy('tortoise', 120, 1.1)
def i_tortoise():
    sh = lm('#8A6A3A', 0.7); sh2 = lm('#C99A55', 0.7); gr = lm('#8FB06A', 0.75)
    lathe(0, 0, 0.1, [(0.5, 0), (0.52, 0.06), (0.46, 0.22), (0.33, 0.36), (0.14, 0.43), (0.001, 0.44)], sh, 8, 'shell')
    for a in range(6): ang = a * math.pi / 3; ball(math.cos(ang) * 0.27, math.sin(ang) * 0.27, 0.38, 0.12, sh2, 1, 1, 0.45, 'scute')
    ball(0, 0, 0.5, 0.13, sh2, 1, 1, 0.5, 'scute'); ball(0.52, 0, 0.2, 0.15, gr, 1.1, 0.9, 0.9, 'head')
    for (x, y) in ((0.3, 0.38), (0.3, -0.38), (-0.3, 0.38), (-0.3, -0.38)): ball(x, y, 0.1, 0.12, gr, 1.1, 1, 0.8, 'foot')
    ball(-0.55, 0, 0.14, 0.07, gr, 1.4, 0.8, 0.8, 'tail')

@toy('camel', 118, 0.75)
def i_camel():
    sd = lm('#D9A765', 0.8); sdD = lm('#C58E4E', 0.8); sdL = lm('#E8C089', 0.8)
    ball(0, 0, 0.78, 0.5, sd, 1.1, 0.7, 0.55, 'body'); ball(-0.02, 0, 1.18, 0.26, sdD, 1.0, 0.8, 1.0, 'hump')
    tube((0.4, 0, 0.9), (0.62, 0, 1.35), 0.11, sd, 0.075); tube((0.62, 0, 1.35), (0.7, 0, 1.55), 0.08, sd, 0.075)
    ball(0.82, 0, 1.6, 0.14, sd, 1.4, 0.85, 0.8, 'head'); ball(0.94, 0, 1.55, 0.08, sdL, 1.1, 0.9, 0.8);
    for s in (-1, 1): ball(0.7, s * 0.1, 1.72, 0.04, sdD, 0.5, 0.5, 1.2, 'ear')
    legs([(0.36, 0.18), (0.36, -0.18), (-0.36, 0.18), (-0.36, -0.18)], 0.62, 0.065, sdD, 0.05)
    tube((-0.54, 0, 0.9), (-0.62, 0, 0.55), 0.03, sd, 0.02); ball(-0.62, 0, 0.5, 0.05, sdD)
    ball(0.0, 0, 0.98, 0.4, lm('#C95A4A', 0.75, sheen=0.4), 1.1, 0.78, 0.12, 'blanket')

@toy('elephant', 118, 0.75)
def i_elephant():
    gr = lm('#A8B2BD', 0.8); grD = lm('#8E99A6', 0.8); tusk = lm('#F6EDD6', 0.5); pk = lm('#D9B3B0', 0.8)
    ball(0, 0, 0.62, 0.52, gr, 1.1, 0.78, 0.7, 'body'); ball(0.52, 0, 0.78, 0.3, gr, 1.0, 0.9, 1.0, 'head')
    for s in (-1, 1): ball(0.5, s * 0.34, 0.8, 0.28, grD, 0.28, 1.0, 1.0, 'ear'); ball(0.52, s * 0.37, 0.8, 0.2, pk, 0.2, 1.0, 0.8, 'inner')
    pts = [(0.78, 0, 0.72), (0.9, 0, 0.5), (0.92, 0, 0.3), (0.82, 0, 0.14)]
    for p0, p1 in zip(pts, pts[1:]): tube(p0, p1, 0.1, gr, 0.08)
    for s in (-1, 1): tube((0.72, s * 0.12, 0.58), (0.92, s * 0.14, 0.5), 0.035, tusk, 0.01)
    legs([(0.3, 0.2), (0.3, -0.2), (-0.34, 0.2), (-0.34, -0.2)], 0.42, 0.14, grD, 0.12)
    tube((-0.55, 0, 0.7), (-0.66, 0, 0.35), 0.03, gr, 0.015)

@toy('giraffe', 118, 0.6)
def i_giraffe():
    ye = lm('#EDB95A', 0.75); br = lm('#9A5A2E', 0.75); cr = lm('#F6E3B8', 0.75)
    ball(0, 0, 0.78, 0.42, ye, 1.1, 0.6, 0.5, 'body'); tube((0.38, 0, 0.9), (0.56, 0, 1.75), 0.1, ye, 0.07); ball(0.64, 0, 1.86, 0.13, ye, 1.5, 0.8, 0.8, 'head'); ball(0.78, 0, 1.82, 0.07, cr, 1.1, 0.9, 0.8)
    for s in (-1, 1): tube((0.6, s * 0.05, 1.96), (0.6, s * 0.06, 2.1), 0.02, br, 0.02); ball(0.6, s * 0.06, 2.12, 0.03, br); ball(0.55, s * 0.12, 1.92, 0.04, br, 0.5, 0.4, 1.0, 'ear')
    for (x, y, z, r) in ((0.0, 0.2, 0.9, 0.14), (-0.2, -0.2, 0.85, 0.13), (0.15, -0.22, 0.88, 0.11), (0.44, 0.07, 1.2, 0.06), (0.5, -0.07, 1.5, 0.06), (0.52, 0.08, 1.7, 0.05)): ball(x, y, z, r, br, 1, 0.5, 1, 'patch')
    legs([(0.28, 0.14), (0.28, -0.14), (-0.28, 0.14), (-0.28, -0.14)], 0.62, 0.05, cr, 0.04)
    tube((-0.45, 0, 0.9), (-0.55, 0, 0.55), 0.02, ye, 0.012); ball(-0.55, 0, 0.5, 0.045, br)

@toy('cat', 122, 1.05)
def i_cat():
    gi = lm('#E8A25E', 0.75); cr = lm('#FBEFD9', 0.75); dk = lm('#C97F3E', 0.75); pk = lm('#F0B3A8', 0.8)
    ball(0, 0, 0.3, 0.3, gi, 1.0, 0.8, 0.95, 'body'); ball(0.04, 0, 0.7, 0.23, gi, 1, 1, 0.95, 'head'); ball(0.2, 0, 0.58, 0.1, cr, 1.0, 1.0, 0.7)
    for s in (-1, 1): tube((0.0, s * 0.14, 0.82), (-0.02, s * 0.2, 1.02), 0.075, gi, 0.012, caps=False); tube((0.0, s * 0.14, 0.83), (-0.01, s * 0.19, 0.98), 0.04, pk, 0.008, caps=False)
    ball(0.2, 0.1, 0.35, 0.12, cr, 0.9, 0.4, 0.9, 'chest'); ball(-0.04, 0.22, 0.4, 0.15, dk, 1.0, 0.3, 0.7, 'stripe')
    ball(0.2, 0.15, 0.06, 0.09, cr, 1.3, 0.8, 0.6, 'paw'); ball(0.2, -0.15, 0.06, 0.09, cr, 1.3, 0.8, 0.6, 'paw')
    pts = [(-0.28, 0, 0.12), (-0.5, 0.05, 0.2), (-0.56, 0.12, 0.5), (-0.46, 0.14, 0.78)]
    for p0, p1 in zip(pts, pts[1:]): tube(p0, p1, 0.06, gi, 0.05)
    ball(-0.46, 0.14, 0.8, 0.055, cr)

@toy('hen', 118, 1.0)
def i_hen():
    wh = lm('#FBF3E2', 0.75); br = lm('#C98A52', 0.75); rd = lm('#D8523E', 0.6); og = lm('#EE9A3A', 0.6)
    ball(0, 0, 0.42, 0.38, wh, 1.0, 0.75, 0.85, 'body'); ball(0.3, 0, 0.82, 0.17, wh, 1, 0.9, 1.0, 'head'); tube((0.2, 0, 0.5), (0.3, 0, 0.72), 0.12, wh, 0.1)
    ball(0.52, 0, 0.78, 0.07, og, 1.5, 0.8, 0.6, 'beak')
    for i in range(3): ball(0.3 - 0.07 * i, 0, 0.99 + 0.02 * (i == 1), 0.06, rd, 0.8, 0.5, 1.0, 'comb')
    ball(0.45, 0, 0.64, 0.05, rd, 0.8, 0.6, 1.1, 'wattle')
    for s in (-1, 1): ball(-0.02, s * 0.25, 0.46, 0.22, br, 1.2, 0.3, 0.7, 'wing')
    for i, a in enumerate((-0.5, 0.0, 0.5)): tube((-0.3, 0, 0.55), (-0.52, a * 0.1, 0.95 + (0.12 if i == 1 else 0.0)), 0.07, br, 0.01)
    legs([(0.0, 0.1), (0.0, -0.1)], 0.18, 0.025, og, 0.02)

@toy('dog', 122, 0.95)
def i_dog():
    bl = lm('#2E3036', 0.75); wh = lm('#FBF6EA', 0.75)
    ball(0, 0, 0.34, 0.34, wh, 1.0, 0.75, 0.9, 'body'); ball(0.1, 0, 0.78, 0.22, bl, 1, 0.95, 1.0, 'head'); ball(0.3, 0, 0.68, 0.12, wh, 1.1, 0.9, 0.75, 'muzzle')
    for s in (-1, 1): ball(0.04, s * 0.2, 0.78, 0.08, bl, 0.6, 0.4, 1.5, 'ear')
    ball(-0.04, 0.2, 0.42, 0.2, bl, 1.0, 0.35, 0.7, 'patch')
    ball(0.22, 0.14, 0.06, 0.09, wh, 1.3, 0.8, 0.6, 'paw'); ball(0.22, -0.14, 0.06, 0.09, wh, 1.3, 0.8, 0.6, 'paw')
    tube((-0.3, 0, 0.16), (-0.52, 0, 0.3), 0.06, bl, 0.03); ball(-0.5, 0, 0.3, 0.04, wh)

@toy('parrot', 122, 1.35)
def i_parrot():
    gr = lm('#5E9C5A', 0.65); ye = lm('#EBC03E', 0.65); bk = lm('#F2E2B4', 0.55); bl = lm('#2F7EA6', 0.65)
    ball(0, 0, 0.36, 0.22, gr, 0.9, 0.85, 1.4, 'body'); ball(0.05, 0, 0.68, 0.17, gr, 1, 1, 1, 'head'); ball(0.2, 0, 0.62, 0.075, bk, 1.2, 1, 1.2, 'beak'); ball(0.25, 0, 0.55, 0.04, bk, 1, 1, 1.2, 'hook')
    for s in (-1, 1): ball(-0.02, s * 0.18, 0.4, 0.11, ye, 0.7, 0.3, 1.9, 'wing')
    tube((-0.1, 0, 0.3), (-0.3, 0, -0.02), 0.07, bl, 0.025, caps=False); tube((-0.1, 0.03, 0.3), (-0.26, 0.05, 0.0), 0.04, ye, 0.015, caps=False)
    for s in (-1, 1): tube((0.0, s * 0.07, 0.12), (0.0, s * 0.07, 0.0), 0.02, lm('#C9A46A', 0.8), caps=False)
    tube((-0.4, 0, 0.02), (0.4, 0, 0.02), 0.03, lm(O['woodD'], 0.8))

@toy('duck', 120, 1.8)
def i_duck():
    body = lm('#F6CE4F', 0.7); wing = lm('#E8B33C', 0.75); bill = lm('#EE8A3A', 0.6)
    ball(0, 0, 0.2, 0.2, body, 1.15, 0.8, 0.7, 'body'); ball(-0.22, 0, 0.3, 0.09, body, 1.3, 0.8, 0.8, 'tail'); ball(0.17, 0, 0.5, 0.12, body, 1, 1, 1.05, 'head'); tube((0.1, 0, 0.3), (0.15, 0, 0.45), 0.09, body, 0.08)
    ball(0.33, 0, 0.47, 0.06, bill, 1.6, 1.2, 0.4, 'bill')
    for s in (-1, 1): ball(-0.03, s * 0.15, 0.24, 0.13, wing, 1.2, 0.35, 0.7, 'wing')

@icon('egg')
def i_egg():
    a = lm('#FBF1DC', 0.5); b = lm('#E8C79B', 0.5); nest = lm('#C79A5B', 0.9)
    lathe(0, 0, 0.0, [(0.001, 0), (0.34, 0), (0.44, 0.1), (0.46, 0.18), (0.4, 0.2), (0.001, 0.1)], nest, 24, 'nest')
    ball(-0.12, 0.05, 0.38, 0.2, a, 0.8, 0.8, 1.15, 'egg'); ball(0.17, -0.08, 0.36, 0.2, b, 0.8, 0.8, 1.15, 'egg')
    ball(0.04, 0.2, 0.34, 0.18, a, 0.8, 0.8, 1.15, 'egg')
    for i in range(10): a_ = i * 0.628; tube((math.cos(a_) * 0.4, math.sin(a_) * 0.4, 0.12), (math.cos(a_ + 0.5) * 0.46, math.sin(a_ + 0.5) * 0.46, 0.2), 0.02, lm('#9F7440', 0.9), caps=False)

@icon('milk')
def i_milk():
    gl = lm('#EAF4F6', 0.15, emit=('#EAF4F6', 0.08)); mk = lm('#FFFDF6', 0.4); cap = lm(O['teal'], 0.5)
    lathe(0, 0, 0.0, [(0.001, 0), (0.26, 0), (0.28, 0.03), (0.28, 0.5), (0.2, 0.68), (0.13, 0.78), (0.13, 0.92), (0.15, 0.94), (0.15, 0.97)], gl, 32, 'bottle')
    lathe(0, 0, 0.02, [(0.001, 0), (0.24, 0), (0.255, 0.03), (0.255, 0.46), (0.19, 0.64), (0.115, 0.72), (0.001, 0.72)], mk, 32, 'milk')
    lathe(0, 0, 0.9, [(0.17, 0), (0.17, 0.12), (0.12, 0.16), (0.001, 0.16)], cap, 24, 'cap')
    lathe(0, 0, 0.18, [(0.262, 0), (0.262, 0.14)], cap, 32, 'band')

@toy('fish', 118, 1.0)
def i_fish():
    body = lm('#6FA8C8', 0.5); belly = lm('#E8F0F2', 0.5); fin = lm('#4A86AA', 0.55)
    o = ball(0, 0, 0.5, 0.42, body, 1.2, 0.45, 0.62, 'body'); ball(0.04, 0.04, 0.4, 0.3, belly, 1.1, 0.4, 0.4, 'belly')
    for sg in (1, -1): tube((-0.4, 0, 0.5), (-0.64, 0, 0.5 + sg * 0.26), 0.07, fin, 0.03)
    ball(0.02, 0.0, 0.76, 0.16, fin, 1.3, 0.3, 0.9, 'dorsal')

@icon('feedbag')
def i_feedbag():
    sk = lm('#EADFC4', 0.9); skD = lm('#D8C9A5', 0.9); gr = lm(O['teal'], 0.55); rope = lm('#9F7440', 0.9)
    lathe(0, 0, 0.0, [(0.001, 0), (0.34, 0), (0.42, 0.14), (0.43, 0.4), (0.36, 0.64), (0.2, 0.8), (0.13, 0.86), (0.17, 0.94), (0.24, 1.02), (0.12, 1.0), (0.001, 0.98)], sk, 32, 'sack')
    lathe(0, 0, 0.0, [(0.125, 0.8), (0.125, 0.88)], rope, 24); lathe(0, 0, 0.0, [(0.205, 0.0), (0.205, 0.0)], rope, 4) if False else None
    pts = [(0, 0.26), (0.12, 0.1), (0.11, -0.08), (0, -0.24), (-0.11, -0.08), (-0.12, 0.1)]
    pl = M.plaque(pts, 0.06, gr, 0.01); pl.location = Vector((0, 0, 0.36)) + _cam() * 0.5
    MO.plaque_at([(-0.012, 0.2), (0.012, 0.2), (0.012, -0.2), (-0.012, -0.2)], 0.04, lm('#F6EBCF', 0.5), 0.0, 0.004).location = Vector((0, 0, 0.36)) + _cam() * 0.54

def _cam(): return Vector((math.cos(kit.ELEV) * 0.7071, math.cos(kit.ELEV) * 0.7071, math.sin(kit.ELEV)))
def _ell(a, b, n=20): return [(a * math.cos(2 * math.pi * i / n), b * math.sin(2 * math.pi * i / n)) for i in range(n)]

@icon('paw')
def i_paw():
    m = lm('#8A5A36', 0.7)
    MO.plaque_at(_ell(0.3, 0.24), 0.14, m, 0.0, 0.03, 1.0, (0.0, -0.1))
    for (r, u) in ((-0.34, 0.2), (-0.12, 0.42), (0.12, 0.42), (0.34, 0.2)): MO.plaque_at(_ell(0.095, 0.125), 0.14, m, 0.0, 0.03, 1.0, (r, u))

@icon('zoo')
def i_zoo():
    wd = lm(O['wood'], 0.7); wdl = lm(O['woodL'], 0.7); teal = lm(O['teal'], 0.6); cream = lm(O['cream'], 0.6)
    right = Vector((-0.7071, 0.7071, 0)); d = _cam()
    def P(r, z, f=0.0): return Vector((0, 0, 0)) + right * r + Vector((0, 0, z)) + d * f
    for r in (-0.4, 0.4): tube(P(r, 0.02), P(r, 0.78), 0.075, wd, 0.075); ball(*P(r, 0.82), 0.1, wdl)
    pts = [(0.4 * math.cos(math.pi * i / 14), 0.78 + 0.36 * math.sin(math.pi * i / 14)) for i in range(15)]
    for p0, p1 in zip(pts, pts[1:]): tube(P(*p0), P(*p1), 0.06, wd, 0.06)
    MO.plaque_at(_ell(0.17, 0.17, 24), 0.08, teal, 0.0, 0.015, 1.0, (0.0, 0.0)).location = P(0, 1.16, 0.0)
    MO.plaque_at(_ell(0.11, 0.11, 24), 0.08, cream, 0.06, 0.012, 1.0, (0.0, 0.0)).location = P(0, 1.16, 0.06)
    balls([tuple(P(0.4 * math.cos(math.pi * i / 6), 0.78 + 0.36 * math.sin(math.pi * i / 6), 0.04)) + (0.075, 0.075, 0.075) for i in range(1, 6)], lm(O['leaf'], 0.7), 'vine', 1)
