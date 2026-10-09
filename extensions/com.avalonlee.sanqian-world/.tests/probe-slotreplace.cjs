/* .tests/probe-slotreplace.cjs — C1 功法满槽「原位替换」引擎链探针（执行取证，非静态）
 * 判据源：assets/systems/arts.js 的 slot(ws, pack, D, id, replaceId) 原位替换支路 +
 *        「主修 = 修习槽第 1 位」（引擎卷 §4.2 / Arts.mainArt()）。
 * 用法：node .tests/probe-slotreplace.cjs
 * 出口码：全绿 0，任一断言红 1。
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;

let pass = 0, fail = 0;
function T(ok, name, detail) {
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
}

/* 造一个「满槽 + 手上有未上槽功法」的世界态 */
function mkWorld() {
  const ws = pack.normalize({});
  ws.realm = 5; ws.stones = 5000; ws.qi = 1000; ws.total = 1000;
  (D.ATTRS || []).forEach(function (a) { ws.attrs[a] = 20; });
  const am = pack.artsMap();
  const cands = Object.keys(am).filter(function (id) { return SQ.Arts.canLearn(ws, pack, D, id); });
  const cap = D.ARTS_SLOTS;
  if (cands.length < cap + 1) { console.log('候选功法不足（' + cands.length + '）无法造满槽态'); process.exit(2); }
  ws.artsKnown = cands.slice(0, cap + 1).slice();
  ws.artsSlots = ws.artsKnown.slice(0, cap).slice();
  ws.artsKnown.forEach(function (id) { ws.artsLevels[id] = 3; });
  return { ws: ws, newId: ws.artsKnown[cap], cap: cap };
}

/* ── 1) 引擎支路本体 ── */
{
  const m = mkWorld();
  const ws = m.ws, newId = m.newId, displaced = ws.artsSlots[0];
  const before = ws.artsSlots.slice();
  const rNoRep = SQ.Arts.slot(ws, pack, D, newId);            /* 不带 replaceId：满槽必拒 */
  T(rNoRep === false, 'E1 满槽且不报替换目标 → slot() 拒绝（不入槽）', 'ret=' + rNoRep + ' n=' + ws.artsSlots.length);
  T(ws.artsSlots.indexOf(newId) < 0, 'E1b 被拒后新功法确实未上槽');

  const rOk = SQ.Arts.slot(ws, pack, D, newId, displaced);     /* 带 replaceId：原位覆盖 */
  T(rOk === true, 'E2 slot(id, replaceId) 返回 true', 'ret=' + rOk);
  T(ws.artsSlots[0] === newId, 'E2b 替换落在**第 1 位**（原位，不是队尾）', 'slot0=' + ws.artsSlots[0]);
  T(ws.artsSlots.length === m.cap, 'E2c 槽数不变（不扩槽、不甩尾）', 'n=' + ws.artsSlots.length);
  T(ws.artsSlots.slice(1).join(',') === before.slice(1).join(','),
    'E2d 其余槽序原样保留（2~6 位零位移）', 'after=' + ws.artsSlots.slice(1).join(','));
  T(ws.artsSlots.indexOf(displaced) < 0, 'E2e 被顶下的功法确实离槽', 'was=' + displaced);
  T(ws.artsKnown.indexOf(displaced) >= 0, 'E2f 被顶下的功法仍在已学列表（回「未装备」零丢失）',
    'known=' + ws.artsKnown.length);
  T((ws.artsLevels[displaced] || 0) === 3, 'E2g 被顶下的功法等级不随替换清零', 'lv=' + ws.artsLevels[displaced]);
  T(SQ.Arts.mainArt(ws) === newId, 'E2h 主修（槽第 1 位）= 新功法——主修语义保住', 'main=' + SQ.Arts.mainArt(ws));
  T(SQ.Arts.slot(ws, pack, D, newId, 'nosuchart') === false &&
    SQ.Arts.slot(ws, pack, D, displaced, 'nosuchslot') === false,
    'E2i 替换目标不存在 / 不在槽内 → 一律拒（脏 replaceId 不误伤）');
}

/* ── 2) 反向对照：旧 UI 唯一可行路「卸下再装」= 主修语义静默丢失 ── */
{
  const m = mkWorld();
  const ws = m.ws, newId = m.newId, displaced = ws.artsSlots[0];
  SQ.Arts.unslot(ws, displaced);
  const rTail = SQ.Arts.slot(ws, pack, D, newId);
  T(rTail === true, 'W1 卸下后重装：slot() 成功', 'ret=' + rTail);
  T(ws.artsSlots.indexOf(newId) === m.cap - 1,
    'W1b 新功法落到队列**尾部**（旧 UI 死链逼玩家走的正是这条路）', 'idx=' + ws.artsSlots.indexOf(newId));
  T(SQ.Arts.mainArt(ws) !== newId,
    'W1c 主修位换成了旁人（不是玩家点定的那部）——语义静默丢失',
    'main=' + SQ.Arts.mainArt(ws) + ' 玩家意图=' + newId);
}

/* ── 3) Actions 通道（view 的 slotReplace 按钮实际走的那一口，经 mutate 落盘）── */
(async function () {
  const m = mkWorld();
  const ref = {};
  const displaced = m.ws.artsSlots[0];
  await SQ.mutate(ref, function (s) {
    s.profile = { name: '探针', worldId: 'xiuxian', worldName: '罗云州', createdAt: Date.now(), talents: [], alignBias: 'neutral' };
    s.worlds.xiuxian = m.ws;
  });
  const w0 = ref.worlds.xiuxian;
  T(w0.artsSlots.length === m.cap && w0.artsSlots.indexOf(displaced) === 0,
    'S1 建档后满槽态成立（第 1 位 = ' + displaced + '）', 'slots=' + w0.artsSlots.join(','));

  await SQ.Actions.slotArt(ref, m.newId, displaced);   /* = 点「替换」按钮的 handler 主体 */
  const ws2 = ref.worlds.xiuxian;
  T(ws2.artsSlots[0] === m.newId, 'A1 Actions.slotArt(ref, id, replaceId) 落点仍是第 1 位',
    'slot0=' + ws2.artsSlots[0]);
  T(ws2.artsSlots.length === m.cap && ws2.artsKnown.indexOf(displaced) >= 0 &&
    ws2.artsSlots.indexOf(displaced) < 0,
    'A1b Actions 通道零副作用：槽数不变、被顶者回未装备且不脱离已学',
    'known=' + ws2.artsKnown.length + ' slots=' + ws2.artsSlots.join(','));
  T(SQ.Arts.mainArt(ws2) === m.newId, 'A1c 主修经 Actions 通道依然 = 第 1 位', 'main=' + SQ.Arts.mainArt(ws2));

  /* 满槽且不报目标：Actions 通道也必须拒（正是 view 要转成「抉择态」的那种情形） */
  const other = ws2.artsKnown.filter(function (x) { return ws2.artsSlots.indexOf(x) < 0; })[0];
  await SQ.Actions.slotArt(ref, other);
  T(ref.worlds.xiuxian.artsSlots.indexOf(other) < 0 && ref.worlds.xiuxian.artsSlots.length === m.cap,
    'A2 满槽无 replaceId 时 Actions 通道不入槽（交给 UI 抉择态）', 'slots=' + ref.worlds.xiuxian.artsSlots.join(','));

  console.log(fail === 0 ? 'PROBE_SLOTREPLACE_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'PROBE_SLOTREPLACE_FAILED ' + fail + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
