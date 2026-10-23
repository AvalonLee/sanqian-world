# 三千世界 · DESIGN

多世界框架的放置 RPG 引擎 + 首发玄幻修仙世界（名册 6 界：1 界可投生 + 5 界灰显待开启）。起名 → 择界 → 天赋（一世内可洗髓换 3 枚）→ 挂机修炼 → 渡劫证道，一世终了兵解转世、携遗泽再来。**目前真正可玩的只有修仙一界的「渡劫」线**；古武的「攻关」与另四界仍是设计稿 / 未接入。

**完整设计文档在本地项目归档 `sanqian-world-b836d9da-source/docs/`（41 份现行卷 + `docs/_archive/` 只读归档）**。本文件仅为快照索引，避免双源漂移，故：**版本号一律看 `docs/VERSIONS.md`（全卷现行版本唯一总账），计数一律看 `docs/FACTS.md`（池规模 / 格数 / 断言计数唯一总账）**——本表**不写版本号与条目数**，旧表在卷名后内嵌「（16处）/ v1.0」这类数与版，正是双源漂移的来源（2026-10-07 账实校正批移除）。

<!-- SQ:LEDGER:BEGIN design 现行读数由 .tests/gen-ledger.cjs 生成，手改即漂；段外不参与覆盖 -->
- **现行读数**（本行由 `.tests/gen-ledger.cjs` 生成）：扩展版本 `0.6.12` · 冒烟 327 · 审计 37 关 · 常驻探针 245 断言 · 界面走查 39 篇 / 941 断言 · 词表键 5025 · 世界名册 6 界（可见 6）。缺读数 = 「未跑」，不当 0 计。
<!-- SQ:LEDGER:END -->

### 通用卷（引擎与规范）

| 文档 | 内容 |
| --- | --- |
| `docs/总纲/三千世界-项目设计文档.md` | 总纲：架构 / 世界观 / 决策记录 / 路线图 / 文档地图 / §7A 各批登记 |
| `docs/系统设计/三千世界-系统与数值详细设计.md` | G2~G8 系统规则 + 引擎基准数值表 + 乘区预算 + 节奏仿真 |
| `docs/总纲/三千世界-工程规范与验收计划.md` | 工程规范：存档字段契约 / **断言总表**（编号与冒烟基线以 FACTS 为准）/ 冒烟与审计脚本 / 平台接入（x-hub manifest）/ **§八 工作树持久化纪律** |
| `docs/系统设计/三千世界-角色属性设计.md` | 一级属性框架与乘区口径 |
| `docs/系统设计/三千世界-天赋池设计.md` | 天赋系统总设计（正负天赋 / 抽取与组合规则） |
| `docs/系统设计/三千世界-奇遇事件池设计.md` | 奇遇总设计：三分支 schema / 判定 DSL / 数值带 lint / 创作守则 |
| `docs/系统设计/三千世界-奇遇通用池.md` | 世界无关的通用奇遇内容分卷 |
| `docs/系统设计/三千世界-功法武学·通用规范.md` | 跨世界功法/武学通用规范：品阶带 / 数值预算 / 乘区审计口径 |
| `docs/系统设计/三千世界-洞府福地与护法结缘设计.md` | 引擎卷 G13 洞天福地 + G14 护法结缘：caves/companions/bonds 数据契约与机制 |
| `docs/系统设计/三千世界-江湖传闻系统设计.md` | G17 江湖传闻：批次刷新 / TTL / 红点基线 / 势力战卡联动 |
| `docs/系统设计/三千世界-世界包词族契约.md` | G11：可覆写键族 must/may/forbid 划分 + 三级回落取词 + 新增世界包清单 |
| `docs/UI/三千世界-UI与交互设计.md` | UI 卷：页面布局 / 浮层 / 红点 / toast 与演出清单 |
| `docs/系统设计/三千世界-轮回转世系统.md` | meta 层长线：飞升大劫 / 兵解转世 / 遗泽恒等式与商店 / `meta` 存档对象唯一事实源 |
| `docs/系统设计/三千世界-成就图鉴与人生传记设计.md` | meta 层收集与叙事：图鉴面 / 成就 / 本世传 / 烧表请天道作传 |
| `docs/系统设计/三千世界-同代天骄系统设计.md` | 叙事竞争层：虚拟竞争者月度推进 / 同代榜 / 切磋结缘结仇 / 宿敌心结 |
| `docs/过程档/三千世界-数值复核报告.md` | 阶段性数值审计存档 |
| `docs/总纲/三千世界-代码实施任务清单.md` | 实施任务：**现行未实施表**（销号唯一落点）+ 全局回归 R1~R12 + 风险台账 + 版本志〔21 个已收口批次章 2026-10-09 起在 `docs/_archive/任务清单-批次史.md`〕 |
| `docs/VERSIONS.md` / `docs/FACTS.md` / `docs/README.md` | 三大账本：全卷版本唯一总账 / 计数事实唯一总账 / 归置纪律与卷索引 |
| `docs/_archive/迁移报告-2026-10-04.md` | A/B/C 三版分叉核对与十项体验迁移清单（**迁移已全部落地，含于现行码**；报告本身为过程记录，2026-10-22 归档） |

