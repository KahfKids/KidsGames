"""Helping Home art: the outdoor places (the street, the plaza, the park) and the things that stand in them.
Runs inside Blender (see kit.py and models.py for the style). Nothing here is drawn by hand: ground pictures are painted
with numpy, buildings are boxes, prisms, lathes and balls, all matte and bevelled like the living room.

Coordinates of a back wall: `u` runs along it, `n` runs out into the place (negative = behind the wall), `z` is up.
  wall 'L'  (back-left,  the Y = 0 line): u = X, n = +Y        wall 'R'  (back-right, the X = 0 line): u = Y, n = +X
Picture limits: (W + D) * 96 + 80 px wide, so a building behind a wall may only be about 0.9 m deep near the far ends
(the rest would fall off the picture)."""
import math, random
import numpy as np
import bpy, bmesh
from mathutils import Vector
import kit, models as M
from kit import box, cyl, ball, lathe, tube, mat, tex_mat, rgb

C = M.C
KINDS, ICONS, PLACES = {}, {}, {}
def kind(name):
    def deco(fn): KINDS[name] = fn; return fn
    return deco
def icon(name):
    def deco(fn): ICONS[name] = fn; return fn
    return deco
def place(name):
    def deco(fn): PLACES[name] = fn; return fn
    return deco

# the colours of the outdoors (neighbours of the room palette C)
O = dict(cream='#FFF3DC', ivory='#F7ECD3', stone='#D9C8A6', stoneD='#B8A27C', paver='#F0E1C0', paver2='#E2CDA2', cobble='#D4BE95',
         cobble2='#B99F76', mortar='#9F8A67', grass='#8CC567', grassD='#6FA854', grassL='#AAD67A', soil='#7E5438', sand='#EBD7A6',
         sandD='#D9BF86', yellow='#F3C65E', peach='#E58F6A', pink='#EBA6A6', brown='#9C4B36', tile='#CF6A47', tileD='#B5573A',
         slate='#4A56A0', teal='#2E9C97', tealD='#1F7773', tealL='#8FCFC8', red='#D8523E', brick='#BC6A4A', wood='#CC9458',
         woodD='#9A6233', woodL='#DDAE78', iron='#2D5E66', glass='#A9D6EA', leaf='#5E9C5A', leafD='#3F7D4A', leafL='#86BE6A',
         water='#6EC3D8', waterD='#3E9FB8', white='#FBF6EA', plum='#8B5FA8')

def lm(c, r=0.85, metal=0.0, **k): return mat(c, r, metal, **k)
def shade(c, f):
    v = rgb(c); return '#%02X%02X%02X' % tuple(int(max(0, min(1, x * f)) * 255) for x in v)

# ================================================================= painting the ground (numpy)
def h2(a, b, seed=0.0):
    a = np.asarray(a, 'float64'); b = np.asarray(b, 'float64')
    return np.abs((np.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453) % 1.0)

def vnoise(X, Y, s, seed=0.0):
    x = X / s; y = Y / s; ix = np.floor(x); iy = np.floor(y); fx = x - ix; fy = y - iy
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = h2(ix, iy, seed); b = h2(ix + 1, iy, seed); c = h2(ix, iy + 1, seed); d = h2(ix + 1, iy + 1, seed)
    return ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy).astype('float32')

class Cv:
    """A picture of the ground: n x n pixels over a w x d metre floor. X, Y are the metres under each pixel."""
    def __init__(s, n, w, d):
        s.n, s.w, s.d = n, w, d; s.px = w / n
        xs = ((np.arange(n) + 0.5) * (w / n)).astype('float32'); ys = ((np.arange(n) + 0.5) * (d / n)).astype('float32')
        s.X, s.Y = np.meshgrid(xs, ys); s.img = np.zeros((n, n, 3), 'float32')
    def put(s, sd, col, aa=None):
        """Paint `col` (hex, rgb triple or a whole (n, n, 3) pattern) where the signed distance sd is below 0 (soft edge)."""
        aa = aa or s.px * 1.3
        a = np.clip(0.5 - sd / aa, 0, 1).astype('float32')[:, :, None]
        c = col if isinstance(col, np.ndarray) else np.array(rgb(col) if isinstance(col, str) else col, 'float32')
        s.img = s.img * (1 - a) + c.astype('float32') * a
    def all(s, col): s.img[:] = col if isinstance(col, np.ndarray) else np.array(rgb(col), 'float32')

def sd_rect(cv, x0, y0, x1, y1, r=0.0):
    cx, cy, hx, hy = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    dx = np.abs(cv.X - cx) - hx; dy = np.abs(cv.Y - cy) - hy
    return np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) + np.minimum(np.maximum(dx, dy), 0) - r
def sd_rrect(cv, cx, cy, hx, hy, ang, r=0.0):
    c, s = math.cos(ang), math.sin(ang); x = cv.X - cx; y = cv.Y - cy
    u = x * c + y * s; v = -x * s + y * c; dx = np.abs(u) - (hx - r); dy = np.abs(v) - (hy - r)
    return np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) + np.minimum(np.maximum(dx, dy), 0) - r
def sd_circle(cv, cx, cy, r): return np.hypot(cv.X - cx, cv.Y - cy) - r
def sd_ell(cv, cx, cy, rx, ry): return (np.hypot((cv.X - cx) / rx, (cv.Y - cy) / ry) - 1) * min(rx, ry)
def sd_blob(cv, cx, cy, rx, ry, wob=0.12, seed=1.0):
    a = np.arctan2((cv.Y - cy) / ry, (cv.X - cx) / rx); k = 1 + wob * (0.5 * np.sin(2 * a + seed) + 0.35 * np.sin(3 * a + seed * 2.1) + 0.25 * np.sin(5 * a + seed * 0.7))
    return (np.hypot((cv.X - cx) / rx, (cv.Y - cy) / ry) - k) * min(rx, ry)
