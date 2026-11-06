/* .tests/verify-ui-qunxia-pacing.cjs — 标准玩家节奏试跑（册251）
 * 口径：36 旬 / 三种关注度策略，随机策略跑 20 个定种（20261001~20261020）+ mulberry32。
 *   闭门     = 每旬只吐纳，从不赴会（下界）
 *   随机巡游 = 60% 概率随机走 1 步，路过大事才旁观（低关注）
 *   标准     = 每旬 50% 概率关注红点、按最短路赶最近一场（验收带 6~10 桩）
 *   全神     = 每旬必赶最近一场（单旬 5 精力上限下的可达上界）
 * 只统计扩展 20 案（we_*）；游戏自带 6 案另计。赴会 = 旁观或入局；主导 = 战力够且入局并胜。
 * 本件只做度量，不改玩法数值。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').split(path.sep).join('/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

  await page.addInitScript(() => {
    if (localStorage.getItem('sanqian-state-v1')) return;
    localStorage.setItem('sanqian-state-v1', JSON.stringify({
      v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: { wuxia: {} },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    }));
  });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')');
  };

  try {
    await page.goto(url);
    await page.waitForURL(/games\/qunxia\/game\.html/, { timeout: 20000 });
    await page.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    await page.waitForTimeout(800);

    const res = await page.evaluate(() => {
      const INIT = JSON.parse(JSON.stringify(state));
      const noop = () => {};
      const saved = { saveGame, renderAll, showToast, addLog, playGuqinNote, openExclusiveEventModal, renderDrawer, suspendStreetRumor };
      saveGame = noop; renderAll = noop; showToast = noop; addLog = noop;
      playGuqinNote = noop; openExclusiveEventModal = noop; renderDrawer = noop;
      if (typeof suspendStreetRumor === 'function') suspendStreetRumor = noop;

      function reset() {
        state = JSON.parse(JSON.stringify(INIT));
        state.canonEventsTriggered = {};
        state.canonEventReports = [];
        state.crises = [];
      }
      function rng(seed) {
        return function () {
          seed |= 0; seed = seed + 0x6D2B79F5 | 0;
          let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }
      function bfs(from, to) {
        if (from === to) return [from];
        const q = [[from]], seen = { [from]: 1 };
        while (q.length) {
          const p = q.shift(), cur = p[p.length - 1];
          for (const n of getRegion(cur).neighbors) {
            if (seen[n]) continue;
            const np = p.concat([n]);
            if (n === to) return np;
            seen[n] = 1; q.push(np);
          }
        }
        return [to];
      }
      function joinC(c, joined, led) {
        if (!c || state.ap < 1 || joined.has(c.id)) return false;
        const power = calcPlayerCombatPower();
        const duel = power >= c.enemyPower;
        try { joinWorldCrisis(c.id, duel ? undefined : 'watch'); } catch (e) { return false; }
        if (duel && duelState) {
          duelState.enemyCurHp = 0;
          duelState.playerWins = 2;
          duelState.enemyWins = 0;
          try { finishDuel(); } catch (e) {}
          duelState = null;
          led.add(c.id);
        }
        joined.add(c.id);
        return true;
      }
      function run(policy, seed, p) {
        reset();
        const R = rng(seed);
        Math.random = R;
        const joined = new Set(), led = new Set();
        let maxCrises = 0;
        for (let t = 1; t <= 36; t++) {
          const crises = (state.crises || []).filter((c) => c.phase !== 'aftermath');
          maxCrises = Math.max(maxCrises, (state.crises || []).length);
          const pursue = policy === 'attentive' || (policy === 'standard' && R() < p);
          if (pursue && crises.length) {
            crises.sort((a, b) => bfs(state.currentRegion, a.region).length - bfs(state.currentRegion, b.region).length || a.remainTurns - b.remainTurns);
            const target = crises[0];
            const route = bfs(state.currentRegion, target.region);
            for (let i = 1; i < route.length && i <= 4 && state.ap >= 1; i++) commitTravelToRegion(route[i], false);
            const here = (state.crises || []).find((c) => c.phase !== 'aftermath' && c.region === state.currentRegion);
            if (here) joinC(here, joined, led);
          } else if (policy === 'wander' || policy === 'standard') {
            if (R() < 0.6 && state.ap >= 1) {
              const ns = getRegion(state.currentRegion).neighbors;
              commitTravelToRegion(ns[Math.floor(R() * ns.length)], false);
            }
            const here = (state.crises || []).find((c) => c.phase !== 'aftermath' && c.region === state.currentRegion);
            if (here) joinC(here, joined, led);
          }
          if (t < 36) advanceTime(1, true);
        }
        const active = (state.crises || []).filter((c) => /^we_/.test(c.id) && c.phase !== 'aftermath').length;
        const we = [...joined].filter((id) => /^we_/.test(id)).length;
        return {
          we,
          local: joined.size - we,
          led: led.size,
          missedWe: 20 - we - active,
          triggered: Object.keys(state.canonEventsTriggered || {}).filter((k) => /^we_/.test(k)).length,
          maxCrises,
          turn: state.turn,
          bytes: JSON.stringify(state).length
        };
      }
      function mean(rows, k) { return rows.reduce((x, y) => x + y[k], 0) / rows.length; }

      const power0 = calcPlayerCombatPower();
      const out = { power0, closed: run('closed', 1) };
      for (const pol of ['wander', 'standard', 'attentive']) {
        const rows = [];
        for (let s = 1; s <= 20; s++) rows.push(run(pol, 20261000 + s, 0.5));
        out[pol] = {
          we: +mean(rows, 'we').toFixed(1),
          minWe: Math.min(...rows.map((r) => r.we)),
          maxWe: Math.max(...rows.map((r) => r.we)),
          led: +mean(rows, 'led').toFixed(1),
          missedWe: +mean(rows, 'missedWe').toFixed(1),
          triggered: Math.min(...rows.map((r) => r.triggered)),
          maxCrises: Math.max(...rows.map((r) => r.maxCrises))
        };
      }

      saveGame = saved.saveGame; renderAll = saved.renderAll; showToast = saved.showToast; addLog = saved.addLog;
      playGuqinNote = saved.playGuqinNote; openExclusiveEventModal = saved.openExclusiveEventModal;
      renderDrawer = saved.renderDrawer; if (saved.suspendStreetRumor) suspendStreetRumor = saved.suspendStreetRumor;
      return out;
    });

    T(res.closed.we === 0 && res.closed.missedWe === 20,
      'PA0 闭门 36 旬（0 赴会 ⇔ 20 案全错过，世界不主动塞给玩家）', JSON.stringify(res.closed));
    T(res.wander.we <= 4 && res.wander.we >= 0,
      'PA1 随机巡游（低关注：扩展赴会均值 ≤4）', JSON.stringify(res.wander));
    T(res.standard.we >= 6 && res.standard.we <= 10,
      'PA2 标准玩家（半关注：扩展赴会均值落在 6~10 验收带）', JSON.stringify(res.standard));
    T(res.attentive.we >= 11 && res.attentive.we <= 16,
      'PA3 全神贯注（单旬 5 精力下的可达上界：11~16 桩）', JSON.stringify(res.attentive));
    T(res.closed.triggered === 20 && res.standard.triggered === 20 && res.attentive.maxCrises <= 8,
      'PA4 完整世界（20 案全触发 ⇔ 并发案 ≤8）', 'closed=' + res.closed.triggered + ' std=' + res.standard.triggered + ' maxCrises=' + res.attentive.maxCrises);
    T(res.closed.bytes < 60 * 1024 && errs.length === 0,
      'PA5 终态可存（<60KB）⇔ 零脚本错误', 'bytes=' + res.closed.bytes + ' errs=' + errs.slice(0, 2).join(' | '));

    console.log('读数：创角战力 ' + res.power0 + ' · 闭门 ' + res.closed.we + ' · 巡游 ' + res.wander.we +
      ' · 标准 ' + res.standard.we + '（' + res.standard.minWe + '~' + res.standard.maxWe + '） · 全神 ' + res.attentive.we +
      ' · 主导（标准） ' + res.standard.led);
  } catch (e) {
    console.log('FAIL PA_CRASH (' + (e && e.message || e) + ')');
    fail++;
  }

  console.log((fail === 0 ? 'QUNXIA_PACING_ALL_GREEN ' : 'QUNXIA_PACING_FAILED ') + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
