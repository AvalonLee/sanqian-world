/* ui/endings-ui.js — 终局六道途 + 周目结算 + 碑林轮回（M6 · 全屏终局面板）
 * 数据面走 systems.endings + core.data.D；本件只做演出。
 * 原版对照：openEndingModal :5691–:5788 / claimPathVictoryAndReincarnate :9748 / startNewGamePlus :5795。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var systems = root.QX3D && root.QX3D.systems;
  if (!core || !systems) throw new Error('endings-ui: QX3D.core/systems 未加载');

  var el = function (id) { return document.getElementById(id); };
  var st = null;

  function open(state) {
    st = state;
    render();
    el('ending-overlay').classList.remove('hidden');
  }

  function close() {
    el('ending-overlay').classList.add('hidden');
    st = null;
  }

  function render() {
    if (!st) return;
    var paths = systems.endings.evaluatePaths(st);
    var ending = systems.endings.evaluateBestEnding(st);
    var storage = root.localStorage;
    var meta = systems.endings.getLegacyMeta(storage);
    var perks = core.data.D.LEGACY_PERKS_DB || [];

    var pathHtml = paths.map(function (p) {
      var cls = p.done ? ' ep-done' : '';
      var btn = p.done ? '<button class="dw-btn primary" data-ep-claim="' + p.id + '">🏆 铭刻此道途(+120碑点)</button>'
        : '<span class="dw-lv">' + (meta.unlockedPaths || []).includes(p.id) ? '前世已证道' : '推进中' + '</span>';
      return '<div class="ep-card' + cls + '"><b>' + p.name + '</b><p>' + p.desc + '</p>' +
        '<div class="ep-progress">' + p.progress + '</div><div class="ep-action">' + btn + '</div></div>';
    }).join('');

    var perkHtml = perks.map(function (pk) {
      var active = (meta.activePerks || []).includes(pk.id);
      return '<button class="ep-perk' + (active ? ' active' : '') + '" data-perk="' + pk.id + '">' +
        '<b>' + pk.name + '</b><span>' + pk.desc + '</span>' +
        '<i>' + (active ? '✓ 已激活' : pk.cost + '碑点') + '</i></button>';
    }).join('');

    el('ending-overlay').innerHTML =
      '<div class="ep-sheet">' +
      '<div class="ep-head"><b>九州六大自由人生道途 · 多周目武道碑林</b>' +
      '<span class="ep-cycle">第 ' + (meta.cycleCount || 1) + ' 周目 · 碑点 ' + (meta.legacyPoints || 0) + '</span>' +
      '<button class="qxm-close" data-ep-close>✕</button></div>' +
      '<div class="ep-body">' +
      '<div class="ep-paths">' + pathHtml + '</div>' +
      '<div class="ep-perks"><div class="dw-h">碑林遗泽（跨周目永久传承）</div>' + perkHtml + '</div>' +
      '<div class="ep-verdict"><b>📜 心性终局判词：' + ending.title + '</b><p class="ep-poem">' + ending.poem + '</p></div>' +
      '</div>' +
      '<div class="ep-foot">' +
      '<button class="ep-btn ghost" data-ep-close>继续本世游历</button>' +
      '<button class="ep-btn settle" data-ep-settle>🔄 结算本世开启新周目(+60碑点)</button>' +
      '</div></div>';

    bind();
  }

  function bind() {
    var overlay = el('ending-overlay');
    overlay.querySelector('[data-ep-close]').addEventListener('click', close);
    var settle = overlay.querySelector('[data-ep-settle]');
    if (settle) settle.addEventListener('click', function () {
      var meta = systems.endings.startNewGamePlus(st, root.localStorage, root.QX3D_APP.env());
      close();
      root.QX3D_APP.rebirthDone(meta);
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-ep-claim]'), function (b) {
      b.addEventListener('click', function () {
        var meta = systems.endings.claimPathVictory(st, b.getAttribute('data-ep-claim'), root.localStorage, root.QX3D_APP.env());
        close();
        root.QX3D_APP.rebirthDone(meta);
      });
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-perk]'), function (b) {
      b.addEventListener('click', function () {
        systems.endings.toggleLegacyPerk(root.localStorage, b.getAttribute('data-perk'), root.QX3D_APP.env());
        render();
      });
    });
  }

  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.endings = { open: open, close: close };
})(typeof window !== 'undefined' ? window : globalThis);
