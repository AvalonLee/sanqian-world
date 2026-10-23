/* .tests/verify-ui-readouts.cjs — 屏上读数覆盖补强（第册一百三十三批 2026-10-22 · N51①/③ + N29①）
 * 立因（N51）：机制都由冒烟直判证过（#306 进度加速 / #307 认主计时 / #308 切磋冷却），
 *   但「屏上那一行」没人在读 —— 法宝卡认主提示是**双占位**（每 {n} 次渡劫或每 {h} 小时），
 *   视图少传一枚就上屏 `{h}`；而现 fixture 的 `treasures.owned` 与 `prodigies` 都是空的 ⇒ 扫不到。
 * N29①：角色浮层的宽度与称号墙排布没有任何自动化回归锚（把 480px 改回 360px，全仓不会有红）。
 * 判据一律回读页内真值（SQ.t 现算 + DOM 几何），不硬编码中文文案，也不钉具体人名。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { load } = require('./sandbox.cjs');

const T0 = 1790000000000;
const S = load([], { quiet: true }).SQ;
const PACK = S.Worlds.xiuxian.pack, D = PACK.data;
const XIAN = PACK.treasures.LIST.filter((t) => t.kind === 'xian')[0];

function buildSave() {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-save.json'), 'utf8'));
  s.profile.createdAt = T0;
  Object.values(s.worlds).forEach((w) => { w.lastSave = T0; w.lastOffline = null; w.pendingChoice = null; w.log = []; });
  const w = s.worlds.xiuxian;
  w.realm = 5; w.zone = 0; w.qi = 1e6; w.stones = 60000;
  w.rumors = []; w.prodMarks = {}; w.prodigies = [];
  S.Treasures.gain(w, PACK, D, XIAN.id, function () {});                 /* N51① 前提：真持有一件先天法宝 */
  S.Prodigy.rollForNewLife(w, PACK, D, { unlocks: {}, stats: {} }, T0);   /* N51③ 前提：天骄页有出场者 */
  /* N29① 前提：角色浮层的天赋卡 ≥3 张（否则「列数 === 3」空集恒真） */
  const pool = ((S.TALENTS.xiuxian || {}).positive || []).slice(0, 3);
  s.profile.talents = pool.map((x) => ({ id: x.id }));
  return s;
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };
  const save = buildSave();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((v) => { localStorage.setItem('sanqian-state-v1', v); }, JSON.stringify(save));
  const page = await ctx.newPage();
  /* 墙钟冻在种档时刻（verify-ui-jianghu 同法）：不冻会因「存档时间 vs 真实现在」差出离线浮层盖住整页 */
  await page.clock.install({ time: new Date(T0) });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });

  const braces = (t) => ((t || '').match(/\{[a-zA-Z]/g) || []).length;

  /* ── N51① 法宝页：认主提示行非空 ＋ 整页零花括号残留 ── */
  await page.click('#m-tabbar button[data-v="treasure"]');
  await page.waitForTimeout(500);
  const r1 = await page.evaluate((xid) => {
    const root = document.querySelector('#tab-treasure');
    const hint = Array.prototype.slice.call(document.querySelectorAll('#tab-treasure .trd.hint'))
      .map((e) => (e.textContent || '').trim()).filter(Boolean);
    const hasXian = (root ? root.textContent : '').indexOf(SQ.t('treasure.' + xid + '.name', null, 'xiuxian')) >= 0;
    return { hint: hint, hasXian: hasXian, txt: root ? root.textContent : '' };
  }, XIAN.id);
  T(r1.hasXian && r1.hint.length >= 1 && braces(r1.txt) === 0,
    'RD1 法宝页认主提示行非空 + 零花括号残留（真持有一件先天法宝）',
    'xian在页=' + r1.hasXian + ' 提示行=' + JSON.stringify(r1.hint.slice(0, 2)) + ' 花括号=' + braces(r1.txt));

  /* ── N51③ 天骄页：关键行非空 ＋ 零花括号残留 ── */
  await page.click('#m-tabbar button[data-v="prodigy"]');
  await page.waitForTimeout(500);
  const r2 = await page.evaluate(() => {
    const root = document.querySelector('#tab-prodigy');
    const rows = document.querySelectorAll('#tab-prodigy .lrow');
    return { txt: root ? root.textContent : '', rows: rows.length };
  });
  T(r2.txt.trim().length >= 20 && r2.rows >= 1 && braces(r2.txt) === 0,
    'RD2 天骄页关键行非空 + 零花括号残留',
    '行数=' + r2.rows + ' 字数=' + r2.txt.trim().length + ' 花括号=' + braces(r2.txt));

  /* ── N29① 角色浮层：宽度回归锚（≥512px 时天赋卡列数 === 3；先证卡数 ≥3 再判列数，防空集恒真） ── */
  await page.click('#m-who');
  await page.waitForTimeout(500);
  const r3 = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#mr-talents .tcard'));
    const xs = Array.from(new Set(cards.map((e) => Math.round(e.getBoundingClientRect().x)))).sort((a, b) => a - b);
    const el = document.querySelector('#modal-role');
    return { n: cards.length, xs: xs, vis: !!(el && !el.classList.contains('hide')) };
  });
  T(r3.vis && r3.n >= 3 && r3.xs.length === 3,
    'RD3 角色浮层宽度回归锚（≥512px：天赋卡 3 列；先证卡数 ≥3 再判列数）',
    '可见=' + r3.vis + ' 卡数=' + r3.n + ' 列x=' + JSON.stringify(r3.xs));

  T(errs.length === 0, 'RD0 全程零 pageerror / 零 console error', errs.join(' | ').slice(0, 200) || 'clean');

  console.log(fail === 0 ? 'UI_READOUTS_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_READOUTS_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
