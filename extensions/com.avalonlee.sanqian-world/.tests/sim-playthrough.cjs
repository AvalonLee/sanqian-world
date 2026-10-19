/* .tests/sim-playthrough.cjs — 真机模拟走查（六向长线批收口 · 用户验收项「模拟几遍真机测试」）
 * 三条路线 × 多轮，全部走真实事务通道（SQ.mutate / SQ.claim / SQ.Actions.*——与视图同一入口）：
 *   A 新手路线：创角 → 挂机 → 破境 → 秘境 → 坊市 → 奇遇 → 势力 → 洞府（模拟 120 天）
 *   B 全系统路线：A + 天道问天(V1.5) + 炼丹炼器 + 天骄切磋 + 功法融合 + 器灵 + 宗门 + 飞升转世二世（模拟 500 天）
 *   C 随机 fuzz 路线：2 万步随机合法操作（软锁检测 + 零崩溃 + 不变量）
 * 每步校验四大不变量：灵石账 #113 / 材料账两路 / 遗泽恒等式 #197 / 存档容量（save 压缩后 ≤50KB）。
 * 时间流：mock Date.now（offset 推进），claim 的 dt 离线结算与 CD 全部真实生效。
 * 用法：node .tests/sim-playthrough.cjs [轮数，缺省 2] [种子，缺省随机]
 *   种子亦可走环境变量 SQ_SEED。给定同一种子 → 全流程逐位可复现：走查原用裸 Math.random，
 *   结果逐跑浮动，间歇性缺陷（如存档容量红线越线）只能靠多跑撞见、收口那次跑不中即记全绿
 *   → 2026-10-05 存档容量防线批加此开关，收口须附「固定种子 N 连跑全绿 + 随机种子复跑」双证据。
 * 输出：逐路线统计 + 容量水位（save 越 45KB 触发线即附字段分解）+ PLAYTHROUGH_ALL_GREEN / PLAYTHROUGH_FAILED n。
 */
'use strict';
const crypto = require('crypto');
const { load } = require('./sandbox.cjs');
const { sandbox } = load([]);
const SQ = sandbox.window.SQ;
const pack = SQ.Worlds.xiuxian.pack;
const D = pack.data;

const ROUNDS = parseInt(process.argv[2] || '2', 10);
/* 开发用日预算缩放（缺省 1 = 不影响任何读数）：改剧本时先用 SQ_DAYS=0.05 跑一遍抓崩溃/接线错，
 * 再放开预算跑全量——整轮 5+4 条路线全量近 20 分钟，逐条试错等不起。种子模式请勿改动本值。 */
const DAY_SCALE = parseFloat(process.env.SQ_DAYS || '1') || 1;
const dOf = d => Math.max(1, Math.round(d * DAY_SCALE));
/* 锚跑开关必须在**下面种子解析之前**落定（`SQ_ANCHOR=1` ⇒ 强制走在册锚种子），细则见 `const violations` 之后那块注。 */
const ANCHOR_ON = process.env.SQ_ANCHOR === '1';
const ANCHOR_SEED = '20261008';
if (ANCHOR_ON) process.env.SQ_SEED = ANCHOR_SEED;
/* ── 可复现种子（2026-10-05 存档容量防线批）：argv[3] 或 SQ_SEED；缺省/0 = 保持原随机行为 ──
 * mulberry32。覆写宿主 Math.random 即可全链受控：sandbox.cjs 把宿主 Math 对象原样注入 vm 上下文
 * （sandbox = { ..., Math, ... }），引擎与走查两侧掷判同源同对象，一处覆写逐位可复现。 */
