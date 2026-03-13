# Changelog

Tracks notable changes to the Garza ROI app so new sessions can orient quickly.

## 2026-03-13 (Auth Bootstrap Hardening + Actions Spend Controls)
- Agent: **Codex (GPT-5)**.
- Why: prevent users from getting stuck on indefinite auth/loading screens and close the remaining GitHub Actions alerting/runtime configuration gaps.
- What:
  - Hardened `components/AuthGate.tsx` with bounded timeouts around session restore, approval checks, MFA checks, MFA bypass lookup, and entitlement checks.
  - Added explicit recovery states with retry/sign-out actions when approval or entitlement checks fail instead of leaving the UI on a permanent loading state.
  - Moved MFA bypass lookup into an effect so the render path no longer triggers the check repeatedly while the session is loading.
  - Updated GitHub workflow files for lower Actions spend and Node 24 compatibility:
    - concurrency cancelation
    - `workflow_dispatch`
    - docs-only path filtering
    - tighter job timeouts
    - `actions/*@v6` upgrades
  - Fixed `scripts/check-admin-approvals-error-rate.mjs` so blank repo vars fall back to safe defaults instead of failing the workflow.
  - Confirmed required alert secrets and vars are now configured and the `Admin Approvals Alert` workflow runs successfully.
- Verification:
  - `npm test` (33/33 passed).
  - `npm run build` (Vite production build passed).
  - GitHub Actions `Admin Approvals Alert` run `23068540961` succeeded on `main`.

## 2026-03-13 (Tailwind Runtime Removal)
- Agent: **Codex (GPT-5)**.
- Why: remove the production `cdn.tailwindcss.com` runtime dependency and eliminate the live browser warning from the app shell.
- What:
  - Added local Tailwind compilation through the official Vite plugin in `vite.config.ts`.
  - Added Tailwind as a dev dependency in `package.json` / `package-lock.json`.
  - Moved the font loading and spreadsheet scrollbar utility out of the inline `index.html` block into the app-owned asset pipeline.
  - Removed the Tailwind CDN `<script>` from `index.html` so production styling is fully bundled at build time.
- Verification:
  - `npm test` (33/33 passed).
  - `npm run build` (Vite production build passed with no Tailwind import-order warnings).
  - Local browser smoke via `vite preview` rendered the login screen correctly; remaining console noise is only a missing `favicon.ico`.

## 2026-03-13 (Production Smoke Guardrail Upgrade)
- Agent: **Codex (GPT-5)**.
- Why: make production smoke checks catch login-shell and console regressions even when credential secrets are unavailable.
- What:
  - Added an unauthenticated Playwright smoke case that verifies the login shell renders and the page emits no console or page errors on initial load.
  - Relaxed the workflow gate so `.github/workflows/production-smoke.yml` can always run against production using the canonical `https://garzaroi.sanluisai.com` fallback URL.
  - Kept the existing credentialed export/admin smoke coverage as optional tests that skip cleanly when login secrets are absent.
- Verification:
  - `npm test` (33/33 passed).
  - `npx playwright test e2e/dashboard-smoke.spec.ts --project=chromium --grep "renders login shell without console errors"` against local `vite preview` passed.

## 2026-03-04 (Release 1.1.6: Version Bump + Vercel Sync Check)
- Agent: **Codex (GPT-5)**.
- Version: **1.1.6**.
- Why: verify whether Vercel production is serving the most recent GitHub commit and bump the in-app version so the next deploy can be confirmed visually.
- What:
  - Verified Git state parity: local `main` and `origin/main` both at `83e0e5a60ae65141f37f57e61de4c42fe0e8f9ee`.
  - Verified Vercel received that commit (`dpl_CTnEqKYL5Uy3jmUpnfbqEBzXRXoG`) but latest production deployment is in `ERROR` state.
  - Confirmed production alias currently serves older READY deployment on commit `3db310ca6390d22b169bfbe4336fd3f2e80a05c8`.
  - Bumped visible app version to `1.1.6` in `package.json` and synchronized `package-lock.json`.
  - Committed/pushed release commit `373675739e4976b10ed404d311863f6dd848abf6` and executed manual production deploy via CLI.
  - Confirmed production alias now points to READY deployment `dpl_2mWhvoWcBWu989BubUh6BTUy26dF` on commit `373675739e4976b10ed404d311863f6dd848abf6`.
  - Root-caused failing Git auto-deploys: Vercel blocked commits authored by `SanLuisSolutions` on Hobby with `TEAM_ACCESS_REQUIRED` / “commit author does not have contributing access”.
  - Verified fix path on Hobby: commit authored by `SanLuis-AI-Solutions` (`contact@sanluisai.com`) deployed via Git integration successfully (`dpl_6u2W8P2GJPwhTphr4PY4dRVqekuu`, source `git`, state `READY`).
