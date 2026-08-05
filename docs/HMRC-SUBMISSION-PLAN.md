# HMRC re-submission — plan

Written Wednesday 5 August 2026. Application declined 31 July 2026.
`docs/COMPLIANCE.md` is the remediation record; this file is the schedule for
closing what is left.

---

## About the 7 August date — read this first

**7 August 2026 is a deadline for taxpayers, not for this software.** It is the
first Making Tax Digital for Income Tax quarterly update deadline, covering
6 April – 5 July 2026, for sole traders and landlords with qualifying income
over £50,000. The following ones are 7 November 2026, 7 February 2027 and
7 May 2027.

**Nothing about it binds easyacco.** HMRC issues production credentials on a
rolling basis — there is no vendor cut-off on that date, and no penalty for
applying after it. The only cost of missing it is commercial: users could not
have filed their first quarterly update through easyacco, because production
credentials had not been granted.

The one clock that does apply: a production-credentials request expires after
**six months**, after which the progress is deleted and the process restarts.

**Therefore: do not compress the penetration testing to hit 7 August.** A second
decline costs far more than a week. Submit when item 1 below is genuinely
closed — realistically the week of 10 August.

---

## What is actually blocking

| #   | Item                    | HMRC status   | State                          | Blocking?                                   |
| --- | ----------------------- | ------------- | ------------------------------ | ------------------------------------------- |
| 1   | Penetration testing     | **MANDATORY** | 🟡 tool route started, not run | **YES — the only hard blocker**             |
| 2   | HMRC logos / branding   | MANDATORY     | ✅ done in code                | No — verify live assets                     |
| 3   | Personal data & consent | MANDATORY     | ✅ done in code                | No — one external action (ICO)              |
| 4   | WCAG 2.2 AA             | ADVISORY      | 🔶 partial                     | No — advisory, do not let it eat the window |

**Item 1 is the whole job.** HMRC's own wording allows a tool-based assessment
as an alternative to a paid supplier. Route A (tools, £0, days) is the plan; see
`docs/COMPLIANCE.md` §1 for why.

---

## Feature freeze — starts now

No new features before submission. A pen-test report describes a specific
version of the application; every endpoint added afterwards is a gap a reviewer
can point at.

**Decision needed on the Payslip Reader** (`/dashboard/payslip`,
`/api/payslip/parse`, added 4–5 August). It is a new authenticated endpoint that
has never been run against a real payslip photo — only hand-written OCR
fixtures. Two options, pick one:

- **Hold it** (recommended). Move it to a branch, submit without it, merge after.
  Keeps the tested surface identical to the reported surface.
- **Ship it.** Then it must be added to the scope inventory in
  `docs/PENTEST-SCOPE.md` and covered by the manual authorisation testing below.

Either way it is a decision to make deliberately, not by default.

---

## Day 1 — Thursday 6 August: automated assessment

Goal: evidence that a tool-based penetration assessment was performed, with
methodology and dates stated.

- [ ] Commit all outstanding work; confirm `main` is clean and the four gates pass
- [ ] **Dependency vulnerabilities** — `pnpm audit` (and `pnpm audit --prod` for the
      shipping set). Record output verbatim, fix anything high or critical.
- [ ] **Security headers** — check the deployed site against
      securityheaders.com or an equivalent. `next.config.ts` already sets a CSP;
      confirm what is actually served, not what is configured.
- [ ] **TLS configuration** — SSL Labs against easyacco.uk. Record the grade.
- [ ] **Static analysis** — `npm run lint` plus a scan for injection patterns and
      secrets in the repo history.
- [ ] Write each tool, version, date and result into a new
      `docs/PENTEST-REPORT.md`. HMRC needs the _methodology_ stated, per the NCSC
      guide referenced in the decline letter.

**What tools cannot find, and HMRC cares about:** authorisation logic. No scanner
knows user A must not read user B's ledger. That is Day 2.

## Day 2 — Friday 7 August: manual authorisation testing

This is the part that a scanner misses and a reviewer asks about. It needs **two
real accounts** — create them yourself; I cannot create accounts or enter
credentials.

- [ ] Create test accounts A and B, each with at least one invoice, expense and
      ledger entry
- [ ] Signed in as A, attempt to read every B-owned resource: direct row IDs in
      URLs, API calls with B's identifiers, backup/restore of B's export
- [ ] Repeat against the HMRC routes: `/api/hmrc/status`, `/api/hmrc/me`, and both
      MTD submit endpoints with the other account's identifiers
- [ ] Attempt each authenticated endpoint with **no** session and with an expired
      one — expect 401, never a 500 and never data
- [ ] Confirm the rate limits actually engage (`ai:categorise` per IP,
      `hmrc:mtd:*` 5 per 10 min, `payslip:parse` 10/min if shipped)
- [ ] Record every attempt and its result in `docs/PENTEST-REPORT.md`, including
      the ones that correctly failed — negative results are the evidence

**Known limitation to disclose honestly:** `src/lib/rate-limit.ts` is in-memory
and therefore per-container on Vercel. Say so in the report rather than letting a
reviewer discover it. Documented limitations read as competence; undocumented
ones read as ignorance.

## Day 3 — Monday 10 August: verify, package, submit

(8 and 9 August are the weekend. Use them or don't — the date is not binding,
see the note at the top of this file.)

- [ ] Fix anything Day 1–2 turned up; re-run the four gates
- [ ] **Item 2** — open the live site and confirm no HMRC logo or crown appears in
      marketing assets, favicon, or OG images
- [ ] **Item 3** — confirm the controller identity in `/privacy` matches reality
      and check the ICO registration question (external, do it early in the day)
- [ ] **Item 4** — advisory only. If time remains, run axe DevTools on
      `/`, `/dashboard`, `/validation` and fix contrast failures;
      `src/lib/__tests__/contrast.test.ts` already guards the palette. **If time
      does not remain, submit anyway** and report WCAG honestly as partial.
- [ ] Assemble the submission: `docs/COMPLIANCE.md` (what changed and why),
      `docs/PENTEST-REPORT.md` (methodology, dates, findings, fixes),
      `docs/PENTEST-SCOPE.md` (what was in scope)
- [ ] Submit

---

## Rules for these three days

1. **No refactoring.** `docs/REFACTOR-PLAN.md` exists so that work has somewhere
   to wait. Starting it now risks a regression in the window where you cannot
   afford one.
2. **No new endpoints.** See the freeze above.
3. **Every change ends with the four gates green** —
   `npx tsc --noEmit && npx vitest run && npm run lint && npm run build`.
4. **Do not claim more than is true.** The decline was, at root, about a
   description of processing that did not match the software. An honest "partial"
   is safer than an overstated "done" that a reviewer can disprove.
