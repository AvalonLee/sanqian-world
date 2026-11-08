/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-canon.cjs 生成，重跑覆盖
 * CANON_EVENTS_SCHEDULE 内置 6 案（恒定旬位；36 案扩展事件由 payload 注入）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L10759–L10864 · const CANON_EVENTS_SCHEDULE
 * ============================================================ */

    const CANON_EVENTS_SCHEDULE = [
      {
        id: 'canon_hengyang_5',
        triggerTurn: 5,
        duration: 4,
        region: 'hengyang',
        tileIdx: 3,
        title: '【衡阳城】刘正风金盆洗手大会',
        enemyName: '大嵩阳手费彬',
        enemyTitle: '嵩山太保 · 五岳令旗',
        enemyStance: 'gang',
        enemyPower: 52,
        enemyHp: 115,
        desc: '衡山派刘正风广发英雄帖举行金盆洗手大会，传闻嵩山派左冷禅已遣太保费彬携五岳令旗赶往衡阳兴师问罪！',
        canonOutcomeTitle: '《江湖邸报 · 衡山笑傲绝响》',
        canonOutcomeText: '因你未在限期内赶赴衡阳，此事已按原著轨迹落幕：嵩山派费彬率众以勾结魔教长老曲洋为由逼迫刘正风。刘、曲二人肝胆相照，于衡山荒谷合奏千古绝唱《笑傲江湖曲》后自绝经脉，天下知音莫不叹息。'
      },
      {
        id: 'crisis_juxian',
        triggerTurn: 10,
        duration: 4,
        region: 'kaifeng',
        tileIdx: 4,
        title: '【聚贤庄】英雄宴围剿乔峰',
        enemyName: '聚贤庄群豪统领',
        enemyTitle: '中原群雄 · 绝交血战',
        enemyStance: 'gang',
        enemyPower: 64,
        enemyHp: 140,
        desc: '游氏双雄与薛神医广发英雄帖，中原豪杰齐聚汴梁/洛阳聚贤庄欲围攻乔峰！快去助乔大侠一臂之力！',
        canonOutcomeTitle: '《江湖邸报 · 聚贤庄断义血酒》',
        canonOutcomeText: '因你未在限期内赶赴聚贤庄，此事已按原著轨迹落幕：乔峰携阿朱求医，于堂前痛饮断义酒，单掌独战中原三百豪杰，血染长街！绝境之中一神秘黑衣人现身救走乔峰，乔峰自此远走塞北雁门关。',
        onCanonExpire: () => {
          const xf = state.masters.find(m => m.id === 'xiaofeng');
          if (xf) { xf.region = 'yanmenguan'; xf.tileIdx = 6; }
        }
      },
      {
        id: 'canon_tianlong_15',
        triggerTurn: 15,
        duration: 4,
        region: 'dali',
        tileIdx: 3,
        title: '【大理天龙寺】鸠摩智强索六脉神剑',
        enemyName: '大轮明王鸠摩智',
        enemyTitle: '吐蕃国师 · 火焰刀气',
        enemyStance: 'gang',
        enemyPower: 74,
        enemyHp: 160,
        desc: '吐蕃国师鸠摩智亲赴大理天龙寺索要《六脉神剑》图谱，枯荣大师与本因方丈正布阵迎敌！',
        canonOutcomeTitle: '《江湖邸报 · 天龙寺焚谱》',
        canonOutcomeText: '因你未在限期内赶赴大理天龙寺，此事已按原著轨迹落幕：枯荣大师与五位高僧合练六脉神剑迎战鸠摩智，危急关头枯荣大师以一阳指焚毁图谱，鸠摩智遂挟持熟记剑谱的段誉东赴江南姑苏燕子坞！',
        onCanonExpire: () => {
          const dy = state.masters.find(m => m.id === 'duanyu');
          if (dy) { dy.region = 'yanziwu'; dy.tileIdx = 4; }
        }
      },
      {
        id: 'crisis_guangming',
        triggerTurn: 20,
        duration: 4,
        region: 'guangming',
        tileIdx: 3,
        title: '【昆仑光明顶】六大派围攻明教总坛',
        enemyName: '灭绝师太·倚天剑',
        enemyTitle: '峨眉掌门 · 六派先锋',
        enemyStance: 'qiao',
        enemyPower: 80,
        enemyHp: 170,
        desc: '少林、武当、峨眉、华山等六大派精锐齐聚西域昆仑光明顶，明教百年圣火危在旦夕！',
        canonOutcomeTitle: '《江湖邸报 · 光明顶少年教主》',
        canonOutcomeText: '因你未在限期内赶赴光明顶，此事已按原著轨迹落幕：明教五行旗与法王重伤之际，少年张无忌自光明顶秘道现身，以九阳神功与乾坤大挪移独战六大派高手，一战名动天下，被推举为明教第三十四代教主！'
      },
      {
        id: 'canon_shaolin_25',
        triggerTurn: 25,
        duration: 4,
        region: 'shaolin',
        tileIdx: 3,
        title: '【少室山】天下英雄大会',
        enemyName: '星宿老怪丁春秋',
        enemyTitle: '星宿海主 · 化功毒掌',
        enemyStance: 'rou',
        enemyPower: 84,
        enemyHp: 180,
        desc: '天下群豪齐聚嵩山少林寺大雄宝殿前，庄聚贤、丁春秋、慕容复与萧峰三兄弟即将展开惊天对决！',
        canonOutcomeTitle: '《江湖邸报 · 少室山三兄弟结义与藏经阁点化》',
        canonOutcomeText: '因你未在限期内赶赴少林寺，此事已按原著轨迹落幕：萧峰、虚竹、段誉于少室山前喝血酒义结金兰，力挫丁春秋、慕容复与游坦之；随后藏经阁内扫地神僧现身，点化萧远山与慕容博皈依佛门！'
      },
      {
        id: 'canon_xiangyang_30',
        triggerTurn: 30,
        duration: 4,
        region: 'xiangyang',
        tileIdx: 4,
        title: '【襄阳雄关】铁骑叩关守城大战',
        enemyName: '金轮法王·十龙十象',
        enemyTitle: '蒙古国师 · 龙象般若',
        enemyStance: 'gang',
        enemyPower: 88,
        enemyHp: 195,
        desc: '金轮法王率精锐强攻襄阳北城楼，郭靖黄蓉吹响号角，广邀天下侠士共守襄阳！',
        canonOutcomeTitle: '《江湖邸报 · 襄阳烽火神雕破敌》',
        canonOutcomeText: '因你未在限期内赶赴襄阳，此事已按原著轨迹落幕：郭靖黄蓉率全城军民死战不退，危急时刻杨过与小龙女携神雕驰援，于万军之中击毙敌帅，襄阳雄关转危为安！'
      }
    ];

/* `state` 槽位（生成器立）：数据表内的闭包（onCanonExpire 族）逐字引用全局 state，
 * 由 core/state 每次载档/创角后调 setRuntimeState 回填当前引用；node 侧走导出 setter。 */
var state = null;
function setRuntimeState(s) { state = s; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CANON_EVENTS_SCHEDULE: CANON_EVENTS_SCHEDULE, setRuntimeState: setRuntimeState };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { CANON_EVENTS_SCHEDULE, setRuntimeState });
}
