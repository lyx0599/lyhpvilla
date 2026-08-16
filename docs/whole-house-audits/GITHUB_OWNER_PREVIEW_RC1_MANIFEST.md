# GITHUB_OWNER_PREVIEW_RC1_MANIFEST

状态：READY（仅完成白名单与门禁准备；未 `git add`、未 commit、未 push；等待用户最终确认）

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
| `components/owner-decision-package-r1.tsx` | 决策登记与门禁分类 | `e85dec1cb071202df756f0f8a2b34bac136e655963237f4732a5f51174507f5c` |
| `components/yard-preview.tsx` | YARD canonical 2D/3D/Top5；Top5 使用 basePath-aware `Link` | `26c80c00a9b8de505e9c28d37749c5a33d99329848675a7b1982151caa8d5641` |
| `lib/owner-decision-package-r1.ts` | 决策包同源数据 | `d80f09336c41ae7559f3ba627211c29e3cddc1b7d5759b93b90f3b0786423c5d` |
| `lib/whole-house-design-system.ts` | 必要设计系统合同 | `6248eff6770115f15942c64ce0e088ef398e08b4ca9ded6601dc9b0e776b412b` |
| `data/default-workspace.json` | 当前 canonical workspace；必须随 RC1 绑定 | `8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831` |
| `package.json` | 已登记专项测试命令；不含临时 host 命令 | `9f4cd88816aa4b1a9f5388411bd5c44012d5ffc6c5b3bcd061a16d1287246cd8` |
| `scripts/check-pages-build.mjs` | Pages 检查补充 YARD route/入口 | `6f8e4c2f806a4bebb963a5887a977a0ae537922bf718d94bfdf6569bc86543dc` |
| `scripts/test-yard-preview.mjs` | canonical YARD/5 camera/basePath contract | `eb6039cabf02c4d564e4e2e33be4e1b51aa4f63ef15474c1a7acaa8f73b42bdb` |
| `scripts/test-owner-communication-model.mjs` | 沟通模型专项 | `5dd598afdf452fd1b7d8aa393bb6bc0ea8fd74c9331076a1850021cc31b25aa4` |
| `scripts/test-owner-decision-package-r1.mjs` | 决策包专项 | `3e2f9b850d0cb471fc18ad0754f89525951d2f8117528ae245e3a29f02cc0b63` |
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
- 1536/1280/390 owner runtime：CTA rect 与 console 证据保存在 `/private/tmp/runtime-infra-r1-evidence-owner-*.png`；YARD 390 证据在 `/private/tmp/runtime-infra-r1-evidence-yard-390.png`。
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
