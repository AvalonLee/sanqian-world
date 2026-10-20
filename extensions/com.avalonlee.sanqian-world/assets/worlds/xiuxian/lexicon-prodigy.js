/* xiuxian/lexicon-prodigy.js — 同代天骄词表分卷（CJK 白名单文件 · 天骄卷 v1.0 §十三）
 * key 族：prodigy.*（人名池三段 21 / 资质与关系 / 传闻 9 / 编年史 7 / 日志 / UI）
 * + 天骄专属事件全文 event.prodigy_ev_*.*（既有事件族 id 取值，前缀 prodigy_ev_ 防混注记）。
 * 天赋展示复用 talent.* 既有 key 零新增。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var K = {};

  /* ── 人名池三段（9×7×5 = 315 组合，§2.2 自建池）── */
  K['prodigy.name.s.1'] = '苏'; K['prodigy.name.s.2'] = '顾'; K['prodigy.name.s.3'] = '叶';
  K['prodigy.name.s.4'] = '萧'; K['prodigy.name.s.5'] = '洛'; K['prodigy.name.s.6'] = '裴';
  K['prodigy.name.s.7'] = '谢'; K['prodigy.name.s.8'] = '楚'; K['prodigy.name.s.9'] = '秦';
  K['prodigy.name.m.1'] = '青'; K['prodigy.name.m.2'] = '云'; K['prodigy.name.m.3'] = '寒';
  K['prodigy.name.m.4'] = '惊'; K['prodigy.name.m.5'] = '梧'; K['prodigy.name.m.6'] = '照';
  K['prodigy.name.m.7'] = '凌';
  K['prodigy.name.l.1'] = '尘'; K['prodigy.name.l.2'] = '崖'; K['prodigy.name.l.3'] = '霄';
  K['prodigy.name.l.4'] = '月'; K['prodigy.name.l.5'] = '珩';

  /* ── 资质档与关系态 ── */
  K['prodigy.apt.0'] = '常人';
  K['prodigy.apt.1'] = '俊杰';
  K['prodigy.apt.2'] = '天才';
  K['prodigy.rel.friend'] = '好友';
  K['prodigy.rel.feud'] = '宿敌';
  K['prodigy.rel.loner'] = '散修';

  /* ── 传闻文案（§4.3 防刷屏白名单：换位双向 / 天才突破 / 机缘竞争 ×3 / 结仇 / 斩杀 / 跨世开场）── */
  K['prodigy.rumor.rank.up'] = '同代榜易位——你反超至第 {n} 位，坊市已有人开始记你的名字。';
  K['prodigy.rumor.rank.down'] = '同代榜易位——你被压到了第 {n} 位。茶棚里有人说，那几位的风头正劲。';
  K['prodigy.rumor.break'] = '{name}破入{realm}！同代之中又有人绝尘而去。';
  K['prodigy.rumor.rivalry.1'] = '谷口的仙缘被人抢先一步，只留半句话：「机缘，是给先到的人的。」';
  K['prodigy.rumor.rivalry.2'] = '{faction}的{name}连夜掘走了那株百年灵植，连土都没给你剩——捎话的人说，他挖完还哼着小曲。';
  K['prodigy.rumor.rivalry.3'] = '坊市传言：古修洞府的秘钥三日前被人开了，后来者只看到墙上一行剑刻的字，狂得像是故意留给人看的。';
  K['prodigy.rumor.feud'] = '{name}拂袖而去，放话下次见面剑下不留情——江湖都知道了。';
  K['prodigy.rumor.kill'] = '{name}殒落。同代榜划去一行。';
  /* 第册一批③：出榜即空一席 ⇒ 两条新传闻（跨榜带才播 bandup，一次连破两界也只播一条落点） */
  K['prodigy.rumor.bandup'] = '{name} 连破同侪，自{from}升入{to}。';
  K['prodigy.rumor.bandfill'] = '{name} 既出榜，{band}一席由 {by} 递补。';
  K['prodigy.rumor.eternal.1'] = '又是你。';

  /* ── 编年史短语（§4.2 数据源扩展五类 + 飞升叩门）── */
  K['prodigy.chronicle.rank.up'] = '是日同代榜反超，升至第 {n} 位。';
  K['prodigy.chronicle.rank.down'] = '是日被同代超越，退至第 {n} 位。';
  K['prodigy.chronicle.spar.win'] = '是日论道胜{name}。';
  K['prodigy.chronicle.spar.lose'] = '是日论道负于{name}。';
  K['prodigy.chronicle.spar.draw'] = '是日与{name}论道战平。';
  K['prodigy.chronicle.feud'] = '是日与{name}结仇。';
  K['prodigy.chronicle.feudend'] = '是日与{name}一笑泯恩仇。';
  K['prodigy.chronicle.kill'] = '是日阵前斩杀宿敌{name}。';

  /* ── 日志 ── */
  K['prodigy.log.break'] = '{name}破入{realm}——同代天骄，名不虚传';
  K['prodigy.log.spar.win'] = '论道胜{name}，赢下赌注 {n} {cur}';
  K['prodigy.log.spar.lose'] = '论道负于{name}，赌注 {n} {cur} 归了对方';
  K['prodigy.log.spar.draw'] = '与{name}论道战平——棋逢对手，赌注各归';
  K['prodigy.log.feud'] = '{name}拂袖而去：「下次见面，剑下不留情。」';
  K['prodigy.log.feudend'] = '{name}与你相视一笑，多年的块垒一扫而空。';
  K['prodigy.log.kill'] = '{name}殒于你手——同代之争，就此了账';
  K['prodigy.log.evfire'] = '{name}拦在了你的面前';

  /* ── 携才投效（§6.2 三分支；「收」支的入门句走 sect.disc.join，本族只出另两支与折节补句）── */
  K['prodigy.join.refuse'] = '{name}携礼登门求附，{sect}只回一句「不问出身，只看本事」——他拱拱手，转身下了山。';
  K['prodigy.join.win'] = '{name}在阶前被连压三价，对答不失分寸，究竟还是留下了——折节事小，失才事大。';
  K['prodigy.join.lose'] = '{name}嫌价太贱，把礼盒搁在阶前，转身就走。';

  /* ── 天骄专属事件全文（№120~124）── */
  K['event.prodigy_ev_drink.name'] = '把酒论道';
  K['event.prodigy_ev_drink.story'] = '同代之人在山下备了酒，邀你共饮几杯——顺便，互报师承。';
  K['event.prodigy_ev_drink.branch.right'] = '推杯置腹，把师承恩怨聊个通透';
  K['event.prodigy_ev_drink.branch.evil'] = '酒里暗暗下药，试探对方道行深浅';
  K['event.prodigy_ev_drink.branch.neutral'] = '浅酌辄止，留三分话在肚子里';
  K['event.prodigy_ev_gift.name'] = '切磋赠礼';
  K['event.prodigy_ev_gift.story'] = '一番论道之后，对方从储物袋里摸出一件东西塞给你：「用得上的。」';
  K['event.prodigy_ev_gift.branch.right'] = '坦然收下，回赠一份自家小礼';
  K['event.prodigy_ev_gift.branch.evil'] = '收下却不安，暗中盘问此物来历';
  K['event.prodigy_ev_gift.branch.neutral'] = '称谢收下，把这份人情记在心里';
  K['event.prodigy_ev_escort.name'] = '秘境同行';
  K['event.prodigy_ev_escort.story'] = '对方与你同路入秘境，约定同行一程——两条影子，一路无话也不尴尬。';
  K['event.prodigy_ev_escort.branch.right'] = '并肩而行，互为照应，各凭本事';
  K['event.prodigy_ev_escort.branch.evil'] = '半途诈称妖兽来袭，借刀试探';
  K['event.prodigy_ev_escort.branch.neutral'] = '各走各路，到岔口拱手作别';
  K['event.prodigy_ev_feud.name'] = '狭路相逢';
  K['event.prodigy_ev_feud.story'] = '窄路相逢，宿敌按住了剑柄：「好巧。」风停了，酒旗也不动了。';
  K['event.prodigy_ev_feud.branch.right'] = '持刀问心——一剑了断这段恩怨（胜 = 心结除，不斩杀）';
  K['event.prodigy_ev_feud.branch.evil'] = '痛下杀手——今日只有一人能走出此地（胜 = 斩杀出榜）';
  K['event.prodigy_ev_feud.branch.neutral'] = '转身避开——这笔债，改日再算';
  K['event.prodigy_ev_forgive.name'] = '一笑泯恩仇';
  K['event.prodigy_ev_forgive.story'] = '对方拦住你的去路，却没有拔剑。半晌，叹了口气：「当年那件事……」';
  K['event.prodigy_ev_forgive.branch.right'] = '当面致歉——一言解数年之怨';
  K['event.prodigy_ev_forgive.branch.evil'] = '冷笑不语，拂袖而去';
  K['event.prodigy_ev_forgive.branch.neutral'] = '提来一坛酒——恩怨都在杯子里';
  /* ── 江湖榜④ №129~131（第册三批 · 设计稿 §六 4 / §七）────────────────────── */
  K['event.jianghu_ev_rival_ling.name'] = '同脉争灵';
  K['event.jianghu_ev_rival_ling.story'] = '你与{name}在同一处灵脉落了脚。脉眼只一个，谁先坐下，这一季的灵气就归谁。';
  K['event.jianghu_ev_rival_ling.branch.right'] = '分脉而居——各取半季，交个朋友';
  K['event.jianghu_ev_rival_ling.branch.evil'] = '抢先纳灵——把脉眼占死，让对方扑空（判定 [气·普通]）';
  K['event.jianghu_ev_rival_ling.branch.neutral'] = '起身让出此地，另寻一处野脉';
  K['event.jianghu_ev_rival_trial.name'] = '同破一藏';
  K['event.jianghu_ev_rival_trial.story'] = '一座前辈洞府现了门，{name} 也在门外。府中禁制认“先到者”，而两人同时伸出了手。';
  K['event.jianghu_ev_rival_trial.branch.right'] = '推让在先，结伴入府——藏中所得按出力分';
  K['event.jianghu_ev_rival_trial.branch.evil'] = '硬闯禁制，抢在对方前面取宝（判定 [战·1.2 倍]）';
  K['event.jianghu_ev_rival_trial.branch.neutral'] = '只取门口那层散落的，见好就收';
  K['event.jianghu_hid_glimpse.name'] = '云外一声';
  K['event.jianghu_hid_glimpse.story'] = '山道上有人谈起天榜最前那三个问号：一位据说只在雨天落子，一位替人盖屋从不留名，一位你说出名字时对方只笑了笑。你听见的是风，不是他们。';
  K['event.jianghu_hid_glimpse.branch.right'] = '把这些话记在心里——心境澄明一时（不寻人、不递名帖）';
  K['event.jianghu_hid_glimpse.branch.evil'] = '顺着话头去卖消息，换一袋灵石';
  K['event.jianghu_hid_glimpse.branch.neutral'] = '一笑而过，继续赶自己的路';

  /* ── UI ── */
  /* `prodigy.system` 一字未动：它还被「弟子档天骄角标」与渐次解锁提示两处读着（view:4543 / :6737），
   * 那两处说的是「这人来自同代名录」，不是页签名 ⇒ 页签另起 `jianghu.system`，不拿改值当复用。 */
  K['prodigy.system'] = '同代天骄';
  K['jianghu.system'] = '江湖榜';
  K['jianghu.band.0'] = '天榜';
  K['jianghu.band.1'] = '地榜';
  K['jianghu.band.2'] = '玄榜';
  K['jianghu.band.3'] = '黄榜';
  K['jianghu.q'] = '？？？';                          /* 隐世三席的一切明细（裁定 2） */
  K['jianghu.hid.tag'] = '隐世';
  K['jianghu.stranger'] = '素不相识';                  /* 名录补位的背景席位：在榜、可见、不给战书入口 */
  K['jianghu.lv.0'] = '可压';                          /* 三档徽标取代战力数字：阈值取切磋表值 */
  K['jianghu.lv.1'] = '相当';
  K['jianghu.lv.2'] = '悬殊';
  K['prodigy.board.me'] = '你';
  /* 第册一批③：`prodigy.board.empty`「榜上无名」随早退分支删除——四榜席位由名录实时补位，
   * 新口径下这一态不存在（新建角色也看得见四十个名字），留着就是一枚永远取不到的孤儿键。 */
  K['prodigy.board.hint'] = '一榜十席：相识者、名录补位与天榜前三的隐世高人同张榜；榜面不写战力，只给可压 / 相当 / 悬殊三档';
  K['prodigy.board.myrank'] = '你当前位列{band}第 {n} 位';
  K['prodigy.board.refresh'] = '名次播报每 {y} 游戏年一次';
  K['prodigy.detail.apt'] = '资质';
  K['prodigy.detail.faction'] = '归属';
  K['prodigy.detail.talent'] = '天赋（纯展示，不作用任何数值）';
  K['prodigy.detail.rel'] = '关系';
  K['prodigy.detail.bond'] = '好感 {n}';
  K['prodigy.detail.wl'] = '切磋战绩 {w} 胜 {l} 负 {d} 平';
  K['prodigy.detail.feudstate'] = '心结在身——渡劫成算 −0.02（单份不叠加）';
  K['prodigy.detail.eternal'] = '跨世宿敌';
  K['prodigy.detail.boost'] = '机缘在身（资质临时 +0.1）';
  K['prodigy.detail.serving'] = '效力于你';
  K['prodigy.spar.cd'] = '对方闭关未出（{t} 后可再约）';
  K['prodigy.spar.poor'] = '赌注不足，约不起这一场';
  K['prodigy.spar.vs'] = '你 {a} 对 {b}（对方）';
  /* 切磋平衡批（§5.3 v2）：三档赌注 + 强弱差让 + 胜方材料彩头 */
  K['prodigy.spar.title'] = '论道切磋';
  K['prodigy.spar.confirm2'] = '与{name}论道切磋（{handicap}）：赌注 {n} {cur}，胜返 {ret}、负失押注、平局不记账。双方战力 ±10% 浮动掷判。败北结仇率 {fp}%，胜方材料彩头 {mp}%。切磋？';
  K['prodigy.spar.kind.light'] = '轻注';
  K['prodigy.spar.kind.std'] = '标准';
  K['prodigy.spar.kind.heavy'] = '重注';
  K['prodigy.spar.kind.hint'] = '轻注 {a} · 标准 {b} · 重注 {c}（重注败北结仇率升至 40%）';
  K['prodigy.spar.handicap.crush'] = '碾压局';
  K['prodigy.spar.handicap.crush.hint'] = '实力悬殊，胜之不武——胜返 ×1.5，好感只 +1';
  K['prodigy.spar.handicap.brave'] = '问强';
  K['prodigy.spar.handicap.brave.hint'] = '对方战力在你之上——胜则天下侧目：胜返 ×3，好感 +3，材料彩头上浮';
  K['prodigy.spar.handicap.even'] = '势均力敌';
  K['prodigy.spar.handicap.even.hint'] = '棋逢对手——胜返 ×2';
  K['prodigy.spar.feudp'] = '败北结仇率 {p}%';
  K['prodigy.spar.matp'] = '胜方材料彩头 {p}%';
  K['prodigy.spar.locked'] = '金丹之后，方闻同代之名';
  K['prodigy.log.spar.mat'] = '论道之后互赠所得：得材料「{mat}」';

  /* ── 袭杀与族中寻仇（第卌四批 · 天骄卷 v1.11 §五B · 数值详设 §6.1B）──
   * 与切磋同构：引擎写这一行日志，界面把**同一个 key** 拿去 toast（不另抄一份措辞）。
   * 屏上只说引擎真算的几件事：门槛倍率 / 夺资额 / 败的道伤与善恶 / 已袭杀次数 / 链条状态。 */
  K['prodigy.log.ambush'] = '你伏击{name}，夺 {cur} ×{loot}（此人已遭你袭杀 {n}/{max}）';
  K['prodigy.log.ambushfail'] = '你伏击{name}不成，反受其伤（道伤 +{dao}）';
  K['prodigy.log.revengearm'] = '{name} 一门已将你记入死账——族中高手不诛你不休';
  /* 身死即结的「夺宝」三条（第册三批 · 设计稿 §四）：正账一行 + 两支「没白拿成空」的说明行 */
  K['prodigy.log.killloot'] = '{name} 身死，你从其遗物中取走 {n} 件，另得 {cur} ×{loot}';
  K['prodigy.log.killloot.dup'] = '{name} 的那件东西你本就有着一份，此趟只留下一个名号';
  K['prodigy.log.killloot.pillfull'] = '丹匣已满，那枚丹换作了 {cur} ×{n}';
  K['prodigy.ambush.title'] = '袭杀';
  K['prodigy.ambush.btn'] = '袭杀此人';
  K['prodigy.ambush.why'] = '需战力 ≥ 对方 ×{r}；败 = 道伤 +{dao}、道心 −{k}';
  K['prodigy.ambush.count'] = '已遭袭杀 {n}/{max} 次';
  K['prodigy.ambush.loot'] = '夺资约 {cur} ×{n}';
  K['prodigy.ambush.cd'] = '伏击未复（{t} 后可再出手）';
  K['prodigy.ambush.confirm'] = '伏击{name}：胜则夺 {cur} ×{loot} 并记袭杀 {n}/{max}，败则道伤 +{dao}、道心 −{k}。'
    + '双方战力 ±10% 浮动，须压过对方 ×{r} 才算成；满 {max} 次此人必死，其族高手必来寻仇。袭杀？';
  K['prodigy.ambush.reject'] = '此刻下不了手';
  K['prodigy.ambush.chain.n'] = '一族寻仇 · 已胜 {n} 场';
  K['prodigy.ambush.chain.cd'] = '{t} 后再战';

  SQ.lexRegister('xiuxian', K);
})();
