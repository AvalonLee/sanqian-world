/* ui/duel.js — 三招对决 · 半屏出招卡（M2 · 用户拍板演出 = 半屏出招卡 + 3D 背景糊化）
 * 上半屏 = 对阵状态（名号/架势意图/招点轨/气血/战报一行），下半屏 = 手牌三槽 + 更多抽屉 + 调息。
 * 数据面全部走 systems.combat（initDuel / playDuelCard / duelMeditate / buildHand /
 * pickRecommendedDuelCards）；本件只做演出（铁律 1 反向面）。
 * 原版对照：renderDuelStage :7217–:7395（语义对写）；纸面令牌 --xuan-*。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var systems = root.QX3D && root.QX3D.systems;
  if (!core || !systems) throw new Error('duel: QX3D.core/systems 未加载');

  var el = function (id) { return document.getElementById(id); };
  var st = null;
  var d = null;
  var onDone = null;
  var lastResult = null; /* 结算面板读数（UI 层自持；duelState 不挂账——对表键集与原版一致） */

  function open(state, duelState, done) {
    st = state;
    d = duelState;
    lastResult = null;
    onDone = done || null;
    render();
    el('duel-overlay').classList.remove('hidden');
  }

  function close() {
    el('duel-overlay').classList.add('hidden');
    st = null; d = null;
    if (onDone) { var f = onDone; onDone = null; f(); }
  }

  function render() {
    if (!st || !d) return;
    var player = core.player;
    var counterStanceKey = core.data.D.STANCE_META[d.nextEnemyStance].beatenBy;
    var intentMeta = core.data.D.STANCE_META[d.nextEnemyStance];
    var counterMeta = core.data.D.STANCE_META[counterStanceKey];

    var dots = d.roundHistory.map(function (s, idx) {
      var cls = s === 'win' ? ' win' : s === 'lose' ? ' lose' : (!d.finished && idx + 1 === d.round ? ' now' : '');
      return '<i class="dl-dot' + cls + '"></i>';
    }).join('');

    var marks = Object.keys(d.tokens).filter(function (k) { return d.tokens[k] > 0; })
      .map(function (k) { return '<i class="dl-mark">' + (core.data.D.TOKEN_META[k].name || k) + '×' + d.tokens[k] + '</i>'; }).join('');

    var lastLog = (d.logs[d.logs.length - 1] || '').replace(/<[^>]+>/g, '');

    var pHpPct = Math.max(0, Math.min(100, Math.round((st.hp / st.maxHp) * 100)));
    var eHpPct = Math.max(0, Math.min(100, Math.round((d.enemyCurHp / d.enemyMaxHp) * 100)));

    var top =
      '<div class="dl-top">' +
      '<div class="dl-vs">' +
      '<div class="dl-side"><b class="dl-name">' + st.playerName + '</b><span class="dl-sub">胜 ' + d.playerWins + ' 招</span>' +
      '<div class="dl-bar"><i style="width:' + pHpPct + '%"></i></div><span class="dl-hp">' + st.hp + '/' + st.maxHp + '</span></div>' +
      '<div class="dl-mid"><span class="dl-round">第 ' + Math.min(d.round, 3) + '/3 招</span><div class="dl-dots">' + dots + '</div><div class="dl-marks">' + marks + '</div></div>' +
      '<div class="dl-side enemy"><b class="dl-name">' + d.enemyName + '</b><span class="dl-sub">' + (d.enemyTitle || '') + '</span>' +
      '<div class="dl-bar"><i class="e" style="width:' + eHpPct + '%"></i></div><span class="dl-hp">' + d.enemyCurHp + '/' + d.enemyMaxHp + '</span></div>' +
      '</div>' +
      '<div class="dl-ticker">' + (d.finished ? '' : '敌出【' + intentMeta.name + '】·宜【' + counterMeta.name + '】破　·　') + lastLog.slice(0, 46) + '</div>' +
      '</div>';

    if (d.finished) {
      var r = lastResult || {};
      el('duel-overlay').innerHTML =
        '<div class="dl-sheet">' + top +
        '<div class="dl-bottom"><div class="dl-result">' +
        '<b class="dl-result-title">' + (r.title || '终局') + '</b>' +
        '<p class="dl-result-text">' + (r.rewardText || '') + '</p>' +
        '<button class="qxm-btn primary" id="btn-duel-close">收招归鞘</button>' +
        '</div></div></div>';
    } else {
      var hand = combat_hand();
      var picked = systems.combat.pickRecommendedDuelCards(hand, d, counterStanceKey);
      var slots = picked.recommended.slice(0, 3);
      var breaker = slots.find(function (c) { return c.isUlt || c.stance === counterStanceKey; });
      if (breaker && slots.length > 1) {
        var rest = slots.filter(function (c) { return c !== breaker; });
        slots = [rest[0], breaker, rest[1]].filter(Boolean).slice(0, 3);
      }
      var overflow = (picked.more || []).slice(0, 3);
      var cardBtn = function (c) {
        var isCounter = c.stance === counterStanceKey || c.isUlt;
        var isBeaten = c.stance === intentMeta.beats;
        var mark = c.isUlt ? '绝' : isCounter ? '破' : isBeaten ? '克' : '平';
        return '<button class="dl-card' + (isCounter ? ' break' : '') + '" data-card="' + c.id + '">' +
          '<b>' + c.name + '</b><span class="dl-cost">耗气 ' + c.mpCost + '</span><span class="dl-badge">' + mark + '</span>' +
          '<i class="dl-desc">' + (c.effectDesc || '') + '</i></button>';
      };
      el('duel-overlay').innerHTML =
        '<div class="dl-sheet">' + top +
        '<div class="dl-bottom">' +
        '<div class="dl-cards">' + slots.map(cardBtn).join('') + '</div>' +
        '<div class="dl-foot"><button class="dl-more-toggle" id="btn-duel-drawer">更多招式 ▾</button>' +
        '<button class="dl-meditate" id="btn-duel-meditate">🧘 调息（回 20% 真气）</button></div>' +
        '<div class="dl-drawer hidden" id="duel-drawer">' + (overflow.map(cardBtn).join('') || '<p class="dl-dim">没有多余的招。</p>') + '</div>' +
        '</div></div>';
    }

    bind();
  }

  function combat_hand() {
    return systems.combat.buildHand(st, d);
  }

  function bind() {
    var overlay = el('duel-overlay');
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-card]'), function (b) {
      b.addEventListener('click', function () {
        if (!d || d.finished) return;
        var r = systems.combat.playDuelCard(st, d, b.getAttribute('data-card'), root.QX3D_APP.env());
      if (r && r.result) lastResult = r.result;
        afterCard();
      });
    });
    var mt = el('btn-duel-meditate');
    if (mt) mt.addEventListener('click', function () {
      systems.combat.duelMeditate(st, d, root.QX3D_APP.env());
      render();
    });
    var dt = el('btn-duel-drawer');
    if (dt) dt.addEventListener('click', function () {
      el('duel-drawer').classList.toggle('hidden');
    });
    var dc = el('btn-duel-close');
    if (dc) dc.addEventListener('click', function () {
      root.QX3D_APP.save();
      root.QX3D_APP.renderHud();
      close();
    });
  }

  function afterCard() {
    root.QX3D_APP.save();
    root.QX3D_APP.renderHud();
    render();
  }

  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.duel = { open: open, close: close };
})(typeof window !== 'undefined' ? window : globalThis);
