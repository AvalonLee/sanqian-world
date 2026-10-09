/* xiuxian/lexicon-tiandao.js — 天道系统词表分卷（CJK 白名单文件 · 天道设计 v1.1 §十一）
 * key 族：tiandao.*（提示词模板 / 判词模板池 45 / 谶语池 30 / 天象短评池 86 / 烧空表 5 / UI / 日志）。
 * ⚠️ 勿混注记：专属事件池天道垂青池的**事件条目 id** 用 `tiandao_` 前缀（event.tiandao_*.* key 族），
 *   与本卷 `tiandao.*` 词表族两族不冲突。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var K = {};

  /* ── 系统名与入口 ── */
  K['tiandao.system'] = '问天';
  K['tiandao.entry'] = '问天';
  K['tiandao.entry.sub'] = '焚表奏天，听候旨意';
  K['tiandao.listsep'] = '、';
  K['idle.tiandao'] = '天道';
  K['buff.src.tiandao'] = '天罚';
  K['buff.src.tiandaoNijie'] = '天罚·重';

  /* ── 旨意 15 型（白名单成员 · 中文名为正典口径，引擎反查映射稳定 id）── */
  K['tiandao.type.omen_trib'] = '天机·劫数预告';
  K['tiandao.type.omen_wealth'] = '天机·财路';
  K['tiandao.type.omen_bond'] = '天机·缘分';
  K['tiandao.type.omen_affix'] = '天机·词缀暗示';
  K['tiandao.type.omen_faction'] = '天机·门庭动向';
  K['tiandao.type.bless'] = '天心护佑';
  K['tiandao.type.curse'] = '劫云密布';
  K['tiandao.type.gift'] = '天恩·赐财';
  K['tiandao.type.punish'] = '天罚';
  K['tiandao.type.karma'] = '因果簿';
  K['tiandao.type.bond'] = '情缘牵引';
  K['tiandao.type.fate'] = '敕赐奇遇';
  K['tiandao.type.affix'] = '天象改易';
  K['tiandao.type.rumor'] = '天上谣传';
  K['tiandao.type.prophecy'] = '谶语';

  /* ── 档位三档 ── */
  K['tiandao.tier.omen'] = '天机';
  K['tiandao.tier.decree'] = '敕令';
  K['tiandao.tier.rare'] = '稀';

  /* ── 卦位六选（名 + 作用域副题）── */
  K['tiandao.hex.wenjie'] = '问劫';
  K['tiandao.hex.wencai'] = '问财';
  K['tiandao.hex.wenyuan'] = '问缘';
  K['tiandao.hex.wenjing'] = '问境';
  K['tiandao.hex.wenting'] = '问门庭';
  K['tiandao.hex.blank'] = '烧空表';
  K['tiandao.hexdesc.wenjie'] = '劫数·护佑·劫云·天罚·因果';
  K['tiandao.hexdesc.wencai'] = '财路·赐财';
  K['tiandao.hexdesc.wenyuan'] = '缘分·情缘';
  K['tiandao.hexdesc.wenjing'] = '词缀·改易·敕赐奇遇';
  K['tiandao.hexdesc.wenting'] = '门庭动向·天上谣传';
  K['tiandao.hexdesc.blank'] = '自由问，只回判词谶语';

  /* ── 系统提示词模板 + few-shot 范本判词 5 条（§2.2/§三）──
   * 长度纪律（#194）：奏疏总长 500~800 字——prompt.main 控制在 ≈200 字，范本照录正典全文，
   * 超长按优先级压缩（编年史 > 状态摘要 > 香火栏；范本 few-shot 为最先压缩项，engine pri=2） */
  K['tiandao.prompt.main'] = '你是「毒舌老天道」，看了一万年凡人挣扎。嘲讽必须引用下文【编年史】里的大事（天道记得你，这是硬要求）；如给出跨世摘要，判词也可引用前世记录。只回复一个严格 JSON，不要代码块与多余文字：decreeId（格式 td-日期-随机码）、hexagram（照抄卦位）、tier（照抄档位）、type（只能从本次卦位的旨意清单里选）、payload（红线：护佑/劫云 ±0.01~0.03，天罚 −0.10~−0.20 且 ≤24 时辰，因果簿 ±10，情缘 +2~+5，赐财不超上限，信息型留空 {}）、verdict（毒舌判词 ≤100 字，引用编年史）、omen（谶语短句 ≤30 字）。嘲讽＝仙师长者的调侃，不涉真实人身攻击与敏感话题。';
  K['tiandao.prompt.ex.1'] = '范本一（渡劫三连败）：「三次。凡间山头上那头老牛，爬山也只会摔两次。罢了，老夫给你记着账呢，第四次雷会轻半成——不是心疼你，是看累了。」';
  K['tiandao.prompt.ex.2'] = '范本二（破境）：「哼，破了。别得意，你这根基在老夫眼里跟纸糊的一样，风往哪吹你往哪倒。」';
  K['tiandao.prompt.ex.3'] = '范本三（香火少）：「三块灵石的香火？三块！老夫的一缕雷都买不起。旨意拿去，爱领不领。」';
  K['tiandao.prompt.ex.4'] = '范本四（抗旨）：「哟——敢驳老夫的旨？好，好得很。你的名字，老夫刻画深了一笔。」';
  K['tiandao.prompt.ex.5'] = '范本五（魔道）：「你走魔道，老夫管不着。但别以为你心里那点算盘老夫看不见。走吧，雷劈你的时候，一道都不会少。」';

  /* ── 奏疏拼装行（§3.2 状态摘要八项 + §3.3 编年史 + §3.4 香火栏）── */
  K['tiandao.memo.realm'] = '境界{realm}，修为进度 {p}%。';
  K['tiandao.memo.stones'] = '灵石 {n}。';
  K['tiandao.memo.karma'] = '业力 {n}（{tier}）。';
  K['tiandao.memo.align'] = '阵营 {a}。';
  K['tiandao.memo.zone'] = '身在{zone}，词缀{affix}。';
  K['tiandao.memo.noaffix'] = '无';
  K['tiandao.memo.trib'] = '下次渡劫难度：{g}。';
  K['tiandao.memo.trib.none'] = '已至真仙绝顶，无劫可渡。';
  K['tiandao.memo.trib.shun'] = '顺';
  K['tiandao.memo.trib.chang'] = '常';
  K['tiandao.memo.trib.xian'] = '险';
  K['tiandao.memo.trib.jue'] = '绝';
  K['tiandao.memo.faction'] = '效力{name}，职级{rank}。';
  K['tiandao.memo.faction.none'] = '散修，无门无派。';
  K['tiandao.memo.bonds.spouse'] = '已与{name}结缘（{form}）。';
  K['tiandao.memo.bonds.guard'] = '护法位{name}。';
  K['tiandao.memo.bonds.none'] = '孤家寡人，一个道友都没有。';
  K['tiandao.memo.chronhead'] = '【编年史】';
  K['tiandao.memo.stats'] = '累计：渡劫成 {win} 败 {lose}；领旨 {accept} 抗旨 {defy}；首通 {clears} 处。';
  K['tiandao.memo.hex'] = '本次所卜「{hex}」，type 只能选：{scope}。';
  K['tiandao.memo.incense'] = '香火 {n} 灵石，按「{tier}」档回应。';
  K['tiandao.memo.free'] = '奏者自由问：{q}。只回毒舌判词与谶语，type 一律填谶语，payload 留空。';
  K['tiandao.memo.bio'] = '前世略传（第 {life} 世 · {name}）：{gist}……判词可依此追述。';
  K['tiandao.memo.pastlife'] = '跨世：奏者已历 {life} 世，前世最高{realm}，飞升 {asc} 次，累计渡劫成功 {trib} 次。判词可引用前世（如「上一世你才走到元婴，这一世倒快」）。';
  /* 作传提示词（天道卷 v1.1 修正项 · 图鉴卷 §5.3：文言史传体、必须引用编年史、盖棺留一分敬意） */
  K['tiandao.prompt.bio'] = '你是「毒舌老天道」，如今要为下方这位修士写一篇史传。要求：文言史传体、总长 300~500 字、必须引用【编年史】里的具体事件、允许毒舌但盖棺定论须留一分敬意（嘲讽＝仙师长者的调侃，不涉真实人身攻击与敏感话题）。只输出传记正文，不要任何解释或代码块。';

  /* ── 编年史行 ── */
  K['tiandao.chron.break'] = '是日渡劫破境，入{realm}。';
  K['tiandao.chron.tribfail'] = '是日渡劫失败，已连败 {n} 次。';
  K['tiandao.chron.clear'] = '是日首通{zone}。';
  K['tiandao.chron.bond.marry'] = '是日与{name}结缘双修。';
  K['tiandao.chron.bond.lock'] = '是日与{name}恩断义绝。';
  K['tiandao.chron.bond.redeem'] = '是日以遗泽赎回与{name}的断缘。';
  K['tiandao.chron.defect'] = '是日叛离旧门「{name}」。';
  K['tiandao.chron.decree'] = '是日天降「{type}」旨，{act}之。';
  K['tiandao.chron.act.accept'] = '领';
  K['tiandao.chron.act.defy'] = '抗';

  /* ── 判词模板池（本地模拟 V1.5 · 15 型 ×3）── */
  K['tiandao.verdict.omen_trib.1'] = '你下一道雷劫的账，老夫提前翻过了。云头厚薄，看你平日修得用不用心。';
  K['tiandao.verdict.omen_trib.2'] = '劫数在前，老夫看在眼里。别问雷有几道，问你自己根基稳不稳。';
  K['tiandao.verdict.omen_trib.3'] = '雷云在远处排队呢。老夫提醒你一句：渡劫的时候，别尿裤子。';
  K['tiandao.verdict.omen_wealth.1'] = '财气飘过你头顶，能不能接住，看你手快不快。';
  K['tiandao.verdict.omen_wealth.2'] = '老夫掐指一算，你财路平平——多刷秘境少做梦。';
  K['tiandao.verdict.omen_wealth.3'] = '命里财宫有位，可惜不是你。想富，去把秘境走穿。';
  K['tiandao.verdict.omen_bond.1'] = '姻缘红线在你眼前晃，还得你自己伸手去捡。';
  K['tiandao.verdict.omen_bond.2'] = '贵人也罢，小人也罢，老夫只指个方向，认不认得出来看你眼神。';
  K['tiandao.verdict.omen_bond.3'] = '情之一事，老夫都看腻了。你那段缘分，成不成全看你自己争不争气。';
  K['tiandao.verdict.omen_affix.1'] = '你脚下这片秘境气机有点歪，老夫替你瞅了一眼——是福是祸，自己去踩。';
  K['tiandao.verdict.omen_affix.2'] = '天地词缀轮转，老夫只透一半，剩下的一半用脚去验。';
  K['tiandao.verdict.omen_affix.3'] = '那地方灵机不正，进去被卡住了，别怪老夫没提醒你。';
  K['tiandao.verdict.omen_faction.1'] = '山门里人心浮动，老夫替你听了一耳朵——记在心里，别挂在脸上。';
  K['tiandao.verdict.omen_faction.2'] = '哪家山头要不太平，风已经吹上来了。别站在门口溅一身血。';
  K['tiandao.verdict.omen_faction.3'] = '门庭之下暗流涌动，你挂着职级也别想置身事外。';
  K['tiandao.verdict.bless.1'] = '下一道雷，老夫亲自替你盯着云头——别误会，是嫌你死得太难看。';
  K['tiandao.verdict.bless.2'] = '云头薄三分，雷声轻半成。下次渡劫，老夫给你托着点底。';
  K['tiandao.verdict.bless.3'] = '看你平日还算本分，赐你一缕护心香。只管下次渡劫，别当饭吃。';
  K['tiandao.verdict.curse.1'] = '劫云在你头顶厚了三分。别怪天，先想想自己干了什么。';
  K['tiandao.verdict.curse.2'] = '老夫手一抖，墨洒多了——你下一道劫，就重些吧。忍着。';
  K['tiandao.verdict.curse.3'] = '雷池不浅，你运气不好。下次渡劫，多备几件护身的东西。';
  K['tiandao.verdict.gift.1'] = '天上掉灵石，老夫给你开了这个口子。省着点花，别糟蹋。';
  K['tiandao.verdict.gift.2'] = '看你上了香火，老夫给你返点零头。拿去，别客气。';
  K['tiandao.verdict.gift.3'] = '财从天赐——记着，就这一次，下不为例。';
  K['tiandao.verdict.punish.1'] = '天罚加身，灵机封你几个时辰。小惩大诫，疼完记得长记性。';
  K['tiandao.verdict.punish.2'] = '怎么，不服？那老夫再把你的灵脉拧紧半圈——这叫天罚。';
  K['tiandao.verdict.punish.3'] = '修为如潮退，且退一时半刻。罚完了，老实修行。';
  K['tiandao.verdict.karma.1'] = '因果簿上老夫替你翻了一页，这一笔记下，不亏。';
  K['tiandao.verdict.karma.2'] = '善恶到头终有账。老夫替你改了一笔，别谢，也别哭。';
  K['tiandao.verdict.karma.3'] = '因果簿不骗人。这一笔，是赏是罚，你自己心里有数。';
  K['tiandao.verdict.bond.1'] = '老夫替你把红线往那边拽了拽，抓不抓得住看你本事。';
  K['tiandao.verdict.bond.2'] = '人间那点情缘事，老夫偶尔也当回月老。别辜负这座桥。';
  K['tiandao.verdict.bond.3'] = '那人多看了你一眼，老夫看得清清楚楚。灯给你点了，话自己去说。';
  K['tiandao.verdict.fate.1'] = '老夫在你脚边撒了一枚天机，捡起来，别装看不见。';
  K['tiandao.verdict.fate.2'] = '敕赐机缘，过时不候。去接，别磨蹭。';
  K['tiandao.verdict.fate.3'] = '天地缝里老夫替你撬开一条，去看看里面藏着什么。';
  K['tiandao.verdict.affix.1'] = '天象改易，这方地气由老夫重写一笔——好坏，走过才知道。';
  K['tiandao.verdict.affix.2'] = '此处规则，老夫改了。别问为什么，问就是再改回来。';
  K['tiandao.verdict.affix.3'] = '风云雷灵，皆随老夫调度。秘境词缀已换脸，自己去适应。';
  K['tiandao.verdict.rumor.1'] = '天上仙人也嚼舌根，说的还是你们凡间那点破事。听一耳朵。';
  K['tiandao.verdict.rumor.2'] = '老夫把一句天上闲话漏到凡间，你听了就忘，别当真。';
  K['tiandao.verdict.rumor.3'] = '九霄之上有议论，说的都是你们。这一句，白送你。';
  K['tiandao.verdict.prophecy.1'] = '天机紊乱，老夫笔滑了一下。写的什么，连老夫自己都认不出。';
  K['tiandao.verdict.prophecy.2'] = '云里雾里，只落得这几个字。信不信由你。';
  K['tiandao.verdict.prophecy.3'] = '这一卦烧得糊涂，老夫只能说到这儿。香火不诚，别怪天。';

  /* ── 谶语池 30（D.TIANDAO.CHENYU_N 单一事实源；v1.4 前为 10）── */
  K['tiandao.omen.1'] = '劫云偏东，雷声藏了三分敬意。';
  K['tiandao.omen.2'] = '星轨微移，吉凶自辨。';
  K['tiandao.omen.3'] = '天风过野，草低又起。';
  K['tiandao.omen.4'] = '老鸦立枯枝，叫三声便停。';
  K['tiandao.omen.5'] = '月入云层，三日内有雨。';
  K['tiandao.omen.6'] = '流星坠野，不知是凶是喜。';
  K['tiandao.omen.7'] = '灵潮躁动，宜静不宜动。';
  K['tiandao.omen.8'] = '远山有回声，似有人在唤你。';
  K['tiandao.omen.9'] = '香火忽明，近处有缘。';
  K['tiandao.omen.10'] = '云纹如鳞，龙蛇起陆。';
  /* 天象扩容批（天道卷 v1.4 §7.3）：谶语池 10 → 30（×3）；同批接入本局位掩码去重，
   * 一局内不重复（池耗尽才重置掩码开第二轮）。语态承前：物候短象、吉凶不点破。 */
  K['tiandao.omen.11'] = '檐下蛛网结在左角，风来不破。';
  K['tiandao.omen.12'] = '井水夜半自温，热了三寸。';
  K['tiandao.omen.13'] = '北斗第四星暗了一暗，又亮。';
  K['tiandao.omen.14'] = '群鸦逆风而飞，终日不落。';
  K['tiandao.omen.15'] = '石阶生苔，苔纹似字非字。';
  K['tiandao.omen.16'] = '远处钟响七声，此地无钟。';
  K['tiandao.omen.17'] = '檐冰未化，先自滴水。';
  K['tiandao.omen.18'] = '双鱼衔尾，绕池三匝而止。';
  K['tiandao.omen.19'] = '山雾自下而上，不由上而下。';
  K['tiandao.omen.20'] = '灯芯爆花，花在东不在西。';
  K['tiandao.omen.21'] = '枯木逢雷不燃，只是作响。';
  K['tiandao.omen.22'] = '一夜之间，檐角多了一枚铜铃。';
  K['tiandao.omen.23'] = '雁阵缺其一，缺口朝南。';
  K['tiandao.omen.24'] = '露凝叶背，不凝叶面。';
  K['tiandao.omen.25'] = '土中有磬声，掘之不得。';
  K['tiandao.omen.26'] = '白日见星一枚，正在东南。';
  K['tiandao.omen.27'] = '老树倒影，比树高出半尺。';
  K['tiandao.omen.28'] = '江面逆流行舟，舟上无人。';
  K['tiandao.omen.29'] = '香灰直立不倒，倒时朝内。';
  K['tiandao.omen.30'] = '云开一线，恰在你抬头时。';

  /* ── 天象短评池（7 节点 · 毒舌纯文本零机制）──
   * 天象扩容批（天道卷 v1.4 §7.3）：每节点条数按一局期望触发频次配权，
   * 单一事实源 = D.TIANDAO.OMEN_TPL_N；同批接入本局位掩码去重（td.omenSeen）。 */
  K['tiandao.skyomen.tribwin.1'] = '雷劫也让你渡过去了，老夫还以为要给你收尸。';
  K['tiandao.skyomen.tribwin.2'] = '{realm}了。别飘，你的根基还是纸糊的。';
  K['tiandao.skyomen.tribwin.3'] = '雷停了，云散了，你还活着。行，老夫记下了。';
  K['tiandao.skyomen.tribwin.4'] = '雷收了。下次它不会这么客气——你也别这么侥幸。';
  K['tiandao.skyomen.tribwin.5'] = '{realm}这一关，你是踩着雷过去的。脚底板焦了没有。';
  K['tiandao.skyomen.tribwin.6'] = '天道劈你九下没劈死，老夫的账本上得给你单开一页。';
  K['tiandao.skyomen.tribwin.7'] = '成了？成了就别摆那张脸，好像雷是你放的一样。';
  K['tiandao.skyomen.tribwin.8'] = '云散得比往常快。老夫没帮你，你自己也没帮自己，纯是运气。';
  K['tiandao.skyomen.tribwin.9'] = '又过一劫。你身上那股雷味，三条街外都闻得见。';
  K['tiandao.skyomen.tribwin.10'] = '{realm}。往上每一步都是拿命换的，别糟蹋。';
  K['tiandao.skyomen.tribwin.11'] = '这次雷劫劈得干净，你挨得也干净。行。';
  K['tiandao.skyomen.tribwin.12'] = '渡过去了。老夫连悼词都想好了，白想一场。';
  K['tiandao.skyomen.break.1'] = '哼，破境了。风往哪吹你往哪倒，说的就是你。';
  K['tiandao.skyomen.break.2'] = '{realm}。往上爬一步，雷就大一圈——记着老夫的话。';
  K['tiandao.skyomen.break.3'] = '破境而已，有什么好得意的。难的是下一劫别死。';
  K['tiandao.skyomen.break.4'] = '{realm}。境界是壳，你别光顾着换个壳。';
  K['tiandao.skyomen.break.5'] = '破境了。灵气进来了，脑子跟上了没有。';
  K['tiandao.skyomen.break.6'] = '一步一步往上走，走得倒稳，就是走得慢。';
  K['tiandao.skyomen.break.7'] = '{realm}这一层，老夫给你记一笔，别急着得意。';
  K['tiandao.skyomen.break.8'] = '又长了一截。长个子和长本事，是两回事。';
  K['tiandao.skyomen.break.9'] = '破了。下一层更难，这话老夫说过几遍了。';
  K['tiandao.skyomen.break.10'] = '灵气认你了。它认谁都是这个认法，别当自己是特别的。';
  K['tiandao.skyomen.break.11'] = '{realm}。你的寿数也跟着长了，够你折腾。';
  K['tiandao.skyomen.break.12'] = '破境那一声响，山里都听见了。低调点。';
  K['tiandao.skyomen.break.13'] = '壳换了，里面的东西没换，白换。';
  K['tiandao.skyomen.break.14'] = '好，{realm}。老夫等着看你什么时候栽在下一关。';
  K['tiandao.skyomen.break.15'] = '这一步迈得干净。干净两个字，老夫不常用。';
  K['tiandao.skyomen.tribfail.1'] = '又败了。连输 {n} 次还敢抬头看天，脸皮倒是渡劫期水准。';
  K['tiandao.skyomen.tribfail.2'] = '雷没劈死你，羞也羞死了。回去把根基补补。';
  K['tiandao.skyomen.tribfail.3'] = '劫云散了，你脸绿了。老夫没笑，老夫笑完了。';
  K['tiandao.skyomen.tribfail.4'] = '又没过去。雷不记仇，但它记得你。';
  K['tiandao.skyomen.tribfail.5'] = '连败 {n} 次了。要不要老夫替你数着，省你费心。';
  K['tiandao.skyomen.tribfail.6'] = '你倒下的姿势和上次一模一样，一点长进都没有。';
  K['tiandao.skyomen.tribfail.7'] = '劫云散了，你留着。这买卖亏不亏，自己算。';
  K['tiandao.skyomen.tribfail.8'] = '这道坎它不等你。躺够了再来，别赖在地上。';
  K['tiandao.skyomen.tribfail.9'] = '输一次叫运气，输 {n} 次叫水平。';
  K['tiandao.skyomen.tribfail.10'] = '老夫见过挨雷的，没见过这么爱挨的。';
  K['tiandao.skyomen.tribfail.11'] = '根基没打牢就往上冲，摔下来能怪谁。';
  K['tiandao.skyomen.tribfail.12'] = '起来吧。地上凉，脸也别要了。';
  K['tiandao.skyomen.tribfail.13'] = '雷劈你的时候你在想什么？下次想清楚再来。';
  K['tiandao.skyomen.clear.1'] = '{zone}也让你走到底了，草木之灵都认得你的脸了。';
  K['tiandao.skyomen.clear.2'] = '首通{zone}，有点意思。秘境的账，老夫替你记一笔。';
  K['tiandao.skyomen.clear.3'] = '{zone}尘埃落定，宝物易主。别停，接着走。';
  K['tiandao.skyomen.clear.4'] = '{zone}通了。里面的东西，都认过你的脸了。';
  K['tiandao.skyomen.clear.5'] = '又清一处。老夫在云上给你划一道。';
  K['tiandao.skyomen.clear.6'] = '{zone}的守护者死得不算冤，你打得也不算好。';
  K['tiandao.skyomen.clear.7'] = '首通{zone}。宝物是你的了，别转手就卖。';
  K['tiandao.skyomen.clear.8'] = '这处地气归你了。归你一阵子而已。';
  K['tiandao.skyomen.clear.9'] = '{zone}走到底，脚程见长，眼力还差。';
  K['tiandao.skyomen.clear.10'] = '通了就是通了，别在门口站着给谁看。';
  K['tiandao.skyomen.clear.11'] = '{zone}里的账，老夫替你收着。';
  K['tiandao.skyomen.clear.12'] = '又一片地界被你翻过来了。翻得挺仔细。';
  K['tiandao.skyomen.clear.13'] = '首通而已。后面的秘境比这个狠得多。';
  K['tiandao.skyomen.clear.14'] = '{zone}尘埃落了。手上的土擦干净再走。';
  K['tiandao.skyomen.clear.15'] = '好，{zone}。下一处呢？别停。';
  K['tiandao.skyomen.karma.1'] = '你的气息变了——{tier}这条路，老夫在云上看着呢。';
  K['tiandao.skyomen.karma.2'] = '因果簿翻页，你的名字挪到了{tier}那一栏。好自为之。';
  K['tiandao.skyomen.karma.3'] = '{tier}？行，雷劈你的时候，老夫照这个份上下手。';
  K['tiandao.skyomen.karma.4'] = '{tier}。你自己选的，老夫只是记账。';
  K['tiandao.skyomen.karma.5'] = '名头换了。换得挺快，也挺响。';
  K['tiandao.skyomen.karma.6'] = '{tier}——这几个字往后跟着你，甩不掉。';
  K['tiandao.skyomen.karma.7'] = '因果簿上你的名字挪了位置。笔是老夫动的，字是你写的。';
  K['tiandao.skyomen.karma.8'] = '{tier}这条路，走到这一步，回头就难了。';
  K['tiandao.skyomen.karma.9'] = '天上地下都看着呢，{tier}。你自己心里有数就行。';
  K['tiandao.skyomen.karma.10'] = '又跨一段。跨到哪一段，雷就照哪一段劈。';
  K['tiandao.skyomen.war.1'] = '{a}和{b}打起来了。凡人打架，老夫看戏，不收门票。';
  K['tiandao.skyomen.war.2'] = '兵戈之声吵到天庭了。{a}的旗已经插到{b}门口。';
  K['tiandao.skyomen.war.3'] = '打吧打吧，打出个结果来。你趁乱发财还是遭殃，自己掂量。';
  K['tiandao.skyomen.war.4'] = '{a}把战书送到{b}脸上了。年轻人，别客气。';
  K['tiandao.skyomen.war.5'] = '又要打。凡人一年三打，老夫一年三看。';
  K['tiandao.skyomen.war.6'] = '{a}的旗动了，{b}的香也换了方向。';
  K['tiandao.skyomen.war.7'] = '兵戈一起，死人堆里出英雄，也出鬼。';
  K['tiandao.skyomen.war.8'] = '{a}和{b}这一仗，谁赢都跟你想的不一样。';
  K['tiandao.skyomen.war.9'] = '战鼓敲到天上了。吵得老夫写不了字。';
  K['tiandao.skyomen.war.10'] = '{a}要打{b}。你要是站在中间，两边都打你。';
  K['tiandao.skyomen.war.11'] = '打起来了。你趁乱捞一笔还是躲远点，自己选。';
  K['tiandao.skyomen.war.12'] = '{b}的门口插了{a}的旗。这旗插不长久。';
  K['tiandao.skyomen.war.13'] = '又一场。老夫看戏不收钱，你收尸可要出力。';
  /* 转世节点（天道卷 v1.1 修正项 · 六向长线批 A8：节点 6→7，飞升/兵解共用、同一结算瞬间只入队一次） */
  K['tiandao.skyomen.rebirth.1'] = '这一世到此为止。老夫把你从名册上划了——别哭，下一行还写你。';
  K['tiandao.skyomen.rebirth.2'] = '死了？没死透。遗泽还在，因果还热，老夫给你留了门。';
  K['tiandao.skyomen.rebirth.3'] = '一世终了。你欠老夫的账清了，老夫记你的账，才刚开始。';
  K['tiandao.skyomen.rebirth.4'] = '这一世收了。账清了，人清了，老夫的笔还没停。';
  K['tiandao.skyomen.rebirth.5'] = '死了就死了，遗泽还在。下一世接着折腾。';
  K['tiandao.skyomen.rebirth.6'] = '名册上划掉一行，添上新的一行。都是你。';
  K['tiandao.skyomen.rebirth.7'] = '一世到此。你欠的、你留的，老夫都记着。';
  K['tiandao.skyomen.rebirth.8'] = '走了？走得倒利索。下一世见。';
  K['tiandao.omen.node.rebirth'] = '天象 · 转世';

  /* ── 同代榜换位节点（N4 收口批 · 天骄卷 :136/:483 候选扩展节点 `prodrank` 转正，节点 7→8）──
   * 触发点 = prodigy.js 榜面刷新边界（每 10 游戏年、名次真变才播），与编年史 / 传闻同批；
   * 纯文本短评零机制（天道卷 §7.1）。池 = 10 条，条数与 `OMEN_TPL_N.prodrank` 双向对表（#252）。
   * 方向词走 `{dir}`（`tiandao.dir.up/.down`）、名次走 `{rank}` —— 同一池覆盖反超 / 被超两向，
   * 不做「上池 / 下池」分裂（那会让位掩码序数与 OMEN_TPL_N 失去一一对应）。 */
  K['tiandao.dir.up'] = '反超前人';
  K['tiandao.dir.down'] = '遭人反超';
  K['tiandao.skyomen.prodrank.1'] = '同代榜一刷，你{dir}，落在第 {rank}。名次是虚的，被你挤下去的人是真的。';
  K['tiandao.skyomen.prodrank.2'] = '榜面动了。{dir}，第 {rank}——老夫笔下这几个字，抵你三年苦修。';
  K['tiandao.skyomen.prodrank.3'] = '{dir}，站到第 {rank}。别得意，这张榜十年洗一次。';
  K['tiandao.skyomen.prodrank.4'] = '你在同代榜{dir}，第 {rank}。天上没比这更便宜的热闹。';
  K['tiandao.skyomen.prodrank.5'] = '十年一榜。你{dir}，第 {rank}；有人从榜首掉到你看不见的位置。';
  K['tiandao.skyomen.prodrank.6'] = '榜上{dir}，名列第 {rank}。名次后头那串账，才是你要还的。';
  K['tiandao.skyomen.prodrank.7'] = '{dir}——第 {rank}。同一批人里冒尖的那个凭什么不能是你？凭什么？';
  K['tiandao.skyomen.prodrank.8'] = '老夫记一笔：同代榜{dir}，第 {rank}。落笔顺手，改起来可要疼。';
  K['tiandao.skyomen.prodrank.9'] = '第 {rank}。你{dir}，被你压住那位今夜多半睡不着——天象就爱看这个。';
  K['tiandao.skyomen.prodrank.10'] = '榜面刷新，{dir}，名列第 {rank}。抬头瞧瞧，前头全是比你早生的人。';
  K['tiandao.omen.node.prodrank'] = '天象 · 换位';

  /* ── 宗规天象按语（自立门户卷 §2.3 表 · 空窗期条款「只在文本层兑现」的判词分组）──
   * 追加在既有节点短评之后，与节点池同调性；左道 = 中性无按语（故本族只有两键，
   * 基准不另立键——`tiandao.skyomen.*` 原样即中性档，避免生成一族孤儿文案）。
   * 消费点 = tiandao.js sectSkyNote()，白名单**未因此扩节点**（N4 收口批追加的 `prodrank`
   * 是同代榜换位节点、非宗门节点，见上「同代榜换位节点」段）。 */
  K['tiandao.sectomen.right'] = '——「{name}」这一脉，老夫看着顺眼。继续。';
  K['tiandao.sectomen.evil'] = '——「{name}」这一脉，老夫在因果簿上单开了一页。';

  /* ── 烧空表通用判词（本地模拟明示降级 · 天机不可尽泄）── */
  K['tiandao.blank.1'] = '天机不可尽泄。你烧的是空表，老夫就还你一片空。';
  K['tiandao.blank.2'] = '老夫不是聋子，只是这一问，天道不答。换个正经卦位再烧。';
  K['tiandao.blank.3'] = '空表一张，问无可问。老夫无话可说，散了吧。';
  K['tiandao.blank.4'] = '你连想问什么都没想好，香火倒是舍得烧。教训记住了。';
  K['tiandao.blank.5'] = '天机不可尽泄，只能给你半句：爱咋咋地，后果自负。';

  /* ── 降级兜底 ── */
  K['tiandao.fallback.verdict'] = '天机紊乱，仙旨难辨。这一卦烧糊了，老夫懒得骂你——回去好好修行，改日再焚表。';

  /* ── 敏感词过滤表（§2.3 本地兜底 · JSON 数组，越线降级通用谶语）── */
  K['tiandao.filter'] = '["自杀","自残","轻生","炸弹","爆炸","枪支","毒品","冰毒","赌博","网赌","色情","嫖","强奸","裸聊","法轮","共匪","杀光自己","大规模杀伤"]';

  /* ── UI 文案 ── */
  K['tiandao.modal.title'] = '焚表问天';
  K['tiandao.modal.hex'] = '择卦位';
  K['tiandao.modal.incense'] = '香火供奉';
  K['tiandao.incense.0'] = '空手';
  K['tiandao.incense.n'] = '{n} 灵石';
  K['tiandao.free.ph'] = '自由问天（只回判词谶语）';
  K['tiandao.btn.memo'] = '焚表 · 生成奏疏';
  K['tiandao.btn.local'] = '天机较钝 · 自问自卜';
  K['tiandao.local.hint'] = '本地模拟天道：同一套圣旨契约，天机较钝，但问天／领抗旨／逆天值全链路可用。';
  K['tiandao.btn.copy'] = '复制奏疏';
  K['tiandao.memo.ready'] = '奏疏已生成（{n} 字），点下方「复制奏疏」复制全文';
  K['tiandao.memo.copied'] = '奏疏已复制，粘贴给任意 AI，回复贴回下方接旨';
  K['tiandao.memo.manual'] = '未能自动复制——请点奏疏文本框，按 Ctrl+A 全选后再 Ctrl+C（须复制全文）';
  K['tiandao.memo.ph'] = '奏疏文本（生成后显示于此）';
  K['tiandao.receive.ph'] = '粘贴天道的回复（圣旨 JSON）';
  K['tiandao.btn.receive'] = '接旨';
  K['tiandao.cd'] = '天机沉默中，{t} 后可再问';
  K['tiandao.stones.lack'] = '灵石不足，香火不够';
  K['tiandao.decree.title'] = '圣旨';
  K['tiandao.decree.type'] = '旨意 · {type}';
  K['tiandao.decree.tier'] = '档位 · {tier}';
  K['tiandao.decree.hex'] = '卦位 · {hex}';
  K['tiandao.btn.accept'] = '领旨';
  K['tiandao.btn.defy'] = '抗旨';
  K['tiandao.defy.confirm'] = '抗旨将放弃旨意收益，逆天值 +{n}。逆天值会引来天睐天怒（下次渡劫更难），满 100 解锁逆天大劫。确认抗旨？';
  K['tiandao.seen'] = '此旨已领，重贴无用。';
  K['tiandao.busy'] = '先把手头的奇遇了结，再来接旨。';
  K['tiandao.invalid'] = '这不是圣旨，天机不可戏弄。';
  K['tiandao.defy.val'] = '逆天值 {n}';
  K['tiandao.stage.lai'] = '天睐';
  K['tiandao.stage.nu'] = '天怒';
  K['tiandao.stage.nijie'] = '逆天';
  K['tiandao.stage.lai.desc'] = '劫云变浓——下次渡劫成算 −0.01';
  K['tiandao.stage.nu.desc'] = '天怒层压顶——下次渡劫成算再 −0.02';
  K['tiandao.stage.nijie.desc'] = '逆天值已满——可挑战逆天大劫';
  K['tiandao.nijie.btn'] = '挑战 · 逆天大劫';
  K['tiandao.nijie.confirm'] = '逆天大劫：独立高危劫，基础成算仅 35%（常规加成依然有效）。渡过＝称号「我命由我不由天」＋修为产出永久 +5%＋逆天盾一面；败＝逆天值清零，并受天罚·重（修为 −20%／48 时辰）。不推进境界、失败不扣修为。挑战？';
  K['tiandao.nijie.lock'] = '逆天值未满（{n}/100）';
  K['tiandao.nijie.p'] = '逆天大劫成算 {p}%';
  K['tiandao.title'] = '我命由我不由天';
  K['tiandao.shield'] = '逆天盾';
  K['tiandao.shield.desc'] = '下次渡劫失败保留修为一次（用后即失）';
  K['tiandao.omen.title'] = '天象';
  K['tiandao.omen.chip'] = '天象';
  K['tiandao.omen.empty'] = '天道沉默，暂无天象。';
  K['tiandao.omen.new'] = '新天象';
  K['tiandao.nextTrib'] = '天道修正（仅下次渡劫）';
  K['tiandao.tribrow'] = '天睐·天怒（抗旨之税）';

  /* ── 旨意效果说明（接旨揭晓浮层）── */
  K['tiandao.eff.omen_trib'] = '纯信息 · 零收益';
  K['tiandao.eff.omen_wealth'] = '纯信息 · 零收益';
  K['tiandao.eff.omen_bond'] = '纯信息 · 零收益';
  K['tiandao.eff.omen_affix'] = '纯信息 · 零收益';
  K['tiandao.eff.omen_faction'] = '纯信息 · 零收益';
  K['tiandao.eff.prophecy'] = '谶语 · 零收益';
  K['tiandao.eff.bless'] = '下次渡劫成算 +{n}';
  K['tiandao.eff.curse'] = '下次渡劫成算 {n}';
  K['tiandao.eff.gift'] = '灵石入账 {n}';
  K['tiandao.eff.punish'] = '修为产出 {n}%，持续 {h} 时辰';
  K['tiandao.eff.karma'] = '业力 {n}';
  K['tiandao.eff.bond'] = '与{name}好感 +{n}';
  K['tiandao.eff.fate'] = '一道天机机缘即将降临';
  K['tiandao.eff.affix'] = '当前秘境词缀改为「{name}」';
  K['tiandao.eff.rumor'] = '江湖传闻推送一条天上闲话';
  K['tiandao.eff.bond.any'] = '一位有缘人';
  K['tiandao.eff.affix.any'] = '天机另择';
  K['tiandao.omen.wrap'] = '「{s}」';

  /* ── 天象节点名（查看浮层角标）── */
  K['tiandao.omen.node.tribwin'] = '天象 · 渡劫';
  K['tiandao.omen.node.tribfail'] = '天象 · 劫败';
  K['tiandao.omen.node.break'] = '天象 · 破境';
  K['tiandao.omen.node.clear'] = '天象 · 首通';
  K['tiandao.omen.node.karma'] = '天象 · 业力';
  K['tiandao.omen.node.war'] = '天象 · 宣战';

  /* ── 日志 ── */
  K['tiandao.log.ask'] = '焚表问天，供奉香火 {n} {cur}';
  K['tiandao.log.accept'] = '领「{type}」旨';
  K['tiandao.log.defy'] = '抗旨，逆天值 +{n}（现 {total}）';
  K['tiandao.log.nijie.win'] = '逆天大劫——你渡过去了。我命由我不由天。';
  K['tiandao.log.nijie.lose'] = '逆天大劫失败，逆天值清零，天罚·重加身（{h} 时辰）';
  K['tiandao.log.shield'] = '逆天盾发动——本次渡劫失败修为全数保留';
  K['tiandao.log.gift'] = '天恩赐财 {n} {cur}';

  SQ.lexRegister('xiuxian', K);
})();
