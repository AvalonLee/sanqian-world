/* assets/worlds/xiuxian/lexicon-factions.js — G16 势力词表分卷（势力批 v2.4）
 * 30 条势力背景描述（正/左/魔 各 10 条，生成时按阵营池不重复抽取）+ 名称池 + UI 文案。
 * 本文件是 CJK 白名单；systems/factions.js 零裸中文。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  /* ── 势力背景描述池（30 条：key 规范 faction.desc.{align}.{n}，随势力入档持久）── */
  var DESC = {
    right: {
      'faction.desc.right.1': '正道南麓第一大派，门规第一条是「见不平，拔剑」。弟子下山历练必佩斩恶令，归来须缴一份除恶账——账越厚，席位越高。',
      'faction.desc.right.2': '以护佑凡人城池为业的老牌道盟，城的四面各立一座镇妖塔，塔灯百年不灭。入盟要立「不弃一城」的血誓，违者逐出师门。',
      'faction.desc.right.3': '剑修一脉，满门只修一柄本命剑。掌门曾说：剑正，则心正；心正，则天下有一半的理在你这边。门人结怨极少，因为恩怨都当面剑上解决。',
      'faction.desc.right.4': '丹道正脉，济世为怀。凡成丹方一律公之于众，只收药材本钱；穷人来求药，棚外的竹筒里自己投几枚铜钱即可。',
      'faction.desc.right.5': '由数座凡人皇朝共尊的护国法坛，历代宗主由龙气最盛处选出。他们不争灵脉不抢洞府，只做一件事：魔气在哪里升起，就在哪里落下。',
      'faction.desc.right.6': '雷法世家，家训刻在祖祠的雷劈木上：「天雷可畏，故不可妄引。」门中弟子渡劫，全族围着雷池守夜——他们的渡劫从不是一个人的事。',
      'faction.desc.right.7': '书院修士，佩剑也佩书。他们相信大道藏在人间烟火里，下山游学是必修课；门中考核不是斗法，是提交一份《游历济人录》。',
      'faction.desc.right.8': '漕运出身的护道同盟，凡水路三千里皆插其旗。旗下一句行话：「我们的船不快，但从来能到。」魔物袭船的赏格，三十年没变过。',
      'faction.desc.right.9': '以猎杀妖邪换取功德的赏金堂，堂内挂着百年悬榜。规矩森严：只杀榜上有名的，冤有头债有主，滥杀者以同罪论。',
      'faction.desc.right.10': '上古护山氏族的后裔，世代看守一道封印。外人只当他们是守山的猎户，其实那漫山遍野的陷阱与阵纹，是七千年里一代代人垒出来的。'
    },
    neutral: {
      'faction.desc.neutral.1': '坊市背后最大的商会， 行训是「灵石不问出身」。他们给正道供丹药，也给魔道送消息——只要付账，掌柜的笑一样多。',
      'faction.desc.neutral.2': '散修同盟，没有山门只有会馆。规矩就三条：会馆里不动手、消息可以买卖、恩怨各自了结。三百年风雨不倒，靠的是谁都不得罪。',
      'faction.desc.neutral.3': '天下消息最灵通的一群人，抄录各州见闻编成《风闻录》按旬发行。谁也不知道他们的抄手是谁，只知道报纸从来不出错。',
      'faction.desc.neutral.4': '鉴宝行会，专断灵物真伪。行内铁律：一句假话，逐出行会、废掉手艺、天下行文。所以他们说的话，比宗门的誓言还值钱。',
      'faction.desc.neutral.5': '茶马古道上的修士行会，护送商队，也护送客死他乡的散修遗骨归乡。他们自称「走江湖的」，江湖两个字，被他们走成了一条真实的路。',
      'faction.desc.neutral.6': '由退役各派长老组成的论道会，每月初一开坛讲道，谁都可以坐下听。他们不收徒、不站队，只负责把各派的道理拿出来晒一晒。',
      'faction.desc.neutral.7': '隐居水泽的渔隐联盟，打渔、酿酒、看云。有修士来问路，他们指路；来抢地盘，湖面起雾，三百里内找不到他们的村子。',
      'faction.desc.neutral.8': '镖行天下，镖旗上一杆秤。他们押送过的东西从凡人嫁妆到仙人遗宝都有，行规写在一杆老秤杆上：秤平、斗满、不问货。',
      'faction.desc.neutral.9': '游方艺人结成的百戏班，傀儡戏里藏着真傀儡，唱词里夹着道法。他们走过的地方，穷人看得起戏，也顺手得了平安符。',
      'faction.desc.neutral.10': '一座悬在空中的酒楼，哪里有纷争就飘到哪里开张。掌柜只立一条规矩：楼上吃酒，楼下动手——于是酒楼成了各路人马谈判的首选地。'
    },
    evil: {
      'faction.desc.evil.1': '血祭立教的魔宗，信奉「力量源于代价」。教中晋升不看资历看献祭，香火鼎盛处必有他们的祭坛，官府悬赏三十年不曾停过。',
      'faction.desc.evil.2': '盘踞黑水泽的盗修团伙，专劫过路散修。寨规只有一条：劫财不劫命——留活口，是为了下一条水路上还有生意。',
      'faction.desc.evil.3': '以蛊入道的南疆遗脉，养蛊千种，皆以仇人血饲。他们极少主动出山，但南疆的商队都知道：进山先备三份礼，少一份都走不出雾。',
      'faction.desc.evil.4': '炼尸一脉，驱使的铜甲尸每一具都是百年战阵养出来的。宗门藏于乱葬岗深处，外人只见坟头夜夜青火，不见地下的千级台阶。',
      'faction.desc.evil.5': '魔道中最像生意的组织：卖情报、卖杀手、卖你的仇家的仇家。总舵设在谁也找不到的地方，但天下的阴暗事，一半经他们的手。',
      'faction.desc.evil.6': '由灭门遗孤组成的复仇之盟，入盟要交出过去的一切名姓。他们行事狠辣却极守信用——说三日后取你性命，绝不过第四日。',
      'faction.desc.evil.7': '上古魔修余孽，藏身界缝裂隙之中。他们钻研禁术从不遮掩，门中石碑刻着祖训：「正道说我邪，可最先动手的从来是他们。」',
      'faction.desc.evil.8': '万毒谷，谷中四季毒雾不散。谷主立了一座「百毒碑」，凡死于此谷的修士皆刻名其上——他们不觉得这是恶，只觉得这是山谷的规矩。',
      'faction.desc.evil.9': '夜行修士的同盟，白日散于市井，夜里才是他们的天下。他们偷的不是灵石，是各派秘藏的功法残卷——转手卖回给正道，价钱翻十倍。',
      'faction.desc.evil.10': '以杀证道的修罗一脉，门中只有一条功法、一条戒律：杀强不杀弱。历代门主死于更强者之手，碑林里立满了，没有一座是冤枉的。'
    }
  };
  SQ.FACTION_DESCS = {
    right: Object.keys(DESC.right), neutral: Object.keys(DESC.neutral), evil: Object.keys(DESC.evil)
  };

  /* ── 名称池（前字 + 后字，systems/factions.js 随机组合、重名重掷）── */
  SQ.NAMES = SQ.NAMES || {};
  SQ.NAMES.xiuxian = SQ.NAMES.xiuxian || {};
  /* 名称池（走查 v2.5 §2 扩充）：前字 16 × 后字 8 = 128 组合/阵营；
   * 生成纪律（systems/factions.js）：**前字与全名均一次一用**——「散人馆 / 散人行会」这类同前字近似名不再出现 */
  SQ.NAMES.xiuxian.factions = {
    right: { a: ['青霞', '浩然', '凌霄', '明心', '太乙', '万剑', '清微', '紫阳', '天璇', '斩恶', '白鹭', '承影', '观澜', '守正', '赤霄', '归元'],
             b: ['盟', '宗', '阁', '剑派', '道殿', '护法堂', '山庄', '学宫'] },
    neutral: { a: ['醉月', '闲云', '听涛', '百晓', '四海', '风隐', '墨香', '游龙', '茶马', '五味', '灯市', '野渡', '云帆', '拾遗', '长街', '半盏'],
               b: ['帮', '会', '楼', '馆', '商盟', '行会', '车马行', '货栈'] },
    evil: { a: ['血煞', '幽冥', '九幽', '噬魂', '阴风', '罗刹', '万毒', '黑水', '修罗', '蚀骨', '枯坟', '夜枭', '断魂', '赤目', '瘴雨', '白骨'],
            b: ['教', '窟', '坛', '寨', '狱', '魔宗', '深渊', '残楼'] }
  };

  /* 把 30 条描述与 UI 文案注册进世界分卷 */
  var keys = {};
  ['right', 'neutral', 'evil'].forEach(function (al) {
    for (var k in DESC[al]) keys[k] = DESC[al][k];
  });
  keys['faction.system'] = '势力';
  keys['faction.page.cur'] = '当前效力 · {name}';
  keys['faction.page.none'] = '未加入任何势力——乱世之中，孤身行走';
  keys['faction.page.hint'] = '加入势力可得其增益；与势力交好的道友好感 +10，敌对 −20（散人不受影响）。';
  keys['faction.join'] = '加入';
  keys['faction.join.occupied'] = '已身在一门，不可另投他派（先叛离，待冷却后再入）';
  keys['faction.leave'] = '叛离';
  keys['faction.joined'] = '效力中';
  keys['faction.perk'] = '效力增益';
  keys['faction.relations'] = '势力关系';
  keys['faction.rel.friendly'] = '友好';
  keys['faction.rel.enemy'] = '敌对';
  keys['faction.rel.neutral'] = '持平';
  keys['faction.rel.same'] = '同门';
  keys['faction.members'] = '同道 {n} 人';
  keys['faction.none.mem'] = '无所属';
  keys['faction.confirm.join'] = '确认投身「{name}」？与其友好的势力门下道友好感 +10，敌对的 −20（厌恶下限 −20），同道 +5。';
  keys['faction.confirm.leave'] = '确认叛出「{name}」？道心蒙尘（道心 −30），一游戏年内不可投身任何势力；已结的人情不收回。';
  keys['faction.cd'] = '叛离冷却：{t} 内不可加入任何势力';
  keys['faction.log.join'] = '投身「{name}」，愿同心协力';
  keys['faction.log.leave'] = '叛出「{name}」，从此各行其道';
  keys['faction.bond.line'] = '所属势力 · {name}（{align}）';
  keys['faction.bond.none'] = '散人 · 无所属';
  keys['faction.bond.cur'] = '本方势力';
  /* 好感厌恶（势力批 v2.4 §6：好感下限 −20） */
  keys['bond.negative'] = '厌恶';
  /* 修行页产出明细来源 */
  keys['idle.faction'] = '势力';
  /* 神秘商人特席（坊市页） */
  keys['shop.merchant.title'] = '神秘商人';
  keys['shop.merchant.left'] = '离去 {t}';
  keys['shop.merchant.hint'] = '斗篷下的面孔看不清楚，货倒是真的——价格也是。';
  keys['shop.merchant.open'] = '神秘商人在坊市后巷支起了摊子';
  keys['shop.merchant.scout'] = '· 他认出了你，货比上次好';

  /* ── 固定势力池 16 处正典（势力深化批 v1.23 · 《势力全录（16处）》§一 描述正典照录；
   * 固定势力不走随机名池与 30 条描述池，desc key 即本段 'faction.{id}.desc'）── */
  keys['faction.huangfeng.name'] = '黄枫谷';
  keys['faction.huangfeng.desc'] = '小国山峦里的老门派，谷中遍植黄枫，秋深叶落，弟子扫而不焚——说扫地也是修行。清苦时守山门，得势时放弟子远游，谷规只有一句：人不弃谷，谷不弃人。';
  keys['faction.yanue.name'] = '掩月宗';
  keys['faction.yanue.desc'] = '山门临海，春潮立起的夜里能看见一轮圆月悬在海面之上，故名。规矩严而不冷：外门弟子人手一枚令符，符背刻着四个字——莫欺弱小。';
  keys['faction.xinggong.name'] = '星宫';
  keys['faction.xinggong.desc'] = '坐拥海商枢纽，万船纳双税而仍争相悬挂星宫旗——旗下，连黑风浪都要绕开三里。宫中规矩只有一条：价钱既出，仙人不改。';
  keys['faction.qixuan.name'] = '七玄门';
  keys['faction.qixuan.desc'] = '藏在凡人国度的后山，明面上行医济世，暗地里研习「过秤根骨」的秘术。收徒铁律只一句：先称根骨，称清楚了，再谈传艺。';
  keys['faction.luopo.name'] = '落魄山';
  keys['faction.luopo.desc'] = '边陲一座小山，山上几间屋、一块磨剑石。山规稀疏，只一条最重：住在山上的人，护着山下的人。晨钟暮鼓，剑鸣稀疏，声声都送到山下镇子里。';
  keys['faction.jianqi.name'] = '剑气长城';
  keys['faction.jianqi.desc'] = '天下尽头一座倒悬剑光的长城，城头不问出身，只问你手中的剑。万年守城只做一件事：让想翻墙的，都翻不过去。城墙沿线的无名剑冢——殁者葬在城上，剑留在城上。';
  keys['faction.qianzhu.name'] = '千竹派';
  keys['faction.qianzhu.desc'] = '竹海深处的剑竹门派，万竿皆剑，风过海而剑意自鸣。门规清正：弟子入海养竹，出海守关，竹不倒，人不退。';
  keys['faction.yanwu.name'] = '燕家堡';
  keys['faction.yanwu.desc'] = '越国修行豪族，堡墙高三丈，堡规比墙更严。行事只问利弊，不问是非——得罪过燕家堡的人，坊市里、荒郊里，都没人敢认。';
  keys['faction.miaoyin.name'] = '妙音门';
  keys['faction.miaoyin.desc'] = '乱星海商盟的门户，以音讯为业：一句话送到，比剑光还快；一条船平安过境，靠的是海图与面子。门中不问货色黑白，只问定金真假。';
  keys['faction.liumo.name'] = '六魔盟';
  keys['faction.liumo.desc'] = '魔道六家巨擘的合纵之盟，盟约设在一杆秤上——秤平则同坐，利尽则散，散时不告别。可盟威犹在，令旗一举，连正道也要掂量三分言语。';
  keys['faction.kunwu.name'] = '昆吾山';
  keys['faction.kunwu.desc'] = '镇封上古凶物的名山，山体里沉埋着锁链，风过时隐隐有锁响。山顶无人敢登，山下过路的人，都不自觉放轻了脚步。';
  keys['faction.guisu.name'] = '鬼灵宗';
  keys['faction.guisu.desc'] = '鬼修宗门，弟子入门先学问灵，再学做人。鬼市开在子夜，终年幽气不散，香烛不断——去问卜的人，先掂量自己还剩几两阳气。';
  keys['faction.shuyuan.name'] = '大骊书院';
  keys['faction.shuyuan.desc'] = '儒门书院，讲学明理，讲堂面山，读书声与泉声相和。院规不多，最重一条：先明理，再谈术。一方气运，凭此文脉镇压。';
  keys['faction.suiyuan.name'] = '大隋书院';
  keys['faction.suiyuan.desc'] = '山中老书院，规矩极严，戒尺打得极亮。可书院出来的读书人，行走天下最有胆气——遇见不平事，敢第一个拔剑的，多半出自此门。';
  keys['faction.longquan.name'] = '龙泉县';
  keys['faction.longquan.desc'] = '边陲小县，铸剑的炉火昼夜不熄，全县生计半系于此火。市井店面看着寒酸，掌柜们看剑的眼光，却比京里的剑师还毒。';
  keys['faction.laolong.name'] = '老龙城';
  keys['faction.laolong.desc'] = '老龙盘踞过的废弃城窟，龙气未散，草木皆带煞气。凶名在外，城中机缘也在外——敢进城的，十个里有九个没再出来，剩下的那个发了财。';

  /* ── 职级贡献（势力全录卷 §三）── */
  keys['faction.rank.0'] = '外门弟子';
  keys['faction.rank.1'] = '内门弟子';
  keys['faction.rank.2'] = '真传弟子';
  keys['faction.rank.3'] = '长老';
  keys['faction.rank.4'] = '供奉首座';
  keys['faction.rep'] = '声望';
  keys['faction.rank.cur'] = '职级 · {rank}（声望 {rep}/{next}）';
  keys['faction.rank.max'] = '职级 · {rank}（声望 {rep} · 已至人臣之极）';
  keys['faction.rank.perk'] = '职级放大 ×{m}';
  keys['faction.donate'] = '捐献供奉';
  keys['faction.donate.btn'] = '供奉 {n}（+{rep}）';
  keys['faction.donate.hint'] = '灵石 ÷1000 = 声望；每 2 小时至多 +{cap} 声望（超额按比例部分成交）。';
  keys['faction.donate.cap'] = '本轮供奉已足（稍后再来）';
  keys['faction.confirm.donate'] = '向「{name}」供奉 {n} {cur}，预计声望 +{rep}（受供奉窗口上限约束，超额部分只扣对应灵石）。';
  keys['faction.donate.fail.none'] = '尚未效力任何势力';
  keys['faction.donate.fail.tier'] = '供奉数额不合法';
  keys['faction.donate.fail.cap'] = '本轮供奉已足（稍后再来）';
  keys['faction.donate.fail.stones'] = '灵石不足';
  keys['faction.log.donate'] = '向「{name}」供奉香火，声望 +{n}';
  keys['faction.rank.up'] = '职级晋升 · {rank}';

  /* ── 势力委托（势力全录卷 §四）── */
  keys['faction.quest.title'] = '门中委托';
  keys['faction.quest.none'] = '暂无委托——门中无事，各自修行';
  keys['faction.quest.slay'] = '剿除妖邪：击杀 {n} 头';
  keys['faction.quest.cultivate'] = '闭关进益：修为增长 {n}';
  keys['faction.quest.gather'] = '采买军资：上缴 {n} 灵石';
  keys['faction.quest.prog'] = '{cur}/{target}';
  keys['faction.quest.reward'] = '酬：声望 +{rep}{stones}';
  keys['faction.quest.left'] = '剩余 {t}';
  keys['faction.quest.claim'] = '交付';
  keys['faction.quest.claim.ok'] = '委托了结，门中记你一功';
  keys['faction.quest.fail.none'] = '无进行中的委托';
  keys['faction.quest.fail.expired'] = '委托已过期作废';
  keys['faction.quest.fail.progress'] = '差得还远，再历练历练';
  keys['faction.quest.fail.stones'] = '灵石不足，缴不上军资';
  keys['faction.quest.expired'] = '一桩门中委托过期作废';
  keys['faction.quest.new'] = '门中贴出新委托：{type}';
  keys['faction.quest.done'] = '交付委托，声望 +{n}';

  /* ── 势力冲突（势力全录卷 §五 → §七 战功制 · 系统深化批 A5）── */
  keys['faction.war.title'] = '势力冲突';
  keys['faction.war.banner'] = '「{a}」与「{b}」刀兵相见 · 剩余 {t}';
  keys['faction.war.join'] = '出面应战';
  keys['faction.war.confirm.title'] = '出面应战';
  keys['faction.confirm.war'] = '入场无战力判定——入场后于秘境斩妖即积战功，终局战功达标为胜（声望 +50、灵石重赏、同门好感 +2、声威大振）；不达标为败（声望 +5 苦劳 + 战创半个时辰）。闭关不产战功。每场只可入场一次。';
  keys['faction.war.fail.none'] = '战事已歇';
  keys['faction.war.fail.joined'] = '此战你已出过面';
  keys['faction.war.fail.watch'] = '你的势力未卷入此战';
  keys['faction.war.joined'] = '已出战（{r}）';
  keys['faction.war.watch'] = '你的势力未卷入此战——只能观望';
  keys['faction.war.win'] = '应战得胜，为「{name}」立下战功（声望 +{n}）';
  keys['faction.war.lose'] = '应战失利，被抬回山门（声望 +{n}，战创 30 分钟）';
  keys['faction.war.start'] = '江湖急报：「{a}」与「{b}」开战了';
  keys['faction.war.over.win'] = '「{a}」大获全胜——功簿上有你的名字';
  keys['faction.war.over.draw'] = '「{a}」与「{b}」两败俱伤，各自收兵';

  /* ── 战功制（势力全录卷 §七 · 10 key）── */
  keys['faction.war.merit.joined'] = '你已出面应战——「{name}」旗下，斩妖即战功';
  keys['faction.war.merit.prog'] = '战功 {m}/{n}';
  keys['faction.war.merit.win'] = '战功录名，此战得胜——「{name}」记功（声望 +{n}，灵石赏 {stones}）';
  keys['faction.war.merit.lose'] = '战功不足，苦战而返——「{name}」记你苦劳（声望 +{n}，战创 30 分钟）';
  keys['faction.war.over.lose'] = '「{a}」未能守住战线，败于「{b}」之手——败势如山，各自收兵';
  keys['faction.war.relsoft'] = '「{a}」与「{b}」的旧怨被此战磨平了几分';
  keys['faction.war.prestige'] = '声威大振';
  keys['faction.war.result.win'] = '势力冲突大捷——出战者功录名册，坊市议价皆让三分';
  keys['faction.war.result.lose'] = '势力冲突失利——伤者被抬回山门，坊市价高了三日';
  keys['faction.war.result.draw'] = '两家鏖战力竭，各自收兵——江湖又是一轮谈资';
  keys['faction.war.merit.seclude'] = '闭关不产斩杀——战事期间闭关视同缺席';

  /* ── 职级实权（势力全录卷 §八 · 15 key）── */
  keys['faction.office.title'] = '职位';
  keys['faction.office.line'] = '职位：{txt}';
  keys['faction.office.steward'] = '执事';
  keys['faction.office.elder'] = '长老';
  keys['faction.office.locked'] = '职级达 {r} 可任 {office}';
  keys['faction.office.dispatch'] = '调遣同门';
  keys['faction.office.dispatch.pick'] = '选调一名同门道友';
  keys['faction.office.dispatch.ok'] = '{name} 前来相助（{field} {v}，2 小时）';
  keys['faction.office.cd'] = '调遣方歇，冷却未过';
  keys['faction.join.sectlock'] = '已自立门户，宗主之身不入他门';
  keys['faction.office.dispatch.none'] = '暂无可调遣的同门道友';
  keys['faction.office.dispatch.chan'] = '这位道友的所长不在此途';
  keys['faction.office.dispatch.affinity'] = '好感未至，不听调遣';
  /* 宗门页调遣补三因提示（第十四批审计 #12）：unknown = 弟子不在册，other = 未来新增 reason 的兜底，
   * 免得内部字段名直接上屏（#272/#273 同一纪律）。 */
  keys['faction.office.dispatch.unknown'] = '这位同门已不在门下';
  keys['faction.office.dispatch.other'] = '此刻调遣不成';
  keys['faction.office.dispatch.cd'] = '调遣冷却中（每 24 小时一次）';
  keys['faction.office.guard'] = '门中护法';
  keys['faction.office.guard.ok'] = '长老亲镇山门大阵——下次渡劫护法加项强制生效';
  keys['faction.office.guard.armed'] = '护法已就位：下次渡劫加项 +0.02';
  keys['faction.office.guard.cd'] = '护法冷却中（每 24 小时一次）';
  keys['faction.office.trib'] = '职司护法 +{n}';
  /* 职位技能失败原因（B4 toast） */
  keys['faction.office.fail.office'] = '职位未解锁';
  keys['faction.office.fail.cd'] = '冷却未过（每 24 小时一次）';
  keys['faction.office.fail.notsame'] = '这位道友不在你门下';
  keys['faction.office.fail.chan'] = '这位道友的所长不在此途';
  keys['faction.office.fail.affinity'] = '好感未至，不听调遣';
  keys['faction.office.fail.unknown'] = '无此道友';
  keys['faction.office.fail.none'] = '尚未效力任何势力';

  /* ── 叛离与谍报（势力全录卷 §九 · 13 key）── */
  keys['faction.defect.title'] = '叛投敌对';
  keys['faction.defect.confirm'] = '叛「{from}」投「{to}」？业力 −60、旧门同门好感 −10、旧声望五成随行入新门。';
  keys['faction.defect.enemytag'] = '敌对 · 叛投';
  keys['faction.defect.karma'] = '名籍除而道心负疚（业力 −60），投奔「{name}」';
  keys['faction.defect.bond'] = '旧门同门怨你背弃（好感 −{n}）';
  keys['faction.defect.rep'] = '带图来投，{n} 点声望记入新门';
  keys['faction.defect.intel'] = '献秘';
  keys['faction.defect.intel.ask'] = '带走一卷旧门功法情报？（系统随机抽出一卷——入手后无视境界/渠道前置；选「返回」= 好聚好散，不带秘册）';
  keys['faction.defect.intel.pick'] = '你带出了《{name}》的秘册';
  keys['faction.defect.intel.none'] = '旧门无秘可献';
  keys['faction.defect.fail.none'] = '尚未效力任何势力';
  keys['faction.defect.fail.unknown'] = '无此势力';
  keys['faction.defect.fail.notenemy'] = '非敌对势力，无法叛投（好聚好散请走常规离山）';
  keys['faction.defect.fail.cooldown'] = '叛离冷却未过';
  keys['faction.cd.wait'] = '冷却后可投';
  keys['faction.intel.title'] = '情报';
  keys['faction.intel.desc'] = '情报在手：无视境界 / 渠道前置（根骨与心性门槛仍存）';
  keys['faction.intel.tag'] = '情报';
  keys['faction.intel.ignore'] = '情报在手：无视境界 / 渠道前置';

  /* ── 门中供给（势力全录卷 §六）── */
  keys['faction.supply.title'] = '门中供给';
  keys['faction.supply.hint'] = '以名分换便利：声望 + 灵石兑换丹药，每样每 24 小时限兑一次。';
  keys['faction.supply.sku.juqi'] = '聚气丹 · 门中份';
  keys['faction.supply.sku.ningshen'] = '凝神丹 · 门中份';
  keys['faction.supply.sku.cuiti'] = '淬体丹 · 门中份';
  keys['faction.supply.sku.pozhang'] = '破障丹 · 门中份';
  keys['faction.supply.cost'] = '声望 {rep} + {n} 灵石';
  keys['faction.supply.locked'] = '职级不足（需 {rank}）';
  keys['faction.supply.cd'] = '今日已兑';
  keys['faction.supply.bought'] = '从门中领了「{name}」';
  keys['faction.supply.fail.none'] = '无此供给';
  keys['faction.supply.fail.rank'] = '职级不足';
  keys['faction.supply.fail.rep'] = '声望不足';
  keys['faction.supply.fail.cd'] = '今日已兑（明日再来）';
  keys['faction.supply.fail.stones'] = '灵石不足';
  keys['faction.supply.fail.pillfull'] = '丹匣已满（每种上限 99），先服几颗再来';

  /* ── 关系正典一句（势力全录卷 §二，展开显示）── */
  keys['faction.relcanon.huangfeng.yanue'] = '小派仰仗大宗照拂，大宗念其守拙本分——百余年的老交情。';
  keys['faction.relcanon.xinggong.miaoyin'] = '海贸同盟：星宫出旗，妙音门出讯，两家的账从来算得清。';
  keys['faction.relcanon.shuyuan.suiyuan'] = '儒门双璧，讲学互访，山长们年轻时是同窗。';
  keys['faction.relcanon.longquan.jianqi'] = '县里铸的剑，一半送上城头——铸剑的与守城的，互相成全。';
  keys['faction.relcanon.luopo.qianzhu'] = '都是清苦小派，竹节同心，难时互递过米粮。';
  keys['faction.relcanon.qixuan.yanwu'] = '越国旧怨：称过根骨的人，被堡里买走过一次，没送回来。';
  keys['faction.relcanon.yanue.liumo'] = '正魔百年开战，掩月的令符背面刻着魔盟三位堂主的名字。';
  keys['faction.relcanon.shuyuan.guisu'] = '文脉镇压的对象里，鬼市排第一——书院讲堂至今挂着镇鬼的旧符。';
  keys['faction.relcanon.jianqi.laolong'] = '守界的剑与盘踞的龙，隔着万里打过三场，城头的剑冢多了一排。';
  keys['faction.relcanon.kunwu.liumo'] = '山体里锁着的东西，魔盟一直想要——锁链松一分，盟里就知道。';
  keys['faction.fixed.tag'] = '名门';

  SQ.lexRegister('xiuxian', keys);
})();
