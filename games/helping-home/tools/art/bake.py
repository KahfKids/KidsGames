"""Bake the game's pictures as plain PNG frames (runs inside Blender).
   blender -b -P bake.py -- <bake_dir> [target ...] [--force]
   targets:  all | places | kinds | icons | place:<id> | kind:<name> | icon:<name> | preview:<id> | previews
   (a preview is the place with all its furniture in one quick picture, for checking a layout; it is not shipped)
   --normals  renders ONLY the surface (normal) maps n-bg-<place>.png / n-k-<sprite>.png of the places and kinds named (never
              icons or previews): the same camera, frame and size as the beauty frame beside them, which is not re-rendered and
              must already exist. Pixel = camera-space normal * 0.5 + 0.5 (x right, y up, z toward the viewer), flat (128,128,255)
              where nothing is. build.py packs them at half size for Phaser's lights.
   A room (an indoor place) is three pictures: bg-<id> (the floor and what is fixed to it), wall-<id>-L and wall-<id>-R (a back wall
   with everything fixed to it; transparent elsewhere; the world origin (0, 0, 0) is on a whole pixel (ax, ay) of each). Its data may
   say "walls": ["R"] (or []) to have only some. An outdoor place is one picture, bg-<id>. Normal maps likewise (n-wall-<id>-L ...).
   A frame that already exists is skipped unless --force is given or its target is named exactly.
   build.py then trims, packs and converts the frames into life/art/ and writes life/data.json.

   What gets built comes from tools/data/*.json (places, kinds) and from the builders registered in models.py and
   every m_*.py beside it: KINDS (name -> fn(state)), PLACES (name -> fn(place)), ICONS (name -> fn())."""
import sys, os, math, json, glob, importlib, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
from mathutils import Vector
import kit, data as D
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]; FORCE = '--force' in argv; NORMALS = '--normals' in argv; TARGETS = [a for a in argv[1:] if not a.startswith('--')] or ['all']
os.makedirs(OUT, exist_ok=True)
PX = 192; kit.PX = PX
K = PX * math.cos(kit.ELEV) / kit.SQ2          # pixels per metre of height
DATA = D.load()
KINDS, PLACES, ICONS = {}, {}, {}
for f in ['models'] + sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(HERE, 'm_*.py'))):
    m = importlib.import_module(f)
    KINDS.update(getattr(m, 'KINDS', {})); PLACES.update(getattr(m, 'PLACES', {})); ICONS.update(getattr(m, 'ICONS', {}))
import models as M

s = kit.reset(); kit.lights()
def want(group, name):
    """(wanted, named exactly)"""
    if NORMALS and group not in ('place', 'kind'): return False, False
    exact = ('%s:%s' % (group, name)) in TARGETS
    return (exact or 'all' in TARGETS or (group + 's') in TARGETS), exact
def skip(fn, exact):
    if NORMALS:     # a normal map needs its beauty frame beside it (same size); one that exists is kept
        return (not os.path.exists(os.path.join(OUT, fn + '.png'))) or (os.path.exists(os.path.join(OUT, 'n-' + fn + '.png')) and not (FORCE or exact))
    return os.path.exists(os.path.join(OUT, fn + '.png')) and not (FORCE or exact)
def catcher(z):
    for o in list(bpy.data.objects):
        if o.name.startswith('catcher'): bpy.data.objects.remove(o, do_unlink=True)
    if z is not None: kit.shadow_catcher(z)
