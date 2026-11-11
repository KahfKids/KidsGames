"""Helping Home art: the people (runs inside Blender; see kit.py).

A person is a small skeleton (hip, spine, head, two-bone arms and legs solved with IK) dressed in soft cloth
shapes. FACELESS, always: the head is a plain ball; a hijab or hair leaves a plain round face area. No eyes,
nose, mouth or any mark.

The skeleton and the prayer positions are the ones in pray/salah-kid.js (TEACHER REVIEW), unchanged: lengths in
centimetres for a child of 112 cm, the local frame u forward, v to the person's left, w up, the origin between
the feet. Other people are that skeleton scaled.  figure(look, q, heading, at) builds one person in the world.
"""
import math
from mathutils import Vector
import bpy
import kit
from kit import ball, tube, loft, mat

D2R = math.pi / 180
B = dict(ankle=4, shin=25, thigh=27, torso=33, neck=3.4, head=9.6, uarm=16.5, farm=14.5, shW=8.6, hipW=4.8,
         wThigh=9.8, wShin=7.6, wUarm=6.4, wFarm=5.6)
TORSO = [(-.12, 8.4, 6.4, -.2), (.2, 8.2, 6.9, .5), (.52, 8.9, 7.0, .5), (.8, 9.6, 6.5, .1), (.95, 8.2, 5.4, 0), (.995, 5.4, 4, 0)]
V = Vector
def n3(a): a = V(a); return a.normalized() if a.length > 1e-9 else V((0, 0, 1))
def lerp(a, b, t): return V(a) + (V(b) - V(a)) * t

# ---------- the positions (from pray/salah-kid.js) ----------
HIPZ = B['ankle'] + B['shin'] + B['thigh'] - .4
standLegs = dict(L=dict(ankle=(.6, 5.3, B['ankle']), hint=(1, .1, 0)), R=dict(ankle=(.6, -5.3, B['ankle']), hint=(1, -.1, 0)))
flatFeet = dict(L=dict(f=(1, .1, 0), n=(0, 0, -1)), R=dict(f=(1, -.1, 0), n=(0, 0, -1)))
upright = dict(f=(.12, 0, -1), n=(-1, 0, .1))
armsDown = dict(L=dict(wrist=lambda J: J['shL'] + V((1.2, 1.7, -30.3)), elbow=(-1, .3, 0)),
                R=dict(wrist=lambda J: J['shR'] + V((1.2, -1.7, -30.3)), elbow=(-1, -.3, 0)))
SIT = dict(hip=(3, 0, 10.6), lean=3, tilt=16,
           legs=dict(L=dict(knee=(27.5, 6.4, 4.2), ankle=(.5, 3.2, 2.7)), R=dict(knee=(27.5, -7.4, 4.2), ankle=(1.5, -8.4, 7.7))),
           feet=dict(L=dict(f=(-.72, -.69, 0), n=(0, 0, 1)), R=upright))
def onThigh(sd):
    s = 1 if sd == 'L' else -1
    return dict(wrist=lambda J: lerp(J['hip' + sd], J['knee' + sd], .57) + V((0, .5 * s, 6.4)), elbow=(-.6, .7 * s, -.2))
def fold(z):
    return dict(L=dict(wrist=(8.4, 3.6, z), elbow=(-.3, 1, -.8)), R=dict(wrist=(10.6, -3.6, z + 2), elbow=(-.3, -1, -.8)))
POSES = dict(
    rise=dict(hip=(-.4, 0, HIPZ), lean=0, tilt=12, legs=standLegs, feet=flatFeet, arms=armsDown),
    stand=dict(hip=(-.4, 0, HIPZ), lean=1, tilt=16, legs=standLegs, feet=flatFeet, arms=fold(69.5)),
    ruku=dict(hip=(-6.5, 0, 53.6), lean=91, tilt=10, legs=standLegs, feet=flatFeet, arms=dict(
        L=dict(wrist=lambda J: J['kneeL'] + V((4.4, .3, 4.6)), elbow=(-.2, 1, .2)),
        R=dict(wrist=lambda J: J['kneeR'] + V((4.4, -.3, 4.6)), elbow=(-.2, -1, .2)))),
    sujud=dict(hip=(21, 0, 30.6), lean=111, tilt=24, sujud=True,
        legs=dict(L=dict(knee=(27, 5.6, 4.2), ankle=(2.6, 5, 7.7)), R=dict(knee=(27, -5.6, 4.2), ankle=(2.6, -5, 7.7))),
        feet=dict(L=upright, R=upright), arms=dict(
            L=dict(wrist=lambda J: V((J['head'][0] - 5.6, 14.6, 2.1)), elbow=(-.25, 1, .95)),
            R=dict(wrist=lambda J: V((J['head'][0] - 5.6, -14.6, 2.1)), elbow=(-.25, -1, .95)))),
    sit=dict(SIT, arms=dict(L=onThigh('L'), R=onThigh('R'))),
)
def _sujud_lean(q):
    best, err = q['lean'], 1e9; l = 85.0
    while l <= 140:
        a = l * D2R; nz = q['hip'][2] + B['torso'] * math.cos(a); hz = nz + (B['neck'] + B['head'] * .92) * math.cos(135 * D2R)
        e = abs(hz - (B['head'] + .25))
        if e < err: err, best = e, l
        l += .25
    q['lean'] = best; q['tilt'] = 135 - best
