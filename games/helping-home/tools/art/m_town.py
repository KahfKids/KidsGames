"""Helping Home art: the ONE connected town (runs inside Blender; see kit.py, models.py and m_out.py for the style).

The outdoor places (plaza, street, green, lane, park, zoo, meadow, yard) are windows onto one world map. Every background is
the ground only: it is painted here in WORLD coordinates (the zone's own `at` is added to the pixel position, so a paver, a
road, a kerb or a blade of grass is in the same place whichever zone's picture it is in) and then the zone adds its own
details. Nothing in a background is taller than 0.3 m: the buildings are sprites (`bhome`, `bmasjid`, `bgrand`, `bshop`,
`bschool`, standing on the two back edges of the world), trees, lamps, fences and the rest are ordinary things.

World (tiles): ground x 0..37.5, y 0..25.6.  Roads are 2.2 wide:
  main   centre y = 8.7  (x everywhere)         side   centre x = 6.2  (y 8.7 .. 24.3)
  front  centre y = 24.3 (x 6.2 .. 30.8)         avenue centre x = 30.8 (y 8.7 .. 24.3)
  rounded corners (centre-line radius R_C) at (6.2, 24.3) and (30.8, 24.3); T junctions on the main road.
The ground slab shows its stone side only on the world's outer front edges (x = 37.5 and y = 25.6)."""
import math, random
import numpy as np
import bpy, bmesh
from mathutils import Vector
import kit, models as M
import m_out as MO
from kit import box, cyl, ball, lathe, tube, mat, tex_mat, rgb
from m_out import (O, lm, shade, Cv, Wl, sd_rect, sd_rrect, sd_circle, sd_blob, sd_ring, sd_or, sd_sub, sd_star8, sd_seg, sd_ell,
                   pat_grass, pat_pavers, pat_flowers, pat_cobbles, vnoise, h2, prism, boxes, balls, arch_pts, arch_ring, window, flower_box,
                   door, roof_mat, roof_ridge_u, roof_front_gable, chimney, house, hedge, tree, crown, tile_band, dome, merlons, crescent,
                   glass_mat, rect_pts, picket, xz_prism, hcyl, torus)

C = M.C
KINDS, ICONS, PLACES = {}, {}, {}
def kind(name):
    def deco(fn): KINDS[name] = fn; return fn
    return deco

# ================================================================= the map
WORLD_W, WORLD_D = 37.5, 25.6
MAIN_Y, SIDE_X, FRONT_Y, AVE_X, HW, R_C = 8.7, 6.2, 24.3, 30.8, 1.1, 2.0
ZEBRA_MAIN = [(2.0, 3.6), (11.7, 13.3), (24.7, 26.2), (33.5, 35.1)]       # x ranges on the main road
ZEBRA_SIDE = (15.4, 17.0)                                                  # y range on the side road
ZEBRA_AVE = (10.0, 11.0)                                                   # y range on the avenue
BUS_MAIN = (9.0, 21.5)                                                     # bus stops on the north kerb of the main road (x)
BUS_SIDE = 17.4                                                            # bus stop on the west kerb of the side road (y)
KERB = '#BCA582'; KERB_R = '#C9BDA6'; ASPH = '#555A66'

class WCv(Cv):
    """The ground picture of one zone, painted in world metres: X, Y are the WORLD coordinates under each pixel."""
    def __init__(s, n, at, size):
        Cv.__init__(s, n, size[0], size[1])
        s.X = (s.X + at[0]).astype('float32'); s.Y = (s.Y + at[1]).astype('float32')
        s.x0, s.y0, s.x1, s.y1 = at[0], at[1], at[0] + size[0], at[1] + size[1]
    def hit(s, x0, y0, x1, y1, m=0.4): return not (x1 < s.x0 - m or x0 > s.x1 + m or y1 < s.y0 - m or y0 > s.y1 + m)

class Shift:
    """Paint with a zone's own (old) coordinates: inside the block, cv.X / cv.Y are the world position minus (dx, dy)."""
    def __init__(s, cv, dx, dy): s.cv, s.dx, s.dy = cv, dx, dy
    def __enter__(s): s.X, s.Y = s.cv.X, s.cv.Y; s.cv.X = s.X - s.dx; s.cv.Y = s.Y - s.dy; return s.cv
    def __exit__(s, *a): s.cv.X, s.cv.Y = s.X, s.Y

def paved(cv, sd, pat, edge=KERB, ew=0.1):
    if edge: cv.put(sd - ew, edge)
    cv.put(sd, pat)

def pat_wild(cv, cols, seed=5.0, cell=0.3, dens=0.35):
    """Wild flowers lying in the grass: little dots of colour, no soil."""
    out = np.zeros_like(cv.img) + 0.0; mask = np.zeros(cv.X.shape, bool)
    for layer, off in enumerate((0.0, 0.5)):
        xo = cv.X / cell + off; yo = cv.Y / cell + off * 0.7; ix = np.floor(xo); iy = np.floor(yo)
        fx = xo - ix - 0.5 - (h2(ix, iy, seed + layer) - 0.5) * 0.5; fy = yo - iy - 0.5 - (h2(ix, iy, seed + layer + 9) - 0.5) * 0.5
        has = h2(ix, iy, seed + layer + 3) < dens; dd = np.hypot(fx, fy)
        pick = np.floor(h2(ix, iy, seed + layer + 5) * len(cols)).astype(int)
        for i, c in enumerate(cols):
            m = (dd < 0.13) & has & (pick == i); out[m] = np.array(rgb(c), 'float32'); mask |= m
        m = (dd < 0.05) & has; out[m] = np.array(rgb('#F6D36B'), 'float32'); mask |= m
    return out, mask

# ================================================================= the roads
def road_sd(cv):
    """Signed distance (metres, negative inside) to the whole road network."""
    h = HW
    parts = [sd_rect(cv, -30, MAIN_Y - h, 70, MAIN_Y + h),
             sd_seg(cv, (SIDE_X, MAIN_Y), (SIDE_X, FRONT_Y - R_C), h),
             sd_seg(cv, (SIDE_X + R_C, FRONT_Y), (AVE_X - R_C, FRONT_Y), h),
             sd_seg(cv, (AVE_X, MAIN_Y), (AVE_X, FRONT_Y - R_C), h)]
    for (cx, cy, qx) in ((SIDE_X + R_C, FRONT_Y - R_C, -1), (AVE_X - R_C, FRONT_Y - R_C, 1)):
        d = np.hypot(cv.X - cx, cv.Y - cy) - R_C; ok = ((cv.X - cx) * qx >= 0) & ((cv.Y - cy) >= 0)
        parts.append(np.where(ok, np.abs(d) - h, 1e3).astype('float32'))
    return sd_or(*parts)

def _dash_sd(a, b, ah, bh, r=0.02):
    """Rounded dashes: a is the position along the line (already periodic), b the distance across it."""
    ax = np.abs(a) - (ah - r); ay = np.abs(b) - (bh - r)
    return np.hypot(np.maximum(ax, 0), np.maximum(ay, 0)) + np.minimum(np.maximum(ax, ay), 0) - r

