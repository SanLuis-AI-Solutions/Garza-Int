# Handoff Summary

Use this when transitioning work between sessions or agents. Follow the "Document" step in `OPERATING_MODEL.md` and keep this file short and decision-focused.

## Status
- Current focus: Stabilize and harden Garza ROI Dashboard (security + correctness + ops UX).
- Last completed (2026-02-27, Agent: Codex/GPT-5): Completed reliability hardening pack (Plan & Access tab, approvals audit/telemetry, scheduled production smoke workflow, Playwright smoke suite, and Vite vendor chunk tuning).

## Key Files
- Security (DB/RLS): `docs/security.sql`
- Projects (DB schema): `docs/projects.sql`
- Auth + MFA gate: `components/AuthGate.tsx`
- Admin approvals UI: `components/AdminApprovals.tsx`
- Admin approvals edge function: `supabase/functions/admin-approvals/index.ts`
- Strategy calculators: `domain/strategies/*.ts`
- Strategy benchmark tests: `domain/strategies/__tests__/benchmarks.test.ts`
- Export/report: `services/reportExport.ts`
- Dashboard shell: `DashboardApp.tsx`
- Access view: `components/AccessOverview.tsx`
- Shared styling (print): `theme.css`
- Playwright smoke: `e2e/dashboard-smoke.spec.ts`, `playwright.config.ts`
- Scheduled smoke workflow: `.github/workflows/production-smoke.yml`
- Operating protocol: `OPERATING_MODEL.md`
- Change log: `docs/CHANGELOG.md`

## Next Actions
1. Add Stripe billing (or PayPal) + webhook-driven renewals that extend `user_entitlements.expires_at` automatically.
2. Add optional notification emails on new approval requests (requires an email provider key; implement as edge function + rate limiting).
3. Configure repository secrets for scheduled smoke (`E2E_BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`, optional `E2E_TOTP_SECRET`, optional mutation flags) and validate the first cron run.
4. Add screenshot capture/upload to smoke workflow for handoff evidence after each run.
