# Paperclip / Hermes 最小上线步骤

目标：先锁定单一入口、单一任务面、单一审批面，不在第一阶段扩张 persona 和 fallback。

## 0. 先冻结事实面

1. 导出现有 7 个专业 bot 真正模型状态，不改 persona：

```bash
openclaw models status --agent jiajing --json
openclaw models status --agent tianqi --json
openclaw models status --agent wanli --json
openclaw models status --agent chenghua --json
openclaw models status --agent yongle --json
openclaw models status --agent chongzhen --json
openclaw models status --agent xuande --json
```

2. `hongwu`、`xiaoyuan` 创建后，再单独补验：

```bash
openclaw models status --agent hongwu --json
openclaw models status --agent xiaoyuan --json
```

3. 复核认证顺序和 fallback 污染：

```bash
openclaw models auth order get --json
```

4. 把导出结果和本次目标拓扑对齐到：

- [openclaw-9-bot-draft.yaml](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/openclaw-9-bot-draft.yaml)
- [channel-routing.template.yaml](/C:/Users/13492/Documents/GitHub/origyuan/docs/production/channel-routing.template.yaml)

## 1. 保持入口不抖动

1. Feishu 现网 route 不动，只保留原入口继续接单。
2. Telegram 只做增量接入，不替换 Feishu 主入口。
3. 先只给 `hongwu`、`xiaoyuan` 外部发言权，其余 bot 全部转内勤。
4. 所有执行结果从原渠道回传，禁止专业 bot 直接对外发群消息。

## 2. 部署 Paperclip

1. 部署位置只选私网或 Tailscale。
2. 版本要求：`>= 2026.410.0`。
3. 先只启用：
   - ticket
   - heartbeat
   - budget
   - approval
   - org orchestration
4. 接上 `openclaw_gateway` adapter，只挂现有 7 个专业 bot 与新增 2 个外部 bot。
5. 统一共享工件目录：

```text
/root/.openclaw/workspace-shared/runs/<ticket-id>/
```

6. 每个 run 都回写这四个标识：

- `channel_message_id`
- `paperclip_issue_id`
- `run_id`
- `artifact_path`

## 3. 部署 Hermes

1. Hermes 与 `hermes-paperclip-adapter` 放同一台 Linux VPS 或同私网 Linux。
2. 第一阶段不放 Windows + WSL2。
3. 先做迁移演练，不先切生产流量：

```bash
hermes claw migrate --dry-run
```

4. 只新增两个 Hermes 员工位：

- Hermes COO：负责任务拆解
- Hermes Research：负责补证据、背景、skills、长上下文

5. Hermes 不直接接飞书、Telegram，不直接做渠道入口。

## 4. 权限收敛

1. 最高风险权限只给 `chongzhen`：

- `shell`
- `ssh`
- `service.restart`
- `file.delete`
- `rollback`

2. 满足以下条件才允许执行：

- 来源任务带审批标记
- 审批由 `xiaoyuan` 发起
- 执行结果最终回写给 `hongwu`

3. 其他 bot 默认：

- 不允许生产变更
- 不允许批量删改
- 不允许直接对外发群消息

## 5. 模型槽冻结

1. 固定三槽，不再叠三层主编排：

- `M1`：`chongzhen/gpt-5.4`
- `M2`：`openai-codex/gpt-5.4`
- `M3`：现网已验证可用的 Claude 4.6 alias

2. 先锁稳定性，再处理 persona 和体验层。
3. 不在第一阶段引入新的 fallback 分叉。

## 6. 5 条验收链

1. Feishu -> 洪武 -> 单 bot 执行 -> 回 Feishu
2. Feishu -> 洪武 -> Paperclip 建单 -> Hermes COO 拆单 -> OpenClaw 执行 -> 回 Feishu
3. Telegram -> 小元 -> 回 Telegram
4. 高风险任务 -> 小元审批 -> 你确认 -> 再执行
5. 长报告 -> Feishu 文档 / Telegram 摘要回传

## 7. 上线后第一批检查

1. 检查 `hongwu` 和 `xiaoyuan` 的外部发言权是否是唯一开启状态。
2. 检查 `jiajing`、`tianqi`、`wanli`、`chenghua`、`yongle`、`chongzhen`、`xuande` 是否全部变成内部岗位。
3. 检查高风险动作是否必须经过 `xiaoyuan` 审批。
4. 检查 Paperclip issue 是否成为多步骤任务的唯一真相源。
5. 检查长报告是否统一写入共享工件目录并可从原渠道回链。

## 8. 本轮不做的事

- 不把 CrewAI 放回生产主链
- 不先改 7 个 bot persona
- 不把 Paperclip 或 Hermes 放到 Windows + WSL2
- 不让 Telegram 替代 Feishu 主工作面
- 不让专业 bot 直接对外发言
