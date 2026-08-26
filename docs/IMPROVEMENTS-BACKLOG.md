# EasyAcco — improvements backlog

_Full-tree sweep, 2026-08-22, against `main` @ `11c7619`. Every item below was
verified against the code on that commit — nothing here is inferred from the
other docs without checking._

## How to use this file (read this first — it is what makes the rest cheap)

Each item is **self-contained**: exact path, exact problem, exact fix, and the
command that proves it worked. You should not need to explore the codebase to
start one. Pick an item, read only the files it names, do it, run its check.

- **Do not re-audit.** The measurements in here (coverage %, file counts) were
  taken on `11c7619`. If you want them fresh, the commands are in
  [Appendix A](#appendix-a--how-the-numbers-were-measured) — but they cost a
  full test run each, so trust these unless something looks wrong.
- **Items are independent unless a `needs:` line says otherwise.** Batches are
  sized to roughly one session each.
- **Every item ends the same way** — the repo's four gates, per `CLAUDE.md`:
  ```bash
  npx tsc --noEmit && npx vitest run && npm run lint && npm run build
  ```
  On Windows PowerShell 5.1 use `;` + `if ($?)` instead of `&&`.
- **Read `CLAUDE.md` first** if you have not. Its hard rules (bands-2026 as the
  only home for tax figures, AI disclosures moving with the flag, no
  `Co-Authored-By` trailer) apply to everything here.

**Priority key** — 🔴 correctness/security · 🟠 real risk or real cost · 🟡
hygiene with a payoff · ⚪ polish · 🔵 owner action, not code.

**Current state for context:** 161 source files, 63 test files, 33,816 LOC.
Suite is 1,085 passing + 1 skipped. `src/app/api/**` is at 92.35 % statements;
`src/lib/**` at 79.95 %. Dependencies are clean (`pnpm audit --prod`: no known
vulnerabilities). There are zero `TODO`/`FIXME`/`@ts-ignore` markers and zero
`any` in non-test source — this is a well-kept codebase, and the list below is
mostly gaps rather than mess.

---

## Batch 1 — Security-relevant test gaps (🔴 do first)

The pattern that produced MTD-7 and MTD-8 (`docs/AUDIT.md` §10) was **a written
security claim with no assertion behind it**. These are the remaining ones.

### 1.1 ✅ DONE (PR #107) — `hmrc/identity.ts` was at 0 %, the SEC-7 access control had no test

- **Where:** `src/lib/hmrc/identity.ts` (12 statements, lines 25–54 uncovered)
- **Why it matters:** `resolveSubmissionUserId()` is the function that decides
  **who is allowed to file a tax return**. It is the entire implementation of
  SEC-7 ("never trust the body for identity") and of the access-control note in
  its own docstring — that an authenticated Supabase session is required to
  submit to HMRC. Every submit-route test mocks this module out, so the thing
  they mock has never itself been executed by a test.
- **Fix:** add `src/lib/hmrc/__tests__/identity.test.ts`. Mock
  `@/lib/supabase-server` (pattern: `src/app/api/hmrc/__tests__/hello-auth.test.ts`).
  Assert all four branches:
  1. `getUser()` returns a user → `{ ok: true, userId }`.
  2. `getUser()` returns an error → `401` and the "Could not verify your
     session" message.
  3. `getUser()` returns `{ user: null }` → `401` "You must be signed in".
  4. `createClient()` **throws** → `503` and `reportError` was called with
     `'hmrc.identity.sessionLookup'` (assert the tag; it is the only signal
     anyone gets that auth infrastructure is down).
- **Check:** `npx vitest run src/lib/hmrc/__tests__/identity.test.ts` and
  confirm `identity.ts` is no longer 0 % (Appendix A).
- **Tracked as:** TST-12 in `docs/TEST-COVERAGE.md`.
- **Effort:** small — 12 statements, four branches.
- **Outcome:** `src/lib/hmrc/__tests__/identity.test.ts` added, all four branches
  asserted. `identity.ts` **0 % → 100 %** on all four metrics; `lib/hmrc` as a
  directory **91.74 % → 95.28 %** statements. No production code changed.
  **TST-12 is not fully closed** — its `auth-shared.ts` half remains, see 1.4.

### 1.2 🔴 The client half of the fraud headers is untested

- **Where:** `src/app/dashboard/hmrc/browser-fraud-data.ts` (15 statements, 0 %)
- **Why it matters:** enormous care went into the **server** half of HMRC's
  fraud-prevention headers (MTD-2, `fraud-headers.ts` at 96.8 %, a whole
  sandbox suite). This file builds the `browser` payload the client posts —
  screens, window size, timezone, device ID — and it is the _input_ to all of
  that. `invalidBrowserFields()` will reject a malformed payload with a 400, so
  a bug here is a submission the user cannot make, with an error naming a field
  they never filled in.
- **Fix:** it is a pure-ish browser function; test it in `happy-dom` (see item
  3.6 / TST-17 for the environment pragma). Assert the device ID is a real
  UUID and is **stable across calls** (it is meant to persist per device), that
  the timezone matches `/^UTC[+-](?:0\d|1[0-4]):[0-5]\d$/` — the exact pattern
  `invalidBrowserFields` enforces — and that `screens`/`windowSize` are finite
  numbers. Round-trip the output through `invalidBrowserFields()` from
  `@/lib/hmrc/fraud-headers` and assert `[]`; that single assertion is worth
  more than the rest, because it pins the two files together.
- **Check:** four gates, plus the round-trip assertion above.
- **Effort:** small.

### 1.3 🟠 `NEXT_PUBLIC_APP_VERSION` is undocumented and silently defaults

- **Where:** `src/lib/hmrc/fraud-headers.ts:248` reads it; `.env.example` never
  mentions it.
- **Why it matters:** it becomes `Gov-Vendor-Version: easyacco=<value>` on every
  MTD submission. Unset, it silently reports **`1.0.0`** forever. HMRC's Test
  Fraud Prevention Headers API validates this field, and the code comment right
  above it says HMRC "is strict about this field's shape". So the one value
  HMRC checks is the one nobody is told to set.
- **Fix:** add it to `.env.example` with a comment saying it feeds
  `Gov-Vendor-Version` and must be a plain dotted version (no build metadata —
  the existing comment explains why). Consider deriving it from `package.json`
  `version` at build time so it cannot drift.
- **Check:** `grep NEXT_PUBLIC_APP_VERSION .env.example`.
- **Effort:** trivial. **Do it with 2.3** (same file).

---

### 1.4 🟠 `auth-shared.ts` — the `catch` that holds hard rule #4 is unexecuted

- **Where:** `src/lib/auth-shared.ts` line 25 (the `catch { return null }`)
- **Current:** 87.5 % statements, 100 % branches, 85.71 % lines — one statement
  short. The backlog and `docs/TEST-COVERAGE.md` both previously said this file
  was at **0 %, 8 statements**; that was measured before the API-route work and
  is stale. Only the `catch` body is uncovered now.
- **Why it matters:** `getCachedUser` is the other half of TST-12, and where
  hard rule #4 lives. It is memoized with React `cache()` precisely because a
  cross-request cache leaked one user's identity to everyone (SEC-1). The
  `catch` is what stops a Supabase outage throwing into a route and turning a
  degraded auth backend into a 500 on every page.
- **Fix:** extend the existing `identity.test.ts` mocking pattern — module-mock
  `@/lib/supabase-server` so `createClient()` rejects, and assert
  `getCachedUser()` resolves to `null` rather than throwing.
- **Check:** `identity.ts` and `auth-shared.ts` both absent from the uncovered
  list in Appendix A's per-file report.
- **Effort:** very small — one test, one branch. Closes TST-12.

---

## Batch 2 — Register and doc integrity (🟠 cheap, and everything downstream trusts these)

`CLAUDE.md` hard rule #3 is that compliance docs make testable claims. These are
places where a doc currently says something untrue.

### 2.1 ✅ DONE (in this commit) — `docs/AUDIT.md` marked MTD-7/MTD-8 as open when they are fixed

- **Where:** `docs/AUDIT.md` §10 table, `Sev` column of both rows.
- **The problem:** every resolved row in the register uses **✅** in the `Sev`
  column (`TRK-1`, `AI-1`, `SEC-15`, `MTD-6` all do). MTD-7 and MTD-8 use 🟠,
  so the two rows read as open findings while the snapshot line above claims
  **57 ✅ … of 64**. The register contradicts itself, and a `grep` for
  unresolved rows returns two false positives.
- **Cause:** introduced in `dd90b36` (the §10 commit). Severity was recorded
  where status belongs.
- **Fixed here:** both `Sev` cells are now `✅`; the severity is stated in the
  prose instead. The Appendix A unresolved-row grep now returns only the seven
  genuinely-open rows (SEC-2, SEC-12, AUD-2, MTD-3, ENV-2, SEC-15b, TAX-15b).

### 2.2 ✅ DONE (in this commit) — `CLAUDE.md` said there was one `.tsx` test file

- **Where:** `CLAUDE.md`, "Testing conventions" — "almost no component tests
  (one `.tsx` file in the whole suite)".
- **Reality:** there are **four** `.test.tsx` files —
  `features/invoices/__tests__/InvoiceRow.test.tsx`,
  `features/shell/__tests__/SADeadlineBanner.test.tsx`,
  `lib/__tests__/use-user-data.test.tsx`,
  `lib/__tests__/use-user-data-persist.test.tsx`. Two are true component tests;
  two are hook tests.
- **Why it matters:** it is the file every session is told to read first, and
  the sentence understates the position by 4×. It was left stale in `dd90b36`
  while the rest of that paragraph was being corrected.
- **Fixed here:** now reads "two of them, plus two hook tests, in the whole
  suite". The point it was making is still true and is kept.

### 2.3 🟡 `.env.example` is missing four variables the code reads

- **Where:** `.env.example`
- **Missing:** `NEXT_PUBLIC_APP_VERSION` (see 1.3), `NEXT_PUBLIC_EA_GAAP` and
  `NEXT_PUBLIC_EA_AUDIT` (both read by `src/lib/feature-flags.ts:14-15`), and
  `GOOGLE_API_KEY` (read by `src/app/api/ai/categorise/route.ts:110` as a
  fallback alias for the documented `GEMINI_API_KEY`).
- **Why it matters:** two undocumented feature flags means two features nobody
  can find the switch for. `NODE_ENV` also appears in a scan but is
  framework-provided — ignore it.
- **Fix:** add all four with one-line comments. For `GOOGLE_API_KEY`, say it is
  an alias for `GEMINI_API_KEY` — or drop the fallback and keep one name, which
  is the better answer if nothing depends on it.
- **Effort:** trivial.

---

## Batch 3 — The remaining test gaps (🟠, largest single body of work)

Ordered by value, not by size. All are tracked in `docs/TEST-COVERAGE.md`;
percentages re-measured on `11c7619`.

### 3.1 🟠 The hooks layer — the seam between storage and UI (TST-15)

- `src/lib/hooks/useExpenses.ts` — **0 %** (52 statements)
- `src/lib/hooks/useInvoices.ts` — **20 %** / 17.5 % branches (70 statements)
- **Why:** these sit between validated storage and the UI, and they are where
  money is totalled before a user sees it. `TEST-COVERAGE.md` TST-15 names the
  concrete cases to start with (£0.00 and negative amounts in `useExpenses`).
- **needs:** the `installFakeIDB` harness (item 3.2) for anything touching
  persistence.

### 3.2 🟠 `storage/idb.ts` at 44.3 % / 24.4 % (TST-13)

- **Where:** `src/lib/storage/idb.ts` (106 statements)
- **Why:** `TEST-COVERAGE.md` observes that _every comment in this file is an
  incident report_ — it is the most-broken-and-repaired module in the tree, and
  the least covered. Widening `installFakeIDB` unblocks 3.1 and part of 3.3.
- **Do this before 3.1** if doing both.

### 3.3 🟠 Encrypted local storage: the restore path (TST-5)

- `src/lib/storage/backup.ts` — 72.3 % · `src/lib/storage/crypto.ts` — 78.0 %
- **Why:** restore is the path that runs when someone is recovering their own
  data, i.e. exactly when a bug is least forgivable and least reproducible.

### 3.4 🟠 Untested logic hooks outside `lib/`

- `src/features/tax/useTaxScenario.ts` — **0 %** (47 statements)
- `src/features/mileage/use-mileage-logic.ts` — **0 %** (28 statements)
- **Why:** both hold real arithmetic, and both fall outside the `src/lib/**`
  coverage ratchet, so the gate cannot see them. This is TST-8's point
  (logic that is untestable because of where it lives) in its current form.

### 3.5 🟡 `formatters.ts` at 40 %

- **Where:** `src/lib/formatters.ts` (5 statements, 2 covered)
- **Why:** tiny file, but it is the single source of truth for how **every
  money figure in the product is rendered**. `fmtGBP` rounds, `fmtDec` does
  not, `fmtAbs` drops the sign. Five functions, five tests, permanently pinned —
  including the sign-dropping behaviour of `fmtAbs`/`fmtDecAbs`, which is the
  one a caller could reasonably use by mistake on a negative balance.
- **Effort:** trivial, high ratio.

### 3.6 🟡 The default test environment hides browser branches (TST-17)

- **Where:** `vitest.config.ts` → `environment: 'node'`
- **Why:** any `typeof window === 'undefined'` branch takes the server path in
  every test, so the browser half never runs. Needed by 1.2.
- **Fix:** per-file `// @vitest-environment happy-dom` (already a dependency)
  rather than flipping the global default, which would slow the whole suite.

### 3.7 🟡 Other measured gaps, for completeness

| File                               | Stmts      | Note                                                                                     |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| `components/ReceiptScanner.tsx`    | 48.9 %     | OCR entry point; the reject-before-load guards are the valuable half                     |
| `lib/sw-cache.ts`                  | 0 % (22)   | service-worker cache logic                                                               |
| `lib/supabase-client-singleton.ts` | 16.7 % (6) | small; the singleton branch is the point                                                 |
| `lib/supabase-browser.ts`          | 62.5 % (8) | small                                                                                    |
| `lib/transactions/seed.ts`         | 0 % (1)    | one statement                                                                            |
| `validators.ts` boundary guards    | —          | TST-16: decide what they are _for_ first; it resolves an inconsistency TST-15 trips over |
| `components/ErrorBoundary.tsx`     | 0 % (8)    | TST-9 notes this is the component whose entire job is behaviour under failure            |

> **Deliberately not on this list:** the ~60 presentational `.tsx` files at 0 %.
> That is the documented position (TST-10) — coverage is a ratchet on the logic
> core, not a target for the tree. Do not "fix" it by testing markup.

---

## Batch 4 — Dead code and duplication (🟡 quick wins, all independent)

### 4.1 🟡 Four UI primitives are never imported

- `src/components/ui/Card.tsx`, `Input.tsx`, `Skeleton.tsx`, `Button.tsx` —
  **zero importers each** (verified: no match for `ui/(Card|Input|Skeleton|Button)`
  anywhere in `src`).
- Worse, `src/components/ui/Base.tsx` **also exports a `Card`**, so there are two
  unrelated `Card` components and the reachable one is the other file.
- Within `Base.tsx`, `StatCard` and `Card` are also unimported; only `Badge` and
  `LoadingSpinner` are used (by `app/dashboard/expenses/page.tsx:13`).
- **Fix:** delete the four files; delete `StatCard`/`Card` from `Base.tsx`
  **after** doing 4.2, which needs `StatCard` first. `CLAUDE.md`: "Dead code
  with passing tests survives forever" — this is that, minus the tests.
- **Check:** `npm run build` (Next will fail on a broken import) + four gates.

### 4.2 🟡 `StatCard` is implemented twice

- **Where:** `src/app/dashboard/invoices/page.tsx:16` defines a local
  `StatCard`, while `src/components/ui/Base.tsx:3` exports a shared one that
  nothing imports.
- **Fix:** compare the two. Either import the shared one and delete the local
  copy, or keep the local one and delete the shared export as part of 4.1 —
  but not both, and decide deliberately rather than leaving the duplicate.
- **needs:** decide this before 4.1 deletes `Base.StatCard`.

### 4.3 🟡 `src/types/index.ts` documents a convention nobody follows

- **Where:** `src/types/index.ts` (23 lines)
- **The problem:** it says _"Prefer `import type { Invoice, Expense, TaxInput }
from '@/types'` in new code"_ — and **that docstring is the only reference to
  `@/types` in the repo.** Zero modules import from it.
- **Fix:** either adopt it (migrate the type imports, so the barrel earns its
  keep) or delete it. A convention that documents itself and nothing else is
  worse than no convention, because the next reader has to work out which it is.

### 4.4 ⚪ One genuinely empty catch

- **Where:** `src/features/shell/SADeadlineBanner.tsx:97` — `} catch {}`
- **Context:** `localStorage.setItem` for banner dismissal. The failure is
  benign (the banner reappears next load), and `readDismissed()` twelve lines
  above handles the same risk explicitly with `catch { return null }`.
- **Fix:** a one-line comment saying the throw is expected in private mode and
  the consequence is accepted. This is the only empty catch in the tree — worth
  keeping it that way.

---

## Batch 5 — The styling migration (🟡 large, but it unlocks a security fix)

### 5.1 🟡 Two styling systems, and Step 4 is much bigger than the plan says

- **Measured on `11c7619`:** **27 files** still use the inline `C`/`T` token
  objects, across **692** `style={{…}}` occurrences.
- `docs/REFACTOR-PLAN.md` Step 4 lists **four** files to convert. That list is
  the tail end, not the job. The real distribution (worst first):

  | File                                    | inline styles |
  | --------------------------------------- | ------------- |
  | `features/tracker/YearTracker.tsx`      | 60            |
  | `app/privacy/page.tsx`                  | 54            |
  | `app/dashboard/transactions/page.tsx`   | 49            |
  | `app/dashboard/pnl/page.tsx`            | 46            |
  | `app/security/page.tsx`                 | 39            |
  | `features/tax/FullResultPanel.tsx`      | 35            |
  | `app/dashboard/DashboardUI.tsx`         | 34            |
  | `app/dashboard/settings/audit/page.tsx` | 31            |
  | `app/dashboard/learn/page.tsx`          | 29            |
  | …18 more                                | ~275          |

- **Why it is worth doing** — beyond "every visual change has to be made twice":
  **it is what stands between you and a stricter CSP.** `next.config.ts:68`
  carries `style-src 'self' 'unsafe-inline'` with the comment _"49 components
  style via React's `style={{…}}`"_ (itself now stale — it is 692 occurrences
  across 27 files). Finish the migration and that directive can drop
  `'unsafe-inline'` entirely. A styling cleanup that closes a CSP weakness is a
  much easier sell than a styling cleanup.
- **Fix:** one file per session, smallest first, mapping each value to its token
  (`C.border` → `border-sa-border`, `T.caption` → `text-caption`). Invent no new
  colours or sizes. `src/lib/__tests__/contrast.test.ts` guards the palette — if
  it fails, the mapping was wrong, not the test.
- **Also:** update the stale "49 components" comment in `next.config.ts` when
  the count changes, or delete the number and keep the reasoning.

### 5.2 ⚪ `script-src 'unsafe-inline'` — the other half of the CSP

- **Where:** `next.config.ts:66`
- Already documented honestly in-file as a known limitation: Next's App Router
  bootstraps with inline scripts, and removing it means emitting a per-request
  nonce from middleware and threading it through the document.
- **Status:** genuinely its own piece of work with its own testing pass. A
  pen tester will raise it (`docs/PENTEST-SCOPE.md` expects this). Listed so it
  is a decision rather than an oversight.

---

## Batch 6 — Environment and robustness (🟡)

### 6.1 🟡 `pnpm-workspace.yaml` still holds six literal placeholders

- **Where:** `pnpm-workspace.yaml` — six entries all reading
  `set this to true or false`: `@google/genai`, `core-js`, `protobufjs`,
  `sharp`, `tesseract.js`, `unrs-resolver`.
- **Effect (observed on a clean `pnpm install --frozen-lockfile`):**
  > `Ignored build scripts: @google/genai@2.13.0, protobufjs@7.6.5,
