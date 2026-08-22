# EasyAcco — Test Coverage Analysis

_Round 2 snapshot taken 2026-08-12 against `c6671a5`. 928 tests across 53 files, all
green (one `describe.skipIf` block that needs real HMRC sandbox credentials)._

_Round 1 was taken 2026-08-10 against `270b510` — 870 tests across 43 files. Its
findings are kept below with a status marker rather than deleted, so a closed one
stays traceable to the commit that closed it._

This is an analysis document, not a compliance record: nothing here is asserted by
a test. Findings carry a `TST-` id so they can be picked up individually.

---

## How the numbers were produced

TST-10 landed, so the provider is now a dev dependency and the figures come from the
repo's own script rather than a throwaway install:

```bash
pnpm test:coverage                                   # src/lib/** — the ratcheted scope
npx vitest run --coverage --coverage.include='src/**' # whole tree, for this document
```

`vitest.config.ts` scopes `coverage.include` to `src/lib/**` deliberately (see
TST-10). The whole-tree figures below are a one-off widening for analysis; they are
not what the thresholds are measured against.

| Metric     | Whole tree (`src/**`)         | Ratcheted scope (`src/lib/**`) |
| ---------- | ----------------------------- | ------------------------------ |
| Statements | 45.15 % (1690/3743) ← 37.59 % | 79.68 % (1271/1595)            |
| Branches   | 37.15 % (999/2689) ← 30.79 %  | 76.84 % (750/976)              |
| Functions  | 30.92 % (304/983) ← 26.14 %   | 73.68 % (224/304)              |
| Lines      | 46.17 % (1527/3307) ← 38.37 % | 83.02 % (1140/1373)            |

The denominators are unchanged from round 1, so the comparison is like-for-like:
1,407 → 1,690 covered statements, with no dilution from added source.

**Do not read the headline number as a grade.** Roughly half of `src/` is
presentational `.tsx` that this project has deliberately chosen not to test, and
`CLAUDE.md` is explicit that the suite is evidence rather than coverage.

Round 1's closing line was that the gaps were not in the calculators but in the code
that **moves the numbers around**: persistence, token lifecycle, route handlers, and
the audit trail. Three of those four are now largely closed. What is left is
narrower and more specific: the browser-side storage floor, the hooks layer between
storage and the UI, and a handful of server routes and guards that were never reached
at all.

---

## Where round 1 landed

| Finding                             | Status                           | Now                                                                                                          |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| TST-1 `use-user-data.ts` write path | ✅ closed (`386b626`)            | 54.5 % → **85.3 %** st, 33.6 % → **77.0 %** br                                                               |
| TST-2 `getValidAccessToken`         | ✅ closed (`259b934`)            | `hmrc/oauth.ts` 75 % → **95.2 %** st                                                                         |
| TST-3 six API routes at 0 %         | ✅ closed (2026-08-22)           | no route at 0 %; `src/app/api/**` at **92.35 %** stmts / **82.68 %** branches. TST-14 closed with it            |
| TST-4 drift-prone files             | ✅ closed (`a907847`, `c6671a5`) | four surfaces added, plus student-loan and annual-allowance figures                                          |
| TST-5 encrypted local storage       | 🟠 partial (`4c12269`)           | `secure-store` 64.2 % → **90.1 %**, `backup` 53.2 % → **72.3 %**; **`idb.ts` unmoved at 44.3 %** → TST-13    |
| TST-6 compliance claims             | ✅ closed (`1e70150`)            | `audit.ts` 0 % → **90.5 %**, `feature-flags.ts` 18 % → **90.9 %**                                            |
| TST-7 `calcScenario3` / `4`         | ✅ closed (`d11142b`)            | `tax-scenarios.ts` 68.4 % → **100 %**                                                                        |
| TST-8 logic in the wrong place      | 🟠 partial (`f607bb4`)           | `FilterBar` predicates extracted to `tracker/filter.ts`, **100 %**; the four hooks untouched → TST-15        |
| TST-9 component tests               | 🟠 partial (`207649b`)           | one component test → two (`SADeadlineBanner` at **95 %**)                                                    |
| TST-10 coverage tooling             | ✅ closed (`fc33608`, + TST-11)  | provider, script and thresholds added; CI wired to `test:coverage` and thresholds raised                     |

Six findings closed outright. The four that are partial are carried forward below as
new findings rather than left open, because in each case the remainder is a different
piece of work from the part that landed.

---

## Round 1 findings

### ✅ TST-1 — `use-user-data.ts`: the entire write path is untested

