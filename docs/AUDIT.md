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

> **Status reconciled against code 2026-07-26.** Snapshot: **38 ✅ · 0 🔴 · 0 🟠 ·
> 1 🟡 · 2 ⚪ · 2 🔶** of 43.
>
> This pass closed every remaining code-side finding — SEC-4, PL-1, TAX-4,
> TAX-12, OCR-2 and OCR-3 — and added three rows for things found while doing it:
> DAT-2 (a real data bug, fixed), ENV-1 (the lint config that was hiding it,
> fixed) and ENV-2 (a dev-machine issue, not a repo defect). What is left is not code: SEC-2(b) is a click in the Supabase dashboard,
> AUD-2 is a deliberate follow-up PR, SEC-12 is an owner preference, and MTD-3 is
> calendar time. **Both new migrations are committed but NOT yet applied to prod.**
>
> _Previous reconciliation 2026-07-25: 30 ✅ · 0 🔴 · 2 🟠 · 1 🟡 · 3 ⚪ · 4 🔶 of 40._
>
> The HMRC trio that was deferred pending sandbox access (SEC-7, SEC-10, MTD-2) is
> now closed. Two were real code defects fixed here; SEC-10 turned out to have no
> endpoint to call — HMRC provides no programmatic revoke — so it is resolved by
> clearing our own tokens and telling the user the truth about the remaining grant.
> The fraud headers additionally ship a **live** check against HMRC's Test Fraud
> Prevention Headers API (`fraud-headers.sandbox.test.ts`), which needs sandbox
> credentials to run and is skipped without them — **that run has not happened yet.**
>
> Genuinely-open work is now feature-sized (TAX-4 per-line VAT, PL-1 COGS), one
> decision item (SEC-4, financial figures → Gemini), and MTD-3 (the recognition
> process itself, which is calendar time, not code).

---

