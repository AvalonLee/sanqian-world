/* 炼丹炼器页（炼丹卷 B3 ‖ 绿灯不等于链通批 C3 · 第册四十六批 2026-10-19 从 view/index.html 整片搬出 · N34 第十一刀）
 * 范围 = 这一页的呈现族（丹房器台 / 丹匣 / 图纸与炼制方向 / 材料背包与提炼 / 熟练度）+ 它的动作（alStart · alCollect · alDrink · alSell · alRefine · forgeBp/Dir/Attr）。
 * 区内私名两枚随片同迁且不导出：`alFailText`（reason → 文案，未知也兜底成话）与 `alCraftBlock`（前置判定），它们**只被这一页读**；
 *   ⚠️ `alFailText` 同时被件外探针 `probe-alchemyfail.cjs` 抽源码判形状 ⇒ 那件的抽取路径本批一起改了（不改就静默抽不到）。
 * 动作侧的 `el` **不外流**：内核从 `el.dataset` 取好 `kind` / `cs` 再递进来，件内只见值不见节点。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；洗髓丹服下即开的浮层**不再过桥**——
 *   第册一百三十九批把洗髓族整族外置 `view/talentswap.js` 后，本件改成件对件直调 `SQ.UI.talentswap.open(c)`
 *   （原 `showWash` 桥位于同批退役，桥 −1 枚；与第册五十八批 `spiritPanel` 同型收口）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* ── 炼丹炼器页（炼丹卷 B3：丹房器台 / 材料背包 / 采集 / 熟练度）── */
  /* ── 炼制失败原因 → 文案（绿灯不等于链通批 · C3）──────────────────────
   * SQ.Alchemy.startCraft 的 reason 全集（逐条从 alchemy.js 的 startCraft 体内数出，非猜）：
   *   realm / busy / furnace / recipe / stock / mats（炼丹路）
   *   bp / has / dir / attr / mats（炼器路）/ kind（两路皆非的兜底）
   * 视图此前拼 'alchemy.ui.fail.' + reason 取词，而**整族在词表里一条都没有** ⇒ toast 直接把
   * mats / has 这类内部字段名打上屏（与账本 N13 同族）。本表把每个 reason 指向一条**既有**文案，
   * 只给确实无文案的 6 条 + 1 条兜底新铸 alchemy.ui.fail.*；alchemy.ui.busy 这个躺着不动的键
   * 就此收口（原判为 A6 假阳是错的：它是**读点键名与写侧键名不一致**，不是扫描盲区）。 */
  var AL_FAIL_KEYS = {
    realm: 'alchemy.ui.unlock', busy: 'alchemy.ui.busy', furnace: 'alchemy.ui.nofurnace',
    recipe: 'alchemy.ui.fail.recipe', stock: 'alchemy.ui.stockfull', mats: 'alchemy.ui.matslack',
    bp: 'alchemy.ui.fail.bp', has: 'alchemy.ui.fail.has', dir: 'alchemy.ui.fail.dir',
    attr: 'alchemy.ui.fail.attr', kind: 'alchemy.ui.fail.kind'
  };
  function alFailText(c, reason) {
    var k = AL_FAIL_KEYS[reason];
    if (!k) return c.t('alchemy.ui.fail.other');
    var s = c.t(k);
    return s === k ? c.t('alchemy.ui.fail.other') : s;   /* 键缺失也兜底成话，绝不裸拉丁上屏 */
  }
  /* 开炉前置判定（C3 另一半）：与 startCraft **同批校验、同序**，返回第一个不满足的 reason
   * （null = 条件齐）。读数全部走引擎既有出口（recipeActive / hasFurnace / zoneMats / bpTierOf），
   * 视图不重算任何数值口径。旧 disabled 态只看了 hasFur && !cr，材料和方向一律不查 ⇒
   * 「正常可点」的按钮把玩家推进失败 toast，失败成了常规路径而非边角。 */
  function alCraftBlock(c, kind, id, opts) {
    var w = c.w, d = c.d, AD = d.ALCHEMY || {}, al = w.alchemy || {};
    opts = opts || {};
    if (w.realm < (AD.UNLOCK_REALM != null ? AD.UNLOCK_REALM : 1)) return 'realm';
    if (al.craft) return 'busy';
    if (!SQ.Alchemy.hasFurnace(w, c.p, d, c.s.meta)) return 'furnace';
    if (kind === 'dan') {
      var r = SQ.Alchemy.recipeById(d, id);
      if (!r || !SQ.Alchemy.recipeActive(w, d, id)) return 'recipe';
      if ((al.pills || {})[r.pill] >= (AD.PILL_STOCK_CAP || 99)) return 'stock';
      for (var ri = 0; ri < r.mats.length; ri++) {
        /* 缺项判定必须 `|| 0`（与引擎 takeMats 同口径）：材料键缺失时 undefined < n 恒 false，
         * 会让本应置灰的按钮照常可点——走查实跑抓到的真错。 */
        if (((w.materials || {})[r.mats[ri][0]] || 0) < r.mats[ri][1]) return 'mats';
      }
      return null;
    }
    if (kind !== 'qi') return 'kind';
    var bp = SQ.Alchemy.bpById(d, id);
    if (!bp || (al.blueprints || []).indexOf(id) < 0) return 'bp';
    if (bp.furnace && al.furnace) return 'has';
    var need = bp.furnace ? (AD.FURNACE_MAT_COST || 10)
      : (bp.jing ? (AD.FORGE_MAT_COST_JING || 12) : (AD.FORGE_MAT_COST || 6));
    var zcF = Math.min(w.realm, (d.ZONES || []).length - 1);
    var pool = SQ.Alchemy.zoneMats(d, zcF);
    if (!pool.length) return 'mats';
    var haveF = 0;
    pool.forEach(function (mid) { haveF += (w.materials || {})[mid] || 0; });
    if (haveF < need) return 'mats';
    if (!bp.furnace) {
      var fT = SQ.Alchemy.bpTierOf(w, d, zcF, bp);
      var dokF = false;
      ((AD.FORGE_DIRS || {})[bp.slot] || []).forEach(function (dd) {
        if (dd.dir === opts.dir && fT >= (dd.minTier || 0)) dokF = true;
      });
      if (!dokF) return 'dir';
      if (fT >= 3 && !(opts.attr === 'jing' || opts.attr === 'qi' || opts.attr === 'shen')) return 'attr';
    }
    return null;
  }

  function render(c) {
    var w = c.w, d = c.d, p = c.p;
    var A = d.ALCHEMY;
    if (w.realm < (A.UNLOCK_REALM || 1)) {
      c.$('tab-alchemy').innerHTML = '<p class="hint">' + c.esc(c.t('alchemy.ui.unlock')) + '</p>';
      return;
    }
    var al = w.alchemy || { furnace: false, recipes: [], blueprints: [], prof: { dan: 0, qi: 0 }, pills: {}, craft: null };
    var hasFur = SQ.Alchemy.hasFurnace(w, p, d, c.s.meta);
    /* B16-o2（原 B16-i 押后项）：丹房 / 器台分页（设计稿 .seg2）。纯视图态 ui.alTab，不落盘；
     * 炉中队列**留在分页之外常驻**——否则器台在炼时切到丹房就取不到丹，功能会被藏起来。 */
    var alTab = c.ui.alTab === 'qi' ? 'qi' : 'dan';
    var h = '<div class="seg2" aria-label="' + c.esc(c.t('alchemy.system')) + '">' +
      '<button class="' + (alTab === 'dan' ? 'on' : '') + '" data-act="alTab" data-v="dan">' + c.esc(c.t('alchemy.tab.dan')) + '</button>' +
      '<button class="' + (alTab === 'qi' ? 'on' : '') + '" data-act="alTab" data-v="qi">' + c.esc(c.t('alchemy.tab.qi')) + '</button></div>';
    /* 熟练度双轨 */
    var rkD = SQ.Alchemy.profRank(d, al.prof ? al.prof.dan : 0), rkQ = SQ.Alchemy.profRank(d, al.prof ? al.prof.qi : 0);
    var nD = (al.prof || {}).dan || 0, nQ = (al.prof || {}).qi || 0;
    /* B16-i · 设计稿 §炼丹炼器 .sum3：熟练 / 丹炉 / 在炼（三个数全部现算） */
    h += '<div class="sum3">' +
      '<div><div class="k">' + c.esc(c.t('alchemy.sum.prof')) + '</div><div class="v">' +
      c.esc(c.t('alchemy.prof.short', { rank: c.t('alchemy.rank.' + rkD + '.name'), n: nD })) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('alchemy.sum.fur')) + '</div><div class="v">' +
      c.esc(hasFur ? c.t('alchemy.furnace.name') : c.t('alchemy.ui.nofurnace')) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('alchemy.sum.craft')) + '</div><div class="v">' +
      c.esc(c.t('alchemy.ui.craft.n', { n: al.craft ? 1 : 0 })) + '</div></div></div>';
    h += '<p class="hintline">' + c.esc(c.t('alchemy.prof.line', {
      a: c.t('alchemy.prof.row', { track: c.t('alchemy.prof.dan'), rank: c.t('alchemy.rank.' + rkD + '.name'), n: nD }),
      b: c.t('alchemy.prof.row', { track: c.t('alchemy.prof.qi'), rank: c.t('alchemy.rank.' + rkQ + '.name'), n: nQ })
    })) + '</p>';
    /* 炼制队列（单槽）→ 设计稿「炉中」一条 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('alchemy.ui.queue')) + '</span></div>';
    var cr = al.craft;
    if (cr) {
      var ready = Date.now() >= cr.doneAt;
      h += '<div class="strip"><span class="t">' + c.esc(cr.kind === 'dan' ? c.t('alchemy.recipe.' + cr.id + '.name') : c.t('alchemy.bp.' + cr.id + '.name')) + '</span>' +
        '<span class="v">' + c.esc(ready ? c.t('alchemy.ui.queue.ready') : c.t('alchemy.ui.queue.wait', { t: c.timeLeft(cr.doneAt - Date.now()) })) + '</span>' +
        '<button class="more" data-act="alCollect"' + (ready ? '' : ' disabled') + '>' + c.esc(c.t('alchemy.ui.collect')) + '</button></div>';
    } else {
      h += '<p class="hint">' + c.esc(c.t('alchemy.ui.queue.empty')) + '</p>';
    }
    /* 丹方册 → 整行清单（设计稿：一个丹方一行，材料/成算在左、库存与开炉在右） */
    /* 分页口径：非当前页整段生成后丢弃（纯渲染，无副作用），只把当前页拼进 h */
    var hBase = h; if (alTab !== 'dan') h = '';
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('alchemy.ui.dan')) + '</span></div>';
    if (!(al.recipes || []).length) h += '<p class="hint">' + c.esc(c.t('alchemy.ui.recipe.none')) + '</p>';
    else h += '<div class="rowlist">';
    (A.RECIPES || []).forEach(function (r) {
      if ((al.recipes || []).indexOf(r.id) < 0) return;
      var active = w.realm >= r.realm;
      var blkD = alCraftBlock(c, 'dan', r.id, null);   /* 与 startCraft 同序的前置判定（C3） */
      var stockN = (al.pills || {})[r.pill] || 0;
      var pCraft = Math.round(SQ.Alchemy.craftP(d, r.tier, rkD, w) * 100);
      h += '<div class="lrow carditem' + (active ? '' : ' locked') + '"><div class="nm">' + c.esc(c.t('alchemy.recipe.' + r.id + '.name')) +
        ' <span class="tierbadge ' + c.artTier({ tier: r.tier }) + '">' + c.esc(c.t('skill.tier.' + r.tier)) + '</span></div>' +
        '<div class="meta">' + c.esc(r.mats.map(function (mm) { return c.t('alchemy.mat.' + mm[0] + '.name') + '×' + mm[1]; }).join(' + ')) +
        ' · ' + c.esc(c.t('alchemy.ui.success', { p: pCraft })) + ' · ' + c.esc(c.t('alchemy.ui.stock', { n: stockN })) + '</div>' +
        (active ? '' : '<div class="meta red">' + c.esc(c.t('alchemy.ui.recipe.locked', { realm: c.t('realm.' + r.realm) })) + '</div>') +
        /* 前置不齐就把原因写在行上（不再只靠 disabled 猜），按钮同步置灰 */
        (blkD && blkD !== 'recipe' ? '<div class="meta red">' + c.esc(alFailText(c, blkD)) + '</div>' : '') +
        '<div class="acts"><button data-act="alStart" data-v="' + r.id + '" data-c="dan"' +
        (blkD ? ' disabled' : '') + '>' + c.esc(c.t('alchemy.ui.start')) + '</button></div></div>';
    });
    if ((al.recipes || []).length) h += '</div>';
    /* 丹药库存 → 设计稿「丹匣」网格（名 ×n + 服） */
    var pillKeys = Object.keys(al.pills || {});
    if (pillKeys.length) {
      var pillTotal = pillKeys.reduce(function (a, k) { return a + (al.pills[k] || 0); }, 0);
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('alchemy.ui.danbox')) + '</span>' +
        '<span class="s">' + c.esc(c.t('alchemy.ui.stock', { n: pillTotal })) + '</span></div>';
      h += '<div class="matgrid">';
      pillKeys.forEach(function (pk) {
        /* 两族合一（第十七批）：自产丹与坊市 / 门中 / 特席 / 残片所得的成品丹同匣同渲染，
         * 名字与描述各按本族词表键取（pillDefOf 给），徽标分「自炼」/「坊市」两色不新造色、共用 .tierbadge */
        var pd = SQ.Alchemy.pillDefOf(c.d, pk);
        if (!pd) return;                                    /* 白名单外的脏键不渲染（normalize 已滤，双保险） */
        var stronger = '';
        if (pd.buff) {
          var liveB = (w.buffs || []).filter(function (b) { return b.field === pd.buff.field && b.mult > pd.buff.mult * (pd.rune ? 2 : 1) && b.until > Date.now(); });
          if (liveB.length) stronger = ' · ' + c.t('alchemy.ui.stronger');
        }
        h += '<div class="matrow"><span class="m-n">' + c.esc(c.t(pd.nameKey)) +
          (pd.rune ? ' <span class="special-mark">' + c.esc(c.t('alchemy.ui.rune')) + '</span>' : '') +
          ' <span class="tierbadge t2">' + c.esc(c.t(pd.kind === 'self' ? 'alchemy.ui.selfmade' : 'alchemy.ui.traded')) + '</span></span>' +
          '<span class="m-c">×' + al.pills[pk] + '</span>' +
          '<span class="m-d">' + c.esc(c.t(pd.descKey)) + c.esc(stronger) + '</span>' +
          '<button data-act="alDrink" data-v="' + pk + '">' + c.esc(c.t('alchemy.ui.drink')) + '</button></div>';
      });
      h += '</div>';
    }
    if (alTab !== 'dan') h = hBase;
    /* 炼器（图纸 + 方向 + 属性指向）→ 设计稿「器台 · 图纸」整行 */
    hBase = h; if (alTab !== 'qi') h = '';
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('alchemy.ui.bp.sec')) + '</span></div>';
    if (!(al.blueprints || []).length) h += '<p class="hint">' + c.esc(c.t('alchemy.ui.bp.none')) + '</p>';
    else h += '<div class="rowlist">';
    c.ui.forge = c.ui.forge || { bp: null, dir: null, attr: null };
    (A.BLUEPRINTS || []).forEach(function (bp) {
      if ((al.blueprints || []).indexOf(bp.id) < 0) return;
      var zc = Math.min(w.realm, d.ZONES.length - 1);
      var fTier = bp.furnace ? null : SQ.Alchemy.bpTierOf(w, d, zc, bp);   /* 精制 +1 同引擎口径 */
      var sel = c.ui.forge.bp === bp.id;
      h += '<div class="lrow carditem"><div class="nm">' + c.esc(c.t('alchemy.bp.' + bp.id + '.name')) +
        (fTier != null ? ' <span class="tierbadge t' + fTier + '">' + c.esc(c.t('gear.tier.' + fTier)) + '</span>' : '') + '</div>' +
        '<div class="meta">' + c.esc(c.t('alchemy.bp.' + bp.id + '.desc')) + (bp.furnace && al.furnace ? ' · ' + c.esc(c.t('legacy.ui.owned')) : '') + '</div>';
      if (sel && !bp.furnace) {
        /* N20 接线：「恒低于同期掉落上限」是打造线的正典约束（炼丹炼器卷 §6.4），此前只有角标、没有这句解释 */
        h += '<div class="meta hint">' + c.esc(c.t('alchemy.ui.forge.tier', { tier: c.t('gear.tier.' + fTier) })) + '</div>';
        var dirs = (A.FORGE_DIRS || {})[bp.slot] || [];
        h += '<div class="chips" style="margin-top:4px">';
        dirs.forEach(function (dd) {
          var lock = fTier < (dd.minTier || 0);
          h += '<button class="' + (c.ui.forge.dir === dd.dir ? 'on' : '') + '" data-act="forgeDir" data-v="' + dd.dir + '"' + (lock ? ' disabled' : '') + '>' +
            c.esc(c.t('alchemy.dir.' + dd.dir)) + (lock ? ' · ' + c.esc(c.t('alchemy.ui.dir.lock')) : '') + '</button>';
        });
        h += '</div>';
        if (fTier >= 3) {
          h += '<div class="chips" style="margin-top:4px">';
          ['jing', 'qi', 'shen'].forEach(function (at) {
            h += '<button class="' + (c.ui.forge.attr === at ? 'on' : '') + '" data-act="forgeAttr" data-v="' + at + '">' + c.esc(c.t('attr.' + at)) + '</button>';
          });
          h += '</div><p class="hint">' + c.esc(c.t('alchemy.ui.attr')) + '</p>';
        }
      }
      var matNeed = bp.furnace ? (A.FURNACE_MAT_COST || 10) : (bp.jing ? (A.FORGE_MAT_COST_JING || 12) : (A.FORGE_MAT_COST || 6));
      /* 炼器同炉（C3）：旧 disabled 只看 hasFur && !cr，**材料、方向、属性指向三项一律不查** ⇒
       * 图纸选好后直接点「开炉」必吃一次失败 toast（且 toast 上是裸拉丁）。 */
      var blkQ = alCraftBlock(c, 'qi', bp.id, { dir: c.ui.forge.dir, attr: c.ui.forge.attr });
      h += (sel && blkQ ? '<div class="meta red">' + c.esc(alFailText(c, blkQ)) + '</div>' : '') +
        '<div class="acts"><button data-act="forgeBp" data-v="' + bp.id + '"' + (sel ? ' disabled' : '') + '>' + c.esc(sel ? c.t('alchemy.ui.dir') : c.t('alchemy.ui.forge.pick')) + '</button>' +
        (sel ? '<button class="primary" data-act="alStart" data-v="' + bp.id + '" data-c="qi"' + (blkQ ? ' disabled' : '') + '>' +
          c.esc(c.t('alchemy.ui.start')) + ' · ' + c.esc(c.t('alchemy.ui.matneed', { n: matNeed })) + '</button>' : '') + '</div></div>';
    });
    if ((al.blueprints || []).length) h += '</div>';
    if (!al.furnace && (al.blueprints || []).indexOf('bp_furnace') >= 0) { /* 丹炉图纸打造走同一 alStart */ }
    if (alTab !== 'qi') h = hBase;
    /* 材料背包 + 出售 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('alchemy.ui.mats')) + '</span>' +
      '<span class="s">' + c.esc(c.t('alchemy.ui.mats.n', { n: Object.keys(w.materials || {}).length })) + '</span></div>';
    var matIds = Object.keys(w.materials || {});
    if (!matIds.length) h += '<p class="hint">' + c.esc(c.t('alchemy.ui.mats.empty')) + '</p>';
    else {
      /* ── 第廿九批（2026-10-13 · 用户：「材料背包中的材料顺序是乱的，应该让用户明白低级材料精炼升级的是哪种
       * 高级材料，同一条升级线的材料应该要有标识给用户感知到」）──
       * 引擎的提炼规则是**四档制**（`alchemy.js:groupOf`：z0~2 = 一档 / z3~5 = 二档 / z6~8 = 三档 / z9 = 顶档），
       * 同材 ×4 → **次档候选池里随机一种** ×1（池 = `SQ.Alchemy.groupIds(D, g+1)`，与 `refineMats` 读同一处）。
       * 旧背包按 `Object.keys(ws.materials)` 的入账先后排 ⇒ 三档料夹着一档料摆在一起，玩家既看不出线、
       * 也看不出「这把料炼上去会变成哪几样」。现按 (档, 秘境序, id) 全序排，**逐档分段**：段头写次档与候选种数，
       * 每枚料挂一枚档标识（同标识 = 同一条升级线）。 */
      var matMeta = {};
      ((A && A.MATS) || []).forEach(function (m) { matMeta[m.id] = m; });
      matIds.sort(function (x1, x2) {
        var m1 = matMeta[x1] || { z: 0 }, m2 = matMeta[x2] || { z: 0 };
        var r = SQ.Alchemy.groupOf(d, x1) - SQ.Alchemy.groupOf(d, x2);
        if (r) return r;
        /* 悟道石（z = -1）按 groupOf 落顶档卖价，但它不入任何产出池 ⇒ 段内置后，不与仙玉级并排 */
        r = (m1.z < 0 ? 99 : m1.z) - (m2.z < 0 ? 99 : m2.z);
        return r || (x1 < x2 ? -1 : (x1 > x2 ? 1 : 0));
      });
      h += '<p class="hint" style="margin:0 0 4px">' + c.esc(c.t('alchemy.ui.refine.hint')) + '</p>';
      var curRank = -1;
      matIds.forEach(function (mid) {
        var gM = SQ.Alchemy.groupOf(d, mid);
        if (gM !== curRank) {
          if (curRank >= 0) h += '</div>';
          curRank = gM;
          var nxtN = SQ.Alchemy.groupIds(d, gM + 1).length;
          h += '<div class="sechead" data-matline="' + gM + '"><span class="t">' +
            c.esc(c.t('alchemy.ui.mat.rank', { n: gM + 1 })) + ' · ' +
            c.esc(nxtN ? c.t('alchemy.ui.mat.line', { k: A.REFINE_IN || 4, up: gM + 2, p: nxtN })
              : c.t('alchemy.ui.mat.line.top', { n: gM + 1 })) + '</span></div><div class="cardgrid">';
        }
        h += '<div class="lrow carditem"><div class="nm">' + c.esc(c.t('alchemy.mat.' + mid + '.name')) + ' ×' + w.materials[mid] +
          ' <span class="catbadge">' + c.esc(c.t('alchemy.ui.mat.rank', { n: gM + 1 })) + '</span></div>' +
          '<div class="meta">' + c.esc(SQ.fmt(SQ.Alchemy.sellPriceOf(d, mid))) + ' ' + c.esc(c.t('resource.currency')) + '/' + c.esc(c.t('alchemy.ui.sell')) + '</div>' +
          '<div class="acts"><button data-act="alSell" data-v="' + mid + '" data-c="1">' + c.esc(c.t('alchemy.ui.sell')) + '</button>' +
          '<button data-act="alSell" data-v="' + mid + '" data-c="0">' + c.esc(c.t('alchemy.ui.sellall')) + '</button>' +
          (gM < 3 ? '<button data-act="alRefine" data-v="' + mid + '"' +
            ((w.materials[mid] >= (A.REFINE_IN || 4)) ? '' : ' disabled') + '>' + c.esc(c.t('alchemy.ui.refine')) + '</button>' : '') +
          '</div></div>';
      });
      h += '</div>';
    }
    /* 采集 / 灵田已改自动轴（采集：驻区历练每 1 游戏年入账 1~4 枚本区材料；灵田：驻留福地每 6 游戏月入账 1~4 枚），
     * 无手动入口；材料产出说明见「秘境洞天 → 洞天福地 → 附属设施 · 灵田」描述。 */
    c.$('tab-alchemy').innerHTML = h;
  }


  /* 委托分支 `act === 'alStart'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actAlStart(c, v, kind) {
    var kindS = kind;
    var optsS = kindS === 'qi' ? { dir: (c.ui.forge || {}).dir, attr: (c.ui.forge || {}).attr } : {};
    var rS = await SQ.Actions.alStart(c.s, kindS, v, optsS);
    if (rS && !rS.ok) c.toast(alFailText(c, rS.reason));
    c.renderAll();
    return;
    return;
  }
  /* 委托分支 `act === 'alCollect'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actAlCollect(c) {
    var rC = await SQ.Actions.alCollect(c.s);
    if (rC && rC.ok && rC.success && rC.rune) c.toast(c.t('alchemy.log.rune', { name: c.t('alchemy.pill.jiuzhuan') }));
    else if (rC && rC.ok && !rC.success) c.toast(c.t('alchemy.log.fail.dan', { name: '' }));
    else if (rC && rC.reason === 'stock') c.toast(c.t('alchemy.ui.stockfull'));
    c.renderAll();
    return;
    return;
  }
  /* 委托分支 `act === 'alDrink'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actAlDrink(c, v) {
    var rDk = await SQ.Actions.alDrink(c.s, v);
    if (rDk && !rDk.ok) {
    /* 服丹失败三支 reason（drinkPill: stock / once / swapfull）全覆盖——旧兜底把 'stock' 裸打上屏，
    * 与本批 C3 同族，顺手收口。swapfull = 洗髓丹在本世三次已尽时拒服（扣丹前判，不白吃）。
    * 🔧 N43（第册十二批）：第四支 'daily' 随丹毒日限整族退役，屏上那句谎话一并删。 */
    c.toast(c.t(rDk.reason === 'once' ? 'alchemy.ui.once'
    : rDk.reason === 'swapfull' ? 'alchemy.ui.swapfull' : 'alchemy.ui.pillnone'));
    } else if (rDk && rDk.ok && rDk.swap) {
    /* 洗髓丹服下即开洗髓浮层（缘已入账，先 renderAll 让顶栏与角色浮层读数跟上） */
    c.renderAll();
    SQ.UI.talentswap.open(c);
    return;
    }
    c.renderAll();
    return;
    return;
  }
  /* 委托分支 `act === 'alSell'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actAlSell(c, v, cs) {
    var nSell = cs === '0' ? 9999 : parseInt(cs, 10);
    await SQ.Actions.alSell(c.s, v, nSell);
    c.renderAll();
    return;
    return;
  }
  /* 委托分支 `act === 'alRefine'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actAlRefine(c, v) {
    var rRf = await SQ.Actions.alRefine(c.s, v);
    if (rRf && rRf.ok) c.toast(c.t('alchemy.log.refine', { name: c.t('alchemy.mat.' + v + '.name'), gain: c.t('alchemy.mat.' + rRf.gain + '.name') }));
    else if (rRf && rRf.reason === 'stock') c.toast(c.t('alchemy.ui.matslack'));
    c.renderAll();
    return;
    return;
  }
  /* 委托分支 `act === 'forgeBp'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actForgeBp(c, v) {
    c.ui.forge = c.ui.forge || {}; c.ui.forge.bp = (c.ui.forge.bp === v ? null : v); c.ui.forge.dir = null; c.ui.forge.attr = null; c.renderTab();
    return;
  }
  /* 委托分支 `act === 'forgeDir'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actForgeDir(c, v) {
    c.ui.forge = c.ui.forge || {}; c.ui.forge.dir = v; c.renderTab();
    return;
  }
  /* 委托分支 `act === 'forgeAttr'` 随本片搬来（内核只把桥与已取好的实参递进来，`el` 不流出借件） */
  async function actForgeAttr(c, v) {
    c.ui.forge = c.ui.forge || {}; c.ui.forge.attr = v; c.renderTab();
    return;
  }
  SQ.UI.alchemy = { render: render, actStart: actAlStart, actCollect: actAlCollect, actDrink: actAlDrink, actSell: actAlSell, actRefine: actAlRefine, actForgeBp: actForgeBp, actForgeDir: actForgeDir, actForgeAttr: actForgeAttr };
})();