_Closed by `386b626`. Now 85.3 % st / 77.0 % br. The remaining uncovered block is the
remote-load-failure → local-snapshot fallback (lines 148–175), which is picked up by
TST-17._

`src/lib/use-user-data.ts` — 54.45 % statements, **33.62 % branches**.

The read side is well covered: `use-user-data.test.tsx` pins the DAT-5 session-race
behaviour, and `storage-sync.test.ts` pins DAT-1 (a partial local view must never
delete server rows). Neither touches `persist()`.

Uncovered, by line:

| Lines            | What is not exercised                                                                                                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 220–285          | **`persist()` in full**, including the DAT-5 fix — awaiting `sessionReadyRef` so a write fired during session resolution is attributed to the real account rather than to `guest`. The bug the comment describes (guest rows upserted into a signed-in user's account) has no regression test. |
| 255–271          | The 3-attempt retry with exponential backoff, and every `syncStatus` transition (`syncing` → `synced` / `error`).                                                                                                                                                                              |
| 332–362          | `emitAuditDiff` — the create/update/delete diffing that feeds the audit trail. 0 %.                                                                                                                                                                                                            |
| 415–449          | The server-newer conflict branch in `syncSupabaseRows`, including the functional-`setItems` fix the comment calls "the whole fix".                                                                                                                                                             |
| 148–183, 307–330 | The remote-load-failure → local-snapshot fallback, and the snapshot loader's own catch.                                                                                                                                                                                                        |

These are the paths whose comments cite real incidents. The comments are the only
thing holding them.

**Proposed:** extend the `makeFakeSupabase` harness already in `storage-sync.test.ts`
to cover `persist()` — write-during-resolve attribution, retry-then-succeed,
retry-exhausted → `syncStatus: 'error'`, the conflict merge publishing through
`setItems` without mutating the caller's array, and `emitAuditDiff` emitting exactly
one entry per changed row and none for unchanged ones.

---

### ✅ TST-2 — `getValidAccessToken` is 0 % and every MTD route depends on it

_Closed by `259b934`. `hmrc/oauth.ts` now 95.2 % st / 86.2 % br._

`src/lib/hmrc/oauth.ts` — 75 % statements, 65.5 % branches.

`refresh-single-flight.test.ts` covers the SEC-15 collapse thoroughly, but nothing
covers the function that actually calls it. `getValidAccessToken` (lines 239–269) is
entirely uncovered:

- the `REFRESH_SKEW_MS` boundary — token returned as-is vs. refreshed;
- `needsReauth` mapping (400/401 → re-auth, anything else → not);
- whether refreshed tokens are written onto the response cookie via `setTokensCookie`.

Also uncovered: `pruneRecent`'s `MAX_TRACKED_REFRESHES` hard bound (177–183), which
exists specifically because those map entries hold live tokens; and the "refresh
response missing required fields" → 502 branch (127–134).

**Proposed:** direct unit tests with a stubbed `fetch` and a fake `NextRequest` /
`NextResponse`, asserting on the returned discriminated union and on the `Set-Cookie`
written by the refresh branch.

---

### ✅ TST-3 — Six API routes at 0 %, including the OAuth callback

_**Closed 2026-08-22.** `2bd2a68` covered the callback, status and disconnect
routes; the rest landed with REFACTOR-PLAN Step 5. No route is at 0 %, and the
`src/app/api/**` tree measures **92.35 % statements / 82.68 % branches**._

| Route                               | Was  | Now (stmts) | Branches |
| ----------------------------------- | ---- | ----------- | -------- |
| `api/hmrc/auth/callback/route.ts`   | 0 %  | 95.83 %     | 83.33 %  |
| `api/hmrc/auth/start/route.ts`      | 0 %  | 94.44 %     | 66.66 %  |
| `api/hmrc/auth/disconnect/route.ts` | 0 %  | 100 %       | 100 %    |
| `api/hmrc/me/route.ts`              | 0 %  | 96 %        | 87.5 %   |
| `api/hmrc/status/route.ts`          | 0 %  | 100 %       | 100 %    |
| `api/payslip/parse/route.ts`        | 0 %  | 97.61 %     | 95 %     |
| `api/ai/categorise/route.ts`        | 31 % | 100 %       | 83.33 %  |
| `api/hmrc/mtd/it/submit/route.ts`   | 73 % | 88.23 %     | 78.57 %  |
| `api/hmrc/mtd/vat/submit/route.ts`  | 76 % | 86.95 %     | 80 %     |
| `api/hmrc/hello/route.ts`           | 78 % | 78.12 %     | 73.68 %  |

The percentage was never the point, and the last pass proves it: the two MTD
submit routes sat at 73–76 % on their guard tests alone, and the uncovered
quarter was where both defects in `docs/AUDIT.md` §10 were hiding — the
translation from our request body into HMRC's, and the cookies carried off the
auth placeholder. Coverage counted the lines; nothing asserted what was in the
request that left the building.

`api/hmrc/hello` is now the lowest at 78.12 %, and `auth/start` has the weakest
branch coverage at 66.66 %.

The callback route is the one to do first. It is the security boundary of the whole
HMRC integration — CSRF `state` verification, code exchange, token cookie write — and
it has no test at all.

**Proposed:** follow the pattern `hello-auth.test.ts` already establishes (module-mock
`@/lib/supabase-server`, `vi.stubGlobal('fetch', …)`, `vi.stubEnv` for HMRC config,
assert the fetch spy as the load-bearing check). It transfers to the callback route
almost unchanged.

---

### ✅ TST-4 — Four files print HMRC figures and are not in `DRIFT_PRONE_FILES`

_Closed by `a907847`, extended by `c6671a5`._

Hard rule #1 in `CLAUDE.md`: any file that shows tax figures to users belongs in
`DRIFT_PRONE_FILES` in `bands-drift-guard.test.ts`. These four are not in the list and
carry hard-coded thresholds and rates:

| File                                        | Literals found                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/app/validation/page.tsx`               | `12,570`, `37,700`, `125,140`, `5,000`, `20%`, `40%`, `60%` — worked examples |
| `src/features/tracker/TaxPotCalculator.tsx` | `£26,900`, `£29,385`, `£33,795`, `£25,000`, `£21,000`, `6%`, "60% trap"       |
| `src/features/tax/FullResultPanel.tsx`      | `£60,000` annual allowance, `£100k–£125,140`, NI `8%` / `6%`                  |
| `src/components/TaxEstimator2026.tsx`       | the same five student-loan thresholds, NI `6%/2%`                             |

`validation/page.tsx` is the worst of the four: it is the **public evidence page**,
five HMRC scenarios worked by hand. If a band moves in `bands-2026.ts`, that page keeps
asserting the old arithmetic while presenting itself as proof the engine is right.

This is the highest-leverage item in the document — roughly four lines of change turns
four silent drift surfaces into build failures.

---

### 🟠 TST-5 — Encrypted local storage: the restore path is untested

_Partially closed by `4c12269` — `secureRestoreAll`, `secureDumpAll` and the encrypted
backup branch. `idb.ts` did not move at all; carried forward as **TST-13**._

| File                              | Statements | Branches |
| --------------------------------- | ---------- | -------- |
| `src/lib/storage/idb.ts`          | 44.33 %    | 24.44 %  |
| `src/lib/storage/backup.ts`       | 53.19 %    | 78.94 %  |
| `src/lib/storage/secure-store.ts` | 64.19 %    | 64.70 %  |

Specifically uncovered:

- `secureRestoreAll` in **`replace` mode** (secure-store 200–221), which genuinely
  `idbDelete`s any record key absent from the incoming snapshot. A destructive
  operation over a user's only local copy of their books, with no test.
- `secureDumpAll` (181–196) — the decrypt-everything-for-backup loop, including its
  skip-corrupt-record branch.
- `createBackup`'s encrypted branch (backup 37–43) and `restoreBackup`'s
  decrypt-then-parse failure path (74–79).
- `idbDelete`, `idbKeys`, `idbClear` and `idbAuditRange` (idb 182–234) — none called
  by any test.

This is the guest / offline data path. A silent failure here loses a sole trader's
records with no server copy to fall back on.

---

### ✅ TST-6 — Compliance claims with no test behind them

_Closed by `1e70150`._

The repo's convention (hard rule #3) is that a doc claim gets a test. Two do not:

- **`src/lib/audit.ts` — 0 %.** `docs/AUDIT.md` AUD-2 describes the mirror's contract:
  best-effort, one retry, reported not swallowed, and **never throws** — an audit-write
  failure must not block the user's action. None of that is tested. Nor is the
  flag-off short circuit, nor `readAuditLog` returning `[]` when the flag is off.
- **`src/lib/feature-flags.ts` — 18 %.** AUD-1 says the audit trail is on by default;
  `DEFAULTS[FLAG_AUDIT] = true` has no test. While writing one, note an inconsistency
  worth pinning either way: `truthy()` accepts `'on'`, but the localStorage override
  branch only recognises `'1' | 'true' | '0' | 'false'`, so `ea:flags:audit = "on"`
  silently falls through to the env var instead of enabling the flag.

---

### ✅ TST-7 — `calcScenario3` and `calcScenario4` are uncovered

_Closed by `d11142b`. `tax-scenarios.ts` now 100 % st._

`src/lib/tax-scenarios.ts` — 68.42 %. `engine-parity.test.ts` checks scenarios 1, 2 and
5 against `calculateTax`; 3 and 4 (lines 229–297+) have no test at all. Both encode
HMRC rules the comments tie to specific findings:

- **Scenario 3 (Welfare & Support):** TAX-7 — JSA and Carer's Allowance are taxable but
  are _not earnings_, so only `otherIncome` forms the NI base. A regression here
  overstates NI for the lowest-income users in the product.
- **Scenario 4 (Job Loss & Redundancy):** the £30,000 redundancy exemption, part-year
  earnings, and the PAYE refund calculation.

Cheap to close and directly financial.

---

### 🟠 TST-8 — Logic that is untestable because of where it lives

_Partially closed by `f607bb4` — the `FilterBar` predicates moved to
`src/components/tracker/filter.ts` and are at 100 %. The four hooks are untouched;
carried forward as **TST-15**._

`CLAUDE.md` says new logic belongs in a testable module, not inside a page component.
Four places drifted from that:

| Location                                          | Lines     | Coverage     |
| ------------------------------------------------- | --------- | ------------ |
| `src/components/tracker/FilterBar.tsx`            | 342       | 0 %          |
| `src/features/tax/useTaxScenario.ts`              | 197       | 0 %          |
| `src/features/mileage/use-mileage-logic.ts`       | 128       | 0 %          |
| `src/lib/hooks/useExpenses.ts` / `useInvoices.ts` | 129 / 242 | 0 % / 21.5 % |

`FilterBar.tsx` is the clearest case: `matchesRange`, `matchesCategories` and
`matchesQuery` are **pure predicates exported from a `.tsx` component file** and
imported by `useExpenses`. Date-range and query matching over a user's expense
list, with nothing testing them. Moving them to `src/lib/` (or a sibling
`filter.ts`) makes them testable without touching React at all.

`use-mileage-logic.ts` is the near-miss: the mileage refactor extracted
`mileage-model.ts`, which is now at 100 %, but left the hook behind at 0 %.

---

### 🟠 TST-9 — Component tests: still one file

_Partially closed by `207649b` — `SADeadlineBanner.test.tsx`, now 95 % st. Two
component tests now (`InvoiceRow`, `SADeadlineBanner`); the suite has four `.tsx` test
files in total, the other two being the `use-user-data` hook tests._

`InvoiceRow.test.tsx` remains the only `.tsx` test, and it is a good template —
`// @vitest-environment happy-dom`, `fireEvent` rather than adding `user-event`,
assertions on both the status-machine guards and the VAT-treatment money output.

If the habit is to be extended at all, the candidates that render money or make
date decisions are the ones worth it: `FullResultPanel.tsx`, `TaxPotCalculator.tsx`,
`SADeadlineBanner.tsx` (112 lines of deadline logic, 0 %), and `ErrorBoundary.tsx`
(0 % — the component whose entire job is behaviour under failure).

---

### ✅ TST-10 — No coverage tooling in the repo

_Closed in two steps. `fc33608` added the provider, the `test:coverage` script and the
`src/lib/**` thresholds; TST-11 then wired CI to run them and took up the slack the
initial values left. The ratchet is live._

There is no `@vitest/coverage-v8` dependency, no `test:coverage` script, and no
coverage step in `.github/workflows/ci.yml`. Every number in this document required
a temporary install.

**Proposed, and deliberately narrow:** add the provider and a `test:coverage` script,
and set thresholds **on `src/lib/**` only** — that is the part of the codebase
`CLAUDE.md` calls the strongest and asks new work to match. A global threshold would
push the project toward testing presentational `.tsx` for the number's sake, which is
exactly the habit this repo has chosen against. Treat it as a ratchet on the logic
core, not a target for the whole tree.

---

## Round 2 findings

### ✅ TST-11 — The coverage ratchet is not wired into CI

_Closed. CI now runs `pnpm run test:coverage`, and the thresholds are raised to
77 / 74 / 72 / 81. Verified both directions: a threshold set above the measured value
fails the run with exit 1, and the same run without `--coverage` reports no threshold
error at all — which is the original diagnosis, confirmed._

`fc33608` added `@vitest/coverage-v8`, a `test:coverage` script and thresholds on
`src/lib/**`. `.github/workflows/ci.yml` runs:

```yaml
- name: Test
  run: pnpm test # → vitest run, no --coverage
```

`pnpm test` never evaluates `coverage.thresholds`, so the ratchet added in round 1
cannot fail a build. It is currently documentation.

There is also slack to take up. The thresholds were set just under the measured
baseline at introduction; the measured numbers have not moved since, so they still
sit 3–5 points low:

| Metric     | Threshold | Measured | Slack |
| ---------- | --------- | -------- | ----- |
| Statements | 75        | 79.68    | 4.68  |
| Branches   | 72        | 76.84    | 4.84  |
| Functions  | 70        | 73.68    | 3.68  |
| Lines      | 78        | 83.02    | 5.02  |

A ratchet with five points of slack permits a meaningful regression silently.

**Proposed:** change the CI step to `pnpm test:coverage`, and raise the thresholds to
just under the current measured values (77 / 74 / 72 / 81). Both are one-line changes
and together they are what makes every other finding in this document stay closed
once it is closed. Do this first — not because it adds a test, but because without it
nothing below is defended.

---

### 🔴 TST-12 — `hmrc/identity.ts` is at 0 % — a SEC-7 access control with no test

`src/lib/hmrc/identity.ts` — **0 % statements, 0 % branches**, 12 statements.

`resolveSubmissionUserId()` derives the `Gov-Client-User-IDs` fraud-prevention header
from the Supabase session server-side. Its own docblock records why:

> Previously the submit routes took it from the request body, where the browser had
> generated a random UUID into localStorage — so it identified nothing, and any caller
> could send any value they liked in a header whose entire purpose is to be
> trustworthy. (SEC-7)

and flags a deliberate behaviour change:

> ACCESS-CONTROL NOTE: this makes an authenticated Supabase session a requirement for
> submitting to HMRC. Previously the submit routes were gated only by the HMRC OAuth
> cookie, so a signed-out visitor who had completed the HMRC consent flow could file.

Four outcomes, none exercised: `getUser()` error → 401, thrown exception → 503 with
`reportError`, null user → 401, success → `{ ok: true, userId }`. This is the function
that decides whether a signed-out visitor can file a tax return, and hard rule #3 says
a claim like the one in that docblock gets a test.

It is worse than merely uncovered. The one test file that names the module,
`mtd-submit-rate-limit.test.ts`, mocks it wholesale:

```ts
vi.mock('@/lib/hmrc/identity', () => ({
  resolveSubmissionUserId: async () => ({ ok: true, userId: session.userId }),
}))
```

So every test that exercises an MTD submit route runs with the access-control gate
**stubbed permanently open**. That is a reasonable thing for a rate-limit test to do —
it is not testing identity — but it means the real function has never returned a
failure in any test, and the routes' behaviour when it does (401 vs 503, and whether
the submission is abandoned before HMRC is reached) is unverified from both directions.

