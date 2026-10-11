/* worlds/xiuxian/karma.js — 善恶系统（修仙专属 · 主文档 §六 v2.1）
 * 覆盖式重算（防刷分纪律）：karma = Σ功法(槽内 Lv×±2) + Σ装备(件×±15) + karmaEventScore + alignDrift，
 * clamp ±1000；档位边界取自 D.KARMA_TIERS（**整数域**下即 ≥+200 正道 / ≤-200 魔道 / 其间左道；
 * 表里中性下界是 -199.999，非整数 karma 落进 (-200, -199.999) 时按表判为魔道 —— 生产写点全程 Math.round ⇒ 不可达）。
 * ALIGN_EFFECTS（数值详设 §8.1 v1.13）：档位效果十字段（修炼/战力/奇遇时钟/掉落/性质权重/等级权重/
 * 掉落阵营分布/品阶上浮概率/判定dc/渡劫加项），按当前档位实时取，跨档瞬间切换。
 * alignDrift（主文档 §6.4）：创角倾向 × 12/天（在线离线均计），分量封顶 ±260；累积入口 = claim 编排层。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var BIAS_SIGN = { right: 1, neutral: 0, evil: -1 };

  SQ.XKarma = {
    /* 四分量构成（UI 浮层「功法/装备/平生所为/初心倾向」） */
    partsOf: function (ws, D) {
      var artsMap = SQ.XARTS;
      var arts = 0, gear = 0;
      (ws.artsSlots || []).forEach(function (id) {
        if ((ws.artsKnown || []).indexOf(id) < 0) return;
        var a = artsMap[id];
        if (!a) return;
        var lv = ws.artsLevels[id] || 0;
        if (a.alignment === 'right') arts += lv * D.KARMA_ARTS_PER_LV;
        else if (a.alignment === 'evil') arts -= lv * D.KARMA_ARTS_PER_LV;
      });
      for (var slot in ws.gear) {
        var it = ws.gear[slot];
        if (!it) continue;
        if (it.alignment === 'right') gear += D.KARMA_GEAR_PER_PIECE;
        else if (it.alignment === 'evil') gear -= D.KARMA_GEAR_PER_PIECE;
      }
      return {
        arts: arts, gear: gear,
        events: ws.karmaEventScore || 0,
        drift: ws.alignDrift || 0
      };
    },

    recalc: function (ws, D) {
      var p = SQ.XKarma.partsOf(ws, D);
      var v = p.arts + p.gear + p.events + p.drift;
      ws.karma = Math.max(-D.KARMA_CLAMP, Math.min(D.KARMA_CLAMP, Math.round(v)));
      return ws.karma;
    },

    /* 倾向漂移累积（claim 编排层按 dt 调用；biasSign × 12/天，分量封顶 ±260） */
    accrueDrift: function (ws, profile, D, dtMs) {
      var sign = BIAS_SIGN[(profile || {}).alignBias] || 0;
      if (!sign || !(dtMs > 0)) return;
      var v = (ws.alignDrift || 0) + sign * D.DRIFT_PER_DAY * (dtMs / 86400000);
      ws.alignDrift = Math.max(-D.DRIFT_CAP, Math.min(D.DRIFT_CAP, v));
    },

    /* 档位：边界一律取自表（[下界, id] 降序首个命中，`-Infinity` / `null` 行 = 兜底档）。
       D 形参可注入（判据 #293 拿合成表证「表是事实源」；不传则回落全局 XDATA）。 */
    tierOf: function (karma, D) {
      var rows = ((D || SQ.XDATA || {}).KARMA_TIERS) || [[200, 'right'], [-199.999, 'neutral'], [-Infinity, 'evil']];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][0] == null || karma >= rows[i][0]) return rows[i][1];
      }
      return 'neutral';
    },

    /* 视图「距下一档还差 n」的边界取数口（第十二批复核抓的同类：视图硬编码 200 = 表的第二份抄本）。
       中性行下界是**开区间**界（-199.999 表示整数域 ≤ -200 才算魔道）⇒ 换算成整数域的下界：
       整数就是它本身，非整数向下取整。 */
    edgeOf: function (D) {
      var rows = ((D || SQ.XDATA || {}).KARMA_TIERS) || [];
      var up = rows[0] && rows[0][0] != null ? rows[0][0] : 200;
      var mid = rows[1] && rows[1][0] != null ? rows[1][0] : -up;
      return { up: up, down: Number.isInteger(mid) ? mid - 1 : Math.floor(mid) };
    },

    /* 善恶名号（善恶名号批 · 九段）：D.KARMA_RANKS 降序首个命中，返回段位 id（词表 karma.rank.<id>）。
     * 与 tierOf 同边界（±200 落正道/魔道首段），仅供称谓展示与跨段触发，不参与任何数值判定。 */
    rankOf: function (karma, D) {
      var k = karma || 0;
      var rows = D.KARMA_RANKS || [];
      for (var i = 0; i < rows.length; i++) {
        if (k >= rows[i][0]) return rows[i][1];
      }
      return 'zuodao';
    },

    /* ALIGN_EFFECTS 当前档位整行（引擎经 pack.worldSystems.effectsOf 消费，不 import 本模块） */
    effectsOf: function (ws, D) {
      return D.ALIGN_EFFECTS[SQ.XKarma.tierOf(ws.karma || 0)];
    },

    /* 兼容旧接口：修炼倍率 = ALIGN_EFFECTS.qiRateMult（idle.rateOf 消费） */
    alignMultOf: function (ws, D) {
      return SQ.XKarma.effectsOf(ws, D).qiRateMult;
    },

    /* 渡劫 karmaMod（§7.2 分段表） */
    karmaMod: function (karma, D) {
      for (var i = 0; i < D.TRIB_KARMA_MOD.length; i++) {
        var row = D.TRIB_KARMA_MOD[i];
        if (karma >= row[0] && karma < row[1]) return row[2];
      }
      return 0;
    }
  };
})();
