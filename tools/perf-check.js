/* Frame-time check for a Phaser game started by Kit.play (performance-optimization skill: measure, never guess).
   NODE_PATH=<a folder with playwright in node_modules> node tools/perf-check.js <url> [cpu=6] [WxH=844x390] [secs=6]
   e.g. NODE_PATH=../web/api/node_modules node tools/perf-check.js "http://127.0.0.1:8765/KidsGames/games/helping-home/?nomaker&nosw"
   --mute starts with the game's sound switched off (what sound itself costs: compare with and without).
   This repo has no package.json (rule: no build step), so Playwright comes from any other checkout; `--exe` points it at a
   Chromium binary when its own download is missing.
   Throttles the CPU (6x stands in for a budget Android phone), taps once to unlock sound, then measures:
     idle  the page left alone for `secs`;   drag  six finger drags across the screen (the camera and every move handler).
   For each: the game's own work per frame (Phaser's prestep to postrender, in ms: avg, p95, max), frames over 30 ms,
   draw calls per frame, texture uploads (count, longest, total ms), and where the browser offers a GPU timer, the
   graphics chip's own ms per frame (gpu, gpuP95: this machine's chip, so compare builds, not phones). Exits 1 if any page error or p95 over 8 ms.
   It cannot measure the phone's GPU: the desktop GPU draws here. Run it on every change, then on a real phone. */
'use strict';
const { chromium } = require('playwright');
const args = process.argv.slice(2), opt = n => { const a = args.find(x => x.startsWith('--' + n + '=')); return a && a.split('=')[1]; };
const [url, cpu = '6', size = '844x390', secs = '6'] = args.filter(a => !a.startsWith('--'));
const [W, H] = size.split('x').map(Number);
(async () => {
  const browser = await chromium.launch({ executablePath: opt('exe'), args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (args.includes('--mute')) await ctx.addInitScript(() => { try { localStorage.setItem('kahf-sound-muted', '1'); } catch (e) {} });      // --mute: the game's sound off, to see what sound costs
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpu });
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.Kit && Kit.play && Kit.play.game && Kit.play.game.isRunning, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  const ready = Date.now() - t0;
  await page.touchscreen.tap(W / 2, H / 2); await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = Kit.play.game, gl = g.renderer.gl, st = window.PC = { on: false, ms: [], dc: 0, up: [], t: 0 };
    ['drawArrays', 'drawElements'].forEach(n => { const f = gl[n].bind(gl); gl[n] = function () { if (st.on) st.dc++; return f.apply(null, arguments); }; });
    const ti = gl.texImage2D.bind(gl); gl.texImage2D = function () { const a = performance.now(), r = ti.apply(null, arguments); if (st.on) st.up.push(performance.now() - a); return r; };
    g.events.on('prestep', () => { st.t = performance.now(); });
    g.events.on('postrender', () => { if (st.on) st.ms.push(performance.now() - st.t); });
    // the graphics chip's own time per frame (EXT_disjoint_timer_query, from Phaser's prerender to postrender), when offered
    const tq = gl.getExtension('EXT_disjoint_timer_query'); st.gpu = []; st.q = []; st.hasGpu = !!tq;
    if (tq) {
      g.events.on('prerender', () => { if (st.on && !st.cur) { st.cur = tq.createQueryEXT(); tq.beginQueryEXT(tq.TIME_ELAPSED_EXT, st.cur); } });
      g.events.on('postrender', () => {
        if (st.cur) { tq.endQueryEXT(tq.TIME_ELAPSED_EXT); st.q.push(st.cur); st.cur = null; }
        st.q = st.q.filter(q => { if (!tq.getQueryObjectEXT(q, tq.QUERY_RESULT_AVAILABLE_EXT)) return true; if (!gl.getParameter(tq.GPU_DISJOINT_EXT)) st.gpu.push(tq.getQueryObjectEXT(q, tq.QUERY_RESULT_EXT) / 1e6); tq.deleteQueryEXT(q); return false; });
      });
    }
  });
  const run = async (name, act) => {
    await page.evaluate(() => { PC.ms = []; PC.dc = 0; PC.up = []; PC.gpu = []; PC.on = true; });
    await act();
    const r = await page.evaluate(async () => { PC.on = false; await new Promise(f => setTimeout(f, 300)); return { ms: PC.ms, dc: PC.dc, up: PC.up, gpu: PC.gpu }; });
    const s = r.ms.slice().sort((a, b) => a - b), n = s.length || 1, q = p => +(s[Math.floor(n * p)] || 0).toFixed(2);
    return { name, frames: s.length, avg: +(s.reduce((a, b) => a + b, 0) / n).toFixed(2), p95: q(0.95), max: q(0.999), over30: s.filter(v => v > 30).length,
      draws: Math.round(r.dc / n), gpu: r.gpu.length ? +(r.gpu.reduce((a, b) => a + b, 0) / r.gpu.length).toFixed(3) : null, gpuP95: r.gpu.length ? +r.gpu.slice().sort((a, b) => a - b)[Math.floor(r.gpu.length * 0.95)].toFixed(3) : null, uploads: r.up.length, uploadMax: +Math.max(0, ...r.up).toFixed(1), uploadSum: +r.up.reduce((a, b) => a + b, 0).toFixed(1) };
  };
  const out = [await run('idle', () => page.waitForTimeout(+secs * 1000)),
    await run('drag', async () => { for (let k = 0; k < 6; k++) { await page.mouse.move(W * 0.8, H / 2); await page.mouse.down(); for (let i = 0; i < 40; i++) await page.mouse.move(W * 0.8 - i * W / 60, H / 2 + Math.sin(i / 6) * H / 6); await page.mouse.up(); } })];
  const g = await page.evaluate(() => ({ canvas: Kit.play.game.canvas.width + 'x' + Kit.play.game.canvas.height, renderer: (() => { const gl = Kit.play.game.renderer.gl, d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl'; })() }));
  console.log(JSON.stringify({ url, cpu: +cpu, viewport: size + '@2', canvas: g.canvas, gpu: g.renderer, readyMs: ready, runs: out, errors }, null, 1));
  await browser.close();
  process.exit(errors.length || out.some(r => r.p95 > 8) ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
