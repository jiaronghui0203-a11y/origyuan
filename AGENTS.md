# AGENTS.md

## Project Snapshot
- Local-first Node.js service for future fingerprint browser, VPS, and OpenClaw collaboration.
- Runtime entrypoint: `src/server.js`
- Primary goal: build, test, and extend locally before any remote sync or deployment.

## Commands
- Install: `npm ci`
- Env check: `npm run check:env`
- Start: `npm start`
- Test: `npm test`
- Windows local test: `powershell -ExecutionPolicy Bypass -File scripts/local-test.ps1`
- POSIX local test: `sh scripts/local-test.sh`

## Local Verification
- Create env from example before running:
  - `cp .env.example .env`
- Health check:
  - `curl http://127.0.0.1:3000/health`
- Mock adapter smoke checks:
  - `curl http://127.0.0.1:3000/api/browser/status`
  - `curl -X POST http://127.0.0.1:3000/api/vps/run -H "Content-Type: application/json" -d '{"command":"echo hello"}'`
  - `curl http://127.0.0.1:3000/api/openclaw/status`
- Control plane checks:
  - `curl http://127.0.0.1:3000/api/topology/status`
  - `curl http://127.0.0.1:3000/api/providers/status`
  - `curl http://127.0.0.1:3000/api/providers/models`
- Direct mock actions:
  - `curl -X POST http://127.0.0.1:3000/api/browser/open-profile -H "Content-Type: application/json" -d '{"profileId":"demo-profile-1"}'`
  - `curl -X POST http://127.0.0.1:3000/api/openclaw/dispatch -H "Content-Type: application/json" -d '{"taskName":"demo-task","payload":{"profileId":"demo-profile-1"}}'`
- Task demo:
  - `curl http://127.0.0.1:3000/api/task/demo`
- Web panel:
  - `http://127.0.0.1:3000/panel`
- Web panel task flow:
  - `POST /panel/tasks`
  - `GET /panel/tasks/:taskId`
  - `POST /panel/tasks/:taskId/cancel`
- Queue checks:
  - `curl -X POST http://127.0.0.1:3000/api/task/run -H "Content-Type: application/json" -d '{"type":"vps","priority":1,"maxRetries":3,"command":"echo local mock task"}'`
  - `curl http://127.0.0.1:3000/api/task/queue`
  - `curl http://127.0.0.1:3000/api/task/history`
  - `curl http://127.0.0.1:3000/api/task/<taskId>`
  - `curl -X POST http://127.0.0.1:3000/api/task/<taskId>/cancel`
- Retry failure check:
  - `curl -X POST http://127.0.0.1:3000/api/task/run -H "Content-Type: application/json" -d '{"type":"fail","priority":1,"maxRetries":3,"reason":"local retry check"}'`
- Logs:
  - `logs/app.log`
  - `logs/tasks.log`

## Docker Workflow
- Local build/run:
  - `docker compose up --build`
- Detached mode:
  - `docker compose up -d --build`
- Inspect:
  - `docker compose ps`
- Logs:
  - `docker compose logs -f`
- Stop:
  - `docker compose down`

## Repo Rules
- Never commit real `.env` values or secrets.
- Keep integration config behind environment variables only.
- Prefer incremental edits over broad refactors.
- Keep tests focused on route behavior and service contracts.
- Do not break existing local Docker workflow without replacement.

## Default Local Workflow
- Unless explicitly requested, keep work local on `feature-branch`.
- Do not create PRs or deploy by default.
- Do not assume remote sync is needed.
- Before adding code:
  - check current branch
  - check git status
  - check existing file structure
- After adding endpoints:
  - add at least one test
  - add at least one curl example
  - update `README.local.md`

## Endpoint Change Rule
When adding or changing API routes:
1. Keep response structure stable
2. Prefer JSON output
3. Add or update tests
4. Add example request in `README.local.md`

## Task Queue Rule
When changing task orchestration:
- keep the in-memory queue mock-friendly and local-first
- preserve priority behavior where lower numbers run first
- preserve retry behavior controlled by `QUEUE_MAX_RETRIES` or request `maxRetries`
- keep task lifecycle visible through `/api/task/queue`, `/api/task/history`, and `/api/task/:taskId`
- keep history bounded to the most recent 100 task results
- preserve cancel behavior: pending/running tasks can be canceled, completed tasks cannot
- update `logs/tasks.log` behavior only through the logger/service layer

## Adapter Rule
For any fingerprint browser / VPS / OpenClaw integration:
- keep real connection logic isolated
- keep mock mode available
- do not hardcode secrets
- do not directly couple route handlers to provider-specific logic
- prefer:
  - `routes/`
  - `services/`
  - `adapters/`
  - `utils/`

## Local Safety Rule
- Do not execute real production commands unless explicitly requested.
- Do not connect to real external services by default.
- Prefer mock/stub behavior for new integrations first.
- If a command is destructive or irreversible, stop at the smallest safe change.

## Documentation Rule
When meaningful changes are made, update:
- `README.local.md`
- `.env.example` if config changes
- test coverage if behavior changes

## Future Integration Notes
- Fingerprint browser integration should remain adapter-based.
- VPS execution should remain service/adaptor-based.
- OpenClaw integration should remain environment-configured and mockable.
- Web control panel, queue, retry, and log persistence should be added as isolated modules, not mixed into core route handlers.

