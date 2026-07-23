# AI Workflow

How EasyAcco was actually built — what AI was used for, where it was wrong, and what verification scaffolding exists because I can't trust codegen on something HMRC has to accept.

## Who's writing this

I'm a 19-year-old accounting student, not a software engineer. EasyAcco is my first non-trivial codebase. I built it with AI assistance — primarily Claude Code — because the alternative was spending 12 months learning React and TypeScript before writing a single line. AI compresses that ramp into a tool I can drive while reading the UK tax legislation, which is what I actually know.

This document is here because the workflow is the interesting part. The code is just the output.

## The rule that shapes everything

> **Spec first. Tutorial last.**

For UK tax and HMRC integration, AI's training data is full of half-correct tutorials. HMRC also updates its specs faster than blog posts re-publish. So the workflow is:

1. Open the HMRC developer hub page for the endpoint I'm targeting.
2. Read the request schema, error codes, scopes, headers in HMRC's own words.
3. Write a one-page "what this endpoint needs" note in plain English.
4. Hand that note to AI as the source of truth — "build this, not whatever you've seen before."
5. Diff what AI produced against the note. Where they disagree, the note wins. Where the note is wrong, fix the note.

This sounds obvious. It is not what most people do with AI. Most people ask "build me an HMRC submission flow" and accept the first plausible-looking thing that compiles. That route ends with HMRC rejecting your submission for `HEADER_INVALID_OR_MISSING` and you don't know why.

## What AI got wrong (and what caught it)

### Fraud Prevention Headers — the over-inclusion trap

HMRC's spec defines 16 `Gov-Client-*` / `Gov-Vendor-*` headers. For a `WEB_APP_VIA_SERVER` connection, three of those headers must be **omitted entirely** when the underlying data doesn't apply:

| Header                    | When to omit                                      | Why AI gets this wrong                                        |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `Gov-Client-Multi-Factor` | When MFA was not used in the user's login         | AI defaults to "always include all headers"                   |
| `Gov-Client-Public-Port`  | Excluded by spec for standard HTTPS:443           | Tutorials describe it as "always send the source port"        |
| `Gov-Vendor-License-IDs`  | When no third-party licensed software is involved | Sample code in HMRC's own dev hub includes it unconditionally |

If you send these with empty / placeholder values, HMRC rejects with header validation errors. If you send all 16, you don't get partial credit — you get refused.

