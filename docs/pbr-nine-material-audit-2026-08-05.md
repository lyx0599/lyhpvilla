# 九种材质 PBR 视觉审计与候选对照

日期：2026-08-05
范围：仅独立 `/pbr-audit` 验收页；未写入 canonical，未修改正式户型、家具、灯光、相机或玻璃策略。

## 统一验收基准

- ACES Filmic，曝光 1.0，SRGB 输出。
- 中性 `RoomEnvironment`，环境反射强度 0.35。
- 固定 5500K 斜射主光，补光 0.15，固定相机与目标点。
- 1024×1024、standard、无 Bloom/DOF。
- 正式候选路径不连接合成 Roughness/AO Height；Height A/B/C 仍只作为显式验收模式。
- 所有候选颜色贴图均为确定性项目内 Canvas 程序纹理，未引入外部纹理或授权不明资源。

截图目录：[`artifacts/pbr-audit-nine-final`](../artifacts/pbr-audit-nine-final)
本轮共生成 111 张图：9 种材质各 4 张 canonical 基准图，加 75 张候选图；每个候选包含材质球、真实尺度代理和第一人称距离图。

## 逐材质结论

| 材质 | canonical 参数（Base / Normal / Rough / Metal） | 当前视觉问题 | 候选 | 建议 | 独立回退范围 |
|---|---|---|---|---|---|
| 木地板 | `#b7926b` / 0.16 / 0.72 / 0.01；1200×2400mm，190×1800mm板、2mm缝、34%错缝 | 板缝尺度正确，但远景规则感和拼缝对比仍可见；没有发现颜色偏红或方向错误 | 1：Normal 0.13、Rough 0.74；2：Normal 0.12、Rough 0.76、稳定板间色差 | 候选 2 更自然，建议先保留为待确认候选；未到必须修改程度 | 仅验收页 `oakfloor-1/2` 颜色图与标量覆盖 |
| 暖灰石材 | `#d8d1c6` / 0.12 / 0.38 / 0.03；1600×3200mm | canonical 近景偏平，低频云纹不够；低粗糙度在斜射下有像人造板的风险 | 1：Normal 0.10、Rough 0.45；2：Normal 0.10、Rough 0.52、稀疏矿物脉络 | 优先候选 1；候选 2 出现块状纹理风险，不建议直接进入正式系统 | 仅 `greystone-1/2` 审计覆盖 |
| 湿区瓷砖 | `#cdbd9f` / 0.16 / 0.82 / 0.01；1200×1200mm，300×600mm模块、2mm缝 | 模块尺度正确；canonical 填缝和砖面规则性偏明显 | 1：Normal 0.14、Rough 0.86、弱填缝；2：Normal 0.14、Rough 0.78、柔和釉面 | 候选 1 风险最低；候选 2 只在需要更明显湿干高光时考虑 | 仅 `wet-tile-1/2` |
| 暖白墙漆 | `#e8e0d2` / 0.08 / 0.90 / 0；1600×1600mm | 正常距离基本合理；近景颗粒极轻，未见明显过白或机械噪点 | 1：Normal 0.05，颗粒密度降低 | 建议保持 canonical；候选 1 只作为近景低颗粒备选 | 仅 `wall-1` |
| 暖白微水泥 | `#cbc3b8` / 0.13 / 0.78 / 0.01；1800×1800mm | canonical 接近平面，批刀抹纹在正常距离不明显 | 1：Normal 0.09、Rough 0.82；2：Normal 0.11、Rough 0.80、大尺度不连续抹纹 | 候选 1 更稳；候选 2 的低频块面需真实墙面近景再次确认 | 仅 `microcement-1/2` |
| 暖白陶瓷 | `#fbf8f1` / 0.04 / 0.24 / 0；Clearcoat 0.22 | canonical 高光略集中，台面近景有轻微塑料感风险 | 1：Normal 0.03、Rough 0.32、Clearcoat 0.12 | 候选 1 值得保留作视觉候选；不直接写入 canonical | 仅 `ceramic-1` |
| 米灰布艺 | `#d8cabc` / 0.14 / 0.94 / 0；500×500mm | 近景能看见规则经纬网格，远景有摩尔纹风险；身份颜色合理 | 1：Normal 0.10、弱化网格；2：Normal 0.08、Rough 0.95、纱线色差 | 候选 1 优先；两者都仍使用现有程序织纹，正式写入前需专门验证真实软体曲面 | 仅 `fabric-1/2` |
| 深色拉丝金属 | `#343331` / 0.08 / 0.30 / 0.72；标量 metalness | 高光连续但整体偏黑，部分机位接近黑色塑料；没有证据需要 metalnessMap | 1：Normal 0.06、Rough 0.36；2：Normal 0.06、Rough 0.42 | 候选 2 更能削弱塑料感；继续保留标量 metalness，不新增贴图 | 仅 `metal-1/2` |
| 庭院石材 | `#a49b8e` / 0.20 / 0.88 / 0.01；600×1200mm板、6mm缝 | canonical 铺装尺度正确但过于平静；候选必须避免把局部变化变成污渍 | 1：Normal 0.16、Rough 0.84、降低重复；2：Normal 0.14、Rough 0.90、湿干斑驳 | 候选 1 可继续观察；候选 2 近景出现块状/印章感风险，暂不推荐写入 | 仅 `courtyard-1/2` |

