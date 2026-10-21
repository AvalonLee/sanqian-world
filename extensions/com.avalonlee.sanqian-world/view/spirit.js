/* 器灵面板（第册五十八批 2026-10-19 从 view/index.html 整片搬出 · N34 第二十刀 · 阶段 A1）
 * 范围 = 法宝页尾那一节（融合器灵卷 B5）：已祭出法宝的器灵人格 / 技能 / 冷却态 / 一键施技按钮。
 *
 * 唯一调用方是法宝页 `view/treasure.js`（原走桥键 `spiritPanel`）——本片搬走后**桥可缩回一枚**：
 * 桥键 → 件对件调用 `SQ.UI.spirit.render(c)`（同递一枚 `c`）。这正是第十九刀「桥只增不减 = 切错了方向」
 * 那条口径的兑现。
 * 私有量：零。定时器：零。监听：零 ⇒ 本片是全仓风险最低的一刀，只搬呈现、不碰任何机器。
 * 桥只用 `w` / `d` / `p` / `t` / `esc` / `timeLeft`，全部在册（D7 逐键对账）。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function render(c) {
    var w = c.w, d = c.d, p = c.p;
    if (!SQ.Fusion) return '';
    var entries = SQ.Fusion.equippedEntries(w, p);
    if (!entries.length) return '';
    var h = '<div class="sechead"><span class="t">' + c.esc(c.t('spirit.ui.tab')) + '</span></div>';
    entries.forEach(function (pr) {
      var sp = (pr.e.st || {}).spirit || { w: 0, a: 0 };
      var nm = c.t('treasure.' + pr.def.id + '.name');
      if (!sp.a) {
        var need = SQ.Fusion.needOf(d, pr.def);
        h += '<div class="lrow"><div class="nm">' + c.esc(nm) + ' <span class="hint">' + c.esc(c.t('spirit.ui.gray')) + '</span></div>' +
          '<div class="meta">' + c.esc(c.t('spirit.ui.warm', { w: Math.floor(sp.w || 0), need: need })) + '</div>' +
          '<div class="bar slim"><i style="width:' + Math.min(100, ((sp.w || 0) / need) * 100).toFixed(1) + '%"></i></div></div>';
        return;
      }
      var sk = SQ.Fusion.skillOf(d, sp.p);
      var cdLeft = (sp.cd || 0) + (d.SPIRIT.SKILL_CD_MS) - Date.now();
      var state2 = '';
      var disabled = false;
      if (cdLeft > 0) { state2 = c.t('spirit.ui.skill.cd', { t: c.timeLeft(cdLeft) }); disabled = true; }
      else if (sk && sk.id === 'hun' && sp.hun) { state2 = c.t('spirit.ui.skill.mark'); disabled = true; }
      else if (sk && sk.id === 'shi' && (sp.mk || 0) > Date.now()) { state2 = c.t('spirit.ui.skill.mark'); disabled = true; }
      else if (sk && sk.def.field) {
        var liveS = (w.buffs || []).some(function (b) { return b.source === 'spirit_' + sk.id && b.until > Date.now(); });
        if (liveS) { state2 = c.t('spirit.ui.skill.active'); disabled = true; }
      }
      h += '<div class="lrow"><div class="nm">' + c.esc(nm) + ' <span class="special-mark">' + c.esc(c.t('spirit.persona.' + sp.p + '.name')) + '</span></div>' +
        '<div class="meta">' + c.esc(c.t('spirit.ui.skill')) + ' · ' + c.esc(sk ? c.t('spirit.skill.' + sk.id + '.name') + ' — ' + c.t('spirit.skill.' + sk.id + '.desc') : '') +
        (state2 ? ' · ' + c.esc(state2) : '') + '</div>' +
        '<div class="acts"><button data-act="spiritSkill" data-v="' + pr.e.id + '"' + (disabled ? ' disabled' : '') + '>' + c.esc(c.t('spirit.ui.skill.btn')) + '</button></div></div>';
    });
    return h;
  }

  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.spirit = { render: render };
})();