_sujud_lean(POSES['sujud'])

# ---------- everyday positions (not worship) ----------
def walk(p, robe=False):
    """One step of a walk, p = 0..1 round the cycle."""
    a = 2 * math.pi * p; S = 9.0 if robe else 12.5; LIFT = 2.4 if robe else 5.5
    def leg(ph, s):
        u = S * math.sin(ph); lift = max(0.0, math.cos(ph)) * LIFT
        return dict(ankle=(u + .6, 5.0 * s, B['ankle'] + lift), hint=(1, .1 * s, 0)), dict(f=(1, .1 * s, -0.25 * max(0.0, math.cos(ph)) + 0.12 * max(0.0, -math.sin(ph))), n=(0, 0, -1))
    lL, fL = leg(a, 1); lR, fR = leg(a + math.pi, -1)
    def arm(ph, s):
        sw = math.sin(ph)
        return dict(wrist=lambda J, s=s, sw=sw: J['sh' + ('L' if s > 0 else 'R')] + V((1.2 + sw * 12, 1.9 * s, -30.0 + abs(sw) * 2.5)), elbow=(-1, .3 * s, 0))
    return dict(hip=(-.4, 0, HIPZ - 1.9 + 1.3 * math.cos(2 * a)), lean=4, tilt=9, legs=dict(L=lL, R=lR), feet=dict(L=fL, R=fR),
                arms=dict(L=arm(a + math.pi, 1), R=arm(a, -1)))
def sit_chair(seat=30.0):
    """Sitting on a seat `seat` high (in this person's own centimetres)."""
    hz = seat + 5.5
    return dict(hip=(-6, 0, hz), lean=-4, tilt=14,
                legs=dict(L=dict(knee=(21, 6.4, hz + 1), ankle=(24, 6.8, hz - 24)), R=dict(knee=(21, -6.4, hz + 1), ankle=(24, -6.8, hz - 24))),
                feet=dict(L=dict(f=(1, .12, -.2), n=(0, 0, -1)), R=dict(f=(1, -.12, -.2), n=(0, 0, -1))),
                arms=dict(L=onThigh('L'), R=onThigh('R')))
def reach():
    q = dict(POSES['rise']); q['lean'] = 5
    q['arms'] = dict(L=armsDown['L'], R=dict(wrist=(24, -8, 74), elbow=(-.4, -.6, -1)))
    return q
def carry():
    q = dict(POSES['rise']); q['lean'] = 2
    q['arms'] = dict(L=dict(wrist=(15, 5.5, 64), elbow=(-.5, .8, -1)), R=dict(wrist=(15, -5.5, 64), elbow=(-.5, -.8, -1)))
    return q
def salam():
    """The right hand on the chest."""
    q = dict(POSES['rise']); q['tilt'] = 20
    q['arms'] = dict(L=armsDown['L'], R=dict(wrist=(8.5, 1.5, 80), elbow=(-.2, -1, -.7)))
    return q

# ---------- solving the skeleton (as in pray/salah-kid.js) ----------
def ik(A, T, l1, l2, hint):
    A = V(A); T = V(T); d = T - A; dl = d.length
    mx = (l1 + l2) * .999; mn = abs(l1 - l2) + .01
    if dl > mx: T = A + d * (mx / dl); d = T - A; dl = mx
    if dl < mn: dl = mn
    dr = n3(d); a = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl); hh = math.sqrt(max(0, l1 * l1 - a * a))
    hint = V(hint); pp = hint - dr * hint.dot(dr)
    if pp.length < 1e-4: pp = dr.orthogonal()
    pp = n3(pp); j = A + dr * a + pp * hh
    return j, j + n3(T - j) * l2
