# Handoff Summary

Use this when transitioning work between sessions or agents. Follow the "Document" step in `OPERATING_MODEL.md` and keep this file short and decision-focused.

## Status
- Current focus: Stabilize and harden Garza ROI Dashboard (security + correctness + ops UX).
- Last completed (2026-02-27, Agent: Codex/GPT-5): Hotfix closure released as **1.1.4** with production-verified renew recovery (`admin-approvals` v9 returning 200), resolved renewal queue flow, and synchronized version/docs/tag readiness.

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
- Operating protocol: `OPERATING_MODEL.md`
- Change log: `docs/CHANGELOG.md`

## Next Actions
1. Configure `RESEND_API_KEY` (+ optional `RENEWAL_NOTIFY_TO_EMAILS`, `RENEWAL_NOTIFY_FROM_EMAIL`) for production so renewal request emails are delivered.
2. Add Stripe billing (or PayPal) + webhook-driven renewals that extend `user_entitlements.expires_at` automatically.
3. Configure repository secrets for scheduled smoke (`E2E_BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`, optional `E2E_TOTP_SECRET`, optional mutation flags) and validate the first cron run.
4. Add screenshot capture/upload to smoke workflow for handoff evidence after each run.
