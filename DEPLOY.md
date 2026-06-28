# Villa Space Studio 发布说明

这个项目现在使用 GitHub Pages 作为正式发布入口。

正式预览地址：

https://lyx0599.github.io/lyhpvilla/

GitHub 仓库：

https://github.com/lyx0599/lyhpvilla.git

## 发布方式

GitHub 仓库的 `Settings -> Pages` 已设置为 GitHub Actions 后，推送到 `main` 分支会自动触发 `.github/workflows/pages.yml`。

工作流会完成这些步骤：

- 从仓库读取已经构建好的 `out` 目录
- 上传 `out` 作为 GitHub Pages 发布包
- 部署到 GitHub Pages

## 本地构建

普通本地构建：

```bash
pnpm build
```

模拟 GitHub Pages 子路径构建：

```bash
NEXT_PUBLIC_BASE_PATH=/lyhpvilla pnpm build
touch out/.nojekyll
```

发布前需要提交代码改动和生成后的 `out` 目录。这样 GitHub Actions 不需要在线安装依赖，发布更稳定。

## 数据方式

目前编辑结果保存在访问者自己的浏览器里。也就是说：

- 分享链接后，别人可以打开和编辑自己的版本。
- 不同访客之间的数据不会互相同步。
- 如果后续需要多人共用同一份方案，需要再接入账号和云端数据库。
