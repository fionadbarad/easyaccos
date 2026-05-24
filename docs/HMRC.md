# HMRC Sandbox Integration

This doc covers running easyacco against HMRC's sandbox APIs locally.

## Phases

| Phase | What | Auth flow | Endpoint |
| --- | --- | --- | --- |
| 1 | Connectivity probe | `client_credentials` | `GET /hello/application` |
| 2 | User-delegated login | `authorization_code` | `GET /hello/user` |
| 3 | Real MTD submission | `authorization_code` | MTD-IT / MTD-VAT |
| 4 | Validation page + polish | n/a | n/a |

## One-time setup

1. Register a sandbox app at <https://developer.service.hmrc.gov.uk/> →
   **Manage applications** → **Add an application**. Choose **Sandbox**.
2. On the app page, **Subscribe to APIs**:
   - `Hello World` (used by both Phase 1 and Phase 2 probes)
   - Any MTD APIs you'll touch in later phases (Self Assessment, etc.)
3. On the app page, add a **redirect URI**: `http://localhost:3000/api/hmrc/auth/callback`.
   The URI must match `HMRC_REDIRECT_URI` exactly.
4. Copy your **Client ID** and **Client Secret** into `.env.local`.
5. Generate a cookie encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Put the output in `HMRC_COOKIE_SECRET`.

`.env.local` should end up looking like (see `.env.example` for the full list):
```
HMRC_API_BASE=https://test-api.service.hmrc.gov.uk
HMRC_LOGIN_BASE=https://test-www.tax.service.gov.uk
HMRC_CLIENT_ID=…
HMRC_CLIENT_SECRET=…
HMRC_REDIRECT_URI=http://localhost:3000/api/hmrc/auth/callback
HMRC_SCOPES=hello
HMRC_COOKIE_SECRET=…
```

## Test users

The sandbox has its own login system, separate from real HMRC credentials.
Create a test individual under
**Developer Hub → Manage applications → your app → Sandbox test users**.

Use that individual's User ID and password at the HMRC login page during
the OAuth flow. Personal copies of test-user IDs belong in
`docs/HMRC.local.md` (gitignored), not here.

## Walkthrough

### Phase 1 — application auth

1. `npm run dev`
2. Open <http://localhost:3000/dashboard/hmrc>
3. Under **Phase 1 · application auth**, click **Run probe**
4. Expect `[OK] Round-trip succeeded`

### Phase 2 — user-delegated auth

1. Under **Phase 2 · user-delegated auth**, click **Connect HMRC**
2. You're redirected to `test-www.tax.service.gov.uk/oauth/authorize`
3. Log in as the sandbox test individual you created above
4. Grant the `hello` scope when prompted
5. HMRC redirects back to `/api/hmrc/auth/callback?code=…&state=…`
6. The callback verifies the CSRF `state`, swaps the code for tokens,
   writes them to an encrypted HttpOnly cookie, redirects to
   `/dashboard/hmrc?hmrc_connected=1`
7. Click **Call /hello/user**. Expect `[OK] /hello/user → 200`
8. After ~4 hours the access token will be near-expired; the next
   **Call /hello/user** transparently refreshes and shows
   `[OK] /hello/user → 200 (refreshed token)`

### Disconnect

Click **Disconnect** — POSTs `/api/hmrc/auth/disconnect`, which clears the
tokens cookie. Status returns to `not connected`.

## Security model

- Client secret + cookie secret only exist in env vars (server-side).
  Never shipped to the browser.
- Access + refresh tokens live in an HttpOnly cookie, encrypted with
  AES-256-GCM. If the cookie is stolen and the server's `HMRC_COOKIE_SECRET`
  is not, the tokens cannot be decrypted.
- AES-GCM's auth tag means any byte-flip in the cookie causes
  `decrypt()` to return `null` (the user looks "not connected") rather
  than letting tampered bytes silently flow into the OAuth client.
- CSRF protection: a 32-byte random `state` is set as an HttpOnly cookie
  AND included in the redirect URL. The callback rejects requests where
  the URL `state` doesn't match the cookie (constant-time compare).
- Refresh tokens last 18 months; access tokens last 4h. The server
  refreshes 60s before expiry to avoid 401 races.

## Endpoints in this app

| Route | Method | What |
| --- | --- | --- |
| `/api/hmrc/hello` | GET | Phase 1 application probe |
| `/api/hmrc/auth/start` | GET | Builds HMRC authorize URL, sets state cookie, 302s the browser |
| `/api/hmrc/auth/callback` | GET | Verifies state, swaps code for tokens, sets encrypted cookie |
| `/api/hmrc/auth/disconnect` | POST | Clears tokens + state cookies |
| `/api/hmrc/status` | GET | `{ connected, scope, expiresAt, expiresInMs }` — no tokens leaked |
| `/api/hmrc/me` | GET | Calls `/hello/user` with the user's access token; auto-refreshes if near expiry |