- Verification:
  - `npm run build` (Vite production build passed).
  - Vercel project/deployment metadata inspected via MCP (`list_deployments`, `get_deployment`, `get_project`).
  - `npx vercel deploy --prod --yes` completed successfully and aliased to `garza-int.vercel.app`.
  - Vercel deployment API inspection (`v13`) captured explicit error message and seat block code (`TEAM_ACCESS_REQUIRED`) on failed deployment `dpl_C7KLDNRLtZ5a56ZJUN389DanZgxR`.

## 2026-02-27 (Reliability Gaps Closure + Incident Workflow Kit)
- Agent: **Codex (GPT-5)**.
- Version: **1.1.5**.
- Why: close the three remaining post-incident reliability gaps (renew canary assertion, approvals alerting, in-app diagnostics) and package a reusable incident-response operating set for future projects.
- What:
  - Added read-only `diagnostics` action in `supabase/functions/admin-approvals/index.ts` that returns:
    - function version/runtime
    - connected DB ref
    - latest mutation summary from `admin_approval_audit`
  - Added in-app **Admin Diagnostics** panel in Approvals UI with function version/runtime and last mutation action/status/time.
  - Added renew canary verification automation:
    - new script: `scripts/verify-renew-canary.mjs`
    - new workflow: `.github/workflows/renew-canary.yml`
    - validates both entitlement expiry delta and matching successful renew audit row.
  - Added scheduled audit-threshold alerting for approvals:
    - new script: `scripts/check-admin-approvals-error-rate.mjs`
    - new workflow: `.github/workflows/admin-approvals-alert.yml`
    - supports optional webhook notification.
  - Hardened Playwright renew smoke assertions to match current admin toast content.
  - Created reusable incident package for cross-project reuse:
    - agent: `.agent/agents/incident-responder.md`
    - skill: `.agent/skills/incident-proof-fix/SKILL.md`
    - workflow: `.agent/workflows/incident-hotfix.md`
  - Updated `.agent/ARCHITECTURE.md`, `skills-catalog.txt`, `agents-catalog.txt`, and `workflows-catalog.txt` with new incident assets.
- Verification:
  - `npm run test` (10/10 passed).
  - `npm run build` (Vite production build passed).
  - `npm run e2e` (3 smoke tests skipped due env-gated credentials/secrets).

## 2026-02-27 (Hotfix Closure: Renew Button Production Recovery)
- Agent: **Codex (GPT-5)**.
- Version: **1.1.4**.
- Why: close out the `Renew (+14d)` incident with verified production behavior and synced release metadata.
- What:
  - Included latest renew-path hardening updates from the active working tree:
    - tighter approvals response handling on UI side
    - edge function runtime/auth diagnostics and renewal-request auto-resolution in `admin-approvals`
  - Confirmed live edge deployment is now `admin-approvals` **version 9**.
  - Bumped app version to `1.1.4` and updated handoff docs.
- Verification:
  - `user_entitlements` for `danielsanluis03@gmail.com` now active through `2026-03-13 19:41:54.654+00` for `DEVELOPER/LANDLORD/FLIPPER`.
  - `access_renewal_requests` for `danielsanluis03@gmail.com` is `resolved` at `2026-02-27 19:41:54.654+00` by `contact@sanluisai.com`.
  - `admin_approval_audit` contains latest successful `renew` row at `2026-02-27 19:41:54.832289+00`.
  - Supabase edge logs show `POST 200` for `admin-approvals` on function version `9`.

## 2026-02-27 (Hotfix: Renew Action Reliability + Admin Renewal Ops)
- Agent: **Codex (GPT-5)**.
- Version: **1.1.3**.
- Why: `Renew (+14d)` still behaved like a no-op in production due repeated `401` failures on approvals mutations; admin requested stronger confirmations and renewal-request operations.
- What:
  - Fixed approvals invocation path by removing manual auth-header token injection and using SDK-native function invocation with retry/error parsing.
  - Hardened edge function auth path to trust verified JWT claims (admin email + `aal2`) and removed extra token validation round-trip that was causing repeated `401` responses.
  - Added admin success confirmations with exact expiry timestamps for approve/renew actions.
  - Added bulk action: `Process All Pending (+Xd)` for renewal requests.
  - Kept/validated connected environment diagnostic label: `Connected DB ref`.
  - Added renewal request email notification hook:
    - new edge function `renewal-request-notify`
    - best-effort invocation from expired-account `Request Renewal` flow (does not block request creation if email provider is not configured).
  - Bumped app version to `1.1.3`.
- Verification:
  - `npm run test` (10 tests passed).
  - `npm run build` (Vite production build passed).
  - `npm run e2e` (3 smoke tests skipped due environment-gated credentials/secrets).

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
