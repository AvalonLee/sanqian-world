/* G17 江湖传闻卡族（传闻设计卷 §七 · 第册四十批 2026-10-18 从 view/index.html 整片搬出 · N34 第九刀）
 * 范围 = 传闻卡本体 + 传闻带渲染 + 红点两枚助手（`band` / `card` / `maxBorn` / `dotOn`）。
 * 它与别的片不一样：**同一族被两个页共用**（修行页顶栏 + 奇遇页顶部同源渲染，第册卅五批「同源」口径），
   外加页签红点与进线基线两处 ⇒ 内核共四处回头调，本批把四处一次改口 `SQ.UI.rumor.*`，不留转发壳。
 * 「前往查证」那条动作（rumorGo）**刻意留在内核**：它接的是奇遇抉择那套机器（showChoice / autoResolveChoice /
   switchTab 与 afterClaim 同点位），搬过来会把抉择机器一起拖进这一片。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；本件不需新键（`fmtLeft` 第八刀已进桥）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* ── G17 江湖传闻卡（传闻设计卷 §七）：品阶角标 + 性质色调 + 模糊转述 + 沙漏倒计时；
   * 事件真名不剧透，「前往查证」定向触发；war 卡随势力冲突生灭 ── */
  function rumorCard(c, r, now) {
    var leftMs = r.expireAt - now;
    var soon = leftMs <= 5 * 60 * 1000;
    if (r.kind === 'war') {
      var wWar = c.w, warNow = wWar.factionWar;
      var mySide = SQ.Factions.warSideOf(wWar);
      /* 走查修复（需求 2）：非交战方只读不设按钮——「观望」纯提示，无「应战」可点（点也进不去） */
      return '<div class="rumorcard war' + (soon ? ' soon' : '') + '">' +
        '<div class="rt"><span>' + c.esc(c.t('faction.war.title')) + '</span><span>' +
        c.esc(c.t(soon ? 'rumor.ttl.soon' : 'rumor.ttl', { t: c.fmtLeft(Math.max(0, leftMs)) })) + '</span></div>' +
        '<div class="fg">' + c.esc(c.t('rumor.war.tpl', {
          a: warNow ? SQ.Factions.nameOf(wWar, warNow.aId) : '', b: warNow ? SQ.Factions.nameOf(wWar, warNow.bId) : ''
        })) + '</div>' +
        '<div class="row" style="margin-top:6px">' + (mySide
          ? '<button style="flex:1" class="' + (warNow && !warNow.joined ? 'primary' : '') +
            '" data-act="rumorGo" data-v="' + r.rid + '"' + ((warNow && warNow.joined) ? ' disabled' : '') + '>' +
            c.esc(c.t('rumor.war.go')) + '</button>'
          : '<span class="meta hint" style="flex:1;text-align:center">' + c.esc(c.t('faction.war.watch')) + '</span>') +
        '</div></div>';
    }
    /* 冲突结果卡（战功制 · 势力全录卷 §7.4 · B4）：纯展示 + 点击转跳势力页（war 卡放行口径） */
    if (r.kind === 'warResult') {
      return '<div class="rumorcard war' + (soon ? ' soon' : '') + '">' +
        '<div class="rt"><span>' + c.esc(c.t('faction.war.title')) + '</span><span>' +
        c.esc(c.t(soon ? 'rumor.ttl.soon' : 'rumor.ttl', { t: c.fmtLeft(Math.max(0, leftMs)) })) + '</span></div>' +
        '<div class="fg">' + c.esc(c.t('faction.war.result.' + (r.outcome || 'draw'))) + '</div>' +
        '<div class="row" style="margin-top:6px"><button style="flex:1" data-act="rumorGo" data-v="' + r.rid + '">' +
        c.esc(c.t('rumor.war.go')) + '</button></div></div>';
    }
    /* 同代天骄/宗门展示卡（天骄卷 §4.3 · 自立门户卷 §1.4）：kind:'prodigy' 纯展示、独立上限 2 */
    if (r.kind === 'prodigy') {
      return '<div class="rumorcard sky' + (soon ? ' soon' : '') + '">' +
        '<div class="rt"><span>' + c.esc(c.t('prodigy.system')) + '</span><span>' +
        c.esc(c.t(soon ? 'rumor.ttl.soon' : 'rumor.ttl', { t: c.fmtLeft(Math.max(0, leftMs)) })) + '</span></div>' +
        '<div class="fg">' + c.esc(c.t(r.tpl, r.v || {})) + '</div></div>';
    }
    if (r.kind === 'sky') {
      return '<div class="rumorcard sky' + (soon ? ' soon' : '') + '">' +
        '<div class="rt"><span>' + c.esc(c.t('tiandao.type.rumor')) + '</span><span>' +
        c.esc(c.t(soon ? 'rumor.ttl.soon' : 'rumor.ttl', { t: c.fmtLeft(Math.max(0, leftMs)) })) + '</span></div>' +
        '<div class="fg">' + c.esc(r.text || '') + '</div></div>';
    }
    /* 触发态复核（传闻设计 §52/§72）：busy → 「先了结眼前事」；gone/expired（目标事件被被动奇遇抢先
     * 触发进入冷却 / condOk 失配 / once 已见）→ 置灰注明「时过境迁」。旧实现只判 pendingChoice，
     * 失效卡仍渲染可点按钮、点按才 toast「已无从查证」，与正典「卡片置灰注明」不符。 */
    var chkRm = SQ.Rumors.canTrigger(c.w, c.p, c.d, r.rid, now);
    var busy = chkRm.reason === 'busy';
    var dead = !chkRm.ok && !busy;
    var locked = busy || dead;
    return '<div class="rumorcard ' + (r.nature === 'bad' ? 'bad' : 'good') + (soon ? ' soon' : '') + '">' +
      '<div class="rt"><span>' + c.esc(c.t('event.tier.' + r.tier) + ' · ' + c.t('event.nature.' + r.nature)) +
      '</span><span>' + c.esc(c.t(soon ? 'rumor.ttl.soon' : 'rumor.ttl', { t: c.fmtLeft(Math.max(0, leftMs)) })) + '</span></div>' +
      '<div class="fg">' + c.esc(c.t(r.tpl, { place: c.t(r.place) })) + '</div>' +
      '<div class="row" style="margin-top:6px"><button style="flex:1" class="' + (locked ? '' : 'primary') +
      '" data-act="rumorGo" data-v="' + r.rid + '"' + (locked ? ' disabled' : '') + '>' +
      c.esc(c.t(busy ? 'rumor.busy' : (dead ? 'rumor.expired.grey' : 'rumor.go'))) + '</button></div></div>';
  }
  function renderRumors(c, now) {
    var cards = (c.w.rumors || []).slice().sort(function (a, b) { return a.expireAt - b.expireAt; });
    /* B16-n：伪段标（加粗 `p.hint`）改 `.sechead`，计数落右 */
    var h = '<div class="sechead"><span class="t">' + c.esc(c.t('rumor.title')) + '</span>' +
      (cards.length ? '<span class="s">' + cards.length + '</span>' : '') + '</div>';
    if (!cards.length) return h + '<p class="hint" style="padding:8px 0">' + c.esc(c.t('rumor.empty')) + '</p>';
    cards.forEach(function (r) { h += rumorCard(c, r, now); });
    return h;
  }
  /* 传闻红点（G17 · 传闻卷 §七 · 走查修复）：只对「比上次已读更新的传闻」亮——
   * 旧口径「场上存在未过期传闻即亮」会让战况卡（约 20 分钟）把红点钉死不灭。
   * 基线 = ui.rumorSeenAt（已读时点之前出生的传闻不再打扰）；进奇遇页即刷新基线；新传闻出生 → 亮 */
  function maxRumorBornAt(c, w) {
    var now = Date.now(), mx = 0;
    ((w && w.rumors) || []).forEach(function (r) {
      if (r.expireAt > now && r.bornAt > mx) mx = r.bornAt;
    });
    return mx;
  }
  function rumorDotOn(c) {
    if (c.ui.tab === 'event') return false;
    var w = c.w;
    if (!w || !w.rumors) return false;
    if (c.ui.rumorSeenAt == null) c.ui.rumorSeenAt = maxRumorBornAt(c, w);   /* 进线基线：存档既有传闻不打扰 */
    var now = Date.now();
    return (w.rumors || []).some(function (r) { return r.expireAt > now && r.bornAt > c.ui.rumorSeenAt; });
  }
  /* ── 前往查证（G17 · 江湖传闻；第册一百四十六批 2026-10-23 · B5a 自内核派发器搬入）
   * 先判可触发 → 战况传闻给观望/切页 → 触发后按「自动奇遇」设定走自动代择或弹抉择浮层。
   * 桥 +3（本刀唯二的新增面）：`switchTab` / `autoEventOn` / `autoResolveChoice` ——
   *   前一枚是页签机器（战况传闻要我方参战时切去势力页），后两枚是「自动奇遇」代择链，
   *   与 afterClaim 的 tick 侧同一条口径，借桥复用、不抄第二份。 */
  async function actGo(c, v) {
    var chkRm = SQ.Rumors.canTrigger(c.w, c.p, c.d, v, Date.now());
    if (!chkRm.ok) {
      c.toast(c.t(chkRm.reason === 'busy' ? 'rumor.busy' : (chkRm.reason === 'expired' ? 'rumor.expired.grey' : 'rumor.gone')));
      c.renderAll();
      return;
    }
    if (chkRm.war) {
      var warR = c.w.factionWar;
      if (warR && SQ.Factions.warSideOf(c.w)) { c.switchTab('faction'); return; }
      c.toast(c.t('faction.war.watch'));
      return;
    }
    var rRm = await SQ.Actions.triggerRumor(c.s, v);
    /* 传闻触发的奇遇同样遵守「自动奇遇」设定（体验批）：开启 → 自动择分支结算不弹窗；
     * 关闭 → 维持抉择模态。与 afterClaim 的 tick 侧口径一致。 */
    if (rRm && rRm.ok && rRm.pending) {
      if (c.autoEventOn()) c.autoResolveChoice();
      else SQ.UI.event.choice(c.fresh());
    }
    else if (rRm && !rRm.ok) { c.toast(c.t('rumor.gone')); }
    c.renderAll();
  }

  SQ.UI = SQ.UI || {};
  SQ.UI.rumor = { band: renderRumors, maxBorn: maxRumorBornAt, dotOn: rumorDotOn, actGo: actGo };
})();
