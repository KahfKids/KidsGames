"""Bake the people of Helping Home as plain PNG frames (runs inside Blender).
   blender -b -P bake_people.py -- <bake_dir> [cast | you | <id> | <set> ...] [--force] [--frames=idle,walk2]
   targets:  cast (all 16 people) | you (the child's 4 layered sets) | a person id (dad, tod, ...; boy and girl too) | a set (boy-kurta, ...)
   A frame that already exists is skipped unless --force is given or its person / set is named exactly.
   build_people.py then trims, packs and converts the frames into life/art/p/ and life/art/you/.

   The cast:  <bake_dir>/p-<id>-<frame>.png, every frame FW x FH, one fixed camera, the shadow catcher on.
   The child: <bake_dir>/you-<set>-<layer>-<frame>.png. Every layer is rendered on its own with all the other parts of
   the body as holdouts, so it holds only the pixels of that part that are really seen; stacked they rebuild the figure.
   `bike` (the child's bicycle, m_vehicles.bicycle, untinted) exists only in the ride frames (ride0 ride1 rideB0 rideB1): the body
   layers are cut where the bicycle hides them and `bike` where the body is in front, so the stacking order does not matter.
   `hat` (the kufi) is optional in the game, so it is left out of the scene for every other layer. `shadow` is the soft
   ground shadow alone (the body is a holdout: it casts the shadow but leaves no pixels). All tintable layers are #F2F2F2."""
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
import kit, people as P

FW, FH, CZ, PX = 288, 288, 0.8, 192
K = PX * math.cos(kit.ELEV) / kit.SQ2             # pixels per metre of height
AX, AY = FW / 2, FH / 2 + CZ * K                  # the spot between the feet, in a frame
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]; FORCE = '--force' in argv; ONLY = [a[9:] for a in argv if a.startswith('--frames=')]; ONLY = ONLY[0].split(',') if ONLY else None      # --frames=idle,walk2: just those
TARGETS = [a for a in argv[1:] if not a.startswith('--')] or ['cast', 'you']
os.makedirs(OUT, exist_ok=True)

s = kit.reset(); kit.lights()
kit.camera((0, 0, CZ), FW, FH, PX); catcher = kit.shadow_catcher(); s.cycles.samples = 40

def exists(fn): return os.path.exists(os.path.join(OUT, fn + '.png'))
def meta():
    """What build_people.py needs to know: the frame, the anchor, who is in the cast, the child's sets."""
    return dict(fw=FW, fh=FH, ax=AX, ay=AY, cz=CZ, px=PX, frames=P.FRAMES, you_frames=P.YOU_FRAMES, cast={i: dict(h=P.LOOKS[i]['h']) for i in P.CAST},
                you={n: dict(layers=y['layers'], h=P.you_look(n)['h']) for n, y in P.YOU.items()})

def bake_cast(pid, exact):
    Lk = P.LOOKS[pid]; n = 0
    for name, q, heading in P.frame_defs(Lk):
        if ONLY and name not in ONLY: continue
        fn = 'p-%s-%s' % (pid, name)
        if exists(fn) and not (FORCE or exact): continue
        kit.clear_models(); catcher.is_shadow_catcher = True; catcher.hide_render = False
        P.figure(Lk, q, heading, (0, 0, 0))
        kit.render(os.path.join(OUT, fn + '.png')); n += 1
    kit.clear_models(); print('CAST', pid, n, 'frames')

def tag_objects(root_objs):
    """The meshes of one figure, by layer."""
    by = {}
    for o in root_objs:
        if o.type == 'MESH': by.setdefault(o.get('layer', 'top'), []).append(o)
    return by

def bake_you(name, exact):
    Lk = P.you_look(name); layers = P.YOU[name]['layers']; n = 0
    for fname, q, heading in P.frame_defs(Lk, rides=True):
        if ONLY and fname not in ONLY: continue
        riding = fname.startswith('ride')
        want = [l for l in layers if (l != 'bike' or riding) and (FORCE or exact or not exists('you-%s-%s-%s' % (name, l, fname)))]
        if not want: continue
        kit.clear_models()
        before = set(bpy.data.objects)
        P.figure(Lk, q, heading, (0, 0, 0))
        if riding: P.bicycle_for(heading, int(fname[-1]))
        meshes = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
        by = tag_objects(meshes)
        for layer in want:
            fn = 'you-%s-%s-%s' % (name, layer, fname)
            for o in meshes: o.is_holdout = False; o.hide_render = False; o.visible_camera = True
            if layer == 'shadow':
                catcher.is_shadow_catcher = True; catcher.hide_render = False; catcher.visible_camera = True
                for o in meshes: o.is_holdout = True      # the body casts its shadow but leaves no pixels of its own
            else:
                # the ground stays in the scene (it bounces light) but is not seen and catches nothing
                catcher.is_shadow_catcher = False; catcher.hide_render = False; catcher.visible_camera = False
                for l, objs in by.items():
                    for o in objs:
                        if l == 'hat' and layer != 'hat': o.hide_render = True      # the kufi is optional: not in the scene
                        elif l != layer: o.is_holdout = True
            kit.render(os.path.join(OUT, fn + '.png')); n += 1
        catcher.is_shadow_catcher = True; catcher.visible_camera = True
    kit.clear_models(); print('YOU', name, n, 'renders')

for t in TARGETS:
    ids = P.CAST if t == 'cast' else ([t] if t in P.LOOKS else [])      # any look by name (boy, girl: for comparing)
    for pid in ids: bake_cast(pid, t == pid)
    sets = list(P.YOU) if t == 'you' else ([t] if t in P.YOU else [])
    for st in sets: bake_you(st, t == st)
    if not ids and not sets: print('UNKNOWN TARGET', t)
json.dump(meta(), open(os.path.join(OUT, 'people-meta.json'), 'w'))
print('BAKED', TARGETS)
