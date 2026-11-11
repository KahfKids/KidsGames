"""Look test with the family in the room. blender -b -P spike2.py -- out.png [px] [samples]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, models as M, people as P
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = argv[0] if argv else '/tmp/spike.png'; px = int(argv[1]) if len(argv) > 1 else 160
s = kit.reset(); kit.lights()
n = M.ROOM
M.room_shell()
M.rug(1.7, 1.9); M.sofa(0.12, 3.3); M.tea_table(2.6, 3.9); M.plant(0.55, 0.6); M.bookshelf(1.9, 0.05)
M.floor_lamp(0.5, 2.85); M.blocks(3.6, 2.6); M.ball_toy(4.4, 4.6); M.mats(4.0, 0.9)
P.figure('boy', P.walk(0.12), 90, (3.2, 3.2, 0))
P.figure('mum', P.salam(), 60, (2.3, 5.0, 0))
P.figure('dad', P.sit_chair(44 / (1.74 / 1.12)), 0, (0.62, 4.0, 0), prop='book')
P.figure('girl', P.carry(), 180, (4.6, 3.6, 0), prop='plate')
P.figure('dad', P.POSES['ruku'], -90, (4.34, 2.6, 0))
P.figure('boy', P.POSES['sujud'], -90, (5.16, 2.6, 0))
W = int(n * px + 120); H = int(n * px / 2 + M.WALL_H * px * 0.612 + 150)
kit.camera((n / 2, n / 2, M.WALL_H * 0.42), W, H, px)
s.cycles.samples = int(argv[2]) if len(argv) > 2 else 64
kit.render(out)