tesseract.js@7.0.0, unrs-resolver@1.12.2.`
- **Why it matters:** `tesseract.js` is the OCR engine — `CLAUDE.md` explicitly
  says to resolve this before touching anything OCR-related. `sharp` is Next's
  image-optimisation dependency. Skipping build scripts is not always fatal, but
  "not always" is the problem: it is a silent, environment-dependent difference
  between your machine and CI.
- **Fix:** `pnpm approve-builds`, then commit the real booleans. This is
  `REFACTOR-PLAN.md` Step 6.1 and has been open a while.
- **Note:** Step 6.2 (gitignore `package-lock.json`) is **already done** —
  `.gitignore:10`. Do not redo it.

### 6.2 🟠 Supabase env vars are asserted, not validated

- **Where:** `src/lib/supabase-server.ts:13-14` and `middleware.ts:26-27` —
  `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `..._ANON_KEY!`
- **The problem:** if either is unset, `!` hands `undefined` to
  `createServerClient`, which fails somewhere inside the library with a message
  that does not name the missing variable. Compare `readHmrcEnv()`
  (`src/lib/hmrc/oauth.ts:15-38`), which collects the missing names and returns
  `Missing env vars: …`. The auth path deserves at least the courtesy the HMRC
  path already gets.
- **Fix:** a small shared `readSupabaseEnv()` in the same shape as
  `readHmrcEnv()`, used by both call sites. Note `middleware.ts` runs on the
  edge runtime — keep it dependency-free.

