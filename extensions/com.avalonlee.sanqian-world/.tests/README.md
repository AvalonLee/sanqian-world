# `.tests/` 测试资产说明

本目录是三千世界扩展的**回归资产**，分四层：引擎断言（冒烟）、静态审计、仿真/探针、界面走查。
改动代码后请按「快速复跑」跑一遍；改动界面（`view/index.html`）时额外跑 UI 走查。

---

## 快速复跑

**一条命令版（2026-10-08 文档效率批新增，推荐收口用）**：

```powershell
node .tests/run-dod.cjs          # 快速预检：无浏览器依赖 14 件 + 版本总账对账
node .tests/run-dod.cjs --ui     # 追加界面走查 25 篇（逐篇末行由脚本求和，不手算）
node .tests/run-dod.cjs --sim    # 追加 sim-playthrough 全量
node .tests/run-dod.cjs --full   # 两者都要 = 收口终检
```

判据 = 末行 `DOD_ALL_GREEN n 件 / 断言合计 m`；任一子件红 ⇒ `DOD_FAILED …` 且退码 1。
立因：本文件的「DoD 预检」原是 14 条手敲命令 + 走查 25 条，历批收口全靠临场 shell 循环现拼；而本仓纪律明确要求**逐篇读数由脚本求和不手算**（FACTS 那条「十七篇却只列 16 篇、282+16=298 恰好闭合」的勘误正是手算出来的）。`run-dod.cjs` **只调用既有脚本、不新建判据口径**，红绿完全取被调件自己的末行标记，另含 `versions-check`（不 `--fix`：收口时就该是已同步态，漂了直接红）。

**DoD 预检（无浏览器依赖，必跑）** —— 在扩展根目录执行：

```powershell
node .tests/run-smoke.cjs
node .tests/audit.cjs
node .tests/sim-pacing.cjs
node .tests/sim-event-economy.cjs
node .tests/sim-playthrough.cjs
node .tests/probe-join.cjs
node .tests/probe-sectwire.cjs
node .tests/probe-heirchoice.cjs
node .tests/probe-lawmerge.cjs
node .tests/probe-achvreach.cjs
node .tests/probe-normround.cjs
node .tests/probe-savecodec.cjs
node .tests/probe-savegrowth.cjs
node .tests/probe-realsave.cjs
node .tests/probe-eventrepeat.cjs
node .tests/probe-savecap.cjs
node .tests/versions-check.cjs
```

判据：出现 `SMOKE_ALL_GREEN n/n`、`AUDIT_ALL_GREEN`、`PACING_ALL_GREEN`、`EVENT_ECON_WATCH`（机制断言 10/10）、`PLAYTHROUGH_ALL_GREEN`、`JOIN_ALL_GREEN` / `SECTWIRE_ALL_GREEN` / `PROBE_HEIRCHOICE_ALL_GREEN` / `LAWMERGE_ALL_GREEN` / `ACHVREACH_ALL_GREEN` / `NORMROUND_ALL_GREEN` / `SAVECODEC_ALL_GREEN` / `SAVEGROWTH_ALL_GREEN` / `REALSAVE_ALL_GREEN` / `EVENTREPEAT_ALL_GREEN`、`PROBE_SAVECAP_DONE`、`VERSIONS_IN_SYNC`（漂移时末行 `VERSIONS_DRIFT n` ⇒ 跑 `--fix` 后复跑）即为绿灯。

> ⚠️ **2026-10-08 存档瘦身批又补两件**：① `probe-savecodec.cjs`（第八路常驻探针，17 断言）守落盘无损压缩的**往返无损 + 阶梯保险未失修 + 降级不故障 + 读不动必须显式报错**；② `versions-check.cjs` 把 `docs/VERSIONS.md` 版本总账与**各卷卷头**自动对账（立因：本批实测总账表格整片滞后于卷头，而散文追记里却写着刚升的版本 = 同一文件内账实自相矛盾，**能自动对的账不该靠手抄**）。`storage-read.cjs` 是离线读平台 `.storage.json` 的调查件辅助（`probe-selflearn` / `probe-tdmemo` 用），**不作任何容量或无损判据**——那些一律走 `core.js` 的编解码。
> ⚠️ **2026-10-09 存档治理批再补四件**：① 🆕 `probe-savegrowth.cjs`（**第九路**常驻探针，27 断言 · 判据按 ≥400 轮标定 · 同种子双跑逐字节相同）——它把「单文件越玩越大」量成曲线：用生产 writer 连跑 600 次真奇遇结算，断言**主档字节平坦**而展示流增长只出现在侧档；含**反向验证**（摘掉 `stripSideFlows` 即触发全阶梯）与**旧档迁移闭环**（feed 仍在主档的旧档 → 首读沿用 → 存一次自动迁入 → 再读一条不丢）。② **走查件读展示流的红线变了**：`ws.log` 与 `ws.eventHistory.feed` 落盘时都不在主档里，页内 `localStorage.getItem('sanqian-state-v1')` 取不到它们——要读叙事流须取侧档 `sanqian-logs-v1` 的 `feed.<wid>`（`verify-ui-auto.cjs` 两处判据同批改读，判据本体不变）；离线读件请用 `.tests/storage-read.cjs` 新加的 `readFlows()`（它按「侧档优先、缺该族回落主档遗留」的与 core.js 同口径处理，别自己拼）。③ 🆕 `probe-realsave.cjs`（**第十路**，10 断言）以**玩家真实档**为输入做读→存→读零丢失取证（本批的侧档签名缺陷即由此类「真档口径」暴露）；④ **压缩阶梯就地级 ⓪~⑤ 已纯函数化**，所以「落盘被裁」与「内存态被改」从此可分判——新增容量类判据请**两侧都核**（只比内存态会把摧毁性缺陷读成绿灯，#258 就是先例）。
>
> ⚠️ **2026-10-09 存档水位与奇遇重复率批再补两件**：① 🆕 `.tests/probe-eventrepeat.cjs`（**第十一路**常驻探针，7 断言 + 6 观察项）——首个「玩家可见重复率」口径，取代此前「sim 的重复次数」那种既非窗口、也不查冷却的读数；② 曾新增 `.tests/verify-ui-savelevel.cjs`（第廿六篇界面走查，13 断言，两判专打「视图显示的字节数与盘上那份值逐字节同源」）——**同日按用户口径撤销**：存档度量不做玩家界面呈现（「存档水位这些文字描述和用户没有直接关系，只是系统设计问题，不需要在设置中表述出来」，唯一落点 = 工程规范 §3.6 产品边界），该篇随件删除、走查回到廿五篇 498 断言，度量侧回归改由冒烟 **#283** 独力承担（引擎 `SQ.SaveStats` 保留作判据出口）。**反向取证仍成立的两件**：探针在 60 步下 §1 如实红（样本不足不许谈窗口统计）+ 用「轮转取 id 无视冷却」合成序列验证同一条合规表达式会报 3 处违例 ⇒ 真跑里 v=0 不是恒真。
> ⚠️ **2026-10-09 坊市标签批随批改一篇**：`.tests/verify-ui-market.cjs` **15 → 24 断言**（M15~M23 货架卡片「词缀 chip + 分类 chip」矩阵 + 特席同源 + 留空面 + **门中供给同一对标签**），走查现行合计 = **廿五篇 520 断言**。⚠️ 本篇上方两处历史逐篇清单（十七篇 298 / 十八篇 314 那两行里的 `market 15`）属**当日事实，逐字不改**——改历史行等于把「当时确实只有 15 条」抹掉；现行读数只在本行与 `docs/FACTS.md`「界面走查断言」行登记。**立则随批入册**：走查 fixture 里的 id 一律从数据表取（`pack.treasures.byId` / `pack.artsMap()` / `D.GEAR_SLOTS`），**不写字面量**——本批首版法宝 id 靠猜，直接触发一次空引用，看着像产品缺陷其实是测试数据按假设造。
>
> ⚠️ **抽样类判据必须固定种子**（2026-10-09 存档治理批立，起因见任务清单「存档治理批」章 D 组）：凡用 `Math.random` 抽数千次再比 `±pp` 容差的判据（冒烟 #59 首当其冲；同族四处已在同批全部种子化收口：**#59 / #105c / #60 / #125**（#105c 的注释曾自陈因「偶发超界」把样本从 1 万加到 2 万 = 本族前科，加样本不解决判据性质，种子化才解决）；#112 等其余 `Math.abs` 型判据经核为**确定性算式**，不属本族。种子化的验收方式 = 连跑两次逐字比对抽样读数（本批实测三条读数两次运行逐字相同），在 2~3σ 的容差下**单跑红率就有 1~3%**，红一次到底是回归还是噪声无法分辨。新写此类判据一律先 `mulberry32` 定种子、**窗口结束后立刻把 `Math.random` 还原**（漏还原会把后续全部断言打成 `Math.random is not a function` 类崩溃——本批插入锚失配时就踩过一次），并在标题里写明「固定种子」；存量未种子化的抽样判据属**已知风险项**，改动它们的那一批要顺手收掉。
> ⚠️ **收口证据口径**：`SQ_DAYS` 缩放态（`sim-playthrough` 开发用日预算钩子）的读数**不得**用作收口证据，缺省 `SQ_DAYS=1` 才是真机口径。
>
> ⚠️ **`SKIP` 不等于「判据在跑」**（2026-10-09 版本控制纳管批立，实测代价）：探针里凡是「本机环境不满足就跳过并退 0」的判据，**DoD 全绿时它可能根本没执行**。本批照出两例——① `probe-savecodec` 的 F 相（真实玩家档可解 F1/F2）自宿主移除平台安装目录起静默 SKIP，而 FACTS 仍记着「17 断言」这个**曾经为真**的读数；② `probe-realsave`（第十路）整件 `REALSAVE_SKIP`、只打了 10 个 PASS 的历史账。修法 = **判据自己找得到对象**：真档路径一律走 `.tests/storage-read.cjs` 的候选试探（`SQ_STORAGE` > 平台安装目录 > 仓库镜像根 > 工作树根），`probe-realsave` 同批改硬编码为逐一试探、`REPO` 也改 `path.resolve(__dirname, '..')` 不再钉死绝对路径。**新写 SKIP 分支时把「跳过时的断言计数」一起登记进 `docs/FACTS.md`**，否则计数账本会长期停在环境还在的时候。

