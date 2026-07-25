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

---

## 1. Security & Data Protection

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| SEC-1 | ✅ | `src/lib/auth-shared.ts` | **RESOLVED (verified in code 2026-07-24).** `getCachedUser` no longer uses `unstable_cache`; it is a plain per-request React `cache()` wrapping a validated `getUser()`, with no cross-request caching — so the identity leak is gone. (Original bug: `unstable_cache` keyed on `sb-access-token`, a cookie @supabase/ssr never sets, so the key was constant and the first user's identity was served to every visitor for 60s.) | Done. |
| SEC-2 | 🔶 | `middleware.ts:28`, `src/app/dashboard/layout.tsx:4` | **RLS verified (2026-07-24):** production (`fdhowwrhfuykkxhqfesy`) held only `tax_logs` (RLS on, `auth.uid()=user_id` ✓) — **none of `user_transactions/expenses/invoices/mileage` or `audit_logs` existed**, and 0 migrations were tracked, so server persistence + audit were silently non-functional (all writes fell back to local IndexedDB). A second, empty project (`odffmxqnsdjfswbwrhwx`) is also wired to the repo. A tracked migration (`supabase/migrations/20260724120000_user_data_and_audit_rls.sql`) now creates all five tables with RLS + owner-only policies (validated in a rolled-back transaction, and applied cleanly to the Supabase preview branches); **pending apply to prod.** **Redirect decision:** the original "add a server redirect for `/dashboard/*`" is **intentionally declined** — guest mode is a designed feature (`DashboardShell` shows a "Guest mode — your data is not saved" banner and persists to local IndexedDB only). An unauthenticated request has no `auth.uid()`, so the RLS policies return nothing; guests never touch server data. With SEC-1 fixed and RLS in place, confidentiality no longer depends on a redirect. | Remaining: (a) ✅ **migration applied to prod** (`fdhowwrhfuykkxhqfesy`, easyacco.uk) — migration `20260724120000_user_data_and_audit_rls` is tracked and all five tables (`user_transactions/expenses/invoices/mileage`, `audit_logs`) are live with RLS on (7 real auth users, 0 leaked rows); (b) the stray project `odffmxqnsdjfswbwrhwx` (easyacco) is confirmed **empty** (0 auth users, 0 rows in every table) and **not referenced anywhere in the repo** — safe to delete from the Supabase dashboard (the MCP has no hard-delete; it can only be paused via API). |
| SEC-3 | 🟠 | `src/lib/use-user-data.ts` (upsert) | Partially addressed: the `.delete()` is now scoped by `.eq('user_id', userId)` (done alongside DAT-1). The `.upsert()` still relies on RLS + the `user_id` in its payload rather than an explicit filter. | Add an explicit `user_id` constraint to the upsert path too. |
| SEC-4 | 🟠 | `src/app/api/ai/chat/route.ts:195` + `src/lib/acco/context.ts` | The user's **real financial figures** (estimated profit, tax liability, YTD expenses, tax band) are injected into the prompt sent to **Google Gemini**. No disclosed DPA / consent / privacy-policy line. GDPR exposure; free-tier Gemini may retain data. | Use a data-protected (paid) tier, disclose in privacy policy, get consent, or strip figures from the prompt. |
| SEC-5 | 🟠 | `next.config.ts:25` | No security headers: missing **CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy**. Clickjackable; no XSS containment. | Add a `headers()` block with a strict CSP + the standard set. |
| SEC-6 | 🟡 | `src/app/api/ai/categorise/route.ts:69` | No auth **and** no rate limit — anyone can POST and burn your Gemini quota. `chat` authenticates but also has no rate limit. | Require session; add per-user/IP rate limiting to both AI routes. |
| SEC-7 | 🟡 | `vat/submit/route.ts`, `it/submit/route.ts` | HMRC submissions trust a **client-supplied `userId`** (stamped into `Gov-Client-User-IDs`). Not verified against the session. | Derive `userId` server-side from the authenticated session. |
| SEC-8 | 🟡 | `src/app/api/ai/chat/route.ts:167` | `getSession()` used for an authorization decision. Supabase advises `getUser()` server-side (validated). | Switch to `getUser()`. |
| SEC-9 | ✅ | `.gitignore`, `.env.production` | **RESOLVED.** `.env.production` is untracked (`git rm --cached`) and the `!.env.production` force-include removed, so `.env*` is now ignored except the `.env.example` template. The two public `NEXT_PUBLIC_SUPABASE_*` values must be set as platform secrets (Vercel → Settings → Environment Variables) for production builds. | Done (set the Vercel env vars). |
| SEC-10 | 🟡 | `src/app/api/hmrc/auth/disconnect/route.ts:7` | "Disconnect" only clears local cookies; it does **not** revoke the refresh token at HMRC, so the grant stays live until expiry. Also no CSRF token. | Call HMRC's token-revoke endpoint on disconnect. |
| SEC-11 | ⚪ | `src/app/api/hmrc/auth/callback/route.ts:80` | Diagnostic string (cookie names, host, referer) leaked into the redirect URL / browser history. | Log server-side only. |
| SEC-12 | ⚪ | `src/lib/hmrc/cookies.ts:22` | Token cookie is 30-day, `sameSite: 'lax'`. For a tax-submission credential consider `strict` + shorter TTL. | Tighten cookie policy. |
| SEC-13 | ⚪ | `src/lib/storage/crypto.ts` + `secure-store.ts` | Local IndexedDB "encryption" stores the AES key beside the data in the same origin — any same-origin script/XSS can decrypt. Protects against raw disk read only; the "encrypted at rest" framing overstates it. | Keep, but describe the threat model honestly. (Backup passphrase path is genuinely strong — keep.) |

## 2. Data Integrity & Audit Trail

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| DAT-1 | ✅ | `src/lib/use-user-data.ts` | **RESOLVED.** Deletions are no longer inferred from the server/local set-difference. `persist` now derives an explicit delete set from `prev − next` (`diffDeletedIds`), and `syncSupabaseRows` deletes only those ids (intersected with rows that exist server-side), scoped by `.eq('user_id', …)`. A partial/stale local view (2nd tab, failed load, auth race with empty `items`) yields an empty delete set, so it can no longer wipe real server rows. Covered by `src/lib/__tests__/storage-sync.test.ts`. Follow-up (not blocking): a tombstone/soft-delete model would additionally resolve delete-vs-update conflicts across concurrent tabs. | Done. |
| AUD-1 | 🔴 | `src/lib/feature-flags.ts:15`, `src/lib/audit.ts:49` | Audit log is gated on `FLAG_AUDIT`, which **defaults OFF** (needs `NEXT_PUBLIC_EA_AUDIT` truthy). No env var → **no audit trail at all**. Confirmed the `audit_logs` table also never existed server-side (SEC-2). | The prepared migration creates `audit_logs`; **still open in code:** make audit mandatory for authed users, remove the off-by-default flag. |
| AUD-2 | 🔶 | `src/lib/audit.ts:57-79` | "Authoritative" store is client IndexedDB (user can edit/delete). Supabase mirror is fire-and-forget (`void`, no await/retry/error handling). **Not an immutable audit trail** — MTD/accounting needs server-authoritative, append-only. | The prepared migration makes `audit_logs` **append-only at the RLS layer** (insert + read own; no update/delete policy or grant). **Still open in code:** treat the server row as source of truth and make the write reliable (await/retry, or an RPC/trigger). |

## 3. Tax-Calculation Correctness

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| TAX-1 | ✅ | `src/lib/tax-logic.ts` (`calcDividendTax`), `tax-scenarios.ts` | **RESOLVED.** `calcDividendTax` now takes `sparePersonalAllowance` and shelters dividends covered by unused PA tax-free, before the £500 nil-rate band. Both call sites (`calculateTax`, `calcScenario5`) compute and pass it. e.g. £6k profit + £15k divs now taxes £7,930 (was £14,500). Regression tests added; engine-parity suite still green. | Done. |
| TAX-2 | ✅ | `src/lib/tax-logic.ts`, `tax-scenarios.ts` | **RESOLVED.** Class 4 NI is now charged on `grossProfit` (pre-pension) in both engines — a personal SIPP gets relief at source and does not reduce the NIC base. Income tax still uses the post-pension base, so pension relief is intact. Regression tests added. (Class 1 modelling left unchanged — out of scope.) | Done. |
| TAX-3 | ✅ | `src/lib/formatters.ts` | **RESOLVED.** `fmtDec`/`fmtDecAbs` now set `maximumFractionDigits: 2` alongside the minimum, so money always renders at exactly 2dp (no more `£119.988`). | Done. |
| TAX-4 | 🔴 | `src/lib/hooks/useInvoices.ts:29` | `vatTotal = inv.amount * 1.2` — unrounded, and hardcoded 20% (no zero/reduced/exempt/reverse-charge). | Round to 2dp; support VAT rate/treatment per line. |
| TAX-5 | ✅ | `src/lib/tax/bands-2026.ts` | **RESOLVED.** All constants reconciled against the owner's 2026/27 rate research (see gov.uk source tags in the file): dividend `10.75%/35.75%/39.35%`, Class 2 `£3.65/wk` + SPT `£7,105`, and all six Scottish bands match. Student Loan Plan 2 confirmed with HMRC at **£29,385/yr** (the doc's "£27,295" was a stale example). Source citations added to `bands-2026.ts`. | Done. Still unverified by that doc (no data present): mileage rates, marriage/blind allowances, redundancy £30k, SL Plans 1/4/5/PG. |
| TAX-6 | ✅ | `src/lib/tax-logic.ts` (`calcStudentLoan`) | **RESOLVED.** Student-loan repayment now uses `Math.floor` — HMRC floors repayments to whole pounds (the pence are never collected), so `round2` over-collected by up to 99p. | Done. |
| TAX-7 | ✅ | `src/lib/tax-scenarios.ts` (`calcScenario3`) | **RESOLVED.** Scenario 3 NI is charged on the earned `otherIncome` only. JSA and Carer's Allowance are taxable benefits, not earnings, so they no longer inflate the NI base. | Done. |
| TAX-8 | ✅ | `src/lib/tax-logic.ts`, `features/tax/*` | **RESOLVED.** Added a `marriageAllowanceRole` (`transferor` \| `recipient`). Transferor keeps the −£1,260 PA behaviour; recipient keeps full PA and gets a £252 (20% × £1,260) tax reducer, capped at tax due and **denied to higher-/additional-rate payers** (rUK >20%, Scotland >21%). The calculator UI shows a role selector when Marriage Allowance is ticked. Regression tests cover both paths, the cap, and Scottish eligibility. | Done. |
| TAX-9 | ✅ | `src/lib/tax-logic.ts` (`calcScotlandTax`) | **RESOLVED.** Scottish bands are now fixed WIDTHS applied to taxable income from £0 (mirroring `calcRukTax`), measured against the actual PA rather than the hardcoded £12,570. A tapered (>£100k) or blind-adjusted PA no longer leaves a slice of income in no band. Regression tests assert every taxable pound is banded and lock the £120k figure. | Done. |
| TAX-10 | ✅ | `src/lib/tax-logic.ts`, `tax-scenarios.ts` | **RESOLVED (rUK; Scotland documented).** rUK SIPP relief is now RELIEF AT SOURCE — the gross contribution tops up the pot at 20% and extends the basic-rate band for higher-rate relief (`calcRukTax`/`calcDividendTax` take a band extension), instead of a flat income deduction. The annual allowance is TAPERED £60k→£10k (`annualAllowance()`, gated on threshold income >£200k **and** adjusted income >£260k, £10k floor) with the £10k MPAA for flexibly-accessed pots (new `flexiblyAccessedPension` input + UI toggle). The engine exposes `pensionReliefAtSource`/`pensionNetCost`/`annualAllowance`, and the five scenario wrappers agree with the engine across the full parity matrix. **Scottish** relief keeps the simpler marginal deduction — a documented simplification (Scottish RAS band mechanics are subtler). | Done for rUK; Scotland deduction noted. |
| TAX-11 | ✅ | `src/lib/tax-logic.ts` | **RESOLVED.** Validation no longer blocks `expenses ≥ revenue` (only negative or oversized figures are rejected), and `calculateTax` keeps the signed `grossProfit` so a trading loss is reported as negative profit. Every downstream tax/NIC base already floors at 0, so a loss year correctly yields zero tax. | Done. |
| TAX-12 | ⚪ | `src/lib/tax-logic.ts:165` | Money held as float; `round2` (`Math.round`) misrounds edge cases (`2.675`). | Move to integer-pence or a decimal library. |
| TAX-13 | ✅ | `src/lib/tax-logic.ts:1` | **RESOLVED.** The "Audit complete… all correct" header is replaced with an honest "estimator, not a substitute for HMRC" note. With TAX-8 and TAX-10 now resolved, the header documents the one remaining simplification: Scottish SIPP relief modelled as a marginal deduction. | Done. |