def solve(q):
    J = {}; l = q['lean'] * D2R
    a = V((math.sin(l), 0, math.cos(l))); f = V((math.cos(l), 0, -math.sin(l)))
    J['a'] = a; J['f'] = f; J['hip'] = V(q['hip'])
    J['neck'] = J['hip'] + a * B['torso']
    shC = J['neck'] + a * (-B['torso'] * .1)
    J['shL'] = shC + V((0, B['shW'], 0)); J['shR'] = shC + V((0, -B['shW'], 0))
    J['hipL'] = J['hip'] + V((0, B['hipW'], 0)); J['hipR'] = J['hip'] + V((0, -B['hipW'], 0))
    hl = (q['lean'] + q.get('tilt', 0)) * D2R; yw = q.get('yaw', 0) * D2R
    J['hd'] = V((math.sin(hl), 0, math.cos(hl)))
    J['hf'] = n3(V((math.cos(hl), 0, -math.sin(hl))) * math.cos(yw) + V((0, 1, 0)) * math.sin(yw))
    J['head'] = J['neck'] + J['hd'] * (B['neck'] + B['head'] * .92)
    for sd in 'LR':
        s = 1 if sd == 'L' else -1; hp = J['hip' + sd]; g = q['legs'][sd]
        if 'knee' in g:
            kn = hp + n3(V(g['knee']) - hp) * B['thigh']; an = kn + n3(V(g['ankle']) - kn) * B['shin']
        else:
            kn, an = ik(hp, g['ankle'], B['thigh'], B['shin'], g.get('hint', (1, s * .1, 0)))
        J['knee' + sd] = kn; J['ankle' + sd] = an
        ft = q['feet'][sd]; J['foot' + sd] = dict(f=n3(ft['f']), n=n3(ft['n']))
    for sd in 'LR':
        s = 1 if sd == 'L' else -1; sh = J['sh' + sd]; g = q['arms'][sd]
        w = g['wrist'](J) if callable(g['wrist']) else V(g['wrist'])
        e, wr = ik(sh, w, B['uarm'], B['farm'], g.get('elbow', (-.35, s * .35, -.2)))
        J['elb' + sd] = e; J['wr' + sd] = wr
    return J

# ---------- the looks ----------
# h = height in metres, head = head-size ratio, stoop = degrees added to the forward lean in everyday positions only.
LOOKS = dict(
    boy=dict(h=1.20, head=1.18, skin='#C98E62', kind='kurta', top='#3E8FD8', legs='#2F5E9E', shoe='#7A5236', hat='#FBF6EA', hair='#33261C'),
    girl=dict(h=1.28, head=1.15, skin='#D7A27A', kind='dress', top='#E7835F', scarf='#F6E3B8', shoe='#8A5A3C'),
    mum=dict(h=1.60, head=0.98, skin='#D7A27A', kind='dress', top='#7A5CA8', scarf='#F4D9A6', shoe='#6B4630'),
    dad=dict(h=1.74, head=0.95, skin='#B97F58', kind='thobe', top='#F8F3E8', shoe='#6B4630', hat='#3F7D78', hair='#2B2019'),
    sis=dict(h=1.42, head=1.06, skin='#D7A27A', kind='dress', top='#E7835F', scarf='#F6E3B8', shoe='#8A5A3C'),
    tod=dict(h=0.86, head=1.42, skin='#C98E62', kind='kurta', top='#EBB23A', legs='#8A5A3C', shoe='#7A5236', hair='#33261C'),
    gpa=dict(h=1.66, head=0.96, skin='#B97F58', kind='thobe', top='#DCE6EA', shoe='#6B4630', hat='#FBF6EA', hair='#D6D2CC', stoop=9),
    gma=dict(h=1.52, head=1.00, skin='#D7A27A', kind='dress', top='#6F9A78', scarf='#FBF6EA', shoe='#6B4630', stoop=8),
    imam=dict(h=1.76, head=0.95, skin='#A8714C', kind='thobe', top='#E9DEC8', shoe='#6B4630', hat='#FBFBF5', hair='#2B2019'),
    teacher=dict(h=1.62, head=0.98, skin='#E0B08A', kind='dress', top='#3B4A8F', scarf='#F2C6C0', shoe='#6B4630'),
    shop=dict(h=1.70, head=0.96, skin='#C98E62', kind='kurta', top='#4E9A6B', legs='#5A4636', shoe='#6B4630', hair='#2B2019'),
    baker=dict(h=1.68, head=0.97, skin='#B97F58', kind='kurta', top='#FAF7F0', legs='#8A6A4A', shoe='#6B4630', hat='#FBF6EA', hair='#33261C'),
    elder=dict(h=1.62, head=0.97, skin='#C98E62', kind='thobe', top='#B9A58C', shoe='#6B4630', hat='#7A5236', hair='#E4E0DA', stoop=11),
    fmum=dict(h=1.58, head=0.98, skin='#C98E62', kind='dress', top='#2E9C97', scarf='#FBF3E4', shoe='#6B4630'),
    fboy=dict(h=1.22, head=1.17, skin='#D7A27A', kind='kurta', top='#5FA85A', legs='#3F6E4A', shoe='#7A5236', hair='#2B2019'),
    fgirl=dict(h=1.24, head=1.16, skin='#B97F58', kind='dress', top='#6FA8DC', scarf='#F2A7B5', shoe='#8A5A3C'),
    nmum=dict(h=1.64, head=0.98, skin='#E0B08A', kind='dress', top='#C96A7A', scarf='#DDDDE6', shoe='#6B4630'),
    nkid=dict(h=1.15, head=1.20, skin='#E0B08A', kind='kurta', top='#E58C3A', legs='#6B4630', shoe='#7A5236', hair='#33261C'),
)
CAST = ['dad', 'mum', 'sis', 'tod', 'gpa', 'gma', 'imam', 'teacher', 'shop', 'baker', 'elder', 'fmum', 'fboy', 'fgirl', 'nmum', 'nkid']

