/* assets/worlds/xiuxian/lexicon.js — 修仙世界词表分卷（注册进 SQ.LEX.xiuxian）
 * 词表纪律（工程规范 §1.2）：本文件是 CJK 白名单；index.js 等逻辑文件禁止裸中文。
 * 天赋词条名（lexicon/talents.js）、功法名（lexicon-arts.js）、事件名（lexicon/events.js）
 * 由各自分卷注册；本卷承载世界命名层（境界/秘境/品阶/阵营/善恶/渡劫/属性/商店）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.lexRegister('xiuxian', {
    /* ── 资源与境界 ── */
    'resource.primary': '修为',
    'resource.currency': '灵石',
    'resource.power': '战力',
    'realm.system': '境界',
    'realm.0': '练气', 'realm.1': '筑基', 'realm.2': '金丹', 'realm.3': '元婴',
    'realm.4': '化神', 'realm.5': '炼虚', 'realm.6': '合体', 'realm.7': '大乘',
    'realm.8': '渡劫', 'realm.9': '真仙',
    /* 境界说明浮层（修行页）：十阶一览 + 当前高亮 */
    'realm.info.link': '境界说明', 'realm.info.title': '境界一览',
    'realm.info.intro': '自练气始，历九劫而证真仙。',
    'realm.info.cur': '当前 · {realm}',
    'realm.info.state.cur': '当前', 'realm.info.state.passed': '已过', 'realm.info.state.locked': '未至',
    'realm.info.origin': '初始境界',
    'realm.info.base': '修炼 {n}/秒', 'realm.info.power': '基础战力 {n}',
    'realm.info.need': '突破需 {n} {res}', 'realm.info.trib': '渡劫基础成算 {p}%',
    'idle.action': '打坐',
    'idle.rate': '产出 {n}/秒',
    'idle.next': '下一境界：{realm}（还需 {n} {res}）',
    'idle.maxed': '已臻化境',
    'idle.detail': '含加成明细',
    'idle.base': '境界基础', 'idle.talent': '天赋', 'idle.arts': '功法',
    'idle.gear': '装备', 'idle.buff': '状态加成', 'idle.align': '阵营倍率',

    /* ── 修行状态（模式）：闭关修炼（v2.2 曾名「潜心问道」）/ 外出历练；离线回归 = 潜心悟道 ── */
    'idle.mode.title': '修行状态',
    'idle.mode.seclude': '闭关修炼',
    'idle.mode.seclude.desc': '修为增速 +30%，不产灵石；悟法加倍，奇遇减半，不出装备。',
    'idle.mode.venture': '外出历练',
    'idle.mode.venture.desc': '前往秘境历练：修为放缓，灵石与掉落全开；奇遇加倍，悟法放缓。',
    'idle.mode.seclude.at': '正在洞府潜心静修',
    'idle.mode.venture.at': '正在「{zone}」历练',
    'idle.mode.venture.warn': '战力不足「{zone}」，历练举步维艰——建议先闭关破境',
    'mode.log.seclude': '潜心静修，谢客不出——修为全速，不问外物',
    'mode.log.venture': '整装出行，前往秘境历练——灵石与机缘，皆在险中求',

    /* ── 世界卡 ── */
    'world.xiuxian.name': '玄幻修仙',
    'world.tag.qi': '修为', 'world.tag.zone': '秘境', 'world.tag.trib': '渡劫',

    /* ── 菜单描述（词族契约 tab. 族：由世界分卷拥有——换世界即换菜单名）── */
    'tab.idle': '修行', 'tab.event': '奇遇',

    /* ── G3 秘境 ── */
    'combat.system': '秘境洞天',
    'combat.zone.0': '青云试炼地', 'combat.zone.1': '黑风寨', 'combat.zone.2': '万兽谷',
    'combat.zone.3': '焦土遗迹', 'combat.zone.4': '雷池禁地', 'combat.zone.5': '乱星秘窟',
    'combat.zone.6': '修罗战场', 'combat.zone.7': '天渊龙墟', 'combat.zone.8': '混沌雷海',
    'combat.zone.9': '界外古道',
    /* 区域词缀（数值详设 §2.5 · 系统深化批 A4）：8 条正典名与效果描述（数据表 ZONE_AFFIXES 同源） */
    'affix.lingchao.name': '灵潮', 'affix.lingchao.desc': '灵气如潮涌——击杀灵石 +25%',
    'affix.woye.name': '沃野', 'affix.woye.desc': '妖物肥硕——击杀掉落 +15%',
    'affix.guchen.name': '古尘', 'affix.guchen.desc': '古尘蒙宝——品阶幸运 +0.15，出手 -10%',
    'affix.kuanglan.name': '狂澜', 'affix.kuanglan.desc': '狂澜催战——出手 +20%，瓶颈间隔惩罚 +1',
    'affix.xiongli.name': '凶戾', 'affix.xiongli.desc': '凶戾之气——瓶颈线 +15%，掉落 +30%',
    'affix.xueyue.name': '血月', 'affix.xueyue.desc': '血月当空——瓶颈线 +25%，灵石 +50%',
    'affix.miwu.name': '迷雾', 'affix.miwu.desc': '迷雾障目——掉落 -15%，但品阶幸运 +0.20',
    'affix.pinji.name': '贫瘠', 'affix.pinji.desc': '灵机贫瘠——灵石 -30%，掉落 +10% 为补',
    'combat.bottleneck': '修为不足，举步维艰',
    'combat.bottleneck.hint': '建议：更换装备 / 升级功法 / 先行渡劫',
    'combat.tag': '历练',

    /* ── G4 法器（装备）── */
    'gear.system': '法器',
    'gear.slot.weapon': '兵刃', 'gear.slot.treasure': '灵器',
    'gear.slot.armor': '甲衣', 'gear.slot.accessory': '佩饰',
    'gear.tier.0': '凡品', 'gear.tier.1': '良品', 'gear.tier.2': '上品',
    'gear.tier.3': '灵品', 'gear.tier.4': '仙品',
    'gear.special.ignore_req': '无视佩戴要求', 'gear.special.sword_heart': '剑魄',
    'gear.special.spirit_rune': '聚灵纹', 'gear.special.adamantine': '金刚质',
    'gear.special.swift_shadow': '疾影', 'gear.special.merchant_wit': '商慧',
    'gear.special.karma_mirror': '照业镜', 'gear.special.dao_oath': '道侣之约',
    'gear.special.thunder_mark': '雷纹', 'gear.special.devour': '噬灵',
    'gear.special.world_mirror': '照世',
    'gear.ex.evil_sword': '诛邪剑残', 'gear.ex.world_mirror': '照世镜',
    'gear.tag': '拾得',

    /* ── G5 功法 ── */
    'skill.system': '功法',
    'skill.nurture.jing': '滋养精', 'skill.nurture.qi': '滋养气', 'skill.nurture.shen': '滋养神',

    /* ── G6 坊市 ── */
    'shop.system': '坊市',
    'shop.blackmarket': '黑市',
    'pill.juqi.name': '聚气丹', 'pill.juqi.desc': '修为 +30%',
    'pill.ningshen.name': '凝神丹', 'pill.ningshen.desc': '修为产出 +25%，2 小时',
    'pill.cuiti.name': '淬体丹', 'pill.cuiti.desc': '战力 +20%，4 小时',
    'pill.pozhang.name': '破障丹', 'pill.pozhang.desc': '下次渡劫成功率 +5%',
    /* 货架卡片「分类」chip（坊市标签批 2026-10-09 · UI 卷 §3.4）：只补**没有现成系统名键**的两类，
     * 法器 / 功法 / 法宝 / 炼丹炼器 一律复用 `gear.system` / `skill.system` / `treasure.system` / `alchemy.system`，
     * 不新造重复词（同仓教训：一个概念两处词 = 两处漂移）。 */
    'shop.cat.pill': '丹药', 'shop.cat.pack': '耗材',
    'shop.pack.name': '灵石包', 'shop.pack.desc': '耗修为（上限 10%），得灵石 60×(1+境界)³',

    /* ── G7 奇遇 ── */
    'event.system': '奇遇',
    'event.tag': '奇遇',
    'event.karma.pos': '道心 +{n}',
    'event.karma.neg': '道心蒙尘 {n}',

    /* ── 渡劫 ── */
    'tribulation.system': '渡劫',
    'tribulation.tag': '渡劫',
    'tribulation.start': '天劫将至！',
    'tribulation.success': '渡劫成功，晋升{realm}',
    'tribulation.fail': '天雷落下，渡劫失败，修为 -{p}%',
    /* 渡劫奖惩阶梯（数值详设 §8.3 · 系统深化批 A3）：三档失败日志 + 破境高光四件套 */
    'tribulation.streak1': '雷劫道伤入体——修为产出 -15%（12 小时）',
    'tribulation.streak2': '心魔滋生（{n} 层）——下次渡劫成功率 -{n}%',
    'tribulation.streak3': '修为封固——雷伤郁结，修为产出 -25%（24 小时）',
    'tribulation.pojing': '破境高光！修为产出 +50%（{m} 分钟）',
    'tribulation.winstones': '天道馈赏：灵石 +{n}',
    'tribulation.wulou': '无漏道基——一击即中，天道无从挑剔（业力 +{n}）',
    'tribulation.fate': '天道垂青：{name}',
    'tribulation.xinmo': '心魔 {n} 层（成功率 {v}）',
    'tribulation.xinmo.row': '心魔（连败 {n} 层未消）',
    'tribulation.reset': '境界重置，功法重修',
    'tribulation.estimate': '渡劫成功率预估 {p}%',
    'tribulation.detail': '明细',
    'tribulation.base': '境界基础', 'tribulation.resist': '法器抗性',
    'tribulation.power': '战力富余', 'tribulation.talent': '天赋/功法',
    'tribulation.karma': '善恶', 'tribulation.next': '一次性修正',
    'tribulation.alignFlat': '正道光环', 'tribulation.guardian': '护法加持 · 虚位以待',

    /* ── 善恶 karma ── */
    'karma.system': '善恶',
    'karma.tier.right': '正道光环', 'karma.tier.neutral': '左道', 'karma.tier.evil': '魔道气息',
    'karma.part.arts': '功法', 'karma.part.gear': '装备', 'karma.part.events': '平生所为',
    'karma.part.drift': '初心倾向',
    'karma.extreme': '道之极处',
    'karma.rateHint.right': '善行庇身：渡劫与判定皆安',
    'karma.rateHint.neutral': '随心不逾：万事持平',
    'karma.rateHint.evil': '杀名深重：福薄而劫烈',
    /* karma 浮层 · 当前档位效果摘要六行（ALIGN_EFFECTS，F5；护法行批 3 解锁） */
    'karma.effects.title': '当前档位效果',
    'karma.eff.qiRate': '修炼速度', 'karma.eff.combatPower': '斗法战力',
    'karma.eff.eventRate': '奇遇时钟', 'karma.eff.dropRate': '装备掉落',
    'karma.eff.checkDc': '判定难度', 'karma.eff.trib': '渡劫成功率',
    'karma.eff.tierUp': '品阶上浮', 'karma.eff.guardian': '护法加持 · 虚位以待',
    'align.right': '正道', 'align.evil': '魔道', 'align.neutral': '左道',
    /* ── 善恶名号九段（善恶名号批）：正四段 → 左道 → 魔四段，随 karma 实时取（顶栏徽章 / 浮层天梯共用）── */
    'karma.rank.haoran': '浩然道尊', 'karma.rank.zhengdao_kui': '正道魁首',
    'karma.rank.qingming': '清名侠士', 'karma.rank.chizheng': '持正之士',
    'karma.rank.zuodao': '左道散人',
    'karma.rank.rumo': '入魔之徒', 'karma.rank.xiexiu': '凶名邪修',
    'karma.rank.modao_jv': '魔道巨擘', 'karma.rank.jidao': '极道魔尊',
    /* 名号更迭：日志（独立分类 karma，起讫双名号）· 全屏演出（小标 / 大名 / 尾注） */
    'karma.rank.log': '道心流转，名号自「{from}」更易为「{to}」',
    'karma.rank.show.t1': '名号更迭',
    'karma.rank.show.t3': '道心所至，名号自随',
    /* 浮层天梯分节标题 */
    'karma.rank.ladder': '名号九段',

    /* ── G13 洞天福地（地柱 · 四柱卷 §四 灵气叙事正典照录）── */
    'cave.system': '洞府',
    'cave.market_yard.name': '市井别院',
    'cave.market_yard.desc': '坊市后巷的独立小院，灵气薄得可怜，胜在推门就是人间烟火、竖耳就是满城消息。散修十个里有九个，是在这样的院子里攒出第一缕道基的。',
    'cave.market_yard.signature': '无签名 · 人间烟火气',
    'cave.green_peak.name': '青峰灵穴',
    'cave.green_peak.desc': '半山腰的灵穴，碗口大的泉眼沁出丝丝灵气，夜半听得到泉声入梦。在这里修行像温水泡茶——慢，但泡得开。',
    'cave.green_peak.signature': '灵泉眼',
    'cave.sword_cliff.name': '剑崖禅房',
    'cave.sword_cliff.desc': '上古剑修面壁处的崖顶禅房，石壁剑痕百年风雨不磨。入夜剑鸣如潮，梦里有人与你喂剑——赢了是修行，输了也是。',
    'cave.sword_cliff.signature': '剑气淬体',
    'cave.thunder_pool.name': '雷池精庐',
    'cave.thunder_pool.desc': '雷池余脉正好从精庐地底穿过，青砖缝里透着隐隐雷音。住在这里如同枕着劫云入睡，天雷之气日夜入体，炼体，也炼胆。',
    'cave.thunder_pool.signature': '雷蕴',
    'cave.star_fall.name': '星陨福地',
    'cave.star_fall.desc': '昔年流星坠出的谷地，星髓余韵百年不散，夜里谷中星光比天上还亮。在这里连打坐都省了——睡一觉，也算修了一夜。',
    'cave.star_fall.signature': '星髓滋养',
    'cave.immortal_abode.name': '古仙人府',
    'cave.immortal_abode.desc': '不知哪位仙人飞升前的旧府，门没有锁，案上浮尘千年不落。墙上道痕犹湿——看它是笔画，悟它是惊雷。读懂一分，便受用一分；读不懂，满府寂然。',
    'cave.immortal_abode.signature': '道韵余音',
    'log.cave.enter': '迁入「{name}」，修为 ×{mult}',
    'log.cave.enter.resonate': '迁入「{name}」，修为 ×{mult}，洞府共鸣 +{p}%',
    /* ── 福地扩池批 v2.0：同阶别院 4 + 隐世福地 3（福地池卷 §二/§三 灵气叙事正典照录）── */
    'cave.bamboo_hut.name': '竹海庐',
    'cave.bamboo_hut.desc': '万竿修竹围出的三间草庐，风过时竹叶相击，声声都合着吐纳的节拍。山中无历日，听竹便知秋——功法在这里练一遍，抵得旁处悟三遍。',
    'cave.bamboo_hut.signature': '竹韵养道',
    'cave.danxia_cave.name': '丹霞洞天',
    'cave.danxia_cave.desc': '赤岩深处的天然洞府，石壁终年温热，如大地吐纳。人在洞中打坐，地脉替你行功——离开多久，它都替你温着这一炉火。',
    'cave.danxia_cave.signature': '地脉温养',
    'cave.stillwater_hut.name': '止水精舍',
    'cave.stillwater_hut.desc': '一泓不起波澜的深潭边筑起的精舍，潭水澄澈能照见须发。对着它枯坐，杂念自沉——功法里的晦涩句读，往往就在某次照水的恍惚里忽然懂了。',
    'cave.stillwater_hut.signature': '心镜止悟',
    'cave.fallen_star_court.name': '陨星剑冢',
    'cave.fallen_star_court.desc': '星陨谷边缘的剑冢，历代剑修把断剑葬在这里，冢上剑气经年不散。入驻者每夜都被剑气叩门——不是恶意，是千万柄无主之剑在找人续完最后一式。',
    'cave.fallen_star_court.signature': '残剑淬锋',
    'cave.mirror_lake.name': '水镜山庄',
    'cave.mirror_lake.desc': '藏在镜湖湖心岛上的山庄，湖面平得像一面磨好的铜镜，照得出云，也照得出心魔。山庄历代只收一种客人：在江湖里熬出了名分的人。',
    'cave.mirror_lake.signature': '镜湖澄心',
    'cave.sword_mound.name': '剑冢守庐',
    'cave.sword_mound.desc': '剑冢最深处的一间守庐，冢里万剑夜夜低鸣，唯独绕开这一间屋子。住进来的人会被剑冢认作守陵人——万剑既然受过你的香火，也就认了你这份战力。',
    'cave.sword_mound.signature': '冢灵护持',
    'cave.cloud_herd.name': '云隐仙庐',
    'cave.cloud_herd.desc': '浮在云海之上的半座仙庐，无梯可登，无路可寻——势力把你的名分奏到天上，云就自己让开一条路。庐中岁月比山下慢，睡一觉，人间已过了好几天。',
    'cave.cloud_herd.signature': '云髓沁骨',
    /* 别院/隐世角标与 obtain 门控缺项 */
    'cave.tag.branch': '别院',
    'cave.tag.hidden': '隐世',
    'cave.lack.obtain': '缘法未至',
    'cave.obtain.factionRank': '任一势力职级达「{name}」',
    'cave.obtain.codex': '奇遇图鉴录满 {n} 格',
    'log.cave.grant': '「{name}」的大门向你敞开——隐世福地认下了你的修行',
    /* ── 附属设施养成（福地池卷 §四）── */
    'cave.fac.title': '附属设施',
    'cave.fac.hint': '只可在当前驻留的福地上营建；产业永存，唯驻留处生效。',
    'cave.fac.lv': '{n} 级',
    'cave.fac.build': '营建 · {n} 灵石',
    'cave.fac.upgrade': '扩建 · {n} 灵石',
    'cave.fac.max': '已至满级',
    'cave.fac.active': '生效中',
    'cave.fac.idle': '未驻留 · 不生效 · 不可营建',
    'cave.fac.onlycur': '仅驻留中可营建',
    'cave.fac.lack.owned': '须先拥有此处福地',
    'cave.fac.lack.stones': '灵石不足',
    'cave.fac.lingtian.name': '灵田',
    'cave.fac.lingtian.desc': '引灵泉灌圃，种的是灵米灵蔬——收成换灵石，日积月累是一笔稳当进项。',
    'cave.fac.lingtian.mat': '每 6 游戏月入账 1~4 枚本区材料',
    'cave.fac.danfang.name': '丹房',
    'cave.fac.danfang.desc': '炉火不熄的丹房，药香浸进了墙里。在此参悟功法，火候总比旁处足三分。',
    'cave.fac.shuge.name': '藏书阁',
    'cave.fac.shuge.desc': '收藏着历代主人的手札与残卷，翻得越多，越知道江湖上该往哪里看、该听谁的话。',
    'cave.fac.julingzhen.name': '聚灵阵',
    'cave.fac.julingzhen.desc': '以福地灵脉为底布下的聚灵大阵，人在阵中修行，离了阵它也在替你收着灵气。',
    'log.cave.fac.built': '「{cave}」的{fac}营成（{lv} 级）',

    /* ── G12 属性 ── */
    'attr.jing': '精', 'attr.qi': '气', 'attr.shen': '神',
    'attr.desc.jing': '肉身体魄 · 斗战判定',
    'attr.desc.qi': '真元储量 · 修行判定',
    'attr.desc.shen': '神魂道心 · 心志判定',

    /* ── 天赋字段标签（覆盖 common 通用名）── */
    'talent.field.qiRate': '修为产出', 'talent.field.qiCap': '修为上限',
    'talent.field.offlineEff': '离线收益', 'talent.field.stonesRate': '灵石获取',
    'talent.field.combatSpeed': '斗法速度', 'talent.field.combatPower': '战力',
    'talent.field.dropRate': '装备掉落', 'talent.field.gearLuck': '装备品阶',
    'talent.field.artsSpeed': '功法修炼', 'talent.field.shopCost': '坊市价格',
    'talent.field.eventRate': '奇遇频率', 'talent.field.eventLuck': '奇遇运势',
    'talent.field.realmCost': '突破需求', 'talent.field.tribBonus': '渡劫成功率',
    'talent.field.tribFailLossMod': '渡劫失败损失',
    'talent.field.killStones': '击杀灵石'
  });

  /* 随机道名池（屏 1「掷杯问名」）+ 法宝命名池（世界设定 §5.1） */
  SQ.NAMES = SQ.NAMES || {};
  SQ.NAMES.xiuxian = {
    surname: ['叶', '林', '苏', '顾', '楚', '沈', '白', '秦', '洛', '萧'],
    given: ['长风', '清羽', '无涯', '听雪', '望舒', '惊鸿', '暮云', '归尘', '扶摇', '问天'],
    gear: {
      materials: ['玄铁', '寒铜', '青冥', '紫霄', '星辰', '流光', '墨玉', '赤阳', '幽银', '龙虎'],
      forms: { weapon: '剑', treasure: '珠', armor: '甲', accessory: '佩' }
    }
  };
})();
