/* .tests/probe-achvreach.cjs — 60 条成就「判据逐条可被满足」执行探针（无浏览器依赖）
 *
 * 为什么要它：收口报告里长期挂着一条**未证实**——「60 条成就条条真可达」只做过静态判定源↔写入方
 *   抽查（57 条可解析 + 3 条函数判定），而按叶子键名扫写口偏乐观。本探针把可证的那一半做硬：
 *   **逐条构造能满足判据的状态、走真入口 `SQ.Codex.scan` 入账**，证明每条 `achvMet` 都存在
 *   「有状态使其为真」——若某条无论怎么构造都不为真，就是「判据恒假」死成就（本仓已抓获过
 *   `achv_juefeng` / `achv_kuashi` 两条此类，均由后续批补出解锁路径结案）。
 * 边界（必须说清，别拿它当「全部可达」的证明）：
 *   · 本探针证的是 **判据可满足 + 入账链通**，**不证**「玩家正常游玩必然走到」——
 *     后者归 `sim-playthrough` 的 `ACHV_COVERAGE` / `ACHV_UNREACHED` 两行——那两处入账数是**路线剧本覆盖面**的读数、随路线集与种子浮动，故不在本文件里钉死数字。
 *   · 护法 / 福地两条走 `Bonds.guardianOf` / `Cave.current` 真口，构造不出来即如实 FAIL 并打印缺什么。
 * 用法：node .tests/probe-achvreach.cjs     末行 ACHVREACH_ALL_GREEN n/60 或 ACHVREACH_FAILED k
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA, pack = SQ.Worlds.xiuxian.pack;
const ids = D.CODEX.ACHV.map((a) => a.id);
const MAXLV = D.ARTS_MAX_LV || 9;
const compIds = (D.COMPANIONS || []).map((c) => c.id);
/* 法宝正典在 `pack.treasures.LIST`（D 里没有 TREASURES 键，别猜）；功法满级面走 artsLevels ≥ ARTS_MAX_LV */
const treIds = (pack.treasures.LIST || []).map((t) => (t && t.id) || t).filter(Boolean);
const artIds = Object.keys(pack.artsMap ? pack.artsMap() : {});
const TH = (D.FACTION_RANKS || {}).TH || [0, 100, 300, 700, 1500];
const CAVE2 = (D.CAVES || []).map((x) => (x && x.id) || x).filter((id) => id && id !== D.CAVE_INITIAL)[0];

function mk() {
  const w = pack.normalize(pack.initialState());
  w.realm = 9;
  const meta = SQ.Legacy.metaBlank();
  return { w, meta, ref: () => ({ profile: { name: 'x', worldId: 'xiuxian', createdAt: 1, talents: [], alignBias: 'neutral' }, worlds: { xiuxian: w }, meta }) };
}

