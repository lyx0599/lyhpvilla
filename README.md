# 林屿湖畔别墅规划工具

这是一个给自住房装修方案用的空间规划工具。它不是一张静态效果图，也不是只展示户型的页面；它把多楼层结构、庭院、家具、柜体、点位、施工备注和发布流程放在同一份可校验的数据里，方便持续调整方案。

在线预览：

```text
https://lyx0599.github.io/lyhpvilla/
```

本地预览：

```bash
pnpm dev --hostname 127.0.0.1 --port 3010
```

打开：

```text
http://127.0.0.1:3010/
```

## 项目现状

林屿湖畔正在从“户型查看器”持续演进为一套以真实全屋数据为底座的别墅设计与施工沟通工具：B2、B1、1F、2F 与庭院共用同一套结构、家具、柜体、灯具、机电点位和材质数据，2D、普通 3D、房间体验与全屋探索复用同一场景模型。当前版本已经完成图纸驱动编辑器、五大专业工作区、模拟人生式别墅总览与房间体验、第一/第三人称探索、统一高度体系、家具与柜体精细化、真实灯光控制、对象可信度以及检查器分级重构；用户可以从全屋俯视进入单个房间，也可以按楼层、房间和类型查找对象，在编辑模式处理尺寸、关系与碰撞，在展示模式查看完整材质、灯光和空间效果，最后通过图纸包检查成熟度并导出施工沟通资料。

### 当前能力

- **统一全屋模型**：总平面 3D 汇总各工作区最新成果，不维护旧版简化模型；普通 3D 与探索模式保持墙高、家具数量、柜体高度、材质和灯光一致。
- **五大工作区**：空间布局、拆改、家具与设备、水电与照明、顶面与饰面。插座、开关、灯光、给水、排水等专业能力只在对应上下文出现。
- **两层 3D 体验**：支持别墅总览、单层俯视、斜向总览、智能切墙、房间隔离、室内全景、俯视房间和轻量漫游。
- **统一对象交互**：画布与对象列表双向选中和定位；对象可按楼层、房间和类型分组，并按名称、编号、待确认、冲突、未绑定和隐藏状态筛选。
- **真实数据与显示状态分离**：位置、尺寸、高度、宿主墙体和材质属于项目数据；隐藏、透明、剖切、标签与高亮只影响显示，不会改变几何。
- **数据可信度**：对象可标记为已核实、现场实测、来自开发商图纸、估算或待确认，并在属性与检查流程中保留来源。
- **可信检查器**：结果分为确定冲突、高风险、待确认资料、建议优化和系统数据异常，可从检查项直接定位到相关对象。
- **施工图纸包**：输出图纸与编辑工作区分离；图纸包根据对象、图例、标注和导出条件显示成熟度，施工沟通资料可导出为 HTML、CSV 或 JSON，PDF 可通过打印页面生成。

### 主要操作路径

1. 在顶部选择楼层和工作区。
2. 在左侧对象列表中查找对象，或切换到创建工具添加内容。
3. 使用画布上的 2D / 3D、编辑 / 展示、漫游和图层控制检查方案。
4. 选中对象后，在右侧属性面板调整真实数据并查看可信度。
5. 进入“检查”处理冲突与待确认资料。
6. 进入“图纸包”查看正式输出图纸的成熟度并导出。

工作区、视图和输出图纸是三个不同概念：工作区负责编辑，视图只改变显示方式，只有具备独立对象、图例、定位标注与导出条件的内容才进入正式图纸包。旧 `DrawingSheetType` key 与历史入口仍通过兼容层保留，不破坏已有项目文件、保存、撤销重做和导入导出逻辑。

## 方案数据

项目唯一的默认方案主数据源是：

```text
data/default-workspace.json
```

它保存这些内容：

- `floors`
- `houseStructuresByFloor`
- `furniture`
- `semanticObjects`
- `cameraViews`
- `visualSettingsByFloor`
- `cleanPatchesByFloor`

页面启动时的数据流大致是：

```text
data/default-workspace.json
  -> workspace schema 校验
  -> applyWorkspaceMigrations
  -> data/mock-space.ts 适配成页面使用的 SpaceData
  -> SpacePlanner / PlanCanvas / Floor3DView
```

几个重要约束：

- `data/default-workspace.json` 是真实方案，不是临时导出物。
- `data/mock-space.ts` 只做适配，不应该重新维护一套真实户型数据。
- `data/mock-house-structure.ts` 和 `data/mock-semantic-map.ts` 主要是旧迁移资料，正常启动不应依赖它们。
- 迁移只补旧数据缺失字段，不应该覆盖已有房间、墙体、家具或数组内容。
- 家具的 3D、机电和施工元数据可以自动补缺，但不能擅自改位置、尺寸、房间、名称或材质。

## 本地保存

页面编辑默认会先保存在浏览器草稿里。

如果要把页面里的方案直接写回代码，另开一个终端启动本地写入服务：

```bash
pnpm local-code-sync
```

服务地址：

```text
http://127.0.0.1:3011
```

开启页面里的“自动写代码”后，当前方案会写入：

```text
data/default-workspace.json
```

每次覆盖前会自动备份旧文件：

```text
data/backups/default-workspace-YYYYMMDD-HHmmss.json
```

写入后服务会回读文件并比较 hash，只有确认一致才算“代码已验证”。这个服务只用于本机开发，不部署到线上。

