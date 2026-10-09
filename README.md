# 三千世界 · sanqian-world

修仙人生模拟放置游戏，以 **x-hub / VibeX 扩展**形态交付：起名 → 择界 → 抽天赋 → 挂机修炼 → 渡劫证道，一世终了可兵解转世带着「遗泽」再来。零 CDN、零打包器、零框架——全部代码是**经典 `<script>` 脚本**，随扩展包一起走。

## 一、交付物是什么

| 件 | 作用 |
|---|---|
| `manifest.json` | 扩展清单：`id: com.avalonlee.sanqian-world`、`version: 0.3.0`（平台扩展版本，与 `docs/VERSIONS.md` 的文档版本号互不相干）、`surfaces: module/view/window/drawer`、`permissions: []` |
| `view/index.html` | 主入口（view / window / drawer 三形态共用）：51 个 `<script src="../assets/…">` **按顺序加载**，无 `import` / `export` |
| `module/index.html` | 工作台卡片（同一引擎的紧凑壳），同样 51 个顺序脚本 |
| `assets/**` | 引擎与数据，共 51 个 `.js`：`core.js`（存档 / 压缩阶梯 / 世界注册）+ `systems/`（战斗 / 挂机 / 炼丹 / 宗门…）+ `worlds/xiuxian/`（修仙世界包：词表 / 数据 / 事件）+ `lexicon/` + `talents/` + `events/` |
| `icon.svg` | 扩展图标 |

宿主按清单 `entry` 直接加载 HTML；**没有构建步骤**，改完 `.js` 刷新即生效。审计 A3 关钉死「零外链 / 零 CDN」，A1/A2 钉死「零裸中文进 JS、词表键对账」。

## 二、设计正典在哪里（不在本文件）

`docs/` 是设计唯一正典，索引 = **[`docs/README.md`](docs/README.md)**（归置纪律①~⑥ + 全卷清单）。查东西按账本走：

- 现行**计数**（池规模 / 格数 / 冒烟与走查断言数 / 落盘字节）→ [`docs/FACTS.md`](docs/FACTS.md)
- 现行**版本**（每卷版本号）→ [`docs/VERSIONS.md`](docs/VERSIONS.md)
- **还没做什么**（销号唯一落点）→ `docs/三千世界-代码实施任务清单.md` 的「现行未实施表」章
- **批次详情账本** → `docs/三千世界-项目设计文档.md` §7A
- 工程规范 / 存档字段契约 / 断言总表 → `docs/三千世界-工程规范与验收计划.md`
- [`DESIGN.md`](DESIGN.md) 只是**扩展目录内的快照索引件**（不写版本号与计数）；历批收口日记已逐字归档于 `docs/_archive/DESIGN-批次史.md`，只读

## 三、怎么验收（只需 node）

```bash
node .tests/run-dod.cjs          # 快速预检：引擎冒烟 + 静态审计 + 仿真 + 常驻探针 + 版本总账对账
node .tests/run-dod.cjs --ui     # 追加界面走查（需 playwright-core + 系统 Edge，见 .tests/README.md）
node .tests/run-dod.cjs --sim    # 追加 sim-playthrough 全程模拟（收口必跑）
node .tests/run-dod.cjs --full   # = --ui --sim
```

判据 = **末行 `DOD_ALL_GREEN <件数>`**；任一子件红 ⇒ `DOD_FAILED` 且退码 1。单件也可各自跑：`node .tests/run-smoke.cjs`（`SMOKE_ALL_GREEN n/n`）、`node .tests/audit.cjs`（`AUDIT_ALL_GREEN 17/17`，其中 🆕 **B9** 守「源侧 ↔ 交付镜像七项逐字节零差异」这条不变量）、`node .tests/versions-check.cjs`（`VERSIONS_IN_SYNC rows=…`）。关数与断言数**一律以 `docs/FACTS.md` 为准**，本文件不复制读数。`.tests/` 是点目录，**不进交付包**。

## 四、镜像不变量（改完必须同步）

`extensions/com.avalonlee.sanqian-world/` 是交付镜像，**只镜像七项**：`assets/` `view/` `module/` `.tests/` + `manifest.json` `icon.svg` `DESIGN.md`。仓库不变量 = 每一对 `diff -rq` **零差异**（历史上有过单侧回退事故，靠这份镜像反向覆盖救回）。`docs/`、根 `README.md`、`src/` 等**不镜像**。

