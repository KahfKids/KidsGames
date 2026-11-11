"""Helping Home art: the town's indoor places (masjid, corner shop and bakery, classroom, grandparents' sitting room) and
the game's interface icons, in the look of models.py / m_home.py: warm, chunky, bevelled, matte; patterns from khatam / weave.
Runs inside Blender (see kit.py). Registers floors and wall features into models.py, exports KINDS / ICONS for bake.py.

Frames used below:
  kinds:  built with the middle of the footprint on the origin, z = 0 the floor, "rot 0" = the back on y = -d/2 (stands
          against the L wall, faces +Y) unless a kind says otherwise.
  icons:  `sc(objs)` puts parts built in a front view (x right, z up, y away from the viewer) in front of the icon camera;
          `lay(...)` stacks flat cut-out shapes facing the camera (plaque).
"""
import math, random
import numpy as np
import bpy, bmesh
from mathutils import Vector
import kit, models as M
from kit import box, cyl, ball, lathe, tube, arch, mat, tex_mat, rgb
from models import C, khatam, weave, pot, lantern, plaque

KINDS, ICONS, PLACES = {}, {}, {}
def kind(name):
    def deco(fn): KINDS[name] = fn; return fn
    return deco
def icon(name):
    def deco(fn): ICONS[name] = fn; return fn
    return deco

# neighbours of the palette (own names only: C is shared)
D = dict(red='#E8524F', redD='#C23B3B', coral='#EF6B5E', pink='#F4A3A8', peach='#F0B48A', kraft='#C99A62', kraftD='#A97B46', brickc='#C4694A',
         brickD='#A4533A', brickL='#D98A62', green='#58B45A', greenD='#3F8F47', chalk='#F7F4EA', board='#2F6B57', boardD='#255646',
         steel='#C8D3D8', steelD='#8FA0A8', ink='#2F3A45', soil='#6A4A33', blue='#4DB1E6', paper='#F6EBC8', mintc='#BFE0D6',
         carpetG='#4F9A8C', carpetD='#2F7068', ivory='#F7ECD3', lantern='#FFE9B0')

# ---------- little helpers ----------
def bx(cx, cy, z, w, d, h, m, bevel=0.03, name='box'):
    """A box centred on (cx, cy) in plan, its bottom at z."""
    return box(cx - w / 2, cy - d / 2, z, w, d, h, m, bevel, name)
def fab(c, sheen=0.5): return mat(c, 0.95, sheen=sheen)
def woodL(): return mat(C['woodL'], 0.55)
def woodM(): return mat(C['wood'], 0.6)
def woodD(): return mat(C['woodD'], 0.6)
def brass(): return mat(C['brass'], 0.32, 0.9)
def put(objs, x, y, z=0, rz=0.0, s=1.0):
    g = kit.group(list(objs), 'g'); g.location = (x, y, z); g.rotation_euler = (0, 0, rz); g.scale = (s, s, s); return g
def torus(x, y, z, R, r, m, sz=1.0, rot=(0, 0, 0), major=40, minor=14):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=major, minor_segments=minor, location=(x, y, z))
    o = bpy.context.object; o.scale = (1, 1, sz); o.rotation_euler = rot; o.name = 'torus'
    return kit._finish(o, m, 0)
def rcyl(x, y, z, r, h, m, axis='y', bevel=0.01, verts=32):
    """A cylinder lying along y (axis 'y') or x ('x'), centred on (x, y, z)."""
    o = cyl(0, 0, -h / 2, r, h, m, bevel, verts)
    o.rotation_euler = (math.pi / 2, 0, 0) if axis == 'y' else (0, math.pi / 2, 0); o.location = (x, y, z)
    return o