## 访问权限

权限由 `accessMode` 控制，不靠屏幕宽度临时判断。

- `view-only`：手机端默认。只能浏览、切楼层、查看对象信息和截图，不能改方案、写代码或同步 GitHub。
- `comment-only`：预留给评论和现场反馈。
- `controlled-edit`：预留给低风险编辑，未来应走 pending changes / proposals。
- `full-edit`：桌面端默认，允许完整编辑、草稿、代码写入和发布工作流。

手机 `mobile-presentation` 仍然应该保持只读。旋转横屏不应升级为编辑模式。

权限回归：

```bash
pnpm test:workspace-access
```

## 物品与渲染

物品模块库在：

```text
data/interior-module-catalog.ts
```

顶视图符号在：

```text
components/furniture-top-view.tsx
```

画布使用：

```text
components/plan-canvas.tsx
```

3D / 材质 / 类型推断在：

```text
lib/render3d-assets.ts
components/floor-3d-view.tsx
```

新增物品模块时，建议同时确认：

- 模块库里有可添加的 catalog item。
- `moduleType` 和 `render3d.assetType` 能表达真实物品，不要只塞进普通 `table` 或 `cabinet`。
- 顶视缩略图和画布对象长得一致。
- 3D 里至少有稳定的体块表达和默认材质。
- `types/space.ts` 里的类型允许这个新模块。

## 家具变体与现代自然风

程序化家具不再只由 `assetType` 决定外形。`lib/furniture-variants.ts` 统一管理床、沙发、餐桌、茶几、椅子和柜体家族，2D 顶视图与 3D renderer 共用 `variantId`：

- `variantId` 表示结构差异，例如悬浮平台床、L 型沙发、圆形中柱桌或开放封闭组合柜。
- `variationSeed` 由家具 ID 生成并持久化，同一变体可获得稳定的小差异，刷新和导入后不会变化。
- `stylePreset: "modernNatural"` 使用浅橡木、暖白、米灰布艺、暖灰石材、洞石、浅茶玻璃和少量深色金属。
- `detailLevel` 分为 `draft`、`standard` 和 `presentation`；普通对象默认标准，重点家具使用展示级，草图级会减少圆角分段、靠包和分缝。
- `modelAssetId` 与 `assetUrl` 仅作为后续 GLB/GLTF 接入预留，本版不会加载外部模型。

家具工作区的“现代自然风方案”可按房间、楼层或全屋应用，并显示调整与保留数量。`locked`、`styleLocked` 或人工选择的对象不会被自动覆盖；操作支持一次撤销和重做。属性面板可切换家族、中文变体、三层材质、细节等级与稳定种子。

更新默认方案时运行：

```bash
pnpm apply:furniture-style
pnpm test:furniture-variants
```

## 验证命令

核心检查：

```bash
pnpm typecheck
pnpm validate:workspace
pnpm test:workspace-migrations
pnpm test:workspace-references
pnpm test:workspace-access
pnpm test:drawing-sheets
pnpm test:construction-export
pnpm test:save-service
pnpm test:object-sync
```

聚合检查：

```bash
pnpm test
```

移动端只读检查：

```bash
pnpm test:mobile
```

构建检查：

```bash
pnpm build
pnpm build:pages
pnpm check:pages-build
```

发布前至少确认：

- `data/default-workspace.json` 通过 schema 校验。
- workspace 引用校验通过。
- 手机 presentation 仍为只读。
- Pages 产物路径包含 `/lyhpvilla/_next/`。
- Pages 产物里的底图路径包含 `/lyhpvilla/floor-plans/`。
- 图纸命名 alias 通过 `pnpm test:drawing-sheets`。
- 施工沟通包目录、清单字段、校验摘要和视角说明通过 `pnpm test:construction-export`。
- `out/.nojekyll` 存在。
- `out/404.html` 存在。

## 发布

Pages 构建：

```bash
pnpm build:pages
```

推送 `main`：

```bash
git push origin main
```

GitHub Actions 会发布到：

```text
https://lyx0599.github.io/lyhpvilla/
```

默认方案会被编译进 JavaScript，不是线上独立读取的 JSON。所以只改 `data/default-workspace.json`、底图或模块库后，也必须重新构建并发布。

## 目录速览

```text
app/                         Next.js App Router 页面入口
components/                  主要 UI、画布、3D、对象面板
data/default-workspace.json  默认方案主数据
data/interior-module-catalog.ts  物品模块库
lib/                         schema、迁移、引用校验、3D 元数据、保存服务逻辑
scripts/                     校验、构建检查、本地写入服务、迁移脚本
tests/                       Playwright 移动端只读测试
types/                       workspace、space、semantic map 类型
public/floor-plans/          楼层底图资源
```

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Three.js / React Three Fiber
- GitHub Pages

## 维护原则

- 先稳住基础设施，再加图纸包、给排水、灯光、吊顶、铺装、墙面和材料索引等专业功能。
- 默认数据只维护一份，避免 mock、浏览器草稿和代码文件互相覆盖。
- 增加物品时，模块库、2D 顶视、3D 体块和类型定义要一起更新。
- 发布前跑校验和 Pages 构建，别只依赖本地页面看起来能打开。
- 不要把本地预览图片、临时 HTML 或未确认的 workflow 改动混进功能提交。