### 世界专属卷

| 目录 | 内容 |
| --- | --- |
| `docs/玄幻修仙/` | 首发世界：世界设定 / 势力全录 / 功法全录 / 专属事件池 / 专属天赋池 / 专属道友池 / 专属福地池 / 财侣法地四柱框架 + 财柱·法柱分卷 / 精气神属性实现 / 天道系统 / 炼丹炼器 / 功法融合与法宝器灵 / 自立门户 |
| `docs/古武军势/` | 第二世界（**代码未接入**，`registry.js` 为 `coming` + `pack:null`）：世界设定与专属系统 / 武学全录 / 专属天赋池 / 专属战报事件池。⚠️ 创角屏**正名已改「三国无双」**（2026-10-12 第二十批）；目录名与工程 id `guwu` 沿用旧称，全量统一改名 = 任务清单 N30。同批 `magic` 屏上正名改「西方魔幻」，另三界（科技降神 / 现代都市 / 克苏鲁世界）亦为 `coming` |
| `docs/设计稿/` | 十稿视觉稿 + 交互说明 + 总入口（**冻结点 = 2026-10-01**，滞后于文档现行版时以文档为准） |
| `docs/_archive/` | 只读归档区（含 C-体验打磨线整树快照 43 份——**其中 14 份与现行正典同名**，全库检索须先剔除此目录） |


## 当前进度（批次史已归档 · 2026-10-09）

> 本节原为逐批追加的收口日记（`- **P1**` … `- **G0 清点批（2026-10-07）**`，共 479 行 / **184,348 B**，占本件 94%），
> 2026-10-09 由**文档效率批**整段**逐字**移入 `docs/_archive/DESIGN-批次史.md`（未改写 / 未删减 / 未重排），
> 本件不再复制。归档区**只读**，引用须注明「归档」。

**现行状态的实际落点**（本件是快照索引、不充当状态账本；口径见 `docs/README.md` 归置纪律①~⑥）：

| 你要查的 | 唯一落点 | 备注 |
| --- | --- | --- |
| 计数事实（池规模 / 格数 / 冒烟与走查断言数） | `docs/FACTS.md` | 计数唯一总账；本件与历史日记里出现过的数字都不作口径 |
| 各卷现行版本 | `docs/VERSIONS.md` | 版本唯一总账（任一卷升版 = 同批改卷头 + 总账行） |
| 还没做什么 / 销号 | `docs/总纲/三千世界-代码实施任务清单.md` 的「**现行未实施表**」章 | 确证未实施项的**销号唯一落点** |
| 批次详情账本 | `docs/总纲/三千世界-项目设计文档.md` §7A | 批次唯一账本（归置纪律②） |
| 工程口径与存档契约 | `docs/总纲/三千世界-工程规范与验收计划.md` | 存档字段契约 / 断言总表 / §八 工作树持久化纪律 |
| 怎么跑验收 | 本节下方「仓库结构与构建口径」+ `.tests/README.md`（跑绿清单） | 一条命令 `node .tests/run-dod.cjs`，末行 `DOD_ALL_GREEN` |
| 历批收口叙述（归档） | `docs/_archive/DESIGN-批次史.md` | 只读 · 不作为现行口径 |

## 仓库结构与构建口径（改代码、装依赖、打包前先看这一节）

