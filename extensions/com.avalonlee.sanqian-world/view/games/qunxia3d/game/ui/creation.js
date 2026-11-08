/* ui/creation.js — 创角向导（M0 纸面形态）
 * 数据与规则全部走 core/state（rollOpeningTalents / applyOrigin）与 data/origins.js；
 * 本件只做演出与选择（原版 openOriginModal :9189 / renderOriginCreationModal :9102 /
 * selectOrigin 的 UI 部分）。二周目出身锁定（reqCycle）照原版规则判 getLegacyMeta。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var ui = root.QX3D && root.QX3D.ui;
  if (!core || !ui) throw new Error('creation: QX3D.core/ui 未加载');

  var D = core.data.D;
  var el = function (id) { return document.getElementById(id); };

  var sel = { originId: null, talents: [], vow: 'vow_homestead', jackpot: false, rerolls: 0 };

  function open(st) {
    /* 初摇（原 :9197–:9199：tempSelectedTalents 为空才重摇；本件每次打开都初摇一版） */
    var meta = core.state.getLegacyMeta(root.localStorage);
    var rolled = core.state.rollOpeningTalents(null, (meta.activePerks || []).includes('perk_luck'));
    sel.talents = rolled.talents;
    sel.jackpot = rolled.jackpot;
    sel.rerolls = 1;
    sel.originId = null;
    sel.vow = 'vow_homestead';
    var nameInput = el('creation-name');
    if (nameInput && !nameInput.value) nameInput.value = '沈青锋';
    render();
    el('creation-modal').classList.add('show');
  }

  function close() {
    el('creation-modal').classList.remove('show');
  }

  function render() {
    /* 出身卡（二周目锁定：reqCycle > 当前周目 ⇒ 灰卡） */
    var meta = core.state.getLegacyMeta(root.localStorage);
    var cycle = meta.cycleCount || 1;
    el('creation-origins').innerHTML = (D.ORIGINS || []).map(function (o) {
      var locked = o.reqCycle && cycle < o.reqCycle;
      var picked = sel.originId === o.id;
      return '<button data-origin="' + o.id + '" class="cr-origin' + (picked ? ' picked' : '') + (locked ? ' locked' : '') + '"' + (locked ? ' disabled' : '') + '>' +
        '<span class="cr-tag">' + o.shortTag + '</span>' +
        '<span class="cr-name">' + o.name + '</span>' +
        '<span class="cr-tip">' + o.playTip + (locked ? ' · 需第' + o.reqCycle + '周目' : '') + '</span>' +
        '<span class="cr-desc">' + o.desc + '</span>' +
        '</button>';
    }).join('');

    /* 天赋卡 */
    var jackBanner = el('creation-jackpot');
    jackBanner.classList.toggle('hidden', !sel.jackpot);
    el('creation-talents').innerHTML = sel.talents.map(function (tId) {
      var t = (D.TALENTS_POOL || []).find(function (x) { return x.id === tId; }) || D.TALENTS_POOL[0];
      var isBad = t.grade === 'bad';
      var isGod = t.grade === 'god';
      return '<div class="cr-talent ' + (isGod ? 'god' : isBad ? 'bad' : 'norm') + '">' +
        '<span class="ct-head"><b>' + t.name + '</b><i>' + t.gradeLabel + '</i></span>' +
        '<span class="ct-desc">' + t.desc + '</span>' +
        '</div>';
    }).join('');
    el('creation-reroll-count').textContent = '已摇第 ' + sel.rerolls + ' 次';

    /* 誓言卡 */
    el('creation-vows').innerHTML = (D.OPENING_VOWS_DB || []).map(function (v) {
      var picked = sel.vow === v.id;
      return '<button data-vow="' + v.id + '" class="cr-vow' + (picked ? ' picked' : '') + '">' +
        '<b>' + v.title + '</b><i>' + v.quote + '</i><span>🎁 ' + v.rewardDesc + '</span>' +
        '</button>';
    }).join('');

    /* 绑定（innerHTML 重建后重挂监听） */
    Array.prototype.forEach.call(el('creation-origins').querySelectorAll('[data-origin]'), function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) { ui.hud.toast('二周目隐藏出身，先完成任意道途再入轮回。', 'amber'); return; }
        sel.originId = b.getAttribute('data-origin');
        render();
      });
    });
    Array.prototype.forEach.call(el('creation-vows').querySelectorAll('[data-vow]'), function (b) {
      b.addEventListener('click', function () {
        sel.vow = b.getAttribute('data-vow');
        render();
      });
    });
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
      name: el('creation-name').value,
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
    submit: submit
  };
})(typeof window !== 'undefined' ? window : globalThis);
