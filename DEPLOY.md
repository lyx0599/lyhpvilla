# 别野效果展示模型发布说明

这个项目现在使用 GitHub Pages 作为正式发布入口。

正式预览地址：

https://lyx0599.github.io/lyhpvilla/

GitHub 仓库：

https://github.com/lyx0599/lyhpvilla.git

## 发布方式

GitHub 仓库的 `Settings -> Pages` 已设置为 GitHub Actions 后，推送到 `main` 分支会自动触发 `.github/workflows/pages.yml`。

工作流会完成这些步骤：

- 安装仓库锁定的 pnpm 与依赖
- 执行 typecheck、workspace schema、migration、引用、access、图纸命名、保存服务和 2D/3D 同步测试
- 执行 `pnpm build:pages`，使用 `/lyhpvilla` 子路径重新生成 `out`
- 执行 Pages 产物检查，阻止根路径、缺失静态资源或开发产物进入发布包
- 上传本次构建生成的 `out` 作为 GitHub Pages 发布包
- 部署到 GitHub Pages

Pull Request 和推送到 `main` 还会通过 `.github/workflows/ci.yml` 运行独立 CI，其中移动端 job 使用 Playwright 覆盖 iPhone 竖屏、横屏和 Android Chrome 尺寸。

图纸包命名已经收口到 `DrawingSheetType`。正式图纸目录只包含总平面、结构、拆改、家具、插座/开关、灯光点位、给排水点位、吊顶、地面/墙面材料、材料索引和施工标注/待确认项；旧 `sync` 只作为 `structureSyncCheck` 检查层，旧 `preview` 只作为展示视图兼容，不进入正式图纸包。

施工点位统一保存在 `default-workspace.json` 的 `drawingItems` 中，并由 `drawingPackage.drawingItemIds` 收口。发布前校验会检查其楼层、房间、墙体、家具和图纸包引用；任何专业图纸都不得另建独立点位数据源。

家具 MEP 自动生成必须保持 generatedKey 幂等和人工调整保护。删除家具后允许保留点位作为待处理孤立引用，但发布前引用校验必须明确报告并要求删除或重新绑定；系统不生成给排水、电气或通风的真实管线路径。

开关控制灯点、吊顶/铺装 polygon、墙面 wallId 和柜体关联点位都属于 drawingItems 的统一引用面。发布校验必须拒绝失效灯点、墙体和家具引用，并保留区域几何、材料、标高及施工备注的导入导出读回。

## 本地构建

普通本地构建：

```bash
pnpm build
```

模拟并检查 GitHub Pages 子路径构建：

```bash
pnpm build:pages
pnpm check:pages-build
```

GitHub Actions 会在每次发布时安装 pnpm 和锁定依赖，依次执行 `pnpm build:pages`、`pnpm check:pages-build`，再上传本次 CI 生成的 `out` artifact。仓库不提交 `out/` 或 `.next/`，部署 job 只能使用 build job 上传的 artifact；如果临时需要手工生成 `out`，也应使用同一构建命令。

## 数据方式

目前编辑结果保存在访问者自己的浏览器里。也就是说：

- 分享链接后，别人可以打开和编辑自己的版本。
- 不同访客之间的数据不会互相同步。
- 如果后续需要多人共用同一份方案，需要再接入账号和云端数据库。

`data/default-workspace.json` 会在构建时编译进页面 JavaScript，不是线上可单独访问或替换的 JSON 文件。更新默认方案后必须重新构建并发布整个站点。
