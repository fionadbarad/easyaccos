# EasyAcco — Code Audit Register

_Full-codebase review. Every finding has an ID, severity, location, the problem, and
the fix direction. Work top-down: 🔴 blockers first._

**Severity key**
- 🔴 **Critical** — wrong financial output, data loss, or a data-protection incident. Blocks real users.
- 🟠 **High** — wrong in common cases, or missing security hardening.
- 🟡 **Medium** — fragile, misleading, or a compliance gap.
- ⚪ **Low** — hygiene / polish.
- ✅ **Resolved** · 🔶 **In progress** — partially addressed; see the row for what remains.

> Scope note: files under `src/app/dashboard/transactions`, `/expenses`, the tax **UI**
> components, `InvoiceForm/Row`, `learn`, and `settings` had a lighter pass. The Supabase
> **RLS policies** (which several findings depend on) could not be inspected from the code and
> **must be verified in the Supabase dashboard**.

> **Status reconciled against code 2026-07-25.** Several rows were stale — statuses
> below now match what the code actually does (each ✅ says how it was verified or
> which PR resolved it). Snapshot: **26 ✅ · 0 🔴 · 4 🟠 · 3 🟡 · 3 ⚪ · 4 🔶** of 40.
> Genuinely-open work is now feature-sized or HMRC/compliance-sensitive (see the
> `🔶`/severity rows), plus one decision item (SEC-4, financial figures → Gemini).

---

