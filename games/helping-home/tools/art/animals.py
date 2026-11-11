"""Helping Home art: the animals (runs inside Blender; see kit.py and people.py).

Ten animals built from the same soft rounded shapes as the people. FACELESS, always: heads are plain shapes with no
eyes, nose, mouth, whiskers or any mark. An animal reads by its silhouette (ears, horns, hump, trunk, long neck, tail,
comb, shell) and by colour patches that run over the whole body.

Every animal is built in its own frame: x forward, y to its left, z up, metres, the origin on the ground under the middle
of its body. build(id, frame, heading) builds it in the world, turned `heading` degrees (90 = the front frames, 180 = the
back frames, as the people). Patch colours (cow, giraffe, shell ...) are laid on in world space, so a pattern does not
swim when the body bobs.
"""
import math
from mathutils import Vector, Matrix
import bpy
import kit
from kit import ball, tube, loft, mat
import people as P

V = Vector
D2R = math.pi / 180
def lerp(a, b, t): return a + (b - a) * t
ANIMALS = {}

# ---------- materials ----------
_pm = {}
def M(c, r=0.92, sheen=0.3): return mat(c, r, sheen=sheen)
def pmat(name, kind, c1, c2, scale, thr, heading, seed=0, rough=0.92, sheen=0.3, detail=0.0, dist=0.0):
    """A colour patch material laid on in world space (turned back by the heading so it sits on the animal).
    kind 'noise': c1 where the noise is below thr, c2 above. kind 'cells': c2 on the lines between cells, c1 inside."""
    key = (name, heading)
    if key in _pm: return _pm[key]
    m = bpy.data.materials.new('%s%d' % (name, heading)); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    if 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = sheen
    for k in ('Specular IOR Level', 'Specular'):
        if k in b.inputs: b.inputs[k].default_value = 0.2; break
    geo = nt.nodes.new('ShaderNodeNewGeometry'); mp = nt.nodes.new('ShaderNodeMapping'); mp.vector_type = 'POINT'
    mp.inputs['Rotation'].default_value = (0, 0, -heading * D2R)
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    mp.inputs['Location'].default_value = (seed * 7.31, seed * 3.17, seed * 5.53)
    nt.links.new(geo.outputs['Position'], mp.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
    if kind == 'noise':
        t = nt.nodes.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = 1.0; t.inputs['Detail'].default_value = detail
        t.inputs['Roughness'].default_value = 0.5
        if 'Distortion' in t.inputs: t.inputs['Distortion'].default_value = dist
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector']); nt.links.new(t.outputs['Fac'], ramp.inputs['Fac'])
        ramp.color_ramp.elements[0].color = kit.hexc(c1); ramp.color_ramp.elements[1].position = thr; ramp.color_ramp.elements[1].color = kit.hexc(c2)
    else:
        t = nt.nodes.new('ShaderNodeTexVoronoi'); t.feature = 'DISTANCE_TO_EDGE'; t.inputs['Scale'].default_value = 1.0
        nt.links.new(mp.outputs['Vector'], t.inputs['Vector']); nt.links.new(t.outputs['Distance'], ramp.inputs['Fac'])
        ramp.color_ramp.elements[0].color = kit.hexc(c2); ramp.color_ramp.elements[1].position = thr; ramp.color_ramp.elements[1].color = kit.hexc(c1)
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    _pm[key] = m; return m

# ---------- shapes ----------
def blob(c, rad, m, d=None):
    """An ellipsoid at c with radii rad = (along d, sideways, up); d = the long axis (default forward, +x)."""
    c = V(c); o = ball(c.x, c.y, c.z, 1.0, m, rad[0], rad[1], rad[2])
    if d is not None:
        X = V(d).normalized(); Y = V((0, 1, 0)); Y = (Y - X * Y.dot(X))
        if Y.length < 1e-4: Y = V((1, 0, 0)) - X * X.x
        Y.normalize(); Z = X.cross(Y)
        o.rotation_euler = Matrix((X, Y, Z)).transposed().to_euler()
    return o
def cone(p0, p1, r0, r1, m):
    """A tapered round shape from p0 to p1 (a horn, an ear, a tusk, a leg); the ends are rounded."""
    return tube(p0, p1, r0, m, r1)

def bez(p0, t0, p3, t3, n):
    p0, p3, t0, t3 = V(p0), V(p3), V(t0), V(t3); p1 = p0 + t0; p2 = p3 - t3; out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        p = p0 * u ** 3 + p1 * 3 * u * u * t + p2 * 3 * u * t * t + p3 * t ** 3
        d = (p1 - p0) * 3 * u * u + (p2 - p1) * 6 * u * t + (p3 - p2) * 3 * t * t
        out.append((p, d.normalized() if d.length > 1e-9 else V((1, 0, 0))))
    return out
def sweep(p0, t0, p3, t3, rad, m, n=8, name='sweep', tip=True, steps=20):
    """A smooth tapering tube along a curve from p0 (leaving along t0) to p3 (arriving along t3). rad(t) -> (rs, rf)
    (width, depth) or one number."""
    rings = []
    for i, (p, d) in enumerate(bez(p0, t0, p3, t3, n)):
        r = rad(i / n); r = (r, r) if not isinstance(r, tuple) else r
        rings.append((p, d, V((0, 1, 0)), r[0], r[1]))
    o = loft(rings, m, steps, name)
    if tip:
        r = rad(1.0); r = max(r) if isinstance(r, tuple) else r
        ball(*rings[-1][0], r * 0.98, m)
    return o

class Rig:
    """The body frame: height of the body's middle zb, nose-up pitch. T maps a body point (x, y, z) to the world."""
    def __init__(s, zb, pitch=0.0): s.zb = zb; s.p = pitch; s.c = math.cos(pitch); s.s = math.sin(pitch)
    def T(s, x, y=0.0, z=0.0): return V((x * s.c - z * s.s, y, s.zb + x * s.s + z * s.c))
    def D(s, x, y=0.0, z=0.0): return V((x * s.c - z * s.s, y, x * s.s + z * s.c))

def body(rig, prof, m, steps=28, name='body'):
    """prof: [(x, half-width, half-height, dz)] from the tail end to the chest."""
    ax = rig.D(1, 0, 0)
    loft([(rig.T(x, 0, dz), ax, V((0, 1, 0)), rs, rf) for (x, rs, rf, dz) in prof], m, steps, name)

def head(rig, c, pitch, hl, prof, m):
    """A head: c = its middle in body coordinates, pitch = nose-down degrees, hl = length, prof = [(t, rs, rf, off)].
    Returns (base, hd, up, hf) with hf(t, y, u) a point on the head."""
    p = pitch * D2R
    hd = rig.D(math.cos(p), 0, -math.sin(p)).normalized(); up = rig.D(math.sin(p), 0, math.cos(p)).normalized()
    C = rig.T(*c); base = C - hd * (hl / 2)
    loft([(base + hd * (t * hl) + up * off, hd, V((0, 1, 0)), rs, rf) for (t, rs, rf, off) in prof], m, 24, 'head')
    hf = lambda t, y=0.0, u=0.0: base + hd * (t * hl) + V((0, y, 0)) + up * u
    return base, hd, up, hf

def neck_to(rig, nb, H, base, hd, nr, m, n=8):
    """The neck: from body point nb to the head's base. H = pose entry with e0 (rise angle of the neck leaving the body, deg),
    l0 (its stiffness), e3 / l3 (angle and stiffness where it meets the head; None = along the head)."""
    p0 = rig.T(*nb); t0 = rig.D(math.cos(H['e0'] * D2R), 0, math.sin(H['e0'] * D2R)) * H['l0']
    p3 = base
    if H.get('e3') is None: t3 = hd * H['l3']
    else: t3 = rig.D(math.cos(H['e3'] * D2R), 0, math.sin(H['e3'] * D2R)) * H['l3']
    (a0, a1), (b0, b1) = nr
    sweep(p0, t0, p3 + hd * 0.0, t3, lambda t: (lerp(a0, b0, t), lerp(a1, b1, t)), m, n, 'neck', tip=False)

def leg(root, foot, l1, l2, rr, m, hint, fm=None, fr=0.04, fk='hoof', knee=None):
    """A two-bone leg from root to foot (ankle target), with a foot at the end that touches z = 0 when planted. With knee
    given, the leg is drawn through that point instead (a folded leg). One ball per joint: two balls on the same spot
    z-fight and leave speckles."""
    if knee is None: k, a = P.ik(root, foot, l1, l2, hint)
    else: k, a = V(knee), V(foot)
    tube(root, k, rr[0], m, rr[1], caps=False); tube(k, a, rr[1], m, rr[2], caps=False)
    ball(*root, rr[0] * 1.04, m); ball(*k, rr[1] * 1.04, m); ball(*a, rr[2] * 1.04, m)
    if fm:
        if fk == 'paw': blob(a + V((fr * 0.35, 0, -fr * 0.3)), (fr * 1.3, fr * 0.95, fr * 0.7), fm)
        elif fk == 'flat': blob(a + V((fr * 0.2, 0, -fr * 0.55)), (fr * 1.1, fr * 1.0, fr * 0.45), fm)
        else: blob(a + V((fr * 0.3, 0, -fr * 0.25)), (fr * 1.25, fr * 0.95, fr * 0.75), fm)

def legs4(rig, Sp, q):
    xf, xb, wy, rd, fr = Sp['xf'], Sp['xb'], Sp['wy'], Sp['rd'], Sp['fr']
    for k in ('FL', 'FR', 'BL', 'BR'):
        fx = 1 if k[0] == 'F' else -1; sy = 1 if k[1] == 'L' else -1
        root = rig.T((xf if fx > 0 else -xb), sy * wy, -rd)
        l1, l2 = Sp['lf'] if fx > 0 else Sp['lb']; knee = None
        fd = q.get('fold', ())
        if fd is True or k in fd:
            # a folded leg lies on the ground: the knee out and ahead, the foot tucked back under
            r1, r2 = Sp['lr'][1], Sp['lr'][2]; fk_ = Sp.get('foldk', 1.0)
            if fx > 0: knee = V((root.x + .5 * l1, sy * (wy + .03), r1)); tgt = V((root.x - .1 * l1, sy * (wy + .35 * l1 * fk_), r2 * .9))
            else: knee = V((root.x + .5 * l1, sy * (wy + .3 * l1 * fk_), r1)); tgt = V((root.x - .25 * l1, sy * (wy + .55 * l1 * fk_), r2 * .9))
            hint = (0, 0, 1)
        elif k in q.get('feet', {}): tgt = V(q['feet'][k]); hint = (0, sy * 0.5, 1)
        else:
            dx, dz = q.get('step', {}).get(k, (0, 0)); tgt = V((root.x + dx, sy * wy, fr + dz)); hint = (fx * 1.0, 0, 0)
        leg(root, tgt, l1, l2, Sp['lr'], Sp['legm'], hint, Sp.get('footm'), fr, Sp.get('fk', 'hoof'), knee)

def gait4(Sp, q, a, S, lift):
    """Diagonal pairs swing together: front left with back right, then the other pair. a = 2 pi p round the cycle."""
    st = {}
    for k, ph in (('FL', a), ('BR', a), ('FR', a + math.pi), ('BL', a + math.pi)):
        st[k] = (S * math.sin(ph), lift * max(0.0, math.cos(ph)))
    q['step'] = st; q['bob'] = q.get('bob', 0) + Sp.get('bob', 0.012) * math.cos(2 * a + 0.0)
    return q

# ---------- poses ----------
def frame_names(has_sleep=False):
    n = ['idle'] + ['walk%d' % i for i in range(4)] + ['idleB'] + ['walkB%d' % i for i in range(4)] + ['eat', 'sit']
    return n + (['sleep'] if has_sleep else [])
def split(name):
    """frame name -> (base pose, index, heading)"""
    if name.endswith('B') and name != 'sleep': return 'idle', 0, 180
    if name.startswith('walkB'): return 'walk', int(name[5:]), 180
    if name.startswith('walk'): return 'walk', int(name[4:]), 90
    return name, 0, 90

def H(x, z, p, e0=0, l0=0.1, e3=None, l3=0.1): return dict(x=x, z=z, p=p, e0=e0, l0=l0, e3=e3, l3=l3)

# ---------- the four-legged build ----------
def quad(Sp, name, heading):
    base, i, _ = split(name); q = Sp['pose'](Sp, base, i)
    rig = Rig(Sp['zb'] + q.get('dz', 0) + q.get('bob', 0), q.get('pitch', Sp.get('pitch', 0)))
    ms = Sp['mats'](heading)
    Sp['_m'] = ms
    body(rig, Sp['prof'], ms['body'])
    legs4(rig, dict(Sp, legm=ms['leg'], footm=ms.get('foot')), q)
    h = q['head']; p = h['p']
    hb, hd, up, hf = head(rig, (h['x'], 0, h['z']), p, Sp['hl'], Sp['hprof'], ms['head'])
    if Sp.get('nr'): neck_to(rig, Sp['nb'], h, hb, hd, Sp['nr'], ms.get('neck', ms['body']))
    if Sp.get('headx'): Sp['headx'](hf, hd, up, rig, q, ms)
    if Sp.get('tail'): Sp['tail'](rig, q, ms, Sp)
    if Sp.get('extra'): Sp['extra'](rig, q, ms, Sp)
    return rig

def autolen(zb, rd, fr, k=1.035):
    l = (zb - rd - fr) * k / 2; return (l, l)

def walk_head(h, a, amp, dx=0.0):
    h = dict(h); h['z'] += amp * math.cos(2 * a + 0.8); h['x'] += dx * math.sin(a); return h

def std_pose(Sp, base, i):
    """idle / walk shared by the plain quadrupeds; Sp['poses'] holds the others (eat, sit, sleep) as functions."""
    q = {}
    if base == 'idle': q['head'] = Sp['H']['idle']
    elif base == 'walk':
        a = 2 * math.pi * i / 4; gait4(Sp, q, a, Sp['S'], Sp['lift']); q['head'] = walk_head(Sp['H']['idle'], a, Sp.get('hbob', 0.008), Sp.get('hsw', 0.0))
        q['sway'] = math.sin(a)
    else: q = Sp['poses'][base](Sp)
    return q

# ===== CAT =====
def cat_mats(hd):
    gin = pmat('cat', 'noise', '#E9A25A', '#F8EBD3', 6.5, 0.54, hd, seed=1, detail=0.0, dist=0.0)
    return dict(body=gin, head=M('#E9A25A'), leg=M('#F8EBD3'), foot=M('#FBF1DD'), cream=M('#F8EBD3'), gin=M('#E9A25A'), ear=M('#E9A25A'))
def cat_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1):
        cone(hf(.30, s * .042, .058), hf(.20, s * .056, .118), .034, .006, ms['ear'])
