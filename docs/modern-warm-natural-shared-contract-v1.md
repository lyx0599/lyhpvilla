# 全屋现代暖自然母体系 v1：共享消费合同

本合同是 `full-house-material-lighting-logic-v1.md` 的可执行接口说明。1F、B1、2F、B2 只消费本合同，不复制 token、灯具家族或场景 schema。

## A. canonical token 与旧名称映射

| 现有名称 | 写入 canonical token | 说明 |
| --- | --- | --- |
| `smokedWalnut` | `darkWalnut` | 低饱和深胡桃木，仅作局部重点木作 |
| `champagneBronze` | `brushedBronze` | 香槟古铜/暖金属细节 |
| `smokedOatTaupe` | `oatTaupeLacquer` | 实体燕麦灰褐哑光柜门，不得映射为布艺 |
| `darkBronze` | `blackTitanium` | 深古铜/黑钛窄框 |
| `warmTaupeLeather` | `brushedBronze` | 当前仅为升降桌复合 accent 的兼容映射，优先保证五金；理线槽被同一 accent 混用属于组件分材问题，后续应拆成独立部件 |

2F 新对象应直接写右侧 canonical token。兼容映射仅用于读取旧数据。

## B. showroom resource / calibration 合同

| canonical token | 默认校准资源 |
| --- | --- |
| `warmWhiteMineral` | `showroomLimePlaster` |
| `warmOak` | `showroomWarmOakVertical` |
| `oatTaupeLacquer` | `showroomOatTaupeLacquer` |
| `travertine` | `showroomWarmVeinedStone` |
| `warmGreyStone` | `showroomWarmGreyLimestoneFloor` |
| `blackTitanium` | `showroomDarkBronze` |
| `wetAreaTile` | `polyhavenWarmBeigeTile08` |

以下身份直接使用母材质自身的程序 PBR，无额外 resource ID：

- `oakFloor`：自然浅橡木宽板地板；
- `darkWalnut`：低饱和深胡桃木；
- `beigeFabric`：燕麦/米灰织物，包括米灰亚麻气质；
- `smokedGlass`：深茶/烟灰玻璃；
- `brushedBronze`：香槟古铜/拉丝古铜细节。

## C. 2F floor profile 最终值

材质比例总计 100%：

| token | 比例 |
| --- | ---: |
| `warmWhiteMineral` | 42 |
| `warmOak` | 7 |
| `oakFloor` | 24 |
| `beigeFabric` | 14 |
| `darkWalnut` | 9 |
| `travertine` | 2 |
| `warmGreyStone` | 2 |

- `exposureCompensationEv = -0.08`
- `ambientFill = 0.96`
- `activityLabel = 休息`
- 允许的功能灯具家族：`cabinet-strip`、`bed-reading`、`night-light`、`mirror-light`

灯光值的字段顺序为 `ambient / task / accent / decorative / cabinetStrip / mirrorLight / outdoor`：

| scene key | 2F 最终亮度 |
| --- | --- |
| `daylight` | `20 / 25 / 15 / 0 / 20 / 30 / 0` |
| `daily` | `64 / 72 / 42 / 38 / 55 / 70 / 20` |
| `activity` | `42 / 45 / 50 / 58 / 52 / 45 / 15` |
| `night` | `0 / 0 / 12 / 15 / 8 / 0 / 12` |
| `cleaning` | `100 / 100 / 70 / 40 / 100 / 100 / 65` |

## D. 场景 ID、色温与楼层覆盖方式

2F 固定场景 ID：

- `SCENE-MWN-V1-2F-DAYLIGHT`
- `SCENE-MWN-V1-2F-DAILY`
- `SCENE-MWN-V1-2F-ACTIVITY`
- `SCENE-MWN-V1-2F-NIGHT`
- `SCENE-MWN-V1-2F-CLEANING`

共享层级固定为 `ambient`、`task`、`accent`、`decorative`、`cabinetStrip`、`mirrorLight`、`outdoor`。基础、任务、柜内、镜前为 3000K；重点、装饰、低位、夜灯为 2700K。普通灯具 CRI ≥ 90，柜内、镜前及精细任务灯 CRI ≥ 95。

楼层只允许覆盖：

1. `materialBalance` 比例；
2. `exposureCompensationEv` 与 `ambientFill`；
3. 五个固定 scene key 内七个共享层级的亮度；
4. 少量 `functionalFixtureFamilies`。

楼层不得新增同义 token、照明层级或第六种场景，不得复制共享 PBR 身份与灯具定义。

## 共享文件所有权与消费接口

- `lib/material-system.ts`：canonical PBR、旧名解析；
- `lib/showroom-material-resources.ts`：共享校准资源与 token-resource 绑定；
- `lib/modern-warm-natural-system.ts`：canonical 清单、旧名合同、native PBR 清单、floor profile、场景 ID 与场景生成器；
- `lib/lighting-design.ts`：全屋灯具家族与生成逻辑；
- `lib/render3d-assets.ts`：共享 3D 材质解析兼容层。

楼层任务应引用 `modernWarmNaturalFloorProfiles[floorId]`、`modernWarmNaturalSceneId(floorId, key)`、`createModernWarmNaturalFloorScenes(items, floorId)` 和 `modernWarmNaturalShowroomCalibration`；只修改本楼层对象绑定，不编辑上述共享文件。

## 结构边界

2F 已确认布局、家具坐标、门窗、固定机位均不属于本合同。本次共享框架不会改动这些内容。2F 中误绑为 `travertine` 的 `limewash` / `limePlaster` 墙面，应由 2F 数据绑定任务改写为 `warmWhiteMineral`；干区地面绑定 `oakFloor`，湿区地面绑定 `wetAreaTile`，湿区重点石材绑定 `travertine` 或 `warmGreyStone`。
