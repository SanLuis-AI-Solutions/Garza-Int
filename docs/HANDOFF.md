# Handoff Summary

Use this when transitioning work between sessions or agents. Follow the "Document" step in `OPERATING_MODEL.md` and keep this file short and decision-focused.

## Status
- Current focus: Stabilize and harden Garza ROI Dashboard (security + correctness + ops UX).
- Last completed (2026-03-13, Agent: Codex/GPT-5): auth bootstrap hardening shipped to production and GitHub Actions spend controls/alert workflow fixes are live on `main`.
- Latest in progress (2026-03-13, Agent: Codex/GPT-5): removing the live Tailwind CDN runtime dependency by compiling Tailwind locally through Vite; local verification is complete and the change is ready to ship.

## Key Files
- Security (DB/RLS): `docs/security.sql`
- Projects (DB schema): `docs/projects.sql`
- Auth + MFA gate: `components/AuthGate.tsx`
- Admin approvals UI: `components/AdminApprovals.tsx`
- Admin approvals edge function: `supabase/functions/admin-approvals/index.ts`
- Renewal notification edge function: `supabase/functions/renewal-request-notify/index.ts`
- Strategy calculators: `domain/strategies/*.ts`
- Strategy benchmark tests: `domain/strategies/__tests__/benchmarks.test.ts`
- Export/report: `services/reportExport.ts`
- Dashboard shell: `DashboardApp.tsx`
- Access view: `components/AccessOverview.tsx`
- Version source: `package.json`, `services/appMeta.ts`, `vite.config.ts`
- Shared styling (print): `theme.css`
- Playwright smoke: `e2e/dashboard-smoke.spec.ts`, `playwright.config.ts`
- Scheduled smoke workflow: `.github/workflows/production-smoke.yml`
- Renew canary workflow: `.github/workflows/renew-canary.yml`
- Approvals alert workflow: `.github/workflows/admin-approvals-alert.yml`
- Canary verification script: `scripts/verify-renew-canary.mjs`
- Alert threshold script: `scripts/check-admin-approvals-error-rate.mjs`
- Operating protocol: `OPERATING_MODEL.md`
- Change log: `docs/CHANGELOG.md`
- Reusable incident prompt: `docs/CODEX_INCIDENT_FIX_PROMPT.md`
- Reusable incident skill/agent/workflow:
  - `.agent/skills/incident-proof-fix/SKILL.md`
  - `.agent/agents/incident-responder.md`
  - `.agent/workflows/incident-hotfix.md`

## Next Actions
1. Keep repository commit author mapped to the Vercel project owner identity (`contact@sanluisai.com`) on this Hobby setup to avoid `TEAM_ACCESS_REQUIRED` Git deployment blocks.
2. Confirm the next production deploy from Git reaches `READY` on the linked Vercel team/project and verify the live console is clean of the Tailwind CDN warning.
3. Perform a quick production smoke check that the sidebar/app chrome shows `v1.1.6` and core tabs load correctly under current access controls.
4. Decide whether to add a real `favicon.ico` in `public/` to remove the remaining benign console 404 on app load.
5. Configure optional `ADMIN_APPROVALS_ALERT_WEBHOOK_URL` if Slack/Discord paging is desired for approvals alerting.
6. Configure `RESEND_API_KEY` (+ optional `RENEWAL_NOTIFY_TO_EMAILS`, `RENEWAL_NOTIFY_FROM_EMAIL`) for production so renewal request emails are delivered.

## Postmortem and Guardrails (2026-02-27)
- Incident: `Renew (+14d)` appeared as a UI no-op due repeated edge-function auth/runtime failures before final working function rollout.
- Primary miss: implementation iterations were accepted too early based on build/tests/deploy signals instead of strict production mutation proof on the exact failing user.
- What to enforce next time:
  1. Lock incident scope until the reported user/account path is green.
  2. Require per-attempt proof loop: UI action -> edge status code -> DB delta -> UI confirmation.
  3. Require before/after SQL for the exact failing record on every fix attempt.
  4. Keep client and server changes separated into small verifiable steps.
  5. Do not claim fix completion until production logs show success and pending rows are resolved.
- Closure update:
  - Safe renew canary smoke + entitlement/audit verification: implemented.
  - `admin-approvals` `401/500` threshold alerting: implemented.
  - In-app diagnostics panel (function version + last mutation): implemented.
