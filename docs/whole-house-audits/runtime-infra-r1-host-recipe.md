# Runtime infrastructure R1 host recipe

状态：READY（仅运行基础设施；不等于产品、Stage B、施工或发布放行）

复核时间：2026-08-16（Asia/Shanghai）
canonical data SHA：`8790920b120e37b5fdd7515479caf1c28e478bd78823621434b14acfa18be831`
主树 revision：`whole-house-lighting-cabinet-yard-integration-v1-20260812`

## 固定生命周期

在主树 `/Users/lyx/Documents/林屿湖畔` 执行：

```bash
DIST=.next-runtime-infra-r1
BASE=/lyhpvilla
PORT=3240

rm -rf "$DIST"
NEXT_PUBLIC_BASE_PATH="$BASE" \
NEXT_TELEMETRY_DISABLED=1 \
NEXT_DIST_DIR="$DIST" \
node node_modules/next/dist/bin/next build \
  2>&1 | tee /private/tmp/runtime-infra-r1-build-<timestamp>.log

HOST=/private/tmp/runtime-infra-r1-host-<timestamp>
mkdir -p "$HOST"
ln -s "$PWD/$DIST" "$HOST/lyhpvilla"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$HOST"
```

本项目 `next.config.mjs` 在非 development 模式使用 `output: "export"`，所以该流程是静态 host，不使用 `next start`。静态 export 不生成 Next server 的 `BUILD_ID`、`routes-manifest.json` 或 `build-manifest.json`；验收时记录为 `N/A (output=export)`，以 route HTML SHA 和完整 build log 作为产物指纹。

健康检查（固定 basePath）：

```bash
node scripts/runtime-infra-r1-healthcheck.mjs http://127.0.0.1:3240/lyhpvilla
```

停止：只停止本轮由该 recipe 启动、且 cwd 为 `/private/tmp/runtime-infra-r1-host-*` 的 python PID：

```bash
lsof -nP -iTCP:3240 -sTCP:LISTEN
kill <confirmed-pid>
```

不要停止主树 3210，也不要停止其他 worktree 的 Furniture host，除非另有明确授权。

## R1 产物与复核结果

- fresh dist：`/Users/lyx/Documents/林屿湖畔/.next-runtime-infra-r1`（约 247M）
- build log：`/private/tmp/runtime-infra-r1-build-20260816.log`
- build exit：`0`
- build log SHA-256（构建完成后独立计算）：`8338eb5cd44e8728a718241440ea9846189ec6d2799fc7e7b58963d9ddf844a2`
- export route HTML：`/preview/`、`/2f-preview/`、`/b1-preview/`、`/b2-preview/`、`/yard-preview/`、`/owner-communication/` 均生成并经 3240 HTTP 200 复核。
- stable host PID：`95808`，cwd `/private/tmp/runtime-infra-r1-host-20260816`，监听 `127.0.0.1:3240`。
- 主树 3210：PID `66077`，cwd `/Users/lyx/Documents/林屿湖畔`，保持未触碰。

## 轻量浏览器证据

同一持久 browser session、单 tab 顺序复核：

- YARD 390x844：`/private/tmp/runtime-infra-r1-evidence-yard-390.png`
  - 状态条 rect `{x:20,y:224.5,w:350,h:54}`
  - canvas rect `{x:22,y:1672.671875,w:346,h:616}`
  - Top5 rect `{x:20,y:2314.671875,w:350,h:553}`
  - console error/warn：空
- owner 1536x1024：`/private/tmp/runtime-infra-r1-evidence-owner-1536.png`
  - 顶部两个 CTA 均 h=44，决策包 CTA `x=1285.953..1408`，未越界
  - 5 个同源入口均存在，href 指向 `/lyhpvilla/`、`/2f-preview/`、`/b1-preview/`、`/b2-preview/`、`/yard-preview/`
  - console error/warn：空
- owner 1280x800：`/private/tmp/runtime-infra-r1-evidence-owner-1280.png`
  - 决策包 CTA `x=1109.953..1232`，未越界；同源 CTA h=44
  - console error/warn：空
- owner 390x844：`/private/tmp/runtime-infra-r1-evidence-owner-390.png`
  - 顶部 CTA 均可见：返回入口 `{x:20,y:208.5,w:172,h:44}`；决策包 `{x:200,y:208.5,w:170,h:44}`
  - 五个同源 CTA 均可见且 h=44、x=41、w=308、right=349
  - console error/warn：空
- owner YARD CTA 点击实测：`/owner-communication/` → `/yard-preview/`，最终 URL `http://127.0.0.1:3240/lyhpvilla/yard-preview/`；页面 console error/warn 为空。

上述是 runtime/基础设施证据，不扩展为全 2F 54 灯、真实受光、邻室溢光、性能、施工、采购或 GitHub 发布结论。

## Furniture 交接

Furniture 隔离 patch fixture 应复制同一生命周期：唯一 fresh `NEXT_DIST_DIR`、先 build 并保存完整 log/exit/route/hash，再启动独立静态 host，复用单一持久 browser session，完成后只停止明确属于该 fixture 的 host PID。禁止复用旧 `.next`、旧 `out` 或旧 browser host。