> ⚠️ **2026-10-08 校正本段滞后**：上面这串此前只列四件（smoke / audit / pacing / event-economy），而 `sim-playthrough` 与六路常驻断言探针（join / sectwire / heirchoice / lawmerge / achvreach / normround）+ `probe-savecap` 水位件早已是收口必跑项、却从未进过这份清单——照旧清单跑会把「已跑绿」误读成「跑全了」。逐件断言数登记在 `docs/FACTS.md`「常驻探针」行（现 **七路 · 168 断言 + 1 水位件**）。〔🔧 **2026-10-09 版本控制纳管批随读**：本句括号为校正当次的读数，现行 = **十一路 · 243 断言 + 1 水位件**（2026-10-09 存档水位与奇遇重复率批 +`probe-eventrepeat` 7）；且原句本身自相矛盾——168 恰是**六路**（join 29 + sectwire 19 + heirchoice 31 + lawmerge 21 + achvreach 60 + normround 8）之和，`probe-savecodec` 17 在同段上一行单列却漏加，「七路 185」才对。教训与 FACTS 同一行记的一致：**行首改路数、行尾不改总数**是账本漂移的典型形态，逐件相加才是可对账的写法。〕收口双证据：`SQ_SEED=<种子>` 双跑逐字节相同 + 随机种子复跑（`sim-event-economy` / `sim-playthrough` 两件适用）。

**界面走查（需 playwright-core + Edge，改界面时跑）**：

```powershell
$env:NODE_PATH="<含 playwright-core 的 node_modules 绝对路径>"
node .tests/verify-ui-rumor.cjs
node .tests/verify-ui-batch.cjs
node .tests/verify-ui-auto.cjs
node .tests/verify-ui-zone.cjs
node .tests/verify-ui-achv.cjs
node .tests/verify-ui-arts.cjs
node .tests/verify-ui-market.cjs
node .tests/verify-ui-journal.cjs
node .tests/verify-ui-cavedot.cjs
node .tests/verify-ui-achvdot.cjs
node .tests/verify-ui-offline.cjs
node .tests/verify-ui-trib.cjs
node .tests/verify-ui-tiandao.cjs
node .tests/verify-ui-faction.cjs
node .tests/verify-ui-toastdedup.cjs
node .tests/verify-ui-karma.cjs
node .tests/verify-ui-fuse.cjs
node .tests/verify-ui-bonds.cjs
node .tests/verify-ui-heirchoice.cjs
node .tests/verify-ui-chains.cjs
node .tests/verify-ui-a6blindspot.cjs
node .tests/verify-ui-join.cjs
node .tests/verify-ui-coldstart.cjs
node .tests/verify-ui-badsave.cjs
node .tests/verify-ui-alltabs.cjs
```

判据：出现 `UI_RUMOR_ALL_GREEN` / `UI_VERIFY_ALL_GREEN` / `UI_AUTO_ALL_GREEN` / `UI_ZONE_ALL_GREEN` / `UI_ACHV_ALL_GREEN` / `UI_ARTS_ALL_GREEN` / `UI_MARKET_ALL_GREEN` / `UI_JOURNAL_ALL_GREEN` / `UI_CAVEDOT_ALL_GREEN` / `UI_ACHVDOT_ALL_GREEN` / `UI_OFFLINE_ALL_GREEN` / `UI_TRIB_ALL_GREEN` / `UI_TIANDAO_ALL_GREEN` / `UI_FACTION_ALL_GREEN` / `UI_TOASTDEDUP_ALL_GREEN` / `UI_KARMA_ALL_GREEN` / `UI_FUSE_ALL_GREEN` / `UI_BONDS_ALL_GREEN` / `UI_HEIRCHOICE_ALL_GREEN` / `UI_CHAINS_ALL_GREEN` / `UI_A6BLINDSPOT_ALL_GREEN` / `UI_JOIN_ALL_GREEN` / `UI_COLDSTART_ALL_GREEN` / `UI_BADSAVE_ALL_GREEN` / `UI_ALLTABS_ALL_GREEN`（共 **廿五篇**，逐篇断言数与增补链见 `docs/FACTS.md`「界面走查断言」行 = 现 **498 断言** = 449 + badsave 31 + alltabs 18）。

