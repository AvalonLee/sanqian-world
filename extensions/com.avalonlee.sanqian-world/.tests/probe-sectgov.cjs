/* .tests/probe-sectgov.cjs — 自立宗门「完全开放」引擎探针（B16-ad，无浏览器）
 *
 * 锁：改名 / 改门规 / 门规宣言 / 税率 / 任免（执事·长老各限一 + 加成）/ 逐出 / 单方停战 / 解散 / 税月结。
 * 用法：node .tests/probe-sectgov.cjs     末行 PROBE_SECTGOV_ALL_GREEN n/n 或 PROBE_SECTGOV_FAILED k
 */
'use strict';
const { load } = require('./sandbox.cjs');
const { SQ } = load([]);
const D = SQ.XDATA, pack = SQ.Worlds.xiuxian.pack;
const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail == null ? '' : String(detail) });

function mkSect() {
  const raw = {
    name: '青云门', gate: (D.SECT.GATES || [])[0], align: 'neutral', motto: '',
    tax: 0, everDefected: false,
    fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 },
    disciples: [
      { id: 'd1', nm: [0, 0], tier: 'mid', realm: 2, prog: 0, inv: 0, perk: ((D.SECT.DISPATCH || {}).fields || ['qiRate'])[0], tianjiao: false },
      { id: 'd2', nm: [1, 1], tier: 'fine', realm: 3, prog: 0, inv: 0, perk: ((D.SECT.DISPATCH || {}).fields || ['qiRate'])[0], tianjiao: false }
    ],
    seq: 2, warRecord: { wins: 0, loses: 0 }, foundAt: Date.now()
  };
  const ws = pack.initialState();
  ws.sect = SQ.Sect.normalize(raw, D);
  ws.factionId = 'sect';
  ws.factions = (ws.factions || []).concat([{ id: 'sect', name: '青云门', align: 'neutral', perk: { field: 'qiRate', v: 0 }, rel: {}, fixed: false }]);
  ws.stones = 100000;
  pack.recalcDerived(ws, { worldId: 'xiuxian', talents: [] });
  return ws;
}

/* 1 改名 */
{
  const ws = mkSect();
  const r = SQ.Sect.rename(ws, D, '  凌霄阁  ');
  ok('V1 改名：去空白 + 截到 NAME_MAX', r.ok && ws.sect.name === '凌霄阁' && SQ.Sect.rename(ws, D, '    ').ok === false, JSON.stringify(r));
}
/* 2 改门规 */
{
  const ws = mkSect();
  const g2 = (D.SECT.GATES || [])[1] || (D.SECT.GATES || [])[0];
  const r = SQ.Sect.setRule(ws, D, g2, 'evil');
  ok('V2 改门规：gate/align 同时重定，非法值拒绝', r.ok && ws.sect.gate === g2 && ws.sect.align === 'evil' && SQ.Sect.setRule(ws, D, 'nope', 'evil').ok === false, JSON.stringify(r));
}
/* 3 门规宣言 */
{
  const ws = mkSect();
  const long = '一'.repeat(40);
  const r = SQ.Sect.setMotto(ws, D, long);
  ok('V3 门规宣言：纯文案，按 MOTTO_MAX 截断', r.ok && ws.sect.motto.length === (D.SECT.MOTTO_MAX || 24), 'len=' + ws.sect.motto.length);
}
/* 4 税率档位 */
{
  const ws = mkSect();
  ok('V4 税率只收 0~30 步长 5',
    SQ.Sect.setTax(ws, D, 10).ok && ws.sect.tax === 10 && SQ.Sect.setTax(ws, D, 33).ok === false,
    'tax=' + ws.sect.tax);
}
/* 5 任免 + 加成（执事声望 / 长老战力） */
{
  const ws = mkSect();
  const rep0 = SQ.Sect.sectRep(ws, D), pw0 = SQ.Sect.sectPower(ws, pack, D, SQ.Mods.collect({ worldId: 'xiuxian', talents: [] }, ws, pack, D));
  SQ.Sect.appoint(ws, D, 'd1', 'steward');
  const rep1 = SQ.Sect.sectRep(ws, D);
  SQ.Sect.appoint(ws, D, 'd2', 'elder');
  const pw1 = SQ.Sect.sectPower(ws, pack, D, SQ.Mods.collect({ worldId: 'xiuxian', talents: [] }, ws, pack, D));
  SQ.Sect.appoint(ws, D, 'd2', 'steward');   /* 执事唯一：d1 的执事应被撤 */
  const d1 = SQ.Sect.byDiscId(ws, 'd1'), d2 = SQ.Sect.byDiscId(ws, 'd2');
  ok('V5 任免：执事 +10% 声望、长老 +10% 战力；同类职位唯一',
    rep1 > rep0 && pw1 > pw0 && !d1.post && d2.post === 'steward',
    JSON.stringify({ rep0: rep0, rep1: rep1, pw0: Math.round(pw0), pw1: Math.round(pw1), d1: d1.post, d2: d2.post }));
}
/* 6 逐出 */
{
  const ws = mkSect();
  const r = SQ.Sect.expel(ws, D, 'd1');
  ok('V6 逐出：弟子离门，人数 −1', r.ok && ws.sect.disciples.length === 1 && !SQ.Sect.byDiscId(ws, 'd1'), JSON.stringify(r));
}
/* 7 单方停战 */
{
  const ws = mkSect();
  ws.factionWar = { aId: 'sect', bId: (ws.factions.find((f) => f.id !== 'sect') || {}).id || 'x', until: Date.now() + 3600000, joined: 'in' };
  const cost = SQ.Sect.peaceCost(ws, D);
  const before = ws.stones;
  const r = SQ.Sect.makePeace(ws, pack, D, Date.now(), function () {});
  ok('V7 单方停战：按声望计价、真扣灵石、战争立即结束',
    r.ok && !ws.factionWar && ws.stones === before - cost && cost >= 1000,
    JSON.stringify({ cost: cost, left: ws.stones, war: ws.factionWar }));
}
/* 8 解散 */
{
  const ws = mkSect();
  const r = SQ.Sect.disband(ws, pack, D, Date.now(), function () {});
  ok('V8 解散：宗门/势力位/势力池条目一并清空',
    r.ok && !ws.sect && !ws.factionId && !(ws.factions || []).some((f) => f.id === 'sect'),
    JSON.stringify({ sect: ws.sect, fid: ws.factionId, n: (ws.factions || []).length }));
}
/* 9 税月结 */
{
  const ws = mkSect();
  SQ.Sect.setTax(ws, D, 30);
  const before = ws.stones;
  const led0 = SQ.Ledger.sums(ws).inn;
  SQ.Sect.tick(ws, pack, D, SQ.Mods.collect({ worldId: 'xiuxian', talents: [] }, ws, pack, D), 30000, Date.now(), { log: function () {} });
  const led1 = SQ.Ledger.sums(ws).inn;
  ok('V9 税率月结：灵石入账且记 in 总账（与 Ledger 同源）',
    ws.stones > before && led1 > led0,
    JSON.stringify({ before: before, after: ws.stones, inn: led1 - led0 }));
}

const pass = R.filter((x) => x.ok).length;
R.forEach((x) => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? ' (' + x.detail + ')' : '')));
console.log(pass === R.length ? 'PROBE_SECTGOV_ALL_GREEN ' + pass + '/' + R.length : 'PROBE_SECTGOV_FAILED ' + (R.length - pass));
process.exit(pass === R.length ? 0 : 1);