_nrm = []
def bake_normals(fn, meta):
    """Render the scene as camera-space normals (emission only, no lights, no shadow) over flat (128, 128, 255)."""
    if not _nrm:
        m = bpy.data.materials.new('normals'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        g = nt.nodes.new('ShaderNodeNewGeometry'); t = nt.nodes.new('ShaderNodeVectorTransform')
        t.vector_type = 'NORMAL'; t.convert_from = 'WORLD'; t.convert_to = 'CAMERA'
        v = nt.nodes.new('ShaderNodeVectorMath'); v.operation = 'MULTIPLY_ADD'; v.inputs[1].default_value = (0.5, 0.5, -0.5); v.inputs[2].default_value = (0.5, 0.5, 0.5)   # z is negated: Cycles' camera space looks down +Z, Phaser wants +z toward the viewer
        e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(g.outputs['Normal'], t.inputs['Vector']); nt.links.new(t.outputs['Vector'], v.inputs[0])
        nt.links.new(v.outputs['Vector'], e.inputs['Color']); nt.links.new(e.outputs['Emission'], o.inputs['Surface'])
        bpy.context.view_layer.material_override = m
        bg = s.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.5, 0.5, 1.0, 1); bg.inputs[1].default_value = 1.0
        s.render.film_transparent = False
        s.view_settings.view_transform = 'Raw'; s.view_settings.look = 'None'; s.view_settings.exposure = 0.0; s.view_settings.gamma = 1.0
        s.render.dither_intensity = 0.0; s.render.image_settings.color_mode = 'RGB'; s.render.image_settings.color_depth = '8'
        s.cycles.use_denoising = False; s.cycles.max_bounces = 0; s.cycles.use_adaptive_sampling = False
        _nrm.append(m)
    s.cycles.samples = 4
    for o in bpy.data.objects:
        if o.name.startswith('catcher'): o.hide_render = True
        # Flat faces must read as flat: the kit smooth-shades every box, which is invisible in the picture but would make a
        # wall panel shade like a curve under a lamp. Weighted normals keep the flats flat and the rounded parts round.
        elif o.type == 'MESH' and not any(m.type == 'WEIGHTED_NORMAL' for m in o.modifiers):
            wn = o.modifiers.new('flat', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; wn.mode = 'FACE_AREA'
    kit.render(os.path.join(OUT, 'n-' + fn + '.png'))
    jp = os.path.join(OUT, fn + '.json')
    if os.path.exists(jp):
        b = json.load(open(jp))
        if (b['w'], b['h']) != (meta['w'], meta['h']): print('WARNING: %s is now %dx%d but its beauty frame is %dx%d (re-bake it, then --force the normals)' % (fn, meta['w'], meta['h'], b['w'], b['h']))
def done(fn, meta):
    if NORMALS: return bake_normals(fn, meta)
    kit.render(os.path.join(OUT, fn + '.png')); json.dump(meta, open(os.path.join(OUT, fn + '.json'), 'w'))
def build_kind(name, rot, state, at=(0, 0)):
    """Build one thing: turned `rot` degrees, the middle of its footprint at `at`. Returns the objects made."""
    before = set(bpy.data.objects); KINDS[name](state)
    made = [o for o in bpy.data.objects if o not in before]
    root = kit.group([o for o in made if o.parent is None], 'thing'); root.rotation_euler = (0, 0, math.radians(rot)); root.location = (at[0], at[1], 0)
    bpy.context.view_layer.update()
    return made
def extent(objs):
    """The pixel box a set of objects covers, measured from the world origin: (left, right, top, bottom). Room is left
    for the shadow, which falls away from the sun."""
    xs, ys = [], []
    for o in objs:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            for q in (p, Vector((p.x - 0.22 * p.z, p.y - 0.47 * p.z, 0))):
                sx, sy = kit.screen(q, PX); xs.append(sx); ys.append(sy)
    return min(xs), max(xs), min(ys), max(ys)

# ---------- places: one background picture each (and, on request, a preview with every thing in it) ----------
# An outdoor place is one picture. A room is three: bg-<id> (the floor and what is fixed to it), wall-<id>-L and wall-<id>-R (each
# back wall with everything fixed to it, transparent elsewhere), so the game can cut a wall away when the child is in the room
# behind it. models.room_shell tags every object 'floor' / 'L' / 'R'; a pass shows only its parts to the camera (the rest stays in
# the scene, so the walls still shade the floor and bounce light onto each other).
def screen_box(objs, pad=8):
    """The pixel box (left, right, top, bottom) the objects cover, measured from the screen position of the world origin."""
    xs, ys = [], []
    for o in objs:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            sx, sy = kit.screen(o.matrix_world @ Vector(c), PX); xs.append(sx); ys.append(sy)
    return min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
def aim_camera(box):
    """A camera whose picture is exactly `box` (whole pixels, the world origin on a whole pixel). Returns the meta: w, h and the
    pixel (ox, oy) of the world origin (0, 0, 0) inside the picture."""
    l, r, t, b = box; l = math.floor(l); t = math.floor(t)
    W = math.ceil(r) - l; H = math.ceil(b) - t; W += W % 2; H += H % 2
    ox, oy = -l, -t; scx, scy = W / 2 - ox, H / 2 - oy                                   # where the picture's middle is on the screen
    x = (4 * scy / PX - 2 * scx / PX) / 2; y = (4 * scy / PX + 2 * scx / PX) / 2           # a ground point that is there
    for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o, do_unlink=True)
    kit.camera((x, y, 0.0), W, H, PX)
    return dict(w=W, h=H, ox=ox, oy=oy)
