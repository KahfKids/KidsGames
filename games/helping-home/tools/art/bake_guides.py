"""Bake the pictures of the two guides (wudu and salah) as plain PNG frames (runs inside Blender).
   blender -b -P bake_guides.py -- <bake_dir> [wudu | salah | props | <frame> ...] [--force] [--samples=N]
   One child (the `GUIDE_BOY` look, faceless) is rendered once per step, big, from the game's usual camera (kit.camera,
   kit.lights) at PX = 576 pixels per tile, on a transparent background with a soft ground shadow. The props (the basin and
   its tap, the bench and the foot basin, the water, the prayer mat) are separate pictures rendered in the SAME frame, so a
   picture and a prop line up when both are placed with their anchor on the same spot.
   build_guides.py then trims the frames, packs them into one sheet per guide and converts them.

   Frames:   <bake_dir>/g-<name>.png            every picture FW x FH
   Meta:     <bake_dir>/guides-meta.json         frame size, anchor, pixels per metre, and where the hands, feet and head are in
                                                 each frame (pixels from the anchor), for the marks the game draws on them
   The child's RIGHT hand, arm and foot are the ones the text says come first: the positions are in people.py (WUDU, foot,
   GUIDE_POSES) and the prayer positions are people.POSES, unchanged."""
import sys, os, math, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import bpy
from mathutils import Vector as V
import kit, people as P
from kit import mat, cyl, ball, tube, lathe, box

FW, FH, CZ, PX = 768, 768, 0.3, 576
K = PX * math.cos(kit.ELEV) / kit.SQ2                  # pixels per metre of height
AX, AY = FW / 2, FH / 2 + CZ * K                       # the spot between the feet, in a frame
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0]; FORCE = '--force' in argv
SAMPLES = ([int(a[10:]) for a in argv if a.startswith('--samples=')] or [64])[0]
TARGETS = [a for a in argv[1:] if not a.startswith('--')] or ['wudu', 'salah', 'props']
GROUPS = ('wudu', 'salah', 'props', 'wudu-girl', 'salah-girl')
os.makedirs(OUT, exist_ok=True)

s = kit.reset(); kit.lights()
kit.camera((0, 0, CZ), FW, FH, PX); catcher = kit.shadow_catcher(); s.cycles.samples = SAMPLES

# ---------- the child: one boy in a kurta, bare head for wudu, a white kufi for salah ----------
GUIDE_BOY = dict(h=1.22, head=1.17, skin='#D7A27A', kind='kurta', top='#F2A93B', legs='#3E7C8C', shoe='#7A5236', hair='#2B2019')
WUDU_BOY = dict(GUIDE_BOY, bare=True)
SALAH_BOY = dict(GUIDE_BOY, hat='#FBF6EA')
# the girl: the same height, a long loose dress and a headscarf (people.py kind 'dress' with a scarf), faceless; wudu: sleeves rolled above the elbow
GUIDE_GIRL = dict(h=1.22, head=1.17, skin='#C98E62', kind='dress', top='#7A5CA8', scarf='#F4D9E3', shoe='#8A5A3C')
WUDU_GIRL = dict(GUIDE_GIRL, bare=True)
WUDU_GIRL_FOOT = dict(WUDU_GIRL, pants='#5C4A93')      # for the foot steps: the dress is held at the knees over loose trousers, the feet bare
SALAH_GIRL = dict(GUIDE_GIRL)
KC = GUIDE_BOY['h'] / 1.12 * 0.01                      # metres per skeleton centimetre
HEAD = 90.0                                            # the child faces +Y: down and to the right on the screen

def world(p, heading=HEAD):
    """A point in the child's own frame (skeleton cm: u forward, v left, w up) -> world metres."""
    h = heading * P.D2R; u, v, w = p
    return V(((u * math.cos(h) - v * math.sin(h)) * KC, (u * math.sin(h) + v * math.cos(h)) * KC, w * KC))
