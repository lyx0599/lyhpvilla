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
- 执行 typecheck、workspace schema、migration、引用、access、保存服务和 2D/3D 同步测试
- 执行 `pnpm build:pages`，使用 `/lyhpvilla` 子路径重新生成 `out`
- 执行 Pages 产物检查，阻止根路径、缺失静态资源或开发产物进入发布包
- 上传本次构建生成的 `out` 作为 GitHub Pages 发布包
- 部署到 GitHub Pages

Pull Request 和推送到 `main` 还会通过 `.github/workflows/ci.yml` 运行独立 CI，其中移动端 job 使用 Playwright 覆盖 iPhone 竖屏、横屏和 Android Chrome 尺寸。

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

GitHub Actions 会在每次发布时重新构建，不依赖仓库中已有的 `out`。部署 job 只能使用 build job 上传的 artifact。`pnpm build:pages` 已包含 `.nojekyll` 和产物检查；如果临时需要手工生成 `out`，也应使用同一命令。

## 数据方式

目前编辑结果保存在访问者自己的浏览器里。也就是说：

- 分享链接后，别人可以打开和编辑自己的版本。
- 不同访客之间的数据不会互相同步。
- 如果后续需要多人共用同一份方案，需要再接入账号和云端数据库。

`data/default-workspace.json` 会在构建时编译进页面 JavaScript，不是线上可单独访问或替换的 JSON 文件。更新默认方案后必须重新构建并发布整个站点。
