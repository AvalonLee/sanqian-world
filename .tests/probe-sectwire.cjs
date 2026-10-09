/* .tests/probe-sectwire.cjs — 自立门户三效果接线探针（无浏览器依赖 · 一次性取证用）
 *
 * 为什么需要它：自立门户卷 §4.2 丹房①、§2.3「功法子集」、§2.3「天道态度」三环此前都是
 * **文案与常量在册、消费点缺席**（grep 零命中 ≠ 未实现的反面教材：常量在 data.js 照绿，
 * 但 alchemy.js 全库不读 ws.sect、sect.js 不按 align 过滤、tiandao.js 零处消费宗门倾向）。
 * 冒烟 #222/#262/#263 守的是「不回归」，本探针守的是「真的动了数字」——
 * 走 .tests/sandbox.cjs 加载**真引擎**（与 view/index.html <script> 同序），直接调真入口：
 *   §1 宗门丹房 0→1 → craftP 与 hasFurnace 双变（含 collectCraft 真出炉 p）
 *   §2 宗规 right vs evil（同持功法集、同藏经阁等级）→ 弟子战力/宗门战力/战功三处数字不同
 *   §3 宗规 right vs evil vs neutral → 天象短评正文不同、编年史措辞不同、机制四字段全等
 * 用法：node .tests/probe-sectwire.cjs     末行 SECTWIRE_ALL_GREEN n/n 或 SECTWIRE_FAILED k
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;
const SC = D.SECT, AL = D.ALCHEMY, TD = D.TIANDAO;

const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail || '' });
const noopLog = () => function () {};
const f4 = (x) => Number(x.toFixed(4));

function mkMeta() { const m = SQ.Legacy.metaBlank(); m.unlocks.sect = true; return m; }

/* 造一个「已开宗 + 有弟子 + 有设施」的档：全走 foundSect 真入口，不手搓 ws.sect */
function mkSectWs(align, arts) {
  const w = pack.normalize(pack.initialState());
  w.realm = 4; w.everDefected = true; w.factionRepPeak = 2000;
  const f0 = D.FACTIONS_FIXED[0].id;
  w.factionId = f0; w.factionRep[f0] = 2000; w.factionOffice = 'elder';
  w.artsKnown = (arts || ['qingxin', 'tiebi', 'posha']).slice();
  const r = SQ.Sect.foundSect(w, pack, D, mkMeta(), 'wuyue', null, [0, 0], align, Date.now(), noopLog());
  if (!r.ok) throw new Error('foundSect failed: ' + r.reason);
  w.sect.fac = { zangjing: 3, danfang: 0, yanwu: 0, keshe: 0 };
  w.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 4, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
  return w;
}

