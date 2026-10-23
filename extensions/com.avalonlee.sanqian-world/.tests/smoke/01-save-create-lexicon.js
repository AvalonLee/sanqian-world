/* .tests/smoke/01-save-create-lexicon.js — 冒烟断言 75 条（首 #1 ‖ 末 #79）
 * 由 smoke.js 的 run() 体逐字切出（原第 29~1116 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 65 66 66 66 67 68 89 79
*/
window.SQSmoke.frag('01-save-create-lexicon', async function () {
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

    /* #30（4.3#25）插值占位替换正确（单占位/多占位/重复占位）
     * 🔧 第册十四批 2026-10-18：单占位那一支原用 `ui.error.storage` 证，本批该键改成**不带占位符**的白话句
     *   （读档的 msg 是宿主原始错误文本，插进句子 = 裸英文上屏）⇒ 旧判据覆盖的那条支路搬到 `ui.error.save`
     *   （同形单占位、值一字未动）重判，并另钉一条「读取这句零占位符、零拉丁字母」的新形状判据。 */
    var s30a = SQ.t('creation.talent.combo', { p: 2, n: 1 }, 'xiuxian');
    var s30b = SQ.t('idle.next', { realm: '筑基', n: '1,000', res: '灵气' }, 'xiuxian');
    ok(25, '插值占位替换',
      s30a === '2 正 1 负' && s30b.indexOf('{') < 0 && s30b.indexOf('筑基') >= 0 &&
      s30b.indexOf('1,000') >= 0 &&
      SQ.t('ui.error.save', { msg: 'X' }) === '存档写入失败：X（本次进度恐未记下）' &&
      /[A-Za-z{}]/.test(SQ.t('ui.error.storage', { msg: 'boom' })) === false);

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
    /* 定种子抽样窗口（N27① / N69 处置 · 第册十五批）：把这一段里的 `Math.random` 换成固定序列，返回还原函数。
     * 写法照 #33 在册那一段（同一条 mulberry32），差别只在「成对括住」不用重排正文。
     * ⚠️ 代价写在册：种子化后这几判只覆盖**那一条序列**（真随机的其余形状不再被抽到）；
     *    换来的是「红灯不再等于重跑一次就好」——容差带与阈值一律不上调（工程规范 §4.42）。 */
    function beginSeed(seed) { return stubRandom(function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }); }

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
    w35.gearAutoRefine = true;   /* 册149：新档缺省改关，本例专测「开」路径（替换即炼化），显式落真值 */
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
      'normalize 三态 无字段 true（issue #2 前旧档兼容）/ false 保留 / 脏值归 true；' +
      '册149 用户令「三自动开关默认关」＝新档 initialState 显式 false，本条一并看守）',
      SQ.Gear.scoreOf(it35) === 55 && SQ.Gear.scoreOf(it35s) === Math.round(55 * 1.15 * 100) / 100 &&
      a1.action === 'equip' && a2.action === 'refine' && held35 && a3.action === 'replace' && w35.gear.weapon.atk === 99 &&
      b1.action === 'equip' && b2.action === 'stash' && b3.action === 'replace' && b3.gained === 0 &&
      !!b3.kept && b3.kept.atk === 10 && copy35 &&
      st35b === 2 && w35b.stash.length === 3 && w35b.gear.weapon.atk === 99 &&
      w35b.stones === mkWs({ realm: 9 }).stones &&
      bLedger.action === 'stash' && JSON.stringify(w35b.ledger) === led35b &&
      c35.action === 'refine' && d35 && n35d === true && n35f === false && n35x === true &&
      pack.initialState().gearAutoRefine === false,
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

    /* #37 魔道词条 ×1.10 且 alignment='evil'（1600 次采样压方差，防边界抖动）
     * 🔧 第册十五批定种子（N27① 在册那件的残量）：真随机下比值带 (1.03,1.18) 约 26 跑 1 红；
     *    容差带一字未动，只是把抽样钉成固定序列。 */
    var sumE = 0, sumN = 0, evilAlign = true;
    var endSeed37 = beginSeed(3720261018);
    for (var i37 = 0; i37 < 1600; i37++) {
      var ge = SQ.Gear.roll(mkWs(), pack, D, 0, { sum: { gearLuck: 0 } }, { tier: 0, align: 'evil' });
      var gn = SQ.Gear.roll(mkWs(), pack, D, 0, { sum: { gearLuck: 0 } }, { tier: 0, align: 'neutral' });
      sumE += ge.atk; sumN += gn.atk;
      if (ge.alignment !== 'evil') evilAlign = false;
    }
    endSeed37();   /* 种子窗口结束 */
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
});
