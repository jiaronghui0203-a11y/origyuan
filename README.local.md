# 本地开发骨架

当前项目是“指纹浏览器 + VPS + OpenClaw 协作服务”的本地可运行骨架。

- 当前只做接口层、配置层、适配层、任务编排层。
- 当前新增控制平面 MVP：northbound / southbound 状态聚合、模型别名观察、只读链路拓扑。
- 当前包含本地内存任务队列、优先级调度、最多三次重试、任务历史。
- 当前包含 winston 日志落盘，日志默认写入 `logs/app.log` 和 `logs/tasks.log`。
- 当前包含 Express Web 控制面板：`http://127.0.0.1:3000/panel`。
- 写接口默认保持 mock / dry-run；控制平面在 `TASK_MODE=hybrid` 下只读探测上游状态。
- 不连接真实账号，不写真实密钥，不调用真实生产环境。
- 不包含绕过、破解、风控规避逻辑。

## 本地运行

```bash
cp .env.example .env
npm start
```

健康检查：

```bash
curl http://127.0.0.1:3000/health
```

控制平面检查：

```bash
curl http://127.0.0.1:3000/api/topology/status
curl http://127.0.0.1:3000/api/providers/status
curl http://127.0.0.1:3000/api/providers/models
curl http://127.0.0.1:3000/api/openclaw/status
```

本地测试：

```bash
npm test
```

远端 Phase 1 审计：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/phase1-vps-audit.ps1
```

CC Switch Codex OAuth 账号池同步：

```bash
node scripts/sync-cc-switch-codex-providers.mjs --prune
```

- 读取 `C:\Users\13492\.cc-switch\codex_oauth_auth.json`
- 重建 `C:\Users\13492\.cc-switch\cc-switch.db` 中的 `codex` provider 列表
- 使用 `cc-switch` 源码兼容的 `meta.authBinding` 结构
- 默认把全部账号加入 failover queue

## Docker 本地运行

```bash
cp .env.example .env
docker compose up --build
```

验证：

```bash
curl http://127.0.0.1:3000/health
```

停止：

```bash
docker compose down
```

## .env 变量

- `APP_NAME`：服务名称。
- `APP_ENV`：运行环境，例如 `local`、`staging`、`production`。
- `APP_PORT`：本地服务端口，默认 `3000`。
- `FINGERPRINT_BROWSER_URL`：未来本地指纹浏览器 API 地址。
- `FINGERPRINT_BROWSER_TOKEN`：未来本地指纹浏览器 API token，禁止提交真实值。
- `VPS_SSH_HOST`：未来 VPS SSH 主机。
- `VPS_SSH_PORT`：未来 VPS SSH 端口。
- `VPS_SSH_USER`：未来 VPS SSH 用户。
- `VPS_SSH_KEY_PATH`：未来 VPS SSH 私钥路径。
- `OPENCLAW_BASE_URL`：未来 OpenClaw 网关或 API 地址。
- `OPENCLAW_API_KEY`：未来 OpenClaw API key，禁止提交真实值。
- `NEW_API_BASE_URL` / `NEW_API_API_KEY` / `NEW_API_TIMEOUT_MS`：northbound `new-api` 入口与超时。
- `SUB2API_BASE_URL` / `SUB2API_API_KEY` / `SUB2API_TIMEOUT_MS`：southbound `sub2api` 内网入口与超时。
- `LEGACY_PROXY_BASE_URL` / `LEGACY_PROXY_API_KEY`：旧 `CLIProxyAPI` 回滚入口。
- `ROUTER9_BASE_URL`：本地 `9Router` 实验入口，默认 `http://127.0.0.1:20128`。
- `CLOUDFLARE_ZONE_NAME` / `CLOUDFLARE_API_HOSTNAME` / `CLOUDFLARE_LEGACY_HOSTNAME` / `CLOUDFLARE_ACCESS_AUDIENCE`：Cloudflare 边缘入口只读配置。
- `TASK_MODE`：任务模式，支持 `mock` 和 `hybrid`，当前默认 `hybrid`。
- `TASK_DEFAULT_TIMEOUT_MS`：自动化任务默认超时时间。
- `QUEUE_MAX_RETRIES`：任务最大重试次数，默认 `3`。
- `LOG_DIR`：日志目录，默认 `logs`。
- `WEBHOOK_SECRET`：未来 Webhook 验签密钥，禁止提交真实值。