## Local CC Switch State
- Local CC Switch installed at `C:\Users\13492\Applications\cc-switch-v3.14.0\cc-switch.exe`.
- User-level environment variable conflicts for `GEMINI_CLI_OAUTH_CLIENT_ID`, `GEMINI_CLI_OAUTH_CLIENT_SECRET`, `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`, and `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET` were removed from `HKCU:\Environment`.
- `C:\Users\13492\Desktop\yuanTeam` currently contains `23` `codex-*.json` files, deduped into `21` unique Codex OAuth accounts.
- Those `21` accounts were imported into `C:\Users\13492\.cc-switch\codex_oauth_auth.json`.
- Those `21` accounts were already bound into `21` switchable Codex providers inside `C:\Users\13492\.cc-switch\cc-switch.db`.
- The old `OpenAI Official` Codex providers were removed; the homepage Codex provider list should now show only the `21` `ChatGPT (<email>)` providers.
- Current local Codex entrypoint is `C:\Users\13492\.codex\config.toml -> base_url = "http://127.0.0.1:15721/v1"`, which points to the local `cc-switch` proxy.
- Important: that local proxy entrypoint is not itself evidence that traffic is already on the `cc-switch -> new-api -> sub2api` production chain; verify the selected provider config before assuming northbound `new-api` is in path.
- `cc-switch` local proxy takeover for Codex is enabled with failover queue enabled for all `21` providers; `cc-switch.exe` should be listening on local port `15721`.
- The screenshot showing `P17` to `P21` is the bottom of the provider list, not evidence of missing accounts; verify total by checking provider count in `cc-switch.db` if needed.
- Local repair script for this pool: `node scripts/sync-cc-switch-codex-providers.mjs --prune`.
- `scripts/sync-cc-switch-codex-providers.mjs` now also merges full token payloads from `C:\Users\13492\Desktop\yuanTeam\codex-*.json` back into `C:\Users\13492\.cc-switch\codex_oauth_auth.json` before rebuilding providers.
- Current confirmed blocker: imported ChatGPT OAuth tokens do not carry `api.responses.write`; direct `https://api.openai.com/v1/responses` calls fail even when bearer auth is present.
- Therefore `Codex -> cc-switch -> ChatGPT OAuth -> OpenAI /v1/responses` is not a viable production fix path on this machine.
- On `2026-04-22`, local Codex was switched from the OAuth pool to an API-key northbound provider:
  - provider id: `6931974f-ab1f-4be3-9382-0ae44ee0c3a9`
  - provider name: `new-api-openai-codex`
  - auth mode: `api_key`
  - base URL: `https://new-api-admin.origyuan.com/v1`
- Local `cc-switch` global outbound proxy is persisted in DB setting `global_proxy_url = "http://127.0.0.1:10808"`.
- Current live response from `POST http://127.0.0.1:15721/v1/responses` is no longer `401 Missing bearer`; it now reaches `new-api` and returns `503 system_cpu_overloaded`.
- This means the northbound API-key route is authenticated and wired correctly; the remaining blocker moved to remote `new-api` runtime health.
- Local rollback backups created during this switch:
  - `C:\Users\13492\.cc-switch\cc-switch.db.manual-switch-1776873109.bak`
  - `C:\Users\13492\.cc-switch\settings.json.manual-switch-1776873109.bak`

## Current OpenClaw State
- Remote OpenClaw config path is `/root/.openclaw/openclaw.json`; gateway service is `openclaw-gateway.service`.
- Remote gateway was verified `active` on `2026-04-22`; local executor service `openclaw-localexec.service` was `inactive` at the same time.
- Remote workspaces currently include `/root/.openclaw/workspace-{jiajing,chongzhen,xuande,chenghua,yongle,tianqi,wanli}`.
- Recent live checks succeeded for `chongzhen`, `tianqi`, and `chenghua` via `openclaw agent --agent <id> --thinking minimal --message OK --json`.
- Current effective bot execution path still resolves to `provider=chongzhen` and `model=gpt-5.4` for the tested bots.

## Next-Conversation Fast Start
- If the next task is about local Codex routing, first verify:
  - `cc-switch.exe` is running
  - local port `15721` is listening
  - current Codex provider in `C:\Users\13492\.cc-switch\cc-switch.db` is still `new-api-openai-codex`
  - `C:\Users\13492\.cc-switch\settings.json` still points `currentProviderCodex` to `6931974f-ab1f-4be3-9382-0ae44ee0c3a9`
- If `POST http://127.0.0.1:15721/v1/responses` returns `503 system_cpu_overloaded`, stop debugging local auth/header issues and move directly to remote `new-api` runtime diagnostics.
- If the next task is about cloud bot availability, verify `/root/.openclaw/openclaw.json`, `systemctl --user status openclaw-gateway.service`, then run one `openclaw agent --agent <id> --thinking minimal --message OK --json` live call.
- If the next task is about architecture progress vs. the blueprint, treat `OpenClaw` and `Codex -> CC Switch NewAPI` as complete, `Executor Gateway / memory base / control center` as partial, and `Paperclip / Hermes / full observability-governance` as not yet complete.
