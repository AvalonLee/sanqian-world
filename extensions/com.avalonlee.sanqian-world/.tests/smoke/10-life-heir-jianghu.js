/* .tests/smoke/10-life-heir-jianghu.js — 冒烟断言 21 条（首 #299 ‖ 末 #77）
 * 由 smoke.js 的 run() 体逐字切出（原第 9644~10933 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：299 300 301 302 303 304 305 306 307 308 312 313 314 315 316 317 318 319 320 72 77
*/
window.SQSmoke.frag('10-life-heir-jianghu', async function () {
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
    /* 第册批勘正：原 (g)「同型面：烧表奏疏同口径带日期、不破 BIO_MEMO_LEN」整条删除——
     * 那条判据立的是 `Codex.bioMemo` 这个**第二读点**，随「烧表请天道作传」下线后「是日」族模板
     * 在传记这一侧只剩 generateBio 一个读者，同型面判据自动失去对象（下线取证归 #315，别在这儿补）。 */
    ok('299', '前世书写得出游戏时间 + 历法算式收成单源（第廿八批 · 用户报「轮回页面的前世书，文本描述有问题，写着是日但是没有写具体游戏时间」）：(a) 历法逐值对表（入世当日 / 第 359 日 / 第 360 日翻年 / ts 早于入世钳零） (b) 世界名去尾字 + createdAt 缺失返空串，不写假日期 (c) 传记时间轴每条大事与终行各带**那天**的日期，「是日」族模板一字未动 (d) 旧档无 createdAt ⇒ 原样不补、零花括号 (e) BIO_MAX 硬截不破且尾行「计：」不被挤掉 (f) core 导出 gameDateOf / gameDateStr 成唯一实现〔第册批勘正：原 (g) 烧表奏疏同型面随该通道下线删除〕',
      cal299 && strOk299 && bioOk299 && oldOk299 && maxOk299 && src299,
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
    /* (a0) 创角生年落 LIFE_SEED 闭区间（stub 随机两端各验一次，两端不同值 = 真在掷） */
    var rst302 = stubRandom(function () { return 0; });
    var seedLo302 = pack302.initialState().lifeUsed;
    rst302();
    var rst302b = stubRandom(function () { return 0.999999; });
    var seedHi302 = pack302.initialState().lifeUsed;
    rst302b();
    /* (a) 流逝 = 与修为同一条时钟：360 秒已结算时长恰老 1 游戏年。离线一整日**只老 30 分钟那一份**
     *     （LIFE_OFFLINE_MIN ⇒ 5 年，不是旧口径的 120 年），而修为仍按 OFFLINE_CAP_H 结满 ⇒
     *     两条读数之差就是「经济不砍、衰老另封顶」这条裁定的直证（lifeUsed 起点抹平生年随机）。 */
    var w302a = pack302.normalize(pack302.initialState()); w302a.lifeUsed = 0;
    pack302.claim(w302a, 360000, Date.now(), prof302, { autoTrib: false });
    var w302b = pack302.normalize(pack302.initialState()); w302b.lifeUsed = 0;
    pack302.claim(w302b, 24 * 3600000, Date.now(), prof302, { autoTrib: false });
    var lifeCapOffline = D302.LIFE_OFFLINE_MIN / 60 * 10;
    /* (b) 上界 = 凡人寿元 + LIFE_STEP **前缀和**（第卌八批：晋升不从 0 重算，只把界抬高）；
     *     阶梯逐档与解析式闭关年对表 ⇒ 改了 REALMS.need / baseQi / 闭关乘区而未同批改寿元表即红。
     *     shortcut: 下界用「无重试解析式」而非 300 局实测中位（跑不起），带宽 [1.3×, 3×]；
     *               表值出处 = sq-wip-life38d 定标件（300 局 · 真实渡劫骰 · 逐境中位 0.83~2582 年）。 */
    var w302c = pack302.normalize(pack302.initialState()); w302c.lifeUsed = 0;
    var li0302 = sys302.lifeInfo(w302c);
    w302c.realm = 5;
    var li5302 = sys302.lifeInfo(w302c);
    w302c.realm = D302.REALMS.length - 1; w302c.lifeUsed = 1e9;
    var liTop302 = sys302.lifeInfo(w302c);
    var stepBad302 = [];
    for (var r302 = 0; r302 < D302.LIFE_STEP.length; r302++) {
      var ramp302 = r302 <= (D302.NEWBIE_RAMP.realms != null ? D302.NEWBIE_RAMP.realms : 0) ? D302.NEWBIE_RAMP.qiMult : 1;
      var a302 = D302.REALMS[r302 + 1].need / (D302.REALMS[r302].baseQi * 360 * D302.MODES.seclude.qiMult * ramp302);
      if (!(D302.LIFE_STEP[r302] >= 1.3 * a302 && D302.LIFE_STEP[r302] <= 3 * a302)) {
        stepBad302.push(r302 + '(' + D302.LIFE_STEP[r302] + '/' + a302.toFixed(2) + ')');
      }
    }
    /* (c) 预警阈 / 判死 / **lifeBonus 参与上界**（同一境界，+40 年就该把这一判撤回活） */
    var cap0302 = sys302.lifeCapOf(0);
    var w302d = pack302.normalize(pack302.initialState()); w302d.lifeUsed = 0; w302d.lifeBonus = 0;
    w302d.lifeUsed = cap0302 * (1 - D302.LIFE_WARN_P);
    var near302 = sys302.lifeInfo(w302d);
    w302d.lifeUsed = cap0302;
    var dead302 = sys302.lifeInfo(w302d);
    w302d.lifeBonus = 40;
    var saved302 = sys302.lifeInfo(w302d);
    /* (d) 旧档零迁移 + 脏值收口：缺字段补 0/0/null，负数归零，道伤越界钳 cap，lastDeath 非结构归 null；
     *     越界老档走**一次性**保底（复 normalize 不再抬，否则每次读档送 60 年 = 永生假保底） */
    var n302 = SQ.normalize({ v: 1, profile: { name: '旧档' }, worlds: { xiuxian: { qi: 5 } } });
    var n302b = SQ.normalize({ v: 1, profile: { name: '脏' },
      worlds: { xiuxian: { lifeUsed: -5, daoShang: 9e9, lastDeath: '坏值' } } });
    var n302again = SQ.normalize(n302);
    var oldOver302 = SQ.normalize({ v: 1, profile: { name: '老档越界' },
      worlds: { xiuxian: { realm: 4, lifeUsed: 3000 } } });
    var oldOverAgain302 = SQ.normalize(oldOver302);
    ok('302', '寿元流逝与累加上界（§6.1A · 第卌八批改口）：(a0) 创角生年落 LIFE_SEED=[' + D302.LIFE_SEED.join(',') + ']（stub 两端不同值）' +
      '(a) 在线 360 秒 = 老 1 游戏年；离线 24h **只老 ' + lifeCapOffline + ' 年**（LIFE_OFFLINE_MIN）而修为仍按 OFFLINE_CAP_H=' + D302.OFFLINE_CAP_H + 'h 结满 ⇒ 衰老与经济两把尺子各归各' +
      '(b) 上界 = 凡寿 ' + D302.LIFE_MORTAL + ' + LIFE_STEP 前缀和（逐境对表 realm5 = ' + sys302.lifeCapOf(5) + '），阶梯每档 ∈ [1.3×, 3×] 解析闭关年（动了 need/产出而未改表即红）；真仙 = 无尽（剩余 Infinity、吃满不判死、lifeHit 返 0 不扣）' +
      '(c) 剩余 ≤ 上界×LIFE_WARN_P 即 near（含等号）、耗尽 cause=shoujin，**lifeBonus 抬上界即撤回这一判**' +
      '(d) 旧档缺字段补 0/0/null + 负数归零 + 道伤钳 cap + lastDeath 非结构归 null + 幂等 + 越界老档一次性保底（复 normalize 值不变，不送永生）',
      w302a.lifeUsed === 1 && w302b.lifeUsed === lifeCapOffline && w302b.qi > w302a.qi &&
      seedLo302 >= D302.LIFE_SEED[0] && seedHi302 <= D302.LIFE_SEED[1] && seedLo302 !== seedHi302 &&
      li0302.max === cap0302 && li0302.cause === null && li0302.near === false &&
      li5302.max === sys302.lifeCapOf(5) &&
      li5302.max === D302.LIFE_MORTAL + D302.LIFE_STEP.slice(0, 6).reduce(function (a, x) { return a + x; }, 0) &&
      stepBad302.length === 0 &&
      liTop302.eternal === true && liTop302.left === Infinity && liTop302.cause === null &&
      sys302.lifeHit({ realm: D302.REALMS.length - 1, lifeUsed: 0 }, 'trib') === 0 &&
      near302.near === true && near302.cause === null &&
      dead302.cause === 'shoujin' && dead302.left <= 0 &&
      saved302.cause === null && saved302.left === 40 &&
      n302.worlds.xiuxian.lifeUsed === 0 && n302.worlds.xiuxian.daoShang === 0 && n302.worlds.xiuxian.lastDeath === null &&
      n302b.worlds.xiuxian.lifeUsed === 0 && n302b.worlds.xiuxian.daoShang === D302.DAO_SHANG.cap &&
      n302b.worlds.xiuxian.lastDeath === null &&
      n302again.worlds.xiuxian.lifeUsed === 0 && n302again.worlds.xiuxian.daoShang === 0 &&
      oldOver302.worlds.xiuxian.lifeBonus === 3000 - sys302.lifeCapOf(4) + D302.LIFE_GRACE &&
      sys302.lifeInfo(oldOver302.worlds.xiuxian).cause === null &&
      oldOverAgain302.worlds.xiuxian.lifeBonus === oldOver302.worlds.xiuxian.lifeBonus,
      '在线=' + w302a.lifeUsed + ' 离线=' + w302b.lifeUsed + '/' + lifeCapOffline + ' 离线修为=' + Math.round(w302b.qi) +
      ' ‖ 生年=' + seedLo302 + '~' + seedHi302 +
      ' ‖ 界=' + D302.LIFE_STEP.join('+') + '+' + D302.LIFE_MORTAL + ' 违例=' + (stepBad302.join(',') || '无') +
      ' ‖ 真仙=' + liTop302.left + '/' + String(liTop302.cause) +
      ' ‖ 阈上 near=' + near302.near + ' 耗尽 cause=' + dead302.cause + ' 补 40 年=' + String(saved302.cause) + '/' + saved302.left +
      ' ‖ 旧档=' + [n302.worlds.xiuxian.lifeUsed, n302.worlds.xiuxian.daoShang, String(n302.worlds.xiuxian.lastDeath)].join(',') +
      ' 脏档=' + [n302b.worlds.xiuxian.lifeUsed, n302b.worlds.xiuxian.daoShang, String(n302b.worlds.xiuxian.lastDeath)].join(',') +
      ' 越界档 bonus=' + oldOver302.worlds.xiuxian.lifeBonus + '/' + oldOverAgain302.worlds.xiuxian.lifeBonus);

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
    var d304a = await deathSeed304('shoujin', { lifeUsed: sys302.lifeCapOf(4) });              /* 寿尽 */
    var d304b = await deathSeed304('daoshang', { daoShang: DS303.cap });                        /* 道伤崩碎 */
    /* 折寿而殒（第卌八批第三条死因）：used 还没到大限、是被 lifeBonus 的负账打穿的 ⇒ cause 必须
     * 报 zhesou 而不是 shoujin（「熬到大限」与「被人打折了命数」是两件事，混报就是说谎）。 */
    var d304d = await deathSeed304('zhesou', { lifeUsed: sys302.lifeCapOf(4) - 20, lifeBonus: -60 });
    var log304a = (d304a.w.log || []).map(function (l) { return l.text; }).join('|');
    var log304d = (d304d.w.log || []).map(function (l) { return l.text; }).join('|');
    var line304 = function (ch) {
      return SQ.t('legacy.log.rebirth', { life: 1, ch: SQ.t(ch, null, 'xiuxian') }, 'xiuxian');
    };
    ok('304', '寿尽 / 道伤 / **折寿**即强制转世（§6.1A 落点）：(a) 三条死因都走通——新世重置（realm 0 / ' +
      'lifeUsed 重掷生年 / 档案名空 ⇒ 界面进创角）+ lastDeath 呈报位带死因与享年' +
      ' (b) 遗泽折分逐分等于 preview 产物且与兵解口径同值（' + d304a.exp + '，零新增系数）' +
      ' (c) 被动了结计 stats.deaths 而**不**计 dissolutions、**不**发 achv_bingjie（舍身证道 = 主动兵解的荣誉）' +
      ' (d) 传记与转世日志各说各的死因：寿尽行「' + bioLineShou304 + '」在、兵解行「' + bioLineBing304 + '」不在' +
      ' (e) 第卌八批新死因 zhesou：未到本境大限而被负账打穿 ⇒ cause/享年/传记行三线一致，不复用「寿尽」那句话',
      d304a.w.realm === 0 && d304a.w.lifeUsed >= D302.LIFE_SEED[0] && d304a.w.lifeUsed <= D302.LIFE_SEED[1] &&
      d304a.w.lifeBonus === 0 && d304a.w.daoShang === 0 &&
      d304a.ref.profile.name === '' && d304a.w.lastDeath && d304a.w.lastDeath.cause === 'shoujin' &&
      d304a.w.lastDeath.realm === 4 && d304a.w.lastDeath.age >= Math.floor(sys302.lifeCapOf(4)) &&
      d304b.w.lastDeath && d304b.w.lastDeath.cause === 'daoshang' &&
      d304d.w.lastDeath && d304d.w.lastDeath.cause === 'zhesou' &&
      ((d304d.ref.meta.biographies[0] || {}).text || '').indexOf(SQ.t('codex.bio.line.zhesou', null, 'xiuxian')) >= 0 &&
      d304a.exp > 0 && d304a.exp === d304a.expBing && d304a.w.lastDeath.total === d304a.exp &&
      d304a.ref.meta.karma === d304a.exp &&
      d304a.st.deaths === 1 && d304a.st.dissolutions === 0 && d304a.st.lives === 1 &&
      d304b.st.deaths === 1 && d304b.st.dissolutions === 0 &&
      d304d.st.deaths === 1 && d304d.st.dissolutions === 0 &&
      (d304a.ref.meta.achv || []).indexOf('achv_bingjie') < 0 &&
      ((d304a.ref.meta.biographies[0] || {}).text || '').indexOf(bioLineShou304) >= 0 &&
      ((d304a.ref.meta.biographies[0] || {}).text || '').indexOf(bioLineBing304) < 0 &&
      log304a.indexOf(line304('legacy.ui.shoujin')) >= 0 &&
      log304a.indexOf(line304('legacy.ui.bingjie')) < 0 &&
      log304d.indexOf(line304('legacy.ui.zhesou')) >= 0,
      '寿尽=' + JSON.stringify(d304a.w.lastDeath) + ' 道伤=' + JSON.stringify(d304b.w.lastDeath) +
      ' 折寿=' + JSON.stringify(d304d.w.lastDeath) +
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
    /* 🔧 N43：原走 daily 分支（第 5 颗被拒 + 写那条日志），日限退役后这条支路改走 **once** 分支——
     * 本判据真正要守的形状是「alDrink 的失败出口走真入口不抛、整笔不落盘、拒服不吞丹」（第卅九批那个
     * `D()` 误抄 bug 的同类），换一个 reason 重判，而不是删掉了事。*/
    await SQ.mutate(ref305, function (s) {   /* 同一条真通道先服一颗特例丹，把「本境界已服过」这个态坐实 */
      var w = s.worlds[s.profile.worldId], p = SQ.Worlds[s.profile.worldId].pack;
      w.alchemy.pills.ap_pozhang = 3;
      SQ.Alchemy.drinkPill(w, p, p.data, 'ap_pozhang', Date.now(), null, s.profile);
    });
    var nStock305 = ref305.worlds.xiuxian.alchemy.pills.ap_pozhang;
    var bc305 = ref305.worlds.xiuxian.breakCostNext;   /* 首服已写入 ⇒ 取拒服前的现值做守恒对照 */
    var r305 = await SQ.Actions.alDrink(ref305, 'ap_pozhang');
    var sysLog305 = (ref305.worlds.xiuxian.log || []).filter(function (l) { return l.cat === 'sys'; });
    var txt305 = String((sysLog305[sysLog305.length - 1] || {}).text || '');
    ok('305', 'alDrink 失败出口走真入口：不抛 + 整笔不落盘 + **拒服不吞丹**（🔧 N43 起改走 once 支路；原 daily 支路随日限退役，它守的形状另由 #209 / #226 的「同字段同向不叠加」接住）',
      nStock305 === 2 && r305 && r305.ok === false && r305.reason === 'once' &&
      ref305.worlds.xiuxian.alchemy.pills.ap_pozhang === 2 &&
      ref305.worlds.xiuxian.breakCostNext === bc305 &&
      sysLog305.length === 0 && ref305.profile.name === '试丹者',
      '库存=' + nStock305 + '→拒后=' + ref305.worlds.xiuxian.alchemy.pills.ap_pozhang +
      ' ‖ reason=' + (r305 || {}).reason + ' ‖ sys 日志条数=' + sysLog305.length);

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

    /* #307 法宝认主计时通道（第卌三批立 · 🔧 **N52 第册十二批 = 按件改口**）：旧形状是计时与渡劫
     * **共吃 `ws.treasures` 顶层一枚全局 bondCount**，现行 = 每件各吃自己的 `owned[].st.bondN`（计数）
     * 与 `st.bondH`（计时余数），顶层那两枚读档即剪、**不摊派**。判据跟着改口，旧判据覆盖的支路
     * 搬到新位置重判：原 (d)「共吃一枚」⇒ 现 (d)「一件顶阶停表、另一件照走」（全局形状做不到这条），
     * 原 (e)「全数满阶停表」⇒ 现 (e)「顶阶件连渡劫计数也不涨」。 */
    var BOND307 = SQ.XTREASURES;
    var mkBond307 = function () {
      var w = mkWs({ realm: 2 });
      w.treasures = { owned: [{ id: 'x02', stage: 1, st: {} }, { id: 'x04', stage: 1, st: {} }],
        slots: ['x02', 'x04', null], fate: { trib: 0, check: 0, drop: 0, event: 0 },
        bondCount: 7, bondHours: 5 };      /* 旧档形状：顶层那两枚全局数，本批起引擎不再读 */
      return w;
    };
    var bn307 = function (e) { return (e.st && e.st.bondN) || 0; };
    var w307 = mkBond307();
    var e307 = w307.treasures.owned[0], e307b = w307.treasures.owned[1];
    var lg307 = [];
    var log307 = function (c, txt) { lg307.push(txt); };
    SQ.Treasures.bondTime(w307, pack, D, BOND307.BOND_HOURS - 0.1, log307);
    var under307 = bn307(e307) === 0 && bn307(e307b) === 0 && e307.stage === 1 && e307b.stage === 1 &&
      Math.abs(e307.st.bondH - (BOND307.BOND_HOURS - 0.1)) < 1e-9 && lg307.length === 0;
    SQ.Treasures.bondTime(w307, pack, D, 0.2, log307);                       /* 两份各满 8h ⇒ 每件各 +1 计数，未到 BOND_COST */
    var odd307 = bn307(e307) === 1 && bn307(e307b) === 1 && e307.stage === 1 && e307b.stage === 1 && lg307.length === 0;
    SQ.Treasures.bondTime(w307, pack, D, BOND307.BOND_HOURS, log307);         /* 再满一份 → 每件计数 2 = BOND_COST → 各进一阶 */
    var stage307 = e307.stage === 2 && e307b.stage === 2 && lg307.length === 2 &&
      lg307[0] === SQ.t('treasure.bond.done', { name: SQ.t('treasure.x02.name', null, 'xiuxian'), n: 2 }, 'xiuxian') &&
      lg307[1] === SQ.t('treasure.bond.done', { name: SQ.t('treasure.x04.name', null, 'xiuxian'), n: 2 }, 'xiuxian');
    e307.stage = BOND307.byId.x02.MAX_STAGE || 3;                            /* 把 x02 摆到顶阶：按件的独立性只能在这种形状下看得见 */
    var bnBefore307 = bn307(e307), lgBefore307 = lg307.length;
    SQ.Treasures.bondTime(w307, pack, D, BOND307.BOND_HOURS * 2, log307);
    var perItem307 = bn307(e307) === bnBefore307 && e307.stage === (BOND307.byId.x02.MAX_STAGE || 3) &&
      bn307(e307b) === 4 && e307b.stage === (BOND307.byId.x04.MAX_STAGE || 3) && lg307.length === lgBefore307 + 1;
    var bc307 = bn307(e307), bh307 = e307.st.bondH;
    SQ.Treasures.bondTick(w307, pack, D, log307);                            /* 两件都顶阶 ⇒ 连渡劫计数也不涨 */
    SQ.Treasures.bondTime(w307, pack, D, 999, log307);
    var stopped307 = bn307(e307) === bc307 && e307.st.bondH === bh307 && bn307(e307b) === 4 && lg307.length === lgBefore307 + 1;
    var norm307 = SQ.Treasures.normalize({ owned: [{ id: 'x02', stage: 2, st: {} }], slots: [null, null, null],
      fate: {}, bondCount: 3, bondHours: 5 }, pack);                         /* 旧档：顶层两键读入即剪、件上不留残余计数 */
    /* (g) 真入口：挂点在世界包 claim 的已结算时长之后（与寿元同一条时钟），离线 24h 照 OFFLINE_CAP_H
     * 封顶 12h ⇒ 该件 12÷8 = 1 份计数、余 4h 留在这件的 st.bondH。直调 bondTime 证不了线接上了，故走 claim。 */
    var w307g = mkWs({ realm: 2 });
    w307g.treasures = { owned: [{ id: 'x02', stage: 1, st: {} }], slots: ['x02', null, null],
      fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 9, bondHours: 9 };
    pack.claim(w307g, 24 * 3600000, Date.now(), mkProf(), { autoTrib: false });
    var g307e = w307g.treasures.owned[0];
    var wired307 = w307g.treasures.bondCount === 9 && w307g.treasures.bondHours === 9 &&   /* claim 不读顶层旧键（它们只是没被剪的残值） */
      bn307(g307e) === 1 && Math.abs(g307e.st.bondH - (D.OFFLINE_CAP_H % BOND307.BOND_HOURS)) < 1e-9 &&
      g307e.stage === 1;
    /* (h) 视图取数口只此一处（公式不许在视图抄第二份）：未满件给正数、顶阶件与非先天件都给 0 */
    var w307h = mkBond307();
    var leftOpen307 = SQ.Treasures.bondHoursLeft(pack, w307h.treasures.owned[0]);
    w307h.treasures.owned[0].st.bondN = 2; w307h.treasures.owned[0].st.bondH = 1;
    var leftMid307 = SQ.Treasures.bondHoursLeft(pack, w307h.treasures.owned[0]);
    w307h.treasures.owned[0].stage = (BOND307.byId.x02.MAX_STAGE || 3);
    var leftMax307 = SQ.Treasures.bondHoursLeft(pack, w307h.treasures.owned[0]);
    var leftHou307 = SQ.Treasures.bondHoursLeft(pack, { id: 'h19', lv: 1, st: {} });
    var leftOk307 = leftOpen307 === BOND307.BOND_COST * BOND307.BOND_HOURS &&
      leftMid307 === BOND307.BOND_COST * BOND307.BOND_HOURS - 1 &&
      leftMax307 === 0 && leftHou307 === 0;
    ok('307', '法宝认主计时通道（第卌三批立 · 🔧 N52 按件改口）：(a) 差 0.1h 不满份 ⇒ 每件各自不涨、余数留在各件上 (b) 满 BOND_HOURS(' + BOND307.BOND_HOURS +
      'h) ⇒ 每件各 +1 计数，未满 BOND_COST(' + BOND307.BOND_COST + ') 不进阶 (c) 两份各进一阶且**每件各写一条** bond.done ' +
      '(d) 按件独立：一件顶阶停表、另一件照走到' + (BOND307.byId.x04.MAX_STAGE || 3) + '阶（旧「共吃一枚全局 bondCount」那条支路搬到新位置重判） ' +
      '(e) 两件全顶阶 ⇒ 渡劫与再喂 999h 都不涨计数、不再写日志 (f) 旧档顶层 bondCount/bondHours 读入即剪且**不摊派**到件上 ' +
      '(g) 真入口：claim 离线 24h 按封顶 ' + D.OFFLINE_CAP_H + 'h 计 ⇒ 该件 +1 份、余 ' + (D.OFFLINE_CAP_H % BOND307.BOND_HOURS) + 'h 留在该件 st ' +
      '(h) bondHoursLeft 单源：未满给正数、顶阶与非先天给 0',
      under307 && odd307 && stage307 && perItem307 && stopped307 && leftOk307 &&
      norm307.bondCount === undefined && norm307.bondHours === undefined &&
      norm307.owned[0].st.bondN === undefined && BOND307.BOND_HOURS === 8 && wired307,
      '顶阶停表=' + stopped307 + ' 按件=' + perItem307 + ' 件计数=' + bn307(e307) + '/' + bn307(e307b) +
      ' 旧档剪=' + (norm307.bondCount === undefined) + '/' + (norm307.bondHours === undefined) +
      ' 不摊派=' + (norm307.owned[0].st.bondN === undefined) +
      ' 真入口=' + bn307(g307e) + '/' + g307e.st.bondH.toFixed(2) + 'h 剩余=' +
      leftOpen307 + '/' + leftMid307 + '/' + leftMax307 + '/' + leftHou307);

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

    /* ══ #314 寿元增减通道（第卌八批③ · 用户令「丹药 / 功法 / 法宝 / 奇遇给寿元增减，
     * 渡劫失败与被人击伤损耗寿元」）══════════════════════════════════════════════
     * 判据两面都要：**(甲) 引擎口**（lifeAdd 唯一写口 + lifeHit 比例 + 无尽档不扣）与
     * **(乙) 内容真有写入方**（四族各跑一次真函数，不是只在测试里调 lifeAdd）。
     * 本仓吃过太多次「引擎对、屏上错」与「只有测试在调」的假在跑，所以 (乙) 一律走消费者的真入口：
     * 丹 = Alchemy.drinkPill、功法 = Arts.gainArt/recheckShelf、法宝 = Treasures.gain+bondAdvance、
     * 奇遇 = Events.resolveBranch（neutral 支无判定 ⇒ 可复现）。 */
    (function () {
      var p314 = SQ.Worlds.xiuxian.pack, D314 = p314.data, s314 = p314.worldSystems;
      var pr314 = mkProf([]);
      /* (甲1) 唯一写口：正负入账、脏值不写、返回累计 */
      var wa = p314.normalize(p314.initialState()); wa.lifeUsed = 0; wa.lifeBonus = 0;
      s314.lifeAdd(wa, 30); s314.lifeAdd(wa, -10);
      var before314 = wa.lifeBonus;
      s314.lifeAdd(wa, '脏值'); s314.lifeAdd(wa, NaN); s314.lifeAdd(wa, null);
      /* (甲2) lifeHit = 当境上界 × 表率、下限 1 年；真仙（无尽）一分不扣。
       * 取的是**单口扣量**（每次另起一份档、只扣一口）——lifeHit 返的是累计 bonus，两口连扣会糊在一起对不上表。 */
      var hitSeq314 = [0, 4, 8].map(function (r) {
        var mk = function () { var h = p314.normalize(p314.initialState()); h.realm = r; h.lifeUsed = 0; h.lifeBonus = 0; return h; };
        return [-s314.lifeHit(mk(), 'trib'), -s314.lifeHit(mk(), 'wound'), s314.lifeCapOf(r)];
      });
      var hitBad314 = hitSeq314.filter(function (x) {
        return !(x[0] === Math.max(1, Math.round(x[2] * D314.LIFE_HIT.trib)) && x[1] === Math.max(1, Math.round(x[2] * D314.LIFE_HIT.wound)));
      });
      var wEtern314 = p314.normalize(p314.initialState()); wEtern314.realm = D314.LIFE_ETERNAL;
      /* (乙1) 丹：坊市两颗改过效果的各走一次真入口（凝神 +20 / 破障 −30） */
      /* 丹匣走 Alchemy.normalize 造（与 #257 同法）：initialState 的 alchemy 是 null，直挂 pills 会踩空 */
      var wp314 = p314.normalize(p314.initialState()); wp314.lifeUsed = 0; wp314.lifeBonus = 0;
      wp314.alchemy = SQ.Alchemy.normalize({ pills: { ningshen: 1, pozhang: 1 } }, D314);
      var lg314 = [];
      var logs314 = function (cat, txt) { lg314.push(cat + '|' + txt); };
      SQ.Alchemy.drinkPill(wp314, p314, D314, 'ningshen', Date.now(), logs314, pr314);
      var afterNing314 = wp314.lifeBonus;
      SQ.Alchemy.drinkPill(wp314, p314, D314, 'pozhang', Date.now(), logs314, pr314);
      var afterPo314 = wp314.lifeBonus;
      /* 日志要写「谁给的寿」（第卌六批「钱扣了屏上无痕」那一族的同型处置）：
       * 丹名由 drinkPill 经 ctx.lifeSrc 递进 applyEffects，模板 = life.log.gain/loss */
      var gainTxt314 = SQ.t('life.log.gain', { src: SQ.t('pill.ningshen.name', null, 'xiuxian'), n: SQ.fmt(20) }, 'xiuxian');
      var effTxt314 = SQ.Events.effText(wp314, p314, D314, { life: 20 });
      /* (乙2) 功法：入门那一次给寿；**重复入门不重给**；架上复检入门同一条口 */
      var we314 = p314.normalize(p314.initialState()); we314.realm = 6; we314.lifeBonus = 0;
      SQ.Arts.gainArt(we314, p314, D314, 'changsheng', null);
      var csFirst314 = we314.lifeBonus;
      SQ.Arts.gainArt(we314, p314, D314, 'changsheng', null);
      var csTwice314 = we314.lifeBonus;
      var wsx314 = p314.normalize(p314.initialState()); wsx314.karma = -300; wsx314.lifeBonus = 0;
      SQ.Arts.gainArt(wsx314, p314, D314, 'shixue', null);
      /* 复检支路：把长生诀先塞进架上（低境界 gainArt 走 shelf），提到 realm 4 后 recheckShelf 入门 */
      var wr314 = p314.normalize(p314.initialState()); wr314.realm = 1; wr314.lifeBonus = 0; wr314.shelf = ['changsheng'];
      SQ.Arts.recheckShelf(wr314, p314, D314, null);
      var rBefore314 = wr314.lifeBonus;
      wr314.realm = 5;
      SQ.Arts.recheckShelf(wr314, p314, D314, null);
      /* (乙3) 法宝：龙髓珠认主晋阶授寿，非寿件不给 */
      var wt314 = p314.normalize(p314.initialState()); wt314.realm = 7; wt314.lifeBonus = 0;
      SQ.Treasures.gain(wt314, p314, D314, 'x19', null);
      /* bondAdvance 已按件（N52）：对外仍只出 bondTick ⇒ 先把**这件**的 st.bondN 摆到差一跳，再 tick 一次 */
      SQ.Treasures.entryOf(wt314, 'x19').st.bondN = p314.treasures.BOND_COST - 1;
      SQ.Treasures.bondTick(wt314, p314, D314, null);
      var x19Gain314 = wt314.lifeBonus;
      /* (乙4) 奇遇：山间甘泉「饮泉」支路（无判定 ⇒ 可复现），区间两端各 stub 一次 */
      var wv314 = p314.normalize(p314.initialState()); wv314.lifeBonus = 0;
      var rs1 = stubRandom(function () { return 0; });
      SQ.Events.resolveBranch(wv314, p314, D314, M(pr314, wv314), 'spirit_spring', 'neutral', Date.now(), { log: noopLog(), profile: pr314 });
      var evLo314 = wv314.lifeBonus;
      var rs2 = stubRandom(function () { return 0.9999; });
      wv314.lifeBonus = 0;
      SQ.Events.resolveBranch(wv314, p314, D314, M(pr314, wv314), 'spirit_spring', 'neutral', Date.now(), { log: noopLog(), profile: pr314 });
      var evHi314 = wv314.lifeBonus;
      rs1(); rs2();
      /* (乙5) 数据面：声明了 life 的功法必须 noSalvage（否则「购入→弃置→再购入」= 刷命回路）；
       *      袭击 / 寻仇三张模板的 failE 都挂 lifeWound，残魂借体的 failE 挂负 life */
      var lifeArts314 = Object.keys(p314.artsMap()).filter(function (k) { return p314.artsMap()[k].life != null; });
      var badArt314 = lifeArts314.filter(function (k) {
        var a = p314.artsMap()[k];
        return !a.noSalvage && (a.obtain || {}).type !== 'initial';
      });
      var findEv314 = function (id) { return SQ.Events.findById(p314, id); };   /* allIds 返的是 id 串，模板要经 findById */
      var amb314 = ['ambush_by_evil', 'ambush_by_right', 'ambush_revenge'].map(function (id) {
        var ev = findEv314(id);
        if (!ev) return false;
        /* 逐支扫（袭击只声明一支、寻仇也只一支，写死 choices.right 会随模板改口而假失败） */
        return Object.keys(ev.choices).some(function (k) {
          var c = (ev.choices[k] || {}).check;
          return !!(c && c.failE && c.failE.lifeWound);
        });
      });
      var spr314 = findEv314('spirit_spring');
      var hasLifeGain314 = !!(spr314 && (spr314.choices.neutral.gain || []).some(function (g) { return g.type === 'life'; }));
      var chj314 = findEv314('canhun_jieti');
      var hasLifeFail314 = !!(chj314 && chj314.choices.evil && chj314.choices.evil.check &&
        chj314.choices.evil.check.some(function (c) { return c.failE && c.failE.life != null; }));
      ok(314, '寿元增减通道（第卌八批③）：(甲) lifeAdd 唯一写口 = 正负入账 + 脏值不写（' + before314 + ' 后再三次调用不动）‖ ' +
        'lifeHit 逐档 === max(1, round(当界 × LIFE_HIT.' + Object.keys(D314.LIFE_HIT).join('/') + '))（违例=' + (hitBad314.length ? JSON.stringify(hitBad314[0]) : '无') + '）‖ 真仙无尽一分不扣 ' +
        '(乙) 四族各走真入口：丹 +20/−30（' + [afterNing314, afterPo314].join('→') + '，日志写「' + gainTxt314 + '」、结果页有 effText 那一行「' + effTxt314 + '」）‖ ' +
        '功法入门 +200/−40 且**重复入门不重给**（' + csFirst314 + '→' + csTwice314 + '）‖ 架上复检入门同样给（' + rBefore314 + '→' + wr314.lifeBonus + '）‖ ' +
        '法宝龙髓珠认主晋阶 +150（实得 ' + x19Gain314 + '）‖ 奇遇「山间甘泉·饮泉」按区间入账（' + evLo314 + '~' + evHi314 + '） ' +
        '(丙) 不变式：写了 life 的功法全部 noSalvage（违例=' + (badArt314.join(',') || '无') + '）‖ 袭击/寻仇三张 failE 都挂 lifeWound ‖ 甘泉有 life 词条 ‖ 借体 failE 有负 life',
      wa.lifeBonus === 20 && before314 === 20 &&
      hitBad314.length === 0 && s314.lifeHit(wEtern314, 'trib') === 0 &&
      afterNing314 === 20 && afterPo314 === -10 &&
      lg314.some(function (l) { return l.indexOf(gainTxt314) >= 0; }) &&
      effTxt314.indexOf(SQ.t('log.eff.life', { sign: '+', n: SQ.fmt(20) }, 'xiuxian')) >= 0 &&
      csFirst314 === p314.artsMap().changsheng.life && csTwice314 === csFirst314 &&
      wsx314.lifeBonus === p314.artsMap().shixue.life &&
      rBefore314 === 0 && wr314.lifeBonus === p314.artsMap().changsheng.life &&
      x19Gain314 === p314.treasures.LIST.filter(function (t) { return t.id === 'x19'; })[0].life &&
      evLo314 === 8 && evHi314 === 18 &&
      badArt314.length === 0 && lifeArts314.length >= 2 &&
      amb314.every(function (x) { return x === true; }) && hasLifeGain314 && hasLifeFail314,
      'bonus=' + wa.lifeBonus + ' 丹=' + [afterNing314, afterPo314].join('/') +
      ' 功法=' + [csFirst314, csTwice314, wsx314.lifeBonus, rBefore314, wr314.lifeBonus].join('/') +
      ' 法宝=' + x19Gain314 + ' 奇遇=' + evLo314 + '~' + evHi314 +
      ' ‖ hit=' + JSON.stringify(hitSeq314) + ' 真仙扣=' + s314.lifeHit(wEtern314, 'trib') +
      ' ‖ life功法=' + lifeArts314.join(',') + ' 违例=' + (badArt314.join(',') || '无') +
      ' ‖ 模板=' + amb314.join(',') + '/' + hasLifeGain314 + '/' + hasLifeFail314 +
      ' ‖ 丹日志=' + lg314.join('¦').slice(0, 200));
    })();

    /* ═══ #315 下线取证（第册批 · 用户令「前世书有个天道做传的，这块功能去掉」）═══
     * 删除类批次立的是「认不到」——这类断言天然容易假绿（名字拼错也算认不到、整条传记链跑不通也算认不到），
     * 所以同一条里必须**同时**正判一件事：兵解仍然写传记。两个方向咬在一起才叫取证。 */
    var g315 = {
      memo: SQ.Codex.bioMemo, adopt: SQ.Codex.adoptBio, act: SQ.Actions.adoptBio, cap: D.LEGACY.BIO_MEMO_LEN,
      k: ['legacy.ui.bioAsk', 'legacy.ui.bioPaste', 'legacy.ui.bioAdopt', 'legacy.ui.bioAdopted',
        'legacy.ui.bioFail', 'tiandao.prompt.bio'].filter(function (x) { return SQ.t(x, null, 'xiuxian') !== x; })
    };
    var gone315 = g315.memo === undefined && g315.adopt === undefined &&
      g315.act === undefined && g315.cap === undefined && g315.k.length === 0;
    /* 有意保留的两样：来源小标（老档确有 source:'tiandao' 的条目，抹掉等于改史）+ 敏感词口（问天谪星同读） */
    var kept315 = SQ.t('legacy.ui.bio.source.tiandao', null, 'xiuxian') !== 'legacy.ui.bio.source.tiandao' &&
      typeof SQ.Tiandao.filterText === 'function' &&
      SQ.t('legacy.ui.recap.title', null, 'xiuxian') !== 'legacy.ui.recap.title';
    localStorage.removeItem(SQ.KEY);
    var ref315 = {};
    await SQ.mutate(ref315, function (s315) {
      s315.profile = mkProf([]);
      s315.worlds.xiuxian = pack.initialState();
      s315.worlds.xiuxian.realm = 4;               /* BINGJIE_MIN_REALM 门槛上 */
    });
    var rb315 = SQ.Legacy.doBingjie(ref315, Date.now());
    var bs315 = (ref315.meta || {}).biographies || [];
    var bio315 = bs315[bs315.length - 1] || {};
    ok(315, '「烧表请天道作传」整族下线 + 兵解仍写传记（第册批）：(甲) 四个出口一律认不到 = Codex.bioMemo / Codex.adoptBio / ' +
      'Actions.adoptBio / D.LEGACY.BIO_MEMO_LEN ‖ 六枚键（五条词条 + 作传提示词）在词表里全部回显 key ' +
      '(乙) 有意保留 = bio.source.* 小标在册（老档 source:tiandao 的条目仍要说清来路）+ Tiandao.filterText 仍是函数（问天同读）' +
      ' + 新键 legacy.ui.recap.title 取到值 ' +
      '(丙) 正判据同咬：兵解事务 ok 且 meta.biographies 末条有正文（≤BIO_MAX、source=local）——下线的是「请天道改写」不是「史官不写」',
      gone315 && kept315 && rb315 && rb315.ok === true && bs315.length === 1 &&
      typeof bio315.text === 'string' && bio315.text.length > 0 &&
      bio315.text.length <= (D.LEGACY.BIO_MAX || 500) && bio315.source === 'local',
      '认不到=' + JSON.stringify({ memo: typeof g315.memo, adopt: typeof g315.adopt, act: typeof g315.act, cap: g315.cap }) +
      ' 残键=' + (g315.k.join(',') || '无') + ' ‖ 保留=' + kept315 +
      ' ‖ 兵解=' + (rb315 && rb315.ok) + ' 传记=' + bs315.length + ' 篇/' + (bio315.text || '').length + '字/' + bio315.source);

    /* ═══ #316 战力散布四档重标定（第册一批② · 用户令「同境界上下限相差超过两个大境界」）═══
     * 立的是**口径**：不新立乘区，改偏移境界表 `REALMS[clamp(rlm + 际遇档)] × 资质微调`。
     * 甲 = 逐档对表（四档各取一名真名录角色）‖ 乙 = 旧档零侵染（无 rid / 脏 rid ⇒ off 恒 0，
     * 与改前逐字同值——这条是本批「不迁移旧档」承诺的直证）‖ 丙 = 上下限差与钳位 ‖
     * 丁 = 幂等与 normalize（rid 留、脏 rid 归 null、超长截断）。 */
    var PS316 = SQ.Jianghu.pool(pack).persons, byOff316 = {};
    PS316.forEach(function (x) { if (!byOff316[x.off]) byOff316[x.off] = x; });
    var four316 = [-1, 0, 1, 2].every(function (o) { return !!byOff316[o]; });   /* 四档齐备 = 数据说话 */
    var w316 = pack.initialState(), R316 = D.REALMS, PC316 = D.PRODIGY.POWER_COEF;
    var pow316 = [-1, 0, 1, 2].map(function (o) {
      return SQ.Prodigy.powerOf(w316, { id: 'prA', rid: byOff316[o].id, rlm: 4, apt: 0 }, D, pack);
    });
    var tabOk316 = pow316.every(function (v, i) { return v === R316[4 + [-1, 0, 1, 2][i]].power * PC316[0]; });
    var old316 = SQ.Prodigy.powerOf(w316, { id: 'prB', rlm: 4, apt: 0 }, D, pack);          /* 无 rid */
    var dirty316 = SQ.Prodigy.powerOf(w316, { id: 'prC', rid: 'zz9', rlm: 4, apt: 0 }, D, pack); /* 名录认不出 */
    var oldOk316 = old316 === R316[4].power * PC316[0] && dirty316 === old316;
    var clamp316 = [
      SQ.Prodigy.powerOf(w316, { rid: byOff316[2].id, rlm: 9, apt: 0 }, D, pack),
      SQ.Prodigy.powerOf(w316, { rid: byOff316[-1].id, rlm: 0, apt: 0 }, D, pack)
    ];
    var spread316 = pow316[3] / pow316[0];                       /* 同境界（rlm 4）上下限之比 */
    var idem316 = SQ.Prodigy.powerOf(w316, { rid: byOff316[1].id, rlm: 6, apt: 2 }, D, pack) ===
      SQ.Prodigy.powerOf(w316, { rid: byOff316[1].id, rlm: 6, apt: 2 }, D, pack);
    var nrm316 = pack.normalize(Object.assign(pack.initialState(), { prodigies: [
      { id: 'pr1', rid: 's001', nm: [0, 0, 0], rlm: 3, apt: 1 },
      { id: 'pr2', rid: 123, nm: [0, 0, 0], rlm: 1, apt: 0 },
      { id: 'pr3', rid: 'abcdefghijkl', nm: [0, 0, 0], rlm: 2, apt: 0 }
    ] })).prodigies;
    ok(316, '战力散布四档重标定（第册一批②）：(甲) 际遇档四档齐备（−1×' + PS316.filter(function (x) { return x.off === -1; }).length +
      '/0×' + PS316.filter(function (x) { return x.off === 0; }).length +
      '/+1×' + PS316.filter(function (x) { return x.off === 1; }).length +
      '/+2×' + PS316.filter(function (x) { return x.off === 2; }).length + '）且 rlm4 逐档 === REALMS[3..6].power × 资质档0 ' +
      '(乙) 旧档零侵染：无 rid 与名录认不出的脏 rid 一律 off=0 ⇒ 与改前逐字同值 ' +
      '(丙) 同境界上下限差 = ' + spread316.toFixed(1) + ' 倍（=== REALMS[6]/REALMS[3]，即 3 档 ≈ 27×，用户要的「超过两个大境界」）‖ 顶钳真仙 / 地板钳练气 ' +
      '(丁) 同输入两次调用同值 ‖ normalize 保留 rid、脏 rid 归 null、超长截 8 字',
      four316 && tabOk316 && oldOk316 &&
      spread316 === R316[6].power / R316[3].power && spread316 > 9 &&
      clamp316[0] === R316[9].power * PC316[0] && clamp316[1] === R316[0].power * PC316[0] &&
      idem316 && nrm316[0].rid === 's001' && nrm316[1].rid === null && nrm316[2].rid === 'abcdefgh',
      '四档=' + JSON.stringify(pow316.map(function (x) { return Math.round(x); })) + ' 旧档=' + old316 + '/' + dirty316 +
      ' 钳位=' + JSON.stringify(clamp316) + ' 差=' + spread316.toFixed(2) + ' rid=' + JSON.stringify(nrm316.map(function (x) { return x.rid; })));

    /* ═══ #317 江湖四榜装配（第册一批③ · 设计稿 §二 / §三）═══
     * 判据取「形状 + 同源」不取文案：十席恒满、天榜前三恒为隐世、玩家恰一行且落在自己那一榜、
     * 同榜不重影、可交互性只给相识者、双跑逐字全等（零随机零副作用）、三档徽标与 ratio 对表、
     * 五项派生过境界门槛、死者不复生、跨带与递补各播一条。 */
    var w317 = pack.initialState();
    w317.realm = 5; w317.zone = 0;                          /* 玩家落玄榜（4~5），zone 错开月事件 */
    SQ.Prodigy.rollForNewLife(w317, pack, D, mkMeta(), 1700000000000);
    var m317 = M(mkProf([]), w317);
    var B317 = SQ.Prodigy.board4(w317, pack, D, m317);
    var B317b = SQ.Prodigy.board4(w317, pack, D, m317);
    var shape317 = B317.length === 4 && B317.every(function (b) {
      var vis = b.rows.filter(function (r) { return r !== null; });
      return b.n >= 10 && vis.length <= 11 && vis.length >= 10;
    });
    var hid3 = SQ.Jianghu.hermits(pack).map(function (h) { return h.id; });
    var top3 = B317[0].rows.slice(0, 3);
    var hidOk317 = top3.length === 3 && top3.every(function (r, i) { return r.hid === true && r.rid === hid3[i]; });
    var meN317 = 0, meBand317 = -1;
    B317.forEach(function (b) { b.rows.forEach(function (r) { if (r && r.me) { meN317++; meBand317 = b.band; } }); });
    var meOk317 = meN317 === 1 && meBand317 === SQ.Jianghu.bandOf(w317.realm);
    var dup317 = false, interOk317 = true;
    B317.forEach(function (b) {
      var seen = {};
      b.rows.forEach(function (r) {
        if (!r || r.me) return;
        if (r.rid && seen[r.rid]) dup317 = true;
        seen[r.rid] = 1;
        if (r.known && !r.pid) interOk317 = false;          /* 相识者必须有存档 id 才点得开 */
        if (!r.known && r.pid) interOk317 = false;          /* 背景席位不许有入口 */
      });
    });
    var HC317 = D.PRODIGY.HANDICAP, myP317 = SQ.Mods.powerOf(w317, pack, D, m317);
    var lvBad317 = [];
    B317.forEach(function (b) { b.rows.forEach(function (r) {
      if (!r || r.me || r.hid) return;
      var ratio = myP317 / r.power;
      var want = ratio >= HC317.crush ? 0 : (ratio <= HC317.brave ? 2 : 1);
      if (r.lv !== want) lvBad317.push([b.band, r.rid, r.lv, want]);
    }); });
    var gearBad317 = [], gearDup317 = false;
    B317.forEach(function (b) { b.rows.forEach(function (r) {
      if (!r || r.me || r.hid || !r.rid) return;
      var g = SQ.Jianghu.gearOf(pack, D, r.rid, r.realm), g2 = SQ.Jianghu.gearOf(pack, D, r.rid, r.realm);
      if (JSON.stringify(g) !== JSON.stringify(g2)) gearDup317 = true;
      if (!g.wp) gearBad317.push(r.rid + ' 无兵刃');
      var am = pack.artsMap();
      if (g.tb && ((pack.treasures.byId[g.tb] || {}).reqs || {}).realm > r.realm) gearBad317.push(r.rid + ' 法宝越境');
      if (g.art && ((am[g.art] || {}).reqs || {}).realm > r.realm) gearBad317.push(r.rid + ' 功法越境');
    }); });
    /* 死者不复生 + 递补播报：挑一名相识者走唯一出榜写口 */
    var victim317 = w317.prodigies[0];
    SQ.Prodigy.killOff(w317, { meta: {} }, pack, D, victim317, 1700000001000, noopLog());
    var deadOk317 = (w317.prodMarks.dead || []).indexOf(victim317.rid) >= 0;
    var back317 = SQ.Prodigy.board4(w317, pack, D, m317);
    var ghost317 = false;
    back317.forEach(function (b) { b.rows.forEach(function (r) { if (r && r.rid === victim317.rid) ghost317 = true; }); });
    var fillCard317 = (w317.rumors || []).filter(function (x) { return x.tpl === 'prodigy.rumor.bandfill'; })[0] || null;
    /* 跨带播报：把一名相识者摆到带界下沿，一次月结破境即换榜（rivAt 置今 ⇒ 机缘竞争不掷，传闻不被挤掉） */
    var climber317 = w317.prodigies[0];
    climber317.rlm = 3; climber317.prg = D.REALMS[4].need - 1; climber317.rivAt = 1700000002000;
    w317.realm = 3;                                          /* 玩家也回黄榜：避开 sameZone 狭路相逢支 */
    w317.zone = 9;
    SQ.Prodigy.tick(w317, pack, D, M(mkProf([]), w317), 30000, 1700000002000, { log: noopLog() });
    var upCard317 = (w317.rumors || []).filter(function (x) { return x.tpl === 'prodigy.rumor.bandup'; })[0] || null;
    ok(317, '江湖四榜装配（第册一批③）：(甲) 四榜各十席（候选 ≥10、可见 ≤11 = 十席 + 玩家尾行） ' +
      '(乙) 天榜前三恒为隐世三席且 hid 标在位（裁定 2） ' +
      '(丙) 玩家恰一行、落在 bandOf(自己境界) 那一榜（裁定 3：不另开「我方之势」行） ' +
      '(丁) 同榜不重影（相识 / 补位 / 隐世 三族互斥）‖ 可交互性只给相识者（背景席位 pid 恒 null） ' +
      '(戊) 三档徽标 === 切磋表值 HANDICAP.crush/brave 复算（违例 ' + (lvBad317.length || 0) + '） ' +
      '(己) 五项派生：兵刃恒有、法宝与主修过境界门槛、两次派生逐字全等 ' +
      '(庚) 双跑逐字全等（纯派生、零随机、零写档） ' +
      '(辛) 死者不复生：出榜者不再以任何席位回榜 + 递补传闻一条 ' +
      '(壬) 跨带播报一条（黄→玄，一次连破也只播落点）',
      shape317 && hidOk317 && meOk317 && !dup317 && interOk317 && lvBad317.length === 0 &&
      gearBad317.length === 0 && !gearDup317 && JSON.stringify(B317) === JSON.stringify(B317b) &&
      deadOk317 && !ghost317 && !!fillCard317 && !!upCard317 && climber317.rlm === 4,
      '席=' + JSON.stringify(B317.map(function (b) { return b.n + '/' + b.rows.length; })) +
      ' 玩家=' + meN317 + '@' + meBand317 + ' 徽标违例=' + JSON.stringify(lvBad317.slice(0, 2)) +
      ' 五项违例=' + JSON.stringify(gearBad317.slice(0, 2)) + ' 双跑=' + (JSON.stringify(B317) === JSON.stringify(B317b)) +
      ' 死=' + deadOk317 + '/' + ghost317 + ' 播=' + !!fillCard317 + '/' + !!upCard317);


    /* ═══ #318 身死即结的「夺宝」（第册三批 · 设计稿《江湖榜与角色库》§四 · 用户裁定「照设计稿全给」）═══
     * 当晚独立复核返修三处：① 灵石一律按**实测差值**并逐笔对 ledger（旧判据只量 stones，把两处
     * `Ledger.note` 删掉照样绿 = 空判「有账」）；② 架上溢出（overflow）单独立一判，它折的是
     * `in.refine` 不是 `in.event`，漏了这支就正好复现「钱多了账上没记」那一族；③ 涉寿元的功法照掉
     * （用户点档「不筛，日志写明白」），所以必须钉「走的是 `lifeAdd` 唯一写口 + 那一行寿元日志真的在」，
     * 否则「白拿 200 年」这件事哪天变成静默的，没人知道。 */
    var pill318 = (D.PILLS || []).filter(function (x) { return !x.nogift && x.price > 0; })
      .sort(function (a, b) { return b.price - a.price; })[0];
    var cap318 = (D.ALCHEMY || {}).PILL_STOCK_CAP || 99;
    var stake318 = function (w) {
      var z = (D.ZONES || [])[Math.min(w.realm, (D.ZONES || []).length - 1)] || {};
      return Math.round((z.stones || 3) * ((D.PRODIGY.STAKE_K3 || {}).heavy || 0));
    };
    var per318 = SQ.Jianghu.pool(pack).persons.filter(function (x) { return !x.hid && !x.fc; });
    var find318 = function (fn, tag) {               /* 扫名录挑素材；挑不到就如实红，不让判据靠 TypeError 打断整沙箱 */
      var hit = null;
      per318.forEach(function (x) {
        if (hit) return;
        var g = SQ.Jianghu.gearOf(pack, D, x.id, x.rlm);
        if (g.tb && g.art && fn(x, g)) hit = { rid: x.id, rlm: x.rlm, g: g };
      });
      if (!hit) bad318.push('挑不到素材:' + tag);
      return hit || { rid: per318[0].id, rlm: per318[0].rlm, g: { tb: null, art: null } };
    };
    var bad318 = [];
    var am318 = pack.artsMap();
    var mLife318 = find318(function (x, g) { return am318[g.art] && am318[g.art].life != null; }, '涉寿元功法');
    var mShelf318 = find318(function (x, g) {                       /* 死者境界高到玩家（realm 1）够不着 ⇒ 落架 / 架满则溢出 */
      var req = (am318[g.art].reqs || {}).realm || 0;
      return req > 1 && !!am318[g.art];
    }, '要求未达功法');
    var new318 = function (rid, realm, rlm) {      /* rlm 显式覆盖：rollOne 把出场者掷成「与你同代、从练气长起」，
                                                     * 而 gearOf 按**该行当前境界**派生 ⇒ 不设就挑不到目标档的道具 */
      var w = pack.initialState();
      w.realm = realm; w.zone = 0;
      var p = SQ.Prodigy.rollOne(w, pack, D, mkMeta(), rid ? { rid: rid } : null);
      if (!rid) p.rid = null;
      if (rlm != null) p.rlm = rlm;
      w.prodigies = [p];
      return w;
    };
    var nameOf318 = function (k) { return SQ.Jianghu.of(pack, k.p.rid).nm; };
    var kill318 = function (w) {
      var p = w.prodigies[0], g = SQ.Jianghu.gearOf(pack, D, p.rid, p.rlm);
      var snap = { st: w.stones, ev: w.ledger.in.event, rf: w.ledger.in.refine, life: w.lifeBonus || 0,
        kn: (w.artsKnown || []).length, sh: (w.shelf || []).length, tb: ((w.treasures || {}).owned || []).length };
      var lg = [];
      SQ.Prodigy.killOff(w, { meta: {} }, pack, D, p, 1700000000000, function (c, t) { lg.push(t); });
      return { p: p, g: g, lg: lg, snap: snap, w: w };
    };
    /* (甲) 两件真道具各按真入口落位 + 灵石一笔有账 + 主日志行由词表现算 */
    var kA = kill318(new318(per318[0].id, 9));
    var evA = kA.snap.ev, stA = kA.w.stones - kA.snap.st;
    var a318 = kA.w.prodigies.length === 0 &&
      ((kA.w.treasures || {}).owned || []).some(function (x) { return x.id === kA.g.tb; }) &&
      ((kA.w.artsKnown || []).indexOf(kA.g.art) >= 0 || (kA.w.shelf || []).indexOf(kA.g.art) >= 0) &&
      stA === stake318(kA.w) && kA.w.ledger.in.event - evA === stA &&
      kA.lg.some(function (s) { return s.indexOf(SQ.t('prodigy.log.killloot', {
        name: SQ.Jianghu.of(pack, kA.p.rid).nm, n: 2, cur: SQ.t('resource.currency', null, 'xiuxian'), loot: SQ.fmt(stA)
      }, 'xiuxian')) >= 0; });
    /* (乙) 待修习架已满 ⇒ 那部功法折灵石：走 `in.refine` 不走 `in.event`，且不算「取走一件」 */
    var wB = new318(mShelf318.rid, 1, mShelf318.rlm);
    var gB = SQ.Jianghu.gearOf(pack, D, mShelf318.rid, mShelf318.rlm);
    var dupB = SQ.Arts.dupValue(pack, D, gB.art);
    wB.shelf = Object.keys(am318).filter(function (k) { return k !== gB.art && (wB.artsKnown || []).indexOf(k) < 0; })
      .slice(0, D.SHELF_CAP);
    var kB = kill318(wB);
    var b318 = (kB.w.artsKnown || []).indexOf(gB.art) < 0 && (kB.w.shelf || []).length === D.SHELF_CAP &&
      dupB > 0 && kB.w.stones - kB.snap.st === stake318(kB.w) + dupB &&
      kB.w.ledger.in.event - kB.snap.ev === stake318(kB.w) &&
      kB.w.ledger.in.refine - kB.snap.rf === dupB &&
      kB.lg.some(function (s) { return s.indexOf(SQ.t('arts.shelffull', {
        name: SQ.t('skill.' + gB.art + '.name', null, 'xiuxian'), n: SQ.fmt(dupB), cur: SQ.t('resource.currency', null, 'xiuxian')
      }, 'xiuxian')) >= 0; }) &&
      kB.lg.some(function (s) { return s.indexOf(SQ.t('prodigy.log.killloot', {
        name: nameOf318(kB), n: 1, cur: SQ.t('resource.currency', null, 'xiuxian'), loot: SQ.fmt(stake318(kB.w) + dupB)
      }, 'xiuxian')) >= 0; });
    /* (丙) 已持有 ⇒ 不重复入册、留说明行（白拿的东西不许无声消失） */
    var wC = new318(per318[0].id, 9);
    var gC = SQ.Jianghu.gearOf(pack, D, wC.prodigies[0].rid, wC.prodigies[0].rlm);
    wC.treasures = wC.treasures || { owned: [], slots: [] };
    wC.treasures.owned.push({ id: gC.tb, st: {}, lv: 1 });
    var tb0C = wC.treasures.owned.length, kC = kill318(wC);
    var c318 = kC.w.treasures.owned.length === tb0C &&
      kC.lg.some(function (s) { return s.indexOf(SQ.t('prodigy.log.killloot.dup', { name: nameOf318(kC) }, 'xiuxian')) >= 0; });
    /* (丁) 丹匣满 ⇒ 整枚按坊市价折灵石：有账（in.event 含这一笔）+ 有说明行 */
    var wD = new318(per318[1].id, 9);
    SQ.Alchemy.gainPill(wD, D, pill318.id, cap318, noopLog(), 'xiuxian');   /* 用真入口塞满丹匣（initialState 的 alchemy 是 null，直接写会崩） */
    var kD = kill318(wD);
    var d318 = kD.w.alchemy.pills[pill318.id] === cap318 &&
      kD.w.stones - kD.snap.st === stake318(kD.w) + pill318.price &&
      kD.w.ledger.in.event - kD.snap.ev === stake318(kD.w) + pill318.price &&
      kD.lg.some(function (s) { return s.indexOf(SQ.t('prodigy.log.killloot.pillfull', {
        cur: SQ.t('resource.currency', null, 'xiuxian'), n: SQ.fmt(pill318.price) }, 'xiuxian')) >= 0; });
    /* (戊) 一次性 = 死者出榜、进 dead，四榜（含背景席位补位）再也装配不到该 rid */
    var B318 = SQ.Prodigy.board4(kA.w, pack, D, M(mkProf([]), kA.w));
    var e318 = kA.w.prodMarks.dead.indexOf(kA.p.rid) >= 0 &&
      B318.every(function (b) { return b.rows.every(function (r) { return !r || r.rid !== kA.p.rid; }); });
    /* (己) 涉寿元的功法照掉，但**必须走 `lifeAdd` 唯一写口并留那行寿元日志**（用户点档「不筛，日志写明白」） */
    var kF = kill318(new318(mLife318.rid, 9, mLife318.rlm));
    var lifeN318 = am318[mLife318.g.art].life;
    var f318 = kF.w.lifeBonus - kF.snap.life === lifeN318 &&
      kF.lg.some(function (s) { return s.indexOf(SQ.t(lifeN318 > 0 ? 'life.log.gain' : 'life.log.loss', {
        n: SQ.fmt(Math.abs(lifeN318)), src: SQ.t('skill.' + mLife318.g.art + '.name', null, 'xiuxian')
      }, 'xiuxian')) >= 0; });
    /* (庚) 旧档 rid 认不出 ⇒ 实物零掉、灵石与丹照给（与战力口径同一把「认不出就不动」的尺） */
    var kG = kill318(new318(null, 9));
    var g318 = ((kG.w.treasures || {}).owned || []).length === 0 && (kG.w.shelf || []).length === 0 &&
      kG.w.artsKnown.length === kG.snap.kn && kG.w.shelf.length === kG.snap.sh && kG.snap.tb === 0 && kG.w.stones - kG.snap.st === stake318(kG.w) &&
      kG.w.alchemy.pills[pill318.id] === 1;
    ok(318, '身死掉落（第册三批① · 复核返修）：(甲) 两件真道具按真入口落位 + 灵石实测差 === 表值重注 === `in.event` 增额 + 主日志行对词表 ' +
      '(乙) 架满 ⇒ 功法折灵石走 `in.refine`、不算「取走一件」且 `arts.shelffull` 在案 ' +
      '(丙) 已持有不重复入册且留说明行 (丁) 丹匣满 ⇒ 整枚折等额灵石、有账有说明 ' +
      '(戊) 一次性 = 进 dead 且四榜装配不到该 rid (己) 涉寿元功法走 `lifeAdd` 唯一写口且寿元日志在案 ' +
      '(庚) 旧档无 rid ⇒ 实物零掉、灵石与丹照给',
      bad318.length === 0 && a318 && b318 && c318 && d318 && e318 && f318 && g318,
      '素材缺=' + JSON.stringify(bad318) + ' 甲=' + stA + '/' + (kA.w.ledger.in.event - evA) +
      ' 乙=' + (kB.w.stones - kB.snap.st) + '=' + stake318(kB.w) + '+' + dupB + '(refine+' + (kB.w.ledger.in.refine - kB.snap.rf) + ')' +
      ' 丁=' + (kD.w.stones - kD.snap.st) + ' 己=' + (kF.w.lifeBonus - kF.snap.life) + '/' + lifeN318 +
      ' 庚=' + (kG.w.stones - kG.snap.st));

    /* ═══ #319 两支新通道（第册三批②③ · 设计稿 §六 4 / §七）═══
     * 复核返修两条：① 旧写法用 `hashOf(rid) % 2` 在判据里**复刻生产公式** ⇒ 把哈希改成恒取第一支也照样绿
     *    （零鉴别力）；现改判「真 tick 在两个不同 rid 上分别挂中了**两支不同的词条**」+「同一 rid 两次跑挂
     *    同一支」，公式只在取样时用、不进判据。② `HID_EVENT_REALM` / `RIVAL_EVENTS` 两枚表值此前无钉值判据
     *    ⇒ 改 6 为 9、删掉整条池都不会红；本批起与事件池在册对表并钉值。 */
    var hidEv319 = SQ.Events.findById(pack, 'jianghu_hid_glimpse'), rvIds319 = D.PRODIGY.RIVAL_EVENTS;
    var poolBad319 = [], rvNotTagged319 = [];
    ['tian', 'di', 'ren'].forEach(function (tr) {
      ['good', 'bad'].forEach(function (na) {
        (SQ.Events.buildPool(pack, kA.w, D, tr, na, 1700000000000) || []).forEach(function (ev) {
          if (ev.tags && ev.tags.length) poolBad319.push(ev.id);
        });
      });
    });
    (rvIds319 || []).forEach(function (id) {
      var ev = SQ.Events.findById(pack, id);
      if (!ev || !ev.tags || ev.tags.indexOf('prodigy_rival') < 0) rvNotTagged319.push(id);
    });
    var h319 = D.PRODIGY.HID_EVENT_REALM === 6 && rvIds319.length === 2 && rvNotTagged319.length === 0 &&
      !!hidEv319 && hidEv319.tags.indexOf('jianghu_hid') >= 0 && poolBad319.length === 0;
    /* 取样：从名录里找两个哈希落在不同支上的 rid（只为构造场景，判据不引用这个公式） */
    var ridFirst319 = null, ridSecond319 = null;
    per318.forEach(function (x) {
      var slot = SQ.Jianghu.hashOf(x.id) % 2;
      if (slot === 0 && !ridFirst319) ridFirst319 = x.id;
      if (slot === 1 && !ridSecond319) ridSecond319 = x.id;
    });
    var fireRival319 = function (rid) {
      var w = pack.initialState();
      w.realm = 5; w.zone = 5;   /* sameZone = 「死者境界对应区 === ws.zone」⇒ 两边都取 5 */
      var p = SQ.Prodigy.rollOne(w, pack, D, mkMeta(), { rid: rid });
      p.rlm = 5; p.prg = 0; p.feud = false; p.rivAt = 0;
      w.prodigies = [p];
      var rum = (w.rumors || []).length, rst = stubRandom(function () { return 0.01; });
      SQ.Prodigy.tick(w, pack, D, M(mkProf([]), w), 30000, 1700000000000, { log: noopLog() });
      rst();
      return { id: w.pendingChoice && w.pendingChoice.id, pid: w.pendingChoice && w.pendingChoice.prodigy,
        riv: p.rivAt, boost: !!p.boost, rumor: (w.rumors || []).length > rum };
    };
    var r1319 = fireRival319(ridFirst319), r2319 = fireRival319(ridSecond319), r1b319 = fireRival319(ridFirst319);
    var i319 = !!ridFirst319 && !!ridSecond319 &&
      rvIds319.indexOf(r1319.id) >= 0 && rvIds319.indexOf(r2319.id) >= 0 && r1319.id !== r2319.id &&
      r1b319.id === r1319.id &&                                   /* 同一 rid 两次跑挂同一支 = 确定性 */
      r1319.pid === 'pr1' && r1319.riv === 1700000000000 && r1319.boost && r1319.rumor;
    /* 隐世 once：未达门槛恒不演；门槛上真 tick 一次演、第二次池已被 fateSeen 记空 */
    var w319b = pack.initialState();
    w319b.realm = 5; w319b.zone = 9;   /* 出场者多在不同区 ⇒ 本 tick 只可能命中隐世那一条钩子 */
    SQ.Prodigy.rollForNewLife(w319b, pack, D, mkMeta(), 1700000000000);
    var m319b = M(mkProf([]), w319b), rst319b = stubRandom(function () { return 0.99; });
    w319b.realm = D.PRODIGY.HID_EVENT_REALM - 1;
    SQ.Prodigy.tick(w319b, pack, D, m319b, 30000, 1700000000000, { log: noopLog() });
    var j319 = !w319b.pendingChoice;
    w319b.realm = D.PRODIGY.HID_EVENT_REALM;
    SQ.Prodigy.tick(w319b, pack, D, m319b, 30000, 1700000000030, { log: noopLog() });
    var k319 = !!w319b.pendingChoice && w319b.pendingChoice.id === 'jianghu_hid_glimpse' &&
      w319b.pendingChoice.prodigy == null && (w319b.fateSeen || []).length > 0;
    w319b.pendingChoice = null;
    var fs319 = (w319b.fateSeen || []).length;
    SQ.Prodigy.tick(w319b, pack, D, m319b, 30000, 1700000000060, { log: noopLog() });
    var l319 = !w319b.pendingChoice && (w319b.fateSeen || []).length === fs319;
    rst319b();
    var cx319 = hidEv319 ? JSON.stringify(hidEv319.choices) : '{}';
    var m319 = cx319.indexOf('$prodigy') < 0 && cx319.indexOf('prodigySpar') < 0 && cx319.indexOf('"npc"') < 0;
    ok(319, '机缘与隐世两条通道（第册三批②③ · 复核返修）：(甲) 两枚表值钉住（HID_EVENT_REALM === 6 ‖ RIVAL_EVENTS 恰两支且都在册并带 `prodigy_rival`）' +
      ' ‖ 三支带 tags 的词条 `buildPool` 六组合零命中（生效抽取池一字未动） ' +
      '(乙) 真 tick 在两个不同 rid 上分别挂中**两支不同**的词条，同一 rid 两次跑挂同一支（判据不复刻哈希公式） ' +
      '‖ 竞争原三项收益（传闻 / boost / rivAt 频控）一项不丢 ' +
      '(丙) 未达门槛恒不演 ‖ 达门槛演一次且不挂天骄槽位 ‖ 演过之后 fateSeen 记空不再演 ' +
      '(丁) 隐世那一支三条分支不引用任何天骄槽位（不可交互落到内容侧）',
      h319 && i319 && j319 && k319 && l319 && m319,
      '两支=' + JSON.stringify([r1319.id, r2319.id]) + ' 重跑同支=' + (r1b319.id === r1319.id) +
      ' 池内违例=' + JSON.stringify(poolBad319.slice(0, 3)) + ' 未tag=' + JSON.stringify(rvNotTagged319) +
      ' 隐世=' + j319 + '/' + !!k319 + '/' + l319);


    /* ═══ #320 已读公告号（第册四批 · 更新公告浮层 · 视图代码外置试点的存档面）═══
     * profile 是**逐字段显式 normalize**：漏抄一行就静默丢（读档后打回未读 ⇒ 每次进线重弹一次），
     * 所以判据要同时咬「保值 / 脏值归 null / 缺键补 null / 复 normalize 幂等 / 键确在声明集内」。 */
    var s320 = SQ.defaultState();
    var prof320 = function (p) { return SQ.normalize({ v: s320.v, profile: p, worlds: {}, meta: {} }).profile; };
    var a320 = s320.profile.seenNote === null;
    var b320 = prof320({ name: '甲', seenNote: '2026-10-22-1' }).seenNote === '2026-10-22-1';
    var c320 = prof320({ seenNote: { a: 1 } }).seenNote === null && prof320({ seenNote: 7 }).seenNote === null &&
      prof320({ seenNote: '' }).seenNote === null;
    var d320 = prof320({ name: '甲' }).seenNote === null;                       /* 旧档无此键 ⇒ 补 null（不是 undefined） */
    var e320 = (function () {
      var one = SQ.normalize({ v: s320.v, profile: { seenNote: 'x-1' }, worlds: {}, meta: {} });
      var t1 = JSON.stringify(SQ.normalize(one).profile), t2 = JSON.stringify(SQ.normalize(SQ.normalize(one)).profile);
      return one.profile.seenNote === 'x-1' && t1 === t2;
    })();
    var f320 = Object.keys(prof320({ seenNote: 'k' })).indexOf('seenNote') >= 0;
    ok('320', '已读公告号（第册四批）：默认 null ‖ 字符串保值 ‖ 对象 / 数字 / 空串三档脏值归 null ‖ 旧档缺键补 null ' +
      '‖ 复 normalize 幂等 ‖ 键在 profile 声明集内（漏一行即读档丢，判据抓得住）',
      a320 && b320 && c320 && d320 && e320 && f320,
      '默认=' + a320 + ' 保值=' + b320 + ' 脏=' + c320 + ' 缺键=' + d320 + ' 幂等=' + e320 + ' 声明=' + f320);


    ok(72, '数字格式 <1万千分位/万/亿',
      SQ.fmt(9999) === '9,999' && SQ.fmt(12345) === '1.2万' && SQ.fmt(123456789) === '1.2亿' && SQ.fmt(0) === '0');

    /* #77 script 顺序加载无依赖错误（本套件能跑完即证；此处核系统命名空间齐全） */
    ok(77, 'IIFE 挂载顺序完整', ['Mods', 'Talents', 'Attrs', 'Gear', 'Arts', 'Combat', 'Realm', 'Idle', 'Shop', 'Events', 'Actions']
      .every(function (n) { return !!SQ[n]; }));

    /* #323 死名册上界 = 名录上限的派生值（B1 · N64 · 第册卅二批）两刀：
     * (a) 钉表值：`deadCap(D)` 必等于 `D.PRODIGY.COUNT_MAX` 且严格大于旧口径 20（旧值 20 ⇒ 本判红）；
     * (b) 挤不出最旧：先把 dead 预置成**旧上界满档 20 条**（哨兵 `zz_oldest` 在最旧位），再走唯一
     *     出榜写口 `killOff` 杀一名真出场者 ⇒ 名册长到 21 条而最旧那条**仍在**（旧代码在此 shift 掉它，
     *     于是那名死者能被 `fillOf` 当背景席位补回榜面 = 人死复生）。
     * 两刀同挂 #323；反向 = 把 `deadCap` 改回常量 20 ⇒ 本判如实红。 */
    var cap323 = SQ.Prodigy.deadCap(D);
    var tab323 = cap323 === D.PRODIGY.COUNT_MAX && cap323 > 20;
    w317.prodMarks = w317.prodMarks || {};
    w317.prodMarks.dead = ['zz_oldest'];
    for (var z323 = 0; z323 < 19; z323++) w317.prodMarks.dead.push('zz_fill' + z323);
    var v323 = victim317 || w317.prodigies[0];
    SQ.Prodigy.killOff(w317, { meta: {} }, pack, D, v323, 1700000323000, noopLog());
    var d323 = w317.prodMarks.dead;
    ok(323, '死名册按名录上限封顶：一世杀满 21 人也不挤掉最旧那名死者（B1 · 人死不复生的唯一依据）',
      tab323 && d323.length === 21 && d323[0] === 'zz_oldest' && d323.indexOf(v323.rid) >= 0,
      'cap=' + cap323 + ' COUNT_MAX=' + D.PRODIGY.COUNT_MAX + ' 长=' + d323.length + ' 最旧=' + d323[0] + ' 新死者在册=' + (d323.indexOf(v323.rid) >= 0));

    /* ═══ #326 隐世间接得知的「一世只演一次」必须穿过**真实落盘往返**（2026-10-18 用户报
     *      「奇遇『云外一声』固定每月触发一次，频率异常高」）═════════════════════════════
     * 根因 = `worlds/xiuxian/index.js` 的 `fateSeen` 逐项校验原写「rl < 0 一律丢」，而这条钩子送的正是
     *   **在册哨兵** `realm: -1`（`Prodigy.tick:506` 走 `fireTagged(…, 'jianghu_hid', -1, …)`，-1 的含义
     *   = 与天道渡劫垂青池「按境界段分账」隔开、互不喂饱）⇒ 每次读档把哨兵静默抹掉，于是每月钩子重新
     *   演一次、直到转世。**#319 那条判据全程只拿内存态 ⇒ 看不见这个丢失**：同一支钩子、同一条 once，
     *   本判与它唯一的差别就是两次 tick 之间插了一次 JSON + normalize。
     * 四判：① 演过之后**往返仍留着那枚 -1 记录**（旧代码在此丢 ⇒ 本判红）
     *      ② 往返之后再走同一条钩子（连推四拍，保证跨过一个月）⇒ 池已被记空、不再演
     *      ③ 放行哨兵不等于放大段号：越界 99 与空 id / 缺 id 照旧丢，留下的 realm 必须是合法整数
     *      ④ 射程 = 一世：全新世界态（转世后）同一条钩子照演 ⇒ 去重没被做成永久
     * 反证 = 把那行改回 `rl < 0` ⇒ 只红 #326（①②两判）。 */
    var hidId326 = 'jianghu_hid_glimpse';
    var mkHid326 = function (at) {
      var w = pack.initialState();
      w.realm = D.PRODIGY.HID_EVENT_REALM; w.zone = 9;   /* 出场者多在不同区 ⇒ 本拍只可能命中隐世那一条钩子 */
      SQ.Prodigy.rollForNewLife(w, pack, D, mkMeta(), at);
      return w;
    };
    var rst326 = stubRandom(function () { return 0.99; });
    var w326 = mkHid326(1700000000000);
    SQ.Prodigy.tick(w326, pack, D, M(mkProf([]), w326), 30000, 1700000000000, { log: noopLog() });
    var fired326 = !!w326.pendingChoice && w326.pendingChoice.id === hidId326;
    w326.pendingChoice = null;
    var rt326 = pack.normalize(JSON.parse(JSON.stringify(w326)));      /* 写盘 → 读档清洗，旧代码在这一步丢哨兵 */
    var keepNeg326 = (rt326.fateSeen || []).some(function (f) { return f.id === hidId326 && f.realm === -1; });
    var reFired326 = false;
    for (var k326 = 1; k326 <= 4; k326++) {
      SQ.Prodigy.tick(rt326, pack, D, M(mkProf([]), rt326), 30000, 1700000000000 + k326 * 30000, { log: noopLog() });
      if (rt326.pendingChoice) { reFired326 = true; rt326.pendingChoice = null; }
    }
    var dirty326 = pack.normalize({ fateSeen: [{ id: 'a', realm: 99 }, { id: 'b', realm: 3 },
      { id: 'c' }, { id: '', realm: -1 }, { realm: -1 }, { id: 'd', realm: -1 }] });
    var segOk326 = (function () {
      var fs = dirty326.fateSeen || [];
      return fs.length === 3 && fs.every(function (f) {
        return typeof f.realm === 'number' && Number.isInteger(f.realm) &&
          (f.realm === -1 || (f.realm >= 0 && f.realm < D.REALMS.length));
      }) && fs.map(function (f) { return f.id; }).join(',') === 'b,c,d';
    })();
    var w326b = mkHid326(1700000000000);
    SQ.Prodigy.tick(w326b, pack, D, M(mkProf([]), w326b), 30000, 1700000000000, { log: noopLog() });
    var lifeScope326 = !!w326b.pendingChoice && w326b.pendingChoice.id === hidId326;
    rst326();
    ok(326, '隐世「云外一声」的一世只演一次穿过真实落盘往返（修「固定每月触发」）：演过之后往返仍留着 realm=-1 哨兵 ‖ ' +
      '往返后连推四拍不再演 ‖ 放行哨兵不放大段号（越界 / 空 id / 缺 id 照旧丢，留下的是合法整数）‖ ' +
      '新世界态照演（射程 = 一世，不是永久）',
      fired326 && keepNeg326 && !reFired326 && segOk326 && lifeScope326,
      '首演=' + fired326 + ' 往返留哨兵=' + keepNeg326 + ' 往返后再演=' + reFired326 +
      ' 脏段号=' + segOk326 + '(留 ' + (dirty326.fateSeen || []).length + ' 条) 跨世可再演=' + lifeScope326);

});
