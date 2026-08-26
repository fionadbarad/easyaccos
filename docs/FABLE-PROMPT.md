# Prompts to run the backlog with Fable

Copy one block, replace `<ITEM>`, paste. **One item per session** — that is the
main thing that keeps the cost down.

---

## The prompt (reusable — swap the item number)

```
Do item <ITEM> from docs/IMPROVEMENTS-BACKLOG.md in the easyaccos repo.

Work like this, to keep the session cheap:

1. Read docs/IMPROVEMENTS-BACKLOG.md and find item <ITEM>. Read ONLY that item.
2. Read ONLY the files that item names. Do not explore the tree, do not grep
   broadly, do not read the other docs. The item is self-contained by design.
3. Do NOT re-measure coverage or re-audit anything. The numbers in the backlog
   were verified on main @ 11c7619. Trust them.
4. Make the change.
5. Verify: run the single test file the item names first. Only once that passes,
   run the full gates ONCE:
   npx tsc --noEmit && npx vitest run && npm run lint && npm run build
   (One pre-existing warning in postcss.config.mjs is expected. Errors are not.)
6. Commit and push to branch claude/improvements-needed-g0ct9t, then open a
   draft PR.

Rules:
- Read CLAUDE.md first. Its hard rules apply — especially: every HMRC rate lives
  in src/lib/tax/bands-2026.ts, and commits carry NO Co-Authored-By trailer.
- Stay inside the item's scope. If you spot something else worth doing, add it
  to docs/IMPROVEMENTS-BACKLOG.md as a new item instead of fixing it now.
- If the item turns out to be wrong or already done, say so and stop. Do not
  invent replacement work.
- Do not re-run the gates more than once unless something failed.
```

---

## Pre-filled for the recommended first item (1.1)

```
Do item 1.1 from docs/IMPROVEMENTS-BACKLOG.md in the easyaccos repo — add a test
for src/lib/hmrc/identity.ts, which is at 0% and is the whole implementation of
the SEC-7 access control.

Work like this, to keep the session cheap:

1. Read ONLY: docs/IMPROVEMENTS-BACKLOG.md item 1.1, src/lib/hmrc/identity.ts,
   and src/app/api/hmrc/__tests__/hello-auth.test.ts (for the mocking pattern).
   Nothing else. Do not explore the tree or re-audit.
2. Create src/lib/hmrc/__tests__/identity.test.ts covering the four branches the
   item lists.
3. Verify: npx vitest run src/lib/hmrc/__tests__/identity.test.ts
   Then once, if that passes:
   npx tsc --noEmit && npx vitest run && npm run lint && npm run build
4. Commit and push to claude/improvements-needed-g0ct9t, open a draft PR.

Rules: read CLAUDE.md first; no Co-Authored-By trailer in commits; stay in scope;
do not re-measure coverage.
```

---

## Batching, if you want more than one item per session

Only batch items the backlog marks as independent **and** trivial. This pairing
is safe and is the cheapest real win available:

```
Do items 1.3 and 2.3 from docs/IMPROVEMENTS-BACKLOG.md — both are edits to
.env.example only, adding four environment variables the code reads but the file
never documents.

Read ONLY the backlog entries for 1.3 and 2.3, and .env.example. Do not explore.
Add the four variables with one-line comments. NEXT_PUBLIC_APP_VERSION is the
important one — it feeds Gov-Vendor-Version on every HMRC submission and silently
defaults to 1.0.0 when unset.

Verify with: npm run lint && npm run build (no test change, so the full suite is
not needed). Commit, push to claude/improvements-needed-g0ct9t, open a draft PR.

Read CLAUDE.md first. No Co-Authored-By trailer.
```

---

## Why these prompts are shaped this way

Each instruction maps to a specific way sessions burn credits on this repo:

| Instruction | What it prevents |
| --- | --- |
| "Read ONLY the files the item names" | A full-tree exploration before the first edit — usually the single largest cost. |
| "Do NOT re-measure coverage" | `vitest --coverage` over `src/**` is a full test run. The backlog already carries the numbers. |
| "Run the single test file first" | Catching a mistake in ~1s instead of after a ~12s suite plus a ~40s build. |
| "Run the gates ONCE" | The common failure mode of re-running all four after every small edit. |
| "One item per session" | Context growth — a long session re-sends everything already in it on every turn. |
| "Add new findings to the backlog instead of fixing them" | Scope creep, which turns a 10-minute item into an hour. |

The backlog was written to make the first two possible: every item carries its
exact path, the problem, the fix, and the command that proves it worked, so
there is nothing to re-derive.
