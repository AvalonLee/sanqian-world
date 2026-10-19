/* 奇遇族（奇遇页叙事流 + 抉择浮层 + 结果页 ‖ 第册五十五批 2026-10-19 从 view/index.html 整片搬出 · N34 第十九刀）
 * 范围 = 四件：`feed`（叙事流卡 45 行，原 `feedCard`）‖ `render`（奇遇页 49 行，原 `renderEvent`）
 *   ‖ `choice`（抉择浮层 52 行，原 `showChoice`）‖ `choiceResult`（结果页 42 行，原 `renderChoiceResult`）。合计 188 行。
 * 导出三枚（`feed` 只被 `render` 用 ⇒ 件内互调、不导出）：`render`（`renderTab` 的 `event` 分支）‖ `choice`（四处「该弹抉择了」）
 *   ‖ `choiceResult`（两处：抉择确认的 async 回调 + 袭击倒计时定时器里超时结清那一屏）。
 * 桥 44 → **52 枚**（本刀 +8，全是「家族外也有调用 ⇒ 只能留内核、经桥取」）：`ambushHalt` / `ambushCountdown`（袭击倒计时）
 *   ‖ `mirrorWorn` / `findEvent` / `allEventList` / `exclusiveOf` / `branchChecks` / `checkPreview`（奇遇域助手）。
 *   另复用已有桥名：`date`（游戏历）‖ `fresh`（取新快照）‖ `toast` / `renderTop` / `renderAll`。
 * 留内核两族：**`modal-choice` 那一族的 DOM 监听与 `ambushTimer`**（外置件不绑监听、不持定时器；定时器超时后回调
 *   `SQ.UI.event.choiceResult(ctx(), res)` 把这一屏结清在屏上——那条出口是 2026-10-18「魔道来犯无法点选、又关不掉」的修复，
 *   **不许退化成只 renderAll()**）‖ **`SQ.Actions.resolveChoice` 的结算链**（动作不是渲染）。
 * ⚠️ 改写器字符串感知；件内互调显式补 `c`；改完跑「内核函数名 × 件内裸调用」全表对扫。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 结果页当前那次结算（原内核闭包私有量；内核已零读取 ⇒ 随族搬入件内） */
  /* 上一次结算结果（原内核闭包私有量；内核已零读取，保留写入只为不改变行为） */
  var lastChoiceResult = null;
  function feedOne(c, f) {
    /* 时间列（v2.3）：游戏历（叙事流同属日志流）；旧档无 createdAt 兜底回真实时刻 */
    var ft = c.date(f.ts);
    if (!ft) {
      var dt = new Date(f.ts);
      ft = ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2);
    }
    var grade = c.t('event.tier.' + f.tier) + '·' + c.t('event.nature.' + f.nature);
    var k = f.karma >= 0 ? c.t('event.karma.pos', { n: f.karma }) : c.t('event.karma.neg', { n: f.karma });
    var chk = '';
    if (f.hadCheck) {
      chk = f.pass ? ' <span style="color:var(--good)">' + c.esc(c.t('check.ok')) + '</span>'
        : ' <span style="color:var(--bad)">' + c.esc(c.t('check.fail')) + '</span>';
    }
    /* 卡片整体可点 = 复用图鉴那套「奇遇回看」浮层（`openRecall`：story + 首遇 + 上次抉择 + 上次得失），
     * 不再另造第二张详情卡（用户令「点击近来奇遇卡片应弹窗便于查阅」）。
     * 卡内「未择之路」折叠区自带 `data-act="unwalked"`，委托走 `closest('[data-act]')` ⇒ 内层优先，不冲突。 */
    var h = '<div class="fcard" data-act="recallEvent" data-v="' + c.esc(f.id) + '"><div class="fh">' +
      '<span class="fn">' + c.esc(c.t('event.' + f.id + '.name')) +
      (f.via === 'rumor' ? '<span class="ebadge">' + c.esc(c.t('rumor.badge.via')) + '</span>' : '') +
      ' <span class="hint">[' + c.esc(grade) + ']</span></span><span class="ft">' + c.esc(ft) + '</span></div>';
    h += '<div class="fg">' + c.esc(c.t('event.' + f.id + '.branch.' + f.branch)) + chk + ' · ' + c.esc(k) + '</div>';
    h += '<div class="fe">' + c.esc(SQ.Events.effText(c.w, c.p, c.d, f.eff || {})) + '</div>';
    /* 未择之路折叠区（B8）：仅佩戴照世镜时渲染；卸下即隐藏、展开态复位（renderEvent 侧清 ui.unwalked） */
    if (c.mirrorWorn()) {
      var evU = c.findEvent(f.id);
      var openU = !!c.ui.unwalked[f.ts];
      h += '<div class="unwalked"><span class="uw-t" data-act="unwalked" data-v="' + f.ts + '">' +
        (openU ? '▾ ' : '▸ ') + c.esc(c.t('event.unwalked.title')) + '</span>';
      if (openU && evU) {
        h += '<div class="uw-hint">' + c.esc(c.t('event.unwalked.hint')) + '</div><div class="uw-b">';
        ['right', 'evil', 'neutral'].forEach(function (bk) {
          if (bk === f.branch) return;
          var br = evU.choices && evU.choices[bk];
          if (!br) return;
          var pre = (br.gain || []).map(gainPreview).filter(function (x) { return !!x; }).join(' · ');
          h += '<div>' + c.esc(c.t('event.unwalked.line', { b: c.t('branch.' + bk), label: c.t('event.' + f.id + '.branch.' + bk) })) +
            (pre ? ' · ' + c.esc(pre) : '') + '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  function render(c) {
    var w = c.w;
    if (!c.mirrorWorn()) c.ui.unwalked = {};   /* 卸下照世镜：折叠区隐藏且展开态复位（交互说明 §4.3） */
    var feed = w.eventHistory.feed || [];
    var seenN = Object.keys(w.eventHistory.seen || {}).length;
    var all = c.allEventList();
    var h = '<p class="hint" style="margin:0 0 10px">' + c.esc(c.t('event.page.progress', { n: seenN, total: all.length })) + '</p>';
    /* G17 江湖传闻节（奇遇页顶部——传闻在上、亲历在下） */
    h += SQ.UI.rumor.band(c.fresh(), Date.now());
    h += '<p class="hint" style="margin:10px 0 2px;font-weight:650">' + c.esc(c.t('event.feed.title')) + '</p>';
    if (!feed.length) h += '<p class="hint" style="padding:8px 0">' + c.esc(c.t('event.feed.empty')) + '</p>';
    /* 折叠 3 条 / 展开只到最近 10 条（用户令「展开的条数太多了」）；
     * 存储上限仍是 `D.EVENT_FEED_CAP`（50），这条只管屏上给看多少 ⇒ 不改档、不裁流。 */
    var shown = c.ui.feedExpand ? feed.slice(0, 10) : feed.slice(0, 3);
    shown.forEach(function (f) { h += feedOne(c, f); });
    if (feed.length > 3) {
      h += '<div class="row"><button style="flex:1" data-act="feedMore">' +
        c.esc(c.ui.feedExpand ? c.t('event.feed.less') : c.t('event.feed.more', { n: Math.min(10, feed.length) })) + '</button></div>';
    }
    h += '<p class="hint" style="margin:14px 0 2px;font-weight:650">' + c.esc(c.t('event.codex.title')) + '</p>';
    ['tian', 'di', 'ren'].forEach(function (tier) {
      /* 三节分计数与页首总数自洽（走查稿③ 第 1 项）：天 a/A + 地 b/B + 人 c/C = 页首 n */
      var tierAll = all.filter(function (ev) { return ev.tier === tier; });
      var tierSeen = tierAll.filter(function (ev) { return w.eventHistory.seen[ev.id] != null; }).length;
      h += '<div class="codex-sec">' + c.esc(c.t('event.codex.sec', {
        tier: c.t('event.tier.' + tier), n: tierSeen, total: tierAll.length })) + '</div><div class="codexgrid">';
      tierAll.forEach(function (ev) {
        var seen = w.eventHistory.seen[ev.id] != null;
        var badges = '';
        if (ev.special) badges += '<span class="ebadge">' + c.esc(c.t('event.badge.special')) + '</span>';
        if (ev.once) badges += '<span class="ebadge">' + c.esc(c.t('event.badge.once')) + '</span>';
        var ex = c.exclusiveOf(ev);
        if (ex) {
          /* 宝/法角标灰→金随获得切换（批 2 · 交互说明 ★）：gear 查 gearSeen 'ex_' 键，art 查持有 */
          var got = ex.kind === 'gear'
            ? (w.gearSeen || {})['ex_' + ex.id] != null
            : SQ.Arts.owned(w, ex.id);
          badges += '<span class="ebadge ' + (got ? 'gold' : 'gray') + '">' +
            c.esc(c.t(ex.kind === 'gear' ? 'event.badge.exGear' : 'event.badge.exArt')) + '</span>';
        }
        /* 已解锁格点按 = 回看浮层（story + 首遇 + 上次抉择）；未解锁格点按 = 轻震（★） */
        h += '<div class="cslot ' + (seen ? 'seen' : 'unseen') + '"' +
          (seen ? ' data-act="recallEvent" data-v="' + ev.id + '"' : ' data-act="codexNudge"') + '>' +
          c.esc(seen ? c.t('event.' + ev.id + '.name') : c.t('event.codex.unknown')) + badges + '</div>';
      });
      h += '</div>';
    });
    c.$('tab-event').innerHTML = h;
  }

  function choice(c) {
    var pend = c.w.pendingChoice;
    if (!pend) return;
    var ev = c.findEvent(pend.id);
    if (!ev) return;
    lastChoiceResult = null;
    c.clearJudging();   /* 判定动画的定时器数组仍在核内（内核的作答流也在 push）⇒ 走桥位清点 */
    c.$('mc-badges').innerHTML =
      '<span class="mbadge">' + c.esc(c.t('event.tier.' + ev.tier)) + '</span>' +
      '<span class="mbadge ' + (ev.nature === 'good' ? 'good' : 'bad') + '">' + c.esc(c.t('event.nature.' + ev.nature)) + '</span>' +
      (ev.special ? '<span class="mbadge sp">' + c.esc(c.t('event.badge.special')) + '</span>' : '') +
      (ev.once ? '<span class="mbadge sp">' + c.esc(c.t('event.badge.once')) + '</span>' : '');
    c.$('mc-title').textContent = c.t('event.' + ev.id + '.name');
    c.$('mc-story').textContent = c.t('event.' + ev.id + '.story') +
      /* 敌手快照（第卌四批 · 袭击/寻仇）：名号与战力在触发时刻已定，屏上如实报——
       * 名录里那人此刻可能已绝交/已出榜，但**那一刀是真的冲你来过**，不回填成别人 */
      (pend.foe ? '\n' + c.t('event.ambush.ui.foe', { name: pend.foe.nm, p: SQ.fmt(pend.foe.power) }) : '');
    var bh = '';
    var tac = ev.tactical === true;   /* 战术抉择（迎战 / 避战 / 认输）与善恶无关：不打「正道/魔道」前缀 */
    ['right', 'evil', 'neutral'].forEach(function (bk) {
      var br = ev.choices[bk];
      if (!br) return;
      var infos = [], disabled = false, lackParts = [];
      c.branchChecks(br).forEach(function (chk) {
        var pv = c.checkPreview(chk);
        infos.push(pv.text || pv.label);
        if (pv.kind === 'det' && !pv.ok) { disabled = true; lackParts.push(pv.lack || pv.label); }
      });
      if (disabled) infos.push(c.t('event.branch.lack', { req: lackParts.join(' · ') }));
      var hasLock = (br.gain || []).some(function (g) { return g.type === 'bondLock'; });
      /* 情谊生裂角标（缘尽收敛批）：轻中度背叛分支的预告——措辞比「绝缘」轻，明示不致缘尽 */
      var hasDrain = (br.gain || []).some(function (g) { return g.type === 'bondDrain'; });
      bh += '<button class="branch ' + bk + '-b" data-act="choose" data-v="' + bk + '"' + (disabled ? ' disabled' : '') + '>' +
        '<span class="bk">' + (tac ? '' : c.esc(c.t('branch.' + bk)) + ' · ') + c.esc(c.t('event.' + ev.id + '.branch.' + bk)) +
        (hasLock ? ' <span class="ebadge gray">' + c.esc(c.t('event.badge.bondlock')) + '</span>' : '') +
        (!hasLock && hasDrain ? ' <span class="ebadge gray">' + c.esc(c.t('event.badge.bonddrain')) + '</span>' : '') + '</span>' +
        (infos.length ? '<span class="bi">' + c.esc(infos.join(' · ')) + '</span>' : '') +
        '</button>';
    });
    c.$('mc-branches').innerHTML = bh;
    c.$('mc-branches').classList.remove('hide');
    if (tac) c.ambushCountdown();
    else {
      c.ambushHalt();
      c.$('mc-foot').textContent = c.t('event.modal.foot');
      c.$('mc-foot').classList.remove('hide');
    }
    c.$('mc-judging').classList.add('hide');
    c.$('mc-result').classList.add('hide');
    c.$('modal-choice').classList.remove('hide');
  }

  function choiceResult(c, res) {
    lastChoiceResult = res;
    c.$('mc-branches').classList.add('hide');
    c.$('mc-foot').classList.add('hide');
    c.$('mc-judging').classList.add('hide');
    c.$('mc-result').classList.remove('hide');
    var br = res.ev && res.ev.choices ? res.ev.choices[res.branch] : null;
    var checks = br ? c.branchChecks(br) : [];
    var ck = c.$('mc-check');
    if (checks.length) {
      ck.textContent = res.pass ? c.t('event.result.pass') : c.t('event.result.fail');
      ck.className = 'res-check ' + (res.pass ? 'pass' : 'fail');
    } else {
      ck.textContent = '';
      ck.className = 'res-check';
    }
    c.$('mc-karma').textContent = res.karmaTxt;
    c.$('mc-karma').className = 'res-karma ' + (res.karma >= 0 ? 'pos' : 'neg');
    c.$('mc-eff').textContent = SQ.Events.effText(c.w, c.p, c.d, res.eff || {});
    var exEl = c.$('mc-excl');
    if (res.eff && (res.eff.exclusiveGear || res.eff.exclusiveArt)) {
      /* 独占已入手：全屏演出之外，结果页留一行豁免规则提示（UI §3.5） */
      exEl.textContent = c.t('event.exclusive.hint');
      exEl.classList.remove('hide');
    } else {
      exEl.classList.add('hide');
    }
    /* 绝交锁结果页末行灰字（B7）：「有些事做了，就再没有回头路」
     * 缘尽收敛批（引擎卷 v1.10 §3.6）：门槛不合已降级为情谊生裂 → 换软措辞末行，
     * 明确告知「未至恩断义绝、尚可挽回」，与 res.eff.bondLock 互斥（events.js 已同步撤销）。 */
    var blEl = c.$('mc-bondlock');
    if (res.eff && res.eff.bondLock) {
      blEl.textContent = c.t('log.eff.bondLock', { name: c.t('bond.' + res.eff.bondLock + '.name') });
      blEl.classList.remove('hide');
    } else if (res.eff && res.eff.bondDrain) {
      blEl.textContent = c.t('log.eff.bondDrain.hint', { name: c.t('bond.' + res.eff.bondDrain + '.name') });
      blEl.classList.remove('hide');
    } else {
      blEl.classList.add('hide');
    }
    c.$('mc-ok').textContent = c.t('ui.confirm');
  }
  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.event = { render: render, choice: choice, choiceResult: choiceResult };
})();