def pix(wp):
    """A world point -> pixels from the anchor (x right, y down)."""
    x, y, z = wp
    return ((y - x) * PX / 2, (x + y) * PX / 4 - z * PX * math.cos(kit.ELEV) / kit.SQ2)

def exists(fn): return os.path.exists(os.path.join(OUT, fn + '.png'))
def shot(fn):
    kit.render(os.path.join(OUT, fn + '.png'))

# ---------- the frames ----------
# (name, position, heading): the child turns toward the viewer where both hands are at the face, and faces the basin where they are at it
WUDU_FRAMES = [('stand', P.WUDU['stand'], 70), ('hands', P.WUDU['hands'], 90), ('mouth', P.WUDU['mouth'], 60), ('noseR', P.WUDU['noseR'], 60),
               ('noseL', P.WUDU['noseL'], 60), ('face', P.WUDU['face'], 50), ('armR', P.WUDU['armR'], 90), ('armL', P.WUDU['armL'], 90),
               ('head', P.WUDU['head'], 50), ('ears', P.WUDU['ears'], 45), ('footR', P.foot('R'), 90), ('footL', P.foot('L'), 90)]
SALAH_HEAD = 75.0                                       # the same way in every prayer picture, and the mat turned with it
SALAH_FRAMES = [(n, q, SALAH_HEAD) for n, q in [('p-stand', P.POSES['stand']), ('p-standH', P.GUIDE_POSES['standH']), ('p-takbir', P.GUIDE_POSES['takbir']),
                ('p-takbirH', P.GUIDE_POSES['takbirH']), ('p-ruku', P.POSES['ruku']), ('p-rise', P.POSES['rise']),
                ('p-sujud', P.POSES['sujud']), ('p-sit', P.POSES['sit']), ('p-tash', P.GUIDE_POSES['tash']),
                ('p-salamR', P.GUIDE_POSES['salamR']), ('p-salamL', P.GUIDE_POSES['salamL']), ('p-qunut', P.GUIDE_POSES['qunut'])]]
MARKS = {}                                              # frame -> {part: [dx, dy]} for the game's R / L marks

def bake_child(name, q, heading, look, only, pre=''):
    if only is not None and name not in only: return
    if exists('g-' + pre + name) and not (FORCE or only is not None): return
    kit.clear_models(); catcher.is_shadow_catcher = True; catcher.hide_render = False; catcher.visible_camera = True
    e, J = P.figure(look, q, heading, (0, 0, 0))
    def hand(sd): return J['wr' + sd] + (J['wr' + sd] - J['elb' + sd]).normalized() * 2.6
    w = lambda p: pix(world(p, heading))
    MARKS[pre + name] = {'handR': w(hand('R')), 'handL': w(hand('L')), 'footR': w(J['ankleR']), 'footL': w(J['ankleL']), 'head': w(J['head']), 'kneeR': w(J['kneeR']), 'kneeL': w(J['kneeL']),
                   'elbowR': w(J['elbR']), 'elbowL': w(J['elbL']), 'shR': w(J['shR']), 'shL': w(J['shL'])}
    shot('g-' + pre + name); print('FRAME', pre + name)

