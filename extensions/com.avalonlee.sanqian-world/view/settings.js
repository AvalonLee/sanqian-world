/* 设置页渲染器（第册一百三十九批 2026-10-23 · 自 view/index.html 内联块整段搬出 · N82/A3）
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账，不许自取内核私有量）。
 * ⚠️ 本件的回调参数一律不可叫 `c`（会把桥挡住）。
 * 依赖：桥键 `s` / `w` / `$` / `t` / `esc` / `identityParts` / `autoEventPref`（D7 在册）。
 * 原注（逐字保留）：Tab 8 设置（重置存档：覆盖为新档 → 回填引用 → 停 tick → 关浮层 → 回创角）——
 *   UI v2 B2：菜单顺序整块下线（D5；`settings.tabOrder` 字段保留但不再读，旧档照常加载）；
 *   自动三开关与奇遇倾向自修行页迁入本页（D6，用户令「日志 + 设置试点，按 B2 开干」）。
 * 边界：本件只渲染，不写档——三个开关与两个危险动作（清增益 / 重置）都仍由核内分派器受理，
 *   换页只影响「谁拼这段 HTML」，不影响「谁改状态」。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function render(c) {
    var h = '';
    var autoT = !!(c.s.settings && c.s.settings.autoTrib);
    var autoE = !!(c.s.settings && c.s.settings.autoEvent);
    var autoR = c.w.gearAutoRefine !== false;   /* 自动炼化（issue #2）：读式不动——新档缺省关由 initialState 显式落 false（册149），无字段老档兼容为开 */
    var autoQ = c.w.gearAutoEquip !== false;    /* 自动佩戴（册150）：缺省开 = 旧行为，同上兼容口径 */
    /* B16-s：按设计稿次序「存档 → 自动 → 关于」重排（原先自动在最上、存档其次），
     * 段标统一 .sechead；开关与动作锚点（data-act / aria-checked）一字未动。 */
    h += '<div class="dsec"><div class="sechead"><span class="t">' + c.esc(c.t('settings.save.title')) + '</span></div>' +
      '<div class="dd">' + c.esc(c.t('settings.save.now', c.identityParts())) + '</div>' +
      '<p class="hint">' + c.esc(c.t('settings.reset.note')) + '</p>' +
      '<div class="setrow"><span class="sl">' + c.esc(c.t('settings.clearbuffs')) +
      '<span class="sd">' + c.esc(c.t('settings.clearbuffs.desc')) + '</span></span>' +
      '<button class="mini" data-act="clearBuffs">' + c.esc(c.t('settings.clearbuffs.btn')) + '</button></div>' +
      '<div class="setrow"><span class="sl">' + c.esc(c.t('settings.reset')) +
      '<span class="sd">' + c.esc(c.t('settings.reset.desc')) + '</span></span>' +
      '<button class="danger" data-act="resetSave">' + c.esc(c.t('settings.reset.btn')) + '</button></div></div>';
    h += '<div class="dsec"><div class="sechead"><span class="t">' + c.esc(c.t('idle.auto.sec')) + '</span></div>' +
      '<div class="setrow"><span class="sl">' + c.esc(c.t('settings.auto.title')) +
      '<span class="sd">' + c.esc(c.t('settings.auto.desc')) + '</span></span>' +
      '<button class="switch' + (autoT ? ' on' : '') + '" data-act="toggleAutoTrib" role="switch" aria-checked="' + autoT + '">' +
      '<i></i><span>' + c.esc(autoT ? c.t('settings.auto.on') : c.t('settings.auto.off')) + '</span></button></div>' +
      '<div class="setrow"><span class="sl">' + c.esc(c.t('settings.autoevent.title')) +
      '<span class="sd">' + c.esc(c.t('settings.autoevent.desc')) + '</span></span>' +
      '<button class="switch' + (autoE ? ' on' : '') + '" data-act="toggleAutoEvent" role="switch" aria-checked="' + autoE + '">' +
      '<i></i><span>' + c.esc(autoE ? c.t('settings.auto.on') : c.t('settings.auto.off')) + '</span></button></div>';
    /* 奇遇倾向紧跟自动奇遇（第册一百四十九批 · 用户令「上下关系，中间不隔自动炼化」）：
     * 自动炼化整行挪到倾向块之后；倾向仍随父开关渐进披露（autoE 关 ⇒ 整块不渲染）。 */
    if (autoE) {
      var prefNow = c.autoEventPref();
      h += '<div class="setrow col"><span class="sl">' + c.esc(c.t('settings.eventpref.title')) +
        '<span class="sd">' + c.esc(c.t('settings.eventpref.desc')) + '</span></span>' +
        '<div class="chips">' +
        ['none', 'right', 'evil', 'neutral'].map(function (pk) {
          return '<button class="' + (prefNow === pk ? 'on' : '') + '" data-act="setEventPref" data-v="' + pk + '">' +
            c.esc(c.t('event.pref.' + pk)) + '</button>';
        }).join('') + '</div></div>';
    }
    /* 自动佩戴（册150 用户令）：与自动炼化同族、行序在其前（先穿后炼的逻辑链）；缺省开 = 旧行为。 */
    h += '<div class="setrow"><span class="sl">' + c.esc(c.t('settings.gearequip.title')) +
      '<span class="sd">' + c.esc(c.t('settings.gearequip.desc')) + '</span></span>' +
      '<button class="switch' + (autoQ ? ' on' : '') + '" data-act="toggleGearEquip" role="switch" aria-checked="' + autoQ + '">' +
      '<i></i><span>' + c.esc(autoQ ? c.t('settings.auto.on') : c.t('settings.auto.off')) + '</span></button></div>';
    h += '<div class="setrow"><span class="sl">' + c.esc(c.t('settings.gearrefine.title')) +
      '<span class="sd">' + c.esc(c.t('settings.gearrefine.desc')) + '</span></span>' +
      '<button class="switch' + (autoR ? ' on' : '') + '" data-act="toggleGearRefine" role="switch" aria-checked="' + autoR + '">' +
      '<i></i><span>' + c.esc(autoR ? c.t('settings.auto.on') : c.t('settings.auto.off')) + '</span></button></div>';
    h += '</div>';
    h += '<div class="dsec"><div class="sechead"><span class="t">' + c.esc(c.t('settings.about.title')) + '</span></div>' +
      '<div class="dd">' + c.esc(c.t('settings.about.body')) + '</div></div>';
    c.$('tab-settings').innerHTML = h;
  }

  SQ.UI = SQ.UI || {};
  /* 导出面 ⇔ 引用面（审计 D14）：`render` 由 `renderTab` 与本页「清增益」回调两处引用。 */
  SQ.UI.settings = { render: render };
})();
