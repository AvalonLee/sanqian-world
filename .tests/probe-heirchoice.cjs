/* .tests/probe-heirchoice.cjs — 真灵承继「玩家可选一件」执行探针（承继选择入口批）
 *
 * 为什么需要它：轮回卷 §3.4 正典是「每世转世时**可选一件**已觉醒器灵的法宝带入下世」，
 * 而现行代码只有「自动取 owned 里第一件已觉醒者」这一条路（该卷唯一残留项）。
 * 新增 meta.heirChoice 三态（null 未择定 / 法宝 id 择定 / 'none' 显式不带）后，
 * 冒烟 #259 只守「未择定 ⇒ 自动口径」这一半，**择定与降级两半无人守**——本探针把三条都跑到
 * 出账端（下世 owned + st.spirit 实态），不是查读。定稿后由后续批转为永久冒烟断言 #261。
 *
 * 用法：node .tests/probe-heirchoice.cjs
 *      末行 PROBE_HEIRCHOICE_ALL_GREEN n/n 或 PROBE_HEIRCHOICE_FAILED k
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ, localStorage } = load([], { quiet: true });
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;
const T0 = 1700000000000;

const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail || '' });
const noopLog = () => function () {};
const mkProf = () => ({ name: 't', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: T0 });
/* 序列化字节（UTF-8 口径，与 core.js strBytes 同式：>0x7f 计多字节） */
const bytes = (o) => {
  const s = typeof o === 'string' ? o : JSON.stringify(o);
  let n = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c > 0x7ff ? 3 : (c > 0x7f ? 2 : 1); }
  return n;
};
const ownOf = (w, id) => { let e = null; (((w || {}).treasures || {}).owned || []).forEach((x) => { if (x.id === id) e = x; }); return e; };
const ownedIds = (w) => (((w || {}).treasures || {}).owned || []).map((x) => x.id).join(',');
const awakenedOf = (w) => (((w || {}).treasures || {}).owned || []).filter((e) => e.st && e.st.spirit && e.st.spirit.a).map((e) => e.id);
const identOk = (m) => m.karma === Object.keys(m.earnedKeys).reduce((a, k) => a + m.earnedKeys[k], 0)
  - Object.keys(m.spent).reduce((a, k) => a + m.spent[k], 0);

/* 候选构造：取 5 件阶下品（NEED.liang 最低档）——其中 3 件祭出后真温养到觉醒（spirit.a=1、人格随机掷定），
 * 第 4 件只写 .awake（全库零写入方的假觉醒字段，恒不为候选），第 5 件纯裸件。 */
const POOL = [];
Object.keys(pack.treasures.byId).forEach((id) => {
  const def = pack.treasures.byId[id];
  if (def.grade === 'liang' && def.kind !== 'xian' && POOL.length < 5) POOL.push(id);
});
const [RAW, FAKE, AWK1, AWK2, AWK3] = POOL;
const NEED_LIANG = (D.SPIRIT.NEED || {}).liang || 300;

/* 造一个「已购 shop.heir + 三件真觉醒 + 一件假觉醒 + 一件裸件」的可转世档 */
function mkLife(heirChoice) {
  const w = pack.initialState();
  w.realm = 9;
  const s = { v: SQ.V, profile: mkProf(), worlds: { xiuxian: w }, meta: SQ.Legacy.metaBlank() };
  pack.recalcDerived(w, s.profile);
  [RAW, FAKE, AWK1, AWK2, AWK3].forEach((id) => SQ.Treasures.gain(w, pack, D, id, noopLog()));
  ownOf(w, FAKE).st.spirit = { awake: 1, a: 0, w: 0 };
  [AWK1, AWK2, AWK3].forEach((id) => SQ.Treasures.equip(w, pack, D, id, noopLog()));
  SQ.Fusion.warm(w, pack, D, NEED_LIANG + 50, T0, noopLog());   /* 三件同批越线 → 三件全觉醒 */
  SQ.Legacy.earnOnce(s.meta, 'probe.grant', 9000, 'probe', T0);
  SQ.Legacy.buy(s, 'heir', T0 + 1);
  /* 择定经 metaNormalize 收口后再入档（与真档读入同径：脏值先被清成 null，不绕过校验直塞） */
  s.meta.heirChoice = SQ.Legacy.metaNormalize({ heirChoice: heirChoice }).heirChoice;
  return s;
}

