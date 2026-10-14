/* 一次性记账件：GitHub issue 三件处置批（第卅三批）落三卷——卷头升版 + 旧注推入版本志最前 + §七A 新条。
 * 纪律按 AGENTS「历史注逐字不改写」：脚本只做「整行搬移 + 新行插入」，不改动任何既有正文。
 * 用法：node .tmp-account-batch33.cjs   末行 BATCH33_ACCOUNTED */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const P = (f) => path.join(ROOT, f);

function splice(file, headerPrefix, newHeader, logAnchorRe, entryText, entryAnchorRe) {
  const lines = fs.readFileSync(P(file), 'utf8').split('\n');
  const hi = lines.findIndex((l, i) => i < 12 && l.startsWith(headerPrefix));
  if (hi < 0) throw new Error(file + '：找不到卷头版本行');
  const oldHeader = lines[hi];
  if (oldHeader.indexOf('〔') < 0) throw new Error(file + '：卷头行不像含「旧注逐字保留」句，停手');
  const idxLog = lines.findIndex((l, i) => i > hi + 12 && logAnchorRe.test(l));
  if (idxLog < 0) throw new Error(file + '：找不到版本志表首行（上一版那一行）');
  let rebuilt = lines.slice(0, hi).concat(newHeader.split('\n'), lines.slice(hi + 1, idxLog), [oldHeader], lines.slice(idxLog));
  if (entryAnchorRe) {
    const ei = rebuilt.findIndex((l) => entryAnchorRe.test(l));
    if (ei < 0) throw new Error(file + '：找不到 §七A 插入锚');
    rebuilt = rebuilt.slice(0, ei).concat(entryText.split('\n'), rebuilt.slice(ei));
  }
  fs.writeFileSync(P(file), rebuilt.join('\n'), 'utf8');
  console.log('OK ' + file + ' 卷头→' + newHeader.slice(0, 24) + ' 旧注推入版本志（原 index=' + idxLog + '）' + (entryAnchorRe ? ' ‖ §七A 已插' : ''));
}

/* ── 主设计 v2.78 → v2.79 + §七A 第 76 条 ── */
const ENTRY = [
  '76. **GitHub issue 三件处置批：#4 赠丹假计数 · #3 主修可点定 · #2 自动炼化开关（2026-10-14 · 第卅三批 · 用户令「这三项是我的账号提交的，默认都通过，按 4-3-2 处置」）**',
  '    ① **#4 的病灶不是「限制太严」而是「文案说谎」**：`BOND_GIFT_DAILY = 3` 走 `Alchemy.gameDayOf`，而 **1 游戏日 = 1 现实秒** ⇒ 每次点击都已跨日清零，上限永不生效、屏上恒显「今日 1/3」。所以处置 = 按用户裁定**删限制 + 改文案**，而不是把计数改成真能生效（那等于偷偷新增一条玩家从未同意的节流）。判据侧照本仓老纪律「先证窗口发生过」：走查场景 C 从「日限占满置灰」改成**同一冻结游戏日内连赠三次全部入账**，旧口径在这条下必红。',
  '    ② **#4 是一处五联动删除**：`bonds.js` 校验链少一环（并连带 `giftPill` 的 `profile` 形参与 `actions.js` 的透传一起退役）‖ `alchemy.js` normalize + ensure 两处字段退役（旧档带 `giftDay` 读档即剪）‖ `data.js` 常量删 ‖ 词表 `bond.gift.head` 改「以丹相赠（丹尽则止，不论日次）」+ `bond.gift.fail.daily` 删 ‖ 视图 `giftLeft` 助手、置灰态、日限提示行、`bondFailText` 的 `{n}` special case 四处同撤。真正的节流本来就在**丹药库存与炼制耗时**上，逻辑没有变松，只是不再谎报有一道日限。',
  '    ③ **#3 的兼容性优先**：新增 `ws.artsMain`（string | null），`mainArt` 认它**优先、回落第 1 位**，读时二次校验（脏值 / 已被移出槽 ⇒ 回落）⇒ **旧档行为逐字不变**，`probe-slotreplace` 19 判与 `verify-ui-chains` C1g~C1m 一条都不用改就是这条的证据。机制面在 `tickPractice`：增速从 `i === 0` 改成认 `mainArt` 指向——判据新增「主修点在第 2 格 ⇒ 增速跟着走第 2 格」（冒烟 #141），这一格在旧实现下必红，钉的是「认主修」而不是「认槽序」。`setMain` 只认**已在槽内且已入门**者：槽外点定会让角标与增速指向两件事，等于造第二事实源，直接拒。',
  '    ④ **#2 的射程裁定（代裁，用户未细说）**：把开关理解成「**把裁决权还给玩家**」而不是「永不炼化」——关 ⇒ 被换下的旧件与不如在件的新件**先入库藏阁**；**库藏阁满时仍回落炼化腾位**，因为 `STASH_CAP` 是落盘容量红线（§8 现值余量 7.58%），不为一个偏好放开，代码内已按纪律写 `shortcut:` 注。开关落点存 `ws.gearAutoRefine` 而非 `state.settings`：`autoEquip` 十一个调用点签名各异，只有 `ws` 一定在场——为一枚偏好去改十一条线不划算，代价是它随角色走（每世界各一份），已在工程规范 §3.2 行内交底。',
  '    ⑤ **同型面枚举（修一类而不是修一例）**：`PILL_DAILY_CAP`（丹毒）与退役掉的赠丹日限**同形同口径**（同一个 `gameDayOf`），屏上那句「丹毒已满（每游戏日 {n} 颗）」同样几乎永不触发；它管的是自服吞吐平衡，改它 = 改数值 ⇒ 不随本批动，登记 **N42**。另有 **N43**（原位替换顶掉「玩家点定的那一部」时主修不跟随、回落第 1 位）与 **N44**（库满仍炼化）两条已知边界同批登记。',
  '    ⑥ **落分支**：本批按 §4.49 之后新立的 PR 规则走 **dev**（三件三次提交，master 只等 dev 的发布合并）；扩展版本随批 0.4.2 → **0.5.0**（三件都是玩家可见的功能/语义变化，跳次版本）。判据明细 = 冒烟 **#35（扩开关双态）/ #123(e) / #141 / #257(f)(g)(m)** · 🆕 走查 `verify-ui-arts` **A4d** · `verify-ui-auto` **E1~E4**（R1 底部序判据随结构改写）· `verify-ui-bonds` 场景 C 重写 · `probe-bondact` §8 改钉「chip 全可点且无计数文案」。现行计数不手抄：见 `docs/FACTS.md` 哨兵段与任务清单基线行。',
  ''
].join('\n');