def sd_seg(cv, p0, p1, hw):
    px, py = cv.X - p0[0], cv.Y - p0[1]; dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    t = np.clip((px * dx + py * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(px - t * dx, py - t * dy) - hw
def sd_star8(cv, cx, cy, r): return np.minimum(sd_rrect(cv, cx, cy, r, r, 0), sd_rrect(cv, cx, cy, r, r, math.pi / 4))
def sd_ring(sd, w): return np.abs(sd + w / 2) - w / 2          # a band of width w just inside the edge of a shape
def sd_or(*a): return np.minimum.reduce(a)
def sd_sub(a, b): return np.maximum(a, -b)

def pat_pavers(cv, sw, sh, c1, c2, gap=0.022, bond=0.5, seed=1.0, swap=False, gapc=None, var=1.0):
    X, Y = (cv.Y, cv.X) if swap else (cv.X, cv.Y)
    r = np.floor(Y / sh); xo = X + (r % 2) * sw * bond; ci = np.floor(xo / sw)
    fx = xo / sw - ci; fy = Y / sh - r; t = (h2(ci, r, seed) * var).astype('float32')[:, :, None]
    a = np.array(rgb(c1), 'float32'); b = np.array(rgb(c2), 'float32'); base = a + (b - a) * t
    edge = np.minimum(np.minimum(fx, 1 - fx) * sw, np.minimum(fy, 1 - fy) * sh)
    m = np.clip((gap / 2 - edge) / (cv.px * 1.3) + 0.5, 0, 1).astype('float32')[:, :, None]
    gc = np.array(rgb(gapc), 'float32') if gapc else base * 0.8
    # a soft light along the top of every stone
    hi = np.clip((fy - 0.82) / 0.18, 0, 1).astype('float32')[:, :, None] * 0.05
    return (base + hi) * (1 - m) + gc * m

def pat_cobbles(cv, cell, c1, c2, mortar, seed=2.0):
    r = np.floor(cv.Y / cell); xo = cv.X + (r % 2) * cell / 2; ci = np.floor(xo / cell)
    fx = xo / cell - ci - 0.5; fy = cv.Y / cell - r - 0.5
    jx = (h2(ci, r, seed + 1) - 0.5) * 0.16; jy = (h2(ci, r, seed + 2) - 0.5) * 0.16; rad = 0.41 + 0.06 * h2(ci, r, seed + 3)
    dd = np.hypot((fx - jx) / 1.0, (fy - jy) / 0.92) - rad
    t = h2(ci, r, seed).astype('float32')[:, :, None]; a = np.array(rgb(c1), 'float32'); b = np.array(rgb(c2), 'float32')
    stone = a + (b - a) * t
    lit = np.clip(0.5 - (fy - jy) * 0.9 - (fx - jx) * 0.2, 0, 1).astype('float32')[:, :, None]      # lighter toward the top left
    stone = stone * (0.93 + 0.14 * lit)
    m = np.clip(0.5 - dd / (cv.px * 1.3 / cell), 0, 1).astype('float32')[:, :, None]
    return np.array(rgb(mortar), 'float32') * (1 - m) + stone * m

def pat_grass(cv, seed=3.0, mow=None):
    g, gd, gl = (np.array(rgb(O[k]), 'float32') for k in ('grass', 'grassD', 'grassL'))
    t = np.clip(0.5 + (vnoise(cv.X, cv.Y, 1.3, seed) - 0.5) * 1.2 + (vnoise(cv.X, cv.Y, 0.4, seed + 1) - 0.5) * 0.5, 0, 1)[:, :, None]
    base = np.where(t < 0.5, gd + (g - gd) * (t * 2), g + (gl - g) * ((t - 0.5) * 2))
    cell = 0.075; ix = np.floor(cv.X / cell); iy = np.floor(cv.Y / cell); r = h2(ix, iy, seed + 7)
    fx = cv.X / cell - ix; fy = cv.Y / cell - iy
    blade = ((r > 0.9) & (np.abs(fx - 0.5) < 0.2) & (fy > 0.2) & (fy < 0.85))[:, :, None]
    dark = ((r < 0.07) & (np.hypot(fx - 0.5, fy - 0.5) < 0.3))[:, :, None]
    base = np.where(blade, base * 1.08 + 0.03, base); base = np.where(dark, base * 0.92, base)
    if mow:
        s = (np.floor((cv.X + cv.Y) / mow) % 2)[:, :, None]; base = base * (0.96 + 0.06 * s)
    return base.astype('float32')

def pat_flowers(cv, cols, seed=5.0, cell=0.15, soil='soil', dens=0.8):
    out = np.array(rgb(O[soil]), 'float32') * np.ones_like(cv.img)
    out = out * (0.9 + 0.2 * vnoise(cv.X, cv.Y, 0.25, seed)[:, :, None])
    leaf = np.array(rgb(O['leaf']), 'float32'); leafL = np.array(rgb(O['leafL']), 'float32')
    for layer, off in enumerate((0.0, 0.5)):
        xo = cv.X / cell + off; yo = cv.Y / cell + off * 0.7; ix = np.floor(xo); iy = np.floor(yo)
        fx = xo - ix - 0.5 - (h2(ix, iy, seed + layer) - 0.5) * 0.3; fy = yo - iy - 0.5 - (h2(ix, iy, seed + layer + 9) - 0.5) * 0.3
        dd = np.hypot(fx, fy); has = h2(ix, iy, seed + layer + 3) < dens
        lm_ = ((dd < 0.46) & has)[:, :, None]; out = np.where(lm_, leaf * (0.85 + 0.3 * layer) + (leafL - leaf) * 0.25 * (fy + 0.5)[:, :, None], out)
        pick = np.floor(h2(ix, iy, seed + layer + 5) * len(cols)).astype(int)
        fl = np.zeros_like(out)
        for i, c in enumerate(cols): fl = np.where((pick == i)[:, :, None], np.array(rgb(c), 'float32'), fl)
        fm = ((dd < 0.2) & has & (h2(ix, iy, seed + 11) < 0.85))[:, :, None]; out = np.where(fm, fl, out)
        cm = ((dd < 0.07) & has)[:, :, None]; out = np.where(cm, np.array(rgb('#F6D36B'), 'float32'), out)
    return out.astype('float32')

def ground(w, d, painter, name, size=2048, body=None):
    """The ground slab: a stone body with the painted sheet on top (top at z = 0) and a thin stone lip at the two near edges."""
    tex = tex_mat('g-' + name, lambda n: painter(n), size, 0.93)
    box(0, 0, -0.30, w, d, 0.27, lm(body or O['stone'], 0.9), 0.03, 'slab')
    top = box(0, 0, -0.03, w - 0.05, d - 0.05, 0.03, None, 0.008, 'ground'); top.data.materials.append(tex)
    return top

# ================================================================= shapes standing on a back wall
class Wl:
    """One back wall seen from its own side (see the module note): box / point / extrusion in (u, n, z)."""
    def __init__(s, name):
        s.name = name; s.wbox, s.wpt = M._wall(name)
    def box(s, u, n, z, wu, wn, wz, m, bevel=0.02, name='b'): return s.wbox(u, n, z, wu, wn, wz, m, bevel, name)
    def pt(s, u, n, z): return s.wpt(u, n, z)
    def xy(s, u, n): p = s.wpt(u, n, 0); return p[0], p[1]

def prism(wl, pts, plane, a0, a1, m, bevel=0.01, name='prism', flat=False):
    """Extrude an outline. plane 'uz': pts are (u, z), extruded along n from a0 to a1. 'nz': pts (n, z), along u.
    'un': pts (u, n), along z."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    def P(p, a):
        if plane == 'uz': return wl.pt(p[0], a, p[1])
        if plane == 'nz': return wl.pt(a, p[0], p[1])
        return wl.pt(p[0], p[1], a)
    f = [bm.verts.new(P(p, a0)) for p in pts]; b = [bm.verts.new(P(p, a1)) for p in pts]
    bm.faces.new(f); bm.faces.new(list(reversed(b))); n = len(pts)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if flat:
        o.data.materials.append(m); return o
    return kit._finish(o, m, bevel)

def panel(wl, pts, n, thick, m, name='panel', bevel=0.004):
    """A flat cut-out standing on the wall, textured through its own flat plan (so patterns lie right). pts are (u, z)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    f = [bm.verts.new((p[0], p[1], thick / 2)) for p in pts]; b = [bm.verts.new((p[0], p[1], -thick / 2)) for p in pts]
    bm.faces.new(f); bm.faces.new(list(reversed(b))); k = len(pts)
    for i in range(k): bm.faces.new((f[i], b[i], b[(i + 1) % k], f[(i + 1) % k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    if wl.name == 'R': o.rotation_euler = (math.pi / 2, 0, math.pi / 2); o.location = (n, 0, 0)
    else: o.rotation_euler = (math.pi / 2, 0, 0); o.location = (0, n, 0)
    for p in o.data.polygons: p.use_smooth = False
    return o

def pat_mat(name, paint, w, h, cell, rough=0.85):
    """A pattern material for a panel of w x h metres, with one pattern cell `cell` metres wide."""
    return tex_mat('%s-%.2f-%.2f-%.2f' % (name, w, h, cell), paint, 256, rough, repeat=(max(w / cell, 0.01), max(h / cell, 0.01)))

def boxes(items, m, bevel=0.01, name='boxes'):
    """Many boxes in one object: items = (x, y, z, w, d, h) in world metres."""
    bm = bmesh.new()
    for (x, y, z, w, d, h) in items:
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r['verts']: v.co = Vector((x + w / 2 + v.co.x * w, y + d / 2 + v.co.y * d, z + h / 2 + v.co.z * h))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return kit._finish(o, m, bevel)

def wboxes(wl, items, m, bevel=0.01, name='boxes'):
    """Many boxes in (u, n, z, wu, wn, wz) on a wall, in one object."""
    out = []
    for (u, n, z, wu, wn, wz) in items:
        out.append((n, u, z, wn, wu, wz) if wl.name == 'R' else (u, n, z, wu, wn, wz))
    return boxes(out, m, bevel, name)

def balls(items, m, name='balls', sub=2):
    """Many soft round lumps in one object: items = (x, y, z, rx, ry, rz)."""
    bm = bmesh.new()
    for (x, y, z, rx, ry, rz) in items:
        r = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        for v in r['verts']: v.co = Vector((x + v.co.x * rx, y + v.co.y * ry, z + v.co.z * rz))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def hcyl(x, y, z, r, ln, m, axis='x', verts=24, bevel=0.0):
    """A cylinder lying along x or y, centred on (x, y, z)."""
    o = cyl(0, 0, -ln / 2, r, ln, m, bevel, verts)
    o.rotation_euler = (0, math.pi / 2, 0) if axis == 'x' else (math.pi / 2, 0, 0); o.location = (x, y, z); return o

def torus(x, y, z, R, r, m, sz=1.0, major=40, minor=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=major, minor_segments=minor, location=(x, y, z))
    o = bpy.context.object; o.scale = (1, 1, sz); o.rotation_euler = rot; o.name = 'torus'
    return kit._finish(o, m, 0)

# ---------- arches ----------
def arch_rise(s, k): return s / 2 if k == 'round' else 0.707 * s
def arch_pts(u0, u1, z0, zs, k='round', seg=14):
    """Outline (u, z) of an arched opening: the base from z0, straight sides up to zs, then a round or pointed top."""
    s = u1 - u0; pts = [(u0, z0), (u1, z0)]
    if zs > z0 + 1e-4: pts.append((u1, zs))
    if k == 'round':
        r = s / 2; mid = (u0 + u1) / 2
        pts += [(mid + r * math.cos(math.pi * i / seg), zs + r * math.sin(math.pi * i / seg)) for i in range(1, seg)]
    else:
        R = 0.75 * s; th = math.acos((s / 2 - R) / R)               # the apex angle on the left centre
        cR = u1 - R; cL = u0 + R; phiA = math.pi - th
        pts += [(cR + R * math.cos(phiA * i / seg), zs + R * math.sin(phiA * i / seg)) for i in range(1, seg + 1)]
        pts += [(cL + R * math.cos(th + (math.pi - th) * i / seg), zs + R * math.sin(th + (math.pi - th) * i / seg)) for i in range(1, seg)]
    if zs > z0 + 1e-4: pts.append((u0, zs))
    return pts
def arch_ring(u0, u1, zs, b, k='round', seg=14):
    """A band of width b following the top of an arch (u0..u1, springing at zs): outline for a prism."""
    o = arch_pts(u0 - b, u1 + b, zs, zs, k, seg)[2:]; i = arch_pts(u0, u1, zs, zs, k, seg)[2:]
    return o + list(reversed(i))
def rect_pts(u0, u1, z0, z1): return [(u0, z0), (u1, z0), (u1, z1), (u0, z1)]

# ---------- windows, doors ----------
def glass_mat(): return lm(O['glass'], 0.2, emit=(O['glass'], 0.32))
def window(wl, u, z, w, h, k='rect', trim=O['cream'], shutter=None, flowers=None, curtain='#FFF6E6', n0=0.0, sill=True, bars=1, b=0.065, dep=0.065):
    """A window with its lower-left corner at (u, z), w x h, on the wall plane n0. k: rect / round / point."""
    fr = lm(trim, 0.7)
    if k == 'rect': outer = rect_pts(u, u + w, z, z + h); inner = rect_pts(u + b, u + w - b, z + b, z + h - b); zs = z + h
    else:
        zs = z + h - arch_rise(w, k); outer = arch_pts(u, u + w, z, zs, k); inner = arch_pts(u + b, u + w - b, z + b, zs, k, 10)
    prism(wl, outer, 'uz', n0, n0 + dep, fr, 0.012, 'winf'); prism(wl, inner, 'uz', n0, n0 + dep + 0.012, glass_mat(), 0.004, 'glass')
    n1 = n0 + dep + 0.014
    if curtain:
        cm = lm(curtain, 0.95, sheen=0.4)
        cw = (w - 2 * b) * 0.24
        wl.box(u + b, n1, z + b, cw, 0.012, (zs - z - b) - (0.08 if k == 'rect' else 0.12), cm, 0.004, 'cur'); wl.box(u + w - b - cw, n1, z + b, cw, 0.012, (zs - z - b) - (0.08 if k == 'rect' else 0.12), cm, 0.004, 'cur')
    for i in range(bars):
        wl.box(u + w / 2 - 0.016, n1 + 0.012, z + b, 0.032, 0.02, (zs if k == 'rect' else zs + 0.1) - z - 2 * b, fr, 0.006, 'bar')
    if bars: wl.box(u + b, n1 + 0.012, z + (zs - z) * 0.56, w - 2 * b, 0.02, 0.032, fr, 0.006, 'bar')
    if sill: wl.box(u - 0.07, n0, z - 0.065, w + 0.14, dep + 0.11, 0.07, fr, 0.02, 'sill')
    if shutter:
        sw = w * 0.42; sm = lm(shutter, 0.8); sl = lm(shade(shutter, 0.8), 0.8)
        for su in (u - sw - 0.03, u + w + 0.03):
            wl.box(su, n0, z, sw, 0.05, h, sm, 0.012, 'shutter')
            for j in range(int(h / 0.13)): wl.box(su + 0.04, n0 + 0.05, z + 0.08 + j * 0.13, sw - 0.08, 0.012, 0.03, sl, 0.004, 'slat')
    if flowers: flower_box(wl, u - 0.03, z - 0.3, w + 0.06, n0, flowers)

def flower_box(wl, u, z, w, n0=0.0, cols=None):
    """A wooden flower box (its lower-left corner at (u, z)) with leaves and blooms."""
    cols = cols or [O['pink'], O['yellow'], O['cream'], O['tile']]
    wl.box(u, n0, z, w, 0.2, 0.17, lm(O['wood'], 0.7), 0.02, 'fbox'); wl.box(u + 0.02, n0 + 0.01, z + 0.16, w - 0.04, 0.18, 0.02, lm(O['soil'], 0.95), 0, 'soil')
    its = {i: [] for i in range(len(cols) + 1)}; k = max(2, int(w / 0.1))
    for i in range(k):
        uu = u + 0.05 + i * (w - 0.1) / (k - 1); x, y = wl.xy(uu, n0 + 0.1)
        its[0].append((x, y, z + 0.2, 0.065, 0.065, 0.05)); its[1 + i % len(cols)].append((x, y, z + 0.26 + 0.03 * (i % 2), 0.04, 0.04, 0.04))
    balls(its[0], lm(O['leaf'], 0.8), 'leaves', 1)
    for i, c in enumerate(cols):
        if its[1 + i]: balls(its[1 + i], lm(c, 0.6), 'bloom', 1)

def door(wl, u, w, h, col, trim=O['cream'], k='rect', step=True, hood=False, glass_top=False, n0=0.0):
    """A front door (u = its left edge, w wide, h high) with frame, panels, handle, step and an optional little hood."""
    fr = lm(trim, 0.7); dm = lm(col, 0.65); dl = lm(shade(col, 0.85), 0.7); b = 0.09
    if k == 'rect': leaf = rect_pts(u, u + w, 0, h); frame = rect_pts(u - b, u + w + b, 0, h + b)
    else: zs = h - arch_rise(w, 'round'); leaf = arch_pts(u, u + w, 0, zs, 'round'); frame = arch_pts(u - b, u + w + b, 0, zs, 'round')
    prism(wl, frame, 'uz', n0, n0 + 0.06, fr, 0.015, 'dframe'); prism(wl, leaf, 'uz', n0, n0 + 0.085, dm, 0.012, 'dleaf')
    n1 = n0 + 0.09
    if k == 'rect':
        for (z0, z1) in ((0.12, 0.95), (1.08, h - 0.16)): wl.box(u + 0.12, n1 - 0.01, z0, w - 0.24, 0.02, z1 - z0, dl, 0.012, 'dpanel')
    else:
        wl.box(u + 0.12, n1 - 0.01, 0.12, w - 0.24, 0.02, 0.85, dl, 0.012, 'dpanel')
        prism(wl, arch_pts(u + 0.12, u + w - 0.12, 1.08, zs, 'round', 10), 'uz', n1 - 0.01, n1 + 0.012, dl, 0.01, 'dpanel')
    x, y = wl.xy(u + w - 0.14, n1 + 0.04); ball(x, y, 1.02, 0.04, lm(C['brass'], 0.3, 0.9))
    if step:
        wl.box(u - 0.14, n0, 0, w + 0.28, 0.36, 0.09, lm(O['stone'], 0.85), 0.03, 'step')
        wl.box(u - 0.04, n0 + 0.3, 0, w + 0.08, 0.14, 0.05, lm(O['stoneD'], 0.85), 0.02, 'step')
    if hood:
        top = h + 0.06
        prism(wl, [(u - 0.28, top), (u + w + 0.28, top), (u + w / 2, top + 0.36)], 'uz', n0, n0 + 0.42, lm(O['tile'], 0.8), 0.015, 'hood')

def pot_plant(wl, u, n, s=1.0, z=0.0):
    x, y = wl.xy(u, n); M.pot(x, y, z, s)

# ---------- roofs ----------
def tile_pat(n, col, rows=4, cols=5, vertical=False, bar=False):
    u, v = M._grid(n); r = np.floor(v * rows); fr = v * rows - r
    cc = u * cols + (r % 2) * 0.5; ci = np.floor(cc); fc = cc - ci
    t = 0.93 + 0.14 * h2(ci, r, 2.0); base = np.array(rgb(col), 'float32')[None, None, :] * t[:, :, None].astype('float32')
    low = np.clip((fr - 0.74) / 0.26, 0, 1); hi = np.clip((0.2 - fr) / 0.2, 0, 1)
    k = 1 - 0.3 * low ** 1.5 + 0.06 * hi; jn = np.clip((0.045 - np.minimum(fc, 1 - fc)) / 0.045, 0, 1) * 0.16
    out = base * (k - jn)[:, :, None].astype('float32')
    return out.transpose(1, 0, 2) if vertical else out
def roof_mat(col, vertical, length, run):
    rows = 4
    rep = (run / (0.62), length / 1.0) if vertical else (length / 1.0, run / 0.62)
    return tex_mat('roof-%s-%d-%.1f-%.1f' % (col, vertical, length, run), lambda n: tile_pat(n, col, rows, 5, vertical), 256, 0.8, repeat=rep)

def roof_ridge_u(wl, u0, u1, D, zw, rise, col, ov=0.22, nf=0.26, t=0.09, wallc=None, cap=O['tileD']):
    """A gable roof whose ridge runs along the wall. Eaves at height zw, front eave at n = nf, back at -D - nf."""
    nm = -D / 2; nb = -D - nf; ze = zw - 0.06; zr = zw + rise; L = u1 - u0 + 2 * ov
    rm = roof_mat(col, wl.name == 'R', L, nf - nm)
    prism(wl, [(nf, ze), (nm, zr), (nm, zr + t), (nf, ze + t)], 'nz', u0 - ov, u1 + ov, rm, 0.008, 'roof')
    prism(wl, [(nm, zr), (nb, ze), (nb, ze + t), (nm, zr + t)], 'nz', u0 - ov, u1 + ov, rm, 0.008, 'roof')
    if wallc: prism(wl, [(nf, ze), (nb, ze), (nm, zr)], 'nz', u0, u1, lm(wallc, 0.92), 0.004, 'attic')
    wl.box(u0 - ov - 0.02, nm - 0.08, zr + t - 0.03, L + 0.04, 0.16, 0.08, lm(cap, 0.7), 0.03, 'ridge')
    wl.box(u0 - ov, nf - 0.025, ze - 0.02, L, 0.04, 0.13, lm(O['cream'], 0.8), 0.012, 'fascia')

def roof_front_gable(wl, u0, u1, D, zw, rise, col, ov=0.2, nf=0.26, t=0.09, wallc=None):
    """A gable roof whose ridge runs out from the wall (the triangle faces the street)."""
    um = (u0 + u1) / 2; ze = zw - 0.04; zr = zw + rise; nb = -D - 0.1; ln = nf - nb
    rm = roof_mat(col, wl.name != 'R', ln, (u1 - um + ov))
    prism(wl, [(um, zr), (u1 + ov, ze), (u1 + ov, ze + t), (um, zr + t)], 'uz', nb, nf, rm, 0.008, 'roof')
    prism(wl, [(um, zr), (u0 - ov, ze), (u0 - ov, ze + t), (um, zr + t)], 'uz', nb, nf, rm, 0.008, 'roof')
    if wallc: prism(wl, [(u0 - 0.02, ze), (u1 + 0.02, ze), (um, zr - 0.01)], 'uz', -D, 0.0, lm(wallc, 0.92), 0.004, 'gable')
    prism(wl, [(um - 0.07, zr + t - 0.02), (um + 0.07, zr + t - 0.02), (um + 0.07, zr + t + 0.06), (um - 0.07, zr + t + 0.06)], 'uz', nb, nf, lm(O['tileD'], 0.7), 0.03, 'ridge')

def chimney(wl, u, n, z0, z1, col=O['brick']):
    wl.box(u, n, z0, 0.36, 0.36, z1 - z0, lm(col, 0.9), 0.02, 'chimney'); wl.box(u - 0.04, n - 0.04, z1, 0.44, 0.44, 0.07, lm(O['stone'], 0.85), 0.02, 'chcap')

def house(wl, u0, u1, D, H, body, trim=O['cream'], base='#B9976A', band=2.45, quoin=True, name='house'):
    """The wall of a house: body, plinth, floor band, corner quoins and cornice. Door, windows and roof are added by the caller."""
    L = u1 - u0; bm = lm(body, 0.92); tm = lm(trim, 0.8)
    wl.box(u0, -D, 0, L, D, H, bm, 0.02, 'wall'); wl.box(u0 - 0.02, -D, 0, L + 0.04, D + 0.045, 0.36, lm(base, 0.9), 0.03, 'plinth')
    if band: wl.box(u0 - 0.03, -D, band, L + 0.06, D + 0.055, 0.1, tm, 0.02, 'band')
    if quoin:
        for uu in (u0 - 0.02, u1 - 0.13): wl.box(uu, -D, 0.36, 0.15, D + 0.03, H - 0.36, tm, 0.02, 'quoin')
    wl.box(u0 - 0.07, -D, H - 0.03, L + 0.14, D + 0.12, 0.14, tm, 0.025, 'cornice')

# ---------- trees and hedges ----------
def crown(cx, cy, cz, r, tones, seed=1, n=6, flat=0.85, spread=0.55):
    """A puffy crown: n lumps round (cx, cy, cz), three tones, darker below, lighter above."""
    rnd = random.Random(seed); groups = {0: [], 1: [], 2: []}
    for i in range(n):
        a = rnd.uniform(0, 6.28) if i else 0; d = spread * r * (rnd.uniform(0.5, 1) if i else 0); rr = r * (rnd.uniform(0.62, 0.8) if i else 1.0)
        dz = rnd.uniform(-0.35, 0.45) * r if i else 0
        groups[1 if dz < -0.05 * r else (2 if dz > 0.18 * r else 0)].append((cx + math.cos(a) * d, cy + math.sin(a) * d, cz + dz, rr, rr, rr * flat))
    for k in range(3):
        if groups[k]: balls(groups[k], lm(tones[k], 0.8), 'crown', 2)

def tree(x, y, z0, th, cr, seed=1, tones=None, trunk=0.13, n=6):
    """A tree: tapered trunk with a few branches under a puffy crown; trunk height th, crown radius cr."""
    tones = tones or (O['leaf'], O['leafD'], O['leafL']); tm = lm('#8A5A36', 0.9)
    cyl(x, y, z0, trunk * 1.25, 0.3, tm, 0.02, 20, trunk * 1.05); cyl(x, y, z0 + 0.28, trunk * 1.05, th - 0.28, tm, 0.0, 20, trunk * 0.78)
    for a in (0.8, 2.9, 4.7):
        tube((x, y, z0 + th * 0.78), (x + math.cos(a) * cr * 0.42, y + math.sin(a) * cr * 0.42, z0 + th + cr * 0.15), trunk * 0.42, tm, trunk * 0.3)
    crown(x, y, z0 + th + cr * 0.55, cr, tones, seed, n)

def hedge(wl, u0, u1, n0, n1, h, seed=1, tone=None, blooms=True):
    """A clipped hedge: a rounded green block with a lumpy top and a few blossoms."""
    tone = tone or (O['leafD'], O['leaf'], O['leafL']); rnd = random.Random(seed)
    wl.box(u0, n0, 0, u1 - u0, n1 - n0, h * 0.9, lm(tone[0], 0.85), min(0.22, (n1 - n0) / 2.4), 'hedge')
    items = []; its = []; u = u0 + 0.2
    while u < u1 - 0.15:
        x, y = wl.xy(u, (n0 + n1) / 2 + rnd.uniform(-0.05, 0.05)); r = rnd.uniform(0.17, 0.27); items.append((x, y, h * 0.86 + rnd.uniform(-0.04, 0.05), r, (n1 - n0) * 0.42, r * 0.8) if wl.name == 'L' else (x, y, h * 0.86 + rnd.uniform(-0.04, 0.05), (n1 - n0) * 0.42, r, r * 0.8))
        if blooms and rnd.random() < 0.35:
            x2, y2 = wl.xy(u + rnd.uniform(-0.1, 0.1), n1 - 0.04); its.append((x2, y2, h * rnd.uniform(0.45, 0.9), 0.04, 0.04, 0.04))
        u += rnd.uniform(0.28, 0.42)
    balls(items, lm(tone[1], 0.85), 'hedgetop', 1)
    if its: balls(its, lm(rnd.choice([O['pink'], O['cream'], O['yellow']]), 0.6), 'bloom', 1)

# ================================================================= the street
def road_paint(cv, y0=7.6, y1=9.8, cross=None, dash=True):
    """Two-lane road along X: smooth dark asphalt, a pale kerb line each side, dashed centre line, a thin verge beyond."""
    ym = (y0 + y1) / 2
    cv.put(sd_rect(cv, -1, y1, 11, 10.5), pat_grass(cv, 6.0, 0.9))                     # the verge
    cv.put(sd_rect(cv, -1, y0 - 0.12, 11, y1 + 0.12), '#C9BDA6')                        # the kerbs
    asph = np.array(rgb('#555A66'), 'float32') * (0.97 + 0.06 * vnoise(cv.X, cv.Y, 0.5, 3.0)[:, :, None])
    cv.put(sd_rect(cv, -1, y0, 11, y1), asph)
    cv.put(sd_rect(cv, -1, y0 + 0.02, 11, y0 + 0.07), '#6B7080'); cv.put(sd_rect(cv, -1, y1 - 0.07, 11, y1 - 0.02), '#6B7080')
    if dash:
        x = -0.2
        while x < 10.6:
            cv.put(sd_rect(cv, x, ym - 0.05, x + 0.6, ym + 0.05, 0.02), '#F1E9D2'); x += 1.15
    if cross:
        a, b = cross; cv.put(sd_rect(cv, a, y0, b, y1), asph)
        y = y0 + 0.12
        while y < y1 - 0.2:
            cv.put(sd_rect(cv, a + 0.04, y, b - 0.04, y + 0.28, 0.03), '#F4EEDC'); y += 0.5

def paint_street(n):
    cv = Cv(n, 10, 10)
    cv.img = pat_cobbles(cv, 0.24, O['cobble'], O['cobble2'], O['mortar'], 2.0)
    kerb = '#BCA582'
    pv = pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 4.0)
    pv2 = pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 8.0, swap=True)
    # a lawn with a stone edging
    sd = sd_rect(cv, 6.0, 1.85, 9.8, 3.95, 0.25); cv.put(sd - 0.1, kerb); cv.put(sd - 0.04, O['stone']); cv.put(sd, pat_grass(cv, 9.0, 0.9))
    # the pavement along the houses, the way to the plaza and the way to the park
    walk = sd_or(sd_rect(cv, -1, -1, 10.5, 1.55), sd_rect(cv, -1, -1, 1.55, 7.6), sd_rect(cv, -1, 5.8, 10.5, 7.6))
    cv.put(walk - 0.11, kerb); cv.put(walk, pv)
    wa = sd_rect(cv, 1.0, 4.2, 10.5, 5.8); wb = sd_rect(cv, 4.2, 1.0, 5.8, 6.0)
    cv.put(sd_or(wa, wb) - 0.1, kerb); cv.put(wa, pv2); cv.put(wb, pv); cv.put(sd_rect(cv, 4.2, 5.7, 5.8, 7.5), pv)
    # a little paved round where the two ways cross
    c = sd_circle(cv, 5.0, 5.0, 1.45); cv.put(c, O['paver']); cv.put(sd_ring(c, 0.09), O['stoneD']); cv.put(sd_ring(c + 0.35, 0.05), O['tile'])
    cv.put(sd_star8(cv, 5, 5, 0.72), O['tealL']); cv.put(sd_ring(sd_star8(cv, 5, 5, 0.72), 0.05), O['stoneD']); cv.put(sd_circle(cv, 5, 5, 0.26), O['tile'])
    # the family's parking bay, cut into the pavement, and the waiting area at the bus stop
    bay = sd_rect(cv, 1.1, 6.7, 3.5, 7.62, 0.06); cv.put(bay, pat_pavers(cv, 0.4, 0.4, '#B9B3A8', '#A9A39A', 0.02, 0, 3.0, gapc='#8F897F'))
    for yy in (6.7,): cv.put(sd_rect(cv, 1.1, yy, 3.5, yy + 0.05), '#F4EEDC')
    cv.put(sd_rect(cv, 1.1, 6.7, 1.15, 7.6), '#F4EEDC'); cv.put(sd_rect(cv, 3.45, 6.7, 3.5, 7.6), '#F4EEDC')
    wait = sd_rect(cv, 7.4, 6.2, 9.4, 7.6, 0.15); cv.put(wait, pat_pavers(cv, 0.4, 0.4, O['tealL'], '#B7DDD6', 0.025, 0, 5.0, gapc='#8FBDB6'))
    cv.put(sd_ring(wait, 0.06), O['stoneD'])
    # a tree pit
    tp = sd_circle(cv, 3.3, 6.1, 0.5); cv.put(tp, O['stoneD']); cv.put(tp + 0.06, pat_grass(cv, 2.0, None))
    # flower strips under the house fronts (with the doors left clear)
    cols = [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3']
    strip = sd_or(sd_rect(cv, 0.03, 0.03, 10.0, 0.44, 0.12), sd_rect(cv, 0.03, 0.03, 0.44, 7.5, 0.12))
    for (a, b) in ((1.3, 3.0), (4.4, 5.6), (7.4, 8.6)): strip = sd_sub(strip, sd_rect(cv, a, -1, b, 1.0))
    for (a, b) in ((2.3, 4.05), (5.3, 6.7)): strip = sd_sub(strip, sd_rect(cv, -1, a, 1.0, b))
    cv.put(strip - 0.045, O['stoneD']); cv.put(strip, pat_flowers(cv, cols, 5.0, 0.15))
    sd = sd_rect(cv, 6.35, 2.2, 7.95, 3.1, 0.2); cv.put(sd - 0.07, O['stoneD']); cv.put(sd, pat_flowers(cv, cols, 7.0 + 6.35, 0.16))
    road_paint(cv, cross=(4.2, 5.8))
    cv.put(sd_rect(cv, 4.2, 9.8, 5.8, 10.5), pv)         # the zebra comes out on the paved way off the near edge
    return cv.img

def street_shapes(L, R):
    """The back wall of the street: houses on both sides."""
    # ---- house A: OUR house (yellow, ridge along the street, chimney)
    house(L, 0.0, 3.8, 1.4, 3.95, O['yellow'], base='#C19A62')
    door(L, 1.6, 1.15, 2.1, O['teal'], k='round', hood=True)
    window(L, 0.45, 0.85, 0.85, 1.15, flowers=None, shutter=None, trim=O['cream']); flower_box(L, 0.42, 0.55, 0.91, 0.0)
    window(L, 3.0, 0.85, 0.6, 1.15, flowers=None); flower_box(L, 2.97, 0.55, 0.66, 0.0)
    window(L, 0.62, 2.85, 0.78, 0.85, shutter='#8FB57A'); window(L, 2.5, 2.85, 0.78, 0.85, shutter='#8FB57A'); flower_box(L, 0.59, 2.55, 0.84, 0.0, None)
    roof_ridge_u(L, 0.0, 3.8, 1.4, 3.95, 1.0, O['tile'], wallc=O['yellow']); chimney(L, 2.95, -1.0, 4.4, 5.55)
    # ---- house B: the friends' (peach, a gable toward the street, round attic window)
    house(L, 3.8, 6.3, 1.6, 3.9, O['peach'], base='#B9855E')
    door(L, 4.5, 1.0, 2.1, O['slate'], k='rect', hood=True)
    window(L, 3.95, 0.9, 0.4, 1.15, 'round'); flower_box(L, 3.92, 0.6, 0.46, 0.0); window(L, 5.65, 0.9, 0.4, 1.15, 'round'); flower_box(L, 5.62, 0.6, 0.46, 0.0)
    window(L, 4.05, 2.8, 0.5, 0.85, shutter='#2E9C97'); window(L, 5.5, 2.8, 0.5, 0.85, shutter='#2E9C97')
    roof_front_gable(L, 3.8, 6.3, 1.6, 3.9, 1.25, '#2F7F84', wallc=O['peach'])
    gx, gy = L.xy(5.05, 0.02); w0 = L; prism(L, [(5.05 + 0.2 * math.cos(2 * math.pi * i / 20), 4.52 + 0.2 * math.sin(2 * math.pi * i / 20)) for i in range(20)], 'uz', 0.0, 0.07, lm(O['cream'], 0.7), 0.01, 'atticf')
    prism(L, [(5.05 + 0.14 * math.cos(2 * math.pi * i / 20), 4.52 + 0.14 * math.sin(2 * math.pi * i / 20)) for i in range(20)], 'uz', 0.0, 0.085, glass_mat(), 0.004, 'atticg')
    chimney(L, 3.95, -1.2, 4.4, 5.5)
    # ---- house C: the new family's (soft pink, a little gablet over the door)
    house(L, 6.3, 9.7, 0.7, 3.9, O['pink'], base='#B98A66')
    door(L, 7.5, 1.0, 2.1, O['cream'], k='round', hood=False)
    window(L, 6.55, 0.9, 0.65, 1.15); flower_box(L, 6.52, 0.6, 0.71, 0.0); window(L, 8.8, 0.9, 0.65, 1.15); flower_box(L, 8.77, 0.6, 0.71, 0.0)
    window(L, 6.65, 2.8, 0.6, 0.85, shutter='#FFF3DC'); window(L, 8.75, 2.8, 0.6, 0.85, shutter='#FFF3DC'); window(L, 7.7, 2.8, 0.6, 0.85, 'round')
    roof_ridge_u(L, 6.3, 9.7, 0.7, 3.9, 0.8, O['slate'], wallc=O['pink'], nf=0.22); chimney(L, 9.0, -0.55, 4.2, 5.25)
    # ---- far end: a hedge by the last house
    hedge(L, 9.7, 10.0, -0.7, -0.05, 0.9, 3)
    # =============== right wall: the grandparents' house
    house(R, 1.3, 5.05, 1.4, 3.9, '#F6E6BE', base='#B99A70')
    door(R, 2.6, 1.15, 2.1, '#6D9D5F', k='round', hood=False)
    window(R, 1.45, 0.9, 0.75, 1.15); flower_box(R, 1.42, 0.6, 0.81, 0.0); window(R, 4.0, 0.9, 0.75, 1.15); flower_box(R, 3.97, 0.6, 0.81, 0.0)
    window(R, 1.7, 2.8, 0.7, 0.85, shutter='#8FB57A'); window(R, 3.9, 2.8, 0.7, 0.85, shutter='#8FB57A'); window(R, 2.825, 2.8, 0.7, 0.85, 'round'); flower_box(R, 2.795, 2.5, 0.76, 0.0)
    roof_ridge_u(R, 1.3, 5.05, 1.4, 3.9, 1.0, O['brown'], wallc='#F6E6BE'); chimney(R, 4.3, -1.0, 4.3, 5.5)
    # the little porch: a lean-to roof on two posts, with pots
    wd = lm(O['woodL'], 0.7)
    for pu in (2.4, 3.92): R.box(pu, 0.4, 0, 0.1, 0.1, 2.5, wd, 0.02, 'post')
    R.box(2.25, 0.0, 2.45, 1.9, 0.1, 0.1, lm(O['cream'], 0.8), 0.02, 'beam')
    prism(R, [(0.0, 2.58), (0.62, 2.42), (0.62, 2.52), (0.0, 2.68)], 'nz', 2.2, 4.05, roof_mat(O['brown'], True, 1.85, 0.62), 0.01, 'porch')
    for pu in (2.45, 3.97): pot_plant(R, pu + 0.02, 0.22, 1.0)
    # ---- the elderly neighbour's small house (peach cream, gable, round windows); its door is centred at y = 6.0
    house(R, 5.15, 7.35, 1.2, 3.2, '#F2CFA8', base='#B79670', band=0)
    door(R, 5.5, 1.0, 2.0, '#8A5CA8', k='rect', step=True, hood=False)
    window(R, 6.75, 0.9, 0.4, 1.0, 'round'); flower_box(R, 6.72, 0.6, 0.46, 0.0)
    roof_front_gable(R, 5.15, 7.35, 1.2, 3.2, 1.1, '#5E9E8C', wallc='#F2CFA8')
    prism(R, [(6.25 + 0.2 * math.cos(2 * math.pi * i / 20), 3.9 + 0.2 * math.sin(2 * math.pi * i / 20)) for i in range(20)], 'uz', 0.0, 0.07, lm(O['cream'], 0.7), 0.01, 'atticf')
    prism(R, [(6.25 + 0.14 * math.cos(2 * math.pi * i / 20), 3.9 + 0.14 * math.sin(2 * math.pi * i / 20)) for i in range(20)], 'uz', 0.0, 0.085, glass_mat(), 0.004, 'atticg')
    # ---- a front garden at the corner: a low hedge and a picket fence
    hedge(R, 0.0, 1.3, -0.8, -0.1, 1.05, 7)
    picket(R, 0.0, 1.3, 0.05, 0.85)

def picket(wl, u0, u1, n, h, col=None):
    """A little picket fence along a wall: posts, two rails and pickets with pointed tops."""
    col = col or O['cream']; m = lm(col, 0.75); items = []; its = []; u = u0 + 0.05
    while u < u1 - 0.04:
        items.append((u, n, 0.04, 0.075, 0.03, h - 0.1)); its.append((u + 0.0375, n, h - 0.06, 0.075, 0.03, 0.06)); u += 0.15
    wboxes(wl, items, m, 0.008, 'pickets')
    for z in (0.18, h - 0.28): wl.box(u0, n - 0.025, z, u1 - u0, 0.03, 0.06, lm(O['woodL'], 0.75), 0.01, 'rail')
    for u in [u0] + [u0 + (u1 - u0) * i / max(1, round((u1 - u0) / 1.2)) for i in range(1, max(1, round((u1 - u0) / 1.2)) + 1)]:
        wl.box(u - 0.04, n - 0.045, 0, 0.09, 0.09, h + 0.04, lm(O['woodL'], 0.7), 0.02, 'post')

def build_street(sp):   # the old one-place builder (no longer registered: m_town paints the town)
    w, d = sp['size']
    ground(w, d, paint_street, 'street')
    exit_pad(w, 4.2, 1.6, 'FL'); exit_pad(d, 4.2, 1.6, 'FR'); exit_pad(w, 7.6, 2.2, 'FL', '#555A66')
    street_shapes(Wl('L'), Wl('R'))

def exit_pad(w, pos, wd, side, col=None):
    """A paved piece that covers the stone lip where a path runs off the edge."""
    m = lm(col or O['paver2'], 0.9)
    if side == 'FL': box(w - 0.07, pos, -0.30, 0.07, wd, 0.30, m, 0.01, 'exit')
    else: box(pos, w - 0.07, -0.30, wd, 0.07, 0.30, m, 0.01, 'exit')

# ================================================================= the plaza
def crescent_pts(R=0.4, r=0.34, d=0.17, up=True):
    t = math.acos((R * R + d * d - r * r) / (2 * R * d)); ph = math.atan2(R * math.sin(t), R * math.cos(t) - d)
    pts = [(R * math.cos(a), R * math.sin(a)) for a in [t + i * (2 * math.pi - 2 * t) / 28 for i in range(29)]]
    pts += [(d + r * math.cos(a), r * math.sin(a)) for a in [(2 * math.pi - ph) - i * (2 * math.pi - 2 * ph) / 24 for i in range(1, 24)]]
    return [(-y, x) for (x, y) in pts] if up else pts       # opening upward

def crescent(x, y, z, s, m=None):
    """A gold crescent facing the camera, outer radius 0.4 * s."""
    o = M.plaque(crescent_pts(), 0.2, m or lm(C['brass'], 0.3, 0.9), 0.03); o.scale = (s, s, s); o.location = (x, y, z); return o

def paint_plaza(n):
    cv = Cv(n, 10, 10)
    cv.img = pat_pavers(cv, 0.6, 0.6, O['paver'], O['paver2'], 0.022, 0.0, 11.0, var=0.7)
    kerb = '#BCA582'
    # a band of teal and cream tiles along the building fronts
    fr = sd_or(sd_rect(cv, -1, -1, 10.5, 0.7), sd_rect(cv, -1, -1, 0.7, 7.5))
    cv.put(fr, pat_pavers(cv, 0.35, 0.35, '#CFE6DF', '#BFDDD5', 0.02, 0.0, 5.0, gapc='#9CC7BE'))
    cv.put(sd_ring(fr, 0.07), O['stoneD'])
    # the big medallion with a khatam star, round the fountain (centre 5.0, 4.4)
    cx, cy = 5.0, 4.4; c = sd_circle(cv, cx, cy, 2.7)
    cv.put(c, '#F6EBCF'); cv.put(sd_ring(c, 0.16), O['teal']); cv.put(sd_ring(c + 0.22, 0.05), O['sand'] if False else '#E3B34A'); cv.put(sd_ring(c + 0.5, 0.04), O['tealL'])
    st = sd_star8(cv, cx, cy, 2.0); cv.put(st, O['tealL']); cv.put(sd_ring(st, 0.06), O['teal'])
    st2 = sd_star8(cv, cx, cy, 1.45); cv.put(st2, '#F6EBCF'); cv.put(sd_ring(st2, 0.05), O['tile'])
    for i in range(8):
        a = i * math.pi / 4 + math.pi / 8; cv.put(sd_rrect(cv, cx + 2.32 * math.cos(a), cy + 2.32 * math.sin(a), 0.1, 0.16, a + math.pi / 2, 0.02), O['tile'])
    for i in range(8):
        a = i * math.pi / 4; cv.put(sd_circle(cv, cx + 1.7 * math.cos(a), cy + 1.7 * math.sin(a), 0.07), '#E3B34A')
    cv.put(sd_circle(cv, cx, cy, 1.2), '#EBDDB8')
    # the paved lane to the street, and the pavement along the road
    ln = sd_rect(cv, -1, 4.2, 1.2, 5.8); cv.put(ln - 0.1, kerb); cv.put(ln, pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 4.0))
    wk = sd_rect(cv, -1, 6.5, 10.5, 7.6); cv.put(wk - 0.11, kerb); cv.put(wk, pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 8.0))
    wait = sd_rect(cv, 5.1, 6.4, 7.0, 7.6, 0.15); cv.put(wait, pat_pavers(cv, 0.4, 0.4, O['tealL'], '#B7DDD6', 0.025, 0, 5.0, gapc='#8FBDB6')); cv.put(sd_ring(wait, 0.06), O['stoneD'])
    for (px, py) in ((1.5, 2.4), (8.6, 6.0)):                    # the pits of the two trees in planters are in their sprites
        pass
    road_paint(cv)
    return cv.img

def paint_lane(n):
    cv = Cv(n, 2.2, 1.6); cv.img = pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 4.0); return cv.img

def tile_band(wl, u0, u1, z0, z1, n, bg, star, line, cell=None, name='kh'):
    """A band of khatam stars (teal / cream / gold) lying on the wall."""
    cell = cell or (z1 - z0)
    pm = pat_mat(name + bg[1:] + star[1:], lambda s: M.khatam(s, bg, star, line, 1), u1 - u0, z1 - z0, cell, 0.8)
    return panel(wl, rect_pts(u0, u1, z0, z1), n, 0.02, pm, 'band')

def dome(x, y, z, r, h, m, ribs=8, rib_m=None, seed=0):
    """A soft pointed dome on a ring: lathe profile, ribs, a little neck."""
    prof = [(r * 1.03, 0), (r * 1.06, 0.05)]
    for i in range(1, 15):
        t = i / 15.0; prof.append((r * math.cos(t * math.pi / 2) ** 0.95 * (1.0 + 0.05 * math.sin(t * math.pi)), 0.05 + (h - 0.05) * math.sin(t * math.pi / 2) ** 1.2))
    prof.append((0.001, h)); lathe(x, y, z, prof, m, 40, 'dome')
    if rib_m:
        for k in range(ribs):
            a = 2 * math.pi * k / ribs; pts = [(x + math.cos(a) * p[0] * 1.012, y + math.sin(a) * p[0] * 1.012, z + p[1]) for p in prof[1:-1:2]]
            for p0, p1 in zip(pts, pts[1:]): tube(p0, p1, 0.022, rib_m, caps=False)
    lathe(x, y, z, [(r * 1.08, -0.02), (r * 1.08, 0.1)], rib_m or lm(O['cream']), 40, 'ring')

def merlons(wl, u0, u1, z, n0, n1, m, step=0.34, w=0.18, h=0.2):
    items = []; u = u0 + 0.06
    while u + w < u1: items.append((u, n0, z, w, n1 - n0, h)); u += step
    wboxes(wl, items, m, 0.02, 'merlons')

def masjid(L):
    cream = lm('#F8EDD5', 0.9); trim = lm('#FFF8E8', 0.8); stone = lm('#E6D6B4', 0.9); teal = lm(O['teal'], 0.7); tealD = lm(O['tealD'], 0.7)
    gold = lm('#E3B34A', 0.5, 0.2); warm = lm('#E9B97A', 0.6, emit=('#E8B070', 0.22))
    # plinth along the whole front
    L.box(0.3, -1.7, 0, 6.8, 1.76, 0.26, stone, 0.03, 'plinth')
    # ---- left wing with a small dome
    L.box(0.4, -1.5, 0.26, 1.7, 1.5, 3.04, cream, 0.03, 'wing')
    L.box(0.34, -1.5, 3.3, 1.82, 1.58, 0.14, trim, 0.03, 'cornice'); merlons(L, 0.4, 2.1, 3.44, -0.02, 0.1, trim)
    tile_band(L, 0.4, 2.1, 0.26, 0.95, 0.012, O['tealD'], O['tealL'], O['cream'], 0.35, 'wain'); tile_band(L, 0.4, 2.1, 2.5, 2.95, 0.012, O['teal'], O['cream'], '#E3B34A', 0.45, 'frz')
    for uu in (0.62, 1.42): window(L, uu, 1.2, 0.5, 1.25, 'point', trim='#FFF8E8', bars=1)
    drum_c = L.xy(1.25, -0.75); cyl(drum_c[0], drum_c[1], 3.44, 0.58, 0.42, cream, 0.02, 32)
    lathe(drum_c[0], drum_c[1], 3.8, [(0.6, 0), (0.6, 0.08)], teal, 32)
    dome(drum_c[0], drum_c[1], 3.88, 0.62, 0.8, teal, 6, gold)
    tube((drum_c[0], drum_c[1], 4.66), (drum_c[0], drum_c[1], 4.9), 0.02, gold); ball(drum_c[0], drum_c[1], 4.9, 0.04, gold); crescent(drum_c[0], drum_c[1], 5.08, 0.28)
    # ---- the grand entrance block (the iwan): door 2.8 .. 4.2
    L.box(2.1, -2.2, 0.26, 2.8, 2.48, 4.7, cream, 0.03, 'portal')
    L.box(2.0, -2.2, 4.95, 3.0, 2.58, 0.14, trim, 0.03, 'cornice'); merlons(L, 2.1, 4.9, 5.09, 0.04, 0.2, trim, 0.37, 0.2, 0.24)
    for uu in (2.1, 4.76): L.box(uu, -0.2, 0.26, 0.14, 0.5, 4.69, teal, 0.03, 'pilaster')
    tile_band(L, 2.24, 4.76, 4.12, 4.62, 0.286, O['teal'], O['cream'], '#E3B34A', 0.5, 'frz2')
    tile_band(L, 2.24, 4.76, 0.26, 0.8, 0.286, O['tealD'], O['tealL'], O['cream'], 0.54, 'wain2')
    zs = 2.0; n0 = 0.28
    def ar(u0, u1, spring, m, nn, dd, k='point'): return prism(L, arch_pts(u0, u1, 0.26, spring, k), 'uz', nn, nn + dd, m, 0.012, 'arch')
    ar(2.3, 4.7, zs, teal, n0, 0.05); ar(2.38, 4.62, zs, trim, n0, 0.075); ar(2.45, 4.55, zs, gold, n0, 0.09); ar(2.52, 4.48, zs, lm('#7A4A35', 0.9), n0, 0.1)
    # a glowing doorway inside, with a frame ring and a threshold
    ar(2.8, 4.2, 1.7, tealD, n0, 0.115); ar(2.88, 4.12, 1.7, warm, n0, 0.13)
    for uu in (2.88, 4.0): L.box(uu, n0 + 0.1, 0.26, 0.12, 0.04, 1.35, lm('#B98250', 0.8), 0.015, 'leaf')           # two door leaves standing open
    L.box(2.88, n0 + 0.1, 0.26, 1.24, 0.3, 0.015, lm(C['terra'], 0.95), 0.0, 'carpet')
    prism(L, [(3.5 + 0.22 * math.cos(2 * math.pi * i / 16 + math.pi / 8), 3.3 + 0.22 * math.sin(2 * math.pi * i / 16 + math.pi / 8)) for i in range(16)], 'uz', n0 + 0.04, n0 + 0.11, gold, 0.01, 'star')
    prism(L, [(3.5 + 0.15 * math.cos(2 * math.pi * i / 8), 3.3 + 0.15 * math.sin(2 * math.pi * i / 8)) for i in range(8)], 'uz', n0 + 0.1, n0 + 0.125, teal, 0.005, 'star2')
    L.box(2.4, n0, 0.0, 2.2, 0.28, 0.07, lm(O['stone'], 0.85), 0.02, 'step')
    L.box(2.6, n0 + 0.2, 0.0, 1.8, 0.18, 0.04, lm(O['stoneD'], 0.85), 0.02, 'step2')
    # ---- the big dome
    dc = L.xy(3.5, -0.95); cyl(dc[0], dc[1], 5.0, 1.2, 0.58, cream, 0.02, 40); lathe(dc[0], dc[1], 5.58, [(1.22, 0), (1.22, 0.1), (1.18, 0.12)], teal, 40)
    for i in range(10):
        a = math.radians(i * 36 + 18); ball(dc[0] + 1.205 * math.cos(a), dc[1] + 1.205 * math.sin(a), 5.3, 0.1, lm('#4E8F8C', 0.6), 0.55, 0.55, 1.5)
    dome(dc[0], dc[1], 5.66, 1.18, 1.38, teal, 12, gold)
    tube((dc[0], dc[1], 7.0), (dc[0], dc[1], 7.2), 0.035, gold); ball(dc[0], dc[1], 7.0, 0.07, gold); ball(dc[0], dc[1], 7.2, 0.05, gold); crescent(dc[0], dc[1], 7.46, 0.36)
    # ---- the minaret: a square tower, an eight-sided shaft, a balcony, a slim upper shaft and a pointed cap
    L.box(4.9, -1.3, 0.26, 1.2, 1.58, 3.2, cream, 0.03, 'tower'); L.box(4.84, -1.3, 3.4, 1.32, 1.66, 0.14, trim, 0.03, 'tcornice')
    tile_band(L, 4.9, 6.1, 0.26, 0.95, 0.292, O['tealD'], O['tealL'], O['cream'], 0.35, 'wain'); tile_band(L, 4.9, 6.1, 2.55, 3.0, 0.292, O['teal'], O['cream'], '#E3B34A', 0.45, 'frz')
    window(L, 5.25, 1.2, 0.5, 1.2, 'point', trim='#FFF8E8', n0=0.28)
    mc = L.xy(5.5, -0.65); mx, my = mc
    o = cyl(mx, my, 3.54, 0.5, 1.8, cream, 0.01, 8); o.rotation_euler = (0, 0, math.radians(22.5))
    o = cyl(mx, my, 4.1, 0.53, 0.14, teal, 0.01, 8); o.rotation_euler = (0, 0, math.radians(22.5))
    o = cyl(mx, my, 4.6, 0.53, 0.14, teal, 0.01, 8); o.rotation_euler = (0, 0, math.radians(22.5))
    for i in range(8):
        a = math.radians(i * 45); ball(mx + 0.5 * 0.924 * math.cos(a) * 1.0, my + 0.5 * 0.924 * math.sin(a), 4.35, 0.07, lm('#4E8F8C', 0.6), 0.4, 0.4, 1.6)
    cyl(mx, my, 5.3, 0.74, 0.14, tealD, 0.01, 24); cyl(mx, my, 5.28, 0.64, 0.06, cream, 0.01, 24)
    for i in range(16):
        a = 2 * math.pi * i / 16; cyl(mx + 0.68 * math.cos(a), my + 0.68 * math.sin(a), 5.44, 0.022, 0.34, gold, 0.0, 8)
    torus(mx, my, 5.78, 0.68, 0.028, gold, 1.0, 36, 8)
    cyl(mx, my, 5.44, 0.37, 0.8, cream, 0.01, 16); cyl(mx, my, 5.98, 0.4, 0.1, teal, 0.01, 16)
    lathe(mx, my, 6.2, [(0.5, 0), (0.46, 0.06), (0.3, 0.3), (0.12, 0.62), (0.03, 0.9), (0.001, 0.94)], teal, 24)
    tube((mx, my, 7.1), (mx, my, 7.22), 0.025, gold); ball(mx, my, 7.22, 0.05, gold); crescent(mx, my, 7.4, 0.3)
    # ---- the courtyard wall between the masjid and the school, with a lantern pier
    L.box(6.1, -0.4, 0, 0.9, 0.45, 1.05, cream, 0.03, 'cwall'); L.box(6.05, -0.4, 1.05, 0.95, 0.5, 0.1, trim, 0.03, 'ccap'); L.box(6.1, 0.0, 0.2, 0.9, 0.02, 0.4, teal, 0.0, 'cband')

def school(L):
    body = '#F7D878'; trim = lm('#FFF8E8', 0.8); blue = lm('#4D78B5', 0.7)
    house(L, 7.0, 9.8, 0.6, 3.4, body, band=2.3, quoin=True, base='#C9A468')
    door(L, 7.8, 1.15, 2.1, '#3E86C2', k='rect', hood=False)
    for uu in (7.1, 9.2): window(L, uu, 0.85, 0.5, 1.2, flowers=None, trim='#FFF8E8'); flower_box(L, uu - 0.03, 0.55, 0.56, 0.0, [O['pink'], O['yellow'], O['cream']])
    for uu in (7.12, 8.0, 8.88): window(L, uu, 2.5, 0.6, 0.65, 'rect', trim='#FFF8E8')
    # flat roof with a parapet, and a little belfry gable over the door with the bell
    L.box(6.93, -0.6, 3.4, 2.94, 0.7, 0.24, blue, 0.04, 'parapet')
    prism(L, [(7.7, 3.64), (9.05, 3.64), (8.375, 4.75)], 'uz', -0.15, 0.1, trim, 0.025, 'belfry')
    prism(L, arch_pts(8.05, 8.7, 3.72, 4.0, 'round'), 'uz', 0.09, 0.14, lm('#5A3E2B', 0.9), 0.01, 'belfryin')
    bx, by = L.xy(8.375, 0.0); lathe(bx, by + 0.0, 3.86, [(0.001, 0), (0.1, 0), (0.12, 0.07), (0.085, 0.2), (0.05, 0.26), (0.001, 0.28)], lm(C['brass'], 0.35, 0.9), 24)
    ball(bx, by, 3.86, 0.03, lm(C['brass'], 0.35, 0.9))
    # the flag: a pole on the roof corner and a plain teal flag with a cream edge
    fx, fy = L.xy(9.55, -0.25); cyl(fx, fy, 3.64, 0.03, 1.9, lm('#EFE6D0', 0.5), 0.0, 12); ball(fx, fy, 5.56, 0.05, lm(C['brass'], 0.3, 0.9))
    fl = box(fx - 0.5, fy - 0.01, 4.78, 0.5, 0.02, 0.4, lm(O['teal'], 0.8), 0.01, 'flag'); box(fx - 0.5, fy - 0.012, 4.78, 0.5, 0.024, 0.04, lm('#FFF8E8', 0.8), 0.0, 'flagedge'); box(fx - 0.5, fy - 0.012, 5.14, 0.5, 0.024, 0.04, lm('#FFF8E8', 0.8), 0.0, 'flagedge')
    # a crayon-coloured band of tiles under the windows
    tile_band(L, 7.0, 9.8, 0.36, 0.7, 0.062, '#4D78B5', '#F7D878', '#FFF8E8', 0.34, 'schoolband') if False else None

def shop(R):
    body = '#EDA361'; trim = lm('#FFF3DC', 0.8)
    house(R, 0.0, 3.9, 1.3, 3.7, body, base='#B98A5E', band=2.95, quoin=True)
    door(R, 1.0, 1.15, 2.1, '#2E9C97', k='rect', hood=False)
    # the bread window: a deep niche with shelves, loaves and jars
    wd = lm(O['wood'], 0.7); wdL = lm(O['woodL'], 0.7)
    R.box(2.3, 0.0, 0.78, 1.3, 0.04, 1.4, lm('#8C5A3A', 0.9), 0.0, 'back')
    for (a, b, z0, z1) in ((2.22, 0.1, 0.7, 1.52), (3.58, 0.1, 0.7, 1.52)): R.box(a, 0.0, z0, b, 0.36, z1 - z0 + 0.7, wdL, 0.02, 'jamb')
    R.box(2.22, 0.0, 2.14, 1.46, 0.36, 0.1, wdL, 0.02, 'head'); R.box(2.22, 0.0, 0.7, 1.46, 0.4, 0.1, wdL, 0.02, 'counter')
    for z in (1.12, 1.6): R.box(2.3, 0.0, z, 1.3, 0.3, 0.04, wd, 0.01, 'shelf')
    loaf = lm('#D99A57', 0.7); loafL = lm('#F0C58A', 0.7); items = []; cuts = []
    for i in range(3):
        x, y = R.xy(2.5 + i * 0.36, 0.17); items.append((x, y, 1.19, 0.15, 0.12, 0.1) if R.name == 'L' else (x, y, 1.19, 0.12, 0.15, 0.1))
    balls(items, loaf, 'loaf', 2)
    for i in range(3):                                           # long loaves on the top shelf
        a = R.pt(2.42 + i * 0.4, 0.15, 1.69); b = R.pt(2.42 + i * 0.4 + 0.02, 0.15, 1.69 + 0.3)
    for i, c in enumerate(('#C73F4B', '#E3B34A', '#8B5FA8', '#E58C8C', '#C73F4B', '#E3B34A')):
        x, y = R.xy(2.42 + (i % 3) * 0.4, 0.12 + 0.12 * (i // 3)); lathe(x, y, 1.64, [(0.001, 0), (0.07, 0), (0.075, 0.03), (0.075, 0.2), (0.05, 0.22), (0.001, 0.22)], lm(c, 0.3, emit=(c, 0.15)), 16, 'jar')
        lathe(x, y, 1.84, [(0.001, 0), (0.06, 0), (0.06, 0.04), (0.001, 0.04)], lm('#FFF3DC', 0.6), 16, 'lid')
    for i in range(2):
        a = R.pt(2.55 + i * 0.5, 0.15, 1.15); tube(R.pt(2.4 + i * 0.5, 0.12, 1.2), R.pt(2.4 + i * 0.5, 0.27, 1.26), 0.045, loafL)
    # the striped awning over door and window, with a scalloped edge, on two poles
    cols = (O['teal'], '#FFF3DC'); nst = 14; ua, ub = 0.1, 3.8; sw_ = (ub - ua) / nst
    am = tex_mat('awn', lambda s: np.repeat(np.where((np.floor(np.arange(s) * nst / s) % 2 == 0)[:, None, None], np.array(rgb(cols[0]), 'float32'), np.array(rgb(cols[1]), 'float32')), s, axis=1).astype('float32'), 512, 0.9) if False else None
    for i in range(nst):
        c = cols[i % 2]; u = ua + i * sw_
        prism(R, [(0.0, 2.85), (1.05, 2.27), (1.05, 2.33), (0.0, 2.91)], 'nz', u, u + sw_ + 0.002, lm(c, 0.9, sheen=0.3), 0.008, 'awn')
        R.box(u, 1.05, 2.0, sw_, 0.02, 0.33, lm(c, 0.9, sheen=0.3), 0.004, 'val')
        x, y = R.xy(u + sw_ / 2, 1.06); ball(x, y, 2.02, sw_ / 2, lm(c, 0.9, sheen=0.3), 0.04 / sw_ * 2 if R.name == 'R' else 1, 1 if R.name == 'R' else 0.04 / sw_ * 2, 0.85)
    for pu in (0.18, 3.72): x, y = R.xy(pu, 1.0); cyl(x, y, 0, 0.035, 2.3, lm(O['woodL'], 0.6), 0.0, 12)
    # upper windows, a round sign with a loaf on it, chimney and roof
    for uu in (0.4, 2.95): window(R, uu, 3.0 - 0.02, 0.7, 0.55, 'rect', trim='#FFF3DC', shutter=None)
    ru = 1.55; prism(R, [(ru + 0.3 * math.cos(2 * math.pi * i / 28), 3.25 + 0.3 * math.sin(2 * math.pi * i / 28)) for i in range(28)], 'uz', 0.0, 0.07, lm(O['woodL'], 0.7), 0.012, 'sign')
    x, y = R.xy(ru, 0.09); ball(x, y, 3.25, 0.17, loaf, 1.0 if R.name == 'R' else 1.2, 1.2 if R.name == 'R' else 1.0, 0.8) if False else None
    sx_, sy_ = R.xy(ru, 0.09); ball(sx_, sy_, 3.25, 0.2, loaf, 0.35 if R.name == 'R' else 1.2, 1.2 if R.name == 'R' else 0.35, 0.85)
    # crates of fruit and bread outside
    crate_items = [(3.0, 0.08, 0.0, 0.5, 0.45, 0.3), (3.55, 0.08, 0.0, 0.5, 0.45, 0.3), (3.28, 0.08, 0.3, 0.5, 0.45, 0.28)]
    for (u, n, z, wu, wn, wz) in crate_items:
        R.box(u, n, z, wu, wn, wz, lm(O['woodL'], 0.8), 0.02, 'crate'); R.box(u + 0.04, n + 0.04, z + wz - 0.03, wu - 0.08, wn - 0.08, 0.03, lm('#6A4A35', 0.9), 0.0, 'cin')
        k = 0; its = []
        for i in range(3):
            for j in range(2):
                x, y = R.xy(u + 0.1 + i * 0.15, n + 0.12 + j * 0.2); its.append((x, y, z + wz + 0.02, 0.075, 0.075, 0.07))
        balls(its, lm(['#E8742F', '#C73F4B', '#E3B34A'][int(z * 10 + u * 3) % 3], 0.6), 'fruit', 1)
    roof_ridge_u(R, 0.0, 3.9, 1.3, 3.7, 1.0, '#C45B3E', wallc=body); chimney(R, 0.7, -1.0, 4.3, 5.5)
    return

def arch_gate(R):
    """The lane to the street runs under a plain stone arch that joins the shop to a pier."""
    cream = lm('#F8EDD5', 0.9); trim = lm('#FFF8E8', 0.8)
    R.box(5.95, -0.55, 0, 0.3, 0.65, 3.55, cream, 0.03, 'pier'); R.box(5.9, -0.58, 3.55, 0.4, 0.74, 0.14, trim, 0.03, 'pcap')
    pts = arch_pts(3.9, 5.95, 2.1, 2.1, 'round')[2:] ; zs = 2.1
    outline = [(3.9, zs)] + [(p[0], p[1]) for p in pts[1:-1]] + [(5.95, zs), (5.95, 3.55), (3.9, 3.55)]
    prism(R, outline, 'uz', -0.55, 0.1, cream, 0.02, 'bridge', flat=True); R.box(3.85, -0.58, 3.55, 2.4, 0.74, 0.14, trim, 0.03, 'bcap')
    prism(R, arch_ring(3.9, 5.95, zs, 0.14, 'round'), 'uz', 0.1, 0.16, trim, 0.012, 'ring', flat=True)
    tile_band(R, 4.0, 5.85, 3.1, 3.45, 0.115, O['teal'], O['cream'], '#E3B34A', 0.35, 'frz3') if False else None
    merlons(R, 3.9, 6.1, 3.69, -0.1, 0.05, trim, 0.34, 0.18, 0.2)
    for uu in (5.98, 3.6): pass
    # a lantern hanging in the arch
    x, y = R.xy(4.925, 0.0); tube((x, y, 2.9), (x, y, 3.1), 0.01, lm(C['brass'], 0.3, 0.9)); M.lantern(x, y, 2.55, 0.9)

def garden_wall(R):
    cream = lm('#F8EDD5', 0.9); trim = lm('#FFF8E8', 0.8)
    R.box(6.3, -0.4, 0, 1.1, 0.45, 1.0, cream, 0.03, 'gwall'); R.box(6.26, -0.42, 1.0, 1.18, 0.5, 0.1, trim, 0.03, 'gcap'); R.box(6.3, 0.0, 0.2, 1.1, 0.02, 0.35, lm(O['teal'], 0.8), 0.0, 'gband')
    R.box(7.35, -0.42, 0, 0.14, 0.5, 1.2, cream, 0.03, 'gpier')
    tree(-1.2, 6.6, 0.0, 1.8, 0.95, 21, trunk=0.13, n=6)
    for yy in (6.4, 7.0):
        x, y = R.xy(yy, 0.12); M.pot(x, y, 1.1, 0.7)

def build_plaza(sp):   # the old one-place builder (no longer registered: m_town paints the town)
    w, d = sp['size']
    ground(w, d, paint_plaza, 'plaza')
    exit_pad(w, 4.2, 1.6, 'FL', '#E3CFA5'); exit_pad(w, 7.6, 2.2, 'FL', '#555A66')
    L, R = Wl('L'), Wl('R')
    # the lane behind the wall, out to a garden wall with a tree beyond
    lane = tex_mat('lane', paint_lane, 512, 0.9)
    box(-2.2, 4.2, -0.30, 2.2, 1.6, 0.27, lm(O['stone'], 0.9), 0.02, 'laneslab'); lt = box(-2.2, 4.2, -0.03, 2.2, 1.6, 0.03, None, 0.006, 'lane'); lt.data.materials.append(lane)
    R.box(3.9, -2.9, 0, 2.05, 0.6, 2.4, lm('#EAD7AE', 0.9), 0.04, 'back'); R.box(3.86, -2.94, 2.4, 2.13, 0.68, 0.12, lm('#FFF8E8', 0.8), 0.03, 'backcap')
    prism(R, arch_pts(4.55, 5.35, 0.0, 1.2, 'round'), 'uz', -2.3, -2.26, lm('#7A5A3E', 0.9), 0.01, 'backdoor')
    tree(-3.1, 4.5, 0.0, 2.4, 1.0, 31, trunk=0.14, n=6)
    shop(R); arch_gate(R); garden_wall(R)
    masjid(L); school(L)

# ================================================================= the park
POND = dict(cx=7.9, cy=2.8, rx=1.5, ry=1.55, wob=0.12, seed=2.0)
def pond_pt(a, k=0.0):
    """A point on the pond's edge at angle a (k pushes it out, in metres)."""
    p = POND; f = 1 + p['wob'] * (0.5 * math.sin(2 * a + p['seed']) + 0.35 * math.sin(3 * a + p['seed'] * 2.1) + 0.25 * math.sin(5 * a + p['seed'] * 0.7))
    return p['cx'] + (p['rx'] * f + k) * math.cos(a), p['cy'] + (p['ry'] * f + k) * math.sin(a)

def paint_park(n):
    cv = Cv(n, 10, 10)
    cv.img = pat_grass(cv, 3.0, 0.9)
    stone = '#D6C9AE'
    # a lighter lawn for picnics and football, and the sand of the playground
    lawn = sd_blob(cv, 4.6, 7.3, 2.1, 1.8, 0.1, 3.0); cv.put(lawn, pat_grass(cv, 12.0, None) * 1.05)
    sand = sd_rect(cv, 0.2, 0.35, 3.5, 7.1, 0.35); cv.put(sand - 0.07, '#C9AC72'); cv.put(sand, pat_pavers(cv, 5.0, 5.0, O['sand'], O['sandD'], 0.0, 0, 9.0, var=0.0) * (0.96 + 0.08 * vnoise(cv.X, cv.Y, 0.18, 4.0)[:, :, None]))
    # the pond: a soft bank, water that deepens toward the middle, lily pads and a few ripples
    pd = sd_blob(cv, POND['cx'], POND['cy'], POND['rx'], POND['ry'], POND['wob'], POND['seed'])
    cv.put(pd - 0.25, '#7AAE55'); cv.put(pd - 0.12, '#B8A57A');
    t = np.clip(-pd / 0.9, 0, 1)[:, :, None]; wa = np.array(rgb(O['water']), 'float32'); wb = np.array(rgb(O['waterD']), 'float32')
    rip = (0.5 + 0.5 * np.sin((cv.X * 2.1 + cv.Y * 1.1) * 5.5 + vnoise(cv.X, cv.Y, 0.6, 1.0) * 6))[:, :, None] * 0.05
    cv.put(pd, wa + (wb - wa) * t * 0.9 + rip)
    cv.put(sd_ring(pd, 0.06), '#A8DDEA')
    for (lx, ly, lr, k) in ((8.5, 3.6, 0.28, 0.5), (7.2, 3.4, 0.22, 2.0), (8.9, 2.0, 0.25, 1.2), (7.6, 1.8, 0.2, 3.5), (9.0, 3.1, 0.18, 4.4)):
        pad = sd_circle(cv, lx, ly, lr); wedge = sd_rrect(cv, lx + lr * 0.55 * math.cos(k), ly + lr * 0.55 * math.sin(k), lr * 0.55, 0.035, k, 0.0)
        cv.put(sd_sub(pad, wedge), '#6FB45A'); cv.put(sd_sub(sd_ring(pad, 0.03), wedge), '#4F9A4C')
    for (lx, ly) in ((8.5, 3.6), (8.9, 2.0)): cv.put(sd_circle(cv, lx + 0.03, ly - 0.03, 0.07), '#F4A9B8')
    # stepping stones: gate to the middle, then to the jetty, swings, picnic and the ball lawn
    def stones(pts, sp=0.66, seed=1):
        rnd = random.Random(seed)
        for p0, p1 in zip(pts, pts[1:]):
            L = math.hypot(p1[0] - p0[0], p1[1] - p0[1]); k = max(1, int(L / sp)); a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
            for i in range(k + 1):
                x = p0[0] + (p1[0] - p0[0]) * i / k + rnd.uniform(-0.05, 0.05); y = p0[1] + (p1[1] - p0[1]) * i / k + rnd.uniform(-0.05, 0.05)
                s = sd_rrect(cv, x, y, 0.27, 0.21, a + rnd.uniform(-0.3, 0.3), 0.09); cv.put(s - 0.04, '#B6A98F'); cv.put(s, stone if i % 2 else '#E0D4BA')
    stones([(5.0, 0.5), (5.0, 3.0), (5.0, 5.0)], 0.7, 1); stones([(5.0, 2.8), (6.0, 2.8)], 0.7, 2); stones([(5.0, 3.6), (3.8, 3.6)], 0.7, 3)
    stones([(5.0, 5.0), (4.6, 6.0)], 0.7, 4); stones([(5.0, 5.0), (7.2, 6.4), (7.2, 7.4)], 0.7, 5)
    # flower beds
    cols = [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3']
    for (x0, y0, x1, y1) in ((3.2, 0.95, 4.05, 3.15), (1.2, 8.2, 2.9, 9.4)):
        sd = sd_rect(cv, x0, y0, x1, y1, 0.3); cv.put(sd - 0.08, '#B6A98F'); cv.put(sd, pat_flowers(cv, cols, 3.0 + x0, 0.16))
    return cv.img

def park_fence(wl, u0, u1, h=0.9):
    picket(wl, u0, u1, 0.05, h, O['woodL'])

def park_back(L, R):
    """Low picket fences, hedges and tall trees along both back sides; a flowery wooden arch at the gate (x 4.2 .. 5.8)."""
    for (a, b) in ((0.0, 4.0), (6.0, 10.0)): park_fence(L, a, b); hedge(L, a, b, -0.85, -0.12, 1.2, int(a) + 3)
    park_fence(R, 0.0, 10.0); hedge(R, 0.0, 10.0, -0.85, -0.12, 1.2, 17)
    # gate: two posts and an arch of timber with climbing flowers
    wd = lm(O['wood'], 0.7); wdl = lm(O['woodL'], 0.7)
    for uu in (4.0, 5.84): L.box(uu, -0.08, 0, 0.16, 0.16, 1.85, wd, 0.03, 'gpost'); L.box(uu - 0.03, -0.11, 1.85, 0.22, 0.22, 0.08, wdl, 0.03, 'gcap')
    prism(L, arch_ring(4.16, 5.84, 1.9, 0.14, 'round'), 'uz', -0.1, 0.1, wd, 0.02, 'garch')
    rnd = random.Random(5); fl = []
    for i in range(16):
        a = math.pi * i / 15; u = 5.0 - 0.9 * math.cos(a); z = 1.9 + 0.88 * math.sin(a)
        x, y = L.xy(u + rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.1)); fl.append((x, y, z, 0.09, 0.09, 0.08))
    for k in range(4):
        x, y = L.xy(4.07 if k % 2 == 0 else 5.93, 0.0); fl.append((x, y, 0.5 + k * 0.4, 0.07, 0.09, 0.09))
    balls(fl, lm(O['leaf'], 0.8), 'gleaf', 1)
    balls([(a, b, c + 0.05, 0.05, 0.05, 0.05) for (a, b, c, *_r) in fl[::2]], lm(O['pink'], 0.6), 'gbloom', 1)
    # trees behind the fences (kept inside the picture)
    for i, (u, r, th) in enumerate(((1.0, 1.1, 2.0), (2.9, 1.15, 2.2), (5.0, 1.2, 2.5), (6.9, 1.05, 2.1), (8.6, 0.7, 1.5))):
        x, y = L.xy(u, -1.4 if u < 8 else -0.95); tree(x, y, 0, th, r, 40 + i, (O['leaf'], O['leafD'], O['leafL']) if i % 2 == 0 else ('#6BA85A', '#4C8B4C', '#9AC96E'), 0.13)
    for i, (u, r, th) in enumerate(((1.0, 1.1, 2.0), (3.0, 1.1, 2.3), (5.0, 1.0, 1.9), (6.8, 1.15, 2.2), (8.4, 0.7, 1.5))):
        x, y = R.xy(u, -1.4 if u < 8 else -0.95); tree(x, y, 0, th, r, 60 + i, ('#6BA85A', '#4C8B4C', '#9AC96E') if i % 2 == 0 else (O['leaf'], O['leafD'], O['leafL']), 0.13)
    tree(-1.3, -1.3, 0, 2.3, 1.2, 77, trunk=0.15)

def pond_extras():
    """A rim of pebbles, reeds with brown heads and a few pink lotus flowers."""
    rnd = random.Random(3); st = [];
    for i in range(46):
        a = 2 * math.pi * i / 46; x, y = pond_pt(a, 0.1 + rnd.uniform(-0.03, 0.05)); r = rnd.uniform(0.07, 0.12); st.append((x, y, 0.02, r, r * 0.9, r * 0.6))
    balls(st, lm('#C9BEA6', 0.9), 'pebbles', 1)
    rm = lm('#6C9A4E', 0.8); hm = lm('#7A4A2E', 0.8)
    for (a, nn) in ((3.8, 5), (4.2, 5), (4.6, 6), (5.2, 5), (3.4, 4)):
        px, py = pond_pt(a, -0.08)
        for j in range(nn):
            ox, oy = px + rnd.uniform(-0.22, 0.22), py + rnd.uniform(-0.22, 0.22); hh = rnd.uniform(0.7, 1.15); lean = rnd.uniform(-0.1, 0.1)
            tube((ox, oy, 0.0), (ox + lean, oy + lean * 0.5, hh), 0.012, rm, 0.008, caps=False)
            if j % 2 == 0: cyl(ox + lean, oy + lean * 0.5, hh - 0.14, 0.03, 0.2, hm, 0.01, 10)
    for (lx, ly) in ((8.5, 3.6), (8.9, 2.0)):
        for k in range(6):
            a = k * math.pi / 3; ball(lx + 0.05 * math.cos(a), ly + 0.05 * math.sin(a) - 0.0, 0.04, 0.05, lm('#F6B8C6', 0.6), 1, 1, 0.5)
        ball(lx, ly, 0.05, 0.035, lm('#F6D36B', 0.6))

def build_park(sp):   # the old one-place builder (no longer registered: m_town paints the town)
    w, d = sp['size']
    ground(w, d, paint_park, 'park')
    exit_pad(d, 4.2, 1.6, 'FR', '#D6C9AE') if False else None
    L, R = Wl('L'), Wl('R')
    park_back(L, R); pond_extras()

# ================================================================= things you can use or walk round
def xz_prism(pts, y0, y1, m, bevel=0.01, name='xz'):
    """An outline in the XZ plane (x, z) thickened from y0 to y1."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    f = [bm.verts.new((p[0], y0, p[1])) for p in pts]; b = [bm.verts.new((p[0], y1, p[1])) for p in pts]
    bm.faces.new(f); bm.faces.new(list(reversed(b))); n = len(pts)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    return kit._finish(o, m, bevel)

def water_mat(): return lm('#8FD6E8', 0.15, emit=('#8FD6E8', 0.25))

@kind('outbench')
def k_outbench(st):
    wood = lm(O['woodL'], 0.65); woodD = lm(O['wood'], 0.7); iron = lm(O['iron'], 0.5, 0.2)
    for i in range(3): box(-0.13 + i * 0.13, -0.75, 0.4, 0.115, 1.5, 0.05, wood, 0.015, 'seat')
    for i in range(3): box(-0.27, -0.75, 0.56 + i * 0.15, 0.05, 1.5, 0.11, wood, 0.015, 'back')
    for sy in (-0.66, 0.6):
        box(-0.27, sy, 0, 0.06, 0.06, 0.98, iron, 0.015, 'leg'); box(0.15, sy, 0, 0.06, 0.06, 0.42, iron, 0.015, 'leg')
        box(-0.27, sy, 0.36, 0.48, 0.06, 0.05, iron, 0.012, 'rail'); box(-0.27, sy, 0.64, 0.5, 0.06, 0.05, iron, 0.012, 'arm'); box(0.17, sy, 0.4, 0.04, 0.06, 0.28, iron, 0.01, 'armpost')
        box(-0.31, sy - 0.02, 0.92, 0.1, 0.1, 0.07, iron, 0.02, 'cap')

@kind('outlamp')
def k_outlamp(st):
    iron = lm(O['iron'], 0.5, 0.25); gold = lm(C['brass'], 0.3, 0.9)
    lathe(0, 0, 0, [(0.001, 0), (0.17, 0), (0.17, 0.05), (0.11, 0.12), (0.075, 0.3), (0.04, 0.5), (0.001, 0.5)], iron, 24)
    tube((0, 0, 0.45), (0, 0, 2.5), 0.035, iron, 0.028, caps=False)
    lathe(0, 0, 1.2, [(0.06, 0), (0.06, 0.07)], gold, 20)
    lathe(0, 0, 2.5, [(0.001, 0), (0.12, 0), (0.15, 0.06), (0.001, 0.06)], iron, 20)
    lathe(0, 0, 2.56, [(0.14, 0), (0.17, 0.16), (0.14, 0.32)], lm('#FFE7B0', 0.3, emit=('#FFD98A', 1.2)), 20)
    for i in range(6): a = i * math.pi / 3; tube((math.cos(a) * 0.15, math.sin(a) * 0.15, 2.56), (math.cos(a) * 0.15, math.sin(a) * 0.15, 2.88), 0.012, iron, caps=False)
    lathe(0, 0, 2.86, [(0.17, 0), (0.1, 0.08), (0.001, 0.2)], iron, 20); ball(0, 0, 3.08, 0.035, gold)

@kind('outbin')
def k_outbin(st):
    body = lm(O['tealD'], 0.6); band = lm(O['cream'], 0.6)
    lathe(0, 0, 0, [(0.001, 0), (0.19, 0), (0.22, 0.03), (0.23, 0.62), (0.001, 0.62)], body, 28)
    lathe(0, 0, 0.18, [(0.213, 0), (0.22, 0.05)], band, 28); lathe(0, 0, 0.36, [(0.222, 0), (0.228, 0.05)], band, 28)
    lathe(0, 0, 0.62, [(0.25, 0), (0.25, 0.04), (0.2, 0.1), (0.1, 0.13), (0.001, 0.13)], lm(O['teal'], 0.6), 28); ball(0, 0, 0.78, 0.04, band)
    box(0.18, -0.09, 0.4, 0.06, 0.18, 0.1, lm('#16393D', 0.9), 0.01, 'slot')

@kind('planter')
def k_planter(st):
    wood = lm(O['woodL'], 0.7); teal = lm(O['teal'], 0.7)
    box(-0.45, -0.2, 0.0, 0.9, 0.4, 0.34, wood, 0.03, 'box'); box(-0.47, -0.22, 0.26, 0.94, 0.44, 0.07, teal, 0.02, 'rim')
    box(-0.4, -0.15, 0.34, 0.8, 0.3, 0.03, lm(O['soil'], 0.95), 0, 'soil')
    rnd = random.Random(4); lv = []; fl = {0: [], 1: [], 2: []}
    for i in range(9):
        x = -0.38 + i * 0.095; y = rnd.uniform(-0.08, 0.08); lv.append((x, y, 0.42, 0.075, 0.09, 0.07)); fl[i % 3].append((x, y + rnd.uniform(-0.03, 0.03), 0.5 + rnd.uniform(0, 0.08), 0.05, 0.05, 0.045))
    balls(lv, lm(O['leaf'], 0.8), 'lv', 1)
    for k, c in enumerate((O['pink'], O['yellow'], '#C9B3E3')): balls(fl[k], lm(c, 0.6), 'fl', 1)

@kind('postbox')
def k_postbox(st):
    red = lm(O['red'], 0.45); gold = lm(C['brass'], 0.3, 0.9)
    lathe(0, 0, 0, [(0.001, 0), (0.22, 0), (0.22, 0.05), (0.2, 0.09), (0.2, 0.82), (0.23, 0.86), (0.23, 0.96), (0.2, 1.02), (0.12, 1.1), (0.001, 1.13)], red, 32)
    lathe(0, 0, 0.12, [(0.205, 0), (0.205, 0.04)], gold, 32); lathe(0, 0, 0.78, [(0.232, 0), (0.232, 0.04)], gold, 32)
    box(0.19, -0.11, 0.62, 0.05, 0.22, 0.07, lm('#2B1B18', 0.9), 0.012, 'slot'); ball(0, 0, 1.15, 0.03, gold)

@kind('busstop')
def k_busstop(st):
    iron = lm(O['iron'], 0.5, 0.2); teal = lm(O['teal'], 0.6); cream = lm('#FFF3DC', 0.6)
    lathe(0, 0, 0, [(0.001, 0), (0.2, 0), (0.2, 0.06), (0.08, 0.1), (0.001, 0.1)], iron, 24)
    tube((0, 0, 0.05), (0, 0, 2.35), 0.035, iron, caps=False)
    for (r, m, z) in ((0.32, teal, 0.0), (0.26, cream, 0.012), (0.19, teal, 0.024), (0.07, cream, 0.036)):
        o = cyl(0, 0, -0.02, r, 0.03 + z, m, 0.004, 40); o.rotation_euler = (math.pi / 2, 0, -math.pi / 4); o.location = (0.04, 0.04, 2.08)
    ball(0, 0, 2.4, 0.04, lm(C['brass'], 0.3, 0.9))

def small_tree(x, y, tones, seed, zbase=0.0, trunk=0.065, ztop=1.95, cz=2.05, r=0.6, flat=0.62, fruit=None):
    """A small tree for inside the map: a thin trunk, a low flat crown that starts above 1.4 m (people are seen under it), about
    1.6 m wide and under 2.8 m tall in all."""
    tm = lm('#8A5A36', 0.9)
    cyl(x, y, zbase, trunk * 1.5, 0.25, tm, 0.02, 16, trunk * 1.15); cyl(x, y, zbase + 0.22, trunk * 1.15, ztop - zbase - 0.22, tm, 0.0, 16, trunk * 0.85)
    for a in (0.8, 2.9, 4.7): tube((x, y, ztop - 0.12), (x + math.cos(a) * r * 0.38, y + math.sin(a) * r * 0.38, cz - 0.1), trunk * 0.5, tm, trunk * 0.35, caps=False)
    crown(x, y, cz, r, tones, seed, 6, flat, 0.5)
    if fruit:
        rnd = random.Random(seed); its = []
        for i in range(6): a = rnd.uniform(0, 6.28); d = rnd.uniform(0.2, r * 0.9); its.append((x + math.cos(a) * d, y + math.sin(a) * d, cz + rnd.uniform(-0.15, 0.2), 0.05, 0.05, 0.05))
        balls(its, lm(fruit, 0.6), 'fruit', 1)

@kind('outtree')
def k_outtree(st): small_tree(0, 0, (O['leaf'], O['leafD'], O['leafL']), 5)
@kind('poptree')
def k_poptree(st): small_tree(0, 0, ('#6BA85A', '#4C8B4C', '#9AC96E'), 8)
@kind('plazatree')
def k_plazatree(st):
    wood = lm(O['woodL'], 0.7); teal = lm(O['teal'], 0.7)
    box(-0.42, -0.42, 0, 0.84, 0.84, 0.46, wood, 0.05, 'box'); box(-0.45, -0.45, 0.38, 0.9, 0.9, 0.08, teal, 0.03, 'rim'); box(-0.37, -0.37, 0.46, 0.74, 0.74, 0.03, lm(O['soil'], 0.95), 0.0, 'soil')
    small_tree(0, 0, (O['leaf'], O['leafD'], O['leafL']), 12, zbase=0.46, ztop=1.95, cz=2.0, r=0.58)
    rnd = random.Random(2); b = []
    for i in range(6): a = rnd.uniform(0, 6.28); b.append((math.cos(a) * 0.5, math.sin(a) * 0.5, 1.85 + rnd.uniform(0, 0.4), 0.05, 0.05, 0.05))
    balls(b, lm(O['pink'], 0.6), 'blossom', 1)

@kind('fountain')
def k_fountain(st):
    stone = lm('#EFE4CB', 0.8); teal = lm(O['teal'], 0.6); stoneD = lm('#D9C8A6', 0.85); wm = water_mat()
    lathe(0, 0, 0, [(0.001, 0), (1.13, 0), (1.18, 0.05), (1.18, 0.42), (1.12, 0.5), (1.02, 0.5), (0.98, 0.44), (0.98, 0.3), (0.001, 0.3)], stone, 56, 'basin')
    lathe(0, 0, 0.2, [(1.185, 0), (1.185, 0.08)], teal, 56); lathe(0, 0, 0.48, [(1.14, 0), (1.14, 0.03), (1.0, 0.03)], teal, 56)
    cyl(0, 0, 0.3, 0.98, 0.07, wm, 0.0, 56)
    lathe(0, 0, 0.3, [(0.3, 0), (0.24, 0.1), (0.17, 0.3), (0.2, 0.55), (0.17, 0.6), (0.001, 0.6)], stone, 24, 'ped1')
    lathe(0, 0, 0.84, [(0.22, 0), (0.55, 0.08), (0.66, 0.16), (0.68, 0.22), (0.6, 0.24), (0.55, 0.2), (0.4, 0.12), (0.001, 0.12)], stone, 40, 'bowl1')
    lathe(0, 0, 1.0, [(0.67, 0), (0.67, 0.07)], teal, 40); cyl(0, 0, 0.99, 0.5, 0.06, wm, 0.0, 40)
    lathe(0, 0, 1.02, [(0.12, 0), (0.09, 0.2), (0.1, 0.38), (0.001, 0.38)], stone, 20, 'ped2')
    lathe(0, 0, 1.38, [(0.1, 0), (0.28, 0.07), (0.34, 0.14), (0.36, 0.2), (0.3, 0.2), (0.28, 0.16), (0.001, 0.1)], stone, 32, 'bowl2')
    cyl(0, 0, 1.52, 0.27, 0.03, wm, 0.0, 32); lathe(0, 0, 1.52, [(0.34, 0), (0.34, 0.05)], teal, 32)
    tube((0, 0, 1.52), (0, 0, 2.02), 0.032, wm, 0.012); ball(0, 0, 2.05, 0.04, wm)
    # falling water: thin arcs from the top bowl to the middle bowl and from the middle bowl to the basin
    def arc(a, r0, z0, r1, z1, rad):
        pts = []
        for i in range(7):
            t = i / 6.0; r = r0 + (r1 - r0) * t; z = z0 + (z1 - z0) * t + 0.12 * math.sin(math.pi * t) * (0.8 if z0 > z1 else 0)
            pts.append((math.cos(a) * r, math.sin(a) * r, z - 0.0 * t))
        for p0, p1 in zip(pts, pts[1:]): tube(p0, p1, rad, wm, caps=True)
    for k in range(8): arc(k * math.pi / 4, 0.34, 1.54, 0.58, 1.06, 0.017)
    for k in range(10): arc(k * math.pi / 5 + 0.15, 0.66, 1.02, 0.95, 0.36, 0.017)

@kind('stall')
def k_stall(st):
    wood = lm(O['wood'], 0.75); woodL = lm(O['woodL'], 0.7); cols = (O['tile'], '#FFF3DC'); teal = lm(O['teal'], 0.7)
    box(-0.32, -0.8, 0, 0.64, 1.6, 0.82, wood, 0.03, 'counter'); box(-0.36, -0.84, 0.82, 0.72, 1.68, 0.06, woodL, 0.025, 'top')
    for i in range(5): box(-0.3 + 0.0, -0.74 + i * 0.3, 0.1, 0.02, 0.24, 0.6, lm(O['woodD'], 0.8), 0.006, 'slat')
    box(0.24, -0.84, 0.72, 0.1, 1.68, 0.16, teal, 0.02, 'lip')
    # a slanted display of fruit
    xz_prism([(-0.3, 0.88), (0.3, 0.88), (0.3, 1.0), (-0.3, 1.2)], -0.76, 0.76, woodL, 0.01)
    rnd = random.Random(7); fr = [[], [], [], []]
    for j in range(8):
        for i in range(3):
            x = 0.2 - i * 0.17; z = 1.0 + 0.2 * (0.2 - x) / 0.6 * 1.0 + 0.04; fr[(i + j) % 4].append((x, -0.7 + j * 0.2, z + 0.05, 0.075, 0.075, 0.07))
    for k, c in enumerate(('#E8742F', '#C73F4B', '#E3B34A', '#7DBB4E')): balls(fr[k], lm(c, 0.55), 'fruit', 1)
    # posts, the striped awning (sloping to the front) and its scalloped edge
    for (x, y, h) in ((-0.42, -0.84, 2.2), (-0.42, 0.78, 2.2), (0.4, -0.84, 1.85), (0.4, 0.78, 1.85)): box(x, y, 0, 0.06, 0.06, h, woodL, 0.012, 'post')
    nst = 10; sw = 1.8 / nst
    for i in range(nst):
        c = cols[i % 2]; y0 = -0.9 + i * sw; xz_prism([(-0.5, 2.28), (0.55, 1.9), (0.55, 1.96), (-0.5, 2.34)], y0, y0 + sw + 0.002, lm(c, 0.9, sheen=0.3), 0.006)
        box(0.55, y0, 1.7, 0.02, sw, 0.26, lm(c, 0.9, sheen=0.3), 0.004, 'val'); ball(0.56, y0 + sw / 2, 1.72, sw / 2, lm(c, 0.9, sheen=0.3), 0.25, 1, 0.9)
    # crates beside the stall and a basket
    for (cy, cz, col) in ((-1.05, 0.0, '#E8742F'), (-1.05, 0.28, '#C73F4B')):
        box(-0.05, cy - 0.2, cz, 0.42, 0.4, 0.26, woodL, 0.02, 'crate')
        balls([(-0.15 + 0.12 * i, cy - 0.1 + 0.18 * j, cz + 0.3, 0.07, 0.07, 0.065) for i in range(3) for j in range(2)], lm(col, 0.55), 'f', 1)

@kind('pondside')
def k_pondside(st):
    wood = lm(O['woodL'], 0.7); woodD = lm(O['woodD'], 0.8)
    for i in range(11): box(-0.9 + i * 0.165, -0.4, 0.2, 0.15, 0.8, 0.05, wood if i % 2 else lm('#D6A56C', 0.7), 0.012, 'board')
    for y in (-0.36, 0.3): box(-0.9, y, 0.14, 1.8, 0.08, 0.07, woodD, 0.012, 'beam')
    for (x, y) in ((-0.8, -0.36), (-0.8, 0.36), (0.1, -0.36), (0.1, 0.36), (0.85, -0.36), (0.85, 0.36)): cyl(x, y, -0.1, 0.045, 0.62, woodD, 0.01, 12); ball(x, y, 0.53, 0.05, woodD) if x > 0.5 else None
    rope = lm('#EFE0BC', 0.9)
    for y in (-0.36, 0.36):
        pts = [(0.85, y, 0.5), (0.5, y, 0.42), (0.1, y, 0.5)]
        for p0, p1 in zip(pts, pts[1:]): tube(p0, p1, 0.014, rope, caps=False)
    tube((0.85, -0.36, 0.5), (0.85, 0.36, 0.5), 0.014, rope, caps=False)

@kind('duck')
def k_duck(st):
    body = lm('#F6CE4F', 0.7); wing = lm('#E8B33C', 0.75); bill = lm('#EE8A3A', 0.6)
    ball(0, 0, 0.1, 0.17, body, 1.0, 0.72, 0.62); ball(-0.17, 0, 0.17, 0.07, body, 1.2, 0.7, 0.7)
    ball(0.16, 0, 0.27, 0.1, body); ball(0.1, 0, 0.19, 0.08, body, 1, 0.9, 1.0)
    ball(-0.02, 0.1, 0.13, 0.11, wing, 1.2, 0.4, 0.6); ball(-0.02, -0.1, 0.13, 0.11, wing, 1.2, 0.4, 0.6)
    ball(0.275, 0, 0.255, 0.05, bill, 1.5, 1.1, 0.35)

@kind('parkswing')
def k_parkswing(st):
    wood = lm(O['woodD'], 0.75); iron = lm('#C9C2B4', 0.4, 0.5); seat = lm(O['tile'], 0.7); teal = lm(O['teal'], 0.7)
    tube((0, -0.62, 2.05), (0, 0.62, 2.05), 0.05, wood, caps=True)
    for sy in (-0.62, 0.62):
        for sx in (-0.48, 0.48): tube((0, sy, 2.05), (sx, sy, 0.0), 0.045, wood, caps=False)
        tube((-0.38, sy, 0.45), (0.38, sy, 0.45), 0.02, wood, caps=False); ball(0, sy, 2.1, 0.06, teal)
    for cy in (-0.17, 0.17): tube((0, cy, 2.02), (0, cy, 0.5), 0.011, iron, caps=False)
    box(-0.11, -0.22, 0.4, 0.22, 0.44, 0.06, seat, 0.025, 'seat')

@kind('slide')
def k_slide(st):
    wood = lm(O['woodL'], 0.7); woodD = lm(O['woodD'], 0.75); teal = lm(O['teal'], 0.65); steel = lm('#E1E6E4', 0.35, 0.3); tile = lm(O['tile'], 0.7)
    box(-0.8, -0.3, 1.02, 0.55, 0.6, 0.06, wood, 0.02, 'deck')
    for (x, y) in ((-0.78, -0.28), (-0.78, 0.28), (-0.28, -0.28), (-0.28, 0.28)): box(x - 0.03, y - 0.03, 0, 0.06, 0.06, 1.9, woodD, 0.012, 'post')
    box(-0.86, -0.35, 1.9, 0.68, 0.7, 0.06, woodD, 0.02, 'beam')
    lathe(-0.53, 0, 1.94, [(0.62, 0), (0.001, 0.38)], tile, 4).rotation_euler = (0, 0, math.radians(45))
    pts_t = []; pts_b = []
    for i in range(13):
        t = i / 12.0; x = -0.25 + 1.25 * t; z = 0.2 + 0.86 * (1 - t) ** 2 + 0.03
        pts_t.append((x, z)); pts_b.append((x, z - 0.05))
    xz_prism(pts_t + list(reversed(pts_b)), -0.26, 0.26, steel, 0.008, 'chute')
    for sy in (-0.3, 0.26): xz_prism([(p[0], p[1] + 0.12) for p in pts_t] + list(reversed(pts_b)), sy, sy + 0.04, teal, 0.008, 'rail')
    for sy in (-0.28, 0.28):
        tube((-1.0, sy, 0.0), (-0.78, sy, 1.02), 0.025, woodD, caps=False)
    for i in range(5): z = 0.18 + i * 0.17; box(-1.0 + 0.22 * z / 1.02 - 0.02, -0.28, z, 0.04, 0.56, 0.035, wood, 0.01, 'rung')

@kind('goal')
def k_goal(st):
    wh = lm('#FFFDF5', 0.5); net = lm('#FFFFFF', 0.9)
    nm = bpy.data.materials.new('net'); nm.use_nodes = True; b = nm.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (1, 1, 1, 1); b.inputs['Alpha'].default_value = 0.22; b.inputs['Roughness'].default_value = 0.9
    for y in (-0.9, 0.9): tube((0.3, y, 0), (0.3, y, 1.1), 0.04, wh, caps=True)
    tube((0.3, -0.9, 1.1), (0.3, 0.9, 1.1), 0.04, wh, caps=True)
    for y in (-0.9, 0.9): tube((0.3, y, 1.1), (-0.3, y, 0.9), 0.025, wh, caps=True); tube((-0.3, y, 0.9), (-0.3, y, 0.0), 0.025, wh, caps=True); tube((-0.3, y, 0.0), (0.3, y, 0.0), 0.02, wh, caps=True)
    tube((-0.3, -0.9, 0.9), (-0.3, 0.9, 0.9), 0.025, wh, caps=True)
    box(-0.3, -0.9, 0.0, 0.01, 1.8, 0.9, nm, 0, 'netb'); box(-0.3, -0.9, 0.0, 0.6, 0.01, 1.0, nm, 0, 'nets'); box(-0.3, 0.89, 0.0, 0.6, 0.01, 1.0, nm, 0, 'nets')
    its = []
    for i in range(1, 9): its.append((-0.3, -0.9 + i * 0.2, 0.0, 0.007, 0.007, 0.9));
    for i in range(1, 5): its.append((-0.3, -0.9, i * 0.2, 0.007, 1.8, 0.007))
    boxes([(-0.304, -0.9 + i * 0.2, 0.0, 0.008, 0.008, 0.9) for i in range(1, 9)] + [(-0.304, -0.9, 0.2 * i, 0.008, 1.8, 0.008) for i in range(1, 5)], net, 0, 'netl')
    boxes([(-0.3 + 0.12 * i, -0.904, 0.0, 0.008, 0.008, 1.0 - 0.1 * i / 2) for i in range(1, 5)] + [(-0.3 + 0.12 * i, 0.896, 0.0, 0.008, 0.008, 1.0 - 0.1 * i / 2) for i in range(1, 5)], net, 0, 'netl2')

@kind('picnic')
def k_picnic(st):
    rm = tex_mat('picnicrug', lambda s: M.khatam(s, '#FBF3E4', '#8FB57A', '#D9704A', 3, border=(C['teal'], C['mustard'])), 1024, 0.98)
    b = box(-1.1, -1.1, 0, 2.2, 2.2, 0.025, None, 0.012, 'rug'); b.data.materials.append(rm)
    fr = lm(C['cream'], 0.98)
    for i in range(int(2.2 / 0.1)): box(-1.1 + 0.025 + i * 0.1, -1.17, 0, 0.05, 0.08, 0.012, fr, 0, 'fr'); box(-1.1 + 0.025 + i * 0.1, 1.09, 0, 0.05, 0.08, 0.012, fr, 0, 'fr')
    # the basket with a cloth, plates, bread and cups
    wv = lm('#C79A5B', 0.9); wvD = lm('#9F7440', 0.9)
    lathe(-0.05, -0.1, 0.025, [(0.001, 0), (0.24, 0), (0.28, 0.1), (0.3, 0.22), (0.001, 0.22)], wv, 28)
    for z in (0.06, 0.12, 0.18): lathe(-0.05, -0.1, 0.025, [(0.0, z), (0.2 + z * 0.55, z), (0.2 + z * 0.55 + 0.012, z + 0.015)], wvD, 28)
    torus(-0.05, -0.1, 0.34, 0.2, 0.018, wvD, 1.0, 28, 8, (math.pi / 2, 0, 0)); ball(-0.05, -0.1, 0.25, 0.27, lm('#FBF3E4', 0.95, sheen=0.4), 1, 1, 0.22)
    ball(0.12, -0.12, 0.29, 0.1, lm('#D99A57', 0.7), 1.4, 0.8, 0.7)
    for (x, y, c) in ((0.35, 0.42, '#FBF3E4'), (-0.4, 0.45, '#FBF3E4'), (0.45, -0.4, '#FBF3E4')):
        cyl(x, y, 0.025, 0.16, 0.015, lm(c, 0.4), 0.008, 28)
    balls([(0.31, 0.38, 0.06, 0.06, 0.06, 0.055), (0.4, 0.46, 0.06, 0.06, 0.06, 0.055)], lm('#E8742F', 0.55), 'f', 1)
    balls([(-0.36, 0.42, 0.06, 0.06, 0.06, 0.055)], lm('#C73F4B', 0.55), 'f', 1); ball(0.45, -0.4, 0.06, 0.08, lm('#D99A57', 0.7), 1.3, 0.8, 0.6)
    for (x, y, c) in ((0.0, 0.5, O['teal']), (0.1, 0.62, O['pink'])): lathe(x, y, 0.025, [(0.001, 0), (0.04, 0), (0.05, 0.08), (0.001, 0.08)], lm(c, 0.5), 16)

@kind('parkbird')
def k_parkbird(st):
    wood = lm(O['woodD'], 0.75); woodL = lm(O['woodL'], 0.7); tile = lm(O['tile'], 0.7)
    tube((0, 0, 0), (0, 0, 1.45), 0.05, wood, 0.04, caps=False)
    box(-0.3, -0.3, 1.38, 0.6, 0.6, 0.06, woodL, 0.02, 'tray');
    for (x, y, w_, d_) in ((-0.3, -0.3, 0.6, 0.03), (-0.3, 0.27, 0.6, 0.03), (-0.3, -0.3, 0.03, 0.6), (0.27, -0.3, 0.03, 0.6)): box(x, y, 1.44, w_, d_, 0.06, woodL, 0.01, 'lip')
    for (x, y) in ((-0.26, -0.26), (0.26, 0.26), (-0.26, 0.26), (0.26, -0.26)): tube((x, y, 1.44), (x, y, 1.95), 0.012, wood, caps=False)
    lathe(0, 0, 1.92, [(0.46, 0), (0.001, 0.3)], tile, 4).rotation_euler = (0, 0, math.radians(45))
    rnd = random.Random(2); balls([(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), 1.46, 0.022, 0.022, 0.015) for i in range(14)], lm('#8A6A3A', 0.8), 'seeds', 1)

@kind('litter')
def k_litter(st):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.1, location=(0, 0, 0.09))
    o = bpy.context.object; o.name = 'litter'; rnd = random.Random(9)
    for v in o.data.vertices: v.co *= rnd.uniform(0.75, 1.15)
    o.data.materials.append(lm('#F1EBD6', 0.95));
    for p in o.data.polygons: p.use_smooth = False

# ================================================================= small pictures for bubbles and buttons
def _dir(): return Vector((math.cos(kit.ELEV) * 0.7071, math.cos(kit.ELEV) * 0.7071, math.sin(kit.ELEV)))
def plaque_at(pts, thick, m, off=0.0, bevel=0.03, scale=1.0, at=(0, 0)):
    """A flat cut-out facing the camera, moved toward it by `off`; at = (right, up) in the picture."""
    o = M.plaque(pts, thick, m, bevel); d = _dir(); right = Vector((-0.7071, 0.7071, 0)); up = d.cross(right) * -1
    o.scale = (scale, scale, scale); o.location = Vector((0, 0, 0.5)) + d * off + right * at[0] + Vector((0, 0, 1)) * at[1]
    return o
def _heart(s=1.0): return [(0.021 * s * 16 * math.sin(2 * math.pi * i / 36) ** 3, 0.021 * s * (13 * math.cos(2 * math.pi * i / 36) - 5 * math.cos(4 * math.pi * i / 36) - 2 * math.cos(6 * math.pi * i / 36) - math.cos(8 * math.pi * i / 36)) + 0.03) for i in range(36)]

@icon('letter')
def icon_letter():
    plaque_at([(-0.46, -0.32), (0.46, -0.32), (0.46, 0.32), (-0.46, 0.32)], 0.12, lm(O['teal'], 0.5), 0.0, 0.05)
    plaque_at([(-0.4, -0.26), (0.4, -0.26), (0.4, 0.26), (-0.4, 0.26)], 0.1, lm('#FFF6E6', 0.5), 0.05, 0.03)
    plaque_at([(-0.4, 0.26), (0.4, 0.26), (0.0, -0.06)], 0.08, lm('#F3DCB8', 0.5), 0.1, 0.03)
    plaque_at([(-0.4, -0.26), (0.0, 0.03), (0.4, -0.26)], 0.06, lm('#F8E8CC', 0.5), 0.08, 0.03)
    plaque_at(_heart(0.5), 0.08, lm('#E8524F', 0.45), 0.2, 0.03, 1.0, (0, -0.04))

@icon('bread')
def icon_bread():
    ang = math.radians(135)
    l = ball(0, 0, 0.36, 0.4, lm('#D99A57', 0.75), 1.15, 0.7, 0.62); l.rotation_euler = (0, 0, ang)
    for i in (-1, 0, 1):
        c = ball(0, 0, 0.0, 0.13, lm('#F2C98E', 0.7), 0.3, 1.0, 0.32); c.rotation_euler = (0, 0, ang + 0.45)
        c.location = (math.cos(ang) * 0.22 * i, math.sin(ang) * 0.22 * i, 0.69 - 0.07 * abs(i))
    ball(0, 0, 0.12, 0.3, lm('#B97C42', 0.8), 1.2, 0.8, 0.12).rotation_euler = (0, 0, ang)

@icon('litter')
def icon_litter():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.38, location=(0, 0, 0.4))
    o = bpy.context.object; rnd = random.Random(4)
    for v in o.data.vertices: v.co *= rnd.uniform(0.7, 1.18)
    o.data.materials.append(lm('#F4EEDA', 0.95)); o.data.materials.append(lm('#CFC6AA', 0.95)); o.data.materials.append(lm('#E2D9BE', 0.95))
    for p in o.data.polygons: p.use_smooth = False; p.material_index = rnd.choice((0, 0, 1, 2))
    ball(0.38, 0.32, 0.12, 0.1, lm('#E7DFC6', 0.95), 1.2, 1, 0.5)

@icon('masjid')
def icon_masjid():
    cream = lm('#F8EDD5', 0.7); teal = lm(O['teal'], 0.55); gold = lm('#E3B34A', 0.35, 0.3)
    box(-0.34, -0.34, 0.0, 0.68, 0.68, 0.28, cream, 0.04, 'base'); cyl(0, 0, 0.28, 0.27, 0.16, cream, 0.02, 28)
    dome(0, 0, 0.44, 0.31, 0.42, teal, 6, gold)
    tube((0, 0, 0.86), (0, 0, 0.94), 0.015, gold); crescent(0, 0, 1.06, 0.2)
    for (x, y) in ((0.38, -0.34), (0.38, 0.34)) if False else ((-0.42, 0.34),):
        cyl(x, y, 0.0, 0.09, 0.7, cream, 0.01, 16); lathe(x, y, 0.7, [(0.12, 0), (0.001, 0.26)], teal, 16); cyl(x, y, 0.62, 0.12, 0.05, gold, 0.01, 16)

@icon('shop')
def icon_shop():
    box(-0.26, -0.4, 0.0, 0.5, 0.8, 0.5, lm('#EDA361', 0.7), 0.04, 'shop')
    box(0.23, -0.12, 0.0, 0.03, 0.24, 0.34, lm(O['tealD'], 0.6), 0.01, 'door'); box(0.23, 0.14, 0.14, 0.03, 0.2, 0.2, lm('#CFEAF5', 0.4), 0.01, 'win')
    cols = (O['teal'], '#FFF3DC')
    for i in range(6):
        y0 = -0.46 + i * 0.155; c = lm(cols[i % 2], 0.8, sheen=0.3)
        xz_prism([(0.1, 0.62), (0.52, 0.4), (0.52, 0.46), (0.1, 0.68)], y0, y0 + 0.157, c, 0.01)
        ball(0.52, y0 + 0.078, 0.4, 0.078, c, 0.3, 1, 0.8)
    box(-0.3, -0.44, 0.5, 0.58, 0.88, 0.07, lm('#C45B3E', 0.7), 0.03, 'top')

@icon('school')
def icon_school():
    M.icon_house()
    cyl(-0.16, -0.16, 0.57, 0.018, 0.5, lm('#EFE6D0', 0.5), 0, 10)
    box(-0.16, -0.16, 0.88, 0.04, 0.3, 0.19, lm(O['teal'], 0.7), 0.01, 'flag')
    ball(-0.16, -0.16, 1.08, 0.03, lm(C['brass'], 0.3, 0.9))

@icon('park')
def icon_park():
    cyl(0, 0, 0.0, 0.46, 0.07, lm(O['grass'], 0.85), 0.03, 32)
    cyl(0, 0, 0.07, 0.07, 0.4, lm('#8A5A36', 0.9), 0.01, 14, 0.055)
    balls([(0, 0, 0.72, 0.36, 0.36, 0.33), (0.18, -0.12, 0.6, 0.24, 0.24, 0.22), (-0.16, 0.14, 0.62, 0.24, 0.24, 0.22)], lm(O['leaf'], 0.75), 'crown', 2)
    balls([(0.06, 0.02, 0.9, 0.22, 0.22, 0.18)], lm(O['leafL'], 0.75), 'crown', 2)

@icon('plaza')
def icon_plaza():
    stone = lm('#EFE4CB', 0.7); teal = lm(O['teal'], 0.6); wm = water_mat()
    lathe(0, 0, 0.0, [(0.001, 0), (0.5, 0), (0.54, 0.04), (0.54, 0.26), (0.47, 0.3), (0.42, 0.26), (0.42, 0.14), (0.001, 0.14)], teal, 36)
    lathe(0, 0, 0.26, [(0.545, 0), (0.545, 0.05)], stone, 36); cyl(0, 0, 0.14, 0.42, 0.04, wm, 0, 36)
    lathe(0, 0, 0.14, [(0.15, 0), (0.1, 0.26), (0.001, 0.26)], stone, 16)
    lathe(0, 0, 0.38, [(0.1, 0), (0.34, 0.06), (0.37, 0.12), (0.3, 0.12), (0.001, 0.07)], stone, 28); cyl(0, 0, 0.45, 0.25, 0.03, wm, 0, 28)
    tube((0, 0, 0.46), (0, 0, 0.88), 0.045, wm, 0.02); ball(0, 0, 0.9, 0.06, wm)
    for k in range(6):
        a = k * math.pi / 3; tube((math.cos(a) * 0.06, math.sin(a) * 0.06, 0.7), (math.cos(a) * 0.24, math.sin(a) * 0.24, 0.54), 0.024, wm); tube((math.cos(a) * 0.24, math.sin(a) * 0.24, 0.54), (math.cos(a) * 0.36, math.sin(a) * 0.36, 0.34), 0.024, wm)

@icon('street')
def icon_street():
    iron = lm(O['iron'], 0.5, 0.2); gold = lm(C['brass'], 0.3, 0.9)
    lathe(0, 0, 0, [(0.001, 0), (0.24, 0), (0.24, 0.06), (0.11, 0.14), (0.001, 0.14)], iron, 24)
    tube((0, 0, 0.1), (0, 0, 0.62), 0.05, iron, 0.04, caps=False)
    lathe(0, 0, 0.6, [(0.001, 0), (0.17, 0), (0.2, 0.06), (0.001, 0.06)], iron, 20)
    lathe(0, 0, 0.66, [(0.17, 0), (0.22, 0.17), (0.17, 0.34)], lm('#FFE7B0', 0.3, emit=('#FFD98A', 1.6)), 20)
    lathe(0, 0, 1.0, [(0.22, 0), (0.12, 0.08), (0.001, 0.16)], iron, 20); ball(0, 0, 1.18, 0.04, gold)

@icon('grandhouse')
def icon_grandhouse():
    M.icon_house()
    plaque_at(_heart(0.42), 0.1, lm('#E8524F', 0.45), 0.42, 0.04, 1.0, (0.0, 0.18))

@icon('stairs')
def icon_stairs():
    cols = ('#E9DCC0', '#D9C8A6', '#C9B58C')
    for i in range(3): box(0.3 - 0.3 * i - 0.15, -0.36, 0.0, 0.3, 0.72, 0.14 + 0.14 * i, lm(cols[i], 0.7), 0.03, 'step')
    plaque_at([(0, 0.3), (0.24, 0.02), (0.1, 0.02), (0.1, -0.26), (-0.1, -0.26), (-0.1, 0.02), (-0.24, 0.02)], 0.1, lm(O['teal'], 0.5), 0.2, 0.03, 0.9, (0.0, 0.36))
