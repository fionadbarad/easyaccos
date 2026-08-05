# Refactor plan — code quality

**Do not start any of this until the HMRC re-submission has gone in.** See
`docs/HMRC-SUBMISSION-PLAN.md`. None of the work below improves the submission,
and all of it carries regression risk.

Written to be executed one step per session, by any model, with no memory of the
conversation that produced it. Read `CLAUDE.md` first.

**Every step ends the same way.** A step is not finished until this passes:

```bash
npx tsc --noEmit && npx vitest run && npm run lint && npm run build
```

Steps are independently shippable and ordered by value. Do them in order; stop
whenever you like.

---

## Step 1 — Delete the orphaned Acco context module

**Why:** `src/lib/acco/context.ts` and `types.ts` existed to build a prompt for
`/api/ai/chat`, which was deleted on 4 August 2026. They have no production
caller. Dead code with passing tests survives forever.

**Do:**

1. Confirm it is still orphaned: `grep -rn "lib/acco\|buildContextPrompt" src --include=*.ts --include=*.tsx`
   — expect hits only inside `src/lib/acco/` and `src/lib/__tests__/acco-context.test.ts`.
2. Delete `src/lib/acco/` and `src/lib/__tests__/acco-context.test.ts`.
3. Remove `'src/lib/acco/context.ts'` from `DRIFT_PRONE_FILES` in
   `src/lib/__tests__/bands-drift-guard.test.ts` — that guard reads each listed
   file from disk and will throw on a missing one.
4. `docs/AUDIT.md` references SEC-4 against `buildContextPrompt`. Leave the
   historical row alone; it records a finding resolved at a point in time.

**Expected:** test count drops by roughly the size of `acco-context.test.ts` plus
one drift-guard case. Nothing else changes.

---

## Step 2 — Extract the scenario data out of `/validation`

**Why:** `src/app/validation/page.tsx` is 579 lines of fixture data, assertion
logic and markup in one file. The five hand-worked HMRC scenarios in it are the
most valuable evidence in the repo and they are currently untestable without a
browser.

**Do:**

1. Create `src/features/tax/validation-scenarios.ts`. Move into it: the
   `Scenario` interface, `baseInput()`, the `SCENARIOS` array, and the helpers
   `pickAssertion()`, `fmtVal()` and `bucketErrors()`.
2. Export a pure `runScenarios()` that maps each scenario through
   `calculateTax` and returns `{ scenario, result, assertions: { path, expected, actual, pass }[] }`.
3. `page.tsx` imports `runScenarios()` and renders it. Target: page under 250
   lines, no arithmetic left in the component.
4. Add `src/features/tax/__tests__/validation-scenarios.test.ts` asserting every
   scenario passes — the same claim the page makes visually, now enforced by CI.
5. Add `src/features/tax/validation-scenarios.ts` to `DRIFT_PRONE_FILES` in
   `bands-drift-guard.test.ts`: it will contain user-facing tax figures.

**Watch for:** the scenarios contain deliberate hard-coded expected values (the
hand-worked column). Those are the point — they must NOT be derived from
`bands-2026.ts`, or the test proves nothing. The drift guard distinguishes
user-facing _copy_ from test fixtures; check how existing entries are handled
before adding the file, and if the guard objects, keep the fixtures in the test
file instead.

---

## Step 3 — Extract the mileage page's logic

**Why:** same problem, second-largest offender, and it is already listed in
`DRIFT_PRONE_FILES` because it once held five AMAP rates of its own.

**Do:**

1. Move entry aggregation, per-vehicle totals and the tax-saving estimate out of
   `src/app/dashboard/mileage/page.tsx` into `src/features/tracker/mileage-aggregates.ts`
   (there is already a matching pattern in `src/features/tracker/aggregates.ts`).
2. Test the extracted module in `src/features/tracker/__tests__/`.
3. Leave rendering, `useState` and `useUserData` in the page.

---

## Step 4 — One styling system

**Why:** the codebase runs two in parallel — inline `C`/`T` token objects
(`src/app/dashboard/mileage`, `currency`, `src/components/ReceiptScanner.tsx`)
and Tailwind v4 utility classes (`src/app/validation`, `src/app/dashboard/payslip`).
Every visual change currently has to be made twice, and the type scale can drift
between them.

**Direction: Tailwind.** The tokens already exist as CSS variables in the
`@theme` block of `src/app/globals.css` (`--color-sa-*`, `--text-*`), which is
what the utility classes consume. The inline objects are the legacy half.

**Do — one file per session, smallest first:**

1. `src/features/shell/NoticeBanner.tsx`, `OfflineChip.tsx`
2. `src/components/ReceiptScanner.tsx`
3. `src/app/dashboard/currency/page.tsx`
4. `src/app/dashboard/mileage/page.tsx` (do Step 3 first — it shrinks this file)

**Rule:** map each inline value to the matching token
(`C.border` → `border-sa-border`, `T.caption` → `text-caption`). Do not invent
new colours or sizes. `src/lib/__tests__/contrast.test.ts` guards palette
ratios — if it fails, the mapping was wrong, not the test.

---

## Step 5 — Happy-path tests for the API routes

**Why:** every route currently tests only its guards (401, 404, 429). What the
routes actually _do_ is unverified. `src/app/api/payslip/parse/route.ts` has no
test at all.

**Do:** for `payslip/parse`, then the HMRC routes:

1. Mock `@/lib/supabase-server` so `auth.getUser()` returns a user.
2. For `payslip/parse`, mock the dynamic `tesseract.js` import to return fixed
   OCR text, and assert the 200 body shape, plus 400 with `issues` and `partial`
   for unreadable text, 413 for oversize, 415 for a PDF.
3. Follow the existing style in `src/app/api/hmrc/__tests__/`.

---

## Step 6 — Environment hygiene

Small, unglamorous, saves hours.

1. `pnpm approve-builds`, then commit real booleans into `pnpm-workspace.yaml` —
   it currently holds literal `set this to true or false` placeholders, so
   `tesseract.js` and three others skip their build scripts.
2. Add `package-lock.json` to `.gitignore`; `pnpm-lock.yaml` is the tracked one.
3. Consider narrowing the `.next/types/**` entries in `tsconfig.json`, which are
   what makes `tsc --noEmit` and `next build` corrupt each other's state.
4. **Move the project off the OneDrive path.** This is the highest-value item in
   this file. Under `C:\Users\barad\OneDrive\…` the dev server serves stale
   bundles, `node_modules` has been wiped mid-session, and every debugging
   session risks being spent on code that is not running.

---

## Step 7 — Revisit the payslip parser against real input

`src/features/ocr/payslipParser.ts` is covered by 31 tests, all against
hand-written approximations of tesseract output. It has never seen a real photo.

Take three real payslips from different employers, run them through
`/dashboard/payslip`, and widen the label patterns (`GROSS`, `TAX`, `NI`,
`TAX_CODE_LINE`) for whatever fails. Add each real OCR string as a fixture —
with employer name and figures changed — so the coverage becomes real.
