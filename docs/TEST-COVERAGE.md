# EasyAcco — Test Coverage Analysis

_Snapshot taken 2026-08-10 against `270b510`. 870 tests across 43 files, all green
(one `describe.skipIf` block that needs real HMRC sandbox credentials)._

This is an analysis document, not a compliance record: nothing here is asserted by
a test. Findings carry a `TST-` id so they can be picked up individually.

---

## How the numbers were produced

The repo has **no coverage provider installed and no coverage step in CI**, so the
figures below came from a throwaway install that was reverted afterwards:

```bash
pnpm add -D @vitest/coverage-v8
npx vitest run --coverage.enabled --coverage.provider=v8 \
  --coverage.reporter=text --coverage.include='src/**' --coverage.all
```

| Metric     | Coverage             |
| ---------- | -------------------- |
| Statements | 37.59 % (1407/3743)  |
| Branches   | 30.79 % (828/2689)   |
| Functions  | 26.14 % (257/983)    |
| Lines      | 38.37 % (1269/3307)  |

**Do not read the headline number as a grade.** Roughly half of `src/` is
presentational `.tsx` that this project has deliberately chosen not to test, and
`CLAUDE.md` is explicit that the suite is evidence rather than coverage. The useful
signal is the split: 24 files sit at 100 %, and they are almost all the pure-logic
modules the codebase leans on — `tax-engine.ts`, `bands-2026.ts`, `tax/mileage.ts`,
`pnl/statement.ts`, `invoices/status-machine.ts`, `acco/context.ts`,
`transactions/cost-category.ts`, `tracker/aggregates.ts`, `dates.ts`,
`hmrc/crypto.ts`. `tax-logic.ts` is at 97.7 % across 951 lines.

The gaps are not in the calculators. They are in the code that **moves the numbers
around**: persistence, token lifecycle, route handlers, and the audit trail.

---

## Findings

### 🔴 TST-1 — `use-user-data.ts`: the entire write path is untested

`src/lib/use-user-data.ts` — 54.45 % statements, **33.62 % branches**.

The read side is well covered: `use-user-data.test.tsx` pins the DAT-5 session-race
behaviour, and `storage-sync.test.ts` pins DAT-1 (a partial local view must never
delete server rows). Neither touches `persist()`.

Uncovered, by line:

