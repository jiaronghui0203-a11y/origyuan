# Phase 1 Control Plane MVP

本仓库只做控制平面，不托管 `new-api` / `sub2api` 源码。

## 固定生产链路

```text
cc-switch -> new-api -> sub2api -> 22 authenticated account pools
```

## 只读职责

- 展示链路拓扑与 Cloudflare 边缘入口
- 检查 `new-api` / `sub2api` / `CLIProxyAPI` / `9Router` 健康状态
- 验证批准的 northbound 模型别名
- 验证 OpenClaw 是否能接通 `north` provider

## 不做的事

- 不在本仓库运行 `new-api` 或 `sub2api`
- 不保存 southbound 真实认证池明文
- 不通过 Web 面板改生产配置
- 不通过 GitHub Actions 自动部署到 VPS 或 Cloudflare

## 固定 northbound 别名

- `team/gpt-5-codex`
- `team/claude-sonnet`
- `team/gemini-pro`
- `backup/payg`

## 固定 southbound 池

- `openai-codex-prod`
- `anthropic-native-prod`
- `anthropic-antigravity-prod`
- `gemini-prod`
- `payg-backup`
- `canary`
- `quarantine`

## 禁止策略

- 单一 northbound 别名跨厂商随机
- 同一会话跨 `anthropic-native` 与 `anthropic-antigravity` 混池
- `9Router` 进入生产主链
- `CLIProxyAPI` 重新担任长期主路由
