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
  var tb = null; /* 首局教学状态机（systems.combat.initTutorial 产出；册277） */
  var onDone = null;
  var lastResult = null; /* 结算面板读数（UI 层自持；duelState 不挂账——对表键集与原版一致） */

  function open(state, duelState, done, tutorialBattle) {
    st = state;
    d = duelState;
    lastResult = null;
    tb = tutorialBattle || null;
    onDone = done || null;
    render();
    el('duel-overlay').classList.remove('hidden');
  }

  function close() {
    el('duel-overlay').classList.add('hidden');
    var wasTutorial = !!tb;
    var doneToast = tb && st && st.tutorialComboDone;
    st = null; d = null; tb = null;
    if (doneToast && root.QX3D.ui.hud) root.QX3D.ui.hud.toast('连招已通：默认只推 ≤3 推荐招，其余在「更多招式」。', 'emerald');
    if (onDone) { var f = onDone; onDone = null; f(); }
    if (wasTutorial && root.QX3D_APP) root.QX3D_APP.afterTutorial();
  }

  function render() {
    if (!st || !d) return;
    var player = core.player;
    var counterStanceKey = core.data.D.STANCE_META[d.nextEnemyStance].beatenBy;
    var intentMeta = core.data.D.STANCE_META[d.nextEnemyStance];
    var counterMeta = core.data.D.STANCE_META[counterStanceKey];
    var tutoring = !!tb && st && !st.tutorialComboDone;

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
      '<div class="dl-ticker">' + dlTickerHtml() + '</div>' +
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
      var allCards = hand;
      if (tb && tb.allowedShi) {
        allCards = hand.filter(function (c) { return systems.combat.getMoveFormShi(c).shi === tb.allowedShi; });
        if (!allCards.length) allCards = hand.filter(function (c) { return !c.isUlt; }).slice(0, 1);
      }
      var picked = systems.combat.pickRecommendedDuelCards(allCards, d, counterStanceKey);
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
      var cardsHtml;
      if (tutoring && (tb.step === 'intro' || tb.step === 'name_forms')) {
        cardsHtml = '<div class="dl-tut-note">先完成上方教学步骤，再出招。</div>';
      } else {
        cardsHtml = '<div class="dl-cards">' + slots.map(cardBtn).join('') + '</div>';
      }
      el('duel-overlay').innerHTML =
        '<div class="dl-sheet">' + top +
        '<div class="dl-bottom">' +
        cardsHtml +
        '<div class="dl-foot"><button class="dl-more-toggle" id="btn-duel-drawer">更多招式 ▾</button>' +
        '<button class="dl-meditate" id="btn-duel-meditate">🧘 调息（回 20% 真气）</button></div>' +
        '<div class="dl-drawer hidden" id="duel-drawer">' + (overflow.map(cardBtn).join('') || '<p class="dl-dim">没有多余的招。</p>') + '</div>' +
        '</div></div>';
    }

    bind();
  }

  /* 教学 ticker（原 advanceTutorialStep :7065–:7098 的 intent/hint 文案逐字 + 控件） */
  function dlTickerHtml() {
    var last = (d.logs[d.logs.length - 1] || '').replace(/<[^>]+>/g, '').slice(0, 40);
    if (!tb || (st && st.tutorialComboDone)) return (d.finished ? '' : '敌出【' + core.data.D.STANCE_META[d.nextEnemyStance].name + '】·宜【' + core.data.D.STANCE_META[core.data.D.STANCE_META[d.nextEnemyStance].beatenBy].name + '】破　·　') + last;
    var B = function (id, label, cls) { return '<button class="dl-tut-btn ' + (cls || '') + '" data-tut="' + id + '">' + label + '</button>'; };
    var t = tb.step, html = '';
    if (t === 'intro') html = '动手之前，先认<b>形</b>与<b>势</b>。形是拳/剑/轻功，势是破防/卸力/追击。' + B('name_forms', '知道了', 'primary') + B('skip_narr', '跳过旁白');
    else if (t === 'name_forms') {
      var forms = ['fist', 'sword', 'qinggong'];
      html = '请依次点亮三形：拳 · 剑 · 轻功　' + forms.map(function (f) {
        var meta = core.data.D.FORM_META[f];
        var done = tb.formsNamed[f];
        return B('form_' + f, meta.icon + ' ' + meta.label + (done ? ' ✓' : ''), done ? 'done' : '');
      }).join('') + (Object.keys(tb.formsNamed).length >= 3 ? B('force_break', '三形已识 · 开始破防', 'primary') : '');
    }
    else if (t === 'force_break') html = '敌方露出破绽（闪白）！请打出任意形·<b>破防</b>。　本段只开放【破防】势。错序会重置本段，不致死。';
    else if (t === 'force_chase') html = '破绽在，追上去！请接【追击】。　合法势序：破防 → 追击。若先卸力也可，本段直接追击即可。';
    else if (t === 'combo_success') html = '成招！你已理解连招槽。　自由拼装已解锁；默认只推 ≤3 张推荐招，其余进「更多招式」。';
    else if (t === 'outro') html = '醉汉认栽逃遁。回本境后，右上可「吐纳过旬」见世界推进。　教学完成。';
    return html + '　·　' + last;
  }

  function bindTut() {
    var overlay = el('duel-overlay');
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-tut]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-tut');
        if (id === 'skip_narr') { tb.narrationSkipped = true; if (tb.step === 'intro') advTut('name_forms'); return; }
        if (id === 'form_fist' || id === 'form_sword' || id === 'form_qinggong') {
          var f = id.slice(5);
          tb.formsNamed[f] = true;
          if (Object.keys(tb.formsNamed).length >= 3 && root.QX3D.ui.hud) root.QX3D.ui.hud.toast('三形已识。', 'emerald');
          render();
          return;
        }
        advTut(id);
      });
    });
  }

  function advTut(step) {
    systems.combat.tutorialAdvance(tb, st, step, { d: d, save: root.QX3D_APP.save });
    render();
  }

  function combat_hand() {
    return systems.combat.buildHand(st, d);
  }

  function bind() {
    var overlay = el('duel-overlay');
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-card]'), function (b) {
      b.addEventListener('click', function () {
        if (!d || d.finished) return;
        var denv = root.QX3D_APP.env();
        denv.tb = tb;
        denv.d = d;
        denv.tutorialAdvance = function (step) { systems.combat.tutorialAdvance(tb, st, step, { d: d, save: root.QX3D_APP.save }); };
        var r = systems.combat.playDuelCard(st, d, b.getAttribute('data-card'), denv);
        if (r && r.result) lastResult = r.result;
        afterCard();
      });
    });
    bindTut();
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