> ⚠️ **`verify-ui-coldstart.cjs` 是唯一「不注入存档、真点完创角流程」的一篇**：廿三篇里 **12 篇直接灌 `fixture-save.json`**、其余用 `addInitScript` 页内写状态起步，全库碰过创角按钮的只有两篇——`verify-ui-a6blindspot`（停在「未择界就报错」这条失败分支）与本篇（起名 → 择界 → 观天赋 → 入定 → 主界面 → 首 tick → 刷新读档走完）。所以本篇**不吃 fixture，也别给它 fixture**；它要求 context 干净无档。

> Windows 下命令末尾若打印 `TRAE Sandbox Error: hit restricted`，那是 Edge 无头进程往 `%LocalAppData%`
> 写自身缓存被沙箱拦截的**环境噪声**，不是用例失败——以脚本自己打印的 `*_ALL_GREEN` 与退出码为准。

---

## 脚本清单

### 1. 引擎断言（无浏览器依赖）

| 文件 | 用途 | 用法 |
| --- | --- | --- |
| `run-smoke.cjs` | 无头冒烟运行器（node vm 沙箱），加载 `smoke.js` 全量断言 | `node .tests/run-smoke.cjs` |
| `smoke.js` | 冒烟断言全集（编号对齐《工程规范与验收计划》§四）· 现行 **276 条全绿**（⚠️ 本行原记「265 条」为 2026-10-07 历批滞后读数，2026-10-08 裁定收口批按尾注校正；编号 ≠ 条数，见 `docs/FACTS.md`「冒烟断言」行）· 2026-10-07 earnedKeys 折叠批 +#258、死链修复批 +#259、真灵承继补完批 +#260；#259 判据同批**改窄**为「选件—搬运」守卫，状态判定交 #260 · 2026-10-08 携才投效批 +#270~#273、裁定收口批 +#274~#276 | 由 `run-smoke.cjs` 加载；也可用 `smoke.html` 在浏览器跑 |
| `smoke.html` | 浏览器版冒烟运行页（无桥 localStorage 回退分支） | 浏览器直开 |
| `sandbox.cjs` | 共享 vm 沙箱装载器——**加载顺序 = `view/index.html` 的 `<script>` 顺序**，被多个脚本共用 | 被 require，不单独运行 |

### 2. 静态审计

| 文件 | 用途 | 用法 |
| --- | --- | --- |
| `audit.cjs` | 交付前静态审计 **19 关**（2026-10-07 死链修复批由 14 → 16 · 2026-10-09 版本控制纳管批由 16 → 17 · 同日展示流与落档口径批由 17 → 18 · 🆕 2026-10-10 耦合缺陷收口批由 18 → 19 = **A8**）：词表 4.3 源码半区（A1 CJK 白名单外零命中 / A2 key 对账 / 🆕 **A5** 道友 `align` 契约必填 / 🆕 **A6** 词表键消费侧反向扫描 / 🆕 **A7** 法宝运行态 `st` 键集登记对表）+ DOM id（A3）+ 界面拉丁词（A4）+ 世界包词族契约 C1/C2 + 平台关卡 4.9 八项 B1~B8 + 🆕 **B9 交付镜像一致性**（源侧 ↔ `extensions/com.avalonlee.sanqian-world/`：`assets`/`view`/`module`/`.tests` 四目录递归逐字节 + `manifest.json`/`icon.svg`/`DESIGN.md` 三单件，单侧多缺文件同算漂移，`.storage.json` 两侧排除）+ 🆕 **A8「静默失效」普查**（三段双向对表：① `SQ.Ledger.note` 调用点分类 ⇔ `IN_CATS`/`OUT_CATS` 白名单——双向都判（未登记分类 = 漏记；在册零调用点 = 占位空类复活）；② `ws.<字段> =` 写点 ⇔ live 世界包 `pack.normalize({})` 键集——幽灵字段读档即丢；③ `bonds[...] =` 元素直写白名单（只许 `bonds.js` 与 `worlds/<id>/index.js`，扫描面含 `view`/`module`）。护栏 = 声明键数 >50 反空集 + 白名单读源码字面量 + **剥注释再扫**） | `node .tests/audit.cjs`；A6 调试口：`A6_DUMP=1` 打印逐条孤儿键与正文、`A6_CHECK=k1,k2` 打印指定键的判据来源（自查粗前缀假阴） |

> **A6 读法（重要，2026-10-07 立）**：孤儿键清单**只有假阴、没有假阳**——判据是「键名没以字面量出现在代码/视图里，也不被任何拼接前缀覆盖」，而粗前缀会吞整族（`gear.js:25` 的 `'gear.' + slot` 使已知孤儿 `gear.latest` 被判「已覆盖」）。〔🔧 **2026-10-07 真灵承继补完批勘误 · 上方原句逐字保留**：本行原自评「只有假阴、没有假阳」**已被证伪**，查出两处盲区——① 扫描排除条件写坏，分卷 `assets/worlds/*/lexicon-*.js` 被当作*代码*文件扫描 = **词表在认证自己定义了自己**，真孤儿被系统性藏掉（修正后 42 → 97）；② 拼接生成键消费点（`legacy.shop.qirate` 加下标型）未被识别为动态前缀 = **活键会被误列**（补采后 97 → **89 key / 50 族**）。现行读法 = 「**列出的多为必死、未列出的未必活**」，逐条清理前须用 `A6_CHECK=<键>` 取判据来源人工确认；教训 = **一条反向扫描判据在正反两向都抽查过之前，不得声明误差方向单一**。〕；本关**报告级恒 PASS**（「词表先行、触发点后补」是本仓既有工序，硬门禁会误伤每个扩容批），价值 = 让「键写了没人读」每次审计都可见，而不是等人翻 FACTS。〔🔧 **2026-10-08 裁定收口批随读**：现行 **62 key / 43 族**（判据补齐大写字符类 + 双引号内联 + 拼接式大小写 ⇒ 67 → 63，同批再收 1 条 → 62）；补齐判据当场照出两处真缺陷（`fuse.ui.fail.{full,unknown}` 裸英文上屏、淬炼 `unknown` 静默无提示），已随批接线结案。**待删清单 = 62 条 = 任务清单 N20**，删与不删属产品裁定、agent 不动文案。〕
>
> **A5 立例背景**：世界包契约把 companions 的 `align` 列为**必填**，但此前 `audit.cjs` / `smoke.js` 零断言守它——「实测 58/58 齐全」是**数据自洽**不是**门禁通过**，扩容批漏填会静默把阵营同向判定打成 `undefined` 比较。
>
> **B9 立例背景（2026-10-09 版本控制纳管批）**：「源侧 ↔ 镜像七项零差异」是本仓最强的一条不变量（两次单侧回退都靠它反向救回），却**只写在工程规范 §八、靠人敲 `diff -rq` + 收口时口头承诺**——本轮存档治理批实测**两次**源侧改完忘了同步镜像（一次靠 `git status` 照出、一次由 B9 自己首跑照出）。教训与 A5 同源：**只落在文档里的不变量等于没有不变量，能自动跑的才叫门禁**。四种漂移形态（等长改内容 / 镜像多文件 / 源侧缺文件 / 单件漂移）立例当次全部如实 `FAIL` 且退码 1，逐条复原后复跑回绿；判据细节见 `docs/FACTS.md`「静态审计关卡」行。起跑位置**源码树根与镜像根皆可**（按 `assets`+`manifest.json` 自动辨向；两侧不可辨时如实 FAIL，不静默放过）。
>
> **A7 立例背景（2026-10-09 展示流与落档口径批）**：`ws.treasures.owned[].st` 是**无 schema 的透传面**（`treasures.js` 的 normalize 整块带过），任何新字段一旦写进去就永久随玩家档走——存档治理批把它列为遗留项，本批的裁定是 **登记制而非运行时收敛**：白名单砍键会砍掉未来合法字段、还会破「读档往返无损」那一族判据，代价大于收益；改为「写点必须先登记进 `SQ.Treasures.ST_KEYS`」，由 A7（静态扫 `assets/**` 的 `.st.<key>` 写点与本表**双向对表**：有写点未登记 = 没走口径评审，有登记无写点 = 死登记，**表读不到直接红**）+ 冒烟 **#281**（运行时半边：透传语义交底、真入口观测**非空才作覆盖**、塞表外假键必检出）两道守。⚠️ 已知盲区 = 只扫 `assets/**`，`view/` `module/` 内联脚本的读点不在范围（与 A5「只覆盖修仙包」同型，如实登记）。同批另立 **#280**（侧档两族字节裁剪一律纯函数——旧实现下实测「内存 log 400→275 / feed 80→56」，即一次落盘就削短玩家内存）与 **#282**（传记 6/9 三口径改走 `SQ.BioCaps` 单一取数处，判据形态 = **改表 4/2 看三处是否同动**，证的是消费关系而不是数字对得上）。

