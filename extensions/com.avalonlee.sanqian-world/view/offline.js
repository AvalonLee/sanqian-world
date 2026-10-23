/* 出关呈报浮层（第册一百三十九批 2026-10-23 · 自 view/index.html 内联块整段搬出 · N82/A3）
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账，不许自取内核私有量）。
 * ⚠️ 本件的回调参数一律不可叫 `c`（会把桥挡住）。
 * 依赖：`SQ.fmt`（大数缩放，与顶栏同口）‖ 桥键 `w` / `ui` / `$` / `t` / `esc` / `offlineDetail`（D7 在册）。
 * 原注（逐字保留）：出关呈报（F4：lastOffline.at 键控 · 会话一次 · EVENT_CHOICE 优先顺延）
 *   正文改为数据网格：只陈列本次离线所得的数字（修为/灵石/时长/渡劫），不再走散文句式。
 * ⚠️ `ui.seenOfflineAt` 是「已呈报」基线，必须写进**核内同一只 `ui` 对象**（桥给的是引用，不是快照）——
 *   写成件内私有量会让弹层每 tick 复弹一次。这正是 R1「私有态重绑」那条风险的反面用法。
 * 边界：`offlineDetail`（效率/时长/钟面那一格）**留内核**（核内 5 处调用，搬它换来的反向调用比省下的行多），
 *   本件经桥取它的成品文案。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function report(c) {
    var lo = c.w.lastOffline;
    if (!lo) return;
    c.ui.seenOfflineAt = lo.at;
    var lsecs = isFinite(lo.secs) ? lo.secs : 0;   /* 防脏字段：NaN/undefined 一律按 0 计 */
    var lh = Math.floor(lsecs / 3600), lm = Math.floor((lsecs % 3600) / 60);
    var lt = lh > 0 ? c.t('ui.time.hm', { h: lh, m: lm }) : c.t('ui.time.m', { m: Math.max(1, lm) });
    var ventureLo = lo.mode === 'venture';
    var trib = lo.trib || { n: 0, s: 0, f: 0 };
    c.$('mo-title').textContent = c.t('offline.report.title');
    c.$('mo-sub').textContent = c.t(ventureLo ? 'offline.panel.title.v' : 'offline.panel.title');
    c.$('mo-stats').innerHTML =
      '<div class="o"><div class="on">' + c.esc(c.t('resource.primary')) + '</div>' +
        '<div class="ov">+' + SQ.fmt(lo.qi) + '</div></div>' +
      '<div class="o"><div class="on">' + c.esc(c.t('resource.currency')) + '</div>' +
        '<div class="ov">+' + SQ.fmt(lo.stones || 0) + '</div></div>' +
      '<div class="o"><div class="on">' + c.esc(c.t('offline.stat.dur')) + '</div>' +
        '<div class="ov">' + c.esc(lt) + '</div></div>' +
      '<div class="o"><div class="on">' + c.esc(c.t('tribulation.tag')) + '</div>' +
        '<div class="ov">' + trib.n + '<span class="u">' + c.esc(c.t('offline.stat.times')) + '</span></div>' +
        (trib.n > 0 ? '<div class="os">' + c.esc(c.t('offline.stat.trib.split', { s: trib.s, f: trib.f })) + '</div>' : '') +
      '</div>';
    c.$('mo-hint').textContent = c.offlineDetail(lo) + ' · ' +
      c.t(ventureLo ? 'offline.report.hint.v' : 'offline.report.hint');
    c.$('mo-ok').textContent = c.t('offline.report.ok');
    c.$('modal-offline').classList.remove('hide');
  }

  SQ.UI = SQ.UI || {};
  /* 导出面 ⇔ 引用面（审计 D14）：`report` 由 `afterClaim` 弹层栈与 boot 进场两处引用。 */
  SQ.UI.offline = { report: report };
})();
