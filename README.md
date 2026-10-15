# 三千世界 · sanqian-world

一个**多世界框架**的放置修仙人生模拟，以 **x-hub 扩展**形态交付。起名 → 择界 → 抽天赋 → 挂机修炼 → 渡劫证道，一世终了可兵解转世、带着「遗泽」再来。

当前可玩的是一整局修仙人生：十境界 × 十秘境 + 洞天福地、功法与法器 / 法宝（含融合与器灵）、炼丹炼器、坊市 / 黑市 / 神秘商人、势力 16 处 + 宗门 + 同代天骄、道友（拜访 / 赠丹 / 护法 / 道侣）、奇遇与江湖传闻、天道问天与天象、成就九面图鉴与人生传记、飞升大劫与遗泽商店。天赋也不再一局定死——一世之内可洗髓换 3 枚。世界名册现为 6 张卡（1 界可投生 + 5 界灰显待开启）。

**零 CDN、零打包器、零框架**：全部代码是经典 `<script>` 脚本，随扩展包一起走，改完刷新即生效。

<!-- SQ:LEDGER:BEGIN readme 现行读数由 .tests/gen-ledger.cjs 生成，手改即漂；段外不参与覆盖 -->
- **现行读数**（本行由 `.tests/gen-ledger.cjs` 生成）：扩展版本 `0.5.0` · 冒烟 301 · 审计 24 关 · 常驻探针 246 断言 · 界面走查 27 篇 / 627 断言 · 词表键 4697 · 世界名册 6 界（可见 6）。缺读数 = 「未跑」，不当 0 计。
<!-- SQ:LEDGER:END -->

## 一、仓库结构（先看这个）

**游戏本体只有一份，在 `extensions/com.avalonlee.sanqian-world/` 里**——宿主加载的就是这个目录，它自己就是完整的扩展根。2026-10-14 GitHub 整理批删掉了原先仓库根的逐字节副本（那 122 个重复文件是历史包袱：交付镜像不变量 B9 的产物），现在审计 **D4** 反过来守住「仓库根不许再长出第二份事实源」。

```
仓库根
├── extensions/com.avalonlee.sanqian-world/   ← 唯一事实源（下面七件是宿主读的）
│   ├── manifest.json         扩展清单（id / version / 四形态 entry / moduleVariants）
│   ├── view/index.html       主入口（view / window / drawer 共用）：51 个 <script src> 按顺序加载
│   ├── module/index.html     工作台卡片（同一引擎的紧凑壳，装载序列必须与 view 全等 = 审计 D2）
│   ├── assets/               引擎与数据 51 个 .js：core.js + systems/ + worlds/xiuxian/ + lexicon/ + talents/ + events/
│   ├── .tests/               回归资产（引擎冒烟 / 静态审计 / 仿真探针 / 界面走查 / 账本工具）
│   ├── icon.svg              扩展图标
│   └── DESIGN.md             扩展目录内的快照索引件
├── docs/                     设计正典（45 份现行卷 + _archive 只读归档），索引见 docs/README.md
├── README.md / AGENTS.md / CLAUDE.md / package.json / LICENSE
```

## 二、玩起来

**想玩游戏：直接从 x-hub 扩展中心的市场装。** 打开 x-hub → 扩展中心 → 市场 → 搜「**三千世界**」（扩展 id `com.avalonlee.sanqian-world`）→ 安装并启用。装完就有 view / window / drawer 三种形态与工作台卡片，进度存在扩展自己的存档里，**不需要本仓库的任何文件**。

下面这些只在你要改代码、或想自己起一份独立调试档时才用得上：

```bash
cd extensions/com.avalonlee.sanqian-world
# 浏览器直开 view/index.html：无桥环境自动走 localStorage 回退（窗口 ≥720px 触发双栏）
```

源码加载：x-hub 扩展中心 →「我的扩展」→ 添加 `extensions/com.avalonlee.sanqian-world` 目录（添加即加载，改代码约 1.5 秒自动重载）；市场版与源码版**互不覆盖**，各用各的档。卡片形态：`module/index.html?xhub-variant=compact|standard|wide`。

没有构建步骤，游戏侧零运行时依赖 —— 仓库根 `package.json` 里唯一声明的东西是界面走查用的 `playwright-core`。

## 三、怎么验收（只需 node）

```bash
npm test                                  # 从仓库根跑 = 快速预检（无头 18 件 / 约 20 秒）
npm run test:ui                           # 追加界面走查 27 篇（需系统 Edge，约 8~10 分钟）
npm run test:sim                          # 追加 sim-playthrough 全程模拟（收口必跑）
npm run test:full                         # = ui + sim

# 或者进扩展目录逐件跑
cd extensions/com.avalonlee.sanqian-world
node .tests/run-dod.cjs                   # 同上
node .tests/run-smoke.cjs                 # SMOKE_ALL_GREEN n/n
node .tests/audit.cjs                     # AUDIT_ALL_GREEN n/n
node .tests/versions-check.cjs            # VERSIONS_IN_SYNC rows=n
node .tests/gen-ledger.cjs                # LEDGER_IN_SYNC segments=n（只判漂，不写文档）
node .tests/ledger-selftest.cjs           # LEDGER_SELFTEST_DONE 8 判（账本门禁的反证）
```

判据 = **末行 `DOD_ALL_GREEN <件数>`**；任一子件红 ⇒ `DOD_FAILED` 且退码 1，并按 `docs/ledger.json` 的 `attrib` 打印该件的事实源、同动点与最小复现命令。关数与断言数以本文件顶部账本段与 `docs/FACTS.md` 为准，正文不复制读数。