`src/lib/auth-shared.ts` is in the same position — **0 %**, 8 statements — and it is
where hard rule #4 lives. `getCachedUser` is memoized with React `cache()` precisely
because a cross-request cache leaked one user's identity to everyone (SEC-1). Nothing
tests that the memo is per-request, nor that `error || !user` and the `catch` both
yield `null` rather than throwing into a route.

**Proposed:** module-mock `@/lib/supabase-server` exactly as `hello-auth.test.ts`
already does, and assert the discriminated union for all four `resolveSubmissionUserId`
outcomes plus the two `getCachedUser` failure modes. Roughly one small file; it
converts two written security claims into asserted ones.

---

### 🟠 TST-13 — `storage/idb.ts`: unmoved at 44.3 % / 24.4 %, and every comment in it is an incident report

Carried forward from TST-5. The rest of the storage stack moved; this file did not.

| File                              | Round 1 | Now         |
| --------------------------------- | ------- | ----------- |
| `src/lib/storage/secure-store.ts` | 64.19 % | **90.12 %** |
| `src/lib/storage/backup.ts`       | 53.19 % | **72.34 %** |
| `src/lib/storage/idb.ts`          | 44.33 % | **44.33 %** |

It is the lowest-branch file in `src/lib` (24.44 %) and the floor the whole offline
path stands on.

