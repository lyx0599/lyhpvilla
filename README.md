# 别野效果展示模型

一个面向自住房装修决策的可视化空间规划工具。它把多层住宅、庭院、墙体、门窗、楼梯、柜体、家具和施工表达放进同一套结构化模型里，让方案可以在网页里持续调整、校验、保存和发布。

在线预览：

```text
https://lyx0599.github.io/lyhpvilla/
```

## 项目定位

别野效果展示模型不是静态效果图页面，而是一个可以反复编辑的装修方案底盘。

它适合在复尺前先推演空间关系、收纳容量和动线，也适合在复尺后继续承载尺寸校准、硬装模块、点位图、采购清单和施工沟通。

## 主要能力

- 多楼层模型：支持 B2、B1、1F、2F 和庭院视图。
- 结构编辑：墙体、房间、门窗、飘窗、楼梯、院子、篱笆和硬地都可以作为对象管理。
- 尺寸校准：墙体可选中后手动调整长度，并配合结构检查器做全屋比例校准。
- 家具布置：家具和设备可点击、拖动、旋转、改尺寸、改材质和备注。
- 柜体设计：支持衣柜、玄关柜、岛台、橱柜、零食柜、书架、洞洞板等模块化设计。
- 图纸表达：总平面、空白结构、联动规则、施工标注、家具布置、插座、开关、灯光、水路、排水、吊顶、铺装和效果预览。
- 本地保存：页面编辑会先保存在当前浏览器。
- 代码同步：本地写入服务开启后，页面改动可以同步写入 `data/default-workspace.json`。
- 静态发布：通过 Next.js 导出 `out` 目录，并发布到 GitHub Pages。

## 访问模式

页面权限由明确的 `accessMode` 控制，不由视口宽度直接决定：

- `view-only`：手机端当前默认。只允许楼层切换、2D/3D 浏览、视图手势、对象信息卡和截图；不允许方案 mutation、浏览器草稿、本机服务、代码文件或 GitHub 同步。
- `comment-only`：预留给评论、圈注和现场反馈；这些内容不得直接修改主方案对象。
- `controlled-edit`：预留给低风险调整；未来修改必须进入 `pendingChanges` / proposals，经桌面端确认后才能合并。
- `full-edit`：桌面端默认，保留完整编辑、草稿和代码写入能力。

`comment-only` 与 `controlled-edit` 当前只定义权限能力，不在手机 UI 中开放。手机识别基于设备信号，旋转横屏不会升级为 `full-edit`。

权限自检：

```bash
pnpm test:workspace-access
```

## 自动化回归门禁

提交与 Pull Request 的最小门禁包括：

- `pnpm typecheck`：TypeScript 静态检查。
- `pnpm validate:workspace`：默认 workspace schema、有限数值、唯一 ID 与引用完整性。
- workspace migration、reference、access 回归测试。
- `pnpm test:save-service`：在临时目录验证备份、写入、回读 hash、非法请求和回滚。
- `pnpm test:object-sync`：验证 2D/3D ID、开口 host 与坐标往返。
- `pnpm test:mobile`：iPhone 竖屏/横屏和 Android 的只读 smoke test。
- `pnpm build` 与 Pages 子路径产物检查。

本地核心门禁：

```bash
pnpm test
```

包含移动端和生产构建的完整门禁：

```bash
pnpm test:ci
```

保存服务测试只使用系统临时目录；移动端测试使用独立开发端口且禁止访问本机写入服务，不会覆盖 `data/default-workspace.json`。

## 当前方案数据

`data/default-workspace.json` 是项目唯一的持久化方案主数据源：

```text
data/default-workspace.json
```

它统一保存 `floors`、`houseStructuresByFloor`、`furniture`、`semanticObjects`、`cameraViews`、`visualSettingsByFloor` 和 `cleanPatchesByFloor`。页面刷新、浏览器草稿迁移和保存写回都必须先经过同一套 workspace schema。

数据流为：

```text
data/default-workspace.json
  -> applyWorkspaceMigrations(workspace)
  -> data/mock-space.ts（仅适配 SpaceData 与部署资源路径）
  -> SpacePlanner / PlanCanvas
  -> 浏览器草稿或本地写入服务
  -> data/default-workspace.json
```

