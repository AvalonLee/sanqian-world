<!-- 本仓分支规则：所有改动先进 dev；master 只接受 dev → master 的发布合并。
     base 选错会被 branch-policy 检查拦下，改 base 比重开 PR 快。 -->

## 目标分支确认

- [ ] **base 是 `dev`**（日常改动一律进 dev）；或本 PR 是 **`dev → master` 的发布合并**
- [ ] 标题用 `[类型] 一句话`，与 issue 模板同族：`[BUG]` / `[体验]` / `[功能]` / `[文档]` / `[整治]`

## 这个 PR 改了什么

<!-- 一到三行。为什么这么改 > 改了什么细节。 -->

## 属于哪一类（勾一个）

- [ ] 玩法/数值（会改 `assets/worlds/**` 的数据表或结算逻辑）
- [ ] 引擎/系统（`assets/systems/**`、`assets/core.js`）
- [ ] 视图/卡片（`view/index.html`、`module/index.html`）
- [ ] 文案词表（`assets/lexicon*`、`assets/worlds/xiuxian/lexicon-*.js`）
- [ ] 测试与门禁（`.tests/**`）
- [ ] 文档（`docs/**`）
- [ ] 仓库结构 / CI

## 收口证据（必填，除「纯文档」外）

```
把实际跑出来的末行原样贴上来，不要只写「已测试」：

npm test            → DOD_ALL_GREEN 18 件 / 断言合计 …
改了界面再跑         → npm run test:ui   → 末行 …
改了玩法数值/节奏    → npm run test:sim  → 末行 …（sim 的轨迹锚若换值，必须在下面说明）
改了任何现行读数     → npm run ledger:fix 后 npm test 仍绿
```

- [ ] `npm test` 全绿（18 件，无头约 20 秒）
- [ ] 改动涉及界面 ⇒ `npm run test:ui` 全绿（27 篇）
- [ ] 改动涉及结算/掉率/节奏 ⇒ `npm run test:sim` 全绿，且 **`sim-playthrough` 轨迹锚 md5 若变化已写明原因**
- [ ] 新增/删除关卡、走查篇数、断言数 ⇒ 已 `npm run ledger:fix`（**不许手抄读数**）

## 会影响存档吗（勾一个）

- [ ] 不影响存档结构
- [ ] 新增字段：已同步 `worlds/*/initialState()` + `normalize()`，且旧档读入不丢数据
- [ ] 改了落盘内容：已核 `#206` 编码后字节仍在 **64KB 红线**内（探针 `probe-savecap` / `probe-savegrowth` 已跑）

## 已知风险与未做

<!-- 没有就写「无」。写「未做」比写「应该没问题」有用。 -->
