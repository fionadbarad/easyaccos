# easyacco — working notes for Claude

UK Self Assessment and Making Tax Digital software for sole traders. Next.js 16
App Router, React 19, TypeScript 6 (`strict` + `noUncheckedIndexedAccess`),
Tailwind v4, Supabase (auth + storage), Vitest, deployed on Vercel.

Read this before touching anything. It records the traps that cost hours to
rediscover.

---

## Verification gates

Nothing is "done" until all four pass. Run them in this order:

```bash
npx tsc --noEmit && npx vitest run && npm run lint && npm run build
```

**The shell here is Windows PowerShell 5.1, which has no `&&`.** That line works
in Git Bash; in the PowerShell terminal it fails with
`The token '&&' is not a valid statement separator in this version`. Use:

```powershell
npx tsc --noEmit; if ($?) { npx vitest run }; if ($?) { npm run lint }; if ($?) { npm run build }
```

Same trap for multi-line strings: PowerShell 5.1 mangles a here-string that
contains double quotes, so `git commit -m @'…'@` can break apart into pathspec
errors. Write the message to a file and use `git commit -F <file>`.

- `npm run lint` runs ESLint with no arguments — it is configured in
  `eslint.config.mjs`, so do not pass paths. One pre-existing warning in
  `postcss.config.mjs` is expected; **errors** are not.
- React Compiler rules are active. `react-hooks/set-state-in-effect` is an
  **error**: seed state lazily with `useState(() => …)` rather than writing it
  from an effect.

## Environment traps

**The dev server cannot be trusted on this machine.** The project lives under a
OneDrive-synced path (`C:\Users\barad\OneDrive\Desktop\…`), where Turbopack's
file watcher misses changes. `npm run dev` will happily serve a bundle from
several edits ago, through server restarts and cache deletion. If browser
behaviour contradicts the source, **verify against a production build** rather
than debugging the source:

```bash
npm run build && npx next start --port 3001
```

`.claude/launch.json` has an "EasyAcco (production build)" entry for this.

**Never `rm -rf .next` while a dev server is running.** It corrupts the running
server's state and it will serve stale output until stopped and restarted.

**`tsc --noEmit` and `next build` fight.** `tsconfig.json` includes
`.next/types/**` and `.next/dev/types/**`, so generated route types from one
tool become stale roots for the other. Symptom: `TS2307: Cannot find module
'…/route.js'` or "File … not found. Root file specified for compilation" for a
file you did not touch. Fix:

```bash
rm -f tsconfig.tsbuildinfo && rm -rf .next
```

**pnpm is the package manager.** `pnpm-lock.yaml` is the only lockfile tracked
in git; any `package-lock.json` is a stray. `pnpm-workspace.yaml` currently
holds literal placeholders (`'@google/genai': set this to true or false`), so
build scripts are skipped for `@google/genai`, `protobufjs`, `tesseract.js` and
`unrs-resolver`. Run `pnpm approve-builds` and commit real booleans when
touching anything OCR-related.

**`main` moves under you.** More than one session works this repo. Check
`git log --oneline -3` before starting and commit early.

---

## Hard rules

**1. Every HMRC rate and threshold lives in `src/lib/tax/bands-2026.ts`.**
Nowhere else — not in prose, not in a prompt, not in a page component.
`src/lib/__tests__/bands-drift-guard.test.ts` scans a list of drift-prone files
for hard-coded numbers and fails the build if it finds one. Adding a file that
shows tax figures to users? Add it to `DRIFT_PRONE_FILES` in the same change.

**2. AI features are off by default and the disclosure moves with the flag.**
`src/lib/ai-enabled.ts` reads `NEXT_PUBLIC_EA_AI`. HMRC declined production
credentials partly over third-party data sharing, so `/privacy` and `/security`
currently state that no data goes to Google. **If AI is ever re-enabled, those
disclosures must be restored in the same commit** — see the "AI features
switched off" section of `docs/COMPLIANCE.md`.
`src/lib/__tests__/ai-disabled.test.ts` holds this true.

**3. Compliance docs make testable claims.** When a claim in `docs/` changes,
the test that backs it changes too. Examples: `ai-disabled.test.ts` asserts the
deleted chat route is absent from disk; `privacy-notice.test.ts` checks the
notice; `contrast.test.ts` checks palette ratios. Do not weaken a doc claim
without saying so out loud.

**4. Auth is `supabase.auth.getUser()`, never `getSession()`.** `getSession()`
only reads the cookie. See `docs/AUDIT.md` SEC-8.

**5. Commits carry no `Co-Authored-By` trailer** in this repo.

---

## Layout

| Path                        | What lives there                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/`                  | Pure logic + its `__tests__/`. Tax engine, HMRC OAuth, crypto, rate limiting, monitoring. The strongest part of the codebase — match its style. |
| `src/lib/tax/bands-2026.ts` | Single source of truth for every rate and threshold                                                                                             |
| `src/features/`             | Feature UI grouped by domain (`tax/`, `tracker/`, `ocr/`, `shell/`)                                                                             |
| `src/app/`                  | Routes. `api/hmrc/*` is the MTD surface; `api/ai/categorise` is flag-gated                                                                      |
| `src/app/validation/`       | Public evidence page: five HMRC scenarios worked by hand against engine output. Not a document-upload page.                                     |
| `docs/`                     | `COMPLIANCE.md` (HMRC remediation record), `AUDIT.md` (finding log), `PENTEST-SCOPE.md`, `HMRC.md` (sandbox integration)                        |

## Testing conventions

Tests sit in `__tests__/` beside the code, except `src/features/ocr/`. The suite
is ~1,085 tests and is used as **evidence**, not coverage: several files exist
to hold a compliance claim true rather than to test a function. Keep that habit.

Weak spot to be aware of: almost no component tests — two of them, plus two
hook tests, in the whole suite. New logic belongs in a testable module under
`src/lib/` or `src/features/`, not inside a page component.

The API routes were the other weak spot and are no longer — `src/app/api/**` is
at ~92 % statements. When you touch one, test **the request that leaves the
building**, not only the status code that comes back: the outbound URL, body
shape and headers, and the cookies carried from the auth placeholder onto the
real response. Both defects found in that work (`docs/AUDIT.md` §10) lived in
exactly that gap, and every guard test walked straight past them.
