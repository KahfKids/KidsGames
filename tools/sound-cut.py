#!/usr/bin/env python3
"""Cut a game's sound effects and ambience loops out of the original recordings, the same way every time.
   python3 tools/sound-cut.py <recipe.json> [--src DIR] [--only name,name]

   The originals are not in the repo: they are kept beside it in ../KidsGames-sounds/ (CC0, see its README).
   A recipe (games/<id>/audio/sfx/recipe.json) lists every sound the game plays:
     { "out": "games/helping-home/audio/sfx", "src": "../KidsGames-sounds/bigsoundbank",
       "sounds": {
         "pop":  { "bus": "ui",  "src": "1074-bubbles-burst.mp3", "cuts": [[0.20, 0.22], [1.53, 0.22]], "fade": [0.002, 0.06] },
         "day":  { "bus": "amb", "src": "0097-countryside.mp3", "loop": [88.0, 12.0], "x": 1.5 } } }
   One-shot ("cuts": [start, length] in seconds, each cut is one take: <name>-1, <name>-2 ...):
     a cut may take a third item, its own recording, so one sound's variants can come from several files;
     high-passed (hp, default 70 Hz), faded in and out, then set to one loudness: the loudest 400 ms window at
     `lufs` (default -20 LUFS momentary) and never over -1 dBTP true peak (audio-design: mobile mix about -18 LUFS).
   Loop ("loop": [start, length]): the stretch, its first `x` seconds cross-faded (equal power) with what follows it,
     so the end runs on into the start without a seam; integrated loudness `lufs` (default -30 LUFS, a bed under
     everything). The file carries `pad` seconds (0.1) of the loop's own sound before and after, and the game plays it
     between loopStart = pad and loopEnd = pad + length, so the AAC encoder's lead-in silence is never in the loop (Phaser loops that marker, sample-exact).
   Out, for Phaser's sound system (this.load.audioSprite / this.load.audio, see js/kit/sound.js):
     <out>/sfx.m4a + <out>/sfx.json   every one-shot take in ONE file (one request, one decode), the takes 0.12 s apart;
                                      sfx.json is Phaser's audio-sprite JSON ({resources, spritemap}) plus "sounds":
                                      { "<name>": { "cat": "ui"|"sfx"|"amb", "takes": ["<name>-1", ...] } }
                                      Each marker starts 30 ms before its take and ends 60 ms after it, in the silence,
                                      so the take is whole whether or not a browser trims the AAC encoder's lead-in.
     <out>/<name>.m4a                 each loop on its own (loaded when it is wanted, let go after), and in "sounds":
                                      { "<name>": { "cat": ..., "loop": { "file": "<name>.m4a", "start": pad, "end": pad + length } } }
     All files mono AAC 48 kbit/s, 44.1 kHz.
   Needs ffmpeg. Nothing here is drawn or synthesised: it only cuts, fades, levels and encodes recordings."""
import json, os, re, subprocess, sys, tempfile

def sh(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: sys.exit('FAILED: ' + ' '.join(args)[:400] + '\n' + r.stderr[-600:])
    return r.stderr

def loudness(wav):
    """(max momentary LUFS, integrated LUFS, true peak dBTP) of a file."""
    e = sh(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'apad=pad_dur=0.5,ebur128=peak=true:framelog=info', '-f', 'null', '-'])
    ms = [float(m) for m in re.findall(r'M:\s*(-?[\d.]+)', e) if float(m) > -120]
    i = re.findall(r'I:\s*(-?[\d.]+) LUFS', e); p = re.findall(r'Peak:\s*(-?[\d.inf]+) dBFS', e)
    peak = float(p[-1]) if p and p[-1] not in ('-inf', 'inf') else -120.0
    return (max(ms) if ms else -70.0), (float(i[-1]) if i else -70.0), peak

def encode(wav, gain_db, dst):
    sh(['ffmpeg', '-hide_banner', '-y', '-i', wav, '-af', 'volume=%.2fdB' % gain_db, '-ac', '1', '-ar', '44100',
        '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', dst])

def one_shot(src, start, length, o, tmp):
    hp, fi, fo = o.get('hp', 70), o.get('fade', [0.003, 0.05])[0], o.get('fade', [0.003, 0.05])[1]
    sh(['ffmpeg', '-hide_banner', '-y', '-ss', str(start), '-t', str(length), '-i', src, '-af',
        'highpass=f=%d,afade=t=in:d=%g,afade=t=out:st=%g:d=%g' % (hp, fi, max(0, length - fo), fo), '-ac', '1', '-ar', '44100', tmp])
    m, _, pk = loudness(tmp)
    return min(o.get('lufs', -20.0) - m, -1.5 - pk)