本机（Windows / Git Bash）**没有 `rsync`**，重同步用：

```bash
M=extensions/com.avalonlee.sanqian-world
cp -a assets view module .tests manifest.json icon.svg DESIGN.md "$M"/
for p in assets view module .tests; do diff -rq "$p" "$M/$p"; done
diff -q manifest.json "$M/manifest.json"; diff -q icon.svg "$M/icon.svg"; diff -q DESIGN.md "$M/DESIGN.md"
```

七项全部无输出才算同步完成。`$M/.storage.json` 是宿主实时存档，**不参与同步**。回传打包按 `.vibex/skills/vibex-app-source-roundtrip/SKILL.md`（ZIP 内路径相对你在 VibeX Source 树里选中的目录）。

> 🆕 **2026-10-09 起这条不变量已进门闸**：`node .tests/audit.cjs` 的 **B9** 就是把它自动化（四目录递归逐字节 + 三单件，`.storage.json` 两侧排除，单侧多/缺文件同算漂移），手工 `diff -rq` 退为「知道差异在哪」的排障工具。立因 = 本批实测两次源侧改完忘了同步镜像，**只写在文档里的不变量等于没有不变量**。

## 五、存档格式（两键 + 一层编码）

- **主档 `sanqian-state-v1` = 机制态**（角色 + 本世世界态 + `meta` 跨世账本）；展示流落盘前被剥离。
- **侧档 `sanqian-logs-v1` = 展示流**（日志 + 奇遇叙事 feed），自带字节预算、超预算从最旧挤起，不参与主档压缩阶梯。
- 平台（有桥）分支落盘 = **`d1:` + base64(deflate(JSON))**（Web 标准 `CompressionStream`，零依赖）；无桥浏览器预览与 UI 走查仍是**明文 JSON**；读端三态全收（对象 / 明文串 / `d1:`），旧档零迁移。任何绕过 `assets/core.js` 直读存档的工具必须三态都认，离线读平台档用 `node .tests/storage-read.cjs`（喂调查脚本用的一次性读件，不作容量 / 无损判据——那些判据一律走 `core.js` 编解码，见 `.tests/probe-savecodec.cjs`）。
- 容量口径：**红线 64KB / 触发线 56KB，量的是编码后字节**（`SQ.SAVE_RED` / `SQ.SAVE_TRIGGER` 为单一事实源，测试脚本一律读它、不各自硬编码）；超触发线才按「语义损失递增」逐级跑压缩阶梯（有损级 ⓪~⑤ 已纯函数化，不污染内存态）。

## 六、当前范围

**只做第一个世界（玄幻修仙）**，已 live。`assets/worlds/registry.js` 里 `guwu`（古武第二世界）= `status:'coming'` + `pack:null`，卡片灰显、不可投生。古武**未启动**：不排期、不占「现行未实施表」的行、不为它新增跨世界字段或存档容器。`docs/古武军势/` 内的设定卷是库存设计稿，不是待办来源。

## 七、本地预览

浏览器直开 `view/index.html`（无桥自动走 localStorage 回退；窗口 ≥720px 触发双栏）。卡片形态：`module/index.html?xhub-variant=compact|standard|wide`。真机：x-hub 扩展中心 →「我的扩展」→ 添加本源码目录（添加即加载，改代码约 1.5 秒自动重载）。

## 八、`src/` / vite / `pocketbase/` 是什么

VibeX **平台脚手架**，与游戏无关：根 `index.html`（title 仍是占位名「初」）→ `src/main.tsx` → `src/App.tsx`（默认占位页），加 `package.json` / `vite.config.ts` / `tailwind.config.js` / `tsconfig*.json` / `eslint.config.js` / `components.json` / `public/` / `vibex-local/`；`pocketbase/pb_hooks/_rh_admin_sso.pb.js` 是平台侧 SSO 钩子。`manifest.json` 的 `entry` 不指向它们，`assets/**` 与两个入口 HTML 里对 `src/` 的引用 **0 条**，`npm run build` 的 `dist/` 不含一行游戏代码——**改游戏不跑 `npm run dev` / `build` / `tsc`**，验收只走 `.tests/`。**也不要删壳**：`vite.config.ts` 头部明令不得整文件覆盖、`rhSourcePlugin()` 必须排在 `plugins[0]`，删掉应用在工作台里无法预览。
