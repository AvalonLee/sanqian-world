/* ui/drawer.js — 五抽屉纸面面板（M4 · 武学/穴位/隐庐/行囊/名册）
 * 数据面走 systems.deep + core.player + core.data.D；本件只做演出。
 * 原版对照：renderDrawer :7871 / renderMartialDrawerHtml :7910 / renderSectDrawerHtml :8159 等。
 * 五 tab 结构 + 每 tab 操作钮 → app.runDeep(actId, arg)。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var systems = root.QX3D && root.QX3D.systems;
  if (!core || !systems) throw new Error('drawer: QX3D.core/systems 未加载');

  var el = function (id) { return document.getElementById(id); };
  var st = null;
  var tab = 'martial';

  function open(state) {
    st = state;
    tab = 'martial';
    render();
    el('drawer-overlay').classList.remove('hidden');
  }

  function close() {
    el('drawer-overlay').classList.add('hidden');
    st = null;
  }

  function render() {
    if (!st) return;
    var tabs = [
      { id: 'martial', label: '武学' },
      { id: 'acupoint', label: '穴位' },
      { id: 'estate', label: '隐庐' },
      { id: 'bag', label: '行囊' },
      { id: 'roster', label: '名册' }
    ];
    var tabBar = '<div class="dw-tabs">' + tabs.map(function (t) {
      return '<button class="dw-tab' + (tab === t.id ? ' on' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('') + '</div>';

    var bodyHtml = '';
    if (tab === 'martial') bodyHtml = renderMartial();
    else if (tab === 'acupoint') bodyHtml = renderAcupoint();
    else if (tab === 'estate') bodyHtml = renderEstate();
    else if (tab === 'bag') bodyHtml = renderBag();
    else if (tab === 'roster') bodyHtml = renderRoster();

    el('drawer-overlay').innerHTML =
      '<div class="dw-sheet">' +
      '<div class="dw-head"><b class="dw-title">锦囊 · 五抽屉</b>' +
      '<span class="dw-sub">修为 ' + st.exp + ' · 银两 ' + st.gold + '文 · 境界 ' + realmName() + '</span>' +
      '<button class="qxm-close" data-dw-close>✕</button></div>' +
      tabBar + '<div class="dw-body">' + bodyHtml + '</div></div>';
    bind();
  }

  function realmName() {
    var rn = root.QX3D_DATA.REALM_NAMES || [];
    return rn[Math.min(st.realmIdx, rn.length - 1)] || '';
  }

  /* ── 武学 tab ── */
  function renderMartial() {
    var D = core.data.D;
    var cap = systems.deep.getMaxAllowedArtLevel(st);
    var learnedIds = Object.keys(st.learnedArts);
    var html = '<div class="dw-sec"><div class="dw-h">内功（装备中：<b>' +
      ((D.MARTIAL_DB[st.equippedInner] || {}).name || '?') + '</b>）</div>';
    learnedIds.forEach(function (id) {
      var art = D.MARTIAL_DB[id];
      if (!art || art.type !== 'inner') return;
      var lv = st.learnedArts[id] || 1;
      var cost = systems.deep.getArtUpgradeCost(st, id);
      var canUp = lv < 10 && lv < cap && st.exp >= cost;
      html += artRow(art.name, '第' + lv + '重', canUp, 'upgradeArt_' + id, '升级(' + cost + '修为)');
      if (id !== st.equippedInner) {
        html += '<button class="dw-btn sm" data-deep="equipInner_' + id + '">装备</button>';
      }
    });
    html += '</div><div class="dw-sec"><div class="dw-h">招式（装备 ' + st.equippedMoves.length + '/4）</div>';
    learnedIds.forEach(function (id) {
      var art = D.MARTIAL_DB[id];
      if (!art || art.type !== 'move') return;
      var lv = st.learnedArts[id] || 1;
      var cost = systems.deep.getArtUpgradeCost(st, id);
      var canUp = lv < 10 && lv < cap && st.exp >= cost;
      var equipped = st.equippedMoves.includes(id);
      html += artRow(art.name, '第' + lv + '重' + (equipped ? ' · 已装备' : ''), canUp, 'upgradeArt_' + id, '升级(' + cost + '修为)');
      if (!equipped) html += '<button class="dw-btn sm" data-deep="toggleMove_' + id + '">入槽</button>';
    });
    html += '</div>';
    return html;
  }

  function artRow(name, lvLabel, canUp, act, btnLabel) {
    return '<div class="dw-row"><span class="dw-name">' + name + '</span><span class="dw-lv">' + lvLabel + '</span>' +
      '<button class="dw-btn' + (canUp ? '' : ' off') + '" data-deep="' + act + '"' + (canUp ? '' : ' disabled') + '>' + btnLabel + '</button></div>';
  }

  /* ── 穴位 tab ── */
  function renderAcupoint() {
    var D = core.data.D;
    var html = '<div class="dw-sec"><div class="dw-h">奇经八脉 · 已通 ' + (st.unlockedAcupoints || []).length + '/' + (D.ACUPOINTS_DB || []).length + '</div>';
    (D.ACUPOINTS_DB || []).forEach(function (acu) {
      var unlocked = (st.unlockedAcupoints || []).includes(acu.id);
      var canUnlock = !unlocked && st.realmIdx >= (acu.reqRealm || 0) && st.exp >= (acu.cost || 0);
      html += '<div class="dw-row"><span class="dw-name">' + acu.name + '</span>' +
        '<span class="dw-lv">' + (unlocked ? '✓ 已贯通' : (acu.bonusDesc || '') + ' · 需修为' + (acu.cost || 0)) + '</span>' +
        (unlocked ? '' : '<button class="dw-btn' + (canUnlock ? '' : ' off') + '" data-deep="acupoint_' + acu.id + '"' + (canUnlock ? '' : ' disabled') + '>冲关</button>') +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  /* ── 隐庐 tab ── */
  function renderEstate() {
    var D = core.data.D;
    if (!st.estate) return '<div class="dw-sec">隐庐数据缺失</div>';
    var html = '<div class="dw-sec"><div class="dw-h">隐庐产业（灵草 ' + (st.estate.herbs || 0) + ' · 玄铁 ' + (st.estate.iron || 0) + '）</div>';
    (D.ESTATE_BUILDINGS_DB || []).forEach(function (b) {
      var lv = st.estate.buildings[b.id] || 0;
      var canUp = lv < 3;
      var cost = canUp ? b.costs[lv + 1] : 0;
      if (st.estate.stewardId === 'guojing' && canUp) cost = Math.round(cost * 0.85);
      html += '<div class="dw-row"><span class="dw-name">' + b.name + '</span><span class="dw-lv">' + lv + '/3级' + (canUp ? ' · ' + cost + '文' : ' · 满级') + '</span>' +
        (canUp ? '<button class="dw-btn' + (st.gold >= cost ? '' : ' off') + '" data-deep="estate_' + b.id + '"' + (st.gold >= cost ? '' : ' disabled') + '>升级</button>' : '') +
        '</div>';
    });
    /* 六劳作 */
    html += '</div><div class="dw-sec"><div class="dw-h">百工营生（本旬' + (st.estate.workDoneThisTurn ? '已主理' : '可主理') + ' · 耗1行脚）</div>';
    var works = [
      { id: 'forage', label: '⛏️ 采药砍柴' },
      { id: 'alchemy_jade', label: '⚗️ 炼九花玉露丸(灵草2)' },
      { id: 'alchemy_dahuan', label: '🔥 炼大还丹(灵草5)' },
      { id: 'smith_upgrade', label: '🔨 玄铁铸剑(玄铁2)' },
      { id: 'clinic', label: '🩺 悬壶义诊(灵草1)' },
      { id: 'qingxiu', label: '🍵 抚琴烹茶' }
    ];
    works.forEach(function (w) {
      html += '<button class="dw-btn full' + (st.estate.workDoneThisTurn ? ' off' : '') + '" data-deep="work_' + w.id + '"' + (st.estate.workDoneThisTurn ? ' disabled' : '') + '>' + w.label + '</button>';
    });
    html += '</div>';
    return html;
  }

  /* ── 行囊 tab ── */
  function renderBag() {
    var D = core.data.D;
    var html = '<div class="dw-sec"><div class="dw-h">行囊（' + Object.keys(st.inventory || {}).reduce(function (a, k) { return a + (st.inventory[k] || 0); }, 0) + ' 件）</div>';
    var has = false;
    Object.keys(st.inventory || {}).forEach(function (id) {
      var n = st.inventory[id];
      if (n <= 0) return;
      has = true;
      var item = D.ITEMS_DB[id] || {};
      html += '<div class="dw-row"><span class="dw-name">' + (item.name || id) + ' ×' + n + '</span></div>';
    });
    if (!has) html += '<div class="dw-dim">行囊空空如也。</div>';
    /* 佩挂 */
    html += '</div><div class="dw-sec"><div class="dw-h">佩挂</div>';
    ['weapon', 'armor', 'charm'].forEach(function (slot) {
      var id = st.equipment[slot];
      var item = id ? D.ITEMS_DB[id] : null;
      html += '<div class="dw-row"><span class="dw-name">' + slot + '</span><span class="dw-lv">' + (item ? item.name : '空') + '</span></div>';
    });
    html += '</div>';
    return html;
  }

  /* ── 名册 tab ── */
  function renderRoster() {
    var sys = systems.masters;
    var here = sys.mastersAt(st, st.currentRegion);
    var html = '<div class="dw-sec"><div class="dw-h">在本境 · ' + here.length + ' 人</div>';
    if (!here.length) html += '<div class="dw-dim">本境无常驻名宿（名宿每月游走）。</div>';
    here.forEach(function (m) {
      html += '<div class="dw-row"><span class="dw-name"><b>' + m.name + '</b> ' + (m.title || '') + '</span><span class="dw-lv">好感 ' + (m.affinity || 0) + '</span></div>';
      html += '<div class="dw-actions">' +
        '<button class="dw-btn sm" data-m="chat_' + m.id + '">把酒(8文)</button>' +
        '<button class="dw-btn sm" data-m="learn_' + m.id + '">请益</button>' +
        '<button class="dw-btn sm" data-m="duel_' + m.id + '">切磋</button>';
      var stage = m.storyStage || 0;
      if (stage < 3) {
        html += '<button class="dw-btn sm" data-m="story_' + m.id + '_' + stage + '">传记第' + (stage + 1) + '幕</button>';
      } else {
        html += '<span class="dw-lv">传记圆满 ✓</span>';
      }
      html += '</div>';
    });
    html += '</div><div class="dw-sec"><div class="dw-h">所有名宿（' + (st.masters || []).length + ' 人）</div>';
    (st.masters || []).slice(0, 12).forEach(function (m) {
      html += '<div class="dw-row"><span class="dw-name">' + m.name + '</span><span class="dw-lv">' + (m.title || '') + ' · ' + (m.region || '') + '</span></div>';
    });
    html += '</div>';
    return html;
  }

  /* ── 绑定 ── */
  function bind() {
    var overlay = el('drawer-overlay');
    var closeBtn = overlay.querySelector('[data-dw-close]');
    if (closeBtn) closeBtn.addEventListener('click', close);
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); render(); });
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-m]'), function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        root.QX3D_APP.runMaster(b.getAttribute('data-m'));
        render();
      });
    });
    Array.prototype.forEach.call(overlay.querySelectorAll('[data-deep]'), function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-deep');
        if (root.QX3D_APP.runDeep) root.QX3D_APP.runDeep(act);
        render(); /* 面板内刷 */
      });
    });
  }

  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.drawer = { open: open, close: close };
})(typeof window !== 'undefined' ? window : globalThis);
