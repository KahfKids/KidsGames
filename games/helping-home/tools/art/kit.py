"""Helping Home art kit (runs inside Blender, never on a phone).

The game is 2D (Phaser). Its pictures are small sprite sheets rendered here from simple 3D models, the way
classic isometric life games were made: one camera angle, one light, so every chair, wall and person
matches. Nothing in this folder ships; only the WebP sheets in life/art/ do.

Camera: orthographic, looking down 30 degrees (a 2:1 isometric grid), turned 45 degrees.
World units: 1 = one floor tile = 1 metre. +X runs down-left on screen, +Y runs down-right, +Z is up.
PX = screen pixels per tile width (the game's tile is PX wide and PX/2 high).
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Euler

PX = 128                      # pixels per tile width in the rendered sprites
ELEV = math.radians(30)       # camera elevation: sin(30) = 0.5 -> 2:1 tiles
SQ2 = math.sqrt(2)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.samples = 48
    s.cycles.use_denoising = True
    s.cycles.max_bounces = 4
    s.cycles.diffuse_bounces = 3
    s.cycles.glossy_bounces = 1
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices: d.use = True
        s.cycles.device = 'GPU'
    except Exception as e:
        print('GPU not used:', e)
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    s.render.resolution_percentage = 100
    # world: soft warm sky light
    w = bpy.data.worlds.new('w'); s.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (1.0, 0.97, 0.93, 1); bg.inputs[1].default_value = 0.62
    return s

def _aim(o, pos):
    o.location = pos
    o.rotation_euler = (-Vector(pos)).to_track_quat('-Z', 'Y').to_euler()

def lights(key=2.7, fill=0.75):
    """Warm daylight from the upper left of the screen (the +Y side, high), a cool fill from the right."""
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = key; sun.angle = math.radians(22); sun.color = (1.0, 0.94, 0.84)
    o = bpy.data.objects.new('sun', sun); bpy.context.collection.objects.link(o); _aim(o, (0.4, 0.85, 1.75))
    fl = bpy.data.lights.new('fill', 'SUN'); fl.energy = fill; fl.angle = math.radians(50); fl.color = (0.84, 0.91, 1.0)
    f = bpy.data.objects.new('fill', fl); bpy.context.collection.objects.link(f); _aim(f, (1.0, 0.25, 0.8))
    return o

def camera(center, w_px, h_px, px=PX):
    """An orthographic camera aimed at `center` (world point). The picture is w_px x h_px; one tile = px wide."""
    s = bpy.context.scene
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
    o = bpy.data.objects.new('cam', cam); bpy.context.collection.objects.link(o); s.camera = o
    s.render.resolution_x = int(w_px); s.render.resolution_y = int(h_px)
    # a tile's diagonal (sqrt 2 world units) spans px pixels on screen
    cam.ortho_scale = max(w_px, h_px) / px * SQ2
    d = Vector((math.cos(ELEV) * math.cos(math.radians(45)), math.cos(ELEV) * math.sin(math.radians(45)), math.sin(ELEV)))
    o.location = Vector(center) + d * 40
    o.rotation_euler = (Vector(center) - o.location).to_track_quat('-Z', 'Y').to_euler()
    cam.clip_start = 0.1; cam.clip_end = 200
    return o

def screen(p, px=PX):
    """World point -> pixel offset from the camera centre (x right, y down)."""
    x, y, z = p
    return ((y - x) * px / 2, (x + y) * px / 4 - z * px * math.cos(ELEV) / SQ2)

# ---------- materials ----------
_m = {}
def hexc(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(pow(v, 2.2) for v in c) + (1,)
def mat(col, rough=0.85, metal=0.0, name=None, emit=None, sheen=0.0):
    key = name or (col, rough, metal, emit, sheen)
    if key in _m: return _m[key]
    m = bpy.data.materials.new(str(key)); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(col)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = 0.25; break
    if sheen and 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = sheen
    if emit:
        for k in ('Emission Color', 'Emission'):
            if k in b.inputs: b.inputs[k].default_value = hexc(emit[0]); break
        if 'Emission Strength' in b.inputs: b.inputs['Emission Strength'].default_value = emit[1]
    _m[key] = m; return m

def tex_mat(name, paint, size=512, rough=0.9, repeat=None):
    """A material coloured by a small picture. paint(size) -> numpy array (size, size, 3), values 0..1 (sRGB), row 0 at
    the bottom. The picture is laid flat over the object's own box (looking down its Z); repeat=(nx, ny) tiles it."""
    import numpy as np
    if name in _m: return _m[name]
    a = np.clip(paint(size), 0, 1).astype('float32')
    rgba = np.ones((size, size, 4), dtype='float32'); rgba[:, :, :3] = a
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.pixels.foreach_set(rgba.ravel()); img.pack()
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; t.extension = 'REPEAT'
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    if repeat: mp.inputs['Scale'].default_value = (repeat[0], repeat[1], 1)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], t.inputs['Vector'])
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = 0.2; break
    _m[name] = m; return m

def rgb(h):
    h = h.lstrip('#'); return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]

def shadow_catcher(z=0.0, size=40):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    o = bpy.context.object; o.is_shadow_catcher = True; o.name = 'catcher'
    return o