## 典型对照图

- [木地板 canonical / 候选 2 真实尺度](../artifacts/pbr-audit-nine-final/nine-oakFloor-oakfloor-2-realscale-normal.png)
- [暖灰石材 canonical / 候选 2 相邻大板](../artifacts/pbr-audit-nine-final/nine-warmGreyStone-greystone-2-realscale-normal.png)
- [湿区瓷砖 canonical / 候选 2 台面代理](../artifacts/pbr-audit-nine-final/nine-wetAreaTile-wet-tile-2-realscale-normal.png)
- [暖白墙漆 canonical / 候选 1 转角](../artifacts/pbr-audit-nine-final/nine-warmWhiteMineral-wall-1-realscale-normal.png)
- [微水泥 canonical / 候选 2 材质球](../artifacts/pbr-audit-nine-final/nine-microCement-microcement-2-sphere-normal.png)
- [暖白陶瓷 canonical / 候选 1 台面](../artifacts/pbr-audit-nine-final/nine-warmWhiteCeramic-ceramic-1-realscale-normal.png)
- [米灰布艺 canonical / 候选 1 第一人称](../artifacts/pbr-audit-nine-final/nine-beigeFabric-fabric-1-scene-firstperson.png)
- [深色金属 canonical / 候选 1 材质球](../artifacts/pbr-audit-nine-final/nine-blackTitanium-metal-1-sphere-normal.png)
- [庭院石材 canonical / 候选 1 真实尺度](../artifacts/pbr-audit-nine-final/nine-courtyardStone-courtyard-1-realscale-normal.png)

## 纹理与性能记录

运行时采样文件：[`performance.json`](../artifacts/pbr-audit-nine-final/performance.json)。固定代理场景下每次采样为 4 draw calls、3012 triangles、16 geometries；纹理计数在连续切换材质时受缓存累积影响，观测范围为 11–39，不能把累积值误读为单材质独占值。

按 canonical 分辨率和 map 数量估算单套纹理显存（RGBA8，不含驱动压缩和 mipmap）：

- largeSurface standard 桌面：1024² × 5 张约 20 MiB；手机：512² × 5 张约 5 MiB。
- standardQuality 的陶瓷/布艺/金属：512² × 4–5 张约 4–5 MiB；手机 256² 约 1–1.25 MiB。
- 候选只新增 1 张颜色 Canvas map；桌面约增加 1 MiB（largeSurface）或 0.25 MiB（standardQuality），手机约增加 0.25 MiB 或 0.0625 MiB。
- draw calls 和 triangles 在候选间没有增加；候选主要增加一张颜色纹理和一次材质 map 绑定。
- 当前环境未启用 EXT_disjoint_timer_query，无法可靠报告跨浏览器 GPU 毫秒值；因此本轮以 WebGL counters、纹理分辨率估算和移动端 390×844 standard 模拟档位作为性能记录，不把 FPS 上限当作材质结论。

## 质量档位与移动端

截图和参数面板默认是 standard/desktop；性能脚本同时打开 390×844 页面检查 standard/mobile。draft 仍使用低分辨率纯色/简化纹理，presentation 维持高分辨率和 Physical/clearcoat 策略；本轮没有改变三档正式策略。移动端材质地图已通过独立页面模拟，正式项目仍没有新增 3D 入口。

## 修改与回退

本轮只修改：

- `app/pbr-audit/page.tsx`：九种材质候选、统一参数差值显示、固定条件说明；默认选择木地板；正式路径不连接合成 Height/Bump。
- `scripts/capture-pbr-audit.mjs`：九种材质基准/候选截图批量脚本。
- `scripts/measure-pbr-audit.mjs`：桌面与移动端 WebGL counters 采样脚本。

所有候选均通过 token/variant 选择隔离在验收页。回退时只需移除本页的候选分支和截图脚本；canonical `lib/material-system.ts`、正式 PBR 组件和场景绑定无需回退。本轮没有合并、删除或重命名任何旧材质，也没有改动已确认的浅橡木、米色洞石和玻璃策略。
