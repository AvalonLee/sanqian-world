/* .tests/probe-join.cjs — 携才投效（N6）事件链探针（无浏览器依赖 · 执行取证用）
 *
 * 为什么需要它：本链此前的形态是「常量在册、入库口在档、**生产者零调用点**」——
 *   `data.js` 五枚 `JOIN_*` 无人读、`sect.js acceptProdigy` 全库零调用（典型「写了没人读」死面），
 *   玩家侧永远看不到「登门求入门」，`TIANJIAO_MULT` 乘区虽有读点却无天骄弟子可触发。
 * 冒烟只装载引擎、照不出「掷点是否真被调用」，故本探针直接调真入口逐条取证：
 *   §0 常量取用对表（五枚在 **PRODIGY** 块不在 SECT 块——本批第一次实跑就撞错块、全靠代码兜底值才没崩，
 *      这正是「双口径」缺陷形态，故把它钉成断言）
 *   §1 调用点真存在（Prodigy.tick 月掷真落弟子）  §2 三门前置闸（bond / feud / cap 先行）
 *   §3 宗规三分支（正收 · 左婉拒 bond±0 · 魔判定胜收）  §4 魔道败北两出口（结仇 / Bonds.lose −5）
 *   §5 幂等与零越权（dup · 不占供奉名额 · ws.sect 键面零新增）  §6 双乘区真动数字（战力与推进 ×1.2）
 * 用法：node .tests/probe-join.cjs     末行 JOIN_ALL_GREEN n/n 或 JOIN_FAILED k
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA, pack = SQ.Worlds.xiuxian.pack, SC = D.SECT, PD = D.PRODIGY;
const noopLog = () => function () {};
const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail == null ? '' : String(detail) });
/* 掷点桩：randSeq 按调用次序供数，越界回落到末值（tryJoin 一路线最多掷两次，次序敏感） */
const rand = (v, fn) => randSeq([v], fn);
const randSeq = (seq, fn) => {
  const o = Math.random; let i = 0;
  Math.random = () => (i < seq.length ? seq[i++] : seq[seq.length - 1]);
  try { return fn(); } finally { Math.random = o; }
};

function mkWs(align) {
  const w = pack.normalize(pack.initialState());
  w.realm = 4; w.everDefected = true; w.factionRepPeak = 2000;
  const f0 = D.FACTIONS_FIXED[0].id;
  w.factionId = f0; w.factionRep[f0] = 2000; w.factionOffice = 'elder';
  w.artsKnown = ['qingxin', 'tiebi', 'posha'];
  const meta = SQ.Legacy.metaBlank(); meta.unlocks.sect = true;
  const r = SQ.Sect.foundSect(w, pack, D, meta, 'wuyue', null, [0, 0], align, Date.now(), noopLog());
  if (!r.ok) throw new Error('foundSect failed: ' + r.reason);
  SQ.Prodigy.rollForNewLife(w, pack, D, SQ.Legacy.metaBlank(), Date.now());
  /* 只让 0 号天骄达档，其余好感压到阈值下 ⇒ `pick(cand)` 恒取 0 号，掷点桩才谈得上确定性 */
  (w.prodigies || []).forEach((p, i) => { w.bonds[p.id] = i === 0 ? 50 : 0; });
  return w;
}
const modsOf = (w) => SQ.Mods.collect({ talents: [] }, w, pack, D);
function freshLog() { const a = []; const f = (cat, text) => a.push({ cat, text }); f.lines = a; return f; }
const grab = (lg, key) => lg.lines.filter(l => l.text && l.text.indexOf(key) >= 0);

/* ── §0 出口与常量对表 ─────────────────────────────────────── */
ok('§0a acceptProdigy 与 joinOpen 均已导出（两者曾是零调用死函数）',
  typeof SQ.Sect.acceptProdigy === 'function' && typeof SQ.Sect.joinOpen === 'function');