## 当前接口

- `GET /health`：服务健康状态。
- `GET /api/browser/status`：指纹浏览器 mock 状态。
- `POST /api/browser/open-profile`：打开 mock 浏览器 profile。
- `POST /api/vps/run`：准备 mock VPS 命令，不执行 SSH。
- `GET /api/openclaw/status`：OpenClaw 聚合状态，`mock` 模式下返回安全降级视图。
- `GET /api/topology/status`：控制平面链路拓扑。
- `GET /api/providers/status`：`new-api` / `sub2api` / `CLIProxyAPI` / `9Router` 健康状态。
- `GET /api/providers/models`：批准 northbound 模型别名的当前可用性。
- `POST /api/openclaw/dispatch`：派发 mock OpenClaw 任务。
- `POST /api/task/run`：统一任务入口，按 `type` 分发到 `browser`、`vps`、`openclaw`。
- `GET /api/task/demo`：返回完整 mock 协作演示。
- `GET /api/task/queue`：查看内存队列状态。
- `GET /api/task/history`：查看任务历史。
- `GET /api/task/:taskId`：查看任务详情。
- `POST /api/task/:taskId/cancel`：取消 pending/running 任务。
- `GET /panel`：本地 Web 控制面板。

## 生产架构草案

当前仓库仍是本地 mock 骨架；如果要把 OpenClaw、Paperclip、Hermes 三层生产链路先文档化，再逐步接入，可先看：

- [docs/production/openclaw-9-bot-draft.yaml](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/openclaw-9-bot-draft.yaml)
- [docs/production/channel-routing.template.yaml](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/channel-routing.template.yaml)
- [docs/production/paperclip-hermes-minimal-rollout.md](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/paperclip-hermes-minimal-rollout.md)
- [docs/production/phase1-control-plane-mvp.md](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/phase1-control-plane-mvp.md)
- [docs/production/cloudflare-edge-phase1.md](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/cloudflare-edge-phase1.md)
- [docs/production/phase1-rollout-status-2026-04-22.md](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/phase1-rollout-status-2026-04-22.md)
- [docs/production/openclaw-northbound.template.json](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/openclaw-northbound.template.json)

## 任务队列

当前使用本地内存队列，不依赖 Redis，不连接远程环境。

- 优先级：数字越小越优先，例如 `1` 高于 `5`。
- 最大重试：默认 `3`，可通过 `QUEUE_MAX_RETRIES` 或请求体 `maxRetries` 调整。
- 执行模式：只执行 mock 适配器，不执行真实 SSH、不调用真实指纹浏览器、不调用真实 OpenClaw。
- 历史记录：保留最近 100 条任务结果。
- 日志落盘：每次入队、执行、成功、失败都会写入 `logs/tasks.log`。
- 失败验证：`type=fail` 会强制 mock 失败，用于验证三次重试链路。
- 任务取消：支持取消 pending/running 任务；已完成任务不能取消。

手动触发 mock 任务：

```bash
curl -X POST http://127.0.0.1:3000/api/task/run \
  -H "Content-Type: application/json" \
  -d '{"type":"vps","priority":1,"maxRetries":3,"command":"echo local mock task"}'
```

查看队列：

```bash
curl http://127.0.0.1:3000/api/task/queue
```

查看历史：

```bash
curl http://127.0.0.1:3000/api/task/history
```

查看任务详情：

```bash
curl http://127.0.0.1:3000/api/task/<taskId>
```

