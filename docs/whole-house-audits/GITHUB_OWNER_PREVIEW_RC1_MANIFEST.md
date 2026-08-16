# GITHUB_OWNER_PREVIEW_RC1_MANIFEST

状态：R3 READY_PENDING_LUNA（P0 Recovery clean tracked-only candidate 已通过；未 `git add`、未 commit、未 push；等待独立 Luna 复核）

## P0 Recovery R1 clean candidate（真实状态）

- candidate 来源：clean archive `1892fcbc9dd345225e7f9db7c3d2196e8dcfa331`，再应用已审 RC1 commit `3d230785be1e08e1f786b9cc7c3295413239d75f` 的 tracked 白名单；candidate 位于 `/private/tmp/lyhp-owner-rc1-recovery-20260816`，没有复制当前 dirty 树的未跟踪文件。
- package/script 依赖闭合：移除 clean baseline 中不存在的 apply、Furniture/旧 floor contract 命令；同时移除聚合 `test` 对未纳入 clean tracked candidate 的 2F 临时专项 key 的调用。RC1 不用 untracked 脚本冒充 tracked 来源；2F memory-only 专项仅作为独立审计证据，不进入发布白名单。
- 2F test：不再 spawn apply 脚本或写 `data/default-workspace.json`；在内存 fixture 中做目标灯去重/desk 宽深归一化并重复运行，读前后 canonical SHA 均为 `8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831`。
- Lighting R3：`scripts/test-lighting-design.mjs` PASS，实际 `175 lights / 121 switches`；沟通空间合同为 `24 rooms + North/South YARD = 26`，不是旧的 `167/30` 口径。
- 决策包：22 records、2 owner questions；顶部移动 CTA `min-h-11`（44px）且 `sourcePaths` 全部指向 candidate 内存在的 tracked 文件；未将 generated JSON/artifacts 纳入 RC1。
- fresh export：exit 0；本轮 R2 fresh build log=`/private/tmp/lyhp-owner-rc1-r2-build-20260816.log`，字节 SHA=`7cc302215a4a8ced622f6455f9b64add19606746f9b03bbb358209d4b76c5f99`；routes 包含 `/yard-preview`、`/owner-communication`、`/owner-communication/decisions`。
- YARD static host：`http://127.0.0.1:3243/lyhpvilla/yard-preview/`，PID/session `98206`；HTTP 200、canvas=1、console error/warn 为空；Top5 全院点击后 URL 保留 `/lyhpvilla/yard-preview/?camera=view-yard-all`，HTTP 200、canvas=1。

冻结基线：`1892fcbc9dd345225e7f9db7c3d2196e8dcfa331`
正式 canonical data SHA：`8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831`
当前 revision：`whole-house-lighting-cabinet-yard-integration-v1-20260812`
发布水印：`OWNER PREVIEW RC1 · REFERENCE / NOT FOR CONSTRUCTION · NOT FOR PROCUREMENT`

## 拟发布白名单

以下文件是当前 owner communication / decision / YARD / Lighting R3 / 必要设计系统与门禁测试的最小来源集合。hash 为当前工作树冻结值：

