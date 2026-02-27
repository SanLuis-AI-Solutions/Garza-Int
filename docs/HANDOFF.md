# Handoff Summary

Use this when transitioning work between sessions or agents. Follow the "Document" step in `OPERATING_MODEL.md` and keep this file short and decision-focused.

## Status
- Current focus: Stabilize and harden Garza ROI Dashboard (security + correctness + ops UX).
- Last completed (2026-02-27, Agent: Codex/GPT-5): Follow-up print/export patch to fix blank/low-contrast print previews, rename `PDF` button to `Print`, and add `Export Report` format options (CSV or PDF/print flow).

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
- Shared styling (print): `theme.css`
- Operating protocol: `OPERATING_MODEL.md`
- Change log: `docs/CHANGELOG.md`

## Next Actions
1. Add Stripe billing (or PayPal) + webhook-driven renewals that extend `user_entitlements.expires_at` automatically.
2. Add a user-facing “Plan / Access” view that shows remaining time + renewal instructions (reduces support load).
3. Add optional notification emails on new approval requests (requires an email provider key; implement as edge function + rate limiting).
4. Add a short production smoke checklist (login -> MFA -> create project -> export report) and capture evidence screenshots.
