# HMRC Sandbox Integration

This doc covers running easyacco against HMRC's sandbox APIs locally.

## Phases

| Phase | What | Auth flow | Endpoint |
| --- | --- | --- | --- |
| 1 | Connectivity probe | `client_credentials` | `GET /hello/application` |
| 2 | User-delegated login | `authorization_code` | `GET /hello/user` |
| 3a | MTD-IT periodic summary | `authorization_code` | `POST /individuals/business/self-employment/{nino}/{businessId}/period` |
| 3b | MTD-VAT return | `authorization_code` | `POST /organisations/vat/{vrn}/returns` |
| 4 | Validation page + polish | n/a | n/a |

## One-time setup

1. Register a sandbox app at <https://developer.service.hmrc.gov.uk/> →
   **Manage applications** → **Add an application**. Choose **Sandbox**.
2. On the app page, **Subscribe to APIs**:
   - `Hello World` (used by both Phase 1 and Phase 2 probes)
   - `Self Employment Business (MTD)` — Phase 3a
   - `VAT (MTD)` — Phase 3b
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
HMRC_SCOPES=hello write:self-assessment read:vat write:vat
HMRC_COOKIE_SECRET=…
HMRC_VENDOR_PUBLIC_IP=  # optional — public IP of your server; sandbox is lenient
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

### Phase 3a — MTD-IT periodic summary

This phase submits a real quarterly Self-Employment income/expense summary to
HMRC's MTD-IT sandbox. The submission carries all **13 Fraud Prevention
Headers** HMRC requires for a `WEB_APP_VIA_SERVER` connection — HMRC rejects
production submissions without them.

One-time sandbox setup:

1. Developer Hub → **Create Test User** → **Individual** → tick *Self
   Assessment* → click create.
2. HMRC returns a NINO (e.g. `AA999999A`) and a self-employment business id
   (e.g. `XBIS12345678901`). Save these.
3. Make sure your app is subscribed to **Self Employment Business (MTD)**.
4. Add `write:self-assessment` to `HMRC_SCOPES` (already in `.env.example`).
   Disconnect & reconnect so the access token carries the new scope.

Walkthrough:

1. Open <http://localhost:3000/dashboard/hmrc>, scroll to **phase 3a · mtd-it
   submission**.
2. Paste NINO + business id.
3. Pick a period (default `2024-04-06 → 2024-07-05` works for most fresh
   sandbox accounts).
4. Optionally set `Gov-Test-Scenario` to `STATEFUL`, `OVERLAPPING_PERIOD`,
   `DUPLICATE_SUBMISSION`, or any other listed value to drive specific
   sandbox responses.
5. Click **Submit to HMRC**. Expect `[OK]  HMRC accepted → 201`.
6. Expand **fraud prevention headers sent** to see the 13 `Gov-Client-*` /
   `Gov-Vendor-*` headers in the exact format HMRC requires.

Endpoint: `POST /individuals/business/self-employment/{nino}/{businessId}/period`
Scope: `write:self-assessment` · Accept: `application/vnd.hmrc.5.0+json`

### Phase 3b — MTD-VAT return

Same flow as 3a but submits a 9-box VAT return. Use the **Create Test User**
service to create an **Organisation** with the VAT API; that gives you a VRN.

The dashboard auto-derives `totalVatDue` (= sales + acquisitions) and
`netVatDue` (= |totalVatDue − reclaimed|) — HMRC validates both server-side
and returns `VAT_TOTAL_VALUE` / `VAT_NET_VALUE` if they don't match.

Endpoint: `POST /organisations/vat/{vrn}/returns`
Scope: `write:vat` · Accept: `application/vnd.hmrc.1.0+json`

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
| `/api/hmrc/mtd/it/submit` | POST | Phase 3a — submits a Self-Employment periodic summary to MTD-IT with fraud prevention headers |
| `/api/hmrc/mtd/vat/submit` | POST | Phase 3b — submits a VAT return to MTD-VAT with fraud prevention headers |

## Fraud Prevention Headers (Phase 3)

HMRC requires every MTD API call to carry **Gov-Client-*** and **Gov-Vendor-***
headers describing the originating user, device, and software. They are built
by `src/lib/hmrc/fraud-headers.ts`. For a `WEB_APP_VIA_SERVER` connection we
send 13 of the 16 spec headers; three are skipped intentionally:

- **Gov-Client-Multi-Factor** — only required if MFA was used during login;
  Supabase email/password auth without MFA is the documented "missing data"
  case.
- **Gov-Client-Public-Port** — explicitly excluded by the spec when the port
  is 443 (standard HTTPS).
- **Gov-Vendor-License-IDs** — only required when third-party licensed
  software is involved; easyacco has none.

Browser-side data (user agent, screens, window size, timezone, deviceId) is
collected by the dashboard before submission and POSTed in the request body.
The server combines it with server-only data (client IP from
`x-forwarded-for`, vendor IP from `HMRC_VENDOR_PUBLIC_IP`) and emits the
final header set. Headers are surfaced back to the dashboard so you can audit
exactly what HMRC received.
