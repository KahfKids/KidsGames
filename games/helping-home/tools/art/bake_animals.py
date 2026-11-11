"""Bake the animals of Helping Home as plain PNG frames (runs inside Blender).
   blender -b -P bake_animals.py -- <bake_dir> [<id> ...] [--force] [--frames=idle,walk2] [--samples=40]
   An animal that is not named is baked when it has no frames yet (all ten are baked when none is named and --force is given).
   A frame that already exists is skipped unless --force is given or its animal is named exactly. Each animal has its own frame
   size (animals.py), the same camera angle, lights and pixels per metre as the people (bake_people.py).
   build_animals.py then trims, packs and converts the frames into life/art/a/."""
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
import kit, animals as A

PX = 192
K = PX * math.cos(kit.ELEV) / kit.SQ2             # pixels per metre of height
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]; FORCE = '--force' in argv
ONLY = [a[9:] for a in argv if a.startswith('--frames=')]; ONLY = ONLY[0].split(',') if ONLY else None
IDS = [a for a in argv[1:] if not a.startswith('--')]
os.makedirs(OUT, exist_ok=True)
ORDER = [i for i in A.ORDER if i in A.ANIMALS]
exact = bool(IDS); IDS = IDS or ORDER

SAMPLES = [int(a[10:]) for a in argv if a.startswith('--samples=')]
s = kit.reset(); kit.lights(); catcher = kit.shadow_catcher(); s.cycles.samples = SAMPLES[0] if SAMPLES else 40

def set_camera(fw, fh, cz):
    for o in list(bpy.data.objects):
        if o.name.split('.')[0] == 'cam': bpy.data.objects.remove(o, do_unlink=True)
    kit.camera((0, 0, cz), fw, fh, PX)

def meta():
    return {i: dict(h=A.ANIMALS[i]['h'], fw=A.ANIMALS[i]['fw'], fh=A.ANIMALS[i]['fh'], cz=A.ANIMALS[i]['cz'],
                    ax=A.ANIMALS[i]['fw'] / 2, ay=A.ANIMALS[i]['fh'] / 2 + A.ANIMALS[i]['cz'] * K, frames=A.frames(i)) for i in ORDER}

def meshes():
    return [o for o in bpy.data.objects if o.type == 'MESH' and o.name.split('.')[0] != 'catcher']

for aid in IDS:
    Sp = A.ANIMALS[aid]; set_camera(Sp['fw'], Sp['fh'], Sp['cz']); n = 0
    for name in A.frames(aid):
        if ONLY and name not in ONLY: continue
        fn = 'a-%s-%s' % (aid, name); path = os.path.join(OUT, fn + '.png')
        if os.path.exists(path) and not (FORCE or exact): continue
        kit.clear_models()
        _, _, heading = A.split(name)
        A.build(aid, name, heading)
        ms = meshes()
        # two passes, as the child's layers in bake_people.py: the animal alone (the ground bounces light but is not seen), and its
        # soft shadow alone (the animal is a holdout). build_animals.py smooths the shadow and lays the animal over it.
        for o in ms: o.is_holdout = False
        catcher.is_shadow_catcher = False; catcher.hide_render = False; catcher.visible_camera = False
        kit.render(path)
        for o in ms: o.is_holdout = True
        catcher.is_shadow_catcher = True; catcher.visible_camera = True
        kit.render(os.path.join(OUT, fn + '-sh.png')); n += 1
        for o in ms: o.is_holdout = False
        catcher.is_shadow_catcher = True; catcher.visible_camera = True
    kit.clear_models(); print('ANIMAL', aid, n, 'frames')
json.dump(meta(), open(os.path.join(OUT, 'animals-meta.json'), 'w'))
print('BAKED', IDS)
