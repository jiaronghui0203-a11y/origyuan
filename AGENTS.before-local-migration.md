# AGENTS.md

## Project Snapshot
- Minimal Node.js ESM HTTP service for future OpenClaw or automation integrations.
- Runtime entrypoint: `src/server.js`.
- Configuration source: environment variables parsed in `src/config.js`.
- Current HTTP endpoints: `GET /health` and `GET /tasks`.

## Commands
- Install dependencies: `npm ci`.
- Run locally: `npm start`.
- Run tests: `npm test`.
- Windows local test wrapper: `powershell -ExecutionPolicy Bypass -File scripts/local-test.ps1`.
- POSIX local test wrapper: `sh scripts/local-test.sh`.

## Local Verification
- Create local env from example before running service: `cp .env.example .env`.
- Health check after `npm start`: `curl http://127.0.0.1:3000/health`.
- Task placeholder check: `curl http://127.0.0.1:3000/tasks`.

## Docker Workflow
- Build and run locally: `docker compose up --build`.
- Run in detached VPS/service mode: `docker compose up -d --build`.
- Inspect service: `docker compose ps` and `docker compose logs -f origyuan-automation`.
- Stop local Docker stack: `docker compose down`.

## Repo Rules
- Do not commit real `.env` values or secrets. Use `.env.example` for placeholders only.
- Keep future OpenClaw integration settings behind environment variables: `OPENCLAW_BASE_URL`, `OPENCLAW_API_KEY`, and `OPENCLAW_AGENT_ID`.
- Keep tests focused on exported `createServer()` behavior so HTTP routes can be verified without binding a fixed port.
- TODO: Add deployment-specific commands here once the VPS target path and production process are confirmed.

## Local Codex Preferences
- 默认使用简体中文回复，除非用户明确要求其他语言；只影响回复内容，不处理界面文案。
- 跳过问候、客套、免责声明、冗余背景、过渡句和空泛总结。
- 收到明确任务后直接执行，不反问准备类问题。
- 结果优先，直接给最终答案、结论或已完成改动；除非用户明确要求，不展示推导过程。
- 代码问题优先给完整、可直接运行的代码；仅在复杂逻辑处保留简短注释。
- 操作指南优先给明确的 1、2、3 步骤，去掉前置背景介绍。
- 非代码类回复优先使用高信息密度短列表，方便快速扫读。

## Self-Improvement Memory
- 使用全局记忆目录：`C:\Users\13492\.codex\memories`。
- 开始任何任务前读取：
  1. `C:\Users\13492\.codex\memories\PROFILE.md`
  2. `C:\Users\13492\.codex\memories\ACTIVE.md`
  3. 将其作为全局记忆再分析用户请求
- 仅在结果非显然、可复用、或大概率再次出现时记录记忆。
- 遇到以下情况时，评估是否写入记忆：
  1. 命令、工具调用或操作出现非预期失败
  2. 用户纠正了错误、假设或过时说法
  3. 用户需要的能力当前不存在
  4. 外部 API、集成或工具的行为与预期不一致
  5. 发现了非显然的 workaround、调试经验或更优的重复性做法
- 按类型写入：
  - `C:\Users\13492\.codex\memories\LEARNINGS.md`：经验、纠正、知识缺口、最佳实践
  - `C:\Users\13492\.codex\memories\ERRORS.md`：非预期错误与调试记录
  - `C:\Users\13492\.codex\memories\FEATURE_REQUESTS.md`：用户想要但当前缺失的能力
- 提升规则：
  1. 仅当内容跨任务稳定有效、复用价值高时，才提升到 `C:\Users\13492\.codex\memories\ACTIVE.md`
  2. `ACTIVE.md` 保持精简、去重、可快速读取
  3. 只有在规则已经成为稳定顶层规则，或用户明确要求时，才写入本 `AGENTS.md`
- 行为要求：
  - 默认用中文记录记忆，除非用户明确要求其他语言。
  - 不为每条可能经验都打断用户；高置信度时静默记录。
  - 不记录错别字、一次性噪声或低价值观察。
  - 未经用户明确要求，不自动修改本 `AGENTS.md` 的既有规则，只允许追加或维护记忆体系相关内容。
