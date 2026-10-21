# 三千世界 · agent 正典指引

本项目是 **x-hub 扩展**（`manifest.json`，id `com.avalonlee.sanqian-world`），运行时是经典 `<script>` 脚本。**项目文件只有一份，在 `extensions/com.avalonlee.sanqian-world/` 下**——宿主加载的就是这个目录，它自己就是完整的扩展根（`assets/**` 引擎 + 数据，入口 `view/index.html` 三形态 + `module/index.html` 卡片）。**没有构建步骤**，改完 `.js` 或 HTML 刷新即生效。

2026-10-14 GitHub 整理批把仓库根的逐字节副本删掉了（那 122 个文件是交付镜像 B9 的产物，本身就是抄本）；审计 **B9 退役、由 D4 接管**——D4 反过来守「仓库根不许再长出第二份事实源」。仓库根只剩 `docs/`（设计正典）、`README.md`、`AGENTS.md`、`CLAUDE.md`、`package.json`、`LICENSE`。

VibeX 已退役：不再打 ZIP 回传、不再跑 `npm run dev` / `build` / `tsc`（原平台壳与 `.vibex/` 已整族删除；根 `package.json` 只声明界面走查用的 `playwright-core`，并只提供 `npm test` 系列入口）。

## 改动前按顺序读

1. `docs/三千世界-工程规范与验收计划.md` — 存档字段契约 / 世界包契约 / 断言总表 / 平台关卡 / §八 工作树持久化纪律。
2. `docs/README.md` — 全卷索引。现行计数看 `docs/FACTS.md` 顶部**账本段**；各卷版本看 `docs/VERSIONS.md`；还没做什么看任务清单「现行未实施表」（销号唯一落点）。
3. `extensions/com.avalonlee.sanqian-world/.tests/README.md` — 怎么验收、每件判据的末行标记是什么。

## 路径口径（本仓最容易搞错的一条）

`assets/**`、`view/`、`module/`、`.tests/**` 这些写法都**相对扩展目录** `extensions/com.avalonlee.sanqian-world/`；`docs/**`、`README.md`、`LICENSE` 相对仓库根。工具靠 `.tests/repo-root.cjs` 现找仓库根（找带 `docs/VERSIONS.md` 的那一层），**不许硬编码层数**。

在仓库根跑门禁请用 `npm test`（等价于 `node extensions/com.avalonlee.sanqian-world/.tests/run-dod.cjs`）；要逐件跑就先 `cd extensions/com.avalonlee.sanqian-world`。

## 硬规矩（每一条都对应过一次真实返工）

