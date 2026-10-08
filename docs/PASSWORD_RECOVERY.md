# Staff password recovery contract

All requests use the existing same-origin JSON `POST /api/school`, with no-store responses and the authentication rate limit. Credentials and provider tokens are never returned in JSON or saved in browser storage.

| Action | Input | Success | Authorization |
| --- | --- | --- | --- |
| `recover_password` | `email` | `{ "ok": true }`, whether the account exists or not | Public; creates a random PKCE verifier in a Secure HttpOnly host-only cookie for one hour. Sends only its SHA-256 challenge to Supabase `/recover`. Redirect is derived from the validated request origin, never request-body data. |
| `exchange_recovery` | `code` (provider authorization UUID) | `{ "ok": true }` | Requires the matching verifier cookie. Exchanges with Supabase `grant_type=pkce`, clears the verifier and creates a separate recovery-only HttpOnly cookie for 15 minutes. Does not create a staff session or grant a role. |
| `recovery_status` | none | `{ "ok": true, "mfaRequired": boolean }` | Requires a recovery cookie validated by Supabase `/user`; allows refreshing the password form after exchange. The exchange response also includes `mfaRequired`. |
| `recovery_verify` | `code` (six digits) | `{ "ok": true }` | Challenges the recovery user's existing verified TOTP factor, verifies it and rotates only the recovery cookie. Cannot enroll/remove factors or create a staff session. |
| `reset_password` | `password` (12–128 characters) | `{ "ok": true }` | Requires a validated recovery cookie. Updates only that user's password through Supabase `PUT /user`, clears recovery and staff cookies, and returns to normal sign-in. MFA and memberships remain unchanged. |

Errors retain the existing envelope `{ "error": "…" }`: 400 for malformed input or `password_rejected`, 401 for expired/invalid recovery, 403 for another origin, 429 for throttling, 503 for provider/configuration failures. No account-existence details or provider error text are exposed.

The browser removes callback codes/errors from its URL before rendering the reset form. Callback state lives only in memory. The newest recovery email must be opened in the same browser where it was requested. Starting another recovery replaces the previous verifier. A missing, expired or consumed link offers a fresh recovery request. An account with an existing verified MFA factor must verify its authenticator before changing its password; reset returns `403 mfa_required` otherwise. Lost MFA devices still require the authorized administrator's recovery process.

## Provider configuration

As of 2026-10-08, the production recovery redirect is configured and the default confirmation-link template is present. Custom SMTP is not configured; the owner requested preparation only until a mail provider is available. Supabase's built-in delivery is restricted to project-team email addresses and is not a general staff-mail service. No live recovery email or real password change has been performed.

Keep email confirmation, the existing MFA policy and the 12-character minimum enabled. Set the Site URL to `https://seatai1-web.vercel.app/#school` and allow `https://seatai1-web.vercel.app/#school-reset` as a redirect URL. Use the provider's standard recovery email confirmation link (`{{ .ConfirmationURL }}`). Existing Site URL fallback callbacks with a `code` query are also handled. Preview hosts need their own explicit redirect permission and backend configuration before live email testing.

Validation includes API contract tests with a mocked provider, invalid/replayed code paths, cookie isolation, origin/rate-limit checks, password rejection, callback URL cleanup and browser recovery forms. Email arrival is a separate live-provider check; do not claim delivery from a mocked request.

Provider references: [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Auth HTTP contract](https://github.com/supabase/auth/blob/master/openapi.yaml).