## 4. Accounting Logic (P&L / reports)

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| PL-1 | 🟠 | `src/app/dashboard/pnl/page.tsx:176-194` | Cost of Sales is **guessed by keyword-matching the description text** ("goods", "stock", "raw "). Misclassifies → wrong gross profit/margin. | Classify COGS from a real category field, not free text. |
| PL-2 | 🟠 | `src/app/dashboard/pnl/page.tsx:199, 796` | Net profit is labelled **"EBITDA"** — definitionally wrong (EBITDA excludes depreciation, which is folded into opex here). Visible finance error. | Fix the label/definition; break out interest/depreciation if you want a true EBITDA. |
| PL-3 | 🟡 | `src/app/dashboard/pnl/page.tsx:26-36` | Monthly chart buckets by month **name only** → different years collapse together; not tax-year aligned. | Bucket by year+month; align to the tax year. |
| PL-4 | 🟡 | `src/app/dashboard/pnl/page.tsx:353, 850` | UI labelled "HMRC-compliant" / "HMRC liability" for a keyword-guessed **estimate**. Overclaim. | Soften to "indicative estimate". |
| PL-5 | ⚪ | `src/app/dashboard/pnl/page.tsx:438` | "Register before 6 April 2026" deadline is already in the past. | Make date dynamic. |