- **收口必跑** `npm test`（无头快门禁 = 冒烟 + 审计 + 两件仿真 + 十一路探针 + `versions-check` + `gen-ledger` + `ledger-selftest`；**件数与审计关数一律看 `docs/ledger.json` 生成段，本行不抄数**——本条此前手写「18 件 / 23 关」，实测已漂到 18 件 / 26 关）；改到界面再 `npm run test:ui`（走查篇数同上，不在此抄）；改玩法数值或节奏才需要 `npm run test:sim`。
- **仓根不留一次性件**：调试脚本 / 工作备份 / 日志一律写到**仓库之外**（本仓 2026-10-17 实测：仓根曾堆 374 件 `sq-wip-*` 共 5.8MB，含 426KB 的 `index.html` 备份与 2.5MB 转储，全部被 `.gitignore` 的 `sq-wip-*` / `*.log` 藏掉 ⇒ **`git status` 干净并不代表仓根干净**，D4 与所有收口面都看不见它们）。旧件已移仓 `E:\下载\sanqian-wip-archive-20261017\`（未删，`data.js:37/181` 引用的 `sq-wip-life38d` 与 `sq-wip-tier-leftover.patch` 也在其中——它们本就是「只在这台机器上存在」的取证件，正典引用按名字读）。
- **只有一份事实源**：不要为了「交付方便」再在仓库根复制 `assets/` 或 `manifest.json`——审计 **D4** 会直接判红。交付物就是 `extensions/com.avalonlee.sanqian-world/` 目录本身（宿主挂载它；`.storage.json` 实时存档在它里面且已 gitignore，永不入库）。
- **现行读数不许手抄**：探针末行已打印的值（冒烟 / 审计关数 / 探针 / 走查 / 词表键 / 扩展版本 / 池规模）一律由 `docs/ledger.json` + `SQ:LEDGER:BEGIN/END` 哨兵段生成；`gen-ledger` 只判漂，要写文档才显式 `--fix`（或 `npm run ledger:fix`）。
- **升扩展版本 = 改 `manifest.json` 一处** + `npm run ledger:fix`。旧「六处同动」与「同步镜像」两条口径都已作废。**档位口径（用户 2026-10-15 定档）= 每批只加 `0.0.1`**，不按「可见新功能跳次版本」那套分档，也不用每批去问。
- **新增系统 `.js` 只挂进 `view/index.html`**：装载序列以它为唯一事实源（`.tests/sandbox.cjs` 直接解析 HTML）；`module/index.html` 分叉、引用不存在的件、`assets/` 里有未挂载件，都由审计 **D2** 拦。
- **视图专属件走 `view/` 同目录**（第册四批 2026-10-17 起，N34 拆视图那一族）：`view/updatenote.js`、`view/ui.css`、`view/achv.js`、`view/journal.js` 这类**只属界面**的件挂在 `view/index.html`、不进 `assets/`、也不挂进 `module/index.html`（卡片没有那些浮层的 DOM）。D2 因此判「view 里 `assets/` 那一段 === module 全序列」+「非 `assets/` 的挂载件必须就躺在 `view/` 下」；`sandbox.cjs` 的引擎重放清单只收 `assets/` 项；A3 / D5 / B4 的射程含同目录外置件与那份样式。细则 = 工程规范 §4.52 M3/M4。
- **外置件取数一律走内核那枚 `ctx()`**（第册五批 2026-10-17 起，拆视图第二刀立的桥）：渲染器形参名钉死 `c`（`function render(c)`），键集由审计 **D7** 逐键对账（用了桥没给的键 ⇒ 当场红点名）。两条硬口径：**外置件里不许用 `c` 当回调形参**（会挡住桥）‖ **搬注释必须连闭合符一起搬**（半截 `/*` 会一路吞掉后面的代码，只有 D5 抓得住）。第册八批再加两条：桥里**换了名字的闭包私名**（`s: state` 那类，名单由 D7 从 `ctx()` 现推）不许裸读，D7 第二判专管这个方向 ‖ 机械改写只当初稿：改写规则**不许碰注释行**，搬完必跑「件内声明名 × `c.X` 读名」对表（与桥键同名的局部会被错加前缀），收口一律交给读渲染结果的走查。剩余切法与逐片实测行数以任务清单 N34 行为准。
- **通用层与视图禁止直读世界专属全局**（`SQ.XDATA` 等）：新旁路由审计 **D3** 拦，在册例外按出现次数钉死、失效同判红。
- **历史注逐字不改写**：只在新位置加勘正行；能自动对的账（版本总账、计数）交给 `versions-check --fix` 与 `gen-ledger --fix`，不靠人抄。
- **`sim-playthrough` 的轨迹锚是判据**：改了结算/掉率类代码会换 md5，必须先复跑再改锚，别把换值当自然结果。⚠️ **复算口径（2026-10-19 第册四十四批补，此前只活在 `run-dod.cjs:111` 那一行里）**：锚 = `node .tests/sim-playthrough.cjs 1 20261008`（轮数 1 ‖ 种子 20261008，**两个参数都要带**）的 **stdout 整块 md5**；只给 `SQ_SEED` 不给轮数会跑出另一形状（14,397B vs 12,421B），裸无种子则逐跑不同。‖ ✅ **2026-10-19 第册四十五批（N79 代裁 = 走「做成真判据」那一支）已落地**：锚改由**件内自算**——`SQ_ANCHOR=1 node .tests/sim-playthrough.cjs 1` 会强制走在册种子 `20261008`、自收逐路线读数、在打末行 marker 前对 md5 与件内 `ANCHOR_MD5` 对表，末行给 `… ‖ 锚对表相同 d93d11d0`；漂了就打 `FAIL 轨迹锚漂移 …` 且退码 1。钉值 **`d93d11d01f419b9235c68ead54a9d45e`**（末行 marker 不参与哈希）。**钉之前先归因**：worktree 在第册十二批收口树 `964ae40` 跑同一条命令得 11,203B / `56573788…` **与当时在册锚逐字命中** ⇒ 口径成立，现值之差是那之后 31 批的真实累积。**两条纪律**：① 改锚必须写归因（§4.42），不许顺手改成新值；② **锚不在门禁链里自动跑**（`--sim` 那一跑仍是随机参数），要进链就得先裁「定种跑换掉随机跑」的代价——别以为它已经全自动。
- **分支流**：改动一律 PR 进 `dev`，`master` 只由 `dev → master` 发布合并；直连 master 的 PR 会被必需检查 `branch-policy` 拦红（`master` 上 `enforce_admins=true`，管理员也推不动）。日常动作 = `git checkout -b <主题> dev` → 改 → 收口 → PR 到 `dev`；不要指望能 `git push origin master`。
- **提交后必须复确认整批落库**：`git status --porcelain` 为空 **且** `git show --stat HEAD` 的文件清单与批次叙述一致（混合「删除 + 修改」时用不带 `-a/-u` 的 commit，正文改动会整批漏在外面——本仓 2026-10-14 又犯过一次并已记进规范）。

## 环境注意（本机 Windows / Git Bash）

- 没有 `rsync`，也没有 `python3`；脚本一律用 `node`。含反引号的脚本正文走文件（`Write`），不要用 `bash -e` / heredoc 现拼。
- `playwright-core` 已在根 `package.json` 声明，且 Node 的模块解析会从扩展目录逐级向上找到仓库根 `node_modules` ⇒ **不再需要 `NODE_PATH` 临时注入**。
- 长跑命令要真脱离（PowerShell `Start-Process`），重定向日志约 4KB 才刷盘 ⇒ 中途不动 ≠ 卡住；判完成只看末行标记与 PID。
- 实时存档在 `extensions/com.avalonlee.sanqian-world/.storage.json`，离线读它用 `node .tests/storage-read.cjs`（候选路径已含这一条）。