### 6.3 ⚪ The Supabase fetch wrapper discards the caller's abort signal

- **Where:** `src/lib/supabase-server.ts:34-38`
  ```ts
  fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
  ```
- **The problem:** `...options` spreads the caller's `signal` in, then the next
  property **overwrites** it. If `supabase-js` ever passes its own signal for
  cancellation, it is silently dropped, and the request is only cancellable by
  the 10 s timeout.
- **Fix:** `AbortSignal.any([options.signal, AbortSignal.timeout(10000)].filter(Boolean))`
  (Node 20+, which `engines` already requires). Low impact today; it is a trap
  for whoever next adds cancellation.
- **Also:** the comment at lines 26-27 contradicts itself — it says `reportError`
  "is not available in server components" and then calls it. Fix or delete it.

### 6.4 ⚪ Payslip parser has never seen a real photo

- **Where:** `src/features/ocr/payslipParser.ts` — 31 tests, all against
  hand-written approximations of tesseract output.
- `REFACTOR-PLAN.md` Step 7. Needs three real payslips from different employers,
  run through `/dashboard/payslip`, with the label patterns widened for whatever
  fails and each real OCR string added as a fixture (employer and figures
  changed). Cannot be done without the input.

---

## Batch 7 — Owner actions and calendar items (🔵 not code)

