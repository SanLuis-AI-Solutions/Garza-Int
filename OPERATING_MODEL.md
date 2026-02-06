# Adaptive Operating Model (Agents + Skills + Workflows + MCPs)

This operating model defines how Codex should choose workflows/agents/skills/tools and execute work safely and predictably.

## Scope And Sources Of Truth
- Applies to this project and any future project that copies this file.
- **Rules and enforcement live in** `AGENTS.md`. This document is the process playbook.
- System and developer instructions still have highest priority (see `AGENTS.md`).
- System capabilities are described in:
  - `.agent/ARCHITECTURE.md`
  - `skills-catalog.txt`, `agents-catalog.txt`, `workflows-catalog.txt`
- Avoid doc drift: keep a single canonical copy of a given process doc and make any duplicates stubs that point to the canonical file.

## Non-Negotiables
- Evidence before assertions: do not claim “fixed/passing/deployed” without running the relevant checks.
- Secrets never in commits and never in docs: use `.env.local` + `.env.example` patterns.
- Prefer minimal, targeted file reads; keep context small.
- Keep changes reversible: small diffs, avoid broad refactors without a plan.
- When independent shell reads/checks are needed, run them in parallel (faster, less error-prone).

## Bootstrap And Drift Control
- If workflows/agents/skills are missing or stale, use the PowerShell shortcuts from `AGENTS.md`:
  - `installall` (first-time install into this project)
  - `syncskills`, `syncagents`, `syncworkflows` (keep catalogs aligned)
- If a workflow is referenced here but missing from `workflows-catalog.txt`, treat that as drift and fix via sync or doc update.

### New Project Kickoff
- Run `/bootstrap` to get a clean starting baseline.
- Run `/preflight` to confirm MCPs/tooling are healthy before doing production-facing work.

## Default Execution Loop (Use This Unless A Workflow Says Otherwise)
1. **Triage**
   - Scope: single-file vs multi-file vs system-level
   - Risk: auth, data, prod, security, SEO, billing
   - Reversibility: easy rollback?
   - Evidence: what must be verified (build/tests/live check/DB query)?
2. **Select A Workflow**
   - Pick a single “primary workflow” to structure the work, chain only when it helps (see catalog).
3. **Choose Agents/Skills/Tools**
   - Use the minimum set that covers the task.
   - If a task clearly matches a skill, use it; otherwise keep it general.
4. **Implement**
   - Make changes in small steps with intermediate verification where it reduces risk.
5. **Verify**
   - Run build/tests/typecheck as appropriate.
   - For production changes: verify the deployed artifact (HTTP fetch, browser check, or MCP-based check).
6. **Document**
   - Update docs that would otherwise drift (schemas, runbooks, migrations, env examples).
   - For material design/architecture changes, add a short decision note to the relevant doc.
   - For any production-impacting change, add a one-paragraph entry to `docs/CHANGELOG.md` and update `docs/HANDOFF.md`.

## Selection Protocol (What To Reach For First)
### Workflows (structure)
- Planning: `/plan`, `/sequential-plan`
- Build/ship: `/deploy`, `/handoff`
- Debugging: `/debug`
- UI/UX: `/ui-ux-pro-max`
- QA gate: `/qa-gate`
- Docs drift: `/sync-docs`
- Repo automation: `/repo-automation`

### Agents (ownership lanes)
- Frontend/UI: `frontend-specialist`
- Backend/APIs: `backend-specialist`
- DB/RLS/migrations: `database-architect`
- Reliability/perf: `sre-specialist`, `performance-optimizer`
- Multi-stream coordination: `orchestrator`

### Skills (specialized technique)
- Use only when explicitly triggered (by name or clear match).
- Layer skills intentionally; name which ones are in play and why.

### MCPs (evidence, external systems)
Use MCP servers when they materially improve evidence quality or reduce manual steps:
- Browser evidence: `chrome_devtools`, `puppeteer`
- External systems: `github`, `vercel`, `supabase-mcp-server`, `google-workspace`
- Design exploration: `stitch`

Operational notes:
- Global MCP configuration typically lives outside the repo (example on Windows: `%USERPROFILE%\\.mcp-master-config.json`).
- Do not store long-lived secrets directly in shared config files; prefer environment variables and rotate credentials if exposure is suspected.

## Multi-Model UI Loop (Codex Leads)
When improving layout/design on major screens (Login, Dashboard shell, Inputs, Approvals), use the artifact loop:
- Use `/ui-artifact-loop` to drive: brief -> Gemini Fast options -> Stitch links -> Opus critique -> implementation -> verification.
- Store artifacts in `Docs/artifacts/ui/YYYY-MM-DD--<slug>/` with:
  - `00-brief.md`, `01-gemini-fast-options.md`, `02-stitch-links.md`, `03-opus-review.md`, `04-implementation-notes.md`
- Use `/stitch-design-to-react` when the chosen direction is generated in Stitch and needs conversion into React components.

## Verification Gates (Minimum Bar)
- Code change: `npm run build` (and `tsc --noEmit` if TS project) must pass before “done”.
- Auth/security change: verify unauthenticated flow and authenticated flow; validate RLS boundaries if DB involved.
- Data model change: add/update schema docs + example env vars; ensure backward compatibility or migrate.
- Deploy: verify the production URL serves the new build artifact (hash change + smoke flow).

## Auto-Router (Task Type -> Recommended Bundle)
| Task Type | Workflows | Agents | Skills | MCPs |
| --- | --- | --- | --- | --- |
| Visual redesign | `/plan` -> `/ui-ux-pro-max` -> `/qa-gate` | `frontend-specialist` + `orchestrator` | `ui-ux-pro-max`, `frontend-design`, `scroll-experience` | `chrome_devtools`, `stitch` |
| New page build | `/plan` -> `/create` -> `/qa-gate` | `frontend-specialist` | `react-patterns`, `tailwind-patterns` | `chrome_devtools` |
| Bug / runtime error | `/debug` -> `/qa-gate` | `debugger` | `systematic-debugging` | `chrome_devtools` |
| Performance regression | `/debug` -> `/qa-gate` | `performance-optimizer` | `web-performance-optimization` | `chrome_devtools` |
| Database migration | `/plan` -> `/qa-gate` | `database-architect` | `database-design` | `supabase-mcp-server` |
| Deploy | `/qa-gate` -> `/deploy` | `devops-engineer` | `deployment-procedures` | `vercel` |
| Repo automation | `/repo-automation` | `repo-automation-specialist` | `github-workflow-automation` | `github` |

## Multi-Tool Orchestration (When It Is Worth It)
Use parallel workstreams only when tasks are independent and integration is straightforward.
Example: a major visual redesign can run as:
- Lane A: design direction + components (`frontend-specialist`, `ui-ux-pro-max`)
- Lane B: perf + bundle checks (`performance-optimizer`, `web-performance-optimization`)
- Lane C: QA + accessibility (`test-engineer`, `accessibility-auditor`)