What I did: read the [HMRC missing-data rules](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/) explicitly, decided which three to omit, and wrote the rationale into [`docs/HMRC.md`](docs/HMRC.md#fraud-prevention-headers-phase-3) before AI wrote a line of header code. The audit pane in the dashboard then surfaces the exact 13 headers actually sent on each submission, so I can verify against the spec every time.

Implementation: [`src/lib/hmrc/fraud-headers.ts`](src/lib/hmrc/fraud-headers.ts) · 25 unit tests in [`__tests__/fraud-headers.test.ts`](src/lib/hmrc/__tests__/fraud-headers.test.ts).

### The Vercel cookie bug — PR #24 → PR #26

The Phase 2 OAuth flow worked perfectly on localhost. In production on Vercel it failed every time with `missing_params` at the callback. The state cookie set by `/api/hmrc/auth/start` was not arriving at `/api/hmrc/auth/callback`.

Initial AI-written code:

```ts
const response = NextResponse.redirect(authorizeUrl)
response.cookies.set('hmrc_state', state, { httpOnly: true, secure: true, ... })
return response
```

This compiles, type-checks, runs locally on Node. On Vercel's edge runtime it **silently drops the `Set-Cookie` header from the serialised 302**. AI had no reason to flag this — it's a Next.js 16 + Vercel edge behaviour that isn't in the training data with enough signal.

How it got caught: I deployed it, the flow broke in prod, AI suggested all the wrong things (wrong domain, wrong cookie name, scope drift). I opened [PR #24](https://github.com/fionadbarad/easyacco/pull/24) to instrument the callback — surface every diagnostic field in the error response (cookie header presence, host, referer) — and ran the flow again. The instrumentation showed the state cookie was absent at the callback even though `start` had returned a 302. That pinned the bug to the redirect-cookie serialisation, not the cookie config.

Fix in [PR #26](https://github.com/fionadbarad/easyacco/pull/26): construct the 302 manually with `new NextResponse(null, { status: 302, headers })`, emit `Location` and `Set-Cookie` (multiple values via `Headers#append` for the dual clear+set on the success path) and `Cache-Control: private, no-store` to prevent the CDN caching the redirect.

The fix is six lines. Finding it took three deployments, a debug PR, and the willingness to **not** trust AI's first three suggestions. The point isn't that AI was wrong here — it's that "AI confidently suggests a wrong fix" is itself a failure mode you have to plan for.

### Coded errors — the silent-omission trap

HMRC's MTD endpoints return error codes like `RULE_OVERLAPPING_PERIOD`, `VRN_INVALID`, `MATCHING_RESOURCE_NOT_FOUND`. AI's first draft of [`mtd-errors.ts`](src/lib/hmrc/mtd-errors.ts) covered the MTD-IT codes well and **silently omitted** the MTD-VAT codes entirely — the request looked complete because the dictionary was populated, but every VAT error would have fallen through to the generic `Submission failed` message in production.

How it got caught: the test file forces every code path to a known message. Adding a VAT test → undefined message → forced me to expand the dictionary to the full VAT code set from HMRC's OpenAPI spec.

Lesson: tests that assert "for every error code in HMRC's spec, our app produces a non-generic message" are how you catch silent omission, not by reading the dictionary.

## What I built so I don't have to trust AI

### Engine validation page — [`/validation`](src/app/validation/page.tsx)

Five worst-case UK 2026/27 scenarios — 60% trap, PA fully tapered, Scottish starter rate, director optimal mix, additional rate + dividends — are **worked by hand in plain arithmetic** on the page alongside the live engine's output, every assertion checked to the penny. Computed server-side on every request. If any cell flashes red the engine has drifted from the manual calc — that is a blocking bug.

I wrote each scenario's arithmetic myself, reading the legislation. The page is a public proof that the engine actually does what the law says, not what AI thinks the law says.

### Audit pane on every MTD submission

The HMRC dashboard at [`/dashboard/hmrc`](src/app/dashboard/hmrc/page.tsx) has an "exact fraud headers sent" pane that expands after every submission. I can paste the 13 header values straight into the [HMRC spec page](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/) and verify line by line. No "trust me, the headers are right" — they're right there.

### Test suite

6,625 tests across 119 files (Vitest). The HMRC modules specifically:

- [`fraud-headers.test.ts`](src/lib/hmrc/__tests__/fraud-headers.test.ts) — 25 tests covering every required field, every encoding rule, every omission case
- [`mtd-errors.test.ts`](src/lib/hmrc/__tests__/mtd-errors.test.ts) — every documented error code maps to a non-generic message
- [`crypto.test.ts`](src/lib/hmrc/__tests__/crypto.test.ts) — AES-256-GCM encrypt → decrypt round-trip, byte-flip detection
- [`oauth.test.ts`](src/lib/hmrc/__tests__/oauth.test.ts) — token refresh boundary conditions, state CSRF validation

Tests are the receipt. AI can write code that compiles and looks right. Tests force AI to defend code that has to actually behave right.

### Strict TypeScript

`tsc --noEmit` runs clean on every commit. Strict mode catches the class of bug where AI invents a field on a type that doesn't exist — "you reference `response.foo` but `Response` has no `foo`" is the kind of catch that saves you from deploying nonsense.

## What's still hard

Three honest weaknesses:

1. **I cannot fully read the code I commit.** I can follow the shape — what's a function, what's a route, what's a hook — but for any sufficiently large file I'm reasoning from naming + comments + tests, not from the implementation. The mitigation is the test suite + validation page + audit pane: if those agree, the implementation is doing what the spec says even if I can't trace every line.

2. **HMRC sandbox ≠ HMRC production.** Sandbox lets us pass with omitted fraud headers; production rejects. The full Phase 3 implementation targets production-shaped requests on the sandbox, but the only way to confirm is the sandbox-acceptance + manual spec audit. We have not submitted to live production HMRC (that requires a production API key, which requires onboarding I'm not doing for a portfolio project).

3. **Refresh-token storage is in an encrypted cookie, not a database.** This is fine for a single-user demo and avoids a whole class of "we leaked your tokens" disasters because the tokens never exist in our database. It would not scale to multi-user production — you'd want per-user encrypted rows with a per-user key. Documented as a deliberate scope cut, not an oversight.

## Bottom line

AI let me ship a working HMRC integration as a 19-year-old who doesn't know React. It did not let me ship it carelessly — every piece of AI-generated code passed through (a) a spec note I'd written first, (b) a test that forced it to defend its behaviour, and (c) a user-visible audit surface that lets me verify against the spec on every run.

The interesting thing isn't that AI built the code. It's that the verification scaffolding around the code is what makes the code trustworthy. That's the engineering judgement — knowing which corners cannot be cut even when AI is happy to cut them for you.