**What already covers it, and why that matters to the proposal.** The whole 44.33 %
comes from a single file: running `secure-store-write-failure.test.ts` on its own
reproduces 44.33 % / 24.44 % / 51.51 % / 50.58 % exactly. That test carries a
hand-rolled `installFakeIDB({ failWrites })` harness which drives real `openDB`, `tx`,
`idbSetStrict` and `idbSet` — so the write path, including **commit-time abort after
request success**, is genuinely tested, and there is a case named "idbSetStrict rejects
when the transaction aborts". `idb-put.test.ts` covers `putRecord` separately. The
other two files that name `@/lib/storage/idb` (`secure-store-restore.test.ts`,
`audit.test.ts`) `vi.mock` it wholesale and contribute nothing.

So this is not an untested module. It is a module with a good harness pointed at one
function, and five read/delete entry points the harness has never been aimed at:

| Uncovered          | Lines         | Called by any test?             |
| ------------------ | ------------- | ------------------------------- |
| `idbGet`           | 107, 115      | no                              |
| `idbDelete`        | 182–188       | no                              |
| `idbKeys`          | 190–201       | no                              |
| `idbClear`         | 203–210       | no                              |
| `idbAuditRange`    | 213–235       | no                              |
| `!hasIDB()` guards | 107, 156, 173 | no (harness makes it available) |