> **A8 立例背景（2026-10-10 耦合缺陷收口批）**：同批抓获的两件真缺陷**形状相同**——**写了、没有承接方、且没有任何一处会红**（冒烟 285/285 一路绿着放行）：`treasures.js` 两处 `note(ws,'out','treasure')` 而 `OUT_CATS` 从未登记该分类，而 `note()` 的**合法静默拒绝**（对非法分类返 0，v1.2 为防占位空类立的门）于是使「漏登记」变成零症状丢账（灵石真扣、总账不记、#113 恒等式必漂）；`factions.js` 写 `ws.factionJoinedAt` 而 `initialState` / `normalize` 均未声明 ⇒ 读档即丢、全仓又零读者。教训与 A5 / B9 / A7 同源：**能靠人眼盯 diff 抓到的缺陷不算抓到，只有变成每次审计都跑的普查才算门禁**。⚠️ 两处自坑随批登记：首跑被**本关自己的说明注释**里那句 `ws.factionJoinedAt` 绊成假红 ⇒ 普查类关卡一律先 `stripComments`；第一版声明集取自 audit 自身的静态装载剖面（那里 `SQ.Worlds[id].pack` 是 `null`）⇒ 键集为空、`⊆` 恒真、整关**空转全绿**，改借 `sandbox.cjs` 装载器并加「声明键数 >50 才放行」的反空集护栏才成立。已知边界如实登记 = 本关只管「写了没人接」，**跨模块越权写已声明字段**（任务清单 **N22 ①**：sect 写 `ws.factionWar` / fusion 直改 `ws.artsLevels` 等）不在射程——那属「谁有权写」，需另立字段属主契约。

### 3. 仿真 / 探针

| 文件 | 用途 | 用法 |
| --- | --- | --- |
| `sim-pacing.cjs` | §6.4.1 全程节奏比值带复跑（引擎常量驱动，锚 ≈9.12 天） | `node .tests/sim-pacing.cjs` |
| `sim-event-economy.cjs` | 在线事件经济观测（密度/主轴，登记不阻塞）· 🆕 **2026-10-07 种子批**：加 `[轮数] [种子]` / `SQ_SEED` 确定性随机（mulberry32 覆写宿主 `Math.random`，同 `sim-playthrough` 形态），给定种子 → **输出逐字节可复现**，「观察项」随之升为可复现判据（此前裸随机、v2.33 起只能登记「不作判据」）。收口双证据同 playthrough = 固定种子双跑逐字节相同 + 随机种子复跑。⚠️ 轮数 > 200 直接 `FAIL arg-repeats` 退 2（防把种子写进第一位跑出天文级循环，实测挂死过一次）；只给种子用 `SQ_SEED=<种子> node …` | `node .tests/sim-event-economy.cjs [轮数，缺省 12] [种子，缺省随机]` |
| `sim-playthrough.cjs` | 真机模拟走查：A 新手 / B 全系统 / C 随机 fuzz 三路线，走真实事务通道 | `node .tests/sim-playthrough.cjs [轮数，缺省 2]` |
| `probe-deepbatch.cjs` | 系统深化批数值探针（**一次性校准脚本，非 CI 断言**） | `node .tests/probe-deepbatch.cjs` |
| `probe-selflearn.cjs` | 自悟（自行领悟）速率探针：读真实存档跑虚拟时间，输出首部耗时分布 / 在线 8h 收获 / 单次离线回归收获（**一次性调查脚本，非 CI 断言**） | `node .tests/probe-selflearn.cjs` |
| `probe-tdmemo.cjs` | 问天奏疏**内容**探针：读 `.storage.json` 真实存档 → 旁路冷却与灵石 → 调 `SQ.Tiandao.ask` 生成奏疏，打印全文与契约四行（卦位 / 档位 / 旨意清单 / 编年史）命中情况（**一次性调查脚本，非 CI 断言**） | `node .tests/probe-tdmemo.cjs [hexId] [incenseIdx]` |
| `probe-tdmemo-ui.cjs` | 问天奏疏**复制链路**探针：造带编年史存档 → 直开 `view/index.html` → 点生成 → 读 `#mtd-memoout` 实际内容 → 点复制 → 读剪贴板比对（**一次性调查脚本，非 CI 断言**） | `node .tests/probe-tdmemo-ui.cjs` |
| `measure-savecost.cjs` | **按需单跑件（不入 DoD、不设阈值）**：用生产 writer 造一只 600 次真奇遇结算的胖档，量存档层构造成本（`savePayload` 与含两次写的 `SQ.save` 各多少次/毫秒），改完存档层跑一次把读数写进 FACTS / 任务清单 | `node .tests/measure-savecost.cjs [次数，缺省 200]` |

### 3b. 常驻探针（无浏览器 · 引擎侧断言 · 收口必跑）

上表 §3 里的 `probe-deepbatch` / `probe-selflearn` / `probe-tdmemo*` 是**一次性调查脚本**（出数即弃、不进绿灯判据）；下面这九件常驻断言探针（另加 `probe-savecap` 水位件，共 10 行）不是——它们是**收口必跑的常驻断言**，每件立档理由写在文件头注释里，逐件断言数同步登记在 `docs/FACTS.md`「常驻探针」行（现 **168 断言 + 1 水位件**）。