/* 每条成就一个构造器：把判据读到的点摆到满足态（读点取自 codex.js achvMet 逐条对照） */
const BUILD = {
  achv_wulou: (c) => { c.w.tribMarks = { wulouRun: 3 }; },
  achv_kudu: (c) => { c.w.tribMarks = { kudu: true }; },
  achv_lianbai: (c) => { c.w.tribMarks = { lianbai: true }; },
  achv_yuanman: (c) => { c.w.tribMarks = { yuanman: true }; },
  achv_chujie: (c) => { c.meta.stats.tribWin = 1; },
  achv_baizhan: (c) => { c.meta.stats.tribWin = 30; },
  achv_leiting: (c) => { c.meta.stats.tribAttempts = 100; },
  achv_feisheng: (c) => { c.meta.stats.ascensions = 1; },
  achv_bingjie: (c) => { c.meta.stats.dissolutions = 1; },
  achv_sanshi: (c) => { c.meta.stats.lives = 3; },
  achv_chuyuan: (c) => { c.w.bonds[compIds[0]] = 1; },
  achv_guangjie: (c) => { compIds.slice(0, 20).forEach((id) => { c.w.bonds[id] = 5; }); },
  achv_renhou: (c) => { compIds.slice(0, 40).forEach((id) => { c.w.bonds[id] = 5; }); },
  achv_daolv: (c) => { c.w.spouseLog = [{ npcId: compIds[0] }]; },
  achv_shuangxiu: (c) => {
    c.w.bonds[compIds[0]] = D.BOND_MAX || 100;
    c.w.spouse = { npcId: compIds[0], since: 1 };
  },
  achv_xinjie: (c) => { c.w.scars = { [compIds[1]]: 1 }; },
  achv_juefeng: (c) => { c.w.juefengIds = [compIds[2]]; c.w.bonds[compIds[2]] = 10; },
  achv_kuashi: (c) => { c.w.heirBond = { npcId: compIds[3] }; },
  achv_hufa: (c) => { c.w.bonds[compIds[4]] = D.BOND_MAX || 100; },
  achv_fudi: (c) => {
    c.w.cave = { current: CAVE2, cooldownUntil: 0, owned: [D.CAVE_INITIAL, CAVE2], fac: {} };
    c.w.bonds[compIds[5]] = D.BOND_MAX || 100;
  },
  achv_rumen: (c) => { c.w.factionId = D.FACTIONS_FIXED[0].id; },
  achv_zhishi: (c) => { c.w.factionId = D.FACTIONS_FIXED[0].id; c.w.factionRep[D.FACTIONS_FIXED[0].id] = TH[3] + 10; },
  achv_zhangjiao: (c) => { c.w.factionId = D.FACTIONS_FIXED[0].id; c.w.factionRep[D.FACTIONS_FIXED[0].id] = TH[4] + 10; },
  achv_panzong: (c) => { c.w.everDefected = true; },
  achv_zhangong: (c) => { c.w.factionId = D.FACTIONS_FIXED[0].id; c.w.factionWar = { joined: 'in', merit: 5 }; },
  achv_xuanzhan: (c) => { c.w.factionId = D.FACTIONS_FIXED[0].id; c.w.factionWar = { aId: D.FACTIONS_FIXED[0].id, bId: D.FACTIONS_FIXED[1].id }; },
  achv_kaizong: (c) => { c.w.sect = { name: '测试宗', disciples: [], fac: {}, succession: null }; },
  achv_danfang: (c) => { SQ.Alchemy.ensure(c.w, D); c.w.alchemy.fires = 1; },
  achv_jiuzhuan: (c) => { SQ.Alchemy.ensure(c.w, D); c.w.alchemy.jiuzhuan = 1; },
  achv_lianqi: (c) => { SQ.Alchemy.ensure(c.w, D); c.w.alchemy.forgeMade = 1; },
  achv_chutong: (c) => { c.w.cleared = [0]; },
  achv_bantu: (c) => { c.w.cleared = [0, 1, 2, 3, 4]; },
  achv_quantong: (c) => { c.w.cleared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; },
  achv_yuzhu: (c) => { c.w.bossKills = [0]; },
  achv_shizhu: (c) => { c.w.bossKills = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; },
  achv_chubao: (c) => { c.w.treasures.owned = [{ id: treIds[0], lv: 1, st: {} }]; },
  achv_cangbao: (c) => { c.w.treasures.owned = treIds.slice(0, 20).map((id) => ({ id: id, lv: 1, st: {} })); },
  achv_baoquan: (c) => { c.w.treasures.owned = treIds.slice(0, 46).map((id) => ({ id: id, lv: 1, st: {} })); },
  achv_yifa: (c) => { c.w.artsKnown = [artIds[0]]; c.w.artsLevels = { [artIds[0]]: MAXLV }; },
  achv_wanfa: (c) => {
    c.w.artsKnown = artIds.slice(0, 10);
    c.w.artsLevels = {};
    artIds.slice(0, 10).forEach((a) => { c.w.artsLevels[a] = MAXLV; });
  },
  achv_rumo: (c) => { c.w.karma = -500; },
  achv_shenmo: (c) => { c.w.karma = -900; },
  achv_lingzhi: (c) => { c.w.tiandao = { stats: { accept: 1 } }; },
  achv_kangzhi: (c) => { c.w.tiandao = { stats: { defy: 1 } }; },
  achv_niman: (c) => { c.w.tiandao = { defy: 100 }; },
  achv_bushou: (c) => { c.meta.stats.defyTotal = 10; },
  achv_guantian: (c) => { c.meta.stats.omensSeen = 20; },
  achv_nitian: (c) => { c.w.tiandao = { title: true }; },
  achv_fanpan: (c) => { c.w.tiandao = { title: true, nijieFails: 1 }; },
  achv_sudi: (c) => { c.meta.eternalProdigy = { id: 'pr1' }; c.w.prodigies = [{ id: 'pr1', apt: 2, rlm: 0, prg: 0 }]; },
  achv_zhandi: (c) => { c.w.prodMarks = { sudiWin: true }; }
};
/* 境界九阶一组（判据 = ws.realm ≥ N，N 由 id 名对应 REALMS 下标） */
const REALM_IDS = ['achv_jichu', 'achv_jindan', 'achv_yuanying', 'achv_huashen', 'achv_lianxu',
  'achv_heti', 'achv_dacheng', 'achv_dujie', 'achv_zhenxian'];
REALM_IDS.forEach((id, i) => { if (!BUILD[id]) BUILD[id] = (c) => { c.w.realm = i + 1; }; });

const R = [];
ids.forEach((id) => {
  const c = mk();
  const b = BUILD[id];
  let note = '';
  if (!b) { R.push({ id, ok: false, note: '本探针无构造器（= 待补，不等于不可达）' }); return; }
  try { b(c); } catch (e) { R.push({ id, ok: false, note: '构造抛错 ' + e.message }); return; }
  try { SQ.Codex.scan(c.ref(), 1700000000000); } catch (e) { R.push({ id, ok: false, note: 'scan 抛错 ' + e.message }); return; }
  const got = (c.meta.achv || []).indexOf(id) >= 0;
  if (id === 'achv_hufa' || id === 'achv_fudi') {
    const g = SQ.Bonds.guardianOf(c.w, pack, D);
    note = '护法位=' + (g ? (g.id + '/tier' + g.tier + '/bonus' + g.bonus) : 'null');
  }
  if (id === 'achv_fudi') {
    const cv = SQ.Cave ? SQ.Cave.current(c.w, pack) : null;
    note += ' 福地=' + (cv ? cv.id : 'null') + '(初=' + D.CAVE_INITIAL + ')';
  }
  R.push({ id, ok: got, note: got ? '' : ('未入账 ' + note) });
});

const bad = R.filter((x) => !x.ok);
R.forEach((x) => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.id + (x.note ? ' (' + x.note + ')' : '')));
console.log(bad.length === 0 ? 'ACHVREACH_ALL_GREEN ' + R.length + '/' + ids.length : 'ACHVREACH_FAILED ' + bad.length + '/' + ids.length);
process.exit(bad.length === 0 ? 0 : 1);