## 1. Security & Data Protection

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| SEC-1 | ✅ | `src/lib/auth-shared.ts` | **RESOLVED (verified in code 2026-07-24).** `getCachedUser` no longer uses `unstable_cache`; it is a plain per-request React `cache()` wrapping a validated `getUser()`, with no cross-request caching — so the identity leak is gone. (Original bug: `unstable_cache` keyed on `sb-access-token`, a cookie @supabase/ssr never sets, so the key was constant and the first user's identity was served to every visitor for 60s.) | Done. |
| SEC-2 | 🔶 | `middleware.ts:28`, `src/app/dashboard/layout.tsx:4` | **RLS verified (2026-07-24):** production (`fdhowwrhfuykkxhqfesy`) held only `tax_logs` (RLS on, `auth.uid()=user_id` ✓) — **none of `user_transactions/expenses/invoices/mileage` or `audit_logs` existed**, and 0 migrations were tracked, so server persistence + audit were silently non-functional (all writes fell back to local IndexedDB). A second, empty project (`odffmxqnsdjfswbwrhwx`) is also wired to the repo. A tracked migration (`supabase/migrations/20260724120000_user_data_and_audit_rls.sql`) now creates all five tables with RLS + owner-only policies (validated in a rolled-back transaction, and applied cleanly to the Supabase preview branches); **pending apply to prod.** **Redirect decision:** the original "add a server redirect for `/dashboard/*`" is **intentionally declined** — guest mode is a designed feature (`DashboardShell` shows a "Guest mode — your data is not saved" banner and persists to local IndexedDB only). An unauthenticated request has no `auth.uid()`, so the RLS policies return nothing; guests never touch server data. With SEC-1 fixed and RLS in place, confidentiality no longer depends on a redirect. | Remaining: (a) ✅ **migration applied to prod** (`fdhowwrhfuykkxhqfesy`, easyacco.uk) — migration `20260724120000_user_data_and_audit_rls` is tracked and all five tables (`user_transactions/expenses/invoices/mileage`, `audit_logs`) are live with RLS on (7 real auth users, 0 leaked rows); (b) the stray project `odffmxqnsdjfswbwrhwx` (easyacco) is confirmed **empty** (0 auth users, 0 rows in every table) and **not referenced anywhere in the repo** — safe to delete from the Supabase dashboard (the MCP has no hard-delete; it can only be paused via API). |
| SEC-3 | ✅ | `src/lib/use-user-data.ts` (upsert) | **RESOLVED (verified).** An upsert has no `WHERE` to filter on, but the payload sets `user_id: userId` **after** the spread (`{...item, user_id: userId}`), so a client cannot spoof it, and the migration's RLS `WITH CHECK (auth.uid() = user_id)` rejects any insert/update under another user's id at the DB. Delete path is already `.eq('user_id', …)` scoped (DAT-1). Defence is complete. | Done. |
| SEC-4 | 🟠 | `src/app/api/ai/chat/route.ts:195` + `src/lib/acco/context.ts` | The user's **real financial figures** (estimated profit, tax liability, YTD expenses, tax band) are injected into the prompt sent to **Google Gemini**. No disclosed DPA / consent / privacy-policy line. GDPR exposure; free-tier Gemini may retain data. | Use a data-protected (paid) tier, disclose in privacy policy, get consent, or strip figures from the prompt. |
| SEC-5 | ✅ | `next.config.ts` | **RESOLVED (#43).** `headers()` now returns CSP, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` on every route. Verified present in code. | Done. |
| SEC-6 | ✅ | AI routes | **RESOLVED (#43).** `chat` rate-limits per authenticated user (`ai:chat:${user.id}`, 30/min); `categorise` (guest-usable) rate-limits per client IP (60/min) via `src/lib/rate-limit.ts`. Verified in code. | Done. |
| SEC-7 | 🟠 | `vat/submit/route.ts`, `it/submit/route.ts` | **Still open — deferred deliberately.** Submissions still take a client `userId` for `Gov-Client-User-IDs`. The correct fix (derive it from the Supabase session) needs a product decision — HMRC submission is currently gated only by the HMRC OAuth cookie, so requiring a Supabase session changes access control, and switching the fraud-header value risks HMRC's cross-submission consistency checks. Wants sandbox validation, not a blind edit. | Derive `userId` server-side; validate against HMRC sandbox. |
| SEC-8 | ✅ | `src/app/api/ai/chat/route.ts` | **RESOLVED (#43).** The chat route now authorizes on `supabase.auth.getUser()` (validated against Supabase's auth server), not `getSession()`. Verified in code. | Done. |
| SEC-9 | ✅ | `.gitignore`, `.env.production` | **RESOLVED.** `.env.production` is untracked (`git rm --cached`) and the `!.env.production` force-include removed, so `.env*` is now ignored except the `.env.example` template. The two public `NEXT_PUBLIC_SUPABASE_*` values must be set as platform secrets (Vercel → Settings → Environment Variables) for production builds. | Done (set the Vercel env vars). |
| SEC-10 | 🟡 | `src/app/api/hmrc/auth/disconnect/route.ts` | **Still open — deferred deliberately.** Disconnect still only clears cookies. HMRC's MTD OAuth is not confirmed to expose an RFC-7009 token-revoke endpoint, so I won't ship a guessed URL — this needs verification against HMRC's Developer Hub before implementing (best-effort revoke + clear cookies). | Verify HMRC revoke endpoint, then call it on disconnect. |
| SEC-11 | ✅ | `src/app/api/hmrc/auth/callback/route.ts` | **RESOLVED.** The full `missing_params` diagnostic (cookie names, host, referer, query keys) is now logged **server-side only** (`console.error`); the redirect URL carries a generic message, so nothing sensitive lands in the browser address bar/history. | Done. |
| SEC-12 | ⚪ | `src/lib/hmrc/cookies.ts` | **Reviewed — `lax` is intentional, not a bug.** `sameSite: 'strict'` would break the flow: the `state` cookie must survive the cross-site return from HMRC (strict drops it), and the tokens cookie is read on top-level dashboard navigations (strict wouldn't send it on the first request). Both are already `httpOnly` + `secure` in prod. The only safe lever is a shorter TTL, which is a UX↔security tradeoff (forces earlier reconnection) — left as an owner decision. | Optional: shorten token TTL if desired. |
| SEC-13 | ✅ | `src/lib/storage/crypto.ts` | **RESOLVED.** Added an explicit THREAT MODEL note: the device key protects only against a raw on-disk read of the IndexedDB files (stolen/unlocked device, forensic recovery, other OS user) — it is **not** a defence against same-origin script or XSS, since the key lives in the same origin. The passphrase-derived backup key is documented as the separate, genuinely-strong tier. | Done. |

## 2. Data Integrity & Audit Trail

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| DAT-1 | ✅ | `src/lib/use-user-data.ts` | **RESOLVED.** Deletions are no longer inferred from the server/local set-difference. `persist` now derives an explicit delete set from `prev − next` (`diffDeletedIds`), and `syncSupabaseRows` deletes only those ids (intersected with rows that exist server-side), scoped by `.eq('user_id', …)`. A partial/stale local view (2nd tab, failed load, auth race with empty `items`) yields an empty delete set, so it can no longer wipe real server rows. Covered by `src/lib/__tests__/storage-sync.test.ts`. Follow-up (not blocking): a tombstone/soft-delete model would additionally resolve delete-vs-update conflicts across concurrent tabs. | Done. |
| AUD-1 | ✅ | `src/lib/feature-flags.ts`, `src/lib/audit.ts` | **RESOLVED (#43, verified).** `DEFAULTS[FLAG_AUDIT] = true` — the audit trail is now **ON by default** with no env var required, so authed users get a trail out of the box. The `audit_logs` table exists in prod (SEC-2). The flag is retained deliberately as an explicit opt-out (localStorage/env), not as an off-by-default gate. | Done. |
| AUD-2 | 🔶 | `src/lib/audit.ts` | **Write reliability RESOLVED; source-of-truth follow-up remains.** The Supabase mirror is no longer fire-and-forget: it is awaited with one retry and, on final failure, reported via `reportError` (never swallowed) — while still never throwing, so an audit-write failure can't block the user's action. The migration keeps `audit_logs` **append-only at the RLS layer** (insert + read own; no update/delete). **Still open:** make the server row the authoritative source (currently local IDB is), e.g. via an RPC/trigger — a larger change deferred to its own PR. | Follow-up: server-authoritative store. |

## 3. Tax-Calculation Correctness

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| TAX-1 | ✅ | `src/lib/tax-logic.ts` (`calcDividendTax`), `tax-scenarios.ts` | **RESOLVED.** `calcDividendTax` now takes `sparePersonalAllowance` and shelters dividends covered by unused PA tax-free, before the £500 nil-rate band. Both call sites (`calculateTax`, `calcScenario5`) compute and pass it. e.g. £6k profit + £15k divs now taxes £7,930 (was £14,500). Regression tests added; engine-parity suite still green. | Done. |
| TAX-2 | ✅ | `src/lib/tax-logic.ts`, `tax-scenarios.ts` | **RESOLVED.** Class 4 NI is now charged on `grossProfit` (pre-pension) in both engines — a personal SIPP gets relief at source and does not reduce the NIC base. Income tax still uses the post-pension base, so pension relief is intact. Regression tests added. (Class 1 modelling left unchanged — out of scope.) | Done. |
| TAX-3 | ✅ | `src/lib/formatters.ts` | **RESOLVED.** `fmtDec`/`fmtDecAbs` now set `maximumFractionDigits: 2` alongside the minimum, so money always renders at exactly 2dp (no more `£119.988`). | Done. |
| TAX-4 | 🔶 | `src/lib/hooks/useInvoices.ts` | **Rounding RESOLVED; per-line treatments remain.** `vatTotal` now rounds to whole pence (`Math.round(amount * 1.2 * 100)/100`), so the wrong-output/sub-penny bug is gone. **Still open:** support VAT rate/treatment per line (zero/reduced/exempt/reverse-charge) — that needs an `Invoice` schema change (`vat: boolean` → a treatment field), a DB migration, and form UI. A feature, deferred to its own PR. | Follow-up: per-line VAT treatment. |
| TAX-5 | ✅ | `src/lib/tax/bands-2026.ts` | **RESOLVED.** All constants reconciled against the owner's 2026/27 rate research (see gov.uk source tags in the file): dividend `10.75%/35.75%/39.35%`, Class 2 `£3.65/wk` + SPT `£7,105`, and all six Scottish bands match. Student Loan Plan 2 confirmed with HMRC at **£29,385/yr** (the doc's "£27,295" was a stale example). Source citations added to `bands-2026.ts`. | Done. Still unverified by that doc (no data present): mileage rates, marriage/blind allowances, redundancy £30k, SL Plans 1/4/5/PG. |
| TAX-6 | ✅ | `src/lib/tax-logic.ts` (`calcStudentLoan`) | **RESOLVED.** Student-loan repayment now uses `Math.floor` — HMRC floors repayments to whole pounds (the pence are never collected), so `round2` over-collected by up to 99p. | Done. |
| TAX-7 | ✅ | `src/lib/tax-scenarios.ts` (`calcScenario3`) | **RESOLVED.** Scenario 3 NI is charged on the earned `otherIncome` only. JSA and Carer's Allowance are taxable benefits, not earnings, so they no longer inflate the NI base. | Done. |
| TAX-8 | ✅ | `src/lib/tax-logic.ts`, `features/tax/*` | **RESOLVED.** Added a `marriageAllowanceRole` (`transferor` \| `recipient`). Transferor keeps the −£1,260 PA behaviour; recipient keeps full PA and gets a £252 (20% × £1,260) tax reducer, capped at tax due and **denied to higher-/additional-rate payers** (rUK >20%, Scotland >21%). The calculator UI shows a role selector when Marriage Allowance is ticked. Regression tests cover both paths, the cap, and Scottish eligibility. | Done. |
| TAX-9 | ✅ | `src/lib/tax-logic.ts` (`calcScotlandTax`) | **RESOLVED.** Scottish bands are now fixed WIDTHS applied to taxable income from £0 (mirroring `calcRukTax`), measured against the actual PA rather than the hardcoded £12,570. A tapered (>£100k) or blind-adjusted PA no longer leaves a slice of income in no band. Regression tests assert every taxable pound is banded and lock the £120k figure. | Done. |
| TAX-10 | 🟠 | `src/lib/tax-logic.ts:437, 619` | Pension modelled as a flat income deduction; real SIPP relief is relief-at-source + basic-rate band extension. Missing tapered annual allowance (£60k→£10k) and MPAA. | Implement band-extension relief + tapered AA. |
| TAX-11 | ✅ | `src/lib/tax-logic.ts` | **RESOLVED.** Validation no longer blocks `expenses ≥ revenue` (only negative or oversized figures are rejected), and `calculateTax` keeps the signed `grossProfit` so a trading loss is reported as negative profit. Every downstream tax/NIC base already floors at 0, so a loss year correctly yields zero tax. | Done. |
| TAX-12 | ⚪ | `src/lib/tax-logic.ts:165` | Money held as float; `round2` (`Math.round`) misrounds edge cases (`2.675`). | Move to integer-pence or a decimal library. |
| TAX-13 | ✅ | `src/lib/tax-logic.ts:1` | **RESOLVED.** The "Audit complete… all correct" header is replaced with an honest "estimator, not a substitute for HMRC" note that lists the remaining known simplifications (TAX-8, TAX-10). | Done. |

## 4. Accounting Logic (P&L / reports)

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| PL-1 | 🟠 | `src/app/dashboard/pnl/page.tsx` | **Still open.** Cost of Sales is still guessed by keyword-matching the description text. A proper fix needs a real COGS/category field on the transaction model (schema + entry UI) — a feature deferred to its own PR, not a quick edit. | Classify COGS from a real category field, not free text. |
| PL-2 | ✅ | `src/app/dashboard/pnl/page.tsx` | **RESOLVED.** The visible line already read "PROFIT BEFORE TAX"; the internal variable and the JSON-export key were still `ebitda` (the same mislabel) — both renamed to `profitBeforeTax`. No figure is called EBITDA anywhere now. | Done. |
| PL-3 | ✅ | `src/app/dashboard/pnl/page.tsx` (`buildMonthly`) | **RESOLVED.** Monthly chart now buckets by **year + month** and sorts chronologically, so different years never collapse into one bar; the label carries a 2-digit year suffix only when the data spans multiple years. Invalid dates are skipped. | Done. |
| PL-4 | ✅ | `src/app/dashboard/pnl/page.tsx` | **RESOLVED.** The tax figures are labelled "Tax provision (indicative)" / "TAX PROVISION"; no "HMRC-compliant" / "HMRC liability" overclaim remains. Verified in code. | Done. |
| PL-5 | ✅ | `src/app/dashboard/pnl/page.tsx` | **RESOLVED.** The MTD ITSA date is a `MTD_ITSA_MANDATION` constant, rendered as a future deadline (localised long date) or, once passed, as "MTD ITSA is now mandatory — register with HMRC". No stale hardcoded past date. | Done. |

## 5. Receipt Scanner (OCR)

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| OCR-1 | ✅ | `src/components/ReceiptScanner.tsx` | **RESOLVED (dropped the claim).** `accept` is now `image/*` only and the label reads "Tap to choose a photo of your receipt"; a guard in `handleFile` rejects any non-image (e.g. a drag-dropped PDF) with a clear message instead of a cryptic tesseract failure. (Client-side PDF→image conversion would need a new dependency — not taken.) | Done. |
| OCR-2 | 🔶 | `src/components/ReceiptScanner.tsx` | **Partially done.** The parser now prefers `total`/`amount due`/`grand total`-labelled lines and only falls back to `Math.max(...allNums)` as a last resort. **Still open:** surface a low-confidence flag for user confirmation when it had to fall back. | Follow-up: low-confidence UX. |
| OCR-3 | ⚪ | `src/components/ReceiptScanner.tsx` | **Still open.** Date parse assumes DD/MM/YYYY; ambiguous US-format dates (both parts ≤ 12) still parse silently. Needs a confirm-with-user UX step. | Confirm ambiguous dates with the user. |
| OCR-✅ | — | `:203` | "Runs client-side. Nothing is uploaded." is **true** — good, honest. | — |

## 6. HMRC MTD

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| MTD-1 | ✅ | `src/app/api/ai/chat/route.ts` | **RESOLVED (#43, verified).** `MODEL = 'gemini-2.5-flash'` in both the chat and categorise routes — the retired `gemini-1.5-flash` is gone. | Done. |
| MTD-2 | 🟡 | `src/lib/hmrc/fraud-headers.ts` | **Still open — deferred deliberately.** These are HMRC fraud-prevention headers validated by HMRC's checker; getting the IP-observation timestamp and trusted-proxy XFF handling wrong fails real submissions. Wants validation against HMRC's "Test Fraud Prevention Headers" API, not a blind edit — best done in a focused HMRC PR alongside SEC-7/SEC-10. | Capture IP-observation time; trust XFF only from known proxies; validate with HMRC's checker. |
| MTD-3 | 🟡 | process | MTD recognition is a multi-step process (sandbox test scenarios, production-credential application, fraud-header validation), not a same-day approval. | Plan for iteration before the deadline. |

## 7. Things that are genuinely good (keep / cite)
- HMRC OAuth: CSRF `state` with `timingSafeEqual`, AES-256-GCM token encryption (`hmrc/crypto.ts`). ✅
- Zod validation on AI routes (`api/ai/schemas.ts`). ✅
- Backup codec: PBKDF2 310k iterations, schema-validated restore (`storage/backup.ts`). ✅
- CSV-injection defence in SA103 export (`pnl/page.tsx:256`). ✅
- Comprehensive HMRC error mapping (`hmrc/mtd-errors.ts`). ✅
- Single-source-of-truth constants, full TypeScript, real Vitest suite. ✅

---

## Suggested order of work
1. **Investor-demo safety (hours):** MTD-1 (dead AI), TAX-3 (money decimals), PL-2 (EBITDA label).
2. **Real-user legal floor (days):** SEC-1, SEC-2 (+ verify RLS), DAT-1, AUD-1/AUD-2, SEC-4.
3. **Tax correctness (owner + dev):** TAX-5 (verify rates) → TAX-1, TAX-2, TAX-6, TAX-7.
4. **Security hardening:** SEC-3, SEC-5, SEC-6, SEC-7.
5. **HMRC application:** TAX-5 done, MTD-2, run sandbox scenarios.