取消任务：

```bash
curl -X POST http://127.0.0.1:3000/api/task/<taskId>/cancel
```

验证失败重试：

```bash
curl -X POST http://127.0.0.1:3000/api/task/run \
  -H "Content-Type: application/json" \
  -d '{"type":"fail","priority":1,"maxRetries":3,"reason":"local retry check"}'
```

Web 面板：

```text
http://127.0.0.1:3000/panel
```

## 示例请求

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/browser/status
curl http://127.0.0.1:3000/api/topology/status
curl http://127.0.0.1:3000/api/providers/status
curl http://127.0.0.1:3000/api/providers/models
curl http://127.0.0.1:3000/api/openclaw/status
curl http://127.0.0.1:3000/api/task/demo
```

```bash
curl -X POST http://127.0.0.1:3000/api/browser/open-profile \
  -H "Content-Type: application/json" \
  -d '{"profileId":"demo-profile-1"}'
```

```bash
curl -X POST http://127.0.0.1:3000/api/vps/run \
  -H "Content-Type: application/json" \
  -d '{"command":"echo prepare deployment workspace"}'
```

```bash
curl -X POST http://127.0.0.1:3000/api/openclaw/dispatch \
  -H "Content-Type: application/json" \
  -d '{"taskName":"demo-task","payload":{"profileId":"demo-profile-1"}}'
```

```bash
curl -X POST http://127.0.0.1:3000/api/task/run \
  -H "Content-Type: application/json" \
  -d '{"type":"browser","profileId":"demo-profile-1"}'
```

## 后续替换为真实指纹浏览器 API

当前 `src/adapters/fingerprintBrowserAdapter.js` 预留函数：

- `getBrowserStatus()`
- `openProfile(profileId)`
- `closeProfile(profileId)`
- `listProfiles()`

替换步骤：

1. 保持函数签名不变。
2. 在 adapter 内用 `FINGERPRINT_BROWSER_URL` 和 `FINGERPRINT_BROWSER_TOKEN` 调用本地指纹浏览器 API。
3. 把真实 API 响应转换成统一返回结构。
4. 保留 `TASK_MODE=mock` 作为本地安全模式，只有显式切换后才连接真实服务。

## 后续替换为真实 VPS SSH 执行

当前 `src/adapters/vpsAdapter.js` 只启用：

- `mockRunCommand(command)`

并预留真实接口签名：

- `runCommand(command)`

替换步骤：

1. 保持 `runCommand(command)` 函数签名不变。
2. 使用 `VPS_SSH_HOST`、`VPS_SSH_PORT`、`VPS_SSH_USER`、`VPS_SSH_KEY_PATH` 创建 SSH 客户端。
3. 加入命令 allowlist、超时、日志脱敏和错误处理。
4. 默认仍走 `mockRunCommand(command)`，只有显式配置真实模式后才允许执行 SSH。

## 后续替换为真实 OpenClaw 连接

当前 `src/adapters/openclawAdapter.js` 预留：

- `getStatus()`
- `dispatch(taskName, payload)`

替换步骤：

1. 保持函数签名不变。
2. 用 `OPENCLAW_BASE_URL` 和 `OPENCLAW_API_KEY` 调用真实 OpenClaw 网关。
3. 把真实响应转换成统一返回结构。
4. 在真实调用前增加超时、重试、脱敏日志和错误分类。

## 将来迁移到 VPS

1. 在 VPS 安装 Docker 和 Docker Compose。
2. 把仓库代码放到 VPS 的服务目录，例如 `/opt/origyuan-automation`。
3. 在 VPS 上创建 `.env`，只填真实运行需要的变量，不提交到 Git。
4. 先保持 `TASK_MODE=mock` 启动，确认容器和健康检查正常。
5. 再逐步替换指纹浏览器、VPS SSH、OpenClaw adapter 的真实实现。

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f origyuan-automation
curl http://127.0.0.1:3000/health
```