def cat_tail(rig, q, ms, Sp):
    sw = q.get('sway', 0) * .03; t = q.get('tail', 'up')
    if t == 'up':
        sweep(rig.T(-.19, 0, .02), rig.D(-.1, 0, .05), rig.T(-.235 + sw, 0, .245), rig.D(.02, 0, .1), lambda t: lerp(.03, .02, t), ms['gin'], 9, 'tail')
        ball(*rig.T(-.235 + sw, 0, .24), .026, ms['cream'])
    elif t == 'lie':
        sweep(rig.T(-.18, 0, -.03), rig.D(-.1, -.02, 0), rig.T(-.06, -.115, -.065), rig.D(.1, .02, 0), lambda t: lerp(.024, .016, t), ms['gin'], 8, 'tail')
        ball(*rig.T(-.06, -.115, -.065), .018, ms['cream'])
def cat_poses_eat(Sp): return dict(pitch=-.2, head=H(.25, -.075, 50, e0=-5, l0=.07, e3=-45, l3=.06))
def cat_poses_sit(Sp):
    f = Sp['fr']
    return dict(dz=-.103, tail='lie', head=H(.205, .105, 12, e0=40, l0=.05, l3=.05), fold=('BL', 'BR'),
                feet=dict(FL=(.21, .05, f), FR=(.21, -.05, f)))
