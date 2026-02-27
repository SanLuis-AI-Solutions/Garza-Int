# renewal-request-notify (Edge Function)

Sends an admin email when a user submits a renewal request from the expired-access screen.

## Request

`POST /functions/v1/renewal-request-notify`

```json
{ "email": "user@example.com", "requested_at": "2026-02-27T20:15:00.000Z" }
```

## Auth

- Requires a signed-in JWT (`verify_jwt = true`).
- Requester must match the requested email (or be the admin email).

## Environment Variables

- `RESEND_API_KEY` (required to send email)
- `RENEWAL_NOTIFY_TO_EMAILS` (optional, comma-separated; defaults to `contact@sanluisai.com`)
- `RENEWAL_NOTIFY_FROM_EMAIL` (optional; defaults to `onboarding@resend.dev`)

If `RESEND_API_KEY` is missing, the function returns `200` with `skipped: true` so the user flow is not blocked.