def paint_roads(cv):
    road = road_sd(cv)
    if road.min() > 0.5: return
    cv.put(road - 0.12, KERB_R)
    asph = np.array(rgb(ASPH), 'float32') * (0.97 + 0.06 * vnoise(cv.X, cv.Y, 0.5, 3.0)[:, :, None])
    cv.put(road, asph)
    cv.put(sd_ring(road + 0.02, 0.05), '#6B7080')
    P, L, Wd = 1.15, 0.6, 0.05
    line = '#F1E9D2'
    # centre dashes: main (x), side / avenue (y), front (x), and round the two corners
    cv.put(_dash_sd(((cv.X + 0.2) % P) - L / 2, cv.Y - MAIN_Y, L / 2, Wd), line)
    cv.put(sd_sub(sd_sub(_dash_sd(((cv.Y - 10.3) % P) - L / 2, cv.X - SIDE_X, L / 2, Wd), sd_rect(cv, 0, 0, 40, 10.2)), sd_rect(cv, 0, FRONT_Y - R_C, 40, 40)), line)
    cv.put(sd_sub(sd_sub(_dash_sd(((cv.Y - 10.3) % P) - L / 2, cv.X - AVE_X, L / 2, Wd), sd_rect(cv, 0, 0, 40, 10.2)), sd_rect(cv, 0, FRONT_Y - R_C, 40, 40)), line)
    cv.put(sd_sub(_dash_sd(((cv.X - 8.2 - 0.0) % P) - L / 2, cv.Y - FRONT_Y, L / 2, Wd), sd_or(sd_rect(cv, 0, 0, 8.1, 40), sd_rect(cv, 28.9, 0, 40, 40))), line)
    for (cx, qx) in ((SIDE_X + R_C, -1), (AVE_X - R_C, 1)):
        cy = FRONT_Y - R_C; ang = np.arctan2(cv.Y - cy, cv.X - cx); s = R_C * ang * (-qx)
        ok = ((cv.X - cx) * qx >= 0) & ((cv.Y - cy) >= 0)
        dd = _dash_sd(((s - 0.1) % 1.05) - 0.3, np.hypot(cv.X - cx, cv.Y - cy) - R_C, 0.3, Wd)
        cv.put(np.where(ok, dd, 1e3).astype('float32'), line)
    # zebra crossings: bars along the road, spaced across it; the asphalt is repainted first so no dash runs through
    for (a, b) in ZEBRA_MAIN:
        if not cv.hit(a, MAIN_Y - HW, b, MAIN_Y + HW): continue
        r = sd_rect(cv, a, MAIN_Y - HW, b, MAIN_Y + HW); cv.put(r, asph)
        bars = np.maximum(sd_rect(cv, a + 0.04, MAIN_Y - HW + 0.1, b - 0.04, MAIN_Y + HW - 0.1), np.abs(((cv.Y - (MAIN_Y - HW + 0.12)) % 0.5) - 0.14) - 0.14)
        cv.put(bars, '#F4EEDC')
    a, b = ZEBRA_SIDE
    if cv.hit(SIDE_X - HW, a, SIDE_X + HW, b):
        cv.put(sd_rect(cv, SIDE_X - HW, a, SIDE_X + HW, b), asph)
        cv.put(np.maximum(sd_rect(cv, SIDE_X - HW + 0.1, a + 0.04, SIDE_X + HW - 0.1, b - 0.04), np.abs(((cv.X - (SIDE_X - HW + 0.12)) % 0.5) - 0.14) - 0.14), '#F4EEDC')
    a, b = ZEBRA_AVE
    if cv.hit(AVE_X - HW, a, AVE_X + HW, b):
        cv.put(sd_rect(cv, AVE_X - HW, a, AVE_X + HW, b), asph)
        cv.put(np.maximum(sd_rect(cv, AVE_X - HW + 0.1, a + 0.04, AVE_X + HW - 0.1, b - 0.04), np.abs(((cv.X - (AVE_X - HW + 0.12)) % 0.5) - 0.14) - 0.14), '#F4EEDC')
    # bus-stop bays on the outer lane: a softly tinted patch with a white edge at each end
    bay = '#5E6877'; wl = '#F1E9D2'
    for sx in BUS_MAIN:
        x0, x1 = sx - 2.1, sx + 2.1
        if not cv.hit(x0, 7.6, x1, 8.7): continue
        cv.put(sd_rect(cv, x0, MAIN_Y - HW + 0.07, x1, MAIN_Y - 0.1, 0.05), bay)
        for xx in (x0, x1 - 0.05): cv.put(sd_rect(cv, xx, MAIN_Y - HW + 0.07, xx + 0.05, MAIN_Y - 0.1), wl)
    y0, y1 = BUS_SIDE - 2.1, BUS_SIDE + 2.1
    if cv.hit(SIDE_X - HW, y0, SIDE_X, y1):
        cv.put(sd_rect(cv, SIDE_X - HW + 0.07, y0, SIDE_X - 0.1, y1, 0.05), bay)
        for yy in (y0, y1 - 0.05): cv.put(sd_rect(cv, SIDE_X - HW + 0.07, yy, SIDE_X - 0.1, yy + 0.05), wl)

