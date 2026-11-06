/* .tests/verify-ui-qunxia-host.cjs — 真实宿主约束走查（册250）
 * 宿主扩展页 CSP（x-hub src-tauri/src/ext_protocol.rs::build_content_csp）：
 *   frame-src 'none' —— 扩展页面里任何 iframe 都会被拦。
 * 本件用同样的 CSP + 注入式 window.xhub 起本地服务，验：主壳不嵌 iframe、导航到 game.html、
 * 内容桥 payload 生效、宿主存储镜像写入、零 CSP/脚本错误。
 */
'use strict';
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const CSP = "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; " +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; " +
  "connect-src 'self'; media-src 'self' blob:; frame-src 'none'; object-src 'none'; " +
  "base-uri 'self'; form-action 'none'; worker-src 'self' blob:";
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

(async () => {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    if (rel === 'favicon.ico') { res.writeHead(204); res.end(); return; }
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(ROOT) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Content-Security-Policy': CSP });
    fs.createReadStream(full).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/view/index.html';

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  /* 宿主桥注入的最小等价物：window.xhub.storage 内存镜像（并预置一份已入世的存档） */
  await page.addInitScript(() => {
    const st = {
      v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: { wuxia: {} },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    };
    const mem = { 'sanqian-state-v1': st };
    window.__mirror = mem;
    window.xhub = {
      storage: {
        get: (k) => Promise.resolve(mem[k] === undefined ? null : mem[k]),
        set: (k, v) => { mem[k] = v; return Promise.resolve(); },
        remove: (k) => { delete mem[k]; return Promise.resolve(); },
        clear: () => { for (const k in mem) delete mem[k]; return Promise.resolve(); }
      }
    };
  });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')');
  };

  try {
    await page.goto(url);
    await page.waitForURL(/games\/qunxia\/game\.html/, { timeout: 30000 });
    await page.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    const read = await page.evaluate(() => ({
      turn: state.turn,
      frame: !!document.getElementById('qunxia-frame'),
      arts: Object.keys(MARTIAL_DB).length,
      jiuyin: MARTIAL_DB.yg_jiuyin && MARTIAL_DB.yg_jiuyin.name,
      payload: (localStorage.getItem('qunxia-payload-v1') || '').length,
      bridge: !!(window.xhub && window.xhub.storage)
    }));
    T(!read.frame && read.payload > 1000, 'HX0 CSP 下主壳不嵌 iframe ⇔ 导航到 game.html ⇔ payload 已落同源存储', 'payload=' + read.payload + ' frame=' + read.frame);
    T(read.bridge && read.arts > 100 && read.jiuyin === '九阴真经', 'HX1 宿主桥在位 ⇔ 内容桥生效（九阴真经可见）', 'arts=' + read.arts + ' bridge=' + read.bridge);

    await page.evaluate(() => { meditateRest(); });
    await page.waitForTimeout(800);
    const mirror = await page.evaluate(() => ({
      saved: (localStorage.getItem('jianghu_shanshui_hardcore_v7') || '').length,
      mirrored: !!(window.__mirror && window.__mirror['jianghu_shanshui_hardcore_v7']),
      turn: state.turn
    }));
    T(mirror.turn === 2 && mirror.saved > 1000 && mirror.mirrored, 'HX2 存档双写（localStorage 落档 ⇔ 宿主存储镜像写入）', JSON.stringify(mirror));

    T(errs.length === 0, 'HX3 零 CSP / 脚本错误', errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('FAIL HX_CRASH (' + (e && e.message || e) + ')');
    fail++;
  }

  console.log((fail === 0 ? 'QUNXIA_HOST_CSP_ALL_GREEN ' : 'QUNXIA_HOST_CSP_FAILED ') + pass + '/' + (pass + fail));
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
})();
