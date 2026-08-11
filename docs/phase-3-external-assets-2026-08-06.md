# 阶段三：免费外部资产与专业 PBR 资源验收

日期：2026-08-06

本阶段以现有样板间画面中的奶油白、浅橡木、暖灰石材、低对比纹理和圆润现代轮廓为筛选依据。只采用能核验授权、来源和文件依赖的资源；小型软装、整屋模型、整墙/整地覆盖模型均未加入。

## 已加入的家具模型

### 浅木三层边几

- 位置：1F / 客厅。
- 替换原家具：`furn-1f-living-side-table-001` 的简化边几渲染分支；原对象、位置、朝向和尺寸数据保留。
- 来源：<https://polyhaven.com/a/side_table_01>
- 授权：CC0；作者 James Ray Cock；无需署名。
- 资产：`public/assets/external/polyhaven/models/side_table_01/2k/side_table_01.gltf`。
- 原始格式：glTF 2.0 + BIN + JPG PBR maps。
- 规模：2,756 triangles；模型外接尺寸约 550 × 450 × 551 mm；3 张 2K JPG 纹理，合计约 1.4 MB，另有约 115 KB BIN。
- 通道：Base Color、Normal (GL)、AO；Metalness/Roughness 使用原始 packed ARM 图，未启用 Height。
- 普通版：2K 资源、保持原有选择和阴影逻辑；展示版：沿用同一几何和材质，不额外堆叠装饰物。
- 回退：GLB/glTF 加载前、加载失败或资源路径失效时，自动回到原程序化边几；旧资源未删除。

### 暖木石材现代茶几

- 位置：B2 / 客厅。
- 替换原家具：`furn-b2-living-coffee-table-001` 的透明玻璃茶几简化渲染分支；原对象、位置、朝向、尺寸和交互数据保留。
- 来源：<https://polyhaven.com/a/modern_coffee_table_01>
- 授权：CC0；作者 Amin；无需署名。
- 资产：`public/assets/external/polyhaven/models/modern_coffee_table_01/2k/modern_coffee_table_01.gltf`。
- 原始格式：glTF 2.0 + BIN + JPG PBR maps；总文件约 4.7 MB。
- 规模：4,504 triangles；按现有对象 1,200 × 700 × 380 mm 包络校正；3 张 2K JPG 纹理。
- 通道：Base Color、Normal (GL)、Roughness；原资源未提供独立 AO/Height，Height 保持关闭。
- 普通版：同一 2K 轻量模型，维持正常交互；展示版：保留完整法线和粗糙度，不额外堆叠靠垫或装饰物。
- 回退：加载失败自动恢复原透明玻璃茶几程序化分支；旧资源未删除。

### 木条户外桌椅组

- 位置：YARD / 南院生活庭院。
- 替换原家具：`OUT-S-RELAX` 的程序化户外桌椅组；原对象、位置、朝向、尺寸和庭院服务关联保留。
- 来源：<https://polyhaven.com/a/outdoor_table_chair_set_01>
- 授权：CC0；作者 James Ray Cock；无需署名。
- 资产：`public/assets/external/polyhaven/models/outdoor_table_chair_set_01/2k/outdoor_table_chair_set_01.gltf`。
- 原始格式：glTF 2.0 + BIN + JPG PBR maps；总文件约 3.2 MB。
- 规模：9,828 triangles；按现有对象 2,400 × 1,500 × 780 mm 包络校正；6 张 2K JPG 纹理。
- 通道：桌椅分别使用 Base Color、Normal (GL)、Metalness/Roughness packed；原资源未接入独立 Height。
- 普通版：2K 资源，控制桌椅组的面数和纹理数量；展示版：复用同一 2K 资源，避免庭院远景产生不必要的内存开销。
- 回退：加载失败自动恢复原户外桌椅程序化组；旧资源未删除。

## 已加入的硬装 PBR

### 暖米色哑光湿区瓷砖