| 文件 | 守的是什么 | 用法 |
| --- | --- | --- |
| `probe-join.cjs`（**29**） | 天骄「登门求入门」全链：常量**归属块**反证（五枚 `JOIN_*` 在 `D.PRODIGY` 不在 `D.SECT`，且改表即改行为）· `Prodigy.tick` 月掷真落弟子 · bond / 世仇 / 名额三门先行 · 正收·婉拒·魔判定胜三分支 · 魔道败北两出口（结仇 vs `Bonds.lose` −5）· 道侣乘区比值 · `ws.sect` 键集不变 | `node .tests/probe-join.cjs` |
| `probe-sectwire.cjs`（**19**） | 自立门户三环「真的动了数字」：丹房 0→1 使 `craftP` 与 `hasFurnace` 双变（含 `collectCraft` 真出炉）· 宗规 right vs evil 使弟子战力 / 宗门战力 / 战功三处不同 · 天象短评与编年史措辞不同而机制四字段全等 | `node .tests/probe-sectwire.cjs` |
| `probe-heirchoice.cjs`（**31**） | 承继择定三态（未择定 / 择定某件 / 显式不带）一路跑到**出账端**（下世 `owned` + `st.spirit` 实态）并验降级与幂等——不是查读字段 | `node .tests/probe-heirchoice.cjs` |
| `probe-lawmerge.cjs`（**21**） | 「法与器」合并页四段渲染器（`lawareBar` / `secDiv` / `artsBody` / `gearBody`）的无浏览器拼接体检：从 `view/index.html` 抽真源码 + 真引擎数据 + 最小 DOM 桩，断言五段齐全、纵向有序、零 `undefined` / `NaN` / 裸 `{` 漏进 HTML | `node .tests/probe-lawmerge.cjs` |
| `probe-achvreach.cjs`（**60**） | 60 条成就**逐条构造满足态、走真入口 `SQ.Codex.scan` 入账** ⇒ 「判据恒假」死成就 = 0 条（本仓历史上真抓到 `achv_juefeng` / `achv_kuashi` 两条）。**边界**：只证判据可满足 + 入账链通，**不证**正常游玩必然走到——后者看 `sim-playthrough` 的 `ACHV_COVERAGE` / `ACHV_UNREACHED` 两行 | `node .tests/probe-achvreach.cjs` |
| `probe-normround.cjs`（**8**） | 读档往返的**结构性**回归：真存档 fixture 注入现行全部新落盘面后过 `SQ.normalize`，逐叶子路径对表 ⇒ 非预期丢键 = 0 · 值改动 = 0 · meta 层零丢键 · 二次 normalize 幂等；三条豁免各带成因并逐条被实测证明存在（不做无名单放行）。这是 N19「读档把天骄好感 `ws.bonds.pr{n}` 整键剪掉」的常设防线 | `node .tests/probe-normround.cjs` |
| `probe-savecodec.cjs`（第八路常驻断言探针，17 断言 · 2026-10-08 存档瘦身批立） | 落盘无损压缩 `d1:` 的**往返无损 + 阶梯保险未失修 + 降级不故障 + 读不动必须显式报错 + 三态全收**（含「真实玩家档可解」F 相 ⚠️ **2026-10-09 版本控制纳管批**：F 相路径改走 `.tests/storage-read.cjs` 候选试探——平台安装目录被宿主移除后本相曾**静默 SKIP 两个判据**而 DoD 照绿，现 F1/F2 在镜像根实时档上真跑） | `node .tests/probe-savecodec.cjs` |
| `probe-savegrowth.cjs`（第九路常驻断言探针，27 断言 · 2026-10-09 存档治理批立） | **主档体积与实际游玩时长是否解耦**：用生产同一 writer（`SQ.Events.resolveBranch` + `SQ.Log.push`）连跑 600 次真奇遇结算并采样曲线，断言 ① 主档字节平坦、② 「治理前等价口径」（展示流留主档的明文态）确实单调变大且量级远大于主档、③ 侧档 `{logs, feed}` 两族各带预算且超预算挤最旧、④ 冷却键落盘策略（本批复核返修）：常规存档**不剪任何冷却键**，强跑阶梯时级③ 只剪「值 < now − SQ.COOL_MAX_HOURS」的可证死键，内存态恒不动、⑤ 旧档首读沿用 → 存一次自动迁入侧档 → 再读一条不丢、⑥ **反向验证**：摘掉 `stripSideFlows` 即把同一份游玩推上全阶梯（防空过护栏）、⑦ 外部清档后签名须复位否则跳过写（本探针实测暴露的缺陷）、⑧ 跨世线性项 `trib.N` 水位。跑在**有桥 + `d1:` 压缩**分支（`sandbox.cjs` `bridge:true`），不是明文预览分支 | `node .tests/probe-savegrowth.cjs [轮数] [种子]`（缺省 600 · `20261009`） |
| `probe-realsave.cjs`（第十路常驻断言探针，10 断言 · 2026-10-09 存档治理批立） | **真机档读→存→读零丢失**：把宿主实时档（🔧 **2026-10-09 版本控制纳管批**：路径由硬编码平台目录改为**候选试探** `SQ_STORAGE` > 平台安装目录 > **仓库镜像根**〔本机现值，宿主已移除平台目录〕> 工作树根，四路全不存在才 `REALSAVE_SKIP`）喂进桥 mock，走真 `core.js` 的 `load/save/load`，断言展示流两族完整落侧档、主档不含它们、**二次读档机制态零差异**（含全部冷却键；恒常剪枝经复核撤回）、#197 恒等式续绿、落盘不大於现值。**只读不写**（不碰平台目录）；真档缺失或未入世 ⇒ `REALSAVE_SKIP` 退 0（换机不假红） | `node .tests/probe-realsave.cjs`（路径可用 `SQ_STORAGE=` 覆盖） |
| `probe-eventrepeat.cjs`（第十一路常驻断言探针，7 断言 + 6 观察项 · 2026-10-09 存档水位与奇遇重复率批立） | **玩家在奇遇页上实际看到的重复率是多少**（用来判「内容池该不该扩」）：走生产抽取全链 `tickOnline`→`fire`→`resolveBranch`，一游戏分钟一步、缺省 20000 步（≈333 游戏小时）×固定种子，产 ① 窗口新鲜率（50 窗 = `EVENT_FEED_CAP`，玩家真能看到的条数）② 同 id 间隔中位/最短与最长连击 ③ 重复集中度 ④ **冷却合规**（同 id 间隔不得短于其 `cooldownHours`，违例须 = 0）⑤ 分档/分性分布。硬判据五条 + 同种子双跑自比；观察项六条**报告级不阻塞**（扩容与调权属产品裁定）。⚠️ 两处建场坑记档：结算**不能**走 `Actions.resolveChoice`（内部 `mutate` 先读档，会把内存里推进的 `eventClock`/`pendingChoice` 整批丢掉，实测 12000 步只出 1 次事件）；`ws.mode` 合法值是 `D.MODES` 的键（`seclude`/`venture`），**没有 `explore` 这一档** | `node .tests/probe-eventrepeat.cjs [轮数] [种子]`；判定用**均值**新鲜率而非末段单窗（后者 8 个种子散布 62%~78%，前者 79.8%~81.1%） |
| `probe-savecap.cjs`（水位件，非断言计数） | 主档最坏态字节水位：压缩阶梯能否停在触发线内、对 56KB 触发线与 64KB 红线的实测余量 | `node .tests/probe-savecap.cjs` |

### 4. 界面走查（`playwright-core` + Edge headless）

以 `file://` 直开 `view/index.html`，用 `addInitScript` 注入手造存档（`localStorage['sanqian-state-v1']`），
再模拟点击并断言 DOM。补齐「冒烟（引擎层）+ 审计（静态层）」缺失的**界面层**回归。

