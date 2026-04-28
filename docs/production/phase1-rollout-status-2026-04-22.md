# Phase 1 Rollout Status 2026-04-22

## 当前已验收状态

- 主链路目标保持不变：`cc-switch -> new-api -> sub2api -> 22 authenticated account pools`
- 旧链路保留：
  - `CLIProxyAPI` 继续承担迁移桥与回滚入口
  - `9Router` 继续只作为本地实验台
- 还没有切正式生产流量，`api.origyuan.com` 仍未切到 `new-api`

## Cloudflare 与域名

- VPS：`172.236.246.185`
- Cloudflare 橙云已开启
- 4 个公网域名已就位：
  - `api.origyuan.com`
  - `legacy-api.origyuan.com`
  - `new-api-admin.origyuan.com`
  - `sub2api-admin.origyuan.com`
- 因 VPS `443` 被 `xray` 占用，Cloudflare 通过 Origin Rules 回源到 `8443`
- 当前有效规则：
  - `api-origin-port-8443`
  - `legacy-api-origin-port-8433`
  - `new-api-admin-8443`
  - `sub2api-admin-8443`

## VPS 服务面

### CLIProxyAPI

- `api.origyuan.com` 与 `legacy-api.origyuan.com` 目前仍都指向 `127.0.0.1:8317`
- CLIProxyAPI 现在还是公网 API 的实际占位入口，暂时不能下线

### new-api

- 路径：`/opt/origyuan/new-api`
- 容器：`origyuan-new-api`
- 本地端口：`127.0.0.1:3000`
- 管理域名：`https://new-api-admin.origyuan.com`
- `/api/status` 正常
- 版本：`v0.12.14`
- Root 用户已初始化

### sub2api

- 路径：`/opt/origyuan/sub2api`
- 容器：
  - `origyuan-sub2api`
  - `origyuan-sub2api-postgres`
  - `origyuan-sub2api-redis`
- 本地端口：`127.0.0.1:18080`
- 管理域名：`https://sub2api-admin.origyuan.com`
- `/health` 正常
- 管理员已初始化

## sub2api 当前业务面

### 已建 group

- `openai-codex-prod`
- `anthropic-native-prod`
- `anthropic-antigravity-prod`
- `gemini-prod`
- `payg-backup`
- `canary`
- `quarantine`

### 已建 user key

- `new-api-openai-codex`
- `new-api-anthropic-native`
- `new-api-antigravity`
- `new-api-gemini`

### 当前阻塞

- `accounts` 表为空，说明 southbound 真实上游账号池还没有接入
- 当前阻塞点不是 `new-api -> sub2api` 断路，而是 `sub2api` 背后没有可调度账户

## new-api 当前业务面

- 已确认管理接口同源调用需要 `New-Api-User: 1`
- 已确认内置 group：`default`、`vip`、`svip`
- 已创建 channel：
  - `sub2api-openai-codex`
- `SelfUseModeEnabled=true`

## Live 结论

- `new-api -> sub2api` 链路已打通
- `model_price_error` 在开启 `SelfUseModeEnabled` 后已变成上游真实错误
- 当前失败表现是 `403 / INSUFFICIENT_BALANCE`
- 这说明 northbound/southbound 接口层已经通，southbound 账户资源仍缺

## Alias / Deployment 结论

- 当前 `new-api` 版本：`v0.12.14`
- 已核对当前实例 `options` 表，仅看到 `SelfUseModeEnabled`
- 当前实例 `models` 表为空，未启用全局模型别名配置
- 当前稳妥做法是：
  - 多条 channel
  - 每条 channel 的 `models`
  - 必要时配合 channel 级 `model_mapping`
- 官方近期仍把“全局 alias”作为功能请求讨论中，说明它不是当前稳定可用前提

## 切流前固定策略

- 保留 `legacy-api.origyuan.com -> CLIProxyAPI`
- 保留 `api.origyuan.com -> CLIProxyAPI`
- 只有在至少一个 southbound group 拥有真实可用账户且 `new-api` live channel test 成功后，再考虑把 `api.origyuan.com` 切到 `127.0.0.1:3000`

## 本仓库可重复验证入口

- Windows：
  - `powershell -ExecutionPolicy Bypass -File scripts/phase1-vps-audit.ps1`
- 该脚本会输出：
  - 远端容器状态
  - `sub2api` group / account / api key 摘要
  - `new-api` channel 摘要
  - `SelfUseModeEnabled`
  - `new-api /api/status`
