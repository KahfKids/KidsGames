"""Look test: the whole living room in one picture. blender -b -P spike.py -- out.png [px]"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit, models as M
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
out = argv[0] if argv else '/tmp/spike.png'; px = int(argv[1]) if len(argv) > 1 else 160
s = kit.reset(); kit.lights()
n = M.ROOM
M.room_shell()
M.rug(1.7, 1.9); M.sofa(0.12, 3.3); M.tea_table(2.6, 3.9); M.plant(0.55, 0.6); M.bookshelf(1.9, 0.05)
M.floor_lamp(0.5, 2.85); M.blocks(3.6, 2.6); M.ball_toy(4.4, 4.6); M.mats(4.0, 0.9)
W = int(n * px + 120); H = int(n * px / 2 + M.WALL_H * px * 0.612 + 150)
# centre of the picture: the middle of the floor, lifted so the walls fit
cz = M.WALL_H * 0.42
kit.camera((n / 2, n / 2, cz), W, H, px)
s.cycles.samples = int(argv[2]) if len(argv) > 2 else 64
kit.render(out)