Three of `openDB`'s four failure modes are also unreached, and each has a comment
describing a bug fixed in production — the comment being the only thing holding it:

- **`onblocked` never settles** (58). A version upgrade blocked by another open tab
  fires neither `onsuccess` nor `onerror`; every caller awaits `openDB`, so the local
  store stalled silently with `loading` stuck on.
- **`indexedDB.open()` throws synchronously** (37–38) in a Firefox private window and
  under some enterprise storage policies, even though `window.indexedDB` exists.
- **A rejection must never be cached** in `dbPromise` (64), or one transient failure
  poisons every later call for the life of the page.

Plus `tx`'s synchronous-throw catch (86–87) and its `req.onerror` / `t.onerror` paths
(98, 101) — `t.onabort` is the one the existing harness reaches.

`idbAuditRange` deserves its own case: it resolves with whatever it has collected on
`req.onerror`, so a read failure returns a **partial audit log indistinguishable from a
complete one** — on the store `docs/AUDIT.md` AUD-2 calls authoritative.

**Proposed:** do not build a new harness — lift `installFakeIDB` out of
`secure-store-write-failure.test.ts` into a shared test helper and widen it. It already
settles through `onsuccess` / `onerror` / `oncomplete` / `onabort`; it needs
`onblocked`, a synchronous throw from `open()`, and cursor support for the `ts` index.
Then point it at the five uncovered entry points, plus the three `openDB` failure modes
and `dbPromise` being cleared after a rejection. Keep `vi.resetModules()` between
cases — `dbPromise` is module-level state, which is why that file already resets.

