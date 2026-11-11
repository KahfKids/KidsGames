#!/usr/bin/env python3
"""Write games/helping-home/offline.json: every file the game needs offline (run before each release).
The house page sends this list to the service worker (CACHE_URLS) so stations never opened still work offline."""
import json, os, re
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # games/helping-home
REPO = os.path.dirname(os.path.dirname(HERE))
KEEP = ('.html', '.js', '.css', '.json', '.m4a', '.png', '.svg', '.woff2', '.jpg', '.webp', '.avif')
# The game is index.html, what it names, everything under life/ (its code, data and AVIF art) and the recorded clips in
# audio/. Older pages that may still sit in this folder (the old town, classic.html, pray/*.html ...) are not part of it.
files = ['/KidsGames/games/helping-home/index.html']
page = open(os.path.join(HERE, 'index.html'), encoding='utf8').read()
for u in re.findall(r'src="([^"?#]+)"', page):
    if not u.startswith('/'): files.append('/KidsGames/games/helping-home/' + u)
for sub in ('life', 'audio'):
    for root, dirs, names in os.walk(os.path.join(HERE, sub)):
        for n in sorted(names):
            if n.startswith('_') or not n.endswith(KEEP): continue
            if n.endswith('.webp') and os.sep + os.path.join('life', 'art') in root: continue   # only fetched by a WebView too old for AVIF
            u = '/KidsGames/' + os.path.relpath(os.path.join(root, n), REPO).replace(os.sep, '/')
            if u not in files: files.append(u)
# shared files the pages load from outside the game folder
shared = set()
for f in files:
    if f.endswith('.html'):
        src = open(os.path.join(REPO, f[len('/KidsGames/'):]), encoding='utf8').read()
        shared.update(u for u in re.findall(r'(?:src|href)="(/KidsGames/[^"?#]+)"', src) if '/helping-home/' not in u)
# the kit's drawing surface (js/kit/gfx.js) fetches PixiJS itself, so no page names it
if any(u.endswith('/js/kit/gfx.js') for u in shared):
    vendor = os.path.join(REPO, 'js', 'vendor')
    shared.update('/KidsGames/js/vendor/' + n for n in os.listdir(vendor) if n.startswith('pixi-') and n.endswith('.min.js'))
files += sorted(u for u in shared if os.path.exists(os.path.join(REPO, u[len('/KidsGames/'):])))
sw = open(os.path.join(REPO, 'sw.js'), encoding='utf8').read()
ver = re.search(r"GAMES_CACHE = '([^']+)'", sw).group(1)
size = sum(os.path.getsize(os.path.join(REPO, u[len('/KidsGames/'):])) for u in files)
json.dump({'version': ver, 'bytes': size, 'files': files}, open(os.path.join(HERE, 'offline.json'), 'w'), indent=1)
print(len(files), 'files,', round(size / 1024), 'KB, cache', ver)