Carried from `docs/AUDIT.md` "What is actually left" and re-checked. **No code
session can close any of these** — listed so they are not repeatedly
rediscovered as if they were bugs.

| ID            | What                                                                                                         | Why it is not code                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-2(b)      | Delete the confirmed-empty stray Supabase project `odffmxqnsdjfswbwrhwx`                                     | Dashboard click; the MCP cannot hard-delete                                                                                                                          |
| MTD-2         | Run `fraud-headers.sandbox.test.ts` against HMRC                                                             | Written and skips without credentials; **has still never been run**                                                                                                  |
| MTD-3         | HMRC production recognition                                                                                  | Calendar time, multi-step                                                                                                                                            |
| AUD-2         | Make the server row the authoritative audit store                                                            | Deliberate follow-up PR; write reliability is already resolved                                                                                                       |
| SEC-12        | Shorten the HMRC token TTL                                                                                   | Owner preference — a UX↔security tradeoff, not a defect                                                                                                              |
| SEC-15b       | Cross-instance refresh-token single-flight                                                                   | Needs a shared store (Redis/Upstash) — infrastructure decision                                                                                                       |
| TAX-15b       | Model pension carry-forward                                                                                  | Needs a new input + three-year lookback rules; the UI states the limitation honestly today                                                                           |
| TAX-5 residue | Verify mileage rates, marriage/blind allowances, redundancy £30k, SL Plans 1/4/5/PG against a primary source | Research against HMRC publications                                                                                                                                   |
| ENV-2         | Get the repo off the OneDrive path                                                                           | Dev-machine change. `REFACTOR-PLAN` calls it the highest-value item in that file — the dev server serves stale bundles and `node_modules` has been wiped mid-session |

