# 第四阶段批量家具与地墙材质报告

日期：2026-08-07

授权统一依据：本批第三方资源均来自 Poly Haven 官方资产页和官方 CDN。Poly Haven 官方授权页确认站内模型与纹理为 CC0，可用于商业项目且无需署名；项目仍保留作者、来源与下载记录。

## 已加入的家具模型

| 家具与位置 | 替换对象 | 来源 / 授权 | 资产路径 | 面数 / 文件 | 普通与展示模式 | 回退 |
| --- | --- | --- | --- | --- | --- | --- |
| 1F 客厅暖白石材圆边几 | `furn-1f-living-side-table-001` | [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01)，Ulan Cabanilla，CC0 | `public/assets/external/polyhaven/models/coffee_table_round_01/2k/coffee_table_round_01.gltf` | 4,044 tris；2K；5.66 MB | 普通版复用低面数 2K；展示版保留完整石材法线与金属 ARM | 加载失败回原 `lowRound` |
| B1 活动区暖木深色皮革休闲椅 | `furn-b1-activity-beanbag-001` | [Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01)，Vibrant Nordic，CC0 | `public/assets/external/polyhaven/models/modern_arm_chair_01/2k/modern_arm_chair_01.gltf` | 8,916 tris；2K；9.22 MB | 普通与展示共用优化网格；展示保留皮革、木框独立 PBR | 加载失败回原 `beanBag` |
| 1F 卧室与 2F 主卧四个床头柜 | 4 个 north/south nightstand | [Side Table 01](https://polyhaven.com/a/side_table_01)，James Ray Cock，CC0 | `public/assets/external/polyhaven/models/side_table_01/2k/side_table_01.gltf` | 每件 2,756 tris；2K；共享 1.55 MB | 四件实例共享模型和贴图，不重复占用纹理内存 | 每件独立回原 `floating` 床头柜 |

本批新增 6 个实际替换点；连同上一批 B2 茶几、南院桌椅组，本阶段累计 9 个主要家具替换点。模型运行时只校正轴向、中心点与包络尺寸，不改变原位置、朝向和通道。

## 已加入的硬装 PBR

| 材质 | 使用位置 | 来源 / 授权 | 通道与尺度 | 对照结论 | 性能 / 回退 |
| --- | --- | --- | --- | --- | --- |
| Beige Wall 001 暖米灰矿物墙 | B1、1F、2F 的 `limewash` / `limePlaster` 主墙面；暖白可擦洗墙漆不覆盖 | [官方资源页](https://polyhaven.com/a/beige_wall_001)，Dimitrios Savva / Rico Cilliers，CC0 | Base Color、Normal GL、Roughness、AO；3×3m；2K；2.22 MB | 比当前纯程序墙面有更自然的低频色差；Height 关闭 | 移动端目标 512；资源失败回原墙面程序材质 |
| Floor Tiles 08 暖米湿区砖 | B1、1F、2F 卫生间及洗衣湿区 | [官方资源页](https://polyhaven.com/a/floor_tiles_08)，Rob Tuytel，CC0 | Base Color、Normal GL、Roughness、AO；1.5×1.5m；2K；5.38 MB | 适合小尺度湿区；在客餐厅试用时网格过密，已撤回 | 移动端目标 512；失败回 `wetAreaTile` |
| 暖灰石灰岩大面地坪 | 1F 客餐厨、玄关和楼梯间原 600×1200 排砖区域 | 项目自有程序候选 | Base Color、Normal、Roughness、AO；1.6×3.2m；无 Height | 专业免费砖候选尺度与缝线不匹配，采用已验证的低对比程序方案；保留原排砖几何 | 2K / 移动 512；回退原 `wetAreaTile` |

## 色彩校正

确认“整体变浅”不是错觉。原因是 ACES 曝光、环境光、主光、补光和半球光叠加，而非单一材质被统一改白。普通模式曝光由 1.14 调至 1.00，展示模式由 1.22 调至 1.06；同时降低非灯光分析场景的环境光与主辅光强度。暖色温保留，黑钛、木材和石材中间调恢复。

## 保留现状与未采用

- 浅橡木地板：免费候选偏深、偏黄或旧化明显，继续使用已确认的 `oakFloor` 程序方案。
- 微水泥：候选过脏或过度做旧，继续使用当前 canonical / 已验证程序纹理。
- 庭院石材：候选多为锈色、黑板岩或高对比拼花，继续使用当前 `courtyardStone`。
- 主沙发、餐桌套组、床、卫浴设备：本轮免费模型的造型或成套语义不合格，未强行替换。
- 柜体、门窗、楼梯、扶手、栏杆和背景墙：保留真实几何与参数系统，仅让适用墙面获得新 PBR。

## 验收截图

- 1F 批次前：[上一批 1F 总览](./phase-3-external-assets-qa/1f-living-after.png)
- 1F 批次后：[最终总览](./phase-4-batch-assets-qa/1f-final-accepted.png)
- B1 批次前：[上一批 B1 总览](./phase-3-external-assets-qa/b1-after.png)
- B1 批次后：[最终总览](./phase-4-batch-assets-qa/b1-final.png)
- 2F 批次后：[最终总览](./phase-4-batch-assets-qa/2f-final.png)

## 验证结果

- 通过：外部资产完整性（7 条清单、glTF 依赖齐全）、工作区 schema、材质系统、三维结构、家具定位与墙体锚定、类型检查、生产构建、差异格式检查。
- 生产构建：首页 405 kB，First Load JS 724 kB；第三方模型和贴图保持静态按需加载，不进入主 JavaScript 包。
- 已知旧测试问题：`test:furniture-variants` 仍期望 `lowUpholstered`，当前项目数据为 `timberFrame`。该断言在本批前已存在，与新增外部模型映射无关，因此未改动用户现有家具风格数据。
