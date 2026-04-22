# Cloudflare Edge Phase 1

Cloudflare 第一阶段只做边缘入口与访问控制，不承载核心 API 运行时。

## 域名分配

| Hostname | Origin | Exposure | Notes |
| --- | --- | --- | --- |
| `api.<your-domain>` | `new-api` | public | 唯一 northbound API |
| `legacy-api.<your-domain>` | `CLIProxyAPI` | public | 回滚与迁移桥 |
| `new-api-admin.<your-domain>` | `new-api` admin surface | protected | 仅在需要时启用 Cloudflare Access |

## 回源关系

- `api.*` -> 现有 VPS 上的 `new-api`
- `legacy-api.*` -> 现有 VPS 上的 `CLIProxyAPI`
- `sub2api` 不映射公网域名，只允许 VPS 内网或 Docker internal network

## 固定策略

- `api.*` 开启 Cloudflare 代理、TLS、基础 WAF
- 管理面必须启用 Cloudflare Access
- 不通过 Workers 代理协议转换
- 回滚时只切换 `api.*` / `legacy-api.*` 指向，不改 OpenClaw 模型名

## 参考 API

Cloudflare 第一阶段需要的配置对象可通过官方 API 管理：

- DNS 记录：`/zones/{zone_id}/dns_records`
- Access 应用：`/accounts/{account_id}/access/apps`
- Access 策略：`/accounts/{account_id}/access/policies`

## 回滚指向表

| Trigger | Action |
| --- | --- |
| `new-api` 故障 | `cc-switch` 切回 `legacy-api`，反代回旧入口 |
| northbound 大面积 401/403 | 冻结 northbound 变更，改走 `legacy-api` |
| 管理面异常暴露 | 立即收紧 Access / 暂停管理域名 |
