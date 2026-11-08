/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-state-init.cjs 生成，重跑覆盖
 * 源切片：view/games/qunxia/game.html L2906–L3035 · let state（对象字面量逐字节原样）
 * 包裹工厂：字面量内的 MASTERS_INIT 引用经形参注入（浏览器=全局词法绑定，node=require 注入）
 * ============================================================ */

var QX3D_STATE_INIT = (function (MASTERS_INIT) {
  return {
      hasCreatedChar: false,
      playerName: '沈青锋',
      sectId: 'none',
      sectRankIdx: 0,
      sectMerit: 0,
      sectName: '无门无派·小虾米',
      realmIdx: 0,
      turn: 1,
      maxTurns: 36,
      hp: 85, maxHp: 85,
      mp: 50, maxMp: 50,
      ap: 5, maxAp: 5,
      gold: 15,
      fame: 5,
      exp: 0,
      currentRegion: 'luoyang',
      currentTileIdx: 1,
      viewLayer: 'world',
      trackedMasterId: null,

      mainQuestStep: 0,
      shadowWaves: {},
      endingUnlocked: false,

      karma: {
        xiayi: 10,
        kuangao: 10,
        xiaoyao: 10
      },

      // 严谨冷却与限次记账（防止无限点击白嫖）
      turnFlags: {
        drankTavern: false,
        sectTaskDone: false,
        sectPracticeDone: false,
        shrineDone: false,
        guardianDuelDone: false,
        midRoadEventDone: false,
        exploredRegions: {} // regionId -> true
      },
      bountyCooldownUntil: {}, // regionId -> turnNumber
      purchasedCounts: {},

      unlockedAcupoints: [],
      talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
      openingVow: 'vow_homestead',

      // 洛水隐庐 · 日常经营模块数据（开局荒芜茅屋，从零开垦！）
      estate: {
        herbs: 0,
        iron: 0,
        stewardId: null,
        workDoneThisTurn: false,
        buildings: {
          winery: 0,    // 杏花酒坊 (0-3级)
          herbGarden: 0,// 百草药圃 (0-3级)
          smithy: 0,    // 神机铁坊 (0-3级)
          academy: 0    // 飞鸽书院 (0-3级)
        }
      },

      learnedArts: {
        basic_tuna: 1,
        taizu_changquan: 1,
        songfeng_jian: 1,
        wuhu_dao: 1
      },
      equippedInner: 'basic_tuna',
      equippedMoves: ['taizu_changquan', 'songfeng_jian', 'wuhu_dao'],

      equipment: {
        weapon: 'rusty_sword',
        armor: 'cloth_robe',
        charm: null
      },
      forgeLevels: {
        weapon: 0,
        armor: 0,
        charm: 0
      },
      inventory: {},

      crises: [],
      canonEventsTriggered: {},
      canonEventReports: [],
      worldGen: null,   /* 跨世棋盘重开（册271）：payload 带世界世代（转世次数），loadGame 时对表 */
      inspectorTab: 'local',
      tutorialComboDone: false,
      scrollProposition: null,
      scrollResultSeeds: [],
      aftermathDoneIds: {},
      carryRelic: null,
      rumorsHeard: [],

      // P4-A 市井：刷名、见识、玩家已知节点、最近一条风声可靠度
      streetSpawn: {},
      intelTier: 0,
      playerKnownNode: null,
      rumorReliability: null,
      pendingRumor: null,
      streetActTurn: {},

      // P4-B 配角：同旬在场、后果旗、残卷标签偏置。不改 P4-A 字段。
      sidePresence: {},
      sideFlags: {},
      sideScrollBias: {},

      // P4-C 势力态度。前台只出短词，数值留在这里。
      court: null,

      // P4-E 情感。好感档在后台，前台只出阶段词。
      romance: null,

      // P4-F 立号。房舍=隐庐进数。门人零攻击气血。
      faction: null,
      streetFavor: {},

      bounties: [
        { region: 'luoyang', tileIdx: 5, name: '黄河沙通天', title: '鬼门龙王 · 悬赏恶徒', stance: 'gang', power: 58, hp: 125, rewardGold: 32, rewardFame: 14 },
        { region: 'huashan', tileIdx: 2, name: '塞北封不平', title: '剑宗狂客 · 悬赏高人', stance: 'qiao', power: 64, hp: 135, rewardGold: 38, rewardFame: 16 }
      ],

      masters: JSON.parse(JSON.stringify(MASTERS_INIT)),

      logs: [
        { time: '第1旬·孟春上旬', text: '【主线开启】身怀师尊遗物「玄铁剑令」踏入【洛阳】，踏入三十六旬江湖——36 桩天下大事按旬到期，血衣楼之谜藏在其中。' },
        { time: '第1旬·孟春上旬', text: '【行脚节律】每旬拥有 5 点行脚精力，各项把酒、切磋、探秘、演武均耗精力且有旬度限制；精力耗尽请点击右上角【🧘 吐纳过旬】！' }
      ]
    };
})(typeof MASTERS_INIT !== "undefined"
  ? MASTERS_INIT
  : require('./masters.js').MASTERS_INIT);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QX3D_STATE_INIT: QX3D_STATE_INIT };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { QX3D_STATE_INIT });
}