# The child's own character: baked as separate layers in a near-white the game tints (see bake_people.py).
TINT = '#F2F2F2'
YOU = dict(
    **{'boy-kurta': dict(kind='kurta', layers=['shadow', 'bike', 'skin', 'top', 'legs', 'hair', 'hat']),
       'boy-thobe': dict(kind='thobe', layers=['shadow', 'bike', 'skin', 'top', 'hair', 'hat']),
       'girl-hair': dict(kind='dress', layers=['shadow', 'bike', 'skin', 'top', 'hair'], bob=True),
       'girl-scarf': dict(kind='dress', layers=['shadow', 'bike', 'skin', 'top', 'scarf'])})
# `bike` is the child's bicycle (m_vehicles.bicycle), untinted, drawn only in the ride frames; it is no part of the body.
def you_look(name):
    """The look of one of the child's sets, every tintable part in TINT."""
    y = YOU[name]; Lk = dict(h=1.20, head=1.18, kind=y['kind'], skin=TINT, top=TINT, shoe=TINT)
    if y['kind'] == 'kurta': Lk['legs'] = TINT
    if 'scarf' in y['layers']: Lk['scarf'] = TINT
    else: Lk['hair'] = TINT
    if 'hat' in y['layers']: Lk['hat'] = TINT
    if y.get('bob'): Lk['bob'] = True
    return Lk

# ---------- the frames of a sheet (names are the atlas frame names) ----------
FRAMES = (['idle'] + ['walk%d' % i for i in range(8)] + ['sit', 'sitlow', 'reach', 'carry', 'salam', 'wave', 'idleB'] +
          ['walkB%d' % i for i in range(8)] + ['sitB', 'reachB', 'carryB', 'pstand', 'pruku', 'psujud', 'psit', 'ptakbir', 'psalamR', 'psalamL'])
RIDE = ['ride0', 'ride1', 'rideB0', 'rideB1']      # the child on the bicycle (the sets only); the bicycle itself is `bike`
YOU_FRAMES = FRAMES + RIDE
def ride(h, phase):
    """Sitting on the saddle of m_vehicles.bicycle(), hands on the grips, feet on the pedals. phase 0: the left pedal is down,
    1: the right one. Everything is the bicycle's metres turned into this person's centimetres (k metres per cm)."""
    k = h / 1.12 * 0.01; c = lambda x, y, z: (x / k, y / k, z / k)
    hip = c(-0.14, 0, 0.52 + 0.058 * h / 1.2)
    down, up = (-0.006, 0.194), (-0.096, 0.429)               # the ankle (x, z) over a pedal at the bottom and at the top
    def leg(sd):
        s = 1 if sd == 'L' else -1; lowered = (phase == 0) == (sd == 'L'); ax, az = down if lowered else up
        return dict(ankle=c(ax, s * 0.09, az), hint=(1, s * .12, .35))
    def arm(sd):
        s = 1 if sd == 'L' else -1
        return dict(wrist=c(0.232, s * 0.20, 0.655), elbow=(-.25, s * .9, -.55))
    ft = lambda s: dict(f=(1, .1 * s, -.12), n=(0, 0, -1))
    return dict(hip=hip, lean=30, tilt=-4, legs=dict(L=leg('L'), R=leg('R')), feet=dict(L=ft(1), R=ft(-1)), arms=dict(L=arm('L'), R=arm('R')))
def bicycle_for(heading, phase):
    """The child's bicycle at the origin turned to `heading` (degrees), the left pedal down (phase 0) or the right (1). Every
    part is tagged layer `bike`. Returns the parts."""
    from mathutils import Matrix
    from m_vehicles import bicycle
    parts = bicycle(); bb = V((0, 0, .255))
    if phase:                                             # turn the cranks and pedals half way round the bottom bracket
        M = Matrix.Translation(bb) @ Matrix.Rotation(math.pi, 4, 'Y') @ Matrix.Translation(-bb)
        for o in parts:
            p = o.matrix_world.translation
            if abs(p.y) >= .065 and abs(p.x) < .07 and .1 < p.z < .42: o.matrix_world = M @ o.matrix_world
    root = bpy.data.objects.new('bike', None); bpy.context.collection.objects.link(root)
    for o in parts: o.parent = root; o['layer'] = 'bike'
    root.rotation_euler = (0, 0, heading * D2R)
    return parts
def wave():
    """Standing, the right hand raised beside the head."""
    q = dict(POSES['rise']); q['lean'] = 0; q['tilt'] = 14
    q['arms'] = dict(L=armsDown['L'], R=dict(wrist=(3.5, -20.5, 97), elbow=(-.2, -.2, -1)))
    return q