| 文件 | 覆盖断言 | 内容 |
| --- | --- | --- |
| `verify-ui-rumor.cjs` | 8 | 非交战方战况卡只读（无「应战」按钮 + 观望文案）· 传闻红点基线化（既有传闻进线即基线，不恒亮）· **失效卡置灰**（目标事件冷却中 → 按钮 disabled + 「时过境迁」，且仍在列未静默消失） |
| `verify-ui-batch.cjs` | 28 | 菜单「秘境洞天」+ 页内两节（秘境卡片网格 → 洞天福地卡片网格）· 财浮层 tier-1 印章隐藏 · 护法/道侣择选与 `guardianPick` 持久化 · 道友详情浮层解耦（跨秒级 tick）· 势力加入后其余置灰 · 地柱 → 跳「秘境洞天」页洞天节 · 洞天设施仅驻留福地可营建 · **灵田材料说明迁入附属设施描述（6 游戏月 · 1~4 枚）** |
| `verify-ui-auto.cjs` | 22 | 修行页传闻区与自动双开关落位 · 自动奇遇开启时自动结算不弹窗 · 关闭时回归弹窗 · 奇遇倾向四 chips（开启态展开 / 默认无倾向高亮 / 点选魔道持久化 / 关闭态收起 / 倾向分支可用时自动抉择优先该分支） |
| `verify-ui-zone.cjs` | 14 | 秘境页卡片网格（每秘境一卡 · 宽屏多列窄屏单列）· 当前秘境通栏 hero + 内层双栏 · 已首通分组分隔线 · 域主挑战/残片兑换入口 · 非当前卡「切换到此」· 洞天福地内联本页（同构网格 + 当前驻留置顶 hero · 窄屏退单列） |
| `verify-ui-achv.cjs` | 16 | 菜单「成就」入口 · 页顶图鉴十卡（九面 + 转世天赋）· 六组卡片网格（60 卡全在）· 未解锁遮为问号（.lock + 大「？」）· 特殊成就提示达成条件（.ahint 对账 data 的 hint 数）· 页头总进度 N/60 · 轮回页图鉴/称号墙/成就入口已迁出 · 窄屏双网格退单列 |
| `verify-ui-arts.cjs` | 33 | **「法与器」合并页**（页面整合批：功法 + 法器并一页）——A0 导航游戏页 12 项且 `gear` 已移出 GAME_TABS、标签 = 「法与器」（法宝仍独立成页）· A1 概览条 `.laware` 三格（主修/佩器/战力，值非空、均绑 `lawJump`）· A2 段标两段「法」「器」+ 锚点 id `lawsec-fa`/`lawsec-qi` · A3 五段元素与纵向顺序 · A4 法段「自行领悟」节 + 保底进度条 · A5 `#tab-gear` 容器已删 + 器段卡片网格（宽屏 ≥2 列 / 每槽一卡 4 槽）· A6 `lawJump` 锚跳（滚动落定后锚点落在可视带）· A7 法宝页卡片网格 · A8 窄屏器段/概览条退单列 + **导航零标签截断**（横向滚动修复，旧 `flex:1` 布局下此处必挂）· A9 窄屏法宝退单列 · A10 旧档 `tabOrder` 含 `gear` 时导航仍 12 项、未知 id 剔除、**其余项相对序保留不重排** |
| `verify-ui-market.cjs` | 15 | 坊市/黑市各 10 卡且宽屏多列 · 门中供给 4 卡 · 炼丹炼器 ≥3 段卡片 · 天骄榜面前 10 行 + 「10 游戏年」文案 + 玩家榜位 · 三页窄屏退单列 |
| `verify-ui-journal.cjs` | 16 | 日志分类栏 sticky 生效 · **八分类齐全**（UI 卷 v2.20 好感三渠道批由七升八，新增 `bond`「道友」类——此前 `bond` 分类日志早已在写却无筛选入口，只能在「全部」里看到）· 200 行全渲染 · 无横向溢出 · 滚到底仍钉顶 · 吸顶态切分类过滤生效 · 窄屏同样吸顶 · **展示上限**（具体分类只渲染最新 200 条 · 「全部」按各分类 200 合并） |
| `verify-ui-cavedot.cjs` | 7 | 地 chip 渲染 · 基线无红点 · 捐献 100 万→职级 2→水镜山庄解锁→红点亮 · 点 chip 跳洞天节 · 进节消账 |
| `verify-ui-achvdot.cjs` | 8 | 导航「成就」入口 · 基线无红点 · 势力页加入→`achv_rumen` 达成→红点亮 · 进成就页消账 · 离页不复活 |
| `verify-ui-offline.cjs` | 17 | 出关呈报数据网格：离线 6h 首帧弹层 · 标题/副标题（闭关「离线所得」/ 历练「离线历练所得」）· 散文正文 `#mo-body` 已移除 · 四格数字与存档 `lastOffline` 经 `SQ.fmt` 逐字对齐 · 时长走 `ui.time.hm` · 渡劫 n>0 附成/败拆解 · **离线 ≤5min（残留旧记录）不弹层且常驻面板不误伤** |
| `verify-ui-trib.cjs` | 30 | 渡劫呈报（渡劫演出重做批）：幕布非近黑（alpha ≤ 0.5）· 卡面走 `--surface`（浅主题浅卡 / 暗主题暗卡，主题感知）· 深浅两主题文字对比可读 · 成算环 `dashoffset` 与环内百分比自洽 · 胜帧（`.win`/「雷歇云散」/无损失行）/ 败帧（`.lose`/「天雷加身」/含「修为损失」行 + `.bad` 色调）· 数据行（劫前成算/渡劫次数/护法加项）· 点击幕布提前收场 · 零报错 |
| `verify-ui-tiandao.cjs` | 24 | 问天 · 焚表奏疏全链路（复制加固批 + 接旨层级/清空批）：浮层可开 + 卦位六选 + 香火四档 · 奏疏 ≥500 字且含契约四行（卦位 / 本卦旨意清单 / 香火档位 / 编年史头与条目）· 奏疏文本框按内容撑开（不再只露首段）· 生成提示为「已生成（N 字）」不谎报已复制 · 复制到剪贴板的是**全文**（逐字一致，仅换行归一）· 剪贴板被拒 + `execCommand` 失败时降级提示手动全选 · **抗旨二次确认浮在圣旨浮层之上**（`#modal-confirm` z-index 68 + 命中测试可点）· **领旨后奏疏/复制按钮/接旨框清空，重开问天不残留** · 零报错 |
| `verify-ui-faction.cjs` | 13 | 势力页叛离入口可见性 + 供奉 2h 窗口：叛离入口 ≥2 处（当前效力区块 + 势力卡）且顶部入口首屏可见可点 · 去向浮层「好聚好散」+ 敌对红标「敌对 · 叛投」且仅敌对可点（非敌对置灰）· 供奉三档含预计声望 + 「每 2 小时」提示（无 24h 残留）· 供奉确认弹窗声望预览 · 零报错 |
| `verify-ui-toastdedup.cjs` | 8 | 动作提示去重：元婴档 + 持后天法宝 h04，`MutationObserver` 录 `#toasts` 新增节点 → 祭出 / 收起**各只弹 1 次**同文提示（tick 侧 `announcedLogKey` 去重生效）· 日志仍入档（日志页未读红点照常亮）· 落档正确（slots 变更）· 零报错 |
| `verify-ui-karma.cjs` | 25 | 善恶名号九段 + 道名水印（水印 B3 + 采集灵田自动轴批）：**道名水印 B3**（`#m-wm` 绝对定位贴右上 / **20px** / 800 / opacity **.30** / **`writing-mode: vertical-rl` 竖排** / 面板裁切 / 不拦点击 / 位于文字层之下 · 第一行不再重复小字道名）· **顶栏第一行只留元信息**；**名号徽章（左道散人 · 中性色）位于第二行最左** · **原第二行档位徽章已撤（无 `#m-karma` 残留）** · **名号徽章承接善恶浮层入口（`data-act="karma"`）** · **加入势力后第二行不溢出**（徽章固定不缩 · 元信息省略号收尾）· 善恶浮层九段天梯（九行全列 · 当前段高亮 · 区间首 +800~+1000 末 -1000~-800）· 跨段演出弹出（正道侧持正之士金色 / 魔道侧凶名邪修赤色）· 徽章随段更新 · 演出 3.2s 自动收 · 日志页「善恶」分类筛选可见起讫双名号 · 零报错 |
| `verify-ui-fuse.cjs` | 14 | 融合坛悟道门槛 + 悟道石说明浮层（融合坛悟道门槛 + 悟道石说明批）：境界 5 时功法页尾渲染融合坛 · 门槛文案「闭关累计 X/**12** 时辰（**现实时间**）」且分母取常量 · 旧口径「/72 时辰」零残留 · 悟道石为可点入口（`data-act="matWudao"` + 持有数 ×N）· 点按弹 `#modal-matwudao`（标题「悟道石」· 介绍含道韵/不可提炼/得谐丹 · 「获取来源」小标题 · 来源含历练采集 + 10% 概率 + 闭关离线不产）· 关闭按钮与点遮罩双关 · 零报错 |
| `verify-ui-bonds.cjs` | 16 | 道友页「往来」段（好感三渠道批的视图侧补篇 · 2026-10-07 补写批，**三 context** 拆法对着拜访的**全局单冷却 3,600,000ms** 来——同一 context 点过一次，第二人按钮必置灰）：**A 未识结识链**（名录 58 格 = 44 友 + 14 道侣候选 / 未识格 `.pal.lock` 剪影且挂 `bondOpen`（不再是空震动）/ 隐匿详情单「往来」段 · 无 `.fbar` · 零赠丹 chip · 正文零真名 / 拜访标 `+3` 挂 `.mt` 无 `.ab` ⇒ 实发落盘 0→3 · 结识 toast 点名 · 名录格转实名 / 全局单冷却：第二人 `.actbtn[disabled]` **无 `data-act`** 且 `.cd` 给出剩余时间，强点零副作用〔第二人好感仍 0、冷却锚不被顶掉、首次结识不回退〕）· **B 已识者**（六段顺序：头部→好感尺→**往来**→个体助力→小传→结缘条件，`.dsec` 首个即往来 / tier2 **异向** 标 `+2` 无角标 · 实发增量同数 / **同向对照** 把世界档推 `right` 后标 `+3` 且 `.ab`「同道相投」出现 · 增量 === 标注 / 赠丹 chips 只列可赠〔双特例 `ap_pozhang` 两层同口径不入列〕+4/+14 对表 / 入账三对：库存 3→2 · 好感增量 === chip 标注 · 日限 0→1 **且灵石与总账零流动**〔侣不可交易底线〕 / 往来日志落 cat `bond` 且日志页「道友」筛选真可见）· **C 日限占满**（chips 仍呈列但全置灰 + 「今日已赠过 3 次」文案，与「无丹可赠」区分 / 被日限拒绝时丹·好感·日限·冷却锚四者纹丝不动）。每 context 各一条零页面报错。**判据取增量而非绝对值**：改 karma 那次 `recalcDerived` 会经势力联动顺带动好感（实测 +2），钉绝对值会把这条联动误判成「标注不符」 |

**依赖安装**：十八个脚本 `require('playwright-core')`，需自行安装（开发期依赖，不入交付包）：

```powershell
# 装在扩展根的 node_modules 里时，node 会自动就近解析，不需要 NODE_PATH
npm install --no-save playwright-core
# 本机官方 registry 直连报 ECONNRESET，需换镜像（2026-10-07 实测）
npm install --no-save --registry=https://registry.npmmirror.com playwright-core
```

`--no-save` 保证 `package.json` / 锁文件零改动（playwright-core 是开发期依赖，不进交付清单）；`node_modules` 已在 `.gitignore` 内。装到别处才需要 `$env:NODE_PATH="<含 playwright-core 的 node_modules 绝对路径>"`。

> ⚠️ **装在扩展根会连带影响 `audit.cjs`（2026-10-07 实测并已修）**：审计脚本原本 `walk(ROOT)` 整树遍历、只过滤掉点开头目录，`node_modules` 不在排除之列——装完 1300+ 个包后 `node .tests/audit.cjs` 直接 **4GB heap OOM 崩掉**（同一条命令在装包前 14/14 绿）。已在 `walk()` 里对 `node_modules` / `dist` / `dist-ssr` / `build` **剪枝**（不下钻也不读取），审计恢复 14/14。**纪律推论**：交付前静态审计的扫描范围 = 事实源范围，开发期依赖与构建产物永远不该进闸门。打包回传时同样必须排除 `node_modules`（见 `.vibex/skills/vibex-app-source-roundtrip/SKILL.md`）。

浏览器用**系统已装的 Edge**（`chromium.launch({ channel: 'msedge', headless: true })`），无需 `playwright install` 下载内核。

**✅ 2026-10-07 首跑记录（界面层首次真实执行）**：环境 = Windows + 系统 Edge + `playwright-core`（npmmirror 装）。十七篇**全绿、合计 298 断言**：rumor 8 / batch 28 / auto 22 / zone 14 / **arts 33** / market 15 / journal 16 / cavedot 7 / achvdot 8 / offline 17 / trib 30 / tiandao 24 / faction 13 / toastdedup 8 / karma 25 / fuse 14。
首跑抓到 **3 处测试资产缺陷（产品行为经独立复核均正确，已当场修好，未动一行产品代码）**：
1. `verify-ui-arts.cjs` A10c **假红**——原写法「`page.evaluate` 改 localStorage → `page.reload()`」读到的是**默认序**：`ctx.addInitScript` **每次导航都会重跑**，用建场时的原始存档（`tabOrder: []`）把刚写入的顺序整个冲掉。产品侧正确（`tabOrder()` 确为「保留相对序 + 剔除未知 id」）。改法 = 另开一个 context、把旧档 `tabOrder` 直接 preset 进注入存档做首次加载。
2. `verify-ui-arts.cjs` A6b **假红**——`click()` 后固定 `waitForTimeout(700)` 就取锚点位置，而平滑滚动耗时随距离变化、`.tabbody` 可滚程还随渲染态增长（法段功法列表首个 tick 后才铺满）：两次实跑读到 `scrollTop` 2124 / 1893，均未落定，于是硬断言「±40px 对齐容器顶」必挂。改法 = 轮询至 `scrollTop` 连续两次不变再测（落定后实测 `relTop = −16`，即实现所求的「对齐容器顶 − 8」）。**教训：动效类断言等「状态稳定」，不要等固定毫秒。**
3. `verify-ui-journal.cjs` A2 **过期口径**——硬编码「七个分类按钮」，而 UI 卷 v2.20 好感三渠道批已把 `LOG_CATS` 由七升八（新增 `bond`「道友」）。已改为 8。
另注：arts 篇断言数由本文档原记的 10（后调整为 26 口径）涨到 **33**，**2026-10-09 法与器标签化批**随渲染结构重写涨到 **46**（标签本体 N 组九条 + 段标/段序/互斥/吸顶计算值），本表已按实测数改写。

**✅ 2026-10-07 补写第十八篇 `verify-ui-bonds.cjs`（16 断言全绿）**：现行合计 = **十八篇 · 314 断言**（298 + 16；✅ **收口那次是十八篇一次性全量复跑，实测 314/314 全绿**，逐篇按文件名序 = achv 16 / achvdot 8 / arts 33 / auto 22 / batch 28 / **bonds 16** / cavedot 7 / faction 13 / fuse 14 / journal 16 / karma 25 / market 15 / offline 17 / rumor 8 / tiandao 24 / toastdedup 8 / trib 30 / zone 14，Σ = 314 与账本对表相符）。上段首跑记录的 298 是当时的真实总数，逐字保留为当日事实，不作回溯改写）。本篇是**好感三渠道批（2026-10-06）欠下的视图侧补篇**——该批只落了引擎冒烟 #257 与 DOM 桩探针 `probe-bondact`，「点得到 / 数字对 / 身份不漏」在真浏览器里从未被执行过（任务清单 D1 登记至今结案）。**踩过的两个坑（写成纪律，见下）**：① 页内 `state` 取不到（IIFE 闭包私有），② 赠丹日限靠真实时间必竞态。反向验证做**两处**（赠丹标注 `+4` 改说 `+3`、入账库存 `3→2` 改说 `3→3`）均如实 FAIL 且退码 1，随后逐字节复原复跑仍 16/16——防「恒绿空过护栏」。

**手造存档纪律（补充 2026-10-07）**：
- ⚠️ **`view/index.html:1359` 的 `var state = {}` 是 IIFE 闭包内变量，页内 `page.evaluate(() => state…)` 必 ReferenceError**。读状态 = `JSON.parse(localStorage.getItem('sanqian-state-v1'))`（一切动作经 `SQ.mutate` 落盘，这条读法顺带证明「真落了盘」；**日志另走独立键 `sanqian-logs-v1`**，主档 `stripLog` 剥离，别去主档里找 `w.log`）；页内注入 = `await SQ.mutate({}, function (s) { … })`（回调参数即 state）。
- ⚠️ **`addInitScript` 的函数体序列化后在浏览器上下文执行，Node 端闭包变量一律不存在**——写 `localStorage.setItem(KEY, sv)`（`KEY` 是本文件的常量）会 ReferenceError **静默不写档**，页面于是从创角页起步、`#sc-main` 永不可见，症状是「waitForSelector 超时」而不是「断言失败」。参数只走第二个 arg（`addInitScript((p) => {…}, {k: KEY, s: …})`）。
- ⚠️ **凡判据涉及 `Alchemy.gameDayOf` 的日限，必须冻结时钟**：`gameDayOf = floor((Date.now() − profile.createdAt)/1000)` = **1 游戏日 = 1 现实秒**，渲染等待的几百毫秒里日锚随时翻篇，「塞一个 day 值再读 DOM」是竞态而非判定。做法 = `addInitScript` 里 `Date.now = function () { return p.at; }`（全仓零处 `new Date()`，钉住 `Date.now` 即钉住全部时间源），seed 侧 `createdAt = at − ageMs` 使日锚为确定值；再用引擎同一个 `gameDayOf` 现算一遍断言它与 seed 相符，防「冻结把口径也钉错了」。
- 同向/异向这类**增量判据取「动作前后之差」而非绝对值**：改 karma 的那次 `mutate` 会 `recalcDerived` → 势力联动顺带动好感（实测 +2），钉绝对值会把这条正常联动误判成「视图标注 ≠ 引擎实发」。

**手造存档纪律**（踩过的坑）：
- 存档必须是 `v:1` 正规结构；世界态可只写关键字段，其余交给世界包 `normalize` 补齐。
- **`addInitScript` 每次导航都重跑**：要验「带某字段的存档首次加载」就直接把该字段 preset 进注入的存档（或另开 context），**不要**用「改 localStorage + reload」——改动会被注入脚本冲掉（见上文 A10c）。
- 复用旧存档时，进场前必须**刷新时间锚点** `profile.createdAt` / `worlds.*.lastSave`，并清 `lastOffline` /
  `pendingChoice`——否则 `dt` 过大会触发离线结算，出关呈报浮层会挡住后续点击。
- `verify-ui-batch.cjs` 复用同目录的 `fixture-save.json`（一份接近真机的存档，含三档好感 / 已拥有福地 / 16 势力）。

**与 C 版（体验打磨版）的适配差异**——本目录脚本移植自 C，已按 B 的 DOM 分叉改写，勿照搬 C 版：
- 传闻卡类名：C `rumor-card` / `rumor-txt` / `rumor-ttl` → B `rumorcard` / `.fg` / `.rt`。
- 战况卡动作：C 用 `data-act="rumorWarGo"`；B 无此动作 → 改判「`.rumorcard.war` 内无 `button` 且含观望文案」。
- 洞天营建按钮：C `facBuild` → B `caveBuild`。

### 5. 数据生成器（文档驱动）

| 文件 | 用途 | 事实源 |
| --- | --- | --- |
| `gen-arts.cjs` | 生成 `assets/worlds/xiuxian/arts.js`（70 部纯机制数据）+ `lexicon-arts.js` | `docs/玄幻修仙/功法全录（51部）.md` |
| `gen-lexicon.cjs` | 生成 `assets/lexicon/talents.js`（天赋 name/desc + 羁绊） | `docs/三千世界-天赋池设计.md` + `docs/玄幻修仙/专属天赋池（80条）.md` |

> ⚠ 生成器**只读文档、不写数据文件**（幂等纪律）。本扩展包内**不含 `docs/`**，正典文档在源仓库
> `E:\下载\sanqian-world-b836d9da-source\docs\`（53 份）。因此生成器只有在正典文档就位时才能复跑；
> 日常回归不需要跑生成器（数据文件已随包提交）。

---

## 变更联动提醒

- 改 `view/index.html` 的类名 / `data-act` → 同步检查十八个 `verify-ui-*.cjs` 的选择器。
- 改词表 key → 跑 `audit.cjs`（key 对账会拦住缺失）。
- 改存档字段 / 数值常量 → 跑 `run-smoke.cjs` + `sim-pacing.cjs` + `sim-event-economy.cjs`。
- 改加载顺序（`view/index.html` 的 `<script>`）→ 同步 `sandbox.cjs`（它是顺序的唯一事实源）。
- 改日志链路（`SQ.Log` / 存档压缩阶梯）→ 注意**日志走独立存档键 `sanqian-logs-v1`（`SQ.Log.KEY`）**，主档落盘前 `stripLog` 剥离；跑冒烟 `#206 / #206b / #206c` 与 `verify-ui-journal.cjs`（展示上限）。