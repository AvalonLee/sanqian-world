/* systems/gifts.js — 天降礼包（2026-10-21 用户令重做「页游彩蛋」）
 *
 * 机制：24 条轮播文案（eggs.gift.p0~p23），10 分钟换一条；每条按序号派生扣费类型与档位：
 *   · 偶数条扣灵石、奇数条扣修为；
 *   · 档位 5% / 8% / 11% / 14% / 17% 循环（按**当前值**取整，至少 1）。
 * 支付后掷结果：35% 低档装备、25% 低阶功法、40% 空包。
 * 宣传文案（name/offer）只负责「高大上」，结果文案必须如实说开出了什么——这是恶搞页游套路的底线：
 * 可以吹牛，不能把实际给的东西说成别的。
 * 无新增落盘字段：轮播序号与到期时刻只活在 ui（会话态）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var PCTS = [0.05, 0.08, 0.11, 0.14, 0.17];
  var N = 24;
  var ROLL_MS = 600000;
  var COOLDOWN_MS = 180000;

  function offer(idx) {
    var i = Math.max(0, Math.min(N - 1, idx | 0));
    return {
      idx: i,
      nameKey: 'eggs.gift.p' + i + '.name',
      offerKey: 'eggs.gift.p' + i + '.offer',
      costType: i % 2 === 0 ? 'stones' : 'qi',
      pct: PCTS[i % PCTS.length]
    };
  }

  /* 当前应付：按当前值的百分比向下取整，至少 1；余额为 0 时为 0（买不起）。 */
  function costOf(ws, idx) {
    var o = offer(idx);
    var cur = o.costType === 'stones' ? (ws.stones || 0) : (ws.qi || 0);
    if (cur <= 0) return { type: o.costType, n: 0, pct: o.pct };
    return { type: o.costType, n: Math.max(1, Math.floor(cur * o.pct)), pct: o.pct };
  }

  /* 买一次：先判后扣（余额不足整笔不成交），再掷结果并入账。
   * 返回 { ok, reason?, cost, kind, item?, art? } 供结果弹窗/日志消费。 */
  function buy(ws, pack, D, mods, idx, now, log) {
    var o = offer(idx);
    var wid = pack.worldId;
    var c = costOf(ws, idx);
    var cur = c.type === 'stones' ? (ws.stones || 0) : (ws.qi || 0);
    if (!c.n || cur < c.n) return { ok: false, reason: 'poor', cost: c, offer: o };
    if (c.type === 'stones') {
      ws.stones = cur - c.n;
      if (SQ.Ledger) SQ.Ledger.note(ws, 'out', 'event_loss', c.n);
    } else {
      ws.qi = cur - c.n;
    }
    var out = { ok: true, cost: c, offer: o, kind: 'none' };
    var roll = Math.random();
    if (roll < 0.35 && SQ.Gear) {
      /* 低档装备：境界 0 的缩放 + 黄阶；autoEquip 负责穿戴/入库/溢出炼化 */
      var it = SQ.Gear.roll(ws, pack, D, 0, mods, { tier: 0, source: { type: 'gift', ref: o.idx } });
      if (it) {
        SQ.Gear.autoEquip(ws, pack, D, mods, it, log);
        out.kind = 'gear'; out.item = it;
        if (log) log('gear', SQ.t('eggs.gift.log.gear', {
          item: SQ.Gear.nameOf(it.slot, wid), tier: SQ.t('gear.tier.' + it.tier, null, wid)
        }, wid));
      }
    } else if (roll < 0.60 && SQ.Arts) {
      var arts = pack.artsMap ? pack.artsMap() : {};
      var pool = Object.keys(arts).filter(function (id) {
        return arts[id] && arts[id].tier === 'huang' && !SQ.Arts.owned(ws, id);
      });
      if (pool.length) {
        var pick = pool[Math.floor(Math.random() * pool.length)];
        SQ.Arts.gainArt(ws, pack, D, pick, log);
        out.kind = 'art'; out.art = pick;
        if (log) log('arts', SQ.t('eggs.gift.log.art', {
          art: SQ.t('skill.' + pick + '.name', null, wid), tier: SQ.t('skill.tier.' + arts[pick].tier, null, wid)
        }, wid));
      }
    }
    if (out.kind === 'none' && log) {
      log('sys', SQ.t('eggs.gift.log.none', {
        promise: SQ.t(o.offerKey, null, wid)
      }, wid));
    }
    return out;
  }

  /* 礼包展示态（会话 ui，不落盘）：买完先空置 COOLDOWN_MS，到期才换下一条；换时避免与上一条相同。
   * 返回 { mode:'cool', until } 或 { mode:'offer', idx, until }，两处卡片（右栏 / 窄屏中区）共用。 */
  function state(ui, now) {
    if (ui.giftCooldownUntil && now < ui.giftCooldownUntil) {
      return { mode: 'cool', until: ui.giftCooldownUntil };
    }
    if (ui.giftUntil == null || now >= ui.giftUntil) {
      var prev = ui.giftI;
      var nxt = Math.floor(Math.random() * N);
      if (nxt === prev && N > 1) nxt = (nxt + 1) % N;
      ui.giftI = nxt;
      ui.giftUntil = now + ROLL_MS;
    }
    return { mode: 'offer', idx: ui.giftI, until: ui.giftUntil };
  }

  SQ.Gifts = {
    N: N,
    ROLL_MS: ROLL_MS,
    COOLDOWN_MS: COOLDOWN_MS,
    offer: offer,
    costOf: costOf,
    state: state,
    buy: buy
  };
})();