| Lines     | What is not exercised                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------- |
| 220–285   | **`persist()` in full**, including the DAT-5 fix — awaiting `sessionReadyRef` so a write fired during session resolution is attributed to the real account rather than to `guest`. The bug the comment describes (guest rows upserted into a signed-in user's account) has no regression test. |
| 255–271   | The 3-attempt retry with exponential backoff, and every `syncStatus` transition (`syncing` → `synced` / `error`). |
| 332–362   | `emitAuditDiff` — the create/update/delete diffing that feeds the audit trail. 0 %.                        |
| 415–449   | The server-newer conflict branch in `syncSupabaseRows`, including the functional-`setItems` fix the comment calls "the whole fix". |
| 148–183, 307–330 | The remote-load-failure → local-snapshot fallback, and the snapshot loader's own catch. |

These are the paths whose comments cite real incidents. The comments are the only
thing holding them.

**Proposed:** extend the `makeFakeSupabase` harness already in `storage-sync.test.ts`
to cover `persist()` — write-during-resolve attribution, retry-then-succeed,
retry-exhausted → `syncStatus: 'error'`, the conflict merge publishing through
`setItems` without mutating the caller's array, and `emitAuditDiff` emitting exactly
one entry per changed row and none for unchanged ones.

---

### 🔴 TST-2 — `getValidAccessToken` is 0 % and every MTD route depends on it

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

### 🟠 TST-3 — Six API routes at 0 %, including the OAuth callback

| Route                                | Statements |
| ------------------------------------ | ---------- |
| `api/hmrc/auth/callback/route.ts`    | 0 %        |
| `api/hmrc/auth/start/route.ts`       | 0 %        |
| `api/hmrc/auth/disconnect/route.ts`  | 0 %        |
| `api/hmrc/me/route.ts`               | 0 %        |
| `api/hmrc/status/route.ts`           | 0 %        |
| `api/payslip/parse/route.ts`         | 0 %        |
| `api/ai/categorise/route.ts`         | 31 %       |
| `api/hmrc/mtd/it/submit/route.ts`    | 73 %       |
| `api/hmrc/mtd/vat/submit/route.ts`   | 76 %       |
| `api/hmrc/hello/route.ts`            | 78 %       |

`CLAUDE.md` already names this weak spot ("no happy-path tests for API routes — only
their guards"), and the measurement agrees: the three partially-covered routes are
covered by their *guard* tests only.

The callback route is the one to do first. It is the security boundary of the whole
HMRC integration — CSRF `state` verification, code exchange, token cookie write — and
it has no test at all.

**Proposed:** follow the pattern `hello-auth.test.ts` already establishes (module-mock
`@/lib/supabase-server`, `vi.stubGlobal('fetch', …)`, `vi.stubEnv` for HMRC config,
assert the fetch spy as the load-bearing check). It transfers to the callback route
almost unchanged.

---

### 🟠 TST-4 — Four files print HMRC figures and are not in `DRIFT_PRONE_FILES`

Hard rule #1 in `CLAUDE.md`: any file that shows tax figures to users belongs in
`DRIFT_PRONE_FILES` in `bands-drift-guard.test.ts`. These four are not in the list and
carry hard-coded thresholds and rates:

| File                                       | Literals found                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `src/app/validation/page.tsx`              | `12,570`, `37,700`, `125,140`, `5,000`, `20%`, `40%`, `60%` — worked examples |
| `src/features/tracker/TaxPotCalculator.tsx`| `£26,900`, `£29,385`, `£33,795`, `£25,000`, `£21,000`, `6%`, "60% trap"       |
| `src/features/tax/FullResultPanel.tsx`     | `£60,000` annual allowance, `£100k–£125,140`, NI `8%` / `6%`                 |
| `src/components/TaxEstimator2026.tsx`      | the same five student-loan thresholds, NI `6%/2%`                            |

`validation/page.tsx` is the worst of the four: it is the **public evidence page**,
five HMRC scenarios worked by hand. If a band moves in `bands-2026.ts`, that page keeps
asserting the old arithmetic while presenting itself as proof the engine is right.

This is the highest-leverage item in the document — roughly four lines of change turns
four silent drift surfaces into build failures.

---

### 🟠 TST-5 — Encrypted local storage: the restore path is untested

| File                         | Statements | Branches |
| ---------------------------- | ---------- | -------- |
| `src/lib/storage/idb.ts`     | 44.33 %    | 24.44 %  |
| `src/lib/storage/backup.ts`  | 53.19 %    | 78.94 %  |
| `src/lib/storage/secure-store.ts` | 64.19 % | 64.70 % |

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

### 🟡 TST-6 — Compliance claims with no test behind them

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

### 🟡 TST-7 — `calcScenario3` and `calcScenario4` are uncovered

`src/lib/tax-scenarios.ts` — 68.42 %. `engine-parity.test.ts` checks scenarios 1, 2 and
5 against `calculateTax`; 3 and 4 (lines 229–297+) have no test at all. Both encode
HMRC rules the comments tie to specific findings:

- **Scenario 3 (Welfare & Support):** TAX-7 — JSA and Carer's Allowance are taxable but
  are *not earnings*, so only `otherIncome` forms the NI base. A regression here
  overstates NI for the lowest-income users in the product.
- **Scenario 4 (Job Loss & Redundancy):** the £30,000 redundancy exemption, part-year
  earnings, and the PAYE refund calculation.

Cheap to close and directly financial.

---

### 🟡 TST-8 — Logic that is untestable because of where it lives

`CLAUDE.md` says new logic belongs in a testable module, not inside a page component.
Four places drifted from that:

| Location                                         | Lines | Coverage |
| ------------------------------------------------ | ----- | -------- |
| `src/components/tracker/FilterBar.tsx`            | 342   | 0 %      |
| `src/features/tax/useTaxScenario.ts`              | 197   | 0 %      |
| `src/features/mileage/use-mileage-logic.ts`       | 128   | 0 %      |
| `src/lib/hooks/useExpenses.ts` / `useInvoices.ts` | 129 / 242 | 0 % / 21.5 % |

`FilterBar.tsx` is the clearest case: `matchesRange`, `matchesCategories` and
`matchesQuery` are **pure predicates exported from a `.tsx` component file** and
imported by `useExpenses`. Date-range and query matching over a user's expense
list, with nothing testing them. Moving them to `src/lib/` (or a sibling
`filter.ts`) makes them testable without touching React at all.

`use-mileage-logic.ts` is the near-miss: the mileage refactor extracted
`mileage-model.ts`, which is now at 100 %, but left the hook behind at 0 %.

---

### ⚪ TST-9 — Component tests: still one file

`InvoiceRow.test.tsx` remains the only `.tsx` test, and it is a good template —
`// @vitest-environment happy-dom`, `fireEvent` rather than adding `user-event`,
assertions on both the status-machine guards and the VAT-treatment money output.

If the habit is to be extended at all, the candidates that render money or make
date decisions are the ones worth it: `FullResultPanel.tsx`, `TaxPotCalculator.tsx`,
`SADeadlineBanner.tsx` (112 lines of deadline logic, 0 %), and `ErrorBoundary.tsx`
(0 % — the component whose entire job is behaviour under failure).

---

### ⚪ TST-10 — No coverage tooling in the repo

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

## Suggested order

1. **TST-4** — four lines, closes four silent tax-drift surfaces. Do this first.
2. **TST-1** — the `persist()` write path; highest data-loss risk in the codebase.
3. **TST-2** — `getValidAccessToken`; every MTD submission goes through it.
4. **TST-3** — the OAuth callback route, then the remaining zero-coverage routes.
5. **TST-5** — `secureRestoreAll` in `replace` mode before the rest of storage.
6. **TST-7**, **TST-6** — cheap, directly financial / directly compliance-facing.
7. **TST-8**, **TST-10** — structural; they make the rest easier rather than paying off alone.
8. **TST-9** — last, and only where a component renders money or decides a date.
