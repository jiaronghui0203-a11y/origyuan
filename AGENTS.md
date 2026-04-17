# AGENTS.md

## Project Snapshot
- Local-first Node.js service for future fingerprint browser, VPS, and OpenClaw collaboration.
- Runtime entrypoint: `src/server.js`
- Primary goal: build, test, and extend locally before any remote sync or deployment.

## Commands
- Install: `npm ci`
- Start: `npm start`
- Test: `npm test`
- Windows local test: `powershell -ExecutionPolicy Bypass -File scripts/local-test.ps1`
- POSIX local test: `sh scripts/local-test.sh`

## Local Verification
- Create env from example before running:
  - `cp .env.example .env`
- Health check:
  - `curl http://127.0.0.1:3000/health`

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
