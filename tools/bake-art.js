/* Bake a Phaser game's painted pictures into optimized AVIF files (with WebP copies for old WebViews).
   NODE_PATH=<a folder with playwright> node tools/bake-art.js <game-id> [--exe=<chromium>] [--url=http://127.0.0.1:8772]
   The game's own painters stay the source of truth: the page is opened with ?bake at a phone on its side, an upright
   phone and a tablet (844x390, 375x812, 1024x768); every picture made through Kit.play.tex is read back, and only those
   that come out the same size on all three screens are baked (screen-sized ones keep being painted on the phone).
   Writes games/<id>/art/baked/<key>.avif and .webp and games/<id>/art/baked.json ({ key: { f, w, h } }). The game then
   calls Kit.play.art(this, 'art/') in its Boot preload (and Kit.play.offThread(this.game) once) and paints nothing that
   was baked. Encoder settings are Helping Home's (games/helping-home/tools/art/enc.py, chosen by eye and PSNR):
   AVIF q60 4:4:4 tune=ssim, alpha q90; WebP q86, alpha q92. Needs avifenc and cwebp (Homebrew).
   Run it again after changing any painter (a stale file of the wrong size is ignored by the kit and painted instead). */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const args = process.argv.slice(2), opt = n => { const a = args.find(x => x.startsWith('--' + n + '=')); return a && a.slice(n.length + 3); };
const id = args.find(a => !a.startsWith('--'));
if (!id) { console.error('usage: node tools/bake-art.js <game-id>'); process.exit(2); }
const root = path.join(__dirname, '..'), gameDir = path.join(root, 'games', id);
const base = (opt('url') || 'http://127.0.0.1:8772') + '/KidsGames/games/' + id + '/index.html?bake&nosw';
const AVIF = ['-q', '60', '--qalpha', '90', '-y', '444', '-s', '2', '-a', 'tune=ssim', '-j', 'all'];
const WEBP = ['-quiet', '-q', '86', '-alpha_q', '92', '-m', '6'];
const sizes = [[844, 390], [375, 812], [1024, 768]];

(async () => {
  const browser = await chromium.launch({ executablePath: opt('exe') || process.env.EXE });
  const seen = [];
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(base);
    await page.waitForFunction(() => window.Kit && Kit.play && Kit.play.game && Kit.play.game.isRunning, null, { timeout: 60000 });
    await page.waitForTimeout(6000);
    await page.touchscreen.tap(w / 2, h / 2); await page.waitForTimeout(2500);
    const got = await page.evaluate(() => {
      const out = {};
      for (const [k, cv] of Object.entries(Kit.play.bakeOut)) out[k] = { w: cv.width, h: cv.height, png: cv.toDataURL('image/png') };
      return out;
    });
    if (errs.length) console.log(`${w}x${h} page errors:`, errs.slice(0, 3));
    seen.push(got);
    await ctx.close();
  }
  await browser.close();

  const out = path.join(gameDir, 'art', 'baked'); fs.mkdirSync(out, { recursive: true });
  const manifest = {}, skipped = [];
  let png = 0, avif = 0, webp = 0;
  for (const key of Object.keys(seen[0])) {
    const all = seen.map(s => s[key]);
    if (all.some(a => !a || a.w !== all[0].w || a.h !== all[0].h)) { skipped.push(key); continue; }
    const f = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const buf = Buffer.from(all[0].png.split(',')[1], 'base64');
    const tmp = path.join(out, f + '.png');
    const stamp = crypto.createHash('md5').update(buf).update(AVIF.join(' ') + WEBP.join(' ')).digest('hex');
    const mark = path.join(out, '.' + f + '.stamp');
    if (!(fs.existsSync(mark) && fs.readFileSync(mark, 'utf8') === stamp && fs.existsSync(path.join(out, f + '.avif')))) {
      fs.writeFileSync(tmp, buf);
      execFileSync('avifenc', [...AVIF, tmp, path.join(out, f + '.avif')], { stdio: 'pipe' });
      execFileSync('cwebp', [...WEBP, tmp, '-o', path.join(out, f + '.webp')], { stdio: 'pipe' });
      fs.unlinkSync(tmp); fs.writeFileSync(mark, stamp);
    }
    manifest[key] = { f: 'baked/' + f, w: all[0].w, h: all[0].h };
    png += buf.length; avif += fs.statSync(path.join(out, f + '.avif')).size; webp += fs.statSync(path.join(out, f + '.webp')).size;
  }
  // drop files of pictures no longer baked
  for (const name of fs.readdirSync(out)) {
    const stem = name.replace(/^\./, '').replace(/\.(avif|webp|stamp)$/, '');
    if (!Object.values(manifest).some(m => m.f === 'baked/' + stem)) fs.unlinkSync(path.join(out, name));
  }
  fs.writeFileSync(path.join(gameDir, 'art', 'baked.json'), JSON.stringify(manifest, null, 1) + '\n');
  const kb = n => Math.round(n / 1024) + ' KB';
  console.log(`${id}: baked ${Object.keys(manifest).length} pictures (PNG ${kb(png)} -> AVIF ${kb(avif)}, WebP copies ${kb(webp)}); painted on the phone (screen-sized): ${skipped.length ? skipped.join(', ') : 'none'}`);
})().catch(e => { console.error(e); process.exit(1); });