本仓库是 **x-hub 扩展源码**（VibeX 只是它的出身，2026-10-14 已退役），不是 React 应用。里面有两层，**彼此完全不相干**：

| 层 | 位置与体量 | 由谁加载 | 实测事实 |
| --- | --- | --- | --- |
| **扩展本体（真身）** | `manifest.json` 的 `entry` → `view/index.html`（424,761 B，内含 **52** 个 `<script>`）+ `module/index.html`（卡片）；引擎与数据 = `assets/**.js`（**51 个文件 / 19,113 行**） | x-hub 宿主，或浏览器直开 `view/index.html` | 全部是**经典脚本、非 ES module**：`assets/` 与两个入口 HTML 里 `import` / `export` 语句 **0 条**，不引用 `src/`、不 `require` 任何 npm 包；`audit.cjs` B3 钉死「入口 HTML 零外链/零 CDN」，代码全随包走 |
| **平台脚手架（壳）〔已于 2026-10-14 结构整治批A 整族删除〕** | 原 `index.html` → `src/main.tsx` → `src/App.tsx`，外加 `package.json`（原 **68** 个 dependencies + devDependencies）、`vite.config.ts`、`tailwind.config.js`、`tsconfig*.json`、`eslint.config.js`、`components.json`、`public/`、`vibex-local/`、`pocketbase/`、`pnpm-lock.yaml` | 原只被 VibeX 容器工作台用（`npm run dev` / `npm run build`）；现 `package.json` 只声明走查用的 `playwright-core` | 删除前取证（**2026-10-07 当日事实，逐字保留**）：`src/App.tsx` 就是 VibeX **新建项目的默认占位页**（其文件头原注：「仅占位……生成后的应用完全由自己的样式控制」）。2026-10-07 实测 `npm run build` **能成功**（`tsc -b` + vite 8.3.3，16 模块，610ms），但产物 `dist/index.html` 的 title 仍是占位名「**初**」，且 `dist/` 内搜存档键 `sanqian-state-v1` 命中 **0**——**构建产物不含一行游戏代码**。退役口径与「先钉 `playwright-core` 再删」的顺序见 [`README.md` §八](README.md) |

由此三条口径：

1. **改游戏不跑任何 npm 命令**。壳与脚本已随批A 删除（`package.json` 里现在连 `dev` / `build` / `lint` 脚本都不存在），验收一律走 `.tests/`（见下方「回归」）。`dist/` 从来不是本扩展的产物。
2. **原「不要删壳」口径已作废（2026-10-14 结构整治批A · 用户裁定 VibeX 不再使用）**。当时禁删的理由是「删掉应用在工作台里无法预览」，且 `vite.config.ts` 头部明令不得整体覆盖、`rhSourcePlugin()` 必须排在 `plugins[0]`（`enforce: 'pre'`）、`@babel/parser` / `@babel/traverse` / `magic-string` 三个 import 不许删——这些约束的**对象是 VibeX 容器**，容器不再使用后约束随之消失。此处保留理由原文，是为了记录「曾经为什么不许删」，不是留一条还生效的禁令。
3. **两套版本号互不相干**：`manifest.json` 的 `version`（现值见上方账本段，本行不再抄数）是平台扩展版本；设计文档的版本在 `docs/VERSIONS.md`（全卷唯一总账）。两边不同步、不互相套用，也不要把文档版本号写进 manifest。

**回归（改完必跑，只需 node，四条都无浏览器依赖）**：