def loop(src, start, length, o, tmp):
    x, pad, hp = o.get('x', 1.0), o.get('pad', 0.1), o.get('hp', 60)
    # R = A with its head replaced by (B fading out + A's head fading in), A = [start, start+length), B = what follows A
    fc = ('[0]atrim=%g:%g,asetpts=PTS-STARTPTS,asplit=2[a1][a2];'
          '[a1]atrim=0:%g,asetpts=PTS-STARTPTS,afade=t=in:d=%g:curve=qsin[h];'
          '[a2]atrim=%g,asetpts=PTS-STARTPTS[rest];'
          '[0]atrim=%g:%g,asetpts=PTS-STARTPTS,afade=t=out:d=%g:curve=qsin[b];'
          '[h][b]amix=inputs=2:normalize=0[x];[x][rest]concat=n=2:v=0:a=1,highpass=f=%d[r]'
          % (start, start + length, x, x, x, start + length, start + length + x, x, hp))
    seam = tmp + '.r.wav'
    sh(['ffmpeg', '-hide_banner', '-y', '-i', src, '-filter_complex', fc, '-map', '[r]', '-ac', '1', '-ar', '44100', seam])
    # padded: the loop's last `pad` seconds, the loop, its first `pad` seconds
    sh(['ffmpeg', '-hide_banner', '-y', '-i', seam, '-filter_complex',
        '[0]asplit=3[p][m][q];[p]atrim=%g:%g,asetpts=PTS-STARTPTS[p2];[q]atrim=0:%g,asetpts=PTS-STARTPTS[q2];[p2][m][q2]concat=n=3:v=0:a=1[o]'
        % (length - pad, length, pad), '-map', '[o]', tmp])
    os.remove(seam)
    _, i, pk = loudness(tmp)
    return min(o.get('lufs', -30.0) - i, -1.5 - pk), [pad, pad + length]

def main():
    a = sys.argv[1:]; recipe = json.load(open(a[0])); root = os.path.dirname(os.path.abspath(__file__)) + '/..'
    src_dir = a[a.index('--src') + 1] if '--src' in a else os.path.join(root, recipe['src'])
    only = a[a.index('--only') + 1].split(',') if '--only' in a else None
    out = os.path.join(root, recipe['out']); os.makedirs(out, exist_ok=True)
    GAP, PRE, POST, SR = 0.12, 0.03, 0.06, 44100
    sounds, sprite, parts, t_at = {}, {}, [], GAP
    with tempfile.TemporaryDirectory() as td:
        for name, o in recipe['sounds'].items():
            src = os.path.join(src_dir, o['src']); cat = o.get('bus', 'sfx')
            if 'loop' in o:
                f = name + '.m4a'
                if not only or name in only:
                    t = os.path.join(td, name + '.wav'); g, lp = loop(src, o['loop'][0], o['loop'][1], o, t); encode(t, g, os.path.join(out, f))
                else:
                    lp = [o.get('pad', 0.1), o.get('pad', 0.1) + o['loop'][1]]
                sounds[name] = {'cat': cat, 'loop': {'file': f, 'start': round(lp[0], 4), 'end': round(lp[1], 4)}}
                print('%-10s %-4s loop  %.1f KB' % (name, cat, os.path.getsize(os.path.join(out, f)) / 1024))
                continue
            takes = []
            for n, c in enumerate(o['cuts']):                   # a cut may name its own recording: [start, length, "file"]
                raw = os.path.join(td, '%s-%d.raw.wav' % (name, n)); lev = os.path.join(td, '%s-%d.wav' % (name, n))
                g = one_shot(os.path.join(src_dir, c[2]) if len(c) > 2 else src, c[0], c[1], o, raw)
                sh(['ffmpeg', '-hide_banner', '-y', '-i', raw, '-af', 'volume=%.2fdB' % g, '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_s16le', lev])
                d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', lev], capture_output=True, text=True).stdout)
                key = '%s-%d' % (name, n + 1); takes.append(key); parts.append(lev)
                sprite[key] = {'start': round(t_at - PRE, 4), 'end': round(t_at + d + POST, 4), 'loop': False}
                t_at += d + GAP
            sounds[name] = {'cat': cat, 'takes': takes}
        # one file: GAP of silence, take, GAP, take, ...
        sil = os.path.join(td, 'gap.wav')
        sh(['ffmpeg', '-hide_banner', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=%d:cl=mono' % SR, '-t', str(GAP), '-c:a', 'pcm_s16le', sil])
        lst = os.path.join(td, 'list.txt')
        with open(lst, 'w') as fh:
            fh.write("file '%s'\n" % sil)
            for p_ in parts: fh.write("file '%s'\nfile '%s'\n" % (p_, sil))
        allw = os.path.join(td, 'all.wav'); sh(['ffmpeg', '-hide_banner', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', allw])
        encode(allw, 0, os.path.join(out, 'sfx.m4a'))
    json.dump({'resources': ['sfx.m4a'], 'spritemap': sprite, 'sounds': sounds}, open(os.path.join(out, 'sfx.json'), 'w'), indent=1)
    print('sprite: %d takes of %d sounds, %.1f s, %.1f KB' % (len(sprite), sum(1 for v in sounds.values() if 'takes' in v), t_at, os.path.getsize(os.path.join(out, 'sfx.m4a')) / 1024))

if __name__ == '__main__':
    main()