def cat_curltail(s, ms):
    sweep(V((-.15 * s, -.03 * s, .06 * s)), V((-.02 * s, -.1 * s, 0)), V((.13 * s, -.115 * s, .04 * s)), V((.1 * s, .0, 0)), lambda t: lerp(.025, .016, t) * s, ms['gin'], 8, 'tail')
    ball(.13 * s, -.115 * s, .04 * s, .018 * s, ms['cream'])
CAT = dict(h=0.30, fw=160, fh=160, cz=0.14, zb=0.20, xf=.13, xb=.13, wy=.058, rd=.035, fr=.028, lf=autolen(.20, .035, .028), lb=autolen(.20, .035, .028),
           lr=(.034, .027, .022), fk='paw', S=.045, lift=.032, bob=.008, hbob=.006,
           prof=[(-.20, .018, .018, .01), (-.17, .058, .065, .005), (-.10, .082, .09, 0), (0, .09, .098, 0), (.10, .092, .1, .005), (.17, .082, .09, .01), (.21, .045, .05, .015), (.225, .012, .012, .015)],
           hl=.14, hprof=[(0, .062, .066, 0), (.3, .078, .078, 0), (.65, .072, .068, 0), (.9, .05, .045, -.005), (1, .012, .012, -.005)],
           nb=(.15, .04), nr=((.062, .06), (.058, .055)), mats=cat_mats, headx=cat_headx, tail=cat_tail,
           H=dict(idle=H(.255, .125, 4, e0=25, l0=.06, l3=.05)), poses=dict(eat=cat_poses_eat, sit=cat_poses_sit),
           pose=std_pose, sleep=True, build=quad, sleepfn=lambda Sp, hd: curled(Sp, hd, 1.0), curltail=cat_curltail)
ANIMALS['cat'] = CAT

def curled(Sp, heading, s=1.0):
    """A cat or dog asleep: a low round body, head laid on the front paws, tail wrapped round the side."""
    ms = Sp['mats'](heading); rig = Rig(.075 * s)
    blob(V((0, 0, .075 * s)), (.17 * s, .125 * s, .085 * s), ms['body'])
    blob(V((-.07 * s, -.02 * s, .082 * s)), (.11 * s, .11 * s, .082 * s), ms['body'])
    hb, hd, up, hf = head(Rig(0), (.16 * s, .045 * s, .075 * s), 28, Sp['hl'], Sp['hprof'], ms['head'])
    if Sp.get('headx'): Sp['headx'](hf, hd, up, Rig(0), {}, ms)
    for yy in (-.035, .075): blob(V((.215 * s, yy * s, .03 * s)), (.05 * s, .032 * s, .03 * s), ms['foot'])
    Sp['curltail'](s, ms)


