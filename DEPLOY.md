# Villa Space Studio 发布说明

这个项目已经配置为静态网站发布模式。

正式预览地址：

https://lyhpvilla.netlify.app

GitHub 仓库：

https://github.com/lyx0599/lyhpvilla.git

## 发布结果

运行构建后会生成 `out` 文件夹。把这个文件夹发布到网站托管平台后，就会得到一个可以分享给他人的互联网链接。

后续所有功能改动都以这个 Netlify 地址为最终预览入口。本地 `127.0.0.1` 地址只用于开发调试。

## 推荐平台

- Vercel：适合 Next.js 项目，连接代码仓库后自动发布。
- Netlify：构建命令填 `pnpm build`，发布目录填 `out`。
- Cloudflare Pages：构建命令填 `pnpm build`，输出目录填 `out`。

## 当前数据方式

目前编辑结果保存在访问者自己的浏览器里。也就是说：

- 分享链接后，别人可以打开和编辑自己的版本。
- 不同访客之间的数据不会互相同步。
- 如果后续需要多人共用同一份方案，需要再接入账号和云端数据库。
