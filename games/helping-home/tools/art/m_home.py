"""Helping Home art: the rest of the home (hall, kitchen, yard, landing and the bedrooms, bathroom) in the look of
models.py: warm, chunky, bevelled, matte, patterns from khatam / weave (runs inside Blender; see kit.py).

Registers into the shared tables of models.py (FLOORS, FEATURES) and exports KINDS / ICONS / PLACES for bake.py.
Every kind is built with the middle of its footprint on the origin, z = 0 the floor, in its "rot 0" direction:
  faces +X (back on x = -w/2, so it stands against the R wall as is):  sofa-like things: shoerack armchair bed bigbed bath
  faces +Y (back on y = -d/2, so it stands against the L wall as is):  bench counter sink fridge wardrobe desk dresser cot ...
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
def place(name):
    def deco(fn): PLACES[name] = fn; return fn
    return deco

# a few neighbours of the palette
C.update(creamT='#F6ECD6', sageT='#CBDDB8', blueT='#CDE3EF', whiteT='#F8FBFC', mint='#BFE0D6', steel='#C8D3D8', steelD='#8FA0A8',
         ink='#2F3A45', soil='#6A4A33', sand='#E0BC7C', grass='#82BC66', stone='#CDC3AE', water='#9ED6EA', whiteP='#F4EFE4',
         roseD='#C96F6F', sky2='#BFE0EE')

# ---------- little helpers ----------
def bx(cx, cy, z, w, d, h, m, bevel=0.03, name='box'):
    """A box centred on (cx, cy) in plan, its bottom at z."""
    return box(cx - w / 2, cy - d / 2, z, w, d, h, m, bevel, name)
def fab(c, sheen=0.5): return mat(c, 0.95, sheen=sheen)
def put(objs, x, y, z=0, rz=0.0):
    """Group parts built round the origin and set the group down at (x, y, z) turned rz radians."""
    g = kit.group(list(objs), 'g'); g.location = (x, y, z); g.rotation_euler = (0, 0, rz); return g
def torus(x, y, z, R, r, m, sz=1.0, rot=(0, 0, 0), major=40, minor=14):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=major, minor_segments=minor, location=(x, y, z))
    o = bpy.context.object; o.scale = (1, 1, sz); o.rotation_euler = rot; o.name = 'torus'
    return kit._finish(o, m, 0)
def ctube(p0, p1, r, m, r2=None, caps=True): return tube(p0, p1, r, m, r2, caps=caps)
def rcyl(x, y, z, r, h, m, axis='y', bevel=0.01, verts=32):
    """A cylinder lying along y (axis 'y') or x ('x'), centred on (x, y, z)."""
    o = cyl(0, 0, -h / 2, r, h, m, bevel, verts)
    o.rotation_euler = (math.pi / 2, 0, 0) if axis == 'y' else (0, math.pi / 2, 0); o.location = (x, y, z)
    return o
def flat(pts, thick, m, loc=(0, 0, 0), rz=0.0, bevel=0.008):
    """A cut-out shape standing in the XZ plane (pts = [(x, z)]), thick along Y: cloth, a coat."""
    me = bpy.data.meshes.new('flat'); bm = bmesh.new()
    f = [bm.verts.new((p[0], -thick / 2, p[1])) for p in pts]; b = [bm.verts.new((p[0], thick / 2, p[1])) for p in pts]
    bm.faces.new(f); bm.faces.new(list(reversed(b))); n = len(pts)
    for i in range(n): bm.faces.new((f[i], f[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('flat', me); bpy.context.collection.objects.link(o); o.location = loc; o.rotation_euler = (0, 0, rz)
    return kit._finish(o, m, bevel)
def glass(col='#DDF1F8', alpha=0.28):
    key = ('glass', col, alpha)
    if key in kit._m: return kit._m[key]
    m = bpy.data.materials.new('glass'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = kit.hexc(col); b.inputs['Roughness'].default_value = 0.12; b.inputs['Alpha'].default_value = alpha
    kit._m[key] = m; return m
def vpanel(m, cx, cy, cz, w, h, t=0.012, tilt=0.0):
    """A flat picture (a pattern) standing upright, its face toward +Y, middle at (cx, cy, cz); tilt leans the top back."""
    p = box(0, 0, 0, w, h, t, None, 0); p.data.materials.append(m)
    p.rotation_euler = (-math.pi / 2 + tilt, 0, 0); p.location = (cx, cy, cz); return p
def cush1(): return tex_mat('cush1', lambda s: khatam(s, C['mustard'], C['cream'], C['terra'], 2), 256, 0.98)
def cush2(): return tex_mat('cush2', lambda s: weave(s, C['terra'], '#E58C63', 8), 256, 0.98)
def cush3(): return tex_mat('cush3', lambda s: weave(s, C['teal'], C['tealD'], 8), 256, 0.98)
def pat(k): return tex_mat('frame-' + k, M.PATS[k], 256, 0.8)

# ---------- floors (painted pictures; the shell lays them over the whole floor) ----------
def _noise(n, seed, amp, blur=0):
    r = np.random.RandomState(seed).rand(n, n).astype('float32') - 0.5
    for _ in range(blur): r = (r + np.roll(r, 1, 0) + np.roll(r, -1, 0) + np.roll(r, 1, 1) + np.roll(r, -1, 1)) / 5
    return r * amp
def _tiles(n, a, b, grout, cells):
    u, v = M._grid(n); fx = (u * cells) % 1; fy = (v * cells) % 1
    chk = ((np.floor(u * cells) + np.floor(v * cells)) % 2 == 0)
    ca, cb, cg = np.array(rgb(a)), np.array(rgb(b)), np.array(rgb(grout)); out = np.zeros((n, n, 3), 'float32')
    e = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy)); gap = e < 0.028
    tone = np.floor(u * cells) * 7 + np.floor(v * cells) * 13; var = (np.sin(tone * 12.9898) * 0.5 + 0.5) * 0.035 - 0.015
    soft = np.clip(e * 9, 0, 1) * 0.03
    for k in range(3):
        ch = np.where(chk, ca[k], cb[k]) + var + soft; out[:, :, k] = np.where(gap, cg[k], ch)
    return out
def tiles_kitchen(n): return _tiles(n, '#F4E8CB', '#C2D6B0', '#DCCFAE', 6)
def tiles_bath(n): return _tiles(n, '#B7D9EC', '#F3F9FB', '#9CC4D8', 5)
def _carpet(n, base, alt, seed):
    u, v = M._grid(n); cb, ca = np.array(rgb(base)), np.array(rgb(alt)); out = np.zeros((n, n, 3), 'float32')
    stripe = (np.floor(u * 8) + np.floor(v * 8)) % 2 == 0; nz = _noise(n, seed, 0.06, 1)
    for k in range(3): out[:, :, k] = np.where(stripe, cb[k], cb[k] * 0.35 + ca[k] * 0.65) + nz
    return out
def carpet_sage(n): return _carpet(n, '#A8CDB6', '#9AC3AB', 4)
def carpet_rose(n): return _carpet(n, '#EBC3BC', '#E4B7B0', 5)
def carpet_sky(n): return _carpet(n, '#AFCBE3', '#A2C1DC', 6)
M.FLOORS['tiles'] = (tiles_kitchen, 0.4, 3.0)
M.FLOORS['tilesblue'] = (tiles_bath, 0.4, 2.0)
M.FLOORS['carpet'] = (carpet_sage, 0.98, 2.0)
M.FLOORS['carpet2'] = (carpet_rose, 0.98, 2.0)
M.FLOORS['carpet3'] = (carpet_sky, 0.98, 2.0)

# ---------- wall features ----------
_wall = M._wall
def _flat_on_wall(wall, pts, thick, m, u, n, z):
    """A cut-out shape hung on a wall: its origin at (u along the wall, n out from it, z)."""
    if wall == 'R': return flat(pts, thick, m, (n, u, z), math.pi / 2)
    return flat(pts, thick, m, (u, n, z), 0)

COAT = [(-0.06, 0), (0.06, 0), (0.20, -0.06), (0.29, -0.46), (0.22, -0.50), (0.15, -0.20), (0.16, -0.62), (-0.16, -0.62), (-0.15, -0.20), (-0.22, -0.50), (-0.29, -0.46), (-0.20, -0.06)]
def f_hooks(wall, f, sp):
    """A wooden coat rail with pegs, a coat and a bag hanging from it."""
    wbox, wpt = _wall(wall); at, wd, z = f['at'], f.get('w', 1.1), f.get('z', 1.55)
    wbox(at, 0, z, wd, 0.045, 0.13, mat(C['woodL'], 0.55), 0.02, 'rail')
    brass = mat(C['brass'], 0.35, 0.9)
    for i in range(4):
        u = at + wd * (0.14 + 0.24 * i); tube(wpt(u, 0.04, z + 0.065), wpt(u, 0.15, z + 0.065), 0.014, brass); ball(*wpt(u, 0.15, z + 0.065), 0.026, brass)
    u = at + wd * 0.14; _flat_on_wall(wall, COAT, 0.05, mat(C['teal'], 0.9, sheen=0.4), u, 0.17, z + 0.03)
    u2 = at + wd * 0.62
    p = wpt(u2, 0.2, z - 0.28); b = bx(0, 0, 0, 0.2, 0.09, 0.26, mat(C['terra'], 0.85), 0.045); b.location = p
    if wall == 'R': b.rotation_euler = (0, 0, math.pi / 2)
    tube(wpt(u2, 0.15, z + 0.07), wpt(u2, 0.2, z - 0.15), 0.012, mat(C['woodD'], 0.7))
    u3 = at + wd * 0.86; _flat_on_wall(wall, [(-0.14, 0), (0.14, 0), (0.2, -0.1), (0.2, -0.3), (-0.2, -0.3), (-0.2, -0.1)], 0.05, mat(C['mustard'], 0.9, sheen=0.4), u3, 0.17, z + 0.03)

def f_towel(wall, f, sp):
    """A towel rail with two towels."""
    wbox, wpt = _wall(wall); at, wd, z = f['at'], f.get('w', 0.9), f.get('z', 1.25); brass = mat(C['brass'], 0.35, 0.9)
    for u in (at + 0.03, at + wd - 0.03): tube(wpt(u, 0.02, z), wpt(u, 0.13, z), 0.015, brass); ball(*wpt(u, 0.13, z), 0.024, brass)
    tube(wpt(at, 0.13, z), wpt(at + wd, 0.13, z), 0.016, brass)
    for (u0, w0, c, st, drop) in [(at + 0.04, 0.36, C['teal'], C['cream'], 0.62), (at + 0.5, 0.34, C['cream'], C['terra'], 0.46)]:
        wbox(u0, 0.095, z - drop, w0, 0.014, drop + 0.04, fab(c), 0.006); wbox(u0, 0.158, z - drop + 0.02, w0, 0.014, drop, fab(c), 0.006)
        wbox(u0, 0.095, z + 0.026, w0, 0.077, 0.02, fab(c), 0.008)
        wbox(u0 - 0.002, 0.172, z - drop + 0.1, w0 + 0.004, 0.006, 0.07, mat(st, 0.9), 0.002)

def f_kshelf(wall, f, sp):
    """A kitchen wall shelf: plates, cups and two jars."""
    wbox, wpt = _wall(wall); at, wd, z = f['at'], f.get('w', 1.4), f.get('z', 1.5)
    wbox(at, 0, z, wd, 0.26, 0.05, mat(C['woodL'], 0.6), 0.015)
    for u in (at + 0.12, at + wd - 0.12): wbox(u - 0.025, 0, z - 0.13, 0.05, 0.2, 0.13, mat(C['woodD'], 0.6), 0.012)
    for i, c in enumerate([C['cream'], C['teal'], C['cream'], C['teal']]):
        p = wpt(at + 0.2, 0.13, z + 0.05 + i * 0.022); cyl(p[0], p[1], p[2], 0.1, 0.02, mat(c, 0.4), 0.008, 32)
    for i, c in enumerate([C['mustard'], C['terra'], C['indigo']]):
        p = wpt(at + 0.48 + i * 0.13, 0.13, z + 0.05); lathe(p[0], p[1], p[2], [(0.001, 0), (0.04, 0), (0.05, 0.03), (0.05, 0.08), (0.035, 0.1), (0.001, 0.1)], mat(c, 0.35))
    for i, (c, h) in enumerate([(C['terra'], 0.2), (C['sage'], 0.15)]):
        p = wpt(at + wd - 0.52 + i * 0.26, 0.13, z + 0.05)
        lathe(p[0], p[1], p[2], [(0.001, 0), (0.06, 0), (0.075, 0.04), (0.075, h - 0.03), (0.06, h), (0.001, h)], mat(c, 0.35))
        cyl(p[0], p[1], p[2] + h, 0.062, 0.025, mat(C['woodD'], 0.6), 0.008, 24); ball(p[0], p[1], p[2] + h + 0.035, 0.02, mat(C['woodD'], 0.6))

def _stairs_up(wall, f, sp):
    """A doorway on a back wall with a stairwell beyond: five steps climbing away from the room. Everything beyond the wall
    is kept under the line of sight through the top of the opening, so nothing shows above the wall."""
    wbox, wpt = _wall(wall); dx, dw, dh = f['at'], f['w'], f.get('h', 2.05); fr = mat(C['woodL'], 0.6)
    run, rise, ext = 0.3, 0.2, 1.9; tread = mat('#D9A56E', 0.8); riser = mat('#A8764B', 0.9)
    for i in range(5):
        n = -T_ - (i + 1) * run
        wbox(dx - ext, n, 0, dw + ext - 0.02, run, rise * (i + 1) - 0.03, riser, 0.01, 'riser')
        wbox(dx - ext, n, rise * (i + 1) - 0.03, dw + ext - 0.02, run + 0.02, 0.03, tread, 0.012, 'tread')
    wbox(dx - ext, -T_ - 5 * run - 0.05, 0, dw + ext - 0.02, 0.04, 1.05, mat('#C28F60', 0.95), 0, 'well')
    wbox(dx + dw - 0.12, -T_ - 0.1, 0, 0.06, 0.06, 1.1, fr, 0.015); ball(*wpt(dx + dw - 0.09, -T_ - 0.07, 1.13), 0.04, fr)
    tube(wpt(dx + dw - 0.09, -T_ - 0.07, 1.0), wpt(dx + dw - 0.09, -T_ - 1.0, 1.0 + 0.62), 0.022, fr)
    wbox(dx - 0.09, -0.03, 0, 0.09, 0.09, dh + 0.09, fr, 0.02); wbox(dx + dw, -0.03, 0, 0.09, 0.09, dh + 0.09, fr, 0.02); wbox(dx - 0.09, -0.03, dh, dw + 0.18, 0.09, 0.09, fr, 0.02)
T_ = M.T
_door_plain = M.FEATURES['door']
def f_door2(wall, f, sp):
    if f.get('style') == 'stairs': _stairs_up(wall, f, sp)
    else: _door_plain(wall, f, sp)
M.FEATURES['door'] = f_door2
M.FEATURES['hooks'] = f_hooks; M.FEATURES['towel'] = f_towel; M.FEATURES['kshelf'] = f_kshelf

# ---------- rugs ----------
def _fringe(x, y, w, d):
    fr = mat(C['cream'], 0.98)
    for i in range(int(w / 0.09)):
        box(x + 0.02 + i * 0.09, y - 0.07, 0, 0.045, 0.08, 0.012, fr, 0); box(x + 0.02 + i * 0.09, y + d - 0.01, 0, 0.045, 0.08, 0.012, fr, 0)
def _rug(name, w, d, bg, star, line, bord, cells=4):
    m = tex_mat(name, lambda s: khatam(s, bg, star, line, cells, border=bord), 1024, 0.98)
    box(-w / 2, -d / 2, 0, w, d, 0.025, m, 0.012, 'rug'); _fringe(-w / 2, -d / 2, w, d)
@kind('rug2')
def k_rug2(st): _rug('rug2', 2.2, 1.7, C['cream'], C['indigo'], C['mustard'], (C['teal'], C['cream']), 3)
@kind('rugsmall')
def k_rugsmall(st): _rug('rugsmall', 1.6, 1.1, C['cream'], C['terra'], C['teal'], (C['sage'], C['cream']), 3)
@kind('rugr')
def k_rugr(st):
    cyl(0, 0, 0, 1.0, 0.022, mat(C['indigo'], 0.98), 0.01, 64); cyl(0, 0, 0.0, 0.93, 0.026, mat(C['mustard'], 0.98), 0.008, 64)
    m = tex_mat('rugr', lambda s: khatam(s, C['cream'], C['teal'], C['terra'], 3), 512, 0.98)
    c = cyl(0, 0, 0, 0.88, 0.03, None, 0.008, 64); c.data.materials.append(m)
def _runner(n):
    u, v = M._grid(n); out = np.zeros((n, n, 3), 'float32'); a = u - 0.5; cell = 3.2 / 8; b = ((v * 8) % 1 - 0.5) * cell; x = a * 0.8
    diam = (np.abs(x) / 0.2 + np.abs(b) / 0.2) < 1; diam2 = (np.abs(x) / 0.11 + np.abs(b) / 0.11) < 1
    edge = np.abs(a); band = (edge > 0.40); line = (edge > 0.355) & (edge < 0.385)
    cols = dict(bg=np.array(rgb(C['cream'])), d=np.array(rgb(C['teal'])), d2=np.array(rgb(C['mustard'])), band=np.array(rgb(C['indigo'])), line=np.array(rgb(C['terra'])))
    for k in range(3):
        ch = np.full((n, n), cols['bg'][k]); ch = np.where(diam, cols['d'][k], ch); ch = np.where(diam2, cols['d2'][k], ch)
        ch = np.where(line, cols['line'][k], ch); ch = np.where(band, cols['band'][k], ch); out[:, :, k] = ch
    return out
@kind('runner')
def k_runner(st):
    box(-0.4, -1.6, 0, 0.8, 3.2, 0.022, tex_mat('runner', _runner, 1024, 0.98), 0.01, 'runner'); _fringe(-0.4, -1.6, 0.8, 3.2)

@kind('dmat')
def k_dmat(st):
    cols = dict(k=(C['mustard'], '#F3D98D'), b=(C['terra'], '#F5CDB0'))[st or 'k']
    box(-0.5, -0.3, 0, 1.0, 0.6, 0.022, tex_mat('dmat-' + (st or 'k'), lambda s: weave(s, cols[0], cols[1], 10), 256, 0.98), 0.01, 'dmat'); _fringe(-0.5, -0.3, 1.0, 0.6)

# ======================================================================================================
# HALL
# ======================================================================================================
@kind('bench')
def k_bench(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6)
    bx(0, 0, 0.33, 1.2, 0.42, 0.06, wood, 0.025)
    for s in (-1, 1):
        bx(s * 0.5, 0, 0.0, 0.07, 0.36, 0.34, dk, 0.02); bx(s * 0.5, 0, 0.0, 0.09, 0.4, 0.04, dk, 0.015)
    bx(0, 0, 0.12, 1.0, 0.04, 0.05, dk, 0.015)
    for (x, t) in [(-0.27, cush1()), (0.27, cush2())]:
        c = box(0, 0, 0, 0.46, 0.34, 0.07, None, 0.035); c.data.materials.append(t); c.location = (x, 0, 0.425)

def shoe(col, s=1.0):
    """A chunky trainer, toe toward +x, the middle of the sole on the origin, 0.52 m long at s = 1."""
    cream = mat(C['cream'], 0.6); m = mat(col, 0.7); dk = mat(C['ink'], 0.8)
    o = [bx(0, 0, 0.0, 0.52, 0.22, 0.06, cream, 0.03), ball(-0.03, 0, 0.12, 0.13, m, 1.75, 0.92, 0.85), ball(0.2, 0, 0.085, 0.105, cream, 1.05, 0.98, 0.78),
         ball(-0.13, 0, 0.215, 0.065, dk, 1.2, 1.0, 0.4), ball(0.01, 0, 0.215, 0.06, cream, 1.3, 0.9, 0.5)]
    for i in range(3): o.append(bx(0.06 + i * 0.04, 0, 0.2 - i * 0.012, 0.022, 0.16, 0.016, cream, 0.006))
    g = kit.group(o, 'shoe'); g.scale = (s, s, s); return g
@kind('shoerack')
def k_shoerack(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6); back = mat(C['wood'], 0.7)
    bx(-0.165, 0, 0.04, 0.02, 0.96, 0.7, back, 0.008)
    for s in (-1, 1): bx(0, s * 0.475, 0.0, 0.34, 0.05, 0.78, wood, 0.02)
    for z in (0.06, 0.29, 0.52): bx(0, 0, z, 0.34, 0.96, 0.04, wood, 0.015)
    bx(0, 0, 0.75, 0.38, 1.04, 0.045, dk, 0.02)
    cols = [C['terra'], C['teal'], C['mustard'], C['indigo'], C['sage'], C['rose']]
    spots = [(0.1, -0.28, 0.06, 0.06), (0.1, 0.22, 0.06, -0.05), (0.08, -0.25, 0.29, 0.0), (0.08, 0.05, 0.29, 0.12), (0.1, 0.3, 0.29, -0.08), (0.09, -0.12, 0.52, 0.0), (0.09, 0.2, 0.52, 0.05)]
    for i, (x, y, z, r) in enumerate(spots):
        sh = shoe(cols[i % 6], 0.52); sh.location = (x - 0.02, y, z + 0.04); sh.rotation_euler = (0, 0, math.radians(8) + r)

@kind('jar')
def k_jar(st):
    wood = mat(C['woodL'], 0.5); dk = mat(C['woodD'], 0.6); brass = mat(C['brass'], 0.3, 0.9)
    cyl(0, 0, 0.0, 0.2, 0.04, dk, 0.015, 40); cyl(0, 0, 0.0, 0.06, 0.6, dk, 0.015, 24); cyl(0, 0, 0.56, 0.27, 0.06, wood, 0.02, 48)
    lathe(0, 0, 0.2, [(0.06, 0), (0.11, 0.1), (0.06, 0.25)], dk)
    # the jar: glass with gold coins inside, a brass lid with a slot
    for i in range(14):
        a = i * 2.4; r = 0.035 + 0.02 * (i % 3); z = 0.62 + (i // 4) * 0.014
        c = cyl(math.cos(a) * r, math.sin(a) * r, z, 0.058, 0.013, brass, 0.004, 24); c.rotation_euler = (math.radians(6 * ((i % 3) - 1)), math.radians(5 * ((i % 2) * 2 - 1)), a)
    lathe(0, 0, 0.62, [(0.001, 0), (0.1, 0), (0.115, 0.03), (0.12, 0.2), (0.1, 0.27), (0.075, 0.3), (0.075, 0.32), (0.06, 0.32), (0.06, 0.3)], glass(), 40)
    cyl(0, 0, 0.94, 0.082, 0.03, brass, 0.01, 32); bx(0, 0, 0.965, 0.09, 0.012, 0.008, mat(C['ink'], 0.6), 0.002)
    for (x, y, a) in [(0.17, 0.1, 0.4), (0.12, -0.12, 1.1)]:
        c = cyl(x, y, 0.62, 0.045, 0.012, brass, 0.004, 24); c.rotation_euler = (0, 0, a)

# ======================================================================================================
# LIVING ROOM additions
# ======================================================================================================
@kind('armchair')
def k_armchair(st):
    body = fab(C['terra']); dark = fab('#B5573A'); wood = mat(C['woodD'], 0.6)
    for (ax, ay) in [(-0.4, -0.4), (0.34, -0.4), (-0.4, 0.34), (0.34, 0.34)]: cyl(ax + 0.03, ay + 0.03, 0, 0.035, 0.1, wood, 0.01, 16)
    box(-0.45, -0.45, 0.09, 0.9, 0.9, 0.2, dark, 0.06)
    box(-0.45, -0.45, 0.2, 0.26, 0.9, 0.62, body, 0.1)
    box(-0.41, -0.45, 0.2, 0.86, 0.2, 0.4, body, 0.09); box(-0.41, 0.25, 0.2, 0.86, 0.2, 0.4, body, 0.09)
    box(-0.23, -0.25, 0.27, 0.68, 0.5, 0.17, body, 0.07)
    box(-0.25, -0.24, 0.42, 0.17, 0.48, 0.36, body, 0.08)
    c = box(0, 0, 0, 0.34, 0.34, 0.12, None, 0.055); c.data.materials.append(cush3()); c.rotation_euler = (0, math.radians(-64), 0.2); c.location = (-0.08, 0.0, 0.62)

def _toy_parts(s=1.0):
    o = []
    for (R, c, z) in [(0.13, C['terra'], 0.045), (0.105, C['mustard'], 0.1), (0.085, C['teal'], 0.152), (0.065, C['sage'], 0.2)]:
        o.append(torus(0, 0, z * s, R * s, 0.034 * s, mat(c, 0.55), 1.0))
    o += [cyl(0, 0, 0, 0.14 * s, 0.03 * s, mat(C['woodD'], 0.6), 0.01, 32), cyl(0, 0, 0.02 * s, 0.018 * s, 0.27 * s, mat(C['woodL'], 0.6), 0.005, 16), ball(0, 0, 0.3 * s, 0.03 * s, mat(C['rose'], 0.5))]
    return o
@kind('toy')
def k_toy(st): _toy_parts(1.0)

@kind('toybox')
def k_toybox(st):
    teal = mat(C['teal'], 0.7); dk = mat(C['tealD'], 0.7); cream = mat(C['cream'], 0.7); wood = mat(C['woodL'], 0.6)
    bx(0, 0, 0.04, 0.78, 0.48, 0.03, dk, 0.01)
    bx(0, -0.235, 0.05, 0.8, 0.03, 0.38, teal, 0.012); bx(0, 0.235, 0.05, 0.8, 0.03, 0.38, teal, 0.012)
    bx(-0.385, 0, 0.05, 0.03, 0.44, 0.38, dk, 0.012); bx(0.385, 0, 0.05, 0.03, 0.44, 0.38, dk, 0.012)
    bx(0, -0.235, 0.4, 0.82, 0.05, 0.035, cream, 0.012); bx(0, 0.235, 0.4, 0.82, 0.05, 0.035, cream, 0.012)
    bx(-0.385, 0, 0.4, 0.05, 0.5, 0.035, cream, 0.012); bx(0.385, 0, 0.4, 0.05, 0.5, 0.035, cream, 0.012)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(sx * 0.35, sy * 0.2, 0, 0.035, 0.05, wood, 0.01, 16)
    # a khatam star plaque on the front
    vpanel(pat('a'), 0, 0.254, 0.2, 0.26, 0.26)
    # toys heaped inside: a ball, blocks, a stack of rings, a little wooden cart
    ball(-0.22, 0.02, 0.38, 0.13, mat(C['terra'], 0.6)); lathe(-0.22, 0.02, 0.38, [(0.1325, -0.015), (0.1325, 0.015)], mat(C['cream'], 0.6), 40)
    for (x, y, z, c, r) in [(0.02, -0.08, 0.3, C['mustard'], 0.3), (0.12, 0.08, 0.33, C['sage'], -0.2), (0.04, 0.1, 0.34, C['indigo'], 0.5), (-0.05, -0.02, 0.44, C['rose'], 0.8)]:
        b = box(0, 0, 0, 0.13, 0.13, 0.13, mat(c, 0.6), 0.02); b.rotation_euler = (0, 0, r); b.location = (x, y, z)
    for o in _toy_parts(0.9): o.location = o.location + Vector((0.28, -0.04, 0.33))
    cart = [bx(0, 0, 0.04, 0.2, 0.12, 0.06, mat(C['terra'], 0.6), 0.015)]
    for (x, y) in [(-0.06, -0.075), (0.06, -0.075), (-0.06, 0.075), (0.06, 0.075)]: cart.append(rcyl(x, y, 0.04, 0.035, 0.02, mat(C['woodD'], 0.6), 'y', 0.006, 20))
    put(cart, -0.02, 0.18, 0.46, 0.35)

# ======================================================================================================
# KITCHEN
# ======================================================================================================
def _knob(x, y, z, c='brass'): return ball(x, y, z, 0.022, mat(C['brass'], 0.35, 0.9))
@kind('counter')
def k_counter(st):
    cream = mat(C['cream'], 0.7); dk = mat(C['woodD'], 0.6); teal = mat(C['teal'], 0.6); top = mat(C['woodL'], 0.5); steel = mat(C['steel'], 0.35, 0.5)
    bx(0, 0.0, 0.0, 2.15, 0.56, 0.08, dk, 0.01)
    bx(-0.45, 0, 0.08, 1.3, 0.64, 0.8, cream, 0.02)
    for cx in (-0.78, -0.12):
        bx(cx, 0.325, 0.12, 0.62, 0.03, 0.72, teal, 0.015); _knob(cx + (0.2 if cx < -0.5 else -0.2), 0.36, 0.7)
        bx(cx, 0.345, 0.3, 0.38, 0.012, 0.36, mat(C['tealD'], 0.6), 0.005)
    bx(0.65, 0, 0.08, 0.9, 0.64, 0.8, mat(C['whiteP'], 0.5), 0.04)
    bx(0.65, 0.325, 0.12, 0.76, 0.03, 0.48, mat('#F1ECDD', 0.5), 0.02); bx(0.65, 0.345, 0.2, 0.5, 0.012, 0.26, mat('#34495B', 0.25), 0.008)
    tube((0.34, 0.385, 0.6), (0.96, 0.385, 0.6), 0.016, steel)
    for i in range(4): ball(0.35 + i * 0.1 + 0.12, 0.34, 0.76, 0.024, mat(C['terra'] if i == 0 else C['steelD'], 0.5))
    bx(-0.45, 0.0, 0.88, 1.34, 0.7, 0.045, top, 0.02)
    bx(0.65, 0.0, 0.88, 0.92, 0.66, 0.035, mat('#3F454E', 0.5), 0.02)
    for (x, y) in [(0.4, -0.12), (0.9, -0.12), (0.4, 0.15), (0.9, 0.15)]:
        cyl(x, y, 0.915, 0.095, 0.012, mat('#2A2F36', 0.5), 0.004, 32); cyl(x, y, 0.925, 0.04, 0.012, mat('#555B64', 0.5), 0.004, 24)
    bx(0, -0.31, 0.9, 2.2, 0.03, 0.26, mat(C['mint'], 0.5), 0.01)
    # a pot on the back hob
    p = (0.4, -0.12, 0.927); body = mat(C['terra'], 0.45)
    lathe(p[0], p[1], p[2], [(0.001, 0), (0.12, 0), (0.135, 0.03), (0.135, 0.2), (0.125, 0.215), (0.001, 0.215)], body)
    lathe(p[0], p[1], p[2] + 0.205, [(0.14, 0), (0.12, 0.03), (0.04, 0.06), (0.001, 0.065)], mat(C['cream'], 0.4)); ball(p[0], p[1], p[2] + 0.285, 0.026, mat(C['woodD'], 0.5))
    for s in (-1, 1): tube((p[0] + s * 0.13, p[1], p[2] + 0.15), (p[0] + s * 0.2, p[1], p[2] + 0.15), 0.014, mat(C['woodD'], 0.6))
    # on the worktop: three jars, a cutting board with a tomato and a cucumber
    for i, c in enumerate([C['mustard'], C['sage'], C['terra']]):
        h = 0.18 - i * 0.03; lathe(-0.95 + i * 0.0, -0.12 + i * 0.16, 0.925, [(0.001, 0), (0.06, 0), (0.07, 0.03), (0.07, h), (0.055, h + 0.02), (0.001, h + 0.02)], mat(c, 0.35))
    bx(-0.35, 0.05, 0.925, 0.4, 0.26, 0.025, mat(C['woodD'], 0.6), 0.012)
    ball(-0.45, 0.04, 0.985, 0.045, mat(C['terra'], 0.45)); tube((-0.3, 0.0, 0.96), (-0.2, 0.1, 0.96), 0.03, mat(C['leaf'], 0.5))

@kind('sink')
def k_sink(st):
    cream = mat(C['cream'], 0.7); dk = mat(C['woodD'], 0.6); teal = mat(C['teal'], 0.6); top = mat(C['woodL'], 0.5); steel = mat(C['steel'], 0.3, 0.7); inner = mat('#B8C7CE', 0.35, 0.4)
    bx(0, 0, 0.0, 1.46, 0.56, 0.08, dk, 0.01); bx(0, 0, 0.08, 1.5, 0.64, 0.8, cream, 0.02)
    for cx in (-0.37, 0.37):
        bx(cx, 0.325, 0.12, 0.7, 0.03, 0.72, teal, 0.015); _knob(cx + (0.24 if cx < 0 else -0.24), 0.36, 0.7); bx(cx, 0.345, 0.3, 0.44, 0.012, 0.36, mat(C['tealD'], 0.6), 0.005)
    bx(-0.58, 0, 0.88, 0.34, 0.7, 0.045, top, 0.02); bx(0.58, 0, 0.88, 0.34, 0.7, 0.045, top, 0.02)
    bx(0, 0.265, 0.88, 0.82, 0.17, 0.045, top, 0.02); bx(0, -0.265, 0.88, 0.82, 0.17, 0.045, top, 0.02)
    bx(0, 0.0, 0.8, 0.74, 0.4, 0.02, inner, 0.01)
    for (x, y, w, d) in [(0, 0.2, 0.76, 0.03), (0, -0.2, 0.76, 0.03), (0.38, 0, 0.03, 0.43), (-0.38, 0, 0.03, 0.43)]: bx(x, y, 0.8, w, d, 0.1, inner, 0.008)
    bx(0, 0.0, 0.855, 0.72, 0.38, 0.008, mat(C['water'], 0.15), 0.002)
    bx(0, -0.31, 0.9, 1.5, 0.03, 0.26, mat(C['mint'], 0.5), 0.01)
    ctube((0, -0.22, 0.93), (0, -0.22, 1.15), 0.024, steel); ctube((0, -0.22, 1.15), (0, -0.04, 1.17), 0.02, steel); ctube((0, -0.04, 1.17), (0, -0.04, 1.06), 0.02, steel)
    for s in (-1, 1): ball(s * 0.12, -0.22, 0.95, 0.027, mat(C['teal'] if s < 0 else C['terra'], 0.4))
    # a dish rack with plates, and a mug
    rack = [bx(0, 0, 0, 0.3, 0.2, 0.02, mat(C['woodD'], 0.6), 0.008)]
    for i in range(3): rack.append(rcyl(-0.09 + i * 0.09, 0, 0.12, 0.1, 0.014, mat(C['cream'] if i != 1 else C['teal'], 0.4), 'y', 0.004, 28))
    put(rack, -0.58, -0.05, 0.925)
    lathe(0.58, 0.05, 0.925, [(0.001, 0), (0.04, 0), (0.045, 0.09), (0.04, 0.095), (0.001, 0.095)], mat(C['mustard'], 0.4))

@kind('fridge')
def k_fridge(st):
    body = mat(C['mint'], 0.5, sheen=0.0); dk = mat('#9FC7BC', 0.5); steel = mat(C['steel'], 0.3, 0.6)
    bx(0, 0, 0.05, 0.78, 0.7, 1.74, body, 0.07)
    bx(0, 0.0, 1.22, 0.79, 0.71, 0.03, dk, 0.01)
    bx(0, 0.0, 0.0, 0.66, 0.6, 0.05, mat(C['woodD'], 0.6), 0.01)
    bx(0, 0.351, 0.1, 0.72, 0.012, 1.08, mat('#CBE9E0', 0.45), 0.006); bx(0, 0.351, 1.28, 0.72, 0.012, 0.5, mat('#CBE9E0', 0.45), 0.006)
    ctube((0.28, 0.4, 0.8), (0.28, 0.4, 1.12), 0.018, steel); ctube((0.28, 0.4, 1.34), (0.28, 0.4, 1.52), 0.018, steel)
    for p in [(0.28, 0.4, 0.8), (0.28, 0.4, 1.12), (0.28, 0.4, 1.34), (0.28, 0.4, 1.52)]: ctube((0.28, 0.357, p[2]), p, 0.012, steel)
    # a child's picture (a pattern, no picture of anything alive) and magnets
    vpanel(pat('d'), -0.1, 0.362, 1.54, 0.24, 0.24, 0.008)
    for (x, z, c, r) in [(-0.04, 1.62, C['terra'], 0.04), (0.08, 1.36, C['mustard'], 0.032), (-0.3, 1.2 + 0.0, C['indigo'], 0.034)]:
        if z > 1.3: rcyl(x, 0.362, z, r, 0.014, mat(c, 0.5), 'y', 0.004, 24)
    rcyl(-0.3, 0.362, 1.7, 0.03, 0.014, mat(C['teal'], 0.5), 'y', 0.004, 24)

@kind('dining')
def k_dining(st):
    wood = mat(C['woodL'], 0.5); dk = mat(C['woodD'], 0.6); runner = tex_mat('runner-k', lambda s: khatam(s, C['cream'], C['teal'], C['mustard'], 5), 512, 0.9)
    bx(0, 0, 0.7, 2.0, 0.92, 0.05, wood, 0.025); bx(0, 0, 0.62, 1.9, 0.8, 0.08, dk, 0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): ctube((sx * 0.88, sy * 0.36, 0.64), (sx * 0.93, sy * 0.4, 0.02), 0.04, wood, 0.028)
    r = box(0, 0, 0, 1.6, 0.28, 0.008, None, 0); r.data.materials.append(runner); r.location = (0, 0, 0.756)
    for s in (-1, 1):
        by = s * 0.72
        bx(0, by, 0.33, 1.9, 0.34, 0.06, wood, 0.025); bx(0, by, 0.39, 1.7, 0.29, 0.04, fab(C['sage']), 0.02)
        for sx in (-1, 1): bx(sx * 0.82, by, 0.0, 0.08, 0.3, 0.33, dk, 0.02)
        bx(0, by, 0.12, 1.5, 0.04, 0.05, dk, 0.012)
    # a bowl of fruit, four plates, a jug
    lathe(0, 0, 0.76, [(0.001, 0), (0.09, 0), (0.17, 0.08), (0.18, 0.1), (0.16, 0.1), (0.001, 0.02)], mat(C['teal'], 0.4))
    for i, (c, a) in enumerate([(C['terra'], 0), (C['mustard'], 2.1), (C['sage'], 4.2), (C['terra'], 1.0)]):
        ball(math.cos(a) * 0.07, math.sin(a) * 0.07, 0.86 + (0.04 if i == 3 else 0), 0.052, mat(c, 0.45))
    for (x, y) in [(-0.55, -0.27), (0.55, -0.27), (-0.55, 0.27), (0.55, 0.27)]:
        cyl(x, y, 0.752, 0.13, 0.012, mat(C['cream'], 0.35), 0.005, 32); cyl(x, y, 0.763, 0.085, 0.006, mat(C['teal'], 0.35), 0.003, 32)
    lathe(-0.85, 0.0, 0.752, [(0.001, 0), (0.07, 0), (0.09, 0.1), (0.07, 0.2), (0.05, 0.24), (0.001, 0.24)], mat(C['indigo'], 0.3))
    for (x, y) in [(0.15, 0.2), (-0.1, -0.2)]: lathe(x, y, 0.752, [(0.001, 0), (0.028, 0), (0.026, 0.035), (0.036, 0.09), (0.001, 0.09)], mat('#E8B36A', 0.2))

@kind('bin')
def k_bin(st):
    sage = mat(C['sage'], 0.5); cream = mat(C['cream'], 0.5)
    lathe(0, 0, 0, [(0.001, 0), (0.13, 0), (0.15, 0.03), (0.18, 0.4), (0.19, 0.46), (0.001, 0.46)], sage)
    lathe(0, 0, 0.0, [(0.16, 0.2), (0.17, 0.24)], mat(C['teal'], 0.5), 40)
    lathe(0, 0, 0.45, [(0.205, 0), (0.205, 0.03), (0.17, 0.07), (0.07, 0.11), (0.001, 0.115)], cream)
    ball(0, 0, 0.58, 0.03, mat(C['teal'], 0.5)); bx(0, 0.21, 0.04, 0.1, 0.1, 0.03, mat(C['woodD'], 0.6), 0.012)

# ======================================================================================================
# UPSTAIRS furniture
# ======================================================================================================
COVER = dict(a=(C['teal'], C['cream'], C['mustard']), b=('#E8837C', C['cream'], C['teal']))
@kind('bed')
def k_bed(st):
    col, c2, c3 = COVER[st or 'a']; wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6); cream = fab(C['cream'])
    for (x, y) in [(-0.4, -0.9), (0.4, -0.9), (-0.4, 0.9), (0.4, 0.9)]: bx(x, y, 0, 0.09, 0.09, 0.14, dk, 0.02)
    bx(0, 0, 0.1, 0.98, 2.0, 0.17, wood, 0.04)
    arch(-0.49, -1.02, 0.08, 0.98, 1.0, 0.07, wood, 'Y', 0.03)
    bx(0, 0.985, 0.1, 0.98, 0.05, 0.42, wood, 0.03)
    bx(0, 0, 0.26, 0.9, 1.88, 0.17, cream, 0.07)
    bx(0, 0.28, 0.38, 0.94, 1.3, 0.1, fab(col), 0.05)
    p = box(0, 0, 0, 0.94, 0.26, 0.1, None, 0.04); p.data.materials.append(tex_mat('bedband-' + (st or 'a'), lambda s: khatam(s, c2, col, c3, 4), 256, 0.95, repeat=(1, 0.28))); p.location = (0, -0.24, 0.45)
    for s in (-1, 1): bx(s * 0.22, -0.78, 0.42, 0.4, 0.3, 0.1, fab(C['cream']), 0.05)
    bx(0, -0.68, 0.52, 0.34, 0.2, 0.06, fab(c3), 0.03)

@kind('bigbed')
def k_bigbed(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6); cream = fab(C['cream'])
    for (x, y) in [(-0.98, -0.78), (0.98, -0.78), (-0.98, 0.78), (0.98, 0.78)]: bx(x, y, 0, 0.1, 0.1, 0.14, dk, 0.02)
    bx(0, 0, 0.1, 2.15, 1.7, 0.2, wood, 0.04)
    arch(-1.075, -0.85, 0.08, 1.7, 1.2, 0.08, wood, 'X', 0.03)
    bx(1.06, 0, 0.1, 0.06, 1.7, 0.4, wood, 0.03)
    bx(0, 0, 0.28, 2.0, 1.6, 0.18, cream, 0.07)
    bx(0.25, 0, 0.4, 1.5, 1.64, 0.14, fab(C['indigo']), 0.06)
    p = box(0, 0, 0, 0.3, 1.64, 0.14, None, 0.05); p.data.materials.append(tex_mat('bigband', lambda s: khatam(s, C['cream'], C['indigo'], C['mustard'], 5), 256, 0.95, repeat=(0.5, 1))); p.location = (-0.43, 0, 0.47)
    bx(0.9, 0, 0.42, 0.34, 1.66, 0.14, fab(C['terra']), 0.06)
    for s in (-1, 1): bx(-0.74, s * 0.42, 0.46, 0.4, 0.7, 0.13, fab(C['cream']), 0.06)

@kind('cot')
def k_cot(st):
    wood = mat(C['woodL'], 0.55); cream = fab(C['cream'])
    bx(0, 0, 0.12, 1.3, 0.75, 0.05, wood, 0.02)
    bx(0, 0, 0.17, 1.2, 0.66, 0.1, cream, 0.05)
    bx(0.12, 0, 0.26, 0.9, 0.68, 0.06, fab(C['sage']), 0.03)
    p = box(0, 0, 0, 0.9, 0.18, 0.06, None, 0.03); p.data.materials.append(tex_mat('cotband', lambda s: weave(s, C['cream'], C['sage'], 12), 256, 0.95)); p.location = (0.12, -0.25, 0.3)
    bx(-0.45, 0, 0.3, 0.3, 0.34, 0.07, cream, 0.03)
    for sx in (-1, 1): bx(sx * 0.64, 0, 0.1, 0.05, 0.75, 0.55, wood, 0.02)
    for sy in (-1, 1):
        ctube((-0.64, sy * 0.36, 0.58), (0.64, sy * 0.36, 0.58), 0.026, wood); ctube((-0.64, sy * 0.36, 0.17), (0.64, sy * 0.36, 0.17), 0.02, wood)
        for i in range(15): cyl(-0.6 + i * 0.0857, sy * 0.36, 0.17, 0.0105, 0.41, mat(C['cream'], 0.5), 0, 10)
    for (x, y) in [(-0.64, -0.36), (0.64, -0.36), (-0.64, 0.36), (0.64, 0.36)]:
        cyl(x, y, 0.0, 0.035, 0.66, wood, 0.01, 16); ball(x, y, 0.69, 0.04, mat(C['woodD'], 0.5))

@kind('wardrobe')
def k_wardrobe(st):
    cream = mat(C['cream'], 0.65); wood = mat(C['woodL'], 0.55); teal = mat(C['teal'], 0.6); brass = mat(C['brass'], 0.3, 0.9)
    for sx in (-1, 1): bx(sx * 0.4, 0, 0.0, 0.12, 0.45, 0.12, mat(C['woodD'], 0.6), 0.02)
    bx(0, 0, 0.12, 1.0, 0.55, 1.68, cream, 0.045)
    bx(0, 0.0, 1.78, 1.08, 0.62, 0.1, wood, 0.03)
    for s in (-1, 1):
        x = s * 0.245
        bx(x, 0.285, 0.2, 0.46, 0.03, 1.52, wood, 0.015)
        bx(x, 0.305, 0.28, 0.34, 0.012, 0.5, teal, 0.008); bx(x, 0.305, 0.9, 0.34, 0.012, 0.48, teal, 0.008)
        vpanel(pat('a' if s < 0 else 'd'), x, 0.312, 1.33, 0.3, 0.3, 0.01)
        ball(s * 0.05, 0.33, 0.95, 0.025, brass)
    bx(0, 0.3, 0.2, 0.012, 0.012, 1.52, mat(C['woodD'], 0.6), 0.002)

@kind('desk')
def k_desk(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6); cream = mat(C['cream'], 0.6)
    bx(0, -0.3, 0.7, 1.3, 0.55, 0.05, wood, 0.02)
    bx(-0.58, -0.3, 0.0, 0.06, 0.5, 0.7, wood, 0.015)
    bx(0.4, -0.3, 0.02, 0.44, 0.5, 0.68, cream, 0.025)
    for z in (0.08, 0.38): bx(0.4, -0.04, z, 0.4, 0.03, 0.25, wood, 0.012); ball(0.4, -0.01, z + 0.125, 0.022, mat(C['brass'], 0.3, 0.9))
    bx(0, -0.52, 0.45, 1.2, 0.03, 0.3, dk, 0.01)
    # on the desk: a lamp, books, blank paper, a pencil pot
    cyl(-0.45, -0.38, 0.75, 0.07, 0.02, mat(C['brass'], 0.3, 0.9), 0.006, 24); ctube((-0.45, -0.38, 0.76), (-0.4, -0.4, 1.05), 0.012, mat(C['brass'], 0.3, 0.9))
    lathe(-0.4, -0.4, 1.0, [(0.12, 0), (0.07, 0.1), (0.001, 0.12)], mat(C['mustard'], 0.5));
    for i, c in enumerate([C['indigo'], C['terra'], C['sage']]): b = bx(0.05, -0.38, 0.75 + i * 0.045, 0.3 - i * 0.02, 0.22, 0.04, mat(c, 0.6), 0.01); b.rotation_euler = (0, 0, 0.1 * i)
    p = bx(-0.1, -0.12, 0.75, 0.24, 0.32, 0.008, fab('#FBF6EA'), 0.002); p.rotation_euler = (0, 0, 0.2)
    lathe(0.55, -0.15, 0.75, [(0.001, 0), (0.045, 0), (0.05, 0.11), (0.001, 0.11)], mat(C['teal'], 0.4))
    for i, c in enumerate([C['terra'], C['mustard'], C['indigo']]): ctube((0.55 + (i - 1) * 0.02, -0.15, 0.8), (0.55 + (i - 1) * 0.045, -0.15 + (i - 1) * 0.01, 0.95), 0.009, mat(c, 0.5))
    # the stool
    cyl(0, 0.4, 0.38, 0.2, 0.055, fab(C['teal']), 0.025, 40); cyl(0, 0.4, 0.34, 0.17, 0.045, wood, 0.012, 40)
    for a in range(4):
        ang = math.pi / 4 + a * math.pi / 2; ctube((math.cos(ang) * 0.1, 0.4 + math.sin(ang) * 0.1, 0.35), (math.cos(ang) * 0.17, 0.4 + math.sin(ang) * 0.17, 0.01), 0.022, wood, 0.016)

@kind('dresser')
def k_dresser(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['wood'], 0.6); brass = mat(C['brass'], 0.3, 0.9)
    for sx in (-1, 1): bx(sx * 0.46, 0, 0.0, 0.1, 0.4, 0.12, mat(C['woodD'], 0.6), 0.02)
    bx(0, 0, 0.1, 1.08, 0.48, 0.72, wood, 0.035)
    for i in range(3):
        z = 0.14 + i * 0.22; bx(0, 0.245, z, 0.98, 0.025, 0.2, dk, 0.012)
        for sx in (-1, 1): ball(sx * 0.18, 0.272, z + 0.1, 0.022, brass)
    bx(0, 0, 0.82, 1.14, 0.54, 0.05, mat(C['woodD'], 0.55), 0.025)
    lantern(-0.38, 0.0, 0.87, 0.6)
    fr = bx(0, 0, 0, 0.34, 0.03, 0.34, mat(C['woodL'], 0.5), 0.012); fr.rotation_euler = (math.radians(-12), 0, 0); fr.location = (0.15, -0.06, 1.05)
    vpanel(pat('b'), 0.15, -0.04, 1.05, 0.26, 0.26, 0.012, math.radians(-12))
    lathe(0.42, 0.0, 0.87, [(0.001, 0), (0.05, 0), (0.075, 0.07), (0.04, 0.16), (0.04, 0.2), (0.001, 0.2)], mat(C['terra'], 0.5))
    for i in range(3): ctube((0.42, 0.0, 1.0), (0.42 + (i - 1) * 0.09, (i - 1) * 0.03, 1.2 + 0.03 * (i % 2)), 0.007, mat(C['leaf'], 0.6)); ball(0.42 + (i - 1) * 0.09, (i - 1) * 0.03, 1.22 + 0.03 * (i % 2), 0.03, mat([C['cream'], C['mustard'], C['rose']][i], 0.6))

# ======================================================================================================
# BATHROOM
# ======================================================================================================
@kind('basin')
def k_basin(st):
    white = mat(C['whiteP'], 0.25); steel = mat(C['steel'], 0.25, 0.8)
    lathe(0, 0, 0, [(0.001, 0), (0.14, 0), (0.15, 0.04), (0.08, 0.16), (0.08, 0.72), (0.001, 0.72)], white)
    # the bowl: a rim of boards round a hollow floor
    bx(0, 0.0, 0.7, 0.7, 0.46, 0.04, white, 0.02)
    for (x, y, w, d) in [(0, 0.2, 0.7, 0.07), (0, -0.2, 0.7, 0.07), (0.315, 0, 0.07, 0.46), (-0.315, 0, 0.07, 0.46)]: bx(x, y, 0.72, w, d, 0.1, white, 0.03)
    bx(0, 0, 0.74, 0.55, 0.34, 0.01, mat('#BDD9E6', 0.3), 0.004)
    bx(0, -0.22, 0.72, 0.7, 0.05, 0.28, white, 0.02)
    ctube((0, -0.16, 0.84), (0, -0.16, 1.0), 0.022, steel); ctube((0, -0.16, 1.0), (0, -0.04, 1.03), 0.02, steel); ctube((0, -0.04, 1.03), (0, -0.04, 0.96), 0.018, steel)
    for s in (-1, 1): ball(s * 0.16, -0.16, 0.86, 0.026, mat(C['teal'] if s < 0 else C['terra'], 0.4))
    # a mirror with a wooden arch frame on the wall above
    arch(-0.3, -0.255, 1.18, 0.6, 0.85, 0.035, mat(C['woodL'], 0.5), 'Y', 0.015)
    arch(-0.26, -0.215, 1.22, 0.52, 0.77, 0.02, mat('#DDEEF3', 0.08, 0.2), 'Y', 0.005)
    lathe(0.22, 0.0, 0.76, [(0.001, 0), (0.035, 0), (0.04, 0.09), (0.001, 0.095)], mat(C['teal'], 0.4))

@kind('bath')
def k_bath(st):
    white = mat(C['whiteP'], 0.25); steel = mat(C['steel'], 0.25, 0.8); closed = (st == 'closed')
    for (x, y) in [(-0.28, -0.7), (0.28, -0.7), (-0.28, 0.7), (0.28, 0.7)]: cyl(x, y, 0.0, 0.05, 0.14, mat(C['brass'], 0.35, 0.9), 0.015, 20)
    bx(0, 0, 0.12, 0.78, 1.7, 0.16, white, 0.05)
    for (x, y, w, d) in [(0.335, 0, 0.11, 1.7), (-0.335, 0, 0.11, 1.7), (0, 0.795, 0.78, 0.11), (0, -0.795, 0.78, 0.11)]: bx(x, y, 0.12, w, d, 0.5, white, 0.05)
    bx(0, 0, 0.3, 0.58, 1.5, 0.012, mat('#C8DDE6', 0.3), 0.004)
    bx(0, 0, 0.44, 0.57, 1.48, 0.012, mat(C['water'], 0.12), 0.004)
    random.seed(4)
    for i in range(16): ball(random.uniform(-0.22, 0.22), random.uniform(-0.65, 0.65), 0.465, random.uniform(0.035, 0.065), mat('#FFFFFF', 0.3), 1, 1, 0.8)
    ctube((-0.31, 0.5, 0.88), (-0.31, 0.5, 0.95), 0.02, steel); ctube((-0.31, 0.5, 0.95), (-0.12, 0.5, 0.95), 0.02, steel); ctube((-0.12, 0.5, 0.95), (-0.12, 0.5, 0.88), 0.018, steel)
    for s in (-1, 1): ball(-0.34, 0.5 + s * 0.14, 0.9, 0.025, mat(C['teal'] if s < 0 else C['terra'], 0.4))
    # a rod on two poles and the curtain
    for y in (-0.82, 0.82): ctube((0.38, y, 0.0), (0.38, y, 1.88), 0.02, steel)
    ctube((0.38, -0.82, 1.88), (0.38, 0.82, 1.88), 0.02, steel)
    cur = fab(C['sky2'], 0.4); cur2 = fab('#E8F4F9', 0.4)
    if closed:
        for i in range(17):
            y = -0.78 + i * 0.098; cyl(0.395, y, 0.3, 0.055 if i % 2 else 0.05, 1.55, cur if i % 2 else cur2, 0, 18)
    else:
        for i, y in enumerate([-0.77, -0.7, -0.63, -0.56]):
            cyl(0.395 + (0.012 if i % 2 else 0), y, 0.3, 0.055, 1.55, cur if i % 2 else cur2, 0, 18)
    for i in range(10 if not closed else 17): ball(0.38, -0.78 + i * (0.098 if closed else 0.075), 1.88, 0.03, mat(C['brass'], 0.35, 0.9))

@kind('washer')
def k_washer(st):
    white = mat(C['whiteP'], 0.35); steel = mat(C['steel'], 0.3, 0.7)
    for (x, y) in [(-0.26, -0.26), (0.26, -0.26), (-0.26, 0.26), (0.26, 0.26)]: cyl(x, y, 0.0, 0.03, 0.05, mat(C['steelD'], 0.5), 0.01, 16)
    bx(0, 0, 0.04, 0.62, 0.62, 0.82, white, 0.06)
    bx(0, 0.311, 0.7, 0.56, 0.014, 0.12, mat('#DDE8EC', 0.4), 0.005)
    ball(-0.18, 0.325, 0.76, 0.034, mat(C['teal'], 0.4), 1, 0.4, 1); ball(0.0, 0.325, 0.76, 0.02, mat(C['terra'], 0.4), 1, 0.5, 1); ball(0.1, 0.325, 0.76, 0.02, mat(C['mustard'], 0.4), 1, 0.5, 1)
    torus(0, 0.315, 0.38, 0.215, 0.034, steel, 1.0, (math.pi / 2, 0, 0)); rcyl(0, 0.318, 0.38, 0.205, 0.03, mat('#43667B', 0.12), 'y', 0.004, 40)
    rcyl(0, 0.33, 0.38, 0.12, 0.02, mat('#5C87A0', 0.12), 'y', 0.004, 40); ball(-0.04, 0.34, 0.42, 0.05, fab(C['cream']), 1.2, 0.5, 1)
    # a folded towel on top
    bx(0.12, 0.0, 0.86, 0.34, 0.26, 0.05, fab(C['teal']), 0.025); bx(0.12, 0.0, 0.91, 0.32, 0.24, 0.05, fab(C['cream']), 0.025)
    lathe(-0.2, -0.1, 0.86, [(0.001, 0), (0.05, 0), (0.055, 0.14), (0.03, 0.2), (0.025, 0.24), (0.001, 0.24)], mat(C['indigo'], 0.35))

@kind('basket')
def k_basket(st):
    wood = mat(C['woodL'], 0.8); dk = mat(C['woodD'], 0.8)
    prof = [(0.001, 0.0), (0.17, 0.0)]
    for k in range(16):
        z = 0.03 + k * 0.03; r = 0.17 + (z / 0.5) * 0.075 + (0.01 if k % 2 else -0.002); prof.append((r, z))
    prof += [(0.255, 0.5), (0.235, 0.5)]
    lathe(0, 0, 0, prof, wood, 40)
    torus(0, 0, 0.5, 0.245, 0.018, dk, 1.0)
    for s in (-1, 1): torus(s * 0.245, 0, 0.43, 0.07, 0.013, dk, 1.0, (math.pi / 2, 0, math.pi / 2))
    for (x, y, z, r, c) in [(0, 0, 0.5, 0.2, C['cream']), (0.06, -0.04, 0.55, 0.14, C['teal']), (-0.07, 0.07, 0.56, 0.12, C['terra']), (0.0, 0.1, 0.52, 0.12, C['mustard'])]:
        ball(x, y, z, r, fab(c), 1.0, 1.0, 0.55)

# ======================================================================================================
# YARD furniture
# ======================================================================================================
@kind('swing')
def k_swing(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6); rope = mat(C['cream'], 0.9)
    H = 2.05
    for x in (-0.88, 0.88):
        for y in (-0.5, 0.5):
            ctube((x, y, 0.0), (x, 0.0, H), 0.045, wood, 0.04)
        for z in (0.55,): ctube((x, -0.5 * (1 - z / H), z), (x, 0.5 * (1 - z / H), z), 0.025, dk)
        for y in (-0.5, 0.5): cyl(x, y, 0.0, 0.07, 0.03, dk, 0.01, 20)
    ctube((-1.0, 0, H), (1.0, 0, H), 0.055, dk)
    for x in (-0.2, 0.2):
        ctube((x, 0.0, H - 0.02), (x, 0.0, 0.46), 0.012, rope, 0.012); ball(x, 0.0, H - 0.02, 0.03, mat(C['brass'], 0.35, 0.9))
    bx(0, 0, 0.4, 0.52, 0.22, 0.045, mat(C['terra'], 0.6), 0.02); bx(0, 0, 0.36, 0.5, 0.2, 0.04, dk, 0.015)

@kind('sandpit')
def k_sandpit(st):
    wood = mat(C['woodL'], 0.6); dk = mat(C['woodD'], 0.6)
    sand = tex_mat('sand', lambda n: np.stack([np.full((n, n), c) + _noise(n, 7, 0.07, 0) for c in rgb(C['sand'])], 2), 512, 1.0, repeat=(2, 2))
    s = box(-0.8, -0.7, 0.0, 1.6, 1.4, 0.12, None, 0.02); s.data.materials.append(sand)
    for (x, y, w, d) in [(0, -0.745, 1.8, 0.12), (0, 0.745, 1.8, 0.12), (-0.87, 0, 0.12, 1.42), (0.87, 0, 0.12, 1.42)]: bx(x, y, 0.0, w, d, 0.2, wood, 0.025)
    for (x, y) in [(-0.87, -0.745), (0.87, -0.745), (-0.87, 0.745), (0.87, 0.745)]: bx(x, y, 0.0, 0.14, 0.14, 0.24, dk, 0.025)
    ball(-0.3, -0.35, 0.1, 0.32, mat(C['sand'], 1.0), 1, 1, 0.38); ball(0.45, 0.45, 0.1, 0.25, mat('#DFC890', 1.0), 1, 1, 0.35)
    lathe(0.55, -0.3, 0.1, [(0.001, 0), (0.09, 0), (0.12, 0.17), (0.115, 0.18), (0.001, 0.17)], mat(C['terra'], 0.6)); ctube((0.55, -0.3, 0.27), (0.46, -0.3, 0.2), 0.012, mat(C['terra'], 0.6))
    sp = [ctube((0, 0, 0.0), (0.0, 0.2, 0.02), 0.012, mat(C['woodL'], 0.6)), bx(0, 0.26, 0.0, 0.1, 0.12, 0.012, mat(C['teal'], 0.5), 0.005)]
    put(sp, -0.5, 0.45, 0.12, 0.6)

@kind('vegbed')
def k_vegbed(st):
    st = st or 'empty'; wood = mat(C['woodL'], 0.6); dk = mat(C['woodD'], 0.6); soil = mat(C['soil'], 1.0); soilL = mat('#7C5A40', 1.0)
    bx(0, 0, 0.0, 0.9, 1.3, 0.1, soil, 0.01)
    for (x, y, w, d) in [(0, -0.64, 0.9, 0.04), (0, 0.64, 0.9, 0.04), (-0.44, 0, 0.04, 1.3), (0.44, 0, 0.04, 1.3)]: bx(x, y, 0.0, w, d, 0.26, wood, 0.012)
    for (x, y) in [(-0.44, -0.64), (0.44, -0.64), (-0.44, 0.64), (0.44, 0.64)]: bx(x, y, 0.0, 0.07, 0.07, 0.3, dk, 0.015)
    bx(0, 0, 0.1, 0.82, 1.22, 0.1, soil, 0.02)
    for x in (-0.26, 0.0, 0.26): bx(x, 0, 0.17, 0.11, 1.12, 0.05, soilL, 0.025)
    def rosette(x, y, z, s, cols, n=7):
        for k in range(n):
            a = k * 2.39996; l = ball(0, 0, 0, 0.12 * s, cols[k % len(cols)], 1.0, 0.5, 0.15)
            l.rotation_euler = (0, math.radians(-30 - (k % 3) * 9), a); l.location = (x + math.cos(a) * 0.07 * s, y + math.sin(a) * 0.07 * s, z + 0.04 * s + k * 0.012 * s)
    lg = [mat(C['leaf'], 0.6), mat(C['leafD'], 0.6), mat(C['sage'], 0.6)]; cab = [mat('#B5D49C', 0.6), mat(C['sage'], 0.6)]
    if st == 'sprout':
        for x in (-0.26, 0.0, 0.26):
            for j in range(5):
                y = -0.45 + j * 0.225; ctube((x, y, 0.2), (x, y, 0.27), 0.006, mat(C['leaf'], 0.6))
                for s in (-1, 1):
                    l = ball(0, 0, 0, 0.035, mat(C['sage'], 0.6), 1.0, 0.55, 0.18); l.rotation_euler = (0, math.radians(s * -30), 0); l.location = (x + s * 0.03, y, 0.285)
    if st == 'grown':
        for j in range(4): rosette(-0.26, -0.45 + j * 0.3, 0.2, 1.3, lg, 8)
        for j in range(3): rosette(0.0, -0.4 + j * 0.4, 0.2, 1.0, cab, 8); ball(0.0, -0.4 + j * 0.4, 0.3, 0.1, mat('#A9CC8F', 0.6), 1, 1, 0.8)
        for j in range(4):
            y = -0.45 + j * 0.3
            for k in range(4):
                a = k * 1.57 + j; l = ball(0, 0, 0, 0.1, mat(C['leaf'] if k % 2 else C['leafD'], 0.6), 0.3, 0.1, 1.0); l.rotation_euler = (0, math.radians(-10), a)
                l.location = (0.26 + math.cos(a) * 0.04, y + math.sin(a) * 0.04, 0.34)
            ball(0.26 + 0.05, y + 0.02, 0.22, 0.045, mat(C['terra'], 0.5), 1, 1, 0.9) if j % 2 == 0 else None

@kind('clothesline')
def k_clothesline(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6); rope = mat(C['cream'], 0.9)
    for x in (-1.1, 1.1):
        ctube((x, 0, 0.0), (x, 0, 2.0), 0.045, wood, 0.04); ctube((x, -0.16, 2.0), (x, 0.16, 2.0), 0.03, dk); cyl(x, 0, 0.0, 0.1, 0.04, dk, 0.012, 20)
    for y in (-0.16, 0.16):
        pts = [(-1.1, 1.98), (-0.55, 1.95), (0.0, 1.93), (0.55, 1.95), (1.1, 1.98)]
        for a, b in zip(pts, pts[1:]): ctube((a[0], y, a[1]), (b[0], y, b[1]), 0.008, rope, caps=False)
    cl = lambda c: fab(c, 0.4); y = 0.16
    flat([(-0.1, 0), (0.1, 0), (0.24, -0.08), (0.34, -0.5), (0.26, -0.55), (0.18, -0.26), (0.18, -0.7), (-0.18, -0.7), (-0.18, -0.26), (-0.26, -0.55), (-0.34, -0.5), (-0.24, -0.08)], 0.025, cl(C['terra']), (-0.8, y, 1.95))
    flat([(-0.2, 0), (0.2, 0), (0.21, -0.62), (-0.21, -0.62)], 0.025, cl(C['teal']), (-0.28, y, 1.935))
    flat([(-0.2, -0.45), (0.2, -0.45), (0.21, -0.51), (-0.21, -0.51)], 0.03, cl(C['cream']), (-0.28, y + 0.003, 1.935))
    flat([(-0.17, 0), (0.17, 0), (0.18, -0.36), (-0.18, -0.36)], 0.025, cl(C['mustard']), (0.2, y, 1.94))
    flat([(-0.09, 0), (0.09, 0), (0.18, -0.05), (0.24, -0.34), (0.18, -0.37), (0.12, -0.17), (0.12, -0.4), (-0.12, -0.4), (-0.12, -0.17), (-0.18, -0.37), (-0.24, -0.34), (-0.18, -0.05)], 0.025, cl(C['sage']), (0.66, y, 1.95))
    flat([(-0.14, 0), (0.14, 0), (0.15, -0.4), (-0.15, -0.4)], 0.025, cl(C['indigo']), (0.95, y, 1.97))
    for x in (-0.9, -0.7, -0.45, -0.1, 0.07, 0.33, 0.58, 0.75, 0.85, 1.03): bx(x, y, 1.93, 0.03, 0.05, 0.075, mat(C['mustard'], 0.6), 0.006)
    flat([(-0.2, 0), (0.2, 0), (0.2, -0.45), (-0.2, -0.45)], 0.025, cl(C['cream']), (-0.1, -0.16, 1.93))

@kind('tree')
def k_tree(st):
    bark = mat('#8A5E3C', 0.95); barkD = mat('#6E4A30', 0.95)
    lathe(0, 0, 0, [(0.001, 0), (0.26, 0), (0.2, 0.1), (0.14, 0.4), (0.12, 1.3), (0.1, 2.0), (0.001, 2.0)], bark)
    for (x, y, z) in [(0.5, 0.2, 2.45), (-0.4, 0.3, 2.4), (0.1, -0.5, 2.5), (0.15, 0.55, 2.35)]: ctube((0, 0, 1.6), (x, y, z), 0.05, barkD, 0.03)
    L = [mat(C['leaf'], 0.7), mat(C['leafD'], 0.7), mat(C['sage'], 0.7), mat('#6FAE5E', 0.7)]
    crown = [(0, 0, 2.7, 0.9, 0), (0.6, 0.25, 2.4, 0.62, 1), (-0.55, 0.15, 2.45, 0.62, 2), (0.15, 0.6, 2.35, 0.58, 3), (0.1, -0.6, 2.55, 0.6, 1), (0.2, 0.0, 3.2, 0.6, 3), (-0.3, -0.3, 3.05, 0.55, 2), (0.45, -0.3, 2.85, 0.5, 0)]
    for (x, y, z, r, c) in crown: ball(x, y, z, r, L[c], 1, 1, 0.86)
    random.seed(21)
    fr = [mat(C['terra'], 0.5), mat(C['mustard'], 0.5)]
    for i in range(11):
        a = random.uniform(-0.2, math.pi / 2 + 0.7); el = random.uniform(-0.1, 0.5)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        ball(0.15 + d.x * 1.05, 0.15 + d.y * 1.05, 2.7 + d.z * 0.85, 0.075, fr[i % 2])

@kind('birdtable')
def k_birdtable(st):
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6)
    cyl(0, 0, 0.0, 0.08, 0.04, dk, 0.012, 20); cyl(0, 0, 0.0, 0.04, 1.28, dk, 0.012, 20)
    bx(0, 0, 1.24, 0.56, 0.56, 0.04, wood, 0.015)
    for (x, y, w, d) in [(0, 0.26, 0.56, 0.04), (0, -0.26, 0.56, 0.04), (0.26, 0, 0.04, 0.56), (-0.26, 0, 0.04, 0.56)]: bx(x, y, 1.28, w, d, 0.05, wood, 0.012)
    for (x, y) in [(-0.24, -0.24), (0.24, -0.24), (-0.24, 0.24), (0.24, 0.24)]: ctube((x, y, 1.28), (x * 0.9, y * 0.9, 1.75), 0.014, dk)
    lathe(0, 0, 1.72, [(0.5, 0), (0.001, 0.26)], mat(C['terra'], 0.7), 4).rotation_euler = (0, 0, math.radians(45))
    ball(0, 0, 2.0, 0.035, mat(C['woodD'], 0.5))
    random.seed(6)
    for i in range(16):
        a = random.uniform(0, 6.28); r = random.uniform(0.04, 0.2); ball(math.cos(a) * r + 0.0, math.sin(a) * r, 1.30, 0.016, mat(random.choice(['#E0B15A', '#8A5A33', '#C9923F']), 0.6), 1.4, 1, 0.8)

@kind('bowl')
def k_bowl(st):
    lathe(0, 0, 0, [(0.001, 0), (0.08, 0), (0.12, 0.03), (0.145, 0.08), (0.14, 0.085), (0.12, 0.085), (0.1, 0.05), (0.001, 0.04)], mat(C['cream'], 0.35))
    lathe(0, 0, 0.055, [(0.138, 0), (0.145, 0.025), (0.14, 0.03)], mat(C['teal'], 0.35), 40)
    cyl(0, 0, 0.06, 0.112, 0.006, mat(C['water'], 0.1), 0.002, 40)

@kind('can')
def k_can(st):
    t = mat(C['teal'], 0.45); d = mat(C['tealD'], 0.45)
    cyl(0, 0, 0.0, 0.12, 0.22, t, 0.03, 32); cyl(0, 0, 0.2, 0.125, 0.025, d, 0.01, 32); cyl(0, 0, 0.0, 0.125, 0.025, d, 0.01, 32)
    ctube((0.09, 0, 0.06), (0.32, 0, 0.3), 0.03, t, 0.02); cyl(0.315, 0, 0.29, 0.05, 0.025, d, 0.01, 20).rotation_euler = (0, math.radians(45), 0)
    ctube((-0.1, 0, 0.21), (-0.18, 0, 0.3), 0.017, d); ctube((-0.18, 0, 0.3), (-0.17, 0, 0.12), 0.017, d); ctube((-0.1, 0, 0.21), (-0.1, 0, 0.21), 0.01, d)
    ctube((-0.05, 0, 0.22), (0.08, 0, 0.36), 0.015, d); ctube((0.08, 0, 0.36), (-0.18, 0, 0.3), 0.015, d)

# ======================================================================================================
# ICONS: small chunky things seen at 48 px; the model sits round (0, 0, 0.5), about 0.8 across
# ======================================================================================================

# ======================================================================================================
# PLACES that are not a plain room
# ======================================================================================================
def _vnoise(n, cells, seed):
    rng = np.random.RandomState(seed); g = rng.rand(cells + 1, cells + 1).astype('float32'); g[-1, :] = g[0, :]; g[:, -1] = g[:, 0]
    u = np.linspace(0, cells, n, endpoint=False); i = np.floor(u).astype(int); f = u - i; f = f * f * (3 - 2 * f)
    top = (1 - f)[None, :] * g[i][:, i] + f[None, :] * g[i][:, i + 1]; bot = (1 - f)[None, :] * g[i + 1][:, i] + f[None, :] * g[i + 1][:, i + 1]
    return (1 - f)[:, None] * top + f[:, None] * bot
def _grass(n):
    rng = np.random.RandomState(2); base = np.array(rgb(C['grass'])); out = np.zeros((n, n, 3), 'float32')
    var = (_vnoise(n, 5, 1) - 0.5) * 0.16 + (_vnoise(n, 14, 2) - 0.5) * 0.07 + _noise(n, 3, 0.035, 0)
    for k in range(3): out[:, :, k] = base[k] + var * (1.0 if k == 1 else 0.6)
    yy, xx = np.mgrid[0:n, 0:n]
    for (c, cnt) in [(C['cream'], 22), (C['mustard'], 12), (C['rose'], 10)]:
        col = np.array(rgb(c))
        for _ in range(cnt):
            cx, cy = rng.randint(0, n, 2); m = (xx - cx) ** 2 + (yy - cy) ** 2 < (n * 0.004) ** 2
            for k in range(3): out[:, :, k] = np.where(m, col[k], out[:, :, k])
    return out
def _fence(wall, length, n0=0.0):
    wbox, wpt = M._wall(wall); post = mat(C['woodL'], 0.55); trim = mat(C['trim'], 0.6); pick = mat('#FBF1DC', 0.7)
    for z in (0.22, 0.56): wbox(0, -0.1, z, length, 0.035, 0.07, post, 0.012)
    nb = int(length / 0.135)
    for i in range(nb):
        u = 0.07 + i * (length - 0.14) / (nb - 1); h = 0.78 + (0.05 if i % 2 else 0.0)
        wbox(u - 0.045, -0.065, 0, 0.09, 0.03, h, pick, 0.012)
    for i in range(int(length) + 1):
        u = i * length / int(length); wbox(u - 0.06, -0.12, 0, 0.12, 0.12, 0.92, post, 0.025)
        p = wpt(u, -0.06, 0.92); ball(p[0], p[1], p[2] + 0.02, 0.07, post, 1, 1, 0.8)
def _flower_cluster(x, y, col, seed):
    random.seed(seed)
    for i in range(5):
        a = random.uniform(0, 6.28); r = random.uniform(0.02, 0.12); h = random.uniform(0.2, 0.36); px, py = x + math.cos(a) * r, y + math.sin(a) * r
        tube((px, py, 0.0), (px + random.uniform(-.03, .03), py + random.uniform(-.03, .03), h), 0.008, mat(C['leaf'], 0.6), caps=False)
        ball(px, py, h + 0.015, 0.035, mat(col, 0.5)); ball(px, py, h + 0.02, 0.014, mat(C['mustard'] if col != C['mustard'] else C['terra'], 0.5), 1, 1, 0.8)
    for i in range(3):
        a = i * 2.1; l = ball(0, 0, 0, 0.09, mat(C['leafD'], 0.6), 1.0, 0.35, 0.2); l.rotation_euler = (0, 0, a); l.location = (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, 0.03)
@place('yard')
def build_yard(sp):
    """The yard is part of the town now: its ground is painted by m_town (world coordinates; fence, gate, bushes are things)."""
    import m_town
    m_town.build_yard(sp)

def _balusters(x0, y0, x1, y1, z0=0.0, h=0.78):
    """Spindles along a straight run on the floor edge, with a rail on top."""
    L = math.hypot(x1 - x0, y1 - y0); n = max(2, int(L / 0.13)); wood = mat(C['woodL'], 0.55); cream = mat('#FBF1DC', 0.7)
    for i in range(n + 1):
        t = i / n; cyl(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0, 0.014, h, cream, 0, 8)
    tube((x0, y0, z0 + h), (x1, y1, z0 + h), 0.03, mat(C['woodD'], 0.6), caps=False)
    tube((x0, y0, z0 + 0.1), (x1, y1, z0 + 0.1), 0.02, wood, caps=False)
@place('landing')
def build_landing(sp):
    w, d = sp['size']; st = [x for x in sp['doors'] if x['id'] == 'stairs'][0]
    M.room_shell(dict(sp, doors=[x for x in sp['doors'] if x['id'] != 'stairs']))
    x0, dw = st['pos'], st.get('w', 1.4); wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.65); post = mat(C['woodL'], 0.55)
    # the stairs going down beyond the front edge
    for i in range(1, 4):
        top = -0.19 * i; y = d + (i - 1) * 0.28
        box(x0, y, top - 0.5, dw, 0.28, 0.5, dk, 0.012, 'riser'); box(x0 - 0.02, y - 0.02, top - 0.04, dw + 0.04, 0.32, 0.04, wood, 0.015, 'tread')
    for sx in (x0 - 0.05, x0 + dw + 0.0): box(sx, d - 0.02, -1.1, 0.05, 0.9, 1.15, dk, 0.015, 'stringer')
    # what stays in the floor picture of the stairs: the newel post each side of the opening and the handrail down beside the steps.
    # The balustrade along the front and the end is NOT here: it is the things `balustrade*` (people walk behind it).
    for x in (x0 - 0.05, x0 + dw + 0.05): bx(x, d - 0.05, 0, 0.09, 0.09, 1.0, post, 0.02); ball(x, d - 0.05, 1.03, 0.055, post, 1, 1, 0.85)
    for x in (x0 - 0.05, x0 + dw + 0.05): tube((x, d - 0.05, 0.95), (x, d + 0.84, 0.95 - 0.5), 0.028, mat(C['woodD'], 0.6))

def _balustrade(L):
    """A piece of the gallery's balustrade L long, along x, the middle of its footprint on the origin: spindles, a top rail, a low
    rail and a newel post at each end (a joint between two pieces is one post)."""
    wood = mat(C['woodL'], 0.55); cream = mat('#FBF1DC', 0.7); post = mat(C['woodL'], 0.55); h = 0.78
    n = max(2, int(L / 0.13))
    for i in range(n + 1): cyl(-L / 2 + L * i / n, 0, 0.0, 0.014, h, cream, 0, 8)
    tube((-L / 2, 0, h), (L / 2, 0, h), 0.03, mat(C['woodD'], 0.6), caps=False)
    tube((-L / 2, 0, 0.1), (L / 2, 0, 0.1), 0.02, wood, caps=False)
    for sx in (-L / 2, L / 2): bx(sx, 0, 0, 0.09, 0.09, 1.0, post, 0.02); ball(sx, 0, 1.03, 0.055, post, 1, 1, 0.85)
@kind('balustrade')
def k_balustrade(st): _balustrade(3.925)
@kind('balustrade3')
def k_balustrade3(st): _balustrade(3.3167)
@kind('balustrade2')
def k_balustrade2(st): _balustrade(2.37)

# === ICONS GO HERE ===

def _lift(objs, x, y, z, rz=0.0, tilt=0.0):
    g = kit.group(list(objs), 'ig'); g.location = (x, y, z); g.rotation_euler = (0, tilt, rz); return g
_CAM = Vector((math.cos(kit.ELEV) * math.cos(math.radians(45)), math.cos(kit.ELEV) * math.sin(math.radians(45)), math.sin(kit.ELEV)))
def _face_camera(o, z=None):
    o.rotation_euler = _CAM.to_track_quat('Z', 'Y').to_euler()
    if z is not None: o.location = (0, 0, z)
    return o

@icon('shoes')
def icon_shoes():
    for (x, y, col) in [(0.17, -0.08, C['terra']), (-0.17, 0.08, C['teal'])]:
        sh = shoe(col, 1.05); sh.location = (x, y, 0.23); sh.rotation_euler = (0, 0, math.radians(100))
@icon('coin')
def icon_coin():
    brass = mat(C['brass'], 0.3, 0.9)
    for i, (x, y) in enumerate([(-0.1, -0.05), (-0.08, -0.02), (-0.12, -0.04), (-0.1, -0.03)]):
        z = 0.22 + i * 0.06; cyl(x, y, z, 0.24, 0.06, brass, 0.015, 48); torus(x, y, z + 0.06, 0.17, 0.014, mat('#B8862E', 0.4, 0.8), 1.0)
    c = cyl(0, 0, -0.03, 0.26, 0.07, brass, 0.015, 48); tr = torus(0, 0, 0.035, 0.18, 0.016, mat('#B8862E', 0.4, 0.8), 1.0)
    g = kit.group([c, tr], 'coin'); g.rotation_euler = _CAM.to_track_quat('Z', 'Y').to_euler(); g.location = (0.2, 0.2, 0.52)
@icon('pot')
def icon_pot():
    body = mat(C['terra'], 0.4); lid = mat(C['cream'], 0.35)
    lathe(0, 0, 0.22, [(0.001, 0), (0.26, 0), (0.31, 0.06), (0.33, 0.36), (0.3, 0.4), (0.001, 0.4)], body)
    lathe(0, 0, 0.6, [(0.35, 0), (0.33, 0.04), (0.2, 0.12), (0.06, 0.17), (0.001, 0.18)], lid)
    ball(0, 0, 0.8, 0.055, mat(C['woodD'], 0.5))
    for s in (-1, 1): tube((0.0, s * 0.33, 0.52), (0.0, s * 0.48, 0.52), 0.04, mat(C['woodD'], 0.5)); 
@icon('drop')
def icon_drop():
    col = mat('#4DB1E6', 0.18); pts = [(0.001, 0)]
    for i in range(1, 10):
        a = -math.pi / 2 + i * (math.radians(25) + math.pi / 2) / 9; pts.append((0.28 * math.cos(a), 0.28 + 0.28 * math.sin(a)))
    for i in range(1, 7):
        t = i / 7; pts.append((0.254 * (1 - t) ** 1.7, 0.4 + 0.42 * t))
    pts.append((0.001, 0.85))
    lathe(0, 0, 0.2, pts, col, 48)
    ball(-0.07, 0.1, 0.42, 0.045, mat('#E9F7FF', 0.15), 0.8, 0.5, 1.5)
@icon('fruit')
def icon_fruit():
    red = mat('#E0503C', 0.35)
    ball(-0.12, -0.2, 0.52, 0.2, mat(C['mustard'], 0.45))
    lathe(0.08, 0.1, 0.22, [(0.001, 0), (0.12, 0.01), (0.24, 0.1), (0.29, 0.26), (0.26, 0.42), (0.18, 0.5), (0.08, 0.485), (0.001, 0.43)], red)
    tube((0.08, 0.1, 0.62), (0.1, 0.1, 0.76), 0.017, mat(C['woodD'], 0.6))
    l = ball(0, 0, 0, 0.12, mat(C['leaf'], 0.5), 1.0, 0.5, 0.2); l.rotation_euler = (0, math.radians(-25), 0.6); l.location = (0.19, 0.17, 0.76)
@icon('bowl')
def icon_bowl():
    lathe(0, 0, 0.22, [(0.001, 0), (0.15, 0), (0.28, 0.12), (0.36, 0.3), (0.34, 0.32), (0.3, 0.3), (0.001, 0.05)], mat(C['cream'], 0.35))
    lathe(0, 0, 0.22, [(0.345, 0.255), (0.36, 0.3), (0.35, 0.32), (0.32, 0.32)], mat(C['teal'], 0.35), 48)
    ball(0, 0, 0.5, 0.3, mat('#E1A35A', 0.5), 1, 1, 0.3)
    for (x, y, c) in [(0.1, 0.08, C['leaf']), (-0.12, 0.05, C['terra']), (0.0, -0.14, C['sage']), (-0.05, 0.16, C['mustard'])]: ball(x, y, 0.57, 0.06, mat(c, 0.5), 1, 1, 0.8)
    tube((0.08, -0.05, 0.7), (0.45, -0.2, 0.9), 0.025, mat(C['woodL'], 0.5)); ball(0.1, -0.04, 0.68, 0.06, mat(C['woodL'], 0.5), 1.2, 0.8, 0.5)
@icon('bin')
def icon_bin():
    lathe(0, 0, 0.22, [(0.001, 0), (0.2, 0), (0.24, 0.05), (0.28, 0.5), (0.29, 0.58), (0.001, 0.58)], mat(C['sage'], 0.5))
    lathe(0, 0, 0.22, [(0.24, 0.26), (0.26, 0.31)], mat(C['teal'], 0.5), 40)
    lathe(0, 0, 0.78, [(0.31, 0), (0.31, 0.04), (0.25, 0.09), (0.1, 0.14), (0.001, 0.145)], mat(C['cream'], 0.5)); ball(0, 0, 0.96, 0.045, mat(C['teal'], 0.5))
@icon('swing')
def icon_swing():
    wood = mat(C['woodL'], 0.55); dk = mat(C['woodD'], 0.6)
    for x in (-0.4, 0.4):
        for y in (-0.22, 0.22): tube((x, y, 0.22), (x, 0, 0.92), 0.04, wood)
    tube((-0.5, 0, 0.92), (0.5, 0, 0.92), 0.05, dk)
    for x in (-0.14, 0.14): tube((x, 0, 0.9), (x, 0, 0.42), 0.014, mat(C['cream'], 0.9))
    box(-0.22, -0.09, 0.34, 0.44, 0.18, 0.06, mat(C['terra'], 0.6), 0.02)
@icon('spade')
def icon_spade():
    o = [tube((0, 0, -0.05), (0, 0, 0.5), 0.045, mat(C['woodL'], 0.5)), box(-0.17, -0.035, -0.46, 0.34, 0.07, 0.42, mat(C['teal'], 0.4), 0.035),
         ball(0, 0, -0.46, 0.17, mat(C['teal'], 0.4), 1.0, 0.4, 0.9), torus(0, 0, 0.56, 0.1, 0.035, mat(C['woodL'], 0.5), 1.0, (math.pi / 2, 0, 0)),
         box(-0.075, -0.05, -0.1, 0.15, 0.1, 0.07, mat(C['tealD'], 0.5), 0.02)]
    ty, rz = math.radians(66), math.radians(135); d = Vector((math.sin(ty) * math.cos(rz), math.sin(ty) * math.sin(rz), math.cos(ty)))
    g = kit.group(o, 'spade'); g.rotation_euler = (0, ty, rz); g.location = Vector((0, 0, 0.5)) - d * 0.05; g.scale = (0.9, 0.9, 0.9)
@icon('sprout')
def icon_sprout():
    lathe(0, 0, 0.22, [(0.001, 0), (0.15, 0), (0.22, 0.28), (0.25, 0.3), (0.2, 0.31), (0.001, 0.29)], mat(C['terra'], 0.7))
    ball(0, 0, 0.5, 0.2, mat(C['soil'], 1.0), 1, 1, 0.2)
    tube((0, 0, 0.5), (0, 0, 0.8), 0.028, mat(C['leaf'], 0.5))
    for s in (-1, 1):
        l = ball(0, 0, 0, 0.2, mat(C['leaf'] if s > 0 else C['leafD'], 0.45), 1.0, 0.55, 0.14); l.rotation_euler = (0, math.radians(s * -32), 0); l.location = (s * 0.19, 0, 0.85)
    ball(0, 0, 0.86, 0.05, mat(C['sage'], 0.5), 1, 1, 1.3)
@icon('shirt')
def icon_shirt():
    pts = [(-0.1, 0.38), (-0.36, 0.28), (-0.5, 0.08), (-0.38, -0.06), (-0.26, 0.04), (-0.26, -0.4), (0.26, -0.4), (0.26, 0.04), (0.38, -0.06), (0.5, 0.08), (0.36, 0.28), (0.1, 0.38), (0.06, 0.31), (0.0, 0.28), (-0.06, 0.31)]
    plaque(pts, 0.1, mat(C['teal'], 0.55), 0.03)
    col = plaque([(-0.1, 0.38), (0.1, 0.38), (0.06, 0.31), (0.0, 0.28), (-0.06, 0.31)], 0.12, mat(C['cream'], 0.5), 0.015); col.location = Vector((0, 0, 0.5)) + _CAM * 0.015
    pk = plaque([(-0.07, 0.0), (0.07, 0.0), (0.07, -0.13), (-0.07, -0.13)], 0.1, mat(C['mustard'], 0.5), 0.02); pk.location = Vector((0.0, 0.0, 0.5)) + _CAM * 0.04 + Vector((0.0, 0.0, 0.0))
    pk.location = Vector((0, 0, 0.5)) + _CAM * 0.04
@icon('seeds')
def icon_seeds():
    lathe(0, 0, 0.22, [(0.001, 0), (0.2, 0), (0.34, 0.1), (0.38, 0.14), (0.34, 0.14), (0.001, 0.07)], mat(C['woodL'], 0.55))
    random.seed(9); cols = ['#E0B15A', '#8A5A33', '#C9923F', '#F0DBA0']
    for i in range(70):
        a = random.uniform(0, 6.283); r = 0.3 * math.sqrt(random.random()); h = 0.3 - r * 0.6
        b = ball(math.cos(a) * r, math.sin(a) * r, 0.26 + max(h, 0.04) * 0.7, 0.036, mat(random.choice(cols), 0.55), 1.5, 1.0, 0.8); b.rotation_euler = (0, 0, random.uniform(0, 3))
    for (x, y) in [(0.46, 0.2), (0.4, 0.34), (-0.45, 0.25)]: ball(x, y, 0.25, 0.035, mat('#E0B15A', 0.55), 1.5, 1.0, 0.8)
@icon('pencil')
def icon_pencil():
    o = [lathe(0, 0, 0, [(0.001, 0), (0.07, 0), (0.07, 0.62), (0.001, 0.62)], mat(C['mustard'], 0.45), 6),
         lathe(0, 0, 0.62, [(0.07, 0), (0.016, 0.2), (0.001, 0.2)], mat('#E9C7A0', 0.7), 40), lathe(0, 0, 0.78, [(0.026, 0), (0.001, 0.045)], mat(C['ink'], 0.5), 20),
         cyl(0, 0, -0.07, 0.076, 0.07, mat(C['brass'], 0.3, 0.9), 0.01, 40), cyl(0, 0, -0.16, 0.07, 0.1, mat(C['terra'], 0.6), 0.03, 40)]
    ty, rz = math.radians(68), math.radians(135); d = Vector((math.sin(ty) * math.cos(rz), math.sin(ty) * math.sin(rz), math.cos(ty)))
    g = kit.group(o, 'pencil'); g.rotation_euler = (0, ty, rz); g.location = Vector((0, 0, 0.5)) - d * 0.34
@icon('bed')
def icon_bed():
    wood = mat(C['woodL'], 0.55); bx(0, 0, 0.26, 0.62, 0.9, 0.12, wood, 0.04)
    bx(0, 0, 0.36, 0.56, 0.84, 0.13, fab(C['cream']), 0.05); bx(0, 0.14, 0.45, 0.58, 0.58, 0.12, fab(C['teal']), 0.05)
    bx(0, -0.31, 0.5, 0.42, 0.22, 0.1, fab(C['cream']), 0.05)
    box(-0.31, -0.46, 0.26, 0.62, 0.07, 0.62, wood, 0.03); bx(0, 0.445, 0.26, 0.62, 0.06, 0.3, wood, 0.03)
@icon('toy')
def icon_toy():
    o = _toy_parts(1.7); _lift(o, 0, 0, 0.23)

# === END ===

