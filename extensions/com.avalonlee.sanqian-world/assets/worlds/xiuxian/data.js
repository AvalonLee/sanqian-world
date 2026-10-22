/* xiuxian/data.js — 修仙世界数值表（引擎基准，与《系统与数值详细设计》§六及各节对表）
 * 只存数值不存文案：境界/秘境/品阶名走词表（realm.N / combat.zone.N / gear.tier.N）。
 * REALMS[i].need = 从 i-1 突破到 i 所需修为；REALMS[0].need = null。
 * tribBase = 突破进该境界的渡劫基础成功率。本表为两世界共用引擎基准（古武同值继承）。
 */
(function () {
  var SQ = window.SQ;
  SQ.XDATA = {
    /* ── §6.1 境界表（10 阶 9 次突破）──
     * tribBase 压陡（第卌二批 · 2026-10-15 · 用户令「成功率太容易提升，继续增加难度；中程起不运营
     * 装备法宝要压到 0.5 以下，境界越高越难」）：**裸身 p ≈ 本列**（探针实测零投入只差 +0.002~0.008），
     * 旧曲线 0.95→0.338 的递减在金丹就被加项抹平（上品四件套 + 善名 300 + 道护④ = 顶满 0.95），
     * 故同批收加项头寸：TRIB_RESIST_CAP 0.20→0.12、tribBonus 功法每级减半、渡劫词条同名只取最强一份。
     * ⚠️ **karmaMod 表一字未动**：第卌二批首轮试验把它 ×0.5，实测把 §6.3 阵营主轴「魔 < 左 < 正」的
     *   天数序打翻（sim-event-economy 判红）⇒ 收窄善恶加项属另一议题，需单独裁定，不在本批射程。
     * 历史口径保留：势力批 v2.4「自金丹起 base ×0.75」是**上一档**表值（0.89→0.668 等）的来源，本批
     *   在其之上再压一档；重校准读数见 sim-pacing 末行与数值详设 §6.4.1（K 系数随本批重定）。 */
    REALMS: [
      { need: null,        baseQi: 1,     power: 20,     tribBase: null },
      { need: 1000,        baseQi: 3,     power: 60,     tribBase: 0.95 },
      /* 渡劫门槛上调（势力批 v2.4 需求 §1）：第 3 境（金丹）起基础成算 ×0.75（表内已折算） */
      { need: 5000,        baseQi: 9,     power: 180,    tribBase: 0.60 },
      { need: 25000,       baseQi: 27,    power: 540,    tribBase: 0.50 },
      { need: 150000,      baseQi: 81,    power: 1600,   tribBase: 0.42 },
      { need: 800000,      baseQi: 240,   power: 4800,   tribBase: 0.36 },
      { need: 5000000,     baseQi: 720,   power: 14000,  tribBase: 0.33 },
      { need: 60000000,    baseQi: 2100,  power: 42000,  tribBase: 0.30 },
      { need: 500000000,   baseQi: 6300,  power: 125000, tribBase: 0.26 },
      { need: 4000000000,  baseQi: 19000, power: 375000, tribBase: 0.22 }
    ],

    /* ── §6.1A 寿元 / 道伤（寿元批 2026-10-15 立，第卌八批 2026-10-16 改**累加阶梯**）──────
     * 口径由用户三条令定死：① 显示「寿元：N岁，尚余约M年」②寿元随游戏事件**顺序增长**、晋升不从 0 重算
     *   ③丹 / 功法 / 法宝 / 奇遇给增减、渡劫失败与被人击伤折寿。
     * ⇒ 上界 = **凡人寿元 LIFE_MORTAL + 逐境增量 LIFE_STEP 的前缀和**（不是「每境一个独立总寿」）：
     *   破境只是把上界抬高，已历岁月 (`ws.lifeUsed`) 一字不动，所以「活到多少岁」是一条连续线。
     * LIFE_STEP[r] = ceil(1.3 × 第 r 境**纯闭关**实测年)——出厂件 sq-wip-life38d（300 局 · 真实渡劫骰 ·
     *   默认功法 Lv1 钉死 · 只喂 SQ.Idle.settle）逐境中位 = 0.83 / 3.32 / 5.81 / 16.61 / 30.73 / 65.61 /
     *   254.98 / 965.11 / 2582.20 年，全程中位 4,128 年 ⇒ 累加界 62 / 67 / 75 / 97 / 137 / 223 / 555 /
     *   1810 / 5167，真仙（LIFE_ETERNAL）不受寿限。
     * ⚠️ 取**中位数**是裁定（用户 2026-10-16 选「×1.3×逐境中位」）：p90 全程 9,156 年 > 上界 5,167 年，
     *   所以约三成只闭关不抢命的人真会老死——这正是折寿与延寿丹要有分量的那一面，别当 bug 报。
     * 旧表 400~16000 的病在低境：练气实际只需 1~2 年却给 400 年，寿元不构成任何约束。
     * LIFE_SEED = 创角生年随机区间（「游戏刚开始寿元 16~60」与「练气寿元 = 凡人寿元」碰车后收至此档，
     *   用户 2026-10-16 裁定）；生年直接记进 `lifeUsed`，故「享年」口径天然连续、转世重掷。
     * LIFE_GRACE = 旧档保底：新表远紧于旧表，读档当场不许判死（一次性迁移，见 index.js normalize）。
     * LIFE_OFFLINE_MIN = **寿元专用**离线上限（分钟）：经济侧仍照 OFFLINE_CAP_H 结 12 小时，
     *   只有衰老按 30 分钟 = 5 游戏年封顶——否则一次隔夜回归（旧口径 120 年）就超过练气一辈子的寿。
     * 流逝与产出仍同一条时钟；调压力只改本表，判据口 / 界面口全部取自 `lifeCapOf`，没有第二处数。 */
    LIFE_MORTAL: 60,
    LIFE_STEP: [2, 5, 8, 22, 40, 86, 332, 1255, 3357],
    LIFE_ETERNAL: 9,                  /* 境界 ≥ 此档 = 无尽（旧口径靠表尾写 0，现改显式一常数） */
    LIFE_SEED: [16, 30],
    LIFE_GRACE: 60,
    LIFE_OFFLINE_MIN: 30,
    /* 折寿率（× 当境上界，下限 1 年）：渡劫失败与战败**各咬一口**，与道伤并行——
     * 道伤是「连败栈」(七连败崩碎)，折寿是「岁月账」(慢慢老死)，两条线各管一段、不做第三套。 */
    LIFE_HIT: { trib: 0.02, wound: 0.01 },
    LIFE_WARN_P: 0.2,                 /* 剩余 ≤ 两成 = 大限将至（呈报只在界面，引擎不写日志——每秒 tick 会刷屏） */
    /* 道伤槽（与 §8.3 那条「道伤 debuff」同源同物：那是**症**（qiRate −15%/12h），这层是**depth**）：
     * 单次失败加层 = clamp(连败数 − freeStreak, 0, gainMax) ⇒ **前二败算皮外伤不入槽**，
     * 吃满 cap 15 需**七连败**（0+0+1+2+3+4+5）。freeStreak 是本批与压陡后的 base 曲线同批定标出来的：
     * 旧口径（无免伤层）五连败即死，在第卌二批的新曲线上会把魔道深档的真仙劫变成反复打死人
     * （探针实测该画像终局 p 一度吃在 TRIB_P_CLAMP 下界 0.05 ⇒ 同批把尾段压平 + 加免伤层）。
     * 成功涤伤 −cleanse，岁月疗养 healPerYear/年（1 层/百年）。高境界一轮重活动辄上千年 ⇒ 道伤自愈、
     * 由寿元咬人；中低境界一轮只有几年、疗养来不及 ⇒ 由道伤咬人。两条致死线各管一段，不做第三套。 */
    DAO_SHANG: { cap: 15, warn: 8, gainMax: 5, freeStreak: 2, cleanse: 2, healPerYear: 0.01 },

    /* ── 袭击 / 袭杀 / 族中寻仇（第卌四批；设计稿 docs/设计稿/袭击与袭杀寻仇-设计稿.md 转正）───────
     * 三条链共用一张表：概率口（随 |karma| 递增）/ 限时口（**在线时钟**，离线冻结不补算，超时默认迎战）/
     * 敌手战力口（高一境境界的**基础战力** × 系数 = REALMS[realm+1].power，与切磋/天骄名录同一条 REALMS 基准）。
     * 文案与收益数值写在事件模板里（与全池同纪律），本表只放**引擎读的那一列数**。
     * 收益递增只在**寻仇链**上（用户令「不断成功完成事件，奖励也会越来越好」），倍率有硬顶。 */
    AMBUSH: {
      ROLL_MS: 30 * 60 * 1000,              /* 阵营袭击掷判节拍：在线时长累计到一格才掷一次 */
      P_BASE: 0.04, P_MAX: 0.30, K_REF: 900, /* p = P_BASE + (P_MAX − P_BASE) × min(1, |karma| ÷ K_REF) */
      DECIDE_MS: 90 * 1000,                 /* 三选限时（迎战 / 避战 / 认输必须手动），超时默认迎战 */
      FOE_K: 0.60,                          /* 来客战力 = 高一境基础战力 ×0.60：裸身必输（差 1.8 倍），装备/功法有底才谈得上一战 */
      REVENGE_K: 1.00,                      /* 族中寻仇 = 高一境基础战力 ×1.00（用户铁律「必然比角色高一个境界」；顶到真仙即同境） */
      REVENGE_FINAL: 3,                     /* 第卌五批（用户改口径）：连胜满 3 场 ⇒ 第 4 轮上门的高**两**境（族中老祖），几乎必败 ⇒ 链条自我收口，N56 的「无限灵石流」在此断掉 */
      REVENGE_FINAL_MIN: 1.2,               /* 老祖战力的下界 = 玩家实付战力 ×1.2（与 KILL_RATIO 同一把「碾压」尺）。判定只给玩家一侧 ±10% 抖动、且仍要 ≥ 快照 ×1.01 ⇒ 挂出这一战当场掷不赢，只有在这一链期间把战力长过它才翻盘 = 「几乎必败」而非档上写死必败 */
      KILL_CD_MS: 30 * 60 * 1000,           /* 袭杀冷却（全局一枚锚，防连环收割整榜天骄） */
      KILL_MAX: 3,                          /* 同一天骄被袭杀满 3 次 ⇒ 判定身死 ⇒ 播种族中寻仇 */
      KILL_RATIO: 1.2,                      /* 袭杀成功门槛 = 我方战力 ≥ 敌手 ×1.2（切磋只需 1.01，这里要碾压） */
      KILL_KARMA: -18, KILL_DAO: 1,         /* 成 = karma −18（杀人夺宝不洗白）；败 = 道伤 +1 */
      REVENGE_CD_MS: 10 * 60 * 1000,        /* 寻仇链：胜 ⇒ 10 分钟后继续下一轮；败 ⇒ 链断（不进冷却） */
      STREAK_STEP: 0.5, STREAK_CAP: 3       /* 寻仇收益倍率 = 1 + 连胜 ×0.5，封顶 ×3（连胜不许顶穿天花板） */
    },

    /* ── §6.2 秘境表（10 区）：需求战力 = 1.5 × 解锁境界基础战力 ──
     * drops = 品阶权重 [凡,良,上,灵,仙]；stones = 灵石/杀（基准值） */
    ZONES: [
      { unlock: 0, need: 30,     stones: 3,     drops: [70, 25, 5, 0, 0] },
      { unlock: 1, need: 90,     stones: 8,     drops: [50, 35, 12, 3, 0] },
      { unlock: 2, need: 270,    stones: 20,    drops: [35, 38, 20, 6, 1] },
      { unlock: 3, need: 810,    stones: 50,    drops: [22, 35, 28, 12, 3] },
      { unlock: 4, need: 2400,   stones: 120,   drops: [12, 28, 33, 20, 7] },
      { unlock: 5, need: 7200,   stones: 300,   drops: [5, 18, 35, 28, 14] },
      { unlock: 6, need: 21000,  stones: 750,   drops: [0, 10, 30, 35, 25] },
      { unlock: 7, need: 63000,  stones: 2000,  drops: [0, 0, 20, 40, 40] },
      { unlock: 8, need: 187500, stones: 5000,  drops: [0, 0, 10, 35, 55] },
      { unlock: 9, need: 562500, stones: 15000, drops: [0, 0, 0, 30, 70] }
    ],

    /* ── §3.2 品阶词条池（5 阶）：atk 随秘境缩放，qiBonus/resist/attrValue 固定区间 ──
     * req = 佩戴基础境界（§3.5）；refine = 炼化返还基数（§3.4）；specialP = 特殊词条概率（§3.6） */
    GEAR_TIERS: [
      { atk: [2, 5],     qiBonus: null,      resist: null,      attr: null,     req: -1, refine: 5,    specialP: 0 },
      { atk: [4, 8],     qiBonus: [0.03, 0.08], resist: null,   attr: null,     req: -1, refine: 20,   specialP: 0 },
      { atk: [8, 14],    qiBonus: [0.08, 0.15], resist: [40, 80],  attr: null,  req: 2,  refine: 100,  specialP: 0.03 },
      { atk: [14, 24],   qiBonus: [0.15, 0.25], resist: [80, 150], attr: [8, 14], req: 4, refine: 500, specialP: 0.08 },
      { atk: [22, 36],   qiBonus: [0.25, 0.40], resist: [150, 260], attr: [15, 25], req: 6, refine: 2500, specialP: 0.15 }
    ],
    /* 极品词条追加（§3.5）：resist/attrValue roll 进区间前 10% → req +1 */
    PRIME_TOP_PCT: 0.10,
    /* 阵营分布（§3.3）：左 60 / 正 25 / 魔 15；魔道词条 ×1.10、karma -15/件 */
    ALIGN_DROP_W: { neutral: 60, right: 25, evil: 15 },
    EVIL_STAT_MULT: 1.10,
    /* 装备特殊词条池（§3.6，等权 + ignore_req 权重 12） */
    GEAR_SPECIALS: [
      { id: 'ignore_req',    weight: 12 },
      { id: 'sword_heart',   weight: 9 },  /* combatPower +8% */
      { id: 'spirit_rune',   weight: 9 },  /* qiRate +8% */
      { id: 'adamantine',    weight: 9 },  /* resist +60 */
      { id: 'swift_shadow',  weight: 9 },  /* combatSpeed +10% */
      { id: 'merchant_wit',  weight: 9 },  /* shopCost -8% */
      { id: 'karma_mirror',  weight: 9 },  /* eventLuck +12% */
      { id: 'dao_oath',      weight: 9 },  /* offlineEff +12% */
      { id: 'thunder_mark',  weight: 8 },  /* tribBonus +0.05 */
      { id: 'devour',        weight: 8 }   /* 击杀灵石 +12% */
    ],
    GEAR_SPECIAL_EFFECTS: {
      sword_heart: { combatPower: 0.08 },
      spirit_rune: { qiRate: 0.08 },
      swift_shadow: { combatSpeed: 0.10 },
      merchant_wit: { shopCost: -0.08 },
      karma_mirror: { eventLuck: 0.12 },
      dao_oath: { offlineEff: 0.12 },
      thunder_mark: { tribBonus: 0.05 },
      devour: { killStones: 0.12 },
      world_mirror: { eventLuck: 0.20 }   /* 照世镜（独占）：karma_mirror 强化，另开「未择之路」界面能力（view 消费 item.special 判定） */
    },
    ADAMANTINE_RESIST: 60,
    GEAR_SLOTS: ['weapon', 'treasure', 'armor', 'accessory'],
    /* attrValue 槽位亲和权重（精气神实现 §3.3） */
    ATTR_AFFINITY: {
      weapon: { jing: 50, qi: 25, shen: 25 },
      armor: { jing: 50, qi: 25, shen: 25 },
      treasure: { qi: 50, jing: 25, shen: 25 },
      accessory: { shen: 50, qi: 25, jing: 25 }
    },
    STASH_CAP: 12,

    /* ── §四 功法（G5）── */
    ARTS_SLOTS: 6,
    SHELF_CAP: 24,
    ARTS_MAX_LV: 9,
    /* 升级消耗（修行状态批 · 改耗修为）：base[lv−1]（Lv1→2 … Lv8→9 共八档，逐级 ≈×3.3）
     * × ARTS_COST_TIER[品阶]（黄1/玄3/地10/天36）× (1+境界×0.5) × max(50%, 1−ΣartsSpeed)。
     * 品级越高、等级越高 → 每级所需修为越多（需求 §4）；天阶 8→9 ≈ 2.3 亿修为，为真仙前长线目标。
     * 🔧 等级起点批 2026-10-14：功法等级由 0~9 改 **1~9（入门即 Lv1）**，表长 9 → **8**——
     *   取消的是原「Lv0→1」那一档（60 起价），其余八档价格与品阶/境界乘区**一字未动**。 */
    ARTS_COST: [240, 900, 3200, 11000, 36000, 120000, 400000, 1300000],
    ARTS_COST_TIER: { huang: 1, xuan: 3, di: 10, tian: 36 },
    ARTS_COST_REALM: 0.5,                        /* ×(1 + 境界索引×0.5) */
    ARTS_SPEED_FLOOR: 0.5,                       /* 折扣下限 50% */
    ARTS_NURTURE: { right: 2, neutral: 2, evil: 3 },  /* 滋养点/级 × ARTS_NURTURE_TIER[品阶] */
    /* 品阶强度阶梯（第卅八批 · 用户令「四品阶数值太接近，高品阶要明显更强」）——**两条通道各有各的阶梯**：
     *   · **词条侧 = 黄 1 / 玄 2 / 地 3.5 / 天 6**：数值直接重排进《功法全录》每级效果列
     *     （正典 = 文档，改完 `node .tests/gen-arts.cjs` 再生成），**黄阶保持 dev 原值、一部都不动**
     *     （返工裁定：先前写成「按黄阶中位归一」，实测把吐纳法 qiRate 0.05→0.038、聚灵诀 qiCap 0.10→0.05
     *     一起改了，等于砍开局两部功法各 24% / 50% —— 中位保住了、单条没保住，已按「恢复黄阶原值」重做）。
     *     代价落在地/天阶（6 槽满级同乘区 qiRate +540%→+1072% 等），极限审计表（#105 / #153 / 通用规范 §一）
     *     与 `FUSE.FIELD_CAP` 同批重基线。
     *   · **滋养侧 = 黄 1 / 玄 1.5 / 地 2 / 天 2.5（压缩过的阶梯）**：原口径滋养只看阵营、与品阶无关，
     *     「高品阶更养人」在属性上根本看不出来；但把词条侧的 ×6 直接乘进滋养会造出
     *     6 槽 × Lv9 × 魔 3 × 天 6 = **972 点**（境界基础值到最高境界才 60，dc = 基础×2 = 120），
     *     三维判定 p 的公式上限 0.95 会整档饱和——高品阶「吃属性」这条线反而失去区分度。
     *     ⇒ 滋养单独设上限，最坏态压到 6×9×3×2.5 = 405。判据 = 冒烟 **#301(e)** 滋养比 1:1.5:2:2.5。
     * 「消费端再乘一遍词条」的旧方案已废（那会让 Lv9 天阶 qiRate 冲到 +479% 且与文档对不上号，
     *   遗留见 sq-wip-tier-leftover.patch）。红线四类（tribBonus / tribFailLossMod / realmCost / shopCost）
     *   两条通道都不吃：它们接 TRIB_P_CLAMP 与 ARTS_COST* 两条红线，本次一字未动。 */
    ARTS_NURTURE_TIER: { huang: 1, xuan: 1.5, di: 2, tian: 2.5 },

    /* ── 修行状态（模式）与功法精通（本批新增）──
     * mode = 'seclude'（闭关领悟）| 'venture'（外出历练）；离线回归 = 潜心悟道，
     * **按原有规则结算**（OFFLINE_EFF/离线上限/引灵入体全不变），只差叙事口径。
     * qiMult：在线修为增速乘区——闭关 ×1.3（专注修行增益）/ 历练 ×0.55（修为让位给灵石掉落，
     *   在线口径）；eventMult：奇遇时钟乘区（闭关减半 / 历练加倍）；
     * practiceMult：精通增速（闭关加倍易悟 / 历练减半难悟）；combat：历练才推进秘境击杀
     * （闭关不产灵石、不出装备 = 不进战斗模拟）；claimStones：收功侧「引灵入体」修为→灵石
     * 转化阀门（闭关 false = 在线闭关零灵石进账；历练/离线潜心悟道照常转化）。 */
    MODE_DEFAULT: 'seclude',
    MODES: {
      seclude: { qiMult: 1.3, eventMult: 0.5, practiceMult: 1.5, combat: false, claimStones: false },
      venture: { qiMult: 0.55, eventMult: 1.5, practiceMult: 0.5, combat: true, claimStones: true }
    },
    /* 新手起步加速（新手起步批 v1.27）：境界 ≤ realms 的**在线**结算修为 ×qiMult，
     * 出首境自动失效、离线不享（防离线刷加速）。前 30 分钟实测首破境 ≈18min 纯干等，
     * 本加速把 realm0→1 段在线产出 ×qiMult（首破境 →~6min）；不动 rateOf 契约、
     * 不动离线/上限/击杀节奏等承重表。 */
    NEWBIE_RAMP: { realms: 0, qiMult: 3 },
    /* 精通（原「练习度」，精通批更名；每部功法独立，槽内才增长，Lv9 封顶不再增长）：
     * 满值 100 → 顿悟（Lv+1 并清零重来）。主修（槽位第 1 位）增速最高，
     * 其余 5 槽较慢；× (1+ΣartsSpeed) × 模式 practiceMult。
     * 增速随功法**当前等级递减**（低阶领悟快、高阶领悟慢）：× PRACTICE_LV_RATE[lv−1]。 */
    PRACTICE_MAX: 100,
    PRACTICE_MAIN_PER_H: 30,     /* 主修每小时基础 +30（闭关 Lv1 ≈1.6h 一悟、Lv8 ≈4.3h） */
    PRACTICE_OTHER_PER_H: 12,    /* 其余槽每小时基础 +12 */
    /* 索引 = 功法当前等级 − 1（等级起点批：Lv1~Lv8 共八档；原 Lv0 那一档 1.6 随入门即 Lv1 取消） */
    PRACTICE_LV_RATE: [1.45, 1.3, 1.15, 1.0, 0.88, 0.76, 0.64, 0.52],
    /* ── 自行领悟（自悟批；自悟保底修复批调参 + 离线折扣；自悟收敛批收池 + 边际递减）：
     * 市面传承功法（obtain.type='shop'，**黄/玄阶**）可在修持中自行领悟，随机得一部
     * 「已达标且未持有」者，直接入门（写日志 `arts.selflearn`）。
     * 加权时钟 artsLearnClock += dtSec × 模式 practiceMult（闭关 1.5 易悟 / 历练 0.5 难悟）
     * × (1+ΣartsSpeed) × 边际递减，**掷点不扣减时钟**；每 INTERVAL_MIN 加权分钟掷一次（概率 P），
     * 累计达 PITY_H 加权小时保底必得；得手 / 池枯竭清零。
     * 边际递减（自悟收敛批）：eff × 1/(1+DECAY×已自悟部数)——越悟越难，防一口气掏空池子。
     * 离线（潜心悟道）不乘模式乘区、改乘 OFFLINE_MULT，且单次结算至多推进 OFFLINE_MAX_ROLLS
     * 个掷点（防长离线回归爆发式得手）。**地阶与天阶、专属/首通/黑市/初始功法不入此池**
     * （地阶保坊市/首通独占性，天阶保奇遇/黑市/融合独占性）。 */
    ARTS_SELFLEARN: {
      INTERVAL_MIN: 8,      /* 每 8 加权分钟掷一次 */
      P: 0.22,              /* 每次掷中概率 → 首部闭关期望 ≈0.4h（含天赋/功法 artsSpeed 加成） */
      PITY_H: 2,            /* 保底：累计 2 加权小时必得一部（闭关 ≈1.2h 现实、历练 ≈3.7h 现实） */
      OFFLINE_MULT: 0.5,    /* 离线折扣：潜心悟道按在线参考速率的 50% 推进自悟时钟 */
      OFFLINE_MAX_ROLLS: 2, /* 单次离线结算至多推进 2 个掷点（防长离线回归爆发式得手） */
      DECAY: 0.6,           /* 边际递减：eff × 1/(1+DECAY×已自悟部数)；19 部池闭关口径 ≈49h 掏空（含 artsSpeed 加成 ≈42h） */
      TIERS: ['huang', 'xuan']   /* 可自悟品阶上限：地阶/天阶永不自悟（保坊市/首通/奇遇/黑市独占性） */
    },
    /* ── 功法处置（道具处置打磨包 · 散功 / 弃置）──
     * 返还 = ceil(base × (1 + 修习等级 × ART_SALVAGE_LV))，入账 in.refine（与库藏阁炼化同通道）。
     * base：可售功法（shop/black 有价）= 价 × ART_SALVAGE_RATE；非卖品按品阶定额 ART_SALVAGE_BASE。
     * 防套利：ART_SALVAGE_RATE(0.4) < ART_DUP_RATE(0.5) →「买入 → 散功」恒亏损。
     * 架上溢出（shelf 满）按 ART_DUP_RATE 自动转灵石。初始自带（obtain.type='initial'）不可散功。 */
    ART_SALVAGE_RATE: 0.4,
    ART_DUP_RATE: 0.5,
    ART_SALVAGE_LV: 0.25,
    ART_SALVAGE_BASE: { huang: 120, xuan: 400, di: 1500, tian: 6000 },
    /* karma：功法 Lv×±2 / 装备 件×±15（主文档 §6.2） */
    KARMA_ARTS_PER_LV: 2,
    KARMA_GEAR_PER_PIECE: 15,
    KARMA_CLAMP: 1000,
    /* 功法特殊属性共享池（功法武学·通用规范 §三）：弱/标准/强 三档参数 */
    SPECIAL_POOL: {
      mianxi:   { hook: 'on_tick_idle',     grades: [0.03, 0.05, 0.08] },
      jinling:  { hook: 'on_claim_stones',  grades: [0.02, 0.03, 0.05] },
      yufeng:   { hook: 'on_bottleneck',    grades: [0.8, 0.8, 0.8] },
      zhishui:  { hook: 'on_debuff_apply',  grades: [-0.10, -0.25, -0.40] },
      mingwang: { hook: 'on_trib_fail',     grades: [-0.02, -0.05, -0.08] },
      fengchun: { hook: 'on_kill_drop',     grades: [0.05, 0.10, 0.15] },
      huaji:    { hook: 'on_negative_event', grades: [0.08, 0.15, 0.25] },
      yiqian:   { hook: 'on_trib_next',     grades: [0.03, 0.05, 0.08] },
      shixue:   { hook: 'on_kill_stones',   grades: [0.08, 0.15, 0.25] },
      shikui:   { hook: 'on_bottleneck',    grades: [0.05, 0.10, 0.15] },
      shehun:   { hook: 'on_check',         grades: [0.05, 0.10, 0.15] },
      jubao:    { hook: 'on_shop_refresh',  grades: [-0.25, -0.50, -0.50] },
      huijin:   { hook: 'on_refine',        grades: [0.10, 0.25, 0.40] },
      yaoyue:   { hook: 'on_shop_price',    grades: [-0.03, -0.05, -0.08] },
      changye:  { hook: 'on_offline_cap',   grades: [1, 2, 3] },
      /* 天阶独占签名（专属事件池 v2.0.1 §4.1；同挂点白名单，参数语义见各消费点） */
      sanyan:   { hook: 'on_check',         grades: [0.3, 0.3, 0.3] },   /* 三尸宴坐：判定失败 30% 无损重来（每事件一次） */
      yanhuo:   { hook: 'on_tick_idle',     grades: [0.08, 0.08, 0.08] }, /* 人间烟火：每在线满 1h 得尘心 buff（eventLuck +8% 30min） */
      kujing:   { hook: 'on_debuff_apply',  grades: [-0.4, -0.4, -0.4] }, /* 枯井不波：debuff 时长 −40%（与心如止水叠乘） */
      /* 混沌三签名（融合器灵卷 v1.3 §3.4 · 渐次解锁批）：自创部专属特殊词条，唯一授予通道 =
       * 混沌淬炼（fusion.reforgeCustom）；选池随自创部滋养属性（CHAOS_BY_ATTR：qi→hundun /
       * jing→zaohua / shen→taiyi），grade = gen−1 只升不降。正典部永不产出（第四道闸：
       * 功法全录零引用 + 事件掉落零引用——special 只在融合/淬炼写口产生）。
       * hook 挂既有白名单名（零新增挂点）；消费端按池名加算：hundun→events 逢凶化吉线（封顶 100% 既有护栏）/
       * zaohua→combat 枯木逢春追加掉落线 / taiyi→idle 长夜离线上限线。 */
      hundun:   { hook: 'on_negative_event', grades: [0.10, 0.18, 0.28] }, /* 混沌重生：负面奇遇转机缘加算 */
      zaohua:   { hook: 'on_kill_drop',       grades: [0.08, 0.14, 0.20] }, /* 造化余韵：击杀追加掉落掷加算 */
      taiyi:    { hook: 'on_offline_cap',     grades: [2, 4, 6] }           /* 太一星光：离线结算上限 +2/4/6 小时 */
    },

    /* ── 组合羁绊（天赋池设计 §九 · 系统深化批 A1）：锁定态天赋同持配对两条 → 单字段加成，
     * mods.collect 第 11 步消费（来源 'synergy'）；单对 |value| ≤ 0.05、不 amplify、不吃 tier 权重。
     * 羁绊名/描述走词表 talent.synergy.{id}.name/.desc（gen-lexicon 自 §9.2 表生成）。 ── */
    TALENT_SYNERGIES: [
      { id: 'syn_thunder_survivor', pair: ['thunder_root', 'survivor'],               field: 'tribFailLossMod', value: -0.04 },
      { id: 'syn_sword_heart_bone', pair: ['sword_bone', 'sword_heart'],              field: 'combatPower',     value: 0.05 },
      { id: 'syn_pill_market',      pair: ['prosperous', 'alchemist_touch'],          field: 'stonesRate',      value: 0.05 },
      { id: 'syn_gift_diligence',   pair: ['gifted', 'diligent'],                     field: 'qiRate',          value: 0.04 },
      { id: 'syn_death_grow',       pair: ['last_stand', 'second_wind'],              field: 'tribFailLossMod', value: -0.05 },
      { id: 'syn_phoenix_thunder',  pair: ['phoenix_rebirth', 'chaos_thunder_root'],  field: 'tribBonus',       value: 0.05 },
      { id: 'syn_sword_return',     pair: ['sword_sovereign', 'sword_prodigy'],       field: 'combatPower',     value: 0.05 },
      { id: 'syn_trib_lightning',   pair: ['tribulation_scar', 'lightning_rod'],      field: 'tribBonus',       value: 0.03 }
    ],

    /* ── 一世洗髓（天赋池设计 v1.8 §十 · 洗髓批 2026-10-12）：本世可换天赋枚数上限。
     * 四渠道（洗髓丹 ap_xisui / 奇遇 talentSwap / 破境 / 遗泽商店 shop.swap）共用这一份预算，
     * 由 SQ.Talents.grantSwap 单口赐缘 —— 上限是「能不能刷出全 epic 组合」的唯一闸，
     * 改大它等于放开乘区预算 #129 的天赋侧，须先过数值复核。
     * TRIB_FROM = 破境赐缘的最低目标境界（realm 索引 6 = 化神；在此之前不给，避免前三次被突破独占）。 ── */
    TALENT_SWAP: { PER_LIFE: 3, TRIB_FROM: 6 },

    /* ── 独占法宝（专属事件池 v2.0.1 §4.2：定名定品阶定词条；atk 授予时按最高首通定格缩放）── */
    EXCLUSIVE_GEAR: {
      evil_sword:   { slot: 'weapon',   tier: 4, alignment: 'right',   atkBase: 36, resist: 260, special: 'ignore_req' },
      world_mirror: { slot: 'treasure', tier: 4, alignment: 'neutral', atkBase: 0, qiBonus: 0.40, attrValue: { attr: 'shen', value: 25 }, special: 'world_mirror' }
    },

    /* ── §五 商店（G6）── */
    /* 货架格数 = **每轮生成货架时随机掷**（坊市格数随机批 2026-10-09 · 数值详设 §5.1 · 用户令
     * 「刷新物品数量改为每次随机 10-16 个，不要固定为 10 个」）：闭区间等概率，坊市与黑市
     * 各自独立掷，付费刷新同样重掷。旧常量 `SHOP_SLOTS` 退役——不留「名字叫格数、其实是
     * 最小值」的歧义面；格数唯一取数处 = `SQ.Shop.slotCount(D)`。
     * ⚠️ 格数**不入存档**：`ws.shop.items` 的长度就是当轮掷出的结果（读档沿用、补货覆盖）。 */
    SHOP_SLOTS_MIN: 10,
    SHOP_SLOTS_MAX: 16,
    SHOP_RESTOCK_H: 4,
    SHOP_REFRESH_FEES: [20, 50, 100, 200, 400],
    SHOP_POOL_W: { gear: 40, pill: 25, arts: 20, pack: 15, treasure: 12 },
    SHOP_PRICE_REALM: 0.4,          /* ×(1 + 境界索引×0.4) */
    SHOP_GEAR_REFINE_MULT: 6,       /* 装备售价 = 炼化基数×6（P4 登记） */
    BLACKMARKET_KARMA: -200,        /* karma ≤ -200 出现黑市 */
    BLACKMARKET_PRICE: 1.3,
    /* `tier` = **展示用**品阶（坊市标签批 2026-10-09 · UI 卷 §3.4 货架双标签），取「与同名丹方同档」：
     * 聚气 rc_juqi=huang / 凝神 rc_ningshen=xuan / 淬体 rc_cuiti=xuan / 破障 rc_pozhang=di。
     * ⚠️ 丹药两族合一（第十七批）后本字段**参与赠丹结算**（→ BOND_GIFT_BY_TIER，见 §3.9）；效果字段仍一字未动。
     *    〔第卌八批勘正：「一字未动」只对第十七批成立——本批给凝神丹 +20 年 / 破障丹 −30 年各一枚 `life`，
     *    `tier` 与赠丹口径依旧一字未动。〕
     * 坊市这四颗丹与炼丹产出的 `ap_*` 是两种货，同档口径指「同名丹方的档次」，不是「同一件东西」。 */
    /* `life` = 寿元增减（第卌八批 · 单位**游戏年、绝对值**，走 applyEffects 那一条 lifeAdd 口）：
     * 刻意不按境界缩放——低境 20 年是救半条命、高境 20 年是零头，档位在表里由「拿得到它时你是什么境界」定；
     * 与道伤/折寿那套按上界比例的口（LIFE_HIT）是两族：**内容给的是有尽的账，挨打扣的是岁月的成**。
     * 破障丹为负是设计（强行破境以寿换机），不是漏写。 */
    PILLS: [
      { id: 'juqi',     price: 80,  tier: 'huang', effect: { qiPct: 0.30 } },
      { id: 'ningshen', price: 150, tier: 'xuan',  effect: { buff: { field: 'qiRate', mult: 0.25, hours: 2 }, life: 20 } },
      { id: 'cuiti',    price: 200, tier: 'xuan',  effect: { buff: { field: 'combatPower', mult: 0.20, hours: 4 } } },
      { id: 'pozhang',  price: 400, tier: 'di',    effect: { tribNext: 0.05, life: -30 }, nogift: true }   /* 底牌丹（第十七批）：与自产破障 / 镇劫 / 洗髓同族，送不得人 */
    ],
    PACK_QI_PCT: 0.10,              /* 灵石包：花当前上限 10% 修为 */
    PACK_STONES: 60,                /* 得 60 × (1+境界索引)³ 灵石 */

    /* ── 事件系统（奇遇事件池设计 v1.5~v1.9：在线时钟 + 三分支抉择制）── */
    EVENT_CLOCK_PITY_MIN: 20,       /* 20 分钟硬保底（p=1） */
    EVENT_NATURE_LUCK_POS: 100,     /* eventLuck>0 → 机缘权重 +luck×100 */
    EVENT_NATURE_LUCK_NEG: 60,      /* 危机权重 −luck×60（反向对称） */
    EVENT_NATURE_W_MIN: 10,         /* 性质权重各侧下限 */
    /* 缩放锚（事件池 §十二.8 v1.11 勘误）：旧口径「灵石与修为一律 ×(1+境界)³」与刷图收入曲线
     * （ZONES[r].stones 每境界 ×2.5~2.7）不同源——三次方在低中境界远陡于刷图曲线，实测把
     * 「奇遇灵石 / 刷图灵石」推到境界 2~6 的 1000~2600%。现拆开：灵石改挂刷图曲线（比值恒定），
     * 修为绝对值与坊市灵石包仍走三次方（修为经济另有 qiPct 小时封顶兜底）。 */
    SCALE_CUBE_POW: 3,              /* 修为绝对值 + 坊市灵石包：×(1+境界索引)³ */
    EVENT_STONE_ZONE_K: 0.075,      /* 奇遇灵石绝对值 = K × ZONES[境界].stones */
    /* qiPct 类效果「等价挂机小时」封顶（事件池 §十二.4 勘误）：高境界当前修为可达数十小时产出，
     * ±10~25% 的百分比条目会变成 ±2~19 小时进度，实测把「魔道最快」的阵营节奏主轴掀翻。
     * 封顶只作用于 qiPct（正负对称），低境界天然不触发；内容词条百分比一字未动。 */
    EVENT_QI_PCT_HOUR_CAP: 1.5,
    EVENT_KARMA_BAND: { ren: 8, di: 15, tian: 25 },   /* 分支 karma 幅度带（内容校验用） */
    EVENT_FEED_CAP: 50,             /* 叙事流卡片保留数（UI §3.5） */

    /* ── 阵营倾向漂移（主文档 §6.4：biasSign × 12/天，分量封顶 ±260）── */
    DRIFT_PER_DAY: 12,
    DRIFT_CAP: 260,

    /* ── 渡劫（主文档 §七）──
     * 第卌二批收加项头寸：resist 封顶 0.20→0.12（旧值下「上品四件套」即吃满，装备投入在成算上
     * 看不出差别）。战力项 / TRIB_P_CLAMP / TRIB_LOSS_* / TRIB_KARMA_MOD 一字未动。 */
    TRIB_RESIST_DIV: 1200, TRIB_RESIST_CAP: 0.12,
    TRIB_POWER_COEF: 0.15, TRIB_POWER_CAP: 0.15,
    TRIB_P_CLAMP: [0.05, 0.95],
    TRIB_LOSS_BASE: 0.5,
    TRIB_LOSS_CLAMP: [0.3, 0.7],
    TRIB_KARMA_MOD: [               /* [下界, 上界, mod]（含下界，不含上界；按序首个命中）
                                     * 边界口径（主文档 §7.2 v2.8 勘误）：与 KARMA_TIERS 同写法，
                                     * −200 起吃 −0.12、−800 起吃 −0.25、+200 起 +0.10、+800 起 +0.20；
                                     * 旧表 [-200,200) 行序在前 → karma=−200（魔道入档整点）拿 0，代价缺失。
                                     * ⚠️ 本表第卌二批**刻意不动**：试验时把它 ×0.5，正负同幅压扁会把
                                     * §6.3 阵营主轴「魔 < 左 < 正」的折算天数序打翻（sim-event-economy
                                     * 判红）⇒ 善恶加项是主轴的一根承重柱，要调须单独裁定 + 主轴同批重定。 */
      [800, Infinity, 0.20],
      [200, 800, 0.10],
      [-199.999, 200, 0],
      [-799.999, -199.999, -0.12],
      [-Infinity, -799.999, -0.25]
    ],
    TRIB_ITER_CAP: 64,              /* 离线批量渡劫循环上限 */

    /* ── 渡劫奖惩阶梯（数值详设 §8.3 · 系统深化批 A3）────────────
     * 失败侧：streak 连败计数（§8.3.1，X09 skipAttempt 豁免）→ 道伤/心魔/封固三档（§8.3.2）；
     * 心魔是 p 公式 talent 加项内部的负向加数（非新公式项），全程 TRIB_P_CLAMP 内消化；
     * 道伤/封固走 pushBuff 既有通道（同字段同向不叠层、重犯刷新时长保留最强）。
     * 成功侧：破境高光四件套（§8.3.3）——buff / 一次性灵石（in.event）/ 天道垂青 / 无漏道基。 */
    TRIB_STREAK: {
      daoShang: { minStreak: 1, field: 'qiRate', mult: -0.15, hours: 12 },   /* 道伤 */
      xinmo:    { minStreak: 2, perStack: -0.01, maxStacks: 3 },             /* 心魔（层数 = min(streak−1, 3)） */
      fengGu:   { minStreak: 3, field: 'qiRate', mult: -0.25, hours: 24 },   /* 修为封固 */
      logKeys:  ['tribulation.streak1', 'tribulation.streak2', 'tribulation.streak3']
    },
    TRIB_SUCCESS_BONUS: {
      poJing:      { field: 'qiRate', mult: 0.50, mins: 30 },   /* 破境 buff（增益与减益正负分开判） */
      WIN_STONE_K: 300,        /* 一次性灵石 = ZONES[新境界].stones × 300，记 in.event（与 FACTION_WAR.WIN_STONE_K 同名同值但独立不耦合） */
      FATE_P:      0.10,       /* 天道垂青：10% 触发 trib_success 标签奇遇（独立通道，fateSeen 同境界段排除） */
      wuLouKarma:  5           /* 无漏道基：一击即中（此前 streak=0）→ karmaEventScore +5 */
    },

    /* ── 善恶档位（主文档 §6.1）与 ALIGN_EFFECTS 阵营状态效果（§6.3 / 数值详设 §8.1 v1.13）── */
    KARMA_TIERS: [                  /* [下界, id] 降序首个命中（判据侧唯一取数口 = SQ.XKarma.tierOf / edgeOf）：
                                       *   ≥ +200 正道；< -199.999 即**整数域 ≤ -200** 魔道；其间左道 */
      [200, 'right'], [-199.999, 'neutral'], [-Infinity, 'evil']
    ],
    /* 善恶名号九段（善恶名号批 · 主文档 §6.1 扩展）：[下界, id] 降序首个命中，边界写法与 KARMA_TIERS 同口径
     * ——正四段（+200/+400/+600/+800 起）/ 左道一段（-199~+199）/ 魔四段（-399.999/-599.999/-799.999/-∞ 起）。
     * 纯称谓展示：不入任何数值判定（tierOf / ALIGN_EFFECTS / TRIB_KARMA_MOD 零改动）；跨段触发日志与全屏演出。 */
    KARMA_RANKS: [
      [800, 'haoran'],            /* 浩然道尊   +800 ~ +1000 */
      [600, 'zhengdao_kui'],      /* 正道魁首   +600 ~ +799  */
      [400, 'qingming'],          /* 清名侠士   +400 ~ +599  */
      [200, 'chizheng'],          /* 持正之士   +200 ~ +399  */
      [-199.999, 'zuodao'],       /* 左道散人   -199 ~ +199  */
      [-399.999, 'rumo'],         /* 入魔之徒   -399 ~ -200  */
      [-599.999, 'xiexiu'],       /* 凶名邪修   -599 ~ -400  */
      [-799.999, 'modao_jv'],     /* 魔道巨擘   -799 ~ -600  */
      [-Infinity, 'jidao']        /* 极道魔尊  -1000 ~ -800  */
    ],
    ALIGN_EFFECTS: {
      right: {
        qiRateMult: 0.75, combatPowerMult: 1.0, eventRateMult: 1.3, dropRateMult: 1.25,
        natureW: { good: 70, bad: 30 }, tierW: { ren: 60, di: 30, tian: 10 },
        dropAlignW: { neutral: 50, right: 38, evil: 12 }, dropTierUpChance: 0,
        checkDcMult: 0.95, tribBonusFlat: 0.05
      },
      neutral: {
        qiRateMult: 1.0, combatPowerMult: 1.0, eventRateMult: 1.0, dropRateMult: 1.0,
        natureW: { good: 55, bad: 45 }, tierW: { ren: 60, di: 30, tian: 10 },
        dropAlignW: { neutral: 60, right: 25, evil: 15 }, dropTierUpChance: 0,
        checkDcMult: 1.0, tribBonusFlat: 0
      },
      evil: {
        qiRateMult: 1.5, combatPowerMult: 1.25, eventRateMult: 0.5, dropRateMult: 0.5,
        natureW: { good: 35, bad: 65 }, tierW: { ren: 35, di: 40, tian: 25 },
        dropAlignW: { neutral: 45, right: 10, evil: 45 }, dropTierUpChance: 0.40,
        checkDcMult: 1.0, tribBonusFlat: 0
      }
    },

    /* ── G13 洞天福地（引擎卷 §2.2 数据契约 · 福地池卷 v2.0 全字段 · 13 处）──
     * mult 引擎硬顶 CAVE_MULT_CAP；signature.field 必须是 mods.FIELDS 之一（走既有乘区加算，
     * 来源登记「洞府」，数值详设 §8.2）；驻留唯一 → 签名天然不叠加。
     * reqs 三要素可组合：realmMin / zoneCleared（首通秘境索引）/ stonesCost（入驻一次付清）。
     * v2.0 扩池：主线 6（一字不动）+ 同阶别院 4（同档 mult 横向选择）+ 隐世 3（obtain 门控——
     * factionRank 势力职级档 / codex 奇遇图鉴格数，claim 内自动授予所有权，不进灵石通道、
     * 不进 sim-pacing caveTrack 推导）。名称与叙事走词表 cave.{id}.name / .desc / .signature。 */
    CAVES: [
      { id: 'market_yard',    mult: 1.00, reqs: {},
        signature: null },
      { id: 'green_peak',     mult: 1.08, reqs: { realmMin: 1, stonesCost: 20000 },
        signature: { field: 'offlineEff', value: 0.08 } },
      { id: 'bamboo_hut',     mult: 1.08, reqs: { realmMin: 1, stonesCost: 20000 },
        signature: { field: 'artsSpeed', value: 0.05 } },
      { id: 'sword_cliff',    mult: 1.12, reqs: { realmMin: 2, zoneCleared: 3 },
        signature: { field: 'combatPower', value: 0.06 } },
      { id: 'danxia_cave',    mult: 1.12, reqs: { realmMin: 2, zoneCleared: 3 },
        signature: { field: 'offlineEff', value: 0.10 } },
      { id: 'thunder_pool',   mult: 1.18, reqs: { realmMin: 4, zoneCleared: 4 },
        signature: { field: 'tribBonus', value: 0.02 } },
      { id: 'stillwater_hut', mult: 1.18, reqs: { realmMin: 4, zoneCleared: 4 },
        signature: { field: 'artsSpeed', value: 0.08 } },
      { id: 'mirror_lake',    mult: 1.20, obtain: { type: 'factionRank', rank: 2 }, reqs: {},
        signature: { field: 'tribBonus', value: 0.02 } },
      { id: 'sword_mound',    mult: 1.22, obtain: { type: 'codex', seen: 20 }, reqs: {},
        signature: { field: 'combatPower', value: 0.06 } },
      { id: 'star_fall',      mult: 1.25, reqs: { realmMin: 5, zoneCleared: 5, stonesCost: 500000 },
        signature: { field: 'offlineEff', value: 0.15 } },
      { id: 'fallen_star_court', mult: 1.25, reqs: { realmMin: 5, zoneCleared: 5, stonesCost: 500000 },
        signature: { field: 'combatPower', value: 0.06 } },
      { id: 'cloud_herd',     mult: 1.30, obtain: { type: 'factionRank', rank: 4 }, reqs: {},
        signature: { field: 'offlineEff', value: 0.15 } },
      { id: 'immortal_abode', mult: 1.35, reqs: { realmMin: 6, zoneCleared: 6, stonesCost: 5000000 },
        signature: { field: 'artsSpeed', value: 0.15 } }
    ],
    CAVE_INITIAL: 'market_yard',      /* 初始自带（免费 · mult 1.00 · 无签名） */
    CAVE_MULT_CAP: 1.40,              /* 引擎硬顶（引擎卷 §2.4，世界包不得超） */
    /* 走查 v2.8 §3（口径澄清）：迁居冷却 = 游戏时间 1 年（360 游戏日 = 360 现实秒，非现实一年） */
    CAVE_SWITCH_CD_MS: 360000,
    /* ── 附属设施养成（福地池卷 v2.0 §四 · 数值详设 §8.2 v1.23）：建在已拥有福地上，
     * 随所有权永久保留、仅当前驻留福地的设施生效（搬离即失，mods 来源 'caveFac'）；
     * 0~3 级、每级效果 = per × lv；禁 qiRate；营建费记 ledger.out.cave。
     * 预算封顶 = per × MAX_LV（#156 对表），驻留唯一 ⇒ 天然不叠加。 */
    CAVE_FACILITIES: [
      { id: 'lingtian',   field: 'stonesRate', per: 0.01 },
      { id: 'danfang',    field: 'artsSpeed',  per: 0.015 },
      { id: 'shuge',      field: 'eventLuck',  per: 0.02 },
      { id: 'julingzhen', field: 'offlineEff', per: 0.02 }
    ],
    CAVE_FAC_MAX_LV: 3,
    CAVE_FAC_COST: [30000, 300000, 3000000],   /* 升至 1/2/3 级的灵石费（四座同价表） */
    CAVE_FAC_BUDGET: { stonesRate: 0.03, artsSpeed: 0.045, eventLuck: 0.06, offlineEff: 0.06 },

    /* ── G14 护法结缘（引擎卷 §三 · 四柱卷 §五 名录 20 人为唯一事实源）──
     * bonds[npcId] = affinity 0~100 只增（−1 = 绝交锁）；档位阈值引擎固定、档名走词表。
     * perk 二选一：field = 既有乘区被动（来源 'bond'，mods 收集，炉鼎期归零）；
     * channel = 通道型（消费端读 mods.bonds.<channel>，各带合计封顶）。
     * perTier = 每档增量 × 当前档（1~4），满档 ≈ 半条特殊词条（≤8%/≤6pp，引擎卷 §3.4）。 */
    BOND_TIERS: [1, 30, 70, 100],     /* 档1 相识 / 档2 知交 / 档3 生死之交 / 档4 道护 */
    BOND_MAX: 100,
    GUARD_BONUS: { 3: 0.03, 4: 0.06 },/* 护法位渡劫 p 加项（先加总后 clamp，引擎卷 §3.3） */
    /* 冥佑：档≥2 每 7 天授 1 层 eventShield、层时长 14 天（2× 周期保证 2 层可达）、场上 ≤2 层（引擎卷 v1.4 口径3） */
    BOND_SHIELD: { npc: 'chu', minTier: 2, everyMs: 604800000, layerMs: 1209600000, maxLayers: 2 },
    DEBUFF_REDUCE_CAP: 0.50,          /* debuff 时长减免合计封顶（叠乘基础 + 药箱/忠护/阴阳加算后 clamp，v1.4 口径2） */
    CHECK_BONUS_CAP: 0.15,            /* 判定加点合计封顶 +15pp（摄魂 + 斩三尸 + 秦老丈三源，引擎卷 §3.4） */
    SPOUSE_FORMS: {
      /* 形态 = 结缘瞬间 karma 档位（tierOf）；维持规则见 bonds.js（v1.4 口径1：互助不自动解除） */
      yinyang: { tier: 'right',   qiRate: 0.06, offlineEff: 0.10, xinmoReduce: 0.25, cooldownMs: 604800000 },
      huzhu:   { tier: 'neutral', qiRate: 0.10 },
      luding:  { tier: 'evil',    qiRate: 0.18, karmaCost: 20, scar: true }
    },
    /* 多道侣双修（册一百二十三批 · 用户裁定「总加成封顶取 22%」）：qiRate 逐位相加后封顶，
     * offlineEff / xinmoReduce 取最高一重不叠加；人数不设上限（无主动解除口，设人数上限会占死位子）。
     * 单人时逐字等于旧值（6/10/18% 均低于 22%）。 */
    SPOUSE_QIRATE_CAP: 0.22,
    COMPANIONS: [
      { id: 'huang', align: 'neutral',  category: 'friend', perk: { channel: 'debuffXinmo', perTier: 0.05 },  carrierEvents: ['stray_dog'] },
      { id: 'chiwei', align: 'neutral', category: 'friend', perk: { field: 'dropRate',        perTier: 0.02 },  carrierEvents: ['mine_fox'] },
      { id: 'qin', align: 'right',    category: 'friend', perk: { channel: 'checkPp',       perTier: 0.015 }, carrierEvents: ['road_tea_stall'] },
      { id: 'liu', align: 'neutral',    category: 'friend', perk: { field: 'shopCost',        perTier: -0.02 }, carrierEvents: ['storyteller'] },
      { id: 'chen', align: 'right',   category: 'friend', perk: { channel: 'debuffAll',     perTier: 0.04 },  carrierEvents: ['traveling_doctor'] },
      { id: 'tang', align: 'neutral',   category: 'friend', perk: { field: 'artsSpeed',       perTier: 0.02 },  carrierEvents: ['junior_lie_flat'] },
      { id: 'chu', align: 'neutral',    category: 'friend', perk: { channel: 'shield' },                        carrierEvents: ['beggar_immortal'] },
      { id: 'man', align: 'neutral',    category: 'friend', perk: { field: 'stonesRate',      perTier: 0.02 },  carrierEvents: ['merchant_caravan'] },
      { id: 'suwan', align: 'neutral',  category: 'spouse', perk: { field: 'offlineEff',      perTier: 0.02 },  carrierEvents: ['hidden_cache'] },
      { id: 'xie', align: 'right',    category: 'spouse', perk: { field: 'combatPower',     perTier: 0.015 }, carrierEvents: ['rival_duel'] },
      { id: 'yewu', align: 'evil',   category: 'spouse', perk: { field: 'eventLuck',       perTier: 0.02 },  carrierEvents: ['demon_envoy'] },
      { id: 'shen', align: 'right',   category: 'spouse', perk: { field: 'gearLuck',        perTier: 0.02 },  carrierEvents: ['secret_manual_trade'] },
      { id: 'tie', align: 'neutral',    category: 'friend', perk: { channel: 'bottleneck',    perTier: 0.03 },  carrierEvents: ['merchant_caravan'] },
      { id: 'pei', align: 'right',    category: 'friend', perk: { field: 'tribFailLossMod', perTier: -0.01 }, carrierEvents: ['sect_recruit'] },
      { id: 'zhu', align: 'right',    category: 'friend', perk: { channel: 'negEvent',      perTier: 0.02 },  carrierEvents: ['peace_talisman'] },
      { id: 'yan', align: 'right',    category: 'friend', perk: { channel: 'refine',        perTier: 0.03 },  carrierEvents: ['firefly_valley'] },
      { id: 'lu', align: 'neutral',     category: 'friend', perk: { channel: 'claimQi',       perTier: 0.01 },  carrierEvents: ['alchemy_contest'] },
      { id: 'fu', align: 'neutral',     category: 'friend', perk: { field: 'combatSpeed',     perTier: 0.015 }, carrierEvents: ['beast_core_hunt'] },
      { id: 'luman', align: 'neutral',  category: 'friend', perk: { channel: 'dropExtra',     perTier: 0.015 }, carrierEvents: ['junior_frame'] },
      { id: 'feng', align: 'neutral',   category: 'friend', perk: { field: 'stonesRate',      perTier: 0.015 }, carrierEvents: ['harvest_fest'] },
      /* ── 双书梗化扩容批八人（道友池卷 §四 · 恢复批 2026-10-03 · 路线 A：走查 v2.5 旧 40 人预案作废移除，
       * 其 14 事件 bond 收益引用已同批清除）——助力预算 #129/#149，出身事件 = 专属池 №62~73 ── */
      { id: 'hanli', align: 'neutral',    category: 'friend', perk: { field: 'tribFailLossMod', perTier: -0.01 }, carrierEvents: ['qingpao_tongxing'] },
      { id: 'yuxiao', align: 'right',   category: 'friend', perk: { channel: 'debuffXinmo',   perTier: 0.02 },  carrierEvents: ['taomu_xiaojian'] },
      { id: 'xuaner', align: 'right',   category: 'spouse', perk: { field: 'offlineEff',      perTier: 0.02 },  carrierEvents: ['haishi_denghui'] },
      { id: 'nangong', align: 'right',  category: 'friend', perk: { field: 'shopCost',        perTier: -0.02 }, carrierEvents: ['yanue_chaoji'] },
      { id: 'pingping', align: 'right', category: 'friend', perk: { channel: 'checkPp',       perTier: 0.01 },  carrierEvents: ['bianzhen_kezi'] },
      { id: 'ningyao', align: 'right',  category: 'spouse', perk: { field: 'combatPower',     perTier: 0.015 }, carrierEvents: ['jianzhong_shouye'] },
      { id: 'aliang', align: 'right',   category: 'friend', perk: { channel: 'bottleneck',    perTier: 0.02 },  carrierEvents: ['jianyun_guiren'] },
      { id: 'jingchun', align: 'right', category: 'friend', perk: { channel: 'debuffAll',     perTier: 0.03 },  carrierEvents: ['shengxian_yideng'] },
      /* ── 双书梗化二批三十人（道友池卷 §五 · 22 道友 + 8 候选；出身事件 = 专属池 №74~113；
       * 满档增量合计 = §五 登记 13 字段，58 人预算见 #129/#151）── */
      { id: 'zhangtie', align: 'neutral',    category: 'friend', perk: { field: 'stonesRate',      perTier: 0.01 },  carrierEvents: ['tongmen_kugong'] },
      { id: 'wuyan', align: 'neutral',       category: 'friend', perk: { field: 'shopCost',        perTier: -0.01 }, carrierEvents: ['ming_e_jiaoliang'] },
      { id: 'mojuren', align: 'evil',     category: 'friend', perk: { field: 'offlineEff',      perTier: 0.01 },  carrierEvents: ['shiyao_zhiyue'] },
      { id: 'lihuayuan', align: 'right',   category: 'friend', perk: { field: 'qiRate',          perTier: 0.015 }, carrierEvents: ['zhishi_chuanyi'] },
      { id: 'mupeiling', align: 'neutral',   category: 'spouse', perk: { field: 'offlineEff',      perTier: 0.01 },  carrierEvents: ['shangdui_huhang'] },
      { id: 'chenqiaoyue', align: 'neutral', category: 'spouse', perk: { field: 'qiRate',          perTier: 0.02 },  carrierEvents: ['shijia_denghui'] },
      { id: 'chenlianyan', align: 'neutral', category: 'spouse', perk: { field: 'combatSpeed',     perTier: 0.01 },  carrierEvents: ['jiemei_yuxian'] },
      { id: 'hongfu', align: 'right',      category: 'spouse', perk: { field: 'artsSpeed',       perTier: 0.01 },  carrierEvents: ['xiafu_danren'] },
      { id: 'wangchan', align: 'neutral',    category: 'friend', perk: { field: 'combatPower',     perTier: 0.015 }, carrierEvents: ['sudi_tiezhan'] },
      { id: 'zhuhe', align: 'neutral',       category: 'friend', perk: { field: 'stonesRate',      perTier: 0.015 }, carrierEvents: ['suanpan_zhanggui'] },
      { id: 'ruanxiu', align: 'neutral',     category: 'spouse', perk: { field: 'dropRate',        perTier: 0.01 },  carrierEvents: ['zhujian_renjia'] },
      { id: 'gucan', align: 'right',       category: 'friend', perk: { field: 'offlineEff',      perTier: 0.02 },  carrierEvents: ['laozu_shounuo'] },
      { id: 'yuzhitong', align: 'evil',   category: 'friend', perk: { field: 'eventLuck',       perTier: 0.02 },  carrierEvents: ['canhun_jieti'] },
      { id: 'xiangzhili', align: 'right',  category: 'friend', perk: { channel: 'bottleneck',    perTier: 0.01 },  carrierEvents: ['zhangmen_chizheng'] },
      { id: 'ruanqiong', align: 'neutral',   category: 'friend', perk: { field: 'dropRate',        perTier: 0.015 }, carrierEvents: ['zhujian_luhuo'] },
      { id: 'makuxuan', align: 'right',    category: 'friend', perk: { field: 'combatPower',     perTier: 0.01 },  carrierEvents: ['changcheng_junqing'] },
      { id: 'xieshi', align: 'evil',      category: 'friend', perk: { field: 'dropRate',        perTier: 0.01 },  carrierEvents: ['banfen_fenzang'] },
      { id: 'weixian', align: 'right',     category: 'friend', perk: { field: 'tribFailLossMod', perTier: -0.005 }, carrierEvents: ['yinguan_shouduan'] },
      { id: 'liushiliu', align: 'right',   category: 'friend', perk: { field: 'artsSpeed',       perTier: 0.01 },  carrierEvents: ['duanjian_chongzhu'] },
      { id: 'dongtianci', align: 'right',  category: 'friend', perk: { field: 'combatSpeed',     perTier: 0.01 },  carrierEvents: ['changcheng_shouye'] },
      { id: 'yinyue', align: 'evil',      category: 'spouse', perk: { field: 'eventLuck',       perTier: 0.02 },  carrierEvents: ['yuexia_yihun'] },
      { id: 'yuanyao', align: 'evil',     category: 'spouse', perk: { channel: 'debuffXinmo',   perTier: 0.02 },  carrierEvents: ['guiwu_weicheng'] },
      { id: 'chenqingdu', align: 'right',  category: 'spouse', perk: { field: 'combatPower',     perTier: 0.01 },  carrierEvents: ['chengxia_wenjian'] },
      { id: 'wensheng', align: 'right',    category: 'friend', perk: { channel: 'debuffAll',     perTier: 0.02 },  carrierEvents: ['kongxiu_danshi'] },
      { id: 'cuichan', align: 'right',     category: 'friend', perk: { field: 'offlineEff',      perTier: 0.015 }, carrierEvents: ['yasheng_luozi'] },
      { id: 'zuoyou', align: 'right',      category: 'friend', perk: { field: 'combatSpeed',     perTier: 0.015 }, carrierEvents: ['baiyi_wenjian'] },
      { id: 'yufu', align: 'right',        category: 'friend', perk: { field: 'combatPower',     perTier: 0.02 },  carrierEvents: ['shoucheng_jianyi'] },
      { id: 'chelaozu', align: 'evil',    category: 'friend', perk: { field: 'combatSpeed',     perTier: 0.01 },  carrierEvents: ['modao_xiangyao'] },
      { id: 'yintianxia', align: 'evil',  category: 'friend', perk: { channel: 'bottleneck',    perTier: 0.015 }, carrierEvents: ['moxiao_zhangfa'] },
      { id: 'baidi', align: 'right',       category: 'friend', perk: { field: 'eventLuck',       perTier: 0.015 }, carrierEvents: ['baiyi_guxing'] }
    ],

    /* ── G12 角色属性（角色属性设计 §一/§四 + 精气神实现 §三）── */
    ATTRS: ['jing', 'qi', 'shen'],
    ATTR_BASE_PER_REALM: 6,         /* 基础值 = (境界索引+1)×6 */
    ATTR_DC_MULT: 2,                /* dc 标准线 = 境界基础值 ×2 */
    ATTR_DIFF: { easy: 0.6, medium: 1.0, hard: 1.5, extreme: 2.2 },
    ATTR_P_CLAMP: [0.05, 0.95],
    ATTR_PASSIVES: {                /* 被动封顶（乘区总表 §八 v1.2） */
      jing: { field: 'combatPower', per: 0.001, cap: 0.12 },
      qi: { field: 'qiCap', per: 0.005, cap: 0.30 },
      shen: { field: 'eventLuck', per: 0.002, cap: 0.10 }
    },
    ATTR_SHEN_LOSS_COEF: 0.10,      /* 神 → 渡劫失败损失修正 ±0.10 */
    ATTR_EVENT_BONUS_CAP: 15,       /* 事件永久加成累计上限 */
    JING_BOTTLENECK_DC: 'medium',   /* 精 ≥ 中等 dc → 瓶颈间隔惩罚 ×3→×2 */

    /* ── G2/G3 常量 ── */
    ONLINE_WINDOW_MS: 300000,    // ≤5 分钟视为在线 tick（不回线结算）；超过才走离线规则（体验批：短时离开不弹离线呈报）
    OFFLINE_CAP_H: 12,           // 离线时长上限
    OFFLINE_EFF: 0.5,            // 离线效率基准
    CAP_HOURS: 2,                // 上限公式的「2 小时产出」项
    CAP_NEED_FACTOR: 1.15,       // 上限恒 ≥ 下一阶 need × 1.15
    KILL_BASE_SEC: 60,           // 基准击杀间隔 60 秒（60 杀/小时，详设 §2.1 公式口径）
    PROG_PER_KILL: 5,            // 单杀进度基准 +5（富余为 0 时 20 杀通关；有富余见下方 PROG_SURGE_*）
    /* 战力富余加速（体验批）：本区单杀进度 ×(1 + 富余 × COEF)，富余 = 战力/need − 1，封顶 PROG_SURGE_CAP。
     * 只喂**进度口**——击杀间隔/掉落/灵石一律不动，避免高战刷低区变成资源提款机（详设 §2.1 节奏正典）。
     * 定标：need×2 → ×1.5（14 杀）；need×4 → ×2.5（8 杀）；×9 以上吃封顶 ×4（5 杀通关）。 */
    PROG_SURGE_COEF: 0.5,
    PROG_SURGE_CAP: 4,
    DROP_BASE: 0.08,             // 单次击杀掉落率 8%
    BOTTLENECK_INTERVAL: 3,      // 瓶颈击杀间隔 ×3
    BOTTLENECK_PROG_CAP: 90,     // 瓶颈 prog 封顶 90

    /* ── 秘境深化（数值详设 §2.5~§2.7 · 系统深化批 A4）────────────
     * 区域词缀：本区战斗结算**局部乘区**，不进全局 mods；消费点仅 combat.simulate 与
     * bottleneckOf；闭关不进战斗模拟天然豁免。roll 时机 = setZone 切入即掷 + 驻留每 6h 重掷
     * （在线结算判定；离线不掷、回线过期补掷一次——与江湖传闻「离线只过期不刷新」同口径）。
     * 抽取三档权重 正面 4 : 混合 2 : 负面 2（档内等权）；负面必带补偿维度。 */
    ZONE_AFFIXES: [
      { id: 'lingchao', cls: 'pos', stonesMult: 1.25 },
      { id: 'woye',     cls: 'pos', dropMult: 1.15 },
      { id: 'guchen',   cls: 'pos', gearLuckAdd: 0.15, speedMult: 0.90 },
      { id: 'kuanglan', cls: 'pos', speedMult: 1.20, intervalAdd: 1 },
      { id: 'xiongli',  cls: 'mix', needMult: 1.15, dropMult: 1.30 },
      { id: 'xueyue',   cls: 'mix', needMult: 1.25, stonesMult: 1.50 },
      { id: 'miwu',     cls: 'neg', dropMult: 0.85, gearLuckAdd: 0.20 },
      { id: 'pinji',    cls: 'neg', stonesMult: 0.70, dropMult: 1.10 }
    ],
    AFFIX_W: { pos: 4, mix: 2, neg: 2 },   /* 三档权重（档内等权） */
    AFFIX_MS: 21600000,                    /* 词缀驻留 6h（现实时间） */
    /* 域主精英战（§2.6）：首通 →「域主现世」→ 主动挑战（一次性掷判 need×1.8）→ 胜利才自动推进。
     * 失败 CD 10min 无其他惩罚；旧档 zoneBoss=null 维持现行「首通即推进」，已通关旧区不追溯。 */
    BOSS_MULT: 1.8,
    BOSS_WIN_STONE_K: 10,                  /* 首杀灵石 = ZONES[zone].stones × 10，记 in.event */
    BOSS_RETRY_CD_MS: 600000,
    /* 探宝残片（§2.7）：击杀掷 SHARD_P × (1+ΣdropRate) × 词缀 dropMult；每区 20 片兑换一次，
     * 手动 mutate 通道；残片不进 Ledger（纯计数字段，恒等式 #113 零影响）。 */
    SHARD_P: 0.02,
    SHARD_NEED: 20,
    /* 兑换奖励分区（SHARD_REWARDS 语义表，引擎按 zone 段分派）：
     * z0~2 pill（juqi/ningshen/cuiti 等权）/ z3~5 gearbox（该区权重 roll 上浮一档，tierMin 2 上品以上）
     * / z6~8 fac|intel 二选一（洞府设施图纸 或 功法情报，§9.3 互通）/ z9 treasure（先天法宝机缘，
     * 全持有折 ZONES[9].stones×10 记 in.event） */
    SHARD_REWARDS: { pill: [0, 2], gearbox: [3, 5], facintel: [6, 8], treasure: [9, 9] },
    SHARD_Z9_STONE_K: 10,

    /* ── 势力（G16 · 势力批 v2.4 + 势力深化批 v1.23）──
     * 入世生成 = FACTIONS_FIXED 固定池 16 处**全量入档**（id/名称/描述走正典词表，
     * 正典源《势力全录（16处）》§一）+ 随机池补足 RAND_EXTRA 0~4 个（名称随机、
     * 背景从 30 条描述池不重复抽取）；固定对间 10 对按 RELS_CANON 播种，其余两两关系
     * 友好/敌对/持平随机对称。加入后获得 perk（PERKS 阵营池）× 职级放大（RANKS.PERK_MULT，
     * 数值详设 §8.2 v1.23，放大后单 perk ≤13.5%）；加入即刻按关系调整道友好感：
     * 友好 +10 / 敌对 −20 / 同势力 +5（散人不受影响）；好感下限 −20（厌恶），
     * 绝交锁哨兵 −99（−20~−2 为合法负好感区间）。叛离代价：karmaEventScore −30 +
     * 冷却 1 游戏年 + 该势力声望清零（人情不回滚，名分收回）。 */
    FACTIONS: {
      MIN: 7, MAX: 10,                          /* 随机补足段的旧口径参数（保留兼容；固定池全量入档后总数带 16~20） */
      RAND_EXTRA: [0, 4],                       /* 随机池补足个数带（v1.23） */
      REL_FRIENDLY_P: 0.30, REL_ENEMY_P: 0.55,   /* <0.30 友好 / <0.55 敌对 / 其余持平 */
      JOIN_FRIENDLY: 10, JOIN_ENEMY: -20, JOIN_SAME: 5,
      LEAVE_KARMA: -30,
      /* 走查 v2.6 §1：叛离冷却改游戏时间 1 年（1 游戏日 = 1 现实秒 → 360 游戏日 = 360 现实秒） */
      LEAVE_CD_MS: 360000,
      /* 叛离与谍报（势力全录卷 §九 v1.1）：叛投敌对 karma 加倍 / 旧门同门 bond −10 /
       * 旧声望 50% 转移入新门（Math.floor）/ 献秘每档叛投限 1 条 */
      LEAVE_KARMA_ENEMY: -60,
      DEFECT_BOND: -10,
      REP_TRANSFER: 0.5,
      INTEL_PER_DEFECT: 1,
      /* 增益池（每势力创角时从对应阵营池随机取一条；field ∈ Mods.FIELDS，原值幅度 ≤10%，
       * 职级放大后 ≤13.5%——§8.2 v1.23 登记取代旧口径） */
      PERKS: {
        right:   [ { field: 'qiRate', v: 0.05 }, { field: 'offlineEff', v: 0.08 }, { field: 'tribBonus', v: 0.02 } ],
        evil:    [ { field: 'combatPower', v: 0.10 }, { field: 'dropRate', v: 0.08 }, { field: 'stonesRate', v: 0.06 } ],
        neutral: [ { field: 'eventLuck', v: 0.08 }, { field: 'shopCost', v: -0.06 }, { field: 'gearLuck', v: 0.06 } ]
      }
    },
    /* 固定势力池 16 处（正4/左7/魔5，《势力全录（16处）》§一；name/desc 走词表 faction.{id}.name/.desc） */
    FACTIONS_FIXED: [
      { id: 'huangfeng', align: 'neutral' }, { id: 'yanue',   align: 'right'   },
      { id: 'xinggong',  align: 'neutral' }, { id: 'qixuan',  align: 'evil'    },
      { id: 'luopo',     align: 'right'   }, { id: 'jianqi',  align: 'neutral' },
      { id: 'qianzhu',   align: 'right'   }, { id: 'yanwu',   align: 'evil'    },
      { id: 'miaoyin',   align: 'neutral' }, { id: 'liumo',   align: 'evil'    },
      { id: 'kunwu',     align: 'neutral' }, { id: 'guisu',   align: 'evil'    },
      { id: 'shuyuan',   align: 'right'   }, { id: 'suiyuan', align: 'neutral' },
      { id: 'longquan',  align: 'neutral' }, { id: 'laolong', align: 'evil'    }
    ],
    /* 关系正典种子 10 对（《势力全录（16处）》§二；生成时直接播种不掷骰，其余对随机对称） */
    FACTION_RELS_CANON: [
      { a: 'huangfeng', b: 'yanue',    rel: 'friendly' },
      { a: 'xinggong',  b: 'miaoyin',  rel: 'friendly' },
      { a: 'shuyuan',   b: 'suiyuan',  rel: 'friendly' },
      { a: 'longquan',  b: 'jianqi',   rel: 'friendly' },
      { a: 'luopo',     b: 'qianzhu',  rel: 'friendly' },
      { a: 'qixuan',    b: 'yanwu',    rel: 'enemy'    },
      { a: 'yanue',     b: 'liumo',    rel: 'enemy'    },
      { a: 'shuyuan',   b: 'guisu',    rel: 'enemy'    },
      { a: 'jianqi',    b: 'laolong',  rel: 'enemy'    },
      { a: 'kunwu',     b: 'liumo',    rel: 'enemy'    }
    ],
    /* 职级贡献（势力全录卷 §三）：rep 阈值派生档 0~4，不落库；perk 放大 ×PERK_MULT[rank] */
    FACTION_RANKS: { TH: [0, 100, 300, 700, 1500], PERK_MULT: [1, 1.08, 1.16, 1.24, 1.35] },
    FACTION_DONATE: {
      TIERS: [10000, 100000, 1000000],   /* 三档捐献按钮 */
      STONES_PER_REP: 1000,              /* rep = 灵石 ÷ 1000 */
      WINDOW_CAP: 300, WINDOW_MS: 7200000 /* 每现实 2h 捐献供奉 rep 上限（原 24h，2026-10-05 调参批） */
    },
    /* 势力委托（势力全录卷 §四）：三类、基线快照制、手动交付 */
    FACTION_QUEST: {
      REFRESH_MS: 1800000, TTL_MS: 7200000,   /* 上一单结束 ≥30 分钟刷出新单；有效期 2 现实小时 */
      SLOTS: 3,                               /* 板面最多三张（第卅九批 · 用户令「每次刷新 3 个不同内容的，1 个太少」）；同类型至多一张 */
      TYPES: {
        slay:      { rep: 25, stoneK: 120, base: 60, perRealm: 30 },   /* 击杀 60+境界×30 */
        cultivate: { rep: 20, stoneK: 80,  secs: 2700 },               /* 修为增长 = 每秒产出×2700 */
        gather:    { rep: 30, stoneK: 400 }                            /* 上缴 ZONES.stones×400（交付时扣） */
      }
    },
    /* 势力冲突（势力全录卷 §七 v1.2 · 战功制）：在线每分钟期望 1/40 开战、持续 20 分钟；
     * 入场无判定（joined='in' 纯标记），战争期间秘境击杀累积战功（MERIT_PER_KILL），
     * 终局 merit ≥ MERIT_NEED（10 + realm×2，结算瞬间快照）判胜。NEED_MULT 战力判定线已废弃。 */
    FACTION_WAR: {
      P_PER_MIN: 0.025, DURATION_MS: 1200000,
      MERIT_PER_KILL: 1.0,
      /* 门槛 = 10 + realm × 2（实施批探针实测校准，势力全录 §7.1 授权 ±5 带内：base 15→10、斜率 5→2。
       * 原 15+5r 押注「高境界 combatSpeed 成长覆盖门槛」被探针证伪——典型画像 20min 窗口击杀
       * 20（r0~5）~38（r8），r2 起系统性不达标且满速投资 r9 仍 44<60；校准后典型画像 r0~r8 全达标、
       * r9 差 2 杀压线（终局投资超典型口径，实际可达），裸速全程参与 r0~r5 达标、r6+ 需 Σspeed
       * 10%~40%（押注方向保留），瓶颈态减半 r4+ 不达标（约束力保留）。校准记录见任务清单收口章。 */
      MERIT_NEED_BASE: 10, MERIT_NEED_PER_REALM: 2,
      WIN_REP: 50, WIN_STONE_K: 500, WIN_BOND: 2,
      LOSE_REP: 5,
      DEBUFF: { field: 'combatPower', mult: -0.10, hours: 0.5 },   /* 败：战创（不变） */
      REL_SOFTEN_P: 0.5,                            /* 败→胜 enemy→neutral 概率（对称写入，仅该交战对） */
      PRESTIGE: { field: 'shopCost', mult: -0.05, hours: 24, source: 'factionWar' },  /* 声威大振 */
      RESULT_RUMOR_TTL_MIN: 30                      /* 结算结果传闻卡 TTL（现实分钟） */
    },
    /* 职级实权（势力全录卷 §八 v1.1）：职位由 rankOf 派生不落库（档3 执事 / 档4 长老·两技能并存）；
     * 主动技能各每现实 24h 一次，CD 时间戳存 ws.factionOffice。 */
    FACTION_OFFICE: {
      CD_MS: 86400000,
      DISPATCH: { rank: 3, hours: 2, source: 'bond' },      /* 执事 · 调遣同门（复制个体助力为 2h buff） */
      GUARD: { rank: 4, floorBonus: 0.03, extra: 0.02 }     /* 长老 · 门中护法（floor = 档3 护法值；魔道档位豁免失效） */
    },
    /* 门中供给（势力全录卷 §六）：职级门控四 SKU，灵石价 = 坊市 ×2，效果与 PILLS 同源 */
    FACTION_SUPPLY: [
      { sku: 'juqi',     pill: 'juqi',     rank: 1, rep: 5 },
      { sku: 'ningshen', pill: 'ningshen', rank: 2, rep: 8 },
      { sku: 'cuiti',    pill: 'cuiti',    rank: 3, rep: 12 },
      { sku: 'pozhang',  pill: 'pozhang',  rank: 4, rep: 30 }
    ],
    FACTION_SUPPLY_CD_MS: 86400000, FACTION_SUPPLY_PRICE_MULT: 2,
    BOND_MIN: -20,               /* 好感下限（厌恶）；−99 = 绝交锁哨兵（v2.4 由 −1 迁移） */
    /* 同道相吸（阵营名号联动批 · 道友池卷 v1.2 §六）：善恶名号跨段瞬间，
     * 与新名号**同向**且**已相识**的道友一次性获 +base×dist 好感（dist = 段位距「左道散人」中段距离 1~4）。
     * 封顶 cap → dist4（浩然道尊 / 极道魔尊）= +8；中性段（左道散人）dist 0 不触发。
     * 只走 Bonds.gain 正向口（绝交锁/心结锁自动拒入账），「好感只增不减」不破；
     * 每名号每世限一次（ws.rankGiftSeen 防刷），karma 往复震荡不重复发放。 */
    BOND_ALIGN_GIFT_BASE: 2,
    BOND_ALIGN_GIFT_CAP: 8,
    /* 缘尽门槛（阵营名号联动批 · 引擎卷 v1.10 §3.6）：绝交锁改为**双门槛**——
     * 玩家 karma ≤ LOCK_KARMA_MAX（凶名邪修及以上）**且**该道友当前好感 ≥ LOCK_BOND_MIN（知交及以上）
     * 才真锁；不合条降级为好感大跌（走 Bonds.lose），保留挽回余地。 */
    BOND_LOCK_KARMA_MAX: -400,
    BOND_LOCK_BOND_MIN: 30,
    BOND_DRAIN_K: 1.2,           /* 降级扣减 = round(|karma| × K)，clamp 到 [DRAIN_MIN, DRAIN_MAX] */
    BOND_DRAIN_MIN: 6,
    BOND_DRAIN_MAX: 25,
    BOND_REDEEM_COST: 30,        /* 缘尽赎回：遗泽 30（跨世通货，走 Legacy.spend 幂等口）*/
    BOND_REDEEM_AFF: 10,         /* 赎回后好感落点（档 1 相识）*/
    /* ── 好感三渠道（批 B ⑤ 好感度新渠道批 2026-10-06 · 引擎卷 v1.11 §3.2a）──────────
     * 起因：诉求⑤「好感度获取方式比较局限」。取证结论——正典 §3.2 原称「两条正向写口」，
     * 实际代码有 **八条**（事件 bond / 同道相吸 / 势力入门 / 势力战同门 / 天骄切磋 / 天骄致歉 /
     * 天道旨意 / 跨世之缘创角），但其中**玩家可主动、可重复、可指向指定对象**的一条都没有：
     * 事件靠抽、势力战与切磋靠触发、名号与创角一世一次。故本批补三条**主动渠道**。
     * 三条一律只走 Bonds.gain 唯一正向口（绝交锁 / 心结锁自动拒入账），「好感只增不减」不破；
     * ⚠️ 均**不经商店购买**——「侣不可交易」是世界观底线（引擎卷 §3.2），赠丹送的是**自有之物**。 */

    /* 渠道 A · 拜访论道：主动、零消耗、全局单冷却（ws.bondVisitAt，O(1) 落盘）。
     * 收益按当前档位递减（索引 = tierOf 结果 0~4）：**未相识 +3 = 结识**（0 → 3，名录页由剪影转实名，
     * 这是本渠道最大价值——此前结识唯一途径是抽到该人的出身事件）；档 4 满档 0（reason max）。
     * 厌恶区间（−20~−2）同样吃 tier 0 档 +3，成为「厌恶 → 相识」的**可主动修复通道**（此前只能靠事件）。 */
    BOND_VISIT_CD_MS: 300000,         /* 冷却 5 分钟现实 = 300 游戏日 ≈ 0.83 游戏年（2026-10-09 用户裁定由 1h 改小；
     *                                 锚仍是现实 ms 时间戳，与 FACTION_SUPPLY_CD_MS 同口径但不同值。
     *                                 ⚠️ 只改**节奏**不改**收益**：BOND_VISIT_BY_TIER 与同向加成一字未动，
     *                                 未识 → 满档仍只吃 [3,3,2,1,0] 五次拜访 ≈ 25 分钟现实（原 ≈ 5 小时）*/
    BOND_VISIT_BY_TIER: [3, 3, 2, 1, 0],
    BOND_VISIT_ALIGN_BONUS: 1,        /* 道友 align 与玩家 karma 档位同向 → +1（复用批 A align 字段与 tierOf）。
     *                                 **仅对已相识者生效**——未识者阵营未揭，给加成会经「+4 而非 +3」泄漏 align */

    /* 渠道 B · 赠丹：主动、耗**自有丹药**（ws.alchemy.pills 扣 1）、按丹药档次给好感
     * （自产查丹方 tier，成品丹自带 tier，判据同一条 `SQ.Alchemy.pillDefOf`）。
     * 把炼丹炼器整条产线接进道友系统（此前丹药只有自服一个出口）——「以丹会友」。
     * 底牌族不可赠（第十七批）：自产双特例（once: pozhang / zhenjie）+ 洗髓（swap）+ 成品破障（nogift）——
     * 「每境界限 1」语义不可外移，破障与洗髓是本世自己的底牌。
     * 丹纹版（key 尾 _rw）×1.5 取整。满档者拒赠且**不扣丹**。
     * 🔧 **GitHub issue #4（2026-10-14）撤销 BOND_GIFT_DAILY**：原日限 3 走 gameDayOf，而
     *    **1 游戏日 = 1 现实秒** ⇒ 每次点击都已跨日清零，上限永不生效、屏上恒显「今日 1/3」，
     *    只会误导。节流本来就在**丹药库存与炼制耗时**上，故直接取消计数（`ws.alchemy.giftDay` 同批退役）。
     *    🔧 同型的丹毒日限 `ALCHEMY.PILL_DAILY_CAP` 于**第册十二批随 N43 一并退役**（当时记为
     *    「那条管自服吞吐平衡，不属本 issue 射程」，实测它同样永不触发、只会让文案说谎）。 */
    BOND_GIFT_BY_TIER: { huang: 4, xuan: 6, di: 9, tian: 14 },
    BOND_GIFT_RUNE_MULT: 1.5,

    /* 渠道 C · 同贺：自动、零消耗、**零新增落盘字段**。破境（= 渡劫成功，realm.js 同一结算瞬间）时，
     * 全体已相识（bond ≥1）且非绝交锁 / 非心结锁 / 非在任道侣的道友 +N——旧识为你高兴。
     * 把道友系统与主线进程挂钩：走得越远，故旧越众。道侣排除因其另有双修叙事线（§3.8），不掺。 */
    BOND_CHEER_ON_BREAK: 2,
    FACTION_DESC_POOL: 30,       /* 势力背景描述池条数（lexicon-factions.js 唯一事实源） */

    /* ── G17 江湖传闻（传闻设计卷 v1.0 · 数值详设 §十二）──
     * 在线按现实分钟节奏刷新的限时传闻卡，指向当前角色可触发的事件；点击定向触发
     * （复用三分支抉择全链路）；TTL 到点作废；离线只过期不刷新。 */
    RUMORS: {
      MAX: 4, REFRESH_MIN: 10, BATCH: [1, 2],
      TTL: { ren: 40, di: 70, tian: 110 },     /* 现实分钟，按品阶分档 */
      TPL_PER_TIER: 10, PLACES: 8              /* common 词表 rumor.tpl.{tier}.1~10 / rumor.place.1~8 */
    },

    /* ── 神秘商人（势力批 v2.4 · 奇遇 №61）── */
    MERCHANT_DURATION_MS: 1800000,  /* 交好：坊市特席 30 分钟（F1 定案：12h 冷却 × 10min 席期 = 占空比 1.3%，不盯坊市必然错过；加长只动「可用窗口」，weight 与冷却一字未动 ⇒ 稀缺性与总抽取密度不变，第十批那条「降权是弱杠杆」的实测仍在账上） */
    MERCHANT_GEAR_TIER: 3,          /* 特席装备起步灵品（无视加成后上探仙品） */
    MERCHANT_PRICE_MULT: 3,         /* 特席售价 = 炼化基数 ×3（高级物品，贵） */
    /* 战力门槛**不在此表**：№61 的 check.abs 字面量即唯一事实源。
       原 `MERCHANT_POWER_ABS: 375000` 是全库零消费的死桩（与事件表字面量同值双源、改表不带动消费者），
       2026-10-10 随审计 A9「顶层常量 ⇔ 消费面对表」删除；要改门槛改 events.js №61 那一处。 */

    /* ── 天道系统（天道设计 v1.1 §八 · 天道系统批）────────────────────
     * 伪智能叙事层：问天（1h CD）→ 奏疏（500~800 字）→ 圣旨 JSON（三层容错解析 +
     * 白名单 15 型 + payload clamp + seenIds 幂等）→ 领旨（效果兑现）/ 抗旨（逆天值累积）。
     * 全部渡劫修正走 §8.3 talent 加项通道（nextTrib + armed 档位，XTrib.info 同读点）；
     * 零新增乘区字段；接旨/天象不进 tick（sim-pacing 稳态带复跑不变）。 */
    TIANDAO: {
      ASK_CD_MS: 3600000,                         /* 问天冷却 1h（真实时间，奏疏生成瞬间落账） */
      INCENSE_RANKS: [0, 100, 500, 2000],         /* 香火四档（供奉灵石，记 out.donate） */
      RARE_SHIFT: [0, 2, 3, 5],                   /* 各档从天机迁往稀档的百分点 */
      TIER_W: [70, 25, 5],                        /* 基础档位权重 天机/敕令/稀（%） */
      DEFY_GAIN: { rare: 25, decree: 15, omen: 10 },  /* 抗旨逆天值：稀/敕令/天机 */
      DEFY_DEMON_MULT: 1.5,                       /* 魔道阵营获取乘算（向下取整） */
      DEFY_STAGES: [30, 60, 100],                 /* 天睐 / 天怒 / 逆天大劫解锁阈值 */
      DEFY_TRIB_MODS: [-0.01, -0.02],             /* 天睐 / 天怒 talent 加项（渡劫结算后清档位态） */
      NIJIE_BASE_P: 0.35,                         /* 逆天大劫基础成功率（独立劫，clamp 不变） */
      NIJIE_REWARD_QIRATE: 0.05,                  /* 渡过奖励：永久 qiRate +5%（来源 'tiandao'） */
      NIJIE_PUNISH: { mult: -0.20, hours: 48 },   /* 失败「天罚·重」专属定值（超常规 ≤24h 属独立常量） */
      OMEN_QUEUE_CAP: 3,                          /* 天象队列容量（溢出挤最旧） */
      /* 天象扩容 · 本局去重批（天道卷 v1.4 §7.3）：短评模板数按节点一局期望频次配权，
       * 每节点池容量 ≥ 期望触发次数 → 正常局内不进入第二轮。合计 96（扩容前 7×3 = 21；
       * N4 收口批 +prodrank 10 → 8 节点，§九.6 纯文本零机制同口径）。
       * 本表是词表条数的**对表项**：逐节点必须等于 `tiandao.skyomen.<node>.<n>` 的实有条数
       * （断言 #252 对表）——偏小 = 多写的模板永不可达（死内容），偏大 = 取到空 key 回落键名。 */
      OMEN_TPL_N: {
        tribwin: 12, tribfail: 13, break: 15, clear: 15,
        karma: 10, war: 13, rebirth: 8, prodrank: 10
      },
      CHENYU_N: 30,                               /* 谶语池条数（扩容前 10） */
      CHRONICLE_MAX: 10,                          /* 编年史大事条数上限 */
      MEMO_LEN: [500, 800],                       /* 奏疏总长控制区间（字） */
      HISTORY_MAX: 10,                            /* 领/抗记录近 10 条 */
      SEEN_CAP: 200,                              /* seenIds 防膨胀截断（不影响在用旨意幂等） */
      VERDICT_MAX: 300,                           /* 判词软上限（超长截断进谶语档） */
      GIFT_WEEK_K: 10080,                         /* 赐财红线分母：ZONES[min(realm,9)].stones × 60杀/h × 12h × 7日 × 2（§4.2 注，实测定值一次） */
      PUNISH_HOURS_MAX: 24,                       /* 常规天罚时长上限 */
      KARMA_D_CLAMP: 10,                          /* 因果簿 ±10 */
      BOND_RANGE: [2, 5],                         /* 情缘牵引 +2~+5（只走 Bonds.gain 正向口） */
      TRIB_MOD_RANGE: [0.01, 0.03],               /* 天心护佑/劫云密布 ±0.01~0.03 */
      SKY_RUMOR_TTL_MIN: 60,                      /* 天上谣传展示卡 TTL（现实分钟，war 卡先例不占 RUMORS.MAX） */
      /* 旨意白名单 15 型（§4.2）：id 为稳定英文键、中文名走词表 tiandao.type.{id}（数据文件禁文案）；
       * tier ∈ omen(天机)/decree(敕令)/rare(稀)；hex = 归属卦位（生成端约束，校验器不二次拒绝）；
       * clamp = payload 词表级红线（越界夹回、不整旨拒绝——宽进严数值）；prophecy = 谶语兜底档 */
      DECREES: [
        { id: 'omen_trib',    tier: 'omen',   hex: 'wenjie' },
        { id: 'omen_wealth',  tier: 'omen',   hex: 'wencai' },
        { id: 'omen_bond',    tier: 'omen',   hex: 'wenyuan' },
        { id: 'omen_affix',   tier: 'omen',   hex: 'wenjing' },
        { id: 'omen_faction', tier: 'omen',   hex: 'wenting' },
        { id: 'bless',        tier: 'decree', hex: 'wenjie', clamp: { tribBonus: [0.01, 0.03] } },
        { id: 'curse',        tier: 'decree', hex: 'wenjie', clamp: { tribBonus: [-0.03, -0.01] } },
        { id: 'gift',         tier: 'decree', hex: 'wencai', cap: 'weekly2' },
        { id: 'punish',       tier: 'decree', hex: 'wenjie', clamp: { mult: [-0.20, -0.10], hours: [1, 24] } },
        { id: 'karma',        tier: 'decree', hex: 'wenjie', clamp: { karma: [-10, 10] } },
        { id: 'bond',         tier: 'decree', hex: 'wenyuan', clamp: { bond: [2, 5] } },
        { id: 'fate',         tier: 'rare',   hex: 'wenjing' },
        { id: 'affix',        tier: 'rare',   hex: 'wenjing' },
        { id: 'rumor',        tier: 'omen',   hex: 'wenting' },
        { id: 'prophecy',     tier: 'omen',   hex: null }
      ],
      HEXAGRAMS: ['wenjie', 'wencai', 'wenyuan', 'wenjing', 'wenting', 'blank'],
      TIERS: ['omen', 'decree', 'rare'],
      /* 节点白名单（天道卷 §7.1 · 纯文本短评、零机制效果）：八节点。
       * ⚠️ **新节点一律追加在表尾**——`td.omenSeen` 是按本表**序位**存位掩码的数组
       * （tiandao.js normalize 逐序位 clamp / pickOmenTpl 逐序位取用），中间插位会让旧档
       * 已有节点的掩码整体错挂到别的节点上（数据不炸但去重记忆串位）。
       * prodrank = 同代天骄榜面换位（N4 收口批，天骄卷 §四 候选扩展节点转正）。 */
      OMEN_NODES: ['tribwin', 'tribfail', 'break', 'clear', 'karma', 'war', 'rebirth', 'prodrank']
    },

    /* ── 轮回转世（轮回卷 v1.0 §8.3 · 六向长线批 A1）────────────────
     * meta 层唯一通货 = 遗泽（meta.karma，⚠️ 与 ws.karma 善恶值同名异义零关联）；
     * 恒等式：meta.karma === ΣearnedKeys − Σspent；遗泽不进 Ledger（#113 零改动）；
     * 转世 = 显式事务（飞升大劫 ×1.0 / 兵解 ×0.7 只作用结算折分项），不进 tick。 */
    LEGACY: {
      FEISHENG_BASE_P: 0.25,
      FEISHENG_CD_MS: 86400000,
      BINGJIE_MULT: 0.7,
      BINGJIE_MIN_REALM: 4,
      REALM_SCORE: [0, 10, 25, 50, 90, 150, 240, 360, 520, 720],
      ASCEND_BONUS: 200,
      TRIB_WIN_EACH: 2,
      ZONE_FIRST: 10, ZONE_BOSS: 15,
      TREASURE_EACH: 2,
      ART_MAX_EACH: 5, ART_MAX_CAP: 150,
      OFFICE_SCORE: [0, 5, 10, 20, 35, 60],
      RANK_SCORE: [0, 10, 30, 50, 80],
      TITLE_EACH: 2, TITLE_CAP: 30,
      START_REALM_PRICES: [100, 300, 700],   /* 跳档 筑基/金丹/元婴（封顶元婴 = REALMS 索引 1/2/3） */
      LEGACY_TALENT_SLOTS: 2,
      HEIR_PRICE: 600,
      /* 洗髓批：买断一次即赐一枚洗髓缘（越不过本世 3 次的预算，满了则拒购不扣泽）；
       * 计入价目总表 6600 → 6800（轮回卷 v1.17 / FACTS 遗泽商店行同批） */
      SWAP_PRICE: 200,
      UNLOCK_PRICES: { alchemy: 300, sect: 500, prodigySlot: 350, nemesis: 200, bond: 250 },
      BOND_HEIR_BASE: 40,
      QIRATE_STEP: 0.02, QIRATE_STAGES: 5,
      QIRATE_PRICES: [120, 160, 200, 240, 280],
      LEGACY_QIRATE_CAP: 0.10,
      LOG_KEEP: 20,
      BIO_KEEP: 9, BIO_MAX: 500,
      /* 传记落盘上界（正典① = 6 世）：与上行 BIO_KEEP（读档容错上界，兼容旧档 9 世）**配对使用**。
       * 三口径（codex.js 写口 / core.js 阶梯级⓪ / legacy.js normalize）自 2026-10-09 起一律经
       * `SQ.BioCaps` 取本表，不再各写字面量 —— 原状是「BIO_KEEP 声明了零消费、6 与 9 散在三处」
       * = 声明式假正典（展示流与落档口径批收口，配冒烟 #282 双向对表）。 */
      BIO_STORE_CAP: 6,
      /* 第册批勘正（顺带修，非本批主题）：原表在此**重复声明了一次** `BIO_STORE_CAP: 6`
       *（两条注释、两个同名键，JS 取后者 ⇒ 值侥幸没变）。改一条不改另一条就是下一批的假正典，删。 */
      /* 第册批：`BIO_MEMO_LEN: 1500` 随「烧表请天道作传」整族下线删除（见 `codex.js` 同批注）。 */
      /* 独占转世天赋池（§3.3 · epic 档 8 条）：全部走既有 17 字段 + 六挂点词汇，
       * 禁 tribBonus/on_trib_next/mingwang 渡劫键（零新增渡劫加项红线）；买断入池、逐世换选 ≤2 */
      TALENTS: [
        { id: 'legacy_talent_canjian',   price: 250, effects: { qiRate: 0.08 } },
        { id: 'legacy_talent_jiangu',    price: 250, effects: { combatPower: 0.06, gearLuck: 0.04 } },
        { id: 'legacy_talent_daotai',    price: 350, effects: { realmCost: -0.05 } },
        { id: 'legacy_talent_shutu',     price: 250, effects: { offlineEff: 0.12 } },
        { id: 'legacy_talent_cangzhen',  price: 300, effects: { on_kill_drop: 0.05 } },
        { id: 'legacy_talent_dianshi',   price: 250, effects: { stonesRate: 0.10 } },
        { id: 'legacy_talent_mingjing',  price: 350, effects: { checkBonus: 0.04, attrBonusAmp: 0.08 } },
        { id: 'legacy_talent_changhong', price: 300, effects: { on_bottleneck_power: 0.06, yufeng: 0.94 } }
      ]
    },

    /* ── 成就图鉴与人生传记（图鉴卷 v1.0 · 六向长线批 A2）────────────
     * 九面图鉴（条目=id 引用、跨世永不清、重复获得不刷新首录）+ 里程碑 50/80/100% =
     * 遗泽 15/30/50（即时入账，经 legacy 写口）+ 100% 档 qiRate +0.3%（'codex' 静态来源，cap +3%）；
     * 行为成就 60 条 = 遗泽 +1~5 + 称号（幂等键 = 成就 id）。判定 = 状态扫描（事件钩子零 tick）。 */
    CODEX: {
      MS_KARMA: [15, 30, 50],               /* 50% / 80% / 100% 档遗泽 */
      MS_PCT: [0.5, 0.8, 1.0],
      MS_QIRATE_100: 0.003,                 /* 100% 档永久 qiRate（仅九面主面） */
      CODEX_QIRATE_CAP: 0.03,
      TITLE_MS: [10, 25, 50],               /* 称号墙绝对数阶梯（同值遗泽 15/30/50） */
      TITLES_CAP: 80,
      /* 九面：分母取数器在引擎（池正典计数）；zone 面三层（首通/域主/词缀）合成一面 */
      FACES: ['event', 'talent', 'treasure', 'art', 'bond', 'zone', 'faction', 'title', 'selfart'],
      /* 行为成就 60 条（六组 ×10）：karma = 即时遗泽；title = 称号 id（'-' = 承天道卷不重发）；
       * hint = 未解锁时在成就图鉴提示达成条件（隐藏数值门槛/特殊机制类；缺省则遮为问号）；
       * 达成条件在引擎扫描器按 id 分派（状态派生，零边缘钩子） */
      ACHV: [
        /* 修行组「入道」 */
        { id: 'achv_jichu', g: 'xiu', karma: 2, title: 'title_daoji' },
        { id: 'achv_jindan', g: 'xiu', karma: 2, title: 'title_jindan' },
        { id: 'achv_yuanying', g: 'xiu', karma: 2, title: 'title_yuanying' },
        { id: 'achv_huashen', g: 'xiu', karma: 3, title: 'title_huashen' },
        { id: 'achv_lianxu', g: 'xiu', karma: 3, title: 'title_lianxu' },
        { id: 'achv_heti', g: 'xiu', karma: 3, title: 'title_heti' },
        { id: 'achv_dacheng', g: 'xiu', karma: 4, title: 'title_dacheng' },
        { id: 'achv_dujie', g: 'xiu', karma: 4, title: 'title_dujie' },
        { id: 'achv_zhenxian', g: 'xiu', karma: 5, title: 'title_zhenxian' },
        { id: 'achv_feisheng', g: 'xiu', karma: 5, title: 'title_feisheng' },
        /* 劫数组「历雷」 */
        { id: 'achv_chujie', g: 'jie', karma: 1, title: 'title_chujie' },
        { id: 'achv_wulou', g: 'jie', karma: 2, title: 'title_wulou', hint: true },
        { id: 'achv_kudu', g: 'jie', karma: 3, title: 'title_kudu', hint: true },
        { id: 'achv_lianbai', g: 'jie', karma: 3, title: 'title_lianbai', hint: true },
        { id: 'achv_baizhan', g: 'jie', karma: 3, title: 'title_baizhan' },
        { id: 'achv_nitian', g: 'jie', karma: 5, title: '-', hint: true },
        { id: 'achv_fanpan', g: 'jie', karma: 3, title: 'title_fanpan', hint: true },
        { id: 'achv_leiting', g: 'jie', karma: 2, title: 'title_leiting' },
        { id: 'achv_yuanman', g: 'jie', karma: 4, title: 'title_yuanman', hint: true },
        { id: 'achv_bingjie', g: 'jie', karma: 1, title: 'title_bingjie' },
        /* 尘缘组「结缘」 */
        { id: 'achv_chuyuan', g: 'chen', karma: 1, title: 'title_chuyuan' },
        { id: 'achv_guangjie', g: 'chen', karma: 2, title: 'title_guangjie' },
        { id: 'achv_renhou', g: 'chen', karma: 3, title: 'title_renhou' },
        { id: 'achv_daolv', g: 'chen', karma: 3, title: 'title_daolv' },
        { id: 'achv_hufa', g: 'chen', karma: 2, title: 'title_hufa' },
        { id: 'achv_juefeng', g: 'chen', karma: 2, title: 'title_juefeng', hint: true },
        { id: 'achv_xinjie', g: 'chen', karma: 1, title: 'title_xinjie' },
        { id: 'achv_kuashi', g: 'chen', karma: 3, title: 'title_kuashi', hint: true },
        { id: 'achv_shuangxiu', g: 'chen', karma: 2, title: 'title_shuangxiu', hint: true },
        { id: 'achv_fudi', g: 'chen', karma: 2, title: 'title_fudi', hint: true },
        /* 门庭组「门庭」 */
        { id: 'achv_rumen', g: 'men', karma: 1, title: 'title_rumen' },
        { id: 'achv_zhishi', g: 'men', karma: 2, title: 'title_zhishi' },
        { id: 'achv_zhangjiao', g: 'men', karma: 3, title: 'title_zhangjiao' },
        { id: 'achv_panzong', g: 'men', karma: 1, title: 'title_panzong' },
        { id: 'achv_zhangong', g: 'men', karma: 2, title: 'title_zhangong' },
        { id: 'achv_xuanzhan', g: 'men', karma: 1, title: 'title_xuanzhan' },
        { id: 'achv_kaizong', g: 'men', karma: 5, title: 'title_kaizong' },
        { id: 'achv_danfang', g: 'men', karma: 3, title: 'title_danfang' },
        { id: 'achv_jiuzhuan', g: 'men', karma: 5, title: 'title_jiuzhuan', hint: true },
        { id: 'achv_lianqi', g: 'men', karma: 3, title: 'title_lianqi' },
        /* 秘藏组「秘藏」 */
        { id: 'achv_chutong', g: 'mi', karma: 1, title: 'title_chutong' },
        { id: 'achv_bantu', g: 'mi', karma: 2, title: 'title_bantu' },
        { id: 'achv_quantong', g: 'mi', karma: 4, title: 'title_quantong' },
        { id: 'achv_yuzhu', g: 'mi', karma: 2, title: 'title_yuzhu' },
        { id: 'achv_shizhu', g: 'mi', karma: 4, title: 'title_shizhu', hint: true },
        { id: 'achv_chubao', g: 'mi', karma: 1, title: 'title_chubao' },
        { id: 'achv_cangbao', g: 'mi', karma: 2, title: 'title_cangbao' },
        { id: 'achv_baoquan', g: 'mi', karma: 4, title: 'title_baoquan' },
        { id: 'achv_yifa', g: 'mi', karma: 2, title: 'title_yifa' },
        { id: 'achv_wanfa', g: 'mi', karma: 3, title: 'title_wanfa' },
        /* 逆天组「逆流」 */
        { id: 'achv_rumo', g: 'ni', karma: 2, title: 'title_rumo' },
        { id: 'achv_shenmo', g: 'ni', karma: 3, title: 'title_shenmo', hint: true },
        { id: 'achv_lingzhi', g: 'ni', karma: 1, title: 'title_lingzhi' },
        { id: 'achv_kangzhi', g: 'ni', karma: 2, title: 'title_kangzhi' },
        { id: 'achv_niman', g: 'ni', karma: 3, title: 'title_niman', hint: true },
        { id: 'achv_guantian', g: 'ni', karma: 1, title: 'title_guantian', hint: true },
        { id: 'achv_sanshi', g: 'ni', karma: 3, title: 'title_sanshi' },
        { id: 'achv_sudi', g: 'ni', karma: 2, title: 'title_sudi', hint: true },
        { id: 'achv_zhandi', g: 'ni', karma: 4, title: 'title_zhandi', hint: true },
        { id: 'achv_bushou', g: 'ni', karma: 3, title: 'title_bushou', hint: true }
      ]
    },

    /* ── 炼丹炼器（炼丹炼器卷 v1.1 §8.2 · 六向长线批 A3）────────────
     * 材料轴（30 种）→ 生产两翼（丹药六型 / 定向炼器）→ 材料账两路（独立于灵石账）。
     * 一切效果走既有通道：时限丹 pushBuff / 破障丹 breakCostNext / 镇劫丹 tribulation.next；
     * 掉落轴零改动（材料是与装备/残片并列的独立掷判）；不进 tick（炼制 = 时间戳比较）。 */
    ALCHEMY: {
      UNLOCK_REALM: 1,
      MAT_DROP_P: 0.15,
      MAT_STACK_CAP: 999,
      MAT_SELL: [8, 40, 160, 600],            /* z0~2 / z3~5 / z6~8 / z9 四组卖价（固定不随境界系数） */
      /* ── 宗门材料供奉量表（N1 第二环 · 2026-10-08 用户裁定归属 = **本卷 §2.6 为唯一事实源**；
       *    自立门户卷 §4.2/§6.2/§12.2 只登记两路来源 key：`sect.tribute` 弟子供奉、
       *    `sect.tributefac` 丹房产出，细则不再互指）──
       * **速率制（每月累加期望、满 1 缴 1、余数结转）而非概率制**：#221 红线是「`sect.tick` 零随机掷判
       *     （sim-pacing 稳态带零侵入）」，掷判会把宗门月结变成随机源、动摇 pacing 锚；同 `PROG_NEED`
       *     升境余数结转的既有语义。料种按「已入账件数 mod 本区组池长」轮转取料，同样零掷判。
       *     走 `Alchemy.addMats` 唯一入账口 ⇒ 堆叠 999 溢出折灵石与 #207 材料恒等式自动沿用，不新开账。
       * 量级校准（对表现行被动材料渠道月均）：采集 2.5 件/游戏年 ≈ **0.21/月**、灵田 2.5 件/6 月 ≈ **0.42/月**；
       *     常见态（3 弟子档 1 + 丹房 2）= 0.375 + 0.067 ≈ **0.44 件/月**（≈灵田水位）
       *     满配（6 弟子档 2 + 供奉 1 + 丹房 5）= 6/7 + 1/8 + 5/30 ≈ **1.15 件/月**（终局身份的稳定补给，
       *     击杀掉落仍是绝对大头）。数值为草案，可由用户在此表直接改数。 */
      TRIBUTE: {
        DISC_MONTHS: [12, 8, 7],               /* 弟子按培养投资档每 N 游戏月缴 1 件（sect.tribute），与 INVEST_* 同档序 */
        OFFERING_MONTHS: 8,                    /* 供奉弟子（同辈高人挂名、不培养）每 N 月缴 1 件 */
        FAC_MONTHS: 30,                        /* 丹房每级每 N 月缴 1 件（sect.tributefac）⇒ 5 级 = 5/30 件/月 */
        N_PER_HIT: 1                           /* 单次入账件数 */
      },
      /* 采集轴（历练自动批）：驻区历练时每 1 游戏年（360 现实秒）自动入账 1~4 枚本区材料 */
      GATHER_INTERVAL_MS: 360000, GATHER_N_MIN: 1, GATHER_N_MAX: 4, GATHER_WUDAO_P: 0.10,
      /* 灵田材料轴（灵田迁栏批）：驻留福地灵田 Lv≥1 时每 6 游戏月（180 现实秒）入账 1~4 枚本区材料 */
      FARM_INTERVAL_MS: 180000, FARM_N_MIN: 1, FARM_N_MAX: 4,
      /* 🔧 **N43 定案（第册四批点头 · 第册十二批落地）：`PILL_DAILY_CAP` 整族退役**（连同
       * `ws.alchemy.pillDay` 计数与屏上 `alchemy.ui.pillcap` 那句）。立因 = 这道闸走 `gameDayOf`，
       * 而 **1 游戏日 = 1 现实秒** ⇒ 每次点击都已跨日清零，上限永不生效、屏上那句话只会说谎，
       * 与 GitHub issue #4 撤掉的赠丹日限同一形状（那一条已先退役，丹毒是唯一残留）。
       * 第十七批「两族合一 · 自产丹与成品丹同池同规矩」的**同池**部分保留（丹药仍同一匣、同一具身体吃药），
       * 只是不再有「每日几颗」这层闸；节流回到本来的两把尺子 = **丹药库存与炼制耗时**。
       * 防连点叠 buff 由冒烟 #119「同字段同向不叠加」守着，撤闸不开新口子。 */
      PILL_STOCK_CAP: 99,
      CRAFT_BASE: { huang: 0.85, xuan: 0.70, di: 0.55, tian: 0.40, qi: 0.80, qi_jing: 0.70 },
      CRAFT_CAP: 0.95,
      CRAFT_TIME_MIN: { huang: 10, xuan: 20, di: 40, tian: 80, qi: 30, qi_jing: 45 },
      PROF_RANKS: [0, 20, 60, 150, 400],      /* 学徒/熟练/精通/宗师/百炼 */
      PROF_BONUS: [0, 0.03, 0.06, 0.09, 0.12],
      PROF_TIME_CUT: [0, 0.05, 0.10, 0.15, 0.20],
      RUNE_P: 0.05,                           /* 丹纹变异（宗师起 · 仅炼丹 · 仅时限四型 = 九转丹正名） */
      /* POZHANG_MOD / ZHENJIE_BONUS 已删（第十四批审计 #14）：与 PILL_EFFECTS.ap_pozhang.mod /
       * ap_zhenjie.mod 同值两份，而读点用的是这一份 ⇒ 改丹方定义静默无效。取数口统一到丹方那条。 */
      FORGE_DROP_K: 0.5, FORGE_MAT_COST: 6, FORGE_MAIN_RANGE: [0.5, 1.0], FURNACE_MAT_COST: 10,
      FORGE_MAT_COST_JING: 12, REFINE_IN: 4,   /* 精制图纸材料 ×12；材料提炼 4:1（扩容批 §十二） */
      SHOP_PACK_W: { pack: 50, mat: 25, recipe: 10, bp: 10, furnace: 5 },   /* 权重零改动（扩容批裁定）：池扩容稀释由残片兑方新来源补偿，推进主轴零侵入（锚 9.12 复跑不变红线） */
      RECIPE_PRICES: { huang: 400, xuan: 1200, di: 4000, tian: 12000 },
      BP_PRICE: 600, BP_PRICE_JING: 1500, FURNACE_BP_PRICE: 800, FURNACE_PRICE: 2000,
      /* 材料总表 30 种（29 主材分区 + 悟道石 z:-1 跨区特殊；名称走词表 alchemy.mat.{id}.name） */
      MATS: [
        { id: 'mat_linglu', z: 0 }, { id: 'mat_qingmu', z: 0 },
        { id: 'mat_heifeng', z: 1 }, { id: 'mat_fengwen', z: 1 }, { id: 'mat_yeshou', z: 1 },
        { id: 'mat_dansha', z: 2 }, { id: 'mat_jingxue', z: 2 }, { id: 'mat_shousui', z: 2 },
        { id: 'mat_jiaotu', z: 3 }, { id: 'mat_gutong', z: 3 }, { id: 'mat_huoling', z: 3 },
        { id: 'mat_leisui', z: 4 }, { id: 'mat_leimu', z: 4 }, { id: 'mat_leilian', z: 4 },
        { id: 'mat_xingchen', z: 5 }, { id: 'mat_luanxing', z: 5 }, { id: 'mat_xukong', z: 5 },
        { id: 'mat_xiuluo', z: 6 }, { id: 'mat_xuerong', z: 6 }, { id: 'mat_zhanhun', z: 6 },
        { id: 'mat_longlin', z: 7 }, { id: 'mat_longxi', z: 7 }, { id: 'mat_tianyuan', z: 7 },
        { id: 'mat_hundun', z: 8 }, { id: 'mat_jingni', z: 8 }, { id: 'mat_zilei', z: 8 },
        { id: 'mat_jiewai', z: 9 }, { id: 'mat_gudao', z: 9 }, { id: 'mat_xianyu', z: 9 },
        { id: 'mat_wudao', z: -1 }
      ],
      /* 丹方十份（黄2/玄2/地4/天2 · 扩容批：天阶空位落实、z6~z9 未用材料激活、悟道石第二消耗口）：
       * 解锁境界 = 主材区解锁境界 + 1（z8 起封顶 9）；获得 ≠ 解锁（境界达标才激活，提升自动复检）；
       * rc_juqi 随功能开通自动授予 */
      RECIPES: [
        { id: 'rc_juqi', tier: 'huang', pill: 'ap_juqi', realm: 1, mats: [['mat_linglu', 2], ['mat_qingmu', 1]] },
        { id: 'rc_zhaocai', tier: 'huang', pill: 'ap_zhaocai', realm: 2, mats: [['mat_heifeng', 2], ['mat_yeshou', 1]] },
        { id: 'rc_ningshen', tier: 'xuan', pill: 'ap_ningshen', realm: 3, mats: [['mat_jingxue', 2], ['mat_shousui', 1], ['mat_linglu', 2]] },
        { id: 'rc_cuiti', tier: 'xuan', pill: 'ap_cuiti', realm: 4, mats: [['mat_jiaotu', 2], ['mat_huoling', 1], ['mat_heifeng', 2]] },
        { id: 'rc_pozhang', tier: 'di', pill: 'ap_pozhang', realm: 5, mats: [['mat_leisui', 2], ['mat_leimu', 2], ['mat_dansha', 2]] },
        { id: 'rc_zhenjie', tier: 'di', pill: 'ap_zhenjie', realm: 6, mats: [['mat_xingchen', 2], ['mat_luanxing', 2], ['mat_jiaotu', 3]] },
        { id: 'rc_fengxing', tier: 'di', pill: 'ap_fengxing', realm: 7, mats: [['mat_xiuluo', 2], ['mat_zhanhun', 2], ['mat_xukong', 2]] },
        /* 洗髓方（炼丹卷 v1.9 · 第三特例丹）：成品丹服下即赐一枚洗髓缘（换一枚天赋），
         * 无 buff、不入丹纹、不可赠（双特例丹同口径）；材料三样全为既有品种，零新料 */
        { id: 'rc_xisui', tier: 'di', pill: 'ap_xisui', realm: 6, mats: [['mat_xingchen', 2], ['mat_shousui', 2], ['mat_jingxue', 2]] },
        { id: 'rc_xirui', tier: 'di', pill: 'ap_xirui', realm: 8, mats: [['mat_longlin', 2], ['mat_longxi', 2], ['mat_xuerong', 2]] },
        { id: 'rc_haina', tier: 'tian', pill: 'ap_haina', realm: 9, mats: [['mat_hundun', 2], ['mat_jingni', 2], ['mat_tianyuan', 2]] },
        { id: 'rc_daohe', tier: 'tian', pill: 'ap_daohe', realm: 9, mats: [['mat_jiewai', 2], ['mat_xianyu', 1], ['mat_gudao', 1], ['mat_zilei', 2], ['mat_wudao', 1]] }
      ],
      /* 丹药六型（id 用 ap_ 前缀独立命名空间防歧义；§3.7 裁定。第十七起两族在**丹匣 / 服用 / 丹毒 / 赠礼**四件事上同轨，
       * 只在「效果怎么落」上不同，判据统一在 `SQ.Alchemy.pillDefOf`）：
       * 时限四型 pushBuff（source 'alchemy'，丹纹版 key = id+'_rw' 数值 ×2 时长不变）；
       * 双特例 = 一次性标记（每境界限 1，独立于丹毒日限，串行校验） */
      APILLS: {
        ap_juqi: { buff: { field: 'qiRate', mult: 0.10, hours: 2 } },
        ap_ningshen: { buff: { field: 'offlineEff', mult: 0.15, hours: 8 } },
        ap_cuiti: { buff: { field: 'combatPower', mult: 0.08, hours: 2 } },
        ap_zhaocai: { buff: { field: 'stonesRate', mult: 0.15, hours: 2 } },
        ap_fengxing: { buff: { field: 'combatSpeed', mult: 0.12, hours: 2 } },
        ap_xirui: { buff: { field: 'dropRate', mult: 0.20, hours: 2 } },
        ap_pozhang: { once: 'pozhang', mod: -0.10 },
        ap_zhenjie: { once: 'zhenjie', mod: 0.02 },
        ap_xisui: { swap: true },   /* 洗髓丹：无 buff 无法力，服下即赐一枚洗髓缘（SQ.Talents.grantSwap） */
        ap_haina: { buff: { field: 'qiCap', mult: 0.25, hours: 4 } },
        ap_daohe: { buff: { field: 'artsSpeed', mult: 0.25, hours: 4 } }
      },
      /* 器图纸 9 种（永久解锁 key，打造不消耗）；丹炉图纸产物 = furnace flag（不生成法器）；
       * 精制四张（jing:true · 扩容批 §十二.3）：品阶 +1 跨阶打造、材料 ×12、成功率 0.70、耗时 45min，
       * 方向表与灵品 attr 必选按 +1 后品阶同口径 */
      BLUEPRINTS: [
        { id: 'bp_weapon', slot: 'weapon' }, { id: 'bp_treasure', slot: 'treasure' },
        { id: 'bp_armor', slot: 'armor' }, { id: 'bp_accessory', slot: 'accessory' },
        { id: 'bp_weapon_jing', slot: 'weapon', jing: true }, { id: 'bp_treasure_jing', slot: 'treasure', jing: true },
        { id: 'bp_armor_jing', slot: 'armor', jing: true }, { id: 'bp_accessory_jing', slot: 'accessory', jing: true },
        { id: 'bp_furnace', furnace: true }
      ],
      /* 词条方向表（槽位 → 二选一；minTier = 该方向解锁的打造品阶线，未达置灰） */
      FORGE_DIRS: {
        weapon: [{ dir: 'pojun', field: 'atk' }, { dir: 'sheling', field: 'qiBonus', minTier: 1 }],
        treasure: [{ dir: 'sheling', field: 'qiBonus' }, { dir: 'huti', field: 'resist', minTier: 2 }],
        armor: [{ dir: 'huti', field: 'resist' }, { dir: 'pojun', field: 'atk' }],
        accessory: [{ dir: 'huti', field: 'resist' }, { dir: 'sheling', field: 'qiBonus' }]
      }
    },

    /* ── 渐进式系统解锁（渐次解锁批 §C · 引擎/view 同源单表）────────────
     * r = 境界门槛（达到即解锁；未达时导航「？」置灰不可点 = 势力批 v2.4 view 先例，本批表化）；
     * k = 解锁播报的名称词表 key（realm.js 渡劫成功点消费）。
     * 阶梯：炼气起点 5 页（修行/历练/功法/装备/奇遇，无锁）→ 筑基 +坊市/势力/炼丹/道友
     * → 金丹 +天骄 → 元婴 +法宝 → 化神 +宗门。天骄引擎 gate（tick 事件面/榜/切磋）同源读
     * TAB_UNLOCK.prodigy.r——推进照跑（金丹「相识」时天骄已在金丹，戏剧性保留），只锁交互面。 */
    TAB_UNLOCK: {
      shop:     { r: 1, k: 'shop.system' },
      faction:  { r: 1, k: 'faction.system' },
      alchemy:  { r: 1, k: 'alchemy.system' },
      bonds:    { r: 1, k: 'ui.pillar.bond' },
      prodigy:  { r: 2, k: 'jianghu.system' },
      treasure: { r: 3, k: 'treasure.system' },
      sect:     { r: 4, k: 'sect.system' }
    },

    /* ── 同代天骄（天骄卷 v1.0 §10.4 · 六向长线批 A4）────────────────
     * 交互档：叙事生成 + 月度轻量推进（两标量）+ 同代榜 + 切磋/结缘结仇/宿敌心结/机缘竞争。
     * 玩家数值轴零影响；心结 −0.02 走 §8.3 talent 加项（单份不叠加，全批负向总预算 −0.11 内）。 */
    PRODIGY: {
      COUNT_DEFAULT: 10,                        /* 每代天骄名录基数（页面展示前 10 详情）*/
      COUNT_MAX: 30,                            /* 每代天骄上限（天骄位解锁后补满）*/
      BOARD_SHOW: 10,                           /* 榜面只展示前 N 位的详细信息 */
      /* 榜面刷新节律：1 游戏日 = 1 现实秒、360 日/年 → 10 游戏年 = 3600 现实秒 */
      RANK_REFRESH_MS: 10 * 360 * 1000,
      SETTLE_SEC: 30,                           /* 1 游戏月 = 30 现实秒 */
      APT_W: [50, 35, 15],                      /* 常人/俊杰/天才 */
      APT_COEF: [1.0, 1.15, 1.3],
      POWER_COEF: [0.95, 1.05, 1.15],
      ALIGN_W: [35, 40, 25],                    /* 正/左/魔 */
      LONE_P: 0.15,
      SAME_ALIGN_FACTION_P: 0.80,
      SPAR_CD_MS: 10 * 60 * 1000,             /* 切磋冷却 10 现实分钟/人（体验批：7 天口径下榜基本是摆设） */
      SPAR_JITTER: 0.10,
      SPAR_DRAW_BAND: 0.01,
      SPAR_STAKE_K: 20,                         /* 赌注 = ZONES[min(realm,9)].stones × 20（std 档回退口径） */
      /* 三档赌注（切磋平衡批 §5.3 v2）：轻注/标准/重注——重注败北结仇率上浮（高风险高回报） */
      STAKE_K3: { light: 10, std: 20, heavy: 50 },
      SPAR_FEUD_P: 0.30,
      SPAR_FEUD_P_HEAVY: 0.40,
      /* 强弱差让（切磋平衡批 §5.3 v2 核心裁定）：ratio = 玩家真战力/天骄战力（浮动前，UI 透明展示）。
       * 碾压（ratio ≥ 1.5，±10% 浮动下必胜带）胜返 ×1.5（净 +0.5）且 bond 只 +1（胜之不武）
       *   ——掐灭后期必胜提款机；
       * 问强（ratio ≤ 1.0 = 对手战力不低于我）胜返 ×3（净 +2）且 bond +3（心折深服）、胜材料率上浮
       *   ——激励挑战上位者。阈值裁定：±10% 抖动下胜判定带 = ratio ∈ (0.818, 1.222)，brave 取 1.0
       *   使 (0.818, 1.0] 段「对手更强仍可胜」有真悬念（若取 0.8 则问强与胜互斥、×3 返还永不发生）；
       *   (1.0, 1.5) = 势均力敌标准带（胜返 ×2）。
       * Ledger 恒等式零新增分类：out.event_loss(押注) + in.event(实际返还)。 */
      HANDICAP: { crush: 1.5, crushRet: 1.5, crushBond: 1, brave: 1.0, braveRet: 3, braveBond: 3, braveMatP: 0.15 },
      SPAR_MAT_P: 0.10,                         /* 胜方材料彩头：10% 得同区组随机材料 ×1（材料账零灵石流，提炼双路先例） */
      BOND_GAIN: { win: 2, lose: 1, draw: 1 },
      BOND_EVENTS: [30, 70, 100],               /* 知交/生死之交/道护 达档触发专属事件 */
      /* ── 江湖榜④（第册三批 · 设计稿 §六 4 / §七）两支独立通道的钩子表 ──
       * RIVAL_EVENTS = 机缘竞争那一条挂的词条池（按名录号 hashOf 取模，**不掷随机**）；
       * HID_EVENT_REALM = 隐世三席「间接得知」的门槛境界（地榜带入口 = 索引 6） */
      RIVAL_EVENTS: ['jianghu_ev_rival_ling', 'jianghu_ev_rival_trial'],
      HID_EVENT_REALM: 6,
      FEUD_TRIB: -0.02,
      FEUD_MEET_P: 0.03,
      FEUD_FORGIVE_P: 0.05,
      FEUD_FORGIVE_BOND: 70,
      FEUD_KILL_KARMA: [-25, -10, 15],          /* 斩杀 karma 按天骄阵营 正/左/魔 */
      RIVALRY_P: 0.05,
      RIVALRY_CD_MS: 360000,                    /* 频控 1 游戏年 = 360 现实秒 */
      RIVALRY_BOOST: { add: 0.1, months: 3 },
      /* ── 携才投效（N6 收口批 · 天骄卷 §6.2 `prodigy_ev_join` 骨架 + 自立门户卷 §7.1 消费口径）──
       * 生成端（prodigy.js tick 月掷）：玩家已立派且未传位、**名额未满**（§7.1「上限校验先行，
       * 满员则事件根本不触发」——先校验后掷，不是掷完再拒）、该天骄 bond ≥ JOIN_BOND、非宿敌、
       * 尚未效力 ⇒ 每游戏月 JOIN_P 掷「登门求入门」。
       * 三分支按**宗规** `ws.sect.align` 定（不是玩家善恶值、也不是玩家选）：
       *   正 = 收入门下 / 左 = 婉拒（纯叙事，bond 不动）/ 魔 = 压价刁难判定 [势·困难]。
       * JOIN_DC = 「势·困难」的战力门槛比（`type:'power'` 判定用 ratio，取 `ATTR_DIFF.hard` 1.5 同档；
       *   否决案 = 复用 `prodigySpar` 对局判定——那是「打一场」，与压价谈判的语义不符）
       * JOIN_FEUD_P = 判定败北后结仇率（天骄卷 §5.4 同 30% 口径）
       * JOIN_REFUSE_BOND = 败北且未结仇时的负向好感（走 `Bonds.lose` 唯一负向入口，§7.1「拒绝 −5」）。
       * ⚠️ 两卷对「拒」的幅度互指未会签：天骄卷 §6.2 给左道婉拒 **−0**、自立门户卷 §7.1 给拒绝 **−5**
       *   ⇒ 本批分派为「左道婉拒 −0（照 §6.2 纯叙事）／压价谈崩 −5（照 §7.1 负向入口）」，
       *   归并成一条正典待两卷会签。 */
      JOIN_P: 0.05, JOIN_BOND: 30, JOIN_DC: 1.5, JOIN_FEUD_P: 0.30, JOIN_REFUSE_BOND: -5,
      ETERNAL_COEF: 0.2,
      COEF_CAP: 1.6,
      RUMOR_CAP: 2,                             /* kind:'prodigy' 展示卡独立上限（不占 RUMORS.MAX） */
      RUMOR_TTL_MIN: 5,                         /* 第册一百一十五批：40 → **5 现实分钟**（用户令「同代天骄传闻持续时间改为 5 分钟」）
                                                 * ⇒ 天骄卡**不再沿用 ren 档**，与事件传闻 `RUMOR_TTL.ren=40` 正式分家（那三档未动） */
      NAME_POOL: [9, 7, 5]                      /* 姓 9 × 名一 7 × 名二 5 = 315 组合 */
    },

    /* ── 功法融合（融合器灵卷 v1.1 §10.2 · 六向长线批 A5）────────────
     * 终局养成：双 Lv9 父本 + 悟道条件 → 词条重组自创部（三代封顶、FIELD_CAP 守恒双闸、
     * 双亲消耗）；数值上不越正典一步（自创最强 = 全录同字段每级最大值等值）。 */
    FUSE: {
      BASE_P: 0.60,
      SHEN_PER: 6, SHEN_CAP_PP: 8,
      REALM_PP: 0.02,
      P_CLAMP: [0.60, 0.86],
      CD_MS: 7200000,                           /* 全局 CD 2 现实小时（成败均记）· 第册一百一十五批由 3 现实天改小 */
      MEDITATE_NEED_H: 12,                      /* 悟道通道 A：闭关累计现实小时（在线 seclude + 离线结算；12 时辰 = 半现实天） */
      MAIN_MULT: 1.1,
      GEN_MULT: { 1: 1.05, 2: 1.02, 3: 1.00 },
      GEN_MAX: 3,
      CUSTOM_MAX: 4,
      NAME_LEN: 8,
      SPECIAL_KEEP: { 2: 1.00, 1: 0.75, 0: 0.50 },
      SPECIAL_SUB_P: 0.25,
      TIER_BONUS: 0.5,
      COMBOS: 1080,                             /* 命名池 36 前缀 × 30 后缀（融合扩容批 v1.3；图鉴第 9 面分母组分同步） */
      PRE_N: 36, SUF_N: 30,                     /* 词库池宽（lexicon-spirit PRE/SUF 数组长度同源，rollName 消费） */
      /* 混沌淬炼（融合器灵卷 v1.3 §4.4）：自创部专属签名的唯一授予通道——
       * 悟道石 ×1（材料账既有口）+ 灵石 REFORGE_COST[tier]（out.arts 既有分类）→ 掷 CHAOS_P；
       * 命中 = 授予/升档混沌签名（覆盖原 special，grade = gen−1 只升不降），未命中零损失。
       * CD 30 现实分钟（lastReforgeAt 全局，与融合 CD 独立；第册一百一十五批由 1 现实天改小）。
       * 悟道石第三消耗口（融合/丹方道合/淬炼竞争同一稀缺资源）。
       * ⚠️ 改小带来的真实后果：淬炼频率上限提高 ⇒ 悟道石消耗节奏同步加快，稀缺度靠采集侧那条 10% 通道自然约束（未另立闸）。 */
      CHAOS_P: 0.30,
      CHAOS_BY_ATTR: { qi: 'hundun', jing: 'zaohua', shen: 'taiyi' },
      REFORGE_COST: { huang: 200, xuan: 800, di: 2500, tian: 8000 },   /* ≈同阶坊市功法半价 */
      REFORGE_CD_MS: 1800000,
      /* ⚠️ 导出口，不独立调参：每格 = 全录该字段「每级值」的最大值（红线四类 = 其现行 clamp 值，不在此列）。
       * 第卅八批品阶强度重排（阶梯 黄1/玄2/地3.5/天6）随之整表重导：qiRate 0.13→0.225、qiCap 0.10→0.30、
       * combatPower 0.14→0.315 …… ⇒ **自创部的字段封顶同步抬高**。
       * 谁改了《功法全录》的每级效果却忘了这里，冒烟 #301(d)（FIELD_CAP === 全录最大值）直接判红。 */
      FIELD_CAP: { combatPower: 0.315, qiRate: 0.225, offlineEff: 0.288, combatSpeed: 0.219,
        qiCap: 0.30, stonesRate: 0.267, artsSpeed: 0.07, eventRate: 0.14,
        eventLuck: 0.09, dropRate: 0.05, tribBonus: 0.025, realmCost: -0.02 },
      NEVER_FIELDS: ['checkBonus', 'attrBonusAmp', 'tribFailLossMod']   /* 非乘区字段永不进重组池（第二道闸） */
    },

    /* ── 法宝器灵（融合器灵卷 v1.1 §六~§八）────────────────────────
     * 温养觉醒（三来源速率 + 满值六档）→ 五档人格（器型加权 roll 60/10×4）→ 一灵一技
     * （五技全走既有通道：talent 加项 / pushBuff / on_kill_stones 限时加项 / karma 记账）。 */
    SPIRIT: {
      WARM: { equipH: 3, trib: 15, kill: 0.5 },
      NEED: { liang: 300, ling: 450, ling_evil: 450, shang: 600, xian: 800,
        xian_zhong: 800, xian_shang: 1000, xian_ji: 1200 },
      NEED_DEFAULT: 600,
      PERSONA_W: { main: 60, other: 10 },
      PERSONAS: ['jian', 'shou', 'gu', 'yao', 'xian'],
      SKILL_CD_MS: 604800000,
      PICKUP_K: 50,
      VERDICT_THROTTLE_MS: 600000,
      SKILLS: {
        hun: { persona: 'xian', trib: 0.01 },
        jian: { persona: 'jian', field: 'combatPower', mult: 0.08, hours: 2 },
        shi: { persona: 'shou', hook: 'on_kill_stones', mult: 0.10, mins: 30 },
        xiong: { persona: 'yao', field: 'dropRate', mult: 0.08, hours: 2, karma: -2 },
        yin: { persona: 'gu', field: 'offlineEff', mult: 0.10, hours: 8 }
      }
    },

    /* ── 自立门户 · 宗门系统（自立门户卷 v1.1 §9.4 · 六向长线批 A6 · 汇流终点）──
     * 第 17 动态位：开宗四门槛 → 立派三定 → 弟子/设施/战争/供奉 → 传位。
     * 红线：零渡劫加项（护山大阵 ⏸ 不采纳）、弟子推进零玩家轴、净水槽经济；
     * Ledger 净变化 = 恰好 +1 路（in.tribute）；out 侧零新增（cave/donate 复用）。 */
    SECT: {
      FOUND_REALM: 4,
      FOUND_RANK: 4,
      FOUND_REP_PEAK: 2000,
      NAME_MAX: 6,
      MOTTO_MAX: 24,
      TAX_K: 0.5,                    /* 宗门税：弟子所在区灵石基准 × 0.5 × 税率（0~30% 步长 5） */
      TAX_STEPS: [0, 5, 10, 15, 20, 25, 30],
      PEACE_COST_K: 2,               /* 停战费 = 宗门声望 × 2（下限 1000 灵石） */
      DISC_CAP_BASE: 1,
      APT_W: { right: [20, 55, 25], neutral: [15, 55, 30], evil: [10, 50, 40] },
      APT_MULT: { fine: 1.2, mid: 1.0, raw: 0.8 },
      APT_IDS: ['fine', 'mid', 'raw'],
      TIANJIAO_MULT: 1.2,
      DISC_REALM_GAP: 1,
      PROG_NEED: [1, 2, 4, 8, 16, 30, 50, 80, 120],   /* 升境 prog 暂用表（境界 1~9） */
      INVEST_COST_K: [0, 0.5, 1.5],
      INVEST_PROG: [1, 1.5, 2.5],
      RECRUIT_CD_MS: 86400000,
      TRIBUTE_K: 0.03,
      TRIBUTE_OFFERING_MULT: 2,
      FAC_MAX: 5,
      FAC_COST: [100000, 500000, 2000000, 8000000, 30000000],
      FAC_IDS: ['zangjing', 'danfang', 'yanwu', 'keshe'],
      /* 丹房①（自立门户卷 §4.2）：宗门炼丹成功率平坦加项。**不随等级缩放**——卷面只开这一个数，
       * 满级递进 ⏳「未定，待炼丹卷补行」，故禁按级乘；消费点在 alchemy.js craftP（受 CRAFT_CAP 钳）。 */
      DANFANG_CRAFT: 0.05,
      ART_SLOTS: [1, 1, 2, 2, 3, 3],
      ART_POWER: 0.08,
      /* 宗规三倾向 → 弟子可学功法子集（自立门户卷 §2.3 表 · 只约束弟子传法，不锁宗主自己）：
       * 正道收 right/neutral、魔道收 evil/neutral、左道三值全收 = 不限（neutral 为基准档）。
       * 消费点 = sect.js discPower 藏经阁槽位钳 min(ART_SLOTS[级], 合格已持功法部数)。 */
      ART_ALLOW: {
        right: ['right', 'neutral'],
        neutral: ['right', 'neutral', 'evil'],
        evil: ['evil', 'neutral']
      },
      YANWU_K: 0.05,
      SELF_K: 0.5,
      REP_BASE: 500, REP_DISC: 50, REP_FAC: 100, REP_WIN: 200,
      DISPATCH: { hours: 2, cd: 86400000, apt: { fine: 0.10, mid: 0.07, raw: 0.05 }, offeringMult: 1.5, source: 'sect',
        fields: ['combatPower', 'stonesRate', 'artsSpeed', 'offlineEff', 'combatSpeed'] },
      OFFER_BOND: 70, OFFER_P3: 0.5, OFFER_CAP: 2,
      WAR_DISC_K: 2,
      WAR_DECLARE_CD_MS: 86400000,
      WAR_REP_SUPPRESS: 0.10,
      /* 结仇宣战三笔代价（第册一百二十二批 · 用户裁定「开：重代价」；§5.4）：
       * 费 = 目标势力声望 × K（下限 1000，与停战费同尺）‖ 善恶一次性 −30（同叛离量级）‖ 本宗声望永久 −10%（累乘下限 0.5） */
      WAR_OPEN_COST_K: 2,
      WAR_OPEN_KARMA: -30,
      WAR_REP_SELF_CUT: 0.10,
      GATES: ['wuyue', 'baihong', 'panlong'],
      NPC_REP_BASE: 1500, NPC_REP_PER_TIER: 500   /* NPC 势力声望排行暂用口径（§5.2）：1500 + 500×档次 */
    }
  };
})();
