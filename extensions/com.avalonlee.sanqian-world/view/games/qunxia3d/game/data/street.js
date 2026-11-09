/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-street.cjs 生成，重跑覆盖
 * P4-A 市井层七表（**STREET_JOBS.art 头像占位化：用户拍板，base64 data URI 由生成器替换为空串**；正典 URI 在 game.html 源）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L11162–L11171 · const STREET_ZONE_BLUR
 * view/games/qunxia/game.html L11172–L11172 · const STREET_INTEL_LABEL
 * view/games/qunxia/game.html L11173–L11173 · const STREET_SURNAMES
 * view/games/qunxia/game.html L11174–L11181 · const STREET_GIVEN
 * view/games/qunxia/game.html L11184–L11192 · const STREET_SCENE_RULES
 * view/games/qunxia/game.html L11194–L11198 · const STREET_TILE_BIND
 * view/games/qunxia/game.html L11200–L11293 · const STREET_JOBS
 * ============================================================ */

    const STREET_ZONE_BLUR = {
      zhongyuan: '中原腹地',
      jingxiang: '荆襄一带',
      jiangnan: '江南水乡',
      bashu: '巴蜀山中',
      dianqian: '滇黔南路',
      yanzhao: '燕赵北地',
      xiyu: '西域大漠',
      haiwai: '关外绝海'
    };
    const STREET_INTEL_LABEL = ['粗听', '略熟', '较准', '耳目'];
    const STREET_SURNAMES = ['周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金'];
    const STREET_GIVEN = {
      waiter: ['小二', '阿福', '来福', '顺子', '柱儿', '阿茶', '满仓', '小满'],
      escort: ['铁柱', '大彪', '平川', '守成', '长风', '阿保', '走川', '稳当'],
      apothecary: ['杏儿', '半夏', '阿苓', '青禾', '小满', '甘草', '冬青', '细辛'],
      bookseller: ['墨白', '卷舒', '青简', '怀素', '子文', '阿册', '临池', '拾页'],
      officer: ['阿六', '青衣', '守正', '怀安', '伯衡', '延清', '子安', '平章'],
      beggar: ['阿烂', '破碗', '老瘸', '小秃', '灰袍', '讨米', '竹筒', '寒枝']
    };
    const STREET_SCENE_RULES = [
      { jobId: 'escort', re: /镖局|总镖|镖旗/ },
      { jobId: 'apothecary', re: /药局|药铺|药庐|药房|药室|丹房|丹药|药圃|药泉|炼丹/ },
      { jobId: 'bookseller', re: /书肆|书坊|书铺|书林|珍宝阁|锦绣坊|琴剑铺|奇珍阁/ },
      { jobId: 'officer', re: /衙署|衙门|府衙|捕房|官署/ },
      { jobId: 'waiter', type: 'tavern' },
      { jobId: 'beggar', type: 'entry' },
      { jobId: 'beggar', re: /暗巷|城门/ }
    ];
    const STREET_TILE_BIND = {
      ly_4: 'officer',
      dl_2: 'officer',
      ym_3: 'officer'
    };
    const STREET_JOBS = [
      {
        id: 'waiter',
        title: '跑堂',
        art: '',
        canInquire: true,
        sentences: [
          (n) => `${n.name}把抹布搭在肩上，朝你点了点头。`,
          (n) => `「${n.tileName}的酒今日还热。外头的事，我只敢说个大概。」`,
          () => '他看了眼门外：有的消息准，有的过了旬，也有两边对不上的。'
        ],
        actions: [
          { id: 'inquire', label: '打听', primary: true, hint: '远方只给一句模糊风声' },
          { id: 'tip', label: '打赏听闲话', hint: '3 文 · 只谈这条街', needGold: 3 },
          { id: 'soup', label: '讨碗热汤', hint: '2 文 · 略回气血', needGold: 2 }
        ]
      },
      {
        id: 'escort',
        title: '镖师',
        art: '',
        sentences: [
          (n) => `${n.name}拍了拍镖旗上的灰，手里并没有拔刀。`,
          () => '「护送拼的是脚程和信用，不看你拳脚高不高。」',
          () => '他指了指车辕：走一程有一程脚钱，路上的麻烦也先把话讲完。'
        ],
        actions: [
          { id: 'escort', label: '护送一程', primary: true, hint: '不看战力 · 耗 1 行脚', needAp: 1 },
          { id: 'escort_road', label: '问问镖路', hint: '只谈本城脚程' },
          { id: 'escort_pass', label: '买一角路引', hint: '5 文', needGold: 5 }
        ]
      },
      {
        id: 'apothecary',
        title: '药徒',
        art: '',
        sentences: [
          (n) => `${n.name}袖口沾着药粉，先看了看你的气色。`,
          () => '「医伤靠药和手，不靠你打得过谁。」',
          (n) => `药香从${n.tileName}里漫出来，他已经把金创药按在柜上。`
        ],
        actions: [
          { id: 'heal', label: '医伤', primary: true, hint: '不看战力 · 8 文', needGold: 8 },
          { id: 'herb_lore', label: '请教药性', hint: '听一耳朵本草' },
          { id: 'salve', label: '买包金创', hint: '6 文 · 略止血', needGold: 6 }
        ]
      },
      {
        id: 'bookseller',
        title: '书商',
        art: '',
        sentences: [
          (n) => `${n.name}用指节压平一页潮了的书角。`,
          (n) => `「${n.tileName}的书能翻，外头的路我可不敢指给你。」`,
          () => '他只卖纸上的影子，不卖谁此刻站在哪座城里。'
        ],
        actions: [
          { id: 'read_page', label: '翻看残页', primary: true, hint: '长一点见识' },
          { id: 'book_talk', label: '问问书路', hint: '只谈手头这本' },
          { id: 'buy_chap', label: '买本杂抄', hint: '8 文', needGold: 8 }
        ]
      },
      {
        id: 'officer',
        title: '官差',
        art: '',
        sentences: [
          (n) => `${n.name}把腰牌在你眼前一晃，又收回袖中。`,
          (n) => `「${n.tileName}这处就是临时值房。公文只写本城，不钉外城坐标。」`,
          () => '他说话很扁：远方的人在哪，榜上没有，嘴里也不给。'
        ],
        actions: [
          { id: 'report', label: '呈报街情', primary: true, hint: '本城见闻换一点赏' },
          { id: 'check_pass', label: '核对路引', hint: '不交手，只看你的名' },
          { id: 'ask_wall', label: '问问城防', hint: '只谈这座城' }
        ]
      },
      {
        id: 'beggar',
        title: '乞丐',
        art: '',
        canInquire: true,
        sentences: [
          (n) => `${n.name}摇了摇空竹筒，笑得没剩几颗牙。`,
          () => '「城门和暗巷的风，我都听见过。准不准，你自己掂量。」',
          () => '他不指地图。要传信，他也只说送到了该到的地方。'
        ],
        actions: [
          { id: 'inquire', label: '打听', primary: true, hint: '远方只给一句模糊风声' },
          { id: 'letter', label: '托他传信', primary: false, hint: '不看战力 · 耗 1 行脚', needAp: 1, gap: 2 },
          { id: 'alms', label: '施舍一文', hint: '2 文 · 他记得你', needGold: 2 }
        ]
      }
    ];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STREET_ZONE_BLUR: STREET_ZONE_BLUR, STREET_INTEL_LABEL: STREET_INTEL_LABEL, STREET_SURNAMES: STREET_SURNAMES, STREET_GIVEN: STREET_GIVEN, STREET_SCENE_RULES: STREET_SCENE_RULES, STREET_TILE_BIND: STREET_TILE_BIND, STREET_JOBS: STREET_JOBS };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { STREET_ZONE_BLUR, STREET_INTEL_LABEL, STREET_SURNAMES, STREET_GIVEN, STREET_SCENE_RULES, STREET_TILE_BIND, STREET_JOBS });
}