## 1. Security & Data Protection

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| SEC-1 | ✅ | `src/lib/auth-shared.ts` | **RESOLVED (verified in code 2026-07-24).** `getCachedUser` no longer uses `unstable_cache`; it is a plain per-request React `cache()` wrapping a validated `getUser()`, with no cross-request caching — so the identity leak is gone. (Original bug: `unstable_cache` keyed on `sb-access-token`, a cookie @supabase/ssr never sets, so the key was constant and the first user's identity was served to every visitor for 60s.) | Done. |
| SEC-2 | 🔶 | `middleware.ts:28`, `src/app/dashboard/layout.tsx:4` | **RLS verified (2026-07-24):** production (`fdhowwrhfuykkxhqfesy`) held only `tax_logs` (RLS on, `auth.uid()=user_id` ✓) — **none of `user_transactions/expenses/invoices/mileage` or `audit_logs` existed**, and 0 migrations were tracked, so server persistence + audit were silently non-functional (all writes fell back to local IndexedDB). A second, empty project (`odffmxqnsdjfswbwrhwx`) is also wired to the repo. A tracked migration (`supabase/migrations/20260724120000_user_data_and_audit_rls.sql`) now creates all five tables with RLS + owner-only policies (validated in a rolled-back transaction, and applied cleanly to the Supabase preview branches); **pending apply to prod.** **Redirect decision:** the original "add a server redirect for `/dashboard/*`" is **intentionally declined** — guest mode is a designed feature (`DashboardShell` shows a "Guest mode — your data is not saved" banner and persists to local IndexedDB only). An unauthenticated request has no `auth.uid()`, so the RLS policies return nothing; guests never touch server data. With SEC-1 fixed and RLS in place, confidentiality no longer depends on a redirect. | Remaining: (a) ✅ **migration applied to prod** (`fdhowwrhfuykkxhqfesy`, easyacco.uk) — migration `20260724120000_user_data_and_audit_rls` is tracked and all five tables (`user_transactions/expenses/invoices/mileage`, `audit_logs`) are live with RLS on (7 real auth users, 0 leaked rows); (b) the stray project `odffmxqnsdjfswbwrhwx` (easyacco) is confirmed **empty** (0 auth users, 0 rows in every table) and **not referenced anywhere in the repo** — safe to delete from the Supabase dashboard (the MCP has no hard-delete; it can only be paused via API). |
| SEC-3 | ✅ | `src/lib/use-user-data.ts` (upsert) | **RESOLVED (verified).** An upsert has no `WHERE` to filter on, but the payload sets `user_id: userId` **after** the spread (`{...item, user_id: userId}`), so a client cannot spoof it, and the migration's RLS `WITH CHECK (auth.uid() = user_id)` rejects any insert/update under another user's id at the DB. Delete path is already `.eq('user_id', …)` scoped (DAT-1). Defence is complete. | Done. |
| SEC-4 | ✅ | `src/lib/acco/context.ts`, `src/app/security/page.tsx` | **RESOLVED — and it was worse than recorded.** The real figures did reach Gemini, *and* `/security` told users the opposite: "Numeric totals, receipt images, and your full ledger are never transmitted." The totals were being transmitted, so the published privacy claim was false. Fixed by data minimisation at the single choke point where user context becomes prompt text (`buildContextPrompt`): ledger-derived money now leaves as a band — `£45,000–£50,000`, never `£47,312.68` — which keeps the advisory signal (proximity to a threshold) while disclosing materially less. Published HMRC thresholds stay exact; they are public constants. The `/security` copy now describes what is actually sent. 11 tests pin it, including that no exact figure appears in the prompt. | Done. Optional future step: a paid data-protected Gemini tier if exact figures are ever wanted back. |
| SEC-5 | ✅ | `next.config.ts` | **RESOLVED (#43).** `headers()` now returns CSP, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` on every route. Verified present in code. | Done. |
| SEC-6 | ✅ | AI routes | **RESOLVED (#43).** `chat` rate-limits per authenticated user (`ai:chat:${user.id}`, 30/min); `categorise` (guest-usable) rate-limits per client IP (60/min) via `src/lib/rate-limit.ts`. Verified in code. | Done. |
| SEC-7 | ✅ | `vat/submit/route.ts`, `it/submit/route.ts`, `src/lib/hmrc/identity.ts` | **RESOLVED.** `Gov-Client-User-IDs` is no longer taken from the request body. It is derived from the Supabase session server-side (`resolveSubmissionUserId()`), and the client's `getOrCreateUserId()` localStorage UUID — which identified nobody and was caller-settable — is deleted. **Behaviour change:** submitting to HMRC now requires an authenticated easyacco session, not just the HMRC OAuth cookie. | Done (validate end-to-end in sandbox). |
| SEC-8 | ✅ | `src/app/api/ai/chat/route.ts` | **RESOLVED (#43).** The chat route now authorizes on `supabase.auth.getUser()` (validated against Supabase's auth server), not `getSession()`. Verified in code. | Done. |
| SEC-9 | ✅ | `.gitignore`, `.env.production` | **RESOLVED.** `.env.production` is untracked (`git rm --cached`) and the `!.env.production` force-include removed, so `.env*` is now ignored except the `.env.example` template. The two public `NEXT_PUBLIC_SUPABASE_*` values must be set as platform secrets (Vercel → Settings → Environment Variables) for production builds. | Done (set the Vercel env vars). |
| SEC-10 | ✅ | `src/app/api/hmrc/auth/disconnect/route.ts` | **RESOLVED — verified there is nothing to call.** HMRC's OAuth publishes no RFC-7009 revocation endpoint; authority is withdrawn by the user through HMRC's *Manage authorised applications* service. Disconnect therefore clears our encrypted token cookie (immediate, and all we control) and returns `manageAuthorityUrl` so the UI states plainly that the grant still stands at HMRC until withdrawn there. No guessed URL was shipped. | Done. |
| SEC-11 | ✅ | `src/app/api/hmrc/auth/callback/route.ts` | **RESOLVED.** The full `missing_params` diagnostic (cookie names, host, referer, query keys) is now logged **server-side only** (`console.error`); the redirect URL carries a generic message, so nothing sensitive lands in the browser address bar/history. | Done. |
| SEC-12 | ⚪ | `src/lib/hmrc/cookies.ts` | **Reviewed — `lax` is intentional, not a bug.** `sameSite: 'strict'` would break the flow: the `state` cookie must survive the cross-site return from HMRC (strict drops it), and the tokens cookie is read on top-level dashboard navigations (strict wouldn't send it on the first request). Both are already `httpOnly` + `secure` in prod. The only safe lever is a shorter TTL, which is a UX↔security tradeoff (forces earlier reconnection) — left as an owner decision. | Optional: shorten token TTL if desired. |
| SEC-13 | ✅ | `src/lib/storage/crypto.ts` | **RESOLVED.** Added an explicit THREAT MODEL note: the device key protects only against a raw on-disk read of the IndexedDB files (stolen/unlocked device, forensic recovery, other OS user) — it is **not** a defence against same-origin script or XSS, since the key lives in the same origin. The passphrase-derived backup key is documented as the separate, genuinely-strong tier. | Done. |

## 2. Data Integrity & Audit Trail

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| DAT-1 | ✅ | `src/lib/use-user-data.ts` | **RESOLVED.** Deletions are no longer inferred from the server/local set-difference. `persist` now derives an explicit delete set from `prev − next` (`diffDeletedIds`), and `syncSupabaseRows` deletes only those ids (intersected with rows that exist server-side), scoped by `.eq('user_id', …)`. A partial/stale local view (2nd tab, failed load, auth race with empty `items`) yields an empty delete set, so it can no longer wipe real server rows. Covered by `src/lib/__tests__/storage-sync.test.ts`. Follow-up (not blocking): a tombstone/soft-delete model would additionally resolve delete-vs-update conflicts across concurrent tabs. | Done. |
| AUD-1 | ✅ | `src/lib/feature-flags.ts`, `src/lib/audit.ts` | **RESOLVED (#43, verified).** `DEFAULTS[FLAG_AUDIT] = true` — the audit trail is now **ON by default** with no env var required, so authed users get a trail out of the box. The `audit_logs` table exists in prod (SEC-2). The flag is retained deliberately as an explicit opt-out (localStorage/env), not as an off-by-default gate. | Done. |
| DAT-2 | ✅ | `src/lib/use-user-data.ts` | **NEW 2026-07-26, found and fixed in the same pass.** `useUserData` called `useRestoreSignal()` but never used the returned tick, so the load effect did not re-run when a backup restore emitted `RESTORE_EVENT` — **restoring from a backup left the restored rows invisible until a manual page refresh.** The effect's own comment already claimed "Load on mount / auth change / restore signal"; the dependency was simply missing. Surfaced by re-enabling a lint rule that had been masked by a misconfigured base rule (ENV-1). | Done. |
| AUD-2 | 🔶 | `src/lib/audit.ts` | **Write reliability RESOLVED; source-of-truth follow-up remains.** The Supabase mirror is no longer fire-and-forget: it is awaited with one retry and, on final failure, reported via `reportError` (never swallowed) — while still never throwing, so an audit-write failure can't block the user's action. The migration keeps `audit_logs` **append-only at the RLS layer** (insert + read own; no update/delete). **Still open:** make the server row the authoritative source (currently local IDB is), e.g. via an RPC/trigger — a larger change deferred to its own PR. | Follow-up: server-authoritative store. |

## 3. Tax-Calculation Correctness

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| TAX-1 | ✅ | `src/lib/tax-logic.ts` (`calcDividendTax`), `tax-scenarios.ts` | **RESOLVED.** `calcDividendTax` now takes `sparePersonalAllowance` and shelters dividends covered by unused PA tax-free, before the £500 nil-rate band. Both call sites (`calculateTax`, `calcScenario5`) compute and pass it. e.g. £6k profit + £15k divs now taxes £7,930 (was £14,500). Regression tests added; engine-parity suite still green. | Done. |
| TAX-2 | ✅ | `src/lib/tax-logic.ts`, `tax-scenarios.ts` | **RESOLVED.** Class 4 NI is now charged on `grossProfit` (pre-pension) in both engines — a personal SIPP gets relief at source and does not reduce the NIC base. Income tax still uses the post-pension base, so pension relief is intact. Regression tests added. (Class 1 modelling left unchanged — out of scope.) | Done. |
| TAX-3 | ✅ | `src/lib/formatters.ts` | **RESOLVED.** `fmtDec`/`fmtDecAbs` now set `maximumFractionDigits: 2` alongside the minimum, so money always renders at exactly 2dp (no more `£119.988`). | Done. |
| TAX-4 | ✅ | `src/lib/hooks/useInvoices.ts`, `src/lib/validators.ts`, `src/features/invoices/*` | **RESOLVED.** `vat: boolean` could only express standard-rated 20%: reduced-rate work was overcharged by 15 points and zero/exempt/reverse-charge had no representation. Added `vatTreatment` (`standard` \| `reduced` \| `zero` \| `exempt` \| `reverse_charge` \| `none`) with `VAT_RATES`, `vatAmount`, `vatRate` and a treatment selector on the invoice form. Critically, `isTaxableSupply` carries the distinction a boolean destroys: zero-rated and reverse-charge charge £0 but **are** taxable turnover on a VAT return, exempt is outside the scope — identical totals, different returns. Migration `20260726091000` adds the column nullable; legacy rows derive from the old boolean (true→standard, false→none) so no total moves, and the boolean is kept in step for new rows so a rollback cannot lose data. 14 tests. | Done. Note: still one treatment per invoice, not per line item — the invoice model has a single amount, so true multi-line invoicing remains a separate feature. |
| TAX-5 | ✅ | `src/lib/tax/bands-2026.ts` | **RESOLVED.** All constants reconciled against the owner's 2026/27 rate research (see gov.uk source tags in the file): dividend `10.75%/35.75%/39.35%`, Class 2 `£3.65/wk` + SPT `£7,105`, and all six Scottish bands match. Student Loan Plan 2 confirmed with HMRC at **£29,385/yr** (the doc's "£27,295" was a stale example). Source citations added to `bands-2026.ts`. | Done. Still unverified by that doc (no data present): mileage rates, marriage/blind allowances, redundancy £30k, SL Plans 1/4/5/PG. |
| TAX-6 | ✅ | `src/lib/tax-logic.ts` (`calcStudentLoan`) | **RESOLVED.** Student-loan repayment now uses `Math.floor` — HMRC floors repayments to whole pounds (the pence are never collected), so `round2` over-collected by up to 99p. | Done. |
| TAX-7 | ✅ | `src/lib/tax-scenarios.ts` (`calcScenario3`) | **RESOLVED.** Scenario 3 NI is charged on the earned `otherIncome` only. JSA and Carer's Allowance are taxable benefits, not earnings, so they no longer inflate the NI base. | Done. |
| TAX-8 | ✅ | `src/lib/tax-logic.ts`, `features/tax/*` | **RESOLVED.** Added a `marriageAllowanceRole` (`transferor` \| `recipient`). Transferor keeps the −£1,260 PA behaviour; recipient keeps full PA and gets a £252 (20% × £1,260) tax reducer, capped at tax due and **denied to higher-/additional-rate payers** (rUK >20%, Scotland >21%). The calculator UI shows a role selector when Marriage Allowance is ticked. Regression tests cover both paths, the cap, and Scottish eligibility. | Done. |
| TAX-9 | ✅ | `src/lib/tax-logic.ts` (`calcScotlandTax`) | **RESOLVED.** Scottish bands are now fixed WIDTHS applied to taxable income from £0 (mirroring `calcRukTax`), measured against the actual PA rather than the hardcoded £12,570. A tapered (>£100k) or blind-adjusted PA no longer leaves a slice of income in no band. Regression tests assert every taxable pound is banded and lock the £120k figure. | Done. |
| TAX-10 | ✅ | `src/lib/tax-logic.ts`, `tax-scenarios.ts` | **RESOLVED (rUK; Scotland documented).** rUK SIPP relief is now RELIEF AT SOURCE — the gross contribution tops up the pot at 20% and extends the basic-rate band for higher-rate relief (`calcRukTax`/`calcDividendTax` take a band extension), instead of a flat income deduction. The annual allowance is TAPERED £60k→£10k (`annualAllowance()`, gated on threshold income >£200k **and** adjusted income >£260k, £10k floor) with the £10k MPAA for flexibly-accessed pots (new `flexiblyAccessedPension` input + UI toggle). The engine exposes `pensionReliefAtSource`/`pensionNetCost`/`annualAllowance`, and the five scenario wrappers agree with the engine across the full parity matrix. **Scottish** relief keeps the simpler marginal deduction — a documented simplification (Scottish RAS band mechanics are subtler). | Done for rUK; Scotland deduction noted. |
| TAX-11 | ✅ | `src/lib/tax-logic.ts` | **RESOLVED.** Validation no longer blocks `expenses ≥ revenue` (only negative or oversized figures are rejected), and `calculateTax` keeps the signed `grossProfit` so a trading loss is reported as negative profit. Every downstream tax/NIC base already floors at 0, so a loss year correctly yields zero tax. | Done. |
| TAX-12 | ✅ | `src/lib/tax-logic.ts` | **RESOLVED.** `round2` computed `Math.round(n * 100) / 100`; in binary floating point `1.005 * 100` is `100.49999999999999`, so an exact half-penny rounded *down* — 1.005→1.00, 8.165→8.16, 10.075→10.07, each a penny light against a hand calculation. Rounding now shifts the decimal point through the number's own string form, avoiding the lossy multiply, and is symmetric about zero (−2.675→−2.68, mirroring +2.675) where `Math.round` broke ties toward +∞. 8 regression tests; no movement anywhere in the engine's existing suite. | Done. A full integer-pence or decimal-library rewrite remains possible but is no longer needed for correctness at 2dp. |
| TAX-13 | ✅ | `src/lib/tax-logic.ts:1` | **RESOLVED.** The "Audit complete… all correct" header is replaced with an honest "estimator, not a substitute for HMRC" note. With TAX-8 and TAX-10 now resolved, the header documents the one remaining simplification: Scottish SIPP relief modelled as a marginal deduction. | Done. |

## 4. Accounting Logic (P&L / reports)

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| PL-1 | ✅ | `src/lib/transactions/cost-category.ts`, `pnl/page.tsx`, `transactions/page.tsx` | **RESOLVED.** Gross profit and margin were derived by keyword-matching free text, which is wrong in both directions — "Office materials" is an overhead that matches, "Tiles for the Hendry job" is a direct cost that does not. The tell was the Add-COGS form: it prefixed `COGS — ` onto the user's description so the matcher would find the row later, i.e. the classification lived inside the prose. Transactions now carry `cost_category` (`cost_of_sales` \| `operating`), set by a selector on the entry form and written directly by the COGS form (prefix hack removed). Migration `20260726090000` adds the column nullable; rows predating it keep NULL and are still read through the old heuristic, so **no historical figure moves**. The P&L reports how many rows are still inferred and points at where to fix them. 7 tests. | Done. |
| PL-2 | ✅ | `src/app/dashboard/pnl/page.tsx` | **RESOLVED.** The visible line already read "PROFIT BEFORE TAX"; the internal variable and the JSON-export key were still `ebitda` (the same mislabel) — both renamed to `profitBeforeTax`. No figure is called EBITDA anywhere now. | Done. |
| PL-3 | ✅ | `src/app/dashboard/pnl/page.tsx` (`buildMonthly`) | **RESOLVED.** Monthly chart now buckets by **year + month** and sorts chronologically, so different years never collapse into one bar; the label carries a 2-digit year suffix only when the data spans multiple years. Invalid dates are skipped. | Done. |
| PL-4 | ✅ | `src/app/dashboard/pnl/page.tsx` | **RESOLVED.** The tax figures are labelled "Tax provision (indicative)" / "TAX PROVISION"; no "HMRC-compliant" / "HMRC liability" overclaim remains. Verified in code. | Done. |
| PL-5 | ✅ | `src/app/dashboard/pnl/page.tsx` | **RESOLVED.** The MTD ITSA date is a `MTD_ITSA_MANDATION` constant, rendered as a future deadline (localised long date) or, once passed, as "MTD ITSA is now mandatory — register with HMRC". No stale hardcoded past date. | Done. |

## 5. Receipt Scanner (OCR)

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| OCR-1 | ✅ | `src/components/ReceiptScanner.tsx` | **RESOLVED (dropped the claim).** `accept` is now `image/*` only and the label reads "Tap to choose a photo of your receipt"; a guard in `handleFile` rejects any non-image (e.g. a drag-dropped PDF) with a clear message instead of a cryptic tesseract failure. (Client-side PDF→image conversion would need a new dependency — not taken.) | Done. |
| OCR-2 | ✅ | `src/components/ReceiptScanner.tsx`, `ReceiptVerifyModal.tsx` | **RESOLVED.** `parseReceipt` now reports how it got the amount — `labelled` (read off a line naming itself "Total"/"Amount due"), `guessed` (fell back to the largest money-shaped number, which frequently picks up cash tendered or a loyalty balance), or `none`. The verify modal shows an amber caution on a guess explaining exactly what it might have picked up, so the user confirms rather than inherits it. | Done. |
| OCR-3 | ✅ | `src/components/ReceiptScanner.tsx`, `ReceiptVerifyModal.tsx` | **RESOLVED.** A numeric date was always read day-first, so a US-format receipt was booked into the wrong month silently. When both components are 1–12 and differ, the parser returns the interpretation it did **not** pick as `dateAlternative`, and the modal offers it as a one-click swap. Equal parts (07/07) and unambiguous forms (ISO, named month, day > 12) correctly offer nothing. Covered with OCR-2 by 10 tests. | Done. |
| OCR-✅ | — | `:203` | "Runs client-side. Nothing is uploaded." is **true** — good, honest. | — |

## 6. HMRC MTD

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| MTD-1 | ✅ | `src/app/api/ai/chat/route.ts` | **RESOLVED (#43, verified).** `MODEL = 'gemini-2.5-flash'` in both the chat and categorise routes — the retired `gemini-1.5-flash` is gone. | Done. |
| MTD-2 | ✅ | `src/lib/hmrc/fraud-headers.ts` | **RESOLVED.** Two real defects fixed: (1) `Gov-Client-Public-IP-Timestamp` was stamped when the headers were built — after a possible token-refresh round-trip — so it drifted from when the IP was actually observed; `observeClient(req)` is now the first statement in both submit handlers. (2) `extractClientIp` took the **leftmost** `X-Forwarded-For` entry, which the caller supplies and can forge — it now counts in from the right by `HMRC_TRUSTED_PROXY_HOPS` (default 1, Vercel's edge). A live check against HMRC's Test Fraud Prevention Headers API ships as `fraud-headers.sandbox.test.ts` (skipped without credentials). | Done in code; run the sandbox spec to confirm against HMRC. |
| MTD-3 | 🟡 | process | MTD recognition is a multi-step process (sandbox test scenarios, production-credential application, fraud-header validation), not a same-day approval. | Plan for iteration before the deadline. |

## 7. Tooling & environment

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| ENV-1 | ✅ | `eslint.config.mjs`, `.gitattributes` | **NEW 2026-07-26.** Two things made the lint gate useless locally, which is why DAT-2 sat unnoticed. (1) The base `no-unused-vars` rule was enabled alongside the TypeScript-aware one; it cannot read TS function-type parameters, so every signature like `(v: string) => void` was reported as an unused variable — ~57 of 69 warnings were noise. (2) `core.autocrlf=true` with no `.gitattributes` handed prettier CRLF working-tree files, producing **~23.5k phantom `Delete ␍` errors**. (CI was unaffected: the committed blobs are LF, so Linux checkouts lint clean — this was a dev-machine-only failure.) Base rule now off, `@typescript-eslint/no-unused-vars` owns the check with an `^_` ignore pattern, `.gitattributes` pins `eol=lf`. Local lint went 23,608 problems → **0**, and the real findings underneath were fixed. | Done. |
| ENV-2 | ⚪ | `node_modules/` (developer machine) | **NEW 2026-07-26. Not a repo defect — flagged so it is not re-diagnosed as one.** The project lives under `OneDrive/Desktop`, so OneDrive dehydrates `node_modules` files to cloud placeholders it cannot always rehydrate. Reads then fail with `UNKNOWN: unknown error, read`, which surfaced as a phantom vitest suite failure and two failed `next build` runs (`debug`, `ws`) that look exactly like code errors. Recovered by reinstalling. | Exclude `node_modules` from OneDrive sync, or move the repo outside the OneDrive folder. |

## 8. Things that are genuinely good (keep / cite)
- HMRC OAuth: CSRF `state` with `timingSafeEqual`, AES-256-GCM token encryption (`hmrc/crypto.ts`). ✅
- Zod validation on AI routes (`api/ai/schemas.ts`). ✅
- Backup codec: PBKDF2 310k iterations, schema-validated restore (`storage/backup.ts`). ✅
- CSV-injection defence in SA103 export (`pnl/page.tsx:256`). ✅
- Comprehensive HMRC error mapping (`hmrc/mtd-errors.ts`). ✅
- Single-source-of-truth constants, full TypeScript, real Vitest suite. ✅

---

## What is actually left (2026-07-26)

Every code-side finding is closed. The remainder is not code:

1. **Apply the two new migrations to prod** (`fdhowwrhfuykkxhqfesy`) —
   `20260726090000_transaction_cost_category` and
   `20260726091000_invoice_vat_treatment`. Both are additive and nullable, so
   applying them moves no existing figure. Until they are applied, the new
   `cost_category` / `vatTreatment` values cannot round-trip to the server for
   signed-in users and will live only in local IndexedDB.
2. **SEC-2(b)** — delete the confirmed-empty stray Supabase project
   `odffmxqnsdjfswbwrhwx` from the dashboard. Owner action; the MCP cannot
   hard-delete.
3. **MTD-2 sandbox run** — `fraud-headers.sandbox.test.ts` is written and skips
   without credentials. It has still never been run against HMRC.
4. **AUD-2** — make the server row the authoritative audit store. A deliberate
   follow-up PR, not a gap.
5. **SEC-12** — shorten the HMRC token TTL if wanted. Owner preference.
6. **MTD-3** — HMRC recognition is calendar time, not code.
7. **TAX-5 residue** — mileage rates, marriage/blind allowances, redundancy £30k
   and SL Plans 1/4/5/PG are still unverified against a primary source.
8. **ENV-2** — get `node_modules` out of OneDrive on the dev machine.