_slabs = {}
def _rays(o, on):
    o.visible_shadow = on; o.visible_diffuse = on; o.visible_glossy = on; o.visible_transmission = on
def _emits(o):
    """Does this object glow (a window pane, a lantern)? Its light must still reach the room when it is not in the picture."""
    if 'emits' not in o.keys():
        o['emits'] = any(m and m.use_nodes and 'Principled BSDF' in m.node_tree.nodes and m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value > 0 for m in o.data.materials)
    return o['emits']
def show(parts):
    """Show only these parts ('floor', 'L', 'R') to the camera. All of them stay in the scene, so the walls still shade the floor
    softly and bounce light on it. Three things are done to what is NOT shown, so that nothing unseen spoils what is seen:
      - a wall slab slides back by its own thickness (otherwise the floor under a wall, and the end face of the corner post, are
        sealed in by a wall nobody can see and come out black, and show up when the game cuts that wall away);
      - a wall's thin fittings (skirting, band, frames) take no part in the light at all: they would throw their shadow on the
        bare strip where the wall stood;
      - a floor, and anything that glows, keep their full part in the light."""
    for o, loc in _slabs.items(): o.location = loc
    _slabs.clear()
    for o in bpy.data.objects:
        if 'part' not in o.keys() or o.type != 'MESH': continue
        own = o['part'] in parts
        o.visible_camera = own; _rays(o, True)
        if own or o['part'] == 'floor' or _emits(o): continue
        if o.name.startswith('wall'):
            _slabs[o] = o.location.copy(); o.location = o.location + (Vector((-M.T, 0, 0)) if o['part'] == 'R' else Vector((0, -M.T, 0)))
        else: _rays(o, False)
    bpy.context.view_layer.update()
def walls_of(sp): return list(sp.get('walls', ['L', 'R']))

def bake_room(pid, sp, exact):
    outs = [('bg-' + pid, 'floor')] + [('wall-%s-%s' % (pid, wl), wl) for wl in walls_of(sp)]
    todo = [(fn, part) for fn, part in outs if not skip(fn, exact)]
    if not todo: return
    kit.clear_models(); catcher(None)
    if sp.get('builder'): PLACES[sp['builder']](sp)
    else: M.room_shell(sp)
    for t in sp.get('things', []):
        k = DATA['kinds'][t['kind']]
        if (k.get('fixed') or t.get('fixed')) and t['kind'] in KINDS: build_kind(t['kind'], t.get('rot', 0), t.get('state') or (k.get('states') or [None])[0], t['at'])
    for o in bpy.data.objects:                           # anything not made by the shell (a builder's rails, a rug) is part of the floor
        if o.type != 'CAMERA' and o.name.split('.')[0] not in ('sun', 'fill') and 'part' not in o.keys(): o['part'] = 'floor'
    bpy.context.view_layer.update(); s.cycles.samples = 96
    for fn, part in todo:
        objs = [o for o in bpy.data.objects if o.get('part') == part]
        meta = aim_camera(screen_box(objs))
        show([part])
        if part == 'floor': done(fn, meta)
        else: done(fn, dict(w=meta['w'], h=meta['h'], ax=meta['ox'], ay=meta['oy']))
    show(['floor', 'L', 'R'])

