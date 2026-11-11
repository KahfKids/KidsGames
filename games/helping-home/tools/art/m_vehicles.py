"""Helping Home art: the vehicles (a small car in four colours, a town bus, a delivery scooter with its rider, a child's
bicycle) in the look of models.py: rounded, chunky, toy-like, matte paint with a little gloss (runs inside Blender).

Every kind is built at "rot 0": it drives toward +X, its wheels stand on z = 0, the middle of its footprint is on the origin.
The camera sees the FRONT and the LEFT (+Y) side at @0, and the BACK and the RIGHT side at @180 (the bus door is on the right).
`bicycle()` is also used by the people tool: the same bicycle upright, no kickstand, heading +X, wheels on z = 0."""
import math
import numpy as np
import bpy, bmesh
from mathutils import Vector
import kit, models as M
from kit import box, cyl, ball, lathe, tube, mat, tex_mat, rgb
from models import C, weave

KINDS, ICONS, PLACES = {}, {}, {}
def kind(name):
    def deco(fn): KINDS[name] = fn; return fn
    return deco
def icon(name):
    def deco(fn): ICONS[name] = fn; return fn
    return deco

V = dict(tyre='#363A42', tyreL='#4A4F59', bumper='#5E5A63', ink='#2F3A45', red='#D8483F', warm='#FFD98A', plate='#F6ECD6',
         wicker='#DDAE78', wickerD='#B98446', jacket='#3B4A8F', trouser='#2F3A45', shoe='#3A2F2A', skin='#FFE0B8')
BODY = dict(fam=C['teal'], a=C['terra'], b=C['mustard'], c=C['cream'])
ROOF = dict(fam=C['cream'], a=C['cream'], b=C['cream'], c=C['teal'])

# ---------- little helpers ----------
def paint(col, rough=0.42): return mat(col, rough, sheen=0.0, name=('paint', col, rough))
def matte(col, rough=0.7): return mat(col, rough)
def glass():
    key = 'vglass'
    m = mat('#131F28', 0.1, name=key)
    b = m.node_tree.nodes['Principled BSDF']
    for k, v in (('Specular IOR Level', 0.18), ('Coat Weight', 0.12), ('Coat Roughness', 0.1)):
        if k in b.inputs: b.inputs[k].default_value = v
    return m
def lamp(col, e=1.2):
    return mat(col, 0.35, name=('lamp', col, e), emit=(col, e))

def sgn(v): return 1.0 if v >= 0 else -1.0
def shade(c, f):
    v = rgb(c); return '#%02X%02X%02X' % tuple(int(max(0, min(1, x * f)) * 255) for x in v)

def _ring_at(rings, x):
    for a, b in zip(rings, rings[1:]):
        if a[0] <= x <= b[0]:
            t = (x - a[0]) / (b[0] - a[0]); return [a[i] + (b[i] - a[i]) * t for i in range(1, 5)]
    r = rings[0] if x < rings[0][0] else rings[-1]; return list(r[1:5])
def glass_y(rings, x, z):
    """Half-width of a skinned body at (x, z), or 0 when z is outside it."""
    hy, z0, z1, n = _ring_at(rings, x); zc, hz = (z0 + z1) / 2, (z1 - z0) / 2; s = abs((z - zc) / hz)
    return hy * (1 - s ** n) ** (1 / n) if s < 1 else 0.0
def pillar(rings, path, sy, r, m, out=0.004):
    """A round post that hugs the side of a skinned body along a path of (x, z) points."""
    pts = [(x, sy * (glass_y(rings, x, z) + out), z) for (x, z) in path]
    for p, q in zip(pts, pts[1:]): tube(p, q, r, m)