# ---------- the guides (life/guides.js): wudu actions and the prayer positions the old pages show beyond POSES ----------
# Prayer: taken unchanged from pray/salah-kid.js (TEACHER REVIEW): takbir / qunut / tash / salam, and the Hanafi boy's hands (standH, takbirH).
def _raise(z, v, u):
    return dict(L=dict(wrist=(u, v, z), elbow=(.5, 1, -1)), R=dict(wrist=(u, -v, z), elbow=(.5, -1, -1)))
def _tash():
    q = dict(SIT, arms=dict(L=onThigh('L'), R=dict(onThigh('R'), point=True))); return q
GUIDE_POSES = dict(
    takbir=dict(hip=(-.4, 0, HIPZ), lean=0, tilt=8, legs=standLegs, feet=flatFeet, arms=_raise(89.5, 13.6, 2.2)),             # Shafi'i
    takbirH=dict(hip=(-.4, 0, HIPZ), lean=0, tilt=8, legs=standLegs, feet=flatFeet, arms=_raise(95.6, 14.4, 1.6)),            # Hanafi, a boy
    standH=dict(POSES['stand'], arms=fold(60.5)),                                                                              # Hanafi, a boy
    qunut=dict(hip=(-.4, 0, HIPZ), lean=0, tilt=14, legs=standLegs, feet=flatFeet, arms=dict(
        L=dict(wrist=(13.5, 4.6, 74), elbow=(-.4, .7, -1)), R=dict(wrist=(13.5, -4.6, 74), elbow=(-.4, -.7, -1)))),
    tash=_tash(),
    salamR=dict(SIT, tilt=8, yaw=-72, arms=dict(L=onThigh('L'), R=onThigh('R'))),
    salamL=dict(SIT, tilt=8, yaw=72, arms=dict(L=onThigh('L'), R=onThigh('R'))),
)
# The girl's variants under the Hanafi school (pray/salah-kid.js applyStyle, TEACHER REVIEW; for Shafi'i a girl keeps the boy's positions):
# the hands folded on the chest, the hands up to the shoulders (elbows close), and the compact sujood (belly near the thighs,
# arms close to the sides).
def _compact_sujud():
    s = POSES['sujud']
    q = dict(s, hip=(8.5, 0, 23.4), arms=dict(L=dict(wrist=s['arms']['L']['wrist'], elbow=(-.7, .35, -.25)),
                                               R=dict(wrist=s['arms']['R']['wrist'], elbow=(-.7, -.35, -.25))))
    _sujud_lean(q); return q
_tk = _raise(81, 12.4, 3.2); _tk['L']['elbow'] = (.4, .45, -1); _tk['R']['elbow'] = (.4, -.45, -1)
GIRL_POSES = dict(standH=dict(POSES['stand'], arms=fold(75.5)),
                  takbirH=dict(hip=(-.4, 0, HIPZ), lean=0, tilt=8, legs=standLegs, feet=flatFeet, arms=_tk),
                  sujudH=_compact_sujud())
# Wudu: everyday positions (not worship). The child's RIGHT is -v. The ground is z = 0; the basin's rim is 58 cm up
# (in this child's own centimetres) and its bowl is 31 cm in front of the child (guides: bake_guides.py).
def _wudu(R=None, L=None, lean=1, tilt=14, **kw):
    q = dict(POSES['rise']); q['lean'] = lean; q['tilt'] = tilt
    q['arms'] = dict(L=L or armsDown['L'], R=R or armsDown['R']); q.update(kw); return q
