# AI_WORKFLOW.md

How EasyAcco was built with AI tools (Claude Code, Claude Sonnet/Opus). The
project is small, self-hosted, and deliberately dependency-light, but two
areas needed adversarial rigour: the HMRC 2026/27 tax engine and the
client-side AES-GCM encryption layer. This file documents how AI was used
for each without leaving the user exposed to hallucinated rules or
home-grown crypto.

---

## Principle: AI drafts, tests arbitrate

The guiding rule across the project is that the model is allowed to
propose code, but the source of truth is always a test or an HMRC
publication — never the model's confidence. Every AI-assisted change
lands with one of:

- a unit test pinning a known-good number,
- a diff-test proving two independent implementations agree,
- or a manual HMRC worked example committed alongside the code.

The `/validation` route (see [src/app/validation/page.tsx](src/app/validation/page.tsx))
exists precisely for this: five scenarios with hand-calculated numbers
shown next to live engine output, so a reviewer can eyeball whether the
engine still matches HMRC.

---

## HMRC tax rules → code

### 1. Source the rules by hand

HMRC bands, thresholds, and taper rules were transcribed from
gov.uk publications into
[src/lib/tax-bands-2026.ts](src/lib/tax-bands-2026.ts). AI was **not**
asked to recall the numbers. Transcription is cheap; hallucinated
bands are a compliance liability. The file has exactly one copy of each
constant and is re-exported wherever a band is needed.

### 2. Prompt for scaffolding, not for arithmetic

When adding a new calculation path (e.g. the 60% personal-allowance
taper, Scottish starter/basic/intermediate split, Class 4 NI upper-rate
step), the prompt pattern was:

> Here is the existing `calculateTax` structure and the 2026/27 band
> constants. Implement the taper for adjusted net income between
> £100,000 and £125,140 where the personal allowance reduces by £1
> for every £2 above £100,000. Write the test first, using HMRC's
> worked example at £110,000 → PA of £7,570.

The test comes **in the same prompt** as the implementation request,
with a known-good number. That number is HMRC's, not the model's.

### 3. Diff-test against a second implementation

`src/lib/__tests__/tax-engine-diff.test.ts` runs a matrix of inputs
through both `calculateTax` (the production engine) and the scenario
calculators in `TaxBible2026.ts` and asserts they agree to the penny.
Two engines written independently are much harder to get wrong than
one — and if the AI regresses a branch in either, the diff-test fires.

### 4. Always render a validation page

[src/app/validation/page.tsx](src/app/validation/page.tsx) renders
five representative UK scenarios server-side with manual HMRC
breakdowns next to live engine output. The page is public and linked
from the security page. When a rule changes, you update the manual
numbers and the engine at the same time and the page tells you
whether they still agree.

---

## Client-side encryption

Backup files are AES-GCM encrypted with a key derived from the user's
passphrase via PBKDF2 (SHA-256, 310,000 iterations). See
[src/lib/storage/crypto.ts](src/lib/storage/crypto.ts).

### Rule: don't roll your own crypto — and don't let the model either

The entire crypto layer is **WebCrypto SubtleCrypto**. No custom
ciphers, no custom KDFs, no "clever" padding. The AI was used for:

- **Plumbing**: base64 helpers, envelope shape, error messages.
- **Parameter choices anchored to a published standard** (OWASP 2023
  password storage cheat sheet: PBKDF2-SHA256 at 310k iterations).
- **Test coverage** of the envelope codec — round-trip, wrong
  passphrase rejection, missing passphrase rejection, malformed
  payload. See [src/lib/__tests__/backup.test.ts](src/lib/__tests__/backup.test.ts).

The AI was **not** trusted for:

- choosing iteration counts from memory,
- inventing an envelope format,
- selecting modes (AES-GCM was chosen because it is an AEAD; the model
  did not propose a GCM-vs-CBC tradeoff).

### Envelope shape is versioned

The `PassphraseEnvelope` type carries `v: 1`, the KDF name, the hash,
the iteration count, and the salt alongside the ciphertext. A future
rotation (e.g. bumping iterations or switching to Argon2id) adds
`v: 2` handling without breaking old backups. AI-assisted changes to
this file must preserve the version check.

---

## Prompt patterns that worked

- **Anchor to files, not features.** "Here is `tax-logic.ts` and
  `tax-bands-2026.ts`. Add X." beats "add a Scottish tax calculator".
- **Ship the test in the same turn.** Implementation without a test
  is a draft, not a deliverable.
- **Refuse recall for regulated numbers.** HMRC bands, PBKDF2
  iterations, VAT thresholds — paste them, don't prompt them.
- **Diff-test two implementations.** The tax engine has two; they
  agree on every commit via CI.
- **Small PRs with one concern.** Phase 5 alone is six commits: one
  per concern (Tailwind, TS lockdown, logic extraction, test
  expansion, validation route, this doc).

## Prompt patterns that failed

- Asking for "the current HMRC rate for X" — always verify.
- Asking for "best practice" KDF parameters — anchor to OWASP
  cheat sheet version instead.
- Accepting generated test numbers without re-deriving them from a
  published worked example.

---

## Running the validation

```
npm test              # 367 tests, includes tax diff-tests and crypto round-trip
npm run build         # type-checks and builds the /validation route
npx tsc --noEmit      # strict + noUncheckedIndexedAccess
```

Open `/validation` in the running app to see the five HMRC scenarios
render with pass/fail status against the engine.