splice('docs/三千世界-项目设计文档.md', '| 文档版本 |',
  '| 文档版本 | v2.79（**GitHub issue 三件处置批 · 2026-10-14 · 第卅三批**）：§七A 立第 **76** 条（#4 赠丹撤销永不生效的日限假计数 · #3 主修由玩家点定 `ws.artsMain`、回落第 1 位保旧档 · #2 自动炼化开关 `ws.gearAutoRefine`，库满仍回落）。同批升版 = 工程规范 **v2.69**（§3.2 字段表两行新增）‖ 任务清单 **v1.78**（🆕 N42~N44）。〔v2.78 原注逐字保留于本节末「附录 · 版本志」最前，不改写历史〕 |',
  /^\| 文档版本 \| v2\.77（/, ENTRY, /^## 八、目录结构与工程约定/);

splice('docs/三千世界-工程规范与验收计划.md', '| 版本 |',
  '| 版本 | v2.69（**GitHub issue 三件处置批 2026-10-14 · 第卅三批**）：§3.2 存档字段总表新增 **`artsMain`**（玩家点定的主修，脏值 / 出槽 ⇒ 回落第 1 位 = 旧档语义）与 **`gearAutoRefine`**（自动炼化开关，缺省 true = 改前行为逐字相同；关 ⇒ 旧件与新件先入库藏阁，**库满仍回落炼化**）两行；赠丹日限字段 `alchemy.giftDay` 与常量 `BOND_GIFT_DAILY` 随 issue #4 整族退役（登记表勘正 = 洞府福地卷 §3.2a / §五、炼丹卷 §3.8）。判据同动 = 冒烟 #35 / #123 / #141 / #257 ‖ 走查 auto E1~E4 / arts A4d / bonds 场景 C。批次详情 = 主设计 §七A 第 **76** 条。〔v2.68 原注逐字保留于本节末「附录 · 版本志」最前，不改写历史〕 |',
  /^\| 版本 \| v2\.67（/);

splice('docs/三千世界-代码实施任务清单.md', '| 版本 |',
  '| 版本 | v1.78（**GitHub issue 三件处置批 2026-10-14 · 第卅三批**）：登记 🆕 **N42**（丹毒日限 `ALCHEMY.PILL_DAILY_CAP` 与已退役的赠丹日限**同型**：走同一个 `gameDayOf`、1 游戏日 = 1 现实秒 ⇒ 屏上「丹毒已满（每游戏日 {n} 颗）」几乎永不触发；改它 = 改自服吞吐平衡，属数值裁定，须点头）‖ **N43**（`artsMain` 点定值在「原位替换」顶掉那一部时不跟随，现按回落第 1 位处理；要不要「主修随格走」= 待点头）‖ **N44**（自动炼化开关只在库藏阁有余位时生效，库满仍炼化腾位；要「永不自动炼化」须先处置 `STASH_CAP` 落盘容量红线）。批次详情 = 主设计 §七A 第 **76** 条；现行读数见 `docs/FACTS.md` 哨兵段。〔v1.77 原注逐字保留于本节末「附录 · 版本志」最前，不改写历史〕 |',
  /^\| 版本 \| v1\.76（/);
console.log('BATCH33_ACCOUNTED');
