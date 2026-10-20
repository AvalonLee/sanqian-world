/* .tests/smoke/06-karma-bond-writes.js — 冒烟断言 16 条（首 #253 ‖ 末 #294）
 * 由 smoke.js 的 run() 体逐字切出（原第 5409~6498 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：253 254 255 256 257 284 285 286 287 288 289 290 291 292 293 294
*/
window.SQSmoke.frag('06-karma-bond-writes', async function () {
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
    /* (a) 两页导航标签（B3 拆页后：功法 / 百器） */
    var a255 = t255('skill.system') === '功法' && t255('gear.system') === '百器';
    /* (b) 合并页专属键全部退役（arts.system / arts.ov.* / arts.seg.* 不得再在册） */
    var gone255 = ['arts.system', 'arts.ov.main', 'arts.ov.main.none', 'arts.ov.main.val',
      'arts.ov.gear', 'arts.ov.gear.val', 'arts.ov.power',
      'arts.seg.fa', 'arts.seg.fa.sub', 'arts.seg.qi', 'arts.seg.qi.sub']
      .filter(function (k) { return has255(k); });
    var b255 = gone255.length === 0;
    /* (c) 日志分类标签键保留（gear.tag 拾得；skill/gear 系统名与 (a) 同源） */
    var c255 = t255('gear.tag') === '拾得';
    /* (d) TAB_UNLOCK 四条不得出现（两页均无境界门槛） */
    var tu255 = D.TAB_UNLOCK || {};
    var bad255 = ['arts', 'gear', 'combat', 'cave'].filter(function (k) { return tu255[k] != null; });
    var d255 = bad255.length === 0;
    ok('255', '「功法 / 百器」拆页（UI v2 B3 · 引擎/词表侧契约）：(a) 导航标签 = 「功法」「百器」（skill.system / gear.system）；(b) 合并页专属键 `arts.system` / `arts.ov.*` / `arts.seg.*` 全部退役（`t()` 回落 = 键本身）；(c) 日志分类键 `gear.tag`(拾得) 保留；(d) `TAB_UNLOCK` 无 `arts`/`gear`/`combat`/`cave` 四条（两页均无境界门槛）。DOM 侧见 verify-ui-arts / verify-ui-gear；探针见 probe-lawmerge',
      a255 && b255 && c255 && d255,
      '(a) skill.system=' + t255('skill.system') + ' gear.system=' + t255('gear.system') +
      ' ‖ (b) 未退役=' + (gone255.length ? gone255.join(',') : '无') +
      ' ‖ (c) gear.tag=' + t255('gear.tag') +
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
    /* 势力是 normalize 时一次性生成的（initialState 留 null）⇒ 必须走 pack.normalize 才有 factions 表
     * 🔧 第册十五批定种子（N27① 在册件）：真随机下「八型全覆盖」会抽不齐（八个原型各要至少一个 NPC 命中，
     *    而势力关系是掷出来的）⇒ 采样不到齐时判据假红。钉种子后覆盖面 = 那一条序列，八型判据本身一字未动。 */
    var endSeed287 = beginSeed(28720261018);
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
    endSeed287();   /* 种子窗口结束 */
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
      w295b.attrEventBonus.gunt === 3 && !!ap295b.attrBonus;   /* (a) 恰满 CAP 仍整笔撤 */
    /* (a2) 🔧 复核返修：撤销条件原判成 `bn > 0`，连**负值**（减属性）一起撤了 ⇒ 「折寿 / 削悟性」类效果静默
     *   不生效而文案照印。负值在本仓是受支持的（`attrs.js:38` 直接加、normalize 不夹下界），现补一条负值判。 */
    var w295a2 = mkWs({}); w295a2.attrEventBonus = { mind: CAP295 };
    var e295a2 = { attrBonus: { attr: 'gunt', n: -2 } }; var ap295a2 = { attrBonus: { attr: 'gunt', n: -2 } };
    SQ.Events.applyEffects(w295a2, pack, D, M(mkProf(), w295a2), e295a2, { applied: ap295a2, log: noop295, now: 1700000095000 });
    var a295b = w295a2.attrEventBonus.gunt === -2 && !!ap295a2.attrBonus && e295a2.attrBonus != null;

    /* (a3) F8 截到剩余：余 2 时掷 +5 ⇒ 实付 2、总额恰等于 CAP（旧口径 = 一分不得）；再掷一次 ⇒ room 0 ⇒
     *   仍走撤销支（标签与 applied 一起没，文案不空转）。两判同挂 #295，防「改了新支、旧支没人看」。 */
    var w295a3 = mkWs({}); w295a3.attrEventBonus = { mind: CAP295 - 2 };
    var e295a3 = { attrBonus: { attr: 'gunt', n: 5 } }; var ap295a3 = { attrBonus: { attr: 'gunt', n: 5 } };
    SQ.Events.applyEffects(w295a3, pack, D, M(mkProf(), w295a3), e295a3, { applied: ap295a3, log: noop295, now: 1700000095000 });
    var sumA3 = w295a3.attrEventBonus.mind + (w295a3.attrEventBonus.gunt || 0);
    var e295a3b = { attrBonus: { attr: 'gunt', n: 5 } }; var ap295a3b = { attrBonus: { attr: 'gunt', n: 5 } };
    SQ.Events.applyEffects(w295a3, pack, D, M(mkProf(), w295a3), e295a3b, { applied: ap295a3b, log: noop295, now: 1700000095000 });
    var a295a3 = w295a3.attrEventBonus.gunt === 2 && sumA3 === CAP295 &&
      e295a3b.attrBonus === null && !ap295a3b.attrBonus && w295a3.attrEventBonus.gunt === 2;
    ok('322', 'F8 截到剩余（第册廿九批 · N28 ①）：(a) 余 2 掷 +5 ⇒ 实付 2、`attrEventBonus` 总额恰等于 `ATTR_EVENT_BONUS_CAP`；(b) 同一态再掷一次 ⇒ room 0 ⇒ 仍走**撤销支**（标签与 applied 一起没，文案不许空转）；(c) 负值不截（与 `attrBonusAmp` 只放大正增益同口径）',
      a295a3 && (function () {
        var wn = mkWs({}); wn.attrEventBonus = { mind: CAP295 };
        var en = { attrBonus: { attr: 'gunt', n: -3 } };
        SQ.Events.applyEffects(wn, pack, D, M(mkProf(), wn), en, { applied: { attrBonus: { attr: 'gunt', n: -3 } }, log: noop295, now: 1700000095000 });
        return wn.attrEventBonus.gunt === -3 && en.attrBonus != null;
      })(),
      'gunt=' + w295a3.attrEventBonus.gunt + ' 总额=' + sumA3 + ' 上限=' + CAP295 +
      ' ‖ 第二次掷后标签=' + JSON.stringify(e295a3b.attrBonus) + ' applied=' + JSON.stringify(!!ap295a3b.attrBonus));
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
      al.pills = { ap_pozhang: 1 }; al.pillOnce = al.pillOnce || {};   /* 🔧 N43：日限退役，不再需要摆一个 pillDay 绕开它 */
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
});
