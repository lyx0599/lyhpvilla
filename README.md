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

## 当前理解

这个项目的核心目标是先把“别墅规划底盘”稳定下来，再逐步深化设计。

当前它主要服务三件事：

- 看清楚全屋关系：B2、B1、1F、2F、庭院可以在同一套模型里切换查看。
- 直接改方案：墙体、房间、门窗、楼梯、家具、柜体、庭院模块都能作为对象被选择、拖动、改尺寸、改材质和备注。
- 让数据可发布、可回滚、可继续维护：默认方案保存在 `data/default-workspace.json`，发布前必须通过 schema、引用、权限、构建和 Pages 路径检查。

目前不要把它理解成“最终施工图系统”。Drawing Package 已先收口为 `DrawingSheetType` 命名体系，给排水、灯光、吊顶、铺装、墙面和材料索引这些专业图纸可以在现有底盘上继续扩展，但它们不应该破坏当前的基础设施、默认工作区和手机只读模式。

Drawing Package System 使用统一的 `drawingItems` / `drawingPackage` 数据模型。点位与家具、房间、墙体共享 `default-workspace.json`、楼层 ID 和毫米坐标系；插座、灯光、给排水、吊顶及材料图只负责按 `DrawingSheetType` 过滤 category，不维护各自的私有数据副本。点位修改与结构、家具共用撤销/重做、浏览器草稿、代码文件保存、导入导出和引用校验链路。

编辑模式可按当前楼层或全屋从 `furniture.mepMeta` / `constructionMeta` 生成插座、灯光、给水、排水、网络、通风和检修提示点。生成以 `relatedFurnitureId + category + type` 为幂等键；自动点位若经过人工移动或编辑，后续生成会先提示冲突，不会静默覆盖。这里表达的是预留需求点和施工沟通草图，不包含专业管线路径。

第四阶段继续在 DrawingItem 上承载开关控制关系、吊顶区域、地面铺装区域和墙面材料做法。开关可绑定灯点/灯组；吊顶和铺装使用同一毫米坐标 polygon；墙面材料绑定真实 wallId；柜体深化同时汇总 constructionMeta、mepMeta 和关联点位。第一版表达区域、材料、标注和施工沟通关系，不包含复杂电路或节点详图。

施工沟通包工作流：先从家具 `mepMeta` 生成本层或全屋需求点，再在专业图纸中移动点位、补充控制关系/材料/状态并确认人工调整，最后从图纸包面板导出 HTML、CSV 或 JSON。导出前会检查 drawingItems 引用、孤立点位、draft 和待复核项；HTML 总说明保留这些校验结果，并按楼层输出全部正式图纸、版本、导出时间、状态和 cameraViews 手动截图入口。HTML 面向阅读，CSV/JSON 面向清单复核和后续加工。

## 使用入口

进入页面后，常用入口是：

- 楼层切换：查看 B2 / B1 / 1F / 2F / 庭院。
- 正式图纸：查看总平面图、结构图、拆改施工图、家具定位图、机电点位、吊顶、地面、墙面、材料索引和施工标注/待确认项。
- 物品模块库：新增家具、柜体和庭院模块。
- 当前对象：编辑选中对象的尺寸、位置、材料、备注、机电和施工信息。
- 2D / 3D 展示：查看对象在空间里的体块表达；展示视图不进入正式施工图纸目录。

正式图纸类型使用这些 key：

```text
sitePlan, structurePlan, demolitionAndBuildPlan, furniturePlan,
socketPlan, switchPlan, lightingPlan, waterSupplyPlan, drainagePlan,
ceilingPlan, floorFinishPlan, wallFinishPlan, materialPlan, annotationPlan
```

旧的 `site`、`structure`、`construction`、`furnishing`、`socket`、`switch`、`lighting`、`water`、`drainage`、`ceiling`、`flooring` 会通过 alias 兼容到新 key。旧 `preview` 归到展示视图 `presentationView`，旧 `sync` 归到检查/调试层 `structureSyncCheck`。当前给水、排水图表达“给水点位图 / 排水点位图”，主要记录预留点和需求点，不表达专业管线路径。

近期物品模块库已经扩展到更细的表达，不再把所有桌子都画成六人餐桌。比如：

- 大板桌：长条厚板桌面 + 金属支脚。
- 休闲茶几：低矮茶几外形。
- 墙面吊柜：贴墙悬挂柜表达。
- 户外收纳柜：庭院防水柜体。
- 庭院桌椅、晾晒架、宠物屋、院门、庭院灯、户外插座、地漏/排水点。

模块库缩略图和画布上的对象使用同一套顶视符号逻辑，添加前后应该看起来一致。

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