## 5. Receipt Scanner (OCR)

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| OCR-1 | 🟠 | `src/components/ReceiptScanner.tsx:237, 122` | `accept` includes `application/pdf`, but `Tesseract.recognize` is given the raw File — **tesseract.js can't OCR a PDF**, so "photo or PDF" fails for PDFs. | Convert PDF→image first, or drop the PDF claim. |
| OCR-2 | 🟡 | `src/components/ReceiptScanner.tsx:42` | Amount fallback is `Math.max(...allNums)` — the largest number on a receipt (could be a card fragment, quantity, VAT-rate line) silently becomes the expense amount feeding tax figures. | Prefer total/amount-labelled lines; flag low-confidence for user confirmation. |
| OCR-3 | ⚪ | `src/components/ReceiptScanner.tsx:52` | Date parse assumes DD/MM/YYYY; US-format receipts misparse silently. | Confirm ambiguous dates with the user. |
| OCR-✅ | — | `:203` | "Runs client-side. Nothing is uploaded." is **true** — good, honest. | — |

## 6. HMRC MTD

| ID | Sev | Location | Problem | Fix direction |
|----|-----|----------|---------|---------------|
| MTD-1 | 🟠 | `src/app/api/ai/chat/route.ts:155` | `MODEL = 'gemini-1.5-flash'` — the comment directly above says that model is **retired and will fail**; correct model is `gemini-2.5-flash` (as `categorise` uses). Chat silently falls back to canned replies. | Change to `gemini-2.5-flash`. |
| MTD-2 | 🟡 | `src/lib/hmrc/fraud-headers.ts:87, 29` | `Gov-Client-Public-IP-Timestamp` set to "now" not observation time; `x-forwarded-for` first hop trusted blindly. HMRC's validator checks these. | Capture IP-observation time; validate/trust XFF only from known proxies. |
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
