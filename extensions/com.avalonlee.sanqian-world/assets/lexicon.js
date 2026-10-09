/* lexicon.js — G11 取词器 t(key, vars, worldId) + 词表注册器 lexRegister
 * 规则（工程规范 §1.1/§1.3）：
 *  - 取词三级回落：世界词表 SQ.LEX[worldId] → common → 返回 key 本身
 *    （让遗漏在界面上肉眼可见，而不是静默空白）；
 *  - 世界词表按分卷注册（worlds/<id>/lexicon.js、lexicon/talents.js 等生成文件），
 *    pack.lexicon 与世界分卷共享同一对象引用（契约 §2.2 的 lexicon 项）；
 *  - common 只放世界无关的系统文案；本文件与注册分卷是 CJK 白名单，
 *    其余源码禁止裸中文常量（.tests/audit.js 扫描）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.LEX = SQ.LEX || {};          /* worldId → 词表对象（世界分卷注册目标） */

  var common = {
    'app.name': '三千世界',
    'profile.default_name': '无名',
    'ui.loading': '开天辟地中…',
    'ui.confirm': '确认',
    'ui.cancel': '返回',
    'ui.close': '关闭',
    'ui.ok': '入定',
    'ui.claim': '收功',
    'ui.number.wan': '万',
    'ui.number.yi': '亿',
    'ui.error.storage': '存档读取失败：{msg}',
    'ui.error.save': '存档写入失败：{msg}（本次进度恐未记下）',
    'ui.error.short': '读取失败',
    'world.status.live': '首发',
    'world.status.coming': '此界尚在混沌，未可投生',
    /* coming 世界显示名兜底（世界包交付后由各自 lexicon 分卷覆盖） */
    'world.guwu.name': '古武军势',
    'world.magic.name': '魔法能量',
    'world.tech.name': '科技降神',
    'world.urban.name': '现代都市',
    'world.cthulhu.name': '克苏鲁世界',
    'world.tag.zhan': '战意',
    'world.tag.gate': '攻关',
    'ui.sep': '，',
    'module.empty': '点击开启新生',
    'log.boot': '天地初开，灵气始生',
    /* ── 创角三屏（流程：起名 → 择界 → 观天赋；键族按屏语义命名，见「世界包词族契约」）──
     * 世界词表可整族覆写 creation.* / world.* 等，实现「换世界即换系统名与菜单描述」。 */
    'creation.step.1.n': '一', 'creation.step.1.t': '立名',
    'creation.step.2.n': '二', 'creation.step.2.t': '择界',
    'creation.step.3.n': '三', 'creation.step.3.t': '观天赋',
    'creation.name.title': '道名初定',
    'creation.name.label': '道名',
    'creation.name.ph': '请输入角色名（2~8 字）',
    'creation.name.random': '掷杯问名',
    'creation.name.next': '下一步：择界',
    'creation.name.invalid': '道名需 2~8 字，请重新斟酌',
    'creation.world.title': '三千世界 · 择界重生',
    'creation.world.pick': '选择重生世界',
    'creation.world.hint': '择界之后，天赋自该界的天地法则中抽取。',
    'creation.world.next': '下一步：观天赋',
    'creation.world.noPick': '请先选择一处可投生之界',
    'creation.talent.title': '天命所赋',
    'creation.talent.combo': '{p} 正 {n} 负',
    'creation.talent.reroll': '重抽天命',
    'creation.talent.confirm': '确认锁定',
    'creation.talent.lockTitle': '锁定天命',
    'creation.talent.lockText': '天赋确认后此生不可更改，是否入定？',
    'creation.talent.amplify': '极致单一 · 效果增强',
    'creation.talent.rare': '稀有',
    /* 系统深化批 B1（天赋池设计 §七）：epic 角标 / 机制词条角标 / 羁绊徽标 */
    'creation.talent.epic': '史诗',
    'creation.talent.mech': '机制',
    'creation.talent.synergy': '羁绊',
    'creation.talent.hint': '创角阶段可无限免费重抽，确认后永久锁定',
    'creation.back': '返回上一步',
    /* 天赋字段标签（通用兜底，世界词表覆盖为世界观名） */
    'talent.field.qiRate': '主资源产出', 'talent.field.qiCap': '积累上限',
    'talent.field.offlineEff': '离线收益', 'talent.field.stonesRate': '货币获取',
    'talent.field.combatSpeed': '战斗速度', 'talent.field.combatPower': '战斗力',
    'talent.field.dropRate': '装备掉落', 'talent.field.gearLuck': '装备品阶',
    'talent.field.artsSpeed': '技能修炼', 'talent.field.shopCost': '商店价格',
    'talent.field.eventRate': '奇遇频率', 'talent.field.eventLuck': '奇遇运势',
    'talent.field.realmCost': '突破需求', 'talent.field.tribBonus': '渡劫成功率',
    'talent.field.tribFailLossMod': '渡劫失败损失', 'talent.field.killStones': '击杀货币',
    /* 系统深化批 A1/A2：§三 字典补录字段 + 机制挂点键标签（天赋池设计 §三·补 注记 4——
     * 标签自带条件句式；yufeng 乘算型由 effectsToText 渲染「×乘数」句式，不走百分比） */
    'talent.field.checkBonus': '奇遇判定成功率', 'talent.field.attrBonusAmp': '机缘属性收益',
    'talent.field.on_bottleneck_power': '瓶颈状态时战力', 'talent.field.shikui': '瓶颈状态时战力',
    'talent.field.yufeng': '瓶颈间隔', 'talent.field.on_kill_drop': '击杀后追加掉落',
    'talent.field.on_trib_next': '渡劫失败后下次成功率', 'talent.field.mingwang': '渡劫失败损失减免',
    /* 临时增益图标行（系统深化批 B2）：来源溯源名（buff.source → 显示名；未登记来源只显示字段数值） */
    'buff.shield': '护佑 ×{n} 层',
    'buff.src.tribSuccess': '破境高光',
    'buff.src.tribStreak': '劫伤',
    'buff.src.factionWar': '声威大振',
    'buff.src.bond': '同门来助',
    'buff.src.chu': '冥佑',
    /* ── 系统页 Tab（世界无关）：combat/arts/gear/shop 页签名走世界 system 词；
     *    游戏页 Tab 名（tab.idle / tab.event）改由世界分卷**拥有**——菜单描述随世界包载入，
     *    见「世界包词族契约」（§二 must 族 tab.）。common 不再兜底游戏页 Tab 名。 ── */
    'tab.log': '日志', 'tab.settings': '设置',
    /* 渐进式系统解锁播报（渐次解锁批 §C3 · realm.js 渡劫成功点消费，跨世界通用） */
    'meta.unlock.tab': '新境界开启新天地：「{name}」已可进入',
    'log.catted': '[{cat}] {text}', 'log.empty': '暂无日志', 'log.cat.all': '全部',
    /* 设置页（重置存档） */
    'settings.save.title': '存档',
    'settings.save.now': '当前：{name} · {world} · {realm}',
    'settings.reset': '重置存档', 'settings.reset.btn': '重置',
    'settings.reset.desc': '清空当前道途，回到入世创角',
    'settings.reset.note': '重置会清空道号、天赋、境界、洞府、法器、法宝与全部日志，且不可撤销。',
    'settings.reset.confirm': '确定重置存档？此操作不可撤销，将回到入世创角。',
    /* 清除临时 buff（体验批 v2.4）：清空 ws.buffs（增益/减益/护盾层），不动其他角色数据 */
    'settings.clearbuffs': '清除全部状态',
    'settings.clearbuffs.desc': '一键清空当前所有临时状态（增益、减益与护盾层）',
    'settings.clearbuffs.btn': '清除',
    'settings.clearbuffs.confirm': '确定清除当前全部状态？增益与减益将一并清除。',
    'settings.clearbuffs.log': '静室涤尘，一身增益减益尽数散去',
    'settings.auto.title': '自动渡劫',
    'settings.auto.desc': '关闭时修为圆满不会自行突破，需在修行页点「渡劫」',
    'settings.auto.on': '已开启', 'settings.auto.off': '已关闭',
    /* 自动区（自动批）：两开关自设置页迁入修行页底部；自动奇遇为新增 */
    'idle.auto.sec': '自动',
    'settings.autoevent.title': '自动奇遇',
    'settings.autoevent.desc': '触发奇遇时自动择一路抉择并结算，不再弹出询问',
    'event.auto.resolved': '奇遇「{name}」已自动抉择 · {branch}',
    /* 奇遇倾向（体验批）：自动抉择时的分支偏好；选项复用 branch 名，none 另起 */
    'settings.eventpref.title': '奇遇倾向',
    'settings.eventpref.desc': '自动抉择时优先选该倾向的分支；该分支不可选则随机其他分支。',
    'event.pref.none': '无倾向',
    'event.pref.right': '正道', 'event.pref.evil': '魔道', 'event.pref.neutral': '左道',
    'settings.taborder.title': '菜单顺序',
    'settings.taborder.desc': '「日志」「设置」固定在底部；其余游戏页可上下调整。',
    'settings.taborder.up': '上移', 'settings.taborder.down': '下移',
    'settings.about.title': '关于',
    'settings.about.body': '三千世界 · 多世界放置修仙。离线照常结算，回来收功即可。',
    'sys.tag': '系统', 'break.tag': '突破',
    'ui.time.hm': '{h}时{m}分', 'ui.time.m': '{m}分钟', 'ui.time.d': '{d}天{h}时',
    'ui.time.game.yd': '{y} 游戏年 {d} 游戏日', 'ui.time.game.d': '{d} 游戏日',
    'ui.kills': '累计击杀 {n}', 'ui.total': '累计产出 {n}',
    /* 角色浮层 */
    'role.title': '角色', 'role.attrs.title': '三维',
    'attr.part.base': '境界基础', 'attr.part.arts': '功法滋养', 'attr.part.gear': '装备滋养',
    'attr.part.event': '平生悟道', 'attr.part.buff': '临时增益',
    'attr.dc': '中等判定线 {n}',
    /* karma 浮层（档位名走世界词表 karma.tier.*） */
    'karma.value': '{sys} {n}', 'karma.next': '距「{tier}」还需 {n}', 'karma.maxed': '已至档位极处',
    /* 装备 */
    'gear.score': '评分 {n}', 'gear.req': '需境界：{realm}', 'gear.empty': '尚无此件',
    'gear.stash': '库藏阁（{n}/{cap}）', 'gear.latest': '最近拾得',
    'toast.gear.replace': '拾得 {name}（{tier}）→ 已替换旧件，炼化 +{n} {cur}',
    'toast.gear.refine': '拾得 {name}（{tier}）→ 已炼化 +{n} {cur}',
    'toast.gear.stash': '拾得 {name}（{tier}）→ 境界不足，已收入库藏阁',
    'toast.gear.stashfull': '库藏阁已满，炼化 {name} +{n} {cur}',
    'toast.gear.tierup': '福缘凝华：{name}（{tier}）品阶上浮！',
    'toast.gear.exhold': '拾得 {name}（{tier}）→ 独占法器在位，已入库藏阁，手动替换需确认',
    /* 库藏阁处置（道具处置打磨包）：手动炼化出口 */
    'gear.refine.btn': '炼化 +{n}', 'gear.refine.title': '炼化此件',
    'gear.refine.confirm': '确认炼化「{name}」（{tier}）？返还 {n} {cur}，此件将从库藏阁移除。',
    'toast.gear.salvage': '炼化 {name}（{tier}）+{n} {cur}',
    /* 功法 */
    'arts.slots': '修习槽 {n}/{cap}', 'arts.shelf': '待修习架 {n}/{cap}',
    'arts.empty': '虚位以待', 'arts.equip': '装入', 'arts.unequip': '移出',
    'arts.upgrade': '升级', 'arts.cost': '{n}', 'arts.max': '满级',
    'arts.lack': '需：{req}', 'arts.learned': '{name} 修炼有成，已入门',
    'arts.autoslot': '{name} 已自动入修习槽',
    'arts.lv': 'Lv{n}', 'arts.special': '签名', 'arts.reset': '待重修',
    'arts.main': '主修', 'arts.main.empty': '主修虚位',
    /* 功法处置（道具处置打磨包）：已入门 → 散功、架上未入门 → 弃置 */
    'arts.salvage': '散功', 'arts.discard': '弃置',
    'arts.salvage.confirm': '确认{act}「{name}」？返还 {n} {cur}，此功法将从你的道途中抹去。',
    'arts.salvage.lock': '初始自带 · 不可散功',
    'arts.salvaged': '{name} 已散功，得 {n} {cur}',
    'arts.shelffull': '待修习架已满，{name} 折算 {n} {cur}',
    /* 功法精通（原「练习度」，精通批更名）：槽内在线增长，满值顿悟 Lv+1
     * （主修最快，闭关易悟/历练难悟；增速随等级递减——低阶快、高阶慢） */
    'arts.practice': '精通 {p}%',
    'arts.practice.hint': '低阶领悟快、高阶领悟慢；主修最快，闭关易悟、历练难悟',
    'arts.insight': '{name} 精通圆满，顿悟突破至 Lv{lv}',
    /* 自行领悟（自悟批 · 需求 §2）：修持中随机领悟市面传承功法（黄/玄/地阶），
     * 闭关易悟、历练难悟，离线潜心悟道亦可缓进；进度满（保底）必得一部，
     * 天阶与专属渠道功法不入此池 */
    'arts.selflearn': '于静修中自行领悟《{name}》',
    'arts.selflearn.sec': '自 行 领 悟',
    'arts.selflearn.cands': '可领悟 {n} 部',
    'arts.selflearn.pct': '自悟进度 {p}%',
    'arts.selflearn.hint': '修持中随机领悟市面传承功法（黄/玄阶；闭关易悟、历练难悟）；越悟越难，离线潜心悟道亦可缓进；进度满必得一部',
    'arts.selflearn.none': '当前无可自悟之功法（已尽数持有，或境界未达）',
    /* 升级消耗口径（修行状态批）：Lv0-9，消耗修为而非灵石 */
    'arts.upgrade.qi': '升级 · {n} {res}',
    /* 功法页改版（走查 v2.5 §4）：已学会/待修习架独立节 + 图鉴化 */
    'arts.sec.known': '已 学 会',
    'arts.known.empty': '尚未学会任何功法——去坊市求一部，或等一场奇遇。',
    'arts.shelf.empty': '架上空空',
    'arts.codex.title': '功 法 图 鉴',
    'arts.codex.known': '已学会 · Lv{lv}',
    'arts.codex.shelf': '待复检 · 要求未达',
    /* 已学会卡增益行（走查 v2.7 §3） */
    'arts.gain.zero': '入门未修持 · 尚无增益',
    'arts.gain.perslot': '+{p}%/级',
    /* 功法升级（v2.3 日志「功法」分类）模板：升级成功即记，含消耗修为口径 */
    'arts.upgraded': '{name} 修习精进，升至 Lv{lv}（耗{res} {n}）',

    /* ── 法与器合并页（页面整合批 2026-10-06 · UI 卷 §3.4a）──────────────────
     * 原「功法」「法器」两个 Tab 并为一页（tab id 沿用 `arts`，导航 13 → 12 项）：
     * 导航标签 + 页首概览条三格 + 两段段标。合并页取三字标签「法与器」以窄屏导航
     * 横向滚动修复为前提（同批顺手修，见 UI 卷 §3.1）。
     * ⚠️ `skill.system`（功法）与 `gear.system`（法器）**保留不动**——它们仍是日志页
     * 分类筛选标签（view 日志分类表 `{id:'arts',sys:'skill.system'}` /
     * `{id:'gear',sys:'gear.tag'}`），改它们会连带改日志分类语义。 */
    'arts.system': '法与器',
    /* ① 概览条 `.laware`：一行三格，点格锚跳到对应段——合并页存在的理由 */
    'arts.ov.main': '主修',
    'arts.ov.main.none': '虚位以待',
    'arts.ov.main.val': '{name} · Lv{lv}',
    'arts.ov.gear': '佩器',
    'arts.ov.gear.val': '{n}/{total} · 抗 {r}',
    'arts.ov.power': '战力',
    /* ②④ 段标 `.secdiv`：分隔「法」「器」两段（单字大字 + 一句副标） */
    'arts.seg.fa': '法',
    'arts.seg.fa.sub': '功法主修，攻伐之本',
    'arts.seg.qi': '器',
    'arts.seg.qi.sub': '法器护身，择优自佩',
    /* 游戏历（v2.3）：{name} = 世界名去尾字（罗云州 → 罗云）；1 游戏日 = 现实 1 秒，360 日/年 */
    'calendar.date': '{name}历{y}年{m}月{d}日',
    /* 秘境 */
    'zone.sec': '秘境',
    'zone.current': '进行中', 'zone.cleared': '已首通', 'zone.locked': '未解锁 · {realm}',
    'zone.clearedsec': '已 首 通 · 可 回 访',
    'zone.prog': '进度 {n}%', 'zone.need': '需求战力 {n}', 'zone.stones': '{n}/杀',
    'zone.enter': '切换到此', 'zone.firstclear': '首通奖励',
    'zone.autoadvance': '首通牵引 · 前往「{to}」继续历练',
    'zone.autoadvance.hint': '「{to}」已解锁 · 战力尚缺，先在此历练',
    /* 域主精英战（数值详设 §2.6 · 系统深化批 A4）：首通 → 现世 → 挑战 → 胜利才推进 */
    'zone.boss.appear': '域主现世——「{zone}」之主察觉了秘境之变',
    'zone.boss.tag': '域主现世',
    'zone.boss.dead': '域主已斩',
    'zone.boss.challenge': '挑战域主',
    'zone.boss.need': '域主线：战力 {need}（{m}×）',
    'zone.boss.win': '斩杀「{zone}」域主！得 {gear}，灵石 +{stones}',
    'zone.boss.lose': '不敌域主，败退而出——调息十息可再战（10 分钟）',
    'zone.boss.cd': '伤势未复：{t} 后可再战',
    'zone.boss.reward': '斩主之赏：品阶上浮两档必掉 + 灵石 ×10',
    /* 探宝残片（数值详设 §2.7 · 系统深化批 A4）：分区计数 20 片一兑 */
    'zone.shard.name': '秘境残片',
    'zone.shard.prog': '残片 {n}/{need}',
    'zone.shard.exchange': '兑换',
    'zone.shard.pick': '择一为赏',
    'zone.shard.pick.fac': '洞府设施图纸',
    'zone.shard.pick.intel': '功法情报',
    'zone.shard.fail': '残片不足（{n}/{need}）',
    'zone.shard.pill': '残片兑丹：得「{name}」',
    'zone.shard.gear': '残片开匣：得 {name}',
    'zone.shard.fac': '图纸落成：「{cave}」{fac} 营进一级',
    'zone.shard.intel': '古洞遗册：带出了《{name}》的情报',
    'zone.shard.stones': '先天尽藏，折为灵石 +{n}',
    'zone.shard.done': '残片兑换完成',
    /* 区域词缀（数值详设 §2.5 · 系统深化批 A4）：名与效果描述为世界风味 → affix.{id}.* 在世界分卷 */
    'zone.affix.title': '天时',
    'zone.affix.line': '天时：{name} · {desc}',
    'zone.affix.left': '余 {t}',
    'zone.affix.none': '天时平平',
    'zone.affix.seclude': '闭关不涉天时（词缀只作用历练战斗）',
    'zone.cavelink': '福地「{name}」以此为凭', 'zone.cavelink.locked': '首通可开福地',
    'zone.pw.ok': '战力富余 {p}%', 'zone.pw.tight': '战力压线 {p}%', 'zone.pw.bad': '战力不足，差 {n}',
    /* 商店 */
    'shop.refresh': '刷新（{n}）', 'shop.restock': '{t}后补货', 'shop.sold': '已售罄',
    'shop.buy': '购入', 'shop.price': '{n}', 'shop.qiprice': '修为 {p}',
    'shop.confirm': '确认购入「{name}」？价格 {price}', 'shop.owned': '已持有',
    'shop.blackHint': '价高三成，慎入',
    'zone.unknown': '？？？',
    'gear.stat.atk': '攻击', 'gear.stat.resist': '渡劫抗性',
    /* 渡劫演出（F7：悬念 1s 不可跳 + 成败帧带损失明细/成算复盘） */
    'trib.skip': '点击任意处继续', 'trib.attempts': '第 {n} 次渡劫',
    'trib.manual.ready': '修为圆满 · 可渡劫', 'trib.manual.btn': '渡劫',
    'trib.manual.hint': '自动渡劫已关闭，需自行点按渡劫',
    'trib.suspense': '劫云压顶，天雷欲落——',
    'trib.result.win': '雷歇云散 · 渡劫功成', 'trib.result.lose': '天雷加身 · 道基受创',
    'trib.loss.line': '修为损失 {p}%', 'trib.recap.line': '劫前成算 {p}% · 第 {n} 次渡劫',
    /* 渡劫演出重做批：结果帧数据行标签（成算环 + 数据行陈列） */
    'trib.row.p': '劫前成算', 'trib.row.loss': '修为损失', 'trib.row.n': '渡劫次数',
    /* 问道初心（创角屏 2 · F1） */
    'creation.bias.title': '问道初心',
    'creation.bias.hint': '初心决定道心的偏向，不锁死此后每一次抉择。',
    'creation.bias.right': '守正而行', 'creation.bias.right.desc': '以善为路：福缘深厚，渡劫安稳，修行稍缓。',
    'creation.bias.neutral': '红尘自在', 'creation.bias.neutral.desc': '不善不恶，随心不逾：万事持平，无得无失。',
    'creation.bias.evil': '夺化养己', 'creation.bias.evil.desc': '修行迅捷、战力凶悍：业障深重，劫数愈险。',
    'creation.talent.lockSummary': '入定摘要', 'creation.bias.label': '初心',
    /* 奇遇页（F2：叙事流 + 图鉴 + 系统日志弹层）——tab.event 由世界分卷拥有（词族契约） */
    'event.page.progress': '图鉴 {n}/{total}',
    'event.feed.title': '近来奇遇', 'event.feed.empty': '尚无奇遇记录——时辰到了，缘分自来。',
    'event.feed.more': '展开全部 {n} 条', 'event.feed.less': '收起',
    'event.codex.title': '奇遇图鉴', 'event.codex.unknown': '？？？', 'event.codex.unseen': '未遇',
    'event.codex.sec': '{tier} {n}/{total}',
    'event.badge.special': '特', 'event.badge.once': '缘', 'event.badge.exGear': '宝', 'event.badge.exArt': '法',
    'log.title': '系统日志',
    /* 抉择模态与结果页（F3：karma 不预告 · 缺项置灰 · 判定演出） */
    'event.modal.judging': '天机推演…',
    'event.modal.foot': '必须选择 · 无倒计时 · 点遮罩不关闭',
    'event.check.odds': '成算 · {odds}',
    'event.check.cost.stones': '花费约 {n} {cur}', 'event.check.cost.qi': '耗当前{res} {p}%',
    'event.check.type.attr': '{attr}判定', 'event.check.type.karma': '道心判定',
    'event.check.type.align': '业位判定', 'event.check.type.stones': '灵石花费',
    'event.check.type.qi': '修为消耗', 'event.check.type.art': '功法判定',
    'event.check.type.gear': '法器判定', 'event.check.type.power': '战力判定',
    'event.branch.lack': '不足：{req}',
    'event.result.title': '缘已定', 'event.result.pass': '判定得成', 'event.result.fail': '判定失利 · 收益折半',
    'event.exclusive.title': '宝物认主', 'event.exclusive.art': '道统传人',
    'event.exclusive.hint': '独占之珍不参与自动择优，替换须亲手确认。',
    /* ── 批 2 · 四柱 chip 行（B1）：财/法/地 激活，侣位灰置（批 3 解锁）── */
    'pillar.cai': '财', 'pillar.fa': '法', 'pillar.di': '地', 'pillar.lv': '侣',
    'pillar.lv.locked': '虚位以待',
    'pillar.cai.sub': '收 {inn} · 支 {out}',
    'pillar.fa.sub': '{name} Lv{lv}',
    'pillar.fa.empty': '主修虚位',
    'pillar.di.sub': '{name} ×{mult}',
    /* ── 批 2 · 财柱此生总账浮层（B2）── */
    'ledger.title': '此生总账',
    'ledger.ident': '{start} + 收 {inn} − 支 {out} = 现存 {now}',
    'ledger.identnote': '灵石只此一条恒等式；分类只增不清，跨渡劫不归零。',
    'ledger.in.title': '收 · 五路', 'ledger.out.title': '支 · 五路',
    'ledger.cat.kill': '秘境击杀', 'ledger.cat.event': '奇遇所得',
    'ledger.cat.refine': '炼化返还', 'ledger.cat.offline': '闭关引灵',
    'ledger.cat.cave': '洞府入驻', 'ledger.cat.arts': '功法升级',
    'ledger.cat.shop': '坊市购入', 'ledger.cat.event_loss': '奇遇损耗',
    'ledger.cat.donate': '供奉香火',
    'ledger.cat.tribute': '弟子供奉',   /* 自立门户卷 §9.3：Ledger 唯一新增一路 in.tribute（总账九路→十路） */
    'ledger.share': '占 {p}%',
    'ledger.dir.in': '收', 'ledger.dir.out': '支',
    'ledger.field': '{dir} · {cat}',
    'ledger.empty': '尚无流水——去秘境历练，或等一场奇遇。',
    'ledger.epitaph.1': '白手起家，账上还没攒热过一灵石。',
    'ledger.epitaph.2': '散修起家，一灵石一灵石攒出来的。',
    'ledger.epitaph.3': '财可通神，洞天福地皆已易主。',
    /* ── 批 2 · 地柱洞府浮层（B3）── */
    'cave.title': '洞天福地',
    'cave.page.dex': '洞天福地图鉴',
    'cave.cur': '当前驻留：{name} · 修为 ×{mult}',
    'cave.cd': '迁居冷却：{t} 后方可再迁',
    'cave.cd.ready': '可随时迁居',
    'cave.state.cur': '驻留中 · 签名生效', 'cave.state.own': '已持有',
    'cave.state.enter': '入驻', 'cave.state.move': '迁居', 'cave.state.lack': '资格未足',
    'cave.sig': '签名 · {name}：{eff}',
    'cave.sig.none': '无签名效果',
    'cave.req.realm': '{realm} 起', 'cave.req.zone': '首通「{zone}」',
    'cave.req.stones': '灵石 {n}', 'cave.req.free': '初始自带 · 免费',
    'cave.story.locked': '灵气叙事，入驻后方可阅',
    'cave.story.open': '收起叙事', 'cave.story.show': '观其灵气',
    'cave.confirm.title': '入驻「{name}」',
    'cave.confirm.pay': '修为 ×{from} → ×{to}（{delta}）· 一次付清灵石 {cost}',
    'cave.confirm.free': '修为 ×{from} → ×{to}（{delta}）· 已持有，迁居免费',
    'cave.confirm.cd': '迁居后 {y} 游戏年内不可再迁',
    'cave.delta.up': '+{p}%', 'cave.delta.down': '−{p}%',
    'cave.enter.ok': '已迁入「{name}」，修为 ×{mult}',
    'cave.enter.fail.cooldown': '迁居冷却未过',
    'cave.enter.fail.realm': '境界不足',
    'cave.enter.fail.zone': '秘境未首通',
    'cave.enter.fail.stones': '灵石不足',
    'cave.enter.fail.same': '已驻留此处',
    'cave.enter.fail.unknown': '此处福地不存在',
    'cave.enter.fail.obtain': '缘法未至——此处福地不售灵石，只认修行',
    'cave.time.dhms': '{d}天 {h}:{m}:{s}', 'cave.time.hms': '{h}:{m}:{s}',
    /* ── G17 江湖传闻（传闻设计卷 v1.0）：茶楼口吻模糊转述模板 ×30 + 地点池 ×8；
     * 世界分卷可按 key 覆写（三级回落）。{place} = 地点词；不剧透事件名。 ── */
    'rumor.title': '江湖传闻',
    'rumor.empty': '江湖最近风平浪静——茶楼里连说书人都懒得上工。',
    'rumor.go': '前往查证',
    'rumor.war.go': '前去应战',
    'rumor.ttl': '{t} 后作罢',
    'rumor.ttl.soon': '即将作罢 · {t}',
    'rumor.expired.grey': '时过境迁',
    'rumor.busy': '先了结眼前事，再去追江湖',
    'rumor.gone': '这条传闻已无从查证',
    'rumor.badge.via': '闻',
    'rumor.log.fresh': '茶楼酒肆间起了新传闻——听说{place}不太平',
    'rumor.log.trigger': '循着传闻寻至，果然撞见了「{name}」',
    'rumor.log.expired': '你闭关期间，{k} 桩江湖旧事已随风而去',
    'rumor.place.1': '坊市一带',
    'rumor.place.2': '黑风寨左近',
    'rumor.place.3': '深山老林里',
    'rumor.place.4': '官道十里亭',
    'rumor.place.5': '邻县地界',
    'rumor.place.6': '野渡江面上',
    'rumor.place.7': '古战场边缘',
    'rumor.place.8': '无名荒谷',
    /* 人阶传闻（市井口吻，10 句） */
    'rumor.tpl.ren.1': '茶棚里有人压低声音：{place}最近有生面孔转悠，看着不像善类，也不像好人。',
    'rumor.tpl.ren.2': '跑江湖的货郎说，{place}这几日热闹得很，去瞧热闹的人都揣着心思。',
    'rumor.tpl.ren.3': '酒肆里赌起了盘口——{place}那桩事，究竟是福是祸，庄家自己都没底。',
    'rumor.tpl.ren.4': '隔壁桌散修喝多了，拍着桌子讲{place}的见闻，讲到一半忽然不肯说了。',
    'rumor.tpl.ren.5': '{place}来了位怪人，不问路、不投店，只在原地转圈——有人说是在等缘法。',
    'rumor.tpl.ren.6': '脚夫们传：走{place}那条道的镖队，最近都多雇了两名修士。',
    'rumor.tpl.ren.7': '坊市告示栏贴了张无头榜文，落款只画了个圈，指的像是{place}。',
    'rumor.tpl.ren.8': '说书人新编了段子，讲{place}的旧事，台下却有个老头听着听着哭了。',
    'rumor.tpl.ren.9': '有修士在{place}拾到一枚残破令符，还没捂热，就有人上门来「认领」。',
    'rumor.tpl.ren.10': '赶集的凡人都在议论：{place}的野狗昨夜集体挪了窝，畜生比人先知机。',
    /* 地阶传闻（行家口吻，10 句） */
    'rumor.tpl.di.1': '几位筑基修士联袂去了{place}，去前立了誓：事若不成，绝不透露半句。',
    'rumor.tpl.di.2': '{place}的灵气这两日乱了流向，懂行的都说——地底下有东西在吐纳。',
    'rumor.tpl.di.3': '坊市黑价榜更新：{place}方向的避尘符、伤药，一夜涨了三成。',
    'rumor.tpl.di.4': '有宗门执事乔装出现在{place}附近，采买干粮却用了官印银票，露了马脚。',
    'rumor.tpl.di.5': '传闻{place}夜半有剑鸣，三个胆大的散修循声而去，回来的只剩两个。',
    'rumor.tpl.di.6': '丹师行会贴出悬赏：{place}所产的一味药引，收价翻倍，来路不问。',
    'rumor.tpl.di.7': '{place}上空连日盘着一朵不走的云，观星的说那不是云。',
    'rumor.tpl.di.8': '走南闯北的风媒放话：{place}这桩机缘，金丹以下莫伸手，伸手必见血。',
    'rumor.tpl.di.9': '有人在{place}见到一件出世法器自行择主，围观者众，得主者无人识得。',
    'rumor.tpl.di.10': '{place}的两拨人为争一处洞府约了斗法，赌注是各自半部残卷。',
    /* 天阶传闻（天机口吻，10 句） */
    'rumor.tpl.tian.1': '钦天监夜观星象，见一颗客星犯{place}分野——主大机缘，亦主大凶险。',
    'rumor.tpl.tian.2': '{place}方向天现异象，七日不散。老修士闭门不出，只在门上贴了「勿扰」。',
    'rumor.tpl.tian.3': '天下十三家大派同时向{place}遣了真传——这种阵仗，上一回还是百年前。',
    'rumor.tpl.tian.4': '有渡劫大能的旧识醉后失言：{place}那桩事，牵扯到一桩飞升公案。',
    'rumor.tpl.tian.5': '{place}的天地灵机在倒涌，吸得方圆千里法阵齐鸣——这是有重宝出世的征兆。',
    'rumor.tpl.tian.6': '魔道巨擘与正道魁首罕见地先后现身{place}，两人竟没有动手，各自看了半天。',
    'rumor.tpl.tian.7': '史官密录：{place}之名，与三千年前一场天门坠落的记载暗合。',
    'rumor.tpl.tian.8': '传闻{place}有仙音彻夜，闻者悟性大增，亦有闻者走火——全看各人命数。',
    'rumor.tpl.tian.9': '一封无署名的请帖在{place}周边流转，帖上只有一个时辰、一个地点。',
    'rumor.tpl.tian.10': '{place}的天机被高人搅乱了——占卜此事的三家，有两家当场折了法器。',
    /* 势力冲突情报卡（G16 联动，势力全录卷 §五） */
    'rumor.war.tpl': '急讯：「{a}」与「{b}」刀兵相见，战线就在左近——你效力若在其中，此刻正是用命之时。',
    /* ── 批 2 · 明细行（B7）── */
    'idle.cave': '洞府', 'tribulation.caveSig': '洞府签名',
    /* ── 批 2 · B4 功法页（双维分组 / 独占剪影 / 架上三态 / 待重修横幅）── */
    'ui.arts.reset_hint': '渡劫功成，功法等级归零，持有与槽位保留——重修即恢复原有效果（等级为 0 的槽位挂「待重修」金标，练回即摘）',
    /* 法柱浮层（修行页四柱「法」：只读一览修习槽内功法） */
    'arts.modal.title': '修习功法', 'arts.modal.sub': '已装备 {n}/{cap} · 第 1 位为主修',
    'arts.group.tier': '品阶', 'arts.group.align': '阵营', 'arts.group.all': '全部',
    'arts.tierchar.huang': '黄', 'arts.tierchar.xuan': '玄', 'arts.tierchar.di': '地', 'arts.tierchar.tian': '天',
    'arts.sec.tier': '待修习架 · {g}字阶', 'arts.sec.align': '待修习架 · {g}',
    'arts.sec.excl': '含独占 {n} 部（奇遇限定）',
    'arts.state.known': '已学会 · 未装槽', 'arts.state.unowned': '未获得 · 获取途径：{via}',
    'arts.state.lackline': '修习要求未达 · 需：{req}',
    'arts.lack.realm': '境界 {realm}', 'arts.lack.realmgap': '境界 {realm}（还差 {n} 层）',
    'arts.lack.attr': '{attr} ≥ {min}（当前 {cur}，相差 {gap}）',
    'arts.lack.karmaMin': '道心 ≥ +{min}（当前 {cur}，相差 {gap}）',
    'arts.lack.karmaMax': '道心 ≤ {max}（当前 {cur}，相差 {gap}）',
    'arts.req.karmaMin': '道心 ≥ +{min}', 'arts.req.karmaMax': '道心 ≤ {max}',
    'arts.obtain.initial': '初始自带', 'arts.obtain.shop': '坊市有售', 'arts.obtain.black': '黑市有售',
    'arts.obtain.zone': '首通秘境「{zone}」奖励',
    'arts.obtain.event': '奇遇可得', 'arts.obtain.event_evil': '魔道奇遇可得', 'arts.obtain.event_rare': '稀有奇遇可得',
    'arts.src.line': '来源：{via}', 'arts.req.line': '需：{req}',
    'arts.exclusive.via': '独占 · 仅天级特殊奇遇「{ev}」{branch}分支可得（遇过 ≠ 拿到）',
    'arts.dao.line': '大道方向 · 「{txt}」',
    'arts.slotpick.title': '修习槽已满——为「{name}」选择替换的一部', 'arts.slotpick.replace': '替换',
    /* ── 批 2 · B5 法宝页（百器录 / 来源行 / 独占替换 / 极品 ※）── */
    'gear.codex.title': '百器录',
    'gear.codex.banner': '已录 {n}/{total} · 特殊词条 {s}/{st} · 独占 {e}/{et}',
    'gear.codex.sec.special': '特殊词条', 'gear.codex.sec.ex': '独占法器',
    'gear.codex.hint1': '一经获得永久入录', 'gear.codex.hint2': '仅天级特殊奇遇可得',
    'gear.codex.first': '首获 · {t}',
    'gear.codex.state.worn': '佩戴中', 'gear.codex.state.stash': '在库（{name}）', 'gear.codex.state.refined': '已炼化',
    'gear.codex.via': '奇遇「{ev}」', 'gear.codex.unmet': '· 未遇',
    'gear.codex.note': '百器录为纯荣誉图鉴：入录不提供任何数值加成——它记录的不是器，是你与器的缘分。炼化不除名，标「已炼化」。',
    'gear.codex.detail': '首获于 {date}（{ago}）· {state}',
    'gear.src.zone': '来源 · 秘境 {name}', 'gear.src.event': '来源 · 奇遇「{name}」',
    'gear.src.shop': '来源 · 坊市', 'gear.src.exclusive': '来源 · 奇遇认主（独占）',
    'gear.prime': '极品词条', 'gear.prime.note': '※ 极品词条追加佩戴要求 +1 阶，生成时定格',
    'gear.lack.stash': '佩戴要求：{realm}{star} · 还差 {n} 个境界',
    'gear.ex.norefine': '不参与炼化', 'gear.ex.lock': '锁形格 · 豁免溢出炼化',
    'gear.swap.title': '独占法器手动替换',
    'gear.swap.text': '为「{nw}」换下在位独占「{cur}」？旧独占入库藏阁锁形格。',
    'gear.swap.text2': '将独占「{nw}」穿上身，「{cur}」入库藏阁？',
    'gear.swap.text3': '将独占「{nw}」穿上身？',
    'gear.swap.note': '独占法器不参与自动择优与炼化，替换不受评分高低限制，无灵石流动。',
    'gear.swap.btn': '手动替换', 'gear.swap.wear': '穿戴独占',
    'gear.sec.worn': '佩 戴 中', 'gear.sec.wornsub': '{n}/{total} · 自动择优 · 抗性合计 {r}',
    'toast.gear.exswap': '手动替换：{name}（{tier}）已穿上，旧件移入库藏阁',
    'gear.stash.hint': '境界提升自动复检',
    /* ── 批 2 · 奇遇回看浮层（交互说明 ★：图鉴格点按 = story + 首遇时间 + 上次选择）── */
    'event.recall.title': '奇遇回看 · {name}',
    'event.recall.first': '首遇 · {d}（{ago}）', 'event.recall.times': '累计相遇 {n} 次',
    'ui.qmark': '？',
    'event.recall.last': '上次抉择：{branch} · {karma}',
    'event.recall.check': ' · 判定{r}', 'event.recall.eff': '上次得失：{txt}',
    /* ── 批 2 · 相对时间（百器录首获 / 回看首遇）── */
    'ui.time.ago.now': '刚刚', 'ui.time.ago.m': '{n} 分钟前', 'ui.time.ago.h': '{n} 小时前', 'ui.time.ago.d': '{n} 日前',
    /* ── 批 2 · B3 入驻轻演出（第一次拥有才出；迁居只弹 toast）── */
    'cave.show.title': '入驻「{name}」', 'cave.show.mult': '修为 ×{mult} · 签名生效', 'cave.show.skip': '点击任意处继续',
    /* ── 批 3 · 侣柱 G14（B1~B9：chip / 名录浮层 / 详情五段式 / 提亲三形态 / 护法叙事 / 未择之路）── */
    'pillar.lv.sub': '护法·{name}{num}', 'pillar.lv.subnone': '尚未结缘',
    'bond.tiernum.1': '①', 'bond.tiernum.2': '②', 'bond.tiernum.3': '③', 'bond.tiernum.4': '④',
    'bond.title': '道友名录',
    'bond.sec.friend': '道友', 'bond.sec.spouse': '道侣候选',
    'bond.sec.count': '已结缘 {n} / {total}', 'bond.sec.countdead': '已结缘 {n} / {total} · 缘尽 {d}',
    'bond.sec.sptip': '「双」= 满档可结缘双修', 'bond.sec.spdoing': '双修中 {n}',
    'bond.badge.spouse': '双', 'bond.deadava': '缘', 'bond.guard.tag': '护法位', 'bond.fav.label': '好感度',
    'bond.spouse.form.yinyang': '阴阳双修', 'bond.spouse.form.huzhu': '互助双修', 'bond.spouse.form.luding': '炉鼎采补',
    'bond.perk.shieldval': '每七日 1 层护身符光', 'bond.perk.cur.max': '{v}（满档）',
    'bond.propose.ready': '可提亲', 'bond.propose.fail.unknown': '暂不可提亲', 'bond.propose.fail.notspouse': '非道侣候选',
    'bond.guard.line': '☂ 护法位 · {name}（{title} {num}）',
    'bond.guard.eff': '渡劫 +{b} 生效中', 'bond.guard.none': '☂ 护法位 · 无人',
    'bond.guard.low': '好感档 ≥3 方可护法',
    'bond.guard.evil': '魔道夜行，无人替你守夜（护法加项失效）',
    'bond.guard.pick': '择 护 法',
    'bond.guard.pick.hint': '点选一位道友出任护法位——仅列已结缘（好感 ≥ 1）、无绝交、无心结者；档 ≥ 3 且非魔道档位时护法加项生效。',
    'bond.guard.auto': '恢复自动（好感最高者）',
    'bond.toast.guardian': '{name} 愿为你护法',
    'bond.spouse.none': '♡ 道侣 · 尚未结缘', 'bond.spouse.nonetip': '候选好感满档可结缘双修',
    'bond.spouse.active': '♡ {form} · {name} —— {eff} 生效中',
    'bond.spouse.luding.warn': '回头即散',
    'bond.spouse.pick': '择 道 侣',
    'bond.spouse.pick.hint': '仅列当前满足结缘条件的道侣候选——点选即行提亲，形态由结缘瞬间的业力档位决定。',
    'bond.spouse.pick.empty': '暂无满足条件的候选——好感满档（100）方可提亲。',
    'bond.perk.active': '个体助力生效中 · 下一档「{title}」还需 {n} 点好感',
    'bond.perk.maxed': '个体助力生效中 · 已满档',
    'bond.fv.next': '{n}/{next}', 'bond.fv.max': '{n}/100',
    'bond.detail.perk': '个 体 助 力', 'bond.detail.flavor': '人 物 小 传',
    'bond.detail.origin': '出 身 事 件', 'bond.detail.guardlog': '护 法 记 录',
    'bond.detail.spousecond': '结 缘 条 件', 'bond.detail.back': '‹ 返回名录',
    'bond.perk.cur': '{v}（档{n}/满档 {max}）', 'bond.perk.off': '{v} → 0',
    'bond.perk.why.luding': '鼎炉被采，何暇助你（双修期间归零）',
    'bond.guard.record': '已为你护法 {n} 次 · 成功 {s} 次',
    'bond.origin.via': '出身 · 奇遇「{ev}」', 'bond.origin.go': '回看图鉴 ›',
    'bond.spousecond.text': '好感满档（100）可提亲 · 形态由结缘瞬间的业力档位决定 · 同时仅一位',
    'bond.propose.btn': '提亲 ♡', 'bond.propose.title': '提 亲',
    'bond.propose.sub': '与 {name} 结为道侣 · 形态由结缘瞬间的业力档位决定',
    'bond.form.cur': '当前可达 · {align}', 'bond.form.off': '未达 · {align}',
    'bond.form.cond.yinyang': '需道心 ≥ +200 · 跌破即解除，7 日后可重新提亲',
    'bond.form.cond.huzhu': '需 −200 < 道心 < +200 · 无维持条件，最稳',
    'bond.form.cond.luding': '需道心 ≤ −200',
    'bond.form.eff.yinyang': '主资源产出 +6% · 离线收益 +10% · 心魔类减益 −25%',
    'bond.form.eff.huzhu': '主资源产出 +10%',
    'bond.form.eff.luding': '主资源产出 +18%',
    'bond.form.cost.luding': '代价三重：道心 −20 即刻入账 · 其个体助力归零 · 回头（道心 > −200）即散，缘锁此生不再护法',
    'bond.propose.go': '结 · {form}', 'bond.propose.no': '且 慢',
    'bond.propose.foot': '结契后将全屏停留一句结缘词 · 同时只能与一位道侣双修',
    'bond.propose.fail.scar': '这段缘已被炉鼎心结锁死',
    'bond.propose.fail.occupied': '已有道侣在身', 'bond.propose.fail.cooldown': '解除后 {t} 内不可重新提亲',
    'bond.propose.fail.affinity': '好感未满档',
    'bond.spouse.dissolve.karma': '道心跌破 +200，阴阳双修缘散——七日之后，方可重新提亲。',
    'bond.spouse.dissolve.redemption': '道心回转向善，炉鼎之契应声而碎——这段缘就此锁死，此生不再护法。',
    'bond.show.title': '结契 · {form}', 'bond.show.skip': '点击任意处继续',
    'bond.toast.tier': '{name} 好感升档 · {title}',
    'bond.toast.guardian': '{name} 愿为你护法',
    'bond.toast.dissolve': '双修之契已解除',
    'bond.dead.hint': '缘尽不复结',
    'event.badge.bondlock': '绝缘',
    /* 缘尽收敛批（引擎卷 v1.10 §3.6）：轻中度背叛分支预告——不致缘尽，措辞比「绝缘」轻 */
    'event.badge.bonddrain': '情谊有裂',
    'event.check.type.companion': '道友相助', 'event.check.companion.need': '需护法档位 ≥{n}',
    'event.check.companion.none': '无人可援',
    'event.unwalked.title': '镜照未行之路',
    'event.unwalked.hint': '照世镜微光流转，照见未曾选择的分支——只显缘法轮廓，不示成败得失。',
    'event.unwalked.ex': '稀有缘法', 'bond.unwalked.bond': '♡ {name} 好感 +{n}',
    'event.unwalked.line': '{b}「{label}」',
    'idle.bond': '道友助力', 'idle.spouse': '道侣双修',
    'tribulation.guardianLine': '{name} 立于雷幕之外，为你护法',
    'tribulation.guardianSpouse': '{name}（{form}）立于雷幕之外，为你护法',
    'tribulation.guardianNone': '雷云之下，唯你一人',
    'tribulation.guardian': '护法加项', 'tribulation.guardian.none': '无人护法',
    'shop.bond.discount': '消息灵通 −{p}% 已生效', 'arts.bond.discount': '心宽 −{p}% 已生效',
    'ui.pillar.bond': '道友',
    /* 离线所得（F4：常驻面板 + 回线弹窗；明细行含离线效率拆解与奇遇时钟冻结读数）。
     * 离线 = 潜心悟道：数值按原有离线规则结算不变，*.v 系列为「离山时在外历练」的叙事变体。
     * 命名（体验批 v2.4）：标题由「闭关所得」改「离线所得」——与在线模式「闭关修炼」彻底区分。 */
    'offline.panel.title': '离线所得',
    'offline.panel.body': '离山 {t}：{res} +{qi} · {cur} +{stones} · {gate} {n} 次（成 {s} 败 {f}）',
    'offline.panel.title.v': '离线历练所得',
    'offline.panel.body.v': '游历在外 {t}：{res} +{qi} · {cur} +{stones} · {gate} {n} 次（成 {s} 败 {f}）',
    'offline.panel.detail': '离线效率 {base}% + 加成 {bonus}% → {eff}% · 上限 {cap} 小时{capNote} · 奇遇时钟冻结于 {clock}',
    'offline.cap.hit': '（已触顶）', 'offline.cap.miss': '（未触顶）',
    'ui.time.ms': '{m}分{s}秒',
    'offline.report.title': '出关呈报', 'offline.report.ok': '回山继续修行',
    'offline.report.hint': '离线期间不生奇遇，修为按离线效率累积。',
    'offline.report.hint.v': '离线期间不生奇遇，历练所得按离线效率折算。',
    /* 出关呈报数据网格标签（离线所得批：正文数字卡片化） */
    'offline.stat.dur': '离线时长', 'offline.stat.times': '次',
    'offline.stat.trib.split': '成 {s} · 败 {f}',
    'align.sym.right': '☯', 'align.sym.evil': '☠', 'align.sym.neutral': '·'
  };
  SQ.LEX.common = common; /* 供审计脚本对账 */

  /* ── 世界包词族契约（G11 · 换世界即换系统名与菜单描述）────────────────────
   * 取词三级回落：世界分卷 → common → key 本身（见 SQ.t）。
   * 本表声明「哪些键族属于**世界身份**」——live 世界必须/建议在本世界词表覆写，
   * 从而让「修行」在战争世界变成「战争」、「渡劫」变成「决战」这类整体替换成为纯数据改动。
   *
   * 机制落地：
   *   1) must 族：live 世界分卷**至少各有一条**该前缀 key（缺 = 世界包未完成，审计 C 组报错）；
   *   2) forbid 族：世界分卷**不得**出现该前缀 key（跨世界通用文案只留在 common，防世界间漂移）；
   *   3) 新增世界包时按本表逐族对照；`tab.` 等「菜单描述」族由世界包拥有，
   *      common 只保留系统页（tab.log / tab.settings）等世界无关项。
   * 审计：.tests/audit.cjs C1/C2；文档：docs/三千世界-世界包词族契约.md。 */
  SQ.LEX_CONTRACT = {
    must: [
      { fam: 'resource.', desc: '主资源 / 货币 / 战力名（修为 · 灵石 · 战力）' },
      { fam: 'realm.', desc: '阶位体系名与各阶名（境界 · 练气…真仙）' },
      { fam: 'idle.', desc: '挂机动作与状态（打坐 · 产出速率 · 下一境界）' },
      { fam: 'combat.', desc: '战斗区域体系与各区名（秘境 · 青云试炼地…界外古道）' },
      { fam: 'gear.', desc: '装备体系名 / 槽位 / 品阶（法器 · 兵刃… · 凡品…仙品）' },
      { fam: 'skill.', desc: '技能体系名与滋养（功法 · 滋养精/气/神）' },
      { fam: 'shop.', desc: '商店体系名与丹药（坊市 · 黑市 · 聚气丹…）' },
      { fam: 'event.', desc: '事件体系名与道心增减（奇遇）' },
      { fam: 'tribulation.', desc: '突破 / 试炼体系（渡劫 · 天劫将至）' },
      { fam: 'karma.', desc: '善恶体系与档位名（善恶 · 正道光环/左道/魔道气息）' },
      { fam: 'attr.', desc: '属性名与释义（精 / 气 / 神）' },
      { fam: 'world.', desc: '世界卡显示名与关键词标签（world.{id}.name / world.tag.*）' },
      { fam: 'tab.', desc: '菜单描述（游戏页 Tab 名：修行 / 奇遇）' }
    ],
    may: [
      { fam: 'cave.', desc: '洞府体系（G13，世界未启用可缺）' },
      { fam: 'bond.', desc: '道友体系（G14）' },
      { fam: 'treasure.', desc: '法宝体系（G15）' },
      { fam: 'alchemy.', desc: '炼丹炼器体系（材料 · 丹方 · 丹药 · 图纸 · 熟练度，世界未启用可缺）' },
      { fam: 'creation.', desc: '创角流程文案（缺则回落 common 通用创角词）' },
      { fam: 'talent.', desc: '天赋名与字段标签（talent.{id}.name / talent.field.*）' },
      { fam: 'log.', desc: '世界专属日志模板（log.cave.enter 等）' }
    ],
    forbid: [
      { fam: 'ui.', desc: '通用按钮 / 确认框 / 数字格式（跨世界一致）' },
      { fam: 'app.', desc: '应用名' },
      { fam: 'world.status.', desc: '世界状态角标（首发 / 混沌）' },
      { fam: 'settings.', desc: '设置页（系统级，非世界内容）' }
    ]
  };

  /* 词表注册：scope=null → common；scope=worldId → 该世界分卷（可先于 pack 注册） */
  SQ.lexRegister = function (scope, entries) {
    var target = scope == null ? common : (SQ.LEX[scope] = SQ.LEX[scope] || {});
    for (var k in entries) target[k] = entries[k];
    return target;
  };

  /* 通用随机名池兜底（世界包未提供命名池时用；文本数据，归属词表层） */
  SQ.NAMES = SQ.NAMES || {};
  SQ.NAMES.common = {
    surname: ['叶', '林', '苏', '顾', '楚'],
    given: ['长风', '清羽', '无涯', '听雪']
  };

  SQ.t = function (key, vars, worldId) {
    var s = null;
    if (worldId && SQ.LEX[worldId] && SQ.LEX[worldId][key] != null) s = SQ.LEX[worldId][key];
    if (s == null && common[key] != null) s = common[key];
    if (s == null) return key; /* 缺 key 显示 key 本身 */
    if (vars) {
      for (var k in vars) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      }
    }
    return s;
  };
})();
