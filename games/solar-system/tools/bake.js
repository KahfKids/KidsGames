/* Solar System: bake the game's pictures.
   NODE_PATH=<a folder with playwright in node_modules> node games/solar-system/tools/bake.js [--exe=<chromium>] [--tmp=<dir>]
   The game's pictures were once made in code at every start (procedural surfaces, a painted sky, a rock belt). They
   are now made here, once, from the same procedural code (tools/bake/), and the game loads them as picture files:
     art/tex-<id>.<ext>   the surface of each world (a texture that wraps sideways)
     art/mask-earth.webp  Earth's clouds (red), oceans (green) and city lights (blue): data, so lossless
     art/sky.<ext> sky-faint.<ext> sky-bright.<ext>   the nebula panorama and two star layers
     art/belt.<ext>      the asteroid belt (with alpha)
   Needs Playwright (any checkout), `cwebp` and `avifenc` (Homebrew). Writes WebP and AVIF; game/art.js says which it loads. */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const arg = n => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a && a.split('=')[1]; };
const root = path.join(__dirname, '..'), out = path.join(root, 'art'), tmp = arg('tmp') || fs.mkdtempSync(path.join(os.tmpdir(), 'solar-bake-'));
fs.mkdirSync(out, { recursive: true });
const run = (cmd, a) => { const r = cp.spawnSync(cmd, a, { encoding: 'utf8' }); if (r.status) throw new Error(cmd + ' failed: ' + (r.stderr || r.stdout).slice(0, 300)); };
const sizes = {};
function save(name, dataUrl, opt) {
  const png = path.join(tmp, name + '.png');
  fs.writeFileSync(png, Buffer.from(dataUrl.split(',')[1], 'base64'));
  opt = opt || {};
  run('cwebp', opt.lossless ? ['-quiet', '-lossless', '-z', '9', png, '-o', path.join(out, name + '.webp')] : ['-quiet', '-q', String(opt.q || 90), '-alpha_q', '95', '-m', '6', png, '-o', path.join(out, name + '.webp')]);
  if (!opt.lossless) run('avifenc', ['-q', String(opt.aq || 70), '--qalpha', '90', '-y', '444', '-s', '2', '-j', 'all', png, path.join(out, name + '.avif')]);
  sizes[name] = [fs.statSync(path.join(out, name + '.webp')).size, fs.existsSync(path.join(out, name + '.avif')) ? fs.statSync(path.join(out, name + '.avif')).size : 0];
}
(async () => {
  const browser = await chromium.launch({ executablePath: arg('exe') || undefined });
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  for (const f of ['render.js', 'bodies.js', 'page.js']) await page.addScriptTag({ path: path.join(__dirname, 'bake', f) });
  const ids = await page.evaluate(() => window.BAKE.ids);
  for (const id of ids) {
    const s = await page.evaluate(id => window.BAKE.surface(id), id);
    save('tex-' + id, s.color, { q: 92, aq: 75 });
    if (s.mask) save('mask-' + id, s.mask, { lossless: true });
  }
  const sky = await page.evaluate(() => window.BAKE.sky());
  save('sky', sky.pano, { q: 92, aq: 75 }); save('sky-faint', sky.faint, { q: 92, aq: 80 }); save('sky-bright', sky.bright, { q: 92, aq: 80 });
  save('belt', await page.evaluate(() => window.BAKE.belt()), { q: 92, aq: 80 });
  await browser.close();
  let tw = 0, ta = 0;
  Object.keys(sizes).forEach(k => { tw += sizes[k][0]; ta += sizes[k][1]; console.log(k.padEnd(14), String(sizes[k][0]).padStart(8), String(sizes[k][1]).padStart(8)); });
  console.log('total webp', tw, 'avif', ta);
})().catch(e => { console.error(e); process.exit(1); });