```bash
node .tests/run-smoke.cjs          # 引擎断言      → SMOKE_ALL_GREEN 295/295（⚠️ 本行原记 265/265、276/276、277/277、279/279、283/283、287/287、288/288、289/289、293/293 均为历批滞后读数，2026-10-08 / 10-09 / 10-10 随批校正）
node .tests/audit.cjs              # 交付前静态审计 → AUDIT_ALL_GREEN n/n（关数以本文件顶部账本段为准）（A6 为报告级；🆕 **A10**（2026-10-11 第十四批 20 → 21 关）= 取数口 ⇔ 世界表键存在性（代码引用了表里没有的键即红；在册例外 `SHOP_SLOTS` 是 #285(d) 的旧数据形状回落支）· 🆕 **A9**（2026-10-10 第十二批 19 → 20 关）= 世界表顶层常量 ⇔ 消费面对表（零消费者 = 死桩，与在册清单双向相等）；A8 自同批起**四段**（+ ④ heirBond 直写白名单）；🆕 B9 = 源侧 ↔ 交付镜像七项逐字节零差异；🆕 A7 = 法宝运行态 st 键集登记对表；🆕 A8 = 「静默失效」普查：账本分类 ⇔ 调用点 · `ws.*` 写点 ⇔ `normalize` 声明集 · `.bonds` 直写白名单；① 逐调用点解析实参 + 调用点数自证 + 反空集护栏，② 是单向包含、③ 是禁写白名单。现值 白名单 in5/out6 ‖ 声明键 91 ‖ note 调用点 34/34 ‖ 写点字段 81）
bash <项目外的 ops 目录>/sq-check.sh   # 开场体检（只读）→ ALREADY_IN_SYNC；收口后另跑 sq-snapshot.sh <批次名>（本机路径不写死在仓库里；仓库外脚本与 tar 快照是本地兜底，公开兜底是 git 远端） → BACKUP_OK
node .tests/sim-pacing.cjs         # 全程节奏比值带（锚 9.12 天）
node .tests/sim-event-economy.cjs  # 在线奇遇事件经济（密度 / 主轴）
node .tests/sim-playthrough.cjs    # 全程模拟（5 路线 + fuzz）→ PLAYTHROUGH_ALL_GREEN；收口双证据 = `SQ_SEED=<种子>` 双跑逐字节相同 + 随机复跑
node .tests/probe-join.cjs         # ┐ 常驻探针十一路（现行 **245 断言 + 1 水位件** = 逐件相加 29+19+31+35+61+8+17+27+10+8 · 无浏览器 · 引擎侧 · 收口必跑，与 `run-dod` 每行打印读数直接对表；⚠️ 本行原记 221 / 222 / 229 / 243 均为历批滞后读数（229 → 243 = 法与器标签化批 `probe-lawmerge` 21 → 35；243 → 244 = 神秘商人节律批 `probe-eventrepeat` 7 → 8 加 §8 新红线））：
node .tests/probe-sectwire.cjs     # │  join 29 / sectwire 19 / heirchoice 31 / lawmerge 35 / achvreach 60 / normround 8
node .tests/probe-heirchoice.cjs   # │  savecodec 17 = 落盘无损压缩往返 · savegrowth 27 = 主档与游玩时长**解耦**
node .tests/probe-lawmerge.cjs     # │  realsave 10 = **玩家真档**读→存→读零丢失（只读不写 · 无档即 SKIP 退 0）
node .tests/probe-achvreach.cjs    # │  逐件守什么见 `.tests/README.md` §3b
node .tests/probe-normround.cjs    # │
node .tests/probe-savecodec.cjs    # │
node .tests/probe-savegrowth.cjs   # │
node .tests/probe-realsave.cjs     # │
node .tests/probe-eventrepeat.cjs  # │ 第十一路：生产抽取全链的玩家可见重复率 + 冷却合规（8 断言 + 6 观察项；神秘商人节律批加 §8「单条最频 ≤8%」）
node .tests/probe-savecap.cjs      # ┘ 存档最坏态水位（阶梯可停 / 对 56KB·64KB 余量）
```

界面层另有 `.tests/verify-ui-*.cjs` 走查（**篇数与断言合计以本文件顶部账本段为准**，2026-10-14 批B 起不再手抄；下文的 533 / 498 等为**历史当日读数留档**〔本句原记 498 = 存档治理批当期读数未随批续刷，链：498 → 511 → 520 → 527，逐篇明细见 FACTS「界面走查断言」行〕；⚠️ 自 2026-10-09 存档治理批起，页内走查件要读日志 / 奇遇叙事流须取**侧档** `sanqian-logs-v1` 的 `logs` / `feed` 段——主档已不含它们，细则见 `.tests/README.md`；⚠️ 本句原记「十七篇 · 298 断言」= 2026-10-07 首次全量实跑时的读数，2026-10-08 冷启与覆盖补批随批校正至现行，逐篇增补链见 `docs/FACTS.md`「界面走查断言」行），需 `npm install --no-save --registry=https://registry.npmmirror.com playwright-core`（官方 registry 本机 `ECONNRESET`）+ 系统已装 Edge，无需下载内核。用法与踩坑见 `.tests/README.md`。其中依赖固定存档件 `.tests/fixture-save.json` 的篇数 = **十二篇**（⚠️ 本句原记「九篇 / 合计 150 断言」为首跑读数；2026-10-08 以 `grep -l fixture-save .tests/verify-ui-*.cjs` 复核为 12 篇，原句按追加不改写留档：batch / cavedot / achvdot / faction / trib / toastdedup / karma / offline / fuse，该件原名 `_tmp_save.json`，2026-10-07 真灵承继补完批已改名；**顶着 `_tmp_` 前缀的正式测试资产会被「清理临时脚本」误删，别改回去**。别改回去**。

