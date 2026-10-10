/* xiuxian/lexicon-spirit.js — 功法融合（fuse.*）+ 法宝器灵（spirit.*）词表分卷
 * （CJK 白名单文件 · 融合器灵卷 v1.1 §十三）
 * ⚠️ 勿混注记：spirit.* 器灵判词 = 法宝私评，与天道卷 tiandao.* 判词两族构型同源但键不撞；
 * 天象触发点两族同事件源、不同展示面。自创功法名为运行态玩家数据（入存档 + 运行时注入
 * SQ.LEX 渲染），不进本静态词表文件（§4.2 纪律）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var K = {};

  /* ── 自创功法命名池（前缀 36 × 后缀 30 = 1080 组合 · 融合扩容批 v1.3 扩容）── */
  var PRE = ['太虚', '混元', '苍冥', '玄冥', '九天', '落星', '昆吾', '青冥', '幽篁', '祝融', '北辰', '飞星',
    '惊蛰', '扶摇', '潺湲', '雾隐', '天狼', '龙渊', '玉京', '玄黄', '鸿蒙', '虞渊', '悬圃', '沧溟',
    '紫霄', '青莲', '沧澜', '丹鼎', '天汉', '古衍', '盘古', '洛尘', '幽冥', '凌虚', '天枢', '炎煌'];
  var SUF = ['诀', '经', '篇', '录', '章', '典', '歌', '引', '篆', '谱',
    '法', '门', '箓', '辩', '纪', '论', '释', '图', '卷', '真解',
    '要', '印', '诰', '序', '纂', '策', '鉴', '志', '阕', '义'];
  PRE.forEach(function (w, i) { K['fuse.name.pre.' + (i + 1)] = w; });
  SUF.forEach(function (w, i) { K['fuse.name.suf.' + (i + 1)] = w; });
  K['fuse.name.dup'] = '·贰';
  /* ── 混沌淬炼（融合扩容批 v1.3 §4.4）：自创部混沌签名唯一授予通道 ── */
  K['fuse.reforge.btn'] = '混沌淬炼';
  K['fuse.reforge.cost'] = '悟道石 ×1 + {n} 灵石';
  K['fuse.reforge.confirm'] = '混沌淬炼将消耗悟道石 ×1 与 {n} 灵石（随尝试消耗，成否不退），{p}% 概率淬出混沌签名（选池随滋养属性、档位随代数，只升不降；未淬出零损失）。淬炼后冷却 1 日。淬炼？';
  K['fuse.reforge.hit'] = '混沌显化：「{name}」淬出签名「{sig}」';
  K['fuse.reforge.miss'] = '混沌未醒，「{name}」一如往昔（淬材已耗）';
  K['fuse.reforge.cd'] = '混沌之气未平（{t} 后可再淬）';
  K['fuse.reforge.poor'] = '灵石不足，淬不起这一炉';
  K['fuse.reforge.wudao'] = '无悟道石，引不动混沌';
  K['fuse.chaos.hint'] = '混沌签名为自创功法独有，淬炼引出——气养得「混沌重生」、精养得「造化余韵」、神养得「太一星光」，档位随代数（一代弱/二代标准/三代强）';
  K['fuse.custom.desc'] = '自创功法（{gen} 代）——由「{a}」与「{b}」熔铸而成，词条重组、不越正典。';

  /* ── 融合 UI 与日志 ── */
  K['fuse.system'] = '融合坛';
  K['fuse.ui.parents'] = '择两部 Lv9 功法为父本（天阶独占与三代部禁入）';
  K['fuse.ui.wudao'] = '悟道条件（二选一，随尝试消耗）';
  K['fuse.ui.wudao.med'] = '闭关累计 {h}/{need} 时辰（现实时间）';
  K['fuse.ui.wudao.stone'] = '悟道石 ×{n}';
  K['fuse.ui.p'] = '熔铸成功率 {p}%';
  K['fuse.ui.btn'] = '开炉熔铸';
  K['fuse.ui.confirm'] = '融合将消耗两部父本（等级/槽位/书阁俱失、已知态保留、不退灵石），悟道资格随尝试消耗，成败均记 3 日冷却。成功率 {p}%。熔铸？';
  K['fuse.ui.pick2'] = '择两部满级功法为父本';
  K['fuse.ui.name.ph'] = '自定义名 ≤8 字（留空则词库生成）';
  K['fuse.ui.gen'] = '{n} 代';
  K['fuse.ui.cd'] = '融合坛冷却中（{t}）';
  K['fuse.ui.customs'] = '自创功法';
  K['fuse.ui.fail.locked'] = '天阶独占不可熔铸';
  K['fuse.ui.fail.lv'] = '双亲须皆满级 Lv9';
  K['fuse.ui.fail.gen'] = '三代部禁作父本';
  K['fuse.ui.fail.wudao'] = '悟道条件未足（闭关累计 {need} 时辰·现实，或悟道石 ×1）';
  K['fuse.ui.fail.ids'] = '请选择两部不同的功法';
  /* 裁定收口批 2026-10-08 补两因：`fusion.js:138/145` 实有 unknown / full 两路，视图按
   * `fuse.ui.fail.<reason>` 拼键而整族缺此两条 ⇒ 「自创并存已满 4 门」这种**玩家必然撞上的状态**
   * 屏上只有裸英文 `full`。（同文旧键 `fuse.ui.full` 不动、进待删清单由用户处置。） */
  K['fuse.ui.fail.full'] = '自创并存已满 4 门，须先散功一门。';
  K['fuse.ui.fail.unknown'] = '双亲功法不在名录（可能已被散功或融合消耗）。';
  K['fuse.ui.fail.other'] = '此次融合不成——条件未具。';
  K['fuse.reforge.unknown'] = '此自创部已不在档，无从淬炼。';
  K['fuse.log.win'] = '熔铸成功——「{name}」（{gen} 代 · {tier}）出世';
  K['fuse.log.fail'] = '熔铸失败——双亲无恙，悟道资格已耗（{p}%）';

  /* ── 器灵：人格名 / 觉醒首秀 / 判词模板池（5 人格 × 4 触发 × 3 条）── */
  K['spirit.persona.jian.name'] = '剑灵 · 锋冷';
  K['spirit.persona.shou.name'] = '兽灵 · 憨勇';
  K['spirit.persona.gu.name'] = '古灵 · 苍老';
  K['spirit.persona.yao.name'] = '妖灵 · 狡黠';
  K['spirit.persona.xian.name'] = '仙灵 · 淡漠';
  K['spirit.awaken.jian.1'] = '{name}剑鸣一声清越——器灵觉醒，锋芒冷冽。';
  K['spirit.awaken.jian.2'] = '{name}上浮现一缕锋意，剑灵睁眼：「从今日起，我寄于你腰间。」';
  K['spirit.awaken.shou.1'] = '{name}拱了拱——兽灵觉醒，先舔了你的手一口。';
  K['spirit.awaken.shou.2'] = '{name}的兽灵睁开眼：「主人！你就是我的主人吗？有吃的吗？」';
  K['spirit.awaken.gu.1'] = '{name}尘埃浮动，一个苍老的声音缓缓开口——古灵觉醒。';
  K['spirit.awaken.gu.2'] = '{name}的古灵觉醒：「唔……又一万年过去了。」';
  K['spirit.awaken.yao.1'] = '{name}闪过一丝狡黠的光，低低笑出了声——妖灵觉醒。';
  K['spirit.awaken.yao.2'] = '{name}的妖灵觉醒：「嘿嘿，可算有人把我叫醒了。」';
  K['spirit.awaken.xian.1'] = '{name}温润生光，仙灵睁眼，神色淡漠。';
  K['spirit.awaken.xian.2'] = '{name}的仙灵觉醒，只看了你一眼：「有缘。便见一面。」';
  K['spirit.persona.jian.verdict.trib.1'] = '雷不错。替我磨了三分锋。';
  K['spirit.persona.jian.verdict.trib.2'] = '劫云散了，剑意没散。';
  K['spirit.persona.jian.verdict.trib.3'] = '又渡一劫。你的手，比上次稳。';
  K['spirit.persona.jian.verdict.pickup.1'] = '灵石而已。捡起来，别挡我的剑意。';
  K['spirit.persona.jian.verdict.pickup.2'] = '外物。收好，别多看。';
  K['spirit.persona.jian.verdict.pickup.3'] = '捡吧。我不弯腰。';
  K['spirit.persona.jian.verdict.omen.1'] = '天象招摇。剑，素来朴素。';
  K['spirit.persona.jian.verdict.omen.2'] = '云里有杀气，我喜欢。';
  K['spirit.persona.jian.verdict.omen.3'] = '天要变？一剑的事。';
  K['spirit.persona.jian.verdict.skill.1'] = '一剑。只一剑。';
  K['spirit.persona.jian.verdict.skill.2'] = '剑出鞘，不回鞘。';
  K['spirit.persona.jian.verdict.skill.3'] = '看着，这是我的剑。';
  K['spirit.persona.shou.verdict.trib.1'] = '嗷呜……主人你疼不疼？下次雷来我先扛！';
  K['spirit.persona.shou.verdict.trib.2'] = '雷好凶！不过我们赢了，对吧？';
  K['spirit.persona.shou.verdict.trib.3'] = '主人好厉害！我数了，是第七道雷！';
  K['spirit.persona.shou.verdict.pickup.1'] = '嘿嘿，又捡到好东西了！分我舔一口？';
  K['spirit.persona.shou.verdict.pickup.2'] = '闻着就值钱！我闻得出来！';
  K['spirit.persona.shou.verdict.pickup.3'] = '藏好藏好，别让别人看见。';
  K['spirit.persona.shou.verdict.omen.1'] = '天上的云，闻着有点凶。你站我后面。';
  K['spirit.persona.shou.verdict.omen.2'] = '天在吼。我也吼回去。';
  K['spirit.persona.shou.verdict.omen.3'] = '毛都竖起来了，这天象不简单！';
  K['spirit.persona.shou.verdict.skill.1'] = '嗷呜！看我的！';
  K['spirit.persona.shou.verdict.skill.2'] = '等这一刻好久啦！';
  K['spirit.persona.shou.verdict.skill.3'] = '别拦我，我要发光了！';
  K['spirit.persona.gu.verdict.trib.1'] = '老朽当年渡劫，雷云比这厚三倍。你，尚可。';
  K['spirit.persona.gu.verdict.trib.2'] = '雷还是万年前的雷，人换了一茬又一茬。';
  K['spirit.persona.gu.verdict.trib.3'] = '过了便好。坐下，老朽给你讲三段劫前的旧事。';
  K['spirit.persona.gu.verdict.pickup.1'] = '此物……老朽见过它的前主人。他也爱捡便宜。';
  K['spirit.persona.gu.verdict.pickup.2'] = '灵石来去，老朽见惯了账。';
  K['spirit.persona.gu.verdict.pickup.3'] = '收着。惜物，不为物累。';
  K['spirit.persona.gu.verdict.omen.1'] = '此般天象……三千年前的碑上，老朽见过一笔。';
  K['spirit.persona.gu.verdict.omen.2'] = '天象如旧，人自见新。';
  K['spirit.persona.gu.verdict.omen.3'] = '这道星轨，老朽年轻时读过。';
  K['spirit.persona.gu.verdict.skill.1'] = '骨头虽老，还响得动。';
  K['spirit.persona.gu.verdict.skill.2'] = '一口气，够撑一场。';
  K['spirit.persona.gu.verdict.skill.3'] = '老物件，还没锈死。';
  K['spirit.persona.yao.verdict.trib.1'] = '修为折半？嘁，学费嘛，谁没交过。';
  K['spirit.persona.yao.verdict.trib.2'] = '那雷有点本事——不过你还是活下来了。';
  K['spirit.persona.yao.verdict.trib.3'] = '啧啧，渡过去了。可惜，我押的你摔。';
  K['spirit.persona.yao.verdict.pickup.1'] = '啧，这波不亏。下次挑肥的下手。';
  K['spirit.persona.yao.verdict.pickup.2'] = '横财越大，越衬本座胃口。';
  K['spirit.persona.yao.verdict.pickup.3'] = '分我三成，我替你望风。';
  K['spirit.persona.yao.verdict.omen.1'] = '天象乱了——正好浑水摸鱼。';
  K['spirit.persona.yao.verdict.omen.2'] = '哟，老天爷也学会使坏了。';
  K['spirit.persona.yao.verdict.omen.3'] = '别慌，天塌下来有高个的顶。';
  K['spirit.persona.yao.verdict.skill.1'] = '放我出去，让那些蠢货见识见识。';
  K['spirit.persona.yao.verdict.skill.2'] = '这一手，我憋很久了。';
  K['spirit.persona.yao.verdict.skill.3'] = '桀桀桀，有人要倒霉了。';
  K['spirit.persona.xian.verdict.trib.1'] = '嗯。劫过，心未动。很好。';
  K['spirit.persona.xian.verdict.trib.2'] = '雷来，雷去。你还是你。';
  K['spirit.persona.xian.verdict.trib.3'] = '劫而已，不必声张。';
  K['spirit.persona.xian.verdict.pickup.1'] = '灵石无灵，别压了心。';
  K['spirit.persona.xian.verdict.pickup.2'] = '得失如浮云。收好便是。';
  K['spirit.persona.xian.verdict.pickup.3'] = '捡了，就拿着。不必喜，不必忧。';
  K['spirit.persona.xian.verdict.omen.1'] = '天象如梦，何须问我。';
  K['spirit.persona.xian.verdict.omen.2'] = '云上写了几笔字，你看见了吗。';
  K['spirit.persona.xian.verdict.omen.3'] = '云聚云散，道常如此。';
  K['spirit.persona.xian.verdict.skill.1'] = '护你此魂。不必谢。';
  K['spirit.persona.xian.verdict.skill.2'] = '去吧。我在。';
  K['spirit.persona.xian.verdict.skill.3'] = '一点清光，够你照路。';
  /* 真灵承继跨世彩蛋（通用池 1~3 + 五人格各一版变体 · 承继件下世首次祭出一次性播报，零机制效果） */
  K['spirit.reunion.1'] = '又见面了，主人。';
  K['spirit.reunion.2'] = '我记得你。隔了一世，手心的温度没变。';
  K['spirit.reunion.3'] = '换了人间，此灵依旧认你。';
  K['spirit.reunion.jian'] = '剑身一寒，剑鸣仍认得这只手——「上一世你也是这样握我的。」';
  K['spirit.reunion.shou'] = '兽灵猛地拱上来，尾巴摇得比话快：「主人主人！我等你好久了！」';
  K['spirit.reunion.gu'] = '尘埃里那个苍老的声音轻轻笑了一声：「又见面了。这次，别再把我丢在洞里。」';
  K['spirit.reunion.yao'] = '妖灵眯起眼，低低一笑：「换个皮囊我也认得你。别想装作不认识。」';
  K['spirit.reunion.xian'] = '仙灵睁眼，神色仍淡漠，只这句轻了些：「有缘。便再见一面。」';

  /* ── 器灵技五型 ── */
  K['spirit.skill.hun.name'] = '护魂';
  K['spirit.skill.hun.desc'] = '下次渡劫成算 +0.01（一次性标记，判后即清，多件不叠加）';
  K['spirit.skill.jian.name'] = '剑意';
  K['spirit.skill.jian.desc'] = '战力 +8%，持续 2 时辰';
  K['spirit.skill.shi.name'] = '吞噬';
  K['spirit.skill.shi.desc'] = '击杀灵石 +10%，持续半时辰';
  K['spirit.skill.xiong.name'] = '凶性';
  K['spirit.skill.xiong.desc'] = '掉落 +8% 持续 2 时辰，发动瞬间业力 −2';
  K['spirit.skill.yin.name'] = '仙音';
  K['spirit.skill.yin.desc'] = '离线效率 +10%，持续 8 时辰';
  K['spirit.log.skill'] = '器灵技「{skill}」发动（{name}）';

  /* ── 器灵 UI ── */
  K['spirit.ui.warm'] = '温养 {w}/{need}';
  K['spirit.ui.awake'] = '器灵已觉醒';
  K['spirit.ui.persona'] = '人格 · {p}';
  K['spirit.ui.gray'] = '器灵未醒';
  K['spirit.ui.skill'] = '器灵技';
  K['spirit.ui.skill.btn'] = '发动';
  K['spirit.ui.skill.cd'] = '冷却中（{t}）';
  K['spirit.ui.skill.mark'] = '标记在位';
  K['spirit.ui.skill.active'] = '效力在位，到期可再发动';
  K['spirit.ui.skill.lock'] = '未觉醒或未祭出，不可发动';
  K['spirit.ui.verdict'] = '器灵私评';
  K['spirit.ui.tab'] = '器灵';
  /* ── 真灵承继选择浮层（轮回卷 §3.4「可选一件」玩家入口 · 器灵卷 §九 数据契约）──
   * 三态文案：择定某件 / 显式不带 / 未择定（自动取第一件已觉醒者）；只此一件、不叠加、不随境界缩放。 */
  K['spirit.ui.heir.title'] = '真灵承继 · 择一件带入下世';
  K['spirit.ui.heir.sub'] = '只此一件、不叠加、不随境界缩放；不择定则自动带入第一件已觉醒者。';
  K['spirit.ui.heir.carry'] = '现承继 · {name}';
  K['spirit.ui.heir.picked'] = '本世择定 · {name}';
  K['spirit.ui.heir.pick'] = '带此件转世';
  K['spirit.ui.heir.skip'] = '不带器灵转世';
  K['spirit.ui.heir.switch'] = '换一件';
  K['spirit.ui.heir.done'] = '承继择定 · {name}';
  K['spirit.ui.heir.skipped'] = '本世不带器灵转世';
  /* N18 失效态两行：择定件已失（引擎 legacy.js:438-439 降级为取第一件已觉醒者 / 无则不带）
   * 与浮层候选为空——此前玩家侧只见「本世择定 · 一件已不在手的法宝」，零解释零改选入口。 */
  K['spirit.ui.heir.lost'] = '择定失效 · {name} 已不在手——转世时改带第一件已觉醒者，一件也没有便不带。';
  K['spirit.ui.heir.empty'] = '手上已无觉醒的器灵可择。可先温养一件再回来，或点「不带器灵转世」清掉这条失效择定。';
  K['spirit.ui.heir.note'] = '它会在渡劫、拾得、天象与技出时各评一句，承继后照旧。';
  K['buff.src.spirit_jian'] = '剑意';
  K['buff.src.spirit_xiong'] = '凶性';
  K['buff.src.spirit_yin'] = '仙音';

  SQ.lexRegister('xiuxian', K);
})();