| 文件 | 来源/用途 | SHA-256 |
|---|---|---|
| `app/preview/page.tsx` | 全屋入口、YARD 入口卡 | `f55d316be1d2bca9b5e2b35854240f3c82af56ccd3aa6c6f192668d4d8f459b3` |
| `app/owner-communication/page.tsx` | 业主沟通模型入口 | `a164eb320d04c8acd691d32cc3a9a76c021b9b8e6ad8659eb31dea7cee326db5` |
| `app/owner-communication/decisions/page.tsx` | 决策包 R1 入口 | `1491d75fc0452a192596f6fee6ff2f82a227b3b3ff23a4a884a406d41779e884` |
| `app/yard-preview/page.tsx` | YARD route | `2830f2df9c90f53dd633619bb7656c275df736faa88104c65e626e5764320a48` |
| `components/floor-3d-view.tsx` | 已批准 Lighting R3 选择性集成；不包含 Furniture PBR patch | `b285b57c6fb013714ac212fb05a2336cd3f490e3981df2948f400088c41525ea` |
| `components/second-floor-preview.tsx` | 正式 2F 入口/儿童房审计宿主 | `98b222b8a34d20b78405701ec9647f5b34c78d5a36b340673e028db93a233163` |
| `components/owner-communication-model.tsx` | 五层沟通模型、P0/unknown 边界 | `f877665657e35d9f28f12fe8d04ea4a409d1c396dd4b65076461d256d7c9c265` |
| `components/owner-decision-package-r1.tsx` | 决策登记与门禁分类；移动 CTA >=44px | `a8e67681c28ab5d3c251a2a0b66b8d18f2de5bd328e78ee77a43917c276a98af` |
| `components/yard-preview.tsx` | YARD canonical 2D/3D/Top5；Top5 使用 basePath-aware `Link`；390 首屏 3D + Top5 首卡；mobile order 显式 3D→Top5→details→2D | `6804e7efe5b371b7866941199515846d994dada0cc9b326cde3fc09d5ee22b83` |
| `lib/owner-decision-package-r1.ts` | 决策包同源数据；sourcePaths 已闭合 | `d5b1691b946fa70a9f665a2f3c52fc28c2e3ccf85662312e53a97c413a6bb50c` |
| `lib/whole-house-design-system.ts` | 必要设计系统合同 | `6248eff6770115f15942c64ce0e088ef398e08b4ca9ded6601dc9b0e776b412b` |
| `data/default-workspace.json` | 当前 canonical workspace；必须随 RC1 绑定 | `8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831` |
| `package.json` | 依赖闭合；聚合 `test` 不调用未纳入 tracked candidate 的临时 2F key | `9bf3aa3bda63974d38e7799ae8cd775336d35ecea50e91af20b8dea07b7fb194` |
| `scripts/check-pages-build.mjs` | Pages 检查补充 YARD route/入口 | `6f8e4c2f806a4bebb963a5887a977a0ae537922bf718d94bfdf6569bc86543dc` |
| `scripts/test-yard-preview.mjs` | canonical YARD/5 camera/basePath contract | `eb6039cabf02c4d564e4e2e33be4e1b51aa4f63ef15474c1a7acaa8f73b42bdb` |
| `scripts/test-owner-communication-model.mjs` | 沟通模型专项 | `5dd598afdf452fd1b7d8aa393bb6bc0ea8fd74c9331076a1850021cc31b25aa4` |
| `scripts/test-owner-decision-package-r1.mjs` | 决策包专项 | `4380e6db6155d279f76f704fb1c562d5b5e15418a827e5f9d1a6ed3b1bac22f8` |
| `scripts/test-lighting-design.mjs` | Lighting R3/lighting contract 专项 | `9ab1ff9b462d537bb54196760dd7309a5fbcc83bcc6eab8ce5437c61829142fd` |
| `scripts/test-main-lighting-top-bar-hotfix.mjs` | 顶部安全区/当前楼层目录专项 | `29e0b4037de657d51262dafffd02f74b966706d61694dd44be348ad8712af18c` |
| `scripts/test-whole-house-p0-integration-audit-current.mjs` | 当前 P0 审计基线专项 | `05b49b4f4ea3067578bfda3cb2ad62a1892f9a9d99df79372e3d557c11aaa984` |
| `scripts/runtime-infra-r1-healthcheck.mjs` | 稳定 export host healthcheck | `64b70fec1caf7d6ea8e45fcb3ae49b0e4c36d77794134ee56e018f690fc69c87` |

## 明确排除

- `private/`、`/private/tmp/`、所有截图、临时 export、旧 snapshot、backup、generated evidence。
- b9c0 Furniture PBR/geometry/performance patch、`e81d...` data、旧 `out` 与隔离 runtime 报告；Furniture 本轮没有进入 RC1。
- 未审迁移、apply 工具、临时 host 脚本、未登记 Guard/shared scene/camera 变更。
- `space-planner.tsx` R2 dirty diff；不消费、不覆盖。
- `L/SW-22` 候选；不写入正式 data/BOM/施工闭合。

## data/default-workspace.json 合法来源判定

旧 HEAD data SHA 为 `e81d8932ba0669ae62de71fe4f3492f62694b876394c7a6bc82368faf42a2e19`；当前文件从 `defaultWorkspaceRevision=1f-bedroom-open-valet-rack-20260811` 迁移为 `whole-house-lighting-cabinet-yard-integration-v1-20260812`，`savedAt=2026-08-12T18:00:00+08:00`。当前语义计数为五层 `B2/B1/1F/2F/YARD`、92 furniture、25 cabinetInterior、39 lighting scenes、74 cameraViews。

11626 行大 diff 的可登记来源是已批准的全屋 Lighting/Cabinet/YARD contract migration；它不是 Furniture PBR 候选，且当前 SHA 已由专项和 build/runtime 绑定。因此 RC1 必须携带该 canonical data；不得以旧 SHA 或 b9c0 的 `e81d...` 替代。

## 测试与运行证据