ok('§0b tryJoin 已导出', typeof SQ.Prodigy.tryJoin === 'function');
ok('§0c JOIN_* 五枚在 PRODIGY 块且为数（不在 SECT 块）',
  [PD.JOIN_P, PD.JOIN_BOND, PD.JOIN_DC, PD.JOIN_FEUD_P, PD.JOIN_REFUSE_BOND].every(x => typeof x === 'number') &&
  ['JOIN_P', 'JOIN_BOND', 'JOIN_DC', 'JOIN_FEUD_P', 'JOIN_REFUSE_BOND'].every(k => SC[k] === undefined),
  [PD.JOIN_P, PD.JOIN_BOND, PD.JOIN_DC, PD.JOIN_FEUD_P, PD.JOIN_REFUSE_BOND].join('/'));
{                                                    /* §0d 引擎真读常量表，不是只靠代码兜底值 */
  const w = mkWs('right');
  const save = PD.JOIN_BOND;
  PD.JOIN_BOND = 90;                                 /* 把阈值抬到所有人之上 */
  const lg = freshLog();
  const r = rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg));
  PD.JOIN_BOND = save;
  ok('§0d JOIN_BOND 改表即改行为（消费点真在常量面 · 非硬编码）', r === null && lg.lines.length === 0, 'save=' + save);
}

/* ── §1 调用点真存在：Prodigy.tick 月掷 → 弟子入库 ─────────── */
{
  const w = mkWs('right');
  const before = (w.sect.disciples || []).length;
  const cap = SQ.Sect.discCap(w, D);
  const lg = freshLog();
  rand(0, () => SQ.Prodigy.tick(w, pack, D, modsOf(w), 30000, Date.now(), { log: lg }));
  const after = (w.sect.disciples || []).length;
  ok('§1a Prodigy.tick 命中 JOIN_P 后弟子真入库（生产者调用点通）', after === before + 1, before + '→' + after + ' cap=' + cap);
  const nd = w.sect.disciples[w.sect.disciples.length - 1];
  ok('§1b 新弟子带天骄来源位 pr 且 tianjiao', !!nd.pr && nd.tianjiao === true, JSON.stringify({ pr: nd.pr, tj: nd.tianjiao }));
  ok('§1c 入门日志出正文（sect.disc.join 真消费、无裸 key 回落）',
    grab(lg, '登门求入门').length === 1 && !grab(lg, 'sect.disc.join').length, grab(lg, '登门求入门').length + ' 条');
  ok('§1d 天骄名录取自名录（非空串、非山门俗名回落）',
    !!nd && lg.lines.some(l => l.text.indexOf(SQ.Prodigy.nameOf(w, SQ.Prodigy.byId(w, nd.pr), pack)) >= 0));
  ok('§1e 入门弟子不占供奉名额且起境为 0（卷面：不取真境界，防榜面双记）',
    !nd.offering && nd.realm === 0 && nd.tier === 'fine', JSON.stringify({ off: nd.offering, rlm: nd.realm, tier: nd.tier }));
}

/* ── §2 三门前置闸（满员根本不掷 · bond 不足 · feud 冻结）─── */
{
  const w = mkWs('right');
  const cap = SQ.Sect.discCap(w, D);
  while ((w.sect.disciples || []).length < cap) {
    w.sect.disciples.push({ id: 'dx' + w.sect.disciples.length, nm: [0, 0], tier: 'mid', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false });
  }
  const lg = freshLog();
  const r = rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg));
  ok('§2a 满员 = 根本不掷（返回 null 且零日志）', r === null && lg.lines.length === 0, 'logs=' + lg.lines.length);
}
{
  const w = mkWs('right');
  (w.prodigies || []).forEach(p => { w.bonds[p.id] = PD.JOIN_BOND - 1; });
  const lg = freshLog();
  ok('§2b bond 差 1 不触发', rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg)) === null);
  (w.prodigies || []).forEach(p => { w.bonds[p.id] = PD.JOIN_BOND; });
  const lg2 = freshLog();
  ok('§2c bond 恰达档即触发（阈值非写死高标）', rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg2)) !== null);
}
{
  const w = mkWs('right');
  (w.prodigies || []).forEach(p => { p.feud = true; });
  const lg = freshLog();
  ok('§2d 宿敌不投效（feud 排除）', rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg)) === null && lg.lines.length === 0);
}

