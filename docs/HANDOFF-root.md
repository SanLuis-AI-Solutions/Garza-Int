# Handoff Summary

Use this when transitioning work between sessions or agents. Follow the “Document” step in `OPERATING_MODEL.md` and keep this file short and decision-focused.

## Status
- Current focus: Stabilize and harden Garza ROI Dashboard (security + correctness + ops UX).
- Last completed (2026-02-09): Strategy entitlements (time-limited access to all 3 strategies) enforced by RLS + Edge Function granting on approval + admin renew controls in Approvals UI.
- Paused: awaiting client feedback before starting billing automation.

## Key Files
- Security (DB/RLS): `Garza-Int/docs/security.sql`
- Projects (DB schema): `Garza-Int/docs/projects.sql`
- Auth + MFA gate: `Garza-Int/components/AuthGate.tsx`
- Admin approvals UI: `Garza-Int/components/AdminApprovals.tsx`
- Admin approvals edge function: `Garza-Int/supabase/functions/admin-approvals/index.ts`
- Strategy calculators: `Garza-Int/domain/strategies/*.ts`
- Strategy benchmark tests: `Garza-Int/domain/strategies/__tests__/benchmarks.test.ts`
- Export/report: `Garza-Int/services/reportExport.ts`
- Dashboard shell: `Garza-Int/DashboardApp.tsx`
- Operating protocol: `OPERATING_MODEL.md`
- Change log: `Docs/CHANGELOG.md`

## Next Actions
1. Billing automation (remaining): Stripe subscription + webhooks to automatically extend `user_entitlements.expires_at`.
2. Add a user-facing “Plan / Access” view that shows remaining time + renewal instructions (reduces support load).
3. Add optional notification emails on new approval requests (requires an email provider key; implement as edge function + rate limiting).
4. Add a periodic production smoke checklist (login -> MFA -> create project -> export report) and capture evidence screenshots.