# ---------- the props (all in world metres, the child at the origin facing +Y) ----------
CER, CER_IN, TEAL, CHROME, BLUE = '#FBF4E6', '#E8F1EE', '#3FA7A3', '#D7DFE3', '#4A90E2'
BOWL = (0.0, 0.31)                                      # the centre of the basin's bowl
RIM_Z = 0.55
TAP_H = 0.30
def basin():
    m_c = mat(CER, .45); m_in = mat(CER_IN, .55); m_t = mat(TEAL, .6); m_ch = mat(CHROME, .3, .15); m_b = mat(BLUE, .4)
    cx, cy = BOWL
    lathe(cx, cy, 0, [(0, 0), (.13, 0), (.14, .012), (.13, .03), (.075, .05), (0, .05)], m_t)                       # the foot plate
    cyl(cx, cy, .04, .065, RIM_Z - .1, m_t, .01, 40, r2=.05)                                                        # the pedestal
    # the bowl: outside, the rim and the inside (one thin shell each)
    lathe(cx, cy, 0, [(.0, .43), (.07, .425), (.15, .445), (.2, .495), (.222, .545), (.225, RIM_Z)], m_c)
    lathe(cx, cy, 0, [(.225, RIM_Z), (.215, RIM_Z + .012), (.195, RIM_Z + .008), (.185, RIM_Z - .012)], m_c)
    lathe(cx, cy, 0, [(.185, RIM_Z - .012), (.15, .505), (.09, .472), (.0, .468)], m_in)
    cyl(cx, cy + .0, .469, .03, .003, mat('#4F5A5E', .5), .001, 24)                                                  # the drain
    # the tap: a pillar at the far rim, a curved spout over the middle of the bowl, a blue lever
    ty = cy + .2; H = TAP_H
    cyl(cx, ty, RIM_Z - .01, .03, .02, m_ch, .004, 28, r2=.034)
    cyl(cx, ty, RIM_Z + .01, .02, H - .02, m_ch, .004, 24)
    ball(cx, ty, RIM_Z + H, .026, m_ch)
    pts = [(cx, ty, RIM_Z + H), (cx, ty - .035, RIM_Z + H + .035), (cx, ty - .1, RIM_Z + H + .045), (cx, ty - .16, RIM_Z + H + .025), (cx, cy, RIM_Z + H - .015)]
    for a, b in zip(pts, pts[1:]): tube(a, b, .016, m_ch)
    tube((cx, cy, RIM_Z + H - .015), (cx, cy, RIM_Z + H - .04), .019, mat('#BFC8CC', .4))                           # the little nozzle
    tube((cx, ty, RIM_Z + H - .1), (cx + .085, ty + .005, RIM_Z + H - .09), .011, m_ch); ball(cx + .09, ty + .005, RIM_Z + H - .09, .022, m_b)
SPOUT = (BOWL[0], BOWL[1], RIM_Z + TAP_H - .04)                # where the water leaves the tap

def water_col(z0, z1, hi=0.0):
    m_w = mat('#8FD3F2', .15, emit=('#8FD3F2', .55)); m_h = mat('#FFFFFF', .2, emit=('#FFFFFF', .9))
    cx, cy = BOWL
    tube((cx, cy, z1), (cx, cy, z0), .016, m_w, .013)
    # a light streak that slides (the two frames of the flow)
    tube((cx + .006, cy - .006, z1 - .01 - hi * .03), (cx + .006, cy - .006, z1 - .035 - hi * .03), .0036, m_h)
    tube((cx + .005, cy - .006, z0 + .09 + hi * .04), (cx + .005, cy - .006, z0 + .05 + hi * .04), .0032, m_h)
def splash(ph):
    m_w = mat('#8FD3F2', .15, emit=('#8FD3F2', .45)); m_h = mat('#FFFFFF', .2, emit=('#FFFFFF', .8))
    cx, cy = BOWL; z = .474
    r = .045 + ph * .015
    lathe(cx, cy, z, [(r - .012, 0), (r, .004), (r + .008, .012), (r, .017), (r - .012, .013)], m_w)            # a low ring of water
    for i in range(5):
        a = i * 1.26 + ph * .6; d = .055 + ph * .02 + (i % 2) * .012
        ball(cx + math.cos(a) * d, cy + math.sin(a) * d, z + .03 + (i % 3) * .012 + ph * .01, .008 - (i % 2) * .002, m_h)
def bench():
    m_w = mat('#C99B65', .75); m_d = mat('#A67B4B', .8)
    box(-.24, -.2, .226, .48, .34, .035, m_w, .012, 'bench')
    for x in (-.2, .2): box(x - .018, -.17, 0, .036, .28, .226, m_d, .008, 'bleg')
    box(-.2, -.045, .1, .4, .03, .03, m_d, .006, 'brace')
