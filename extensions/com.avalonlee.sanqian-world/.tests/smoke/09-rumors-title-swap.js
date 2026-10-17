/* .tests/smoke/09-rumors-title-swap.js — 冒烟断言 15 条（首 #247 ‖ 末 #298）
 * 由 smoke.js 的 run() 体逐字切出（原第 8688~9643 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：247 262 263 264 265 270 271 272 273 274 275 276 296 297 298
*/
window.SQSmoke.frag('09-rumors-title-swap', async function () {
    ok('247', '传闻预留：活跃传闻指向的事件不被被动奇遇抢先触发（fire 排除 + 空池流产）', ok247,
      'withRumor=' + (r247a && r247a.id) + ' noRumor=' + (r247b && r247b.id));

    /* ═══ #262 自立门户三效果接线批 ①（2026-10-07 · 自立门户卷 §4.2 丹房① + §2.3 功法子集）═══
     * 设计文案+常量在册但消费点缺席的两环落地实测：宗门丹房 → alchemy 炼丹消费点（第 4 丹炉渠道 +
     * 平坦 +5%）；宗规三倾向 → 藏经阁弟子传法子集（槽数 min 收窄，左道不限，不锁宗主自己）。
     * #261 号位由承继选择批占用，本批占 #262/#263；#222 的「丹房 pending 零生效」就地收窄为双向态。 */
    var SC262 = D.SECT, AL262 = D.ALCHEMY;
    var m262 = mkMeta(); m262.unlocks.sect = true;
    /* 功法集：2 正道 + 1 魔道（alignment 取 SQ.XARTS 真实字段，非测试自造） */
    var artSet262 = ['qingxin', 'tiebi', 'posha'];
    var align262Chk = SC262.ART_ALLOW.right.join() === 'right,neutral' &&
      SC262.ART_ALLOW.evil.join() === 'evil,neutral' &&
      ['right', 'neutral', 'evil'].every(function (x) { return SC262.ART_ALLOW.neutral.indexOf(x) >= 0; });
    var elig262 = {};
    ['right', 'neutral', 'evil'].forEach(function (a) {
      elig262[a] = artSet262.filter(function (id) {
        return SC262.ART_ALLOW[a].indexOf(SQ.XARTS[id].alignment) >= 0;
      }).length;
    });
    function mkSect262(align, ov) {
      var w = mkSectWs220();
      w.artsKnown = artSet262.slice(); w.artsSlots = ['tiebi']; w.artsLevels = { tiebi: 3 };
      SQ.Sect.foundSect(w, pack, D, m262, 'wuyue', null, [0, 0], align, Date.now(), noopLog());
      w.sect.fac = { zangjing: 3, danfang: 0, yanwu: 0, keshe: 0 };
      w.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 4, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
      if (ov) Object.assign(w, ov);
      return w;
    }
    /* ① 丹房 → craftP：地阶档 3（宗师）基线 0.6400 → 0.6900；平坦不随级缩放；CRAFT_CAP 0.95 钳住 */
    var w262p = mkSect262('neutral');
    var p262di0 = SQ.Alchemy.craftP(D, 'di', 3, w262p);
    w262p.sect.fac.danfang = 1; var p262di1 = SQ.Alchemy.craftP(D, 'di', 3, w262p);
    w262p.sect.fac.danfang = 5; var p262di5 = SQ.Alchemy.craftP(D, 'di', 3, w262p);
    var p262cap = SQ.Alchemy.craftP(D, 'huang', 3, w262p);        /* 0.85+0.09+0.05 = 0.99 → 钳 0.95 */
    var rate262 = Math.abs(p262di0 - 0.64) < 1e-9 && Math.abs(p262di1 - 0.69) < 1e-9 &&
      p262di5 === p262di1 && p262cap === AL262.CRAFT_CAP &&
      SQ.Alchemy.danfangCraftBonus(w262p, D) === 0.05 && SC262.DANFANG_CRAFT === 0.05;
    /* ② 第 4 丹炉渠道走真链路（startCraft 炉检，非只读 getter） */
    var w262f = mkSect262('neutral');
    SQ.Alchemy.ensure(w262f, D); SQ.Alchemy.autoGrant(w262f, D);
    SQ.Alchemy.addMats(w262f, pack, D, { mat_linglu: 4, mat_qingmu: 4 }, 1, null);
    var noFur262 = SQ.Alchemy.startCraft(w262f, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
    w262f.sect.fac.danfang = 1;
    var yesFur262 = SQ.Alchemy.startCraft(w262f, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
    /* ②′ 真链路出炉掷判：丹成读点带 +5%、器台读点不带（同档丹房 5 级、同一 collectCraft 入口） */
    var w262k = mkSect262('neutral'); w262k.sect.fac.danfang = 5;
    SQ.Alchemy.ensure(w262k, D); w262k.alchemy.blueprints.push('bp_furnace');
    SQ.Alchemy.addMats(w262k, pack, D, { mat_leisui: 20 }, 1, null);   /* 器台按 ws.realm 取本区主材（realm4 → z4 池） */
    var sc262qi = SQ.Alchemy.startCraft(w262k, pack, D, 'qi', 'bp_furnace', {}, null, 1, noopLog());
    var pQi262 = (function () { var rs = stubRandom([0.99]);
      var r = SQ.Alchemy.collectCraft(w262k, pack, D, null, null, sc262qi.craft.doneAt + 1, null); rs(); return r; })();
    var w262k2 = mkSect262('neutral'); w262k2.sect.fac.danfang = 5;
    SQ.Alchemy.ensure(w262k2, D); SQ.Alchemy.autoGrant(w262k2, D);
    SQ.Alchemy.addMats(w262k2, pack, D, { mat_linglu: 4, mat_qingmu: 4 }, 1, null);
    var sc262dan = SQ.Alchemy.startCraft(w262k2, pack, D, 'dan', 'rc_juqi', {}, null, 1, noopLog());
    var pDan262 = (function () { var rs = stubRandom([0.99]);
      var r = SQ.Alchemy.collectCraft(w262k2, pack, D, null, null, sc262dan.craft.doneAt + 1, null); rs(); return r; })();
    var path262 = sc262qi.ok === true && pQi262.ok === true &&
      Math.abs(pQi262.p - AL262.CRAFT_BASE.qi) < 1e-9 &&
      Math.abs(pDan262.p - (AL262.CRAFT_BASE.huang + SC262.DANFANG_CRAFT)) < 1e-9;
    /* ③ 福地丹房 + 宗门丹房并存：只有一份 +5%（择定口径见 alchemy.js danfangCraftBonus 卷注） */
    var w262b = mkSect262('neutral'); w262b.sect.fac.danfang = 4;
    var cvb262 = SQ.Cave.current(w262b, pack);
    w262b.cave.fac[cvb262.id] = w262b.cave.fac[cvb262.id] || {};
    w262b.cave.fac[cvb262.id].danfang = 3;
    var both262 = SQ.Alchemy.craftP(D, 'di', 3, w262b);
    /* ④ 传位后（succession）渠道摘除——宗主已下山，宗门转 NPC 位 */
    var w262s = mkSect262('neutral'); w262s.sect.fac.danfang = 5;
    w262s.sect.succession = { done: true, heir: '某弟子', rep: 500, at: 1 };
    var succ262 = SQ.Alchemy.hasFurnace(w262s, pack, D, null) === false &&
      SQ.Alchemy.craftP(D, 'di', 3, w262s) === p262di0 && SQ.Alchemy.sectDanfangLv(w262s, D) === 0;
    var fur262 = noFur262.reason === 'furnace' && yesFur262.ok === true &&
      both262 === p262di1 && succ262 &&
      SQ.Alchemy.hasFurnace(w262b, pack, D, null) === true;
    /* ⑤ 藏经阁功法子集：同持功法集下 正道 / 魔道 弟子战力不同（左道 = 不限 = 与正道同档） */
    var dp262 = { right: 0, neutral: 0, evil: 0 };
    var sl262 = { right: 0, neutral: 0, evil: 0 };
    ['right', 'neutral', 'evil'].forEach(function (a) {
      var w = mkSect262(a);
      sl262[a] = SQ.Sect.zangjingSlots(w, pack, SC262);
      dp262[a] = SQ.Sect.discPower(w, pack, D, w.sect.disciples[0]);
    });
    var base262 = D.REALMS[4].power * (SC262.APT_MULT.mid || 1);
    var subset262 = Math.abs(dp262.right - base262 * (1 + Math.min(SC262.ART_SLOTS[3], elig262.right) * SC262.ART_POWER)) < 1e-9 &&
      Math.abs(dp262.evil - base262 * (1 + Math.min(SC262.ART_SLOTS[3], elig262.evil) * SC262.ART_POWER)) < 1e-9 &&
      dp262.right !== dp262.evil && dp262.neutral === dp262.right &&
      sl262.right === 2 && sl262.evil === 1 && sl262.neutral === 2;
    /* ⑥ 只收窄不放大：藏经阁满级 3 槽而只持 1 部 → 1 槽；零持 → 0 槽 */
    var w262n1 = mkSect262('neutral', { artsKnown: ['tiebi'] });
    var w262n0 = mkSect262('neutral', { artsKnown: [] });
    w262n1.sect.fac.zangjing = 5; w262n0.sect.fac.zangjing = 5;
    var clamp262 = SQ.Sect.zangjingSlots(w262n1, pack, SC262) === 1 &&
      SQ.Sect.zangjingSlots(w262n0, pack, SC262) === 0 &&
      SQ.Sect.discPower(w262n0, pack, D, w262n0.sect.disciples[0]) === base262;
    /* ⑦ 不锁宗主自己（§2.3 裁定）：魔道宗门下宗主槽内正道功法效果照全额进乘区 */
    var sumR262 = SQ.Mods.collect({ talents: [] }, mkSect262('right'), pack, D).sum.combatPower;
    var sumE262 = SQ.Mods.collect({ talents: [] }, mkSect262('evil'), pack, D).sum.combatPower;
    var sumNo262 = (function () { var w = mkWs({ artsKnown: artSet262.slice(), artsSlots: ['tiebi'], artsLevels: { tiebi: 3 } });
      return SQ.Mods.collect({ talents: [] }, w, pack, D).sum.combatPower; })();
    var lordFree262 = sumR262 === sumE262 && sumE262 === sumNo262 && sumE262 > 0 &&
      mkSect262('evil').artsKnown.join() === artSet262.join();
    /* ⑧ 供奉挂名不传法：同辈高人战力不受子集约束（三档全等） */
    var off262 = {};
    ['right', 'neutral', 'evil'].forEach(function (a) {
      var w = mkSect262(a);
      w.sect.disciples = [{ id: 'd9', nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id }];
      off262[a] = SQ.Sect.discPower(w, pack, D, w.sect.disciples[0]);
    });
    ok('262', '自立门户接线①（丹房 + 传法子集）：(a) 地阶档 3 成功率 0.6400 → 0.6900（SECT.DANFANG_CRAFT 平坦 +5%，5 级 = 1 级、满级递进卷面 ⏳ 未定故不造阶梯）；黄阶档 3 加项后 0.99 由 CRAFT_CAP 钳回 0.95；(b) 宗门丹房 ≥1 级 = 第 4 丹炉渠道，真跑 startCraft 炉检 拒(furnace)→ 通(ok)，且 collectCraft 真出炉读点 p 丹 0.9000（含 +5%）/ 器 0.8000（不含）；传位后渠道自动摘除；(c) 并存裁定——福地丹房 + 宗门丹房同开只有一份 +5%（两份相加 = 卷面未授权的第二数值，已否决），福地 artsSpeed 轴零改动，炼器口径（不传 ws）零波及；(d) 藏经阁槽数 = min(ART_SLOTS[级], 宗规内已持功法部数)：同持 {2 正道 + 1 魔道} 集下 正道 2 槽 / 魔道 1 槽 → 弟子战力不同、左道 = 不限与正道同档；只收窄不放大（1 部 → 1 槽、0 部 → 0 槽）；(e) 不锁宗主自己：魔道宗门宗主槽内正道功法 mods.sum.combatPower 与无宗门档逐字段全等；供奉挂名不传法三档战力全等',
      align262Chk && rate262 && fur262 && path262 && subset262 && clamp262 && lordFree262 &&
      off262.right === off262.neutral && off262.neutral === off262.evil,
      'craftP(地阶,档3)=' + p262di0.toFixed(4) + '→' + p262di1.toFixed(4) + '（5 级=' + p262di5.toFixed(4) + '）' +
      ' 黄阶档3 钳位=' + p262cap.toFixed(4) + ' ‖ 炉检=' + noFur262.reason + '/' + yesFur262.ok +
      ' 并存=' + both262.toFixed(4) + ' 传位=' + succ262 +
      ' ‖ 真出炉 p(丹/器)=' + (pDan262 && pDan262.p.toFixed(4)) + '/' + (pQi262 && pQi262.p.toFixed(4)) +
      ' ‖ 槽数=' + JSON.stringify(sl262) + ' 合格功法=' + JSON.stringify(elig262) +
      ' 战力=' + JSON.stringify({ right: +dp262.right.toFixed(2), neutral: +dp262.neutral.toFixed(2), evil: +dp262.evil.toFixed(2) }) +
      ' ‖ 宗主乘区=' + JSON.stringify([sumR262, sumE262, sumNo262]) + ' 供奉=' + off262.right.toFixed(2));

    /* ═══ #263 自立门户三效果接线批 ②（2026-10-07 · 自立门户卷 §2.3 表「天道态度」· 天道卷 §九.3 纯文本层）═══
     * 裁定 = 判词措辞按 align 分组（天象短评追加同调性判语 + 编年史宗门三条分组），零机制：
     * OMEN_NODES 白名单零扩（仍 7 · 自立门户卷 §十.4 №2 明禁本卷单方面扩）、既有节点模板池与
     * 本局去重掩码零漂移、宗门红线「零渡劫加项」守住。 */
    var key263 = ['tiandao.sectomen.right', 'tiandao.sectomen.evil',
      'sect.chronicle.found.right', 'sect.chronicle.found.evil',
      'sect.chronicle.win.right', 'sect.chronicle.win.evil',
      'sect.chronicle.succ.right', 'sect.chronicle.succ.evil'];
    var lex263 = key263.filter(function (k) {
      var v = SQ.t(k, { name: 'N', heir: 'H' }, 'xiuxian');
      return v === k || !v || v.indexOf('{') >= 0;
    });
    /* 天象短评：同节点连掷，正道/魔道队列文本各自 = 基准模板 + 本宗按语；左道 = 基准模板原样 */
    var noteR263 = SQ.t('tiandao.sectomen.right', { name: '青云剑宗' }, 'xiuxian');
    var noteE263 = SQ.t('tiandao.sectomen.evil', { name: '赤血魔门' }, 'xiuxian');
    var noteOk263 = noteR263.indexOf('青云剑宗') >= 0 && noteR263 !== 'tiandao.sectomen.right' &&
      noteE263.indexOf('赤血魔门') >= 0 && noteE263 !== 'tiandao.sectomen.evil' && noteR263 !== noteE263;
    var warTpl263 = [];
    for (var wi263 = 1; wi263 <= D.TIANDAO.OMEN_TPL_N.war; wi263++) {
      warTpl263.push(SQ.t('tiandao.skyomen.war.' + wi263, { a: 'A', b: 'B' }, 'xiuxian'));
    }
    var sky263 = {};
    ['right', 'neutral', 'evil'].forEach(function (a) {
      var w = mkSect262(a); w.sect.name = a === 'evil' ? '赤血魔门' : '青云剑宗';
      var before = { stones: w.stones, qi: w.qi, karma: w.karmaEventScore, trib: JSON.stringify(w.tribulation) };
      var txt = SQ.Tiandao.pushOmen(w, pack, D, 'war', { a: 'A', b: 'B' }, Date.now());
      var stripped = txt.slice(0, txt.length - (a === 'neutral' ? 0 : (' ' + SQ.t('tiandao.sectomen.' + a, { name: w.sect.name }, 'xiuxian')).length));
      sky263[a] = {
        ret: txt, len: w.tiandao.omenQueue.length, inPool: warTpl263.indexOf(stripped) >= 0,
        note: a === 'neutral' ? txt === stripped : txt.slice(stripped.length) === ' ' + SQ.t('tiandao.sectomen.' + a, { name: w.sect.name }, 'xiuxian'),
        zeroMech: w.stones === before.stones && w.qi === before.qi && w.karmaEventScore === before.karma &&
          JSON.stringify(w.tribulation) === before.trib
      };
    });
    var succSky263 = (function () { var w = mkSect262('evil'); w.sect.succession = { done: true, heir: 'x', rep: 1, at: 1 };
      return SQ.Tiandao.sectSkyNote(w, pack, D) === ''; })();
    /* 编年史措辞分组：宗门三条 × 三档 = 9 个互不相同的判词，且逐条等于**独立推出**的词表键解析值
     * （期望键由 §2.3 分组建：左道 = 基准键无后缀、正道 .right、魔道 .evil，不经 sectChronKey 自证） */
    var CHRON_BASE263 = { sectfound: 'found', sectwin: 'win', sectsucc: 'succ' };
    var CHRON_SFX263 = { right: '.right', neutral: '', evil: '.evil' };
    var chron263 = {}, chronDiff263 = true, chronHit263 = true;
    ['sectfound', 'sectwin', 'sectsucc'].forEach(function (k) {
      ['right', 'neutral', 'evil'].forEach(function (a) {
        var w = mkSect262(a); w.sect.name = '试剑宗';
        var got = SQ.Tiandao.chronText(w, pack, D, { k: k, v: { name: '试剑宗', heir: '长风' } });
        var want263 = SQ.t('sect.chronicle.' + CHRON_BASE263[k] + CHRON_SFX263[a],
          { name: '试剑宗', heir: '长风' }, 'xiuxian');
        chron263[k + '.' + a] = got;
        if (got !== want263 || !got || got.indexOf('试剑宗') < 0 ||
          got === SQ.t('sect.chronicle.' + CHRON_BASE263[k] + CHRON_SFX263[a], null, 'xiuxian')) chronHit263 = false;
      });
      if (chron263[k + '.right'] === chron263[k + '.evil'] || chron263[k + '.neutral'] === chron263[k + '.evil']) chronDiff263 = false;
    });
    /* 宗门节点未入列 + 模板池对表 + 奏疏总长仍落 MEMO_LEN 区间（措辞分组不得把编年史挤出契约必需行）
     * ⚠️ 2026-10-07 N4 收口批**就地改窄**（旧判据编码的是改前口径、一条未删）：白名单由 7 → 8 节点，
     *    新增项 = `prodrank`（同代榜换位，天骄卷候选扩展节点转正），**宗门节点仍未入列**——本条原判据
     *    的语义（自立门户卷不单方面扩白名单）因此保住，模板池 Σ 由 86 → 96。 */
    var pool263 = D.TIANDAO.OMEN_NODES.length === 8 &&
      D.TIANDAO.OMEN_NODES.join() === 'tribwin,tribfail,break,clear,karma,war,rebirth,prodrank' &&
      D.TIANDAO.OMEN_NODES.every(function (nd) { return nd.indexOf('sect') < 0; }) &&
      Object.keys(D.TIANDAO.OMEN_TPL_N).reduce(function (s, kk) { return s + D.TIANDAO.OMEN_TPL_N[kk]; }, 0) === 96;
    var memo263 = {};
    ['right', 'evil'].forEach(function (a) {
      var w = mkSect262(a);
      w.realm = 4; w.tribulation.attempts = 5; w.tribulation.success = 2; w.cleared = [0, 1, 2];
      w.tiandao.stats = { accept: 2, defy: 1 };
      for (var ci263 = 0; ci263 < 12; ci263++) SQ.Tiandao.chronPush(w, ci263 % 2 ? 'sectfound' : 'clear', { z: 1, name: '试剑宗' }, Date.now() + ci263);
      var askR = SQ.Tiandao.ask(w, pack, D, { talents: [] }, 'wenjie', 0, '', Date.now());
      memo263[a] = askR.ok === true ? askR.text.length : -1;
    });
    var memoLen263 = memo263.right >= D.TIANDAO.MEMO_LEN[0] && memo263.right <= D.TIANDAO.MEMO_LEN[1] &&
      memo263.evil >= D.TIANDAO.MEMO_LEN[0] && memo263.evil <= D.TIANDAO.MEMO_LEN[1];
    ok('263', '自立门户接线②（宗规 → 天道态度 · 判词分组零机制）：(a) 天象短评按 align 追加分组判语——正道褒评 / 魔道差评 / 左道空串（中性即基准模板原样，故该族只 2 键不生孤儿），追加后队列正文剥去按语仍逐字命中 war 节点 13 条模板池（本局去重掩码与 OMEN_TPL_N 对表零漂移），传位后（succession）按语自动摘除；(b) 编年史宗门三条（立派/大捷/传位）措辞按 align 分组，9 个组合两两不同且逐条等于词表解析值（基准键 = 左道中性，未改名故零孤儿）；(c) 全链零机制——pushOmen 前后 stones/qi/karmaEventScore/tribulation 四字段全等、队列仍 +1 条容量 3；OMEN_NODES 内**无宗门节点**（白名单现 8 节点 = N4 收口批追加 `prodrank` 换位节点，宗门节点入列仍归天道卷下次升版，自立门户卷 §十.4 №2 跨卷观察项）、模板池 Σ = 96；8 条新词表键全可解析零 `{}` 残留；(d) 分组措辞入奏疏后总长仍落 MEMO_LEN [500,800] 区间',
      lex263.length === 0 && noteOk263 && sky263.right.note && sky263.evil.note && sky263.neutral.note &&
      sky263.right.inPool && sky263.evil.inPool && sky263.neutral.inPool &&
      sky263.right.len === 1 && sky263.evil.len === 1 && sky263.neutral.len === 1 &&
      sky263.right.zeroMech && sky263.evil.zeroMech && sky263.neutral.zeroMech &&
      sky263.right.ret !== sky263.evil.ret && succSky263 && chronDiff263 && chronHit263 && pool263 && memoLen263,
      '新键缺失=' + (lex263.length ? lex263.join(',') : '0') +
      ' ‖ 天象 len=' + JSON.stringify({ right: sky263.right.ret.length, neutral: sky263.neutral.ret.length, evil: sky263.evil.ret.length }) +
      ' 基准命中池=' + JSON.stringify([sky263.right.inPool, sky263.neutral.inPool, sky263.evil.inPool]) +
      ' ‖ 立派判词 正/左/魔=' + JSON.stringify([chron263['sectfound.right'], chron263['sectfound.neutral'], chron263['sectfound.evil']]) +
      ' ‖ OMEN_NODES=' + D.TIANDAO.OMEN_NODES.length + ' 池Σ=' + Object.keys(D.TIANDAO.OMEN_TPL_N).reduce(function (s, kk) { return s + D.TIANDAO.OMEN_TPL_N[kk]; }, 0) +
      ' 奏疏长=' + JSON.stringify(memo263));

    /* ═══ #264 榜位换位入天象节点（2026-10-07 · 天骄卷 :136/:483 + 天道卷 §7.1 · N4 收口批）═══
     * 取证对象 = 「换位那一瞬间真的有一条天象」这条链，不是「函数存在」：
     *   真链路 Prodigy.tick 跨 RANK_REFRESH_MS 节律 → pushOmen('prodrank') → omenQueue 出正文；
     *   八节点位掩码容量复核（本局去重 de.dedup）+ 旧档 7 位 → 8 位迁移不串位（表尾追加纪律）。 */
    var PD264 = D.PRODIGY, C264 = D.TIANDAO;
    var w264 = pack.initialState();
    w264.realm = 6; w264.zone = 5;                        /* zone 与天骄 rlm 错开 → 月概率事件零触发 */
    w264.prodigies = [];
    for (var p264 = 0; p264 < PD264.COUNT_MAX; p264++) {
      /* 前 3 位封顶境界 9 稳居我之上 ⇒ 真名次 = 4 且月推进不再变（确定性摆位，不靠运气撞换位）*/
      w264.prodigies.push({ id: 'pr' + (p264 + 1), nm: [0, p264 % 6, 0], tl: [], al: 1, fc: -1, fid: null,
        apt: 0, rlm: p264 < 3 ? 9 : 0, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] });
    }
    var t264 = 1700000000000;
    var q264 = function () { return ((w264.tiandao || {}).omenQueue) || []; };
    var tail264 = function () { var a = q264(); return a[a.length - 1] || null; };
    var pcnt264 = function () { return q264().filter(function (o) { return o.node === 'prodrank'; }).length; };
    var snapMech = function () {
      return [w264.stones, w264.qi, w264.karmaEventScore, JSON.stringify(w264.tribulation)].join('|');
    };
    /* 首轮：初始化 prevRank（不当轮播报，正典口径）*/
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264, { log: noopLog() });
    var r264 = w264.prodMarks.myRank;
    var init264 = pcnt264() === 0 && r264 > 2;
    /* ① 反超：prevRank 写差两位 → 刷新边界算回真值 4 ⇒ dir = up、正文落 {rank}/{dir} */
    var mech0 = snapMech();
    w264.prodMarks.myRank = r264 + 2;
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264 + PD264.RANK_REFRESH_MS, { log: noopLog() });
    var upO = tail264();
    var up264 = !!upO && upO.node === 'prodrank' &&
      upO.text.indexOf(SQ.t('tiandao.dir.up', null, 'xiuxian')) >= 0 &&
      upO.text.indexOf(String(r264)) >= 0 && upO.text.indexOf('{') < 0 &&
      w264.prodMarks.myRank === r264 && snapMech() === mech0 && SQ.Tiandao.unseenOmens(w264) >= 1;
    /* ② 被超：反向写差 → dir = down，同一次刷新只入队一条 */
    var p0 = pcnt264();
    w264.prodMarks.myRank = r264 - 2;
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264 + PD264.RANK_REFRESH_MS * 2, { log: noopLog() });
    var dnO = tail264();
    var down264 = !!dnO && dnO.node === 'prodrank' && pcnt264() === p0 + 1 &&
      dnO.text.indexOf(SQ.t('tiandao.dir.down', null, 'xiuxian')) >= 0 &&
      dnO.text.indexOf(String(r264)) >= 0 && dnO.text.indexOf('{') < 0 && w264.prodMarks.myRank === r264;
    /* ③ 名次未变 → 零出账（刷新边界每 10 游戏年一次，不刷屏）*/
    var p1 = pcnt264(), l1 = q264().length;
    SQ.Prodigy.tick(w264, pack, D, M(mkProf([]), w264), 30000, t264 + PD264.RANK_REFRESH_MS * 3, { log: noopLog() });
    var quiet264 = pcnt264() === p1 && q264().length === l1 && w264.prodMarks.myRank === r264;
    /* ④ 队列容量 OMEN_QUEUE_CAP(3) 溢出挤最旧（连投 5 条换位短评）*/
    for (var oi = 0; oi < 5; oi++) SQ.Tiandao.pushOmen(w264, pack, D, 'prodrank', { dir: 'up', rank: 9 }, t264 + oi);
    var capQ264 = q264().length === C264.OMEN_QUEUE_CAP &&
      q264().every(function (o) { return o.node === 'prodrank' && o.text.indexOf('第 9') >= 0 && o.text.indexOf('{') < 0; });
    /* ⑤ 八节点位掩码容量：prodrank 满池 1..10 严格递增、末抽 2^10−1、第二轮静默重置；
     *    逐节点掩码在 32 位有符号移位内不翻负（第 8 节点入列后仍成立 = 本行明面要求的复核）*/
    var idx264 = C264.OMEN_NODES.indexOf('prodrank');
    var td264 = { omenSeen: [], chenSeen: 0 }, seq264 = [];
    for (var pk264 = 0; pk264 < C264.OMEN_TPL_N.prodrank; pk264++) {
      seq264.push(SQ.Tiandao.pickOmenTpl(td264, C264, 'prodrank', function () { return 0; }));
    }
    var msk264 = td264.omenSeen[idx264];
    var mask264 = seq264.join() === '1,2,3,4,5,6,7,8,9,10' && msk264 === Math.pow(2, 10) - 1 &&
      idx264 === 7 && C264.OMEN_NODES.length === 8 &&
      SQ.Tiandao.pickOmenTpl(td264, C264, 'prodrank', function () { return 0; }) === 1;
    var capBits264 = C264.OMEN_NODES.every(function (nd) {
      var nN = C264.OMEN_TPL_N[nd] || 0;
      return nN >= 1 && nN <= 30 && (1 << (nN - 1)) > 0 && (Math.pow(2, nN) - 1) < 0x7fffffff;
    });
    /* ⑥ 旧档迁移：7 位掩码数组（逐位已点亮）→ normalize 补第 8 位为 0、前 7 位逐位不动 */
    var oldSeen = [1, 3, 7, 15, 31, 63, 127];
    var nz264 = SQ.Tiandao.normalize({ omenSeen: oldSeen.slice() }, D);
    var mig264 = nz264.omenSeen.length === 8 && nz264.omenSeen.slice(0, 7).join() === oldSeen.join() &&
      nz264.omenSeen[7] === 0;
    /* ⑦ 节点名与方向词全可解析（视图 t('tiandao.omen.node.' + node) 取词口）*/
    var lblKey264 = SQ.t('tiandao.omen.node.prodrank', null, 'xiuxian');
    var lbl264 = lblKey264 !== 'tiandao.omen.node.prodrank' && !!lblKey264 && lblKey264.indexOf('{') < 0 &&
      ['up', 'down'].every(function (dd) {
        var k2 = 'tiandao.dir.' + dd, v2 = SQ.t(k2, null, 'xiuxian');
        return v2 && v2 !== k2;
      });
    ok('264', '榜位换位入天象节点（N4 · 节点 7→8 对表 + 换位真出账 + 去重位掩码容量）：(a) 真链路 `Prodigy.tick` 跨 `RANK_REFRESH_MS` 刷新边界、名次真变 ⇒ `omenQueue` 尾条 node=`prodrank`、正文含方向词与**真名次**、零 `{}` 残留、机制四字段逐字节全等（天道卷 §7.1 纯文本零机制）、红点 `unseenOmens` ≥1；(b) 反超 `tiandao.dir.up` / 被超 `tiandao.dir.down` 两向各出一条、同一次刷新只入队一条、**名次未变则零出账**（不刷屏）；(c) 队列容量 `OMEN_QUEUE_CAP`(3) 溢出挤最旧；(d) 八节点位掩码：prodrank 满池取到 1..10 严格递增、末抽掩码 = 2^10−1、耗尽静默开第二轮、`idx = 7`（**表尾追加**纪律）；逐节点 `1<<(N−1)` 在 32 位有符号内为正 ⇒ 第 8 节点入列后容量有余；(e) 旧档 7 位掩码 normalize → 8 位、前 7 位逐位不动、第 8 位补 0（去重记忆不串位）；(f) `tiandao.omen.node.prodrank` + 两枚方向词可解析',
      init264 && up264 && down264 && quiet264 && capQ264 && mask264 && capBits264 && mig264 && lbl264,
      '初始化静默=' + init264 + '(真名次=' + r264 + ') up=' + (upO ? upO.text.slice(0, 30) : '×') +
      ' ‖ down=' + (dnO ? dnO.text.slice(0, 30) : '×') + ' 同级零出账=' + quiet264 + ' 队列=' + q264().length + '/' + C264.OMEN_QUEUE_CAP +
      ' ‖ 满池=' + seq264.join(',') + ' 末掩码=' + msk264 + ' idx=' + idx264 + ' 位容量=' + capBits264 +
      ' ‖ 迁移=' + nz264.omenSeen.join(',') + ' ‖ 节点名=' + lblKey264);

    /* ═══ #265 榜位称号发放口（2026-10-07 · 图鉴卷 §2.9 称号墙来源 + 天骄卷 :6「照旧不翻」补本体 · N5 收口批）═══
     * 图鉴卷把「天骄榜位」列为称号墙来源却**未定义条目**（codex/prodigy 两侧零榜位称号写口），
     * 本批补的就是本体三件套：id `title_bangshou` / 判据 = 首次登顶 / 幂等键 = meta.titles 跨世不清。
     * 取证走生产真路径 `Codex.scan`，不是直调 addTitle。 */
    var TS265 = 80;                                     /* addTitle 的 while(>80) shift 上限 */
    var w265 = mkWs({ realm: 6, zone: 5 });
    w265.prodMarks = { myRank: 1, rankAt: 1, slotMax: 30, rankRows: [], sudiWin: false, evf: {} };
    var m265 = mkMeta();
    var ref265 = { profile: mkProf([]), worlds: { xiuxian: w265 }, meta: m265 };
    SQ.Codex.scan(ref265, 11);
    var nm265 = SQ.t('codex.title.title_bangshou', null, 'xiuxian');
    var got265 = m265.titles.indexOf('title_bangshou') >= 0 && !!nm265 && nm265 !== 'codex.title.title_bangshou' &&
      nm265.indexOf('{') < 0 && ((m265.codices || {}).title || []).indexOf('title_bangshou') >= 0;
    /* 幂等：连扫 5 次不再重复入墙、遗泽零二次发放 */
    var k265 = m265.karma, n265 = m265.titles.length;
    for (var s265 = 0; s265 < 5; s265++) SQ.Codex.scan(ref265, 12 + s265);
    var dupN265 = m265.titles.filter(function (x) { return x === 'title_bangshou'; }).length;
    var idem265 = dupN265 === 1 && m265.titles.length === n265 && m265.karma === k265 && identOk(m265);
    /* 反例两路：② 非榜首（myRank 2）不发、③ 未解锁（prodMarks 恒缺省 = 金丹前）不发 */
    var w265b = mkWs({ realm: 6, zone: 5 });
    w265b.prodMarks = { myRank: 2, rankAt: 1, slotMax: 30, rankRows: [], evf: {} };
    var m265b = mkMeta();
    SQ.Codex.scan({ profile: mkProf([]), worlds: { xiuxian: w265b }, meta: m265b }, 13);
    var w265c = mkWs({ realm: 1, zone: 0 });
    var m265c = mkMeta();
    SQ.Codex.scan({ profile: mkProf([]), worlds: { xiuxian: w265c }, meta: m265c }, 14);
    var neg265 = m265b.titles.indexOf('title_bangshou') < 0 && m265c.titles.indexOf('title_bangshou') < 0;
    /* 跨世不重发：metaNormalize 保 titles（跨世不清）→ 二世再登顶仍只一枚 */
    var mm265 = SQ.Legacy.metaNormalize(JSON.parse(JSON.stringify(m265)));
    w265.prodMarks.myRank = 1;
    SQ.Codex.scan({ profile: mkProf([]), worlds: { xiuxian: w265 }, meta: mm265 }, 15);
    var cross265 = mm265.titles.filter(function (x) { return x === 'title_bangshou'; }).length === 1;
    /* 容量：称号墙现行可获 = 词表 codex.title.* 键数（本批 +1），上限 80 */
    var titleKeys265 = 0, tk265;
    for (tk265 in SQ.LEX.xiuxian) if (tk265.indexOf('codex.title.') === 0) titleKeys265++;
    var cap265 = titleKeys265 === 61 && TS265 === 80 && titleKeys265 <= TS265;
    /* 折叠往返（级⑧ withFoldedTitle，**必须用 #206 那种超 SAVE_TRIGGER 的肥档才触发**——小档根本不折叠）：
     * 带新称号 + 模拟 shift 挤出最旧 2 条 → 落盘无 title 键、titleX 承载差集、
     * normalize 还原 = titleX ++ titles **溢出在前**、还原后 title_bangshou 仍在墙 */
    var ref265f = JSON.parse(JSON.stringify(ref206));
    ref265f.meta.titles.push('title_bangshou');
    ref265f.meta.codices.title.push('title_bangshou');
    var full265 = ref265f.meta.codices.title.slice();
    var ov265 = ['title_overflow_a', 'title_overflow_b'];
    ref265f.meta.codices.title = ov265.concat(full265);
    ref265f.meta.titles = full265.slice(-TS265);
    await SQ.save(ref265f);
    var disk265 = JSON.parse(localStorage.getItem(SQ.KEY) || '{}');
    var cod265 = (disk265.meta || {}).codices || {};
    var foldHit265 = cod265.title == null && typeof cod265.titleX === 'string' &&
      ov265.every(function (x) { return cod265.titleX.indexOf(x) >= 0; });
    var back265 = SQ.normalize(disk265);
    var arr265 = ((back265.meta || {}).codices || {}).title;
    var foldRt265 = Array.isArray(arr265) && arr265.join() === ov265.concat(full265).join() &&
      arr265.indexOf('title_bangshou') >= 0 && ((back265.meta || {}).codices || {}).titleX == null;
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('265', '榜位称号发放口（N5 · 榜首真发 + 幂等 + 跨世不重发 + 容量 + 折叠往返）：(a) 真路径 `Codex.scan` 下 `ws.prodMarks.myRank === 1` ⇒ `meta.titles` 落 `title_bangshou`、**同时进图鉴面 `codices.title`**（同一 scan 内 mergeFace 立即入墙）、词表正文可解析零 `{}`；(b) 连扫 5 次仍 **1 枚**、titles 计数与遗泽 **#197** 零变动；(c) 反例两路零发（myRank=2 / 金丹前 prodMarks 缺省）；(d) `metaNormalize` 后二世再登顶仍 1 枚（`meta.titles` 跨世不清 = 幂等第二重）；(e) 称号墙现行可获 60 → **61**、上限 80（`addTitle` while(>80) shift 一字未动）；(f) 级⑧ 折叠往返无损：落盘无 `codices.title` 键、`titleX` 承载溢出差集、还原 = `titleX ++ titles` 溢出在前恰为原插入序、新称号还原后仍在墙、`titleX` 不残留',
      got265 && idem265 && neg265 && cross265 && cap265 && foldHit265 && foldRt265,
      '入墙=' + (got265 ? 'title_bangshou' : '×') + ' 正文=' + nm265 + ' 连扫枚数=' + dupN265 +
      ' 遗泽变动=' + (m265.karma - k265) + ' 反例=' + neg265 + ' 跨世=' + cross265 +
      ' ‖ 可获=' + titleKeys265 + '/上限=' + TS265 + ' ‖ 折叠=' + foldHit265 + '(' + cod265.titleX + ')' +
      ' 往返=' + foldRt265 + ' 墙内有=' + (Array.isArray(arr265) ? arr265.indexOf('title_bangshou') >= 0 : '×'));

    /* ═══ #270 天骄好感读档不丢（2026-10-08 · 携才投效批顺带抓获的新死链 N19）═══
     * `pack.normalize` 的 bonds 白名单只认 `D.COMPANIONS`，而天骄好感按天骄卷 §6.1 与同道友
     * **同池**存 `ws.bonds.pr{n}` ⇒ 每次读档把天骄好感整键剪掉（实测 40 → 键消失）。
     * 后果：达档三事件 / 一笑泯恩仇 / 携才投效全成「同一会话不刷新才碰得到」的一次性内容。
     * 修法 = 白名单追加**在册天骄**（精确 id，不用前缀通配）。本断言钉四点：
     * 在册天骄保、越界仍 clamp、不在册同前缀键仍剪、道友路径零回归。 */
    var pack270 = SQ.Worlds.xiuxian.pack, D270 = SQ.XDATA;
    var w270 = pack270.normalize({});
    SQ.Prodigy.rollForNewLife(w270, pack270, D270, mkMeta(), 1700000000000);
    var pA270 = w270.prodigies[0].id, pB270 = w270.prodigies[1].id, pC270 = w270.prodigies[2].id;
    var raw270 = JSON.parse(JSON.stringify(w270));
    raw270.bonds[pA270] = 40;                       /* 在册天骄 · 达 JOIN_BOND 档 */
    raw270.bonds[pB270] = 150;                      /* 越界值：放宽白名单不该顺带放宽值域 */
    raw270.bonds[pC270] = -99;                      /* 绝交锁哨兵 */
    raw270.bonds.pr99 = 77;                         /* 同前缀但不在册（出榜/脏档）：仍须剪 */
    raw270.bonds.hanli = 33;                        /* 道友路径零回归 */
    var out270 = pack270.normalize(raw270);
    ok('270', '天骄好感读档不丢（N19 · bonds 白名单追加在册天骄）：(a) `ws.bonds.pr{n}` 经 `pack.normalize` 往返保值 40；(b) 同一天骄仍在达档线 `JOIN_BOND` 之上 ⇒ 携才投效 / 达档三事件读档后照旧可触发；(c) 越界 150 仍 clamp 到 `BOND_MAX`、哨兵 −99 原样保、**不在册的 `pr99` 照剪**（放宽的是名录不是前缀）；(d) 道友 `hanli` 零回归',
      out270.bonds[pA270] === 40 && out270.bonds[pA270] >= D270.PRODIGY.JOIN_BOND &&
      out270.bonds[pB270] === (D270.BOND_MAX || 100) && out270.bonds[pC270] === -99 &&
      out270.bonds.pr99 === undefined && out270.bonds.hanli === 33,
      '在册=' + out270.bonds[pA270] + ' clamp=' + out270.bonds[pB270] + ' 哨兵=' + out270.bonds[pC270] +
      ' 不在册=' + (out270.bonds.pr99 === undefined ? '剪' : out270.bonds.pr99) + ' 道友=' + out270.bonds.hanli);

    /* ═══ #271 携才投效生产者调用点（2026-10-08 · 天骄卷 §6.2 + 自立门户卷 §7.1 · N6 收口批）═══
     * 取证走**生产真路径 `Prodigy.tick`**（不是直调 tryJoin）：月掷命中 ⇒ 弟子入库 + 入门日志，
     * 另钉常量归属（五枚在 `PRODIGY` 块、`SECT` 块零同名——本批第一次实跑就错读了 SECT 块、
     * 全靠代码兜底值才没崩，属「双口径」缺陷形态）与两个曾经的死函数出口（acceptProdigy / joinOpen）。 */
    var w271 = pack270.normalize({});
    w271.realm = 5; w271.mode = 'seclude';
    SQ.Prodigy.rollForNewLife(w271, pack270, D270, mkMeta(), 1700000000000);
    w271.prodigies.forEach(function (p, i) { w271.bonds[p.id] = i === 0 ? 50 : 0; });
    w271.sect = { name: '测试宗门', nameIdx: [1, 1], gate: 'panlong', align: 'right', disciples: [],
      fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 1 }, dispatchAt: 1, lastTribMonth: 1, monthClock: 0,
      warRecord: { wins: 0, loses: 0 }, suppressed: {}, recruitAt: 1, foundAt: 1, declareAt: 1,
      candidate: null, warAgg: null, seq: 0, succession: null };
    var lg271 = [];
    var or271 = Math.random; Math.random = function () { return 0; };
    SQ.Prodigy.tick(w271, pack270, D270, M(mkProf([]), w271), 30000, 1700000000000,
      { log: function (cat, text) { lg271.push(cat + '|' + text); } });
    Math.random = or271;
    var dsc271 = w271.sect.disciples[0] || null;
    ok('271', '携才投效生产者有调用点（N6 · 走 `Prodigy.tick` 真路径）：(a) 月掷命中 ⇒ 弟子入库且 `tianjiao` 与来源位 `pr` 同记、`tier` 良才起底、起境 0（不取真境界防榜面双记）、不占供奉名额；(b) 入门日志由 `sect.disc.join` 出正文（键真消费）；(c) 五枚 `JOIN_*` 归 `PRODIGY` 块且 `SECT` 块零同名（归属对表，防再错读）；(d) `Sect.acceptProdigy` / `Sect.joinOpen` 均已导出（两者曾是零调用死函数）',
      !!dsc271 && w271.sect.disciples.length === 1 && dsc271.tianjiao === true && dsc271.pr === w271.prodigies[0].id &&
      dsc271.tier === 'fine' && dsc271.realm === 0 && !dsc271.offering &&
      lg271.some(function (x) { return x.indexOf('登门求入门') >= 0 && x.indexOf('sect.disc.join') < 0; }) &&
      ['JOIN_P', 'JOIN_BOND', 'JOIN_DC', 'JOIN_FEUD_P', 'JOIN_REFUSE_BOND'].every(function (k) {
        return typeof D270.PRODIGY[k] === 'number' && D270.SECT[k] === undefined;
      }) && typeof SQ.Sect.acceptProdigy === 'function' && typeof SQ.Sect.joinOpen === 'function',
      '弟子=' + (dsc271 ? dsc271.pr + '/' + dsc271.tier + '/rlm' + dsc271.realm : '×') +
      ' 日志=' + lg271.filter(function (x) { return x.indexOf('登门求入门') >= 0; }).length +
      ' JOIN_P=' + D270.PRODIGY.JOIN_P + '/SECT 同名=' + (D270.SECT.JOIN_P === undefined ? 0 : 1));

    /* ═══ #272 开宗失败九因全有键（2026-10-08 · N16 姊妹面 · 任务清单原记「sect.ui.fail.* 整族缺键」）═══
     * view:6790 按 `'sect.ui.fail.' + reason` 拼键、缺键时回落 `rFd.reason` ⇒ **裸英文上屏**
     *（与 N16 炼丹失败族同形）。本断言用一组坏档**跑出** reason 全集（不是抄表），逐条验词表有键。 */
    var w272base = function () {
      var x = pack270.normalize({});
      x.realm = 5; x.factionId = D270.FACTIONS_FIXED[0].id; x.factionRep[x.factionId] = 2000;
      x.factionOffice = 'elder'; x.factionRepPeak = 2000; x.everDefected = true;
      return x;
    };
    var m272ok = mkMeta(); m272ok.unlocks.sect = true;
    var r272 = {};
    var bad272 = [
      ['realm', function (x) { x.realm = 2; }, m272ok],
      ['identity', function (x) { x.factionOffice = null; x.factionId = null; x.everDefected = false; }, m272ok],
      ['peak', function (x) { x.factionRepPeak = 10; }, m272ok],
      ['unlock', function (x) { }, mkMeta()],
      ['has', function (x) { x.sect = { name: '已立', nameIdx: [0, 0], gate: 'wuyue', align: 'right', disciples: [],
        fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, succession: null }; }, m272ok],
      ['done', function (x) { x.sect = { name: '已立', nameIdx: [0, 0], gate: 'wuyue', align: 'right', disciples: [],
        fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, succession: { at: 1 } }; }, m272ok],
      ['gate', function (x) { }, m272ok, 'baidi'],
      ['align', function (x) { }, m272ok, 'wuyue', 'chaos']
    ];
    bad272.forEach(function (c) {
      var x = w272base(); c[1](x);
      var r = SQ.Sect.foundSect(x, pack270, D270, c[2], c[3] || 'wuyue', c[5] || null, null, c[4] || 'right',
        1700000000000, function () {});
      r272[c[0]] = r && r.ok === false ? r.reason : ('OK?' + (r && r.reason));
    });
    /* `name` 因由忌讳库拦下（`Tiandao.filterText`），造不出稳定命中 ⇒ 不跑引擎只补验键在 */
    var miss272 = Object.keys(r272).filter(function (k) {
      return r272[k] !== k || SQ.t('sect.ui.fail.' + k, null, 'xiuxian') === 'sect.ui.fail.' + k;
    });
    if (SQ.t('sect.ui.fail.name', null, 'xiuxian') === 'sect.ui.fail.name') miss272.push('name');
    ok('272', '开宗失败九因全有词表键（裸英文上屏面闭合）：跑出 `canFound` 六因（realm/identity/peak/unlock/has/done）+ `foundSect` 参数二因（gate/align），逐条验 ① 引擎确实返回该 reason（坏档真被拦）② `sect.ui.fail.<reason>` 有键且正文可解析（view:6790 拼键不再回落成裸英文）；第九因 `name` 走忌讳库、无稳定命中可造 ⇒ 只补验键在。**边界**：本断言枚举的是「当前引擎会返回的 reason」，新增 reason 须同步补键（缺键族另有 A6 反向扫描兜底）',
      miss272.length === 0 && Object.keys(r272).length === 8 &&
      SQ.t('sect.ui.fail.name', null, 'xiuxian').length >= 4,
      '跑出=' + Object.keys(r272).map(function (k) { return k + '→' + r272[k]; }).join(' ') + ' 缺键=' + (miss272.join(',') || '无'));

    /* ═══ #273 营建与遗泽购买失败态零裸英文（N16 / N13 姊妹面收口 · 任务清单原 #9 项）═══
     * `buildFac` 的 none / unknown 两因原被 view 直接 `toast(rBd.reason)` 上屏；
     * 购买支的 'unknown' 原是**静默无提示**（点了没反应）。本断言跑出真 reason 再对表词表。 */
    var x273 = w272base();
    x273.sect = { name: '测试宗门', nameIdx: [0, 0], gate: 'wuyue', align: 'right', disciples: [],
      fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, succession: null, seq: 0, warRecord: { wins: 0, loses: 0 },
      suppressed: {}, dispatchAt: 1, lastTribMonth: 1, monthClock: 0, recruitAt: 1, foundAt: 1, declareAt: 1,
      candidate: null, warAgg: null };
    var rN273 = SQ.Sect.buildFac(x273, pack270, D270, 'nosuchfac', 1700000000000, function () {});
    x273.sect.succession = { at: 1 };
    var rS273 = SQ.Sect.buildFac(x273, pack270, D270, 'zangjing', 1700000000000, function () {});
    var kOk273 = function (k) { var v = SQ.t(k, null, 'xiuxian'); return v && v !== k && !/[A-Za-z]{3,}/.test(v); };
    var miss273 = [];
    [['unknown', rN273], ['none', rS273]].forEach(function (c) {
      if (!c[1] || c[1].ok || c[1].reason !== c[0]) miss273.push('跑出应为 ' + c[0] + ' 实为 ' + (c[1] && c[1].reason));
      else if (!kOk273('sect.ui.build.' + c[1].reason)) miss273.push('sect.ui.build.' + c[0]);
    });
    ['sect.ui.build.other', 'legacy.ui.feisheng.lock.info', 'legacy.ui.fail.other', 'legacy.ui.buy.fail']
      .forEach(function (k) { if (!kOk273(k)) miss273.push(k); });
    ok('273', '营建与遗泽购买失败态零裸英文（N16/N13 姊妹面）：(a) 跑出 `buildFac` 两因——非法 fid ⇒ `unknown`、已传位 ⇒ `none`（引擎确实这么返回，不是抄表）；(b) 两因各有 `sect.ui.build.<reason>` 中文键；(c) `sect.ui.build.other`（新 reason 兜底，view 不再回落内部字段名）、`legacy.ui.feisheng.lock.info`（预览取不到）、`legacy.ui.fail.other`（legacyReasonText 兜底）、`legacy.ui.buy.fail`（购买支原静默无提示 ⇒ 现必有反馈）四键在位且正文无 ≥3 连拉丁',
      miss273.length === 0, '跑因=' + rN273.reason + '/' + rS273.reason + ' 缺=' + (miss273.join(',') || '无'));

    /* ═══ #274 融合与淬炼失败态零裸英文（A6 判据修好后照出的同形缺陷 · 裁定收口批）═══
     * A6 补大写字符类后重测：`fuse.ui.fail.*` 整族缺 `full` / `unknown` 两因（`fusion.js:138/145` 实返回），
     * 而「自创并存已满 4 门」是玩家必然撞上的状态 ⇒ 屏上只有裸英文 `full`；淬炼支的 `unknown`
     * 更是**静默无提示**（点了没反应）。本断言跑出真 reason 再对表新补的键。 */
    var x274 = pack270.normalize({});
    x274.realm = 3;
    var ffs274 = D270.FUSE || {};
    var fns274 = [];
    for (var ci274 = 0; ci274 < (ffs274.CUSTOM_MAX || 4); ci274++) fns274.push('cu_fake_' + ci274);
    x274.fusion = { lastFuseAt: 0, lastReforgeAt: 0, meditate: 999, seq: 9, customs: fns274.map(function (id, i) {
      return { id: id, name: '甲' + i, gen: 1, tier: 0, attr: 'jian', sig: '', lv: 1, st: {}, created: 1 };
    }) };
    var lats274 = [];
    for (var la274 in (pack270.artsMap ? pack270.artsMap() : {})) { lats274.push(la274); if (lats274.length >= 2) break; }
    /* 等级起点批顺带接通的一条**潜在真缺陷**：`canFuse` 的满级门槛原写
     * `(ws.artsLevels || {})[idA] < 9`——档里无值时是 `undefined < 9` = false ⇒ 门槛被整体跳过，
     * 未修满的功法本来能进融合坛。入门即 Lv1 后每部都有值，这道关第一次真的生效，
     * 于是本 fixture 必须先把两位父本摆到 Lv9，才测得到它声称的那一因 `full`（不是放宽判据）。 */
    lats274.forEach(function (id) { x274.artsLevels[id] = 9; });
    var rFull274 = SQ.Fusion.canFuse(x274, pack270, D270, lats274[0], lats274[1], 1700000000000);
    var rUnk274 = SQ.Fusion.reforgeCustom(x274, pack270, D270, 'cu_not_exist', 1700000000000, function () {});
    var k274 = function (k) { var v = SQ.t(k, null, 'xiuxian');
      return !!v && v !== k && !/[A-Za-z]{3,}/.test(String(v).replace(/\{[^}]*\}/g, '')); };
    ok('274', '融合与淬炼失败态零裸英文（A6 判据修正后照出的同形缺陷）：(a) 自创并存满 4 门 ⇒ `canFuse` 真返回 `full`、`fuse.ui.fail.full` 有中文键；(b) 淬炼不存在的自创部 ⇒ `reforgeCustom` 真返回 `unknown`、`fuse.reforge.unknown` 有键（视图原为静默无提示）；(c) `fuse.ui.fail.other` 兜底在位 ⇒ 未来新增 reason 不再把字段名打上屏；(d) 既有 `fuse.ui.fail.{locked,lv,gen,wudao,ids}` 五键零回归',
      rFull274.reason === 'full' && k274('fuse.ui.fail.full') && rUnk274.reason === 'unknown' &&
      k274('fuse.reforge.unknown') && k274('fuse.ui.fail.other') &&
      ['locked', 'lv', 'gen', 'wudao', 'ids'].every(function (r) { return k274('fuse.ui.fail.' + r); }),
      '满档=' + rFull274.reason + ' 落空=' + rUnk274.reason);

    /* ═══ #275 宗门材料供奉环（N1 第二环 · 2026-10-08 用户裁定归属 = 炼丹卷 §2.6 立量表）═══
     * 原缺陷形态：设施可建、`sect.tribute` / `sect.tributefac` 两路来源 key 全库零命中、
     * `in.materials` 只有三源 ⇒ 丹房是一条「文案在册、产出无口」的死链。
     * 本断言走**真入口 `Sect.tick`**（不直调 addMats）逐条验速率制五面。 */
    var w275 = mkSectWs220();
    SQ.Sect.foundSect(w275, pack, D, m220, 'panlong', null, null, 'neutral', 1700000000000, noopLog());
    w275.sect.fac = { zangjing: 0, danfang: 2, yanwu: 0, keshe: 0 };
    w275.sect.disciples = [{ id: 'm1', nm: [1, 1], tier: 'mid', realm: 1, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false },
      { id: 'm2', nm: [1, 2], tier: 'mid', realm: 1, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false },
      { id: 'm3', nm: [1, 3], tier: 'fine', realm: 1, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false }];
    w275.zone = 0;
    var TB275 = D.ALCHEMY.TRIBUTE;
    var rate275 = 3 / TB275.DISC_MONTHS[1] + 2 / TB275.FAC_MONTHS;     /* 常见态：3 弟子档 1 + 丹房 2 */
    var sumMat275 = function (w) { var s = 0, k275; for (k275 in w.materials) s += w.materials[k275] || 0; return s; };
    var in0 = SQ.Ledger.matSums(w275).inn, sto0 = sumMat275(w275), lg275 = [];
    var rolled275 = false, or275 = Math.random;
    Math.random = function () { rolled275 = true; return 0.5; };
    SQ.Sect.tick(w275, pack, D, null, 30000 * 12, 1700000000000, { log: function (c, x) { lg275.push(x); } });
    Math.random = or275;
    var in1 = SQ.Ledger.matSums(w275).inn, sto1 = sumMat275(w275);
    var pay275 = Math.floor(rate275 * 12);
    /* 余数结转：12 月期望 5.30 → 缴 5 件、acc 留 ~0.30；再 12 月 = 0.30+5.30 → 缴 5 件（不重复计头） */
    var acc1 = w275.sect.matAcc;
    SQ.Sect.tick(w275, pack, D, null, 30000 * 12, 1700000006000, { log: noopLog() });
    var pay2 = SQ.Ledger.matSums(w275).inn - in1;
    var acc2 = w275.sect.matAcc;
    /* #207 材料恒等式复测：Σin − Σout === Σ存量（供奉走 addMats 唯一写口才不破） */
    var sums275 = SQ.Ledger.matSums(w275);
    var iden275 = (sums275.inn - sums275.out) === sumMat275(w275);
    /* 料种恒取本区组池（跨区不串料） */
    var pool275 = SQ.Alchemy.zoneMats(D, w275.zone), onlyPool = true, kpp;
    for (kpp in w275.materials) if ((w275.materials[kpp] || 0) > 0 && pool275.indexOf(kpp) < 0) onlyPool = false;
    ok('275', '宗门材料供奉环真产料（N1 第二环 · 走 `Sect.tick` 真入口）：(a) 12 游戏月按 §2.6 速率 `3/8 + 2/30` 期望 5.30 件 ⇒ 实缴 5 件、`in.materials` +5 且背包存量 +5（**入账走 `Alchemy.addMats` 唯一写口**，不另开账）；(b) 余数结转留档 ⇒ 再 12 月不重复计头（0.30+5.30 → 缴 5 余 0.60）；(c) **#207 材料恒等式** `Σin − Σout === Σ存量` 续绿；(d) **零掷判**复证（`Sect.tick` 全程不碰 `Math.random`，#221 红线与 sim-pacing 稳态带不被宗门侧污染）；(e) `sect.tribute.mats` 一行入日志、正文可解析；(f) 料种恒取**本区组**池（`zoneMats`），跨区不串料；(g) 灵石账九路 `in` 分类数不变（材料是非灵石资源，永不入灵石账）',
      !rolled275 && pay275 === 5 && in1 - in0 === 5 && sto1 - sto0 === 5 &&
      acc1 > 0.25 && acc1 < 0.35 && acc2 > 0.55 && acc2 < 0.65 && pay2 === 5 &&
      iden275 && lg275.some(function (x) { return x.indexOf('进缴灵材 5') >= 0; }) && onlyPool &&
      Object.keys(w275.ledger.in).length === 5,
      '期望=' + rate275.toFixed(4) + '/月 12月应=' + pay275 + ' 实=' + (in1 - in0) +
      ' 存量增=' + (sto1 - sto0) + ' 余1=' + acc1.toFixed(4) +
      ' 二次缴=' + pay2 + ' 余2=' + acc2.toFixed(4) + ' 恒等=' + iden275 + ' 掷判=' + rolled275 +
      ' 本池=' + onlyPool + ' in路数=' + Object.keys(w275.ledger.in).length);

    /* ═══ #276 传记开宗附加句（图鉴卷 §传记特征键表「开宗」项 · 2026-10-08 裁定收口批）═══
     * 抽取链此前无 `ws.sect` 分支 ⇒ 玩家花整局立的门户在「人生传记」里一个字都不出现；
     * 落地时刻意**不做成 xing 第 6 型**（卷面五型是已登记口径），改附加句，与五型可并存。 */
    var w276 = mkSectWs220();
    SQ.Sect.foundSect(w276, pack, D, m220, 'panlong', '云壑宗', null, 'right', 1700000000000, noopLog());
    w276.sect.disciples = [{ id: 'b1', nm: [2, 3], tier: 'mid', realm: 2, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false },
      { id: 'b2', nm: [4, 5], tier: 'fine', realm: 1, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
    var m276 = mkMeta();
    var prof276 = mkProf([]);
    var bio276 = SQ.Codex.generateBio(w276, m276, pack, D, prof276, 'bingjie', 1700000000000);
    var w276b = mkSectWs220();                       /* 反例：未立派 ⇒ 附加句不得出现、也不得留占位残留 */
    var bio276b = SQ.Codex.generateBio(w276b, mkMeta(), pack, D, prof276, 'bingjie', 1700000000000);
    var t276 = (bio276 && bio276.text) || '', t276b = (bio276b && bio276b.text) || '';
    var noSect276 = mkSectWs220(); noSect276.sect = null;
    var t276c = (SQ.Codex.generateBio(noSect276, mkMeta(), pack, D, prof276, 'bingjie', 1700000000000) || {}).text || '';
    ok('276', '人生传记写得出「开宗」（图鉴卷特征键表最后一项落地）：(a) 立派且门下 2 人 ⇒ 传记含 `立「云壑宗」` 与 `门下 2 人`、无 key 回落无 `{` 残留；(b) 未收徒 / 未立派两型反例均**不出该句**（附加句按 `ws.sect.name` 条件拼，不显空串）；(c) xing 仍只 5 型（附加句不占型位 ⇒ 卷面计数不动）；(d) 全文仍受 BIO_MAX 硬截、不越 500 字',
      t276.length > 0 && t276.indexOf('立「云壑宗」') >= 0 && t276.indexOf('门下 2 人') >= 0 &&
      t276.indexOf('codex.bio.') < 0 && t276.indexOf('{') < 0 &&
      t276b.indexOf('立「') < 0 && t276c.indexOf('立「') < 0 &&
      t276.length <= (D.LEGACY.BIO_MAX || 500) && (function () {
        var nx = 0, kk; for (kk in SQ.LEX.xiuxian) if (kk.indexOf('codex.bio.xing.') === 0) nx++; return nx === 5;
      })(),
      '有派=' + t276.length + '字 含句=' + (t276.indexOf('立「云壑宗」') >= 0) +
      ' 反例=' + (t276b.indexOf('立「') < 0) + '/' + (t276c.indexOf('立「') < 0) + ' 长度上限=' + (D.LEGACY.BIO_MAX || 500));

    /* #296 一世洗髓（天赋池设计 v1.8 §十 · 洗髓批 2026-10-12）：四渠道赐缘 + 单口换骨 + 先判后扣 + 存档往返
     * 立因：创角锁定后天赋一世不改（旧 §一原则 5「已拍板」），本批开四条变更途径 ⇒ 「每世 3 次」预算与
     * 「先判预算再扣资源」是唯一的刷词条防线，而视图不自带判定（候选与替换全在 SQ.Talents）⇒ 判据一律走引擎真入口。
     * 全条零随机：词条一律取自池（不写字面量 id），候选那三枚用 stubRandom 钉住首三位 ⇒ 复跑同值。 */
    var SW296 = D.TALENT_SWAP, cap296 = SW296.PER_LIFE;
    var posPool296 = SQ.TALENTS.common.positive.concat(SQ.TALENTS.xiuxian.positive);
    var negPool296 = SQ.TALENTS.common.negative.concat(SQ.TALENTS.xiuxian.negative);
    var cp296 = function (t) { return JSON.parse(JSON.stringify(t)); };
    var held296 = [cp296(posPool296[0]), cp296(posPool296[1]), cp296(negPool296[0])];
    var prof296 = mkProf(held296); prof296.createdAt = 1000000;
    /* (a) 洗髓丹：真走 drinkPill —— 服下即赐缘且扣丹 */
    var w296 = mkWs({ realm: 7 });
    SQ.Alchemy.ensure(w296, D);
    w296.alchemy.pills = { ap_xisui: 4 };
    var dk296a = SQ.Alchemy.drinkPill(w296, pack, D, 'ap_xisui', 1000001, null, prof296);
    var pill296 = dk296a.ok === true && dk296a.swap === true &&
      w296.talentOwed === 1 && w296.alchemy.pills.ap_xisui === 3;
    /* (b) 预算已满 ⇒ 拒服且**不扣丹**（先判后扣；扣了丹零收益正是第十四批刚收的那一类静默缺陷） */
    w296.talentOwed = cap296;
    var dk296b = SQ.Alchemy.drinkPill(w296, pack, D, 'ap_xisui', 1000002, null, prof296);
    var capRefuse296 = dk296b.ok === false && dk296b.reason === 'swapfull' && w296.alchemy.pills.ap_xisui === 3;
    /* (c) 奇遇效果键 talentSwap：真走 applyEffects；预算已满时收益标签必须被撤销（applied 里不许留没落账的收益） */
    var w296c = mkWs({ realm: 6 });
    SQ.Events.applyEffects(w296c, pack, D, M(prof296, w296c), { talentSwap: 1 }, { applied: {} });
    var evGrant296 = w296c.talentOwed === 1;
    var ctx296 = { applied: { talentSwap: 1 } };
    w296c.talentOwed = cap296;
    SQ.Events.applyEffects(w296c, pack, D, M(prof296, w296c), { talentSwap: 1 }, ctx296);
    var evRevoke296 = ctx296.applied.talentSwap == null && w296c.talentOwed === cap296;
    /* (d) 破境赐缘：**只在 targetRealm === TRIB_FROM 那一次赐**。三档对照 = 起始境界取 TRIB_FROM−2 / −1 / 0
     *     （⇒ 目标境界 TRIB_FROM−1 / 命中档 / +1），故「每次突破都给」（后两档必红）、「永远不给」（命中档红）、
     *     与「档号写错」都跑不掉 */
    var tribPair296 = [SW296.TRIB_FROM - 2, SW296.TRIB_FROM - 1, SW296.TRIB_FROM].map(function (rl, i) {
      var w = mkWs({ realm: rl, qi: 1e9 });
      pack.recalcDerived(w, prof296);
      var rs = stubRandom([0]);
      var r = SQ.Realm.tryBreakthrough(w, pack, D, M(prof296, w), 1000003 + i, { log: noopLog(), profile: prof296 });
      rs();
      return { res: r.result, owed: w.talentOwed };
    });
    var trib296 = tribPair296.every(function (r) { return r.res === 'success'; }) &&
      tribPair296[0].owed === 0 && tribPair296[1].owed === 1 && tribPair296[2].owed === 0;
    /* (e) 遗泽商店：满预算拒购且**不扣泽**、不落幂等键；有余量则扣泽 + 赐缘 + spent = 实价（#197 恒等式口径） */
    var s296 = SQ.defaultState();
    s296.profile = prof296;
    s296.worlds.xiuxian = mkWs({ realm: 6, talentOwed: cap296 });
    s296.meta.karma = 1000;
    var buyFull296 = SQ.Legacy.buy(s296, 'swap', 1000005);
    var shopRefuse296 = buyFull296.ok === false && buyFull296.reason === 'swapfull' &&
      s296.meta.karma === 1000 && s296.meta.spent['shop.swap'] == null && s296.worlds.xiuxian.talentOwed === cap296;
    s296.worlds.xiuxian.talentOwed = 0;
    SQ.Legacy.buy(s296, 'swap', 1000006);
    var shopGrant296 = s296.worlds.xiuxian.talentOwed === 1 && s296.meta.karma === 1000 - D.LEGACY.SWAP_PRICE &&
      s296.meta.spent['shop.swap'] === D.LEGACY.SWAP_PRICE;
    /* (f) 三候选：互不相同、与已持有（含转世天赋槽）零交集、且每条都是池里那条的副本（改它不污染源池） */
    prof296.legacyTalents = [cp296((D.LEGACY.TALENTS || [])[0])];
    var rs296f = stubRandom([0.0001, 0.0001, 0.0001]);
    var cands296 = SQ.Talents.candidates('xiuxian', prof296, 3);
    rs296f();
    var heldIds296 = held296.map(function (t) { return t.id; }).concat([D.LEGACY.TALENTS[0].id]);
    var candIds296 = cands296.map(function (t) { return t.id; });
    var candOk296 = cands296.length === 3 && new Set(candIds296).size === 3 &&
      candIds296.every(function (id) { return heldIds296.indexOf(id) < 0; }) &&
      cands296.every(function (t) { return t.amplified === false && !!t.effects && t.id !== heldIds296[0]; });
    /* (g) 换骨：四拒（无缘 / 未知 id / 撞已持有 / 格号越界）一律不动档，一成则 effects 逐字等于池内定义 */
    var w296g = mkWs({ realm: 6 });
    var profG = mkProf(held296.map(cp296));
    var rNone296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, cands296[0].id);
    w296g.talentOwed = 1;
    var rBad296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, 'no_such_talent_zzz');
    var rDup296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, held296[1].id);
    var rSlot296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 99, cands296[0].id);
    var refuse296 = rNone296.reason === 'none' && rBad296.reason === 'unknown' &&
      rDup296.reason === 'dup' && rSlot296.reason === 'badslot' &&
      w296g.talentOwed === 1 && w296g.talentUsed === 0 &&
      profG.talents.every(function (t, i) { return t.id === held296[i].id; });
    var sumBefore296 = JSON.stringify(M(profG, w296g).sum);
    var rGo296 = SQ.Talents.applySwap('xiuxian', profG, w296g, D, 0, cands296[0].id);
    var sumAfter296 = JSON.stringify(M(profG, w296g).sum);
    var goOk296 = rGo296.ok === true && rGo296.from === held296[0].id && rGo296.to === cands296[0].id &&
      profG.talents[0].id === cands296[0].id &&
      JSON.stringify(profG.talents[0].effects) === JSON.stringify(cands296[0].effects) &&
      w296g.talentOwed === 0 && w296g.talentUsed === 1 &&
      sumBefore296 !== sumAfter296;                       /* 乘区真的跟着换骨走（不重算引擎公式，只判「变了」） */
    /* (h) 存档往返：两计数过 normalize 保留、脏值归非负整数；换后的 talent id 过整档 normalize 不丢 */
    var n296 = pack.normalize(Object.assign(pack.initialState(), { talentOwed: 2, talentUsed: 1 }));
    var nDirty296 = pack.normalize(Object.assign(pack.initialState(), { talentOwed: 'x', talentUsed: -5 }));
    var nFrac296 = pack.normalize(Object.assign(pack.initialState(), { talentOwed: 1.7, talentUsed: 2.9 }));
    var s296h = SQ.defaultState();
    s296h.profile = profG;
    s296h.worlds.xiuxian = w296g;
    var back296 = SQ.normalize(s296h);
    var normOk296 = n296.talentOwed === 2 && n296.talentUsed === 1 &&
      nDirty296.talentOwed === 0 && nDirty296.talentUsed === 0 &&
      nFrac296.talentOwed === 1 && nFrac296.talentUsed === 2 &&
      back296.profile.talents[0].id === cands296[0].id &&
      back296.worlds.xiuxian.talentUsed === 1 && back296.worlds.xiuxian.talentOwed === 0;
    /* (i) 池与文档同源：洗髓方在丹方表内且为地阶、洗髓丹在 APILLS 且既无 buff 也无 once（第三类通道） */
    var rcX296 = null; D.ALCHEMY.RECIPES.forEach(function (r) { if (r.id === 'rc_xisui') rcX296 = r; });
    var tbl296 = !!rcX296 && rcX296.tier === 'di' && rcX296.pill === 'ap_xisui' &&
      !!D.ALCHEMY.APILLS.ap_xisui && !D.ALCHEMY.APILLS.ap_xisui.buff && !D.ALCHEMY.APILLS.ap_xisui.once &&
      D.ALCHEMY.APILLS.ap_xisui.swap === true && cap296 === 3 &&
      SQ.Legacy.shopItems(D).some(function (it) { return it.id === 'swap' && it.price === D.LEGACY.SWAP_PRICE; });
    ok('296', '一世洗髓（天赋池设计 v1.8 §十 · 洗髓批）：(a) 洗髓丹真走 drinkPill 赐缘且扣丹 (b) 预算满 ⇒ 拒服**不扣丹**（先判后扣） (c) 奇遇 talentSwap 真走 applyEffects，满则撤销收益标签（applied 不留空账） (d) 破境赐缘三档对照（TRIB_FROM−1 不给 / 命中档给 / +1 不给 ⇒ 「每次突破都给」「永远不给」「档号写错」都红） (e) 遗泽商店满预算拒购**不扣泽**、有余量则扣泽 + 赐缘 + spent = 实价 (f) 三候选互不相同 ∩ 已持有（含转世槽）= ∅ 且 amplified 恒 false (g) 换骨四拒（none/unknown/dup/badslot）一律不动档、一成则 effects 逐字等于池内定义且乘区 sum 跟着变 (h) 两计数过 pack.normalize 保留、脏值/小数归非负整数，换后 id 过整档 normalize 不丢 (i) 丹方/丹药/商店三表同源（ap_xisui 既无 buff 也无 once = 第三类通道，PER_LIFE=3）',
      pill296 && capRefuse296 && evGrant296 && evRevoke296 && trib296 &&
      shopRefuse296 && shopGrant296 && candOk296 && refuse296 && goOk296 && normOk296 && tbl296,
      '丹=' + pill296 + ' 拒服不扣丹=' + capRefuse296 + '(余' + (w296.alchemy.pills.ap_xisui || 0) + ') 事件=' +
      evGrant296 + '/' + evRevoke296 + ' 破境三档=' + tribPair296.map(function (r) { return r.owed; }).join('/') +
      ' 商店=' + shopRefuse296 + '/' + shopGrant296 + ' 候选=' + candIds296.join(',') +
      ' 四拒=' + [rNone296.reason, rBad296.reason, rDup296.reason, rSlot296.reason].join('/') +
      ' 成=' + goOk296 + ' 档=' + normOk296 + ' 表=' + tbl296);

    /* #297 丹药两族合一（第十七批 · 用户令「坊市购买的丹药或者其他地方获得的丹药，统一都放在炼丹炼器页面内，什么时候使用由用户自行决定，也可以赠送给道友」）
     * 旧行为 = 坊市 / 特席 / 门中供给 / 残片兑丹**四口买下去当场生效**（直接 applyEffects，不入库存、绕过丹毒日限），
     * 玩家没有「何时用」的选择权；本批把成品丹（D.PILLS）并入丹匣键空间，四口一律入匣、服用走同一条 drinkPill。
     * （黑市 buy 体与坊市逐字同码、一并改向，但 `genShelf` 的黑市 kind 池只掷 gear/arts/treasure ⇒ 货架从不出现丹药。）
     * 判据取向：**不重算效果公式**（那由 events 侧既有断言守），只钉「流向 + 先判后扣 + 两族同规矩」这一族新形状。 */
    var P297 = D.PILLS[0];   /* juqi · 修为 +30% */
    var prof297 = mkProf([]); prof297.createdAt = 1000000;
    /* (a) 坊市买丹：入匣、**不当场生效**、灵石与账目照旧 */
    var w297 = mkWs({ realm: 3, stones: 100000, qi: 5000 });   /* qiPct 型成品丹按**当前修为**折算 ⇒ 起始修为必须非 0 */
    SQ.Alchemy.ensure(w297, D);
    w297.shop.items = [{ kind: 'pill', ref: P297.id, sold: false, price: P297.price }];
    var qiB297 = w297.qi, buffsB297 = (w297.buffs || []).length, stB297 = w297.stones;
    var b297a = SQ.Shop.buy(w297, pack, D, M(prof297, w297), 0, false, null);
    var inBox297 = b297a.ok === true && w297.alchemy.pills[P297.id] === 1 &&
      w297.qi === qiB297 && (w297.buffs || []).length === buffsB297 && w297.stones === stB297 - P297.price;
    /* (b) 匣满 ⇒ 整笔拒单且**灵石分文不动**（先判后扣；扣了钱丢一颗丹 = 静默零收益那一族） */
    w297.alchemy.pills[P297.id] = (D.ALCHEMY.PILL_STOCK_CAP || 99);
    w297.shop.items = [{ kind: 'pill', ref: P297.id, sold: false, price: P297.price }];
    var stFull297 = w297.stones;
    var b297b = SQ.Shop.buy(w297, pack, D, M(prof297, w297), 0, false, null);
    var fullRefuse297 = b297b.ok === false && b297b.reason === 'pillfull' && w297.stones === stFull297 &&
      w297.shop.items[0].sold === false && w297.alchemy.pills[P297.id] === (D.ALCHEMY.PILL_STOCK_CAP || 99);
    /* (c) 服用成品丹：效果落 + 占丹毒日限（与自产丹同池同规矩） */
    w297.alchemy.pills[P297.id] = 2;
    var qiC297 = w297.qi;
    var d297c = SQ.Alchemy.drinkPill(w297, pack, D, P297.id, 1006002, null, prof297);
    /* 🔧 N43：原带一支 `pillDay.n === 1` 判「服一颗计一次」，日限退役后改判**扣丹与增益同时成立** */
    var drinkTrade297 = d297c.ok === true && w297.qi > qiC297 && w297.alchemy.pills[P297.id] === 1;
    /* (d) 门中供给：拒单时灵石 / 声望 / 24h 锚三者纹丝不动；成功时入匣不当场生效 */
    var w297f = pack.normalize(Object.assign(pack.initialState(), { realm: 4, stones: 999999 }));
    var T297 = 1700000000000;   /* 现实量级：门中供给 24h 冷却以 `now − last` 计，last=0 时小时间戳必被误判 'cd' */
    var supId = ((D.FACTION_SUPPLY || [])[0] || {});
    var supPill = null; (D.PILLS || []).forEach(function (p) { if (p.id === supId.pill) supPill = p; });
    var ok297f = false, ok297g = false;
    if (supId.sku && supPill) {
      w297f.factionId = w297f.factions[0].id;                 /* 名册由 normalize 轮出（固定池 16 + 随机补足），不自己编 id */
      w297f.factionRep = {}; w297f.factionRep[w297f.factionId] = 9999;
      w297f.factionJoinedAt = 0;
      SQ.Alchemy.ensure(w297f, D);
      w297f.alchemy.pills[supPill.id] = (D.ALCHEMY.PILL_STOCK_CAP || 99);
      var stF297 = w297f.stones, repF297 = w297f.factionRep[w297f.factionId];
      var rF297 = SQ.Factions.buySupply(w297f, pack, D, M(prof297, w297f), supId.sku, T297, null);
      ok297f = rF297.ok === false && rF297.reason === 'pillfull' && w297f.stones === stF297 &&
        w297f.factionRep[w297f.factionId] === repF297 && ((w297f.factionSupply || {})[supId.sku] || 0) === 0 &&
        rF297.reason !== 'cd' && rF297.reason !== 'rank' && rF297.reason !== 'rep';   /* 场景本身要成立，不能靠拒因蒙对 */
      w297f.alchemy.pills[supPill.id] = 0;
      w297f.qi = 5000;
      var qiF297 = w297f.qi, bfF297 = (w297f.buffs || []).length;
      var rG297 = SQ.Factions.buySupply(w297f, pack, D, M(prof297, w297f), supId.sku, T297 + 1, null);
      ok297g = rG297.ok === true && w297f.alchemy.pills[supPill.id] === 1 &&
        w297f.qi === qiF297 && (w297f.buffs || []).length === bfF297;
    }
    var supply297 = ok297f && ok297g;
    /* (e) 残片兑丹：匣满拒兑且**片不扣**；成功时扣 20 片、丹入匣 */
    var w297s = mkWs({ realm: 1, zone: 1 });
    SQ.Alchemy.ensure(w297s, D); w297s.shards = [0, 20, 0, 0, 0, 0, 0, 0, 0, 0];
    /* 兑来的丹种是三支里随机一支 ⇒ 满档档必须**三支全满**、成功档必须**三支全清**，否则判据吃随机（采样族） */
    var CAP297 = D.ALCHEMY.PILL_STOCK_CAP || 99;
    w297s.alchemy.pills.juqi = CAP297; w297s.alchemy.pills.ningshen = CAP297; w297s.alchemy.pills.cuiti = CAP297;
    var rS297 = SQ.Combat.exchangeShard(w297s, pack, D, M(prof297, w297s), 1, null, 1000005, null);
    var shardFull297 = rS297.ok === false && rS297.reason === 'pillfull' && w297s.shards[1] === 20;
    w297s.alchemy.pills.juqi = 0; w297s.alchemy.pills.ningshen = 0; w297s.alchemy.pills.cuiti = 0;
    var rS297b = SQ.Combat.exchangeShard(w297s, pack, D, M(prof297, w297s), 1, null, 1000006, null);
    var gotKey297 = rS297b.ok === true && rS297b.reward.type === 'pill' && rS297b.reward.id;
    var shardOk297 = rS297b.ok === true && w297s.shards[1] === 0 && w297s.alchemy.pills[gotKey297] === 1;
    var shard297 = shardFull297 && shardOk297;
    /* (f) 赠丹两族：成品丹按 D.PILLS 自带 tier 计好感；成品破障丹拒因 nogift 且不扣丹 */
    var cs297 = SQ.Bonds.list(pack).filter(function (c) { return c.category !== 'spouse'; });
    var w297g = mkWs({ realm: 5, stones: 99999 });
    SQ.Alchemy.ensure(w297g, D);
    w297g.alchemy.pills.cuiti = 2; w297g.alchemy.pills.pozhang = 2;
    var gTier = null;
    (D.PILLS || []).forEach(function (p) { if (p.id === 'cuiti') gTier = p.tier; });
    var expGift = (D.BOND_GIFT_BY_TIER || {})[gTier];
    var rG297a = SQ.Bonds.giftPill(w297g, pack, D, cs297[0].id, 'cuiti', 1000007, null);
    var rG297b = SQ.Bonds.giftPill(w297g, pack, D, cs297[0].id, 'pozhang', 1000008, null);
    var gift297 = rG297a.ok === true && rG297a.gain === expGift && w297g.alchemy.pills.cuiti === 1 &&
      rG297b.ok === false && rG297b.reason === 'nogift' && w297g.alchemy.pills.pozhang === 2 &&
      SQ.t('bond.gift.fail.nogift', null, 'xiuxian') !== 'bond.gift.fail.nogift';
    /* (g) normalize 白名单：四个成品丹键保留、伪键滤除、旧档（只有自产丹）零受影响 */
    var n297 = SQ.Alchemy.normalize({ pills: { juqi: 3, ningshen: 2, cuiti: 1, pozhang: 9, ap_juqi: 4, bogus_pill: 7 } }, D);
    var n297b = SQ.Alchemy.normalize({ pills: { ap_juqi: 4 } }, D);
    var norm297 = n297.pills.juqi === 3 && n297.pills.ningshen === 2 && n297.pills.cuiti === 1 &&
      n297.pills.pozhang === 9 && n297.pills.ap_juqi === 4 && n297.pills.bogus_pill == null &&
      n297b.pills.ap_juqi === 4 && Object.keys(n297b.pills).length === 1;
    /* (h) 两族同池：自产 + 成品混着吃走同一个丹匣、同一套扣减（🔧 N43 起「同限」那半随日限退役）*/
    var w297h = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w297h, D);
    w297h.alchemy.pills = { ap_juqi: 3, juqi: 3 };
    var profH = mkProf([]); profH.createdAt = 1000000;
    var seqH = [SQ.Alchemy.drinkPill(w297h, pack, D, 'ap_juqi', 1000001, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'juqi', 1000002, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'ap_juqi', 1000003, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'juqi', 1000004, null, profH),
      SQ.Alchemy.drinkPill(w297h, pack, D, 'juqi', 1000005, null, profH)];
    var samePool297 = seqH.every(function (r) { return r.ok === true; }) &&
      /* 五颗全服成功 ⇒ 自产两枚与成品三枚各自从同一匣里扣掉（混吃不另立门户，也不互相让路）*/
      w297h.alchemy.pills.ap_juqi === 1 && w297h.alchemy.pills.juqi == null;
    /* (i) 🆕 当晚复核 M2 锚：特席是第四个购买口，拒单必须回传可消费的 reason
     * （上一版只给坊市 / 黑市接了返回值 ⇒ 匣满时点了没反应，屏上静默 = 本仓头号缺陷族）*/
    var w297m = mkWs({ realm: 9 });
    w297m.stones = 99999;
    SQ.Alchemy.ensure(w297m, D);
    w297m.shop.merchant = { until: Date.now() + 600000,
      items: [{ kind: 'pill', ref: P297.id, price: P297.price, sold: false }] };
    w297m.alchemy.pills[P297.id] = (D.ALCHEMY.PILL_STOCK_CAP || 99);
    var stM297 = w297m.stones;
    var bM297 = SQ.Shop.buyMerchant(w297m, pack, D, M(prof297, w297m), 0, null);
    var merchant297 = bM297.ok === false && bM297.reason === 'pillfull' &&
      w297m.stones === stM297 && w297m.shop.merchant.items[0].sold === false;
    /* (j) 🔧 N43 改口：原判「丹毒上限文案取表值、模板不留裸数字」随两枚键退役。这条支路在防的形状是
     * 「引擎改了数、屏上还写旧数」——键没了不等于形状没了 ⇒ 改判**退役要退干净**：两枚键必须已从词表消失
     * （留键 = 下一批随手接回屏上就说谎，与 A6 孤儿同一族），且表上那个键也不再存在。*/
    var capGone297 = ['alchemy.ui.pillcap', 'alchemy.log.pillcap'].every(function (k2) {
      return (SQ.LEX.xiuxian || {})[k2] === undefined && SQ.t(k2, null, 'xiuxian') === k2;
    }) && D.ALCHEMY.PILL_DAILY_CAP === undefined;
    ok('297', '丹药两族合一（第十七批 · 坊市 / 特席 / 门中供给 / 残片兑丹四口所得一律入丹匣（黑市 buy 体与坊市同码但货架从不掷丹），何时服用玩家定）：(a) 坊市买丹入匣且**不当场生效**（qi / buffs 纹丝不动、灵石与 out.shop 照旧） (b) 匣满 ⇒ 整笔拒单、**灵石分文不动**、货架项不标 sold（先判后扣） (c) 服用成品丹：效果照落 + **占丹毒日限**（与自产同池） (d) 门中供给拒单时灵石 / 声望 / 24h 锚三者不动，成功时入匣不生效 (e) 残片兑丹匣满拒兑且**片不扣**，成功时扣 20 片入匣 (f) 赠丹两族同轨：成品丹按 D.PILLS 自带 tier 计好感、成品破障丹拒因 `nogift` 且不扣丹（issue #4 起赠丹无日限） (g) normalize 白名单认四个成品丹键、伪键滤除、旧档（只有自产丹）零受影响 (h) 两族混吃计同一计数（第 5 颗即拒） (i) 🆕 当晚复核补：特席买丹匣满拒单**回传 reason**、灵石分文不动（视图若不接返回值就是静默无反馈；屏上面由 probe-bondact 两条 + 走查 B4 锚） (j) 🆕 丹毒上限文案取表值不写死数（模板零裸数字，改 `PILL_DAILY_CAP` 屏上跟着动）',
      inBox297 && fullRefuse297 && drinkTrade297 && supply297 && shard297 && gift297 && norm297 &&
      samePool297 && merchant297 && capGone297,
      '入匣=' + inBox297 + ' 拒单不扣钱=' + fullRefuse297 + ' 服用=' + drinkTrade297 +
      ' 门中=' + supply297 + ' 残片=' + shard297 + ' 赠=' + gift297 + '(玄=' + expGift + ') 档=' + norm297 +
      ' 同池=' + samePool297 + ' 特席拒因=' + merchant297 + ' 退役退干净=' + capGone297);

    /* #298 坊市与特席的先判后扣（第廿六批 2026-10-13 · 用户报「买了春风化雨篇，法与器里却没解锁」，
     *   排查出的整族缺陷——掷货时按「未持有」过滤候选，但货架要挂满 4 小时才补货，这期间玩家可能
     *   经自悟 / 奇遇 / 残片兑换 / 图纸打造先拿到同一件；旧写法购买时不复查 ⇒ 照扣钱、零收益、零日志）：
     *   (a) 功法已拥有 → 拒 owned：灵石分文不动、货架项不标 sold
     *   (b) 未达标且待修习架已满 24 → 拒 shelffull（旧行为 = 扣 2,300 折回 1,150、功法凭空消失）
     *   (c) 丹方 / 普通图纸 / 丹炉图(已有炉) / 丹炉成品 / 法宝 已拥有 → 各拒 owned；材料包永远放行
     *   (d) 未达标但架未满 → 仍落待修习架（#101 旧口径不回归），灵石照扣
     *   (e) 弹窗与成交同源：expect 指纹与序号上的货对不上 → 拒 stale（实测过：弹窗写功法、扣的是另一件）
     *   (f) 成交路径真的写日志（旧：Actions.buy 给 Shop.buy 传 null ⇒ 入门/上架/折算全程无痕）
     *   (g) 特席 buyMerchant 走同一判定（已拥有 → owned、灵石不动）
     *   (h) 库藏阁手动炼化：指纹对不上 → 拒 stale，**两件都还在、灵石分文不动**（旧写法会在序号位移后炼掉玩家没点的那件） */
    var shopArtIds = Object.keys(SQ.XARTS).filter(function (id) {
      return (SQ.XARTS[id].obtain || {}).type === 'shop' && id !== 'chunyu';
    });
    function shelf298(w, items) {
      w.shop = { items: items, blackItems: [], nextRestock: Date.now() + 864000000, refreshStep: 0, discount: 0 };
      return w;
    }
    var artItem298 = function () { return { kind: 'arts', ref: 'chunyu', sold: false, price: 2300 }; };
    var prof298 = mkProf();
    var w298a = shelf298(mkWs({ realm: 5, stones: 100000, artsKnown: ['tuna', 'chunyu'], artsSlots: ['tuna'] }), [artItem298()]);
    var r298a = SQ.Shop.buy(w298a, pack, D, M(prof298, w298a), 0, false, noopLog());
    var own298 = r298a.ok === false && r298a.reason === 'owned' &&
      w298a.stones === 100000 && w298a.shop.items[0].sold === false;

    var w298b = shelf298(mkWs({ realm: 1, stones: 100000, artsKnown: ['tuna'], artsSlots: ['tuna'], shelf: [] }), [artItem298()]);
    var mB = M(prof298, w298b);            /* 先重算（recalcDerived 会把可达标的架上功法转正），再摆满架 */
    w298b.shelf = shopArtIds.slice(0, D.SHELF_CAP);
    var r298b = SQ.Shop.buy(w298b, pack, D, mB, 0, false, noopLog());
    var full298 = w298b.shelf.length === D.SHELF_CAP && r298b.ok === false && r298b.reason === 'shelffull' &&
      w298b.stones === 100000 && w298b.artsKnown.indexOf('chunyu') < 0 && w298b.shelf.indexOf('chunyu') < 0;

    var rec298 = D.ALCHEMY.RECIPES[0], bp298 = null, bpF298 = null;
    D.ALCHEMY.BLUEPRINTS.forEach(function (b) { if (!b.furnace && !bp298) bp298 = b; if (b.furnace) bpF298 = b; });
    function packBuy298(good, price, w) {
      shelf298(w, [{ kind: 'pack', pack: good, sold: false, price: price }]);
      return SQ.Shop.buy(w, pack, D, M(prof298, w), 0, false, noopLog());
    }
    var w298c = mkWs({ realm: 6, stones: 100000 });
    SQ.Alchemy.ensure(w298c, D);
    w298c.alchemy.recipes.push(rec298.id);
    var gRec = packBuy298({ type: 'recipe', ref: rec298.id, price: 400 }, 400, w298c);
    var w298bp = mkWs({ realm: 6, stones: 100000 }); SQ.Alchemy.ensure(w298bp, D); w298bp.alchemy.blueprints.push(bp298.id);
    var gBp = packBuy298({ type: 'bp', ref: bp298.id, price: 600 }, 600, w298bp);
    var w298bf = mkWs({ realm: 6, stones: 100000 }); SQ.Alchemy.ensure(w298bf, D); w298bf.alchemy.furnace = true;
    var gBpF = packBuy298({ type: 'bp', ref: bpF298.id, price: 800 }, 800, w298bf);
    var gFur = packBuy298({ type: 'furnace', price: 2000 }, 2000, w298bf);
    var tid298 = Object.keys(pack.treasures.byId)[0];
    var w298t = mkWs({ realm: 6, stones: 100000 }); SQ.Treasures.gain(w298t, pack, D, tid298, noopLog());
    shelf298(w298t, [{ kind: 'treasure', ref: tid298, sold: false, price: 6000 }]);
    var r298t = SQ.Shop.buy(w298t, pack, D, M(prof298, w298t), 0, false, noopLog());
    var w298m = mkWs({ realm: 6, stones: 100000, materials: {} });
    var gMat = packBuy298({ type: 'mat', ref: 'mat_linglu', price: 300 }, 300, w298m);
    var dup298 = gRec.ok === false && gRec.reason === 'owned' && w298c.stones === 100000 &&
      gBp.ok === false && gBp.reason === 'owned' && w298bp.stones === 100000 &&
      gBpF.ok === false && gBpF.reason === 'owned' && gFur.ok === false && gFur.reason === 'owned' &&
      w298bf.stones === 100000 && w298bf.alchemy.furnace === true &&
      r298t.ok === false && r298t.reason === 'owned' && w298t.stones === 100000 &&
      gMat.ok === true && w298m.stones === 99700 && Object.keys(w298m.materials).length > 0;

    var w298d = shelf298(mkWs({ realm: 1, stones: 100000, artsKnown: ['tuna'], artsSlots: ['tuna'], shelf: [] }), [artItem298()]);
    var r298d = SQ.Shop.buy(w298d, pack, D, M(prof298, w298d), 0, false, noopLog());
    var shelfPath298 = r298d.ok === true && w298d.shelf.indexOf('chunyu') >= 0 &&
      w298d.artsKnown.indexOf('chunyu') < 0 && w298d.stones === 97700;

    var w298e = shelf298(mkWs({ realm: 5, stones: 100000, artsKnown: ['tuna'], artsSlots: ['tuna'], shelf: [] }), [artItem298()]);
    var mE = M(prof298, w298e);
    var other298 = { kind: 'arts', ref: 'qingxin', sold: false, price: 120 };
    var r298e = SQ.Shop.buy(w298e, pack, D, mE, 0, false, noopLog(), SQ.Shop.goodSig(other298));
    var stoneAfterStale298 = w298e.stones;
    var r298e2 = SQ.Shop.buy(w298e, pack, D, mE, 0, false, noopLog(), SQ.Shop.goodSig(w298e.shop.items[0]));
    var stale298 = r298e.ok === false && r298e.reason === 'stale' && stoneAfterStale298 === 100000 &&
      r298e2.ok === true && w298e.artsKnown.indexOf('chunyu') >= 0;

    var ref298 = {};
    await SQ.mutate(ref298, function (s) {
      s.profile = mkProf();
      s.worlds.xiuxian = pack.initialState();
      var wS = s.worlds.xiuxian;
      wS.realm = 5; wS.stones = 100000; wS.artsKnown = ['tuna']; wS.artsSlots = ['tuna']; wS.shelf = [];
      shelf298(wS, [artItem298()]);
    });
    var logs298Before = (ref298.worlds.xiuxian.log || []).length;
    await SQ.Actions.buy(ref298, 0, false, SQ.Shop.goodSig(ref298.worlds.xiuxian.shop.items[0]));
    var logTxt298 = (ref298.worlds.xiuxian.log || []).slice(logs298Before).map(function (l) { return String(l.text || l.txt || ''); }).join(' ');
    var log298 = (ref298.worlds.xiuxian.log || []).length > logs298Before && /春风化雨篇/.test(logTxt298);

    /* (g2) 第卌六批（用户反馈「坊市买功法后功法页看不见」）：**未达标**那一支原本一条日志都不写
       ⇒ 走真入口买一部 realm 要求未达的功法，日志必须写出「入待修习架」的去向（入门支与溢出支早有日志，只差这一支）。 */
    var ref298s = {};
    await SQ.mutate(ref298s, function (s) {
      s.profile = mkProf();
      s.worlds.xiuxian = pack.initialState();
      var wS2 = s.worlds.xiuxian;
      wS2.realm = 1; wS2.stones = 100000; wS2.artsKnown = ['tuna']; wS2.artsSlots = ['tuna']; wS2.shelf = [];
      shelf298(wS2, [artItem298()]);
    });
    var logs298sBefore = (ref298s.worlds.xiuxian.log || []).length;
    await SQ.Actions.buy(ref298s, 0, false, SQ.Shop.goodSig(ref298s.worlds.xiuxian.shop.items[0]));
    var w298s = ref298s.worlds.xiuxian;
    var logTxt298s = (w298s.log || []).slice(logs298sBefore).map(function (l) { return String(l.text || l.txt || ''); }).join(' ');
    var stow298 = w298s.shelf.indexOf('chunyu') >= 0 && w298s.artsKnown.indexOf('chunyu') < 0 &&
      w298s.stones === 97700 && (w298s.log || []).length > logs298sBefore &&
      /待修习架/.test(logTxt298s) && /春风化雨篇/.test(logTxt298s);

    var w298g = shelf298(mkWs({ realm: 5, stones: 100000, artsKnown: ['tuna', 'chunyu'], artsSlots: ['tuna'] }), []);
    w298g.shop.merchant = { until: Date.now() + 600000, scout: false, items: [artItem298()] };
    var r298g = SQ.Shop.buyMerchant(w298g, pack, D, M(prof298, w298g), 0, noopLog());
    var merch298 = r298g.ok === false && r298g.reason === 'owned' && w298g.stones === 100000 &&
      w298g.shop.merchant.items[0].sold === false;

    /* (h) 库藏阁的手动炼化（销毁性操作）：CONFIRM 无阻塞，期间战斗掉落会 push 库藏、
       溢出还会炼化别件 ⇒ 序号整体位移。视图带回指纹，对不上就不销毁任何东西。 */
    var w298h = mkWs({ realm: 5, stones: 100000 });
    var gA = mkGear('weapon', { name: '甲', tier: 2, atk: 40 });
    var gB = mkGear('weapon', { name: '乙', tier: 1, atk: 20 });
    w298h.stash = [gA, gB];
    var mH = M(prof298, w298h);
    var r298h = SQ.Gear.salvage(w298h, pack, D, mH, 0, noopLog(), SQ.Gear.itemSig(gB));
    var mid298h = { n: w298h.stash.length, st: w298h.stones };      /* 拒单当下的现场（后续成交会改档，不能事后回看） */
    var r298h2 = SQ.Gear.salvage(w298h, pack, D, mH, 0, noopLog(), SQ.Gear.itemSig(gA));
    var stash298 = r298h.ok === false && r298h.reason === 'stale' && mid298h.n === 2 &&
      mid298h.st === 100000 && r298h2.ok === true && w298h.stash.length === 1 && w298h.stones > 100000;

    ok('298', '坊市与特席的先判后扣（第廿六批 · "买到的东西必须落得下"整族）：(a) 功法已拥有拒 owned (b) 未达标且待修习架已满拒 shelffull（不再"扣全价退半、功法凭空消失"） (c) 丹方/普通图纸/丹炉图(已有炉)/丹炉成品/法宝 已拥有各拒 owned，材料包放行 (d) 未达标而架未满仍落架（#101 口径不回归） (e) expect 指纹与序号上的货不符 → 拒 stale（弹窗期间被补货换架的实测形状） (f) 成交写交付日志（旧传 null ⇒ 全程无痕） (g) 特席同判定 (h) 库藏炼化错位拒单、不销毁 (i) 第卌六批：未达标落架也写**去向日志**（这一支原本零日志 ⇒ 玩家以为货丢了）',
      own298 && full298 && dup298 && shelfPath298 && stale298 && log298 && merch298 && stash298 && stow298,
      '已拥有=' + own298 + ' 架满=' + full298 + ' 子货重复=' + dup298 + ' 落架=' + shelfPath298 +
      ' 错位=' + stale298 + ' 日志=' + log298 + '(' + logTxt298.slice(0, 26) + ') 特席=' + merch298 + ' 炼化=' + stash298 +
      ' 落架日志=' + stow298 + '(' + logTxt298s.slice(0, 40) + ')');


    /* ═══ #299 前世书的游戏日期 + 历法单源（第廿八批 2026-10-13 · 用户报「前世书里的文本描述有问题，
     * 写着是日但是没有写具体游戏时间」；同批把视图里的历法算式上移到 core 收成单源）═══
     * 全条零随机：日期一律由固定 createdAt / calYear / ts 推出，正文取 generateBio 真产物。 */
    var CA299 = 1700000000000, CY299 = 7, NOW299 = CA299 + 800000;
    var w299 = mkWs({ calYear: CY299 });
    var prof299 = mkProf([]); prof299.createdAt = CA299; prof299.worldName = '沧霄界';
    /* (a) 历法逐值对表：入世当日 = 起始年 1 月 1 日；第 359 日 = 12 月 30 日；第 360 日翻年；
     *     ts 早于入世 ⇒ 钳到第 0 日（不出现负日） */
    var g299a = SQ.gameDateOf(prof299, w299, CA299);
    var g299b = SQ.gameDateOf(prof299, w299, CA299 + 359 * 1000);
    var g299c = SQ.gameDateOf(prof299, w299, CA299 + 360 * 1000);
    var g299d = SQ.gameDateOf(prof299, w299, CA299 - 5000);
    var cal299 = g299a.y === 7 && g299a.m === 1 && g299a.d === 1 &&
      g299b.y === 7 && g299b.m === 12 && g299b.d === 30 &&
      g299c.y === 8 && g299c.m === 1 && g299c.d === 1 &&
      g299d.y === 7 && g299d.m === 1 && g299d.d === 1;
    /* (b) 显示名 = 世界名去尾字（沧霄界 → 沧霄）；createdAt 缺失 ⇒ 空串（**绝不写「0年0月0日」那种假日期**） */
    var str299 = SQ.gameDateStr(prof299, w299, CA299 + 41 * 1000, 'xiuxian');
    var str299no = SQ.gameDateStr({ name: 'x' }, w299, CA299, 'xiuxian');
    var strOk299 = str299 === '沧霄历7年2月12日' && str299no === '';
    /* (c) 传记时间轴：每条大事与通道终行都带**各自那天**的日期；「是日」族模板一字未动
     *     （同一批键还与天道编年史、问天谪星共用，改模板会连坐两处 ⇒ 只补行首日期） */
    var w299e = mkWs({ calYear: CY299, realm: 5 });
    w299e.tiandao = w299e.tiandao || {};
    w299e.tiandao.chron = [
      { k: 'clear', v: { z: 0 }, at: CA299 + 9 * 1000 },
      { k: 'break', v: { realm: 3 }, at: CA299 + 370 * 1000 }
    ];
});
