/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-world-events.cjs 生成，重跑覆盖
 * WORLD_EVENTS 36 案（三档收益/出场戏）+ WRITEBACK 写回 + FAIL 败代价 + EV_TURN_MAP v3.0 旬位
 * 源切片（逐字节原样，仅追加导出垫片）：
 * assets/worlds/wuxia/index.js L1157–L1197 · var WORLD_EVENTS
 * assets/worlds/wuxia/index.js L1201–L1201 · var WB_STATE
 * assets/worlds/wuxia/index.js L1202–L1349 · var WRITEBACK
 * assets/worlds/wuxia/index.js L1387–L1426 · var FAIL
 * view/games/qunxia/content-merge.js L161–L170 · var EV_TURN_MAP
 * ============================================================ */

  var WORLD_EVENTS = [
    { i: 'we_huashan', z: null, knot: 'knot_huashan', cyc: 6, tier: { join: 3, lead: 6 }, pre: [], boss: 'huang_yaoshi', reward: { kind: 'art', id: 'yg_jiuyin' }, gain: { watch: { exp: 8 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 60, stones: 5000 } } },
    { i: 'we_xiangyang', z: null, knot: 'knot_xiangyang', window: [0, 8], tier: { join: 3, lead: 5 }, pre: [], boss: 'guo_jing', reward: { kind: 'art', id: 'yg_xianglong' }, gain: { watch: { exp: 8 }, join: { exp: 25, renown: 20 }, lead: { exp: 45, renown: 40, stones: 3000 } } },
    { i: 'we_weijiao_gm', z: 'guangmingding', knot: 'knot_weijiao', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'zhang_wuji', reward: { kind: 'art', id: 'yg_qiankun' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 45, stones: 4000 } } },
    { i: 'we_juxian', z: 'luoyang', knot: 'knot_juxian', window: [0, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'xiao_feng', reward: { kind: 'art', id: 'yg_dagou' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 10 }, lead: { exp: 45, renown: 30, stones: 2000 } } },
    { i: 'we_shaoshishan', z: 'shaolin', knot: 'knot_saodi', window: [2, 8], tier: { join: 4, lead: 6 }, pre: ['we_juxian'], boss: 'xu_zhu', reward: { kind: 'art', id: 'yg_liumai' }, gain: { watch: { exp: 10 }, join: { exp: 30, renown: 20 }, lead: { exp: 50, renown: 45, stones: 3000 } } },
    { i: 'we_zhenlong', z: 'wuliang', knot: 'knot_zhenlong', window: [1, 7], tier: { join: 1, lead: 5 }, pre: [], boss: 'ding_chunqiu', reward: { kind: 'art', id: 'yg_lingbo' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 5 }, lead: { exp: 50, renown: 10, stones: 0 } } },
    { i: 'we_yanmen', z: 'yanmenguan', knot: 'knot_yanmen', window: [2, 8], tier: { join: 4, lead: 7 }, pre: ['we_juxian'], boss: 'xiao_longn', reward: { kind: 'art', id: 'yg_yijin' }, gain: { watch: { exp: 12 }, join: { exp: 30, renown: 25 }, lead: { exp: 60, renown: 60, stones: 0 } } },
    { i: 'we_tushi', z: 'shaolin', knot: 'knot_tushi', window: [3, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'xie_xun', reward: { kind: 'blade', id: 'wp_yitian' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 10 }, lead: { exp: 45, renown: 35, stones: 3000 } } },
    { i: 'we_wuyue_bingpai', z: 'songshan', knot: 'knot_fengchan', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'yue_buqun', reward: { kind: 'manual', id: 'mnl_03' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 45, renown: 40, stones: 3000 } } },
    { i: 'we_heimu', z: null, knot: 'knot_heimu', window: [3, 8], tier: { join: 4, lead: 7 }, pre: ['we_wuyue_bingpai'], boss: 'dongfang_bubai', reward: { kind: 'manual', id: 'mnl_05' }, gain: { watch: { exp: 12 }, join: { exp: 30, renown: 20 }, lead: { exp: 60, renown: 60, stones: 6000 } } },
    { i: 'we_xiake', z: null, knot: 'knot_xiake', cyc: 1, tier: { join: 2, lead: 5 }, pre: [], boss: 'shi_poitian', reward: { kind: 'art', id: 'yg_dugu' }, gain: { watch: { exp: 10 }, join: { exp: 20, renown: 10 }, lead: { exp: 45, renown: 20, stones: 2000 } } },
    { i: 'we_shagui', z: 'luoyang', knot: 'knot_shagui', cyc: 3, tier: { join: 2, lead: 4 }, pre: [], boss: 'hong_antong', reward: { kind: 'blade', id: 'wp_jinshe' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 15 }, lead: { exp: 40, renown: 30, stones: 1500 } } },
    { i: 'we_wangpan', z: null, knot: 'knot_wangpan', window: [0, 2], tier: { join: 1, lead: 4 }, pre: [], boss: 'xie_xun', reward: { kind: 'blade', id: 'wp_tulong' }, gain: { watch: { exp: 8 }, join: { exp: 15, renown: 10 }, lead: { exp: 35, renown: 20, stones: 2500 } } },
    { i: 'we_jueqinggu', z: null, knot: 'knot_jueqinggu', window: [1, 7], tier: { join: 2, lead: 5 }, pre: [], boss: 'yang_guo', reward: { kind: 'blade', id: 'wp_junzi' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 25, stones: 1000 } } },
    { i: 'we_liuheta', z: null, knot: 'knot_liuheta', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'chen_jialuo', reward: { kind: 'blade', id: 'wp_ningbi' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 45, renown: 35, stones: 2000 } } },
    { i: 'we_chuangwang', z: null, knot: 'knot_chuangwang', window: [1, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'hu_fei', reward: { kind: 'blade', id: 'wp_lengyue' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 25, stones: 4000 } } },
    { i: 'we_liancheng', z: null, knot: 'knot_liancheng', window: [0, 6], tier: { join: 1, lead: 4 }, pre: [], boss: 'hua_tiegan', reward: { kind: 'manual', id: 'mnl_11' }, gain: { watch: { exp: 8 }, join: { exp: 15, renown: 5 }, lead: { exp: 35, renown: 15, stones: 3500 } } },
    { i: 'we_jiaozhu', z: 'guangmingding', knot: 'knot_jiaozhu', window: [3, 8], tier: { join: 4, lead: 6 }, pre: ['we_weijiao_gm'], boss: 'ren_woxing', reward: { kind: 'art', id: 'yg_jiuyang' }, gain: { watch: { exp: 10 }, join: { exp: 30, renown: 25 }, lead: { exp: 55, renown: 55, stones: 0 } } },
    { i: 'we_cangjing', z: 'shaolin', knot: 'knot_cangjing', window: [1, 8], tier: { join: 3, lead: 6 }, pre: [], boss: 'xiao_longn', reward: { kind: 'manual', id: 'mnl_04' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 40, stones: 2000 } } },
    { i: 'we_huanshi', z: 'yanziwu', knot: 'knot_huanshi', window: [1, 6], tier: { join: 3, lead: 4 }, pre: [], boss: 'murong_fu', reward: { kind: 'manual', id: 'mnl_06' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 40, stones: 3000 } } },
    /* 册253 · 二批 16 案（世界事件卷 §八 二批名录入码）：补十五部覆盖，全部独发窗口；
     * 窗口终点按 lead 档分级（lead≤4→year6 / 5→year7 / ≥6→year8，与首批同口径）；
     * 主奖励取首批未用尽的名兵 / 秘籍 / 天阶武学，boss 全部落 CAST。 */
    { i: 'we_siguoya', z: null, knot: 'knot_siguoya', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'feng_qingyang', reward: { kind: 'blade', id: 'wp_xuantie' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 5 }, lead: { exp: 40, renown: 20, stones: 1000 } } },
    { i: 'we_taishan', z: null, knot: 'knot_taishan', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'ding_yi', reward: { kind: 'manual', id: 'mnl_08' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 42, renown: 25, stones: 2000 } } },
    { i: 'we_junshan', z: null, knot: 'knot_junshan', window: [0, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'hong_qigong', reward: { kind: 'blade', id: 'wp_dagou' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 15 }, lead: { exp: 40, renown: 30, stones: 1500 } } },
    { i: 'we_chongyang', z: null, knot: 'knot_chongyang', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'ouyang_feng', reward: { kind: 'manual', id: 'mnl_01' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 40, stones: 2500 } } },
    { i: 'we_tiezhang', z: null, knot: 'knot_tiezhang', window: [0, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'qiu_qianren', reward: { kind: 'manual', id: 'mnl_15' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 38, renown: 25, stones: 1500 } } },
    { i: 'we_jueding', z: 'yanfulou', knot: 'knot_jueding', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'huang_yaoshi', reward: { kind: 'blade', id: 'wp_yuxiao' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 45, renown: 35, stones: 2000 } } },
    { i: 'we_lingjiu', z: 'lingshe', knot: 'knot_lingjiu', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'tonglao', reward: { kind: 'art', id: 'mn_008' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 20 }, lead: { exp: 50, renown: 45, stones: 2000 } } },
    { i: 'we_taixuan', z: null, knot: 'knot_taixuan', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'zhang_san', reward: { kind: 'art', id: 'mn_014' }, gain: { watch: { exp: 12 }, join: { exp: 30, renown: 20 }, lead: { exp: 55, renown: 50, stones: 0 } } },
    { i: 'we_xueshan', z: 'kunlun', knot: 'knot_xueshan', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'bai_zizai', reward: { kind: 'blade', id: 'wp_lvbo' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 42, renown: 25, stones: 1500 } } },
    { i: 'we_xuedao', z: 'kunlun', knot: 'knot_xuedao', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'feng_wanli', reward: { kind: 'manual', id: 'mnl_14' }, gain: { watch: { exp: 8 }, join: { exp: 22, renown: 10 }, lead: { exp: 42, renown: 30, stones: 2000 } } },
    { i: 'we_wudu', z: 'dali', knot: 'knot_wudu', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'ding_chunqiu', reward: { kind: 'blade', id: 'wp_ezui' }, gain: { watch: { exp: 8 }, join: { exp: 22, renown: 10 }, lead: { exp: 42, renown: 25, stones: 2000 } } },
    { i: 'we_wenjia', z: 'yanfulou', knot: 'knot_wenjia', window: [0, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'hu_fei', reward: { kind: 'blade', id: 'wp_bixue' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 25, stones: 1500 } } },
    { i: 'we_siguofengbo', z: null, knot: 'knot_siguofengbo', window: [1, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'yue_buqun', reward: { kind: 'art', id: 'yg_dugu' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 30, stones: 1500 } } },
    { i: 'we_dalun', z: 'kunlun', knot: 'knot_dalun', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'he_taichong', reward: { kind: 'art', id: 'mn_001' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 45, stones: 2000 } } },
    { i: 'we_binghuo', z: 'binghuo', knot: 'knot_binghuo', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'xie_xun', reward: { kind: 'blade', id: 'wp_tulong' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 20 }, lead: { exp: 50, renown: 50, stones: 3000 } } },
    { i: 'we_shenlong', z: null, knot: 'knot_shenlong', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'hong_antong', reward: { kind: 'blade', id: 'wp_yuanyang' }, gain: { watch: { exp: 8 }, join: { exp: 22, renown: 15 }, lead: { exp: 44, renown: 35, stones: 2500 } } }
  ];
  var WB_STATE = { dead: 1, flee: 1, secluded: 1, saved: 1 };
  var WRITEBACK = {
    we_huashan: {
      canon: { sects: { huashan: 5 } },
      alt: { sects: { huashan: -5, wudang: 3 } }
    },
    we_xiangyang: {
      canon: { sects: { quanzhen: -5, gaibang: -5, shaolin: -3 } },
      alt: { sects: { quanzhen: 8, gaibang: 8, shaolin: 5 } }
    },
    we_weijiao_gm: {
      canon: { sects: { mingjiao: -40, shaolin: 10, wudang: 10, huashan: 10, kunlun: 10, kongtong: 10, emei: 10 }, next: ['we_jiaozhu'] },
      alt: { sects: { mingjiao: 50, shaolin: -10, wudang: -10, huashan: -10 }, close: ['we_jiaozhu'] }
    },
    we_juxian: {
      canon: { cast: { xiao_feng: 'flee' }, sects: { gaibang: -20 } },
      alt: { cast: { xiao_feng: 'flee' }, sects: { gaibang: -10 } }
    },
    we_yanmen: {
      canon: { cast: { xiao_feng: 'dead' }, sects: { gaibang: -10, shaolin: -5, wudang: -5 } },
      alt: { cast: { xiao_feng: 'secluded' }, sects: { gaibang: 5 } }
    },
    we_zhenlong: {
      canon: { sects: { shaolin: 5 } },
      alt: { sects: { xiaoyao: 10 } }
    },
    we_tushi: {
      canon: { sects: { shaolin: -10, wudang: -10, emei: -10 } },
      alt: { sects: { shaolin: 3, wudang: 3 } }
    },
    we_heimu: {
      canon: { cast: { dongfang_bubai: 'flee' }, sects: { riyue: -10 } },
      alt: { cast: { dongfang_bubai: 'dead' }, sects: { riyue: -30, shaolin: 10, wudang: 10, huashan: 10 } }
    },
    /* 册238：其余 12 案补齐（现役 20 案全覆盖；非 §九 重点案的写回只动门派声望，不扩 cast 白名单） */
    we_shaoshishan: {
      canon: { sects: { shaolin: -5, gaibang: -5 } },
      alt: { sects: { shaolin: 5, gaibang: 5 } }
    },
    we_wuyue_bingpai: {
      canon: { sects: { songshan: 15, taishan: -5, hengshan_n: -5, hengshan: -5, huashan: -5 }, next: ['we_heimu'] },
      alt: { sects: { songshan: -10, huashan: 5 }, close: ['we_heimu'] }
    },
    we_xiake: {
      canon: { sects: {} },
      alt: { sects: { xiaoyao: 5 } }
    },
    we_shagui: {
      canon: { sects: { tiandihui: 10, honghuahui: 5 } },
      alt: { sects: { tiandihui: 5 } }
    },
    we_wangpan: {
      canon: { sects: { riyue: -5 } },
      alt: { sects: { riyue: -10 } }
    },
    we_jueqinggu: {
      canon: { sects: { quanzhen: -3 } },
      alt: { sects: { quanzhen: 5, gumu: 5 } }
    },
    we_liuheta: {
      canon: { sects: { honghuahui: -5 } },
      alt: { sects: { honghuahui: 10 } }
    },
    we_chuangwang: {
      canon: { sects: {} },
      alt: { sects: { tiandihui: 5 } }
    },
    we_liancheng: {
      canon: { sects: {} },
      alt: { sects: { xuedao: 5 } }
    },
    we_jiaozhu: {
      canon: { sects: { mingjiao: 5 } },
      alt: { sects: { mingjiao: 20 } }
    },
    we_cangjing: {
      canon: { sects: { shaolin: -10 } },
      alt: { sects: { shaolin: 10 } }
    },
    we_huanshi: {
      canon: { sects: { murong: -5 } },
      alt: { sects: { murong: -10, xiaoyao: 5 } }
    },
    /* 册253：二批 16 案写回（只动门派声望，不扩 cast 白名单） */
    we_siguoya: {
      canon: { sects: { huashan: 5 } },
      alt: { sects: { huashan: -5 } }
    },
    we_taishan: {
      canon: { sects: { songshan: 10, taishan: -3 } },
      alt: { sects: { taishan: 8, songshan: -5 } }
    },
    we_junshan: {
      canon: { sects: { gaibang: -10 } },
      alt: { sects: { gaibang: 10 } }
    },
    we_chongyang: {
      canon: { sects: { quanzhen: -10 } },
      alt: { sects: { quanzhen: 10, gumu: 5 } }
    },
    we_tiezhang: {
      canon: { sects: { tiezhang: 10 } },
      alt: { sects: { tiezhang: -10, gaibang: 5 } }
    },
    we_jueding: {
      canon: { sects: { taohua: 5 } },
      alt: { sects: { taohua: -5, quanzhen: 5 } }
    },
    we_lingjiu: {
      canon: { sects: { lingjiu: -5 } },
      alt: { sects: { lingjiu: 10, xiaoyao: 5 } }
    },
    we_taixuan: {
      canon: { sects: { xiake: 5 } },
      alt: { sects: { xiake: 10 } }
    },
    we_xueshan: {
      canon: { sects: { xueshan: -10 } },
      alt: { sects: { xueshan: 10 } }
    },
    we_xuedao: {
      canon: { sects: { xuedao: 10, xueshan: -5 } },
      alt: { sects: { xuedao: -10, xueshan: 5 } }
    },
    we_wudu: {
      canon: { sects: { xingxiu: 5 } },
      alt: { sects: { xingxiu: -10, dali: 5 } }
    },
    we_wenjia: {
      canon: { sects: { honghuahui: -5 } },
      alt: { sects: { honghuahui: 5 } }
    },
    we_siguofengbo: {
      canon: { sects: { huashan: -5 } },
      alt: { sects: { huashan: 5 } }
    },
    we_dalun: {
      canon: { sects: { shaolin: -10 } },
      alt: { sects: { shaolin: 5, xueshan: 5 } }
    },
    we_binghuo: {
      canon: { sects: { shaolin: -3 } },
      alt: { sects: { shaolin: 3 } }
    },
    we_shenlong: {
      canon: { sects: { shenlong: 10 } },
      alt: { sects: { shenlong: -10, tiandihui: 5 } }
    }
  };
  var FAIL = {
    we_huashan: { injury: [4, 6], renown: [20, 20] },
    we_xiangyang: { injury: [3, 5], renown: [-20, -10] },
    we_weijiao_gm: { injury: [2, 5], renown: [-30, -15] },
    we_juxian: { injury: [3, 6], renown: [-30, -20] },
    we_yanmen: { injury: [4, 6], renown: [-20, -10] },
    we_zhenlong: { injury: [4, 4], renown: [-10, -5] },
    we_tushi: { injury: [2, 5], renown: [-30, -20] },
    we_heimu: { injury: [5, 7], renown: [-40, -30] },
    /* 册238：其余 12 案补齐（全 20 案 lead 档都有逐案代价） */
    we_shaoshishan: { injury: [4, 6], renown: [-30, -20] },
    we_wuyue_bingpai: { injury: [3, 5], renown: [-25, -15] },
    we_xiake: { injury: [3, 5], renown: [-20, -10] },
    we_shagui: { injury: [2, 4], renown: [-20, -10] },
    we_wangpan: { injury: [3, 5], renown: [-25, -15] },
    we_jueqinggu: { injury: [3, 4], renown: [-15, -5] },
    we_liuheta: { injury: [3, 5], renown: [-30, -20] },
    we_chuangwang: { injury: [2, 5], renown: [-20, -10] },
    we_liancheng: { injury: [2, 5], renown: [-20, -10] },
    we_jiaozhu: { injury: [3, 6], renown: [-30, -20] },
    we_cangjing: { injury: [3, 5], renown: [-25, -15] },
    we_huanshi: { injury: [2, 4], renown: [-20, -10] },
    /* 册253：二批 16 案 lead 代价 */
    we_siguoya: { injury: [3, 5], renown: [-25, -15] },
    we_taishan: { injury: [3, 5], renown: [-25, -15] },
    we_junshan: { injury: [2, 5], renown: [-20, -10] },
    we_chongyang: { injury: [4, 6], renown: [-30, -20] },
    we_tiezhang: { injury: [3, 6], renown: [-30, -20] },
    we_jueding: { injury: [3, 5], renown: [-25, -15] },
    we_lingjiu: { injury: [3, 6], renown: [-30, -20] },
    we_taixuan: { injury: [3, 6], renown: [-30, -20] },
    we_xueshan: { injury: [3, 5], renown: [-25, -15] },
    we_xuedao: { injury: [4, 6], renown: [-30, -20] },
    we_wudu: { injury: [2, 5], renown: [-20, -10] },
    we_wenjia: { injury: [2, 5], renown: [-20, -10] },
    we_siguofengbo: { injury: [2, 4], renown: [-20, -10] },
    we_dalun: { injury: [4, 6], renown: [-30, -20] },
    we_binghuo: { injury: [4, 7], renown: [-40, -25] },
    we_shenlong: { injury: [3, 6], renown: [-30, -20] }
  };
    var EV_TURN_MAP = {
      we_huashan: 35, we_xiangyang: 34, we_weijiao_gm: 10, we_juxian: 6, we_shaoshishan: 7,
      we_zhenlong: 9, we_yanmen: 8, we_tushi: 11, we_wuyue_bingpai: 12, we_heimu: 13,
      we_xiake: 14, we_shagui: 15, we_wangpan: 3, we_jueqinggu: 16, we_liuheta: 17,
      we_chuangwang: 18, we_liancheng: 4, we_jiaozhu: 19, we_cangjing: 20, we_huanshi: 21,
      we_siguoya: 22, we_taishan: 23, we_junshan: 5, we_chongyang: 24, we_tiezhang: 25,
      we_jueding: 26, we_lingjiu: 27, we_taixuan: 28, we_xueshan: 26, we_xuedao: 29,
      we_wudu: 29, we_wenjia: 30, we_siguofengbo: 25, we_dalun: 31, we_binghuo: 33,
      we_shenlong: 30
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WORLD_EVENTS: WORLD_EVENTS, WB_STATE: WB_STATE, WRITEBACK: WRITEBACK, FAIL: FAIL, EV_TURN_MAP: EV_TURN_MAP };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { WORLD_EVENTS, WB_STATE, WRITEBACK, FAIL, EV_TURN_MAP });
}
