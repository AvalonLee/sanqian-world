# 三千世界 · sanqian-world

一个**多世界框架**的放置修仙人生模拟，以 **x-hub 扩展**形态交付。起名 → 择界 → 抽天赋 → 挂机修炼 → 渡劫证道，一世终了可兵解转世、带着「遗泽」再来。

**零 CDN、零打包器、零框架**：全部代码是经典 `<script>` 脚本，随扩展包一起走，没有构建步骤，改完刷新即生效。

<!-- SQ:LEDGER:BEGIN readme 现行读数由 .tests/gen-ledger.cjs 生成，手改即漂；段外不参与覆盖 -->
- **现行读数**（本行由 `.tests/gen-ledger.cjs` 生成）：扩展版本 `0.5.51` · 冒烟 326 · 审计 32 关 · 常驻探针 250 断言 · 界面走查 32 篇 / 776 断言 · 词表键 4805 · 世界名册 6 界（可见 6）。缺读数 = 「未跑」，不当 0 计。
<!-- SQ:LEDGER:END -->

## 一、一眼看懂

```mermaid
flowchart LR
    A["创角<br/>起名 · 择界 · 抽天赋"] --> B["挂机修行<br/>历练（驻秘境）· 闭关"]
    B --> C["四柱经营<br/>财 · 侣 · 法 · 地"]
    C --> D{"境界盈满？"}
    D -- 渡劫成功 --> E["晋境 · 得寿 · 解锁新区"]
    E --> B
    D -- 卡境 --> F["备战<br/>炼丹 · 炼器 · 法宝认主 · 器灵融合"]
    F --> B
    D -- 一世终了 --> G["盖棺之传<br/>逐字演本世传记"]
    G --> H["转世 · 带遗泽再来"]
    H --> A
```

| 一世的终局 | 怎么走到 | 屏上会看到 |
|---|---|---|
| **飞升** | 真仙修为盈满 → 独立终局劫（可反复叩天门） | 独占演出 → 盖棺之传 → 创角 |
| **兵解** | 化神起玩家主动舍身证道（折分 ×0.7） | 结算浮层 → 盖棺之传 → 创角 |
| **寿尽坐化** | 寿元累加到本境大限（凡寿 + 逐境增量阶梯） | 身死道消呈报 → 盖棺之传 → 创角 |
| **道伤崩碎** | 渡劫失败积道伤，伤满不治 | 同上，死因正文换「道伤崩碎」 |
| **折寿而殒** | 负面寿元账把本世打穿（未到本境大限） | 同上，死因正文换「折寿而殒」 |

| 玩法支柱 | 里面有什么 |
|---|---|
| **地**（空间） | 十境界 × 十秘境 + 洞天福地；词缀、域主、宝藏、探宝残片 |
| **法**（成长） | 功法（黄玄地天四阶 + 融合自创 + 器灵）、法器四槽、法宝先天/后天（认主 / 祭炼）、炼丹炼器双轨熟练度 |
| **财**（经济） | 坊市 / 黑市 / 神秘商人 / 委托 / 灵田 / 材料提炼，灵石账十路恒等式 |
| **侣**（关系） | 道友（拜访 · 赠丹 · 同贺 · 切磋）、道侣、护法、同门、跨世宿敌 |
| **命**（叙事） | 奇遇与江湖传闻、天道问天与天象、势力 16 处 + 宗门 + 同代天骄、成就九面图鉴与人生传记 |

一世之内的自由度：天赋可洗髓换 3 枚、功法可点主修、法宝可择主、终局可自选兵解或硬撑。

## 二、怎么跑起来

| 想干什么 | 怎么做 |
|---|---|
| **只玩游戏** | x-hub → 扩展中心 → 市场 → 搜「三千世界」（id `com.avalonlee.sanqian-world`）→ 安装启用。有 view / window / drawer 三形态 + 工作台卡片，**不需要本仓库任何文件** |
| **改代码** | x-hub →「我的扩展」→ 添加 `extensions/com.avalonlee.sanqian-world` 目录（添加即加载，改代码约 1.5 秒自动重载）。市场版与源码版**互不覆盖、各用各的档** |
| **浏览器直接预览** | 直接打开 `view/index.html`：无桥环境自动走 `localStorage` 回退。卡片形态另可用 `module/index.html` 的 `xhub-variant` 参数取 compact / standard / wide 三档 |