This is a smaller job than it first looked, and the harness is the reusable part: it is
also what TST-17 (2) needs.

---

### ✅ TST-14 — Three routes still at 0 %, including the only one that accepts a file

Carried forward from TST-3. **Closed 2026-08-22** — all four are now covered.

| Route                          | Was        | Now (stmts) | Branches |
| ------------------------------ | ---------- | ----------- | -------- |
| `api/payslip/parse/route.ts`   | **0 %**    | 97.61 %     | 95 %     |
| `api/hmrc/me/route.ts`         | **0 %**    | 96 %        | 87.5 %   |
| `api/hmrc/auth/start/route.ts` | **0 %**    | 94.44 %     | 66.66 %  |
| `api/ai/categorise/route.ts`   | 30.55 %    | 100 %       | 83.33 %  |

`api/hmrc/me` was the last of the four and turned out to be carrying a real
defect (MTD-8): it discarded a rotated single-use refresh token whenever the
probe it exists to perform failed. A route at 0 % is not merely unmeasured.

`payslip/parse` is the one to do. It is the only route in the app that accepts an
upload, it handles "the most personal document in the app" by its own description, and
it has four layered guards in sequence — none of them exercised:

1. `getUser()` → 401 for an anonymous caller (SEC-8);
2. `rateLimit(\`payslip:parse:${user.id}\`, 10, 60_000)`→ 429 with`Retry-After`
   (SEC-6 — the route's own comment calls it "the most expensive endpoint in the app
   per request");
3. `content-type` must be `multipart/form-data`;
4. `MAX_UPLOAD_BYTES` (8 MB) and the `ACCEPTED` MIME allow-list.

Guards 3 and 4 are the interesting ones because they are the reject-before-OCR path:
the module lazily imports `tesseract.js` so that a rejected request never pulls a
~15 MB WASM model into the container. A regression that reorders a guard past the
import is invisible to every existing test and expensive in production.

`auth/start` is small but is the other half of the OAuth boundary whose callback
`2bd2a68` just covered — it writes the CSRF `state` cookie that the callback verifies.
Covering one side and not the other leaves the pair unpinned.

**Proposed:** the `hello-auth.test.ts` pattern transfers directly — module-mock
`@/lib/supabase-server`, `vi.stubEnv` for HMRC config, and assert that the lazy
`tesseract.js` import is never reached on a rejected request (spy on the dynamic
import, or assert on elapsed work). For `auth/start`, assert the `state` cookie it
sets round-trips through the callback test's verification.

---

### 🟠 TST-15 — The hooks layer: the seam between storage and UI, 0–21 %

Carried forward from TST-8. `f607bb4` extracted the `FilterBar` predicates and they are
at 100 %. The hooks that consume them were not touched.

| File                                        | Statements | Branches |
| ------------------------------------------- | ---------- | -------- |
| `src/lib/hooks/useExpenses.ts`              | **0 %**    | 0 %      |
| `src/features/tax/useTaxScenario.ts`        | **0 %**    | 0 %      |
| `src/features/mileage/use-mileage-logic.ts` | **0 %**    | 0 %      |
| `src/lib/hooks/useInvoices.ts`              | 21.53 %    | 22.58 %  |

This is where money is turned into stored records, and it holds rules that live
nowhere else. `useExpenses.addExpense` is eleven lines and has two of them:

```ts
const amount = parseFloat(form.amount)
if (!amount || !form.description.trim()) return
await persist([{ id: newId(), ...form, amount }, ...expenses])
```

- `!amount` is falsy for `0`, so **a legitimate £0.00 expense is silently dropped** —
  no error, no form feedback, the row just never appears. `'0'` and `'0.00'` both hit
  it; so does any unparseable string, via `NaN`.
- `parseFloat('-5')` is truthy, so **a negative amount is persisted**.

The writer and the boundary guard disagree in _both_ directions, which is the part
worth pinning (measured, not inferred):

| `form.amount`    | `addExpense` writes it? | `isValidExpense` accepts it? |
| ---------------- | ----------------------- | ---------------------------- |
| `'0'` / `'0.00'` | no                      | **yes**                      |
| `'-5'`           | **yes**                 | no                           |
| `'12.50'`        | yes                     | yes                          |

Nothing tests either side (see TST-16). Today the disagreement is inert because the
guard has no call sites; wiring it in without first pinning this behaviour would turn
the second row into a row that saves and then vanishes on reload.

`useTaxScenario.ts` is additionally already listed in `DRIFT_PRONE_FILES`, so the
project has decided its tax content matters — but the guard only scans it for
hard-coded literals; nothing runs it.

**Proposed:** `renderHook` from `@testing-library/react` (already a dependency) under
`// @vitest-environment happy-dom`, with `@/lib/use-user-data` module-mocked so
`persist` is a spy. Assert what `persist` is called with rather than what renders —
that keeps these as logic tests, not component tests, and sidesteps TST-9's scope.
Start with `useExpenses`: the two boundary cases above are three assertions and pin a
live inconsistency.

---

### 🟡 TST-16 — `validators.ts`: boundary guards with no call sites

`src/lib/validators.ts` — 37.5 % statements, 50 % branches.

The file header calls these "Data boundary types and runtime guards for the two
primary entities". They guard nothing:

- **`isValidExpense` has zero call sites and zero tests.** Nothing in `src/` calls it.
- **`isValidInvoice` has zero production call sites.** Its only caller anywhere is
  `status-machine.test.ts`, which uses it to check the status enum and the guard stay
  in step — a test of `INVOICE_STATUSES`, not of the guard's own contract.

Every other importer of `validators.ts` (`useExpenses`, `useInvoices`,
`useInvoiceTransitions`, `status-machine`, `InvoiceRow`, `types/index.ts`,
`dashboard/expenses/page.tsx`) takes **types only**. So the runtime half of the module
is unreachable code, and the low coverage number is a symptom rather than the problem.

That matters because there genuinely is an untrusted boundary: `use-user-data` reads
rows back out of Supabase and out of the encrypted local snapshot, and neither path
validates the shape it gets. The `vatTreatment` check in `isValidInvoice` is exactly
the kind of thing that should run there — TAX-4 is explicit that `zero`, `exempt` and
`reverse_charge` all add £0 of VAT but must not be collapsed, because two of them
belong in the VAT return's turnover boxes and one does not.

**Proposed:** decide, then test the decision. Either wire the guards into the load path
in `use-user-data` / `secureRead` and test them there against real malformed input
(missing field, wrong type, negative amount, unknown status, unknown `vatTreatment`),
or delete them and drop the "runtime guards" claim from the header. Leaving them is
the one option that should not survive — it is documentation the code does not honour.

---

### 🟡 TST-17 — The default test environment is `node`, so the browser branches never run

`vitest.config.ts` sets `environment: 'node'` globally. Exactly **5 of 53 test files**
opt into a DOM via `// @vitest-environment happy-dom`. That is a reasonable default for
a repo whose strength is pure logic, but it silently inverts which branch gets tested
in any module that forks on environment.

`src/lib/storage/crypto.ts` is the clean example. Lines 70–80 are uncovered:

```ts
function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s) // ← never executed by any test
}
```

`Buffer` always exists under Node, so the tests take the `Buffer` branch every time and
the `btoa` / `atob` fallback has never executed in CI.

Which branch runs in the browser is genuinely unsettled, and that is the point. Next's
webpack config installs a `ProvidePlugin` that "makes sure `Buffer` and `process` are
polyfilled in client and flight bundles", so `Buffer` may well be defined in the
bundle — but `ProvidePlugin` substitutes free-variable _references_, and this guard is
a `typeof` test, which it does not necessarily rewrite. So one of two things is true
and nobody has checked which:

- the fallback is the live browser path, and the encryption helpers for a user's local
  books are tested exclusively on a path production never takes; or
- the fallback is dead code that has never run anywhere, presenting itself as a
  browser fallback.

A round-trip test is cheap and is correct under either reading — and if the answer
matters beyond that, it is one `npm run build` plus a grep of the client chunk to
settle permanently.

The same shape explains TST-13's branch number: `hasIDB()` is false under `node`, so
`idbGet`, `idbSet`, `idbDelete`, `idbKeys`, `idbClear` and `idbAuditRange` all return
their early "unavailable" value and the real bodies never execute. And it explains the
one block still uncovered in `use-user-data.ts` (148–175) — the remote-load-failure →
local-snapshot fallback, which needs a working local store to fall back to.

**Proposed:** two cheap things, in order.

1. Add a `bytesToB64` / `b64ToBytes` round-trip test that stubs `Buffer` to
   `undefined` (`vi.stubGlobal('Buffer', undefined)`) and asserts the `btoa` path
   agrees with the `Buffer` path byte-for-byte. Three assertions, closes the highest
   risk in this finding on its own.
2. When TST-13's widened `installFakeIDB` helper lands, it unblocks the
   `hasIDB()`-guarded bodies and the `use-user-data` fallback together — worth
   sequencing after it rather than standing up a second harness.

Not proposed: flipping the global default to `happy-dom`. That would slow the whole
suite for the sake of a handful of modules, and the per-file docblock is already the
established pattern here.

---

## Suggested order

1. ~~**TST-11**~~ — **done.** CI runs `pnpm run test:coverage`; thresholds raised to
   77 / 74 / 72 / 81. Everything below is now defended by a gate that can actually
   fail.
2. **TST-12** — `identity.ts` and `auth-shared.ts`. Small, and converts two written
   security claims (SEC-7, SEC-1) into asserted ones under hard rule #3.
3. **TST-13** — widen `installFakeIDB` and point it at the five uncovered entry
   points. Smaller than it first appears, since the harness already exists, and it is
   what unblocks TST-17 (2) and the last of TST-1.
4. ~~**TST-14** — `payslip/parse` first, then `auth/start` to close the OAuth pair.~~
   **Done 2026-08-22**, along with `me` and the two MTD submit routes. It paid for
   itself twice over: see `docs/AUDIT.md` §10 for the two defects it surfaced.
5. **TST-16** — decide what the validators are for. Cheap, and it resolves the
   inconsistency TST-15 trips over.
6. **TST-15** — start with `useExpenses`; the £0.00 and negative-amount cases are three
   assertions against live behaviour.
7. **TST-17** (1) — the `btoa` round-trip. Standalone and small; can be done at any
   point.

TST-9 remains open and unchanged in priority: last, and only where a component renders
money or decides a date. `ErrorBoundary.tsx` is still at 0 % and is still the component
whose entire job is behaviour under failure.