# ===== DOG =====
def dog_mats(hd):
    blk = M('#2B2B31')
    return dict(body=pmat('dog', 'noise', '#2B2B31', '#F6F3EC', 5.0, 0.60, hd, seed=2), head=blk, leg=M('#F6F3EC'), foot=M('#FBF8F1'),
                blk=blk, wht=M('#F6F3EC'), ear=blk, neck=blk)
def dog_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1):
        blob(hf(.34, s * .09, .0), (.075, .022, .045), ms['ear'], d=V((.12, s * .3, -1.0)))
def dog_tail(rig, q, ms, Sp):
    sw = q.get('sway', 0) * .05; t = q.get('tail', 'down')
    if t == 'down':
        sweep(rig.T(-.32, 0, .05), rig.D(-.12, 0, .0), rig.T(-.5, sw, -.14), rig.D(-.03, 0, -.12), lambda t: lerp(.04, .022, t), ms['blk'], 9, 'tail', tip=False)
        sweep(rig.T(-.5, sw, -.14), rig.D(-.02, 0, -.06), rig.T(-.52, sw, -.25), rig.D(0, 0, -.08), lambda t: lerp(.03, .022, t), ms['wht'], 4, 'tailtip')
    else:
        sweep(rig.T(-.32, 0, .0), rig.D(-.12, 0, .0), rig.T(-.46, -.16, -.05), rig.D(.0, -.1, 0), lambda t: lerp(.04, .026, t), ms['blk'], 8, 'tail', tip=False)
        sweep(rig.T(-.46, -.16, -.05), rig.D(.02, -.05, 0), rig.T(-.42, -.25, -.07), rig.D(.05, -.03, 0), lambda t: lerp(.03, .022, t), ms['wht'], 4, 'tailtip')
def dog_extra(rig, q, ms, Sp):
    blob(rig.T(.3, 0, -.1), (.1, .1, .1), ms['wht'])        # white chest
def dog_eat(Sp): return dict(pitch=-.14, head=H(.48, -.27, 66, e0=-25, l0=.16, e3=-50, l3=.12))
def dog_sit(Sp):
    f = Sp['fr']
    return dict(dz=-.28, tail='lie', head=H(.33, .26, 10, e0=62, l0=.16, e3=40, l3=.12), fold=('BL', 'BR'),
                feet=dict(FL=(.42, .08, f), FR=(.42, -.08, f)))
def dog_curltail(s, ms):
    sweep(V((-.2 * s, -.02 * s, .07 * s)), V((-.04 * s, -.14 * s, 0)), V((.17 * s, -.17 * s, .045 * s)), V((.12 * s, .0, 0)), lambda t: lerp(.04, .03, t) * 0.85 * s, ms['blk'], 8, 'tail', tip=False)
    sweep(V((.17 * s, -.17 * s, .045 * s)), V((.03 * s, 0, 0)), V((.25 * s, -.14 * s, .04 * s)), V((.03 * s, .03 * s, 0)), lambda t: lerp(.03, .02, t) * 0.85 * s, ms['wht'], 4, 'tailtip')
DOG = dict(h=0.55, fw=224, fh=224, cz=0.26, zb=0.42, xf=.22, xb=.22, wy=.088, rd=.055, fr=.04, lf=autolen(.42, .055, .04), lb=autolen(.42, .055, .04),
           lr=(.064, .05, .04), fk='paw', S=.10, lift=.06, bob=.012, hbob=.008,
           prof=[(-.30, .03, .03, .02), (-.26, .09, .1, .01), (-.15, .118, .125, 0), (0, .125, .135, 0), (.15, .128, .14, .005), (.26, .11, .12, .01), (.32, .06, .07, .02), (.345, .015, .015, .02)],
           hl=.24, hprof=[(0, .075, .085, 0), (.3, .088, .095, 0), (.6, .068, .072, -.01), (.9, .05, .05, -.015), (1, .016, .016, -.015)],
           nb=(.24, .07), nr=((.095, .105), (.078, .085)), mats=dog_mats, headx=dog_headx, tail=dog_tail, extra=dog_extra,
           H=dict(idle=H(.38, .21, 12, e0=40, l0=.12, l3=.1)), poses=dict(eat=dog_eat, sit=dog_sit), pose=std_pose, sleep=True, build=quad,
           sleepfn=lambda Sp, hd: curled(Sp, hd, 1.6), curltail=dog_curltail)
ANIMALS['dog'] = DOG

# ===== COW =====
def cow_mats(hd):
    pat = pmat('cow', 'noise', '#FBF7EF', '#8A5532', 2.1, 0.56, hd, seed=3)
    return dict(body=pat, head=M('#FBF7EF'), leg=M('#FBF7EF'), foot=M('#4B3B34'), horn=M('#F1E4C6'), brown=M('#8A5532'), wht=M('#FBF7EF'), pink=M('#F2B9B2'), ear=M('#8A5532'))
def cow_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1):
        cone(hf(.14, s * .10, .12), hf(.08, s * .17, .21), .032, .012, ms['horn'])
        blob(hf(.17, s * .18, .08), (.05, .095, .03), ms['ear'])
def cow_tail(rig, q, ms, Sp):
    sw = q.get('sway', 0) * .05
    sweep(rig.T(-.8, 0, .18), rig.D(-.1, 0, .0), rig.T(-.86, sw, -.52), rig.D(0, 0, -.2), lambda t: lerp(.035, .02, t), ms['wht'], 8, 'tail', tip=False)
    blob(rig.T(-.86, sw, -.58), (.045, .04, .09), ms['brown'])
def cow_extra(rig, q, ms, Sp):
    blob(rig.T(-.45, 0, -.34), (.14, .12, .1), ms['pink'])      # the udder, hinted
    for s in (1, -1): cone(rig.T(-.45 + .0, s * .05, -.4), rig.T(-.45, s * .05, -.5), .018, .012, ms['pink'])