约束如下：

- `data/mock-space.ts` 不存放真实楼层、房间、墙体或家具，只负责适配。
- `data/mock-house-structure.ts` 和 `data/mock-semantic-map.ts` 只保留旧数据迁移资料，正常启动不会导入它们。
- 真实房间和墙体来自 `houseStructuresByFloor.*.rooms` 与 `houseStructuresByFloor.*.walls`；旧 `SpaceData.rooms/walls` 仅是 deprecated debug fallback。
- `applyWorkspaceMigrations` 只对旧 `schemaVersion` / `dataRevision` 缺失字段做幂等补齐。已有字段和已有数组（包括空数组）不会被默认数据覆盖或追加。
- 家具运行时 enrich 只补缺失的 `render3d`、`mepMeta`、`constructionMeta`，不修改位置、尺寸、房间、名称或材质。
- 开发环境控制台会输出 `[workspace source]` 表格，显示各类数据来自 `default-workspace` 还是 `migration`；正常默认方案不应出现 `fallback` 或 `mock`。

迁移自检：

```bash
pnpm test:workspace-migrations
```

当前默认数据已包含：

- 2F 房间命名：客卫、衣帽间、主卫、卧室1、卧室2。
- 2F 门窗：7 扇门、5 扇普通窗、2 扇飘窗。
- 2F 衣帽间方案：左右墙柜体、窗边整理桌，重点满足挂衣、包包和被褥收纳。
- 1F 与庭院的结构、家具、围合和模块库配置。

## 本地运行

安装依赖：

```bash
pnpm install
```

启动本地预览：

```bash
pnpm dev --hostname 127.0.0.1 --port 3010
```

打开：

```text
http://127.0.0.1:3010/
```

## 本地页面直接写代码

如果希望在页面上调整方案后，直接同步到代码里的默认方案文件，另开一个终端启动本地写入服务：

```bash
pnpm local-code-sync
```

然后保持页面上的「自动写代码」开启。页面会先保存浏览器草稿，再把当前方案写入：

```text
data/default-workspace.json
```

每次覆盖前，服务会把旧代码文件备份到：

```text
data/backups/default-workspace-YYYYMMDD-HHmmss.json
```

写入完成后，页面会重新读取代码文件并比较 SHA-256；只有内容一致才显示「代码已验证」。当前页面方案仍会额外保存在 `.codex-current-browser-workspace.json`，用于本机排查。

这个服务只监听 `127.0.0.1:3011`，允许来自任意本机 `localhost` / `127.0.0.1` 端口的开发页面访问，不需要部署到线上。

## 构建发布

普通构建：

```bash
pnpm build
```

GitHub Pages 发布构建：

```bash
pnpm build:pages
pnpm check:pages
```

推送代码到 `main` 分支：

```bash
git push origin main
```

GitHub Actions 会安装依赖、执行 Pages 专用构建、检查 `out`，再发布到：

```text
https://lyx0599.github.io/lyhpvilla/
```

发布不依赖本地或仓库中旧的 `out`。检查脚本会确认 `out/index.html` 与 `out/404.html` 的 Next.js 资源带 `/lyhpvilla/_next/` 前缀、底图带 `/lyhpvilla/floor-plans/` 前缀、`.nojekyll` 存在，并拒绝开发模式产物。

如需临时手工提交 `out`，发布前必须运行：

```bash
NEXT_PUBLIC_BASE_PATH=/lyhpvilla pnpm build
touch out/.nojekyll
pnpm check:pages
```

`data/default-workspace.json` 不是线上独立接口或静态 JSON；它会被编译进 JavaScript。默认方案、底图或其他 `public` 资源更新后，都必须重新构建并发布，不能只上传 JSON。

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Three.js / React Three Fiber 预留
- GitHub Pages 静态部署

## 后续方向

- 把 2D 结构模型逐步转成可检查的 3D 白模。
- 为柜体、卫浴、厨房、电器和软装建立更完整的参数化模块。
- 将墙长、门窗、房间名称和家具布置纳入更清晰的版本记录。
- 输出更适合施工沟通的点位图、立面图和采购清单。