> ⚠️ **`node_modules` 永远不进交付包**：它在 `.gitignore` 内（现约 487 MB）。`playwright-core` 自 2026-10-14 结构整治批A 起是 `package.json` 里**唯一声明的依赖**（devDependencies `^1.63.0`）——此前它靠 `npm install --no-save` 临时装、**从未写进清单**，属于「精简依赖后重装 ⇒ 26 篇走查当场全废」的隐患，故本批改口径为**先入册再清理**，锁文件与 68 个平台依赖随 VibeX 退役一并删除。另注意 `audit.cjs` 是**整树遍历**的，2026-10-07 前对 `node_modules` 没有排除，一装依赖就 4 GB heap OOM 崩掉——现已在 `walk()` 内对 `node_modules` / `dist` / `dist-ssr` / `build` 剪枝。**推论：交付前静态审计的扫描范围 = 事实源范围，开发期依赖与构建产物不该进闸门。** **本段读数是判据不是历史**：现行读数一律以 `docs/FACTS.md`（冒烟 / 走查 / 常驻探针三行）与 `.tests/README.md`（跑绿清单）为准，本索引件只是快照 —— 收口时**三处同批改**，只改一处就是账本漂移。

交付只认 `extensions/com.avalonlee.sanqian-world/` **这一份事实源**（宿主直接挂这个目录；仓库内不再有第二份副本可比对）。〔**2026-10-14 GitHub 整理批**：原 **B9**「源侧 ↔ 镜像七项逐字节零差异」退役——根侧副本已删，122 个重复文件归零；接管的 **D4** 反过来守「扩展根七项齐备 ‖ entry 件存在 ‖ 仓库根不得复活第二份源 ‖ docs 与 README 在位」。失去的「单侧回退可反向救回」能力由 git 远端 + 仓库外 tar 快照承担。〕〔**2026-10-14 结构整治批D 收口**：VibeX 退役已执行到底——原 `vibex-app-source-roundtrip` SKILL 与 `package_vibex_upload.py`（`.vibex/` 整族）已删除，`AGENTS.md` 改写为 x-hub 交付与验收口径并升为 **agent 指引唯一正典**，`CLAUDE.md` 与 `.cursor/rules/project.mdc` 只留一行指针（原 `vibex-source-roundtrip.mdc` 随批改名）。原先那句「回传打包按 `.vibex/skills/…SKILL.md`」不再适用，本行即其替代口径。〕

## 本地预览

浏览器直开 `view/index.html`（无桥自动走 localStorage 回退、主题走兜底色；窗口拉宽到 ≥720px 即触发双栏，收窄回单栏）；卡片形态用 `module/index.html?xhub-variant=compact|standard|wide` 预览。

真机按 x-hub 指南：扩展中心 →「我的扩展」→ 添加本源码目录（**添加即加载，无需开关**，改代码约 1.5 秒自动重载，移除目录即撤销）。四种形态的入口：

| 形态              | 进入方式                                                         |
| --------------- | ------------------------------------------------------------ |
| view            | 侧栏点扩展，或卡片点按（`runtime.open('view')`）                          |
| window / drawer | 扩展中心该扩展行的「打开位置」选择器                                           |
| module          | 设置 →「工作台 → 自定义布局」把卡片拖进网格；编辑器里用形态芯片选 标准 / 紧凑 / 通栏，用「Aa」开关宿主表头 |