门禁分四组（详见 `docs/三千世界-工程规范与验收计划.md` §4.9 与各批追加项）：A 组词表层（CJK 裸字 / 键对账 / DOM id / 孤儿键 / 写点声明集）、B 组平台关卡（manifest / 权限 / 零 CDN / 主题 / 卡片纪律 / 桥容错）、C 组世界包词族契约、D 组账本与装载（**D1** 读数生成化 · **D2** 加载顺序单源 · **D3** 世界专属全局别名封闭 · **D4** 唯一事实源自洽）。

## 四、设计正典在哪里（不在本文件）

`docs/` 是设计唯一正典，索引 = **[`docs/README.md`](docs/README.md)**。查东西按账本走：

- 现行**计数** → [`docs/FACTS.md`](docs/FACTS.md)（顶部是生成段，下方 33 行表是各池口径与批次史）
- 现行**版本**（每卷版本号）→ [`docs/VERSIONS.md`](docs/VERSIONS.md)
- **还没做什么**（销号唯一落点）→ `docs/三千世界-代码实施任务清单.md` 的「现行未实施表」
- **批次详情账本** → `docs/三千世界-项目设计文档.md` §7A
- 工程规范 / 存档字段契约 / 断言总表 / 工作树持久化纪律 → `docs/三千世界-工程规范与验收计划.md`

## 五、存档格式（两键 + 一层编码）

- **主档 `sanqian-state-v1` = 机制态**（角色 + 本世世界态 + `meta` 跨世账本）；展示流落盘前被剥离，所以「越玩越大」的不是主档。
- **侧档 `sanqian-logs-v1` = 展示流**（日志 + 奇遇叙事 feed），各自带字节预算、超预算从最旧挤起，不参与主档压缩阶梯。
- 平台（有桥）分支落盘 = **`d1:` + base64(deflate(JSON))**（Web 标准 `CompressionStream`，零依赖）；无桥浏览器预览与 UI 走查仍是明文 JSON；读端三态全收，旧档零迁移。离线读档请用 `node .tests/storage-read.cjs`（调查件，不作容量 / 无损判据——那些一律走 `assets/core.js` 编解码，见 `.tests/probe-savecodec.cjs`）。
- 容量口径：**红线 64KB / 触发线 56KB，量的是编码后字节**（`SQ.SAVE_RED` / `SQ.SAVE_TRIGGER` 是单一事实源，测试脚本一律读它、不各自硬编码）；超触发线才按「语义损失递增」逐级跑压缩阶梯。
- **`.storage.json`（宿主实时存档）从不入库**：`.gitignore` 已排除，别把它提交上来。

## 六、当前范围与多世界支持

只做第一个世界（玄幻修仙），已 live。`assets/worlds/registry.js` 现行名册 = 6 条：1 `live` + 5 `coming`（`pack: null`、卡片灰显、不可投生）。屏上正名与工程 id、目录名是分开管理的：改 id 会牵动存档 `profile.worldId` 与整套词表命名空间，所以只改显示层，全量改名登记在任务清单 **N30**。其余五界未启动：不排期、不新增跨世界字段或存档容器。

世界包契约（工程规范 §2.2）：`lexicon` / `initialState()` / `normalize(raw)` / `claim()` / 数据表 / `attributes` / `specialHooks` / `worldSystems`。装载序列的**唯一事实源是 `view/index.html`**（`.tests/sandbox.cjs` 直接解析它），通用层与视图禁止直读世界专属全局 `SQ.XDATA`（审计 **D3** 拦，在册例外三处按出现次数钉死）。

## 七、给贡献者

**分支规则**：所有改动先进 **`dev`**（`feature/xxx → dev`）；**`master` 只接受 `dev → master` 的发布合并**，直接向 master 提的 PR 会被必需状态检查 **`branch-policy`** 拦下（管理员也不能直改 master）。提 PR 前先看清 base 是 `dev`。

改代码前请先读 **[`AGENTS.md`](AGENTS.md)**（九条硬规矩，每一条都对应过一次真实返工）。要点：**现行读数不许手抄**（由 `docs/ledger.json` + `SQ:LEDGER` 哨兵段生成）、**升版只改 `manifest.json` 一处**、**新增系统 `.js` 只挂进 `view/index.html`**、**历史注逐字不改写**。

## 八、许可证

本仓库全部文件（代码 `extensions/com.avalonlee.sanqian-world/**` + 设计文档 `docs/**` + 引擎内全部
游戏文案与数值表）以 **CC BY-NC-SA 4.0**（署名 - 非商业性使用 - 相同方式共享）发布，`LICENSE` 是
官方英文法律条文全文（438 行 / 20,850 字节，取自 creativecommons.org）。

- 署名格式（按 CC 要求可任选合理方式，本项目希望写成）：*三千世界（sanqian-world）by avalonlee*，
  来源 https://github.com/AvalonLee/sanqian-world ，并注明是否做过修改。
- 衍生作品必须以**同一份**协议（CC BY-NC-SA 4.0）发布，且不得用于商业目的。
- `SPDX-License-Identifier: CC BY-NC-SA-4.0`
- **玩家存档不在发布内容内**：宿主实时存档 `.storage.json` 已被 `.gitignore` 排除，本仓库不含任何
  真实玩家数据；提交前也别手动 `git add` 它。

本仓库不含第三方素材与外部服务：零 CDN、零外链、无外部字体与音视频，`icon.svg` 为项目自绘，全部游戏文案与数值表均为本项目原创（词表落 `assets/lexicon*` 与 `assets/worlds/xiuxian/lexicon-*.js`，审计 A1/A2/A4 钉死这一点）。

需要商业授权请通过上述 GitHub 仓库联系作者另行约定。