def glass(col='#DDF1F8', alpha=0.28):
    key = ('glass', col, alpha)
    if key in kit._m: return kit._m[key]
    m = bpy.data.materials.new('glass'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = kit.hexc(col); b.inputs['Roughness'].default_value = 0.12; b.inputs['Alpha'].default_value = alpha
    kit._m[key] = m; return m
def glow(col, strength=1.6): return mat(col, 0.5, emit=(col, strength))

def uv_mat(name, paint, size=512, rough=0.9):
    """Like tex_mat, but the picture follows the object's UV map (so it can be laid on any cut-out shape)."""
    if name in kit._m: return kit._m[name]
    a = np.clip(paint(size), 0, 1).astype('float32')
    rgba = np.ones((size, size, 4), dtype='float32'); rgba[:, :, :3] = a
    img = bpy.data.images.new(name, size, size, alpha=False); img.pixels.foreach_set(rgba.ravel()); img.pack()
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; t.extension = 'REPEAT'
    uv = nt.nodes.new('ShaderNodeUVMap'); nt.links.new(uv.outputs['UV'], t.inputs['Vector']); nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = 0.2; break
    kit._m[name] = m; return m

def poly(pts, plane, c, thick, m, bevel=0.01, uvs=None, smooth=True):
    """A cut-out shape extruded `thick` about position c on its own axis.
       plane 'xz': pts are (x, z), extruded along y; 'yz': pts (y, z) along x; 'xy': pts (x, y) along z.
       uvs: if given, the picture is laid on the face by (a, b) * uvs."""
    me = bpy.data.meshes.new('poly'); bm = bmesh.new(); h = thick / 2
    def v(p, s):
        a, b = p; d = c + s * h
        return bm.verts.new({'xz': (a, d, b), 'yz': (d, a, b), 'xy': (a, b, d)}[plane])
    f = [v(p, -1) for p in pts]; k = [v(p, 1) for p in pts]; n = len(pts)
    bm.faces.new(f); bm.faces.new(list(reversed(k)))
    for i in range(n): bm.faces.new((f[i], f[(i + 1) % n], k[(i + 1) % n], k[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uvs:
        lay_ = bm.loops.layers.uv.new('UVMap')
        for face in bm.faces:
            for lp in face.loops:
                co = lp.vert.co; a, b = {'xz': (co.x, co.z), 'yz': (co.y, co.z), 'xy': (co.x, co.y)}[plane]
                lp[lay_].uv = (a * uvs, b * uvs)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('poly', me); bpy.context.collection.objects.link(o)
    return kit._finish(o, m, bevel, smooth)

def ring_strip(outer, inner, plane, c0, c1, m, uvs=None, bevel=0.0):
    """A solid band between two matching point loops (outer / inner, same count), standing from c0 to c1 on the third axis.
       Front face at c1 (carries the picture), plus the two side faces. For frames round arches."""
    me = bpy.data.meshes.new('ring'); bm = bmesh.new(); n = len(outer)
    def v(p, d):
        a, b = p; return bm.verts.new({'xz': (a, d, b), 'yz': (d, a, b), 'xy': (a, b, d)}[plane])
    of = [v(p, c1) for p in outer]; inf = [v(p, c1) for p in inner]; ob = [v(p, c0) for p in outer]; ib = [v(p, c0) for p in inner]
    for i in range(n - 1):
        j = i + 1
        bm.faces.new((of[i], of[j], inf[j], inf[i]))
        bm.faces.new((ob[i], ob[j], of[j], of[i])); bm.faces.new((inf[i], inf[j], ib[j], ib[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ax = {'xz': 1, 'yz': 0, 'xy': 2}[plane]; fr = [f_ for f_ in bm.faces if all(abs(v_.co[ax] - c1) < 1e-6 for v_ in f_.verts)]
    if fr and fr[0].normal[ax] * (1 if c1 > c0 else -1) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    if uvs:
        lay_ = bm.loops.layers.uv.new('UVMap')
        for face in bm.faces:
            for lp in face.loops:
                co = lp.vert.co; a, b = {'xz': (co.x, co.z), 'yz': (co.y, co.z), 'xy': (co.x, co.y)}[plane]
                lp[lay_].uv = (a * uvs, b * uvs)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('ring', me); bpy.context.collection.objects.link(o)
    return kit._finish(o, m, bevel, True) if bevel else (o.data.materials.append(m), o)[1]

def circ(cx, cy, r, n=40, rx=None, ry=None, rot=0.0):
    rx = rx or r; ry = ry or r; c, s = math.cos(rot), math.sin(rot)
    return [(cx + c * rx * math.cos(2 * math.pi * i / n) - s * ry * math.sin(2 * math.pi * i / n),
             cy + s * rx * math.cos(2 * math.pi * i / n) + c * ry * math.sin(2 * math.pi * i / n)) for i in range(n)]
def rrect(cx, cy, w, h, r, seg=6):
    r = min(r, w / 2, h / 2)
    pts = []
    corners = [(cx + w / 2 - r, cy + h / 2 - r, 0), (cx - w / 2 + r, cy + h / 2 - r, 90), (cx - w / 2 + r, cy - h / 2 + r, 180), (cx + w / 2 - r, cy - h / 2 + r, 270)]
    for (ox, oy, a0) in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg); pts.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    return pts
def rotpts(pts, a, cx=0, cy=0, dx=0, dy=0, s=1.0):
    c, sn = math.cos(a), math.sin(a)
    return [(cx + dx + s * ((p[0] - cx) * c - (p[1] - cy) * sn), cy + dy + s * ((p[0] - cx) * sn + (p[1] - cy) * c)) for p in pts]
def thick_line(pts, w):
    """A polyline as a simple polygon of width w (mitred corners)."""
    pts = [Vector(p) for p in pts]; L, R = [], []
    for i, p in enumerate(pts):
        if i == 0: d = (pts[1] - p).normalized(); n = Vector((-d.y, d.x)); k = 1.0
        elif i == len(pts) - 1: d = (p - pts[i - 1]).normalized(); n = Vector((-d.y, d.x)); k = 1.0
        else:
            d0 = (p - pts[i - 1]).normalized(); d1 = (pts[i + 1] - p).normalized(); n = Vector((-(d0 + d1).y, (d0 + d1).x)).normalized()
            k = 1 / max(0.35, n.dot(Vector((-d0.y, d0.x))))
        L.append(tuple(p + n * (w / 2) * k)); R.append(tuple(p - n * (w / 2) * k))
    return L + R[::-1]
def spline(ctrl, per=8, closed=True):
    """Catmull-Rom through control points."""
    P = list(ctrl); n = len(P); out = []
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        for k in range(per):
            t = k / per; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    return out

# ======================================================================================================
# ICONS (same look as the others: chunky, matte, rendered; each is built round (0, 0, 0.5))
# ======================================================================================================
CAM = Vector((math.cos(kit.ELEV) * math.cos(math.radians(45)), math.cos(kit.ELEV) * math.sin(math.radians(45)), math.sin(kit.ELEV)))
RIGHT = Vector((-1, 1, 0)).normalized(); UP = CAM.cross(RIGHT).normalized()
if UP.z < 0: UP = -UP
def P(x, y, off=0.0, z0=0.5): return Vector((0, 0, z0)) + RIGHT * x + UP * y + CAM * off
def sc(objs, x=0, y=0, z=0.0, s=1.0, rz=0.0):
    """Parts built in a front view (x right, z up, -y toward the viewer), turned to face the icon camera."""
    g = kit.group(list(objs), 'sc'); g.rotation_euler = (0, 0, math.radians(135 + rz)); g.location = (x, y, z); g.scale = (s, s, s); return g
def lay(pts, col, off=0.0, thick=0.1, bevel=0.03, rough=0.5, dx=0.0, dy=0.0, m=None, name='lay'):
    """A flat cut-out shape facing the camera, `off` metres toward the viewer."""
    o = plaque([(p[0] + dx, p[1] + dy) for p in pts], thick, m or mat(col, rough), bevel, name); o.location = P(0, 0, off); return o
def facing(objs, x, y, off=0.0):
    """Round parts built in the flat x-y plane (z toward the viewer), turned to face the camera and set at (x, y) of the picture."""
    g = kit.group(list(objs), 'face'); g.rotation_euler = CAM.to_track_quat('Z', 'Y').to_euler(); g.location = P(x, y, off); return g
def heart_pts(s=0.021, cx=0.0, cy=0.0, rot=0.0):
    pts = [(s * 16 * math.sin(2 * math.pi * i / 48) ** 3, s * (13 * math.cos(2 * math.pi * i / 48) - 5 * math.cos(4 * math.pi * i / 48) - 2 * math.cos(6 * math.pi * i / 48) - math.cos(8 * math.pi * i / 48)) + 0.03) for i in range(48)]
    return rotpts(pts, rot, 0, 0, cx, cy)
def star_pts(R=0.3, r=0.13, n=5, rot=0.0, cx=0.0, cy=0.0):
    return [(cx + (R if i % 2 == 0 else r) * math.sin(math.pi * i / n + rot), cy + (R if i % 2 == 0 else r) * math.cos(math.pi * i / n + rot)) for i in range(2 * n)]

def _pot_small(z=0.2, s=1.0, col=None):
    """The little pot of the friendship flower: terracotta, a soil top. Returns the soil top height."""
    col = col or C['terra']
    lathe(0, 0, z, [(0.001, 0), (0.15 * s, 0), (0.22 * s, 0.3 * s), (0.255 * s, 0.33 * s), (0.2 * s, 0.345 * s), (0.001, 0.31 * s)], mat(col, 0.7))
    lathe(0, 0, z + 0.3 * s, [(0.265 * s, 0), (0.27 * s, 0.045 * s), (0.25 * s, 0.075 * s), (0.215 * s, 0.045 * s)], mat('#E58A62', 0.7))
    ball(0, 0, z + 0.335 * s, 0.215 * s, mat(D['soil'], 1.0), 1, 1, 0.22)
    return z + 0.36 * s

def _leaf(x, y, z, s=0.12, rot=0.0, side=1, col=None):
    l = ball(0, 0, 0, s, mat(col or C['leaf'], 0.5), 1.0, 0.5, 0.17); l.rotation_euler = (0, math.radians(-side * 30), rot); l.location = (x, y, z); return l

@icon('flower0')
def icon_flower0():
    top = _pot_small(0.2, 1.15)
    for (x, y, s) in [(0.1, 0.06, 0.03), (-0.12, -0.04, 0.026), (0.02, -0.12, 0.022)]: ball(x, y, top - 0.02, s, mat('#8F6A4A', 0.9), 1.2, 1, 0.8)
    ball(-0.04, 0.08, top - 0.03, 0.04, mat('#8A5E3E', 1.0), 1.5, 1, 0.5)
@icon('flower1')
def icon_flower1():
    top = _pot_small(0.2, 1.15)
    tube((0, 0, top - 0.02), (0.01, 0, top + 0.24), 0.026, mat(C['leaf'], 0.5), 0.02)
    for s in (-1, 1): _leaf(s * 0.15, 0, top + 0.27, 0.15, 0, s, C['leaf'] if s > 0 else C['sage'])
    ball(0, 0, top + 0.28, 0.045, mat(C['sage'], 0.5), 1, 1, 1.3)
@icon('flower2')
def icon_flower2():
    top = _pot_small(0.2, 1.1)
    tube((0, 0, top - 0.02), (0.0, 0, top + 0.5), 0.03, mat(C['leaf'], 0.5), 0.024)
    for (s, z, c) in [(-1, 0.18, C['leaf']), (1, 0.3, C['leafD'])]: _leaf(s * 0.17, 0, top + z, 0.16, 0, s, c)
    ball(0, 0, top + 0.6, 0.09, mat(D['pink'], 0.5), 0.9, 0.9, 1.35)
    for a in (-0.7, 0.0, 0.7):
        l = ball(0, 0, 0, 0.07, mat(C['leaf'], 0.5), 0.5, 0.5, 1.0); l.rotation_euler = (0, a * 0.5, 0); l.location = (math.sin(a) * 0.045, 0, top + 0.53)
def _bloom(R, n, col, col2, cen, x, y, z_off=0.0, layers=1):
    parts = []
    for ly in range(layers):
        rr = R * (1 - 0.28 * ly); cc = col if ly == 0 else col2
        for i in range(n):
            a = 2 * math.pi * i / n + ly * math.pi / n
            p = ball(math.cos(a) * rr * 0.72, math.sin(a) * rr * 0.72, 0.012 * ly, rr * 0.5, mat(cc, 0.5), 1.0, 1.0, 0.45)
            p.scale = (rr * 0.5 / (rr * 0.5) * 1.05, 0.62, 0.45); p.rotation_euler = (0, 0, a); p.location = (math.cos(a) * rr * 0.72, math.sin(a) * rr * 0.72, 0.012 * ly)
            parts.append(p)
    parts.append(ball(0, 0, 0.03 * (layers + 1), R * 0.34, mat(cen, 0.5), 1, 1, 0.7))
    return facing(parts, x, y, z_off)
@icon('flower3')
def icon_flower3():
    top = _pot_small(0.2, 1.05)
    tube((0, 0, top - 0.02), (0.0, 0, top + 0.5), 0.03, mat(C['leaf'], 0.5), 0.024)
    for (s, z, c) in [(-1, 0.14, C['leaf']), (1, 0.27, C['leafD'])]: _leaf(s * 0.17, 0, top + z, 0.16, 0, s, c)
    g = _bloom(0.21, 5, D['pink'], D['pink'], C['mustard'], 0, 0)
    g.location = Vector((0, 0, top + 0.62)) + CAM * 0.0
@icon('thread')
def icon_thread():
    wood = mat(C['woodL'], 0.5); col = mat(C['terra'], 0.9, sheen=0.7); sage = mat(C['teal'], 0.9, sheen=0.7)
    parts = [cyl(0, 0, 0, 0.27, 0.07, wood, 0.025, 40), cyl(0, 0, 0.55, 0.27, 0.07, wood, 0.025, 40), cyl(0, 0, 0.06, 0.2, 0.5, col, 0.02, 40)]
    for z in (0.12, 0.2, 0.28, 0.36, 0.44): parts.append(torus(0, 0, z, 0.2, 0.018, mat('#C9593A', 0.9), 1.0, (0, 0, 0), 40, 8))
    # a loose end, and a needle
    parts.append(tube((0.2, 0.0, 0.3), (0.34, -0.1, 0.12), 0.012, col)); parts.append(tube((0.34, -0.1, 0.12), (0.4, -0.3, 0.02), 0.012, col))
    g = sc(parts, -0.1, 0, 0.25, 1.1)
    nd = [tube((0.0, 0.0, 0.0), (0.0, 0.0, 0.62), 0.012, mat(C['steel'] if 'steel' in C else '#C8D3D8', 0.25, 0.9)), torus(0, 0, 0.55, 0.018, 0.007, mat('#C8D3D8', 0.25, 0.9), 1.0, (math.pi / 2, 0, 0), 20, 8)]
    ng = kit.group(nd, 'needle'); ng.rotation_euler = (0, math.radians(-38), math.radians(135)); ng.location = P(0.38, -0.2, 0.18) - Vector((0, 0, 0.3))
    ng.location = Vector((0.2, -0.05, 0.22))
@icon('parcel')
def icon_parcel():
    kr = mat(D['kraft'], 0.85); st = mat(C['cream'], 0.9); rb = mat(C['terra'], 0.7)
    parts = [bx(0, 0, 0, 0.58, 0.58, 0.46, kr, 0.04), bx(0, 0, 0, 0.6, 0.075, 0.47, st, 0.012), bx(0, 0, 0, 0.075, 0.6, 0.47, st, 0.012)]
    for a in (0.5, -0.5):
        b = ball(0, 0, 0, 0.1, rb, 1.4, 0.6, 0.55); b.rotation_euler = (0, 0, a); b.location = (math.cos(a) * 0.1, math.sin(a) * 0.1 * 0 + 0.0, 0.5); parts.append(b)
    parts += [ball(0, 0, 0.5, 0.045, rb), tube((0.0, 0.0, 0.5), (0.08, 0.2, 0.46), 0.014, rb), tube((0.0, 0.0, 0.5), (-0.12, 0.17, 0.44), 0.014, rb)]
    lab = box(0, 0, 0, 0.2, 0.012, 0.15, None, 0.004); lab.data.materials.append(tex_mat('frame-d', M.PATS['d'], 256, 0.8)); lab.location = (0.05, -0.294, 0.14); parts.append(lab)
    g = kit.group(parts, 'parcel'); g.rotation_euler = (0, 0, math.radians(135 - 28)); g.location = (0, 0, 0.3)

# ---- the interface set ----
@icon('hug')
def icon_hug():
    lay(heart_pts(0.0185, -0.14, 0.0, math.radians(14)), D['red'], 0.0, 0.16, 0.05, 0.45)
    lay(heart_pts(0.0185, 0.14, -0.02, math.radians(-14)), D['pink'], 0.07, 0.16, 0.05, 0.45)
@icon('check')
def icon_check():
    lay(circ(0, 0, 0.42), D['green'], 0.0, 0.14, 0.04, 0.45)
    lay(thick_line([(-0.22, -0.01), (-0.08, -0.15), (0.24, 0.17)], 0.13), D['chalk'], 0.08, 0.1, 0.035, 0.45)
@icon('cross')
def icon_cross():
    lay(circ(0, 0, 0.42), D['red'], 0.0, 0.14, 0.04, 0.45)
    a, e = 0.065, 0.25
    plus = [(a, e), (a, a), (e, a), (e, -a), (a, -a), (a, -e), (-a, -e), (-a, -a), (-e, -a), (-e, a), (-a, a), (-a, e)]
    lay(rotpts(plus, math.radians(45)), D['chalk'], 0.08, 0.1, 0.035, 0.45)
@icon('arrow')
def icon_arrow():
    arr = [(-0.43, 0.16), (0.0, 0.16), (0.0, 0.36), (0.46, 0.0), (0.0, -0.36), (0.0, -0.16), (-0.43, -0.16)]
    lay([(p[0] * 1.07, p[1] * 1.12) for p in arr], C['tealD'], -0.02, 0.16, 0.06, 0.5)
    lay(arr, C['teal'], 0.04, 0.16, 0.06, 0.5)
@icon('sun')
def icon_sun():
    for i in range(8):
        a = i * math.pi / 4
        lay(rotpts([(-0.075, 0.3), (0.075, 0.3), (0.0, 0.48)], -a), '#F08A2E', 0.0, 0.1, 0.03, 0.45)
    lay(circ(0, 0, 0.29), C['mustard'], 0.04, 0.16, 0.05, 0.4)
    lay(circ(-0.07, 0.08, 0.1), '#F8D56C', 0.12, 0.05, 0.03, 0.4)
def _mitten():
    ctrl = [(-0.20, -0.30), (0.20, -0.30), (0.265, -0.10), (0.27, 0.15), (0.24, 0.33), (0.13, 0.45), (0.0, 0.48), (-0.13, 0.45), (-0.22, 0.33), (-0.235, 0.15), (-0.31, 0.19), (-0.43, 0.18), (-0.475, 0.08), (-0.43, -0.03), (-0.30, -0.10), (-0.235, -0.2)]
    return spline(ctrl, 8)
@icon('hand')
def icon_hand():
    m = _mitten(); a = math.radians(-78)
    lay(rotpts(m, a, 0, 0, -0.02, 0.18, 0.78), D['peach'], 0.0, 0.14, 0.05, 0.55)
    lay(rotpts([(-0.2, -0.3), (0.2, -0.3), (0.2, -0.46), (-0.2, -0.46)], a, 0, 0, -0.02 - 0.0, 0.18, 0.78), C['teal'], 0.02, 0.15, 0.04, 0.55)
    # a small down-arrow under the palm: put it down
    lay([(-0.075, 0.05), (0.075, 0.05), (0.075, -0.08), (0.15, -0.08), (0.0, -0.24), (-0.15, -0.08), (-0.075, -0.08)], C['terra'], 0.02, 0.1, 0.03, 0.5, 0.02, -0.17)
@icon('wave')
def icon_wave():
    m = _mitten(); a = math.radians(-12)
    lay(rotpts(m, a, 0, 0, 0.02, -0.02, 0.85), D['peach'], 0.0, 0.14, 0.05, 0.55)
    lay(rotpts([(-0.2, -0.3), (0.2, -0.3), (0.2, -0.46), (-0.2, -0.46)], a, 0, 0, 0.02, -0.02, 0.85), C['teal'], 0.02, 0.15, 0.04, 0.55)
    for (r, w) in [(0.5, 0.06), (0.62, 0.06)]:
        arc = [(r * math.cos(math.radians(t)), 0.1 + r * math.sin(math.radians(t))) for t in range(28, 78, 8)]
        lay(thick_line([(-p[0] - 0.0, p[1]) for p in arc], w), C['mustard'], 0.0, 0.08, 0.025, 0.5, -0.0, -0.02)
@icon('drops')
def icon_drops():
    col = mat('#4DB1E6', 0.18); hi = mat('#E9F7FF', 0.15)
    def drop(x, y, z, s):
        pts = [(0.001, 0)]
        for i in range(1, 10):
            a = -math.pi / 2 + i * (math.radians(25) + math.pi / 2) / 9; pts.append((0.28 * math.cos(a), 0.28 + 0.28 * math.sin(a)))
        for i in range(1, 7):
            t = i / 7; pts.append((0.254 * (1 - t) ** 1.7, 0.4 + 0.42 * t))
        pts.append((0.001, 0.85))
        o = lathe(0, 0, 0, [(r * s, h * s) for r, h in pts], col); o.location = (x, y, z)
        b = ball(x - 0.07 * s, y + 0.0, z + 0.2 * s, 0.045 * s, hi, 0.8, 0.5, 1.5); b.location = Vector(o.location) + Vector((-0.07 * s * 0.8, -0.0, 0.2 * s))
    drop(-0.2, 0.02, 0.2, 0.62); drop(0.22, 0.04, 0.2, 0.62); drop(0.0, -0.2, 0.32, 0.72)
@icon('album')
def icon_album():
    lay(rrect(0.035, -0.03, 0.62, 0.8, 0.05), C['cream'], -0.06, 0.1, 0.02, 0.8, 0.0, 0.0)
    lay(rrect(0.0, 0.0, 0.64, 0.82, 0.05), C['indigo'], 0.0, 0.16, 0.04, 0.5)
    lay(rrect(-0.26, 0.0, 0.1, 0.82, 0.03), '#2C397A', 0.06, 0.1, 0.02, 0.5)
    lay(rrect(0.06, 0.0, 0.46, 0.66, 0.03), '#4B5BA8', 0.06, 0.05, 0.012, 0.5)
    lay(star_pts(0.22, 0.095, 5, 0, 0.06, 0.02), C['mustard'], 0.1, 0.1, 0.03, 0.35)
@icon('people')
def icon_people():
    skin = mat('#F0BE97', 0.55)
    def peg(x, h, col, w):
        body = [lathe(0, 0, 0, [(0.001, 0), (w * 0.9, 0), (w, 0.04), (w * 0.82, h * 0.7), (w * 0.62, h), (0.001, h + 0.01)], mat(col, 0.5))]
        body.append(ball(0, 0, h + w * 0.55, w * 0.62, skin)); body.append(torus(0, 0, h * 0.86, w * 0.66, w * 0.07, mat(C['cream'], 0.5), 1.0, (0, 0, 0), 32, 8))
        return put(body, x, 0, 0.14)
    peg(-0.2, 0.5, C['teal'], 0.2); peg(0.22, 0.38, C['terra'], 0.17)
@icon('map')
def icon_map():
    p1 = [(-0.45, 0.3), (-0.15, 0.38), (-0.15, -0.3), (-0.45, -0.38)]; p2 = [(-0.15, 0.38), (0.15, 0.3), (0.15, -0.38), (-0.15, -0.3)]; p3 = [(0.15, 0.3), (0.45, 0.38), (0.45, -0.3), (0.15, -0.38)]
    lay(p1, '#DCEBB6', 0.0, 0.07, 0.015, 0.8); lay(p2, '#F4E4B4', 0.0, 0.07, 0.015, 0.8); lay(p3, '#CFE8EE', 0.0, 0.07, 0.015, 0.8)
    lay([(0.15, 0.3), (0.2, 0.34), (0.3, 0.1), (0.4, -0.05), (0.45, -0.1), (0.45, -0.3), (0.35, -0.2), (0.25, -0.1), (0.2, 0.05)], '#A9D5E2', 0.05, 0.03, 0.005, 0.7)
    path = [(-0.34, -0.2), (-0.26, -0.08), (-0.16, -0.02), (-0.05, -0.04), (0.04, -0.12), (0.12, -0.1), (0.2, 0.0), (0.28, 0.06), (0.34, 0.13)]
    for (x, y) in path[:-1]:
        o = ball(0, 0, 0, 0.032, mat(C['terra'], 0.5)); o.location = P(x, y, 0.07)
    # the pin at the end
    pin = lathe(0, 0, 0, [(0.001, 0), (0.015, 0.05), (0.06, 0.15), (0.075, 0.23), (0.06, 0.3), (0.0, 0.33)], mat(D['red'], 0.4)); pin.location = P(0.36, 0.1, 0.06) - Vector((0, 0, 0.03))
    ball(0, 0, 0, 0.026, mat(C['cream'], 0.4)).location = P(0.36, 0.1, 0.06) + Vector((0, 0, 0.23))
@icon('sofa')
def icon_sofa():
    body = fab('#E5805A'); dark = fab('#C0603F'); wood = woodD()
    parts = []
    for x in (-0.38, 0.38): parts.append(cyl(x, 0, 0, 0.032, 0.1, wood, 0.01, 16))
    parts += [bx(0, 0, 0.09, 0.86, 0.42, 0.14, dark, 0.05), bx(0, 0.14, 0.15, 0.86, 0.15, 0.55, body, 0.07)]
    for s in (-1, 1): parts.append(bx(s * 0.38, -0.01, 0.15, 0.13, 0.4, 0.38, body, 0.05))
    for x in (-0.15, 0.15): parts.append(bx(x, -0.04, 0.22, 0.3, 0.3, 0.14, body, 0.05))
    for x in (-0.15, 0.15): parts.append(bx(x, 0.1, 0.34, 0.3, 0.1, 0.3, body, 0.05))
    pl = box(0, 0, 0, 0.2, 0.08, 0.2, None, 0.04); pl.data.materials.append(tex_mat('cush1', lambda s: khatam(s, C['mustard'], C['cream'], C['terra'], 2), 256, 0.98)); pl.location = (-0.2, -0.04, 0.4); pl.rotation_euler = (0, 0, 0.1); parts.append(pl)
    pl2 = box(0, 0, 0, 0.18, 0.08, 0.18, None, 0.04); pl2.data.materials.append(tex_mat('cush2', lambda s: weave(s, C['terra'], '#E58C63', 8), 256, 0.98)); pl2.location = (0.22, -0.04, 0.38); pl2.rotation_euler = (0, 0, -0.1); parts.append(pl2)
    sc(parts, 0, 0, 0.3, 1.18, -32)
# ---- (second pass: parts must stay above z = 0.2, the shadow catcher hides what is below it) ----
@icon('globe')
def icon_globe():
    sea = mat('#3E98D6', 0.4); land = mat(C['leaf'], 0.6); landD = mat(C['leafD'], 0.6); br = brass()
    R = 0.3; parts = [ball(0, 0, 0, R, sea)]
    for (th, ph, s, c) in [(60, 20, 0.18, land), (80, 100, 0.15, land), (115, 140, 0.13, landD), (45, 200, 0.14, land), (105, 260, 0.18, land), (130, 320, 0.12, landD), (20, 60, 0.1, landD), (85, 40, 0.1, land)]:
        t, p = math.radians(th), math.radians(ph); n = Vector((math.sin(t) * math.cos(p), math.sin(t) * math.sin(p), math.cos(t)))
        b = ball(0, 0, 0, s, c, 1.0, 0.85, 0.22); b.rotation_euler = n.to_track_quat('Z', 'Y').to_euler(); b.location = n * R * 0.97; parts.append(b)
    g = kit.group(parts, 'earth'); g.rotation_euler = (0, math.radians(23), math.radians(30)); g.location = (0, 0, 0.8)
    parts2 = [torus(0, 0, 0.8, 0.355, 0.02, br, 1.0, (math.pi / 2, 0, 0), 48, 12), cyl(0, 0, 0.2, 0.25, 0.05, woodD(), 0.02, 40), cyl(0, 0, 0.2, 0.18, 0.1, woodM(), 0.02, 40),
              tube((0, 0, 0.3), (0, 0, 0.5), 0.032, br)]
    sc(parts2, 0, 0, 0.0, 1.0)
    for o in parts2[:1]: o.rotation_euler = (math.pi / 2, 0, 0)
@icon('tea')
def icon_tea():
    ind = mat(C['indigo'], 0.3)
    parts = [lathe(0, 0, 0, [(0.001, 0), (0.12, 0), (0.2, 0.06), (0.24, 0.2), (0.2, 0.34), (0.11, 0.4), (0.1, 0.42), (0.001, 0.42)], ind),
             lathe(0, 0, 0.4, [(0.12, 0), (0.1, 0.04), (0.04, 0.08), (0.001, 0.09)], mat(C['cream'], 0.4)), ball(0, 0, 0.51, 0.03, brass()),
             torus(0, 0, 0.19, 0.24, 0.014, mat(C['mustard'], 0.4), 0.3, (math.pi / 2, 0, 0), 40, 8),
             tube((0.2, 0, 0.13), (0.37, 0, 0.3), 0.04, ind, 0.02), tube((-0.2, 0, 0.1), (-0.37, 0, 0.2), 0.028, ind), tube((-0.37, 0, 0.2), (-0.31, 0, 0.38), 0.028, ind), tube((-0.31, 0, 0.38), (-0.2, 0, 0.36), 0.028, ind)]
    sc(parts, -0.12, 0.1, 0.3, 1.0)
    cup = [cyl(0, 0, 0, 0.2, 0.025, mat(C['cream'], 0.4), 0.01, 40), lathe(0, 0, 0.02, [(0.001, 0), (0.09, 0), (0.125, 0.14), (0.001, 0.14)], mat(C['cream'], 0.35)),
           lathe(0, 0, 0.12, [(0.001, 0), (0.118, 0), (0.12, 0.03), (0.001, 0.03)], mat('#C9772F', 0.25)), torus(0.13, 0, 0.1, 0.045, 0.014, mat(C['cream'], 0.35), 1.0, (math.pi / 2, 0, 0), 20, 8)]
    kit.group(cup, 'cup').location = (0.2, -0.22, 0.2)
@icon('kitchen')
def icon_kitchen():
    teal = mat(C['teal'], 0.4); dk = mat(C['tealD'], 0.5); cr = mat(C['cream'], 0.4)
    parts = [lathe(0, 0, 0.0, [(0.001, 0), (0.3, 0), (0.34, 0.04), (0.35, 0.4), (0.33, 0.44), (0.001, 0.44)], teal), torus(0, 0, 0.26, 0.355, 0.016, dk, 1.0, (0, 0, 0), 40, 8)]
    parts += [lathe(0, 0, 0.42, [(0.38, 0), (0.37, 0.04), (0.24, 0.13), (0.07, 0.19), (0.001, 0.2)], cr), ball(0, 0, 0.66, 0.06, mat(C['woodD'], 0.5))]
    for s in (-1, 1): parts += [rcyl(s * 0.4, 0, 0.3, 0.05, 0.07, dk, 'x', 0.01, 20)]
    for (x, z, r) in [(0.12, 0.82, 0.1), (0.2, 0.98, 0.085), (0.1, 1.12, 0.07)]: parts.append(ball(x, -0.05, z, r, mat('#FFFFFF', 0.9), 1.0, 0.7, 0.85))
    sc(parts, -0.05, 0, 0.22, 0.88)
    l = [tube((0, 0, 0), (0.0, 0, 0.55), 0.024, mat(C['woodL'], 0.5)), ball(0, 0, 0.0, 0.07, mat(C['woodL'], 0.5), 1, 1, 0.5)]
    g = kit.group(l, 'ladle'); g.rotation_euler = (0, math.radians(34), math.radians(135)); g.location = Vector((0.12, -0.08, 0.52))
# ---- additions: money, abacus, price tag ----
@icon('abacus')
def icon_abacus():
    wd = woodD(); wl = woodL(); cols = [C['terra'], C['teal'], C['mustard'], C['indigo'], C['sage']]
    parts = [bx(0, 0, 0.0, 0.84, 0.08, 0.07, wd, 0.025), bx(0, 0, 0.58, 0.84, 0.08, 0.07, wd, 0.025), bx(-0.4, 0, 0.0, 0.07, 0.08, 0.65, wd, 0.025), bx(0.4, 0, 0.0, 0.07, 0.08, 0.65, wd, 0.025)]
    for i in range(5):
        z = 0.09 + i * 0.1; parts.append(tube((-0.38, 0, z + 0.04), (0.38, 0, z + 0.04), 0.009, mat('#8A6A44', 0.5), caps=False))
        n = 7 if i % 2 == 0 else 6
        for k in range(n):
            x = (-0.32 + k * 0.075) if k < n // 2 + 1 else (0.34 - (n - 1 - k) * 0.075)
            parts.append(ball(x, 0, z + 0.04, 0.036, mat(cols[i % 5], 0.4), 1.0, 0.9, 1.0))
    parts += [bx(-0.34, 0, -0.05 + 0.0, 0.12, 0.2, 0.06, wd, 0.02), bx(0.34, 0, -0.05, 0.12, 0.2, 0.06, wd, 0.02)] if False else []
    sc(parts, 0, 0, 0.32, 1.15)
@icon('tag')
def icon_tag():
    out = [(-0.3, 0.3), (0.1, 0.3), (0.34, 0.05), (0.34, -0.05), (0.1, -0.3), (-0.3, -0.3)]
    # a tag with a pointed end, a hole, a string, a plain coin mark
    tagp = [(-0.4, 0.26), (0.12, 0.26), (0.4, 0.0), (0.12, -0.26), (-0.4, -0.26)]
    tp = rotpts(tagp, math.radians(-30), 0, 0, 0.0, -0.06, 1.0)
    lay(tp, C['tealD'], -0.02, 0.14, 0.05, 0.5, 0.0, -0.01)
    lay(tp, C['teal'], 0.03, 0.14, 0.05, 0.5)
    inner = rotpts([(-0.3, 0.17), (0.1, 0.17), (0.28, 0.0), (0.1, -0.17), (-0.3, -0.17)], math.radians(-30), 0, 0, 0.0, -0.06, 1.0)
    lay(inner, C['cream'], 0.09, 0.05, 0.015, 0.6)
    c = rotpts([(0.0, 0.0)], math.radians(-30), 0, 0, 0.0, -0.06, 1.0)[0]
    h = rotpts([(-0.3, 0.0)], math.radians(-30), 0, 0, 0.0, -0.06, 1.0)[0]
    lay(circ(c[0] - 0.01, c[1] + 0.005, 0.085, 28), C['mustard'], 0.14, 0.06, 0.02, 0.35)
    lay(circ(h[0] + 0.0, h[1], 0.045, 20), '#2B6F6B', 0.1, 0.04, 0.01, 0.6)
    ring = [(h[0] + 0.0 + 0.17 * math.cos(t / 20 * 2 * math.pi), h[1] + 0.17 + 0.17 * math.sin(t / 20 * 2 * math.pi)) for t in range(21)]
    lay(thick_line(ring, 0.035), C['terra'], 0.06, 0.05, 0.012, 0.8)

# ---- third pass ----
@icon('flower4')
def icon_flower4():
    top = _pot_small(0.2, 0.95)
    tube((0, 0, top - 0.02), (0.0, 0, top + 0.42), 0.03, mat(C['leaf'], 0.5), 0.026)
    for (s, z, c) in [(-1, 0.08, C['leaf']), (1, 0.16, C['leafD']), (-1, 0.27, C['sage']), (1, 0.33, C['leaf'])]: _leaf(s * 0.19, 0, top + z, 0.16, 0, s, c)
    g = _bloom(0.27, 9, D['coral'], '#F7A39A', C['mustard'], 0, 0, layers=2)
    g.location = Vector((0, 0, top + 0.54))
@icon('basket')
def icon_basket():
    wv = mat('#D9A864', 0.8); wd = mat('#B98446', 0.8)
    parts = [lathe(0, 0, 0.0, [(0.001, 0), (0.26, 0), (0.3, 0.03), (0.4, 0.28), (0.41, 0.3), (0.001, 0.3)], wv)]
    for z in (0.07, 0.15, 0.23):
        parts.append(torus(0, 0, z, 0.275 + (z / 0.3) * 0.12, 0.017, wd, 1.0, (0, 0, 0), 40, 8))
    for k in range(14):
        a = k * 2 * math.pi / 14; parts.append(tube((math.cos(a) * 0.27, math.sin(a) * 0.27, 0.04), (math.cos(a) * 0.405, math.sin(a) * 0.405, 0.29), 0.012, wd, caps=False))
    parts.append(torus(0, 0, 0.3, 0.405, 0.03, wd, 1.0, (0, 0, 0), 40, 12))
    parts += [ball(-0.14, 0.02, 0.38, 0.17, mat('#E1A35A', 0.5), 1.45, 0.85, 0.7), ball(0.17, 0.05, 0.4, 0.13, mat('#E0503C', 0.4)), ball(0.02, -0.13, 0.36, 0.11, mat(C['mustard'], 0.45))]
    for a in (-0.5, 0.2): parts.append(ball(0.12 + a * 0.1, 0.1, 0.55, 0.09, mat(C['leaf'], 0.5), 1.0, 0.45, 0.22))
    parts.append(torus(0, 0, 0.3, 0.37, 0.032, wd, 1.0, (math.pi / 2, 0, 0), 48, 12))
    sc(parts, 0, 0, 0.26, 0.95)
    # the lower half of the handle ring sits inside the basket (hidden); the upper half is the handle
@icon('roller')
def icon_roller():
    fab_ = mat(C['mustard'], 0.95, sheen=0.5); steel = mat('#C8D3D8', 0.3, 0.8)
    parts = [rcyl(0, 0, 0.66, 0.15, 0.7, fab_, 'x', 0.03, 32), rcyl(-0.36, 0, 0.66, 0.145, 0.03, mat(C['terra'], 0.5), 'x', 0.01, 32), rcyl(0.36, 0, 0.66, 0.145, 0.03, mat(C['terra'], 0.5), 'x', 0.01, 32)]
    for i in range(6): parts.append(torus(-0.28 + i * 0.112, 0, 0.66, 0.15, 0.006, mat('#D49A2A', 0.9), 1.0, (0, math.pi / 2, 0), 32, 6))
    wire = [(0.36, 0.66), (0.46, 0.66), (0.46, 0.46), (0.0, 0.46)]
    for a, c in zip(wire, wire[1:]): parts.append(tube((a[0], 0, a[1]), (c[0], 0, c[1]), 0.024, steel))
    parts.append(tube((0.0, 0, 0.46), (0.0, 0, 0.3), 0.024, steel)); parts.append(cyl(0, 0, 0.0, 0.058, 0.32, woodL(), 0.02, 24)); parts.append(cyl(0, 0, 0.3, 0.064, 0.03, mat(C['terra'], 0.5), 0.01, 24))
    sc(parts, 0, 0, 0.2, 1.0)
@icon('follow')
def icon_follow():
    def foot(cx, cy, rot, col, left, S=1.45):
        outl = []
        for i in range(32):
            t = 2 * math.pi * i / 32
            x = 0.088 * math.sin(t) * (1.0 + 0.12 * math.cos(t)); y = 0.15 * math.cos(t)
            if y < 0: x *= 0.78
            outl.append((x * S, (y - 0.03) * S))
        toes = [(-0.07, 0.17, 0.042), (-0.03, 0.205, 0.036), (0.014, 0.215, 0.032), (0.057, 0.2, 0.029), (0.09, 0.168, 0.025)]
        toes = [(t[0] * S, t[1] * S, t[2] * S) for t in toes]
        if not left: toes = [(-t[0], t[1], t[2]) for t in toes]; outl = [(-p[0], p[1]) for p in outl]
        lay(rotpts(outl, rot, 0, 0, cx, cy), col, 0.0, 0.1, 0.03, 0.45)
        for (tx, ty, tr) in toes:
            p = rotpts([(tx, ty)], rot, 0, 0, cx, cy)[0]; lay(circ(p[0], p[1], tr * 1.15, 16), col, 0.0, 0.1, 0.02, 0.45)
    foot(-0.2, -0.2, math.radians(-14), C['terra'], True)
    foot(0.18, 0.14, math.radians(-14), C['teal'], False)
@icon('bath')
def icon_bath():
    wh = mat('#FBF7EE', 0.35); water = mat('#5BC0E8', 0.1)
    parts = [bx(0, 0, 0.1, 0.94, 0.52, 0.08, wh, 0.03)]
    parts += [bx(0, -0.22, 0.1, 0.94, 0.08, 0.4, wh, 0.05), bx(0, 0.22, 0.1, 0.94, 0.08, 0.4, wh, 0.05), bx(-0.43, 0, 0.1, 0.08, 0.52, 0.4, wh, 0.05), bx(0.43, 0, 0.1, 0.08, 0.52, 0.4, wh, 0.05)]
    parts += [bx(0, 0, 0.14, 0.8, 0.38, 0.32, water, 0.02)]
    for x in (-0.38, 0.38):
        for y in (-0.17, 0.17): parts.append(cyl(x, y, 0.0, 0.05, 0.12, mat(C['mustard'], 0.4), 0.015, 16))
    br = brass(); parts += [tube((-0.36, 0.25, 0.5), (-0.36, 0.25, 0.74), 0.034, br), tube((-0.36, 0.25, 0.74), (-0.36, 0.1, 0.74), 0.032, br), ball(-0.36, 0.25, 0.5, 0.055, mat(C['terra'], 0.4)), ball(-0.18, 0.25, 0.5, 0.055, mat(C['teal'], 0.4))]
    for (x, y, z, r) in [(0.0, 0.0, 0.46, 0.09), (0.13, -0.03, 0.47, 0.075), (-0.1, 0.04, 0.48, 0.07), (0.25, 0.04, 0.46, 0.065), (0.05, 0.08, 0.55, 0.06), (-0.22, -0.04, 0.46, 0.06), (0.0, -0.08, 0.53, 0.055)]:
        parts.append(ball(x, y, z, r, mat('#FFFFFF', 0.25), 1, 1, 1))
    sc(parts, 0, 0, 0.2, 1.0)
@icon('moneybox')
def icon_moneybox():
    wl = woodL(); wd = woodD(); br = brass()
    parts = [bx(0, 0, 0.0, 0.66, 0.46, 0.42, wl, 0.06), bx(0, 0, 0.0, 0.7, 0.5, 0.06, wd, 0.03), bx(0, 0, 0.36, 0.7, 0.5, 0.07, wd, 0.03),
             bx(0, -0.236, 0.07, 0.08, 0.02, 0.28, wd, 0.008), bx(-0.24, -0.236, 0.07, 0.06, 0.02, 0.28, wd, 0.008), bx(0.24, -0.236, 0.07, 0.06, 0.02, 0.28, wd, 0.008)]
    parts.append(bx(0, 0.0, 0.425, 0.36, 0.055, 0.012, mat(D['ink'], 0.8), 0.003))
    pl = box(0, 0, 0, 0.2, 0.012, 0.2, None, 0.004); pl.data.materials.append(tex_mat('frame-a', M.PATS['a'], 256, 0.8)); pl.location = (-0.09, -0.236, 0.1); parts.append(pl)
    c = cyl(0, 0, -0.03, 0.17, 0.045, br, 0.014, 40); tr = torus(0, 0, 0.02, 0.12, 0.013, mat('#B8862E', 0.4, 0.8), 1.0)
    g = kit.group([c, tr], 'coin'); g.rotation_euler = (math.pi / 2, 0, 0.0); g.location = (0.0, 0.0, 0.62); parts.append(g)
    sc(parts, 0, 0, 0.22, 1.1)
@icon('clock')
def icon_clock():
    rim = mat(C['terra'], 0.45); face = mat(C['cream'], 0.5); ink = mat(D['ink'], 0.5)
    parts = [rcyl(0, 0, 0.5, 0.43, 0.14, rim, 'y', 0.03, 48), rcyl(0, -0.07, 0.5, 0.35, 0.04, face, 'y', 0.015, 48)]
    for i in range(12):
        a = i * math.pi / 6; r = 0.285; big = i % 3 == 0
        parts.append(ball(math.sin(a) * r, -0.1, 0.5 + math.cos(a) * r, 0.03 if big else 0.02, mat(C['tealD'] if big else D['ink'], 0.5)))
    for (ang, ln, w) in [(math.radians(-60), 0.17, 0.028), (math.radians(180 - 60), 0.25, 0.02)]:
        parts.append(tube((0, -0.11, 0.5), (math.sin(ang) * ln, -0.11, 0.5 + math.cos(ang) * ln), w, ink))
    parts.append(ball(0, -0.11, 0.5, 0.04, mat(C['terra'], 0.4)))
    sc(parts, 0, 0, 0.14, 0.88)


# ======================================================================================================
# WALL HELPERS, FLOORS AND FEATURES
# ======================================================================================================
_wall = M._wall
T_ = M.T
def _wallmat(sp): return mat(sp.get('shell', {}).get('wall', C['wall']), 0.95)
def wpoly(wall, pts, n0, n1, m, uvs=None, bevel=0.004):
    """A cut-out shape on a wall: pts = (u along the wall, z); stands from n0 to n1 out of the wall plane (negative n is inside the wall)."""
    return poly(pts, 'xz' if wall == 'L' else 'yz', (n0 + n1) / 2, n1 - n0, m, bevel, uvs)
def wring(wall, outer, inner, n0, n1, m, uvs=None, bevel=0.0):
    return ring_strip(outer, inner, 'xz' if wall == 'L' else 'yz', n0, n1, m, uvs, bevel)
def pointed(u0, u1, zs, n=12):
    """A pointed (equilateral) arch from (u0, zs) over the top to (u1, zs)."""
    w = u1 - u0; pts = []
    for i in range(n):
        a = math.radians(180 - 60 * i / (n - 1)); pts.append((u1 + w * math.cos(a), zs + w * math.sin(a)))
    for i in range(1, n):
        a = math.radians(60 - 60 * i / (n - 1)); pts.append((u0 + w * math.cos(a), zs + w * math.sin(a)))
    return pts
def round_arch(u0, u1, zs, n=18):
    r = (u1 - u0) / 2; return [((u0 + u1) / 2 + r * math.cos(math.radians(180 - 180 * i / (n - 1))), zs + r * math.sin(math.radians(180 - 180 * i / (n - 1)))) for i in range(n)]

# ---- floors ----
def _lerp(a, b, m): return a + (b - a) * m
def mcarpet(n):
    """A masjid carpet: rows 1.2 m wide, running along X, each with one arch-niche per prayer place (1 m wide), pointing at the qibla (-Y).
    One repeat is 6 m (5 rows, 6 places); the floor starts 0.16 m before the room, hence the shifts."""
    u, v = M._grid(n); xw = u * 6.0 - 0.16; yw = v * 6.0 - 0.16
    fx = (xw % 1.0) - 0.5; j = np.floor((yw - 0.7) / 1.2); fy = ((yw - 0.7) - j * 1.2) - 0.6
    def arch_in(r):
        rect = (np.abs(fx) < 0.34 - r) & (fy >= -0.12) & (fy < 0.5 - r)
        cap = (fy < -0.12) & (fx ** 2 + (fy + 0.12) ** 2 < (0.34 - r) ** 2)
        return rect | cap
    field = arch_in(0.0); core = arch_in(0.045); core2 = arch_in(0.085)
    dx = 0.5 - np.abs(fx); dia = (dx + np.abs(fy)) < 0.1; dia2 = (dx + np.abs(fy)) < 0.045
    line = (np.abs(fy) > 0.565); line2 = (np.abs(fy) > 0.52) & (np.abs(fy) < 0.545)
    rnd = np.random.RandomState(7).rand(n, n).astype('float32')
    nz = (rnd - 0.5) * 0.035
    cols = dict(g=rgb(D['carpetG']), gd=rgb(D['carpetD']), cr=rgb('#F2E6C6'), mu=rgb(C['mustard']), te=rgb(C['teal']), tt=rgb('#E9D9AE'), ind=rgb(C['indigo']))
    out = np.zeros((n, n, 3), 'float32')
    for k in range(3):
        ch = np.full((n, n), cols['g'][k]); ch = np.where(dia, cols['mu'][k], ch); ch = np.where(dia2, cols['gd'][k], ch)
        ch = np.where(field, cols['gd'][k], ch); ch = np.where(core, cols['cr'][k], ch); ch = np.where(core & ~core2, cols['tt'][k], ch)
        ch = np.where(core2, cols['cr'][k], ch)
        ch = np.where(line2, cols['cr'][k], ch); ch = np.where(line, cols['mu'][k], ch)
        out[:, :, k] = ch + nz
    return out
M.FLOORS['mcarpet'] = (mcarpet, 0.98, 6.0 * 9 / 9.16)

# ---- windows (arched style on top of the standard window) ----
_window_plain = M.FEATURES['window']
def f_window_arch(wall, f, sp):
    if f.get('style') != 'arch': return _window_plain(wall, f, sp)
    wbox, wpt = _wall(wall); u0 = f['at']; w = f['w']; z0 = f.get('z', 0.95); h = f.get('h', 1.9); u1 = u0 + w; zs = z0 + h - 0.866 * w
    wm = _wallmat(sp); sky = mat(C['sky'], 0.4, emit=('#BFE6FF', 1.15)); frm = mat(C['woodL'], 0.55); tr = mat(C['trim'], 0.8); gold = brass()
    wbox(u0, -T_ + 0.02, z0, w, 0.02, h, sky, 0, 'sky')
    arc = pointed(u0, u1, zs, 12); mid = (u0 + u1) / 2; top = z0 + h
    # the corners above the arch are wall again
    wpoly(wall, arc[:12] + [(u0, top)], -T_, 0.0, wm, None, 0.0)
    wpoly(wall, arc[11:] + [(u1, top)], -T_, 0.0, wm, None, 0.0)
    # a frame round the arch, a thin line outside it, glazing bars and a rosette
    d = 0.09; inner = [(u0 + d, z0)] + pointed(u0 + d, u1 - d, zs, 12) + [(u1 - d, z0)]; outer = [(u0, z0)] + arc + [(u1, z0)]
    wring(wall, outer, inner, -0.02, 0.07, frm, None, 0.012)
    out2 = [(u0 - 0.06, z0 - 0.05)] + pointed(u0 - 0.06, u1 + 0.06, zs, 12) + [(u1 + 0.06, z0 - 0.05)]
    wring(wall, out2, [(u0, z0 - 0.05)] + arc + [(u1, z0 - 0.05)], -0.02, 0.045, tr, None, 0.01)
    wbox(mid - 0.02, -0.01, z0, 0.04, 0.05, zs - z0 + 0.1, frm, 0.008); wbox(u0, -0.01, z0 + (zs - z0) * 0.5, w, 0.05, 0.04, frm, 0.008)
    wbox(u0 - 0.1, -0.03, z0 - 0.12, w + 0.2, 0.2, 0.07, tr, 0.02)
    # a rosette (eight spokes in a ring) in the head of the arch
    rc = wpt(mid, 0.02, zs + 0.42 * w * 0.9)
    for i in range(8):
        a = i * math.pi / 4; q0 = wpt(mid + math.cos(a) * 0.03, 0.02, zs + 0.42 * w * 0.9 + math.sin(a) * 0.03); q1 = wpt(mid + math.cos(a) * 0.15 * w, 0.02, zs + 0.42 * w * 0.9 + math.sin(a) * 0.15 * w)
        tube(q0, q1, 0.012, frm, caps=False)
    for i in range(36):
        a = i * math.pi / 18; b = (i + 1) * math.pi / 18; r = 0.15 * w
        tube(wpt(mid + math.cos(a) * r, 0.02, zs + 0.42 * w * 0.9 + math.sin(a) * r), wpt(mid + math.cos(b) * r, 0.02, zs + 0.42 * w * 0.9 + math.sin(b) * r), 0.012, frm)
M.FEATURES['window'] = f_window_arch

# ---- the frieze: a band of eight-pointed stars along the top of a wall ----
def f_frieze(wall, f, sp):
    wbox, wpt = _wall(wall); w, d = sp['size']; length = d if wall == 'R' else w; h = sp.get('h', M.WALL_H)
    z0 = f.get('z', h - 0.42); bh = f.get('hh', 0.26); pitch = bh
    m = uv_mat('frieze-%s' % f.get('pat', 'a'), lambda s: khatam(s, C['indigo'], C['mustard'], C['cream'], 1), 256, 0.9)
    wpoly(wall, [(0.0, z0), (length, z0), (length, z0 + bh), (0.0, z0 + bh)], 0.0, 0.025, m, 1.0 / pitch, 0.003)
    for zz in (z0 - 0.035, z0 + bh): wbox(0, -0.0, zz, length, 0.05, 0.035, brass(), 0.01)
M.FEATURES['frieze'] = f_frieze

# ---- a bracket with a standing lantern ----
def f_sconce(wall, f, sp):
    wbox, wpt = _wall(wall); u = f['at']; z = f.get('z', 1.6); wood = woodD()
    wbox(u - 0.11, 0, z - 0.04, 0.22, 0.2, 0.04, brass(), 0.012); wbox(u - 0.03, 0, z - 0.2, 0.06, 0.06, 0.18, brass(), 0.012)
    p = wpt(u, 0.12, z); lantern(p[0], p[1], p[2], 0.8)
M.FEATURES['sconce'] = f_sconce

# ---- the mihrab: a pointed niche with a patterned frame, a shell-fan head and a hanging lamp ----
def f_mihrab(wall, f, sp):
    wbox, wpt = _wall(wall); cx = f['at']; wi = f.get('w', 1.2); zs = f.get('zs', 1.3); h = sp.get('h', M.WALL_H)
    pat = uv_mat('mihrab-star', lambda s: khatam(s, C['indigo'], C['mustard'], C['cream'], 1), 256, 0.9)
    pat2 = uv_mat('mihrab-star2', lambda s: khatam(s, C['teal'], C['cream'], C['mustard'], 1), 256, 0.9)
    gold = brass(); cream = mat(C['trim'], 0.7); deep = mat('#277F7E', 0.8); deep2 = mat('#35958F', 0.7); lite = mat('#52B3AA', 0.7)
    pw = 0.26; tw = 0.07
    a_open = (cx - wi / 2, cx + wi / 2); a_trim = (a_open[0] - tw, a_open[1] + tw); a_pat = (a_trim[0] - pw, a_trim[1] + pw); a_out = (a_pat[0] - 0.05, a_pat[1] + 0.05)
    n = 14
    def loop(a, z_bot): return [(a[0], z_bot)] + pointed(a[0], a[1], zs, n) + [(a[1], z_bot)]
    # the niche floor and back
    wpoly(wall, [(a_open[0], 0.0)] + pointed(a_open[0], a_open[1], zs, n) + [(a_open[1], 0.0)], 0.0, 0.02, deep, None, 0.0)
    # fan of the head: triangles from a point at the spring line
    arc = pointed(a_open[0], a_open[1], zs, n); cpt = (cx, zs - 0.05)
    for i in range(len(arc) - 1):
        wpoly(wall, [cpt, arc[i], arc[i + 1]], 0.0, 0.03, [deep2, lite][i % 2], None, 0.0)
    # lower niche: three tall panels
    for i in range(3):
        x0 = a_open[0] + 0.08 + i * (wi - 0.16) / 3
        wpoly(wall, [(x0, 0.12), (x0 + (wi - 0.16) / 3 - 0.04, 0.12), (x0 + (wi - 0.16) / 3 - 0.04, zs - 0.05), (x0, zs - 0.05)], 0.0, 0.03, [deep2, deep, deep2][i], None, 0.0)
    wring(wall, loop(a_trim, 0.0), loop(a_open, 0.0), 0.0, 0.19, gold, None, 0.01)
    wring(wall, loop(a_pat, 0.0), loop(a_trim, 0.0), 0.0, 0.15, pat, 1 / 0.26, 0.0)
    wring(wall, loop(a_out, 0.0), loop(a_pat, 0.0), 0.0, 0.17, cream, None, 0.01)
    # a patterned arch inside the opening, forward of the back: an inner border
    # a step and a hanging lamp
    wbox(cx - 0.9, 0, 0.0, 1.8, 0.5, 0.07, mat('#C8A96A', 0.8), 0.02, 'step')
    sp0 = wpt(cx, 0.2, zs + 0.72); lamp_z = zs - 0.1
    p = wpt(cx, 0.22, lamp_z); lantern(p[0], p[1], p[2], 1.1)
    tube(wpt(cx, 0.22, zs + 0.78), wpt(cx, 0.22, lamp_z + 0.5), 0.008, gold)
    # columns each side of the frame
    for s in (a_out[0] - 0.12, a_out[1]):
        wbox(s, 0.0, 0.0, 0.12, 0.17, 1.15, mat(C['trim'], 0.7), 0.025); wbox(s - 0.015, 0.0, 1.15, 0.15, 0.2, 0.06, gold, 0.02); wbox(s - 0.015, 0.0, 0.0, 0.15, 0.2, 0.07, gold, 0.02)
M.FEATURES['mihrab'] = f_mihrab


# ======================================================================================================
# THE MASJID: kinds
# ======================================================================================================
BOOKC = [C['teal'], C['tealD'], C['cream'], C['mustard'], C['leafD'], C['indigo']]
def book_row(x0, x1, y, z, bw=0.062, bh=0.27, bd=0.22, seed=1, skip=()):
    """Books all of one size, spine out (toward +y), from x0 to x1."""
    i = 0; x = x0
    while x + bw <= x1:
        if i not in skip:
            c = BOOKC[(i * 5 + seed) % len(BOOKC)]
            bx(x + bw / 2, y, z, bw - 0.004, bd, bh, mat(c, 0.7), 0.008)
            bx(x + bw / 2, y - bd / 2 + 0.0 + 0.001, z + bh * 0.5 - 0.03, bw - 0.0, 0.004, 0.012, brass(), 0.0) if False else None
        x += bw; i += 1
def pat_mat(k='a', n=256): return uv_mat('uvpat-' + k, M.PATS[k], n, 0.8)

@kind('qshelf')
def k_qshelf(st):
    wl = woodL(); wm = woodM(); wd = woodD()
    for sx in (-0.58, 0.58):
        for sy in (-0.13, 0.13): cyl(sx, sy, 0, 0.035, 0.12, wd, 0.01, 16)
    bx(0, -0.19, 0.12, 1.26, 0.03, 1.06, wm, 0.01)
    for sx in (-0.62, 0.62): bx(sx, 0, 0.1, 0.05, 0.4, 1.1, wl, 0.015)
    for z in (0.1, 0.43, 0.76): bx(0, 0, z, 1.26, 0.4, 0.04, wl, 0.012)
    bx(0, 0, 1.1, 1.34, 0.44, 0.05, wd, 0.02)
    for i, z in enumerate((0.14, 0.47, 0.8)): book_row(-0.56, 0.56, -0.02, z, seed=i * 2, skip=(5,) if i == 1 else ())
    # a leaning book and a little lamp-less niche rail
    b = bx(0.32, -0.02, 0.47, 0.06, 0.22, 0.27, mat(C['terra'], 0.7), 0.008); b.rotation_euler = (0, math.radians(-14), 0)
    # carved side panels (a geometric pattern)
    for sx in (-0.648, 0.648): poly([(-0.17, 0.25), (0.17, 0.25), (0.17, 1.0), (-0.17, 1.0)], 'yz', sx, 0.012, pat_mat('d'), 0.004, 1 / 0.34)
    # two book stands on top, each with a closed book
    for sx in (-0.3, 0.3):
        for sgn in (-1, 1): 
            o = bx(0, 0, 0, 0.3, 0.012, 0.22, wm, 0.004); o.rotation_euler = (math.radians(sgn * 22), 0, 0); o.location = (sx, 0.01, 1.25)
        b = bx(0, 0, 0, 0.2, 0.05, 0.27, mat(C['indigo'], 0.6), 0.012); b.rotation_euler = (math.radians(-18), 0, 0); b.location = (sx, 0.0, 1.27)
        bx(sx, 0.0 + 0.012, 1.3, 0.1, 0.012, 0.1, mat(C['mustard'], 0.5), 0.003).rotation_euler = (math.radians(-18), 0, 0)

@kind('sadaqahbox')
def k_sadaqahbox(st):
    wm = woodM(); wl = woodL(); wd = woodD(); gold = brass(); teal = mat(C['teal'], 0.6)
    cyl(0, 0, 0, 0.21, 0.05, wd, 0.02, 32); lathe(0, 0, 0.04, [(0.001, 0), (0.1, 0), (0.07, 0.15), (0.05, 0.35), (0.06, 0.55), (0.09, 0.78), (0.001, 0.78)], wm, 24)
    cyl(0, 0, 0.8, 0.25, 0.05, wl, 0.02, 32)
    bx(0, 0, 0.85, 0.36, 0.36, 0.3, teal, 0.03)
    pm = pat_mat('a')
    poly([(-0.14, 0.9), (0.14, 0.9), (0.14, 1.12), (-0.14, 1.12)], 'xz', 0.181, 0.012, pm, 0.004, 1 / 0.28)
    poly([(-0.14, 0.9), (0.14, 0.9), (0.14, 1.12), (-0.14, 1.12)], 'yz', 0.181, 0.012, pm, 0.004, 1 / 0.28)
    bx(0, 0, 1.15, 0.42, 0.42, 0.05, gold, 0.02); bx(0, 0, 1.2, 0.3, 0.3, 0.03, gold, 0.02)
    bx(0, 0, 1.232, 0.2, 0.035, 0.012, mat(D['ink'], 0.8), 0.003)
    for (x, y, a) in [(0.09, 0.07, 0.5), (-0.06, -0.08, 1.4)]:
        c = cyl(x, y, 1.222, 0.04, 0.01, gold, 0.003, 20); c.rotation_euler = (0, 0, a)
    ball(0, 0, 1.28, 0.03, mat(C['mustard'], 0.4))

def tile_mat(): return uv_mat('tile-wudu', lambda s: weave(s, '#3AA7A0', '#F4EBD5', 4), 256, 0.35)
@kind('wudutap')
def k_wudutap(st):
    tm = tile_mat(); cream = mat('#F1E6CC', 0.4); teal = mat('#3AA7A0', 0.4); gold = brass(); wl = woodL()
    bx(0, -0.1, 0.0, 1.62, 0.46, 0.4, cream, 0.03); bx(0, -0.1, 0.0, 1.66, 0.5, 0.05, teal, 0.015)
    poly([(-0.8, -0.33), (0.8, -0.33), (0.8, 0.13), (-0.8, 0.13)], 'xy', 0.42, 0.018, tm, 0.006, 1 / 0.8)
    # the tiled back with two taps
    bx(0, -0.33, 0.0, 1.66, 0.1, 0.95, cream, 0.03); poly([(-0.78, 0.2), (0.78, 0.2), (0.78, 0.9), (-0.78, 0.9)], 'xz', -0.275, 0.014, tm, 0.005, 1 / 0.8)
    bx(0, -0.33, 0.95, 1.72, 0.14, 0.05, teal, 0.02)
    for sx in (-0.5, 0.5):
        tube((sx, -0.26, 0.66), (sx, -0.08, 0.66), 0.025, gold); tube((sx, -0.08, 0.66), (sx, -0.08, 0.58), 0.022, gold); ball(sx, -0.26, 0.74, 0.045, gold)
        tube((sx, -0.26, 0.74), (sx, -0.26, 0.66), 0.018, gold); cyl(sx, 0.02, 0.425, 0.12, 0.012, mat(D['ink'], 0.5), 0.004, 24)
    for sx in (-1.0, 1.0):
        cyl(sx, 0.18, 0.0, 0.17, 0.26, wl, 0.02, 24); cyl(sx, 0.18, 0.26, 0.18, 0.045, mat(C['teal'], 0.9), 0.02, 24)
    tube((-0.2, -0.26, 0.5), (0.2, -0.26, 0.5), 0.0001, gold) if False else None

@kind('mlantern')
def k_mlantern(st):
    gold = brass(); wd = woodD()
    lathe(0, 0, 0, [(0.001, 0), (0.22, 0), (0.24, 0.03), (0.17, 0.09), (0.05, 0.2), (0.001, 0.2)], gold)
    tube((0, 0, 0.15), (0, 0, 0.98), 0.028, gold, 0.02, caps=False)
    for z in (0.3, 0.6): torus(0, 0, z, 0.034, 0.012, gold, 1.0)
    lathe(0, 0, 0.95, [(0.001, 0), (0.2, 0), (0.22, 0.03), (0.001, 0.05)], gold)
    lantern(0, 0, 1.0, 1.2)

def wudu_tile(n):
    """Little square tiles, two colours like a chess board, a thin grout line round each (one picture = 2 x 2 tiles)."""
    u, v = M._grid(n); cells = 2; fx = (u * cells) % 1; fy = (v * cells) % 1
    chk = ((np.floor(u * cells) + np.floor(v * cells)) % 2 == 0); e = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    a, b, g = np.array(rgb('#A3D8CD')), np.array(rgb('#F6EEDA')), np.array(rgb('#7FBDB3'))
    out = np.zeros((n, n, 3), 'float32')
    for k in range(3): out[:, :, k] = np.where(e < 0.035, g[k], np.where(chk, a[k], b[k])) + np.clip(e * 7, 0, 1) * 0.02
    return out
@kind('wudutiles')
def k_wudutiles(st):
    """A small tiled area on the floor for the wudu tap and the places to stand beside it, so the tap is not on the prayer carpet
    (a flat fixed picture, 2.8 x 1.5: tiles and a teal border)."""
    bx(0, 0, 0.0, 2.8, 1.5, 0.03, mat('#3AA7A0', 0.5), 0.012, 'wtile-edge')
    top = box(-1.31, -0.66, 0.0, 2.62, 1.32, 0.036, None, 0.006, 'wtile')
    top.data.materials.append(tex_mat('wudu-tiles', wudu_tile, 256, 0.35, repeat=(2.62 / 0.64, 1.32 / 0.64)))

@kind('minbar')
def k_minbar(st):
    wl = woodL(); wm = woodM(); wd = woodD(); gold = brass(); teal = mat(C['teal'], 0.6)
    pm = pat_mat('b')
    # steps climbing toward the wall (-y): five of 0.3 m
    for i in range(5):
        y0 = 0.95 - 0.3 * (i + 1); top = 0.2 * (i + 1)
        bx(0, y0 + 0.15, 0.0, 0.76, 0.3, top, wm if i % 2 == 0 else wl, 0.02)
        bx(0, y0 + 0.15, top, 0.82, 0.32, 0.03, wd, 0.015)
    bx(0, -0.55, 0.0, 0.76, 0.8, 1.0, wm, 0.025); bx(0, -0.55, 1.0, 0.82, 0.84, 0.035, wd, 0.02)
    # carpet on the platform
    bx(0, -0.5, 1.035, 0.5, 0.5, 0.012, mat(C['terra'], 0.95), 0.005)
    # side panels with a sloping handrail
    prof = [(0.95, 0.0), (0.95, 0.5), (-0.15, 1.45), (-0.95, 1.45), (-0.95, 0.0)]
    for sx in (-0.39, 0.39):
        poly(prof, 'yz', sx, 0.06, wl, 0.02)
        poly([(0.78, 0.55), (-0.1, 1.28), (-0.85, 1.28), (-0.85, 0.2), (0.78, 0.2)], 'yz', sx + (0.036 if sx > 0 else -0.036), 0.012, pm, 0.004, 1 / 0.3)
    tube((0.95, -0.39, 0.55), (-0.15, -0.39, 1.47), 0.03, wd); tube((0.95, 0.39, 0.55), (-0.15, 0.39, 1.47), 0.03, wd)
    tube((-0.15, -0.39, 1.47), (-0.95, -0.39, 1.47), 0.03, wd); tube((-0.15, 0.39, 1.47), (-0.95, 0.39, 1.47), 0.03, wd)
    for sx in (-0.39, 0.39): ball(sx, 0.95, 0.55, 0.045, gold)
    # a back with an arched head, a canopy on two posts and a dome
    poly([(-0.36, 1.03)] + [(0.36 * math.cos(math.radians(a)), 1.03 + 0.86 + 0.36 * math.sin(math.radians(a))) for a in range(0, 181, 12)][::-1] + [(0.36, 1.03)], 'xz', -0.9, 0.05, pat_mat('c'), 0.015, 1 / 0.4) if False else None
    bx(0, -0.9, 1.03, 0.76, 0.05, 1.05, wl, 0.02); poly([(-0.34, 1.1), (0.34, 1.1), (0.34, 1.9), (-0.34, 1.9)], 'xz', -0.872, 0.012, pat_mat('c'), 0.004, 1 / 0.4)
    for sx in (-0.37, 0.37):
        cyl(sx, -0.12, 1.03, 0.04, 1.15, wd, 0.01, 16); ball(sx, -0.12, 2.2, 0.05, gold)
    bx(0, -0.5, 2.16, 0.92, 0.9, 0.06, wd, 0.02); bx(0, -0.5, 2.2, 0.86, 0.84, 0.03, teal, 0.015)
    lathe(0, -0.5, 2.23, [(0.001, 0), (0.4, 0), (0.43, 0.05), (0.34, 0.2), (0.16, 0.42), (0.04, 0.58), (0.001, 0.62)], mat(C['tealD'], 0.5), 8)
    ball(0, -0.5, 2.9, 0.045, gold, 1, 1, 1.3)


# ======================================================================================================
# THE SHOP: floor, wall features and kinds
# ======================================================================================================
def shoptile(n):
    u, v = M._grid(n); cells = 6; fx = (u * cells) % 1; fy = (v * cells) % 1
    chk = ((np.floor(u * cells) + np.floor(v * cells)) % 2 == 0); e = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy)); gap = e < 0.03
    a, b, g = np.array(rgb('#E9B98A')), np.array(rgb('#F6E6C6')), np.array(rgb('#CBA37A'))
    tone = np.floor(u * cells) * 7 + np.floor(v * cells) * 13; var = (np.sin(tone * 12.9898) * 0.5 + 0.5) * 0.04 - 0.02
    # a small diamond in every light tile
    dia = (np.abs(fx - 0.5) + np.abs(fy - 0.5)) < 0.14
    out = np.zeros((n, n, 3), 'float32')
    for k in range(3):
        ch = np.where(chk, a[k], b[k]) + var + np.clip(e * 8, 0, 1) * 0.025
        ch = np.where(dia & ~chk, _lerp(b[k], a[k], 0.55), ch)
        out[:, :, k] = np.where(gap, g[k], ch)
    return out
M.FLOORS['shoptile'] = (shoptile, 0.45, 3.0)

def f_awning(wall, f, sp):
    """A striped valance along the top of a wall, scalloped at the bottom (plain stripes, no writing)."""
    wbox, wpt = _wall(wall); w, d = sp['size']; length = d if wall == 'R' else w; h = sp.get('h', M.WALL_H)
    u0 = f.get('at', 0.0); u1 = f.get('to', length); zt = f.get('z', h - 0.02); drop = f.get('drop', 0.38); sw = 0.3
    n = int(round((u1 - u0) / sw)); sw = (u1 - u0) / n
    cols = [mat(f.get('c1', C['terra']), 0.9, sheen=0.4), mat(f.get('c2', C['cream']), 0.9, sheen=0.4)]
    for i in range(n):
        a = u0 + i * sw; pts = [(a, zt), (a + sw, zt)]
        for k in range(9): ang = math.pi * k / 8; pts.append((a + sw - sw / 2 * (1 - math.cos(ang)), zt - drop + 0.0 - 0.12 * math.sin(ang) * 0 - (0.0)))
        pts = [(a, zt), (a + sw, zt), (a + sw, zt - drop + sw / 2 * 0.0)] + [(a + sw / 2 + sw / 2 * math.cos(math.radians(t)), zt - drop - sw / 2 * 0.55 * math.sin(math.radians(t))) for t in range(0, 181, 20)] + [(a, zt - drop)]
        wpoly(wall, pts, 0.0, 0.2 - 0.0, cols[i % 2], None, 0.012)
    wbox(u0, 0.0, zt, u1 - u0, 0.24, 0.04, mat(C['woodD'], 0.6), 0.012)
M.FEATURES['awning'] = f_awning

def f_hbasket(wall, f, sp):
    """A hanging basket with trailing leaves and a few flowers on a wall bracket."""
    wbox, wpt = _wall(wall); u = f['at']; z = f.get('z', 1.75); wd = mat('#B98446', 0.8); wv = mat('#D9A864', 0.8)
    wbox(u - 0.03, 0, z + 0.12, 0.06, 0.34, 0.04, woodD(), 0.01); wbox(u - 0.03, 0, z - 0.1, 0.06, 0.04, 0.26, woodD(), 0.01)
    p = wpt(u, 0.3, z - 0.02)
    lathe(p[0], p[1], p[2] - 0.2, [(0.001, 0), (0.08, 0), (0.17, 0.12), (0.2, 0.2), (0.001, 0.2)], wv)
    torus(p[0], p[1], p[2] - 0.02, 0.2, 0.014, wd, 1.0, (0, 0, 0), 32, 8)
    for a in range(3): tube(wpt(u, 0.0 + 0.0, z + 0.12) if False else (p[0], p[1], p[2] + 0.15), (p[0] + math.cos(a * 2.1) * 0.19, p[1] + math.sin(a * 2.1) * 0.19, p[2] - 0.02), 0.006, mat(C['woodD'], 0.7), caps=False)
    ball(p[0], p[1], p[2] + 0.02, 0.17, mat(C['leaf'], 0.6), 1, 1, 0.55)
    for i, (ang, c) in enumerate([(0.3, D['coral']), (1.7, C['mustard']), (3.0, D['pink']), (4.4, D['coral']), (5.4, C['mustard'])]):
        ball(p[0] + math.cos(ang) * 0.1, p[1] + math.sin(ang) * 0.1, p[2] + 0.1, 0.045, mat(c, 0.5))
    for i in range(3):
        ang = i * 2.1 + 0.5; tube((p[0] + math.cos(ang) * 0.16, p[1] + math.sin(ang) * 0.16, p[2] - 0.05), (p[0] + math.cos(ang) * 0.22, p[1] + math.sin(ang) * 0.22, p[2] - 0.3), 0.012, mat(C['leaf'], 0.6))
        ball(p[0] + math.cos(ang) * 0.22, p[1] + math.sin(ang) * 0.22, p[2] - 0.3, 0.05, mat(C['leafD'], 0.6), 1, 1, 0.6)
M.FEATURES['hbasket'] = f_hbasket

# ---- shelf goods (all plain, no writing): jars, tins, boxes, bottles ----
GOODC = [C['terra'], C['teal'], C['mustard'], C['sage'], C['indigo'], C['rose'], C['cream'], '#E58C63', '#7FB5C8']
def g_jar(x, y, z, rnd):
    h = rnd.uniform(0.17, 0.27); r = rnd.uniform(0.045, 0.065); col = rnd.choice(['#D9A441', '#C9593A', '#7FA85A', '#8A4B2F', '#E58C63', '#B8D06A'])
    lathe(x, y, z, [(0.001, 0), (r, 0), (r * 1.05, 0.02), (r * 1.05, h - 0.03), (r * 0.8, h - 0.015), (0.001, h - 0.015)], mat(col, 0.3))
    cyl(x, y, z + h - 0.02, r * 0.86, 0.035, mat(rnd.choice([C['cream'], C['terra'], C['teal'], C['woodD']]), 0.5), 0.008, 20)
    return 2 * r * 1.05
def g_tin(x, y, z, rnd):
    h = rnd.uniform(0.12, 0.26); r = rnd.uniform(0.05, 0.075); col = rnd.choice(GOODC)
    cyl(x, y, z, r, h, mat(col, 0.45, 0.2), 0.008, 24); cyl(x, y, z + h * 0.42, r * 1.01, h * 0.2, mat(C['cream'], 0.5), 0.003, 24); cyl(x, y, z + h, r * 0.96, 0.012, mat(C['steel'] if 'steel' in C else '#C8D3D8', 0.3, 0.7), 0.003, 24)
    return 2 * r
def g_box(x, y, z, rnd):
    w = rnd.uniform(0.09, 0.15); h = rnd.uniform(0.15, 0.3); d = rnd.uniform(0.1, 0.16); col = rnd.choice(GOODC)
    bx(x, y, z, w, d, h, mat(col, 0.75), 0.008)
    bx(x, y - d / 2 - 0.0005, z + h * 0.3, w * 0.7, 0.004, h * 0.4, mat(C['cream'], 0.7), 0.001)
    bx(x, y - d / 2 - 0.001, z + h * 0.45, w * 0.28, 0.004, h * 0.15, mat(rnd.choice([C['terra'], C['tealD'], C['indigo']]), 0.6), 0.001)
    return w
def g_bottle(x, y, z, rnd):
    r = rnd.uniform(0.035, 0.05); h = rnd.uniform(0.26, 0.33); col = rnd.choice(['#6FA8DC', '#58A878', '#E0A340', '#B86A4A'])
    lathe(x, y, z, [(0.001, 0), (r, 0), (r * 1.05, 0.02), (r * 1.05, h * 0.55), (r * 0.5, h * 0.72), (r * 0.42, h * 0.95), (r * 0.5, h), (0.001, h)], mat(col, 0.25))
    bx(x, y, z + h * 0.18, r * 1.9, r * 1.9, h * 0.25, mat(C['cream'], 0.6), 0.004) if False else None
    return 2 * r * 1.05
GOODS = [g_jar, g_jar, g_tin, g_tin, g_box, g_box, g_bottle]
def goods_row(x0, x1, y, z, seed, gap=0.025, fns=None):
    rnd = random.Random(seed); x = x0
    while x < x1 - 0.1:
        fn = rnd.choice(fns or GOODS)
        # measure by building at x + a guess, then shift
        before = set(bpy.data.objects); w = fn(x + 0.06, y, z, rnd)
        made = [o for o in bpy.data.objects if o not in before]
        for o in made: o.location.x += (w / 2 - 0.06)
        x += w + gap
def _goodshelf_frame(x0, x1, z0, y):
    pass

def f_goodshelf(wall, f, sp):
    """Two or three wall shelves stacked with jars, tins and boxes."""
    wbox, wpt = _wall(wall); u0 = f['at']; wd = f.get('w', 1.8); z = f.get('z', 1.3); rows = f.get('rows', 2); seed = f.get('seed', 1)
    for r in range(rows):
        zz = z + r * 0.42
        wbox(u0, 0, zz, wd, 0.2, 0.04, woodL(), 0.012)
        for u in (u0 + 0.1, u0 + wd - 0.1): wbox(u - 0.02, 0, zz - 0.14, 0.04, 0.16, 0.14, woodD(), 0.01)
        before = set(bpy.data.objects); goods_row(0.0, wd - 0.1, 0.0, zz + 0.04, seed + r * 7, 0.025, [g_jar, g_jar, g_jar, g_bottle, g_tin] if f.get('jars') else None)
        made = [o for o in bpy.data.objects if o not in before]
        g = kit.group([o for o in made if o.parent is None], 'goods')
        if wall == 'L': g.location = (u0 + 0.05, 0.11, 0)
        else: g.location = (0.11, u0 + wd - 0.05, 0); g.rotation_euler = (0, 0, -math.pi / 2)
M.FEATURES['goodshelf'] = f_goodshelf

def f_ssign(wall, f, sp):
    """A hanging shop board with a loaf and a wheat ear painted on it (a picture, no writing)."""
    wbox, wpt = _wall(wall); u = f['at']; z = f.get('z', 1.9); w_ = f.get('w', 0.9); h_ = 0.5
    gold = brass()
    wpoly(wall, rrect(u + w_ / 2, z + h_ / 2, w_, h_, 0.08), 0.02, 0.07, mat(C['woodD'], 0.6), None, 0.012)
    wpoly(wall, rrect(u + w_ / 2, z + h_ / 2, w_ - 0.1, h_ - 0.1, 0.06), 0.07, 0.085, mat(f.get('col', '#F3E2B8'), 0.8), None, 0.004)
    # a loaf (a brown oval with three slits)
    cx = u + w_ / 2; cz = z + h_ / 2
    wpoly(wall, circ(cx, cz, 0.16, 28, 0.2, 0.11), 0.085, 0.1, mat('#C9843A', 0.7), None, 0.01)
    for k in (-1, 0, 1): wpoly(wall, rotpts([(-0.012, -0.05), (0.012, -0.05), (0.012, 0.05), (-0.012, 0.05)], math.radians(-35), 0, 0, cx + k * 0.07, cz), 0.1, 0.108, mat('#8A5A2B', 0.7), None, 0.002)
    for s in (-1, 1): tube(wpt(u + w_ / 2 + s * w_ * 0.38, 0.03, z + h_), wpt(u + w_ / 2 + s * w_ * 0.38, 0.03, z + h_ + 0.25), 0.008, gold)
M.FEATURES['ssign'] = f_ssign

def f_pennants(wall, f, sp):
    """A string of plain triangular flags (no writing) hung across a wall."""
    wbox, wpt = _wall(wall); w, d = sp['size']; length = d if wall == 'R' else w; u0 = f.get('at', 0.2); u1 = f.get('to', length - 0.2); z = f.get('z', 2.2); sag = f.get('sag', 0.25)
    cols = [C['terra'], C['mustard'], C['teal'], C['cream'], C['sage'], D['pink']]
    n = int((u1 - u0) / 0.34); pts = [(u0 + (u1 - u0) * i / 60, z - sag * 4 * (i / 60) * (1 - i / 60)) for i in range(61)]
    for a, c in zip(pts, pts[1:]): tube(wpt(a[0], 0.05, a[1]), wpt(c[0], 0.05, c[1]), 0.008, mat(C['woodD'], 0.7), caps=False)
    for i in range(n):
        t = (i + 0.5) / n; uu = u0 + (u1 - u0) * t; zz = z - sag * 4 * t * (1 - t)
        wpoly(wall, [(uu - 0.12, zz), (uu + 0.12, zz), (uu, zz - 0.28)], 0.03, 0.045, mat(cols[i % len(cols)], 0.9, sheen=0.4), None, 0.006)
M.FEATURES['pennants'] = f_pennants

# ---- shop kinds ----
def woven_basket(x, y, z, r=0.2, h=0.17, col='#D9A864'):
    wv = mat(col, 0.8); wd = mat('#B98446', 0.8)
    lathe(x, y, z, [(0.001, 0), (r * 0.75, 0), (r * 0.82, 0.02), (r, h), (r * 1.02, h + 0.015), (r * 0.96, h + 0.02), (0.001, h)], wv)
    for k in range(3): torus(x, y, z + h * (0.25 + 0.3 * k), r * (0.8 + 0.2 * (0.25 + 0.3 * k)), 0.009, wd, 1.0, (0, 0, 0), 28, 6)
    torus(x, y, z + h + 0.012, r * 1.0, 0.016, wd, 1.0, (0, 0, 0), 28, 8)
def loaf(x, y, z, s=1.0, rot=0.0):
    g = [ball(0, 0, 0.0, 0.1 * s, mat('#D69A4A', 0.6), 1.55, 0.9, 0.78)]
    for k in (-1, 0, 1):
        sl = bx(k * 0.06 * s, 0, 0.065 * s, 0.014 * s, 0.07 * s, 0.012 * s, mat('#9C6228', 0.6), 0.003); sl.rotation_euler = (0, 0, 0.5); g.append(sl)
    return put(g, x, y, z + 0.07 * s, rot)
def flatbread(x, y, z, r=0.13, n=1):
    for i in range(n): cyl(x, y, z + i * 0.022, r, 0.02, mat('#E3B068' if i % 2 else '#EBC283', 0.7), 0.008, 28)
def baguette(x, y, z, rot=0.0, L=0.42):
    o = lathe(0, 0, 0, [(0.001, 0), (0.035, 0.02), (0.045, L * 0.5), (0.035, L * 0.97), (0.001, L)], mat('#D9A050', 0.6), 16); o.rotation_euler = (0, math.radians(90), 0)
    return put([o], x, y, z + 0.05, rot)
def crate_box(x, y, z, w=0.9, d=0.6, h=0.26, col=None):
    wl = mat(col or C['woodL'], 0.65); wd = woodD()
    bx(x, y, z, w, d, 0.03, wd, 0.008)
    for sy in (-1, 1):
        for i in range(2): bx(x, y + sy * (d / 2 - 0.012), z + 0.03 + i * 0.12, w, 0.024, 0.1, wl, 0.008)
    for sx in (-1, 1):
        for i in range(2): bx(x + sx * (w / 2 - 0.012), y, z + 0.03 + i * 0.12, 0.024, d - 0.04, 0.1, wl, 0.008)
    for sx in (-1, 1): bx(x + sx * (w / 2 - 0.03), y, z, 0.06, d + 0.01, h, wd, 0.01)
def coin(x, y, z, r=0.04, rot=0.0):
    c = cyl(x, y, z, r, 0.008, brass(), 0.002, 20); c.rotation_euler = (0, 0, rot); return c

@kind('till')
def k_till(st):
    wl = woodL(); wd = woodD(); terra = mat(D['brickc'], 0.7); cream = mat(C['cream'], 0.7); gold = brass()
    bx(0, 0, 0.0, 1.78, 0.62, 0.08, wd, 0.01); bx(0, 0, 0.08, 1.74, 0.66, 0.78, terra, 0.03)
    for i in range(3):
        x = -0.58 + i * 0.58; poly([(x - 0.24, 0.16), (x + 0.24, 0.16), (x + 0.24, 0.7), (x - 0.24, 0.7)], 'xz', 0.331, 0.014, mat(C['cream'], 0.7), 0.01)
        poly([(x - 0.2, 0.2), (x + 0.2, 0.2), (x + 0.2, 0.66), (x - 0.2, 0.66)], 'xz', 0.34, 0.012, pat_mat('a' if i != 1 else 'c'), 0.006, 1 / 0.4)
    bx(0, 0, 0.86, 1.86, 0.74, 0.05, wl, 0.02)
    # a balance scale at the left, a cash drawer at the right, a basket of oranges, a paper bag
    sx = -0.55
    cyl(sx, 0.0, 0.91, 0.1, 0.03, gold, 0.01, 28); tube((sx, 0, 0.93), (sx, 0, 1.28), 0.016, gold); tube((sx - 0.3, 0, 1.28), (sx + 0.3, 0, 1.28), 0.014, gold)
    ball(sx, 0, 1.3, 0.03, gold)
    for s in (-1, 1):
        px = sx + s * 0.28
        for k in (-1, 1): tube((px, 0, 1.27), (px + k * 0.1, 0.0, 1.02), 0.004, gold, caps=False)
        lathe(px, 0, 0.96, [(0.001, 0), (0.12, 0.03), (0.13, 0.05), (0.11, 0.045), (0.001, 0.01)], gold)
    ball(sx - 0.28, 0, 1.03, 0.045, mat('#E8832F', 0.4)); ball(sx + 0.28, 0, 1.0, 0.035, mat(C['woodD'], 0.5), 1, 1, 0.7)
    dx = 0.42
    bx(dx, 0.0, 0.91, 0.38, 0.3, 0.14, mat('#3E4A55', 0.5), 0.03); bx(dx, 0.0, 1.05, 0.4, 0.32, 0.02, gold, 0.01)
    bx(dx, -0.17, 0.93, 0.34, 0.06, 0.08, mat(C['cream'], 0.6), 0.015)           # the drawer, pulled out a little at the back
    for i in range(3): coin(dx - 0.09 + i * 0.09, -0.19, 1.01, 0.03)
    bx(dx, 0.155, 0.95, 0.3, 0.012, 0.07, gold, 0.004); ball(dx, 0.17, 0.985, 0.016, gold)
    woven_basket(0.78, 0.05, 0.91, 0.15, 0.1)
    for (x, y, c) in [(0.74, 0.04, '#E8832F'), (0.82, 0.07, '#E8832F'), (0.78, 0.0, '#F0B43C')]: ball(x, y, 1.03, 0.045, mat(c, 0.4))
    bg = bx(0.12, 0.17, 0.91, 0.14, 0.1, 0.2, mat(D['kraft'], 0.9), 0.025)
    bx(-0.1, 0.22, 0.91, 0.12, 0.09, 0.17, mat(C['cream'], 0.9), 0.025)

@kind('bakery')
def k_bakery(st):
    wl = woodL(); wd = woodD(); teal = mat(C['teal'], 0.65); tealD = mat(C['tealD'], 0.65); cream = mat(C['cream'], 0.7)
    bx(0, 0, 0.0, 1.78, 0.62, 0.08, wd, 0.01); bx(0, 0, 0.08, 1.74, 0.66, 0.74, teal, 0.03)
    for i in range(4):
        x = -0.66 + i * 0.44; poly([(x - 0.18, 0.18), (x + 0.18, 0.18), (x + 0.18, 0.7), (x - 0.18, 0.7)], 'xz', 0.331, 0.012, tealD, 0.01)
        ball(x + 0.12, 0.345, 0.45, 0.02, brass())
    bx(0, 0, 0.82, 1.86, 0.74, 0.05, wl, 0.02)
    runner = uv_mat('bak-runner', lambda s: weave(s, C['terra'], C['cream'], 12), 256, 0.9)
    poly([(-0.86, -0.3), (0.86, -0.3), (0.86, 0.3), (-0.86, 0.3)], 'xy', 0.874, 0.006, runner, 0.002, 1 / 1.2)
    # a raised tray at the back with flat breads
    bx(0, -0.2, 0.88, 1.7, 0.3, 0.02, wd, 0.008)
    for sx in (-0.78, 0.78): bx(sx, -0.2, 0.88, 0.05, 0.3, 0.32, wd, 0.01)
    bx(0, -0.2, 1.2, 1.7, 0.32, 0.03, wl, 0.01)
    for i, x in enumerate((-0.55, -0.1, 0.4)): flatbread(x, -0.2, 0.905, 0.16, 3 if i != 1 else 4)
    for i, x in enumerate((-0.58, -0.2)): flatbread(x, -0.2, 1.235, 0.14, 2 + i)
    for k in range(3): baguette(0.15 + k * 0.0, -0.28 + k * 0.1, 1.235 + 0.0, 0.0)
    # baskets with loaves, a stand with rolls, a round cake with a plain ribbon
    woven_basket(-0.55, 0.12, 0.875, 0.22, 0.14); loaf(-0.6, 0.1, 0.99, 1.0, 0.3); loaf(-0.48, 0.15, 1.0, 0.9, -0.4)
    woven_basket(-0.05, 0.14, 0.875, 0.2, 0.13)
    for k in range(3): baguette(-0.1 + k * 0.02, 0.1 + k * 0.045, 1.02 + k * 0.0, 0.2 - k * 0.1)
    cyl(0.5, 0.12, 0.875, 0.16, 0.03, cream, 0.01, 32); cyl(0.5, 0.12, 0.9, 0.04, 0.12, cream, 0.01, 16); cyl(0.5, 0.12, 1.02, 0.17, 0.02, cream, 0.01, 32)
    for k in range(5):
        a = k * 1.25; loaf(0.5 + math.cos(a) * 0.08, 0.12 + math.sin(a) * 0.07, 1.02 + 0.0, 0.5, a)
    cyl(0.5, 0.12, 0.955, 0.1, 0.0, cream, 0, 8) if False else None
    ball(0.82, 0.14, 0.97, 0.07, mat('#E8B864', 0.5), 1.3, 1.0, 0.7)
    for k in range(3): ball(0.78 + k * 0.05, 0.22 - k * 0.03, 0.93, 0.035, mat('#C9843A', 0.6))

@kind('oven')
def k_oven(st):
    br = mat(D['brickc'], 0.85); brD = mat(D['brickD'], 0.85); brL = mat(D['brickL'], 0.85); stone = mat('#D9C8A6', 0.8); dk = mat('#2A1F1A', 0.9); wd = woodD()
    bm = uv_mat('bricks', lambda n: _bricks(n), 256, 0.9)
    bx(0, 0.0, 0.0, 1.3, 0.9, 0.12, stone, 0.02)
    bx(0, 0.0, 0.12, 1.2, 0.84, 0.62, br, 0.04)
    poly([(-0.58, 0.14), (0.58, 0.14), (0.58, 0.72), (-0.58, 0.72)], 'xz', 0.425, 0.012, bm, 0.004, 1 / 0.5)
    poly([(-0.4, 0.14), (0.4, 0.14), (0.4, 0.72), (-0.4, 0.72)], 'yz', 0.605, 0.012, bm, 0.004, 1 / 0.5) if False else None
    poly([(-0.37, 0.16), (0.36, 0.16), (0.36, 0.72), (-0.37, 0.72)], 'yz', 0.606, 0.012, bm, 0.004, 1 / 0.5) if False else None
    lathe(0, 0.0, 0.74, [(0.001, 0), (0.6, 0), (0.62, 0.04), (0.55, 0.3), (0.42, 0.5), (0.2, 0.66), (0.001, 0.72)], brL, 40)
    for z, r in [(0.02, 0.62), (0.2, 0.585), (0.38, 0.48)]: torus(0, 0.0, 0.74 + z + 0.02, r, 0.016, brD, 0.8, (0, 0, 0), 40, 8)
    # the mouth: a stone arch round a dark opening with a glowing fire
    arc = round_arch(-0.26, 0.26, 0.42, 14); mouth = [(-0.26, 0.14)] + arc + [(0.26, 0.14)]
    poly(mouth, 'xz', 0.43, 0.02, dk, 0.004)
    gl = [(-0.2, 0.14)] + round_arch(-0.2, 0.2, 0.4, 12) + [(0.2, 0.14)]
    poly(gl, 'xz', 0.445, 0.01, mat('#FF9A3C', 0.5, emit=('#FF8A2A', 3.0)), 0.0)
    poly([(-0.14, 0.14)] + round_arch(-0.14, 0.14, 0.32, 10) + [(0.14, 0.14)], 'xz', 0.452, 0.006, mat('#FFD27A', 0.5, emit=('#FFC260', 4.0)), 0.0)
    ring_strip([(-0.26, 0.14)] + arc + [(0.26, 0.14)], [(-0.19, 0.14)] + round_arch(-0.19, 0.19, 0.42, 14) + [(0.19, 0.14)], 'xz', 0.4, 0.46, stone, None, 0.0) if False else None
    for s in (-1, 1): bx(s * 0.31, 0.46, 0.12, 0.1, 0.06, 0.5, stone, 0.02)
    bx(0, 0.46, 0.62, 0.72, 0.06, 0.1, stone, 0.02)
    bx(0, 0.45, 0.0, 0.7, 0.1, 0.13, stone, 0.02)
    # a chimney up the wall
    cyl(0, -0.1, 1.4, 0.14, 1.2, brD, 0.02, 24); cyl(0, -0.1, 1.38, 0.18, 0.06, stone, 0.01, 24)
    # a stack of logs and a long peel
    for r_, (x, z) in enumerate([(0.0, 0.0), (0.13, 0.0), (0.26, 0.0), (0.065, 0.1), (0.195, 0.1), (0.13, 0.2)]):
        c = cyl(0, 0, 0, 0.065, 0.3, mat(C['wood'], 0.8), 0.01, 16); c.rotation_euler = (math.pi / 2, 0, 0); c.location = (-0.9 + x, 0.2, 0.08 + z)
        e = cyl(0, 0, 0, 0.05, 0.005, mat('#E3C38E', 0.8), 0.002, 16); e.rotation_euler = (math.pi / 2, 0, 0); e.location = (-0.9 + x, 0.36, 0.08 + z)
    tube((0.78, 0.28, 0.1), (0.78, 0.2, 1.4), 0.018, wd); cyl(0.78, 0.3, 0.07, 0.11, 0.015, wd, 0.005, 24)

def _bricks(n):
    u, v = M._grid(n); rows = 8; r = np.floor(v * rows); uu = (u * 4 + (r % 2) * 0.5) % 1.0
    fx = uu; fy = (v * rows) % 1
    gap = (fy < 0.09) | (fy > 0.97) | (fx < 0.04) | (fx > 0.97)
    rnd = np.sin((r * 12.9898 + np.floor(u * 4 + (r % 2) * 0.5) * 78.233) * 43.7) * 0.5 + 0.5
    a, b, g = np.array(rgb(D['brickc'])), np.array(rgb(D['brickL'])), np.array(rgb('#E7D3B0'))
    out = np.zeros((n, n, 3), 'float32')
    for k in range(3):
        out[:, :, k] = np.where(gap, g[k], a[k] + (b[k] - a[k]) * rnd * 0.7)
    return out

@kind('shopshelf')
def k_shopshelf(st):
    wl = woodL(); wm = woodM(); wd = woodD()
    bx(0, -0.19, 0.0, 1.3, 0.03, 1.95, wm, 0.01)
    for sx in (-0.63, 0.63): bx(sx, 0, 0.0, 0.07, 0.42, 1.95, wl, 0.02)
    zs = [0.08, 0.5, 0.92, 1.34, 1.76]
    for z in zs: bx(0, 0, z, 1.3, 0.42, 0.045, wl, 0.012)
    bx(0, 0, 1.95, 1.4, 0.46, 0.05, wd, 0.02)
    for i, z in enumerate(zs[:-1]):
        before = set(bpy.data.objects); goods_row(0.0, 1.14, 0.0, z + 0.045, 11 + i * 5)
        made = [o for o in bpy.data.objects if o not in before]; kit.group([o for o in made if o.parent is None], 'goods').location = (-0.57, 0.0, 0)
    # a striped cloth hanging from the top
    for i in range(10):
        bx(-0.585 + i * 0.13, 0.215, 1.8, 0.11, 0.012, 0.13, mat(C['terra'] if i % 2 == 0 else C['cream'], 0.9), 0.004)

@kind('crate')
def k_crate(st):
    crate_box(-0.0, 0.0, 0.0, 1.0, 0.7, 0.26); crate_box(-0.22, -0.0, 0.26, 0.5, 0.6, 0.26, '#C28F5A')
    rnd = random.Random(5)
    for (x, y, c, r) in [(-0.3, -0.22, '#D8453A', 0.06), (-0.14, -0.2, '#D8453A', 0.06), (-0.22, -0.05, '#E0503C', 0.06), (-0.3, 0.1, '#D8453A', 0.06), (-0.14, 0.12, '#E8523F', 0.06), (-0.22, 0.24, '#D8453A', 0.06), (-0.4, 0.03, '#E0503C', 0.06), (-0.05, -0.04, '#D8453A', 0.06)]:
        ball(x, y, 0.55, r, mat(c, 0.35))
    for (x, y) in [(0.14, -0.22), (0.3, -0.18), (0.42, -0.05), (0.22, 0.0), (0.36, 0.1), (0.15, 0.2), (0.32, 0.26)]:
        ball(x, y, 0.3, 0.07, mat('#F0A030', 0.4))
    for (x, y) in [(0.1, -0.12), (0.26, 0.12), (0.4, -0.2)]: ball(x, y, 0.37, 0.065, mat('#E9C94A', 0.4), 1.3, 0.9, 0.9)
    for (x, y) in [(0.18, -0.02), (0.34, 0.02)]: ball(x, y, 0.4, 0.07, mat('#9CC95A', 0.4), 0.9, 0.9, 1.2)
    for a in (0.2, 2.5, 4.4): ball(-0.2 + math.cos(a) * 0.05, 0.05 + math.sin(a) * 0.05, 0.64, 0.045, mat(C['leaf'], 0.5), 1, 1, 0.6)

@kind('seedsack')
def k_seedsack(st):
    sack = mat('#C9A56B', 0.95); sackD = mat('#A88450', 0.95); cols = ['#E0B15A', '#8A5A33', '#C9923F', '#F0DBA0', '#B8D06A', '#C9593A']
    def one(x, y, seedc, h, rot):
        parts = [lathe(0, 0, 0, [(0.001, 0), (0.2, 0), (0.24, 0.08), (0.25, h * 0.6), (0.22, h), (0.001, h)], sack)]
        parts.append(torus(0, 0, h, 0.22, 0.035, sackD, 1.0, (0, 0, 0), 32, 8)); parts.append(torus(0, 0, h * 0.75, 0.245, 0.012, sackD, 1.0, (0, 0, 0), 32, 6))
        parts.append(ball(0, 0, h + 0.0, 0.2, mat(seedc, 0.8), 1, 1, 0.55))
        rnd = random.Random(int(x * 7 + y * 3))
        for i in range(30):
            a = rnd.uniform(0, 6.283); rr = 0.16 * math.sqrt(rnd.random()); parts.append(ball(math.cos(a) * rr, math.sin(a) * rr, h + 0.1 * (1 - rr / 0.2) + 0.005, 0.014, mat(rnd.choice(cols), 0.5), 1.5, 1, 0.8))
        return put(parts, x, y, 0, rot)
    one(-0.3, -0.12, '#E0B15A', 0.4, 0.3); one(0.3, -0.1, '#8A5A33', 0.38, -0.4); one(0.0, 0.17, '#B8D06A', 0.36, 0.8)
    # a wooden scoop and a bowl of seeds in front
    lathe(0.38, 0.22, 0.0, [(0.001, 0), (0.1, 0), (0.15, 0.08), (0.001, 0.07)], mat(C['woodL'], 0.55))
    ball(0.38, 0.22, 0.05, 0.1, mat('#F0DBA0', 0.7), 1, 1, 0.4)
    tube((0.46, 0.22, 0.1), (0.62, 0.16, 0.16), 0.016, mat(C['woodL'], 0.55))
    bx(-0.45, 0.24, 0.0, 0.2, 0.2, 0.09, mat(C['woodL'], 0.6), 0.02); ball(-0.45, 0.24, 0.1, 0.095, mat('#C9593A', 0.8), 1, 1, 0.5)

@kind('toyshelf')
def k_toyshelf(st):
    wl = woodL(); wm = woodM(); wd = woodD()
    bx(0, -0.19, 0.0, 1.2, 0.03, 0.95, wm, 0.01)
    for sx in (-0.58, 0.58): bx(sx, 0, 0.0, 0.05, 0.4, 0.95, wl, 0.015)
    for z in (0.05, 0.43, 0.8): bx(0, 0, z, 1.2, 0.4, 0.045, wl, 0.012)
    cols = [C['terra'], C['mustard'], C['teal'], C['sage'], C['indigo'], C['rose']]
    # bottom: stacking rings, a cart, blocks; top: a spinning top, a ball, a stack of rings; middle: blocks and a cart
    for (R, c, z) in [(0.12, C['terra'], 0.045), (0.098, C['mustard'], 0.1), (0.078, C['teal'], 0.152), (0.06, C['sage'], 0.2)]:
        torus(-0.38, 0.0, 0.095 + z, R, 0.03, mat(c, 0.55), 1.0)
    cyl(-0.38, 0.0, 0.095, 0.125, 0.025, wd, 0.008, 28); cyl(-0.38, 0.0, 0.11, 0.016, 0.26, wl, 0.004, 12); ball(-0.38, 0.0, 0.38, 0.03, mat(C['rose'], 0.5))
    cart = [bx(0, 0, 0.05, 0.26, 0.15, 0.08, mat(C['terra'], 0.6), 0.02), bx(0, 0, 0.11, 0.26, 0.15, 0.1, mat(C['mustard'], 0.6), 0.02)]
    for (x, y) in [(-0.08, -0.09), (0.08, -0.09), (-0.08, 0.09), (0.08, 0.09)]: cart.append(rcyl(x, y, 0.045, 0.045, 0.025, wd, 'y', 0.006, 20))
    cart.append(tube((0.13, 0, 0.1), (0.3, 0, 0.07), 0.01, wd)); put(cart, 0.15, 0.0, 0.095)
    for i, (x, y, c, r) in enumerate([(0.38, -0.08, 0, 0.1), (0.5, 0.05, 1, -0.3), (0.38, 0.1, 2, 0.2), (0.43, 0.0, 4, 0.6)]):
        b = bx(x, y, 0.095 + (0.15 if i == 3 else 0), 0.14, 0.14, 0.14, mat(cols[c], 0.6), 0.02); b.rotation_euler = (0, 0, r)
    # middle shelf: blocks pyramid, a ball, a boat-like cart
    for (x, y, z, c) in [(-0.4, -0.05, 0.475, 0), (-0.26, -0.05, 0.475, 1), (-0.33, -0.05, 0.62, 2), (-0.4, 0.1, 0.475, 3)]: bx(x, y, z, 0.13, 0.13, 0.13, mat(cols[c], 0.6), 0.02)
    ball(0.0, 0.0, 0.43 + 0.045 + 0.09, 0.09, mat(C['terra'], 0.6)); lathe(0.0, 0.0, 0.57, [(0.0905, -0.012), (0.0905, 0.012)], mat(C['cream'], 0.6), 32)
    c2 = [bx(0, 0, 0.05, 0.28, 0.16, 0.07, mat(C['teal'], 0.6), 0.02), bx(-0.05, 0, 0.12, 0.12, 0.14, 0.08, mat(C['sage'], 0.6), 0.02)]
    for (x, y) in [(-0.09, -0.1), (0.09, -0.1), (-0.09, 0.1), (0.09, 0.1)]: c2.append(rcyl(x, y, 0.045, 0.04, 0.025, wd, 'y', 0.006, 20))
    put(c2, 0.4, 0.0, 0.475, 0.2)
    # top: two spinning tops, a ball and a small stack of rings
    for (x, c, c2_) in [(-0.3, C['terra'], C['mustard']), (-0.1, C['teal'], C['cream'])]:
        lathe(x, 0.0, 0.85, [(0.001, 0), (0.012, 0.0), (0.02, 0.03), (0.07, 0.09), (0.085, 0.13), (0.05, 0.17), (0.02, 0.18), (0.012, 0.25), (0.001, 0.25)], mat(c, 0.5))
        torus(x, 0.0, 0.85 + 0.12, 0.08, 0.012, mat(c2_, 0.5), 1.0, (0, 0, 0), 28, 8)
    ball(0.17, 0.0, 0.8 + 0.045 + 0.1, 0.1, mat(C['sage'], 0.55)); lathe(0.17, 0.0, 0.945, [(0.1005, -0.012), (0.1005, 0.012)], mat(C['cream'], 0.6), 32)
    for (R, c, z) in [(0.12, C['indigo'], 0.045), (0.095, C['rose'], 0.1), (0.07, C['mustard'], 0.152)]:
        torus(0.42, 0.0, 0.845 + z, R, 0.03, mat(c, 0.55), 1.0)
    cyl(0.42, 0.0, 0.845, 0.125, 0.025, wd, 0.008, 28); cyl(0.42, 0.0, 0.86, 0.015, 0.2, wl, 0.004, 12); ball(0.42, 0.0, 1.06, 0.03, mat(C['terra'], 0.5))

@kind('giftshelf')
def k_giftshelf(st):
    wl = woodL(); wd = woodD()
    bx(0, 0, 0.7, 1.1, 0.7, 0.05, wl, 0.02)
    for sx in (-0.5, 0.5):
        for sy in (-0.3, 0.3): ctube = tube((sx, sy, 0.72), (sx * 1.04, sy * 1.04, 0.02), 0.035, wd, 0.026)
    bx(0, 0, 0.3, 0.98, 0.58, 0.035, wd, 0.012)
    def parcel(x, y, z, w, d, h, c, rib, rot=0.0, bow=True):
        o = []; o.append(bx(0, 0, 0, w, d, h, mat(c, 0.7), 0.02)); o.append(bx(0, 0, 0, w + 0.008, 0.045, h + 0.008, mat(rib, 0.6), 0.008)); o.append(bx(0, 0, 0, 0.045, d + 0.008, h + 0.008, mat(rib, 0.6), 0.008))
        if bow:
            for a in (0.5, -0.5):
                b = ball(0, 0, 0, 0.05, mat(rib, 0.6), 1.4, 0.6, 0.55); b.rotation_euler = (0, 0, a); b.location = (math.cos(a) * 0.05, math.sin(a) * 0.05 * 0, h + 0.025); o.append(b)
            o.append(ball(0, 0, h + 0.02, 0.024, mat(rib, 0.6)))
        put(o, x, y, z, rot)
    parcel(-0.3, -0.08, 0.75, 0.3, 0.26, 0.24, C['terra'], C['cream'], 0.2); parcel(0.05, -0.12, 0.75, 0.26, 0.26, 0.3, C['teal'], C['mustard'], -0.15)
    parcel(0.36, -0.05, 0.75, 0.28, 0.22, 0.2, C['mustard'], C['indigo'], 0.3); parcel(-0.28, 0.2, 0.75, 0.22, 0.2, 0.16, C['indigo'], C['cream'], -0.2)
    parcel(0.1, 0.18, 0.75, 0.2, 0.2, 0.2, D['pink'], C['teal'], 0.4); parcel(0.38, 0.22, 0.75, 0.18, 0.18, 0.14, C['sage'], C['terra'], 0.1)
    parcel(-0.3, -0.08, 0.99, 0.18, 0.16, 0.12, C['cream'], C['terra'], 0.5); parcel(0.05, -0.12, 1.05, 0.14, 0.14, 0.1, D['coral'], C['cream'], -0.4)
    parcel(-0.25, 0.0, 0.32, 0.3, 0.24, 0.2, C['teal'], C['cream'], 0.1); parcel(0.2, 0.0, 0.32, 0.26, 0.26, 0.24, C['terra'], C['mustard'], -0.2)

@kind('bkts')
def k_bkts(st):
    for (x, y, z, r, h, c) in [(-0.1, 0.0, 0.0, 0.28, 0.24, '#D9A864'), (0.1, 0.05, 0.24, 0.24, 0.2, '#C9954F'), (0.0, 0.0, 0.44, 0.2, 0.17, '#D9A864')]:
        woven_basket(x, y, z, r, h, c)
    woven_basket(0.4, 0.1, 0.0, 0.2, 0.2, '#C9954F')
    for (x, y, c) in [(0.36, 0.08, '#D8453A'), (0.45, 0.14, '#E8523F'), (0.4, 0.2, '#D8453A')]: ball(x, y, 0.2, 0.06, mat(c, 0.4))
    for a in (0, 2, 4): ball(0.4 + math.cos(a) * 0.07, 0.1 + math.sin(a) * 0.05, 0.22, 0.05, mat(C['leaf'], 0.5), 1, 1, 0.4)


# ======================================================================================================
# THE SCHOOL: floor, the board, kinds
# ======================================================================================================
def parquet(n):
    """Pale wooden blocks: groups of boards turned a quarter, in a checker."""
    u, v = M._grid(n); cells = 4; cu = np.floor(u * cells); cv = np.floor(v * cells); fx = (u * cells) % 1; fy = (v * cells) % 1
    horiz = ((cu + cv) % 2 == 0); s = np.where(horiz, fy, fx); along = np.where(horiz, fx, fy); bi = np.floor(s * 4); fb = (s * 4) % 1
    rnd = np.sin((cu * 12.9898 + cv * 78.233 + bi * 37.719) * 43.7) * 0.5 + 0.5
    a, b, g = np.array(rgb('#E8C48C')), np.array(rgb('#F5DDB0')), np.array(rgb('#BE9660'))
    gap = (fb < 0.05) | (fb > 0.97) | (np.minimum(fx, 1 - fx) < 0.012) | (np.minimum(fy, 1 - fy) < 0.012)
    grain = np.sin(along * 40 + rnd * 9) * 0.01
    out = np.zeros((n, n, 3), 'float32')
    for k in range(3): out[:, :, k] = np.where(gap, g[k], a[k] + (b[k] - a[k]) * rnd + grain)
    return out
M.FLOORS['parquet'] = (parquet, 0.6, 3.0)

def _scale_loop(pts, s):
    cx = sum(p[0] for p in pts[:-1]) / (len(pts) - 1); cy = sum(p[1] for p in pts[:-1]) / (len(pts) - 1)
    return [(cx + (p[0] - cx) * s, cy + (p[1] - cy) * s) for p in pts]
def _chalk_shape(wall, pts, n0, n1, thick=0.045):
    """A closed outline drawn in chalk: pts closed (first = last)."""
    wring(wall, _scale_loop(pts, 1.0 + thick), _scale_loop(pts, 1.0 - thick), n0, n1, mat('#F7F4EA', 1.0), None, 0.0)
def f_board(wall, f, sp):
    """A green chalk board in a wooden frame with a ledge, chalk and a duster; the board shows a circle, a triangle and a
    square drawn in chalk (shapes only: no letters, no numbers)."""
    wbox, wpt = _wall(wall); u0 = f['at']; wd = f.get('w', 3.4); z0 = f.get('z', 0.85); hh = f.get('h', 1.2); fr = woodM(); bd = mat(D['board'], 0.95)
    wbox(u0, 0.0, z0, wd, 0.04, hh, bd, 0.004, 'board')
    for (a, b, c, d_) in [(u0 - 0.08, z0 - 0.08, wd + 0.16, 0.08), (u0 - 0.08, z0 + hh, wd + 0.16, 0.08)]: wbox(a, -0.02, b, c, 0.09, d_, fr, 0.02)
    for a in (u0 - 0.08, u0 + wd): wbox(a, -0.02, z0 - 0.08, 0.08, 0.09, hh + 0.16, fr, 0.02)
    wbox(u0 - 0.1, 0.0, z0 - 0.15, wd + 0.2, 0.16, 0.05, woodL(), 0.015)           # the ledge
    # a soft chalk-dust smear and the shapes
    wpoly(wall, rrect(u0 + wd * 0.5, z0 + hh * 0.55, wd * 0.8, hh * 0.5, 0.15), 0.04, 0.043, mat('#3C7C66', 1.0), None, 0.0)
    cz = z0 + hh * 0.52; n0, n1 = 0.04, 0.052
    cx = u0 + wd * 0.2; _chalk_shape(wall, circ(cx, cz, 0.3, 40) + [circ(cx, cz, 0.3, 40)[0]], n0, n1)
    cx = u0 + wd * 0.5; r = 0.36; tri = [(cx + r * math.cos(math.radians(90 + 120 * i)), cz - 0.04 + r * math.sin(math.radians(90 + 120 * i))) for i in range(3)]; _chalk_shape(wall, tri + [tri[0]], n0, n1)
    cx = u0 + wd * 0.8; sq = [(cx - 0.27, cz - 0.27), (cx + 0.27, cz - 0.27), (cx + 0.27, cz + 0.27), (cx - 0.27, cz + 0.27)]; _chalk_shape(wall, sq + [sq[0]], n0, n1)
    # chalk and a duster on the ledge
    for i, c in enumerate(['#F7F4EA', '#F6E39A', '#F7F4EA']):
        p0 = wpt(u0 + 0.35 + i * 0.07, 0.07 + i * 0.015, z0 - 0.1); p1 = wpt(u0 + 0.35 + i * 0.07 + 0.09, 0.07 + i * 0.015, z0 - 0.1)
        tube(p0, p1, 0.011, mat(c, 0.9), caps=True)
    p = wpt(u0 + wd - 0.35, 0.08, z0 - 0.1); bx(p[0], p[1], p[2], 0.16 if wall == 'L' else 0.07, 0.07 if wall == 'L' else 0.16, 0.035, woodD(), 0.01)
    bx(p[0], p[1], p[2] + 0.035, 0.15 if wall == 'L' else 0.06, 0.06 if wall == 'L' else 0.15, 0.03, mat('#3F4852', 0.95), 0.01)
M.FEATURES['board'] = f_board

@kind('tdesk')
def k_tdesk(st):
    wl = woodL(); wm = woodM(); wd = woodD(); teal = fab(C['teal'])
    # the desk (toward +y), open at the front so the teacher can be seen; the chair behind it (toward -y)
    top = bx(0, 0.3, 0.72, 1.4, 0.64, 0.05, wd, 0.02)
    for sx in (-0.62, 0.62):
        bx(sx, 0.3, 0.0, 0.14, 0.56, 0.72, wl, 0.02)
        for sy in (-1, 1): pass
    bx(0, 0.52, 0.12, 1.2, 0.04, 0.5, wm, 0.01)
    for i, sx in enumerate((-0.62, 0.62)):
        bx(sx, 0.595, 0.4, 0.12, 0.02, 0.2, wm, 0.008); ball(sx, 0.615, 0.5, 0.018, brass()); bx(sx, 0.595, 0.16, 0.12, 0.02, 0.2, wm, 0.008); ball(sx, 0.615, 0.26, 0.018, brass())
    # on the desk: an abacus, a pile of books, a cup of pencils
    ab = []; wdk = woodD()
    ab += [bx(0, 0, 0.0, 0.5, 0.05, 0.04, wdk, 0.01), bx(0, 0, 0.3, 0.5, 0.05, 0.04, wdk, 0.01), bx(-0.24, 0, 0.0, 0.04, 0.05, 0.34, wdk, 0.01), bx(0.24, 0, 0.0, 0.04, 0.05, 0.34, wdk, 0.01)]
    cols = [C['terra'], C['teal'], C['mustard'], C['indigo'], C['sage']]
    for i in range(5):
        z = 0.04 + i * 0.05; ab.append(tube((-0.23, 0, z + 0.02), (0.23, 0, z + 0.02), 0.005, mat('#8A6A44', 0.5), caps=False))
        for k in range(4): ab.append(ball(-0.2 + k * 0.045 + (0.0 if i % 2 else 0.0), 0, z + 0.02, 0.02, mat(cols[i], 0.4), 1.0, 0.9, 1.0))
        for k in range(3): ab.append(ball(0.2 - k * 0.045, 0, z + 0.02, 0.02, mat(cols[i], 0.4), 1.0, 0.9, 1.0))
    put(ab, -0.35, 0.5, 0.77, 0.15)
    for i, (c, w, d_) in enumerate([(C['indigo'], 0.3, 0.22), (C['terra'], 0.26, 0.2), (C['cream'], 0.28, 0.2)]):
        o = bx(0.38, 0.4, 0.77 + i * 0.045, w, d_, 0.04, mat(c, 0.7), 0.012); o.rotation_euler = (0, 0, (-0.1, 0.1, -0.05)[i])
    lathe(0.05, 0.32, 0.77, [(0.001, 0), (0.045, 0), (0.05, 0.1), (0.001, 0.1)], mat(C['mustard'], 0.5))
    for a in (0.2, 1.8, 3.4): tube((0.05, 0.32, 0.85), (0.05 + math.cos(a) * 0.03, 0.32 + math.sin(a) * 0.03, 0.97), 0.007, mat(C['terra'] if a < 1 else C['teal'], 0.6), caps=True)
    # the chair
    for (sx, sy) in [(-0.2, -0.65), (0.2, -0.65), (-0.2, -0.25), (0.2, -0.25)]: cyl(sx, sy, 0, 0.025, 0.44, wm, 0.008, 12)
    bx(0, -0.45, 0.44, 0.5, 0.46, 0.05, wd, 0.02); bx(0, -0.45, 0.49, 0.44, 0.4, 0.04, teal, 0.02)
    bx(0, -0.66, 0.5, 0.5, 0.05, 0.55, wm, 0.02); bx(0, -0.64, 0.58, 0.4, 0.03, 0.34, teal, 0.02)
    for sx in (-0.2, 0.2): cyl(sx, -0.66, 0.44, 0.025, 0.65, wm, 0.008, 12)

@kind('sdesk')
def k_sdesk(st):
    wl = woodL(); wm = woodM(); wd = woodD(); teal = fab(C['teal'])
    # a double desk (toward -y) with a bench (toward +y); pupils sit on the bench facing -y
    bx(0, -0.2, 0.7, 1.46, 0.52, 0.045, wl, 0.02); bx(0, -0.47, 0.7, 1.46, 0.045, 0.1, wd, 0.012)
    for sx in (-0.65, 0.65):
        bx(sx, -0.2, 0.0, 0.07, 0.46, 0.7, wm, 0.02); bx(sx, -0.2, 0.0, 0.1, 0.5, 0.05, wd, 0.015); bx(sx, 0.31, 0.0, 0.07, 0.26, 0.44, wm, 0.02)
    bx(0, -0.2, 0.18, 1.3, 0.04, 0.04, wd, 0.01)
    bx(0, 0.31, 0.4, 1.46, 0.28, 0.05, wl, 0.02); bx(0, 0.31, 0.2, 1.3, 0.04, 0.04, wd, 0.01)
    # a groove, an inkwell hole each side, an exercise book and a pencil each
    bx(0, -0.1, 0.743, 1.3, 0.02, 0.008, wd, 0.002)
    for sx in (-0.38, 0.38):
        cyl(sx - 0.28 * (1 if sx < 0 else -1), -0.32, 0.743, 0.03, 0.006, mat(D['ink'], 0.6), 0.002, 16)
        b = bx(sx, -0.22, 0.745, 0.34, 0.24, 0.025, mat(C['teal'] if sx < 0 else C['terra'], 0.7), 0.01); b.rotation_euler = (0, 0, 0.05 * (1 if sx < 0 else -1))
        bx(sx, -0.22, 0.77, 0.3, 0.22, 0.012, mat(C['cream'], 0.8), 0.004).rotation_euler = (0, 0, 0.05 * (1 if sx < 0 else -1))
        pc = tube((sx + 0.22, -0.32, 0.755), (sx + 0.22, -0.12, 0.755), 0.009, mat(C['mustard'], 0.5)); 

@kind('cushions')
def k_cushions(st):
    rm = tex_mat('rugcush', lambda s: khatam(s, C['cream'], C['teal'], C['terra'], 3, border=(C['indigo'], C['mustard'])), 512, 0.98)
    # an oval rug (a squashed disc) with a khatam top
    base = cyl(0, 0, 0, 0.85, 0.022, mat(C['indigo'], 0.98), 0.01, 64); base.scale = (1.0, 0.78, 1.0)
    top = cyl(0, 0, 0.0, 0.8, 0.026, None, 0.008, 64); top.data.materials.append(rm); top.scale = (1.0, 0.78, 1.0)
    for (x, y, c, c2) in [(-0.5, 0.0, C['terra'], C['mustard']), (0.5, 0.0, C['teal'], C['cream']), (0.0, 0.42, C['mustard'], C['terra'])]:
        lathe(x, y, 0.02, [(0.001, 0), (0.2, 0), (0.24, 0.05), (0.24, 0.09), (0.2, 0.13), (0.001, 0.14)], fab(c))
        torus(x, y, 0.07, 0.241, 0.012, fab(c2), 1.0, (0, 0, 0), 32, 8); ball(x, y, 0.15, 0.025, fab(c2))
    # a basket of picture books in the middle
    wv = mat('#D9A864', 0.8); lathe(0, -0.05, 0.02, [(0.001, 0), (0.13, 0), (0.17, 0.15), (0.001, 0.15)], wv)
    for i, c in enumerate([C['teal'], C['terra'], C['mustard'], C['indigo'], C['sage']]):
        b = bx(-0.07 + i * 0.035, -0.05, 0.12, 0.03, 0.17, 0.2, mat(c, 0.7), 0.006); b.rotation_euler = (0, math.radians(-12 + i * 6), 0)

@kind('globe')
def k_globe(st):
    sea = mat('#3E98D6', 0.4); land = mat(C['leaf'], 0.6); landD = mat(C['leafD'], 0.6); br = brass(); wd = woodD(); wl = woodL()
    for a in (90, 210, 330):
        r = math.radians(a); tube((math.cos(r) * 0.04, math.sin(r) * 0.04, 0.5), (math.cos(r) * 0.24, math.sin(r) * 0.24, 0.02), 0.026, wl, 0.02)
    cyl(0, 0, 0.45, 0.08, 0.05, wd, 0.015, 20)
    R = 0.3; parts = [ball(0, 0, 0, R, sea)]
    for (th, ph, s, c) in [(60, 20, 0.18, land), (80, 100, 0.16, land), (115, 140, 0.14, landD), (45, 200, 0.15, land), (105, 260, 0.18, land), (130, 320, 0.13, landD), (20, 60, 0.1, landD), (85, 40, 0.11, land), (150, 100, 0.1, land)]:
        t, p = math.radians(th), math.radians(ph); n = Vector((math.sin(t) * math.cos(p), math.sin(t) * math.sin(p), math.cos(t)))
        b = ball(0, 0, 0, s, c, 1.0, 0.85, 0.22); b.rotation_euler = n.to_track_quat('Z', 'Y').to_euler(); b.location = n * R * 0.97; parts.append(b)
    g = kit.group(parts, 'earth'); g.rotation_euler = (0, math.radians(23), math.radians(30)); g.location = (0, 0, 0.88)
    torus(0, 0, 0.88, 0.345, 0.014, br, 1.0, (math.pi / 2, 0, math.radians(35)), 48, 10)
    tube((0, 0, 0.5), (0, 0, 0.56), 0.03, br, caps=False)
    ball(0, 0, 1.23, 0.02, br)


# ======================================================================================================
# THE GRANDPARENTS' SITTING ROOM
# ======================================================================================================
def f_indoor(wall, f, sp):
    """A closed wooden inner door in the wall (the way to the bedroom; it does not open)."""
    wbox, wpt = _wall(wall); u0 = f['at']; w = f.get('w', 1.0); h = f.get('h', 2.05); fr = woodL(); dm = mat('#B07A44', 0.6); pn = mat('#C58C54', 0.6)
    wbox(u0 - 0.1, -0.02, 0, 0.1, 0.09, h + 0.1, fr, 0.02); wbox(u0 + w, -0.02, 0, 0.1, 0.09, h + 0.1, fr, 0.02); wbox(u0 - 0.1, -0.02, h, w + 0.2, 0.09, 0.1, fr, 0.02)
    wpoly(wall, [(u0, 0.0), (u0 + w, 0.0), (u0 + w, h), (u0, h)], 0.0, 0.05, dm, None, 0.01)
    for (a, b, c, d_) in [(0.1, 0.12, 0.8, 0.83), (0.1, 0.12, 0.8, 0.83)]: pass
    for (zb, zt) in [(0.14, 0.9), (1.02, 1.9)]:
        for (ua, ub) in [(0.1, 0.46), (0.54, 0.9)]:
            wpoly(wall, [(u0 + ua * w / 0.9 * 0.9, zb), (u0 + ub * w / 0.9 * 0.9, zb), (u0 + ub * w / 0.9 * 0.9, zt), (u0 + ua * w / 0.9 * 0.9, zt)], 0.05, 0.068, pn, None, 0.012)
    p = wpt(u0 + w - 0.13, 0.08, 1.0); ball(p[0], p[1], p[2], 0.035, brass()); p2 = wpt(u0 + w - 0.13, 0.06, 1.0); cyl(p2[0], p2[1], 0.94, 0.018, 0.12, brass(), 0.005, 12)
    wbox(u0 - 0.13, 0.0, 0.0, w + 0.26, 0.1, 0.1, mat(C['trim'], 0.7), 0.02)
M.FEATURES['indoor'] = f_indoor

@kind('divan')
def k_divan(st):
    wd = woodD(); wm = woodM()
    for (sx, sy) in [(-0.4, -1.1), (0.4, -1.1), (-0.4, 1.1), (0.4, 1.1)]: cyl(sx, sy, 0, 0.04, 0.12, wd, 0.01, 16)
    bx(0, 0, 0.1, 0.95, 2.4, 0.16, wm, 0.03)
    for i in range(3): bx(0.476, -0.8 + i * 0.8, 0.14, 0.012, 0.64, 0.08, wd, 0.005)
    m = tex_mat('divan-cloth', lambda s: khatam(s, C['cream'], C['terra'], C['mustard'], 6), 512, 0.98)
    c = box(-0.43, -1.13, 0.26, 0.86, 2.26, 0.15, None, 0.06); c.data.materials.append(m)
    cols = [(C['terra'], C['mustard']), (C['teal'], C['cream']), (C['mustard'], C['terra'])]
    for i, (c1, c2) in enumerate(cols):
        y = -0.78 + i * 0.78
        o = cyl(0, 0, 0, 0.14, 0.7, fab(c1), 0.03, 24); o.rotation_euler = (math.pi / 2, 0, 0); o.location = (-0.3, y, 0.56)
        for s in (-1, 1): torus(-0.3, y + s * 0.34, 0.56, 0.14, 0.012, fab(c2), 1.0, (math.pi / 2, 0, 0), 24, 6); ball(-0.3, y + s * 0.38, 0.56, 0.03, mat(c2, 0.5))
    # end bolsters standing on each end
    for (y, c1) in [(-1.0, C['indigo']), (1.0, C['terra'])]:
        o = cyl(0, 0, 0, 0.12, 0.5, fab(c1), 0.03, 24); o.rotation_euler = (0, math.pi / 2, 0); o.location = (0.0, y * 1.0, 0.49)
    for (y, c1, rz) in [(-0.1, C['sage'], 0.1), (0.5, C['rose'], -0.2)]:
        b = box(0, 0, 0, 0.3, 0.3, 0.1, mat(c1, 0.95, sheen=0.5), 0.045); b.rotation_euler = (0, math.radians(-62), rz); b.location = (-0.08, y, 0.58)

@kind('rocker')
def k_rocker(st):
    wm = woodM(); wd = woodD(); wl = woodL()
    for sy in (-0.3, 0.3):
        pts = [(x * 0.08, 0.05 + 0.5 * (1.0 - math.sqrt(1.0 - (x * 0.08 / 1.0) ** 2)) * 0.0 + 0.22 * ((x * 0.08) / 0.46) ** 2) for x in range(-5, 6)]
        for a, c in zip(pts, pts[1:]): tube((a[0], sy, a[1]), (c[0], sy, c[1]), 0.026, wd)
        for sx in (-0.3, 0.26): tube((sx, sy, 0.1 + 0.2 * (sx / 0.46) ** 2), (sx, sy, 0.44), 0.024, wm)
    bx(0, 0, 0.42, 0.52, 0.56, 0.05, wd, 0.02)
    cm = tex_mat('rocker-cushion', lambda s: weave(s, C['terra'], '#E58C63', 6), 256, 0.98)
    c = box(-0.22, -0.25, 0.47, 0.46, 0.5, 0.07, None, 0.035); c.data.materials.append(cm)
    # a back of spindles, arms
    for sy in (-0.28, 0.28): tube((-0.26, sy, 0.44), (-0.34, sy, 1.02), 0.025, wm)
    bx(-0.34, 0, 0.98, 0.07, 0.68, 0.07, wd, 0.025); bx(-0.3, 0, 0.62, 0.05, 0.6, 0.05, wd, 0.02)
    for i in range(7): cyl(-0.3 - 0.0 * i, -0.24 + i * 0.08, 0.5, 0.012, 0.48, wl, 0.004, 10)
    for sy in (-0.3, 0.3):
        tube((-0.26, sy, 0.64), (0.14, sy, 0.64), 0.024, wm); tube((0.14, sy, 0.64), (0.14, sy, 0.44), 0.022, wm)
    # a knitted blanket over the back and the right arm
    for i in range(5): bx(-0.375, 0.0, 0.7 + i * 0.05, 0.03, 0.5, 0.05, mat([C['teal'], C['cream'], C['mustard'], C['cream'], C['teal']][i], 0.95, sheen=0.5), 0.01)

@kind('sewing')
def k_sewing(st):
    wv = mat('#D9A864', 0.8); wd = mat('#B98446', 0.8); wl = woodL()
    # the basket (left): wicker, lid propped open, cloth and spools heaped in it
    lathe(-0.25, 0.0, 0.0, [(0.001, 0), (0.18, 0), (0.22, 0.03), (0.3, 0.26), (0.31, 0.28), (0.001, 0.26)], wv)
    for z in (0.07, 0.14, 0.21): torus(-0.25, 0.0, z, 0.2 + z * 0.35, 0.012, wd, 1.0, (0, 0, 0), 32, 6)
    torus(-0.25, 0.0, 0.28, 0.305, 0.022, wd, 1.0, (0, 0, 0), 36, 8)
    cm1 = tex_mat('sew-cloth1', lambda s: khatam(s, C['teal'], C['cream'], C['mustard'], 3), 256, 0.98); cm2 = tex_mat('sew-cloth2', lambda s: weave(s, C['terra'], C['cream'], 6), 256, 0.98)
    for (x, y, z, w, d, m, rz) in [(-0.3, -0.04, 0.3, 0.34, 0.28, cm1, 0.3), (-0.2, 0.06, 0.32, 0.3, 0.26, cm2, -0.4), (-0.28, 0.0, 0.34, 0.24, 0.2, cm1, 1.0)]:
        o = box(0, 0, 0, w, d, 0.05, None, 0.02); o.data.materials.append(m); o.rotation_euler = (0, 0, rz); o.location = (x, y, z)
    for (x, y, c) in [(-0.12, -0.12, C['terra']), (-0.38, 0.1, C['indigo']), (-0.18, 0.12, C['mustard'])]:
        cyl(x, y, 0.37, 0.04, 0.012, wl, 0.003, 16); cyl(x, y, 0.382, 0.03, 0.06, fab(c, 0.7), 0.004, 16); cyl(x, y, 0.442, 0.04, 0.012, wl, 0.003, 16)
    lid = cyl(0, 0, 0, 0.29, 0.03, wv, 0.01, 32); lid.rotation_euler = (math.radians(68), 0, 0); lid.location = (-0.25, -0.3, 0.45)
    # a pin cushion and a measuring tape on the floor beside it
    ball(0.02, -0.28, 0.04, 0.06, mat(D['red'], 0.9), 1, 1, 0.8)
    for k, (a, b) in enumerate([(0.0, 0.03), (2.0, 0.04), (4.0, 0.035)]): ball(0.02 + math.cos(a) * 0.03, -0.28 + math.sin(a) * 0.03, 0.095, 0.011, mat(C['mustard'], 0.5))
    torus(0.0, 0.0, 0.0, 0.0, 0.0, wl, 1.0) if False else None
    # a low stool (right)
    cyl(0.32, 0.05, 0.0, 0.17, 0.3, wl, 0.02, 24); cyl(0.32, 0.05, 0.3, 0.19, 0.05, fab(C['teal']), 0.02, 24); torus(0.32, 0.05, 0.1, 0.17, 0.012, woodD(), 1.0, (0, 0, 0), 24, 6)

@kind('stove')
def k_stove(st):
    iron = mat('#33383F', 0.55, 0.3); enam = mat('#2E6E67', 0.45); cream = mat('#EDE3C8', 0.45); gold = brass(); wd = woodD()
    for (sx, sy) in [(-0.33, -0.25), (0.33, -0.25), (-0.33, 0.25), (0.33, 0.25)]: cyl(sx, sy, 0, 0.035, 0.12, iron, 0.01, 12)
    bx(0, 0, 0.1, 0.76, 0.62, 0.74, enam, 0.05); bx(0, 0, 0.84, 0.8, 0.66, 0.07, iron, 0.02)
    # oven door, a firebox door, brass handles
    bx(0.0, 0.318, 0.16, 0.54, 0.02, 0.44, cream, 0.03); bx(0, 0.332, 0.26, 0.38, 0.01, 0.24, mat('#2B3036', 0.3), 0.01)
    tube((-0.22, 0.36, 0.52), (0.22, 0.36, 0.52), 0.016, gold); 
    for s in (-1, 1): tube((s * 0.22, 0.34, 0.52), (s * 0.22, 0.36, 0.52), 0.014, gold)
    for sx in (-0.2, 0.0, 0.2): ball(sx, 0.325, 0.66, 0.022, gold)
    for (x, y) in [(-0.18, -0.1), (0.18, -0.1), (-0.18, 0.15), (0.18, 0.15)]: cyl(x, y, 0.905, 0.1, 0.016, mat('#23272D', 0.5, 0.4), 0.005, 28); torus(x, y, 0.922, 0.065, 0.007, iron, 1.0)
    tube((-0.38, 0.0, 0.7), (-0.46, 0.0, 0.7), 0.013, gold); tube((-0.46, 0.0, 0.7), (-0.46, 0.2, 0.5), 0.013, gold); 
    # a chimney up the wall and a warming rail
    cyl(0.0, -0.26, 0.9, 0.07, 1.6, iron, 0.01, 20); cyl(0.0, -0.26, 1.2, 0.09, 0.05, gold, 0.01, 20); cyl(0.0, -0.26, 2.2, 0.09, 0.05, gold, 0.01, 20)
    # a kettle (teal enamel, a brass spout) and a small pot
    kt = [lathe(0, 0, 0, [(0.001, 0), (0.1, 0), (0.12, 0.05), (0.115, 0.14), (0.07, 0.19), (0.06, 0.2), (0.001, 0.2)], mat(C['teal'], 0.3)),
          lathe(0, 0, 0.19, [(0.07, 0), (0.05, 0.03), (0.001, 0.045)], mat(C['cream'], 0.4)), ball(0, 0, 0.245, 0.02, gold),
          tube((0.1, 0, 0.08), (0.2, 0, 0.2), 0.022, gold, 0.014), tube((-0.1, 0, 0.1), (-0.16, 0, 0.22), 0.012, wd), tube((-0.16, 0, 0.22), (-0.04, 0, 0.27), 0.012, wd)]
    put(kt, -0.18, -0.1, 0.92)
    lathe(0.18, 0.15, 0.92, [(0.001, 0), (0.08, 0), (0.085, 0.11), (0.001, 0.11)], mat(C['terra'], 0.4)); lathe(0.18, 0.15, 1.03, [(0.09, 0), (0.05, 0.03), (0.001, 0.045)], mat(C['cream'], 0.4))

@icon('hanger')
def icon_hanger():
    wood = '#D9A25E'
    lay(thick_line([(-0.5, -0.12), (0.0, 0.2), (0.5, -0.12)], 0.085), wood, 0.0, 0.11, 0.035, 0.5)
    lay(rrect(0.0, -0.15, 1.04, 0.09, 0.04), wood, 0.0, 0.11, 0.035, 0.5)
    arc = [(0.1 + 0.1 * math.cos(math.radians(t)), 0.36 + 0.1 * math.sin(math.radians(t))) for t in range(200, -70, -15)]
    lay(thick_line([(0.0, 0.2), (0.0, 0.36)] + arc[1:], 0.06), '#E0B04A', 0.03, 0.1, 0.025, 0.35)
    lay(rrect(0.0, -0.15, 0.5, 0.07, 0.03), C['teal'], 0.07, 0.04, 0.012, 0.6)
@icon('veg')
def icon_veg():
    orange = mat('#EE7A2E', 0.5)
    car = [lathe(0, 0, 0, [(0.001, 0), (0.03, 0.05), (0.075, 0.35), (0.12, 0.62), (0.125, 0.68), (0.001, 0.7)], orange)]
    for i in range(4): car.append(torus(0, 0, 0.16 + i * 0.13, 0.065 + i * 0.016, 0.008, mat('#D5651F', 0.5), 1.0))
    for a in (-0.45, 0.0, 0.45):
        l = ball(0, 0, 0, 0.17, mat(C['leaf'], 0.5), 0.45, 0.45, 1.0); l.rotation_euler = (0, a, 0); l.location = (math.sin(a) * 0.14, 0, 0.82); car.append(l)
    g = kit.group(car, 'carrot'); g.rotation_euler = (0, math.radians(-24), math.radians(135)); g.location = Vector((0.3, -0.04, 0.26)); g.scale = (0.72, 0.72, 0.72)
    cab = [ball(0, 0, 0, 0.26, mat(C['leaf'], 0.55), 1, 1, 0.95)]
    for i in range(6):
        a = i * 1.05; l = ball(0, 0, 0, 0.2, mat(C['sage'] if i % 2 else '#7FBF6A', 0.55), 1.0, 0.3, 0.95); l.rotation_euler = (math.radians(58), 0, a); l.location = (math.cos(a) * 0.12, math.sin(a) * 0.12, -0.05 + (i % 2) * 0.07); cab.append(l)
    kit.group(cab, 'cabbage').location = (-0.3, 0.3, 0.5)
    ball(0.02, 0.02, 0.36, 0.16, mat('#E0503C', 0.35)); ball(0.02, 0.02, 0.5, 0.07, mat(C['leaf'], 0.5), 1.3, 1.3, 0.35)
