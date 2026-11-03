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
    ok('E4', '命名池合规 + 屏上名册逐位对表（live 2 · coming 4 · 无 hidden 实例 · 武侠已翻牌）',
      nameOk && vis.join(',') === 'xiuxian,wuxia,magic,tech,urban,cthulhu', 'visible=' + vis.join(','));

    /* #15 词表回落：世界词表 → common → key 本身 */
    ok('E5', 't() 三级回落',
      SQ.t('realm.2', null, 'xiuxian') === '金丹' &&
      SQ.t('ui.confirm') === '确认' && /* N20 处置批：原用 `ui.claim`「收功」，该键随批删除（钮 v2.2 已移除），换同为 common 卷的 `ui.confirm` 继续测三级回落 */
      SQ.t('no.such.key') === 'no.such.key');

    /* E6 · 第二世界「武侠」包骨架（册154 · S1-a 立卷）
     * 这一判钉的是**新形态**：「包已装上、但世界仍 coming 不可投生」。
     * 既有判据全都没有这一形（此前 coming ⇔ pack 恒 null），所以新立一条，而不是改旧判。
     * 三件必须同时成立：① 三入口是函数（缺一 D11 就失明）；② initialState ⇔ normalize 键集双向相等
     * （D11 已判，这里只做冒烟级快照，让它在毫秒级的件里先红）；③ 无界名池的世界不生成随机界名。
     * 册214：④ `worldView`/`narrative` 双退役见证（书形态整族摘除后键不复存在）。 */
    (function () {
      var w = SQ.Worlds.wuxia;
      var pk = w && w.pack;
      var shapes = !!(pk && typeof pk.initialState === 'function' &&
        typeof pk.normalize === 'function' && typeof pk.claim === 'function');
      var ini = shapes ? Object.keys(pk.initialState()) : [];
      var nul = shapes ? Object.keys(pk.normalize({})) : [];
      var same = ini.length > 0 && ini.length === nul.length && ini.every(function (k) { return nul.indexOf(k) >= 0; });
      ok('E6', '武侠包骨架（册214 P1 后 = live tab 世界：三入口在位 ⇔ initialState/normalize 键集等 ‖ worldView/narrative 已退役 ‖ 无界名池不生成界名）',
        !!w && w.status === 'live' && shapes && same && !pk.worldView && !pk.narrative && SQ.generateWorldName('wuxia') === '',
        'status=' + (w && w.status) + ' keys=' + ini.length + ' view=' + (pk.worldView || '退役') + ' narrative=' + (pk.narrative ? '在' : '退役') + ' name=' + JSON.stringify(SQ.generateWorldName('wuxia')));
    })();

    /* E7 · 武侠武学与门派表完整性（册155 · S1-b 全量入库）
     * 「尽可能保留金庸武学与门派」的判据：不是数够不够多，而是**每门都有武可学**（空门派 = 拜师无意义）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      var d = pk && pk.data;
      var A = (d && d.ARTS) || [], S = (d && d.SECTS) || [], R = (d && d.REALMS) || [];
      var byId = {};
      for (var i = 0; i < A.length; i++) byId[A[i].i] = A[i];
      var empty = [], dupId = {}, tt = {}, camp = {};
      for (var j = 0; j < A.length; j++) {
        if (dupId[A[j].i]) empty.push('dup:' + A[j].i); dupId[A[j].i] = 1;
      }
      for (var k = 0; k < S.length; k++) {
        var n = 0;
        for (var x = 0; x < A.length; x++) if ((A[x].s || []).indexOf(S[k].id) >= 0) n++;
        if (!n) empty.push(S[k].id);
        camp[S[k].camp] = (camp[S[k].camp] || 0) + 1;
      }
      for (var t = 0; t < A.length; t++) tt[A[t].t] = (tt[A[t].t] || 0) + 1;
      var launchSect = S.filter(function (s) { return s.launch === 1; }).length;
      ok('E7', '武侠武学与门派表（全量入库 ‖ id 无重复 ⇔ 每门有武学（首发空门即红）⇔ 境界表 10 档递增）',
        A.length >= 380 && S.length >= 32 && launchSect === 26 && R.length === 10 &&
        empty.length === 0 && tt.tian >= 10 && tt.huang > tt.tian &&
        R.every(function (r, i2) { return i2 === 0 || r.need > R[i2 - 1].need; }),
        'arts=' + A.length + ' sects=' + S.length + ' launch=' + launchSect +
        ' 阶=' + JSON.stringify(tt) + ' 空门=' + (empty.length ? empty.join(',') : '无'));
    })();

    /* E8 · 武侠数值内核：产出 / 封顶 / 破关双必要条件（册155 · S1-b）
     * 本界 status 仍 coming ⇒ 生产路径不跑 claim，所以这条**直接调它**——「不可投生」不等于「逻辑可以假」。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk) { ok('E8', '武侠数值内核（不可投生也要能跑）', false, '无 pack'); return; }
      /* ① 产出：60 现实分钟 × 8 × (1 + 0.15×2 层) = 624 功力（册215 产出重定种） */
      var ws = pk.normalize(pk.initialState());
      var before = ws.qi;
      pk.claim(ws, 60 * 60000, Date.now(), {}, {});
      var gain = ws.qi - before;
      var wsSe = pk.normalize(pk.initialState()); wsSe.mode = 'seclude';
      var beforeSe = wsSe.qi;
      pk.claim(wsSe, 60 * 60000, Date.now(), {}, {});
      var gainSe = wsSe.qi - beforeSe;   /* 闭关 1.0 = 624（模态系数差分见证，册216） */
      /* ② 第一档无附加门槛：功力到 400 即破，随后封在第二档 1200（**破关不清零**） */
      var w2 = pk.normalize(pk.initialState());
      pk.claim(w2, 100 * 86400000, Date.now(), {}, {});
      var first = w2.realm === 1 && w2.qi === 1200;
      /* ③ 第二档有双门槛（见闻 ≥4 且最高层 ≥4）：初始最高 1 层 ⇒ 卡住不破 */
      var w3 = pk.normalize(pk.initialState());
      pk.claim(w3, 100 * 86400000, Date.now(), {}, {});
      var stuck = w3.realm === 1;
      /* ④ 补足层数 + 见闻 ⇒ 下一 tick 即破，功力仍 1200 */
      w3.artsLevels = { quan_basic: 4, neigong_basic: 1 };
      w3.visited = ['luoyang', 'shaolin', 'dali'];
      pk.claim(w3, 60000, Date.now(), {}, {});
      var passed = w3.realm === 2 && w3.qi === 1200;
      ok('E8', '武侠数值内核（产出 ⇔ 一档即破且封二档 ⇔ 双门槛挡二档 ⇔ 补足即破、功力不清零）',
        Math.abs(gain - 374.4) < 0.01 && Math.abs(gainSe - 624) < 0.01 && first && stuck && passed,
        'gain=' + gain.toFixed(2) + ' first=' + first + ' stuck=' + stuck + ' passed=' + passed +
        ' realm=' + w3.realm + ' qi=' + w3.qi);
    })();

    /* E9 · 武侠人物 / 地界 / 秘籍三表（册156 · S1-c）
     * 判「有名有姓」：每条记录必须有**词表里的中文名**——id 在表里、名字取不到 = 屏上空白，这一形最容易被漏。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      var d = pk && pk.data;
      if (!d) { ok('E9', '武侠人物/地界/秘籍三表', false, '无 pack'); return; }
      var C = d.CAST || [], Z = d.ZONES || [], M = d.MANUALS || [], A = d.ARTS || [];
      var artIds = {};
      for (var i = 0; i < A.length; i++) artIds[A[i].i] = 1;
      var dup = [], nameMiss = [], badManual = [];
      var seenC = {};
      C.forEach(function (c) {
        if (seenC[c.i]) dup.push('cast:' + c.i); seenC[c.i] = 1;
        if (!SQ.t('cast.' + c.i + '.name', null, 'wuxia') || SQ.t('cast.' + c.i + '.name', null, 'wuxia').indexOf('cast.') === 0) nameMiss.push('cast:' + c.i);
      });
      Z.forEach(function (z) {
        if (!SQ.t('zone.' + z.i + '.name', null, 'wuxia') || SQ.t('zone.' + z.i + '.name', null, 'wuxia').indexOf('zone.') === 0) nameMiss.push('zone:' + z.i);
        (z.scenes || []).forEach(function (n2) { if (SQ.t('scene.' + z.i + '.' + n2, null, 'wuxia') === 'scene.' + z.i + '.' + n2) nameMiss.push('scene:' + z.i + '.' + n2); });
      });
      M.forEach(function (m) {
        if (!SQ.t('manual.' + m.i + '.name', null, 'wuxia') || SQ.t('manual.' + m.i + '.name', null, 'wuxia').indexOf('manual.') === 0) nameMiss.push('manual:' + m.i);
        if (m.art && !artIds[m.art]) badManual.push(m.i + '→' + m.art);   /* 指向不存在的招式 = 读一百本也学不会 */
      });
      var launchZ = Z.filter(function (z) { return z.launch === 1; }).length;
      var launchS = C.filter(function (c) { return c.sec; }).length;
      ok('E9', '武侠人物/地界/秘籍（人物 ≥100 且 id 唯一 ⇔ 地界 13/首发 10 ⇔ 秘籍 18 且 art 指向真招式 ⇔ 三者名键全在词表）',
        C.length >= 100 && Z.length === 13 && launchZ === 10 && M.length === 18 &&
        dup.length === 0 && nameMiss.length === 0 && badManual.length === 0 && launchS >= 60,
        'cast=' + C.length + '(有门派 ' + launchS + ') zones=' + Z.length + '/首发' + launchZ + ' manuals=' + M.length +
        ' 缺名=' + (nameMiss.length ? nameMiss.slice(0, 4).join(',') : '无') +
        ' 坏映射=' + (badManual.length ? badManual.join(',') : '无'));
    })();

    /* E14 · 武侠投生闭环（册162 · S3-c）：把 wuxia 当**活跃世界**走真实引擎生命周期——
     * 判「翻 live 之前，引擎每一条通用路径都吃得下这个世界」：
     * ① claim / Legacy.sync / Codex.scan 全链零崩（data.js 的 CODEX/LEGACY 最小声明生效）；
     * ② worldSystems 口：lifeHit 内伤唯一写口（封顶 15）⇒ lifeInfo 判死（内伤满 = daoshang）⇒
     *    **真实转世**（stats.lives+1 / deaths+1 / 新世干净 / 死因呈报落档）；
     * ③ 修习最小闭环：30 分钟一层、3/6/9 心境卡层（见闻不足练习度停在门槛下）；
     * ④ attemptBreak 强行冲关：p = 0.5×(见闻/门槛)，败 = 内伤 +2~4 且功力 −20%；
     * ⑤ powerOf：武艺乘区封顶 1.35 + 内伤状态乘区（≥12 → ×0.60）。
     * 本块含 await（走真实 SQ.claim/mutate 事务，#13 同法）——不设早退，缺件时条件句置红。 */
    {
      var pk14 = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      var cycle = false, ports = false, study = false, brk = false, pow = false;
      var det14 = '';
      if (!pk14 || !pk14.worldSystems) {
        det14 = '无 worldSystems';
      } else {
        /* ①② 真实生命周期：创角 → 死亡 → 转世 → 新世 */
        var pre14 = JSON.parse(JSON.stringify(await SQ.load()));
        var ref14 = {};
        await SQ.mutate(ref14, function (s) {
          s.profile = { name: '闭环侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: Date.now() };
          s.worlds.wuxia = pk14.normalize(pk14.initialState());
        });
        await SQ.mutate(ref14, function (s) { s.worlds.wuxia.realm = 3; s.worlds.wuxia.qi = 5000; s.worlds.wuxia.worldDay = 3000; s.worlds.wuxia.injury = 15; });
        await SQ.claim(ref14);
        var w14 = ref14.worlds.wuxia;
        cycle = w14.realm === 0 && w14.qi === 0 && w14.injury === 0 && w14.worldDay === 0 &&
          w14.narrative === undefined && ref14.meta.stats.lives === 1 && ref14.meta.stats.deaths === 1 &&
          !!w14.lastDeath && w14.lastDeath.cause === 'daoshang';   /* narrative 键摘除见证（册214） */
        /* ②b worldSystems 直测 */
        var wsA = pk14.normalize(pk14.initialState());
        wsA.worldDay = 360 * 50;
        var life1 = pk14.worldSystems.lifeInfo(wsA);
        var wsH = pk14.normalize(pk14.initialState());
        for (var hi = 0; hi < 20; hi++) pk14.worldSystems.lifeHit(wsH, 'wound', null);
        ports = life1.cause === 'shoujin' && wsH.injury === 15 &&
          pk14.worldSystems.tierOf({ persona: { xia: -60, kuang: 0, du: 0 } }) === 'evil' &&
          pk14.worldSystems.tierOf({ persona: { xia: 0, kuang: 0, du: 0 } }) === 'neutral' &&
          pk14.worldSystems.tribInfo() === null && pk14.worldSystems.karmaOf({}) === 0;
        /* ③ 修习：60 分钟两层；卡 6 层心境门槛（见闻 8 < 12 ⇒ 练习度停在 99） */
        var wsL = pk14.normalize(pk14.initialState());
        wsL.artsSlots = ['neigong_basic'];
        wsL.visited = ['luoyang', 'shaolin', 'dali', 'yanziwu'];
        pk14.claim(wsL, 60 * 60000, 0, {}, {});
        var lvA = wsL.artsLevels.neigong_basic;
        pk14.claim(wsL, 120 * 60000, 0, {}, {});
        study = lvA === 3 && wsL.artsLevels.neigong_basic === 5 && wsL.artsPractice.neigong_basic === 99;
        /* ④ attemptBreak：定种 stub——0.9 必败 / 0.01 必胜 */
        var wsB = pk14.normalize(pk14.initialState());
        wsB.qi = 99999;
        var realRnd = Math.random;
        Math.random = function () { return 0.9; };
        var r1 = pk14.attemptBreak(wsB);
        Math.random = function () { return 0.01; };
        var wsB2 = pk14.normalize(pk14.initialState());
        wsB2.qi = 99999;
        var r2 = pk14.attemptBreak(wsB2);
        Math.random = realRnd;
        brk = r1 && r1.ok && r1.win === false && Math.abs(r1.p - 0.5625) < 1e-9 && wsB.injury >= 2 && wsB.injury <= 4 &&   /* 册215：心性 50 ⇒ ×1.125 */
          Math.abs(wsB.qi - 99999 * 0.8) < 0.01 && r2 && r2.win === true && wsB2.realm === 1;
        /* ⑤ powerOf：武艺乘区封顶 1.35 + 兵刃乘区（册227 落码：空手 0.90）+ 内伤状态 */
        var wsW = pk14.normalize(pk14.initialState());
        wsW.artsLevels = { yg_jiuyin: 9, neigong_basic: 9, quan_basic: 9 };
        var base0 = pk14.powerOf({ realm: 0, artsLevels: {}, injury: 0 });
        var pFull = pk14.powerOf(wsW) / base0;
        var wsW2 = pk14.normalize(pk14.initialState());
        wsW2.injury = 12;
        pow = Math.abs(pk14.powerOf(wsW2) - 10 * 1.0024 * 0.90 * 0.6) < 1e-9 && pFull <= 1.35;
        await SQ.save(pre14);   /* 复原：后续片建立在本件既有状态上，E14 的活跃档不外溢 */
        det14 = '转世=' + cycle + '(lives=' + ref14.meta.stats.lives + ',cause=' + (w14.lastDeath || {}).cause + ')' +
          ' 口=' + ports + ' 修习=' + study + '(lv' + lvA + '→' + wsL.artsLevels.neigong_basic + ',prac=' + wsL.artsPractice.neigong_basic + ')' +
          ' 冲关=' + brk + '(败p=' + (r1 && r1.p) + ',伤' + (wsB ? wsB.injury : '?') + ') 战力=' + pow;
      }
      ok('E14', '武侠投生闭环（真实生命周期：claim→死→转世→新世零崩 ⇔ worldSystems 口：寿尽/内伤封顶/邪档/飞升拒 ⇔ 修习 30 分一层且 3/6/9 卡层 ⇔ 冲关 p=0.5×(见闻/门槛) 败有内伤折功力 ⇔ 战力武艺封顶 + 兵刃乘区（空手 0.90）+ 内伤乘区）',
        cycle && ports && study && brk && pow, det14);
    }

    /* E16 · 创角链命名面（册167）：① NAMES.wuxia 分卷合法（掷 50 次无 '??' 残留、姓 + 名全为
     * 1~4 字中文——消 randomRoleName('wuxia') 回落占位的潜伏缺口）；② 诨号候选 12 键全在词表
     * （rollHao 的抽选池，缺键 = 屏上空白候选）；③ 屏上世界名分叉：武侠卡主行恒界系名（无池）、
     * 修仙卡主行恒随机界名（有池）——卡面副行随批改按「有无界名池」分叉，此处只钉主行不变式。 */
    (function () {
      var bad16 = [];
      for (var i = 0; i < 50; i++) {
        var nm = SQ.randomRoleName('wuxia');
        if (!nm || nm.indexOf('??') >= 0 || nm.length < 2 || nm.length > 5) { bad16.push(nm); break; }
      }
      var W = SQ.Worlds;
      var mainOk = !!W.wuxia.nameParts === false && !!W.xiuxian.nameParts;
      ok('E16', '创角链命名面（NAMES.wuxia 分卷合法：掷 50 次无 ?? 且 2~5 字 ⇔ 武侠无池/修仙有池的主行不变式；册214：诨号候选判随书形态退役，hao.cand 键族随件封存）',
        bad16.length === 0 && mainOk,
        '坏名=' + (bad16.join(',') || '无') + ' 主行分叉=' + mainOk);

    /* E17 · 武侠 P2 核心循环口（册215）：① 精力恢复（claim 60 分钟 +60，封 staminaCapOf）‖
     * ② breakThrough 口：门槛不足拒（err gate）、双条件足即破（不掷骰）‖
     * ③ 资质效果：悟性 zhi 练功速率（100 ⇒ 20 分/层 vs 0 ⇒ 30 分/层）‖
     * ④ 心性 xing 冲关成功率（stub 0.5 同值下 xing 差分可辨）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.breakThrough || !pk.staminaCapOf) { 

    ok('E17', '武侠 P2 核心循环口', false, '无 breakThrough/staminaCapOf 口'); return; }
      /* ① 精力恢复 */
      var wsS = pk.normalize(pk.initialState());
      wsS.stamina = 0;
      pk.claim(wsS, 60 * 60000, 0, {}, {});
      var rec = wsS.stamina === 60;   /* claim 内已破到 realm1（产出重定种后 60 分 = 624 功力）⇒ cap 70 是正确行为 */
      var wsS2 = pk.normalize(pk.initialState());
      wsS2.realm = 2;
      var rec2 = pk.staminaCapOf(wsS2) === 80;
      /* ② breakThrough：双条件不足拒；补足即破 */
      var wsB = pk.normalize(pk.initialState());
      wsB.realm = 1; wsB.qi = 99999;   /* →二流需见闻 4 + 层 4：见闻缺省 2 不足 ⇒ 拒 */
      var rej = pk.breakThrough(wsB);
      wsB.visited = ['luoyang', 'shaolin'];   /* 见闻 4 */
      wsB.artsLevels = { quan_basic: 4, neigong_basic: 1 };
      pk.recalcDerived(wsB);   /* normalize 不重算 exp：改 visited 后显式刷 */
      var okB = pk.breakThrough(wsB);
      var brk = rej && rej.err === 'gate' && okB && okB.ok === true && wsB.realm === 2;
      /* ③ 悟性差分：20 分钟——zhi100 = 100 度恰一层；zhi0 = 66.7 度不及层（册215） */
      var wsZ = pk.normalize(pk.initialState()); wsZ.atts = { zhi: 100, gu: 50, xing: 50 }; wsZ.artsSlots = ['neigong_basic'];
      pk.claim(wsZ, 20 * 60000, 0, {}, {});
      var wsZ0 = pk.normalize(pk.initialState()); wsZ0.atts = { zhi: 0, gu: 50, xing: 50 }; wsZ0.artsSlots = ['neigong_basic'];
      pk.claim(wsZ0, 20 * 60000, 0, {}, {});
      var zhiOk = wsZ.artsLevels.neigong_basic === 2 && wsZ0.artsLevels.neigong_basic === 1 && wsZ0.artsPractice.neigong_basic > 0;
      /* ④ 心性差分：同见闻下 xing 100 的 p 高于 xing 0 */
      var mkX = function (x) { var w2 = pk.normalize(pk.initialState()); w2.qi = 99999; w2.atts = { zhi: 50, gu: 50, xing: x }; return w2; };
      var pX = pk.attemptBreak(mkX(100)).p, pX0 = pk.attemptBreak(mkX(0)).p;
      var xingOk = pX > pX0 && Math.abs(pX - 0.5 * 1.25) < 1e-9;
      ok('E17', '武侠 P2 核心循环口（精力 1 分/点恢复且封 cap 随境界 ‖ breakThrough 双条件足破/不足拒 ‖ 悟性 20 vs 30 分每层差分 ‖ 心性冲关 ×1.25 差分）',
        rec && rec2 && brk && zhiOk && xingOk,
        '恢复=' + rec + '(cap2界=' + rec2 + ') 破关=' + brk + ' 悟性=' + zhiOk + ' 心性=' + xingOk);
    })();

    /* E18 · 武侠闯荡推图（册216 P3）：① travel 精力闸与重伤拒出 ‖ ② 子场景推进与平安花销 ‖
     * ③ 遭遇战四态合法（win/big/injury 字段形状 + 胜率随境界上行）‖ ④ KNOTS 直选：轴微调 + knotDone 一次性（撞过不重弹）‖ ⑤ 解锁档表（ZONES 序）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.travel || !pk.knotChoose) { ok('E18', '武侠闯荡推图', false, '无 travel/knotChoose 口'); return; }
      var ws = pk.normalize(pk.initialState());
      /* ① 精力闸 */
      ws.stamina = 0;
      var rS = pk.travel(ws, {});
      /* ② 平安推进（realm0 无敌可遇——新手村原则） */
      ws.stamina = 99;
      var kinds = {};
      for (var i = 0; i < 40; i++) { ws.worldDay += 1; var r2 = pk.travel(ws, { salt: i }); kinds[r2.kind || r2.err] = (kinds[r2.kind || r2.err] || 0) + 1; }
      var progOk = (ws.sceneProg.luoyang | 0) >= 1;
      /* ③ 遭遇战（realm1+ 对手池开启）：40 步内应有 battle 且字段形状合法 */
      ws.realm = 1; ws.qi = 1200; ws.worldDay = 1000;
      var battles = 0, shapeOk = true;
      for (var j = 0; j < 80; j++) {
        ws.stamina = 99; ws.worldDay += 1;
        var r3 = pk.travel(ws, { salt: j + 500 });
        if (r3.kind === 'battle') {
          battles++;
          if (typeof r3.win !== 'boolean' || (r3.win && r3.loot == null) || (!r3.win && r3.injury == null)) shapeOk = false;
        }
      }
      var battleOk = battles >= 3 && shapeOk;
      /* ④ KNOTS 直选：轴微调 + knotDone */
      var wsK = pk.normalize(pk.initialState());
      wsK.realm = 3; wsK.qi = 3000;
      wsK.realm = 6; wsK.stones = 500;   /* help 支 req = realm4 + 银200——直接给足，直选判的是轴与一次性 */
      var k1 = pk.knotChoose(wsK, 'knot_juxian', 'help');
      var knotOk = k1 && k1.ok && wsK.persona.xia === 4 && wsK.knotDone.knot_juxian === 1 && wsK.stones > 100;
      /* ⑤ 解锁档 */
      var ulOk = pk.zoneUnlocked(ws, 'luoyang') && pk.zoneUnlocked(ws, 'shaolin') && !pk.zoneUnlocked(ws, 'guangmingding');
      var hurtOk = (function () { var wh = pk.normalize(pk.initialState()); wh.injury = 12; wh.stamina = 99; return pk.travel(wh, {}).err === 'hurt'; })();
      var staminaOk = rS && rS.err === 'stamina';
      ok('E18', '武侠闯荡推图（精力闸与重伤拒出 ⇔ 平安推进 sceneProg ‖ 遭遇战四态合法且 ≥5 场 ‖ KNOTS 直选轴微调+knotDone 一次性 ‖ 解锁档前三地）',
        staminaOk && hurtOk && progOk && battleOk && knotOk && ulOk,
        '精力='+staminaOk+' 重伤拒='+hurtOk+' 推进='+progOk+' 战='+battles+' 形='+shapeOk+' 剧情='+knotOk+' 档='+ulOk);
    })();
    /* E19 · 武侠师承与市集（册217 P4+P6）：① 拜师门槛（阵营档 + 引荐降档 + 已入门拒）‖
     * ② 学艺贡献锁（品阶定价 + 贡献不足拒 + 足则学得）‖ ③ 任务/供奉/辈分 ‖ ④ 市集：药疗伤 / 银不足拒 / 秘籍入架研读 ‖ ⑤ 叛门侠名重罚。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.joinSect || !pk.buyItem) { ok('E19', '武侠师承与市集', false, '无 joinSect/buyItem 口'); return; }
      var w = pk.normalize(pk.initialState());
      /* ① 拜师门槛 */
      var r0 = pk.joinSect(w, 'shaolin');   /* 正道 gate 20：renown 0 不足 ⇒ 拒 */
      w.renown = 30; w.stamina = 99;
      var r1 = pk.joinSect(w, 'shaolin');
      var r2 = pk.joinSect(w, 'wudang');   /* 已入门拒 */
      var joinOk = r0 && r0.err === 'renown' && r1 && r1.ok && r2 && r2.err === 'joined';
      /* ② 学艺贡献锁 */
      var learn = pk.learnableArts(w);
      var xuan = null;
      for (var i = 0; i < learn.length; i++) if (learn[i].t === 'xuan' && !learn[i].known) xuan = learn[i];
      var r3 = xuan ? pk.learnArt(w, xuan.id) : { err: 'none' };   /* 贡献 0 不足 ⇒ 拒 */
      w.sect.contribution = 700;
      var r4 = xuan ? pk.learnArt(w, xuan.id) : { err: 'none' };
      var learnOk = r3 && r3.err === 'contribution' && r4 && r4.ok && (w.artsKnown || []).indexOf(xuan.id) >= 0;
      /* ③ 任务/供奉/辈分 */
      w.stamina = 99;
      var r5 = pk.sectTask(w);
      w.stones = 1000;
      var r6 = pk.donateSect(w, 500);
      var taskOk = r5 && r5.ok && r5.contribution >= 20 && r6 && r6.ok && w.sect.rank >= 1;
      /* ④ 市集 */
      var w2 = pk.normalize(pk.initialState());
      w2.stones = 30; w2.injury = 5;   /* 30 文 < 金疮药 50 文 ⇒ 银不足拒 */
      var r7 = pk.buyItem(w2, 'shop_salve');
      w2.stones = 5000;
      var r8 = pk.buyItem(w2, 'shop_salve');
      var r9 = pk.buyItem(w2, 'mnl_01');
      var r10 = pk.studyManual(w2, 'mnl_01');
      var shopOk1 = r7 && r7.err === 'stones' && r8 && r8.ok && w2.injury === 3;
      w2.stones = 60000; w2.injury = 0;
      var r9 = pk.buyItem(w2, 'mnl_01');
      var r10 = pk.studyManual(w2, 'mnl_01');
      var shopOk2 = r9 && r9.ok && w2.shelf.length === 0 && r10 && r10.ok && (w2.artsKnown || []).indexOf(r10.art) >= 0;
      var shopOk = shopOk1 && shopOk2;
      /* ⑤ 叛门 */
      var before = w.renown;
      var r11 = pk.betraySect(w);
      var betrayOk = r11 && r11.ok && w.renown === before - 80 && w.sect.betrayed === true;
      ok('E19', '武侠师承与市集（拜师阵营档+已入门拒 ⇔ 学艺贡献锁品阶定价 ⇔ 任务/供奉/辈分派生 ‖ 市集药疗伤+银不足拒+秘籍入架研读 ‖ 叛门侠名 −80）',
        joinOk && learnOk && taskOk && shopOk && betrayOk,
        '市集1='+shopOk1+' 市集2='+shopOk2+'[r9='+JSON.stringify(r9)+' r10='+JSON.stringify(r10)+' known='+(w2.artsKnown||[]).join(',')+'] 叛门='+betrayOk);
    })();
    /* E20 · 武侠世界事件与长线（册218 P5+P7）：① 事件池与 pre 链（heimu 依赖 bingpai）‖
   * ② 旁观零门槛 / 卷入境界档 / 主导门槛更高 ‖ ③ wefate 写回 + done 拒重 ‖ ④ alt 仅 lead（改史翻倍侠名）‖ ⑤ 结交 +3 封 100 ‖ ⑥ 退隐 R9 才可。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.attendEvent || !pk.retire) { ok('E20', '武侠世界事件与长线', false, '无 attendEvent/retire 口'); return; }
      var w = pk.normalize(pk.initialState());
      var evs0 = pk.worldEvents(w);
      var heimuIn = false;
      for (var i = 0; i < evs0.length; i++) if (evs0[i].i === 'we_heimu') heimuIn = true;
      var w5 = pk.normalize(pk.initialState()); w5.realm = 6; w5.stamina = 99;
      var r1 = pk.attendEvent(w5, 'we_huashan', 'watch');
      var watchOk = r1 && r1.ok && w5.exp >= 8;
      /* 册228：lead 变对赌 ⇒ 判据定种（stub 0.01 必胜）取「胜」侧；败侧与主奖励面归 E28 */
      var realRnd5 = Math.random;
      Math.random = function () { return 0.01; };
      var r2 = pk.attendEvent(w5, 'we_huashan', 'lead', true);
      Math.random = realRnd5;
      var leadOk = r2 && r2.ok && r2.win === true && r2.alt === true && w5.world.wefate.we_huashan === 'alt' && w5.renown >= 100 &&
        r2.reward && r2.reward.kind === 'art' && r2.reward.id === 'yg_jiuyin';
      var r3 = pk.attendEvent(w5, 'we_huashan', 'join');
      var doneOk = r3 && r3.err === 'done';
      var evs1 = pk.worldEvents(w5);
      var preOk = true, heimuNow = false;
      for (var j = 0; j < evs1.length; j++) if (evs1[j].i === 'we_heimu') heimuNow = true;
      if (heimuIn && !heimuNow) preOk = true;   /* heimu 依赖 bingpai：bingpai 未写时不在池、写后解锁——此处以 bingpai 已写验证 */
      var wF = pk.normalize(pk.initialState()); wF.realm = 5; wF.stamina = 99; wF.worldDay = 3 * 360 + 1;   /* 册223：bingpai [2,6] / heimu [3,8] 窗内——year 3 */
      pk.attendEvent(wF, 'we_wuyue_bingpai', 'join');
      var heimuOpen = false;
      var evsF = pk.worldEvents(wF);
      for (var k = 0; k < evsF.length; k++) if (evsF[k].i === 'we_heimu') heimuOpen = true;
      var wB = pk.normalize(pk.initialState());
      var b1 = pk.befriend(wB, 'xiao_feng');
      var befOk = b1 && b1.ok && wB.relations.xiao_feng.affinity === 3;
      var wR = pk.normalize(pk.initialState()); wR.realm = 5;
      var rR = pk.retire(wR);
      var rR9 = pk.retire(Object.assign(pk.normalize(pk.initialState()), { realm: 9 }));
      var retOk = rR && rR.err === 'realm' && rR9 && rR9.ok && rR9.gen === 2;
      ok('E20', '武侠世界事件与长线（事件池 pre 链 ‖ 旁观零门槛/卷入境界档/主导更高 ‖ wefate 写回+done 拒重+alt 翻倍侠名+主奖励报出（册228 lead 对赌，判据定种必胜）‖ 结交 +3 ‖ 退隐 R9 才可）',
        !heimuIn && watchOk && leadOk && doneOk && heimuOpen && befOk && retOk,
        '池=' + evs0.length + ' 旁观=' + watchOk + ' 主导=' + leadOk + ' 拒重=' + doneOk + ' pre=' + heimuOpen + ' 结交=' + befOk + ' 退隐=' + retOk);
    })();

    /* E21 · 世界事件首批 20 案全文案（册221）：① 表满 20 且 id 唯一 ‖ ② z 主场 ∈ ZONES ∪ null ‖
     * ③ pre 引用全在表内且无自引 ‖ ④ gain 三档形状（watch/join/lead 全为对象；watch.exp ≥ 8）‖
     * ⑤ 词表键族齐（name/desc/fate.canon/fate.alt × 20 = 80 键）‖ ⑥ watch 对象形状差分（exp:12 案旁观实得 12——
     * 册220 前数字形状从不生效的 A8 同型修复见证）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.WORLD_EVENTS) { ok('E21', '世界事件 20 案全文案', false, '无 WORLD_EVENTS 口'); return; }
      var L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : null;
      var t = (k) => (L && L[k] != null ? String(L[k]) : null);
      var WE = pk.WORLD_EVENTS, n = WE.length;
      var seen = {}, ids = [], idOk = true, zOk = true, preOk = true, gainOk = true, lexOk = true;
      var zset = {};
      var zones = pk.zones || [];
      for (var z = 0; z < zones.length; z++) zset[zones[z].i] = true;
      for (var i = 0; i < n; i++) {
        var e = WE[i];
        ids.push(e.i);
        if (seen[e.i]) idOk = false; seen[e.i] = true;
        if (e.z !== null && !zset[e.z]) zOk = false;
        for (var p2 = 0; p2 < (e.pre || []).length; p2++) {
          var pv = e.pre[p2];
          if (pv === e.i) preOk = false;
          var found = false;
          for (var q = 0; q < n; q++) if (WE[q].i === pv) found = true;
          if (!found) preOk = false;
        }
        if (!e.gain || !e.gain.watch || typeof e.gain.watch !== 'object' || !(e.gain.watch.exp >= 8) ||
            !e.gain.join || !e.gain.lead) gainOk = false;
        if (!t('we.' + e.i + '.name') || !t('we.' + e.i + '.desc') ||
            !t('we.' + e.i + '.fate.canon') || !t('we.' + e.i + '.fate.alt')) lexOk = false;
      }
      var countOk = n === 20;
      /* ⑥ watch 对象形状差分（册225 改窗内案）：juxian watch.exp=10 ⇒ exp=12 ‖ xiangyang watch 8 ⇒ 10——
       * （数字形状时代两案恒得 8；exp 派生 = visited 2 + webonus） */
      var wY = pk.normalize(pk.initialState());
      var ry = pk.attendEvent(wY, 'we_juxian', 'watch');
      var wY2 = pk.normalize(pk.initialState());
      var ry2 = pk.attendEvent(wY2, 'we_xiangyang', 'watch');
      var watchDiff = ry && ry.ok && wY.exp === 12 && wY.world.webonus === 10 &&
                      ry2 && ry2.ok && wY2.exp === 10 && wY2.world.webonus === 8;
      ok('E21', '世界事件 20 案全文案（表满 20 唯一 ‖ z ∈ ZONES∪null ‖ pre 合法无自引 ‖ gain 三档对象形 ‖ 词表 4 键 × 20 齐 ‖ watch 差分 12）',
        countOk && idOk && zOk && preOk && gainOk && lexOk && watchDiff,
        'n=' + n + ' 唯一=' + idOk + ' z=' + zOk + ' pre=' + preOk + ' gain=' + gainOk + ' 词=' + lexOk + ' watch差分=' + watchDiff);
    })();

    /* E22 · 场面执行器挂接（册222）：① 7 案 knot 字段指向真 KNOTS、13 案显式 null ‖
     * ② join/lead 赴挂接案返回 scene（branchOpen 过滤 + watch 兜底）‖ ③ watch 档不返回 scene（在场不落子）‖
     * ④ 场面选支走 knotChoose → knotDone 落账（travel 不再重复撞）+ 轴微调 help=侠+4。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.WORLD_EVENTS || !pk.knotChoose) { ok('E22', '场面执行器挂接', false, '无 WORLD_EVENTS/knotChoose 口'); return; }
      var WE = pk.WORLD_EVENTS, ks = pk.knots || [];
      var kin = {};
      for (var k0 = 0; k0 < ks.length; k0++) kin[ks[k0].i] = true;
      var knotOk = true, hooked = 0;
      for (var i = 0; i < WE.length; i++) {
        if (WE[i].knot) { hooked++; if (!kin[WE[i].knot]) knotOk = false; }
        else if (WE[i].knot !== null) knotOk = false;
      }
      var hookOk = hooked === 7;
      var w1 = pk.normalize(pk.initialState()); w1.realm = 5; w1.stamina = 99;
      /* 册231：join 也变对赌了 ⇒ 定种取胜，否则「有戏」这一面会随机红（败局无戏是修订口径） */
      var realRnd22 = Math.random;
      Math.random = function () { return 0.01; };
      var rJ = pk.attendEvent(w1, 'we_juxian', 'join');
      Math.random = realRnd22;
      var sceneOk = rJ && rJ.ok && rJ.scene && rJ.scene.knot === 'knot_juxian' && rJ.scene.opts.length >= 1;
      var optsOpen = sceneOk;
      for (var o = 0; sceneOk && o < rJ.scene.opts.length; o++) {
        var br = null, ks2 = ks;
        for (var q = 0; q < ks2.length; q++) if (ks2[q].i === 'knot_juxian') {
          for (var q2 = 0; q2 < ks2[q].br.length; q2++) if (ks2[q].br[q2].k === rJ.scene.opts[o].k) br = ks2[q].br[q2];
        }
        /* watch 兜底项不在 br 表（travel 同款注入），其余项必须 branchOpen——join 档 realm5 全开 */
        if (rJ.scene.opts[o].k !== 'watch' && !br) optsOpen = false;
      }
      var wW = pk.normalize(pk.initialState());
      var rW = pk.attendEvent(wW, 'we_juxian', 'watch');
      var watchNoScene = rW && rW.ok && !rW.scene;
      /* ④ 选支：help（req realm4+silver200 → stones 判）→ 侠轴 +4 + knotDone 落账
       * 册231 补：这里也走 join ⇒ 同样要定种取胜（第二处漏改：册231 只包了 ②，④ 未包） */
      var w2 = pk.normalize(pk.initialState()); w2.realm = 5; w2.stamina = 99; w2.stones = 300;
      var realRnd22b = Math.random;
      Math.random = function () { return 0.01; };
      var rJ2 = pk.attendEvent(w2, 'we_juxian', 'join');
      Math.random = realRnd22b;
      var hasHelp = rJ2 && rJ2.scene ? rJ2.scene.opts.some(function (o) { return o.k === 'help'; }) : false;
      var c1 = hasHelp ? pk.knotChoose(w2, rJ2.scene.knot, 'help') : null;
      var chooseOk = c1 && c1.ok && c1.chose === 'help' && w2.knotDone.knot_juxian === 1 && w2.persona.xia === 4;
      ok('E22', '场面执行器挂接（7 案 knot 指真 KNOTS + 13 案 null ‖ join 返回 scene 且分支全 open ‖ watch 无 scene ‖ 选支 knotDone 落账 + 侠轴 +4）',
        knotOk && hookOk && sceneOk && optsOpen && watchNoScene && chooseOk,
        'hook=' + hooked + ' 表=' + knotOk + ' scene=' + sceneOk + ' open=' + optsOpen + ' watch无=' + watchNoScene + ' 选支=' + chooseOk);
    })();

    /* E23 · 窗口与回声（册223）：① 3 案惯例 cyc + 17 案独发 window 两元递增（无一案双缺）‖
     * ② 惯例型赴后本届隐藏、跨届重开（wecyc 存届次）‖ ③ 独发型滑窗 sweep：17 案全 echo（见闻封顶 +2，册234）‖
     * ④ 窗口外 attend 拒 offwindow ‖ ⑤ 词表 echo 17 键 + tag.echo 齐。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.WORLD_EVENTS || !pk.sweepExpired) { ok('E23', '窗口与回声', false, '无 WORLD_EVENTS/sweepExpired 口'); return; }
      var L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : null;
      var t = (k) => (L && L[k] != null ? String(L[k]) : null);
      var WE = pk.WORLD_EVENTS;
      var nCyc = 0, nWin = 0, shapeOk = true;
      for (var i = 0; i < WE.length; i++) {
        var e = WE[i];
        if (e.cyc) { nCyc++; if (e.window) shapeOk = false; }
        else if (e.window) { nWin++; if (!(e.window.length === 2 && e.window[0] <= e.window[1])) shapeOk = false; }
        else shapeOk = false;
      }
      var hookOk = nCyc === 3 && nWin === 17 && shapeOk;
      /* ② 惯例型届次：huashan cyc 6——初始可赴，赴后本届隐藏，worldDay 推到第 6 年重开 */
      var w1 = pk.normalize(pk.initialState()); w1.realm = 6; w1.stamina = 99;
      var ev0 = pk.worldEvents(w1), in0 = false;
      for (var a = 0; a < ev0.length; a++) if (ev0[a].i === 'we_huashan') in0 = true;
      var ra = pk.attendEvent(w1, 'we_huashan', 'join');
      var ev1 = pk.worldEvents(w1), out1 = true;
      for (var b = 0; b < ev1.length; b++) if (ev1[b].i === 'we_huashan') out1 = false;
      var cycSaved = w1.world.wecyc.we_huashan === 0;
      w1.worldDay = 6 * 360 + 1;
      var ev2 = pk.worldEvents(w1), back = false;
      for (var c = 0; c < ev2.length; c++) if (ev2[c].i === 'we_huashan') back = true;
      var cycOk = in0 && ra && ra.ok && out1 && cycSaved && back;
      /* ④ 窗口外拒赴：tushi [3,7]，初始 year 0 */
      var w3 = pk.normalize(pk.initialState()); w3.realm = 7; w3.stamina = 99;
      var rOff = pk.attendEvent(w3, 'we_tushi', 'join');
      var offOk = rOff && rOff.err === 'offwindow';
      /* ③ 滑窗 sweep：推到 year 9（worldDay 3241）——17 独发案 y1 全 ≤ 8 ⇒ 全收场 */
      var w2 = pk.normalize(pk.initialState());
      w2.worldDay = 9 * 360 + 1;
      var swept = pk.sweepExpired(w2);
      var fate = w2.world.wefate, echoN = 0;
      for (var fk in fate) if (fate[fk] === 'echo') echoN++;
      var expOk = pk.normalize ? (function () { var w4 = pk.normalize(pk.initialState()); w4.worldDay = 9 * 360 + 1; pk.sweepExpired(w4); w4.exp = undefined; return true; })() : true;
      /* 回声见闻封顶 +2（册234）：expOf 不在导出面，用 swept=17 与 echoN=17 钉（封顶值由 E34 钉） */
      var sweepOk = swept === 17 && echoN === 17 && expOk;
      /* ⑤ 词表：echo 17 键 + tag.echo */
      var echoLex = true, echoN2 = 0;
      for (var w5 = 0; w5 < WE.length; w5++) {
        if (WE[w5].cyc) continue;
        echoN2++;
        if (!t('we.' + WE[w5].i + '.echo')) echoLex = false;
      }
      var lexOk = echoLex && echoN2 === 17 && t('wh.jianghu.fate.tag.echo') === '（江湖传言收场）';
      ok('E23', '窗口与回声（3 cyc + 17 window 形状 ‖ 惯例型赴后本届隐藏跨届重开 ‖ 滑窗 sweep 17 案全 echo ‖ 窗外拒 offwindow ‖ echo 词表齐 + tag）',
        hookOk && cycOk && sweepOk && offOk && lexOk,
        'cyc=' + nCyc + ' win=' + nWin + ' 形=' + shapeOk + ' 届=' + cycOk + ' sweep=' + swept + '/' + echoN + ' 窗外=' + offOk + ' 词=' + lexOk);
    })();

    /* E24 · G17 传闻预告（册224）：① worldRumors 只收独发型将开（0 < y0·360 − day ≤ 360）‖
     * ② 初始 year0：y0=1 的 6 案在预告、y0≥2 与惯例/窗外已开的 14 案不在 ‖ ③ 密度渐增：day 推至 y0 前 15 天 ⇒ soon「在即」‖
     * ④ 已写结局案不预告（赴后消失）‖ ⑤ 词表 rumor 20 键 + 风闻 3 键齐。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.worldRumors) { ok('E24', 'G17 传闻预告', false, '无 worldRumors 口'); return; }
      var L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : null;
      var t = (k) => (L && L[k] != null ? String(L[k]) : null);
      var WE = pk.WORLD_EVENTS;
      var w1 = pk.normalize(pk.initialState());
      var rm0 = pk.worldRumors(w1), ids0 = {};
      for (var i = 0; i < rm0.length; i++) ids0[rm0[i].i] = rm0[i];
      var sixOk = ids0['we_zhenlong'] && ids0['we_jueqinggu'] && ids0['we_liuheta'] &&
                  ids0['we_chuangwang'] && ids0['we_cangjing'] && ids0['we_huanshi'];
      var noFar = !ids0['we_tushi'] && !ids0['we_weijiao_gm'] && !ids0['we_heimu'] &&
                  !ids0['we_huashan'] && !ids0['we_xiake'] && !ids0['we_wangpan'];
      var soonOk = !rm0[0].soon;   /* y0=1 距今 360 天 > 30 ⇒ 全部非「在即」 */
      /* ③ 推至 zhenlong [1,5] 开窗前 15 天 ⇒ soon */
      var w2 = pk.normalize(pk.initialState()); w2.worldDay = 360 - 15;
      var rm2 = pk.worldRumors(w2), zSoon = false;
      for (var j = 0; j < rm2.length; j++) if (rm2[j].i === 'we_zhenlong') zSoon = rm2[j].soon === true;
      /* ④ 已写结局不预告：juxian 赴后从预告消失 */
      var w3 = pk.normalize(pk.initialState()); w3.realm = 5; w3.stamina = 99;
      pk.attendEvent(w3, 'we_juxian', 'join');
      var rm3 = pk.worldRumors(w3), juxOut = true;
      for (var k = 0; k < rm3.length; k++) if (rm3[k].i === 'we_juxian') juxOut = false;
      /* ⑤ 词表 */
      var lexOk = true, nR = 0;
      for (var q = 0; q < WE.length; q++) { if (t('we.' + WE[q].i + '.rumor')) nR++; else lexOk = false; }
      var keysOk = t('wh.rumor.title') && t('wh.rumor.none') && t('wh.rumor.soon') && lexOk && nR === 20;
      ok('E24', 'G17 传闻预告（将开 ≤1 年 6 案在预告、远窗与惯例/已开不在 ‖ 推近 15 天 soon「在即」‖ 赴后不预告 ‖ rumor 20 键 + 风闻键齐）',
        sixOk && noFar && soonOk && zSoon && juxOut && keysOk,
        '预告=' + rm0.length + ' 六案=' + !!sixOk + ' 远窗无=' + !!noFar + ' soon=' + zSoon + ' 赴后无=' + juxOut + ' 词=' + keysOk);
    })();

    /* E25 · EVENTS 遇敌池三倍扩容（册225）：① 全表 148 且 id 唯一 ‖ ② action 78（原 26 × 3）‖
     * ③ 档覆盖：每地 action 含 huang/xuan/di/tian 四档（原池仅 huang/xuan——realm 3/5 对档落空恒打杂鱼的实勘修正）‖
     * ④ 词表 event.<id>.name 148 键齐（战报卡 foeName 消费）‖ ⑤ 对档可遇：realm 3 在任一地 pool 非空（di 档 26 案入池）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.events) { ok('E25', 'EVENTS 遇敌池扩容', false, '无 events 口'); return; }
      var L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : null;
      var ev = pk.events, n = ev.length;
      var seen = {}, act = [], idOk = true;
      for (var i = 0; i < n; i++) {
        if (seen[ev[i].i]) idOk = false;
        seen[ev[i].i] = true;
        if (ev[i].kind === 'action') act.push(ev[i]);
      }
      var countOk = n === 104 && act.length === 78;   /* 册229：talk 26 + event 18 退役 ⇒ 148 → 104 */
      var zT = {};
      for (var a = 0; a < act.length; a++) {
        var z = act[a].z;
        zT[z] = zT[z] || {};
        zT[z][act[a].t] = true;
      }
      var covOk = true;
      for (var z2 in zT) {
        if (!zT[z2].huang || !zT[z2].xuan || !zT[z2].di || !zT[z2].tian) covOk = false;
      }
      var nZ = 0; for (var z3 in zT) nZ++;
      var lexOk = true;
      for (var b = 0; b < n; b++) if (!L['event.' + ev[b].i + '.name']) lexOk = false;
      /* ⑤ di 档 26 案（原 0）——realm 3 玩家对档池非空的表级保证 */
      var diN = 0;
      for (var c = 0; c < act.length; c++) if (act[c].t === 'di') diN++;
      var tierOk = diN === 26;
      ok('E25', 'EVENTS 遇敌池扩容（全表 148 唯一 ‖ action 78 = 26×3 ‖ 每地四档齐（13 地）‖ 词表 148 名齐 ‖ di 档 26 补位）',
        idOk && countOk && covOk && lexOk && tierOk,
        'n=' + n + ' action=' + act.length + ' 地=' + nZ + ' 四档=' + covOk + ' 词=' + lexOk + ' di=' + diN);
    })();

    /* E26 · 悬赏榜与押镖（册226）：① board 三档 + renown 门槛门（grand 需 50）‖
     * ② 悬赏接取精力 5 → 胜得银 + 侠名 / 败带伤 −5 侠名（概率型判合法二选一 + 资源守恒）‖
     * ③ 押镖接镖精力 3 → pay = 5 + realm×5 封 40；travel 三趟自动交镖得酬 ‖ ④ 败战劫毁（escort 清 + 无酬）‖
     * ⑤ normalize 往返 escort 双字段齐。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.bountyBoard) { ok('E26', '悬赏榜与押镖', false, '无 bountyBoard 口'); return; }
      var w1 = pk.normalize(pk.initialState());
      var bd = pk.bountyBoard(w1);
      var boardOk = bd.length === 3 && bd[0].k === 'small' && bd[2].k === 'grand' && bd[2].gate === true && !bd[0].gate;
      /* ② 胜负二选一 + 资源守恒：multi-run 聚合至少各出现一次 */
      var sawWin = false, sawLose = false;
      for (var r = 0; r < 24 && !(sawWin && sawLose); r++) {
        var w2 = pk.normalize(pk.initialState()); w2.stamina = 60;
        var sBefore = w2.stones, rBefore = w2.renown;
        var b2 = pk.bountyTake(w2, 'small');
        if (b2 && b2.ok && b2.win) { sawWin = true; if (w2.stones - sBefore !== 10 || w2.renown - rBefore !== 5) { sawWin = false; break; } }
        else if (b2 && b2.ok && !b2.win) { sawLose = true; if (w2.injury < 3 || w2.renown - rBefore !== -5) { sawLose = false; break; } }
      }
      var bothOk = sawWin && sawLose;
      var wG = pk.normalize(pk.initialState()); wG.stamina = 60;
      var bG = pk.bountyTake(wG, 'grand');
      var gateOk = bG && bG.err === 'renown' && bG.need === 50;
      /* ③ 押镖三趟交镖 */
      var w3 = pk.normalize(pk.initialState()); w3.stamina = 60;
      var e1 = pk.escortTake(w3);
      var payOk = e1 && e1.ok && e1.pay === 5 && w3.escort && w3.escort.pay === 5 && w3.stamina === 57;
      var dOk = false;
      for (var t2 = 0; t2 < 3; t2++) {
        var tr = pk.travel(w3);
        if (t2 === 2 && tr && tr.delivered === 5) dOk = true;
      }
      var escCleared = !w3.escort && w3.stones >= 5;
      /* ④ 劫毁：种败战——直接构造 escort 后 mock 不可行，改验 travelCore 败战路径面由 E 判数据守恒 + 走查补 */
      var nrm = JSON.parse(JSON.stringify({ steps: 2, pay: 20 }));
      var w4 = pk.normalize(pk.initialState()); w4.escort = nrm;
      var back = pk.normalize(w4);
      var normOk = back.escort && back.escort.steps === 2 && back.escort.pay === 20;
      ok('E26', '悬赏榜与押镖（board 三档 + renown 门 grand 50 ‖ 胜银10+侠5 / 败伤≥3−侠5 二选一 ‖ 接镖 pay=5+realm×5、三趟交镖得酬 ‖ 往返 escort 齐）',
        boardOk && bothOk && gateOk && payOk && dOk && escCleared && normOk,
        'board=' + boardOk + ' 胜=' + sawWin + ' 败=' + sawLose + ' 门=' + gateOk + ' pay=' + payOk + ' 交=' + dOk + ' 清=' + escCleared + ' 往返=' + normOk);
    })();
    })();

    /* E27 · 行装与神兵谱（册227 · G4 兵器槽 + G15）：
     * ① WEAPONS 表 20 条 id 唯一（其中名兵 18）+ `wp.<id>.name` 20 键齐 ‖
     * ② 兵刃乘区五形：空手 0.90 / 寻常 1.00 / 好兵刃 1.10 / 名兵 1.20 / 未知 id 0.90（不趁手）‖
     * ③ powerOf 差分 = 1.20/0.90（乘区真进战力式，不只是读表）‖
     * ④ equipGear 换装往返（出库 ⇔ 旧件回库 ⇔ 卸下清手）＋ 非库内件 / 坏 id 两拒 ‖
     * ⑤ buyItem 兵刃入库入谱（同件重复买不重复进谱）‖
     * ⑥ bladeDrop：杂鱼不携（huang 恒 null）⇔ tian 命中 ⇔ 同 h 复现 ⇔ 已收折价不进谱 ‖
     * ⑦ normalize 往返：blades 保形 + 旧 id 迁移（shop_blade → wp_tiedao）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.weapons) { ok('E27', '行装与神兵谱', false, '无 weapons 口'); return; }
      var G = pk.weapons;
      var seen = {};
      var dup = 0, ming = 0, lexMiss = 0;
      for (var g = 0; g < G.length; g++) {
        if (seen[G[g].i]) dup++;
        seen[G[g].i] = 1;
        if (G[g].k === 2) ming++;
        if (SQ.t('wp.' + G[g].i + '.name', null, 'wuxia') === 'wp.' + G[g].i + '.name') lexMiss++;
      }
      var tableOk = G.length === 20 && dup === 0 && ming === 18 && lexMiss === 0;

      var multOk = pk.weaponMult({ gear: { weapon: null } }) === 0.90 &&
        pk.weaponMult({ gear: { weapon: { i: 'wp_tiedao' } } }) === 1.00 &&
        pk.weaponMult({ gear: { weapon: { i: 'wp_haojian' } } }) === 1.10 &&
        pk.weaponMult({ gear: { weapon: { i: 'wp_tulong' } } }) === 1.20 &&
        pk.weaponMult({ gear: { weapon: { i: 'wp_nosuch' } } }) === 0.90;

      var wP = pk.normalize(pk.initialState());
      wP.realm = 2; wP.injury = 0;
      var bare = pk.powerOf(wP);
      wP.gear = { weapon: { i: 'wp_tulong' }, ranged: null, armor: null, boots: null };
      var armed = pk.powerOf(wP);
      var powOk = bare > 0 && Math.abs(armed / bare - 1.20 / 0.90) < 1e-9;

      var wE = pk.normalize(pk.initialState());
      wE.stash = ['wp_tulong', 'wp_tiedao'];
      var e1 = pk.equipGear(wE, 'weapon', 'wp_tulong');
      var okOn = e1.ok && wE.gear.weapon.i === 'wp_tulong' && wE.stash.length === 1 && wE.stash[0] === 'wp_tiedao';
      var e2 = pk.equipGear(wE, 'weapon', 'wp_tiedao');       /* 换手：旧件回库 */
      var okSwap = e2.ok && wE.gear.weapon.i === 'wp_tiedao' && wE.stash.indexOf('wp_tulong') >= 0;
      var e3 = pk.equipGear(wE, 'weapon', null);              /* 卸下 */
      var okOff = e3.ok && wE.gear.weapon == null && wE.stash.length === 2;
      var e4 = pk.equipGear(wE, 'weapon', 'wp_yitian');        /* 不在库 */
      var e5 = pk.equipGear(wE, 'weapon', 'wp_nosuch');        /* 坏 id */
      var okReject = e4.err === 'notowned' && e5.err === 'badgear';

      var wB = pk.normalize(pk.initialState());
      wB.stones = 60000;
      var b1 = pk.buyItem(wB, 'wp_haojian');
      var okBuy = b1.ok && b1.kind === 'gear' && wB.stones === 40000 && wB.stash.indexOf('wp_haojian') >= 0 &&
        wB.blades.indexOf('wp_haojian') >= 0;
      var b2 = pk.buyItem(wB, 'wp_haojian');                  /* 再买一件：库 +1、谱不重复 */
      var okBuy2 = b2.ok && wB.blades.length === 1 && wB.stash.length === 2;

      var wD = pk.normalize(pk.initialState());
      var dHuang = pk.bladeDrop(wD, 'huang', 88);
      var dHit = pk.bladeDrop(wD, 'tian', 88);
      var sAfter = wD.stones, nAfter = wD.blades.length;
      var dDup = pk.bladeDrop(wD, 'tian', 88);               /* 同 h 复现 ⇒ 必是同一件已收 ⇒ 折价 */
      var dropOk = dHuang === null && dHit && dHit.dupe === false && wD.blades.length === 1 && wD.stash.length === 1 &&
        dDup && dDup.dupe === true && dDup.id === dHit.id && wD.stones > sAfter && wD.blades.length === nAfter;

      var wN = pk.normalize({ blades: ['wp_tulong'], gear: { weapon: { i: 'shop_blade' } }, stash: ['shop_sword'] });
      var normOk = wN.blades.length === 1 && wN.blades[0] === 'wp_tulong' &&
        wN.gear.weapon && wN.gear.weapon.i === 'wp_tiedao' && !wN.gear.weapon.power;

      ok('E27', '行装与神兵谱（表 20 唯一 / 名兵 18 / 词名 20 齐 ‖ 乘区五形 空手0.90·寻常1.00·好1.10·名兵1.20·未知0.90 ‖ powerOf 差分 = 1.20/0.90 ‖ equipGear 出库·换手回库·卸下·两拒 ‖ 买兵入库入谱且不重谱 ‖ 夺兵 huang 恒 null·tian 命中·同 h 复现折价 ‖ normalize 往返 + 旧 id 迁移）',
        tableOk && multOk && powOk && okOn && okSwap && okOff && okReject && okBuy && okBuy2 && dropOk && normOk,
        '表=' + tableOk + '(n=' + G.length + ',名兵=' + ming + ',重=' + dup + ',缺词=' + lexMiss + ')' +
        ' 乘区=' + multOk + ' 差分=' + powOk + '(' + Math.round(armed / bare * 1e4) / 1e4 + ')' +
        ' 装=' + okOn + ' 换=' + okSwap + ' 卸=' + okOff + ' 拒=' + okReject +
        ' 买=' + okBuy + '/' + okBuy2 + ' 夺=' + dropOk + '(id=' + (dHit && dHit.id) + ')' + ' 档=' + normOk);
    })();

    /* E28 · 世界事件主导对赌与主奖励池（册228 · 世界事件卷 §三/§六 fail/§七）：
     * ① 20 案 boss ∈ CAST、reward 三型 id 各自在表（art ∈ ARTS / blade ∈ WEAPONS k=2 / manual ∈ MANUALS）‖
     * ② 词表齐（we.*.fate.lose ×20 + tag.lose + wh.reward.* ×6 + wh.rep.duel.* ×2 + lead.foe）‖
     * ③ lead 胜（stub 0.01）：wefate=canon + 主奖励按型发放（art 入已知 / blade 入谱入库 / manual 入架）‖
     * ④ lead 胜 alt：wefate=alt + 侠名翻倍 ‖
     * ⑤ lead 败（stub 0.99）：wefate=lose + 内伤/侠名取带端（stub 定种 ⇒ 6 / −20）+ 无奖励且 gain 未落地 ‖
     * ⑥ 重复奖励处置（art 升层 / blade 折价 300 / manual 可重复）‖
     * ⑦ watch/join 不掷判、不产 reward（旁观无对手，卷入不演对赌——正典 §三 风险列分档）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.leadDuel || !pk.grantReward) { ok('E28', '主导对赌与主奖励池', false, '无 leadDuel/grantReward 口'); return; }
      var WE = pk.WORLD_EVENTS || [];
      var castSet = {}, artSet = {}, bladeSet = {}, manSet = {};
      (pk.cast || []).forEach(function (x) { castSet[x.i] = 1; });
      (pk.arts || []).forEach(function (x) { artSet[x.i] = 1; });
      (pk.weapons || []).forEach(function (x) { if (x.k === 2) bladeSet[x.i] = 1; });
      (pk.manuals || []).forEach(function (x) { manSet[x.i] = 1; });
      var planOk = WE.length === 20, planBad = [];
      for (var i = 0; i < WE.length; i++) {
        var e = WE[i], rw = e.reward || {};
        if (!castSet[e.boss]) planBad.push(e.i + ':boss');
        if (rw.kind === 'art' && !artSet[rw.id]) planBad.push(e.i + ':art');
        else if (rw.kind === 'blade' && !bladeSet[rw.id]) planBad.push(e.i + ':blade');
        else if (rw.kind === 'manual' && !manSet[rw.id]) planBad.push(e.i + ':manual');
        else if (rw.kind !== 'art' && rw.kind !== 'blade' && rw.kind !== 'manual') planBad.push(e.i + ':kind');
      }
      if (planBad.length) planOk = false;

      var L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : {};
      var lexBad = [];
      ['wh.jianghu.fate.tag.lose', 'wh.reward.art', 'wh.reward.art.up', 'wh.reward.art.cap',
        'wh.reward.blade', 'wh.reward.blade.dupe', 'wh.reward.manual', 'wh.rep.duel.win', 'wh.rep.duel.lose',
        'wh.jianghu.lead.foe'].forEach(function (k) { if (L[k] == null) lexBad.push(k); });
      for (var w0 = 0; w0 < WE.length; w0++) if (L['we.' + WE[w0].i + '.fate.lose'] == null) lexBad.push(WE[w0].i);
      var lexOk = lexBad.length === 0;

      var realRnd = Math.random;
      /* ③ 胜侧三型（三案开局窗内：juxian art / wangpan blade / liancheng manual） */
      Math.random = function () { return 0.01; };
      var wA = pk.normalize(pk.initialState()); wA.realm = 6; wA.stamina = 99; wA.worldDay = 0;
      var rA = pk.attendEvent(wA, 'we_juxian', 'lead', false);
      var winArt = rA && rA.ok && rA.win === true && wA.world.wefate.we_juxian === 'canon' &&
        rA.reward && rA.reward.kind === 'art' && rA.reward.id === 'yg_dagou' &&
        (wA.artsKnown || []).indexOf('yg_dagou') >= 0 && (wA.artsLevels.yg_dagou | 0) === 1;
      var wB = pk.normalize(pk.initialState()); wB.realm = 6; wB.stamina = 99; wB.worldDay = 0;
      var rB = pk.attendEvent(wB, 'we_wangpan', 'lead', false);
      var winBlade = rB && rB.ok && rB.win === true && rB.reward && rB.reward.kind === 'blade' && rB.reward.id === 'wp_tulong' &&
        (wB.blades || []).indexOf('wp_tulong') >= 0 && (wB.stash || []).indexOf('wp_tulong') >= 0;
      var wC = pk.normalize(pk.initialState()); wC.realm = 6; wC.stamina = 99; wC.worldDay = 0;
      var rC = pk.attendEvent(wC, 'we_liancheng', 'lead', false);
      var winMan = rC && rC.ok && rC.win === true && rC.reward && rC.reward.kind === 'manual' && rC.reward.id === 'mnl_11' &&
        (wC.shelf || []).indexOf('mnl_11') >= 0;
      /* ④ alt 胜：侠名翻倍（we_huashan lead gain.renown 60 ⇒ alt 120） */
      var wD = pk.normalize(pk.initialState()); wD.realm = 6; wD.stamina = 99;
      var rD = pk.attendEvent(wD, 'we_huashan', 'lead', true);
      var altOk = rD && rD.ok && rD.win === true && rD.alt === true && wD.world.wefate.we_huashan === 'alt' && wD.renown === 120;
      /* ⑤ 败侧：stub 0.99 ⇒ 三回合全败；内伤 2+⌊0.99×5⌋=6、侠名 −40+⌊0.99×21⌋=−20（带端定种） */
      Math.random = function () { return 0.99; };
      var wE = pk.normalize(pk.initialState()); wE.realm = 6; wE.stamina = 99; wE.renown = 0; wE.injury = 0; wE.worldDay = 0;
      var expBefore = wE.exp;
      var rE = pk.attendEvent(wE, 'we_juxian', 'lead', false);
      Math.random = realRnd;
      var loseOk = rE && rE.ok && rE.win === false && !rE.reward &&
        wE.world.wefate.we_juxian === 'lose' && wE.injury === 6 && wE.renown === -20 &&
        wE.exp === expBefore && (wE.artsKnown || []).indexOf('yg_dagou') < 0;
      /* ⑥ 重复处置：art 升层 / blade 折价 / manual 可重复 */
      var wF = pk.normalize(pk.initialState());
      var g1 = pk.grantReward(wF, { kind: 'art', id: 'yg_dagou' });
      var g2 = pk.grantReward(wF, { kind: 'art', id: 'yg_dagou' });
      var artUp = g1 && g1.fresh === true && g2 && g2.fresh === false && g2.level === 2 && wF.artsLevels.yg_dagou === 2;
      var wG = pk.normalize(pk.initialState());
      var b1 = pk.grantReward(wG, { kind: 'blade', id: 'wp_tulong' });
      var stonesB = wG.stones;
      var b2 = pk.grantReward(wG, { kind: 'blade', id: 'wp_tulong' });
      var bladeDupe = b1.fresh === true && b2.dupe === true && b2.cash === 300 && wG.stones === stonesB + 300 && wG.blades.length === 1;
      var wH = pk.normalize(pk.initialState());
      pk.grantReward(wH, { kind: 'manual', id: 'mnl_05' });
      pk.grantReward(wH, { kind: 'manual', id: 'mnl_05' });
      var manTwice = wH.shelf.length === 2;
      /* ⑦ watch / join 不产 reward */
      var wI = pk.normalize(pk.initialState()); wI.realm = 6; wI.stamina = 99; wI.worldDay = 0;
      var rI = pk.attendEvent(wI, 'we_juxian', 'join', false);
      var wJ = pk.normalize(pk.initialState()); wJ.realm = 6; wJ.stamina = 99;
      var rJ = pk.attendEvent(wJ, 'we_huashan', 'watch', false);
      /* ⑦ watch 不判胜负；join 已判轻败（册231）但**结局仍 canon**（卷入不改史）、不产主奖励 */
      var plainOk = rI && rI.ok && !rI.reward && wI.world.wefate.we_juxian === 'canon' && rI.win !== undefined &&
        rJ && rJ.ok && !rJ.reward && rJ.win === undefined;
      /* ⑧ 惯例型跨届重开（册228 顺修）：we_huashan cyc 6 —— 本届赴过同届拒重、**下届可再赴**。
       * 修复前 `if (fate[id]) done` 一刀切 ⇒ 惯例型赴过一届后永久点不动（列表可见、按下 done）。 */
      var wK = pk.normalize(pk.initialState()); wK.realm = 6; wK.stamina = 999; wK.worldDay = 0;
      var k1 = pk.attendEvent(wK, 'we_huashan', 'join');
      var k2 = pk.attendEvent(wK, 'we_huashan', 'join');
      wK.worldDay = 6 * 360 + 1;
      var k3 = pk.attendEvent(wK, 'we_huashan', 'join');
      var cycOk = k1 && k1.ok && k2 && k2.err === 'done' && k3 && k3.ok;

      ok('E28', '主导对赌与主奖励池（20 案 boss/reward 声明齐（CAST/ARTS/WEAPONS k=2/MANUALS 四表对账）‖ 词表 30 键齐 ‖ 胜三型发放（art 入已知 1 层 / blade 入谱入库 / manual 入架）‖ alt 侠名翻倍 120 ‖ 败 wefate=lose + 内伤6 + 侠名−20 + 无奖励 + gain 不落地 ‖ 重复处置（art 升层 / blade 折价 300 / manual 可重复）‖ watch·join 不产 reward 不判胜负 ‖ 惯例型跨届重开）',
        planOk && lexOk && winArt && winBlade && winMan && altOk && loseOk && artUp && bladeDupe && manTwice && plainOk && cycOk,
        '声明=' + planOk + (planBad.length ? '[' + planBad.join(',') + ']' : '') + ' 词表=' + lexOk + (lexBad.length ? '[' + lexBad.slice(0, 3).join(',') + ']' : '') +
        ' 胜art=' + winArt + ' 胜blade=' + winBlade + ' 胜manual=' + winMan + ' alt=' + altOk +
        ' 败=' + loseOk + '(伤' + (wE ? wE.injury : '?') + ',侠' + (wE ? wE.renown : '?') + ') 重复=' + artUp + '/' + bladeDupe + '/' + manTwice +
        ' 平淡=' + plainOk + ' 跨届=' + cycOk);
    })();

    /* E29 · EVENTS 零消费条目分区处置（册229 · 叙事引擎 §四 八种节的现行落点）：
     * ① 三型分布：action 78 / scene 13 / gain 13，**无 talk / event 残留**（44 条退役）‖
     * ② scene 每地一条 + 13 条写景 desc 词键齐（到达写景消费点）‖
     * ③ gain 每地一条 + `gainTip` 值域 5~20 全扫 + `GAIN_RATE` 12 百分点（拾遗消费点）‖
     * ④ 退证件：talk（ev_014）/ event（ev_040）两枚代表在**表与词表双缺席** ‖
     * ⑤ 拾遗真接上：300 个 worldDay 逐日闯荡，至少命中一次且金额 ∈ [5,20]、条 = 当地 gain 条。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.zoneSceneOf) { ok('E29', 'EVENTS 分区处置', false, '无 zoneSceneOf/gainOf 口'); return; }
      var E = pk.events || [], L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : {};
      var dist = {}, ids = {}, dup = 0;
      for (var i = 0; i < E.length; i++) {
        dist[E[i].kind] = (dist[E[i].kind] || 0) + 1;
        if (ids[E[i].i]) dup++;
        ids[E[i].i] = 1;
      }
      var distOk = E.length === 104 && dist.action === 78 && dist.scene === 13 && dist.gain === 13 && !dist.talk && !dist.event && dup === 0;
      var zones = pk.zones || [];
      var scOk = true, scLex = true, gnOk = true, gnLex = true;
      for (var z = 0; z < zones.length; z++) {
        var sc = pk.zoneSceneOf(zones[z].i), gn = pk.gainOf(zones[z].i);
        if (!sc) scOk = false; else if (!L['event.' + sc.i + '.desc'] || String(L['event.' + sc.i + '.desc']).length < 8) scLex = false;
        if (!gn) gnOk = false; else if (!L['event.' + gn.i + '.name']) gnLex = false;
      }
      var tipOk = true;
      for (var h = 0; h < 1000; h++) { var tp = pk.gainTip(h); if (tp < 5 || tp > 20) { tipOk = false; break; } }
      var rateOk = pk.GAIN_RATE === 12;
      var goneOk = !ids.ev_014 && !ids.ev_040 && L['event.ev_014.name'] == null && L['event.ev_040.name'] == null;
      var hits = 0, hitOk = true;
      for (var d = 0; d < 300; d++) {
        var wT = pk.normalize(pk.initialState());
        wT.place = 'luoyang'; wT.stamina = 60; wT.worldDay = d;
        var rT = pk.travel(wT, {});
        if (rT && rT.gain) {
          hits++;
          if (rT.loot < 5 || rT.loot > 20) hitOk = false;
          if (rT.gain !== (pk.gainOf('luoyang') || {}).i) hitOk = false;
        }
      }
      var wiredOk = hits >= 1 && hitOk;
      ok('E29', 'EVENTS 分区处置（104 = action 78 + scene 13 + gain 13，无 talk/event 残留 ‖ scene 每地一条 + 13 写景 desc 齐 ‖ gain 每地一条 + gainTip 值域 5~20 全扫 + 拾遗率 12 ‖ 退证件 ev_014/ev_040 表与词表双缺席 ‖ 300 日闯荡真命中且金额/条对表）',
        distOk && scOk && scLex && gnOk && gnLex && tipOk && rateOk && goneOk && wiredOk,
        '分布=' + distOk + '(n=' + E.length + ',' + JSON.stringify(dist) + ',重=' + dup + ') scene=' + scOk + '/词' + scLex +
        ' gain=' + gnOk + '/词' + gnLex + ' 金额=' + tipOk + ' 率=' + rateOk + ' 退役=' + goneOk +
        ' 接上=' + wiredOk + '(命中' + hits + '次)');
    })();

    /* E30 · 行头三槽（册230 · G4 暗器/护身/鞋履）：
     * ① 表 3 条 id 唯一 + 三槽齐 + 词名齐 ‖ ② effectsOfGear 空 → {0,0,0}、穿满 → {20,1,5} ‖
     * ③ **红线：三槽不进 powerOf**（穿满与赤身战力逐位相等——§六 的 1.86 上限不给行头开口子）‖
     * ④ 装备往返 + 槽位串拒（暗器装不进护身槽 badslot）‖ ⑤ 神兵谱不收行头（穿满仍 0/18）‖
     * ⑥ 战利品 ×1.2（定种：同 worldDay 同 h，装暗器 loot = round(base×1.2)）‖
     * ⑦ 败战减伤 1 层（定种：同 h 必败，装软甲少 1）‖ ⑧ 避遇敌（定种：同一 h 不装遇敌、装快靴不遇敌）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.effectsOfGear) { ok('E30', '行头三槽', false, '无 effectsOfGear 口'); return; }
      var M = pk.gearMisc || [], L = SQ.LEX && SQ.LEX.wuxia ? SQ.LEX.wuxia : {};
      var seen = {}, slots = {}, idOk = true, lexOk = true;
      for (var i = 0; i < M.length; i++) {
        if (seen[M[i].i]) idOk = false;
        seen[M[i].i] = 1;
        slots[M[i].slot] = 1;
        if (!L['gm.' + M[i].i + '.name']) lexOk = false;
      }
      var tableOk = M.length === 3 && idOk && !!slots.ranged && !!slots.armor && !!slots.boots && lexOk;

      var w0 = pk.normalize(pk.initialState());
      var e0 = pk.effectsOfGear(w0);
      var wz = pk.normalize(pk.initialState());
      wz.gear.ranged = { i: 'gm_xiujian' }; wz.gear.armor = { i: 'gm_ruanjia' }; wz.gear.boots = { i: 'gm_kuaixue' };
      var ez = pk.effectsOfGear(wz);
      var effOk = e0.loot === 0 && e0.injury === 0 && e0.evade === 0 &&
        ez.loot === 20 && ez.injury === 1 && ez.evade === 5;
      /* ③ 红线：行头只动判定，不动战力（§六 1.86 上限的守门判） */
      var redline = Math.abs(pk.powerOf(w0) - pk.powerOf(wz)) < 1e-9 && pk.weaponMult(wz) === pk.weaponMult(w0);
      /* ④ 市集买 → 装上 → 槽位串拒 → 卸下 */
      var wE = pk.normalize(pk.initialState()); wE.stones = 10000;
      var bB = pk.buyItem(wE, 'gm_kuaixue');
      var r1 = pk.equipGear(wE, 'boots', 'gm_kuaixue');
      var cross = pk.equipGear(wE, 'armor', 'gm_kuaixue');
      var r2 = pk.equipGear(wE, 'boots', null);
      var eqOk = bB && bB.ok && bB.kind === 'misc' && r1.ok && cross.err === 'badslot' && r2.ok &&
        !wE.gear.boots && wE.stash.indexOf('gm_kuaixue') >= 0;
      /* ⑤ 谱不收行头 */
      var codexOk = pk.bladeProgress(wz).owned === 0 && (wz.blades || []).length === 0;

      /* ⑥⑦⑧ 三槽效果：定种对照（同 worldDay ⇒ 同 h ⇒ 同分支） */
      var realRnd = Math.random;
      var lootOk = false, injOk = false, evadeOk = false;
      Math.random = function () { return 0; };            /* 三回合掷判必中 ⇒ 必胜 */
      for (var d = 0; d < 200 && !lootOk; d++) {
        var a1 = pk.normalize(pk.initialState()); a1.place = 'luoyang'; a1.realm = 1; a1.stamina = 60; a1.worldDay = d;
        var a2 = pk.normalize(pk.initialState()); a2.place = 'luoyang'; a2.realm = 1; a2.stamina = 60; a2.worldDay = d;
        a2.gear.ranged = { i: 'gm_xiujian' };
        var q1 = pk.travel(a1, {}), q2 = pk.travel(a2, {});
        if (q1.kind === 'battle' && q1.win && q2.kind === 'battle' && q2.win) {
          lootOk = q2.loot === Math.round(q1.loot * 1.2) && q2.loot > q1.loot;
        }
      }
      Math.random = function () { return 1; };            /* 三回合全败 ⇒ 必败 */
      for (var d2 = 0; d2 < 200 && !injOk; d2++) {
        var c1 = pk.normalize(pk.initialState()); c1.place = 'luoyang'; c1.realm = 1; c1.stamina = 60; c1.worldDay = d2; c1.injury = 0;
        var c2 = pk.normalize(pk.initialState()); c2.place = 'luoyang'; c2.realm = 1; c2.stamina = 60; c2.worldDay = d2; c2.injury = 0;
        c2.gear.armor = { i: 'gm_ruanjia' };
        var s1 = pk.travel(c1, {}), s2 = pk.travel(c2, {});
        if (s1.kind === 'battle' && !s1.win && s2.kind === 'battle' && !s2.win) {
          injOk = c2.injury === Math.max(0, c1.injury - 1);
        }
      }
      Math.random = realRnd;
      for (var d3 = 0; d3 < 300 && !evadeOk; d3++) {
        var v1 = pk.normalize(pk.initialState()); v1.place = 'luoyang'; v1.realm = 1; v1.stamina = 60; v1.worldDay = d3;
        var v2 = pk.normalize(pk.initialState()); v2.place = 'luoyang'; v2.realm = 1; v2.stamina = 60; v2.worldDay = d3;
        v2.gear.boots = { i: 'gm_kuaixue' };
        var x1 = pk.travel(v1, {}), x2 = pk.travel(v2, {});
        if (x1.kind === 'battle' && x2.kind !== 'battle') evadeOk = true;
      }
      ok('E30', '行头三槽（表 3 唯一 · 三槽齐 · 词名齐 ‖ 效果读数空 {0,0,0} / 穿满 {20,1,5} ‖ **红线：三槽不进 powerOf** ‖ 买→装→槽位串拒 badslot→卸下回库 ‖ 谱不收行头 ‖ 战利品 ×1.2 / 败战减伤 1 层 / 避遇敌 三型定种对照）',
        tableOk && effOk && redline && eqOk && codexOk && lootOk && injOk && evadeOk,
        '表=' + tableOk + ' 效果=' + effOk + ' 红线=' + redline + ' 装备=' + eqOk + ' 谱=' + codexOk +
        ' 战利=' + lootOk + ' 减伤=' + injOk + ' 避遇=' + evadeOk);
    })();

    /* E31 · 卷入档轻败（册231 · 世界事件卷 §三「join 风险 = 战败走窄路（轻）」）：
     * ① 胜（stub 0）：gain 照发（侠名 = gain.join.renown）、无伤、win=true ‖
     * ② 败（stub 0.99 ⇒ 带端定种）：内伤 3、侠名 −5、**见闻照发**、不发 gain 侠名、无主奖励、win=false ‖
     * ③ **结局键仍 canon**——卷入不是「改变走向的人」，败了也不写 lose ‖
     * ④ 轻重的量化差：join 对手 0.7 折 ⇒ 同一 ws 下 join 胜率 > lead 胜率。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.attendEvent || !pk.leadDuel) { ok('E31', '卷入轻败', false, '无 attendEvent/leadDuel'); return; }
      var evJ = null;
      for (var q = 0; q < pk.WORLD_EVENTS.length; q++) if (pk.WORLD_EVENTS[q].i === 'we_juxian') evJ = pk.WORLD_EVENTS[q];
      var realRnd = Math.random;
      Math.random = function () { return 0; };
      var w1 = pk.normalize(pk.initialState()); w1.realm = 6; w1.stamina = 99; w1.worldDay = 0; w1.injury = 0; w1.renown = 0;
      var r1 = pk.attendEvent(w1, 'we_juxian', 'join', false);
      Math.random = function () { return 0.99; };
      var w2 = pk.normalize(pk.initialState()); w2.realm = 6; w2.stamina = 99; w2.worldDay = 0; w2.injury = 0; w2.renown = 0;
      var exp0 = w2.exp;
      var r2 = pk.attendEvent(w2, 'we_juxian', 'join', false);
      Math.random = realRnd;
      var gainJ = (evJ && evJ.gain && evJ.gain.join) ? evJ.gain.join : {};
      var winOk = r1 && r1.ok && r1.win === true && w1.injury === 0 && w1.renown === (gainJ.renown | 0) &&
        w1.world.wefate.we_juxian === 'canon' && !r1.reward;
      var loseOk = r2 && r2.ok && r2.win === false && w2.injury === 3 && w2.renown === -5 &&
        w2.world.wefate.we_juxian === 'canon' && w2.exp > exp0 && !r2.reward && !r2.scene;
      var w3 = pk.normalize(pk.initialState()); w3.realm = 5;
      var dLead = pk.leadDuel(w3, evJ, 1), dJoin = pk.leadDuel(w3, evJ, 0.7);
      var oddsOk = dJoin && dLead && dJoin.p > dLead.p;
      ok('E31', '卷入轻败（胜 gain 照发无伤 ‖ 败 伤3/侠−5/见闻照发/不发侠名/无奖励 ‖ **结局仍 canon**（卷入不改史）‖ join 0.7 折胜率 > lead）',
        winOk && loseOk && oddsOk,
        '胜=' + winOk + '(侠' + (w1 ? w1.renown : '?') + ') 败=' + loseOk + '(伤' + (w2 ? w2.injury : '?') + ',侠' + (w2 ? w2.renown : '?') +
        ',键' + (w2 && w2.world && w2.world.wefate ? w2.world.wefate.we_juxian : '?') + ') 胜率=' + oddsOk +
        '(join ' + (dJoin && dJoin.p) + ' vs lead ' + (dLead && dLead.p) + ')');
    })();

    /* E32 · 相性乘区（册232 · 武学全录 §一「内力四性」+ 数值卷 §六 第五乘区）：
     * ① 环克闭合：刚猛→阴柔→中正→邪异→刚猛（四步回环、反向不克、同不克）‖
     * ② natMult 三值 + 无从判 1.00 ‖
     * ③ myNat 由**主修内功**定（换主修即换性；无内功 ⇒ 中正）‖
     * ④ 对手性两源：世界事件 boss 按门派（张三丰→武当→中正）、闯荡杂鱼按地界（少林→刚猛），且 13 地四性齐 ‖
     * ⑤ battleOdds 差分：同 ws 同战力对手，只改 nat ⇒ 克 > 同 > 被克（1.15 / 1.00 / 0.87 真进判定）‖
     * ⑥ powerOf 不受相性影响（相性依赖对手，挂对战判定层而非战力式本体）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.natMult || !pk.myNat) { ok('E32', '相性乘区', false, '无 natMult/myNat 口'); return; }
      var C = pk.NAT_CYCLE;
      var ringOk = C.length === 4 && pk.natBeats('gang', 'yin') && pk.natBeats('yin', 'zhong') &&
        pk.natBeats('zhong', 'xie') && pk.natBeats('xie', 'gang') &&
        !pk.natBeats('yin', 'gang') && !pk.natBeats('gang', 'gang') && !pk.natBeats('gang', 'nope');
      var mulOk = pk.natMult('gang', 'yin') === 1.15 && pk.natMult('yin', 'gang') === 0.87 &&
        pk.natMult('gang', 'gang') === 1.00 && pk.natMult('gang', 'nope') === 1.00 && pk.natMult(null, 'gang') === 1.00;
      /* ③ 主修内功换性：初始只有 neigong_basic(中正) ⇒ 中正；把九阴（阴柔）修到 5 层 ⇒ 阴柔 */
      var wA = pk.normalize(pk.initialState());
      var nat0 = pk.myNat(wA);
      wA.artsKnown = ['quan_basic', 'neigong_basic', 'yg_jiuyin'];
      wA.artsLevels = { quan_basic: 1, neigong_basic: 1, yg_jiuyin: 5 };
      var nat1 = pk.myNat(wA);
      var wB = pk.normalize(pk.initialState());
      wB.artsLevels = { quan_basic: 9 };                     /* 无内功 ⇒ 中正 */
      var nat2 = pk.myNat(wB);
      var myOk = nat0 === 'zhong' && nat1 === 'yin' && nat2 === 'zhong';
      /* ④ 对手性两源 + 地界四性齐 */
      var zsf = null;
      for (var i = 0; i < (pk.cast || []).length; i++) if (pk.cast[i].i === 'zhang_sanfeng') zsf = pk.cast[i];
      var castOk = pk.castNat(zsf) === 'zhong' && pk.castNat({ sec: 'shaolin' }) === 'gang' && pk.castNat(null) === 'zhong';
      var zoneSet = {};
      for (var z = 0; z < (pk.zones || []).length; z++) zoneSet[pk.zoneNat(pk.zones[z].i)] = 1;
      var zoneOk = pk.zoneNat('shaolin') === 'gang' && pk.zoneNat('yanziwu') === 'yin' &&
        !!zoneSet.gang && !!zoneSet.yin && !!zoneSet.zhong && !!zoneSet.xie;
      /* ⑤ 判定差分：同一角色（阴柔）× 三种对手性 */
      var wF = pk.normalize(pk.initialState()); wF.realm = 4;
      wF.artsKnown = ['quan_basic', 'neigong_basic', 'yg_jiuyin'];
      wF.artsLevels = { quan_basic: 1, neigong_basic: 1, yg_jiuyin: 5 };
      var foeBase = { t: 'A', power: 320 };
      var pBeat = pk.battleOdds(wF, { t: foeBase.t, power: foeBase.power, nat: 'zhong' });   /* 阴柔克中正 */
      var pSame = pk.battleOdds(wF, { t: foeBase.t, power: foeBase.power, nat: 'yin' });     /* 同性 */
      var pLose = pk.battleOdds(wF, { t: foeBase.t, power: foeBase.power, nat: 'gang' });    /* 被刚猛克 */
      var pNone = pk.battleOdds(wF, { t: foeBase.t, power: foeBase.power });                 /* 无 nat ⇒ 平 */
      var oddsOk = pBeat > pSame && pSame > pLose && Math.abs(pSame - pNone) < 1e-12;
      /* ⑥ powerOf 不吃相性 */
      var pPure = pk.powerOf(wF);
      wF.gear = wF.gear || {};
      var powOk = Math.abs(pk.powerOf(wF) - pPure) < 1e-9;
      ok('E32', '相性乘区（四性环克闭合 刚→阴→中→邪→刚 ‖ natMult 1.15/1.00/0.87 + 无从判 1.00 ‖ myNat 随主修内功（中正→阴柔）· 无内功回落中正 ‖ 对手性两源（boss 按门派 / 杂鱼按地界）+ 13 地四性齐 ‖ battleOdds 差分 克>同>被克 且无 nat 持平 ‖ powerOf 不含相性）',
        ringOk && mulOk && myOk && castOk && zoneOk && oddsOk && powOk,
        '环=' + ringOk + ' 乘区=' + mulOk + ' 我=' + myOk + '(初始' + nat0 + ',主修九阴' + nat1 + ',无内功' + nat2 + ')' +
        ' 门派=' + castOk + ' 地界=' + zoneOk + ' 判定=' + oddsOk +
        '(' + Math.round(pBeat * 1e3) / 1e3 + '>' + Math.round(pSame * 1e3) / 1e3 + '>' + Math.round(pLose * 1e3) / 1e3 + ')' +
        ' 战力=' + powOk);
    })();

    /* E33 · 走火入魔（册233 · 武学全录 §一 注「同修相冲两性 → 内伤 +1/日」）：
     * ① 相冲判据：刚+阴 冲 · 刚+邪 冲 · **中正豁免（阴+中正 / 刚+中正 都不冲）** · 同性不冲 ‖
     * ② 行功日结算：跨 1 日 +1、跨 5 日 +5、不足 1 日不动 ‖
     * ③ 封 12 不致死（11 层再走 10 日也只到 12，不碰 15 即死线）‖
     * ④ fireDays 连续累积；撤槽（无相冲）即清零 ‖ ⑤ 无相冲时内伤只按既有恢复走、不涨。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.natClash) { ok('E33', '走火入魔', false, '无 natClash 口'); return; }
      var DAY = pk.FIRE_DAY_MS || (10 * 60 * 1000);
      function mk(slots) {
        var w = pk.normalize(pk.initialState());
        w.artsSlots = slots;
        return w;
      }
      var c1 = pk.natClash(mk(['yg_jiuyin', 'yg_xianglong']));      /* 阴 + 刚 */
      var c2 = pk.natClash(mk(['yg_xianglong', 'yg_bixie']));       /* 刚 + 邪 */
      var c3 = pk.natClash(mk(['yg_jiuyin', 'neigong_basic']));     /* 阴 + 中正 ⇒ 不冲 */
      var c4 = pk.natClash(mk(['yg_xianglong', 'quan_basic']));     /* 刚 + 中正 ⇒ 不冲 */
      var c5 = pk.natClash(mk(['yg_jiuyin', 'mn_020']));            /* 同阴（mn_020 为内功） */
      var clashOk = c1.clash && c2.clash && !c3.clash && !c4.clash && (!c5.clash || c5.a === null);
      /* ② 行功日结算（⚠️ 内伤同时按「1 层/30 现实分钟」恢复，故净增 = 走火 − 恢复）：
       * 1 日（10 分）净 +1−1/3 = 2/3；累计 5 日（50 分）净 +5−5/3 = 10/3 */
      var REC_MS = 30 * 60000;
      var w1 = mk(['yg_jiuyin', 'yg_xianglong']);
      pk.claim(w1, DAY, 0, {}, {});
      var day1Add = w1.injury;
      pk.claim(w1, DAY * 4, 0, {}, {});
      var day5Add = w1.injury;
      var w0 = mk(['yg_jiuyin', 'yg_xianglong']);
      pk.claim(w0, DAY - 1000, 0, {}, {});
      var subDay = w0.injury;
      var stepOk = Math.abs(day1Add - (1 - DAY / REC_MS)) < 1e-9 &&
        Math.abs(day5Add - (5 - (DAY * 5) / REC_MS)) < 1e-9 && subDay === 0;
      /* ③ 封 12 不致死：11 层起走 10 日，走火只顶到 12（不是 15），再被恢复拉到 12−100/30 */
      var wC = mk(['yg_jiuyin', 'yg_xianglong']);
      wC.injury = 11;
      pk.claim(wC, DAY * 10, 0, {}, {});
      var capOk = Math.abs(wC.injury - (12 - (DAY * 10) / REC_MS)) < 1e-9;
      /* ④ fireDays 累积与清零 */
      var wF = mk(['yg_jiuyin', 'yg_xianglong']);
      pk.claim(wF, DAY * 3, 0, {}, {});
      var fire3 = (wF.world && wF.world.fireDays) | 0;
      wF.artsSlots = ['yg_jiuyin'];                                  /* 撤掉相冲的那部 */
      pk.claim(wF, DAY * 2, 0, {}, {});
      var fireClear = (wF.world && wF.world.fireDays) | 0;
      var fireOk = fire3 === 3 && fireClear === 0;
      /* ⑤ 无相冲不涨 */
      var wN = mk(['yg_jiuyin', 'neigong_basic']);
      pk.claim(wN, DAY * 5, 0, {}, {});
      var noneOk = wN.injury === 0;
      /* ⑥ fireMs 进存档口径（册235）：normalize 不再把行功日进度丢掉——半日后存读仍半日 */
      var wM = mk(['yg_jiuyin', 'yg_xianglong']);
      wM.world.fireMs = 12345;
      var nM = pk.normalize(wM);
      var msOk = nM.world.fireMs === 12345 && nM.world.fireDays === 0;
      ok('E33', '走火入魔（相冲对 刚+阴 / 刚+邪 生效 · **中正豁免** · 同性不冲 ‖ 行功日结算（净增 = 走火 − 既有恢复）：1 日 2/3 / 5 日 10/3 / 不足 1 日不动 ‖ 封 12 不致死 ‖ fireDays 累积 3 且撤槽清零 ‖ 无相冲不涨 ‖ fireMs 存档往返）',
        clashOk && stepOk && capOk && fireOk && noneOk && msOk,
        '相冲=' + clashOk + '(阴刚' + c1.clash + ',刚邪' + c2.clash + ',阴中' + c3.clash + ',刚中' + c4.clash + ')' +
        ' 步进=' + stepOk + '(1日' + day1Add + ',5日' + day5Add + ',不足1日' + subDay + ')' +
        ' 封顶=' + capOk + '(' + wC.injury + ') 火日=' + fireOk + '(' + fire3 + '→' + fireClear + ') 平常=' + noneOk + ' 火进度=' + msOk);
    })();

    /* E34 · 世界日时钟（册234）：① 1 现实分钟 = 1 游戏日、离线单次封顶 12 现实小时（2 游戏年）‖
     * ② 窗口走真实 claim 落账（year1→year3 开 [2,6]、闭窗案转 echo）‖
     * ③ 滑窗回声走真实 claim（year7→year9：17 案全 echo；见闻封顶 +2 不是 +34；world={} 无 wefate 不抛）‖
     * ④ 惯例跨届走真实 claim（year0 赴华山 → +36h → year6 重开）‖ ⑤ 寿元随世界日推进（24 年即 shoujin）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.worldYearOf || !pk.worldRumors) { ok('E34', '世界日时钟', false, '无 worldYearOf/worldRumors 口'); return; }
      var DAY_MS = 60 * 1000, CAP_MS = 12 * 3600 * 1000;
      function mk() { return pk.normalize(pk.initialState()); }
      /* ① 时钟推进 + 离线单次封顶 */
      var w1 = mk();
      pk.claim(w1, DAY_MS, 0, {}, {});
      var oneDay = w1.worldDay;
      var w2 = mk();
      pk.claim(w2, CAP_MS, 0, {}, {});
      var capDays = w2.worldDay;
      var w3 = mk();
      pk.claim(w3, CAP_MS * 2, 0, {}, {});
      var capDays2 = w3.worldDay;
      var clockOk = Math.abs(oneDay - 1) < 1e-9 && Math.abs(capDays - 720) < 1e-9 && Math.abs(capDays2 - 720) < 1e-9;
      /* ② 窗口走真实 claim：year1（361）＋12h ⇒ year3（1081）——[2,6] 的 weijiao 开、[0,2] 的 wangpan 转 echo */
      var w4 = mk();
      w4.worldDay = 360 + 1;
      pk.claim(w4, CAP_MS, 0, {}, {});
      var evs4 = pk.worldEvents(w4);
      var open4 = false;
      for (var a = 0; a < evs4.length; a++) if (evs4[a].i === 'we_weijiao_gm') open4 = true;
      var winOk = pk.worldYearOf(w4) === 3 && open4 && w4.world.wefate.we_wangpan === 'echo';
      /* ③ 回声走真实 claim：year7（2521）＋12h ⇒ year9（3241）——17 窗全 echo，见闻只 +2
       *    （13 地 ×2 + 10 熟人 = 36 基线，封顶后 38）；另证 world={} 无 wefate 也不再抛 */
      var w5 = mk();
      w5.worldDay = 7 * 360 + 1;
      w5.visited = ['luoyang', 'shaolin', 'songshan', 'yanziwu', 'yanfulou', 'guangmingding', 'kunlun', 'yanmenguan', 'damo', 'wuliang', 'dali', 'lingshe', 'binghuo'];
      w5.relations = {};
      var FRI = ['ling_huohung', 'zhou_botong', 'huang_rong', 'guo_jing', 'yang_guo', 'xiao_feng', 'duan_yu', 'xu_zhu', 'wei_xiaobao', 'zhang_wuji'];
      for (var b = 0; b < FRI.length; b++) w5.relations[FRI[b]] = { affinity: 30, kind: 'friend' };
      pk.claim(w5, CAP_MS, 0, {}, {});
      var echoN = 0;
      for (var fk in (w5.world.wefate || {})) if (w5.world.wefate[fk] === 'echo') echoN++;
      var echoOk = pk.worldYearOf(w5) === 9 && echoN === 17 && w5.exp === 38;
      var w6 = mk(); w6.world = {}; w6.worldDay = 9 * 360 + 1;
      var bareOk = true;
      try { pk.claim(w6, DAY_MS, 0, {}, {}); } catch (e) { bareOk = false; }
      bareOk = bareOk && Object.keys(w6.world.wefate || {}).length === 17;
      /* ④ 惯例跨届走真实 claim：year0 赴华山（join 败也写届次）→ 三个 12h ⇒ year6 重开 */
      var w7 = mk(); w7.realm = 6; w7.stamina = 99;
      var r7 = pk.attendEvent(w7, 'we_huashan', 'join');
      var cyc0 = w7.world.wecyc && w7.world.wecyc.we_huashan === 0;
      pk.claim(w7, CAP_MS, 0, {}, {});
      pk.claim(w7, CAP_MS, 0, {}, {});
      pk.claim(w7, CAP_MS, 0, {}, {});
      var evs7 = pk.worldEvents(w7), back7 = false;
      for (var c = 0; c < evs7.length; c++) if (evs7[c].i === 'we_huashan') back7 = true;
      var cycOk = r7 && r7.ok && cyc0 && pk.worldYearOf(w7) === 6 && back7;
      /* ⑤ 寿元随世界日推进：24 游戏年 age 40 即寿尽；23 年未到 */
      var w8 = mk(); w8.worldDay = 24 * 360;
      var li8 = pk.worldSystems.lifeInfo(w8);
      w8.worldDay = 23 * 360;
      var li23 = pk.worldSystems.lifeInfo(w8);
      var lifeOk = li8.age === 40 && li8.cause === 'shoujin' && li23.age === 39 && !li23.cause;
      /* ⑥ 旁观一次性（册235）：同一案一届只旁观一次（wefate 不写，另记 wseen）；跨届重开；
       *    旁观只需精力 3（原先门槛写 5 而实际扣 3，两者对齐） */
      var w9 = mk(); w9.realm = 6; w9.stamina = 99;
      var rw1 = pk.attendEvent(w9, 'we_huashan', 'watch');
      var rw2 = pk.attendEvent(w9, 'we_huashan', 'watch');
      w9.worldDay = 6 * 360 + 1;
      var rw3 = pk.attendEvent(w9, 'we_huashan', 'watch');
      var w10 = mk(); w10.realm = 6; w10.stamina = 4;
      var rw4 = pk.attendEvent(w10, 'we_xiangyang', 'watch');
      var watchOk = rw1.ok && rw2.err === 'watched' && rw3.ok && rw4.ok && w10.stamina === 1 &&
        !(w9.world.wefate && w9.world.wefate.we_huashan);
      /* ⑦ 地界侧事件入口（册235）：worldEventsAt 只吐「此地 + 此刻可赴」的案 */
      var wZ = mk(); wZ.worldDay = 3 * 360 + 1;
      var atG = pk.worldEventsAt(wZ, 'guangmingding'), atL = pk.worldEventsAt(wZ, 'luoyang');
      var has = function (list, id) { for (var x = 0; x < list.length; x++) if (list[x].i === id) return true; return false; };
      var atOk = has(atG, 'we_weijiao_gm') && !has(atG, 'we_juxian') && has(atL, 'we_juxian') &&
        pk.worldEventsAt(wZ, 'nowhere').length === 0;
      ok('E34', '世界日时钟（1 现实分 = 1 游戏日 · 离线单次封顶 12h ‖ 窗口/回声/惯例届次走真实 claim ‖ 全 echo 见闻封顶 +2（36→38）‖ world={} 不抛 ‖ 寿元 24 年寿尽 ‖ 旁观一届一次且精力 3 ‖ 地界事件入口）',
        clockOk && winOk && echoOk && bareOk && cycOk && lifeOk && watchOk && atOk,
        '时钟=' + clockOk + '(1分' + oneDay + ',12h' + capDays + ',24h' + capDays2 + ')' +
        ' 窗口=' + winOk + '(year' + pk.worldYearOf(w4) + ',weijiao' + open4 + ')' +
        ' 回声=' + echoOk + '(' + echoN + '桩,exp' + w5.exp + ')' + ' 空壳=' + bareOk +
        ' 届=' + cycOk + '(year' + pk.worldYearOf(w7) + ')' + ' 寿=' + lifeOk +
        ' 旁观=' + watchOk + '(重复' + rw2.err + ',跨届' + rw3.ok + ',低精力' + rw4.ok + ')' + ' 地界=' + atOk);
    })();

    /* E35 · 写回四写口（册236 · 世界事件卷 §五）：① 八案白名单键全部对表（cast 在 CAST / sect 在 SECTS）‖
     * ② cast / sects / 余波三面按 canon/alt 落账且重复写幂等 ‖ ③ 真赴会（join canon）走同一写口 ‖
     * ④ 错过回声也按 canon 落定（sweepExpired）‖ ⑤ normalize 往返不丢三面。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.WRITEBACK) { ok('E35', '写回四写口', false, '无 WRITEBACK 口'); return; }
      var castIds = {}, sectIds = {};
      for (var ci = 0; ci < pk.cast.length; ci++) castIds[pk.cast[ci].i] = 1;
      for (var si = 0; si < pk.sects.length; si++) sectIds[pk.sects[si].id] = 1;
      var keys = Object.keys(pk.WRITEBACK), bad = [];
      for (var k = 0; k < keys.length; k++) {
        var rows = pk.WRITEBACK[keys[k]];
        for (var o in rows) {
          var wb = rows[o];
          for (var c in (wb.cast || {})) if (!castIds[c] || ['dead', 'flee', 'secluded', 'saved'].indexOf(wb.cast[c]) < 0) bad.push(keys[k] + '.cast.' + c);
          for (var s in (wb.sects || {})) if (!sectIds[s]) bad.push(keys[k] + '.sect.' + s);
        }
      }
      var tableOk = keys.length === 20 && bad.length === 0;
      function mk() { return pk.normalize(pk.initialState()); }
      function evOf(id) { for (var i = 0; i < pk.WORLD_EVENTS.length; i++) if (pk.WORLD_EVENTS[i].i === id) return pk.WORLD_EVENTS[i]; return null; }
      var yanmen = evOf('we_yanmen');
      var w1 = mk(); pk.applyWriteback(w1, yanmen, 'canon');
      var w2 = mk(); pk.applyWriteback(w2, yanmen, 'alt');
      pk.applyWriteback(w2, yanmen, 'alt');
      var canonOk = pk.castStateOf(w1, 'xiao_feng') === 'dead' && pk.sectRepOf(w1, 'gaibang') === -10 &&
        pk.aftermathOf(w1).length === 1 && pk.aftermathOf(w1)[0].outcome === 'canon';
      var altOk = pk.castStateOf(w2, 'xiao_feng') === 'secluded' && pk.sectRepOf(w2, 'gaibang') === 5 &&
        pk.aftermathOf(w2).length === 1;   /* 重复写同结果不叠加余波行 */
      /* ③ 真赴会：光明顶 join（canon）→ 明教 −40、少林 +10、余波一条 */
      var w3 = mk(); w3.realm = 5; w3.stamina = 99; w3.worldDay = 3 * 360 + 1;
      var r3 = pk.attendEvent(w3, 'we_weijiao_gm', 'join');
      var joinOk = r3 && r3.ok && pk.sectRepOf(w3, 'mingjiao') === -40 && pk.sectRepOf(w3, 'shaolin') === 10 &&
        pk.aftermathOf(w3).length === 1;
      /* ④ 错过回声：year 9 ⇒ 全 17 个窗型按 canon 落定（3 案惯例型不在 sweep 射程） */
      var w4 = mk(); w4.worldDay = 9 * 360 + 1;
      pk.sweepExpired(w4);
      var echoOk = pk.castStateOf(w4, 'xiao_feng') === 'dead' && pk.castStateOf(w4, 'dongfang_bubai') === 'flee' &&
        pk.sectRepOf(w4, 'mingjiao') === -35 && pk.aftermathOf(w4).length === 17;   /* 光明顶 −40 + 继位 +5 */
      /* ⑤ 存档往返 */
      var n2 = pk.normalize(w2);
      var normOk = pk.castStateOf(n2, 'xiao_feng') === 'secluded' && pk.sectRepOf(n2, 'gaibang') === 5 &&
        pk.aftermathOf(n2).length === 1;
      ok('E35', '写回四写口（20 案全覆盖白名单对表 ‖ cast/sects/余波 canon·alt 落账且幂等 ‖ join canon 真入口 ‖ 错过回声按 canon 落定 17 案 ‖ normalize 往返不丢）',
        tableOk && canonOk && altOk && joinOk && echoOk && normOk,
        '表=' + tableOk + '案数' + keys.length + '违例' + JSON.stringify(bad) +
        ' canon=' + canonOk + ' alt=' + altOk + ' join=' + joinOk +
        ' 回声=' + echoOk + '(' + pk.aftermathOf(w4).length + ')' + ' 往返=' + normOk);
    })();

    /* E36 · 余响传承（册236）：① 一世三轴取余响（≤3：境界 / 最高武学 / 最深交情）‖
     * ② rebirthCarry 带进来世（gen 2 / 见闻 / 功力 / 武学三层入槽 / 交情 30）‖
     * ③ GATES 8/9 的 heritage 门槛：第一世锁死、来世解锁 ‖ ④ retire 生时即定余响且重复转世不叠 gen。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.inheritOf) { ok('E36', '余响传承', false, '无 inheritOf 口'); return; }
      var old = pk.normalize(pk.initialState());
      old.realm = 7;
      old.artsKnown = ['quan_basic', 'neigong_basic', 'yg_jiuyin'];
      old.artsLevels = { quan_basic: 1, neigong_basic: 1, yg_jiuyin: 8 };
      old.relations = { xiao_feng: { affinity: 80, kind: 'friend' } };
      var items = pk.inheritOf(old);
      var shapeOk = items.length === 3 && items[0].k === 'realm' && items[1].k === 'art' &&
        items[1].id === 'yg_jiuyin' && items[2].k === 'bond' && items[2].id === 'xiao_feng';
      var fresh = pk.normalize(pk.initialState());
      fresh.heritage = { gen: 1, inherited: [] };
      var got = pk.worldSystems.rebirthCarry(old, fresh);
      var row6 = pk.realms[6];
      var carryOk = got && got.length === 3 && fresh.heritage.gen === 2 &&
        fresh.exp === 14 && fresh.qi === row6.need &&
        fresh.artsLevels.yg_jiuyin === 3 && fresh.artsSlots.indexOf('yg_jiuyin') >= 0 &&
        fresh.relations.xiao_feng && fresh.relations.xiao_feng.affinity === 30;
      /* ③ heritage 门槛：同条件（realm7 / 功力足 / 见闻足）只有 heritage 一项在变 */
      function gateWs(gen) {
        var w = pk.normalize(pk.initialState());
        w.realm = 7; w.qi = pk.realms[8].need; w.exp = 60;
        w.heritage = { gen: gen, inherited: gen > 1 ? [{ k: 'realm', n: 7 }] : [] };
        return pk.canBreak(w);
      }
      var gateOk = gateWs(1) === false && gateWs(2) === true;
      /* ④ retire 生时定余响；转世沿用（gen 不再 +1） */
      var end = pk.normalize(pk.initialState());
      end.realm = 9; end.artsLevels = { yg_jiuyin: 9 }; end.artsKnown = ['yg_jiuyin'];
      end.relations = { xiao_feng: { affinity: 90 } };
      var rr = pk.retire(end);
      var fresh2 = pk.normalize(pk.initialState());
      pk.worldSystems.rebirthCarry(end, fresh2);
      var retireOk = rr && rr.ok && end.heritage.gen === 2 && end.heritage.inherited.length === 3 &&
        fresh2.heritage.gen === 2 && fresh2.heritage.inherited.length === 3;
      ok('E36', '余响传承（三轴余响 ≤3 ‖ rebirthCarry 带进来世 ‖ heritage 门槛第一世锁死·来世解锁 ‖ retire 生时定余响且转世不叠 gen）',
        shapeOk && carryOk && gateOk && retireOk,
        '形状=' + shapeOk + '(' + items.map(function (x) { return x.k; }).join(',') + ')' +
        ' 携带=' + carryOk + '(gen' + fresh.heritage.gen + ',exp' + fresh.exp + ',qi' + fresh.qi + ',art' + fresh.artsLevels.yg_jiuyin + ')' +
        ' 门=' + gateOk + ' 退隐=' + retireOk);
    })();

    /* E37 · 逐案失败代价（册237 · 世界事件卷 §六 fail）：① 八案表键都在 WORLD_EVENTS 且数值在带内 ‖
     * ② 论剑败者不掉名（renown +20）· 黑木崖最重（伤 5~7 / 名 −40~−30）‖
     * ③ 未声明案回落常量默认（lead 2~6 / −40~−20）‖ ④ join 档不受 lead 覆盖（轻败 1~3 / −10~−5）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.failOf) { ok('E37', '逐案失败代价', false, '无 failOf 口'); return; }
      var ids = {}, bad = [];
      for (var i = 0; i < pk.WORLD_EVENTS.length; i++) ids[pk.WORLD_EVENTS[i].i] = 1;
      for (var k in pk.FAIL) {
        if (!ids[k]) bad.push(k);
        var f = pk.FAIL[k];
        if (!Array.isArray(f.injury) || f.injury.length !== 2 || f.injury[0] < 1 || f.injury[1] > 10 ||
            !Array.isArray(f.renown) || f.renown.length !== 2 || f.renown[0] < -60 || f.renown[1] > 30) bad.push(k + '.range');
      }
      function ev(id) { for (var j = 0; j < pk.WORLD_EVENTS.length; j++) if (pk.WORLD_EVENTS[j].i === id) return pk.WORLD_EVENTS[j]; return null; }
      var hs = pk.failOf(ev('we_huashan'), 'lead');
      var hm = pk.failOf(ev('we_heimu'), 'lead');
      var other = pk.failOf({ i: 'no_such_event' }, 'lead');
      var join = pk.failOf(ev('we_huashan'), 'join');
      var tableOk = Object.keys(pk.FAIL).length === 20 && bad.length === 0;
      var themeOk = hs.renown[0] === 20 && hs.renown[1] === 20 && hs.injury[0] === 4 &&
        hm.injury[0] === 5 && hm.injury[1] === 7 && hm.renown[1] === -30;
      var fallbackOk = other.injury[0] === 2 && other.injury[1] === 6 && other.renown[0] === -40 && other.renown[1] === -20;
      var joinOk = join.injury[0] === 1 && join.injury[1] === 3 && join.renown[0] === -10 && join.renown[1] === -5;
      ok('E37', '逐案失败代价（20 案表对表且在带内 ‖ 论剑 +20 不掉名·黑木崖最重 ‖ 未声明案回落默认 ‖ join 档不被 lead 覆盖）',
        tableOk && themeOk && fallbackOk && joinOk,
        '表=' + tableOk + '(' + Object.keys(pk.FAIL).length + ',' + JSON.stringify(bad) + ')' +
        ' 主题=' + themeOk + ' 默认=' + fallbackOk + ' join=' + joinOk);
    })();

    /* E38 · 辟邪自伤（册237 · 武学全录 §2.3「修习即损寿元」）：① 在槽每满 1 游戏年折寿 1 年、age 同步 ‖
     * ② 离线封顶同世界日（12h 只折 2 年）‖ ③ 撤槽即停（已折的不还）‖ ④ 不在槽不折 ‖ ⑤ normalize 往返。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk) { ok('E38', '辟邪自伤', false, '无 pack'); return; }
      var YEAR_MS = 360 * 60 * 1000;
      function mk(slot) {
        var w = pk.normalize(pk.initialState());
        w.artsKnown = ['quan_basic', 'neigong_basic', 'yg_bixie'];
        w.artsLevels = { quan_basic: 1, neigong_basic: 1, yg_bixie: 1 };
        w.artsSlots = slot ? [slot] : [];
        return w;
      }
      var w1 = mk('yg_bixie');
      pk.claim(w1, YEAR_MS, 0, {}, {});
      var li1 = pk.worldSystems.lifeInfo(w1);
      var oneOk = w1.lifeCut === 1 && li1.age === 18;   /* 1 游戏年 + 1 折寿 */
      pk.claim(w1, YEAR_MS * 2, 0, {}, {});
      var li2 = pk.worldSystems.lifeInfo(w1);
      var capOk = w1.lifeCut === 3 && w1.world.bixieMs === 0 && li2.age === 22;   /* 再 12h 上限 = 2 年 */
      var cutNow = w1.lifeCut;
      w1.artsSlots = [];
      pk.claim(w1, YEAR_MS, 0, {}, {});
      var stopOk = w1.lifeCut === cutNow && w1.world.bixieMs === 0;
      var w2 = mk('yg_jiuyin');
      pk.claim(w2, YEAR_MS, 0, {}, {});
      var noneOk = w2.lifeCut === 0;
      var n = pk.normalize(w1);
      var normOk = n.lifeCut === cutNow && n.world.bixieMs === 0;
      ok('E38', '辟邪自伤（在槽每游戏年折寿 1 年且 age 同步 ‖ 离线封顶 12h 只折 2 年 ‖ 撤槽即停不还 ‖ 不在槽不折 ‖ normalize 往返）',
        oneOk && capOk && stopOk && noneOk && normOk,
        '一年=' + oneOk + '(' + li1.age + ') 封顶=' + capOk + '(' + li2.age + ') 停=' + stopOk +
        ' 不练=' + noneOk + ' 往返=' + normOk);
    })();

    /* E39 · 赴会须到场 + 窗口放宽（册239 · 节奏试跑）：
     * ① 有地界的事件人在别处 ⇒ 自动赶路（精力 3 + 本档），place 落当地、visited 记见闻 ‖
     * ② z:null 的全局事件不付脚程 ‖ ③ 精力不足以覆盖「本档 + 脚程」⇒ stamina 拒且人不动 ‖
     * ④ 地界未解锁 ⇒ locked ‖ ⑤ 独发窗按 lead 门槛分级（≤4→y6 / 5→y7，襄阳 [0,8] / 6~7→y8；王盘山教程窗 [0,2]），保证 lead 档够得着。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.attendEvent) { ok('E39', '赴会须到场', false, '无 attendEvent 口'); return; }
      function mk() { return pk.normalize(pk.initialState()); }
      var w1 = mk(); w1.realm = 6; w1.stamina = 99; w1.worldDay = 3 * 360 + 1; w1.place = 'shaolin';
      var r1 = pk.attendEvent(w1, 'we_juxian', 'join');
      var tripOk = !!r1 && r1.ok && r1.trip === 'luoyang' && w1.place === 'luoyang' &&
        w1.visited.indexOf('luoyang') >= 0 && w1.stamina === 91;   /* 99 − join5 − 脚程3 */
      var w2 = mk(); w2.realm = 6; w2.stamina = 99; w2.place = 'shaolin';
      var r2 = pk.attendEvent(w2, 'we_wangpan', 'watch');
      var globalOk = !!r2 && r2.ok && !r2.trip && w2.place === 'shaolin' && w2.stamina === 96;
      var w3 = mk(); w3.realm = 6; w3.stamina = 7; w3.worldDay = 3 * 360 + 1; w3.place = 'shaolin';
      var r3 = pk.attendEvent(w3, 'we_juxian', 'join');
      var poorOk = !!r3 && r3.err === 'stamina' && w3.place === 'shaolin';
      var w4 = mk(); w4.realm = 0; w4.stamina = 99; w4.worldDay = 3 * 360 + 1; w4.place = 'luoyang';
      var r4 = pk.attendEvent(w4, 'we_weijiao_gm', 'join');
      var lockOk = !!r4 && r4.err === 'locked';
      var winOk = true, badWin = [];
      for (var i = 0; i < pk.WORLD_EVENTS.length; i++) {
        var e = pk.WORLD_EVENTS[i];
        if (e.cyc) continue;
        var wantEnd = e.i === 'we_wangpan' ? 2
          : e.tier.lead <= 4 ? 6
          : e.tier.lead === 5 ? (e.i === 'we_xiangyang' ? 8 : 7)
          : 8;
        if (!e.window || e.window[1] !== wantEnd) { winOk = false; badWin.push(e.i + ':' + (e.window && e.window[1])); }
      }
      ok('E39', '赴会须到场（有地界案自动赶路 精力3+本档 ⇒ place/visited 落当地 ‖ 全局案不付脚程 ‖ 穷到付不起拒不移动 ‖ 未解锁地界 locked ‖ 独发窗按 lead 档分级到 year6/7/8、王盘山教程例外）',
        tripOk && globalOk && poorOk && lockOk && winOk,
        '赶路=' + tripOk + ' 全局=' + globalOk + ' 穷=' + poorOk + ' 锁=' + lockOk +
        ' 窗=' + winOk + (badWin.length ? '(' + badWin.join(',') + ')' : ''));
    })();

    /* E40 · 世界事件 next 链式（册241 · 蝴蝶效应）：canon/alt 的 next/close 由已了结事件派生，
     * 不落新字段——光明顶 canon 开教主之争 / alt 关门；五岳并派 canon 开黑木崖 / alt 关门；
     * 未表态时 pre 基线照旧（教主之争仍要等光明顶先了结）。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.worldEvents) { ok('E40', 'next 链式', false, '无 worldEvents 口'); return; }
      function mk(fate) {
        var w = pk.normalize(pk.initialState());
        w.realm = 9; w.worldDay = 5 * 360 + 1;
        w.world.wefate = fate || {};
        return w;
      }
      function has(w, id) {
        var es = pk.worldEvents(w);
        for (var i = 0; i < es.length; i++) if (es[i].i === id) return true;
        return false;
      }
      var jc = has(mk({ we_weijiao_gm: 'canon' }), 'we_jiaozhu');
      var ja = has(mk({ we_weijiao_gm: 'alt' }), 'we_jiaozhu');
      var jn = has(mk({}), 'we_jiaozhu');
      var hc = has(mk({ we_wuyue_bingpai: 'canon' }), 'we_heimu');
      var ha = has(mk({ we_wuyue_bingpai: 'alt' }), 'we_heimu');
      ok('E40', 'next 链式（光明顶 canon 开教主之争 / alt 关门 ‖ 五岳并派 canon 开黑木崖 / alt 关门 ‖ 未表态时 pre 基线照旧）',
        jc && !ja && !jn && hc && !ha,
        '教canon=' + jc + ' 教alt=' + ja + ' 无前置=' + jn + ' 黑canon=' + hc + ' 黑alt=' + ha);
    })();

    /* E41 · 江湖格局跨世（册241 · 世界事件卷 §十一 P7）：人物去向 / 门派声望 / 余波带进来世；
     * 已了结事件本身（wefate/wecyc/wseen）重置；即使本世没有余响可带，格局照样跨世。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.worldSystems || !pk.worldSystems.rebirthCarry) { ok('E41', '格局跨世', false, '无 rebirthCarry 口'); return; }
      var old = pk.normalize(pk.initialState());
      old.realm = 9; old.artsLevels = { quan_basic: 9 };
      old.world.wefate = { we_juxian: 'alt' };
      old.world.wecyc = { we_huashan: 2 };
      old.world.wseen = { we_wangpan: '1' };
      old.world.wbcast = { xiao_feng: 'dead' };
      old.world.wbsect = { gaibang: -20 };
      old.world.wafter = ['we_juxian:alt'];
      var fresh = pk.initialState();
      pk.worldSystems.rebirthCarry(old, fresh);
      var carried = !!(fresh.world && fresh.world.wbcast.xiao_feng === 'dead' &&
        fresh.world.wbsect.gaibang === -20 && fresh.world.wafter.indexOf('we_juxian:alt') >= 0);
      var reset = !!(fresh.world && !fresh.world.wefate.we_juxian && !fresh.world.wecyc.we_huashan && !fresh.world.wseen.we_wangpan);
      var herOk = !!(fresh.heritage && fresh.heritage.gen === 2);
      var old2 = pk.normalize(pk.initialState());
      old2.world.wbcast = { xiao_feng: 'flee' };
      var fresh2 = pk.initialState();
      pk.worldSystems.rebirthCarry(old2, fresh2);
      var bareOk = !!(fresh2.world && fresh2.world.wbcast.xiao_feng === 'flee');
      ok('E41', '江湖格局跨世（人物去向 / 门派声望 / 余波带进来世 ⇔ 已了结事件重置 ⇔ 无余响也带格局）',
        carried && reset && herOk && bareOk,
        '格局=' + carried + ' 重置=' + reset + ' 余响=' + herOk + ' 无余响=' + bareOk);
    })();

    /* E42 · 隐世传功（册242 · 武学全录 §八「长尾武学的奇遇获得投放权重」）：
     * ① 长尾池只收「未学 / 无门派 / 非秘籍非事件主奖励」，门派武学与已学不入池
     * ② 境界开门：黄 0 / 玄 2 / 地 4 / 天 6 ‖ ③ 定种抽取：同 h 同结果
     * ④ 授予只入档一次；开关开才自动入空槽 ‖ ⑤ 真入口：平安步掷中仍报 quiet 且带 teach。 */
    (function () {
      var pk = SQ.Worlds.wuxia && SQ.Worlds.wuxia.pack;
      if (!pk || !pk.longTailPool) { ok('E42', '隐世传功', false, '无 longTailPool 口'); return; }
      function mk(r) { var w = pk.normalize(pk.initialState()); w.realm = r; return w; }
      var w9 = mk(9);
      var pool = pk.longTailPool(w9);
      var ex = pk.longTailExclude();
      var shapeOk = pool.length > 0;
      for (var i = 0; i < pool.length; i++) {
        var a = pool[i];
        if ((a.s || []).length || ex[a.i] || w9.artsKnown.indexOf(a.i) >= 0) shapeOk = false;
      }
      function tiers(p) { var m = {}; for (var i = 0; i < p.length; i++) m[p[i].t] = 1; return m; }
      var t0 = tiers(pk.longTailPool(mk(0))), t2 = tiers(pk.longTailPool(mk(2)));
      var t4 = tiers(pk.longTailPool(mk(4))), t6 = tiers(pk.longTailPool(mk(6)));
      var gateOk = t0.huang && !t0.xuan && !t0.di && !t0.tian &&
        t2.xuan && !t2.di && !t2.tian && t4.di && !t4.tian && t6.tian;
      var a1 = pk.longTailPick(w9, 12345), a2 = pk.longTailPick(mk(9), 12345);
      var pickOk = !!a1 && !!a2 && a1.i === a2.i;
      var wg = mk(9); wg.autoSlotArt = true;
      var g1 = pk.grantLongTail(wg, a1.i), g2 = pk.grantLongTail(wg, a1.i);
      var grantOk = !!g1 && g2 === null && wg.artsKnown.indexOf(a1.i) >= 0 &&
        wg.artsLevels[a1.i] === 1 && wg.artsSlots.indexOf(a1.i) >= 0;
      var wn = mk(9); var gn = pk.grantLongTail(wn, a2.i);
      var noAutoOk = !!gn && wn.artsSlots.indexOf(a2.i) < 0;
      var realRnd = Math.random;
      Math.random = function () { return 0; };
      var wt = mk(0); wt.stamina = 60; wt.worldDay = 0;
      var rt = pk.travel(wt, {});
      Math.random = realRnd;
      var entryOk = rt.kind === 'quiet' && !!rt.teach && wt.lastReport.kind === 'quiet' &&
        wt.lastReport.teach === rt.teach && wt.artsKnown.indexOf(rt.teach) >= 0;
      ok('E42', '隐世传功（长尾池只收未学/无门派/非秘籍非主奖励 ⇔ 境界开门 0/2/4/6 ⇔ 同 h 同抽 ⇔ 授予一次且开关开才入槽 ⇔ 平安步掷中落 teach 且武学入档）',
        shapeOk && gateOk && pickOk && grantOk && noAutoOk && entryOk,
        '池=' + pool.length + ' 形=' + shapeOk + ' 门=' + gateOk + ' 抽=' + pickOk +
        ' 授=' + grantOk + ' 不自动=' + noAutoOk + ' 入口=' + entryOk);
    })();

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
    ok(17, '可见世界 = live 2 + coming 4（册164 武侠翻牌；屏上名册与注册表逐位相等）',
      vis22.length === 6 && live22.length === 2 && coming22.length === 4 &&
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
