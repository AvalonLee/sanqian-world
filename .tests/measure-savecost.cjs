/* .tests/measure-savecost.cjs — 按需单跑件（**不入 DoD**）：量存档层的落盘构造成本
 *
 * 立因：2026-10-09 存档治理批把展示流搬出主档后，需要回答「剥离 + 签名 + 两次写有没有拖慢 tick」——
 *   当时以仓外一次性脚本取证（登记为 `savePayload 单次 0.40ms / SQ.save 单次 1.19ms`，600 次真奇遇结算胖档）。
 *   登记完就消失的读数下次无从复现，故同批收编为本件。**它不是判据**：不设阈值、不进 run-dod，
 *   只在改存档层后手工跑一次、把读数写进 FACTS / 任务清单那一行。
 * 用法：node .tests/measure-savecost.cjs [次数]（缺省 200）
 * 口径：跑在有桥 + `d1:` 压缩分支（`sandbox.cjs` `bridge:true`）= 生产同一条路径；
 *   时钟一次性取定（sim-playthrough 同款），故同一份代码两次跑读数应逐次相同。
 */
'use strict';
const path = require('path');
const { load } = require('./sandbox.cjs');

const N = Number(process.argv[2] || 200);
const BASE_NOW = 1760000000000;
let clk = 0;
Date.now = () => BASE_NOW + (clk += 1000);          /* 沙箱与本上下文共享同一 Date 引用 */

(async function main() {
  const { SQ } = load([], { bridge: true });
  let seed = 20261009;
  global.Math.random = function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pack = SQ.Worlds.xiuxian.pack, D = SQ.XDATA;
  const st = SQ.defaultState();
  st.profile = { name: '测成本', talents: [], legacyTalents: [], worldId: 'xiuxian', worldName: 'x', createdAt: Date.now(), alignBias: 'neutral', gender: 'male', race: 'human' };
  st.worlds.xiuxian = pack.initialState();
  const ws = st.worlds.xiuxian;
  ws.realm = 7;
  const ids = SQ.Events.allIds(pack);
  const prof = st.profile;
  function mods() { pack.recalcDerived(ws, prof); return SQ.Mods.collect(prof, ws, pack, D); }

  /* 造一只「玩了很久」的档：600 次真奇遇结算（走生产 writer，日志与叙事流都填满） */
  for (let i = 0; i < 600; i++) {
    const ev = SQ.Events.findById(pack, ids[i % ids.length]);
    if (!ev || !ev.choices) continue;
    const keys = Object.keys(ev.choices);
    SQ.Events.resolveBranch(ws, pack, D, mods(), ev.id, keys[Math.floor(Math.random() * keys.length)],
      Date.now(), { log: (cat, txt) => SQ.Log.push(ws, cat, txt), profile: prof });
  }
  for (let i = 0; i < 20; i++) await SQ.save(st);        /* 预热（含首写签名缓存建立） */

  let stored = 0;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) stored = (await SQ.savePayload(st)).stored;
  const msPayload = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) await SQ.save(st);
  const msSave = Number(process.hrtime.bigint() - t1) / 1e6;

  console.log('胖档：log=' + ws.log.length + ' 条 · feed=' + ws.eventHistory.feed.length +
    ' 条 · 主档落盘 ' + stored + 'B');
  console.log('savePayload ×' + N + ' = ' + msPayload.toFixed(1) + 'ms → 单次 ' + (msPayload / N).toFixed(2) + 'ms（构造，不含 IO）');
  console.log('SQ.save     ×' + N + ' = ' + msSave.toFixed(1) + 'ms → 单次 ' + (msSave / N).toFixed(2) + 'ms（含主档 + 侧档两次写；侧档内容未变即跳过）');
  console.log('MEASURE_SAVECOST_DONE');
})().catch((e) => { console.log('MEASURE_SAVECOST_CRASH ' + (e && e.stack || e)); process.exit(2); });
