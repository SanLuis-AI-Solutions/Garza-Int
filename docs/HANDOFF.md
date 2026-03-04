# Handoff Summary

Use this when transitioning work between sessions or agents. Follow the "Document" step in `OPERATING_MODEL.md` and keep this file short and decision-focused.

## Status
- Current focus: Stabilize and harden Garza ROI Dashboard (security + correctness + ops UX).
- Last completed (2026-03-04, Agent: Codex/GPT-5): **1.1.6** released to production; version bump + docs sync committed (`3736757`) and production manually deployed to READY (`dpl_2mWhvoWcBWu989BubUh6BTUy26dF`) on `garza-int.vercel.app`.

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
1. Root-cause the recurring **Git-triggered** Vercel deployment failures (`state=ERROR`) for `main` even though manual CLI deploy succeeds; collect build logs for `dpl_6KtJBtkvPqP9aHxPGWJPKgvmW17U` and restore healthy Git auto-deploys.
2. Perform a quick production smoke check that the sidebar/app chrome shows `v1.1.6` and core tabs load correctly under current access controls.
3. Configure secrets for new canary/alert workflows:
   - `CANARY_SUPABASE_URL`
   - `CANARY_SUPABASE_SERVICE_ROLE_KEY`
   - optional `ADMIN_APPROVALS_ALERT_WEBHOOK_URL`
4. Set repository vars for alert thresholds (`ADMIN_APPROVALS_ALERT_WINDOW_MINUTES`, `ADMIN_APPROVALS_ALERT_MAX_TOTAL`, `ADMIN_APPROVALS_ALERT_MAX_401`, `ADMIN_APPROVALS_ALERT_MAX_500`) and run both workflows once via manual dispatch.
5. Configure `RESEND_API_KEY` (+ optional `RENEWAL_NOTIFY_TO_EMAILS`, `RENEWAL_NOTIFY_FROM_EMAIL`) for production so renewal request emails are delivered.
6. Add screenshot capture/upload to smoke workflow for handoff evidence after each run.

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