def cow_eat(Sp): return dict(head=H(1.12, -.74, 72, e0=-10, l0=.3, e3=-75, l3=.25))
def cow_sit(Sp):
    f = Sp['fr']
    return dict(dz=-.58, head=H(1.0, .3, 40, e0=30, l0=.28, e3=-10, l3=.2), fold=True)
COW = dict(h=1.35, fw=352, fh=352, cz=0.66, zb=0.97, xf=.55, xb=.55, wy=.21, rd=.15, fr=.06, lf=autolen(.97, .15, .06, 1.015), lb=autolen(.97, .15, .06, 1.015),
           lr=(.125, .092, .075), S=.17, lift=.09, bob=.014, hbob=.012,
           prof=[(-.72, .06, .08, .12), (-.66, .2, .26, .08), (-.5, .3, .34, .02), (-.2, .33, .37, 0), (.2, .34, .38, 0), (.5, .31, .36, .02), (.68, .24, .3, .04), (.78, .12, .18, .05), (.82, .03, .05, .05)],
           hl=.56, hprof=[(0, .135, .17, 0), (.35, .16, .18, 0), (.7, .13, .135, -.01), (.9, .12, .112, -.02), (.98, .08, .073, -.02), (1, .022, .022, -.02)],
           nb=(.66, .12), nr=((.2, .24), (.14, .16)), mats=cow_mats, headx=cow_headx, tail=cow_tail, extra=cow_extra,
           H=dict(idle=H(1.02, .28, 50, e0=-10, l0=.3, e3=-30, l3=.22)), poses=dict(eat=cow_eat, sit=cow_sit), pose=std_pose, build=quad)
ANIMALS['cow'] = COW

# ===== GOAT =====
def goat_mats(hd):
    pat = pmat('goat', 'noise', '#F3E8D2', '#9A6A44', 4.2, 0.57, hd, seed=4)
    return dict(body=pat, head=M('#F3E8D2'), leg=M('#F3E8D2'), foot=M('#5A4333'), horn=M('#CDB88D'), beard=M('#E9DAB8'), brown=M('#9A6A44'), ear=M('#9A6A44'))
def goat_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1):
        sweep(hf(.3, s * .035, .07), V((-.04, s * .005, .09)), hf(.0, s * .06, .22), V((-.08, s * .01, .04)), lambda t: lerp(.026, .01, t), ms['horn'], 6, 'horn')
        cone(hf(.3, s * .06, .03), hf(.27, s * .17, .0), .035, .012, ms['ear'])
    cone(hf(.83, 0, -.045), hf(.8, 0, -.21), .035, .008, ms['beard'])        # the beard, a shape
def goat_tail(rig, q, ms, Sp):
    cone(rig.T(-.38, 0, .1), rig.T(-.46, 0, .24), .035, .018, ms['brown'])
def goat_eat(Sp): return dict(pitch=-.1, head=H(.60, -.42, 66, e0=-5, l0=.2, e3=-60, l3=.15))
def goat_sit(Sp):
    f = Sp['fr']
    return dict(dz=-.40, head=H(.5, .26, 22, e0=48, l0=.2, e3=20, l3=.14), fold=True)
GOAT = dict(h=0.75, fw=288, fh=288, cz=0.36, zb=0.58, xf=.27, xb=.27, wy=.1, rd=.07, fr=.04, lf=autolen(.58, .07, .04), lb=autolen(.58, .07, .04),
            lr=(.06, .043, .034), S=.10, lift=.055, bob=.012, hbob=.01,
            prof=[(-.38, .04, .05, .02), (-.33, .1, .12, .01), (-.2, .14, .16, 0), (0, .15, .17, 0), (.2, .15, .17, 0), (.32, .12, .14, .01), (.38, .06, .08, .02), (.4, .02, .03, .02)],
            hl=.27, hprof=[(0, .075, .086, 0), (.3, .086, .098, 0), (.65, .063, .069, 0), (.92, .046, .046, -.005), (1, .016, .016, -.005)],
            nb=(.3, .1), nr=((.1, .12), (.074, .086)), mats=goat_mats, headx=goat_headx, tail=goat_tail,
            H=dict(idle=H(.52, .32, 18, e0=55, l0=.2, e3=20, l3=.14)), poses=dict(eat=goat_eat, sit=goat_sit), pose=std_pose, build=quad)
ANIMALS['goat'] = GOAT


# ===== CAMEL =====
def camel_mats(hd):
    sand = M('#D9B17B')
    return dict(body=sand, head=sand, leg=sand, foot=M('#B8946A'), dark=M('#A9835C'), tuft=M('#B88F5E'))
def camel_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1): cone(hf(.12, s * .075, .09), hf(.08, s * .1, .15), .036, .03, ms['dark'])
    blob(hf(.97, 0, -.03), (.07, .09, .06), ms['body'])          # the soft lip, a plain shape
def camel_tail(rig, q, ms, Sp):
    sw = q.get('sway', 0) * .06
    sweep(rig.T(-.85, 0, .22), rig.D(-.1, 0, -.02), rig.T(-.92, sw, -.45), rig.D(0, 0, -.2), lambda t: lerp(.04, .022, t), ms['body'], 8, 'tail', tip=False)
    blob(rig.T(-.92, sw, -.52), (.05, .05, .1), ms['tuft'])
def camel_extra(rig, q, ms, Sp):
    k = q.get('hump', 1.0)
    blob(rig.T(-.06, 0, .4), (.31, .23, .38), ms['body']); blob(rig.T(-.02, 0, .3), (.45, .27, .24), ms['body'])
def camel_eat(Sp): return dict(head=H(1.72, -.85, 62, e0=25, l0=.75, e3=-65, l3=.6))
def camel_sit(Sp):
    f = Sp['fr']
    return dict(dz=-.9, head=H(1.25, .7, 28, e0=30, l0=.5, e3=55, l3=.4), fold=True, foldk=.7)
