# 统一 PBR 材质系统审计与交付说明

## 审计结论

原系统同时存在 `render3DMaterialTokenCatalog`、家具局部材质、地面程序纹理和 2D 索引硬编码四条路径。颜色、粗糙度和金属度可用，但纹理身份、真实尺寸、方向、质量档位与授权信息没有统一；`floor-3d-view.tsx` 还承担了过多对象级材质创建。此次改造保留原有对象 ID、尺寸、位置和材质选择语义，并将共同身份收敛到 `lib/material-system.ts`。

## Canonical tokens

| Token | 中文名称 | 角色 | 真实尺寸 mm | 通道/能力 |
| --- | --- | --- | --- | --- |
| `warmWhiteMineral` | 暖白矿物墙面 | wallBase / ceilingBase | 1200×1200 | Base、Normal、Roughness、AO |
| `microCement` | 暖白微水泥 | wallFeature / floorMain | 1000×1000 | Base、Normal、Roughness、AO、Height |
| `warmOak` | 浅橡木木饰面 | joineryMain | 600×2400 | Base、Normal、Roughness、AO、方向 |
| `oakFloor` | 浅橡木地板 | floorMain | 190×1900 | Base、Normal、Roughness、AO、Height、板缝 |
| `travertine` | 米色洞石 | wallFeature / countertop | 600×1200 | Base、Normal、Roughness、AO、Height |
| `warmGreyStone` | 暖灰石材 | countertop / wallFeature | 600×1200 | Base、Normal、Roughness、AO |
| `beigeFabric` | 米灰布艺 | fabricMain | 1400×1400 | Base、Normal、Roughness、AO |
| `blackTitanium` | 深色拉丝金属 | trimMetal | 100×300 | Base、Normal、Roughness、AO、方向 |
| `clearGlass` / `smokedGlass` | 低铁 / 浅茶玻璃 | glassMain | 1200×2400 | Base、Roughness、Transmission、IOR |
| `warmWhiteCeramic` | 暖白陶瓷 | countertop / floorWet | 300×300 | Base、Normal、Roughness、AO |
| `wetAreaTile` | 湿区瓷砖 | floorWet | 300×600 | Base、Normal、Roughness、AO、Height、拼缝 |
| `courtyardStone` | 庭院暖灰石材 | floorMain | 600×900 | Base、Normal、Roughness、AO、拼缝 |

所有资源目前均为项目内程序化资源，授权标记为 `project-authored`；没有引入来源不明的外部纹理。缺图时 `PbrMaterial` 继续使用 canonical baseColor 与程序化微表面，因而不会出现空白对象。

## 统一规则

- 角色固定为 `wallBase`、`wallFeature`、`floorMain`、`floorWet`、`ceilingBase`、`joineryMain`、`countertop`、`trimMetal`、`glassMain`、`fabricMain`。
- 重复率由真实表面尺寸和 token 的真实纹理尺寸计算；木地板按板宽/板长生成方向与拼缝，木饰面沿构件长轴；石材、瓷砖和墙面不会按对象大小直接拉伸。
- 桌面 `draft/standard/presentation` 使用约 512/1024/2048 级别，手机端对应 256/512/1024；编辑模式只降低分辨率和阴影，不改变 token 身份。
- 颜色贴图使用 sRGB，Normal、Roughness、AO、Height 使用 `NoColorSpace`；纹理和材质实例均由缓存复用。
- 交界语言包含拼缝、阴影缝、收口板、踢脚线、地面压条、台面出挑、玻璃金属框、材质分区和方向规则。

## 房间使用语言

客餐厅以暖白墙面、浅橡木地板和米灰布艺为基底，洞石/暖灰石材做重点背景；厨房沿用同一组 token，以石材台面和深色金属收边区分功能；卧室保持橡木与布艺；卫生间统一 `wetAreaTile`、暖白陶瓷和低铁/浅茶玻璃；地下室偏微水泥、暖灰石材和深色金属；庭院使用 `courtyardStone` 与橡木户外构件。2D 材料预览、材料索引、3D 家具与施工导出均读取相同 canonical token。

## 预算、加载与验证

单个桌面 presentation 材质最多 2K 的四张图约 16–32 MB 解码峰值；同屏按 token 去重，标准桌面建议控制在约 96 MB，手机约 32 MB。程序纹理按 token/质量/设备缓存，缺失时安全回退。`scripts/test-material-system.mjs` 验证 token 完整性、真实尺寸、质量层级、别名、2D 索引唯一性和默认工作区 schema；类型检查与生产构建在交付前运行。
