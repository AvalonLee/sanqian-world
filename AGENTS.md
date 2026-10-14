# 三千世界 · agent 正典指引

本项目是 **x-hub 扩展**（`manifest.json`，id `com.avalonlee.sanqian-world`），运行时是经典 `<script>` 脚本：`assets/**` 引擎 + 数据，入口 `view/index.html`（view / window / drawer 三形态）与 `module/index.html`（工作台卡片）。**没有构建步骤**，改完 `.js` 或 HTML 刷新即生效。

VibeX 已于 2026-10-14 退役：不再打 ZIP 回传、不再跑 `npm run dev` / `build` / `tsc`（原平台壳已整族删除；`package.json` 现在只声明界面走查用的 `playwright-core`）。

## 改动前按顺序读

1. `docs/三千世界-工程规范与验收计划.md` — 存档字段契约 / 世界包契约 / 断言总表 / 平台关卡 / §八 工作树持久化纪律。
2. `docs/README.md` — 全卷索引。现行计数看 `docs/FACTS.md` 顶部**账本段**；各卷版本看 `docs/VERSIONS.md`；还没做什么看任务清单「现行未实施表」（销号唯一落点）。
3. `.tests/README.md` — 怎么验收、每件判据的末行标记是什么。

## 硬规矩（每一条都对应过一次真实返工）

- **收口必跑** `node .tests/run-dod.cjs`（无头 18 件 / ~20 秒，含 `audit` 23 关 + `versions-check` + `gen-ledger` + `ledger-selftest`）；改到界面再跑 `--ui`（27 篇）。改玩法数值或节奏才需要 `--sim`。
- **交付 = 源侧 + 镜像逐字节相同**：`extensions/com.avalonlee.sanqian-world/` 只镜像七项（`assets` `view` `module` `.tests` + `manifest.json` `icon.svg` `DESIGN.md`），同步与判据见工程规范 §7.2 与 `README.md` §七；源侧删的件要同步从镜像删。
- **现行读数不许手抄**：探针末行已打印的值（冒烟 / 审计关数 / 探针 / 走查 / 词表键 / 扩展版本 / 池规模）一律由 `docs/ledger.json` + `SQ:LEDGER:BEGIN/END` 哨兵段生成；`gen-ledger` 只判漂，要写文档才显式 `--fix`。
- **升扩展版本 = 改 `manifest.json` 一处** + `node .tests/gen-ledger.cjs --fix` + 同步镜像。旧「六处同动」口径已作废。
- **新增系统 `.js` 只挂进 `view/index.html`**：装载序列以它为唯一事实源（`.tests/sandbox.cjs` 直接解析 HTML）；漏挂或 `module/index.html` 分叉由审计 **D2** 拦。
- **通用层与视图禁止直读世界专属全局**（`SQ.XDATA` 等）：新旁路由审计 **D3** 拦，在册例外按出现次数钉死、失效同判红。
- **历史注逐字不改写**：只在新位置加勘正行；能自动对的账（版本总账、计数）交给 `versions-check --fix` 与 `gen-ledger --fix`，不靠人抄。
- **`sim-playthrough` 的轨迹锚是判据**：改了结算/掉率类代码会换 md5，必须先复跑再改锚，别把换值当自然结果。

## 环境注意（本机 Windows / Git Bash）

- 没有 `rsync`；镜像重同步用 `README.md` §七 的 `cp -a` 命令组。
- `playwright-core` 需 `NODE_PATH=<仓库>/node_modules` 才能被界面走查 require（现已写进 `package.json`，别再依赖临时注入）。
- 长跑命令要真脱离（PowerShell `Start-Process`），重定向日志约 4KB 才刷盘 ⇒ 中途不动 ≠ 卡住。