CAMEL = dict(h=2.0, fw=448, fh=480, cz=1.0, zb=1.28, xf=.6, xb=.6, wy=.18, rd=.2, fr=.07, lf=autolen(1.28, .2, .07, 1.012), lb=autolen(1.28, .2, .07, 1.012),
             lr=(.15, .108, .085), fk='flat', S=.26, lift=.13, bob=.02, hbob=.015,
             prof=[(-.85, .05, .07, .06), (-.78, .18, .22, .04), (-.6, .26, .3, 0), (-.2, .28, .34, 0), (.3, .27, .33, 0), (.6, .24, .3, .01), (.78, .15, .2, .03), (.86, .05, .07, .04)],
             hl=.5, hprof=[(0, .11, .125, 0), (.35, .125, .135, 0), (.7, .105, .105, -.01), (.92, .09, .085, -.02), (1, .035, .035, -.02)],
             nb=(.7, .08), nr=((.24, .27), (.125, .135)), mats=camel_mats, headx=camel_headx, tail=camel_tail, extra=camel_extra,
             H=dict(idle=H(1.42, .84, 32, e0=14, l0=.62, e3=70, l3=.6)), poses=dict(eat=camel_eat, sit=camel_sit), pose=std_pose, build=quad)
ANIMALS['camel'] = CAMEL

# ===== GIRAFFE =====
def giraffe_mats(hd):
    pat = pmat('giraffe', 'cells', '#B56F34', '#F4DB9C', 3.2, 0.15, hd, seed=5)
    return dict(body=pat, head=M('#E7B867'), leg=pat, foot=M('#5A4333'), neck=pat, horn=M('#C79A5E'), tip=M('#5F4128'), tuft=M('#5F4128'), ear=M('#E7B867'))
def giraffe_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1):
        cone(hf(.26, s * .035, .07), hf(.2, s * .04, .2), .022, .016, ms['horn']); ball(*hf(.2, s * .04, .215), .03, ms['tip'])
        cone(hf(.3, s * .065, .045), hf(.27, s * .17, .09), .032, .012, ms['ear'])
def giraffe_tail(rig, q, ms, Sp):
    sw = q.get('sway', 0) * .06
    sweep(rig.T(-.66, 0, .1), rig.D(-.1, 0, -.02), rig.T(-.74, sw, -.65), rig.D(0, 0, -.2), lambda t: lerp(.03, .016, t), ms['body'], 8, 'tail', tip=False)
    blob(rig.T(-.74, sw, -.72), (.04, .04, .09), ms['tuft'])
def giraffe_eat(Sp):
    f = Sp['fr']
    return dict(head=H(1.75, -1.3, 66, e0=45, l0=.9, e3=-70, l3=.7), feet=dict(FL=(.92, .3, f), FR=(.92, -.3, f)))
def giraffe_sit(Sp):
    f = Sp['fr']
    return dict(dz=-1.25, head=H(.95, 1.34, 22, e0=70, l0=.9, e3=50, l3=.5), fold=True, foldk=.5)
GIRAFFE = dict(h=3.2, fw=448, fh=592, cz=1.62, zb=1.62, pitch=0.12, xf=.5, xb=.5, wy=.17, rd=.15, fr=.08, lf=(.745, .745), lb=(.685, .685),
               lr=(.13, .092, .072), S=.27, lift=.14, bob=.016, hbob=.012,
               prof=[(-.62, .04, .06, .02), (-.55, .17, .23, .01), (-.35, .27, .34, 0), (0, .3, .38, 0), (.35, .3, .39, 0), (.55, .23, .33, .02), (.66, .11, .17, .03), (.7, .03, .05, .03)],
               hl=.42, hprof=[(0, .08, .09, 0), (.35, .09, .1, 0), (.7, .072, .077, -.005), (.93, .06, .06, -.01), (1, .024, .024, -.01)],
               nb=(.55, .2), nr=((.24, .27), (.1, .115)), mats=giraffe_mats, headx=giraffe_headx, tail=giraffe_tail,
               H=dict(idle=H(1.14, 1.36, 22, e0=62, l0=.95, e3=75, l3=.55)), poses=dict(eat=giraffe_eat, sit=giraffe_sit), pose=std_pose, build=quad)
ANIMALS['giraffe'] = GIRAFFE


# ===== ELEPHANT =====
def ele_mats(hd):
    g = M('#9AA7B6'); return dict(body=g, head=g, leg=g, foot=M('#7F8C9B'), ear=M('#8F9DAD'), ear2=M('#C9A9B0'), tusk=M('#F6EEDB'), tail=g)
def ele_headx(hf, hd, up, rig, q, ms):
    for s in (1, -1):
        blob(hf(.3, s * .4, .12), (.31, .04, .36), ms['ear'], d=V((.93, s * .36, 0)))
        cone(hf(.86, s * .17, -.14), hf(1.14, s * .25, -.3), .065, .014, ms['tusk'])
    tr = q.get('trunk', dict(tip=(2.02, .2), t0=(.18, -.12), t3=(.06, -.2)))
    p0 = hf(.9, 0, -.12); tip = rig.T(tr['tip'][0], 0, tr['tip'][1])
    sweep(p0, rig.D(tr['t0'][0], 0, tr['t0'][1]) * 1.0, tip, rig.D(tr['t3'][0], 0, tr['t3'][1]) * 1.0, lambda t: (lerp(.2, .075, t ** 0.7),) * 2, ms['body'], 12, 'trunk')
def ele_tail(rig, q, ms, Sp):
    sweep(rig.T(-.92, 0, .2), rig.D(-.1, 0, -.02), rig.T(-.98, 0, -.45), rig.D(0, 0, -.2), lambda t: lerp(.04, .02, t), ms['body'], 7, 'tail')
    blob(rig.T(-.98, 0, -.5), (.03, .03, .06), ms['foot'])
def ele_pose(Sp, base, i):
    q = std_pose(Sp, base, i)
    if base == 'walk':
        a = 2 * math.pi * i / 4; q['trunk'] = dict(tip=(2.0 + .12 * math.sin(a), .22 + .05 * math.cos(2 * a)), t0=(.18, -.12), t3=(.06, -.2))
    if base == 'idle': q['trunk'] = dict(tip=(2.0, .22), t0=(.18, -.12), t3=(.05, -.2))
    return q
def ele_eat(Sp): return dict(head=H(1.2, .34, 16), trunk=dict(tip=(2.2, -1.17), t0=(.14, -.22), t3=(.2, -.05)))
def ele_sit(Sp):
    f = Sp['fr']
    return dict(dz=-.64, head=H(1.2, .22, 8), trunk=dict(tip=(2.1, -.55), t0=(.16, -.16), t3=(.2, -.03)), fold=True, foldk=.6)