WUDU = dict(
    stand=_wudu(),
    hands=_wudu(R=dict(wrist=(22, -3.2, 64), elbow=(-.5, -1, -.9)), L=dict(wrist=(22, 3.2, 64), elbow=(-.5, 1, -.9)), lean=6),
    mouth=_wudu(R=dict(wrist=(10.6, -2.6, 92.5), elbow=(.1, -.5, -1)), tilt=12),
    noseR=_wudu(R=dict(wrist=(10.6, -2.0, 97.5), elbow=(.1, -.5, -1)), tilt=12),
    noseL=_wudu(L=dict(wrist=(10.6, 2.0, 97.5), elbow=(.1, .5, -1)), tilt=12),
    face=_wudu(R=dict(wrist=(10.4, -6.6, 95.5), elbow=(.4, -.4, -1)), L=dict(wrist=(10.4, 6.6, 95.5), elbow=(.4, .4, -1)), tilt=12),
    armR=_wudu(R=dict(wrist=(24, -8, 63), elbow=(-.3, -.6, -1)), L=dict(wrist=(15, -4, 71), elbow=(-.5, 1, -.6)), lean=6),
    armL=_wudu(L=dict(wrist=(24, 8, 63), elbow=(-.3, .6, -1)), R=dict(wrist=(15, 4, 71), elbow=(-.5, -1, -.6)), lean=6),
    head=_wudu(R=dict(wrist=(-1.5, -5.5, 111.5), elbow=(-.1, -1, -.3)), L=dict(wrist=(-1.5, 5.5, 111.5), elbow=(-.1, 1, -.3)), tilt=10),
    ears=_wudu(R=dict(wrist=(0.5, -15.2, 97), elbow=(-.5, -1, -.2)), L=dict(wrist=(0.5, 15.2, 97), elbow=(-.5, 1, -.2)), tilt=10),
)
def foot(side, seat=24.0):
    """Sitting on a low bench, bent far forward, one foot lifted over the foot basin and the other hand on its toes."""
    s = -1 if side == 'R' else 1; o = -s; other = 'L' if side == 'R' else 'R'          # s: the side of the lifted foot (+v = left)
    hz = seat + 5.5
    legs = {side: dict(knee=(20, s * 6.4, hz + 2), ankle=(30, s * 7.0, 12)), other: dict(knee=(20, o * 6.4, hz), ankle=(21, o * 6.8, 4))}
    feet = {side: dict(f=(1, 0, -.25), n=(-.15, 0, -1)), other: dict(f=(1, .12 * o, 0), n=(0, 0, -1))}
    arms = {other: dict(wrist=(35, s * 3.2, 15), elbow=(-.3, o * .8, -1)),
            side: dict(wrist=(lambda J, side=side, s=s: lerp(J['hip' + side], J['knee' + side], .62) + V((0, 0, 7))), elbow=(-.5, s * 1, -.2))}
    return dict(hip=(-6, 0, hz), lean=62, tilt=6, legs=legs, feet=feet, arms=arms)
def stooped(q, deg):
    """An everyday position bent a little forward from the hip (the head follows part of the way)."""
    if not deg: return q
    q = dict(q); q['lean'] = q['lean'] + deg; q['tilt'] = q.get('tilt', 0) - deg * .5
    return q
def frame_defs(Lk, rides=False):
    """[(name, position, heading)] for one person. Front frames face 90, 'B' frames face 180, prayer frames -90. With
    rides=True (the child's sets) the four bicycle frames follow: ride0 ride1 (front) and rideB0 rideB1 (back)."""
    robe = Lk['kind'] != 'kurta'; st = Lk.get('stoop', 0); seat = 44 / (Lk['h'] / 1.12)
    E = lambda q: stooped(q, st)
    d = [('idle', E(POSES['rise']), 90)] + [('walk%d' % i, E(walk(i / 8.0, robe)), 90) for i in range(8)]
    d += [('sit', E(sit_chair(seat)), 90), ('sitlow', POSES['sit'], 90), ('reach', E(reach()), 90), ('carry', E(carry()), 90),
          ('salam', E(salam()), 90), ('wave', E(wave()), 90), ('idleB', E(POSES['rise']), 180)]
    d += [('walkB%d' % i, E(walk(i / 8.0, robe)), 180) for i in range(8)]
    d += [('sitB', E(sit_chair(seat)), 180), ('reachB', E(reach()), 180), ('carryB', E(carry()), 180),
          ('pstand', POSES['stand'], -90), ('pruku', POSES['ruku'], -90), ('psujud', POSES['sujud'], -90), ('psit', POSES['sit'], -90),
          # the rest of the full fard prayer: the opening takbir (hands raised), and the salam to the right then the left (sitting, the head
          # turned). The positions are GUIDE_POSES', from pray/salah-kid.js (TEACHER REVIEW), unchanged.
          ('ptakbir', GUIDE_POSES['takbir'], -90), ('psalamR', GUIDE_POSES['salamR'], -90), ('psalamL', GUIDE_POSES['salamL'], -90)]
    assert [n for n, _, _ in d] == FRAMES
    if rides: d += [('ride0', ride(Lk['h'], 0), 90), ('ride1', ride(Lk['h'], 1), 90), ('rideB0', ride(Lk['h'], 0), 180), ('rideB1', ride(Lk['h'], 1), 180)]
    return d