def bake_place(pid, sp, preview):
    kit.clear_models(); catcher(None)
    w, d = sp['size']; top = sp.get('top', sp.get('h', M.WALL_H))
    if sp.get('builder'): PLACES[sp['builder']](sp)
    else: M.room_shell(sp)
    for t in sp.get('things', []):
        k = DATA['kinds'][t['kind']]
        if preview or k.get('fixed') or t.get('fixed'):
            if t['kind'] in KINDS: build_kind(t['kind'], t.get('rot', 0), t.get('state') or (k.get('states') or [None])[0], t['at'])
    W = int((w + d) * PX / 2 + 80) // 2 * 2; H = int((w + d) * PX / 4 + (top + 0.3) * K + 80) // 2 * 2; cz = (top - 0.3) / 2
    kit.camera((w / 2, d / 2, cz), W, H, PX); s.cycles.samples = 32 if preview else 96
    done(('preview-' if preview else 'bg-') + pid, dict(w=W, h=H, ox=W / 2 + (w - d) * PX / 4, oy=H / 2 - (w + d) * PX / 8 + cz * K))
for pid, sp in DATA['places'].items():
    ok, exact = want('place', pid)
    if ok and not sp.get('outdoor'): bake_room(pid, sp, exact)
    elif ok and not skip('bg-' + pid, exact): bake_place(pid, sp, False)
    if (('preview:' + pid) in TARGETS or 'previews' in TARGETS) and not NORMALS: bake_place(pid, sp, True)

# the open grass round the town: a square of it that repeats (tools/art/town.py cuts the tile the game lays out behind everything)
if 'field' in PLACES and not NORMALS and ('field' in TARGETS or 'all' in TARGETS or 'places' in TARGETS) and not skip('bg-field', 'field' in TARGETS):
    bake_place('field', dict(size=[16.0, 16.0], builder='field', top=0.3), False)

# the main road where it leaves the town (world.roads.out): ground only; tools/art/town.py lays it into the ground tiles
for r in ((DATA.get('world') or {}).get('roads') or {}).get('out', []):
    if 'roadend' in PLACES and not NORMALS and (r['id'] in TARGETS or 'all' in TARGETS or 'places' in TARGETS) and not skip('bg-' + r['id'], r['id'] in TARGETS):
        bake_place(r['id'], dict(at=r['at'], size=r['size'], builder='roadend', top=0.3, name=r['id']), False)

# ---------- kinds: one sprite for each direction and state a place uses ----------
need = []
for pid in DATA['places']:
    for n in D.sprites_of(DATA, pid):
        if n not in need: need.append(n)
for n in D.decor_sprites(DATA):
    if n not in need: need.append(n)
for lst in DATA.get('packs', {}).values():
    for n in lst:
        if n not in need: need.append(n)
for n in need:
    name, rest = n.split('@'); rot, _, state = rest.partition('#'); state = state or None
    ok, exact = want('kind', name)
    if not ok or skip('k-' + n, exact): continue
    if name not in KINDS: print('NO BUILDER for kind', name); continue
    kit.clear_models(); catcher(0.0)
    made = build_kind(name, int(rot), state)
    l, r, t, b = extent(made); pad = 10
    hw = max(-l, r) + pad; c = -(t + b) / (2 * K); W = int(math.ceil(hw)) * 2; H = int(math.ceil((b - t) / 2 + pad)) * 2
    kit.camera((0, 0, c), W, H, PX); s.cycles.samples = 96
    done('k-' + n, dict(w=W, h=H, ax=W / 2, ay=H / 2 + c * K))

# ---------- icons: small things for buttons, bubbles and what is carried ----------
for name, build in ICONS.items():
    ok, exact = want('icon', name)
    if not ok or skip('i-' + name, exact): continue
    kit.clear_models(); catcher(0.18); build()
    kit.camera((0, 0, 0.5), 160, 160, 150); s.cycles.samples = 64
    done('i-' + name, dict(w=160, h=160, ax=80, ay=80))
print('BAKED', TARGETS)
