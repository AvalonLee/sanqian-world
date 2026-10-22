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

/* 1 三写口已退役（第册一百一十八批 · 用户裁定「宗名不能改、门规（立场）与阵营不能改、宣言创立即定」）
 *    负判据：`rename` / `setRule` / `setMotto` 不再是 SQ.Sect 的出口（有其一即红）。
 *    配一条正判据（V2/V3 承担）：立派写下的那几样能一路带过 normalize，说明锁的是「改写口」而不是「值会被冲掉」。 */
{
  const gone = ['rename', 'setRule', 'setMotto'].filter((k) => k in SQ.Sect);
  ok('V1 治理三写口已整族退役（宗名 / 门规 / 阵营 / 宣言立派后无写口）',
    gone.length === 0, '残留出口=' + (gone.join(',') || '无'));
}
/* 2 立派写入的四样过 normalize 原样保留（不改写、不重置） */
{
  const g2 = (D.SECT.GATES || [])[1] || (D.SECT.GATES || [])[0];
  const ws = pack.normalize({ sect: {
    name: '凌霄阁', nameIdx: [0, 0], gate: g2, align: 'evil', motto: '戒贪戒躁',
    disciples: [], fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 },
    warRecord: { wins: 0, loses: 0 }, suppressed: {}, foundAt: Date.now(), seq: 0
  } });
  const s2 = ws.sect || {};
  ok('V2 宗名 / 门规 / 阵营 / 宣言读档后逐字仍在（锁的是写口，不是把值冲没）',
    s2.name === '凌霄阁' && s2.gate === g2 && s2.align === 'evil' && s2.motto === '戒贪戒躁',
    JSON.stringify({ name: s2.name, gate: s2.gate, align: s2.align, motto: s2.motto }));
}
/* 3 宣言清洗口径仍在（截 MOTTO_MAX；非字符串回落空串），只是不再有事后编辑器 */
{
  const long = '一'.repeat(40);
  const ws3 = pack.normalize({ sect: {
    name: '青云门', gate: (D.SECT.GATES || [])[0], align: 'neutral', motto: long,
    disciples: [], fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 },
    warRecord: { wins: 0, loses: 0 }, suppressed: {}, foundAt: Date.now(), seq: 0
  } });
  const ws3b = pack.normalize({ sect: {
    name: '青云门', gate: (D.SECT.GATES || [])[0], align: 'neutral', motto: 5,
    disciples: [], fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 },
    warRecord: { wins: 0, loses: 0 }, suppressed: {}, foundAt: Date.now(), seq: 0
  } });
  ok('V3 宣言仍按 MOTTO_MAX 截断、脏值回落空串（清洗未失修，事后无编辑口）',
    ws3.sect.motto.length === (D.SECT.MOTTO_MAX || 24) && ws3b.sect.motto === '',
    'len=' + ws3.sect.motto.length + ' 脏值=' + JSON.stringify(ws3b.sect.motto));
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

/* mkSect 里 initialState 的势力池是空的（固定五门由创角流程播种）⇒ 结仇那两判自带三枚在册势力。
 * 三枚都挂 fixed：`npcRepOf` 的档次按「固定池序 0~3 循环」取，非固定条目会算不出价。 */