ELE = dict(h=2.2, fw=512, fh=480, cz=1.05, zb=1.3, xf=.62, xb=.62, wy=.3, rd=.3, fr=.09, lf=autolen(1.3, .3, .09, 1.02), lb=autolen(1.3, .3, .09, 1.02),
           lr=(.23, .2, .17), fk='flat', S=.19, lift=.1, bob=.02, hbob=.015,
           prof=[(-.9, .15, .2, 0), (-.82, .33, .42, 0), (-.55, .46, .54, 0), (-.1, .5, .58, 0), (.4, .5, .58, 0), (.75, .42, .52, .02), (.9, .25, .33, .03), (.96, .05, .08, .03)],
           hl=.66, hprof=[(0, .31, .38, 0), (.3, .43, .48, .03), (.65, .38, .45, 0), (.9, .25, .3, -.06), (1, .09, .09, -.07)],
           nb=(.75, .1), mats=ele_mats, headx=ele_headx, tail=ele_tail,
           H=dict(idle=H(1.2, .5, 8)), poses=dict(eat=ele_eat, sit=ele_sit), pose=ele_pose, build=quad)
ANIMALS['elephant'] = ELE

# ===== HEN =====
BEAK = True       # a tiny beak is a head SHAPE (like a trunk); set False to leave the head a plain ball
def hen_build(Sp, name, heading):
    base, i, _ = split(name); a = 2 * math.pi * i / 4
    W, ORG, YEL, WING, RED = M('#F7ECD3'), M('#E9A83A'), M('#E9A83A'), M('#EAD9B4'), M('#D83B34')
    wm = M('#F7ECD3')
    pitch = .08; zb = .235; head = (.2, .2); neckt = V((.04, 0, .1)); feet = {}; tail_up = 1.0; legs = True; bob = 0.0
    step = {'L': (0, 0), 'R': (0, 0)}
    if base == 'walk':
        step = {'L': (.05 * math.sin(a), .04 * max(0, math.cos(a))), 'R': (.05 * math.sin(a + math.pi), .04 * max(0, math.cos(a + math.pi)))}
        bob = .012 * math.cos(2 * a); head = (.2 + .03 * math.cos(2 * a - .6), .2 + .004 * math.cos(2 * a))
    elif base == 'eat': pitch = -.22; head = (.285, -.15); neckt = V((.07, 0, -.02))
    elif base == 'sit': zb = .125; legs = False; head = (.17, .21); pitch = .06
    rig = Rig(zb + bob, pitch)
    body(rig, [(-.17, .03, .05, .07), (-.13, .08, .11, .03), (-.05, .115, .13, 0), (.05, .12, .135, 0), (.12, .1, .12, .01), (.17, .06, .08, .03), (.19, .02, .03, .04)], wm)
    for s in (1, -1):
        blob(rig.T(-.03, s * .112, .02), (.1, .03, .075), M('#EAD9B4'), d=rig.D(1, s * .12, -.1))        # wings
    TM = M('#B9492D')
    for ang, ln in ((-18, .12), (0, .14), (18, .12)):                                                 # tail feathers
        d = rig.D(-math.sin(.5 + ang * D2R * .02) * .5, math.sin(ang * D2R) * 1.0, 1.0)
        blob(rig.T(-.17, math.sin(ang * D2R) * .09, .1 + ln * .5), (ln, .02, .045), TM, d=d)
    hc = rig.T(head[0], 0, head[1]); hr = .055
    ball(*hc, hr, W, 1.0, .92, .95)
    for k, (dx, dz, r) in enumerate(((-.022, .056, .024), (0, .064, .03), (.024, .056, .022))): blob(hc + V((dx, 0, dz)), (r, r * .6, r * 1.15), M('#D83B34'))   # the comb
    if BEAK: cone(hc + V((hr * .8, 0, -.005)), hc + V((hr * 1.6, 0, -.02)), .02, .005, M('#EBA83C'))
    # neck: from the breast up to the head
    p0 = rig.T(.1, 0, .06); sweep(p0, neckt, hc + V((-.02, 0, -.03)), V((.03, 0, .04)) if base != 'eat' else V((.0, 0, -.05)), lambda t: (lerp(.065, .042, t), lerp(.07, .045, t)), W, 7, 'neck', tip=False)
    if legs:
        for s, k in ((1, 'L'), (-1, 'R')):
            root = rig.T(0.0, s * .05, -.09); dx, dz = step[k]; tgt = V((root.x + dx, s * .05, .014 + dz))
            kn, an = P.ik(root, tgt, .074, .074, (-1, 0, 0))
            tube(root, kn, .02, YEL, .015); tube(kn, an, .015, YEL, .012)
            for ang in (-28, 0, 28):
                cone(an, an + V((math.cos(ang * D2R) * .055, math.sin(ang * D2R) * .055, -.004)), .011, .007, YEL)
    else:
        for s in (1, -1): cone(rig.T(.08, s * .06, -.09), rig.T(.15, s * .05, -.1), .014, .01, YEL)

ANIMALS['hen'] = dict(h=0.35, fw=160, fh=160, cz=0.19, build=hen_build, sleep=False)