FOOT = (0.0, 0.40)                                       # the centre of the foot basin
def footbasin():
    m_c = mat(CER, .45); m_in = mat(CER_IN, .55); m_t = mat(TEAL, .6); m_ch = mat(CHROME, .3, .15); m_b = mat(BLUE, .4)
    cx, cy = FOOT
    lathe(cx, cy, 0, [(0, 0), (.2, 0), (.215, .012), (.2, .03), (.0, .03)], m_t)
    lathe(cx, cy, 0, [(.0, .03), (.17, .04), (.225, .1), (.25, .15)], m_c)
    lathe(cx, cy, 0, [(.25, .15), (.243, .163), (.226, .16), (.22, .145)], m_c)
    lathe(cx, cy, 0, [(.22, .145), (.18, .09), (.0, .06)], m_in)
    # a low tap at the far left corner, its spout reaching over the foot
    tx, ty = cx - .24, cy + .05
    cyl(tx, ty, .15, .03, .02, m_ch, .004, 28, r2=.034); cyl(tx, ty, .17, .02, .27, m_ch, .004, 24); ball(tx, ty, .44, .026, m_ch)
    pts = [(tx, ty, .44), (tx + .04, ty, .48), (tx + .11, ty - .005, .495), (tx + .19, ty - .015, .475), (tx + .25, ty - .02, .44)]
    for a, b in zip(pts, pts[1:]): tube(a, b, .016, m_ch)
    tube(pts[-1], (pts[-1][0], pts[-1][1], pts[-1][2] - .03), .019, mat('#BFC8CC', .4))
    tube((tx, ty, .37), (tx - .02, ty + .08, .38), .011, m_ch); ball(tx - .022, ty + .09, .38, .022, m_b)
FOOT_SPOUT = (FOOT[0] - .24 + .25, FOOT[1] + .05 - .02, .41)

def flat_arch(cx, y0, w, h, thick, m, z):
    """A flat arch lying on the mat: its straight foot at y0, its pointed-round top at y0 + h, w wide, centred on x = cx."""
    import bmesh
    me = bpy.data.meshes.new('arch'); bm = bmesh.new(); r = w / 2; segs = 20
    pts = [(cx - r, y0), (cx + r, y0), (cx + r, y0 + h - r)] + [(cx + r * math.cos(math.pi * i / segs), y0 + h - r + r * math.sin(math.pi * i / segs)) for i in range(1, segs)] + [(cx - r, y0 + h - r)]
    lo = [bm.verts.new((x, y, z)) for x, y in pts]; hi = [bm.verts.new((x, y, z + thick)) for x, y in pts]
    bm.faces.new(lo[::-1]); bm.faces.new(hi); n = len(pts)
    for i in range(n): bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('arch', me); bpy.context.collection.objects.link(o)
    return kit._finish(o, m, min(.003, thick / 2.2))
MAT_Y0, MAT_Y1, MAT_W = -.26, .92, .70
def prayer_mat():
    before = set(bpy.data.objects)
    _prayer_mat()
    root = bpy.data.objects.new('matroot', None); bpy.context.collection.objects.link(root)
    for o in bpy.data.objects:
        if o not in before and o is not root: o.parent = root
    root.rotation_euler = (0, 0, (SALAH_HEAD - 90) * P.D2R)
def _prayer_mat():
    border = mat('#F6E3B8', .95); body = mat('#2F8F83', .95); inl = mat('#9AD3C6', .95); dark = mat('#1F6F66', .95); gold = mat('#E9B44C', .8)
    L = MAT_Y1 - MAT_Y0
    box(-MAT_W / 2, MAT_Y0, 0, MAT_W, L, .012, border, .005, 'mat')
    box(-MAT_W / 2 + .045, MAT_Y0 + .05, .012, MAT_W - .09, L - .1, .004, body, .002, 'matin')
    flat_arch(0, MAT_Y1 - .62, .36, .54, .004, dark, .016)
    flat_arch(0, MAT_Y1 - .60, .30, .46, .004, inl, .02)
    ball(0, MAT_Y1 - .22, .026, .028, gold, 1, 1, .2)
    for i in range(7):                                  # fringe at both ends
        for yy in (MAT_Y0 - .02, MAT_Y1 + .02):
            box(-MAT_W / 2 + .035 + i * .1, yy - .02, 0, .035, .04, .006, border, .002, 'fringe')

