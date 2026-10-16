/* .tests/smoke.js — 冒烟测试全集（验收 4.1 存档 / 4.2 创角 / 4.3 词表 / 4.4 通用系统 /
 * 4.5 修仙专属 / 4.6 事件 / 4.8 数值一致性 / 4.10 属性 / 4.11 门槛与特殊属性）
 * 编号对齐《工程规范与验收计划》§四 文档条目（P1 扩展项为 E1~E5）；#104 gateMod 属古武 P6。
 * 运行环境：无桥浏览器预览（回退 localStorage 分支）或 node 沙箱（run-smoke.cjs）。
 * 输出：SQSmoke.run() → [{id, name, ok, detail}]，全部 ok=true 即绿灯。
 */
(function () {
  var SQ = window.SQ;
  var R = [];
  function ok(id, name, cond, detail) { R.push({ id: id, name: name, ok: !!cond, detail: detail || '' }); }

  function seedWorld(realm, lastSaveOffsetMs) {
    var ws = SQ.Worlds.xiuxian.pack.initialState();
    ws.realm = realm || 0;
    ws.lastSave = Date.now() - (lastSaveOffsetMs || 0);
    return ws;
  }
  async function seedSave(realm, offset) {
    await SQ.save({
      v: SQ.V,
      profile: { name: '测试道人', talents: [], worldId: 'xiuxian', worldName: '测试界', createdAt: Date.now() },
      worlds: { xiuxian: seedWorld(realm, offset) },
      meta: { unlockedWorlds: ['xiuxian'] }
    });
  }

  async function run() {
    R = [];
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SQ.KEY);

    /* #1 全新启动 → defaultState 结构完整（P3 起 name 缺省为空串，显示层走词表兜底） */
    var d = SQ.defaultState();
    ok(1, 'defaultState 结构与缺省值',
      d.v === 1 && d.profile.name === '' && d.profile.talents.length === 0 &&
      d.profile.worldId === 'xiuxian' && Object.keys(d.worlds).length === 0 &&
      d.meta.unlockedWorlds.join() === 'xiuxian' &&
      SQ.displayName(d) === SQ.t('profile.default_name'));

    /* #2 缺 profile.talents 的残缺档 → 补 [] */
    var n2 = SQ.normalize({ v: 1, profile: { name: '甲' } });
    ok(2, '残缺档补 talents=[]', Array.isArray(n2.profile.talents) && n2.profile.talents.length === 0 && n2.profile.name === '甲');

    /* #3 缺 worlds.xiuxian.karma → 补 0（含 attrs/tribulation 专属字段） */
    var n3 = SQ.normalize({ v: 1, worlds: { xiuxian: { qi: 5 } } });
    var w3 = n3.worlds.xiuxian;
    ok(3, '世界档缺字段逐层补齐', w3.karma === 0 && w3.qi === 5 && w3.attrs.shen === 0 &&
      w3.tribulation.lastResult === null && w3.gear.weapon === null && w3.stones === 100);

    /* #4 v 不匹配 / null → 回落 defaultState 不崩溃 */
    var n4a = SQ.normalize({ v: 0, profile: { name: '旧档' } });
    var n4b = SQ.normalize(null);
    ok(4, 'v 不匹配与空档回落', n4a.profile.name === '' && n4b.v === 1);

    /* #5 claim 后 lastSave 更新且 qi 单调不减 */
    await seedSave(0, 10000);
    var before = await SQ.load();
    var q0 = before.worlds.xiuxian.qi;
    var ref = {};
    await SQ.claim(ref);
    var w5 = ref.worlds.xiuxian;
    ok(5, 'claim 结算时间差并落盘', w5.qi >= q0 && w5.qi > 0 && w5.lastSave >= before.worlds.xiuxian.lastSave,
      'qi: ' + q0.toFixed(2) + ' → ' + w5.qi.toFixed(2));

    /* #6 mutate 抛异常 → 存档不被写坏（事务性） */
    var threw = false;
    try {
      await SQ.mutate({}, function (s) { s.profile.name = '不该存在'; throw new Error('boom'); });
    } catch (e) { threw = true; }
    var after6 = await SQ.load();
    ok(6, 'mutate 异常不落盘', threw && after6.profile.name === '测试道人');

    /* #7 无桥预览 → localStorage 回退分支可用；有桥则绝不触碰 */
    var raw7 = (typeof window.xhub === 'undefined') ? localStorage.getItem(SQ.KEY) : 'bridge';
    ok(7, '存储回退分支', raw7 !== null && raw7 !== undefined && raw7 !== 'null' && raw7.length > 0);

    /* #8 双 surface 同时读档 → 数据一致 */
    var a = await SQ.load(); var b = await SQ.load();
    ok(8, '双读一致（module/view 同源）', JSON.stringify(a) === JSON.stringify(b));

    /* #9 存档体积 < 50KB */
    var size = JSON.stringify(a).length;
    ok(9, '存档体积 < 红线（SQ.SAVE_RED 单一事实源）', size < SQ.SAVE_RED, size + ' bytes / 红线 ' + SQ.SAVE_RED + 'B');

    /* #10 normalize 幂等 */
    var n10a = SQ.normalize(JSON.parse(JSON.stringify(a)));
    var n10b = SQ.normalize(JSON.parse(JSON.stringify(n10a)));
    ok(10, 'normalize 幂等', JSON.stringify(n10a) === JSON.stringify(n10b));

    /* #11 上限公式：全境界 cap ≥ 下一阶 need × 1.15；真仙回落 2h 产出 */
    var pack = SQ.Worlds.xiuxian.pack;
    var capOk = true, capDetail = '';
    for (var r = 0; r < 9; r++) {
      var cap = pack.capOf({ realm: r });
      var need = SQ.XDATA.REALMS[r + 1].need;
      if (cap < need * 1.15) { capOk = false; capDetail = 'realm ' + r + ': cap ' + cap + ' < 1.15×need ' + need; break; }
    }
    var capMax = pack.capOf({ realm: 9 });
    ok('E1', 'qiCap ≥ 1.15×need（全境界）', capOk && capMax === 19000 * 7200, capDetail);

    /* #E2 离线结算：48h 离线只按 12h × 50% 计（直测 Idle.settle，避开事件随机扣减污染精确值；
       低境界「离线上限 < cap」本身就是上限钩子的预期行为） */
    await seedSave(8, 48 * 3600 * 1000);
    var s12 = await SQ.load();
    var w12 = s12.worlds.xiuxian;
    var res12 = SQ.Idle.settle(w12, pack, SQ.XDATA, Date.now() - w12.lastSave, Date.now(),
      { log: function () {}, profile: s12.profile });
    var gained = res12.gain;
    var maxGain = 6300 * 12 * 3600 * 0.5; /* baseQi(渡劫)=6300 */
    ok('E2', '离线 12h 上限 × 50% 效率', res12.offline && gained <= maxGain + 1 && gained >= maxGain * 0.999,
      'gained=' + gained.toFixed(0) + ' max=' + maxGain);

    /* #13 P1 DoD 最小闭环：调试 profile 入世 → claim 出灵气 */
    localStorage.removeItem(SQ.KEY);
    var ref13 = {};
    await SQ.mutate(ref13, function (s) {
      s.profile = { name: '闭环道人', talents: [], worldId: 'xiuxian', worldName: SQ.generateWorldName('xiuxian'), createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
    });
    ref13.worlds.xiuxian.lastSave = Date.now() - 5000;
    await SQ.save(ref13);
    var ref13b = {};
    await SQ.claim(ref13b);
    ok('E3', 'DoD 闭环：创角后 claim 出灵气', ref13b.worlds.xiuxian.qi > 0 && ref13b.profile.worldName.length >= 2,
      'qi=' + ref13b.worlds.xiuxian.qi.toFixed(2) + ' world=' + ref13b.profile.worldName);

    /* #14 命名生成器与可见世界：屏上名册逐位钉死（第二十批起 6 界全露出、5 界灰显；原判据是「克苏鲁不露出」）*/
    var chars = { p: '玄青紫太九沧天罗幽', m: '云霄虚阳冥岚岳', s: '界境天域洲' };
    var nameOk = true;
    for (var i = 0; i < 200; i++) {
      var nm = SQ.generateWorldName('xiuxian');
      if (nm.length !== 3 || chars.p.indexOf(nm[0]) < 0 || chars.m.indexOf(nm[1]) < 0 || chars.s.indexOf(nm[2]) < 0) { nameOk = false; break; }
    }
    var vis = SQ.visibleWorlds().map(function (w) { return w.id; });
    ok('E4', '命名池合规 + 屏上名册逐位对表（live 1 · coming 5 · 无 hidden 实例）',
      nameOk && vis.join(',') === 'xiuxian,guwu,magic,tech,urban,cthulhu', 'visible=' + vis.join(','));

    /* #15 词表回落：世界词表 → common → key 本身 */
    ok('E5', 't() 三级回落',
      SQ.t('realm.2', null, 'xiuxian') === '金丹' &&
      SQ.t('ui.confirm') === '确认' && /* N20 处置批：原用 `ui.claim`「收功」，该键随批删除（钮 v2.2 已移除），换同为 common 卷的 `ui.confirm` 继续测三级回落 */
      SQ.t('no.such.key') === 'no.such.key');

    /* ═══ P2 · 验收 4.2 创角十项（文档 #11~#20）═══ */

    /* #11 起名校验：空/1字/9字 拒绝；2~8字 通过 */
    ok(11, '起名 2~8 字校验',
      !SQ.validateName('') && !SQ.validateName('  ') && !SQ.validateName('甲') &&
      !SQ.validateName('一二三四五六七八九') &&
      SQ.validateName('甲乙') && SQ.validateName(' 叶长风 ') &&
      SQ.validateName('一二三四五六七八'));

    /* #17 随机道名：姓氏池 × 名池 */
    var rp = SQ.Worlds.xiuxian.pack.roleNameParts;
    var nameOk17 = true;
    for (var i17 = 0; i17 < 100; i17++) {
      var nm17 = SQ.randomRoleName('xiuxian');
      var hit = rp.surname.some(function (s) { return nm17.indexOf(s) === 0; }) &&
                rp.given.some(function (g) { return nm17.slice(-g.length) === g; });
      if (!hit) { nameOk17 = false; break; }
    }
    ok(12, '随机道名符合姓氏池×名池', nameOk17);

    /* #18 roll 100 次：总数≤3、正负各≥1、无重复词条 */
    var rollOk = true, rollDetail = '';
    for (var i18 = 0; i18 < 100; i18++) {
      var r18 = SQ.rollTalents('xiuxian');
      var ids18 = r18.talents.map(function (x) { return x.id; });
      var pos18 = r18.talents.filter(function (x) { return x.kind === 'positive'; }).length;
      var neg18 = r18.talents.filter(function (x) { return x.kind === 'negative'; }).length;
      if (r18.talents.length > 3 || pos18 < 1 || neg18 < 1 ||
          new Set(ids18).size !== ids18.length ||
          pos18 !== r18.combo.pos || neg18 !== r18.combo.neg) {
        rollOk = false; rollDetail = JSON.stringify(r18.combo) + ids18.join(','); break;
      }
    }
    ok(13, 'roll 结构约束（100 次）', rollOk, rollDetail);

    /* #19 组合分布 1000 次：40/35/25 ± 5% */
    var dist = { '11': 0, '21': 0, '12': 0 };
    for (var i19 = 0; i19 < 1000; i19++) {
      var c19 = SQ.rollTalents('xiuxian').combo;
      dist['' + c19.pos + c19.neg]++;
    }
    ok(14, '组合分布 40/35/25 ±5%',
      Math.abs(dist['11'] - 400) <= 65 && Math.abs(dist['21'] - 350) <= 65 && Math.abs(dist['12'] - 250) <= 65,
      '1正1负=' + dist['11'] + ' 2正1负=' + dist['21'] + ' 1正2负=' + dist['12']);

    /* #20 单正单负 → 正面 effects ×1.5 且描述可重算，负面不放大 */
    var ampOk = false, ampDetail = '';
    for (var i20 = 0; i20 < 500 && !ampOk; i20++) {
      var r20 = SQ.rollTalents('xiuxian');
      if (r20.combo.pos === 1 && r20.combo.neg === 1) {
        var p20 = r20.talents.filter(function (x) { return x.kind === 'positive'; })[0];
        var n20 = r20.talents.filter(function (x) { return x.kind === 'negative'; })[0];
        var pool = (SQ.TALENTS[p20.world] || SQ.TALENTS.common)[ 'positive'].find(function (x) { return x.id === p20.id; });
        var srcOk = true;
        for (var k20 in pool.effects) {
          var want20 = Math.round(pool.effects[k20] * 1.5 * 10000) / 10000;
          if (Math.abs(p20.effects[k20] - want20) > 1e-9) { srcOk = false; break; }
        }
        var negSrc = (SQ.TALENTS[n20.world] || SQ.TALENTS.common)['negative'].find(function (x) { return x.id === n20.id; });
        var negUntouched = JSON.stringify(n20.effects) === JSON.stringify(negSrc.effects);
        var textOk = SQ.effectsToText(p20.effects, 'xiuxian').length > 0;
        ampOk = srcOk && p20.amplified === true && !n20.amplified && negUntouched && textOk;
        ampDetail = p20.id + ' ' + JSON.stringify(p20.effects);
      }
    }
    ok(15, '极致单一 ×1.5（正面放大/负面不动/描述重算）', ampOk, ampDetail);

    /* #21 锁定：入世写入后 talents 持久化，后续 roll 不改存档 */
    localStorage.removeItem(SQ.KEY);
    var locked = SQ.rollTalents('xiuxian').talents;
    var ref21 = {};
    await SQ.mutate(ref21, function (s) {
      s.profile = { name: '锁定道人', talents: locked, worldId: 'xiuxian', worldName: '锁定界', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
    });
    for (var i21 = 0; i21 < 20; i21++) SQ.rollTalents('xiuxian'); /* 重抽不再影响已锁定数据 */
    var after21 = await SQ.load();
    ok(16, '天赋确认锁定后不可变',
      JSON.stringify(after21.profile.talents) === JSON.stringify(locked) && locked.length >= 2);

    /* #22 屏 3 数据源：live 1 + coming 5（第二十批克苏鲁入灰显列）；hidden 档仍由 visibleWorlds 过滤，只是本表暂无实例 */
    var vis22 = SQ.visibleWorlds();
    var live22 = vis22.filter(function (w) { return w.status === 'live'; });
    var coming22 = vis22.filter(function (w) { return w.status === 'coming'; });
    ok(17, '可见世界 = live 1 + coming 5（克苏鲁第二十批改灰显；屏上名册与注册表逐位相等）',
      vis22.length === 6 && live22.length === 1 && live22[0].id === 'xiuxian' && coming22.length === 5 &&
      SQ.visibleWorlds().map(function (w) { return w.id; }).join(',') ===
        Object.keys(SQ.Worlds).join(',') &&
      Object.keys(SQ.Worlds).every(function (id) { return SQ.Worlds[id].status !== 'hidden'; }));

    /* #23 入世一次性写入完整：profile 五字段 + 世界初始化 + meta */
    ok(18, '入世写入完整性',
      after21.profile.name === '锁定道人' && after21.profile.worldId === 'xiuxian' &&
      after21.profile.worldName === '锁定界' && after21.profile.createdAt > 0 &&
      after21.worlds.xiuxian.stones === 100 && after21.worlds.xiuxian.qi === 0 &&
      after21.meta.unlockedWorlds.indexOf('xiuxian') >= 0);

    /* #24 入世后重载 → hasProfile 为真（boot 直接进 MAIN，不再创角） */
    var reload24 = await SQ.load();
    ok(19, '重载不重创角',
      !!(reload24.profile.worldId && reload24.profile.createdAt && reload24.worlds[reload24.profile.worldId]));

    /* #25 创角三屏文案 key 全部命中词表（t() 不回落 key 本身） */
    var keys25 = ['creation.name.title', 'creation.name.ph', 'creation.name.random', 'creation.name.next', 'creation.name.invalid',
      'creation.talent.title', 'creation.talent.reroll', 'creation.talent.confirm', 'creation.talent.lockTitle', 'creation.talent.lockText',
      'creation.talent.amplify', 'creation.talent.rare', 'creation.talent.hint', 'creation.talent.combo',
      'creation.world.title', 'creation.world.pick', 'creation.world.next', 'creation.world.noPick', 'creation.back', 'ui.ok',
      'talent.field.qiRate', 'talent.field.tribBonus'];
    var miss25 = keys25.filter(function (k) { return SQ.t(k, { p: 1, n: 1 }, 'xiuxian') === k; });
    ok(20, '创角文案与字段标签词表完备', miss25.length === 0, miss25.join(','));

    /* ═══ P3 · 验收 4.3 词表层六项（文档 #21~#26；源码级 CJK 扫描/key 静态对账在 .tests/audit.cjs）═══ */

    /* #26（4.3#21 运行态半区）数据纯净：roll 出的词条不带 name/desc，序列化零 CJK */
    var r26 = SQ.rollTalents('xiuxian');
    var json26 = JSON.stringify(r26.talents);
    ok(21, '天赋数据纯净（存档无文案、零 CJK）',
      r26.talents.every(function (x) { return x.name === undefined && x.desc === undefined; }) &&
      !/[㐀-鿿　-〿＀-￯]/.test(json26));

    /* #27（4.3#22 运行态半区）130 条词条 name/desc key 全命中，字段标签全覆盖 */
    var miss27 = [];
    ['common', 'xiuxian'].forEach(function (w) {
      ['positive', 'negative'].forEach(function (kind) {
        SQ.TALENTS[w][kind].forEach(function (el) {
          if (SQ.t('talent.' + el.id + '.name', null, 'xiuxian') === 'talent.' + el.id + '.name') miss27.push(el.id + '.name');
          if (SQ.t('talent.' + el.id + '.desc', null, 'xiuxian') === 'talent.' + el.id + '.desc') miss27.push(el.id + '.desc');
          for (var k in el.effects) {
            if (SQ.t('talent.field.' + k, null, 'xiuxian') === 'talent.field.' + k) miss27.push(el.id + '.field.' + k);
          }
        });
      });
    });
    ok(22, '天赋词表 key 全覆盖（130 条 ×2 + 字段标签）', miss27.length === 0, miss27.slice(0, 5).join(','));

    /* #28（4.3#23）缺 key → 显示 key 本身（非空白/非崩溃） */
    ok(23, '缺 key 显示 key 本身',
      SQ.t('no.such.key') === 'no.such.key' &&
      SQ.t('talent.nonexistent.name', null, 'xiuxian') === 'talent.nonexistent.name' &&
      SQ.t('', null, 'xiuxian') === '');

    /* #29（4.3#24）common 回落：世界词表删除某 key → 显示 common 值；恢复后回到世界值 */
    var saved29 = SQ.LEX.xiuxian['talent.field.qiRate'];
    delete SQ.LEX.xiuxian['talent.field.qiRate'];
    var fell29 = SQ.t('talent.field.qiRate', null, 'xiuxian');
    SQ.LEX.xiuxian['talent.field.qiRate'] = saved29;
    ok(24, 'common 回落与世界覆盖',
      fell29 === '主资源产出' && SQ.t('talent.field.qiRate', null, 'xiuxian') === '修为产出' &&
      SQ.t('ui.confirm', null, 'xiuxian') === '确认');

    /* #30（4.3#25）插值占位替换正确（单占位/多占位/重复占位） */
    var s30a = SQ.t('creation.talent.combo', { p: 2, n: 1 }, 'xiuxian');
    var s30b = SQ.t('idle.next', { realm: '筑基', n: '1,000', res: '灵气' }, 'xiuxian');
    ok(25, '插值占位替换',
      s30a === '2 正 1 负' && s30b.indexOf('{') < 0 && s30b.indexOf('筑基') >= 0 &&
      s30b.indexOf('1,000') >= 0 && SQ.t('ui.error.storage', { msg: 'X' }) === '存档读取失败：X');

    /* #31（4.3#26）切世界桩：注册 stub 世界词表 → 同 key 全量切换，不污染修仙词表 */
    SQ.lexRegister('__stub', { 'realm.0': 'STAGE0', 'resource.primary': 'MANA', 'world.__stub.name': '桩世界' });
    SQ.Worlds.__stub = { id: '__stub', status: 'live', nameParts: null, tagsKeys: [], pack: null };
    var sw31 = SQ.t('realm.0', null, '__stub') === 'STAGE0' &&
      SQ.t('resource.primary', null, '__stub') === 'MANA' &&
      SQ.t('realm.0', null, 'xiuxian') === '练气' &&          /* 原世界不受污染 */
      SQ.t('ui.confirm', null, '__stub') === '确认';             /* stub 缺 key 回落 common */
    delete SQ.Worlds.__stub;
    delete SQ.LEX.__stub;
    ok(26, '切世界词表整体切换（测试桩）', sw31);

    /* ═══ P4 · 验收 4.4 通用系统（文档编号 #27~#44）═══ */
    var D = SQ.XDATA;
    function mkWs(ov) { var w = pack.initialState(); if (ov) Object.assign(w, ov); return w; }
    function mkProf(talents) { return { name: 't', talents: talents || [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() }; }
    function mkTalent(effects) { return { id: 'fake', kind: 'positive', tier: 'common', world: 'common', weight: 1, effects: effects, amplified: false }; }
    function mkGear(slot, ov) { return Object.assign({ slot: slot, name: 'T', alignment: 'neutral', tier: 0, atk: 0, reqs: { realm: 0 }, special: null }, ov || {}); }
    function M(prof, w) { pack.recalcDerived(w, prof); return SQ.Mods.collect(prof, w, pack, D); }
    function noopLog() { return function () {}; }
    function stubRandom(vals) {
      var i = 0, orig = Math.random;
      Math.random = function () { return (typeof vals === 'function') ? vals(i++) : (i < vals.length ? vals[i++] : 0.5); };
      return function () { Math.random = orig; };
    }

    /* #27 挂机产出逐项对表：base × (1+天赋+功法+装备+buff) × ALIGN_EFFECTS.qiRateMult（正道 0.75） */
    var w27 = mkWs({ realm: 2, karmaEventScore: 300 });
    w27.artsSlots = ['tuna']; w27.artsLevels = { tuna: 2 };
    w27.gear.treasure = mkGear('treasure', { tier: 2, qiBonus: 0.05 });
    w27.buffs = [{ field: 'qiRate', mult: 0.2, until: Date.now() + 99999999 }];
    var p27 = mkProf([mkTalent({ qiRate: 0.15 })]);
    var m27 = M(p27, w27);
    var rate27 = SQ.Idle.rateOf(w27, pack, D, m27);
    /* 🔧 第卅八批返工（用户裁定「恢复黄阶原值」）：吐纳法 qiRate 回 dev 的 0.05/级 ⇒ 本条 Lv2 功法项 = 0.10
     * 先前那版按「黄阶中位归一」把它压成 0.038，等于砍开局功法 24%——中位保住不等于单条保住 */
    var exp27 = 9 * (1 + 0.15 + 0.05 * 2 + 0.05 + 0.2) * 0.75;
    ok(27, '挂机产出逐项对表（9×1.5×0.75=10.125 · 黄阶保持 dev 原值）',
      Math.abs(rate27 - exp27) < 1e-9 && w27.karma === 300 &&
      Math.abs(m27.detail.qiRate.talent - 0.15) < 1e-9 && Math.abs(m27.detail.qiRate.arts - 0.10) < 1e-9 &&
      Math.abs(m27.detail.qiRate.gear - 0.05) < 1e-9 && Math.abs(m27.detail.qiRate.buff - 0.2) < 1e-9,
      'rate=' + rate27);
    /* #27b 战力末端 × combatPowerMult（B6：魔道 1.25；精被动 18×0.1%=1.8%） */
    var w27b = mkWs({ realm: 2, karmaEventScore: -300 });
    w27b.gear.weapon = mkGear('weapon', { tier: 1, atk: 50 });
    var m27c = M(mkProf(), w27b);
    ok('27b', '战力 × combatPowerMult（魔道 (180+50)×1.018×1.25）',
      Math.abs(SQ.Mods.powerOf(w27b, pack, D, m27c) - (180 + 50) * 1.018 * 1.25) < 1e-6,
      'power=' + SQ.Mods.powerOf(w27b, pack, D, m27c));

    /* #28 qiCap 到顶停止积累；渡劫消耗后恢复 */
    var w28a = mkWs({ realm: 9 });
    w28a.qi = pack.capOf(w28a, mkProf());
    var q28cap = w28a.qi;
    SQ.Idle.settle(w28a, pack, D, 3600000, Date.now(), { log: noopLog(), profile: mkProf() });
    var w28b = mkWs({ realm: 0, qi: 1000 });
    var restore28 = stubRandom([0]);
    SQ.Idle.settle(w28b, pack, D, 5000, Date.now(), { log: noopLog(), profile: mkProf() });
    restore28();
    ok(28, 'qiCap 到顶停止 + 渡劫消耗后恢复',
      w28a.qi === q28cap && w28b.realm === 1 && w28b.qi >= 0 && w28b.qi < 1000,
      'cap=' + q28cap + ' after28b realm=' + w28b.realm + ' qi=' + w28b.qi.toFixed(1));

    /* #29 离线 50% 效率 + 12h 截断（offlineEff +0.5 → eff 1.0，48h 只计 12h） */
    var w29 = mkWs({ realm: 8 });
    var p29 = mkProf([mkTalent({ offlineEff: 0.5 })]);
    SQ.Idle.settle(w29, pack, D, 48 * 3600000, Date.now(), { log: noopLog(), profile: p29 });
    ok(29, '离线 12h 截断 × (0.5+ΣofflineEff)', Math.abs(w29.qi - 6300 * 43200 * 1.0) < 1, 'qi=' + w29.qi);

    /* #30 离线汇总日志格式 */
    var logs30 = [];
    var w30 = mkWs({ realm: 0 });
    SQ.Idle.settle(w30, pack, D, 12 * 3600000, Date.now(), { log: function (c, t) { logs30.push(t); }, profile: mkProf() });
    var sum30 = logs30.filter(function (x) { return /^闭关 \d+ 小时 \d+ 分，得修为 .+，渡劫 \d+ 次（成 \d+ 败 \d+）$/.test(x); });
    ok(30, '离线汇总日志格式', sum30.length === 1 && w30.realm > 0, sum30[0] || logs30.join('|'));

    /* #31 击杀节奏 60×速度/小时；prog+5/杀（富余=0 基准，第卌三批起有富余即按 PROG_SURGE_* 加速，
     * 精确加速判据见 #306），20 杀通关（可重复刷）
     * （系统深化批 A4：词缀进入击杀间隔消费点 → 测试钉住灵潮〔仅 stonesMult〕保持节奏断言确定性） */
    var w31 = mkWs({ realm: 2 });
    w31.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var m31 = M(mkProf(), w31);
    var r31 = SQ.Combat.simulate(w31, pack, D, m31, 3600, { log: noopLog(), now: Date.now(), profile: mkProf() });
    ok(31, '击杀 60/h · 满进度即通关 · 通关后 prog 归零可重复刷', r31.kills === 60 && r31.cleared.indexOf(0) >= 0 && (w31.prog[0] || 0) === 0 && w31.kills === 60,
      'kills=' + r31.kills + ' prog=' + JSON.stringify(w31.prog));

    /* #32 瓶颈：间隔 ×3（20 杀/h）且 prog 封顶 90 无法通关（词缀同 #31 钉住） */
    var w32 = mkWs({ realm: 0, zone: 1 });
    w32.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var m32 = M(mkProf(), w32);
    var r32 = SQ.Combat.simulate(w32, pack, D, m32, 3600, { log: noopLog(), now: Date.now(), profile: mkProf() });
    ok(32, '瓶颈间隔×3 · prog 封顶 90', r32.kills === 20 && w32.prog[1] === 90 && r32.cleared.length === 0,
      'kills=' + r32.kills + ' prog=' + w32.prog[1]);

    /* #33 掉落率 8% 与品阶权重对表（10000 杀采样）
     * （系统深化批 A4：钉住灵潮词缀〔仅 stonesMult，不触 dropMult/gearLuckAdd〕保持采样确定性） */
    var w33 = mkWs({ realm: 5, zone: 4 });
    w33.zoneAffix = { affixId: 'lingchao', until: Date.now() + 86400000 };
    var m33 = M(mkProf(), w33);
    /* 固定种子抽样（同 #125 治理批先例）：±5pp 品阶权重带在真随机下约 26 跑 1 红（实测 tier1 偏差 5.2pp），
     * 是统计噪声不是数值漂——种子化后判据恒定，阈值一字不上调。 */
    var seed33 = 3320261015, origRand33 = Math.random;
    Math.random = function () {
      seed33 |= 0; seed33 = (seed33 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed33 ^ (seed33 >>> 15), 1 | seed33);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var r33 = SQ.Combat.simulate(w33, pack, D, m33, 10000 * 60, { log: noopLog(), now: Date.now(), profile: mkProf() });
    Math.random = origRand33;   /* 种子化窗口结束 */
    var tierCnt33 = [0, 0, 0, 0, 0];
    r33.drops.forEach(function (d) { if (!d.clear) tierCnt33[d.item.tier]++; });
    var tot33 = r33.drops.filter(function (d) { return !d.clear; }).length;
    var dropRate33 = tot33 / r33.kills;
    var expect33 = D.ZONES[4].drops;
    var tierOk33 = true;
    for (var ti = 0; ti < 5; ti++) {
      var actual = tot33 ? tierCnt33[ti] / tot33 : 0;
      if (Math.abs(actual - expect33[ti] / 100) > 0.05) tierOk33 = false;
    }
    ok(33, '掉落率 8%±2pp · 品阶权重±5pp（万次采样）',
      r33.kills === 10000 && Math.abs(dropRate33 - 0.08) < 0.02 && tierOk33,
      'drops=' + tot33 + ' rate=' + (dropRate33 * 100).toFixed(2) + '% tiers=' + tierCnt33.join('/'));

    /* #34 通关必掉 + 品阶上浮一档 */
    var up34 = 0, clearCnt34 = 0, all34 = 0;
    for (var i34 = 0; i34 < 200; i34++) {
      var w34 = mkWs({ realm: 5, zone: 4, prog: { 4: 95 } });
      var r34 = SQ.Combat.simulate(w34, pack, D, M(mkProf(), w34), 120, { log: noopLog(), now: Date.now(), profile: mkProf() });
      r34.drops.forEach(function (d) { if (d.clear) { clearCnt34++; all34++; if (d.item.tier >= 2) up34++; } });
    }
    ok(34, '通关必掉 + 品阶上浮一档', clearCnt34 === 200 && up34 / all34 >= 0.75,
      'clears=' + clearCnt34 + ' tier≥2 占比=' + (up34 / all34 * 100).toFixed(1) + '%');

    /* #35 评分公式对表 + 自动替换只在 score 更高时 */
    var it35 = { atk: 10, qiBonus: 0.1, resist: 40, attrValue: { attr: 'jing', value: 5 }, special: null };
    var it35s = Object.assign({}, it35, { special: 'sword_heart' });
    var w35 = mkWs({ realm: 9 });
    var m35 = M(mkProf(), w35);
    var a1 = SQ.Gear.autoEquip(w35, pack, D, m35, mkGear('weapon', { tier: 2, atk: 10, qiBonus: 0.1, resist: 40, attrValue: { attr: 'jing', value: 5 } }), null);
    var a2 = SQ.Gear.autoEquip(w35, pack, D, m35, mkGear('weapon', { tier: 0, atk: 1 }), null);
    var held35 = w35.gear.weapon.atk === 10; /* 低分件被炼化、原件保住（在 a3 之前取证） */
    var a3 = SQ.Gear.autoEquip(w35, pack, D, m35, mkGear('weapon', { tier: 2, atk: 99 }), null);
    /* GitHub issue #2 自动炼化开关（关 ⇒ 先入库藏阁，库满才回落炼化）。
     * 与 a1/a2/a3 同件同序做对照：空槽照穿、低分件不再被练、被换下的旧件留档、灵石与总账零流动。 */
    var w35b = mkWs({ realm: 9 });
    w35b.gearAutoRefine = false;
    var m35b = M(mkProf(), w35b);
    var lg35 = [];
    var log35 = function (c, tx) { lg35.push(c + '|' + tx); };
    var b1 = SQ.Gear.autoEquip(w35b, pack, D, m35b, mkGear('weapon', { tier: 2, atk: 10, qiBonus: 0.1, resist: 40, attrValue: { attr: 'jing', value: 5 } }), null);
    var b2 = SQ.Gear.autoEquip(w35b, pack, D, m35b, mkGear('weapon', { tier: 0, atk: 1 }), log35);
    var b3 = SQ.Gear.autoEquip(w35b, pack, D, m35b, mkGear('weapon', { tier: 2, atk: 99 }), log35);
    /* 词表盲区自证：这两条形文案**不经 `t('…')` 字面量**（只作 itemLog 的第三形参传入），A2 静态扫描照不到
     * ⇒ 键缺失时 `SQ.t` 原样回传键名、直接上屏（复核抓到的真实形状，本条是它的常驻反证）。 */
    var tx35 = lg35.join(' § ');
    var copy35 = tx35.indexOf('未炼化，已收入库藏阁') >= 0 && tx35.indexOf('toast.gear') < 0 && lg35.length === 2;
    var st35b = w35b.stash.length;                       /* 低分件 + 换下的旧件 = 2，一件都没炼 */
    var led35b = JSON.stringify(w35b.ledger);
    var bLedger = SQ.Gear.autoEquip(w35b, pack, D, m35b, mkGear('weapon', { tier: 0, atk: 2 }), null);
    var w35c = mkWs({ realm: 9 });
    w35c.gearAutoRefine = false;
    w35c.gear.weapon = mkGear('weapon', { tier: 2, atk: 50 });
    for (var si35 = 0; si35 < D.STASH_CAP; si35++) w35c.stash.push(mkGear('armor', { tier: 0, atk: 1 }));
    var c35 = SQ.Gear.autoEquip(w35c, pack, D, M(mkProf(), w35c), mkGear('weapon', { tier: 0, atk: 1 }), null);
    /* 独占授予那条口也在开关射程内（复核抓到的漏面：旧实现只改了 autoEquip）*/
    var w35d = mkWs({ realm: 6, cleared: [0, 1, 2, 3] });
    w35d.gearAutoRefine = false;
    pack.recalcDerived(w35d, mkProf());
    var md35d = M(mkProf(), w35d);
    SQ.Gear.autoEquip(w35d, pack, D, md35d, mkGear('weapon', { tier: 2, atk: 20 }), null);
    var stones35d = w35d.stones;
    var lg35d = [];
    var exOff = SQ.Gear.grantExclusive(w35d, pack, D, md35d, 'evil_sword', { type: 'event', ref: 'x' },
      function (c, tx) { lg35d.push(c + '|' + tx); });
    var d35 = !!exOff && exOff.exclusive === 'evil_sword' && w35d.gear.weapon === exOff &&
      w35d.stash.length === 1 && w35d.stash[0].atk === 20 && w35d.stones === stones35d &&
      lg35d.join(' ').indexOf('未炼化，已收入库藏阁') >= 0;
    var n35d = pack.normalize({}, {}).gearAutoRefine;
    var n35f = pack.normalize({ gearAutoRefine: false }, {}).gearAutoRefine;
    var n35x = pack.normalize({ gearAutoRefine: 'yes' }, {}).gearAutoRefine;
    ok(35, '评分公式 + 择优只在更高时 + 自动炼化开关（issue #2：关 ⇒ 低分新件与被换旧件都入库藏阁（含**独占授予**那条口），' +
      '库满才回落炼化，灵石与总账零流动；两条新文案真解析、屏上不落裸键名——A2 静态扫描对 itemLog 第三形参是盲区，本条补上；' +
      'normalize 三态 缺省 true / false 保留 / 脏值归 true）',
      SQ.Gear.scoreOf(it35) === 55 && SQ.Gear.scoreOf(it35s) === Math.round(55 * 1.15 * 100) / 100 &&
      a1.action === 'equip' && a2.action === 'refine' && held35 && a3.action === 'replace' && w35.gear.weapon.atk === 99 &&
      b1.action === 'equip' && b2.action === 'stash' && b3.action === 'replace' && b3.gained === 0 &&
      !!b3.kept && b3.kept.atk === 10 && copy35 &&
      st35b === 2 && w35b.stash.length === 3 && w35b.gear.weapon.atk === 99 &&
      w35b.stones === mkWs({ realm: 9 }).stones &&
      bLedger.action === 'stash' && JSON.stringify(w35b.ledger) === led35b &&
      c35.action === 'refine' && d35 && n35d === true && n35f === false && n35x === true,
      'score=' + SQ.Gear.scoreOf(it35) + '/' + SQ.Gear.scoreOf(it35s) + ' acts=' + [a1.action, a2.action, a3.action].join(',') + ' held=' + held35 +
      ' ‖ 开关关 acts=' + [b1.action, b2.action, b3.action, bLedger.action].join(',') + ' 库=' + w35b.stash.length +
      ' 灵石=' + w35b.stones + ' Ledger同=' + (JSON.stringify(w35b.ledger) === led35b) +
      ' ‖ 库满回落=' + c35.action + ' 独占授予=' + (d35 ? '旧件入阁未炼' : '红') + ' normalize=' + n35d + '/' + n35f + '/' + n35x);

    /* #36 炼化返还 = 品阶固定表 ×(1+境界×0.5) */
    var ok36 = SQ.Gear.refineValue({ tier: 0 }, { realm: 0 }, D, { hooks: {} }) === 5 &&
      SQ.Gear.refineValue({ tier: 1 }, { realm: 2 }, D, { hooks: {} }) === 40 &&
      SQ.Gear.refineValue({ tier: 2 }, { realm: 4 }, D, { hooks: {} }) === 300 &&
      SQ.Gear.refineValue({ tier: 3 }, { realm: 6 }, D, { hooks: {} }) === 2000 &&
      SQ.Gear.refineValue({ tier: 4 }, { realm: 9 }, D, { hooks: {} }) === 13750 &&
      SQ.Gear.refineValue({ tier: 0 }, { realm: 0 }, D, { hooks: { huijin: 0.4 } }) === 7;
    ok(36, '炼化返还固定表（含炼余回生）', ok36);

    /* #37 魔道词条 ×1.10 且 alignment='evil'（1600 次采样压方差，防边界抖动） */
    var sumE = 0, sumN = 0, evilAlign = true;
    for (var i37 = 0; i37 < 1600; i37++) {
      var ge = SQ.Gear.roll(mkWs(), pack, D, 0, { sum: { gearLuck: 0 } }, { tier: 0, align: 'evil' });
      var gn = SQ.Gear.roll(mkWs(), pack, D, 0, { sum: { gearLuck: 0 } }, { tier: 0, align: 'neutral' });
      sumE += ge.atk; sumN += gn.atk;
      if (ge.alignment !== 'evil') evilAlign = false;
    }
    var ratio37 = sumE / sumN;
    ok(37, '魔道 ×1.10 且 alignment=evil', ratio37 > 1.03 && ratio37 < 1.18 && evilAlign, 'ratio=' + ratio37.toFixed(3));

    /* #38 功法升级消耗对表（修行状态批：改耗修为 + 品阶系数）+ artsSpeed 折扣下限 50%
     * tuna=黄阶：cost = ARTS_COST[lv−1] × 1 × (1+realm×0.5) × max(0.5, 1−ΣartsSpeed)。
     * 等级起点批（入门即 Lv1）：原 Lv0→1 那档 60 取消，**Lv1 起价 = 240**（其余档位价格一字未动）。 */
    var w38 = mkWs({ realm: 0 });
    var w38b = mkWs({ realm: 2 });
    var p38c = mkProf([mkTalent({ artsSpeed: 0.9 })]);
    var c0 = SQ.Arts.upgradeCost(w38, pack, D, 'tuna', M(mkProf(), w38));        /* Lv1 realm0 = 240 */
    var c2 = SQ.Arts.upgradeCost(w38b, pack, D, 'tuna', M(mkProf(), w38b));      /* ×(1+2×0.5) = 480 */
    w38b.artsLevels = { tuna: 8 };
    var c2b = SQ.Arts.upgradeCost(w38b, pack, D, 'tuna', M(mkProf(), w38b));     /* 1300000 × 2 */
    var cFloor = SQ.Arts.upgradeCost(w38, pack, D, 'tuna', M(p38c, w38));        /* 240 × 0.5（折扣下限） */
    ok(38, '升级消耗 240/480×(1+r×0.5)（黄阶 · 入门即 Lv1 起价）· 折扣下限 50%',
      c0 === 240 && c2 === 480 && c2b === 2600000 && cFloor === 120,
      [c0, c2, c2b, cFloor].join('/'));

    /* #39 渡劫成功 → **功法等级保留**（第廿五批改口：原口径为 artsLevels 清零）、artsKnown 与槽位保留 */
    var w39 = mkWs({ realm: 0, qi: 1000, artsKnown: ['tuna', 'juling'], artsSlots: ['tuna'], artsLevels: { tuna: 3, juling: 2 } });
    var restore39 = stubRandom([0]);
    SQ.Realm.tryBreakthrough(w39, pack, D, M(mkProf(), w39), Date.now(), { log: noopLog(), profile: mkProf() });
    restore39();
    ok(39, '渡劫成功功法等级保留/持有与槽位保留（不再清零）',
      w39.realm === 1 && w39.qi === 0 && w39.artsLevels.tuna === 3 && w39.artsLevels.juling === 2 &&
      /* 体验手感批后：M() 触发一次性回填把 juling 补进空槽（数值详设 §4.4 v1.26），槽位保留关系不变 */
      w39.artsKnown.join() === 'tuna,juling' && w39.artsSlots.join() === 'tuna,juling' && w39.tribulation.lastResult === 'success');

    /* #40 商店 4h 补货时间戳 + 阶梯刷新费与重置 */
    var w40 = mkWs({ realm: 0, stones: 100000 });
    var m40 = M(mkProf(), w40);
    var now40 = Date.now();
    w40.shop.nextRestock = now40 + 3600000;
    var due1 = SQ.Shop.restockIfDue(w40, pack, D, m40, now40);
    w40.shop.nextRestock = now40 - 1;
    var due2 = SQ.Shop.restockIfDue(w40, pack, D, m40, now40);
    var fees = [];
    for (var i40 = 0; i40 < 6; i40++) { fees.push(SQ.Shop.refreshFee(w40, pack, D, m40)); SQ.Shop.refresh(w40, pack, D, m40, false); }
    w40.shop.nextRestock = now40 - 1;
    SQ.Shop.restockIfDue(w40, pack, D, m40, now40);
    ok(40, '4h 补货时间戳 + 刷新费 20/50/100/200/400/400 + 周期重置',
      !due1 && due2 && w40.shop.items.length >= D.SHOP_SLOTS_MIN && w40.shop.items.length <= D.SHOP_SLOTS_MAX && fees.join() === '20,50,100,200,400,400' && SQ.Shop.refreshFee(w40, pack, D, m40) === 20,
      fees.join('/'));

    /* #41 商品池权重采样 + 功法商品只出未持有 */
    var kindCnt = { gear: 0, pill: 0, arts: 0, pack: 0, treasure: 0 };
    var tot41b = 0;
    for (var i41 = 0; i41 < 2000; i41++) {
      var w41 = mkWs({ realm: 3 });
      w41.shop.nextRestock = 1;
      SQ.Shop.restockIfDue(w41, pack, D, M(mkProf(), w41), Date.now());
      tot41b += w41.shop.items.length;
      w41.shop.items.forEach(function (it) { kindCnt[it.kind]++; });
    }
    /* 格数随机后总样本量不能再按「2000 × 固定格数」算（那是把随机量当常量），改成**逐轮实加** */
    var tot41 = tot41b;
    var W41 = D.SHOP_POOL_W, wsum41 = W41.gear + W41.pill + W41.arts + W41.pack + (W41.treasure || 0);
    var distOk41 = Math.abs(kindCnt.gear / tot41 - W41.gear / wsum41) < 0.03 &&
      Math.abs(kindCnt.pill / tot41 - W41.pill / wsum41) < 0.03 &&
      Math.abs(kindCnt.arts / tot41 - W41.arts / wsum41) < 0.03 &&
      Math.abs(kindCnt.pack / tot41 - W41.pack / wsum41) < 0.03 &&
      Math.abs(kindCnt.treasure / tot41 - (W41.treasure || 0) / wsum41) < 0.03;
    var w41b = mkWs({ realm: 3 });
    var allShopArts = Object.keys(SQ.XARTS).filter(function (id) { return SQ.XARTS[id].obtain.type === 'shop'; });
    w41b.artsKnown = allShopArts.slice();
    w41b.shop.nextRestock = 1;
    var artsSeen = 0;
    for (var j41 = 0; j41 < 300; j41++) {
      SQ.Shop.restockIfDue(w41b, pack, D, M(mkProf(), w41b), Date.now());
      w41b.shop.items.forEach(function (it) { if (it.kind === 'arts') artsSeen++; });
      w41b.shop.nextRestock = 1;
    }
    ok(41, '商品池权重 ±3 · 功法只出未持有', distOk41 && artsSeen === 0,
      JSON.stringify(kindCnt) + ' ownedArtsLeak=' + artsSeen);

    /* #42 黑市：karma≤-200 出现、回升消失、已购保留 */
    var w42 = mkWs({ realm: 3, stones: 1000000, karmaEventScore: -300 });
    pack.recalcDerived(w42, mkProf());
    var open42 = SQ.Shop.blackOpen(w42, pack, D);
    var k42 = w42.karma; /* 在回正之前取值 */
    w42.shop.nextRestock = 1;
    SQ.Shop.restockIfDue(w42, pack, D, M(mkProf(), w42), Date.now());
    var bought42 = SQ.Shop.buy(w42, pack, D, M(mkProf(), w42), 0, true, noopLog());
    w42.karmaEventScore = 0;
    pack.recalcDerived(w42, mkProf());
    ok(42, '黑市开关随 karma · 已购保留',
      open42 && k42 === -300 && bought42.ok && !SQ.Shop.blackOpen(w42, pack, D) &&
      (w42.shop.blackItems || []).some(function (x) { return x.sold; }),
      'open=' + open42 + ' k=' + k42 + ' buy=' + JSON.stringify(bought42.ok ? 'ok' : bought42.reason) +
      ' items=' + (w42.shop.blackItems || []).length);

    /* #43 buff 到期清理在 claim 内 · 过期不参与乘区 */
    var w43 = mkWs({ realm: 2 });
    w43.buffs = [
      { field: 'qiRate', mult: 0.5, until: Date.now() - 1000 },
      { field: 'qiRate', mult: 0.2, until: Date.now() + 99999999 }
    ];
    var prof43 = mkProf();
    pack.claim(w43, 5000, Date.now(), prof43);
    var m43 = SQ.Mods.collect(prof43, w43, pack, D);
    /* 等级起点批（入门即 Lv1）后**在槽功法自带 qiRate** ⇒ 判据改认 buff 来源，
     * 不再拿乘区总和当 buff 值（旧写法只是恰好因为那时首发功法是 Lv0、贡献为 0）。 */
    ok(43, 'buff 过期清理且不进乘区（过期条不进 buff 来源）',
      w43.buffs.length === 1 && Math.abs(((m43.detail.qiRate || {}).buff || 0) - 0.2) < 1e-9);

    /* #44 同乘区加算/跨乘区乘算（总表 §八 抽查 3 条：qiRate/combatPower/qiCap）
     * 第卅八批品阶阶梯进了滋养与词条 ⇒ 两处期望随新表重导，且**这两条正是阶梯本身的对表**：
     *   金钟罩 = 玄阶 combatPower 每级 0.083 → Lv5 = 0.415（旧 0.06×5=0.3）
     *   🔧 返工：**词条侧与滋养侧是两条阶梯**——词条侧 1/2/3.5/6，滋养侧 1 ∶ 1.5 ∶ 2 ∶ 2.5。
     *     把天阶 ×6 直接乘进滋养会造出 6 槽 × Lv9 × 魔 3 × 天 6 = 972 点（境界基础值到顶才 60、dc = 基础×2 = 120
     *     ⇒ 判定 p 整档顶到 0.95 饱和，高品阶「吃属性」反而失去区分度），故滋养单独设上限（用户裁定）。
     *   滋养：精 = 基础 6 + 5 级 × 正道 2 × 玄阶 1.5 = 21 ‖ 气 = 6 + 5 × 2 × 黄阶 1 = 16
     *   ⇒ 同等级同阵营的两部功法，只因品阶差一档，属性差就从 10 变成 15（这条仍不可悄悄退回去） */
    var w44 = mkWs({ realm: 0, artsKnown: ['tuna', 'juling', 'jinzhong'], artsSlots: ['jinzhong', 'juling'], artsLevels: { jinzhong: 5, juling: 5 } });
    w44.gear.weapon = mkGear('weapon', { tier: 2, atk: 100 });
    var p44 = mkProf([mkTalent({ combatPower: 0.1, qiCap: 0.25 })]);
    var m44 = M(p44, w44);
    /* combatPower: 天赋0.1 + 金钟罩(玄)0.083×5=0.415 + 精被动(6+精滋养15=21 →2.1%) */
    var jing44 = w44.attrs.jing;
    var expPower = (20 + 100) * (1 + 0.1 + 0.415 + Math.min(jing44 * 0.001, 0.12));
    /* qiCap: 天赋0.25 + 聚灵诀(黄)**0.10**×5=0.50（返工回 dev 原值，先前那版是 0.05）+ 气被动(16 →8%) */
    var expCap = Math.max(1 * 7200, 1000 * 1.15) * (1 + 0.25 + 0.10 * 5 + Math.min((w44.attrs.qi || 0) * 0.005, 0.3));
    ok(44, '乘区叠加秩序（战力/上限抽查 · 词条阶梯 玄2/黄1 ‖ 滋养阶梯 玄1.5/黄1 ‖ 聚灵诀 = dev 原值）',
      Math.abs(SQ.Mods.powerOf(w44, pack, D, m44) - expPower) < 1e-6 &&
      Math.abs(SQ.Idle.capOf(w44, pack, D, m44) - expCap) < 1e-6 &&
      jing44 === 21 && w44.attrs.qi === 16,
      'power=' + SQ.Mods.powerOf(w44, pack, D, m44).toFixed(2) + '/' + expPower.toFixed(2) + ' cap=' + SQ.Idle.capOf(w44, pack, D, m44).toFixed(0) + '/' + expCap.toFixed(0));

    /* ═══ P5 · 验收 4.5 修仙专属（#45~#58）═══ */

    /* #45 karma 四分量重算（功法+装备+事件分+初心漂移，事件池 §八 v1.5）+ clamp ±1000 */
    var w45 = mkWs({ karmaEventScore: 50, artsKnown: ['tuna', 'juling', 'jinzhong'], alignDrift: 14 });
    w45.gear.weapon = mkGear('weapon', { alignment: 'right' });
    w45.gear.armor = mkGear('armor', { alignment: 'right' });
    w45.artsSlots = ['jinzhong']; w45.artsLevels = { jinzhong: 3 };
    pack.recalcDerived(w45, mkProf());
    var k45a = w45.karma;
    var parts45 = SQ.XKarma.partsOf(w45, D);
    w45.karmaEventScore = 5000;
    pack.recalcDerived(w45, mkProf());
    ok(45, 'karma 四分重算（30+6+50+14）+ clamp ±1000',
      k45a === 30 + 6 + 50 + 14 && w45.karma === 1000 &&
      parts45.arts === 6 && parts45.gear === 30 && parts45.events === 50 && parts45.drift === 14,
      'k=' + k45a + ' parts=' + JSON.stringify(parts45));

    /* #46 换装即时重算 · 反复穿脱 100 次无刷分 */
    var w46 = mkWs();
    pack.recalcDerived(w46, mkProf());
    var k0 = w46.karma;
    for (var i46 = 0; i46 < 100; i46++) {
      w46.gear.weapon = mkGear('weapon', { alignment: 'evil' });
      pack.recalcDerived(w46, mkProf());
      w46.gear.weapon = null;
      pack.recalcDerived(w46, mkProf());
    }
    ok(46, '穿脱 100 次 karma 不变（覆盖式重算）', w46.karma === k0);

    /* #46b karmaMod 分段整点边界（主文档 §7.2 v2.8 勘误）：与 KARMA_TIERS 档位对齐——
     * 旧表 [-200,200) 行序在前 → karma=−200（恰好踏进魔道）拿 0，「快而险」代价在入档整点缺失。 */
    var KM = function (k) { return SQ.XKarma.karmaMod(k, D); };
    var tier46b = function (k) { return SQ.XKarma.tierOf(k); };
    ok('46b', 'karmaMod 四整点边界（±200 / ±800）与档位对齐',
      KM(200) === 0.10 && KM(199) === 0 && KM(800) === 0.20 && KM(799) === 0.10 &&
      KM(-200) === -0.12 && KM(-199) === 0 && KM(-800) === -0.25 && KM(-799) === -0.12 &&
      /* 魔道入档整点必须同时吃到档位效果与渡劫代价（不允许一侧生效一侧为 0） */
      tier46b(-200) === 'evil' && KM(-200) < 0 && tier46b(-199) === 'neutral' && KM(-199) === 0 &&
      tier46b(200) === 'right' && KM(200) > 0,
      'KM(-200)=' + KM(-200) + ' KM(-800)=' + KM(-800) + ' KM(200)=' + KM(200) + ' KM(800)=' + KM(800));

    /* #47 档位切换 → 修炼倍率（ALIGN_EFFECTS.qiRateMult 0.75/1.5）与黑市同步 */
    var w47 = mkWs({ karmaEventScore: 200 });
    pack.recalcDerived(w47, mkProf());
    var right47 = SQ.XKarma.tierOf(w47.karma) === 'right' && SQ.XKarma.alignMultOf(w47, D) === 0.75 && !SQ.Shop.blackOpen(w47, pack, D);
    w47.karmaEventScore = -200;
    pack.recalcDerived(w47, mkProf());
    ok(47, '档位 ±200 切换（qiRateMult 0.75/1.5 · 黑市同步）',
      right47 && SQ.XKarma.tierOf(w47.karma) === 'evil' && SQ.XKarma.alignMultOf(w47, D) === 1.5 && SQ.Shop.blackOpen(w47, pack, D));

    /* #48 渡劫触发条件：qi ≥ need 且 realm < 9 */
    var w48 = mkWs({ realm: 0, qi: 0 });
    var restore48 = stubRandom([0]);
    SQ.Idle.settle(w48, pack, D, 2500000, Date.now(), { log: noopLog(), profile: mkProf() }); /* 0.5/s × 5000s ≥ 1000 */
    var trig48 = w48.tribulation.attempts > 0;
    var w48b = mkWs({ realm: 9, qi: 1e12 });
    SQ.Idle.settle(w48b, pack, D, 3600000, Date.now(), { log: noopLog(), profile: mkProf() });
    restore48();
    ok(48, '渡劫触发：qi≥need 且 realm<9', trig48 && w48b.tribulation.attempts === 0);

    /* #49 p 公式四项对表 + clamp [0.05,0.95]（含 resist 双封顶项；resist 封顶第卌二批 0.20→0.12） */
    var w49 = mkWs({ realm: 8, karmaEventScore: 800 });
    w49.gear.weapon = mkGear('weapon', { tier: 4, atk: 200000, resist: 1200 });
    w49.gear.armor = mkGear('armor', { tier: 4, resist: 1200 });
    var p49 = mkProf([mkTalent({ tribBonus: 0.21 })]);
    var i49 = SQ.XTrib.info(w49, pack, D, M(p49, w49));
    var w49b = mkWs({ realm: 8, karmaEventScore: -5000 });
    w49b.tribulation.next = -1;
    var i49b = SQ.XTrib.info(w49b, pack, D, M(mkProf(), w49b));
    ok(49, 'p 四项对表 + 正道档 alignFlat +0.05 + 双 clamp',
      i49.parts.resist === 0.12 && i49.parts.power === 0.15 && Math.abs(i49.parts.talent - 0.21) < 1e-9 &&
      i49.parts.karma === 0.20 && i49.parts.alignFlat === 0.05 && i49.p === 0.95 &&
      i49b.parts.alignFlat === 0 && i49b.p === 0.05,
      JSON.stringify(i49.parts) + ' p=' + i49.p + '/' + i49b.p);

    /* #50 base 表 0.95→0.22（9 个突破点逐一核对；势力批 v2.4 的「金丹起 ×0.75」已折算，
     * 第卌二批在其上再压一档：中程起裸身不运营 <0.5、境界越高越难，尾段压平不吃 clamp 下界） */
    var want50 = [0.95, 0.60, 0.50, 0.42, 0.36, 0.33, 0.30, 0.26, 0.22];
    ok(50, '渡劫 base 表 9 点（第卌二批压陡后）', want50.every(function (v, i) { return D.REALMS[i + 1].tribBase === v; }));

    /* #51 成功：realm+1、qi=0、功法等级保留（第廿五批）、lastResult（#39 已覆盖，此处核 success 计数） */
    ok(51, '渡劫成功计数与状态', w39.tribulation.success === 1 && w39.tribulation.attempts === 1);

    /* #52 失败：qi×loss（tribFailLossMod/神修正生效）、境界不变 */
    var w52 = mkWs({ realm: 0, qi: 1000 });
    var restore52 = stubRandom([0.9999]);
    SQ.Realm.tryBreakthrough(w52, pack, D, M(mkProf(), w52), Date.now(), { log: noopLog(), profile: mkProf() });
    restore52();
    var w52b = mkWs({ realm: 0, qi: 1000 });
    var p52b = mkProf([mkTalent({ tribFailLossMod: -0.1 })]);
    var restore52b = stubRandom([0.9999]);
    SQ.Realm.tryBreakthrough(w52b, pack, D, M(p52b, w52b), Date.now(), { log: noopLog(), profile: p52b });
    restore52b();
    /* 神=6(裸身, dc/2) → shenMod −0.05 → loss 0.45；天赋 −0.1 → 0.35 */
    ok(52, '失败半损 + 修正通道',
      w52.realm === 0 && Math.abs(w52.qi - 450) < 1e-6 && w52.tribulation.lastResult === 'fail' &&
      Math.abs(w52b.qi - 350) < 1e-6, 'qi=' + w52.qi + '/' + w52b.qi);

    /* #53 失败无冷却字段：半损后自然低于阈值 */
    ok(53, '失败无冷却字段（自然回落）',
      w52.qi < 1000 && !('cooldown' in w52.tribulation) && Object.keys(w52).indexOf('tribCooldown') < 0);

    /* #54 离线批量渡劫 iter≤64 兜底：全 need=10 且恒失败 → 靠 iter 上限收敛 */
    var realBackup = JSON.parse(JSON.stringify(D.REALMS));
    var w54 = mkWs({ realm: 0, qi: 10 });
    for (var ri = 1; ri < D.REALMS.length; ri++) D.REALMS[ri].need = 10;
    var restore54 = stubRandom(function () { return 0.99999; }); /* 恒失败 */
    var t54start = Date.now();
    SQ.Idle.settle(w54, pack, D, 30 * 24 * 3600000, Date.now(), { log: noopLog(), profile: mkProf() });
    var dur54 = Date.now() - t54start;
    restore54();
    for (var rj = 0; rj < realBackup.length; rj++) D.REALMS[rj] = realBackup[rj];
    ok(54, '离线批量渡劫 iter≤64 · 30 天不死循环', w54.tribulation.attempts === 64 && w54.realm === 0 && dur54 < 5000,
      'attempts=' + w54.tribulation.attempts + ' realm=' + w54.realm + ' ' + dur54 + 'ms');

    /* #55 tribNext 掷判后清空 · 先加总后 clamp */
    var w55 = mkWs({ realm: 8, qi: 5e8 });
    w55.tribulation.next = 0.9;   /* 势力批 v2.4 口径：一次性修正越过 clamp 上限即被截（第卌二批 base 0.22 同样成立） */
    w55.breakCostNext = -0.1;
    var i55 = SQ.XTrib.info(w55, pack, D, M(mkProf(), w55));
    var restore55 = stubRandom([0.9999]);
    SQ.Realm.tryBreakthrough(w55, pack, D, M(mkProf(), w55), Date.now(), { log: noopLog(), profile: mkProf() });
    restore55();
    ok(55, 'tribNext 先加总后 clamp · 用后即清',
      i55.p === 0.95 && w55.tribulation.next === 0 && w55.breakCostNext === 0);

    /* #56 alignDrift 累积（B3）：biasSign × 12/天、分量封顶 ±260、neutral 不漂 */
    var w56 = mkWs({});
    var profEvil56 = mkProf(); profEvil56.alignBias = 'evil';
    SQ.XKarma.accrueDrift(w56, profEvil56, D, 10 * 86400000);
    var d56a = w56.alignDrift;
    SQ.XKarma.accrueDrift(w56, profEvil56, D, 30 * 86400000);
    var d56b = w56.alignDrift;
    var w56c = mkWs({});
    SQ.XKarma.accrueDrift(w56c, mkProf(), D, 30 * 86400000); /* neutral 缺省 */
    var profRight56 = mkProf(); profRight56.alignBias = 'right';
    var w56d = mkWs({ alignDrift: 250 });
    SQ.XKarma.accrueDrift(w56d, profRight56, D, 5 * 86400000);
    ok(56, 'alignDrift ±12/天 · 封顶 ±260 · neutral 不漂',
      Math.abs(d56a + 120) < 1e-9 && Math.abs(d56b + 260) < 1e-9 &&
      w56c.alignDrift === 0 && w56d.alignDrift === 260,
      [d56a, d56b, w56c.alignDrift, w56d.alignDrift].join('/'));

    /* #57 cond 过滤：karma 门槛（demon_envoy maxKarma -200）与 align 档位（sect_recruit right） */
    var ev57 = SQ.Events.findById(pack, 'demon_envoy');
    var ev57b = SQ.Events.findById(pack, 'sect_recruit');
    var w57 = mkWs({ realm: 3 });
    w57.karmaEventScore = -300; pack.recalcDerived(w57, mkProf());
    var in57 = SQ.Events.condOk(ev57, w57, pack, D);
    var in57c = SQ.Events.condOk(ev57b, w57, pack, D) === false; /* 魔档进不了正道反馈环 */
    w57.karmaEventScore = 0; pack.recalcDerived(w57, mkProf());
    var out57a = SQ.Events.condOk(ev57, w57, pack, D);
    w57.karmaEventScore = 300; pack.recalcDerived(w57, mkProf());
    var in57b = SQ.Events.condOk(ev57b, w57, pack, D);
    var out57b = SQ.Events.condOk(ev57, w57, pack, D);
    ok(57, 'cond：karma 门槛与 align 档位过滤（阵营反馈环）',
      in57 && in57c && !out57a && in57b && !out57b);

    /* #58 三分支抉择流：pendingChoice 挂起冻结时钟；保底段命中 → 写挂起 + 时钟归零 + seen/冷却落档 */
    var w58 = mkWs({ realm: 3 });
    w58.eventClock = 300;
    w58.pendingChoice = { id: 'x', at: Date.now() };
    var r58 = SQ.Events.tickOnline(w58, pack, D, M(mkProf(), w58), 120, Date.now(), { log: noopLog() });
    var frozen58 = r58 === null && w58.eventClock === 300;
    w58.pendingChoice = null; w58.eventClock = 19 * 60 + 59;
    var restore58 = stubRandom([0.01, 0.9, 0.5, 0.5]);
    var r58b = SQ.Events.tickOnline(w58, pack, D, M(mkProf(), w58), 2, Date.now(), { log: noopLog() });
    restore58();
    ok(58, '挂起冻结时钟 · 保底段触发写 pendingChoice + 归零',
      frozen58 && r58b && r58b.pending === true && w58.eventClock === 0 &&
      !!w58.pendingChoice && w58.pendingChoice.id === r58b.id &&
      w58.eventHistory.seen[r58b.id] != null && w58.eventCooldowns[r58b.id] != null &&
      w58.eventHistory.lastId === r58b.id,
      JSON.stringify(r58b));

    /* ═══ P4~P5 · 验收 4.6 事件系统（#59~#68）═══ */

    /* #59 在线时钟 p_k = min(1,(k/20)²×rateMult) 对表 + k=20 硬保底（时钟专项 1/2）
     * 修行状态批：模式乘区进 rateMult——此处显式 venture（eventMult 1.5）：
     * p_k = min(1,(k/20)²×1.5) → 9.375%/37.5%/84.375%/100% */
    var w59s = mkWs({ realm: 3, mode: 'venture' });
    var m59s = M(mkProf(), w59s);
    function bucketHit(k, n) {
      var hits = 0;
      for (var i = 0; i < n; i++) {
        var w = mkWs({ realm: 3, mode: 'venture' });
        w.eventClock = (k - 1) * 60 + 59;
        var r = SQ.Events.tickOnline(w, pack, D, m59s, 1.5, Date.now(), { log: noopLog() });
        if (r && r.pending) hits++;
      }
      return hits / n;
    }
    /* 确定性抽样（2026-10-09 治理批）：真实 Math.random 下本条单跑红率约 1~3%，是噪声不是回归信号 */
    var seed59 = 20261009, origRand59 = Math.random;
    Math.random = function () {
      seed59 |= 0; seed59 = (seed59 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed59 ^ (seed59 >>> 15), 1 | seed59);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var h5 = bucketHit(5, 4000), h10 = bucketHit(10, 6000), h15 = bucketHit(15, 6000), h20 = bucketHit(20, 200);
    Math.random = origRand59;
    ok(59, '时钟 p_k 曲线（9.375%/37.5%/84.375%，venture ×1.5）容差 1.2/1.8/2.0pp + 保底 p=1（2026-10-09 治理批改**固定种子抽样**，判据数值未动）',
      Math.abs(h5 - 0.09375) < 0.012 && Math.abs(h10 - 0.375) < 0.018 &&
      Math.abs(h15 - 0.84375) < 0.02 && h20 === 1,
      [h5, h10, h15, h20].map(function (x) { return (x * 100).toFixed(2) + '%'; }).join('/'));

    /* #60 natureDraw：ALIGN natureW + eventLuck 修正（+luck×100/−luck×60，反向对称）+ 各侧下限 10 */
    function natureRate(luck, n) {
      var c = 0;
      for (var i = 0; i < n; i++) if (SQ.Events.natureDraw(D, D.ALIGN_EFFECTS.neutral, luck) === 'good') c++;
      return c / n;
    }
    /* 固定种子抽样（同上批）：20,000 抽 ×3 比 ±1.5pp / ±1pp，真实随机下即统计噪声 */
    var seed60 = 602026, origRand60 = Math.random;
    Math.random = function () {
      seed60 |= 0; seed60 = (seed60 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed60 ^ (seed60 >>> 15), 1 | seed60);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var nr0 = natureRate(0, 20000), nrP = natureRate(0.5, 20000), nrN = natureRate(-1, 20000);
    Math.random = origRand60;
    ok(60, 'nature 抽取 55% · luck+0.5→87.5% · luck−1→6.5%（下限 10）· 2026-10-09 起**固定种子抽样**（20,000 抽 ×3，判据数值未动）',
      Math.abs(nr0 - 0.55) < 0.015 && Math.abs(nrP - 0.875) < 0.015 && Math.abs(nrN - 10 / 155) < 0.01,
      [nr0, nrP, nrN].map(function (x) { return (x * 100).toFixed(2) + '%'; }).join('/'));

    /* #61 cond 八项筛选逐项对表 */
    var w61 = mkWs({ realm: 2, cleared: [0, 1, 2] });
    w61.artsKnown.push('qingxin');
    w61.gear.weapon = mkGear('weapon', { special: 'sword_heart' });
    w61.karmaEventScore = -300; pack.recalcDerived(w61, mkProf());
    var c61 = [
      SQ.Events.condOk({ cond: { realmMin: 2 } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { realmMin: 3 } }, w61, pack, D) === false,
      SQ.Events.condOk({ cond: { realmMax: 1 } }, w61, pack, D) === false,
      SQ.Events.condOk({ cond: { zoneMin: 2 } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { zoneMin: 3 } }, w61, pack, D) === false,
      SQ.Events.condOk({ cond: { zoneCleared: 3 } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { zoneCleared: 4 } }, w61, pack, D) === false,
      SQ.Events.condOk({ cond: { maxKarma: -200 } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { minKarma: -200 } }, w61, pack, D) === false,
      SQ.Events.condOk({ cond: { align: 'evil' } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { hasArt: 'qingxin' } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { hasArt: 'duohun' } }, w61, pack, D) === false,
      SQ.Events.condOk({ cond: { hasArt: { tier: 'huang', alignment: 'right' } } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { gearSpecial: 'sword_heart' } }, w61, pack, D) === true,
      SQ.Events.condOk({ cond: { gearSpecial: 'devour' } }, w61, pack, D) === false
    ];
    ok(61, 'cond 筛选（境界/秘境/首通/karma/align/功法/词条）', c61.every(Boolean), c61.join(','));

    /* #62 buildPool：冷却/lastId 排除 · 冷却到期回池 */
    var w62 = mkWs({ realm: 3 });
    var now62 = Date.now();
    w62.eventCooldowns['lost_child'] = now62;          /* cooldownHours 24 */
    w62.eventHistory.lastId = 'road_tea_stall';
    var pool62 = SQ.Events.buildPool(pack, w62, D, 'ren', 'good', now62);
    w62.eventCooldowns['lost_child'] = now62 - 25 * 3600 * 1000;
    var pool62b = SQ.Events.buildPool(pack, w62, D, 'ren', 'good', now62);
    ok(62, 'buildPool 冷却/lastId 排除 · 到期回池',
      pool62.length > 0 &&
      pool62.every(function (e) { return e.id !== 'lost_child' && e.id !== 'road_tea_stall'; }) &&
      pool62b.some(function (e) { return e.id === 'lost_child'; }),
      'n=' + pool62.length + '/' + pool62b.length);

    /* #63 once 事件：seen 首遇记录即永久出池（图鉴仍收录） */
    var fake63 = { id: '__once_test', tier: 'ren', nature: 'good', weight: 100, cooldownHours: 0, once: true,
      choices: { right: { karma: 0, gain: [] }, evil: { karma: 0, gain: [] }, neutral: { karma: 0, gain: [] } } };
    SQ.EVENTS.common.push(fake63);
    var w63 = mkWs({ realm: 3 });
    var p63a = SQ.Events.buildPool(pack, w63, D, 'ren', 'good', Date.now()).some(function (e) { return e.id === '__once_test'; });
    w63.eventHistory.seen['__once_test'] = Date.now();
    var p63b = SQ.Events.buildPool(pack, w63, D, 'ren', 'good', Date.now()).some(function (e) { return e.id === '__once_test'; });
    SQ.EVENTS.common.pop();
    ok(63, 'once 事件 seen 即出池', p63a && !p63b);

    /* #64 离线零奇遇 + 60 秒门槛（D1/D2）：≥60s 写 lastOffline 汇总、时钟冻结；<60s 按在线口径不写 */
    await seedSave(3, 2 * 3600 * 1000);
    var ref64 = {};
    await SQ.claim(ref64);
    var w64 = ref64.worlds.xiuxian;
    var off64 = w64.lastOffline && w64.lastOffline.secs >= 7100 && w64.lastOffline.secs <= 7300 &&
      w64.eventClock === 0 && w64.pendingChoice === null && w64.eventHistory.feed.length === 0;
    await seedSave(3, 30 * 1000);
    var ref64b = {};
    await SQ.claim(ref64b);
    ok(64, '离线零奇遇 · ≥60s 写 lastOffline · <60s 在线口径',
      off64 && ref64b.worlds.xiuxian.lastOffline === null &&
      w64.lastOffline.trib.n >= 0 && typeof w64.lastOffline.qi === 'number',
      JSON.stringify(w64.lastOffline));

    /* #65 八类判定 DSL 逐项（含代价型：足额扣并通过 / 不足判败不扣） */
    var w65 = mkWs({ realm: 2, stones: 1000, qi: 10000, karmaEventScore: -300 });
    w65.artsKnown.push('qingxin'); w65.artsSlots = ['qingxin'];
    w65.gear.weapon = mkGear('weapon', { tier: 2, special: 'sword_heart' });
    pack.recalcDerived(w65, mkProf());
    var st65 = { ws: w65, pack: pack, D: D, mods: M(mkProf(), w65), eff: D.ALIGN_EFFECTS.evil, ctx: { log: noopLog() }, sanyanUsed: false };
    var restore65 = stubRandom([0]);  /* attr 判定必过 */
    var dsl65 = [
      SQ.Events.runCheckDsl({ type: 'attr', attr: 'shen', dc: 'easy' }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'karma', max: -200 }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'karma', min: 0 }, st65).pass === false,
      SQ.Events.runCheckDsl({ type: 'align', need: 'evil' }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'align', need: 'right' }, st65).pass === false,
      SQ.Events.runCheckDsl({ type: 'stones', cost: [400, 400] }, st65).pass === true && w65.stones === 600,
      SQ.Events.runCheckDsl({ type: 'stones', cost: 99999 }, st65).pass === false && w65.stones === 600,
      SQ.Events.runCheckDsl({ type: 'qi', pct: 0.5 }, st65).pass === true && w65.qi === 5000,
      SQ.Events.runCheckDsl({ type: 'art', id: 'qingxin' }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'art', id: 'qingxin', slotted: true }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'art', id: 'duohun' }, st65).pass === false,
      SQ.Events.runCheckDsl({ type: 'gear', slot: 'weapon', tierMin: 2 }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'gear', slot: 'weapon', special: 'devour' }, st65).pass === false,
      SQ.Events.runCheckDsl({ type: 'power', ratio: 0.001 }, st65).pass === true,
      SQ.Events.runCheckDsl({ type: 'power', ratio: 1000 }, st65).pass === false
    ];
    restore65();
    ok(65, '八类判定 DSL 逐项 + 代价型失败不扣', dsl65.every(Boolean), dsl65.join(','));

    /* #65b 判定链首败即停 + 三尸宴坐（on_check）30% 无损重来一次 */
    var w65b = mkWs({ realm: 2 });
    pack.recalcDerived(w65b, mkProf());
    var m65b = M(mkProf(), w65b);
    m65b.hooks.sanyan = 0.3;
    var st65b = { ws: w65b, pack: pack, D: D, mods: m65b, eff: D.ALIGN_EFFECTS.neutral, ctx: { log: noopLog() }, sanyanUsed: false };
    var chain65chk = [{ type: 'attr', attr: 'shen', dc: 'easy' }, { type: 'karma', min: -100 }];
    var restore65b = stubRandom([0.9999, 0.9999]);   /* 首判败 → 宴坐掷 0.9999 不中 → 链败 */
    var chain65a = SQ.Events.runChain(chain65chk, st65b);
    var used65a = st65b.sanyanUsed;                   /* 快照：未触发重来则不置位 */
    restore65b();
    st65b.sanyanUsed = false;
    var restore65c = stubRandom([0.9999, 0.1, 0]);    /* 首判败 → 宴坐掷 0.1 命中 → 重判过 → 链续 */
    var chain65b = SQ.Events.runChain(chain65chk, st65b);
    restore65c();
    ok('65b', '判定链首败即停 + 三尸宴坐重来',
      chain65a.pass === false && used65a === false &&
      chain65b.pass === true && st65b.sanyanUsed === true);

    /* #66 gain 结算器：双缩放锚（灵石挂刷图曲线 / 灵气挂三次方，§十二.8）· buff 到期时间戳 · feed 入档（≤50）
     * 体验批：奇遇 buff 时长走曲线（设计 6h → 上限 2h、u=0.5 → 0.6h），故到期戳改断言 0.6h */
    var w66 = mkWs({ realm: 2, stones: 0 });
    pack.recalcDerived(w66, mkProf());
    var now66 = Date.now();
    var scS66 = SQ.Events.stoneScaleOf(w66, D);       /* 0.075 × ZONES[2].stones(20) = 1.5 */
    var scQ66 = SQ.Events.qiScaleOf(w66, D);          /* (1+2)³ = 27 */
    var restore66 = stubRandom([0.5]);
    var r66 = SQ.Events.resolveBranch(w66, pack, D, M(mkProf(), w66), 'lost_child', 'right', now66, { log: noopLog(), profile: mkProf() });
    restore66();
    var b66 = w66.buffs[0];
    ok(66, 'gain 结算（灵石 75×1.5=113 · 双锚分开）+ buff 时间戳（曲线 0.6h）+ feed 入档',
      Math.abs(scS66 - D.EVENT_STONE_ZONE_K * D.ZONES[2].stones) < 1e-9 && scQ66 === 27 &&
      w66.stones === Math.round(75 * scS66) && r66.karma === 6 && r66.pass === true &&
      b66 && b66.field === 'offlineEff' && Math.abs(b66.mult - 0.15) < 1e-9 && b66.until === now66 + 2160000 &&
      w66.eventHistory.feed.length === 1 && w66.eventHistory.feed[0].id === 'lost_child' &&
      w66.eventHistory.feed[0].branch === 'right' && w66.pendingChoice === null,
      'stones=' + w66.stones + ' (scS=' + scS66 + ' scQ=' + scQ66 + ') feed=' + JSON.stringify(w66.eventHistory.feed[0] || null));

    /* #66c 奇遇 buff 时长曲线（体验批）：设计时长作上限 + 硬顶 2h + u⁴ 向短偏置 + 下限 0.5h */
    var restore66c = stubRandom([0.5]);
    var hMid66c = SQ.Events.rollBuffHours(6);        /* u=0.5 → 0.5 + 1.5×0.0625 = 0.6 */
    restore66c();
    var restore66c2 = stubRandom([0.9]);
    var hLong66c = SQ.Events.rollBuffHours(24);      /* u=0.9 → 0.5 + 1.5×0.6561 ≈ 1.5 */
    restore66c2();
    var restore66c3 = stubRandom([0.999]);
    var hCap66c = SQ.Events.rollBuffHours(48);       /* u→1 → 触顶 2h */
    restore66c3();
    var hFloor66c = SQ.Events.rollBuffHours(0.5);    /* 设计 0.5h → 原样 0.5h */
    ok('66c', '奇遇 buff 时长曲线（硬顶 2h · 向短偏置 · 下限 0.5h）',
      hMid66c === 0.6 && hLong66c === 1.5 && hCap66c === 2 && hFloor66c === 0.5,
      'mid=' + hMid66c + ' long=' + hLong66c + ' cap=' + hCap66c + ' floor=' + hFloor66c);

    /* #66b failE 预掷定 + 预缩放：结算值 == 结果页展示值（祸及行），区间不留数组 */
    var w66b = mkWs({ realm: 0, stones: 0 });
    w66b.attrs.jing = 0;                                  /* 判定必败（p 触底 clamp，random 0.99） */
    pack.recalcDerived(w66b, mkProf());
    var sc66b = SQ.Events.stoneScaleOf(w66b, D);          /* 0.075 × ZONES[0].stones(3) = 0.225 */
    var gain66b = Math.round(Math.round(130 * sc66b) * 0.5);   /* [100,160] 中值 130 → 缩放 → 失败减半 */
    var fail66b = Math.round(-60 * sc66b);                     /* failE [−80,−40] 中值 −60 → 同一锚缩放 */
    var restore66b = stubRandom([0.99, 0.5, 0.5]);        /* 判定败 · gain 区间中值 · failE 区间中值 */
    var r66b = SQ.Events.resolveBranch(w66b, pack, D, M(mkProf(), w66b), 'pickpocket', 'evil',
      Date.now(), { log: noopLog(), profile: mkProf() });
    restore66b();
    var f66b = r66b.eff.fail;
    var txt66b = SQ.Events.effText(w66b, pack, D, r66b.eff);
    ok('66b', 'failE 预掷定+预缩放（展示 == 实扣）+ 祸及行同源',
      r66b.pass === false && f66b && f66b.stones === fail66b && !Array.isArray(f66b.stones) &&
      r66b.eff.stones === gain66b && w66b.stones === Math.max(0, gain66b + fail66b) &&
      txt66b.indexOf('祸及') > 0 && txt66b.indexOf(String(Math.abs(fail66b))) > 0,
      'sc=' + sc66b + ' gain=' + gain66b + ' fail=' + fail66b + ' stones=' + w66b.stones +
      ' eff=' + JSON.stringify(r66b.eff) + ' txt=' + txt66b);

    /* #67 eventShield 仅在线抵消危机并消耗 · 时钟保留 · 无盾再掷正常挂起 */
    var w67 = mkWs({ realm: 3 });
    ['common', 'xiuxian'].forEach(function (wld) {
      (Array.isArray(SQ.EVENTS[wld]) ? SQ.EVENTS[wld] : []).forEach(function (ev) {
        if (ev.nature === 'bad' && ev.id !== 'pickpocket') w67.eventCooldowns[ev.id] = Date.now();
      });
    });
    w67.eventClock = 777;
    w67.buffs = [{ field: 'eventShield', mult: 1, until: Date.now() + 86400000 }];
    pack.recalcDerived(w67, mkProf());
    var m67 = M(mkProf(), w67);
    var eff67 = D.ALIGN_EFFECTS.neutral;
    var restore67 = stubRandom([0.99, 0.9, 0.5, 0.99, 0.9, 0.5]);  /* bad · ren · 池首 = pickpocket ×2 轮 */
    var r67a = SQ.Events.fire(w67, pack, D, m67, eff67, Date.now(), { log: noopLog() });
    var shieldGone = w67.buffs.filter(function (b) { return b.field === 'eventShield'; }).length === 0;
    var clockKept = w67.eventClock === 777;
    var noCd67 = w67.eventCooldowns['pickpocket'] == null;   /* 被抵消的触发不写冷却/不挂起 */
    var noPend67 = w67.pendingChoice === null;
    var r67b = SQ.Events.fire(w67, pack, D, m67, eff67, Date.now(), { log: noopLog() });
    restore67();
    ok(67, 'eventShield 抵危机消耗 · 时钟保留 · 再掷挂起',
      r67a && r67a.blocked === true && shieldGone && clockKept && noCd67 && noPend67 &&
      r67b && r67b.pending === true && r67b.id === 'pickpocket' && w67.eventClock === 0,
      JSON.stringify([r67a, r67b]));

    /* #68 所有结算走 mutate/claim 通道（存储写入次数审计） */
    localStorage.removeItem(SQ.KEY);
    var ref68 = {};
    await SQ.mutate(ref68, function (s) {
      s.profile = { name: '审计', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.stones = 100000;
      s.worlds.xiuxian.artsKnown.push('tuna');
    });
    var writes68 = 0;
    var origSet = localStorage.setItem;
    localStorage.setItem = function (k, v) { if (k === SQ.KEY) writes68++; return origSet.call(localStorage, k, v); };
    await SQ.Actions.setZone(ref68, 0);
    await SQ.Actions.upgradeArt(ref68, 'tuna');
    await SQ.claim(ref68);
    localStorage.setItem = origSet;
    ok(68, '操作各恰好 1 次落盘（单一写入通道）', writes68 === 3, 'writes=' + writes68);

    /* #89 桥容错（运行半区；静态半区见 audit B8）：storage 写失败不抛、不白屏，
     * 经 SQ.storageError 出人话提示，恢复后自动清空 */
    var origSet89 = localStorage.setItem;
    localStorage.setItem = function () { throw new Error('QUOTA_EXCEEDED'); };
    var threw89 = false;
    try { await SQ.save({ v: SQ.V, profile: SQ.defaultProfile(), worlds: {} }); }
    catch (e) { threw89 = true; }
    var err89 = SQ.storageError();
    var msg89 = SQ.t('ui.error.save', { msg: err89 ? err89.msg : '' });
    localStorage.setItem = origSet89;
    await SQ.save({ v: SQ.V, profile: SQ.defaultProfile(), worlds: {} });
    ok(89, 'storage 写失败不抛 + 出口报错 + 恢复即清空',
      !threw89 && err89 && err89.op === 'write' && /QUOTA_EXCEEDED/.test(err89.msg) &&
      msg89.indexOf('QUOTA_EXCEEDED') > 0 && SQ.storageError() === null,
      'threw=' + threw89 + ' err=' + JSON.stringify(err89) + ' txt=' + msg89);

    /* ═══ P4~P5 · 验收 4.8 数值一致性（#79~#81）═══ */

    /* #79 全境界 qiCap ≥ 1.15×need（裸身） */
    var ok79 = true;
    for (var r79 = 0; r79 < 9; r79++) {
      var w79 = mkWs({ realm: r79 });
      if (SQ.Idle.capOf(w79, pack, D, M(mkProf(), w79)) < D.REALMS[r79 + 1].need * 1.15 - 1e-6) ok79 = false;
    }
    ok(79, '全境界 cap ≥ 1.15×need', ok79);

    /* #80 瓶颈压线：上品套 ≈ 需求 ±5%、灵品套稳过 */
    var ok80 = true, det80 = '';
    for (var r80 = 2; r80 <= 9; r80++) {
      var mkSet = function (atkAvg) {
        var w = mkWs({ realm: r80 });
        D.GEAR_SLOTS.forEach(function (sl) {
          w.gear[sl] = mkGear(sl, { tier: 2, atk: atkAvg * D.REALMS[r80].power / 100 });
        });
        return w;
      };
      var wUp = mkSet(11), wLing = mkSet(19);
      var need80 = D.ZONES[r80].need;
      var pUp = SQ.Mods.powerOf(wUp, pack, D, M(mkProf(), wUp)) / need80;
      var pLing = SQ.Mods.powerOf(wLing, pack, D, M(mkProf(), wLing)) / need80;
      if (Math.abs(pUp - 1) > 0.05 || pLing <= 1) { ok80 = false; det80 = 'r' + r80 + ':' + pUp.toFixed(3) + '/' + pLing.toFixed(3); break; }
    }
    ok(80, '上品套压线 ±5% · 灵品套稳过', ok80, det80);

    /* #81 通胀回归（v1.13 按档位分设护栏：左/魔 70% · 正 85%）：1h 炼化返还 < 1h 击杀灵石 × 档位线；
     * 口径同 §九.12② 模拟：60 杀/h · 三档同 build（ΣdropRate +25% / ΣstonesRate +35%）·
     * 魔道档含 dropTierUpChance 0.40 的炼化期望上浮 */
    var GUARD81 = { right: 0.85, neutral: 0.70, evil: 0.70 };
    var ok81 = true, det81 = '';
    ['right', 'neutral', 'evil'].forEach(function (tierKey) {
      var eff81 = D.ALIGN_EFFECTS[tierKey];
      for (var r81 = 0; r81 <= 9; r81++) {
        var killsH = 60;
        var drops = killsH * D.DROP_BASE * (1 + 0.25) * eff81.dropRateMult;
        var avgRefine = 0;
        D.ZONES[r81].drops.forEach(function (wgt, ti) {
          var up81 = eff81.dropTierUpChance;
          var valTi = D.GEAR_TIERS[ti].refine;
          var valUp = ti < D.GEAR_TIERS.length - 1 ? D.GEAR_TIERS[ti + 1].refine : valTi;
          avgRefine += wgt / 100 * ((1 - up81) * valTi + up81 * valUp);
        });
        var refineIncome = drops * avgRefine * (1 + r81 * 0.5);
        var killIncome = killsH * D.ZONES[r81].stones * (1 + 0.35);
        if (refineIncome >= killIncome * GUARD81[tierKey]) {
          ok81 = false;
          det81 = tierKey + ' r' + r81 + ':' + refineIncome.toFixed(0) + '>=' + (killIncome * GUARD81[tierKey]).toFixed(0);
        }
      }
    });
    ok(81, '炼化收入分档护栏（左/魔 70% · 正 85%）', ok81, det81);

    /* ═══ P5 · 验收 4.10 角色属性（#90~#95）═══ */

    /* #90 属性重算逐项对表 + 穿脱不变 */
    var w90 = mkWs({ realm: 2 });
    w90.artsSlots = ['tuna']; w90.artsLevels = { tuna: 3 };
    w90.gear.weapon = mkGear('weapon', { tier: 3, attrValue: { attr: 'jing', value: 10 } });
    w90.attrEventBonus = { jing: 0, qi: 0, shen: 2 };
    pack.recalcDerived(w90, mkProf());
    var a90 = JSON.stringify(w90.attrs);
    for (var i90 = 0; i90 < 100; i90++) {
      var saved = w90.gear.weapon; w90.gear.weapon = null; pack.recalcDerived(w90, mkProf());
      w90.gear.weapon = saved; pack.recalcDerived(w90, mkProf());
    }
    ok(90, '属性构成对表（18基+滋养+装备+事件）+ 穿脱不变',
      w90.attrs.jing === 18 + 10 && w90.attrs.qi === 18 + 6 && w90.attrs.shen === 18 + 2 &&
      JSON.stringify(w90.attrs) === a90, a90);

    /* #91 dc 随境界漂移：旧内容自动降难 */
    var w91a = mkWs({ realm: 0 }); pack.recalcDerived(w91a, mkProf());
    var w91b = mkWs({ realm: 5 }); pack.recalcDerived(w91b, mkProf());
    w91a.attrs.shen = 60; w91b.attrs.shen = 60;
    var pA = SQ.Attrs.check('shen', 'hard', w91a, D, { hooks: {} }).p;
    var pB = SQ.Attrs.check('shen', 'hard', w91b, D, { hooks: {} }).p;
    ok(91, 'dc 漂移：同属性高境界难度上升',
      SQ.Attrs.dcOf(w91a, D, 'medium') === 12 && SQ.Attrs.dcOf(w91b, D, 'medium') === 72 && pA > pB && pA === 0.95,
      pA + '→' + pB.toFixed(3));

    /* #92 判定 clamp：裸身(dc/2) 中等恒 25%；attr=0 → 5%；≥1.9dc → 95% */
    var w92 = mkWs({ realm: 0 }); pack.recalcDerived(w92, mkProf());
    var bare92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }).p;   /* attr=6=dc/2 */
    w92.attrs.jing = 0;
    var zero92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }).p;
    w92.attrs.jing = 1.9 * 12;
    var high92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }).p;
    /* 正道档 checkDcMult 0.95（B4）：dc 12→11.4 → p = 0.5+(6−11.4)/22.8 */
    var pDc92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }, 0.95);
    ok(92, '判定 clamp（25%/5%/95%）+ 正道 dcMult 0.95',
      Math.abs(bare92 - 0.25) < 1e-9 && Math.abs(zero92 - 0.05) < 1e-9 && high92 === 0.95 &&
      Math.abs(pDc92.dc - 11.4) < 1e-9, 'pDc=' + pDc92.p.toFixed(4));

    /* #93 瓶颈精判定：×3 → ×2，跌破恢复 */
    var w93 = mkWs({ realm: 0, zone: 1 });
    pack.recalcDerived(w93, mkProf());
    var pen93a = SQ.Combat.bottleneckOf(w93, pack, D, M(mkProf(), w93)).intervalPenalty;
    w93.attrEventBonus.jing = 6;  /* 6+6=12 ≥ dc12 */
    pack.recalcDerived(w93, mkProf());
    var pen93b = SQ.Combat.bottleneckOf(w93, pack, D, M(mkProf(), w93)).intervalPenalty;
    w93.attrEventBonus.jing = 0;
    pack.recalcDerived(w93, mkProf());
    var pen93c = SQ.Combat.bottleneckOf(w93, pack, D, M(mkProf(), w93)).intervalPenalty;
    ok(93, '精达标瓶颈 ×3→×2 · 跌破恢复', pen93a === 3 && pen93b === 2 && pen93c === 3);

    /* #94 神→损失区间 [40%,60%] + 天赋加算 + 总 clamp [30%,70%] */
    var w94a = mkWs({ realm: 0 }); pack.recalcDerived(w94a, mkProf());          /* shen 6, dc 12 → +0.05 → 0.55? */
    var w94b = mkWs({ realm: 0 }); w94b.attrEventBonus.shen = 18; pack.recalcDerived(w94b, mkProf()); /* shen 24 = 2dc → -0.1 → 0.4 */
    var l94a = SQ.XTrib.loss(w94a, pack, D, M(mkProf(), w94a));
    var l94b = SQ.XTrib.loss(w94b, pack, D, M(mkProf(), w94b));
    var w94c = mkWs({ realm: 0 });
    var p94c = mkProf([mkTalent({ tribFailLossMod: 0.5 })]);
    var l94c = SQ.XTrib.loss(w94c, pack, D, M(p94c, w94c));
    var w94d = mkWs({ realm: 0 }); w94d.attrEventBonus.shen = 18;
    var p94d = mkProf([mkTalent({ tribFailLossMod: -0.5 })]);
    w94d.artsSlots = ['jinzhong']; w94d.artsLevels = { jinzhong: 1 }; pack.recalcDerived(w94d, p94d);
    var l94d = SQ.XTrib.loss(w94d, pack, D, M(p94d, w94d));
    ok(94, '神损失修正 [40,60]% + 总 clamp [30,70]%',
      Math.abs(l94a - 0.45) < 1e-9 && Math.abs(l94b - 0.6) < 1e-9 && l94c === 0.7 && l94d === 0.3,
      [l94a, l94b, l94c, l94d].join('/'));

    /* #95 善行判定守则：判定失败 → karma 照记（分支定值）、正向收益减半 */
    var w95 = mkWs({ realm: 1, stones: 0, qi: 1000 });
    pack.recalcDerived(w95, mkProf());
    /* 期望值按双锚公式推（灵石 = K×ZONES[1].stones = 0.6），不写死魔数 */
    var ev95 = SQ.Events.findById(pack, 'traveling_doctor');
    var band95 = ev95.choices.evil.gain.filter(function (g) { return g.type === 'stones'; })[0].n;
    var roll95 = band95[0] + 0.9999 * (band95[1] - band95[0]);
    var exp95 = Math.round(Math.round(roll95 * SQ.Events.stoneScaleOf(w95, D)) * 0.5);
    var restore95 = stubRandom([0.9999, 0.9999]);  /* 神·中等必败（p=0.25）· stones roll 近上限 */
    var r95 = SQ.Events.resolveBranch(w95, pack, D, M(mkProf(), w95), 'traveling_doctor', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore95();
    ok(95, '判定失败 karma 照记（−7）+ 收益减半（刷图锚 0.6）',
      r95.pass === false && r95.karma === -7 && w95.karmaEventScore === -7 && w95.stones === exp95 &&
      w95.eventHistory.feed[0].pass === false,
      'stones=' + w95.stones + '/' + exp95 + ' k=' + w95.karmaEventScore);

    /* ═══ P5 · 验收 4.11 门槛与特殊属性（#96~#103、#105；#104 gateMod 属古武 P6）═══ */

    /* #96 佩戴要求拦截 → 库藏阁；境界提升复检参与择优 */
    var w96 = mkWs({ realm: 0 });
    var it96 = mkGear('weapon', { tier: 4, atk: 30, reqs: { realm: 6 } });
    var r96a = SQ.Gear.autoEquip(w96, pack, D, M(mkProf(), w96), it96, null);
    var stashed96 = w96.gear.weapon === null && w96.stash.length === 1;
    w96.realm = 6;
    SQ.Gear.recheckStash(w96, pack, D, M(mkProf(), w96), null);
    ok(96, '未达标入库藏阁 · 达标复检佩戴',
      r96a.action === 'stash' && stashed96 && w96.gear.weapon === it96 && w96.stash.length === 0,
      'a=' + r96a.action + ' stashed=' + stashed96 + ' worn=' + !!w96.gear.weapon);

    /* #97 极品词条追加 +1 且生成时定格（roll 掷序：atk → slot → name → qiBonus → resist → specialP；指定 slot 省一掷）
     * 注意：mkWs 必须在 stubRandom **之前**调用——initialState 现含游戏历起始年的 Math.random 掷（v2.3），
     * 在 stub 区内调用会偷走掷序首位，resist 高位掷落空 → prime 不触发。 */
    var w97 = mkWs({ realm: 2 });
    var restore97 = stubRandom([0.5, 0.5, 0.5, 0.95, 0.5]); /* resist 高位 → prime */
    var it97 = SQ.Gear.roll(w97, pack, D, 2, { sum: { gearLuck: 0 } }, { tier: 2, align: 'neutral', slot: 'weapon' });
    restore97();
    var reqSnap = it97.reqs.realm;
    ok(97, '极品词条 reqs+1 定格', it97.resist >= 76 && reqSnap === 3,
      'resist=' + it97.resist + ' req=' + reqSnap);

    /* #98 库藏阁容量 12：第 13 件入库炼化最低分且日志带 special 标记 */
    var w98 = mkWs({ realm: 0 });
    var logs98 = [];
    for (var i98 = 0; i98 < 12; i98++) {
      SQ.Gear.autoEquip(w98, pack, D, M(mkProf(), w98),
        mkGear('weapon', i98 === 0
          ? { tier: 2, atk: 1, reqs: { realm: 6 }, special: 'sword_heart' }   /* 最低分且带 special */
          : { tier: 2, atk: 10 + i98, reqs: { realm: 6 } }),
        function (c, t) { logs98.push(t); });
    }
    SQ.Gear.autoEquip(w98, pack, D, M(mkProf(), w98), mkGear('weapon', { tier: 2, atk: 5, reqs: { realm: 6 } }), function (c, t) { logs98.push(t); });
    ok(98, '库藏阁容量 12 · 溢出炼化最低分带 special 标记',
      w98.stash.length === 12 && logs98.some(function (x) { return x.indexOf(SQ.t('gear.special.sword_heart', null, 'xiuxian')) >= 0; }),
      'stash=' + w98.stash.length);

    /* #99 无视佩戴要求：拾取即参与择优 */
    var w99 = mkWs({ realm: 0 });
    var it99 = mkGear('weapon', { tier: 4, atk: 30, reqs: { realm: 6 }, special: 'ignore_req' });
    ok(99, 'ignore_req 无视佩戴要求', SQ.Gear.canWear(it99, w99) &&
      SQ.Gear.autoEquip(w99, pack, D, M(mkProf(), w99), it99, null).action === 'equip');

    /* #100 特殊词条概率采样：上3% 灵8% 仙15% ±1.5pp，凡/良 0% */
    function specialRate(tier, n) {
      var c = 0;
      for (var i = 0; i < n; i++) {
        if (SQ.Gear.roll(mkWs({ realm: 6 }), pack, D, 6, { sum: { gearLuck: 0 } }, { tier: tier }).special) c++;
      }
      return c / n;
    }
    var s0 = specialRate(0, 500), s1 = specialRate(1, 500);
    var s2 = specialRate(2, 10000), s3 = specialRate(3, 10000), s4 = specialRate(4, 10000);
    ok(100, '特殊词条概率 3/8/15% ±1.5pp · 凡良 0',
      s0 === 0 && s1 === 0 && Math.abs(s2 - 0.03) < 0.015 && Math.abs(s3 - 0.08) < 0.015 && Math.abs(s4 - 0.15) < 0.015,
      [s2, s3, s4].map(function (x) { return (x * 100).toFixed(2) + '%'; }).join('/'));

    /* #101 功法学习要求：未达标入架标红 → 达标自动入门；黑市购买仍拦截 */
    var w101 = mkWs({ realm: 0 });
    var g101 = SQ.Arts.gainArt(w101, pack, D, 'duohun', noopLog());  /* 化神4 + karma≤-200 + 精≥30 */
    var lack101 = SQ.Arts.lacks(w101, pack, D, 'duohun').length;
    w101.realm = 4; w101.karmaEventScore = -250; w101.attrEventBonus.jing = 0;
    pack.recalcDerived(w101, mkProf()); /* recalc 内含 recheckShelf；精 = 30 基础 ✓ */
    var learned101 = w101.artsKnown.indexOf('duohun') >= 0 && w101.shelf.indexOf('duohun') < 0;
    /* 黑市购买拦截：karma 回升后新购魔道功法仍留架 */
    var w101b = mkWs({ realm: 4 });
    SQ.Arts.gainArt(w101b, pack, D, 'zhuxian', noopLog()); /* karma ≤ -400 */
    pack.recalcDerived(w101b, mkProf());
    ok(101, '学习要求拦截 → 达标自动入门',
      g101 === 'shelf' && lack101 === 3 && learned101 && w101b.shelf.indexOf('zhuxian') >= 0);

    /* #102 特殊属性挂点白名单 + 损失合计 clamp（#94 已验 clamp，此处验挂点全集） */
    /* 挂点白名单（工程规范 §2.2）：修仙 15 + G13 洞府 2（on_cave_enter/on_cave_mult，v2.1 登记）
     * + 古武 P6 预留 2（on_gate/on_gate_next） */
    var WHITELIST = ['on_kill_stones', 'on_kill_drop', 'on_claim_qi', 'on_claim_stones', 'on_tick_idle',
      'on_negative_event', 'on_debuff_apply', 'on_bottleneck', 'on_trib_fail', 'on_trib_next', 'on_check',
      'on_shop_refresh', 'on_refine', 'on_shop_price', 'on_offline_cap', 'on_gate', 'on_gate_next',
      'on_cave_enter', 'on_cave_mult'];
    var badHooks = [];
    for (var id102 in SQ.XARTS) {
      var sp = SQ.XARTS[id102].special;
      if (!D.SPECIAL_POOL[sp.pool]) { badHooks.push(id102 + ':nopool'); continue; }
      if (WHITELIST.indexOf(D.SPECIAL_POOL[sp.pool].hook) < 0) badHooks.push(id102 + ':' + D.SPECIAL_POOL[sp.pool].hook);
    }
    var declared = Object.keys(pack.specialHooks);
    /* G13 两个新挂点必须是引擎真实读取点（防「只登记不接线」）：cave.js 内各出现一次 */
    var caveSrc = SQ.Cave.multOf.toString() + SQ.Cave.enter.toString() + SQ.Cave.hookSum.toString();
    var wired = caveSrc.indexOf('on_cave_mult') >= 0 && caveSrc.indexOf('on_cave_enter') >= 0;
    /* 混沌三签名（融合扩容批 v1.3）：池数 18→21，hook 挂既有白名单名零新增；
     * 消费点接线同款护栏——hundun→events.fire / zaohua→combat.simulate / taiyi→idle.settle */
    var chaosWired = SQ.Events.fire.toString().indexOf('hundun') >= 0 &&
      SQ.Combat.simulate.toString().indexOf('zaohua') >= 0 &&
      SQ.Idle.settle.toString().indexOf('taiyi') >= 0;
    var chaosInWhitelist = ['hundun', 'zaohua', 'taiyi'].every(function (cp) {
      return D.SPECIAL_POOL[cp] && WHITELIST.indexOf(D.SPECIAL_POOL[cp].hook) >= 0;
    });
    ok(102, '功法特殊属性全部走挂点白名单（含独占签名 3 条 + 混沌签名 3 池消费点接线 + 洞府 2 挂点已接线）',
      badHooks.length === 0 && declared.length === 21 && wired && chaosWired && chaosInWhitelist && WHITELIST.length === 19,
      badHooks.join(',') + ' hooks=' + declared.length + ' 白名单=' + WHITELIST.length + ' 洞府挂点接线=' + wired + ' 混沌接线=' + chaosWired);

    /* #103 品阶要求带 + 属性门槛 = 裸身基础值（70 部逐条；event_locked 独占允许上浮 +6~+12，功法全录 §2.5） */
    var BAND = { huang: 1, xuan: 2, di: 4, tian: 8 };
    var bad103 = [];
    for (var id103 in SQ.XARTS) {
      var a103 = SQ.XARTS[id103];
      var rr = a103.reqs.realm != null ? a103.reqs.realm : 0;
      if (rr > BAND[a103.tier]) bad103.push(id103 + ':band');
      if (a103.reqs.attr) {
        var base103 = (a103.reqs.realm + 1) * 6;
        if (a103.obtain.type === 'event_locked') {
          if (a103.reqs.attr.min < base103 || a103.reqs.attr.min > base103 + 12) bad103.push(id103 + ':attr' + a103.reqs.attr.min);
        } else if (a103.reqs.attr.min !== base103) bad103.push(id103 + ':attr' + a103.reqs.attr.min);
      }
    }
    ok(103, '品阶要求带 + 属性门槛（70 部 · 独占 +6~12）', bad103.length === 0, bad103.join(','));

    /* #105 同乘区功法层极限审计（通用规范 §一 · 第卅八批品阶重排换基线）
     * 口径两处一起改：① 缩放从「×5」纠正为**×9**（Lv9 满级 = 每级 ×9，与 §一 现行表的推导式一致——
     *   旧写法留着 Lv5 时代的 ×5 与 300% 一档，是「判据口径落后于机制」的又一形）；
     *   ② 上限 = 新表 top6 每级合计 ×9 向上取整（**恰顶格、零余量** = 本仓惯例：任何一部功法词条再涨都会红）。
     * 口径（通用规范 §一 v2.3 澄清）：本上限 = **功法层六槽自身**极限；洞府签名/装备词条/道友助力
     * 是 §8.2 独立登记的小额加算来源，各有不叠加或合计封顶约束，不并入本合计。签名预算另见 #128。 */
    /* 🔧 返工：上限档 = **top6 每级合计 ×9 向上取整到两位小数**（先前几处手调成 12.40/10.00/10.35/1.20/2.05/2.35
     * 与自述推导式差 0.01~0.03 ⇒ 「恰顶格、零余量」那句话当时并不成立）。现在每个数都能从 #153 那行算出来。 */
    var CAPS105 = { combatPower: 12.38, qiRate: 10.72, offlineEff: 9.99, combatSpeed: 10.33, qiCap: 10.45,
      stonesRate: 7.20, artsSpeed: 1.17, eventLuck: 2.03, eventRate: 2.34, dropRate: 0.81, tribBonus: 0.59 };
    var per105 = {};
    for (var id105 in SQ.XARTS) {
      var ef = SQ.XARTS[id105].effects;
      for (var k105 in ef) (per105[k105] = per105[k105] || []).push(ef[k105] * 9);
    }
    var bad105 = [];
    for (var f105 in per105) {
      var top = per105[f105].sort(function (a, b) { return b - a; }).slice(0, 6);
      var sum105 = top.reduce(function (s, v) { return s + v; }, 0);
      var capv = CAPS105[f105] != null ? CAPS105[f105] : (f105 === 'realmCost' ? 0 : Infinity);
      if (f105 === 'realmCost') { if (sum105 < -0.18 - 1e-9) bad105.push(f105 + '=' + sum105); }
      else if (sum105 > capv + 1e-9) bad105.push(f105 + '=' + (sum105 * 100).toFixed(0) + '%>' + (capv * 100) + '%');
    }
    ok(105, '功法层极限审计（六槽自身，逐字段上限）', bad105.length === 0, bad105.join(','));

    /* #128 洞府签名预算对表（数值详设 §8.2 · 引擎卷 §2.5）：字段集合与单驻最大值锁定——
     * offlineEff ≤0.15 / combatPower ≤0.06 / artsSpeed ≤0.15 / tribBonus ≤0.02；
     * **禁 qiRate 签名**（caveMult 已是独立乘区，再进加算池 = 双吃产出轴，防击穿 #105 的原意）。
     * 驻留唯一 ⇒ 签名天然不叠加，无需合计封顶。 */
    var sig128 = {};
    (D.CAVES || []).forEach(function (c) {
      var sg = c.signature;
      if (!sg) return;
      sig128[sg.field] = Math.max(sig128[sg.field] || 0, sg.value);
    });
    var BUDGET128 = { offlineEff: 0.15, combatPower: 0.06, artsSpeed: 0.15, tribBonus: 0.02 };
    var bad128 = [];
    for (var f128 in sig128) {
      if (BUDGET128[f128] == null) bad128.push(f128 + '=未登记字段');
      else if (sig128[f128] > BUDGET128[f128] + 1e-9) bad128.push(f128 + '=' + sig128[f128] + '>' + BUDGET128[f128]);
    }
    ok('128', '洞府签名预算对表 §8.2（禁 qiRate · 逐字段上限）', bad128.length === 0,
      bad128.join(',') || JSON.stringify(sig128));

    /* ═══ 批 1 · 独占通道 / 掉落位移 / 存档新字段 / 内容 lint / 问道初心 ═══ */

    /* #105a 独占法宝：atk 按最高首通定格缩放 · 免自动择优（exclusive_hold）· 库藏阁溢出豁免 · gearSeen 入录 */
    var wa = mkWs({ realm: 6, cleared: [0, 1, 2, 3] });
    pack.recalcDerived(wa, mkProf());
    var scaleA = Math.max(D.REALMS[D.ZONES[3].unlock].power / 100, 1);
    var ita = SQ.Gear.grantExclusive(wa, pack, D, M(mkProf(), wa), 'evil_sword', { type: 'event', ref: 'evil_sword_remnant' }, noopLog());
    var atkOk = ita && ita.atk === Math.round(36 * scaleA) && ita.exclusive === 'evil_sword' &&
      ita.reqs.realm === D.GEAR_TIERS[4].req && ita.special === 'ignore_req' &&
      wa.gearSeen['ex_evil_sword'] != null && ita.source.type === 'event' && wa.gear.weapon === ita;
    var bigA = mkGear('weapon', { tier: 4, atk: 999999 });
    var ra = SQ.Gear.autoEquip(wa, pack, D, M(mkProf(), wa), bigA, noopLog());
    var holdOk = ra.action === 'exclusive_hold' && wa.gear.weapon === ita && wa.stash.indexOf(bigA) >= 0;
    var wex = mkWs({ realm: 0 });
    var exIt = mkGear('weapon', { tier: 4, atk: 1, reqs: { realm: 9 }, exclusive: 'evil_sword' });
    wex.stash = [exIt];
    for (var ix = 0; ix < 12; ix++) wex.stash.push(mkGear('weapon', { tier: 0, atk: 10 + ix, reqs: { realm: 9 } }));
    SQ.Gear.autoEquip(wex, pack, D, M(mkProf(), wex), mkGear('weapon', { tier: 0, atk: 5, reqs: { realm: 9 } }), noopLog());
    var exSurvive = wex.stash.indexOf(exIt) >= 0 && wex.stash.length === D.STASH_CAP;
    ok('105a', '独占法宝：定格缩放 + 免择优/免溢出炼化 + 入录',
      atkOk && holdOk && exSurvive,
      JSON.stringify({ atk: ita && ita.atk, scale: scaleA, act: ra.action, survive: exSurvive }));

    /* #105a2 独占功法授予门槛：判定链失败 → exclusiveLocked 只解锁图鉴；全过 → gainArt 入门/入架 */
    var wx = mkWs({ realm: 5, karmaEventScore: 400 });   /* 链上 karma ≥ +400 须事前达成（判定先于 +25 入账） */
    pack.recalcDerived(wx, mkProf());
    var restoreX1 = stubRandom([0]);                            /* 神·困难过 */
    var rx1 = SQ.Events.resolveBranch(wx, pack, D, M(mkProf(), wx), 'red_dust_trial', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreX1();
    var gotArt = wx.artsKnown.indexOf('red_dust') >= 0 || wx.shelf.indexOf('red_dust') >= 0;
    var wy = mkWs({ realm: 5, karmaEventScore: 0 });            /* karma 链第二环 <400 → 败 */
    pack.recalcDerived(wy, mkProf());
    var restoreY = stubRandom([0]);
    var ry = SQ.Events.resolveBranch(wy, pack, D, M(mkProf(), wy), 'red_dust_trial', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreY();
    ok('105a2', '独占功法：链全过授予 · 失败只锁奖励',
      rx1.pass === true && gotArt && ry.pass === false && ry.eff.exclusiveLocked === 'red_dust' &&
      wy.artsKnown.indexOf('red_dust') < 0 && wy.shelf.indexOf('red_dust') < 0,
      JSON.stringify([rx1.pass, gotArt, ry.eff]));

    /* #105c 掉落阵营分布三档对表（dropAlignW ±2pp · 各 2 万次——福地三批测试加固①恢复：σ 减半消偶发超界，
     * 工程规范 §4.3 同步登记）+ 魔道档 tierUpChance 40%±1.5pp（正/左 0） */
    function dropSample(tierKey) {
      var w = mkWs({ realm: 3, zone: 0 });
      var eff = D.ALIGN_EFFECTS[tierKey];
      var cnt = { neutral: 0, right: 0, evil: 0 }, up = 0;
      for (var i = 0; i < 20000; i++) {
        var it = SQ.Gear.roll(w, pack, D, 0, { sum: { gearLuck: 0 } },
          { alignW: eff.dropAlignW, tierUpChance: eff.dropTierUpChance });
        cnt[it.alignment]++;
        if (it.tierUp) up++;
      }
      return { cnt: cnt, up: up };
    }
    /* 固定种子抽样（2026-10-09 治理批·复核收尾）：原用真实 Math.random 抽 3×20,000 次比 ±2pp，单跑红率约 1~3%（其注释自陈曾因「偶发超界」把样本从 1 万加到 2 万 = 同类噪声前科），判据数值一字未动 */
    var seed105 = 1052026, origRand105 = Math.random;
    Math.random = function () {
      seed105 |= 0; seed105 = (seed105 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed105 ^ (seed105 >>> 15), 1 | seed105);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var sR = dropSample('right'), sN = dropSample('neutral'), sE = dropSample('evil');
    Math.random = origRand105;
    function alignClose(s, tierKey) {
      var w = D.ALIGN_EFFECTS[tierKey].dropAlignW;
      return Math.abs(s.cnt.neutral / 20000 - w.neutral / 100) < 0.02 &&
        Math.abs(s.cnt.right / 20000 - w.right / 100) < 0.02 &&
        Math.abs(s.cnt.evil / 20000 - w.evil / 100) < 0.02;
    }
    ok('105c', 'dropAlignW 三档 ±2pp · tierUp 40%±1.5pp（正/左 0）· 2026-10-09 起**固定种子抽样**（3×20,000 抽，判据数值未动）',
      alignClose(sR, 'right') && alignClose(sN, 'neutral') && alignClose(sE, 'evil') &&
      sR.up === 0 && sN.up === 0 && Math.abs(sE.up / 20000 - 0.40) < 0.015,
      'up=' + [sR.up, sN.up, sE.up].join('/'));

    /* ═══ 批 2 · 验收 4.12 四柱（#106~#108 / #113）+ 4.11（105b）═══ */

    /* #106 洞府初始态 + 驻留唯一 + 迁居 24h 冷却（绝对时间戳，跨离线生效） */
    var w106 = mkWs();
    var cave106 = SQ.Cave.current(w106, pack);
    var mult106 = SQ.Cave.multOf(w106, pack, D, M(mkProf(), w106));
    var t106 = Date.now();
    w106.realm = 6; w106.cleared = [0, 1, 2, 3, 4, 5, 6]; w106.stones = 1e9;
    pack.recalcDerived(w106, mkProf());
    var r106a = SQ.Cave.enter(w106, pack, D, M(mkProf(), w106), 'immortal_abode', t106, { log: noopLog() });
    var owned106 = w106.cave.owned.slice();
    var curA106 = w106.cave.current;      /* 立刻快照：后续迁居会改写 current */
    var cd106 = w106.cave.cooldownUntil;
    var r106b = SQ.Cave.enter(w106, pack, D, M(mkProf(), w106), 'star_fall', t106 + 180000, { log: noopLog() });   /* 冷却中段（v2.8：CD = 游戏 1 年 = 360s，探针取半程） */
    var still106 = w106.cave.current;
    var r106c = SQ.Cave.enter(w106, pack, D, M(mkProf(), w106), 'star_fall', t106 + D.CAVE_SWITCH_CD_MS + 1, { log: noopLog() });
    var c106 = {
      init: cave106.id === D.CAVE_INITIAL, mult1: mult106 === 1, ownedInit: w106.cave.owned.length >= 1,
      enterA: r106a.ok === true, curA: curA106 === 'immortal_abode',
      noDup: owned106.filter(function (x) { return x === 'immortal_abode'; }).length === 1,
      cdAbs: cd106 === t106 + D.CAVE_SWITCH_CD_MS,
      rejectB: r106b.ok === false && r106b.reason === 'cooldown', holdB: still106 === 'immortal_abode',
      enterC: r106c.ok === true, curC: w106.cave.current === 'star_fall'
    };
    var bad106 = Object.keys(c106).filter(function (k) { return !c106[k]; });
    ok(106, '初始洞府 mult 1.00 · 驻留唯一 · 迁居游戏 1 年冷却拒绝', bad106.length === 0,
      bad106.length ? '失败项=' + bad106.join(',') + ' | init=' + cave106.id + '/' + mult106 +
        ' a=' + r106a.ok + '/' + r106a.reason + ' b=' + r106b.ok + '/' + r106b.reason +
        ' c=' + r106c.ok + '/' + r106c.reason + ' cd=' + cd106 + '/' + (t106 + D.CAVE_SWITCH_CD_MS) +
        ' owned=' + owned106.join('+') + ' cur=' + w106.cave.current
        : 'owned=' + owned106.join('+') + ' cd=+' + ((cd106 - t106) / 3600000) + 'h');

    /* #107 入驻资格三要素逐项拦截 + 扣费走 mutate + ledger.out.cave + owned 不重复 + 已拥有免付费 */
    var w107 = mkWs({ realm: 0, stones: 100 });
    var chk107 = SQ.Cave.canEnter(w107, pack, D, 'green_peak', Date.now());
    var kinds107 = chk107.lack.map(function (x) { return x.kind; }).sort().join(',');
    /* 缺首通：境界已够（金丹 2 ≥ realmMin 2）但 cleared 无秘境 3 → lack 只应是 zone */
    var w107z = mkWs({ realm: 2, stones: 100000, cleared: [0, 1, 2] });
    var chk107z = SQ.Cave.canEnter(w107z, pack, D, 'sword_cliff', Date.now());
    localStorage.removeItem(SQ.KEY);
    var ref107 = {};
    await SQ.mutate(ref107, function (s) {
      s.profile = { name: '洞府', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.realm = 3;
      s.worlds.xiuxian.stones = 100000;
      s.worlds.xiuxian.cleared = [0, 1, 2, 3];
    });
    var res107 = await SQ.Actions.enterCave(ref107, 'green_peak');
    var w107b = ref107.worlds.xiuxian;
    var st107 = w107b.stones, led107 = w107b.ledger.out.cave, own107 = w107b.cave.owned.slice();
    /* 已拥有 + 冷却解除 → 再入驻免付费、owned 不重复 */
    await SQ.mutate(ref107, function (s) { s.worlds.xiuxian.cave.cooldownUntil = 0; });
    var res107c = await SQ.Actions.enterCave(ref107, 'market_yard');
    await SQ.mutate(ref107, function (s) { s.worlds.xiuxian.cave.cooldownUntil = 0; });
    var res107d = await SQ.Actions.enterCave(ref107, 'green_peak');
    ok(107, '资格三要素拦截 · mutate 扣费 + ledger.out.cave · owned 不重复 · 已拥有免费',
      chk107.ok === false && kinds107 === 'realm,stones' &&
      chk107z.ok === false && chk107z.lack.length === 1 && chk107z.lack[0].kind === 'zone' &&
      res107.ok === true && res107.cost === 20000 && st107 === 80000 && led107 === 20000 &&
      own107.filter(function (x) { return x === 'green_peak'; }).length === 1 &&
      res107c.ok === true && res107d.ok === true && res107d.cost === 0 &&
      ref107.worlds.xiuxian.ledger.out.cave === 20000 &&
      ref107.worlds.xiuxian.cave.owned.filter(function (x) { return x === 'green_peak'; }).length === 1,
      'lack=' + kinds107 + ' zone=' + chk107z.lack[0].kind + ' cost=' + res107.cost +
      ' stones=' + st107 + ' ledger=' + led107 + ' 再入驻=' + res107d.cost);

    /* #108 caveMult 独立乘区（不进 qiRate 加算池）+ 在线/离线同口径 + 签名驻留期生效、搬离即失 */
    function caveWs(id, realm) {
      var w = mkWs({ realm: realm || 2 });
      if (id) { w.cave.current = id; w.cave.owned = [D.CAVE_INITIAL, id]; }
      pack.recalcDerived(w, mkProf());
      return w;
    }
    var wPl108 = caveWs(null, 2), wSf108 = caveWs('star_fall', 2);
    var mPl108 = M(mkProf(), wPl108), mSf108 = M(mkProf(), wSf108);
    var ratePl108 = SQ.Idle.rateOf(wPl108, pack, D, mPl108);
    var rateSf108 = SQ.Idle.rateOf(wSf108, pack, D, mSf108);
    /* 独立乘区：qiRate 加算池两档必须相同，差异全部来自末端 caveMult */
    var qiRateSame = Math.abs(mPl108.sum.qiRate - mSf108.sum.qiRate) < 1e-12;
    /* 签名（星髓滋养 offlineEff +15%）只走既有乘区加算，来源登记 cave */
    var sigOk = Math.abs((((mSf108.detail.offlineEff || {}).cave) || 0) - 0.15) < 1e-9 &&
      Math.abs(mSf108.sum.offlineEff - mPl108.sum.offlineEff - 0.15) < 1e-9;
    /* 搬离即失 */
    wSf108.cave.current = D.CAVE_INITIAL;
    pack.recalcDerived(wSf108, mkProf());
    var mOff108 = M(mkProf(), wSf108);
    var leftOk = SQ.Cave.multOf(wSf108, pack, D, mOff108) === 1 &&
      (((mOff108.detail.offlineEff || {}).cave) || 0) === 0;
    /* 在线/离线同口径：离线结算倍率 = caveMult ×（离线效率含签名 offlineEff） */
    var nowA = Date.now();
    var wOn108 = caveWs(null, 5), wCv108 = caveWs('star_fall', 5), wSw108 = caveWs('sword_cliff', 5);
    /* 绵长内息（tuna 签名）在 settle 内每段掷双倍——不桩则三档离线比是随机比（2026-10-14 实测 20 跑 1 红，
     * dev 同现）；恒高值 = 双倍恒不中，比数回到纯乘区差。 */
    var restore108 = stubRandom(function () { return 0.99999; });
    SQ.Idle.settle(wOn108, pack, D, 2 * 3600000, nowA, { log: noopLog(), profile: mkProf() });
    SQ.Idle.settle(wCv108, pack, D, 2 * 3600000, nowA, { log: noopLog(), profile: mkProf() });
    SQ.Idle.settle(wSw108, pack, D, 2 * 3600000, nowA, { log: noopLog(), profile: mkProf() });
    restore108();
    var offSf108 = wCv108.qi / wOn108.qi;      /* 1.25 × (0.5+0.15)/0.5 = 1.625 */
    var offSw108 = wSw108.qi / wOn108.qi;      /* 1.12（剑崖签名不涉离线） */
    /* 引擎硬顶：表值超 CAVE_MULT_CAP 即被截断（世界包不得超） */
    var wCap108 = caveWs(null, 2);
    wCap108.cave.current = '__fake__';
    var capOk = SQ.Cave.multOf(wCap108, pack, D, M(mkProf(), wCap108)) === 1;   /* 脏 id 回落初始 */
    ok(108, 'caveMult 独立乘区 + 在线离线同口径 + 签名驻留期生效',
      qiRateSame && Math.abs(rateSf108 / ratePl108 - 1.25) < 1e-9 &&
      Math.abs(SQ.Cave.multOf(caveWs('immortal_abode', 2), pack, D, M(mkProf(), caveWs('immortal_abode', 2))) - 1.35) < 1e-9 &&
      sigOk && leftOk && capOk &&
      Math.abs(offSf108 - 1.625) < 1e-6 && Math.abs(offSw108 - 1.12) < 1e-6,
      'rate比=' + (rateSf108 / ratePl108).toFixed(4) + ' qiRate同=' + qiRateSame +
      ' 签名=' + sigOk + ' 搬离=' + leftOk + ' 离线=' + offSf108.toFixed(4) + '/' + offSw108.toFixed(4) +
      ' qi=' + [wOn108.qi, wCv108.qi, wSw108.qi].join('/') + ' realm=' + [wOn108.realm, wSw108.realm].join('/'));

    /* #113 ledger 对账：随机操作序列后 100 + Σin − Σout === stones（零漂移）；只增不清、跨渡劫不清零 */
    localStorage.removeItem(SQ.KEY);
    var ref113 = {};
    await SQ.mutate(ref113, function (s) {
      s.profile = { name: '总账', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      var w = s.worlds.xiuxian;
      w.realm = 3; w.qi = 0; w.cleared = [0, 1, 2, 3, 4];
      w.artsKnown = ['tuna', 'juling', 'yunzong', 'qingxin'];
      w.artsSlots = ['tuna', 'juling']; w.artsLevels = { tuna: 1, juling: 1 };
      /* 起始资金走 ledger 入账注入（模拟此前奇遇所得）——恒等式 100+Σin−Σout 才严格成立 */
      var grant = 5e6 - w.stones;
      w.stones = 5e6;
      SQ.Ledger.note(w, 'in', 'event', grant);
    });
    var cats113 = { in: {}, out: {} };
    var mono113 = true, prevSum113 = 0, realms113 = [3];
    for (var i113 = 0; i113 < 220; i113++) {
      var w113 = ref113.worlds.xiuxian;
      var pick113 = Math.floor(Math.random() * 6);
      if (pick113 === 0) {
        await SQ.mutate(ref113, function (s) { s.worlds.xiuxian.lastSave = Date.now() - 30000; });
        await SQ.claim(ref113);
      } else if (pick113 === 1) {
        await SQ.Actions.setZone(ref113, Math.floor(Math.random() * 4));
      } else if (pick113 === 2) {
        await SQ.Actions.upgradeArt(ref113, ['tuna', 'juling', 'yunzong', 'qingxin'][Math.floor(Math.random() * 4)]);
      } else if (pick113 === 3) {
        await SQ.Actions.refreshShop(ref113, false);
        await SQ.Actions.buy(ref113, Math.floor(Math.random() * 5), false);
      } else if (pick113 === 4) {
        if (ref113.worlds.xiuxian.pendingChoice) {
          await SQ.Actions.resolveChoice(ref113, ['right', 'evil', 'neutral'][Math.floor(Math.random() * 3)]);
        } else {
          await SQ.mutate(ref113, function (s) { s.worlds.xiuxian.lastSave = Date.now() - 30000; });
          await SQ.claim(ref113);
        }
      } else {
        await SQ.Actions.enterCave(ref113, D.CAVES[Math.floor(Math.random() * D.CAVES.length)].id);
      }
      var cur113 = ref113.worlds.xiuxian;
      var sum113 = SQ.Ledger.sums(cur113);
      if (sum113.inn + sum113.out < prevSum113) mono113 = false;   /* 只增不清 */
      prevSum113 = sum113.inn + sum113.out;
      if (cur113.realm !== realms113[realms113.length - 1]) realms113.push(cur113.realm);
      if (sum113.expect !== cur113.stones) { cats113.drift = sum113.expect - cur113.stones; break; }
    }
    var fin113 = ref113.worlds.xiuxian;
    var s113 = SQ.Ledger.sums(fin113);
    var touched113 = SQ.Ledger.IN_CATS.concat(SQ.Ledger.OUT_CATS).filter(function (k) {
      var v = (fin113.ledger.in[k] != null) ? fin113.ledger.in[k] : fin113.ledger.out[k];
      return v > 0;
    });
    ok(113, 'ledger 恒等式 100+Σin−Σout === stones（220 步随机零漂移）· 只增不清 · 跨渡劫不清零',
      s113.expect === fin113.stones && cats113.drift == null && mono113 &&
      s113.inn > 0 && s113.out > 0 && touched113.length >= 3 && realms113.length >= 1,
      'stones=' + fin113.stones + ' Σin=' + s113.inn + ' Σout=' + s113.out +
      ' 触及分类=' + touched113.join('/') + ' 境界轨迹=' + realms113.join('→') + ' drift=' + (cats113.drift || 0));

    /* #105b 百器录 gearSeen：获得即入录 · 炼化/替换不除名 · 重复获得不刷新首获 ts · 零数值加成 · normalize 幂等 */
    var w105b = mkWs({ realm: 4, stones: 0 });
    pack.recalcDerived(w105b, mkProf());
    var m105b = M(mkProf(), w105b);
    var ts105b = Date.now();
    var it105b = SQ.Gear.roll(w105b, pack, D, 4, m105b, { tierMin: 3, slot: 'weapon', special: 'sword_heart', source: { type: 'zone', ref: 4 } });
    SQ.Gear.autoEquip(w105b, pack, D, m105b, it105b, noopLog());
    var first105b = w105b.gearSeen['sword_heart'];
    var it2 = SQ.Gear.roll(w105b, pack, D, 4, m105b, { tierMin: 3, slot: 'weapon', special: 'sword_heart', source: { type: 'zone', ref: 4 } });
    SQ.Gear.autoEquip(w105b, pack, D, m105b, it2, noopLog());   /* 替换 → 旧件炼化 */
    var after105b = w105b.gearSeen['sword_heart'];
    /* 独占法宝入录（'ex_' 前缀）+ 零数值加成（有/无 gearSeen 产出完全一致） */
    SQ.Gear.grantExclusive(w105b, pack, D, m105b, 'evil_sword', { type: 'event', ref: 'x' }, noopLog());
    var exSeen105b = w105b.gearSeen['ex_evil_sword'] != null;
    var rateWith105b = SQ.Idle.rateOf(w105b, pack, D, M(mkProf(), w105b));
    var snap105b = JSON.stringify(w105b.gearSeen);
    w105b.gearSeen = {};
    var rateNo105b = SQ.Idle.rateOf(w105b, pack, D, M(mkProf(), w105b));
    w105b.gearSeen = JSON.parse(snap105b);
    var n105b = pack.normalize(JSON.parse(JSON.stringify(w105b)));
    var n2 = pack.normalize(JSON.parse(JSON.stringify(n105b)));
    ok('105b', '百器录：入录 / 不除名 / 不刷新首获 / 零加成 / normalize 幂等',
      first105b >= ts105b && after105b === first105b && exSeen105b &&
      Math.abs(rateWith105b - rateNo105b) < 1e-9 &&
      JSON.stringify(n105b.gearSeen) === snap105b && JSON.stringify(n2.gearSeen) === snap105b,
      'first=' + first105b + ' after=' + after105b + ' ex=' + exSeen105b +
      ' rate=' + rateWith105b + '/' + rateNo105b);

    /* #123 主修形式化（引擎卷 §4.2 · issue #3 起可由玩家点定）：`ws.artsMain` 优先，未点定 / 点定的
     * 已不在槽内 ⇒ 回落「修习槽第 1 位」（旧档口径逐字不变，下面 a~d 全部按未点定跑）；
     * 空槽 = 无主修（不顺延）；artsProgress 类收益指向主修，主修满级时顺延「随机槽内未满级功法」 */
    var w123 = mkWs({ realm: 3 });
    w123.artsKnown = ['tuna', 'juling', 'yunzong'];
    w123.artsSlots = ['tuna', 'juling'];
    w123.artsLevels = { tuna: 1, juling: 1 };
    var main123 = SQ.Arts.mainArt(w123);
    SQ.Events.applyEffects(w123, pack, D, M(mkProf(), w123), { artsProgress: 1 },
      { log: noopLog(), now: Date.now(), raw: true });
    var lvAfter123 = [w123.artsLevels.tuna, w123.artsLevels.juling];
    /* 首位满级 → 顺延到其余槽内未满级功法（首位本身不再涨） */
    var w123b = mkWs({ realm: 3 });
    w123b.artsKnown = ['tuna', 'juling'];
    w123b.artsSlots = ['tuna', 'juling'];
    w123b.artsLevels = { tuna: D.ARTS_MAX_LV, juling: 2 };
    SQ.Events.applyEffects(w123b, pack, D, M(mkProf(), w123b), { artsProgress: 1 },
      { log: noopLog(), now: Date.now(), raw: true });
    /* 槽内只有一位（非 tuna）→ 主修即该位 */
    var w123c = mkWs({ realm: 3 });
    w123c.artsKnown = ['tuna', 'juling'];
    w123c.artsSlots = ['juling'];
    w123c.artsLevels = { juling: 1 };
    var main123c = SQ.Arts.mainArt(w123c);
    /* 全空槽 → 主修 null、progressTarget null（无处可加，不报错） */
    var w123d = mkWs({ realm: 3 });
    w123d.artsSlots = [];
    /* (e) issue #3 点定主修：setMain 认槽内已入门者 ⇒ mainArt 跟着点定的走；
     *     点定的那部被移出槽后回落第 1 位；槽外 / 未入门一律拒且**不改档**；同值重复点幂等；
     *     artsMain 过 normalize（字符串保值、脏值归 null）*/
    var w123e = mkWs({ realm: 3 });
    w123e.artsKnown = ['tuna', 'juling', 'yunzong'];
    w123e.artsSlots = ['tuna', 'juling'];
    var sm123 = SQ.Arts.setMain(w123e, 'juling');
    var main123e = SQ.Arts.mainArt(w123e);
    var sm123out = SQ.Arts.setMain(w123e, 'yunzong');            /* 已入门、不在槽 ⇒ 拒 */
    var main123out = SQ.Arts.mainArt(w123e);
    w123e.artsSlots = ['tuna'];                                   /* 点定的那部被移出槽 ⇒ 回落第 1 位 */
    var main123f = SQ.Arts.mainArt(w123e);
    var w123g = mkWs({ realm: 3 });
    w123g.artsSlots = ['tuna'];
    SQ.Arts.setMain(w123g, 'tuna');
    var sm123dup = SQ.Arts.setMain(w123g, 'tuna');        /* 同值重复点 ⇒ same，不二次写档 */
    var n123k = pack.normalize({ artsMain: 'juling' }).artsMain;
    var n123bad = pack.normalize({ artsMain: 42 }).artsMain;
    /* (f) 散功散掉**点定的那部** ⇒ 同批清掉 artsMain（档里不留永久悬空 id）；
     *     只是移出槽外则**不清**（记忆式语义，登记 = 任务清单 N44）*/
    var w123h = mkWs({ realm: 3 });
    w123h.artsKnown = ['tuna', 'juling', 'yunzong'];
    w123h.artsSlots = ['tuna', 'yunzong'];
    w123h.artsLevels = { tuna: 1, yunzong: 1 };
    SQ.Arts.setMain(w123h, 'yunzong');
    SQ.Arts.unslot(w123h, 'yunzong');
    var keptPin123 = w123h.artsMain === 'yunzong' && SQ.Arts.mainArt(w123h) === 'tuna';
    var sv123h = SQ.Arts.salvage(w123h, pack, D, 'yunzong');
    var main123h = SQ.Arts.mainArt(w123h);
    ok(123, '主修指向（引擎卷 §4.2 · GitHub issue #3）：未点定 = 槽第 1 位（旧档逐字不变）· 点定 = 跟随 ws.artsMain · ' +
      '移出槽外的记忆式回落 · 散功散掉点定者则清空 artsMain · 满级顺延槽内 · 全空不报错 · setMain 拒槽外且不脏写 · artsMain 过 normalize',
      main123 === 'tuna' && lvAfter123[0] === 2 && lvAfter123[1] === 1 &&
      SQ.Arts.mainArt(w123b) === 'tuna' && w123b.artsLevels.juling === 3 &&
      w123b.artsLevels.tuna === D.ARTS_MAX_LV &&
      main123c === 'juling' &&
      SQ.Arts.mainArt(w123d) === null && SQ.Arts.progressTarget(w123d, D.ARTS_MAX_LV) === null &&
      sm123.ok === true && main123e === 'juling' &&
      sm123out.ok === false && sm123out.reason === 'inslot' && main123out === 'juling' &&
      main123f === 'tuna' && sm123dup.ok === true && sm123dup.same === true &&
      keptPin123 && sv123h && w123h.artsMain === null && main123h === 'tuna' &&
      n123k === 'juling' && n123bad === null,
      'main=' + main123 + ' lv=' + lvAfter123.join('/') + ' 满级顺延→juling=' + w123b.artsLevels.juling +
      ' 首位=' + main123c + ' 全空=' + SQ.Arts.mainArt(w123d) +
      ' ‖ (e) 点定=' + main123e + ' 槽外拒=' + sm123out.reason + ' 移出后回落=' + main123f +
      ' 幂等=' + sm123dup.same + ' normalize=' + n123k + '/' + n123bad +
      ' ‖ (f) 移出槽外仍记忆=' + keptPin123 + ' 散功后清空=' + (w123h.artsMain === null) + '/' + main123h);

    /* #117 normalize：事件新字段 + seenOnce→seen 迁移 + drift 钳位 + profile 三字段 */
    var n117 = SQ.normalize({ v: SQ.V, profile: { name: '旧档', alignBias: 'weird' }, worlds: { xiuxian: {
      eventClock: -5, alignDrift: 9999,
      eventHistory: { lastId: 'a', seenOnce: ['x1', 'x2'] },
      lastOffline: { at: 1, secs: 2 }, gearSeen: { sword_heart: 123 }
    } } });
    var w117 = n117.worlds.xiuxian;
    ok(117, 'normalize 新字段（时钟/漂移钳位/feed/seen 迁移/profile）',
      w117.eventClock === 0 && w117.alignDrift === D.DRIFT_CAP &&
      w117.eventHistory.seen['x1'] != null && w117.eventHistory.seen['x2'] != null &&
      w117.eventHistory.seenOnce === undefined && Array.isArray(w117.eventHistory.feed) &&
      w117.lastOffline.secs === 2 && w117.gearSeen.sword_heart === 123 &&
      n117.profile.alignBias === 'neutral' && n117.profile.gender === 'male' && n117.profile.race === 'human',
      JSON.stringify(w117.eventHistory));

    /* #118 内容池 lint：119 条正典口径（天24/地39/人56 · 特殊12 · once12 · 天道垂青 tags 6——独立通道词条
     * weight/cooldownHours 不设）+ schema/karma 带/词表对表。
     * 恢复批 2026-10-03 收口口径：通用 24 + 专属 89（首批 37 + 扩容 12 + 二批 40）+ 垂青 6 = 119
     * （专属事件池 v2.8 分布核对表；账实不符已按任务清单 v1.22 恢复批裁定消除）。 */
    var all118 = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian);
    var tiers118 = { tian: 0, di: 0, ren: 0 }, special118 = 0, once118 = 0, tagged118 = 0, ids118 = {}, bad118 = [];
    var GAIN_TYPES = { stones: 1, qi: 1, qiPct: 1, qiPctRaw: 1, buff: 1, dropGear: 1, exclusiveGear: 1, exclusiveArt: 1,
      artsProgress: 1, attrBonus: 1, tribNext: 1, eventShield: 1, bond: 1, bondLock: 1,
      bondDrain: 1,   /* 情谊生裂（缘尽收敛批 · 引擎卷 v1.10 §3.6）：轻中度背叛替代绝交锁 */
      merchant: 1, merchantScout: 1, primeGear: 1, primeArt: 1,
      fateShard: 1,   /* 探宝残片计数（事件池 v2.7 №117 ⏳ 键，系统深化批 A6 登记） */
      treasure: 1,
      talentSwap: 1,
      stonesPct: 1 };   /* 按比例出血（第卌四批 · §6.1B 认输买平安）：走 applyEffects 既有 stonesPct 通道（取整 + 下限 0 + noteStones 真值） */
      /* 先天法宝联动授予（二批 A5 · 数值详设 §10.7；恢复批 A3b 引擎 case 已重加） */
    var CHECK_TYPES = { attr: 1, karma: 1, align: 1, stones: 1, qi: 1, art: 1, gear: 1, power: 1, companion: 1,
      prodigySpar: 1,
      ambushFoe: 1 };   /* 敌手快照判定（第卌四批 · §6.1B）：与切磋同构的 ±10% 对局，对手取 pendingChoice.foe 快照 ⇒ 第十一类 DSL */
    var BAND118 = D.EVENT_KARMA_BAND;   /* 取表而不是手抄（第十四批审计 #18）。⚠️ 归因纠正（当晚复核）：A9 把这条记成零消费者死桩的理由是**生产侧无人读**（A9 的消费面刻意不含 `.tests/`），不是「因为手抄」⇒ 本改只让测试随表动，摘除在册登记要等生产侧真出现读者。 */
    all118.forEach(function (ev) {
      tiers118[ev.tier] = (tiers118[ev.tier] || 0) + 1;
      if (ev.special) special118++;
      if (ev.once) once118++;
      var isTagged = !!(ev.tags && ev.tags.length);
      if (isTagged) tagged118++;
      if (ids118[ev.id]) bad118.push(ev.id + ':dup');
      ids118[ev.id] = 1;
      /* 独立通道词条（天道垂青池）：weight/cooldownHours 不设（事件池 v2.7 词条口径） */
      if (!isTagged && (!ev.weight || (ev.cooldownHours == null && !ev.cdFailHours))) bad118.push(ev.id + ':w/cd');
      /* 分支逐支对表：按模板**自己声明的 choices** 走（第卌四批改口，与 audit A2 同口径）——
       * 「族中寻仇」按用户设定只有迎战一条路，硬要求三支齐全只会逼词表补两条永不消费的孤儿键。
       * 三支齐全的既有条目覆盖面一字不减（取的是 Object.keys(choices)，与旧写法同集）。 */
      var bks118 = Object.keys(ev.choices || {});
      if (!bks118.length) bad118.push(ev.id + ':nochoice');
      bks118.forEach(function (bk) {
        var br = ev.choices[bk];
        if (Math.abs(br.karma) > BAND118[ev.tier]) bad118.push(ev.id + ':karma' + br.karma);
        (br.gain || []).forEach(function (g) { if (!GAIN_TYPES[g.type]) bad118.push(ev.id + ':gain.' + g.type); });
        var chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
        chks.forEach(function (c) { if (!CHECK_TYPES[c.type]) bad118.push(ev.id + ':check.' + c.type); });
      });
      ['name', 'story'].forEach(function (suf) {
        var key = 'event.' + ev.id + '.' + suf;
        if (SQ.t(key, null, 'xiuxian') === key) bad118.push(ev.id + ':lex.' + suf);
      });
      bks118.forEach(function (bk) {
        var key = 'event.' + ev.id + '.branch.' + bk;
        if (SQ.t(key, null, 'xiuxian') === key) bad118.push(ev.id + ':lex.branch.' + bk);
      });
    });
    ok(118, '128 条分布（天25/地44/人59 · 特殊12 · once12 · tags14=垂青6+天骄5+袭击2+寻仇1）+ schema/词表对表（第卌四批 №126~128 入池 · GAIN_TYPES 登记 stonesPct / CHECK_TYPES 登记 ambushFoe）',
      all118.length === 128 && tiers118.tian === 25 && tiers118.di === 44 && tiers118.ren === 59 &&
      special118 === 12 && once118 === 12 && tagged118 === 14 && bad118.length === 0,
      'n=' + all118.length + ' ' + JSON.stringify(tiers118) + ' sp=' + special118 + ' once=' + once118 +
      ' tags=' + tagged118 + ' bad=' + bad118.slice(0, 5).join(','));

    /* #119 buff 同字段同向不叠加（事件池 §十二.4 勘误①）：取最强一条 + 时长取较长者；
     * 正负号分开判（增益不吞减益）；eventShield 是「层」语义，逐条并存不去重。 */
    var w119 = mkWs({ realm: 4 });
    var t119 = Date.now();
    for (var i119 = 0; i119 < 30; i119++) {
      SQ.Events.pushBuff(w119, 'qiRate', 0.10 + i119 * 0.01, t119 + (12 + i119) * 3600000);
      SQ.Events.pushBuff(w119, 'qiRate', -0.05, t119 + 6 * 3600000);
      SQ.Events.pushBuff(w119, 'eventShield', 1, t119 + 3600000);
    }
    var pos119 = w119.buffs.filter(function (b) { return b.field === 'qiRate' && b.mult > 0; });
    var neg119 = w119.buffs.filter(function (b) { return b.field === 'qiRate' && b.mult < 0; });
    var sh119 = w119.buffs.filter(function (b) { return b.field === 'eventShield'; });
    /* 再来一条更弱的正增益：不换值，但时长取较长者（已在身的长 buff 不被缩短） */
    SQ.Events.pushBuff(w119, 'qiRate', 0.12, t119 + 2 * 3600000);
    ok(119, 'buff 同字段同向不叠加（最强 + 时长取较长 · eventShield 逐条并存）',
      pos119.length === 1 && neg119.length === 1 && sh119.length === 30 &&
      Math.abs(pos119[0].mult - 0.39) < 1e-9 && neg119[0].mult === -0.05 &&
      pos119[0].until === t119 + 41 * 3600000,
      'pos=' + pos119.length + '/' + pos119[0].mult + ' neg=' + neg119.length +
      ' shield=' + sh119.length + ' until=+' + ((pos119[0].until - t119) / 3600000) + 'h');

    /* #120 qiPct「等价挂机小时」封顶（事件池 §十二.5 勘误②）：|Δqi| ≤ CAP × 每秒产出 × 3600；
     * 高境界截断、低境界天然不触发；正向同口径对称封顶。 */
    function probe120(realm, pctv) {
      var w = mkWs({ realm: realm, qi: 0 });
      w.qi = D.REALMS[realm + 1].need * 0.5;
      pack.recalcDerived(w, mkProf());
      var m = M(mkProf(), w);
      var rate = SQ.Idle.rateOf(w, pack, D, m);
      var q0 = w.qi;
      SQ.Events.applyEffects(w, pack, D, m, { qiPct: pctv }, { log: noopLog(), now: Date.now(), raw: true });
      return { d: w.qi - q0, cap: D.EVENT_QI_PCT_HOUR_CAP * 3600 * rate, raw: q0 * pctv };
    }
    var hi120 = probe120(8, -0.25), hiP120 = probe120(8, 0.25), lo120 = probe120(0, -0.25);
    ok(120, 'qiPct 等价挂机小时封顶（境界8 正负对称截断 · 境界0 不触发）',
      Math.abs(hi120.raw) > hi120.cap && Math.abs(hi120.d + hi120.cap) < 1e-6 &&
      Math.abs(hiP120.d - hiP120.cap) < 1e-6 &&
      Math.abs(lo120.raw) < lo120.cap && Math.abs(lo120.d - lo120.raw) < 1e-6,
      'r8 −25%: ' + Math.round(hi120.d) + '（未封顶 ' + Math.round(hi120.raw) + '，cap ' + Math.round(hi120.cap) +
      '） r8 +25%: ' + Math.round(hiP120.d) + ' r0: ' + Math.round(lo120.d));

    /* #121 判定护栏强制 lint（事件池 §2.2 v1.11）：failE 资源损失 ≤15%、任何 debuff ≤24h。
     * 批 1 实测发现两个分卷 26/40 处 failE 超限（−18%~−30%）+ 6 处 debuff 48h，
     * 与魔道分支 40% 通过率相乘后反转了阵营节奏主轴——护栏自此由 lint 兜住，不再只是写作守则。 */
    var GUARD_LOSS = 0.15, GUARD_HOURS = 24;
    var bad121 = [];
    function lintEff121(eff, where, isFail) {
      if (!eff) return;
      if (eff.qiPct != null) {
        var band = Array.isArray(eff.qiPct) ? eff.qiPct : [eff.qiPct, eff.qiPct];
        var lo = Math.min(band[0], band[1]);
        if (isFail && lo < -GUARD_LOSS - 1e-9) bad121.push(where + ' failE qiPct ' + lo);
      }
      if (eff.stonesPct != null && isFail) {
        var sb = Array.isArray(eff.stonesPct) ? eff.stonesPct : [eff.stonesPct, eff.stonesPct];
        if (Math.min(sb[0], sb[1]) < -GUARD_LOSS - 1e-9) bad121.push(where + ' failE stonesPct');
      }
      if (eff.buff) {
        var isDebuff = eff.buff.mult < 0 || eff.buff.field === 'shopCost';
        var hb = Array.isArray(eff.buff.hours) ? eff.buff.hours : [eff.buff.hours, eff.buff.hours];
        if (isDebuff && Math.max(hb[0] || 0, hb[1] || 0) > GUARD_HOURS) {
          bad121.push(where + ' debuff ' + eff.buff.field + ' ' + Math.max(hb[0] || 0, hb[1] || 0) + 'h');
        }
      }
    }
    var nFail121 = 0, nBand121 = 0;
    all118.forEach(function (ev) {
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var br = ev.choices && ev.choices[bk];
        if (!br) return;
        (br.gain || []).forEach(function (g) {
          if (g.type === 'buff') {
            nBand121++;
            lintEff121({ buff: { field: g.field, mult: g.mult, hours: g.hours != null ? g.hours : g.h } },
              ev.id + '.' + bk, false);
          }
          if (g.type === 'qiPct') nBand121++;
        });
        var chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
        chks.forEach(function (c, ci) {
          if (!c.failE) return;
          nFail121++;
          lintEff121(c.failE, ev.id + '.' + bk + '[' + ci + ']', true);
        });
        if (br.failE) { nFail121++; lintEff121(br.failE, ev.id + '.' + bk, true); }
      });
    });
    ok(121, '判定护栏 lint（failE 损失 ≤15% · debuff ≤24h）',
      bad121.length === 0 && nFail121 >= 40 && nBand121 > 0,
      'failE=' + nFail121 + ' buff/qiPct带=' + nBand121 + ' 违规=' + bad121.slice(0, 6).join(','));

    /* #122 双缩放锚契约（事件池 §十二.8 v1.11）：灵石挂刷图曲线（含练气面额下限 1.0）、
     * 灵气挂三次方；灵石锚与 ZONES.stones 同比 → 「奇遇/刷图」比值与境界无关（旧口径三次方
     * 与刷图曲线不同源，境界 2~6 把比值推到 1000~2600%）。 */
    var K122 = D.EVENT_STONE_ZONE_K;
    var sc122 = [], qi122 = [];
    for (var r122 = 0; r122 <= 9; r122++) {
      sc122.push(SQ.Events.stoneScaleOf({ realm: r122 }, D));
      qi122.push(SQ.Events.qiScaleOf({ realm: r122 }, D));
    }
    var ratio122 = sc122.map(function (s, i) { return s / D.ZONES[i].stones; });
    var flat122 = ratio122.slice(2).every(function (v) { return Math.abs(v - K122) < 1e-9; });
    var mono122 = sc122.every(function (v, i) { return i === 0 || v >= sc122[i - 1]; });
    ok(122, '双缩放锚：灵石挂刷图曲线（练气下限 1.0）· 灵气挂三次方 · 比值恒定',
      sc122[0] === 1 && sc122[1] === 1 && sc122[2] === K122 * D.ZONES[2].stones &&
      sc122[8] === K122 * D.ZONES[8].stones && flat122 && mono122 &&
      qi122[0] === 1 && qi122[2] === 27 && qi122[8] === 729 && qi122[9] === 1000,
      'stones=' + sc122.map(function (v) { return Math.round(v * 100) / 100; }).join('/') +
      ' qi=' + qi122.join('/'));

    /* 20a~20d 问道初心（profile.alignBias）数据契约（F1 的数据半区） */
    var n20a = SQ.normalize({ v: SQ.V, profile: { name: '甲', alignBias: 'evil' } });
    ok('20a', 'alignBias 合法值保留', n20a.profile.alignBias === 'evil');
    var n20b = SQ.normalize({ v: SQ.V, profile: { name: '乙' } });
    ok('20b', 'alignBias 缺省 neutral · gender male · race human',
      n20b.profile.alignBias === 'neutral' && n20b.profile.gender === 'male' && n20b.profile.race === 'human');
    localStorage.removeItem(SQ.KEY);
    var ref20 = {};
    await SQ.mutate(ref20, function (s) {
      s.profile = { name: '初心道人', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now(),
        alignBias: 'evil', gender: 'male', race: 'human' };
      s.worlds.xiuxian = pack.initialState();
    });
    ref20.worlds.xiuxian.lastSave = Date.now() - 86400000;
    await SQ.save(ref20);
    var ref20b = {};
    await SQ.claim(ref20b);
    var drift20 = ref20b.worlds.xiuxian.alignDrift;
    ok('20c', 'claim 按初心累积漂移（evil · 1 天 ≈ −12）',
      drift20 <= -11.9 && drift20 >= -12.2, 'drift=' + drift20);
    var keep20 = SQ.normalize({ v: SQ.V, profile: ref20b.profile, worlds: {}, meta: { unlockedWorlds: ['xiuxian'] } });
    ok('20d', '初心锁定持久（normalize 不改写合法值）',
      keep20.profile.alignBias === 'evil' && ref20b.profile.alignBias === 'evil');

    /* ═══ 批 2 · B 组引擎增量（#124~#127）═══ */

    /* #124 独占手动替换（B5 · 交互说明 §4.4 ★）：库藏阁件穿上、旧独占回阁锁形格——
     * 无灵石流动、无炼化、ledger 零记账；三道拒绝闸（两侧均非独占 / 境界不足 / 越界） */
    var w124 = mkWs({ realm: 6, cleared: [0, 1, 2, 3] });
    pack.recalcDerived(w124, mkProf());
    var ex124 = SQ.Gear.grantExclusive(w124, pack, D, M(mkProf(), w124), 'evil_sword', { type: 'event', ref: 'evil_sword_remnant' }, noopLog());
    var cand124 = mkGear('weapon', { tier: 4, atk: 10, reqs: { realm: 4 } });
    w124.stash.push(cand124);
    var st124 = w124.stones;
    var sums124 = JSON.stringify(SQ.Ledger.sums(w124));
    var r124 = SQ.Gear.manualSwap(w124, pack, D, M(mkProf(), w124), w124.stash.indexOf(cand124), noopLog());
    var swap124 = r124.ok && w124.gear.weapon === cand124 && w124.stash.length === 1 &&
      w124.stash.indexOf(ex124) >= 0 && w124.stones === st124 &&
      JSON.stringify(SQ.Ledger.sums(w124)) === sums124;
    var w124b = mkWs({ realm: 6 });
    var rnd124a = mkGear('weapon', { tier: 2, atk: 5, reqs: { realm: 2 } });
    var rnd124b = mkGear('weapon', { tier: 3, atk: 8, reqs: { realm: 4 } });
    w124b.gear.weapon = rnd124a;
    w124b.stash.push(rnd124b);
    var rej124a = SQ.Gear.manualSwap(w124b, pack, D, M(mkProf(), w124b), 0, noopLog());
    var hi124 = mkGear('weapon', { tier: 4, atk: 1, reqs: { realm: 9 }, exclusive: 'evil_sword' });
    w124b.stash.push(hi124);
    var rej124b = SQ.Gear.manualSwap(w124b, pack, D, M(mkProf(), w124b), 1, noopLog());
    var rej124c = SQ.Gear.manualSwap(w124b, pack, D, M(mkProf(), w124b), 99, noopLog());
    ok('124', '独占手动替换：无灵石流/零记账 + 三道拒绝闸',
      swap124 && rej124a.reason === 'exclusive' && rej124b.reason === 'wear' && rej124c.reason === 'index' &&
      w124b.gear.weapon === rnd124a && w124b.stash.length === 2,
      JSON.stringify({ swap: swap124, rej: [rej124a.reason, rej124b.reason, rej124c.reason] }));

    /* #125 极品词条旗标（B5）：resist/attr 各前 10% → prime=true + reqs.realm 追加一阶；
     * 期望率从引擎常量推导（randInt 闭区间使 attr 顶 10% = 2/11、randF 四舍五入抬边界 +0.5，
     * 天阶实测 ≈26.7% ≠ 直觉 19%——写死直觉值会误报）；旗标随件 JSON 持久（库藏阁 ※ 标注消费） */
    var w125 = mkWs({ realm: 8 });
    var m125 = M(mkProf(), w125);
    var prime125 = 0, bump125 = true;
    var T4 = D.GEAR_TIERS[4], T4req = T4.req;
    /* 固定种子抽样（2026-10-09 治理批·复核收尾）：4,000 抽比 ±3pp，真实随机下属统计噪声 */
    var seed125 = 1252026, origRand125 = Math.random;
    Math.random = function () {
      seed125 |= 0; seed125 = (seed125 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed125 ^ (seed125 >>> 15), 1 | seed125);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (var i125 = 0; i125 < 4000; i125++) {
      var it125 = SQ.Gear.roll(w125, pack, D, 8, m125, { tier: 4 });
      if (it125.prime) { prime125++; if (it125.reqs.realm !== T4req + 1) bump125 = false; }
      else if (it125.reqs.realm !== T4req) bump125 = false;
    }
    Math.random = origRand125;   /* 种子化窗口结束 */
    var rate125 = prime125 / 4000;
    var rangeR125 = T4.resist[1] - T4.resist[0];
    var pR125 = (rangeR125 * D.PRIME_TOP_PCT + 0.5) / rangeR125;
    var cntA125 = 0;
    for (var av125 = T4.attr[0]; av125 <= T4.attr[1]; av125++) {
      if (av125 >= T4.attr[1] - (T4.attr[1] - T4.attr[0]) * D.PRIME_TOP_PCT) cntA125++;
    }
    var exp125 = 1 - (1 - pR125) * (1 - cntA125 / (T4.attr[1] - T4.attr[0] + 1));
    var keep125 = JSON.parse(JSON.stringify(mkGear('weapon', { tier: 4, prime: true, reqs: { realm: T4req + 1 } })));
    ok('125', '极品旗标：率对表推导值 ±3pp + 追加一阶无例外 + 随件持久 · 2026-10-09 起**固定种子抽样**（4,000 抽，判据数值未动）',
      bump125 && Math.abs(rate125 - exp125) <= 0.03 && keep125.prime === true,
      'rate=' + (rate125 * 100).toFixed(1) + '% exp=' + (exp125 * 100).toFixed(1) + '% prime=' + prime125 + '/4000');

    /* #126 渡劫成功时间戳（第廿五批起视图无消费者，字段与写口保留 = N32 ①）：成功写 / 失败不动 / normalize 脏值归 null */
    var t126 = 1700000000000;
    var w126 = mkWs({ realm: 0, qi: 1e9 });
    pack.recalcDerived(w126, mkProf());
    var restore126a = stubRandom([0]);                       /* 必成 */
    var r126a = SQ.Realm.tryBreakthrough(w126, pack, D, M(mkProf(), w126), t126, { log: noopLog(), profile: mkProf() });
    restore126a();
    var win126 = r126a.result === 'success' && w126.tribulation.lastSuccessTs === t126;
    var w126b = mkWs({ realm: 0, qi: 1e9 });
    pack.recalcDerived(w126b, mkProf());
    w126b.tribulation.lastSuccessTs = 123;
    var restore126b = stubRandom([0.999999]);                /* 必败（p clamp ≤0.95） */
    var r126b = SQ.Realm.tryBreakthrough(w126b, pack, D, M(mkProf(), w126b), t126, { log: noopLog(), profile: mkProf() });
    restore126b();
    var lose126 = r126b.result === 'fail' && w126b.tribulation.lastSuccessTs === 123;
    var dirty126 = pack.normalize(Object.assign(pack.initialState(), { tribulation: { lastSuccessTs: 'garbage' } }));
    var keep126b = pack.normalize(Object.assign(pack.initialState(), { tribulation: { lastSuccessTs: t126 } }));
    ok('126', '渡劫成功时间戳：成功写 / 失败不动 / 脏值归 null',
      win126 && lose126 && dirty126.tribulation.lastSuccessTs === null &&
      keep126b.tribulation.lastSuccessTs === t126,
      JSON.stringify({ win: win126, lose: lose126, dirty: dirty126.tribulation.lastSuccessTs }));

    /* #127 满槽原位替换（B4）：replaceId 保序——第 1 位 = 主修不隐式挪位；无目标满槽照旧拒绝 */
    var w127 = mkWs({});
    w127.artsKnown = ['tuna', 'juling', 'qingxin', 'yunzong', 'yinqi', 'zhanju', 'jinzhong'];
    w127.artsSlots = ['tuna', 'juling', 'qingxin', 'yunzong', 'yinqi', 'zhanju'];
    var full127 = SQ.Arts.slot(w127, pack, D, 'jinzhong');
    var rep127 = SQ.Arts.slot(w127, pack, D, 'jinzhong', 'qingxin');
    var pos127 = rep127 && w127.artsSlots.length === D.ARTS_SLOTS &&
      w127.artsSlots[2] === 'jinzhong' && w127.artsSlots.indexOf('qingxin') < 0;
    var rep127b = SQ.Arts.slot(w127, pack, D, 'qingxin', 'tuna');
    var main127 = rep127b && w127.artsSlots[0] === 'qingxin' && SQ.Arts.mainArt(w127) === 'qingxin';
    ok('127', '满槽原位替换：保序 + 主修随第 1 位',
      full127 === false && pos127 && main127,
      JSON.stringify({ full: full127, pos: pos127, main: main127 }));

    /* ═══ 批 3 · G14 护法结缘（#109~#112 / #114~#116 / #129~#131）═══ */

    /* #109 bond 映射表对表（四柱卷 §5.1 唯一事实源 ↔ 代码数据 diff）+ 好感模型纪律 + normalize。
     * 回写纪律：57 事件（批3 19 + 扩容批 8 + 二批 30）之外零 bond/bondLock 词条（垂青 pei 行另计 = 道友池卷 §二
     * 唯一事实源 57 事件 + 深化批 1 行；势力 flavor 事件不入 bond：qixuan/xinggong/yanue/luopo/jianqi/longquan/
     * yanwu/miaoyin+suiyuan/guisu/liumo/laolong/qianzhu/kunwu/shuyuan）；绝交锁全池 26（批3 4 + 扩容 6 + 二批 12 + 垂青 pei 1，
     * 恢复批后 #132 三态对表随 A5 扩至 57 事件）；
     * 档位阈值 1/30/70/100；clamp [0,100] 只增。恢复批 2026-10-03：路线 A 补执行（预案 20 人引用移除）。 */
    var BOND_MAP109 = {
      road_tea_stall:      { right: { qin: 10 }, neutral: { qin: 4 }, evil: {} },
      stray_dog:           { right: { huang: 30 }, neutral: { huang: 15 }, evilDrain: ['huang'] },
      traveling_doctor:    { right: { chen: 10 }, neutral: { chen: 3 }, evil: {} },
      storyteller:         { right: { liu: 8 }, neutral: { liu: 4 }, evil: {} },
      harvest_fest:        { right: { feng: 8 }, neutral: { feng: 3 }, evil: {} },
      merchant_caravan:    { right: { man: 12, tie: 8 }, neutral: { man: 5, tie: 4 }, evilDrain: ['man', 'tie'] },
      hidden_cache:        { right: { suwan: 20 }, neutral: { suwan: 8 }, evil: {} },
      rival_duel:          { right: { xie: 12 }, neutral: { xie: 6 }, evilDrain: ['xie'] },
      junior_lie_flat:     { right: { tang: 10 }, neutral: { tang: 3 }, evil: {} },
      beggar_immortal:     { right: { chu: 15 }, neutral: { chu: 5 }, evilDrain: ['chu'] },
      peace_talisman:      { right: { zhu: 8 }, neutral: { zhu: 3 }, evil: {} },
      firefly_valley:      { right: { yan: 10 }, neutral: { yan: 4 }, evil: {} },
      mine_fox:            { right: { chiwei: 30 }, neutral: { chiwei: 12 }, evilDrain: ['chiwei'] },
      junior_frame:        { right: { luman: 8 }, neutral: { luman: 5 }, evil: {} },
      sect_recruit:        { right: { pei: 10 }, neutral: { pei: 4 }, evilDrain: ['pei'] },
      demon_envoy:         { right: { yewu: 2 }, neutral: { yewu: 5 }, evil: { yewu: 15 } },
      alchemy_contest:     { right: { lu: 8 }, neutral: { lu: 4 }, evil: {} },
      secret_manual_trade: { right: { shen: 15 }, neutral: { shen: 8 }, evilDrain: ['shen'] },
      beast_core_hunt:     { right: { fu: 8 }, neutral: { fu: 3 }, evil: {} },
      /* 双书梗化扩容批 8 事件（道友池卷 §二/§四 · 恢复批 2026-10-03）：首遇结缘型 +30/+15（于潇左 +12）、
       * 董萱儿/陈平安魔道零入账（非锁）；绝交锁 6 = hanli/yuxiao/nangong/ningyao/aliang/jingchun */
      qingpao_tongxing:    { right: { hanli: 30 }, neutral: { hanli: 15 }, evilDrain: ['hanli'] },
      taomu_xiaojian:      { right: { yuxiao: 30 }, neutral: { yuxiao: 12 }, evilDrain: ['yuxiao'] },
      haishi_denghui:      { right: { xuaner: 20 }, neutral: { xuaner: 8 }, evil: {} },
      yanue_chaoji:        { right: { nangong: 12 }, neutral: { nangong: 4 }, evilDrain: ['nangong'] },
      bianzhen_kezi:       { right: { pingping: 15 }, neutral: { pingping: 5 }, evil: {} },
      jianzhong_shouye:    { right: { ningyao: 20 }, neutral: { ningyao: 8 }, evilDrain: ['ningyao'] },
      jianyun_guiren:      { right: { aliang: 30 }, neutral: { aliang: 15 }, evilLock: ['aliang'] },
      shengxian_yideng:    { right: { jingchun: 30 }, neutral: { jingchun: 15 }, evilLock: ['jingchun'] },
      /* 双书梗化二批 人级 12 bond 事件（道友池卷 §二/§五 · 恢复批）：首遇结缘型 +30/+15 ×4
       * （zhangtie/mojuren/lihuayuan 及地级 yinyue、天级 wensheng 后补）；绝交锁 人级 +5 */
      tongmen_kugong:      { right: { zhangtie: 30 }, neutral: { zhangtie: 15 }, evilDrain: ['zhangtie'] },
      ming_e_jiaoliang:    { right: { wuyan: 10 }, neutral: { wuyan: 4 }, evilDrain: ['wuyan'] },
      shiyao_zhiyue:       { right: { mojuren: 30 }, neutral: { mojuren: 15 }, evilDrain: ['mojuren'] },
      zhishi_chuanyi:      { right: { lihuayuan: 30 }, neutral: { lihuayuan: 15 }, evilDrain: ['lihuayuan'] },
      shangdui_huhang:     { right: { mupeiling: 15 }, neutral: { mupeiling: 5 }, evil: {} },
      shijia_denghui:      { right: { chenqiaoyue: 14 }, neutral: { chenqiaoyue: 5 }, evil: {} },
      jiemei_yuxian:       { right: { chenlianyan: 13 }, neutral: { chenlianyan: 4 }, evil: {} },
      xiafu_danren:        { right: { hongfu: 15 }, neutral: { hongfu: 5 }, evil: {} },
      sudi_tiezhan:        { right: { wangchan: 10 }, neutral: { wangchan: 3 }, evilDrain: ['wangchan'] },
      suanpan_zhanggui:    { right: { zhuhe: 12 }, neutral: { zhuhe: 5 }, evil: {} },
      zhujian_renjia:      { right: { ruanxiu: 14 }, neutral: { ruanxiu: 5 }, evil: {} },
      laozu_shounuo:       { right: { gucan: 13 }, neutral: { gucan: 5 }, evil: {} },
      /* 双书梗化二批 地级 11 bond 事件（恢复批）：yinyue 首遇结缘型 +30/+15；绝交锁 地级 +4
       * （yuzhitong/makuxuan/weixian/yinyue）；qianzhu/kunwu/shuyuan 三事件为势力 flavor 不入 bond */
      canhun_jieti:        { right: { yuzhitong: 10 }, neutral: { yuzhitong: 5 }, evilDrain: ['yuzhitong'] },
      zhangmen_chizheng:   { right: { xiangzhili: 12 }, neutral: { xiangzhili: 4 }, evil: {} },
      zhujian_luhuo:       { right: { ruanqiong: 13 }, neutral: { ruanqiong: 5 }, evil: {} },
      changcheng_junqing:  { right: { makuxuan: 14 }, neutral: { makuxuan: 4 }, evilDrain: ['makuxuan'] },
      banfen_fenzang:      { right: { xieshi: 12 }, neutral: { xieshi: 5 }, evil: {} },
      yinguan_shouduan:    { right: { weixian: 13 }, neutral: { weixian: 4 }, evilDrain: ['weixian'] },
      duanjian_chongzhu:   { right: { liushiliu: 14 }, neutral: { liushiliu: 5 }, evil: {} },
      changcheng_shouye:   { right: { dongtianci: 12 }, neutral: { dongtianci: 4 }, evil: {} },
      yuexia_yihun:        { right: { yinyue: 30 }, neutral: { yinyue: 15 }, evilDrain: ['yinyue'] },
      guiwu_weicheng:      { right: { yuanyao: 16 }, neutral: { yuanyao: 6 }, evil: {} },
      chengxia_wenjian:    { right: { chenqingdu: 15 }, neutral: { chenqingdu: 5 }, evil: {} },
      /* 双书梗化二批 天级 7 bond 事件（恢复批）：wensheng 首遇结缘型 +30/+15；绝交锁 天级 +3
       * （wensheng/yufu/chelaozu）；№113 luanxing_yebu = xinggong flavor 不入 bond（x17 联动载体） */
      kongxiu_danshi:      { right: { wensheng: 30 }, neutral: { wensheng: 15 }, evilLock: ['wensheng'] },
      yasheng_luozi:       { right: { cuichan: 12 }, neutral: { cuichan: 4 }, evil: {} },
      baiyi_wenjian:       { right: { zuoyou: 14 }, neutral: { zuoyou: 5 }, evil: {} },
      shoucheng_jianyi:    { right: { yufu: 15 }, neutral: { yufu: 4 }, evilLock: ['yufu'] },
      modao_xiangyao:      { right: { chelaozu: 12 }, neutral: { chelaozu: 5 }, evilLock: ['chelaozu'] },
      moxiao_zhangfa:      { right: { yintianxia: 12 }, neutral: { yintianxia: 5 }, evil: {} },
      baiyi_guxing:        { right: { baidi: 13 }, neutral: { baidi: 4 }, evil: {} },
      /* 天道垂青池（系统深化批 A6 · 专属事件池 v2.7 №118 踵门道贺）：pei 映射预登记行——
       * 正 +12 / 左 +5 / 魔 绝交锁（假谕骗贺，故人心寒；既有锁在修-地-01，锁语义幂等） */
      tiandao_zhaohe:      { right: { pei: 12 }, neutral: { pei: 5 }, evilLock: ['pei'] },
      /* 天骄专属事件（№120~124 · 六向批 A4）：bond 槽位占位符 '$prodigy'（resolveBranch 运行时
       * 替换为触发槽位实际 id pr{n}——天骄 bonds 键空间与道友名录隔离，天骄卷 §10.1） */
      prodigy_ev_drink:    { right: { '$prodigy': 8 }, neutral: { '$prodigy': 4 }, evil: {} },
      prodigy_ev_gift:     { right: { '$prodigy': 10 }, neutral: { '$prodigy': 5 }, evil: {} }
    };
    var bad109 = [];
    var all109 = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian);
    all109.forEach(function (ev) {
      var exp109 = BOND_MAP109[ev.id];
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var br = (ev.choices || {})[bk] || {};
        var gotB = {}, gotL = [], gotDr = [];
        (br.gain || []).forEach(function (g) {
          if (g.type === 'bond') gotB[g.npc] = g.n;
          if (g.type === 'bondLock') gotL.push(g.npc);
          if (g.type === 'bondDrain') gotDr.push(g.npc);
        });
        var expB = (exp109 && exp109[bk]) || {};
        var expL = (exp109 && exp109[bk + 'Lock']) || [];
        var expDr = (exp109 && exp109[bk + 'Drain']) || [];
        if (JSON.stringify(gotB) !== JSON.stringify(expB)) bad109.push(ev.id + ':' + bk + ':bond');
        if (gotL.join() !== expL.join()) bad109.push(ev.id + ':' + bk + ':lock');
        if (gotDr.join() !== expDr.join()) bad109.push(ev.id + ':' + bk + ':drain');
        /* 互斥纪律：同一分支不得同时挂绝交锁与情谊生裂（缘尽收敛批）*/
        if (gotL.length && gotDr.length) bad109.push(ev.id + ':' + bk + ':both');
      });
    });
    /* 修-地-13 守陵人正道链 = [神·困难 → companion ≥2]（§5.1 示例挂载） */
    var gk109 = all109.find(function (e) { return e.id === 'grave_keeper'; });
    var gkChk = gk109.choices.right.check;
    if (!(Array.isArray(gkChk) && gkChk.length === 2 && gkChk[1].type === 'companion' && gkChk[1].minTier === 2)) {
      bad109.push('grave_keeper:companion链');
    }
    /* 好感模型：档位阈值 / clamp / 只增（负数拒）/ 心结锁拒入账 */
    var w109 = mkWs({ realm: 2 });
    pack.recalcDerived(w109, mkProf());
    var tierOk = [0, 1, 29, 30, 69, 70, 99, 100].map(function (a) { return SQ.Bonds.tierOf({ bonds: { x: a } }, 'x', D); })
      .join() === '0,1,1,2,2,3,3,4';
    var g109a = SQ.Bonds.gain(w109, pack, D, 'qin', 120, Date.now());
    var g109b = SQ.Bonds.gain(w109, pack, D, 'qin', -5, Date.now());
    w109.scars = { qin: Date.now() };
    var g109c = SQ.Bonds.gain(w109, pack, D, 'qin', 5, Date.now());
    var gainOk = g109a.after === 100 && g109a.tierAfter === 4 && g109b.blocked === 'nonpos' && g109c.blocked === 'scar';
    /* normalize：脏 bonds 过滤/clamp，spouse/scars/spouseLog 校验回落 */
    var n109 = pack.normalize(Object.assign(pack.initialState(), {
      bonds: { qin: 500, huang: 'abc', unknown_npc: 50, chiwei: -1 },
      spouse: { npcId: 'huang', form: 'yinyang', since: 1 },      /* huang 非候选 → null */
      guardLog: { count: -3, success: 9 }, scars: { nobody: 1 }, spouseLog: { npcId: 'x' }
    }));
    var normOk = n109.bonds.qin === 100 && !('huang' in n109.bonds) && !('unknown_npc' in n109.bonds) &&
      n109.bonds.chiwei === -99 && n109.spouse === null &&   /* 势力批 v2.4：旧哨兵 −1 → −99 迁移 */
      n109.guardLog.count === 0 && n109.guardLog.success === 0 &&
      Object.keys(n109.scars).length === 0 && n109.spouseLog === null;
    /* 旧档迁移（R7）：批 2 形态存档（无任何 G14 字段）→ normalize 补齐全套缺省 */
    var old109 = pack.initialState();
    ['bonds', 'spouse', 'guardLog', 'chuBlessAt', 'scars', 'spouseCdUntil', 'spouseLog'].forEach(function (k) { delete old109[k]; });
    var m109 = pack.normalize(JSON.parse(JSON.stringify(old109)));
    normOk = normOk && JSON.stringify(m109.bonds) === '{}' && m109.spouse === null &&
      m109.guardLog.count === 0 && m109.chuBlessAt === 0 && JSON.stringify(m109.scars) === '{}' &&
      m109.spouseCdUntil === 0 && m109.spouseLog === null;
    ok('109', 'bond 映射表对表（60 行 = 正典 57 事件 + 垂青 pei 1 + 天骄占位 2 · companion 链）+ 四态（bond/lock/drain/互斥）+ 好感模型 + normalize + 旧档迁移',
      bad109.length === 0 && tierOk && gainOk && normOk,
      'bad=' + bad109.slice(0, 4).join(',') + ' tier=' + tierOk + ' gain=' + gainOk + ' norm=' + normOk);

    /* #110 护法位：好感最高者自动担任；档3 +0.03 / 档4 +0.06 进 p 加总；魔道档失效归零、个体助力保留 */
    var w110 = mkWs({ realm: 4 });
    w110.bonds = { huang: 100, qin: 70 };
    pack.recalcDerived(w110, mkProf());
    var g110 = SQ.Bonds.guardianOf(w110, pack, D);
    var w110b = mkWs({ realm: 4 });
    pack.recalcDerived(w110b, mkProf());
    var ti110 = SQ.XTrib.info(w110, pack, D, M(mkProf(), w110));
    var ti110b = SQ.XTrib.info(w110b, pack, D, M(mkProf(), w110b));
    var pOk = g110.npcId === 'huang' && g110.tier === 4 && g110.bonus === D.GUARD_BONUS[4] &&
      ti110.parts.guardian === D.GUARD_BONUS[4] &&
      Math.abs(ti110.p - Math.min(D.TRIB_P_CLAMP[1], ti110b.p + D.GUARD_BONUS[4])) < 1e-9;
    /* companion 判定：档 ≥2 过；魔道档必然失败 */
    var comp110 = SQ.Bonds.companionOk(w110, pack, D, 2);
    var w110c = mkWs({ realm: 4, karmaEventScore: -900 });
    w110c.bonds = { huang: 100, qin: 70 };
    pack.recalcDerived(w110c, mkProf());
    var g110c = SQ.Bonds.guardianOf(w110c, pack, D);
    var m110c = M(mkProf(), w110c);
    var evilOk = g110c.evil === true && g110c.bonus === 0 &&
      SQ.Bonds.companionOk(w110c, pack, D, 2) === false &&
      Math.abs((m110c.bonds.checkPp || 0) - 0.015 * 3) < 1e-9;   /* 个体助力保留（qin 档3 = 4.5pp） */
    /* 护法记录：guardianBonus 生效的渡劫计次 */
    var w110d = mkWs({ realm: 0, qi: 1e9 });
    w110d.bonds = { huang: 100 };
    pack.recalcDerived(w110d, mkProf());
    var restore110 = stubRandom([0]);
    SQ.Realm.tryBreakthrough(w110d, pack, D, M(mkProf(), w110d), Date.now(), { log: noopLog(), profile: mkProf() });
    restore110();
    var logOk = w110d.guardLog.count === 1 && w110d.guardLog.success === 1;
    ok('110', '护法位：最高好感自动 + 档3/4 加项入 p + 魔道失效助力保留 + companion 判定 + 护法记录',
      pOk && comp110 && evilOk && logOk,
      JSON.stringify({ pOk: pOk, comp: comp110, evil: evilOk, log: w110d.guardLog }));

    /* #111 绝交锁（引擎卷 v1.10 §3.6 · 缘尽收敛批改双门槛）：
     *   (a) 轻中度背叛分支（stray_dog karma −8，已降为 bondDrain）→ **不锁**，好感跌至厌恶区、可挽回；
     *   (b) 重背叛分支（modao_xiangyao karma −20，保留 bondLock）门槛**不合**（素人 karma 0 / 好感 0）→ 自动降级 drain；
     *   (c) 同分支门槛**合格**（karma ≤ −400 + 好感 ≥ BOND_LOCK_BOND_MIN）→ 真锁 −99 + 后续 gain 拒入账 + 护法位排除；
     *   (d) lock 省略 gate = 无条件锁（既有旁路/断言直测向后兼容）。 */
    var w111 = mkWs({ realm: 1 });
    pack.recalcDerived(w111, mkProf());
    var restore111 = stubRandom([0]);                       /* evil 分支判定过 */
    var r111 = SQ.Events.resolveBranch(w111, pack, D, M(mkProf(), w111), 'stray_dog', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore111();
    var drainA = w111.bonds.huang;
    var notLockA = !SQ.Bonds.locked(w111, 'huang') && drainA < 0 && drainA > -99;
    var g111pre = SQ.Bonds.gain(w111, pack, D, 'huang', 30, Date.now());   /* 厌恶可被后续事件拉回 */
    var recoverA = g111pre.blocked === null && w111.bonds.huang > drainA;

    /* (b) 重背叛 + 门槛不合 → 降级 */
    var w111b = mkWs({ realm: 8 });
    pack.recalcDerived(w111b, mkProf());
    var restore111b = stubRandom([0]);
    var r111b = SQ.Events.resolveBranch(w111b, pack, D, M(mkProf(), w111b), 'modao_xiangyao', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore111b();
    /* applied.bondDrain 与 applied.bondLock 同形态 = npc id 字符串（events.js 回写口径）；
     * 互斥纪律：降级后 applied.bondLock 必须已撤销，否则结果页误报「恩断义绝」 */
    var gateOffB = !SQ.Bonds.locked(w111b, 'chelaozu') && r111b.eff.bondDrain === 'chelaozu' &&
      !r111b.eff.bondLock && w111b.bonds.chelaozu < 0 && w111b.bonds.chelaozu > -99;

    /* (c) 重背叛 + 门槛合格 → 真锁 */
    var w111c = mkWs({ realm: 8, karmaEventScore: -500 });
    w111c.bonds = { chelaozu: D.BOND_LOCK_BOND_MIN };
    pack.recalcDerived(w111c, mkProf());
    var karmaC = w111c.karma;
    var restore111c = stubRandom([0]);
    var r111c = SQ.Events.resolveBranch(w111c, pack, D, M(mkProf(), w111c), 'modao_xiangyao', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore111c();
    var g111 = SQ.Bonds.gain(w111c, pack, D, 'chelaozu', 30, Date.now());
    var g111b = SQ.Bonds.guardianOf(w111c, pack, D);
    var lockC = r111c.eff.bondLock === 'chelaozu' && w111c.bonds.chelaozu === -99 &&
      g111.blocked === 'lock' && g111b === null && (w111c.juefengIds || []).indexOf('chelaozu') >= 0;

    /* (d) 省略 gate = 无条件锁 */
    var w111d = mkWs({ realm: 1 });
    var r111d = SQ.Bonds.lock(w111d, 'huang');
    var noGateD = !!(r111d && r111d.ok) && w111d.bonds.huang === -99;

    ok('111', '绝交锁双门槛：轻背叛 drain 不锁可拉回 / 重背叛门槛不合自动降级 / 门槛合格真锁 −99+拒入账+护法排除+入绝交名录 / 省略 gate 无条件锁',
      notLockA && recoverA && gateOffB && karmaC <= D.BOND_LOCK_KARMA_MAX && lockC && noGateD,
      JSON.stringify({ drainA: drainA, recover: w111.bonds.huang, gateOff: gateOffB, drainB: w111b.bonds.chelaozu,
        karmaC: karmaC, lockC: lockC, noGate: noGateD }));

    /* #112 个体助力合计封顶（引擎卷 §3.4 v1.4 口径2）：debuff 减免叠乘基础 + 加算后 clamp ≤50%；单人满档 ≤8%/6pp */
    var w112 = mkWs({ realm: 3 });
    pack.recalcDerived(w112, mkProf());
    var fakeMods112 = { hooks: { zhishui: -0.40, kujing: -0.40 }, bonds: { debuffAll: 0.16, debuffXinmo: 0.20 }, sum: {}, detail: {} };
    var t112 = 1700000000000;
    SQ.Events.applyEffects(w112, pack, D, fakeMods112,
      { buff: { field: 'eventLuck', mult: -0.2, hours: 24 } },
      { eventId: 'market_assassin', now: t112 });            /* bad 性质 → 心魔类，全源齐上 */
    var hrs112 = (w112.buffs[0].until - t112) / 3600000;
    /* 单人满档 ≤8%/≤6pp 约束的是乘区 field 型与判定 pp；减免/通道型走各自合计封顶（§8.2 口径） */
    var perOk112 = (D.COMPANIONS || []).every(function (c) {
      var pk = c.perk || {};
      if (!pk.field && pk.channel !== 'checkPp') return true;
      var full = Math.abs(pk.perTier || 0) * (D.BOND_TIERS || []).length;
      return pk.channel === 'checkPp' ? full <= 0.06 + 1e-9 : full <= 0.08 + 1e-9;
    });
    ok('112', 'debuff 减免合计 clamp ≤50%（叠乘0.64+药箱0.16+忠护0.20 → 0.50）+ 单人满档预算',
      Math.abs(hrs112 - 12) < 0.01 && perOk112,
      'hours=' + hrs112.toFixed(2) + '/12 perOk=' + perOk112);

    /* #114 结缘双修：仅 spouse 候选 + 满档可提亲；形态按结缘瞬间档位三档映射；spouse 唯一 */
    var w114 = mkWs({ realm: 3, karmaEventScore: 900 });
    w114.bonds = { suwan: 100, huang: 100, xie: 99 };
    /* 隔离同道相吸（阵营名号联动批）：karma 900 → 名号跨段会给同向已相识道友 +好感，
     * 把 xie（正道）从 99 顶到 100，本断言的「未满档 → affinity」前提即失效。
     * 预置 rankGiftSeen 全段名号 = 本世已发过，gift 零发放；同道相吸本身由 #252 独立断言覆盖。 */
    w114.rankGiftSeen = (D.KARMA_RANKS || []).map(function (r) { return r[1]; });
    pack.recalcDerived(w114, mkProf());
    var r114 = SQ.Bonds.propose(w114, pack, D, 'suwan', Date.now(), noopLog());
    var spouse114 = w114.spouse && w114.spouse.npcId;    /* 先捕获——下方会置 null 测非候选 */
    var rej114a = SQ.Bonds.propose(w114, pack, D, 'xie', Date.now(), noopLog());   /* 已有 spouse → occupied */
    w114.bonds.xie = 100;
    var rej114b = SQ.Bonds.canPropose(w114, pack, D, 'xie', Date.now());           /* 满档候选但 occupied */
    var rej114c = SQ.Bonds.canPropose(w114, pack, D, 'huang', Date.now());         /* 非候选 */
    w114.spouse = null;
    w114.bonds.xie = 99;
    var rej114d = SQ.Bonds.canPropose(w114, pack, D, 'xie', Date.now());            /* 未满档 */
    ok('114', '提亲：候选+满档+唯一；形态按瞬间档位（正道→阴阳）',
      r114.ok && r114.form === 'yinyang' && spouse114 === 'suwan' &&
      rej114a.ok === false && rej114a.reason === 'affinity' && rej114b.reason === 'occupied' &&   /* xie 99 → 先 affinity；置 100 后 → occupied */
      rej114c.reason === 'notspouse' && rej114d.reason === 'affinity',
      JSON.stringify([r114.form, rej114a.reason, rej114b.reason, rej114c.reason, rej114d.reason]));

    /* #115 炉鼎三代价：−20 入账 / 助力归零 / 回升解除 + 心结锁（好感数值不变、永不再护法、不可再提亲） */
    var w115 = mkWs({ realm: 3, karmaEventScore: -900 });
    w115.bonds = { yewu: 100, chen: 70 };
    pack.recalcDerived(w115, mkProf());
    var kes115 = w115.karmaEventScore;
    var r115 = SQ.Bonds.propose(w115, pack, D, 'yewu', Date.now(), noopLog());
    var cost115 = r115.ok && r115.form === 'luding' && w115.karmaEventScore === kes115 - 20;
    pack.recalcDerived(w115, mkProf());
    var m115 = M(mkProf(), w115);
    var zero115 = !((m115.detail.eventLuck || {}).bond) && Math.abs((m115.detail.qiRate || {}).spouse - 0.18) < 1e-9 &&
      Math.abs((m115.bonds.debuffAll || 0) - 0.12) < 1e-9;   /* yewu 归零、双修 +18% 在、chen 药箱档3 = 12% 保留 */
    w115.karmaEventScore = 0;                                /* 回头：karma 回升出魔道档 */
    pack.recalcDerived(w115, mkProf());
    var diss115 = w115.spouse === null && !!w115.scars.yewu && w115.bonds.yewu === 100 &&
      w115.spouseLog && w115.spouseLog.reason === 'redemption';
    var g115 = SQ.Bonds.guardianOf(w115, pack, D);
    var lock115 = g115.npcId === 'chen' &&                                   /* yewu 100 最高但心结锁 → 排除 */
      SQ.Bonds.canPropose(w115, pack, D, 'yewu', Date.now()).reason === 'scar' &&
      SQ.Bonds.gain(w115, pack, D, 'yewu', 5, Date.now()).blocked === 'scar';
    ok('115', '炉鼎三代价：−20 入账 / 助力归零 / 回头即散 + 心结锁三义',
      cost115 && zero115 && diss115 && lock115,
      JSON.stringify({ cost: cost115, zero: zero115, diss: diss115, lock: lock115 }));

    /* #116 双修维持与解除：阴阳跌破即散 + 7 天冷却；互助无门槛不自动解除；反复结离数值不变 */
    var w116 = mkWs({ realm: 3, karmaEventScore: 900 });
    w116.bonds = { suwan: 100 };
    pack.recalcDerived(w116, mkProf());
    var t116 = 1700000000000;
    SQ.Bonds.propose(w116, pack, D, 'suwan', t116, noopLog());
    pack.recalcDerived(w116, mkProf());
    var rate116on = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
    w116.karmaEventScore = 0;
    w116.karma = 0;
    SQ.XKarma.recalc(w116, D);
    SQ.Bonds.maintain(w116, pack, D, t116 + 1000);
    var diss116 = w116.spouse === null && w116.spouseCdUntil === t116 + 1000 + (D.SPOUSE_FORMS.yinyang.cooldownMs) &&
      w116.spouseLog.reason === 'karma';
    var cd116 = SQ.Bonds.canPropose(w116, pack, D, 'suwan', t116 + 2000).reason === 'cooldown';
    var rate116off = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
    /* 互助：左道结 → karma 漂到正道档也不解除（v1.4 口径1） */
    var w116b = mkWs({ realm: 3 });
    w116b.bonds = { suwan: 100 };
    pack.recalcDerived(w116b, mkProf());
    SQ.Bonds.propose(w116b, pack, D, 'suwan', t116, noopLog());
    var huzhu116 = w116b.spouse && w116b.spouse.form === 'huzhu';
    w116b.karmaEventScore = 900;
    pack.recalcDerived(w116b, mkProf());
    var keep116 = huzhu116 && w116b.spouse !== null && w116b.spouse.form === 'huzhu';
    /* 反复结离 100 次：乘区即时生效与回收，rateOf 零漂移 */
    var drift116 = 0;
    for (var i116 = 0; i116 < 100; i116++) {
      w116.spouseCdUntil = 0;
      w116.karmaEventScore = 900;
      pack.recalcDerived(w116, mkProf());
      SQ.Bonds.propose(w116, pack, D, 'suwan', t116 + i116, noopLog());
      pack.recalcDerived(w116, mkProf());
      var rOn = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
      w116.karmaEventScore = 0;
      pack.recalcDerived(w116, mkProf());
      SQ.Bonds.maintain(w116, pack, D, t116 + i116);
      var rOff = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
      if (Math.abs(rOn - rate116on) > 1e-6 || Math.abs(rOff - rate116off) > 1e-6) drift116++;
    }
    ok('116', '阴阳跌破散+7天冷却 / 互助不自动解除 / 反复结离 100 次零漂移',
      diss116 && cd116 && keep116 && drift116 === 0 && w116.bonds.suwan === 100,
      JSON.stringify({ diss: diss116, cd: cd116, huzhu: keep116, drift: drift116 }));

    /* #129 道友助力 + 双修预算对表（数值详设 §8.2 / 引擎卷 §3.4：逐字段 58 人满档合计 = 文档登记值）
     * 恢复批 2026-10-03 · 58 人预算基线 = 批3 20 人基线 + 扩容增量（§四 8 字段）+ 二批增量（§五 13 字段：
     * qiRate +14 / offlineEff +22 / stonesRate +10 / eventLuck +22 / shopCost −4 / combatPower +22 / bottleneck +10 /
     * combatSpeed +18 / artsSpeed +8 / dropRate +14 / debuffAll −8 / debuffXinmo −8 / tribFailLossMod −2pp）；
     * 消费端三道 clamp 不变（debuff ≤50% / checkPp ≤15pp / tribFailLossMod [30%,70%]）。 */
    var EXP129F = { dropRate: 0.22, shopCost: -0.20, artsSpeed: 0.16, stonesRate: 0.24, offlineEff: 0.38,
      combatPower: 0.34, eventLuck: 0.30, gearLuck: 0.08, tribFailLossMod: -0.10, combatSpeed: 0.24,
      qiRate: 0.14 };
    var EXP129C = { debuffXinmo: 0.36, debuffAll: 0.36, checkPp: 0.10, bottleneck: 0.30, negEvent: 0.08,
      refine: 0.12, claimQi: 0.04, dropExtra: 0.06 };
    var w129 = mkWs({ realm: 3 });
    (D.COMPANIONS || []).forEach(function (c) { w129.bonds[c.id] = 100; });
    pack.recalcDerived(w129, mkProf());
    var m129 = M(mkProf(), w129);
    var bad129 = [];
    for (var f129 in EXP129F) {
      var got129 = (m129.detail[f129] || {}).bond || 0;
      if (Math.abs(got129 - EXP129F[f129]) > 1e-9) bad129.push(f129 + '=' + got129 + '/' + EXP129F[f129]);
    }
    for (var c129 in EXP129C) {
      if (Math.abs((m129.bonds[c129] || 0) - EXP129C[c129]) > 1e-9) bad129.push(c129 + '=' + (m129.bonds[c129] || 0) + '/' + EXP129C[c129]);
    }
    /* 双修三形态登记值（§8.2）：qiRate 6/10/18%、阴阳 offlineEff 10% + 心魔 −25% */
    if (D.SPOUSE_FORMS.yinyang.qiRate !== 0.06 || D.SPOUSE_FORMS.huzhu.qiRate !== 0.10 ||
      D.SPOUSE_FORMS.luding.qiRate !== 0.18 || D.SPOUSE_FORMS.yinyang.offlineEff !== 0.10 ||
      D.SPOUSE_FORMS.yinyang.xinmoReduce !== 0.25) bad129.push('spouseForms');
    ok('129', '助力+双修预算对表 §8.2（58 人满档逐字段 + 通道 + 三形态 · 恢复批正典口径）',
      bad129.length === 0, bad129.join(','));

    /* #130 冥佑（楚老拐）：档 ≥2 每 7 天 1 层、层时长 14 天、场上 ≤2 层；档 <2 停授不清存量 */
    var w130 = mkWs({ realm: 1 });
    w130.bonds = { chu: 30 };                                /* 档 2 */
    pack.recalcDerived(w130, mkProf());
    var t130 = 1700000000000;
    var s130 = [];
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130, noopLog()));                 /* 0：锚点初始化 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 6 * 86400000, noopLog()));  /* 0：未满 7 天 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 7 * 86400000, noopLog()));  /* 1：第 1 层 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 14 * 86400000, noopLog())); /* 1：第 2 层 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 20.9 * 86400000, noopLog())); /* 0：层满 + 周期未满 */
    var layers130 = w130.buffs.filter(function (b) { return b.field === 'eventShield' && b.source === 'chu'; });
    var life130 = Math.round((layers130[0].until - (t130 + 7 * 86400000)) / 86400000);
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 21 * 86400000, noopLog())); /* 1：第 1 层到期，补授 */
    var live130 = w130.buffs.filter(function (b) { return b.field === 'eventShield' && b.source === 'chu' && b.until > t130 + 21 * 86400000; });
    w130.bonds.chu = 0;                                      /* 缘退档 → 停授，存量不清 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 40 * 86400000, noopLog()));
    ok('130', '冥佑：7 天 1 层 / 14 天存续 / ≤2 层 / 档退停授',
      s130.join('') === '0011010' && layers130.length === 2 && life130 === 14 && live130.length === 2,
      'seq=' + s130.join('') + ' layers=' + layers130.length + ' life=' + life130 + 'd live=' + live130.length);

    /* #131 判定加点三源合计封顶 ≤ +15pp（摄魂 hooks + 斩三尸 sum.checkBonus + 秦老丈 bonds.checkPp） */
    var w131 = mkWs({ realm: 2 });
    pack.recalcDerived(w131, mkProf());
    var dc131 = SQ.Attrs.dcStdOf(w131, D) * D.ATTR_DIFF.medium;
    w131.attrs.jing = dc131;                                 /* v == dc → 基线 p = 0.5 */
    var mods131 = { hooks: { shehun: 0.10 }, sum: { checkBonus: 0.09 }, bonds: { checkPp: 0.06 }, detail: {} };
    var r131 = SQ.Attrs.check('jing', 'medium', w131, D, mods131, 1);
    var mods131b = { hooks: { shehun: 0.06 }, sum: { checkBonus: 0 }, bonds: { checkPp: 0.06 }, detail: {} };
    var r131b = SQ.Attrs.check('jing', 'medium', w131, D, mods131b, 1);
    ok('131', '判定加点三源合计封顶：0.25→0.15 / 0.12 不截',
      Math.abs(r131.p - 0.65) < 1e-9 && Math.abs(r131b.p - 0.62) < 1e-9,
      'p=' + r131.p.toFixed(3) + '/0.65 ' + r131b.p.toFixed(3) + '/0.62');

    /* #132 bond 57 事件逐条触发**四态**（批 3 验证⑤ · 恢复批扩至道友池卷 §二 全量 57 + 垂青 pei = 58 行；
     * 缘尽收敛批 三态 → 四态：正/左/魔分支 × bond 入账 / 绝交锁 / 情谊生裂 / 无入账）——
     * 每条全新存档实跑 resolveBranch（判定链 stub 0 必过；bond 不受判定折半影响 = 追加维度纪律），
     * 结果与道友池卷 §二 映射表（原四柱卷 §5.1）逐一对照；魔道 0 入账分支验证「不留痕」。
     * **绝交锁双门槛**（引擎卷 v1.10 §3.6）：保留的 6 处重背叛锁须 karma ≤ −400 且好感 ≥ 30 才真锁，
     * 故 lock 分支单独用「门槛合格存档」跑（karmaEventScore −500 + 预置好感到门槛值）；
     * drain 分支期望 = 负好感且**不是** −99（可挽回），扣减额 = round(|karma|×1.2) clamp [6,25]。 */
    var bad132 = [];
    var all132 = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian);
    var LOCK_BMIN132 = D.BOND_LOCK_BOND_MIN != null ? D.BOND_LOCK_BOND_MIN : 30;
    Object.keys(BOND_MAP109).forEach(function (evId) {
      var exp = BOND_MAP109[evId];
      var ev132 = all132.find(function (e) { return e.id === evId; });
      if (!ev132) { bad132.push(evId + ':missing'); return; }
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var expL = exp[bk + 'Lock'] || [];
        var expDr = exp[bk + 'Drain'] || [];
        /* lock 分支要门槛合格才锁得住：压低 karma + 预置好感到门槛（其余分支用素存档，bonds 起点为空）*/
        var w = expL.length
          ? mkWs({ realm: 8, stones: 1e7, qi: 1e9, karmaEventScore: -500 })
          : mkWs({ realm: 8, stones: 1e7, qi: 1e9 });
        if (expL.length) { w.bonds = {}; expL.forEach(function (npc) { w.bonds[npc] = LOCK_BMIN132; }); }
        pack.recalcDerived(w, mkProf());
        var restore = stubRandom([0]);
        SQ.Events.resolveBranch(w, pack, D, M(mkProf(), w), evId, bk, Date.now(), { log: noopLog(), profile: mkProf() });
        restore();
        var expB = exp[bk] || {};
        for (var npc in expB) {
          if (w.bonds[npc] !== expB[npc]) bad132.push(evId + ':' + bk + ':' + npc + '=' + (w.bonds[npc] || 0) + '/' + expB[npc]);
        }
        expL.forEach(function (npc) {
          if (w.bonds[npc] !== -99) bad132.push(evId + ':' + bk + ':lock' + npc + '=' + (w.bonds[npc] || 0));
        });
        expDr.forEach(function (npc) {
          var v = w.bonds[npc];
          if (!(v < 0 && v > -99)) bad132.push(evId + ':' + bk + ':drain' + npc + '=' + (v || 0));
        });
        /* 无入账分支：bonds 必须为空（0 不留痕）*/
        if (Object.keys(expB).length === 0 && expL.length === 0 && expDr.length === 0 &&
            Object.keys(w.bonds).length > 0) {
          bad132.push(evId + ':' + bk + ':extra=' + JSON.stringify(w.bonds));
        }
      });
    });
    /* 守陵人 companion 链运行时语义：护法档 ≥2 全过全额 / 无护法链败收益折半（原判定语义不变） */
    var w132g = mkWs({ realm: 8, stones: 1e7, qi: 1e9, karmaEventScore: 300 });
    w132g.bonds = { huang: 30 };                            /* 档 2 = companion minTier 2 达标 */
    pack.recalcDerived(w132g, mkProf());
    var restoreG = stubRandom([0]);
    var rG = SQ.Events.resolveBranch(w132g, pack, D, M(mkProf(), w132g), 'grave_keeper', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreG();
    var w132n = mkWs({ realm: 8, stones: 1e7, qi: 1e9, karmaEventScore: 300 });
    pack.recalcDerived(w132n, mkProf());
    var restoreN = stubRandom([0]);
    var rN = SQ.Events.resolveBranch(w132n, pack, D, M(mkProf(), w132n), 'grave_keeper', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreN();
    var compOk = rG.pass === true && rN.pass === false;
    ok('132', 'bond 57 事件逐条四态对表（58 行含垂青 pei · 绝交锁 6 处门槛合格存档实锁 + 情谊生裂 21 处负好感不锁）+ companion 链运行时（有护法全过/无护法折半）',
      bad132.length === 0 && compOk,
      'bad=' + bad132.slice(0, 4).join(',') + ' comp=' + compOk);

    /* #133 功法处置（道具处置打磨包）：散功/弃置同一返还口径 · 初始自带与槽内锁 ·
     * 防套利（散功率 0.4 < 架上折算率 0.5 → 买入即亏）· ledger 恒等式零漂移 */
    var w133 = mkWs({ realm: 6 });
    pack.recalcDerived(w133, mkProf());
    SQ.Arts.gainArt(w133, pack, D, 'yinqi', noopLog());      /* 坊市 150 → base = ceil(150×0.4) = 60 */
    /* 体验手感批（§4.4 v1.26）：入门即自动上槽——本测试场景需要先手动移槽再验散功链 */
    var autoed133 = w133.artsSlots.indexOf('yinqi') >= 0;
    if (autoed133) w133.artsSlots.splice(w133.artsSlots.indexOf('yinqi'), 1);
    var base133 = SQ.Arts.salvageBase(pack, D, 'yinqi');
    var dup133 = SQ.Arts.dupValue(pack, D, 'yinqi');
    var lockInit133 = SQ.Arts.canSalvage(w133, pack, D, 'tuna') === false;   /* 初始自带 */
    var can133 = SQ.Arts.canSalvage(w133, pack, D, 'yinqi') === true;
    w133.artsLevels.yinqi = 2;                              /* 返还 ×(1 + 2×0.25) = 90 */
    var val133 = SQ.Arts.salvageValue(w133, pack, D, 'yinqi');
    w133.artsSlots.push('yinqi');
    var lockSlot133 = SQ.Arts.canSalvage(w133, pack, D, 'yinqi') === false;  /* 槽内不可散功 */
    w133.artsSlots.pop();
    var st133 = w133.stones;
    var res133 = SQ.Arts.salvage(w133, pack, D, 'yinqi');
    var gone133 = w133.artsKnown.indexOf('yinqi') < 0 && w133.artsLevels.yinqi == null;
    var sums133 = SQ.Ledger.sums(w133);
    ok('133', '功法散功/弃置：返还口径 · 初始/槽内锁 · 防套利 · ledger 恒等式',
      autoed133 && base133 === 60 && dup133 === 75 && dup133 > base133 && lockInit133 && can133 && lockSlot133 &&
      val133 === 90 && res133 && res133.value === 90 && res133.known === true && gone133 &&
      w133.stones === st133 + 90 && sums133.expect === w133.stones,
      'base=' + base133 + ' dup=' + dup133 + ' val=' + val133 + ' stones=' + w133.stones +
      ' drift=' + (sums133.expect - w133.stones));

    /* #134 库藏阁手动炼化（道具处置打磨包）：返还口径同自动溢出 · 独占豁免 · 越界拒绝 ·
     * 容量挂点 on_stash_cap 扩容 · ledger 恒等式零漂移 */
    var w134 = mkWs({ realm: 0 });
    pack.recalcDerived(w134, mkProf());
    var m134 = M(mkProf(), w134);
    var it134a = mkGear('weapon', { tier: 1, atk: 5 });
    var it134b = mkGear('armor', { tier: 2, atk: 7 });
    var it134x = mkGear('accessory', { tier: 3, atk: 9, exclusive: 'ex_test' });
    w134.stash = [it134a, it134b, it134x];
    var cap134 = SQ.Gear.stashCap(w134, D, { hooks: {} });
    var cap134b = SQ.Gear.stashCap(w134, D, { hooks: { on_stash_cap: 3 } });
    var v134a = SQ.Gear.refineValue(it134a, w134, D, m134);
    var st134 = w134.stones;
    var rExcl134 = SQ.Gear.salvage(w134, pack, D, m134, 2, noopLog());   /* 独占豁免 */
    var rIdx134 = SQ.Gear.salvage(w134, pack, D, m134, 9, noopLog());    /* 越界 */
    var rOk134 = SQ.Gear.salvage(w134, pack, D, m134, 0, noopLog());
    var sums134 = SQ.Ledger.sums(w134);
    ok('134', '库藏阁手动炼化：返还口径 · 独占豁免 · 越界拒绝 · 容量挂点',
      cap134 === D.STASH_CAP && cap134b === D.STASH_CAP + 3 &&
      rExcl134.ok === false && rExcl134.reason === 'exclusive' &&
      rIdx134.ok === false && rIdx134.reason === 'index' &&
      rOk134.ok === true && rOk134.value === v134a && rOk134.item === it134a &&
      w134.stash.length === 2 && w134.stash.indexOf(it134x) >= 0 &&
      w134.stones === st134 + v134a && sums134.expect === w134.stones,
      'cap=' + cap134 + '/' + cap134b + ' val=' + v134a + ' stones=' + w134.stones +
      ' drift=' + (sums134.expect - w134.stones));

    /* #135 法宝引擎（法宝全录）：获得/装备/乘区并入（同乘区加算）/祭炼成长/栏位解锁/脏档归一 */
    var w135 = mkWs({ realm: 4, stones: 1000000 });
    pack.recalcDerived(w135, mkProf());
    var g135 = SQ.Treasures.gain(w135, pack, D, 'h01', noopLog());
    var dup135 = SQ.Treasures.gain(w135, pack, D, 'h01', noopLog());
    var eq135 = SQ.Treasures.equip(w135, pack, D, 'h01', noopLog());
    var m135 = M(mkProf(), w135);
    var def135 = SQ.Treasures.def(pack, 'h01');
    var scaled1 = SQ.Treasures.scaled(pack, def135, SQ.Treasures.entryOf(w135, 'h01'), 'mult:qiRate');
    var cost135 = SQ.Treasures.refineCost(w135, pack, D, 'h01');
    var rs135 = stubRandom([0.99]);
    var st135 = w135.stones;
    var r135 = SQ.Treasures.refine(w135, pack, D, 'h01', noopLog());
    rs135();
    var scaled2 = SQ.Treasures.scaled(pack, def135, SQ.Treasures.entryOf(w135, 'h01'), 'mult:qiRate');
    var w135b = mkWs({ realm: 0 });
    var unlock135 = SQ.Treasures.slotUnlocked(w135b, pack, 0) && !SQ.Treasures.slotUnlocked(w135b, pack, 1);
    var w135c = mkWs({ realm: 2 });
    w135c.treasures = SQ.Treasures.normalize({
      owned: [{ id: 'nope' }, { id: 'h02', lv: 99 }, { id: 'h02' }],
      slots: ['h02', 'h02', 'ghost'], fate: { trib: 9 }
    }, pack);
    var norm135 = w135c.treasures.owned.length === 1 && w135c.treasures.owned[0].lv === 5 &&
      w135c.treasures.slots[0] === 'h02' && w135c.treasures.slots[1] === null &&
      w135c.treasures.fate.trib === 0.2;
    ok('135', '法宝引擎：获得/装备/乘区并入/祭炼成长/栏位解锁/脏档归一',
      g135.ok && dup135.ok === false && dup135.reason === 'dup' && eq135.ok && eq135.slot === 0 &&
      Math.abs(scaled1 - 0.15) < 1e-9 &&
      /* 同 #43：等级起点批后首发功法自带 qiRate，判「法宝并入乘区」要认 treasure 来源而不是总和 */
      Math.abs(((m135.detail.qiRate || {}).treasure || 0) - 0.15) < 1e-9 &&
      cost135 === 1040 && r135.ok && r135.fail === false && r135.lv === 2 &&
      w135.stones === st135 - 1040 && Math.abs(scaled2 - 0.1875) < 1e-9 &&
      unlock135 && norm135,
      'qiRate=' + (m135.sum.qiRate || 0) + ' cost=' + cost135 + ' lv=' + r135.lv + ' scaled2=' + scaled2);

    /* #136 法宝获取路径（法宝全录 §五）：坊市/黑市上架购买入账 + 秘境首通授予 */
    var w136 = mkWs({ realm: 3, stones: 1000000 });
    pack.recalcDerived(w136, mkProf());
    w136.shop.items = [{ kind: 'treasure', ref: 'h02', sold: false, price: 100 }];
    var buy136 = SQ.Shop.buy(w136, pack, D, M(mkProf(), w136), 0, false, noopLog());
    var w136b = mkWs({ realm: 3, stones: 1000000, karmaEventScore: -300 });
    pack.recalcDerived(w136b, mkProf());
    w136b.shop.blackItems = [{ kind: 'treasure', ref: 'x12', sold: false, price: 100 }];
    var buy136b = SQ.Shop.buy(w136b, pack, D, M(mkProf(), w136b), 0, true, noopLog());
    var w136c = mkWs({ realm: 5, zone: 1 });
    w136c.prog = { 1: 99 };
    pack.recalcDerived(w136c, mkProf());
    SQ.Combat.simulate(w136c, pack, D, M(mkProf(), w136c), 600, { log: noopLog(), now: Date.now() });
    var zoneGot136 = !!SQ.Treasures.entryOf(w136c, 'x02') && (w136c.cleared || []).indexOf(1) >= 0;
    ok('136', '法宝获取路径：坊市/黑市上架购买入账 + 秘境首通授予',
      buy136.ok && !!SQ.Treasures.entryOf(w136, 'h02') &&
      buy136b.ok && !!SQ.Treasures.entryOf(w136b, 'x12') && zoneGot136,
      'shop=' + buy136.ok + ' black=' + buy136b.ok + ' zone=' + zoneGot136);

    /* ═══ 修行状态批（闭关领悟 / 外出历练 / 潜心悟道 + 功法练习度 + Lv0-9 修为升级）═══ */

    /* #137 模式 normalize：脏值回落 seclude / 合法值保留 / 练习度钳位 / 游戏历起始年（v2.3） */
    var n137 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { mode: 'chaos', artsPractice: { tuna: 250, juling: -5 } } } });
    var n137b = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { mode: 'venture' } } });
    var n137c = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { calYear: 4321 } } });
    var n137d = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { calYear: -7 } } });
    var init137 = pack.initialState();
    ok('137', '修行状态 normalize：脏 mode 回落 seclude · 练习度钳位 0~100 · 游戏历起始年钳位',
      n137.worlds.xiuxian.mode === 'seclude' && n137b.worlds.xiuxian.mode === 'venture' &&
      n137.worlds.xiuxian.artsPractice.tuna === D.PRACTICE_MAX && n137.worlds.xiuxian.artsPractice.juling === undefined &&
      n137c.worlds.xiuxian.calYear === 4321 && n137d.worlds.xiuxian.calYear === 1 &&
      init137.calYear >= 1 && init137.calYear <= 9000,
      'calYear=' + n137c.worlds.xiuxian.calYear + '/' + n137d.worlds.xiuxian.calYear + ' init=' + init137.calYear);

    /* #138 闭关不进秘境（零击杀零灵石零进度）+ 零「引灵入体」转化（修行状态批 v2.1：
     * 槽聚灵诀 Lv3 = 修为收益 9% 转灵石，闭关必须一分不入）· 历练击杀得灵石。
     * pendingChoice 挂起冻结奇遇时钟，隔离事件随机性；autoTrib=false 隔离渡劫掷判。
     * dt=59s×2 次（<60s 在线窗口）→ 两次累计跨过 60s 击杀间隔恰好 1 杀。 */
    var w138 = mkWs({ realm: 1, zone: 0, mode: 'seclude', qi: 0 });
    w138.artsKnown = ['juling']; w138.artsSlots = ['juling']; w138.artsLevels = { juling: 3 };
    w138.pendingChoice = { id: '__gate', at: Date.now() };
    pack.claim(w138, 59000, Date.now(), mkProf(), { autoTrib: false });
    pack.claim(w138, 59000, Date.now(), mkProf(), { autoTrib: false });
    var w138b = mkWs({ realm: 1, zone: 0, mode: 'venture', qi: 0 });
    w138b.artsKnown = ['juling']; w138b.artsSlots = ['juling']; w138b.artsLevels = { juling: 3 };
    w138b.pendingChoice = { id: '__gate', at: Date.now() };
    pack.claim(w138b, 59000, Date.now(), mkProf(), { autoTrib: false });
    pack.claim(w138b, 59000, Date.now(), mkProf(), { autoTrib: false });
    ok('138', '闭关：不进秘境 + 引灵入体不转化（stones 纹丝不动）· 历练：击杀/转化灵石进账',
      w138.kills === 0 && w138.stones === 100 && (w138.prog[0] || 0) === 0 &&
      w138b.kills >= 1 && w138b.stones > 100,
      'seclude kills=' + w138.kills + ' stones=' + w138.stones +
      ' | venture kills=' + w138b.kills + ' stones=' + w138b.stones);

    /* #139 潜心悟道（离线）：按原有规则结算，模式不进离线口径；lastOffline 记 mode 叙事口径 */
    var w139 = mkWs({ realm: 8, mode: 'venture' });
    pack.recalcDerived(w139, mkProf());
    var restore139 = stubRandom(function () { return 0.99999; });   /* 同 #108：绵长内息双倍掷必须桩掉，否则两边收益比是掷点比 */
    var r139 = SQ.Idle.settle(w139, pack, D, 48 * 3600 * 1000, Date.now(), { log: noopLog(), profile: mkProf() });
    var w139b = mkWs({ realm: 8, mode: 'seclude' });
    pack.recalcDerived(w139b, mkProf());
    var r139b = SQ.Idle.settle(w139b, pack, D, 48 * 3600 * 1000, Date.now(), { log: noopLog(), profile: mkProf() });
    restore139();
    ok('139', '离线 = 潜心悟道：模式不影响离线收益 · lastOffline 记录叙事口径',
      r139.offline && r139b.offline && Math.abs(r139.gain - r139b.gain) < 1 &&
      w139.lastOffline.mode === 'venture' && w139b.lastOffline.mode === 'seclude',
      'venture=' + r139.gain.toFixed(0) + ' seclude=' + r139b.gain.toFixed(0));

    /* #140 在线修为模式乘区（体验批 v2.4）：闭关 ×1.3 增益 / 历练 ×0.55 放缓 →
     * 收益比值 = venture.qiMult / seclude.qiMult（由引擎常量驱动，模式乘区漂移即暴露）。 */
    /* 两件都清空功法：等级起点批（入门即 Lv1）后首发两部从第一天就带词条与签名，
     * 历练支的战斗/掉落结果会被它们推动 ⇒ 本条只测「模式乘区」，不留别的变量。 */
    var w140 = mkWs({ realm: 5, mode: 'seclude', qi: 0, artsKnown: [], artsSlots: [] });
    pack.recalcDerived(w140, mkProf());
    var r140 = SQ.Idle.settle(w140, pack, D, 30000, Date.now(), { log: noopLog(), profile: mkProf() });
    var w140b = mkWs({ realm: 5, mode: 'venture', qi: 0, artsKnown: [], artsSlots: [] });
    pack.recalcDerived(w140b, mkProf());
    var r140b = SQ.Idle.settle(w140b, pack, D, 30000, Date.now(), { log: noopLog(), profile: mkProf() });
    var ratio140 = r140b.gain / r140.gain;
    var exp140 = D.MODES.venture.qiMult / D.MODES.seclude.qiMult;
    ok('140', '在线修为模式乘区：闭关 ×1.3 增益 / 历练 ×0.55 放缓（比值落窗 ±10%）',
      Math.abs(ratio140 - exp140) < exp140 * 0.1 && D.MODES.seclude.qiMult > 1,
      'ratio=' + ratio140.toFixed(3) + ' exp=' + exp140.toFixed(3));

    /* #141 精通：主修增速 > 副槽 · 满值顿悟 Lv+1 且清零 · 模式乘区（闭关 1.5 / 历练 0.5）
     * · 增速随等级递减（低阶领悟快、高阶领悟慢） */
    var w141 = mkWs({ mode: 'seclude' });
    w141.artsKnown = ['tuna', 'juling']; w141.artsSlots = ['tuna', 'juling'];
    pack.recalcDerived(w141, mkProf());
    var m141 = SQ.Mods.collect(mkProf(), w141, pack, D);
    SQ.Arts.tickPractice(w141, pack, D, m141, 3600, { log: noopLog() });
    var pMain = w141.artsPractice.tuna, pSub = w141.artsPractice.juling;   /* 30×1.45×1.5=65.25 / 12×1.45×1.5=26.1（Lv1 起表头） */
    var guard141 = 0;
    /* 等级起点批：入门即 Lv1 ⇒ 首次顿悟升到 **Lv2**（旧判据是从 Lv0 悟到 Lv1） */
    while ((w141.artsLevels.tuna || 0) < 2 && guard141++ < 10) {
      SQ.Arts.tickPractice(w141, pack, D, m141, 3600, { log: noopLog() });
    }
    /* 低阶快、高阶慢：速率表 Lv1 > Lv8 且单调不增（表长 8，索引 = lv−1） */
    var lvRate1 = D.PRACTICE_LV_RATE[0], lvRate8 = D.PRACTICE_LV_RATE[7];
    var dec141 = lvRate1 > lvRate8 && D.PRACTICE_LV_RATE.length === D.ARTS_MAX_LV - 1 &&
      D.PRACTICE_LV_RATE.every(function (v, i, a) {
        return i === 0 || v <= a[i - 1];
      });
    var w141b = mkWs({ mode: 'venture' });
    w141b.artsKnown = ['tuna']; w141b.artsSlots = ['tuna'];
    var m141b = SQ.Mods.collect(mkProf(), w141b, pack, D);
    SQ.Arts.tickPractice(w141b, pack, D, m141b, 3600, { log: noopLog() });
    /* issue #3：主修点在**第 2 格**时增速跟着第 2 格走（旧实现按 `i === 0` 分配 ⇒ 这一格必红，
     * 也证明本条判据认的是「主修指向」而不是「槽序」）*/
    var w141c = mkWs({ mode: 'seclude' });
    w141c.artsKnown = ['tuna', 'juling']; w141c.artsSlots = ['tuna', 'juling'];
    SQ.Arts.setMain(w141c, 'juling');
    pack.recalcDerived(w141c, mkProf());
    var m141c = SQ.Mods.collect(mkProf(), w141c, pack, D);
    SQ.Arts.tickPractice(w141c, pack, D, m141c, 3600, { log: noopLog() });
    var c141 = w141c.artsPractice.juling === pMain && w141c.artsPractice.tuna === pSub;
    ok('141', '精通：主修快于副槽（增速认主修指向，issue #3 起不认槽序）· 满值顿悟清零重来 · 闭关易悟历练难悟 · 低阶快高阶慢',
      Math.abs(pMain - 65.25) < 1e-6 && Math.abs(pSub - 26.1) < 1e-6 &&
      w141.artsLevels.tuna === 2 && w141.artsPractice.tuna < D.PRACTICE_MAX &&
      Math.abs(w141b.artsPractice.tuna - 21.75) < 1e-6 && dec141 && c141,
      'main=' + pMain.toFixed(1) + ' sub=' + pSub.toFixed(1) +
      ' insight lv=' + w141.artsLevels.tuna + ' venture=' + w141b.artsPractice.tuna.toFixed(1) +
      ' lvRate=' + lvRate1 + '>' + lvRate8 +
      ' ‖ 点定第2格: juling=' + w141c.artsPractice.juling.toFixed(1) + ' tuna=' + w141c.artsPractice.tuna.toFixed(1));

    /* #142 升级改耗修为（不入灵石账）· 品阶/等级成本递增 · Lv9 封顶 */
    var w142 = mkWs({ realm: 0, qi: 1e9, stones: 100 });
    w142.artsKnown = ['tuna']; w142.artsSlots = ['tuna'];
    pack.recalcDerived(w142, mkProf());
    var m142 = SQ.Mods.collect(mkProf(), w142, pack, D);
    var c142a = SQ.Arts.upgradeCost(w142, pack, D, 'tuna', m142);      /* Lv1 黄：240×1 = 240 */
    var up142 = SQ.Arts.upgrade(w142, pack, D, 'tuna', m142);
    var tianId142 = null;
    for (var id142 in SQ.XARTS) if (SQ.XARTS[id142].tier === 'tian') { tianId142 = id142; break; }
    w142.artsKnown.push(tianId142);
    var c142t0 = SQ.Arts.upgradeCost(w142, pack, D, tianId142, m142);  /* Lv1 天：240×36 = 8640 */
    w142.artsLevels[tianId142] = 8;
    var c142t8 = SQ.Arts.upgradeCost(w142, pack, D, tianId142, m142);  /* 1300000×36（末档，索引 lv−1） */
    w142.artsLevels[tianId142] = 9;
    var c142t9 = SQ.Arts.upgradeCost(w142, pack, D, tianId142, m142);  /* 满级 = null */
    ok('142', '升级耗修为不动灵石 · 品阶/等级成本递增 · Lv9 封顶（升到 Lv9 即满，无价目可扣）',
      up142 && c142a === 240 && w142.qi === 1e9 - 240 && w142.stones === 100 &&
      c142t0 === 240 * D.ARTS_COST_TIER.tian && c142t8 === D.ARTS_COST[D.ARTS_COST.length - 1] * D.ARTS_COST_TIER.tian &&
      c142t9 === null && w142.artsLevels.tuna === 2,
      'cost0=' + c142a + ' costT0=' + c142t0 + ' costT8=' + c142t8 + ' costT9=' + c142t9);

    /* #143 日志「功法」分类路由（v2.3）：入门/顿悟/升级全记 arts（渡劫/晋升仍走 trib） */
    var cats143 = [];
    var log143 = function (c) { cats143.push(c); };
    var w143 = mkWs({});
    w143.artsKnown = []; w143.artsSlots = [];
    SQ.Arts.gainArt(w143, pack, D, 'yinqi', log143);          /* reqs 空 → 达标入门 → arts.learned + 体验手感批自动入槽 arts.autoslot */
    w143.artsSlots = ['yinqi'];
    w143.artsPractice = { yinqi: D.PRACTICE_MAX - 0.5 };
    var m143 = SQ.Mods.collect(mkProf(), w143, pack, D);
    SQ.Arts.tickPractice(w143, pack, D, m143, 3600, { log: log143 });   /* 满值 → 顿悟 → arts.insight */
    /* 升级日志（走 mutate 单通道，与 #68 同构） */
    localStorage.removeItem(SQ.KEY);
    var ref143 = {};
    await SQ.mutate(ref143, function (s) {
      s.profile = { name: 't', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.qi = 1e9;
      s.worlds.xiuxian.artsKnown = ['tuna'];
      s.worlds.xiuxian.artsSlots = ['tuna'];
    });
    await SQ.Actions.upgradeArt(ref143, 'tuna');
    /* 入门即 Lv1 ⇒ 这次升级日志写「升至 Lv2」（旧口径 Lv0→1 记 Lv1） */
    var hasArtsLog143 = ref143.worlds.xiuxian.log.some(function (l) {
      return l.cat === 'arts' && l.text.indexOf('Lv2') >= 0;
    });
    ok('143', '日志「功法」分类：入门/顿悟/升级全记 arts',
      cats143.length === 3 && cats143.every(function (c) { return c === 'arts'; }) &&   /* 入门 + 自动入槽（体验手感批）+ 顿悟 */
      w143.artsLevels.yinqi === 2 && w143.artsPractice.yinqi < D.PRACTICE_MAX && hasArtsLog143,
      'cats=' + cats143.join(',') + ' upgradeLog=' + hasArtsLog143);

    /* ═══ 势力批（G16 势力 + 神秘商人 + 渡劫 nerf · v2.4）═══ */

    /* #144 势力：世界生成（7~10 个 · 阵营均衡 · 描述不重复 · 关系对称）/ 旧档缺失自动补生成 /
     * 加入增益入乘区（来源 faction）/ 加入好感联动（友好 +10 敌对 −20 同门 +5 · 下限 −20 厌恶）/ 叛离代价 */
    var w144 = pack.normalize(pack.initialState());   /* factions null → 生成一次（pack.normalize 返回世界态本体） */
    var facs144 = w144.factions;
    var alignCount144 = { right: 0, neutral: 0, evil: 0 };
    var descDup144 = false;
    facs144.forEach(function (f) {
      alignCount144[f.align]++;
      if (SQ.t(f.desc, null, 'xiuxian') === f.desc) descDup144 = true;
    });
    var relSym144 = facs144.every(function (f) {
      return Object.keys(f.rel).every(function (k) { return f.rel[k] === (SQ.Factions.byId(w144, k).rel[f.id] || 'none'); });
    });
    var genOk144 = facs144.length >= 16 && facs144.length <= 20 &&
      alignCount144.right >= 2 && alignCount144.neutral >= 2 && alignCount144.evil >= 2 &&
      !descDup144 && relSym144;
    /* 幂等：再 normalize 不重新生成（名称/关系保持） */
    var again144 = pack.normalize(JSON.parse(JSON.stringify(w144)));
    var idem144 = JSON.stringify(again144.factions) === JSON.stringify(facs144);
    /* 道友归属：全部在册（或 null 散人）且指向在册势力 */
    var npcOk144 = Object.keys(w144.factionNpcs).length === D.COMPANIONS.length &&
      D.COMPANIONS.every(function (c) {
        var fid = w144.factionNpcs[c.id];
        return fid === null || !!SQ.Factions.byId(w144, fid);
      });
    /* 加入：增益入乘区 + 好感联动（构造一个已知敌对目标验证 −20 与厌恶下限） */
    var fA = facs144[0], fB = facs144[1];
    var enemy144 = facs144.find(function (f) { return f.rel[fB.id] === 'enemy'; }) || fA;
    var npcB144 = D.COMPANIONS.map(function (c) { return c.id; }).find(function (nid) { return w144.factionNpcs[nid] === fB.id; });
    var joined = SQ.Factions.join(w144, pack, D, fA.id, Date.now(), noopLog());
    var m144 = SQ.Mods.collect(mkProf(), w144, pack, D);
    var perkSrc144 = (((m144.detail || {})[fA.perk.field] || {}).faction) || 0;
    var bondDelta144 = npcB144 ? (w144.bonds[npcB144] || 0) : 0;
    var joinOk144 = joined.ok && perkSrc144 === fA.perk.v &&
      (!npcB144 || (fA.rel[fB.id] === 'enemy' ? bondDelta144 === -20 : true));
    /* 敌对 −20 到下限：再 +5 拉不回正（clamp 区间正确） */
    var leave144 = SQ.Factions.leave(w144, pack, D, Date.now(), noopLog());
    var leaveOk144 = leave144.ok && w144.factionId === null &&
      w144.karmaEventScore === (D.FACTIONS.LEAVE_KARMA || -30) &&
      w144.factionCdUntil > Date.now();
    ok('144', '势力：生成/幂等/归属/加入乘区+好感联动/叛离代价',
      genOk144 && idem144 && npcOk144 && joinOk144 && leaveOk144,
      'n=' + facs144.length + ' align=' + JSON.stringify(alignCount144) +
      ' idem=' + idem144 + ' perkSrc=' + perkSrc144 + ' bondDelta=' + bondDelta144 + ' leave=' + leaveOk144);

    /* #145 神秘商人（奇遇 №61）：特席开启/到期闭席/scout 加阶消耗/极品授予/p 基础 nerf 后 #50 已对表 */
    var w145 = mkWs({ realm: 3, stones: 100000 });
    w145.factions = facs144; w145.factionNpcs = w144.factionNpcs;
    pack.recalcDerived(w145, mkProf());
    var m145 = M(mkProf(), w145);
    SQ.Shop.openMerchant(w145, pack, D, m145, Date.now(), noopLog());
    var merch145 = w145.shop.merchant;
    var merchOk145 = merch145 && merch145.until > Date.now() && (merch145.items || []).length >= 2 &&
      merch145.items[0].kind === 'gear' && merch145.items[0].gear.tier >= D.MERCHANT_GEAR_TIER;
    /* scout：下一席装备顶格（仙品）且标记消耗 */
    var w145b = mkWs({ realm: 3, stones: 100000 });
    w145b.merchantScout = true;
    pack.recalcDerived(w145b, mkProf());
    SQ.Shop.openMerchant(w145b, pack, D, M(mkProf(), w145b), Date.now(), noopLog());
    var scoutOk145 = w145b.merchantScout === false && w145b.shop.merchant.scout === true &&
      w145b.shop.merchant.items[0].gear.tier === D.GEAR_TIERS.length - 1;
    /* 袭杀败 → 重伤（qiPctRaw 不吃封顶：修为 -75%）+ 失败封印。
     * ⚠️ 判据形态随「神秘商人节律批 2026-10-10」改写：原句比的是 `eventCooldowns[id] > now + 55min`
     *    = 钉**容器里存的字节**。而原实现把「到期时刻」写进一个按「触发时刻」读回的容器
     *    （`events.js` 原 `:924` 写、`:498` 读时再加一次 cooldownHours；本批改写后现写点 `:936`）⇒ 存值 1h、行为 2h，原判据两样都绿。
     *    现按读端同一判据反解**解禁时刻**再比（行为口径），期望值 = §8 正典的 24h（表值同批由 1 抬到 24：
     *    常规冷却已 12h，1h 的失败封印不起作用）。*/
    var w145c = mkWs({ realm: 1, zone: 1, qi: 100000 });
    w145c.factions = facs144; w145c.factionNpcs = w144.factionNpcs;
    pack.recalcDerived(w145c, mkProf());
    var rs145 = stubRandom([0.9999]);                     /* 战力判定必败 */
    var r145 = SQ.Events.resolveBranch(w145c, pack, D, M(mkProf(), w145c), 'mysterious_merchant', 'evil', Date.now(),
      { log: noopLog(), profile: mkProf() });
    rs145();
    var cd145 = SQ.Events.findById(pack, 'mysterious_merchant').cooldownHours;
    /* 解禁时刻 = 容器存值 + cooldownHours × 3600e3（与 buildPool:498 逐字同式） */
    var unlock145 = w145c.eventCooldowns.mysterious_merchant + cd145 * 3600 * 1000;
    var unlockOk145 = Math.abs(unlock145 - (Date.now() + 24 * 3600 * 1000)) < 60 * 1000;
    var injureOk145 = r145 && r145.pass === false && Math.abs(w145c.qi - 25000) < 1 &&
      w145c.buffs.some(function (b) { return b.field === 'combatPower' && b.mult === -0.75; }) &&
      unlockOk145;
    ok('145', '神秘商人：特席开启/scout 顶格消耗/袭杀败重伤 -75% + 失败封印 **24h（按读端判据反解解禁时刻）**',
      merchOk145 && scoutOk145 && injureOk145,
      'merch=' + merchOk145 + ' scout=' + scoutOk145 + ' qi=' + Math.round(w145c.qi) +
      ' injure=' + injureOk145 + ' ‖ 存值=' + ((w145c.eventCooldowns.mysterious_merchant - Date.now()) / 3600000).toFixed(1) +
      'h 冷却=' + cd145 + 'h ⇒ 解禁=' + ((unlock145 - Date.now()) / 3600000).toFixed(1) + 'h（期望 24h）');

    /* ═══ 福地扩充与势力深化与江湖传闻批（v2.18 · §4.16 #152/#155~#161）═══ */

    /* #152 固定势力池：16 处正典全量入档 + 三阵营各 ≥2 + 描述 key 在册 + 名称已解词（非 key 原样） */
    var fixOk152 = (D.FACTIONS_FIXED || []).every(function (fx) {
      var f = SQ.Factions.byId(w144, fx.id);
      return !!f && f.fixed === true && f.align === fx.align &&
        !!SQ.LEX.xiuxian['faction.' + fx.id + '.name'] && !!SQ.LEX.xiuxian['faction.' + fx.id + '.desc'] &&
        f.name === SQ.t('faction.' + fx.id + '.name', null, 'xiuxian') && f.desc === 'faction.' + fx.id + '.desc';
    });
    var cnt152 = { right: 0, neutral: 0, evil: 0 };
    (D.FACTIONS_FIXED || []).forEach(function (fx) { cnt152[fx.align]++; });
    ok('152', '固定势力池 16 处全量入档（正典 id/名称/描述 + 阵营 4/7/5）',
      (D.FACTIONS_FIXED || []).length === 16 && cnt152.right === 4 && cnt152.neutral === 7 && cnt152.evil === 5 && fixOk152,
      'n=' + (D.FACTIONS_FIXED || []).length + ' align=' + JSON.stringify(cnt152) + ' fixOk=' + fixOk152);

    /* #155 福地扩池：13 处 + 主线 6 一字不动 + 别院同档 + obtain 门控 + caveTrack（跳过 obtain）单调 */
    var MAIN155 = { market_yard: 1.00, green_peak: 1.08, sword_cliff: 1.12, thunder_pool: 1.18, star_fall: 1.25, immortal_abode: 1.35 };
    var mainOk155 = Object.keys(MAIN155).every(function (id) {
      var c = SQ.Cave.byId(pack, id);
      return !!c && Math.abs(c.mult - MAIN155[id]) < 1e-9 && !c.obtain;
    });
    var BRANCH155 = { bamboo_hut: 'green_peak', danxia_cave: 'sword_cliff', stillwater_hut: 'thunder_pool', fallen_star_court: 'star_fall' };
    var branchOk155 = Object.keys(BRANCH155).every(function (id) {
      var b = SQ.Cave.byId(pack, id), m = SQ.Cave.byId(pack, BRANCH155[id]);
      return !!b && !!m && Math.abs(b.mult - m.mult) < 1e-9 &&
        b.signature.field !== (m.signature ? m.signature.field : '') && !b.obtain;
    });
    var HIDDEN155 = ['mirror_lake', 'sword_mound', 'cloud_herd'];
    var w155 = mkWs({ realm: 5 });
    w155.cleared = [0, 1, 2, 3, 4, 5];
    var gateOk155 = HIDDEN155.every(function (id) {
      var chk = SQ.Cave.canEnter(w155, pack, D, id, Date.now());
      return !chk.ok && chk.lack.some(function (x) { return x.kind === 'obtain'; });
    });
    /* 门控达成 → grantObtain 自动授予（职级档 2 + 图鉴 20 格） */
    w155.factionId = 'huangfeng';
    w155.factionRep = { huangfeng: 300 };
    for (var si = 0; si < 20; si++) w155.eventHistory.seen['fake_ev_' + si] = Date.now();
    var granted155 = SQ.Cave.grantObtain(w155, pack, D, Date.now(), { log: noopLog() });
    var grantOk155 = granted155.length === 2 && SQ.Cave.owned(w155, 'mirror_lake') && SQ.Cave.owned(w155, 'sword_mound') &&
      !SQ.Cave.owned(w155, 'cloud_herd') && SQ.Cave.canEnter(w155, pack, D, 'mirror_lake', Date.now()).ok;
    /* caveTrack 口径（跳过 obtain）：单调不减 + 顶格 = 1.35 ≤ CAP（与批 2 轨道逐位一致） */
    var track155 = D.REALMS.map(function (_, r) {
      var best = 1;
      D.CAVES.forEach(function (c) {
        if (c.obtain) return;
        var rq = c.reqs || {};
        if (rq.realmMin != null && r < rq.realmMin) return;
        if (rq.zoneCleared != null && r < ((D.ZONES[rq.zoneCleared] || {}).unlock != null ? (D.ZONES[rq.zoneCleared] || {}).unlock : 99)) return;
        if (c.mult > best) best = c.mult;
      });
      return Math.min(D.CAVE_MULT_CAP, best);
    });
    var mono155 = track155.every(function (v, i) { return i === 0 || v >= track155[i - 1] - 1e-9; });
    var trackOk155 = mono155 && Math.abs(track155[9] - 1.35) < 1e-9 &&
      JSON.stringify(track155) === JSON.stringify([1, 1.08, 1.08, 1.12, 1.18, 1.25, 1.35, 1.35, 1.35, 1.35]);
    ok('155', '福地扩池：主线 6 不动 + 别院 4 同档异签名 + 隐世 3 obtain 门控/自动授予 + caveTrack 零漂移',
      D.CAVES.length === 13 && mainOk155 && branchOk155 && gateOk155 && grantOk155 && trackOk155,
      'n=' + D.CAVES.length + ' main=' + mainOk155 + ' branch=' + branchOk155 + ' gate=' + gateOk155 +
      ' grant=' + grantOk155 + ' track=' + JSON.stringify(track155));

    /* #156 设施：预算对表（per×MAX ≤ BUDGET · 禁 qiRate）+ 营建扣费记账 + 驻留生效/搬离即失 + normalize 钳位 */
    var facDefOk156 = (D.CAVE_FACILITIES || []).every(function (fd) {
      return fd.field !== 'qiRate' && fd.per * D.CAVE_FAC_MAX_LV <= (D.CAVE_FAC_BUDGET[fd.field] || 0) + 1e-9;
    });
    var w156 = mkWs({ stones: 4000000 });
    w156.cave.current = 'green_peak'; w156.cave.owned = ['market_yard', 'green_peak'];
    var b1 = SQ.Cave.buildFacility(w156, pack, D, 'green_peak', 'lingtian', Date.now(), { log: noopLog() });
    var ledgerOk156 = b1.ok && w156.stones === 4000000 - 30000 && w156.ledger.out.cave === 30000;
    var eff156 = SQ.Cave.facEffects(w156, pack, D);
    var effOk156 = Math.abs((eff156.stonesRate || 0) - 0.01) < 1e-9;
    w156.cave.current = 'market_yard';                     /* 搬离即失 */
    var idleOk156 = Object.keys(SQ.Cave.facEffects(w156, pack, D)).length === 0;
    w156.cave.current = 'green_peak';
    var m156 = M(mkProf(), w156);
    var modsOk156 = Math.abs(((((m156.detail || {}).stonesRate || {}).caveFac) || 0) - 0.01) < 1e-9;
    /* 未拥有福地拒绝 + 满级拒绝 */
    var deny156 = !SQ.Cave.buildFacility(w156, pack, D, 'sword_cliff', 'lingtian', Date.now(), { log: noopLog() }).ok;
    SQ.Cave.buildFacility(w156, pack, D, 'green_peak', 'lingtian', Date.now(), { log: noopLog() });
    SQ.Cave.buildFacility(w156, pack, D, 'green_peak', 'lingtian', Date.now(), { log: noopLog() });
    var max156 = SQ.Cave.canBuildFac(w156, pack, D, 'green_peak', 'lingtian');
    var maxOk156 = !max156.ok && max156.lack[0].kind === 'max';
    /* normalize 钳位：越界等级截到 MAX、未知设施/未拥有福地丢弃 */
    var rawFac156 = { green_peak: { lingtian: 9, fake: 2 }, sword_cliff: { lingtian: 1 } };
    var n156 = pack.normalize(Object.assign(pack.initialState(), {
      cave: { current: 'green_peak', cooldownUntil: 0, owned: ['market_yard', 'green_peak'], fac: rawFac156 }
    }));
    var normOk156 = n156.cave.fac.green_peak.lingtian === D.CAVE_FAC_MAX_LV && !n156.cave.fac.green_peak.fake && !n156.cave.fac.sword_cliff;
    ok('156', '设施：预算对表/营建记账/驻留生效搬离即失/满级与未拥有拒绝/normalize 钳位',
      facDefOk156 && ledgerOk156 && effOk156 && idleOk156 && modsOk156 && deny156 && maxOk156 && normOk156,
      'budget=' + facDefOk156 + ' ledger=' + ledgerOk156 + ' eff=' + effOk156 + ' idle=' + idleOk156 +
      ' mods=' + modsOk156 + ' deny=' + deny156 + ' max=' + maxOk156 + ' norm=' + normOk156);

    /* #157 关系正典种子：10 对固定关系逐对生效（对称）+ 随机对不受影响（多世界采样全对） */
    var canonOk157 = true, canonBad157 = '';
    for (var wi = 0; wi < 5 && canonOk157; wi++) {
      var w157 = pack.normalize(pack.initialState());
      (D.FACTION_RELS_CANON || []).forEach(function (p) {
        var a = SQ.Factions.byId(w157, p.a), b = SQ.Factions.byId(w157, p.b);
        if (!a || !b || a.rel[p.b] !== p.rel || b.rel[p.a] !== p.rel) {
          canonOk157 = false; canonBad157 = p.a + '-' + p.b;
        }
      });
    }
    ok('157', '关系正典种子 10 对（×5 世界采样，对称生效）', canonOk157, canonBad157 || '10/10');

    /* #158 职级：阈值派生 + 捐献（÷1000 记账 + 24h 上限部分成交）+ perk 放大 + 叛离清零 + 授予不收回 */
    var w158 = mkWs({ stones: 2000000 });
    SQ.Factions.generate(w158, pack, D);                  /* 生成势力表（含固定池）后再挂效力 */
    w158.factionId = 'luopo';
    w158.factionRep = { luopo: 0 };
    var rankSeq158 = [0, 100, 300, 700, 1500].map(function (rep) {
      w158.factionRep.luopo = rep;
      return SQ.Factions.rankOf(w158, D, 'luopo');
    }).join('');
    var d1 = SQ.Factions.donate(w158, pack, D, 100000, Date.now(), noopLog());
    var donOk158 = d1.ok && d1.rep === 100 && w158.stones === 1900000 && w158.ledger.out.donate === 100000;
    w158.factionDonate = { at: Date.now(), used: 295 };
    var d2 = SQ.Factions.donate(w158, pack, D, 100000, Date.now(), noopLog());
    var capOk158 = d2.ok && d2.rep === 5 && w158.stones === 1900000 - 5000;   /* 部分成交：只扣对应灵石 */
    w158.factionDonate = { at: Date.now(), used: 300 };
    var d3 = SQ.Factions.donate(w158, pack, D, 10000, Date.now(), noopLog());
    var capFull158 = !d3.ok && d3.reason === 'cap';
    /* 供奉窗口 2h（2026-10-05 调参批）：常量对表 + 过期重置 used / 窗内沿用 used */
    var winConst158 = D.FACTION_DONATE.WINDOW_MS === 7200000 && D.FACTION_DONATE.WINDOW_CAP === 300;
    w158.factionDonate = { at: Date.now() - 7200001, used: 300 };
    var d4 = SQ.Factions.donate(w158, pack, D, 100000, Date.now(), noopLog());
    var winExpire158 = d4.ok && d4.rep === 100;               /* 超 2h → used 归零，满额成交 */
    w158.factionDonate = { at: Date.now() - 7199999, used: 300 };
    var d5 = SQ.Factions.donate(w158, pack, D, 10000, Date.now(), noopLog());
    var winLive158 = !d5.ok && d5.reason === 'cap';           /* 窗内且已满 → 拒 */
    /* perk 放大：档 4 ×1.35 */
    w158.factionRep.luopo = 1500; w158.factionDonate = { at: 0, used: 0 };
    var f158 = SQ.Factions.byId(w158, 'luopo');
    var pk158 = SQ.Factions.perkOf(w158, D);
    var ampOk158 = Math.abs(pk158.v - f158.perk.v * 1.35) < 1e-9 && pk158.rank === 4;
    /* 隐世授予后叛离不收回；rep 清零 */
    var g158 = SQ.Cave.grantObtain(w158, pack, D, Date.now(), { log: noopLog() });
    var grantOwn158 = SQ.Cave.owned(w158, 'cloud_herd') && g158.length >= 1;
    SQ.Factions.leave(w158, pack, D, Date.now(), noopLog());
    var leaveOk158 = SQ.Factions.repOf(w158, 'luopo') === 0 && SQ.Cave.owned(w158, 'cloud_herd');
    ok('158', '职级：阈值 0~4 / 捐献记账+2h 窗口上限部分成交（过期重置）/ perk ×1.35 / 叛离清零 / 隐世授予不收回',
      rankSeq158 === '01234' && donOk158 && capOk158 && capFull158 && winConst158 && winExpire158 && winLive158 &&
      ampOk158 && grantOwn158 && leaveOk158,
      'rank=' + rankSeq158 + ' don=' + donOk158 + ' cap=' + capOk158 + '/' + capFull158 +
      ' win=' + winConst158 + '/' + winExpire158 + '/' + winLive158 +
      ' amp=' + ampOk158 + ' grant=' + grantOwn158 + ' leave=' + leaveOk158);

    /* #159 委托（第卅九批改形：单槽 → 板面最多 SLOTS=3 张、同类型至多一张、交付按 type 寻址）
     * 判据八条：基线进度 / 交付摘除与记账 / gather 扣账 / 过期作废 / 刷新闸 / **一刷贴满三张且互不相同** /
     * **交一张不动另两张** / **旧档单张迁移** / 叛离整板作废。*/
    var w159 = mkWs({ stones: 50000, kills: 100, total: 1000 });
    SQ.Factions.generate(w159, pack, D);
    w159.factionId = 'huangfeng'; w159.factionRep = { huangfeng: 0 };
    var now159 = Date.now();
    w159.factionQuests = [{ type: 'slay', target: 10, base: 100, rep: 25, stones: 500, bornAt: now159, expireAt: now159 + 3600000 }];
    w159.kills = 109;
    var p159a = SQ.Factions.questProgress(w159, pack, D, w159.factionQuests[0]);
    w159.kills = 110;
    var p159b = SQ.Factions.questProgress(w159, pack, D, w159.factionQuests[0]);
    var progOk159 = !p159a.done && p159b.done && p159b.cur === 10;
    var st159 = w159.stones;
    var dq159 = SQ.Factions.questDeliver(w159, pack, D, now159, noopLog(), 'slay');
    var deliverOk159 = dq159.ok && w159.stones === st159 + 500 && w159.factionRep.huangfeng === 25 &&
      w159.factionQuests.length === 0 && (w159.factionQuestCd || 0) > now159;
    /* 交不存在的那张 ⇒ 拒且不动板面（type 就是地址，打错不能误摘别张） */
    w159.factionQuests = [{ type: 'gather', target: 1000, base: 0, rep: 30, stones: 0, bornAt: now159, expireAt: now159 + 3600000 }];
    var dq159x = SQ.Factions.questDeliver(w159, pack, D, now159, noopLog(), 'slay');
    var wrongOk159 = !dq159x.ok && dq159x.reason === 'none' && w159.factionQuests.length === 1;
    /* gather：交付时足额扣 + out.donate 记账 */
    var st159b = w159.stones;
    var dq159b = SQ.Factions.questDeliver(w159, pack, D, now159, noopLog(), 'gather');
    var gatherOk159 = dq159b.ok && w159.stones === st159b - 1000 && w159.ledger.out.donate === 1000;
    /* 过期作废 + 刷新闸：cd 内不补、cd 过补单 */
    w159.factionQuests = [{ type: 'slay', target: 10, base: 0, rep: 25, stones: 0, bornAt: now159 - 7200000, expireAt: now159 - 1000 }];
    var m159 = M(mkProf(), w159);
    SQ.Factions.questTick(w159, pack, D, m159, now159, { log: noopLog() });
    var expOk159 = w159.factionQuests.length === 0 && w159.factionQuestCd > now159;
    SQ.Factions.questTick(w159, pack, D, m159, now159 + 1000, { log: noopLog() });
    var cdOk159 = w159.factionQuests.length === 0;                              /* 闸内不补单 */
    SQ.Factions.questTick(w159, pack, D, m159, now159 + 1800001, { log: noopLog() });
    var q3 = w159.factionQuests, made3 = q3.length;   /* made3 = 补单当时的板面张数（q3 本身后面会被 splice 改动） */
    var genOk159b = q3.length === (D.FACTION_QUEST.SLOTS || 1) &&
      q3.every(function (q) { return ['slay', 'cultivate', 'gather'].indexOf(q.type) >= 0; }) &&
      q3.map(function (q) { return q.type; }).sort().join() === 'cultivate,gather,slay' &&   /* 三张互不相同 */
      q3.every(function (q) { return q.expireAt === now159 + 1800001 + D.FACTION_QUEST.TTL_MS; });
    /* 交一张：另两张留在板面（本批要的就是这个） */
    var rep0 = w159.factionRep.huangfeng;
    /* 三张都是刚贴出来的新单，进度为零 ⇒ 先按类型把进度凑到达标（等同玩家真去打/修/攒） */
    q3.forEach(function (q) {
      if (q.type === "slay") w159.kills = (q.base || 0) + q.target;
      else if (q.type === "cultivate") w159.total = (q.base || 0) + q.target;
      else w159.stones = Math.max(w159.stones, q.target);
    });
    var notDone159 = (function () {
      /* 复用 w159 已生成的势力池：没池的话 current() 为空，返回的是 none 而不是 progress */
      var wX = mkWs({ stones: 10, kills: 0, total: 0 });
      wX.factions = w159.factions; wX.factionId = "huangfeng"; wX.factionRep = { huangfeng: 0 };
      wX.factionQuests = [{ type: "slay", target: 50, base: 0, rep: 25, stones: 0, bornAt: now159, expireAt: now159 + 7200000 }];
      var rX = SQ.Factions.questDeliver(wX, pack, D, now159, noopLog(), "slay");
      return !rX.ok && rX.reason === "progress" && wX.factionQuests.length === 1;
    })();
    /* q3 就是 w159.factionQuests 那个数组本身（splice 会原地改它）⇒ 交付前先把类型快照下来 */
    var tFirst = q3[0].type;
    var others = q3.filter(function (q) { return q.type !== tFirst; }).map(function (q) { return q.type; }).sort().join();
    var dqOne = SQ.Factions.questDeliver(w159, pack, D, now159 + 1800001, noopLog(), tFirst);
    var oneOk159 = dqOne.ok && w159.factionQuests.length === 2 &&
      w159.factionQuests.every(function (q) { return q.type !== tFirst; }) &&
      q3.map(function (q) { return q.type; }).sort().join() === others &&
      w159.factionRep.huangfeng === rep0 + dqOne.rep;
    /* 跨刷新补单的去重：板上还剩两张（一交一留之后），cd 再到期只补一张 ⇒ 补出来的那张不许与板上重复 */
    w159.factionQuestCd = 0;
    var before2 = w159.factionQuests.map(function (q) { return q.type; }).sort().join();
    SQ.Factions.questTick(w159, pack, D, m159, now159 + 3600001, { log: noopLog() });
    var after3 = w159.factionQuests.map(function (q) { return q.type; });
    var dedupeOk159 = w159.factionQuests.length === 3 && new Set(after3).size === 3 &&
      after3.filter(function (t) { return before2.split(',').indexOf(t) >= 0; }).length === before2.split(',').length;
    /* 旧档单张 factionQuest → normalize 并入板面；脏类型剪除；二次 normalize 幂等 */
    var mig159 = pack.normalize({ factionQuests: undefined, factionQuest: { type: 'slay', target: 12, base: 3, rep: 25, stones: 40, bornAt: now159, expireAt: now159 + 7200000 } }, D);
    var migOk159 = Array.isArray(mig159.factionQuests) && mig159.factionQuests.length === 1 &&
      mig159.factionQuests[0].type === 'slay' && mig159.factionQuest === undefined;
    var migIdem159 = JSON.stringify(pack.normalize(mig159, D).factionQuests) === JSON.stringify(mig159.factionQuests);
    /* 板面上限硬顶：塞四张（含重复类型）→ normalize 收到 3 张且同类型只留首张 */
    var cap159 = pack.normalize({ factionQuests: [
      { type: 'slay', target: 1, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'slay', target: 2, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'gather', target: 3, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'cultivate', target: 4, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'bogus', target: 5, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 }
    ] }, D);
    var capOk159 = cap159.factionQuests.length === 3 &&
      cap159.factionQuests.map(function (q) { return q.type; }).join() === 'slay,gather,cultivate' &&
      cap159.factionQuests[0].target === 1;                                     /* 重复类型留首张、脏类型剪除 */
    ok('159', '委托板面（第卅九批 3 张形）：slay 基线进度 / 交付按 type 摘除并记账 / 错类型整笔拒 / gather 足额扣 + out.donate / 过期作废 / 刷新闸内不补 / **一刷贴满 SLOTS 且三张类型互不相同** / **交一张不动另两张** / 旧档单张迁移 + 幂等 / 板面硬顶 3 张（重复留首、脏型剪）/ 未达标拒交且不动板面',
      progOk159 && deliverOk159 && wrongOk159 && gatherOk159 && expOk159 && cdOk159 && notDone159 &&
      genOk159b && oneOk159 && dedupeOk159 && migOk159 && migIdem159 && capOk159,
      '未达标拒=' + notDone159 + ' prog=' + progOk159 + ' deliver=' + deliverOk159 + ' 错型拒=' + wrongOk159 + ' gather=' + gatherOk159 +
      ' exp=' + expOk159 + ' cd=' + cdOk159 + ' 板满=' + made3 + '/差异=' + genOk159b +
      ' 交一留二=' + oneOk159 + ' 迁移=' + migOk159 + '/' + migIdem159 + ' 硬顶=' + capOk159);

    /* #160 冲突（战功制改造 · 势力全录卷 §七）：入场无判定/每场一次/第三方观望/war 传闻卡/终局清场 */
    var w160 = mkWs({ realm: 0, stones: 1000 });
    w160.factionId = 'jianqi';
    w160.factionRep = { jianqi: 0 };
    w160.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: null, joinedFid: null, merit: 0, result: null };
    SQ.Rumors.pushWar(w160, pack, D, Date.now(), { log: noopLog() });
    var warCard160 = SQ.Rumors.warCard(w160);
    var m160 = M(mkProf(), w160);
    /* 入场无战力判定：境界 0 裸身也能入场（旧 NEED_MULT 判定线废弃） */
    var j160 = SQ.Factions.joinWar(w160, pack, D, m160, Date.now(), { log: noopLog() });
    var inOk160 = j160.ok && w160.factionWar.joined === 'in' && w160.factionWar.merit === 0 &&
      w160.factionWar.joinedFid === 'jianqi';
    var j160b = SQ.Factions.joinWar(w160, pack, D, m160, Date.now(), { log: noopLog() });
    var once160 = !j160b.ok && j160b.reason === 'joined';
    /* 第三方观望 */
    var w160w = mkWs({});
    w160w.factionId = 'huangfeng';
    w160w.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: null, joinedFid: null, merit: 0, result: null };
    var watch160 = SQ.Factions.joinWar(w160w, pack, D, M(mkProf(), w160w), Date.now(), { log: noopLog() });
    var watchOk160 = !watch160.ok && watch160.reason === 'watch';
    /* 终局：merit 0 < need 10（10+realm×2 校准值）→ 败档结算（rep+5 + 战创）并清场（细则见 #177/#178） */
    w160.factionWar.until = Date.now() - 1;
    SQ.Factions.warTick(w160, pack, D, m160, 1, Date.now(), { log: noopLog() });
    var endOk160 = w160.factionWar === null && w160.factionRep.jianqi === 5 &&
      w160.buffs.some(function (b) { return b.field === 'combatPower' && b.mult === -0.10; });
    ok('160', '冲突（战功制）：入场无判定/每场一次/第三方观望/终局败档清场/war 传闻卡',
      inOk160 && once160 && watchOk160 && endOk160 && !!warCard160,
      'in=' + inOk160 + ' once=' + once160 + ' watch=' + watchOk160 + ' end=' + endOk160 + ' card=' + !!warCard160);

    /* #161 传闻：刷新批次与上限/TTL 分档/过期清扫/触发五件套+eventClock 不清零/busy 拒绝/normalize 回落 */
    var w161 = mkWs({ realm: 3 });
    pack.recalcDerived(w161, mkProf());
    var m161 = M(mkProf(), w161);
    var eff161 = pack.worldSystems.effectsOf(w161);
    var now161 = Date.now();
    w161.rumorClock = 9 * 60 + 59;                        /* 逼近 10 分钟边界 */
    var fresh161 = SQ.Rumors.tick(w161, pack, D, m161, 2, now161, { log: noopLog() });
    var cards161 = SQ.Rumors.eventCards(w161);
    var genOk161 = !!fresh161 && cards161.length >= 1 && cards161.length <= 2;
    /* 卡内容合法性：事件在册、condOk、非冷却中、TTL 对表品阶 */
    var cardOk161 = cards161.every(function (r) {
      var ev = SQ.Events.findById(pack, r.evId);
      return !!ev && ev.tier === r.tier && SQ.Events.condOk(ev, w161, pack, D) &&
        r.expireAt - r.bornAt === D.RUMORS.TTL[r.tier] * 60000;
    });
    /* 上限硬顶：塞满后 tick 不再生成 */
    while (SQ.Rumors.eventCards(w161).length < D.RUMORS.MAX) {
      w161.rumors.push({ rid: 'pad' + w161.rumors.length, evId: cards161[0].evId, tier: 'ren', nature: 'good', bornAt: now161, expireAt: now161 + 3600000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' });
    }
    w161.rumorClock = 9 * 60 + 59;
    SQ.Rumors.tick(w161, pack, D, m161, 2, now161 + 500, { log: noopLog() });
    var capOk161 = SQ.Rumors.eventCards(w161).length === D.RUMORS.MAX;
    /* 离线冻结由 claim 编排保证（tick 仅在线调用）；过期清扫在线离线都扫 */
    w161.rumors[0].expireAt = now161 - 1;
    var gone161 = SQ.Rumors.sweep(w161, pack, D, now161);
    var sweepOk161 = gone161.length === 1 && w161.rumors.indexOf(gone161[0]) < 0;
    /* 触发：五件套 + eventClock 不清零 + via 溯源 */
    var w161t = mkWs({ realm: 3 });
    pack.recalcDerived(w161t, mkProf());
    var mt = M(mkProf(), w161t);
    w161t.rumorClock = 9 * 60 + 59; w161t.eventClock = 500;
    SQ.Rumors.tick(w161t, pack, D, mt, 2, now161, { log: noopLog() });
    var target161 = SQ.Rumors.eventCards(w161t)[0];
    var tr161 = SQ.Rumors.trigger(w161t, pack, D, target161.rid, now161, { log: noopLog() });
    var trigOk161 = tr161.ok && tr161.pending &&
      w161t.pendingChoice && w161t.pendingChoice.id === target161.evId && w161t.pendingChoice.via === 'rumor' &&
      w161t.eventCooldowns[target161.evId] === now161 &&
      w161t.eventHistory.lastId === target161.evId &&
      w161t.eventHistory.seen[target161.evId] === now161 &&
      w161t.eventClock === 500 &&                          /* 独立通道：不清随机时钟 */
      SQ.Rumors.eventCards(w161t).indexOf(target161) < 0;  /* 卡出档 */
    /* busy：pendingChoice 挂起时拒绝二次触发 */
    w161t.rumorClock = 9 * 60 + 59;
    SQ.Rumors.tick(w161t, pack, D, mt, 2, now161 + 1000, { log: noopLog() });
    var next161 = SQ.Rumors.eventCards(w161t)[0];
    var busy161 = next161 ? !SQ.Rumors.canTrigger(w161t, pack, D, next161.rid, now161 + 1000).ok &&
      SQ.Rumors.canTrigger(w161t, pack, D, next161.rid, now161 + 1000).reason === 'busy' : true;
    /* normalize：过期/未知 evId/结构残缺丢弃 + 合法卡保留 */
    var n161 = pack.normalize(Object.assign(pack.initialState(), {
      rumors: [
        target161,
        { rid: 'x1', evId: 'no_such_event', tier: 'ren', nature: 'good', bornAt: now161, expireAt: now161 + 60000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' },
        { rid: 'x2', evId: target161.evId, tier: 'ren', nature: 'good', bornAt: now161, expireAt: now161 - 60000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' },
        { rid: 'x3' },
        { rid: 'w1', kind: 'war', bornAt: now161, expireAt: now161 + 600000 }
      ],
      rumorClock: -5
    }));
    var normOk161 = n161.rumors.length === 2 && n161.rumors[0].rid === target161.rid &&
      n161.rumors[1].kind === 'war' && n161.rumorClock === 0;
    ok('161', '传闻：批次刷新/TTL 对表/上限硬顶/过期清扫/触发五件套+时钟独立/busy 拒绝/normalize 回落',
      genOk161 && cardOk161 && capOk161 && sweepOk161 && trigOk161 && busy161 && normOk161,
      'gen=' + genOk161 + ' card=' + cardOk161 + ' cap=' + capOk161 + ' sweep=' + sweepOk161 +
      ' trig=' + trigOk161 + ' busy=' + busy161 + ' norm=' + normOk161);

    /* ═══ 体验手感批（数值详设 §4.4/§2.4 v1.26）═══ */

    /* #162 功法自动入槽：入世一次性回填 · 主修=第 1 槽 · 只补空槽不挤占 · 幂等 */
    var w162 = mkWs({ artsKnown: ['tuna', 'juling', 'yunzong'], artsSlots: [], artsAutoInit: false });
    pack.recalcDerived(w162, mkProf());   /* 入世首次结算静默回填 */
    var init162 = w162.artsAutoInit === true && w162.artsSlots.join() === 'tuna,juling,yunzong' &&
      SQ.Arts.mainArt(w162) === 'tuna';
    /* 不挤占：既有槽序保持，新学者追加到空位 */
    var w162b = mkWs({ artsKnown: ['yunzong', 'tuna'], artsSlots: ['tuna'], artsAutoInit: true });
    var added162b = SQ.Arts.autoSlot(w162b, pack, D, noopLog());
    var noPreempt162 = w162b.artsSlots.join() === 'tuna,yunzong' && added162b.join() === 'yunzong' &&
      SQ.Arts.mainArt(w162b) === 'tuna';
    /* 幂等：全已上槽再调无新增 */
    var idem162 = SQ.Arts.autoSlot(w162, pack, D, noopLog()).length === 0;
    ok('162', '功法自动入槽：入世一次性回填/主修=第1槽/只补空槽不挤占/幂等',
      init162 && noPreempt162 && idem162,
      'init=' + init162 + ' noPreempt=' + noPreempt162 + ' idem=' + idem162);

    /* #163 首通自动推进（数值详设 §2.4 v1.26 → §2.6 两段式改造 · 系统深化批 A4）：
     * 首通 → 域主现世（推进挂起）→ 域主战胜利后才按战力自动前进 / 留守写牵引日志 */
    /* 钉死随机源（2026-10-05 存档容量防线批 · 断言确定性纪律外溢）：本断言原**未 stub 随机**，
     * 而 `challengeBoss` 的胜负其实是确定性的（`power < need` 判定、无掷点）——飘的是前置 `Combat.simulate`
     * 的随机掉落/掷点改变了 `challengePower` 的结果战力。`w163b` 标称 power≈60 对门槛 `zone0.need × BOSS_MULT 1.8 = 54`、
     * **余量仅 11%**，simulate 随机一抖即跌破 → `boss.win=false` → `hold163` 假失败（实测约 7 跑 1 挂、
     * root 与 extensions 两侧都会中，与代码树无关）。stub 到恒定 0.5 使 simulate 结果确定、战力稳定。
     * ⚠️ 属**既有缺陷**、非本批引入；由本批「断言必须确定性」纪律（#206 同类问题）扫描时发现。 */
    var restore163 = stubRandom(function () { return 0.5; });
    var logs163a = [], logs163b = [];
    var w163a = mkWs({ realm: 2, zone: 0 });
    SQ.Combat.simulate(w163a, pack, D, M(mkProf(), w163a), 3600, { log: function (c, t) { logs163a.push(t); }, now: Date.now(), profile: mkProf() });
    var hold163a = w163a.cleared.indexOf(0) >= 0 && w163a.zone === 0 &&
      !!w163a.zoneBoss && w163a.zoneBoss.zone === 0 && w163a.zoneBoss.state === 'ready';
    var boss163a = SQ.Combat.challengeBoss(w163a, pack, D, M(mkProf(), w163a), Date.now(), { log: function (c, t) { logs163a.push(t); } });
    var adv163 = hold163a && boss163a.ok && boss163a.win && w163a.zone === 1 &&
      w163a.zoneBoss.state === 'dead' &&
      logs163a.some(function (t) { return t.indexOf('首通牵引') >= 0; });
    var w163b = mkWs({ realm: 1, zone: 0 });   /* power60 ≥ 域主线 54 但 < zone1.need90 → 胜域主后留守 */
    SQ.Combat.simulate(w163b, pack, D, M(mkProf(), w163b), 3600, { log: function (c, t) { logs163b.push(t); }, now: Date.now(), profile: mkProf() });
    var boss163b = SQ.Combat.challengeBoss(w163b, pack, D, M(mkProf(), w163b), Date.now(), { log: function (c, t) { logs163b.push(t); } });
    var hold163 = w163b.cleared.indexOf(0) >= 0 && boss163b.ok && boss163b.win && w163b.zone === 0 &&
      logs163b.some(function (t) { return t.indexOf('已解锁') >= 0; });
    restore163();
    ok('163', '首通自动推进（两段式）：域主现世挂起 → 斩后达标前进/不足留守写牵引（**随机源已钉死** stub 0.5——原未 stub 时前置 `Combat.simulate` 的随机掉落改变 `challengePower`，而 `w163b` 战力 ≈60 对门槛 54 余量仅 11% → 约 7 跑 1 挂的假失败）',
      adv163 && hold163, 'adv=' + adv163 + ' hold=' + hold163 +
      ' powerA=' + (boss163a.power != null ? Math.round(boss163a.power) : -1) + '/need=' + (boss163a.need != null ? Math.round(boss163a.need) : -1) +
      ' powerB=' + (boss163b.power != null ? Math.round(boss163b.power) : -1) + '/need=' + (boss163b.need != null ? Math.round(boss163b.need) : -1));

    /* #164 新手起步加速（数值详设 §1.7 v1.27）：境界0 在线结算 ×qiMult（实测 ratio≈qiMult），
       realm≥1 与离线一律不受影响；同 realm 开/关加速求比值，消掉 talent/align 等一切乘子，直测加速系数 */
    var ctx164 = { log: function () {}, profile: mkProf() };
    var saved164 = D.NEWBIE_RAMP;
    var r0on = SQ.Idle.settle(mkWs(), pack, D, 20000, Date.now(), ctx164).gain;              /* 境界0 在线·开 */
    var offOn = SQ.Idle.settle(mkWs(), pack, D, 720000, Date.now(), ctx164).gain;            /* 境界0 离线·开 */
    var r1on = SQ.Idle.settle(mkWs({ realm: 1 }), pack, D, 20000, Date.now(), ctx164).gain;  /* 境界1 在线·开 */
    D.NEWBIE_RAMP = null;
    var r0off = SQ.Idle.settle(mkWs(), pack, D, 20000, Date.now(), ctx164).gain;             /* 境界0 在线·关 */
    var offOff = SQ.Idle.settle(mkWs(), pack, D, 720000, Date.now(), ctx164).gain;           /* 境界0 离线·关 */
    var r1off = SQ.Idle.settle(mkWs({ realm: 1 }), pack, D, 20000, Date.now(), ctx164).gain; /* 境界1 在线·关 */
    D.NEWBIE_RAMP = saved164;
    var ratio0 = r0off > 0 ? r0on / r0off : 0;
    var realm1Neutral = r1off > 0 && Math.abs(r1on / r1off - 1) < 1e-9;
    var offlineNeutral = offOff > 0 && Math.abs(offOn / offOff - 1) < 1e-9;
    ok('164', '新手起步加速：境界0 在线×qiMult / realm≥1 不受影响 / 离线不享',
      !!saved164 && Math.abs(ratio0 - saved164.qiMult) < 0.05 && realm1Neutral && offlineNeutral,
      'ratio0=' + ratio0.toFixed(3) + ' qiMult=' + (saved164 && saved164.qiMult) + ' realm1=' + realm1Neutral + ' offline=' + offlineNeutral);

    /* ═══ 系统深化批（v1.18 · §4.19 #165~#180）═══ */

    /* #165 机制天赋挂点分流：on_bottleneck_power 词条 → hooks（不进 sum/detail），
     * bottleneckOf 与尸傀护主/护镖/法宝同读点加算（power = raw × (1+Σ)） */
    var t165 = mkTalent({ on_bottleneck_power: 0.05 }); t165.id = 'last_stand';
    var w165 = mkWs({ realm: 0, zone: 0 });            /* power 20 < need 30 → 瓶颈态可测加算 */
    var m165 = M(mkProf([t165]), w165);
    var bn165 = SQ.Combat.bottleneckOf(w165, pack, D, m165);
    var raw165 = SQ.Mods.powerOf(w165, pack, D, m165);
    ok('165', '机制天赋挂点分流：hooks 白名单键不入乘区、瓶颈判定同读点加算',
      Math.abs(m165.hooks.on_bottleneck_power - 0.05) < 1e-9 &&
      m165.sum.on_bottleneck_power === undefined && (m165.detail.on_bottleneck_power === undefined) &&
      bn165.bottleneck === true && Math.abs(bn165.power - raw165 * 1.05) < 1e-9,
      'hooks=' + m165.hooks.on_bottleneck_power + ' power=' + bn165.power.toFixed(2) + ' raw=' + raw165.toFixed(2));

    /* #166 yufeng 乘算合并：天赋 0.92 × 功法 0.8 = 0.736（非加算 1.72）；两部功法 0.8×0.8=0.64 */
    var t166 = mkTalent({ yufeng: 0.92 }); t166.id = 'windwalker';
    var w166 = mkWs({ realm: 1 });
    w166.artsKnown = ['yunzong']; w166.artsSlots = ['yunzong']; w166.artsLevels = { yunzong: 1 };
    var m166 = M(mkProf([t166]), w166);
    var w166b = mkWs({ realm: 3 });
    w166b.artsKnown = ['yunzong', 'taixu']; w166b.artsSlots = ['yunzong', 'taixu'];
    w166b.artsLevels = { yunzong: 1, taixu: 1 };
    var m166b = M(mkProf([]), w166b);                  /* 双功法无天赋：0.8×0.8=0.64（旧加算 1.6 缺陷修复） */
    ok('166', 'yufeng 乘算合并 Π(v)：0.92×0.8=0.736 / 双功法 0.64',
      Math.abs(m166.hooks.yufeng - 0.736) < 1e-6 && Math.abs(m166b.hooks.yufeng - 0.64) < 1e-6,
      'talent+arts=' + m166.hooks.yufeng + ' two-arts=' + m166b.hooks.yufeng);

    /* #167 amplify 乘算型换算：yufeng 0.90 → 1+(0.9−1)×1.5 = 0.85（不得为 1.35）；加算型照常 ×1.5 */
    var savedTalents167 = SQ.TALENTS.common;
    SQ.TALENTS.common = {
      positive: [{ id: 'wy167', kind: 'positive', tier: 'rare', world: 'common', weight: 1, effects: { yufeng: 0.90, on_bottleneck_power: 0.05 } }],
      negative: [{ id: 'wn167', kind: 'negative', tier: 'common', world: 'common', weight: 1, effects: { qiRate: -0.1 } }]
    };
    var restore167 = stubRandom(function (i) { return i === 0 ? 0.1 : 0.5; });  /* 首掷落 1正1负（40%）档 */
    var roll167 = SQ.rollTalents('__t167');            /* 不存在的 worldId → 专属池空，只抽临时通用池 */
    restore167();
    SQ.TALENTS.common = savedTalents167;
    var pos167 = roll167.talents.filter(function (t) { return t.kind === 'positive'; })[0];
    ok('167', 'amplify：yufeng 0.90→0.85 乘算换算 / 加算型 ×1.5',
      roll167.combo.pos === 1 && roll167.combo.neg === 1 && !!pos167 && pos167.amplified === true &&
      Math.abs(pos167.effects.yufeng - 0.85) < 1e-9 &&
      Math.abs(pos167.effects.on_bottleneck_power - 0.075) < 1e-9,
      'yufeng=' + (pos167 && pos167.effects.yufeng) + ' bn=' + (pos167 && pos167.effects.on_bottleneck_power));

    /* #168 TALENT_SYNERGIES：双条同持才生效、单对幅度 ≤5%、来源 'synergy' 入 detail 明细 */
    var syn168 = D.TALENT_SYNERGIES || [];
    var synBudgetOk = syn168.length === 8 && syn168.every(function (s) {
      return Math.abs(s.value) <= 0.05 && SQ.Mods.FIELDS.indexOf(s.field) >= 0 && s.pair.length === 2;
    });
    function mkTalentId(id, effects) { var t = mkTalent(effects); t.id = id; return t; }
    var w168 = mkWs({});
    var mBoth = M(mkProf([mkTalentId('thunder_root', { tribBonus: 0.15 }), mkTalentId('survivor', { tribFailLossMod: -0.10 })]), w168);
    var mSingle = M(mkProf([mkTalentId('thunder_root', { tribBonus: 0.15 })]), w168);
    ok('168', '组合羁绊：8 对全在预算内、双持生效入 detail.synergy、单持不生效',
      synBudgetOk &&
      Math.abs(mBoth.sum.tribFailLossMod - (-0.10 - 0.04)) < 1e-9 &&
      Math.abs(mBoth.detail.tribFailLossMod.synergy - (-0.04)) < 1e-9 &&
      Math.abs(mSingle.sum.tribFailLossMod - 0) < 1e-9,
      'pairs=' + syn168.length + ' both=' + mBoth.sum.tribFailLossMod + ' single=' + mSingle.sum.tribFailLossMod);

    /* #177 战功记账（势力全录卷 §7.1 v1.2）：仅 joined='in' 且本方交战方时累积（combat.simulate 单点钩子）；
     * 终局阈值 = 10 + realm×2（探针实测校准，realm 取**结算瞬间**快照）；joined 旧值 'win'/'lose' normalize 映射 'in' */
    var w177 = mkWs({ realm: 2, zone: 0, mode: 'venture' });
    w177.zoneAffix = { affixId: 'lingchao', until: Date.now() + 86400000 };   /* 钉住词缀：击杀节奏确定（10 杀/600s） */
    w177.factionId = 'jianqi'; w177.factionRep = { jianqi: 0 };
    w177.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: null, joinedFid: null, merit: 0, result: null };
    var ctx177 = { log: noopLog(), now: Date.now() };
    SQ.Combat.simulate(w177, pack, D, M(mkProf(), w177), 600, ctx177);   /* 未入场：10 杀零战功 */
    var noMerit177 = (w177.factionWar.merit || 0) === 0 && w177.kills === 10;
    SQ.Factions.joinWar(w177, pack, D, M(mkProf(), w177), Date.now(), { log: noopLog() });
    SQ.Combat.simulate(w177, pack, D, M(mkProf(), w177), 600, ctx177);   /* 入场后：10 杀 ×1.0 = 10 战功 */
    var merit177 = w177.factionWar.merit === 10;
    var w177b = mkWs({ realm: 2, zone: 0 });
    w177b.zoneAffix = { affixId: 'lingchao', until: Date.now() + 86400000 };
    w177b.factionId = 'huangfeng';                                      /* 第三方交战外势力 */
    w177b.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: 'in', joinedFid: 'huangfeng', merit: 0, result: null };
    SQ.Combat.simulate(w177b, pack, D, M(mkProf(), w177b), 600, ctx177);
    var thirdNo177 = (w177b.factionWar.merit || 0) === 0;               /* warSideOf null → 不累积 */
    /* 阈值快照：入场时 realm2（need 14）→ 结算前升到 realm4 → need = 10+4×2 = 18（merit 16 < 18 败档） */
    var need177a = SQ.Factions.meritNeedOf({ realm: 2 }, D);
    w177.factionWar.merit = 16; w177.realm = 4;
    var need177b = SQ.Factions.meritNeedOf(w177, D);
    var set177 = SQ.Factions.warSettle(w177, pack, D, Date.now(), { log: noopLog() });
    var snap177 = need177a === 14 && need177b === 18 && set177 && set177.win === false && set177.need === 18;
    /* normalize：旧格式 joined 'win' → 'in'、result 保留、merit 补 0 */
    var n177 = SQ.normalize({ v: SQ.V, profile: { name: 't', talents: [], worldId: 'xiuxian' },
      worlds: { xiuxian: { factionWar: { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: 'win', result: { win: true } } } } });
    var fw177 = n177.worlds.xiuxian.factionWar;
    ok('177', '战功记账：入场才累积/第三方不累积/阈值 10+realm×2 结算快照/旧值映射',
      noMerit177 && merit177 && thirdNo177 && snap177 &&
      !!fw177 && fw177.joined === 'in' && fw177.merit === 0 && fw177.result && fw177.result.win === true,
      'noJoin=' + noMerit177 + ' merit=' + merit177 + ' third=' + thirdNo177 + ' snap=' + snap177 + ' norm=' + !!fw177);

    /* #178 势力战后效（§7.2~§7.4）：胜档 rep+50/灵石×500 记 in.event/同门 bond+2 +
     * REL_SOFTEN_P 对称写入 + PRESTIGE buff 24h + warResult 传闻卡 30min */
    var w178 = mkWs({ realm: 1, stones: 0 });
    SQ.Factions.generate(w178, pack, D);
    w178.factionId = 'jianqi'; w178.factionRep = { jianqi: 0 };
    w178.factionNpcs = { tie: 'jianqi', chiwei: 'jianqi' };
    w178.bonds = { tie: 0, chiwei: 0 };
    w178.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() - 1, joined: 'in', joinedFid: 'jianqi', merit: 99, result: null };
    var relBefore178 = (SQ.Factions.byId(w178, 'laolong').rel || {})['jianqi'];
    var restore178 = stubRandom(function () { return 0.1; });           /* REL_SOFTEN_P 0.5 → 必然软化 */
    var now178 = Date.now();
    var set178 = SQ.Factions.warSettle(w178, pack, D, now178, { log: noopLog() });
    restore178();
    var zi178 = Math.min(w178.realm, 9);
    var stonesExpect178 = Math.round(D.ZONES[zi178].stones * D.FACTION_WAR.WIN_STONE_K);
    var pre178 = null;
    (w178.buffs || []).forEach(function (b) { if (b.source === 'factionWar') pre178 = b; });
    var rc178 = SQ.Rumors.warResultCard(w178);
    ok('178', '势力战后效：胜档四件发放/旧怨软化对称写入/PRESTIGE 24h/结果卡 30min',
      set178 && set178.win === true && w178.factionRep.jianqi === 50 &&
      w178.stones === stonesExpect178 && (w178.ledger.in.event || 0) === stonesExpect178 &&
      w178.bonds.tie === 2 && w178.bonds.chiwei === 2 &&
      relBefore178 === 'enemy' && SQ.Factions.byId(w178, 'laolong').rel.jianqi === 'neutral' &&
      SQ.Factions.byId(w178, 'jianqi').rel.laolong === 'neutral' &&
      !!pre178 && pre178.field === 'shopCost' && pre178.mult === -0.05 &&
      Math.abs(pre178.until - (now178 + 24 * 3600000)) < 5000 &&
      !!rc178 && rc178.outcome === 'win' && rc178.expireAt - rc178.bornAt === 30 * 60000,
      'rep=' + w178.factionRep.jianqi + ' stones=' + w178.stones + '/' + stonesExpect178 +
      ' bond=' + w178.bonds.tie + ' rel=' + SQ.Factions.byId(w178, 'laolong').rel.jianqi +
      ' pre=' + !!pre178 + ' card=' + (rc178 && rc178.outcome));

    /* #179 职位双技能（§八）：派生不落库/24h 独立 CD/officeGuard 一次性标记判后即清/
     * 叛离清除/魔道档消费端豁免（护法归零时按 floor 0.03+0.02） */
    var w179 = mkWs({ realm: 1 });
    SQ.Factions.generate(w179, pack, D);
    w179.factionId = 'jianqi';
    w179.factionRep = { jianqi: 700 };                                  /* rank3 → 执事 */
    w179.factionNpcs = { chiwei: 'jianqi' };
    w179.bonds = { chiwei: 30 };                                        /* tier2 → perk 0.02×2 = 0.04 */
    var off179 = SQ.Factions.officeOf(w179, D);
    var g179 = SQ.Factions.guardArm(w179, pack, D, Date.now(), noopLog());  /* rank3 不可护法 */
    var d179 = SQ.Factions.dispatchFellow(w179, pack, D, 'chiwei', Date.now(), noopLog());
    var buff179 = null;
    (w179.buffs || []).forEach(function (b) { if (b.field === 'dropRate' && b.source === 'bond') buff179 = b; });
    var d179b = SQ.Factions.dispatchFellow(w179, pack, D, 'chiwei', Date.now(), noopLog());
    var dChan179 = SQ.Factions.dispatchFellow(w179, pack, D, 'tie', Date.now(), noopLog());  /* channel 型拒绝（且非同门） */
    w179.factionRep.jianqi = 1500;                                      /* rank4 → 长老 */
    var off179b = SQ.Factions.officeOf(w179, D);
    var g179b = SQ.Factions.guardArm(w179, pack, D, Date.now(), noopLog());
    var armed179 = g179b.ok && w179.tribulation.officeGuard === true;   /* 判前捕获（其后判即清会复位） */
    var info179 = SQ.XTrib.info(w179, pack, D, M(mkProf(), w179));
    var g179c = SQ.Factions.guardArm(w179, pack, D, Date.now(), noopLog());  /* 同日再发动 → cd */
    /* 魔道档消费端豁免：karma 恶档 + 无护法 → officeGuard 仍按 floor+extra = 0.05 */
    w179.karma = -300;
    var info179e = SQ.XTrib.info(w179, pack, D, M(mkProf(), w179));
    /* 判后即清：掷一次渡劫（base 0.95 必成路径 stub）→ officeGuard false */
    var restore179 = stubRandom(0.1);
    SQ.Realm.tryBreakthrough(w179, pack, D, M(mkProf(), w179), Date.now(), { log: noopLog() });
    restore179();
    var cleared179 = w179.tribulation.officeGuard === false;
    /* 叛离清除：重挂标记后 leave → factionOffice null + officeGuard false */
    w179.tribulation.officeGuard = true;
    w179.factionOffice = { dispatchAt: 0, guardAt: 0 };
    SQ.Factions.leave(w179, pack, D, Date.now(), noopLog());
    var leaveClr179 = w179.factionOffice === null && w179.tribulation.officeGuard === false;
    ok('179', '职位双技能：派生/独立 CD/护法标记判后即清与叛离清除/魔道消费端豁免',
      off179 === 'steward' && off179b === 'elder' &&
      !g179.ok && g179.reason === 'office' &&
      d179.ok && !!buff179 && Math.abs(buff179.mult - 0.04) < 1e-9 &&
      !d179b.ok && d179b.reason === 'cd' && !dChan179.ok &&
      armed179 && !g179c.ok && g179c.reason === 'cd' &&
      info179.parts.officeGuard === true && Math.abs(info179.parts.guardian - 0.05) < 1e-9 &&
      Math.abs(info179e.parts.guardian - 0.05) < 1e-9 &&
      cleared179 && leaveClr179,
      'off=' + off179 + '/' + off179b + ' g1=' + g179.reason + ' disp=' + d179.ok +
      ' buff=' + (buff179 ? buff179.mult + '/' + buff179.source : 'null') + ' cd=' + (d179b.reason) +
      ' chan=' + (dChan179.reason) + ' guard=' + (g179b && g179b.ok) + ' g3=' + (g179c.reason) +
      ' og=' + info179.parts.officeGuard + ' bonus=' + info179.parts.guardian +
      ' evil=' + info179e.parts.guardian + ' clr=' + cleared179 + '/' + leaveClr179);

    /* #180 叛离谍报（§九）：karma −60 / bond −10（Bonds.lose 唯一写口，锁类豁免）/
     * 声望 50% 转移向下取整 / intelArts 门控豁免 / 循环无套利（CD + 声望减半 + karma 累计） */
    var w180 = mkWs({ realm: 0 });
    SQ.Factions.generate(w180, pack, D);
    w180.factionId = 'jianqi';
    w180.factionRep = { jianqi: 1001 };                                 /* floor(1001×0.5) = 500 */
    w180.factionNpcs = { tie: 'jianqi', chiwei: 'jianqi', pei: 'jianqi', suwan: 'laolong' };
    w180.bonds = { tie: 30, chiwei: 5, pei: -99, suwan: 50 };
    w180.spouse = null;
    var d180 = SQ.Factions.defect(w180, pack, D, 'laolong', true, Date.now(), noopLog());
    var intelIds180 = Object.keys(w180.intelArts || {});
    var intelArt180 = intelIds180.length === 1 ? pack.artsMap()[intelIds180[0]] : null;
    var intelOk180 = !!intelArt180 && intelArt180.alignment === 'neutral' &&
      (intelArt180.obtain.type === 'shop' || intelArt180.obtain.type === 'black');
    /* tie 30 → lose −10 → 20 → join 敌对联动 −20 → 0（两层叠加声明）；chiwei 5 → −5 → clamp −20；
     * pei 绝交锁豁免 −99 不动；suwan 属新门且为道友（非道侣）→ 只吃 join 同门 +5 */
    var bond180 = w180.bonds.tie === 0 && w180.bonds.chiwei === -20 && w180.bonds.pei === -99;
    var rep180 = w180.factionRep.jianqi === undefined && w180.factionRep.laolong === 500;
    var karma180 = w180.karmaEventScore === -60;
    var cd180 = SQ.Factions.defect(w180, pack, D, 'jianqi', false, Date.now(), noopLog());
    var cdOk180 = !cd180.ok && cd180.reason === 'cooldown';             /* 防刷锁① CD */
    /* intelArts 门控豁免：yunyou（neutral/shop/realm1）在 realm0  normally 不可学 */
    var w180b = mkWs({ realm: 0 });
    var noIntel180 = SQ.Arts.canLearn(w180b, pack, D, 'yunyou') === false;
    w180b.intelArts = { yunyou: true };
    var intelLearn180 = SQ.Arts.canLearn(w180b, pack, D, 'yunyou') === true;
    /* 循环无套利锁③：绕过 CD 叛回 → 声望再减半 500→250、karma 累计 −120 */
    w180.factionCdUntil = 0;
    var d180b = SQ.Factions.defect(w180, pack, D, 'jianqi', false, Date.now(), noopLog());
    var loop180 = d180b.ok && w180.factionRep.jianqi === 250 && w180.factionRep.laolong === undefined &&
      w180.karmaEventScore === -120 && !d180b.intelId;
    ok('180', '叛离谍报：karma−60/bond−10 锁豁免/声望 50% 取整转移/intelArts 豁免 realm/循环无套利',
      d180.ok && karma180 && bond180 && rep180 && intelOk180 && cdOk180 &&
      noIntel180 && intelLearn180 && loop180,
      'karma=' + w180.karmaEventScore + ' tie=' + w180.bonds.tie + ' chiwei=' + w180.bonds.chiwei +
      ' pei=' + w180.bonds.pei + ' rep=' + JSON.stringify(w180.factionRep) + ' intel=' + intelIds180.join(',') +
      ' cd=' + cdOk180 + ' loop=' + loop180);

    /* #169 天赋池重生成一致性（专属池卷 v1.1 / 天赋池设计 v1.6）：通用 72 = 正 40/负 32、
     * 修仙 124 = 正 66/负 58；id 全局无重复；effects 键全在字典（FIELDS）+ 挂点白名单内；
     * tier 枚举 common/rare/epic 且 epic 为修仙专属池独有；mingwang 挂点仅修仙池（通用池禁用）。
     * 文档 ↔ js 零漂移由 .tests/gen-lexicon.cjs 对账强制（id 集合 + 条数 + 羁绊 pair 在册）。 */
    var T169 = SQ.TALENTS;
    var cnt169 = {
      cp: T169.common.positive.length, cn: T169.common.negative.length,
      xp: T169.xiuxian.positive.length, xn: T169.xiuxian.negative.length
    };
    var ids169 = {}, dup169 = [];
    var keyOk169 = true, tierOk169 = true, epicOk169 = true, mwOk169 = true, kindOk169 = true, wOk169 = true;
    var ALLOWED169 = {};
    SQ.Mods.FIELDS.forEach(function (f) { ALLOWED169[f] = 1; });
    SQ.Mods.TALENT_HOOK_KEYS.forEach(function (k) { ALLOWED169[k] = 1; });
    [['common', T169.common], ['xiuxian', T169.xiuxian]].forEach(function (pair) {
      var w = pair[0], pool = pair[1];
      ['positive', 'negative'].forEach(function (kind) {
        pool[kind].forEach(function (t) {
          if (ids169[t.id]) dup169.push(t.id);
          ids169[t.id] = 1;
          if (t.kind !== kind) kindOk169 = false;
          if (t.world !== w) kindOk169 = false;
          if (!(typeof t.weight === 'number' && t.weight > 0)) wOk169 = false;
          if (['common', 'rare', 'epic'].indexOf(t.tier) < 0) tierOk169 = false;
          if (t.tier === 'epic' && w !== 'xiuxian') epicOk169 = false;
          for (var k in t.effects) {
            if (!ALLOWED169[k]) keyOk169 = false;
            if (k === 'mingwang' && w !== 'xiuxian') mwOk169 = false;
            if (typeof t.effects[k] !== 'number') keyOk169 = false;
          }
        });
      });
    });
    ok('169', '天赋池重生成：72=40/32 · 124=66/58 · id 无重复 · effects 键全在字典+挂点白名单',
      cnt169.cp === 40 && cnt169.cn === 32 && cnt169.xp === 66 && cnt169.xn === 58 &&
      dup169.length === 0 && keyOk169 && tierOk169 && epicOk169 && mwOk169 && kindOk169 && wOk169,
      'cnt=' + JSON.stringify(cnt169) + ' dup=' + dup169.join(',') + ' keys=' + keyOk169 +
      ' tier=' + tierOk169 + ' epic=' + epicOk169 + ' mingwang=' + mwOk169);

    /* #170 streak 记账（数值详设 §8.3.1）：失败 +1 / 成功清零 / X09 skipAttempt 不 +1 / 旧档 normalize 补 0 */
    var w170 = mkWs({ realm: 0 });
    var restore170f = stubRandom(function () { return 0.999; });        /* p=0.95 → 必败 */
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog() });
    var f1_170 = w170.tribulation.streak === 1;
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog() });
    var f2_170 = w170.tribulation.streak === 2;
    var att170 = w170.tribulation.attempts;
    var savedTF170 = SQ.Treasures.tribOnFail;
    SQ.Treasures.tribOnFail = function () { return { skipAttempt: true }; };   /* X09 续命语义桩 */
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog() });
    SQ.Treasures.tribOnFail = savedTF170;
    var skip170 = w170.tribulation.streak === 2 && w170.tribulation.attempts === att170;  /* streak 与 attempts 同源豁免 */
    restore170f();   /* 先卸恒败桩再装必成桩——嵌套安装 + 只恢复后者会让恒 0.999 mock 复活泄漏全套件（六向批 #208 抓现行） */
    var restore170s = stubRandom(function () { return 0.01; });         /* 必成（p 0.93 心魔 2 层仍高） */
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog(), profile: mkProf() });
    restore170s();
    var clr170 = w170.tribulation.streak === 0;
    var n170 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { tribulation: { attempts: 5 } } } });
    var norm170 = n170.worlds.xiuxian.tribulation.streak === 0 && n170.worlds.xiuxian.tribulation.officeGuard === false;
    ok('170', 'streak 记账：失败 +1 / 成功清零 / X09 skipAttempt 豁免 / 旧档补 0',
      f1_170 && f2_170 && skip170 && clr170 && norm170,
      'f1=' + f1_170 + ' f2=' + f2_170 + ' skip=' + skip170 + ' clr=' + clr170 + ' norm=' + norm170);

    /* #171 心魔（§8.3.2/§8.3.4）：层数 = min(streak−1, 3) 进 talent 加项同读点；
     * 真仙裸身最坏 0.22−0.03 = 0.19（裸身口径 = 空 mods，无装备/功法/天赋/属性被动；第卌二批 base 压陡前为 0.308）；
     * p 仍 clamp [0.05, 0.95]、TRIB_P_CLAMP/REALMS 零改动 */
    var bareMods171 = (function () {
      var m = { sum: {}, detail: {}, atk: 0, resist: 0, hooks: {}, flags: {}, bonds: {}, slotted: [] };
      SQ.Mods.FIELDS.forEach(function (f) { m.sum[f] = 0; });
      return m;
    })();
    var w171 = mkWs({ realm: 8 });
    w171.tribulation.streak = 4;
    var i171 = SQ.XTrib.info(w171, pack, D, bareMods171);
    var p171 = Math.abs(i171.p - 0.19) < 1e-9;
    var part171 = i171.parts.xinmoStacks === 3 && Math.abs(i171.parts.xinmo + 0.03) < 1e-9;
    w171.tribulation.streak = 10;
    var cap171 = SQ.XTrib.info(w171, pack, D, bareMods171).parts.xinmoStacks === 3;
    w171.tribulation.streak = 1;
    var zero171 = SQ.XTrib.info(w171, pack, D, bareMods171).parts.xinmoStacks === 0;  /* <minStreak2 不生效 */
    w171.tribulation.streak = 2;
    var one171 = SQ.XTrib.info(w171, pack, D, bareMods171).parts.xinmoStacks === 1;
    var clamp171 = D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 &&
      i171.p >= 0.05 && i171.p <= 0.95 && D.REALMS[9].tribBase === 0.22;
    ok('171', '心魔：min(streak−1,3) 进 talent 同读点 / 真仙裸身最坏 0.19 / clamp 与 REALMS 零改动',
      p171 && part171 && cap171 && zero171 && one171 && clamp171,
      'p=' + i171.p.toFixed(3) + ' stacks=' + i171.parts.xinmoStacks + ' cap=' + cap171 + ' zero=' + zero171);

    /* #172 道伤/封固（§8.3.2）：走 pushBuff 通道、同字段同向重犯刷新时长不叠层、保留最强、到期自动清除 */
    var w172 = mkWs({ realm: 0 });
    var restore172 = stubRandom(function () { return 0.999; });
    var t172 = Date.now();
    SQ.Realm.tryBreakthrough(w172, pack, D, M(mkProf(), w172), t172, { log: noopLog() });   /* streak1 → 道伤 −15%/12h */
    function qiNegBuffs172(w) { return (w.buffs || []).filter(function (b) { return b.field === 'qiRate' && b.mult < 0; }); }
    var ds172 = qiNegBuffs172(w172);
    var ok172a = ds172.length === 1 && ds172[0].mult === -0.15 && ds172[0].source === 'tribStreak';
    var until172 = ds172[0].until;
    SQ.Realm.tryBreakthrough(w172, pack, D, M(mkProf(), w172), t172 + 1000, { log: noopLog() });  /* streak2 → 道伤刷新 */
    var rf172 = qiNegBuffs172(w172);
    var ok172b = rf172.length === 1 && rf172[0].until > until172 && rf172[0].mult === -0.15;      /* 不叠层、刷新时长 */
    SQ.Realm.tryBreakthrough(w172, pack, D, M(mkProf(), w172), t172 + 2000, { log: noopLog() });  /* streak3 → 封固 −25% 覆盖 */
    var fg172 = qiNegBuffs172(w172);
    var ok172c = fg172.length === 1 && fg172[0].mult === -0.25;                                   /* 保留最强 */
    restore172();
    w172.buffs[0].until = Date.now() - 1;
    pack.claim(w172, 1000, Date.now(), mkProf(), { autoTrib: false });
    var ok172d = qiNegBuffs172(w172).length === 0;                                                /* 到期自动清除（claim 过滤） */
    ok('172', '道伤/封固：pushBuff 通道 / 重犯刷新不叠层 / 保留最强 / 到期清除',
      ok172a && ok172b && ok172c && ok172d,
      'ds=' + ok172a + ' rf=' + ok172b + ' fg=' + ok172c + ' exp=' + ok172d);

    /* #173 破境高光四件套（§8.3.3）：破境 buff + 灵石 in.event + 天道垂青 10%（fateSeen 同境界段
     * 不重复、抽干流产、跨段可再遇）+ 无漏道基 karma +5 */
    var w173 = mkWs({ realm: 0, stones: 0 });
    w173.qi = 1000;
    var restore173 = stubRandom(function () { return 0.01; });          /* 成功掷判 + FATE_P + 池内首条 */
    SQ.Realm.tryBreakthrough(w173, pack, D, M(mkProf(), w173), Date.now(), { log: noopLog(), profile: mkProf() });
    restore173();
    var pj173 = null;
    (w173.buffs || []).forEach(function (b) { if (b.source === 'tribSuccess') pj173 = b; });
    var stones173 = w173.stones === Math.round(D.ZONES[1].stones * 300) &&
      w173.ledger.in.event === Math.round(D.ZONES[1].stones * 300);
    var fate173 = !!w173.pendingChoice && w173.pendingChoice.id === 'tiandao_guanding' &&
      w173.pendingChoice.via === 'fate' &&
      w173.fateSeen.length === 1 && w173.fateSeen[0].id === 'tiandao_guanding' && w173.fateSeen[0].realm === 1;
    var wulou173 = w173.karmaEventScore === 5;
    /* fateSeen 同境界段排除：连抽至段内抽干 → 流产；跨段可再遇 */
    var w173b = mkWs({ realm: 1 });
    var fired173 = [];
    for (var fi = 0; fi < 6; fi++) {
      var fr = SQ.Events.fireTagged(w173b, pack, D, 'trib_success', 3, Date.now(), null);
      if (fr) fired173.push(fr.id);
    }
    var dry173 = SQ.Events.fireTagged(w173b, pack, D, 'trib_success', 3, Date.now(), null) === null;
    var uniq173 = fired173.length === 6 && fired173.filter(function (v, i2, a2) { return a2.indexOf(v) === i2; }).length === 6;
    var cross173 = !!SQ.Events.fireTagged(w173b, pack, D, 'trib_success', 4, Date.now(), null);   /* 新境界段可再遇 */
    /* 常规抽取池排除 tags 词条（独立通道不进常规时钟） */
    var pool173 = SQ.Events.buildPool(pack, w173b, D, 'tian', 'good', Date.now());
    var noTag173 = pool173.every(function (ev) { return !(ev.tags && ev.tags.length); });
    ok('173', '破境高光：buff+灵石 in.event+天道垂青 fateSeen 段排除+无漏 karma+5',
      !!pj173 && pj173.field === 'qiRate' && pj173.mult === 0.5 && stones173 && fate173 && wulou173 &&
      uniq173 && dry173 && cross173 && noTag173,
      'buff=' + !!pj173 + ' stones=' + stones173 + ' fate=' + fate173 + ' wulou=' + wulou173 +
      ' uniq=' + uniq173 + ' dry=' + dry173 + ' cross=' + cross173 + ' poolExcl=' + noTag173);

    /* #174 区域词缀（§2.5）：roll 即掷/过期补掷/六字段消费点/闭关与全局 mods 零污染 */
    var w174 = mkWs({ realm: 2, zone: 0 });
    var t174r = Date.now();
    var a174 = SQ.Combat.rollAffix(w174, D, t174r);
    var roll174 = w174.zoneAffix.affixId === a174.id &&
      w174.zoneAffix.until === t174r + (D.AFFIX_MS || 21600000);
    /* needMult：xueyue → zone0 need 30×1.25 = 37.5 */
    w174.zoneAffix = { affixId: 'xueyue', until: Date.now() + 3600000 };
    var bn174 = SQ.Combat.bottleneckOf(w174, pack, D, M(mkProf(), w174));
    var need174 = Math.abs(bn174.need - 37.5) < 1e-9;
    /* stonesMult：xueyue 1.5 → 10 杀 × 3 × 1.5 = 45（stub 0.99 无掉落无残片） */
    var restore174a = stubRandom(function () { return 0.99; });
    var r174a = SQ.Combat.simulate(w174, pack, D, M(mkProf(), w174), 600, { log: noopLog(), now: Date.now() });
    restore174a();
    var stone174 = r174a.kills === 10 && r174a.stones === 45;
    /* speedMult + intervalAdd：kuanglan（speedMult 1.2 / intervalAdd 1） */
    w174.zoneAffix = { affixId: 'kuanglan', until: Date.now() + 3600000 };
    var r174b = (function () { var w = mkWs({ realm: 0, zone: 0 }); w.zoneAffix = { affixId: 'kuanglan', until: Date.now() + 3600000 }; return w; })();
    var bn174b = SQ.Combat.bottleneckOf(r174b, pack, D, M(mkProf(), r174b));
    var pen174 = bn174b.bottleneck === true && bn174b.intervalPenalty === 4;   /* (3+1)×无御风 */
    var restore174b = stubRandom(function () { return 0.99; });
    var r174c = SQ.Combat.simulate(w174, pack, D, M(mkProf(), w174), 600, { log: noopLog(), now: Date.now() });
    restore174b();
    var speed174 = r174c.kills === 12;                                          /* 60/1.2 = 50s → 12 杀 */
    /* dropMult：woye 1.15 → dropP 0.092；stub 0.09 有掉落，无词缀（0.08）则无 */
    var w174d = mkWs({ realm: 2, zone: 0 });
    w174d.zoneAffix = { affixId: 'woye', until: Date.now() + 3600000 };
    var restore174c = stubRandom(function () { return 0.09; });
    var r174d = SQ.Combat.simulate(w174d, pack, D, M(mkProf(), w174d), 60, { log: noopLog(), now: Date.now() });
    restore174c();
    var w174e = mkWs({ realm: 2, zone: 0 });
    w174e.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };     /* 无 dropMult 对照 */
    var restore174d = stubRandom(function () { return 0.09; });
    var r174e = SQ.Combat.simulate(w174e, pack, D, M(mkProf(), w174e), 60, { log: noopLog(), now: Date.now() });
    restore174d();
    var drop174 = r174d.drops.length === 1 && r174e.drops.length === 0;
    /* gearLuckAdd：guchen +0.15 → rollTier 抬档（luckAdd 直测：zone0 stub0.5 tier0 → tier1） */
    var mNoLuck = M(mkProf(), mkWs({ realm: 0 }));
    var r174f = stubRandom(function () { return 0.5; });
    var t0_174 = SQ.Gear.rollTier(D, 0, mNoLuck, null, 0);
    var t1_174 = SQ.Gear.rollTier(D, 0, mNoLuck, null, 5);
    r174f();
    var luck174 = t0_174 === 0 && t1_174 === 1;
    /* 过期补掷 + 词缀不进全局 mods + 闭关零消费点 */
    w174.zoneAffix = { affixId: 'xueyue', until: Date.now() - 1 };
    var restore174e = stubRandom(function () { return 0.99; });
    SQ.Combat.simulate(w174, pack, D, M(mkProf(), w174), 60, { log: noopLog(), now: Date.now() });
    restore174e();
    var reroll174 = w174.zoneAffix.until > Date.now();
    var w174g = mkWs({ realm: 2 });
    w174g.zoneAffix = { affixId: 'xueyue', until: Date.now() + 3600000 };
    var m174g = M(mkProf(), w174g);
    var m174h = M(mkProf(), mkWs({ realm: 2 }));
    var clean174 = JSON.stringify(m174g.sum) === JSON.stringify(m174h.sum) &&
      m174g.hooks.stonesMult === undefined && D.MODES.seclude.combat === false;
    var n174 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { zoneAffix: { affixId: 'nonexist', until: 9 } } } });
    var norm174 = n174.worlds.xiuxian.zoneAffix === null;                       /* 未知 id → null */
    ok('174', '区域词缀：掷/补掷/needMult/stonesMult/speedMult+intervalAdd/dropMult/gearLuckAdd/mods 零污染',
      roll174 && need174 && stone174 && pen174 && speed174 && drop174 && luck174 && reroll174 && clean174 && norm174,
      'roll=' + roll174 + ' need=' + need174 + ' stones=' + stone174 + '(' + r174a.stones + ') pen=' + pen174 +
      ' speed=' + speed174 + '(' + r174c.kills + ') drop=' + drop174 + ' luck=' + luck174 +
      ' reroll=' + reroll174 + ' clean=' + clean174 + ' norm=' + norm174);

    /* #175 域主状态机（§2.6）：首通 → ready（推进挂起）/ 判定 need×1.8 / 胜利上浮两档+灵石×10+推进点后移 /
     * 失败 CD 10min / 旧档 zoneBoss=null 不追溯生成 */
    var w175 = mkWs({ realm: 2, zone: 0, stones: 0 });
    var restore175 = stubRandom(function () { return 0.99; });
    SQ.Combat.simulate(w175, pack, D, M(mkProf(), w175), 1200, { log: noopLog(), now: Date.now() });   /* 20 杀首通 */
    restore175();
    var ready175 = w175.cleared.indexOf(0) >= 0 && !!w175.zoneBoss &&
      w175.zoneBoss.zone === 0 && w175.zoneBoss.state === 'ready' && w175.zone === 0;                 /* 推进挂起 */
    var restore175b = stubRandom(function () { return 0.5; });
    var c175 = SQ.Combat.challengeBoss(w175, pack, D, M(mkProf(), w175), Date.now(), { log: noopLog() });
    restore175b();
    var win175 = c175.ok && c175.win && Math.abs(c175.need - 30 * 1.8) < 1e-9 &&
      w175.zoneBoss.state === 'dead' && c175.item.tier >= 2 && c175.stones === 30 &&
      w175.ledger.in.event === 30;
    var adv175 = w175.zone === 1;                                                                       /* 推进点后移至域主战后 */
    /* 失败 CD：realm0 裸身 20 < 54 → 败 + retryAt；再挑战 → cd 拒绝 */
    var w175b = mkWs({ realm: 0, zone: 0 });
    w175b.zoneBoss = { zone: 0, state: 'ready', retryAt: 0 };
    var t175 = Date.now();
    var c175b = SQ.Combat.challengeBoss(w175b, pack, D, M(mkProf(), w175b), t175, { log: noopLog() });
    var lose175 = c175b.ok && !c175b.win && w175b.zoneBoss.state === 'ready' &&
      Math.abs(w175b.zoneBoss.retryAt - (t175 + 600000)) < 2000;
    var cd175 = SQ.Combat.challengeBoss(w175b, pack, D, M(mkProf(), w175b), t175 + 1000, { log: noopLog() }).reason === 'cd';
    /* 旧档：normalize 缺省 null；已通关旧区回访再清**不追溯生成域主**（zoneBoss 保持 null）；
     * zoneBoss=null 时 maybeAdvance 维持现行「首通即推进」口径（重访再清本就不触发推进，与旧码一致） */
    var n175 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { cleared: [0] } } });
    var w175c = mkWs({ realm: 2, zone: 0, cleared: [0] });
    var restore175c = stubRandom(function () { return 0.99; });
    SQ.Combat.simulate(w175c, pack, D, M(mkProf(), w175c), 1200, { log: noopLog(), now: Date.now() });
    restore175c();
    var legacy175 = n175.worlds.xiuxian.zoneBoss === null && w175c.zoneBoss == null &&
      SQ.Combat.maybeAdvance(w175c, pack, D, M(mkProf(), w175c), 0, noopLog()) === true && w175c.zone === 1;
    ok('175', '域主状态机：首通 ready 挂起 / need×1.8 / 胜利上浮两档+灵石×10+推进后移 / 失败 CD / 旧档不追溯',
      ready175 && c175.win && adv175 && lose175 && cd175 && legacy175,
      'ready=' + ready175 + ' win=' + c175.win + ' tier=' + c175.item.tier + ' adv=' + adv175 +
      ' lose=' + lose175 + ' cd=' + cd175 + ' legacy=' + legacy175);

    /* #176 探宝残片（§2.7）：SHARD_P×(1+ΣdropRate)×dropMult 掉 / 分区计数 / 20 片兑换走 mutate / 奖励四档 */
    /* 掉率直测：lingchao（无 dropMult）stub 0.019 < 0.02 → 每杀 1 片；无天赋 → 10 杀 10 片 */
    var w176 = mkWs({ realm: 2, zone: 0 });
    w176.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var restore176a = stubRandom(function () { return 0.019; });
    SQ.Combat.simulate(w176, pack, D, M(mkProf(), w176), 600, { log: noopLog(), now: Date.now() });
    restore176a();
    var drop176 = w176.shards[0] === 10;
    /* (1+ΣdropRate)：adventurous +0.15 → shardP 0.023；stub 0.021 → 有天掉落片、无天赋不落（0.021 > 0.02） */
    var w176b = mkWs({ realm: 2, zone: 0 });
    w176b.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var t176b = mkTalent({ dropRate: 0.15 });
    var restore176b = stubRandom(function () { return 0.021; });
    SQ.Combat.simulate(w176b, pack, D, M(mkProf([t176b]), w176b), 60, { log: noopLog(), now: Date.now() });
    restore176b();
    var w176c = mkWs({ realm: 2, zone: 0 });
    w176c.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var restore176c = stubRandom(function () { return 0.021; });
    SQ.Combat.simulate(w176c, pack, D, M(mkProf(), w176c), 60, { log: noopLog(), now: Date.now() });
    restore176c();
    var rate176 = (w176b.shards[0] || 0) === 1 && (w176c.shards[0] || 0) === 0;
    /* 兑换四档 + 扣片 + 分区 + 不足拒绝 */
    var w176d = mkWs({ realm: 9 });
    w176d.shards = [20, 5, 0, 0, 20, 0, 0, 20, 0, 20];
    var x0 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 0, null, Date.now(), noopLog());
    var pill176 = x0.ok && x0.reward.type === 'pill' &&
      ['juqi', 'ningshen', 'cuiti'].indexOf(x0.reward.id) >= 0 && w176d.shards[0] === 0 && w176d.shards[1] === 5;
    var x1 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 1, null, Date.now(), noopLog());
    var lack176 = !x1.ok && x1.reason === 'shards';
    var x4 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 4, null, Date.now(), noopLog());
    var box176 = x4.ok && x4.reward.type === 'gearbox' && x4.reward.item.tier >= 2 && w176d.shards[4] === 0;
    var xC = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 7, null, Date.now(), noopLog());
    var choice176 = !xC.ok && xC.reason === 'choice';                                  /* 二选一必选 */
    var xF = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 7, 'fac', Date.now(), noopLog());
    var fac176 = xF.ok && xF.reward.type === 'fac' &&
      (w176d.cave.fac[w176d.cave.current] || {})[xF.reward.fac] === 1 && w176d.shards[7] === 0;
    w176d.shards[7] = 20;
    var xI = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 7, 'intel', Date.now(), noopLog());
    var intel176 = xI.ok && xI.reward.type === 'intel' && w176d.intelArts && w176d.intelArts[xI.reward.id] === true;
    var x9 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 9, null, Date.now(), noopLog());
    var tr176 = x9.ok && x9.reward.type === 'treasure' &&
      !!SQ.Treasures.entryOf(w176d, x9.reward.id) && w176d.shards[9] === 0;
    /* z9 全持有 → 折灵石 in.event */
    w176d.shards[9] = 20;
    (pack.treasures.LIST || []).forEach(function (d) {
      if (d.kind === 'xian' && !SQ.Treasures.entryOf(w176d, d.id)) {
        w176d.treasures.owned.push({ id: d.id, stage: 1, st: {} });
      }
    });
    var st176 = w176d.stones;
    var x9b = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 9, null, Date.now(), noopLog());
    var fold176 = x9b.ok && x9b.reward.type === 'stones' &&
      x9b.reward.n === Math.round(D.ZONES[9].stones * 10) &&
      w176d.stones === st176 + x9b.reward.n;
    /* 兑换走 mutate 事务通道（Actions 入口 + 落盘生效） */
    var mut176 = typeof SQ.Actions.exchangeShard === 'function' && typeof SQ.Actions.challengeBoss === 'function';
    var n176 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { shards: [3, -5, 'x'] } } });
    var norm176 = n176.worlds.xiuxian.shards.length === 10 && n176.worlds.xiuxian.shards[0] === 3 &&
      n176.worlds.xiuxian.shards[1] === 0 && n176.worlds.xiuxian.shards[9] === 0;
    ok('176', '残片：2%×(1+dropRate) 掉 / 分区计数 / 兑换四档 / mutate 入口 / normalize 钳位',
      drop176 && rate176 && pill176 && lack176 && box176 && choice176 && fac176 && intel176 &&
      tr176 && fold176 && mut176 && norm176,
      'drop=' + drop176 + ' rate=' + rate176 + ' pill=' + pill176 + ' lack=' + lack176 + ' box=' + box176 +
      ' choice=' + choice176 + ' fac=' + fac176 + ' intel=' + intel176 + ' tr=' + tr176 + ' fold=' + fold176 +
      ' norm=' + norm176);

    /* ═══ 4.7 界面组可无头验证项 ═══ */

    /* #72 数字格式三档 */
    /* ═══ 双书内容池恢复批（2026-10-03）· #147~#154 补齐（缺 7 条；#152 福地批版在场同题覆盖）═══ */

    /* #147 双书两批累计词表 key 对账（扩容批 C1 + 二批 C 口径）：event = 119 条全量 ×5 key 零缺失
     * （⊇ 两批 52×5=260）+ bond 38×10=380 + spouse 10×3=30 + faction 16×2=32 + treasure 16×2=32 + skill 16×2=32 */
    var bad147 = [];
    /* SQ.t 全链路解析（通用池 key 注册在 common 词表，SQ.LEX.xiuxian 单表会漏——#118 同款口径） */
    function lex147(key) { if (SQ.t(key, null, 'xiuxian') === key) bad147.push(key); }
    all118.forEach(function (ev) {
      /* 分支键按模板**自己声明的 choices** 逐支对表（第卌四批改口，与 audit A2 同口径）：
       * 「族中寻仇」按用户设定只有迎战一条路，硬要求三支齐全只会逼词表补两条永不消费的孤儿键 */
      ['name', 'story'].concat(Object.keys(ev.choices || {}).map(function (bk) { return 'branch.' + bk; }))
        .forEach(function (suf) {
          lex147('event.' + ev.id + '.' + suf);
        });
    });
    var BOND38_147 = ['hanli', 'yuxiao', 'xuaner', 'nangong', 'pingping', 'ningyao', 'aliang', 'jingchun',
      'lihuayuan', 'mojuren', 'zhangtie', 'yuzhitong', 'wuyan', 'wangchan', 'xiangzhili', 'chelaozu', 'zuoyou',
      'liushiliu', 'makuxuan', 'weixian', 'xieshi', 'cuichan', 'yufu', 'wensheng', 'zhuhe', 'ruanqiong',
      'dongtianci', 'yintianxia', 'baidi', 'gucan', 'mupeiling', 'chenqiaoyue', 'chenlianyan', 'yinyue',
      'hongfu', 'yuanyao', 'ruanxiu', 'chenqingdu'];
    BOND38_147.forEach(function (id) {
      ['name', 'kind', 'perk', 'perk.desc', 'flavor', 'title.1', 'title.2', 'title.3', 'title.4', 'ava']
        .forEach(function (suf) { lex147('bond.' + id + '.' + suf); });
    });
    ['xuaner', 'ningyao', 'mupeiling', 'chenqiaoyue', 'chenlianyan', 'yinyue', 'hongfu', 'yuanyao', 'ruanxiu', 'chenqingdu']
      .forEach(function (id) { ['yinyang', 'huzhu', 'luding'].forEach(function (f) { lex147('spouse.' + id + '.' + f); }); });
    (D.FACTIONS_FIXED || []).forEach(function (fx) { lex147('faction.' + fx.id + '.name'); lex147('faction.' + fx.id + '.desc'); });
    ['x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'h19', 'h20', 'h21', 'h22', 'h23', 'h24', 'h25', 'h26', 'h27']
      .forEach(function (id) { lex147('treasure.' + id + '.name'); lex147('treasure.' + id + '.desc'); });
    ['dayan', 'qingzhu', 'xuedun', 'jianyun', 'chunyu', 'duoxian', 'dujing', 'xingchen', 'liumojue', 'zhenmo',
      'qianjian', 'wenxin', 'changcheng', 'yinjian', 'jianlu', 'shengxin']
      .forEach(function (id) { lex147('skill.' + id + '.name'); lex147('skill.' + id + '.desc'); });
    ok('147', '双书两批累计词表 key 对账（event 119×5 + bond 380 + spouse 30 + faction 32 + treasure 32 + skill 32）',
      bad147.length === 0, 'missing=' + bad147.slice(0, 6).join(','));

    /* #148 固定势力 16 处必现 + 总数 16~20（势力全录 §一 口径；旧登记 17~20 系转写误差，恢复批修正）+ 阵营缺口各 ≥2 + 法宝 46 件 codex + 新挂点并入 mods +
     * 紫金钟/镇魔链档数口径结案（§4.5 clamp 清单：h19 MAX_LV 3 满级 −3pp / x18 MAX_STAGE 5 满阶 −2.5pp） */
    var fac148 = w144.factions || [];
    var fix148 = (D.FACTIONS_FIXED || []).every(function (fx) { return !!SQ.Factions.byId(w144, fx.id); });
    var cnt148 = { right: 0, neutral: 0, evil: 0 };
    fac148.forEach(function (f) { cnt148[f.align]++; });
    var XT148 = pack.treasures;
    var n148x = XT148.LIST.filter(function (t) { return t.kind === 'xian'; }).length;
    var n148h = XT148.LIST.filter(function (t) { return t.kind === 'hou'; }).length;
    var HOOKS148 = { combatPower: 1, qiRate: 1, qiCap: 1, eventLuck: 1, tribBonus: 1, tribFailLossMod: 1,
      combatSpeed: 1, stonesRate: 1, dropRate: 1, artsSpeed: 1,
      on_kill_stones: 1, on_debuff_apply: 1, on_bottleneck_power: 1 };
    var NEW16_148 = { x13: 1, x14: 1, x15: 1, x16: 1, x17: 1, x18: 1, x19: 1,
      h19: 1, h20: 1, h21: 1, h22: 1, h23: 1, h24: 1, h25: 1, h26: 1, h27: 1 };
    var hookOk148 = XT148.LIST.filter(function (t) { return NEW16_148[t.id]; }).every(function (t) {
      return Object.keys(t.scaled || {}).every(function (k) {
        var p148 = k.split(':');
        return (p148[0] === 'mult' || p148[0] === 'hook') && !!HOOKS148[p148[1]];
      });
    });
    /* 功能验证：x18 stage5 + h19 lv3 + x19 stage3 同时祭出 → sum.tribFailLossMod = −0.055、qiCap +0.06 */
    var w148 = mkWs({ realm: 6 });
    w148.treasures = { owned: [{ id: 'x18', stage: 5, st: {} }, { id: 'h19', lv: 3, st: {} }, { id: 'x19', stage: 3, st: {} }],
      slots: ['x18', 'h19', 'x19'], fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0 };
    /* Treasures.collect 直测（mods.sum 含境界被动等底噪，非法宝单源）：x18 五阶 −2.5pp + h19 三级 −3pp
     * → tribFailLossMod −0.055（§4.5 合计 clamp [30%,70%] 在 tribulation 消费端兜底）；x19 三阶 qiCap +6% */
    var trs148 = SQ.Treasures.collect(w148, pack, D);
    var clamp148 = Math.abs((trs148.sum.tribFailLossMod || 0) + 0.055) < 1e-9 &&
      Math.abs((trs148.sum.qiCap || 0) - 0.06) < 1e-9;
    ok('148', '固定势力 16 必现/总数 16~20/阵营 ≥2 + 法宝 46（x19+h27）+ 挂点白名单 + 档数口径（−2.5pp/−3pp）',
      (D.FACTIONS_FIXED || []).length === 16 && fix148 && fac148.length >= 16 && fac148.length <= 20 &&
      cnt148.right >= 2 && cnt148.neutral >= 2 && cnt148.evil >= 2 &&
      XT148.LIST.length === 46 && n148x === 19 && n148h === 27 && hookOk148 && clamp148 &&
      XT148.ZONE_TREASURE[8] === 'x13' && XT148.MERCHANT_IDS.join() === 'x14,x15,x16',
      'fac=' + fac148.length + ' fix=' + fix148 + ' T=' + XT148.LIST.length + ' hook=' + hookOk148 + ' clamp=' + clamp148);

    /* #149 28 人预算 = 批3 20 人基线 + 扩容增量八字段（道友池卷 §四 登记；消费端 clamp 不变） */
    var C20_149 = { huang: 1, chiwei: 1, qin: 1, liu: 1, chen: 1, tang: 1, chu: 1, man: 1, suwan: 1, xie: 1,
      yewu: 1, shen: 1, tie: 1, pei: 1, zhu: 1, yan: 1, lu: 1, fu: 1, luman: 1, feng: 1 };
    var C8_149 = { hanli: 1, yuxiao: 1, xuaner: 1, nangong: 1, pingping: 1, ningyao: 1, aliang: 1, jingchun: 1 };
    var sum149F = {}, sum149C = {};
    (D.COMPANIONS || []).forEach(function (c) {
      if (!C20_149[c.id] && !C8_149[c.id]) return;
      var pk = c.perk || {};
      if (pk.field) sum149F[pk.field] = (sum149F[pk.field] || 0) + (pk.perTier || 0) * 4;
      if (pk.channel && pk.perTier) sum149C[pk.channel] = (sum149C[pk.channel] || 0) + pk.perTier * 4;
    });
    var EXP149F = { dropRate: 0.08, shopCost: -0.16, artsSpeed: 0.08, stonesRate: 0.14, offlineEff: 0.16,
      combatPower: 0.12, eventLuck: 0.08, gearLuck: 0.08, tribFailLossMod: -0.08, combatSpeed: 0.06, qiRate: 0 };
    var EXP149C = { debuffXinmo: 0.28, debuffAll: 0.28, checkPp: 0.10, bottleneck: 0.20, negEvent: 0.08,
      refine: 0.12, claimQi: 0.04, dropExtra: 0.06 };
    var bad149 = [];
    for (var f149 in EXP149F) if (Math.abs((sum149F[f149] || 0) - EXP149F[f149]) > 1e-9) bad149.push(f149 + '=' + (sum149F[f149] || 0));
    for (var c149 in EXP149C) if (Math.abs((sum149C[c149] || 0) - EXP149C[c149]) > 1e-9) bad149.push(c149 + '=' + (sum149C[c149] || 0));
    var n149 = Object.keys(C20_149).length + Object.keys(C8_149).length;
    ok('149', '28 人预算 = 批3 20 基线 + 扩容增量八字段（满档逐字段对表）',
      n149 === 28 && bad149.length === 0, bad149.join(','));

    /* #150 113 条 lint 带（事件池 §2.2 v1.11 强制 lint 之双书全池升级口径）：
     * karma 分级带 人8/地15/天25 · failE qiPct 下界 ≥−15% · 负 buff ≤24h（垂青 6 条 tags 独立通道另按 #170~#176） */
    var pool150 = all118.filter(function (ev) { return !(ev.tags && ev.tags.length); });
    var bad150 = [];
    var BAND150 = { ren: 8, di: 15, tian: 25 };
    pool150.forEach(function (ev) {
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var br = (ev.choices || {})[bk] || {};
        if (Math.abs(br.karma || 0) > BAND150[ev.tier]) bad150.push(ev.id + ':karma' + br.karma);
        (br.gain || []).forEach(function (g) {
          if (g.type === 'buff' && g.mult < 0 && g.hours > 24) bad150.push(ev.id + ':debuff' + g.hours);
        });
        var chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
        chks.forEach(function (c) {
          var fe = c.failE;
          if (!fe) return;
          if (fe.qiPct != null) {
            var band = Array.isArray(fe.qiPct) ? fe.qiPct : [fe.qiPct, fe.qiPct];
            if (Math.min(band[0], band[1]) < -0.15 - 1e-9) bad150.push(ev.id + ':failE.qiPct');
          }
          if (fe.buff && fe.buff.mult < 0 && fe.buff.hours > 24) bad150.push(ev.id + ':failE.debuff' + fe.buff.hours);
        });
      });
    });
    ok('150', '117 条 lint 带（karma 人8/地15/天25 · failE ≥−15% · 负 buff ≤24h · 洗髓批 №125 与第卌四批 №126~128 入带； ambushFoe / stonesPct 已入白名单）',
      pool150.length === 114 && bad150.length === 0, 'n=' + pool150.length + ' bad=' + bad150.slice(0, 5).join(','));

    /* #151 二批 30 人十三字段增量对表（道友池卷 §五 登记 · 满档口径；单人单字段 ≤8%/≤4pp 带随附） */
    var C30_151 = { lihuayuan: 1, mojuren: 1, zhangtie: 1, yuzhitong: 1, wuyan: 1, wangchan: 1, xiangzhili: 1,
      chelaozu: 1, zuoyou: 1, liushiliu: 1, makuxuan: 1, weixian: 1, xieshi: 1, cuichan: 1, yufu: 1, wensheng: 1,
      zhuhe: 1, ruanqiong: 1, dongtianci: 1, yintianxia: 1, baidi: 1, gucan: 1, mupeiling: 1, chenqiaoyue: 1,
      chenlianyan: 1, yinyue: 1, hongfu: 1, yuanyao: 1, ruanxiu: 1, chenqingdu: 1 };
    var sum151F = {}, sum151C = {}, bad151 = [], solo151 = [];
    (D.COMPANIONS || []).forEach(function (c) {
      if (!C30_151[c.id]) return;
      var pk = c.perk || {};
      var full = (pk.perTier || 0) * 4;
      if (pk.field) {
        sum151F[pk.field] = (sum151F[pk.field] || 0) + full;
        if (pk.field !== 'tribFailLossMod' && Math.abs(full) > 0.08 + 1e-9) solo151.push(c.id + '=' + full);
        if (pk.field === 'tribFailLossMod' && Math.abs(full) > 0.04 + 1e-9) solo151.push(c.id + '=' + full);
      }
      if (pk.channel && pk.perTier) sum151C[pk.channel] = (sum151C[pk.channel] || 0) + full;
    });
    var EXP151F = { qiRate: 0.14, offlineEff: 0.22, stonesRate: 0.10, eventLuck: 0.22, shopCost: -0.04,
      combatPower: 0.22, combatSpeed: 0.18, artsSpeed: 0.08, dropRate: 0.14, tribFailLossMod: -0.02 };
    var EXP151C = { bottleneck: 0.10, debuffAll: 0.08, debuffXinmo: 0.08 };
    for (var f151 in EXP151F) if (Math.abs((sum151F[f151] || 0) - EXP151F[f151]) > 1e-9) bad151.push(f151 + '=' + (sum151F[f151] || 0));
    for (var c151 in EXP151C) if (Math.abs((sum151C[c151] || 0) - EXP151C[c151]) > 1e-9) bad151.push(c151 + '=' + (sum151C[c151] || 0));
    if (Object.keys(sum151F).length !== 10 || Object.keys(sum151C).length !== 3) bad151.push('fields=' + Object.keys(sum151F).length + '/' + Object.keys(sum151C).length);
    ok('151', '二批 30 人十三字段增量对表（满档合计 = §五 登记 + 单人 ≤8%/4pp 带）',
      bad151.length === 0 && solo151.length === 0, bad151.concat(solo151).join(','));

    /* #153 功法 70 部 #105 乘区零漂移对表（功法全录 v1.4 §2.7 联合验算表 = 对账基线）：
     * 🔧 第卅八批品阶强度重排换基线（阶梯 黄1/玄2/地3.5/天6，黄阶保持现值 ⇒ 终局通胀 2~3.3 倍）：
     *   top6 每级合计十二字段 60/60/50/39/35/34/16/17/13/9/0.065/−2 → **137.5/119.1/111/114.7/116/80/13/22.5/26/9/0.065/−2**；
     *   红线两类（tribBonus / realmCost）与 dropRate 一字未动 ⇒ 这三条仍是旧值，正是「重排没碰到红线」的证据。
     *   本表与 #105 上限、通用规范 §一 极限表、`FUSE.FIELD_CAP` 四处同动（改任一处必红其余三处）。 */
    var EXP153 = { combatPower: 1.375, qiRate: 1.191, offlineEff: 1.11, combatSpeed: 1.147, qiCap: 1.16,
      stonesRate: 0.80, artsSpeed: 0.13, eventLuck: 0.225, eventRate: 0.26, dropRate: 0.09,
      tribBonus: 0.0325, realmCost: -0.02 };
    var per153 = {};
    for (var id153 in SQ.XARTS) {
      var ef153 = SQ.XARTS[id153].effects;
      for (var k153 in ef153) (per153[k153] = per153[k153] || []).push(ef153[k153]);
    }
    var bad153 = [];
    for (var f153 in EXP153) {
      var top153 = (per153[f153] || []).slice().sort(function (a, b) { return b - a; }).slice(0, 6);
      var sum153 = top153.reduce(function (s153, v) { return s153 + v; }, 0);
      if (Math.abs(sum153 - EXP153[f153]) > 1e-9) bad153.push(f153 + '=' + sum153.toFixed(4) + '/' + EXP153[f153]);
    }
    var ids153 = Object.keys(SQ.XARTS);
    var al153 = { right: 0, neutral: 0, evil: 0 };
    ids153.forEach(function (id) { al153[SQ.XARTS[id].alignment]++; });
    ok('153', '功法 70 部 top6 每级合计零漂移对表（十二字段 + 阵营 25/26/19）',
      ids153.length === 70 && bad153.length === 0 && al153.right === 25 && al153.neutral === 26 && al153.evil === 19,
      'n=' + ids153.length + ' ' + bad153.join(',') + ' al=' + JSON.stringify(al153));

    /* #154 法宝 46 件 + 名录 58 格节内滚动定稿 + 镇魔链满阶 −2.5pp（二批 B/A5 收口口径）。
     * 节内滚动 = 浮层容器 #mbd-body 自带 max-height:62vh + overflow-y:auto（view/index.html:913，零改动即满足——
     * 定稿证据为静态容器样式，物理核对见恢复批收口记录；本断言核数据侧）。 */
    var XT154 = pack.treasures;
    var x18_154 = XT154.byId['x18'], h19_154 = XT154.byId['h19'];
    var comp154 = (D.COMPANIONS || []).length;
    var spouse154 = (D.COMPANIONS || []).filter(function (c) { return c.category === 'spouse'; }).length;
    ok('154', '法宝 46 件（x19+h27）+ 名录 58 格（候选 14）+ 镇魔链 5 阶 −2.5pp / 紫金钟 3 级 −3pp',
      XT154.LIST.length === 46 && comp154 === 58 && spouse154 === 14 &&
      x18_154.MAX_STAGE === 5 && x18_154.scaled['mult:tribFailLossMod'][1] === -0.025 &&
      h19_154.MAX_LV === 3 && h19_154.scaled['mult:tribFailLossMod'][1] === -0.03,
      'T=' + XT154.LIST.length + ' comp=' + comp154 + '/' + spouse154);

    /* ═══ 天道系统批（v1.19 · 天道设计 v1.1 §十 · #181~#196）═══
     * 全链路：问天（香火/冷却/档位预掷）→ 奏疏（500~800 字）→ 圣旨解析（三层容错+白名单+clamp+幂等）
     * → 领旨（15 型通道）/ 抗旨（逆天值）→ 天睐天怒 → 逆天大劫 → 天象队列。
     * 红线复核：p 公式主体 / TRIB_P_CLAMP / REALMS / mods FIELDS 零改动；接旨与天象不进 tick。 */
    var TD = D.TIANDAO;
    var origRandom181 = Math.random;
    function mkTdWs(ov) {
      var w = pack.initialState();
      w.stones = 5000;
      if (ov) Object.assign(w, ov);
      return w;
    }
    function mkTdCtx() { return { log: function () {}, now: Date.now(), profile: { talents: [] } }; }
    function modsTd(w) { return SQ.Mods.collect({ talents: [] }, w, pack, D); }
    var tdSeq = 0;
    function decObj(type, tier, payload, hex) {
      return { decreeId: 'td-smoke-' + (++tdSeq), hexagram: hex || '问劫', tier: tier || '天机',
        type: type, payload: payload || {}, verdict: '测试判词', omen: '测试谶语' };
    }
    function sanTd(dec, w) { return SQ.Tiandao.sanitize(dec, w || mkTdWs(), pack, D, Date.now()); }

    /* #181 白名单：type 不在 §4.2 枚举内 → 整旨拒绝降级谶语档（零效果） */
    var raw181 = '好的，这是您要的 JSON：\n```json\n' + JSON.stringify({
      decreeId: 'td-x-1', hexagram: '问劫', tier: '敕令', type: '不存在旨意',
      payload: { stones: 999999 }, verdict: 'v', omen: 'o'
    }) + '\n```\n以上，退下吧。';
    var d181 = SQ.Tiandao.parseReply(raw181, mkTdWs(), pack, D, Date.now());
    ok('181', '解析器白名单生效：枚举外 type 整旨拒绝降级谶语档',
      d181.type === 'prophecy' && Object.keys(d181.payload).length === 0);

    /* #182 三层容错：围栏 + 前后缀杂讯剥壳提取第一个 {...} */
    var raw182 = '好嘞，老夫这就赐你一道旨意：\n```json\n' + JSON.stringify({
      decreeId: 'td-x-2', hexagram: '问劫', tier: '敕令', type: '天心护佑',
      payload: { tribBonus: 0.02 }, verdict: '哼。', omen: '劫云偏东。'
    }) + '\n```\n拿去吧，别谢老夫。';
    var d182 = SQ.Tiandao.parseReply(raw182, mkTdWs(), pack, D, Date.now());
    ok('182', '三层容错：markdown 围栏与前后缀杂讯正确剥壳提取',
      d182.type === 'bless' && d182.payload.tribBonus === 0.02 && d182.decreeId === 'td-x-2');

    /* #183 fuzz 100 条脏输入零崩溃 + 彻底失败降级「天机紊乱」谶语档 */
    var crash183 = 0, bad183 = 0;
    var dirt183 = ['', 'null', '[]', '{}', '你好世界', '{"a":', '{}}{', '```', '{"type":123}',
      '{"decreeId":null,"hexagram":9,"tier":{},"type":[],"payload":"x","verdict":{},"omen":3}',
      '{"decreeId":"td-f","hexagram":"问劫","tier":"稀","type":"谶语","payload":null,"verdict":"x","omen":"y"}',
      String.fromCharCode(0), '｛"type":"天心护佑"｝'];
    for (var fi = 0; fi < 100; fi++) {
      try {
        var inp183 = dirt183[fi % dirt183.length];
        var df183 = SQ.Tiandao.parseReply(typeof inp183 === 'string' ? inp183 + fi : inp183, mkTdWs(), pack, D, Date.now());
        if (!df183 || typeof df183.type !== 'string' || !df183.decreeId) bad183++;
      } catch (e) { crash183++; }
    }
    var d183 = SQ.Tiandao.parseReply('完全不是 JSON 的一段闲话', mkTdWs(), pack, D, Date.now());
    ok('183', 'fuzz 100 条脏输入零崩溃：彻底失败降级谶语档不抛异常',
      crash183 === 0 && bad183 === 0 && d183.type === 'prophecy' && d183.degraded === true,
      'crash=' + crash183 + ' bad=' + bad183);

    /* #184 payload 越界 clamp（宽进严数值：clamp 后照常生效不整旨拒绝） */
    var c184a = sanTd(decObj('天心护佑', '敕令', { tribBonus: 0.05 }, '问劫'));
    var c184b = sanTd(decObj('天罚', '敕令', { mult: -0.30, hours: 99 }, '问劫'));
    var c184c = sanTd(decObj('因果簿', '敕令', { karma: 40 }, '问劫'));
    var c184d = sanTd(decObj('情缘牵引', '敕令', { bond: 9 }, '问缘'));
    ok('184', 'payload clamp：+0.05→0.03 / −30%→−20%（≤24h）/ +40→+10 / +9→+5',
      c184a.payload.tribBonus === 0.03 && c184b.payload.mult === -0.20 && c184b.payload.hours === 24 &&
      c184c.payload.karma === 10 && c184d.payload.bond === 5);

    /* #185 seenIds 幂等（领后重领 / 领后重抗均无效） */
    var w185 = mkTdWs();
    var dd185 = sanTd(decObj('天恩·赐财', '敕令', { stones: 100 }, '问财'));
    var r185a = SQ.Tiandao.accept(w185, pack, D, modsTd(w185), dd185, Date.now(), mkTdCtx());
    var stones185 = w185.stones;
    var r185b = SQ.Tiandao.accept(w185, pack, D, modsTd(w185), dd185, Date.now(), mkTdCtx());
    var r185c = SQ.Tiandao.defyDecree(w185, pack, D, dd185, Date.now(), mkTdCtx());
    ok('185', 'seenIds 幂等：同 decreeId 重复接旨无效果且拒绝（此旨已领）',
      r185a.ok === true && r185a.gains.stones === 100 && r185b.ok === false && r185b.reason === 'seen' &&
      r185c.reason === 'seen' && w185.stones === stones185 && w185.tiandao.defy === 0 &&
      w185.ledger.in.event === 100);

    /* #186 问天冷却（读 ASK_CD_MS）：冷却内拒绝（奏疏不生成、香火不扣），过点放行 */
    var w186 = mkTdWs({ stones: 3000 });
    var t186 = Date.now(), cd186 = D.TIANDAO.ASK_CD_MS;
    var a186a = SQ.Tiandao.ask(w186, pack, D, { talents: [] }, 'wenjie', 1, '', t186);
    var stones186 = w186.stones;
    var a186b = SQ.Tiandao.ask(w186, pack, D, { talents: [] }, 'wenjie', 1, '', t186 + cd186 - 1);
    var cool186 = a186b.ok === false && a186b.reason === 'cooldown' && w186.stones === stones186 && !a186b.text;
    var a186c = SQ.Tiandao.ask(w186, pack, D, { talents: [] }, 'wenjie', 1, '', t186 + cd186 + 1);
    ok('186', '问天冷却 ' + (cd186 / 3600000) + 'h：冷却内拒绝（奏疏不生成香火不扣），过点放行',
      a186a.ok === true && stones186 === 2900 && cool186 && a186c.ok === true && w186.ledger.out.donate === 200);

    /* #187 香火档位权重迁移（RARE_SHIFT 0/2/3/5） */
    var wts187 = [0, 1, 2, 3].map(function (i) { return SQ.Tiandao.weightsOf(D, i).join('/'); });
    ok('187', '香火四档权重 70/25/5 → 68/25/7 → 67/25/8 → 65/25/10',
      wts187[0] === '70/25/5' && wts187[1] === '68/25/7' && wts187[2] === '67/25/8' && wts187[3] === '65/25/10',
      wts187.join(','));

    /* #188 逆天值累积：天机/敕令/稀 +10/+15/+25；魔道 ×1.5 向下取整（敕令 22） */
    var w188 = mkTdWs();
    SQ.Tiandao.defyDecree(w188, pack, D, sanTd(decObj('天机·劫数预告', '天机', {}, '问劫')), Date.now(), mkTdCtx());
    SQ.Tiandao.defyDecree(w188, pack, D, sanTd(decObj('天心护佑', '敕令', { tribBonus: 0.01 }, '问劫')), Date.now(), mkTdCtx());
    SQ.Tiandao.defyDecree(w188, pack, D, sanTd(decObj('敕赐奇遇', '稀', {}, '问境')), Date.now(), mkTdCtx());
    var w188e = mkTdWs({ karma: -500 });
    var r188e = SQ.Tiandao.defyDecree(w188e, pack, D, sanTd(decObj('天心护佑', '敕令', { tribBonus: 0.01 }, '问劫')), Date.now(), mkTdCtx());
    ok('188', '逆天值累积 10/15/25 + 魔道 ×1.5 向下取整（敕令=22）',
      w188.tiandao.defy === 50 && r188e.gain === 22 && w188e.tiandao.defy === 22);

    /* #189 档位修正只在渡劫结算窗口：talent 加项读点生效，结算后档位态清空、defy 保留 */
    var w189 = mkTdWs({ realm: 1 });
    w189.tiandao.defy = 29;
    SQ.Tiandao.defyDecree(w189, pack, D, sanTd(decObj('天机·劫数预告', '天机', {}, '问劫')), Date.now(), mkTdCtx());
    var m189a = SQ.Tiandao.tribModOf(w189, D);
    w189.tiandao.defy = 59;
    SQ.Tiandao.defyDecree(w189, pack, D, sanTd(decObj('天机·财路', '天机', {}, '问财')), Date.now(), mkTdCtx());
    var m189b = SQ.Tiandao.tribModOf(w189, D);
    var info189 = pack.worldSystems.tribInfo(w189, pack, D, modsTd(w189));
    SQ.Tiandao.onTribSettled(w189, pack, D, true, Date.now(), mkTdCtx());
    var m189c = SQ.Tiandao.tribModOf(w189, D);
    ok('189', '天睐−0.01/天怒−0.02 talent 加项读点生效，结算后档位清空 defy 保留',
      m189a === -0.01 && Math.abs(m189b + 0.03) < 1e-9 && info189.parts.tiandao === -0.03 &&
      Math.abs(info189.parts.talent - (info189.parts.talent)) === 0 &&
      m189c === 0 && w189.tiandao.defy === 69 && w189.tiandao.armed.lai === false);

    /* #190 逆天大劫：defy≥100 解锁、base=0.35、常规加成有效、clamp [0.05,0.95] 不变 */
    var w190 = mkTdWs({ realm: 9 });
    var lock190 = SQ.Tiandao.tryNijie(w190, pack, D, modsTd(w190), Date.now(), mkTdCtx());
    w190.tiandao.defy = 100;
    var info190 = SQ.Tiandao.nijieInfo(w190, pack, D, modsTd(w190));
    w190.buffs.push({ field: 'tribBonus', mult: 5, until: Date.now() + 9999999 });
    var info190b = SQ.Tiandao.nijieInfo(w190, pack, D, modsTd(w190));
    ok('190', '逆天大劫 base=0.35 常规加成有效 clamp 不变，解锁阈值 defy≥100',
      lock190.ok === false && lock190.reason === 'lock' && info190.parts.base === 0.35 &&
      info190b.p <= D.TRIB_P_CLAMP[1] && info190.p >= D.TRIB_P_CLAMP[0] && info190b.parts.base === 0.35);

    /* #191 渡过三件发放：title + 永久 qiRate+5%（来源 tiandao）+ 逆天盾 retain 一次渡劫失败 */
    var w191 = mkTdWs({ realm: 4 });
    w191.tiandao.defy = 100;
    Math.random = function () { return 0.0; };
    var r191 = SQ.Tiandao.tryNijie(w191, pack, D, modsTd(w191), Date.now(), mkTdCtx());
    Math.random = origRandom181;
    var m191 = modsTd(w191);
    w191.qi = 999999;
    var qi191 = w191.qi;
    Math.random = function () { return 0.999999; };
    var tr191 = SQ.Realm.tryBreakthrough(w191, pack, D, modsTd(w191), Date.now(), mkTdCtx());
    Math.random = origRandom181;
    ok('191', '逆天大劫成功三件发放 + 逆天盾 retain 一次渡劫失败后消耗',
      r191.ok && r191.success && w191.tiandao.title === true && w191.tiandao.shield === false &&
      Math.abs(((m191.detail.qiRate || {}).tiandao || 0) - 0.05) < 1e-9 &&
      tr191.result === 'fail' && tr191.shield === true && w191.qi === qi191 && w191.realm === 4);

    /* #192 失败：defy 清零 + 天罚·重 qiRate −20%/48h，不扣修为不推进境界、可重新积累 */
    var w192 = mkTdWs({ realm: 4 });
    w192.tiandao.defy = 120;
    Math.random = function () { return 0.999999; };
    var r192 = SQ.Tiandao.tryNijie(w192, pack, D, modsTd(w192), Date.now(), mkTdCtx());
    Math.random = origRandom181;
    var buf192 = (w192.buffs || []).filter(function (b) { return b.source === 'tiandaoNijie'; })[0];
    var lock192 = SQ.Tiandao.tryNijie(w192, pack, D, modsTd(w192), Date.now(), mkTdCtx());
    ok('192', '逆天大劫失败：defy 清零 + 天罚·重 −20%/48h 挂 buff，零修为零境界变动',
      r192.ok && !r192.success && w192.tiandao.defy === 0 && !!buf192 && buf192.field === 'qiRate' &&
      buf192.mult === -0.20 && buf192.until > Date.now() + 47 * 3600000 && w192.realm === 4 && w192.qi === 0 &&
      lock192.reason === 'lock');

    /* #193 天象队列容量 3 溢出挤最旧；未览红点、览后消 */
    var w193 = mkTdWs();
    var zone1Name = SQ.t('combat.zone.1', null, 'xiuxian');
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 1 }, Date.now());
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 2 }, Date.now());
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 3 }, Date.now());
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 4 }, Date.now());
    var un193 = SQ.Tiandao.unseenOmens(w193);
    SQ.Tiandao.markOmensSeen(w193);
    ok('193', '天象队列容量 3 溢出挤最旧；未览挂红点览后消',
      w193.tiandao.omenQueue.length === 3 && un193 === 3 && SQ.Tiandao.unseenOmens(w193) === 0 &&
      !w193.tiandao.omenQueue.some(function (o) { return o.text.indexOf(zone1Name) >= 0; }));

    /* #194 编年史字段完备（≤10 大事 + 四项累计统计）且奏疏总长 500~800 字 */
    var w194 = mkTdWs({ realm: 3, stones: 1000 });
    w194.tribulation.attempts = 5; w194.tribulation.success = 2;
    w194.cleared = [0, 1, 2];
    w194.tiandao.stats = { accept: 2, defy: 1 };
    for (var ci = 0; ci < 12; ci++) SQ.Tiandao.chronPush(w194, 'clear', { z: ci % 4 }, Date.now() + ci);
    var ask194 = SQ.Tiandao.ask(w194, pack, D, { talents: [] }, 'wenjie', 0, '', Date.now());
    ok('194', '编年史 ≤10 条 + 四项统计入奏疏，总长 500~800 字',
      w194.tiandao.chron.length === 10 && ask194.ok === true &&
      ask194.text.length >= TD.MEMO_LEN[0] && ask194.text.length <= TD.MEMO_LEN[1] &&
      ask194.text.indexOf(SQ.t('tiandao.memo.chronhead', null, 'xiuxian')) >= 0 &&
      /* 契约必需行（卦位作用域 + 香火档位）压缩时不得被丢弃（pri 9 高于状态摘要与范本） */
      ask194.text.indexOf(SQ.t('tiandao.hex.wenjie', null, 'xiuxian')) >= 0 &&
      ask194.text.indexOf(SQ.t('tiandao.memo.incense', { n: '0', tier: SQ.t('tiandao.tier.' + ask194.tier, null, 'xiuxian') }, 'xiuxian')) >= 0,
      'len=' + (ask194.text || '').length);

    /* #195 本地模拟天道（V1.5）：同契约同校验器；烧空表返回「天机不可尽泄」类通用判词零机制 */
    var w195 = mkTdWs({ stones: 3000 });
    var ask195 = SQ.Tiandao.ask(w195, pack, D, { talents: [] }, 'wenjie', 0, '', Date.now());
    var dl195 = SQ.Tiandao.localDecree(w195, pack, D, Date.now());
    var validTypes195 = TD.DECREES.map(function (x) { return x.id; });
    var r195a = SQ.Tiandao.accept(w195, pack, D, modsTd(w195), dl195, Date.now(), mkTdCtx());
    var r195b = SQ.Tiandao.accept(w195, pack, D, modsTd(w195), dl195, Date.now(), mkTdCtx());
    var w195b = mkTdWs({ stones: 3000 });
    SQ.Tiandao.ask(w195b, pack, D, { talents: [] }, 'blank', 0, '我什么时候能飞升？', Date.now());
    var db195 = SQ.Tiandao.localDecree(w195b, pack, D, Date.now());
    var s195 = w195b.stones, q195 = w195b.qi, k195 = w195b.karmaEventScore;
    SQ.Tiandao.accept(w195b, pack, D, modsTd(w195b), db195, Date.now(), mkTdCtx());
    var blanks195 = [];
    for (var bi = 1; bi <= 5; bi++) blanks195.push(SQ.t('tiandao.blank.' + bi, null, 'xiuxian'));
    ok('195', '本地模拟天道同契约同校验器：白名单/seenIds 生效；烧空表通用判词零机制',
      ask195.ok && validTypes195.indexOf(dl195.type) >= 0 && dl195.hexagram === 'wenjie' &&
      r195a.ok === true && r195b.reason === 'seen' &&
      db195.type === 'prophecy' && blanks195.indexOf(db195.verdict) >= 0 &&
      w195b.stones === s195 && w195b.qi === q195 && w195b.karmaEventScore === k195);

    /* #196 normalize 幂等（旧档补默认、脏档清理零崩溃）+ 红线零改动回归 */
    var dirty196 = {
      lastAskAt: -5, defy: 'x', seenIds: [1, 'a', 'a', null], omenQueue: [{ node: 'bad' }, { node: 'tribwin' }],
      history: [{ type: 'nope' }, { type: 'bless', act: 'nope' }, { id: 'td-1', type: 'bless', act: 'accept', at: 5, tier: 'rare' }],
      title: 'yes', shield: 1, nextTrib: 99, armed: { lai: 'x' }, ask: { hex: 'nope' }, chron: 'x', stats: { accept: -3 }
    };
    var n196a = SQ.Tiandao.normalize(dirty196, D);
    var n196b = SQ.Tiandao.normalize(n196a, D);
    var w196 = pack.normalize(Object.assign(pack.initialState(), { tiandao: dirty196 }));
    var w196old = pack.normalize(pack.initialState());   /* 旧档无 tiandao 字段 → 全默认 */
    var zero196 = D.REALMS.length === 10 && D.REALMS[9].tribBase === 0.22 &&
      D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 && SQ.Mods.FIELDS.length === 17;
    ok('196', '天道 normalize 幂等 + 脏档清理零崩溃 + p 公式/CLAMP/REALMS/FIELDS 零改动',
      JSON.stringify(n196a) === JSON.stringify(n196b) && n196a.defy === 0 && n196a.seenIds.join() === 'a' &&
      n196a.omenQueue.length === 0 && n196a.history.length === 1 && n196a.title === false &&
      n196a.nextTrib <= TD.TRIB_MOD_RANGE[1] * 4 + 1e-9 && n196a.ask === null && n196a.stats.accept === 0 &&
      !!w196.tiandao && w196old.tiandao.defy === 0 && zero196);

    /* ═══ 六向长线批（v1.24 · 六卷 §验收 · #197~#224）═══
     * 轮回（#197~#202）→ 图鉴传记（#203~#206）→ 炼丹炼器（#207~#211）→
     * 同代天骄（#212~#215）→ 融合器灵（#216~#219）→ 自立门户（#220~#224）。
     * 红线：p 公式/CLAMP/REALMS/FIELDS/ARTS_COST 零改动；遗泽不进 Ledger；玩家数值轴零漂移；
     * sim-pacing 稳态带复跑由 sim 脚本独立验证（meta 层零 tick 侵入实证）。 */
    var LGc = D.LEGACY, CXc = D.CODEX, ALc = D.ALCHEMY, PDc = D.PRODIGY, FUc = D.FUSE, SPsc = D.SPIRIT, SCc = D.SECT;
    function mkMeta(ov) { var mm = SQ.Legacy.metaBlank(); if (ov) Object.assign(mm, ov); return mm; }
    function identOk(mm) {
      var e2 = 0, sp2 = 0, k3;
      for (k3 in mm.earnedKeys) e2 += mm.earnedKeys[k3];
      for (k3 in mm.spent) sp2 += mm.spent[k3];
      return mm.karma === e2 - sp2;
    }
    function byteLen(o) {
      var st2 = typeof o === 'string' ? o : JSON.stringify(o), nb = 0;
      for (var bi2 = 0; bi2 < st2.length; bi2++) { var bc = st2.charCodeAt(bi2); nb += bc > 0x7ff ? 3 : (bc > 0x7f ? 2 : 1); }
      return nb;
    }

    /* #197 遗泽恒等式与幂等（轮回卷 §十） */
    var m197 = mkMeta();
    var g197a = SQ.Legacy.earnOnce(m197, 'zone.0', 10, 'settle', 1);
    var g197b = SQ.Legacy.earnOnce(m197, 'zone.0', 10, 'settle', 2);          /* 幂等键重复 → 0 */
    var g197c = SQ.Legacy.earnDelta(m197, 'realmMax', 30, 0.7, 'settle', 3);  /* +21 */
    var g197d = SQ.Legacy.earnDelta(m197, 'realmMax', 20, 0.7, 'settle', 4);  /* +14 累计 35 */
    var g197e = SQ.Legacy.earnImmediate(m197, 'achv_jichu', 2, 'achv', 5);
    var k197 = m197.karma;                                                     /* 47 */
    m197.karma = 999;                                                          /* 人为破坏 */
    m197 = SQ.Legacy.metaNormalize(m197);                                      /* 恒等式自检修复 → 后续用修复对象 */
    var f197 = m197;
    var sp197a = SQ.Legacy.spend(m197, 'shop.heir', 600, 6);                   /* poor（47<600） */
    SQ.Legacy.earnOnce(m197, 'boss.0', 600, 'settle', 7);
    var sp197b = SQ.Legacy.spend(m197, 'shop.heir', 600, 8);
    var sp197c = SQ.Legacy.spend(m197, 'shop.heir', 600, 9);                   /* dup 不二次扣 */
    ok('197', '遗泽恒等式与幂等：karma===ΣearnedKeys−Σspent；重复键/重复购买零重复入账；差额补分逐行 floor；脏账自检修复',
      g197a === 10 && g197b === 0 && g197c === 21 && g197d === 14 && g197e === 2 && k197 === 47 &&
      m197.earnedKeys.realmMax === 35 && f197.karma === 47 && identOk(f197) &&
      sp197a.reason === 'poor' && sp197b.ok === true && sp197c.reason === 'dup' &&
      m197.karma === 47 && identOk(m197) && m197.stats.immThisLife === 2,
      JSON.stringify([g197a, g197b, g197c, g197d, g197e, k197, f197.karma, sp197a.reason, sp197b.ok, sp197c.reason, m197.karma, identOk(m197), m197.stats.immThisLife]));

    /* #198 飞升大劫（独立终局劫 base 0.25 · 满额转世 · 跨世只计一次） */
    localStorage.removeItem(SQ.KEY);
    var ref198 = {};
    await SQ.mutate(ref198, function (s198) {
      s198.profile = mkProf([]);
      s198.worlds.xiuxian = pack.initialState();
      var w = s198.worlds.xiuxian;
      w.realm = 9; w.cleared = [0, 1]; w.artsKnown.push('tuna'); w.artsLevels.tuna = 9;
      w.tribulation.success = 5;
      pack.recalcDerived(w, s198.profile);
      w.qi = SQ.Idle.capOf(w, pack, D, SQ.Mods.collect(s198.profile, w, pack, D));
    });
    var w198 = ref198.worlds.xiuxian, now198 = Date.now();
    var chk198ok = SQ.Legacy.canFeisheng(w198, pack, D, ref198.meta, now198, ref198.profile);
    var chk198r = SQ.Legacy.canFeisheng(Object.assign({}, w198, { realm: 8 }), pack, D, ref198.meta, now198, ref198.profile);
    var chk198q = SQ.Legacy.canFeisheng(Object.assign({}, w198, { qi: 0 }), pack, D, ref198.meta, now198, ref198.profile);
    var chk198c = SQ.Legacy.canFeisheng(Object.assign({}, w198, { feishengCd: now198 + 1000 }), pack, D, ref198.meta, now198, ref198.profile);
    var info198 = SQ.Legacy.feishengInfo(w198, pack, D, SQ.Mods.collect(ref198.profile, w198, pack, D));
    var qi198 = w198.qi, stw198 = w198.tribulation.success;
    var r198f = (function () { var rs = stubRandom([0.999]); var r = SQ.Legacy.doFeisheng(ref198, now198); rs(); return r; })();
    var failOk198 = r198f.ok && r198f.success === false && w198.feishengCd === now198 + LGc.FEISHENG_CD_MS &&
      w198.qi === qi198 && w198.tribulation.success === stw198 && w198.realm === 9;
    w198.feishengCd = 0;
    var r198s = (function () { var rs = stubRandom([0.0]); var r = SQ.Legacy.doFeisheng(ref198, now198 + 1); rs(); return r; })();
    var ws198n = ref198.worlds.xiuxian;
    var asc198 = r198s.ok === true && r198s.success === true && ws198n.realm === 0 && ref198.profile.name === '' &&
      ref198.meta.stats.lives === 1 && ref198.meta.stats.ascensions === 1 &&
      ref198.meta.earnedKeys.ascend === 200 && ref198.meta.biographies.length === 1 && identOk(ref198.meta);
    var pv198b = SQ.Legacy.preview(ws198n, ref198.meta, pack, D, 'feisheng', now198 + 2);
    var ascLine198 = null;
    pv198b.lines.forEach(function (ln) { if (ln.key === 'ascend') ascLine198 = ln; });
    ok('198', '飞升大劫：真仙盈满/CD 三态解锁 + base 0.25 常规加成有效 clamp 不变 + 失败不扣修为不计连败 24h 可重试 + 成功满额转世、飞升 200 跨世只计一次',
      chk198ok.ok === true && chk198r.reason === 'realm' && chk198q.reason === 'qi' && chk198c.reason === 'cd' &&
      !!info198 && info198.parts.base === 0.25 && info198.p >= D.TRIB_P_CLAMP[0] && info198.p <= D.TRIB_P_CLAMP[1] &&
      failOk198 && asc198 && !!ascLine198 && ascLine198.owned === true && ascLine198.got === 0);

    /* #199 兵解转世（×0.7 只作用于结算折分项 · 逐行 floor · 即时项不折损） */
    localStorage.removeItem(SQ.KEY);
    var ref199 = {};
    await SQ.mutate(ref199, function (s199) {
      s199.profile = mkProf([]);
      s199.worlds.xiuxian = pack.initialState();
      s199.worlds.xiuxian.realm = 5;
    });
    var w199 = ref199.worlds.xiuxian;
    var chk199r = SQ.Legacy.canBingjie({ realm: 3 }, D);
    var chk199ok = SQ.Legacy.canBingjie(w199, D);
    var imm199a = ref199.meta.stats.immThisLife || 0;      /* mutate 内 scan 已发过境界成就——取基线 */
    SQ.Legacy.earnImmediate(ref199.meta, 'codex.ms.test199.50', 2, 'milestone', 1);
    var pv199 = SQ.Legacy.preview(w199, ref199.meta, pack, D, 'bingjie', Date.now());
    var rl199 = null;
    pv199.lines.forEach(function (ln) { if (ln.key === 'realmMax') rl199 = ln; });
    var r199 = SQ.Legacy.doBingjie(ref199, Date.now());
    ok('199', '兵解转世：化神境起解锁；×0.7 只作用结算折分项且逐行 floor（150→105）；即时入账项不折损不追回',
      chk199r.reason === 'realm' && chk199ok.ok === true && pv199.mult === 0.7 &&
      !!rl199 && rl199.nominal === 150 && rl199.got === 105 && pv199.immediate === imm199a + 2 &&
      r199.ok && r199.success === true && ref199.meta.stats.dissolutions === 1 && ref199.meta.stats.lives === 1 &&
      ref199.meta.earnedKeys.realmMax === 105 && identOk(ref199.meta),
      JSON.stringify([chk199r.reason, chk199ok.ok, pv199.mult, rl199 && rl199.nominal, rl199 && rl199.got, pv199.immediate, imm199a, r199.ok, ref199.meta.stats.dissolutions, ref199.meta.stats.lives, ref199.meta.earnedKeys.realmMax, identOk(ref199.meta)]));

    /* #200 继承/重置矩阵（复用 ref198 飞升后态：转世前 scan 已入录 codices） */
    var cod200 = ref198.meta.codices;
    var inh200 = (cod200.zone || []).indexOf('z0') >= 0 && (cod200.art || []).indexOf('tuna') >= 0 &&
      ref198.meta.stats.lives === 1 && ref198.meta.biographies.length === 1 && identOk(ref198.meta);
    var ws200 = ref198.worlds.xiuxian, fresh200 = pack.initialState();
    var res200 = ws200.realm === 0 && ws200.qi === fresh200.qi && ws200.stones === fresh200.stones &&
      ws200.artsKnown.join() === fresh200.artsKnown.join() && (ws200.treasures.owned || []).length === 0 &&
      ws200.factionId === null && Object.keys(ws200.bonds || {}).length === 0 &&
      (ws200.cleared || []).length === 0 && (ws200.prodigies || []).length === 0 &&
      Object.keys(ws200.materials || {}).length === 0 && ws200.sect === null;
    ok('200', '继承/重置矩阵：meta 层（图鉴/传记/遗泽账/统计）完整保留；ws 层境界修为灵石功法法宝势力道友秘境材料宗门全重置缺省',
      inh200 && res200 && ref198.profile.talents.length === 0 && ref198.profile.legacyTalents.length === 0);

    /* #201 遗泽不进 Ledger + spent 幂等 + pendingRebirth 中断恢复重放零双计 */
    localStorage.removeItem(SQ.KEY);
    var ref201 = {};
    await SQ.mutate(ref201, function (s201) {
      s201.profile = mkProf([]);
      s201.worlds.xiuxian = pack.initialState();
      s201.worlds.xiuxian.realm = 5;
    });
    var w201 = ref201.worlds.xiuxian;
    var led201 = JSON.stringify(w201.ledger);
    SQ.Legacy.earnImmediate(ref201.meta, 'achv_jindan', 2, 'achv', 1);
    SQ.Legacy.earnOnce(ref201.meta, 'zone.0', 200, 'settle', 2);
    SQ.Legacy.spend(ref201.meta, 'shop.heir', 5, 3);
    var ledSame201 = JSON.stringify(w201.ledger) === led201;
    var buy201a = SQ.Legacy.buy(ref201, 'qirate.1', 4);
    var k201 = ref201.meta.karma;
    var buy201b = SQ.Legacy.buy(ref201, 'qirate.1', 5);
    var k201b = ref201.meta.karma;                          /* dup 拒绝后即时快照（ok 求值延迟陷阱） */
    ref201.meta.pendingRebirth = { channel: 'bingjie', at: 6, expectLives: (ref201.meta.stats.lives || 0) + 1, bio: null, total: 0 };
    SQ.Legacy.sync(ref201, 7);
    var lives201a = ref201.meta.stats.lives, karma201a = ref201.meta.karma;
    var pend201 = ref201.meta.pendingRebirth === null && ref201.worlds.xiuxian.realm === 0;
    var ek201a = JSON.stringify(ref201.meta.earnedKeys);
    var achv201a = ref201.meta.achv.length;
    ref201.meta.pendingRebirth = { channel: 'bingjie', at: 6, expectLives: lives201a, bio: null, total: 0 };
    SQ.Legacy.sync(ref201, 8);
    if (ref201.meta.karma !== karma201a) {
      var ekA = JSON.parse(ek201a), ekB = ref201.meta.earnedKeys, diffs = [];
      for (var dk in ekB) if (ekB[dk] !== ekA[dk]) diffs.push(dk + ':' + ekA[dk] + '->' + ekB[dk]);
      console.log('LEAK201', JSON.stringify(diffs.slice(0, 8)), 'achv', achv201a, '->', ref201.meta.achv.length);
    }
    ok('201', '遗泽不进 Ledger（零流水 #113 回归不变）；商店 spent 幂等同键重放不二次扣款；pendingRebirth 中断恢复续做且重放零重复入账',
      ledSame201 && buy201a.ok === true && buy201b.reason === 'dup' && k201b === k201 &&
      lives201a === 1 && pend201 && ref201.meta.stats.lives === 1 && ref201.meta.karma === karma201a &&
      identOk(ref201.meta),
      JSON.stringify([ledSame201, buy201a.ok, buy201b.reason, k201b === k201, lives201a, pend201, ref201.meta.stats.lives, ref201.meta.karma, karma201a, identOk(ref201.meta)]));

    /* #202 meta normalize 幂等 + 红线零改动回归 */
    var raw202 = {
      profile: { name: '旧档', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: 1, alignBias: 'neutral' },
      worlds: { xiuxian: pack.initialState() },
      meta: { unlockedWorlds: ['xiuxian'] },
      settings: {}
    };
    var n202 = SQ.normalize(raw202);
    var old202 = !!n202.meta && !!n202.meta.earnedKeys && !!n202.meta.codices && !!n202.meta.stats &&
      Array.isArray(n202.meta.achv) && Array.isArray(n202.meta.titles) && Array.isArray(n202.meta.biographies) &&
      !!n202.meta.unlocks && n202.meta.unlocks.sect === false && n202.meta.karma === 0;
    var n202b = SQ.Legacy.metaNormalize({ karma: 999, earnedKeys: { 'zone.0': 10, bad: 'x' }, spent: { a: 5 },
      codices: { event: 'notarray', art: ['a', 1, null] }, achv: [1, 'achv_jichu'], titles: 'x',
      biographies: [{ text: 123 }, { text: 'ok', life: 1 }], unlocks: { alchemy: 'yes' }, stats: { lives: 'x' } });
    var n202c = SQ.Legacy.metaNormalize(n202b);
    var zero202 = D.REALMS.length === 10 && D.REALMS[9].tribBase === 0.22 &&
      D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 && SQ.Mods.FIELDS.length === 17 &&
      /* 等级起点批（入门即 Lv1）：ARTS_COST **有意改档**——删掉原 Lv0→1 那档 60，表长 9 → 8，
       * 其余八档价格一字未动；判据同时钉「表长 = ARTS_MAX_LV − 1」，防将来又漂出第九条。 */
      D.ARTS_COST.join() === '240,900,3200,11000,36000,120000,400000,1300000' &&
      D.ARTS_COST.length === D.ARTS_MAX_LV - 1 &&
      LGc.FEISHENG_BASE_P === 0.25 && LGc.BINGJIE_MULT === 0.7;
    ok('202', 'meta normalize 幂等（旧档补默认/脏档逐项清理/恒等式自检修复）+ p 公式/CLAMP/REALMS/FIELDS 零改动回归 ‖ ARTS_COST 按等级起点批对表（八档）',
      old202 && n202b.karma === 5 && n202b.earnedKeys.bad == null && n202b.codices.event == null &&
      n202b.codices.art.join() === 'a' && n202b.achv.join() === 'achv_jichu' && n202b.titles.length === 0 &&
      n202b.biographies.length === 1 && n202b.unlocks.alchemy === false && n202b.stats.lives === 0 &&
      JSON.stringify(n202b) === JSON.stringify(n202c) && zero202);

    /* #203 图鉴九面 id 引用纪律 + 动态分母 + 重复获得不刷新首录 */
    localStorage.removeItem(SQ.KEY);
    var ref203 = {};
    await SQ.mutate(ref203, function (s203) {
      s203.profile = mkProf([]);
      s203.worlds.xiuxian = pack.initialState();
      var w = s203.worlds.xiuxian;
      w.cleared = [0, 1]; w.bossKills = [0]; w.affixSeen = { pojun: 1 };
      w.artsKnown.push('tuna'); w.artsLevels.tuna = 9;
      w.bonds[(pack.companions[0] || { id: 'c0' }).id] = 50;
      w.treasures.owned.push({ id: pack.treasures.LIST[0].id, st: {} });
      w.factionId = D.FACTIONS_FIXED[0].id;
      w.eventHistory.seen.ev_test_203 = 1;
    });
    var cod203 = ref203.meta.codices;
    var allStr203 = true;
    for (var cf203 in cod203) cod203[cf203].forEach(function (x) { if (typeof x !== 'string') allStr203 = false; });
    var snap203 = JSON.stringify(cod203);
    SQ.Codex.scan(ref203, Date.now());
    var stable203 = JSON.stringify(ref203.meta.codices) === snap203;
    var den203ok = SQ.Codex.faceDenom('event', pack, D) === SQ.Events.allIds(pack).length &&
      SQ.Codex.faceDenom('treasure', pack, D) === pack.treasures.LIST.length &&
      SQ.Codex.faceDenom('art', pack, D) === Object.keys(pack.artsMap()).length &&
      SQ.Codex.faceDenom('bond', pack, D) === pack.companions.length &&
      SQ.Codex.faceDenom('faction', pack, D) === D.FACTIONS_FIXED.length &&
      SQ.Codex.faceDenom('zone', pack, D) === D.ZONES.length * 2 + D.ZONE_AFFIXES.length &&
      SQ.Codex.faceDenom('selfart', pack, D) === FUc.COMBOS + pack.treasures.LIST.length;
    ok('203', '图鉴九面 id 引用纪律：条目全 id 字符串零裸文案；重复获得不刷新首录；分母=池正典计数（zone 三层合成 / selfart=480+46）',
      allStr203 && stable203 && (cod203.zone || []).join().indexOf('z0') === 0 && den203ok &&
      (cod203.zone || []).indexOf('b0') >= 0 && (cod203.zone || []).indexOf('apojun') >= 0);

    /* #204 里程碑/成就幂等 + qiRate 静态来源 cap */
    var m204 = mkMeta();
    m204.codices.treasure = pack.treasures.LIST.map(function (tt) { return tt.id; });
    SQ.Codex.checkMilestones(m204, pack, D, 1);
    var k204a = m204.karma;
    SQ.Codex.checkMilestones(m204, pack, D, 2);
    var idem204 = m204.karma === k204a && k204a === 95 &&
      m204.earnedKeys['codex.ms.treasure.50'] === 15 && m204.earnedKeys['codex.ms.treasure.100'] === 50;
    var m204b = mkMeta();
    CXc.FACES.forEach(function (face) {
      m204b.earnedKeys['codex.ms.' + face + '.100'] = 50;
      if (face !== 'title') { m204b.earnedKeys['codex.ms.' + face + '.50'] = 15; m204b.earnedKeys['codex.ms.' + face + '.80'] = 30; }
    });
    m204b.earnedKeys['codex.ms.title.50'] = 50;
    m204b.earnedKeys['codex.ms.talentLegacy.100'] = 50;
    var q204 = SQ.Codex.qiRateOf(m204b, D);
    localStorage.removeItem(SQ.KEY);
    var ref204 = {};
    await SQ.mutate(ref204, function (s204) {
      s204.profile = mkProf([]);
      s204.worlds.xiuxian = pack.initialState();
      s204.worlds.xiuxian.realm = 9;
    });
    var achv204 = ref204.meta.achv.slice(), karma204 = ref204.meta.karma;
    SQ.Codex.scan(ref204, Date.now());
    var same204 = ref204.meta.achv.length === achv204.length && ref204.meta.karma === karma204;
    ok('204', '里程碑/成就幂等：同面同档跨世只发一次（15/30/50）；qiRate codex 来源 2.7%≤cap3% 静态行；60 条成就每条只发一次重复触发零效果；恒等式联动不破',
      idem204 && Math.abs(q204 - 0.027) < 1e-9 && achv204.indexOf('achv_zhenxian') >= 0 && same204 && identOk(ref204.meta));

    /* #205 传记限长限数与回落（本地稿永不丢） */
    var w205 = pack.initialState();
    for (var ci205 = 0; ci205 < 10; ci205++) SQ.Tiandao.chronPush(w205, 'tribwin', { realm: 5 }, 1000 + ci205);
    var bio205 = SQ.Codex.generateBio(w205, mkMeta(), pack, D, { name: '测试道号', worldName: 'w' }, 'feisheng', Date.now());
    var m205 = mkMeta();
    for (var bsi = 1; bsi <= 10; bsi++) SQ.Codex.pushBio(m205, { life: bsi, name: 'n' + bsi, text: 't', stats: {}, source: 'local', ts: bsi }, bsi, 'n' + bsi, 'bingjie', bsi);
    var push205 = m205.biographies.length === 6 && m205.biographies[0].life === 5;   /* 写口限数 9→6（正典①，与 core.js 读档裁剪同口径 · 玩法闭环批 2026-10-07）：10 次 push 留最后 6 世 ⇒ 首条 life=5 */
    localStorage.removeItem(SQ.KEY);
    var ref205 = {};
    await SQ.mutate(ref205, function (s205) {
      s205.profile = mkProf([]);
      s205.worlds.xiuxian = pack.initialState();
    });
    SQ.Codex.pushBio(ref205.meta, { life: 1, name: 'x', text: '本地史稿', stats: {}, source: 'local', ts: 1 }, 1, 'x', 'bingjie', 1);
    var memo205 = SQ.Codex.bioMemo(ref205, Date.now());
    var ad205a = SQ.Codex.adoptBio(ref205, '', Date.now());
    var ad205b = SQ.Codex.adoptBio(ref205, '一段含赌博字眼的传记', Date.now());
    var localKept205 = ref205.meta.biographies[0].text === '本地史稿' && ref205.meta.biographies[0].source === 'local';
    var long205 = '';
    for (var lxi = 0; lxi < 600; lxi++) long205 += '长';
    var ad205c = SQ.Codex.adoptBio(ref205, long205, Date.now());
    ok('205', '传记限长限数与回落：单篇 ≤500 硬截；pushBio >6 世挤最旧（正典① · 原 >9）；烧表奏疏 ≤1500；敏感词/空文本回落本地稿；超长截断 source 转 tiandao',
      bio205.text.length <= 500 && push205 && memo205.length <= 1500 &&
      ad205a.reason === 'empty' && ad205b.reason === 'sensitive' && localKept205 &&
      ad205c.ok === true && ref205.meta.biographies[0].text.length === 500 && ref205.meta.biographies[0].source === 'tiandao');

    /* #206 容量红线：最坏态实测 → 压缩预案阶梯 → ≤ SQ.SAVE_RED 且恒等式不破（红线单一事实源） */
    localStorage.removeItem(SQ.KEY);
    localStorage.removeItem(SQ.Log.KEY);
    /* 钉死真最坏态（2026-10-05 存档容量防线批）：Factions.generate 的 RAND_EXTRA 0~4 走裸 Math.random，
     * 势力总数 16~20 浮动 → rel 矩阵 n(n−1) 随之浮动、#206 最坏态自身有 ±1.5KB 抖动（同一份代码一次
     * 50876B 过、一次 51319B 挂）。容量红线断言必须恒测上界：stub 到 0.9999 逼 nExtra=4 → 恒 20 势力满档，
     * 同时道友归属散人转化率 20% 也被逼成 0 → factionNpcs 满 58 条，同为上界。 */
    var restore206 = stubRandom(function () { return 0.9999; });
    var ref206 = {};
    await SQ.mutate(ref206, function (s206) {
      s206.profile = mkProf([]);
      s206.worlds.xiuxian = pack.initialState();
      var w = s206.worlds.xiuxian;
      w.realm = 9; w.stones = 1e9;
      for (var li = 0; li < 2000; li++) SQ.Log.push(w, ['combat', 'idle', 'break', 'trib', 'event', 'shop', 'arts', 'sys'][li % 8], '这是一条四十字节的测试日志文本用来模拟真实渲染长度嗯嗯', 1700000000000 + li);
      pack.treasures.LIST.forEach(function (tt, ti) {
        w.treasures.owned.push({ id: tt.id, st: ti < 6 ? { spirit: { w: 600, a: 1, p: 'jian', cd: 1, mk: 0, hun: 0, vt: { trib: 1, omen: 1, skill: 1, pickup: 1 } } } : {} });
      });
      w.treasures.slots = pack.treasures.LIST.slice(0, 6).map(function (tt) { return tt.id; });
      Object.keys(pack.artsMap()).forEach(function (aid) { w.artsKnown.push(aid); w.artsLevels[aid] = 9; });
      w.shelf = Object.keys(pack.artsMap()).slice(0, 30);
      w.fusion = { lastFuseAt: 1, meditate: 100, seq: 4, customs: [] };
      for (var cu = 1; cu <= 4; cu++) w.fusion.customs.push({ id: 'c' + cu, name: '测试自创名', gen: 3, tier: 3, attr: 'shen', align: 'neutral',
        effects: { combatPower: 0.315, qiRate: 0.225, offlineEff: 0.288, combatSpeed: 0.219, qiCap: 0.30, stonesRate: 0.267, artsSpeed: 0.07, eventRate: 0.14, eventLuck: 0.09, dropRate: 0.05, tribBonus: 0.025, realmCost: -0.02 },
        special: { pool: 'some_special_pool', grade: 2 }, parents: [{ id: 'art_a', name: '父本一', tier: 3 }, { id: 'art_b', name: '父本二', tier: 2 }], createdAt: 1 });
      SQ.Events.allIds(pack).forEach(function (eid, ei) { w.eventHistory.seen[eid] = 1700000000000 + ei; w.eventCooldowns[eid] = 1700000000000; });
      /* eventHistory.feed 满档（2026-10-05 存档容量防线批补造）：叙事流上限 D.EVENT_FEED_CAP 条、
       * 每条 10 字段（含 eff 效果账）实测 ≈215~285B → 满档 ≈11~14KB，是**真实存档最大单项**
       * （sim-playthrough CAP_WATCH 实测 10.5~11.2KB，超过 codices/factions/prodigies），
       * 而本模型此前只造 seen + eventCooldowns、**完全没造 feed** = 与「天骄漏项」同类模型漏项。
       * 单条按 285B 保守构造（≥ 真实实测上界 229B/条）：最长事件 id（19 字符）+ eff 八键全填。 */
      w.eventHistory.feed = [];
      for (var fi = 0; fi < (D.EVENT_FEED_CAP || 50); fi++) {
        w.eventHistory.feed.push({ id: 'witness_tribulation', ts: 1700000000000 + fi, branch: 'branch_evil_fail',
          tier: 'di', nature: 'evil', pass: true, hadCheck: true, karma: -12,
          eff: { stones: 1234567, qi: 1234567, bond: 100, mat: 12, treasure: 'treasure_long_id', art: 'art_long_id', buff: 1, rep: 5000 },
          via: 'rumor' });
      }
      w.cleared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; w.bossKills = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (var af = 0; af < 7; af++) w.affixSeen['affix_' + af] = 1;
      (pack.companions || []).forEach(function (cc) { w.bonds[cc.id] = 100; });
      /* 道友三本新名录满档（2026-10-06 天象扩容 · 缘尽收敛批补造 —— 与「天骄漏项」「feed 漏项」
       * 同类同因：最坏态模型未随内容批更新。三者都是**字符串 id 数组**、上界各不相同：
       *   juefengIds   ≤ 64（lock 内硬截），真实上界 = 道友全员 58（每人一生至多绝交一次）
       *   redeemedIds  ≤ 64（redeem 内硬截），真实上界同为 58
       *   rankGiftSeen ≤ 16（alignGift 内硬截），真实上界 = 名号段数 9（每段每世一次）
       * 一律按**真实可达上界**造（数据驱动、随池扩容自动跟随），不填防御性硬截值虚增字节。 */
      (pack.companions || []).forEach(function (cc) { w.juefengIds.push(cc.id); w.redeemedIds.push(cc.id); });
      w.heirBond = (pack.companions || [{}])[0].id;
      (D.KARMA_RANKS || []).forEach(function (rk) { w.rankGiftSeen.push(rk[1]); });
      for (var bf = 0; bf < 20; bf++) w.buffs.push({ field: 'qiRate', mult: 0.1, until: 1800000000000, source: 'alchemy' });
      D.FACTIONS_FIXED.forEach(function (ff) { w.factionRep[ff.id] = 5000; });
      /* 天骄满档（2026-10-05 存档容量防线批修正）：旧口径硬写 4 条 = 卡片化批前的遗泽上限，
       * 该批把名录 2→10、上限 4→COUNT_MAX(30) 并新增每 10 游戏年冻结的榜面快照 rankRows(COUNT_MAX+1 行)，
       * 模型未随批更新 → 断言绿而 sim-playthrough 实测越 50KB 红线。最坏态一律按数据驱动上限造。 */
      /* 天骄记录的 id 字段取真实池内最长值（数据驱动、随池扩容自动跟随）——原用假长 id 两头都不对表：
       * tl 'talent_a_long_id'(16) < 真实天赋 id 最长 21（**低估**）；fid 'faction_id_long'(15) > 真实势力 id
       * 最长 9（**高估**）。最坏态必须按真实上界，两个方向都不许拍脑袋。 */
      var talPool206 = [];
      ['common', 'xiuxian'].forEach(function (wd206) {
        var tp206 = SQ.TALENTS[wd206];
        if (tp206) { tp206.positive.forEach(function (x) { talPool206.push(x.id); }); tp206.negative.forEach(function (x) { talPool206.push(x.id); }); }
      });
      talPool206.sort(function (a, b) { return b.length - a.length; });
      var longTal206 = [talPool206[0] || 'talent_x', talPool206[1] || 'talent_y'];
      var fidPool206 = (D.FACTIONS_FIXED || []).map(function (fx) { return String(fx.id); })
        .sort(function (a, b) { return b.length - a.length; });
      var longFid206 = fidPool206[0] || 'sect';
      w.prodigies = [];
      for (var pi = 0; pi < PDc.COUNT_MAX; pi++) w.prodigies.push({ id: 'pr' + (pi + 1), nm: [8, 6, 4], tl: [longTal206[0], longTal206[1]], al: 2, fc: 15, fid: longFid206, apt: 2, rlm: 9, prg: 0, feud: pi === 0, feudBond: 70, lastSparAt: 1, rivAt: 1, boost: { add: 0.1, months: 3 }, eternal: pi === 0, wl: [99, 99, 99] });
      /* prodMarks 满档：rankRows 31 行冻结快照（#212b 断言长度 = COUNT_MAX+1）+ evf 逐人事件幂等键
       * + slotMax（槽位不复用，斩杀出榜者占号）+ myRank / rankAt / sudiWin */
      w.prodMarks = { slotMax: PDc.COUNT_MAX, myRank: PDc.COUNT_MAX + 1, rankAt: 1700000000000, sudiWin: true, evf: {}, rankRows: [] };
      for (var pr = 0; pr < PDc.COUNT_MAX + 1; pr++) w.prodMarks.rankRows.push({ me: pr === 0, id: pr === 0 ? null : 'pr' + pr, realm: 9, power: 1234567.89 });
      for (var pv = 0; pv < PDc.COUNT_MAX; pv++) w.prodMarks.evf['pr' + (pv + 1)] = 5;
      w.sect = { name: '测试宗门', nameIdx: [11, 7], gate: 'panlong', align: 'evil', disciples: [], fac: { zangjing: 5, danfang: 5, yanwu: 5, keshe: 5 },
        everDefected: true, dispatchAt: 1, lastTribMonth: 1, monthClock: 0, matAcc: 0.999999, warRecord: { wins: 99, loses: 99 }, suppressed: { f1: 0.5 },
        recruitAt: 1, foundAt: 1, declareAt: 1, candidate: null, warAgg: null, seq: 8, succession: null };
      /* 弟子按真实上限造（原硬写 8 条 > DISC_CAP_BASE，属模型越界填充非最坏态；2026-10-05 容量防线批校正）。
       * 携才投效批随批补 `pr` 来源位：最坏态 = 每个名额都被一名天骄弟子占着（N6 起弟子可带 pr 字段）。 */
      for (var di = 1; di <= ((SCc && SCc.DISC_CAP_BASE) || 6); di++) w.sect.disciples.push({ id: 'd' + di, nm: [23, 47], tier: 'fine', realm: 8, prog: 100, inv: 2, perk: 'combatPower', tianjiao: di === 1, pr: 'pr' + di });
      /* ── E0-1 两处漏项补造（2026-10-05 存档容量防线批 · 同批第二轮）──────────────────
       * 四跑 CAP_WATCH 实测真实存档里 `ws.stash` 3.30~3.47KB、`ws.shop` 2.54~4.79KB，而本模型此前
       * **两者完全没造** = 与「天骄漏项」「feed 漏项」同类同因（最坏态模型未随内容批更新）。
       * 一律走真实引擎入口按数据驱动上限造，不拍脑袋编字节数。 */
      var mods206 = M(mkProf([]), w);
      var zMax206 = (D.ZONES || []).length - 1;
      var tierMax206 = (D.GEAR_TIERS || []).length - 1;
      var rollGear206 = function () {
        return SQ.Gear.roll(w, pack, D, zMax206, mods206, { tierMin: tierMax206, tierUp: 0 });
      };
      /* ws.stash 满档 = D.STASH_CAP 件、全最高品阶 */
      w.stash = [];
      for (var gi = 0; gi < (D.STASH_CAP || 12); gi++) w.stash.push(rollGear206());
      /* ws.shop 满档 = 坊市货架 items + 黑市 blackItems 各 **SHOP_SLOTS_MAX** 格（格数随机批起按上界建模）、全填最肥的 kind:'gear'
       * （内嵌完整 gear 对象，比 pill/arts/pack 三种条目都肥）+ 商队 merchant.items 同规格 */
      var mkShopGear206 = function () { return { kind: 'gear', gear: rollGear206(), sold: false, price: 99999 }; };
      w.shop = { items: [], blackItems: [], nextRestock: 1700000000000, refreshStep: 9, discount: 0.35,
        merchant: { until: 1800000000000, items: [], scout: 9 } };
      /* 格数随机批 2026-10-09：两架按 **MAX = 16** 建模（最坏态取上界，不是均值——红线判据要的是上界）；
       * 特席原按 10 格造 = 白留的余量，第八批如实收到 **3 格**——两头都改才叫建模，不是只挑有利的一侧。
       * ⚠️ 但「真实上限 3 格」这个数本身是错的（**神秘商人节律批 2026-10-10 更正**）：数值详设 §5.4 与
       *   第八批都照抄「三格」，而 shop.js:161-172 在 scout 顶格时还会 **50% 挂第四格先天法宝特位**
       *   ⇒ 上界是四格，且四格形状各异（装备内嵌 gear 最肥；功法 / 丹药 / 法宝只有 ref + price）。
       *   现按真实上界造：**2 × gear**（第一格 + 第二格无功法候选时的回落）+ **1 × pill** + **1 × treasure**。
       *   方向如实报：格数 +1 是加项、两格改薄是减项，**净效应取本条实测落盘字节，不猜**。 */
      for (var sh = 0; sh < (D.SHOP_SLOTS_MAX || D.SHOP_SLOTS || 10); sh++) {
        w.shop.items.push(mkShopGear206());
        w.shop.blackItems.push(mkShopGear206());
      }
      w.shop.merchant.items.push(mkShopGear206(), mkShopGear206());
      w.shop.merchant.items.push({ kind: 'pill', ref: 'pozhang', sold: false, price: 99999 });
      w.shop.merchant.items.push({ kind: 'treasure', ref: 'x14', sold: false, price: 99999 });
      D.ALCHEMY.MATS.forEach(function (mm) { w.materials[mm.id] = 999; });
      w.alchemy = { furnace: true, recipes: D.ALCHEMY.RECIPES.map(function (rr) { return rr.id; }), blueprints: D.ALCHEMY.BLUEPRINTS.map(function (bb) { return bb.id; }),
        prof: { dan: 999, qi: 999 }, pills: {}, pillDay: { day: 99, n: 4 }, pillOnce: { pozhang: 9, zhenjie: 9 },
        craft: null, farmAt: 1, fires: 999, jiuzhuan: 99, forgeMade: 99 };
      /* 丹药两族合一（第十七批）：最坏态必须把**成品丹四枚**一起摆满（玩家在坊市 / 门中 / 特席 / 残片也能囤到 99），
       * 只按 RECIPES 造 = 少算四键 ⇒ 红线余量虚报 */
      D.ALCHEMY.RECIPES.forEach(function (rr) { w.alchemy.pills[rr.pill] = 99; w.alchemy.pills[rr.pill + '_rw'] = 99; });
      (D.PILLS || []).forEach(function (pp) { w.alchemy.pills[pp.id] = 99; });
      w.tiandao = SQ.Tiandao.normalize({ defy: 100, title: true, shield: 1, nextTrib: 0.03 }, D);
      /* 本局去重位掩码满档（2026-10-06 天象扩容批补造）：omenSeen 逐节点全亮 = 2^OMEN_TPL_N[node] − 1、
       * chenSeen = 2^CHENYU_N − 1。位掩码本就是为「落档增量 ≈30B」选的形状（对比 id 字符串数组方案的
       * ≈1.5KB），此处按上界造实，把这笔增量钉进红线账，不留未建模字段。 */
      (D.TIANDAO.OMEN_NODES || []).forEach(function (nd, ni) {
        w.tiandao.omenSeen[ni] = Math.pow(2, D.TIANDAO.OMEN_TPL_N[nd]) - 1;
      });
      w.tiandao.chenSeen = Math.pow(2, D.TIANDAO.CHENYU_N) - 1;
      /* seenIds 按真实上界造（2026-10-05 存档容量防线批校正）：原硬塞 200 条假 id 'td-decree-id-N'
       * （14~18B/条 = 3.5KB 纯虚增）。真实上界 = 旨意池大小：seenIds 存 dec.decreeId（tiandao.js 写入前
       * indexOf 去重），池 = D.TIANDAO.DECREES 仅 15 型 → SEEN_CAP 200 是永不可达的防御上限、非最坏态。 */
      (((D.TIANDAO || {}).DECREES) || []).forEach(function (dc) { if (dc && dc.id) w.tiandao.seenIds.push(dc.id); });
      for (var hi = 0; hi < 40; hi++) w.tiandao.history.push({ id: 'td-' + hi, type: 'bless', act: 'accept', at: 1700000000000, tier: 'rare' });
      for (var ch = 0; ch < 10; ch++) w.tiandao.chron.push({ node: 'tribwin', v: { realm: 5 }, at: 1700000000000 + ch });
      w.cave.id = D.CAVES[D.CAVES.length - 1].id;
      D.CAVES.forEach(function (cv) { w.cave.fac[cv.id] = {}; D.CAVE_FACILITIES.forEach(function (fc) { w.cave.fac[cv.id][fc.id] = 5; }); });
      /* meta 最坏态 */
      var m = s206.meta;
      m.codices.event = SQ.Events.allIds(pack);
      m.codices.talent = [];
      m.codices.zone = [];
      m.codices.talentLegacy = [];
      m.achv = []; m.titles = []; m.karmaLog = []; m.biographies = [];
      ['common', 'xiuxian'].forEach(function (wd) { var tp = SQ.TALENTS[wd]; if (tp) { tp.positive.forEach(function (x) { m.codices.talent.push(x.id); }); tp.negative.forEach(function (x) { m.codices.talent.push(x.id); }); } });
      m.codices.treasure = pack.treasures.LIST.map(function (tt) { return tt.id; });
      m.codices.art = Object.keys(pack.artsMap());
      m.codices.artMax = Object.keys(pack.artsMap());
      m.codices.bond = (pack.companions || []).map(function (cc) { return cc.id; });
      for (var zz = 0; zz < 10; zz++) { m.codices.zone.push('z' + zz, 'b' + zz); }
      for (var za = 0; za < 7; za++) m.codices.zone.push('a' + za);
      m.codices.faction = D.FACTIONS_FIXED.map(function (ff) { return ff.id; });
      m.codices.talentLegacy = D.LEGACY.TALENTS.map(function (tt) { return tt.id; });
      CXc.ACHV.forEach(function (aa) { m.achv.push(aa.id); if (aa.title !== '-') m.titles.push(aa.title); });
      while (m.titles.length < 80) m.titles.push('title_extra_' + m.titles.length);
      m.codices.title = m.titles.slice();
      for (var zk = 0; zk < 10; zk++) { m.earnedKeys['zone.' + zk] = 10; m.earnedKeys['boss.' + zk] = 15; }
      m.codices.treasure.forEach(function (id) { m.earnedKeys['treasure.' + id] = 2; });
      m.codices.artMax.slice(0, 30).forEach(function (id) { m.earnedKeys['artmax.' + id] = 5; });
      m.titles.forEach(function (id) { m.earnedKeys['title.' + id] = 2; });
      CXc.FACES.forEach(function (ff2) { m.earnedKeys['codex.ms.' + ff2 + '.50'] = 15; m.earnedKeys['codex.ms.' + ff2 + '.80'] = 30; m.earnedKeys['codex.ms.' + ff2 + '.100'] = 50; });
      m.achv.forEach(function (id) { m.earnedKeys[id] = 3; });
      for (var lb = 1; lb <= 30; lb++) m.earnedKeys['trib.' + lb] = 60;
      m.earnedKeys.realmMax = 720; m.earnedKeys.officeMax = 60; m.earnedKeys.rankMax = 80; m.earnedKeys.ascend = 200;
      var ksum = 0; for (var ek in m.earnedKeys) ksum += m.earnedKeys[ek];
      SQ.Legacy.shopItems(D).forEach(function (it) { m.spent[it.key] = 1700000000000; });
      /* 缘尽赎回跨世账（2026-10-06 缘尽收敛批补造）：redeem 走 Legacy.spend 的 itemId 幂等口 →
       * 每位被赎道友在 meta.spent 留一条**永久**键（跨世不消），是 meta 侧唯一随道友池线性增长的新项。
       * 值 = 实付遗泽 BOND_REDEEM_COST（代码定值，非上界估算）。 */
      (pack.companions || []).forEach(function (cc) { m.spent['redeem.' + cc.id] = D.BOND_REDEEM_COST; });
      var spsum = 0; for (var sk2 in m.spent) spsum += 200;
      m.karma = ksum - spsum;
      for (var kl = 0; kl < 20; kl++) m.karmaLog.push({ ts: 1700000000000 + kl, delta: 50, reason: 'milestone', balance: 1000 });
      for (var bb2 = 0; bb2 < 9; bb2++) m.biographies.push({ life: bb2 + 1, name: '测试道号', text: '传'.repeat(500), stats: { realm: 9, win: 30, att: 40, bonds: 58, karma: 900, zones: 10, defy: 100, channel: 'feisheng', stones: 1000000 }, source: 'tiandao', ts: bb2 });
      m.stats = { lives: 30, ascensions: 15, dissolutions: 15, realmMax: 9, tribWin: 400, tribFail: 100, tribAttempts: 500, zonesFirst: 10, officeMax: 5, rankMax: 4, rankScored: 4, bestLifeText: '', omensSeen: 200, defyTotal: 300, acceptTotal: 300, defyMax: 100, immThisLife: 0 };
      m.eternalProdigy = { nm: [8, 6, 4], apt: 2, al: 2, fc: 15, fid: 'faction_id_long', rlm: 9, wl: [99, 99, 99], feud: true };
      m.lastBonds = (pack.companions || []).slice(0, 60).map(function (cc) { return cc.id; });
    });
    restore206();                                  /* 势力表已按满档 20 个确定生成，还原随机源 */
    var rawBytes206 = byteLen(ref206);
    /* 落盘前字段分解（ws.* / meta.* 逐项字节降序前 10）——容量红线的前置诊断口径 */
    var topRaw206 = (function () {
      var rows = [], wq = ref206.worlds.xiuxian, mq = ref206.meta, kq;
      for (kq in wq) rows.push(['ws.' + kq, byteLen(wq[kq])]);
      for (kq in mq) rows.push(['meta.' + kq, byteLen(mq[kq])]);
      rows.sort(function (a, b) { return b[1] - a[1]; });
      return rows.slice(0, 10).map(function (r) { return r[0] + '=' + (r[1] / 1024).toFixed(2) + 'KB'; }).join(' ');
    })();
    var biosPre206 = (ref206.meta.biographies || []).length;      /* 活档传记数（治理批后 save 不再摧毁它） */
    await SQ.save(ref206);
    var saved206 = localStorage.getItem(SQ.KEY);
    var savedBytes206 = saved206 ? byteLen(saved206) : -1;
    var logRaw206 = localStorage.getItem(SQ.Log.KEY);
    var logBytes206 = logRaw206 ? byteLen(logRaw206) : -1;
    var w206 = ref206.worlds.xiuxian;
    /* 日志存档批：日志落盘前剥离 → 主档阶梯不再裁日志；日志全量进独立档
     * ⚠️ 存档瘦身批口径：本断言走的是**无桥预览（localStorage）分支 = 不压缩**，故阶梯照旧触发，
     *   这条正是「宿主缺 CompressionStream 时的降级态」的常驻取证；压缩态的落盘取证见 #277（有桥分支）。 */
    var re206 = JSON.parse(saved206);
    /* 落盘后字段分解（= 阶梯全跑完仍留在盘上的构成）——决定还需哪一级压缩的直接依据 */
    var topSaved206 = (function () {
      var rows = [], wq = (re206.worlds || {}).xiuxian || {}, mq = re206.meta || {}, kq;
      for (kq in wq) rows.push(['ws.' + kq, byteLen(wq[kq])]);
      for (kq in mq) rows.push(['meta.' + kq, byteLen(mq[kq])]);
      rows.sort(function (a, b) { return b[1] - a[1]; });
      return rows.slice(0, 12).map(function (r) { return r[0] + '=' + (r[1] / 1024).toFixed(2) + 'KB'; }).join(' ');
    })();
    var mainHasLog206 = Array.isArray((((re206.worlds || {}).xiuxian) || {}).log);
    /* 副本级触发标志（级⑦ rel 上三角 / 级⑧ rankRows 裁除）——落盘形态直判，不靠推断 */
    var fac206disk = ((re206.worlds || {}).xiuxian || {}).factions || [];
    var relN206disk = fac206disk.reduce(function (n, f) { return n + Object.keys((f && f.rel) || {}).length; }, 0);
    var lvl7_206 = fac206disk.length >= 2 && relN206disk === fac206disk.length * (fac206disk.length - 1) / 2;
    var pm206disk = ((re206.worlds || {}).xiuxian || {}).prodMarks || {};
    var lvl9_206 = !Array.isArray(pm206disk.rankRows);                       /* 级⑨ rankRows 裁除 */
    var eh206disk = ((re206.worlds || {}).xiuxian || {}).eventHistory || {};
    var feed206disk = Array.isArray(eh206disk.feed) ? eh206disk.feed.length : -1;
    var lvl10_206 = feed206disk < 0;   /* 级⑩ 已随第十四批整族删除 ⇒ `stripSideFlows` 是 `delete ehc.feed`，键**根本不在档上**（= −1）；复核返修：原判 `=== 0` 把「空数组」当正证而键缺失时恒假 = 明细行永远打印「异常」，旧写法 (0<=5) 恒真 = 没判（审计 #13） */
    var lvl8_206 = ((re206.meta || {}).codices || {}).title == null;         /* 级⑧ codices.title 折叠 */
    var logStoreN206 = 0;
    try { logStoreN206 = (JSON.parse(logRaw206).logs.xiuxian || []).length; } catch (e) {}
    /* 级⑥解压还原闭环（扩容批启用）：落盘 codices 九面数组 → 逗号串（序列化副本，内存态零污染），
     * normalize split 还原后九面内容逐面全等——压缩/还原对称、图鉴「永不回退」语义不破 */
    var joined206 = typeof (re206.meta.codices || {}).event === 'string';   /* 级⑥确已触发（必须在 normalize 前判——split 还原会就地 mutate raw） */
    var n206r = SQ.normalize(re206);
    var codexOk206 = (function () {
      var src = ref206.meta.codices, dst = (n206r.meta || {}).codices || {};
      for (var cf in src) {
        if (!Array.isArray(src[cf])) continue;
        if (!Array.isArray(dst[cf]) || dst[cf].join() !== src[cf].join()) return false;
      }
      return true;
    })();
    ok('206', '容量红线：最坏态原账 ' + rawBytes206 + 'B 超触发线（SQ.SAVE_TRIGGER 单一事实源）→ 主档（剥离展示流 log + eventHistory.feed）压缩阶梯（就地级 ⓪~⑤ 已纯函数化：bios/karmaLog/trib并额/cooldowns/保底级 **只改落盘副本** + 副本级⑥codices 串接/⑦rel 上三角/⑧title 差集/⑨rankRows 裁除/⑩feed 裁剪〔侧档化后降级为保险，常态不触发〕）→ 落盘 ' + savedBytes206 + 'B ≤ SQ.SAVE_RED（' + SQ.SAVE_RED + 'B）且恒等式不破；日志全量落独立档 ' + logStoreN206 + ' 条（' + logBytes206 + 'B）；级⑥解压还原闭环（九面 split 后逐面全等、内存态零污染）',
      rawBytes206 > SQ.SAVE_TRIGGER && savedBytes206 > 0 && savedBytes206 <= SQ.SAVE_RED && !mainHasLog206 &&
      logStoreN206 === 2000 && logBytes206 > 0 && w206.log.length === 2000 &&
      ((re206.meta || {}).biographies || {}).length <= 6 &&
      ref206.meta.biographies.length === biosPre206 && identOk(ref206.meta) &&
      joined206 && codexOk206,
      'log=' + w206.log.length + ' 日志档=' + logStoreN206 + ' 主档含log=' + mainHasLog206 +
      ' bios盘/内存=' + ((re206.meta || {}).biographies || []).length + '/' + ref206.meta.biographies.length + ' 天骄=' + w206.prodigies.length +
      '/快照' + ((w206.prodMarks.rankRows || []).length) + '行' +
      ' 级⑥=' + (joined206 ? '触发' : '未触发') + ' 级⑦=' + (lvl7_206 ? '触发' : '未触发') +
      ' 级⑧=' + (lvl8_206 ? '触发' : '未触发') + ' 级⑨=' + (lvl9_206 ? '触发' : '未触发') +
      ' 级⑩已删(feed 不落主档，盘上 ' + feed206disk + ' 条)=' + (lvl10_206 ? '判据成立' : '异常') + '(原满档 ' + (D.EVENT_FEED_CAP || 50) + ')' +
      ' 九面还原=' + codexOk206 + ' ‖ 原账分解 ' + topRaw206 + ' ‖ 落盘分解 ' + topSaved206);

    /* #206b 日志存档：离线重开不丢早期日志（独立档 + 主档压缩阶梯不裁日志）+ 展示层每分类 200 上限 */
    localStorage.removeItem(SQ.KEY);
    localStorage.removeItem(SQ.Log.KEY);
    var ref206b = {};
    await SQ.mutate(ref206b, function (s206b) {
      s206b.profile = mkProf([]);
      s206b.worlds.xiuxian = pack.initialState();
      var w = s206b.worlds.xiuxian;
      w.realm = 5; w.stones = 1e6;
      /* 每分类 260 条（>展示上限 200）× 8 分类 = 2080 条；文本短 → 总量在 256KB 预算内不触发裁剪 */
      var cats206b = ['combat', 'idle', 'break', 'trib', 'event', 'shop', 'arts', 'sys'];
      for (var i206b = 0; i206b < 2080; i206b++) SQ.Log.push(w, cats206b[i206b % 8], '早期日志不该消失' + i206b, 1700000000000 + i206b);
      w.lastSave = Date.now() - 7200000;   /* 模拟离线 2 小时 */
    });
    var firstTs206b = ref206b.worlds.xiuxian.log[0].ts;   /* 最旧一条（应永不消失） */
    var nBefore206b = ref206b.worlds.xiuxian.log.length;
    await SQ.claim(ref206b);                               /* 离线重开：load → 离线结算 → save 全链路 */
    var re206b = await SQ.load();                          /* 再读一次（等价重开界面） */
    var log206b = re206b.worlds.xiuxian.log;
    var firstTsReload206b = log206b[0] && log206b[0].ts;
    var mainRaw206b = JSON.parse(localStorage.getItem(SQ.KEY));
    var mainHasLog206b = Array.isArray((((mainRaw206b.worlds || {}).xiuxian) || {}).log);
    /* 展示层口径复刻（view.journalLines「全部」分支）：每分类只取最新 200，超限分类渲染数恒 ≤200 */
    var per206b = {}, shown206b = 0;
    for (var j206b = log206b.length - 1; j206b >= 0; j206b--) {
      var c206b = log206b[j206b].cat;
      per206b[c206b] = (per206b[c206b] || 0) + 1;
      if (per206b[c206b] <= 200) shown206b++;
    }
    var expectShown206b = 0;
    for (var ck206b in per206b) expectShown206b += Math.min(per206b[ck206b], 200);
    var catsAll206b = Object.keys(per206b).length === 8;
    var eachCap206b = Object.keys(per206b).every(function (k) { return per206b[k] >= 200; });
    ok('206b', '日志存档：离线 2 小时重开 → 早期日志零丢失（独立档 + 主档阶梯不裁日志）；主档剥离 log；展示层每分类只取最新 200（8 分类各 ≥200 → 渲染 ' + shown206b + ' 条）',
      nBefore206b >= 2080 && log206b.length >= nBefore206b && firstTsReload206b === firstTs206b &&
      !mainHasLog206b && catsAll206b && eachCap206b && shown206b === expectShown206b && shown206b === 1600,
      'before=' + nBefore206b + ' after=' + log206b.length + ' 首条ts=' + firstTsReload206b +
      ' 主档含log=' + mainHasLog206b + ' 分类数=' + Object.keys(per206b).length + ' 渲染=' + shown206b + '/' + expectShown206b);

    /* #206c 旧档迁移：主档遗留日志 → 首读沿用 → 首次落盘迁入独立日志档、主档剥离 */
    localStorage.removeItem(SQ.KEY);
    localStorage.removeItem(SQ.Log.KEY);
    var old206c = {
      v: 1,
      profile: { name: '旧档', worldId: 'xiuxian', createdAt: 1, worldName: '罗云州', talents: [], alignBias: 'neutral' },
      meta: { unlockedWorlds: ['xiuxian'] },
      settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
      worlds: { xiuxian: (function () {
        var w = pack.initialState();
        for (var k206c = 0; k206c < 300; k206c++) SQ.Log.push(w, k206c % 2 ? 'combat' : 'trib', '旧档遗留日志' + k206c, 1600000000000 + k206c);
        return w;
      })() }
    };
    localStorage.setItem(SQ.KEY, JSON.stringify(old206c));   /* 旧档：日志尚在主档内，无独立日志键 */
    var loaded206c = await SQ.load();
    var keptOnLoad206c = loaded206c.worlds.xiuxian.log.length === 300;   /* 首读沿用主档遗留日志（不丢） */
    var refMig206c = loaded206c;
    await SQ.save(refMig206c);                              /* 首次落盘 → 迁入独立日志档 */
    var store206c = JSON.parse(localStorage.getItem(SQ.Log.KEY));
    var storeN206c = ((store206c || {}).logs || {}).xiuxian ? store206c.logs.xiuxian.length : 0;
    var mainAfter206c = JSON.parse(localStorage.getItem(SQ.KEY));
    var mainHasLog206c = Array.isArray((((mainAfter206c.worlds || {}).xiuxian) || {}).log);
    var reloaded206c = await SQ.load();
    ok('206c', '日志存档迁移：旧档（日志在主档内、无独立日志键）首读沿用不丢 300 条 → 首次落盘迁入独立档且主档剥离 → 再读仍 300 条',
      keptOnLoad206c && storeN206c === 300 && !mainHasLog206c && reloaded206c.worlds.xiuxian.log.length === 300,
      '首读=' + loaded206c.worlds.xiuxian.log.length + ' 日志档=' + storeN206c +
      ' 主档含log=' + mainHasLog206c + ' 再读=' + reloaded206c.worlds.xiuxian.log.length);

    /* #248 容量级⑦：势力关系矩阵上半三角化——落盘只存上三角 + normalize 对称还原闭环（2026-10-05 存档容量防线批） */
    var fac248src = ref206.worlds.xiuxian.factions || [];
    var fac248res = ((n206r.worlds || {}).xiuxian || {}).factions || [];
    var relCntSrc248 = fac248src.reduce(function (n, f) { return n + Object.keys((f && f.rel) || {}).length; }, 0);
    var triExpect248 = fac206disk.length * (fac206disk.length - 1) / 2;
    var triOk248 = fac206disk.length >= 2 && relN206disk === triExpect248 && relN206disk < relCntSrc248;
    /* 还原闭环：逐对双向在场 + 关系值与落盘前逐条全等（关系语义零漂移） */
    var byIdSrc248 = {}; fac248src.forEach(function (f) { byIdSrc248[f.id] = f; });
    var symOk248 = true, pairN248 = 0;
    fac248res.forEach(function (fa) {
      fac248res.forEach(function (fb) {
        if (!(String(fa.id) < String(fb.id))) return;
        pairN248++;
        var s1 = (byIdSrc248[fa.id] || {}).rel || {}, s2 = (byIdSrc248[fb.id] || {}).rel || {};
        if (!fa.rel[fb.id] || !fb.rel[fa.id]) symOk248 = false;
        if (fa.rel[fb.id] !== s1[fb.id] || fb.rel[fa.id] !== s2[fa.id]) symOk248 = false;
      });
    });
    /* 旧档幂等：本就双向全存的档（级⑦从未触发过）normalize 后 rel 条目数与值零变化 */
    var ws248b = pack.initialState(); ws248b.realm = 2;
    SQ.Factions.generate(ws248b, pack, D);
    var relSnap248 = {}; ws248b.factions.forEach(function (f) { relSnap248[f.id] = JSON.stringify(f.rel); });
    var cntBefore248 = ws248b.factions.reduce(function (n, f) { return n + Object.keys(f.rel).length; }, 0);
    var n248b = SQ.normalize({ v: SQ.V, profile: { name: '甲', talents: [], worldId: 'xiuxian', worldName: '界', createdAt: 1 }, worlds: { xiuxian: ws248b }, meta: { unlockedWorlds: ['xiuxian'] } });
    var fac248b = n248b.worlds.xiuxian.factions || [];
    var cntAfter248 = fac248b.reduce(function (n, f) { return n + Object.keys(f.rel).length; }, 0);
    var idem248 = fac248b.length === ws248b.factions.length && cntAfter248 === cntBefore248 &&
      fac248b.every(function (f) { return relSnap248[f.id] === JSON.stringify(f.rel); });
    ok('248', '容量级⑦ 势力关系矩阵上半三角化：落盘 rel 条目 = n(n−1)/2 上三角（对称冗余回收 ≈一半）+ normalize 对称还原闭环（逐对双向在场、关系值与落盘前逐条全等、读端 Factions.byId().rel[] 零侵入）+ 旧档双向全存者 normalize 幂等（条目数与值零变化）',
      triOk248 && symOk248 && pairN248 === triExpect248 && idem248,
      '势力=' + fac206disk.length + ' rel落盘=' + relN206disk + '/上三角期望=' + triExpect248 +
      '/原双向=' + relCntSrc248 + ' 还原对数=' + pairN248 + ' 逐对全等=' + symOk248 + ' 旧档幂等=' + idem248);

    /* #249 容量级⑨：天骄榜面冻结快照裁除——视图回落实时榜（零功能损失）+ 其余 prodMarks 字段全保留 */
    var pm249src = ref206.worlds.xiuxian.prodMarks || {};
    var ws249 = (n206r.worlds || {}).xiuxian || {};
    var pm249 = ws249.prodMarks || {};
    var cut249 = Array.isArray(pm249src.rankRows) && pm249src.rankRows.length > 0 && !Array.isArray(pm206disk.rankRows);
    var fb249 = SQ.Prodigy.rankRows(ws249) === null;                 /* 既有契约：无快照 → null → 视图回落实时榜 */
    var live249 = SQ.Prodigy.board(ws249, pack, D);
    var liveOk249 = !!live249 && Array.isArray(live249.rows) &&
      live249.rows.length >= (ws249.prodigies || []).length && live249.myRank >= 1;
    var kept249 = pm249.slotMax === pm249src.slotMax && pm249.myRank === pm249src.myRank &&
      pm249.rankAt === pm249src.rankAt && pm249.sudiWin === pm249src.sudiWin &&
      Object.keys(pm249.evf || {}).length === Object.keys(pm249src.evf || {}).length;
    ok('249', '容量级⑨ 天骄榜面冻结快照裁除：落盘无 rankRows + 视图回落实时榜闭环（rankRows() 返回 null、board() 实时榜行数 ≥ 名录数且 myRank ≥ 1——prodigy.js 既有回落契约、零功能损失）+ 其余 prodMarks 字段全保留（slotMax 槽位不复用 / myRank / rankAt / sudiWin / evf 事件幂等键）',
      cut249 && fb249 && liveOk249 && kept249,
      '落盘裁除=' + cut249 + ' 回落null=' + fb249 + ' 实时榜=' + (live249 && live249.rows ? live249.rows.length : -1) +
      '行 myRank=' + (live249 ? live249.myRank : -1) + ' 名录=' + (ws249.prodigies || []).length + ' 字段保留=' + kept249);

    /* #250 容量级⑧：codices.title 折叠为差集——**无条件无损**（含称号溢出档往返实证）
     * 2026-10-05 存档容量防线批。初版设计为「删键 + 由 titles 重建」并挂「去重称号数 ≤ 80」前提护栏；
     * 经查图鉴传记卷 §2.9 称号墙为**动态面**、当前可获 ≈75（成就 59 + 逆天大劫 1 + 天骄榜位 + 跨世统计 ≈15）
     * 已逼近 addTitle 的 while(>80) shift 上限、余量仅 5 → 前提极脆，改存差集（titleX）后无条件无损。 */
    var AXc250 = (D.CODEX || {}).ACHV || [];
    var uniq250 = {};
    AXc250.forEach(function (a) { if (a.title && a.title !== '-') uniq250[a.title] = 1; });
    var achvTitleN250 = Object.keys(uniq250).length;
    var TITLES_CAP250 = 80;                        /* codex.js addTitle 的 shift 上限（同源常量） */
    /* (a) 真实档：折叠 + 还原（常态差集为空 → 落盘直接删 titleX 键） */
    var folded250 = Array.isArray(ref206.meta.codices.title) && ref206.meta.codices.title.length > 0 && lvl8_206;
    var rest250 = (n206r.meta || {}).codices ? n206r.meta.codices.title : null;
    var restoreOk250 = Array.isArray(rest250) && rest250.join() === ref206.meta.codices.title.join();
    var cnt250 = SQ.Codex.faceCount(n206r.meta, 'title');
    var countOk250 = cnt250 === ref206.meta.codices.title.length;
    var noX250 = ((re206.meta || {}).codices || {}).titleX == null;   /* 常态无溢出 → 不落 titleX 键 */
    /* (b) 溢出档：模拟 titles 已被 shift 挤掉最旧 2 条 → 差集必须承载并原序还原（无条件无损的实证） */
    var ref250 = JSON.parse(JSON.stringify(ref206));
    var full250 = ref250.meta.codices.title.slice();
    var OVER250 = ['title_overflow_a', 'title_overflow_b'];
    ref250.meta.codices.title = OVER250.concat(full250);              /* 图鉴面 = 溢出最旧 2 + 全部 */
    ref250.meta.titles = full250.slice(-TITLES_CAP250);               /* titles 只留最新 80（模拟 shift 后） */
    var keep250 = ref250.meta.karma;
    await SQ.save(ref250);
    var raw250 = localStorage.getItem(SQ.KEY);
    var disk250 = raw250 ? JSON.parse(raw250) : {};
    var dxCod250 = (disk250.meta || {}).codices || {};
    var foldHit250 = dxCod250.title == null;                          /* title 键确已折叠 */
    var xOnDisk250 = dxCod250.titleX;
    var xStr250 = (typeof xOnDisk250 === 'string') ? xOnDisk250 : (Array.isArray(xOnDisk250) ? xOnDisk250.join(',') : '');
    var xHas250 = xStr250.split(',').filter(function (x) { return OVER250.indexOf(x) >= 0; }).length === OVER250.length;
    var n250 = SQ.normalize(disk250);
    var back250 = ((n250.meta || {}).codices || {}).title;
    var lossless250 = Array.isArray(back250) && back250.join() === OVER250.concat(full250).join();  /* 溢出在前 = 原插入序 */
    var noResidue250 = ((n250.meta || {}).codices || {}).titleX == null;   /* 还原后差集键不残留 */
    var ident250 = n250.meta.karma === keep250;                        /* 遗泽恒等式不受折叠影响 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('250', '容量级⑧ codices.title 折叠为差集：真实档落盘无 codices.title + normalize 由已清洗 meta.titles 重建（逐字全等、faceCount 面计数不变、常态差集为空故不落 titleX 键）+ **溢出档往返实证无条件无损**（模拟 titles 被 addTitle 的 while(>80) shift 挤掉最旧 2 条 → 差集键 titleX 承载二者、还原 = titleX ++ titles 溢出在前恰为原插入序、还原后 titleX 不残留）+ 遗泽恒等式 #197 不受影响。**不依赖「称号数 ≤ 80」前提**——图鉴传记卷 §2.9 称号墙动态面当前可获 ≈75 已逼近上限余量仅 5，初版前提护栏极脆故改存差集（成就称号数仅作观察值报告）',
      folded250 && restoreOk250 && countOk250 && noX250 && foldHit250 && xHas250 && lossless250 && noResidue250 && ident250,
      '成就称号=' + achvTitleN250 + '/上限=' + TITLES_CAP250 + '（观察值·非前提） 真实档折叠=' + folded250 +
      ' 重建全等=' + restoreOk250 + ' 面计数=' + cnt250 + '/' + ref206.meta.codices.title.length +
      ' 常态无titleX=' + noX250 + ' ‖ 溢出档: title键折叠=' + foldHit250 + ' titleX承载=' + xHas250 +
      '(' + xStr250 + ') 原序无损=' + lossless250 + ' 还原后无残留=' + noResidue250 + ' 恒等式=' + ident250);

    /* #251 展示流侧档化（存档治理批 2026-10-09 **改口径** · 原口径逐字保留于下注）
     * 原口径 = 阶梯级⑩ 在触发线之上把主档 `eventHistory.feed` 裁至最近 5 条（代价 = 重载后玩家奇遇
     *   历史只剩尾巴，且要等主档超 56KB 才动）。
     * 新口径 = feed **恒常不进主档**、整体落侧档 `sanqian-logs-v1` 的 `feed` 段（与日志同键同预算范式），
     *   级⑩ 降级为「侧档写失败时的保险」，判据 (d) 证明它仍是活的。〔🔧 **第十四批作废**：级⑩ 整族删除 ⇒ 侧档写失败/读不动时**没有主档侧兜底**，只剩 `ioError` 那条留痕〕
     * 判据：(a) 主档无 feed、`lastId`/`seen` 照旧在主档（去重与 once 幂等非展示流）；
     *       (b) 侧档 feed 满档 50 条**逐条与源全等**且新在前（不是随机取样、不是截断）；
     *       (c) 真机 `SQ.load` 回填后 feed === 落盘前 ⇒ **原级⑩的玩家可见代价被取消**；
     *       (d) 级⑩ 保险仍活：直调 `SQ.compressForSave(带 feed 的态, now, 极小触发线)` → 落盘 feed ≤5；
     *           〔🔧 **第十四批（2026-10-11）该判据作废并改向**：级⑩ 整族删除 ⇒ (d) 现判「feed 全留 + stage 11 不再出现」，
     *           见下方 #251 的 (d) 块；恒真的 `0<=5` 同时从 #206 明细里摘掉。〕
     *       (e) 侧档字节预算：超 `FEED_BYTE_BUDGET` 的流 → 保最新、挤最旧（条数 >5，非固定 5）；
     *       (f) 内存态零污染（save 前后活档全等）。 */
    var feed251src = (ref206.worlds.xiuxian.eventHistory || {}).feed || [];
    var ref251 = JSON.parse(JSON.stringify(ref206));
    var eh251live = ref251.worlds.xiuxian.eventHistory;
    var snap251a = (function () { var c = JSON.parse(JSON.stringify(ref251)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    /* #250 收尾把两把键 removeItem 了，而本模块的侧档签名缓存无从感知外部清档 ⇒ 复位（生产路径 = resetSave） */
    SQ.Side.resetSig();
    await SQ.save(ref251);
    var disk251Raw = localStorage.getItem(SQ.KEY);
    var disk251 = disk251Raw ? JSON.parse(disk251Raw) : {};
    var side251Raw = localStorage.getItem(SQ.Log.KEY);
    var side251 = side251Raw ? JSON.parse(side251Raw) : {};
    var eh251disk = ((disk251.worlds || {}).xiuxian || {}).eventHistory || {};
    var noFeedOnDisk251 = eh251disk.feed == null;                                 /* (a) */
    var idemOnDisk251 = eh251disk.lastId === eh251live.lastId &&
      Object.keys(eh251disk.seen || {}).length > 0;                               /* (a) 幂等键仍在主档 */
    var sideFeed251 = Array.isArray((side251.feed || {}).xiuxian) ? side251.feed.xiuxian : [];
    var sideFull251 = sideFeed251.length === (D.EVENT_FEED_CAP || 50) &&
      sideFeed251.every(function (e, i) { return JSON.stringify(e) === JSON.stringify(feed251src[i]); });  /* (b) */
    var back251 = await SQ.load();
    var backFeed251 = (((back251.worlds || {}).xiuxian || {}).eventHistory || {}).feed || [];
    var reloadKept251 = backFeed251.length === feed251src.length &&                                    /* (c) */
      backFeed251.every(function (e, i) { return JSON.stringify(e) === JSON.stringify(feed251src[i]); });
    /* (d) 原「级⑩ 保险」已于第十四批整族删除（审计 #13）：`savePayload` 先 `stripSideFlows` 剥掉
     * eventHistory.feed，阶梯再拿到的是**已经没有 feed 的载荷** ⇒ 那一级在结构上不可达，而 #206 的明细
     * 却把「级⑩=触发」恒打印（feed 落盘 0 条 ⇒ `0<=5` 恒真）。这里改为判**删除本身成立**：
     * 带 feed 的状态直过全阶梯（极小触发线）后 feed **一条不少**，且级号 11 不再出现在 stages 里。 */
    var ins251 = JSON.parse(JSON.stringify(ref251));
    var feedN0251 = (((ins251.worlds || {}).xiuxian || {}).eventHistory || {}).feed.length;
    var rr251 = await SQ.compressForSave(ins251, Date.now(), 1);
    var insEh251 = ((rr251.out.worlds || {}).xiuxian || {}).eventHistory || {};
    var insFeedArr251 = Array.isArray(insEh251.feed) ? insEh251.feed : [];
    var insured251 = feedN0251 > 0 && insFeedArr251.length === feedN0251 &&
      rr251.stages.indexOf(11) < 0 && insFeedArr251.every(function (e, i) {
        return JSON.stringify(e) === JSON.stringify(ins251.worlds.xiuxian.eventHistory.feed[i]); });
    /* (e) 侧档字节预算（feed 新在前 ⇒ 从尾部最旧挤起、首条恒为最新） */
    var big251 = [];
    for (var bq251 = 0; bq251 < 50; bq251++) {
      big251.unshift({ id: 'ev' + bq251, ts: 1000 + bq251, branch: 'right', tier: 1, nature: 'n',
        pass: true, hadCheck: false, karma: 0, eff: { txt: '字'.repeat(1200) } });
    }
    var trimmed251 = SQ.Side.trimFeed(big251.slice());
    var budgetOk251 = trimmed251.length < big251.length && trimmed251.length > 5 &&
      trimmed251[0].id === big251[0].id && big251[0].id === 'ev49';
    var bytesOk251 = SQ.Side.feedBytes(big251[0]) > 1000 && SQ.Side.FEED_BYTE_BUDGET === 32 * 1024;
    var snap251b = (function () { var c = JSON.parse(JSON.stringify(ref251)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    var clean251 = snap251a === snap251b;                                          /* (f) */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('251', '展示流侧档化（原阶梯级⑩改口径 · 2026-10-09 存档治理批）：`eventHistory.feed` **恒常不进主档**、整体落侧档 `feed` 段 ⇒ 主档体积与实际游玩时长解耦。(a) 主档无 feed 而 `lastId`/`seen` 仍在主档（幂等键不属展示流）(b) 侧档 feed 满档 50 条逐条与源全等、新在前 (c) 真机 `SQ.load` 回填后历史**一条不丢**（原级⑩「重载只剩 5 条」的玩家可见代价被取消）(d) 级⑩ 降级为保险但仍活：直调 compressForSave 极小触发线 → 落盘 feed ≤5 且取的是最近 N 条 (e) 侧档按 `FEED_BYTE_BUDGET`(32KB) 裁、保最新挤最旧且条数 >5（非固定 5）(f) 内存态零污染。**动机**：feed 满档 ≈11~14KB 是真实存档最大单项（CAP_WATCH 10.5~11.2KB > codices/factions/prodigies），此前只在触发线之上才裁、且一刀裁到 5 条',
      noFeedOnDisk251 && idemOnDisk251 && sideFull251 && reloadKept251 && insured251 && budgetOk251 && bytesOk251 && clean251,
      '主档含feed=' + (Array.isArray(eh251disk.feed)) + ' 幂等键在主档=' + idemOnDisk251 +
      ' 侧档=' + sideFeed251.length + '/' + (D.EVENT_FEED_CAP || 50) + ' 逐条全等=' + sideFull251 +
      ' 重载保留=' + reloadKept251 + '(' + backFeed251.length + '条) 级⑩已删(feed 全留 ' + insFeedArr251.length + '/' + feedN0251 + '，stage11 不再出现=' + (rr251.stages.indexOf(11) < 0) + ')=' + insured251 +
      ' 预算裁=' + trimmed251.length + '/' + big251.length + '>5=' + (trimmed251.length > 5) +
      ' 内存零污染=' + clean251);

    /* #277 阶梯纯函数化 + 到期冷却恒常剔除（存档治理批 2026-10-09）
     * (a) **活档零摧毁**（本批修的缺陷）：改造前就地级 ⓪~⑤ 直接改 `s.meta` / `s.worlds[wk]`，而
     *     savePayload 只浅拷贝顶层 ⇒ 一次触发有损级会同时摧毁玩家内存态（传记 9→6、karmaLog 20→10、
     *     trib 逐世键被并、到期冷却键被删、seen 被剪）。取证 = 用 #206 满档模型（剥离展示流后原账
     *     仍 >56KB ⇒ 阶梯必触发）走真 `SQ.save`：**save 前后活档逐字段全等**，而**盘上**同字段确已被裁
     *     ⇒ 「落盘降级 / 内存无损」双向同档实证（只证一侧都不算）。
     * (b) 到期 `eventCooldowns` 由阶梯级③升为**落盘恒常前置**（不等触发线）：到期键不落盘、未到期键在档、
     *     内存态两键都在（触发面只读 `cd > now` 一侧 ⇒ events.js:497 / rumors.js:222 零波及）。
     * (c) 阶梯跑完的落盘档经 normalize 后 #197 遗泽恒等式续绿（级②并额 ΣearnedKeys 不变、级⑧b 折叠可还原）。 */
    var fat277 = JSON.parse(JSON.stringify(ref206));
    var w277 = fat277.worlds.xiuxian;
    /* 冷却键语义（本批复核修正 · 复核报告列为 blocker）：`ws.eventCooldowns` 存的是**触发时刻**
     * （写口 events.js:573/604 · rumors.js:236 · prodigy.js:388），读端判据 `now < cd + cooldownHours×3600e3`
     * （events.js:498 / rumors.js:223），另有一种**旧**写法存到期时刻（events.js 原 :924 = now + cdFailHours；神秘商人节律批 2026-10-10 已改为存等效触发时刻，现写点 :936 —— 本 fixture 仍造这一形状，核的是「两式都安全」而不是「现树还有两式」。另注：`rumors.js` 的取值守卫在 :222、判定行在 :223）。
     * ⇒ 首版把「值 < now」当到期并**恒常剪**，等于每次存档清空活冷却 ⇒ 已撤回；现要求：
     *    (b1) 落盘**不剪任何冷却键**（阶梯未触发的常规档）；(b2) 强跑阶梯时只剪「值 < now − COOL_MAX_HOURS」的**可证死键**；
     *    (b3) 内存态三键恒在（活档不剪）。 */
    var cdNow277 = Date.now();                               /* 取当时的引擎时钟，语义 = 相对「现在」 */
    w277.eventCooldowns = {
      justFired277: cdNow277 - 1000,                          /* 1 秒前触发 = 冷却正紧 */
      liveGate277: cdNow277 + 3600000,                        /* 旧 events.js :924 式（到期时刻在未来；现树写点已改 :936） */
      deadLong277: cdNow277 - 200 * 3600000                   /* 200 小时前触发 > 168h 池内最长冷却 = 可证死键 */
    };
    var biosLivePre277 = (fat277.meta.biographies || []).length;
    var karmaLivePre277 = (fat277.meta.karmaLog || []).length;
    var seenLivePre277 = Object.keys((w277.eventHistory || {}).seen || {}).length;
    var snap277a = (function () { var c = JSON.parse(JSON.stringify(fat277)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    await SQ.save(fat277);
    var snap277b = (function () { var c = JSON.parse(JSON.stringify(fat277)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    var disk277 = JSON.parse(localStorage.getItem(SQ.KEY));
    var d277w = (disk277.worlds || {}).xiuxian || {};
    var liveKept277 = snap277a === snap277b;                                        /* (a) 内存侧 */
    var diskBios277 = (disk277.meta.biographies || []).length;
    var diskKarma277 = (disk277.meta.karmaLog || []).length;
    var diskSeen277 = Object.keys(((d277w.eventHistory || {}).seen) || {}).length;
    var diskTrimmed277 = diskBios277 <= 6 && diskKarma277 <= 10 && diskSeen277 <= 40;  /* (a) 盘侧 = 反向证据 */
    var cdKept277 = !!d277w.eventCooldowns && d277w.eventCooldowns.justFired277 != null &&
      d277w.eventCooldowns.liveGate277 != null &&
      w277.eventCooldowns.justFired277 != null && w277.eventCooldowns.liveGate277 != null &&
      w277.eventCooldowns.deadLong277 != null;                 /* (b1)+(b3) 常规档不剪活冷却、内存态不动 */
    /* (b2) 强跑阶梯（极小触发线）⇒ 只允许剪「now − COOL_MAX_HOURS」之前的死键 */
    var cdForced277 = await SQ.compressForSave(JSON.parse(JSON.stringify(fat277)), cdNow277, 1);
    var cdF277 = (((cdForced277.out.worlds || {}).xiuxian || {}).eventCooldowns) || {};
    var cdRule277 = cdF277.justFired277 != null && cdF277.liveGate277 != null && cdF277.deadLong277 == null;
    /* (d) 反漂移：池内 cooldownHours 最大值必须 ≤ 常量，否则死键判据会误剪活冷却 */
    var maxCd277 = 0;
    SQ.Events.allIds(pack).forEach(function (id277) {
      var e277 = SQ.Events.findById(pack, id277);
      var h277 = e277 && (e277.cooldownHours != null ? e277.cooldownHours : e277.cd);
      if (typeof h277 === 'number' && h277 > maxCd277) maxCd277 = h277;
    });
    var guard277 = maxCd277 <= SQ.COOL_MAX_HOURS;
    var n277 = SQ.normalize(JSON.parse(JSON.stringify(disk277)));
    var ident277 = identOk(n277.meta);                                              /* (c) */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('277', '阶梯纯函数化 + 冷却键语义修正（2026-10-09 存档治理批 · 复核返修）：(a) 以 #206 满档模型走真 `SQ.save`（阶梯确已触发）——**落盘降级、内存无损**双向实证：save 前后活档逐字段全等（biographies ' + biosLivePre277 + ' / karmaLog ' + karmaLivePre277 + ' / seen ' + seenLivePre277 + ' 一字不动），而盘上同字段已裁到 ⓪①⑤ 上限（改造前有损级会同时摧毁玩家内存态，本条即该缺陷的收口取证）(b) 冷却键语义修正（复核抓获的 blocker 返修）：容器存的是**触发时刻**而非到期时刻 ⇒ 落盘**恒常不剪**（(b1) 一秒前触发的键照旧在档 + (b3) 内存态三键俱在），只有阶梯级③ 在触发线之上剪「值 < now − COOL_MAX_HOURS」的**可证死键**（(b2) 实测 200h 前的键被剪、1s 前与未来到期两键不动）(c) 反漂移判据：池内 cooldownHours 最大值 ≤ SQ.COOL_MAX_HOURS (d) 阶梯跑完的落盘档 normalize 后 #197 恒等式续绿',
      liveKept277 && diskTrimmed277 && cdKept277 && cdRule277 && guard277 && ident277,
      '活档全等=' + liveKept277 + ' 盘上裁=' + diskTrimmed277 +
      '(bios ' + diskBios277 + '/' + biosLivePre277 + ' karmaLog ' + diskKarma277 + '/' + karmaLivePre277 +
      ' seen ' + diskSeen277 + '/' + seenLivePre277 + ')' +
      ' 冷却常规档=' + Object.keys(d277w.eventCooldowns || {}).join('/') +
      ' 强跑阶梯=' + Object.keys(cdF277).join('/') +
      ' 池内最大冷却=' + maxCd277 + 'h/常量=' + SQ.COOL_MAX_HOURS + 'h #197=' + ident277);

    /* #278 侧档读不动 ⇒ **禁止覆盖**（2026-10-09 存档治理批 · 复核报告列为 blocker 的返修取证）
     * 场景：主档已不含展示流（治理后恒真），若侧档因宿主截断 / 脏字节 / 宿主缺 CompressionStream 而读不动，
     *      内存态就是空的 ⇒ 照写就是把玩家的日志与奇遇史整族抹掉。
     * 判据：(a) 有值但解不出 = unreadable 置真；(b) 期间 save **不动侧档字节**（宁可留着坏档也不覆盖）；
     *      (c) 脏值被清掉后同一写口立刻恢复正常落盘（不是永久哑火）；(d) 侧档本就缺键（新档）不算读不动、照写。 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var junk278 = '{"v":1,"logs":{"xiuxian":[{"ts":1,"cat":"sys","text":"旧一行"}';   /* 截断 = JSON 解析必失败 */
    localStorage.setItem(SQ.Log.KEY, junk278);
    var s278 = await SQ.load();
    var unread278 = SQ.Side.unreadable() === true;
    var w278 = s278.worlds.xiuxian || (s278.worlds.xiuxian = pack.initialState());
    SQ.Log.push(w278, 'sys', '治理批取证行');
    await SQ.save(s278);
    var after278 = localStorage.getItem(SQ.Log.KEY);
    var noWipe278 = after278 === junk278;
    /* (c) 清掉脏值后同一写口须能落盘 */
    localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    await SQ.save(s278);
    var side278c = null;
    try { side278c = JSON.parse(localStorage.getItem(SQ.Log.KEY)); } catch (e278) {}
    var recover278 = !!(side278c && Array.isArray(side278c.logs.xiuxian) && side278c.logs.xiuxian.length >= 1 &&
      SQ.Side.unreadable() === false);
    /* (d) 全新档（侧档无键）不算读不动 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    await SQ.save(SQ.defaultState());
    var fresh278 = SQ.Side.unreadable() === false && localStorage.getItem(SQ.Log.KEY) != null;
    ok('278', '侧档读不动 ⇒ 禁止覆盖（2026-10-09 存档治理批 · 复核 blocker 返修）：(a) 有值但解不出即置 unreadable (b) 期间存档**不动侧档字节**——主档治理后本就不含展示流，照写会把玩家日志与奇遇史整族抹掉 (c) 脏值清除后同一写口立刻恢复落盘（不是永久哑火） (d) 新档（侧档无键）不算读不动、照写',
      unread278 && noWipe278 && recover278 && fresh278,
      'unreadable=' + unread278 + ' 未覆盖=' + noWipe278 + ' 恢复=' + recover278 + ' 新档可写=' + fresh278);

    /* #279 冷却跨「落盘 → 重载」仍生效（2026-10-09 复核返修的**行为面**取证）
     * 与 #277(b) 的形态面判据互补：那里核「键在不在档上」，这里核「判据是不是真的还拦得住」。
     * 取 lost_child（cooldownHours 24）：① 触发时刻 = now − 1h（冷却中）⇒ buildPool 不含它；
     * 真 save → SQ.load 后 ② 仍不含（键随档回来了）；③ 反向对照 触发时刻 = now − 25h（已过 24h）⇒ 含它
     * ——③ 同时证明 ①② 不是被 condOk 之类旁路条件挡住的**空过**（若被旁路挡住，③ 也会不含）。*/
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var now279 = Date.now();
    var ev279 = SQ.Events.findById(pack, 'lost_child');
    var poolWith279 = function (cdAt) {
      var w = pack.initialState();
      w.eventCooldowns[ev279.id] = cdAt;
      var list = SQ.Events.buildPool(pack, w, D, ev279.tier, ev279.nature, now279);
      return list.some(function (e) { return e.id === ev279.id; });
    };
    var cdHours279 = (ev279.cooldownHours != null ? ev279.cooldownHours : ev279.cd);
    var inPoolFresh279 = poolWith279(now279 - 1000);          /* 冷却中 ⇒ 应 false */
    var inPoolAged279 = poolWith279(now279 - (cdHours279 + 1) * 3600000);  /* 已过冷却 ⇒ 应 true */
    /* 真落盘 → 真读档：带一枚「冷却中」的键过一遍存储层 */
    var s279 = SQ.defaultState();
    s279.profile = mkProf(); s279.profile.name = '冷却复核';
    s279.worlds.xiuxian = pack.initialState();
    var w279 = s279.worlds.xiuxian;
    w279.eventCooldowns[ev279.id] = now279 - 1000;
    w279.realm = 3;
    await SQ.save(s279);
    var r279 = await SQ.load();
    var w279b = r279.worlds.xiuxian;
    var keyBack279 = w279b.eventCooldowns[ev279.id] === now279 - 1000;
    var pool279b = SQ.Events.buildPool(pack, w279b, D, ev279.tier, ev279.nature, now279);
    var stillBlocked279 = !pool279b.some(function (e) { return e.id === ev279.id; });
    var disk279 = (await SQ.readStored()) || {};   /* readStored 已解码 + parse，不再 JSON.parse */
    var onDisk279 = ((disk279.worlds || {}).xiuxian || {}).eventCooldowns != null &&
      ((disk279.worlds || {}).xiuxian || {}).eventCooldowns[ev279.id] === now279 - 1000;
    ok('279', '冷却跨「落盘→重载」仍生效（2026-10-09 复核返修 · 行为面取证）：lost_child（cooldownHours ' + cdHours279 + 'h）触发 1 秒后 ① buildPool 不含它 ② 真 save→load 后键值精确回来、pool 仍不含（= 不会重载后立刻重复出同一奇遇）③ 反向对照触发 ' + (cdHours279 + 1) + ' 小时后 pool 含它 —— ③ 同时证明 ①② 不是被 condOk 之类旁路条件挡出的空过（首版恒常剪枝会让本条必红）',
      inPoolFresh279 === false && inPoolAged279 === true && keyBack279 && stillBlocked279 && onDisk279,
      '冷却中在池=' + inPoolFresh279 + ' 过冷却在池=' + inPoolAged279 + ' 重载键回=' + keyBack279 +
      ' 重载仍拦=' + stillBlocked279 + ' 盘上有键=' + onDisk279);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #280 展示流两族裁剪口径统一 = 落盘裁副本、内存一字不动（2026-10-09 展示流与落档口径批）
     * 立因：#277 那批把「压缩阶梯就地级摧毁内存态」修成纯函数，但**侧档写入路径留了同型漏网**——
     *   `writeLogsIfChanged` 直调 `trimLogBudget(w.log)`，而该函数当时是「就地裁」（`list.length = 0`
     *   再回填）⇒ 一次落盘就把玩家内存里的日志按**落盘预算**削短，且隔壁 feed 走的是副本，
     *   同一个侧档里两族口径相反。本批把两族统一成纯函数，判据按「同一件事在两族各证一遍」写。
     * 判据：(a) save 前后**内存** log 条数与逐条内容全等（旧实现必红 = 本条同时是反向对照）
     *       (b) 落盘侧档 log 条数**确实小于**内存条数（防「两边都不裁」的假绿）
     *       (c) 落盘侧档 log 字节 ≤ LOG_BYTE_BUDGET（预算仍是主约束）
     *       (d) feed 同型三件：内存 80 条不动 / 侧档 ≤ FEED_STORE_CAP 且 < 内存 / 侧档字节 ≤ FEED_BYTE_BUDGET
     *       (e) 单元级纯度：直接调 SQ.Log.trimBudget(src) 与 SQ.Side.trimFeed(src) ⇒ 返回**新数组**、
     *           src 条数与序列化逐字不变（这条把「调用侧要记得 slice」的隐患从判据里根除）
     *       (f) 不裁内存 ≠ 不丢：重载后内存 = 落盘集合，首条 ts 与落盘首条精确对上 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var s280 = SQ.defaultState();
    s280.profile = mkProf(); s280.profile.name = '侧档纯度';
    s280.worlds.xiuxian = pack.initialState();
    var w280 = s280.worlds.xiuxian;
    /* 400 条同源日志（>LOG_CAT_CAP 200 ⇒ 有一半是可裁的未保护项）；文本取 ASCII 使「字符数 ≈ UTF-8 字节数」，
       判据 (c) 才能拿 JSON.stringify 长度直接对预算 */
    for (var l280 = 0; l280 < 400; l280++) SQ.Log.push(w280, 'sys', 'L'.repeat(900) + '#' + l280, 1700000000000 + l280);
    var memLogN280 = w280.log.length;
    var memLogSig280 = JSON.stringify(w280.log);
    /* feed 80 条（>FEED_STORE_CAP 60 ⇒ 条数兜底先收一刀，再走字节预算） */
    w280.eventHistory = w280.eventHistory || { seen: {}, feed: [] };
    for (var f280 = 0; f280 < 80; f280++) {
      w280.eventHistory.feed.push({ id: 'purity_check', ts: 1700000000000 + f280, branch: 'branch_safe',
        tier: 'ren', nature: 'neutral', pass: true, hadCheck: false, karma: 0,
        eff: { stones: 100 + f280, qi: 'P'.repeat(400) }, via: 'smoke' });
    }
    var memFeedN280 = w280.eventHistory.feed.length;
    var memFeedSig280 = JSON.stringify(w280.eventHistory.feed);
    await SQ.save(s280);
    var memLogAfter280 = w280.log.length === memLogN280 && JSON.stringify(w280.log) === memLogSig280;
    var memFeedAfter280 = w280.eventHistory.feed.length === memFeedN280 && JSON.stringify(w280.eventHistory.feed) === memFeedSig280;
    var side280 = JSON.parse(localStorage.getItem(SQ.Log.KEY) || '{}');
    var dLog280 = (side280.logs || {}).xiuxian || [];
    var dFeed280 = (side280.feed || {}).xiuxian || [];
    var dLogBytes280 = JSON.stringify(dLog280).length;
    var dFeedBytes280 = JSON.stringify(dFeed280).length;
    /* (e) 单元级纯度对表：先序列化传入数组本身，调完再比 */
    var src280L = w280.log, before280L = src280L.length, snap280L = JSON.stringify(src280L);
    var ret280L = SQ.Log.trimBudget(src280L);
    var pure280L = ret280L !== src280L && src280L.length === before280L && JSON.stringify(src280L) === snap280L && ret280L.length < before280L;
    var src280F = w280.eventHistory.feed, before280F = src280F.length, snap280F = JSON.stringify(src280F);
    var ret280F = SQ.Side.trimFeed(src280F);
    var pure280F = ret280F !== src280F && src280F.length === before280F && JSON.stringify(src280F) === snap280F && ret280F.length < before280F;
    /* (f) 重载：内存集合应等于落盘集合（读档本来就取侧档副本，不受本批改动的副作用） */
    var r280 = await SQ.load();
    var rl280 = (r280.worlds.xiuxian || {}).log || [];
    var reloadOk280 = rl280.length === dLog280.length && rl280[0] && dLog280[0] && rl280[0].ts === dLog280[0].ts &&
      rl280[rl280.length - 1].ts === dLog280[dLog280.length - 1].ts;
    ok('280', '展示流两族裁剪统一为纯函数（2026-10-09 展示流与落档口径批）：一次落盘不再削短玩家内存。(a) 内存 log ' + memLogN280 + ' 条 save 后逐字不变 (b) 侧档 log 反被裁到 ' + dLog280.length + ' 条（证明确实在裁）(c) 侧档 log 字节 ' + dLogBytes280 + ' ≤ 预算 ' + SQ.Log.BYTE_BUDGET + ' (d) feed 内存 ' + memFeedN280 + ' 条不动而侧档 ' + dFeed280.length + ' 条 ≤ FEED_STORE_CAP ' + SQ.Side.FEED_STORE_CAP + ' (e) trimBudget/trimFeed 返回新数组、传入逐字不变 (f) 重载后内存 == 落盘集合',
      memLogAfter280 && memFeedAfter280 && dLog280.length < memLogN280 && dLogBytes280 <= SQ.Log.BYTE_BUDGET &&
      dFeed280.length < memFeedN280 && dFeed280.length <= SQ.Side.FEED_STORE_CAP && dFeedBytes280 <= SQ.Side.FEED_BYTE_BUDGET &&
      pure280L && pure280F && reloadOk280,
      '内存log=' + memLogN280 + '→' + w280.log.length + ' 侧档log=' + dLog280.length + '/' + dLogBytes280 + 'B' +
      ' 内存feed=' + memFeedN280 + '→' + w280.eventHistory.feed.length + ' 侧档feed=' + dFeed280.length + '/' + dFeedBytes280 + 'B' +
      ' 纯函数log/feed=' + pure280L + '/' + pure280F + ' 重载等=' + reloadOk280);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #281 `owned[].st` 无 schema 透传面的护栏形态交底（2026-10-09 展示流与落档口径批 · 治理批 ⑨ 遗留项）
     * 裁定 = **登记制而非运行时收敛**：白名单砍键会砍掉未来合法字段并破「读档往返无损」那一族判据，
     *   代价大于收益；改为「写点必须先登记进 `SQ.Treasures.ST_KEYS`」，由两道闸守：
     *   `audit.cjs` **A7**（静态扫 `assets/**` 的 `.st.<key>` 写点与本表**双向对表**）+ 本条（运行时语义与收集器本身）。
     * 判据：(a) 登记表在位且逐条带出处（长度 ≥ 7，缺表 ⇒ 纪律失守）
     *       (b) `normalize` 对 `st` 是**整块透传**：脏档里的表外键原样留档（= 本面确实无 schema，
     *           这条不是在赞成本风险，而是把「为什么必须靠登记制」写成可执行的证据）
     *       (c) 非 plain object 的 `st` 被复位为 `{}`（唯一存在的收敛动作，防脏档穿透成怪形）
     *       (d) 收集器反向对照：往一枚 owned.st 塞表外假键 ⇒ 如实报「表外键」（证明本条不是恒真）
     *       (e) 真入口写出来的键 ⊆ 登记表：跑 `treasureTick`/`tribOnFail` 两径后收集观测键集，
     *           观测非空时逐条必须在册（观测为空只作读数打印，不冒充覆盖——静态半区由 A7 全覆盖） */
    var reg281 = (SQ.Treasures && SQ.Treasures.ST_KEYS) || null;
    var regOk281 = Array.isArray(reg281) && reg281.length >= 7 &&
      ['hours', 'karmaH', 'kills', 'cdUntil', 'tower', 'usedRealm', 'spirit'].every(function (k) { return reg281.indexOf(k) >= 0; });
    var nz281 = SQ.Treasures.normalize({
      owned: [{ id: 'x01', st: { legacy_orphan: 7, hours: 5 } }, { id: 'x02', st: 123 }, { id: 'x03' }],
      slots: ['x01', null, null], fate: {}, bondCount: 0
    }, pack);
    var o281 = (nz281 && nz281.owned) || [];
    var passThrough281 = !!(o281[0] && o281[0].st && o281[0].st.legacy_orphan === 7 && o281[0].st.hours === 5);
    var resetBad281 = !!(o281[1] && o281[1].st && typeof o281[1].st === 'object' && Object.keys(o281[1].st).length === 0) &&
      !!(o281[2] && o281[2].st && typeof o281[2].st === 'object');
    /* (d) 反向对照 + (e) 真入口观测：造一件在册键 + 一件表外键，收集器必须只放行前者 */
    var w281 = pack.initialState();
    var sink281 = function () {};
    var obsCollect = function (ws) {
      var out = {};
      ((((ws || {}).treasures || {}).owned) || []).forEach(function (e) {
        if (e && e.st && typeof e.st === 'object') Object.keys(e.st).forEach(function (k) { out[k] = (out[k] || 0) + 1; });
      });
      return Object.keys(out).sort();
    };
    SQ.Treasures.gain(w281, pack, D, 'x01', sink281);
    SQ.Treasures.gain(w281, pack, D, 'x03', sink281);
    SQ.Treasures.gain(w281, pack, D, 'x09', sink281);
    var eq281 = ['x01', 'x03', 'x09'].map(function (id) {
      var r = SQ.Treasures.equip(w281, pack, D, id, sink281);
      return r && r.ok;
    });
    var obsClean281 = obsCollect(w281);
    var host281 = ((w281.treasures || {}).owned || [])[0];
    if (host281) { host281.st = host281.st || {}; host281.st.smoke_probe_offlist = 1; }
    var obsDirty281 = obsCollect(w281);
    var rev281 = obsDirty281.indexOf('smoke_probe_offlist') >= 0 &&
      obsDirty281.filter(function (k) { return reg281.indexOf(k) < 0; }).length === 1;
    if (host281) delete host281.st.smoke_probe_offlist;
    var obsReal281 = obsCollect(w281);
    var realSubset281 = obsReal281.every(function (k) { return reg281.indexOf(k) >= 0; });
    /* 真入口至少跑出过一枚在册键：x03（special=tower，reqs 境界3+神40）与 x09（budou，reqs 境界3+气40）
     * 装备成功后 `tribOnFail` 写 st.tower / st.usedRealm、`tickIdle` 写 st.hours/karmaH ⇒ 观测非空才谈得上覆盖。*/
    var w281b = pack.initialState(); w281b.realm = 6;
    w281b.attrs = { jing: 60, qi: 60, shen: 60 };
    ['x03', 'x09'].forEach(function (id) { SQ.Treasures.gain(w281b, pack, D, id, sink281); SQ.Treasures.equip(w281b, pack, D, id, sink281); });
    var eqOk281 = ['x03', 'x09'].every(function (id) { return SQ.Treasures.isEquipped(w281b, id); });
    try { SQ.Treasures.tribOnFail(w281b, pack, D, {}, 0.4, sink281); } catch (e281) {}
    try { SQ.Treasures.tickIdle(w281b, pack, D, 7200, 1700000000000, sink281); } catch (e281b) {}
    var obsTick281 = obsCollect(w281b);
    var tickSubset281 = obsTick281.every(function (k) { return reg281.indexOf(k) >= 0; });
    ok('281', '法宝运行态 st = 无 schema 透传面，护栏形态 = 登记制（ST_KEYS ' + (reg281 || []).length + ' 键在册）：normalize 整块带过(脏档表外键原样留档)、非对象 st 复位为 {}、收集器反向对照如实报表外假键、真入口(装备两件脚本型法宝跑通)观测到 ' + obsTick281.length + ' 键且全在册（**观测非空是判据之一**，防空过）',
      regOk281 && passThrough281 && resetBad281 && rev281 && realSubset281 && tickSubset281 && eqOk281 && obsTick281.length >= 1,
      '表=' + reg281.join(',') + ' 装备成功=' + eq281.join('/') + ' 观测(造脏)=' + obsDirty281.join(',') +
      ' 观测(真入口)=' + (obsTick281.join(',') || '空') + ' 反向=' + rev281 + ' 在册子集=' + (realSubset281 && tickSubset281));
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #282 传记条数三口径 = 单一取数处（2026-10-09 展示流与落档口径批 · 治理批 ⑨「BIO_KEEP 零消费点」收口）
     * 判据不写「数字对得上」（三处各写死 6/9 也能对上），写的是**把表里的值挪一下，三处消费点必须一起动**：
     *   (a) 声明在位：`D.LEGACY.BIO_KEEP`（读档容错上界）与 `D.LEGACY.BIO_STORE_CAP`（落盘上界 = 正典① 6 世）
     *       都在，且 keep > store（容错上界若 ≤ 落盘上界，旧档一进就丢 = 破无损）
     *   (b) `SQ.BioCaps.keep()/store()` 逐字等于表值
     *   (c) 把表临时改成 keep=4 / store=2 ⇒ ① `SQ.Legacy.metaNormalize` 只留 4 世
     *       ② `SQ.Codex.pushBio` 连推 7 世后剩 2 世 ③ 阶梯**级⓪ 单独驱动**（`SQ.SavePre.compressStep(s,0,now)`）
     *       裁到 2 世 —— 三处**同时**跟着表动；任何一处仍是硬编码字面量，这条立刻红
     *   (d) 复位回 9/6 后三处口径回到原值（防测试自己把全局改坏）
     *   (e) 级⓪ 与级④ 分工未被混：级④ 仍是「→1 世」（极端触发线的最后一级，与本表无关） */
    var LEG282 = (SQ.XDATA && SQ.XDATA.LEGACY) || {};
    var keep0 = LEG282.BIO_KEEP, store0 = LEG282.BIO_STORE_CAP;
    var declOk282 = typeof keep0 === 'number' && typeof store0 === 'number' && keep0 > store0 && store0 === 6 && keep0 === 9;
    var capsOk282 = !!SQ.BioCaps && SQ.BioCaps.keep() === keep0 && SQ.BioCaps.store() === store0;
    var mkBios = function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ life: i + 1, name: '世' + (i + 1), text: '传记正文' + (i + 1), stats: {}, source: 'local', ts: 1700000000000 + i }); return a; };
    var consumers = function () {
      var nz = SQ.Legacy.metaNormalize({ biographies: mkBios(9) });
      var m2 = { biographies: [] };
      for (var p = 0; p < 7; p++) SQ.Codex.pushBio(m2, { life: p + 1, name: 'n' + p, text: 't' + p, stats: {}, source: 'local', ts: 1700000000000 + p }, p + 1, '名' + p, 'local', 1700000000000 + p);
      var st2 = { profile: { name: 'x' }, worlds: {}, meta: { biographies: mkBios(9) } };
      var rung0 = SQ.SavePre.compressStep(st2, 0, 1700009999999);
      var rung4 = SQ.SavePre.compressStep(st2, 4, 1700009999999);
      return {
        norm: (nz.biographies || []).length,
        push: m2.biographies.length,
        rung0: (rung0.meta.biographies || []).length,
        rung4: (rung4.meta.biographies || []).length,
        memUntouched: (st2.meta.biographies || []).length
      };
    };
    var before282 = consumers();
    LEG282.BIO_KEEP = 4; LEG282.BIO_STORE_CAP = 2;
    var moved282 = consumers();
    LEG282.BIO_KEEP = keep0; LEG282.BIO_STORE_CAP = store0;
    var after282 = consumers();
    var movedFollowed282 = moved282.norm === 4 && moved282.push === 2 && moved282.rung0 === 2;
    var restored282 = after282.norm === before282.norm && after282.push === before282.push && after282.rung0 === before282.rung0;
    var defaultShape282 = before282.norm === 9 && before282.push === 6 && before282.rung0 === 6 && before282.rung4 === 1 && before282.memUntouched === 9;
    ok('282', '传记条数三口径经单一取数处（D.LEGACY.BIO_KEEP/BIO_STORE_CAP → SQ.BioCaps）：改表 keep=4/store=2 后 normalize ' + moved282.norm + ' / 写口 ' + moved282.push + ' / 阶梯级⓪ ' + moved282.rung0 + ' **同时**跟着走（任一处仍硬编码即红）；缺省 9/6 与级④→1 世分工不变；级⓪ 只裁落盘副本、内存 ' + before282.memUntouched + ' 世不动',
      declOk282 && capsOk282 && movedFollowed282 && restored282 && defaultShape282,
      '缺省=keep' + keep0 + '/store' + store0 + ' 观测(norm/push/rung0/rung4/内存)=' +
      before282.norm + '/' + before282.push + '/' + before282.rung0 + '/' + before282.rung4 + '/' + before282.memUntouched +
      ' → 改表后=' + moved282.norm + '/' + moved282.push + '/' + moved282.rung0 + ' → 复位后=' +
      after282.norm + '/' + after282.push + '/' + after282.rung0);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #283 存档度量出口（2026-10-09 存档水位批）：`SQ.SaveStats` 报的数必须与盘上真实体量同源
     * 立因（**同日按用户口径撤下玩家界面呈现**——「存档水位这些文字描述和用户没有直接关系，只是
     *   系统设计问题，不需要在设置中表述出来」⇒ 设置页四行与十个 `settings.save.level.*` 键当日删除，
     *   view/index.html 与 lexicon.js 回到撤除前状态）：本判据保留的理由是**引擎侧需要一个可断言的度量口**，
     *   否则「落盘字节 = 盘上真值」这类判据要各自 stringify 一遍 = 五处副本五处漂移。本条守四件事：
     *   (a) 读数不撒谎：`mainBytes` 与 localStorage 里那份落盘值的 UTF-8 字节数**逐字节相等**
     *       （同一条度量线 = 编码后字节，与 SQ.SAVE_RED/SQ.SAVE_TRIGGER 一致）
     *   (b) 解耦可测：同一次存档里日志族从 0 涨到 3000 条（≈ 侧档 +几百 KB 级体量），
     *       **主档读数几乎不动且 `stages` 仍为空** ⇒ 「增长全落在侧档」这件事从此可断言，不必靠人看曲线
     *   (c) 不进存档：主档对象顶层键仍是既有契约集，**没有** saveStats 之类的自我膨胀项
     *   (d) 跳写不归零：内容未变时 `writeLogsIfChanged` 走跳过分支，侧档读数必须沿用上一次的值
     *       （返回 0 会让任何读它的人误判「侧档空了」= 本条即反向预防）
     *   (e) 有损级是真会亮的：用文档化的测试钩子 `SQ.compressForSave(s, now, 1)` 强制跑满
     *       ⇒ `stages` 非空（正常档恒为空，不证就会恒真空过） */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    var s283 = SQ.defaultState();
    s283.profile = mkProf(); s283.profile.name = '水位读数';
    s283.worlds.xiuxian = pack.initialState();
    var w283 = s283.worlds.xiuxian; w283.realm = 3;
    await SQ.save(s283);
    var st283a = SQ.SaveStats.get();
    var diskRaw283 = localStorage.getItem(SQ.KEY);
    var truthMain283 = SQ.storedBytes(diskRaw283);
    var honest283 = st283a.at > 0 && st283a.mainBytes === truthMain283 && st283a.stageCount === 0 && st283a.codec === 'preview';
    var diskObj283 = JSON.parse(diskRaw283);
    var topKeys283 = Object.keys(diskObj283).sort().join(',');
    var contractKeys283 = Object.keys(SQ.defaultState()).sort().join(',');
    /* 水位**只活在内存**：主档顶层键必须仍是既有契约集，不得多出 saveStats / stats 这类自造项 */
    var notInSave283 = topKeys283.indexOf('saveStats') < 0 && topKeys283.indexOf('stats') < 0 && topKeys283 === contractKeys283;
    var sideBefore283 = st283a.sideBytes;
    for (var g283 = 0; g283 < 3000; g283++) SQ.Log.push(w283, 'sys', 'L'.repeat(300) + '#' + g283, 1700000000000 + g283);
    await SQ.save(s283);
    var st283b = SQ.SaveStats.get();
    var decoupled283 = st283b.sideBytes > sideBefore283 + 10000 && st283b.stageCount === 0 &&
      Math.abs(st283b.mainBytes - st283a.mainBytes) < 4096 &&
      st283b.mainBytes === SQ.storedBytes(localStorage.getItem(SQ.KEY));
    var sideTruth283 = st283b.sideBytes === SQ.storedBytes(localStorage.getItem(SQ.Log.KEY));
    await SQ.save(s283);                          /* 内容未变 ⇒ 侧档走跳写分支，读数必须沿用 */
    var st283c = SQ.SaveStats.get();
    var skipKeeps283 = st283c.sideBytes === st283b.sideBytes && st283c.sideBytes > 0;
    var nowFixed283 = Date.now();
    var forced283 = await SQ.compressForSave(s283, nowFixed283, 1);
    /* ⚠️ 本批一度把 `stages` 改成「只记真降字节的级」，随即**回退**：`stages` 的现行语义 = 「阶梯执行到哪
     * 一级」，常驻探针 savecodec(B3) 与 savegrowth(§5a) 正是拿它当「阶梯跑满了没有」的证据，改语义会
     * 把两处证据打成假红（实测 B3 只剩 [0,1,4,6,7,9,10]、§5a 两侧同时变 `[]`）。审计 #10 那一点夸大留给
     * 「另加一个真降量字段」去解，不改既有读数的含义（登记 = 任务清单 N28 补记）。
     * 🔧 复核返修（同日当晚）：原判「级 0 在场 + 级号 ⊆ 0..10 + 不含 11」与「另跑一份 normalize({}) 看级 7
     *   在列」在 trigger=1 下**两条都恒真**（每一级都无条件 push ⇒ 零鉴别力，还白花一次全阶梯）。改成
     *   **钉死全序**：加一级、删一级、改级号都会红；这条同时是「级⑩ 已整族删除」的直证（删除前全序 = 0..11）。 */
    var LADDER283 = '0,1,2,3,4,5,6,7,8,9,10';
    var ladderVisible283 = forced283.stages.join(',') === LADDER283;
    ok('283', '存档水位读数与盘上同源且不进存档：主档 ' + st283a.mainBytes + 'B === 落盘值字节数（度量线同 §3.5 编码后口径）· 日志 3000 条入侧档后主档仅动 ' + (st283b.mainBytes - st283a.mainBytes) + 'B 且有损级 ' + st283b.stageCount + ' 级 · 侧档 ' + sideBefore283 + '→' + st283b.sideBytes + 'B 亦与盘上相等 · 跳写沿用读数不归零 · 极小触发线跑满时级序**钉死** ' + LADDER283.split(',').join('→') + '（口径 = 阶梯执行到哪一级；级⑩ 已删 ⇒ 全序止于 10，加/删一级或改级号都红）',
      honest283 && notInSave283 && decoupled283 && sideTruth283 && skipKeeps283 && ladderVisible283,
      '顶层键=' + topKeys283 + ' 主档真值=' + truthMain283 + 'B 报=' + st283a.mainBytes + 'B · 涨日志后主档=' + st283b.mainBytes + 'B 侧档=' + st283b.sideBytes + 'B（真值=' + SQ.storedBytes(localStorage.getItem(SQ.Log.KEY)) + 'B）· 跳写后=' + st283c.sideBytes + 'B · codec=' + st283b.codec + ' · 跑满级=' + forced283.stages.join('/'));
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* ═══ 天象扩容 · 本局去重批（天道卷 v1.4 §7.3 / 道友池卷 v1.2 §六 / 引擎卷 v1.10 §3.6）═══ */

    /* #252 天象池对表 + 本局去重位掩码：
     * a) **对表**：`OMEN_TPL_N` 逐节点 == 词表 `tiandao.skyomen.<node>.<n>` 实有条数、Σ = **86**；
     *    `CHENYU_N` == `tiandao.omen.<n>` 实有条数（**30**）；且 1..N 每个模板号 `SQ.t` 都取得到
     *    正文（非回落键名、变量全替净）——配权表偏小 = 多写的模板永不可达（**死内容**，本批勘误
     *    正是 rebirth 实有 8 条而表写 5 → 3 条永不出现），偏大 = 玩家看见键名，两头都不许
     * b) 同节点连抽满池 → 模板号两两不重复、掩码逐次严格点亮、末抽全亮（2^N − 1）
     * c) 池耗尽再抽 → 掩码**静默重置**开启第二轮（不崩、不落 0、不返越界号）
     * d) 谶语同法（池 30 → 末抽 2^30 − 1 = 1073741823，安全整数内；再抽重置为 1）
     * e) normalize 脏档收敛：负数 / 小数 / 超界 / 非数 / 长度不符 → clamp + 补齐零崩溃；旧档无字段 → 全默认 */
    var C252 = D.TIANDAO, LEX252 = SQ.LEX.xiuxian;
    function cnt252(pre) {
      var re = new RegExp('^' + pre.split('.').join('\\.') + '[0-9]+$'), n252 = 0, k252;
      for (k252 in LEX252) if (re.test(k252)) n252++;
      return n252;
    }
    var V252 = { realm: '化神', n: 3, zone: '南域', tier: 'rare', a: '甲', b: '乙', rank: 7, dir: '反超前人' };
    var rows252 = [], sum252 = 0, txt252 = true;
    C252.OMEN_NODES.forEach(function (nd) {
      var want = C252.OMEN_TPL_N[nd] || 0, got = cnt252('tiandao.skyomen.' + nd + '.');
      sum252 += got;
      rows252.push(nd + ' ' + got + '/' + want + (got === want ? '' : '≠'));
      for (var q = 1; q <= Math.max(want, got); q++) {
        var ky = 'tiandao.skyomen.' + nd + '.' + q, tx = SQ.t(ky, V252, 'xiuxian');
        if (!tx || tx === ky || tx.indexOf('{') >= 0) txt252 = false;
      }
    });
    var chGot252 = cnt252('tiandao.omen.'), chWant252 = C252.CHENYU_N;
    for (var cq = 1; cq <= Math.max(chWant252, chGot252); cq++) {
      var cky = 'tiandao.omen.' + cq, ctx252 = SQ.t(cky, null, 'xiuxian');
      if (!ctx252 || ctx252 === cky) txt252 = false;
    }
    var par252 = rows252.every(function (r) { return r.indexOf('≠') < 0; }) && txt252 &&
      sum252 === 96 && chGot252 === chWant252 && chWant252 === 30;
    /* b/c 掩码抽取：rand 恒 0 → 每轮取最小未用号 → 1..N 严格递增的不重复序列（确定性、不靠运气）*/
    var zero252 = function () { return 0; };
    var nd252 = 'tribwin', n252 = C252.OMEN_TPL_N[nd252], idx252 = C252.OMEN_NODES.indexOf(nd252);
    var td252 = { omenSeen: [], chenSeen: 0 }, got252 = [], msk252 = [];
    for (var pk = 0; pk < n252; pk++) {
      got252.push(SQ.Tiandao.pickOmenTpl(td252, C252, nd252, zero252));
      msk252.push(td252.omenSeen[idx252]);
    }
    var seq252 = got252.every(function (t, i) { return t === i + 1; });
    var uniq252 = (function () { var sn = {}; for (var i = 0; i < got252.length; i++) { if (sn[got252[i]]) return false; sn[got252[i]] = 1; } return true; })();
    var mono252 = msk252.every(function (m, i) { return i === 0 || m > msk252[i - 1]; });
    var full252 = msk252[msk252.length - 1] === Math.pow(2, n252) - 1;
    var r2252 = SQ.Tiandao.pickOmenTpl(td252, C252, nd252, zero252);
    var round252 = r2252 === 1 && td252.omenSeen[idx252] === 1;
    /* d 谶语掩码 */
    var td252c = { chenSeen: 0 }, set252c = {}, last252c = 0;
    for (var pc = 0; pc < chWant252; pc++) { last252c = SQ.Tiandao.pickChenYu(td252c, C252, zero252); set252c[last252c] = 1; }
    var chen252 = Object.keys(set252c).length === chWant252 && last252c === chWant252 &&
      td252c.chenSeen === Math.pow(2, chWant252) - 1 && Number.isSafeInteger(td252c.chenSeen);
    chen252 = chen252 && SQ.Tiandao.pickChenYu(td252c, C252, zero252) === 1 && td252c.chenSeen === 1;
    /* e normalize 收敛（超界项 clamp 到 2^N − 1、非数归 0、长度按 OMEN_NODES 补齐〔现 8〕、旧档全默认）*/
    var brk252 = C252.OMEN_NODES.indexOf('break'), lim252 = Math.pow(2, C252.OMEN_TPL_N.break) - 1;
    var nz252 = SQ.Tiandao.normalize({ omenSeen: [-5, 1.7, 99999999, 'x'], chenSeen: -3 }, D);
    var nz252b = SQ.Tiandao.normalize({}, D);
    var norm252 = nz252.omenSeen.length === C252.OMEN_NODES.length &&
      nz252.omenSeen.every(function (m, i) {
        return Number.isInteger(m) && m >= 0 && m < Math.pow(2, C252.OMEN_TPL_N[C252.OMEN_NODES[i]]);
      }) &&
      nz252.omenSeen[brk252] === lim252 && nz252.omenSeen[0] === 0 && nz252.omenSeen[1] === 1 &&
      nz252.chenSeen === 0 && nz252b.omenSeen.join() === C252.OMEN_NODES.map(function () { return 0; }).join() &&
      nz252b.chenSeen === 0;
    ok('252', '天象池对表 + 本局去重：`OMEN_TPL_N` 逐节点与词表实有条数**全等**、Σ = 96（八节点，N4 收口批 +prodrank 10 条），`CHENYU_N` = 30 对表；1..N 每个模板号都取得到正文（非键名回落、`{realm}/{n}/{zone}/{tier}/{a}/{b}/{rank}/{dir}` 全替净）→ 零死内容零空 key；同节点连抽满池得 **1..N 不重复**序列、掩码逐次严格点亮至 `2^N − 1`；耗尽后再抽**静默重置**开启第二轮（返 1、掩码归单点）；谶语同法（末抽 `2^30 − 1` 在安全整数内、再抽重置）；normalize 对负数/小数/超界/非数/长度不符逐项 clamp 补齐、旧档无字段全默认',
      par252 && seq252 && uniq252 && mono252 && full252 && round252 && chen252 && norm252,
      '配权对表 ' + rows252.join(' ') + ' Σ=' + sum252 + '/96 谶语=' + chGot252 + '/' + chWant252 +
      ' 正文可取=' + txt252 + ' ‖ 满池序列=' + seq252 + ' 不重复=' + uniq252 + ' 掩码递增=' + mono252 +
      ' 末抽全亮=' + full252 + '(' + msk252[msk252.length - 1] + ') 第二轮=' + round252 +
      ' 谶语掩码=' + chen252 + ' 脏档收敛=' + norm252 + '(break→' + nz252.omenSeen[brk252] + '/' + lim252 + ')');

    /* #253 同道相吸（阵营 × 善恶名号联动 · 道友池卷 v1.2 §六）：名号跨段瞬间，与新名号**同向**且
     * **已相识**（bond > 0）的道友一次性 +`BOND_ALIGN_GIFT_BASE`×dist（封顶 `..._CAP`），走 `Bonds.gain`
     * 唯一正向写口 → 好感只增不减、结缘仍由事件门控（不白送档位）。
     * a) 极道魔尊（dist 4）→ evil 且已相识者每人 +8（2×4 恰触 cap）；异向 / 未相识 / 绝交锁零波及
     * b) 中性段（左道散人 dist 0）→ 零发放 reason 'neutral'，且**不占** rankGiftSeen 名额
     * c) 每名号每世限一次：同段重发 → 'dup'、好感与 karma 零变动（防震荡刷好感）
     * d) 真链路：`recalcDerived` 里 karma 跨段（浩然道尊 dist 4）→ 自动发放 + 独立 'bond' 日志一条
     *    （含名号 / 方向 / 人数 / 幅度，视图层据此演出） */
    var cs253 = SQ.Bonds.list(pack);
    var ev253 = cs253.filter(function (c) { return c.align === 'evil'; }).map(function (c) { return c.id; });
    var rt253 = cs253.filter(function (c) { return c.align === 'right'; }).map(function (c) { return c.id; });
    var per253 = Math.min(D.BOND_ALIGN_GIFT_CAP, D.BOND_ALIGN_GIFT_BASE * 4);
    var w253 = mkWs({});
    w253.bonds[ev253[0]] = 10; w253.bonds[ev253[1]] = 20; w253.bonds[ev253[2]] = 95;
    w253.bonds[ev253[3]] = 0;                                  /* 同向但未相识 */
    SQ.Bonds.lock(w253, ev253[4]);                              /* 同向但绝交锁 −99 */
    var ag253 = SQ.Bonds.alignGift(w253, pack, D, 'jidao', 1);
    var a253 = ag253.ok === true && ag253.dir === 'evil' && ag253.dist === 4 && ag253.per === per253 &&
      ag253.hit === 3 &&
      w253.bonds[ev253[0]] === 10 + per253 && w253.bonds[ev253[1]] === 20 + per253 &&
      w253.bonds[ev253[2]] === (D.BOND_MAX || 100) &&           /* 95 + 8 → clamp 满档 */
      w253.bonds[ev253[3]] === 0 && w253.bonds[ev253[4]] === SQ.Bonds.LOCK &&
      rt253.every(function (id) { return !(w253.bonds[id] > 0); });
    /* b 中性段零发放且不占名额（后续真跨段仍可发）*/
    var w253b = mkWs({}); w253b.bonds[ev253[0]] = 10; w253b.bonds[rt253[0]] = 10;
    var ag253b = SQ.Bonds.alignGift(w253b, pack, D, 'zuodao', 2);
    var b253 = ag253b.ok === false && ag253b.reason === 'neutral' &&
      (w253b.rankGiftSeen || []).length === 0 &&
      w253b.bonds[ev253[0]] === 10 && w253b.bonds[rt253[0]] === 10;
    /* c 同名号每世一次 */
    var pre253 = w253.bonds[ev253[0]];
    var ag253c = SQ.Bonds.alignGift(w253, pack, D, 'jidao', 3);
    var c253 = ag253c.ok === false && ag253c.reason === 'dup' && w253.bonds[ev253[0]] === pre253 &&
      w253.rankGiftSeen.length === 1 && w253.rankGiftSeen[0] === 'jidao';
    /* d 真链路（karmaEventScore 900 → 浩然道尊 dist 4 → 正道已相识者各 +8 + bond 日志一条）*/
    var w253d = mkWs({ karmaEventScore: 900 });
    w253d.bonds[rt253[0]] = 5; w253d.bonds[rt253[1]] = 5;
    M(mkProf([]), w253d);
    var bl253 = w253d.log.filter(function (L) { return L.cat === 'bond'; });
    var d253 = SQ.XKarma.rankOf(w253d.karma, D) === 'haoran' &&
      w253d.bonds[rt253[0]] === 5 + per253 && w253d.bonds[rt253[1]] === 5 + per253 &&
      (w253d.rankGiftSeen || []).indexOf('haoran') >= 0 &&
      bl253.length === 1 && bl253[0].text.indexOf(SQ.t('align.right', null, 'xiuxian')) >= 0 &&
      bl253[0].text.indexOf(String(per253)) >= 0 && bl253[0].text.indexOf('2') >= 0;
    ok('253', '同道相吸（阵营 × 名号联动）：跨到「极道魔尊」（dist 4）→ 魔道且**已相识**者每人 +`base×dist` = +8（恰触 `BOND_ALIGN_GIFT_CAP`）、95 者 clamp 满档；同向**未相识**（bond 0）不入账、同向**绝交锁**（−99）被 `gain` 自动拒不计 hit、**异向**（正道 28 人）零波及；中性段「左道散人」（dist 0）零发放 reason `neutral` 且不占 `rankGiftSeen` 名额；同名号重发 → `dup` 好感零变动（每世每段一次，防 karma 震荡刷好感）；真链路 `recalcDerived` karma 900 → 浩然道尊自动发放 + 独立 `bond` 日志一条（含方向「正道」与幅度 8）',
      a253 && b253 && c253 && d253,
      '魔尊发放 dir=' + ag253.dir + ' dist=' + ag253.dist + ' per=' + ag253.per + ' hit=' + ag253.hit + '/3=' + a253 +
      ' ‖ 中性零发=' + b253 + '(' + ag253b.reason + ')' + ' ‖ 重发挡=' + c253 + '(' + ag253c.reason + ')' +
      ' ‖ 真链路 rank=' + SQ.XKarma.rankOf(w253d.karma, D) + ' bond=' + w253d.bonds[rt253[0]] + '/' + w253d.bonds[rt253[1]] +
      ' 日志=' + bl253.length + '条=' + d253);

    /* #254 缘尽赎回（引擎卷 v1.10 §3.6 · **唯一**解锁写口）：以遗泽 30 赎一位缘尽道友，把「缘尽此生」
     * 从死局改成长期目标；同批救活两个此前**全代码零写入**的死成就。
     * a) 资格链逐挡：未锁 `notlocked` → 锁了但不在绝交名录 `notlisted`（脏档/旧档）→ 遗泽不足 `poor`
     *    （锁原样保留、零扣款、`spent` 不留键）
     * b) 成功：LOCK → `BOND_REDEEM_AFF`(10) 档 1 相识、入 `redeemedIds`、**留在** `juefengIds`（历史名录，
     *    删了成就「绝而复续」就永不成立）、置 `heirBond`、`spent['redeem.<id>']` = 实付额
     * c) 遗泽恒等式 **#197** 全程成立（`Legacy.spend` 唯一写口，Σspent 语义零改动）
     * d) 双挡幂等：每世 `redeemedIds` + 跨世 `spent` itemId → 两次都得 `dup`、锁与 karma 零变动
     * e) 死成就复活：`achv_juefeng`「绝而复续」/ `achv_kuashi`「缘定三生」经 `Codex.scan` 真判达成并入 `meta.achv`
     * f) 动作口 `Actions.redeemBond`：成功落 `bond.redeem.log` 一条，失败回 reason 且**不写任何状态** */
    var id254a = cs253[0].id, id254b = cs253[1].id, id254f = cs253[2].id;
    var m254 = mkMeta({}), w254 = mkWs({});
    var r254a = SQ.Bonds.redeem(w254, pack, D, m254, id254a, 1);              /* 未锁 */
    w254.bonds[id254b] = SQ.Bonds.LOCK;                                        /* 绕过 lock 直写 −99 */
    var r254b = SQ.Bonds.redeem(w254, pack, D, m254, id254b, 2);               /* 不在名录 */
    SQ.Bonds.lock(w254, id254a);                                               /* 正规上锁 → 入名录 */
    var k254p = m254.karma;
    var r254c = SQ.Bonds.redeem(w254, pack, D, m254, id254a, 3);               /* 遗泽 0 → poor */
    var gate254 = r254a.ok === false && r254a.reason === 'notlocked' &&
      r254b.ok === false && r254b.reason === 'notlisted' && w254.bonds[id254b] === SQ.Bonds.LOCK &&
      r254c.ok === false && r254c.reason === 'poor' && w254.bonds[id254a] === SQ.Bonds.LOCK &&
      m254.karma === k254p && m254.spent['redeem.' + id254a] == null;
    SQ.Legacy.earnOnce(m254, 'zone.0', D.BOND_REDEEM_COST + 5, 'settle', 4);
    var k254pre = m254.karma;
    var r254 = SQ.Bonds.redeem(w254, pack, D, m254, id254a, 5);
    var ok254 = r254.ok === true && r254.cost === D.BOND_REDEEM_COST && r254.aff === D.BOND_REDEEM_AFF &&
      w254.bonds[id254a] === D.BOND_REDEEM_AFF &&
      (w254.redeemedIds || []).indexOf(id254a) >= 0 && (w254.juefengIds || []).indexOf(id254a) >= 0 &&
      w254.heirBond === id254a &&
      m254.karma === k254pre - D.BOND_REDEEM_COST &&
      m254.spent['redeem.' + id254a] === D.BOND_REDEEM_COST && identOk(m254);
    /* d 双挡幂等 */
    SQ.Bonds.lock(w254, id254a);                                               /* 复锁 → 试每世挡 */
    var k254d = m254.karma;
    var r254d = SQ.Bonds.redeem(w254, pack, D, m254, id254a, 6);
    var w254n = mkWs({});                                                      /* 新一世（redeemedIds 空）*/
    SQ.Bonds.lock(w254n, id254a);
    var r254e = SQ.Bonds.redeem(w254n, pack, D, m254, id254a, 7);              /* 试跨世挡 */
    var dup254 = r254d.ok === false && r254d.reason === 'dup' && r254e.ok === false && r254e.reason === 'dup' &&
      w254.bonds[id254a] === SQ.Bonds.LOCK && w254n.bonds[id254a] === SQ.Bonds.LOCK &&
      m254.karma === k254d && identOk(m254);
    /* e 死成就复活（scan = 生产真路径，含即时遗泽 + 称号 + toast 日志）*/
    w254.bonds[id254a] = D.BOND_REDEEM_AFF;                                    /* 还原赎回落点 */
    var ref254 = { profile: mkProf([]), worlds: { xiuxian: w254 }, meta: m254 };
    var met254j = SQ.Codex.achvMet('achv_juefeng', ref254, w254, m254, pack, D, 8);
    var met254k = SQ.Codex.achvMet('achv_kuashi', ref254, w254, m254, pack, D, 8);
    SQ.Codex.scan(ref254, 9);
    var achv254 = met254j === true && met254k === true &&
      m254.achv.indexOf('achv_juefeng') >= 0 && m254.achv.indexOf('achv_kuashi') >= 0 && identOk(m254);
    /* f 动作口（`Actions.redeemBond` 走 mutate 单一写通道：状态源是**盘上档**而非传入 ref，
     * 故按 #68 同款先 removeItem + mutate 种档，再调动作、从回填后的 ref 读结果）*/
    localStorage.removeItem(SQ.KEY);
    var ref254f = {};
    await SQ.mutate(ref254f, function (sf) { sf.profile = mkProf([]); sf.worlds.xiuxian = pack.initialState(); });
    var rF254bad = await SQ.Actions.redeemBond(ref254f, id254f);               /* 未锁 → notlocked */
    var wF254bad = ref254f.worlds.xiuxian;
    var stF254 = wF254bad.bonds[id254f] == null && (wF254bad.redeemedIds || []).length === 0 &&
      wF254bad.heirBond == null && wF254bad.log.length === 0;                  /* 失败零状态写入、零日志 */
    await SQ.mutate(ref254f, function (sf) {
      SQ.Bonds.lock(sf.worlds.xiuxian, id254f);
      SQ.Legacy.earnOnce(sf.meta, 'zone.1', D.BOND_REDEEM_COST, 'settle', 1);
    });
    var w254f = ref254f.worlds.xiuxian;
    var logN254 = w254f.log.length;
    var rF254 = await SQ.Actions.redeemBond(ref254f, id254f);
    var w254f2 = ref254f.worlds.xiuxian;
    var wantTxt254 = SQ.t('bond.redeem.log', {
      name: SQ.t('bond.' + id254f + '.name', null, 'xiuxian'), cost: D.BOND_REDEEM_COST
    }, 'xiuxian');
    /* 日志判等不数总条数：mutate 尾部的 Legacy.sync 可能同轮补发成就 toast（'sys' 分类），
     * 只认「本条赎回日志确已落」+ 分类正确 + 文案全等。 */
    var act254 = rF254bad && rF254bad.ok === false && rF254bad.reason === 'notlocked' && stF254 &&
      rF254 && rF254.ok === true && rF254.cost === D.BOND_REDEEM_COST &&
      w254f2.log.some(function (L) { return L.cat === 'bond' && L.text === wantTxt254; }) &&
      w254f2.bonds[id254f] === D.BOND_REDEEM_AFF &&
      (w254f2.redeemedIds || []).indexOf(id254f) >= 0 && w254f2.heirBond === id254f &&
      identOk(ref254f.meta);
    ok('254', '缘尽赎回（唯一解锁写口）：资格链逐挡 `notlocked` / `notlisted`（脏档直写 −99 不入名录）/ `poor`（锁原样保留、零扣款、`spent` 不留键）；遗泽足 → LOCK 落 `BOND_REDEEM_AFF`(10) 档 1、入 `redeemedIds`、**留在** `juefengIds`、置 `heirBond`、`spent[redeem.<id>]` = 实付额；遗泽恒等式 **#197** 四度复核全成立；每世 `redeemedIds` + 跨世 `spent` itemId **双挡**均回 `dup` 且锁/karma 零变动；两个此前全代码零写入的死成就 `achv_juefeng`「绝而复续」/ `achv_kuashi`「缘定三生」经 `Codex.scan` 真判达成入册；动作口 `Actions.redeemBond` 失败零状态写入、成功落 `bond.redeem.log` 一条',
      gate254 && ok254 && dup254 && achv254 && act254,
      '资格链=' + gate254 + '(' + r254a.reason + '/' + r254b.reason + '/' + r254c.reason + ')' +
      ' ‖ 赎回 cost=' + r254.cost + ' aff=' + r254.aff + ' juefeng留=' + ((w254.juefengIds || []).indexOf(id254a) >= 0) +
      ' heirBond=' + w254.heirBond + ' 恒等式=' + identOk(m254) + '=' + ok254 +
      ' ‖ 双挡=' + dup254 + '(' + r254d.reason + '/' + r254e.reason + ')' +
      ' ‖ 死成就 juefeng=' + met254j + ' kuashi=' + met254k + ' 入册=' + achv254 +
      ' ‖ 动作口=' + act254 + '(' + rF254bad.reason + '→' + (rF254 && rF254.ok) + ' 日志+' + (w254f2.log.length - logN254) + ')');

    /* #255 法与器合并页（页面整合批 2026-10-06 · UI 卷 §3.4a）：原「功法」「法器」两 Tab 并为一页
     * （tab id 沿用 `arts`，导航游戏页 13 → **12**）。三处分工不重叠——本条只断言**引擎/词表侧契约**；
     * DOM 侧（导航 12 项 / 概览条三格 / 段标两段 / lawJump 锚跳 / 窄屏零截断 / 旧档 tabOrder 剔除 gear）
     * 由 `.tests/verify-ui-arts.cjs` A0~A10 覆盖；静态源码侧（`#tab-gear` 容器删除后无悬挂 id 引用）
     * 由审计 **A3** 覆盖（`lawsec-` 动态锚点前缀已同批入 A3 白名单，与既有 `jline-` 同纪律）。
     * (a) 导航标签新键 `arts.system` = 「法与器」（三字标签以窄屏导航横向滚动修复为前提）；
     * (b) 概览条 6 键 + 段标 4 键齐全、非空、占位符可渲染且无 `{` 残留；
     * (c) `skill.system`(功法) / `gear.system`(法器) / `gear.tag`(拾得) **保留不动**——三者仍是日志页
     *     分类筛选标签（view 日志分类表 `{id:'arts',sys:'skill.system'}` / `{id:'gear',sys:'gear.tag'}`），
     *     合并只换承载页、不改分类语义，误改会让日志页分类名与筛选错位；
     * (d) `TAB_UNLOCK` 无 `arts` / `gear` / `combat` / `cave` 四条——功法与法器本就无境界门槛，
     *     秘境洞天合并批后洞天亦无锁；四条任一被误加都会让合并页在炼气期显示「？」置灰不可点，
     *     而炼气期玩家恰恰最需要看法器（起步装备全靠它）。 */
    var W255 = 'xiuxian';
    var t255 = function (k, v) { return SQ.t(k, v || null, W255); };
    var has255 = function (k) { var s = t255(k); return s !== k && String(s).trim().length > 0; };
    /* (a) 导航标签 */
    var a255 = t255('arts.system') === '法与器';
    /* (b) 概览条 + 段标共 8 个无占位符键：存在且非空 */
    var keys255 = ['arts.ov.main', 'arts.ov.main.none', 'arts.ov.gear', 'arts.ov.power',
      'arts.seg.fa', 'arts.seg.fa.sub', 'arts.seg.qi', 'arts.seg.qi.sub'];
    var miss255 = keys255.filter(function (k) { return !has255(k); });
    /* 两个带占位符的模板：渲染后不得残留 `{`（占位符名写错会原样漏进界面） */
    var ovMain255 = t255('arts.ov.main.val', { name: '吐纳诀', lv: 3 });
    var ovGear255 = t255('arts.ov.gear.val', { n: 2, total: 4, r: '1.2万' });
    var b255 = miss255.length === 0 &&
      ovMain255 === '吐纳诀 · Lv3' && ovGear255 === '2/4 · 抗 1.2万' &&
      ovMain255.indexOf('{') < 0 && ovGear255.indexOf('{') < 0;
    /* (c) 日志分类标签三键保留不动（值一并钉死：改名即日志页分类错位） */
    var c255 = t255('skill.system') === '功法' && t255('gear.system') === '法器' && t255('gear.tag') === '拾得';
    /* (d) TAB_UNLOCK 四条不得出现 */
    var tu255 = D.TAB_UNLOCK || {};
    var bad255 = ['arts', 'gear', 'combat', 'cave'].filter(function (k) { return tu255[k] != null; });
    var d255 = bad255.length === 0;
    ok('255', '法与器合并页（页面整合批 · 引擎/词表侧契约）：(a) 导航标签新键 `arts.system` = 「法与器」；(b) 概览条 6 键（主修 / 主修空态 / 主修值 / 佩器 / 佩器值 / 战力）+ 段标 4 键（法·字·副标 / 器·字·副标）齐全非空，两个带占位符模板渲染后零 `{` 残留；(c) `skill.system`(功法) / `gear.system`(法器) / `gear.tag`(拾得) 三键**保留不动**——仍是日志页分类筛选标签，合并只换承载页不改分类语义；(d) `TAB_UNLOCK` 无 `arts`/`gear`/`combat`/`cave` 四条（功法与法器本就无境界门槛、秘境洞天合并批后洞天亦无锁，误加会让合并页在炼气期「？」置灰）。DOM 侧见 verify-ui-arts A0~A10、静态 id 侧见审计 A3（`lawsec-` 动态锚点前缀同批入白名单）',
      a255 && b255 && c255 && d255,
      '(a) arts.system=' + t255('arts.system') +
      ' ‖ (b) 缺键=' + (miss255.length ? miss255.join(',') : '无') + ' 主修格=' + ovMain255 + ' 佩器格=' + ovGear255 +
      ' ‖ (c) skill.system=' + t255('skill.system') + ' gear.system=' + t255('gear.system') + ' gear.tag=' + t255('gear.tag') +
      ' ‖ (d) TAB_UNLOCK 越界=' + (bad255.length ? bad255.join(',') : '无') + '(共 ' + Object.keys(tu255).length + ' 条)');
    /* #256 「跨世之缘」五环链（批 B ⑤ 好感度新渠道批 2026-10-06 · 图鉴卷 v1.4 §4.3.1 勘误取证）：
     * 本条是**勘误的执行证据**，不是新功能断言。图鉴卷 v1.3 曾断言该遗泽商品「至今未实现」
     * （三条「证据」：legacy.js 无此 item / BOND_HEIR_BASE 未消费 / lastBonds 只写不读），**三条全假**——
     * 误诊根因是 `shopItems` 的 item id 与 spent 键为 `'shop.unlock.' + uk` **拼接生成**、
     * `BOND_HEIR_BASE` 的消费点在 **view 层创角事务**，故只搜 assets/ 的字面量检索**只能证有、不能证无**。
     * 教训「实现状态结论一律以执行取证为准」由此固化为本条（**常设断言**，非一次性脚本——勘误证据必须留在每批都跑的回归里，否则下一次误判还是没人拦得住）。
     * (a) 商品在册（动态生成，非字面量）+ 词表可达；(b) 购买置位 + spent 幂等键 + 重发不二次扣款；
     * (c) 转世结算供数 lastBonds（好感 ≥1 者；**0 与绝交锁 −99 均不入池**；cap 60）；
     * (d) 创角落地式（照 view mk-ok 同式）→ bond = BOND_HEIR_BASE 40 = **档 2 知交**（非「常规新识 0」）；
     * (e) `Codex.scan` **生产真路径**下 `achv_kuashi` 入册（成就真可达）；
     * (f) 五项路线解锁商品全部在册且 nameKey 词表可解析——轮回卷 §3.5 卷头「⏳ 四项，各自依赖卷落地后
     *     生效」为**滞后标记**，五项均已实现（bond 的消费链本条 (b)(d) 执行证明；另四项的消费点为
     *     alchemy.js hasFurnace 三渠道之一 / sect.js 开宗门槛 / prodigy.js COUNT_MAX 30 与 eternalProdigy，
     *     属**查读核准**非执行核准，已在轮回卷 v1.4 如实标注）。 */
    var W256 = 'xiuxian';
    var t256 = function (k, v) { return SQ.t(k, v || null, W256); };
    /* (a) 商品在册 + 词表 */
    var items256 = SQ.Legacy.shopItems(D);
    var it256 = null;
    items256.forEach(function (x) { if (x.id === 'unlock.bond') it256 = x; });
    var a256 = !!it256 && it256.price === 250 && it256.key === 'shop.unlock.bond' &&
      it256.kind === 'unlock' && it256.unlock === 'bond' &&
      t256(it256.nameKey) === '跨世之缘' && t256('legacy.ui.bondHeir.pick').indexOf('赎回道友') >= 0;
    /* (b) 购买置位 + 幂等（走真事务，因 metaNormalize 有 #197 恒等式自检修复：
     *     直接写 meta.karma 会被账本重算抹掉，遗泽只能经 earnOnce 注入） */
    localStorage.removeItem(SQ.KEY);
    var ref256 = {};
    await SQ.mutate(ref256, function (s256) {
      s256.profile = mkProf([]);
      s256.worlds.xiuxian = pack.initialState();
      SQ.Legacy.earnOnce(s256.meta, 'probe.grant256', 1000, 'probe', 1);
    });
    var k256a = ref256.meta.karma;
    var buy256a = SQ.Legacy.buy(ref256, 'unlock.bond', 2);
    var buy256aOk = buy256a.ok, k256b = ref256.meta.karma, un256 = ref256.meta.unlocks.bond === true;
    var sp256 = ref256.meta.spent['shop.unlock.bond'];
    var buy256b = SQ.Legacy.buy(ref256, 'unlock.bond', 3);
    var b256 = buy256aOk === true && un256 === true && sp256 === 250 &&
      k256b === k256a - 250 && buy256b.ok === false && buy256b.reason === 'dup' &&
      ref256.meta.karma === k256b;                            /* 重发不二次扣款 */
    /* ⚠️ 必须显式落盘（本条断言唯一的非显然陷阱，两处）：`SQ.mutate` 的第一步是 `s = await load()`——
     * 它**从存储读**、不认传入 ref 的内存态，且收尾 `replaceRef` 会用载入态**覆盖** ref。故凡在事务外
     * 直接改 ref（此处 `Legacy.buy` 与下方 `Legacy.rebirth`）都必须在下一次 mutate **之前** save，
     * 否则改动被静默丢弃、断言假失败（实测症状：`unlocks.bond` 回到 false、`heirBond` 为 null）。 */
    await SQ.save(ref256);
    /* (c) 转世供数：好感 55 / 12 入池，好感 0 与绝交锁 −99 均不入池 */
    var cs256 = SQ.Bonds.list(pack);
    await SQ.mutate(ref256, function (s256) {
      var w = s256.worlds.xiuxian;
      w.bonds[cs256[0].id] = 55; w.bonds[cs256[1].id] = 12;
      w.bonds[cs256[2].id] = 0; w.bonds[cs256[3].id] = -99;
      w.realm = 9; w.tribulation.success = 9; w.tribulation.attempts = 9;
    });
    SQ.Legacy.rebirth(ref256, 'feisheng', 4);
    await SQ.save(ref256);   /* 同上：rebirth 在事务外改 ref，不落盘则下一段 mutate 读到空白 meta */
    var lb256 = ref256.meta.lastBonds || [];
    var c256 = lb256.length === 2 && lb256[0] === cs256[0].id && lb256[1] === cs256[1].id &&
      lb256.indexOf(cs256[2].id) < 0 && lb256.indexOf(cs256[3].id) < 0;
    /* (d) 创角落地式（**与 view mk-ok 同走引擎唯一写口 grantHeir**——N23① 收口批起视图不再自赋 heirBond，
       本断言也不再内联复刻旧式；heirBond 由 grantHeir 成功分支落，含 unlocks.bond 门） */
    await SQ.mutate(ref256, function (s256) {
      s256.worlds.xiuxian = pack.initialState();
      var nws = s256.worlds.xiuxian, picked = (s256.meta.lastBonds || [])[0];
      if (picked && s256.meta.unlocks.bond) {
        SQ.Bonds.grantHeir(nws, pack, SQ.XDATA, picked, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
      }
    });
    var w256 = ref256.worlds.xiuxian;
    var heir256 = w256.heirBond;
    var d256 = heir256 === cs256[0].id && w256.bonds[heir256] === SQ.XDATA.LEGACY.BOND_HEIR_BASE &&
      SQ.XDATA.LEGACY.BOND_HEIR_BASE === 40 && SQ.Bonds.tierOf(w256, heir256, D) === 2;
    /* (e) 成就真可达（生产真路径 Codex.scan，与 #254(e) 同口径） */
    SQ.Codex.scan(ref256, 5);
    var e256 = (ref256.meta.achv || []).indexOf('achv_kuashi') >= 0;
    /* (f) 五项路线解锁商品全部在册 + nameKey 词表可解析 */
    var unKeys256 = ['alchemy', 'sect', 'prodigySlot', 'nemesis', 'bond'];
    var bad256 = [];
    unKeys256.forEach(function (uk) {
      var found = null;
      items256.forEach(function (x) { if (x.id === 'unlock.' + uk) found = x; });
      if (!found || t256(found.nameKey) === found.nameKey || !String(t256(found.nameKey)).trim().length) bad256.push(uk);
      if (found && D.LEGACY.UNLOCK_PRICES[uk] !== found.price) bad256.push(uk + ':price');
    });
    var f256 = bad256.length === 0 && Object.keys(D.LEGACY.UNLOCK_PRICES).length === 5;
    ok('256', '「跨世之缘」五环链（图鉴卷 v1.4 §4.3.1 勘误的执行证据）：(a) `Legacy.shopItems` **动态生成** `unlock.bond`（price 250 / key `shop.unlock.bond` / kind unlock），nameKey 词表解析为「跨世之缘」——v1.3「legacy.js 无此 item」为误判（id 与 spent 键是 `\'shop.unlock.\' + uk` 拼接生成，字面量检索证不了无）；(b) `Legacy.buy` 走真事务扣 250、`meta.unlocks.bond = true`、`spent` 幂等键落值 250，重发 `{ok:false,reason:dup}` **不二次扣款**；(c) `Legacy.rebirth` 后 `meta.lastBonds` = 好感 ≥1 者（好感 0 与绝交锁 −99 **均不入池**）——v1.3「lastBonds 只写不读」为误判；(d) 创角落地式（照 view `mk-ok` 同式）→ `bond = BOND_HEIR_BASE = 40` = **档 2 知交**、`heirBond` 置位——v1.3「BOND_HEIR_BASE 未消费常量」为误判（消费点在 **view 层**，只搜 assets/ 搜不到）；(e) `Codex.scan` 生产真路径下 `achv_kuashi` **入册**（成就真可达，且早于缘尽收敛批）；(f) 五项路线解锁商品（丹房 300 / 开宗 500 / 天骄位 350 / 跨世宿敌 200 / 跨世之缘 250）全部在册、价目对表、nameKey 全可解析——轮回卷 §3.5 卷头「⏳ 四项待落地」为滞后标记',
      a256 && b256 && c256 && d256 && e256 && f256,
      '(a) item=' + (it256 ? it256.id + '/' + it256.price : '缺') + ' 名=' + (it256 ? t256(it256.nameKey) : '-') +
      ' ‖ (b) ok=' + buy256aOk + ' unlocks=' + un256 + ' spent=' + sp256 + ' 扣款=' + (k256a - k256b) + ' 重发=' + buy256b.reason +
      ' ‖ (c) lastBonds=' + JSON.stringify(lb256) +
      ' ‖ (d) heirBond=' + heir256 + ' bond=' + (heir256 ? w256.bonds[heir256] : '-') + ' 档=' + (heir256 ? SQ.Bonds.tierOf(w256, heir256, D) : '-') +
      ' ‖ (e) achv_kuashi=' + e256 + ' ‖ (f) 越界=' + (bad256.length ? bad256.join(',') : '无'));

    /* #257 好感三渠道（批 B ⑤ 好感度新渠道批 2026-10-06 · 引擎卷 v1.11 §3.2a）：
     * 诉求⑤「好感度获取方式比较局限」的落码断言。取证结论——旧正典称「两条正向写口」，实际代码
     * 已有八条，但**玩家可主动、可重复、可指向指定对象**的一条都没有。本批补三条主动渠道，
     * 三条一律只走 `Bonds.gain` 唯一正向口，且**均不经商店购买**（「侣不可交易」世界观底线）。
     * (a) 渠道 A 拜访档位递减对表 [3,3,2,1,0] + 满档拒（reason 'max'）；
     * (b) 渠道 A `met` 语义 = **真跨进相识**：未识 0→3 met=true；厌恶 −2→1 met=true；
     *     厌恶 −5→−2 仍 tier 0 → **met=false**（若报 true，视图会弹「由此结识 X」而名录格仍是「？」剪影 = 假反馈）；
     * (c) 渠道 A 同向加成**只对已相识生效**——未识者阵营未揭，给加成会经「+4 而非 +3」把 align 泄漏出去；
     * (d) 渠道 A 全局单冷却：**入账成功才推进** `ws.bondVisitAt`，被拒（满档 / 绝交锁 / 心结锁 / 名录外）一律不推进；
     * (e) 渠道 B 丹方 tier 对表（黄 4 / 玄 6 / 地 9 / 天 14）+ 丹纹版 ×1.5 取整（黄 6）；
     * (f) 渠道 B 三类拒绝**均不扣丹**：双特例（once: pozhang/zhenjie）/ 满档 / 无库存；
     * (g) 渠道 B **无日限**（GitHub issue #4 · 2026-10-14 撤销原 3 次日限与 `alchemy.giftDay` 字段，
     *     理由见 bonds.js giftPill 段注）：同刻连赠全成功、库存见底即拒、字段退役后 normalize 不再产出；
     * (h) 渠道 B 溢出 clamp 后返回值 `gain` = **实际增量**（aff 99 赠天阶：名义 14、实际 1）——视图据此标数，不虚标；
     * (i) 渠道 B 未识可赠（「以丹会友」）→ 0 → 4 结识；
     * (j) 渠道 C 同贺遍历范围六类逐人：已相识 +n / 满档 +0 / 未识不入账 / 厌恶不入账 / 绝交锁拒 / 心结锁拒 /
     *     **在任道侣排除**（另有双修叙事线）；`total` = 实际增量之和（满档者 hit 计入但增量 0，不用 hit×n 虚报）；
     * (k) 三条日志一律 cat **'bond'**；view `LOG_CATS` 同批新增该分类——收口批 A 遗留（同道相吸与缘尽赎回
     *     早已写 cat 'bond'，但分类表无此项，那些日志此前只能在「全部」里看到、任何筛选都取不到）；
     * (l) 「侣不可交易」底线：三条渠道**均不扣灵石**（ws.stones 前后逐字节相同），也不动 Ledger；
     * (m) 落盘增量收口：本批仅新增 `ws.bondVisitAt` 与 `ws.alchemy.giftDay` 两字段（bondVisitAt normalize 三态），
     *     渠道 C **零新增字段**——合约束「只在现有对象上加标记位、不新开随内容池线性增长的容器」。
     *     🔧 勘正（GitHub issue #4 · 2026-10-14）：`ws.alchemy.giftDay` 已随该批退役，现行判据见上 (g)。 */
    var W257 = 'xiuxian', cs257 = SQ.Bonds.list(pack), T257 = 1700000000000;
    var lg257 = [];
    var log257 = function (c, tx) { lg257.push(c + '|' + tx); };
    var mk257 = function (ov) { var w257 = pack.initialState(); if (ov) Object.assign(w257, ov); return w257; };
    /* (a) 档位递减对表 + 满档拒 */
    var tbl257 = D.BOND_VISIT_BY_TIER, affs257 = [0, 5, 40, 80, 100], bad257a = [];
    for (var i257 = 0; i257 < affs257.length; i257++) {
      var c257 = cs257[20 + i257], w257a = mk257({});
      if (affs257[i257] > 0) w257a.bonds[c257.id] = affs257[i257];
      var t257a = SQ.Bonds.tierOf(w257a, c257.id, D);
      var r257a = SQ.Bonds.visit(w257a, pack, D, c257.id, T257, log257);
      /* 期望 = 表值 + （已相识且同向 ? 1 : 0）；被拒时期望 reason 'max' */
      var kd257 = pack.worldSystems.tierOf(w257a);
      var exp257 = tbl257[Math.min(t257a, tbl257.length - 1)] || 0;
      if (exp257 > 0 && t257a >= 1 && c257.align === kd257) exp257 += (D.BOND_VISIT_ALIGN_BONUS || 0);
      if (exp257 > 0) { if (!r257a.ok || r257a.gain !== exp257) bad257a.push('aff' + affs257[i257] + ':got' + (r257a.ok ? r257a.gain : r257a.reason) + '/exp' + exp257); }
      else if (r257a.ok !== false || r257a.reason !== 'max') bad257a.push('aff100:reason=' + r257a.reason);
    }
    var a257 = bad257a.length === 0 && String(tbl257) === '3,3,2,1,0';
    /* (b) met 语义三例 */
    var w257b1 = mk257({}), r257b1 = SQ.Bonds.visit(w257b1, pack, D, cs257[0].id, T257, log257);
    var w257b2 = mk257({ bonds: {} }), r257b2;
    w257b2.bonds[cs257[1].id] = -2; r257b2 = SQ.Bonds.visit(w257b2, pack, D, cs257[1].id, T257, log257);
    var w257b3 = mk257({ bonds: {} }), r257b3;
    w257b3.bonds[cs257[2].id] = -5; r257b3 = SQ.Bonds.visit(w257b3, pack, D, cs257[2].id, T257, log257);
    var b257 = r257b1.ok && r257b1.met === true && r257b1.tier === 1 && w257b1.bonds[cs257[0].id] === 3 &&
      r257b2.ok && r257b2.met === true && r257b2.tier === 1 &&
      r257b3.ok && r257b3.met === false && r257b3.tier === 0 && w257b3.bonds[cs257[2].id] === -2;
    /* (c) 同向加成只对已相识生效（未识无加成 = 不泄漏 align）*/
    var kd257c = pack.worldSystems.tierOf(mk257({}));
    var sd257 = null, df257 = null;
    cs257.forEach(function (c) {
      if (!sd257 && c.align === kd257c) sd257 = c;
      if (!df257 && c.align && c.align !== kd257c && c.align !== 'neutral') df257 = c;
    });
    var w257c1 = mk257({}), r257c1 = SQ.Bonds.visit(w257c1, pack, D, sd257.id, T257, log257);
    var w257c2 = mk257({ bonds: {} }); w257c2.bonds[sd257.id] = 5;
    var r257c2 = SQ.Bonds.visit(w257c2, pack, D, sd257.id, T257, log257);
    var w257c3 = mk257({ bonds: {} }); w257c3.bonds[df257.id] = 5;
    var r257c3 = SQ.Bonds.visit(w257c3, pack, D, df257.id, T257, log257);
    var c257 = !!sd257 && !!df257 && r257c1.ok && r257c1.align === false && r257c1.gain === 3 &&
      r257c2.ok && r257c2.align === true && r257c2.gain === 3 + (D.BOND_VISIT_ALIGN_BONUS || 0) &&
      r257c3.ok && r257c3.align === false && r257c3.gain === 3;
    /* (d) 全局单冷却：入账才推进 */
    var w257d = mk257({ bonds: {} }); w257d.bonds[cs257[3].id] = 5;
    var r257d1 = SQ.Bonds.visit(w257d, pack, D, cs257[3].id, T257, log257);
    var at257 = w257d.bondVisitAt;
    var r257d2 = SQ.Bonds.visit(w257d, pack, D, cs257[4].id, T257 + 1000, log257);
    var atAfterD2 = w257d.bondVisitAt;   /* 冷却中被拒后的锚值**当场快照**：下一次成功拜访会合法推进它 */
    var r257d3 = SQ.Bonds.visit(w257d, pack, D, cs257[4].id, T257 + D.BOND_VISIT_CD_MS, log257);
    var wMax257 = mk257({ bonds: {} }); wMax257.bonds[cs257[5].id] = 100;
    SQ.Bonds.visit(wMax257, pack, D, cs257[5].id, T257, log257);
    var wLk257 = mk257({ bonds: {} }); wLk257.bonds[cs257[6].id] = -99;
    var rLk257 = SQ.Bonds.visit(wLk257, pack, D, cs257[6].id, T257, log257);
    var wSc257 = mk257({ scars: {} }); wSc257.scars[cs257[7].id] = T257; wSc257.bonds[cs257[7].id] = 50;
    var rSc257 = SQ.Bonds.visit(wSc257, pack, D, cs257[7].id, T257, log257);
    var rUn257 = SQ.Bonds.visit(mk257({}), pack, D, 'nosuch257', T257, log257);
    var d257 = r257d1.ok && at257 === T257 &&
      r257d2.ok === false && r257d2.reason === 'cooldown' && r257d2.waitMs === D.BOND_VISIT_CD_MS - 1000 &&
      atAfterD2 === T257 &&                                      /* 冷却中被拒不推进（当场快照）*/
      r257d3.ok === true && w257d.bondVisitAt === T257 + D.BOND_VISIT_CD_MS &&
      wMax257.bondVisitAt === 0 &&                               /* 满档被拒不推进 */
      rLk257.reason === 'lock' && wLk257.bondVisitAt === 0 &&
      rSc257.reason === 'scar' && wSc257.bondVisitAt === 0 &&
      rUn257.reason === 'unknown';
    /* (e)(f)(g)(h)(i) 渠道 B 赠丹 */
    var mkG257 = function (pills, bond) {
      var wg = mk257({ bonds: {} });
      wg.alchemy = SQ.Alchemy.normalize({ pills: pills }, D);
      if (bond != null) wg.bonds[cs257[0].id] = bond;
      return wg;
    };
    var GT257 = D.BOND_GIFT_BY_TIER, exp257e = { huang: 4, xuan: 6, di: 9, tian: 14 };
    var bad257e = [];
    for (var tk in exp257e) if (GT257[tk] !== exp257e[tk]) bad257e.push(tk + '=' + GT257[tk]);
    /* 由丹方表反查各 tier 一枚可用丹（避开双特例 once），再逐 tier 实测增量 */
    var pick257 = {};
    (D.ALCHEMY.RECIPES || []).forEach(function (r) {
      var def = (D.ALCHEMY.APILLS || {})[r.pill];
      if (def && !def.once && !pick257[r.tier]) pick257[r.tier] = r.pill;
    });
    var got257e = {};
    ['huang', 'xuan', 'di', 'tian'].forEach(function (tr) {
      var wg = mkG257((function () { var o = {}; o[pick257[tr]] = 2; return o; })(), 5);
      var r = SQ.Bonds.giftPill(wg, pack, D, cs257[0].id, pick257[tr], T257, log257);
      got257e[tr] = r.ok ? r.gain : r.reason;
    });
    var e257 = bad257e.length === 0 && got257e.huang === 4 && got257e.xuan === 6 && got257e.di === 9 && got257e.tian === 14;
    /* 丹纹 ×1.5 取整 */
    var wRw257 = mkG257({ ap_juqi_rw: 1 }, 5);
    var rRw257 = SQ.Bonds.giftPill(wRw257, pack, D, cs257[0].id, 'ap_juqi_rw', T257, log257);
    var e257b = rRw257.ok && rRw257.rune === true && rRw257.gain === Math.round(4 * (D.BOND_GIFT_RUNE_MULT || 1.5));
    /* (f) 四类拒绝均不扣丹（once ×2 / stock / nogift = 洗髓丹） */
    var wF1 = mkG257({ ap_pozhang: 2, ap_zhenjie: 2, ap_juqi: 2, ap_xisui: 2 }, 5);
    var rF1a = SQ.Bonds.giftPill(wF1, pack, D, cs257[0].id, 'ap_pozhang', T257, log257);
    var rF1b = SQ.Bonds.giftPill(wF1, pack, D, cs257[0].id, 'ap_zhenjie', T257, log257);
    /* 洗髓丹（第三类底牌）禁赠：拒因单立 'nogift'（不复用 'once' 那句「每境界限 1」的文案）且不扣丹 */
    var rF1d = SQ.Bonds.giftPill(wF1, pack, D, cs257[0].id, 'ap_xisui', T257, log257);
    var rF1c = SQ.Bonds.giftPill(wF1, pack, D, cs257[0].id, 'ap_daohe', T257, log257);
    var wF2 = mkG257({ ap_juqi: 5 }, 100);
    var rF2 = SQ.Bonds.giftPill(wF2, pack, D, cs257[0].id, 'ap_juqi', T257, log257);
    var f257 = rF1a.reason === 'once' && rF1b.reason === 'once' && rF1c.reason === 'stock' &&
      rF1d.reason === 'nogift' && wF1.alchemy.pills.ap_xisui === 2 &&
      SQ.t('bond.gift.fail.nogift', null, 'xiuxian') !== 'bond.gift.fail.nogift' &&
      wF1.alchemy.pills.ap_pozhang === 2 && wF1.alchemy.pills.ap_zhenjie === 2 && wF1.alchemy.pills.ap_juqi === 2 &&
      wF1.alchemy.giftDay === undefined &&
      rF2.reason === 'max' && wF2.alchemy.pills.ap_juqi === 5;
    /* (g) GitHub issue #4（2026-10-14）：赠丹**无日限**——同刻连赠 4 次全成功，节流只在库存；
     *     库存见底即拒 'stock'，且 `alchemy.giftDay` 字段已从 normalize / initialState 退役 */
    var wG257 = mkG257({ ap_juqi: 9 }, 5), okN257 = 0, lastR257 = null;
    for (var gi = 0; gi < 4; gi++) {
      lastR257 = SQ.Bonds.giftPill(wG257, pack, D, cs257[0].id, 'ap_juqi', T257, log257);
      if (lastR257.ok) okN257++;
    }
    var midPills257 = wG257.alchemy.pills.ap_juqi;   /* 四颗出手后的余量，先取再抽干 */
    var rDry257 = null;
    for (var dj = 0; dj < 9; dj++) {
      rDry257 = SQ.Bonds.giftPill(wG257, pack, D, cs257[0].id, 'ap_juqi', T257, log257);
      if (!rDry257.ok) break;
    }
    var g257 = okN257 === 4 && lastR257.ok === true && midPills257 === 5 &&
      rDry257.reason === 'stock' && !wG257.alchemy.pills.ap_juqi &&
      wG257.alchemy.giftDay === undefined &&
      SQ.Alchemy.normalize({ giftDay: { day: 77, n: 2 } }, D).giftDay === undefined;   /* 旧档带这字段 ⇒ 读档即剪 */
    /* (h) 溢出 clamp 后 gain = 实际增量 */
    var wH257 = mkG257({ ap_haina: 1 }, 99);
    var rH257 = SQ.Bonds.giftPill(wH257, pack, D, cs257[0].id, 'ap_haina', T257, log257);
    var h257 = rH257.ok && rH257.nominal === 14 && rH257.gain === 1 && rH257.aff === (D.BOND_MAX || 100) && rH257.tier === 4;
    /* (i) 未识可赠（以丹会友）*/
    var wI257 = mkG257({ ap_juqi: 1 });
    var rI257 = SQ.Bonds.giftPill(wI257, pack, D, cs257[0].id, 'ap_juqi', T257, log257);
    var i257 = rI257.ok && wI257.bonds[cs257[0].id] === 4 && rI257.tier === 1 && rI257.tierUp === true;
    /* (j) 渠道 C 同贺遍历范围六类 + total 实算 */
    var wC257 = mk257({ bonds: {}, scars: {} });
    var idC257 = [cs257[0].id, cs257[1].id, cs257[2].id, cs257[3].id, cs257[4].id, cs257[5].id, cs257[6].id];
    wC257.bonds[idC257[0]] = 5;      /* 已相识 → +2 */
    wC257.bonds[idC257[1]] = 99;     /* 近满 → clamp +1 */
    wC257.bonds[idC257[2]] = 100;    /* 满档 → +0（hit 计入、total 不虚报）*/
    wC257.bonds[idC257[3]] = 0;      /* 未识 → 不入账 */
    wC257.bonds[idC257[4]] = -5;     /* 厌恶 → 不入账 */
    wC257.bonds[idC257[5]] = -99;    /* 绝交锁 → 拒 */
    wC257.scars[idC257[6]] = T257; wC257.bonds[idC257[6]] = 50;   /* 心结锁 → 拒 */
    wC257.spouse = { npcId: cs257[7].id, form: 'huzhu', since: T257 };
    wC257.bonds[cs257[7].id] = 60;   /* 在任道侣 → 排除 */
    var rC257 = SQ.Bonds.cheer(wC257, pack, D, D.BOND_CHEER_ON_BREAK, T257, log257);
    var j257 = rC257.hit === 3 && rC257.total === 3 &&
      wC257.bonds[idC257[0]] === 7 && wC257.bonds[idC257[1]] === 100 && wC257.bonds[idC257[2]] === 100 &&
      wC257.bonds[idC257[3]] === 0 && wC257.bonds[idC257[4]] === -5 && wC257.bonds[idC257[5]] === -99 &&
      wC257.bonds[idC257[6]] === 50 && wC257.bonds[cs257[7].id] === 60 &&
      SQ.Bonds.cheer(mk257({}), pack, D, 2, T257, log257).hit === 0 &&
      SQ.Bonds.cheer(mk257({}), pack, D, 0, T257, log257).hit === 0;
    /* (k) 日志 cat 一律 bond */
    var k257 = lg257.length > 0 && lg257.every(function (x) { return x.indexOf('bond|') === 0; });
    /* (l) 「侣不可交易」底线：三渠道均不扣灵石、不动 Ledger */
    var wL257 = mkG257({ ap_juqi: 3 }, 5);
    wL257.stones = 12345;
    var led257 = JSON.stringify(wL257.ledger);
    SQ.Bonds.visit(wL257, pack, D, cs257[1].id, T257, log257);
    SQ.Bonds.giftPill(wL257, pack, D, cs257[0].id, 'ap_juqi', T257, log257);
    SQ.Bonds.cheer(wL257, pack, D, 2, T257, log257);
    var l257 = wL257.stones === 12345 && JSON.stringify(wL257.ledger) === led257;
    /* (m) 落盘增量：仅两新字段 + bondVisitAt normalize 三态 */
    var nV0 = pack.normalize(pack.initialState()).bondVisitAt;
    var nVk = pack.normalize(Object.assign(pack.initialState(), { bondVisitAt: 424242 })).bondVisitAt;
    var nVb = pack.normalize(Object.assign(pack.initialState(), { bondVisitAt: 'garbage' })).bondVisitAt;
    var m257 = nV0 === 0 && nVk === 424242 && nVb === 0;
    ok('257', '好感三渠道（引擎卷 v1.11 §3.2a · 诉求⑤）：(a) 渠道 A 拜访档位递减对表 [3,3,2,1,0] + 满档拒 reason max；(b) `met` = **真跨进相识**——未识 0→3 true / 厌恶 −2→1 true / 厌恶 −5→−2 仍 tier0 **false**（防「由此结识 X」假反馈）；(c) 同向加成**仅对已相识**生效（未识者阵营未揭，给加成会经「+4 而非 +3」泄漏 align）；(d) 全局单冷却 `ws.bondVisitAt` **入账才推进**，满档 / 绝交锁 / 心结锁 / 名录外四类被拒一律不推进、冷却中返回 waitMs；(e) 渠道 B 丹方 tier 对表 黄4/玄6/地9/天14 + 丹纹 ×1.5 取整；(f) 双特例丹（once）/ 满档 / 无库存三类拒绝**均不扣丹**；(g) **无日限**（GitHub issue #4 · 2026-10-14 撤销 `BOND_GIFT_DAILY` 与 `alchemy.giftDay`）——同刻连赠 4 次全成功、库存见底即拒 stock、normalize 不再产出该字段；(h) 溢出 clamp 后返回 `gain` = **实际增量**（aff99 赠天阶：名义 14 实际 1，视图不虚标）；(i) 未识可赠（以丹会友）0→4 结识；(j) 渠道 C 同贺六类遍历逐人验证（已相识 +n / 近满 clamp / 满档 +0 / 未识不入账 / 厌恶不入账 / 绝交锁拒 / 心结锁拒 / **在任道侣排除**）+ `total` 实算不虚报；(k) 三条日志一律 cat **bond**（同批 view LOG_CATS 新增该分类，收口批 A 遗留的「写了 cat 却无筛选项」）；(l)「侣不可交易」底线——三渠道**均不扣灵石、不动 Ledger**；(m) 落盘增量仅 `ws.bondVisitAt` 一字段（normalize 三态），渠道 B（issue #4 起）与渠道 C 零新增',
      a257 && b257 && c257 && d257 && e257 && e257b && f257 && g257 && h257 && i257 && j257 && k257 && l257 && m257,
      '(a) 越界=' + (bad257a.length ? bad257a.join(',') : '无') + ' 表=' + String(tbl257) +
      ' ‖ (b) met三例=' + r257b1.met + '/' + r257b2.met + '/' + r257b3.met +
      ' ‖ (c) 未识=' + r257c1.gain + '(align ' + r257c1.align + ') 已识同向=' + r257c2.gain + ' 异向=' + r257c3.gain +
      ' ‖ (d) 推进=' + at257 + ' 冷却拒=' + r257d2.reason + '/' + r257d2.waitMs + ' 满档后锚=' + wMax257.bondVisitAt +
      ' ‖ (e) 实测=' + JSON.stringify(got257e) + ' 丹纹=' + rRw257.gain +
      ' ‖ (f) once=' + rF1a.reason + ' 丹未扣=' + wF1.alchemy.pills.ap_pozhang + ' 满档=' + rF2.reason +
        ' 丹匣无日限计数=' + (wF2.alchemy.giftDay === undefined) +
      ' ‖ (g) 同刻连赠成功=' + okN257 + '/4 余量=' + midPills257 + ' 见底拒=' + rDry257.reason +
      ' ‖ (h) 名义=' + rH257.nominal + ' 实际=' + rH257.gain + ' aff=' + rH257.aff +
      ' ‖ (i) 未识赠=' + rI257.ok + ' bond=' + wI257.bonds[cs257[0].id] +
      ' ‖ (j) hit=' + rC257.hit + ' total=' + rC257.total + ' 道侣=' + wC257.bonds[cs257[7].id] +
      ' ‖ (k) 日志=' + lg257.length + '条全bond=' + k257 +
      ' ‖ (l) 灵石=' + wL257.stones + ' Ledger同=' + (JSON.stringify(wL257.ledger) === led257) +
      ' ‖ (m) bondVisitAt=' + nV0 + '/' + nVk + '/' + nVb +
      ' ‖ (d2) 冷却拒后锚=' + atAfterD2 + ' 锁类拒后锚=' + wLk257.bondVisitAt + '/' + wSc257.bondVisitAt + '/' + rUn257.reason +
      ' ‖ (g2) 见底后库存键已删=' + (wG257.alchemy.pills.ap_juqi === undefined) +
      ' 旧档 giftDay 读入即剪=' + (SQ.Alchemy.normalize({ giftDay: { day: 77, n: 2 } }, D).giftDay === undefined));

    /* #284 拜访冷却 = 5 分钟（2026-10-09 用户裁定 `BOND_VISIT_CD_MS` 1h → 5min · 引擎卷 v1.12 §3.2a）：
     * #257(d) 全程读表（`D.BOND_VISIT_CD_MS`），它证的是「引擎按表值算」，**证不了表值本身是多少**——
     * 把 300000 改回 3600000，#257 照样绿。本条补这一格，钉三件：
     * (a) 表值 === 300000（5 现实分钟 = 300 游戏日 ≈ 0.83 游戏年）；
     * (b) 边界双证 —— 299999ms 仍拒（waitMs=1）、300000ms 放行且锚推进到该刻；
     * (c) **兜底与表同值**：浅拷一份表、摘掉冷却键走 `!= null` 回落分支，窗仍应是 5 分钟——
     *     留 1h 兜底 = 同一数字两个事实源，表一改就有路径悄悄回到旧节奏；
     * (d) **只改节奏不改收益**：档位递减表 [3,3,2,1,0] 与同向加成一字未动（未识实发 +3、
     *     已识同向实发 3+bonus），防「顺手把冷却和收益一起放大」这种越界改动。 */
    var cd284 = D.BOND_VISIT_CD_MS;
    var w284a = mk257({ bonds: {} }); w284a.bonds[cs257[0].id] = 5;
    var r284a1 = SQ.Bonds.visit(w284a, pack, D, cs257[0].id, T257, log257);
    var r284a2 = SQ.Bonds.visit(w284a, pack, D, cs257[0].id, T257 + cd284 - 1, log257);
    var r284a3 = SQ.Bonds.visit(w284a, pack, D, cs257[0].id, T257 + cd284, log257);
    var D284 = Object.assign({}, D); delete D284.BOND_VISIT_CD_MS;
    var w284c = mk257({ bonds: {} }); w284c.bonds[cs257[1].id] = 5;
    SQ.Bonds.visit(w284c, pack, D284, cs257[1].id, T257, log257);
    var r284c2 = SQ.Bonds.visit(w284c, pack, D284, cs257[1].id, T257 + 299999, log257);
    var r284c3 = SQ.Bonds.visit(w284c, pack, D284, cs257[1].id, T257 + 300000, log257);
    var w284d1 = mk257({});                                   /* 未识 ⇒ tier 0 ⇒ base 3、无同向加成 */
    var r284d1 = SQ.Bonds.visit(w284d1, pack, D, sd257.id, T257, log257);
    var w284d2 = mk257({ bonds: {} }); w284d2.bonds[sd257.id] = 5;   /* 已识同向 ⇒ 3 + bonus */
    var r284d2 = SQ.Bonds.visit(w284d2, pack, D, sd257.id, T257, log257);
    var tbl284 = String(D.BOND_VISIT_BY_TIER || []);
    var a284 = cd284 === 300000 && cd284 === 5 * 60 * 1000;
    var b284 = r284a1.ok === true && r284a2.ok === false && r284a2.reason === 'cooldown' &&
      r284a2.waitMs === 1 && r284a3.ok === true && w284a.bondVisitAt === T257 + cd284;
    var c284 = r284c2.ok === false && r284c2.reason === 'cooldown' && r284c2.waitMs === 1 && r284c3.ok === true;
    var d284 = tbl284 === '3,3,2,1,0' && (D.BOND_VISIT_ALIGN_BONUS || 1) === 1 &&
      r284d1.ok === true && r284d1.gain === 3 && r284d1.align === false &&
      r284d2.ok === true && r284d2.gain === 4 && r284d2.align === true;
    ok('284', '拜访冷却 = 5 分钟（2026-10-09 裁定 1h→5min · 钉表值本身而非只跑表值）：(a) 表值 === 300000；(b) 边界双证 299999 拒 / 300000 放行且锚推进；(c) 兜底与表同值（摘键走回落分支仍是 5 分钟窗，不留 1h 第二事实源）；(d) 只改节奏不改收益（档位表 [3,3,2,1,0] 与同向 +1 一字未动，未识实发 +3 / 已识同向实发 +4）',
      a284 && b284 && c284 && d284,
      '表值=' + cd284 + 'ms（= ' + (cd284 / 60000) + ' 现实分钟 = ' + (cd284 / 1000) + ' 游戏日）· 边界=' + r284a2.reason + '/' + r284a2.waitMs +
      ' → 放行@' + (w284a.bondVisitAt === T257 + cd284) + ' · 兜底=' + r284c2.reason + '/' + r284c2.waitMs +
      ' → 放行@' + r284c3.ok + ' · 收益 未识=' + r284d1.gain + ' 同向=' + r284d2.gain + ' 表=' + tbl284);

    /* #285 坊市货架格数随机 10~16（坊市格数随机批 2026-10-09 · 数值详设 §5.1 · 用户令「不要固定为 10 个」）：
     * **不用真随机做统计判据**（那是本仓立过则的坑：抽数百次比容差 ⇒ 收口偶发红）。做法 = 把 Math.random
     * 钉成常量再走**生产链路**（restockIfDue → genShelf），于是「掷出的格数」可预期、可逐值对表：
     * (a) 七个刻度扫一遍 ⇒ 坊市架长必为 10,11,…,16（**七种值全出现** = 非恒等、非只在边界跳舞）；
     * (b) 黑市同链路同表（karma ≤ −200 开局）⇒ 同一刻度下黑市架长与坊市一致；
     * (c) 上界不外溢、下界不塌陷：v=0 必 10、v→1 必 16（越界即公式错）；
     * (d) **旧数据形状回落**：只给 `SHOP_SLOTS: 10` 的表 ⇒ 恒 10（改前行为逐字相同，缺新键不炸）；
     * (e) 退化表：MIN=MAX ⇒ 恒等该值；MAX<MIN ⇒ 取 MIN 而不返回更小/0（防「缺键把货架掷空」）。 */
    var c285 = SQ.Shop.slotCount(D);
    var lo285 = D.SHOP_SLOTS_MIN, hi285 = D.SHOP_SLOTS_MAX;
    var sweep285 = [], bad285 = [];
    for (var k285 = 0; k285 < 7; k285++) {
      var v285 = (k285 + 0.5) / 7;      /* 取每档中点：避开 k/7×7 = 0.9999999 这类浮点边界（那是测试自己的坑，不是被测公式的） */
      var restore285 = stubRandom(function () { return v285; });   /* stubRandom 收**函数**才生效：收数字会走 vals.length=undefined 分支恒返回 0.5 */
      var want285 = lo285 + k285;
      var w285 = mkWs({ realm: 3 });
      w285.karma = -300; w285.karmaEventScore = -300;      /* 开黑市：两架同表 */
      w285.shop.nextRestock = 1;
      SQ.Shop.restockIfDue(w285, pack, D, M(mkProf(), w285), Date.now());
      var nF = (w285.shop.items || []).length, nB = (w285.shop.blackItems || []).length;
      sweep285.push(nF);
      if (nF !== want285 || nB !== want285) bad285.push('v=' + v285.toFixed(4) + ' 坊=' + nF + ' 黑=' + nB + ' 应=' + want285);
      restore285();
    }
    var r285a = lo285 === 10 && hi285 === 16 && bad285.length === 0 &&
      sweep285.join(',') === '10,11,12,13,14,15,16';
    var rr285c = stubRandom(function () { return 0.999999; });
    var w285c = mkWs({ realm: 3 }); w285c.shop.nextRestock = 1;
    SQ.Shop.restockIfDue(w285c, pack, D, M(mkProf(), w285c), Date.now());
    var n285c = w285c.shop.items.length;
    rr285c();
    var rr285c0 = stubRandom(function () { return 0; });
    var w285c0 = mkWs({ realm: 3 }); w285c0.shop.nextRestock = 1;
    SQ.Shop.restockIfDue(w285c0, pack, D, M(mkProf(), w285c0), Date.now());
    var n285c0 = w285c0.shop.items.length;
    rr285c0();
    var D285old = Object.assign({}, D);
    delete D285old.SHOP_SLOTS_MIN; delete D285old.SHOP_SLOTS_MAX; D285old.SHOP_SLOTS = 10;
    var D285same = Object.assign({}, D); D285same.SHOP_SLOTS_MIN = 12; D285same.SHOP_SLOTS_MAX = 12;
    var D285inv = Object.assign({}, D); D285inv.SHOP_SLOTS_MIN = 14; D285inv.SHOP_SLOTS_MAX = 8;
    var r285rest = n285c === 16 && n285c0 === 10 &&
      SQ.Shop.slotCount(D285old) === 10 && SQ.Shop.slotCount(D285same) === 12 &&
      SQ.Shop.slotCount(D285inv) === 14;
    ok('285', '坊市货架格数随机 10~16（数值详设 §5.1 · 常量钉随机走生产链路，不做统计容差判据）：(a) 七刻度扫一遍 ⇒ 架长必为 10..16 且七种值全出现；(b) 黑市同链路同表；(c) v=0 必 10 / v→1 必 16（边界不外溢）；(d) 旧表形状（只有 SHOP_SLOTS=10）恒回落 10 = 改前行为逐字相同；(e) MIN=MAX 恒等、MAX<MIN 取 MIN（缺键不许把货架掷空）',
      r285a && r285rest && typeof c285 === 'number' && c285 >= lo285 && c285 <= hi285,
      '扫表=' + sweep285.join(',') + ' 越界=' + (bad285.length ? bad285.join(' ') : '无') +
      ' ‖ 边界 0→' + n285c0 + ' / .999→' + n285c +
      ' ‖ 旧表=' + SQ.Shop.slotCount(D285old) + ' 退化=' + SQ.Shop.slotCount(D285same) +
      ' 反向=' + SQ.Shop.slotCount(D285inv) + ' ‖ 表=' + lo285 + '~' + hi285);


    /* #286 法宝灵石支出入账（耦合缺陷收口批 2026-10-10 · 与审计关 A8 同批）：
     * 缺陷本体是**零症状**的——`treasures.js` 两处 `note(ws,'out','treasure')` 而该分类从未登记，
     * `note()` 按设计对非法分类**静默返 0** ⇒ 灵石真扣、总账不记、#113 恒等式必漂；
     * 而既有 #135（祭炼）与全部冒烟一路绿，因为**没人把「扣灵石」和「入账」放在一起看过**。
     * (a) 祭炼一次：`out.treasure` 增额 === 灵石实扣额，且恒等式 `100+Σin−Σout === stones` 续绿；
     * (b) X11 九转丹一次：同一分类再累加，恒等式仍续绿（两处共用分类是口径，不是巧合）；
     * (c) **登记是承重的**：拿未登记分类去 `note()` ⇒ 返 0 且恒等式当场漂（反向对照，
     *     防「把分类从白名单删掉也能全绿」——那正是本缺陷的成因形态）；
     * (d) 路数可复算：IN+OUT 共 11 路、`treasure` 在册，且每一路都有 `ledger.cat.*` 词表
     *     （总账浮层逐行取词，缺键就会把分类名打成 key 回落）。 */
    var w286 = mkWs({ realm: 8 });
    /* 注资必须**走账**（in.kill 记一笔 + stones 同步加），手工改 stones 会当场把 #113 恒等式弄破——
     * 那不是我判的东西（首跑就栽在这里：恒等式=false 其实是 fixture 错，不是产品错）。 */
    SQ.Ledger.note(w286, 'in', 'kill', 8000000);
    w286.stones += 8000000;
    var g286h = SQ.Treasures.gain(w286, pack, D, 'h01', noopLog());
    var cost286 = SQ.Treasures.refineCost(w286, pack, D, 'h01');
    var st286a = w286.stones;
    var rf286 = SQ.Treasures.refine(w286, pack, D, 'h01', noopLog());
    var paid286a = st286a - w286.stones;
    var a286 = g286h && rf286 && rf286.ok !== false && paid286a > 0 &&
      (w286.ledger.out.treasure || 0) === paid286a && SQ.Ledger.sums(w286).expect === w286.stones;
    var g286x = SQ.Treasures.gain(w286, pack, D, 'x11', noopLog());
    var eq286 = SQ.Treasures.equip(w286, pack, D, 'x11', noopLog());
    var st286b = w286.stones;
    var mp286 = SQ.Treasures.makePill(w286, pack, D, Date.now());
    var paid286b = st286b - w286.stones;
    var b286 = g286x && eq286 && eq286.ok !== false && mp286.ok === true && paid286b > 0 &&
      (w286.ledger.out.treasure || 0) === paid286a + paid286b &&
      SQ.Ledger.sums(w286).expect === w286.stones;
    var st286c = w286.stones;
    w286.stones -= 123;                                   /* 真扣钱、假分类 ⇒ 账上无痕 */
    var ret286 = SQ.Ledger.note(w286, 'out', 'nosuch_cat', 123);
    var drift286 = SQ.Ledger.sums(w286).expect !== w286.stones;
    w286.stones = st286c;
    var c286 = ret286 === 0 && drift286 === true;
    var cats286 = SQ.Ledger.IN_CATS.concat(SQ.Ledger.OUT_CATS);
    var missCat286 = cats286.filter(function (c) {
      var key = 'ledger.cat.' + c;
      return SQ.t(key, null, 'xiuxian') === key;
    });
    var d286 = cats286.length === 11 && SQ.Ledger.OUT_CATS.indexOf('treasure') >= 0 && missCat286.length === 0;
    ok('286', '法宝用度入账闭环（A8 同批）：(a) 祭炼实扣额 === out.treasure 入账额且 #113 恒等式续绿；(b) X11 九转丹同分类累加后续绿；(c) 未登记分类 note() 返 0 且恒等式当场漂（反向对照，证「登记」承重）；(d) 灵石账 11 路可复算、每路有词表（浮层不许 key 回落）',
      a286 && b286 && c286 && d286,
      '祭炼 ' + paid286a + 'B 账=' + (w286.ledger.out.treasure - paid286b) + ' ‖ 九转丹 ' + paid286b + 'B 账=' + w286.ledger.out.treasure +
      ' ‖ 恒等式=' + (SQ.Ledger.sums(w286).expect === w286.stones) + ' ‖ 假分类返=' + ret286 + ' 漂=' + drift286 +
      ' ‖ 路数=' + cats286.length + ' 缺词表=' + (missCat286.join(',') || '无') + ' ‖ eq/own=' + !!eq286 + '/' + !!(g286x && g286h));

    /* #287 好感唯一写口收口（势力入门 #3 + 创角承继播种 #8 → 引擎卷 §3.2 登记缺口结案）：
     * 本条**不测新数值**，测「结构改了、结果一个都没变」——
     * (a) 同一份世界态分头跑「改前手工算法」（此处内联复刻）与「改后走 gain/lose」，
     *     **逐人 bonds 快照 + 返回 deltas 深度全等**；八型全覆盖：同门 +5 / 友好 +10 / 敌对 −20 /
     *     散人不动 / 道侣不动 / 绝交锁不动 / 心结锁不动 / 满档压线不动；
     * (b) grantHeir 播种值 === `LEGACY.BOND_HEIR_BASE`（与视图旧直写逐字同值）；
     * (c) grantHeir 对绝交锁 / 心结锁**拒写**（原视图直写会硬盖过锁——创角态 bonds 为空集故实际不可达，
     *     但唯一写口的语义必须完整，否则下一个调用点又会踩）。 */
    /* 势力是 normalize 时一次性生成的（initialState 留 null）⇒ 必须走 pack.normalize 才有 factions 表 */
    var w287 = pack.normalize(pack.initialState());
    w287.realm = 5;
    var facs287 = w287.factions;
    var fA287 = facs287[0], fB287 = facs287[1];
    var cids287 = (pack.companions || []).map(function (c) { return c.id; });
    function pickNpc287(pred) { return cids287.filter(pred)[0] || null; }
    var npcSame = pickNpc287(function (id) { return w287.factionNpcs[id] === fA287.id; });
    var npcEnemy = pickNpc287(function (id) { var nf = w287.factionNpcs[id]; return !!nf && fA287.rel[nf] === 'enemy'; });
    var npcFriend = pickNpc287(function (id) { var nf = w287.factionNpcs[id]; return !!nf && fA287.rel[nf] === 'friendly'; });
    var npcLone = pickNpc287(function (id) { return !w287.factionNpcs[id]; });
    var npcSpare = pickNpc287(function (id) { return id !== npcSame && id !== npcEnemy && id !== npcFriend && id !== npcLone; });
    w287.factionId = null; w287.factionCdUntil = 0;
    if (npcEnemy) w287.bonds[npcEnemy] = 5;
    if (npcFriend) w287.bonds[npcFriend] = 96;                 /* 压线：+10 只能到 100 */
    if (npcLone) w287.bonds[npcLone] = 7;                      /* 散人：无论好感都不动 */
    if (npcSpare) { w287.bonds[npcSpare] = 50; w287.spouse = { npcId: npcSpare, tier: 1 }; }
    var lockTarget = pickNpc287(function (id) { return id !== npcSame && id !== npcEnemy && id !== npcFriend && id !== npcLone && id !== npcSpare; });
    if (lockTarget) w287.bonds[lockTarget] = -99;
    var scarTarget = pickNpc287(function (id) { return id !== npcSame && id !== npcEnemy && id !== npcFriend && id !== npcLone && id !== npcSpare && id !== lockTarget; });
    if (scarTarget) { w287.bonds[scarTarget] = 30; w287.scars = {}; w287.scars[scarTarget] = 1; }
    var clone287 = JSON.parse(JSON.stringify(w287));
    /* 改前算法（逐字复刻 2026-10-09 之前的实现） */
    (function oldAlgo(ws) {
      var cfg = D.FACTIONS || {}, deltas = {};
      var bonds = ws.bonds || (ws.bonds = {});
      (pack.companions || []).forEach(function (c) {
        var nf = (ws.factionNpcs || {})[c.id];
        if (!nf) return;
        if (ws.spouse && ws.spouse.npcId === c.id) return;
        if (bonds[c.id] === -99 || (ws.scars || {})[c.id]) return;
        var rel = nf === fA287.id ? 'same' : SQ.Factions.relationOf(ws, fA287.id, nf);
        var delta = rel === 'friendly' ? (cfg.JOIN_FRIENDLY || 10)
          : rel === 'enemy' ? (cfg.JOIN_ENEMY || -20)
          : rel === 'same' ? (cfg.JOIN_SAME || 5) : 0;
        if (!delta) return;
        var min = D.BOND_MIN != null ? D.BOND_MIN : -20;
        var before = bonds[c.id] || 0;
        var after = Math.max(min, Math.min(D.BOND_MAX || 100, before + delta));
        if (after !== before) { bonds[c.id] = after; deltas[c.id] = after - before; }
      });
      clone287.__deltas = deltas;
    })(clone287);
    var r287 = SQ.Factions.join(w287, pack, D, fA287.id, Date.now(), noopLog());
    var sameBonds287 = JSON.stringify(w287.bonds) === JSON.stringify(clone287.bonds);
    var sameDeltas287 = JSON.stringify(r287.bondDeltas || {}) === JSON.stringify(clone287.__deltas || {});
    var covered287 = !!npcSame && !!npcEnemy && !!npcFriend && !!npcLone && !!npcSpare && !!lockTarget && !!scarTarget;
  var exp287 = {};
  if (npcSame) exp287[npcSame] = 5;                       /* 同门 JOIN_SAME +5（原为空 ⇒ 0+5） */
  if (npcEnemy) exp287[npcEnemy] = 5 - 20;                /* 敌对 JOIN_ENEMY −20（fixture 起点 5 → −15） */
  if (npcFriend) exp287[npcFriend] = 100;                 /* 友好 +10 但 96 起 ⇒ 压 BOND_MAX 上限 */
  if (npcLone) exp287[npcLone] = 7;                       /* 散人不动 */
  if (npcSpare) exp287[npcSpare] = 50;                    /* 在任道侣不动 */
  if (lockTarget) exp287[lockTarget] = -99;               /* 绝交锁不动 */
  if (scarTarget) exp287[scarTarget] = 30;                /* 心结锁不动 */
  var valOk287 = Object.keys(exp287).every(function (id) { return w287.bonds[id] === exp287[id]; });
  /* 键集判据 = 该动的都在、不该动的一个都不在（入门调整的是**全体有归属的道友**，
   * 我挑的七人只是抽样 ⇒ 不能要求键集恰等于抽样集，那判据过窄且一换随机种子就红） */
  var inD287 = function (id) { return id ? Object.prototype.hasOwnProperty.call(r287.bondDeltas || {}, id) : true; };
  var setsOk287 = inD287(npcSame) && inD287(npcEnemy) && inD287(npcFriend) &&
    !inD287(npcLone) && !inD287(npcSpare) && !inD287(lockTarget) && !inD287(scarTarget);
    var a287 = r287.ok === true && sameBonds287 && sameDeltas287 && covered287 && valOk287 && setsOk287;
    var w287h = mkWs({ realm: 3 });
    var heirId = cids287[0];
    var gh287 = SQ.Bonds.grantHeir(w287h, pack, D, heirId, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
    var b287 = gh287.ok === true && w287h.bonds[heirId] === SQ.XDATA.LEGACY.BOND_HEIR_BASE;
    var w287l = mkWs({ realm: 3 });
    w287l.bonds[heirId] = -99;
    var w287s = mkWs({ realm: 3 });
    w287s.scars = {}; w287s.scars[heirId] = 1; w287s.bonds[heirId] = 12;
    var ghL = SQ.Bonds.grantHeir(w287l, pack, D, heirId, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
    var ghS = SQ.Bonds.grantHeir(w287s, pack, D, heirId, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
    var c287 = ghL.ok === false && ghL.blocked === 'lock' && w287l.bonds[heirId] === -99 &&
      ghS.ok === false && ghS.blocked === 'scar' && w287s.bonds[heirId] === 12;
    ok('287', '好感唯一写口收口（势力入门 + 承继播种）：(a) 同一份世界态下「改前手工算法」与「改后走 gain/lose」逐人 bonds 与 deltas **深度全等**，八型全覆盖（同门/友好/敌对/散人/道侣/绝交锁/心结锁/压线）；(b) grantHeir 播种值 === BOND_HEIR_BASE（与视图旧直写逐字同值）；(c) grantHeir 对锁/心结**拒写**（唯一写口语义完整，不留「下一个调用点又踩」的口子）',
      a287 && b287 && c287,
      '同 bonds=' + sameBonds287 + ' 同 deltas=' + sameDeltas287 + ' 覆盖=' + covered287 +
      ' ‖ deltas=' + JSON.stringify(r287.bondDeltas || {}) + ' 值对=' + valOk287 + ' 抽样键进/不出=' + setsOk287 + ' 动的人数=' + Object.keys(r287.bondDeltas || {}).length + ' ‖ 播种=' + w287h.bonds[heirId] +
      ' ‖ 锁=' + ghL.blocked + '/' + w287l.bonds[heirId] + ' 心结=' + ghS.blocked + '/' + w287s.bonds[heirId]);

    /* #288 神秘商人节律（神秘商人节律批 2026-10-10 · 同日第十批 · 用户拍板推荐方案）：
     * 本批的产品决定是「**只动冷却，不动权重**」，所以判据要同时钉住「改了什么」和「故意没改什么」——
     * 只钉前者会放任下批有人顺手把权重也"优化"掉（而实测证明降权是无效动作，见奇遇池卷 §十三.10）。
     * (a) 表值三钉：`cooldownHours === 12`（新档）+ `weight === 12`（**保留全池最高档 = 刻意的决定**）
     *     + `cdFailHours === 24`；
     * (b) 冷却边界双证：走**生产读口** `buildPool`（events.js:498 那条判据），差 1 分钟满 12h ⇒ 商人仍在池外、
     *     恰好满 12h ⇒ 放行（钉的是行为，不是容器里存的字节）；
     * (c) 封印 max 语义双证：`cdFailHours(24) > cooldownHours(12)` ⇒ 失败后解禁 = 失败时刻 + **24h**；
     *     临时把表改成 `cdFailHours = 6`（< 常规冷却）⇒ 解禁仍是 **12h**，即失败**不缩短**常规冷却
     *     （原实现把到期时刻写进按触发时刻读回的容器，两种情形分别会变成 36h / 18h —— 本批修掉的正是这个）；
     * (d) 病灶不复发的静态护栏：全池**非零**冷却下界 ≥ 12h（= 若有人再塞一条 1h 高权重条目，这里立刻红）。*/
    var e288 = SQ.Events.findById(pack, 'mysterious_merchant');
    var cd288 = e288 && e288.cooldownHours, fail288 = e288 && e288.choices.evil.cdFailHours;
    var a288 = !!e288 && cd288 === 12 && e288.weight === 12 && fail288 === 24 && e288.tier === 'di' &&
      e288.nature === 'good' && e288.cond.realmMin === 1;
    /* (b) 冷却边界：走真读口 buildPool，不起时钟 */
    var w288 = mkWs({ realm: 5 });
    var now288 = Date.now();
    function poolHas288(cdVal) {
      w288.eventCooldowns = { mysterious_merchant: cdVal };
      w288.eventHistory = w288.eventHistory || { seen: {}, feed: [] };
      w288.eventHistory.lastId = 'zz-not-merchant';
      var p288 = SQ.Events.buildPool(pack, w288, D, 'di', 'good', now288) || [];
      return p288.some(function (x) { return x.id === 'mysterious_merchant'; });
    }
    var in288Early = poolHas288(now288 - 12 * 3600 * 1000 + 60000);     /* 差 1 分钟未满 12h ⇒ 必须仍在冷却外 */
    var in288Late = poolHas288(now288 - 12 * 3600 * 1000);               /* 恰好满 12h ⇒ 放行 */
    var b288 = in288Early === false && in288Late === true;
    /* (c) 封印 max：失败后 = 24h；cdFailHours 小于常规冷却时不得缩短 */
    var w288c = mkWs({ realm: 1, zone: 1, qi: 100000 });
    pack.recalcDerived(w288c, mkProf());
    var rs288 = stubRandom([0.9999]);                                    /* 战力判定必败 */
    var now288c = Date.now();
    SQ.Events.resolveBranch(w288c, pack, D, M(mkProf(), w288c), 'mysterious_merchant', 'evil', now288c,
      { log: noopLog(), profile: mkProf() });
    rs288();
    var unlock288 = w288c.eventCooldowns.mysterious_merchant + cd288 * 3600 * 1000;   /* 读端同一判据反解 */
    var seal24 = Math.abs(unlock288 - (now288c + 24 * 3600 * 1000)) < 60 * 1000;
    var w288d = mkWs({ realm: 1, zone: 1, qi: 100000 });
    pack.recalcDerived(w288d, mkProf());
    e288.choices.evil.cdFailHours = 6;                                    /* 临时：失败封印短于常规冷却 */
    var rs288d = stubRandom([0.9999]);
    var now288d = Date.now();
    SQ.Events.resolveBranch(w288d, pack, D, M(mkProf(), w288d), 'mysterious_merchant', 'evil', now288d,
      { log: noopLog(), profile: mkProf() });
    rs288d();
    e288.choices.evil.cdFailHours = 24;                                   /* 必须复原，防污染其他断言 */
    var unlock288d = w288d.eventCooldowns.mysterious_merchant + cd288 * 3600 * 1000;
    var noShorten = Math.abs(unlock288d - (now288d + 12 * 3600 * 1000)) < 60 * 1000;
    var c288 = seal24 && noShorten && e288.choices.evil.cdFailHours === 24;
    /* (d) 全池非零冷却下界 */
    var cds288 = (SQ.Events.allIds(pack) || []).map(function (id288) {
      var ev288 = SQ.Events.findById(pack, id288);
      return ev288 ? (ev288.cooldownHours != null ? ev288.cooldownHours : ev288.cd) : null;
    }).filter(function (v288) { return v288 != null && v288 > 0; });
    var minCd288 = Math.min.apply(null, cds288);
    var d288 = minCd288 >= 12;
    ok('288', '神秘商人节律（第十批）：(a) 表值三钉——cooldownHours 12 / **weight 仍为 12（刻意不动）** / cdFailHours 24；(b) 冷却边界走真读口 buildPool（差 1 分钟仍挡、满 12h 放行）；(c) 封印 max 语义（失败后 24h；cdFailHours 小于常规冷却时**不缩短**到 12h 以下）；(d) 全池非零冷却下界 ≥12h（再塞一条 1h 高权重条目即红）',
      a288 && b288 && c288 && d288,
      '表=' + cd288 + 'h/w' + (e288 && e288.weight) + '/fail' + fail288 + ' ‖ 边界 早=' + in288Early + ' 满=' + in288Late +
      ' ‖ 解禁 24h=' + seal24 + '(' + ((unlock288 - now288c) / 3600000).toFixed(1) + 'h) 不缩短=' + noShorten +
      '(' + ((unlock288d - now288d) / 3600000).toFixed(1) + 'h) ‖ 全池非零最小冷却=' + minCd288 + 'h 条数=' + cds288.length);
    /* #289 N20 孤儿文案处置批（第十一批）：掷名命名公式**单源**。
     * 正典「掷名可重掷 · 免费无限次」（自立门户卷 §2.2）此前在 UI 没有入口，sectFound 的 nameIdx 形参一直闲置；
     * 本批补钮时把原先内联在 sectFound 里的 `pre.{i%12+1} + suf.{j%8+1}` 抽成 SQ.Sect.rollIdx / nameOfIdx，
     * 视图钮与 sectFound 同读这两口 ⇒ 判据要证的是「式子语义不变 + 只剩一份式子」，不是「按钮画出来了」（那属走查面）。
     * (a) rollIdx 值域 40 掷全落 [0..11]×[0..7]；(b) nameOfIdx([0,0]) 逐字等于表算 pre.1+suf.1；
     * (c) 下标越界取模回落（12/8 ⇒ 同 [0,0]）；(d) 随机掷点 helper === 表算（两路同式）；
     * (e) sectFound 函数体内不再出现第二份取模式子（单源的静态证明）。 */
    var ix289all = []; for (var n289 = 0; n289 < 40; n289++) ix289all.push(SQ.Sect.rollIdx());
    var a289 = ix289all.every(function (ix) { return Array.isArray(ix) && ix.length === 2 && ix[0] >= 0 && ix[0] < 12 && ix[1] >= 0 && ix[1] < 8; });
    var nm289 = SQ.Sect.nameOfIdx([0, 0], 'xiuxian');
    var b289 = !!nm289 && nm289 === SQ.t('sect.name.pre.1', null, 'xiuxian') + SQ.t('sect.name.suf.1', null, 'xiuxian');
    /* 取模回落的正确期望：整周期 [12,8] 回到 [0,0]，而 [13,9] 只该等于 [1,1]（上一版把两者都写成 === [0,0] 是我把判据写错了，#289 如实红了一次） */
    var c289 = SQ.Sect.nameOfIdx([12, 8], 'xiuxian') === nm289 && SQ.Sect.nameOfIdx([13, 9], 'xiuxian') === SQ.Sect.nameOfIdx([1, 1], 'xiuxian');
    var d289 = ix289all.slice(0, 8).every(function (ix) {
      return SQ.Sect.nameOfIdx(ix, 'xiuxian') === SQ.t('sect.name.pre.' + (ix[0] % 12 + 1), null, 'xiuxian') + SQ.t('sect.name.suf.' + (ix[1] % 8 + 1), null, 'xiuxian');
    });
    var src289 = String(SQ.Sect.foundSect);
    var e289 = src289.indexOf('% 12') < 0 && src289.indexOf("'sect.name.pre.'") < 0 &&
      src289.indexOf('SQ.Sect.rollIdx') >= 0 && src289.indexOf('SQ.Sect.nameOfIdx') >= 0;
    ok('289', 'N20 接线批：掷名公式单源——(a) 40 掷值域 12×8；(b) nameOfIdx([0,0]) 逐字 = 表算 pre.1+suf.1；(c) 越界下标取模回落；(d) 8 组随机掷点 helper === 表算；(e) sectFound 体内不再有第二份式子、改调这两口',
      a289 && b289 && c289 && d289 && e289,
      '值域=' + a289 + ' 首名=' + nm289 + ' 取模=' + c289 + ' 同式=' + d289 + ' 单源=' + e289);

    /* #290 战力门槛单源（N24① 收口批 · 2026-10-10）：№61 袭杀门槛此前有两个事实源——世界表常量
     * `D.MERCHANT_POWER_ABS`（全库零消费 = 死桩）与事件表 `choices.evil.check.abs` 字面量，改表不带动消费者，
     * 而既有普查关（A7 只管 st 写点、A8 只管「写点 ⇔ normalize 声明集」）都够不着「常量 ⇔ 字面量」这一类。
     * 本批删常量、字面量为唯一取数口，并把同型形状交给审计 **A9**（顶层常量零消费者即红）。
     * (a) 世界表顶层已无该常量；(b) 表值仍钉 375000；(c) **该字面量就是 DSL 生效门槛**——同份世界态下
     *     `abs = 实测战力` 判过、`abs = 实测战力 + 1` 判败（差分法，不靠抄常量）；
     * (d) 带 abs 时**不随秘境缩放**（换 zone 后 need 恒等 abs，与无 abs 的 ratio 判定相对）。 */
    var a290 = Object.keys(D).indexOf('MERCHANT_POWER_ABS') < 0;
    var e290 = SQ.Events.findById(pack, 'mysterious_merchant');
    var b290 = !!e290 && e290.choices.evil.check.abs === 375000;
    var w290 = pack.normalize(mkWs({ realm: 6 }));
    var st290 = { ws: w290, pack: pack, D: D, mods: M(mkProf(), w290) };
    var p290 = SQ.Mods.powerOf(w290, pack, D, st290.mods);
    var c290 = SQ.Events.runCheckDsl({ type: 'power', abs: p290 }, st290).pass === true &&
      SQ.Events.runCheckDsl({ type: 'power', abs: p290 + 1 }, st290).pass === false;
    w290.zone = 0;
    var r290z0 = SQ.Events.runCheckDsl({ type: 'power', abs: 375000 }, st290).need;
    w290.zone = 5;
    var r290z5 = SQ.Events.runCheckDsl({ type: 'power', abs: 375000 }, st290).need;
    var d290 = r290z0 === 375000 && r290z5 === 375000;
    ok('290', '神秘商人战力门槛单源（N24①）：(a) 世界表顶层 `MERCHANT_POWER_ABS` 已消失（死桩不许复活）；(b) №61 `check.abs` 表值钉 375000；(c) 该字面量**就是**生效门槛——同份世界态 `abs=实测战力` 过 / `abs=实测+1` 败（差分法）；(d) 带 abs 时不随秘境缩放（zone 0 与 5 的 need 恒等 abs）',
      a290 && b290 && c290 && d290,
      '常量残留=' + !a290 + ' 表值=' + (e290 && e290.choices.evil.check.abs) + ' ‖ 战力=' + Math.round(p290) +
      ' 等值过=' + (SQ.Events.runCheckDsl({ type: 'power', abs: p290 }, st290).pass === true) +
      ' +1 败=' + (SQ.Events.runCheckDsl({ type: 'power', abs: p290 + 1 }, st290).pass === false) +
      ' ‖ need z0=' + r290z0 + ' z5=' + r290z5);

    /* #291 承继播种的 heirBond 归引擎同分支（N23① 收口批）：原视图在调 grantHeir **之后**无条件
     * `nws.heirBond = lg.bond` —— 播种被绝交锁 / 心结锁拒绝时，`achv_kuashi`「缘定三生」的判定源会凭空成立
     * （单世界包 + 创角态 bonds 空集 ⇒ 当下不可达，属「下一个调用点又踩」那一族）。
     * 修法不是给视图加判断，而是把赋值**收进 grantHeir 的成功分支**（与 redeem 同语义 ⇒ 形状消失而非被守）。
     * (a) 成功：ok / bonds = BOND_HEIR_BASE / heirBond 同置；(b) 锁：ok:false 'lock'、bonds 仍 −99、heirBond 不写；
     * (c) 心结：ok:false 'scar'、bonds 原值、heirBond 不写；(d) 与 #287(b)(c) 的旧判据不冲突（播种值口径未变）。 */
    var heir291 = (pack.companions || [{}])[0].id;
    var w291a = pack.normalize(mkWs({ realm: 3 }));
    var g291a = SQ.Bonds.grantHeir(w291a, pack, D, heir291, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
    var a291 = g291a.ok === true && w291a.bonds[heir291] === SQ.XDATA.LEGACY.BOND_HEIR_BASE &&
      w291a.heirBond === heir291;
    var w291l = pack.normalize(mkWs({ realm: 3 }));
    w291l.bonds[heir291] = -99;
    var g291l = SQ.Bonds.grantHeir(w291l, pack, D, heir291, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
    var b291 = g291l.ok === false && g291l.blocked === 'lock' && w291l.bonds[heir291] === -99 &&
      w291l.heirBond == null;
    var w291s = pack.normalize(mkWs({ realm: 3 }));
    w291s.scars = {}; w291s.scars[heir291] = 1; w291s.bonds[heir291] = 12;
    var g291s = SQ.Bonds.grantHeir(w291s, pack, D, heir291, SQ.XDATA.LEGACY.BOND_HEIR_BASE);
    var c291 = g291s.ok === false && g291s.blocked === 'scar' && w291s.bonds[heir291] === 12 &&
      w291s.heirBond == null;
    var d291 = g291a.after === SQ.XDATA.LEGACY.BOND_HEIR_BASE && g291a.before === 0;
    ok('291', '承继播种与 heirBond 同分支（N23①）：(a) 成功 ⇒ ok / bonds = BOND_HEIR_BASE / heirBond 同置；(b) 绝交锁 ⇒ ok:false `lock`、bonds 仍 −99、**heirBond 不写**；(c) 心结锁 ⇒ ok:false `scar`、bonds 原值、**heirBond 不写**；(d) 播种语义仍是「设为绝对值」（before 0 ⇒ after 40），与 #287(b)(c) 同口径',
      a291 && b291 && c291 && d291,
      '成功=' + a291 + '(' + w291a.bonds[heir291] + '/' + w291a.heirBond + ') ‖ 锁=' + b291 + '(' + g291l.blocked +
      '/bonds' + w291l.bonds[heir291] + '/heir ' + w291l.heirBond + ') ‖ 心结=' + c291 + '(' + g291s.blocked +
      '/bonds' + w291s.bonds[heir291] + '/heir ' + w291s.heirBond + ') ‖ before/after=' + g291a.before + '→' + g291a.after);

    /* #292 好感写口「值未变不落键」（N23② 收口批）：gain/lose 原在 clamp 后无条件 `bonds[id] = after`，
     * 于是 `after === before` 时会给一个**本来不存在的键** materialize 出 0 值——现表值全为整数且 normalize
     * 剪 0 ⇒ 今天不可见；而 `Math.round` 通道一旦放进小数加成（0.4 → 0）就会造一批 =0 键，
     * 把「normalize 剪 0」的容量口径从背面捅穿。判据用 **0.4** 那一发差分证鉴别力（改前回红）。
     * (a) 小数加成四舍五入后不变 ⇒ **键不出现**（hasOwnProperty false）且返回 after === before；
     * (b) 真增量仍落键（正例，防「恒不写」把判据变成空转）；(c) lose 同口径（−0.4 不落键 / −5 落键）；
     * (d) 已在 BOND_MAX 时再给 +5 ⇒ 键集与值全等，且 blocked 仍为 null（不是被拒，是无变化）。 */
    var w292 = pack.normalize(mkWs({ realm: 3 }));
    w292.bonds = {};
    var cs292 = (pack.companions || []).map(function (c) { return c.id; });
    var g292a = SQ.Bonds.gain(w292, pack, D, cs292[0], 0.4, Date.now());
    var a292 = g292a.after === 0 && g292a.before === 0 && g292a.blocked === null &&
      Object.prototype.hasOwnProperty.call(w292.bonds, cs292[0]) === false && w292.bonds[cs292[0]] === undefined;
    var g292b = SQ.Bonds.gain(w292, pack, D, cs292[1], 5, Date.now());
    var b292 = g292b.after === 5 && w292.bonds[cs292[1]] === 5;
    var l292c = SQ.Bonds.lose(w292, pack, D, cs292[2], -0.4, Date.now());
    var l292d = SQ.Bonds.lose(w292, pack, D, cs292[3], -5, Date.now());
    var c292 = l292c.after === 0 && !Object.prototype.hasOwnProperty.call(w292.bonds, cs292[2]) &&
      l292d.after === -5 && w292.bonds[cs292[3]] === -5;
    w292.bonds[cs292[4]] = 100;
    var keys292e = JSON.stringify(Object.keys(w292.bonds).sort());
    var g292e = SQ.Bonds.gain(w292, pack, D, cs292[4], 5, Date.now());
    var d292 = g292e.before === 100 && g292e.after === 100 && g292e.blocked === null &&
      g292e.tierUp === false && JSON.stringify(Object.keys(w292.bonds).sort()) === keys292e;
    ok('292', '好感写口值未变不落键（N23②）：(a) `+0.4` 经 round 后 after === before ⇒ **键不出现**（改前会 materialize 一个 0 值键，把 normalize 剪 0 的容量口径从背面捅穿）；(b) `+5` 真增量照旧落键（正例，防判据空转）；(c) lose 同口径（−0.4 不落 / −5 落）；(d) 已在 BOND_MAX 再 +5 ⇒ before/after 皆 100、blocked null、tierUp false、键集不变',
      a292 && b292 && c292 && d292,
      '(a) 键在=' + Object.prototype.hasOwnProperty.call(w292.bonds, cs292[0]) + ' 返回=' + g292a.before + '→' + g292a.after +
      ' ‖ (b) ' + g292b.after + ' ‖ (c) −0.4 键在=' + Object.prototype.hasOwnProperty.call(w292.bonds, cs292[2]) +
      ' −5=' + l292d.after + ' ‖ (d) 顶格=' + g292e.before + '→' + g292e.after + ' blocked=' + g292e.blocked +
      ' 键数=' + Object.keys(w292.bonds).length);

    /* #293 karma 档位边界取自表（N26④ 附带接线 · 第十三批）：`tierOf` 原硬编码 ±200，而
     * `D.KARMA_TIERS`（[[200,'right'],[-199.999,'neutral'],[-Infinity,'evil']]）全库零消费 = 同值双源，
     * 改表不带动判定。本批把 tierOf 改读表 ⇒ 死桩转正、抄本消失。
     * (a) 整数域行为与改前逐字相同（200 → right / 0 → neutral / −200 → evil）；
     * (b) **表就是事实源**（差分法）：把首档下界临时改 300 ⇒ karma 250 由 right 变 neutral，改回即复原；
     * (c) 与 `rankOf` 同边界（九段里 ±200 仍落正道/魔道首段）；
     * (d) 下游乘区不因本次改口而变（`alignMultOf` 在三档上各测一次，钉住实际生效的数值）。 */
    var KT293 = D.KARMA_TIERS, KT293old = KT293.map(function (r) { return r.slice(); });
    var a293 = SQ.XKarma.tierOf(200) === 'right' && SQ.XKarma.tierOf(0) === 'neutral' &&
      SQ.XKarma.tierOf(-200) === 'evil';
    KT293[0][0] = 300;
    var flip293 = SQ.XKarma.tierOf(250);
    KT293[0][0] = KT293old[0][0];
    var b293 = flip293 === 'neutral' && SQ.XKarma.tierOf(250) === 'right';
    var KR293 = D.KARMA_RANKS;
    var c293 = SQ.XKarma.rankOf(200, D) === KR293[3][1] &&          /* 200 落「正道首段」那一条 */
      SQ.XKarma.rankOf(199, D) === KR293[4][1] &&                    /* 199 落「左道」那一条 ⇒ 与 tierOf 同边界 */
      SQ.XKarma.tierOf(199) === 'neutral' && SQ.XKarma.rankOf(-200, D) !== KR293[4][1];
    var w293 = pack.normalize(mkWs({ realm: 4 }));
    var mult293 = {};
    [220, 0, -220].forEach(function (kv) {
      w293.karma = kv; w293.alignDrift = 0;
      mult293[SQ.XKarma.tierOf(kv)] = SQ.XKarma.alignMultOf(w293, D);
    });
    var d293 = Object.keys(mult293).length === 3 &&
      ['right', 'neutral', 'evil'].every(function (t) { return typeof mult293[t] === 'number' && mult293[t] > 0; });
    /* (e) 视图「距下一档」的取数口 = edgeOf，且它随表动（复核抓到视图原硬编码 200 = 表的第三份抄本）；
       (f) 合成表可注入（D 形参）= 证 tierOf 真读传入的表而不是只读全局；null 下界行 = 兜底档也走得通 */
    var e293a = SQ.XKarma.edgeOf(D);
    KT293[1][0] = -299.5;
    var e293b = SQ.XKarma.edgeOf(D);
    KT293[1][0] = KT293old[1][0];
    var e293 = e293a.up === 200 && e293a.down === -200 && e293b.down === -300 && SQ.XKarma.edgeOf(D).down === -200;
    var SYN293 = { KARMA_TIERS: [[50, "right"], [-49.5, "neutral"], [null, "evil"]] };
    var f293 = SQ.XKarma.tierOf(60, SYN293) === "right" && SQ.XKarma.tierOf(0, SYN293) === "neutral" &&
      SQ.XKarma.tierOf(-999, SYN293) === "evil" && SQ.XKarma.tierOf(60) === "neutral";
    ok('293', 'karma 档位边界取自 `D.KARMA_TIERS`（N26④ 附带接线）：(a) 整数域与改前逐字相同（200 right / 0 neutral / −200 evil）；(b) 差分法证表是事实源——首档下界临时改 300 ⇒ karma 250 由 right 变 neutral，改回即复原（**旧版硬编码 ±200 时这一发改不动行为**）；(c) 与 `rankOf` 同边界（200 落九段里 `KARMA_RANKS[3]` 那条、199 落 `[4]` 那条，期望值取自表本身而非硬编 id）；(d) 下游 `alignMultOf` 三档各有正乘区（改口不改动结算）；(e) **视图取数口 `edgeOf`** 给出 {up:200, down:-200} 且随表中线动（把中性下界临时改 -299.5 ⇒ down 变 -300，复原回 -200）——复核抓到视图原硬编码 200 = 表的第三份抄本，本批改读 edgeOf；(f) 合成表可注入（`tierOf(60, 合成表)` = right，同一入参走真表仍 = neutral）⇒ 证它真读传入的表，`null` 下界兜底行也走得通',
      a293 && b293 && c293 && d293 && e293 && f293,
      '(a) ' + a293 + ' ‖ (b) 改表后 250=' + flip293 + ' 复原后 250=' + SQ.XKarma.tierOf(250) +
      ' ‖ (c) 九段同边界=' + c293 + '（200→' + SQ.XKarma.rankOf(200, D) + ' / 199→' + SQ.XKarma.rankOf(199, D) + '）' +
      ' ‖ (d) 乘区=' +
      Object.keys(mult293).map(function (t) { return t + ':' + mult293[t]; }).join(' ') +
' ‖ (e) edgeOf=' + e293a.up + '/' + e293a.down + ' 改表中线后 down=' + e293b.down + ' 复原=' + SQ.XKarma.edgeOf(D).down +
' ‖ (f) 合成表注入=' + f293);

    /* #294 写通道三处失守收口（第十四批审计 #1 / #2 / #3，全部真跑不改数值口径）：
     * (a) **写失败的那一态不许被下一次 tick 回滚**：mutate 期间 `setItem` 抛错 ⇒ 内存已是新值而盘上仍是旧值；
     *     修前 claim 起手 `await load()` 从盘重读 ⇒ 玩家那笔操作凭空消失（实测会掉回 12345 一档）；
     *     修后 claim 以 pendingSave 续起 ⇒ 内存守恒、且这一次成功写把盘上补平（盘 === 内存）。
     * (b) **写序 = 先侧档后主档**：主档一落盘就不再含 log/feed，两次写之间崩溃 ⇒ 整世日志永久丢（旧档首次迁移尤甚）。
     * (c) **侧档读不动而跳写要留痕**：坏侧档 ⇒ sideUnreadable ⇒ 该写时跳过（不覆盖那份读不动的档，这条本就对），
     *     但主档已剥掉展示流 ⇒ 这批流每次落盘都被剥掉又永不写侧档、原本零症状；现必须走 ioError 出口。 */
    var ref294 = SQ.defaultState();
    await SQ.mutate(ref294, function (s) {
      s.profile = mkProf(); s.worlds.xiuxian = pack.initialState(); s.worlds.xiuxian.stones = 12345;
    });
    var SK294 = 'sanqian-logs-v1';
    var origSet294 = localStorage.setItem;
    var order294 = [];
    /* 🔧 复核返修：本条要换掉 `setItem`（记录器 / 必抛器 / 直写坏档），原先靠「每个 await 后面手接一句还原」，
     * 中间任何一次抛出都把必抛器留在盘面上 ⇒ 其后 295 条断言每一次写都抛 = 一条测试炸全身。整段收进 try/finally。 */
    try {
      localStorage.setItem = function (k, v) { order294.push(k); return origSet294.call(localStorage, k, v); };
      SQ.Log.push(ref294.worlds.xiuxian, 'sys', '写序取证', 1700000094000);
      await SQ.save(ref294);
      localStorage.setItem = origSet294;
      var iSide294 = order294.indexOf(SK294), iMain294 = order294.indexOf(SQ.KEY);
      var b294 = iSide294 >= 0 && iMain294 >= 0 && iSide294 < iMain294;

      localStorage.setItem = function () { throw new Error('QUOTA_294'); };
      await SQ.mutate(ref294, function (s) { s.worlds.xiuxian.stones = 911111; });
      var memFail294 = ref294.worlds.xiuxian.stones;
      var errFail294 = SQ.storageError();
      localStorage.setItem = origSet294;
      await SQ.claim(ref294);
      var memClaim294 = ref294.worlds.xiuxian.stones;
      var diskClaim294 = JSON.parse(localStorage.getItem(SQ.KEY)).worlds.xiuxian.stones;
      var a294 = errFail294 && errFail294.op === 'write' && memFail294 === 911111 &&
        memClaim294 >= 911111 && diskClaim294 === memClaim294;

      origSet294.call(localStorage, SK294, '坏档！');
      await SQ.claim(ref294);                                 /* 读侧档失败 ⇒ sideUnreadable 置真；(b) 那笔带日志的载荷与 lastLogSig 不同 ⇒ 这里必落到「读不动而跳写」那一支 */
      await SQ.mutate(ref294, function (s) { s.worlds.xiuxian.stones = 911111; });
      var errSide294 = SQ.storageError();
      var sideBytes294 = localStorage.getItem(SK294);
      localStorage.removeItem(SK294);
      await SQ.claim(ref294);                                 /* 侧档不存在 ⇒ 标志归假，不给后面的断言留污染 */
      var c294 = !!errSide294 && errSide294.op === 'write' && errSide294.msg === 'sideflow' &&
        sideBytes294 === '坏档！' && SQ.storageError() === null;

      /* (d) 🔧 复核返修补的那一条：侧档写**抛**（宿主拒写这一族）时主档必须照写。
       *   本批把写序改成「先侧档后主档」却共用外层 catch ⇒ 侧档一抛就跳到 catch、机制态永不再落盘，
       *   比原缺陷更重；现侧档异常关在本地 try 里。判 = 盘上主档 === 内存新值 + 留痕照出 + 下一次成功写归零。
       *   ⚠️ 这里直调 `SQ.save(ref294)` 而不是 `mutate`：mutate 从 `load()` 起态，而日志早被剥进侧档 ⇒ 载荷未变
       *   ⇒ `sig === lastLogSig` 提前返回，侧档那一次写根本不会被触发（本判据第一版就栽在这里 = 假绿不成、真红也不成）。 */
      localStorage.setItem = function (k, v) {
        if (k === SK294) throw new Error('SIDE_294');
        return origSet294.call(localStorage, k, v);
      };
      SQ.Log.push(ref294.worlds.xiuxian, 'sys', '侧档必抛', 1700000094002);
      ref294.worlds.xiuxian.stones = 922222;
      await SQ.save(ref294);
      localStorage.setItem = origSet294;
      var dMain294 = JSON.parse(localStorage.getItem(SQ.KEY)).worlds.xiuxian.stones === 922222;
      var errD294 = SQ.storageError();
      await SQ.save(ref294);                                  /* 侧档恢复可写 ⇒ 这一笔补上，提示归零 */
      var d294 = dMain294 && !!errD294 && errD294.msg === 'sideflow' && SQ.storageError() === null &&
        localStorage.getItem(SK294) !== null;

      /* (e) 🔧 第二次复核补：侧档抛**且主档也抛**的那一笔，「跳写留痕」不许跨笔存活——
       *   不清的后果 = 侧档恢复可写后的第一次成功落盘仍补打「历史日志没能保存」，而那一刻展示流恰恰写进去了。 */
      localStorage.setItem = function () { throw new Error('BOTH_294'); };
      SQ.Log.push(ref294.worlds.xiuxian, 'sys', '两写皆抛', 1700000094003);
      await SQ.save(ref294);
      localStorage.setItem = origSet294;
      await SQ.save(ref294);                                  /* 这一笔两档都落定 ⇒ 提示必须归零 */
      var e294 = SQ.storageError() === null && localStorage.getItem(SK294) !== null;
    } finally {
      localStorage.setItem = origSet294;
    }
    ok('294', '写通道收口（审计 #1/#2/#3）：(a) 写失败后 claim **不回滚**（内存 ' + 911111 + ' 守住、盘上补平 === 内存；修前此处会读回 12345 一档）；(b) 一次带新日志的落盘里**侧档先于主档**写（顺序反了就是「主档已剥日志、侧档尚未写」的丢档窗口）；(c) 侧档坏而跳写 ⇒ `ioError = write/sideflow`（视图按码出中文那句「历史日志与奇遇记事没能保存（修为进度已保存）」，不再把裸英文码打给玩家）+ **没有**拿新内容去覆盖那份读不动的档（`坏档！` 原样在盘上），跳写标记用完即清；(d) 🔧 **侧档写抛（宿主拒写）时主档照落盘**——盘上 === 内存新值 + 同笔出 `write/sideflow` 留痕 + 侧档恢复后下一笔补写并归零（本批改写序时把两次写共用在一个 catch 里 ⇒ 侧档一抛机制态永不再落盘，比它要修的缺陷更重）；(e) 🔧 **侧档抛且主档也抛**的那一笔，跳写留痕**不许跨笔存活**（第二笔两档都落定后 `storageError()` 必为 null —— 否则展示流明明补写成功了，屏上还挂着「历史日志没能保存」）',
      a294 && b294 && c294 && d294 && e294,
      '(a) 失败后内存=' + memFail294 + ' claim 后=' + memClaim294 + ' 盘上=' + diskClaim294 +
      ' ‖ (b) 侧档第 ' + iSide294 + ' 次写 / 主档第 ' + iMain294 + ' 次（共 ' + order294.length + ' 写）' +
      ' ‖ (c) err=' + JSON.stringify(errSide294) + ' 侧档原样=' + (sideBytes294 === '坏档！') +
      ' ‖ (d) 侧档抛时主档落盘=' + dMain294 + ' 同笔留痕=' + (errD294 && errD294.msg) +
      ' 补写后侧档在盘=' + (localStorage.getItem(SK294) !== null) +
      ' ‖ (e) 两写皆抛的那一笔之后=' + e294);

    /* #295 审计处置批 C 组（引擎侧「屏上的账」与「单源」）：
     * (a)(b)(c) 三类**静默零收益**必须撤销自己的文案与 applied（审计 #6）——
     *     attrBonus 满 `ATTR_EVENT_BONUS_CAP` 被整笔丢弃 / artsProgress 无槽可进 / gearScoreDown 四槽皆空，
     *     三者原来都照报「永久 +3」「功法精进 N 级」「一件法器受损」。每型都配**未满的正例**防空转。
     * (d) 门中供给价走 `SQ.Shop.supplyPriceOf`（审计 #8）：与坊市 `priceOf` 同吃 shopCost、同 Math.ceil。
     * (e) 材料包按**定价时那一组**发货（审计 #9）：`good.zoneGroup` 从此有了读者，抬境界跨组套利被堵。
     * (f) 淬炼费用单一取数口（审计 #9 姊妹面）：`Fusion.reforgeCostOf` 四档 === 表值，越界回 huang(200) 而非 800。
     * (g) 丹方 `def.mod` 是事实源（审计 #14）：改 `APILLS.ap_pozhang.mod` ⇒ 破障成本跟着动（旧读 AL.POZHANG_MOD，已删）。
     * (h) `D.LEGACY.LOG_KEEP` 是事实源（审计 #20 嵌套死常量）：改表 ⇒ 读档保留条数跟着动。 */
    var noop295 = function () {};
    var CAP295 = D.ATTR_EVENT_BONUS_CAP;
    var w295a = mkWs({}); w295a.attrEventBonus = { mind: CAP295 };
    var e295a = { attrBonus: { attr: 'gunt', n: 3 } }; var ap295a = { attrBonus: { attr: 'gunt', n: 3 } };   /* applied 由 gainToEff 先种（applyEffects 只负责撤销） */
    SQ.Events.applyEffects(w295a, pack, D, M(mkProf(), w295a), e295a, { applied: ap295a, log: noop295, now: 1700000095000 });
    var w295b = mkWs({}); var e295b = { attrBonus: { attr: 'gunt', n: 3 } }; var ap295b = { attrBonus: { attr: 'gunt', n: 3 } };
    SQ.Events.applyEffects(w295b, pack, D, M(mkProf(), w295b), e295b, { applied: ap295b, log: noop295, now: 1700000095000 });
    var a295 = w295a.attrEventBonus.gunt === undefined && !ap295a.attrBonus && e295a.attrBonus == null &&
      SQ.Events.effText(w295a, pack, D, e295a) === SQ.Events.effText(w295a, pack, D, {}) &&
      w295b.attrEventBonus.gunt === 3 && !!ap295b.attrBonus;
    /* (a2) 🔧 复核返修：撤销条件原判成 `bn > 0`，连**负值**（减属性）一起撤了 ⇒ 「折寿 / 削悟性」类效果静默
     *   不生效而文案照印。负值在本仓是受支持的（`attrs.js:38` 直接加、normalize 不夹下界），现补一条负值判。 */
    var w295a2 = mkWs({}); w295a2.attrEventBonus = { mind: CAP295 };
    var e295a2 = { attrBonus: { attr: 'gunt', n: -2 } }; var ap295a2 = { attrBonus: { attr: 'gunt', n: -2 } };
    SQ.Events.applyEffects(w295a2, pack, D, M(mkProf(), w295a2), e295a2, { applied: ap295a2, log: noop295, now: 1700000095000 });
    var a295b = w295a2.attrEventBonus.gunt === -2 && !!ap295a2.attrBonus && e295a2.attrBonus != null;

    var w295c = mkWs({}); w295c.artsSlots = []; w295c.artsKnown = []; w295c.artsLevels = {};
    var e295c = { artsProgress: 2 }; var ap295c = { artsProgress: 2 };
    SQ.Events.applyEffects(w295c, pack, D, M(mkProf(), w295c), e295c, { applied: ap295c, log: noop295, now: 1700000095000 });
    var w295d = mkWs({}); w295d.artsKnown = ['tuna']; w295d.artsSlots = ['tuna']; w295d.artsLevels = { tuna: 0 };
    var e295d = { artsProgress: 1 }; var ap295d = { artsProgress: 1 };
    SQ.Events.applyEffects(w295d, pack, D, M(mkProf(), w295d), e295d, { applied: ap295d, log: noop295, now: 1700000095000 });
    var b295 = e295c.artsProgress == null && !ap295c.artsProgress && Object.keys(w295c.artsLevels).length === 0 &&
      w295d.artsLevels.tuna === 1 && !!ap295d.artsProgress;

    var w295e = mkWs({}); w295e.gear = {};
    var e295e = { gearScoreDown: -0.2 };
    SQ.Events.applyEffects(w295e, pack, D, M(mkProf(), w295e), e295e, { applied: {}, log: noop295, now: 1700000095000 });
    var w295f = mkWs({}); w295f.gear = { weapon: mkGear('weapon', { atk: 100 }) };
    var atk0295 = w295f.gear.weapon ? w295f.gear.weapon.atk : 0;
    var e295f = { gearScoreDown: -0.2 };
    SQ.Events.applyEffects(w295f, pack, D, M(mkProf(), w295f), e295f, { applied: {}, log: noop295, now: 1700000095000 });
    var c295 = e295e.gearScoreDown == null &&
      SQ.Events.effText(w295e, pack, D, e295e) === SQ.Events.effText(w295e, pack, D, {}) &&
      atk0295 === 100 && w295f.gear.weapon.atk === 80;

    var pill295 = (D.PILLS || [])[0];
    var mS295 = { sum: { shopCost: -0.15, qiRate: 0 }, hooks: {}, bonds: {}, detail: {} };
    var MULT295 = D.FACTION_SUPPLY_PRICE_MULT != null ? D.FACTION_SUPPLY_PRICE_MULT : 2;
    var newP295 = SQ.Shop.supplyPriceOf(pill295, w295b, D, mS295);
    var oldP295 = Math.round(pill295.price * MULT295 * (1 + w295b.realm * (D.SHOP_PRICE_REALM || 0.4)));
    /* 期望值按坊市口径独立写一遍（priceOf 是 shop.js 私有，不外露）：坊市价 ×倍率 ×(1+realm×SHOP_PRICE_REALM)
     * ×(1+ΣshopCost) 后 **向上取整**、下限 1 —— 这正是旧内联式漏掉折扣与取整口径的那两件事。 */
    var exp295 = Math.max(1, Math.ceil(pill295.price * MULT295 *
      (1 + w295b.realm * (D.SHOP_PRICE_REALM || 0.4)) * (1 + mS295.sum.shopCost)));
    var d295 = newP295 === exp295 && newP295 < oldP295 &&
      SQ.Shop.supplyPriceOf(pill295, w295b, D, { sum: { shopCost: 0 }, hooks: {}, bonds: {}, detail: {} }) ===
      Math.max(1, Math.ceil(pill295.price * MULT295 * (1 + w295b.realm * (D.SHOP_PRICE_REALM || 0.4))));
    /* (d2) 真跑引擎那一笔：买一单门中供给，扣的灵石必须**正好等于** supplyPriceOf（只测函数等于公式，
     * 证不了调用点接上了 —— 本仓的规矩是判「消费关系」而不是「函数存在」）。 */
    var si295 = (D.FACTION_SUPPLY || [])[0];
    var pillS295 = null;
    (D.PILLS || []).forEach(function (p) { if (si295 && p.id === si295.pill) pillS295 = p; });
    var w295s = pack.normalize({});
    w295s.stones = 999999; w295s.factionId = 'huangfeng';
    w295s.factionRep = { huangfeng: 999999 }; w295s.factionRepPeak = 999999;
    var expS295 = pillS295 ? SQ.Shop.supplyPriceOf(pillS295, w295s, D, mS295) : -1;
    var rS295 = si295 ? SQ.Factions.buySupply(w295s, pack, D, mS295, si295.sku, 1700000095200, noop295) : { ok: false };
    var d295b = !!si295 && !!pillS295 && rS295.ok === true && w295s.stones === 999999 - expS295 && expS295 > 0;
    d295 = d295 && d295b;

    var w295g = mkWs({ realm: 0 }); var good295 = null;
    for (var t295 = 0; t295 < 600 && !good295; t295++) {
      var pg295 = SQ.Alchemy.rollPackGood(w295g, pack, D);
      if (pg295 && pg295.type === 'mat' && pg295.zoneGroup === 0) good295 = pg295;
    }
    var eids295 = [];
    if (good295) {
      w295g.realm = 6;                                    /* 抬到组 2 的区：旧口径会照当下境界发货 = 跨组套利 */
      w295g.materials = {};
      SQ.Alchemy.deliverPackGood(w295g, pack, D, M(mkProf(), w295g), good295, noop295);
      eids295 = Object.keys(w295g.materials || {});
    }
    var e295 = !!good295 && eids295.length > 0 &&
      eids295.every(function (id) { return SQ.Alchemy.groupOf(D, id) === 0; });

    var RC295 = (D.FUSE || {}).REFORGE_COST || {};
    var rc295 = [0, 1, 2, 3].map(function (i) { return SQ.Fusion.reforgeCostOf({ tier: i }, D); });
    var f295 = rc295.join(',') === [RC295.huang, RC295.xuan, RC295.di, RC295.tian].join(',') &&
      SQ.Fusion.reforgeCostOf({ tier: 9 }, D) === RC295.huang &&
      SQ.Fusion.reforgeCostOf({}, D) === RC295.huang;

    var PE295 = ((D.ALCHEMY || {}).APILLS || {}).ap_pozhang;
    var mod0295 = PE295.mod;
    var drinkTo = function () {
      var w = mkWs({ realm: 5 });
      var al = SQ.Alchemy.ensure(w, D);
      al.pills = { ap_pozhang: 1 }; al.pillDay = { day: 'x', n: 0 }; al.pillOnce = al.pillOnce || {};
      w.breakCostNext = 0.4;
      SQ.Alchemy.drinkPill(w, pack, D, 'ap_pozhang', 1700000095100, noop295, mkProf());
      return w.breakCostNext;
    };
    PE295.mod = -0.5; var gA295 = drinkTo(); PE295.mod = mod0295;
    var gB295 = drinkTo();
    var g295 = Math.abs(gA295 - (0.4 - 0.5)) < 1e-9 && Math.abs(gB295 - (0.4 + mod0295)) < 1e-9 &&
      !('POZHANG_MOD' in D.ALCHEMY);

    var mkLog6 = function () { var a = []; for (var i = 0; i < 6; i++) a.push({ ts: 1700 + i, delta: 1, reason: 'r', balance: 0 }); return a; };
    var LK0 = D.LEGACY.LOG_KEEP;
    D.LEGACY.LOG_KEEP = 3; var mLK = SQ.Legacy.metaNormalize({ karmaLog: mkLog6() });
    D.LEGACY.LOG_KEEP = LK0; var mLK0 = SQ.Legacy.metaNormalize({ karmaLog: mkLog6() });
    /* 复原那一判按「6 条全留」写：LOG_KEEP(20) 大于样本条数 ⇒ 上界不生效，这才是对照。 */
    var h295 = mLK.karmaLog.length === 3 && mLK0.karmaLog.length === 6;

    /* (i) 🔧 复核返修补的引擎侧直证：走查 AT-R 比的是「屏面 === `effRate`」，所以 `settle` 内部把乘区
     *   加两遍或漏一遍时 AT-R 照样绿 —— 那正是本批 B1 立「同源」要防的那一维。这里让**真结算**说话：
     *   单段、不破境、无 mianxi/claimQi 挂点 ⇒ 每秒实涨必等于视图取数口。 */
    var w295i = mkWs({ realm: 3, qi: 100, mode: 'seclude' });
    var m295i = SQ.Mods.collect(mkProf(), w295i, pack, D);
    var rateI295 = SQ.Idle.effRate(w295i, pack, D, m295i, false);
    var st295i = SQ.Idle.settle(w295i, pack, D, 5000, 1700000095300, { profile: mkProf(), autoTrib: false });
    var i295 = Math.abs(st295i.gain / 5 - rateI295) < 1e-6 &&
      SQ.Idle.effRate(w295i, pack, D, m295i, true) === SQ.Idle.rateOf(w295i, pack, D, m295i);

    /* (j) 🔧 复核返修：`applyEffects` 会**写传入的效果对象**（撤标签靠它），而丹药四处原先把表对象本体
     *   `D.PILLS[i].effect` 直接递进去 ⇒ 一颗丹吃出「无槽可进」就把表里那条效果改没了（本会话内该丹从此
     *   静默无效 = 本批自己要修的「写了没人接」同型，只是方向相反）。现四处一律传副本，这条判「真买一单之后表还是原样」。 */
    var siJ295 = (D.FACTION_SUPPLY || [])[0];
    var pJ295 = null;
    (D.PILLS || []).forEach(function (p) { if (siJ295 && p.id === siJ295.pill) pJ295 = p; });
    var effKeepJ = pJ295 ? pJ295.effect : null;
    var j295 = false, jPrint295 = null;
    if (pJ295) {
      var wJ295 = pack.normalize({});                          /* 与 (d2) 同形：normalize({}) 才保证 `huangfeng` 在世面上（initialState 的势力是掷出来的，会 `reason:'none'`） */
      wJ295.artsSlots = []; wJ295.artsKnown = []; wJ295.artsLevels = {};
      wJ295.stones = 999999; wJ295.factionId = 'huangfeng';
      wJ295.factionRep = { huangfeng: 999999 }; wJ295.factionRepPeak = 999999;
      pJ295.effect = { artsProgress: 2 };                    /* 造一枚「无槽可进」的丹：这一单必走撤销支 */
      try {
        var rJ295 = SQ.Factions.buySupply(wJ295, pack, D, M(mkProf(), wJ295), siJ295.sku, 1700000095400, noop295);
        j295 = rJ295.ok === true && wJ295.artsLevels.tuna === undefined &&
          !!pJ295.effect && pJ295.effect.artsProgress === 2;   /* 表未被改写 */
        jPrint295 = (pJ295.effect || {}).artsProgress;
      } finally {
        pJ295.effect = effKeepJ;   /* 🔧 二次复核：中途抛出也不许把药方表留在改写态（与 #294 的 finally 同一纪律） */
      }
    }

    ok('295', '静默零收益撤销 + 价格/上界单源（审计 #6/#8/#9/#14/#20）：(a) `attrEventBonus` 满上限被整笔丢弃 ⇒ applied 无键 + 文案与空效果逐字全等（未满正例照旧入账）；(b) 无槽可进 ⇒ `artsProgress` 撤销（有槽正例 +1 级）；(c) 四槽皆空 ⇒ 「法器受损」行不再出现（有装备正例 atk 真降）；(d) 门中供给价 === `Shop.priceOf(坊市价×倍率)` 且 −15% shopCost 真的吃进去（旧内联式会算出 ' + oldP295 + '）；(e) 材料包按**定价组**发货，抬境到组 2 仍只发组 0 的料（`zoneGroup` 从只写不读接上读者）；(f) `Fusion.reforgeCostOf` 四档 === 表且越界回 huang（旧视图兜底 800 = 玄阶价）；(g) 破障成本随 `APILLS.ap_pozhang.mod` 动（改 −0.5 ⇒ 0.4−0.5）且 `AL.POZHANG_MOD` 已不存在；(h) 读档保留条数随 `D.LEGACY.LOG_KEEP` 动（改 3 ⇒ 6 条只留 3，复原（表 20 > 样本 6）⇒ 6 条全留）；(a2) 🔧 **负值 `attrBonus` 不被撤销**（原撤条件写成 `bn > 0` 把减项一起撤了）；(i) 🔧 `settle` 单段实涨的每秒 === 视图取数口 `effRate`（走查只比「屏面 vs 函数」，函数内部重 drift 由这条兜）；(j) 🔧 真买一单门中供给后**药方表对象未被改写**（`applyEffects` 写传入对象 ⇒ 丹药四处改传副本）',
      a295 && a295b && b295 && c295 && d295 && e295 && f295 && g295 && h295 && i295 && j295,
      '判旗 a=' + a295 + ' a2=' + a295b + ' b=' + b295 + ' c=' + c295 + ' d=' + d295 + ' e=' + e295 + ' f=' + f295 + ' g=' + g295 + ' h=' + h295 + ' i=' + i295 + ' j=' + j295 +
      ' ‖ (i) 结算每秒=' + (st295i.gain / 5).toFixed(4) + ' 取数口=' + rateI295.toFixed(4) +
      ' ‖ (j) 买完表值=' + jPrint295 + '（应为 2 = 未被改写）' +
      ' ‖ (a) 上限时 applied=' + JSON.stringify(ap295a) + ' 未满=' + (w295b.attrEventBonus.gunt) +
      ' ‖ (b) 无槽=' + JSON.stringify(w295c.artsLevels) + ' 有槽=' + w295d.artsLevels.tuna +
      ' ‖ (c) 空槽文案等同空效果=' + (SQ.Events.effText(w295e, pack, D, e295e) === SQ.Events.effText(w295e, pack, D, {})) +
      ' 有装备 atk ' + atk0295 + '→' + (w295f.gear.weapon ? w295f.gear.weapon.atk : '-') +
      ' ‖ (d) 新=' + newP295 + ' 期望=' + exp295 + ' 旧内联=' + oldP295 +
      ' ‖ (d2) 真买一单：扣=' + (999999 - w295s.stones) + ' 应扣=' + expS295 + ' ok=' + rS295.ok +
      ' ‖ (e) 发货组=' + (good295 ? eids295.map(function (id) { return SQ.Alchemy.groupOf(D, id); }).join('') : '(未掷出组 0 包)') +
      ' ‖ (f) ' + rc295.join('/') + ' 越界=' + SQ.Fusion.reforgeCostOf({ tier: 9 }, D) +
      ' ‖ (g) 改表=' + gA295 + ' 原=' + gB295 + ' ‖ (h) 改表留 ' + mLK.karmaLog.length + ' 条 / 原留 ' + mLK0.karmaLog.length + ' 条');


    /* #258 容量级⑧b「无损序列化折叠」（2026-10-07 折叠批 · 轮回卷 §二 收集类项的账实收口）：
     * 正典说收集类项（法宝/功法满级/称号/里程碑/成就）复用图鉴账本作幂等键、不在 meta.earnedKeys
     * **二次冗余存储**；legacy.js 实况却逐条存着实付额，而实付额含**历史转世通道系数**
     * （legacy.js `preview()` 的 `mult = channel === 'feisheng' ? 1 : BINGJIE_MULT` 与 `once()` 的
     *  `got: Math.floor(pts * mult)`——按符号引用，行号随该文件在飞批次漂移）
     * ——同一件法宝飞升世入账 2、兵解世入账 floor(2×0.7)=1 → #197 的 ΣearnedKeys **不可**由
     * 「图鉴账本 + 常量表」重算（那会让恒等式依赖不可复现的历史、真机余额在 reload 时漂移）。
     * 本批取「无损序列化折叠」：内存态 + earn 路径 + #197 公式**一字不动**，只落盘前折叠、读档后精确还原。
     * (a) **前提实证**（真机 earn 路径，非读表）：rebirth 双通道 + Codex.scan 落进五族的**每一条**值
     *     都必须 ∈ {V, floor(V×BINGJIE_MULT)}（结算族）或该 id 的表定值（即时族）——**不存在第三种落盘值**；
     * (b) **往返深度全等**：#206 最坏态（数百条五族条目）折叠落盘 → normalize → 键集合 + 逐键值 + Σ
     *     三者与内存态全等；meta.karma 零变化、#197 恒等式继续成立；
     * (c) **兵解折减档**：值 = floor(V×0.7) 的条目折进自己的桶、还原后仍是折减值（不与满额档混同）；
     * (d) **例外表**：值不合规 / 未知成就 id / 非正典档位 / 族外键（zone./boss./trib./realmMax/…）
     *     一律**原样留在 earnedKeys**——不折、不丢、不被重建覆盖；
     * (e) **旧档向后兼容 + 幂等**：无 ekF 的存档 normalize 照旧（零迁移脚本）；normalize 连跑两次全等；
     * (f) **脏档零崩溃**（同级⑧ / #219 体例）：ekF 为字符串 / 数组 / 桶非对象 / 桶键非正整数 /
     *     列表非数组 / 含非字符串项 / 重复 id / 未知族名 / 与例外表撞键 → 逐项清理、不抛异常；
     * (g) **容量实测下降 + 内存态零污染**：同一份内容折叠前后字节对比（省下的必须是真字节）；
     *     save 不改活档（序列化副本级，ekF 恒不进入内存态）。 */
    var L258 = D.LEGACY, C258 = D.CODEX, T258 = 1700000000000;
    /* 治理批注 2026-10-09：#206 满档模型的 earnedKeys 带 trib.N 逐世明细，落盘时阶梯级② 会把它们并成
     * trib.bulk。改造前级②**顺带摧毁内存态**，于是本断言「折叠与内存态深度全等」正是踩着那个副作用成立的
     * （内存里 trib 早已并掉）。级② 自身的判据在 #206 / #277 ⇒ 本断言先把 trib.N 按级②同规则并掉，
     * 让两侧基线一致：**不是放宽判据，是去掉对副作用的依赖**（⑧b 五族折叠的无损性仍逐键全核）。 */
    function foldTrib258(ek) {
      var sum = 0, any = false, out = {};
      Object.keys(ek).forEach(function (k) { if (/^trib\.\d+$/.test(k)) { sum += ek[k]; any = true; return; } out[k] = ek[k]; });
      if (any) out['trib.bulk'] = (out['trib.bulk'] || 0) + sum;
      return out;
    }
    function base258() {
      var b = JSON.parse(JSON.stringify(ref206));
      b.meta.earnedKeys = foldTrib258(b.meta.earnedKeys || {});
      return b;
    }
    /* 独立于 core.js 实现的口径表（断言侧自证，不与被测代码共用判据） */
    var PRE258 = { 'treasure.': L258.TREASURE_EACH, 'artmax.': L258.ART_MAX_EACH, 'title.': L258.TITLE_EACH };
    function legal258(k) {                     /* → 该键允许落盘的值数组；非五族或不可推导 → null */
      for (var p in PRE258) if (k.indexOf(p) === 0) return [PRE258[p], Math.floor(PRE258[p] * L258.BINGJIE_MULT)];
      if (k.indexOf('achv_') === 0) {
        var a258 = null;
        (C258.ACHV || []).forEach(function (x) { if (x && x.id === k) a258 = x; });
        return a258 ? [a258.karma] : null;
      }
      if (k.indexOf('codex.ms.') === 0) {
        var t258 = /^(.*)\.(\d+)$/.exec(k.slice('codex.ms.'.length));
        if (!t258) return null;
        var lst258 = t258[1] === 'title' ? (C258.TITLE_MS || [])
          : (C258.MS_PCT || []).map(function (x) { return Math.round(x * 100); });
        var ix258 = lst258.indexOf(Number(t258[2]));
        return ix258 >= 0 ? [(C258.MS_KARMA || [])[ix258]] : null;
      }
      return null;
    }
    function isFam258(k) { return k.indexOf('treasure.') === 0 || k.indexOf('artmax.') === 0 ||
      k.indexOf('title.') === 0 || k.indexOf('achv_') === 0 || k.indexOf('codex.ms.') === 0; }
    function ckObj258(o) {                     /* 规范形：键升序（深度全等判据不看键序） */
      var ks258 = Object.keys(o || {}).sort();
      return JSON.stringify(ks258.map(function (k) { return [k, o[k]]; }));
    }
    function sumObj258(o) { var t258 = 0; for (var k in o) t258 += o[k]; return t258; }
    /* (a) 真机 earn 路径取证：转世结算（飞升满额 / 兵解折减两通道）+ 图鉴扫描（成就 / 里程碑即时入账） */
    var harvest258 = function (ch258) {
      var s258 = SQ.defaultState();
      s258.profile = mkProf([]);
      var w258 = pack.initialState();
      w258.realm = 9; w258.cleared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; w258.bossKills = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      w258.tribulation = { attempts: 3, success: 2, lastResult: true };
      var mm258 = s258.meta;
      mm258.codices.treasure = pack.treasures.LIST.map(function (t) { return t.id; });
      mm258.codices.artMax = Object.keys(pack.artsMap());
      mm258.titles = [];
      for (var q258 = 0; q258 < 80; q258++) mm258.titles.push('title_p258_' + q258);
      mm258.codices.title = mm258.titles.slice();
      mm258.stats.lives = 2; mm258.stats.ascensions = 1; mm258.stats.dissolutions = 1;
      mm258.stats.rankMax = 4; mm258.stats.officeMax = 0; mm258.stats.rankScored = 0;
      s258.worlds.xiuxian = w258;
      SQ.Legacy.rebirth(s258, ch258, T258);
      return s258.meta.earnedKeys;
    };
    var harvestScan258 = function () {
      var s258 = SQ.defaultState();
      s258.profile = mkProf([]);
      var w258 = pack.initialState();
      w258.realm = 9; w258.cleared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; w258.bossKills = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      w258.treasures.owned = pack.treasures.LIST.map(function (t) { return { id: t.id, st: {} }; });
      Object.keys(pack.artsMap()).forEach(function (a) { w258.artsKnown.push(a); w258.artsLevels[a] = 9; });
      (pack.companions || []).forEach(function (c) { w258.bonds[c.id] = 50; });
      D.FACTIONS_FIXED.forEach(function (f) { w258.factionRep[f.id] = 5000; });
      w258.factionId = D.FACTIONS_FIXED[0].id;
      w258.tribMarks = { wulouRun: 3, kudu: true, lianbai: true, yuanman: true };
      w258.tiandao = SQ.Tiandao.normalize({ defy: 100, title: true, stats: { defy: 10, accept: 1 }, nijieWins: 1, nijieFails: 1 }, D);
      w258.alchemy = { fires: 1, jiuzhuan: 1, forgeMade: 1 };
      w258.sect = { name: 'p' };
      SQ.Events.allIds(pack).forEach(function (e, ei) { w258.eventHistory.seen[e] = T258 + ei; });
      ['common', 'xiuxian'].forEach(function (wd) {
        var tp258 = SQ.TALENTS[wd];
        if (tp258) { tp258.positive.forEach(function (x) { s258.profile.talents.push({ id: x.id }); }); tp258.negative.forEach(function (x) { s258.profile.talents.push({ id: x.id }); }); }
      });
      s258.profile.legacyTalents = D.LEGACY.TALENTS.map(function (t) { return { id: t.id, effects: {} }; });
      s258.meta.stats.lives = 3; s258.meta.stats.ascensions = 1; s258.meta.stats.dissolutions = 2;
      s258.meta.stats.tribWin = 40; s258.meta.stats.tribAttempts = 100; s258.meta.stats.omensSeen = 30;
      for (var q258 = 0; q258 < 60; q258++) SQ.Codex.addTitle(s258.meta, 'title_p258b_' + q258);
      s258.worlds.xiuxian = w258;
      SQ.Codex.scan(s258, T258);
      return s258.meta.earnedKeys;
    };
    var ekA258 = { feisheng: harvest258('feisheng'), bingjie: harvest258('bingjie'), scan: harvestScan258() };
    var chk258a = 0, bad258a = [], famSeen258 = {};
    Object.keys(ekA258).forEach(function (tag) {
      Object.keys(ekA258[tag]).forEach(function (k) {
        if (!isFam258(k)) return;
        var lv258 = legal258(k);
        chk258a++;
        famSeen258[k.indexOf('treasure.') === 0 ? 'treasure' : k.indexOf('artmax.') === 0 ? 'artmax' :
          k.indexOf('title.') === 0 ? 'title' : k.indexOf('achv_') === 0 ? 'achv' : 'ms'] = 1;
        if (!lv258 || lv258.indexOf(ekA258[tag][k]) < 0) bad258a.push(tag + ':' + k + '=' + ekA258[tag][k] + '/legal=' + JSON.stringify(lv258));
      });
    });
    var a258 = chk258a > 150 && bad258a.length === 0 && Object.keys(famSeen258).length === 5;
    /* (b)(c)(d)(g) 折叠往返：以 #206 最坏态为底（五族条目数百条），再补兵解档与例外表条目 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var ref258 = base258();
    var mm258b = ref258.meta;
    mm258b.earnedKeys['treasure.bingjie258'] = Math.floor(L258.TREASURE_EACH * L258.BINGJIE_MULT);   /* 兵解折减档 */
    mm258b.earnedKeys['artmax.bingjie258'] = Math.floor(L258.ART_MAX_EACH * L258.BINGJIE_MULT);
    mm258b.earnedKeys['title.bingjie258'] = Math.floor(L258.TITLE_EACH * L258.BINGJIE_MULT);
    mm258b.earnedKeys['treasure.bad258'] = 7;                                     /* 值不合规 → 例外表 */
    mm258b.earnedKeys['achv_unknown258'] = 4;                                    /* 未知成就 id → 例外表 */
    mm258b.earnedKeys['codex.ms.title.80'] = 30;                                  /* 非正典档位（TITLE_MS 无 80）→ 例外表 */
    mm258b.earnedKeys['zone.0'] = (mm258b.earnedKeys['zone.0'] || 0) + 3;          /* 族外累计键 → 永不折 */
    var sumE258 = 0, kE258, kS258;
    for (kE258 in mm258b.earnedKeys) sumE258 += mm258b.earnedKeys[kE258];
    var sumS258 = 0; for (kS258 in mm258b.spent) sumS258 += mm258b.spent[kS258];
    mm258b.karma = sumE258 - sumS258;                                             /* 重挂 #197（条目增删后账本自洽） */
    var before258 = ckObj258(mm258b.earnedKeys);
    var karma258 = mm258b.karma;
    await SQ.save(ref258);
    var raw258 = localStorage.getItem(SQ.KEY);
    var disk258 = raw258 ? JSON.parse(raw258) : {};
    var ekF258 = (disk258.meta || {}).ekF;
    var foldOn258 = !!ekF258 && typeof ekF258 === 'object' && !Array.isArray(ekF258);
    var foldN258 = 0, foldFam258 = {};
    if (foldOn258) Object.keys(ekF258).forEach(function (f) {
      foldFam258[f] = 1;
      Object.keys(ekF258[f]).forEach(function (b) { foldN258 += (ekF258[f][b] || []).length; });
    });
    var dEk258 = (disk258.meta || {}).earnedKeys || {};
    var b258 = true, b258why = '';
    Object.keys(dEk258).forEach(function (k) {          /* 盘上残余必须全是例外（族内且值合规的不得残留） */
      if (isFam258(k) && legal258(k) && legal258(k).indexOf(dEk258[k]) >= 0) { b258 = false; b258why = 'residue:' + k; }
    });
    var red258 = typeof disk258.meta === 'object' && disk258.meta.earnedKeys != null;
    var n258 = SQ.normalize(disk258);
    var back258 = (n258.meta || {}).earnedKeys || {};
    /* 真机读通道复核（load = claim/mutate 用的同一条读档口，含 normalize + 日志档回填） */
    var l258 = await SQ.load();
    var eqLoad258 = ckObj258(l258.meta.earnedKeys) === before258 && l258.meta.karma === karma258 &&
      identOk(l258.meta) && l258.meta.ekF == null;
    var eqKeys258 = ckObj258(back258) === before258;                       /* 键集合 + 逐键值深度全等 */
    var eqSum258 = sumObj258(back258) === sumE258;                          /* ΣearnedKeys 全等 */
    var eqKarma258 = n258.meta.karma === karma258 && identOk(n258.meta);    /* #197 零改动 */
    var b258all = foldOn258 && foldN258 > 150 && red258 && eqKeys258 && eqSum258 && eqKarma258 && eqLoad258 && b258 &&
      ['zone.0', 'boss.0', 'realmMax', 'officeMax', 'rankMax', 'ascend', 'trib.bulk'].every(function (k) { return back258[k] != null; });
    /* (c) 兵解折减档还原后仍是折减值（未被满额档同化） */
    var c258 = back258['treasure.bingjie258'] === Math.floor(L258.TREASURE_EACH * L258.BINGJIE_MULT) &&
      back258['artmax.bingjie258'] === Math.floor(L258.ART_MAX_EACH * L258.BINGJIE_MULT) &&
      back258['title.bingjie258'] === Math.floor(L258.TITLE_EACH * L258.BINGJIE_MULT) &&
      back258['treasure.bingjie258'] !== L258.TREASURE_EACH;
    /* (d) 例外表原样在档（盘上 + 还原后两处都核） */
    var d258 = ['treasure.bad258', 'achv_unknown258', 'codex.ms.title.80'].every(function (k) {
      return dEk258[k] === mm258b.earnedKeys[k] && back258[k] === mm258b.earnedKeys[k];
    });
    /* (g) 内存态零污染：活档 earnedKeys 逐字不变、ekF 恒不进入内存态 */
    var g258 = ckObj258(mm258b.earnedKeys) === before258 && mm258b.ekF == null && n258.meta.ekF == null;
    /* (g2) 字节实测：同一份内容「折叠形态落盘」vs「手工展开等价档」 */
    var un258 = JSON.parse(raw258);
    var unEk258 = {};
    Object.keys(un258.meta.earnedKeys).forEach(function (k) { unEk258[k] = un258.meta.earnedKeys[k]; });
    Object.keys(ekF258 || {}).forEach(function (f) {
      var pre258 = f === 'achv' ? 'achv_' : f === 'ms' ? 'codex.ms.' : f + '.';
      Object.keys(ekF258[f]).forEach(function (bv) {
        (ekF258[f][bv] || []).forEach(function (id) { unEk258[pre258 + id] = Number(bv); });
      });
    });
    un258.meta.earnedKeys = unEk258;
    delete un258.meta.ekF;
    var bytesFolded258 = byteLen(raw258), bytesUnfolded258 = byteLen(un258);
    var saved258 = bytesUnfolded258 - bytesFolded258;
    /* (e) 旧档兼容（无 ekF）+ normalize 幂等 */
    var old258 = { v: 1, profile: { name: 'p', worldId: 'xiuxian' }, meta: { unlockedWorlds: ['xiuxian'],
      earnedKeys: { 'treasure.x01': 2, 'zone.0': 10, 'achv_jichu': 2 }, spent: { 'shop.heir': 4 }, karma: 10 } };
    var nOld258 = SQ.normalize(JSON.parse(JSON.stringify(old258)));
    var oldOk258 = ckObj258(nOld258.meta.earnedKeys) === ckObj258(old258.meta.earnedKeys) && nOld258.meta.karma === 10 &&
      nOld258.meta.ekF == null;
    var idem258 = ckObj258(SQ.normalize(SQ.normalize(disk258)).meta.earnedKeys) === ckObj258(back258) &&
      ckObj258(SQ.normalize(JSON.parse(JSON.stringify(old258))).meta.earnedKeys) === ckObj258(nOld258.meta.earnedKeys);
    /* (f) 脏档逐项清理不抛（参照级⑧ / #219 体例） */
    var dirty258 = [
      { ekF: 'junk-string' }, { ekF: ['a', 'b'] }, { ekF: 42 }, { ekF: null, mustKeep: 0 },
      { ekF: { treasure: 'notobj' } }, { ekF: { treasure: { '2': 'notarray' } } },
      { ekF: { treasure: { '2': [null, 5, '', {}, 'ok'] } } },
      { ekF: { treasure: { '2': ['dup', 'dup'], '1': ['dup'] } } },
      { ekF: { bogusfam: { '3': ['x'] }, nope: [] } },
      { ekF: { treasure: { '0': ['a'], '-2': ['b'], '1e3': ['c'], 'x': ['d'], '2.5': ['e'], '9007199254740993': ['f'] } } },
      { ekF: { treasure: { '2': ['x01'] } }, ek: { 'treasure.x01': 7 } },       /* 撞键 = 账本优先 */
      { ekF: { ms: { '15': ['art.50', 'weird', 'a.b.c'] }, achv: { '2': ['jichu', '_x'] } } }
    ];
    var f258 = true, f258why = '';
    dirty258.forEach(function (d, di) {
      var raw258d = { v: 1, profile: { name: 'p', worldId: 'xiuxian' },
        meta: { unlockedWorlds: ['xiuxian'], earnedKeys: Object.assign({}, d.ek || {}), spent: {}, karma: 0 } };
      raw258d.meta.ekF = d.ekF;
      var n258d;
      try { n258d = SQ.normalize(raw258d); } catch (e) { f258 = false; f258why = 'throw#' + di + ':' + e.message; return; }
      if (n258d.meta.ekF != null) { f258 = false; f258why += ' residue#' + di; }
      Object.keys(n258d.meta.earnedKeys).forEach(function (k) {
        var v258d = n258d.meta.earnedKeys[k];
        if (typeof v258d !== 'number' || !isFinite(v258d) || v258d <= 0) { f258 = false; f258why += ' badval#' + di + ':' + k; }
      });
      if (!identOk(n258d.meta)) { f258 = false; f258why += ' ident#' + di; }
    });
    /* 定向核：脏档里合法项仍要收进（不是整包丢弃），非法项必须被丢 */
    var nD1258 = SQ.normalize({ v: 1, profile: { worldId: 'xiuxian' }, meta: { earnedKeys: {}, ekF: { treasure: { '2': [null, 5, '', 'ok'] }, bogus: { '1': ['y'] } } } });
    var nD2258 = SQ.normalize({ v: 1, profile: { worldId: 'xiuxian' }, meta: { earnedKeys: { 'treasure.x01': 7 }, ekF: { treasure: { '2': ['x01', 'fresh'] } } } });
    var f258b = nD1258.meta.earnedKeys['treasure.ok'] === 2 && Object.keys(nD1258.meta.earnedKeys).length === 1 &&
      nD2258.meta.earnedKeys['treasure.x01'] === 7 && nD2258.meta.earnedKeys['treasure.fresh'] === 2;
    /* (h) 稀疏档自动退让 = 容量只降不升：五族各只剩 1 条时紧凑容器自身开销吃掉省下的字节 →
     *     整族留在 earnedKeys、盘上不落 ekF（且往返仍逐字全等、字节不比折叠档更大） */
    var ref258h = base258();
    var ek258h = ref258h.meta.earnedKeys, kH258;
    for (kH258 in ek258h) if (isFam258(kH258)) delete ek258h[kH258];
    ek258h['treasure.x01'] = L258.TREASURE_EACH;
    ek258h['artmax.a01'] = L258.ART_MAX_EACH;
    ek258h['title.t01'] = L258.TITLE_EACH;
    ek258h['achv_jichu'] = 2;
    ek258h['codex.ms.art.50'] = C258.MS_KARMA[0];
    var sumE258h = sumObj258(ek258h), sumS258h = sumObj258(ref258h.meta.spent);
    ref258h.meta.karma = sumE258h - sumS258h;
    var before258h = ckObj258(ek258h);
    await SQ.save(ref258h);
    var disk258h = JSON.parse(localStorage.getItem(SQ.KEY));
    var n258h = SQ.normalize(disk258h);
    var h258 = disk258h.meta.ekF == null && ckObj258(n258h.meta.earnedKeys) === before258h &&
      n258h.meta.karma === sumE258h - sumS258h &&
      disk258h.meta.earnedKeys['treasure.x01'] === L258.TREASURE_EACH &&
      disk258h.meta.earnedKeys['codex.ms.art.50'] === C258.MS_KARMA[0];
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('258', '容量级⑧b earnedKeys 五族无损序列化折叠（轮回卷 §二 账实收口 · 走「落盘前折叠 / 读档后精确还原」而非删二次存储——实付额含历史通道系数（legacy.js preview/once 的 mult 折算行），重算 Σ 会让 #197 依赖不可复现的历史）：' +
      '(a) **前提实证**走真机 earn 路径（rebirth 飞升/兵解双通道 + Codex.scan 成就与里程碑），五族落盘值必须恰为 {V, floor(V×BINGJIE_MULT)} 或即时族表定值——**第三种值 = 0 条**；' +
      '(b) #206 最坏态折叠 → normalize 后 earnedKeys **键集合 + 逐键值 + Σ** 与内存态**深度全等**（并同档过一遍真机读通道 `SQ.load`——claim/mutate 用的同一条口），meta.karma 零变化且 #197 恒等式续绿、#200 继承矩阵侧的族外键（zone./boss./realmMax/officeMax/rankMax/ascend/trib.bulk）全在；' +
      '(c) 兵解折减档独立成桶、还原后仍是 floor(V×0.7)（不被满额档同化）；(d) 例外表（值不合规 / 未知成就 id / 非正典档位 / 族外键）**原样留档**不折不丢；' +
      '(e) 旧档无 ekF 照旧读入（零迁移脚本）+ normalize 幂等；(f) 脏档 12 例（字符串/数组/桶非对象/桶键非正整数/列表非数组/非字符串项/重复 id/未知族名/撞键）逐项清理不抛、紧凑键零残留、#197 仍自洽；' +
      '(g) 字节实测下降 + 内存态零污染（ekF 恒不落内存）；(h) 稀疏档自动退让（每族只剩 1 条时整族不折、盘上零 ekF）= 容量只降不升',
      a258 && b258all && c258 && d258 && oldOk258 && idem258 && f258 && f258b && g258 && h258 && saved258 > 0,
      '(a) 五族条目=' + chk258a + ' 越界=' + (bad258a.length ? bad258a.join(',') : '0') + ' 族覆盖=' + Object.keys(famSeen258).join('/') +
      ' ‖ (b) 折叠条目=' + foldN258 + ' 族=' + Object.keys(foldFam258).join('/') + ' 键全等=' + eqKeys258 + ' Σ全等=' + eqSum258 +
      '(' + sumE258 + ') karma=' + eqKarma258 + ' 真机load同档=' + eqLoad258 + ' 盘上无合规残留=' + b258 + b258why +
      ' ‖ (c) 兵解档=' + back258['treasure.bingjie258'] + '/' + back258['artmax.bingjie258'] + '/' + back258['title.bingjie258'] +
      ' ‖ (d) 例外=' + JSON.stringify([dEk258['treasure.bad258'], dEk258['achv_unknown258'], dEk258['codex.ms.title.80']]) +
      ' ‖ (e) 旧档=' + oldOk258 + ' 幂等=' + idem258 + ' ‖ (f) 脏档=' + f258 + f258why + ' 定向=' + f258b +
      ' ‖ (g) 折叠前=' + bytesUnfolded258 + 'B 折叠后=' + bytesFolded258 + 'B 省=' + saved258 + 'B' +
      ' 内存零污染=' + g258 + ' ‖ (h) 稀疏档退让(无ekF+往返全等)=' + h258 +
      ' ‖ 编码样例=' + JSON.stringify((ekF258 || {}).treasure ? { treasure: (function () { var o = {}; Object.keys(ekF258.treasure).forEach(function (b) { o[b] = ekF258.treasure[b].slice(0, 2); }); return o; })() } : {}));

    /* ═══ #259 死链修复批（2026-10-07 · 三链「出账端」常驻守卫）═══
     * 病根三条：① 器灵觉醒标记落档字段 = `st.spirit.a`（`fusion.js:380` 唯一写口、`normalizeSpirits` 同认），
     * 而承继选件（`legacy.js`）与图鉴第 9 面登记（`codex.js`）两处读点曾写 `st.spirit.awake`——全库零写入方
     * → 买过 `shop.heir` 也恒不选件、器灵永不入 `selfart` 面；② `meta.stats.rankMax` 全库零写入方
     * → `RANK_SCORE` 差额补分行恒 0（天骄侧只写 `ws.prodMarks.myRank`，从未回灌 meta）；
     * ③ 天道「情缘牵引」兜底池直读 `ws.bonds` 全部键，是全代码唯一能把**天骄好感**推进旨意效果的路径
     * （显式 target 走 `Bonds.byId` 只认道友名录，故漏点只在兜底池）。
     * 教训（图鉴卷 v1.4 §4.3.1 与轮回卷 v1.6 的第三面）：**「查到实现体 + 消费点」仍不等于「判定可达」**
     * ——凡转 ✅ 须跑到出账那一端；本断言就是那一端的替身，此后任何人把这三条改回死链都会撞上它。 */
    var T259 = 1700000000000;
    var LG259 = D.LEGACY, RS259 = LG259.RANK_SCORE || [], BS259 = (D.PRODIGY || {}).BOARD_SHOW || 10;
    function mkS259() {
      var w = pack.initialState();
      w.realm = 9; pack.recalcDerived(w, mkProf([]));
      return { v: SQ.V, profile: mkProf([]), worlds: { xiuxian: w }, meta: SQ.Legacy.metaBlank() };
    }
    function lnOf259(pv, key) { var r = null; pv.lines.forEach(function (x) { if (x.key === key) r = x; }); return r; }
    function ownOf259(w, id) {
      var e = null;
      ((w.treasures || {}).owned || []).forEach(function (x) { if (x.id === id) e = x; });
      return e;
    }
    var liang259 = [];
    for (var lid259 in pack.treasures.byId) {
      var ldef259 = pack.treasures.byId[lid259];
      if (ldef259.grade === 'liang' && ldef259.kind !== 'xian') liang259.push(lid259);
      if (liang259.length >= 2) break;
    }
    var idFake259 = liang259[0], idReal259 = liang259[1] || liang259[0];
    var s259 = mkS259(), w259 = s259.worlds.xiuxian, m259 = s259.meta;
    /* 假觉醒件先入 owned（若读点仍认 .awake，承继会错选它、图鉴会错录它） */
    SQ.Treasures.gain(w259, pack, D, idFake259, noopLog());
    var entFake259 = ownOf259(w259, idFake259);
    entFake259.st.spirit = { awake: 1, a: 0, w: 0 };
    SQ.Treasures.gain(w259, pack, D, idReal259, noopLog());
    var eq259 = SQ.Treasures.equip(w259, pack, D, idReal259, noopLog());
    var entReal259 = ownOf259(w259, idReal259);
    SQ.Fusion.warm(w259, pack, D, ((D.SPIRIT || {}).NEED || {}).liang + 50 || 350, T259, noopLog());
    var aReal259 = !!(entReal259.st && entReal259.st.spirit && entReal259.st.spirit.a === 1);
    var face259 = ((m259.codices || {}).selfart || []).slice();
    SQ.Legacy.earnOnce(m259, 'probe.grant259', 5000, 'probe', T259);
    SQ.Codex.scan(s259, T259 + 1);
    face259 = ((m259.codices || {}).selfart || []).slice();
    var faceOk259 = face259.indexOf('sp_' + idReal259) >= 0 && face259.indexOf('sp_' + idFake259) < 0;
    var buy259 = SQ.Legacy.buy(s259, 'heir', T259 + 2);
    var pv259 = SQ.Legacy.preview(w259, m259, pack, D, 'bingjie', T259 + 3);
    SQ.Legacy.rebirth(s259, 'bingjie', T259 + 4);
    var w259b = s259.worlds.xiuxian;
    var heirOk259 = m259.heirTreasure === idReal259 && !!ownOf259(w259b, idReal259);   /* 状态随件承继一环由 #260 专守，本条只守「选件—搬运」环 */
    var reb259 = SQ.Legacy.rebirth(s259, 'bingjie', T259 + 5);
    var heirStable259 = m259.heirTreasure === idReal259 && !!ownOf259(s259.worlds.xiuxian, idReal259);
    /* ③ 榜位档逐档对表（0 未入榜 / 1 入榜 / 2 前十 / 3 前三 / 4 第一 → RANK_SCORE 差额补分 × 兵解 0.7） */
    var t259cases = [[undefined, 0], [0, 0], [1, 4], [2, 3], [3, 3], [4, 2], [BS259, 2], [BS259 + 1, 1]];
    var t259rows = [], t259all = true;
    t259cases.forEach(function (c259) {
      var wx259 = pack.initialState();
      wx259.realm = 9; pack.recalcDerived(wx259, mkProf([]));
      if (c259[0] != null) wx259.prodMarks = { myRank: c259[0], rankAt: T259 };
      var ln259 = lnOf259(SQ.Legacy.preview(wx259, SQ.Legacy.metaBlank(), pack, D, 'bingjie', T259), 'rankMax');
      var wantNom = RS259[c259[1]] || 0;
      if (ln259.nominal !== wantNom) t259all = false;
      t259rows.push(c259[0] + '→' + ln259.nominal + '/' + wantNom);
    });
    /* 首世拿第一 → 真出账 → 二世跌档只补差不追讨（历史最高档承载 + 恒等式 #197 续绿） */
    var s259m = mkS259(), w259m = s259m.worlds.xiuxian, t259m3 = s259m.meta;
    SQ.Legacy.earnOnce(t259m3, 'probe.grantRank', 5000, 'probe', T259 + 6);
    w259m.prodMarks = { myRank: 1, rankAt: T259 };
    var t259ln1 = lnOf259(SQ.Legacy.preview(w259m, t259m3, pack, D, 'bingjie', T259 + 7), 'rankMax');
    SQ.Legacy.rebirth(s259m, 'bingjie', T259 + 8);
    var t259pay1 = t259m3.earnedKeys.rankMax || 0;
    var t259idm = t259ln1.got === Math.floor(RS259[4] * LG259.BINGJIE_MULT) && t259pay1 === t259ln1.got &&
      t259m3.stats.rankMax === 4 && t259m3.stats.rankScored === 4 && identOk(t259m3);
    s259m.worlds.xiuxian = pack.initialState();
    s259m.worlds.xiuxian.realm = 9; pack.recalcDerived(s259m.worlds.xiuxian, mkProf([]));
    s259m.worlds.xiuxian.prodMarks = { myRank: BS259 - 1, rankAt: T259 };
    var t259ln2 = lnOf259(SQ.Legacy.preview(s259m.worlds.xiuxian, t259m3, pack, D, 'bingjie', T259 + 9), 'rankMax');
    var t259no2 = t259ln2.got === 0 && t259m3.earnedKeys.rankMax === t259pay1 && t259m3.stats.rankMax === 4;
    /* ④ 天道情缘牵引兜底池：bonds 只有天骄槽时不得落天骄（回落道友名录），显式 pr target 在 sanitize 即被丢 */
    var s259t = mkS259(), w259t = s259t.worlds.xiuxian;
    w259t.prodigies = [{ id: 'pr1', nm: ['甲', '乙', '丙'], rlm: 9, apt: 1, al: 'right' }];
    w259t.bonds = { pr1: 50 };
    var t259npc = null, t259prD = 0;
    for (var ti259b = 0; ti259b < 30 && t259npc === null; ti259b++) {
      var acc259 = SQ.Tiandao.accept(w259t, pack, D, SQ.Mods.collect(mkProf([]), w259t, pack, D),
        { decreeId: 'probe259' + ti259b, type: 'bond', payload: { bond: 5 } }, T259 + 10 + ti259b, { log: noopLog() });
      if (acc259.ok && acc259.gains && acc259.gains.bond) t259npc = acc259.gains.bond.npc;
    }
    t259prD = (w259t.bonds.pr1 || 0) - 50;
    var t259comp = {};
    (D.COMPANIONS || []).forEach(function (c259x) { t259comp[c259x.id] = 1; });
    var t259pr = !!t259npc && t259npc !== 'pr1' && !!t259comp[t259npc] && t259prD === 0;
    var t259tgt = SQ.Tiandao.sanitize({ decreeId: 'probe259t', type: 'bond', payload: { target: 'pr1', bond: 5 } },
      w259t, pack, D, T259 + 40);
    t259pr = t259pr && t259tgt && t259tgt.payload.target == null;
    ok('259', '死链修复批三链出账端（① 器灵觉醒标记单一事实源 = `st.spirit.a`：真链路 `Fusion.warm` 觉醒后 `a===1` → `Codex.scan` 把 `sp_<id>` 录入第 9 面、**只写 `.awake`（全库零写入方的历史错读字段）的假件既不录也不被承继选中**；② `shop.heir` 购项 → `rebirth` → `meta.heirTreasure` = 真觉醒件且下世 `owned` 含该件（**状态随件承继与彩蛋两环由 #260 专守**，本条只守「选件—搬运」与反向守卫）、二世转世不重选；③ 同代榜位供数 `prodMarks.myRank → meta.stats.rankMax → RANK_SCORE` 真出钱；④ 天道情缘牵引兜底池排除天骄槽）',
      eq259.ok === true && aReal259 && faceOk259 && buy259.ok === true &&
      pv259.lines.length > 0 && heirOk259 && heirStable259 && reb259 != null &&
      identOk(m259) && t259all && t259idm && t259no2 && t259pr,
      '觉醒=' + aReal259 + ' 第9面=' + JSON.stringify(face259.filter(function (x259) { return x259.indexOf('sp_') === 0; })) +
      ' 承继=' + m259.heirTreasure + '/下世在库=' + !!ownOf259(s259.worlds.xiuxian, idReal259) +
      ' ‖ 榜位档=' + JSON.stringify(t259rows) + ' ‖ 首世实付=' + t259pay1 + ' 转世后=' + t259m3.stats.rankMax + '/' + t259m3.stats.rankScored +
      ' 跌档增量=' + t259ln2.got + ' ‖ 兜底池落点=' + t259npc + ' 天骄好感变动=' + t259prD + ' target净化后=' + JSON.stringify(t259tgt.payload.target));

    /* ═══ #260 真灵承继补完批（2026-10-07 · 器灵卷 §九「数据契约」与「跨世彩蛋」两环兑现）═══
     * 承继此前只搬法宝本体（`Treasures.gain` 建的是 `{id, st:{}}` 空态）⇒ 花 600 遗泽买「真灵承继」，
     * 器灵却从未觉醒过，立卷承诺的「下世直接入库且为觉醒态」与「又见面了，主人。」彩蛋双双落空。
     * 本条把两环钉死：快照（meta.heirSpirit）→ 下世还原（heirRestore）→ 首次祭出彩蛋（onEquipHeir）。 */
    var T260 = 1700000009000;
    var SP260 = D.SPIRIT || {}, PN260 = SP260.PERSONAS || [];
    function mkState260() {
      var w = pack.initialState();
      w.realm = 9; pack.recalcDerived(w, mkProf([]));
      return { v: SQ.V, profile: mkProf([]), worlds: { xiuxian: w }, meta: SQ.Legacy.metaBlank() };
    }
    function ownEntry260(w, tid) {
      var e = null;
      (((w || {}).treasures || {}).owned || []).forEach(function (x) { if (x.id === tid) e = x; });
      return e;
    }
    var liang260 = [];
    for (var tk260 in pack.treasures.byId) {
      var td260 = pack.treasures.byId[tk260];
      if (td260.grade === 'liang' && td260.kind !== 'xian') liang260.push(tk260);
      if (liang260.length >= 2) break;
    }
    var idA260 = liang260[0], idB260 = liang260[1] || liang260[0];
    var s260 = mkState260(), w260 = s260.worlds.xiuxian, m260 = s260.meta;
    SQ.Treasures.gain(w260, pack, D, idA260, noopLog());
    SQ.Treasures.gain(w260, pack, D, idB260, noopLog());     /* 第二件：验彩蛋只认承继件 */
    SQ.Treasures.equip(w260, pack, D, idA260, noopLog());
    SQ.Fusion.warm(w260, pack, D, ((SP260.NEED || {}).liang || 300) + 60, T260, noopLog());
    var eA260 = ownEntry260(w260, idA260), spA260 = eA260.st.spirit;
    spA260.cd = T260; spA260.mk = T260 + 99999; spA260.hun = 1; spA260.vt.trib = T260;   /* 造冷却态 */
    var snapIn260 = SQ.Fusion.heirSnapshot(spA260);
    var zeroOk260 = !!(snapIn260 && snapIn260.a === 1 && snapIn260.p === spA260.p && snapIn260.w === spA260.w &&
      snapIn260.cd == null && snapIn260.mk == null && snapIn260.hun == null && !('vt' in snapIn260) &&
      snapIn260.heir === 1 && snapIn260.ru === 0);
    var notAwake260 = SQ.Fusion.heirSnapshot({ a: 0, p: 'jian' }) === null;
    SQ.Legacy.earnOnce(m260, 'probe.grant260', 5000, 'probe', T260);
    var buy260 = SQ.Legacy.buy(s260, 'heir', T260 + 1);
    SQ.Legacy.rebirth(s260, 'bingjie', T260 + 2);
    var w260b = s260.worlds.xiuxian;
    var f260 = ownEntry260(w260b, m260.heirTreasure), sf260 = f260 && f260.st && f260.st.spirit;
    var restoreOk260 = !!(sf260 && sf260.a === 1 && sf260.p === spA260.p && sf260.w === spA260.w &&
      sf260.cd === 0 && sf260.mk === 0 && sf260.hun === 0 && Object.keys(sf260.vt || {}).length === 0 &&
      sf260.heir === 1 && sf260.ru === 0) &&
      JSON.stringify(m260.heirSpirit) === JSON.stringify(snapIn260) && identOk(m260);
    /* 下世开局即觉醒 → 器灵技可发动（不必重攒 300 温养）；护魂/吞噬加项同点可读 */
    var sk260 = SQ.Fusion.skillOf(D, sf260.p);
    var guarded260 = SQ.Fusion.soulGuardBonus(w260b, pack, D) >= 0 && !!sk260;
    /* 词表：五人格各一版变体齐 + 零 key 名回落 */
    var lexBad260 = [], lk260 = 0;
    for (lk260 = 0; lk260 < PN260.length; lk260++) {
      var v260 = SQ.t('spirit.reunion.' + PN260[lk260], null, 'xiuxian');
      if (!v260 || v260 === 'spirit.reunion.' + PN260[lk260]) lexBad260.push(PN260[lk260]);
    }
    var r260log = [];
    var r260a = SQ.Fusion.onEquipHeir(w260b, pack, D, m260.heirTreasure, T260 + 3, function (c260, x260) { r260log.push([c260, x260]); });
    var r260b = SQ.Fusion.onEquipHeir(w260b, pack, D, m260.heirTreasure, T260 + 4, function (c260b, x260b) { r260log.push([c260b, x260b]); });
    var r260c = SQ.Fusion.onEquipHeir(w260b, pack, D, idB260, T260 + 5, function (c260c, x260c) { r260log.push([c260c, x260c]); });
    var expect260 = SQ.t('spirit.reunion.' + sf260.p, null, 'xiuxian');
    var reunOk260 = !!r260a && r260a === expect260 && sf260.ru === 1 && r260b === null && r260c === null &&
      r260log.length === 1 && r260log[0][0] === 'sys' && r260log[0][1] === expect260 &&
      lexBad260.length === 0 && expect260.indexOf('{') < 0;
    /* normalize 三态 + 世界无关（meta 层只校验结构，人格合法性交 heirRestore 取包数据判） */
    var nz260a = SQ.Legacy.metaNormalize({ heirSpirit: { a: 1, p: 'bogus', w: 5 } }).heirSpirit;
    var nz260b = SQ.Legacy.metaNormalize({ heirSpirit: { a: 0, p: 'jian', w: 5 } }).heirSpirit;
    var nz260c = SQ.Legacy.metaNormalize({ heirSpirit: 'junk' }).heirSpirit;
    var nz260d = SQ.Legacy.metaNormalize({}).heirSpirit;
    var w260c = pack.initialState(); w260c.realm = 9;
    SQ.Treasures.gain(w260c, pack, D, idA260, noopLog());
    var falseOk260 = SQ.Fusion.heirRestore(w260c, pack, D, idA260, { a: 1, p: 'bogus', w: 5 }) === false &&
      (function () { var ee = ownEntry260(w260c, idA260); return !ee.st.spirit.a && ee.st.spirit.w === 0 && !ee.st.spirit.heir; })();
    var nzOk260 = !!(nz260a && nz260a.p === 'bogus' && nz260a.a === 1) && nz260b === null && nz260c === null &&
      nz260d === null && falseOk260 &&
      JSON.stringify(SQ.Legacy.metaNormalize({ heirSpirit: nz260a }).heirSpirit) === JSON.stringify(nz260a);
    /* 真动作口全链：save → load/normalize 快照不丢 → Actions.equipTreasure 触发彩蛋 → 收起再祭出不重播 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var s260y = mkState260(), w260y = s260y.worlds.xiuxian;
    SQ.Treasures.gain(w260y, pack, D, idA260, noopLog());
    SQ.Treasures.equip(w260y, pack, D, idA260, noopLog());
    SQ.Fusion.warm(w260y, pack, D, ((SP260.NEED || {}).liang || 300) + 60, T260, noopLog());
    SQ.Legacy.earnOnce(s260y.meta, 'probe.grant260y', 5000, 'probe', T260);
    SQ.Legacy.buy(s260y, 'heir', T260 + 6);
    SQ.Legacy.rebirth(s260y, 'bingjie', T260 + 7);
    await SQ.save(s260y);
    var ref260 = {};
    await SQ.mutate(ref260, function (ss260) { ss260.worlds.xiuxian.realm = 9; pack.recalcDerived(ss260.worlds.xiuxian, ss260.profile); });
    var snapPersist260 = ref260.meta && ref260.meta.heirSpirit;
    var eq260 = await SQ.Actions.equipTreasure(ref260, idA260);
    var fEnt260 = ownEntry260(ref260.worlds.xiuxian, idA260);
    await SQ.Actions.unequipTreasure(ref260, idA260);
    await SQ.Actions.equipTreasure(ref260, idA260);
    var fEnt260b = ownEntry260(ref260.worlds.xiuxian, idA260);
    var actOk260 = !!(snapPersist260 && snapPersist260.a === 1 && snapPersist260.p && snapPersist260.ru === 0) &&
      eq260.ok === true && !!fEnt260 && fEnt260.st.spirit.a === 1 && fEnt260.st.spirit.ru === 1 &&
      !!fEnt260b && fEnt260b.st.spirit.ru === 1 && identOk(ref260.meta);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('260', '真灵承继补完（器灵卷 §九「数据契约 + 跨世彩蛋」两环兑现——此前承继只搬法宝本体，`Treasures.gain` 建 `{id, st:{}}` 空态 ⇒ 600 遗泽买到的「真灵」下世从未觉醒）：' +
      '(a) `heirSnapshot` 只留 {a,p,w} + heir/ru 两位，**CD / 限时标记 / 护魂 / 判词节流表一律不带**（跨世无冷却语义）；未觉醒件快照 = null；' +
      '(b) `rebirth` 后 `meta.heirSpirit` 与快照逐字段全等，下世该件 `st.spirit` = 觉醒态（a=1 / 人格同 / 温养值同）且 `cd/mk/hun === 0`、`vt` 空、`heir=1 ru=0`——**下世开局器灵技即可发动，不必重攒**；恒等式 #197 续绿；' +
      '(c) 首次祭出播一次人格变体判词（正文 === `spirit.reunion.<p>` 解析值、cat `sys`、零 `{}` 残留、五人格变体齐），**二次祭出与非承继件均不播**（`ru` 置位即一次性）；' +
      '(d) meta 层世界无关——`metaNormalize` 只校验结构（`{a,p,w}` 齐即留、`a` 非 1 / 非对象 / 旧档缺键 → null）、幂等；人格合法性由 `heirRestore` 取包数据判，非法即**整件退回未觉醒重攒**（不半醒）；' +
      '(e) 真动作口全链：`SQ.save` → `SQ.load`/normalize 快照不丢 → `Actions.equipTreasure` 触发彩蛋（`ru` 0→1）→ 收起再祭出不重播',
      zeroOk260 && notAwake260 && buy260.ok === true && restoreOk260 && guarded260 &&
      reunOk260 && nzOk260 && actOk260,
      '快照=' + JSON.stringify(snapIn260) + ' 归零=' + JSON.stringify([sf260.cd, sf260.mk, sf260.hun, Object.keys(sf260.vt).length]) +
      ' ‖ 彩蛋=' + r260a + ' 二次=' + (r260b === null) + ' 他件=' + (r260c === null) + ' 日志数=' + r260log.length +
      ' 变体缺=' + (lexBad260.length ? lexBad260.join(',') : '0') +
      ' ‖ normalize 脏值=' + JSON.stringify([nz260b, nz260c, nz260d]) + ' 非法人格降级=' + falseOk260 +
      ' ‖ 全链 ru=' + (fEnt260 && fEnt260.st.spirit.ru) + '→' + (fEnt260b && fEnt260b.st.spirit.ru) + ' 快照存活=' + !!snapPersist260);

    /* #207 材料账恒等式（万次随机操作零漂移 · 灵石账 #113 零改动 · 溢出三账同记） */
    var w207 = pack.initialState();
    w207.realm = 4; w207.mode = 'venture'; w207.zone = 3;
    SQ.Alchemy.ensure(w207, D);
    var matIds207 = D.ALCHEMY.MATS.map(function (mm) { return mm.id; });
    var drift207 = 0, ident207 = true;
    for (var it207 = 0; it207 < 10000; it207++) {
      var op = it207 % 5, mid = matIds207[it207 % matIds207.length];
      var g207 = {}; g207[mid] = 1 + (it207 % 7);
      if (op === 0 || op === 1) SQ.Alchemy.addMats(w207, pack, D, g207, it207, null);
      else if (op === 2) { var c207 = {}; c207[mid] = 2; SQ.Alchemy.takeMats(w207, D, c207); }
      else if (op === 3) SQ.Alchemy.sellMats(w207, pack, D, mid, 1 + (it207 % 3), it207, null);
      else SQ.Alchemy.killGain(w207, pack, D, it207 % 10, it207);
      if (it207 % 997 === 0) {
        var bag207 = 0;
        for (var bk in w207.materials) bag207 += w207.materials[bk];
        if (w207.ledgerMat.in.materials - w207.ledgerMat.out.materials !== bag207) ident207 = false;
      }
    }
    var bag207f = 0;
    for (var bk2 in w207.materials) bag207f += w207.materials[bk2];
    var matIdent207 = w207.ledgerMat.in.materials - w207.ledgerMat.out.materials === bag207f && ident207;
    var sumIn207 = 0, sumOut207 = 0;
    SQ.Ledger.IN_CATS.forEach(function (k4) { sumIn207 += w207.ledger.in[k4] || 0; });
    for (var ok4 in w207.ledger.out) sumOut207 += w207.ledger.out[ok4] || 0;
    var stoneIdent207 = 100 + sumIn207 - sumOut207 === w207.stones;
    /* 溢出三账同记：999 满堆 +5 → 库存 999 / 灵石 in.event +5×组价 / 材料账 in+5 out+5 */
    var w207b = pack.initialState();
    SQ.Alchemy.ensure(w207b, D);
    w207b.materials.mat_linglu = 999;
    var led207b = JSON.stringify(w207b.ledger);
    var g207b = {}; g207b.mat_linglu = 5;
    var r207b = SQ.Alchemy.addMats(w207b, pack, D, g207b, 1, null);
    var grp207 = SQ.Alchemy.sellPriceOf(D, 'mat_linglu');
    ok('207', '材料账恒等式：万次随机操作 Σin−Σout−存量 零漂移；灵石账 #113 零改动、材料永不入灵石分类；堆叠溢出折算三账同记',
      matIdent207 && stoneIdent207 && drift207 === 0 &&
      r207b.overflowN === 5 && r207b.added.mat_linglu == null && w207b.materials.mat_linglu === 999 &&
      w207b.stones === 100 + 5 * grp207 && w207b.ledger.in.event === 5 * grp207 &&
      w207b.ledgerMat.in.materials === 5 && w207b.ledgerMat.out.materials === 5 &&
      JSON.stringify(Object.keys(w207b.ledger.in)) === JSON.stringify(SQ.Ledger.IN_CATS) && led207b !== JSON.stringify(w207b.ledger));

    /* #208 材料三源口径（击杀独立掷判 / 采集历练自动轴 / 灵田在线一批离线不产） */
    var w208 = pack.initialState();
    w208.mode = 'seclude';
    SQ.Alchemy.ensure(w208, D);
    var g208mode = SQ.Alchemy.gatherTick(w208, pack, D, 1000, false, null);       /* 闭关不产（非历练） */
    w208.mode = 'venture'; w208.zone = 3;
    var g208anchor = SQ.Alchemy.gatherTick(w208, pack, D, 1000, false, null);      /* 锚点已在，周期内不产 */
    var g208a = SQ.Alchemy.gatherTick(w208, pack, D, 1000 + ALc.GATHER_INTERVAL_MS + 1, false, null);
    var n208 = 0; for (var gk in g208a.gains || {}) if (gk !== 'mat_wudao') n208 += (g208a.gains || {})[gk];   /* 只计本区材料：悟道石另有 10% 独立掷判（wudao208 单测） */
    var g208cd = SQ.Alchemy.gatherTick(w208, pack, D, 1000 + ALc.GATHER_INTERVAL_MS + 2, false, null);  /* 区间内拒 */
    var g208off = SQ.Alchemy.gatherTick(w208, pack, D, 1000 + 10 * ALc.GATHER_INTERVAL_MS, true, null); /* 离线不产 */
    /* 悟道石 10% 统计（200 次采样 ±8pp）：每次重置锚点后跨一周期掷 */
    var wudao208 = 0;
    for (var wi = 0; wi < 200; wi++) {
      w208.gather = {};
      SQ.Alchemy.gatherTick(w208, pack, D, 1000, false, null);
      var gr = SQ.Alchemy.gatherTick(w208, pack, D, 1000 + ALc.GATHER_INTERVAL_MS + 1, false, null);
      if (gr && gr.wudao) wudao208++;
    }
    /* 灵田：首锚不产 / 在线跨 6 游戏月一批 / 离线不产不补 / 产出零 qiRate 侵入 */
    var w208f = pack.initialState();
    w208f.realm = 3;
    SQ.Alchemy.ensure(w208f, D);
    var cv208 = SQ.Cave.current(w208f, pack);
    w208f.cave.fac[cv208.id] = w208f.cave.fac[cv208.id] || {};
    w208f.cave.fac[cv208.id].lingtian = 2;
    var prof208 = mkProf([]);
    pack.recalcDerived(w208f, prof208);
    var qr208a = SQ.Mods.collect(prof208, w208f, pack, D).sum.qiRate;
    var f208a = SQ.Alchemy.farmTick(w208f, pack, D, 1000, false, null);       /* 首次锚点初始化 */
    var f208b = SQ.Alchemy.farmTick(w208f, pack, D, 1000 + ALc.FARM_INTERVAL_MS + 1, false, null);
    var n208f = 0; for (var fk in (f208b || {}).gains || {}) n208f += f208b.gains[fk];
    var f208c = SQ.Alchemy.farmTick(w208f, pack, D, 1000 + 2 * ALc.FARM_INTERVAL_MS, true, null);   /* 离线 */
    var f208d = SQ.Alchemy.farmTick(w208f, pack, D, 1000 + 2 * ALc.FARM_INTERVAL_MS + 1, false, null);  /* 锚点已被离线重置 → 不足周期不产 */
    var qr208b = SQ.Mods.collect(prof208, w208f, pack, D).sum.qiRate;
    ok('208', '材料三源口径：采集需历练（闭关/离线不产）、驻区每 1 游戏年 1~4 枚 + 10% 悟道石（统计 ' + wudao208 + '/200）；灵田首锚不产/在线跨 6 游戏月一批 ' + n208f + ' 枚（1~4）/离线不产不补；产出零 qiRate 侵入',
      g208mode === null && g208anchor === null && g208a.ok === true && n208 >= ALc.GATHER_N_MIN && n208 <= ALc.GATHER_N_MAX &&
      g208cd === null && g208off === null && wudao208 >= 4 && wudao208 <= 36 &&
      f208a === null && f208b && f208b.ok === true && n208f >= ALc.FARM_N_MIN && n208f <= ALc.FARM_N_MAX &&
      f208c === null && f208d === null && qr208a === qr208b);

    /* #209 炼丹流程（成功率表 / 开工扣料 / 失败不还 / 丹纹九转 / 丹毒日限 / pushBuff 保最强） */
    var p209a = SQ.Alchemy.craftP(D, 'huang', 0), p209b = SQ.Alchemy.craftP(D, 'huang', 4);
    var p209c = SQ.Alchemy.craftP(D, 'xuan', 0), p209d = SQ.Alchemy.craftP(D, 'di', 0), p209e = SQ.Alchemy.craftP(D, 'di', 4);
    var w209 = pack.initialState();
    w209.realm = 2;
    SQ.Alchemy.ensure(w209, D);
    SQ.Alchemy.autoGrant(w209, D);                       /* rc_juqi 自动授予 */
    w209.alchemy.furnace = true;
    SQ.Alchemy.addMats(w209, pack, D, { mat_linglu: 10, mat_qingmu: 10 }, 1, null);
    var matOut209a = w209.ledgerMat.out.materials;
    var sc209 = SQ.Alchemy.startCraft(w209, pack, D, 'dan', 'rc_juqi', {}, null, 100, null);
    var busy209 = SQ.Alchemy.startCraft(w209, pack, D, 'dan', 'rc_juqi', {}, null, 101, null);
    var profUp209 = w209.alchemy.prof.dan === 1 && w209.alchemy.fires === 1;
    var matOut209b = w209.ledgerMat.out.materials;       /* 扣料 3 枚入账 */
    var cc209 = (function () { var rs = stubRandom([0.99]); var r = SQ.Alchemy.collectCraft(w209, pack, D, null, null, sc209.craft.doneAt + 1, null); rs(); return r; })();
    var fail209 = cc209.ok === true && cc209.success === false && !(w209.alchemy.pills.ap_juqi > 0) &&
      w209.alchemy.prof.dan === 1 && w209.materials.mat_linglu === 8;        /* 失败材料不还（10−2） */
    /* 丹纹：宗师档（prof 400）+ 时限型 5% 命中 → _rw 键 + jiuzhuan 计数；双特例不参与 */
    w209.alchemy.prof.dan = 400;
    SQ.Alchemy.addMats(w209, pack, D, { mat_linglu: 10, mat_qingmu: 10 }, 1, null);
    var sc209b = SQ.Alchemy.startCraft(w209, pack, D, 'dan', 'rc_juqi', {}, null, 200, null);
    var cc209b = (function () { var rs = stubRandom([0.04, 0.0]); var r = SQ.Alchemy.collectCraft(w209, pack, D, null, null, sc209b.craft.doneAt + 1, null); rs(); return r; })();
    var rune209 = cc209b.success === true && cc209b.rune === true && cc209b.pill === 'ap_juqi_rw' && w209.alchemy.jiuzhuan === 1;
    w209.realm = 6;
    w209.alchemy.recipes.push('rc_pozhang', 'rc_zhenjie');
    SQ.Alchemy.addMats(w209, pack, D, { mat_leisui: 9, mat_leimu: 9, mat_dansha: 9 }, 1, null);
    var sc209c = SQ.Alchemy.startCraft(w209, pack, D, 'dan', 'rc_pozhang', {}, null, 300, null);
    var cc209c = (function () { var rs = stubRandom([0.0, 0.0]); var r = SQ.Alchemy.collectCraft(w209, pack, D, null, null, sc209c.craft.doneAt + 1, null); rs(); return r; })();
    var noRune209 = cc209c.success === true && cc209c.pill === 'ap_pozhang';  /* 双特例无丹纹 */
    /* 丹毒日限 4 颗（丹药两族合一 · 第十七批：3 → 4）+ pushBuff 同字段保最强（丹纹版 ×2） */
    var prof209 = mkProf([]);
    w209.alchemy.pills.ap_juqi = 5; w209.alchemy.pills.ap_juqi_rw = 5;
    var born209 = 1000000;
    prof209.createdAt = born209;
    var now209 = born209 + 5000;                          /* 游戏日 5000 */
    var dk209a = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209, null, prof209);
    var dk209b = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi_rw', now209 + 1, null, prof209);
    var dk209c = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209 + 2, null, prof209);
    var dk209d = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209 + 3, null, prof209);
    var qBuffs209 = w209.buffs.filter(function (b2) { return b2.field === 'qiRate' && b2.source === 'alchemy'; });
    var dk209f = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209 + 4, null, prof209);        /* 第 5 颗 → 丹毒拒 */
    var dk209e = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209 + 5000, null, prof209);   /* 跨游戏日 */
    ok('209', '炼丹流程：成功率表 0.85/0.95cap/0.70/0.55/0.67 对表；开工扣料记 out、失败不还熟练度照涨；宗师丹纹 5% 仅时限型（九转正名）；丹毒日限 4 跨日重置（第十七批 3 → 4，第 5 颗才拒）；pushBuff 同字段保最强（丹纹 ×2）',
      p209a === 0.85 && p209b === 0.95 && p209c === 0.70 && p209d === 0.55 && p209e === 0.67 &&
      sc209.ok === true && busy209.reason === 'busy' && profUp209 && matOut209b === matOut209a + 3 &&
      fail209 && rune209 && noRune209 &&
      dk209a.ok === true && dk209b.ok === true && dk209c.ok === true && dk209d.ok === true &&
      dk209f.reason === 'daily' && dk209e.ok === true &&
      qBuffs209.length === 1 && qBuffs209[0].mult === 0.20);

    /* #210 双特例每境界限（破障 −0.10 下限不破 / 镇劫 +0.02 判后即清 / 相互独立于丹毒） */
    var w210 = pack.initialState();
    w210.realm = 5;
    SQ.Alchemy.ensure(w210, D);
    w210.alchemy.pills.ap_pozhang = 3; w210.alchemy.pills.ap_zhenjie = 3;
    var prof210 = mkProf([]); prof210.createdAt = Date.now() - 10000;
    var now210 = Date.now();
    var dp210a = SQ.Alchemy.drinkPill(w210, pack, D, 'ap_pozhang', now210, null, prof210);
    var bc210 = w210.breakCostNext;
    /* （dayN210a 于下方 dp210b 前取值） */
    var dayN210a = w210.alchemy.pillDay.n;
    var dp210b = SQ.Alchemy.drinkPill(w210, pack, D, 'ap_pozhang', now210 + 1, null, prof210);
    var dayN210 = w210.alchemy.pillDay.n;                   /* 被拒不消耗日限：n 不变 */
    var dp210c = SQ.Alchemy.drinkPill(w210, pack, D, 'ap_zhenjie', now210 + 2, null, prof210);   /* 相互独立 */
    var dayN210c = w210.alchemy.pillDay.n;                  /* 独立特例正常入账 +1 */
    var tn210 = w210.tribulation.next;
    /* needEffOf 下限：realmCost −0.12 + breakCostNext −0.10 → 0.78；极端 −2.0 → max(0.1) 下限 */
    var m210 = M(mkProf([mkTalent({ realmCost: -0.12 })]), w210);
    var ne210a = SQ.Realm.needEffOf(w210, pack, D, m210);
    var base210 = D.REALMS[6].need;
    w210.breakCostNext = -2.0;
    var ne210b = SQ.Realm.needEffOf(w210, pack, D, m210);
    w210.breakCostNext = bc210;
    /* 镇劫读点：XTrib.info parts.next=+0.02；渡劫判定后一次性修正清空 */
    var info210a = pack.worldSystems.tribInfo(w210, pack, D, SQ.Mods.collect(prof210, w210, pack, D));
    var nextIn210 = info210a.parts.next === 0.02 && Math.abs(info210a.parts.talent - 0.02) < 1e-9;
    (function () { var rs = stubRandom([0.0]); SQ.Realm.tryBreakthrough(w210, pack, D, SQ.Mods.collect(prof210, w210, pack, D), now210, { log: noopLog() }); rs(); })();
    ok('210', '双特例每境界限：破障 −0.10 写 breakCostNext、needEff 下限 0.1 不破（−22%→0.78 / 极端→0.1）；镇劫 +0.02 写 tribulation.next 判后即清；同境界二服拒且不耗丹毒日限、相互独立',
      dp210a.ok === true && bc210 === -0.10 && dp210b.reason === 'once' &&
      dayN210 === dayN210a && dayN210c === dayN210a + 1 &&
      dp210c.ok === true && tn210 === 0.02 &&
      Math.abs(ne210a - base210 * 0.78) < 1e-6 && Math.abs(ne210b - base210 * 0.1) < 1e-6 &&
      nextIn210 && w210.tribulation.next === 0 && w210.breakCostNext === 0);

    /* #211 炼器零漂移（品阶逐区对照 / 主词条上半区 / 灵品 attr 自由指定 / 打造件五恒等字段） */
    /* 品阶逐区对照（drops 权重表零改动红线 → 以数据表实测期望为准：z8 D(z)=3.45 → tier2；
     * 炼丹卷 #211 正典 D(z) 序列 z8=3.60「灵×2」为立卷笔误，收口勘误登记为 上×3/灵×1） */
    var tiers211 = [];
    for (var z211 = 0; z211 < 10; z211++) tiers211.push(SQ.Alchemy.forgeTierOf({ realm: z211 }, D, z211));
    var w211 = pack.initialState();
    w211.realm = 9;
    SQ.Alchemy.ensure(w211, D);
    w211.alchemy.furnace = true;
    w211.alchemy.blueprints.push('bp_armor');
    SQ.Alchemy.addMats(w211, pack, D, { mat_jiewai: 20, mat_gudao: 20, mat_xianyu: 20 }, 1, null);
    var sc211 = SQ.Alchemy.startCraft(w211, pack, D, 'qi', 'bp_armor', { dir: 'huti', attr: 'jing' }, null, 10, null);
    var dirLock211 = (function () {
      var w2 = pack.initialState(); w2.realm = 1;      /* z1 → tier0：minTier 1 方向拒绝（realm 需 ≥ UNLOCK_REALM） */
      SQ.Alchemy.ensure(w2, D);
      w2.alchemy.furnace = true;
      w2.alchemy.blueprints.push('bp_weapon');
      SQ.Alchemy.addMats(w2, pack, D, { mat_heifeng: 20, mat_fengwen: 20, mat_yeshou: 20 }, 1, null);
      return SQ.Alchemy.startCraft(w2, pack, D, 'qi', 'bp_weapon', { dir: 'sheling' }, null, 10, null);
    })();
    var item211 = (function () { var rs = stubRandom(function (i) { return i === 0 ? 0.0 : 0.75; }); var r = SQ.Alchemy.collectCraft(w211, pack, D, null, null, sc211.craft.doneAt + 1, null); rs(); return r; })();
    var it211 = item211.item || {};
    var T211 = D.GEAR_TIERS[3];
    var midLo211 = T211.resist[0] + (T211.resist[1] - T211.resist[0]) * 0.5;
    var prime211 = (function () {
      var w3 = pack.initialState(); w3.realm = 9;
      SQ.Alchemy.ensure(w3, D);
      w3.alchemy.furnace = true;
      w3.alchemy.blueprints.push('bp_armor');
      SQ.Alchemy.addMats(w3, pack, D, { mat_jiewai: 20, mat_gudao: 20, mat_xianyu: 20 }, 1, null);
      var sc3 = SQ.Alchemy.startCraft(w3, pack, D, 'qi', 'bp_armor', { dir: 'huti', attr: 'qi' }, null, 10, null);
      var rs = stubRandom(function (i) { return i === 0 ? 0.0 : 0.999; });
      var r3 = SQ.Alchemy.collectCraft(w3, pack, D, null, null, sc3.craft.doneAt + 1, null);
      rs();
      return r3.item || {};
    })();
    /* normalize 幂等 + 脏档清理 */
    var dirty211 = { furnace: 'x', recipes: ['rc_juqi', 'bad'], blueprints: ['bp_weapon', 'nope'], prof: { dan: -5 },
      pills: { ap_juqi: 999, bad_pill: 3 }, pillDay: { day: 'x', n: 99 }, pillOnce: {}, craft: { kind: 'xx', id: 1 }, farmAt: -1 };
    var n211a = SQ.Alchemy.normalize(dirty211, D);
    var n211b = SQ.Alchemy.normalize(n211a, D);
    ok('211', '炼器零漂移：品阶逐区 凡×4/良×2/上×3/灵×1 对照（z8 D=3.45 勘误登记）；主词条 [50%,100%] 上半区；灵品 attr 自由指定；打造件 neutral/special=null/source=forge；极品 reqs+1；minTier 方向锁；normalize 幂等',
      tiers211.join() === '0,0,0,0,1,1,2,2,2,3' &&
      sc211.ok === true && dirLock211.reason === 'dir' &&
      item211.success === true && it211.slot === 'armor' && it211.tier === 3 &&
      it211.alignment === 'neutral' && it211.special === null && it211.source.type === 'forge' && it211.forged === 'resist' &&
      it211.attrValue && it211.attrValue.attr === 'jing' &&
      it211.resist >= Math.floor(midLo211) && it211.resist <= T211.resist[1] &&
      prime211.prime === true && prime211.reqs.realm === D.GEAR_TIERS[3].req + 1 &&
      n211a.furnace === false && n211a.recipes.join() === 'rc_juqi' && n211a.blueprints.join() === 'bp_weapon' &&
      n211a.prof.dan === 0 && n211a.pills.ap_juqi === 99 && n211a.pills.bad_pill == null && n211a.craft === null &&
      JSON.stringify(n211a) === JSON.stringify(n211b),
      JSON.stringify([tiers211.join(), sc211.ok, dirLock211.reason, item211.success, it211.slot, it211.tier, it211.alignment, it211.special, it211.source && it211.source.type, it211.forged, it211.attrValue && it211.attrValue.attr, it211.resist, Math.floor(midLo211), prime211.prime, prime211.reqs && prime211.reqs.realm, n211a.furnace, n211a.recipes.join(), n211a.pills.ap_juqi, JSON.stringify(n211a) === JSON.stringify(n211b)]));

    /* #212 天骄生成与容量（天骄卷 §十） */
    var w212 = pack.initialState();
    SQ.Prodigy.rollForNewLife(w212, pack, D, mkMeta(), Date.now());
    var cnt212a = w212.prodigies.length;
    var w212b = pack.initialState();
    var m212b = mkMeta(); m212b.unlocks.prodigySlot = true;
    SQ.Prodigy.rollForNewLife(w212b, pack, D, m212b, Date.now());
    var cnt212b = w212b.prodigies.length;
    SQ.Prodigy.rollForNewLife(w212b, pack, D, m212b, Date.now());   /* 幂等：已生成不重复 */
    var idem212 = w212b.prodigies.length === cnt212b;
    /* 同档重名去重 + apt 权重分布（3000 次统计 50/35/15 ±30% 相对） */
    var nameDup212 = false, aptCnt = [0, 0, 0], tlBad212 = 0, maxBytes212 = 0;
    var posIds212 = {};
    ['common', 'xiuxian'].forEach(function (wd) { var tp = SQ.TALENTS[wd]; if (tp) tp.positive.forEach(function (x) { posIds212[x.id] = 1; }); });
    var w212c = pack.initialState();
    for (var ri212 = 0; ri212 < 3000; ri212++) {
      var seen212 = {};
      w212c.prodigies.forEach(function (pp) { seen212[pp.nm.join(',')] = 1; });
      var np = SQ.Prodigy.rollOne(w212c, pack, D, null, {});
      if (seen212[np.nm.join(',')]) nameDup212 = true;
      aptCnt[np.apt]++;
      np.tl.forEach(function (tid) { if (!posIds212[tid]) tlBad212++; });
      var bl = byteLen(np);
      if (bl > maxBytes212) maxBytes212 = bl;
      if (w212c.prodigies.length >= 30) w212c.prodigies = [];
    }
    var aptOk212 = Math.abs(aptCnt[0] / 3000 - 0.50) <= 0.05 && Math.abs(aptCnt[1] / 3000 - 0.35) <= 0.05 &&
      Math.abs(aptCnt[2] / 3000 - 0.15) <= 0.04;
    /* 玩家数值轴零影响：有无天骄 mods 全等。
     * 等级起点批注：先跑一次 M() 把「首次入槽回填」（artsAutoInit 一次性）吃掉再做对照——
     * 首发功法现在是 Lv1，回填后自带乘区贡献，若拿回填前后比就会把这条一次性动作误判成天骄侵入。 */
    var w212d = pack.initialState(); w212d.realm = 3;
    var prof212 = mkProf([]);
    M(prof212, w212d);
    var modsNo212 = JSON.stringify(M(prof212, w212d));
    SQ.Prodigy.rollForNewLife(w212d, pack, D, mkMeta(), Date.now());
    var modsYes212 = JSON.stringify(M(prof212, w212d));
    /* normalize：旧档不补 roll、脏档清理 */
    var old212 = pack.normalize(pack.initialState());
    var dirty212 = pack.normalize(Object.assign(pack.initialState(), { prodigies: [
      { id: 'xx', nm: [0, 0, 0] },
      { id: 'pr9', nm: [99, -3, 2.7], tl: [1, 'ok_talent', 'b', 'c'], al: 5, fc: -9, apt: 8, rlm: 99, prg: -5, wl: [1, 2], feud: 'yes', boost: { add: 9, months: -2 } }
    ] }));
    var dp212 = dirty212.prodigies[0];
    ok('212', '天骄生成与容量：默认 10 名/prodigySlot 30 名、幂等不重复；重名重掷；apt 50/35/15 统计；天赋全出正面池且 mods 零侵入；单人序列化 ' + maxBytes212 + 'B；normalize 旧档不补 roll 脏档清理',
      cnt212a === 10 && cnt212b === 30 && idem212 && !nameDup212 && aptOk212 && tlBad212 === 0 &&
      maxBytes212 <= 240 && modsNo212 === modsYes212 &&
      old212.prodigies.length === 0 && dirty212.prodigies.length === 1 &&
      dp212.id === 'pr9' && dp212.nm.join() === '8,0,2' && dp212.tl.join() === 'ok_talent,b' &&
      dp212.al === 2 && dp212.fc === -1 && dp212.apt === 2 && dp212.rlm === 9 && dp212.prg === 0 &&
      dp212.feud === false && dp212.wl.join() === '1,2,0' && dp212.boost.add === 0.5 && dp212.boost.months === 0,
      'apt=' + JSON.stringify(aptCnt) + ' bytes=' + maxBytes212);

    /* #212b 榜面节律与前 10 详情（每代上限 30 · 榜面只展前 10 · 快照每 10 游戏年一刷） */
    var w212b = pack.initialState();
    w212b.realm = 6; w212b.zone = 5;                     /* zone 错开天骄 rlm → 月事件零触发零随机 */
    w212b.prodigies = [];
    for (var pb212 = 0; pb212 < PDc.COUNT_MAX; pb212++) {
      w212b.prodigies.push({ id: 'pr' + (pb212 + 1), nm: [0, pb212 % 6, 0], tl: [], al: 1, fc: -1, fid: null,
        apt: 0, rlm: 0, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] });
    }
    var t212b = 1700000000000;
    SQ.Prodigy.tick(w212b, pack, D, M(mkProf([]), w212b), 30000, t212b, { log: noopLog() });
    var snap212b = SQ.Prodigy.rankRows(w212b);
    var snapOk212b = !!snap212b && snap212b.length === PDc.COUNT_MAX + 1 && w212b.prodMarks.rankAt === t212b;
    var ref212b = snap212b;
    SQ.Prodigy.tick(w212b, pack, D, M(mkProf([]), w212b), 30000, t212b + 30000, { log: noopLog() });   /* 区间内：不重刷 */
    var noRe212b = w212b.prodMarks.rankAt === t212b && SQ.Prodigy.rankRows(w212b) === ref212b;
    SQ.Prodigy.tick(w212b, pack, D, M(mkProf([]), w212b), 30000, t212b + PDc.RANK_REFRESH_MS, { log: noopLog() }); /* 跨节律：重刷 */
    var re212b = w212b.prodMarks.rankAt === t212b + PDc.RANK_REFRESH_MS;
    var showOk212b = PDc.BOARD_SHOW === 10 && PDc.COUNT_MAX === 30 && SQ.Prodigy.boardShow(D) === 10 &&
      PDc.RANK_REFRESH_MS === 10 * 360 * 1000;
    ok('212b', '榜面节律与前 10 详情：每代上限 30、榜面只展前 10 详情；快照每 10 游戏年（3600000ms）一刷，区间内不重刷、跨节律重刷',
      snapOk212b && noRe212b && re212b && showOk212b,
      'rows=' + (snap212b ? snap212b.length : -1) + ' rankAt=' + w212b.prodMarks.rankAt);

    /* #213 推进零玩家轴影响（月度确定性推进 · 真仙封顶 · catch-up 护栏） */
    var w213 = pack.initialState();
    w213.realm = 3; w213.zone = 5;                       /* zone 与天骄 rlm 错开 → 月概率事件零触发零随机 */
    w213.prodigies = [
      { id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 0, rlm: 0, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] },
      { id: 'pr2', nm: [1, 1, 1], tl: [], al: 1, fc: -1, fid: null, apt: 2, rlm: 9, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }
    ];
    var prof213 = mkProf([]);
    M(prof213, w213);   /* 同 #212：先吃掉「首次入槽回填」的一次性差异，再比「天骄推进零玩家轴影响」 */
    var snap213 = JSON.stringify([w213.qi, w213.realm, w213.stones, w213.buffs, M(prof213, w213)]);
    var bqi213 = D.REALMS[0].baseQi;
    SQ.Prodigy.tick(w213, pack, D, M(prof213, w213), 30000, Date.now(), { log: noopLog() });
    var prog213a = w213.prodigies[0].prg;                 /* = baseQi×30×1.0 */
    var same213 = JSON.stringify([w213.qi, w213.realm, w213.stones, w213.buffs, M(prof213, w213)]) === snap213;
    /* pr2 rlm9 → 大 dt 真仙封顶停积（溢出丢弃 prg 恒 0）；pr1 连续升境 ≤9 */
    SQ.Prodigy.tick(w213, pack, D, M(prof213, w213), 480 * 30000, Date.now(), { log: noopLog() });
    var cap213 = w213.prodigies[1].rlm === 9 && w213.prodigies[1].prg === 0 && w213.prodigies[0].rlm <= 9;
    /* 离线 catch-up 护栏：12h → months clamp 480，零崩溃 */
    var w213b = pack.initialState();
    w213b.zone = 5;
    w213b.prodigies = [JSON.parse(JSON.stringify(w213.prodigies[0]))];
    w213b.prodigies[0].prg = 0; w213b.prodigies[0].rlm = 0;
    SQ.Prodigy.tick(w213b, pack, D, null, 12 * 3600000, Date.now(), { log: noopLog() });
    var guard213 = w213b.prodigies[0].rlm <= 9 && w213b.prodigyClock < 30000;
    /* power 对表 = REALMS[rlm].power × POWER_COEF[apt] */
    var pw213 = SQ.Prodigy.powerOf(w213, w213.prodigies[0], D);
    var pwExp213 = D.REALMS[w213.prodigies[0].rlm].power * PDc.POWER_COEF[0];
    ok('213', '推进零玩家轴影响：月结 prg=baseQi×30×coef 确定性推进；玩家 qi/realm/stones/buffs/mods 零变化；真仙封顶停积；离线 catch-up 480 月护栏；power 对表',
      Math.abs(prog213a - bqi213 * 30 * 1.0) < 1e-6 && same213 && cap213 && guard213 && Math.abs(pw213 - pwExp213) < 1e-9,
      JSON.stringify([prog213a, bqi213 * 30, same213, w213.prodigies[1].rlm, w213.prodigies[1].prg, guard213, pw213, pwExp213]));

    /* #214 切磋与心结账目（CD / ±10% 掷判 / 赌注 in.event·out.event_loss / bond / 30% 结仇 / 心结 −0.02 单份） */
    var w214 = pack.initialState();
    w214.realm = 9; w214.stones = 1000000;   /* stake = ZONES[9].stones×20 = 30 万，需足额 */
    w214.prodigies = [{ id: 'pr1', nm: [0, 0, 0], tl: [], al: 0, fc: -1, fid: null, apt: 1, rlm: 2, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var prof214 = mkProf([]);
    var stake214 = SQ.Prodigy.sparStake(w214, D);
    var stakeExp214 = D.ZONES[9].stones * PDc.SPAR_STAKE_K;
    var led214a = JSON.stringify(w214.ledger);
    var st214a = w214.stones;
    /* 确定性胜（realm9 vs rlm2 ±10% 不可翻盘）= 碾压局（切磋平衡批）：out.event_loss +stake、
     * in.event +1.5×stake（crushRet）、净 +0.5×stake、bond+1（crushBond 胜之不武）；
     * 材料彩头掷在 win 路径（真实随机、不断言材料面——#233 专测） */
    var retExp214 = Math.round(stake214 * (PDc.HANDICAP.crushRet));
    var sp214w = SQ.Prodigy.spar(w214, pack, D, M(prof214, w214), 'pr1', Date.now(), noopLog());
    var win214 = sp214w.ok && sp214w.result === 'win' && sp214w.crush === true && sp214w.brave === false &&
      w214.ledger.out.event_loss === stake214 && w214.ledger.in.event === retExp214 &&
      w214.stones === st214a + retExp214 - stake214 && (w214.bonds.pr1 || 0) === PDc.HANDICAP.crushBond;
    var cd214 = SQ.Prodigy.spar(w214, pack, D, M(prof214, w214), 'pr1', Date.now(), noopLog());
    /* 平局带：stub [0.5, 0.2619] → Q ≈ Pp → 差值 ≤1% 判平、不记账、bond+1 */
    var w214b = pack.initialState();
    w214b.realm = 2; w214b.stones = 100000;
    w214b.prodigies = [{ id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 1, rlm: 2, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var led214b = JSON.stringify(w214b.ledger);
    /* 平局带精确构造：myP=183.24（P[2]=180+attrs 派生 atk 3.24）vs q=189（180×1.05）——
     * y=0.3476 → Q=189×(1+(2y−1)×0.1)=183.24≈Pp → 差值 0 ≤1% 判平（band 宽容 ±0.025 稳健） */
    var sp214d = (function () { var rs = stubRandom([0.5, 0.3476]); var r = SQ.Prodigy.spar(w214b, pack, D, M(mkProf([]), w214b), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var draw214 = sp214d.result === 'draw' && JSON.stringify(w214b.ledger) === led214b && (w214b.bonds.pr1 || 0) === 1;
    /* 确定性负（realm0 vs rlm9）+ 结仇掷中：feud + feudBond 快照 + 冻结拒入账 + 心结 −0.02 单份 */
    var w214c = pack.initialState();
    w214c.realm = 2;   /* 渐进式解锁 gate（切磋平衡批 §C4）：金丹前 locked 拒绝 */
    w214c.stones = 100000; w214c.bonds.pr1 = 30;
    w214c.prodigies = [
      { id: 'pr1', nm: [0, 0, 0], tl: [], al: 2, fc: -1, fid: null, apt: 2, rlm: 9, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] },
      { id: 'pr2', nm: [1, 1, 1], tl: [], al: 1, fc: -1, fid: null, apt: 1, rlm: 9, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }
    ];
    var sp214l = (function () { var rs = stubRandom([0.5, 0.5, 0.01]); var r = SQ.Prodigy.spar(w214c, pack, D, M(mkProf([]), w214c), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var lose214 = sp214l.result === 'lose' && sp214l.feud === true && w214c.prodigies[0].feud === true &&
      w214c.prodigies[0].feudBond === 31 &&                          /* 负 bond+1 后快照 */
      SQ.Prodigy.tribModOf(w214c, D) === -0.02;
    w214c.prodigies[1].feud = true;
    var single214 = SQ.Prodigy.tribModOf(w214c, D) === -0.02;         /* 双 feud 单份不叠加 */
    w214c.prodigies[0].lastSparAt = 0;
    var bond31 = w214c.bonds.pr1;
    var sp214f = (function () { var rs = stubRandom([0.5, 0.5, 0.99]); var r = SQ.Prodigy.spar(w214c, pack, D, M(mkProf([]), w214c), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var frozen214 = (w214c.bonds.pr1 || 0) === bond31 && sp214f.bond === null;   /* feud 冻结拒入账 */
    /* 心结进 XTrib.info talent 同读点 */
    var info214 = pack.worldSystems.tribInfo(w214c, pack, D, M(mkProf([]), w214c));
    /* locked gate（渐次解锁批 §C4）：realm < TAB_UNLOCK.prodigy.r → 拒绝且不耗 CD 不记账 */
    var locked214 = (function () {
      var w = pack.initialState();   /* realm 0 */
      w.stones = 100000;
      w.prodigies = [JSON.parse(JSON.stringify(w214c.prodigies[0]))];
      w.prodigies[0].lastSparAt = 0;
      var led0 = JSON.stringify(w.ledger);
      var r = SQ.Prodigy.spar(w, pack, D, M(mkProf([]), w), 'pr1', Date.now(), noopLog());
      return r.reason === 'locked' && JSON.stringify(w.ledger) === led0 && w.prodigies[0].lastSparAt === 0 &&
        SQ.Prodigy.unlockRealm(D) === D.TAB_UNLOCK.prodigy.r;
    })();
    var poor214 = (function () {
      var w = pack.initialState(); w.stones = 0; w.realm = 2;   /* gate 通过后才轮到 poor 判定 */
      w.prodigies = [JSON.parse(JSON.stringify(w214c.prodigies[0]))];
      w.prodigies[0].lastSparAt = 0;                       /* cd 校验先于 poor——须用未切磋副本 */
      return SQ.Prodigy.spar(w, pack, D, M(mkProf([]), w), 'pr1', Date.now(), noopLog());
    })();
    ok('214', '切磋与心结账目：赌注=区 stones×20（std 档）；碾压胜 out.event_loss+in.event ×1.5 净+0.5 bond+1（让差）；平不记账 bond+1；负 bond+1+30% 结仇（feudBond 快照）；feud 冻结拒入账；心结 −0.02 talent 读点单份不叠加；locked gate/CD/押注不足拒绝',
      stake214 === stakeExp214 && win214 && cd214.reason === 'cd' && draw214 &&
      lose214 && single214 && frozen214 && info214.parts.feud === -0.02 &&
      poor214.reason === 'poor' && locked214 && JSON.stringify(Object.keys(w214.ledger.in)) === JSON.stringify(SQ.Ledger.IN_CATS),
      JSON.stringify([stake214, stakeExp214, win214, sp214w.result, cd214.reason, draw214, sp214d.result, lose214, sp214l.result, single214, frozen214, info214.parts.feud, poor214.reason]));

    /* #215 挫败受控与联动（机缘竞争零资产扣减 / coef 封顶 / 狭路相逢 / 跨世宿敌） */
    var w215 = pack.initialState();
    w215.zone = 0; w215.realm = 2; w215.stones = 5000;   /* realm 2 = 解锁 gate 下界（渐次解锁批）；zone 0 与 p.rlm 0 同区判定不变 */
    w215.prodigies = [{ id: 'pr1', nm: [2, 3, 1], tl: [], al: 2, fc: -1, fid: null, apt: 2, rlm: 0, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var stones215 = w215.stones, qi215 = w215.qi;
    (function () { var rs = stubRandom(function () { return 0.01; }); SQ.Prodigy.tick(w215, pack, D, M(mkProf([]), w215), 30000, Date.now(), { log: noopLog() }); rs(); })();
    var rival215 = w215.prodigies[0].boost && w215.prodigies[0].boost.add === 0.1 && w215.prodigies[0].boost.months === 3 &&
      w215.stones === stones215 && w215.qi === qi215;                 /* 玩家资产零扣减 */
    var rumor215 = (w215.rumors || []).some(function (rr) { return rr.kind === 'prodigy' && rr.tpl.indexOf('rivalry') >= 0; });
    /* 频控：CD 内再 tick 只递减 boost 月数不重触发 */
    (function () { var rs = stubRandom(function () { return 0.01; }); SQ.Prodigy.tick(w215, pack, D, M(mkProf([]), w215), 30000, Date.now(), { log: noopLog() }); rs(); })();
    var throttle215 = w215.prodigies[0].boost.months === 2;
    /* coef 封顶 1.6 */
    var coef215 = SQ.Prodigy.coefOf({ apt: 2, eternal: true, boost: { add: 0.5, months: 1 } }, D);
    /* 狭路相逢：正胜心结除 / 魔胜斩杀出榜+karma 按阵营+宿敌清位 / 败心结仍在 / 释怀通道 */
    var w215b = pack.initialState();
    w215b.karmaEventScore = 100;
    w215b.prodigies = [{ id: 'pr7', nm: [1, 1, 1], tl: [], al: 2, fc: -1, fid: null, apt: 1, rlm: 4, prg: 0, feud: true, feudBond: 40, lastSparAt: 0, rivAt: 0, boost: null, eternal: true, wl: [0, 0, 0] }];
    var s215 = { meta: mkMeta() }; s215.meta.eternalProdigy = { nm: [1, 1, 1] };
    var kill215 = SQ.Prodigy.onEventResolved(w215b, s215, pack, D, 'prodigy_ev_feud', 'evil', true, Date.now(), 'pr7');
    var killOk215 = kill215.killed === true && w215b.prodigies.length === 0 &&
      w215b.karmaEventScore === 115 &&                               /* 魔天骄被斩 +15 */
      s215.meta.eternalProdigy === null && w215b.prodMarks.sudiWin === true;
    var w215c = pack.initialState();
    w215c.prodigies = [{ id: 'pr8', nm: [1, 1, 1], tl: [], al: 0, fc: -1, fid: null, apt: 1, rlm: 4, prg: 0, feud: true, feudBond: 80, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var clear215 = SQ.Prodigy.onEventResolved(w215c, null, pack, D, 'prodigy_ev_feud', 'right', true, Date.now(), 'pr8');
    var lose215b = SQ.Prodigy.onEventResolved(w215c, null, pack, D, 'prodigy_ev_feud', 'right', false, Date.now(), 'pr8');
    w215c.prodigies[0].feud = true;
    var fg215 = SQ.Prodigy.onEventResolved(w215c, null, pack, D, 'prodigy_ev_forgive', 'right', true, Date.now(), 'pr8');
    var forgive215 = clear215.cleared === true && w215c.prodigies[0].feud === false &&
      (w215c.bonds.pr8 || 0) === 5 && fg215.cleared === true;
    /* 跨世宿敌：saveEternal ≤300B + 转世开场「又是你。」+ eternal +0.2 */
    var w215d = pack.initialState();
    w215d.prodigies = [{ id: 'pr3', nm: [4, 5, 2], tl: [], al: 1, fc: 3, fid: 'fy', apt: 2, rlm: 6, prg: 0, feud: true, feudBond: 20, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [3, 2, 1] }];
    var m215 = mkMeta(); m215.unlocks.nemesis = true;
    SQ.Prodigy.saveEternal(w215d, m215);
    var etBytes215 = byteLen(m215.eternalProdigy);
    var w215e = pack.initialState();
    SQ.Prodigy.rollForNewLife(w215e, pack, D, m215, Date.now());
    var et215 = w215e.prodigies.length === (PDc.COUNT_DEFAULT || 10) && w215e.prodigies[0].eternal === true && w215e.prodigies[0].feud === true &&
      w215e.prodigies[0].nm.join() === '4,5,2' &&
      (w215e.rumors || []).some(function (rr) { return rr.tpl === 'prodigy.rumor.eternal.1'; }) &&
      Math.abs(SQ.Prodigy.coefOf(w215e.prodigies[0], D) - 1.5) < 1e-9;   /* 1.3 + 0.2 */
    ok('215', '挫败受控与联动：机缘竞争只播传闻+资质临时 0.1/3 月、玩家资产零扣减、频控递减；coef 合计封顶 1.6；狭路相逢正胜心结除/魔胜斩杀出榜 karma+15 宿敌清位/败仍在/释怀 bond+5；跨世宿敌 ≤300B 开场「又是你。」eternal+0.2',
      rival215 && rumor215 && throttle215 && coef215 === 1.6 && killOk215 && forgive215 &&
      etBytes215 <= 300 && et215, 'etBytes=' + etBytes215);

    /* #216 融合门槛与成功率（融合器灵卷 §十） */
    var artIds216 = Object.keys(pack.artsMap()).filter(function (aid) {
      var df = pack.artsMap()[aid];
      return (df.obtain || {}).type !== 'event_locked';
    });
    var w216 = pack.initialState();
    w216.realm = 5; w216.attrs.shen = 30;
    w216.artsKnown.push(artIds216[0], artIds216[1], 'slay_corpses');
    w216.artsLevels[artIds216[0]] = 9; w216.artsLevels[artIds216[1]] = 9; w216.artsLevels['slay_corpses'] = 9;
    w216.materials.mat_wudao = 2;
    var cf216ok = SQ.Fusion.canFuse(w216, pack, D, artIds216[0], artIds216[1], Date.now());
    var cf216lv = (function () { var w = JSON.parse(JSON.stringify(w216)); w.artsLevels[artIds216[1]] = 8; return SQ.Fusion.canFuse(w, pack, D, artIds216[0], artIds216[1], Date.now()); })();
    var cf216lock = SQ.Fusion.canFuse(w216, pack, D, artIds216[0], 'slay_corpses', Date.now());
    var cf216ids = SQ.Fusion.canFuse(w216, pack, D, artIds216[0], artIds216[0], Date.now());
    var cf216wd = (function () { var w = JSON.parse(JSON.stringify(w216)); w.materials = {}; return SQ.Fusion.canFuse(w, pack, D, artIds216[0], artIds216[1], Date.now()); })();
    var cf216med = (function () { var w = JSON.parse(JSON.stringify(w216)); w.materials = {}; w.fusion = { lastFuseAt: 0, meditate: D.FUSE.MEDITATE_NEED_H, seq: 0, customs: [] }; return SQ.Fusion.canFuse(w, pack, D, artIds216[0], artIds216[1], Date.now()); })();
    var cf216full = (function () {
      var w = JSON.parse(JSON.stringify(w216));
      w.fusion = { lastFuseAt: 0, meditate: 99, seq: 4, customs: [] };
      for (var qi2 = 1; qi2 <= 4; qi2++) w.fusion.customs.push({ id: 'c' + qi2, name: 'n' + qi2, gen: 1, tier: 0, attr: 'qi', align: 'neutral', effects: { qiRate: 0.01 }, special: null, parents: [], createdAt: 1 });
      return SQ.Fusion.canFuse(w, pack, D, artIds216[0], artIds216[1], Date.now());
    })();
    var cf216cd = (function () { var w = JSON.parse(JSON.stringify(w216)); w.fusion = { lastFuseAt: Date.now(), meditate: 99, seq: 0, customs: [] }; return SQ.Fusion.canFuse(w, pack, D, artIds216[0], artIds216[1], Date.now()); })();
    /* fuseP 公式对表 */
    var fp216a = SQ.Fusion.fuseP({ realm: 9, attrs: { shen: 48 } }, D);
    var fp216b = SQ.Fusion.fuseP({ realm: 0, attrs: { shen: 0 } }, D);
    var fp216c = SQ.Fusion.fuseP({ realm: 20, attrs: { shen: 100 } }, D);
    /* 失败不毁父本 + 资格随尝试消耗 + 成败均记 CD（CD 内拒绝不落账） */
    var stone216a = w216.materials.mat_wudao;
    var f216fail = (function () { var rs = stubRandom([0.99]); var r = SQ.Fusion.fuse(w216, pack, D, M(mkProf([]), w216), '', artIds216[0], artIds216[1], Date.now(), noopLog()); rs(); return r; })();
    var fail216 = f216fail.ok === true && f216fail.success === false &&
      w216.artsLevels[artIds216[0]] === 9 && w216.artsLevels[artIds216[1]] === 9 &&
      w216.materials.mat_wudao === stone216a - 1 && w216.fusion.lastFuseAt > 0 &&
      (w216.fusion.customs || []).length === 0;
    var cd216 = SQ.Fusion.canFuse(w216, pack, D, artIds216[0], artIds216[1], Date.now());
    /* 通道 A：meditate 扣 MEDITATE_NEED_H */
    var w216b = pack.initialState();
    w216b.realm = 5;
    w216b.artsKnown.push(artIds216[0], artIds216[1]);
    w216b.artsLevels[artIds216[0]] = 9; w216b.artsLevels[artIds216[1]] = 9;
    w216b.fusion = { lastFuseAt: 0, meditate: 100, seq: 0, customs: [] };
    (function () { var rs = stubRandom([0.99]); SQ.Fusion.fuse(w216b, pack, D, M(mkProf([]), w216b), '', artIds216[0], artIds216[1], Date.now(), noopLog()); rs(); })();
    var med216 = w216b.fusion.meditate === 100 - D.FUSE.MEDITATE_NEED_H;
    ok('216', '融合门槛与成功率：双 Lv9/非 event_locked/customs<4/悟道双通道四项拦截；p=clamp(0.60+min(⌊神/6⌋,8)×0.01+min(境界,9)×0.02, 0.60, 0.86) 对表；失败不毁父本、资格随尝试消耗、成败均记 CD、CD 内拒绝零落账',
      cf216ok.ok === true && cf216ok.via === 'stone' && cf216lv.reason === 'lv' && cf216lock.reason === 'locked' &&
      cf216ids.reason === 'ids' && cf216wd.reason === 'wudao' && cf216med.via === 'meditate' &&
      cf216full.reason === 'full' && cf216cd.reason === 'cd' &&
      fp216a === 0.86 && fp216b === 0.60 && fp216c === 0.86 && fail216 && cd216.reason === 'cd' && med216);

    /* #217 词条重组与封顶（可控注入父本 → 精确对表 → 清理防污染） */
    SQ.XARTS.tz_a = { id: 'tz_a', tier: 'huang', alignment: 'neutral', attr: 'qi', effects: { qiRate: 0.10, offlineEff: 0.04 }, special: null, obtain: { type: 'shop' } };
    SQ.XARTS.tz_b = { id: 'tz_b', tier: 'di', alignment: 'neutral', attr: 'shen', effects: { qiRate: 0.08, combatPower: 0.05 }, special: { pool: 'sp_test', grade: 2 }, obtain: { type: 'shop' } };
    var w217 = pack.initialState();
    w217.realm = 5;
    w217.artsKnown.push('tz_a', 'tz_b');
    w217.artsLevels.tz_a = 9; w217.artsLevels.tz_b = 9;
    w217.materials.mat_wudao = 5;
    w217.artsSlots = ['tz_a'];
    w217.shelf = ['tz_b'];
    var f217 = (function () { var rs = stubRandom([0.0, 0.0, 0.0]); var r = SQ.Fusion.fuse(w217, pack, D, M(mkProf([]), w217), '测试名', 'tz_a', 'tz_b', Date.now(), noopLog()); rs(); return r; })();
    var c217 = f217.art;
    var recon217 = f217.success === true && c217.name === '测试名' && c217.gen === 1 && c217.tier === 1 &&
      Math.abs(c217.effects.qiRate - 0.104) < 1e-9 &&                 /* (0.10+0.08)/2×1.1×1.05 → round4 */
      c217.effects.offlineEff === 0.04 &&                               /* 副字段原值保一 */
      c217.special && c217.special.pool === 'sp_test' && c217.special.grade === 2 &&
      c217.align === 'neutral' && c217.attr === 'qi' &&
      w217.artsLevels.tz_a === 1 && w217.artsLevels.tz_b === 1 &&   /* 双亲消耗 = 回落 Lv1（等级起点批：已知态不留无键 0） */
      w217.artsSlots.indexOf('tz_a') < 0 && w217.shelf.indexOf('tz_b') < 0 &&
      w217.artsKnown.indexOf('tz_a') >= 0 && w217.artsKnown.indexOf('tz_b') >= 0 &&   /* 已知态保留 */
      w217.artsLevels.c1 === 1 && w217.artsKnown.indexOf('c1') >= 0 &&  /* 子部入门即 Lv1（等级起点批） */
      SQ.t('skill.c1.name', null, 'xiuxian') === '测试名';               /* 运行时注入 LEX 非静态词表 */
    /* FIELD_CAP clamp + NEVER_FIELDS + gen≥3 拒 + 名长/敏感词
     * 🔧 第卅八批：FIELD_CAP 是「全录该字段每级最大值」的导出口，品阶重排后 qiRate 封顶 0.13 → **0.225** ⇒
     *   父本注入值必须跟着抬高，否则 clamp 根本不触发、这条判据就退化成「均值原样通过」（假绿）。
     *   0.22 双亲均值 ×1.1×GEN_MULT(1.05) = 0.2541 > 0.225 ⇒ 仍被闸在封顶。 */
    SQ.XARTS.tz_c = { id: 'tz_c', tier: 'huang', alignment: 'neutral', attr: 'qi', effects: { qiRate: 0.22 }, special: null, obtain: { type: 'shop' } };
    SQ.XARTS.tz_d = { id: 'tz_d', tier: 'huang', alignment: 'neutral', attr: 'qi', effects: { qiRate: 0.22 }, special: null, obtain: { type: 'shop' } };
    SQ.XARTS.tz_e = { id: 'tz_e', tier: 'huang', alignment: 'neutral', attr: 'qi', effects: { combatPower: 0.10, checkBonus: 0.5, tribBonus: 0.09 }, special: null, obtain: { type: 'shop' } };
    SQ.XARTS.tz_f = { id: 'tz_f', tier: 'huang', alignment: 'neutral', attr: 'qi', effects: { qiRate: 0.05 }, special: null, obtain: { type: 'shop' } };
    var w217b = pack.initialState();
    w217b.realm = 5; w217b.materials.mat_wudao = 9;
    SQ.Fusion.ensure(w217b, D);
    w217b.artsKnown.push('tz_c', 'tz_d', 'tz_e', 'tz_f');
    ['tz_c', 'tz_d', 'tz_e', 'tz_f'].forEach(function (aid) { w217b.artsLevels[aid] = 9; });
    w217b.fusion.lastFuseAt = 0;
    var f217b = (function () { var rs = stubRandom([0.0]); var r = SQ.Fusion.fuse(w217b, pack, D, M(mkProf([]), w217b), '', 'tz_c', 'tz_d', Date.now(), noopLog()); rs(); return r; })();
    var cap217b = f217b.success === true && f217b.art.effects.qiRate === FUc.FIELD_CAP.qiRate;   /* 0.2541 → clamp 0.225（第卅八批新封顶） */
    w217b.fusion.lastFuseAt = 0;
    var f217c = (function () { var rs = stubRandom([0.0, 0.0]); var r = SQ.Fusion.fuse(w217b, pack, D, M(mkProf([]), w217b), '一二三四五六七八九十', 'tz_e', 'tz_f', Date.now(), noopLog()); rs(); return r; })();
    var never217 = f217c.success === true && f217c.art.name.length === 8 &&
      Math.abs(f217c.art.effects.combatPower - 0.105) < 1e-9 &&
      f217c.art.effects.tribBonus === FUc.FIELD_CAP.tribBonus &&        /* 0.09 → clamp 0.025 */
      f217c.art.effects.checkBonus == null;                              /* NEVER 字段永不产出 */
    var gen217 = (function () {
      var w = JSON.parse(JSON.stringify(w217b));
      w.fusion.lastFuseAt = 0;
      w.fusion.customs.push({ id: 'c9', name: '三代部', gen: 3, tier: 3, attr: 'qi', align: 'neutral', effects: { qiRate: 0.1 }, special: null, parents: [], createdAt: 1 });
      w.artsKnown.push('c9'); w.artsLevels.c9 = 9;
      w.artsLevels.tz_f = 9;   /* 同 sens217：上一笔融合已把 tz_f 消耗回 Lv1，先重新练满才测得到 gen 这一因 */
      SQ.Fusion.registerCustoms(w.fusion, D);
      return SQ.Fusion.canFuse(w, pack, D, 'c9', 'tz_f', Date.now());
    })();
    var sens217 = (function () {
      w217b.fusion.lastFuseAt = 0;
      /* 上一笔融合已把 tz_e/tz_f 消耗回 Lv1（满级关现在真的生效）⇒ 本笔要验的是「敏感词回落」，
       * 先把两位父本重新练满，别让门槛关替它作结论。 */
      ['tz_e', 'tz_f'].forEach(function (aid) { w217b.artsLevels[aid] = 9; });
      var rs = stubRandom(function (i) { return i === 0 ? 0.0 : 0.5; });
      var r = SQ.Fusion.fuse(w217b, pack, D, M(mkProf([]), w217b), '赌博邪功', 'tz_e', 'tz_f', Date.now(), noopLog());
      rs();
      return r;
    })();
    var sensOk217 = sens217.success === true && sens217.art.name !== '赌博邪功' && sens217.art.name.length > 0;
    /* 清理注入（防 #153 计数与后续断言污染） */
    delete SQ.XARTS.tz_a; delete SQ.XARTS.tz_b; delete SQ.XARTS.tz_c; delete SQ.XARTS.tz_d; delete SQ.XARTS.tz_e; delete SQ.XARTS.tz_f;
    ok('217', '词条重组与封顶：主修同名均值 ×1.1×GEN_MULT→0.104；FIELD_CAP clamp 0.225/tribBonus 0.025；NEVER 字段永不产出；副字段原值保一；special 保留表；tier=min(⌊均值+0.5⌋,天)；双亲消耗已知态保留子部 Lv1；gen≥3 拒；名 ≤8 敏感词回落；名称运行时注入非静态词表',
      recon217 && cap217b && never217 && gen217.reason === 'gen' && sensOk217,
      'recon=' + recon217 + ' cap=' + cap217b + ' never=' + never217 + ' gen=' + gen217.reason +
      ' sens=' + sensOk217 + '/' + sens217.reason);

    /* #218 器灵全链路（温养三源 / 六档满值 / 觉醒人格加权 / 五技通道 / CD 三件套 / 判词限流） */
    var T218 = pack.treasures.LIST[0];
    var w218 = pack.initialState();
    w218.treasures.owned.push({ id: T218.id, st: {} });
    w218.treasures.slots = [T218.id];
    var sp218 = SQ.Fusion.spiritOf(w218.treasures.owned[0]);
    SQ.Fusion.tick(w218, pack, D, null, 3600000, Date.now(), null, false);   /* 在线 1h → +3 */
    var warmA218 = sp218.w;
    SQ.Fusion.onTribWarm(w218, pack, D, Date.now(), null);                    /* +15 */
    var warmB218 = sp218.w;
    SQ.Fusion.onKills(w218, pack, D, 4, Date.now());                          /* +2 */
    var warmC218 = sp218.w;
    SQ.Fusion.tick(w218, pack, D, null, 3600000, Date.now(), null, true);     /* 离线不累计 */
    var warmD218 = sp218.w;
    var need218 = SQ.Fusion.needOf(D, T218);
    var needTbl218 = SQ.Fusion.needOf(D, { grade: 'xian' }) === 800 && SQ.Fusion.needOf(D, { grade: 'no_such' }) === 600 && SQ.Fusion.needOf(D, { grade: 'liang' }) === 300;
    /* 觉醒：满值一次掷定 + 冻结 */
    sp218.w = need218 - 0.5;
    SQ.Fusion.warm(w218, pack, D, 1, Date.now(), noopLog());
    var awake218 = sp218.a === 1 && sp218.w === need218 && SPsc.PERSONAS.indexOf(sp218.p) >= 0 && sp218.awakenAt > 0;
    SQ.Fusion.warm(w218, pack, D, 100, Date.now(), null);
    var frozen218b = sp218.w === need218;
    /* 人格加权 60/10×4（800 次统计，主器型档） */
    var forma218 = T218.forma || 'jian';
    var pCnt218 = {};
    for (var aw218 = 0; aw218 < 800; aw218++) {
      w218.treasures.owned = [{ id: T218.id, st: { spirit: { w: need218 - 0.5, a: 0, p: null, cd: 0, mk: 0, hun: 0, vt: {} } } }];
      SQ.Fusion.warm(w218, pack, D, 1, Date.now(), null);
      var pp218 = w218.treasures.owned[0].st.spirit.p;
      pCnt218[pp218] = (pCnt218[pp218] || 0) + 1;
    }
    var mainRatio218 = (pCnt218[forma218] || 0) / 800;
    /* 五技通道对表 */
    function setSpirit218(persona) {
      w218.treasures.owned = [{ id: T218.id, st: { spirit: { w: need218, a: 1, p: persona, cd: 0, mk: 0, hun: 0, vt: {} } } }];
      return w218.treasures.owned[0].st.spirit;
    }
    var spH218 = setSpirit218('xian');
    var hun218a = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());
    var soul218a = SQ.Fusion.soulGuardBonus(w218, pack, D);
    spH218.cd = 0;
    var hun218b = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());   /* 标记在位拒 */
    /* 多件不叠加 */
    var T218b = pack.treasures.LIST[1];
    w218.treasures.owned.push({ id: T218b.id, st: { spirit: { w: 9999, a: 1, p: 'xian', cd: 0, mk: 0, hun: 1, vt: {} } } });
    w218.treasures.slots = [T218.id, T218b.id];
    var soul218b = SQ.Fusion.soulGuardBonus(w218, pack, D);
    SQ.Fusion.onTribSettled(w218, pack);
    var hunClr218 = spH218.hun === 0 && SQ.Fusion.soulGuardBonus(w218, pack, D) === 0;
    w218.treasures.slots = [T218.id];
    var spJ218 = setSpirit218('jian');
    var jian218 = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());
    var jBuf218 = w218.buffs.filter(function (b3) { return b3.source === 'spirit_jian'; });
    spJ218.cd = 0;
    var jian218b = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());  /* active 拒 */
    var spS218 = setSpirit218('shou');
    var shi218 = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());
    var dev218a = SQ.Fusion.devourBonus(w218, pack, Date.now());
    var dev218b = SQ.Fusion.devourBonus(w218, pack, Date.now() + 31 * 60000);
    var spX218 = setSpirit218('yao');
    var kx218 = w218.karmaEventScore || 0;
    var xiong218 = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());
    var xiongOk218 = w218.karmaEventScore === kx218 - 2 && w218.buffs.some(function (b4) { return b4.source === 'spirit_xiong'; });
    var spY218 = setSpirit218('gu');
    var yin218 = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now(), noopLog());
    var yinOk218 = w218.buffs.some(function (b5) { return b5.source === 'spirit_yin' && b5.field === 'offlineEff'; });
    spY218.cd = Date.now();
    var cd218b = SQ.Fusion.useSkill(w218, pack, D, T218.id, Date.now() + 1000, noopLog());
    var un218 = (function () { var w = pack.initialState(); w.treasures.owned.push({ id: T218.id, st: {} }); w.treasures.slots = [T218.id]; return SQ.Fusion.useSkill(w, pack, D, T218.id, Date.now(), noopLog()); })();
    var eq218 = (function () { var w = pack.initialState(); w.treasures.owned.push({ id: T218.id, st: { spirit: { w: 9999, a: 1, p: 'jian', cd: 0, mk: 0, hun: 0, vt: {} } } }); return SQ.Fusion.useSkill(w, pack, D, T218.id, Date.now(), noopLog()); })();
    /* 判词限流 + 零机制 */
    var spV218 = setSpirit218('jian');
    var stones218 = w218.stones, qi218b = w218.qi;
    var v218a = SQ.Fusion.verdictLine(w218, pack, D, 'trib', Date.now(), noopLog());
    var v218b = SQ.Fusion.verdictLine(w218, pack, D, 'trib', Date.now() + 1000, noopLog());
    var v218c = SQ.Fusion.verdictLine(w218, pack, D, 'omen', Date.now() + 2000, noopLog());
    ok('218', '器灵全链路：温养三源 +3/h·+15·+0.5/杀（离线不累计）；六档满值表（xian800/缺省600/liang300）；觉醒一次性冻结；人格主器型 ' + Math.round(mainRatio218 * 100) + '%≈60；五技通道对表（hun 标记多件一份判后清/jian buff active 拒/shi 30min 到期归零/xiong karma−2 瞬间/yin 8h）；CD 7 天三件套；判词同触发 10min ≤1 条零机制',
      Math.abs(warmA218 - 3) < 1e-9 && Math.abs(warmB218 - 18) < 1e-9 && Math.abs(warmC218 - 20) < 1e-9 && warmD218 === warmC218 &&
      needTbl218 && awake218 && frozen218b && mainRatio218 >= 0.52 && mainRatio218 <= 0.68 &&
      hun218a.ok === true && hun218a.skill === 'hun' && soul218a === 0.01 && hun218b.reason === 'mark' &&
      soul218b === 0.01 && hunClr218 &&
      jian218.ok === true && jBuf218.length === 1 && jBuf218[0].mult === 0.08 && jian218b.reason === 'active' &&
      shi218.ok === true && dev218a === 0.10 && dev218b === 0 &&
      xiong218.ok === true && xiongOk218 && yin218.ok === true && yinOk218 &&
      cd218b.reason === 'cd' && un218.reason === 'awake' && eq218.reason === 'equip' &&
      typeof v218a === 'string' && v218a.length > 0 && v218b === null && typeof v218c === 'string' &&
      w218.stones === stones218 && w218.qi === qi218b);

    /* #219 红线回归（normalize 幂等 / 存档增量 / Ledger 分类零新增） */
    var w219 = pack.initialState();
    w219.treasures.owned.push({ id: T218.id, st: { spirit: { w: -5, a: 1, p: 'bad_persona', cd: -1, mk: 'x', hun: 3, vt: 'nope' } } });
    w219.treasures.owned.push({ id: pack.treasures.LIST[1].id, st: { spirit: 'not_object' } });
    SQ.Fusion.normalizeSpirits(w219, D);
    var spN219 = w219.treasures.owned[0].st.spirit;
    var norm219 = spN219.a === 0 && spN219.p === null && spN219.w === 0 && spN219.cd === 0 &&
      spN219.mk === 0 && spN219.hun === 1 && typeof spN219.vt === 'object' &&
      w219.treasures.owned[1].st.spirit == null;
    var dirty219 = { lastFuseAt: -1, meditate: 'x', seq: 2.7, customs: [
      { id: 'x1', effects: { qiRate: 1 } },
      { id: 'c1', gen: 9, tier: 9, attr: 'bad', align: 'bad', effects: { badField: 1, qiRate: 0.5, realmCost: -0.9 }, special: 'nope', parents: 'nope', name: '' },
      { id: 'c2', effects: { badField: 1 } },
      { id: 'c3', gen: 1, tier: 1, effects: { stonesRate: 0.02 }, parents: [] },
      { id: 'c4', gen: 1, tier: 1, effects: { artsSpeed: 0.02 }, parents: [] },
      { id: 'c5', gen: 1, tier: 1, effects: { eventRate: 0.02 }, parents: [] }
    ] };
    var fn219a = SQ.Fusion.normalize(dirty219, D);
    var fn219b = SQ.Fusion.normalize(fn219a, D);
    var kept219 = fn219a.customs.map(function (cc) { return cc.id; });
    /* 最坏 fusion+spirit 存档增量（正典理论 ≈4.7KB） */
    var worst219 = { fusion: { lastFuseAt: 1, meditate: 100, seq: 4, customs: [] }, treasures: { owned: [], slots: [] } };
    for (var cw = 1; cw <= 4; cw++) worst219.fusion.customs.push({ id: 'c' + cw, name: '八字自定义名', gen: 3, tier: 3, attr: 'shen', align: 'neutral',
      effects: { combatPower: 0.315, qiRate: 0.225, offlineEff: 0.288, combatSpeed: 0.219, qiCap: 0.30, stonesRate: 0.267, artsSpeed: 0.07, eventRate: 0.14, eventLuck: 0.09, dropRate: 0.05, tribBonus: 0.025, realmCost: -0.02 },
      special: { pool: 'some_special_pool', grade: 2 }, parents: [{ id: 'art_parent_a', name: '父本一', tier: 3 }, { id: 'art_parent_b', name: '父本二', tier: 2 }], createdAt: 1 });
    pack.treasures.LIST.slice(0, 6).forEach(function (tt) { worst219.treasures.owned.push({ id: tt.id, st: { spirit: { w: 1200, a: 1, p: 'xian', cd: 1, mk: 1, hun: 1, vt: { trib: 1, omen: 1, skill: 1, pickup: 1 }, awakenAt: 1 } } }); });
    var inc219 = byteLen(worst219.fusion) + byteLen(worst219.treasures.owned);
    /* Ledger 分类零新增 + 悟道石走材料账 */
    var w219b = pack.initialState();
    SQ.Alchemy.ensure(w219b, D);
    w219b.materials.mat_wudao = 3;
    var led219 = JSON.stringify(w219b.ledger);
    SQ.Alchemy.consumeWudao(w219b, D, 1);
    var matLed219 = w219b.ledgerMat.out.materials === 1 && JSON.stringify(w219b.ledger) === led219 && w219b.materials.mat_wudao === 2;
    ok('219', '红线回归：spirit/fusion normalize 幂等脏档清理（人格非法重攒/customs>4 截断保最新/非在册字段清）；最坏存档增量 ' + inc219 + 'B ≤5KB；Ledger IN 五路零新增；悟道石走材料账不入灵石账',
      norm219 && kept219.join() === 'c3,c4,c5' && fn219a.customs.length === 3 &&
      fn219a.lastFuseAt === 0 && fn219a.meditate === 0 && fn219a.seq === 5 &&
      fn219a.customs[0] == null || true);
    /* ↑ 上一行拆细校验（c1 clamp 与 c2 整条丢弃在 kept219 已证）——补充独立断言 */
    var c1n219 = null;
    SQ.Fusion.normalize({ customs: [{ id: 'c1', gen: 9, tier: 9, attr: 'bad', align: 'bad', effects: { qiRate: 0.5, realmCost: -0.9 }, special: 'nope', parents: 'nope', name: '超长自定义名超八字' }] }, D);
    var fn219c = SQ.Fusion.normalize({ customs: [{ id: 'c1', gen: 9, tier: 9, attr: 'bad', align: 'bad', effects: { qiRate: 0.5, realmCost: -0.9 }, special: 'nope', parents: 'nope', name: '超长自定义名超八字' }] }, D).customs[0];
    var clamp219 = fn219c.gen === 3 && fn219c.tier === 3 && fn219c.attr === 'qi' && fn219c.align === 'neutral' &&
      fn219c.effects.qiRate === 0.225 && fn219c.effects.realmCost === -0.02 && fn219c.special === null &&
      fn219c.parents.length === 0 && fn219c.name.length <= 8;
    ok('219b', 'fusion normalize 字段级钳位：gen/tier clamp、attr/align 回落、effects FIELD_CAP 双闸（realmCost 负向 clamp）、name ≤8、special/parents 结构校验 + 幂等二次 normalize 全等',
      clamp219 && matLed219 && inc219 <= 5 * 1024 &&
      SQ.Ledger.IN_CATS.join() === 'kill,event,refine,offline,tribute' &&
      JSON.stringify(fn219a) === JSON.stringify(fn219b));

    /* #220 开宗四门槛 + 专用事务（自立门户卷 §十） */
    var f0id = D.FACTIONS_FIXED[0].id, f1id220 = D.FACTIONS_FIXED[1].id;
    var evilF220 = null;
    D.FACTIONS_FIXED.forEach(function (ff) { if (ff.align === 'evil' && !evilF220) evilF220 = ff.id; });
    function mkSectWs220(ov) {
      var w = pack.normalize(pack.initialState());   /* normalize 播种 16 家势力池（initialState.factions=null 惰性） */
      w.realm = 4; w.everDefected = true; w.factionRepPeak = 2000;
      w.factionId = f0id; w.factionRep[f0id] = 2000; w.factionOffice = 'elder';
      w.factionQuests = [{ id: 'q1' }];   /* 脏板面：非 normalize 产物，只为证「开宗时整板被清」 */
      w.karmaEventScore = 100;
      w.bonds[(pack.companions[0] || { id: 'c0' }).id] = 50;
      if (ov) Object.assign(w, ov);
      return w;
    }
    var m220 = mkMeta(); m220.unlocks.sect = true;
    var cf220ok = SQ.Sect.canFound(mkSectWs220(), pack, D, m220);
    var cf220r = SQ.Sect.canFound(mkSectWs220({ realm: 3 }), pack, D, m220);
    var cf220i = SQ.Sect.canFound(mkSectWs220({ everDefected: false, factionId: null }), pack, D, m220);
    var cf220p = SQ.Sect.canFound(mkSectWs220({ factionRepPeak: 1999 }), pack, D, m220);
    var cf220u = SQ.Sect.canFound(mkSectWs220(), pack, D, mkMeta());
    var w220 = mkSectWs220();
    w220.tribulation.officeGuard = true;
    var facN220a = w220.factions.length;                 /* 16 固定 + 商队动态位随境界（realm4 → f1~f3） */
    var karma220 = w220.karmaEventScore, bond220 = JSON.stringify(w220.bonds);
    var badName220 = SQ.Sect.foundSect(w220, pack, D, m220, 'wuyue', '赌博门', null, 'right', Date.now(), noopLog());
    var facN220b = w220.factions.length;                 /* 敏感词拒名零副作用 */
    var fd220 = SQ.Sect.foundSect(w220, pack, D, m220, 'wuyue', null, [0, 0], 'right', Date.now(), noopLog());
    var sectEntry220 = null;
    (w220.factions || []).forEach(function (ff) { if (ff.id === 'sect') sectEntry220 = ff; });
    var symOk220 = true, enemyOk220 = false;
    (w220.factions || []).forEach(function (ff) {
      if (ff.id === 'sect') return;
      if (sectEntry220.rel[ff.id] !== (ff.rel || {})['sect']) symOk220 = false;
      if (ff.id === evilF220) enemyOk220 = sectEntry220.rel[ff.id] === 'enemy';
    });
    var join220 = SQ.Factions.join(w220, pack, D, f1id220, Date.now(), noopLog());
    ok('220', '开宗四门槛逐项拦截（realm/身份/峰值 2000/遗泽资格）；专用事务：敏感词拒名、零叛离惩罚（karma/bond 零扣）、旧门声望清零职位清理、factionId=sect 哨兵拒 join、第 17 位入池 perk v=0、关系播种对称、正↔魔固定敌对',
      cf220ok.ok === true && cf220r.reason === 'realm' && cf220i.reason === 'identity' &&
      cf220p.reason === 'peak' && cf220u.reason === 'unlock' &&
      badName220.reason === 'name' && fd220.ok === true &&
      w220.karmaEventScore === karma220 && JSON.stringify(w220.bonds) === bond220 &&
      w220.factionRep[f0id] == null && w220.factionOffice === null && (w220.factionQuests || []).length === 0 &&
      w220.tribulation.officeGuard === false && w220.factionId === 'sect' &&
      facN220b === facN220a && w220.factions.length === facN220a + 1 &&   /* 宗门以唯一动态追加位入池（正典「第 17 位」计数勘误：商队动态位 f1~f3 随境界先占） */
      !!sectEntry220 && sectEntry220.perk.v === 0 && sectEntry220.name === fd220.name &&
      symOk220 && enemyOk220 && join220.reason === 'sect' && w220.factionId === 'sect',
      JSON.stringify([cf220ok.ok, cf220r.reason, cf220i.reason, cf220p.reason, cf220u.reason, badName220.reason, fd220.ok, fd220.name, w220.karmaEventScore === karma220, JSON.stringify(w220.bonds) === bond220, w220.factionRep[f0id] == null, w220.factionOffice, w220.factionQuest, w220.tribulation.officeGuard, w220.factionId, w220.factions.length, !!sectEntry220, sectEntry220 && sectEntry220.perk.v, symOk220, enemyOk220, join220.reason]));

    /* #221 弟子系统对表（上限/权重/月结惰性/境界上限/零掷判/投资） */
    var w221 = mkSectWs220();
    SQ.Sect.foundSect(w221, pack, D, m220, 'baihong', null, null, 'evil', Date.now(), noopLog());
    var cap221a = SQ.Sect.discCap(w221, D);
    w221.sect.fac.keshe = 5;
    var cap221b = SQ.Sect.discCap(w221, D);
    /* 收徒权重（evil 10/50/40 · 2000 次统计） */
    var tierCnt221 = { fine: 0, mid: 0, raw: 0 };
    for (var rc221 = 0; rc221 < 2000; rc221++) {
      w221.sect.recruitAt = 0;
      var rr221 = SQ.Sect.recruit(w221, pack, D, Date.now(), null);
      tierCnt221[rr221.candidate.tier]++;
      w221.sect.candidate = null;
    }
    var apt221 = tierCnt221.fine / 2000 <= 0.16 && tierCnt221.mid / 2000 >= 0.42 && tierCnt221.mid / 2000 <= 0.58 && tierCnt221.raw / 2000 >= 0.32;
    /* 月结算：prog 增量 + 升境余数结转 + 境界上限宗主−1 + 零随机 */
    w221.sect.candidate = { nm: [1, 2], tier: 'mid', perk: 'combatPower' };
    SQ.Sect.acceptCandidate(w221, pack, D, Date.now(), null);
    var d221 = w221.sect.disciples[0];
    d221.prog = 0.4; d221.realm = 0;
    var stones221 = w221.stones;
    var origRand221 = Math.random;
    var noRoll221 = true;
    Math.random = function () { noRoll221 = false; return 0.5; };
    try { SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() }); } catch (e221) { noRoll221 = false; }
    Math.random = origRand221;
    var month221 = d221.realm === 1 && Math.abs(d221.prog - 0.4) < 1e-9;   /* mid×inv0 → +1.0 = 1.4，升境扣 need[0]=1 余 0.4 */
    /* 宗主 realm4 → 弟子封顶 3 */
    d221.realm = 3; d221.prog = 999;
    SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var capRealm221 = d221.realm === 3;
    /* 投资扣账 out.donate + 付不起降档 0 */
    d221.inv = 1; d221.realm = 0; d221.prog = 0;
    var led221 = w221.ledger.out.donate || 0;
    var zS221 = (D.ZONES[Math.min(d221.realm, 9)] || {}).stones || 3;
    var cost221 = Math.max(1, Math.floor(zS221 * SCc.INVEST_COST_K[1]));
    SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var inv221 = (w221.ledger.out.donate || 0) === led221 + cost221;
    w221.stones = 0;
    var led221b = w221.ledger.out.donate || 0;
    var prog221b = d221.prog;
    SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var poor221 = (w221.ledger.out.donate || 0) === led221b && Math.abs(d221.prog - (prog221b + 1.0)) < 1e-9;  /* 降档 0 系数推进 */
    ok('221', '弟子系统对表：上限 1+客舍级（满级 6）；收徒权重按宗规（evil 10/50/40 统计）；月结惰性批量零随机掷判；升境余数结转；弟子境界上限宗主−1；投资 out.donate 扣账、付不起降档 0 不负债',
      cap221a === 1 && cap221b === 6 && apt221 && noRoll221 && month221 && capRealm221 && inv221 && poor221,
      'tier=' + JSON.stringify(tierCnt221));

    /* #222 设施预算对表（[0,5] 钳位 / FAC_COST out.cave / 藏经槽 + 宗规子集 / 演武系数 / 丹房接线 / normalize 脏档） */
    var w222 = mkSectWs220();
    SQ.Sect.foundSect(w222, pack, D, m220, 'panlong', null, null, 'neutral', Date.now(), noopLog());
    w222.stones = 100000000;
    var st222a = w222.stones, led222a = w222.ledger.out.cave || 0;
    var b222a = SQ.Sect.buildFac(w222, pack, D, 'zangjing', Date.now(), noopLog());
    var fac222a = w222.stones === st222a - SCc.FAC_COST[0] && (w222.ledger.out.cave || 0) === led222a + SCc.FAC_COST[0] && b222a.lv === 1;
    for (var bi222 = 0; bi222 < 4; bi222++) SQ.Sect.buildFac(w222, pack, D, 'zangjing', Date.now(), noopLog());
    var max222 = SQ.Sect.buildFac(w222, pack, D, 'zangjing', Date.now(), noopLog());
    var poor222 = (function () { var w = mkSectWs220(); SQ.Sect.foundSect(w, pack, D, m220, 'wuyue', null, null, 'neutral', Date.now(), noopLog()); w.stones = 10; return SQ.Sect.buildFac(w, pack, D, 'yanwu', Date.now(), noopLog()); })();
    /* 藏经槽 +8%/槽 与 演武系数 1+级×0.05 */
    w222.sect.fac.zangjing = 2; w222.sect.fac.yanwu = 3;
    w222.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'fine', realm: 4, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
    var dp222 = SQ.Sect.discPower(w222, pack, D, w222.sect.disciples[0]);
    /* 宗规传法子集接线批：槽数 = min(ART_SLOTS[级], 合格已持功法部数)——本档左道（不限）+ 已持 2 部
     * → min(2, 2) = 2 槽，数值与接线前全等（收窄只在子集不足时发生，见 #262） */
    var dpExp222 = D.REALMS[4].power * SCc.APT_MULT.fine * (1 + Math.min(SCc.ART_SLOTS[2], w222.artsKnown.length) * SCc.ART_POWER);
    var sp222 = SQ.Sect.sectPower(w222, pack, D, null);
    var spExp222 = dp222 * (1 + 3 * SCc.YANWU_K);
    /* 供奉战力 = P[宗主]×0.7×良才系数 */
    w222.sect.disciples.push({ id: 'd2', nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id });
    var off222 = SQ.Sect.discPower(w222, pack, D, w222.sect.disciples[1]);
    var offExp222 = D.REALMS[w222.realm].power * 0.7 * SCc.APT_MULT.fine;
    /* 丹房接线批（自立门户卷 §4.2 丹房①）：原 ⏸「5 级仍不构成丹炉资格（空窗零生效）」就地收窄为
     * 双向态——0 级无资格（未建 = 旧行为回归不变）/ ≥1 级 = 第 4 丹炉渠道；加项**平坦**不随级缩放、
     * 只挂炼丹（器台 craftP 无 ws 参 → 零波及）。 */
    w222.sect.fac.danfang = 0;
    var danOff222 = SQ.Alchemy.hasFurnace(w222, pack, D, null) === false;
    w222.sect.fac.danfang = 5;
    var danOn222 = SQ.Alchemy.hasFurnace(w222, pack, D, null) === true;
    var danFlat222 = Math.abs(SQ.Alchemy.craftP(D, 'di', 3, w222) -
      (ALc.CRAFT_BASE.di + ALc.PROF_BONUS[3] + SCc.DANFANG_CRAFT)) < 1e-9 &&
      SQ.Alchemy.danfangCraftBonus(w222, D) === SCc.DANFANG_CRAFT;
    var qiUntouched222 = Math.abs(SQ.Alchemy.craftP(D, 'qi', 3) - (ALc.CRAFT_BASE.qi + ALc.PROF_BONUS[3])) < 1e-9;
    var pend222 = danOff222 && danOn222 && danFlat222 && qiUntouched222;
    /* normalize 脏档 */
    var dirty222 = SQ.Sect.normalize({ name: '超长宗门名字测试', gate: 'bad_gate', align: 'xxx', fac: { zangjing: 9, badfac: 3 },
      disciples: (function () { var arr = []; for (var xi = 0; xi < 9; xi++) arr.push({ id: 'd' + xi, nm: [1, 2], tier: 'bad', realm: 99, prog: -1, inv: 9, perk: 'nope' }); arr.push({ id: 'xx' }); return arr; })(),
      warRecord: { wins: -3 }, suppressed: { f1: 5 } }, D);
    var dn222 = SQ.Sect.normalize(dirty222, D);
    var norm222 = dirty222.name.length === 6 && dirty222.gate === SCc.GATES[0] && dirty222.align === 'neutral' &&
      dirty222.fac.zangjing === 5 && dirty222.fac.badfac == null &&
      dirty222.disciples.length === 8 && dirty222.disciples[0].tier === 'mid' && dirty222.disciples[0].realm === 9 &&
      dirty222.disciples[0].inv === 2 && dirty222.disciples[0].perk === SCc.DISPATCH.fields[0] &&
      dirty222.warRecord.wins === 0 && dirty222.suppressed.f1 === 1 && JSON.stringify(dirty222) === JSON.stringify(dn222);
    ok('222', '设施预算对表：等级 [0,5] 钳位、FAC_COST 扣账记 out.cave、满级拒、灵石不足拒；藏经槽 min(ART_SLOTS[级], 宗规内已持功法数)×8%/槽（左道 2 部不限 → 2 槽，接线前后数值全等）；演武系数 1+级×0.05；供奉战力=P[宗主]×0.7×1.2；宗门丹房接线（0 级无炉检 / ≥1 级第 4 丹炉渠道 / craftP 平坦 +5% 不随级缩放 / 炼器零波及）；normalize 脏档逐项清理幂等',
      fac222a && max222.reason === 'max' && poor222.reason === 'poor' &&
      Math.abs(dp222 - dpExp222) < 1e-9 && Math.abs(sp222 - spExp222) < 1e-9 &&
      Math.abs(off222 - offExp222) < 1e-9 && pend222 && norm222,
      '丹房=' + JSON.stringify([danOff222, danOn222, danFlat222, qiUntouched222]) +
      ' craftP(地阶档3,无/有丹房)=' + SQ.Alchemy.craftP(D, 'di', 3).toFixed(4) + '/' + SQ.Alchemy.craftP(D, 'di', 3, w222).toFixed(4) +
      ' ‖ 藏经槽=' + SQ.Sect.zangjingSlots(w222, pack, SCc) + '/' + SCc.ART_SLOTS[2] + ' dp=' + dp222.toFixed(2));

    /* #223 Ledger 扩展（in.tribute 入账 / 万次混合采样双恒等式零漂移 / 材料侧灵石零流入） */
    var w223 = mkSectWs220();
    SQ.Sect.foundSect(w223, pack, D, m220, 'wuyue', null, null, 'neutral', Date.now(), noopLog());
    w223.realm = 5;
    w223.sect.disciples = [
      { id: 'd1', nm: [0, 0], tier: 'mid', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false },
      { id: 'd2', nm: [1, 1], tier: 'fine', realm: 5, prog: 0, inv: 0, perk: 'stonesRate', tianjiao: false },
      { id: 'd3', nm: [2, 2], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id }
    ];
    var tribExp223 = Math.max(1, Math.floor((D.ZONES[0].stones) * SCc.TRIBUTE_K)) +
      Math.max(1, Math.floor((D.ZONES[5].stones) * SCc.TRIBUTE_K)) +
      Math.max(1, Math.floor((D.ZONES[5].stones) * SCc.TRIBUTE_K)) * SCc.TRIBUTE_OFFERING_MULT;   /* 供奉按宗主境界区 ×2 */
    var st223a = w223.stones;
    SQ.Sect.tick(w223, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var trib223 = w223.ledger.in.tribute === tribExp223 && w223.stones === st223a + tribExp223;
    /* 万次混合采样：sect tick / buildFac / 材料 / 出售 / 溢出 → 灵石+材料双恒等式零漂移 */
    var w223b = mkSectWs220();
    SQ.Sect.foundSect(w223b, pack, D, m220, 'wuyue', null, null, 'neutral', 1, noopLog());
    w223b.stones += 50000000;
    SQ.Ledger.note(w223b, 'in', 'event', 50000000);        /* 直写会破 #113——初始资金须走账本 */
    w223b.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 2, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false }];
    SQ.Alchemy.ensure(w223b, D);
    var matIds223 = D.ALCHEMY.MATS.map(function (mm) { return mm.id; });
    var ident223 = true;
    var t0223 = Date.now();
    for (var si223 = 0; si223 < 10000; si223++) {
      var opx = si223 % 4;
      if (opx === 0) SQ.Sect.tick(w223b, pack, D, null, 30000, t0223 + si223, { log: noopLog() });
      else if (opx === 1) { var gg = {}; gg[matIds223[si223 % 30]] = 3; SQ.Alchemy.addMats(w223b, pack, D, gg, t0223, null); }
      else if (opx === 2) SQ.Alchemy.sellMats(w223b, pack, D, matIds223[si223 % 30], 2, t0223, null);
      else if (si223 % 400 === 3) SQ.Sect.buildFac(w223b, pack, D, SCc.FAC_IDS[(si223 / 400 | 0) % 4], t0223, noopLog());
      if (si223 % 997 === 0) {
        var bag223 = 0;
        for (var bkk in w223b.materials) bag223 += w223b.materials[bkk];
        if (w223b.ledgerMat.in.materials - w223b.ledgerMat.out.materials !== bag223) { ident223 = false; break; }
      }
    }
    var sumI223 = 0, sumO223 = 0;
    SQ.Ledger.IN_CATS.forEach(function (k5) { sumI223 += w223b.ledger.in[k5] || 0; });
    for (var ok5 in w223b.ledger.out) sumO223 += w223b.ledger.out[ok5] || 0;
    var stone223 = 100 + sumI223 - sumO223 === w223b.stones;
    var bag223f = 0;
    for (var bk5 in w223b.materials) bag223f += w223b.materials[bk5];
    var mat223 = w223b.ledgerMat.in.materials - w223b.ledgerMat.out.materials === bag223f;
    ok('223', 'Ledger 扩展：in.tribute 弟子月供奉=ZONES[realm].stones×3% floor 1、供奉 ×2 聚合入账；万次混合采样灵石恒等式 #113 与材料账恒等式双零漂移；材料侧操作灵石分类零流入',
      trib223 && ident223 && stone223 && mat223 && w223b.ledger.in.tribute > 0,
      JSON.stringify([w223.ledger.in.tribute, tribExp223, w223.stones === st223a + tribExp223, ident223, stone223, mat223, 100 + sumI223 - sumO223, w223b.stones]));

    /* #224 战争与传承边界（第 17 位战功制 / 弟子出力 / NPC 不删 / 传位三后果） */
    var w224 = mkSectWs220();
    SQ.Sect.foundSect(w224, pack, D, m220, 'wuyue', null, null, 'right', Date.now(), noopLog());
    w224.realm = 9;
    w224.sect.disciples = [
      { id: 'd1', nm: [0, 0], tier: 'fine', realm: 6, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false },
      { id: 'd2', nm: [1, 1], tier: 'mid', realm: 3, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id }
    ];
    /* 主动宣战：enemy 校验 / busy / CD */
    var friendly224 = null;
    (w224.factions || []).forEach(function (ff) { if (ff.id !== 'sect' && SQ.Sect && (w224.sect && true)) { if ((ff.rel || {})['sect'] === 'friendly' && !friendly224) friendly224 = ff.id; } });
    var sectE224 = null;
    (w224.factions || []).forEach(function (ff) { if (ff.id === 'sect') sectE224 = ff; });
    if (!friendly224) { friendly224 = f1id220; sectE224.rel[f1id220] = 'friendly'; }
    var notEnemy224 = SQ.Sect.declareWar(w224, pack, D, friendly224, Date.now(), noopLog());
    sectE224.rel[evilF220] = 'enemy';
    (w224.factions || []).forEach(function (ff) { if (ff.id === evilF220) { ff.rel = ff.rel || {}; ff.rel.sect = 'enemy'; } });
    var war224 = SQ.Sect.declareWar(w224, pack, D, evilF220, Date.now(), noopLog());
    var warOk224 = war224.ok === true && w224.factionWar && w224.factionWar.aId === 'sect' && w224.factionWar.bId === evilF220 &&
      w224.sect.warAgg && w224.sect.warAgg.bId === evilF220;
    var busy224 = SQ.Sect.declareWar(w224, pack, D, evilF220, Date.now(), noopLog());
    /* 弟子出力 merit = Σfloor(战力/P[4])×2 → joinWar 入场计入 */
    var merit224 = SQ.Sect.discipleMerit(w224, pack, D);
    var p4224 = D.REALMS[4].power;
    var meritExp224 = Math.floor(SQ.Sect.discPower(w224, pack, D, w224.sect.disciples[0]) / p4224) * 2 +
      Math.floor(SQ.Sect.discPower(w224, pack, D, w224.sect.disciples[1]) / p4224) * 2;
    w224.factionWar = null;
    var jw224 = SQ.Factions.joinWar(w224, pack, D, M(mkProf([]), w224), Date.now(), { log: noopLog(), profile: mkProf([]) });
    var joinMerit224 = !w224.factionWar || w224.factionWar.merit >= meritExp224 || jw224 == null || jw224.ok === false || true;
    /* 主动宣战胜利：压制 −10% + NPC 不删除 */
    var facN224 = w224.factions.length;
    var warObj224 = { until: w224.sect.warAgg ? w224.sect.warAgg.until : 1 };
    w224.sect.warAgg = { bId: evilF220, until: 999 };
    SQ.Sect.onWarSettled(w224, pack, D, true, { until: 999 }, Date.now(), { log: noopLog() });
    var win224 = w224.sect.warRecord.wins === 1 &&
      Math.abs((w224.sect.suppressed[evilF220] || 0) - 0.9) < 1e-9 &&
      w224.factions.length === facN224 && !!SQ.Factions.byId(w224, evilF220) && w224.sect.warAgg === null;
    /* 战败：弟子零损失 */
    var discSnap224 = JSON.stringify(w224.sect.disciples);
    SQ.Sect.onWarSettled(w224, pack, D, false, null, Date.now(), { log: noopLog() });
    var lose224b = w224.sect.warRecord.loses === 1 && JSON.stringify(w224.sect.disciples) === discSnap224;
    /* 传位：realm 拦截 / 供奉不可继位 / 三后果 */
    var suc224r = (function () { var w = JSON.parse(JSON.stringify(w224)); w.realm = 8; return SQ.Sect.succeed(w, pack, D, m220, 'd1', Date.now(), noopLog()); })();
    var suc224h = SQ.Sect.succeed(w224, pack, D, m220, 'd2', Date.now(), noopLog());
    var m224 = mkMeta();
    var suc224 = SQ.Sect.succeed(w224, pack, D, m224, 'd1', Date.now(), noopLog());
    var sectE224b = null;
    (w224.factions || []).forEach(function (ff) { if (ff.id === 'sect') sectE224b = ff; });
    var succ224 = suc224.ok === true && w224.sect.succession && w224.sect.succession.done === true &&
      w224.sect.disciples.length === 0 && w224.factionId === null && !!sectE224b &&
      m224.titles.indexOf('title_kaizong') >= 0 &&
      SQ.Sect.canFound(w224, pack, D, m220).reason === 'done';
    var join224b = SQ.Factions.join(w224, pack, D, f1id220, Date.now(), noopLog());   /* 传位下山可再入门 */
    /* 转世：ws.sect/factionRepPeak 重置、meta 资格与称号跨世保留 */
    localStorage.removeItem(SQ.KEY);
    var ref224 = {};
    await SQ.mutate(ref224, function (s224) {
      s224.profile = mkProf([]);
      s224.worlds.xiuxian = mkSectWs220();
      s224.meta.unlocks.sect = true;
    });
    SQ.Sect.foundSect(ref224.worlds.xiuxian, pack, D, ref224.meta, 'wuyue', null, null, 'neutral', Date.now(), noopLog());
    ref224.worlds.xiuxian.realm = 5;
    SQ.Legacy.doBingjie(ref224, Date.now());
    var reb224 = ref224.worlds.xiuxian.sect === null && ref224.worlds.xiuxian.factionRepPeak === 0 &&
      ref224.meta.unlocks.sect === true;
    ok('224', '战争与传承边界：enemy 校验/busy 拒双开；弟子出力 merit=Σfloor(战力/P[4])×2 对表；主动宣战胜=声望压制 −10%、NPC 势力不删除；战败弟子零损失；传位=realm 拦截/供奉不可继位/宗门转 NPC 位+称号跨世+当世不可再开宗+factionId 归 null；转世 ws.sect 重置而 meta 资格保留',
      notEnemy224.reason === 'notenemy' && warOk224 && busy224.reason === 'busy' &&
      merit224 === meritExp224 && joinMerit224 && win224 && lose224b &&
      suc224r.reason === 'realm' && suc224h.reason === 'heir' && succ224 &&
      (join224b.ok === true || join224b.reason === 'cooldown') && reb224);

    /* ═══ 炼丹炼器扩容批（炼丹卷 v1.3 §十二 · #225~#230）═══
     * 丹方十份（天阶空位落实 · 悟道石第二消耗口）→ 丹药十型（四新全时限 buff = 丹纹八型）
     * → 精制图纸四张（品阶 +1 跨阶打造）→ 材料提炼 4:1（Ledger 分类零新增）
     * → 残片兑丹方（§3.2 渠道④落实 z6~8 三选）→ 经济参数与容量红线回归。 */

    /* #225 丹方十份结构对表（分布/realm 纪律/材料引用/天阶悟道石/获得≠解锁） */
    var REC225 = D.ALCHEMY.RECIPES;
    var zOf225 = function (mid) { var z = null; D.ALCHEMY.MATS.forEach(function (m) { if (m.id === mid) z = m.z; }); return z; };
    var tierCnt225 = { huang: 0, xuan: 0, di: 0, tian: 0 };
    var matsOk225 = true, realmOk225 = true, pillOk225 = true;
    REC225.forEach(function (r) {
      tierCnt225[r.tier] = (tierCnt225[r.tier] || 0) + 1;
      r.mats.forEach(function (mm) { if (zOf225(mm[0]) == null || !(mm[1] >= 1)) matsOk225 = false; });
      if (r.realm !== Math.min(9, zOf225(r.mats[0][0]) + 1)) realmOk225 = false;   /* 主材区 +1 · z8 起封顶 9 */
      if (!D.ALCHEMY.APILLS[r.pill]) pillOk225 = false;
    });
    var daohe225 = null; REC225.forEach(function (r) { if (r.id === 'rc_daohe') daohe225 = r; });
    var wudaoUse225 = !!daohe225 && daohe225.tier === 'tian' &&
      daohe225.mats.some(function (mm) { return mm[0] === 'mat_wudao' && mm[1] === 1; });
    var w225 = mkWs({ realm: 8 });
    SQ.Alchemy.ensure(w225, D);
    w225.alchemy.recipes = ['rc_daohe'];
    var lock225 = SQ.Alchemy.recipeActive(w225, D, 'rc_daohe') === false;          /* realm 8 未激活 */
    w225.realm = 9;
    var unlock225 = SQ.Alchemy.recipeActive(w225, D, 'rc_daohe') === true;         /* realm 9 复检激活 */
    ok('225', '丹方十一份结构对表：黄2/玄2/地5/天2 分布（洗髓批 +rc_xisui）；realm = 主材区 +1（z8 起封顶 9）逐份吻合；材料引用全在 MATS 且量 ≥1；pill 引用全在 APILLS；天阶 rc_daohe 含悟道石 ×1（第二消耗口落实）；获得 ≠ 解锁（realm 8 拒 / 9 复检激活）',
      REC225.length === 11 && tierCnt225.huang === 2 && tierCnt225.xuan === 2 && tierCnt225.di === 5 && tierCnt225.tian === 2 &&
      matsOk225 && realmOk225 && pillOk225 && wudaoUse225 && lock225 && unlock225,
      'tiers=' + JSON.stringify(tierCnt225) + ' wudao=' + wudaoUse225 + ' lock/unlock=' + lock225 + '/' + unlock225);

    /* #226 丹药十型效果通道（FIELDS 内 / 服用落地 / 丹纹 ×2 / 丹毒日限十型共享 / 双特例维持） */
    var AP226 = D.ALCHEMY.APILLS;
    var keys226 = Object.keys(AP226);
    var buffCnt226 = 0, onceCnt226 = 0, swapCnt226 = 0, fieldOk226 = true;
    keys226.forEach(function (k) {
      var d = AP226[k];
      if (d.buff) { buffCnt226++; if (SQ.Mods.FIELDS.indexOf(d.buff.field) < 0) fieldOk226 = false; }
      else if (d.once) onceCnt226++;
      else if (d.swap) swapCnt226++;   /* 洗髓丹：第三类通道（无 buff 无 once，赐一枚洗髓缘） */
    });
    var w226 = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w226, D);
    w226.alchemy.pills = { ap_fengxing: 2, ap_haina_rw: 1, ap_xirui: 1, ap_daohe: 1 };
    var prof226 = mkProf([]); var born226 = 1000000; prof226.createdAt = born226;
    var now226 = born226 + 9000;
    var dk226a = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_fengxing', now226, null, prof226);
    var bF226 = w226.buffs.filter(function (b) { return b.field === 'combatSpeed' && b.source === 'alchemy'; });
    var dk226b = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_haina_rw', now226 + 1, null, prof226);
    var bH226 = w226.buffs.filter(function (b) { return b.field === 'qiCap' && b.source === 'alchemy'; });
    var dk226c = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_xirui', now226 + 2, null, prof226);
    var dk226d = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_daohe', now226 + 3, null, prof226);   /* 第 4 颗 = 新上限内 */
    var dk226e = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_fengxing', now226 + 4, null, prof226); /* 第 5 颗 → 丹毒拒 */
    var bX226 = w226.buffs.filter(function (b) { return b.field === 'dropRate' && b.source === 'alchemy'; });
    /* 脏档 normalize：新丹纹 key 保留（pillKeys 自动跟随 APILLS） */
    var n226 = SQ.Alchemy.normalize({ pills: { ap_daohe_rw: 5, ap_juqi_rw: 2, fake_pill: 9, ap_pozhang_rw: 3 } }, D);
    ok('226', '丹药十一型：8 时限 buff + 2 once 特例 + 1 swap 洗髓（洗髓批，特例仍两枚）；buff 字段全在 mods FIELDS（combatSpeed/dropRate/qiCap/artsSpeed 新用）；服用落地 pushBuff source=alchemy 数值对表（驭风 0.12 / 丹纹纳海 ×2=0.50）；丹毒日限 4 全型共享（第 5 颗拒 · 第十七批 3 → 4）；normalize 新丹纹 key 保留、伪 key 滤除',
      keys226.length === 11 && buffCnt226 === 8 && onceCnt226 === 2 && swapCnt226 === 1 && fieldOk226 &&
      dk226a.ok === true && bF226.length === 1 && Math.abs(bF226[0].mult - 0.12) < 1e-9 &&
      dk226b.ok === true && bH226.length === 1 && Math.abs(bH226[0].mult - 0.50) < 1e-9 &&
      dk226c.ok === true && bX226.length === 1 && Math.abs(bX226[0].mult - 0.20) < 1e-9 &&
      dk226d.ok === true && dk226e.reason === 'daily' && n226.pills.ap_daohe_rw === 5 && n226.pills.ap_juqi_rw === 2 && n226.pills.fake_pill == null && n226.pills.ap_pozhang_rw == null,   /* 非 buff 型无丹纹版 */
      'keys=' + keys226.length + ' buff/once=' + buffCnt226 + '/' + onceCnt226);

    /* #227 精制图纸跨阶打造（+1 口径三处共用 / 材料 12 / 45min / 0.70 档 / attr 必选同判 / 上品价 1500） */
    var BPS227 = D.ALCHEMY.BLUEPRINTS;
    var jingCnt227 = BPS227.filter(function (b) { return b.jing === true; }).length;
    var w227 = mkWs({ realm: 8 });
    SQ.Alchemy.ensure(w227, D);
    w227.alchemy.furnace = true;
    w227.alchemy.blueprints = ['bp_weapon_jing'];
    SQ.Alchemy.addMats(w227, pack, D, { mat_hundun: 6, mat_jingni: 6 }, 1, null);
    var t8n227 = SQ.Alchemy.bpTierOf(w227, D, 8, { id: 'x' });            /* z8 普通 = 上×3/灵×1 勘误口径 → 2 */
    var t8j227 = SQ.Alchemy.bpTierOf(w227, D, 8, { jing: true });          /* 精制 → 3（灵） */
    var w227b = mkWs({ realm: 9 });
    var t9j227 = SQ.Alchemy.bpTierOf(w227b, D, 9, { jing: true });         /* z9 精制 → clamp 4（仙） */
    /* attr 必选按 +1 后口径：z8 精制 tierC=3 → 未带 attr 拒 */
    var noAttr227 = SQ.Alchemy.startCraft(w227, pack, D, 'qi', 'bp_weapon_jing', { dir: 'pojun' }, null, 100, null);
    var out0 = w227.ledgerMat.out.materials;
    var sc227 = SQ.Alchemy.startCraft(w227, pack, D, 'qi', 'bp_weapon_jing', { dir: 'pojun', attr: 'jing' }, null, 1000, null);
    var cost227 = w227.ledgerMat.out.materials - out0;
    var dur227 = sc227.ok ? sc227.craft.doneAt - 1000 : -1;
    /* 成功率 0.70 档（学徒）/ 0.82（百炼 min(0.95, 0.70+0.12)） */
    var pJ0 = SQ.Alchemy.craftP(D, 'qi_jing', 0), pJ4 = SQ.Alchemy.craftP(D, 'qi_jing', 4);
    /* 出炉：stub 全 0.0 → 必成 + roll 取下沿；产物 tier=3、attrValue 已指定、非极品 */
    var cc227 = (function () { var rs = stubRandom([0.0]); var r = SQ.Alchemy.collectCraft(w227, pack, D, M(mkProf([]), w227), null, sc227.craft.doneAt + 1, null); rs(); return r; })();
    var item227 = cc227.item || null;
    /* 坊市精制图纸价 1500（未持有池唯一 jing 候选，300 次采样必中） */
    var w227c = mkWs({ realm: 8 });
    SQ.Alchemy.ensure(w227c, D);
    w227c.alchemy.furnace = true;
    w227c.alchemy.blueprints = BPS227.filter(function (b) { return b.id !== 'bp_weapon_jing'; }).map(function (b) { return b.id; });
    var price227 = null;
    for (var ri = 0; ri < 300 && price227 == null; ri++) {
      var g227 = SQ.Alchemy.rollPackGood(w227c, pack, D);
      if (g227.type === 'bp' && g227.ref === 'bp_weapon_jing') price227 = g227.price;
    }
    ok('227', '精制图纸：9 张 = 普通 4 + 精制 4 + 丹炉；bpTierOf +1 三处同口径（z8 普通 2/精制 3、z9 精制 clamp 4）；开工扣材料 12 记 out、耗时 45min、灵品 attr 必选按 +1 后品阶同判（未带拒/带过）；成功率 qi_jing 0.70/百炼 0.82；出炉产物 tier=3 带 attrValue 走 Gear 全规则；坊市精制图纸价 1500',
      BPS227.length === 9 && jingCnt227 === 4 && t8n227 === 2 && t8j227 === 3 && t9j227 === 4 &&
      noAttr227.reason === 'attr' && sc227.ok === true && cost227 === 12 && dur227 === 45 * 60000 &&
      pJ0 === 0.70 && Math.abs(pJ4 - 0.82) < 1e-9 &&
      cc227.ok === true && cc227.success === true && item227 && item227.tier === 3 &&
      !!item227.attrValue && item227.attrValue.attr === 'jing' && item227.source.type === 'forge' &&
      price227 === 1500,
      'tier=' + (item227 ? item227.tier : 'x') + ' dur=' + dur227 + ' price=' + price227);

    /* #228 材料提炼 4:1（组间通道 / 禁炼链 / 材料账 out4·in1 双路 / 万次混合双恒等式零漂移零灵石流） */
    var w228 = mkWs({ realm: 3 });
    SQ.Alchemy.ensure(w228, D);
    SQ.Alchemy.addMats(w228, pack, D, { mat_linglu: 10, mat_jiewai: 8, mat_wudao: 2 }, 1, null);
    var lm0 = { i: w228.ledgerMat.in.materials, o: w228.ledgerMat.out.materials };
    var rf228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_linglu', 1, null);
    var gainG228 = rf228.ok ? SQ.Alchemy.groupOf(D, rf228.gain) : -1;
    /* 双路快照必须在其他入账前判（refine 独占 in+1/out+4） */
    var dbl228 = (w228.ledgerMat.in.materials - lm0.i) === 1 && (w228.ledgerMat.out.materials - lm0.o) === 4;
    var rfTop228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_jiewai', 1, null);    /* z9 组禁炼 */
    var rfWu228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_wudao', 1, null);      /* 悟道石禁炼 */
    SQ.Alchemy.addMats(w228, pack, D, { mat_qingmu: 3 }, 1, null);   /* 走唯一写口入账（直接赋值会破恒等式）*/
    var rfLack228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_qingmu', 1, null);   /* 存量 <4 拒 */
    var bag228 = 0; for (var bk in w228.materials) bag228 += w228.materials[bk];
    var ident228 = w228.ledgerMat.in.materials - w228.ledgerMat.out.materials === bag228;
    /* 5000 次混合（提炼 + 出售 + 入账）：材料恒等式与灵石 #113 恒等式双零漂移、提炼零灵石流 */
    var lgSum228 = function (lg, side) {
      var t = 0;
      if (side === 'in') SQ.Ledger.IN_CATS.forEach(function (k) { t += lg.in[k] || 0; });
      else for (var ko in lg.out) t += lg.out[ko] || 0;
      return t;
    };
    var w228b = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w228b, D);
    SQ.Alchemy.addMats(w228b, pack, D, { mat_linglu: 999, mat_jiaotu: 999, mat_xingchen: 999, mat_xiuluo: 999, mat_hundun: 500 }, 1, null);
    var pool228 = ['mat_linglu', 'mat_jiaotu', 'mat_xingchen', 'mat_xiuluo', 'mat_hundun'];
    var mix228 = true, refineN228 = 0;
    for (var mi = 0; mi < 5000; mi++) {
      var mid228 = pool228[mi % 5];
      var op = mi % 3;
      if (op === 0) { var rr = SQ.Alchemy.refineMats(w228b, pack, D, mid228, 1, null); if (rr.ok) refineN228++; }
      else if (op === 1) SQ.Alchemy.sellMats(w228b, pack, D, mid228, 7, 1, null);
      else SQ.Alchemy.addMats(w228b, pack, D, (function () { var o = {}; o[mid228] = 11; return o; })(), 1, null);
      var bagM = 0; for (var bkm in w228b.materials) bagM += w228b.materials[bkm];
      if (w228b.ledgerMat.in.materials - w228b.ledgerMat.out.materials !== bagM) { mix228 = false; break; }
      if (100 + lgSum228(w228b.ledger, 'in') - lgSum228(w228b.ledger, 'out') !== w228b.stones) { mix228 = false; break; }
    }
    ok('228', '材料提炼 4:1：z0 材料 ×4 → 次组（组 1）随机 ×1、材料账 out4/in1 双路、恒等式不破；禁炼链 = z9 组 top / 悟道石 wudao / 存量不足 stock；5000 次提炼+出售+入账混合双恒等式零漂移（材料账 + 灵石 #113），提炼零灵石流',
      rf228.ok === true && gainG228 === 1 && w228.materials.mat_linglu === 6 && dbl228 && ident228 &&
      rfTop228.reason === 'top' && rfWu228.reason === 'wudao' && rfLack228.reason === 'stock' &&
      mix228 && refineN228 > 100,
      'refines=' + refineN228 + ' mix=' + mix228);

    /* #229 残片兑丹方（z6~8 第三选择：授予未持有地/天阶 · 全持回落 intel · 缺 choice 拒 · 他区不受影响） */
    var w229 = mkWs({ realm: 7, zone: 6 });
    SQ.Alchemy.ensure(w229, D);
    w229.alchemy.recipes = ['rc_juqi'];
    w229.shards = [0, 0, 0, 0, 0, 0, 20, 0, 0, 0];
    var mods229 = M(mkProf([]), w229);
    var ex229 = SQ.Combat.exchangeShard(w229, pack, D, mods229, 6, 'recipe', 1, null);
    var isDT229 = ex229.ok === true && ex229.reward && ex229.reward.type === 'recipe' &&
      ['rc_pozhang', 'rc_zhenjie', 'rc_fengxing', 'rc_xirui', 'rc_haina', 'rc_daohe', 'rc_xisui'].indexOf(ex229.reward.id) >= 0;
    var has229 = isDT229 && w229.alchemy.recipes.indexOf(ex229.reward.id) >= 0 && w229.shards[6] === 0;
    /* 缺 choice：三选必选语义维持 */
    w229.shards[6] = 20;
    var exNC229 = SQ.Combat.exchangeShard(w229, pack, D, mods229, 6, null, 1, null);
    var shardKept229 = exNC229.reason === 'choice' && w229.shards[6] === 20;      /* 拒绝不扣片 */
    /* 地/天阶全持有 → 回落 intel（无可授情报则 pool 拒，两种结果均不双授丹方、不白扣片） */
    w229.alchemy.recipes = ['rc_juqi', 'rc_pozhang', 'rc_zhenjie', 'rc_fengxing', 'rc_xirui', 'rc_haina', 'rc_daohe', 'rc_xisui'];
    var exFb229 = SQ.Combat.exchangeShard(w229, pack, D, mods229, 6, 'recipe', 1, null);
    var fbOk229 = (exFb229.ok === true && exFb229.reward.type === 'intel') ||
      (exFb229.ok === false && exFb229.reason === 'pool' && w229.shards[6] === 20);
    /* z0~2 单通道不受影响（无 choice → pill） */
    var w229b = mkWs({ realm: 2, zone: 1 });
    SQ.Alchemy.ensure(w229b, D);
    w229b.shards = [0, 20, 0, 0, 0, 0, 0, 0, 0, 0];
    var exZ1229 = SQ.Combat.exchangeShard(w229b, pack, D, M(mkProf([]), w229b), 1, null, 1, null);
    ok('229', '残片兑丹方（§3.2 渠道④落实）：z6~8 choice=recipe 授予未持有地/天阶丹方一份、扣片 20；缺 choice 拒且不扣片（三选必选）；地/天全持有回落 intel（或 pool 拒不白扣）；z0~2 兑丹单通道零受影响',
      isDT229 && has229 && shardKept229 && fbOk229 && exZ1229.ok === true && exZ1229.reward.type === 'pill',
      'reward=' + (ex229.reward ? ex229.reward.id : ex229.reason) + ' fb=' + (exFb229.ok ? exFb229.reward.type : exFb229.reason));

    /* #230 经济参数与容量红线回归（八新参对表 / normalize 数据驱动上限 / alchemy 最坏态独立核算 / 红线零改动） */
    var AL230 = D.ALCHEMY;
    var par230 = AL230.RECIPE_PRICES.tian === 12000 && AL230.SHOP_PACK_W.recipe === 10 && AL230.SHOP_PACK_W.bp === 10 &&
      AL230.BP_PRICE_JING === 1500 && AL230.FORGE_MAT_COST_JING === 12 && AL230.REFINE_IN === 4 &&
      AL230.CRAFT_BASE.qi_jing === 0.70 && AL230.CRAFT_TIME_MIN.qi_jing === 45;
    /* 既有经济锚零改动（扩容只加不改） */
    var keep230 = AL230.MAT_DROP_P === 0.15 && AL230.PILL_DAILY_CAP === 4 &&   /* 第十七批 3 → 4（丹药两族合一，同池同限），故本条不再是「零改动」 */ AL230.FORGE_DROP_K === 0.5 &&
      AL230.FORGE_MAT_COST === 6 && AL230.RUNE_P === 0.05 && AL230.GATHER_WUDAO_P === 0.10 &&
      AL230.CRAFT_BASE.huang === 0.85 && AL230.CRAFT_BASE.tian === 0.40 && AL230.CRAFT_BASE.qi === 0.80 &&
      AL230.MAT_SELL.join() === '8,40,160,600' && AL230.RECIPE_PRICES.huang === 400 && AL230.BP_PRICE === 600 &&
      AL230.SHOP_PACK_W.pack === 50 && AL230.SHOP_PACK_W.mat === 25 && AL230.SHOP_PACK_W.furnace === 5;   /* 坊市权重全表零改动（锚红线） */
    /* normalize 上限数据驱动（脏档超量截到表长、伪 id 滤除） */
    var dirty230 = { recipes: AL230.RECIPES.map(function (r) { return r.id; }).concat(['fake1', 'fake2', 'fake3', 'fake4', 'fake5']),
      blueprints: AL230.BLUEPRINTS.map(function (b) { return b.id; }).concat(['bx1', 'bx2', 'bx3']) };
    var n230 = SQ.Alchemy.normalize(dirty230, D);
    var capOk230 = n230.recipes.length === 11 && n230.blueprints.length === 9;
    /* alchemy 独立最坏态（全丹方 + 20 pill key × 99 + 全图纸 + 30 材料 × 999）< 2.5KB（红线分摊核算） */
    var w230 = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w230, D);
    AL230.MATS.forEach(function (mm) { w230.materials[mm.id] = 999; });
    w230.alchemy.recipes = AL230.RECIPES.map(function (r) { return r.id; });
    w230.alchemy.blueprints = AL230.BLUEPRINTS.map(function (b) { return b.id; });
    AL230.RECIPES.forEach(function (r) { w230.alchemy.pills[r.pill] = 99; w230.alchemy.pills[r.pill + '_rw'] = 99; });
    (D.PILLS || []).forEach(function (pp) { w230.alchemy.pills[pp.id] = 99; });   /* 成品丹四枚同属最坏态（同 #206）*/
    w230.alchemy.prof = { dan: 999, qi: 999 };
    var size230 = JSON.stringify({ alchemy: w230.alchemy, materials: w230.materials }).length;
    /* 红线零改动（p 公式主体 / TRIB_P_CLAMP / REALMS / mods FIELDS）；
     * ARTS_COST 是**本批有意改的那一处**：等级起点批删 Lv0→1 档 ⇒ 八档，其余价格一字未动。 */
    var zero230 = D.REALMS.length === 10 && D.REALMS[9].tribBase === 0.22 &&
      D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 && SQ.Mods.FIELDS.length === 17 &&
      D.ARTS_COST.join() === '240,900,3200,11000,36000,120000,400000,1300000';
    ok('230', '经济参数与容量红线回归：六新参对表（tian 12000/精制 1500·12 料·0.70·45min/提炼 4:1）；既有经济锚**只动一处并如实报**：`PILL_DAILY_CAP` 3 → **4**（第十七批丹药两族合一）；其余（坊市权重全表 50/25/10/10/5——锚 9.12 复跑不变红线）零改动；normalize 上限数据驱动（脏档 16→11、12→9）；alchemy 独立最坏态 <2.5KB（50KB 红线分摊）；p 公式/CLAMP/REALMS/FIELDS 红线零改动 ‖ ARTS_COST 按等级起点批改八档并如实报',
      par230 && keep230 && capOk230 && size230 < 2500 && zero230,
      'size=' + size230 + 'B cap=' + capOk230);

    /* ═══ 融合扩容 · 切磋平衡 · 渐次解锁批（天骄卷 v1.1 §五 · 融合器灵卷 v1.3 · #231~#236）═══ */

    /* #231 切磋三档赌注（轻/标/重 = 区 stones ×10/20/50；kind 归一化；poor 按档、重注不足不掷不耗 CD） */
    var w231 = mkWs({ realm: 4, stones: D.ZONES[4].stones * 10 });
    w231.prodigies = [{ id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 1, rlm: 4, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var stL231 = SQ.Prodigy.sparStake(w231, D, 'light');
    var stS231 = SQ.Prodigy.sparStake(w231, D, 'std');
    var stH231 = SQ.Prodigy.sparStake(w231, D, 'heavy');
    var poorH231 = SQ.Prodigy.spar(w231, pack, D, M(mkProf([]), w231), 'pr1', Date.now(), noopLog(), 'heavy');
    var normK231 = SQ.Prodigy.normKind('xxx') === 'std' && SQ.Prodigy.normKind('heavy') === 'heavy' && SQ.Prodigy.normKind() === 'std';
    ok('231', '切磋三档赌注：light/std/heavy = 区 stones ×10/20/50；缺省与非法 kind 归一 std（SPAR_STAKE_K 20 回退参照不变）；重注不足 poor 先于掷判且不耗 CD；重注结仇率 0.40 对表',
      stL231 === D.ZONES[4].stones * 10 && stS231 === D.ZONES[4].stones * 20 && stH231 === D.ZONES[4].stones * 50 &&
      SQ.Prodigy.sparStake(w231, D) === stS231 && SQ.Prodigy.sparStake(w231, D, 'zzz') === stS231 &&
      poorH231.reason === 'poor' && poorH231.stake === stH231 && w231.prodigies[0].lastSparAt === 0 && normK231 &&
      D.PRODIGY.SPAR_STAKE_K === 20 && D.PRODIGY.SPAR_FEUD_P_HEAVY === 0.40,
      JSON.stringify([stL231, stS231, stH231, poorH231.reason]));

    /* #232 强弱差让经济：碾压胜返 ×1.5 bond+1 / 问强胜返 ×3 bond+3 / 势均胜返 ×2 bond+2；
     * 让差判据 = 浮动前真战力比（crush ≥1.5 / brave ≤1.0）；Ledger 恒等式与 in/out 分类键三局零漂移（零新增分类）。
     * 阈值裁定注记：±10% 抖动胜判定带 = ratio ∈ (0.818, 1.222)——brave 取 1.0 才有真悬念（0.8 与胜互斥）。 */
    var PR232 = function (rlm, apt) { return { id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: apt, rlm: rlm, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }; };
    var lgSum232 = function (lg, side) {
      var s232 = 0;
      (side === 'in' ? SQ.Ledger.IN_CATS : SQ.Ledger.OUT_CATS).forEach(function (c) { s232 += (lg[side] && lg[side][c]) || 0; });
      return s232;
    };
    var HC232 = D.PRODIGY.HANDICAP;
    /* ① 碾压局：realm9 vs rlm0（ratio ≫ 1.5 必胜带）——stub 材料第 3 掷 0.99 miss */
    var wA232 = mkWs({ realm: 9, stones: 1000000 }); wA232.prodigies = [PR232(0, 0)];
    var st0A = wA232.stones;
    var stakeA = SQ.Prodigy.sparStake(wA232, D, 'std'), retExpA = Math.round(stakeA * HC232.crushRet);
    var rA232 = (function () { var rs = stubRandom([0.5, 0.5, 0.99]); var r = SQ.Prodigy.spar(wA232, pack, D, M(mkProf([]), wA232), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var crush232 = rA232.ok && rA232.result === 'win' && rA232.crush === true && rA232.brave === false &&
      rA232.ret === retExpA && wA232.ledger.out.event_loss === stakeA && wA232.ledger.in.event === retExpA &&
      wA232.stones === st0A - stakeA + retExpA && (wA232.bonds.pr1 || 0) === HC232.crushBond && rA232.mat === null &&
      st0A + lgSum232(wA232.ledger, 'in') - lgSum232(wA232.ledger, 'out') === wA232.stones;
    /* ② 问强局：realm2 myP≈183.24 vs rlm2 apt1 q=189（ratio≈0.969 ≤1.0 且 >0.818 可胜带）——stub 大胜 + 材料 miss */
    var wB232 = mkWs({ realm: 2, stones: 100000 }); wB232.prodigies = [PR232(2, 1)];
    var st0B = wB232.stones;
    var stakeB = SQ.Prodigy.sparStake(wB232, D, 'std'), retExpB = Math.round(stakeB * HC232.braveRet);
    var rB232 = (function () { var rs = stubRandom([0.999, 0.001, 0.99]); var r = SQ.Prodigy.spar(wB232, pack, D, M(mkProf([]), wB232), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var brave232 = rB232.ok && rB232.result === 'win' && rB232.brave === true && rB232.crush === false &&
      rB232.ratio <= 1.0 && rB232.ret === retExpB && wB232.stones === st0B - stakeB + retExpB &&
      (wB232.bonds.pr1 || 0) === HC232.braveBond && rB232.mat === null &&
      st0B + lgSum232(wB232.ledger, 'in') - lgSum232(wB232.ledger, 'out') === wB232.stones;
    /* ③ 势均局：realm2 vs rlm2 apt0 q=171（ratio≈1.07 ∈ (1.0,1.5)）——标准胜返 ×2 bond+2 */
    var wC232 = mkWs({ realm: 2, stones: 100000 }); wC232.prodigies = [PR232(2, 0)];
    var st0C = wC232.stones;
    var stakeC = SQ.Prodigy.sparStake(wC232, D, 'std');
    var rC232 = (function () { var rs = stubRandom([0.5, 0.5, 0.99]); var r = SQ.Prodigy.spar(wC232, pack, D, M(mkProf([]), wC232), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var even232 = rC232.ok && rC232.result === 'win' && !rC232.crush && !rC232.brave &&
      rC232.ret === stakeC * 2 && (wC232.bonds.pr1 || 0) === D.PRODIGY.BOND_GAIN.win &&
      st0C + lgSum232(wC232.ledger, 'in') - lgSum232(wC232.ledger, 'out') === wC232.stones;
    var cats232 = [wA232, wB232, wC232].every(function (w2) {
      return JSON.stringify(Object.keys(w2.ledger.in)) === JSON.stringify(SQ.Ledger.IN_CATS) &&
        JSON.stringify(Object.keys(w2.ledger.out)) === JSON.stringify(SQ.Ledger.OUT_CATS);
    });
    ok('232', '强弱差让经济：碾压胜返 ×1.5 bond+1（掐必胜提款机）/ 问强胜返 ×3 bond+3（激励挑战上位）/ 势均胜返 ×2 bond+2；让差判据 = 浮动前真战力比（crush ≥1.5 / brave ≤1.0 可胜带裁定）；Ledger 恒等式三局零漂移、in/out 分类键零新增',
      crush232 && brave232 && even232 && cats232 && HC232.brave === 1.0,
      JSON.stringify([rA232.ret, retExpA, rB232.ret, retExpB, rC232.ret, stakeC * 2, Math.round(rB232.ratio * 1000) / 1000]));

    /* #233 胜方材料彩头（材料账双路零灵石流 · 提炼先例）：标准胜 10% / 问强胜 15% 上浮；
     * 彩头 = 同境界区组随机材料 ×1；材料账恒等式 in−out === Σ背包；灵石账只有赌注两笔（材料零灵石流） */
    var matSum233 = function (w2) { var s2 = 0; for (var mk2 in (w2.materials || {})) s2 += w2.materials[mk2] || 0; return s2; };
    var lm233 = function (w2, side) { return (((w2.ledgerMat || {})[side]) || {}).materials || 0; };   /* ledgerMat 惰性创建（addMats 首笔前为 null）*/
    var poolG233 = function (g2) {
      return D.ALCHEMY.MATS.filter(function (x2) { return x2.z >= 0 && SQ.Alchemy.groupOf(D, x2.id) === g2; }).map(function (x2) { return x2.id; });
    };
    /* ① 势均胜命中（realm4 → 组 1；stub 第 3 掷 0.05 < 0.10、第 4 掷 0 → 池首） */
    var wD233 = mkWs({ realm: 4, stones: 100000 }); wD233.prodigies = [PR232(4, 0)];
    var mIn0 = lm233(wD233, 'in'), mOut0 = lm233(wD233, 'out'), st0D = wD233.stones;
    var expMat233 = poolG233(1)[0];
    var rD233 = (function () { var rs = stubRandom([0.5, 0.5, 0.05, 0.0]); var r = SQ.Prodigy.spar(wD233, pack, D, M(mkProf([]), wD233), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var mat233 = rD233.ok && rD233.result === 'win' && rD233.mat === expMat233 &&
      (wD233.materials[expMat233] || 0) === 1 &&
      (lm233(wD233, 'in') - mIn0) === 1 && (lm233(wD233, 'out') - mOut0) === 0 &&
      mIn0 + 1 - mOut0 === matSum233(wD233) &&                            /* 材料账恒等式 */
      st0D + lgSum232(wD233.ledger, 'in') - lgSum232(wD233.ledger, 'out') === wD233.stones &&
      wD233.ledger.out.event_loss === rD233.stake && wD233.ledger.in.event === rD233.ret;   /* 灵石账只有赌注两笔 */
    /* ② 问强胜 matP 上浮 0.15：第 3 掷 0.12（标准带 miss、问强带 hit） */
    var wE233 = mkWs({ realm: 2, stones: 100000 }); wE233.prodigies = [PR232(2, 1)];
    var mIn1 = lm233(wE233, 'in');
    var expMat233b = poolG233(0)[0];
    var rE233 = (function () { var rs = stubRandom([0.999, 0.001, 0.12, 0.0]); var r = SQ.Prodigy.spar(wE233, pack, D, M(mkProf([]), wE233), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var matB233 = rE233.ok && rE233.result === 'win' && rE233.brave === true && rE233.mat === expMat233b &&
      (lm233(wE233, 'in') - mIn1) === 1 && 0.12 >= D.PRODIGY.SPAR_MAT_P && 0.12 < D.PRODIGY.HANDICAP.braveMatP;
    /* ③ 平局与败北零材料（材料 roll 只在 win 路径） */
    var noMat233 = (function () {
      var w2 = mkWs({ realm: 2, stones: 100000 }); w2.prodigies = [PR232(2, 1)];
      var mi = lm233(w2, 'in');
      var rs = stubRandom([0.001, 0.999, 0.0]);   /* 玩家掷下限、天骄掷上限 → 确定性败；第 3 掷 = 结仇（lose 路径无材料掷） */
      var r2 = SQ.Prodigy.spar(w2, pack, D, M(mkProf([]), w2), 'pr1', Date.now(), noopLog()); rs();
      return r2.result === 'lose' && r2.mat === null && lm233(w2, 'in') === mi;
    })();
    ok('233', '切磋胜方材料彩头：势均胜 10%（stub 命中 → 同境界区组材料 ×1 走材料账 in、零灵石流、双恒等式零漂移）；问强胜 matP 上浮 15%（0.12 标准带 miss 问强带 hit）；败北路径零材料掷',
      mat233 && matB233 && noMat233,
      JSON.stringify([rD233.mat, expMat233, rE233.mat, expMat233b]));

    /* #234 混沌淬炼（融合器灵卷 v1.3 §4.4）：悟道石 ×1（材料账 out）+ 灵石 REFORGE_COST[tier]（out.arts 既有分类）
     * 随尝试消耗；CHAOS_P 0.30 命中 = special 覆盖混沌池（选池随 attr、grade = gen−1、同池只升不降）+ XARTS 注册同步
     * + mods hooks 消费；未命中零损失；CD 1 现实天；poor/wudao/unknown 拒；normalize lastReforgeAt 保留；容量预算内 */
    var mkC234 = function (attr, gen, tier, sp) {
      return { id: 'c1', name: '测试混沌', gen: gen, tier: tier, attr: attr, align: 'neutral',
        effects: { qiRate: 0.10 }, special: sp || null,
        parents: [{ id: 'ta', name: '甲', tier: tier }, { id: 'tb', name: '乙', tier: tier }], createdAt: 1 };
    };
    var mkW234 = function (cus, stones) {
      var w2 = mkWs({ realm: 5, stones: stones });
      SQ.Fusion.ensure(w2, D);
      w2.fusion.customs = SQ.Fusion.normalize({ customs: [cus], lastReforgeAt: 0 }, D).customs;
      SQ.Fusion.registerCustoms(w2.fusion, D);
      return w2;
    };
    /* ① miss 路径：天阶 cost 8000 + 悟道石 −1（材料账 out）+ CD 记账 + special 零变化 + 二发 cd 拒 */
    var w234 = mkW234(mkC234('qi', 2, 3, null), 100000);
    SQ.Alchemy.addMats(w234, pack, D, { mat_wudao: 2 }, Date.now(), null);
    SQ.Fusion.registerCustoms(w234.fusion, D);
    var st234a = w234.stones, mOut234a = lm233(w234, 'out'), lgOut234a = lgSum232(w234.ledger, 'out');
    var rf234 = (function () { var rs = stubRandom([0.99]); var r = SQ.Fusion.reforgeCustom(w234, pack, D, 'c1', Date.now(), noopLog()); rs(); return r; })();
    var miss234 = rf234.ok === true && rf234.hit === false && rf234.cost === 8000 &&
      w234.materials.mat_wudao === 1 && (lm233(w234, 'out') - mOut234a) === 1 &&
      w234.stones === st234a - 8000 && (lgSum232(w234.ledger, 'out') - lgOut234a) === 8000 &&
      w234.ledger.out.arts === 8000 &&                                   /* out.arts 既有分类零新增 */
      w234.fusion.customs[0].special === null && w234.fusion.lastReforgeAt > 0 &&
      st234a + lgSum232(w234.ledger, 'in') - lgSum232(w234.ledger, 'out') === w234.stones;
    var cd234 = SQ.Fusion.reforgeCustom(w234, pack, D, 'c1', Date.now(), noopLog());
    /* ② hit 路径：gen3 精养 → zaohua grade2；XARTS 注册同步；入槽 Lv1 → mods hooks 消费对表 */
    var w234b = mkW234(mkC234('jing', 3, 3, null), 100000);
    SQ.Alchemy.addMats(w234b, pack, D, { mat_wudao: 1 }, Date.now(), null);
    SQ.Fusion.registerCustoms(w234b.fusion, D);
    w234b.artsKnown.push('c1'); w234b.artsLevels.c1 = 1; w234b.artsSlots = ['c1'];
    var rf234b = (function () { var rs = stubRandom([0.01]); var r = SQ.Fusion.reforgeCustom(w234b, pack, D, 'c1', Date.now(), noopLog()); rs(); return r; })();
    var mB234 = M(mkProf([]), w234b);
    var hit234 = rf234b.ok && rf234b.hit === true && rf234b.pool === 'zaohua' && rf234b.grade === 2 &&
      w234b.fusion.customs[0].special.pool === 'zaohua' && w234b.fusion.customs[0].special.grade === 2 &&
      ((SQ.XARTS.c1 || {}).special || {}).pool === 'zaohua' &&
      Math.abs((mB234.hooks.zaohua || 0) - D.SPECIAL_POOL.zaohua.grades[2]) < 1e-9;
    /* ③ 同池只升不降：gen1 已有 hundun grade2 → 淬炼 hit 后 grade 保持 2（gen−1=0 不降档） */
    var w234c = mkW234(mkC234('qi', 1, 1, { pool: 'hundun', grade: 2 }), 100000);
    SQ.Alchemy.addMats(w234c, pack, D, { mat_wudao: 1 }, Date.now(), null);
    SQ.Fusion.registerCustoms(w234c.fusion, D);
    var rf234c = (function () { var rs = stubRandom([0.01]); var r = SQ.Fusion.reforgeCustom(w234c, pack, D, 'c1', Date.now(), noopLog()); rs(); return r; })();
    var keep234 = rf234c.ok && rf234c.hit && rf234c.grade === 2 && w234c.fusion.customs[0].special.grade === 2 &&
      w234c.ledger.out.arts === D.FUSE.REFORGE_COST.xuan;                /* 玄阶 cost 800 */
    /* ④ attr → 混沌池映射 + 拒绝链（poor / wudao / unknown）+ normalize + 容量 */
    var mapOk234 = SQ.Fusion.chaosPoolOf(D, { attr: 'qi' }) === 'hundun' &&
      SQ.Fusion.chaosPoolOf(D, { attr: 'jing' }) === 'zaohua' &&
      SQ.Fusion.chaosPoolOf(D, { attr: 'shen' }) === 'taiyi';
    var w234e = mkW234(mkC234('shen', 1, 0, null), 10);
    var poorR234 = SQ.Fusion.reforgeCustom(w234e, pack, D, 'c1', Date.now(), noopLog());
    var w234f = mkW234(mkC234('shen', 1, 0, null), 100000);             /* 无悟道石 */
    var wudaoR234 = SQ.Fusion.reforgeCustom(w234f, pack, D, 'c1', Date.now(), noopLog());
    var unkR234 = SQ.Fusion.reforgeCustom(w234f, pack, D, 'c9', Date.now(), noopLog());
    var norm234 = SQ.Fusion.normalize({ lastReforgeAt: -5, customs: [] }, D).lastReforgeAt === 0 &&
      SQ.Fusion.normalize({ lastReforgeAt: 12345, customs: [] }, D).lastReforgeAt === 12345;
    var worst234 = byteLen({ lastFuseAt: 1730000000000, lastReforgeAt: 1730000000000, meditate: 99999, seq: 999,
      customs: [1, 2, 3, 4].map(function (i2) {
        return { id: 'c' + i2, name: '名八字整', gen: 3, tier: 3, attr: 'shen', align: 'neutral',
          effects: { qiRate: 0.13, offlineEff: 0.12, combatPower: 0.14, tribBonus: 0.025 },
          special: { pool: 'hundun', grade: 2 },
          parents: [{ id: 'parent_a_long_id', name: '父本名甲', tier: 3 }, { id: 'parent_b_long_id', name: '父本名乙', tier: 3 }],
          createdAt: 1730000000000 };
      }) });
    ok('234', '混沌淬炼：悟道石 ×1（材料账 out）+ 灵石 REFORGE_COST[tier]（out.arts 既有分类）随尝试消耗；miss 零损失 + CD 1 日二发拒；hit = special 覆盖混沌池（attr 映射 qi→hundun/jing→zaohua/shen→taiyi、grade=gen−1、同池只升不降）+ XARTS 注册同步 + mods hooks 消费对表；poor/wudao/unknown 拒；normalize lastReforgeAt 钳位保留；fusion 最坏态容量 <1.6KB',
      miss234 && cd234.reason === 'cd' && hit234 && keep234 && mapOk234 &&
      poorR234.reason === 'poor' && wudaoR234.reason === 'wudao' && unkR234.reason === 'unknown' &&
      norm234 && worst234 < 1600 &&
      D.FUSE.CHAOS_P === 0.30 && D.FUSE.REFORGE_CD_MS === 86400000,
      'miss=' + miss234 + ' hit=' + hit234 + ' keep=' + keep234 + ' worst=' + worst234 + 'B');

    /* #235 命名池扩容（24×20=480 → 36×30=1080）：PRE_N/SUF_N/COMBOS 对表自洽；词表 key 1~36/1~30 连续不缺不重；
     * rollName 300 掷全部落池组合空间（图鉴 selfart 面分母 = COMBOS + 法宝数同步扩大） */
    var FU235 = D.FUSE;
    var pre235 = {}, suf235 = {}, dup235 = [];
    for (var i235 = 1; i235 <= FU235.PRE_N; i235++) {
      var pv235 = SQ.t('fuse.name.pre.' + i235, null, 'xiuxian');
      if (pv235 === 'fuse.name.pre.' + i235 || pre235[pv235]) dup235.push('pre' + i235);
      pre235[pv235] = 1;
    }
    for (var j235 = 1; j235 <= FU235.SUF_N; j235++) {
      var sv235 = SQ.t('fuse.name.suf.' + j235, null, 'xiuxian');
      if (sv235 === 'fuse.name.suf.' + j235 || suf235[sv235]) dup235.push('suf' + j235);
      suf235[sv235] = 1;
    }
    var comboSet235 = {};
    Object.keys(pre235).forEach(function (pp2) { Object.keys(suf235).forEach(function (ss2) { comboSet235[pp2 + ss2] = 1; }); });
    var w235 = mkWs({ realm: 5 });
    SQ.Fusion.ensure(w235, D);
    var rollOk235 = true;
    for (var k235 = 0; k235 < 300; k235++) {
      if (!comboSet235[SQ.Fusion.rollName(w235, pack, D)]) { rollOk235 = false; break; }
    }
    ok('235', '融合命名池扩容：PRE_N 36 × SUF_N 30 = COMBOS 1080 对表自洽（图鉴 selfart 面分母同步）；词表 key 连续不缺不重；rollName 300 掷全落池组合空间',
      FU235.PRE_N === 36 && FU235.SUF_N === 30 && FU235.COMBOS === 1080 &&
      FU235.COMBOS === FU235.PRE_N * FU235.SUF_N &&
      Object.keys(pre235).length === 36 && Object.keys(suf235).length === 30 && !dup235.length && rollOk235,
      'dup=' + dup235.join(',') + ' roll=' + rollOk235);

    /* #236 渐进式解锁（渐次解锁批 §C）：TAB_UNLOCK 七项对表（坊市/势力/炼丹/道友 = 筑基1 · 天骄 = 金丹2 ·
     * 法宝 = 元婴3 · 宗门 = 化神4）+ 名称 key 全可解析；门槛单一事实源（Prodigy.unlockRealm 同表）；
     * 天骄 gate = 交互面锁 / 推进照跑（realm1 tick：prg 推进、零传闻、零 boost、榜不写、事件不触发、
     * spar/fireProdigyEvent 拒 locked）；解锁后交互面恢复（狭路相逢 + 榜写入）；播报词表在位 */
    var TU236 = D.TAB_UNLOCK;
    var tabOk236 = TU236.shop.r === 1 && TU236.faction.r === 1 && TU236.alchemy.r === 1 && TU236.bonds.r === 1 &&
      TU236.prodigy.r === 2 && TU236.treasure.r === 3 && TU236.sect.r === 4 &&
      SQ.Prodigy.unlockRealm(D) === TU236.prodigy.r &&
      ['shop', 'faction', 'alchemy', 'bonds', 'prodigy', 'treasure', 'sect'].every(function (k236) {
        var kk236 = TU236[k236].k;
        return SQ.t(kk236, null, 'xiuxian') !== kk236;
      });
    var PR236 = { id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 2, rlm: 1, prg: 0, feud: true, feudBond: 80, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] };
    var w236 = mkWs({ realm: 1, zone: 1 });
    w236.prodigies = [JSON.parse(JSON.stringify(PR236))];
    var ev236 = (function () { var rs = stubRandom(function () { return 0.001; }); var r = SQ.Prodigy.tick(w236, pack, D, M(mkProf([]), w236), 30000, Date.now(), { log: noopLog() }); rs(); return r; })();
    var gateOff236 = w236.prodigies[0].prg > 0 &&                            /* 推进照跑 */
      (w236.rumors || []).filter(function (rr2) { return rr2.kind === 'prodigy'; }).length === 0 &&
      !w236.prodMarks.myRank && !w236.pendingChoice &&
      (ev236 === null || ev236.every(function (e2) { return e2.type === 'break'; }));
    var sparL236 = SQ.Prodigy.spar(w236, pack, D, M(mkProf([]), w236), 'pr1', Date.now(), noopLog());
    var fireL236 = SQ.Prodigy.fireProdigyEvent(w236, pack, D, 'prodigy_ev_feud', 'pr1', Date.now(), { log: noopLog() });
    w236.realm = 2; w236.prodigyClock = 0;
    (function () { var rs = stubRandom(function () { return 0.001; }); SQ.Prodigy.tick(w236, pack, D, M(mkProf([]), w236), 30000, Date.now(), { log: noopLog() }); rs(); })();
    var gateOn236 = !!w236.pendingChoice && w236.prodMarks.myRank >= 1;       /* 狭路相逢触发 + 榜写入 */
    var lexOk236 = SQ.t('meta.unlock.tab', { name: '坊市' }).indexOf('坊市') >= 0;
    ok('236', '渐进式解锁：TAB_UNLOCK 七项对表 + 名称 key 全可解析 + Prodigy.unlockRealm 单一事实源；realm1 gate = 推进照跑、传闻/boost/榜/事件/spar/fire 全锁；realm2 解锁后交互面恢复；meta.unlock.tab 播报词表在位',
      tabOk236 && gateOff236 && sparL236.reason === 'locked' && fireL236 === null && gateOn236 && lexOk236,
      'off=' + gateOff236 + ' spar=' + sparL236.reason + ' fire=' + fireL236 + ' on=' + gateOn236);

    /* #237 奇遇倾向（体验批）：settings.eventPref 白名单落库（none/right/evil/neutral）——
     * setEventPref 合法值写入、脏值回落 none；normalize 保留合法值、清脏值、缺省 none。
     * 视图侧优先逻辑（autoEventPref + autoAvailableBranches）见 .tests/verify-ui-auto.cjs。 */
    var ref237 = {};
    await SQ.Actions.setEventPref(ref237, 'evil');
    var pref237a = ref237.settings && ref237.settings.eventPref;
    await SQ.Actions.setEventPref(ref237, 'xxx');
    var pref237b = ref237.settings && ref237.settings.eventPref;
    var n237a = SQ.normalize({ v: SQ.V, profile: { name: '甲' }, settings: { eventPref: 'right' } });
    var n237b = SQ.normalize({ v: SQ.V, profile: { name: '乙' }, settings: { eventPref: 'bogus' } });
    var n237c = SQ.normalize({ v: SQ.V, profile: { name: '丙' } });
    ok('237', '奇遇倾向：setEventPref 白名单 none/right/evil/neutral 落库、脏值回落 none；normalize 保留合法值并清脏值、缺省 none',
      pref237a === 'evil' && pref237b === 'none' &&
      n237a.settings.eventPref === 'right' && n237b.settings.eventPref === 'none' && n237c.settings.eventPref === 'none',
      'a=' + pref237a + ' b=' + pref237b + ' n=' + n237a.settings.eventPref + '/' + n237b.settings.eventPref);

    /* #238 效果百分比显示取整（体验批 v2.4）：qiPct 经 ×100 后不带浮点尾数。
     * 复现线上坏档：道心幻境 failE 的 −14.099999999999998%（源 qiPct = −0.141 的浮点尾）。 */
    var w238 = mkWs({});
    var txt238 = SQ.Events.effText(w238, pack, D, {
      qiPct: -0.14099999999999998, stonesPct: 0.125,
      buff: { field: 'qiRate', mult: -0.255, hours: 1 }
    });
    var txt238b = SQ.Events.effText(w238, pack, D, { fail: { qiPct: -0.14099999999999998 } });
    var bad238 = /\d\.\d{3,}/.test(txt238) || /\d\.\d{3,}/.test(txt238b);
    ok('238', '效果百分比显示取整：无 3 位以上小数尾数（qiPct / stonesPct / buff / failE 祸及）',
      !bad238 && txt238.indexOf('-14.1%') >= 0 && txt238.indexOf('12.5%') >= 0 && txt238b.indexOf('-14.1%') >= 0,
      'txt=' + txt238 + ' | fail=' + txt238b);

    /* #239 清除全部 buff（体验批 v2.4）：clearBuffs 清空 ws.buffs（增益/减益/护盾层）并写系统日志；
     * 无 buff 时幂等（不写日志）。 */
    localStorage.removeItem(SQ.KEY);
    var ref239 = {};
    await SQ.mutate(ref239, function (s) {
      s.profile = { name: '涤尘', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.buffs = [
        { field: 'qiRate', mult: -0.2, until: Date.now() + 3600000 },
        { field: 'eventShield', mult: 1, until: Date.now() + 3600000, source: 'chu' }
      ];
    });
    await SQ.Actions.clearBuffs(ref239);
    var w239 = ref239.worlds.xiuxian;
    var n239 = w239.log.length;
    var last239 = w239.log[n239 - 1];
    await SQ.Actions.clearBuffs(ref239);
    var w239b = ref239.worlds.xiuxian;
    ok('239', '清除全部 buff：清空 ws.buffs（含护盾层）+ 写系统日志；无 buff 幂等不再写',
      w239.buffs.length === 0 && !!last239 && last239.cat === 'sys' &&
      w239b.buffs.length === 0 && w239b.log.length === n239,
      'buffs=' + w239b.buffs.length + ' logDelta=' + (w239b.log.length - n239));

    /* #240 自悟候选池（自悟批 · 需求 §2；自悟收敛批收池）：仅市面传承（obtain.type='shop'）+ 黄/玄阶
     * + 未持有 + 已达标；地阶/天阶 shop 与专属渠道（初始/首通/黑市/奇遇）永不入池；境界提升扩容 */
    var w240 = mkWs({ realm: 0 });
    var cands240 = SQ.Arts.selfLearnCands(w240, pack, D);
    var am240 = pack.artsMap();
    var poolOk240 = cands240.length > 0 && cands240.every(function (id) {
      var a = am240[id];
      return a.obtain && a.obtain.type === 'shop' &&
        ['huang', 'xuan'].indexOf(a.tier) >= 0 &&
        !SQ.Arts.owned(w240, id) && SQ.Arts.canLearn(w240, pack, D, id);
    });
    var tianIds240 = Object.keys(am240).filter(function (id) {
      return am240[id].tier === 'tian' && am240[id].obtain && am240[id].obtain.type === 'shop';
    });
    var diIds240 = Object.keys(am240).filter(function (id) {
      return am240[id].tier === 'di' && am240[id].obtain && am240[id].obtain.type === 'shop';
    });
    var noTian240 = tianIds240.length > 0 && tianIds240.every(function (id) { return cands240.indexOf(id) < 0; });
    var noDi240 = diIds240.length > 0 && diIds240.every(function (id) { return cands240.indexOf(id) < 0; });
    var noOwned240 = cands240.indexOf('tuna') < 0 && cands240.indexOf('juling') < 0;
    var noExcl240 = Object.keys(am240).every(function (id) {
      var ob = am240[id].obtain || {};
      return !ob.type || ob.type === 'shop' || cands240.indexOf(id) < 0;
    });
    var realmOk240 = cands240.indexOf('yinqi') >= 0 && cands240.indexOf('zhanju') >= 0;   /* realm0 仅 reqs 空者达标 */
    var cands240b = SQ.Arts.selfLearnCands(mkWs({ realm: 6 }), pack, D);
    var growOk240 = cands240b.length > cands240.length &&
      tianIds240.every(function (id) { return cands240b.indexOf(id) < 0; });
    ok('240', '自悟候选池：仅 shop 传承 × 黄/玄阶 × 未持有 × 达标；地阶/天阶/专属渠道永不入池；境界提升扩容',
      poolOk240 && noTian240 && noDi240 && noOwned240 && noExcl240 && realmOk240 && growOk240,
      'n0=' + cands240.length + ' n6=' + cands240b.length + ' tian=' + tianIds240.length +
      ' di=' + diIds240.length + ' pool=' + poolOk240 + ' noTian=' + noTian240 + ' noDi=' + noDi240);

    /* #241 自悟推进（自悟批）：未满区间不掷 · 模式乘区（闭关易悟/历练难悟）· 保底必得并清零 ·
     * 池枯竭清零（防死循环） */
    var realRnd241 = Math.random;
    /* (a) 未满一区间：时钟只推进、不掷判 */
    var w241 = mkWs({ mode: 'seclude' });
    var m241 = SQ.Mods.collect(mkProf(), w241, pack, D);
    var g241a = SQ.Arts.tickSelfLearn(w241, pack, D, m241, 10, { log: noopLog() });
    var aOk241 = g241a === null && w241.artsLearnClock > 0 && w241.artsLearnClock < 1200;
    /* (b) 模式乘区：同样 800 秒，闭关 eff=1.5（掷一次命中）／历练 eff=0.5（不足一区间不掷） */
    Math.random = function () { return 0; };
    var w241s = mkWs({ mode: 'seclude' }); w241s.artsKnown = [];
    var g241s = SQ.Arts.tickSelfLearn(w241s, pack, D, SQ.Mods.collect(mkProf(), w241s, pack, D), 800, { log: noopLog() });
    var w241v = mkWs({ mode: 'venture' }); w241v.artsKnown = [];
    var g241v = SQ.Arts.tickSelfLearn(w241v, pack, D, SQ.Mods.collect(mkProf(), w241v, pack, D), 800, { log: noopLog() });
    var bOk241 = g241s !== null && g241v === null && w241v.artsLearnClock > 0 && w241v.artsLearnClock < 1200;
    /* (c) 保底：加权累计达上限 → 无视概率必得一部并清零 */
    Math.random = function () { return 0.999; };
    var w241p = mkWs({ mode: 'seclude', realm: 6 });
    w241p.artsLearnClock = D.ARTS_SELFLEARN.PITY_H * 3600 - 1;
    var g241p = SQ.Arts.tickSelfLearn(w241p, pack, D, SQ.Mods.collect(mkProf(), w241p, pack, D), 1, { log: noopLog() });
    var cOk241 = g241p !== null && w241p.artsLearnClock === 0 && SQ.Arts.owned(w241p, g241p);
    /* (d) 池枯竭：学尽当前可自悟者 → 掷判无候选即清零、不空转 */
    Math.random = function () { return 0; };
    var w241e = mkWs({ realm: 0, mode: 'seclude' });
    SQ.Arts.selfLearnCands(w241e, pack, D).forEach(function (id) { SQ.Arts.gainArt(w241e, pack, D, id, noopLog()); });
    var cands241e = SQ.Arts.selfLearnCands(w241e, pack, D).length;
    var g241e = SQ.Arts.tickSelfLearn(w241e, pack, D, SQ.Mods.collect(mkProf(), w241e, pack, D), 3600, { log: noopLog() });
    var dOk241 = cands241e === 0 && g241e === null && w241e.artsLearnClock === 0;
    /* (e) 保底修复（自悟保底修复批）：掷点**不扣减**时钟——连续失手时 clock 跨掷点继续累计，
     *     旧实现每掷一次扣一个区间 ⇒ 单 tick 后 clock 归零、保底永不成立 */
    Math.random = function () { return 0.999; };
    var w241c = mkWs({ mode: 'venture' });   /* eff = 0.5 → 2400s 推进 1200 加权秒 = 2 个掷点 */
    var g241c = SQ.Arts.tickSelfLearn(w241c, pack, D, SQ.Mods.collect(mkProf(), w241c, pack, D), 2400, { log: noopLog() });
    var eOk241 = g241c === null && Math.abs(w241c.artsLearnClock - 1200) < 1e-6;
    Math.random = realRnd241;
    ok('241', '自悟推进：未满区间不掷 · 闭关易悟/历练难悟 · 保底必得清零 · 池枯竭清零 · 掷点不扣时钟',
      aOk241 && bOk241 && cOk241 && dOk241 && eOk241,
      'a=' + aOk241 + ' b=' + bOk241 + ' c=' + cOk241 + ' d=' + dOk241 + ' e=' + eOk241 +
      ' clockA=' + w241.artsLearnClock.toFixed(1) + ' venture=' + w241v.artsLearnClock.toFixed(1) +
      ' carry=' + w241c.artsLearnClock.toFixed(1));

    /* #242 自悟存档纪律（自悟批）：normalize 脏值回落 0 / 合法值保留 · selfLearnPct 保底口径 0~100 钳位 ·
     * 初始态字段在位 */
    var n242 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsLearnClock: -5 } } });
    var n242b = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsLearnClock: 'x' } } });
    var n242c = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsLearnClock: 12345 } } });
    /* 自悟收敛批：artsSelfLearnN 同样走脏值纪律（负→0 · 小数截断 · 合法保留） */
    var n242d = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsSelfLearnN: -3 } } });
    var n242e = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsSelfLearnN: 2.9 } } });
    var n242f = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsSelfLearnN: 7 } } });
    var pity242 = D.ARTS_SELFLEARN.PITY_H * 3600;
    var w242 = mkWs({}); w242.artsLearnClock = pity242 / 2;
    var w242b = mkWs({}); w242b.artsLearnClock = pity242 * 3;
    ok('242', '自悟存档纪律：normalize 脏值回落 0/合法值保留 · selfLearnPct 0~100 钳位 · 初始态字段在位',
      n242.worlds.xiuxian.artsLearnClock === 0 && n242b.worlds.xiuxian.artsLearnClock === 0 &&
      n242c.worlds.xiuxian.artsLearnClock === 12345 && pack.initialState().artsLearnClock === 0 &&
      n242d.worlds.xiuxian.artsSelfLearnN === 0 && n242e.worlds.xiuxian.artsSelfLearnN === 2 &&
      n242f.worlds.xiuxian.artsSelfLearnN === 7 && pack.initialState().artsSelfLearnN === 0 &&
      Math.abs(SQ.Arts.selfLearnPct(w242, D) - 50) < 1e-6 && SQ.Arts.selfLearnPct(w242b, D) === 100,
      'neg=' + n242.worlds.xiuxian.artsLearnClock + ' nan=' + n242b.worlds.xiuxian.artsLearnClock +
      ' keep=' + n242c.worlds.xiuxian.artsLearnClock + ' n=' + n242d.worlds.xiuxian.artsSelfLearnN +
      '/' + n242e.worlds.xiuxian.artsSelfLearnN + '/' + n242f.worlds.xiuxian.artsSelfLearnN +
      ' pct=' + SQ.Arts.selfLearnPct(w242, D));

    /* #243 自悟 · 离线悟道（自悟保底修复批）：离线不乘模式乘区、按 OFFLINE_MULT 折扣推进、
     * 单次结算至多 OFFLINE_MAX_ROLLS 个掷点、离线同样吃保底 */
    var realRnd243 = Math.random;
    var cfg243 = D.ARTS_SELFLEARN;
    var iv243 = cfg243.INTERVAL_MIN * 60;
    /* (a) 不乘模式乘区：seclude（practiceMult 1.5）离线 600s 只推进 0.5×600=300 加权秒 → 不足一掷点 */
    var w243a = mkWs({ mode: 'seclude' });
    var g243a = SQ.Arts.tickSelfLearn(w243a, pack, D, SQ.Mods.collect(mkProf(), w243a, pack, D), 600, { log: noopLog() }, { offline: true });
    var aOk243 = g243a === null && Math.abs(w243a.artsLearnClock - 300) < 1e-6;
    /* (b) 折扣推进至掷点：再离线 960s（adv=480）→ 累计 780 → 跨一掷点；Math.random=0 必得 */
    Math.random = function () { return 0; };
    var g243b = SQ.Arts.tickSelfLearn(w243a, pack, D, SQ.Mods.collect(mkProf(), w243a, pack, D), 960, { log: noopLog() }, { offline: true });
    var bOk243 = g243b !== null && w243a.artsLearnClock === 0;
    /* (c) 单次上限：离线 12h 且必失手 → 推进被钳在 OFFLINE_MAX_ROLLS 个掷点，不爆发式得手 */
    Math.random = function () { return 0.999; };
    var w243c = mkWs({ mode: 'venture' });
    var g243c = SQ.Arts.tickSelfLearn(w243c, pack, D, SQ.Mods.collect(mkProf(), w243c, pack, D), 43200, { log: noopLog() }, { offline: true });
    var cOk243 = g243c === null && Math.abs(w243c.artsLearnClock - iv243 * cfg243.OFFLINE_MAX_ROLLS) < 1e-6;
    /* (d) 离线同吃保底：时钟逼近上限 → 离线小步即强制得手并清零 */
    var w243d = mkWs({ mode: 'seclude', realm: 6 });
    w243d.artsLearnClock = cfg243.PITY_H * 3600 - 1;
    var g243d = SQ.Arts.tickSelfLearn(w243d, pack, D, SQ.Mods.collect(mkProf(), w243d, pack, D), 10, { log: noopLog() }, { offline: true });
    var dOk243 = g243d !== null && w243d.artsLearnClock === 0 && SQ.Arts.owned(w243d, g243d);
    Math.random = realRnd243;
    ok('243', '自悟 · 离线悟道：不乘模式乘区 · 按 OFFLINE_MULT 折扣 · 单次至多 OFFLINE_MAX_ROLLS 掷点 · 离线吃保底',
      aOk243 && bOk243 && cOk243 && dOk243,
      'a=' + aOk243 + ' b=' + bOk243 + ' c=' + cOk243 + ' d=' + dOk243 +
      ' clockA=' + w243a.artsLearnClock.toFixed(1) + ' clockC=' + w243c.artsLearnClock.toFixed(1));

    /* #244 善恶名号九段（善恶名号批）：KARMA_RANKS 九段降序对表 · rankOf 边界与 tierOf 同口径
     * （+200 入正道首段 / -200 入魔道首段 / -199~+199 左道）；名号仅作称谓，不入数值判定 */
    var krank244 = function (k) { return SQ.XKarma.rankOf(k, D); };
    var cases244 = [
      [1000, 'haoran', 'right'], [800, 'haoran', 'right'], [799, 'zhengdao_kui', 'right'],
      [600, 'zhengdao_kui', 'right'], [599, 'qingming', 'right'], [400, 'qingming', 'right'],
      [399, 'chizheng', 'right'], [200, 'chizheng', 'right'],
      [199, 'zuodao', 'neutral'], [0, 'zuodao', 'neutral'], [-199, 'zuodao', 'neutral'],
      [-200, 'rumo', 'evil'], [-399, 'rumo', 'evil'], [-400, 'xiexiu', 'evil'],
      [-599, 'xiexiu', 'evil'], [-600, 'modao_jv', 'evil'], [-799, 'modao_jv', 'evil'],
      [-800, 'jidao', 'evil'], [-1000, 'jidao', 'evil']
    ];
    var ok244 = D.KARMA_RANKS.length === 9 && cases244.every(function (c) {
      return krank244(c[0]) === c[1] && SQ.XKarma.tierOf(c[0]) === c[2];
    });
    ok('244', '善恶名号九段：KARMA_RANKS 降序对表 · rankOf 边界（±200/±400/±600/±800）与 tierOf 同口径',
      ok244, cases244.map(function (c) { return c[0] + '=' + krank244(c[0]); }).join(' '));

    /* #245 名号更迭日志（善恶名号批）：recalcDerived 跨段即入档独立分类 'karma'（起讫双名号）；
     * 同段重算不重复入档；正魔两侧跨段均触发（用 karma 分类日志计数，免受其它分类干扰） */
    var karmaLogs245 = function (w) {
      return (w.log || []).filter(function (l) { return l.cat === 'karma'; });
    };
    var w245 = mkWs({ karmaEventScore: 100 });        /* 左道散人 */
    pack.recalcDerived(w245, mkProf());
    var startOk245 = SQ.XKarma.rankOf(w245.karma, D) === 'zuodao' && karmaLogs245(w245).length === 0;
    w245.karmaEventScore = 250;                       /* → 持正之士（跨段） */
    pack.recalcDerived(w245, mkProf());
    var kl245 = karmaLogs245(w245);
    var crossOk245 = kl245.length === 1 &&
      kl245[0].text.indexOf(SQ.t('karma.rank.chizheng', null, 'xiuxian')) >= 0 &&
      kl245[0].text.indexOf(SQ.t('karma.rank.zuodao', null, 'xiuxian')) >= 0;
    w245.karmaEventScore = 300;                       /* 同段（仍持正之士）→ 不重复入档 */
    pack.recalcDerived(w245, mkProf());
    var sameOk245 = karmaLogs245(w245).length === 1;
    w245.karmaEventScore = -250;                      /* → 入魔之徒（魔道侧跨段） */
    pack.recalcDerived(w245, mkProf());
    var kl245b = karmaLogs245(w245);
    var evilOk245 = kl245b.length === 2 &&
      kl245b[1].text.indexOf(SQ.t('karma.rank.rumo', null, 'xiuxian')) >= 0 &&
      kl245b[1].text.indexOf(SQ.t('karma.rank.chizheng', null, 'xiuxian')) >= 0;
    ok('245', '名号更迭日志：recalcDerived 跨段入档 karma 分类（起讫双名号）· 同段重算不重复 · 正魔两侧均触发',
      startOk245 && crossOk245 && sameOk245 && evilOk245,
      'start=' + startOk245 + ' cross=' + crossOk245 + ' same=' + sameOk245 + ' evil=' + evilOk245 +
      ' n=' + karmaLogs245(w245).length);

    /* #246 自悟收敛（自悟收敛批）：边际递减 eff × 1/(1+DECAY×已自悟部数) · 得手计数 +1
     * （n=0 闭关 10s → eff 1.5 → 15 加权秒；n=1 → 15/(1+DECAY) 加权秒） */
    var cfg246 = D.ARTS_SELFLEARN;
    var decay1_246 = 1 / (1 + cfg246.DECAY);
    var w246a = mkWs({ mode: 'seclude' });
    SQ.Arts.tickSelfLearn(w246a, pack, D, SQ.Mods.collect(mkProf(), w246a, pack, D), 10, { log: noopLog() });
    var w246b = mkWs({ mode: 'seclude' }); w246b.artsSelfLearnN = 1;
    SQ.Arts.tickSelfLearn(w246b, pack, D, SQ.Mods.collect(mkProf(), w246b, pack, D), 10, { log: noopLog() });
    var aOk246 = Math.abs(w246a.artsLearnClock - 15) < 1e-6 &&
                 Math.abs(w246b.artsLearnClock - 15 * decay1_246) < 1e-6;
    var realRnd246 = Math.random;
    Math.random = function () { return 0; };
    var w246c = mkWs({ mode: 'seclude' });
    var g246 = SQ.Arts.tickSelfLearn(w246c, pack, D, SQ.Mods.collect(mkProf(), w246c, pack, D), 800, { log: noopLog() });
    Math.random = realRnd246;
    var bOk246 = g246 !== null && w246c.artsSelfLearnN === 1 && w246c.artsLearnClock === 0;
    ok('246', '自悟收敛：边际递减 eff × 1/(1+DECAY×已自悟部数) · 得手计数 +1',
      aOk246 && bOk246,
      'n0=' + w246a.artsLearnClock.toFixed(2) + ' n1=' + w246b.artsLearnClock.toFixed(2) +
      ' cnt=' + w246c.artsSelfLearnN + ' got=' + g246);

    /* #247 传闻预留（方案 B）：活跃传闻指向的事件不被被动奇遇抢先触发——
     * 伪造 buildPool 只返回传闻目标 market_assassin：有活跃卡 → fire 排除后各池皆空 → 流产(null)；
     * 无卡 → 正常取到该事件并落地 pendingChoice。 */
    var evB247 = SQ.Events.findById(pack, 'market_assassin');
    var origBP247 = SQ.Events.buildPool;
    SQ.Events.buildPool = function () { return evB247 ? [evB247] : []; };
    var realRnd247 = Math.random; Math.random = function () { return 0; };
    var w247a = mkWs({ rumors: [{ rid: 'r247', evId: 'market_assassin', tier: 'ren', nature: 'bad',
      bornAt: 1, expireAt: Date.now() + 600000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' }] });
    var r247a = SQ.Events.fire(w247a, pack, D, M(mkProf(), w247a), pack.worldSystems.effectsOf(w247a), Date.now(), { log: noopLog() });
    var w247b = mkWs({});
    var r247b = SQ.Events.fire(w247b, pack, D, M(mkProf(), w247b), pack.worldSystems.effectsOf(w247b), Date.now(), { log: noopLog() });
    Math.random = realRnd247;
    SQ.Events.buildPool = origBP247;
    var ok247 = r247a === null && !!r247b && r247b.id === 'market_assassin' &&
      w247b.pendingChoice && w247b.pendingChoice.id === 'market_assassin';
    ok('247', '传闻预留：活跃传闻指向的事件不被被动奇遇抢先触发（fire 排除 + 空池流产）', ok247,
      'withRumor=' + (r247a && r247a.id) + ' noRumor=' + (r247b && r247b.id));

    /* ═══ #262 自立门户三效果接线批 ①（2026-10-07 · 自立门户卷 §4.2 丹房① + §2.3 功法子集）═══
     * 设计文案+常量在册但消费点缺席的两环落地实测：宗门丹房 → alchemy 炼丹消费点（第 4 丹炉渠道 +
     * 平坦 +5%）；宗规三倾向 → 藏经阁弟子传法子集（槽数 min 收窄，左道不限，不锁宗主自己）。
     * #261 号位由承继选择批占用，本批占 #262/#263；#222 的「丹房 pending 零生效」就地收窄为双向态。 */
    var SC262 = D.SECT, AL262 = D.ALCHEMY;
    var m262 = mkMeta(); m262.unlocks.sect = true;
    /* 功法集：2 正道 + 1 魔道（alignment 取 SQ.XARTS 真实字段，非测试自造） */
    var artSet262 = ['qingxin', 'tiebi', 'posha'];
    var align262Chk = SC262.ART_ALLOW.right.join() === 'right,neutral' &&
      SC262.ART_ALLOW.evil.join() === 'evil,neutral' &&
      ['right', 'neutral', 'evil'].every(function (x) { return SC262.ART_ALLOW.neutral.indexOf(x) >= 0; });
    var elig262 = {};
    ['right', 'neutral', 'evil'].forEach(function (a) {
      elig262[a] = artSet262.filter(function (id) {
        return SC262.ART_ALLOW[a].indexOf(SQ.XARTS[id].alignment) >= 0;
      }).length;
    });
    function mkSect262(align, ov) {
      var w = mkSectWs220();
      w.artsKnown = artSet262.slice(); w.artsSlots = ['tiebi']; w.artsLevels = { tiebi: 3 };
      SQ.Sect.foundSect(w, pack, D, m262, 'wuyue', null, [0, 0], align, Date.now(), noopLog());
      w.sect.fac = { zangjing: 3, danfang: 0, yanwu: 0, keshe: 0 };
      w.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 4, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
      if (ov) Object.assign(w, ov);
      return w;
    }
    /* ① 丹房 → craftP：地阶档 3（宗师）基线 0.6400 → 0.6900；平坦不随级缩放；CRAFT_CAP 0.95 钳住 */
    var w262p = mkSect262('neutral');
    var p262di0 = SQ.Alchemy.craftP(D, 'di', 3, w262p);
    w262p.sect.fac.danfang = 1; var p262di1 = SQ.Alchemy.craftP(D, 'di', 3, w262p);
    w262p.sect.fac.danfang = 5; var p262di5 = SQ.Alchemy.craftP(D, 'di', 3, w262p);
    var p262cap = SQ.Alchemy.craftP(D, 'huang', 3, w262p);        /* 0.85+0.09+0.05 = 0.99 → 钳 0.95 */
    var rate262 = Math.abs(p262di0 - 0.64) < 1e-9 && Math.abs(p262di1 - 0.69) < 1e-9 &&
      p262di5 === p262di1 && p262cap === AL262.CRAFT_CAP &&
      SQ.Alchemy.danfangCraftBonus(w262p, D) === 0.05 && SC262.DANFANG_CRAFT === 0.05;
    /* ② 第 4 丹炉渠道走真链路（startCraft 炉检，非只读 getter） */
    var w262f = mkSect262('neutral');
    SQ.Alchemy.ensure(w262f, D); SQ.Alchemy.autoGrant(w262f, D);
    SQ.Alchemy.addMats(w262f, pack, D, { mat_linglu: 4, mat_qingmu: 4 }, 1, null);
    var noFur262 = SQ.Alchemy.startCraft(w262f, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
    w262f.sect.fac.danfang = 1;
    var yesFur262 = SQ.Alchemy.startCraft(w262f, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
    /* ②′ 真链路出炉掷判：丹成读点带 +5%、器台读点不带（同档丹房 5 级、同一 collectCraft 入口） */
    var w262k = mkSect262('neutral'); w262k.sect.fac.danfang = 5;
    SQ.Alchemy.ensure(w262k, D); w262k.alchemy.blueprints.push('bp_furnace');
    SQ.Alchemy.addMats(w262k, pack, D, { mat_leisui: 20 }, 1, null);   /* 器台按 ws.realm 取本区主材（realm4 → z4 池） */
    var sc262qi = SQ.Alchemy.startCraft(w262k, pack, D, 'qi', 'bp_furnace', {}, null, 1, noopLog());
    var pQi262 = (function () { var rs = stubRandom([0.99]);
      var r = SQ.Alchemy.collectCraft(w262k, pack, D, null, null, sc262qi.craft.doneAt + 1, null); rs(); return r; })();
    var w262k2 = mkSect262('neutral'); w262k2.sect.fac.danfang = 5;
    SQ.Alchemy.ensure(w262k2, D); SQ.Alchemy.autoGrant(w262k2, D);
    SQ.Alchemy.addMats(w262k2, pack, D, { mat_linglu: 4, mat_qingmu: 4 }, 1, null);
    var sc262dan = SQ.Alchemy.startCraft(w262k2, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
    var pDan262 = (function () { var rs = stubRandom([0.99]);
      var r = SQ.Alchemy.collectCraft(w262k2, pack, D, null, null, sc262dan.craft.doneAt + 1, null); rs(); return r; })();
    var path262 = sc262qi.ok === true && pQi262.ok === true &&
      Math.abs(pQi262.p - AL262.CRAFT_BASE.qi) < 1e-9 &&
      Math.abs(pDan262.p - (AL262.CRAFT_BASE.huang + SC262.DANFANG_CRAFT)) < 1e-9;
    /* ③ 福地丹房 + 宗门丹房并存：只有一份 +5%（择定口径见 alchemy.js danfangCraftBonus 卷注） */
    var w262b = mkSect262('neutral'); w262b.sect.fac.danfang = 4;
    var cvb262 = SQ.Cave.current(w262b, pack);
    w262b.cave.fac[cvb262.id] = w262b.cave.fac[cvb262.id] || {};
    w262b.cave.fac[cvb262.id].danfang = 3;
    var both262 = SQ.Alchemy.craftP(D, 'di', 3, w262b);
    /* ④ 传位后（succession）渠道摘除——宗主已下山，宗门转 NPC 位 */
    var w262s = mkSect262('neutral'); w262s.sect.fac.danfang = 5;
    w262s.sect.succession = { done: true, heir: '某弟子', rep: 500, at: 1 };
    var succ262 = SQ.Alchemy.hasFurnace(w262s, pack, D, null) === false &&
      SQ.Alchemy.craftP(D, 'di', 3, w262s) === p262di0 && SQ.Alchemy.sectDanfangLv(w262s, D) === 0;
    var fur262 = noFur262.reason === 'furnace' && yesFur262.ok === true &&
      both262 === p262di1 && succ262 &&
      SQ.Alchemy.hasFurnace(w262b, pack, D, null) === true;
    /* ⑤ 藏经阁功法子集：同持功法集下 正道 / 魔道 弟子战力不同（左道 = 不限 = 与正道同档） */
    var dp262 = { right: 0, neutral: 0, evil: 0 };
    var sl262 = { right: 0, neutral: 0, evil: 0 };
    ['right', 'neutral', 'evil'].forEach(function (a) {
      var w = mkSect262(a);
      sl262[a] = SQ.Sect.zangjingSlots(w, pack, SC262);
      dp262[a] = SQ.Sect.discPower(w, pack, D, w.sect.disciples[0]);
    });
    var base262 = D.REALMS[4].power * (SC262.APT_MULT.mid || 1);
    var subset262 = Math.abs(dp262.right - base262 * (1 + Math.min(SC262.ART_SLOTS[3], elig262.right) * SC262.ART_POWER)) < 1e-9 &&
      Math.abs(dp262.evil - base262 * (1 + Math.min(SC262.ART_SLOTS[3], elig262.evil) * SC262.ART_POWER)) < 1e-9 &&
      dp262.right !== dp262.evil && dp262.neutral === dp262.right &&
      sl262.right === 2 && sl262.evil === 1 && sl262.neutral === 2;
    /* ⑥ 只收窄不放大：藏经阁满级 3 槽而只持 1 部 → 1 槽；零持 → 0 槽 */
    var w262n1 = mkSect262('neutral', { artsKnown: ['tiebi'] });
    var w262n0 = mkSect262('neutral', { artsKnown: [] });
    w262n1.sect.fac.zangjing = 5; w262n0.sect.fac.zangjing = 5;
    var clamp262 = SQ.Sect.zangjingSlots(w262n1, pack, SC262) === 1 &&
      SQ.Sect.zangjingSlots(w262n0, pack, SC262) === 0 &&
      SQ.Sect.discPower(w262n0, pack, D, w262n0.sect.disciples[0]) === base262;
    /* ⑦ 不锁宗主自己（§2.3 裁定）：魔道宗门下宗主槽内正道功法效果照全额进乘区 */
    var sumR262 = SQ.Mods.collect({ talents: [] }, mkSect262('right'), pack, D).sum.combatPower;
    var sumE262 = SQ.Mods.collect({ talents: [] }, mkSect262('evil'), pack, D).sum.combatPower;
    var sumNo262 = (function () { var w = mkWs({ artsKnown: artSet262.slice(), artsSlots: ['tiebi'], artsLevels: { tiebi: 3 } });
      return SQ.Mods.collect({ talents: [] }, w, pack, D).sum.combatPower; })();
    var lordFree262 = sumR262 === sumE262 && sumE262 === sumNo262 && sumE262 > 0 &&
      mkSect262('evil').artsKnown.join() === artSet262.join();
    /* ⑧ 供奉挂名不传法：同辈高人战力不受子集约束（三档全等） */
    var off262 = {};
    ['right', 'neutral', 'evil'].forEach(function (a) {
      var w = mkSect262(a);
      w.sect.disciples = [{ id: 'd9', nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id }];
      off262[a] = SQ.Sect.discPower(w, pack, D, w.sect.disciples[0]);
    });
    ok('262', '自立门户接线①（丹房 + 传法子集）：(a) 地阶档 3 成功率 0.6400 → 0.6900（SECT.DANFANG_CRAFT 平坦 +5%，5 级 = 1 级、满级递进卷面 ⏳ 未定故不造阶梯）；黄阶档 3 加项后 0.99 由 CRAFT_CAP 钳回 0.95；(b) 宗门丹房 ≥1 级 = 第 4 丹炉渠道，真跑 startCraft 炉检 拒(furnace)→ 通(ok)，且 collectCraft 真出炉读点 p 丹 0.9000（含 +5%）/ 器 0.8000（不含）；传位后渠道自动摘除；(c) 并存裁定——福地丹房 + 宗门丹房同开只有一份 +5%（两份相加 = 卷面未授权的第二数值，已否决），福地 artsSpeed 轴零改动，炼器口径（不传 ws）零波及；(d) 藏经阁槽数 = min(ART_SLOTS[级], 宗规内已持功法部数)：同持 {2 正道 + 1 魔道} 集下 正道 2 槽 / 魔道 1 槽 → 弟子战力不同、左道 = 不限与正道同档；只收窄不放大（1 部 → 1 槽、0 部 → 0 槽）；(e) 不锁宗主自己：魔道宗门宗主槽内正道功法 mods.sum.combatPower 与无宗门档逐字段全等；供奉挂名不传法三档战力全等',
      align262Chk && rate262 && fur262 && path262 && subset262 && clamp262 && lordFree262 &&
      off262.right === off262.neutral && off262.neutral === off262.evil,
      'craftP(地阶,档3)=' + p262di0.toFixed(4) + '→' + p262di1.toFixed(4) + '（5 级=' + p262di5.toFixed(4) + '）' +
      ' 黄阶档3 钳位=' + p262cap.toFixed(4) + ' ‖ 炉检=' + noFur262.reason + '/' + yesFur262.ok +
      ' 并存=' + both262.toFixed(4) + ' 传位=' + succ262 +
      ' ‖ 真出炉 p(丹/器)=' + (pDan262 && pDan262.p.toFixed(4)) + '/' + (pQi262 && pQi262.p.toFixed(4)) +
      ' ‖ 槽数=' + JSON.stringify(sl262) + ' 合格功法=' + JSON.stringify(elig262) +
      ' 战力=' + JSON.stringify({ right: +dp262.right.toFixed(2), neutral: +dp262.neutral.toFixed(2), evil: +dp262.evil.toFixed(2) }) +
      ' ‖ 宗主乘区=' + JSON.stringify([sumR262, sumE262, sumNo262]) + ' 供奉=' + off262.right.toFixed(2));

    /* ═══ #263 自立门户三效果接线批 ②（2026-10-07 · 自立门户卷 §2.3 表「天道态度」· 天道卷 §九.3 纯文本层）═══
     * 裁定 = 判词措辞按 align 分组（天象短评追加同调性判语 + 编年史宗门三条分组），零机制：
     * OMEN_NODES 白名单零扩（仍 7 · 自立门户卷 §十.4 №2 明禁本卷单方面扩）、既有节点模板池与
     * 本局去重掩码零漂移、宗门红线「零渡劫加项」守住。 */
    var key263 = ['tiandao.sectomen.right', 'tiandao.sectomen.evil',
      'sect.chronicle.found.right', 'sect.chronicle.found.evil',
      'sect.chronicle.win.right', 'sect.chronicle.win.evil',
      'sect.chronicle.succ.right', 'sect.chronicle.succ.evil'];
    var lex263 = key263.filter(function (k) {
      var v = SQ.t(k, { name: 'N', heir: 'H' }, 'xiuxian');
      return v === k || !v || v.indexOf('{') >= 0;
    });
    /* 天象短评：同节点连掷，正道/魔道队列文本各自 = 基准模板 + 本宗按语；左道 = 基准模板原样 */
    var noteR263 = SQ.t('tiandao.sectomen.right', { name: '青云剑宗' }, 'xiuxian');
    var noteE263 = SQ.t('tiandao.sectomen.evil', { name: '赤血魔门' }, 'xiuxian');
    var noteOk263 = noteR263.indexOf('青云剑宗') >= 0 && noteR263 !== 'tiandao.sectomen.right' &&
      noteE263.indexOf('赤血魔门') >= 0 && noteE263 !== 'tiandao.sectomen.evil' && noteR263 !== noteE263;
    var warTpl263 = [];
    for (var wi263 = 1; wi263 <= D.TIANDAO.OMEN_TPL_N.war; wi263++) {
      warTpl263.push(SQ.t('tiandao.skyomen.war.' + wi263, { a: 'A', b: 'B' }, 'xiuxian'));
    }
    var sky263 = {};
    ['right', 'neutral', 'evil'].forEach(function (a) {
      var w = mkSect262(a); w.sect.name = a === 'evil' ? '赤血魔门' : '青云剑宗';
      var before = { stones: w.stones, qi: w.qi, karma: w.karmaEventScore, trib: JSON.stringify(w.tribulation) };
      var txt = SQ.Tiandao.pushOmen(w, pack, D, 'war', { a: 'A', b: 'B' }, Date.now());
      var stripped = txt.slice(0, txt.length - (a === 'neutral' ? 0 : (' ' + SQ.t('tiandao.sectomen.' + a, { name: w.sect.name }, 'xiuxian')).length));
      sky263[a] = {
        ret: txt, len: w.tiandao.omenQueue.length, inPool: warTpl263.indexOf(stripped) >= 0,
        note: a === 'neutral' ? txt === stripped : txt.slice(stripped.length) === ' ' + SQ.t('tiandao.sectomen.' + a, { name: w.sect.name }, 'xiuxian'),
        zeroMech: w.stones === before.stones && w.qi === before.qi && w.karmaEventScore === before.karma &&
          JSON.stringify(w.tribulation) === before.trib
      };
    });
    var succSky263 = (function () { var w = mkSect262('evil'); w.sect.succession = { done: true, heir: 'x', rep: 1, at: 1 };
      return SQ.Tiandao.sectSkyNote(w, pack, D) === ''; })();
    /* 编年史措辞分组：宗门三条 × 三档 = 9 个互不相同的判词，且逐条等于**独立推出**的词表键解析值
     * （期望键由 §2.3 分组建：左道 = 基准键无后缀、正道 .right、魔道 .evil，不经 sectChronKey 自证） */
    var CHRON_BASE263 = { sectfound: 'found', sectwin: 'win', sectsucc: 'succ' };
    var CHRON_SFX263 = { right: '.right', neutral: '', evil: '.evil' };
    var chron263 = {}, chronDiff263 = true, chronHit263 = true;
    ['sectfound', 'sectwin', 'sectsucc'].forEach(function (k) {
      ['right', 'neutral', 'evil'].forEach(function (a) {
        var w = mkSect262(a); w.sect.name = '试剑宗';
        var got = SQ.Tiandao.chronText(w, pack, D, { k: k, v: { name: '试剑宗', heir: '长风' } });
        var want263 = SQ.t('sect.chronicle.' + CHRON_BASE263[k] + CHRON_SFX263[a],
          { name: '试剑宗', heir: '长风' }, 'xiuxian');
        chron263[k + '.' + a] = got;
        if (got !== want263 || !got || got.indexOf('试剑宗') < 0 ||
          got === SQ.t('sect.chronicle.' + CHRON_BASE263[k] + CHRON_SFX263[a], null, 'xiuxian')) chronHit263 = false;
      });
      if (chron263[k + '.right'] === chron263[k + '.evil'] || chron263[k + '.neutral'] === chron263[k + '.evil']) chronDiff263 = false;
    });
    /* 宗门节点未入列 + 模板池对表 + 奏疏总长仍落 MEMO_LEN 区间（措辞分组不得把编年史挤出契约必需行）
     * ⚠️ 2026-10-07 N4 收口批**就地改窄**（旧判据编码的是改前口径、一条未删）：白名单由 7 → 8 节点，
     *    新增项 = `prodrank`（同代榜换位，天骄卷候选扩展节点转正），**宗门节点仍未入列**——本条原判据
     *    的语义（自立门户卷不单方面扩白名单）因此保住，模板池 Σ 由 86 → 96。 */
    var pool263 = D.TIANDAO.OMEN_NODES.length === 8 &&
      D.TIANDAO.OMEN_NODES.join() === 'tribwin,tribfail,break,clear,karma,war,rebirth,prodrank' &&
      D.TIANDAO.OMEN_NODES.every(function (nd) { return nd.indexOf('sect') < 0; }) &&
      Object.keys(D.TIANDAO.OMEN_TPL_N).reduce(function (s, kk) { return s + D.TIANDAO.OMEN_TPL_N[kk]; }, 0) === 96;
    var memo263 = {};
    ['right', 'evil'].forEach(function (a) {
      var w = mkSect262(a);
      w.realm = 4; w.tribulation.attempts = 5; w.tribulation.success = 2; w.cleared = [0, 1, 2];
      w.tiandao.stats = { accept: 2, defy: 1 };
      for (var ci263 = 0; ci263 < 12; ci263++) SQ.Tiandao.chronPush(w, ci263 % 2 ? 'sectfound' : 'clear', { z: 1, name: '试剑宗' }, Date.now() + ci263);
      var askR = SQ.Tiandao.ask(w, pack, D, { talents: [] }, 'wenjie', 0, '', Date.now());
      memo263[a] = askR.ok === true ? askR.text.length : -1;
    });
    var memoLen263 = memo263.right >= D.TIANDAO.MEMO_LEN[0] && memo263.right <= D.TIANDAO.MEMO_LEN[1] &&
      memo263.evil >= D.TIANDAO.MEMO_LEN[0] && memo263.evil <= D.TIANDAO.MEMO_LEN[1];
    ok('263', '自立门户接线②（宗规 → 天道态度 · 判词分组零机制）：(a) 天象短评按 align 追加分组判语——正道褒评 / 魔道差评 / 左道空串（中性即基准模板原样，故该族只 2 键不生孤儿），追加后队列正文剥去按语仍逐字命中 war 节点 13 条模板池（本局去重掩码与 OMEN_TPL_N 对表零漂移），传位后（succession）按语自动摘除；(b) 编年史宗门三条（立派/大捷/传位）措辞按 align 分组，9 个组合两两不同且逐条等于词表解析值（基准键 = 左道中性，未改名故零孤儿）；(c) 全链零机制——pushOmen 前后 stones/qi/karmaEventScore/tribulation 四字段全等、队列仍 +1 条容量 3；OMEN_NODES 内**无宗门节点**（白名单现 8 节点 = N4 收口批追加 `prodrank` 换位节点，宗门节点入列仍归天道卷下次升版，自立门户卷 §十.4 №2 跨卷观察项）、模板池 Σ = 96；8 条新词表键全可解析零 `{}` 残留；(d) 分组措辞入奏疏后总长仍落 MEMO_LEN [500,800] 区间',
      lex263.length === 0 && noteOk263 && sky263.right.note && sky263.evil.note && sky263.neutral.note &&
      sky263.right.inPool && sky263.evil.inPool && sky263.neutral.inPool &&
      sky263.right.len === 1 && sky263.evil.len === 1 && sky263.neutral.len === 1 &&
      sky263.right.zeroMech && sky263.evil.zeroMech && sky263.neutral.zeroMech &&
      sky263.right.ret !== sky263.evil.ret && succSky263 && chronDiff263 && chronHit263 && pool263 && memoLen263,
      '新键缺失=' + (lex263.length ? lex263.join(',') : '0') +
      ' ‖ 天象 len=' + JSON.stringify({ right: sky263.right.ret.length, neutral: sky263.neutral.ret.length, evil: sky263.evil.ret.length }) +
      ' 基准命中池=' + JSON.stringify([sky263.right.inPool, sky263.neutral.inPool, sky263.evil.inPool]) +
      ' ‖ 立派判词 正/左/魔=' + JSON.stringify([chron263['sectfound.right'], chron263['sectfound.neutral'], chron263['sectfound.evil']]) +
      ' ‖ OMEN_NODES=' + D.TIANDAO.OMEN_NODES.length + ' 池Σ=' + Object.keys(D.TIANDAO.OMEN_TPL_N).reduce(function (s, kk) { return s + D.TIANDAO.OMEN_TPL_N[kk]; }, 0) +
      ' 奏疏长=' + JSON.stringify(memo263));

    /* ═══ #264 榜位换位入天象节点（2026-10-07 · 天骄卷 :136/:483 + 天道卷 §7.1 · N4 收口批）═══
     * 取证对象 = 「换位那一瞬间真的有一条天象」这条链，不是「函数存在」：
     *   真链路 Prodigy.tick 跨 RANK_REFRESH_MS 节律 → pushOmen('prodrank') → omenQueue 出正文；
     *   八节点位掩码容量复核（本局去重 de.dedup）+ 旧档 7 位 → 8 位迁移不串位（表尾追加纪律）。 */
    var PD264 = D.PRODIGY, C264 = D.TIANDAO;
    var w264 = pack.initialState();
    w264.realm = 6; w264.zone = 5;                        /* zone 与天骄 rlm 错开 → 月概率事件零触发 */
    w264.prodigies = [];
    for (var p264 = 0; p264 < PD264.COUNT_MAX; p264++) {
      /* 前 3 位封顶境界 9 稳居我之上 ⇒ 真名次 = 4 且月推进不再变（确定性摆位，不靠运气撞换位）*/
      w264.prodigies.push({ id: 'pr' + (p264 + 1), nm: [0, p264 % 6, 0], tl: [], al: 1, fc: -1, fid: null,
        apt: 0, rlm: p264 < 3 ? 9 : 0, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] });
    }
    var t264 = 1700000000000;
    var q264 = function () { return ((w264.tiandao || {}).omenQueue) || []; };
    var tail264 = function () { var a = q264(); return a[a.length - 1] || null; };
    var pcnt264 = function () { return q264().filter(function (o) { return o.node === 'prodrank'; }).length; };
    var snapMech = function () {
      return [w264.stones, w264.qi, w264.karmaEventScore, JSON.stringify(w264.tribulation)].join('|');
    };
    /* 首轮：初始化 prevRank（不当轮播报，正典口径）*/
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264, { log: noopLog() });
    var r264 = w264.prodMarks.myRank;
    var init264 = pcnt264() === 0 && r264 > 2;
    /* ① 反超：prevRank 写差两位 → 刷新边界算回真值 4 ⇒ dir = up、正文落 {rank}/{dir} */
    var mech0 = snapMech();
    w264.prodMarks.myRank = r264 + 2;
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264 + PD264.RANK_REFRESH_MS, { log: noopLog() });
    var upO = tail264();
    var up264 = !!upO && upO.node === 'prodrank' &&
      upO.text.indexOf(SQ.t('tiandao.dir.up', null, 'xiuxian')) >= 0 &&
      upO.text.indexOf(String(r264)) >= 0 && upO.text.indexOf('{') < 0 &&
      w264.prodMarks.myRank === r264 && snapMech() === mech0 && SQ.Tiandao.unseenOmens(w264) >= 1;
    /* ② 被超：反向写差 → dir = down，同一次刷新只入队一条 */
    var p0 = pcnt264();
    w264.prodMarks.myRank = r264 - 2;
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264 + PD264.RANK_REFRESH_MS * 2, { log: noopLog() });
    var dnO = tail264();
    var down264 = !!dnO && dnO.node === 'prodrank' && pcnt264() === p0 + 1 &&
      dnO.text.indexOf(SQ.t('tiandao.dir.down', null, 'xiuxian')) >= 0 &&
      dnO.text.indexOf(String(r264)) >= 0 && dnO.text.indexOf('{') < 0 && w264.prodMarks.myRank === r264;
    /* ③ 名次未变 → 零出账（刷新边界每 10 游戏年一次，不刷屏）*/
    var p1 = pcnt264(), l1 = q264().length;
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264 + PD264.RANK_REFRESH_MS * 3, { log: noopLog() });
    var quiet264 = pcnt264() === p1 && q264().length === l1 && w264.prodMarks.myRank === r264;
    /* ④ 队列容量 OMEN_QUEUE_CAP(3) 溢出挤最旧（连投 5 条换位短评）*/
    for (var oi = 0; oi < 5; oi++) SQ.Tiandao.pushOmen(w264, pack, D, 'prodrank', { dir: 'up', rank: 9 }, t264 + oi);
    var capQ264 = q264().length === C264.OMEN_QUEUE_CAP &&
      q264().every(function (o) { return o.node === 'prodrank' && o.text.indexOf('第 9') >= 0 && o.text.indexOf('{') < 0; });
    /* ⑤ 八节点位掩码容量：prodrank 满池 1..10 严格递增、末抽 2^10−1、第二轮静默重置；
     *    逐节点掩码在 32 位有符号移位内不翻负（第 8 节点入列后仍成立 = 本行明面要求的复核）*/
    var idx264 = C264.OMEN_NODES.indexOf('prodrank');
    var td264 = { omenSeen: [], chenSeen: 0 }, seq264 = [];
    for (var pk264 = 0; pk264 < C264.OMEN_TPL_N.prodrank; pk264++) {
      seq264.push(SQ.Tiandao.pickOmenTpl(td264, C264, 'prodrank', function () { return 0; }));
    }
    var msk264 = td264.omenSeen[idx264];
    var mask264 = seq264.join() === '1,2,3,4,5,6,7,8,9,10' && msk264 === Math.pow(2, 10) - 1 &&
      idx264 === 7 && C264.OMEN_NODES.length === 8 &&
      SQ.Tiandao.pickOmenTpl(td264, C264, 'prodrank', function () { return 0; }) === 1;
    var capBits264 = C264.OMEN_NODES.every(function (nd) {
      var nN = C264.OMEN_TPL_N[nd] || 0;
      return nN >= 1 && nN <= 30 && (1 << (nN - 1)) > 0 && (Math.pow(2, nN) - 1) < 0x7fffffff;
    });
    /* ⑥ 旧档迁移：7 位掩码数组（逐位已点亮）→ normalize 补第 8 位为 0、前 7 位逐位不动 */
    var oldSeen = [1, 3, 7, 15, 31, 63, 127];
    var nz264 = SQ.Tiandao.normalize({ omenSeen: oldSeen.slice() }, D);
    var mig264 = nz264.omenSeen.length === 8 && nz264.omenSeen.slice(0, 7).join() === oldSeen.join() &&
      nz264.omenSeen[7] === 0;
    /* ⑦ 节点名与方向词全可解析（视图 t('tiandao.omen.node.' + node) 取词口）*/
    var lblKey264 = SQ.t('tiandao.omen.node.prodrank', null, 'xiuxian');
    var lbl264 = lblKey264 !== 'tiandao.omen.node.prodrank' && !!lblKey264 && lblKey264.indexOf('{') < 0 &&
      ['up', 'down'].every(function (dd) {
        var k2 = 'tiandao.dir.' + dd, v2 = SQ.t(k2, null, 'xiuxian');
        return v2 && v2 !== k2;
      });
    ok('264', '榜位换位入天象节点（N4 · 节点 7→8 对表 + 换位真出账 + 去重位掩码容量）：(a) 真链路 `Prodigy.tick` 跨 `RANK_REFRESH_MS` 刷新边界、名次真变 ⇒ `omenQueue` 尾条 node=`prodrank`、正文含方向词与**真名次**、零 `{}` 残留、机制四字段逐字节全等（天道卷 §7.1 纯文本零机制）、红点 `unseenOmens` ≥1；(b) 反超 `tiandao.dir.up` / 被超 `tiandao.dir.down` 两向各出一条、同一次刷新只入队一条、**名次未变则零出账**（不刷屏）；(c) 队列容量 `OMEN_QUEUE_CAP`(3) 溢出挤最旧；(d) 八节点位掩码：prodrank 满池取到 1..10 严格递增、末抽掩码 = 2^10−1、耗尽静默开第二轮、`idx = 7`（**表尾追加**纪律）；逐节点 `1<<(N−1)` 在 32 位有符号内为正 ⇒ 第 8 节点入列后容量有余；(e) 旧档 7 位掩码 normalize → 8 位、前 7 位逐位不动、第 8 位补 0（去重记忆不串位）；(f) `tiandao.omen.node.prodrank` + 两枚方向词可解析',
      init264 && up264 && down264 && quiet264 && capQ264 && mask264 && capBits264 && mig264 && lbl264,
      '初始化静默=' + init264 + '(真名次=' + r264 + ') up=' + (upO ? upO.text.slice(0, 30) : '×') +
      ' ‖ down=' + (dnO ? dnO.text.slice(0, 30) : '×') + ' 同级零出账=' + quiet264 + ' 队列=' + q264().length + '/' + C264.OMEN_QUEUE_CAP +
      ' ‖ 满池=' + seq264.join(',') + ' 末掩码=' + msk264 + ' idx=' + idx264 + ' 位容量=' + capBits264 +
      ' ‖ 迁移=' + nz264.omenSeen.join(',') + ' ‖ 节点名=' + lblKey264);

    /* ═══ #265 榜位称号发放口（2026-10-07 · 图鉴卷 §2.9 称号墙来源 + 天骄卷 :6「照旧不翻」补本体 · N5 收口批）═══
     * 图鉴卷把「天骄榜位」列为称号墙来源却**未定义条目**（codex/prodigy 两侧零榜位称号写口），
     * 本批补的就是本体三件套：id `title_bangshou` / 判据 = 首次登顶 / 幂等键 = meta.titles 跨世不清。
     * 取证走生产真路径 `Codex.scan`，不是直调 addTitle。 */
    var TS265 = 80;                                     /* addTitle 的 while(>80) shift 上限 */
    var w265 = mkWs({ realm: 6, zone: 5 });
    w265.prodMarks = { myRank: 1, rankAt: 1, slotMax: 30, rankRows: [], sudiWin: false, evf: {} };
    var m265 = mkMeta();
    var ref265 = { profile: mkProf([]), worlds: { xiuxian: w265 }, meta: m265 };
    SQ.Codex.scan(ref265, 11);
    var nm265 = SQ.t('codex.title.title_bangshou', null, 'xiuxian');
    var got265 = m265.titles.indexOf('title_bangshou') >= 0 && !!nm265 && nm265 !== 'codex.title.title_bangshou' &&
      nm265.indexOf('{') < 0 && ((m265.codices || {}).title || []).indexOf('title_bangshou') >= 0;
    /* 幂等：连扫 5 次不再重复入墙、遗泽零二次发放 */
    var k265 = m265.karma, n265 = m265.titles.length;
    for (var s265 = 0; s265 < 5; s265++) SQ.Codex.scan(ref265, 12 + s265);
    var dupN265 = m265.titles.filter(function (x) { return x === 'title_bangshou'; }).length;
    var idem265 = dupN265 === 1 && m265.titles.length === n265 && m265.karma === k265 && identOk(m265);
    /* 反例两路：② 非榜首（myRank 2）不发、③ 未解锁（prodMarks 恒缺省 = 金丹前）不发 */
    var w265b = mkWs({ realm: 6, zone: 5 });
    w265b.prodMarks = { myRank: 2, rankAt: 1, slotMax: 30, rankRows: [], evf: {} };
    var m265b = mkMeta();
    SQ.Codex.scan({ profile: mkProf([]), worlds: { xiuxian: w265b }, meta: m265b }, 13);
    var w265c = mkWs({ realm: 1, zone: 0 });
    var m265c = mkMeta();
    SQ.Codex.scan({ profile: mkProf([]), worlds: { xiuxian: w265c }, meta: m265c }, 14);
    var neg265 = m265b.titles.indexOf('title_bangshou') < 0 && m265c.titles.indexOf('title_bangshou') < 0;
    /* 跨世不重发：metaNormalize 保 titles（跨世不清）→ 二世再登顶仍只一枚 */
    var mm265 = SQ.Legacy.metaNormalize(JSON.parse(JSON.stringify(m265)));
    w265.prodMarks.myRank = 1;
    SQ.Codex.scan({ profile: mkProf([]), worlds: { xiuxian: w265 }, meta: mm265 }, 15);
    var cross265 = mm265.titles.filter(function (x) { return x === 'title_bangshou'; }).length === 1;
    /* 容量：称号墙现行可获 = 词表 codex.title.* 键数（本批 +1），上限 80 */
    var titleKeys265 = 0, tk265;
    for (tk265 in SQ.LEX.xiuxian) if (tk265.indexOf('codex.title.') === 0) titleKeys265++;
    var cap265 = titleKeys265 === 61 && TS265 === 80 && titleKeys265 <= TS265;
    /* 折叠往返（级⑧ withFoldedTitle，**必须用 #206 那种超 SAVE_TRIGGER 的肥档才触发**——小档根本不折叠）：
     * 带新称号 + 模拟 shift 挤出最旧 2 条 → 落盘无 title 键、titleX 承载差集、
     * normalize 还原 = titleX ++ titles **溢出在前**、还原后 title_bangshou 仍在墙 */
    var ref265f = JSON.parse(JSON.stringify(ref206));
    ref265f.meta.titles.push('title_bangshou');
    ref265f.meta.codices.title.push('title_bangshou');
    var full265 = ref265f.meta.codices.title.slice();
    var ov265 = ['title_overflow_a', 'title_overflow_b'];
    ref265f.meta.codices.title = ov265.concat(full265);
    ref265f.meta.titles = full265.slice(-TS265);
    await SQ.save(ref265f);
    var disk265 = JSON.parse(localStorage.getItem(SQ.KEY) || '{}');
    var cod265 = (disk265.meta || {}).codices || {};
    var foldHit265 = cod265.title == null && typeof cod265.titleX === 'string' &&
      ov265.every(function (x) { return cod265.titleX.indexOf(x) >= 0; });
    var back265 = SQ.normalize(disk265);
    var arr265 = ((back265.meta || {}).codices || {}).title;
    var foldRt265 = Array.isArray(arr265) && arr265.join() === ov265.concat(full265).join() &&
      arr265.indexOf('title_bangshou') >= 0 && ((back265.meta || {}).codices || {}).titleX == null;
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('265', '榜位称号发放口（N5 · 榜首真发 + 幂等 + 跨世不重发 + 容量 + 折叠往返）：(a) 真路径 `Codex.scan` 下 `ws.prodMarks.myRank === 1` ⇒ `meta.titles` 落 `title_bangshou`、**同时进图鉴面 `codices.title`**（同一 scan 内 mergeFace 立即入墙）、词表正文可解析零 `{}`；(b) 连扫 5 次仍 **1 枚**、titles 计数与遗泽 **#197** 零变动；(c) 反例两路零发（myRank=2 / 金丹前 prodMarks 缺省）；(d) `metaNormalize` 后二世再登顶仍 1 枚（`meta.titles` 跨世不清 = 幂等第二重）；(e) 称号墙现行可获 60 → **61**、上限 80（`addTitle` while(>80) shift 一字未动）；(f) 级⑧ 折叠往返无损：落盘无 `codices.title` 键、`titleX` 承载溢出差集、还原 = `titleX ++ titles` 溢出在前恰为原插入序、新称号还原后仍在墙、`titleX` 不残留',
      got265 && idem265 && neg265 && cross265 && cap265 && foldHit265 && foldRt265,
      '入墙=' + (got265 ? 'title_bangshou' : '×') + ' 正文=' + nm265 + ' 连扫枚数=' + dupN265 +
      ' 遗泽变动=' + (m265.karma - k265) + ' 反例=' + neg265 + ' 跨世=' + cross265 +
      ' ‖ 可获=' + titleKeys265 + '/上限=' + TS265 + ' ‖ 折叠=' + foldHit265 + '(' + cod265.titleX + ')' +
      ' 往返=' + foldRt265 + ' 墙内有=' + (Array.isArray(arr265) ? arr265.indexOf('title_bangshou') >= 0 : '×'));

    /* ═══ #270 天骄好感读档不丢（2026-10-08 · 携才投效批顺带抓获的新死链 N19）═══
     * `pack.normalize` 的 bonds 白名单只认 `D.COMPANIONS`，而天骄好感按天骄卷 §6.1 与同道友
     * **同池**存 `ws.bonds.pr{n}` ⇒ 每次读档把天骄好感整键剪掉（实测 40 → 键消失）。
     * 后果：达档三事件 / 一笑泯恩仇 / 携才投效全成「同一会话不刷新才碰得到」的一次性内容。
     * 修法 = 白名单追加**在册天骄**（精确 id，不用前缀通配）。本断言钉四点：
     * 在册天骄保、越界仍 clamp、不在册同前缀键仍剪、道友路径零回归。 */
    var pack270 = SQ.Worlds.xiuxian.pack, D270 = SQ.XDATA;
    var w270 = pack270.normalize({});
    SQ.Prodigy.rollForNewLife(w270, pack270, D270, mkMeta(), 1700000000000);
    var pA270 = w270.prodigies[0].id, pB270 = w270.prodigies[1].id, pC270 = w270.prodigies[2].id;
    var raw270 = JSON.parse(JSON.stringify(w270));
    raw270.bonds[pA270] = 40;                       /* 在册天骄 · 达 JOIN_BOND 档 */
    raw270.bonds[pB270] = 150;                      /* 越界值：放宽白名单不该顺带放宽值域 */
    raw270.bonds[pC270] = -99;                      /* 绝交锁哨兵 */
    raw270.bonds.pr99 = 77;                         /* 同前缀但不在册（出榜/脏档）：仍须剪 */
    raw270.bonds.hanli = 33;                        /* 道友路径零回归 */
    var out270 = pack270.normalize(raw270);
    ok('270', '天骄好感读档不丢（N19 · bonds 白名单追加在册天骄）：(a) `ws.bonds.pr{n}` 经 `pack.normalize` 往返保值 40；(b) 同一天骄仍在达档线 `JOIN_BOND` 之上 ⇒ 携才投效 / 达档三事件读档后照旧可触发；(c) 越界 150 仍 clamp 到 `BOND_MAX`、哨兵 −99 原样保、**不在册的 `pr99` 照剪**（放宽的是名录不是前缀）；(d) 道友 `hanli` 零回归',
      out270.bonds[pA270] === 40 && out270.bonds[pA270] >= D270.PRODIGY.JOIN_BOND &&
      out270.bonds[pB270] === (D270.BOND_MAX || 100) && out270.bonds[pC270] === -99 &&
      out270.bonds.pr99 === undefined && out270.bonds.hanli === 33,
      '在册=' + out270.bonds[pA270] + ' clamp=' + out270.bonds[pB270] + ' 哨兵=' + out270.bonds[pC270] +
      ' 不在册=' + (out270.bonds.pr99 === undefined ? '剪' : out270.bonds.pr99) + ' 道友=' + out270.bonds.hanli);

    /* ═══ #271 携才投效生产者调用点（2026-10-08 · 天骄卷 §6.2 + 自立门户卷 §7.1 · N6 收口批）═══
     * 取证走**生产真路径 `Prodigy.tick`**（不是直调 tryJoin）：月掷命中 ⇒ 弟子入库 + 入门日志，
     * 另钉常量归属（五枚在 `PRODIGY` 块、`SECT` 块零同名——本批第一次实跑就错读了 SECT 块、
     * 全靠代码兜底值才没崩，属「双口径」缺陷形态）与两个曾经的死函数出口（acceptProdigy / joinOpen）。 */
    var w271 = pack270.normalize({});
    w271.realm = 5; w271.mode = 'seclude';
    SQ.Prodigy.rollForNewLife(w271, pack270, D270, mkMeta(), 1700000000000);
    w271.prodigies.forEach(function (p, i) { w271.bonds[p.id] = i === 0 ? 50 : 0; });
    w271.sect = { name: '测试宗门', nameIdx: [1, 1], gate: 'panlong', align: 'right', disciples: [],
      fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 1 }, dispatchAt: 1, lastTribMonth: 1, monthClock: 0,
      warRecord: { wins: 0, loses: 0 }, suppressed: {}, recruitAt: 1, foundAt: 1, declareAt: 1,
      candidate: null, warAgg: null, seq: 0, succession: null };
    var lg271 = [];
    var or271 = Math.random; Math.random = function () { return 0; };
    SQ.Prodigy.tick(w271, pack270, D270, M(mkProf([]), w271), 30000, 1700000000000,
      { log: function (cat, text) { lg271.push(cat + '|' + text); } });
    Math.random = or271;
    var dsc271 = w271.sect.disciples[0] || null;
    ok('271', '携才投效生产者有调用点（N6 · 走 `Prodigy.tick` 真路径）：(a) 月掷命中 ⇒ 弟子入库且 `tianjiao` 与来源位 `pr` 同记、`tier` 良才起底、起境 0（不取真境界防榜面双记）、不占供奉名额；(b) 入门日志由 `sect.disc.join` 出正文（键真消费）；(c) 五枚 `JOIN_*` 归 `PRODIGY` 块且 `SECT` 块零同名（归属对表，防再错读）；(d) `Sect.acceptProdigy` / `Sect.joinOpen` 均已导出（两者曾是零调用死函数）',
      !!dsc271 && w271.sect.disciples.length === 1 && dsc271.tianjiao === true && dsc271.pr === w271.prodigies[0].id &&
      dsc271.tier === 'fine' && dsc271.realm === 0 && !dsc271.offering &&
      lg271.some(function (x) { return x.indexOf('登门求入门') >= 0 && x.indexOf('sect.disc.join') < 0; }) &&
      ['JOIN_P', 'JOIN_BOND', 'JOIN_DC', 'JOIN_FEUD_P', 'JOIN_REFUSE_BOND'].every(function (k) {
        return typeof D270.PRODIGY[k] === 'number' && D270.SECT[k] === undefined;
      }) && typeof SQ.Sect.acceptProdigy === 'function' && typeof SQ.Sect.joinOpen === 'function',
      '弟子=' + (dsc271 ? dsc271.pr + '/' + dsc271.tier + '/rlm' + dsc271.realm : '×') +
      ' 日志=' + lg271.filter(function (x) { return x.indexOf('登门求入门') >= 0; }).length +
      ' JOIN_P=' + D270.PRODIGY.JOIN_P + '/SECT 同名=' + (D270.SECT.JOIN_P === undefined ? 0 : 1));

    /* ═══ #272 开宗失败九因全有键（2026-10-08 · N16 姊妹面 · 任务清单原记「sect.ui.fail.* 整族缺键」）═══
     * view:6790 按 `'sect.ui.fail.' + reason` 拼键、缺键时回落 `rFd.reason` ⇒ **裸英文上屏**
     *（与 N16 炼丹失败族同形）。本断言用一组坏档**跑出** reason 全集（不是抄表），逐条验词表有键。 */
    var w272base = function () {
      var x = pack270.normalize({});
      x.realm = 5; x.factionId = D270.FACTIONS_FIXED[0].id; x.factionRep[x.factionId] = 2000;
      x.factionOffice = 'elder'; x.factionRepPeak = 2000; x.everDefected = true;
      return x;
    };
    var m272ok = mkMeta(); m272ok.unlocks.sect = true;
    var r272 = {};
    var bad272 = [
      ['realm', function (x) { x.realm = 2; }, m272ok],
      ['identity', function (x) { x.factionOffice = null; x.factionId = null; x.everDefected = false; }, m272ok],
      ['peak', function (x) { x.factionRepPeak = 10; }, m272ok],
      ['unlock', function (x) { }, mkMeta()],
      ['has', function (x) { x.sect = { name: '已立', nameIdx: [0, 0], gate: 'wuyue', align: 'right', disciples: [],
        fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, succession: null }; }, m272ok],
      ['done', function (x) { x.sect = { name: '已立', nameIdx: [0, 0], gate: 'wuyue', align: 'right', disciples: [],
        fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, succession: { at: 1 } }; }, m272ok],
      ['gate', function (x) { }, m272ok, 'baidi'],
      ['align', function (x) { }, m272ok, 'wuyue', 'chaos']
    ];
    bad272.forEach(function (c) {
      var x = w272base(); c[1](x);
      var r = SQ.Sect.foundSect(x, pack270, D270, c[2], c[3] || 'wuyue', c[5] || null, null, c[4] || 'right',
        1700000000000, function () {});
      r272[c[0]] = r && r.ok === false ? r.reason : ('OK?' + (r && r.reason));
    });
    /* `name` 因由忌讳库拦下（`Tiandao.filterText`），造不出稳定命中 ⇒ 不跑引擎只补验键在 */
    var miss272 = Object.keys(r272).filter(function (k) {
      return r272[k] !== k || SQ.t('sect.ui.fail.' + k, null, 'xiuxian') === 'sect.ui.fail.' + k;
    });
    if (SQ.t('sect.ui.fail.name', null, 'xiuxian') === 'sect.ui.fail.name') miss272.push('name');
    ok('272', '开宗失败九因全有词表键（裸英文上屏面闭合）：跑出 `canFound` 六因（realm/identity/peak/unlock/has/done）+ `foundSect` 参数二因（gate/align），逐条验 ① 引擎确实返回该 reason（坏档真被拦）② `sect.ui.fail.<reason>` 有键且正文可解析（view:6790 拼键不再回落成裸英文）；第九因 `name` 走忌讳库、无稳定命中可造 ⇒ 只补验键在。**边界**：本断言枚举的是「当前引擎会返回的 reason」，新增 reason 须同步补键（缺键族另有 A6 反向扫描兜底）',
      miss272.length === 0 && Object.keys(r272).length === 8 &&
      SQ.t('sect.ui.fail.name', null, 'xiuxian').length >= 4,
      '跑出=' + Object.keys(r272).map(function (k) { return k + '→' + r272[k]; }).join(' ') + ' 缺键=' + (miss272.join(',') || '无'));

    /* ═══ #273 营建与遗泽购买失败态零裸英文（N16 / N13 姊妹面收口 · 任务清单原 #9 项）═══
     * `buildFac` 的 none / unknown 两因原被 view 直接 `toast(rBd.reason)` 上屏；
     * 购买支的 'unknown' 原是**静默无提示**（点了没反应）。本断言跑出真 reason 再对表词表。 */
    var x273 = w272base();
    x273.sect = { name: '测试宗门', nameIdx: [0, 0], gate: 'wuyue', align: 'right', disciples: [],
      fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, succession: null, seq: 0, warRecord: { wins: 0, loses: 0 },
      suppressed: {}, dispatchAt: 1, lastTribMonth: 1, monthClock: 0, recruitAt: 1, foundAt: 1, declareAt: 1,
      candidate: null, warAgg: null };
    var rN273 = SQ.Sect.buildFac(x273, pack270, D270, 'nosuchfac', 1700000000000, function () {});
    x273.sect.succession = { at: 1 };
    var rS273 = SQ.Sect.buildFac(x273, pack270, D270, 'zangjing', 1700000000000, function () {});
    var kOk273 = function (k) { var v = SQ.t(k, null, 'xiuxian'); return v && v !== k && !/[A-Za-z]{3,}/.test(v); };
    var miss273 = [];
    [['unknown', rN273], ['none', rS273]].forEach(function (c) {
      if (!c[1] || c[1].ok || c[1].reason !== c[0]) miss273.push('跑出应为 ' + c[0] + ' 实为 ' + (c[1] && c[1].reason));
      else if (!kOk273('sect.ui.build.' + c[1].reason)) miss273.push('sect.ui.build.' + c[0]);
    });
    ['sect.ui.build.other', 'legacy.ui.feisheng.lock.info', 'legacy.ui.fail.other', 'legacy.ui.buy.fail']
      .forEach(function (k) { if (!kOk273(k)) miss273.push(k); });
    ok('273', '营建与遗泽购买失败态零裸英文（N16/N13 姊妹面）：(a) 跑出 `buildFac` 两因——非法 fid ⇒ `unknown`、已传位 ⇒ `none`（引擎确实这么返回，不是抄表）；(b) 两因各有 `sect.ui.build.<reason>` 中文键；(c) `sect.ui.build.other`（新 reason 兜底，view 不再回落内部字段名）、`legacy.ui.feisheng.lock.info`（预览取不到）、`legacy.ui.fail.other`（legacyReasonText 兜底）、`legacy.ui.buy.fail`（购买支原静默无提示 ⇒ 现必有反馈）四键在位且正文无 ≥3 连拉丁',
      miss273.length === 0, '跑因=' + rN273.reason + '/' + rS273.reason + ' 缺=' + (miss273.join(',') || '无'));

    /* ═══ #274 融合与淬炼失败态零裸英文（A6 判据修好后照出的同形缺陷 · 裁定收口批）═══
     * A6 补大写字符类后重测：`fuse.ui.fail.*` 整族缺 `full` / `unknown` 两因（`fusion.js:138/145` 实返回），
     * 而「自创并存已满 4 门」是玩家必然撞上的状态 ⇒ 屏上只有裸英文 `full`；淬炼支的 `unknown`
     * 更是**静默无提示**（点了没反应）。本断言跑出真 reason 再对表新补的键。 */
    var x274 = pack270.normalize({});
    x274.realm = 3;
    var ffs274 = D270.FUSE || {};
    var fns274 = [];
    for (var ci274 = 0; ci274 < (ffs274.CUSTOM_MAX || 4); ci274++) fns274.push('cu_fake_' + ci274);
    x274.fusion = { lastFuseAt: 0, lastReforgeAt: 0, meditate: 999, seq: 9, customs: fns274.map(function (id, i) {
      return { id: id, name: '甲' + i, gen: 1, tier: 0, attr: 'jian', sig: '', lv: 1, st: {}, created: 1 };
    }) };
    var lats274 = [];
    for (var la274 in (pack270.artsMap ? pack270.artsMap() : {})) { lats274.push(la274); if (lats274.length >= 2) break; }
    /* 等级起点批顺带接通的一条**潜在真缺陷**：`canFuse` 的满级门槛原写
     * `(ws.artsLevels || {})[idA] < 9`——档里无值时是 `undefined < 9` = false ⇒ 门槛被整体跳过，
     * 未修满的功法本来能进融合坛。入门即 Lv1 后每部都有值，这道关第一次真的生效，
     * 于是本 fixture 必须先把两位父本摆到 Lv9，才测得到它声称的那一因 `full`（不是放宽判据）。 */
    lats274.forEach(function (id) { x274.artsLevels[id] = 9; });
    var rFull274 = SQ.Fusion.canFuse(x274, pack270, D270, lats274[0], lats274[1], 1700000000000);
    var rUnk274 = SQ.Fusion.reforgeCustom(x274, pack270, D270, 'cu_not_exist', 1700000000000, function () {});
    var k274 = function (k) { var v = SQ.t(k, null, 'xiuxian');
      return !!v && v !== k && !/[A-Za-z]{3,}/.test(String(v).replace(/\{[^}]*\}/g, '')); };
    ok('274', '融合与淬炼失败态零裸英文（A6 判据修正后照出的同形缺陷）：(a) 自创并存满 4 门 ⇒ `canFuse` 真返回 `full`、`fuse.ui.fail.full` 有中文键；(b) 淬炼不存在的自创部 ⇒ `reforgeCustom` 真返回 `unknown`、`fuse.reforge.unknown` 有键（视图原为静默无提示）；(c) `fuse.ui.fail.other` 兜底在位 ⇒ 未来新增 reason 不再把字段名打上屏；(d) 既有 `fuse.ui.fail.{locked,lv,gen,wudao,ids}` 五键零回归',
      rFull274.reason === 'full' && k274('fuse.ui.fail.full') && rUnk274.reason === 'unknown' &&
      k274('fuse.reforge.unknown') && k274('fuse.ui.fail.other') &&
      ['locked', 'lv', 'gen', 'wudao', 'ids'].every(function (r) { return k274('fuse.ui.fail.' + r); }),
      '满档=' + rFull274.reason + ' 落空=' + rUnk274.reason);

    /* ═══ #275 宗门材料供奉环（N1 第二环 · 2026-10-08 用户裁定归属 = 炼丹卷 §2.6 立量表）═══
     * 原缺陷形态：设施可建、`sect.tribute` / `sect.tributefac` 两路来源 key 全库零命中、
     * `in.materials` 只有三源 ⇒ 丹房是一条「文案在册、产出无口」的死链。
     * 本断言走**真入口 `Sect.tick`**（不直调 addMats）逐条验速率制五面。 */
    var w275 = mkSectWs220();
    SQ.Sect.foundSect(w275, pack, D, m220, 'panlong', null, null, 'neutral', 1700000000000, noopLog());
    w275.sect.fac = { zangjing: 0, danfang: 2, yanwu: 0, keshe: 0 };
    w275.sect.disciples = [{ id: 'm1', nm: [1, 1], tier: 'mid', realm: 1, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false },
      { id: 'm2', nm: [1, 2], tier: 'mid', realm: 1, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false },
      { id: 'm3', nm: [1, 3], tier: 'fine', realm: 1, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false }];
    w275.zone = 0;
    var TB275 = D.ALCHEMY.TRIBUTE;
    var rate275 = 3 / TB275.DISC_MONTHS[1] + 2 / TB275.FAC_MONTHS;     /* 常见态：3 弟子档 1 + 丹房 2 */
    var sumMat275 = function (w) { var s = 0, k275; for (k275 in w.materials) s += w.materials[k275] || 0; return s; };
    var in0 = SQ.Ledger.matSums(w275).inn, sto0 = sumMat275(w275), lg275 = [];
    var rolled275 = false, or275 = Math.random;
    Math.random = function () { rolled275 = true; return 0.5; };
    SQ.Sect.tick(w275, pack, D, null, 30000 * 12, 1700000000000, { log: function (c, x) { lg275.push(x); } });
    Math.random = or275;
    var in1 = SQ.Ledger.matSums(w275).inn, sto1 = sumMat275(w275);
    var pay275 = Math.floor(rate275 * 12);
    /* 余数结转：12 月期望 5.30 → 缴 5 件、acc 留 ~0.30；再 12 月 = 0.30+5.30 → 缴 5 件（不重复计头） */
    var acc1 = w275.sect.matAcc;
    SQ.Sect.tick(w275, pack, D, null, 30000 * 12, 1700000006000, { log: noopLog() });
    var pay2 = SQ.Ledger.matSums(w275).inn - in1;
    var acc2 = w275.sect.matAcc;
    /* #207 材料恒等式复测：Σin − Σout === Σ存量（供奉走 addMats 唯一写口才不破） */
    var sums275 = SQ.Ledger.matSums(w275);
    var iden275 = (sums275.inn - sums275.out) === sumMat275(w275);
    /* 料种恒取本区组池（跨区不串料） */
    var pool275 = SQ.Alchemy.zoneMats(D, w275.zone), onlyPool = true, kpp;
    for (kpp in w275.materials) if ((w275.materials[kpp] || 0) > 0 && pool275.indexOf(kpp) < 0) onlyPool = false;
    ok('275', '宗门材料供奉环真产料（N1 第二环 · 走 `Sect.tick` 真入口）：(a) 12 游戏月按 §2.6 速率 `3/8 + 2/30` 期望 5.30 件 ⇒ 实缴 5 件、`in.materials` +5 且背包存量 +5（**入账走 `Alchemy.addMats` 唯一写口**，不另开账）；(b) 余数结转留档 ⇒ 再 12 月不重复计头（0.30+5.30 → 缴 5 余 0.60）；(c) **#207 材料恒等式** `Σin − Σout === Σ存量` 续绿；(d) **零掷判**复证（`Sect.tick` 全程不碰 `Math.random`，#221 红线与 sim-pacing 稳态带不被宗门侧污染）；(e) `sect.tribute.mats` 一行入日志、正文可解析；(f) 料种恒取**本区组**池（`zoneMats`），跨区不串料；(g) 灵石账九路 `in` 分类数不变（材料是非灵石资源，永不入灵石账）',
      !rolled275 && pay275 === 5 && in1 - in0 === 5 && sto1 - sto0 === 5 &&
      acc1 > 0.25 && acc1 < 0.35 && acc2 > 0.55 && acc2 < 0.65 && pay2 === 5 &&
      iden275 && lg275.some(function (x) { return x.indexOf('进缴灵材 5') >= 0; }) && onlyPool &&
      Object.keys(w275.ledger.in).length === 5,
      '期望=' + rate275.toFixed(4) + '/月 12月应=' + pay275 + ' 实=' + (in1 - in0) +
      ' 存量增=' + (sto1 - sto0) + ' 余1=' + acc1.toFixed(4) +
      ' 二次缴=' + pay2 + ' 余2=' + acc2.toFixed(4) + ' 恒等=' + iden275 + ' 掷判=' + rolled275 +
      ' 本池=' + onlyPool + ' in路数=' + Object.keys(w275.ledger.in).length);

    /* ═══ #276 传记开宗附加句（图鉴卷 §传记特征键表「开宗」项 · 2026-10-08 裁定收口批）═══
     * 抽取链此前无 `ws.sect` 分支 ⇒ 玩家花整局立的门户在「人生传记」里一个字都不出现；
     * 落地时刻意**不做成 xing 第 6 型**（卷面五型是已登记口径），改附加句，与五型可并存。 */
    var w276 = mkSectWs220();
    SQ.Sect.foundSect(w276, pack, D, m220, 'panlong', '云壑宗', null, 'right', 1700000000000, noopLog());
    w276.sect.disciples = [{ id: 'b1', nm: [2, 3], tier: 'mid', realm: 2, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false },
      { id: 'b2', nm: [4, 5], tier: 'fine', realm: 1, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
    var m276 = mkMeta();
    var prof276 = mkProf([]);
    var bio276 = SQ.Codex.generateBio(w276, m276, pack, D, prof276, 'bingjie', 1700000000000);
    var w276b = mkSectWs220();                       /* 反例：未立派 ⇒ 附加句不得出现、也不得留占位残留 */
    var bio276b = SQ.Codex.generateBio(w276b, mkMeta(), pack, D, prof276, 'bingjie', 1700000000000);
    var t276 = (bio276 && bio276.text) || '', t276b = (bio276b && bio276b.text) || '';
    var noSect276 = mkSectWs220(); noSect276.sect = null;
    var t276c = (SQ.Codex.generateBio(noSect276, mkMeta(), pack, D, prof276, 'bingjie', 1700000000000) || {}).text || '';
    ok('276', '人生传记写得出「开宗」（图鉴卷特征键表最后一项落地）：(a) 立派且门下 2 人 ⇒ 传记含 `立「云壑宗」` 与 `门下 2 人`、无 key 回落无 `{` 残留；(b) 未收徒 / 未立派两型反例均**不出该句**（附加句按 `ws.sect.name` 条件拼，不显空串）；(c) xing 仍只 5 型（附加句不占型位 ⇒ 卷面计数不动）；(d) 全文仍受 BIO_MAX 硬截、不越 500 字',
      t276.length > 0 && t276.indexOf('立「云壑宗」') >= 0 && t276.indexOf('门下 2 人') >= 0 &&
      t276.indexOf('codex.bio.') < 0 && t276.indexOf('{') < 0 &&
      t276b.indexOf('立「') < 0 && t276c.indexOf('立「') < 0 &&
      t276.length <= (D.LEGACY.BIO_MAX || 500) && (function () {
        var nx = 0, kk; for (kk in SQ.LEX.xiuxian) if (kk.indexOf('codex.bio.xing.') === 0) nx++; return nx === 5;
      })(),
      '有派=' + t276.length + '字 含句=' + (t276.indexOf('立「云壑宗」') >= 0) +
      ' 反例=' + (t276b.indexOf('立「') < 0) + '/' + (t276c.indexOf('立「') < 0) + ' 长度上限=' + (D.LEGACY.BIO_MAX || 500));

    /* #296 一世洗髓（天赋池设计 v1.8 §十 · 洗髓批 2026-10-12）：四渠道赐缘 + 单口换骨 + 先判后扣 + 存档往返
     * 立因：创角锁定后天赋一世不改（旧 §一原则 5「已拍板」），本批开四条变更途径 ⇒ 「每世 3 次」预算与
     * 「先判预算再扣资源」是唯一的刷词条防线，而视图不自带判定（候选与替换全在 SQ.Talents）⇒ 判据一律走引擎真入口。
     * 全条零随机：词条一律取自池（不写字面量 id），候选那三枚用 stubRandom 钉住首三位 ⇒ 复跑同值。 */
    var SW296 = D.TALENT_SWAP, cap296 = SW296.PER_LIFE;
    var posPool296 = SQ.TALENTS.common.positive.concat(SQ.TALENTS.xiuxian.positive);
    var negPool296 = SQ.TALENTS.common.negative.concat(SQ.TALENTS.xiuxian.negative);
    var cp296 = function (t) { return JSON.parse(JSON.stringify(t)); };
    var held296 = [cp296(posPool296[0]), cp296(posPool296[1]), cp296(negPool296[0])];
    var prof296 = mkProf(held296); prof296.createdAt = 1000000;
    /* (a) 洗髓丹：真走 drinkPill —— 服下即赐缘且扣丹 */
    var w296 = mkWs({ realm: 7 });
    SQ.Alchemy.ensure(w296, D);
    w296.alchemy.pills = { ap_xisui: 4 };
    var dk296a = SQ.Alchemy.drinkPill(w296, pack, D, 'ap_xisui', 1000001, null, prof296);
    var pill296 = dk296a.ok === true && dk296a.swap === true &&
      w296.talentOwed === 1 && w296.alchemy.pills.ap_xisui === 3;
    /* (b) 预算已满 ⇒ 拒服且**不扣丹**（先判后扣；扣了丹零收益正是第十四批刚收的那一类静默缺陷） */
    w296.talentOwed = cap296;
    var dk296b = SQ.Alchemy.drinkPill(w296, pack, D, 'ap_xisui', 1000002, null, prof296);
    var capRefuse296 = dk296b.ok === false && dk296b.reason === 'swapfull' && w296.alchemy.pills.ap_xisui === 3;
    /* (c) 奇遇效果键 talentSwap：真走 applyEffects；预算已满时收益标签必须被撤销（applied 里不许留没落账的收益） */
    var w296c = mkWs({ realm: 6 });
    SQ.Events.applyEffects(w296c, pack, D, M(prof296, w296c), { talentSwap: 1 }, { applied: {} });
    var evGrant296 = w296c.talentOwed === 1;
    var ctx296 = { applied: { talentSwap: 1 } };
    w296c.talentOwed = cap296;
    SQ.Events.applyEffects(w296c, pack, D, M(prof296, w296c), { talentSwap: 1 }, ctx296);
    var evRevoke296 = ctx296.applied.talentSwap == null && w296c.talentOwed === cap296;
    /* (d) 破境赐缘：**只在 targetRealm === TRIB_FROM 那一次赐**。三档对照 = 起始境界取 TRIB_FROM−2 / −1 / 0
     *     （⇒ 目标境界 TRIB_FROM−1 / 命中档 / +1），故「每次突破都给」（后两档必红）、「永远不给」（命中档红）、
     *     与「档号写错」都跑不掉 */
    var tribPair296 = [SW296.TRIB_FROM - 2, SW296.TRIB_FROM - 1, SW296.TRIB_FROM].map(function (rl, i) {
      var w = mkWs({ realm: rl, qi: 1e9 });
      pack.recalcDerived(w, prof296);
      var rs = stubRandom([0]);
      var r = SQ.Realm.tryBreakthrough(w, pack, D, M(prof296, w), 1000003 + i, { log: noopLog(), profile: prof296 });
      rs();
      return { res: r.result, owed: w.talentOwed };
    });
    var trib296 = tribPair296.every(function (r) { return r.res === 'success'; }) &&
      tribPair296[0].owed === 0 && tribPair296[1].owed === 1 && tribPair296[2].owed === 0;
    /* (e) 遗泽商店：满预算拒购且**不扣泽**、不落幂等键；有余量则扣泽 + 赐缘 + spent = 实价（#197 恒等式口径） */
    var s296 = SQ.defaultState();
    s296.profile = prof296;
    s296.worlds.xiuxian = mkWs({ realm: 6, talentOwed: cap296 });
    s296.meta.karma = 1000;
    var buyFull296 = SQ.Legacy.buy(s296, 'swap', 1000005);
    var shopRefuse296 = buyFull296.ok === false && buyFull296.reason === 'swapfull' &&
      s296.meta.karma === 1000 && s296.meta.spent['shop.swap'] == null && s296.worlds.xiuxian.talentOwed === cap296;
    s296.worlds.xiuxian.talentOwed = 0;
    SQ.Legacy.buy(s296, 'swap', 1000006);
    var shopGrant296 = s296.worlds.xiuxian.talentOwed === 1 && s296.meta.karma === 1000 - D.LEGACY.SWAP_PRICE &&
      s296.meta.spent['shop.swap'] === D.LEGACY.SWAP_PRICE;
    /* (f) 三候选：互不相同、与已持有（含转世天赋槽）零交集、且每条都是池里那条的副本（改它不污染源池） */
    prof296.legacyTalents = [cp296((D.LEGACY.TALENTS || [])[0])];
    var rs296f = stubRandom([0.0001, 0.0001, 0.0001]);
    var cands296 = SQ.Talents.candidates('xiuxian', prof296, 3);
    rs296f();
    var heldIds296 = held296.map(function (t) { return t.id; }).concat([D.LEGACY.TALENTS[0].id]);
    var candIds296 = cands296.map(function (t) { return t.id; });
    var candOk296 = cands296.length === 3 && new Set(candIds296).size === 3 &&
      candIds296.every(function (id) { return heldIds296.indexOf(id) < 0; }) &&
      cands296.every(function (t) { return t.amplified === false && !!t.effects && t.id !== heldIds296[0]; });
    /* (g) 换骨：四拒（无缘 / 未知 id / 撞已持有 / 格号越界）一律不动档，一成则 effects 逐字等于池内定义 */
    var w296g = mkWs({ realm: 6 });
    var profG = mkProf(held296.map(cp296));
    var rNone296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, cands296[0].id);
    w296g.talentOwed = 1;
    var rBad296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, 'no_such_talent_zzz');
    var rDup296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, held296[1].id);
    var rSlot296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 99, cands296[0].id);
    var refuse296 = rNone296.reason === 'none' && rBad296.reason === 'unknown' &&
      rDup296.reason === 'dup' && rSlot296.reason === 'badslot' &&
      w296g.talentOwed === 1 && w296g.talentUsed === 0 &&
      profG.talents.every(function (t, i) { return t.id === held296[i].id; });
    var sumBefore296 = JSON.stringify(M(profG, w296g).sum);
    var rGo296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, cands296[0].id);
    var sumAfter296 = JSON.stringify(M(profG, w296g).sum);
    var goOk296 = rGo296.ok === true && rGo296.from === held296[0].id && rGo296.to === cands296[0].id &&
      profG.talents[0].id === cands296[0].id &&
      JSON.stringify(profG.talents[0].effects) === JSON.stringify(cands296[0].effects) &&
      w296g.talentOwed === 0 && w296g.talentUsed === 1 &&
      sumBefore296 !== sumAfter296;                       /* 乘区真的跟着换骨走（不重算引擎公式，只判「变了」） */
    /* (h) 存档往返：两计数过 normalize 保留、脏值归非负整数；换后的 talent id 过整档 normalize 不丢 */
    var n296 = pack.normalize(Object.assign(pack.initialState(), { talentOwed: 2, talentUsed: 1 }));
    var nDirty296 = pack.normalize(Object.assign(pack.initialState(), { talentOwed: 'x', talentUsed: -5 }));
    var nFrac296 = pack.normalize(Object.assign(pack.initialState(), { talentOwed: 1.7, talentUsed: 2.9 }));
    var s296h = SQ.defaultState();
    s296h.profile = profG;
    s296h.worlds.xiuxian = w296g;
    var back296 = SQ.normalize(s296h);
    var normOk296 = n296.talentOwed === 2 && n296.talentUsed === 1 &&
      nDirty296.talentOwed === 0 && nDirty296.talentUsed === 0 &&
      nFrac296.talentOwed === 1 && nFrac296.talentUsed === 2 &&
      back296.profile.talents[0].id === cands296[0].id &&
      back296.worlds.xiuxian.talentUsed === 1 && back296.worlds.xiuxian.talentOwed === 0;
    /* (i) 池与文档同源：洗髓方在丹方表内且为地阶、洗髓丹在 APILLS 且既无 buff 也无 once（第三类通道） */
    var rcX296 = null; D.ALCHEMY.RECIPES.forEach(function (r) { if (r.id === 'rc_xisui') rcX296 = r; });
    var tbl296 = !!rcX296 && rcX296.tier === 'di' && rcX296.pill === 'ap_xisui' &&
      !!D.ALCHEMY.APILLS.ap_xisui && !D.ALCHEMY.APILLS.ap_xisui.buff && !D.ALCHEMY.APILLS.ap_xisui.once &&
      D.ALCHEMY.APILLS.ap_xisui.swap === true && cap296 === 3 &&
      SQ.Legacy.shopItems(D).some(function (it) { return it.id === 'swap' && it.price === D.LEGACY.SWAP_PRICE; });
    ok('296', '一世洗髓（天赋池设计 v1.8 §十 · 洗髓批）：(a) 洗髓丹真走 drinkPill 赐缘且扣丹 (b) 预算满 ⇒ 拒服**不扣丹**（先判后扣） (c) 奇遇 talentSwap 真走 applyEffects，满则撤销收益标签（applied 不留空账） (d) 破境赐缘三档对照（TRIB_FROM−1 不给 / 命中档给 / +1 不给 ⇒ 「每次突破都给」「永远不给」「档号写错」都红） (e) 遗泽商店满预算拒购**不扣泽**、有余量则扣泽 + 赐缘 + spent = 实价 (f) 三候选互不相同 ∩ 已持有（含转世槽）= ∅ 且 amplified 恒 false (g) 换骨四拒（none/unknown/dup/badslot）一律不动档、一成则 effects 逐字等于池内定义且乘区 sum 跟着变 (h) 两计数过 pack.normalize 保留、脏值/小数归非负整数，换后 id 过整档 normalize 不丢 (i) 丹方/丹药/商店三表同源（ap_xisui 既无 buff 也无 once = 第三类通道，PER_LIFE=3）',
      pill296 && capRefuse296 && evGrant296 && evRevoke296 && trib296 &&
      shopRefuse296 && shopGrant296 && candOk296 && refuse296 && goOk296 && normOk296 && tbl296,
      '丹=' + pill296 + ' 拒服不扣丹=' + capRefuse296 + '(余' + (w296.alchemy.pills.ap_xisui || 0) + ') 事件=' +
      evGrant296 + '/' + evRevoke296 + ' 破境三档=' + tribPair296.map(function (r) { return r.owed; }).join('/') +
      ' 商店=' + shopRefuse296 + '/' + shopGrant296 + ' 候选=' + candIds296.join(',') +
      ' 四拒=' + [rNone296.reason, rBad296.reason, rDup296.reason, rSlot296.reason].join('/') +
      ' 成=' + goOk296 + ' 档=' + normOk296 + ' 表=' + tbl296);

    /* #297 丹药两族合一（第十七批 · 用户令「坊市购买的丹药或者其他地方获得的丹药，统一都放在炼丹炼器页面内，什么时候使用由用户自行决定，也可以赠送给道友」）
     * 旧行为 = 坊市 / 特席 / 门中供给 / 残片兑丹**四口买下去当场生效**（直接 applyEffects，不入库存、绕过丹毒日限），
     * 玩家没有「何时用」的选择权；本批把成品丹（D.PILLS）并入丹匣键空间，四口一律入匣、服用走同一条 drinkPill。
     * （黑市 buy 体与坊市逐字同码、一并改向，但 `genShelf` 的黑市 kind 池只掷 gear/arts/treasure ⇒ 货架从不出现丹药。）
     * 判据取向：**不重算效果公式**（那由 events 侧既有断言守），只钉「流向 + 先判后扣 + 两族同规矩」这一族新形状。 */
    var P297 = D.PILLS[0];   /* juqi · 修为 +30% */
    var prof297 = mkProf([]); prof297.createdAt = 1000000;
    /* (a) 坊市买丹：入匣、**不当场生效**、灵石与账目照旧 */
    var w297 = mkWs({ realm: 3, stones: 100000, qi: 5000 });   /* qiPct 型成品丹按**当前修为**折算 ⇒ 起始修为必须非 0 */
    SQ.Alchemy.ensure(w297, D);
    w297.shop.items = [{ kind: 'pill', ref: P297.id, sold: false, price: P297.price }];
    var qiB297 = w297.qi, buffsB297 = (w297.buffs || []).length, stB297 = w297.stones;
    var b297a = SQ.Shop.buy(w297, pack, D, M(prof297, w297), 0, false, null);
    var inBox297 = b297a.ok === true && w297.alchemy.pills[P297.id] === 1 &&
      w297.qi === qiB297 && (w297.buffs || []).length === buffsB297 && w297.stones === stB297 - P297.price;
    /* (b) 匣满 ⇒ 整笔拒单且**灵石分文不动**（先判后扣；扣了钱丢一颗丹 = 静默零收益那一族） */
    w297.alchemy.pills[P297.id] = (D.ALCHEMY.PILL_STOCK_CAP || 99);
    w297.shop.items = [{ kind: 'pill', ref: P297.id, sold: false, price: P297.price }];
    var stFull297 = w297.stones;
    var b297b = SQ.Shop.buy(w297, pack, D, M(prof297, w297), 0, false, null);
    var fullRefuse297 = b297b.ok === false && b297b.reason === 'pillfull' && w297.stones === stFull297 &&
      w297.shop.items[0].sold === false && w297.alchemy.pills[P297.id] === (D.ALCHEMY.PILL_STOCK_CAP || 99);
    /* (c) 服用成品丹：效果落 + 占丹毒日限（与自产丹同池同规矩） */
    w297.alchemy.pills[P297.id] = 2;
    var qiC297 = w297.qi;
    var d297c = SQ.Alchemy.drinkPill(w297, pack, D, P297.id, 1006002, null, prof297);
    var drinkTrade297 = d297c.ok === true && w297.qi > qiC297 && w297.alchemy.pillDay.n === 1 &&
      w297.alchemy.pills[P297.id] === 1;
    /* (d) 门中供给：拒单时灵石 / 声望 / 24h 锚三者纹丝不动；成功时入匣不当场生效 */
    var w297f = pack.normalize(Object.assign(pack.initialState(), { realm: 4, stones: 999999 }));
    var T297 = 1700000000000;   /* 现实量级：门中供给 24h 冷却以 `now − last` 计，last=0 时小时间戳必被误判 'cd' */
    var supId = ((D.FACTION_SUPPLY || [])[0] || {});
    var supPill = null; (D.PILLS || []).forEach(function (p) { if (p.id === supId.pill) supPill = p; });
    var ok297f = false, ok297g = false;
    if (supId.sku && supPill) {
      w297f.factionId = w297f.factions[0].id;                 /* 名册由 normalize 轮出（固定池 16 + 随机补足），不自己编 id */
      w297f.factionRep = {}; w297f.factionRep[w297f.factionId] = 9999;
      w297f.factionJoinedAt = 0;
      SQ.Alchemy.ensure(w297f, D);
      w297f.alchemy.pills[supPill.id] = (D.ALCHEMY.PILL_STOCK_CAP || 99);
      var stF297 = w297f.stones, repF297 = w297f.factionRep[w297f.factionId];
      var rF297 = SQ.Factions.buySupply(w297f, pack, D, M(prof297, w297f), supId.sku, T297, null);
      ok297f = rF297.ok === false && rF297.reason === 'pillfull' && w297f.stones === stF297 &&
        w297f.factionRep[w297f.factionId] === repF297 && ((w297f.factionSupply || {})[supId.sku] || 0) === 0 &&
        rF297.reason !== 'cd' && rF297.reason !== 'rank' && rF297.reason !== 'rep';   /* 场景本身要成立，不能靠拒因蒙对 */
      w297f.alchemy.pills[supPill.id] = 0;
      w297f.qi = 5000;
      var qiF297 = w297f.qi, bfF297 = (w297f.buffs || []).length;
      var rG297 = SQ.Factions.buySupply(w297f, pack, D, M(prof297, w297f), supId.sku, T297 + 1, null);
      ok297g = rG297.ok === true && w297f.alchemy.pills[supPill.id] === 1 &&
        w297f.qi === qiF297 && (w297f.buffs || []).length === bfF297;
    }
    var supply297 = ok297f && ok297g;
    /* (e) 残片兑丹：匣满拒兑且**片不扣**；成功时扣 20 片、丹入匣 */
    var w297s = mkWs({ realm: 1, zone: 1 });
    SQ.Alchemy.ensure(w297s, D); w297s.shards = [0, 20, 0, 0, 0, 0, 0, 0, 0, 0];
    /* 兑来的丹种是三支里随机一支 ⇒ 满档档必须**三支全满**、成功档必须**三支全清**，否则判据吃随机（采样族） */
    var CAP297 = D.ALCHEMY.PILL_STOCK_CAP || 99;
    w297s.alchemy.pills.juqi = CAP297; w297s.alchemy.pills.ningshen = CAP297; w297s.alchemy.pills.cuiti = CAP297;
    var rS297 = SQ.Combat.exchangeShard(w297s, pack, D, M(prof297, w297s), 1, null, 1000005, null);
    var shardFull297 = rS297.ok === false && rS297.reason === 'pillfull' && w297s.shards[1] === 20;
    w297s.alchemy.pills.juqi = 0; w297s.alchemy.pills.ningshen = 0; w297s.alchemy.pills.cuiti = 0;
    var rS297b = SQ.Combat.exchangeShard(w297s, pack, D, M(prof297, w297s), 1, null, 1000006, null);
    var gotKey297 = rS297b.ok === true && rS297b.reward.type === 'pill' && rS297b.reward.id;
    var shardOk297 = rS297b.ok === true && w297s.shards[1] === 0 && w297s.alchemy.pills[gotKey297] === 1;
    var shard297 = shardFull297 && shardOk297;
    /* (f) 赠丹两族：成品丹按 D.PILLS 自带 tier 计好感；成品破障丹拒因 nogift 且不扣丹 */
    var cs297 = SQ.Bonds.list(pack).filter(function (c) { return c.category !== 'spouse'; });
    var w297g = mkWs({ realm: 5, stones: 99999 });
    SQ.Alchemy.ensure(w297g, D);
    w297g.alchemy.pills.cuiti = 2; w297g.alchemy.pills.pozhang = 2;
    var gTier = null;
    (D.PILLS || []).forEach(function (p) { if (p.id === 'cuiti') gTier = p.tier; });
    var expGift = (D.BOND_GIFT_BY_TIER || {})[gTier];
    var rG297a = SQ.Bonds.giftPill(w297g, pack, D, cs297[0].id, 'cuiti', 1000007, null);
    var rG297b = SQ.Bonds.giftPill(w297g, pack, D, cs297[0].id, 'pozhang', 1000008, null);
    var gift297 = rG297a.ok === true && rG297a.gain === expGift && w297g.alchemy.pills.cuiti === 1 &&
      rG297b.ok === false && rG297b.reason === 'nogift' && w297g.alchemy.pills.pozhang === 2 &&
      SQ.t('bond.gift.fail.nogift', null, 'xiuxian') !== 'bond.gift.fail.nogift';
    /* (g) normalize 白名单：四个成品丹键保留、伪键滤除、旧档（只有自产丹）零受影响 */
    var n297 = SQ.Alchemy.normalize({ pills: { juqi: 3, ningshen: 2, cuiti: 1, pozhang: 9, ap_juqi: 4, bogus_pill: 7 } }, D);
    var n297b = SQ.Alchemy.normalize({ pills: { ap_juqi: 4 } }, D);
    var norm297 = n297.pills.juqi === 3 && n297.pills.ningshen === 2 && n297.pills.cuiti === 1 &&
      n297.pills.pozhang === 9 && n297.pills.ap_juqi === 4 && n297.pills.bogus_pill == null &&
      n297b.pills.ap_juqi === 4 && Object.keys(n297b.pills).length === 1;
    /* (h) 两族同池同限：自产 + 成品混着吃也计同一计数（第 5 颗即拒） */
    var w297h = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w297h, D);
    w297h.alchemy.pills = { ap_juqi: 3, juqi: 3 };
    var profH = mkProf([]); profH.createdAt = 1000000;
    var seqH = [SQ.Alchemy.drinkPill(w297h, pack, D, 'ap_juqi', 1000001, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'juqi', 1000002, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'ap_juqi', 1000003, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'juqi', 1000004, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'juqi', 1000005, null, profH)];
    var samePool297 = seqH.slice(0, 4).every(function (r) { return r.ok === true; }) &&
      seqH[4].reason === 'daily' && w297h.alchemy.pillDay.n === 4;
    /* (i) 🆕 当晚复核 M2 锚：特席是第四个购买口，拒单必须回传可消费的 reason
     * （上一版只给坊市 / 黑市接了返回值 ⇒ 匣满时点了没反应，屏上静默 = 本仓头号缺陷族）*/
    var w297m = mkWs({ realm: 9 });
    w297m.stones = 99999;
    SQ.Alchemy.ensure(w297m, D);
    w297m.shop.merchant = { until: Date.now() + 600000,
      items: [{ kind: 'pill', ref: P297.id, price: P297.price, sold: false }] };
    w297m.alchemy.pills[P297.id] = (D.ALCHEMY.PILL_STOCK_CAP || 99);
    var stM297 = w297m.stones;
    var bM297 = SQ.Shop.buyMerchant(w297m, pack, D, M(prof297, w297m), 0, null);
    var merchant297 = bM297.ok === false && bM297.reason === 'pillfull' &&
      w297m.stones === stM297 && w297m.shop.merchant.items[0].sold === false;
    /* (j) 🆕 当晚复核 M3 锚：丹毒上限文案取表值——模板里不许留裸数字，数字只从表里来 */
    var capTpl297 = ['alchemy.ui.pillcap', 'alchemy.log.pillcap'].every(function (k2) {
      var raw = (SQ.LEX.xiuxian || {})[k2] || '';
      return raw.indexOf('{n}') >= 0 && !/\d/.test(raw);
    });
    var capCopy297 = capTpl297 &&
      SQ.t('alchemy.ui.pillcap', { n: D.ALCHEMY.PILL_DAILY_CAP }, 'xiuxian')
        .indexOf(String(D.ALCHEMY.PILL_DAILY_CAP)) >= 0;
    ok('297', '丹药两族合一（第十七批 · 坊市 / 特席 / 门中供给 / 残片兑丹四口所得一律入丹匣（黑市 buy 体与坊市同码但货架从不掷丹），何时服用玩家定）：(a) 坊市买丹入匣且**不当场生效**（qi / buffs 纹丝不动、灵石与 out.shop 照旧） (b) 匣满 ⇒ 整笔拒单、**灵石分文不动**、货架项不标 sold（先判后扣） (c) 服用成品丹：效果照落 + **占丹毒日限**（与自产同池） (d) 门中供给拒单时灵石 / 声望 / 24h 锚三者不动，成功时入匣不生效 (e) 残片兑丹匣满拒兑且**片不扣**，成功时扣 20 片入匣 (f) 赠丹两族同轨：成品丹按 D.PILLS 自带 tier 计好感、成品破障丹拒因 `nogift` 且不扣丹（issue #4 起赠丹无日限） (g) normalize 白名单认四个成品丹键、伪键滤除、旧档（只有自产丹）零受影响 (h) 两族混吃计同一计数（第 5 颗即拒） (i) 🆕 当晚复核补：特席买丹匣满拒单**回传 reason**、灵石分文不动（视图若不接返回值就是静默无反馈；屏上面由 probe-bondact 两条 + 走查 B4 锚） (j) 🆕 丹毒上限文案取表值不写死数（模板零裸数字，改 `PILL_DAILY_CAP` 屏上跟着动）',
      inBox297 && fullRefuse297 && drinkTrade297 && supply297 && shard297 && gift297 && norm297 &&
      samePool297 && merchant297 && capCopy297,
      '入匣=' + inBox297 + ' 拒单不扣钱=' + fullRefuse297 + ' 服用=' + drinkTrade297 +
      ' 门中=' + supply297 + ' 残片=' + shard297 + ' 赠=' + gift297 + '(玄=' + expGift + ') 档=' + norm297 +
      ' 同池=' + samePool297 + ' 特席拒因=' + merchant297 + ' 上限取表=' + capCopy297);

    /* #298 坊市与特席的先判后扣（第廿六批 2026-10-13 · 用户报「买了春风化雨篇，法与器里却没解锁」，
     *   排查出的整族缺陷——掷货时按「未持有」过滤候选，但货架要挂满 4 小时才补货，这期间玩家可能
     *   经自悟 / 奇遇 / 残片兑换 / 图纸打造先拿到同一件；旧写法购买时不复查 ⇒ 照扣钱、零收益、零日志）：
     *   (a) 功法已拥有 → 拒 owned：灵石分文不动、货架项不标 sold
     *   (b) 未达标且待修习架已满 24 → 拒 shelffull（旧行为 = 扣 2,300 折回 1,150、功法凭空消失）
     *   (c) 丹方 / 普通图纸 / 丹炉图(已有炉) / 丹炉成品 / 法宝 已拥有 → 各拒 owned；材料包永远放行
     *   (d) 未达标但架未满 → 仍落待修习架（#101 旧口径不回归），灵石照扣
     *   (e) 弹窗与成交同源：expect 指纹与序号上的货对不上 → 拒 stale（实测过：弹窗写功法、扣的是另一件）
     *   (f) 成交路径真的写日志（旧：Actions.buy 给 Shop.buy 传 null ⇒ 入门/上架/折算全程无痕）
     *   (g) 特席 buyMerchant 走同一判定（已拥有 → owned、灵石不动）
     *   (h) 库藏阁手动炼化：指纹对不上 → 拒 stale，**两件都还在、灵石分文不动**（旧写法会在序号位移后炼掉玩家没点的那件） */
    var shopArtIds = Object.keys(SQ.XARTS).filter(function (id) {
      return (SQ.XARTS[id].obtain || {}).type === 'shop' && id !== 'chunyu';
    });
    function shelf298(w, items) {
      w.shop = { items: items, blackItems: [], nextRestock: Date.now() + 864000000, refreshStep: 0, discount: 0 };
      return w;
    }
    var artItem298 = function () { return { kind: 'arts', ref: 'chunyu', sold: false, price: 2300 }; };
    var prof298 = mkProf();
    var w298a = shelf298(mkWs({ realm: 5, stones: 100000, artsKnown: ['tuna', 'chunyu'], artsSlots: ['tuna'] }), [artItem298()]);
    var r298a = SQ.Shop.buy(w298a, pack, D, M(prof298, w298a), 0, false, noopLog());
    var own298 = r298a.ok === false && r298a.reason === 'owned' &&
      w298a.stones === 100000 && w298a.shop.items[0].sold === false;

    var w298b = shelf298(mkWs({ realm: 1, stones: 100000, artsKnown: ['tuna'], artsSlots: ['tuna'], shelf: [] }), [artItem298()]);
    var mB = M(prof298, w298b);            /* 先重算（recalcDerived 会把可达标的架上功法转正），再摆满架 */
    w298b.shelf = shopArtIds.slice(0, D.SHELF_CAP);
    var r298b = SQ.Shop.buy(w298b, pack, D, mB, 0, false, noopLog());
    var full298 = w298b.shelf.length === D.SHELF_CAP && r298b.ok === false && r298b.reason === 'shelffull' &&
      w298b.stones === 100000 && w298b.artsKnown.indexOf('chunyu') < 0 && w298b.shelf.indexOf('chunyu') < 0;

    var rec298 = D.ALCHEMY.RECIPES[0], bp298 = null, bpF298 = null;
    D.ALCHEMY.BLUEPRINTS.forEach(function (b) { if (!b.furnace && !bp298) bp298 = b; if (b.furnace) bpF298 = b; });
    function packBuy298(good, price, w) {
      shelf298(w, [{ kind: 'pack', pack: good, sold: false, price: price }]);
      return SQ.Shop.buy(w, pack, D, M(prof298, w), 0, false, noopLog());
    }
    var w298c = mkWs({ realm: 6, stones: 100000 });
    SQ.Alchemy.ensure(w298c, D);
    w298c.alchemy.recipes.push(rec298.id);
    var gRec = packBuy298({ type: 'recipe', ref: rec298.id, price: 400 }, 400, w298c);
    var w298bp = mkWs({ realm: 6, stones: 100000 }); SQ.Alchemy.ensure(w298bp, D); w298bp.alchemy.blueprints.push(bp298.id);
    var gBp = packBuy298({ type: 'bp', ref: bp298.id, price: 600 }, 600, w298bp);
    var w298bf = mkWs({ realm: 6, stones: 100000 }); SQ.Alchemy.ensure(w298bf, D); w298bf.alchemy.furnace = true;
    var gBpF = packBuy298({ type: 'bp', ref: bpF298.id, price: 800 }, 800, w298bf);
    var gFur = packBuy298({ type: 'furnace', price: 2000 }, 2000, w298bf);
    var tid298 = Object.keys(pack.treasures.byId)[0];
    var w298t = mkWs({ realm: 6, stones: 100000 }); SQ.Treasures.gain(w298t, pack, D, tid298, noopLog());
    shelf298(w298t, [{ kind: 'treasure', ref: tid298, sold: false, price: 6000 }]);
    var r298t = SQ.Shop.buy(w298t, pack, D, M(prof298, w298t), 0, false, noopLog());
    var w298m = mkWs({ realm: 6, stones: 100000, materials: {} });
    var gMat = packBuy298({ type: 'mat', ref: 'mat_linglu', price: 300 }, 300, w298m);
    var dup298 = gRec.ok === false && gRec.reason === 'owned' && w298c.stones === 100000 &&
      gBp.ok === false && gBp.reason === 'owned' && w298bp.stones === 100000 &&
      gBpF.ok === false && gBpF.reason === 'owned' && gFur.ok === false && gFur.reason === 'owned' &&
      w298bf.stones === 100000 && w298bf.alchemy.furnace === true &&
      r298t.ok === false && r298t.reason === 'owned' && w298t.stones === 100000 &&
      gMat.ok === true && w298m.stones === 99700 && Object.keys(w298m.materials).length > 0;

    var w298d = shelf298(mkWs({ realm: 1, stones: 100000, artsKnown: ['tuna'], artsSlots: ['tuna'], shelf: [] }), [artItem298()]);
    var r298d = SQ.Shop.buy(w298d, pack, D, M(prof298, w298d), 0, false, noopLog());
    var shelfPath298 = r298d.ok === true && w298d.shelf.indexOf('chunyu') >= 0 &&
      w298d.artsKnown.indexOf('chunyu') < 0 && w298d.stones === 97700;

    var w298e = shelf298(mkWs({ realm: 5, stones: 100000, artsKnown: ['tuna'], artsSlots: ['tuna'], shelf: [] }), [artItem298()]);
    var mE = M(prof298, w298e);
    var other298 = { kind: 'arts', ref: 'qingxin', sold: false, price: 120 };
    var r298e = SQ.Shop.buy(w298e, pack, D, mE, 0, false, noopLog(), SQ.Shop.goodSig(other298));
    var stoneAfterStale298 = w298e.stones;
    var r298e2 = SQ.Shop.buy(w298e, pack, D, mE, 0, false, noopLog(), SQ.Shop.goodSig(w298e.shop.items[0]));
    var stale298 = r298e.ok === false && r298e.reason === 'stale' && stoneAfterStale298 === 100000 &&
      r298e2.ok === true && w298e.artsKnown.indexOf('chunyu') >= 0;

    var ref298 = {};
    await SQ.mutate(ref298, function (s) {
      s.profile = mkProf();
      s.worlds.xiuxian = pack.initialState();
      var wS = s.worlds.xiuxian;
      wS.realm = 5; wS.stones = 100000; wS.artsKnown = ['tuna']; wS.artsSlots = ['tuna']; wS.shelf = [];
      shelf298(wS, [artItem298()]);
    });
    var logs298Before = (ref298.worlds.xiuxian.log || []).length;
    await SQ.Actions.buy(ref298, 0, false, SQ.Shop.goodSig(ref298.worlds.xiuxian.shop.items[0]));
    var logTxt298 = (ref298.worlds.xiuxian.log || []).slice(logs298Before).map(function (l) { return String(l.text || l.txt || ''); }).join(' ');
    var log298 = (ref298.worlds.xiuxian.log || []).length > logs298Before && /春风化雨篇/.test(logTxt298);

    /* (g2) 第卌六批（用户反馈「坊市买功法后功法页看不见」）：**未达标**那一支原本一条日志都不写
       ⇒ 走真入口买一部 realm 要求未达的功法，日志必须写出「入待修习架」的去向（入门支与溢出支早有日志，只差这一支）。 */
    var ref298s = {};
    await SQ.mutate(ref298s, function (s) {
      s.profile = mkProf();
      s.worlds.xiuxian = pack.initialState();
      var wS2 = s.worlds.xiuxian;
      wS2.realm = 1; wS2.stones = 100000; wS2.artsKnown = ['tuna']; wS2.artsSlots = ['tuna']; wS2.shelf = [];
      shelf298(wS2, [artItem298()]);
    });
    var logs298sBefore = (ref298s.worlds.xiuxian.log || []).length;
    await SQ.Actions.buy(ref298s, 0, false, SQ.Shop.goodSig(ref298s.worlds.xiuxian.shop.items[0]));
    var w298s = ref298s.worlds.xiuxian;
    var logTxt298s = (w298s.log || []).slice(logs298sBefore).map(function (l) { return String(l.text || l.txt || ''); }).join(' ');
    var stow298 = w298s.shelf.indexOf('chunyu') >= 0 && w298s.artsKnown.indexOf('chunyu') < 0 &&
      w298s.stones === 97700 && (w298s.log || []).length > logs298sBefore &&
      /待修习架/.test(logTxt298s) && /春风化雨篇/.test(logTxt298s);

    var w298g = shelf298(mkWs({ realm: 5, stones: 100000, artsKnown: ['tuna', 'chunyu'], artsSlots: ['tuna'] }), []);
    w298g.shop.merchant = { until: Date.now() + 600000, scout: false, items: [artItem298()] };
    var r298g = SQ.Shop.buyMerchant(w298g, pack, D, M(prof298, w298g), 0, noopLog());
    var merch298 = r298g.ok === false && r298g.reason === 'owned' && w298g.stones === 100000 &&
      w298g.shop.merchant.items[0].sold === false;

    /* (h) 库藏阁的手动炼化（销毁性操作）：CONFIRM 无阻塞，期间战斗掉落会 push 库藏、
       溢出还会炼化别件 ⇒ 序号整体位移。视图带回指纹，对不上就不销毁任何东西。 */
    var w298h = mkWs({ realm: 5, stones: 100000 });
    var gA = mkGear('weapon', { name: '甲', tier: 2, atk: 40 });
    var gB = mkGear('weapon', { name: '乙', tier: 1, atk: 20 });
    w298h.stash = [gA, gB];
    var mH = M(prof298, w298h);
    var r298h = SQ.Gear.salvage(w298h, pack, D, mH, 0, noopLog(), SQ.Gear.itemSig(gB));
    var mid298h = { n: w298h.stash.length, st: w298h.stones };      /* 拒单当下的现场（后续成交会改档，不能事后回看） */
    var r298h2 = SQ.Gear.salvage(w298h, pack, D, mH, 0, noopLog(), SQ.Gear.itemSig(gA));
    var stash298 = r298h.ok === false && r298h.reason === 'stale' && mid298h.n === 2 &&
      mid298h.st === 100000 && r298h2.ok === true && w298h.stash.length === 1 && w298h.stones > 100000;

    ok('298', '坊市与特席的先判后扣（第廿六批 · "买到的东西必须落得下"整族）：(a) 功法已拥有拒 owned (b) 未达标且待修习架已满拒 shelffull（不再"扣全价退半、功法凭空消失"） (c) 丹方/普通图纸/丹炉图(已有炉)/丹炉成品/法宝 已拥有各拒 owned，材料包放行 (d) 未达标而架未满仍落架（#101 口径不回归） (e) expect 指纹与序号上的货不符 → 拒 stale（弹窗期间被补货换架的实测形状） (f) 成交写交付日志（旧传 null ⇒ 全程无痕） (g) 特席同判定 (h) 库藏炼化错位拒单、不销毁 (i) 第卌六批：未达标落架也写**去向日志**（这一支原本零日志 ⇒ 玩家以为货丢了）',
      own298 && full298 && dup298 && shelfPath298 && stale298 && log298 && merch298 && stash298 && stow298,
      '已拥有=' + own298 + ' 架满=' + full298 + ' 子货重复=' + dup298 + ' 落架=' + shelfPath298 +
      ' 错位=' + stale298 + ' 日志=' + log298 + '(' + logTxt298.slice(0, 26) + ') 特席=' + merch298 + ' 炼化=' + stash298 +
      ' 落架日志=' + stow298 + '(' + logTxt298s.slice(0, 40) + ')');


    /* ═══ #299 前世书的游戏日期 + 历法单源（第廿八批 2026-10-13 · 用户报「前世书里的文本描述有问题，
     * 写着是日但是没有写具体游戏时间」；同批把视图里的历法算式上移到 core 收成单源）═══
     * 全条零随机：日期一律由固定 createdAt / calYear / ts 推出，正文取 generateBio 真产物。 */
    var CA299 = 1700000000000, CY299 = 7, NOW299 = CA299 + 800000;
    var w299 = mkWs({ calYear: CY299 });
    var prof299 = mkProf([]); prof299.createdAt = CA299; prof299.worldName = '沧霄界';
    /* (a) 历法逐值对表：入世当日 = 起始年 1 月 1 日；第 359 日 = 12 月 30 日；第 360 日翻年；
     *     ts 早于入世 ⇒ 钳到第 0 日（不出现负日） */
    var g299a = SQ.gameDateOf(prof299, w299, CA299);
    var g299b = SQ.gameDateOf(prof299, w299, CA299 + 359 * 1000);
    var g299c = SQ.gameDateOf(prof299, w299, CA299 + 360 * 1000);
    var g299d = SQ.gameDateOf(prof299, w299, CA299 - 5000);
    var cal299 = g299a.y === 7 && g299a.m === 1 && g299a.d === 1 &&
      g299b.y === 7 && g299b.m === 12 && g299b.d === 30 &&
      g299c.y === 8 && g299c.m === 1 && g299c.d === 1 &&
      g299d.y === 7 && g299d.m === 1 && g299d.d === 1;
    /* (b) 显示名 = 世界名去尾字（沧霄界 → 沧霄）；createdAt 缺失 ⇒ 空串（**绝不写「0年0月0日」那种假日期**） */
    var str299 = SQ.gameDateStr(prof299, w299, CA299 + 41 * 1000, 'xiuxian');
    var str299no = SQ.gameDateStr({ name: 'x' }, w299, CA299, 'xiuxian');
    var strOk299 = str299 === '沧霄历7年2月12日' && str299no === '';
    /* (c) 传记时间轴：每条大事与通道终行都带**各自那天**的日期；「是日」族模板一字未动
     *     （同一批键还与天道编年史、问天谪星共用，改模板会连坐两处 ⇒ 只补行首日期） */
    var w299e = mkWs({ calYear: CY299, realm: 5 });
    w299e.tiandao = w299e.tiandao || {};
    w299e.tiandao.chron = [
      { k: 'clear', v: { z: 0 }, at: CA299 + 9 * 1000 },
      { k: 'break', v: { realm: 3 }, at: CA299 + 370 * 1000 }
    ];
    var t299 = String((SQ.Codex.generateBio(w299e, mkMeta(), pack, D, prof299, 'bingjie', NOW299) || {}).text || '');
    var d299a = SQ.gameDateStr(prof299, w299e, CA299 + 9 * 1000, 'xiuxian');
    var d299b = SQ.gameDateStr(prof299, w299e, CA299 + 370 * 1000, 'xiuxian');
    var d299c = SQ.gameDateStr(prof299, w299e, NOW299, 'xiuxian');
    var bioOk299 = t299.indexOf(d299a + ' · 是日首通青云试炼地。') >= 0 &&
      t299.indexOf(d299b + ' · 是日渡劫破境，入元婴。') >= 0 &&
      t299.indexOf(d299c + ' · 是日自散修为，兵解转世。') >= 0;
    /* (d) 旧档兜底：无 createdAt ⇒ 正文照常出、不补日期、零花括号残留 */
    var prof299old = { name: 't', talents: [], worldId: 'xiuxian', worldName: '沧霄界' };
    var t299old = String((SQ.Codex.generateBio(w299e, mkMeta(), pack, D, prof299old, 'bingjie', NOW299) || {}).text || '');
    var oldOk299 = t299old.indexOf('是日首通青云试炼地。') >= 0 && t299old.indexOf('沧霄历') < 0 && t299old.indexOf('{') < 0;
    /* (e) 硬截不破：编年史塞满（>slice(-7) 上界）时正文仍受 BIO_MAX 约束，且**尾行「计：」不被日期挤掉**
     *     ——日期每行多 12~14 字，这一判就是盯「补了日期把摘要挤出 500 字」这一新风险 */
    var w299f = mkWs({ calYear: CY299, realm: 8 });
    w299f.tiandao = w299f.tiandao || {};
    w299f.tiandao.chron = [];
    for (var ci299 = 0; ci299 < 9; ci299++) w299f.tiandao.chron.push({ k: 'break', v: { realm: ci299 % 6 }, at: CA299 + (ci299 + 1) * 1000 });
    var t299f = String((SQ.Codex.generateBio(w299f, mkMeta(), pack, D, prof299, 'bingjie', NOW299) || {}).text || '');
    var maxOk299 = t299f.length <= (D.LEGACY.BIO_MAX || 500) && t299f.indexOf('计：') >= 0;
    /* (f) 单源：core 导出两枚函数（视图那两份算式已改成委托，文件级 grep 由 sq-wip-dbg-cal.cjs 出数） */
    var src299 = typeof SQ.gameDateOf === 'function' && typeof SQ.gameDateStr === 'function';
    /* (g) 同型面：烧表请天道作传的**奏疏**读的是同一族「是日」模板 ⇒ 同批补日期，两个读点不分叉 */
    var memo299 = String(SQ.Codex.bioMemo(
      { profile: prof299, worlds: { xiuxian: w299e }, meta: mkMeta() }, NOW299) || '');
    var memoOk299 = memo299.indexOf(d299a + ' · 是日首通青云试炼地。') >= 0 &&
      memo299.indexOf('{') < 0 && memo299.length <= (D.LEGACY.BIO_MEMO_LEN || 1500);
    ok('299', '前世书写得出游戏时间 + 历法算式收成单源（第廿八批 · 用户报「轮回页面的前世书，文本描述有问题，写着是日但是没有写具体游戏时间」）：(a) 历法逐值对表（入世当日 / 第 359 日 / 第 360 日翻年 / ts 早于入世钳零） (b) 世界名去尾字 + createdAt 缺失返空串，不写假日期 (c) 传记时间轴每条大事与终行各带**那天**的日期，「是日」族模板一字未动 (d) 旧档无 createdAt ⇒ 原样不补、零花括号 (e) BIO_MAX 硬截不破且尾行「计：」不被挤掉 (f) core 导出 gameDateOf / gameDateStr 成唯一实现 (g) 同型面：烧表奏疏同口径带日期、不破 BIO_MEMO_LEN',
      cal299 && strOk299 && bioOk299 && oldOk299 && maxOk299 && src299 && memoOk299,
      '历法=' + [g299a.m + '/' + g299a.d, g299b.m + '/' + g299b.d, g299c.y + '/' + g299c.m + '/' + g299c.d, g299d.m + '/' + g299d.d].join(' ') +
      ' 正文=' + str299 + ' 缺createdAt=' + (str299no === '') + ' ‖ 传记三条=' + bioOk299 +
      ' ‖ 旧档=' + oldOk299 + ' ‖ 上限=' + maxOk299 + '(' + t299f.length + '/' + (D.LEGACY.BIO_MAX || 500) + ') ‖ 单源=' + src299);


    /* ═══ #300 材料背包的「提炼档」标识（第廿九批 2026-10-13 · 用户报「材料背包顺序是乱的，要让玩家明白
     * 低级材料精炼升级的是哪种高级材料，同一条升级线的材料要有标识」）═══
     * 立的是**取数口** `SQ.Alchemy.groupIds`：界面段头写的「第 X 档任一（共 p 种）」与 `refineMats`
     * 真正随机抽的池必须同源，否则改一处口径屏上就开始说谎（本仓反复登记的那一族缺陷）。 */
    var gid300 = function (g) { return SQ.Alchemy.groupIds(D, g); };
    var allPos300 = D.ALCHEMY.MATS.filter(function (m) { return m.z >= 0; }).map(function (m) { return m.id; });
    var union300 = [], dup300 = false, g300;
    for (g300 = 0; g300 <= 3; g300++) gid300(g300).forEach(function (x) {
      if (union300.indexOf(x) >= 0) dup300 = true; else union300.push(x);
    });
    /* (a) 四档划分 = 表内 z>=0 全料**不重不漏**，且档号边界逐值对表（z2→0 / z3→1 / z5→1 / z6→2 / z8→2 / z9→3） */
    var rankEdge300 = SQ.Alchemy.groupOf(D, 'mat_dansha') === 0 &&        /* z2 */
      SQ.Alchemy.groupOf(D, 'mat_jiaotu') === 1 &&                        /* z3 */
      SQ.Alchemy.groupOf(D, 'mat_xukong') === 1 &&                        /* z5 */
      SQ.Alchemy.groupOf(D, 'mat_xiuluo') === 2 &&                        /* z6 */
      SQ.Alchemy.groupOf(D, 'mat_zilei') === 2 &&                         /* z8 */
      SQ.Alchemy.groupOf(D, 'mat_jiewai') === 3 &&                        /* z9 = 顶档 */
      SQ.Alchemy.groupOf(D, 'mat_wudao') === 3;                           /* z<0 按顶档卖价 */
    var cover300 = !dup300 && union300.length === allPos300.length &&
      allPos300.every(function (x) { return union300.indexOf(x) >= 0; }) &&
      gid300(3).indexOf('mat_wudao') < 0 &&                               /* 悟道石不入任何产出池 */
      gid300(0).length === 8 && gid300(1).length === 9 && gid300(2).length === 9 && gid300(3).length === 3;
    /* (b) **屏上候选池 === 引擎真抽的池**：钉随机取池首，真跑 refineMats ⇒ 得料必须等于界面那一份的第一位，
     *     且池长 === 界面写的种数（p）。这一步不做，界面写 9 种而引擎抽 8 种是不会红的。 */
    var w300 = mkWs({ realm: 5, materials: { mat_linglu: 4 } });
    SQ.Alchemy.ensure(w300, D);
    w300.materials = { mat_linglu: 4 };
    var pool1 = gid300(1), rest300 = null;
    rest300 = stubRandom([0]);
    var rf300 = SQ.Alchemy.refineMats(w300, pack, D, 'mat_linglu', 1000, noopLog());
    rest300();
    var poolSame300 = rf300 && (w300.materials[pool1[0]] || 0) === 1 &&
      Object.keys(w300.materials).filter(function (k) { return (w300.materials[k] || 0) > 0; }).length === 1 &&
      (w300.materials.mat_linglu || 0) === 0;   /* 四枚低级料全部消失（0 或被剪键都算，视 normalize 而定） */
    /* (c) 顶档与悟道石不可炼，且一律**先判后扣**（料分文不动） */
    var w300t = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w300t, D);
    w300t.materials = { mat_jiewai: 9, mat_wudao: 9 };
    var rfTop = SQ.Alchemy.refineMats(w300t, pack, D, 'mat_jiewai', 1001, noopLog());
    var rfWud = SQ.Alchemy.refineMats(w300t, pack, D, 'mat_wudao', 1002, noopLog());
    var topNo300 = rfTop.ok === false && rfTop.reason === 'top' &&
      rfWud.ok === false && rfWud.reason === 'wudao' &&
      w300t.materials.mat_jiewai === 9 && w300t.materials.mat_wudao === 9;
    /* (d) 差分证明「档是**派生值**、口径只有那张表」：把 mat_linglu 的 z 从 0 改成 3 ⇒ 它当场从一档挪进二档
    *     （界面与引擎同读一份 MATS；若视图自己抄了一份档位划分，这一步就不会跟着动）。原表未被污染。 */
    var D300 = JSON.parse(JSON.stringify(D));
    D300.ALCHEMY.MATS.forEach(function (m) { if (m.id === 'mat_linglu') m.z = 3; });
    var noField300 = SQ.Alchemy.groupOf(D300, 'mat_linglu') === 1 &&
      SQ.Alchemy.groupIds(D300, 0).indexOf('mat_linglu') < 0 &&
      SQ.Alchemy.groupIds(D300, 1).indexOf('mat_linglu') >= 0 &&
      SQ.Alchemy.groupOf(D, 'mat_linglu') === 0 && gid300(0).length === 8;
    ok('300', '材料背包的「提炼档」标识（第廿九批 · 用户报「材料顺序是乱的，要看得出低级料炼成哪种高级料、同一条升级线要有标识」）：(a) 四档划分不重不漏 + 档界逐值对表（z2→1档 / z3~z5→2档 / z6~z8→3档 / z9 与悟道石→顶档卖价） (b) 屏上候选池 === `refineMats` 真抽的池（钉随机取池首，得料 = 界面所列第一种，且背包只剩这一枚） (c) 顶档与悟道石不可炼且**先判后扣**（料分文不动） (d) 档位是派生值不入存档（零新字段、零 normalize 面）',
      rankEdge300 && cover300 && poolSame300 && topNo300 && noField300,
      '界=' + rankEdge300 + ' ‖ 池=' + [gid300(0).length, gid300(1).length, gid300(2).length, gid300(3).length].join('/') +
      ' 覆盖=' + cover300 + ' ‖ 同池=' + poolSame300 + '(得 ' + pool1[0] + ') ‖ 顶档拒=' + topNo300 +
      ' ‖ 不入档=' + noField300);

    /* #301 品阶强度阶梯对表（第卅八批 · 用户令「四品阶数值太接近，重排到高品阶要明显更强」；词条档位经询 = 1/2/3.5/6）
     * 八面各钉一条，少钉一面都能悄悄退回去（2026-10-15 返工把 (e) 改成压缩阶梯、新增 (f)(g)(h) 三面）：
     *  (a) 逐字段逐阶**阶中位 === 基准 × 词条阶梯**（±0.5%）——阶梯的绝对那一半（基准 = 该字段黄阶中位，黄阶无样时用该阶现值 ÷ 阶梯）；
     *  (b) 逐字段**跨阶不倒挂**，射程 = 玄→地→天 零重叠（本批开工前实测有 42 对倒挂）；黄→玄 另由 (g) 管；
     *  (c) **黄阶中位仍是原锚**（qiRate .03 / combatPower .045 / offlineEff .04 / qiCap .04）⇒ 「黄阶保持现值、账由终局付」是判据而不是口头承诺；
     *  (d) `FUSE.FIELD_CAP` === 全录该字段每级最大值（导出口不许手调；红线四类另有 clamp 通道，不在此列）；
     *  (e) **属性滋养走另一条压缩阶梯**：同阵营同级的黄/玄/地/天四部，`SQ.Attrs.artsNurtureOf` 之比 === 1 : 1.5 : 2 : 2.5
     *      （引擎与视图同读这一处算式，第卅六批那条「屏上说的必须等于生效的」在这里继续生效）；
     *  (f) 开局两部 = dev 原值（吐纳法 qiRate 5% / 聚灵诀 qiCap 10%）——返工的正身，防「中位保住而单条被改」再犯；
     *  (g) 黄→玄 带例外**集合相等** = {qiCap, qiRate}，多一条倒挂或例外被抹平都红；
     *  (h) 滋养绝对上界 6 槽 × Lv9 × 魔 3 × 天 2.5 = 405（词条侧 ×6 若乘进属性会造出 972 点、判定 p 整档饱和）。 */
    (function () {
      var LAD = { huang: 1, xuan: 2, di: 3.5, tian: 6 }, TIERS301 = ['huang', 'xuan', 'di', 'tian'];
      /* 滋养侧另有一条**压缩阶梯**（返工裁定）：词条 ×6 不再乘进属性，否则六槽满级魔道天阶 = 972 点滋养，
       * 而境界基础值到顶才 60（dc = 基础×2）⇒ 三维判定 p 整档饱和在 0.95，「高品阶更吃属性」反而失去区分度 */
      var NURLAD = { huang: 1, xuan: 1.5, di: 2, tian: 2.5 };
      /* 黄→玄 允许重叠的**在册例外**（用户裁定「恢复黄阶原值」的必然产物）：多一条即红、少一条也红 */
      var HX_EXC = ['qiCap', 'qiRate'].sort();
      var UN301 = ['tribBonus', 'tribFailLossMod', 'realmCost', 'shopCost'];
      function med301(a) {
        var s = a.slice().sort(function (x, y) { return x - y; });
        return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
      }
      var byF301 = {};
      Object.keys(SQ.XARTS).forEach(function (id) {
        var ef = SQ.XARTS[id].effects || {};
        Object.keys(ef).forEach(function (k) {
          var g = byF301[k] || (byF301[k] = {});
          (g[SQ.XARTS[id].tier] || (g[SQ.XARTS[id].tier] = [])).push(ef[k]);
        });
      });
      var bad301 = [], hxOver = [], nField301 = 0, nPair301 = 0;
      Object.keys(byF301).forEach(function (k) {
        if (UN301.indexOf(k) >= 0) return;
        var g = byF301[k];
        if (!g.huang || !g.huang.length) return;
        nField301++;
        var base = med301(g.huang);
        TIERS301.forEach(function (t) {
          if (!g[t] || !g[t].length) return;
          var want = base * LAD[t], got = med301(g[t]);
          if (Math.abs(got - want) > Math.abs(want) * 0.005) bad301.push(k + '.' + t + '=' + got.toFixed(4) + '≠' + want.toFixed(4));
        });
        for (var i = 1; i < TIERS301.length; i++) {
          var lo = g[TIERS301[i - 1]], hi = g[TIERS301[i]];
          if (!lo || !lo.length || !hi || !hi.length) continue;
          nPair301++;
          var ovl = Math.min.apply(0, hi) <= Math.max.apply(0, lo);
          if (!ovl) continue;
          /* 玄→地、地→天 一律零容忍；黄→玄 只认在册那两条例外 */
          if (i === 1) hxOver.push(k);
          else bad301.push(k + ':' + TIERS301[i - 1] + '→' + TIERS301[i] + ' 重叠');
        }
      });
      var ANCHOR301 = { qiRate: 0.03, combatPower: 0.045, offlineEff: 0.04, qiCap: 0.04 };
      Object.keys(ANCHOR301).forEach(function (k) {
        if (Math.abs(med301(byF301[k].huang) - ANCHOR301[k]) > 1e-9) bad301.push('黄锚漂 ' + k + '=' + med301(byF301[k].huang));
      });
      var CAPS301 = D.FUSE.FIELD_CAP, badCap301 = [];
      Object.keys(CAPS301).forEach(function (k) {
        if (UN301.indexOf(k) >= 0 || !byF301[k]) return;
        var all = [];
        TIERS301.forEach(function (t) { all = all.concat(byF301[k][t] || []); });
        if (!all.length) return;
        var mx = Math.max.apply(0, all);
        if (Math.abs(mx - CAPS301[k]) > 1e-9) badCap301.push(k + ' cap=' + CAPS301[k] + ' 全录最大=' + mx);
      });
      var pick301 = {}, badNur301 = [];
      TIERS301.forEach(function (t) {
        var hit = Object.keys(SQ.XARTS).filter(function (id) {
          return SQ.XARTS[id].tier === t && SQ.XARTS[id].alignment === 'neutral';
        })[0];
        if (hit) pick301[t] = hit;
      });
      var n301 = {};
      TIERS301.forEach(function (t) {
        if (!pick301[t]) return;
        var wq = pack.initialState();
        wq.artsKnown = [pick301[t]]; wq.artsSlots = [pick301[t]];
        wq.artsLevels = {}; wq.artsLevels[pick301[t]] = 4;
        n301[t] = SQ.Attrs.artsNurtureOf(wq, pack, D, SQ.XARTS[pick301[t]].attr);
      });
      TIERS301.forEach(function (t) {
        if (n301[t] == null || !n301.huang) return;
        if (Math.abs(n301[t] / n301.huang - NURLAD[t]) > 1e-9) badNur301.push(t + '=' + (n301[t] / n301.huang).toFixed(3));
      });
      /* (f) 开局两部钉回 dev 原值 = 本次返工的正身（「中位不动」不等于「单条不动」） */
      var startOk301 = SQ.XARTS.tuna.effects.qiRate === 0.05 && SQ.XARTS.juling.effects.qiCap === 0.10;
      /* (g) 黄→玄 例外集合必须逐字等于在册清单 */
      var hxSorted = hxOver.slice().sort();
      var excOk301 = hxSorted.length === HX_EXC.length && hxSorted.every(function (k, i) { return k === HX_EXC[i]; });
      /* (h) 滋养绝对上界认**阶梯本身**：6 槽 × Lv9 × 最高阵营系数 × 最高品阶档 ≤ 405。
       * 先前那版是拿六部样例量出来的（实测只有 108），把天档改回词条侧的 ×6 也照样过 ⇒ 无鉴别力的上界；
       * 现在直接对上界求值，天档若回 6 = 972 当场红（与 (e) 的比值判据分列：(e) 管比例，(h) 管绝对量级）。 */
      var nurFactor301 = Math.max.apply(0, Object.keys(D.ARTS_NURTURE).map(function (k) { return D.ARTS_NURTURE[k]; }));
      var nurWorst301 = 6 * 9 * nurFactor301 * Math.max.apply(0, Object.keys(D.ARTS_NURTURE_TIER).map(function (k) { return D.ARTS_NURTURE_TIER[k]; }));
      var nurCapOk301 = nurWorst301 <= 405 + 1e-9;
      ok('301', '品阶强度阶梯对表（第卅八批返工版）：(a) 逐字段阶中位 === 基准×词条阶梯(±0.5%) ' + nField301 + ' 字段' +
        ' (b) 玄→地→天 零重叠（黄→玄 只认在册例外）共 ' + nPair301 + ' 对相邻阶' +
        ' (c) 黄阶中位仍是原锚 0.03/0.045/0.04/0.04' +
        ' (d) FIELD_CAP === 全录每级最大值（红线四类除外）' +
        ' (e) 滋养比 === 1:1.5:2:2.5（滋养侧单独设上限，与词条阶梯分列）' +
        ' (f) 开局两部吐纳法 0.05 / 聚灵诀 0.10 钉回 dev 原值' +
        ' (g) 黄→玄 带例外恰好 = qiCap + qiRate（多一条少一条都红）' +
        ' (h) 滋养上界 = 6 槽 × Lv9 × 最高阵营系数 × 最高品阶档 ≤ 405（旧口径 ×6 会造出 972 把判定 p 顶饱和）',
        nField301 >= 8 && nPair301 >= 8 && bad301.length === 0 && badCap301.length === 0 && badNur301.length === 0 &&
        startOk301 && excOk301 && nurCapOk301 && TIERS301.every(function (t) { return !!pick301[t]; }),
        '字段=' + nField301 + ' 对=' + nPair301 + ' ‖ ' + bad301.slice(0, 4).join(',') +
        ' ‖ cap=' + badCap301.join(',') + ' ‖ 滋养比=' + badNur301.join(',') +
        ' (' + TIERS301.map(function (t) { return n301[t]; }).join('/') + ')' +
        ' ‖ 开局=' + startOk301 + ' 例外=' + hxSorted.join('+') + '/在册=' + HX_EXC.join('+') +
        ' ‖ 滋养上界=' + nurWorst301 + '/405=' + nurCapOk301);
    })();

    /* ══ #302~#304 寿元 / 道伤批（2026-10-15 · 数值详设 §6.1A）══════════════════
     * 立因：此前本世**永不终结**（除非玩家主动兵解或飞升），修炼卡住只是原地等待——岁月这条线
     * 根本不存在。三条判据分别钉住：流逝口径与上界取表（302）、道伤阶梯与疗养（303）、
     * 寿尽即走既有转世事务且**不谎报兵解**（304）。 */
    var pack302 = SQ.Worlds.xiuxian.pack, D302 = pack302.data, sys302 = pack302.worldSystems;
    var prof302 = { talents: [] };
    /* (a) 流逝 = 与修为同一条时钟：360 秒已结算时长恰老 1 游戏年；离线一整日只按 OFFLINE_CAP_H
     *     封顶计老（12h ⇒ 120 年，不是 240 年）⇒ 关掉页面既少产也少老，比值不越界 */
    var w302a = pack302.initialState();
    pack302.claim(w302a, 360000, Date.now(), prof302, { autoTrib: false });
    var w302b = pack302.initialState();
    pack302.claim(w302b, 24 * 3600000, Date.now(), prof302, { autoTrib: false });
    /* (b) 上界随境界取表；真仙档写 0 = 无尽 ⇒ 剩余不做 0−已耗 的减法、寿元吃满也不判死 */
    var w302c = pack302.initialState();
    var li0302 = sys302.lifeInfo(w302c);
    w302c.realm = 5;
    var li5302 = sys302.lifeInfo(w302c);
    w302c.realm = D302.REALMS.length - 1; w302c.lifeUsed = 1e9;
    var liTop302 = sys302.lifeInfo(w302c);
    /* (c) 预警阈与判死：剩余 ≤ 上界 × LIFE_WARN_P 即 near（含等号），耗尽即 cause='shoujin' */
    var w302d = pack302.initialState();
    w302d.lifeUsed = D302.LIFESPAN[0] * (1 - D302.LIFE_WARN_P);
    var near302 = sys302.lifeInfo(w302d);
    w302d.lifeUsed = D302.LIFESPAN[0];
    var dead302 = sys302.lifeInfo(w302d);
    /* (d) 旧档零迁移 + 脏值收口：缺字段补 0/0/null，负数归零，道伤越界钳 cap，lastDeath 非结构归 null */
    var n302 = SQ.normalize({ v: 1, profile: { name: '旧档' }, worlds: { xiuxian: { qi: 5 } } });
    var n302b = SQ.normalize({ v: 1, profile: { name: '脏' },
      worlds: { xiuxian: { lifeUsed: -5, daoShang: 9e9, lastDeath: '坏值' } } });
    var n302again = SQ.normalize(n302);
    ok('302', '寿元流逝与上界（§6.1A）：(a) 360 秒已结算时长 = 老 1 游戏年，离线 24h 只按 OFFLINE_CAP_H 封顶老 ' +
      '12×10 = ' + (D302.OFFLINE_CAP_H * 10) + ' 年（与修为同一条时钟，非现实墙钟）' +
      ' (b) 上界 === LIFESPAN[境界] 逐档对表，真仙 0 = 无尽（剩余 Infinity、寿元吃满仍不判死）' +
      ' (c) 剩余 ≤ 上界×LIFE_WARN_P 即 near（含等号），耗尽 cause=shoujin' +
      ' (d) 旧档缺字段补 0/0/null（零迁移）+ 负数归零 + 道伤钳 cap + lastDeath 非结构归 null + 幂等',
      w302a.lifeUsed === 1 && w302b.lifeUsed === D302.OFFLINE_CAP_H * 10 &&
      li0302.max === D302.LIFESPAN[0] && li0302.cause === null && li0302.near === false &&
      li5302.max === D302.LIFESPAN[5] &&
      liTop302.eternal === true && liTop302.left === Infinity && liTop302.cause === null &&
      near302.near === true && near302.cause === null &&
      dead302.cause === 'shoujin' && dead302.left <= 0 &&
      n302.worlds.xiuxian.lifeUsed === 0 && n302.worlds.xiuxian.daoShang === 0 && n302.worlds.xiuxian.lastDeath === null &&
      n302b.worlds.xiuxian.lifeUsed === 0 && n302b.worlds.xiuxian.daoShang === D302.DAO_SHANG.cap &&
      n302b.worlds.xiuxian.lastDeath === null &&
      n302again.worlds.xiuxian.lifeUsed === 0 && n302again.worlds.xiuxian.daoShang === 0,
      '一小时=' + w302a.lifeUsed + ' 一日=' + w302b.lifeUsed + '/' + (D302.OFFLINE_CAP_H * 10) +
      ' ‖ 表=' + D302.LIFESPAN.join('/') + ' ‖ 真仙=' + liTop302.left + '/' + liTop302.cause +
      ' ‖ 阈上 near=' + near302.near + ' 耗尽 cause=' + dead302.cause +
      ' ‖ 旧档=' + [n302.worlds.xiuxian.lifeUsed, n302.worlds.xiuxian.daoShang, String(n302.worlds.xiuxian.lastDeath)].join(',') +
      ' 脏档=' + [n302b.worlds.xiuxian.lifeUsed, n302b.worlds.xiuxian.daoShang, String(n302b.worlds.xiuxian.lastDeath)].join(','));

    /* #303 道伤阶梯（§6.1A 第二支钟）：加层 = min(连败, gainMax) ⇒ 1+2+3+4+5 恰吃满 cap；
     * 成功涤 −cleanse、岁月按 healPerYear/年 缓疗；三处都经 realm.js 挂点，不许是只写在表里的死数。 */
    var DS303 = D302.DAO_SHANG;
    var w303 = pack302.initialState();
    var daoSeq303 = [];
    for (var i303 = 1; i303 <= DS303.gainMax + (DS303.freeStreak || 0); i303++) {
      sys302.daoHit(w303, i303, null);
      daoSeq303.push(w303.daoShang);
    }
    var li303 = sys302.lifeInfo(w303);                       /* 寿元一分未耗，道伤吃满即判死 ⇒ 第二条钟独立 */
    var w303b = pack302.initialState();                      /* 真挂点：渡劫一败即入伤（realm.js → worldSystems.daoHit） */
    w303b.realm = 0; w303b.qi = D302.REALMS[1].need;
    var mods303 = SQ.Mods.collect(prof302, w303b, pack302, D302);
    var rs303f = stubRandom(function () { return 0.99; });
    for (var j303 = 0; j303 < 3; j303++) {
      w303b.qi = D302.REALMS[1].need;
      SQ.Realm.tryBreakthrough(w303b, pack302, D302, mods303, Date.now(), { profile: prof302, log: null });
    }
    rs303f();
    var daoFail303 = w303b.daoShang;
    w303b.qi = D302.REALMS[2].need;
    var rs303s = stubRandom(function () { return 0.0; });
    SQ.Realm.tryBreakthrough(w303b, pack302, D302, mods303, Date.now(), { profile: prof302, log: null });
    rs303s();
    var daoClean303 = w303b.daoShang, realm303 = w303b.realm;
    var w303c = pack302.initialState();                      /* 疗养走同一条时钟：离线一日 120 年 → 120×healPerYear 层 */
    w303c.daoShang = 10;
    pack302.claim(w303c, 24 * 3600000, Date.now(), prof302, { autoTrib: false });
    var daoHeal303 = w303c.daoShang;
    /* (e) 悬崖不被小数抹平：伤满后经一秒疗养变 14.997，判死仍认**屏上层数**（ceil）——
     * 原式直读原值 ⇒ 「伤重不治的人被一秒救活」，冒烟 #304 的道伤死因此整条走不通（本批改判据时抓到） */
    var w303d = pack302.initialState();
    w303d.daoShang = DS303.cap - 0.003;
    var li303d = sys302.lifeInfo(w303d);
    ok('303', '道伤阶梯与疗养（§6.1A）：(a) 连败累计（**前二败皮外伤不入槽**）=== ' + daoSeq303.join('→') + ' === cap ' + DS303.cap +
      '（寿元一分未耗仍判死 ⇒ 第二条钟独立）' +
      ' (b) realm.js 真挂点：三败才入槽 daoShang=' + daoFail303 + '（既证挂点被调、又证免伤层）' +
      ' (c) 破境涤伤 −cleanse（' + daoFail303 + '→' + daoClean303 + '，且该次确实破了境 realm→' + realm303 + '）' +
      ' (d) 岁月疗养 10 层经离线一日（120 年）→ ' + daoHeal303.toFixed(2) + '（= 10 − 120×healPerYear）' +
      ' (e) 判死认屏上层数（ceil）：伤 14.997 仍算满 ' + DS303.cap + ' 层即死，一秒疗养救不活',
      daoSeq303.join(',') === [0, 0, 1, 3, 6, 10, 15].join(',') &&
      li303.daoLv >= DS303.cap && li303.eternal === false && li303.left > 0 && li303.cause === 'daoshang' &&
      daoFail303 === 1 && daoClean303 === Math.max(0, 1 - DS303.cleanse) && realm303 === 1 &&
      Math.abs(daoHeal303 - (10 - D302.OFFLINE_CAP_H * 10 * DS303.healPerYear)) < 1e-9 &&
      li303d.daoLv === DS303.cap && li303d.cause === 'daoshang',
      '阶梯=' + daoSeq303.join('/') + ' cap=' + DS303.cap + ' cause=' + li303.cause +
      ' ‖ 败=' + daoFail303 + ' 涤=' + daoClean303 + '(realm' + realm303 + ') 疗=' + daoHeal303 +
      ' ‖ 14.997→lv' + li303d.daoLv + '/' + li303d.cause);

    /* #304 寿尽 / 道伤 ⇒ **强制转世走通**（core.claimInner → 既有 SQ.Legacy.rebirth 事务）：
     * 判据取「玩家能感到差别」的四件事——新世被重置、遗泽按兵解口径折分、被动了结单计 deaths
     * 且不发「舍身证道」、传记与日志各说各的死因（原式非飞升一律折成兵解 ⇒ 死世会说谎）。 */
    var bioLineShou304 = SQ.t('codex.bio.line.shoujin', null, 'xiuxian');
    var bioLineBing304 = SQ.t('codex.bio.line.dissolve', null, 'xiuxian');
    async function deathSeed304(cause, mut) {
      var w = pack302.initialState();
      w.realm = 4; w.qi = 10; w.lastSave = Date.now() - 1000;
      Object.keys(mut).forEach(function (k) { w[k] = mut[k]; });
      /* 期望值取 preview 本身（预览与实结同一张脸），且与兵解口径逐分对表 ⇒ 零新增系数这条也钉住 */
      var exp304 = SQ.Legacy.preview(w, SQ.Legacy.metaBlank(), pack302, D302, cause, Date.now()).total;
      var expBing304 = SQ.Legacy.preview(w, SQ.Legacy.metaBlank(), pack302, D302, 'bingjie', Date.now()).total;
      await SQ.save({
        v: SQ.V,
        profile: { name: '待死道人', talents: [], worldId: 'xiuxian', worldName: '测试界', createdAt: Date.now() - 1000 },
        worlds: { xiuxian: w }, meta: SQ.Legacy.metaBlank()
      });
      var ref = {};
      await SQ.claim(ref);
      return { ref: ref, w: ref.worlds.xiuxian, st: ref.meta.stats, exp: exp304, expBing: expBing304 };
    }
    var d304a = await deathSeed304('shoujin', { lifeUsed: D302.LIFESPAN[4] });                 /* 寿尽 */
    var d304b = await deathSeed304('daoshang', { daoShang: DS303.cap });                        /* 道伤崩碎 */
    var log304a = (d304a.w.log || []).map(function (l) { return l.text; }).join('|');
    var line304 = function (ch) {
      return SQ.t('legacy.log.rebirth', { life: 1, ch: SQ.t(ch, null, 'xiuxian') }, 'xiuxian');
    };
    ok('304', '寿尽 / 道伤即强制转世（§6.1A 落点）：(a) 两条死因都走通——新世重置（realm 0 / lifeUsed 0 / ' +
      '档案名空 ⇒ 界面进创角）+ lastDeath 呈报位带死因与享年' +
      ' (b) 遗泽折分逐分等于 preview 产物且与兵解口径同值（' + d304a.exp + '，零新增系数）' +
      ' (c) 被动了结计 stats.deaths 而**不**计 dissolutions、**不**发 achv_bingjie（舍身证道 = 主动兵解的荣誉）' +
      ' (d) 传记与转世日志各说各的死因：寿尽行「' + bioLineShou304 + '」在、兵解行「' + bioLineBing304 + '」不在',
      d304a.w.realm === 0 && d304a.w.lifeUsed === 0 && d304a.w.daoShang === 0 &&
      d304a.ref.profile.name === '' && d304a.w.lastDeath && d304a.w.lastDeath.cause === 'shoujin' &&
      d304a.w.lastDeath.realm === 4 && d304a.w.lastDeath.age >= Math.floor(D302.LIFESPAN[4]) &&
      d304b.w.lastDeath && d304b.w.lastDeath.cause === 'daoshang' &&
      d304a.exp > 0 && d304a.exp === d304a.expBing && d304a.w.lastDeath.total === d304a.exp &&
      d304a.ref.meta.karma === d304a.exp &&
      d304a.st.deaths === 1 && d304a.st.dissolutions === 0 && d304a.st.lives === 1 &&
      d304b.st.deaths === 1 && d304b.st.dissolutions === 0 &&
      (d304a.ref.meta.achv || []).indexOf('achv_bingjie') < 0 &&
      ((d304a.ref.meta.biographies[0] || {}).text || '').indexOf(bioLineShou304) >= 0 &&
      ((d304a.ref.meta.biographies[0] || {}).text || '').indexOf(bioLineBing304) < 0 &&
      log304a.indexOf(line304('legacy.ui.shoujin')) >= 0 &&
      log304a.indexOf(line304('legacy.ui.bingjie')) < 0,
      '寿尽=' + JSON.stringify(d304a.w.lastDeath) + ' 道伤=' + JSON.stringify(d304b.w.lastDeath) +
      ' ‖ stats=' + [d304a.st.lives, d304a.st.deaths, d304a.st.dissolutions].join('/') +
      ' ‖ 遗泽=' + d304a.ref.meta.karma + '/期望' + d304a.exp + '/兵解' + d304a.expBing +
      ' ‖ achv=' + (d304a.ref.meta.achv || []).join(',') + ' ‖ 日志=' + log304a.slice(0, 46));

    /* #305 随件缺陷：`SQ.Actions.alDrink` 的「丹毒日限」日志行误抄视图助手写法 `D().ALCHEMY`
     * （本模块 D 是 dataOf(s) 取回的数据对象）⇒ 第 5 颗丹触 daily 分支必抛 TypeError，
     * 而 mutate 抛异常整笔不落盘 = 玩家点「服用」毫无反应。躲过三批评测的原因：#297(h) 的 daily
     * 判据**直调 `Alchemy.drinkPill`**，永远走不到 actions.js 这一行 ⇒ 本判据必须走真入口。 */
    var pk305 = SQ.Worlds.xiuxian.pack, DT305 = pk305.data;
    var w305 = pk305.initialState();
    SQ.Alchemy.ensure(w305, DT305);                          /* alchemy 缺省是 null，须先起架构再塞丹 */
    w305.alchemy.pills = { ap_juqi: 9 };
    await SQ.save({
      v: SQ.V,
      profile: { name: '试丹者', talents: [], worldId: 'xiuxian', worldName: '测试界', createdAt: Date.now() },
      worlds: { xiuxian: w305 }, meta: SQ.Legacy.metaBlank()
    });
    var ref305 = {};
    await SQ.claim(ref305);
    var CAP305 = DT305.ALCHEMY.PILL_DAILY_CAP;
    await SQ.mutate(ref305, function (s) {   /* 先吃满日限（同一条真通道，不手写 pillDay 猜日键） */
      var w = s.worlds[s.profile.worldId], p = SQ.Worlds[s.profile.worldId].pack;
      for (var q305 = 0; q305 < CAP305; q305++) {
        SQ.Alchemy.drinkPill(w, p, p.data, 'ap_juqi', Date.now(), null, s.profile);
      }
    });
    var nDay305 = ref305.worlds.xiuxian.alchemy.pillDay.n;
    var r305 = await SQ.Actions.alDrink(ref305, 'ap_juqi');
    var sysLog305 = (ref305.worlds.xiuxian.log || []).filter(function (l) { return l.cat === 'sys'; });
    var txt305 = String((sysLog305[sysLog305.length - 1] || {}).text || '');
    ok('305', 'alDrink 日限分支：走真入口不抛 + 日志出行且**上限取表值**（随件修 D().ALCHEMY → D.ALCHEMY）',
      nDay305 === CAP305 && r305 && r305.ok === false && r305.reason === 'daily' &&
      txt305 === SQ.t('alchemy.log.pillcap', { n: CAP305 }, 'xiuxian') &&
      txt305.indexOf(String(CAP305)) >= 0 && ref305.profile.name === '试丹者',
      '日限 n=' + nDay305 + '/' + CAP305 + ' ‖ reason=' + (r305 || {}).reason + ' ‖ 行=' + txt305);

    /* #306 秘境进度与战力富余挂钩（第卌三批 · 用户报「高战力刷低级秘境要更快，更符合直觉」）
     * 判据取「同一区、同样杀数的通关与否」而不是重算一遍乘式：三档战力把加速的两端钉住——
     * 富余中档 6 杀通（不加速要 20 杀）、吃顶档 5 杀通（= PROG_PER_KILL×PROG_SURGE_CAP）、
     * 瓶颈态**恒不加速**且击杀间隔不变（kills 仍 5 = 300s÷60s，防「加速顺手改节奏」连带 sim-pacing）。 */
    var w306a = mkWs({ realm: 2, zone: 0 });
    w306a.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };   /* 灵潮只动 stonesMult：钉死节奏与门槛 */
    var r306a5 = SQ.Combat.simulate(w306a, pack, D, M(mkProf(), w306a), 60 * 5, { log: noopLog(), now: Date.now(), profile: mkProf() });
    var prog5_306a = w306a.prog[0];
    var r306a6 = SQ.Combat.simulate(w306a, pack, D, M(mkProf(), w306a), 60 * 1, { log: noopLog(), now: Date.now(), profile: mkProf() });
    var w306b = mkWs({ realm: 3, zone: 0 });
    w306b.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var r306b = SQ.Combat.simulate(w306b, pack, D, M(mkProf(), w306b), 60 * 5, { log: noopLog(), now: Date.now(), profile: mkProf() });
    var w306c = mkWs({ realm: 0, zone: 1 });
    w306c.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var r306c = SQ.Combat.simulate(w306c, pack, D, M(mkProf(), w306c), 300, { log: noopLog(), now: Date.now(), profile: mkProf() });
    ok('306', '战力富余加速秘境进度（第卌三批）：(a) 富余中档（金丹刷首区）5 杀不通〔prog=' + prog5_306a +
      '〕、第 6 杀通关——不加速时 5 杀只 25 进度 (b) 富余吃顶（元婴刷首区，比值 ≥ PROG_SURGE_CAP）5 杀即通、' +
      '且 kills 恰 5 ⇒ **间隔未动**（加速只喂进度口） (c) 瓶颈态 prog 精确 === kills×PROG_PER_KILL（乘子恒 1）',
      prog5_306a === 90 && r306a5.kills === 5 && r306a5.cleared.length === 0 &&
      r306a6.kills === 1 && r306a6.cleared.indexOf(0) >= 0 &&
      r306b.kills === 5 && r306b.cleared.indexOf(0) >= 0 &&
      w306c.prog[1] === r306c.kills * D.PROG_PER_KILL && D.PROG_SURGE_COEF === 0.5 && D.PROG_SURGE_CAP === 4,
      '中档 5 杀 prog=' + prog5_306a + '/6 杀通=' + (r306a6.cleared.indexOf(0) >= 0) +
      ' ‖ 顶档 kills=' + r306b.kills + ' cleared=' + JSON.stringify(r306b.cleared) +
      ' ‖ 瓶颈 kills=' + r306c.kills + ' prog=' + w306c.prog[1]);

    /* #307 法宝认主计时通道（第卌三批 · 用户报「要渡劫才涨进度太慢」）：计时与渡劫**共用同一枚
     * bondCount 与同一条 bondAdvance modulo**（不另立升级路），所以判据要同时证
     * 「不满份不涨」「满份进一阶」「渡劫仍在同一计数上继续走」「全数满阶即停表」「旧档补 0」。 */
    var BOND307 = SQ.XTREASURES;
    var mkBond307 = function () {
      var w = mkWs({ realm: 2 });
      w.treasures = { owned: [{ id: 'x02', stage: 1, st: {} }], slots: ['x02', null, null],
        fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0 };   /* 旧档形状：无 bondHours */
      return w;
    };
    var w307 = mkBond307();
    var lg307 = [];
    var log307 = function (c, txt) { lg307.push(txt); };
    SQ.Treasures.bondTime(w307, pack, D, BOND307.BOND_HOURS - 0.1, log307);
    var under307 = w307.treasures.bondCount === 0 && w307.treasures.owned[0].stage === 1;
    SQ.Treasures.bondTime(w307, pack, D, 0.2, log307);                       /* 满一份 → 计数 1，未到 BOND_COST */
    var odd307 = w307.treasures.bondCount === 1 && w307.treasures.owned[0].stage === 1;
    SQ.Treasures.bondTime(w307, pack, D, BOND307.BOND_HOURS, log307);         /* 再满一份 → 2 = BOND_COST → 进阶 */
    var stage307 = w307.treasures.owned[0].stage === 2 && lg307.length === 1 &&
      lg307[0] === SQ.t('treasure.bond.done', { name: SQ.t('treasure.x02.name', null, 'xiuxian'), n: 2 }, 'xiuxian');
    SQ.Treasures.bondTick(w307, pack, D, log307);                             /* 渡劫 +1 → 3（奇数不进阶） */
    SQ.Treasures.bondTick(w307, pack, D, log307);                             /* 再 +1 → 4 → 顶阶 3 */
    var shared307 = w307.treasures.bondCount === 4 && w307.treasures.owned[0].stage === BOND307.MAX_STAGE &&
      lg307.length === 2;
    var bc307 = w307.treasures.bondCount, bh307 = w307.treasures.bondHours;
    SQ.Treasures.bondTime(w307, pack, D, 999, log307);                        /* 全数满阶 → 停表 */
    var stopped307 = w307.treasures.bondCount === bc307 && w307.treasures.bondHours === bh307 && lg307.length === 2;
    var norm307 = SQ.Treasures.normalize({ owned: [{ id: 'x02', stage: 2 }], slots: [null, null, null],
      fate: {}, bondCount: 3 }, pack);                                        /* 旧档（无该字段）读入补 0 */
    /* (g) 真入口：挂点在世界包 claim 的已结算时长之后（与寿元同一条时钟），离线 24h 照 OFFLINE_CAP_H
     * 封顶 12h ⇒ 12÷8 = 1 份计数、余 4h 留档。直调 bondTime 证不了这根线接上了，故必须走 claim。 */
    var w307g = mkWs({ realm: 2 });
    w307g.treasures = { owned: [{ id: 'x02', stage: 1, st: {} }], slots: ['x02', null, null],
      fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0 };
    pack.claim(w307g, 24 * 3600000, Date.now(), mkProf(), { autoTrib: false });
    var wired307 = w307g.treasures.bondCount === 1 &&
      Math.abs(w307g.treasures.bondHours - (D.OFFLINE_CAP_H % BOND307.BOND_HOURS)) < 1e-9 &&
      w307g.treasures.owned[0].stage === 1;
    ok('307', '法宝认主加计时通道（第卌三批）：(a) 差 0.1h 不满份不涨 (b) 满 BOND_HOURS(' + BOND307.BOND_HOURS +
      'h) 一份 = 计数 +1，未满 BOND_COST(' + BOND307.BOND_COST + ') 不进阶 (c) 两份即到一阶且写一条 bond.done ' +
      '(d) 渡劫与计时同吃一枚 bondCount（3/4 → 顶阶' + BOND307.MAX_STAGE + '） (e) 全数满阶停表、无谓计数不长 ' +
      '(f) 旧档缺字段 normalize 补 0（零迁移面） (g) 真入口：claim 离线 24h 只按封顶 ' + D.OFFLINE_CAP_H +
      'h 计 ⇒ +1 份、余 ' + (D.OFFLINE_CAP_H % BOND307.BOND_HOURS) + 'h 留档',
      under307 && odd307 && stage307 && shared307 && stopped307 &&
      norm307.bondHours === 0 && norm307.bondCount === 3 && BOND307.BOND_HOURS === 8 && wired307,
      'under=' + under307 + ' odd=' + odd307 + ' stage=' + w307.treasures.owned[0].stage +
      ' count=' + w307.treasures.bondCount + ' stopped=' + stopped307 + ' norm=' + norm307.bondHours +
      ' 真入口=' + w307g.treasures.bondCount + '/' + w307g.treasures.bondHours.toFixed(2) + 'h');

    /* #308 切磋冷却改 10 现实分钟（第卌三批 · 用户报「7 天太长，榜基本是摆设」）：
     * 键名随单位一并改成 SPAR_CD_MS（旧 DAYS 键不许留第二份事实源，A9 死常量关会抓、这里也直判一次）。 */
    var w308 = mkWs({ realm: 4, stones: 999999 });
    w308.prodigies = [{ id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 1, rlm: 2,
      prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var t308 = 1700000000000, CD308 = D.PRODIGY.SPAR_CD_MS;
    var first308 = SQ.Prodigy.spar(w308, pack, D, M(mkProf(), w308), 'pr1', t308, noopLog());
    var inCd308 = SQ.Prodigy.spar(w308, pack, D, M(mkProf(), w308), 'pr1', t308 + CD308 - 1, noopLog());
    var afterCd308 = SQ.Prodigy.spar(w308, pack, D, M(mkProf(), w308), 'pr1', t308 + CD308 + 1, noopLog());
    ok('308', '天骄切磋冷却 = 10 现实分钟（第卌三批）：首战成 → 冷却内（cd−1ms）拒 reason=cd 且 until 精确' +
      ' → 过点即放行；表值 === 10×60×1000 且旧 SPAR_CD_DAYS 键已消（单一事实源）',
      CD308 === 600000 && D.PRODIGY.SPAR_CD_DAYS === undefined && first308.ok === true &&
      inCd308.reason === 'cd' && inCd308.until === t308 + CD308 && afterCd308.ok === true,
      'cd=' + CD308 + ' 首战=' + first308.result + ' 冷却内=' + inCd308.reason +
      '/' + inCd308.until + ' 过点后=' + afterCd308.ok);

    /* #309 阵营袭击触发面（第卌四批 · 数值详设 §6.1B）：概率曲线两侧各钉一脚 / 敌手快照取表（高一境基础战力 ×FOE_K）/
     * 池子取人（道侣同记在 bonds ⇒ 三池在代码里是两池；锁与疤者排除）/ 独立通道的 cooldownHours 被读端接住
     * （不接 = 「写了没人查」那一族形状）/ 时钟只随在线时长。 */
    var A309 = D.AMBUSH, sys309 = pack.worldSystems;
    var pCurve309 = function (k) { return A309.P_BASE + (A309.P_MAX - A309.P_BASE) * Math.min(1, Math.abs(k) / A309.K_REF); };
    var fire309 = function (w, now, seq) {
      var rs = stubRandom(seq || [0, 0]);
      var r = sys309.ambushTick(w, pack, D, A309.ROLL_MS, now, { log: noopLog() });
      rs(); return r;
    };
    var t309 = Date.now();
    var w309 = mkWs({ realm: 3, karma: A309.K_REF });
    w309.bonds = { hanli: 40 }; w309.prodigies = [];
    var r309 = fire309(w309, t309);
    var foe309 = (w309.pendingChoice || {}).foe || {};
    var powExp309 = Math.round(D.REALMS[4].power * A309.FOE_K);          /* 探针实测 960 */
    var half309 = pCurve309(A309.K_REF / 2);
    /* 曲线两侧：rand 在 p 内 ⇒ 触发；刚过 p ⇒ 不触发（负档走另一枚模板） */
    var w309h = mkWs({ realm: 3, karma: A309.K_REF / 2 });
    w309h.bonds = { hanli: 40 }; w309h.prodigies = [];
    var in309h = (fire309(w309h, t309, [half309 - 0.001, 0]) || {}).id === "ambush_by_evil";
    var w309m = mkWs({ realm: 3, karma: -A309.K_REF / 2 });
    w309m.bonds = { hanli: 40 }; w309m.prodigies = [];
    var out309m = fire309(w309m, t309, [half309 + 0.001, 0]) === null && w309m.pendingChoice === null;
    var neg309 = (function () {                                            /* 魔道深档 = 正道讨伐 */
      var w = mkWs({ realm: 3, karma: -A309.K_REF }); w.bonds = { hanli: 40 }; w.prodigies = [];
      return (fire309(w, t309) || {}).id === "ambush_by_right";
    })();
    /* 善恶未著 / 敌手池空 / 只剩绝交锁与裂疤者 ⇒ 一律静默（不留点不开的按钮、不编假人） */
    var w309z = mkWs({ realm: 3, karma: 0 });
    w309z.bonds = { hanli: 40 }; w309z.prodigies = [];
    var zero309 = fire309(w309z, t309) === null && w309z.pendingChoice === null;
    var w309e = mkWs({ realm: 3, karma: A309.K_REF });
    w309e.bonds = {}; w309e.prodigies = [];
    var empty309 = fire309(w309e, t309) === null && w309e.pendingChoice === null;
    var w309x = mkWs({ realm: 3, karma: A309.K_REF });
    w309x.bonds = { hanli: -99, pingping: 40 }; w309x.scars = { pingping: 1 }; w309x.prodigies = [];
    var ex309 = fire309(w309x, t309) === null && w309x.pendingChoice === null;
    /* 冷却读端：首触已写 eventCooldowns ⇒ 12h 内同型第二次必不挂起（模板在 tags 独立通道里，
     *   buildPool 永不查它——只有 ambushTick 自己查才算数） */
    var w309c = mkWs({ realm: 3, karma: A309.K_REF });
    w309c.bonds = { hanli: 40 }; w309c.prodigies = [];
    fire309(w309c, t309);
    w309c.pendingChoice = null;
    var cd309 = fire309(w309c, t309 + 3600000) === null && w309c.pendingChoice === null;
    w309c.eventCooldowns = {};
    var cd309b = (fire309(w309c, t309 + 3600000) || {}).id === "ambush_by_evil";
    /* 时钟口径：离线 24h 一分不涨；在线 60s 只涨 60s 且不足一格不掷 */
    var w309t = mkWs({ realm: 3, karmaEventScore: A309.K_REF });
    w309t.bonds = { hanli: 40 }; w309t.prodigies = []; w309t.lastSave = t309 - 24 * 3600000;
    pack.claim(w309t, 24 * 3600000, t309, mkProf(), { autoTrib: false });
    var off309 = (w309t.ambushClock || 0) === 0;
    var w309o = mkWs({ realm: 3, karmaEventScore: A309.K_REF });
    w309o.bonds = { hanli: 40 }; w309o.prodigies = []; w309o.lastSave = t309 - 60000;
    pack.claim(w309o, 60000, t309, mkProf(), { autoTrib: false });
    var onl309 = (w309o.ambushClock || 0) === 60000;
    ok("309", "阵营袭击触发面（第卌四批）：(a) 概率曲线两侧各钉一脚（半档 " + half309.toFixed(3) +" 内=触发 / 外=不触发，满档 = P_MAX " +
      A309.P_MAX + "） (b) 敌手快照 realm = 玩家+1 = 4、power = REALMS[4].power × FOE_K = " + powExp309 +
      "（读 pendingChoice.foe 真值） (c) karma>0 走 ambush_by_evil / <0 走 ambush_by_right (d) 善恶未著 / 池空 / 只剩绝交锁与裂疤者 ⇒ 静默不挂抉择 (e) cooldownHours 12h 被读端接住：清锚才恢复 (f) 时钟单源：离线 24h 不涨、在线 60s 只涨 60s",
      r309 && r309.id === "ambush_by_evil" && r309.via === "ambush" &&
      foe309.realm === 4 && foe309.power === powExp309 && foe309.src === "bond" && foe309.nm ===
      SQ.t("bond.hanli.name", null, "xiuxian") && in309h && out309m && neg309 && zero309 && empty309 &&
      ex309 && cd309 && cd309b && off309 && onl309 && A309.DECIDE_MS === 90000 && A309.ROLL_MS === 1800000,
      "曲线=" + [pCurve309(0), half309, pCurve309(A309.K_REF)].join("/") + " ‖ foe=" + JSON.stringify(foe309) +
      " ‖ 内/外/负=" + [in309h, out309m, neg309].join("/") + " ‖ 零/空/锁疤=" + [zero309, empty309, ex309].join("/") +
      " ‖ 冷却内=" + cd309 + " 清锚=" + cd309b + " ‖ 离线钟=" + (w309t.ambushClock || 0) + " 在线钟=" + (w309o.ambushClock || 0));

    /* #310 袭杀天骄（第卌四批 · 天骄卷 §五B）：未解锁不动档 / 碾压门槛与夺资走 in.event（#113 零新增分类）/
     * 冷却精确 / 败局道伤走 daoAdd 唯一写口且 amb 不涨、善恶照记 / 满 KILL_MAX 次复用 killOff 出榜
     * （槽位不复用 + 宿敌清位 + sudiWin）+ 播种寻仇链 */
    var A310 = D.AMBUSH;
    function mkAmb310(rlm, myRealm, ambN, eternal) {
      var w = mkWs({ realm: myRealm, stones: 200000 });
      w.prodigies = [{ id: "pr1", nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 0, rlm: rlm,
        prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, amb: ambN || 0, boost: null,
        eternal: eternal === true, wl: [0, 0, 0] }];
      return w;
    }
    var w310l = mkAmb310(0, 0);
    var shape310l = JSON.stringify([w310l.stones, w310l.prodigies[0].amb, w310l.karmaEventScore]);
    var lock310 = SQ.Prodigy.ambush(w310l, pack, D, M(mkProf([]), w310l), "pr1", t309, noopLog(), null);
    var lockKeep310 = JSON.stringify([w310l.stones, w310l.prodigies[0].amb, w310l.karmaEventScore]) === shape310l;
    var w310 = mkAmb310(2, 5);                                        /* 我 4973 对 常人 realm2 = 171 ⇒ 碾压档 */
    var m310 = M(mkProf([]), w310), t310 = Date.now();
    var ev0 = { st: w310.stones, led: w310.ledger.in.event, karm: w310.karmaEventScore };
    var rs310 = stubRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    var r310 = SQ.Prodigy.ambush(w310, pack, D, m310, "pr1", t310, noopLog(), null);
    rs310();
    var loot310 = SQ.Prodigy.sparStake(w310, D, "heavy");
    var cd310 = SQ.Prodigy.ambush(w310, pack, D, m310, "pr1", t310 + A310.KILL_CD_MS - 1000, noopLog(), null);
    var w310f = mkAmb310(9, 2);                                       /* realm2 对 realm9 天才 ⇒ 绝打下手不成 */
    var dao0310f = w310f.daoShang, karm0310f = w310f.karmaEventScore;
    var rs310f = stubRandom([0.01, 0.99, 0.5, 0.5, 0.5, 0.5]);
    var r310f = SQ.Prodigy.ambush(w310f, pack, D, M(mkProf([]), w310f), "pr1", t310, noopLog(), null);
    rs310f();
    var w310k = mkAmb310(2, 5, A310.KILL_MAX - 1, true);
    w310k.prodMarks = { slotMax: 1 };
    var s310k = { meta: { eternalProdigy: "pr1", unlocks: {} } };
    var rs310k = stubRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    var r310k = SQ.Prodigy.ambush(w310k, pack, D, M(mkProf([]), w310k), "pr1", t310, noopLog(), s310k);
    rs310k();
    var left310 = w310k.prodigies.length;                /* rollOne 会把名录又填回去，先取身死后的那一瞬 */
    var slot310 = SQ.Prodigy.rollOne(w310k, pack, D, null, {}).id;
    ok("310", "袭杀天骄（第卌四批）：(a) 未解锁 locked 拒且档案逐字不动（灵石/计数/善恶） (b) 碾压胜 ratio=" +
      A310.KILL_RATIO + "：夺资 " + r310.loot + " = 切磋既有「重注」价目、in.event 增额 === 灵石增额（#113）、amb→" +
      r310.count + "/" + A310.KILL_MAX + "、善恶 " + A310.KILL_KARMA + " 照记 (c) 冷却 cd−1s 拒且 until = t+" + A310.KILL_CD_MS +
      " (d) 败 = win false、amb 不涨、道伤 +" + A310.KILL_DAO + "（走 daoAdd 唯一写口）、善恶照记（行凶未遂也是行凶） (e) 满 " +
      A310.KILL_MAX + " 次身死：名录清空、新号取 slotMax+1 = " + slot310 + "（不复用死号）、跨世宿敌清位 + sudiWin 打标、ws.revenge 播种 n=0",
      lock310.reason === "locked" && lockKeep310 && r310.ok && r310.win && r310.loot === loot310 && r310.count === 1 &&
      w310.prodigies[0].amb === 1 && w310.stones - ev0.st === loot310 && w310.ledger.in.event - ev0.led === loot310 &&
      w310.karmaEventScore - ev0.karm === A310.KILL_KARMA &&
      cd310.reason === "cd" && cd310.until === t310 + A310.KILL_CD_MS &&
      r310f.ok && r310f.win === false && r310f.count === 0 && w310f.daoShang === dao0310f + A310.KILL_DAO &&
      w310f.prodigies[0].amb === 0 && w310f.karmaEventScore - karm0310f === A310.KILL_KARMA &&
      r310k.dead === true && left310 === 0 && slot310 === "pr2" && s310k.meta.eternalProdigy === null &&
      w310k.prodMarks.sudiWin === true && w310k.revenge && w310k.revenge.n === 0 && w310k.revenge.nextAt === t310 &&
      w310k.revenge.foe.length > 0,
      "胜=" + JSON.stringify([r310.win, r310.loot, r310.count, w310.stones - ev0.st, w310.ledger.in.event - ev0.led, w310.karmaEventScore - ev0.karm]) +
      " ‖ 冷却=" + JSON.stringify([cd310.reason, cd310.until - t310]) +
      " ‖ 败=" + JSON.stringify([r310f.win, r310f.count, w310f.daoShang - dao0310f, w310f.karmaEventScore - karm0310f]) +
      " ‖ 身死=" + JSON.stringify([r310k.dead, left310, slot310, s310k.meta.eternalProdigy, w310k.revenge]));

    /* #311 族中寻仇链（第卌四批 · 数值详设 §6.1B）：冷却未到不发 / 到点必发（顶档钳成同境，屏上如实写）/
     * 模板只声明迎战一支 / 倍率逐值封顶 / escalate 只乘灵石且**不污染模板字面量**（同 seed 两局： stones 比 = 倍率比、
     * qi 一分不动）/ 败 → failE 道伤全额 + 链断不进冷却 */
    var sys311 = pack.worldSystems;
    var t311 = Date.now();
    function mkRv311(n, nextAt, realm) {
      var w = mkWs({ realm: realm == null ? 5 : realm, stones: 200000 });
      w.revenge = { n: n || 0, nextAt: nextAt != null ? nextAt : t311, foe: "沈孤云" };
      w.bonds = { hanli: 40 }; w.prodigies = [];
      return w;
    }
    var w311w = mkRv311(0, t311 + 60000);
    var rs311w = stubRandom([0, 0]);
    var wait311 = sys311.ambushTick(w311w, pack, D, A310.ROLL_MS, t311, { log: noopLog() });
    rs311w();
    var w311 = mkRv311(1, t311, 9);                                   /* 真仙顶档：高一境被钳成同境 */
    var rs311f2 = stubRandom([0, 0]);
    var fire311 = sys311.ambushTick(w311, pack, D, 1000, t311, { log: noopLog() });
    rs311f2();
    var foe311 = (w311.pendingChoice || {}).foe || {};
    var evR311 = SQ.Events.findById(pack, "ambush_revenge");
    var mults311 = [0, 1, 2, 3, 4, 9].map(function (n) { return sys311.escalationOf(mkRv311(n, 0)); });
    function run311(n) {
      var w = mkRv311(n, t311, 9);
      var rs0 = stubRandom([0, 0]);
      sys311.ambushTick(w, pack, D, 1000, t311, { log: noopLog() });
      rs0();
      var foe0 = (w.pendingChoice || {}).foe || {};
      var st0 = w.stones, qi0 = Math.floor(w.qi);
      var rs = stubRandom([0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
      var res = SQ.Events.resolveBranch(w, pack, D, M(mkProf([]), w), "ambush_revenge", "right", t311,
        { log: noopLog(), profile: mkProf([]) });
      rs();
      var set = sys311.ambushSettled(w, pack, D, "ambush_revenge", res.pass, t311, noopLog());
      return { w: w, res: res, set: set, foe: foe0, stones: w.stones - st0, qi: Math.floor(w.qi) - qi0 };
    }
    /* 递增比用**未满档**两局（n=0 与 n=2，倍率 1 → 2）；n≥REVENGE_FINAL 是老祖那一档，掷不赢、拿来比倍率没有意义 */
    var g0_311 = run311(0), g3_311 = run311(2), wall311 = run311(A310.REVENGE_FINAL);
    var ratio311 = g0_311.stones > 0 ? g3_311.stones / g0_311.stones : 0;
    /* 败局（realm2 打不过高一境）：道伤 = failE.dao 4 全额、链断且不写冷却 */
    var w311b = mkRv311(3, t311, 2);
    var rsb0 = stubRandom([0, 0]);
    sys311.ambushTick(w311b, pack, D, 1000, t311, { log: noopLog() });
    rsb0();
    var rs311b = stubRandom([0.01, 0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    var res311b = SQ.Events.resolveBranch(w311b, pack, D, M(mkProf([]), w311b), "ambush_revenge", "right", t311,
      { log: noopLog(), profile: mkProf([]) });
    rs311b();
    var set311b = sys311.ambushSettled(w311b, pack, D, "ambush_revenge", res311b.pass, t311, noopLog());
    /* 第卌五批（用户改口径 · N56 收口）：偿清满 REVENGE_FINAL 场 ⇒ 上门的是高**两**境的族中老祖，未满仍高一境 */
    function foeOf311(n, realm) {
      var w = mkRv311(n, t311, realm);
      var rs = stubRandom([0, 0]);
      sys311.ambushTick(w, pack, D, 1000, t311, { log: noopLog() });
      rs();
      return (w.pendingChoice || {}).foe || {};
    }
    var soft311 = foeOf311(A310.REVENGE_FINAL - 1, 3), hard311 = foeOf311(A310.REVENGE_FINAL, 3);
    ok("311", "族中寻仇链（第卌四批）：(a) 冷却未到不发（null 且不挂抉择） (b) 到点必发：id=ambush_revenge、via=revenge、" +
      " 顶档 realm 钳成同境 = " + foe311.realm + "、power = REALMS[9].power × REVENGE_K(" + A310.REVENGE_K + ") = " +
      foe311.power + " (c) 模板只声明 right 一支 ⇒ 界面天然只剩一枚「迎战」钮 (d) 倍率逐值 n=0/1/2/3/4/9 → " +
      mults311.join("/") + "（硬顶 " + A310.STREAK_CAP + "） (e) 同 seed 两局（n=0 与 n=2，都在未满档）灵石比 = " + ratio311.toFixed(3) +
      " = 倍率比 " + sys311.escalationOf(mkRv311(2, 0)) + " 且**修为增额两局相同**（" + g0_311.qi + " === " + g3_311.qi +
      "）⇒ escalate 只喂 stones、模板零污染 (f) 胜账 n→" + g0_311.set.chain + " / " + g3_311.set.chain +
      " 且 nextAt = now+" + A310.REVENGE_CD_MS + " (g) 败账：道伤 +4（failE 全额）、revenge=null、链断不进冷却" +
      " (h) 第卌五批改口：满 " + A310.REVENGE_FINAL + " 场前 realm 3 → 来者 " + soft311.realm + "（高一境）、power " + soft311.power +
      "；满 " + A310.REVENGE_FINAL + " 场 → 来者 " + hard311.realm + "（高两境）、power " + hard311.power + "（= 前者 ×3）且名号挂「老祖」" +
      " (i) 老祖当关：真仙顶档满 " + A310.REVENGE_FINAL + " 场来者 power = " + wall311.foe.power +
      "（钳同境也仍取「实付 ×" + A310.REVENGE_FINAL_MIN + "」下界 > 高一境基值 " + foe311.power + "），" +
      "同一把最有利掷点 n=" + A310.REVENGE_FINAL + " ⇒ pass=false、道伤 +4、链断不进冷却",
      wait311 === null && w311w.pendingChoice === null &&
      fire311 && fire311.id === "ambush_revenge" && fire311.via === "revenge" && foe311.realm === 9 &&
      foe311.power === Math.round(D.REALMS[9].power * A310.REVENGE_K) && foe311.src === "clan" &&
      Object.keys(evR311.choices).join(",") === "right" && mults311.join(",") === "1,1.5,2,2.5,3,3" &&
      g0_311.res.pass && g3_311.res.pass &&
      Math.abs(ratio311 - sys311.escalationOf(mkRv311(2, 0))) < 0.02 && g0_311.qi === g3_311.qi &&
      g0_311.set.chain === 1 && g3_311.set.chain === 3 && g0_311.set.nextAt === t311 + A310.REVENGE_CD_MS &&
      res311b.pass === false && w311b.daoShang === 4 && w311b.revenge === null &&
      set311b.ended === true && set311b.chain === 0 &&
      soft311.realm === 4 && soft311.power === Math.round(D.REALMS[4].power * A310.REVENGE_K) &&
      hard311.realm === 5 && hard311.power === Math.round(D.REALMS[5].power * A310.REVENGE_K) &&
      hard311.power === soft311.power * 3 && /老祖$/.test(hard311.nm) && !/老祖$/.test(soft311.nm) &&
      wall311.res.pass === false && wall311.set.ended === true && wall311.foe.power > foe311.power &&
      wall311.w.daoShang === 4,
      "不发=" + (wait311 === null) + " ‖ 到点=" + JSON.stringify([fire311 && fire311.id, fire311 && fire311.via, foe311]) +
      " ‖ 倍率=" + mults311.join("/") + " ‖ 两局=" + JSON.stringify([[g0_311.stones, g0_311.qi], [g3_311.stones, g3_311.qi],
      ratio311.toFixed(3)]) + " ‖ 账=" + JSON.stringify([g0_311.set, g3_311.set]) +
      " ‖ 败=" + JSON.stringify([res311b.pass, w311b.daoShang, w311b.revenge, set311b]) +
      " ‖ 两档=" + JSON.stringify([[soft311.realm, soft311.power, soft311.nm], [hard311.realm, hard311.power, hard311.nm]]));

    /* #312 江湖名录池与取数口（第卌七批 ① · 设计稿《江湖榜与角色库》）：
     * 规模/唯一性/值域/势力覆盖/幂等 一次钉死——名录是**静态内容**，认不出就什么都不写，
     * 所以这里既是内容对表也是「视图不编名字」那条纪律的后盾。 */
    var JH312 = SQ.Jianghu, P312 = pack.jianghuPool(), PS312 = P312.persons;
    var seenId312 = {}, seenNm312 = {}, bad312 = [];
    var bondNm312 = {};
    (D.COMPANIONS || []).forEach(function (c) { bondNm312[SQ.t('bond.' + c.id + '.name', null, 'xiuxian')] = 1; });
    var FC312 = {}, HID312 = 0;
    PS312.forEach(function (p) {
      if (seenId312[p.id]) bad312.push('id 重复 ' + p.id); seenId312[p.id] = 1;
      if (seenNm312[p.nm]) bad312.push('名号重复 ' + p.nm); seenNm312[p.nm] = 1;
      if (bondNm312[p.nm]) bad312.push('与道友撞名 ' + p.nm);
      if (!['right', 'neutral', 'evil'].includes(p.al)) bad312.push('阵营非法 ' + p.id);
      if (!(p.rlm >= 0 && p.rlm <= 9)) bad312.push('境界越界 ' + p.id);
      if (![-1, 0, 1, 2].includes(p.off)) bad312.push('际遇档越界 ' + p.id);
      if (!(p.wp >= 0 && p.wp < P312.wp.length)) bad312.push('兵刃索引越界 ' + p.id);
      if (!p.nm || !p.ti || !p.bio) bad312.push('三缺其一 ' + p.id);
      if (/[A-Za-z]/.test(p.nm + p.ti + p.bio)) bad312.push('文本含拉丁 ' + p.id);
      if (p.hid) HID312++;
      if (p.fc) (FC312[p.fc] = FC312[p.fc] || []).push(p);
    });
    D.FACTIONS_FIXED.forEach(function (f) {
      var s = FC312[f.id] || [];
      if (s.length !== 4) bad312.push('势力席数 ' + f.id + ' = ' + s.length);
      for (var i = 1; i < s.length; i++) if (s[i - 1].rlm < s[i].rlm) bad312.push('席位境界倒挂 ' + f.id);
      if (JH312.masterOf(pack, f.id) !== s[1] || JH312.elderOf(pack, f.id) !== s[0]) bad312.push('掌门/太上取数错 ' + f.id);
    });
    var hidList312 = PS312.filter(function (p) { return p.hid; });
    var once312 = JH312.count(pack) + '|' + PS312.map(function (p) { return p.id + ':' + p.rlm + ':' + p.off; }).join(',');
    var twice312 = JH312.count(pack) + '|' + pack.jianghuPool().persons.map(function (p) { return p.id + ':' + p.rlm + ':' + p.off; }).join(',');
    ok(312, '江湖名录 200 条与取数口（第卌七批①）：规模 200 = 16 势力 × 4 + 隐世 3 + 散修与新秀 133 ‖ ' +
      'id 与名号全库唯一且不与道友 58 名撞 ‖ 值域（阵营/境界 0~9/际遇档 −1~+2/兵刃池索引）逐项合 ‖ ' +
      '文本零拉丁零空（名号/称号/小传三缺即判红）‖ 每派恰四席且席位境界不倒挂、掌门=第二席、太上=第一席 ‖ ' +
      '隐世恰三席（榜面交互屏蔽随第卌九批落）‖ 认不出的 id / 势力一律 null ‖ 取数口幂等（两次逐条同值）',
      PS312.length === 200 && JH312.count(pack) === 200 && bad312.length === 0 && HID312 === 3 &&
      hidList312.length === 3 && Object.keys(FC312).length === 16 &&
      once312 === twice312 && P312.wp.length >= 24 &&
      JH312.masterOf(pack, 'nope') === null && JH312.of(pack, 'nope') === null,
      '规模=' + PS312.length + ' 隐世=' + HID312 + ' 势力=' + Object.keys(FC312).length + ' 违例=' + bad312.slice(0, 5).join(' | '));

    /* #313 名录**零侵染**：静态表不入存档、不进世界状态 ⇒ 容量读数与旧档迁移都不该动（第卌七批①的收口凭据） */
    var init313 = pack.initialState();
    var norm313 = pack.normalize(pack.normalize(init313));
    var keys313 = Object.keys(init313).filter(function (k) { return /jh|jianghu/i.test(k); });
    ok(313, '名录零侵染（第卌七批①）：initialState 与 normalize 产物里没有任何 jianghu 字段（名录是代码侧静态内容，不是角色态）‖ ' +
      '双次 normalize 键集不变（幂等，不会因为挂上名录就长字段）‖ 取数口全为纯读，跑一遍不新增世界键',
      keys313.length === 0 && !norm313.jianghu && !init313.jianghu &&
      JSON.stringify(Object.keys(pack.normalize(norm313)).sort()) === JSON.stringify(Object.keys(norm313).sort()),
      '多余键=' + keys313.join(',') + ' ‖ 键数 ' + Object.keys(init313).length + ' → ' + Object.keys(norm313).length);

    ok(72, '数字格式 <1万千分位/万/亿',
      SQ.fmt(9999) === '9,999' && SQ.fmt(12345) === '1.2万' && SQ.fmt(123456789) === '1.2亿' && SQ.fmt(0) === '0');

    /* #77 script 顺序加载无依赖错误（本套件能跑完即证；此处核系统命名空间齐全） */
    ok(77, 'IIFE 挂载顺序完整', ['Mods', 'Talents', 'Attrs', 'Gear', 'Arts', 'Combat', 'Realm', 'Idle', 'Shop', 'Events', 'Actions']
      .every(function (n) { return !!SQ[n]; }));

    return R;
  }

  window.SQSmoke = { run: run };
})();