function withFoes(ws) {
  ['fA', 'fB', 'fC'].forEach(function (id) {
    ws.factions.push({ id: id, name: id, align: 'neutral', perk: { field: 'qiRate', v: 0 }, rel: {}, fixed: true });
  });
  return ws;
}
/* 10 结仇宣战（第册一百二十二批 · 用户裁定「开：重代价」）：三笔代价 + 连带敌对 + 拒付零副作用。
 *    三处重点：① 视图标价 = 引擎实扣（同取 `warOpenCost`，不留第二把尺子）；
 *    ② 敌对**只追一跳**——目标的友好者成敌对，友好者的友好不成（写成假敌对就是说谎）；
 *    ③ 「poor」必须分文不动（负判据），零费老口径由 V11 的正判据配平。 */
{
  const ws = withFoes(mkSect());
  const se = SQ.Factions.byId(ws, 'sect');
  const others = (ws.factions || []).filter((f) => f.id !== 'sect');
  const tgt = others[0], frd = others[1], far = others[2];
  const rel = (a, b) => (a.rel || {})[b.id];
  se.rel[tgt.id] = 'neutral'; (tgt.rel = tgt.rel || {})['sect'] = 'neutral';
  se.rel[frd.id] = 'neutral'; (frd.rel = frd.rel || {})['sect'] = 'neutral';
  tgt.rel[frd.id] = 'friendly'; frd.rel[tgt.id] = 'friendly';
  frd.rel[far.id] = 'friendly'; (far.rel = far.rel || {})[frd.id] = 'friendly';
  const fee = SQ.Sect.warOpenCost(ws, D, tgt.id);
  const s0 = ws.stones, k0 = ws.karmaEventScore || 0;
  ws.stones = fee - 1;
  const rNo = SQ.Sect.declareWar(ws, pack, D, tgt.id, Date.now(), function () {});
  const held = rNo.ok === false && rNo.reason === 'poor' && rNo.cost === fee &&
    ws.stones === fee - 1 && (ws.karmaEventScore || 0) === k0 && rel(se, tgt) === 'neutral' && !ws.factionWar;
  ws.stones = s0;
  const r = SQ.Sect.declareWar(ws, pack, D, tgt.id, Date.now(), function () {});
  ok('V10 结仇宣战：灵石不足即拒且分文不动；付得起则费=标价、善恶 −30、声望折 10%，敌对只追一跳',
    held && !!fee && r.ok && r.fee === fee && ws.stones === s0 - fee &&
    (ws.karmaEventScore || 0) === k0 + (D.SECT.WAR_OPEN_KARMA != null ? D.SECT.WAR_OPEN_KARMA : -30) &&
    Math.abs(ws.sect.repCut - 0.9) < 1e-9 && rel(se, tgt) === 'enemy' && rel(tgt, se) === 'enemy' &&
    rel(se, frd) === 'enemy' && rel(se, far) !== 'enemy' && !!ws.factionWar,
    JSON.stringify({ fee: fee, held: held, stones: ws.stones, karma: (ws.karmaEventScore || 0) - k0,
      cut: ws.sect.repCut, rel: [rel(se, tgt), rel(tgt, se), rel(se, frd), rel(se, far)] }));
}
/* 11 声望乘区落进取数口 + 读档保值与 clamp + 已敌对者零费（老口径零回归） */
{
  const ws = mkSect();
  const rep1 = SQ.Sect.sectRep(ws, D);
  ws.sect.repCut = 0.9;
  const rep2 = SQ.Sect.sectRep(ws, D);
  const base = Object.assign({}, ws.sect);
  const rt = SQ.Sect.normalize(Object.assign({}, base, { repCut: 0.72 }), D).repCut;
  const cl = SQ.Sect.normalize(Object.assign({}, base, { repCut: 0.1 }), D).repCut;
  const dirty = SQ.Sect.normalize(Object.assign({}, base, { repCut: 'x' }), D).repCut;
  const ws2 = withFoes(mkSect());
  const se2 = SQ.Factions.byId(ws2, 'sect');
  const foe = (ws2.factions || []).filter((f) => f.id !== 'sect')[0];
  se2.rel[foe.id] = 'enemy'; (foe.rel = foe.rel || {})['sect'] = 'enemy';
  const s2 = ws2.stones, k2 = ws2.karmaEventScore || 0;
  const r2 = SQ.Sect.declareWar(ws2, pack, D, foe.id, Date.now(), function () {});
  ok('V11 声望折损进 sectRep（×0.9 逐字对表）且 normalize 保值 / 越界 clamp / 脏值回落；已敌对者宣战零费零折损',
    rep1 > 0 && rep2 === Math.round(rep1 * 0.9) && rt === 0.72 && cl === 0.5 && dirty === 1 &&
    r2.ok && r2.fee === 0 && ws2.stones === s2 && (ws2.karmaEventScore || 0) === k2 &&
    Math.abs(ws2.sect.repCut - 1) < 1e-9,
    JSON.stringify({ rep1: rep1, rep2: rep2, rt: rt, cl: cl, dirty: dirty, fee: r2.fee, stones: ws2.stones }));
}

const pass = R.filter((x) => x.ok).length;
R.forEach((x) => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? ' (' + x.detail + ')' : '')));
console.log(pass === R.length ? 'PROBE_SECTGOV_ALL_GREEN ' + pass + '/' + R.length : 'PROBE_SECTGOV_FAILED ' + (R.length - pass));
process.exit(pass === R.length ? 0 : 1);
