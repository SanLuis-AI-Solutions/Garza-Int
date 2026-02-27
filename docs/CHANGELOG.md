# Changelog

Tracks notable changes to the Garza ROI app so new sessions can orient quickly.

## 2026-02-27 (Hotfix: In-App Renewal Requests + Renew Reliability)
- Agent: **Codex (GPT-5)**.
- Version: **1.1.2**.
- Why: renew button had repeated `401 Invalid JWT` behavior in production and expired users had no direct in-app renewal request path.
- What:
  - Added `Request Renewal` action on **Access Expired** screen.
  - Added admin-facing **Renewal Requests** panel in Approvals tab with one-click `Approve + Renew`.
  - Added robust optional-table handling for `access_renewal_requests` and `admin_approval_audit`.
  - Strengthened approvals mutation invocation:
    - explicit bearer token header on each function call
    - session refresh + retry on 401 before forcing re-auth
  - Applied required SQL objects on live production project (`qsikswtoqwbylxyxwejz`):
    - `public.access_renewal_requests`
    - `public.admin_approval_audit`
  - Deployed `admin-approvals` Edge Function to live production project (`qsikswtoqwbylxyxwejz`).
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (production build passed).
  - Verified production env Supabase project target used by app is `qsikswtoqwbylxyxwejz`.

## 2026-02-27 (Hotfix: Approvals + Navigation)
- Agent: **Codex (GPT-5)**.
- Version: **1.1.1**.
- Why: admin renew actions were blocked by aggressive client re-auth checks, and audit-table missing errors were noisy.
- What:
  - Moved `Access` tab to the bottom of sidebar navigation for a more discreet position.
  - Relaxed client preflight in Approvals:
    - removed strict AAL2 pre-blocking on client side
    - added session refresh and retry path on `401 Invalid JWT`
    - only force re-auth when retry still fails
  - Expanded optional-table detection for `admin_approval_audit` to include schema-cache errors.
  - Added production DB table + policies for `public.admin_approval_audit`.
  - One-time production renewal completed for `danielsanluis03@gmail.com` (+14 days).
  - Deployed updated `admin-approvals` Edge Function.
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (production build passed).
  - Production SQL verification:
    - `approved_emails`: `danielsanluis03@gmail.com` approved at `2026-02-27 17:37:36+00`.
    - `user_entitlements`: `DEVELOPER/LANDLORD/FLIPPER` active, expires `2026-03-13 17:37:36+00`.

## 2026-02-27 (Versioning + Visibility Fix)
- Agent: **Codex (GPT-5)**.
- Why: latest code was pushed but version visibility remained stale; release tracking needed to be simple and reliable.
- What:
  - Changed UI version source to compile-time `package.json` version (`__APP_VERSION__`) instead of env-driven version.
  - Bumped release version to **1.1.0**.
  - Updated env docs to reflect the new rule: bump `package.json` each release.
  - Deployed production after this version bump so latest changes are visible.
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (production build passed).
  - Production deployment completed via Vercel (`--prod`).

## 2026-02-27 (Reliability Hardening Pack)
- Agent: **Codex (GPT-5)**.
- Why: execute all approved hardening suggestions in one safe rollout (access visibility, approvals observability, automated smoke coverage, and performance tuning).
- What:
  - Added a user-facing **Plan & Access** tab showing entitlement status and expiry per strategy.
  - Extended auth access model to include structured entitlement rows (`allowedStrategies`, `trialEndsAt`, `entitlements`).
  - Added approvals observability:
    - frontend UI telemetry helper (`services/observability.ts`) and instrumentation for export/admin actions.
    - backend structured logs + audit write path in `admin-approvals` edge function.
    - admin UI “Recent Admin Actions” panel.
  - Added DB schema/policy support for `public.admin_approval_audit` in `docs/security.sql`.
  - Added export/admin test hooks (`data-testid`) and introduced Playwright smoke suite:
    - CSV export
    - PDF/print launch
    - optional admin renew mutation flow (secret-gated)
  - Added scheduled GitHub workflow: `.github/workflows/production-smoke.yml`.
  - Added Vite manual chunk strategy for core vendor splits (`supabase`, `ai`, `charts`, `sentry`) to reduce large entry-bundle pressure.
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (production build passed).
  - `npm run e2e` (smoke suite executed; tests safely skipped because E2E secrets were not set in local environment).

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

## 2026-02-27 (Follow-up)
- Agent: **Codex (GPT-5)**.
- Why: client reported print previews were still effectively blank on Detail/Dashboard due to white/light text rendering on white print backgrounds; requested export options update and button label clarity.
- What:
  - Hardened print CSS contrast rules to force readable text in print preview/PDF output, including KPI gradient text fallback.
  - Kept native browser print flow and renamed header button from **PDF** to **Print**.
  - Updated **Export Report** to a format picker with **CSV** (single consolidated file) or **PDF** (native print/save-as-PDF flow).
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (Vite production build passed).

## 2026-02-27 (Follow-up 2)
- Agent: **Codex (GPT-5)**.
- Why: client still observed blank/white print previews after CSS-only adjustments.
- What:
  - Replaced app-CSS-dependent print flow with a controlled printable document generated from live project/results data.
  - `printProjectReport` now prints via a hidden iframe with explicit high-contrast styles and section tables, eliminating white/blank preview risk from screen theme styles.
  - Wired print/export PDF actions to pass the active view (`dashboard` or `detail`) so printed content matches the current tab context.
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (Vite production build passed).

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