运行时零外部依赖；仓库根 `package.json` 唯一声明的是界面走查用的 `playwright-core`。

## 三、怎么验收（只需 node）

| 命令 | 跑什么 |
|---|---|
| `npm test` | 无头快门禁（约 20 秒，收口必跑） |
| `npm run test:ui` | 无头 + 界面走查（需系统 Edge，数分钟） |
| `npm run test:sim` | 追加全程仿真模拟 |
| `npm run test:full` | = ui + sim |
| `npm run ledger:fix` | 把探针自打的读数刷进文档哨兵段（升扩展版本后必跑） |
| `node .tests/run-smoke.cjs` 等 | 进扩展目录逐件跑，判据看各件末行标记 |

判据 = **末行 `DOD_ALL_GREEN <件数>`**；任一子件红 ⇒ `DOD_FAILED` 且退码 1，并按 `docs/ledger.json` 的 `attrib` 打印该件的事实源、同动点与最小复现命令。**关数、件数、断言数一律看上方生成段与 [`docs/FACTS.md`](docs/FACTS.md)，本文不复制读数。**

静态审计分四组（逐关定义见 [`docs/三千世界-工程规范与验收计划.md`](docs/三千世界-工程规范与验收计划.md)）：

| 组 | 守什么 |
|---|---|
| **A 组** | 词表与代码卫生：CJK 裸字 / 键对账 / DOM id 唯一 / 孤儿键 / 写点声明集 |
| **B 组** | x-hub 平台关卡：manifest / 权限 / 零 CDN / 主题铁律 / 卡片纪律 / 桥容错 |
| **C 组** | 世界包词族契约（换世界不许改引擎） |
| **D 组** | 账本与装载：D1 读数生成化 · D2 加载顺序单源 · D3 世界专属别名封闭 · D4 唯一事实源自洽 |

## 四、仓库结构

**游戏本体只有一份**，在 `extensions/com.avalonlee.sanqian-world/` —— 宿主加载的就是这个目录，它自己就是完整的扩展根。仓库根不再复制 `assets/` 或 `manifest.json`（审计 **D4** 判红）。

```
仓库根
├── extensions/com.avalonlee.sanqian-world/   ← 唯一事实源
│   ├── manifest.json         扩展清单（id / version / 四形态 entry / moduleVariants）
│   ├── view/index.html       主入口：<script src> 顺序 = 装载序列唯一事实源
│   ├── view/*.js · ui.css     视图专属件（成就 / 日志 / 公告 / 法段 / 器段… 逐页外置，只挂 view）
│   ├── module/index.html     工作台卡片（引擎段序列必须等于 view 里 assets/ 那一段 = D2）
│   ├── assets/               引擎与数据：core.js + systems/ + worlds/xiuxian/ + lexicon/ …
│   ├── .tests/               回归资产：冒烟壳+十片 · 审计 · 仿真 · 探针 · 走查 · 账本工具
│   ├── DESIGN.md · icon.svg
├── docs/                     设计正典（45 份现行卷 + _archive 只读归档）
└── README.md / AGENTS.md / CLAUDE.md / package.json / LICENSE
```

## 五、存档与容量

| 项 | 口径 |
|---|---|
| **主档** `sanqian-state-v1` | 机制态（角色 + 本世世界态 + `meta` 跨世账本）；展示流落盘前剥离 ⇒ 不会越玩越大 |
| **侧档** `sanqian-logs-v1` | 日志 + 奇遇叙事 feed，各自带字节预算，超预算从最旧挤起 |
| **编码** | 平台（有桥）= `d1:` + base64(deflate)，走 Web 标准 `CompressionStream`；无桥预览与走查仍是明文 JSON；读端三态全收，旧档零迁移 |
| **容量线** | 红线 64KB / 触发线 56KB，量**编码后**字节；`SQ.SAVE_RED` / `SQ.SAVE_TRIGGER` 是单一事实源，测试一律读它不硬编码 |
| **玩家数据** | `.storage.json`（宿主实时存档）已被 `.gitignore` 排除，**永不入库**；离线读档用 `node .tests/storage-read.cjs`（调查件，不作容量判据） |