def skin(rings, m, steps=44, sub=2, name='skin', smooth=True):
    """A rounded-box body skinned through rings along X. A ring = (x, hy, z0, z1, n) or (x, hy, z0, z1, n, yc): a superellipse
    across Y and Z (n = 2 is an ellipse, 4 is a soft rounded rectangle)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); R = []
    for r in rings:
        x, hy, z0, z1, n = r[:5]; yc = r[5] if len(r) > 5 else 0.0
        zc, hz = (z0 + z1) / 2, (z1 - z0) / 2; e = 2.0 / n; pts = []
        for i in range(steps):
            t = 2 * math.pi * i / steps; c, s = math.cos(t), math.sin(t)
            pts.append(bm.verts.new((x, yc + hy * sgn(c) * abs(c) ** e, zc + hz * sgn(s) * abs(s) ** e)))
        R.append(pts)
    for a, b in zip(R, R[1:]):
        for i in range(steps): bm.faces.new((a[i], a[(i + 1) % steps], b[(i + 1) % steps], b[i]))
    bm.faces.new(list(reversed(R[0]))); bm.faces.new(R[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    sb = o.modifiers.new('sub', 'SUBSURF'); sb.levels = 1; sb.render_levels = sub
    return o

def cutout(o, cutters):
    """Cut round openings (wheel arches) out of a body."""
    for c in cutters:
        md = o.modifiers.new('cut', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = c; md.solver = 'EXACT'
        c.hide_render = True; c.hide_viewport = True

def axis_y(o, x, y, z):
    o.rotation_euler = (math.pi / 2, 0, 0); o.location = (x, y, z); return o
def axis_x(o, x, y, z):
    o.rotation_euler = (0, math.pi / 2, 0); o.location = (x, y, z); return o

def disc_y(x, y, z, r, d, m, bevel=0.01, verts=36):
    """A round slab whose axis runs along Y, centred on (x, y, z)."""
    return axis_y(cyl(0, 0, -d / 2, r, d, m, bevel, verts), x, y, z)
def disc_x(x, y, z, r, d, m, bevel=0.01, verts=36):
    return axis_x(cyl(0, 0, -d / 2, r, d, m, bevel, verts), x, y, z)

def torus(x, y, z, R, r, m, rot=(0, 0, 0), ms=48, mn=14):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=ms, minor_segments=mn, location=(x, y, z), rotation=rot)
    o = bpy.context.object; o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o

def rbox(cx, cy, z, w, d, h, m, bevel=0.03, name='rbox'):
    """A box centred on (cx, cy) in plan, its bottom at z."""
    return box(cx - w / 2, cy - d / 2, z, w, d, h, m, bevel, name)

def wheel(x, y, z, r, w, hubr=0.58, tyre=None, hub=None):
    """A chunky wheel: a fat tyre, a cream hub with a dark centre cap, centred on (x, y, z), axis along Y."""
    tyre = tyre or matte(V['tyre'], 0.85); hub = hub or matte(C['cream'], 0.5)
    disc_y(x, y, z, r, w, tyre, min(0.045, w / 3, r / 4), 40)
    disc_y(x, y, z, r * hubr, w + 0.022, hub, 0.012, 32)
    disc_y(x, y, z, r * 0.2, w + 0.04, matte(V['tyre'], 0.6), 0.008, 20)
    return

# ======================================================================= the car
def car_body(st):
    col = BODY[st]; body = paint(col); roof = paint(ROOF[st]); gl = glass(); dark = matte(V['bumper'], 0.7)
    hw = 0.47
    # lower body: a rounded tub, a short hood and a stubby tail
    tub = skin([(-1.0, 0.33, 0.30, 0.60, 3.0), (-0.93, 0.43, 0.20, 0.66, 3.4), (-0.5, hw, 0.17, 0.66, 4.0), (0.25, hw, 0.17, 0.62, 4.0),
                (0.75, 0.46, 0.17, 0.55, 3.8), (0.94, 0.41, 0.2, 0.5, 3.2), (1.0, 0.31, 0.27, 0.44, 3.0)], body, name='tub')
    wx = 0.62; wz = 0.21; wr = 0.21; wy = 0.5
    cut = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            c = disc_y(sx * wx, sy * (hw + 0.02), wz, wr + 0.05, 0.34, matte('#000000'), 0, 28); cut.append(c)
    cutout(tub, cut)
    for sx in (-1, 1):
        for sy in (-1, 1):
            disc_y(sx * wx, sy * (hw - 0.17 + 0.012), wz, wr + 0.04, 0.02, matte('#2A2D33', 0.9), 0, 28)
            wheel(sx * wx, sy * (hw - 0.085), wz, wr, 0.17)
    # cabin: dark glass with a body-colour roof and pillars that follow the glass
    GL = [(-0.84, 0.31, 0.62, 0.78, 3.0), (-0.78, 0.37, 0.58, 0.88, 3.2), (-0.62, 0.395, 0.56, 0.915, 4.0), (0.08, 0.395, 0.56, 0.915, 4.0),
          (0.28, 0.385, 0.56, 0.84, 3.4), (0.50, 0.33, 0.58, 0.68, 2.8)]
    skin(GL, gl, name='cabin')
    skin([(-0.78, 0.31, 0.88, 0.94, 3.0), (-0.72, 0.4, 0.885, 0.975, 3.4), (-0.6, 0.425, 0.885, 0.985, 4.0), (0.0, 0.425, 0.885, 0.985, 4.0),
          (0.14, 0.4, 0.885, 0.975, 3.4), (0.2, 0.33, 0.89, 0.945, 3.0)], roof, name='roof')
    for sy in (-1, 1):
        pillar(GL, [(0.47, 0.62), (0.33, 0.73), (0.2, 0.84), (0.12, 0.89)], sy, 0.03, body)
        pillar(GL, [(-0.19, 0.6), (-0.19, 0.7), (-0.19, 0.8), (-0.19, 0.88)], sy, 0.032, body)
        pillar(GL, [(-0.72, 0.62), (-0.7, 0.72), (-0.68, 0.8), (-0.66, 0.87)], sy, 0.036, body)
        # door lines, handles, mirrors
        line = matte(shade(col, 0.55), 0.8)
        for dx in (0.25,):
            rbox(dx, sy * 0.472, 0.3, 0.012, 0.014, 0.3, line, 0.004)
        rbox(-0.2, sy * 0.472, 0.26, 0.012, 0.014, 0.34, line, 0.004)
        for hx in (0.03, -0.4):
            rbox(hx, sy * 0.478, 0.5, 0.09, 0.022, 0.028, matte(C['cream'], 0.5), 0.01)
        rbox(0.36, sy * 0.505, 0.64, 0.05, 0.09, 0.06, body, 0.02)
    # bumpers, lights, grille, plates
    for sx in (-1, 1):
        rbox(sx * 0.955, 0, 0.12, 0.1, 0.8, 0.12, dark, 0.045)
    for sy in (-1, 1):
        disc_x(0.93, sy * 0.285, 0.44, 0.085, 0.07, matte(C['cream'], 0.4), 0.015, 28)
        disc_x(0.945, sy * 0.285, 0.44, 0.065, 0.06, lamp(V['warm'], 0.8), 0.01, 28)
        rbox(-0.985, sy * 0.3, 0.47, 0.05, 0.14, 0.1, lamp(V['red'], 0.9), 0.02)
    rbox(0.975, 0, 0.35, 0.04, 0.3, 0.07, matte('#3A3D45', 0.6), 0.018)
    rbox(0.945, 0, 0.1, 0.04, 0.2, 0.075, matte(V['plate'], 0.6), 0.015)
    rbox(-0.985, 0, 0.28, 0.04, 0.2, 0.075, matte(V['plate'], 0.6), 0.015)
    return col

def roof_rack():
    wood = matte(C['woodD'], 0.6); box_m = paint(C['mustard'], 0.5); strap = matte(C['tealD'], 0.7)
    for sy in (-1, 1):
        tube((-0.55, sy * 0.3, 0.995), (0.08, sy * 0.3, 0.995), 0.02, wood)
        for sx in (-0.5, 0.0): cyl(sx, sy * 0.3, 0.97, 0.022, 0.05, wood, 0.005, 16)
    for sx in (-0.5, 0.0): tube((sx, -0.3, 1.01), (sx, 0.3, 1.01), 0.018, wood)
    rbox(-0.26, 0, 1.03, 0.62, 0.5, 0.17, box_m, 0.06)
    for sx in (-0.42, -0.1): rbox(sx, 0, 1.03, 0.06, 0.52, 0.175, strap, 0.02)
    rbox(-0.26, 0, 1.2, 0.2, 0.1, 0.03, matte(C['cream'], 0.5), 0.012)

@kind('car')
def car(st):
    st = st or 'fam'; car_body(st)
    if st == 'fam': roof_rack()

# ======================================================================= the bus
def bus_body():
    cream = paint(C['cream'], 0.5); teal = paint(C['teal'], 0.45); gl = glass(); dark = matte(V['bumper'], 0.7)
    L = 1.7; hw = 0.62
    def rings(h0, h1, grow=0.0, n=4.0, nroof=3.2, z1=None):
        g = grow
        return [(-L - g + 0.09, hw - 0.1 + g, h0 + 0.05, h1 - 0.1, 2.8), (-L - g + 0.17, hw - 0.02 + g, h0 + 0.01, h1 - 0.02, nroof),
                (-L + 0.3, hw + g, h0, h1, n), (L - 0.3, hw + g, h0, h1, n), (L - g - 0.17, hw - 0.02 + g, h0 + 0.01, h1 - 0.02, nroof), (L + g - 0.09, hw - 0.1 + g, h0 + 0.05, h1 - 0.1, 2.8)]
    # the tub holds the teal band, the cream upper body rises from it
    low = skin(rings(0.27, 0.76, 0.012, 4.2), teal, name='band')
    up = skin(rings(0.7, 1.6, 0.0, 4.6, 3.4), cream, name='upper')
    wr = 0.3; wz = 0.3; wy = hw
    cut = []
    for sx in (-1.0, 1.0):
        for sy in (-1, 1): cut.append(disc_y(sx * 1.06, sy * (hw + 0.03), wz, wr + 0.05, 0.36, matte('#000000'), 0, 28))
    cutout(low, cut)
    for sx in (-1.0, 1.0):
        for sy in (-1, 1):
            disc_y(sx * 1.06, sy * (hw - 0.18 + 0.012), wz, wr + 0.04, 0.02, matte('#2A2D33', 0.9), 0, 28)
            wheel(sx * 1.06, sy * (hw - 0.09), wz, wr, 0.19)
    # windows along the sides (a gap between each pane is a cream pillar); the door is on the right (-Y), near the front
    ys = hw + 0.004
    for i in range(7): rbox(-1.2 + i * 0.4, ys, 0.99, 0.33, 0.03, 0.46, gl, 0.05)
    for i in range(5): rbox(-1.2 + i * 0.4, -ys, 0.99, 0.33, 0.03, 0.46, gl, 0.05)
    # the door: two tall glass leaves in a teal frame, a step and a handrail
    dx0 = 0.98
    rbox(dx0, -ys - 0.003, 0.42, 0.56, 0.025, 1.08, matte(C['tealD'], 0.5), 0.04)
    for dx in (-0.12, 0.12): rbox(dx0 + dx, -ys - 0.018, 0.5, 0.2, 0.02, 0.92, gl, 0.04)
    rbox(dx0, -ys - 0.05, 0.31, 0.54, 0.14, 0.06, matte(C['mustard'], 0.55), 0.025)
    tube((1.31, -hw - 0.045, 0.42), (1.31, -hw - 0.045, 1.42), 0.02, matte(C['mustard'], 0.45), caps=True)
    # front: a big windscreen, a plain sign panel, lights, bumper
    xf = L - 0.085
    rbox(xf, 0, 0.84, 0.05, 0.98, 0.5, gl, 0.05)
    rbox(xf, 0, 1.37, 0.05, 0.62, 0.12, paint(C['mustard'], 0.5), 0.035)
    for sy in (-1, 1):
        disc_x(L - 0.03, sy * 0.4, 0.55, 0.095, 0.07, matte(C['cream'], 0.4), 0.015, 28)
        disc_x(L - 0.015, sy * 0.4, 0.55, 0.072, 0.06, lamp(V['warm'], 0.9), 0.01, 28)
        # mirrors on short stalks
        tube((L - 0.24, sy * 0.62, 1.18), (L - 0.2, sy * 0.72, 1.16), 0.016, matte(C['tealD'], 0.6))
        rbox(L - 0.2, sy * 0.74, 1.04, 0.06, 0.04, 0.2, matte(C['tealD'], 0.6), 0.02)
        rbox(-L + 0.03, sy * 0.4, 0.58, 0.05, 0.16, 0.1, lamp(V['red'], 0.9), 0.02)
    rbox(L - 0.01, 0, 0.19, 0.1, 1.12, 0.16, dark, 0.06)
    rbox(L + 0.012, 0, 0.3, 0.04, 0.42, 0.09, matte(V['plate'], 0.6), 0.02)
    rbox(-L + 0.01, 0, 0.19, 0.1, 1.12, 0.16, dark, 0.06)
    # rear window and roof vent
    rbox(-L + 0.075, 0, 0.98, 0.05, 0.78, 0.4, gl, 0.05)
    rbox(-L + 0.0, 0, 0.3, 0.04, 0.3, 0.075, matte(V['plate'], 0.6), 0.02)
    rbox(-0.5, 0, 1.585, 0.55, 0.36, 0.06, paint(C['teal'], 0.45), 0.028)
    # a cream band stripe where the teal meets the cream
    for sy in (-1, 1): rbox(0, sy * (hw + 0.006), 0.72, 3.0, 0.014, 0.04, matte(C['cream'], 0.5), 0.005)

@kind('bus')
def bus(st): bus_body()

# ======================================================================= the delivery scooter
def scooter_body():
    body = paint('#8FB57A', 0.45); bodyD = paint('#6E9A5E', 0.5); seat = matte('#7A4A2E', 0.6); dark = matte(V['bumper'], 0.7)
    wr = 0.19; wf = 0.56; wb = -0.47; gl = glass()
    for xx in (wf, wb): wheel(xx, 0, wr, wr, 0.11, 0.55)
    # rear cowl, floorboard, seat
    skin([(-0.68, 0.14, 0.34, 0.5, 2.6), (-0.6, 0.22, 0.28, 0.62, 3.4), (-0.35, 0.25, 0.26, 0.64, 4.0), (-0.05, 0.24, 0.25, 0.6, 3.6), (0.05, 0.19, 0.27, 0.5, 3.0)], body, name='cowl')
    skin([(-0.52, 0.17, 0.585, 0.64, 3.0), (-0.45, 0.22, 0.585, 0.7, 3.4), (-0.1, 0.22, 0.595, 0.72, 4.0), (0.02, 0.2, 0.6, 0.7, 3.4), (0.07, 0.15, 0.62, 0.68, 3.0)], seat, name='seat')
    rbox(0.2, 0, 0.17, 0.5, 0.42, 0.07, body, 0.035)
    rbox(0.2, 0, 0.1, 0.3, 0.2, 0.08, bodyD, 0.03)
    # wheel guards and steering column / leg shield
    for xx, rz, s in ((wf, 0, 1.0), (wb, 0, 1.0)):
        sk = skin([(xx - 0.2, 0.065, wr + 0.1, wr + 0.14, 2.8), (xx - 0.14, 0.085, wr + 0.07, wr + 0.17, 3.0), (xx, 0.085, wr + 0.045, wr + 0.185, 3.0),
                   (xx + 0.14, 0.085, wr + 0.07, wr + 0.17, 3.0), (xx + 0.2, 0.065, wr + 0.1, wr + 0.14, 2.8)], body, name='guard')
    shield = rbox(0.36, 0, 0.2, 0.12, 0.4, 0.75, body, 0.055); shield.rotation_euler = (0, math.radians(-14), 0)
    tube((0.48, 0.045, 0.2), (0.57, 0.052, 0.78), 0.022, dark); tube((0.48, -0.045, 0.2), (0.57, -0.052, 0.78), 0.022, dark)
    tube((0.57, 0.055, 0.78), (0.45, 0.055, 0.96), 0.022, dark); tube((0.57, -0.055, 0.78), (0.45, -0.055, 0.96), 0.022, dark)
    # head lamp housing and the lamp
    ball(0.49, 0, 0.93, 0.15, body, 1.0, 1.15, 0.8)
    disc_x(0.62, 0, 0.93, 0.085, 0.06, matte(C['cream'], 0.4), 0.015, 28)
    disc_x(0.64, 0, 0.93, 0.066, 0.05, lamp(V['warm'], 0.9), 0.01, 28)
    tube((0.45, -0.31, 1.0), (0.45, 0.31, 1.0), 0.026, dark)
    for sy in (-1, 1): cyl(0.45, sy * 0.3, 0.96, 0.034, 0.12, matte(C['cream'], 0.5), 0.015, 16)
    # tail lamp, a rear rack, a plain square delivery box
    rbox(-0.74, 0, 0.5, 0.05, 0.18, 0.08, lamp(V['red'], 0.9), 0.02)
    rbox(-0.57, 0, 0.7, 0.5, 0.3, 0.04, dark, 0.015)
    bx = paint(C['mustard'], 0.5)
    rbox(-0.6, 0, 0.74, 0.46, 0.44, 0.42, bx, 0.07)
    rbox(-0.6, 0, 1.12, 0.5, 0.48, 0.06, paint(C['terra'], 0.5), 0.03)
    rbox(-0.6, 0.0, 1.02, 0.48, 0.46, 0.04, paint(C['terra'], 0.5), 0.015)
    rider()

def rider():
    jacket = paint(C['indigo'], 0.7); trouser = matte('#4A4F59', 0.8); helmet = paint(C['cream'], 0.35); glove = matte(C['terra'], 0.7)
    shoe = matte(V['shoe'], 0.7); stripe = paint(C['terra'], 0.45)
    hip = Vector((-0.17, 0, 0.72)); sh = Vector((-0.07, 0, 1.0))
    tube(hip + Vector((0, 0, -0.04)), sh, 0.17, jacket, 0.15)                                    # body
    ball(-0.09, 0, 0.87, 0.205, jacket, 1.0, 1.0, 1.05)
    ball(-0.2, 0, 0.9, 0.17, paint(C['terra'], 0.7), 0.7, 0.9, 1.0)                                  # a little bag on the back
    for sy in (-1, 1):
        # arms to the handlebar
        tube((-0.04, sy * 0.19, 1.02), (0.17, sy * 0.275, 0.97), 0.055, jacket)
        tube((0.17, sy * 0.275, 0.97), (0.43, sy * 0.28, 1.0), 0.05, jacket)
        ball(0.45, sy * 0.28, 1.0, 0.065, glove)
        # legs: thigh forward, shin down to the floorboard
        tube((-0.15, sy * 0.1, 0.72), (0.15, sy * 0.13, 0.76), 0.078, trouser)
        tube((0.15, sy * 0.13, 0.76), (0.27, sy * 0.13, 0.3), 0.068, trouser)
        s = ball(0.31, sy * 0.13, 0.25, 0.085, shoe, 1.45, 0.95, 0.65)
    # the head: a full helmet with a dark visor, so there is no face
    hc = Vector((-0.04, 0, 1.28))
    ball(hc.x, 0, hc.z, 0.205, helmet, 1.0, 1.0, 1.0)
    ball(hc.x + 0.045, 0, hc.z - 0.1, 0.15, helmet, 1.1, 1.0, 0.78)                               # chin guard
    vis = ball(hc.x + 0.115, 0, hc.z + 0.025, 0.2, glass(), 0.5, 0.82, 0.5)
    tor = torus(hc.x, 0, hc.z + 0.01, 0.2, 0.017, stripe, (0, 0, 0))
    tube((hc.x, -0.0, hc.z - 0.14), (hc.x, 0, hc.z - 0.17), 0.0)  if False else None

@kind('scooter')
def scooter(st): scooter_body()

# ======================================================================= the child's bicycle
_FAT = [1.0]
def _t(p, q, r, m, **k): return tube(p, q, r * _FAT[0], m, **k)

def bike_wheel(x, r=0.21):
    tyre = matte(C['cream'], 0.55); rim = matte(V['ink'], 0.5); metal = matte('#8FA0A8', 0.4)
    z = r; rot = (math.pi / 2, 0, 0)
    torus(x, 0, z, r - 0.034 * _FAT[0] ** 0.5, 0.034 * _FAT[0] ** 0.5, tyre, rot, 48, 14)
    torus(x, 0, z, r - 0.07, 0.011, rim, rot, 48, 10)
    for i in range(8):
        a = i * math.pi / 4 + 0.2
        _t((x, 0, z), (x + math.cos(a) * (r - 0.075), 0, z + math.sin(a) * (r - 0.075)), 0.005, metal, caps=False)
    disc_y(x, 0, z, 0.032, 0.085, rim, 0.01, 20)

def bicycle(fat=1.0):
    """The child's bicycle, upright, heading +X, wheels on z = 0 (saddle top 0.52 m, handlebars 0.70 m). Returns what it made."""
    _FAT[0] = fat; before = set(bpy.data.objects)
    fr = paint(C['teal'], 0.4); frD = paint(C['tealD'], 0.45); dark = matte(V['ink'], 0.6); cream = matte(C['cream'], 0.5)
    r = 0.21; RH = (-0.38, 0, r); FH = (0.38, 0, r); BB = (0.0, 0, 0.255); ST = (-0.12, 0, 0.47); HT = (0.3, 0, 0.58); HB = (0.33, 0, 0.45)
    bike_wheel(RH[0], r); bike_wheel(FH[0], r)
    _t(BB, ST, 0.021, fr); _t(ST, HT, 0.021, fr); _t(BB, (0.31, 0, 0.5), 0.024, fr); _t(HB, HT, 0.027, frD)
    for sy in (-1, 1):
        _t(BB, (RH[0], sy * 0.05, r), 0.014, fr); _t(ST, (RH[0], sy * 0.05, r), 0.014, fr)
        _t((0.33, sy * 0.045, 0.46), (FH[0], sy * 0.05, r), 0.015, frD)
    _t((0.33, -0.045, 0.46), (0.33, 0.045, 0.46), 0.015, frD)
    _t(ST, (-0.135, 0, 0.5), 0.016, dark)
    sad = rbox(-0.145, 0, 0.485, 0.2, 0.11, 0.035, paint(C['terra'], 0.6), 0.016); sad.rotation_euler = (0, math.radians(-4), 0)
    rbox(-0.2, 0, 0.49, 0.1, 0.12, 0.028, paint(C['terra'], 0.6), 0.014)
    # handlebars, grips, stem
    _t(HT, (0.28, 0, 0.68), 0.019, dark)
    _t((0.27, -0.19, 0.665), (0.285, 0, 0.68), 0.016, fr); _t((0.285, 0, 0.68), (0.27, 0.19, 0.665), 0.016, fr)
    for sy in (-1, 1):
        g = cyl(0, 0, -0.045, 0.03, 0.09, matte(C['terra'], 0.7), 0.012, 20); axis_y(g, 0.26, sy * 0.215, 0.66)
    # pedals, cranks, a chain wheel
    disc_y(0.0, -0.045, 0.255, 0.06, 0.012, dark, 0.004, 24)
    _t((0.0, 0.07, 0.255), (0.04, 0.07, 0.14), 0.011, dark); _t((0.0, -0.07, 0.255), (-0.04, -0.07, 0.37), 0.011, dark)
    rbox(0.045, 0.1, 0.125, 0.08, 0.06, 0.022, paint(C['terra'], 0.6), 0.008); rbox(-0.045, -0.1, 0.36, 0.08, 0.06, 0.022, paint(C['terra'], 0.6), 0.008)
    # a little wicker basket on the front
    wk = matte(V['wicker'], 0.75); wkD = matte(V['wickerD'], 0.8)
    bx0, bz = 0.495, 0.5
    rbox(bx0, 0, bz, 0.22, 0.26, 0.02, wk, 0.008)
    for (dx, dy, w, d) in ((0.11, 0, 0.018, 0.26), (-0.11, 0, 0.018, 0.26), (0, 0.13, 0.22, 0.018), (0, -0.13, 0.22, 0.018)):
        rbox(bx0 + dx, dy, bz, w, d, 0.15, wk, 0.007)
    for i in range(5):
        for dx in (-0.11, 0.11): rbox(bx0 + dx, -0.1 + i * 0.05, bz + 0.02, 0.024, 0.014, 0.12, wkD, 0.005)
        rbox(bx0 - 0.1 + i * 0.05, 0.13, bz + 0.02, 0.014, 0.024, 0.12, wkD, 0.005)
        rbox(bx0 - 0.1 + i * 0.05, -0.13, bz + 0.02, 0.014, 0.024, 0.12, wkD, 0.005)
    _t((bx0 - 0.11, -0.13, bz + 0.155), (bx0 + 0.11, -0.13, bz + 0.155), 0.012, wkD); _t((bx0 + 0.11, -0.13, bz + 0.155), (bx0 + 0.11, 0.13, bz + 0.155), 0.012, wkD)
    _t((bx0 + 0.11, 0.13, bz + 0.155), (bx0 - 0.11, 0.13, bz + 0.155), 0.012, wkD); _t((bx0 - 0.11, 0.13, bz + 0.155), (bx0 - 0.11, -0.13, bz + 0.155), 0.012, wkD)
    _t((0.3, 0, 0.6), (bx0 - 0.1, 0, bz + 0.02), 0.011, dark)
    # a little bell
    ball(0.28, 0.07, 0.705, 0.022, matte(C['mustard'], 0.4), 1, 1, 0.8)
    _FAT[0] = 1.0
    return [o for o in bpy.data.objects if o not in before]