# ================================================================= the whole town's ground (world coordinates)
def paint_world(cv):
    cv.img = pat_grass(cv, 3.0, 0.9)
    brick = pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 4.0)
    cv.WORLD = dict(brick=brick, brick2=pat_pavers(cv, 0.5, 0.25, O['paver'], O['paver2'], 0.02, 0.5, 8.0, swap=True))
    # the pavement in front of the buildings on the north side of the main road
    paved(cv, sd_rect(cv, -1, 0, 39, 7.6), brick, None)
    # the lane (the block's pavement west of the side road) and the corner round to the front road
    paved(cv, sd_or(sd_rect(cv, -1, 9.8, 5.1, 27), sd_rect(cv, -1, 22.0, 8.5, 27)), brick)
    # the pavement strip along the south side of the main road
    paved(cv, sd_or(sd_rect(cv, 5.0, 9.8, 17.7, 11.2), sd_rect(cv, 17.6, 9.8, 29.8, 11.1), sd_rect(cv, 31.8, 9.8, 39, 11.1)), brick)
    # flower strips under the building fronts, with the doors left clear
    cols = [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3']
    strips = [sd_rect(cv, 10.4, 0.04, 26.8, 0.44, 0.12), sd_rect(cv, 0.04, 10.2, 0.44, 25.0, 0.12)]
    if cv.hit(10, 0, 27, 1) or cv.hit(0, 10, 1, 25):
        st = sd_or(*strips)
        for (a, b) in ((17.6, 19.4),): st = sd_sub(st, sd_rect(cv, a, -1, b, 1.0))
        for (a, b) in ((12.95, 14.6), (20.6, 22.2)): st = sd_sub(st, sd_rect(cv, -1, a, 1.0, b))
        cv.put(st - 0.045, O['stoneD']); cv.put(st, pat_flowers(cv, cols, 5.0, 0.15))
    paint_roads(cv)

# ================================================================= the zones' own details
def lawn(cv, x0, y0, x1, y1, r=0.4, seed=9.0, edge=True, mow=None):
    sd = sd_rect(cv, x0, y0, x1, y1, r)
    if cv.hit(x0, y0, x1, y1):
        cv.put(sd - 0.1, KERB); cv.put(sd - 0.04, O['stone']); cv.put(sd, pat_grass(cv, seed, mow or 0.9) * 1.03)
    return sd

def bed(cv, x0, y0, x1, y1, r=0.3, seed=3.0, cols=None):
    cols = cols or [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3']
    sd = sd_rect(cv, x0, y0, x1, y1, r); cv.put(sd - 0.08, '#B6A98F'); cv.put(sd, pat_flowers(cv, cols, seed + x0, 0.16)); return sd

def pitc(cv, x, y, r=0.5):
    p = sd_circle(cv, x, y, r); cv.put(p, O['stoneD']); cv.put(p + 0.07, pat_grass(cv, 2.0, None))

def waiting(cv, x0, y0, x1, y1):
    w = sd_rect(cv, x0, y0, x1, y1, 0.15)
    cv.put(w, pat_pavers(cv, 0.4, 0.4, O['tealL'], '#B7DDD6', 0.025, 0, 5.0, gapc='#8FBDB6')); cv.put(sd_ring(w, 0.06), O['stoneD'])

def d_plaza(cv):
    brick = cv.WORLD['brick']
    # the plaza's own squares, edged in stone on the street side
    sq = pat_pavers(cv, 0.6, 0.6, O['paver'], O['paver2'], 0.022, 0.0, 11.0, var=0.7)
    reg = sd_rect(cv, -1, 0, 10.2, 7.6)
    cv.put(reg - 0.12, KERB); cv.put(reg, sq)
    # a band of teal and cream tiles along the building fronts (the masjid on the north, the grandparents' house on the west)
    fr = sd_or(sd_rect(cv, -1, -1, 10.0, 0.7), sd_rect(cv, -1, -1, 0.7, 7.5))
    cv.put(fr, pat_pavers(cv, 0.35, 0.35, '#CFE6DF', '#BFDDD5', 0.02, 0.0, 5.0, gapc='#9CC7BE')); cv.put(sd_ring(fr, 0.07), O['stoneD'])
    # the medallion with a khatam star round the fountain
    cx, cy = 5.0, 4.4; c = sd_circle(cv, cx, cy, 2.7)
    cv.put(c, '#F6EBCF'); cv.put(sd_ring(c, 0.16), O['teal']); cv.put(sd_ring(c + 0.22, 0.05), '#E3B34A'); cv.put(sd_ring(c + 0.5, 0.04), O['tealL'])
    st = sd_star8(cv, cx, cy, 2.0); cv.put(st, O['tealL']); cv.put(sd_ring(st, 0.06), O['teal'])
    st2 = sd_star8(cv, cx, cy, 1.45); cv.put(st2, '#F6EBCF'); cv.put(sd_ring(st2, 0.05), O['tile'])
    for i in range(8):
        a = i * math.pi / 4 + math.pi / 8; cv.put(sd_rrect(cv, cx + 2.32 * math.cos(a), cy + 2.32 * math.sin(a), 0.1, 0.16, a + math.pi / 2, 0.02), O['tile'])
    for i in range(8):
        a = i * math.pi / 4; cv.put(sd_circle(cv, cx + 1.7 * math.cos(a), cy + 1.7 * math.sin(a), 0.07), '#E3B34A')
    cv.put(sd_circle(cv, cx, cy, 1.2), '#EBDDB8')
    waiting(cv, 8.0, 6.4, 10.0, 7.6)

def d_street(cv):
    brick2 = cv.WORLD['brick2']
    # our front path (the door is centred at x = 18.475) and the family's parking bay at the kerb
    path = sd_rect(cv, 17.575, 0.3, 19.375, 6.7, 0.08); cv.put(path - 0.1, KERB); cv.put(path, brick2)
    lawn(cv, 11.5, 1.2, 15.4, 5.0, 0.4, 9.0); bed(cv, 12.4, 2.0, 14.5, 3.9, 0.3, 3.0)
    # a little bay for the bicycle beside our door (street local (6.0, 1.8))
    bk = sd_rect(cv, 15.75, 1.45, 17.25, 2.15, 0.06); cv.put(bk, pat_pavers(cv, 0.3, 0.3, '#B9B3A8', '#A9A39A', 0.02, 0, 7.0, gapc='#8F897F'))
    cv.put(sd_ring(bk, 0.04), '#F4EEDC')
    lawn(cv, 20.1, 1.2, 23.4, 4.6, 0.4, 13.0); c = sd_circle(cv, 21.75, 2.9, 0.75); cv.put(c + 0.08, '#B6A98F'); cv.put(c, pat_flowers(cv, [O['pink'], O['yellow'], O['cream'], '#C9B3E3'], 21.0, 0.15))
    bay = sd_rect(cv, 13.8, 6.65, 16.2, 7.62, 0.06); cv.put(bay, pat_pavers(cv, 0.4, 0.4, '#B9B3A8', '#A9A39A', 0.02, 0, 3.0, gapc='#8F897F'))
    cv.put(sd_rect(cv, 13.8, 6.65, 16.2, 6.7), '#F4EEDC'); cv.put(sd_rect(cv, 13.8, 6.65, 13.85, 7.6), '#F4EEDC'); cv.put(sd_rect(cv, 16.15, 6.65, 16.2, 7.6), '#F4EEDC')
    waiting(cv, 20.5, 6.2, 22.5, 7.6)
    pitc(cv, 17.0, 6.0, 0.5)

def d_green(cv):
    brick2 = cv.WORLD['brick2']
    # the garden gate stands at x 31 .. 32.2: a path from it to the road, two lawns, the passage under the house
    path = sd_rect(cv, 30.9, 0.0, 32.3, 6.7, 0.08); cv.put(path - 0.1, KERB); cv.put(path, brick2)
    lawn(cv, 24.9, 1.2, 30.3, 5.2, 0.4, 5.0); bed(cv, 26.2, 2.0, 29.0, 4.2, 0.3, 4.0)
    lawn(cv, 33.0, 1.2, 37.1, 5.8, 0.4, 7.0)
    c = sd_circle(cv, 35.0, 3.5, 0.8); cv.put(c + 0.08, '#B6A98F'); cv.put(c, pat_flowers(cv, [O['pink'], O['yellow'], O['cream'], O['tile']], 31.0, 0.15))
    # the passage beside the kitchen (x 27 .. 29.5) is a different paving
    ps = sd_rect(cv, 27.0, -1, 29.5, 1.0); cv.put(ps, cv.WORLD['brick2'])
    pitc(cv, 25.4, 5.4, 0.5); pitc(cv, 29.0, 6.1, 0.5)

def d_lane(cv):
    waiting(cv, 3.7, 17.0, 5.1, 18.5)
    pitc(cv, 2.6, 11.8, 0.5); pitc(cv, 2.6, 23.2, 0.5)

def d_meadow(cv):
    cols = [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3', '#9FB8E8']
    out, m = pat_wild(cv, cols, 5.0, 0.32, 0.30)
    area = np.maximum(sd_blob(cv, 34.6, 18.6, 3.6, 3.4, 0.14, 2.0), 0)
    reg = (sd_blob(cv, 34.6, 18.6, 3.6, 3.4, 0.14, 2.0) < 0) | (sd_blob(cv, 33.6, 13.0, 2.0, 1.4, 0.2, 4.0) < 0) | (sd_blob(cv, 35.5, 22.8, 1.5, 1.0, 0.2, 5.0) < 0)
    reg = reg & (road_sd(cv) > 0.2) & (cv.X > 31.95)
    cv.img = np.where((m & reg)[:, :, None], out, cv.img)
    # a footpath from the crossing, curling into the meadow to a sitting spot
    pts = [(34.3, 11.1), (34.3, 13.0), (33.6, 15.0), (34.6, 17.2), (35.6, 19.2)]
    for p0, p1 in zip(pts, pts[1:]):
        s = sd_seg(cv, p0, p1, 0.5); cv.put(s - 0.08, KERB); 
    for p0, p1 in zip(pts, pts[1:]):
        cv.put(sd_seg(cv, p0, p1, 0.5), cv.WORLD['brick2'])
    sp = sd_circle(cv, 35.9, 19.9, 1.0); cv.put(sp - 0.1, KERB); cv.put(sp, cv.WORLD['brick'])

def d_park(cv):
    with Shift(cv, 7.5, 11.2):          # the old park's own coordinates (old (0, 0) is park local (0.2, 1.4))
        stone = '#D6C9AE'
        lawn_ = sd_blob(cv, 4.6, 7.3, 2.1, 1.8, 0.1, 3.0); cv.put(lawn_, pat_grass(cv, 12.0, None) * 1.05)
        sand = sd_rect(cv, 0.2, 0.35, 3.5, 7.1, 0.35); cv.put(sand - 0.07, '#C9AC72'); cv.put(sand, pat_pavers(cv, 5.0, 5.0, O['sand'], O['sandD'], 0.0, 0, 9.0, var=0.0) * (0.96 + 0.08 * vnoise(cv.X, cv.Y, 0.18, 4.0)[:, :, None]))
        P = MO.POND
        pd = sd_blob(cv, P['cx'], P['cy'], P['rx'], P['ry'], P['wob'], P['seed'])
        cv.put(pd - 0.25, '#7AAE55'); cv.put(pd - 0.12, '#B8A57A')
        t = np.clip(-pd / 0.9, 0, 1)[:, :, None]; wa = np.array(rgb(O['water']), 'float32'); wb = np.array(rgb(O['waterD']), 'float32')
        rip = (0.5 + 0.5 * np.sin((cv.X * 2.1 + cv.Y * 1.1) * 5.5 + vnoise(cv.X, cv.Y, 0.6, 1.0) * 6))[:, :, None] * 0.05
        cv.put(pd, wa + (wb - wa) * t * 0.9 + rip); cv.put(sd_ring(pd, 0.06), '#A8DDEA')
        for (lx, ly, lr, k) in ((8.5, 3.6, 0.28, 0.5), (7.2, 3.4, 0.22, 2.0), (8.9, 2.0, 0.25, 1.2), (7.6, 1.8, 0.2, 3.5), (9.0, 3.1, 0.18, 4.4)):
            pad = sd_circle(cv, lx, ly, lr); wedge = sd_rrect(cv, lx + lr * 0.55 * math.cos(k), ly + lr * 0.55 * math.sin(k), lr * 0.55, 0.035, k, 0.0)
            cv.put(sd_sub(pad, wedge), '#6FB45A'); cv.put(sd_sub(sd_ring(pad, 0.03), wedge), '#4F9A4C')
        for (lx, ly) in ((8.5, 3.6), (8.9, 2.0)): cv.put(sd_circle(cv, lx + 0.03, ly - 0.03, 0.07), '#F4A9B8')
        def stones(pts, sp=0.66, seed=1):
            rnd = random.Random(seed)
            for p0, p1 in zip(pts, pts[1:]):
                L = math.hypot(p1[0] - p0[0], p1[1] - p0[1]); k = max(1, int(L / sp)); a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
                for i in range(k + 1):
                    x = p0[0] + (p1[0] - p0[0]) * i / k + rnd.uniform(-0.05, 0.05); y = p0[1] + (p1[1] - p0[1]) * i / k + rnd.uniform(-0.05, 0.05)
                    s = sd_rrect(cv, x, y, 0.27, 0.21, a + rnd.uniform(-0.3, 0.3), 0.09); cv.put(s - 0.04, '#B6A98F'); cv.put(s, stone if i % 2 else '#E0D4BA')
        stones([(5.0, -0.05), (5.0, 3.0), (5.0, 5.0)], 0.7, 1); stones([(5.0, 2.8), (6.0, 2.8)], 0.7, 2); stones([(5.0, 3.6), (3.8, 3.6)], 0.7, 3)
        stones([(5.0, 5.0), (4.6, 6.0)], 0.7, 4)
        # a paved path from the crossing over the side road to the middle of the park (through the sand)
        pw = sd_rect(cv, -1.0, 4.3, 4.5, 5.6, 0.1); cv.put(pw - 0.1, KERB); cv.put(pw, cv.WORLD['brick'])
        for (x0, y0, x1, y1) in ((3.2, 0.95, 4.05, 3.15), (1.2, 8.2, 2.9, 9.4)):
            bed(cv, x0, y0, x1, y1, 0.3, 3.0)

def d_yard(cv):
    """The back garden: grass (the town's), the paved side passage beside the kitchen (local x 0 .. 2.5), stepping stones and
    a few flower beds. Yard local = world - (27, -8)."""
    with Shift(cv, 27.0, -8.0):
        brick2 = cv.WORLD['brick2']
        ps = sd_rect(cv, 0.0, -1.0, 2.5, 8.2)
        cv.put(sd_sub(ps - 0.1, sd_rect(cv, -3, 7.95, 12, 9)), KERB); cv.put(ps, brick2)
        stone = '#D6C9AE'
        def stones(pts, sp=0.7, seed=1):
            rnd = random.Random(seed)
            for p0, p1 in zip(pts, pts[1:]):
                L = math.hypot(p1[0] - p0[0], p1[1] - p0[1]); k = max(1, int(L / sp)); a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
                for i in range(k + 1):
                    x = p0[0] + (p1[0] - p0[0]) * i / k + rnd.uniform(-0.05, 0.05); y = p0[1] + (p1[1] - p0[1]) * i / k + rnd.uniform(-0.05, 0.05)
                    s = sd_rrect(cv, x, y, 0.27, 0.21, a + rnd.uniform(-0.3, 0.3), 0.09); cv.put(s - 0.04, '#B6A98F'); cv.put(s, stone if i % 2 else '#E0D4BA')
        stones([(4.6, 7.8), (4.6, 5.8)], 0.7, 1); stones([(4.6, 5.8), (4.1, 3.5), (4.1, 2.3)], 0.7, 2); stones([(2.7, 7.25), (4.6, 7.25)], 0.7, 3)
        stones([(4.6, 5.8), (6.9, 5.1), (7.7, 5.1)], 0.7, 4)
        cols = [O['pink'], O['yellow'], O['cream'], O['tile'], '#C9B3E3']
        for (a, b, c, d) in ((6.5, 7.0, 8.4, 7.65), (9.0, 6.7, 10.2, 7.6), (8.4, 0.5, 10.2, 1.2), (2.9, 0.4, 3.9, 0.95)):
            bed(cv, a, b, c, d, 0.25, 3.0, cols)

def build_yard(sp):
    zone_ground(sp, 'yard', world_painter(sp, [d_yard]))

# ================================================================= the ground slab
def zone_ground(sp, name, painter, size=2048):
    """A flat painted sheet exactly w x d at z = 0 (no rim, no side between two zones), and a thin stone lip plus the slab's
    side only along the world's outer front edges (x = 37.5 and y = 25.6)."""
    w, d = sp['size']; ax, ay = sp['at']
    tex = tex_mat('g-' + name, lambda n: painter(n), size, 0.93)
    me = bpy.data.meshes.new('ground'); bm = bmesh.new()
    bm.faces.new([bm.verts.new(p) for p in ((0, 0, 0), (w, 0, 0), (w, d, 0), (0, d, 0))]); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('ground', me); bpy.context.collection.objects.link(o); o.data.materials.append(tex)
    stone = lm(O['stone'], 0.9)
    if ax + w >= WORLD_W - 1e-6: box(w - 0.06, 0, -0.3, 0.06, d, 0.304, stone, 0.0, 'lipFL')
    if ay + d >= WORLD_D - 1e-6: box(0, d - 0.06, -0.3, w, 0.06, 0.304, stone, 0.0, 'lipFR')
    return o

def world_painter(sp, details):
    ax, ay = sp['at']; w, d = sp['size']
    def paint(n):
        cv = WCv(n, (ax, ay), (w, d)); paint_world(cv)
        for f in details: f(cv)
        return cv.img
    return paint

# ================================================================= the open grass round the town
FIELD_P = 16 / 3        # the field repeats every this many metres both ways: 1024 x 512 pixels on screen
def paint_field(n):
    """One square of the open grass that lies round the town, made to repeat: the town's own grass (pat_grass, not
       mown), with every cell of its noise wrapped at the square's edge, so the game can lay it out without end."""
    cv = Cv(n, FIELD_P, FIELD_P); P = FIELD_P; seed = 3.0
    g, gd, gl = (np.array(rgb(O[k]), 'float32') for k in ('grass', 'grassD', 'grassL'))
    def pn(N, sd):
        x = cv.X / P * N; y = cv.Y / P * N; ix = np.floor(x); iy = np.floor(y); fx = x - ix; fy = y - iy
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); w = lambda a, b: h2(a % N, b % N, sd)
        return ((w(ix, iy) * (1 - fx) + w(ix + 1, iy) * fx) * (1 - fy) + (w(ix, iy + 1) * (1 - fx) + w(ix + 1, iy + 1) * fx) * fy).astype('float32')
    t = np.clip(0.5 + (pn(4, seed) - 0.5) * 1.2 + (pn(13, seed + 1) - 0.5) * 0.5, 0, 1)[:, :, None]
    base = np.where(t < 0.5, gd + (g - gd) * (t * 2), g + (gl - g) * ((t - 0.5) * 2))
    C = 72; x = cv.X / P * C; y = cv.Y / P * C; ix = np.floor(x); iy = np.floor(y); r = h2(ix % C, iy % C, seed + 7); fx = x - ix; fy = y - iy
    blade = ((r > 0.9) & (np.abs(fx - 0.5) < 0.2) & (fy > 0.2) & (fy < 0.85))[:, :, None]
    dark = ((r < 0.07) & (np.hypot(fx - 0.5, fy - 0.5) < 0.3))[:, :, None]
    base = np.where(blade, base * 1.08 + 0.03, base); base = np.where(dark, base * 0.92, base)
    return base.astype('float32')

def build_field(sp):
    """A flat sheet of the field, three repeats each way (tools/art/town.py cuts one repeat out of its middle)."""
    S = sp['size'][0]; rep = S / FIELD_P
    tex = tex_mat('g-field', paint_field, 1024, 0.93, repeat=(rep, rep))
    me = bpy.data.meshes.new('field'); bm = bmesh.new()
    bm.faces.new([bm.verts.new(p) for p in ((0, 0, 0), (S, 0, 0), (S, S, 0), (0, S, 0))]); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('field', me); bpy.context.collection.objects.link(o); o.data.materials.append(tex)
    return o
PLACES['field'] = build_field

def build_roadend(sp):
    """A stretch of the main road beyond the town's edge (world.roads.out): the world's ground on a flat sheet with no
       lip. tools/art/town.py keeps only the road of it and fades its far end into the field."""
    w, d = sp['size']
    tex = tex_mat('g-' + sp['name'], world_painter(sp, []), 1024, 0.93)
    me = bpy.data.meshes.new('ground'); bm = bmesh.new()
    bm.faces.new([bm.verts.new(p) for p in ((0, 0, 0), (w, 0, 0), (w, d, 0), (0, d, 0))]); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('ground', me); bpy.context.collection.objects.link(o); o.data.materials.append(tex)
    return o
PLACES['roadend'] = build_roadend

def build_zone(sp, details, name):
    zone_ground(sp, name, world_painter(sp, details))

def _reg(name, details):
    def b(sp): build_zone(sp, details, name)
    PLACES[name] = b
_reg('plaza', [d_plaza]); _reg('street', [d_street]); _reg('green', [d_green]); _reg('lane', [d_lane]); _reg('meadow', [d_meadow])

def build_park(sp):
    """The ground, plus what is low enough to stay in the picture: a rim of pebbles round the pond and the lotus flowers."""
    build_zone(sp, [d_park], 'park')
    dx, dy = 0.2, 1.4; rnd = random.Random(3); st = []
    for i in range(46):
        a = 2 * math.pi * i / 46; x, y = MO.pond_pt(a, 0.1 + rnd.uniform(-0.03, 0.05)); r = rnd.uniform(0.07, 0.12); st.append((x + dx, y + dy, 0.02, r, r * 0.9, r * 0.6))
    balls(st, lm('#C9BEA6', 0.9), 'pebbles', 1)
    for (lx, ly) in ((8.5, 3.6), (8.9, 2.0)):
        for k in range(6):
            a = k * math.pi / 3; ball(lx + dx + 0.05 * math.cos(a), ly + dy + 0.05 * math.sin(a), 0.04, 0.05, lm('#F6B8C6', 0.6), 1, 1, 0.5)
        ball(lx + dx, ly + dy, 0.05, 0.035, lm('#F6D36B', 0.6))
PLACES['park'] = build_park

# ================================================================= the buildings (one sprite each: see tools/data/town-out.json)
# Each is modelled in its own "wall frame" (wall L: the front is the plane y = 0 and u = x; wall R: the front is x = 0 and u = y;
# the building stands behind it at n < 0), then the whole group is moved so the middle of the footprint is the sprite's origin.
# Only the faces toward +x and +y and the roofs are ever seen.
def _made(fn):
    before = set(bpy.data.objects); fn()
    return [o for o in bpy.data.objects if o not in before and o.parent is None]

def moved(fn, dx=0.0, dy=0.0, dz=0.0):
    """Run a builder, then slide everything it made by (dx, dy, dz): puts a wall-frame detail onto a face elsewhere."""
    objs = _made(fn)
    if objs: g = kit.group(objs, 'mv'); g.location = (dx, dy, dz); return g

def _place(objs, dx, dy):
    g = kit.group(objs, 'bld'); g.location = (dx, dy, 0); return g

def _drop(prefixes):
    for o in list(bpy.data.objects):
        if o.name.split('.')[0] in prefixes: bpy.data.objects.remove(o, do_unlink=True)

def _quoins(wl, u0, u1, H, z0=0.36, trim=O['cream']):
    """Cream corner stones on the front face only (house() would run them the whole depth of the building)."""
    for uu in (u0 - 0.02, u1 - 0.13): wl.box(uu, -0.18, z0, 0.15, 0.21, H - z0, lm(trim, 0.8), 0.02, 'quoin')

@kind('bhome')
def k_bhome(st):
    """Our house: two storeys, 19.5 x 6 (x 10 .. 29.5, y -6 .. 0), front on y = 0 (door centred at x = 18.475). The last 2.5 m
    (x 27 .. 29.5) is an open side passage at ground level with the upper floor over it."""
    def body():
        L = Wl('L'); R = Wl('R'); y = O['yellow']; cream = O['cream']; D = 6.0; Hl = 2.8; Hu = 5.4
        house(L, 0.0, 17.0, D, Hl, y, base='#C19A62', band=0, quoin=False)
        L.box(0.0, -D, Hl, 19.5, D, Hu - Hl, lm(y, 0.92), 0.02, 'upper')
        L.box(-0.03, -D, Hl - 0.01, 19.56, D + 0.055, 0.1, lm(cream, 0.8), 0.02, 'band')
        L.box(-0.07, -D, Hu - 0.03, 19.64, D + 0.12, 0.14, lm(cream, 0.8), 0.025, 'cornice')
        _quoins(L, 0.0, 19.5, Hu, 0.36); _quoins(L, 17.0, 17.0, Hl, 0.36)
        # ground floor: living room windows, the front door of the hall (centred u = 8.475), the kitchen windows
        for uu, w in ((1.1, 1.1), (3.7, 1.1), (12.0, 1.0), (14.4, 1.0)):
            window(L, uu, 0.85, w, 1.2); flower_box(L, uu - 0.03, 0.55, w + 0.06, 0.0)
        door(L, 7.9, 1.15, 2.1, O['teal'], k='round', hood=True)
        window(L, 6.45, 0.9, 0.7, 1.15, 'round'); window(L, 9.65, 0.9, 0.7, 1.15, 'round')
        # upstairs: bathroom, parents, my room, sister's room
        for uu, w, sh in ((1.4, 0.8, '#8FB57A'), (5.0, 1.0, '#8FB57A'), (7.2, 1.0, '#8FB57A'), (11.4, 1.0, '#8FB57A'), (16.4, 1.0, '#8FB57A')):
            window(L, uu, 3.4, w, 1.2, shutter=sh)
        window(L, 13.4, 3.55, 0.6, 0.9, 'round'); window(L, 18.3, 3.55, 0.6, 0.9, 'round') if False else None
        flower_box(L, 11.37, 3.1, 1.06, 0.0); flower_box(L, 16.37, 3.1, 1.06, 0.0)
        # the passage: a post at the front corner and a door in the kitchen's side wall (x = 27) onto it
        L.box(19.2, -0.32, 0.0, 0.3, 0.3, Hl, lm(cream, 0.8), 0.03, 'post'); L.box(19.15, -0.37, 0.0, 0.4, 0.4, 0.16, lm(O['stone'], 0.85), 0.03, 'pfoot')
        moved(lambda: door(R, -3.5, 1.1, 2.0, O['brown'], k='rect', step=True), 17.0, 0.0)
        moved(lambda: window(R, -5.3, 0.9, 0.7, 1.0), 17.0, 0.0) if False else None
        # the end wall (x = 29.5) and a window in it
        moved(lambda: window(R, -4.7, 3.4, 1.0, 1.2, shutter='#8FB57A'), 19.5, 0.0)
        roof_ridge_u(L, 0.0, 19.5, D, Hu, 1.7, O['tile'], wallc=y, nf=0.4, ov=0.25)
        chimney(L, 3.0, -2.5, 6.4, 7.7); chimney(L, 14.2, -2.5, 6.4, 7.7)
    objs = _made(body); _place(objs, -9.75, 3.0)

@kind('bgrand')
def k_bgrand(st):
    """The grandparents' house: x -7 .. 0, y 0 .. 7, front on x = 0, door centred at y = 3.475."""
    def body():
        L = Wl('L'); R = Wl('R'); cr = '#F6E6BE'; D = 7.0; H = 3.9
        house(R, 0.0, 7.0, D, H, cr, base='#B99A70', band=2.45, quoin=False); _quoins(R, 0.0, 7.0, H)
        door(R, 2.9, 1.15, 2.1, '#6D9D5F', k='round', hood=False)
        for uu in (0.55, 5.7): window(R, uu, 0.9, 0.75, 1.15); flower_box(R, uu - 0.03, 0.6, 0.81, 0.0)
        for uu, k in ((0.7, 'rect'), (2.9, 'round'), (5.3, 'rect')):
            window(R, uu, 2.8, 0.7, 0.85 if k == 'rect' else 1.0, k, shutter='#8FB57A' if k == 'rect' else None)
        flower_box(R, 2.87, 2.5, 0.76, 0.0)
        roof_ridge_u(R, 0.0, 7.0, D, H, 1.9, O['brown'], wallc=cr, ov=0.25); chimney(R, 5.9, -3.0, 5.0, 6.6)
        wd = lm(O['woodL'], 0.7)
        for pu in (2.3, 4.65): R.box(pu, 0.4, 0, 0.1, 0.1, 2.5, wd, 0.02, 'post')
        R.box(2.15, 0.0, 2.45, 2.7, 0.1, 0.1, lm(O['cream'], 0.8), 0.02, 'beam')
        prism(R, [(0.0, 2.58), (0.62, 2.42), (0.62, 2.52), (0.0, 2.68)], 'nz', 2.1, 4.95, roof_mat(O['brown'], True, 2.85, 0.62), 0.01, 'porch')
        for pu in (2.35, 4.7): MO.pot_plant(R, pu + 0.02, 0.22, 1.0)
        # the end wall toward +y (y = 7)
        moved(lambda: window(L, -5.4, 0.9, 0.75, 1.15), 0.0, 7.0); moved(lambda: window(L, -2.2, 0.9, 0.75, 1.15), 0.0, 7.0)
        moved(lambda: window(L, -5.3, 2.8, 0.7, 0.85, shutter='#8FB57A'), 0.0, 7.0); moved(lambda: window(L, -2.1, 2.8, 0.7, 0.85, shutter='#8FB57A'), 0.0, 7.0)
    objs = _made(body); _place(objs, 3.5, -3.5)

@kind('bshop')
def k_bshop(st):
    """The shop: x -7 .. 0, y 10.3 .. 17.3 (u = y - 10.3), front on x = 0, door centred at u = 3.475, a striped awning over it."""
    def body():
        L = Wl('L'); R = Wl('R'); body_ = '#EDA361'; D = 7.0; H = 3.7; du = 1.9
        house(R, 0.0, 7.0, D, H, body_, base='#B98A5E', band=2.95, quoin=False); _quoins(R, 0.0, 7.0, H)
        door(R, 1.0 + du, 1.15, 2.1, '#2E9C97', k='rect', hood=False)
        wd = lm(O['wood'], 0.7); wdL = lm(O['woodL'], 0.7)
        # a big shop window left of the door, with a flower box
        window(R, 0.55, 0.85, 1.3, 1.25, trim='#FFF3DC', bars=1); flower_box(R, 0.52, 0.55, 1.36, 0.0)
        # the bread window: a deep niche with shelves, loaves and jars (right of the door)
        R.box(2.3 + du, 0.0, 0.78, 1.3, 0.04, 1.4, lm('#8C5A3A', 0.9), 0.0, 'back')
        for (a, b, z0, z1) in ((2.22 + du, 0.1, 0.7, 1.52), (3.58 + du, 0.1, 0.7, 1.52)): R.box(a, 0.0, z0, b, 0.36, z1 - z0 + 0.7, wdL, 0.02, 'jamb')
        R.box(2.22 + du, 0.0, 2.14, 1.46, 0.36, 0.1, wdL, 0.02, 'head'); R.box(2.22 + du, 0.0, 0.7, 1.46, 0.4, 0.1, wdL, 0.02, 'counter')
        for z in (1.12, 1.6): R.box(2.3 + du, 0.0, z, 1.3, 0.3, 0.04, wd, 0.01, 'shelf')
        loaf = lm('#D99A57', 0.7); items = []
        for i in range(3):
            x, y = R.xy(2.5 + du + i * 0.36, 0.17); items.append((x, y, 1.19, 0.12, 0.15, 0.1))
        balls(items, loaf, 'loaf', 2)
        for i, c in enumerate(('#C73F4B', '#E3B34A', '#8B5FA8', '#E58C8C', '#C73F4B', '#E3B34A')):
            x, y = R.xy(2.42 + du + (i % 3) * 0.4, 0.12 + 0.12 * (i // 3)); lathe(x, y, 1.64, [(0.001, 0), (0.07, 0), (0.075, 0.03), (0.075, 0.2), (0.05, 0.22), (0.001, 0.22)], lm(c, 0.3, emit=(c, 0.15)), 16, 'jar')
            lathe(x, y, 1.84, [(0.001, 0), (0.06, 0), (0.06, 0.04), (0.001, 0.04)], lm('#FFF3DC', 0.6), 16, 'lid')
        # the striped awning over door and niche, scalloped, on two poles
        cols = (O['teal'], '#FFF3DC'); nst = 12; ua, ub = 1.55, 6.05; sw_ = (ub - ua) / nst
        for i in range(nst):
            c = cols[i % 2]; u = ua + i * sw_
            prism(R, [(0.0, 2.85), (1.05, 2.27), (1.05, 2.33), (0.0, 2.91)], 'nz', u, u + sw_ + 0.002, lm(c, 0.9, sheen=0.3), 0.008, 'awn')
            R.box(u, 1.05, 2.0, sw_, 0.02, 0.33, lm(c, 0.9, sheen=0.3), 0.004, 'val')
            x, y = R.xy(u + sw_ / 2, 1.06); ball(x, y, 2.02, sw_ / 2, lm(c, 0.9, sheen=0.3), 0.04 / sw_ * 2, 1, 0.85)
        for pu in (1.65, 5.95): x, y = R.xy(pu, 1.0); cyl(x, y, 0, 0.035, 2.3, lm(O['woodL'], 0.6), 0.0, 12)
        # upstairs windows, the round sign with a loaf, crates of fruit and bread outside
        for uu in (0.9, 5.3): window(R, uu, 2.98, 0.8, 0.55, 'rect', trim='#FFF3DC', shutter=None)
        ru = 3.475; prism(R, [(ru + 0.3 * math.cos(2 * math.pi * i / 28), 3.25 + 0.3 * math.sin(2 * math.pi * i / 28)) for i in range(28)], 'uz', 0.0, 0.07, lm(O['woodL'], 0.7), 0.012, 'sign')
        sx_, sy_ = R.xy(ru, 0.09); ball(sx_, sy_, 3.25, 0.2, loaf, 0.35, 1.2, 0.85)
        for (u, n, z, wu, wn, wz) in ((5.45, 0.08, 0.0, 0.5, 0.45, 0.3), (5.95, 0.08, 0.0, 0.5, 0.45, 0.3), (5.7, 0.08, 0.3, 0.5, 0.45, 0.28)):
            R.box(u, n, z, wu, wn, wz, lm(O['woodL'], 0.8), 0.02, 'crate'); R.box(u + 0.04, n + 0.04, z + wz - 0.03, wu - 0.08, wn - 0.08, 0.03, lm('#6A4A35', 0.9), 0.0, 'cin')
            its = []
            for i in range(3):
                for j in range(2):
                    x, y = R.xy(u + 0.1 + i * 0.15, n + 0.12 + j * 0.2); its.append((x, y, z + wz + 0.02, 0.075, 0.075, 0.07))
            balls(its, lm(['#E8742F', '#C73F4B', '#E3B34A'][int(z * 10 + u * 3) % 3], 0.6), 'fruit', 1)
        roof_ridge_u(R, 0.0, 7.0, D, H, 1.7, '#C45B3E', wallc=body_, ov=0.25); chimney(R, 5.8, -3.0, 4.5, 6.0)
        # the end wall toward +y
        moved(lambda: window(L, -5.3, 0.9, 0.75, 1.15, trim='#FFF3DC'), 0.0, 7.0); moved(lambda: window(L, -2.3, 0.9, 0.75, 1.15, trim='#FFF3DC'), 0.0, 7.0)
        moved(lambda: window(L, -5.3, 2.7, 0.7, 0.8, trim='#FFF3DC'), 0.0, 7.0); moved(lambda: window(L, -2.3, 2.7, 0.7, 0.8, trim='#FFF3DC'), 0.0, 7.0)
    objs = _made(body); _place(objs, 3.5, -3.5)

@kind('bschool')
def k_bschool(st):
    """The school: x -8 .. 0, y 17.8 .. 24.8 (u = y - 17.8), front on x = 0, door centred at u = 3.575; flat roof, belfry gable, a flag."""
    def body():
        L = Wl('L'); R = Wl('R'); body_ = '#F7D878'; D = 8.0; H = 3.4; blue = lm('#4D78B5', 0.7); trim = lm('#FFF8E8', 0.8)
        house(R, 0.0, 7.0, D, H, body_, band=2.3, quoin=False, base='#C9A468'); _quoins(R, 0.0, 7.0, H)
        door(R, 3.0, 1.15, 2.1, '#3E86C2', k='rect', hood=False)
        for uu in (0.7, 1.75, 5.15, 6.2): window(R, uu, 0.85, 0.55, 1.2, trim='#FFF8E8'); flower_box(R, uu - 0.03, 0.55, 0.61, 0.0, [O['pink'], O['yellow'], O['cream']])
        for uu in (0.675, 1.975, 3.275, 4.575, 5.875): window(R, uu, 2.5, 0.6, 0.65, 'rect', trim='#FFF8E8')
        # the roof: a parapet round the edge, the little belfry gable over the door with its bell, a flag
        R.box(-0.07, -D, H, 0.0, 0.0, 0.0, blue, 0.0, 'x') if False else None
        R.box(-0.07, -0.02, H + 0.1, 7.14, 0.16, 0.24, blue, 0.04, 'parapet'); R.box(6.91, -D, H + 0.1, 0.16, D + 0.07, 0.24, blue, 0.04, 'parapet2')
        R.box(0.0, -D, H + 0.1, 6.95, D - 0.1, 0.07, lm('#7D8FA8', 0.9), 0.0, 'roofdeck')
        prism(R, [(2.9, H + 0.34), (4.25, H + 0.34), (3.575, H + 1.45)], 'uz', -0.15, 0.1, trim, 0.025, 'belfry')
        prism(R, arch_pts(3.25, 3.9, H + 0.42, H + 0.7, 'round'), 'uz', 0.09, 0.14, lm('#5A3E2B', 0.9), 0.01, 'belfryin')
        bx, by = R.xy(3.575, 0.0); lathe(bx, by, H + 0.56, [(0.001, 0), (0.1, 0), (0.12, 0.07), (0.085, 0.2), (0.05, 0.26), (0.001, 0.28)], lm(C['brass'], 0.35, 0.9), 24)
        fx, fy = R.xy(6.6, -0.25); cyl(fx, fy, H + 0.34, 0.03, 1.9, lm('#EFE6D0', 0.5), 0.0, 12); ball(fx, fy, H + 2.26, 0.05, lm(C['brass'], 0.3, 0.9))
        box(fx - 0.01, fy - 0.5, H + 1.48, 0.02, 0.5, 0.4, lm(O['teal'], 0.8), 0.01, 'flag'); box(fx - 0.012, fy - 0.5, H + 1.48, 0.024, 0.5, 0.04, lm('#FFF8E8', 0.8), 0.0, 'flagedge'); box(fx - 0.012, fy - 0.5, H + 1.84, 0.024, 0.5, 0.04, lm('#FFF8E8', 0.8), 0.0, 'flagedge')
        # the end wall toward +y: two rows of windows
        for uu in (-6.6, -4.2, -1.8): moved(lambda uu=uu: window(L, uu, 0.85, 0.6, 1.2, trim='#FFF8E8'), 0.0, 7.0); moved(lambda uu=uu: window(L, uu, 2.5, 0.6, 0.65, trim='#FFF8E8'), 0.0, 7.0)
    objs = _made(body); _place(objs, 4.0, -3.5)

@kind('bmasjid')
def k_bmasjid(st):
    """The masjid: x 0.5 .. 9.5, y -9 .. 0 (u = x - 0.5); the iwan with the big dome and the door (centred u = 4.5), a wing with a
    little dome on each side, one modest minaret, a prayer hall behind (its side wall faces +x)."""
    def body():
        L = Wl('L'); R = Wl('R'); cream = lm('#F8EDD5', 0.9); trim = lm('#FFF8E8', 0.8); stone = lm('#E6D6B4', 0.9); teal = lm(O['teal'], 0.7); gold = lm('#E3B34A', 0.5, 0.2)
        objs = _made(lambda: MO.masjid(L)); _drop(('cwall', 'ccap', 'cband'))
        # the front part is the old facade, moved 1 m to the right so its door is centred at u = 4.5
        before = [o for o in bpy.data.objects if o.parent is None and o.type != 'LIGHT' and o.name.split('.')[0] not in ('cam', 'sun', 'fill', 'catcher')]
        g = kit.group(before, 'front'); g.location = (1.0, 0.0, 0.0)
        # more plinth on both sides, the right-hand wing with its own little dome, the prayer hall behind
        L.box(0.0, -1.7, 0, 1.4, 1.76, 0.26, stone, 0.03, 'plinth'); L.box(7.0, -1.7, 0, 2.0, 1.76, 0.26, stone, 0.03, 'plinth')
        du = 6.7
        L.box(0.4 + du, -1.5, 0.26, 1.7, 1.5, 3.04, cream, 0.03, 'wing'); L.box(0.34 + du, -1.5, 3.3, 1.82, 1.58, 0.14, trim, 0.03, 'cornice'); MO.merlons(L, 0.4 + du, 2.1 + du, 3.44, -0.02, 0.1, trim)
        MO.tile_band(L, 0.4 + du, 2.1 + du, 0.26, 0.95, 0.012, O['tealD'], O['tealL'], O['cream'], 0.35, 'wain'); MO.tile_band(L, 0.4 + du, 2.1 + du, 2.5, 2.95, 0.012, O['teal'], O['cream'], '#E3B34A', 0.45, 'frz')
        for uu in (0.62 + du, 1.42 + du): window(L, uu, 1.2, 0.5, 1.25, 'point', trim='#FFF8E8', bars=1)
        dc = L.xy(1.25 + du, -0.75); cyl(dc[0], dc[1], 3.44, 0.58, 0.42, cream, 0.02, 32); lathe(dc[0], dc[1], 3.8, [(0.6, 0), (0.6, 0.08)], teal, 32)
        MO.dome(dc[0], dc[1], 3.88, 0.62, 0.8, teal, 6, gold); tube((dc[0], dc[1], 4.66), (dc[0], dc[1], 4.9), 0.02, gold); ball(dc[0], dc[1], 4.9, 0.04, gold); crescent(dc[0], dc[1], 5.08, 0.28)
        L.box(0.0, -9.0, 0.26, 9.0, 7.6, 3.04, cream, 0.03, 'hall'); L.box(-0.06, -9.0, 3.3, 9.12, 7.7, 0.14, trim, 0.03, 'hallcornice')
        L.box(0.14, -8.86, 3.43, 8.72, 7.4, 0.05, lm('#D7C5A0', 0.9), 0.0, 'hallroof')
        lathe(L.xy(7.2, -6.0)[0], L.xy(7.2, -6.0)[1], 3.44, [(0.9, 0), (0.9, 0.3)], cream, 32); dh = L.xy(7.2, -6.0)
        lathe(dh[0], dh[1], 3.74, [(0.95, 0), (0.95, 0.06)], teal, 32); MO.dome(dh[0], dh[1], 3.8, 0.92, 0.85, teal, 6, gold); tube((dh[0], dh[1], 4.6), (dh[0], dh[1], 4.82), 0.02, gold); crescent(dh[0], dh[1], 5.0, 0.26)
        # the prayer hall's side wall (x = 9.5, facing +x): a tile band and three pointed windows
        def side():
            for uu in (-2.9, -5.1, -7.3): window(R, uu, 1.2, 0.55, 1.3, 'point', trim='#FFF8E8', bars=1)
            MO.tile_band(R, -8.8, -1.8, 0.26, 0.95, 0.012, O['tealD'], O['tealL'], O['cream'], 0.35, 'wainside'); MO.tile_band(R, -8.8, -1.8, 2.5, 2.95, 0.012, O['teal'], O['cream'], '#E3B34A', 0.45, 'frzside')
            MO.merlons(R, -8.8, -1.8, 3.44, -0.02, 0.1, trim)
        moved(side, 9.0, 0.0)
    objs = _made(body); _place(objs, -4.5, 4.5)

# ================================================================= small things of the town
@kind('yardtree')
def k_yardtree(st): MO.small_tree(0, 0, (O['leaf'], O['leafD'], O['leafL']), 21, fruit=O['tile'])

KINDS['busstopw'] = MO.KINDS['busstop']       # the bus stop on the west kerb of the side road: same sign, its waiting spot is on the -x side

@kind('bigtree')
def k_bigtree(st):
    """A tall tree for the back edges of the world (behind the buildings): states a / b are two shapes."""
    if st == 'b': tree(0, 0, 0, 3.0, 1.35, 7, ('#6BA85A', '#4C8B4C', '#9AC96E'), 0.17, 7)
    else: tree(0, 0, 0, 2.7, 1.5, 3, None, 0.17, 7)

@kind('parkgate')
def k_parkgate(st):
    """The park's flowery timber arch (opening 1.6 wide along X, centred)."""
    wd = lm(O['wood'], 0.7); wdl = lm(O['woodL'], 0.7); L = Wl('L')
    for uu in (-0.92, 0.92): box(uu - 0.08, -0.08, 0, 0.16, 0.16, 1.85, wd, 0.03, 'gpost'); box(uu - 0.11, -0.11, 1.85, 0.22, 0.22, 0.08, wdl, 0.03, 'gcap')
    prism(L, arch_ring(-0.84, 0.84, 1.9, 0.14, 'round'), 'uz', -0.1, 0.1, wd, 0.02, 'garch')
    rnd = random.Random(5); fl = []
    for i in range(16):
        a = math.pi * i / 15; u = -0.9 * math.cos(a); z = 1.9 + 0.88 * math.sin(a); fl.append((u + rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.1), z, 0.09, 0.09, 0.08))
    for k in range(4): fl.append((-0.93 if k % 2 == 0 else 0.93, 0.0, 0.5 + k * 0.4, 0.07, 0.09, 0.09))
    balls(fl, lm(O['leaf'], 0.8), 'gleaf', 1); balls([(a, b, c + 0.05, 0.05, 0.05, 0.05) for (a, b, c, *_r) in fl[::2]], lm(O['pink'], 0.6), 'gbloom', 1)

@kind('gardengate')
def k_gardengate(st):
    """The garden gate: two timber posts and a picket leaf swung open (the opening is 1.2 wide along X, centred)."""
    wd = lm(O['wood'], 0.7); wdl = lm(O['woodL'], 0.7); pick = lm('#FBF1DC', 0.7)
    for uu in (-0.68, 0.68): box(uu - 0.06, -0.06, 0, 0.12, 0.12, 1.1, wd, 0.025, 'post'); ball(uu, 0, 1.14, 0.075, wdl)
    items = []; z0 = []
    for i in range(7): items.append((-0.0 + i * 0.13, -0.015, 0.06, 0.08, 0.03, 0.78 + (0.05 if i % 2 else 0.0)))
    leaf = boxes(items, pick, 0.008, 'leaf'); r1 = box(0.0, -0.025, 0.2, 0.9, 0.05, 0.06, wdl, 0.01, 'rail'); r2 = box(0.0, -0.025, 0.6, 0.9, 0.05, 0.06, wdl, 0.01, 'rail')
    g = kit.group([leaf, r1, r2], 'leafg'); g.location = (-0.62, 0.0, 0.0); g.rotation_euler = (0, 0, math.radians(-68))

def _picket_piece(length, h, post, pick):
    wl = lm(O['woodL'], 0.75); n = int(length / 0.15); items = []; tops = []
    for i in range(n):
        u = -length / 2 + 0.11 + i * (length - 0.22) / max(1, n - 1); items.append((u - 0.0375, -0.015, 0.04, 0.075, 0.03, h - 0.1)); tops.append((u, 0, h - 0.06, 0.04, 0.03, 0.05))
    boxes(items, pick, 0.008, 'pickets')
    for z in (0.18, h - 0.28): box(-length / 2, -0.04, z, length, 0.03, 0.06, wl, 0.01, 'rail')
    for x in (-length / 2 + 0.04, length / 2 - 0.04): box(x - 0.045, -0.045, 0, 0.09, 0.09, h + 0.04, post, 0.02, 'post'); ball(x, 0, h + 0.06, 0.055, post, 1, 1, 0.8)

@kind('pfence')
def k_pfence(st): _picket_piece(2.0, 0.9, lm(O['woodL'], 0.7), lm(O['woodL'], 0.75))

@kind('yfence')
def k_yfence(st): _picket_piece(1.0, 0.85, lm(O['woodL'], 0.7), lm('#FBF1DC', 0.7))

@kind('bush')
def k_bush(st):
    rnd = random.Random(12); tones = [lm(O['leaf'], 0.7), lm(O['leafD'], 0.7), lm('#6FAE5E', 0.7)]
    balls([(0, 0, 0.3, 0.34, 0.32, 0.3), (0.2, 0.1, 0.26, 0.24, 0.24, 0.22), (-0.2, -0.08, 0.25, 0.25, 0.24, 0.22)], tones[0], 'b1', 2)
    balls([(0.05, 0.05, 0.5, 0.2, 0.2, 0.15)], tones[2], 'b2', 2); balls([(-0.1, 0.2, 0.2, 0.2, 0.18, 0.17)], tones[1], 'b3', 2)
    balls([(0.28, -0.1, 0.4, 0.04, 0.04, 0.04), (-0.1, 0.25, 0.42, 0.04, 0.04, 0.04), (0.05, -0.28, 0.35, 0.04, 0.04, 0.04)], lm(O['pink'], 0.6), 'bl', 1)

@kind('reeds')
def k_reeds(st):
    rnd = random.Random(3); rm = lm('#6C9A4E', 0.8); hm = lm('#7A4A2E', 0.8)
    for j in range(7):
        ox, oy = rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2); hh = rnd.uniform(0.7, 1.15); lean = rnd.uniform(-0.1, 0.1)
        tube((ox, oy, 0.0), (ox + lean, oy + lean * 0.5, hh), 0.012, rm, 0.008, caps=False)
        if j % 2 == 0: cyl(ox + lean, oy + lean * 0.5, hh - 0.14, 0.03, 0.2, hm, 0.01, 10)
