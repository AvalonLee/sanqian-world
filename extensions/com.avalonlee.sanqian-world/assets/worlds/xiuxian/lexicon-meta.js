/* xiuxian/lexicon-meta.js — 轮回转世（legacy.*）+ 成就图鉴与人生传记（codex.*）词表分卷
 * （CJK 白名单文件 · 轮回卷 v1.0 §十一 / 图鉴卷 v1.0 §九）
 * ⚠️ 勿混注记：遗泽点文案统一「遗泽」（meta.karma），严禁与善恶值「业力」（ws.karma）混写（轮回卷 §2.1）。
 * 成就三键压缩口径（图鉴卷 §9.1 备档）：.toast 复用通用模板 + .name，不落 60 条独立 toast。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var K = {};

  /* ══════════ legacy.* 轮回转世 ══════════ */
  K['legacy.system'] = '轮回';
  K['idle.legacy'] = '遗泽';
  K['idle.codex'] = '图鉴';
  K['legacy.ui.balance'] = '遗泽 {n}';
  K['legacy.ui.shop'] = '遗泽商店';
  K['legacy.ui.shop.hint'] = '全部为永久资格，跨世生效；价目总表 6800 遗泽。';
  K['legacy.ui.owned'] = '已请回';
  K['legacy.ui.buy'] = '请回';
  K['legacy.ui.poor'] = '遗泽不足';
  K['legacy.ui.confirmBuy'] = '确认花费 {n} 遗泽请回「{name}」？永久资格，跨世生效，不退款。';
  K['legacy.ui.feisheng'] = '飞升';
  K['legacy.ui.feisheng.btn'] = '挑战 · 飞升大劫';
  K['legacy.ui.feisheng.confirm'] = '独立终局劫：渡过＝满额遗泽转世＋飞升成就分；败＝不扣修为不计连败，24 时辰后可再试。';
  K['legacy.ui.feisheng.lock.realm'] = '真仙盈满方可叩天门';
  K['legacy.ui.feisheng.lock.qi'] = '修为未盈满';
  /* N13 姊妹面（任务清单原记 dup/info/poor/unknown 四因无键）：dup/poor 走既有的
   * `legacy.ui.owned` / `legacy.ui.poor`；`info` = 预览取不到（legacy.js:500）此前裸英文上屏；
   * `buy.fail` = 购买支的静默无提示；`fail.other` = legacyReasonText 的兜底，
   * 保证**任何新 reason 都不再把内部字段名打到屏上**。 */
  K['legacy.ui.feisheng.lock.info'] = '此世尚未具备叩门之格。';
  K['legacy.ui.fail.other'] = '此事暂不可行——条件未具。';
  K['legacy.ui.buy.fail'] = '遗泽未动：此资格不在名录或已失效。';
  K['legacy.ui.buy.swapfull'] = '本世洗髓之数已尽，这枚缘买了也无从安放。';
  K['legacy.ui.feisheng.cd'] = '天门暂闭（{t} 后可再叩）';
  K['legacy.ui.feisheng.p'] = '基础成算 {p}%（常规渡劫加成依然有效）';
  K['legacy.ui.gifts'] = '轮回赠礼（转世前择定，一世一次）';
  K['legacy.ui.bingjie'] = '兵解';
  K['legacy.ui.bingjie.btn'] = '兵解转世';
  K['legacy.ui.bingjie.confirm'] = '兵解＝主动终结本世：结算折分项 ×0.7（已入账的成就与里程碑遗泽不折损不追回）。明细如下，确认后不可回头。';
  /* 被动了结两通道（寿元批）：不是玩家点的「兵解转世」，日志与呈报都要各说各的因
     〔第卌八批勘正：折寿单列 ⇒ 现在是**三条**，三条各有一句，不许再借「寿尽」那句话糊过去〕 */
  K['legacy.ui.shoujin'] = '寿尽坐化';
  K['legacy.ui.daoshang'] = '道伤崩碎';
  K['legacy.ui.zhesou'] = '折寿而殒';
  K['legacy.ui.preview.title'] = '本世结算';
  K['legacy.ui.preview.subtotal'] = '折分小计';
  K['legacy.ui.preview.mult'] = '通道系数';
  K['legacy.ui.preview.total'] = '结算入账';
  K['legacy.ui.preview.imm'] = '本世已入遗泽';
  K['legacy.ui.preview.balance'] = '结算后余额';
  K['legacy.ui.preview.life'] = '第 {n} 世';
  K['legacy.ui.preview.realm'] = '最高境界';
  K['legacy.ui.preview.trib'] = '渡劫成 {w} 败 {l}';
  K['legacy.ui.preview.zones'] = '首通 {n} 区';
  K['legacy.ui.preview.bonds'] = '结缘 {n} 人';
  K['legacy.ui.settle.title'] = '一世终了';
  K['legacy.ui.settle.gain'] = '遗泽入账 +{n}';
  K['legacy.ui.bios'] = '前世书';
  K['legacy.ui.bios.empty'] = '尚无前世传记。';
  K['legacy.ui.bio.source.local'] = '本地史笔';
  K['legacy.ui.bio.source.tiandao'] = '天道亲笔';
  /* 第册批：`legacy.ui.bioAsk / bioPaste / bioAdopt / bioAdopted / bioFail` 五条随
   * 「烧表请天道作传」整族下线（见 codex.js 同批注）；两行 `bio.source.*` **留下**——
   * 老档确有 source:'tiandao' 的条目，抹掉来源标记等于改史。 */
  K['legacy.ui.recap.title'] = '盖棺之传';
  K['legacy.ui.recap.go'] = '入世';
  K['legacy.ui.startRealm.pick'] = '起步境界（跳档不跳渡劫）';
  K['legacy.ui.legacyTalent.pick'] = '转世天赋（≤2，逐世可换）';
  K['legacy.ui.bondHeir.pick'] = '跨世之缘 · 赎回道友 1 人';
  K['legacy.ui.none'] = '无';
  K['legacy.ui.stats'] = '跨世：{lives} 世 · 飞升 {asc} · 兵解 {dis} · 身死 {death} · 最高{realm}';
  /* 结算计分项名（§2.3 十一行） */
  K['legacy.score.realmMax'] = '最高境界档';
  K['legacy.score.ascend'] = '飞升';
  K['legacy.score.trib'] = '渡劫成功';
  K['legacy.score.zone'] = '秘境首通';
  K['legacy.score.boss'] = '域主击杀';
  K['legacy.score.treasure'] = '法宝收集';
  K['legacy.score.artmax'] = '功法满级';
  K['legacy.score.officeMax'] = '势力职位';
  K['legacy.score.rankMax'] = '同代榜位';
  K['legacy.score.title'] = '称号';
  K['legacy.score.owned'] = '前世已录';
  /* 日志 */
  K['legacy.log.buy'] = '遗泽请回「{name}」';
  K['legacy.log.rebirth'] = '{ch} · 第 {life} 世落幕，遗泽入账';
  K['legacy.log.feisheng.fail'] = '飞升大劫失败——天门闭合，24 时辰后可再叩';
  /* 遗泽账本 reason */
  K['legacy.reason.settle'] = '转世结算';
  K['legacy.reason.achv'] = '行为成就';
  K['legacy.reason.milestone'] = '图鉴里程碑';
  K['legacy.reason.buy'] = '遗泽商店';
  K['legacy.reason.fix'] = '账本修复';
  /* 商店商品名 + 描述 */
  K['legacy.shop.startRealm1'] = '起步 · 筑基';
  K['legacy.shop.startRealm2'] = '起步 · 金丹';
  K['legacy.shop.startRealm3'] = '起步 · 元婴';
  K['legacy.shopdesc.startRealm'] = '新周目创角可选该起步境界（跳档不跳渡劫）';
  K['legacy.shop.heir'] = '法宝真灵承继';
  K['legacy.shop.swap'] = '改命 · 洗髓缘';
  K['legacy.shopdesc.heir'] = '每世转世自动携一件已觉醒器灵的法宝入下世';
  K['legacy.shopdesc.swap'] = '立刻得一枚洗髓缘（与丹方 / 奇遇 / 破境共用本世三次之额，买断一次）';
  K['legacy.shop.unlock.alchemy'] = '丹房资格';
  K['legacy.shopdesc.unlock.alchemy'] = '解锁转世丹房路线（炼丹炼器）';
  K['legacy.shop.unlock.sect'] = '开宗资格';
  K['legacy.shopdesc.unlock.sect'] = '解锁自立门户（开宗立派）路线资格';
  K['legacy.shop.unlock.prodigySlot'] = '天骄位扩容';
  K['legacy.shopdesc.unlock.prodigySlot'] = '同代天骄名录扩至上限 30 名（页面只录前 10 位详情）';
  K['legacy.shop.unlock.nemesis'] = '跨世宿敌';
  K['legacy.shopdesc.unlock.nemesis'] = '前世宿敌转为永生追逐，资质 +0.2';
  K['legacy.shop.unlock.bond'] = '跨世之缘';
  K['legacy.shopdesc.unlock.bond'] = '每世创角可赎回前世道友 1 人（初始好感 40）';
  K['legacy.shop.qirate1'] = '遗泽 · 聚灵 一';
  K['legacy.shop.qirate2'] = '遗泽 · 聚灵 二';
  K['legacy.shop.qirate3'] = '遗泽 · 聚灵 三';
  K['legacy.shop.qirate4'] = '遗泽 · 聚灵 四';
  K['legacy.shop.qirate5'] = '遗泽 · 聚灵 五';
  K['legacy.shopdesc.qirate'] = '永久修为产出 +2%（五档合计上限 +10%）';
  /* 转世天赋 8 条（epic 档 · 名 + 描述） */
  K['legacy.talent.legacy_talent_canjian.name'] = '残卷重生';
  K['legacy.talent.legacy_talent_canjian.desc'] = '前世残卷犹温——修为产出 +8%';
  K['legacy.talent.legacy_talent_jiangu.name'] = '前世剑骨';
  K['legacy.talent.legacy_talent_jiangu.desc'] = '剑骨天成——战力 +6%，装备幸运 +4%';
  K['legacy.talent.legacy_talent_daotai.name'] = '先天道胎';
  K['legacy.talent.legacy_talent_daotai.desc'] = '道胎宿慧——突破消耗 −5%';
  K['legacy.talent.legacy_talent_shutu.name'] = '熟途';
  K['legacy.talent.legacy_talent_shutu.desc'] = '旧路重走——离线效率 +12%';
  K['legacy.talent.legacy_talent_cangzhen.name'] = '藏珍之体';
  K['legacy.talent.legacy_talent_cangzhen.desc'] = '体纳百宝——击杀掉落 +5%';
  K['legacy.talent.legacy_talent_dianshi.name'] = '点石手';
  K['legacy.talent.legacy_talent_dianshi.desc'] = '指石成金——灵石产出 +10%';
  K['legacy.talent.legacy_talent_mingjing.name'] = '道心通明';
  K['legacy.talent.legacy_talent_mingjing.desc'] = '心如明镜——判定 +4pp，属性增益放大 +8%';
  K['legacy.talent.legacy_talent_changhong.name'] = '气贯长虹';
  K['legacy.talent.legacy_talent_changhong.desc'] = '虹贯瓶颈——瓶颈战力 +6%，御风间隔 ×0.94';
  K['tiandao.chron.ascendfail'] = '是日叩天门而返，霞光敛去。';

  /* ══════════ codex.* 成就图鉴与人生传记 ══════════ */
  K['codex.system'] = '图鉴';
  K['codex.ui.collected'] = '已录 {n}/{total}';
  /* 图鉴九面卡（自轮回页迁入成就页顶）的分节说明 */
  K['codex.ui.codexnote'] = '跨世永不清 · 里程碑即时入账遗泽';
  /* 称号面为绝对数阶梯（无百分比分母）：只报枚数，避免出现「22/—」 */
  K['codex.ui.collected.n'] = '已录 {n} 枚';
  K['codex.ui.ms'] = '里程碑 {done}/3';
  K['codex.ui.ms.next'] = '下一档 {pct}%';
  K['codex.ui.ms.all'] = '三面俱全';
  K['codex.ui.silhouette'] = '？？？';
  K['codex.ui.achv.done'] = '{n}/60';
  K['codex.ui.achv.reward'] = '遗泽 +{k}';
  /* 成就图鉴批：独立成就页（自轮回页迁出）——未解锁遮为问号，特殊成就提示条件 */
  K['achv.system'] = '成就';
  K['achv.ui.gcount'] = '{n}/{total}';
  K['achv.ui.got'] = '已达成';
  K['achv.ui.q'] = '？';
  K['codex.ui.achv.hint'] = '提示：{t}';
  K['codex.ui.titles'] = '称号墙';
  K['codex.ui.face.talentLegacy'] = '转世天赋';
  K['codex.ui.zone.layer'] = '首通 {a}/10 · 域主 {b}/10 · 词缀 {c}/8';
  K['codex.ui.newentry'] = '新条目入世，收集率暂跌属预期';
  K['codex.achv.toast'] = '成就达成 · {name}';
  K['codex.achv.group.xiu'] = '修行 · 入道';
  K['codex.achv.group.jie'] = '劫数 · 历雷';
  K['codex.achv.group.chen'] = '尘缘 · 结缘';
  K['codex.achv.group.men'] = '门庭 · 立派';
  K['codex.achv.group.mi'] = '秘藏 · 探幽';
  K['codex.achv.group.ni'] = '逆天 · 逆流';
  K['codex.face.event'] = '奇遇';
  K['codex.face.talent'] = '天赋';
  K['codex.face.treasure'] = '法宝';
  K['codex.face.art'] = '功法';
  K['codex.face.bond'] = '道友';
  K['codex.face.zone'] = '秘境';
  K['codex.face.faction'] = '势力';
  K['codex.face.title'] = '称号';
  K['codex.face.selfart'] = '自创与器灵';

  /* 成就 60 条（名 + 达成条件描述） */
  K['codex.achv.achv_jichu.name'] = '初窥门径'; K['codex.achv.achv_jichu.desc'] = '首次突破至筑基';
  K['codex.achv.achv_jindan.name'] = '金丹有成'; K['codex.achv.achv_jindan.desc'] = '首破金丹';
  K['codex.achv.achv_yuanying.name'] = '元婴出窍'; K['codex.achv.achv_yuanying.desc'] = '首破元婴';
  K['codex.achv.achv_huashen.name'] = '化神化形'; K['codex.achv.achv_huashen.desc'] = '首破化神';
  K['codex.achv.achv_lianxu.name'] = '炼虚窥道'; K['codex.achv.achv_lianxu.desc'] = '首破炼虚';
  K['codex.achv.achv_heti.name'] = '合体归一'; K['codex.achv.achv_heti.desc'] = '首破合体';
  K['codex.achv.achv_dacheng.name'] = '大乘在望'; K['codex.achv.achv_dacheng.desc'] = '首破大乘';
  K['codex.achv.achv_dujie.name'] = '渡劫称尊'; K['codex.achv.achv_dujie.desc'] = '首破渡劫境';
  K['codex.achv.achv_zhenxian.name'] = '真仙之躯'; K['codex.achv.achv_zhenxian.desc'] = '首破真仙';
  K['codex.achv.achv_feisheng.name'] = '举霞飞升'; K['codex.achv.achv_feisheng.desc'] = '飞升大劫成功';
  K['codex.achv.achv_chujie.name'] = '初次历雷'; K['codex.achv.achv_chujie.desc'] = '首次渡劫成功';
  K['codex.achv.achv_wulou.name'] = '无漏三连'; K['codex.achv.achv_wulou.desc'] = '连续 3 次渡劫一击即中';
  K['codex.achv.achv_kudu.name'] = '苦渡余生'; K['codex.achv.achv_kudu.desc'] = '在成算 ≤15% 的渡劫中成功';
  K['codex.achv.achv_lianbai.name'] = '连败不灭'; K['codex.achv.achv_lianbai.desc'] = '渡劫 5 连败后首次成功';
  K['codex.achv.achv_baizhan.name'] = '雷池常客'; K['codex.achv.achv_baizhan.desc'] = '跨世累计渡劫成功 30 次';
  K['codex.achv.achv_nitian.name'] = '逆天行事'; K['codex.achv.achv_nitian.desc'] = '逆天大劫成功（称号承天道卷）';
  K['codex.achv.achv_fanpan.name'] = '败中求胜'; K['codex.achv.achv_fanpan.desc'] = '逆天大劫失败后重积逆天值再挑战并成功';
  K['codex.achv.achv_leiting.name'] = '身经百战'; K['codex.achv.achv_leiting.desc'] = '跨世累计渡劫尝试 100 次';
  K['codex.achv.achv_yuanman.name'] = '圆满飞升'; K['codex.achv.achv_yuanman.desc'] = '以成算顶满 95% 的飞升大劫成功';
  K['codex.achv.achv_bingjie.name'] = '舍身证道'; K['codex.achv.achv_bingjie.desc'] = '首次兵解转世';
  K['codex.achv.achv_chuyuan.name'] = '红尘初缘'; K['codex.achv.achv_chuyuan.desc'] = '首次与道友结缘';
  K['codex.achv.achv_guangjie.name'] = '广结善缘'; K['codex.achv.achv_guangjie.desc'] = '单世结缘满 20 人';
  K['codex.achv.achv_renhou.name'] = '仁护一方'; K['codex.achv.achv_renhou.desc'] = '单世结缘满 40 人';
  K['codex.achv.achv_daolv.name'] = '道侣同尘'; K['codex.achv.achv_daolv.desc'] = '首次结成道侣';
  K['codex.achv.achv_hufa.name'] = '护法在侧'; K['codex.achv.achv_hufa.desc'] = '首次启用档 3 以上护法位';
  K['codex.achv.achv_juefeng.name'] = '绝而复续'; K['codex.achv.achv_juefeng.desc'] = '绝交后经事件恢复好感';
  K['codex.achv.achv_xinjie.name'] = '心结曾系'; K['codex.achv.achv_xinjie.desc'] = '心结锁触发（炉鼎采补解除等）';
  K['codex.achv.achv_kuashi.name'] = '缘定三生'; K['codex.achv.achv_kuashi.desc'] = '使用跨世之缘赎回道友';
  K['codex.achv.achv_shuangxiu.name'] = '双修有成'; K['codex.achv.achv_shuangxiu.desc'] = '双修满档维持 30 天';
  K['codex.achv.achv_fudi.name'] = '福地安家'; K['codex.achv.achv_fudi.desc'] = '驻留福地且护法在位';
  K['codex.achv.achv_rumen.name'] = '拜入山门'; K['codex.achv.achv_rumen.desc'] = '首次加入势力';
  K['codex.achv.achv_zhishi.name'] = '执事之权'; K['codex.achv.achv_zhishi.desc'] = '职位达档 3';
  K['codex.achv.achv_zhangjiao.name'] = '位极人臣'; K['codex.achv.achv_zhangjiao.desc'] = '职位达最高档';
  K['codex.achv.achv_panzong.name'] = '叛出山门'; K['codex.achv.achv_panzong.desc'] = '首次叛离势力';
  K['codex.achv.achv_zhangong.name'] = '战功初立'; K['codex.achv.achv_zhangong.desc'] = '首次获得势力战功';
  K['codex.achv.achv_xuanzhan.name'] = '见证宣战'; K['codex.achv.achv_xuanzhan.desc'] = '目击所在势力宣战或被宣战';
  K['codex.achv.achv_kaizong.name'] = '开宗立派'; K['codex.achv.achv_kaizong.desc'] = '自立门户成功';
  K['codex.achv.achv_danfang.name'] = '丹房开炉'; K['codex.achv.achv_danfang.desc'] = '丹房资格落地后首次开炉';
  K['codex.achv.achv_jiuzhuan.name'] = '丹成九转'; K['codex.achv.achv_jiuzhuan.desc'] = '炼出九转丹纹丹药';
  K['codex.achv.achv_lianqi.name'] = '器成通灵'; K['codex.achv.achv_lianqi.desc'] = '首次炼器成功';
  K['codex.achv.achv_chutong.name'] = '初探秘境'; K['codex.achv.achv_chutong.desc'] = '首次秘境首通';
  K['codex.achv.achv_bantu.name'] = '半壁山河'; K['codex.achv.achv_bantu.desc'] = '累计首通 5 区';
  K['codex.achv.achv_quantong.name'] = '十境全通'; K['codex.achv.achv_quantong.desc'] = '累计首通 10 区（跨世）';
  K['codex.achv.achv_yuzhu.name'] = '域主之殇'; K['codex.achv.achv_yuzhu.desc'] = '首次击杀域主';
  K['codex.achv.achv_shizhu.name'] = '十区共主'; K['codex.achv.achv_shizhu.desc'] = '全部 10 区域主首杀';
  K['codex.achv.achv_chubao.name'] = '法宝入手'; K['codex.achv.achv_chubao.desc'] = '首件法宝获得';
  K['codex.achv.achv_cangbao.name'] = '藏宝二十'; K['codex.achv.achv_cangbao.desc'] = '法宝图鉴收录 20 件';
  K['codex.achv.achv_baoquan.name'] = '万宝齐备'; K['codex.achv.achv_baoquan.desc'] = '法宝图鉴 46 件全录';
  K['codex.achv.achv_yifa.name'] = '一法通神'; K['codex.achv.achv_yifa.desc'] = '首部功法满级';
  K['codex.achv.achv_wanfa.name'] = '万法归一'; K['codex.achv.achv_wanfa.desc'] = '累计 10 部功法满级（跨世）';
  K['codex.achv.achv_rumo.name'] = '一念入魔'; K['codex.achv.achv_rumo.desc'] = '业力首次跌破 −500';
  K['codex.achv.achv_shenmo.name'] = '魔道巨擘'; K['codex.achv.achv_shenmo.desc'] = '业力首次跌破 −900';
  K['codex.achv.achv_lingzhi.name'] = '初领天旨'; K['codex.achv.achv_lingzhi.desc'] = '首次领旨';
  K['codex.achv.achv_kangzhi.name'] = '敢驳天颜'; K['codex.achv.achv_kangzhi.desc'] = '首次抗旨';
  K['codex.achv.achv_niman.name'] = '逆天值满'; K['codex.achv.achv_niman.desc'] = '逆天值首次达 100';
  K['codex.achv.achv_guantian.name'] = '坐观天象'; K['codex.achv.achv_guantian.desc'] = '累计览天象 20 条';
  K['codex.achv.achv_sanshi.name'] = '三生有幸'; K['codex.achv.achv_sanshi.desc'] = '累计转世满 3 世';
  K['codex.achv.achv_sudi.name'] = '宿敌初逢'; K['codex.achv.achv_sudi.desc'] = '跨世宿敌首次同场';
  K['codex.achv.achv_zhandi.name'] = '手斩宿敌'; K['codex.achv.achv_zhandi.desc'] = '击败跨世宿敌';
  K['codex.achv.achv_bushou.name'] = '天敕难拘'; K['codex.achv.achv_bushou.desc'] = '累计抗旨满 10 道';

  /* 称号文案（成就授予 58 + 天道 1，正典名与成就名分列） */
  K['codex.title.title_daoji'] = '道基初立';
  K['codex.title.title_jindan'] = '金丹映日';
  K['codex.title.title_yuanying'] = '元婴显圣';
  K['codex.title.title_huashen'] = '神游太虚';
  K['codex.title.title_lianxu'] = '虚目窥天';
  K['codex.title.title_heti'] = '身与道合';
  K['codex.title.title_dacheng'] = '半步仙途';
  K['codex.title.title_dujie'] = '渡劫称尊';
  K['codex.title.title_zhenxian'] = '真仙临世';
  K['codex.title.title_feisheng'] = '霞举飞升';
  K['codex.title.title_chujie'] = '雷下留人';
  K['codex.title.title_wulou'] = '无漏道体';
  K['codex.title.title_kudu'] = '命悬一线';
  K['codex.title.title_lianbai'] = '百折不摧';
  K['codex.title.title_baizhan'] = '雷炼筋骨';
  K['codex.title.title_nitian'] = '我命由我不由天';
  K['codex.title.title_fanpan'] = '逆而能胜';
  K['codex.title.title_leiting'] = '雷池常客';
  K['codex.title.title_yuanman'] = '功德圆满';
  K['codex.title.title_bingjie'] = '身舍道存';
  K['codex.title.title_chuyuan'] = '红尘初缘';
  K['codex.title.title_guangjie'] = '善缘广结';
  K['codex.title.title_renhou'] = '仁护一方';
  K['codex.title.title_daolv'] = '红尘道侣';
  K['codex.title.title_hufa'] = '护法在侧';
  K['codex.title.title_juefeng'] = '破镜重圆';
  K['codex.title.title_xinjie'] = '各有其道';
  K['codex.title.title_kuashi'] = '缘跨三世';
  K['codex.title.title_shuangxiu'] = '琴瑟和鸣';
  K['codex.title.title_fudi'] = '安居福地';
  K['codex.title.title_rumen'] = '门下有徒';
  K['codex.title.title_zhishi'] = '执掌一堂';
  K['codex.title.title_zhangjiao'] = '一宗之主';
  K['codex.title.title_panzong'] = '孤身叛道';
  K['codex.title.title_zhangong'] = '战功赫赫';
  K['codex.title.title_xuanzhan'] = '风云见证';
  K['codex.title.title_kaizong'] = '开山祖师';
  K['codex.title.title_danfang'] = '丹房主人';
  K['codex.title.title_jiuzhuan'] = '九转丹师';
  K['codex.title.title_lianqi'] = '百炼成器';
  K['codex.title.title_chutong'] = '初探锋芒';
  K['codex.title.title_bantu'] = '踏破五境';
  K['codex.title.title_quantong'] = '万境皆通';
  K['codex.title.title_yuzhu'] = '弑主之名';
  K['codex.title.title_shizhu'] = '十境共主';
  K['codex.title.title_chubao'] = '宝光初现';
  K['codex.title.title_cangbao'] = '藏宝之家';
  K['codex.title.title_baoquan'] = '宝斋主人';
  K['codex.title.title_yifa'] = '一法通神';
  K['codex.title.title_wanfa'] = '万法归宗';
  K['codex.title.title_rumo'] = '魔根深种';
  K['codex.title.title_shenmo'] = '魔焰滔天';
  K['codex.title.title_lingzhi'] = '天恩亲承';
  K['codex.title.title_kangzhi'] = '敢驳天颜';
  K['codex.title.title_niman'] = '逆天之徒';
  K['codex.title.title_guantian'] = '坐看云起';
  K['codex.title.title_sanshi'] = '三世尘缘';
  K['codex.title.title_sudi'] = '宿命之敌';
  K['codex.title.title_zhandi'] = '斩却宿敌';
  /* 榜位称号（N5 收口批 · 图鉴卷 §2.9 只登记「天骄榜位」为称号墙来源、未定义条目本体，
   * 本批补的就是本体：id `title_bangshou` / 判据 = 首次登顶（`ws.prodMarks.myRank === 1`）/
   * 幂等 = `meta.titles` 跨世不清 + `addTitle` indexOf 双挡 ⇒ 一世一次、跨世不重发。
   * 与上方两枚「宿敌」成就称号无关（那是成就 face，不是榜位 face）。 */
  K['codex.title.title_bangshou'] = '同代夺魁';
  K['codex.title.title_bushou'] = '天敕难拘';

  /* 传记模板（§5.2 三段式范本照录 + 标题/统计/大事记行） */
  K['codex.bio.head'] = '《{name} · 第{life}世》';
  K['codex.bio.qi.1'] = '{name}者，起于微末。练气之身，无依无凭，一步一叩问长生。';
  K['codex.bio.qi.2'] = '{name}，第{life}世也。前尘已远，遗泽尚在，此番下山，眼里带着旧世的光。';
  K['codex.bio.qi.3'] = '世人皆道修仙好，{name}初闻此言时，尚在山下挑水。';
  K['codex.bio.qi.4'] = '{name}生于{world}，灵根平平，志向不平。';
  K['codex.bio.qi.5'] = '这一世的{name}，开局便与旁人不同——{startNote}。';
  K['codex.bio.xing.1'] = '一路行来，渡劫{n1}次，成{n2}败{n3}。雷池洗骨，愈败愈勇。';
  K['codex.bio.xing.2'] = '其人性烈，行事不问天道脸色，抗旨{n}道，江湖侧目。';
  K['codex.bio.xing.3'] = '广结善缘，道友{n4}人遍布四方；红烛一炬，终有{spouse}伴身。';
  K['codex.bio.xing.4'] = '心向魔道，杀伐决断，业力沉至{karma}，正道闻其名而色变。';
  K['codex.bio.xing.5'] = '谨守门规，步步高升，位至{office}，门中上下皆称一声「{name}」。';
  K['codex.bio.zhong.1'] = '{realm}之年，天门开处，{name}整衣冠，一步踏入霞光——此世圆满。';
  K['codex.bio.zhong.2'] = '飞升雷落九道，{name}笑受之。后世史笔至此，只能写四个字：此人来过。';
  K['codex.bio.zhong.3'] = '大道难行，{name}遂自散修为，兵解于{realm}之巅。身虽陨，道未殒——留得遗泽付来生。';
  K['codex.bio.zhong.4'] = '{realm}一梦，终有尽时。{name}闭关于雷声最烈处，再睁眼时，已是来世。';
  K['codex.bio.zhong.5'] = '此世止于{realm}。未能登天，未能兵解，然图鉴有痕、称号有名、此传有字——{name}，不虚此行。';
  K['codex.bio.stats'] = '计：第 {life} 世，止于{realm}；渡劫成 {win} 败 {lose}，结缘 {bonds} 人，业力{karma}。';
  K['codex.bio.startnote'] = '带着前世的行囊';
  /* 开宗附加句（传记特征键表「开宗」项落地；刻意不做 xing 第 6 型 ⇒ 卷面五型计数不动） */
  K['codex.bio.sect'] = '一世开宗，立「{sect}」，门下 {n5} 人——道之外，还留下一脉香火。';
  K['codex.bio.line.ascend'] = '是日霞光接引，飞升而去。';
  K['codex.bio.line.dissolve'] = '是日自散修为，兵解转世。';
  /* 被动了结两行（寿元批）：传记终行原先非飞升即写「兵解转世」，死世用即说谎 */
  K['codex.bio.line.shoujin'] = '是日寿尽，坐化于蒲团之上。';
  K['codex.bio.line.daoshang'] = '是日道伤崩碎，伤重不治。';
  K['codex.bio.line.zhesou'] = '是日折寿已尽，未及大限而殒。';

  /* ── 更新公告浮层（第册四批 · UI 卷 §3.4e · 玩家可见文案一律白话短句，零英文名词、零版本号）──
   * 消费侧 = `view/updatenote.js` 逐条字面取词（不走拼键，A2/A6 才看得见这七行）。 */
  K['update.note.title'] = '游戏更新公告';
  K['update.note.l1'] = '本次更新共五项：一世结束的传记演出、法宝认主按件计算、历练寿元提醒、主修显示修正、丹毒提示下架。以下逐条说明。';
  K['update.note.l2'] = '新增 · 一世结束时会演出「盖棺之传」。无论飞升、兵解、寿尽、道伤崩碎还是折寿，都会逐字写完这一世的经历，再回到创角屏开始下一世；演的那一份和轮回页「前世书」里读到的是同一份，不另写一套。';
  K['update.note.l3'] = '调整 · 法宝认主改为按件计算。以前几件法宝共用一份进度，一件修满就会把其余几件一起冻住；现在每件单独计时计数，满阶的那件不再拖累其他件，新入手的法宝从零开始。';
  K['update.note.l4'] = '新增 · 法宝卡片会写明「这件还差约几小时进一阶」。数字按这件法宝自己的进度算，未圆满的先天法宝才有这句，已经满阶的不显示。';
  K['update.note.l5'] = '新增 · 修行页的寿元一栏多了折算提醒。驻在秘境历练时，修为来得比闭关快、寿元也耗得快，屏上会按当前节奏折算出还够修多少年，不必自己去猜。';
  K['update.note.l6'] = '调整 · 两处显示不再误导。一是被别的功法顶下槽的那一部，不会再占着「主修」两个字；重新装回槽里也不会自动夺回主修，需要你再点一次。二是「丹毒已满」这句提示连同这条限制一起下架——它其实从来没有真正拦住了谁。此后不再按天限量，匣里有丹就能服（破障、镇劫那两枚的每境界限照旧），同一类增益依旧只保留最强的一条。';
  K['update.note.l7'] = '本公告在你点「知道了」之后才记为已读，点旁边不算；下次更新会再弹一次。';
  K['update.note.close'] = '知道了';

  SQ.lexRegister('xiuxian', K);
})();
