/* .tests/verify-ui-qunxia-host.cjs — 真实宿主约束走查（册250）
 * 宿主扩展页 CSP（x-hub src-tauri/src/ext_protocol.rs::build_content_csp）：
 *   frame-src 'none' —— 扩展页面里任何 iframe 都会被拦。
 * 本件用同样的 CSP + 注入式 window.xhub 起本地服务，验：主壳不嵌 iframe、导航到 game.html、
 * 内容桥 payload 生效、游戏页不写宿主存储（免与扩展主档互相覆盖）、零 CSP/脚本错误。
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
    try { localStorage.setItem('qunxia3d-engine', '0'); } catch (e) {} /* 册297：N89 修法——本篇测 classic 线宿主约束（备选线正典开关，册272 预埋） */
    const st = {
      v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: { wuxia: {} },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    };
    const mem = { 'sanqian-state-v1': st };
    try { localStorage.setItem('sanqian-state-v1', JSON.stringify(st)); } catch (e) {} /* 册297：N89 修法——主壳启动检测（view/index.html:11）读的是 localStorage，只种注入 mem 会被「双无档」截去门环 */
    const writes = [];
    window.__mirror = mem;
    window.__hostWrites = writes;
    window.xhub = {
      storage: {
        get: (k) => Promise.resolve(mem[k] === undefined ? null : (typeof mem[k] === 'string' ? mem[k] : JSON.stringify(mem[k]))), /* 册297：N89 修法——主壳按 JSON 串 parse 宿主存档，对象形态直返会 parse 失败判无档（真实宿主 storage_set 落的也是字符串） */
        set: (k, v) => { mem[k] = v; writes.push(k); return Promise.resolve(); },
        remove: (k) => { delete mem[k]; writes.push('rm:' + k); return Promise.resolve(); },
        clear: () => { for (const k in mem) delete mem[k]; writes.push('clear'); return Promise.resolve(); }
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
      gameWrites: (window.__hostWrites || []).filter(k => k.indexOf('jianghu_shanshui') === 0).length,
      stateIntact: !!(window.__mirror && window.__mirror['sanqian-state-v1'] && window.__mirror['sanqian-state-v1'].profile),
      turn: state.turn
    }));
    T(mirror.turn === 2 && mirror.saved > 1000 && mirror.gameWrites === 0 && mirror.stateIntact,
      'HX2 存档只落 localStorage ⇔ 游戏页零宿主写入 ⇔ 扩展主档仍在', JSON.stringify(mirror));

    /* 旧版把游戏档镜像在宿主存储里：本地缺档时只读迁回，且不写回宿主 */
    const legacy = await page.evaluate(() => {
      const raw = localStorage.getItem('jianghu_shanshui_hardcore_v7');
      localStorage.removeItem('jianghu_shanshui_hardcore_v7');
      return raw;
    });
    /* 宿主存储的 init 脚本每次导航都会重建，旧档要在 reload 前挂进下一轮 init */
    await page.addInitScript((raw) => { window.__mirror['jianghu_shanshui_hardcore_v7'] = raw; }, legacy);
    await page.reload();
    await page.waitForTimeout(1200);
    const migrated = await page.evaluate(() => ({
      turn: state.turn,
      saved: (localStorage.getItem('jianghu_shanshui_hardcore_v7') || '').length,
      gameWrites: (window.__hostWrites || []).filter(k => k.indexOf('jianghu_shanshui') === 0).length,
      stateIntact: !!(window.__mirror && window.__mirror['sanqian-state-v1'] && window.__mirror['sanqian-state-v1'].profile)
    }));
    T(legacy && legacy.length > 1000 && migrated.turn === 2 && migrated.saved > 1000 && migrated.gameWrites === 0 && migrated.stateIntact,
      'HX2b 旧宿主镜像只读迁回 localStorage（零写回 ⇔ 主档仍在）', JSON.stringify(migrated));

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
