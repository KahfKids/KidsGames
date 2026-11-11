"""Write one lossless picture as the two files the game can load.
   <base>.avif   what the game loads: about 45% smaller than WebP at a higher measured likeness to the render
   <base>.webp   only for a WebView too old to read AVIF (the game tests this once at start); never in offline.json
   Needs `avifenc` (libavif) and `cwebp` (webp), both from Homebrew. Settings were chosen on 2026-11-11 by comparing
   size, PSNR and likeness against the render on a background, a person sheet and the icon sheet: AVIF q60 4:4:4 is
   closer to the render than WebP q86 on all three. Do not lower them without repeating that comparison by eye."""
import hashlib, os, subprocess, sys
AVIF = ['avifenc', '-q', '60', '--qalpha', '90', '-y', '444', '-s', '2', '-a', 'tune=ssim', '-j', 'all']
WEBP = ['cwebp', '-quiet', '-q', '86', '-alpha_q', '92', '-m', '6']

def _run(a):
    r = subprocess.run(a, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(a)[:300] + '\n' + (r.stderr or r.stdout)[:400])

def save(png, base):
    """png: the lossless picture. base: where it goes, without an extension. Does nothing if neither the picture nor the
       settings have changed since the last time."""
    stamp = hashlib.md5(open(png, 'rb').read() + ' '.join(AVIF + WEBP + [base]).encode()).hexdigest()
    mark = png + '.enc'
    if os.path.exists(mark) and open(mark).read() == stamp and os.path.exists(base + '.avif') and os.path.exists(base + '.webp'): return
    _run(AVIF + [png, base + '.avif'])
    _run(WEBP + [png, '-o', base + '.webp'])
    open(mark, 'w').write(stamp)

# Surface (normal) maps are data, not pictures: no alpha, no colour tricks, and the colour is the direction, so the
# AVIF is 4:4:4 (no smeared chroma) and the WebP fallback is near-lossless (an ordinary lossy WebP is 4:2:0).
NORMAL_Q = 55
def save_data(png, base, q=None):
    """png: an opaque RGB data picture (e.g. a normal sheet). Writes <base>.avif and <base>.webp, like save()."""
    avif = ['avifenc', '-q', str(q or NORMAL_Q), '-y', '444', '-s', '2', '-j', 'all']
    webp = ['cwebp', '-quiet', '-near_lossless', '60', '-m', '6']
    stamp = hashlib.md5(open(png, 'rb').read() + ' '.join(avif + webp + [base]).encode()).hexdigest()
    mark = png + '.enc'
    if os.path.exists(mark) and open(mark).read() == stamp and os.path.exists(base + '.avif') and os.path.exists(base + '.webp'): return
    _run(avif + [png, base + '.avif'])
    _run(webp + [png, '-o', base + '.webp'])
    open(mark, 'w').write(stamp)
