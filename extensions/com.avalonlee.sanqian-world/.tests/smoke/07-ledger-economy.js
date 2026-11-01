/* .tests/smoke/07-ledger-economy.js — 冒烟断言 16 条（首 #295 ‖ 末 #217）
 * 由 smoke.js 的 run() 体逐字切出（原第 6499~7657 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：295 258 259 260 207 208 209 210 211 212 212 213 214 215 216 217
*/
window.SQSmoke.frag('07-ledger-economy', async function () {
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

    /* ═══ #327 N76（第册一百三十批 · 文案与实付同源）═══
     * 病根：`log.eff.attrBonus` 走 `applied.attrBonus.n`（gainToEff 预写的**原始掷点值**），
     *   而实付是 applyEffects 里经 `attrBonusAmp` 放大 + 截到剩余后的 `got8` ⇒ 有 amp / 有截断时
     *   「文案 +3 / 实得 +4」与「文案 +5 / 实得 +2」两族会说谎。修法 = 写作侧把实付值回写两处文案源。 */
    var w327a = mkWs({});                                    /* (a) amp 生效：n=3 ×(1+0.2) ⇒ 实付 4 */
    var e327a = { attrBonus: { attr: 'gunt', n: 3 } }; var ap327a = { attrBonus: { attr: 'gunt', n: 3 } };
    var M327a = M(mkProf(), w327a); M327a.sum.attrBonusAmp = 0.2;
    SQ.Events.applyEffects(w327a, pack, D, M327a, e327a, { applied: ap327a, log: noop295, now: 1700000096000 });
    var a327 = w327a.attrEventBonus.gunt === 4 && e327a.attrBonus.n === 4 && ap327a.attrBonus.n === 4;
    var w327b = mkWs({}); w327b.attrEventBonus = { mind: CAP295 - 2 };   /* (b) 截到剩余：余 2 掷 5 ⇒ 实付 2 */
    var e327b = { attrBonus: { attr: 'gunt', n: 5 } }; var ap327b = { attrBonus: { attr: 'gunt', n: 5 } };
    SQ.Events.applyEffects(w327b, pack, D, M(mkProf(), w327b), e327b, { applied: ap327b, log: noop295, now: 1700000096000 });
    var b327 = w327b.attrEventBonus.gunt === 2 && e327b.attrBonus.n === 2 && ap327b.attrBonus.n === 2;
    var w327c = mkWs({});                                    /* (c) 无 amp 无截断 ⇒ 逐字不变（写回幂等） */
    var e327c = { attrBonus: { attr: 'gunt', n: 3 } }; var ap327c = { attrBonus: { attr: 'gunt', n: 3 } };
    SQ.Events.applyEffects(w327c, pack, D, M(mkProf(), w327c), e327c, { applied: ap327c, log: noop295, now: 1700000096000 });
    var c327 = w327c.attrEventBonus.gunt === 3 && e327c.attrBonus.n === 3 && ap327c.attrBonus.n === 3;
    ok('327', 'N76 文案与实付同源（第册一百三十批）：`attrBonus` 经 `attrBonusAmp` 放大 / 经 `ATTR_EVENT_BONUS_CAP` 截到剩余后，**文案源 === 实付额**（回写 `e.attrBonus.n` 与 `ctx.applied.attrBonus.n` 两处）：' +
      '(a) amp 1.2、n=3 ⇒ 实付 4 且两处文案源均 4；(b) 余 2 掷 5 ⇒ 实付 2 且两处均 2；(c) 无 amp 无截断 ⇒ 三值同为 3（写回幂等、原支逐字不变）',
      a327 && b327 && c327,
      '(a) 实付=' + w327a.attrEventBonus.gunt + ' e=' + e327a.attrBonus.n + ' applied=' + ap327a.attrBonus.n +
      ' ‖ (b) 实付=' + w327b.attrEventBonus.gunt + ' e=' + e327b.attrBonus.n + ' applied=' + ap327b.attrBonus.n +
      ' ‖ (c) 实付=' + w327c.attrEventBonus.gunt + ' e=' + e327c.attrBonus.n + ' applied=' + ap327c.attrBonus.n);


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

    /* #208 材料三源口径（击杀独立掷判 / 采集历练自动轴 / 灵田在线一批离线不产）
     * 🔧 第册十五批定种子（N69 登记件）：本段两处读数都是掷判产物（每周期 1~4 枚的材料数 + 200 抽的
     *    悟道石次数），真随机下曾单跑出界；带（`GATHER_N_MIN/MAX`、4~36、`FARM_N_MIN/MAX`）一字不上调。 */
    var endSeed208 = beginSeed(20820261018);
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
    endSeed208();   /* 种子窗口结束 */
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
    /* 🔧 N43 改口：原判「第 5 颗 reason==='daily'」随日限退役；这条支路在防的东西搬到新位置重判 =
     * 连点五颗之后 qiRate buff 仍只有一条（同字段同向不叠加 #119 形状），那才是「撤闸会不会让人一口气叠满」的答案。*/
    var qBuffs209z = w209.buffs.filter(function (b2) { return b2.field === 'qiRate' && b2.source === 'alchemy'; });
    var dk209f = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209 + 4, null, prof209);        /* 🔧 N43：第 5 颗照服（日限已退役）*/
    var dk209e = SQ.Alchemy.drinkPill(w209, pack, D, 'ap_juqi', now209 + 5000, null, prof209);   /* 跨游戏日 */
    ok('209', '炼丹流程：成功率表 0.85/0.95cap/0.70/0.55/0.67 对表；开工扣料记 out、失败不还熟练度照涨；宗师丹纹 5% 仅时限型（九转正名）；🔧 N43 丹毒日限整族退役 ⇒ 第 5 颗照服，防连点改由「同字段同向不叠加」这一守；pushBuff 同字段保最强（丹纹 ×2）',
      p209a === 0.85 && p209b === 0.95 && p209c === 0.70 && p209d === 0.55 && p209e === 0.67 &&
      sc209.ok === true && busy209.reason === 'busy' && profUp209 && matOut209b === matOut209a + 3 &&
      fail209 && rune209 && noRune209 &&
      dk209a.ok === true && dk209b.ok === true && dk209c.ok === true && dk209d.ok === true &&
      dk209f.ok === true && dk209e.ok === true &&
      qBuffs209.length === 1 && qBuffs209[0].mult === 0.20 &&
      /* 连点五颗之后仍然只有一条 qiRate buff —— 这才是撤掉日限之后真正守「一口气叠满」的那道 */
      qBuffs209z.length === 1 && qBuffs209z[0].mult === 0.20);

    /* #210 双特例每境界限（破障 −0.10 下限不破 / 镇劫 +0.02 判后即清 / 相互独立于丹毒） */
    var w210 = pack.initialState();
    w210.realm = 5;
    SQ.Alchemy.ensure(w210, D);
    w210.alchemy.pills.ap_pozhang = 3; w210.alchemy.pills.ap_zhenjie = 3;
    var prof210 = mkProf([]); prof210.createdAt = Date.now() - 10000;
    var now210 = Date.now();
    var dp210a = SQ.Alchemy.drinkPill(w210, pack, D, 'ap_pozhang', now210, null, prof210);
    var bc210 = w210.breakCostNext;
    /* 🔧 N43：原三支判「被拒不消耗日限 / 独立特例入账 +1」，日限退役后改判**库存守恒**
     *（同一件事的守恒面：拒服时丹药一枚不少、成功时一枚不多扣，比「计数不变」更贴玩家所得）*/
    var stock210a = w210.alchemy.pills.ap_pozhang;
    var dp210b = SQ.Alchemy.drinkPill(w210, pack, D, 'ap_pozhang', now210 + 1, null, prof210);
    var stock210b = w210.alchemy.pills.ap_pozhang;            /* 被拒不吞丹：库存与拒前逐枚相同 */
    var dp210c = SQ.Alchemy.drinkPill(w210, pack, D, 'ap_zhenjie', now210 + 2, null, prof210);   /* 相互独立 */
    var stock210c = w210.alchemy.pills.ap_zhenjie;            /* 独立特例正常扣一枚（3 → 2）*/
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
    ok('210', '双特例每境界限：破障 −0.10 写 breakCostNext、needEff 下限 0.1 不破（−22%→0.78 / 极端→0.1）；镇劫 +0.02 写 tribulation.next 判后即清；同境界二服拒且**不吞丹**（🔧 N43 日限退役 ⇒ 改判库存守恒）、相互独立',
      dp210a.ok === true && bc210 === -0.10 && dp210b.reason === 'once' &&
      stock210a === 2 && stock210b === 2 && stock210c === 2 &&
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
      pills: { ap_juqi: 999, bad_pill: 3 }, pillDay: { day: 'x', n: 99 }, pillOnce: {},   /* 🔧 N43：pillDay 是**已退役键**，故意留着验 normalize 会不会把它搬回来 */ craft: { kind: 'xx', id: 1 }, farmAt: -1 };
    var n211a = SQ.Alchemy.normalize(dirty211, D);
    var n211b = SQ.Alchemy.normalize(n211a, D);
    ok('211', '炼器零漂移：品阶逐区 凡×4/良×2/上×3/灵×1 对照（z8 D=3.45 勘误登记）；主词条 [50%,100%] 上半区；灵品 attr 自由指定；打造件 neutral/special=null/source=forge；极品 reqs+1；minTier 方向锁；normalize 幂等',
      tiers211.join() === '0,0,0,0,1,1,2,2,2,3' &&
      sc211.ok === true && dirLock211.reason === 'dir' &&
      /* N43 退役面：旧档里的 pillDay 读档即丢、二次 normalize 也不复活（留字段 = 写了没人接那一族）*/
      n211a.pillDay === undefined && n211b.pillDay === undefined &&
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
    /* 同档重名去重 + apt 权重分布（3000 次统计 50/35/15 ±30% 相对）
     * ⚠️ 第册一批①「名库替换出场者」改口：去重键从 `nm` 三段索引改成**名录号 rid**（具名者 nm 恒
     *    [0,0,0]，再按 nm 比就是「人人重名」的假红）；未具名的兜底支路仍按 nm 比，两族各自成立。 */
    var nameDup212 = false, aptCnt = [0, 0, 0], tlBad212 = 0, maxBytes212 = 0;
    var keyOf212 = function (x) { return x.rid ? 'R' + x.rid : 'N' + x.nm.join(','); };
    var posIds212 = {};
    ['common', 'xiuxian'].forEach(function (wd) { var tp = SQ.TALENTS[wd]; if (tp) tp.positive.forEach(function (x) { posIds212[x.id] = 1; }); });
    var w212c = pack.initialState();
    for (var ri212 = 0; ri212 < 3000; ri212++) {
      var seen212 = {};
      w212c.prodigies.forEach(function (pp) { seen212[keyOf212(pp)] = 1; });
      var np = SQ.Prodigy.rollOne(w212c, pack, D, null, {});
      if (seen212[keyOf212(np)]) nameDup212 = true;
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
    /* 出场者人人带名录号且互不重复（30 人满代 · 名录 133 人池 ⇒ 恒应成立） */
    var ridSeen212 = {}, ridOk212 = true;
    w212b.prodigies.forEach(function (x) {
      if (!x.rid || ridSeen212[x.rid]) ridOk212 = false;
      ridSeen212[x.rid] = 1;
    });
    ok('212', '天骄生成与容量：默认 10 名/prodigySlot 30 名、幂等不重复；**出场者按名录号去重且满代 30 人 rid 不重**（第册一批①）；apt 50/35/15 统计；天赋全出正面池且 mods 零侵入；单人序列化 ' + maxBytes212 + 'B（上限 240 → **256** = 旧口径 + `rid` 一枚名录号，本批唯一新增落盘字段）；normalize 旧档不补 roll 脏档清理（无 rid ⇒ null）',
      cnt212a === 10 && cnt212b === 30 && idem212 && !nameDup212 && aptOk212 && tlBad212 === 0 &&
      maxBytes212 <= 256 && modsNo212 === modsYes212 && ridOk212 &&
      old212.prodigies.length === 0 && dirty212.prodigies.length === 1 &&
      dp212.id === 'pr9' && dp212.rid === null && dp212.nm.join() === '8,0,2' && dp212.tl.join() === 'ok_talent,b' &&
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
    var pw213 = SQ.Prodigy.powerOf(w213, w213.prodigies[0], D, pack);
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
    var kill215 = SQ.Prodigy.onEventResolved(w215b, s215, pack, D, 'prodigy_ev_feud', 'evil', true, Date.now(), 'pr7', noopLog());
    var killOk215 = kill215.killed === true && w215b.prodigies.length === 0 &&
      w215b.karmaEventScore === 115 &&                               /* 魔天骄被斩 +15 */
      s215.meta.eternalProdigy === null && w215b.prodMarks.sudiWin === true;
    var w215c = pack.initialState();
    w215c.prodigies = [{ id: 'pr8', nm: [1, 1, 1], tl: [], al: 0, fc: -1, fid: null, apt: 1, rlm: 4, prg: 0, feud: true, feudBond: 80, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var clear215 = SQ.Prodigy.onEventResolved(w215c, null, pack, D, 'prodigy_ev_feud', 'right', true, Date.now(), 'pr8', noopLog());
    var lose215b = SQ.Prodigy.onEventResolved(w215c, null, pack, D, 'prodigy_ev_feud', 'right', false, Date.now(), 'pr8', noopLog());
    w215c.prodigies[0].feud = true;
    var fg215 = SQ.Prodigy.onEventResolved(w215c, null, pack, D, 'prodigy_ev_forgive', 'right', true, Date.now(), 'pr8', noopLog());
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
});