# ---------- shapes (all smooth, all bevelled: nothing has a hard machine edge) ----------
def _finish(o, m, bevel=0.03, smooth=True, segs=3):
    if m: o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = segs; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(40)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        if bevel:
            wn = o.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = False
    return o

def box(x, y, z, w, d, h, m, bevel=0.03, name='box'):
    """A box with its corner at (x, y, z), w along X, d along Y, h up."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + w / 2, y + d / 2, z + h / 2))
    o = bpy.context.object; o.scale = (w, d, h); o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, m, min(bevel, w / 2.2, d / 2.2, h / 2.2))

def cyl(x, y, z, r, h, m, bevel=0.02, verts=40, r2=None, name='cyl'):
    """An upright cylinder (or cone frustum with top radius r2) standing on (x, y, z)."""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h, location=(x, y, z + h / 2))
    o = bpy.context.object; o.name = name
    return _finish(o, m, bevel)

def ball(x, y, z, r, m, sx=1, sy=1, sz=1, name='ball'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=r, location=(x, y, z))
    o = bpy.context.object; o.scale = (sx, sy, sz); o.name = name
    return _finish(o, m, 0)

def lathe(x, y, z, prof, m, steps=40, name='lathe'):
    """Spin a profile [(radius, height), ...] round the upright axis at (x, y, z)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = []
    for (r, h) in prof:
        rings.append([bm.verts.new((math.cos(2 * math.pi * i / steps) * r, math.sin(2 * math.pi * i / steps) * r, h)) for i in range(steps)])
    for a, b in zip(rings, rings[1:]):
        for i in range(steps):
            bm.faces.new((a[i], a[(i + 1) % steps], b[(i + 1) % steps], b[i]))
    if prof[0][0] > 1e-4: bm.faces.new(list(reversed(rings[0])))
    if prof[-1][0] > 1e-4: bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.location = (x, y, z)
    return _finish(o, m, 0)

def tube(p0, p1, r, m, r2=None, name='tube', caps=True):
    """A round limb from p0 to p1 with rounded ends."""
    p0 = Vector(p0); p1 = Vector(p1); d = p1 - p0; L = d.length
    if L < 1e-5: return ball(p0.x, p0.y, p0.z, r, m)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=r, radius2=r if r2 is None else r2, depth=L, location=(p0 + p1) / 2)
    o = bpy.context.object; o.name = name
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    _finish(o, m, 0)
    if caps:
        ball(p0.x, p0.y, p0.z, r, m); ball(p1.x, p1.y, p1.z, r if r2 is None else r2, m)
    return o

def group(objs, name='g'):
    e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e)
    for o in objs: o.parent = e
    return e

def clear_models(keep=('cam', 'sun', 'fill', 'catcher')):
    for o in list(bpy.data.objects):
        if o.name.split('.')[0] not in keep: bpy.data.objects.remove(o, do_unlink=True)

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('RENDERED', path)

def loft(rings, m, steps=28, name='loft', cap0=True, cap1=True, hold=0.0):
    """Skin a body through rings: each ring = (centre, axis, side, rs, rf): an ellipse round `centre`, across `axis`,
    radius rs along `side` and rf along axis x side. Used for clothes that bend with the body."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); R = []
    # hold both ends: a second ring just inside each end keeps the edge crisp when the body is smoothed
    if hold:
        c, ax, sd, rs, rf = rings[0]; c2, ax2, sd2, rs2, rf2 = rings[-1]
        rings = [rings[0], (Vector(c) + Vector(ax).normalized() * hold, ax, sd, rs, rf)] + list(rings[1:-1]) + [(Vector(c2) - Vector(ax2).normalized() * hold, ax2, sd2, rs2, rf2), rings[-1]]
    for (c, ax, sd, rs, rf) in rings:
        c = Vector(c); ax = Vector(ax).normalized(); sd = Vector(sd); sd = (sd - ax * sd.dot(ax)).normalized(); fw = ax.cross(sd)
        R.append([bm.verts.new(c + sd * (math.cos(2 * math.pi * i / steps) * rs) + fw * (math.sin(2 * math.pi * i / steps) * rf)) for i in range(steps)])
    for a, b in zip(R, R[1:]):
        for i in range(steps): bm.faces.new((a[i], a[(i + 1) % steps], b[(i + 1) % steps], b[i]))
    if cap0: bm.faces.new(list(reversed(R[0])))
    if cap1: bm.faces.new(R[-1])
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
    return o

def arch(x, y, z, w, h, d, m, axis='X', bevel=0.02, name='arch', segs=16):
    """An arched slab (a door, a window pane, a niche): w wide, h high to the top of the arch, d thick.
    axis='X': it stands in the X = x plane (on the left wall), running along +Y. axis='Y': on the right wall, along +X."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    r = w / 2; pts = [(0, 0), (w, 0), (w, h - r)] + [(r + r * math.cos(math.pi * i / segs), h - r + r * math.sin(math.pi * i / segs)) for i in range(1, segs)] + [(0, h - r)]
    front = [bm.verts.new((0, p[0], p[1])) for p in pts]; back = [bm.verts.new((d, p[0], p[1])) for p in pts]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    n = len(pts)
    for i in range(n): bm.faces.new((front[i], back[i], back[(i + 1) % n], front[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if axis == 'X': o.location = (x, y, z)
    else: o.rotation_euler = (0, 0, -math.pi / 2); o.location = (x, y + d, z)
    return _finish(o, m, bevel)