---

## Suggested order

1. **Batch 2** — 2.1 and 2.2 are already done in this commit (both were
   self-inflicted errors from the previous change, so they were fixed rather
   than billed to a later session). **2.3 remains** and takes minutes.
2. ~~**1.1**~~ — **done, PR #107.** Then **1.4** (very small, closes TST-12) and
   **1.2** — the remaining security claims with no assertion behind them.
   1.3 rides along with 2.3.
3. **Batch 4** — deletions are the cheapest permanent wins here.
4. **6.1**, **6.2** — environment determinism.
5. **Batch 3** — the long tail. 3.2 before 3.1; 3.5 is trivial and worth doing
   at any point.
6. **Batch 5** — one file per session, indefinitely, with the CSP as the prize.

## What is deliberately NOT here

- **Presentational component tests.** See the note under 3.7.
- **Dependency upgrades.** `pnpm audit --prod` reports no known vulnerabilities;
  Dependabot already runs (`.github/dependabot.yml`, PR #103 open at time of
  writing).
- **Security headers.** `next.config.ts` already sets HSTS, `X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy` and a full CSP with a real
  `connect-src` allow-list. The two `unsafe-inline` directives are the only gap
  and are items 5.1/5.2.
- **`key={index}`.** Six occurrences, all over **static** header arrays
  (`['', 'Date', 'Description', …]`). Not a bug; do not "fix" it.
