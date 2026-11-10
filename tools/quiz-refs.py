#!/usr/bin/env python3
"""Prints every question of a quiz next to the text of the source it cites, so each one can be read and
checked. Quran text is Saheeh International from api.alquran.cloud; hadith text is from the open hadith-api
editions (matched on the standard reference number). Texts are cached in a folder outside the repo.

    python3 tools/quiz-refs.py <quiz-id> [--cache DIR] [--only bukhari|quran|...]

A reference this tool cannot find is printed as NOT FOUND and must be fixed or the question dropped."""
import sys, os, re, json, subprocess, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
cache = os.path.expanduser('~/.cache/kahf-quiz-refs')
if '--cache' in args: cache = args[args.index('--cache') + 1]
only = args[args.index('--only') + 1] if '--only' in args else None
quiz = args[0]
os.makedirs(os.path.join(cache, 'quran'), exist_ok=True); os.makedirs(os.path.join(cache, 'hadith'), exist_ok=True)

BOOKS = [('bukhari', r'Bukhari'), ('muslim', r'Muslim'), ('abudawud', r'Abi? ?Dawud|Abu Dawud'), ('tirmidhi', r'Tirmidhi'),
         ('nasai', r"Nasa'?i"), ('ibnmajah', r'Ibn Majah'), ('malik', r'Muwatta'), ('nawawi', r'Nawawi')]

def get(url, path):
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={'User-Agent': 'quiz-refs'})
        open(path, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    return json.load(open(path))

_h = {}
def hadith(book, num):
    if book not in _h:
        d = get('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-%s.min.json' % book, os.path.join(cache, 'hadith', book + '.json'))
        m = {}
        for h in d['hadiths']:
            for k in (h.get('arabicnumber'), h.get('hadithnumber') if book != 'muslim' else None):
                if k is None: continue
                k = str(k); k = k[:-2] if k.endswith('.0') else k
                m.setdefault(k, h); m.setdefault(k.split('.')[0], h)
        _h[book] = m
    h = _h[book].get(re.sub(r'[a-z]$', '', num))
    if not h: return None
    g = ', '.join(x['grade'] for x in h.get('grades', [])[:2])
    return ('[' + g + '] ' if g else '') + re.sub(r'\s+', ' ', h['text'])

def quran(s, a, b):
    d = get('https://api.alquran.cloud/v1/surah/%d/en.sahih' % s, os.path.join(cache, 'quran', '%d.json' % s))
    ay = d['data']['ayahs']
    if a < 1 or b > len(ay): return None
    return ' '.join('(%d) %s' % (x['numberInSurah'], x['text']) for x in ay[a - 1:b])

js = """
global.window = global; global.document = { currentScript: null }; global.Kit = {}; global.location = { search: '' };
const p = require('path'), R = %s;
['quiz.js','themes.js','catalog.js','surahs.js','scenes.js'].forEach(f => require(p.join(R,'js/quiz',f)));
require(p.join(R,'games',%s,'data.js'));
const T = o => o ? (o.t ? o.t.en : o.p ? '<'+o.p+'>' : o.en || '') : '';
const out = KahfQuiz.defs[%s].bank.map(q => ({ ref: q.ref || '', band: q.band, q: q.q.en,
  a: q.type === 'choice' ? T(q.a[q.correct]) : q.type === 'yesno' ? (q.yes ? 'YES' : 'NO') :
     q.type === 'order' ? q.items.map(T).join(' > ') : q.type === 'match' ? q.pairs.map(x => T(x.l)+'='+T(x.r)).join('; ') :
     q.type === 'sort' ? q.bins.map((b,i) => T(b)+': '+q.items.filter(x=>x.bin===i).map(T).join(', ')).join(' | ') : q.correct,
  why: q.why ? q.why.en : '' }));
console.log(JSON.stringify(out));
""" % (json.dumps(ROOT), json.dumps(quiz), json.dumps(quiz))
qs = json.loads(subprocess.check_output(['node', '-e', js]))
groups = {}
for q in qs: groups.setdefault(q['ref'], []).append(q)
missing = 0
for ref in sorted(groups):
    if only and only.lower() not in ref.lower(): continue
    texts = []
    for part in re.split(r';\s*', ref):
        if re.match(r'Quran \d+:', part):
            for m in re.finditer(r'(\d+):(\d+)(?:-(\d+))?', part):
                s, a = int(m.group(1)), int(m.group(2)); b = int(m.group(3) or a)
                texts.append(('%d:%d ' % (s, a)) + (quran(s, a, b) or 'NOT FOUND') if quran(s, a, b) else 'NOT FOUND')
            continue
        if re.match(r'Quran, surah (\d+)|Surah list', part): texts.append('(surah table from quran.com)'); continue
        hit = False
        for book, rx in BOOKS:
            m = re.search('(?:' + rx + r')\D*?(\d+[a-z]?)', part)
            if m:
                texts.append(hadith(book, m.group(1)) or 'NOT FOUND'); hit = True; break
        if not hit: texts.append('(not a Quran or hadith reference)')
    if '--brief' in args:
        if texts == ['(surah table from quran.com)']: continue
        for t in texts:
            if t == 'NOT FOUND': missing += 1
        print('\n# ' + (ref or 'NO REF') + '  ::  ' + ' || '.join(t[:150] for t in texts))
        for q in groups[ref]: print('   b%s %s -> %s' % (q['band'], q['q'][:80], str(q['a'])[:70]))
        continue
    print('\n=== ' + (ref or 'NO REF'))
    for t in texts:
        if t == 'NOT FOUND': missing += 1
        print('    SOURCE: ' + t[:700])
    for q in groups[ref]:
        print('  b%s  %s  ->  %s   [%s]' % (q['band'], q['q'], q['a'], q['why']))
print('\n%d questions, %d references, %d not found' % (len(qs), len(groups), missing))