(async () => {
  let kNull = 0, kReal = 0, kWorst = 0;                       /* §7a 键位预算，供末尾字节账打印 */
  if (POOL.length < 5) { console.log('FAIL 候选池构造（liang 阶不足 5 件） ' + POOL.join(',')); process.exit(1); }

  /* ══ 1) 资格与候选同源口（视图入口与本模块选件共用一颗判据）════════════ */
  {
    const s = mkLife(null);
    const cands = SQ.Legacy.heirCandidates(s.worlds.xiuxian, pack);
    const ids = cands.map((c) => c.id).join(',');
    ok('1a 未购 shop.heir ⇒ heirEligible=false（零打扰）',
      SQ.Legacy.heirEligible(SQ.Legacy.metaBlank()) === false && SQ.Legacy.heirEligible({ spent: { 'shop.heir': 600 } }) === true);
    ok('1b 候选 = 三件真觉醒、保 owned 原序、假觉醒与裸件均不入', ids === [AWK1, AWK2, AWK3].join(','),
      'cands=' + ids + ' owned=' + ownedIds(s.worlds.xiuxian));
    ok('1c 候选项带 def/sp（视图零自造判据、温养分母可取）', cands.every((c) => c.def && c.sp && c.sp.a === 1));
    ok('1d 空态零抛出（视图「零候选不弹层」分支的前提）',
      SQ.Legacy.heirCandidates(null, null).length === 0 && SQ.Legacy.heirCandidates({}, undefined).length === 0);
  }

  /* ══ 2) (a) 择定生效：heirChoice 指向仍觉醒件 ⇒ 就带它、快照随件下世 ═════ */
  {
    const s = mkLife(AWK3);                                 /* 故意选第 3 件——自动口径会给 AWK1 */
    const autoWouldBe = awakenedOf(s.worlds.xiuxian)[0];
    SQ.Legacy.rebirth(s, 'bingjie', T0 + 2);
    const m = s.meta;
    const ent = ownOf(s.worlds.xiuxian, AWK3);
    const sp = ent && ent.st && ent.st.spirit;
    ok('2a 择定件成为 meta.heirTreasure（不是自动第一件）',
      m.heirTreasure === AWK3 && autoWouldBe === AWK1 && AWK3 !== autoWouldBe,
      'pick=' + AWK3 + ' auto=' + autoWouldBe + ' heir=' + m.heirTreasure);
    ok('2b 下世 owned 含该件', !!ent, 'owned=' + ownedIds(s.worlds.xiuxian));
    ok('2c 器灵快照逐字段随件落地（a/p/w 同 + heir=1 ru=0）',
      !!sp && sp.a === 1 && sp.p === m.heirSpirit.p && sp.w === m.heirSpirit.w && sp.heir === 1 && sp.ru === 0,
      'snap=' + JSON.stringify(m.heirSpirit) + ' next=' + JSON.stringify(sp));
    ok('2d 冷却类字段不带世（cd/mk/hun=0、vt 空）',
      !!sp && sp.cd === 0 && sp.mk === 0 && sp.hun === 0 && Object.keys(sp.vt || {}).length === 0,
      'cd/mk/hun=' + (sp ? [sp.cd, sp.mk, sp.hun].join('/') : 'nil'));
    ok('2e 择定是一次世意图：消费后 heirChoice 归 null', m.heirChoice === null, 'hc=' + m.heirChoice);
    ok('2f 恒等式 #197 续绿', identOk(m), 'karma=' + m.karma);
  }

  /* ══ 3) (b) 脏选降级：stale / 未觉醒 / 不存在 / 类型脏 ⇒ 回落自动口径，绝不全无 ══ */
  {
    const dirtyCases = [
      ['未觉醒裸件 id', RAW],
      ['假觉醒（只写 .awake）件 id', FAKE],
      ['不存在于法宝表的 garbage id', 'zz9'],
      ['数字 7', 7],
      ['数组', [AWK2]],
      ['对象', { id: AWK2 }],
      ['布尔 true', true],
      ['空串', '']
    ];
    let degraded = true, crashed = '', results = [];
    dirtyCases.forEach((c) => {
      try {
        const s = mkLife(c[1]);
        const want = awakenedOf(s.worlds.xiuxian)[0];        /* 自动口径 = owned 里第一件已觉醒者 */
        SQ.Legacy.rebirth(s, 'bingjie', T0 + 3);
        if (s.meta.heirTreasure !== want || !ownOf(s.worlds.xiuxian, want)) degraded = false;
        results.push(s.meta.heirTreasure);
      } catch (e) { crashed += c[0] + ':' + e.message + ' '; }
    });
    ok('3a 脏选八例全部降级为「取第一件已觉醒者」、零抛出、零空手', degraded && !crashed,
      'results=' + results.join(',') + ' expected=' + AWK1 + (crashed ? ' THREW=' + crashed : ''));
    {
      const s = mkLife(null);                                /* 未择定 ⇒ 与改造前逐字同径（#259 口径不动） */
      SQ.Legacy.rebirth(s, 'bingjie', T0 + 4);
      ok('3b 未择定默认口径零改动', s.meta.heirTreasure === AWK1 && !!ownOf(s.worlds.xiuxian, AWK1),
        'heir=' + s.meta.heirTreasure);
    }
    {
      const s = mkLife(AWK2);
      SQ.Legacy.rebirth(s, 'bingjie', T0 + 5);               /* 一世带 AWK2 */
      const wokeAlive = awakenedOf(s.worlds.xiuxian).length;
      s.meta.heirChoice = 'zzz';                             /* 二世择了个不存在的 */
      SQ.Legacy.rebirth(s, 'bingjie', T0 + 6);
      ok('3c 脏选 + 在档件 ⇒ 续带在档件（绝不退化为空手）',
        s.meta.heirTreasure === AWK2 && !!ownOf(s.worlds.xiuxian, AWK2),
        '一世下世仍觉醒=' + wokeAlive + ' heir=' + s.meta.heirTreasure + ' owned=' + ownedIds(s.worlds.xiuxian));
    }
    {
      const s = mkLife(AWK3);
      s.meta.spent = {};                                     /* 未购资格却塞了择定（脏档/退款档）*/
      SQ.Legacy.rebirth(s, 'bingjie', T0 + 7);
      ok('3d 无资格档择定不生效且被消费清空（不越 600 遗泽的闸门）',
        s.meta.heirTreasure === null && s.meta.heirChoice === null && ownedIds(s.worlds.xiuxian) === '',
        'heir=' + s.meta.heirTreasure + ' owned="' + ownedIds(s.worlds.xiuxian) + '"');
    }
  }

  /* ══ 4) 显式「不带器灵转世」(HEIR_NONE) 与「换一件」覆写 ═════════════════ */
  {
    const none = SQ.Legacy.HEIR_NONE;
    const s = mkLife(none);
    SQ.Legacy.rebirth(s, 'bingjie', T0 + 8);
    ok('4a 显式不带 ⇒ heirTreasure/heirSpirit 双清、下世不预置承继件',
      none === 'none' && s.meta.heirTreasure === null && s.meta.heirSpirit === null && ownedIds(s.worlds.xiuxian) === '',
      'heir=' + s.meta.heirTreasure + ' owned="' + ownedIds(s.worlds.xiuxian) + '"');
    /* 下世重新攒出觉醒件 + 回到未择定 ⇒ 自动口径必须复活（哨兵是一次性意图、不永久关死承继） */
    const w2 = s.worlds.xiuxian;
    w2.realm = 9; pack.recalcDerived(w2, s.profile);
    [AWK1, AWK3].forEach((id) => SQ.Treasures.gain(w2, pack, D, id, noopLog()));
    [AWK1, AWK3].forEach((id) => SQ.Treasures.equip(w2, pack, D, id, noopLog()));
    SQ.Fusion.warm(w2, pack, D, NEED_LIANG + 50, T0 + 9, noopLog());
    SQ.Legacy.rebirth(s, 'bingjie', T0 + 10);
    ok('4b 不带之后下一世自动口径照旧（哨兵不粘连）',
      s.meta.heirChoice === null && s.meta.heirTreasure === AWK1 && ownedIds(s.worlds.xiuxian) === AWK1,
      're-woke=' + awakenedOf(w2).join(',') + ' heir=' + s.meta.heirTreasure + ' owned=' + ownedIds(s.worlds.xiuxian));

    /* 「换一件」正题：在档已登记 A 件、本世又养出 B 件 ⇒ 择定 B 覆写 A（改造前 `!heirTreasure` 恒不重选） */
    const s2 = mkLife(null);
    SQ.Legacy.rebirth(s2, 'bingjie', T0 + 11);                 /* 一世未择定 ⇒ 自动带 AWK1 */
    const w3 = s2.worlds.xiuxian;
    w3.realm = 9; pack.recalcDerived(w3, s2.profile);
    SQ.Treasures.gain(w3, pack, D, AWK3, noopLog());
    SQ.Treasures.equip(w3, pack, D, AWK3, noopLog());
    SQ.Fusion.warm(w3, pack, D, NEED_LIANG + 50, T0 + 12, noopLog());
    const first = s2.meta.heirTreasure, bothAwake = awakenedOf(w3);
    s2.meta.heirChoice = AWK3;
    SQ.Legacy.rebirth(s2, 'bingjie', T0 + 13);
    ok('4c 换一件覆写生效（在档件被择定件替换）',
      first === AWK1 && bothAwake.length === 2 && s2.meta.heirTreasure === AWK3,
      'first=' + first + ' 本世觉醒=' + bothAwake.join(',') + ' now=' + s2.meta.heirTreasure);
    ok('4d 换一件后旧件不残留（下世 owned 恰 1 件 = 只此一件不叠加）',
      ownedIds(s2.worlds.xiuxian) === AWK3 && ((s2.worlds.xiuxian.treasures || {}).owned || []).length === 1,
      'owned=' + ownedIds(s2.worlds.xiuxian));
  }

  /* ══ 5) (c) normalize：三态收口 + 截长 + 幂等 + 缺省在位 ═════════════════ */
  {
    const blank = SQ.Legacy.metaBlank();
    ok('5a metaBlank 缺省字段在位（null）',
      Object.prototype.hasOwnProperty.call(blank, 'heirChoice') && blank.heirChoice === null);
    const drops = [7, 0, -1, true, false, NaN, null, undefined, '', [], {}, { a: 1 }, ['x01'], 1e9];
    const dropBad = drops.filter((v) => SQ.Legacy.metaNormalize({ heirChoice: v }).heirChoice !== null);
    ok('5b 非字符串/空值一律丢为 null（= 未择定 = 原自动口径）', dropBad.length === 0, 'bad=' + JSON.stringify(dropBad));
    ok('5c 合法 id 保留', SQ.Legacy.metaNormalize({ heirChoice: AWK2 }).heirChoice === AWK2);
    ok('5d 哨兵保留（显式「不带」是合法选择、不是脏值）', SQ.Legacy.metaNormalize({ heirChoice: 'none' }).heirChoice === 'none');
    const long = SQ.Legacy.metaNormalize({ heirChoice: '0123456789abcdefghij' }).heirChoice;
    ok('5e 超长截到 16 字符（meta 层世界无关：只截不判存在性，与 heirTreasure 同口径）',
      long.length === 16 && long === '0123456789abcdef', 'v=' + long);
    const once = SQ.Legacy.metaNormalize({ heirChoice: 'x01' });
    ok('5f 幂等（二次 normalize 逐字同值）', JSON.stringify(SQ.Legacy.metaNormalize(once)) === JSON.stringify(once));
    ok('5g 旧档无该键 → null（零迁移脚本）', SQ.Legacy.metaNormalize({ karma: 0, earnedKeys: {}, spent: {} }).heirChoice === null);
  }

  /* ══ 6) (d) 只此一件 · 不叠加：三世连转不累积、下世恒一件、择定恒已清 ═══ */
  {
    const s = mkLife(AWK2);
    const seq = [];
    for (let i = 0; i < 3; i++) {
      SQ.Legacy.rebirth(s, 'bingjie', T0 + 20 + i);
      const w = s.worlds.xiuxian;
      w.realm = 9; pack.recalcDerived(w, s.profile);
      seq.push([s.meta.heirTreasure, ((w.treasures || {}).owned || []).length, s.meta.heirChoice]);
    }
    ok('6a 三世连转：heirTreasure 恒单值、下世 owned 恒 1 件、heirChoice 恒已清',
      seq.every((x) => x[0] === AWK2 && x[1] === 1 && x[2] === null), 'seq=' + JSON.stringify(seq));
    ok('6b 恒等式 #197 三世后仍成立', identOk(s.meta), 'karma=' + s.meta.karma + ' lives=' + s.meta.stats.lives);
    ok('6c 脏档重放（pendingRebirth 中断恢复）择定不丢失、重放后才清空', (() => {
      const r = mkLife(AWK3);
      r.meta.pendingRebirth = { channel: 'bingjie', at: T0 + 30, expectLives: 1, bio: null, total: 0 };
      SQ.Legacy.finishRebirth(r, T0 + 31);
      return r.meta.heirTreasure === AWK3 && r.meta.heirChoice === null &&
        r.meta.pendingRebirth === null && ownedIds(r.worlds.xiuxian) === AWK3;
    })(), 'heir=' + AWK3 + ' 择定随件下世、重放零空手');
  }

  /* ══ 7) (e) 存档预算：heirChoice 最坏态字节 + 真机落盘口实测 ═══════════ */
  {
    const base = SQ.Legacy.metaBlank();
    delete base.heirChoice;                                  /* 改造前的同档基线（无此键）*/
    const withBase = bytes(JSON.stringify(Object.assign(SQ.Legacy.metaBlank(), { heirChoice: null })));
    const nullKey = withBase - bytes(JSON.stringify(base));
    const realKey = bytes(JSON.stringify(Object.assign(SQ.Legacy.metaBlank(), { heirChoice: AWK1 }))) - withBase;
    const worstKey = bytes(JSON.stringify(Object.assign(SQ.Legacy.metaBlank(), { heirChoice: '0123456789abcdef' }))) - withBase;
    ok('7a 键位预算：占位 + 截长上界合计 ≤ 40B（单字段不构成容量风险）',
      nullKey === 18 && realKey > 0 && worstKey > realKey && nullKey + worstKey <= 40,
      '占位(键+null)=' + nullKey + 'B 典型(3 字 id)=+' + realKey + 'B 上界(16 字)=+' + worstKey +
      'B ⇒ 单字段最坏态合计 ' + (nullKey + worstKey) + 'B');
    kNull = nullKey; kReal = realKey; kWorst = worstKey;
  }

  /* 真机落盘口：SQ.save 走完整压缩阶梯 → 回读 localStorage 主档实际字节，测同档加 heirChoice 的净增 */
  {
    const s = mkLife(null);
    const w = s.worlds.xiuxian;
    w.cleared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    s.meta.heirTreasure = AWK1;
    s.meta.heirSpirit = SQ.Fusion.heirSnapshot(ownOf(w, AWK1).st.spirit);
    await SQ.save(s);                                        /* 档内已含 heirChoice:null 占位 */
    const bare = bytes(localStorage.getItem(SQ.KEY));
    s.meta.heirChoice = '0123456789abcdef';
    await SQ.save(s);
    const worst = bytes(localStorage.getItem(SQ.KEY));
    s.meta.heirChoice = AWK1;
    await SQ.save(s);
    const typical = bytes(localStorage.getItem(SQ.KEY));
    const red = SQ.SAVE_RED, delta = worst - bare, total = kNull + kWorst;
    ok('7b 真机主档净增 = 键位上界（压缩阶梯未被新级触发）', delta === kWorst && typical - bare === kReal,
      '主档 未带值=' + bare + 'B 截长上界=' + worst + 'B(+' + delta + 'B) 典型值=' + typical + 'B(+' + (typical - bare) + 'B)');
    /* 账本基线 = 冒烟 #206 本次实测落盘 60789B（红线 65536B、余量 4747B）；本字段最坏态整体侵蚀 = 占位 + 上界 */
    const LEDGER206 = 60789, newWorst = LEDGER206 + total;
    ok('7c 对 #206 最坏态余量的侵蚀 ≤ 32B、不触红线', newWorst < red && (red - newWorst) >= 4700,
      '#206 落盘 ' + LEDGER206 + 'B → 加本字段最坏态 ' + newWorst + 'B（侵蚀 +' + total + 'B）‖ 红线 ' + red +
      'B 余量 4747B → ' + (red - newWorst) + 'B');
    console.log('  ── 承继择定字段字节账（实测）──');
    console.log('  占位（键 + null，每档恒在） = ' + kNull + 'B');
    console.log('  典型值（3 字法宝 id）        = +' + kReal + 'B');
    console.log('  normalize 截长上界（16 字）  = +' + kWorst + 'B');
    console.log('  **最坏态合计**               = +' + total + 'B/档');
    console.log('  真机 SQ.save 往返净增        = +' + delta + 'B（同档只改这一个字段）');
    console.log('  红线余量（对 #206 基线）     = ' + ((red - newWorst) / 1024).toFixed(2) + 'KB（' + (red - newWorst) + 'B）');
  }

  /* ── 报告 ── */
  let fail = 0;
  R.forEach((r) => {
    if (!r.ok) fail++;
    console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  });
  console.log(fail === 0 ? 'PROBE_HEIRCHOICE_ALL_GREEN ' + R.length + '/' + R.length : 'PROBE_HEIRCHOICE_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('PROBE_ERROR', e && e.message); console.error(e && e.stack); process.exit(2); });