/* ── §3 宗规三分支（正收 / 左婉拒 bond±0 / 魔判定胜收）───── */
{
  const w = mkWs('neutral');
  const p0 = w.prodigies[0], b0 = w.bonds[p0.id], n0 = w.sect.disciples.length;
  const lg = freshLog();
  const r = rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg));
  ok('§3a 左道 = 婉拒（零弟子入库、走 join.refuse）', r && r.branch === 'left' && w.sect.disciples.length === n0 && grab(lg, '不问出身').length === 1, JSON.stringify(r && r.branch));
  ok('§3b 左道婉拒 bond 分毫不动（卷面 −0）', w.bonds[p0.id] === b0, b0 + '→' + w.bonds[p0.id]);
}
{
  const w = mkWs('evil');
  w.zone = 0;                                          /* 第 1 区 need 最低 → 判定必过 */
  const n0 = w.sect.disciples.length;
  const lg = freshLog();
  const r = rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg));
  ok('§3c 魔道压价判定胜 = 收入门下', r && r.branch === 'evilWin' && w.sect.disciples.length === n0 + 1, JSON.stringify(r && r.branch));
  ok('§3d 胜支补「折节」句（join.win 真消费）', grab(lg, '折节').length === 1, lg.lines.length + ' 条');
}
{                                                    /* §3e 「势·困难」门槛真吃 JOIN_DC */
  const w = mkWs('evil');
  w.zone = Math.min(2, D.ZONES.length - 1);
  const myP = SQ.Mods.powerOf(w, pack, D, modsOf(w));
  const save = PD.JOIN_DC;
  PD.JOIN_DC = 0.0001;                                 /* 压到必过 */
  const lgA = freshLog();
  const rA = rand(0, () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lgA));
  PD.JOIN_DC = 999;                                    /* 抬到必败 */
  const w2 = mkWs('evil');
  const lgB = freshLog();
  const rB = randSeq([0, 0.99], () => SQ.Prodigy.tryJoin(w2, pack, D, modsOf(w2), Date.now(), lgB));
  PD.JOIN_DC = save;
  ok('§3e JOIN_DC 改表即改判（低门槛收 / 高门槛败）',
    rA && rA.branch === 'evilWin' && rB && rB.branch === 'evilLose',
    'power=' + Math.round(myP) + ' 收=' + (rA && rA.branch) + ' 败=' + (rB && rB.branch));
}

/* ── §4 魔道败北两出口（30% 结仇 / 否则 Bonds.lose −5）────── */
{
  const w = mkWs('evil');
  w.zone = D.ZONES.length - 1;                        /* 最深区 need → 判定必败 */
  const p0 = (w.prodigies || []).filter(p => !p.feud)[0];
  const b0 = w.bonds[p0.id], n0 = w.sect.disciples.length;
  const lg = freshLog();
  const r = randSeq([0, 0], () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg));  /* 掷中结仇率 */
  ok('§4a 败北且掷中结仇率 → startFeud、零弟子入库', r && r.branch === 'evilLose' && p0.feud === true && w.sect.disciples.length === n0, JSON.stringify(r && r.branch));
  ok('§4b 败北补句与结仇句各一条（join.lose 与 log.feud 文案不串台）',
    grab(lg, '嫌价太贱').length === 1 && grab(lg, '拂袖').length === 1, lg.lines.map(l => l.text.slice(0, 6)).join('|'));
  ok('§4c 结仇支不吃好感（走结仇口，Bond 不动）', w.bonds[p0.id] === b0, b0 + '→' + w.bonds[p0.id]);
}
{
  const w = mkWs('evil');
  w.zone = D.ZONES.length - 1;
  const p0 = (w.prodigies || []).filter(p => !p.feud)[0];
  const b0 = w.bonds[p0.id];
  const lg = freshLog();
  randSeq([0, 0.99], () => SQ.Prodigy.tryJoin(w, pack, D, modsOf(w), Date.now(), lg));         /* ≥ JOIN_FEUD_P ⇒ 只掉好感 */
  ok('§4d 败北未结仇走 Bonds.lose 唯一负向口（bond −5）', w.bonds[p0.id] === b0 + PD.JOIN_REFUSE_BOND, b0 + '→' + w.bonds[p0.id]);
  ok('§4e 未结仇支 feud 保持 false', p0.feud !== true);
}

