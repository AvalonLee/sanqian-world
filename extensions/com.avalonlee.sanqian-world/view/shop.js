/* 坊市页（Tab 5 · 第册六批 2026-10-17 从 view/index.html 内联块整段搬出 · 正典 = UI 卷 §3.4 / §3.5a）
 * 范围 = 这一页的渲染 + 属于它的三条 act 分支（买 / 刷新 / 商人特席）——「一片 = 一页的呈现与它的动作」。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 **D7** 逐键对账）；形参名钉死 c ⇒ **本文件所有回调一律不许用 c**。
 * ⚠️ `pillAffix` / `pillCat` 是「同型面第二处」：门中供给（势力页，尚未外置）卖的就是坊市那四颗丹，
 *    两处必须同一套标签，所以这两个小函数随本件搬走、由势力页那一行经 `SQ.UI.shop.*` 回头调。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 丹药双标签子函数（**同型面第二处**）：门中供给（势力页 §六）卖的就是 `D.PILLS` 这四颗丹，
   * 坊市加了标签而那里不加 = 造一处新的不一致，故词缀 / 分类各抽一个纯函数、两处共用。 */
  function pillAffix(c, pill) {
    /* tier = 展示用字段（与同名丹方同档），不参与结算；缺字段就不挂词缀，不猜 */
    if (!pill || !pill.tier || !c.tierCls(pill.tier)) return '';
    return '<span class="tierbadge ' + c.tierCls(pill.tier) + '">' + c.esc(c.t('goods.tier.' + pill.tier)) + '</span>';
  }
  function pillCat(c) { return '<span class="catbadge">' + c.esc(c.t('shop.cat.pill')) + '</span>'; }

  /* 货架卡片双标签（坊市标签批 2026-10-09 · UI 卷 §3.4）：词缀 chip（品阶 / 性质，彩色 tierbadge）
   * + 分类 chip（灰描边 catbadge）。**一处取数、两处共用**——坊市货架与神秘商人特席此前各拼一套
   * （特席：法器有品阶、功法没有、丹药一个都没有），那正是「同一种货两张卡三种口径」的成因。
   * ⚠️ 无词缀的货类（材料包 / 图纸 / 丹炉成品 / 灵石包）**如实留空**，不为了凑齐两枚 chip 编一个档次。
   * 返回串以空格起头，直接拼在名称后。 */
  function tagHtml(c, it) {
    var d = c.d, p = c.p, aff = '', cat = '', k = it.kind, gp = it.pack;
    if (k === 'gear' && it.gear) {
      aff = '<span class="tierbadge t' + it.gear.tier + '">' + c.esc(c.t('gear.tier.' + it.gear.tier)) + '</span>';
      cat = '<span class="catbadge">' + c.esc(c.t('gear.system')) + '</span>';
    } else if (k === 'arts') {
      var a = p.artsMap()[it.ref];
      if (a && c.tierCls(a.tier)) aff = '<span class="tierbadge ' + c.tierCls(a.tier) + '">' + c.esc(c.t('skill.tier.' + a.tier)) + '</span>';
      cat = '<span class="catbadge">' + c.esc(c.t('skill.system')) + '</span>';
    } else if (k === 'pill') {
      var pl2 = null;
      (d.PILLS || []).forEach(function (x) { if (x.id === it.ref) pl2 = x; });
      aff = pillAffix(c, pl2); cat = pillCat(c);
    } else if (k === 'treasure') {
      var td = SQ.Treasures.def(p, it.ref);
      if (td) aff = '<span class="tierbadge ' + c.kindCls(td.kind) + '">' + c.esc(c.t('treasure.kind.' + td.kind)) + '</span>';
      cat = '<span class="catbadge">' + c.esc(c.t('treasure.system')) + '</span>';
    } else if (k === 'pack' && gp) {
      if (gp.type === 'recipe') {
        var rc = ((d.ALCHEMY || {}).RECIPES || []).filter(function (r) { return r.id === gp.ref; })[0];
        if (rc && rc.tier && c.tierCls(rc.tier)) aff = '<span class="tierbadge ' + c.tierCls(rc.tier) + '">' + c.esc(c.t('goods.tier.' + rc.tier)) + '</span>';
      }
      cat = '<span class="catbadge">' + c.esc(c.t('alchemy.system')) + '</span>';
    } else if (k === 'pack') {
      cat = '<span class="catbadge">' + c.esc(c.t('shop.cat.pack')) + '</span>';
    }
    return (aff ? ' ' + aff : '') + (cat ? ' ' + cat : '');
  }

  /* 货架件名与价格文案的唯一取数口（本批立 · 三处同源：货架卡 / 购单 CONFIRM / 商人特席）。
   * 立因：CONFIRM 那处自抄了一套三元式且没跟上 pack 子货（材料包/丹方/图纸/丹炉成品），
   * 买「丹炉成品」弹出「确认购入『灵石包』？价格 修为 0」——名称取 `shop.pack.name`、
   * 价格取根本不存在的 `it.qiPrice`（`fmt(undefined)` = 0）。 */
  function goodName(c, it) {
    if (it.kind === 'gear' && it.gear) return it.gear.name;
    if (it.kind === 'pill') return c.t('pill.' + it.ref + '.name');
    if (it.kind === 'arts') return c.t('skill.' + it.ref + '.name');
    if (it.kind === 'treasure') return c.t('treasure.' + it.ref + '.name');
    var gp = it.pack;
    if (gp) return gp.type === 'mat' ? c.t('alchemy.good.mat')
      : gp.type === 'recipe' ? c.t('alchemy.good.recipe', { name: c.t('alchemy.recipe.' + gp.ref + '.name') })
      : gp.type === 'bp' ? c.t('alchemy.good.bp', { name: c.t('alchemy.bp.' + gp.ref + '.name') })
      : c.t('alchemy.good.furnace');
    return c.t('shop.pack.name');
  }
  /* 只有**灵石包**这一种货耗修为（其余含 pack 子货一律按灵石计价）⇒ 判据取 `!it.pack`，
   * 不是取 `kind === 'pack'`（后者把子货也算成灵石包）。 */
  function priceTxt(c, it) {
    return (it.kind === 'pack' && !it.pack)
      ? c.t('shop.qiprice', { p: SQ.fmt(it.qiPrice) })
      : c.t('shop.price', { n: SQ.fmt(it.price) }) + ' ' + c.t('resource.currency');
  }

  /* 货架卡（B15-e · 设计稿 .goods）：名称行（含词缀/分类 chip）→ 效果行 → 价格行（朱砂衬线，底部对齐）。
   * 结构仍是「卡片 div + 内部购买按钮」——设计稿把整张卡当按钮，但本页 `[data-act="buy"]` 是走查与
   * 事件委托的锚点，故保留按钮、把它排成价格行（按钮文字 = 价格，aria-label 说明动作）。
   * 类名保留 `.shopcard`（market 走查按它计数），视觉由 `.goods` 承担。 */
  function itemRow(c, it, idx, black, w) {
    var nameHtml = '', effHtml = '';
    if (it.kind === 'gear') {
      nameHtml = c.esc(goodName(c, it)) + tagHtml(c, it) +
        (it.gear.special ? ' <span class="special-mark">' + c.esc(c.t('gear.special.' + it.gear.special)) + '</span>' : '');
      effHtml = c.esc(c.statLine(it.gear));
      if (!SQ.Gear.canWear(it.gear, w)) {
        effHtml += '<div class="g-warn">' + c.esc(c.t('gear.req', { realm: c.t('realm.' + it.gear.reqs.realm) })) + '</div>';
      }
    } else if (it.kind === 'pill') {
      nameHtml = c.esc(goodName(c, it)) + tagHtml(c, it);
      effHtml = c.esc(c.t('pill.' + it.ref + '.desc'));
    } else if (it.kind === 'arts') {
      var a = c.p.artsMap()[it.ref];
      /* 情报角标（势力全录卷 §9.9 · B4）：intelArts 条目在坊市显示「情报」角标 + 豁免提示行 */
      var intelS = !!(w.intelArts && w.intelArts[it.ref]);
      nameHtml = '<span class="align-sym align-' + a.alignment + '">' + c.esc(c.t('align.sym.' + a.alignment)) + '</span>' +
        c.esc(goodName(c, it)) +
        (intelS ? ' <span class="tierbadge t2">' + c.esc(c.t('faction.intel.tag')) + '</span>' : '') + tagHtml(c, it);
      effHtml = c.esc(c.t('skill.' + it.ref + '.desc')) +
        (intelS ? '<div class="g-warn" style="color:var(--sq-tier-2)">' + c.esc(c.t('faction.intel.ignore')) + '</div>' : '');
    } else if (it.kind === 'treasure') {
      var td = SQ.Treasures.def(c.p, it.ref);
      nameHtml = c.esc(goodName(c, it)) + tagHtml(c, it);
      effHtml = c.esc(c.t('treasure.grade.' + td.grade)) + ' · ' + c.esc(c.t('treasure.' + it.ref + '.desc'));
    } else if (it.pack) {
      /* 炼丹炼器子货（材料包/丹方/图纸/丹炉成品 · §2.5 pack 格二级权重） */
      var gp = it.pack;
      nameHtml = c.esc(goodName(c, it)) + tagHtml(c, it);
      effHtml = c.esc(gp.type === 'recipe' ? c.t('alchemy.recipe.' + gp.ref + '.name')
        : (gp.type === 'bp' ? c.t('alchemy.bp.' + gp.ref + '.desc')
          : (gp.type === 'mat' ? c.t('alchemy.shopdesc.mat') : c.t('alchemy.furnace.desc'))));
    } else {
      nameHtml = c.esc(goodName(c, it)) + tagHtml(c, it);
      effHtml = c.esc(c.t('shop.pack.desc')) + ' → ' + SQ.fmt(it.stones) + ' ' + c.esc(c.t('resource.currency'));
    }
    /* 价格行 */
    var priceHtml = '', discHtml = '';
    if (it.sold) {
      priceHtml = '<span class="g-sold">' + c.esc(c.t('shop.sold')) + '</span>';
    } else {
      var price = priceTxt(c, it);
      /* 道友折扣可视化（B9 · 坊市稿）：柳三变「消息灵通」在位 → 划线参考原价 + 绿字生效行。
       * 原价 = 现价按当前乘区反推去掉 bond 份额（同一 mods 快照，参考口径如实标注）。 */
      var mS = c.mods;
      var bS = ((mS.detail || {}).shopCost || {}).bond || 0;
      var wasHtml = '';
      if (bS < 0 && it.kind !== 'pack') {
        var sumS = (mS.sum || {}).shopCost || 0;
        var wasP = Math.round(it.price * (1 + sumS - bS) / (1 + sumS));
        if (wasP > it.price) wasHtml = '<span class="pricewas">' + SQ.fmt(wasP) + '</span>';
        discHtml = '<div class="g-disc">' + c.esc(c.t('shop.bond.discount', { p: Math.round(-bS * 100) })) + '</div>';
      }
      priceHtml = '<button class="g-buy" data-act="buy" data-v="' + idx + '" data-b="' + (black ? 1 : 0) + '"' +
        ' aria-label="' + c.esc(c.t('shop.buy') + ' ' + goodName(c, it)) + '">' +
        wasHtml + c.esc(price) + '</button>';
    }
    return '<div class="goods shopcard' + (it.sold ? ' sold locked' : '') + '">' +
      '<div class="g-n nm">' + nameHtml + '</div>' +
      '<div class="g-e meta">' + effHtml + '</div>' +
      '<div class="g-p acts">' + priceHtml + discHtml + '</div></div>';
  }

  function render(c) {
    var w = c.w, d = c.d, m = c.mods;
    var blackOpen = SQ.Shop.blackOpen(w, c.p, d);
    var restockMs = Math.max(0, (isFinite(+((w.shop || {}).nextRestock)) ? +w.shop.nextRestock : 0) - Date.now());
    var rh = Math.floor(restockMs / 3600000), rm = Math.floor((restockMs % 3600000) / 60000);
    /* 页头：左「坊市/黑市」药丸切换（设计稿 .segmini）+ 右圆形刷新钮，同排水平对齐 */
    var h = '<div class="pagehead split"><div class="segmini chips">';
    h += '<button class="' + (c.ui.shopBlack ? '' : 'on') + '" data-act="shopTab" data-v="0">' + c.esc(c.t('shop.system')) + '</button>';
    if (blackOpen || (w.shop.blackItems || []).some(function (x) { return x.sold; })) {
      h += '<button class="' + (c.ui.shopBlack ? 'on' : '') + '" data-act="shopTab" data-v="1">' + c.esc(c.t('shop.blackmarket')) + '</button>';
    }
    h += '</div>';
    h += '<button class="refreshbtn" data-act="refreshShop">' +
      c.esc(c.t('shop.refresh', { n: SQ.fmt(SQ.Shop.refreshFee(w, c.p, d, m)) })) + '</button></div>';
    if (c.ui.shopBlack && !blackOpen) {
      h += '<p class="hint">' + c.esc(c.t('shop.blackHint')) + '</p>';
    }
    h += '<div class="kv"><span class="hint">' + c.esc(c.t('shop.restock', { t: rh > 0 ? c.t('ui.time.hm', { h: rh, m: rm }) : c.t('ui.time.m', { m: Math.max(1, rm) }) })) + '</span></div>';
    /* 神秘商人特席（势力批 v2.4 §8）：交好奇遇开启、10 分钟自动离去；scout = 无视后的更好货 */
    var merch = w.shop && w.shop.merchant;
    if (merch && merch.until > Date.now()) {
      h += '<div class="merchbox"><div class="mh"><span class="t">' +
        c.esc(c.t('shop.merchant.title') + (merch.scout ? ' ' + c.t('shop.merchant.scout') : '')) + '</span>' +
        '<span class="hint">' + c.esc(c.t('shop.merchant.left', { t: c.timeLeft(Math.max(0, merch.until - Date.now())) })) + '</span></div>' +
        '<p class="hint" style="margin:2px 0 6px">' + c.esc(c.t('shop.merchant.hint')) + '</p><div class="shopgrid">';
      (merch.items || []).forEach(function (it, i) {
        if (it.sold) {
          h += '<div class="goods shopcard sold locked"><div class="g-n nm">—</div>' +
            '<div class="g-p acts"><span class="g-sold">' + c.esc(c.t('shop.sold')) + '</span></div></div>';
          return;
        }
        /* 词缀 + 分类一律走同一套 `tagHtml`（与货架同一函数）——旧写法在此另拼一套，
         * 结果特席上「法器有品阶、功法没有、丹药一个都没有」，同一件货在两个货架上标签不一致。
         * 名与价同走 goodName / priceTxt（特席旧式的三元式不含 treasure ⇒ 法宝会错显成丹药名）。 */
        h += '<div class="goods shopcard"><div class="g-n nm">' + c.esc(goodName(c, it)) + tagHtml(c, it) + '</div>' +
          '<div class="g-e meta">' + c.esc(priceTxt(c, it)) + '</div>' +
          '<div class="g-p acts"><button class="g-buy" data-act="buyMerchant" data-v="' + i + '"' +
          (w.stones < it.price ? ' disabled' : '') + '>' + c.esc(c.t('shop.buy')) + '</button></div></div>';
      });
      h += '</div></div>';
    }
    var items = c.ui.shopBlack ? (w.shop.blackItems || []) : w.shop.items;
    h += '<div class="shopgrid">';
    items.forEach(function (it, i) { h += itemRow(c, it, i, c.ui.shopBlack, w); });
    h += '</div>';
    if (c.ui.shopBlack) h += '<p class="hint">' + c.esc(c.t('shop.blackHint')) + '</p>';
    c.$('tab-shop').innerHTML = h;
  }

  /* ── 属于本页的三条动作（第册六批随片搬出；分派处只留一行调用，顺序与早退语义不变）── */
  /* 拒因分键（F15 · N33②）：此前一枚 shop.fail.other 盖住 sold / closed / stale / poor / owned / shelffull
   * 六种 ⇒ 屏上那句「货已卖出，或手头不足」对其中半数会说谎。按 reason 取词；未知 reason 仍兜底成话，
   * 绝不裸拉丁上屏（与 alchemy.ui.fail / legacy.ui.fail 同一条兜底形状）。 */
  function failText(c, reason) {
    var k = 'shop.fail.' + reason, s = c.t(k);
    return s === k ? c.t('shop.fail.other') : s;
  }
  async function actBuy(c, idx, black) {
    var it = (black ? c.w.shop.blackItems : c.w.shop.items)[idx];
    if (!it) { c.renderAll(); return; }
    var nm = goodName(c, it);
    var price = priceTxt(c, it);
    /* 弹窗是无阻塞的：CONFIRM 开着的时候秒级 tick 仍会跑，4h 补货或手动刷新会把
     * `ws.shop.items` **整表替换**，此时旧序号指向的是另一件货 ⇒ 第廿六批实测：弹窗写
     * 「春风化雨篇 · 2,300 灵石」，点确认实扣 360 买走一件法器。故开弹窗时先记身份指纹，
     * 确认时复查「这一格还是不是它」，不是就不成交（与引擎先判后扣同一族）。 */
    var sig = SQ.Shop.goodSig(it);
    /* 第卌六批：买的是要求未达的功法 ⇒ 成交后它会进待修习架（不是丢），确认框里先把去向说清；
     * 判定与引擎同一把 `SQ.Arts.canLearn`（视图不自建一套门槛口径）。 */
    var body = c.t('shop.confirm', { name: nm, price: price }) +
      (it.kind === 'arts' && !SQ.Arts.canLearn(c.w, c.p, c.d, it.ref) ? ' ' + c.t('shop.confirm.shelf') : '');
    c.ask(c.t('shop.buy'), body, async function () {
      /* 指纹回给引擎复查（SQ.Shop.buy 里 reason:'stale' ⇒ 分文不动），视图不再自判一套 */
      var rBy = await SQ.Actions.buy(c.s, idx, black, sig);
      /* 丹匣满 / 已拥有 / 待修习架已满 ⇒ 引擎在扣钱之前整笔拒单（先判后扣），屏上必须说一句 ——
       * 与 #272/#273 那条「失败不告警」同族，未知 reason 走 .other 兜底、不打内部字段名 */
      if (rBy && rBy.ok === false)
        c.toast(failText(c, (rBy && rBy.reason) || 'other'));
      c.renderAll();
    });
  }
  async function actRefresh(c) {
    await SQ.Actions.refreshShop(c.s, c.ui.shopBlack);
    c.renderAll();
  }
  async function actMerchant(c, idx) {
    /* 特席拒因必须有中文回显（第十七批复核 M2）：匣满时扣钱前的拒单在屏上是静默的 */
    var rMc = await SQ.Actions.buyMerchant(c.s, idx);
    if (rMc && rMc.ok === false)
      c.toast(failText(c, (rMc && rMc.reason) || 'other'));
    c.renderAll();
  }

  SQ.UI = SQ.UI || {};
  SQ.UI.shop = {
    render: render, pillAffix: pillAffix, pillCat: pillCat,
    actBuy: actBuy, actRefresh: actRefresh, actMerchant: actMerchant
  };
})();
