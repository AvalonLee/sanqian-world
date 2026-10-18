/* systems/shop.js — G6 商店（坊市/黑市）：补货 / 阶梯刷新 / 购买
 * 规则源：数值详设 §五（5 格货架、4h 真实时间补货、刷新费 20/50/100/200/400 每补货周期重置、
 * 商品池 40/25/20/15、价格 = 基准×(1+境界×0.4)×(1+ΣshopCost)、黑市 karma≤-200 价×1.3）。
 * item: {kind:'gear'|'pill'|'arts'|'pack', ref, price, qiPrice?, sold}
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  function priceOf(base, ws, D, mods, discount, black) {
    var p = base * (1 + ws.realm * D.SHOP_PRICE_REALM) * (1 + mods.sum.shopCost);
    if (black) p *= D.BLACKMARKET_PRICE;
    if (discount) p *= (1 - discount);
    return Math.max(1, Math.ceil(p));
  }

  var pickPairs = SQ.util.pickPairs;   /* C2：统一至 assets/util.js */

  /* 货架格数取数处（坊市格数随机批 2026-10-09 · 数值详设 §5.1）：闭区间 [MIN, MAX] 等概率。
   * 表缺键时按「MIN=MAX=10」回落 ⇒ 老数据形状下行为与改前逐字相同，不会因缺键炸出 0 格货架。 */
  function slotCount(D) {
    var lo = D.SHOP_SLOTS_MIN != null ? D.SHOP_SLOTS_MIN : (D.SHOP_SLOTS != null ? D.SHOP_SLOTS : 10);
    var hi = D.SHOP_SLOTS_MAX != null ? D.SHOP_SLOTS_MAX : lo;
    if (hi < lo) hi = lo;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function genShelf(ws, pack, D, mods, black) {
    var items = [];
    var discount = ws.shop.discount || 0;
    var artsMap = pack.artsMap();
    var xt = pack.treasures;
    /* 法宝候选（法宝全录 §五）：坊市售后天、黑市售魔道；只出未持有者，池枯竭回落装备格 */
    function treasureCand(blk) {
      if (!xt) return null;
      var ids = blk ? xt.BLACK_IDS : xt.SHOP_IDS;
      var cands = ids.filter(function (id) { return !SQ.Treasures.entryOf(ws, id); });
      return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
    }
    function pushGear(zoneIdx, blk) {
      var g = SQ.Gear.roll(ws, pack, D, zoneIdx, mods, blk
        ? { align: 'evil', source: { type: 'shop', ref: null } }
        : { source: { type: 'shop', ref: null } });
      items.push({
        kind: 'gear', gear: g, sold: false,
        price: priceOf(D.GEAR_TIERS[g.tier].refine * D.SHOP_GEAR_REFINE_MULT, ws, D, mods, discount, blk)
      });
    }
    var nSlots = slotCount(D);      /* 每架独立掷一次格数（10~16）*/
    for (var i = 0; i < nSlots; i++) {
      var kind;
      if (black) {
        kind = pickPairs([[50, 'gear'], [35, 'arts'], [15, 'treasure']]); /* 黑市只售魔道装备/功法/法宝 */
      } else {
        kind = pickPairs([
          [D.SHOP_POOL_W.gear, 'gear'], [D.SHOP_POOL_W.pill, 'pill'],
          [D.SHOP_POOL_W.arts, 'arts'], [D.SHOP_POOL_W.pack, 'pack'],
          [D.SHOP_POOL_W.treasure || 0, 'treasure']
        ]);
      }
      if (kind === 'gear') {
        var zoneIdx = Math.min(ws.realm, D.ZONES.length - 1);
        /* 商店装备走基础阵营分布（dropAlignW 位移仅作用于 G3 掉落，数值详设 §3.3）；source=shop（v2.3 溯源） */
        pushGear(zoneIdx, black);
      } else if (kind === 'pill') {
        var pill = D.PILLS[Math.floor(Math.random() * D.PILLS.length)];
        items.push({ kind: 'pill', ref: pill.id, sold: false, price: priceOf(pill.price, ws, D, mods, discount, black) });
      } else if (kind === 'arts') {
        /* 功法商品只出「未持有且该渠道可得」（验收 4.4 #41）；正道/左道走坊市、魔道走黑市。
         * 情报白名单（势力全录卷 §9.2 · 系统深化批 A5）：id ∈ ws.intelArts → 豁免渠道匹配——
         * 坊市/黑市双渠道均可上架，价格照 obtain.price 现行口径（情报只授市面渠道功法，价必存在）。 */
        var cands = [];
        for (var id in artsMap) {
          var a = artsMap[id];
          var chan = black ? 'black' : 'shop';
          var intel = !!(ws.intelArts && ws.intelArts[id]);
          if (intel) {
            if (!(a.obtain && (a.obtain.type === 'shop' || a.obtain.type === 'black') && a.obtain.price)) continue;
          } else if (a.obtain.type !== chan) continue;
          if (SQ.Arts.owned(ws, id)) continue;
          cands.push(id);
        }
        if (!cands.length) { /* 池枯竭 → 回落装备格 */
          pushGear(Math.min(ws.realm, D.ZONES.length - 1), black);
          continue;
        }
        var aid = cands[Math.floor(Math.random() * cands.length)];
        items.push({ kind: 'arts', ref: aid, sold: false, price: priceOf(artsMap[aid].obtain.price, ws, D, mods, discount, black) });
      } else if (kind === 'treasure') {
        var tid = treasureCand(black);
        if (!tid) { pushGear(Math.min(ws.realm, D.ZONES.length - 1), black); continue; }
        var tdef = xt.byId[tid];
        items.push({
          kind: 'treasure', ref: tid, sold: false,
          price: priceOf((xt.PRICE && xt.PRICE[tdef.grade]) || 6000, ws, D, mods, discount, black)
        });
      } else {
        /* pack 格（「灵石包/材料」格语义兑现 · 炼丹炼器卷 §2.5）：坊市侧按 SHOP_PACK_W 二级权重
         * 掷子货（灵石包 50 / 材料包 25 / 丹方 10 / 器图纸 10 / 丹炉成品 5，只上未持有、空池摊回）；
         * 顶层 SHOP_POOL_W 零改动；黑市不入炼丹炼器货格（保持旧灵石包） */
        var pg = null;
        if (!black && D.ALCHEMY && SQ.Alchemy && ws.realm >= (D.ALCHEMY.UNLOCK_REALM != null ? D.ALCHEMY.UNLOCK_REALM : 1)) {
          pg = SQ.Alchemy.rollPackGood(ws, pack, D);
        }
        if (pg && pg.type !== 'pack') {
          items.push({ kind: 'pack', pack: pg, sold: false, price: priceOf(pg.price, ws, D, mods, discount, false) });
          continue;
        }
        items.push({
          kind: 'pack', sold: false, price: 0,
          qiPrice: Math.ceil(SQ.Idle.capOf(ws, pack, D, mods) * D.PACK_QI_PCT),
          /* 灵石包走三次方锚（坊市 qi→灵石 兑换，独立于奇遇灵石经济；§十三.8 双锚拆分） */
          stones: Math.round(D.PACK_STONES * SQ.Events.qiScaleOf(ws, D))
        });
      }
    }
    return items;
  }

  /* 货架件身份指纹（第廿六批 · 弹窗与成交同源）：CONFIRM 是无阻塞弹窗，它开着的时候秒级
   * tick 仍会跑，4h 补货或手动刷新会把 `ws.shop.items` **整表替换** ⇒ 旧序号指向另一件货。
   * 实测形状：弹窗写「春风化雨篇 · 2,300 灵石」，点确认实扣 360 买走一件法器。
   * 故开弹窗时把指纹交给引擎，成交前复查「这一格还是不是它」，对不上就分文不动地拒单。
   * 法器是随机生成的实例（无稳定 id）⇒ 用它的属性组合当指纹（同指纹即同一件）。 */
  function goodSig(it) {
    if (!it) return '';
    var g = it.pack ? (it.pack.type + ':' + (it.pack.ref || '')) : '';
    var ge = it.gear ? SQ.Gear.itemSig(it.gear) : '';   /* 与库藏同一口径（第廿六批）， gear 指纹只此一处 */
    return [it.kind, it.ref || '', g, ge, it.price, it.qiPrice, it.stones].join('|');
  }

  /* 落点前置判定（第廿六批 2026-10-13 · 用户报「买了春风化雨，法与器里却没解锁」）：
   * 掷货时按「未持有」过滤候选，但货架要挂满 4 小时才补货——这期间玩家可能已经通过
   * 自悟 / 奇遇 / 残片兑换 / 图纸打造拿到同一件 ⇒ 旧写法不复查，于是**照扣钱、零收益、零日志**
   * （实测：功法 2,300、丹方 400、图纸 600、丹炉 2,000、法宝 6,000 全是这个形状）。
   * 现按本仓「先判后扣」纪律（第十七批 pillfull 同族）在扣钱**之前**拦住；
   * 未达标且待修习架已满也不再折半收单（gainArt 的溢出折算只留给白拿的渠道）。
   * 返回 null = 可成交；否则给出拒因（视图侧统一回显中文，未知 reason 走 shop.fail.other 兜底）。 */
  function undeliverable(ws, pack, D, it) {
    if (!it) return 'sold';
    if (it.sold) return 'sold';
    if (it.kind === 'arts') {
      if (SQ.Arts.owned(ws, it.ref)) return 'owned';
      if (!SQ.Arts.canLearn(ws, pack, D, it.ref) && (ws.shelf || []).length >= D.SHELF_CAP) return 'shelffull';
    } else if (it.kind === 'pack' && it.pack) {
      if (SQ.Alchemy.goodOwned(ws, D, it.pack)) return 'owned';
    } else if (it.kind === 'treasure') {
      if (SQ.Treasures.entryOf(ws, it.ref)) return 'owned';
    }
    return null;
  }

  /* 门中供给价（卷面「坊市价 ×2」的唯一实现，第十四批审计 #8）：与商人特席那一格同走 priceOf
   * ⇒ 吃 shopCost 乘区、同 Math.ceil 口径。此前 factions.js 与 view 各自内联
   *   `Math.round(price × 2 × (1 + realm × SHOP_PRICE_REALM))`，既不吃 shopCost 也取整不同
   *   ⇒ 带 −15% shopCost 的法宝在场时，门中价是坊市价的 2.35 倍而不是 2 倍（正典不成立）。 */
  function supplyPriceOf(pill, ws, D, mods) {
    return priceOf(pill.price * (D.FACTION_SUPPLY_PRICE_MULT != null ? D.FACTION_SUPPLY_PRICE_MULT : 2), ws, D, mods, 0, false);
  }

  SQ.Shop = {
    goodSig: goodSig,   /* 第廿六批：货架件身份指纹（视图与引擎同一口径） */
    undeliverable: undeliverable,   /* 第廿六批：扣钱前的落点判定（视图在 CONFIRM 回调里也用它复查「还是不是那一件」） */
    supplyPriceOf: supplyPriceOf,   /* 门中供给价唯一取数口（factions.buySupply 与视图同调，审计 #8） */
    slotCount: slotCount,   /* 格数取数处（判据 #285 与 #206 最坏态模型同读这一处）*/
    /* 黑市可见性（karma ≤ -200；回升消失、已购保留——购买记录即 ws 内既有状态） */
    blackOpen: function (ws, pack, D) {
      if (!pack.worldSystems || !pack.worldSystems.karmaOf) return false;
      return pack.worldSystems.karmaOf(ws) <= D.BLACKMARKET_KARMA;
    },

    /* ── 神秘商人特席（势力批 v2.4 §8 · 交好分支）：席期 = D.MERCHANT_DURATION_MS（第册廿八批 F1 起 30 分钟）的高级货架 ──
     * 装备起步灵品（MERCHANT_GEAR_TIER）；「无视」 scouts 标记 → 品阶 +1（上探仙品）并消耗；
     * 功法出未持有的地/天阶（独占除外）；第三格高级丹药（破障丹）。 */
    openMerchant: function (ws, pack, D, mods, now, log) {
      var scout = !!ws.merchantScout;
      ws.merchantScout = false;                    /* scout 一次性消耗（无视 → 下次货更好） */
      var tierMin = Math.min(D.GEAR_TIERS.length - 1, (D.MERCHANT_GEAR_TIER || 3) + (scout ? 1 : 0));
      var items = [];
      var g = SQ.Gear.roll(ws, pack, D, Math.min(ws.realm, D.ZONES.length - 1), mods,
        { tierMin: tierMin, source: { type: 'shop', ref: 'merchant' } });
      items.push({ kind: 'gear', gear: g, sold: false,
        price: priceOf(D.GEAR_TIERS[g.tier].refine * (D.MERCHANT_PRICE_MULT || 3), ws, D, mods, 0, false) });
      /* 高级功法：未持有的地/天阶（排除天阶独占——那是奇遇专属通道） */
      var artsMap = pack.artsMap(), cands = [];
      for (var id in artsMap) {
        var a = artsMap[id];
        if ((a.tier !== 'di' && a.tier !== 'tian') || a.obtain.type === 'event_locked') continue;
        if (SQ.Arts.owned(ws, id)) continue;
        cands.push(id);
      }
      if (cands.length) {
        var aid = cands[Math.floor(Math.random() * cands.length)];
        items.push({ kind: 'arts', ref: aid, sold: false,
          price: priceOf((artsMap[aid].obtain.price || 1200) * (D.MERCHANT_PRICE_MULT || 3) / 3, ws, D, mods, 0, false) });
      } else {
        var g2 = SQ.Gear.roll(ws, pack, D, Math.min(ws.realm, D.ZONES.length - 1), mods,
          { tierMin: tierMin, source: { type: 'shop', ref: 'merchant' } });
        items.push({ kind: 'gear', gear: g2, sold: false,
          price: priceOf(D.GEAR_TIERS[g2.tier].refine * (D.MERCHANT_PRICE_MULT || 3), ws, D, mods, 0, false) });
      }
      var pill = null;
      for (var i = 0; i < D.PILLS.length; i++) if (D.PILLS[i].id === 'pozhang') pill = D.PILLS[i];
      if (pill) items.push({ kind: 'pill', ref: pill.id, sold: false,
        /* 这枚 ×2 与门中供给的 D.FACTION_SUPPLY_PRICE_MULT 同值不同义（一边是特席稀缺加价、一边是
         * 供给定价）。F9 定案 = 不合并、各留出处；要统一得先回答「特席是否跟随供给档」。 */
        price: priceOf(pill.price * 2, ws, D, mods, 0, false) });
      /* 双书扩容批 A5 + 二批 A5：特席先天法宝特位——scout 顶格时 50% 上架（MERCHANT_IDS 未持有随机一件，
       * x14 噬金虫王 / x15 护世之剑 / x16 玄青瓶；价格走 PRICE[grade] 基准无折扣） */
      var xtM = pack.treasures;
      if (scout && xtM && xtM.MERCHANT_IDS && SQ.Treasures && Math.random() < 0.5) {
        var mCands = xtM.MERCHANT_IDS.filter(function (id) { return !SQ.Treasures.entryOf(ws, id); });
        if (mCands.length) {
          var mTid = mCands[Math.floor(Math.random() * mCands.length)];
          var mDef = xtM.byId[mTid];
          items.push({ kind: 'treasure', ref: mTid, sold: false,
            price: priceOf((xtM.PRICE && mDef && xtM.PRICE[mDef.grade]) || 60000, ws, D, mods, 0, false) });
        }
      }
      ws.shop.merchant = { until: now + (D.MERCHANT_DURATION_MS || 1800000), items: items, scout: scout };
      if (log) log('shop', SQ.t('shop.merchant.open', null, pack.worldId));
      return ws.shop.merchant;
    },

    merchantActive: function (ws, now) {
      var m = ws.shop && ws.shop.merchant;
      return !!(m && m.until > now && (m.items || []).some(function (it) { return !it.sold; }));
    },

    /* 特席购买（mutate 通道内调用）：idx 为特席货架序号；返回 {ok, reason?, item?} */
    buyMerchant: function (ws, pack, D, mods, idx, log) {
      var m = ws.shop && ws.shop.merchant;
      if (!m || m.until <= Date.now()) return { ok: false, reason: 'closed' };
      var it = (m.items || [])[idx];
      if (!it || it.sold) return { ok: false, reason: 'sold' };
      var undM = undeliverable(ws, pack, D, it);   /* 同坊市：已拥有 / 架满 ⇒ 分文不动地拒（第廿六批） */
      if (undM) return { ok: false, reason: undM };
      if (ws.stones < it.price) return { ok: false, reason: 'poor' };
      var st2 = ws.stones;
      /* 丹药两族合一（第十七批）：坊市 / 黑市 / 特席买到的成品丹**入丹匣**，何时服用由玩家定
       * （旧行为是购买瞬间 applyEffects，玩家没有选择权）。**先判后扣**：匣满即拒单，
       * 灵石分文不动 —— 扣了钱却丢一颗丹 = 静默零收益那一族。 */
      if (it.kind === 'pill' && !SQ.Alchemy.pillRoom(ws, D, it.ref, 1)) return { ok: false, reason: 'pillfull' };
      ws.stones -= it.price;
      SQ.Ledger.note(ws, 'out', 'shop', st2 - ws.stones);
      it.sold = true;
      if (it.kind === 'gear') {
        SQ.Gear.autoEquip(ws, pack, D, mods, it.gear, log);
      } else if (it.kind === 'pill') {
        SQ.Alchemy.gainPill(ws, D, it.ref, 1, log, pack.worldId);
      } else if (it.kind === 'arts') {
        SQ.Arts.gainArt(ws, pack, D, it.ref, log);
      } else if (it.kind === 'treasure') {
        SQ.Treasures.gain(ws, pack, D, it.ref, log);
      }
      return { ok: true, item: it };
    },

    /* claim 内调用：4h 真实时间补货（时间戳判定，验收 4.4 #40） */
    restockIfDue: function (ws, pack, D, mods, now) {
      if (!ws.shop.nextRestock || now >= ws.shop.nextRestock) {
        ws.shop.items = genShelf(ws, pack, D, mods, false);
        if (SQ.Shop.blackOpen(ws, pack, D) || (ws.shop.blackItems || []).length) {
          ws.shop.blackItems = genShelf(ws, pack, D, mods, true);
        }
        ws.shop.nextRestock = now + D.SHOP_RESTOCK_H * 3600 * 1000;
        ws.shop.refreshStep = 0;
        ws.shop.discount = 0; /* 折扣用于本次补货后清零 */
        return true;
      }
      return false;
    },

    refreshFee: function (ws, pack, D, mods) {
      var step = Math.min(ws.shop.refreshStep || 0, D.SHOP_REFRESH_FEES.length - 1);
      var fee = D.SHOP_REFRESH_FEES[step];
      var jubao = mods.hooks.jubao || 0; /* 幡下聚宝：刷新费 -25%/-50% */
      return Math.max(1, Math.ceil(fee * (1 + jubao)));
    },

    /* 手动刷新：阶梯费前进；重生成货架（折扣同样生效并清零） */
    refresh: function (ws, pack, D, mods, black) {
      var fee = SQ.Shop.refreshFee(ws, pack, D, mods);
      if (ws.stones < fee) return false;
      var st0 = ws.stones;
      ws.stones -= fee;
      SQ.Ledger.note(ws, 'out', 'shop', st0 - ws.stones);
      ws.shop.refreshStep = (ws.shop.refreshStep || 0) + 1;
      if (black) ws.shop.blackItems = genShelf(ws, pack, D, mods, true);
      else ws.shop.items = genShelf(ws, pack, D, mods, false);
      ws.shop.discount = 0;
      return true;
    },

    /* 购买（mutate 通道内调用）：idx 为货架序号；返回 {ok, reason?, item?} */
    buy: function (ws, pack, D, mods, idx, black, log, expect) {
      var shelf = black ? ws.shop.blackItems : ws.shop.items;
      var it = shelf && shelf[idx];
      if (!it || it.sold) return { ok: false, reason: 'sold' };
      /* 弹窗与成交同源（第廿六批）：视图把开弹窗时记下的指纹带回来，对不上就是补货换过架 ⇒ 不成交 */
      if (expect && goodSig(it) !== expect) return { ok: false, reason: 'stale' };
      if (black && !SQ.Shop.blackOpen(ws, pack, D)) return { ok: false, reason: 'closed' };
      /* 先判后扣（第廿六批）：已拥有 / 未达标且架已满 ⇒ 分文不动地拒单（旧写法照扣钱、零收益、零日志） */
      var und = undeliverable(ws, pack, D, it);
      if (und) return { ok: false, reason: und };
      if (it.kind === 'pack' && it.pack) {
        /* 炼丹炼器子货（材料包/丹方/图纸/丹炉成品）：灵石购买记 out.shop，兑现走 Alchemy 写口 */
        if (ws.stones < it.price) return { ok: false, reason: 'poor' };
        var st3 = ws.stones;
        ws.stones -= it.price;
        SQ.Ledger.note(ws, 'out', 'shop', st3 - ws.stones);
        it.sold = true;
        SQ.Alchemy.deliverPackGood(ws, pack, D, mods, it.pack, log);
        return { ok: true, item: it };
      }
      if (it.kind === 'pack') {
        if (ws.qi < it.qiPrice) return { ok: false, reason: 'poor' };
        ws.qi -= it.qiPrice;
        var st1 = ws.stones;
        ws.stones += it.stones;
        /* 灵石包 = 花修为换灵石，与引灵入体同属「修为→灵石」阀门 → in.offline（§4.1 口径注） */
        SQ.Ledger.note(ws, 'in', 'offline', ws.stones - st1);
        it.sold = true;
        return { ok: true, item: it };
      }
      if (ws.stones < it.price) return { ok: false, reason: 'poor' };
      var st2 = ws.stones;
      /* 丹药两族合一（第十七批）：坊市 / 黑市 / 特席买到的成品丹**入丹匣**，何时服用由玩家定
       * （旧行为是购买瞬间 applyEffects，玩家没有选择权）。**先判后扣**：匣满即拒单，
       * 灵石分文不动 —— 扣了钱却丢一颗丹 = 静默零收益那一族。 */
      if (it.kind === 'pill' && !SQ.Alchemy.pillRoom(ws, D, it.ref, 1)) return { ok: false, reason: 'pillfull' };
      ws.stones -= it.price;
      SQ.Ledger.note(ws, 'out', 'shop', st2 - ws.stones);
      it.sold = true;
      if (it.kind === 'gear') {
        SQ.Gear.autoEquip(ws, pack, D, mods, it.gear, log);
      } else if (it.kind === 'pill') {
        SQ.Alchemy.gainPill(ws, D, it.ref, 1, log, pack.worldId);
      } else if (it.kind === 'arts') {
        /* 购买即获得；学习要求（含 karma 门槛）仍拦截 → 待修习架（验收 4.11 #101） */
        SQ.Arts.gainArt(ws, pack, D, it.ref, log);
      } else if (it.kind === 'treasure') {
        /* 法宝（法宝全录 §五）：购买即入法宝库；装备要求（境界/属性/业力）留到「祭出」时校验 */
        SQ.Treasures.gain(ws, pack, D, it.ref, log);
      }
      return { ok: true, item: it };
    }
  };
})();
