# admin-approvals (Edge Function)

Admin-only mutation path for `public.approved_emails`.

Also maintains **strategy entitlements** in `public.user_entitlements` (trial access to all 3 strategies on approval).
Also writes an audit row to `public.admin_approval_audit` (if table exists).

## API

`POST /functions/v1/admin-approvals`

Body:
```json
{ "action": "approve" | "revoke" | "remove" | "renew" | "mfa_bypass_grant" | "mfa_bypass_revoke", "email": "user@company.com" }
```

Bulk body:
```json
{ "action": "approve" | "revoke" | "remove" | "renew" | "mfa_bypass_grant" | "mfa_bypass_revoke", "emails": ["a@x.com", "b@x.com"], "days": 14 }
```

Auth:
- Requires `Authorization: Bearer <access_token>`
- Enforces:
  - admin email: `contact@sanluisai.com`
  - MFA/AAL2 (`aal` claim must be `aal2`)

## Secrets

Optional (recommended):
- `SERVICE_ROLE_KEY`
- `TRIAL_DAYS` (default: 14)

If missing, the function falls back to using the caller JWT so Postgres RLS still enforces admin + MFA.