- **The `dangerouslySetInnerHTML` on `LandingPage.tsx:121`.** It renders a
  static `JSON_LD` const with no user input and no `<` in its values. Safe as
  written. If it ever takes dynamic data, escape `<` to prevent `</script>`
  breakout.

---

## Appendix A — how the numbers were measured

```bash
# Per-file coverage across the whole tree (the source of every % above)
npx vitest run --coverage --coverage.include='src/**' \
  --coverage.reporter=json-summary --coverage.reportsDirectory=/tmp/cov \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0 \
  --coverage.thresholds.functions=0 --coverage.thresholds.lines=0

# Legacy styling footprint (items 5.1)
grep -rlE "\bC\.(border|muted|bg|text)|\bT\.(meta|micro|caption|lead)" src \
  --include=*.tsx --include=*.ts | grep -v __tests__ | wc -l
grep -rcE "style=\{\{" src --include=*.tsx | awk -F: '{s+=$2} END {print s}'

# Unreferenced UI primitives (item 4.1)
grep -rE "ui/(Card|Input|Skeleton|Button)['\"]" src --include=*.ts --include=*.tsx

# Unresolved audit rows (item 2.1 — should return only genuinely-open findings)
grep -oE "^\| (SEC|MTD|AUD|TAX|ENV)-[0-9]+[a-z]? *\| (🔴|🟠|🟡|⚪|🔶)" docs/AUDIT.md

# Env vars read by code but absent from .env.example (item 2.3)
grep -rhoE "process\.env\.[A-Z0-9_]+" src middleware.ts next.config.ts \
  | sed 's/process\.env\.//' | sort -u
```

Coverage thresholds are set to 0 in these commands only so the report prints
without the gate failing. **Never commit that change** — `vitest.config.ts`
holds the real ratchet (77/74/72/81 on `src/lib/**`), CI runs
`pnpm test:coverage`, and `TEST-COVERAGE.md` is explicit that the thresholds are
raised as the real numbers rise and never lowered to merge.
