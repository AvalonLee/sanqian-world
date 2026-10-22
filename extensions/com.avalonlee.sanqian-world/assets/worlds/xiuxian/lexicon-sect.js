/* xiuxian/lexicon-sect.js — 自立门户（宗门系统）词表分卷（CJK 白名单文件 · 自立门户卷 v1.1 §十二）
 * key 族：sect.*（宗名词库 12×8 / 山门三预设 / 宗规三倾向 / 设施四座 / 弟子名池 24×48 /
 * 战争与传位 / UI 与日志 / 编年史三条）。
 * ⚠️ 勿混注记：faction.* 族（势力全录）与 sect.* 族两族并存不冲突——宗门战争文案落 sect.war.*。
 * 自定义宗名只进存档不进词表（玩家文本永不写回数据文件，§2.2 反向约束）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var K = {};

  /* ── 宗名词库（前缀 12 × 后缀 8 = 96 组合）── */
  var PRE = ['青', '白', '紫', '玄', '赤', '苍', '墨', '金', '灵', '剑', '星', '雷'];
  var SUF = ['剑宗', '丹门', '谷', '阁', '山庄', '峰盟', '观', '宫'];
  PRE.forEach(function (w, i) { K['sect.name.pre.' + (i + 1)] = w; });
  SUF.forEach(function (w, i) { K['sect.name.suf.' + (i + 1)] = w; });

  /* ── 第 17 动态位势力条目描述（factions normalize 在册校验键）── */
  K['sect.faction.desc'] = '你亲手立下的山门——宗规即门风，弟子即基业。';

  /* ── 山门三预设（纯叙事零数值，§2.1 裁定）── */
  K['sect.gate.wuyue.name'] = '乌岳峰';
  K['sect.gate.wuyue.desc'] = '剑气与铁骨：山如墨刃，弟子晨课是负重登山——武备之宗的气象。';
  K['sect.gate.baihong.name'] = '白虹谷';
  K['sect.gate.baihong.desc'] = '丹火与书声：谷中终年虹光不散，藏经与丹房并排起——文修之宗的气象。';
  K['sect.gate.panlong.name'] = '蟠龙岭';
  K['sect.gate.panlong.desc'] = '商道与灵脉：岭下三条灵脉交汇处，坊市依岭而生——财修之宗的气象。';

  /* ── 宗规三倾向（收徒权重 / 传法子集 / 世界怎么看你）── */
  K['sect.align.right.name'] = '正道';
  K['sect.align.right.desc'] = '名门正派，收徒看根骨更看心性';
  K['sect.align.right.rule'] = '收徒 良才20/可造55/璞玉25；传法限正道与左道功法；与魔道五家开局即敌对';
  K['sect.align.neutral.name'] = '左道';
  K['sect.align.neutral.desc'] = '不问正邪，只问本事';
  K['sect.align.neutral.rule'] = '收徒 良才15/可造55/璞玉30；传法不限；各方关系随机';
  K['sect.align.evil.name'] = '魔道';
  K['sect.align.evil.desc'] = '弱肉强食，能者居之';
  K['sect.align.evil.rule'] = '收徒 良才10/可造50/璞玉40；传法限魔道与左道功法；与正道四家开局即敌对';

  /* ── 设施四座 ── */
  K['sect.fac.zangjing.name'] = '藏经阁';
  K['sect.fac.zangjing.desc'] = '弟子功法槽 1+⌊藏经阁级÷2⌋（至多 3），每槽弟子战力 +8%（传法）；槽数受宗规传法子集收窄';
  K['sect.fac.danfang.name'] = '丹房';
  K['sect.fac.danfang.desc'] = '炼丹成功率 +5%（宗门平坦加项，不随等级缩放）';
  K['sect.fac.danfang.pending'] = '丹火未开';
  K['sect.fac.yanwu.name'] = '演武场';
  K['sect.fac.yanwu.desc'] = '弟子战力系数 +5%/级（满级 1.25）';
  K['sect.fac.keshe.name'] = '客舍';
  K['sect.fac.keshe.desc'] = '弟子上限 +1/级（基础 1 → 满级 6，含供奉名额）';
  K['sect.fac.build'] = '{name}升至 {lv} 级';
  K['sect.fac.lv'] = '{lv}/5 级';
  K['sect.fac.cost'] = '营建 {n} 灵石';

  /* ── 弟子名池（姓 24 × 名 48，索引入档）── */
  var SUR = ['陈', '林', '黄', '吴', '周', '徐', '孙', '马', '朱', '胡', '郭', '何',
    '高', '罗', '郑', '梁', '谢', '宋', '唐', '许', '邓', '冯', '韩', '曹'];
  var GIV = ['青山', '长风', '无涯', '听雪', '惊鸿', '照影', '凌霜', '抱朴', '守拙', '忘机', '怀瑾', '握瑜',
    '冲虚', '致远', '宁静', '淡泊', '明志', '乘风', '御剑', '采薇', '伐檀', '漱石', '枕流', '问渠',
    '观澜', '踏歌', '知非', '复礼', '归仁', '慕贤', '希圣', '步虚', '朝真', '炼形', '养素', '抱一',
    '知白', '守黑', '和光', '同尘', '栖迟', '偃仰', '濯缨', '怀袖', '倚剑', '临渊', '望舒', '既明'];
  SUR.forEach(function (w, i) { K['sect.disc.sur.' + (i + 1)] = w; });
  GIV.forEach(function (w, i) { K['sect.disc.giv.' + (i + 1)] = w; });
  K['sect.disc.join'] = '天骄{name}登门求入门，自此列于{sect}门下。';

  /* ── 弟子系统 ── */
  K['sect.disc.apt.fine'] = '良才';
  K['sect.disc.apt.mid'] = '可造';
  K['sect.disc.apt.raw'] = '璞玉';
  K['sect.disc.inv.0'] = '记名（不投资）';
  K['sect.disc.inv.1'] = '常规培养';
  K['sect.disc.inv.2'] = '厚培';
  K['sect.disc.recruit'] = '广纳门徒';
  K['sect.disc.candidate'] = '求入门者：{name}——收或不收，一句话的事';
  K['sect.disc.accept'] = '{name}拜入山门';
  K['sect.disc.reject'] = '你摇了摇头，来人一步三回头地下了山';
  K['sect.disc.cap.full'] = '门下已满（客舍扩建可增名额）';
  K['sect.disc.offering'] = '供奉';
  K['sect.disc.offer.btn'] = '请为供奉';
  K['sect.disc.offer.ok'] = '{name}应允挂名供奉——客卿之礼，月奉 ×2';
  K['sect.disc.offer.refuse'] = '{name}摆手一笑：「散漫惯了，不给你添乱。」';
  K['sect.disc.offer.need'] = '需好感 ≥70（档 3 应允率五成，档 4 必允）';
  K['sect.disc.dispatch'] = '调遣{name}（{field} {v}，2 时辰）';
  K['sect.disc.empty'] = '门下尚无弟子';
  K['sect.disc.row'] = '{name} · {apt} · {realm}';
  K['sect.disc.power'] = '战力 {n}';
  K['sect.disc.prog'] = '升境 {p}/{need}';
  K['sect.tribute.log'] = '弟子月奉入库 {n} {cur}';
  /* N1 第二环（材料供奉环接线）：入账一行 + 丹房设施效果行的材料侧说明 */
  K['sect.tribute.mats'] = '门中进缴灵材 {n} 件';
  K['sect.fac.danfang.mat'] = '每 {m} 年月出灵材 1 件／级';

  /* ── 开宗流程 ── */
  K['sect.system'] = '宗门';
  K['sect.found.btn'] = '开宗立派';
  K['sect.found.rumor'] = '江湖快讯：{name}立派开山，山门大开，广纳门徒——第 17 家势力入局。';
  K['sect.found.log'] = '开宗立派「{name}」，山门定于{gate}';
  K['sect.found.leave'] = '功成身退，辞去{name}职衔——不是背弃，是自立';
  K['sect.found.confirm'] = '开宗立派：脱离旧门（零叛离惩罚）、山门定格不可迁、宗规决定收徒与战争面。立派？';
  K['sect.ui.gate.realm'] = '境界 ≥ 化神';
  K['sect.ui.gate.identity'] = '身份：长老位在任 或 叛离经历';
  K['sect.ui.gate.peak'] = '声望峰值 ≥ 2000（现 {n}）';
  K['sect.ui.gate.unlock'] = '开宗资格（遗泽商店）';
  K['sect.ui.gate.pick'] = '山门三选（纯叙事，定格不可迁）';
  /* 开宗失败九因（`foundSect` / `canFound` 的 reason 全枚举；view 侧原按
   * `sect.ui.fail.<reason>` 拼键、整族无键 ⇒ 裸英文 'realm'/'peak'/'name' 直接上屏）*/
  K['sect.ui.fail.realm'] = '境界未及化神，担不起一面旗。';
  K['sect.ui.fail.identity'] = '旧宗门里既无长老位在任，也尚无被逐的经历——名不正则言不顺。';
  K['sect.ui.fail.peak'] = '声望峰值未及二千，江湖无人认你这山门。';
  K['sect.ui.fail.unlock'] = '「自立门户」尚未用遗泽打通——去轮回页的遗泽商店。';
  K['sect.ui.fail.has'] = '你已是一派之主，此世不再另立。';
  K['sect.ui.fail.done'] = '山门已传位与人——传出去的旗，收不回再插一次。';
  K['sect.ui.fail.gate'] = '山门选址不在名录之内。';
  K['sect.ui.fail.align'] = '宗规只列正、左、魔三倾向。';
  K['sect.ui.fail.name'] = '宗名不合：至多六字，且须过忌讳——换个名号再说。';
  /* 营建设施失败四因（`buildFac` = none/unknown/max/poor；max 与 poor 复用既有键，
   * view:6809 原把余下两因的**内部字段名直接 toast 上屏**）*/
  K['sect.ui.build.none'] = '山门已传位或未立，无从营建。';
  K['sect.ui.build.unknown'] = '此设施不在名录之内。';
  K['sect.ui.build.other'] = '营建未成——稍后再试。';
  K['sect.ui.align.pick'] = '宗规三选（决定收徒权重、传法子集与世界关系）';
  K['sect.ui.name.ph'] = '自定义宗名 ≤6 字（留空则词库掷名）';
  K['sect.ui.name.roll'] = '掷名';
  K['sect.ui.rep'] = '宗门声望 {n}';
  K['sect.ui.power'] = '宗门战力 {n}';
  K['sect.ui.war.record'] = '战功 {w} 胜 {l} 败';
  K['sect.ui.disciples'] = '门徒（{n}/{cap}）';
  K['sect.ui.facs'] = '宗门设施';
  K['sect.ui.succ.btn'] = '传位';
  K['sect.ui.succ.pick'] = '择继位弟子（供奉不可继位）';
  K['sect.ui.succ.confirm'] = '传位三后果：宗门转 NPC 位继续活着 / 你获称号「开山祖师」跨世保留 / 当世不可再开宗。传位？';
  K['sect.ui.succ.done'] = '已传位 · 一代宗师下山';
  K['sect.ui.nofound'] = '未开宗——四门槛达成后此处亮起「开宗立派」';
  /* ── B16-j 版面（设计稿 §宗门：空态外壳 / 四门槛 .gate 行 / 立派之后三行 / 已开宗状态条与四格）── */
  K['sect.ui.found.name'] = '尚未开宗';
  K['sect.ui.found.tag'] = '未立';
  K['sect.ui.gates'] = '四 门 槛';
  K['sect.ui.after'] = '立 派 之 后';
  K['sect.ui.after.rule'] = '门规三定';
  K['sect.ui.after.rule.d'] = '定道统 · 定门风 · 定收徒门槛，决定门中供给与弟子资质';
  K['sect.ui.after.supply'] = '门中供给';
  K['sect.ui.after.supply.d'] = '按门规定期发放灵石、丹药与功法';
  K['sect.ui.after.succ'] = '传位';
  K['sect.ui.after.succ.d'] = '转世前可指定继承人，宗门不随你身死而散';
  K['sect.ui.strip.k'] = '当前宗门';
  K['sect.ui.sum.rec'] = '战 绩';
  K['sect.ui.sum.fac'] = '设 施';
  K['sect.ui.sum.rule'] = '门 规';
  K['sect.ui.sum.succ'] = '传 位';
  K['sect.ui.sum.none'] = '未立';
  K['sect.ui.sum.set'] = '已定';
  K['sect.ui.fac.n'] = '{n} 处';
  K['sect.ui.leave.lock'] = '宗门不可弃——传位方可下山';
  K['sect.ui.dispatch'] = '调遣';
  K['sect.ui.accept'] = '收入门墙';
  K['sect.ui.reject'] = '婉拒';
  K['sect.ui.recruit.cd'] = '门庭暂歇（{t} 后再纳徒）';
  K['sect.fac.max'] = '已满级';
  K['sect.war.cd'] = '战书不轻发（{t} 后可再下）';
  K['sect.war.busy'] = '战端已开，不可两线作战';

  /* ── 战争与传位 ── */
  K['sect.war.declare'] = '{a}向{b}下战书——二十分钟内见分晓';
  K['sect.war.btn'] = '下战书';
  /* 第册一百一十八批：用户报「宣战入口在哪我没找到」——旧写法在「无敌对」时整段不渲染，
   * 于是玩家看不到任何解释，只以为没有这个功能。这一段现在恒在，没得打时说一句为什么、怎么结仇。 */
  K['sect.war.none'] = '四方势力都还没入册，这一列空着。';
  /* 结仇宣战（第册一百二十二批 · 用户裁定「开：重代价」）：非敌对也能开战，代价当场写在钮上与段尾一句里。
   * 折损百分比与善恶值一律由视图取表插值（改 `WAR_OPEN_KARMA` / `WAR_REP_SELF_CUT` 即改屏，不留写死数）。 */
  K['sect.war.open.cost'] = '结仇宣战 {n}';
  K['sect.war.open.why'] = '与它本无仇：这一笔除灵石（按对家家底计价）外，另折本宗声望永久 −{cut}%、善恶 −{karma}，且它的友好势力一并与你结仇。';
  K['sect.war.open.log'] = '{name}素与本宗无仇，一战自此：费灵石 {n}、本宗声望折 {cut}%、善恶 −{karma}，另将 {m} 家友好者一并结仇。';
  K['sect.war.open.poor'] = '灵石不够这一笔结仇费（要 {n}）';
  K['sect.war.reject'] = '这一战眼下开不成（不是没人就是仗还没散）。';
  K['sect.war.guard'] = '亲率弟子守山';
  K['sect.war.win'] = '{name}大捷——弟子出力，山门增辉（声望上行）';
  K['sect.war.lose'] = '{name}败了一阵——弟子零损失，回去再练';
  K['sect.war.merit'] = '弟子出力折算战功 +{n}';
  K['sect.succ.log'] = '传位{name}于{heir}——一代宗师，下山去了';
  K['sect.succ.rumor'] = '江湖快讯：{name}宗主传位弟子{heir}，飘然下山。山门依旧，人换了。';

  /* ── 编年史三条（奏疏兼容 §7.2）──
   * 基准键 = 左道/中性措辞（§2.3 空窗期条款：编年史措辞按 align 分组取模板，零机制效果）；
   * .right = 正道褒评组、.evil = 魔道差评组。消费点 tiandao.js SECT_CHRON 分组表。 */
  K['sect.chronicle.found'] = '是日开宗立派，山门定名「{name}」。';
  K['sect.chronicle.win'] = '是日宗门大捷，「{name}」声威大振。';
  K['sect.chronicle.succ'] = '是日传位{heir}，「{name}」自此有了自己的命数。';
  K['sect.chronicle.found.right'] = '是日开宗立派，山门定名「{name}」。正道立基，老夫记一笔。';
  K['sect.chronicle.found.evil'] = '是日开宗立派，山门定名「{name}」。魔火上峰，老夫旁注一笔。';
  K['sect.chronicle.win.right'] = '是日宗门大捷，「{name}」声威大振。赢得干净。';
  K['sect.chronicle.win.evil'] = '是日宗门大捷，「{name}」声威大振。这一仗的账另起一页。';
  K['sect.chronicle.succ.right'] = '是日传位{heir}，「{name}」自此有了自己的命数。师门有后。';
  K['sect.chronicle.succ.evil'] = '是日传位{heir}，「{name}」自此有了自己的命数。路后人接着走。';

  /* ── B16-ad：自立宗门治理 / 人事 / 外交（全开放） ── */
  K['sect.gov.title'] = '宗 门 治 理';
  /* 改名 / 重定门规 / 改宣言一族文案随第册一百一十八批的三条写口同批退役（第册一百二十批清账：
   * 宗名与门规·阵营仍由 `.statestrip` 与四格摘要只读呈现，取 `sect.ui.sum.*` / `sect.gate.*` / `sect.align.*`）。 */
  K['sect.gov.motto'] = '门规宣言';
  /* 字数从表取（第册一百一十八批）：原先把「24 字」写进文案，改 MOTTO_MAX 不动屏上话就是谎数
   * （与「开席文案的分钟数取表值」同一条口径）。 */
  K['sect.gov.motto.ph'] = '写一句本门戒律（{n} 字内）';
  K['sect.gov.motto.once'] = '立派时写一次，之后不能改';
  K['sect.gov.motto.line'] = '门规宣言：「{m}」';
  K['sect.gov.tax'] = '税率';
  K['sect.gov.tax.hint'] = '按弟子所在区灵石基准抽成，每月结算；0~30%，步长 5%。';
  K['sect.gov.disband'] = '解散宗门';
  K['sect.gov.disband.confirm'] = '解散「{name}」：山门、弟子、设施尽数遣散，且不可撤销。确定？';
  K['sect.gov.disband.ok'] = '宗门已解散';
  K['sect.gov.disband.log'] = '「{name}」山门解散，弟子各奔前程。';
  K['sect.gov.post.steward'] = '执事';
  K['sect.gov.post.elder'] = '长老';
  K['sect.gov.post.none'] = '撤职';
  K['sect.gov.post.steward.eff'] = '宗门声望 +10%';
  K['sect.gov.post.elder.eff'] = '宗门战力 +10%';
  K['sect.gov.post.hint'] = '执事与长老各限一名，只领一份加成；逐出即离门。';
  K['sect.gov.expel'] = '逐出';
  K['sect.gov.expel.confirm'] = '将「{name}」逐出宗门？';
  K['sect.gov.expel.ok'] = '已逐出「{name}」';
  K['sect.gov.peace'] = '停战';
  K['sect.gov.peace.cost'] = '停战（{n} 灵石）';
  K['sect.gov.peace.confirm'] = '向战事双方各递一封和书，花费 {n} 灵石，当前战争立即结束。确定？';
  K['sect.gov.peace.ok'] = '战事已休';
  K['sect.gov.peace.log'] = '宗门以 {n} 灵石换来停战，山门闭门休养。';
  K['sect.tax.log'] = '宗门税入账：灵石 +{n}';

  /* ── buff 来源 ── */
  K['buff.src.sect'] = '宗门调遣';

  SQ.lexRegister('xiuxian', K);
})();