# ===== RABBIT =====
def rabbit_build(Sp, name, heading):
    base, i, _ = split(name); a = 2 * math.pi * i / 4
    pat = pmat('rabbit', 'noise', '#FBF8F2', '#CDBBA2', 12, 0.57, heading, seed=7); skin = M('#CDBBA2'); wht = M('#FBF8F2')
    zb, pitch, dz = .115, .2, 0.0; fF = (.17, .02); fH = (-.02, .02); head = (.2, .1); ears = 'up'; tilt = 0.0
    if base == 'walk':     # a hop: gather, launch, peak, land
        h = [dict(dz=-.01, pitch=.15, fF=(.15, .02), fH=(-.03, .02), head=(.19, .09)),
             dict(dz=.07, pitch=.5, fF=(.27, .09), fH=(-.22, .05), head=(.21, .13)),
             dict(dz=.1, pitch=.12, fF=(.2, .07), fH=(-.04, .06), head=(.2, .1)),
             dict(dz=.025, pitch=-.12, fF=(.24, .02), fH=(-.12, .04), head=(.21, .08))][i]
        dz, pitch, fF, fH, head = h['dz'], h['pitch'], h['fF'], h['fH'], h['head']
    elif base == 'eat': pitch = -.12; head = (.22, -.01); ears = 'back'; fF = (.14, .02)
    elif base == 'sit': dz = -.035; pitch = .1; fF = (.1, .02); fH = (.0, .02); head = (.17, .08); ears = 'back'
    rig = Rig(zb + dz, pitch)
    body(rig, [(-.15, .04, .05, 0), (-.12, .09, .11, 0), (-.04, .105, .125, 0), (.05, .1, .12, 0), (.12, .075, .09, .01), (.16, .03, .04, .01)], pat)
    for s in (1, -1):
        blob(rig.T(-.07, s * .085, -.03), (.095, .05, .09), pat)                                         # haunch
        hf_ = V((rig.T(-.0, 0, 0).x + fH[0], s * .08, fH[1])); blob(hf_ + V((.02, 0, .0)), (.105, .032, .022), wht)   # hind foot
        root = rig.T(.1, s * .045, -.06); tgt = V((root.x + fF[0] - .1 + .0, s * .045, fF[1]))
        kn, an = P.ik(root, tgt, .055, .055, (1, 0, 0)); tube(root, kn, .03, pat, .025); tube(kn, an, .025, pat, .022)
        blob(an + V((.02, 0, -.006)), (.04, .028, .02), wht)
    hc = rig.T(head[0], 0, head[1])
    blob(hc, (.082, .07, .072), M('#E8DDCB'))
    p0 = rig.T(.1, 0, .03); sweep(p0, V((.04, 0, .04)), hc + V((-.03, 0, -.02)), V((.03, 0, .02)), lambda t: (lerp(.075, .06, t), lerp(.085, .065, t)), M('#E8DDCB'), 5, 'neck', tip=False)
    for s in (1, -1):
        if ears == 'up': blob(hc + V((-.012, s * .035, .1)), (.11, .02, .04), M('#E8DDCB'), d=V((-.12, s * .16, 1.0)))
        else: blob(hc + V((-.07, s * .035, .045)), (.11, .02, .04), M('#E8DDCB'), d=V((-1.0, s * .1, .12)))
    ball(*rig.T(-.165, 0, .02), .04, wht)                                                                # the round tail

ANIMALS['rabbit'] = dict(h=0.25, fw=160, fh=160, cz=0.12, build=rabbit_build, sleep=False)

# ===== TORTOISE =====
def tort_build(Sp, name, heading):
    base, i, _ = split(name); a = 2 * math.pi * i / 4
    shell = pmat('shell', 'cells', '#C4AB62', '#77613A', 7.0, 0.075, heading, seed=8, rough=0.8, sheen=0.1)
    rim = M('#7A6538', 0.85); sk = M('#9EA86A'); sk2 = M('#8C9558')
    out = base != 'sit'; z0 = .0
    # the shell: a dome with a flat rim, longer than wide
    o = kit.lathe(0, 0, 0, [(0, .075), (.17, .078), (.2, .1), (.195, .15), (.16, .22), (.1, .275), (0, .3)], shell, 40, 'shell'); o.scale = (1.2, 1.0, 1.0)
    kit.lathe(0, 0, 0, [(0, .065), (.18, .066), (.215, .082), (.215, .098), (.2, .105), (0, .105)], rim, 40, 'rim').scale = (1.2, 1.0, 1.0)
    bob = .006 * math.cos(2 * a) if base == 'walk' else 0
    if out:
        legs = {'FL': (.15, .13), 'FR': (.15, -.13), 'BL': (-.17, .13), 'BR': (-.17, -.13)}
        for k, (lx, ly) in legs.items():
            ph = a if k in ('FL', 'BR') else a + math.pi
            dx, dz = ((.035 * math.sin(ph), .02 * max(0, math.cos(ph))) if base == 'walk' else (0, 0))
            tube(V((lx * .85, ly * .8, .1)), V((lx + dx, ly + (.03 if ly > 0 else -.03), .04 + dz)), .05, sk, .048)
            blob(V((lx + dx + .018, ly + (.03 if ly > 0 else -.03), .026 + dz)), (.07, .055, .028), sk2)
        hx, hz = (.33, .12)
        if base == 'walk': hx += .02 * math.sin(a); hz += .01 * math.cos(2 * a)
        if base == 'eat': hx, hz = .34, .055
        sweep(V((.2, 0, .13)), V((.05, 0, .0)), V((hx, 0, hz)), V((.04, 0, 0)), lambda t: (.04, .045), sk, 5, 'neck', tip=False)
        ball(hx + .03, 0, hz, .068, sk, 1.15, .98, .98)
        cone(V((-.22, 0, .1)), V((-.29, 0, .075)), .03, .01, sk)                                         # the tail
    else:
        for s in (1, -1):
            blob(V((.19, s * .1, .075)), (.06, .05, .03), sk2); blob(V((-.19, s * .1, .075)), (.05, .045, .028), sk2)
        blob(V((.235, 0, .085)), (.05, .06, .035), sk)                                                  # the head drawn in, just a rounded edge
ANIMALS['tortoise'] = dict(h=0.30, fw=192, fh=192, cz=0.14, build=tort_build, sleep=False)

# ---------- the registry and the entry point ----------
def build(aid, name, heading):
    """Build one frame of one animal at the origin, turned `heading` degrees. Returns the root empty."""
    Sp = ANIMALS[aid]; before = set(bpy.data.objects)
    if name == 'sleep': Sp['sleepfn'](Sp, heading)
    else: Sp['build'](Sp, name, heading)
    made = [o for o in bpy.data.objects if o not in before]
    e = bpy.data.objects.new('animal', None); bpy.context.collection.objects.link(e)
    for o in made: o.parent = e
    e.rotation_euler = (0, 0, heading * D2R)
    return e
def frames(aid): return frame_names(ANIMALS[aid].get('sleep', False))
ORDER = ['cat', 'hen', 'dog', 'cow', 'goat', 'rabbit', 'tortoise', 'camel', 'elephant', 'giraffe']