## 六、文档地图

`docs/` 是设计唯一正典，总索引 = [`docs/README.md`](docs/README.md)。按问题找文件：

| 想知道 | 去哪 |
|---|---|
| 现行**计数与池口径** | [`docs/FACTS.md`](docs/FACTS.md) |
| 现行**版本号**（每卷） | [`docs/VERSIONS.md`](docs/VERSIONS.md) |
| **还没做什么**（销号唯一落点） | [`docs/三千世界-代码实施任务清单.md`](docs/三千世界-代码实施任务清单.md) 的「现行未实施表」 |
| **某一批做了什么**（单账本） | [`docs/三千世界-项目设计文档.md`](docs/三千世界-项目设计文档.md) §七A |
| 工程规范 / 存档字段契约 / 断言总表 / 工作树纪律 | [`docs/三千世界-工程规范与验收计划.md`](docs/三千世界-工程规范与验收计划.md) |

## 七、多世界现状

世界名册 6 界：**1 界可投生（玄幻修仙，已 live）+ 5 界灰显待开启**（`pack: null`，不可投生）。屏上正名与工程 id、目录名分开管理——改 id 会牵动存档 `profile.worldId` 与整套词表命名空间，所以只改显示层，全量改名登记在任务清单 **N30**。未启动的五界不排期、不新增跨世界字段或存档容器。

世界包契约（工程规范 §2.2）：`lexicon` / `initialState()` / `normalize(raw)` / `claim()` / 数据表 / `attributes` / `specialHooks` / `worldSystems`。通用层与视图**禁止直读世界专属全局** `SQ.XDATA`（审计 **D3** 拦，在册例外按出现次数钉死）。

## 八、给贡献者

| 规则 | 说明 |
|---|---|
| **分支流** | 所有改动先进 `dev`（`feature/xxx → dev`）；`master` 只接受 `dev → master` 的发布合并。直连 `master` 的 PR 被必需检查 **`branch-policy`** 拦下，管理员也不能直推 |
| **改前先读** | [`AGENTS.md`](AGENTS.md) 的硬规矩——每一条都对应过一次真实返工 |
| **读数不手抄** | 现行计数由 `docs/ledger.json` + 各文件 `SQ:LEDGER` 哨兵段生成；升扩展版本 = 改 `manifest.json` 一处 + `npm run ledger:fix` |
| **装载序列单源** | 新增系统 `.js` 只挂进 `view/index.html`；视图专属件走 `view/` 同目录，不进 `assets/`、不挂 `module/` |
| **历史注不改写** | 版本志与批次史只追加；升版走「卷头换新注、旧注原文推入卷末版本志最前」 |
| **仓根不留一次性件** | 调试脚本 / 备份 / 日志一律写到仓库之外（`git status` 干净不代表仓根干净） |

## 九、许可证

代码、设计文档、游戏文案与数值表全部以 **CC BY-NC-SA 4.0**（署名 — 非商业性使用 — 相同方式共享）发布；`LICENSE` 是官方英文条文全文。`SPDX-License-Identifier: CC BY-NC-SA-4.0`。

- 署名希望写成：*三千世界（sanqian-world）by avalonlee*，来源 https://github.com/AvalonLee/sanqian-world ，并注明是否修改。
- 衍生作品须用同一协议，且不得商用。需要商业授权请通过上述仓库联系作者。
- 本仓库不含第三方素材与外部服务：零 CDN、零外链、无外部字体与音视频；全部游戏文案与数值表均为原创（词表落 `assets/lexicon*` 与 `assets/worlds/xiuxian/lexicon-*.js`，审计 A1/A2/A4 钉死）。
