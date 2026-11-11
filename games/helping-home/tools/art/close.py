"""Close-ups of people for checking. blender -b -P close.py -- out_prefix"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, people as P
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
pre = argv[0]
s = kit.reset(); kit.lights(); kit.shadow_catcher()
s.cycles.samples = 40
shots = [('pray', [('boy', P.POSES['sujud'], -90, (0, 0, 0)), ('boy', P.POSES['ruku'], -90, (0, 1.0, 0)), ('boy', P.POSES['sit'], -90, (0, 2.0, 0)), ('boy', P.POSES['stand'], -90, (0, 3.0, 0)),
                   ('dad', P.POSES['sujud'], -90, (1.2, 0, 0)), ('dad', P.POSES['ruku'], -90, (1.2, 1.0, 0)), ('mum', P.POSES['sit'], -90, (1.2, 2.0, 0)), ('mum', P.POSES['sujud'], -90, (1.2, 3.1, 0))]),
         ('front', [('boy', P.POSES['rise'], 90, (0, 0, 0)), ('dad', P.POSES['rise'], 90, (0, 1.0, 0)), ('mum', P.POSES['rise'], 90, (0, 2.0, 0)), ('girl', P.POSES['rise'], 90, (0, 3.0, 0)),
                    ('boy', P.walk(0.1), 0, (1.3, 0.2, 0)), ('dad', P.walk(0.35), 0, (1.3, 1.2, 0)), ('mum', P.walk(0.6), 0, (1.3, 2.2, 0)), ('boy', P.POSES['rise'], 180, (1.3, 3.2, 0))])]
for name, people in shots:
    es = [P.figure(l, q, h, at)[0] for (l, q, h, at) in people]
    kit.camera((0.6, 1.5, 0.55), 1500, 900, 330)
    kit.render(pre + '-' + name + '.png')
    kit.clear_models()