@kind('bike')
def bike(st):
    lean = math.radians(11)
    parts = bicycle()
    pv = kit.group([o for o in parts if o.parent is None], 'bike'); pv.rotation_euler = (-lean, 0, 0)
    # the kickstand: from near the rear hub down to the ground on the visible side
    bpy.context.view_layer.update()
    hub = pv.matrix_world @ Vector((-0.30, 0.0, 0.215))
    foot = Vector((-0.40, 0.205, 0.0))
    tube(hub, foot, 0.014, matte(V['ink'], 0.5))
    rbox(foot.x, foot.y, 0.0, 0.07, 0.05, 0.018, matte(V['ink'], 0.5), 0.008)

# ======================================================================= icons
def _icon(build, s, rz, zs=1.0, lift=0.22, shift=(0, 0, 0)):
    before = set(bpy.data.objects); build()
    made = [o for o in bpy.data.objects if o not in before]
    g = kit.group([o for o in made if o.parent is None], 'ic'); g.scale = (s, s, s * zs); g.rotation_euler = (0, 0, rz)
    g.location = (shift[0], shift[1], lift + shift[2])

@icon('car')
def icon_car(): _icon(lambda: car_body('a'), 0.64, math.radians(-8), 1.28, 0.27)
@icon('bus')
def icon_bus(): _icon(bus_body, 0.37, math.radians(-8), 1.1, 0.27)
@icon('bike')
def icon_bike(): _icon(lambda: bicycle(fat=1.7), 1.12, math.radians(-8), 1.0, 0.2)

# registry used by bake.py
