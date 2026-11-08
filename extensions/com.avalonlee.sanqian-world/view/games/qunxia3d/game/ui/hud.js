/* ui/hud.js — 纸面 HUD（M0 骨架：HP/MP/AP/旬/银两/侠名/战力/境界，计划书 §五 M0）
 * 表现层：只读 state、调系统函数（计划书铁律 1 反向面）；样式走 --xuan-* 纸面令牌。
 * 原版对照：renderHud :3585–:3689（M0 只迁读数骨架；羁绊 pill / 主线 ticker 随 M3+）。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  if (!core) throw new Error('hud: QX3D.core 未加载');

  var el = function (id) { return document.getElementById(id); };

  function render(st) {
    if (!st || !st.hasCreatedChar) return;
    var player = core.player.calcPlayerCombatPower(st);
    /* 境界名走数据表 */
    var realmNames = root.QX3D_DATA.REALM_NAMES || [];
    var realmName = realmNames[Math.min(st.realmIdx, realmNames.length - 1)] || '';
    var sectName = (root.QX3D_DATA.SECTS_DB && root.QX3D_DATA.SECTS_DB[st.sectId])
      ? (root.QX3D_DATA.SECTS_DB[st.sectId].ranks[st.sectRankIdx] || root.QX3D_DATA.SECTS_DB[st.sectId].name)
      : '无门无派·小虾米';
    st.sectName = sectName; /* 与原版 renderHud :3586–:3587 同构：回写派称 */

    el('hud-name').textContent = st.playerName;
    el('hud-realm').textContent = realmName;
    el('hud-sect').textContent = sectName;

    var hpPct = Math.max(0, Math.min(100, Math.round((st.hp / st.maxHp) * 100)));
    var mpPct = Math.max(0, Math.min(100, Math.round((st.mp / st.maxMp) * 100)));
    el('hud-hp-bar').style.width = hpPct + '%';
    el('hud-hp-text').textContent = st.hp + '/' + st.maxHp;
    el('hud-mp-bar').style.width = mpPct + '%';
    el('hud-mp-text').textContent = st.mp + '/' + st.maxMp;

    var dots = '●'.repeat(st.ap) + '○'.repeat(Math.max(0, st.maxAp - st.ap));
    el('hud-ap-dots').textContent = dots;
    el('hud-ap-text').textContent = st.ap + '/' + st.maxAp;
    el('hud-gold-text').textContent = st.gold + '文';
    el('hud-fame-text').textContent = String(st.fame);
    el('hud-exp-text').textContent = String(st.exp);
    el('hud-date-badge').textContent = '第' + st.turn + '/' + st.maxTurns + '旬';
    el('hud-power-text').textContent = String(player);
    var tier = core.player.getPowerTierLabel(player);
    el('hud-power-tier').textContent = tier.label;

    /* 危机 ticker（M0：最急一桩标题 + 余旬；赴会交互属 M3） */
    var c0 = (st.crises || [])[0];
    var tk = el('hud-ticker');
    if (c0) {
      var reg = core.time.getRegion(c0.region);
      tk.textContent = '🔥 ' + (c0.title || '').replace(/^【|】/g, '') + ' · 余' + (c0.remainTurns || 0) + '旬（' + reg.name + '）';
      tk.classList.add('crisis');
    } else {
      tk.textContent = '江湖暂安 · 可安心行脚';
      tk.classList.remove('crisis');
    }

    renderLogs(st);
  }

  function renderLogs(st) {
    var box = el('logs-list');
    if (!box) return;
    var rows = (st.logs || []).slice(0, 6);
    box.innerHTML = rows.map(function (lg) {
      return '<div class="log-row"><span class="log-time">' + lg.time + '</span><span class="log-text">' + lg.text + '</span></div>';
    }).join('');
  }

  function toast(msg, tone) {
    var container = el('toast-container');
    if (!container) return;
    var t = document.createElement('div');
    t.className = 'paper-toast' + (tone === 'red' ? ' bad' : tone === 'emerald' ? ' good' : '');
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-8px)';
      setTimeout(function () { t.remove(); }, 320);
    }, 2600);
  }

  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.hud = { render: render, renderLogs: renderLogs, toast: toast };
})(typeof window !== 'undefined' ? window : globalThis);