/* ── 1) 宗门丹房 → 炼丹消费点 ───────────────────────────────── */
console.log('==== §1 丹房（alchemy.js 第 4 丹炉渠道 + 平坦 +5%）====');
{
  const w = mkSectWs('neutral');
  SQ.Alchemy.ensure(w, D); SQ.Alchemy.autoGrant(w, D);
  SQ.Alchemy.addMats(w, pack, D, { mat_linglu: 6, mat_qingmu: 6, mat_leisui: 24 }, 1, null);
  const pDi0 = SQ.Alchemy.craftP(D, 'di', 3, w);          /* 地阶档 3（宗师）基线 */
  const pHuang0 = SQ.Alchemy.craftP(D, 'huang', 0, w);
  const fur0 = SQ.Alchemy.hasFurnace(w, pack, D, null);
  const sc0 = SQ.Alchemy.startCraft(w, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());

  w.sect.fac.danfang = 1;
  const pDi1 = SQ.Alchemy.craftP(D, 'di', 3, w);
  const fur1 = SQ.Alchemy.hasFurnace(w, pack, D, null);
  const sc1 = SQ.Alchemy.startCraft(w, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
  const lv1 = sc1 && sc1.craft ? sc1.craft.doneAt : 0;
  w.alchemy.craft = null;

  w.sect.fac.danfang = 5;
  const pDi5 = SQ.Alchemy.craftP(D, 'di', 3, w);          /* 平坦：5 级 == 1 级 */
  const pCap = SQ.Alchemy.craftP(D, 'huang', 3, w);       /* 0.85+0.09+0.05 = 0.99 → 钳 0.95 */

  /* 真出炉：丹成读点带 +5%、器台读点不带（同一 collectCraft 入口） */
  const scDan = SQ.Alchemy.startCraft(w, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
  const real = [];
  {
    const orig = Math.random; Math.random = () => 0.99;
    real.push(SQ.Alchemy.collectCraft(w, pack, D, null, null, scDan.craft.doneAt + 1, null));
    Math.random = orig;
  }
  w.alchemy.blueprints.push('bp_furnace');
  const scQi = SQ.Alchemy.startCraft(w, pack, D, 'qi', 'bp_furnace', {}, null, 1, noopLog());
  {
    const orig = Math.random; Math.random = () => 0.99;
    real.push(SQ.Alchemy.collectCraft(w, pack, D, null, null, scQi.craft.doneAt + 1, null));
    Math.random = orig;
  }

  /* 并存裁定：福地丹房 3 级 + 宗门丹房 5 级 → 仍只有一份 +5% */
  const cv = SQ.Cave.current(w, pack);
  w.cave.fac[cv.id] = w.cave.fac[cv.id] || {}; w.cave.fac[cv.id].danfang = 3;
  const both = SQ.Alchemy.craftP(D, 'di', 3, w);
  const onlyCave = (function () { const c = mkSectWs('neutral'); c.sect.fac.danfang = 0;
    c.cave.fac[SQ.Cave.current(c, pack).id] = { danfang: 3 };
    return { fur: SQ.Alchemy.hasFurnace(c, pack, D, null), p: SQ.Alchemy.craftP(D, 'di', 3, c) }; })();

  /* 传位（succession）后渠道自动摘除 */
  const s = mkSectWs('neutral'); s.sect.fac.danfang = 5;
  s.sect.succession = { done: true, heir: '弟子', rep: 1, at: 1 };
  const afterSucc = { lv: SQ.Alchemy.sectDanfangLv(s, D), fur: SQ.Alchemy.hasFurnace(s, pack, D, null), p: SQ.Alchemy.craftP(D, 'di', 3, s) };

  console.log('地阶档 3 craftP      丹房 0 →', pDi0.toFixed(4), '| 1 →', pDi1.toFixed(4), '| 5 →', pDi5.toFixed(4),
    '（加项 =', SC.DANFANG_CRAFT, '平坦）');
  console.log('黄阶档 3 加项后       ', (AL.CRAFT_BASE.huang + AL.PROF_BONUS[3] + SC.DANFANG_CRAFT).toFixed(4),
    '→ craftP 钳位', pCap.toFixed(4), '(CRAFT_CAP', AL.CRAFT_CAP + ')');
  console.log('hasFurnace           0 级 =', fur0, '/ 1 级 =', fur1, '| startCraft 炉检 0 级 reason =', sc0.reason,
    '/ 1 级 ok =', sc1.ok);
  console.log('真出炉 p             丹 =', real[0] && real[0].p.toFixed(4), '(基线', AL.CRAFT_BASE.huang +
    ') / 器 =', real[1] && real[1].p.toFixed(4), '(基线', AL.CRAFT_BASE.qi + ' → 器台零加项)');
  console.log('并存                 福地 3 + 宗门 5 =', both.toFixed(4), '| 只福地：炉检', onlyCave.fur,
    'craftP', onlyCave.p.toFixed(4), '（福地不给速率加项）');
  console.log('传位                 sectDanfangLv', afterSucc.lv, 'hasFurnace', afterSucc.fur,
    'craftP', afterSucc.p.toFixed(4), '（渠道自动摘除）');

  ok('§1 craftP 0→1 位移 = +5%', Math.abs((pDi1 - pDi0) - SC.DANFANG_CRAFT) < 1e-12 &&
    Math.abs(pDi0 - 0.64) < 1e-9 && Math.abs(pDi1 - 0.69) < 1e-9, f4(pDi0) + '→' + f4(pDi1));
  ok('§1 平坦不随级缩放（满级递进卷面未定）', pDi5 === pDi1, f4(pDi5));
  ok('§1 CRAFT_CAP 0.95 钳住加项', pCap === AL.CRAFT_CAP, f4(pCap));
  ok('§1 第 4 丹炉渠道（0 级拒 / 1 级通 + 真 startCraft）', fur0 === false && fur1 === true &&
    sc0.reason === 'furnace' && sc1.ok === true, sc0.reason + '/' + sc1.ok);
  ok('§1 器台零波及（collectCraft 真读点）', Math.abs(real[1].p - AL.CRAFT_BASE.qi) < 1e-9 &&
    Math.abs(real[0].p - (AL.CRAFT_BASE.huang + SC.DANFANG_CRAFT)) < 1e-9,
    f4(real[0].p) + '/' + f4(real[1].p));
  ok('§1 并存不双计（只一份 +5%）', both === pDi1 && Math.abs(onlyCave.p - pDi0) < 1e-9 && onlyCave.fur === true,
    f4(both) + ' vs 单宗门 ' + f4(pDi1));
  ok('§1 传位后自动摘除', afterSucc.lv === 0 && afterSucc.fur === false && Math.abs(afterSucc.p - pDi0) < 1e-9,
    JSON.stringify([afterSucc.lv, afterSucc.fur, f4(afterSucc.p)]));
}

/* ── 2) 宗规三倾向 → 藏经阁弟子传法子集 ─────────────────────── */
console.log('');
console.log('==== §2 功法子集（sect.js 藏经阁槽位 min 收窄）====');
const ARTSET = ['qingxin', 'tiebi', 'posha'];            /* 2 正道 + 1 魔道 */
const alignOfArt = (id) => SQ.XARTS[id].alignment;
console.log('持功法集            ', ARTSET.map((id) => id + '(' + alignOfArt(id) + ')').join(' '));
console.log('ART_ALLOW           ', JSON.stringify(SC.ART_ALLOW), '‖ ART_SLOTS[3] =', SC.ART_SLOTS[3],
  '‖ ART_POWER =', SC.ART_POWER);
const pow = {}, slots = {}, elig = {}, sectP = {}, merit = {}, merit4 = {};
['right', 'neutral', 'evil'].forEach((a) => {
  const w = mkSectWs(a);
  elig[a] = w.artsKnown.filter((id) => SC.ART_ALLOW[a].indexOf(alignOfArt(id)) >= 0).length;
  slots[a] = SQ.Sect.zangjingSlots(w, pack, SC);
  pow[a] = SQ.Sect.discPower(w, pack, D, w.sect.disciples[0]);
  sectP[a] = SQ.Sect.sectPower(w, pack, D, null);
  /* 战功口径 = floor(弟子战力 / P[4]=1600) × WAR_DISC_K —— realm4 弟子的 8% 槽差被 floor 吃掉
   * （1856 与 1728 同落 1 档），故另造 realm8 弟子证明战功面确实随子集位移。 */
  w.sect.disciples.push({ id: 'd2', nm: [1, 1], tier: 'mid', realm: 8, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false });
  merit[a] = SQ.Sect.discipleMerit(w, pack, D);
  merit4[a] = (function () { const z = mkSectWs(a); return SQ.Sect.discipleMerit(z, pack, D); })();
  console.log(a.padEnd(8), '合格功法', elig[a], '/ 持', w.artsKnown.length, '→ 槽数', slots[a],
    '弟子战力', pow[a].toFixed(2), '宗门战力', sectP[a].toFixed(2),
    '战功(realm4 单弟子)', merit4[a], '/ 战功(+realm8 弟子)', merit[a]);
});
{
  const base = D.REALMS[4].power * SC.APT_MULT.mid;
  const expRight = base * (1 + Math.min(SC.ART_SLOTS[3], elig.right) * SC.ART_POWER);
  const expEvil = base * (1 + Math.min(SC.ART_SLOTS[3], elig.evil) * SC.ART_POWER);
  console.log('公式对表            ', 'base', base.toFixed(2), '× (1+槽×0.08) → right', expRight.toFixed(2),
    '/ evil', expEvil.toFixed(2));
  /* 只收窄不放大 + 零持功法 */
  const w1 = mkSectWs('neutral', ['tiebi']); w1.sect.fac.zangjing = 5;
  const w0 = mkSectWs('neutral', []); w0.sect.fac.zangjing = 5;
  console.log('只收窄不放大        ', '满级 3 槽 × 持 1 部 →', SQ.Sect.zangjingSlots(w1, pack, SC),
    '槽；持 0 部 →', SQ.Sect.zangjingSlots(w0, pack, SC), '槽');
  /* 不锁宗主自己：魔道宗门宗主槽内正道功法效果 = 无宗门档全等 */
  const slotOf = (a) => {
    const w = mkSectWs(a);
    w.artsSlots = ['tiebi']; w.artsLevels = { tiebi: 3 };
    return SQ.Mods.collect({ talents: [] }, w, pack, D).sum.combatPower;
  };
  const noSect = (function () { const w = pack.normalize(pack.initialState());
    w.artsKnown = ARTSET.slice(); w.artsSlots = ['tiebi']; w.artsLevels = { tiebi: 3 };
    return SQ.Mods.collect({ talents: [] }, w, pack, D).sum.combatPower; })();
  const sr = slotOf('right'), se = slotOf('evil');
  console.log('宗主自己零锁         ', 'mods.sum.combatPower 正道宗', sr, '/ 魔道宗', se, '/ 无宗门', noSect);
  /* 供奉挂名不传法 */
  const offP = {};
  ['right', 'evil'].forEach((a) => { const w = mkSectWs(a);
    w.sect.disciples = [{ id: 'd9', nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: pack.companions[0].id }];
    offP[a] = SQ.Sect.discPower(w, pack, D, w.sect.disciples[0]); });
  console.log('供奉零波及          ', 'right', offP.right.toFixed(2), '/ evil', offP.evil.toFixed(2));

  ok('§2 同持功法集 right vs evil 战力不同', pow.right !== pow.evil && slots.right === 2 && slots.evil === 1 &&
    Math.abs(pow.right - expRight) < 1e-9 && Math.abs(pow.evil - expEvil) < 1e-9,
    pow.right.toFixed(2) + ' vs ' + pow.evil.toFixed(2));
  ok('§2 左道不限（与正道同档、合格数 3 不放大槽位）', pow.neutral === pow.right && elig.neutral === 3 && slots.neutral === 2,
    slots.neutral + '/' + SC.ART_SLOTS[3]);
  ok('§2 宗门战力与战功随子集同步位移', sectP.right !== sectP.evil && merit.right !== merit.evil &&
    merit4.right === merit4.evil,
    'sectPower ' + sectP.right.toFixed(2) + '/' + sectP.evil.toFixed(2) +
    ' · merit ' + merit.right + '/' + merit.evil + ' · realm4 层 floor 同档 ' + merit4.right + '/' + merit4.evil);
  ok('§2 只收窄不放大（1 部 → 1 槽 / 0 部 → 0 槽）',
    SQ.Sect.zangjingSlots(w1, pack, SC) === 1 && SQ.Sect.zangjingSlots(w0, pack, SC) === 0,
    SQ.Sect.zangjingSlots(w1, pack, SC) + '/' + SQ.Sect.zangjingSlots(w0, pack, SC));
  ok('§2 不锁宗主自己（乘区三档全等）', sr === se && se === noSect && sr > 0, sr + '/' + se + '/' + noSect);
  ok('§2 供奉挂名不传法（两档全等）', offP.right === offP.evil, offP.right.toFixed(2));
}

/* ── 3) 宗规三倾向 → 天道态度 ───────────────────────────────── */
console.log('');
console.log('==== §3 天道态度（tiandao.js 判词分组 · 零机制）====');
{
  const warPool = [];
  for (let i = 1; i <= TD.OMEN_TPL_N.war; i++) warPool.push(SQ.t('tiandao.skyomen.war.' + i, { a: '甲家', b: '乙家' }, 'xiuxian'));
  const out = {};
  ['right', 'neutral', 'evil'].forEach((a) => {
    const w = mkSectWs(a);
    w.sect.name = '试剑宗';
    const mechSnap = (x) => JSON.stringify({ s: x.stones, q: x.qi, k: x.karmaEventScore,
      t: x.tribulation, d: x.tiandao.defy, m: x.materials, f: x.factionWar });
    const b0 = mechSnap(w);
    const txt = SQ.Tiandao.pushOmen(w, pack, D, 'war', { a: '甲家', b: '乙家' }, Date.now());
    const b1 = mechSnap(w);
    const noteLen = a === 'neutral' ? 0 : (' ' + SQ.t('tiandao.sectomen.' + a, { name: '试剑宗' }, 'xiuxian')).length;
    const stripped = txt.slice(0, txt.length - noteLen);
    out[a] = {
      txt, len: w.tiandao.omenQueue.length, inPool: warPool.indexOf(stripped) >= 0,
      note: txt.slice(stripped.length), same: b0 === b1, diff: b0 === b1 ? '' : (b0 + ' ⇄ ' + b1)
    };
    console.log(a.padEnd(8), '天象 →', txt);
    console.log('  └ 队列', out[a].len, '条 · 正文剥按语命中 war 池 =', out[a].inPool,
      '· 机制零改动 =', out[a].same, out[a].diff);
  });
  ['sectfound', 'sectwin', 'sectsucc'].forEach((k) => {
    const line = ['right', 'neutral', 'evil'].map((a) => {
      const w = mkSectWs(a); w.sect.name = '试剑宗';
      return a + ': ' + SQ.Tiandao.chronText(w, pack, D, { k: k, v: { name: '试剑宗', heir: '长风' } });
    });
    console.log('编年史', k);
    line.forEach((l) => console.log('  ', l));
  });
  console.log('白名单零扩          ', 'OMEN_NODES', TD.OMEN_NODES.length, JSON.stringify(TD.OMEN_NODES),
    '· 模板池 Σ', Object.keys(TD.OMEN_TPL_N).reduce((s, k) => s + TD.OMEN_TPL_N[k], 0));

  ok('§3 宗规改变天象输出（right ≠ evil ≠ neutral 三份正文）',
    out.right.txt !== out.evil.txt && out.neutral.txt !== out.evil.txt && out.neutral.txt !== out.right.txt);
  ok('§3 按语只挂正道/魔道，左道 = 基准模板原样', out.neutral.note === '' &&
    out.right.note.indexOf('试剑宗') >= 0 && out.evil.note.indexOf('试剑宗') >= 0 &&
    out.right.note !== out.evil.note, JSON.stringify([out.neutral.note, out.right.note.slice(0, 4), out.evil.note.slice(0, 4)]));
  ok('§3 基准模板池零漂移（剥按语后逐字命中 war 13 条池）',
    out.right.inPool && out.neutral.inPool && out.evil.inPool);
  ok('§3 零机制（stones/qi/karma/tribulation/defy 全等 · 队列仍 +1 条）',
    out.right.same && out.neutral.same && out.evil.same &&
    out.right.len === 1 && out.neutral.len === 1 && out.evil.len === 1);
  ok('§3 编年史三条措辞 × 三档两两不同', (function () {
    const seen = {};
    return ['sectfound', 'sectwin', 'sectsucc'].every((k) => {
      const set = ['right', 'neutral', 'evil'].map((a) => {
        const w = mkSectWs(a); w.sect.name = '试剑宗';
        return SQ.Tiandao.chronText(w, pack, D, { k: k, v: { name: '试剑宗', heir: '长风' } });
      });
      if (new Set(set).size !== 3) return false;
      set.forEach((s) => { if (!s || s.indexOf('试剑宗') < 0) return false; });
      seen[k] = set;
      return true;
    });
  })());
  ok('§3 OMEN_NODES 仅由 N4 扩至 8 节点（`prodrank` = 榜位换位位；宗门态度本身**不新增节点**，原「仍 7 节点」判据随玩法闭环批改窄 · 2026-10-07）',
    TD.OMEN_NODES.length === 8 && TD.OMEN_NODES.join() === 'tribwin,tribfail,break,clear,karma,war,rebirth,prodrank');
}

/* ── 收口 ─────────────────────────────────────────────────── */
console.log('');
let fails = 0;
R.forEach((r, i) => {
  console.log((r.ok ? 'PASS ' : 'FAIL ') + '[' + (i + 1) + '] ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  if (!r.ok) fails++;
});
console.log(fails ? 'SECTWIRE_FAILED ' + fails : 'SECTWIRE_ALL_GREEN ' + R.length + '/' + R.length);
process.exit(fails ? 1 : 0);