const SEED_ARG = String(process.argv[3] || process.env.SQ_SEED || '');
const SEED = (parseInt(SEED_ARG, 10) || 0) >>> 0;
if (SEED) {
  let _a = SEED;
  Math.random = function () {
    _a = (_a + 0x6D2B79F5) | 0;
    let t = Math.imul(_a ^ (_a >>> 15), 1 | _a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const violations = [];
/* ── 轨迹锚 = 件内自算的机器判据（第册四十五批 2026-10-19 · N79 代裁走「做成真判据」那一支）──────
 * 立因：AGENTS.md 一直写「轨迹锚是判据：改了结算/掉率类代码会换 md5，必须先复跑再改锚」，但 2026-10-19 实测：
 *   ① 复算口径只活在 `run-dod.cjs:111` 那一行里（传轮数 1 ‖ 种子 20261008），文档从没写过「锚 = 这条命令 stdout 的 md5」
 *      ⇒ 取证第一轮按 `SQ_SEED` 不带轮数复算，得到 14,397B 的另一形状，差点上报「锚不可复现」；
 *   ② `.tests/**` 全域 `createHash` 零命中 ⇒ **没有任何件在算它**，而在册锚 `56573788…`（11,203B，第册十二批钉）自那以后
 *      卅余批无人重钉、无一关报过 ⇒ 那条「判据」在机器层面是假的。
 * 判：**锚态由显式开关 `SQ_ANCHOR=1` 说了算**（不由「有没有传种子」推——门禁链的随机跑、换种子的探路跑、
 *   `SQ_DAYS` 开发跑都要保持原样绿，靠种子推会把绿跑判红）。开了锚开关就：① 强制走在册种子 `20261008`
 *   （锚 = 这条种子下的那份逐路线读数）；② 把每一行读数同时收进数组；③ 在打末行 marker **之前**对数组
 *   `join('\n')` 求 md5 与 `ANCHOR_MD5` 对表，漂了就打 FAIL 行并判红。末行 marker 不参与哈希（避免自指）。
 * 用法：`SQ_ANCHOR=1 node .tests/sim-playthrough.cjs 1` ⇒ 末行 `PLAYTHROUGH_ALL_GREEN … ‖ 锚对表相同 d93d11d0`。
 * 改锚纪律照 §4.42：换值要写归因（哪一批改了结算 / 掉率 / 呈现计数），不许顺手把锚改成新值。 */
const ANCHOR_MD5 = 'd93d11d01f419b9235c68ead54a9d45e';
const TRAJ = [];
if (ANCHOR_ON) {
  const logRaw = console.log;
  console.log = function () { TRAJ.push(Array.prototype.join.call(arguments, ' ')); logRaw.apply(console, arguments); };
}
const crashes = [];
/* 容量红线/触发线读 core.js 导出的单一事实源（旧版三处硬编码 50/45，与 smoke、probe 各自为政） */
const RED_KB = SQ.SAVE_RED / 1024;
const TRIG_KB = SQ.SAVE_TRIGGER / 1024;
const capWatch = [];      /* 容量水位观察：save 越 45KB 触发线即记峰值字段分解（每路线一条） */
let opsTotal = 0;

/* ── 时间 mock ── */
const realNow = Date.now;
/* 固定基准时刻（2026-10-05 存档容量防线批）：原实现 `Date.now = () => realNow() + offset`，基准 = 进程启动的
 * 真实墙钟 → 两跑天然不同、**种子无法做到逐位可复现**（同种子双跑实测遗泽/成就/材料/切磋数全飘）。
 * 改为一次性取定 BASE_NOW，此后模拟时间流 = BASE_NOW + offset 完全确定；realNow 仍是原生函数，
 * 墙钟统计（wallMs / t00）照旧走真实时间、不受影响。 */
/* 种子模式用**固定纪元**而非 realNow()：BASE_NOW 若在模块装载时取真实墙钟，两跑会差几毫秒
 * （实测同种子双跑差 8ms）→ 打印的基准时刻不同、逐字节比对失败，且极端情形下可能踩到冷却边界。
 * 固定纪元后两跑输出逐字节完全相同（实测总操作数与全部路线统计本已一致，只差这一处打印值）。 */
const BASE_NOW = SEED ? 1700000000000 : realNow();
let offset = 0;
Date.now = function () { return BASE_NOW + offset; };
function advance(ms) { offset += ms; }
function resetTime() { offset = 0; }

function byteLen(o) {
  const st = typeof o === 'string' ? o : JSON.stringify(o);
  let n = 0;
  for (let i = 0; i < st.length; i++) { const c = st.charCodeAt(i); n += c > 0x7ff ? 3 : (c > 0x7f ? 2 : 1); }
  return n;
}

/* 存档字段分解（容量红线诊断）：ws.* 与 meta.* 逐项字节，降序取前 12。
 * 阶梯耗尽态（级⓪~⑥ 全跑完仍 > 45KB 触发线）过去只报一个总 KB 数、无从定位增长源，
 * 本函数即为此加——2026-10-05 越线事故正是靠它把根因钉到 prodigies/prodMarks。 */
function sizeBreakdown(raw) {
  let o;
  try { o = JSON.parse(raw); } catch (e) { return 'parse-fail'; }
  const rows = [];
  const wid = (o.profile && o.profile.worldId) || 'xiuxian';
  const w = (o.worlds || {})[wid] || {};
  Object.keys(w).forEach(k => rows.push(['ws.' + k, byteLen(w[k])]));
  const m = o.meta || {};
  Object.keys(m).forEach(k => rows.push(['meta.' + k, byteLen(m[k])]));
  rows.push(['profile', byteLen(o.profile || {})]);
  rows.sort((a, b) => b[1] - a[1]);
  return rows.slice(0, 12).map(r => r[0] + '=' + (r[1] / 1024).toFixed(2) + 'KB').join(' ');
}

/* ── 四大不变量 ── */
function checkInvariants(s, tag) {
  if (!s || !s.profile || !s.profile.worldId) return;
  const w = s.worlds[s.profile.worldId];
  if (!w) { violations.push(tag + ': no ws'); return; }
  let si = 0, so = 0;
  SQ.Ledger.IN_CATS.forEach(k => { si += (w.ledger.in[k] || 0); });
  for (const k in w.ledger.out) so += (w.ledger.out[k] || 0);
  if (100 + si - so !== w.stones) violations.push(tag + ': stone-ledger ' + (100 + si - so) + ' vs ' + w.stones);
  let bag = 0;
  for (const k in (w.materials || {})) bag += w.materials[k];
  const lm = w.ledgerMat;
  if (lm && lm.in.materials - lm.out.materials !== bag) violations.push(tag + ': mat-ledger ' + (lm.in.materials - lm.out.materials) + ' vs ' + bag);
  const m = s.meta;
  if (m) {
    let e = 0, sp = 0;
    for (const k in (m.earnedKeys || {})) e += m.earnedKeys[k];
    for (const k in (m.spent || {})) sp += m.spent[k];
    if ((m.karma || 0) !== e - sp) violations.push(tag + ': karma-ident ' + m.karma + ' vs ' + (e - sp));
  }
  if (violations.length > 40) { /* 截断防刷屏 */ }
}

function safe(tag, fn) {
  opsTotal++;
  try { return fn(); } catch (e) {
    crashes.push(tag + ': ' + (e && e.message ? e.message : String(e)));
    return null;
  }
}

async function asafe(tag, fn) {
  opsTotal++;
  try { return await fn(); } catch (e) {
    crashes.push(tag + ': ' + (e && e.message ? e.message : String(e)));
    return null;
  }
}

function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ── 创角（视图 mk-ok 等价事务 · view/index.html:1647 逐字段对齐）──
 * legacyGifts = 轮回赠礼三件套（跳档 startRealm / 转世天赋 / 跨世之缘 bond）：
 *   bond 走 meta.unlocks.bond + meta.lastBonds（前世结缘名录）双门，与视图 lgBond 同判据；
 *   写入 bonds[npc]=BOND_HEIR_BASE + heirBond=npc（成就「缘定三生」两通道之一，另一通道 = Bonds.redeem）。 */
async function createRole(ref, name, legacyGifts, bias) {
  await SQ.mutate(ref, function (s) {
    const rolled = SQ.rollTalents('xiuxian');
    s.profile = { name: name, talents: rolled.talents, worldId: 'xiuxian', worldName: '修仙',
      createdAt: Date.now(), alignBias: bias || 'neutral', legacyTalents: (legacyGifts && legacyGifts.talents) || [] };
    s.worlds.xiuxian = pack.initialState();
    if (legacyGifts && legacyGifts.startRealm > 0) s.worlds.xiuxian.realm = legacyGifts.startRealm;
    if (legacyGifts && legacyGifts.bond && (s.meta.unlocks || {}).bond &&
      (s.meta.lastBonds || []).indexOf(legacyGifts.bond) >= 0) {
      s.worlds.xiuxian.bonds[legacyGifts.bond] = D.LEGACY.BOND_HEIR_BASE;
      s.worlds.xiuxian.heirBond = legacyGifts.bond;
    }
  });
  await SQ.mutate(ref, function (s) {
    SQ.Prodigy.rollForNewLife(s.worlds.xiuxian, pack, D, s.meta, Date.now());
  });
  await SQ.Actions.setAutoTrib(ref, true);
}

/* ── 2026-10-08 成就路线覆盖批：玩家侧择分支 / 劫率预估 / 宿敌识别（全只读引擎口，零直写 ws）── */
/* 奇遇分支倾向：opts.branch = 缺省|'random'（原口径，逐字节不变）| 'evil' | 'right' | 'neutral'
 * | { evil: [起,止], right: [[起,止],…] } 相位表（一条世里先作恶后忏悔 = 炉鼎→心结线的必经动作）。
 * 玩家没有「指定分支」的外挂：只是每次都点同一个按钮，该分支不存在时回落随机（与原口径同 RNG 形态）。 */
function branchKeysOf(ev) { return Object.keys((ev && ev.choices) || {}); }
function branchWanted(keys, want) {
  if (!Array.isArray(keys) || !keys.length) return null;
  if (want === 'evil' && keys.indexOf('evil') >= 0) return 'evil';
  if (want === 'right' && keys.indexOf('right') >= 0) return 'right';
  if (want === 'neutral' && keys.indexOf('neutral') >= 0) return 'neutral';
  return randPick(keys);
}
function branchOf(ev, opts, simDay) {
  const keys = branchKeysOf(ev);
  const b = opts.branch;
  if (b == null || b === 'random') return randPick(keys);
  if (typeof b === 'string') return branchWanted(keys, b);
  let want = null;
  Object.keys(b).forEach(k => {
    const spans = Array.isArray(b[k][0]) ? b[k] : [b[k]];
    spans.forEach(sp => { if (simDay >= sp[0] && simDay <= sp[1]) want = k; });
  });
  return branchWanted(keys, want);
}
/* 渡劫成算（纯读 XTrib.info 的 p）：劫数组成就（苦渡/连败）与「兵解 vs 飞升」择路都按它决策 */
function tribPNow(ref) {
  const w = ref.worlds[ref.profile.worldId];
  if (!w) return null;
  const mods = SQ.Mods.collect(ref.profile, w, pack, D);
  const info = SQ.XTrib ? SQ.XTrib.info(w, pack, D, mods) : null;
  return info ? info.p : null;
}
/* 跨世宿敌（天骄卷 §九）：新世 rollForNewLife 造的 eternal 行**不带** meta.eternalProdigy.id
 * （saveEternal 只存 nm/apt/al/fc/fid/rlm/wl/feud）⇒ 剧本只能按 eternal 标记认人，
 * 别去复刻 codex.achvMet 那条 id 相等判据（本批实测恒假，见收口报告）。 */
function eternalProdigies(w) { return ((w || {}).prodigies || []).filter(p => p.eternal === true); }

/* ── 玩家决策层（每步 claim 后跑一遍，模拟真实玩家操作习惯）── */
let stepTick = 0;    /* 步计数：只为「重活在玩家手上也不该每帧点」的段落抽样让路（opts.collect 每 2 步一轮） */
async function playerStep(ref, tag, opts) {
  stepTick++;
  const s = ref;
  const w = s.worlds[s.profile.worldId];
  if (!w) return;
  /* 本步所处模拟日（相位表 / 择劫 / 恋栈门槛都用它；与步 15 同一算法，Date.now 已被 mock） */
  const simDay = Math.round((Date.now() - (ref.profile.createdAt || 0)) / 86400000);
  if (opts.phase) opts.phase(simDay);
  /* 0. 压境蓄势（opts.autoTribUntil · achv_kudu/achv_lianbai/achv_leiting 的正当玩法）：
   * 一路自动渡劫的话，境界跑在业力前头——过 Realm 8 时 karma 只到 −500 档（karmaMod −0.12）、
   * 成算 0.2 上下，永远撞不到 p≤0.15 的「苦渡」窗口。真玩家的解法就是关掉自动渡劫、
   * 让业力先沉底（karma≤−800 → mod −0.25 → 高境界成算被夹到 TRIB_P_CLAMP 下限）再硬闯。
   * 只切偏好开关（Actions.setAutoTrib），不动任何角色字段。 */
  if (opts.autoTribUntil != null) {
    const wantOn = simDay >= opts.autoTribUntil;
    if (opts._tribOn !== wantOn) {
      await asafe(tag + '.autoTrib', () => SQ.Actions.setAutoTrib(ref, wantOn));
      opts._tribOn = wantOn;
    }
  }
  /* 1. 奇遇选择（默认随机分支——模拟玩家凭喜好选；带 opts.branch 时按倾向表点同一个按钮）
   *    ⚠️ 战术三支（袭击 / 寻仇）**必须在这一处结清**：本段是每步唯一的 pendingChoice 消费点，
   *    第卌四批曾把战术计数另起一段放在 8.6，结果那段永远抢不到 ⇒ 打印面恒零的假读数。 */
  if (w.pendingChoice) {
    const pc1 = w.pendingChoice, ev = SQ.Events.findById(pack, pc1.id);
    if (ev && ev.choices) {
      const key1 = branchOf(ev, opts, simDay);
      const rvB1 = (w.revenge || {}).n;
      await asafe(tag + '.choice', () => SQ.Actions.resolveChoice(ref, key1));
      if (ev.tactical) noteTactical(pc1, key1, rvB1, ref.worlds[ref.profile.worldId]);
    }
  }
  /* 1.5 域主现世即回该区应战（opts.bossFirst · achv_yuzhu/achv_shizhu 的唯一正当路径）：
   * ws.zoneBoss 只有一个槽位——放着未斩的域主去刷新区，新区首通会**覆盖**旧槽（combat.js:178），
   * 旧域主永不再生 ⇒ 十区十主必须逐区「首通 → 斩主 → 再推进」，本段即把这条动作补进剧本。
   * 战力不足（纯读 challengePower vs need×BOSS_MULT）时留守该区挂机攒战力，不空掷吃 10min CD。 */
  let bossHold = false;
  if (opts.bossFirst && w.realm >= 1 && w.zoneBoss && w.zoneBoss.state === 'ready' &&
    (w.bossKills || []).indexOf(w.zoneBoss.zone) < 0) {
    const bz = w.zoneBoss.zone;
    if (w.zone !== bz) await asafe(tag + '.zone4boss', () => SQ.Actions.setZone(ref, bz));
    const wB = ref.worlds[ref.profile.worldId];
    const modsB = SQ.Mods.collect(ref.profile, wB, pack, D);
    const needB = D.ZONES[bz].need * (D.BOSS_MULT != null ? D.BOSS_MULT : 1.8);
    bossStats.ready++;
    if (SQ.Combat.challengePower(wB, pack, D, modsB) >= needB) {
      const br = await asafe(tag + '.bossFight', () => SQ.Actions.challengeBoss(ref));
      if (br && br.ok) {
        bossStats.attempt++;
        if (br.win) { bossStats.win++; bossStats.kills = Math.max(bossStats.kills, (ref.worlds[ref.profile.worldId].bossKills || []).length); }
        else bossStats.lose++;
      } else if (br) bossStats.block[br.reason || 'null'] = (bossStats.block[br.reason || 'null'] || 0) + 1;
    } else bossStats.weak++;
    bossHold = true;
  }
  /* 2. 状态与秘境（化神后保持历练刷材料；低境界闭关冲修为） */
  const zTarget = Math.min(w.realm, D.ZONES.length - 1);
  const wChk = ref.worlds[ref.profile.worldId];
  const sourcing = opts.fullSystems && (wChk.alchemy || {}).recipes && wChk.realm >= 1 &&
    (wChk.alchemy.recipes || []).some(rid => {
      const r0 = SQ.Alchemy.recipeById(D, rid);
      return r0 && wChk.realm >= r0.realm && r0.mats.some(mm => ((wChk.materials || {})[mm[0]] || 0) < mm[1]);   /* undefined<n 恒 false 陷阱——必须 ||0 */
    });
  if (!sourcing && !bossHold && w.realm >= 1 && w.zone !== zTarget) await asafe(tag + '.zone', () => SQ.Actions.setZone(ref, zTarget));
  if (opts.alwaysVenture && !bossHold && w.mode !== 'venture' && w.realm >= 1) await asafe(tag + '.mode', () => SQ.Actions.setMode(ref, 'venture'));
  /* 2.5 域主巡区首通（真实玩家扫图行为：从最低未首通可进区打起）+ 法宝祭出择优
   * opts.bossFirst 路线改走 1.5 的「逐区斩主」通道，本段的扫图换位与空掷 challengeBoss 让位
   * （未斩域主时还去 setZone 新区 = 旧域主槽位被新区首通覆盖，十主成就从此不可达）。 */
  if (!opts.bossFirst || w.realm >= 1) {
    const wB = ref.worlds[ref.profile.worldId];
    const uncl = D.ZONES.findIndex((z, zi) => (wB.cleared || []).indexOf(zi) < 0 && wB.realm >= z.unlock);
    if (uncl >= 0 && wB.zone !== uncl && !(wB.zoneBoss && wB.zoneBoss.state === 'fighting') &&
      (!opts.bossFirst || !bossHold)) {
      await asafe(tag + '.zone4boss', () => SQ.Actions.setZone(ref, uncl));
    }
    if (!opts.bossFirst) await asafe(tag + '.boss', () => SQ.Actions.challengeBoss(ref));
    const wT = ref.worlds[ref.profile.worldId];
    const owned = (wT.treasures || {}).owned || [];
    const slots = (wT.treasures || {}).slots || [];
    if (owned.length && slots.filter(Boolean).length < owned.length && slots.filter(Boolean).length < 6) {
      const un = owned.find(e => slots.indexOf(e.id) < 0);
      if (un) await asafe(tag + '.equip', () => SQ.Actions.equipTreasure(ref, un.id));
    }
  }
  /* 3. 功法：槽位填满 + 主修升级（灵石富余时） */
  if (w.stones > 2000) {
    const known = (w.artsKnown || []).filter(id => (w.artsLevels || {})[id] != null);
    for (const id of known) {
      if ((w.artsSlots || []).indexOf(id) < 0 && (w.artsSlots || []).length < 3) {
        await asafe(tag + '.slot', () => SQ.Actions.slotArt(ref, id, null));
        break;
      }
    }
    for (const slotId of (w.artsSlots || [])) {
      if ((w.artsLevels || {})[slotId] < 9) { await asafe(tag + '.art', () => SQ.Actions.upgradeArt(ref, slotId)); break; }
    }
  }
  /* 4. 坊市（4h 自动补货由 claim 内 restockIfDue 触发，看货架直接买；手动刷新 = 灵石富余时 20% 心急玩家）
   * ⚠️ 字段名陷阱：引擎是 shop.items / nextRestock——此前误读 goods/nextRefresh，
   * undefined != null 恒 false 让整段坊市空转（图纸恒 0 / 丹方只有开局授予的 rc_juqi） */
  if (w.shop && w.stones > 2000 && Math.random() < 0.2) {
    await asafe(tag + '.shop', () => SQ.Actions.refreshShop(ref, false));
  }
  {
    const goods = ((ref.worlds[ref.profile.worldId].shop) || {}).items || [];
    for (let gi = 0; gi < goods.length; gi++) {
      const gd = goods[gi];
      if (!gd || gd.sold) continue;
      /* 生产资料必买（丹方/图纸/丹炉/材料包 = pack 子货，类型在 gd.pack.type；灵石包无 .pack 字段）；其余 50% 取舍 */
      const isProd = gd.pack != null;
      if (isProd || Math.random() < 0.5) {
        await asafe(tag + '.buy', () => SQ.Actions.buy(ref, gi, false));
        if (!isProd) break;
      }
    }
  }
  if (!opts.fullSystems) return;
  /* ══ 以下全系统路线专属 ══ */
  const w2 = ref.worlds[ref.profile.worldId];
  /* 5. 天道问天（V1.5 本地模拟通道 · ASK_CD_MS 冷却） */
  if (w2.tiandao && Date.now() - (w2.tiandao.lastAskAt || 0) >= D.TIANDAO.ASK_CD_MS && w2.stones > 3000) {
    const hex = randPick(D.TIANDAO.HEXAGRAMS);
    const askRes = await asafe(tag + '.ask', () => SQ.Actions.tdAsk(ref, hex, Math.floor(Math.random() * 4), ''));
    if (askRes && askRes.ok !== false && askRes.memo !== false) {
      const wNow = ref.worlds[ref.profile.worldId];
      const dec = SQ.Tiandao.localDecree(wNow, pack, D, Date.now());
      if (dec) {
        if (Math.random() < 0.8) await asafe(tag + '.accept', () => SQ.Actions.tdAccept(ref, dec));
        else await asafe(tag + '.defy', () => SQ.Actions.tdDefy(ref, dec));
      }
    }
    /* 天象浮层（红点即开即消） */
    await asafe(tag + '.omens', () => SQ.Actions.tdOmensSeen(ref));
  }
  /* 6. 逆天大劫（defy ≥100 且 50% 意愿）*/
  const w3 = ref.worlds[ref.profile.worldId];
  if (w3.tiandao && w3.tiandao.defy >= 100 && !w3.tiandao.title && Math.random() < 0.02) {
    await asafe(tag + '.nijie', () => SQ.Actions.tryNijie(ref));
  }
  /* 6.5 逆天大劫连战（opts.nijieAlways · achv_fanpan「叛天者」= title 且 nijieFails≥1 的唯一正当路径）：
   * 步 6 的 `!title` 门槛让「渡过一次之后」再也没人试过——而失败清 defy、成功留 title，
   * 真正的玩家是「我命由我不由天」还要再赌一次；胜后靠继续抗旨重新攒满 100 逆天值。
   * 同时补两件事：① 缘尽赎回（redeemBond，遗泽 30 → achv_juefeng/achv_kuashi）
   *                ② 遗泽商店补 unlock 档（nemesis 宿敌 / bond 跨世之缘 / prodigySlot / alchemy / sect）。 */
  const w3b = ref.worlds[ref.profile.worldId];
  if (opts.nijieAlways && w3b.tiandao && w3b.tiandao.defy >= 100) {
    const nr = await asafe(tag + '.nijie2', () => SQ.Actions.tryNijie(ref));
    if (nr && nr.ok) { nijieStats.try++; if (nr.success) nijieStats.win++; else nijieStats.fail++; }
    else if (nr) nijieStats.block[nr.reason || 'null'] = (nijieStats.block[nr.reason || 'null'] || 0) + 1;
  }
  if (opts.redeem) {
    const wR = ref.worlds[ref.profile.worldId];
    const jf = (wR.juefengIds || []).find(id => ((wR.bonds || {})[id] || 0) === SQ.Bonds.LOCK);
    if (jf && (ref.meta.karma || 0) >= (D.BOND_REDEEM_COST != null ? D.BOND_REDEEM_COST : 30)) {
      const rr = await asafe(tag + '.redeem', () => SQ.Actions.redeemBond(ref, jf));
      if (rr && rr.ok) bondStats.redeem++;
      else if (rr) bondStats.redeemBlock[rr.reason || 'null'] = (bondStats.redeemBlock[rr.reason || 'null'] || 0) + 1;
    }
  }
  if (opts.legacyUnlocks) {
    const up = D.LEGACY.UNLOCK_PRICES || {};
    for (const uk of Object.keys(up)) {
      /* ⚠️ 余额必须每档重读：一次买断就扣一次遗泽，用循环前的快照会把后面几档全「以为买得起」 */
      if (!((ref.meta.karma || 0) >= up[uk]) || (ref.meta.unlocks || {})[uk]) continue;
      const lb = await asafe(tag + '.lgbuy.' + uk, () => SQ.Actions.legacyBuy(ref, 'unlock.' + uk));
      if (lb && lb.ok) legacyStats.unlocks.push(uk);
      else if (lb) legacyStats.block[uk + ':' + (lb.reason || 'null')] =
        (legacyStats.block[uk + ':' + (lb.reason || 'null')] || 0) + 1;
    }
    /* 跳档开局（轮回赠礼·shop.startRealm*）：买得起就买，多世路线靠它把下世起点抬回金丹/元婴 */
    (D.LEGACY.START_REALM_PRICES || []).forEach((p, i) => {
      const key = 'shop.startRealm' + (i + 1);
      if ((ref.meta.karma || 0) >= p && ref.meta.spent[key] == null) asafe(tag + '.lgbuy.' + key,
        () => SQ.Actions.legacyBuy(ref, 'startRealm' + (i + 1)));
    });
  }
  /* 7. 炼丹炼器（材料采购模式：缺低区材料时回对应区采集——高境界玩家真实行为）
   * ⚠️ w4 必须在步 2/6 的 mutate 之后重取——replaceRef 后旧引用 zone/materials 全部过期 */
  const w4 = ref.worlds[ref.profile.worldId];
  if (w4.realm >= 1) {
    const al4 = w4.alchemy || {};
    const zTop = Math.min(w4.realm, D.ZONES.length - 1);
    let needZ = -1;
    for (const rid of (al4.recipes || [])) {
      const r = SQ.Alchemy.recipeById(D, rid);
      if (!r || w4.realm < r.realm) continue;
      for (const mm of r.mats) {
        if (((w4.materials || {})[mm[0]] || 0) < mm[1]) {
          const mdef = D.ALCHEMY.MATS.find(x => x.id === mm[0]);
          if (mdef && mdef.z >= 0 && D.ZONES[mdef.z] && w4.realm >= D.ZONES[mdef.z].unlock) { needZ = mdef.z; break; }
        }
      }
      if (needZ >= 0) break;
    }
    /* 采集已改自动轴（claim 内 gatherTick）：切到所需材料区 + 保持历练模式，材料随 claim 自动入账
     * opts.bossFirst 路线让位（未斩域主期间不离区，否则旧域主槽被覆盖，见 1.5 段注） */
    if (needZ >= 0 && w4.zone !== needZ && !bossHold) {
      await asafe(tag + '.zone4mat', () => SQ.Actions.setZone(ref, needZ));
    }
    if (needZ < 0 && w4.zone !== zTop && !bossHold) await asafe(tag + '.zoneback', () => SQ.Actions.setZone(ref, zTop));
    const al = w4.alchemy || {};
    if (!al.craft) {
      /* 有丹方有材料就开炉；否则攒图纸炼器 */
      const rec = (al.recipes || []).find(rid => {
        const r = SQ.Alchemy.recipeById(D, rid);
        return r && w4.realm >= r.realm && r.mats.every(mm => ((w4.materials || {})[mm[0]] || 0) >= mm[1]);
      });
      if (rec && SQ.Alchemy.hasFurnace(w4, pack, D, ref.meta)) {
        const cr = await asafe(tag + '.craft', () => SQ.Actions.alStart(ref, 'dan', rec, {}));
        if (cr && cr.ok) craftStats.danOk++;
        else if (cr) { craftFails[cr.reason || 'null'] = (craftFails[cr.reason || 'null'] || 0) + 1; craftStats.danFail[cr.reason || 'null'] = (craftStats.danFail[cr.reason || 'null'] || 0) + 1; }
      } else {
        if (!rec) {
          const fur = SQ.Alchemy.hasFurnace(w4, pack, D, ref.meta);
          const noRecKey = fur ? 'norecipe' : (ref.meta.unlocks.alchemy ? 'nofurnaceFlag' : 'nofurnace');
          craftFails[noRecKey] = (craftFails[noRecKey] || 0) + 1;
        }
        const bp = (al.blueprints || []).find(bid => {
          const b = SQ.Alchemy.bpById(D, bid);
          return b && !b.furnace;
        });
        if (!bp) craftStats.qiSkip.nobp = (craftStats.qiSkip.nobp || 0) + 1;
        else if (!SQ.Alchemy.hasFurnace(w4, pack, D, ref.meta)) craftStats.qiSkip.nofurnace = (craftStats.qiSkip.nofurnace || 0) + 1;
        else {
          const bpd = SQ.Alchemy.bpById(D, bp);
          const dirs = (D.ALCHEMY.FORGE_DIRS || {})[bpd.slot] || [];
          const zc = Math.min(w4.realm, D.ZONES.length - 1);
          const tierC = SQ.Alchemy.bpTierOf(w4, D, zc, bpd);   /* 扩容批：精制图纸 +1 同引擎口径（此前 forgeTierOf 少算一档 → attr:417 拒） */
          const dirOk = dirs.find(dd => tierC >= (dd.minTier || 0));
          if (!dirOk) craftStats.qiSkip['nodir(t' + tierC + ',' + bpd.slot + ')'] = (craftStats.qiSkip['nodir(t' + tierC + ',' + bpd.slot + ')'] || 0) + 1;
          else {
            const fr = await asafe(tag + '.forge', () => SQ.Actions.alStart(ref, 'qi', bp, { dir: dirOk.dir, attr: tierC >= 3 ? randPick(['jing', 'qi', 'shen']) : null }));
            if (fr && fr.ok) craftStats.qiOk++;
            else if (fr) craftStats.qiFail[fr.reason || 'null'] = (craftStats.qiFail[fr.reason || 'null'] || 0) + 1;
          }
        }
      }
    } else if (Date.now() >= al.craft.doneAt) {
      await asafe(tag + '.collect', () => SQ.Actions.alCollect(ref));
    }
    /* 服丹（库存有就吃，日限自控） */
    const pillKey = Object.keys((ref.worlds[ref.profile.worldId].alchemy || {}).pills || {})[0];
    if (pillKey && Math.random() < 0.3) {
      const drr = await asafe(tag + '.drink', () => SQ.Actions.alDrink(ref, pillKey));
      if (drr && drr.ok) craftStats.alDrink++;
    }
    /* 卖多余材料（只卖库存 >30 的富余部分——避免吃掉丹方用料，真实玩家取舍） */
    if (Math.random() < 0.02) {
      const wS = ref.worlds[ref.profile.worldId];
      const rich = Object.keys(wS.materials || {}).filter(mid => (wS.materials[mid] || 0) > 30);
      if (rich.length) await asafe(tag + '.sell', () => SQ.Actions.alSell(ref, randPick(rich), 5));
      /* 提炼（扩容批 §十二.4）：富余 ≥8 的低组材料提炼——材料账 out4/in1 双路恒等式随走校验 */
      const richR = Object.keys(wS.materials || {}).filter(mid => (wS.materials[mid] || 0) > 8 && SQ.Alchemy.groupOf(D, mid) < 3);
      if (richR.length) {
        const rr = await asafe(tag + '.refine', () => SQ.Actions.alRefine(ref, randPick(richR)));
        if (rr && rr.ok) craftStats.refineOk++;
      }
    }
  }
  /* 8. 天骄切磋（切磋平衡批：解锁 gate 过滤 + 三档赌注轮换 + 让差/材料统计） */
  const w5 = ref.worlds[ref.profile.worldId];
  if ((w5.prodigies || []).length && w5.realm >= SQ.Prodigy.unlockRealm(D) && Math.random() < 0.03) {
    const cand = w5.prodigies.filter(p => !p.feud && Date.now() - (p.lastSparAt || 0) >= (D.PRODIGY.SPAR_CD_MS || 600000));
    if (cand.length) {
      const kd5 = ['light', 'std', 'heavy'][Math.floor(Math.random() * 3)];
      const sr = await asafe(tag + '.spar', () => SQ.Actions.prodigySpar(ref, randPick(cand).id, kd5));
      if (sr && sr.ok) {
        sparStats.ok++; sparStats[sr.result]++; sparStats['k_' + kd5]++;
        if (sr.crush) sparStats.crush++;
        if (sr.brave) sparStats.brave++;
        if (sr.mat) sparStats.mat++;
        if (sr.feud) sparStats.feud++;
      } else if (sr) sparStats.fail[sr.reason || 'null'] = (sparStats.fail[sr.reason || 'null'] || 0) + 1;
    }
  }
  /* 8.6 袭杀出手（第卌四批 · 数值详设 §6.1B）：这一臂只管主动下手；来者与寻仇的**结算与计数都在上面第 1 段**
   *     （那是每步唯一的 pendingChoice 消费点），超时默认迎战那条只在界面走查里演——模拟器不开弹窗故永不超时。 */
  const w5b = ref.worlds[ref.profile.worldId];
  if ((w5b.prodigies || []).length && w5b.realm >= SQ.Prodigy.unlockRealm(D) && Math.random() < 0.02) {
    const ab = await asafe(tag + '.ambush', () => SQ.Actions.prodigyAmbush(ref, randPick(w5b.prodigies).id));
    if (ab && ab.ok) {
      ambushStats.try++; ambushStats[ab.win ? 'win' : 'lose']++;
      if (ab.dead) ambushStats.kill++;
    } else if (ab) ambushStats.fail[ab.reason || 'null'] = (ambushStats.fail[ab.reason || 'null'] || 0) + 1;
  }
  /* 8.5 宿敌恩怨（opts.setFeud / opts.killFeud · achv_sudi「宿敌」/ achv_zhandi「斩宿敌」）：
   * 结仇通道 = prodigy.spar(kind='heavy') 惨败（FEUD_P_HEAVY .10）；杀仇通道 = 狭路相逢事件
   * （prodigy_ev_feud，claim 内按 rivAt 月掷自动进 pendingChoice）走 evil 分支且判定过。
   * 两者都不写 ws 字段，全是玩家点按钮。 */
  const w5f = ref.worlds[ref.profile.worldId];
  if (opts.setFeud && w5f.realm >= SQ.Prodigy.unlockRealm(D)) {
    const nf = (w5f.prodigies || []).filter(p => !p.feud && Date.now() - (p.lastSparAt || 0) >= (D.PRODIGY.SPAR_CD_MS || 600000));
    if (nf.length) {
      const fr = await asafe(tag + '.sparFeud', () => SQ.Actions.prodigySpar(ref, randPick(nf).id, 'heavy'));
      if (fr && fr.ok) { sparStats.ok++; sparStats[fr.result]++; sparStats.k_heavy++; if (fr.feud) sparStats.feud++; }
      else if (fr) sparStats.fail[fr.reason || 'null'] = (sparStats.fail[fr.reason || 'null'] || 0) + 1;
    }
  }
  if (opts.killFeud) {
    const w5k = ref.worlds[ref.profile.worldId];
    const et = eternalProdigies(w5k);
    const feud = (w5k.prodigies || []).filter(p => p.feud);
    feudStats.seen = Math.max(feudStats.seen, feud.length);
    if (et.length) feudStats.eternalLife++;
    if (feud.length) {
      feudStats.present++;
      const pcF = w5k.pendingChoice;
      if (pcF && String(pcF.id || '').indexOf('prodigy_ev_') === 0 && pcF.prodigy) {
        feudStats.eventHit++;
        const evF = SQ.Events.findById(pack, pcF.id);
        if (evF && evF.choices && evF.choices.evil) {
          const resF = await asafe(tag + '.feudKill', () => SQ.Actions.resolveChoice(ref, 'evil'));
          if (resF) feudStats.killTry++;
        }
      }
    }
  }
  /* 9. 功法融合（双 Lv9 + 悟道石 ≥1 + CD 过） */
  const w6 = ref.worlds[ref.profile.worldId];
  if ((w6.materials || {}).mat_wudao >= 1) {
    const lv9 = (w6.artsKnown || []).filter(id => {
      if ((w6.artsLevels || {})[id] < 9) return false;
      const df = SQ.Fusion.artDefOf(w6, id);
      return df && (df.obtain || {}).type !== 'event_locked';
    });
    if (lv9.length >= 2 && SQ.Fusion.canFuse(w6, pack, D, lv9[0], lv9[1], Date.now()).ok) {
      await asafe(tag + '.fuse', () => SQ.Actions.fuseStart(ref, lv9[0], lv9[1], ''));
    }
  }
  /* 9b. 混沌淬炼（融合扩容批 §4.4）：在档自创部 + 悟道石 ≥1 + CD 过 → 50% 意愿淬炼 */
  const w6b = ref.worlds[ref.profile.worldId];
  if (((w6b.fusion || {}).customs || []).length && (w6b.materials || {}).mat_wudao >= 1 &&
    ((w6b.fusion.lastReforgeAt || 0) + (D.FUSE.REFORGE_CD_MS || 86400000) <= Date.now()) && Math.random() < 0.5) {
    const rr6 = await asafe(tag + '.reforge', () => SQ.Actions.customReforge(ref, randPick(w6b.fusion.customs).id));
    if (rr6 && rr6.ok) { craftStats.reforgeTry++; if (rr6.hit) craftStats.reforgeOk++; }
    else if (rr6) craftStats.reforgeFail[rr6.reason || 'null'] = (craftStats.reforgeFail[rr6.reason || 'null'] || 0) + 1;
  }
  /* 10. 器灵技（觉醒即放——温养走真实 claim 在线通道：击杀 +0.5/杀 + 渡劫 +15 + 祭出在线 +3/h） */
  const w7 = ref.worlds[ref.profile.worldId];
  SQ.Fusion.equippedEntries(w7, pack).forEach(pr => {
    const sp = (pr.e.st || {}).spirit;
    if (sp && sp.a) safe(tag + '.spirit', () => { SQ.Actions.spiritSkill(ref, pr.e.id); });
  });
  /* 11. 遗泽商店：炼丹资格（300）优先 → 宗门资格（500） */
  if ((ref.meta.karma || 0) >= 300 && !ref.meta.unlocks.alchemy) {
    await asafe(tag + '.lgbuy.al', () => SQ.Actions.legacyBuy(ref, 'unlock.alchemy'));
  }
  if ((ref.meta.karma || 0) >= 500 && !ref.meta.unlocks.sect) {
    await asafe(tag + '.lgbuy', () => SQ.Actions.legacyBuy(ref, 'unlock.sect'));
  }
  /* 11.5 宗门前置：入门 + 捐献冲声望（rank4 阈值 1500 + 峰值 2000 的真实玩家路径） */
  const wP = ref.worlds[ref.profile.worldId];
  if (!wP.sect && (wP.factionRepPeak || 0) < 2200 && wP.realm >= 3) {
    if (!wP.factionId || wP.factionId === 'sect') {
      if (wP.factionId !== 'sect') await asafe(tag + '.joinfac', () => SQ.Actions.joinFaction(ref, randPick(D.FACTIONS_FIXED).id));
    } else {
      const donTier = wP.stones > 1100000 ? 1000000 : (wP.stones > 110000 ? 100000 : (wP.stones > 11000 ? 10000 : 0));
      if (donTier > 0) {
        const dr = await asafe(tag + '.donate', () => SQ.Actions.donateFaction(ref, donTier));
        if (dr && dr.ok) donateStats.ok += (dr.rep || 0);
        else if (dr) donateFails[dr.reason || 'null'] = (donateFails[dr.reason || 'null'] || 0) + 1;
        else donateFails.crash = (donateFails.crash || 0) + 1;
      } else { donateFails.poor = (donateFails.poor || 0) + 1; }
    }
  }
  /* 11.6 叛门（opts.defect · achv_panzong「叛宗」判定源 = ws.everDefected || ws.factionCdUntil>0，
   * 原剧本只「入会 + 捐献」从不退会/叛投，故任何路线都没入过账。献秘 takeIntel=true 同批试一次
   * （叛投敌对 = factions.defect 唯一 everDefected 写口；leaveFaction 只写 factionCdUntil）。 */
  if (opts.defect) {
    const wD = ref.worlds[ref.profile.worldId];
    if (!wD.everDefected && (wD.factionCdUntil || 0) === 0 && wD.factionId && wD.realm >= 3) {
      const sectE = (wD.factions || []).find(f => f.id === wD.factionId);
      const foe = (wD.factions || []).find(f => f.id !== wD.factionId && sectE && (sectE.rel || {})[f.id] === 'enemy');
      const dr = await asafe(tag + '.defect', () => SQ.Actions.defectFaction(ref, (foe || sectE || {}).id, wD.realm >= 6));
      if (dr && dr.ok) factionStats.defect++;
      else if (dr) factionStats.defectBlock[dr.reason || 'null'] = (factionStats.defectBlock[dr.reason || 'null'] || 0) + 1;
    }
  }
  /* 12. 宗门全链 */
  const w8 = ref.worlds[ref.profile.worldId];
  if (!w8.sect) {
    const cfChk = SQ.Sect.canFound(w8, pack, D, ref.meta);
    if (!cfChk.ok && w8.realm >= 4) foundBlockReasons[cfChk.reason] = (foundBlockReasons[cfChk.reason] || 0) + 1;
    if (cfChk.ok && w8.realm >= 6) {
      await asafe(tag + '.found', () => SQ.Actions.sectFound(ref, randPick(D.SECT.GATES), '', null, randPick(['right', 'neutral', 'evil'])));
    } else if (w8.realm >= 4 && !ref.meta.unlocks.sect) {
      /* 门槛提示期：攒声望（捐献）——真实玩家行为 */
      if (w8.factionId && w8.factionId !== 'sect' && w8.stones > 20000 && Math.random() < 0.05) {
        await asafe(tag + '.donate', () => SQ.Actions.donateFaction(ref, 1));
      }
    }
  } else if (!w8.sect.succession) {
    const sec = w8.sect;
    if (!sec.candidate && sec.disciples.length < SQ.Sect.discCap(w8, D) && Math.random() < 0.1) {
      await asafe(tag + '.recruit', () => SQ.Actions.sectRecruit(ref));
    }
    if (sec.candidate) await asafe(tag + '.accept', () => SQ.Actions.sectAccept(ref));
    sec.disciples.forEach(dsc => {
      if (!dsc.offering && dsc.inv < 2 && w8.stones > 100000 && Math.random() < 0.1) {
        safe(tag + '.invest', () => { SQ.Actions.sectInvest(ref, dsc.id, dsc.inv + 1); });
      }
    });
    if (w8.stones > (D.SECT.FAC_COST || [])[Math.min(sec.fac.yanwu || 0, 4)] && Math.random() < 0.05) {
      await asafe(tag + '.build', () => SQ.Actions.sectBuild(ref, randPick(D.SECT.FAC_IDS)));
    }
    if (Math.random() < 0.02 && sec.disciples.length) {
      await asafe(tag + '.dispatch', () => SQ.Actions.sectDispatch(ref, sec.disciples[0].id));
    }
    if (Math.random() < 0.01 && !w8.factionWar) {
      const sectE = (w8.factions || []).find(f => f.id === 'sect');
      const enemy = (w8.factions || []).find(f => f.id !== 'sect' && sectE && (sectE.rel || {})[f.id] === 'enemy');
      if (enemy) await asafe(tag + '.sectwar', () => SQ.Actions.sectWar(ref, enemy.id));
    }
  }
  /* 13. 战争应战（势力战开启即入场） */
  const w9 = ref.worlds[ref.profile.worldId];
  if (w9.factionWar && !w9.factionWar.joined && SQ.Factions.warSideOf(w9)) {
    await asafe(tag + '.joinwar', () => SQ.Actions.joinWar(ref));
  }
  /* 14. 洞府设施（灵石富余） */
  if (w9.stones > 50000 && Math.random() < 0.03) {
    const cv = SQ.Cave.current(w9, pack);
    const fac = randPick(D.CAVE_FACILITIES);
    await asafe(tag + '.cavefac', () => SQ.Actions.buildFacility(ref, cv.id, fac.id));
  }
  /* 14.5 择地迁居（opts.caveSeek · achv_fudi「福地」判定 = SQ.Cave.current 非初始洞府 且 护法加项 >0）：
   * 原剧本只在**已驻留**的洞府上盖设施（步 14），从不 enterCave 迁居 → 判定恒不成立。
   * canEnter 是纯读口，逐条过筛后取 mult 最高者可入驻 → Actions.enterCave（灵石一次付清 + 迁居冷却）。 */
  const wC = ref.worlds[ref.profile.worldId];
  if (opts.caveSeek && wC.realm >= 1 && stepTick % 4 === 0) {
    const cur = SQ.Cave.current(wC, pack);
    if (cur.id === D.CAVE_INITIAL) caveStats.atInitial++;
    /* 只往「mult 更高且资格全过」的福地搬（同 mult 互搬属无意义抖动，玩家不会这么点） */
    const cands = (D.CAVES || [])
      .map(c => ({ c: c, chk: SQ.Cave.canEnter(wC, pack, D, c.id, Date.now()) }))
      .filter(x => x.chk.ok && (x.c.mult || 1) > (cur.mult || 1))
      .sort((a, b) => (b.c.mult || 1) - (a.c.mult || 1));
    if (cands.length) {
      const er = await asafe(tag + '.enterCave', () => SQ.Actions.enterCave(ref, cands[0].c.id));
      if (er && er.ok) caveStats.entered[(er.cave || cands[0].c).id] = 1;
      else if (er) caveStats.lack['act:' + (er.reason || 'null')] = (caveStats.lack['act:' + (er.reason || 'null')] || 0) + 1;
    } else if (opts.debugLack && Math.random() < 0.01) {
      /* 缺项归因（只对 debugLack 路线、抽样跑，别只留一句「没进去」）：
       * realm/zone/stones/cooldown/same/obtain 六类 lack 按 「种类:福地」 计数 */
      (D.CAVES || []).forEach(cc => {
        const ck = SQ.Cave.canEnter(wC, pack, D, cc.id, Date.now());
        if (ck.ok) return;
        (ck.lack || []).forEach(lk => {
          if (lk.kind === 'same') return;
          const key = lk.kind + ':' + cc.id;
          caveStats.lack[key] = (caveStats.lack[key] || 0) + 1;
        });
      });
    }
  }
  /* 16. 结缘线（opts.bonds = [{npc, goal, spouse}] · 拜访论道 / 赠丹 / 提亲 / 择护法 / 断缘观察）
   * 三个玩家入口全是 SQ.Actions.*：visitBond（渠道 A，1h CD）、giftBond（渠道 B，自有丹药，
   * 日限锚 gameDayOf = 1 游戏日 1 现实秒 → 每步都算新一天，真节流是丹产不是日限）、
   * proposeSpouse（须满档 BOND_MAX 才可提亲，形态按结缘瞬间 karma 档位）、setGuardian。
   * 绝交锁**不是玩家按钮**：由奇遇 evil 分支的 bondLock 效果代签（events.js:404，双门槛
   * karma≤−400 且该道友好感≥30）——本段只观察计数，赎回走步 6.5 的 opts.redeem。 */
  if (opts.bonds && ref.worlds[ref.profile.worldId].realm >= 1) {
    const nowB = Date.now();
    for (const bt of opts.bonds) {
      const wB2 = ref.worlds[ref.profile.worldId];
      const aff = (wB2.bonds || {})[bt.npc] || 0;
      if (aff > bondStats.maxAff) bondStats.maxAff = aff;
      if (aff === SQ.Bonds.LOCK) continue;                      /* 缘尽：由 opts.redeem 通道处理 */
      const goal = bt.goal != null ? bt.goal : (D.BOND_MAX || 100);
      if (aff < goal) {
        /* 两条主动渠道并列点满（真玩家就是这么刷好感）：渠道 B 赠丹**无 CD 也无日限**（GitHub issue #4
         * 撤销原 3 次日限；1 游戏日 = 1 现实秒 ⇒ 那种计数永不生效），真节流是丹产；
         * 渠道 A 拜访按 CD 纯读放行 */
        let acted = false;
        const alB = (wB2.alchemy || {}).pills || {};
        const pk = Object.keys(alB).find(k => alB[k] > 0 && !/^ap_(pozhang|zhenjie)$/.test(k));
        if (pk) {
          const gr = await asafe(tag + '.gift', () => SQ.Actions.giftBond(ref, bt.npc, pk));
          if (gr && gr.ok) { bondStats.gift++; acted = true; }
          else if (gr) bondStats.giftBlock[gr.reason || 'null'] = (bondStats.giftBlock[gr.reason || 'null'] || 0) + 1;
        }
        const wB3 = ref.worlds[ref.profile.worldId];
        if (!acted || !pk) {
          if (nowB - (wB3.bondVisitAt || 0) >= (D.BOND_VISIT_CD_MS != null ? D.BOND_VISIT_CD_MS : 300000)) {
            const vr = await asafe(tag + '.visit', () => SQ.Actions.visitBond(ref, bt.npc));
            if (vr && vr.ok) bondStats.visit++;
            else if (vr) bondStats.visitBlock[vr.reason || 'null'] = (bondStats.visitBlock[vr.reason || 'null'] || 0) + 1;
          } else if (!pk) bondStats.visitBlock.wait = (bondStats.visitBlock.wait || 0) + 1;
        }
        continue;
      }
      /* 满档 → 提亲（spouse 名录成员；非 spouse 类目直接跳过，不空掷） */
      if (bt.spouse && !wB2.spouse) {
        const chkP = SQ.Bonds.canPropose(wB2, pack, D, bt.npc, nowB);
        if (chkP.ok) {
          const pr = await asafe(tag + '.propose', () => SQ.Actions.proposeSpouse(ref, bt.npc));
          if (pr && pr.ok) bondStats.propose++;
          else if (pr) bondStats.proposeBlock[pr.reason || 'null'] = (bondStats.proposeBlock[pr.reason || 'null'] || 0) + 1;
        } else bondStats.proposeBlock['pre:' + (chkP.reason || 'null')] =
          (bondStats.proposeBlock['pre:' + (chkP.reason || 'null')] || 0) + 1;
      }
    }
    /* 择护法（护道人档 ≥3 才有加项；福地成就 achv_fudi = 迁居福地 ∧ 护法加项>0 双条件） */
    const wG = ref.worlds[ref.profile.worldId];
    if (!wG.guardianPick) {
      const gG = SQ.Bonds.guardianOf(wG, pack, D);
      if (gG && gG.tier >= 2) {
        await asafe(tag + '.guardian', () => SQ.Actions.setGuardian(ref, gG.npcId));
        bondStats.guardian++;
      }
    }
    bondStats.locked = Math.max(bondStats.locked,
      Object.keys(wG.bonds || {}).filter(id => (wG.bonds || {})[id] === SQ.Bonds.LOCK).length);
  }
  /* 17. 满收集（opts.collect · 只走正当获取渠道：坊市/黑市/神秘商人特席/探宝残片兑换）
   * 逐格买断 → 货架刷新（阶梯费 20~400，池枯竭回落装备格属正常）→ 各区残片到期即兑。
   * ⚠️ 先天法宝 x10/x11 全库唯一获取通道 = z9 残片兑换（combat.js:397-408 未持有先天随机 1 件），
   *    而 SHARD_P 0.02/杀、KILL_BASE_SEC 60s/杀、离线不进场 ⇒ 残片只在**在线 30s 步**里攒，
   *    每模拟日 ≤24 杀 ⇒ 20 片/次兑换约需 40~55 个历练日。故本段先收齐其余 44 件、
   *    等未持有先天只剩 x10/x11 时才兑（期望兑换数从 ~9.5 次降到 2 次），这是玩家真会做的取舍。 */
  if (opts.collect && stepTick % 2 === 0) {
    const xt = pack.treasures;
    /* 只买「收集向」货格：法宝/功法/丹方图纸材料包（pack 子货）；装备不追（会挤库存且零收集价值）。
     * ⚠️ 每格买完都要重取 ws —— SQ.mutate 走 replaceRef，旧引用的 sold 标记全是过期账。 */
    const shelfBuy = async (black) => {
      /* 格数随机（10~16）⇒ 循环上界改读**当轮实际长度**，不再按常量猜 */
      const shelfLen = (((black ? (ref.worlds[ref.profile.worldId].shop || {}).blackItems : (ref.worlds[ref.profile.worldId].shop || {}).items)) || []).length;
      for (let gi = 0; gi < shelfLen; gi++) {
        const wX = ref.worlds[ref.profile.worldId];
        const gd = ((black ? (wX.shop || {}).blackItems : (wX.shop || {}).items) || [])[gi];
        if (!gd || gd.sold) continue;
        const want = gd.kind === 'treasure' || gd.kind === 'arts' || gd.pack != null;
        if (!want || wX.stones < gd.price) continue;
        const br = await asafe(tag + '.buyAll', () => SQ.Actions.buy(ref, gi, !!black));
        if (br && br.ok) {
          if (br.item && br.item.kind === 'treasure') endgameStats.treBuy++;
          if (br.item && br.item.kind === 'arts') endgameStats.artBuy++;
        } else if (br) endgameStats.shopFail[br.reason || 'null'] = (endgameStats.shopFail[br.reason || 'null'] || 0) + 1;
      }
    };
    await shelfBuy(false);
    if (SQ.Shop.blackOpen(ref.worlds[ref.profile.worldId], pack, D)) await shelfBuy(true);
    const wX4 = ref.worlds[ref.profile.worldId];
    const merchItems = ((wX4.shop || {}).merchant || {}).items || [];
    if (SQ.Shop.merchantActive(wX4, Date.now())) {
      for (let mi = 0; mi < merchItems.length; mi++) {
        const mr = await asafe(tag + '.buyMerchant', () => SQ.Actions.buyMerchant(ref, mi));
        if (mr && mr.ok) endgameStats.merchantBuy++;
      }
    }
    /* 手动刷新（灵石富余 + 仍在收集缺口期）：坊市/黑市各自重掷货架 */
    const wX5 = ref.worlds[ref.profile.worldId];
    const ownedIds0 = ((wX5.treasures || {}).owned || []).map(e => e.id);
    const missTre = (xt.LIST || []).filter(d => ownedIds0.indexOf(d.id) < 0);
    if (missTre.length && wX5.stones > 300000 && Math.random() < 0.35) {
      await asafe(tag + '.refreshN', () => SQ.Actions.refreshShop(ref, false));
      if (SQ.Shop.blackOpen(ref.worlds[ref.profile.worldId], pack, D)) {
        await asafe(tag + '.refreshB', () => SQ.Actions.refreshShop(ref, true));
      }
    }
    /* 残片兑换：各区到期即兑。z9 只在「其它渠道（首通/坊市/黑市/特席）的先天已收齐」时才开兑
     * ——兑换是从**未持有先天**里等权随机 1 件，早兑 = 把片子花在本可白拿的件上（见上注）。 */
    const otherCh = {};
    (xt.SHOP_IDS || []).forEach(id => { otherCh[id] = 1; });
    (xt.BLACK_IDS || []).forEach(id => { otherCh[id] = 1; });
    (xt.MERCHANT_IDS || []).forEach(id => { otherCh[id] = 1; });
    Object.keys((xt.ZONE_TREASURE || {}) || {}).forEach(k => { otherCh[xt.ZONE_TREASURE[k]] = 1; });
    for (let zi = 0; zi < D.ZONES.length; zi++) {
      const wZ = ref.worlds[ref.profile.worldId];
      const have = Math.floor((wZ.shards || [])[zi] || 0);
      if (have < (D.SHARD_NEED != null ? D.SHARD_NEED : 20)) continue;
      if (zi === 9) {
        const own = ((wZ.treasures || {}).owned || []).map(e => e.id);
        const xnOther = (xt.LIST || []).filter(d => d.kind === 'xian' && otherCh[d.id] && own.indexOf(d.id) < 0);
        endgameStats.shardHold = Math.max(endgameStats.shardHold || 0, xnOther.length);
        if (xnOther.length > 0) continue;
      }
      const ch = zi >= 6 && zi <= 8 ? (wZ.stones > 200000 ? 'recipe' : 'intel') : null;
      const xr = await asafe(tag + '.shard', () => SQ.Actions.exchangeShard(ref, zi, ch));
      if (xr && xr.ok) {
        endgameStats.shard++;
        if (xr.reward && xr.reward.type === 'treasure') endgameStats.treBuy++;
      } else if (xr) endgameStats.shardBlock[xr.reason || 'null'] = (endgameStats.shardBlock[xr.reason || 'null'] || 0) + 1;
    }
    const wZ9 = ref.worlds[ref.profile.worldId];
    endgameStats.treOwned = ((wZ9.treasures || {}).owned || []).length;
    endgameStats.z9shards = Math.floor((wZ9.shards || [])[9] || 0);
  }
  /* 18. 万法满级（opts.maxArts · achv_yifa/achv_wanfa = 图鉴 artMax 面 ≥1/≥10）：
   * 三条正当通道并进——① 补架：市面渠道（坊市/黑市/情报豁免）达标未持有的功法买进来；
   * ② 槽位轮作：六槽只留未满级的（精通 tickPractice 只对槽内功法生效）；
   * ③ 手动升级：Actions.upgradeArt 耗修为，每步限量（真玩家点到手酸也就这样）。
   * 🔧 第廿五批（2026-10-13）：破境**不再清** artsLevels（realm.js 原 :50 那句已删）⇒ 等级全程累积，
   * 满级窗口不再被「渡劫归零」压到真仙之后；本件 maxArtsRealm 档位与万法成就的达成时点随之提前。 */
  if (opts.maxArts && ref.worlds[ref.profile.worldId].realm >= (opts.maxArtsRealm != null ? opts.maxArtsRealm : 1)) {
    const MAXLV = D.ARTS_MAX_LV || 9;
    const tierW = { huang: 0, xuan: 1, di: 2, tian: 3 };
    const artsMap = pack.artsMap();
    /* ① 补架（纯读判渠道，买入口 = Actions.buy 的 arts 货格；这里直接判「可购未持」后靠刷新/购买命中，
     *    另有一条正当直读口：SQ.Arts.gainArt 是引擎内部写口，玩家无入口 ⇒ 不走） */
    const wM = ref.worlds[ref.profile.worldId];
    const buyable = Object.keys(artsMap).filter(id => {
      const a = artsMap[id];
      if (SQ.Arts.owned(wM, id)) return false;
      const ch = a.obtain && (a.obtain.type === 'shop' || a.obtain.type === 'black');
      return ch && a.obtain.price;
    });
    if (buyable.length && wM.stones > 60000 && Math.random() < 0.3) {
      await asafe(tag + '.refreshArt', () => SQ.Actions.refreshShop(ref, false));
    }
    /* ② 槽位轮作 */
    const wS2 = ref.worlds[ref.profile.worldId];
    const slots = (wS2.artsSlots || []).slice();
    if (slots.length && slots.every(id => (wS2.artsLevels[id] || 0) >= MAXLV) &&
      (wS2.artsKnown || []).some(id => (wS2.artsLevels[id] || 0) < MAXLV)) {
      await asafe(tag + '.unslot', () => SQ.Actions.unslotArt(ref, slots[slots.length - 1]));
    }
    const wS3 = ref.worlds[ref.profile.worldId];
    if ((wS3.artsSlots || []).length < (D.ARTS_SLOTS || 6)) {
      const cand = (wS3.artsKnown || []).filter(id => (wS3.artsLevels[id] || 0) < MAXLV &&
        (wS3.artsSlots || []).indexOf(id) < 0).sort((a, b) =>
        ((tierW[(artsMap[a] || {}).tier] != null ? tierW[(artsMap[a] || {}).tier] : 9) -
         (tierW[(artsMap[b] || {}).tier] != null ? tierW[(artsMap[b] || {}).tier] : 9)))[0];
      if (cand) await asafe(tag + '.slot2', () => SQ.Actions.slotArt(ref, cand, null));
    }
    /* ③ 手动升级（限量 8 次/步，先喂低阶便宜的，尽快凑满 10 部满级） */
    const wU = ref.worlds[ref.profile.worldId];
    const modsU = SQ.Mods.collect(ref.profile, wU, pack, D);
    const order = (wU.artsKnown || []).slice().sort((a, b) =>
      ((tierW[(artsMap[a] || {}).tier] != null ? tierW[(artsMap[a] || {}).tier] : 9) -
       (tierW[(artsMap[b] || {}).tier] != null ? tierW[(artsMap[b] || {}).tier] : 9)));
    let budget = 8;
    for (const id of order) {
      if (budget <= 0) break;
      let lv = wU.artsLevels[id] || 0;
      while (lv < MAXLV && budget > 0) {
        const wU2 = ref.worlds[ref.profile.worldId];
        const cost = SQ.Arts.upgradeCost(wU2, pack, D, id, modsU);
        if (cost == null || wU2.qi < cost) break;
        await asafe(tag + '.artUp', () => SQ.Actions.upgradeArt(ref, id));
        budget--;
        lv = (ref.worlds[ref.profile.worldId].artsLevels || {})[id] || 0;
        endgameStats.artUp++;
      }
    }
    const wU3 = ref.worlds[ref.profile.worldId];
    endgameStats.artMax = Math.max(endgameStats.artMax,
      Object.keys(wU3.artsLevels || {}).filter(k => (wU3.artsLevels[k] || 0) >= MAXLV).length);
  }
  /* 15. 转世双通道（真仙盈满飞升；holdAscendDay 前拖延——模拟玩家恋栈宗门/融合终局内容。
   * opts.rebirth='dissolve' = 本世是「累世剧本」的非终局世：同一时点改走兵解（Legacy.doBingjie
   * 化神起即时成事、零掷判、折分 ×0.7）——多世数/劫数/宿敌线的正当攒法，也是 achv_bingjie 判定源；
   * 终局世由 playRoute 把 opts.rebirth 改回 'ascend'，保证通过判据「至少一次飞升」不弱化。） */
  const wA = ref.worlds[ref.profile.worldId];
  const hold = opts.noAscend === true || (opts.holdAscendDay != null && simDay < opts.holdAscendDay &&
    !(((wA.sect || {}).name) && ((wA.fusion || {}).customs || []).length >= 1));
  const fsChk = SQ.Legacy.canFeisheng(wA, pack, D, ref.meta, Date.now(), ref.profile);
  if (!hold && wA.realm >= D.REALMS.length - 1 && fsChk.ok) {
    const wPre = ref.worlds[ref.profile.worldId];
    const life1 = {
      sect: !!(wPre.sect && wPre.sect.name), sectName: (wPre.sect || {}).name || '',
      customs: ((wPre.fusion || {}).customs || []).length,
      prods: (wPre.prodigies || []).length,
      disciples: ((wPre.sect || {}).disciples || []).length,
      spirits: (wPre.treasures && wPre.treasures.owned || []).filter(e => e.st && e.st.spirit && e.st.spirit.a).length,
      treasures: (wPre.treasures && wPre.treasures.owned || []).length,
      slots: ((wPre.treasures && wPre.treasures.slots) || []).filter(Boolean).length,
      mats: Object.keys(wPre.materials || {}).length,
      matsDetail: JSON.stringify(wPre.materials || {}),
      recipes: ((wPre.alchemy || {}).recipes || []).join(','),
      z0mats: 'linglu' + (((wPre.materials || {}).mat_linglu) || 0) + '/qingmu' + (((wPre.materials || {}).mat_qingmu) || 0),
      bps: ((wPre.alchemy || {}).blueprints || []).length,
      furnaceFlag: !!SQ.Alchemy.hasFurnace(wPre, pack, D, ref.meta),
      pills: Object.keys((wPre.alchemy || {}).pills || {}).length,
      forged: ((wPre.alchemy || {}).forgeMade || 0),
      defy: ((wPre.tiandao || {}).defy || 0),
      trib: ((wPre.tribulation || {}).attempts || 0) + '/' + ((wPre.tribulation || {}).success || 0),
      tribMarks: JSON.stringify(wPre.tribMarks || {}),
      karma: wPre.karma || 0,
      cleared: (wPre.cleared || []).length,
      bossKills: (wPre.bossKills || []).length,
      eternal: eternalProdigies(wPre).length,
      omens: ((ref.meta.stats || {}).omensSeen || 0)
    };
    if (opts.rebirth === 'dissolve') {
      const r2 = await asafe(tag + '.dissolve', () => SQ.Actions.dissolve(ref));
      if (r2 && r2.ok && r2.success) return { ascended: false, rebirth: 'bingjie', life1: life1 };
      if (r2 && !r2.ok) dissolveFails[r2.reason || 'null'] = (dissolveFails[r2.reason || 'null'] || 0) + 1;
    }
    const r = await asafe(tag + '.ascend', () => SQ.Actions.ascend(ref));
    if (r && r.ok && r.success) return { ascended: true, life1: life1 };
  }
  return null;
}

const foundBlockReasons = {};
const donateFails = {};
const craftFails = {};
const donateStats = { ok: 0 };
const dissolveFails = {};
/* ── 2026-10-08 成就路线覆盖批新增观察项（都只记数，不判据）── */
const bossStats = { ready: 0, attempt: 0, win: 0, lose: 0, weak: 0, kills: 0, block: {} };
const nijieStats = { try: 0, win: 0, fail: 0, block: {} };
const feudStats = { present: 0, eventHit: 0, killTry: 0, eternalLife: 0, seen: 0 };
const factionStats = { defect: 0, defectBlock: {} };
const caveStats = { atInitial: 0, entered: {}, lack: {} };
const legacyStats = { unlocks: [], block: {} };
const bondStats = { visit: 0, visitBlock: {}, gift: 0, giftBlock: {}, propose: 0, proposeBlock: {}, guardian: 0,
  redeem: 0, redeemBlock: {}, locked: 0, maxAff: 0 };
const endgameStats = { artMax: 0, artUp: 0, artBuy: 0, treBuy: 0, shard: 0, shardBlock: {},
  merchantBuy: 0, repBuy: 0, shopFail: {} };
const craftStats = { danOk: 0, danFail: {}, qiOk: 0, qiFail: {}, qiSkip: {}, alDrink: 0, refineOk: 0,
  reforgeTry: 0, reforgeOk: 0, reforgeFail: {} };
const sparStats = { ok: 0, win: 0, lose: 0, draw: 0, crush: 0, brave: 0, mat: 0, feud: 0,
  k_light: 0, k_std: 0, k_heavy: 0, fail: {} };
/* 袭击 / 袭杀 / 族中寻仇计数（第卌四批）：路线与 fuzz 共写，末行打印成一条读数 */
const ambushStats = { try: 0, win: 0, lose: 0, kill: 0, revengeWin: 0, revengeEnd: 0,
  foeTry: 0, revTry: 0, fight: 0, flee: 0, yield: 0, fail: {} };
/* 战术三支的账（袭击 / 寻仇）：路线第 1 段与 fuzz 两个消费点共用这一处，别各写一遍。
 * 迎/避/输只记来客那一支（寻仇按模板只有「迎战」一钮，计数没有信息量）；
 * rvBefore / wAfter 用来分「偿清（链继续、n 涨）」与「链断（败 ⇒ revenge 清空）」两种终局。 */
function noteTactical(pc, key, rvBefore, wAfter) {
  if (pc.via === 'revenge') {
    ambushStats.revTry++;
    if (!wAfter.revenge) ambushStats.revengeEnd++;
    else if (rvBefore != null && wAfter.revenge.n > rvBefore) ambushStats.revengeWin++;
    return;
  }
  ambushStats.foeTry++;
  ambushStats[key === 'right' ? 'fight' : (key === 'evil' ? 'yield' : 'flee')]++;
}
/* ── 路线驱动器 ──
 * 2026-10-08 成就路线覆盖批追加的可选参数位（**缺省行为与旧版逐字节一致**，老三条路线读数不变）：
 *   opts.bias           创角「问道初心」alignBias —— 魔道 karma 的 drift 分量供数源（DRIFT_CAP ±260）
 *   opts.lives          要转世几次（>1 时转世后就地重铸角色继续走，直到世数达标）
 *   opts.rebirthChains  逐世转世通道（'ascend' 飞升 / 'dissolve' 兵解）；缺省 = 中间世兵解、末世飞升
 *   opts.goalAchv       这几条成就全部入账即提前收线（省下纯等天的墙钟，不弱化任何断言）
 *   opts.legacyBond     新世创角带的「跨世之缘」道友 id（须 meta.unlocks.bond 且在册 meta.lastBonds）
 */
const LIFE_NAMES = ['', '二世', '三世', '四世', '五世', '六世', '七世', '八世', '九世'];
async function playRoute(name, days, stepHours, opts) {
  resetTime();
  sandbox.window.localStorage.removeItem(SQ.KEY);
  const ref = {};
  await createRole(ref, name + '子', opts.legacy, opts.bias);
  const t0 = realNow();
  /* 时间模型（真实玩家等效）：每模拟日 = 24×30s 在线活跃步（claim 编排 dt<60s 判在线——
   * 击杀/首通/材料掉落/器灵温养/练习度全走在线通道）+ 1×23.8h 离线大步（离线结算通道） */
  const ONLINE_STEPS = 24, ONLINE_MS = 30000, OFFLINE_MS = 24 * 3600000 - ONLINE_STEPS * ONLINE_MS;
  let ascended = false, ascendedAtDay = -1, life1Snap = null;
  let maxRealm = 0;
  const stats = { claims: 0, foundBlock: {}, rebirths: [], deaths: [] };
  let deathSeen = 0;   /* 寿元批：lastDeath.at 键控，一次死只记一笔（防同一帧重复计） */
  const targetLives = opts.lives || 1;
  let livesDone = 0, routeDone = false, daysUsed = 0;
  const goalIds = opts.goalAchv || null;
  let i = 0;
  /* 转世后重铸角色（视图 mk-ok 等价事务：姓名/createdAt/天赋重掷/转世天赋槽/跳档/跨世之缘/天骄重掷）。
   * 原实现内联在 ascended 分支里，此处抽成函数供多世循环复用——事务顺序与判据一字未动，
   * 跳档从「只认 startRealm1」放宽为「认已购的最高档」（旧剧本从不买跳档 ⇒ 两式在旧路线上等价）。 */
  async function rebirthRecreate(lifeNo) {
    await SQ.mutate(ref, function (sL2) {
      sL2.profile.name = name + (LIFE_NAMES[lifeNo] || (lifeNo + '世'));
      sL2.profile.createdAt = Date.now();
      const rolled2 = SQ.rollTalents('xiuxian');
      sL2.profile.talents = rolled2.talents;
      const ownedT = SQ.Legacy.ownedTalents(sL2.meta, D);
      sL2.profile.legacyTalents = ownedT.slice(0, D.LEGACY.LEGACY_TALENT_SLOTS).map(t => ({ id: t.id, effects: t.effects }));
      const pr = D.LEGACY.START_REALM_PRICES || [];
      for (let ri = pr.length - 1; ri >= 0; ri--) {
        if ((sL2.meta.karma || 0) >= pr[ri] && sL2.meta.spent['shop.startRealm' + (ri + 1)] != null) {
          sL2.worlds[sL2.profile.worldId].realm = ri + 1;
          break;
        }
      }
      if (opts.legacyBond && (sL2.meta.unlocks || {}).bond &&
        (sL2.meta.lastBonds || []).indexOf(opts.legacyBond) >= 0) {
        sL2.worlds[sL2.profile.worldId].bonds[opts.legacyBond] = D.LEGACY.BOND_HEIR_BASE;
        sL2.worlds[sL2.profile.worldId].heirBond = opts.legacyBond;
      }
    });
    await SQ.mutate(ref, function (sL2b) {
      SQ.Prodigy.rollForNewLife(sL2b.worlds[sL2b.profile.worldId], pack, D, sL2b.meta, Date.now());
    });
  }
  outer:
  for (let day = 0; day < days && !ascended && !routeDone; day++) {
    daysUsed = day + 1;
    /* 本世终局通道：末世（含单世老剧本）必走飞升大劫，中间世按 chains 择路（缺省兵解） */
    opts.rebirth = (livesDone + 1 >= targetLives) ? 'ascend'
      : ((opts.rebirthChains || [])[livesDone] || 'dissolve');
    for (let k = 0; k < ONLINE_STEPS + 1 && !ascended && !routeDone; k++) {
      i++;
      advance(k < ONLINE_STEPS ? ONLINE_MS : OFFLINE_MS);
      await asafe(name + '.claim' + i, () => SQ.claim(ref));
      stats.claims++;
      const w = ref.worlds[ref.profile.worldId];
      if (!w) { violations.push(name + ': ws lost at step ' + i); break outer; }
      /* 寿元批：引擎在同一次 claim 里就可能判死并强制转世（ws 已换成新世、档案名清空）。
       * 剧本必须接着演：记一笔 forced 后就地重铸角色——**不占本路线规划的世数预算**
       *（终局世仍按 chains 走飞升，通过判据「至少一次飞升」不因此弱化）。 */
      if (w.lastDeath && w.lastDeath.at !== deathSeen) {
        deathSeen = w.lastDeath.at;
        stats.deaths.push({ day: day, step: i, cause: w.lastDeath.cause, realm: w.lastDeath.realm,
          age: w.lastDeath.age, dao: w.lastDeath.dao });
        await rebirthRecreate(((ref.meta.stats || {}).lives || 0) + 1);
        continue;
      }
      maxRealm = Math.max(maxRealm, w.realm || 0);
      if (k === ONLINE_STEPS) continue;               /* 离线大步后不操作 */
      const r = await playerStep(ref, name + '.' + i, opts);
      if (r && (r.ascended || r.rebirth)) {
        const ch = r.ascended ? 'feisheng' : r.rebirth;
        livesDone++;
        life1Snap = r.life1 || life1Snap;
        stats.rebirths.push({ day: day, ch: ch, lives: (ref.meta.stats || {}).lives || 0,
          achv: (ref.meta.achv || []).length, karma: ref.meta.karma || 0,
          trib: (ref.meta.stats || {}).tribAttempts + '/' + (ref.meta.stats || {}).tribWin });
        if (r.ascended) { ascended = true; ascendedAtDay = day; }
        if (!opts.lives && opts.secondLife && r.ascended) {
          /* 二世验证（旧路径原样）：转世后新周目再走 10 天 */
          await rebirthRecreate(2);
          for (let j = 0; j < Math.ceil(10 * 24 / stepHours); j++) {
            advance(stepHours * 3600000);
            await asafe(name + '.life2.claim' + j, () => SQ.claim(ref));
            await playerStep(ref, name + '.L2.' + j, Object.assign({}, opts, { secondLife: false }));
          }
          routeDone = true;
        } else if (livesDone >= targetLives) {
          routeDone = true;
        } else {
          await rebirthRecreate(livesDone + 1);
        }
      }
      if (i % 40 === 0) checkInvariants(ref, name + '.step' + i);
      /* 每 60 步走一次 save/load 真机往返（压缩预案 + normalize 幂等链路） */
      if (i % 60 === 59) {
        await asafe(name + '.save' + i, () => SQ.save(ref));
        const raw = sandbox.window.localStorage.getItem(SQ.KEY);
        if (raw) {
          const kb = byteLen(raw) / 1024;
          if (kb > RED_KB) violations.push(name + ': save size ' + kb.toFixed(1) + 'KB > ' + RED_KB + 'KB at step ' + i);
          /* 容量水位：越 45KB 触发线即留该路线峰值分解（红线 50KB 的提前量证据） */
          if (kb > TRIG_KB) {
            const pi = capWatch.findIndex(c => c.route === name);
            if (pi < 0 || kb > capWatch[pi].kb) {
              const rec = { route: name, step: i, kb: kb, detail: sizeBreakdown(raw) };
              if (pi < 0) capWatch.push(rec); else capWatch.splice(pi, 1, rec);
            }
          }
          const reloaded = await SQ.load();
          checkInvariants(reloaded, name + '.reload' + i);
        }
      }
      /* 目标成就全部入账即收线（2026-10-08 路线覆盖批：墙钟自限，绝不因此少判一条断言） */
      if (goalIds && i % 10 === 3) {
        const haveIds = ref.meta.achv || [];
        if (goalIds.every(id => haveIds.indexOf(id) >= 0)) { stats.goalDoneAt = day; routeDone = true; break; }
      }
    }
  }
  checkInvariants(ref, name + '.final');
  const wEnd = ref.worlds[ref.profile.worldId] || {};
  return {
    name: name, days: days, daysUsed: daysUsed, ascended: ascended, ascendedAtDay: ascendedAtDay, foundBlock: stats.foundBlock,
    maxRealm: maxRealm, lives: (ref.meta.stats || {}).lives || 0,
    karma: ref.meta.karma || 0, achv: (ref.meta.achv || []).length,
    achvIds: (ref.meta.achv || []).slice(),
    titles: (ref.meta.titles || []).length, bios: (ref.meta.biographies || []).length,
    codexFaces: Object.keys(ref.meta.codices || {}).length,
    sect: !!(ref.worlds[ref.profile.worldId] || {}).sect,
    customs: (((ref.worlds[ref.profile.worldId] || {}).fusion || {}).customs || []).length,
    prods: ((ref.worlds[ref.profile.worldId] || {}).prodigies || []).length,
    rebirths: stats.rebirths, deaths: stats.deaths, goalDoneAt: stats.goalDoneAt, goals: (goalIds || []).slice(),
    tribAtt: (ref.meta.stats || {}).tribAttempts || 0, tribWin: (ref.meta.stats || {}).tribWin || 0,
    dissolutions: (ref.meta.stats || {}).dissolutions || 0,
    codexTre: (ref.meta.codices || {}).treasure ? ref.meta.codices.treasure.length : 0,
    codexArtMax: (ref.meta.codices || {}).artMax ? ref.meta.codices.artMax.length : 0,
    codexZone: (ref.meta.codices || {}).zone ? ref.meta.codices.zone.length : 0,
    karmaEnd: wEnd.karma || 0,
    life1: life1Snap, wallMs: realNow() - t0, claims: stats.claims
  };
}

/* ── C 路线：随机 fuzz（软锁检测——任意状态都有合法操作可执行）── */
async function playFuzz(round) {
  resetTime();
  sandbox.window.localStorage.removeItem(SQ.KEY);
  const ref = {};
  await createRole(ref, '混沌子', null);
  const tag = 'fuzz' + round;
  const OPS = ['setMode', 'setZone', 'refreshShop', 'buy', 'upgradeArt', 'slotArt', 'enterCave',
    'alSell', 'alDrink', 'challengeBoss', 'donateFaction', 'tryTrib', 'prodigySpar',
    'sectRecruit', 'sectAccept', 'sectReject', 'legacyBuy', 'fuseStart', 'spiritSkill', 'tdOmensSeen',
    'ambushProd',
    'exchangeShard', 'buildFacility', 'joinFaction', 'leaveFaction', 'sectBuild', 'sectDispatch', 'sectInvest'];
  let okOps = 0;
  for (let i = 0; i < 20000; i++) {
    advance(Math.floor(Math.random() * 7200000));   /* 0~2h 步进 */
    await asafe(tag + '.claim', () => SQ.claim(ref));
    const op = randPick(OPS);
    const w = ref.worlds[ref.profile.worldId];
    if (w.pendingChoice) {
      const ev = SQ.Events.findById(pack, w.pendingChoice.id);
      if (ev) {
        const pcF = w.pendingChoice, keyF = randPick(Object.keys(ev.choices)), rvBF = (w.revenge || {}).n;
        await asafe(tag + '.choice', () => SQ.Actions.resolveChoice(ref, keyF));
        if (ev.tactical) noteTactical(pcF, keyF, rvBF, ref.worlds[ref.profile.worldId]);
      }
    }
    const r = await asafe(tag + '.' + op, async () => {
      switch (op) {
        case 'setMode': return SQ.Actions.setMode(ref, randPick(['seclude', 'venture']));
        case 'setZone': return SQ.Actions.setZone(ref, Math.floor(Math.random() * 10));
        case 'refreshShop': return SQ.Actions.refreshShop(ref, Math.random() < 0.2);
        case 'buy': return SQ.Actions.buy(ref, Math.floor(Math.random() * 6), Math.random() < 0.2);
        case 'upgradeArt': return SQ.Actions.upgradeArt(ref, randPick(w.artsKnown.length ? w.artsKnown : ['tuna']));
        case 'slotArt': return SQ.Actions.slotArt(ref, randPick(w.artsKnown.length ? w.artsKnown : ['tuna']), null);
        case 'enterCave': return SQ.Actions.enterCave(ref, randPick(D.CAVES).id);
        case 'alSell': { const mk = Object.keys(w.materials || {}); return mk.length ? SQ.Actions.alSell(ref, randPick(mk), 1) : null; }
        case 'alDrink': { const pk = Object.keys((w.alchemy || {}).pills || {}); return pk.length ? SQ.Actions.alDrink(ref, randPick(pk)) : null; }
        case 'challengeBoss': return SQ.Actions.challengeBoss(ref);
        case 'donateFaction': return (w.factionId && w.factionId !== 'sect') ? SQ.Actions.donateFaction(ref, randPick(D.FACTION_DONATE.TIERS)) : null;
        case 'tryTrib': return SQ.Actions.tryTrib(ref);
        case 'prodigySpar': return (w.prodigies || []).length ? SQ.Actions.prodigySpar(ref, randPick(w.prodigies).id, ['light', 'std', 'heavy'][Math.floor(Math.random() * 3)]) : null;
        /* 袭杀（第卌四批）：随机挑一名天骄出手——让「三次身死 → 寻仇链」这条路在 fuzz 里也真走一遍 */
        case 'ambushProd': return (w.prodigies || []).length ? SQ.Actions.prodigyAmbush(ref, randPick(w.prodigies).id) : null;
        case 'sectRecruit': return SQ.Actions.sectRecruit(ref);
        case 'sectAccept': return SQ.Actions.sectAccept(ref);
        case 'sectReject': return SQ.Actions.sectReject(ref);
        case 'legacyBuy': return SQ.Actions.legacyBuy(ref, randPick(SQ.Legacy.shopItems(D)).id);
        case 'fuseStart': { const kn = w.artsKnown || []; return kn.length >= 2 ? SQ.Actions.fuseStart(ref, kn[0], kn[1], '') : null; }
        case 'spiritSkill': { const ent = SQ.Fusion.equippedEntries(w, pack); return ent.length ? SQ.Actions.spiritSkill(ref, ent[0].e.id) : null; }
        case 'tdOmensSeen': return SQ.Actions.tdOmensSeen(ref);
        case 'exchangeShard': return SQ.Actions.exchangeShard(ref, Math.floor(Math.random() * 10), randPick(['fac', 'intel']));
        case 'buildFacility': { const cv = SQ.Cave.current(w, pack); return SQ.Actions.buildFacility(ref, cv.id, randPick(D.CAVE_FACILITIES).id); }
        case 'joinFaction': return SQ.Actions.joinFaction(ref, randPick(D.FACTIONS_FIXED).id);
        case 'leaveFaction': return SQ.Actions.leaveFaction(ref);
        case 'sectBuild': return SQ.Actions.sectBuild(ref, randPick(D.SECT.FAC_IDS));
        case 'sectDispatch': { const sec = w.sect; return sec && sec.disciples.length ? SQ.Actions.sectDispatch(ref, sec.disciples[0].id) : null; }
        case 'sectInvest': { const sec2 = w.sect; return sec2 && sec2.disciples.length ? SQ.Actions.sectInvest(ref, sec2.disciples[0].id, Math.floor(Math.random() * 3)) : null; }
        default: return null;
      }
    });
    if (r !== null && r !== undefined) okOps++;
    if (i % 500 === 0) checkInvariants(ref, tag + '.' + i);
  }
  checkInvariants(ref, tag + '.final');
  await asafe(tag + '.save', () => SQ.save(ref));
  const raw = sandbox.window.localStorage.getItem(SQ.KEY);
  const kb = raw ? byteLen(raw) / 1024 : 0;
  if (kb > RED_KB) violations.push(tag + ': final save ' + kb.toFixed(1) + 'KB > ' + RED_KB + 'KB');
  const wF = ref.worlds[ref.profile.worldId];
  return { name: tag, ops: okOps, realm: wF ? wF.realm : -1, saveKB: +kb.toFixed(1), wallMs: 0 };
}

/* ── 主流程 ── */
(async () => {
  const t00 = realNow();
  const reports = [];
  for (let r = 1; r <= ROUNDS; r++) {
    reports.push(await playRoute('甲·新手' + r, dOf(60), 6, { alwaysVenture: false, fullSystems: false }));
    reports.push(await playRoute('乙·全修' + r, dOf(300), 6, { alwaysVenture: true, fullSystems: true, secondLife: true, legacy: null, holdAscendDay: dOf(180) }));
  }
  /* 三世老玩家路线：带转世天赋 + 跳档开局（遗泽商店购得态直接模拟） */
  reports.push(await playRoute('丙·三世', dOf(300), 6, {
    alwaysVenture: true, fullSystems: true, secondLife: true, holdAscendDay: dOf(180),
    legacy: { startRealm: 2, talents: (D.LEGACY.TALENTS || []).slice(0, 2).map(t => ({ id: t.id, effects: t.effects })) }
  }));
  /* ══ 2026-10-08 成就路线覆盖批：丁/戊/己/庚 四条新剧本 ══
   * 老三条（甲/乙/丙）走的是「顺境通解」：随机分支、不叛门、不结缘、不迁居、一世飞升。
   * 下面四条各攻一组成就族，全部只按 SQ.Actions.* 点玩家按钮，零直写 ws.*。
   * 每条都带 goalAchv（目标成就集）——集齐即收线，墙钟自限；缺一天没收齐就照预算走完。 */
  /* 丁·魔道缘尽：问道初心=魔道（drift 分量 −260 封顶）+ 奇遇恒点 evil 支（karmaEventScore 主供数）
   * → achv_rumo(≤−500) / achv_shenmo(≤−900)；低成算硬闯高境界 → achv_kudu（p≤0.15 一击即中）
   * / achv_lianbai（5 连败后首胜）；defy 满 100 后**反复**逆天 → achv_nitian + achv_fanpan；
   * 车老叟（唯一魔道阵营的 bondLock 奇遇主）好感抬到 ≥30 后 evil 支代签绝交锁 →
   * achv_juefeng（绝而复续，赎回后 bond=10>0）+ achv_kuashi（heirBond 生产写口 = grantHeir / redeem 两口；本 sim 走 fixture 直写，不代表生产路径）；
   * 叛门 → achv_panzong；逐区斩主 → achv_quantong / achv_shizhu。 */
  reports.push(await playRoute('丁·魔道', dOf(300), 6, {
    alwaysVenture: true, fullSystems: true, bias: 'evil', branch: 'evil',
    bossFirst: true, defect: true, redeem: true, nijieAlways: true, legacyUnlocks: true, debugLack: true,
    bonds: [{ npc: 'chelaozu', goal: 30 }],
    goalAchv: ['achv_rumo', 'achv_shenmo', 'achv_kudu', 'achv_lianbai', 'achv_fanpan',
      'achv_juefeng', 'achv_kuashi', 'achv_panzong', 'achv_quantong', 'achv_shizhu']
  }));
  /* 戊·累世宿敌：四世转生（前三世真仙盈满即兵解 achv_bingjie，末世飞升）→ achv_sanshi（世数≥3）；
   * 恒点 evil 支把 karma 压到 −800 以下 → 渡劫 p 夹到下限 ⇒ 单世数十次掷劫
   * → achv_leiting（跨世累 ≥100 次）/ achv_baizhan（跨世累 ≥30 胜）；
   * heavy 赌注切磋惨败结仇 + 带 unlock.nemesis 转世 ⇒ 宿敌记忆转世 →
   * achv_zhandi（狭路相逢 evil 支斩杀 → prodMarks.sudiWin）+ achv_sudi（本批取证对象）。 */
  reports.push(await playRoute('戊·累世', dOf(420), 6, {
    alwaysVenture: true, fullSystems: true, bias: 'evil', branch: 'evil', lives: 4,
    bossFirst: true, defect: true, nijieAlways: true, legacyUnlocks: true,
    setFeud: true, killFeud: true, debugLack: true,
    goalAchv: ['achv_sanshi', 'achv_bingjie', 'achv_baizhan', 'achv_leiting', 'achv_zhandi']
  }));
  /* 己·情缘福地：魔道初心先入恶档 → 赠丹把「阴月」（evil 阵营 spouse 名录）抬到满档提亲 ⇒
   * 形态炉鼎 achv_daolv；随后恒点 right 支悔过，karma 回升出恶档 → maintain 落心结锁
   * → achv_xinjie；再娶一位非恶档道侣（互助/阴阳形态永不自动解除）满 30 天 → achv_shuangxiu；
   * 择档≥3 护法 + 迁居非初始福地 → achv_fudi（双条件）/ achv_hufa；叛门 → achv_panzong。 */
  reports.push(await playRoute('己·情缘', dOf(240), 6, {
    alwaysVenture: true, fullSystems: true, bias: 'evil', bossFirst: true, caveSeek: true,
    defect: true, legacyUnlocks: true, debugLack: true,
    branch: { evil: [0, 55], right: [[55, 400]] },
    bonds: [{ npc: 'yinyue', goal: 100, spouse: true }, { npc: 'chenqiaoyue', goal: 100, spouse: true }],
    goalAchv: ['achv_daolv', 'achv_xinjie', 'achv_shuangxiu', 'achv_fudi', 'achv_hufa', 'achv_panzong']
  }));
  /* 庚·万法满藏：真仙不飞升（opts.noAscend）——🔧 第廿五批 2026-10-13 起破境**不再清** artsLevels
   * （原 `realm.js` 那句已删）⇒ 满级窗口不再被境界顶锁死，本路线的「不飞升」只用来把真仙境留在档上；
   * ① 逐格买断坊市/黑市/特席 + 各区残片到期即兑（z9 留到最后收 x10/x11 这两件**仅残片通道**的先天）
   *   → achv_baoquan（法宝图鉴 46/46）；② 已购功法批量 upgradeArt 点满 10 部 → achv_wanfa。
   * 黑市可见性靠魔道初心 drift（≤−200）⇒ 本条同时把 BLACK_IDS 五件补进-collection。 */
  reports.push(await playRoute('庚·满藏', dOf(320), 6, {
    alwaysVenture: true, fullSystems: true, bias: 'evil', branch: 'random', bossFirst: true,
    noAscend: true, collect: true, maxArts: true, maxArtsRealm: 9, debugLack: true,
    goalAchv: ['achv_wanfa', 'achv_baoquan']
  }));
  const fuzzRep = await playFuzz(1);
  Date.now = realNow;

  console.log('═══ 真机模拟走查报告（sim-playthrough）═══');
  for (const rp of reports) {
    console.log([rp.name,
      '模拟' + rp.days + '天' + (rp.daysUsed !== rp.days ? ('(实' + rp.daysUsed + ')') : ''),
      '飞升:' + (rp.ascended ? '第' + rp.ascendedAtDay + '天' : '未'),
      '转世链:' + (rp.rebirths || []).map(x => x.day + '天/' + x.ch + '/泽' + x.karma + '/劫' + x.trib).join('→'),
      '最高境界:' + rp.maxRealm,
      '世数:' + rp.lives,
      '遗泽:' + rp.karma,
      '成就:' + rp.achv + '/60',
      '称号:' + rp.titles,
      '传记:' + rp.bios,
      '图鉴面:' + rp.codexFaces,
      '宗门:' + (rp.sect ? '立' : '无'),
      '自创功法:' + rp.customs,
      '天骄:' + rp.prods,
      '法宝面:' + rp.codexTre + '/满级面:' + rp.codexArtMax + '/区面:' + rp.codexZone +
        ' 终karma:' + rp.karmaEnd,
      'claims:' + rp.claims,
      rp.life1 ? ('一世[宗门:' + (rp.life1.sect ? rp.life1.sectName + '徒' + rp.life1.disciples : '无(' + JSON.stringify(foundBlockReasons) + ')') +
        ' 自创:' + rp.life1.customs + ' 器灵:' + rp.life1.spirits + ' 丹种:' + rp.life1.pills +
        ' 炼器:' + rp.life1.forged + ' 宝:' + rp.life1.treasures + '/祭' + rp.life1.slots +
        ' 材:' + rp.life1.matsDetail.slice(0, 160) + ' 方:' + rp.life1.recipes + ' z0:' + rp.life1.z0mats +
        ' 图纸:' + rp.life1.bps + ' 炉:' + (rp.life1.furnaceFlag ? '有' : '无') +
        ' 逆天:' + rp.life1.defy + ' 天象览:' + rp.life1.omens +
        ' 劫:' + rp.life1.trib + ' karma:' + rp.life1.karma + ' 区:' + rp.life1.cleared + '/主' + rp.life1.bossKills +
        ' 宿敌:' + rp.life1.eternal + ' marks:' + rp.life1.tribMarks + ']') : '',
      '捐献rep:' + donateStats.ok + (Object.keys(donateFails).length ? (' 拒:' + JSON.stringify(donateFails)) : ''),
      Object.keys(craftFails).length ? ('炼制拒:' + JSON.stringify(craftFails)) : '',
      '炼成:丹' + craftStats.danOk + '/器' + craftStats.qiOk + '/服' + craftStats.alDrink + '/提' + craftStats.refineOk +
        '/淬' + craftStats.reforgeOk + '(' + craftStats.reforgeTry + '试)' +
        (Object.keys(craftStats.qiSkip).length ? (' 器跳:' + JSON.stringify(craftStats.qiSkip)) : '') +
        (Object.keys(craftStats.danFail).length ? (' 丹败:' + JSON.stringify(craftStats.danFail)) : '') +
        (Object.keys(craftStats.qiFail).length ? (' 器败:' + JSON.stringify(craftStats.qiFail)) : '') +
        (Object.keys(craftStats.reforgeFail).length ? (' 淬拒:' + JSON.stringify(craftStats.reforgeFail)) : ''),
      '袭杀:' + ambushStats.try + '(胜' + ambushStats.win + '/负' + ambushStats.lose + '/身死' + ambushStats.kill + ')' +
        ' 来客' + ambushStats.foeTry + '(迎' + ambushStats.fight + '/避' + ambushStats.flee + '/输' + ambushStats.yield + ')' +
        ' 寻仇' + ambushStats.revTry + '(偿清' + ambushStats.revengeWin + '/链断' + ambushStats.revengeEnd + ')' +
        (Object.keys(ambushStats.fail).length ? (' 拒:' + JSON.stringify(ambushStats.fail)) : ''),
      '切磋:' + sparStats.ok + '(胜' + sparStats.win + '/负' + sparStats.lose + '/平' + sparStats.draw +
        ' 碾' + sparStats.crush + '/强' + sparStats.brave + ' 材' + sparStats.mat + ' 仇' + sparStats.feud +
        ' 档' + sparStats.k_light + '/' + sparStats.k_std + '/' + sparStats.k_heavy + ')' +
        (Object.keys(sparStats.fail).length ? (' 拒:' + JSON.stringify(sparStats.fail)) : ''),
      /* 种子模式略去墙钟 = 保两跑输出逐字节可比（墙钟是真实耗时、天然浮动，留着就无法做逐字节断言） */
      (SEED ? '墙钟(种子模式略)' : '墙钟' + Math.round(rp.wallMs) + 'ms')].join(' | '));
  }
  console.log([fuzzRep.name, '有效操作:' + fuzzRep.ops + '/20000', '终境界:' + fuzzRep.realm, '终存档:' + fuzzRep.saveKB + 'KB'].join(' | '));
  /* 2026-10-08 路线覆盖批新增段：四条新剧本的动作计数（读的是引擎返回值，不是判据） */
  console.log('ROUTE_STATS 域主(备' + bossStats.ready + '/战' + bossStats.attempt + '/胜' + bossStats.win +
    '/负' + bossStats.lose + '/战力不足' + bossStats.weak + '/峰值斩' + bossStats.kills + '区' +
    (Object.keys(bossStats.block).length ? (' 拒:' + JSON.stringify(bossStats.block)) : '') + ')' +
    ' 逆天(' + nijieStats.try + '试/' + nijieStats.win + '渡/' + nijieStats.fail + '败' +
    (Object.keys(nijieStats.block).length ? (' 拒:' + JSON.stringify(nijieStats.block)) : '') + ')' +
    ' 宿敌(在档' + feudStats.present + '步/事件' + feudStats.eventHit + '次/斩试' + feudStats.killTry +
    '/有宿敌世' + feudStats.eternalLife + '/峰值' + feudStats.seen + ')' +
    ' 叛门(' + factionStats.defect + (Object.keys(factionStats.defectBlock).length ? (' 拒:' + JSON.stringify(factionStats.defectBlock)) : '') + ')' +
    ' 兵解拒:' + JSON.stringify(dissolveFails) +
    ' 遗泽购:' + legacyStats.unlocks.join(','));
  console.log('ROUTE_STATS2 结缘(访' + bondStats.visit + '/赠' + bondStats.gift + '/提亲' + bondStats.propose +
    '/护法' + bondStats.guardian + '/赎回' + bondStats.redeem + '/峰值好感' + bondStats.maxAff +
    '/锁数' + bondStats.locked + (Object.keys(bondStats.visitBlock).length ? (' 访拒:' + JSON.stringify(bondStats.visitBlock)) : '') +
    (Object.keys(bondStats.proposeBlock).length ? (' 亲拒:' + JSON.stringify(bondStats.proposeBlock)) : '') +
    (Object.keys(bondStats.redeemBlock).length ? (' 赎拒:' + JSON.stringify(bondStats.redeemBlock)) : '') + ')' +
    ' 福地(初始驻' + caveStats.atInitial + '/已入:' + Object.keys(caveStats.entered).join(',') +
    (Object.keys(caveStats.lack).length ? (' 缺项:' + JSON.stringify(caveStats.lack)) : '') + ')' +
    ' 终局(满级法' + endgameStats.artMax + '/升' + endgameStats.artUp + '/购法' + endgameStats.artBuy +
    '/购宝' + endgameStats.treBuy + '/特席' + endgameStats.merchantBuy + '/兑片' + endgameStats.shard +
    '/在库宝' + endgameStats.treOwned + '/z9片' + endgameStats.z9shards + '/z9待它渠先天' + endgameStats.shardHold +
    (Object.keys(endgameStats.shardBlock).length ? (' 兑拒:' + JSON.stringify(endgameStats.shardBlock)) : '') +
    (Object.keys(endgameStats.shopFail).length ? (' 买拒:' + JSON.stringify(endgameStats.shopFail)) : '') + ')');
  console.log('总操作数 ' + opsTotal + (SEED ? '' : ' · 墙钟 ' + Math.round(realNow() - t00) + 'ms') +
    ' · 种子 ' + (SEED || '随机（未固定）') + ' · 基准时刻 ' + (SEED ? BASE_NOW + '（固定）' : '真实墙钟（浮动）'));
  if (capWatch.length) {
    console.log('CAP_WATCH（save 越 ' + TRIG_KB + 'KB 触发线 · 每路线峰值字段分解）:');
    capWatch.forEach(c => console.log('  ⚠ ' + c.route + ' 步' + c.step + ' ' + c.kb.toFixed(2) + 'KB → ' + c.detail));
  }
  if (crashes.length) {
    console.log('CRASHES(' + crashes.length + '):');
    crashes.slice(0, 12).forEach(c => console.log('  ✗ ' + c));
  }
  if (violations.length) {
    console.log('VIOLATIONS(' + violations.length + '):');
    violations.slice(0, 15).forEach(v => console.log('  ✗ ' + v));
  }
  /* 通过判据：零崩溃 + 零不变量违例 + 至少一轮飞升成功 + 二世正常 + fuzz 终态健康 */
  /* 成就覆盖矩阵（2026-10-08 裁定收口批加）：把「哪几条在任何路线上都没入过账」点名打出来，
   * 不再只报一个 N/60 的笼统数——未入账 ≠ 不可达（判据可满足性由 probe-achvreach 逐条证），
   * 但**到底是哪几条**必须看得见，才能判断是难度问题还是写口问题。 */
  const reachIds = {};
  reports.forEach((r) => (r.achvIds || []).forEach((id) => { reachIds[id] = (reachIds[id] || 0) + 1; }));
  const allAchv = (SQ.XDATA.CODEX.ACHV || []).map((a) => a.id);
  const unreached = allAchv.filter((id) => !reachIds[id]);
  console.log('ACHV_COVERAGE ' + reports.length + ' 路线入账 ' + (allAchv.length - unreached.length) + '/' + allAchv.length +
    '（跨路线计数：' + allAchv.filter((id) => reachIds[id] >= 2).length + ' 条 ≥2 路线）');
  if (unreached.length) console.log('ACHV_UNREACHED(' + unreached.length + '): ' + unreached.join(' '));
  /* 逐路线首达（2026-10-08 路线覆盖批）：每条线在它自己的 meta 里新点亮了哪些成就——
   * 跨路线取并集后才是 ACHV_COVERAGE，所以这里出现重复是正常的（同一成就多条线都能拿）。 */
  reports.forEach(r => {
    const ids = (r.achvIds || []);
    const missGoal = (r.goals || []).filter(id => ids.indexOf(id) < 0);
    console.log('ROUTE_ACHV ' + r.name + ' 入账' + ids.length + '/60 未达' +
      allAchv.filter(id => ids.indexOf(id) < 0).length +
      ((r.goals || []).length ? (' 目标集:' + (missGoal.length ? ('缺' + missGoal.length + '[' + missGoal.join(' ') + ']') : ('全达@第' + r.goalDoneAt + '天'))) : '') +
      ': [' + allAchv.filter(id => ids.indexOf(id) >= 0).join(' ') + ']');
  });

  /* 寿元批读数：强制转世到底发生了没有、死于哪条钟。判绿之外必须把这个数打出来——
   * 「加了个从不出事的机制」与「机制把路线全冲垮了」两种坏情况，光看 PLAYTHROUGH_ALL_GREEN 分不出来。 */
  const deathTally = {};
  reports.forEach(r => (r.deaths || []).forEach(d => { deathTally[d.cause] = (deathTally[d.cause] || 0) + 1; }));
  console.log('DEATHS 强制转世 ' + Object.keys(deathTally).reduce((n, k) => n + deathTally[k], 0) + ' 次（' +
    (Object.keys(deathTally).map(k => k + '=' + deathTally[k]).join(' ') || '零') + '）· 逐路线 ' +
    reports.map(r => r.name + ':' + (r.deaths || []).length).join(' '));

  const anyAscend = reports.some(r => r.ascended);
  const anyLife2 = reports.some(r => r.lives >= 1);
  /* 锚判：只在锚跑上判（`SQ_ANCHOR=1` 且实跑种子 === 在册锚种子）⇒ 门禁链与开发跑末行逐字不变 */
  const ANCHOR_SEED_NUM = (parseInt(ANCHOR_SEED, 10) || 0) >>> 0;
  let anchorDrift = false, anchorTxt = '';
  if (ANCHOR_ON) {
    const got = crypto.createHash('md5').update(TRAJ.join('\n')).digest('hex');
    if (DAY_SCALE !== 1 || SEED !== ANCHOR_SEED_NUM) {
      anchorDrift = true;
      anchorTxt = '锚跑参数不对（种子 ' + SEED + ' ‖ 日预算 ' + DAY_SCALE + '）';
      console.log('FAIL 锚跑必须种子 ' + ANCHOR_SEED_NUM + ' 且不带 SQ_DAYS 缩放，本次种子=' + SEED + ' SQ_DAYS=' + DAY_SCALE);
    } else if (got !== ANCHOR_MD5) {
      anchorDrift = true;
      anchorTxt = '锚漂移 ' + got.slice(0, 8);
      console.log('FAIL 轨迹锚漂移：本次逐路线读数 md5=' + got + ' ‖ 在册锚=' + ANCHOR_MD5 +
        ' ⇒ 结算 / 掉率 / 呈现计数换了形状。改锚要写归因（§4.42），不许顺手把锚改成新值');
    } else anchorTxt = '锚对表相同 ' + got.slice(0, 8);
  }
  const pass = crashes.length === 0 && violations.length === 0 && anyAscend && anyLife2 && fuzzRep.realm >= 0 && !anchorDrift;
  console.log((pass ? 'PLAYTHROUGH_ALL_GREEN ' + reports.length + ' 路线 + fuzz'
    : 'PLAYTHROUGH_FAILED crashes=' + crashes.length + ' violations=' + violations.length + ' ascend=' + anyAscend + ' life2=' + anyLife2)
    + (ANCHOR_ON ? ' ‖ ' + anchorTxt : ''));
  process.exit(pass ? 0 : 1);
})();
