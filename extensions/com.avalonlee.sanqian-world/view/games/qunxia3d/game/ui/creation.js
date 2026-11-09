/* ui/creation.js — 创角向导（册299 起**真五步分屏**：左步序导航 + 右内容区）
 * 步骤 = 出身 → 命格 → 誓言 → 姓名 → 复核确认；任一步可点左侧步序回跳改选。
 * 数据与规则全部走 core/state（rollOpeningTalents / applyOrigin）与 data/origins.js；
 * 本件只做演出、步骤编排与校验（原版 openOriginModal :9189 / renderOriginCreationModal :9102 /
 * selectOrigin 的 UI 部分）。二周目出身锁定（reqCycle）照原版规则判 getLegacyMeta。
 * 形参名不用 `c`（本件属 qunxia3d 子应用，不走主壳 ctx() 桥；D7 只扫 view/ 外置件）。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var ui = root.QX3D && root.QX3D.ui;
  if (!core || !ui) throw new Error('creation: QX3D.core/ui 未加载');

  var D = core.data.D;
  var el = function (id) { return document.getElementById(id); };
  var STEP_N = 5;

  /* 步骤机状态：step = 1~5；talents/vow 全程留在会话态（回跳不重摇） */
  var sel = { originId: null, talents: [], vow: 'vow_homestead', jackpot: false, rerolls: 0, step: 1 };
  var bound = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }
  function originOf(id) {
    var list = D.ORIGINS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function talentOf(id) {
    var list = D.TALENTS_POOL || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || null;
  }
  function vowOf(id) {
    var list = D.OPENING_VOWS_DB || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || null;
  }
  function nameValue() {
    var input = el('creation-name');
    var v = input ? String(input.value || '').trim() : '';
    return v || '沈青锋';
  }

  /* 步序解锁：第 1 步常开；其余（含复核）都要求先择定出身 */
  function canEnter(n) {
    if (n <= 1) return true;
    return !!sel.originId;
  }

  /* ── 渲染：四块内容 + 步序态 + 动作钮 ─────────────────────────────── */
  function render() {
    renderOrigins();
    renderTalents();
    renderVows();
    renderReview();
    renderNav();
  }

  function renderOrigins() {
    var meta = core.state.getLegacyMeta(root.localStorage);
    var cycle = meta.cycleCount || 1;
    el('creation-origins').innerHTML = (D.ORIGINS || []).map(function (o) {
      var locked = o.reqCycle && cycle < o.reqCycle;
      var picked = sel.originId === o.id;
      return '<button data-origin="' + o.id + '" class="cr-origin' + (picked ? ' picked' : '') + (locked ? ' locked' : '') + '"' + (locked ? ' disabled' : '') + '>' +
        '<span class="cr-tag">' + esc(o.shortTag) + '</span>' +
        '<span class="cr-name">' + esc(o.name) + '</span>' +
        '<span class="cr-tip">' + esc(o.playTip) + (locked ? ' · 需第' + o.reqCycle + '周目' : '') + '</span>' +
        '<span class="cr-desc">' + esc(o.desc) + '</span>' +
        '</button>';
    }).join('');
  }

  function renderTalents() {
    el('creation-talents').innerHTML = sel.talents.map(function (tId) {
      var t = talentOf(tId);
      if (!t) return '';
      var isBad = t.grade === 'bad';
      var isGod = t.grade === 'god';
      return '<div class="cr-talent ' + (isGod ? 'god' : isBad ? 'bad' : 'norm') + '">' +
        '<span class="ct-head"><b>' + esc(t.name) + '</b><i>' + esc(t.gradeLabel) + '</i></span>' +
        '<span class="ct-desc">' + esc(t.desc) + '</span>' +
        '</div>';
    }).join('');
    el('creation-reroll-count').textContent = '已摇第 ' + sel.rerolls + ' 次';
    el('creation-jackpot').classList.toggle('hidden', !sel.jackpot);
  }

  function renderVows() {
    el('creation-vows').innerHTML = (D.OPENING_VOWS_DB || []).map(function (v) {
      var picked = sel.vow === v.id;
      return '<button data-vow="' + v.id + '" class="cr-vow' + (picked ? ' picked' : '') + '">' +
        '<b>' + esc(v.title) + '</b><i>' + esc(v.quote) + '</i><span>🎁 ' + esc(v.rewardDesc) + '</span>' +
        '</button>';
    }).join('');
  }

  /* 复核面：出身 / 门派 / 命格 / 誓言 / 名号 / 起手 —— 读的是本会话的会话态（未落档） */
  function renderReview() {
    var o = originOf(sel.originId);
    var vow = vowOf(sel.vow);
    var rows = [];
    rows.push(['名号', esc(nameValue())]);
    rows.push(['出身', o ? esc(o.name) + '（' + esc(o.shortTag) + '）' : '<i class="cr-tip">尚未择定</i>']);
    rows.push(['门派', o ? esc(o.sect || '无门无派·小虾米') : '—']);
    rows.push(['命格', sel.talents.map(function (tId) {
      var t = talentOf(tId);
      return t ? esc(t.name) : '';
    }).filter(Boolean).join('　') || '—']);
    rows.push(['誓言', vow ? esc(vow.title) + ' —— ' + esc(vow.quote) : '—']);
    rows.push(['起手', o ? ('气血 ' + o.stats.hp + '/' + o.stats.maxHp + ' · 内息 ' + o.stats.mp + '/' + o.stats.maxMp +
      ' · 银两 ' + o.stats.gold + ' · 侠名 ' + o.stats.fame) : '—']);
    el('creation-review').innerHTML = rows.map(function (r) {
      return '<div class="cr-review-row"><label>' + r[0] + '</label><span>' + r[1] + '</span></div>';
    }).join('');
  }

  function renderNav() {
    var items = document.querySelectorAll('#creation-steps [data-step]');
    Array.prototype.forEach.call(items, function (it) {
      var n = parseInt(it.getAttribute('data-step'), 10) || 1;
      it.classList.toggle('active', n === sel.step);
      it.classList.toggle('done', n < sel.step && canEnter(n));
      it.classList.toggle('locked', !canEnter(n));
    });
    var prev = el('btn-creation-prev');
    var next = el('btn-creation-next');
    var submit = el('btn-creation-submit');
    if (prev) prev.classList.toggle('dim', sel.step <= 1);
    if (next) next.classList.toggle('hidden', sel.step >= STEP_N);
    if (submit) submit.classList.toggle('hidden', sel.step < STEP_N);
    Array.prototype.forEach.call(document.querySelectorAll('.cr-step'), function (s) {
      s.classList.toggle('active', (parseInt(s.getAttribute('data-step'), 10) || 0) === sel.step);
    });
  }

  /* ── 步骤动作 ──────────────────────────────────────────────────── */
  function go(n) {
    n = Math.max(1, Math.min(STEP_N, n | 0));
    if (!canEnter(n)) { ui.hud.toast('先择定一条出身，再往下走。', 'amber'); return false; }
    sel.step = n;
    render();
    return true;
  }
  function next() { return sel.step >= STEP_N ? false : go(sel.step + 1); }
  function prev() { return sel.step <= 1 ? false : go(sel.step - 1); }

  /* 一次性绑定：步序导航（委托）+ 上一步/下一步 + 姓名回车（走查与玩家同一入口） */
  function bindOnce() {
    if (bound) return;
    var nav = el('creation-steps');
    if (nav) {
      nav.addEventListener('click', function (ev) {
        var it = ev.target && ev.target.closest ? ev.target.closest('[data-step]') : null;
        if (!it) return;
        go(parseInt(it.getAttribute('data-step'), 10) || 1);
      });
    }
    var bPrev = el('btn-creation-prev');
    if (bPrev) bPrev.addEventListener('click', prev);
    var bNext = el('btn-creation-next');
    if (bNext) bNext.addEventListener('click', next);
    var name = el('creation-name');
    if (name) name.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') next(); });
    var origins = el('creation-origins');
    if (origins) {
      origins.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-origin]') : null;
        if (!b || b.disabled) return;
        sel.originId = b.getAttribute('data-origin');
        render();
      });
    }
    var vows = el('creation-vows');
    if (vows) {
      vows.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-vow]') : null;
        if (!b) return;
        sel.vow = b.getAttribute('data-vow');
        render();
      });
    }
    bound = true;
  }

  function open() {
    /* 初摇（原 :9197–:9199：tempSelectedTalents 为空才重摇；本件每次打开都初摇一版） */
    var meta = core.state.getLegacyMeta(root.localStorage);
    var rolled = core.state.rollOpeningTalents(null, (meta.activePerks || []).includes('perk_luck'));
    sel.talents = rolled.talents;
    sel.jackpot = rolled.jackpot;
    sel.rerolls = 1;
    sel.originId = null;
    sel.vow = 'vow_homestead';
    sel.step = 1;
    var nameInput = el('creation-name');
    if (nameInput && !nameInput.value) nameInput.value = '沈青锋';
    bindOnce();
    render();
    el('creation-modal').classList.add('show');
  }

  function close() {
    el('creation-modal').classList.remove('show');
  }

  function reroll() {
    var meta = core.state.getLegacyMeta(root.localStorage);
    var rolled = core.state.rollOpeningTalents(null, (meta.activePerks || []).includes('perk_luck'));
    sel.talents = rolled.talents;
    sel.jackpot = rolled.jackpot;
    sel.rerolls += 1;
    render();
  }

  /* 提交：core.state.applyOrigin（selectOrigin 的 state 部分）→ 存档 → 回调 app */
  function submit(onDone) {
    if (!sel.originId) { ui.hud.toast('先择定出身身世，再踏入江湖。', 'red'); return; }
    var st = root.QX3D_APP && root.QX3D_APP.state;
    if (!st) return;
    var ok = core.state.applyOrigin(st, sel.originId, {
      name: nameValue(),
      talents: sel.talents,
      vow: sel.vow,
      storage: root.localStorage
    });
    if (!ok) return;
    core.data.bindRuntimeState(st);
    core.state.saveGame(st, root.localStorage);
    close();
    if (onDone) onDone(st);
  }

  root.QX3D.ui.creation = {
    open: open,
    close: close,
    reroll: reroll,
    submit: submit,
    go: go,
    next: next,
    prev: prev,
    step: function () { return sel.step; },
    canEnter: canEnter
  };
})(typeof window !== 'undefined' ? window : globalThis);