def bake_prop(name, build, shadow=True):
    if exists('g-' + name) and not (FORCE or name in TARGETS): return
    kit.clear_models(); catcher.is_shadow_catcher = shadow; catcher.hide_render = False; catcher.visible_camera = shadow
    build(); shot('g-' + name); print('PROP', name)

PROPS = [('basin', basin), ('bench', bench), ('footbasin', footbasin), ('mat', prayer_mat)]
FX = [('stream0', lambda: water_col(.485, SPOUT[2], 0)), ('stream1', lambda: water_col(.485, SPOUT[2], 1)),
      ('splash0', lambda: splash(0)), ('splash1', lambda: splash(1))]

only = [t for t in TARGETS if t not in GROUPS]
if 'wudu' in TARGETS or only:
    for n, q, h in WUDU_FRAMES: bake_child(n, q, h, WUDU_BOY, only if 'wudu' not in TARGETS else None)
if 'salah' in TARGETS or only:
    for n, q, h in SALAH_FRAMES: bake_child(n, q, h, SALAH_BOY, only if 'salah' not in TARGETS else None)
SALAH_FRAMES_GIRL = [(n, (P.GIRL_POSES['standH'] if n == 'p-standH' else P.GIRL_POSES['takbirH'] if n == 'p-takbirH' else q), h) for n, q, h in SALAH_FRAMES]
SALAH_FRAMES_GIRL.insert([n for n, _, _ in SALAH_FRAMES_GIRL].index('p-sujud') + 1, ('p-sujudH', P.GIRL_POSES['sujudH'], SALAH_HEAD))
if 'wudu-girl' in TARGETS:
    for n, q, h in WUDU_FRAMES: bake_child(n, q, h, WUDU_GIRL_FOOT if n.startswith('foot') else WUDU_GIRL, None, 'girl-')
if 'salah-girl' in TARGETS:
    for n, q, h in SALAH_FRAMES_GIRL: bake_child(n, q, h, SALAH_GIRL, None, 'girl-')
if 'props' in TARGETS or only:
    for n, b in PROPS:
        if 'props' in TARGETS or n in only: bake_prop(n, b)
    for n, b in FX:
        if 'props' in TARGETS or n in only: bake_prop(n, b, shadow=False)

# the meta file keeps what earlier runs knew, so a single frame can be baked alone
mp = os.path.join(OUT, 'guides-meta.json')
old = json.load(open(mp)) if os.path.exists(mp) else {}
marks = old.get('marks', {}); marks.update({k: {a: [round(b[0], 1), round(b[1], 1)] for a, b in v.items()} for k, v in MARKS.items()})
meta = dict(fw=FW, fh=FH, ax=AX, ay=AY, px=PX, k=K, kc=KC, wudu=[n for n, _, _ in WUDU_FRAMES], salah=[n for n, _, _ in SALAH_FRAMES], salahgirl=[n for n, _, _ in SALAH_FRAMES_GIRL],
            props=[n for n, _ in PROPS] + [n for n, _ in FX], marks=marks,
            spout=[round(v, 1) for v in pix(SPOUT)], bowl=[round(v, 1) for v in pix((BOWL[0], BOWL[1], .47))],
            footspout=[round(v, 1) for v in pix(FOOT_SPOUT)], footbowl=[round(v, 1) for v in pix((FOOT[0], FOOT[1], .1))])
json.dump(meta, open(mp, 'w'))
print('BAKED', TARGETS)
