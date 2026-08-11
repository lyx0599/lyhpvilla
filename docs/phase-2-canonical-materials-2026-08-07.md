# 第二阶段：canonical 材质分类与家具映射

日期：2026-08-07

## 阶段目标

在不下载新第三方资源、不改变户型和家具位置的前提下，补齐主要家具材质身份，建立清晰的 canonical PBR 分类，并保留程序化回退。

## 新增 canonical 材质

本阶段从原有 13 类扩展到 22 类 canonical 材质，新增：

- 浅橡木家具饰面 `lightOak`
- 低饱和深胡桃木 `darkWalnut`
- 奶油圈绒布艺 `creamBoucle`
- 米灰亚麻布艺 `greigeLinen`
- 低饱和棕色头层皮革 `cognacLeather`
- 深棕真皮 `darkBrownLeather`
- 拉丝古铜 `brushedBronze`
- 低饱和做旧黄铜 `agedBrass`
- 浅燕麦灰褐哑光漆 `oatTaupeLacquer`

新增材质均包含：

- Base Color
- Normal
- Roughness
- AO
- 真实物理尺寸
- UV 方向与旋转策略
- 普通/展示/移动端分辨率档位
- 程序化颜色回退

金属材质保留 Metalness 语义；本阶段新增材质没有接入 Height，不使用 Roughness 或 AO 伪造 Bump。

## 已完成的家具映射

| 家具 | 新材质映射 |
| --- | --- |
| 1F 六人圆餐桌套组 | `lightOak` + `warmGreyStone` + `brushedBronze` |
| 1F 客厅主沙发 | `creamBoucle` + `greigeLinen` + `blackTitanium` |
| B1 活动区休闲椅 | `greigeLinen` + `creamBoucle` + `darkWalnut` |
| B2 棕色真皮贵妃沙发 | `cognacLeather` + `cognacLeather` + `darkBrownLeather` |
| 2F 三张主要床具 | `creamBoucle` + `lightOak` + `greigeLinen` |
| 2F 衣柜与部分定制柜 | 继续使用 `oatTaupeLacquer` + `agedBrass` 的明确组合 |

1F 沙发边几、B2 茶几、床头柜、橱柜、卫浴和庭院对象的既有材质与外部模型回退均保留。

## 代码同步

- `lib/material-system.ts`：新增 9 类 canonical 定义、物理尺寸、通道、质量档位和别名。
- `lib/render3d-assets.ts`：新增材质进入正式三维材质解析，不再只使用临时颜色/粗糙度对象。
- `lib/furniture-variants.ts`：推荐家具材质映射同步到新身份。
- `app/pbr-audit/page.tsx`：PBR 审核页同步支持 22 类材质，并为新增材质提供基础审查入口。
- 现有家具位置、朝向、尺寸、资产 URL、回退关系和用户数据结构未改变。

## 验收结果

- TypeScript 类型检查：通过
- 默认工作区 schema：通过
- 材质系统测试：通过，22 canonical tokens
- 家具 variant、稳定 seed、样式保护和快照测试：通过
- 家具定位、墙体锚定和图纸同步：通过
- 三维结构渲染覆盖：通过，26 个墙体开口、12 个天窗
- 柜体材质覆盖与实例覆盖：通过
- 外部资源清单：通过，7 个清单条目及 glTF 依赖完整
- 生产构建：通过

生产构建结果：首页 406 kB，First Load JS 726 kB，PBR 审核页 10.6 kB / First Load JS 331 kB。

视觉回归：

- [1F 餐桌材质回归截图](./phase-2-canonical-materials-qa-1f-dining.png)
- [1F 客厅材质回归截图](./phase-2-canonical-materials-qa-1f-living.png)
- 新材质身份已在实际三维画面生效；1F 当前仍保留基线中的整体偏浅问题，该问题留到后续灯光与大面积硬装阶段处理。

## 阶段结论

第二阶段已验收通过。材质现在已经从“少数通用颜色 token”扩展为按木材、布艺、皮革、金属和柜门饰面区分的正式身份，但本阶段没有新增外部下载资源。

下一阶段可以进入大面积硬装材质升级：优先比较 1F 客餐厨墙面、地面、柜门和台面材质，再决定哪些程序材质正式升级为合格免费 PBR。