/* ── §5 幂等 / 存档键面零新增 ─────────────────────────────── */
{
  const w = mkWs('right');
  w.sect.fac.keshe = 2;                                 /* 客舍抬名额（DISC_CAP_BASE 1 + 2），dup 闸才不会被 cap 闸抢先 */
  const pid = w.prodigies[0].id;
  w.sect.disciples.push({ id: 'dpre', nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: true, pr: pid });
  const n1 = w.sect.disciples.length;
  const lg = freshLog();
  const r2 = SQ.Sect.acceptProdigy(w, pack, D, pid, Date.now(), lg);
  ok('§5a 同一天骄二次入门被 dup 挡（幂等，不靠 cap 侥幸）',
    r2.ok === false && r2.reason === 'dup' && w.sect.disciples.length === n1 && lg.lines.length === 0, JSON.stringify(r2.reason));
  const keys = Object.keys(w.sect).sort().join(',');
  ok('§5b ws.sect 键面零新增（无新存档字段、容量账不动）', keys === Object.keys(mkWs('right').sect).sort().join(','), keys);
  const bad = (w.sect.disciples || []).filter(d => d.pr && d.offering);
  ok('§5c 天骄弟子不占供奉名额（offering 轴另计）', bad.length === 0, 'offering 兼有 pr 者=' + bad.length);
}

/* ── §6 双乘区真动数字（战力口与推进口都吃 TIANJIAO_MULT）── */
{
  const w = mkWs('right');
  const tj = { id: 'dt', nm: [3, 7], tier: 'fine', realm: 2, prog: 0, inv: 0, perk: 'combatPower', tianjiao: true, pr: 'pr9' };
  const no = { id: 'dn', nm: [3, 7], tier: 'fine', realm: 2, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false };
  const pTj = SQ.Sect.discPower(w, pack, D, tj), pNo = SQ.Sect.discPower(w, pack, D, no);
  ok('§6a 战力口乘区真生效（ratio = TIANJIAO_MULT）', Math.abs(pTj / pNo - (SC.TIANJIAO_MULT || 1.2)) < 1e-9, pTj.toFixed(2) + '/' + pNo.toFixed(2) + '=' + (pTj / pNo).toFixed(4));
  w.sect.disciples = [tj, no];
  rand(0.99, () => SQ.Sect.tick(w, pack, D, modsOf(w), 30000, Date.now(), { log: noopLog() }));
  ok('§6b 推进口乘区真生效（同月 prog 增量 ×1.2 ⇒ 顶格叠乘 1.44 的另一半）',
    tj.prog > 0 && no.prog > 0 && Math.abs(tj.prog / no.prog - (SC.TIANJIAO_MULT || 1.2)) < 1e-6,
    tj.prog.toFixed(2) + '/' + no.prog.toFixed(2) + '=' + (tj.prog / no.prog).toFixed(4));
  ok('§6c 资质起底 = 良才档（tier fine × 乘区 ⇒ 顶格 1.44 口径成立）',
    tj.tier === 'fine' && Math.abs(((SC.APT_MULT || {}).fine || 1.2) * (SC.TIANJIAO_MULT || 1.2) - 1.44) < 1e-9,
    'fine=' + (SC.APT_MULT || {}).fine + '×tj=' + SC.TIANJIAO_MULT);
}

/* ── 汇总 ─────────────────────────────────────────────────── */
const fail = R.filter(x => !x.ok).length;
R.forEach(x => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? ' (' + x.detail + ')' : '')));
console.log(fail === 0 ? 'JOIN_ALL_GREEN ' + R.length + '/' + R.length : 'JOIN_FAILED ' + fail);
process.exit(fail === 0 ? 0 : 1);
