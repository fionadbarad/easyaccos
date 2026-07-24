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
| SEC-2 | 🔶 | `middleware.ts:28`, `src/app/dashboard/layout.tsx:4` | **RLS verified (2026-07-24):** production (`fdhowwrhfuykkxhqfesy`) held only `tax_logs` (RLS on, `auth.uid()=user_id` ✓) — **none of `user_transactions/expenses/invoices/mileage` or `audit_logs` existed**, and 0 migrations were tracked, so server persistence + audit were silently non-functional (all writes fell back to local IndexedDB). A second, empty project (`odffmxqnsdjfswbwrhwx`) is also wired to the repo. A tracked migration (`supabase/migrations/20260724120000_user_data_and_audit_rls.sql`) now creates all five tables with RLS + owner-only policies (validated in a rolled-back transaction, and applied cleanly to the Supabase preview branches); **pending apply to prod.** **Redirect decision:** the original "add a server redirect for `/dashboard/*`" is **intentionally declined** — guest mode is a designed feature (`DashboardShell` shows a "Guest mode — your data is not saved" banner and persists to local IndexedDB only). An unauthenticated request has no `auth.uid()`, so the RLS policies return nothing; guests never touch server data. With SEC-1 fixed and RLS in place, confidentiality no longer depends on a redirect. | Remaining: (a) apply the migration to prod; (b) remove/repurpose the stray second Supabase project. |
| SEC-3 | 🟠 | `src/lib/use-user-data.ts` (upsert) | Partially addressed: the `.delete()` is now scoped by `.eq('user_id', userId)` (done alongside DAT-1). The `.upsert()` still relies on RLS + the `user_id` in its payload rather than an explicit filter. | Add an explicit `user_id` constraint to the upsert path too. |
| SEC-4 | 🟠 | `src/app/api/ai/chat/route.ts:195` + `src/lib/acco/context.ts` | The user's **real financial figures** (estimated profit, tax liability, YTD expenses, tax band) are injected into the prompt sent to **Google Gemini**. No disclosed DPA / consent / privacy-policy line. GDPR exposure; free-tier Gemini may retain data. | Use a data-protected (paid) tier, disclose in privacy policy, get consent, or strip figures from the prompt. |
| SEC-5 | 🟠 | `next.config.ts:25` | No security headers: missing **CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy**. Clickjackable; no XSS containment. | Add a `headers()` block with a strict CSP + the standard set. |
| SEC-6 | 🟡 | `src/app/api/ai/categorise/route.ts:69` | No auth **and** no rate limit — anyone can POST and burn your Gemini quota. `chat` authenticates but also has no rate limit. | Require session; add per-user/IP rate limiting to both AI routes. |
| SEC-7 | 🟡 | `vat/submit/route.ts`, `it/submit/route.ts` | HMRC submissions trust a **client-supplied `userId`** (stamped into `Gov-Client-User-IDs`). Not verified against the session. | Derive `userId` server-side from the authenticated session. |
| SEC-8 | 🟡 | `src/app/api/ai/chat/route.ts:167` | `getSession()` used for an authorization decision. Supabase advises `getUser()` server-side (validated). | Switch to `getUser()`. |
| SEC-9 | 🟡 | `.gitignore` (`!.env.production`), `.env.production` | Env file force-committed with live Supabase URL + anon key. Anon key is public-by-design, but the pattern will leak the next real secret (`HMRC_COOKIE_SECRET`, service role). | Stop committing env files; use platform secrets. |
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
| TAX-1 | 🔴 | `src/lib/tax-logic.ts:301` (`calcDividendTax`), used `:477`, `tax-scenarios.ts:292` | Dividends stack on `taxableNonDivIncome` with only the £500 allowance — **unused Personal Allowance is never applied to dividends**. Over-taxes low-salary/high-dividend cases (e.g. £6k salary + £15k dividends). | Let spare PA cover dividends before the £500 nil-rate band. |
| TAX-2 | 🔴 | `src/lib/tax-logic.ts:466` | Class 4 NI computed on `adjustedProfit` (**after** pension). Personal pension does not reduce Class 4. Under-charges NI for anyone with a pension. | Base Class 4 on `grossProfit`. |
| TAX-3 | 🔴 | `src/lib/formatters.ts:18, 26` | `fmtDec`/`fmtDecAbs` set `minimumFractionDigits: 2` with **no** `maximumFractionDigits` → money renders with up to 3 decimals (`£119.988`). | Add `maximumFractionDigits: 2`. |
| TAX-4 | 🔴 | `src/lib/hooks/useInvoices.ts:29` | `vatTotal = inv.amount * 1.2` — unrounded, and hardcoded 20% (no zero/reduced/exempt/reverse-charge). | Round to 2dp; support VAT rate/treatment per line. |
| TAX-5 | ✅ | `src/lib/tax/bands-2026.ts` | **RESOLVED.** All constants reconciled against the owner's 2026/27 rate research (see gov.uk source tags in the file): dividend `10.75%/35.75%/39.35%`, Class 2 `£3.65/wk` + SPT `£7,105`, and all six Scottish bands match. Student Loan Plan 2 confirmed with HMRC at **£29,385/yr** (the doc's "£27,295" was a stale example). Source citations added to `bands-2026.ts`. | Done. Still unverified by that doc (no data present): mileage rates, marriage/blind allowances, redundancy £30k, SL Plans 1/4/5/PG. |
| TAX-6 | 🟠 | `src/lib/tax-logic.ts:341` | Student-loan repayment uses `round2`; HMRC floors to whole pounds. | Use `Math.floor`. |
| TAX-7 | 🟠 | `src/lib/tax-scenarios.ts:175` | Scenario 3 charges **Class 1 NI on JSA + Carer's Allowance** — benefits aren't earnings, no NI due. | Exclude benefits from the NI base. |
| TAX-8 | 🟠 | `src/lib/tax-logic.ts:443` | Marriage Allowance modelled as the user losing £1,260 PA (transferor). Most claimants are recipients (≈£252 tax reducer). No eligibility guard. | Clarify persona; model recipient path; guard eligibility. |
| TAX-9 | 🟠 | `src/lib/tax-logic.ts:252` | Scotland band maths seeds `prev = PA_BASE` (hardcoded £12,570) regardless of tapered/blind-adjusted PA → wrong bands for Scots over £100k. | Compute band edges from the actual PA. |
| TAX-10 | 🟠 | `src/lib/tax-logic.ts:437, 619` | Pension modelled as a flat income deduction; real SIPP relief is relief-at-source + basic-rate band extension. Missing tapered annual allowance (£60k→£10k) and MPAA. | Implement band-extension relief + tapered AA. |
| TAX-11 | 🟠 | `src/lib/tax-logic.ts:606, 610` | Validation blocks `revenue ≤ 0` and `expenses ≥ revenue` — legitimate **trading losses** can't be entered. | Allow losses; compute negative profit. |
| TAX-12 | ⚪ | `src/lib/tax-logic.ts:165` | Money held as float; `round2` (`Math.round`) misrounds edge cases (`2.675`). | Move to integer-pence or a decimal library. |
| TAX-13 | ⚪ | `src/lib/tax-logic.ts:1-11` | Header comment claims "Audit complete… all correct" — contradicted by TAX-1/2/6/7. | Remove false assurance. |

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