def figure(look, q, heading=90.0, at=(0, 0, 0), prop=None):
    """Build one person. look: a key of LOOKS; q: a position; heading in degrees (0 = facing +X); at: where the spot
    between the feet is. prop: 'book' | 'can' | 'plate' in the hands."""
    Lk = LOOKS[look] if isinstance(look, str) else look
    J = solve(q); before = set(bpy.data.objects)
    skin = mat(Lk['skin'], 0.75); top = mat(Lk['top'], 0.92, sheen=0.3)
    done = set(before)
    def mark(layer):
        """Tag everything made since the last mark with its layer: skin / top / legs / hair / hat / scarf / prop."""
        for o in list(bpy.data.objects):
            if o not in done: o['layer'] = layer; done.add(o)
    A, F, S = J['a'], J['f'], V((0, 1, 0))
    kind = Lk['kind']; hip = J['hip']
    short = bool(Lk.get('pants'))            # a dress with its hem at the knees over loose trousers (the girl washing her feet)
    kc = lerp(J['kneeL'], J['kneeR'], .5); ac = lerp(J['ankleL'], J['ankleR'], .5)
    thD = n3(kc - hip); shD = n3(ac - kc)
    spreadK = abs((J['kneeL'] - J['kneeR']).dot(S)) / 2; spreadA = abs((J['ankleL'] - J['ankleR']).dot(S)) / 2
    def fa(p, q2, ax):
        fw = n3(ax).cross(S); return abs((V(p) - V(q2)).dot(fw)) / 2
    # the torso and the cloth below it: one body, skinned through rings
    rings = []
    low = 7.6 if kind == 'kurta' else 9.4
    if kind == 'kurta' or short:
        rings.append((hip + thD * (B['thigh'] * .92), -thD, S, max(B['hipW'], spreadK) + B['wThigh'] * .5 + 2.6, B['wThigh'] * .5 + 3.0 + fa(J['kneeL'], J['kneeR'], thD) * .7))
    else:
        flare = 4.6 if kind == 'dress' else 2.2
        down = abs(shD.z) < 0.6                       # kneeling or sitting on the floor
        if down:
            rings.append((ac - shD * 3.0, -shD, S, spreadA + 4.6, 4.4))
            rings.append((lerp(kc, ac, .5), -shD, S, max(spreadA, spreadK) + 6.0, 5.6))
            rings.append((kc + V((0, 0, 1.5)), -n3(thD + shD), S, max(B['hipW'], spreadK) + 6.6, 6.4))
        else:
            rings.append((ac + V((0, 0, -1.2)), -shD, S, spreadA + 8.4 + flare, 8.6 + flare + fa(J['ankleL'], J['ankleR'], shD)))
            rings.append((kc, -n3(thD + shD), S, max(B['hipW'], spreadK) + 7.0 + flare * .6, 7.2 + flare * .5 + fa(J['kneeL'], J['kneeR'], thD) * .8))
    bis = n3(A - thD)
    rings.append((hip - bis * 1.2 - F * .6, bis, S, B['hipW'] + B['wThigh'] * .5 + 2.6, B['wThigh'] * .5 + 3.9))
    for (t, rs, rf, off) in TORSO[1:]:
        rings.append((hip + A * (B['torso'] * t) + F * off, A, S, rs + .5, rf + .5))
    loft(rings, top, 32, 'cloth', cap0=(kind == 'kurta' or short or abs(shD.z) < 0.6), hold=0.9); mark('top')
    # legs and feet
    legs = mat(Lk.get('legs', Lk.get('pants', Lk['top'])), 0.9)
    for sd in 'LR':
        kn, an = J['knee' + sd], J['ankle' + sd]
        if kind == 'kurta' or short:
            tube(lerp(J['hip' + sd], kn, .3), kn, B['wThigh'] / 2 - .2, legs, B['wThigh'] / 2 - .6, caps=False); ball(*kn, B['wThigh'] / 2 - .6, legs)
            tube(kn, lerp(kn, an, .92), B['wShin'] / 2 + .3, legs, B['wShin'] / 2 - .1, caps=False); ball(*lerp(kn, an, .92), B['wShin'] / 2 - .1, legs)
            mark('legs')
        ft = J['foot' + sd]; heel = an + ft['n'] * 1.7 - ft['f'] * 2.2
        tube(an, heel + ft['f'] * 1.5, 2.6, skin, 2.6); tube(heel, heel + ft['f'] * 9.6 + ft['n'] * .3, 2.7, skin, 2.3); mark('skin')
    # arms: sleeves and plain mitten hands
    for sd in 'LR':
        sh, el, wr = J['sh' + sd], J['elb' + sd], J['wr' + sd]
        ball(*(sh - A * .6), B['wUarm'] / 2 + 1.5, top)
        if Lk.get('bare'):
            # sleeves pushed up above the elbow (for washing the arms): a rolled cuff, then bare skin down to the hand
            tube(sh, lerp(sh, el, .5), B['wUarm'] / 2 + 1.2, top, B['wUarm'] / 2 + 1.0)
            tube(lerp(sh, el, .46), lerp(sh, el, .58), B['wUarm'] / 2 + 1.7, top, B['wUarm'] / 2 + 1.7); mark('top')
            tube(lerp(sh, el, .54), el, B['wUarm'] / 2 + .5, skin, B['wUarm'] / 2 + .2)
            tube(el, lerp(el, wr, .9), B['wFarm'] / 2 + .6, skin, B['wFarm'] / 2 + .5)
        else:
            tube(sh, el, B['wUarm'] / 2 + 1.2, top, B['wUarm'] / 2 + .7); tube(el, lerp(el, wr, .9), B['wFarm'] / 2 + .9, top, B['wFarm'] / 2 + .7); mark('top')
        hd = n3(wr - el); ball(*(wr + hd * 2.6), 3.5, skin)
        if q['arms'][sd].get('point'):
            # the index finger raised (the tashahhud): a thin finger from the hand toward the qibla
            hc = wr + hd * 2.6 + V((0, 0, 1.2)); tube(hc, hc + n3((1, 0, .3)) * 6.4, 1.0, skin, .85)
        mark('skin')
    # the head: plain. Hair or a scarf sits a little back, so a plain round face is left at the front.
    r = B['head'] * Lk.get('head', 1.0); head = J['neck'] + J['hd'] * (B['neck'] + r * .92); HD, HF = J['hd'], J['hf']
    tube(J['neck'] - A * 2, J['neck'] + HD * (B['neck'] + 1.2), 2.7, skin, caps=False)
    ball(*head, r, skin); mark('skin')
    if 'scarf' in Lk:
        sc = mat(Lk['scarf'], 0.95, sheen=0.4)
        ball(*(head - HF * (r * .36) + HD * (r * .05)), r * 1.12, sc)
        loft([(J['neck'] - A * (B['torso'] * .30) + F * .6, A, S, B['shW'] + 4.6, TORSO[3][2] + 3.4),
              (J['neck'] - A * (B['torso'] * .12) + F * .3, A, S, B['shW'] + 2.4, TORSO[3][2] + 2.2),
              (J['neck'] + HD * 1.0 - HF * 1.0, HD, S, r * .98, r * .98),
              (head - HF * (r * .3), HD, S, r * 1.02, r * 1.02)], sc, 28, 'cape', cap0=True, cap1=False)
        mark('scarf')
    else:
        hm = mat(Lk['hair'], 0.9)
        ball(*(head - HF * (r * .22) + HD * (r * .0)), r * 1.03, hm)
        if Lk.get('bob'):
            # a plain bob: covers the top, back and sides of the head and ends at the neck; the face stays bare
            ball(*(head - HF * (r * .30) + HD * (r * .06)), r * 1.07, hm)
            loft([(head - HF * (r * .38) + HD * (r * .30), HD, S, r * 1.09, r * .86),
                  (head - HF * (r * .44) - HD * (r * .30), HD, S, r * 1.08, r * .86),
                  (head - HF * (r * .50) - HD * (r * .80), HD, S, r * 1.06, r * .80),
                  (head - HF * (r * .56) - HD * (r * 1.25), HD, S, r * .98, r * .68),
                  (head - HF * (r * .58) - HD * (r * 1.42), HD, S, r * .82, r * .55)], hm, 28, 'bob', cap0=False, cap1=True)
        mark('hair')
        if 'hat' in Lk:
            hat = mat(Lk['hat'], 0.9); c = head - HF * (r * .08)
            loft([(c + HD * (r * .44), HD, S, r * 1.09, r * 1.09), (c + HD * (r * .72), HD, S, r * 1.09, r * 1.09),
                  (c + HD * (r * .94), HD, S, r * 1.0, r * 1.0), (c + HD * (r * 1.06), HD, S, r * .8, r * .8),
                  (c + HD * (r * 1.12), HD, S, r * .45, r * .45), (c + HD * (r * 1.14), HD, S, r * .12, r * .12)], hat, 32, 'kufi')
            mark('hat')
    # something in the hands
    if prop:
        hc = lerp(J['wrL'], J['wrR'], .5) + F * 4 + V((0, 0, 2))
        if prop == 'book':
            from kit import box
            b = box(0, 0, 0, 13, 17, 2.4, mat('#3B4A8F', 0.7), 0.5); b.location = hc + V((2, 0, 1))
        elif prop == 'plate':
            kit.cyl(hc.x + 2, hc.y, hc.z, 9, 1.4, mat('#FBF3E4', 0.4), 0.4, 28)
            for i in range(5): ball(hc.x + 2 + math.cos(i * 1.3) * 3.6, hc.y + math.sin(i * 1.3) * 3.6, hc.z + 2.2, 1.7, mat('#5A2F1C', 0.5), 1.5, 1, .9)
        elif prop == 'can':
            w = J['wrR'] + V((6, 0, -2)); kit.cyl(w.x, w.y, w.z - 8, 6, 12, mat('#2E9C97', 0.5), 0.6, 24); tube(w + V((5, 0, -3)), w + V((15, 0, 3)), 1.3, mat('#2E9C97', 0.5))
    mark('prop')
    made = [o for o in bpy.data.objects if o not in before]
    e = bpy.data.objects.new('person', None); bpy.context.collection.objects.link(e)
    for o in made: o.parent = e
    k = Lk['h'] / 1.12 * 0.01
    e.scale = (k, k, k); e.rotation_euler = (0, 0, heading * D2R); e.location = at
    return e, J
