/* 洗髓浮层族 · 三格择一替换 + 三候选择一（第册一百三十九批 2026-10-23 · 自 view/index.html 内联块整段搬出 · N82/A3）
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账，不许自取内核私有量）。
 * ⚠️ 本件的回调参数一律不可叫 `c`（会把桥挡住）——搬家后变量名撞车静态判据照不到，只有走查会说话。
 * 依赖：`SQ.Talents`（择格 / 掷候选 / 换骨单口）‖ `SQ.mutate`（改档事务）‖ `SQ.Log` / `SQ.t`（换骨叙事入日志）
 *       ‖ 桥键 `s` / `w` / `d` / `$` / `t` / `toast` / `renderAll` / `talentCard` / `wid`（D7 在册）。
 * 原注（逐字保留）：候选只掷一次并存在 `washDraft` 里（选格不重掷，否则「看着换」变成「赌着换」）；
 *   真正改档只走 `SQ.Talents.applySwap` 单口，视图不自带判定。
 * ⚠️ `washDraft` 自本批起是**件内私有态**：内核侧不再有任何一处直接读写它（原四支分派器全部改成
 *   件内 `slot` / `pick` / `ok` 三口调用）——这正是 D7 第二判要防的那类「闭包私有量跨件」。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  var washDraft = { slot: -1, cand: -1, cands: [] };

  /* 洗髓卡：真卡 DOM 来自内核 `talentCard`（桥），本件只补点选所需的三枚属性 */
  function washCard(c, el, i, act, picked) {
    var d = c.talentCard(el, c.wid());
    d.setAttribute('data-act', act);
    d.setAttribute('data-v', i);
    d.className += ' pickable' + (picked ? ' pick' : '');
    return d;
  }

  function renderWash(c) {
    var sl = c.$('tw-slots');
    sl.innerHTML = '';
    (c.s.profile.talents || []).forEach(function (el, i) { sl.appendChild(washCard(c, el, i, 'washSlot', i === washDraft.slot)); });
    var cb = c.$('tw-cands');
    cb.innerHTML = '';
    washDraft.cands.forEach(function (el, i) { cb.appendChild(washCard(c, el, i, 'washPick', i === washDraft.cand)); });
    c.$('tw-ok').disabled = !(washDraft.slot >= 0 && washDraft.cand >= 0);
  }

  /* 开浮层（三个入口：角色浮层 `#mr-wash` / 修行页段标快捷入口 / 炼丹页服丹成功） */
  function open(c) {
    var w = c.w, cap = (c.d.TALENT_SWAP || {}).PER_LIFE || 0;
    if (!(cap > 0)) return;
    if (!((w.talentOwed || 0) > 0)) { c.toast(c.t('talent.swap.none')); return; }
    washDraft.cands = SQ.Talents.candidates(c.wid(), c.s.profile, 3);
    washDraft.slot = -1; washDraft.cand = -1;
    c.$('tw-title').textContent = c.t('talent.swap.title');
    c.$('tw-sub').textContent = c.t('talent.swap.sub', {
      n: Math.max(0, cap - (w.talentUsed || 0)), cap: cap, owed: w.talentOwed || 0
    });
    c.$('tw-pick-label').textContent = c.t('talent.swap.pick');
    c.$('tw-cand-label').textContent = c.t('talent.swap.cand');
    c.$('tw-close').textContent = c.t('ui.cancel');
    c.$('tw-ok').textContent = c.t('talent.swap.ok');
    renderWash(c);
    c.$('modal-role').classList.add('hide');
    c.$('modal-talentwash').classList.remove('hide');
  }

  /* 择格 / 择候（只改选中态并重绘，不落档、不重掷） */
  function slot(c, v) { washDraft.slot = parseInt(v, 10); renderWash(c); }
  function pick(c, v) { washDraft.cand = parseInt(v, 10); renderWash(c); }

  /* 换骨：改档只走 SQ.mutate 事务口（直写内存态会被下一次 claim 覆盖） */
  async function ok(c) {
    var cand = washDraft.cands[washDraft.cand];
    if (washDraft.slot < 0 || !cand) { c.toast(c.t('talent.swap.need')); return; }
    var res = null;
    await SQ.mutate(c.s, function (s) {
      var id = s.profile.worldId;
      res = SQ.Talents.applySwap(id, s.profile, s.worlds[id], SQ.Worlds[id].pack.data, washDraft.slot, cand.id);
      if (res.ok) SQ.Log.push(s.worlds[id], 'sys', SQ.t('talent.swap.done', {
        from: SQ.t('talent.' + res.from + '.name', null, id),
        to: SQ.t('talent.' + res.to + '.name', null, id)
      }, id));
    });
    if (!res || !res.ok) {
      /* 引擎拒因只有 none（无缘）与形状类（格号/候选非法、撞已持有）两类 ⇒ 前者说「手中没有洗髓缘」，
       * 后者属档面异常，一律回「本世之数已尽」并重的渲染，绝不打裸英文 */
      c.toast(c.t(res && res.reason === 'none' ? 'talent.swap.none' : 'talent.swap.cap'));
      c.renderAll();
      return;
    }
    c.$('modal-talentwash').classList.add('hide');
    c.toast(c.t('talent.swap.done', {
      from: c.t('talent.' + res.from + '.name', null, c.wid()),
      to: c.t('talent.' + res.to + '.name', null, c.wid())
    }));
    c.renderAll();
  }

  function close(c) { c.$('modal-talentwash').classList.add('hide'); }

  SQ.UI = SQ.UI || {};
  /* 导出面 ⇔ 引用面（审计 D14）：`open` 由核内三处转发（角色浮层入口 / 修行页快捷入口 / 炼丹服丹成功）
   * 引用；`slot` / `pick` / `ok` 由分派器三支引用；`close` 由 `#tw-close` 那一行监听引用。 */
  SQ.UI.talentswap = { open: open, slot: slot, pick: pick, ok: ok, close: close };
})();
