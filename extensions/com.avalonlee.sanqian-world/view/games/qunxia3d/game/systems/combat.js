/* systems/combat.js — 三招对决纯引擎（源规格 §四 #7 · M2）
 * 迁移源（view/games/qunxia/game.html）：
 *   startDuel :7152–:7207（state 面）   pickEnemyIntentStance :7209–:7215
 *   playDuelCard :7427–:7659（逐式复算：相克 ×1.75/1.85/0.65/0.48、独孤 2.05、
 *     剑神羁绊 +0.2、内功同性 1.2、低内息 0.65、印记 jianyi+16%/bagang+18%、
 *     受击 taiji-20%/beiming-18% 保底 0.25、cheng 反震 0.55/玉女 +28/九阴吸血 +24、
 *     zhuan 引爆 26/关元 32、三才 round3 +38、绝招回血 18、九阳回气 8、
 *     连招 ×1.28、势序判 :6638、成招名 :6620）
 *   finishDuel :7661–:7783（胜：奖励/名宿好感/缉拿 splice/大事 alt 回流+邸报+血衣楼揭底/
 *     主线/晋升传功；败：exp+10/失败代价区间掷/lose 回流+loseText）
 *   getMoveFormShi :6600   pickRecommendedDuelCards :6686
 * 与原版偏差（显式登记）：
 *   ① duelState 从模块单例改为显式对象（initDuel 返回、playDuelCard/finishDuel 传参）——
 *      保住 headless 复算；UI 层持柄
 *   ② renderDuelStage / showComboFloatTip / flashComboFx / 教学战 tutorialBattle 分支 =
 *      表现层，duel-ui 接（教学战随 M2 尾批）；d.beat 演出锚保留在 d 上
 *   ③ sceneLine（payload 当场戏）= M3 env 钩子，缺省空串
 *   ④ saveGame 由调用方负责（原 :7782）
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.combat = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var core = (typeof module !== 'undefined' && module.exports)
    ? { time: require('../core/time.js'), player: require('../core/player.js'), data: require('../core/data.js') }
    : (root.QX3D && root.QX3D.core) || {};
  var tilesSys = (typeof module !== 'undefined' && module.exports)
    ? require('./tiles.js')
    : (root.QX3D && root.QX3D.systems && root.QX3D.systems.tiles) || {};
  var D = core.data ? core.data.D : (root.QX3D_DATA || {});

  function rngOf(env) { return (env && env.rand) || Math.random; }
  function log(st, env, text) { (env && env.addLog || core.time.addLog)(st, text); }
  function toast(env, msg, tone) { if (env && env.showToast) env.showToast(msg, tone); }

  /* ── 形/势判定（getMoveFormShi :6600–:6618 逐字）────────────────────────── */
  function getMoveFormShi(card) {
    if (!card) return { form: 'fist', shi: 'break' };
    if (card.form && card.shi) return { form: card.form, shi: card.shi };
    const name = card.name || '';
    let form = 'fist';
    if (card.id === 'lingbo_weibu' || /步|影|踏|掠|飞燕|轻功/.test(name)) form = 'qinggong';
    else if (/剑|刺|箫|刀/.test(name)) form = 'sword';
    else if (/拳|掌|靠|拿|打|擒/.test(name)) form = 'fist';
    else if (card.stance === 'qiao') form = 'sword';
    else if (card.stance === 'rou') form = 'fist';
    let shi = 'break';
    if (card.comboRole === 'cheng') shi = 'parry';
    else if (card.comboRole === 'zhuan' || card.isUlt) shi = 'chase';
    else if (card.comboRole === 'qi') shi = 'break';
    else if (card.stance === 'rou') shi = 'parry';
    else if (card.stance === 'qiao') shi = 'chase';
    else if (card.stance === 'gang') shi = 'break';
    return { form: form, shi: shi };
  }

  /* ── 势序与成招名（isLegalShiSequence :6638 / synthesizeComboName :6620）──── */
  function isLegalShiSequence(shiList) {
    // 合法：破防 → 追击；或 破防 → 卸力 → 追击
    if (shiList.length < 2) return false;
    if (shiList[0] !== 'break') return false;
    if (shiList.length === 2) return shiList[1] === 'chase';
    if (shiList.length === 3) return shiList[1] === 'parry' && shiList[2] === 'chase';
    return false;
  }

  function synthesizeComboName(chain) {
    if (!chain || !chain.length) return '散招';
    const keyFull = [chain[0].form].concat(chain.map(c => c.shi)).join('|');
    if (D.FORM_SHI_COMBO_NAMES[keyFull]) return D.FORM_SHI_COMBO_NAMES[keyFull];
    const keyShort = chain[0].form + '|' + chain.map(c => c.shi).filter(s => s !== 'parry' || chain.length > 2).join('|');
    // try break+chase
    const forms = chain[0].form;
    const hasBreak = chain.some(c => c.shi === 'break');
    const hasChase = chain.some(c => c.shi === 'chase');
    if (hasBreak && hasChase) {
      const k = forms + '|break|chase';
      if (D.FORM_SHI_COMBO_NAMES[k]) return D.FORM_SHI_COMBO_NAMES[k];
    }
    const fm = D.FORM_META[chain[0].form];
    const last = D.SHI_META[chain[chain.length - 1].shi];
    return (fm ? fm.label : '') + '·' + (last ? last.label : '散招');
  }

  /* ── 敌方意图（pickEnemyIntentStance :7209）────────────────────────────── */
  function pickEnemyIntentStance(preferredStance, env) {
    const all = ['gang', 'rou', 'qiao'];
    if (rngOf(env)() < 0.65 && all.includes(preferredStance)) {
      return preferredStance;
    }
    return all[Math.floor(rngOf(env)() * all.length)];
  }

  /* ── 开局（startDuel :7152–:7193 state 面）──────────────────────────────── */
  function initDuel(st, cfg, env) {
    const bonus = core.player.calcPlayerStats(st);
    const activeSyns = (D.SYNERGIES_DB || []).filter(s => s.check(st));

    const initTokens = { jianyi: 0, taiji: 0, bagang: 0, beiming: 0 };
    if (st.equippedInner === 'zixia_shengong') initTokens.jianyi += 1;
    if (st.equippedInner === 'jiuyang_shengong') initTokens.bagang += 1;
    if (st.equippedInner === 'beiming_shengong') initTokens.beiming += 1;
    if (st.equippedInner === 'yijin_jing') { initTokens.bagang += 1; initTokens.taiji += 1; }
    if (st.equippedInner === 'xiaowuxiang_gong') initTokens.taiji += 1;
    if ((st.unlockedAcupoints || []).includes('baihui')) initTokens.jianyi += 1;

    activeSyns.forEach(s => {
      if (s.id === 'syn_sword_god') initTokens.jianyi += 1;
      if (s.id === 'syn_dragon_hero') initTokens.bagang += 1;
      if (s.id === 'syn_taiji_master') initTokens.taiji += 1;
    });

    const d = {};
    Object.keys(cfg || {}).forEach(k => { d[k] = cfg[k]; });
    d.round = 1;
    d.maxRounds = 3;
    d.playerWins = 0;
    d.enemyWins = 0;
    d.roundHistory = ['pending', 'pending', 'pending'];
    d.enemyMaxHp = cfg.enemyHp;
    d.enemyCurHp = cfg.enemyHp;
    d.nextEnemyStance = pickEnemyIntentStance(cfg.enemyStance, env);
    d.finished = false;
    d.playerBonus = bonus;
    d.activeSyns = activeSyns;
    d.tokens = initTokens;
    d.comboChain = [];
    d.formShiChain = [];
    d.logs = [`【开局起势】你与【${cfg.enemyName}】相对而立！激活羁绊：${activeSyns.length > 0 ? activeSyns.map(s => s.name).join('、') : '散手'}。`];
    d.synHold = activeSyns.length > 0;
    return d;
  }

  /* 手牌构造（renderDuelStage :7324–:7339 的卡面逻辑） */
  function buildHand(st, d) {
    const inner = D.MARTIAL_DB[st.equippedInner] || D.MARTIAL_DB.zixia_shengong;
    const handCards = st.equippedMoves.map(id => D.MARTIAL_DB[id]).filter(Boolean);
    const totalTokens = Object.values(d.tokens).reduce((a, b) => a + b, 0);
    const ultCard = {
      id: '__ult__',
      name: inner.ultName,
      stance: 'inner',
      comboRole: 'zhuan',
      form: 'sword',
      shi: 'chase',
      power: inner.ultPower,
      mpCost: inner.ultCost,
      effectDesc: `【绝招·终结】无视克制并引爆全部印记（当前可引爆 ${totalTokens} 层印记，每层+25伤）`,
      isUlt: true
    };
    return handCards.concat([ultCard]);
  }

  /* ── 推荐手牌（pickRecommendedDuelCards :6686–:6709）────────────────────── */
  function pickRecommendedDuelCards(allCards, d, counterStanceKey) {
    const scored = allCards.map(card => {
      let score = card.power || 20;
      const fs = getMoveFormShi(card);
      if (card.stance === counterStanceKey || card.isUlt) score += 40;
      const roleMatch = (d.round === 1 && card.comboRole === 'qi') ||
        (d.round === 2 && card.comboRole === 'cheng') ||
        (d.round === 3 && card.comboRole === 'zhuan');
      if (roleMatch) score += 25;
      // 若已有破防链，追击优先
      if (d.formShiChain && d.formShiChain.some(x => x.shi === 'break') && fs.shi === 'chase') score += 35;
      return { card: card, score: score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).map(x => x.card);
    const topIds = new Set(top.map(c => c.id));
    const rest = scored.map(x => x.card).filter(c => !topIds.has(c.id));
    return { recommended: top, more: rest };
  }

  /* ── 出招（playDuelCard :7427–:7659 逐式对写）───────────────────────────── */
  function playDuelCard(st, d, cardId, env) {
    if (!d || d.finished) return null;
    const e = env || {};
    let result = null;
    const inner = D.MARTIAL_DB[st.equippedInner] || D.MARTIAL_DB.zixia_shengong;

    let card;
    let lv = 1;
    if (cardId === '__ult__') {
      card = {
        id: '__ult__', name: inner.ultName, stance: 'inner', comboRole: 'zhuan',
        power: inner.ultPower, mpCost: inner.ultCost, isUlt: true
      };
      lv = st.learnedArts[st.equippedInner] || 1;
    } else {
      card = D.MARTIAL_DB[cardId];
      lv = st.learnedArts[cardId] || 1;
    }
    if (!card) return null;

    const fsNow = getMoveFormShi(card);

    /* 教学势序门禁（:7446–:7458 逐字）：错序浮字 + force_chase 段重置本段，不扣伤害 */
    const tb = e.tb || null;
    if (tb && tb.allowedShi && fsNow.shi !== tb.allowedShi) {
      const need = D.SHI_META[tb.allowedShi];
      if (e.floatTip) e.floatTip(`势序未合：先${need ? need.label : '破防'}再追击，可成招。`, 'amber');
      if (tb.step === 'force_chase') {
        tb.comboChain = [];
        if (d.formShiChain) d.formShiChain = d.formShiChain.filter(x => x.shi === 'break').slice(0, 1);
        if (e.tutorialAdvance) e.tutorialAdvance('force_break');
      }
      return { outcome: 'blocked', playerDmg: 0, enemyDmg: 0, banner: null, notes: [], finished: false, card: card };
    }

    let lowMpPenalty = false;
    if (st.mp < card.mpCost) {
      lowMpPenalty = true;
      st.mp = 0;
    } else {
      st.mp -= card.mpCost;
    }

    const enemyStance = d.nextEnemyStance;
    const enemyMeta = D.STANCE_META[enemyStance];
    let outcome = 'draw';
    let dmgMultiplier = 1.0;
    let enemyDmgMultiplier = 1.0;

    if (card.isUlt || card.id === 'qiankun_nuoyi') {
      outcome = 'counter';
      dmgMultiplier = 1.85;
      enemyDmgMultiplier = 0.4;
    } else if (D.STANCE_META[card.stance].beats === enemyStance) {
      outcome = 'counter';
      dmgMultiplier = card.id === 'dugu_jiujian' ? 2.05 : 1.75;
      if (d.activeSyns.some(s => s.id === 'syn_sword_god')) dmgMultiplier += 0.2;
      enemyDmgMultiplier = 0.48;
    } else if (D.STANCE_META[card.stance].beatenBy === enemyStance) {
      outcome = 'beaten';
      dmgMultiplier = 0.65;
      enemyDmgMultiplier = 1.4;
    }

    if (inner.affinity === card.stance || st.equippedInner === 'xiaowuxiang_gong') {
      dmgMultiplier *= 1.2;
    }
    if (lowMpPenalty) dmgMultiplier *= 0.65;

    const curJianyi = d.tokens.jianyi || 0;
    const curBagang = d.tokens.bagang || 0;
    const curTaiji = d.tokens.taiji || 0;
    const curBeiming = d.tokens.beiming || 0;

    dmgMultiplier += curJianyi * 0.16 + curBagang * 0.18;
    enemyDmgMultiplier = Math.max(0.25, enemyDmgMultiplier - curTaiji * 0.2 - curBeiming * 0.18);

    const rawPlayerAtk = card.power + lv * 6 + d.playerBonus.atkBonus;
    let playerDmg = Math.round(rawPlayerAtk * dmgMultiplier);
    let enemyDmg = Math.round((d.enemyPower * 0.48) * enemyDmgMultiplier);

    const comboNotes = [];
    d.comboChain.push(card.comboRole || 'qi');
    if (!d.formShiChain) d.formShiChain = [];
    d.formShiChain.push({ form: fsNow.form, shi: fsNow.shi, name: card.name });
    if (tb) {
      tb.comboChain.push(fsNow);
      if (tb.step === 'force_break' && fsNow.shi === 'break') {
        if (e.tutorialAdvance) e.tutorialAdvance('force_chase');
      } else if (tb.step === 'force_chase' && fsNow.shi === 'chase') {
        const comboName = synthesizeComboName(d.formShiChain);
        if (e.flashCombo) e.flashCombo(comboName);
        comboNotes.push(`✦ 教学成招【${comboName}】`);
        playerDmg = Math.round(playerDmg * 1.35);
        if (e.tutorialAdvance) e.tutorialAdvance('combo_success');
        st.tutorialComboDone = true;
      }
    } else {
      const shiList = d.formShiChain.map(x => x.shi);
      if (isLegalShiSequence(shiList)) {
        const comboName = synthesizeComboName(d.formShiChain);
        if (e.flashCombo) e.flashCombo(comboName);
        comboNotes.push(`✦ 连招【${comboName}】`);
        playerDmg = Math.round(playerDmg * 1.28);
        d.formShiChain = [];
      } else if (shiList.length >= 2 && shiList[0] !== 'break') {
        if (e.floatTip) e.floatTip('若先破防再追击，可成招——势序由系统判定。', 'amber');
        d.formShiChain = [];
      } else if (shiList.length >= 3) {
        if (e.floatTip) e.floatTip('散招：试破防→追击（中可卸力）。', 'amber');
        d.formShiChain = [];
      }
    }

    if (card.tokenType && card.tokenGain && card.comboRole !== 'zhuan') {
      d.tokens[card.tokenType] = (d.tokens[card.tokenType] || 0) + card.tokenGain;
      if (card.id === 'lingbo_weibu') d.tokens.jianyi = (d.tokens.jianyi || 0) + 1;
      if (card.id === 'dagou_bang') d.tokens.bagang = (d.tokens.bagang || 0) + 1;
      comboNotes.push(`凝聚【${D.TOKEN_META[card.tokenType].name} +${card.tokenGain}】`);
    }

    if (card.comboRole === 'cheng') {
      if (curTaiji > 0 || card.id === 'qiankun_nuoyi') {
        const reflectDmg = Math.round(enemyDmg * (card.id === 'qiankun_nuoyi' ? 0.85 : 0.55));
        playerDmg += reflectDmg;
        comboNotes.push(`☯️ 借力反震 +${reflectDmg} 伤`);
      }
      if (card.id === 'yunv_jian' && curJianyi > 0) {
        playerDmg += 28;
        comboNotes.push(`🗡️ 双剑合璧连击 +28 伤`);
      }
      if (card.id === 'jiuyin_zhua') {
        st.hp = Math.min(st.maxHp, st.hp + 24);
        comboNotes.push(`吸取气血 +24`);
      }
    }

    if (card.comboRole === 'zhuan' || card.isUlt) {
      const totalTokens = (d.tokens.jianyi || 0) + (d.tokens.bagang || 0) + (d.tokens.taiji || 0) + (d.tokens.beiming || 0);
      if (totalTokens > 0) {
        const perToken = (st.unlockedAcupoints || []).includes('guanyuan') ? 32 : 26;
        const burstDmg = totalTokens * perToken;
        playerDmg += burstDmg;
        d.tokens = { jianyi: 0, taiji: 0, bagang: 0, beiming: 0 };
        comboNotes.push(`💥【终结连携引爆 ${totalTokens} 层印记 +${burstDmg} 真实伤害！】`);
      }
    }

    if (d.round === 3 && d.comboChain[0] === 'qi' && d.comboChain[1] === 'cheng' && d.comboChain[2] === 'zhuan') {
      playerDmg += 38;
      comboNotes.push(`🌟【起·承·转完美三才连招 +38 伤！】`);
    }

    if (card.isUlt) {
      st.hp = Math.min(st.maxHp, st.hp + 18);
    }
    if (st.equippedInner === 'jiuyang_shengong') {
      st.mp = Math.min(st.maxMp, st.mp + 8);
    }

    d.enemyCurHp = Math.max(0, d.enemyCurHp - playerDmg);
    if (d.tutorial || (tb && !st.tutorialComboDone)) {
      enemyDmg = Math.min(enemyDmg, 4);
      st.hp = Math.max(Math.floor(st.maxHp * 0.45), st.hp - enemyDmg);
    } else {
      st.hp = Math.max(1, st.hp - enemyDmg);
    }

    d.beat = { name: card.name, hurt: outcome === 'beaten' };
    const noteStr = comboNotes.length > 0 ? `（${comboNotes.join('，')}）` : '';
    let banner;
    if (outcome === 'counter' || playerDmg >= enemyDmg * 1.15) {
      d.playerWins += 1;
      d.roundHistory[d.round - 1] = 'win';
      banner = card.comboRole === 'zhuan' ? '💥 印记绝杀！' : outcome === 'counter' ? '⚡ 破招制胜！' : '🗡️ 剑高一着！';
      d.logs.push(
        `【第${d.round}招·胜】${d.enemyName}出【${enemyMeta.name}】，你以《${card.name}》轰出 <b class="text-red-700">${playerDmg}</b> 伤害，自身仅受 ${enemyDmg} 伤 ${noteStr}`
      );
    } else if (outcome === 'beaten' && enemyDmg > playerDmg) {
      d.enemyWins += 1;
      d.roundHistory[d.round - 1] = 'lose';
      banner = '💥 招式受制！';
      d.logs.push(
        `【第${d.round}招·挫】你施展《${card.name}》，被${d.enemyName}【${enemyMeta.name}】压制！造成 ${playerDmg} 伤，自身受 <b class="text-red-700">${enemyDmg}</b> 伤 ${noteStr}`
      );
    } else {
      d.playerWins += 1;
      d.roundHistory[d.round - 1] = 'win';
      banner = '⚔️ 硬撼拆招！';
      d.logs.push(
        `【第${d.round}招·拆】双招硬撼！《${card.name}》震退${d.enemyName}造成 <b class="text-red-700">${playerDmg}</b> 伤，自身受 <b class="text-red-700">${enemyDmg}</b> 伤 ${noteStr}`
      );
    }

    if (tb && tb.step === 'combo_success') {
      d.enemyCurHp = 0;
      d.playerWins = Math.max(d.playerWins, 2);
      if (e.tutorialAdvance) e.tutorialAdvance('outro');
      result = finishDuel(st, d, e);
      return { outcome: outcome, playerDmg: playerDmg, enemyDmg: enemyDmg, banner: banner, notes: comboNotes, finished: true, card: card, result: result };
    }

    let finished = false;
    if (d.enemyCurHp <= 0 || d.round >= 3) {
      if (tb && !st.tutorialComboDone) {
        if (e.floatTip) e.floatTip('尚未成招：再试破防→追击。', 'amber');
        d.round = 1;
        d.roundHistory = ['pending', 'pending', 'pending'];
        d.playerWins = 0;
        d.enemyWins = 0;
        d.enemyCurHp = d.enemyMaxHp;
        d.formShiChain = [];
        if (e.tutorialAdvance) e.tutorialAdvance('force_break');
        return { outcome: 'reset', playerDmg: playerDmg, enemyDmg: enemyDmg, banner: banner, notes: comboNotes, finished: false, card: card, result: null };
      }
      finished = true;
      /* 原版 :7651 在 playDuelCard 内部直接 finishDuel()——终局奖惩随出招落账，
       * 返回值带 result 供 UI 层出结算面板 */
      result = finishDuel(st, d, e);
    } else {
      d.round += 1;
      d.nextEnemyStance = pickEnemyIntentStance(d.enemyStance, env);
    }
    return { outcome: outcome, playerDmg: playerDmg, enemyDmg: enemyDmg, banner: banner, notes: comboNotes, finished: finished, card: card, result: result || null };
  }

  /* ── 调息（duelMeditate :7412）──────────────────────────────────────────── */
  function duelMeditate(st, d, env) {
    if (!d || d.finished) return false;
    if (d.meditatedRound === d.round) {
      toast(env, '这一招已经调息过。', 'amber');
      return false;
    }
    d.meditatedRound = d.round;
    st.mp = Math.min(st.maxMp, st.mp + Math.round(st.maxMp * 0.2));
    d.logs.push('【调息】真气回了一截。这一拍的预览收起。');
    return true;
  }

  /* ── 终局（finishDuel :7661–:7783）──────────────────────────────────────── */
  function finishDuel(st, d, env) {
    const e = env || {};
    d.finished = true;
    const isVictory = d.enemyCurHp <= 0 || d.playerWins >= d.enemyWins;
    const result = { victory: isVictory, extraMsg: '', loseText: '', failMsg: '' };
    /* 册307：配角对决结果回流（P4-B sideCastResult → 旗标），由 app 注入 */
    if (d.sideCastResult && typeof e.onSideDuelResult === 'function') {
      e.onSideDuelResult(st, d.sideCastResult.kind, isVictory, d.sideCastResult);
    }

    if (isVictory) {
      st.gold += d.rewardGold;
      st.fame += d.rewardFame;
      st.exp += d.rewardExp;
      if (d.rewardMerit) st.sectMerit += d.rewardMerit;

      let extraMsg = '';
      if (d.masterId) {
        const m = st.masters.find(x => x.id === d.masterId);
        if (m) {
          m.affinity = Math.min(100, m.affinity + 16);
          extraMsg = `，【${m.name}】抚掌赞叹（好感 +16）`;
        }
      }
      if (d.masterStoryAdvance) {
        const m = st.masters.find(x => x.id === d.masterStoryAdvance.masterId);
        if (m) {
          m.storyStage = d.masterStoryAdvance.nextStage;
          m.affinity = Math.min(100, m.affinity + 22);
          extraMsg = `，【${m.name}】传记推进至第 ${m.storyStage}/3 幕`;
        }
      }
      if (typeof d.bountyIndex === 'number') {
        st.bounties.splice(d.bountyIndex, 1);
        extraMsg = '，成功缉拿悬赏要犯';
      }
      if (d.crisisId) {
        if (e.queueWorldResult) e.queueWorldResult(d.crisisId, 'alt');
        const wonCrisis = st.crises.find(c => c.id === d.crisisId);
        if (wonCrisis) {
          if (!st.canonEventReports) st.canonEventReports = [];
          const scene = e.sceneLine ? e.sceneLine(wonCrisis) : '';
          st.canonEventReports.push({
            title: wonCrisis.title,
            participated: true,
            summary: `你亲赴【${core.time.getRegion(wonCrisis.region).name}】挺身入局，击败强敌${wonCrisis.enemyName}，亲手改写了这桩江湖盛事的结局！` + scene
          });
        }
        st.crises = st.crises.filter(c => c.id !== d.crisisId);
        extraMsg = '，力挽狂澜平定江湖大事';
        // 【血衣楼揭底（世界事件卷 v3.0 §十）】华山论剑（第35旬终局）胜利 = 暗线收束。
        if (d.crisisId === 'we_huashan') {
          extraMsg += '。台下血衣人马四散溃逃——序章以来借群雄之刀清理知情人、操纵流言的【玄冥血衣楼】，今日被你连根拔起！';
          log(st, e, '🗡️【暗线终局】华山之巅揭底：血衣楼操盘论剑的阴谋被你当众戳破，余孽溃散。序章那半枚玄铁剑令的债，至此两清。');
        }
        if (typeof e.crisisReward === 'function') {
          const rwMsg = e.crisisReward(d.crisisId);
          if (rwMsg) extraMsg += '，' + rwMsg;
        }
      }
      if (typeof d.mainQuestAdvanceTo === 'number') {
        st.mainQuestStep = d.mainQuestAdvanceTo;
        if (d.mainQuestLog) {
          log(st, e, `📜【主线推进】${d.mainQuestLog}`);
        }
        extraMsg += '，主线篇章已推进';
      }
      if (typeof d.sectPromotionTo === 'number') {
        st.sectRankIdx = d.sectPromotionTo;
        const sectObj = D.SECTS_DB[st.sectId];
        if (sectObj) {
          const artToGrant = sectObj.arts[Math.min(st.sectRankIdx, sectObj.arts.length - 1)];
          if (artToGrant && D.MARTIAL_DB[artToGrant]) {
            st.learnedArts[artToGrant] = Math.min(10, (st.learnedArts[artToGrant] || 0) + 1);
            extraMsg += `，晋升为【${sectObj.ranks[st.sectRankIdx]}】并获传《${D.MARTIAL_DB[artToGrant].name}》`;
          }
        }
      }

      (e.checkRealmPromotion || tilesSys.checkRealmPromotion)(st, e);
      result.extraMsg = extraMsg;
      result.title = `🏆 三招定音 · 胜出（胜 ${d.playerWins} 招）！`;
      result.rewardText = `获赏银 +${d.rewardGold} 文，侠名 +${d.rewardFame}，修为 +${d.rewardExp}${extraMsg}！`;
      log(st, e, `于「${d.contextTitle}」三招击败【${d.enemyName}】，获纹银 ${d.rewardGold} 文、修为 +${d.rewardExp}${extraMsg}。`);
    } else {
      st.exp += 10;
      let failMsg = '';
      let loseText = '';
      if (d.crisisId) {
        const sched = D.CANON_EVENTS_SCHEDULE.find(x => x.id === d.crisisId);
        if (sched) {
          if (sched.failInjury && sched.failRenown) {
            const roll = a => a[0] + Math.floor(rngOf(e)() * (a[1] - a[0] + 1));
            const inj = roll(sched.failInjury);
            const ren = roll(sched.failRenown);
            st.hp = Math.max(1, st.hp - inj);
            st.fame = Math.max(0, st.fame + ren);
            failMsg = `，内伤 +${inj}，侠名 ${ren >= 0 ? '+' : ''}${ren}`;
          }
          /* 败局即终局（册271 同语义）：败局回流 lose、crisis 移除不再可战。 */
          if (e.queueWorldResult) e.queueWorldResult(d.crisisId, 'lose');
          if (!st.canonEventReports) st.canonEventReports = [];
          st.canonEventReports.push({
            title: sched.title,
            participated: true,
            summary: `你在【${core.time.getRegion(sched.region).name}】挺身入局，力战不敌【${sched.enemyName}】，这一届的结局与你无关了。`
          });
          st.crises = st.crises.filter(c => c.id !== d.crisisId);
          loseText = sched.loseText || '';
        }
      }
      result.failMsg = failMsg;
      result.loseText = loseText;
      result.title = `🍂 棋差一着 · 惜败收招`;
      result.rewardText = `虽败犹荣，印证招式破绽，获得武学修为 +10${failMsg}${loseText ? `。${loseText}` : ''}`;
      log(st, e, `于「${d.contextTitle}」与【${d.enemyName}】激战三招惜败，这一桩江湖大事就此落幕（修为 +10${failMsg}）。`);
    }
    return result;
  }

  /* ── 首局教学（startTutorialComboBattle :7009–:7041 状态面；拍板 = 逐字复刻）── */
  function initTutorial(st, env) {
    if (st.tutorialComboDone) return null;
    const tb = { step: 'intro', formsNamed: {}, comboChain: [], narrationSkipped: false, allowedShi: null, segment: 0 };
    const cfg = {
      enemyName: '醉汉武师',
      enemyTitle: '洛阳近郊 · 酒肆后巷',
      enemyAvatar: '醉',
      enemyStance: 'gang',
      enemyPower: 28,
      enemyHp: 90,
      contextTitle: '🎓 首局教学 · 形×势连招',
      rewardGold: 12,
      rewardFame: 8,
      rewardExp: 35,
      rewardMerit: 0,
      isTutorial: true
    };
    const d = initDuel(st, cfg, env);
    d.formShiChain = [];
    d.tutorial = true;
    d.enemyPower = 22; /* 教学：敌方弱、玩家不致死（:7035–:7039） */
    return { tb: tb, d: d };
  }

  /* advanceTutorialStep :7043–:7099 的状态面（intent/hint 文案与点名钮 = duel-ui 表现层）*/
  function tutorialAdvance(tb, st, step, env) {
    if (!tb) return;
    tb.step = step;
    if (step === 'intro') {
      tb.allowedShi = null;
    } else if (step === 'name_forms') {
      tb.allowedShi = null;
    } else if (step === 'force_break') {
      tb.allowedShi = 'break';
      tb.comboChain = [];
      if (env && env.d) env.d.formShiChain = [];
    } else if (step === 'force_chase') {
      tb.allowedShi = 'chase';
    } else if (step === 'combo_success') {
      st.tutorialComboDone = true;
      tb.allowedShi = null;
      if (env && env.save) env.save();
    } else if (step === 'outro') {
      st.tutorialComboDone = true;
      if (env && env.save) env.save();
    }
  }

  return {
    getMoveFormShi: getMoveFormShi,
    isLegalShiSequence: isLegalShiSequence,
    synthesizeComboName: synthesizeComboName,
    pickEnemyIntentStance: pickEnemyIntentStance,
    initDuel: initDuel,
    buildHand: buildHand,
    pickRecommendedDuelCards: pickRecommendedDuelCards,
    playDuelCard: playDuelCard,
    initTutorial: initTutorial,
    tutorialAdvance: tutorialAdvance,
    duelMeditate: duelMeditate,
    finishDuel: finishDuel
  };
});
