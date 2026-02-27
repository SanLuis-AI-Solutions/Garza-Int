# Changelog

Tracks notable changes to the Garza ROI app so new sessions can orient quickly.

## 2026-02-27
- Agent: **Codex (GPT-5)**.
- Why: customer-facing reliability fixes for approvals renewals, PDF behavior, and export format; plus urgent access renewal request for `jose@garzaintl.com`.
- What:
  - Admin approvals now call the Edge Function via `supabase.functions.invoke('admin-approvals')` with improved error parsing (`error` -> `message` -> SDK fallback) and explicit 401/403 guidance.
  - Removed the broken **Report a problem** button from the dashboard header.
  - PDF action now uses native browser print (`window.print()`) for the current view (Dashboard/Detail), with print CSS to hide navigation/topbar controls and keep printable content visible.
  - **Export Report** now downloads one `.xlsx` workbook with multiple sheets (`Meta`, `KPIs`, `Inputs`, and strategy-specific sheets) instead of ZIP-of-CSV files.
  - One-time production data action executed: renewed `jose@garzaintl.com` access for +14 days.
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (Vite production build passed).
  - Production DB verification after renewal:
    - `approved_emails.approved = true`, `approved_at = 2026-02-27 15:43:42+00`.
    - `user_entitlements` for `DEVELOPER/LANDLORD/FLIPPER` all active with `expires_at = 2026-03-13 15:43:42+00`.

## 2026-02-06
- Security: enforced approval + MFA at the database layer (RLS) via `docs/security.sql`.
- Security: approvals mutations moved to a Supabase Edge Function (`supabase/functions/admin-approvals`) so only admin+AAL2 can approve/revoke/remove.
- UX: admin sidebar shows pending approvals count; Approvals page supports bulk actions and pending CSV export.
- Product: multi-strategy ROI (Developer/Landlord/Flipper), projects persisted in Supabase with per-user RLS.
- QA: added formula-based benchmark tests for calculators (Vitest).
- UX: validation banner + per-strategy assumptions callouts in Detail views.
- Ops: "Report a problem" button downloads a report ZIP and opens an email draft.
- Hardening: optional Sentry integration (via `VITE_SENTRY_DSN`).
- Preview safety: `projects.environment` column + `VITE_APP_ENV` filter to separate preview vs production data inside the same Supabase project (free plan constraint).

## 2026-02-07
- Added admin-only **Calculator QA** screen to regression-check core formulas in-browser (`AppTab.QA`).
- Removed the AI Chat “Quick Tip” button/feature (keeps chat only).
- Added a simple human version label (`VITE_APP_VERSION`, e.g. `v1.5`) shown in the sidebar and included in exports/emails.

## 2026-02-09
- Security/Monetization: added server-side **time-limited entitlements** (`public.user_entitlements`) for strategy access, enforced by RLS on `public.projects`.
- Ops: approving an email now grants **trial access to all 3 strategies** (Developer/Landlord/Flipper) via the `admin-approvals` Edge Function.
- Ops: Admin Approvals UI can now display access expiry and **renew** a user's access window.
- DevX: added repo VS Code defaults to avoid watching/searching huge generated folders (faster + fewer false “pending changes”).
- Auth: added **Magic Link** sign-in option (email OTP) for quick access.
- Security: added **time-limited MFA bypass** (`public.mfa_exemptions`) for approved users who cannot set up TOTP; managed via Approvals UI + Edge Function and enforced by projects RLS.