- 位置：B1 / 迷你盥洗洗衣间地面；现有真实房间和地面几何不变。
- 来源：<https://polyhaven.com/a/floor_tiles_08>
- 授权：CC0；作者 Rob Tuytel；无需署名。
- 资产：`public/assets/external/polyhaven/materials/floor_tiles_08/2k/`。
- PBR 通道：Base Color、Normal (GL)、Roughness、AO；Height 明确关闭，不使用 Roughness/AO 伪造 Bump。
- 物理尺度：约 1500 × 1500 mm 的资源尺度，运行时按实际铺装尺寸控制重复；桌面/移动端目标分别为 2K / 512 级别。
- 纹理文件：4 张 2K JPG，合计约 5.2 MB；普通模式采用优化后的加载路径，移动端可切换较低分辨率策略。
- 对照结论：比当前 `wetAreaTile` 的程序化颜色更接近样板间的暖米灰哑光效果，并保留规则、低对比的远景观感；没有覆盖已确认的浅橡木、米色洞石、暖白墙漆和玻璃策略。
- 回退：外部纹理任一通道加载失败时自动继续使用当前 `wetAreaTile` 程序材质；B1 真实地面几何和房间尺寸不变。

## 保留现状

- 沙发、单椅、餐桌椅、床、床头柜、卫浴设备和厨房电器：本轮候选没有同时满足样板间风格、近景造型、真实比例和性能的免费模型，因此未强行替换。
- 主要灯具：筛到现代磨砂玻璃吊灯候选，但现有场景没有可直接承载的对应吊灯对象；没有把吊灯错误挂到落地灯或改变照明结构，因此暂不加入。
- Poly Haven 的深色皮革沙发、黑色皮革单椅、深色古典木桌、白色大理石/黑色环形茶几等候选因颜色、材质或轮廓不匹配而未采用。
- 柜体、门窗、楼梯、扶手、栏杆、背景墙、台面和定制硬装继续使用当前真实几何与专项系统；没有下载整套柜体或通用门窗覆盖户型。
- 已确认的浅橡木、米色洞石、暖白墙漆和玻璃策略保持不变。
- 木地板、微水泥、布艺和庭院石材继续使用当前已验证的程序候选；AmbientCG 的木地板、瓷砖、金属、布艺和庭院石材候选在颜色、对比度、纹理方向或官方物理尺度信息上没有明显胜出，未加入。
- 暖白墙漆、浅橡木、米色洞石、玻璃继续采用已确认策略；本轮没有用新资源无理由覆盖。

## 验收与回退

- 资源清单：`lib/external-asset-manifest.ts`，包含名称、作者、来源、下载日期、授权、署名、原始格式、资产路径、项目使用位置、面数、纹理分辨率和回退映射。
- 外部资源加载：`lib/external-asset-manifest.ts` + `lib/render3d-assets.ts` + `components/floor-3d-view.tsx`；模型按目标家具尺寸重新居中、校正轴向和缩放，不改变原数据结构。
- PBR 加载：`components/scene-3d/procedural-pbr.ts`；外部贴图异步加载失败时继续程序化回退。
- 截图：`docs/phase-3-external-assets-qa/1f-living-after.png`、`1f-living-detail-after.png`、`b1-after.png`、`b2-living-after.png`、`b2-living-detail-after.png`、`yard-after.png`、`yard-detail-after.png`；现有基线对照位于 `artifacts/real-house-warmoak-travertine-before/`。
- 已通过：TypeScript 类型检查、默认工作区 schema、材质系统、三维结构、生产构建、外部资源清单和全部已加入 glTF 依赖检查。
- 已知既有失败：`test-furniture-variants.mjs` 仍因当前工作区已有的主卧床 variant 断言（`timberFrame` 与旧期望 `lowUpholstered`）失败；`test-navigation-render-quality-regression.mjs` 仍按旧的 192 条材质缓存上限断言，而当前实现为 768；两项均与本轮外部资产改动无关，未改动该现状。
- 浏览器开发服务器曾出现现有 `cabinet-interior` 模块的运行时错误；生产构建导出的静态页面可正常进入 3D 并切换 B2/院子，本轮没有把该既有问题与新模型混修。

## 空间级总体验收

- 客厅：加入浅木三层边几；正常观看与沙发模块近景已复核，沙发、壁炉收纳墙、餐区和门窗保持原几何。
- 餐厅：本轮未替换餐桌椅；保持现状。
- 厨房与柜体：本轮未替换柜体；保留宽高深、门板、抽屉、开放格、台面、拉手、玻璃门和悬浮状态。
- 主卧：本轮未替换床和床头柜；保持现状。
- 卫浴：未替换卫浴设备；B1 湿区地面加入暖米色 PBR，其他卫浴表面继续现有策略。
- 庭院：加入木条户外桌椅组；庭院真实几何、地面、石材和照明关联保持现状。
