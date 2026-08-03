# Origyuan 原光初心

让人类回归本源，用 AI 创造未来。

Origyuan 官方品牌网站，基于 Next.js、React、vinext 和 Cloudflare Workers 构建。

## 在线地址

- 官网：https://origyuan.com
- Cloudflare Worker：`origyuan`

## 本地开发

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run lint
```

## 部署到 Cloudflare

首次部署前使用 `wrangler login` 登录有权访问 Origyuan Cloudflare 账号的用户，然后运行：

```bash
npm run deploy:cloudflare
```

部署命令会构建 vinext 应用、上传静态资源与 Worker，并将生产版本发布到 `origyuan.com`。

## 项目结构

- `app/`：页面、样式和站点元数据
- `public/`：品牌图片及公开静态资源
- `worker/`：Cloudflare Worker 入口
- `wrangler.jsonc`：Cloudflare 生产部署配置
- `tests/`：渲染结果测试
- `.openai/hosting.json`：OpenAI Sites 项目标识与可选绑定

## 品牌主张

技术不应让人离本源更远。它应该照亮方向，释放创造力，让每个人更接近真正重要的事。
