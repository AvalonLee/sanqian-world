# 册169 书形态半成品 · 归档件（stash 材料化）

| 项目 | 内容 |
|---|---|
| 归档批 | 第册二百八十八批（2026-11-08 · 用户裁定「相关资料和代码都进行归档或者整理」） |
| 来源 | git stash `册169半成品封存（创角指引未完成，随档留存不入dev）`——封存于 `creation-polish2` 分支时代 |
| 基线 commit | `c02f68a`（Merge PR #157 creation-reorder；stash 的父提交，patch 复原基线） |
| 正本 | [`册169-创角指引键族.patch`](./册169-创角指引键族.patch)（stash diff 逐字节，51 行） |
| 复原验证 | 已在基线 `c02f68a` 上 `git apply --check` 干净通过（册288 执行） |
| stash 处置 | 正本落本目录后 `git stash drop`，stash 不再保留 |

## 一、内容是什么

`assets/lexicon.js` 一处未完成 diff（+23/-1），**书形态（小说放置）创角指引键族**：

- `ui.book.guide.t` + `ui.book.guide.1~7` + `ui.book.guide.ok`——创角后「**楔子 · 开卷语**」九词：批书人定位 / 读 / 养 / 批 / 改（※分岔费墨三分、违和加身）/ 墨与违和规则 / 页脚账 / 开卷钮；
- `ui.book.manual.t` + `ui.book.manual.1~6` + `ui.book.manual.ok`——游戏内「**批书人小引**」手册八词（页脚顺序 / 破关心境 / 分岔落笔 / 页边批注 / 附录 / 墨厄）；
- `creation.step.2.book`（「先睹」，书世界创角第二步名）+ `creation.world.xiuxian`（「下一步：观天赋」）；
- world badge 三词：`world.xiuxian.badge`（可玩）/ `world.wuxia.badge`（试水）/ `world.wuxia.pitch`（「批书人的江湖 · 一本自己在写的书 · 页边落笔改命」）；
- 一处改口：`creation.world.next`「下一步：观天赋」→「下一步」（未选界不预设第三步）。

## 二、为何归档（回捡场景已灭）

- 书形态整族已于**册214** 退役（用户 2026-11-01 裁定武侠改常规放置 RPG；worldView / narrative / ink / discord / offlineStory + 书件物理删除，封存走 git 史）；
- 武侠现行形态 = **qunxia3d 山河棋盘 3D**（M0~M7 已收官，主路由缺省 3d）；
- 本键族服务的「书世界创角第二步 / 开卷语指引 / 批书人小引」界面在现行代码中已不存在，无回捡场景；
- 快照「半成品」行自册287 移交批起不再挂 stash 指针，改指本目录。

## 三、复原口径

patch 基于**册169 时代的 `assets/lexicon.js`**（blob `ab3b5b2`）。**不能直接 apply 到现行树**——lexicon.js 已历经册214 退役批与多批演进，逐字上下文必失配。复原步骤：

```bash
git worktree add --detach <临时目录> c02f68a
cd <临时目录>
git apply --check <仓库>/docs/_archive/书形态半成品-2026-11-08/册169-创角指引键族.patch  # 已验证干净
git apply        <仓库>/docs/_archive/书形态半成品-2026-11-08/册169-创角指引键族.patch
```

只取词不取diff 的话，直接读 patch 的 `+` 行即可——23 键全是自包含词表项，无代码逻辑。