- `tsc --noEmit`：PASS。
- YARD、owner communication、owner decision、当前 whole-house P0 audit、Lighting 专项：PASS。
- fresh production export：PASS，YARD basePath build exit 0，log=`/private/tmp/yard-basepath-r1-build-20260816.log`。
- basePath healthcheck：3240/3241 host route 200；新 3241 host 五个 Top5 点击均保留 `/lyhpvilla` 与 query，均 HTTP 200、canvas=1、console error/warn 为空。
- 1536/1280/390 owner runtime：CTA rect 与 console 证据保存在 `/private/tmp/runtime-infra-r1-evidence-owner-*.png`；YARD R2 390 截图=`/private/tmp/lyhp-owner-rc1-r2-yard-390-20260816.png`，SHA=`307b3a43488c0f744786cdaa0207ee20e2ca069fc5eaf23849dd071b5d620bb2`。
- YARD R2 390 DOM：viewport `390x844`；status rect `{x:20,y:224.5,w:350,h:54}`；3D section rect `{x:20,y:381.5,w:350,h:280}`；canvas rect `{x:22,y:383.5,w:300,h:150}`；Top5 rect `{x:20,y:685.5,w:350,h:367}`；首个 Top5 rect `{x:20,y:685.5,w:169,h:101}`；console error/warn `[]`。1280 桌面仍为 720px 3D section，布局无回退。
- YARD R2 原始 DOM JSON=`/private/tmp/lyhp-owner-rc1-r2-yard-390-20260816.json`，字节 SHA=`eb74ec62f504edd5ad8912032412d50e8320f8fb73e19e42a20de382a1dc232c`；该 JSON 同时保留 5 个 query href 与 console 数组。
- YARD R3 order 修复：通过显式 arbitrary CSS order 固定 mobile `3D → Top5 → FIELD_REMEASURE/VENDOR/PROFESSIONAL details → 2D overview`；R3 DOM JSON=`/private/tmp/lyhp-owner-rc1-r3-yard-390-20260816.json`，字节 SHA=`2d99cd0ba172db5b9b7c9ca5818ec93943de04b84eee788924714d03829a4c25`；5 个 camera href 保留 query，console error/warn `[]`；截图=`/private/tmp/lyhp-owner-rc1-r3-yard-390-20260816.png`，SHA=`307b3a43488c0f744786cdaa0207ee20e2ca069fc5eaf23849dd071b5d620bb2`。
- R2 原始测试日志=`/private/tmp/lyhp-owner-rc1-r2-tests-20260816.log`，字节 SHA=`3d54a5594f0dafb2f1b95aa066ed101388ab2b49362d0229fe414856f6e16f3b`；日志未包含自报 hash。
- R3 原始测试日志=`/private/tmp/lyhp-owner-rc1-r3-tests-20260816.log`，字节 SHA=`3dfe1ab8985a2adcc6c504aa1e9b9d5d5594511eb83bc348a63ab5312b58a073`；包含 TypeScript、YARD、owner communication、top-bar、P0 baseline 与 `git diff --check`。
- R3 fresh production build exit `0`，日志=`/private/tmp/lyhp-owner-rc1-r3-build-20260816.log`，字节 SHA=`5c1eeb0c7107e575e903e5acbad28ec93c55e69ff6e8fa9873a44db0a3f518bd`；routes 含 `/yard-preview`、`/owner-communication`、`/owner-communication/decisions`。
- `git diff --check`：PASS。

## 已知 P0 / 水印

这是 owner preview RC1，不是施工图、BOM、IFC、采购或发布放行。真实受光/曝光/邻室溢光/性能、完整 2F 54 灯、现场复尺、厂家资料、专业签认仍保持 P0/UNKNOWN/BLOCKED；Furniture Visual 仍未获准集成。

## 回滚点与 diff 摘要

- 回滚基线：HEAD `1892fcbc9dd345225e7f9db7c3d2196e8dcfa331`；不使用 reset/checkout，回滚由用户确认后按白名单逐文件恢复。
- 主树当前 dirty；本 manifest 只记录白名单，不改变 Git index。
- `data/default-workspace.json`：`9228 insertions / 2398 deletions`，来源为登记的 integration revision，必须随 RC1 绑定。
- `package.json`：新增登记的 floor/cabinet/lighting/owner/YARD 专项命令；没有把本地 3240/3241 host 写入发布脚本。
- `scripts/check-pages-build.mjs`：只增加 YARD route 与 preview→YARD 入口检查。
- YARD basePath 修复：Top5 裸 `<a>` → Next `Link`，保留 camera query；未改 data、camera IDs、Guard、shared scenes。

## 外部 Furniture R2 结果

按 PMO 要求另建 clean fixture `/private/tmp/clean-furniture-r2-fixture-20260816`，正式 data SHA 正确，且只从 b9c0 复制声明的两个文件：

- `pbr-material.tsx` main before `3cee8c...` → fixture after `b78d962...`
- `performance-monitor.tsx` main before `a6a20d...` → fixture after `f7c15ec...`
- build exit 0，log SHA `c80aa433b42535e082f797cee57ffd36c994b0612fc591fd0ca578789044c53d`
- clean host PID/port：3242；`/preview/`、`/2f-preview/`、`/pbr-audit/` HTTP 200。
- 阻断：当前主树来源没有 `app/visual-runtime-r0`，所以 `/lyhpvilla/visual-runtime-r0/` HTTP 404；不能宣称 visual-runtime host ready，Furniture 仍需在其隔离 patch fixture 提供该 route 后再验收。
